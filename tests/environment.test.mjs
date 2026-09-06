import test from 'node:test'
import assert from 'node:assert/strict'
import { PerspectiveCamera, Vector3 } from 'three'
import { DAY_PHASE, HALF_DAY_MS, nextPhase, lightingAt, celestialAt, skyRotationAt, cloudTimeAt, terrainHeight, mountainHeight, jaggedRidgeHeight, snowCoverageAt, observerCamera, TARN, seededRandom, makeSkyTimeline, easeSkyProgress } from '../src/environment.mjs'
import { mountainEnvelopeAt } from '../src/alpine.mjs'

const close = (a, b, epsilon = 1e-7) => assert.ok(Math.abs(a - b) < epsilon, `${a} differs from ${b}`)

test('day, sunset, midnight and sunrise derive from the sun crossing the horizon', () => {
  assert.equal(lightingAt(DAY_PHASE).night, 0)
  assert.equal(lightingAt(DAY_PHASE).stars, 0)
  assert.equal(lightingAt(DAY_PHASE + Math.PI).night, 1)
  assert.equal(lightingAt(DAY_PHASE + Math.PI).stars, 1)
  assert.ok(lightingAt(Math.PI).twilight > .99)
  assert.ok(lightingAt(Math.PI * 2).twilight > .99)
  for (let i = 0; i < 100; i++) {
    const phase = i / 100 * Math.PI * 2
    close(lightingAt(phase).night, lightingAt(phase + Math.PI * 2).night)
    close(lightingAt(phase).twilight, lightingAt(phase + Math.PI * 2).twilight)
  }
})

test('repeated toggles always move the sky forward, including mid-transition toggles', () => {
  const night = nextPhase(DAY_PHASE, true)
  const morning = nextPhase(night, false)
  close(night, DAY_PHASE + Math.PI)
  close(morning, DAY_PHASE + Math.PI * 2)
  close(nextPhase(morning, false), morning)
  const interrupted = DAY_PHASE + .35
  assert.ok(nextPhase(interrupted, false) > interrupted)
  assert.ok(nextPhase(interrupted, true) > interrupted)
  assert.equal(lightingAt(nextPhase(interrupted, false)).night, 0)
  assert.equal(lightingAt(nextPhase(interrupted, true)).night, 1)
})

test('sun sets west as moon rises east; both actually change horizontal and vertical positions', () => {
  const day = celestialAt(DAY_PHASE)
  const sunset = celestialAt(Math.PI)
  const night = celestialAt(DAY_PHASE + Math.PI)
  assert.ok(day.sun[1] > 0 && day.moon[1] < 0)
  assert.ok(sunset.sun[0] > day.sun[0])
  close(sunset.sun[1], 0)
  assert.ok(sunset.moon[0] < 0)
  assert.ok(night.sun[1] < 0 && night.moon[1] > 0)
  for (const direction of [day.sun, day.moon, night.sun, night.moon]) close(Math.hypot(...direction), 1)
  assert.ok(skyRotationAt(DAY_PHASE + .1) < skyRotationAt(DAY_PHASE), 'stars turn clockwise with the setting sun')
  close(skyRotationAt(DAY_PHASE + Math.PI) - skyRotationAt(DAY_PHASE), -Math.PI)
})

test('easing keeps the initial lift, moves only forward, and reaches rest without a snap', () => {
  close(easeSkyProgress(0), 0)
  close(easeSkyProgress(1), 1)
  assert.ok(easeSkyProgress(.25) > .6 && easeSkyProgress(.25) < .7, 'preserve the confident initial lift')
  let previous = 0
  for (let i = 0; i <= 1000; i++) {
    const value = easeSkyProgress(i / 1000)
    assert.ok(value >= previous && value <= 1, 'no overshoot or backward travel')
    previous = value
  }
  assert.ok(1 - easeSkyProgress(.99) < 1e-10, 'velocity must approach zero at the end')
  assert.ok(easeSkyProgress(.001) < .00005, 'start from rest')
})

test('sunrise and sunset keep warm light visible while easing forward to a stop', () => {
  for (const from of [DAY_PHASE, DAY_PHASE + Math.PI, DAY_PHASE + .7]) {
    const to = nextPhase(from, from === DAY_PHASE)
    const sample = makeSkyTimeline(from, to)
    close(sample(0), from)
    close(sample(1), to)
    let previous = from, warmFrames = 0, intermediateFrames = 0
    for (let i = 1; i <= 100; i++) {
      const phase = sample(i / 100)
      assert.ok(phase >= previous && phase <= to, 'the sky must never overshoot or reverse direction')
      assert.ok(Math.abs(phase - previous) < (to - from) * .15, 'adjacent frames must remain continuous')
      const light = lightingAt(phase)
      if (light.twilight > .5) warmFrames++
      if (light.night > .05 && light.night < .95) intermediateFrames++
      previous = phase
    }
    assert.ok(warmFrames >= 12, `only ${warmFrames}% of the transition spent in warm light`)
    assert.ok(intermediateFrames >= 12, 'theme colors must visibly sweep through intermediate values')
  }
})

test('clouds and stars share the sunset curve and coast back to ambient speed', () => {
  for (const from of [DAY_PHASE, DAY_PHASE + Math.PI, DAY_PHASE + .7]) {
    const to = nextPhase(from, from === DAY_PHASE)
    const sample = makeSkyTimeline(from, to)
    const cloudStart = cloudTimeAt(from), cloudTravel = cloudTimeAt(to) - cloudStart
    const starStart = skyRotationAt(from), starTravel = skyRotationAt(to) - starStart
    for (let i = 0; i <= 300; i++) {
      const t = i / 300, phase = sample(t), elapsed = t * HALF_DAY_MS / 1000
      const sunProgress = (phase - from) / (to - from)
      close((cloudTimeAt(phase, elapsed) - elapsed - cloudStart) / cloudTravel, sunProgress)
      close((skyRotationAt(phase, elapsed) + elapsed * .0006 - starStart) / starTravel, sunProgress)
      // With ambient motion paused, the same phase still animates the full timelapse.
      close((cloudTimeAt(phase, 0) - cloudStart) / cloudTravel, sunProgress)
    }
    const seconds = HALF_DAY_MS / 1000, dt = .005
    const before = sample(1 - dt / seconds)
    const lastCloudSpeed = (cloudTimeAt(to, seconds) - cloudTimeAt(before, seconds - dt)) / dt
    const lastStarSpeed = (skyRotationAt(to, seconds) - skyRotationAt(before, seconds - dt)) / dt
    close(lastCloudSpeed, 1, .00001)
    close(lastStarSpeed, -.0006, .000001)
    close(cloudTimeAt(to, seconds + dt) - cloudTimeAt(to, seconds), dt)
  }
})

test('observer stands at eye height above a continuous ledge, with a slight downward view', () => {
  for (const aspect of [16 / 9, 4 / 3, 390 / 844, 320 / 700]) {
    const view = observerCamera(aspect)
    close(view.position[1] - terrainHeight(view.position[0], view.position[2]), 1.8)
    assert.ok(view.position[1] > view.target[1])
    assert.ok((view.position[1] - view.target[1]) / (view.position[2] - view.target[2]) < .06)
  }
})

test('sun and moon arcs fit in desktop and portrait views throughout the timelapse', () => {
  for (const aspect of [16 / 9, 4 / 3, 1000 / 920, 390 / 844, 320 / 700]) {
    const view = observerCamera(aspect)
    const camera = new PerspectiveCamera(view.fov, aspect, .25, 750)
    camera.position.fromArray(view.position)
    camera.lookAt(new Vector3().fromArray(view.target))
    camera.updateMatrixWorld()
    for (let phase = 0; phase < Math.PI * 2; phase += .05) {
      for (const body of ['sun', 'moon']) {
        const direction = celestialAt(phase, aspect)[body]
        if (direction[1] < 0) continue
        const point = new Vector3().fromArray(direction).multiplyScalar(400).add(camera.position).project(camera)
        assert.ok(Math.abs(point.x) < .96 && Math.abs(point.y) < .96, `Celestial body clipped at aspect ${aspect}: ${point.toArray()}`)
      }
    }
  }
})

test('foreground tarn is below water level, with dry granite banks and distant mountains', () => {
  for (let x = -10; x <= 10; x += 2) {
    for (let z = -7; z <= 32; z += 3) assert.ok(terrainHeight(x, z) < 0)
  }
  assert.ok(terrainHeight(TARN.width + 12, TARN.z) > 10)
  assert.ok(terrainHeight(-33, 31) > 25)
  assert.ok(terrainHeight(22, -197) > 45)
  assert.ok(terrainHeight(-101, -193) > 35)
})

test('distant mountains form wide, gentle shoulders instead of isolated pointed cones', () => {
  for (let x = -200; x <= 200; x += 4) {
    assert.ok(mountainHeight(x, -200) > 32, 'the range should stay connected across its saddles')
    for (let z = -300; z <= -145; z += 4) {
      // Judge the overall massif separately from the steeper walls of its shallow gullies.
      const height = mountainEnvelopeAt(x, z).height
      const slope = Math.hypot(mountainEnvelopeAt(x + 1, z).height - height, mountainEnvelopeAt(x, z + 1).height - height)
      assert.ok(slope < .9, `overly steep mountain at ${x}, ${z}: ${slope}`)
      assert.ok(Math.abs(mountainHeight(x, z) - height) < 6, 'drainage relief must stay small relative to the broad massif')
    }
  }
  assert.ok(mountainHeight(20, -155) > mountainHeight(20, -200) * .6, 'a broad shoulder must extend well beyond the crest')
})

test('both middle ridges have broken crests with separate summits and exposed sloping flanks', () => {
  for (const [side, x, firstPeak, saddle, secondPeak] of [[-1, -39, -43, -34, -25], [1, 45, -49, -38, -28]]) {
    const first = jaggedRidgeHeight(x, firstPeak, side)
    const second = jaggedRidgeHeight(x, secondPeak, side)
    const dip = jaggedRidgeHeight(x, saddle, side)
    assert.ok(first - dip >= 5 && second - dip >= 5, 'a visible saddle should break up each ridge silhouette')
    assert.ok(jaggedRidgeHeight(x + 10, firstPeak, side) < first * .8, 'rock faces should slope away from the crest')
    assert.ok(terrainHeight(x, firstPeak) - terrainHeight(x, saddle) > 3, 'the finished terrain must preserve the broken crest')
  }
})

test('thaw leaves open water and bare banks, with patchy snow on upper slopes and shelves', () => {
  for (let x = -23; x <= 23; x += 2) {
    for (let z = -23; z <= 49; z += 2) {
      if (Math.hypot(x / TARN.width, (z - TARN.z) / TARN.length) < 1.02) {
        assert.equal(snowCoverageAt(x, z, terrainHeight(x, z)), 0, 'no snow inside the melted tarn')
      }
    }
  }
  let lowSnow = 0, highSnow = 0, lowCount = 0, highCount = 0, bareSummits = 0
  for (let x = -180; x <= 180; x += 5) {
    for (let z = -310; z <= 45; z += 5) {
      const height = terrainHeight(x, z), snow = snowCoverageAt(x, z, height)
      assert.ok(snow >= 0 && snow <= 1)
      assert.ok(snowCoverageAt(x, z, height, .1) <= snow * .16, 'steep walls retain less snow than shelves')
      if (height < 10) { lowSnow += snow; lowCount++ }
      if (height > 40) { highSnow += snow; highCount++; if (snow < .1) bareSummits++ }
    }
  }
  assert.ok(lowSnow / lowCount < .04, 'low banks should look thawed')
  assert.ok(highSnow / highCount > .4, 'mountain snow must remain visible')
  assert.ok(bareSummits > highCount * .08, 'snow must leave exposed upper rock, rather than a uniform blanket')
})

test('geometry and scatter remain deterministic and finite across the complete landscape', () => {
  const a = seededRandom(721), b = seededRandom(721)
  for (let i = 0; i < 1000; i++) { const value = a(); assert.equal(value, b()); assert.ok(value >= 0 && value < 1) }
  for (let x = -255; x <= 255; x += 5) {
    for (let z = -340; z <= 90; z += 5) {
      const h = terrainHeight(x, z)
      assert.ok(Number.isFinite(h) && h > -2 && h < 100)
    }
  }
})
