import test from 'node:test'
import assert from 'node:assert/strict'
import { createBirdTraffic, birdPositionAt, MAX_FLOCK_BIRDS } from '../src/birdTraffic.mjs'

const seededRandom = initial => {
  let seed = initial
  return () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32)
}

test('birds cross right to left, remain in the opening sky strip, and fully clear both edges', () => {
  for (const random of [() => 0, () => .5, () => 1, seededRandom(54)]) {
    const { flocks: [flock] } = createBirdTraffic({ random }).advance(0, true)
    assert.ok(flock.count >= 7 && flock.count <= MAX_FLOCK_BIRDS)
    const phases = new Set()
    for (let i = 0; i < flock.count; i++) {
      assert.ok(birdPositionAt(flock, 0, i).x > 1)
      assert.ok(birdPositionAt(flock, flock.duration, i).x < -1)
      let previous = Infinity
      for (let age = 0; age <= flock.duration; age += .25) {
        const bird = birdPositionAt(flock, age, i)
        assert.ok(bird.x < previous)
        assert.ok(bird.y >= .40 && bird.y <= .67)
        assert.ok(bird.scale >= .88 && bird.scale <= 1.12)
        previous = bird.x
        phases.add(bird.phase)
      }
    }
    assert.equal(phases.size, flock.count, 'every bird has an independent wing phase')
  }
})

test('flocks repeat with quiet gaps and never accumulate', () => {
  const traffic = createBirdTraffic({ random: seededRandom(701) })
  let gaps = 0, arrivals = 0, previousId = 0
  for (let tick = 0; tick < 9000; tick++) {
    const state = traffic.advance(.2, true)
    assert.ok(state.flocks.length <= 1)
    if (!state.flocks.length) gaps++
    else if (state.flocks[0].id !== previousId) {
      if (previousId) assert.ok(birdPositionAt(state.flocks[0], state.clock - state.flocks[0].start, 0).x > 1)
      previousId = state.flocks[0].id
      arrivals++
    }
  }
  assert.ok(gaps > 2500)
  assert.ok(arrivals > 20)
})

test('pause freezes the entire flock and a long frame preserves the same schedule', () => {
  for (const preview of [false, true]) {
    const traffic = createBirdTraffic({ random: seededRandom(18), preview })
    const initial = traffic.advance(0, false)
    assert.equal(initial.flocks.length, 1)
    assert.deepEqual(traffic.advance(300, false), initial)
    const stepped = createBirdTraffic({ random: seededRandom(18), preview })
    for (let tick = 0; tick < 1200; tick++) stepped.advance(1, true)
    assert.deepEqual(traffic.advance(1200, true), stepped.advance(0, true))
  }
})
