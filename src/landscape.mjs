import { BufferGeometry, Float32BufferAttribute } from 'three'
import { mix, smooth, terrainHeight, TARN, lakeRadiusAt, shorelineDistanceAt } from './environment.mjs'
import { CLIFF_MASSES } from './cliffs.mjs'

function axisSections(sections) {
  const values = [sections[0][0]]
  for (const [from, to, spacing] of sections) {
    const count = Math.ceil((to - from) / spacing)
    for (let i = 1; i <= count; i++) values.push(from + (to - from) * i / count)
  }
  return values
}

/** One watertight surface: fine near the observer, progressively coarser in the distance. */
export function landscapeGeometry() {
  const xs = axisSections([[-255, -65, 3], [-65, 65, .42], [65, 255, 3]])
  const zs = axisSections([[-340, -105, 2.5], [-105, -15, .85], [-15, 70, .4], [70, 90, 1.5]])
  const positions = [], indices = []
  for (const z of zs) for (const x of xs) {
    let height = terrainHeight(x, z)
    const shoreDistance = shorelineDistanceAt(x, z)
    const gravelFoot = 1.25 + .12 * Math.sin(x * .17 + z * .12) + .08 * Math.sin(z * .29 - x * .1)
    const dryBank = smooth((shoreDistance - 3) / 4)
    // Bury the old hillside beneath the closed masses so it cannot poke through their faces.
    for (const mass of CLIFF_MASSES) {
      const footprint = Math.hypot((x - mass.x) / mass.width, (z - mass.z) / mass.depth)
      const buried = smooth((1.5 - footprint) / .35)
      // Granite bases meet a gently rolling talus apron, rather than a level shelf.
      // Leave the beach profile intact so burying a cliff cannot flatten its bank.
      height = mix(height, Math.min(height, gravelFoot), buried * dryBank)
    }
    positions.push(x, height, z)
  }
  for (let row = 0; row < zs.length - 1; row++) {
    for (let column = 0; column < xs.length - 1; column++) {
      const a = row * xs.length + column, b = a + xs.length
      indices.push(a, b, a + 1, b, b + 1, a + 1)
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.userData.gridColumns = xs.length
  geometry.userData.gridRows = zs.length
  geometry.computeVertexNormals()
  return geometry
}

/** A tessellated water sheet continues beneath the dry bank to avoid exposed seams. */
export function lakeGeometry(sampleTerrain) {
  const segments = 192, rings = 40, extent = 1.24
  const positions = [0, 0, 0], depths = [Math.max(0, -sampleTerrain(TARN.x, TARN.z).height)], indices = []
  for (let ring = 1; ring <= rings; ring++) {
    const radial = ring / rings * extent
    for (let segment = 0; segment < segments; segment++) {
      const angle = segment / segments * Math.PI * 2
      const radius = lakeRadiusAt(angle) * radial
      const x = Math.cos(angle) * TARN.width * radius, z = Math.sin(angle) * TARN.length * radius
      // Reflector uses a local XY plane rotated -90 degrees about X by the scene.
      positions.push(x, -z, 0)
      depths.push(Math.max(0, -sampleTerrain(TARN.x + x, TARN.z + z).height))
      if (ring === 1) indices.push(0, 1 + (segment + 1) % segments, 1 + segment)
      else {
        const a = 1 + (ring - 2) * segments + segment, b = 1 + (ring - 2) * segments + (segment + 1) % segments
        const c = a + segments, d = b + segments
        indices.push(a, b, c, b, d, c)
      }
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('lakeDepth', new Float32BufferAttribute(depths, 1))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}
