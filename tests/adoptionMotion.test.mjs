import test from 'node:test'
import assert from 'node:assert/strict'
import { adoptionAt, adoptionDuration } from '../src/adoptionMotion.mjs'

test('adoption starts white and fills each connection before its recipient, in order', () => {
  assert.deepEqual(adoptionAt(0), { source: 0, branches: Array.from({ length: 3 }, () => ({ path: 0, node: 0 })), complete: false })
  let previous = adoptionAt(0)
  for (let frame = 1; frame <= 600; frame++) {
    const current = adoptionAt(frame / 60)
    assert.ok(current.source >= previous.source && current.source <= 1)
    current.branches.forEach((branch, index) => {
      assert.ok(branch.path >= previous.branches[index].path && branch.path <= 1)
      assert.ok(branch.node >= previous.branches[index].node && branch.node <= 1)
      if (branch.node > 0) assert.equal(branch.path, 1)
      if (branch.path > 0) {
        assert.equal(current.source, 1)
        if (index > 0) assert.equal(current.branches[index - 1].node, 1)
      }
    })
    previous = current
  }
  assert.deepEqual(adoptionAt(adoptionDuration), { source: 1, branches: Array.from({ length: 3 }, () => ({ path: 1, node: 1 })), complete: true })
})
