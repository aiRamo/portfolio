import { BufferGeometry, Float32BufferAttribute, IcosahedronGeometry, Vector3 } from 'three'
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'
import { noise, seededRandom, smooth } from './environment.mjs'

export const CLIFF_MASSES = [
  { x: -40, z: 27, width: 23, depth: 28, height: 37, seed: 17, near: true },
  { x: 47, z: 17, width: 24, depth: 29, height: 37, seed: 42, near: true },
  { x: -40, z: -39, width: 28, depth: 34, height: 28, seed: 71, near: false },
  { x: 48, z: -46, width: 33, depth: 36, height: 34, seed: 96, near: false },
]

/** A closed granite mass with eroded buttresses and joints recessed into its volume. */
export function cliffMassGeometry(mass) {
  const around = mass.near ? 192 : 128, levels = mass.near ? 96 : 64
  const random = seededRandom(mass.seed)
  const joints = Array.from({ length: 21 }, (_, i) => ({
    angle: i / 21 * Math.PI * 2 + random() * .15,
    width: i % 5 === 0 ? .033 : .008 + random() * .012,
    depth: i % 5 === 0 ? .095 : .014 + random() * .028,
    lean: (random() - .5) * .13,
    bottom: random() * .24, top: .68 + random() * .48,
  }))
  const positions = [], indices = [], occlusion = []
  for (let row = 0; row < levels; row++) {
    const v = row / levels
    const shoulder = (1 - .32 * v - .04 * v * v) * (1 - smooth((v - .88) / .12))
    for (let column = 0; column < around; column++) {
      const angle = column / around * Math.PI * 2
      const c = Math.cos(angle), s = Math.sin(angle)
      // Intersect broad geological planes, with a small bevel where those planes meet.
      let polygon = 10
      for (const [direction, offset] of [[0,.98],[.70,1.12],[1.57,1],[2.38,1.06],[3.14,1.02],[3.98,1.10],[4.71,.97],[5.54,1.04]]) {
        const facing = Math.cos(angle - direction - mass.seed * .017)
        if (facing <= .01) continue
        const plane = offset / facing
        const bevel = Math.max(.026 - Math.abs(polygon - plane), 0)
        polygon = Math.min(polygon, plane) - bevel * bevel / (.026 * 4)
      }
      const qx = c * polygon, qz = s * polygon
      let cleft = 0
      for (const joint of joints) {
        const delta = Math.atan2(Math.sin(angle - joint.angle - v * joint.lean), Math.cos(angle - joint.angle - v * joint.lean))
        const extent = smooth((v - joint.bottom) / .10) * (1 - smooth((v - joint.top) / .10))
        cleft += joint.depth * Math.exp(-Math.pow(delta / joint.width, 4)) * extent
      }
      const buttress = .016 * Math.sin(angle * 5 + mass.seed + v * .65)
        + .010 * Math.sin(angle * 8 - mass.seed * .4 + v * .9)
      const weathering = (noise(qx * 4 + mass.seed, qz * 4 + v * 2) - .5) * .027
        + (noise(angle * 9 + mass.seed, v * 12) - .5) * .009
      const ledgeHeight = v + .14 * Math.sin(angle * 1.6 + mass.seed)
      const ledges = -.016 * Math.exp(-Math.pow((ledgeHeight - .34) / .008, 2)) * smooth((Math.sin(angle + mass.seed) + .4) / 1.2)
        - .012 * Math.exp(-Math.pow((ledgeHeight - .66) / .01, 2)) * smooth((Math.cos(angle * 2 - mass.seed) + .3) / 1.1)
      const r = shoulder * (1 + buttress - cleft * smooth(v / .12) + weathering + ledges)
      const lean = (Math.sin(v * 2 + mass.seed) - Math.sin(mass.seed)) * 1.7
      const px = mass.x + qx * mass.width * r + lean, pz = mass.z + qz * mass.depth * r
      const crest = Math.sin(angle * 3 + mass.seed) * .8 * Math.sin(v * Math.PI)
        + (noise(px * .13 + mass.seed, pz * .13) - .5) * 2.5 * smooth((v - .6) / .4)
        + (qx * .7 + qz * .3) * r * mass.height * .18 * smooth((v - .4) / .6)
      positions.push(px, -3 + mass.height * v + crest, pz)
      occlusion.push(1 - Math.min(.32, cleft * 3.5) - (1 - smooth(v / .13)) * .13)
    }
  }
  for (let row = 0; row < levels - 1; row++) for (let column = 0; column < around; column++) {
    const a = row * around + column, b = row * around + (column + 1) % around
    indices.push(a, a + around, b, b, a + around, b + around)
  }
  const bottom = positions.length / 3
  positions.push(mass.x, -3, mass.z); occlusion.push(.8)
  const top = positions.length / 3
  const topX = mass.x + (Math.sin(2 + mass.seed) - Math.sin(mass.seed)) * 1.7
  positions.push(topX, mass.height - 3 + (noise(topX * .13 + mass.seed, mass.z * .13) - .5) * 2.5, mass.z); occlusion.push(1)
  for (let column = 0; column < around; column++) {
    const next = (column + 1) % around, last = (levels - 1) * around
    indices.push(bottom, column, next, top, last + next, last + column)
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('rockOcclusion', new Float32BufferAttribute(occlusion, 1))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}

/** Small weathered rockfall fragments; smooth erosion preserves their broken overall shape. */
export function talusGeometry(seed = 15, detail = 2) {
  const geometry = new IcosahedronGeometry(1, detail)
  const positions = geometry.attributes.position, p = new Vector3()
  for (let i = 0; i < positions.count; i++) {
    p.fromBufferAttribute(positions, i)
    p.set(Math.sign(p.x) * Math.pow(Math.abs(p.x), .72), Math.sign(p.y) * Math.pow(Math.abs(p.y), .76), Math.sign(p.z) * Math.pow(Math.abs(p.z), .70))
    const n = (noise(p.x * 2.1 + seed, p.z * 2.4 + p.y * 1.2) - .5) * .22
    p.multiplyScalar(1 + n)
    p.y = Math.min(p.y, .68 + p.x * .19)
    p.x = Math.max(p.x, -.77 + p.z * .16)
    positions.setXYZ(i, p.x, p.y, p.z)
  }
  geometry.deleteAttribute('normal')
  geometry.deleteAttribute('uv')
  const welded = mergeVertices(geometry)
  geometry.dispose()
  welded.computeVertexNormals()
  welded.setAttribute('rockOcclusion', new Float32BufferAttribute(new Float32Array(welded.attributes.position.count).fill(1), 1))
  return welded
}
