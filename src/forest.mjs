import { ConeGeometry, Float32BufferAttribute } from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { clamp, mix, noise, seededRandom, smooth, snowCoverageAt } from './environment.mjs'

/** An 18-triangle pine, including its trunk, for the distant canopy. */
export function distantPineGeometry() {
  const parts = []
  for (const [radius, height, y, sides] of [[.42, .9, .85, 5], [.31, .9, 1.2, 5], [.20, .75, 1.55, 4], [.045, .8, .32, 4]]) {
    const geometry = new ConeGeometry(radius, height, sides, 1, true)
    geometry.translate(0, y, 0)
    const colors = new Float32Array(geometry.attributes.position.count * 3)
    colors.fill(radius < .05 ? .38 : 1)
    geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))
    parts.push(geometry)
  }
  const geometry = mergeGeometries(parts)
  parts.forEach(part => part.dispose())
  return geometry
}

/** Sample the actual rendered triangles, rather than the noisier underlying height function. */
export function createTerrainSampler(geometry) {
  const positions = geometry.attributes.position
  const columns = geometry.userData.gridColumns ?? geometry.parameters.widthSegments + 1
  const rows = geometry.userData.gridRows ?? geometry.parameters.heightSegments + 1
  const xs = Array.from({ length: columns }, (_, i) => positions.getX(i))
  const zs = Array.from({ length: rows }, (_, i) => positions.getZ(i * columns))
  const cellAt = (axis, value) => {
    let low = 0, high = axis.length - 1
    while (high - low > 1) {
      const middle = (low + high) >> 1
      if (axis[middle] <= value) low = middle
      else high = middle
    }
    return low
  }
  return (x, z) => {
    const ix = cellAt(xs, x), iz = cellAt(zs, z)
    const stepX = xs[ix + 1] - xs[ix], stepZ = zs[iz + 1] - zs[iz]
    const u = clamp((x - xs[ix]) / stepX), v = clamp((z - zs[iz]) / stepZ), a = iz * columns + ix
    const h00 = positions.getY(a), h10 = positions.getY(a + 1)
    const h01 = positions.getY(a + columns), h11 = positions.getY(a + columns + 1)
    const lower = u + v <= 1
    const dx = lower ? h10 - h00 : h11 - h01, dz = lower ? h01 - h00 : h11 - h10
    const height = lower ? h00 + dx * u + dz * v : h11 - dx * (1 - u) - dz * (1 - v)
    const slope = Math.hypot(dx / stepX, dz / stepZ)
    return { height, slope, normalUp: 1 / Math.hypot(1, slope) }
  }
}

/** A shared habitat mask shapes both the groves and the shaded ground beneath them. */
export function forestDensityAt(x, z, height, slope) {
  if (z < -190 || z > -32 || height < 2 || height > 34 || slope > .86) return 0
  const grove = noise(x * .036, z * .040)
  const clearing = smooth((grove - .22) / .25)
  const treeline = 1 - smooth((height - 19) / 15)
  const rockFace = 1 - smooth((slope - .38) / .48)
  const snow = snowCoverageAt(x, z, height, 1 / Math.hypot(1, slope))
  const edge = -35 - noise(x * .05, 34) * 18
  const valleyEdge = smooth((edge - z) / 18) * smooth((z + 190) / 18)
  return clearing * treeline * rockFace * valleyEdge * (1 - snow * .82)
}

/** Closely spaced groves follow sheltered valley contours, opening into alpine tundra. */
export function scatterDistantForest(sampleTerrain) {
  const random = seededRandom(8401), trees = [], spacing = 1.12
  for (let z = -190; z < -32; z += spacing) {
    for (let x = -126; x < 126; x += spacing) {
      const px = x + (random() - .5) * spacing * .78, pz = z + (random() - .5) * spacing * .78
      const { height, slope } = sampleTerrain(px, pz)
      const treeline = 1 - smooth((height - 19) / 15)
      const density = forestDensityAt(px, pz, height, slope)
      if (density <= 0 || random() > density * .96) continue
      const distance = smooth((-pz - 40) / 130)
      trees.push({
        x: px, y: height - .06, z: pz,
        scale: (.70 + random() * .43) * mix(1, .78, distance) * mix(.78, 1, treeline),
        width: .83 + random() * .28,
        rotation: random() * Math.PI * 2,
        tint: random(), distance,
      })
    }
  }
  return trees
}
