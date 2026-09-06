const clamp = value => Math.max(0, Math.min(1, value))
const ease = value => { const t = clamp(value); return t * t * t * (t * (t * 6 - 15) + 10) }
export const phoneTransitionDuration = 2.45

export function phoneMotionAt(time, hasPrevious = true) {
  if (time < .5 && hasPrevious) return { phase: 'closing', app: 1 - ease(time / .5), tap: 0 }
  if (time < 1.12) return { phase: 'home', app: 0, tap: 0 }
  if (time < 1.52) return { phase: 'tap', app: 0, tap: clamp((time - 1.12) / .4) }
  if (time < phoneTransitionDuration) return { phase: 'opening', app: ease((time - 1.52) / .93), tap: 0 }
  return { phase: 'app', app: 1, tap: 0 }
}
