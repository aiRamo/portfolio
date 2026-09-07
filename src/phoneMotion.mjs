const clamp = value => Math.max(0, Math.min(1, value))
const ease = value => { const t = clamp(value); return t * t * t * (t * (t * 6 - 15) + 10) }
export const phoneTransitionDuration = 1.225

export function phoneMotionAt(time, hasPrevious = true) {
  if (time < .25 && hasPrevious) return { phase: 'closing', app: 1 - ease(time / .25), tap: 0 }
  if (time < .56) return { phase: 'home', app: 0, tap: 0 }
  if (time < .76) return { phase: 'tap', app: 0, tap: clamp((time - .56) / .2) }
  if (time < phoneTransitionDuration) return { phase: 'opening', app: ease((time - .76) / .465), tap: 0 }
  return { phase: 'app', app: 1, tap: 0 }
}
