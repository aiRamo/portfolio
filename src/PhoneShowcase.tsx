import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { phoneApps } from './phoneApps'
import type { PhoneController, PhoneSettings } from './createPhoneScene'
import './phone-showcase.css'

export function PhoneShowcase({ reduced }: { reduced: boolean }) {
  const [selected, setSelected] = useState<number | null>(null)
  const [ready, setReady] = useState(false)
  const [phase, setPhase] = useState('loading')
  const host = useRef<HTMLDivElement>(null)
  const controller = useRef<PhoneController | null>(null)
  const settings = useRef<PhoneSettings>({ selected: -1, request: 0, active: false, reduced })
  settings.current.reduced = reduced
  const app = selected === null ? null : phoneApps[selected]
  const select = (index: number) => {
    setSelected(index)
    settings.current.selected = index; settings.current.request++
    controller.current?.update()
  }
  useEffect(() => {
    const visit = () => {
      const active = document.documentElement.dataset.presentationSection === 'mobile-apps'
      settings.current.active = active
      controller.current?.update()
    }
    document.addEventListener('presentationchange', visit); visit()
    return () => document.removeEventListener('presentationchange', visit)
  }, [])
  useEffect(() => {
    if (!host.current) return
    const abort = new AbortController(), element = host.current
    void import('./createPhoneScene').then(module => module.createPhoneScene(element, settings, abort.signal, value => {
      if (!abort.signal.aborted) setPhase(value)
    }, select)).then(scene => {
      if (!scene) return
      if (abort.signal.aborted) { scene.dispose(); return }
      controller.current = scene; setReady(true)
    }).catch(error => {
      if (abort.signal.aborted) return
      console.error('Unable to prepare the phone showcase', error); setPhase('unavailable')
    })
    return () => { abort.abort(); controller.current?.dispose(); controller.current = null }
  }, [])
  const keyboard = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const direction = ['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : ['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 0
    if (!direction && !['Home', 'End'].includes(event.key)) return
    event.preventDefault(); event.stopPropagation()
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (index + direction + 3) % 3
    select(next); document.getElementById(`phone-tab-${phoneApps[next].id}`)?.focus()
  }
  const status = phase === 'app' ? app?.name : phase === 'closing' ? 'Back to the home screen' : phase === 'home' ? 'A familiar starting point' : phase === 'tap' ? `Selecting ${app?.short}` : phase === 'opening' ? `Opening ${app?.short}` : phase === 'unavailable' ? 'App screenshot' : 'Preparing the phone'

  return <section className="phone-showcase section-shell" id="mobile-apps" data-slide="Some of my projects" aria-labelledby="phone-showcase-title">
    <div className="phone-showcase-heading">
      <span className="eyebrow">SELECTED WORK / CONNECTED APPS</span>
      <h2 id="phone-showcase-title">Some of my <em>projects.</em></h2>
      <div className="phone-app-tabs" role="tablist" aria-label="Explore mobile apps" aria-orientation="horizontal">
        {phoneApps.map((item, index) => <button key={item.id} id={`phone-tab-${item.id}`} role="tab" aria-label={item.name} aria-selected={index === selected} aria-controls="phone-app-panel" tabIndex={index === (selected ?? 0) ? 0 : -1} onClick={() => select(index)} onKeyDown={event => keyboard(event, index)}>
          <img src={item.icon} alt="" width="28" height="28" /><span>{item.short}</span>
        </button>)}
      </div>
    </div>
    <div className="phone-app-detail" id="phone-app-panel" role={app ? 'tabpanel' : undefined} aria-labelledby={app ? `phone-tab-${app.id}` : undefined}>
      {app ? <div className="phone-app-facts" key={app.id}>
        <span className="mini-label">{app.category}</span>
        <h3>{app.name}</h3>
        <p className="phone-app-description">{app.description}</p>
        <ul className="phone-capabilities">
          {app.capabilities.map(point => <li key={point.title}>
            <div className="phone-capability-full"><strong>{point.title}</strong><span>{point.detail}</span></div>
            <span className="phone-capability-compact">{point.compact}</span>
          </li>)}
        </ul>
        <a href={app.screenshot} target="_blank" rel="noreferrer">Open screenshot <ArrowUpRight size={14} /></a>
      </div> : <p className="phone-app-description">Choose an app above or tap an icon on the phone to explore.</p>}
    </div>
    <div className="phone-showcase-visual">
      <div className="phone-studio" ref={host} role="group" aria-label={`3D smartphone: ${status}. Click a home-screen app icon or select an app tab to open it.`}>
        {!ready && phase !== 'unavailable' && <span className="phone-preparing">Preparing the phone<span /></span>}
        {phase === 'unavailable' && app && <img className="phone-fallback" src={app.screenshot} alt={`${app.name} app screen`} />}
      </div>
    </div>
  </section>
}
