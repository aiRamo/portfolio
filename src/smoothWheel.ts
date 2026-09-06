import { smoothScrollStep, wheelDeltaPixels, wheelTargetAt } from './scrollMotion.mjs'

/** Smooth document wheel input; touch, keyboard, zoom, and nested scrollers remain native. */
export function attachSmoothWheel() {
  const root = document.documentElement
  let frame = 0, position = scrollY, target = scrollY, written = scrollY, previous = 0
  const stop = () => {
    cancelAnimationFrame(frame); frame = 0
    position = target = written = scrollY
    root.dataset.wheelSmoothing = 'false'
  }
  const tick = (now: number) => {
    const maximum = Math.max(0, root.scrollHeight - innerHeight)
    target = Math.round(Math.max(0, Math.min(maximum, target)))
    position = smoothScrollStep(position, target, Math.min((now - previous) / 1000, .064))
    previous = now
    written = Math.round(position)
    window.scrollTo({ top: written, behavior: 'instant' })
    if (position === target) stop()
    else frame = requestAnimationFrame(tick)
  }
  const wheel = (event: WheelEvent) => {
    if (document.querySelector('.portfolio-content[inert]')) { if (!event.ctrlKey && !event.metaKey) event.preventDefault(); return }
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.shiftKey || !event.cancelable
      || !event.deltaY || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return
    let element = event.target instanceof Element ? event.target : null
    if (element?.closest('textarea, select, input, [contenteditable="true"], [data-native-scroll]')) return
    while (element && element !== document.body && element !== root) {
      const style = getComputedStyle(element)
      if (/(auto|scroll|overlay)/.test(style.overflowY) && element.scrollHeight > element.clientHeight + 1) return
      element = element.parentElement
    }
    if (!frame) position = target = written = scrollY
    const delta = wheelDeltaPixels(event.deltaY, event.deltaMode, innerHeight)
    const next = wheelTargetAt(position, target, delta, root.scrollHeight - innerHeight)
    if (next === target && position === target) return
    event.preventDefault()
    target = next
    root.dataset.wheelSmoothing = 'true'
    if (!frame) { previous = performance.now(); frame = requestAnimationFrame(tick) }
  }
  const nativeScroll = () => {
    // Scrollbar dragging, focus navigation, or an anchor can take over without a tug-of-war.
    if (frame && Math.abs(scrollY - written) > 1) stop()
  }
  const visibility = () => { if (document.hidden) stop() }
  addEventListener('wheel', wheel, { passive: false })
  addEventListener('scroll', nativeScroll, { passive: true })
  addEventListener('pointerdown', stop, { passive: true })
  addEventListener('touchstart', stop, { passive: true })
  addEventListener('keydown', stop)
  addEventListener('hashchange', stop)
  addEventListener('blur', stop)
  document.addEventListener('visibilitychange', visibility)
  return () => {
    stop()
    removeEventListener('wheel', wheel); removeEventListener('scroll', nativeScroll)
    removeEventListener('pointerdown', stop); removeEventListener('touchstart', stop)
    removeEventListener('keydown', stop); removeEventListener('hashchange', stop); removeEventListener('blur', stop)
    document.removeEventListener('visibilitychange', visibility)
    delete root.dataset.wheelSmoothing
  }
}
