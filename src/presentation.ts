import { sectionScrollAt, sectionScrollDuration, smoothScrollStep, wheelDeltaPixels, wheelTargetAt } from './scrollMotion.mjs'
import { isSceneScroll, nearestStop, panelStops, swipeDirection, wheelGesture } from './presentationStops.mjs'
import { attachFreeScroll } from './freeScroll'

type Stop = { top: number; element: HTMLElement; page: number; pages: number }
export type PresentationState = { index: number; count: number; id: string; label: string; moving: boolean }

export function attachPresentation(reduced: boolean) {
  // Include touch-first phones/tablets in landscape as well as the compact layout.
  const mobile = matchMedia('(max-width: 760px), (hover: none) and (pointer: coarse)')
  const attach = (resume: boolean) => mobile.matches ? attachFreeScroll(reduced, resume) : attachDesktopPresentation(reduced, resume)
  let detach = attach(false)
  const change = () => {
    detach()
    detach = attach(document.querySelector<HTMLElement>('.portfolio-content')?.dataset.reveal === 'content')
  }
  mobile.addEventListener('change', change)
  return () => { mobile.removeEventListener('change', change); detach() }
}

function attachDesktopPresentation(reduced: boolean, resume: boolean) {
  const root = document.documentElement
  const panels = [...document.querySelectorAll<HTMLElement>('[data-slide]')]
  const content = document.querySelector<HTMLElement>('.portfolio-content')!
  const isolate = (active: HTMLElement | null, scrolling = false, companion?: HTMLElement) => {
    panels.forEach(panel => {
      const selected = panel === active || panel === companion
      const shown = scrolling || selected
      const interactive = selected && !scrolling
      panel.dataset.slideVisible = String(shown)
      panel.inert = !interactive
      panel.setAttribute('aria-hidden', String(!interactive))
    })
  }
  const crop = () => {
    panels.forEach(panel => {
      if (panel.id === 'home') return
      const bounds = panel.getBoundingClientRect()
      panel.style.setProperty('--slide-clip-top', `${Math.max(0, offset() - bounds.top)}px`)
      panel.style.setProperty('--slide-clip-bottom', `${Math.max(0, bounds.bottom - innerHeight + 76)}px`)
    })
  }
  let stops: Stop[] = [], index = 0, frame = 0, initialized = false, moving = false
  let touch: { x: number; y: number; lastY: number; lastTime: number; velocity: number; scene: boolean; blocked: boolean } | null = null
  let resizeFrame = 0, resizePending = false, alignmentFrame = 0
  let panFrame = 0, panPosition = scrollY, panTarget = scrollY, panPrevious = 0
  const gesture = wheelGesture()
  const ready = () => content.dataset.reveal === 'content'
  const offset = () => parseFloat(getComputedStyle(root).scrollPaddingTop) || 110
  const sceneEnd = () => stops[1]?.top ?? 0
  const showScene = () => {
    isolate(panels[0], false, stops[1]?.element)
    crop()
  }
  const layoutTop = (element: HTMLElement) => {
    let top = 0
    for (let node: HTMLElement | null = element; node; node = node.offsetParent as HTMLElement | null) top += node.offsetTop
    return top
  }
  const measure = () => {
    const available = Math.max(180, innerHeight - offset() - 66)
    const max = Math.max(0, root.scrollHeight - innerHeight)
    stops = panels.flatMap(element => {
      // Decorative bottom spacing must never create an almost-empty extra stop.
      const contentHeight = element.offsetHeight - (parseFloat(getComputedStyle(element).paddingBottom) || 0)
      const positions = panelStops(Math.max(0, layoutTop(element) - offset()), contentHeight, available, element.id === 'home')
      return positions.map((top: number, page: number) => ({ top: Math.min(max, Math.round(top)), element, page, pages: positions.length }))
    })
  }
  const publish = (inMotion: boolean) => {
    const stop = stops[index]
    if (!stop) return
    // Keep the departing slide's animation alive until it has scrolled away.
    // The destination starts its visit only when we arrive.
    if (!inMotion) root.dataset.presentationSection = stop.element.id
    root.dataset.navigationMode = index === 0 && !inMotion ? 'scene' : 'slides'
    root.dataset.sectionScrolling = String(inMotion)
    const detail: PresentationState = { index, count: stops.length, id: stop.element.id, label: `${stop.element.dataset.slide}${stop.pages > 1 ? ` · ${stop.page + 1}/${stop.pages}` : ''}`, moving: inMotion }
    document.dispatchEvent(new CustomEvent('presentationchange', { detail }))
  }
  const finish = (focus = false) => {
    frame = 0; moving = false
    if (resizePending) {
      const old = stops[index]
      measure()
      const matching = stops.map((stop, i) => ({ stop, i })).filter(({ stop }) => stop.element === old.element)
      index = matching[Math.min(old.page, matching.length - 1)]?.i ?? nearestStop(stops, scrollY)
      resizePending = false
    }
    const stop = stops[index]
    window.scrollTo({ top: stop.top, behavior: 'instant' })
    panPosition = panTarget = stop.top
    if (index === 0) showScene()
    else { isolate(stop.element); crop() }
    if (location.hash !== `#${stop.element.id}`) history.replaceState(history.state, '', `#${stop.element.id}`)
    publish(false)
    if (focus) {
      const target = stop.element.querySelector<HTMLElement>('h1,h2,h3') || stop.element
      if (!target.hasAttribute('tabindex')) {
        target.tabIndex = -1
        target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true })
      }
      target.focus({ preventScroll: true })
    }
  }
  const stopPan = () => {
    cancelAnimationFrame(panFrame); panFrame = 0
    panPosition = panTarget = scrollY
  }
  const renderPan = () => {
    window.scrollTo({ top: panPosition, behavior: 'instant' })
    crop()
    if (panPosition >= sceneEnd() && panTarget >= sceneEnd()) {
      stopPan()
      index = 1
      finish()
    }
  }
  const pan = (delta: number, smooth = true) => {
    if (!initialized || !ready() || moving || !sceneEnd()) return
    if (index === 1 && delta >= 0) return
    cancelAnimationFrame(alignmentFrame); alignmentFrame = 0
    if (!panFrame) panPosition = panTarget = scrollY
    panTarget = wheelTargetAt(panPosition, panTarget, delta, sceneEnd())
    if (index !== 0) {
      index = 0
      if (location.hash !== '#home') history.replaceState(history.state, '', '#home')
      publish(false)
    }
    showScene()
    if (!smooth) {
      cancelAnimationFrame(panFrame); panFrame = 0
      panPosition = panTarget
      renderPan()
      return
    }
    if (panFrame) return
    panPrevious = performance.now()
    const tick = (now: number) => {
      panPosition = smoothScrollStep(panPosition, panTarget, Math.min((now - panPrevious) / 1000, .064))
      panPrevious = now
      if (Math.abs(panPosition - panTarget) < .5) panPosition = panTarget
      renderPan()
      if (index === 0 && panPosition !== panTarget) panFrame = requestAnimationFrame(tick)
      else panFrame = 0
    }
    panFrame = requestAnimationFrame(tick)
  }
  const go = (next: number, focus = false) => {
    if (!initialized || !ready() || !stops.length) return
    next = Math.max(0, Math.min(stops.length - 1, next))
    if (next === index && Math.abs(scrollY - stops[next].top) < 2 && !panFrame) return
    cancelAnimationFrame(frame)
    stopPan()
    cancelAnimationFrame(alignmentFrame); alignmentFrame = 0
    index = next; moving = true
    // Let the document move through the reading frame, including intervening
    // slides on menu jumps. Only the settled slide becomes interactive.
    isolate(null, true)
    crop()
    publish(true)
    const start = scrollY, began = performance.now()
    const duration = sectionScrollDuration(stops[index].top - start, reduced)
    const tick = (now: number) => {
      window.scrollTo({ top: sectionScrollAt(start, stops[index].top, now - began, duration), behavior: 'instant' })
      crop()
      if (now - began >= duration) finish(focus)
      else frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
  }
  const fromHash = () => {
    let element: HTMLElement | null = null
    try { element = document.getElementById(decodeURIComponent(location.hash.slice(1))) } catch { /* Invalid fragments use nearest stop. */ }
    const panel = element?.matches('[data-slide]') ? element : element?.closest('[data-slide]') || element?.querySelector('[data-slide]')
    const found = stops.findIndex(stop => stop.element === panel)
    return found < 0 ? nearestStop(stops, scrollY) : found
  }
  const initialize = () => {
    if (initialized || !ready()) return
    measure(); initialized = true; index = resume ? nearestStop(stops, scrollY) : fromHash(); finish()
  }
  const editable = (target: EventTarget | null) => target instanceof Element && !!target.closest('input,textarea,select,[contenteditable="true"],[data-native-scroll]')
  const wheel = (event: WheelEvent) => {
    if (event.ctrlKey || event.metaKey || editable(event.target) || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return
    if (!event.cancelable) return
    event.preventDefault()
    const delta = wheelDeltaPixels(event.deltaY, event.deltaMode, innerHeight)
    if (!moving && ready() && isSceneScroll(index, delta)) {
      // Consume this gesture at the boundary so its momentum cannot skip the intro.
      gesture(delta, performance.now(), true)
      pan(delta)
      return
    }
    const direction = gesture(delta, performance.now(), moving || !ready())
    if (direction) go(index + direction)
  }
  const touchStart = (event: TouchEvent) => {
    if (event.touches.length !== 1 || editable(event.target)) { touch = null; return }
    stopPan()
    touch = { x: event.touches[0].clientX, y: event.touches[0].clientY, lastY: event.touches[0].clientY, lastTime: performance.now(), velocity: 0, scene: index === 0, blocked: moving || !ready() }
  }
  const touchMove = (event: TouchEvent) => {
    if (event.touches.length !== 1) { touch = null; return }
    if (!touch) return
    const point = event.touches[0], dy = point.clientY - touch.y
    if (Math.abs(dy) <= Math.abs(point.clientX - touch.x)) return
    if (event.cancelable) event.preventDefault()
    if (touch.blocked) return
    const delta = touch.lastY - point.clientY, now = performance.now()
    if (index === 1 && dy > 0) touch.scene = true
    if (touch.scene) {
      touch.velocity = delta / Math.max(8, now - touch.lastTime)
      pan(delta, false)
    }
    touch.lastY = point.clientY; touch.lastTime = now
  }
  const touchEnd = (event: TouchEvent) => {
    const start = touch; touch = null
    if (!start || start.blocked || moving || !event.changedTouches.length) return
    if (start.scene) {
      // A short, bounded coast keeps touch movement continuous without skipping a slide.
      if (index === 0 && performance.now() - start.lastTime < 100) pan(start.velocity * 120)
      return
    }
    const dx = event.changedTouches[0].clientX - start.x, dy = event.changedTouches[0].clientY - start.y
    const direction = swipeDirection(dx, dy)
    if (direction) go(index + direction)
  }
  const touchCancel = () => { touch = null }
  const key = (event: KeyboardEvent) => {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || editable(event.target)) return
    if (event.target instanceof Element) {
      if (event.target.closest('[role="dialog"]')) return
      if (event.key === ' ' && event.target.closest('button,a')) return
      if (event.target.closest('.brand-navigation') && ['ArrowDown', 'ArrowUp'].includes(event.key)) return
    }
    const direction = ['ArrowDown', 'PageDown', ' '].includes(event.key) ? (event.shiftKey ? -1 : 1) : ['ArrowUp', 'PageUp'].includes(event.key) ? -1 : 0
    if (!direction && !['Home', 'End'].includes(event.key)) return
    event.preventDefault()
    if (!moving && direction && isSceneScroll(index, direction)) {
      pan(direction * (event.key.startsWith('Arrow') ? 60 : innerHeight * .85))
      return
    }
    if (!moving && !event.repeat) go(event.key === 'Home' ? 0 : event.key === 'End' ? stops.length - 1 : index + direction, true)
  }
  const click = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
    const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null
    if (!link || link.hasAttribute('download') || link.closest('[inert]') || (link.target && link.target !== '_self')) return
    const url = new URL(link.href)
    if (url.origin !== location.origin || url.pathname !== location.pathname || url.search !== location.search || !url.hash) return
    let element: HTMLElement | null
    try { element = document.getElementById(decodeURIComponent(url.hash.slice(1))) } catch { return }
    const panel = element?.matches('[data-slide]') ? element : element?.closest('[data-slide]') || element?.querySelector('[data-slide]')
    const next = stops.findIndex(stop => stop.element === panel)
    if (next < 0) return
    event.preventDefault()
    if (location.hash !== url.hash) history.pushState(history.state, '', url.hash)
    go(next, true)
  }
  const historyChange = () => { if (initialized) go(fromHash(), true) }
  const align = () => {
    if (!initialized || moving || !ready() || alignmentFrame) return
    if (index === 0) {
      if (!panFrame) {
        panPosition = panTarget = Math.max(0, Math.min(sceneEnd(), scrollY))
        renderPan()
      } else crop()
      return
    }
    // Native focus scrolling must not pull an otherwise stationary slide out of its frame.
    if (Math.abs(scrollY - stops[index].top) < 2) return
    alignmentFrame = requestAnimationFrame(() => {
      alignmentFrame = 0
      if (moving || !ready()) return
      window.scrollTo({ top: stops[index].top, behavior: 'instant' })
      crop()
    })
  }
  const resized = () => {
    cancelAnimationFrame(resizeFrame)
    resizeFrame = requestAnimationFrame(() => {
      if (!initialized) return
      if (moving) { resizePending = true; return }
      const old = stops[index]
      const previousEnd = sceneEnd()
      measure()
      if (index === 0) {
        const ratio = previousEnd > 0 ? sceneEnd() / previousEnd : 1
        panPosition = Math.max(0, Math.min(sceneEnd(), scrollY * ratio))
        panTarget = Math.max(0, Math.min(sceneEnd(), panTarget * ratio))
        showScene(); renderPan()
        return
      }
      const matching = stops.map((stop, i) => ({ stop, i })).filter(({ stop }) => stop.element === old.element)
      index = matching[Math.min(old.page, matching.length - 1)]?.i ?? nearestStop(stops, scrollY)
      finish()
    })
  }
  const observer = new MutationObserver(initialize)
  observer.observe(content, { attributes: true, attributeFilter: ['data-reveal'] })
  const resize = new ResizeObserver(resized)
  panels.forEach(panel => resize.observe(panel))
  root.dataset.presentation = 'true'
  isolate(null)
  addEventListener('wheel', wheel, { passive: false })
  addEventListener('touchstart', touchStart, { passive: true })
  addEventListener('touchmove', touchMove, { passive: false })
  addEventListener('touchend', touchEnd)
  addEventListener('touchcancel', touchCancel)
  addEventListener('keydown', key)
  addEventListener('resize', resized)
  addEventListener('scroll', align, { passive: true })
  addEventListener('popstate', historyChange)
  addEventListener('hashchange', historyChange)
  document.addEventListener('click', click)
  initialize()
  return () => {
    cancelAnimationFrame(frame); cancelAnimationFrame(panFrame); cancelAnimationFrame(resizeFrame); cancelAnimationFrame(alignmentFrame); observer.disconnect(); resize.disconnect()
    removeEventListener('wheel', wheel); removeEventListener('touchstart', touchStart); removeEventListener('touchmove', touchMove)
    removeEventListener('touchend', touchEnd); removeEventListener('touchcancel', touchCancel); removeEventListener('keydown', key)
    removeEventListener('resize', resized); removeEventListener('popstate', historyChange); removeEventListener('hashchange', historyChange)
    removeEventListener('scroll', align)
    document.removeEventListener('click', click)
    delete root.dataset.presentation; delete root.dataset.presentationSection; delete root.dataset.sectionScrolling; delete root.dataset.navigationMode
    panels.forEach(panel => { delete panel.dataset.slideVisible; panel.inert = false; panel.removeAttribute('aria-hidden'); panel.style.removeProperty('--slide-clip-top'); panel.style.removeProperty('--slide-clip-bottom') })
  }
}
