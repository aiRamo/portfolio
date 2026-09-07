import test from 'node:test'
import assert from 'node:assert/strict'
import { createFramePacer, phoneDamping } from '../src/frameSchedule.mjs'

test('30 and 60 fps budgets survive display cadence and rounded timestamps', () => {
  for (const refresh of [60,90,120,144]) for (const fps of [30,60]) {
    const pacer = createFramePacer(); let frames = 0, seconds = 0
    for (let i = 0; i <= refresh * 10; i++) {
      const dt = pacer.step(Math.round(i * 10000 / refresh) / 10, fps)
      if (dt !== null) { frames++; seconds += dt }
    }
    assert.ok(Math.abs(frames - (fps * 10 + 1)) <= 1, `${refresh} Hz display, ${fps} fps budget: ${frames} frames`)
    assert.ok(Math.abs(seconds - 10) < .04, 'render scheduling must not accelerate the simulation clock')
  }
})
test('resume starts a fresh clock and invalidation does not spend future deadlines', () => {
  const pacer = createFramePacer()
  assert.equal(pacer.step(0,30),0)
  assert.equal(pacer.step(10,30),null)
  assert.equal(pacer.step(10,30,true),.01)
  assert.equal(pacer.step(20,30),null)
  assert.ok(pacer.step(33.3,30)>0)
  pacer.reset()
  assert.equal(pacer.step(10000,30),0)
})
test('phone tilt converges equally after one second on different displays', () => {
  const final = hz => { let rotation = 1; for (let i=0;i<hz;i++) rotation += -rotation * phoneDamping(1/hz); return rotation }
  for (const hz of [30,60,90,120,144]) assert.ok(Math.abs(final(hz)-final(60))<1e-12)
})
