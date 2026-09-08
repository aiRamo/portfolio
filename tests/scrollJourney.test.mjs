import test from 'node:test'
import assert from 'node:assert/strict'
import { Frustum, Matrix4, PerspectiveCamera, Vector3 } from 'three'
import { journeyAt, skyCameraAt, contentPullAt } from '../src/scrollJourney.mjs'
import { observerCamera, celestialAt, terrainHeight, mountainHeight } from '../src/environment.mjs'
import { landscapeGeometry } from '../src/landscape.mjs'
import { cliffMassGeometry, CLIFF_MASSES } from '../src/cliffs.mjs'

function cameraAt(aspect, progress) {
  const view = skyCameraAt(aspect, progress)
  const camera = new PerspectiveCamera(view.fov, aspect, .25, 750)
  camera.position.fromArray(view.position)
  camera.lookAt(new Vector3().fromArray(view.target))
  camera.updateMatrixWorld()
  return camera
}

test('portrait framing enlarges the camp while retaining the fire and central mountain ridge', () => {
  for (const aspect of [320 / 700, 390 / 844, 430 / 932, 375 / 667]) {
    const camera = cameraAt(aspect, 0)
    const oldLens = camera.clone()
    oldLens.fov = 62
    oldLens.updateProjectionMatrix()
    const base = new Vector3(-1, terrainHeight(-1, -36), -36)
    const roof = base.clone().add(new Vector3(0, 6, 0))
    const projectedHeight = lens => roof.clone().project(lens).y - base.clone().project(lens).y
    assert.ok(projectedHeight(camera) > projectedHeight(oldLens) * 1.45, 'camp should be visibly larger')
    for (const point of [base, roof, new Vector3(1.2, terrainHeight(1.2, -28.7) + 1, -28.7),
      new Vector3(0, mountainHeight(0, -200), -200)]) {
      point.project(camera)
      assert.ok(Math.abs(point.x) < .85 && point.y > .05 && point.y < .9, 'camp and ridge fit in the upper scene')
    }
  }
  for (const aspect of [1, 4 / 3, 16 / 9]) {
    assert.equal(observerCamera(aspect).fov, 49)
    assert.deepEqual(observerCamera(aspect).target, [5, 8, -100])
  }
  for (let aspect = .4; aspect < 1.1; aspect += .001) {
    const a = observerCamera(aspect), b = observerCamera(aspect + .001)
    assert.ok(Math.abs(a.fov - b.fov) < .03 && Math.abs(a.target[1] - b.target[1]) < .1,
      'resizing smoothly blends the framing')
  }
})

test('camera ascent starts at the overlook, is continuous, and retraces on upward scroll', () => {
  const home = observerCamera(1.6), camera = cameraAt(1.6, 0)
  assert.deepEqual(camera.position.toArray(), home.position)
  const expected = new Vector3().fromArray(home.target).sub(camera.position).normalize()
  assert.ok(camera.getWorldDirection(new Vector3()).distanceTo(expected) < 1e-9)
  let lastPitch = -Infinity
  for (let i = 0; i <= 100; i++) {
    const flight = journeyAt(i * 12, 1200)
    const view = skyCameraAt(1.6, flight.progress)
    assert.ok(view.pitch >= lastPitch)
    if (i > 0) assert.ok(view.pitch - lastPitch < .025, 'no jumps along the ascent')
    lastPitch = view.pitch
    assert.deepEqual(skyCameraAt(1.6, journeyAt(i * 12, 1200).progress), view)
  }
  assert.equal(journeyAt(-100, 1200).progress, 0)
  assert.equal(journeyAt(50000, 1200).progress, 1)
  assert.equal(journeyAt(1200, 1200).heroVisibility, 0)
})

test('the entire landscape is outside the sky view before terrain rendering is disabled', () => {
  const geometries = [landscapeGeometry(), ...CLIFF_MASSES.map(cliffMassGeometry)]
  const point = new Vector3()
  for (const aspect of [3, 1920 / 900, 1180 / 900, 390 / 844, 320 / 700]) {
    const camera = cameraAt(aspect, .994)
    const frustum = new Frustum().setFromProjectionMatrix(new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse))
    for (const geometry of geometries) for (let i = 0; i < geometry.attributes.position.count; i++) {
      point.fromBufferAttribute(geometry.attributes.position, i)
      assert.equal(frustum.containsPoint(point), false, `ground still visible at aspect ${aspect}`)
    }
    // Check every time of day: toggling themes while reading must not bring a disc back into view.
    for (let phase = 0; phase < Math.PI * 2; phase += .025) {
      for (const direction of Object.values(celestialAt(phase, aspect))) {
        if (direction[1] < 0) continue
        point.fromArray(direction).multiplyScalar(400).add(camera.position).project(camera)
        assert.ok(point.y < -1.05, 'sun and moon must stay below the content view')
      }
    }
  }
  geometries.forEach(geometry => geometry.dispose())
})

test('content is pulled upward on entry, stays readable, and supports reduced motion', () => {
  const before = contentPullAt(1000, 900), entering = contentPullAt(600, 900), reading = contentPullAt(80, 900)
  assert.ok(before.y > entering.y && entering.y > reading.y)
  assert.ok(before.opacity < entering.opacity && entering.opacity <= reading.opacity)
  assert.deepEqual(reading, { y: 0, opacity: 1 })
  assert.deepEqual(contentPullAt(-1000, 900), reading, 'long articles remain readable as their tops leave the viewport')
  assert.deepEqual(contentPullAt(900, 900, true), reading)
})
