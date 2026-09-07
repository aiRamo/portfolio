import { useEffect, type RefObject } from 'react'
import { contentPullAt, journeyAt, scrollJourney } from './scrollJourney.mjs'
import { attachPresentation } from './presentation'
import { layoutTop, readingOffset } from './scrollLayout'

export function useScrollJourney(reduced: boolean, progress: RefObject<HTMLDivElement | null>, setActive: (section: string) => void) {
  useEffect(() => {
    const root = document.documentElement
    const intro = document.querySelector<HTMLElement>('#intro')!
    const sections = [...document.querySelectorAll<HTMLElement>('[data-section]')]
    const pulls = [...document.querySelectorAll<HTMLElement>('.reveal')].map(element => ({ element, y: 0 }))
    let frame = 0
    let layoutDirty = true, flightDistance = 1
    const update = () => {
      frame = 0
      if (layoutDirty) {
        // Finish the camera tilt at the same reading anchor used by navigation.
        flightDistance = Math.max(1, Math.round(layoutTop(intro) - readingOffset()))
        layoutDirty = false
      }
      const flight = journeyAt(scrollY, flightDistance)
      scrollJourney.progress = flight.progress
      const scrollable = root.scrollHeight - innerHeight
      let active = 'home'
      sections.forEach(section => { if (section.getBoundingClientRect().top <= innerHeight * .45) active = section.id })
      const measurements = pulls.map(item => ({ item, top: item.element.getBoundingClientRect().top - item.y }))
      root.style.setProperty('--pan-progress', String(flight.progress))
      root.style.setProperty('--sky-reveal', String(flight.sky))
      root.style.setProperty('--hero-visibility', String(flight.heroVisibility))
      root.dataset.heroVisible = String(flight.heroVisibility > .005)
      root.dataset.journeyStage = flight.progress >= .995 ? 'sky' : flight.progress > .01 ? 'ascending' : 'overlook'
      progress.current?.style.setProperty('transform', `scaleX(${scrollable > 0 ? scrollY / scrollable : 0})`)
      setActive(active)
      // All layout measurements precede style writes, including inherited sky properties.
      measurements.forEach(({ item, top }) => {
        const focused = item.element.contains(document.activeElement)
        const pull = contentPullAt(top, innerHeight, reduced || focused)
        item.y = pull.y
        item.element.style.setProperty('--pull-y', `${pull.y.toFixed(2)}px`)
        item.element.style.setProperty('--pull-opacity', String(pull.opacity))
      })
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update) }
    const measure = () => { layoutDirty = true; schedule() }
    const resize = new ResizeObserver(measure)
    resize.observe(document.querySelector('main')!)
    addEventListener('scroll', schedule, { passive: true })
    addEventListener('resize', measure)
    addEventListener('focusin', schedule)
    const detachPresentation = attachPresentation(reduced)
    update()
    return () => {
      cancelAnimationFrame(frame); resize.disconnect()
      detachPresentation()
      removeEventListener('scroll', schedule); removeEventListener('resize', measure); removeEventListener('focusin', schedule)
      pulls.forEach(({ element }) => { element.style.removeProperty('--pull-y'); element.style.removeProperty('--pull-opacity') })
    }
  }, [reduced, progress, setActive])
}
