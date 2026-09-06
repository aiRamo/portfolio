import test from 'node:test'
import assert from 'node:assert/strict'
import { Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three'
import { CLIFF_MASSES, cliffMassGeometry, talusGeometry } from '../src/cliffs.mjs'
import { landscapeGeometry } from '../src/landscape.mjs'
import { createTerrainSampler } from '../src/forest.mjs'

test('cliff masses are closed, connected surfaces with outward winding and finite smooth normals', () => {
  for (const mass of CLIFF_MASSES) {
    const geometry = cliffMassGeometry(mass), edges = new Map()
    const p = geometry.attributes.position, n = geometry.attributes.normal, indices = geometry.index.array
    let volume = 0
    const a = new Vector3(), b = new Vector3(), c = new Vector3()
    for (let i = 0; i < p.count; i++) {
      assert.ok(Number.isFinite(p.getX(i) + p.getY(i) + p.getZ(i)))
      const length = Math.hypot(n.getX(i), n.getY(i), n.getZ(i))
      assert.ok(length > .99 && length < 1.01, 'every vertex needs a valid shading normal')
    }
    for (let i = 0; i < indices.length; i += 3) {
      const triangle = [indices[i], indices[i + 1], indices[i + 2]]
      a.fromBufferAttribute(p, triangle[0]); b.fromBufferAttribute(p, triangle[1]); c.fromBufferAttribute(p, triangle[2])
      volume += a.dot(b.cross(c)) / 6
      for (let j = 0; j < 3; j++) {
        const x = triangle[j], y = triangle[(j + 1) % 3], key = `${Math.min(x, y)}:${Math.max(x, y)}`
        const edge = edges.get(key) ?? { count: 0, direction: 0 }
        edge.count++; edge.direction += x < y ? 1 : -1
        edges.set(key, edge)
      }
    }
    assert.ok(volume > 0, 'faces must point out of the rock mass')
    assert.ok([...edges.values()].every(edge => edge.count === 2 && edge.direction === 0), 'no open edges or reversed seams')
    assert.ok(indices.length / 3 < 40000, 'keep each mass within the reflection rendering budget')
    assert.ok(Math.min(...geometry.attributes.rockOcclusion.array) < .85, 'recesses should receive local shading')
    geometry.dispose()
  }
})

test('adaptive terrain stays continuous and samples the actual triangles at each detail level', () => {
  const geometry = landscapeGeometry(), p = geometry.attributes.position
  const columns = geometry.userData.gridColumns, rows = geometry.userData.gridRows
  const xSteps = Array.from({ length: columns - 1 }, (_, i) => p.getX(i + 1) - p.getX(i))
  const zSteps = Array.from({ length: rows - 1 }, (_, i) => p.getZ((i + 1) * columns) - p.getZ(i * columns))
  assert.ok(Math.min(...xSteps) < .43 && Math.max(...xSteps) > 2.9)
  assert.ok(Math.min(...zSteps) < .41 && Math.max(...zSteps) > 2.4)
  assert.equal(geometry.index.count / 3, (columns - 1) * (rows - 1) * 2, 'adjacent levels share complete grid edges')
  assert.ok(geometry.index.count / 3 < 400000)
  const sample = createTerrainSampler(geometry), material = new MeshBasicMaterial(), ground = new Mesh(geometry, material)
  ground.updateMatrixWorld()
  const ray = new Raycaster(), down = new Vector3(0, -1, 0)
  for (const [x, z] of [[-33.2, 30.6], [44.8, 12.4], [65.1, -14.9], [-65.1, -105.2], [18.8, -160.7], [-6, 62]]) {
    ray.set(new Vector3(x, 100, z), down)
    const hit = ray.intersectObject(ground)[0]
    assert.ok(hit && Math.abs(hit.point.y - sample(x, z).height) < 1e-5, 'roots must meet the rendered surface across resolution boundaries')
  }
  assert.ok(sample(0, 13).height < 0, 'the tarn must remain open water')
  geometry.dispose(); material.dispose()
})

test('foreground rockfall uses welded shading normals instead of triangle-by-triangle faceting', () => {
  const geometry = talusGeometry(32, 4)
  assert.ok(geometry.index && geometry.attributes.position.count < geometry.index.count / 2)
  for (const value of geometry.attributes.normal.array) assert.ok(Number.isFinite(value))
  geometry.dispose()
})
