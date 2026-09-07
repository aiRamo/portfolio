import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'
import { Matrix4, PerspectiveCamera, Scene, Vector3 } from 'three'
import { skyCameraAt } from '../src/scrollJourney.mjs'

// Exercise the actual renderer without WebGL. Resolve its imports before loading
// the TypeScript as ESM; the development-only URL preview is disabled in Node.
const sourceUrl = new URL('../src/skyBirds.ts', import.meta.url)
const source = (await readFile(sourceUrl, 'utf8'))
  .replace('import.meta.env.DEV', 'false')
  .replace(/from '([^']+)'/g, (_, specifier) => `from '${specifier.startsWith('.')
    ? new URL(specifier, sourceUrl).href : import.meta.resolve(specifier)}'`)
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
})
const { createSkyBirds } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)

function cameraAt(progress, aspect = 16 / 9) {
  const view = skyCameraAt(aspect, progress)
  const camera = new PerspectiveCamera(view.fov, aspect, .25, 750)
  camera.position.fromArray(view.position)
  camera.lookAt(new Vector3().fromArray(view.target))
  camera.updateMatrixWorld()
  return camera
}

function snapshot(group) {
  group.updateMatrixWorld(true)
  return {
    frame: group.matrixWorld.toArray(),
    instances: group.children.map(mesh => Array.from(mesh.instanceMatrix.array)),
  }
}

function centerOfFirstBird(group) {
  const matrix = new Matrix4()
  group.children[0].getMatrixAt(0, matrix)
  return new Vector3().setFromMatrixPosition(matrix).applyMatrix4(group.matrixWorld)
}

test('scrolling, pointer movement and resizing change the view, never the birds’ world transforms', () => {
  const scene = new Scene()
  const host = { dataset: {}, clientWidth: 1280, clientHeight: 720 }
  const birds = createSkyBirds(scene, host)
  const group = scene.children[0]
  const homeCamera = cameraAt(0)
  birds.update(0, true, homeCamera)
  const home = snapshot(group)
  const homeY = centerOfFirstBird(group).project(homeCamera).y
  assert.ok(homeY > .4 && homeY < .7, 'flock opens above the mountains')
  assert.ok(Number(host.dataset.birdCount) >= 7)

  for (const aspect of [16 / 9, 390 / 844, 3]) {
    host.clientWidth = 844 * aspect
    host.clientHeight = 844
    for (const progress of [.15, .35, .65, 1, 0]) {
      const camera = cameraAt(progress, aspect)
      camera.position.x += .5
      camera.position.y -= .14
      camera.updateMatrixWorld()
      birds.update(300, true, camera)
      assert.deepEqual(snapshot(group), home, `world transforms changed at scroll ${progress}, aspect ${aspect}`)
      assert.equal(host.dataset.birdTime, '0.000', 'scrolling a paused scene must not advance flight')
      if (progress >= .65) assert.equal(host.dataset.birdCount, '0', 'birds naturally leave the upward view')
    }
  }
  const tiltedCamera = cameraAt(.25)
  assert.ok(centerOfFirstBird(group).project(tiltedCamera).y < homeY - .4,
    'a camera tilt must move the flock down the screen')
  birds.update(0, true, homeCamera)
  assert.deepEqual(snapshot(group), home, 'reverse scrolling restores the same view of the flock')
})

test('flight and wings keep animating along the same world corridor after a camera tilt', () => {
  const scene = new Scene()
  const birds = createSkyBirds(scene, { dataset: {}, clientWidth: 1280, clientHeight: 720 })
  const group = scene.children[0]
  birds.update(0, false, cameraAt(0))
  const before = snapshot(group), first = centerOfFirstBird(group)
  birds.update(.5, false, cameraAt(.3))
  const after = snapshot(group), next = centerOfFirstBird(group)
  assert.deepEqual(after.frame, before.frame)
  assert.ok(next.x < first.x, 'birds continue flying left through the valley')
  assert.notDeepEqual(after.instances[0], before.instances[0], 'bodies advance')
  assert.notDeepEqual(after.instances[1], before.instances[1], 'wings animate')
})
