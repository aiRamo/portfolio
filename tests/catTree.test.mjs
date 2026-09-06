import test from 'node:test'
import assert from 'node:assert/strict'
import { Box3, Frustum, Matrix4, Mesh, MeshBasicMaterial, PerspectiveCamera, Raycaster, Vector3 } from 'three'
import { createCatTree, createClifftopCats } from '../src/catTree.mjs'
import { CLIFF_MASSES, cliffMassGeometry } from '../src/cliffs.mjs'
import { skyCameraAt } from '../src/scrollJourney.mjs'

function dispose(group) {
  group.traverse(mesh => {
    if (!mesh.isMesh) return
    mesh.geometry.dispose()
    mesh.material.dispose()
  })
}

test('the faceted sculpture has finite normals and a small static rendering budget', () => {
  const tree = createCatTree()
  let triangles = 0
  tree.traverse(mesh => {
    if (!mesh.isMesh) return
    const { position, normal, color } = mesh.geometry.attributes
    assert.equal(position.count, normal.count)
    assert.equal(position.count, color.count)
    for (let i = 0; i < position.count; i++) {
      assert.ok(Number.isFinite(position.getX(i) + position.getY(i) + position.getZ(i)))
      const length = Math.hypot(normal.getX(i), normal.getY(i), normal.getZ(i))
      assert.ok(length > .99 && length < 1.01, `degenerate face in ${mesh.name}`)
    }
    triangles += position.count / 3
  })
  assert.ok(triangles < 6000)
  assert.ok(tree.children.length <= 4)
  dispose(tree)
})

test('ear crests connect through the skull and the heavy belly stays against its perch', () => {
  const sculpture = createCatTree()
  for (const [name, crestHeight] of [['black-cat-lower-perch',3.96],['orange-cat-upper-perch',5.92]]) {
    const positions = sculpture.getObjectByName(name).geometry.attributes.position
    const ids = new Map(), parents = [], points = []
    const root = id => {
      while (parents[id] !== id) { parents[id] = parents[parents[id]]; id = parents[id] }
      return id
    }
    for (let i = 0; i < positions.count; i += 3) {
      const triangle = []
      for (let j = i; j < i + 3; j++) {
        const point = [positions.getX(j),positions.getY(j),positions.getZ(j)]
        const key = point.join(',')
        if (!ids.has(key)) { ids.set(key,points.length); parents.push(points.length); points.push(point) }
        triangle.push(ids.get(key))
      }
      parents[root(triangle[1])] = root(triangle[0])
      parents[root(triangle[2])] = root(triangle[0])
    }
    const crests = points.flatMap(([x,y],id)=>x < -2.3 && y > crestHeight ? [id] : [])
    assert.ok(crests.some(id=>points[id][2]>0) && crests.some(id=>points[id][2]<0))
    const skull = root(crests[0])
    assert.ok(crests.every(id=>root(id)===skull), `${name}: both ears must share the head surface`)
    assert.ok(points.some(([x],id)=>x < -3 && root(id)===skull), `${name}: the ear surface must extend into the face`)
  }
  const cat = sculpture.getObjectByName('orange-cat-upper-perch')
  const branch = sculpture.getObjectByName('weathered-forked-tree')
  const ray = new Raycaster()
  for (const x of [-1.8,-1.4,-1,-.6,-.3]) for (const z of [-.10,0,.10]) {
    ray.set(new Vector3(x,3,z),new Vector3(0,1,0))
    const belly = ray.intersectObject(cat)[0]
    ray.set(new Vector3(x,7,z),new Vector3(0,-1,0))
    const perch = ray.intersectObject(branch)[0]
    assert.ok(belly && perch)
    assert.ok(belly.point.y <= perch.point.y + .015, `belly gap at ${x}, ${z}`)
  }
  dispose(sculpture)
})

test('both cats clear the real cliff during ascent and the whole prop clears the reading sky', () => {
  const cliff = new Mesh(cliffMassGeometry(CLIFF_MASSES[0]), new MeshBasicMaterial())
  const ray = new Raycaster(), down = new Vector3(0,-1,0)
  let groundSamples = 0
  const heightAt = (x,z) => {
    groundSamples++
    ray.set(new Vector3(x,80,z),down)
    const hit = ray.intersectObject(cliff)[0]
    assert.ok(hit, 'footing must stay on the cliff')
    return hit.point.y
  }
  const tree = createClifftopCats(heightAt)
  assert.ok(groundSamples < 160, 'grounding must not raycast every triangle vertex during loading')
  tree.updateMatrixWorld(true)
  const footingBounds = new Box3().setFromObject(tree.getObjectByName('roots-rocks-and-tundra-grass'))
  assert.ok(footingBounds.min.y > tree.position.y - 1, 'the footing must sit on a shelf, not stretch over a cliff face')
  const camera = new PerspectiveCamera(49, 16/9, .25, 750)
  const cameraAt = progress => {
    const view = skyCameraAt(camera.aspect,progress)
    camera.position.fromArray(view.position)
    camera.lookAt(new Vector3(...view.target))
    camera.updateMatrixWorld(true)
  }
  cameraAt(.40)
  for (const name of ['black-cat-lower-perch','orange-cat-upper-perch']) {
    const cat = tree.getObjectByName(name)
    const point = new Box3().setFromObject(cat).getCenter(new Vector3())
    const projected = point.clone().project(camera)
    assert.ok(Math.abs(projected.x) < .97 && Math.abs(projected.y) < .97, `${name} must be visible during the reveal`)
    ray.set(camera.position,point.clone().sub(camera.position).normalize())
    const blocker = ray.intersectObject(cliff)[0]
    assert.ok(!blocker || blocker.distance > point.distanceTo(camera.position), `${name} must not hide behind the cliff lip`)
  }
  for (const aspect of [16/9, 1, 390/844]) {
    camera.aspect = aspect
    camera.fov = skyCameraAt(aspect,1).fov
    camera.updateProjectionMatrix()
    cameraAt(1)
    const frustum = new Frustum().setFromProjectionMatrix(new Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse))
    assert.equal(frustum.intersectsBox(new Box3().setFromObject(tree)), false)
  }
  dispose(tree); dispose(cliff)
})
