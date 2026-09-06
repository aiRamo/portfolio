import test from 'node:test'
import assert from 'node:assert/strict'
import { createAirTraffic, flightPositionAt, flightFrameAt, aircraftLightsAt, CONTRAIL_SECONDS } from '../src/airTraffic.mjs'

const visiblePlanes = state => state.flights.filter(flight => {
  const age = state.clock - flight.start
  return age >= 0 && age <= flight.duration && Math.abs(flightPositionAt(flight, age).x) <= .9 + 1e-9
})
const seededRandom = initial => {
  let seed = initial
  return () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32)
}

test('every scene load has a visible established crossing, including when initially paused', () => {
  for (const preview of [false, true]) for (let reload = 0; reload < 3; reload++) {
    const traffic = createAirTraffic({ random: () => .5, preview })
    const initial = traffic.advance(0, false)
    assert.ok(visiblePlanes(initial).length >= 1)
    assert.deepEqual(traffic.advance(600, false), initial)
  }
})

test('at least one actual airframe remains safely inside the screen through every handoff', () => {
  const randomSources = [() => 0, () => .5, () => 1, ...[13, 457, 743, 1918, 9917].map(seededRandom)]
  for (const random of randomSources) for (const preview of [false, true]) {
    const traffic = createAirTraffic({ random, preview })
    let overlaps = 0
    for (let tick = 0; tick < 18000; tick++) {
      const state = traffic.advance(.1, true)
      const visible = visiblePlanes(state)
      assert.ok(visible.length >= 1, `empty sky at ${state.clock}, preview=${preview}`)
      if (visible.length > 1) overlaps++
      assert.ok(state.flights.length <= 4, 'expired geometry must not accumulate')
      for (const flight of state.flights) assert.ok(state.clock - flight.start < flight.duration + CONTRAIL_SECONDS)
    }
    assert.ok(overlaps > 100, 'the next airframe must arrive before the previous one leaves')
  }
})

test('new arrivals start beyond a side edge and preserve the slow varied crossings', () => {
  const traffic = createAirTraffic({ random: seededRandom(743) })
  const known = new Set(traffic.advance(0, true).flights.map(flight => flight.id))
  let previousStart = null, arrivals = 0
  for (let tick = 0; tick < 12000; tick++) {
    const state = traffic.advance(.1, true)
    for (const flight of state.flights) {
      if (known.has(flight.id)) continue
      known.add(flight.id)
      arrivals++
      assert.ok(Math.abs(flightPositionAt(flight, state.clock - flight.start).x) > 1, 'no mid-screen repair spawns')
      if (previousStart !== null) {
        const interval = flight.start - previousStart
        assert.ok(interval >= 20 - 1e-9 && interval <= 32, `regular interval ${interval}`)
      }
      previousStart = flight.start
    }
  }
  assert.ok(arrivals > 40)
})

test('long frames advance the existing schedule without empty skies or arrival bursts', () => {
  const fast = createAirTraffic({ random: seededRandom(91) })
  const stepped = createAirTraffic({ random: seededRandom(91) })
  for (let i = 0; i < 1200; i++) stepped.advance(1, true)
  const caughtUp = fast.advance(1200, true)
  assert.deepEqual(caughtUp, stepped.advance(0, true))
  assert.ok(visiblePlanes(caughtUp).length > 0)
  assert.ok(caughtUp.flights.length <= 4)
})

test('the ambient clock advances continuously and only the scene pause freezes it', () => {
  const traffic = createAirTraffic({ random: () => .5 })
  const initial = traffic.advance(0, true)
  const before = traffic.advance(12, true)
  assert.equal(before.clock, initial.clock + 12)
  assert.notDeepEqual(flightPositionAt(before.flights[0], before.clock - before.flights[0].start),
    flightPositionAt(initial.flights[0], initial.clock - initial.flights[0].start))
  for (let i = 0; i < 10; i++) assert.deepEqual(traffic.advance(600, false), before)
  const resumed = traffic.advance(1, true)
  assert.deepEqual(resumed.flights, before.flights)
  assert.equal(resumed.clock, before.clock + 1)
  assert.equal(resumed.nextIn, before.nextIn - 1)
})

test('overlapping planes keep independent paths and retire independently', () => {
  const traffic = createAirTraffic({ random: () => 0 })
  const state = traffic.advance(24, true)
  assert.equal(visiblePlanes(state).length, 2)
  const positions = state.flights.map(flight => flightPositionAt(flight, state.clock - flight.start))
  assert.ok(positions[0].x > positions[1].x)
  const later = traffic.advance(17, true)
  assert.ok(!later.flights.some(flight => flight.id === state.flights[0].id))
  assert.ok(later.flights.some(flight => flight.id === state.flights[1].id))
})
test('varied crossings move steadily in both directions and always use side edges', () => {
  let seed = 457
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32)
  const directions = new Set(), slopes = new Set()
  let rising = 0, falling = 0
  for (let i = 0; i < 256; i++) {
    const { flights: [flight] } = createAirTraffic({ random }).advance(0, true)
    const start = flightPositionAt(flight, 0)
    const end = flightPositionAt(flight, flight.duration)
    directions.add(flight.direction)
    const slope = end.y - start.y
    slopes.add(Math.round(slope * 10))
    if (slope > .35) rising++
    if (slope < -.35) falling++
    assert.ok(flight.duration >= 36 && flight.duration <= 42, 'crossings should be slower than the former 30–34 seconds')
    assert.ok(start.x * flight.direction < -1 && end.x * flight.direction > 1)
    let previous = start
    for (let t = 1; t <= flight.duration; t++) {
      const current = flightPositionAt(flight, t)
      assert.ok((current.x - previous.x) * flight.direction > 0)
      assert.ok(Math.abs((current.x - previous.x) * flight.direction - 2.2 / flight.duration) < 1e-9)
      assert.ok(current.y >= -.18 && current.y <= .76, 'the full route must remain clear of top and bottom edges')
      previous = current
    }
    // These are the precise moments the center crosses the screen's left/right boundaries.
    for (const t of [.1 / 2.2, 2.1 / 2.2]) {
      const edge = flightPositionAt(flight, t * flight.duration)
      assert.ok(Math.abs(Math.abs(edge.x) - 1) < 1e-9)
      assert.ok(edge.y > -.2 && edge.y < .8)
    }
  }
  assert.equal(directions.size, 2)
  assert.ok(rising > 20 && falling > 20, 'angles should include noticeable climbs and descents')
  assert.ok(slopes.size > 10, 'crossings should not collapse to a few repeated diagonals')
})

test('airframes and contrails align with the actual route on desktop and mobile', () => {
  for (const aspect of [390 / 844, 1, 16 / 9, 32 / 9]) {
    for (const direction of [-1, 1]) for (const [entryY, exitY] of [[-.18,.76],[.76,-.18],[.4,.4]]) {
      const flight = { direction, entryY, exitY, duration: 39 }
      const { forward, normal, angle } = flightFrameAt(flight, aspect)
      const now = flightPositionAt(flight, 20), earlier = flightPositionAt(flight, 15)
      const dx = (now.x - earlier.x) * aspect, dy = now.y - earlier.y
      assert.ok(Math.abs(forward.x * dy - forward.y * dx) < 1e-9, 'nose must follow the route')
      assert.ok(Math.abs(Math.cos(angle) - forward.x) < 1e-9)
      assert.ok(Math.abs(Math.sin(angle) - forward.y) < 1e-9)
      assert.ok(dx * forward.x + dy * forward.y > 0, 'history must trail behind, including right-to-left crossings')
      assert.ok(Math.abs(normal.x * forward.x + normal.y * forward.y) < 1e-9, 'twin trail width must be perpendicular to travel')
      assert.ok(Math.abs(Math.hypot(normal.x, normal.y) - 1) < 1e-9)
    }
  }
})

test('night navigation lights stay steady while red beacons and paired strobes pulse', () => {
  assert.ok(aircraftLightsAt(0).beacon > .99)
  assert.ok(aircraftLightsAt(.7).beacon < .001)
  assert.ok(aircraftLightsAt(.12).strobe > .99)
  assert.ok(aircraftLightsAt(.31).strobe > .99)
  assert.equal(aircraftLightsAt(.7).strobe, 0)
  for (let tick = 0; tick < 1000; tick++) {
    const lights = aircraftLightsAt(tick / 100)
    assert.equal(lights.navigation, .75)
    for (const level of Object.values(lights)) assert.ok(level >= 0 && level <= 1)
    const cycle = aircraftLightsAt(tick / 100 + 1.7)
    assert.ok(Math.abs(lights.strobe - cycle.strobe) < 1e-10)
  }
})
