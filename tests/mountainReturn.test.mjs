import test from 'node:test'
import assert from 'node:assert/strict'
import { mountainReturnAt } from '../src/mountainReturn.mjs'

test('return hides the content before resetting and keeps it hidden throughout the full tilt', () => {
  assert.equal(mountainReturnAt(259).reset, false)
  const start = mountainReturnAt(260)
  assert.equal(start.reset, true)
  assert.equal(start.opacity, 0)
  assert.equal(start.progress, 1)
  assert.equal(mountainReturnAt(1460).progress, .5)
  assert.equal(mountainReturnAt(2659).opacity, 0)
  const reveal = mountainReturnAt(2660)
  assert.equal(reveal.progress, 0)
  assert.equal(reveal.opacity, 0)
  assert.equal(mountainReturnAt(3080).opacity, 1)
  assert.equal(mountainReturnAt(3080).done, true)
})

test('a partially tilted camera returns continuously without jumping to the sky', () => {
  assert.equal(mountainReturnAt(0, .4).progress, .4)
  assert.equal(mountainReturnAt(260, .4).progress, .4)
  assert.equal(mountainReturnAt(1460, .4).progress, .2)
  assert.equal(mountainReturnAt(2660, .4).progress, 0)
})

test('reduced motion retains the full deliberate tilt instead of snapping to the mountains', () => {
  assert.equal(mountainReturnAt(119, 1, true).reset, false)
  const reset = mountainReturnAt(120, 1, true)
  assert.equal(reset.progress, 1)
  assert.equal(reset.opacity, 0)
  assert.equal(reset.phase, 'tilt')
  assert.equal(mountainReturnAt(1320, 1, true).progress, .5)
  assert.equal(mountainReturnAt(2519, 1, true).opacity, 0)
  assert.equal(mountainReturnAt(2520, 1, true).progress, 0)
  assert.equal(mountainReturnAt(2680, 1, true).done, true)
})
