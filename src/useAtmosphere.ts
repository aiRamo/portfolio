import { useEffect, useRef, useState } from 'react'
import { atmosphere, lightingAt, mix, phaseForMode, HALF_DAY_MS, nextPhase, makeSkyTimeline } from './environment.mjs'
import { applyBrowserChrome } from './browserChrome.mjs'

export type SceneMode = 'light' | 'dark' | 'sunset'

type RGB = [number, number, number]
const palette: Record<string, [RGB, RGB, RGB]> = {
  page: [[160, 199, 225], [9, 18, 35], [102, 68, 140]],
  ink: [[18, 43, 63], [224, 237, 253], [255, 236, 251]],
  muted: [[36, 66, 86], [175, 196, 219], [231, 215, 243]],
  panel: [[212, 231, 241], [23, 39, 61], [60, 40, 89]],
  accent: [[26, 65, 86], [206, 225, 245], [255, 214, 165]],
  line: [[113, 155, 179], [65, 87, 115], [173, 127, 129]],
  'hero-ink': [[255, 244, 200], [210, 229, 253], [255, 224, 245]],
  'art-warmth': [[255, 218, 129], [99, 144, 192], [241, 121, 74]],
}

function paint(phase: number) {
  const { night, twilight } = lightingAt(phase)
  atmosphere.phase = phase
  atmosphere.night = night
  atmosphere.twilight = twilight
  const root = document.documentElement
  for (const [name, [day, dark, dusk]] of Object.entries(palette)) {
    const color = day.map((v, i) => Math.round(mix(mix(v, dark[i], night), dusk[i], twilight * 0.8)))
    root.style.setProperty(`--${name}`, color.join(' '))
  }
  root.style.setProperty('--night', String(night))
  root.style.setProperty('--twilight', String(twilight))
  root.dataset.skyPhase = String(phase)
  root.dataset.skyStage = twilight > .7 ? Math.cos(phase) < 0 ? 'sunset' : 'sunrise' : night > .95 ? 'night' : night < .05 ? 'day' : 'blue-hour'
}

export function useAtmosphere() {
  const [mode, setMode] = useState<SceneMode>(() => {
    const saved = document.documentElement.dataset.theme
    return saved === 'sunset' || saved === 'dark' ? saved : 'light'
  })
  const [transitioning, setTransitioning] = useState(false)
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [paused, setPaused] = useState(false)
  const frame = useRef(0)
  const ready = useRef(false)

  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    const changed = () => setReduced(media.matches)
    media.addEventListener('change', changed)
    return () => media.removeEventListener('change', changed)
  }, [])

  useEffect(() => {
    cancelAnimationFrame(frame.current)
    const root = document.documentElement
    applyBrowserChrome(mode)
    try { localStorage.setItem('adrian-theme', mode) } catch { /* Storage is optional. */ }
    const from = atmosphere.phase
    const to = ready.current ? nextPhase(from, mode) : phaseForMode(mode)
    if (!ready.current || Math.abs(from - to) < 1e-7) {
      paint(to)
      root.dataset.theme = mode
      root.dataset.transitioning = 'false'
      ready.current = true
      atmosphere.moving = false
      setTransitioning(false)
      return
    }
    const start = performance.now()
    const duration = Math.max(1500, (to - from) / Math.PI * HALF_DAY_MS)
    const sample = makeSkyTimeline(from, to)
    setTransitioning(true)
    root.dataset.transitioning = 'true'
    atmosphere.moving = true
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      paint(sample(progress))
      if (progress < 1) frame.current = requestAnimationFrame(tick)
      else {
        setTransitioning(false)
        atmosphere.moving = false
        root.dataset.theme = mode
        root.dataset.transitioning = 'false'
      }
    }
    frame.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame.current)
  }, [mode])

  return { mode, setMode, transitioning, reduced, paused, setPaused }
}
