import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { prepareTerrain } from '../src/prepareTerrain.mjs'

test('worker preparation preserves the original terrain buffers and 8,041-tree habitat', () => {
  const data = prepareTerrain(), hash = createHash('sha256')
  for (const name of Object.keys(data.attributes).sort()) {
    const array = data.attributes[name].array
    hash.update(name); hash.update(new Uint8Array(array.buffer, array.byteOffset, array.byteLength))
  }
  hash.update(new Uint8Array(data.index.buffer, data.index.byteOffset, data.index.byteLength))
  // Captured from the original synchronous scene at 847a3a4, before extracting the worker.
  assert.equal(hash.digest('hex'), 'ddd9f22eddb46e1c5cd7a8ceb2518c45289687b03e549eabdf3496733042b459')
  assert.equal(data.forest.length, 8041)
  assert.equal(data.attributes.position.array.length / 3, 187892)
  assert.equal(data.index.length / 3, 374052)
})
