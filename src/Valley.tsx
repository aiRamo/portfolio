import { useEffect, useRef, useState } from 'react'
import { createValleyScene } from './createValleyScene'
import { SceneFallback } from './SceneLoader'

export default function Valley({ paused, reduced, onProgress, onReady }: { paused: boolean; reduced: boolean; onProgress: (value: number) => void; onReady: () => void }) {
  const container = useRef<HTMLDivElement>(null)
  const settings = useRef({ paused, reduced })
  settings.current = { paused, reduced }
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const host = container.current
    if (!host) return
    const controller = new AbortController()
    const fail = () => {
      if (controller.signal.aborted) return
      setFailed(true); onReady()
    }
    void createValleyScene(host, settings, () => { setLoaded(true); onReady() }, fail, onProgress, controller.signal)
      .catch(error => {
        if (controller.signal.aborted) return
        console.error('Unable to initialize the landscape', error)
        fail()
      })
    return () => controller.abort()
  }, [onProgress, onReady])

  return <div className={`valley ${loaded ? 'is-loaded' : ''} ${failed ? 'has-fallback' : ''}`} ref={container} role="img" aria-label="A thawing tundra valley viewed from a granite overlook: distant snow-filled mountain bowls and branching gullies between exposed rock ribs, fractured cliffs, and evergreen pines above a fully melted, rippling lake. Sun and moon cross the sky, stars rotate, and the landscape reflects in the water through sunset and sunrise. Scrolling looks up into the clouds, where occasional distant airliners leave thin contrails by day and show blinking navigation lights at night.">
    {failed && <SceneFallback />}
  </div>
}
