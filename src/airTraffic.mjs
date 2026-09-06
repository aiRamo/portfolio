import { clamp, mix, smooth } from './terrainMath.mjs'

export const CONTRAIL_SECONDS = 10
// Handoffs happen well inside the edges, with two seconds of shared visibility.
const VISIBLE_INSET = .9
const HANDOFF_SECONDS = 2
const entryAge = flight => flight.duration * (1.1 - VISIBLE_INSET) / 2.2
const exitAge = flight => flight.duration * (1.1 + VISIBLE_INSET) / 2.2

/**
 * Continuous coverage, measured in ambient scene time rather than scroll/view time.
 * @param {{ random?: () => number, preview?: boolean }} [options]
 */
export function createAirTraffic({ random = Math.random, preview = false } = {}) {
  let clock = 0, serial = 0
  const interval = () => 20 + clamp(random()) * 12
  const makeFlight = (start) => {
    const entryY = -.08 + random() * .76
    const exitY = clamp(entryY + (random() - .5) * 1.35, -.18, .76)
    return { id: ++serial, start, duration: 36 + random() * 6,
      direction: random() < .5 ? 1 : -1, entryY, exitY, seed: random() * 100 }
  }
  let flights = preview ? [
    { ...makeFlight(-10), direction: 1, entryY: .12, exitY: .70 },
    { ...makeFlight(-18), direction: -1, entryY: .26, exitY: .65 },
  ] : [makeFlight(0)]
  // Start with an established crossing on every load, even if initially paused.
  if (!preview) flights[0].start = -flights[0].duration * .18
  let pending, next
  function schedule(from) {
    pending = makeFlight(0)
    const coveredUntil = Math.max(...flights.map(flight => flight.start + exitAge(flight)))
    next = Math.min(from + interval(), coveredUntil - entryAge(pending) - HANDOFF_SECONDS)
    pending.start = next
  }
  schedule(clock)
  return {
    advance(seconds, running) {
      if (running) clock += Math.max(0, seconds)
      // Schedule at exact times, including after a long frame; new planes always
      // enter from offscreen instead of popping into view to repair an empty sky.
      while (running && clock >= next) {
        flights.push(pending)
        schedule(next)
      }
      flights = flights.filter(flight => clock - flight.start < flight.duration + CONTRAIL_SECONDS)
      return { clock, flights: [...flights], nextIn: Math.max(0, next - clock) }
    },
  }
}

export function flightPositionAt(flight, seconds) {
  const t = seconds / flight.duration
  return { x: mix(-1.10, 1.10, t) * flight.direction, y: mix(flight.entryY, flight.exitY, t) }
}

/** Use the same screen-space heading for the airframe, engine offsets, and trail width. */
export function flightFrameAt(flight, aspect) {
  const dx = 2.2 * flight.direction * aspect, dy = flight.exitY - flight.entryY
  const length = Math.hypot(dx, dy)
  const x = dx / length, y = dy / length
  return { forward: { x, y }, normal: { x: -y, y: x }, angle: Math.atan2(dy, dx) }
}

/** Position lights stay steady; red beacons and paired white strobes supply the pulses. */
export function aircraftLightsAt(seconds) {
  const beaconPhase = ((seconds % 1.4) + 1.4) % 1.4
  const beaconDistance = Math.min(beaconPhase, 1.4 - beaconPhase)
  const strobePhase = ((seconds % 1.7) + 1.7) % 1.7
  const flash = center => 1 - smooth(Math.abs(strobePhase - center) / .065)
  return { navigation: .75, beacon: Math.exp(-((beaconDistance / .11) ** 2)), strobe: Math.max(flash(.12), flash(.31)) }
}
