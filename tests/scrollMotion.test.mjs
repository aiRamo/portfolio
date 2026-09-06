import test from 'node:test'
import assert from 'node:assert/strict'
import { smoothScrollStep, wheelDeltaPixels, wheelTargetAt } from '../src/scrollMotion.mjs'

test('a wheel tick flows through intermediate positions, then stops exactly without overshoot', () => {
  let position = 0
  const target = 120
  position = smoothScrollStep(position, target, 1 / 60)
  assert.ok(position > 0 && position < 15, 'a 120px tick should not jump the document by 120px')
  for (let i = 0; i < 180; i++) {
    const next = smoothScrollStep(position, target, 1 / 60)
    assert.ok(next >= position && next <= target)
    position = next
  }
  assert.equal(position, target)
  assert.equal(smoothScrollStep(position, target, 1 / 60), target)
})

test('the same elapsed time produces the same motion at 30, 60, and 120 fps', () => {
  const results = [30, 60, 120].map(fps => {
    let position = 0
    for (let i = 0; i < fps / 2; i++) position = smoothScrollStep(position, 600, 1 / fps)
    return position
  })
  results.forEach(position => assert.ok(Math.abs(position - results[0]) < 1e-8))
  assert.ok(results[0] > 570 && results[0] < 600, 'most travel should finish within half a second')
})

test('successive ticks accumulate, reversals respond immediately, and endpoints remain bounded', () => {
  assert.equal(wheelTargetAt(40, 120, 120, 1000), 240)
  const reversed = wheelTargetAt(40, 240, -20, 1000)
  assert.equal(reversed, 20)
  assert.ok(smoothScrollStep(40, reversed, 1 / 60) < 40)
  assert.equal(wheelTargetAt(40, 240, -120, 1000), 0)
  assert.equal(wheelTargetAt(940, 980, 120, 1000), 1000)
  assert.equal(wheelTargetAt(0, 0, 120, 0), 0)
})

test('wheel units normalize across pixel, line, and page based devices', () => {
  assert.equal(wheelDeltaPixels(120, 0, 900), 120)
  assert.equal(wheelDeltaPixels(3, 1, 900), 48)
  assert.equal(wheelDeltaPixels(-1, 2, 900), -900)
})
