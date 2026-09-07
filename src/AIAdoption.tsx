import { useEffect, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'
import { adoptionAt, adoptionDuration } from './adoptionMotion.mjs'
import './ai-adoption.css'

const recipients = [
  { x: 105, label: 'Engineers', detail: 'Agentic development', benefit: 'I taught agentic coding, testing, and documentation.', path: 'M272 139 C245 190 105 186 105 262' },
  { x: 300, label: 'Partner teams', detail: 'Shared practices', benefit: 'I helped adapt agentic workflows to their own work.', path: 'M300 148 L300 262' },
  { x: 495, label: 'Project teams', detail: 'Connected planning', benefit: 'I connected AI agents to the company’s core project management platform.', path: 'M328 139 C355 190 495 186 495 262' },
]
function nodeColor(progress: number) {
  return `rgb(${Math.round(255 - 179 * progress)}, ${Math.round(255 - 29 * progress)}, ${Math.round(255 - 109 * progress)})`
}
function Person({ x, y, radius, progress }: { x: number; y: number; radius: number; progress: number }) {
  return <g transform={`translate(${x} ${y})`}>
    <circle r={radius + 7} fill="none" stroke="#4ce292" strokeOpacity={progress * .2} />
    <circle r={radius} fill={nodeColor(progress)} />
    <g transform={`scale(${radius / 44})`} fill="#142321">
      <circle cy="-13" r="12" />
      <path d="M-28 27 C-27 -5 27 -5 28 27 Q0 35 -28 27Z" />
    </g>
  </g>
}

export function AIAdoption({ enabled }: { enabled: boolean }) {
  const figure = useRef<HTMLElement>(null)
  const elapsed = useRef(0)
  const [time, setTime] = useState(0)
  const [inView, setInView] = useState(false)
  const [paused, setPaused] = useState(false)
  const [visible, setVisible] = useState(!document.hidden)
  const [visited, setVisited] = useState(false)
  const motion = adoptionAt(time)

  useEffect(() => {
    const visit = () => {
      const root = document.documentElement
      const bounds = figure.current?.getBoundingClientRect()
      // Adjacent mobile sections can share the viewport. Keep this visit alive
      // until the card fully leaves, so its completed nodes never blink white on exit.
      const active = root.dataset.navigationMode === 'free'
        ? !!bounds && bounds.bottom > 0 && bounds.top < innerHeight
        : root.dataset.presentationSection === 'ai-adoption'
      setVisited(active)
      if (!active) { elapsed.current = 0; setTime(0); setPaused(false) }
    }
    document.addEventListener('presentationchange', visit)
    visit()
    const observer = new IntersectionObserver(([entry]) => {
      setInView(entry.isIntersecting && entry.intersectionRatio >= .4)
      visit()
    }, { threshold: [0, .4] })
    if (figure.current) observer.observe(figure.current)
    const visibility = () => setVisible(!document.hidden)
    document.addEventListener('visibilitychange', visibility)
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', visibility); document.removeEventListener('presentationchange', visit) }
  }, [])
  useEffect(() => {
    if (!enabled || !visited || !inView || paused || !visible || motion.complete) return
    let frame = 0, previous = performance.now()
    const tick = (now: number) => {
      elapsed.current = Math.min(adoptionDuration, elapsed.current + Math.min((now - previous) / 1000, .064))
      previous = now
      setTime(elapsed.current)
      if (elapsed.current < adoptionDuration) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [enabled, visited, inView, paused, visible, motion.complete])

  const stage = motion.branches.filter(branch => branch.node === 1).length

  return <section className="ai-adoption section-shell" id="ai-adoption" data-slide="AI adoption" aria-labelledby="ai-adoption-title">
    <div className="ai-layout">
      <div className="ai-copy">
        <div className="ai-heading reveal"><span className="eyebrow">BEYOND THE CODE / AI ENABLEMENT</span><h2 id="ai-adoption-title">Your next agentic engineer.<br /><em>Your teamâ€™s next advantage.</em></h2></div>
        <div className="ai-story reveal">
        <p className="ai-lead">I helped pioneer AI-assisted engineering at Stalker Radar and made it a practice other teams could use.</p>
        <ol className="ai-story-steps">
          <li><span>01</span><div><h3>Start with the work.</h3><p>I brought tools like Claude Code and Codex into implementation, testing, documentation, and release workflows.</p></div></li>
          <li><span>02</span><div><h3>Bring people along.</h3><p>I mentored engineers in agentic development and helped other teams adapt those workflows to their own work.</p></div></li>
          <li><span>03</span><div><h3>Connect AI to company-wide work.</h3><p>I built custom MCP tools and server-side integrations that connect AI agents to the primary project management platform used across the entire company. Agents can read, create, and update project content directly in the system teams already rely on.</p></div></li>
        </ol>
        <div className="ai-tool-note"><span className="mini-label">MCP / MODEL CONTEXT PROTOCOL</span><p>The connection between AI agents and the systems our teams already work in.</p></div>
        </div>
      </div>
      <figure className="ai-diagram reveal" ref={figure} data-stage={stage}>
        <div className="ai-diagram-heading"><span className="mini-label">ONE PRACTICE. SHARED POSSIBILITY.</span><span className="ai-sequence-number" aria-hidden="true">0{stage} / 03</span></div>
        <svg viewBox="0 0 600 360" role="img" aria-labelledby="adoption-graph-title adoption-graph-desc">
          <title id="adoption-graph-title">Helping AI adoption spread across teams</title>
          <desc id="adoption-graph-desc">Adrian connects to engineers, partner teams, and project teams. All people begin white. Adrian turns green, then each connection fills green from top to bottom before its recipient turns green, one at a time.</desc>
          {recipients.map((recipient, index) => <g key={recipient.label}>
            <path d={recipient.path} className="ai-connection-base" />
            <path d={recipient.path} className="ai-connection-fill" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - motion.branches[index].path} />
            <path d={`M${recipient.x - 5} 256 L${recipient.x} 263 L${recipient.x + 5} 256`} fill="none" stroke={nodeColor(motion.branches[index].path >= .999 ? 1 : 0)} strokeWidth="2" />
            <Person x={recipient.x} y={310} radius={36} progress={motion.branches[index].node} />
          </g>)}
          <text x="300" y="27" className="ai-node-label">Adrian</text>
          <Person x={300} y={94} radius={44} progress={motion.source} />
        </svg>
        <div className="ai-recipient-labels" aria-hidden="true">{recipients.map(recipient => <div key={recipient.label}><strong>{recipient.label}</strong><span>{recipient.detail}</span></div>)}</div>
        <figcaption className="ai-caption"><ul className="ai-caption-list">{recipients.map((recipient, index) => {
          // Text and its recipient share the exact same eased progress, including pause/resume.
          const progress = motion.branches[index].node
          return <li key={recipient.label} data-visible={progress > 0} aria-hidden={progress === 0} style={{ opacity: progress, transform: `translateY(${(1 - progress) * 5}px)` }}>
            <span className="ai-caption-dot" /><span><strong>{recipient.label}</strong>: {recipient.benefit}</span>
          </li>
        })}</ul></figcaption>
        <div className="ai-diagram-footer"><span>ADOPTION, ILLUSTRATED</span><div>
          {!motion.complete && <button onClick={() => setPaused(value => !value)} aria-label={paused ? 'Resume adoption animation' : 'Pause adoption animation'}>{paused ? <Play size={14} /> : <Pause size={14} />}{paused ? 'Resume' : 'Pause'}</button>}
        </div></div>
      </figure>
    </div>
  </section>
}
