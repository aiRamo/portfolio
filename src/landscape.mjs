import { BufferGeometry, Float32BufferAttribute } from 'three'
import { mix, smooth, terrainHeight } from './environment.mjs'
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
    // Bury the old hillside beneath the closed masses so it cannot poke through their faces.
    for (const mass of CLIFF_MASSES) {
      const footprint = Math.hypot((x - mass.x) / mass.width, (z - mass.z) / mass.depth)
      const buried = smooth((1.5 - footprint) / .35)
      height = mix(height, Math.min(height, 1.4), buried)
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
