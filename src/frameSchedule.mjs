/** Scheduling debt is separate from simulation time, including rounded RAF timestamps. */
export function createFramePacer() {
  let deadline = null, previous = null, rate = 0
  return {
    reset() { deadline = previous = null },
    step(now, fps, force = false) {
      const interval = 1000 / fps
      if (deadline === null || fps !== rate) { deadline = now; rate = fps }
      if (!force && now + .5 < deadline) return null
      const delta = previous === null ? 0 : Math.min(.1, Math.max(0, (now - previous) / 1000))
      previous = now
      if (now + .5 >= deadline) deadline += Math.max(1, Math.floor((now + .5 - deadline) / interval) + 1) * interval
      return delta
    },
  }
}

/** Match the old phone's 8% easing at 60 Hz on every display. */
export function phoneDamping(delta) { return 1 - Math.pow(.92, delta * 60) }
