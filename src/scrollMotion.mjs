import { clamp } from './terrainMath.mjs'

/** Frame-rate-independent wheel smoothing, with a short tail and no overshoot. */
export function smoothScrollStep(position, target, seconds) {
  if (Math.abs(target - position) < .4) return target
  return position + (target - position) * (1 - Math.exp(-Math.max(0, seconds) / .16))
}

export function wheelDeltaPixels(delta, mode, viewportHeight) {
  return delta * (mode === 1 ? 16 : mode === 2 ? viewportHeight : 1)
}

export function wheelTargetAt(position, target, delta, maximum) {
  // A reversal responds immediately instead of fighting the previous input's remaining travel.
  const reversing = delta * (target - position) < 0
  return clamp((reversing ? position : target) + delta, 0, Math.max(0, maximum))
}
