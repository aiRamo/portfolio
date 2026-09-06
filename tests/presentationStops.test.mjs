import test from 'node:test'
import assert from 'node:assert/strict'
import { panelStops, nearestStop, swipeDirection, wheelGesture } from '../src/presentationStops.mjs'

test('each short section has one stop, while long sections remain fully readable', () => {
  assert.deepEqual(panelStops(0, 1900, 700, true), [0])
  assert.deepEqual(panelStops(900, 700, 700), [900])
  for (const available of [180, 400, 724]) {
    const stops = panelStops(1200, 2300, available)
    assert.equal(stops[0], 1200)
    assert.equal(stops.at(-1) + available, 3500)
    for (let i = 1; i < stops.length; i++) {
      assert.ok(stops[i] > stops[i - 1])
      assert.ok(stops[i] - stops[i - 1] <= available)
    }
  }
})
test('trackpad momentum cannot advance through multiple sections', () => {
  const gesture = wheelGesture()
  assert.equal(gesture(8, 0, false), 0)
  assert.equal(gesture(26, 16, false), 1)
  for (let time = 32; time < 2500; time += 16) assert.equal(gesture(40, time, time < 1000), 0)
  assert.equal(gesture(-80, 2900, false), -1)
  assert.equal(gesture(100, 3200, true), 0)
  assert.equal(gesture(60, 3300, false), 0)
  assert.equal(gesture(60, 3700, false), 1)
})
test('resizing or deep linking selects the closest presentation stop', () => {
  const stops = [{ top: 0 }, { top: 1200 }, { top: 1900 }]
  assert.equal(nearestStop(stops, 50), 0)
  assert.equal(nearestStop(stops, 1300), 1)
  assert.equal(nearestStop(stops, 1880), 2)
})
test('vertical swipes navigate once while taps and horizontal gestures do not', () => {
  assert.equal(swipeDirection(4, -90), 1)
  assert.equal(swipeDirection(8, 90), -1)
  assert.equal(swipeDirection(4, 12), 0)
  assert.equal(swipeDirection(160, 50), 0)
  assert.equal(swipeDirection(100, 100), 0)
})
