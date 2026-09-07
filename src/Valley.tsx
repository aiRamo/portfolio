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

  return <div className={`valley ${loaded ? 'is-loaded' : ''} ${failed ? 'has-fallback' : ''}`} ref={container} role="img" aria-label="A thawing tundra valley viewed from a granite overlook: snowy mountain bowls, fractured cliffs, and evergreen pines surround a rippling lake with gently sloping shores. Willow shrubs, ivory and blush flowering bushes, low mauve heather, cattails and smaller tufts of tall grass grow in loose groups along the shoreline. Eight deer gather among juvenile pines on the right bank, while mature pines frame the lake and a small log cabin sits along the far shore. Bird flocks fly right to left above the mountains. A campfire gives off drifting smoke, and warm cabin windows and firelight glow and reflect in the lake at night. Sun and moon cross the sky and stars rotate through sunset and sunrise. Scrolling looks up into clouds, where distant airliners leave thin contrails by day and show blinking navigation lights at night.">
    {failed && <SceneFallback />}
  </div>
}
