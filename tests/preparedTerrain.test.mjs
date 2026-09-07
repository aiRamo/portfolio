import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { prepareTerrain } from '../src/prepareTerrain.mjs'

test('worker preparation preserves the graded shoreline buffers and 8,073-tree habitat', () => {
  const data = prepareTerrain(), hash = createHash('sha256')
  for (const name of Object.keys(data.attributes).sort()) {
    const array = data.attributes[name].array
    hash.update(name); hash.update(new Uint8Array(array.buffer, array.byteOffset, array.byteLength))
  }
  hash.update(new Uint8Array(data.index.buffer, data.index.byteOffset, data.index.byteLength))
  // Reviewed baseline after broadening the beach and blending the wet gravel colors.
  assert.equal(hash.digest('hex'), 'd0699ffa4b3e74cc7f62e73520c1b64e83837f36838cb0ec24508fd2a0da17c6')
  assert.equal(data.forest.length, 8073)
  assert.equal(data.attributes.position.array.length / 3, 187892)
  assert.equal(data.index.length / 3, 374052)
})
