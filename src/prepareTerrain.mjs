import { BufferAttribute, Color } from 'three'
import { landscapeGeometry } from './landscape.mjs'
import { createTerrainSampler, forestDensityAt, scatterDistantForest } from './forest.mjs'
import { CLIFF_MASSES } from './cliffs.mjs'
import { noise, smooth, rockCoverageAt, snowCoverageAt, distanceHazeAt } from './environment.mjs'

/** CPU-only preparation shared with tests; the browser invokes it in a worker. */
export function prepareTerrain() {
  const geometry = landscapeGeometry(), positions = geometry.attributes.position
  const colors = new Float32Array(positions.count * 3), rockCoverage = new Float32Array(positions.count), snowCoverage = new Float32Array(positions.count)
  const grass = new Color('#77735b'), heather = new Color('#786466'), rock = new Color('#92999b')
  const distantBlue = new Color('#68869b'), sand = new Color('#697970'), forestFloor = new Color('#45534a'), color = new Color()
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), z = positions.getZ(i), h = positions.getY(i), patch = noise(x * .18, z * .18)
    const exposedCliff = rockCoverageAt(x, z, h)
    rockCoverage[i] = exposedCliff
    color.copy(grass).lerp(heather, smooth((patch - .38) / .40) * .6)
    color.lerp(rock, Math.max(exposedCliff, smooth((h - 25 + patch * 5) / 20)))
    if (h < 1.2) color.copy(sand)
    color.multiplyScalar(.88 + noise(x * .37, z * .37) * .18).toArray(colors, i * 3)
  }
  const sample = createTerrainSampler(geometry)
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), z = positions.getZ(i), h = positions.getY(i)
    snowCoverage[i] = snowCoverageAt(x, z, h, geometry.attributes.normal.getY(i))
    const grove = forestDensityAt(x, z, h, sample(x, z).slope)
    color.fromArray(colors, i * 3).lerp(forestFloor, grove * .78)
    color.lerp(distantBlue, distanceHazeAt(x, z) * .75).toArray(colors, i * 3)
    rockCoverage[i] *= 1 - grove * .72
  }
  geometry.setAttribute('color', new BufferAttribute(colors, 3))
  geometry.setAttribute('rockCoverage', new BufferAttribute(rockCoverage, 1))
  geometry.setAttribute('snowCoverage', new BufferAttribute(snowCoverage, 1))
  const forest = scatterDistantForest((x, z) => {
    const surface = sample(x, z)
    return CLIFF_MASSES.some(mass => Math.hypot((x - mass.x) / mass.width, (z - mass.z) / mass.depth) < 1.28)
      ? { ...surface, slope: 2, normalUp: .4 } : surface
  })
  const attributes = Object.fromEntries(Object.entries(geometry.attributes).map(([name, attribute]) => [name, { array: attribute.array, itemSize: attribute.itemSize }]))
  const result = { attributes, index: geometry.index.array, grid: geometry.userData, forest }
  geometry.dispose()
  return result
}
