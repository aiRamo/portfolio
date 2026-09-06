import { Component, useEffect, useState, type ReactNode } from 'react'
import { Mountain } from 'lucide-react'

export function SceneLoader({ progress, ready, reduced, onComplete }: {
  progress: number; ready: boolean; reduced: boolean; onComplete: () => void
}) {
  const [leaving, setLeaving] = useState(false)
  useEffect(() => {
    if (!ready) return
    const reveal = setTimeout(() => setLeaving(true), reduced ? 120 : 240)
    // Normally completion comes from the actual opacity transition, not a timer
    // that can run before the browser has painted the final transparent frame.
    const complete = setTimeout(onComplete, 2400)
    return () => { clearTimeout(reveal); clearTimeout(complete) }
  }, [ready, reduced, onComplete])

  const value = ready ? 100 : Math.round(progress)
  return <div className={`scene-loader${leaving ? ' is-leaving' : ''}`} onTransitionEnd={event => {
    if (leaving && event.target === event.currentTarget && event.propertyName === 'opacity') onComplete()
  }}>
    <div className="scene-loader-center">
      <div className="scene-loader-brand"><Mountain strokeWidth={1.3} aria-hidden="true" /><span>adrian ramos<span className="scene-loader-dot">.</span></span></div>
      <div className="scene-loader-track" role="progressbar" aria-label="Preparing the landscape" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
        <span style={{ transform: `scaleX(${value / 100})` }} />
      </div>
      <div className="scene-loader-caption"><span role="status">{ready ? 'A little perspective.' : 'Preparing the view'}</span><span aria-hidden="true">{String(value).padStart(2, '0')}%</span></div>
    </div>
  </div>
}

export function SceneFallback() {
  return <div className="valley-fallback"><span className="eyebrow">A MOMENT OF STILLNESS</span><p>Good things begin<br /><em>with curiosity.</em></p><span>The landscape is unavailable. There’s plenty to explore below.</span></div>
}

/** A failed scene download must never leave the portfolio behind a loading screen. */
export class SceneBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { this.props.onError() }
  render() { return this.state.failed ? <div className="valley has-fallback"><SceneFallback /></div> : this.props.children }
}
