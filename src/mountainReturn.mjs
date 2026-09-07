import { clamp } from './terrainMath.mjs'

/** Each phase has its own time budget, independent of document length. */
export function mountainReturnAt(elapsed, startProgress = 1, reduced = false) {
  const fadeOut = reduced ? 120 : 260
  const tilt = reduced ? 0 : 2200
  const fadeIn = reduced ? 160 : 420
  if (elapsed < fadeOut) return { phase: 'out', opacity: 1 - clamp(elapsed / fadeOut, 0, 1), progress: startProgress, reset: false, done: false }
  if (elapsed < fadeOut + tilt) return { phase: 'tilt', opacity: 0, progress: startProgress * (1 - (elapsed - fadeOut) / tilt), reset: true, done: false }
  return { phase: 'in', opacity: clamp((elapsed - fadeOut - tilt) / fadeIn, 0, 1), progress: 0, reset: true, done: elapsed >= fadeOut + tilt + fadeIn }
}
