const clamp = value => Math.max(0, Math.min(1, value))
const ease = value => { const t = clamp(value); return t * t * (3 - 2 * t) }
export const adoptionDuration = 8.8

// Each recipient lights only after its incoming connection has reached it.
export function adoptionAt(seconds) {
  return {
    source: ease((seconds - .8) / .55),
    branches: [0, 1, 2].map(index => {
      const start = 1.65 + index * 2.1
      return { path: ease((seconds - start) / 1.35), node: ease((seconds - start - 1.35) / .45) }
    }),
    complete: seconds >= adoptionDuration,
  }
}
