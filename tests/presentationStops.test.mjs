import test from 'node:test'
import assert from 'node:assert/strict'
import { panelRange, containedScrollAt, nearestStop, swipeDirection, wheelGesture } from '../src/presentationStops.mjs'

test('each short section has one stop, while long sections remain fully readable', () => {
  assert.deepEqual(panelRange(0, 1900, 700, true), { top: 0, end: 0 })
  assert.deepEqual(panelRange(900, 700, 700), { top: 900, end: 900 })
  for (const available of [180, 400, 724]) {
    const range = panelRange(1200, 2300, available)
    assert.equal(range.top, 1200)
    assert.equal(range.end + available, 3500)
  }
})
test('long sections follow input distance and contain overscroll in both directions', () => {
  assert.equal(containedScrollAt(1200, 37, 1200, 2800), 1237)
  assert.equal(containedScrollAt(1237, 19, 1200, 2800), 1256)
  assert.equal(containedScrollAt(1256, -12, 1200, 2800), 1244)
  assert.equal(containedScrollAt(2750, 500, 1200, 2800), 2800)
  assert.equal(containedScrollAt(1250, -500, 1200, 2800), 1200)
  assert.equal(nearestStop([{ top: 100, end: 2000 }, { top: 2200, end: 2300 }], 1900), 0)
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
