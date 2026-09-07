import { mountainReturnAt } from './mountainReturn.mjs'
import { scrollJourney } from './scrollJourney.mjs'

export function returnToMountains(reduced: boolean, reset: () => void, complete: () => void) {
  const root = document.documentElement
  const content = document.querySelector<HTMLElement>('.portfolio-content')!
  const wasInert = content.inert
  const startProgress = scrollJourney.progress
  const began = performance.now()
  let frame = 0, didReset = false, finished = false
  content.inert = true
  root.dataset.mountainReturn = 'out'
  // Keep wheel/touch momentum and repeated navigation from disturbing the hidden reset.
  const block = (event: Event) => { if (event.cancelable) event.preventDefault(); event.stopImmediatePropagation() }
  const events = ['wheel', 'touchmove', 'keydown'] as const
  events.forEach(type => addEventListener(type, block, { capture: true, passive: false }))
  const updateCamera = (progress: number | null) => {
    scrollJourney.override = progress
    if (progress !== null) scrollJourney.progress = progress
    dispatchEvent(new Event('journeychange'))
  }
  const cleanup = () => {
    if (finished) return
    finished = true
    cancelAnimationFrame(frame)
    if (!didReset) reset()
    updateCamera(null)
    delete root.dataset.mountainReturn
    root.style.removeProperty('--return-opacity')
    content.inert = wasInert
    events.forEach(type => removeEventListener(type, block, true))
  }
  const tick = (now: number) => {
    const state = mountainReturnAt(now - began, startProgress, reduced)
    root.dataset.mountainReturn = state.phase
    root.style.setProperty('--return-opacity', String(state.opacity))
    updateCamera(state.progress)
    if (state.reset && !didReset) { didReset = true; reset() }
    if (state.done) { cleanup(); complete() }
    else frame = requestAnimationFrame(tick)
  }
  tick(began)
  return cleanup
}
