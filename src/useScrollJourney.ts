import { useEffect, type RefObject } from 'react'
import { contentPullAt, journeyAt, scrollJourney } from './scrollJourney.mjs'
import { attachPresentation } from './presentation'
import { layoutTop, readingOffset } from './scrollLayout'

export function useScrollJourney(reduced: boolean, progress: RefObject<HTMLDivElement | null>, setActive: (section: string) => void) {
  useEffect(() => {
    const root = document.documentElement
    const intro = document.querySelector<HTMLElement>('#intro')!
    const sections = [...document.querySelectorAll<HTMLElement>('[data-section]')].map(element => ({ element, top: 0 }))
    const pulls = [...document.querySelectorAll<HTMLElement>('.reveal')].map(element => ({ element, top: 0, y: '', opacity: '' }))
    let frame = 0
    let layoutDirty = true, flightDistance = 1, scrollable = 1, activeSection = ''
    const update = () => {
      frame = 0
      if (layoutDirty) {
        // Finish the camera tilt at the same reading anchor used by navigation.
        flightDistance = Math.max(1, Math.round(layoutTop(intro) - readingOffset()))
        scrollJourney.distance = flightDistance
        scrollable = root.scrollHeight - innerHeight
        sections.forEach(item => { item.top = layoutTop(item.element) })
        pulls.forEach(item => { item.top = layoutTop(item.element) })
        layoutDirty = false
      }
      const flight = scrollJourney.override === null ? journeyAt(scrollY, flightDistance) : journeyAt(scrollJourney.override, 1)
      scrollJourney.progress = flight.progress
      let active = 'home'
      sections.forEach(item => { if (item.top - scrollY <= innerHeight * .45) active = item.element.id })
      root.style.setProperty('--pan-progress', String(flight.progress))
      root.style.setProperty('--sky-reveal', String(flight.sky))
      root.style.setProperty('--hero-visibility', String(flight.heroVisibility))
      root.dataset.heroVisible = String(flight.heroVisibility > .005)
      root.dataset.journeyStage = flight.progress >= .995 ? 'sky' : flight.progress > .01 ? 'ascending' : 'overlook'
      progress.current?.style.setProperty('transform', `scaleX(${scrollable > 0 ? scrollY / scrollable : 0})`)
      if (active !== activeSection) { activeSection = active; setActive(active) }
      // Layout is cached until content/viewport sizes change. Offscreen reveals
      // stay at their endpoints without repeatedly invalidating the whole page.
      pulls.forEach(item => {
        const focused = item.element.contains(document.activeElement)
        const pull = contentPullAt(item.top - scrollY, innerHeight, reduced || focused)
        const y = `${pull.y.toFixed(2)}px`, opacity = String(pull.opacity)
        if (y !== item.y) { item.y = y; item.element.style.setProperty('--pull-y', y) }
        if (opacity !== item.opacity) { item.opacity = opacity; item.element.style.setProperty('--pull-opacity', opacity) }
      })
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update) }
    const updateCamera = () => { cancelAnimationFrame(frame); update() }
    const measure = () => { layoutDirty = true; schedule() }
    const resize = new ResizeObserver(measure)
    resize.observe(document.querySelector('main')!)
    sections.forEach(item => resize.observe(item.element))
    addEventListener('scroll', schedule, { passive: true })
    addEventListener('resize', measure)
    addEventListener('focusin', schedule)
    addEventListener('journeychange', updateCamera)
    const detachPresentation = attachPresentation(reduced)
    update()
    return () => {
      cancelAnimationFrame(frame); resize.disconnect()
      detachPresentation()
      removeEventListener('journeychange', updateCamera)
      removeEventListener('scroll', schedule); removeEventListener('resize', measure); removeEventListener('focusin', schedule)
      pulls.forEach(({ element }) => { element.style.removeProperty('--pull-y'); element.style.removeProperty('--pull-opacity') })
    }
  }, [reduced, progress, setActive])
}
