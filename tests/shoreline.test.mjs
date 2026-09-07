import test from 'node:test'
import assert from 'node:assert/strict'
import { TARN, lakeRadiusAt, terrainHeight } from '../src/environment.mjs'
import { landscapeGeometry, lakeGeometry } from '../src/landscape.mjs'
import { createTerrainSampler } from '../src/forest.mjs'

test('every shoreline approaches the water gradually, with connected submerged shallows', () => {
  const geometry = landscapeGeometry(), sample = createTerrainSampler(geometry)
  for (let angle = 0; angle < Math.PI * 2; angle += .05) {
    const radius = lakeRadiusAt(angle), c = Math.cos(angle), s = Math.sin(angle)
    const x = c * TARN.width * radius, z = TARN.z + s * TARN.length * radius
    const shore = sample(x, z)
    assert.ok(Math.abs(shore.height) < .012, `waterline must meet the actual mesh at ${angle}`)
    assert.ok(shore.slope < .25, `waterline must stay below a 1:4 grade at ${angle}`)
    for (const offset of [-4, -2, 2, 4]) {
      const radialMetres = Math.hypot(c * TARN.width, s * TARN.length)
      const r = radius + offset / radialMetres
      const ground = sample(c * TARN.width * r, TARN.z + s * TARN.length * r)
      assert.ok(offset < 0 ? ground.height < 0 : ground.height > 0, 'no raised rim or offshore dry ring')
      assert.ok(Math.abs(ground.height) < .9, 'a broad apron should continue on both sides of the water')
    }
  }
  const asymmetry = Array.from({ length: 32 }, (_, i) => Math.abs(lakeRadiusAt(i / 32 * Math.PI) - lakeRadiusAt(i / 32 * Math.PI + Math.PI)))
  assert.ok(Math.max(...asymmetry) > .05, 'the opposite coves should not mirror each other')
  assert.ok(terrainHeight(0, 13) < -1.5, 'preserve the deep center of the tarn')
  geometry.dispose()
})

test('water reaches under dry ground, has upward faces and samples the visible lakebed for shading', () => {
  const terrain = landscapeGeometry(), sample = createTerrainSampler(terrain), water = lakeGeometry(sample)
  const p = water.attributes.position, depths = water.attributes.lakeDepth, normal = water.attributes.normal
  const segments = 192
  for (let i = 0; i < p.count; i++) {
    const h = sample(p.getX(i) + TARN.x, -p.getY(i) + TARN.z).height
    assert.ok(Math.abs(depths.getX(i) - Math.max(0, -h)) < 1e-5, 'shallow shading must follow the rendered triangles')
    assert.ok(normal.getZ(i) > .999, 'the rotated water surface must face upward')
    if (i >= p.count - segments) assert.ok(h > .7, 'mesh edge must be buried under the bank, avoiding a visible water cutoff')
  }
  assert.ok(water.index.count / 3 < 16000, 'keep lake tessellation within its reflection budget')
  assert.ok(depths.getX(0) > 1.5)
  terrain.dispose(); water.dispose()
})
