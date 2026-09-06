import test from 'node:test'
import assert from 'node:assert/strict'
import { Mesh, MeshBasicMaterial, PlaneGeometry, Raycaster, Vector3 } from 'three'
import { terrainHeight } from '../src/environment.mjs'
import { createTerrainSampler, distantPineGeometry, forestDensityAt, scatterDistantForest } from '../src/forest.mjs'

const terrain = new PlaneGeometry(510, 430, 256, 256)
terrain.rotateX(-Math.PI / 2)
terrain.translate(0, 0, -125)
const positions = terrain.attributes.position
for (let i = 0; i < positions.count; i++) positions.setY(i, terrainHeight(positions.getX(i), positions.getZ(i)))
const sample = createTerrainSampler(terrain)
const trees = scatterDistantForest(sample)

test('the distant pine has a complete small silhouette within an 18-triangle budget', () => {
  const geometry = distantPineGeometry()
  assert.ok(geometry.index.count / 3 <= 18)
  geometry.computeBoundingBox()
  assert.ok(geometry.boundingBox.min.y < 0, 'the trunk must extend into the ground')
  assert.ok(geometry.boundingBox.max.y < 2 && geometry.boundingBox.max.y > 1.8)
  assert.ok(geometry.boundingBox.max.x - geometry.boundingBox.min.x > .7, 'crowns should read as a canopy, not bare poles')
  assert.equal(geometry.attributes.color.count, geometry.attributes.position.count)
  geometry.dispose()
})

test('tree roots meet rendered triangles even where procedural heights differ from the mesh', () => {
  const material = new MeshBasicMaterial(), ground = new Mesh(terrain, material)
  ground.updateMatrixWorld()
  const ray = new Raycaster(), down = new Vector3(0, -1, 0)
  let proceduralMismatch = 0
  for (let i = 0; i < trees.length; i += Math.floor(trees.length / 30)) {
    const tree = trees[i]
    ray.set(new Vector3(tree.x, 100, tree.z), down)
    const hit = ray.intersectObject(ground)[0]
    assert.ok(hit, 'every tree must stand above actual ground')
    assert.ok(Math.abs(tree.y + .06 - hit.point.y) < 1e-5, 'root must be slightly embedded, never hovering')
    proceduralMismatch = Math.max(proceduralMismatch, Math.abs(terrainHeight(tree.x, tree.z) - hit.point.y))
  }
  assert.ok(proceduralMismatch > .05, 'cover the original floating-root failure on uneven terrain')
  material.dispose()
})

test('dense, repeatable distant groves keep small trees off wet ground and steep rock', () => {
  assert.ok(trees.length > 7500 && trees.length < 13000, `unexpected forest density: ${trees.length}`)
  assert.deepEqual(trees, scatterDistantForest(sample))
  let nearScale = 0, farScale = 0, nearCount = 0, farCount = 0
  for (const tree of trees) {
    const surface = sample(tree.x, tree.z)
    assert.ok(tree.z < -32 && tree.z > -190)
    assert.ok(surface.height >= 2 && surface.height <= 34 && surface.slope <= .86)
    assert.ok(tree.scale * 1.925 < 2.2, 'background pines must stay small')
    if (tree.z > -70) { nearScale += tree.scale; nearCount++ }
    if (tree.z < -120) { farScale += tree.scale; farCount++ }
  }
  assert.ok(farScale / farCount < nearScale / nearCount, 'the more distant canopy should recede in scale')
  assert.equal(forestDensityAt(0, -50, 1, .1), 0)
  assert.equal(forestDensityAt(0, -90, 20, 1), 0)
  assert.equal(forestDensityAt(0, -120, 40, .1), 0)
  assert.equal(forestDensityAt(0, -20, 10, .1), 0)
})

test.after(() => terrain.dispose())
