import { sectionScrollAt, sectionScrollDuration } from './scrollMotion.mjs'
import type { PresentationState } from './presentation'

/** Native scrolling; only explicit same-page links take control of the scroll position. */
export function attachFreeScroll(reduced: boolean, resume: boolean) {
  const root = document.documentElement
  const content = document.querySelector<HTMLElement>('.portfolio-content')!
  const panels = [...document.querySelectorAll<HTMLElement>('[data-slide]')]
  let initialized = false, active = -1, frame = 0, observation = 0
  const ready = () => content.dataset.reveal === 'content'
  const offset = () => parseFloat(getComputedStyle(root).scrollPaddingTop) || 100
  const layoutTop = (element: HTMLElement) => {
    let top = 0
    for (let node: HTMLElement | null = element; node; node = node.offsetParent as HTMLElement | null) top += node.offsetTop
    return top
  }
  const targetTop = (element: HTMLElement) => Math.max(0, Math.min(root.scrollHeight - innerHeight, layoutTop(element) - offset()))
  const targetFor = (hash: string) => {
    try {
      const element = document.getElementById(decodeURIComponent(hash.slice(1)))
      return element?.matches('[data-slide]') ? element : element?.closest<HTMLElement>('[data-slide]') || element?.querySelector<HTMLElement>('[data-slide]')
    } catch { return null }
  }
  const update = () => {
    observation = 0
    if (!initialized) return
    let next = 0
    panels.forEach((panel, index) => { if (layoutTop(panel) - scrollY <= innerHeight * .45) next = index })
    if (next === active) return
    active = next
    const panel = panels[active]
    root.dataset.presentationSection = panel.id
    if (!frame && location.hash !== `#${panel.id}`) history.replaceState(history.state, '', `#${panel.id}`)
    const detail: PresentationState = { index: active, count: panels.length, id: panel.id, label: panel.dataset.slide!, moving: false }
    document.dispatchEvent(new CustomEvent('presentationchange', { detail }))
  }
  const schedule = () => { if (!observation) observation = requestAnimationFrame(update) }
  const cancel = () => { cancelAnimationFrame(frame); frame = 0 }
  const focus = (panel: HTMLElement) => {
    const target = panel.querySelector<HTMLElement>('h1,h2,h3') || panel
    if (!target.hasAttribute('tabindex')) {
      target.tabIndex = -1
      target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true })
    }
    target.focus({ preventScroll: true })
  }
  const go = (panel: HTMLElement) => {
    if (!initialized || !ready()) return
    cancel()
    const start = scrollY, end = targetTop(panel), began = performance.now()
    const duration = sectionScrollDuration(end - start, reduced)
    const tick = (now: number) => {
      window.scrollTo({ top: sectionScrollAt(start, end, now - began, duration), behavior: 'instant' })
      if (now - began < duration) frame = requestAnimationFrame(tick)
      else { frame = 0; update(); focus(panel) }
    }
    frame = requestAnimationFrame(tick)
  }
  const click = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
    const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null
    if (!link || link.hasAttribute('download') || link.closest('[inert]') || (link.target && link.target !== '_self')) return
    const url = new URL(link.href)
    if (url.origin !== location.origin || url.pathname !== location.pathname || url.search !== location.search || !url.hash) return
    const panel = targetFor(url.hash)
    if (!panel || !initialized || !ready()) return
    event.preventDefault()
    if (location.hash !== url.hash) history.pushState(history.state, '', url.hash)
    go(panel)
  }
  const historyChange = () => {
    const panel = targetFor(location.hash)
    if (panel) go(panel)
  }
  const key = (event: KeyboardEvent) => {
    if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' ', 'Home', 'End'].includes(event.key)) cancel()
  }
  const initialize = () => {
    if (initialized || !ready()) return
    initialized = true
    const panel = targetFor(location.hash)
    if (panel && !resume) window.scrollTo({ top: targetTop(panel), behavior: 'instant' })
    update()
  }
  root.dataset.presentation = 'false'
  root.dataset.navigationMode = 'free'
  root.dataset.sectionScrolling = 'false'
  const observer = new MutationObserver(initialize)
  observer.observe(content, { attributes: true, attributeFilter: ['data-reveal'] })
  const resize = new ResizeObserver(schedule)
  panels.forEach(panel => resize.observe(panel))
  addEventListener('scroll', schedule, { passive: true })
  addEventListener('resize', schedule)
  // These listeners only cancel an in-flight menu jump. Native input is never prevented.
  addEventListener('wheel', cancel, { passive: true })
  addEventListener('touchstart', cancel, { passive: true })
  addEventListener('keydown', key)
  addEventListener('popstate', historyChange)
  addEventListener('hashchange', historyChange)
  document.addEventListener('click', click)
  initialize()
  return () => {
    cancel(); cancelAnimationFrame(observation); observer.disconnect(); resize.disconnect()
    removeEventListener('scroll', schedule); removeEventListener('resize', schedule)
    removeEventListener('wheel', cancel); removeEventListener('touchstart', cancel); removeEventListener('keydown', key)
    removeEventListener('popstate', historyChange); removeEventListener('hashchange', historyChange)
    document.removeEventListener('click', click)
    delete root.dataset.presentation; delete root.dataset.presentationSection; delete root.dataset.navigationMode; delete root.dataset.sectionScrolling
  }
}
