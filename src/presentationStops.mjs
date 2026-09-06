export function panelStops(top, height, available, isHome = false) {
  if (isHome) return [0]
  const span = Math.max(0, height - available)
  const pages = Math.ceil(span / (available * .85))
  return Array.from({ length: pages + 1 }, (_, page) => top + Math.min(page * available * .85, span))
}

export function nearestStop(stops, position) {
  return stops.reduce((best, stop, index) => Math.abs(stop.top - position) < Math.abs(stops[best].top - position) ? index : best, 0)
}

export function swipeDirection(dx, dy) {
  return Math.abs(dy) >= 45 && Math.abs(dy) > Math.abs(dx) * 1.2 ? (dy < 0 ? 1 : -1) : 0
}

// The landscape-to-introduction interval follows input distance in both directions.
export function isSceneScroll(index, delta) {
  return index === 0 || (index === 1 && delta < 0)
}

// A trackpad's momentum belongs to the original gesture, never to the next slide.
export function wheelGesture() {
  let last = -Infinity, total = 0, consumed = false
  return (delta, now, busy) => {
    if (now - last > 220) { total = 0; consumed = false }
    last = now
    if (busy) { consumed = true; return 0 }
    if (consumed) return 0
    if (total * delta < 0) total = 0
    total += delta
    if (Math.abs(total) < 30) return 0
    consumed = true
    return Math.sign(total)
  }
}
