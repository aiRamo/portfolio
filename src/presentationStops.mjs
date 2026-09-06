// A long panel has one continuous reading range, rather than intermediate pages.
export function panelRange(top, height, available, isHome = false) {
  return isHome ? { top: 0, end: 0 } : { top, end: top + Math.max(0, height - available) }
}

export function containedScrollAt(position, delta, top, end) {
  return Math.max(top, Math.min(end, position + delta))
}

export function nearestStop(stops, position) {
  const distance = stop => Math.abs(position - containedScrollAt(position, 0, stop.top, stop.end ?? stop.top))
  return stops.reduce((best, stop, index) => distance(stop) < distance(stops[best]) ? index : best, 0)
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
