import test from 'node:test'
import assert from 'node:assert/strict'
import { alpineHeightAt, alpineSnowAt, mountainEnvelopeAt } from '../src/alpine.mjs'

test('upper snow favors real terrain hollows while leaving convex rock ribs exposed', () => {
  let hollowSnow = 0, ridgeSnow = 0, hollows = 0, ridges = 0
  for (let x = -170; x <= 170; x += 1.5) for (let z = -230; z <= -145; z += 2) {
    const height = alpineHeightAt(x, z)
    if (height < 38 || height > 52) continue
    // Cross-slope concavity measured from geometry, independently of the snow mask.
    const curvature = (alpineHeightAt(x - 2, z) + alpineHeightAt(x + 2, z)) / 2 - height
    const snow = alpineSnowAt(x, z, height).coverage
    if (curvature > .28) { hollowSnow += snow; hollows++ }
    if (curvature < -.28) { ridgeSnow += snow; ridges++ }
  }
  assert.ok(hollows > 100 && ridges > 100)
  assert.ok(hollowSnow / hollows > ridgeSnow / ridges + .25, 'snow should collect inside the carved gullies')
  assert.ok(ridgeSnow / ridges < .65, 'upper rock ribs must remain readable')
})

test('snowfields narrow into uneven lower remnants and never blanket the lower slopes', () => {
  const bands = [{ sum: 0, count: 0 }, { sum: 0, count: 0 }, { sum: 0, count: 0 }]
  const endings = []
  for (let x = -160; x <= 160; x += 2) {
    let lowestSnow = Infinity
    for (let z = -220; z <= -110; z += 1.5) {
      const height = alpineHeightAt(x, z), crest = mountainEnvelopeAt(x, z).crest
      const snow = alpineSnowAt(x, z, height).coverage
      const elevation = height / crest
      const band = elevation < .4 ? 0 : elevation < .7 ? 1 : 2
      bands[band].sum += snow; bands[band].count++
      if (snow > .6) lowestSnow = Math.min(lowestSnow, height)
    }
    if (Number.isFinite(lowestSnow)) endings.push(lowestSnow)
  }
  const means = bands.map(band => band.sum / band.count)
  assert.ok(means[0] < .02)
  assert.ok(means[1] > .015 && means[1] < .3, 'lower snow should be sparse ribbons and remnants')
  assert.ok(means[2] > means[1] * 2, 'upper bowls should hold connected larger snowfields')
  assert.ok(Math.max(...endings) - Math.min(...endings) > 12, 'the snow edge cannot form a level elevation band')
})
