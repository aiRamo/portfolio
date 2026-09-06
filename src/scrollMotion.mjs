import { clamp } from './terrainMath.mjs'

/** Frame-rate-independent wheel smoothing, with a short tail and no overshoot. */
export function smoothScrollStep(position, target, seconds) {
  if (Math.abs(target - position) < .4) return target
  return position + (target - position) * (1 - Math.exp(-Math.max(0, seconds) / .16))
}

export function wheelDeltaPixels(delta, mode, viewportHeight) {
  return delta * (mode === 1 ? 16 : mode === 2 ? viewportHeight : 1)
}

/** Retain subpixel progress even when the browser rounds the rendered scroll position. */
export function createScrollSmoother(initialPosition) {
  let position = initialPosition
  return (target, seconds) => {
    position = smoothScrollStep(position, target, seconds)
    if (Math.abs(position - target) < .5) position = target
    return position
  }
}

export function wheelTargetAt(position, target, delta, maximum) {
  // A reversal responds immediately instead of fighting the previous input's remaining travel.
  const reversing = delta * (target - position) < 0
  return clamp((reversing ? position : target) + delta, 0, Math.max(0, maximum))
}

/** Deliberate section navigation has a finite eased arrival, in either direction. */
export function sectionScrollDuration(distance, reduced = false) {
  const duration = clamp(700 + Math.sqrt(Math.abs(distance)) * 11, 800, 1800)
  // Explicit navigation still moves visibly; reduced motion shortens the journey.
  return reduced ? Math.min(duration, 700) : duration
}

export function sectionScrollAt(start, end, elapsed, duration) {
  const t = clamp(duration > 0 ? elapsed / duration : 1, 0, 1)
  const ease = t * t * t * (t * (t * 6 - 15) + 10)
  return start + (end - start) * ease
}
