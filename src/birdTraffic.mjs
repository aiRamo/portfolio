import { clamp, mix } from './terrainMath.mjs'

export const MAX_FLOCK_BIRDS = 10

/** A quiet interval follows each complete crossing; time belongs to the scene clock. */
export function createBirdTraffic({ random = Math.random, preview = false } = {}) {
  let clock = 0, serial = 0
  const makeFlock = start => ({ id: ++serial, start, duration: 27 + clamp(random()) * 7,
    count: 7 + Math.min(3, Math.floor(clamp(random()) * 4)),
    altitude: .51 + random() * .05, slope: (random() - .5) * .045, seed: random() * 100 })
  let flock = makeFlock(0)
  flock.start = -flock.duration * (preview ? .55 : .38)
  let next = flock.start + flock.duration + 22 + clamp(random()) * 18
  return {
    advance(seconds, running) {
      if (running) clock += Math.max(0, seconds)
      // Catch up at the scheduled times so a long frame cannot spawn a burst.
      while (running && clock >= next) {
        flock = makeFlock(next)
        next = flock.start + flock.duration + 22 + clamp(random()) * 18
      }
      return { clock, flocks: clock < flock.start + flock.duration ? [flock] : [], nextIn: Math.max(0, next - clock) }
    },
  }
}

/** Normalized positions along the fixed valley flight corridor, in a loose leftward V. */
export function birdPositionAt(flock, seconds, index) {
  const rank = Math.ceil(index / 2), side = index % 2 ? 1 : -1
  const phase = flock.seed + index * 2.39996
  const progress = seconds / flock.duration
  return {
    x: mix(1.35, -1.35, progress) + rank * .059 + Math.sin(phase) * .008,
    y: flock.altitude + (progress - .5) * flock.slope + side * rank * .016
      + Math.sin(seconds * .62 + phase) * .006,
    depth: Math.sin(phase * 1.73) * 8,
    scale: .88 + (Math.sin(phase * .71) + 1) * .12,
    phase,
  }
}
