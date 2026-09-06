import test from 'node:test'
import assert from 'node:assert/strict'
import { phoneMotionAt, phoneTransitionDuration } from '../src/phoneMotion.mjs'

test('switching apps closes to home, taps the new icon, then opens the selected screenshot', () => {
  assert.deepEqual(phoneMotionAt(0), { phase: 'closing', app: 1, tap: 0 })
  assert.equal(phoneMotionAt(.3).phase, 'closing')
  assert.equal(phoneMotionAt(.3).app < 1, true)
  assert.equal(phoneMotionAt(.7).phase, 'home')
  assert.equal(phoneMotionAt(1.3).phase, 'tap')
  assert.equal(phoneMotionAt(1.9).phase, 'opening')
  assert.deepEqual(phoneMotionAt(phoneTransitionDuration), { phase: 'app', app: 1, tap: 0 })
  assert.equal(phoneMotionAt(0, false).phase, 'home')
})
test('the app launch grows continuously without overshooting the phone screen', () => {
  let previous = 0
  for (let frame = 0; frame <= 120; frame++) {
    const state = phoneMotionAt(1.52 + frame / 120 * .93)
    assert.ok(state.app >= previous && state.app <= 1)
    previous = state.app
  }
})
