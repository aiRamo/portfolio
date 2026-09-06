import { sectionScrollAt, sectionScrollDuration } from './scrollMotion.mjs'

/** Animate every same-page section link with the actual document/camera scroll. */
export function attachAnchorScroll(reduced: boolean, cancelWheel: () => void) {
  const root = document.documentElement
  let frame = 0, written = scrollY
  const stop = () => {
    cancelAnimationFrame(frame)
    frame = 0
    root.dataset.sectionScrolling = 'false'
  }
  const destination = (element: HTMLElement) => {
    // offsetTop ignores the scroll-linked reveal transforms on intro/content.
    let top = 0
    for (let node: HTMLElement | null = element; node; node = node.offsetParent as HTMLElement | null) top += node.offsetTop
    top -= parseFloat(getComputedStyle(root).scrollPaddingTop) || 0
    top -= parseFloat(getComputedStyle(element).scrollMarginTop) || 0
    return Math.round(Math.max(0, Math.min(root.scrollHeight - innerHeight, top)))
  }
  const focusDestination = (section: HTMLElement) => {
    const heading = section.querySelector<HTMLElement>('h1, h2') || section
    if (!heading.hasAttribute('tabindex')) {
      heading.tabIndex = -1
      heading.addEventListener('blur', () => heading.removeAttribute('tabindex'), { once: true })
    }
    heading.focus({ preventScroll: true })
  }
  const click = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
    const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self') || link.closest('[inert]')) return
    const url = new URL(link.href, location.href)
    if (url.origin !== location.origin || url.pathname !== location.pathname || url.search !== location.search || !url.hash) return
    let id: string
    try { id = decodeURIComponent(url.hash.slice(1)) } catch { return }
    const section = document.getElementById(id)
    if (!section) return
    event.preventDefault()
    stop()
    cancelWheel()
    // pushState updates sharable anchors without triggering the browser's jump.
    if (location.hash !== url.hash) history.pushState(history.state, '', url.hash)
    const start = scrollY, began = performance.now()
    const duration = sectionScrollDuration(destination(section) - start, reduced)
    if (Math.abs(destination(section) - start) < 1) { focusDestination(section); return }
    written = start
    root.dataset.sectionScrolling = 'true'
    const tick = (now: number) => {
      const elapsed = now - began
      const end = destination(section)
      written = Math.round(sectionScrollAt(start, end, elapsed, duration))
      window.scrollTo({ top: written, behavior: 'instant' })
      if (elapsed >= duration) {
        stop()
        focusDestination(section)
      } else frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
  }
  const nativeScroll = () => { if (frame && Math.abs(scrollY - written) > 2) stop() }
  const visibility = () => { if (document.hidden) stop() }
  document.addEventListener('click', click)
  // Capture cancels the anchor motion before the wheel smoother accepts new input.
  addEventListener('wheel', stop, { passive: true, capture: true })
  addEventListener('pointerdown', stop, { passive: true })
  addEventListener('touchstart', stop, { passive: true })
  addEventListener('keydown', stop)
  addEventListener('scroll', nativeScroll, { passive: true })
  addEventListener('popstate', stop)
  addEventListener('hashchange', stop)
  addEventListener('resize', stop)
  addEventListener('blur', stop)
  document.addEventListener('visibilitychange', visibility)
  return () => {
    stop()
    document.removeEventListener('click', click)
    removeEventListener('wheel', stop, true)
    removeEventListener('pointerdown', stop)
    removeEventListener('touchstart', stop)
    removeEventListener('keydown', stop)
    removeEventListener('scroll', nativeScroll)
    removeEventListener('popstate', stop)
    removeEventListener('hashchange', stop)
    removeEventListener('resize', stop)
    removeEventListener('blur', stop)
    document.removeEventListener('visibilitychange', visibility)
    delete root.dataset.sectionScrolling
  }
}
