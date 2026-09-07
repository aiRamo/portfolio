import test from 'node:test'
import assert from 'node:assert/strict'
import { phoneMotionAt, phoneTransitionDuration } from '../src/phoneMotion.mjs'

test('switching apps closes to home, taps the new icon, then opens the selected screenshot', () => {
  assert.equal(phoneTransitionDuration, 1.225)
  assert.deepEqual(phoneMotionAt(0), { phase: 'closing', app: 1, tap: 0 })
  assert.equal(phoneMotionAt(.15).phase, 'closing')
  assert.equal(phoneMotionAt(.15).app < 1, true)
  assert.equal(phoneMotionAt(.35).phase, 'home')
  assert.equal(phoneMotionAt(.65).phase, 'tap')
  assert.equal(phoneMotionAt(.95).phase, 'opening')
  assert.deepEqual(phoneMotionAt(phoneTransitionDuration), { phase: 'app', app: 1, tap: 0 })
  assert.equal(phoneMotionAt(0, false).phase, 'home')
})
test('the app launch grows continuously without overshooting the phone screen', () => {
  let previous = 0
  for (let frame = 0; frame <= 120; frame++) {
    const state = phoneMotionAt(.76 + frame / 120 * .465)
    assert.ok(state.app >= previous && state.app <= 1)
    previous = state.app
  }
})
