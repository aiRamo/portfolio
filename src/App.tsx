import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUpRight, ArrowUp, Sun, Moon, Pause, Play, Minus, Github, Linkedin, Mail, Mountain, Radio, MapPin, Bluetooth, Check, GitBranch, Terminal, Waves, Layers, Code2 } from 'lucide-react'
import { useAtmosphere } from './useAtmosphere'
import { useScrollJourney } from './useScrollJourney'
import { profile, projects, fieldNotes } from './content'
import { SceneLoader, SceneBoundary } from './SceneLoader'

const Valley = lazy(() => import('./Valley'))

function StreamVisual() {
  return <div className="project-art stream-art" aria-label="Conceptual StreamSense map and field journal interface">
    <div className="art-topline"><span><Waves size={16} /> STREAMSENSE</span><span>FIELD NOTES, CONNECTED.</span></div>
    <svg className="contour-map" viewBox="0 0 640 560" aria-hidden="true">
      <defs><pattern id="map-grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="currentColor" strokeWidth=".4" /></pattern></defs>
      <rect width="640" height="560" fill="url(#map-grid)" />
      {Array.from({ length: 12 }, (_, i) => <path key={i} d={`M${-160 + i * 29} -50 C${190 + i * 15} 110, ${-80 + i * 32} 190, ${130 + i * 20} 310 S${330 + i * 23} 470, ${200 + i * 38} 660`} fill="none" stroke="currentColor" strokeWidth="1" />)}
      <path d="M350 -30 C230 100 455 140 345 250 S210 330 325 420 S380 510 290 590" fill="none" stroke="#9cbfb0" strokeWidth="55" />
      <path d="M350 -30 C230 100 455 140 345 250 S210 330 325 420 S380 510 290 590" fill="none" stroke="#cae1d3" strokeWidth="3" strokeDasharray="4 8" />
    </svg>
    <div className="map-coordinate coord-one">OBSERVATION / 01</div>
    <div className="map-coordinate coord-two">SURFACE VELOCITY</div>
    <div className="phone">
      <div className="phone-island" />
      <div className="phone-header"><span>9:41</span><span>••• ▰</span></div>
      <div className="phone-title">Your field journal <span>+</span></div>
      <div className="phone-map"><svg viewBox="0 0 220 210" aria-hidden="true"><path d="M100 -20C20 80 200 60 140 140S80 170 120 240" stroke="#aec7b5" strokeWidth="36" fill="none" /><path d="M-10 50 250 150M50-10 200 250M-20 160 240 70" stroke="#ebece1" strokeWidth="7" fill="none" /></svg><span className="map-marker"><MapPin size={21} fill="currentColor" /></span><span className="map-mini-marker" /></div>
      <div className="phone-sheet"><div className="sheet-handle" /><span className="mini-label">COLLECTION SITE</span><strong>Along the river</strong><p><MapPin size={12} /> Notes. Readings. A little context.</p><div className="phone-metric"><Waves size={21} /><span>Surface velocity<small>Connected to your radar</small></span><Bluetooth size={15} /></div><div className="phone-action">Start a recording <ArrowUpRight size={14} /></div></div>
    </div>
    <span className="floating-note"><span className="status-dot" /> From the field, to the map.</span>
    <span className="art-caption">CONCEPTUAL INTERFACE STUDY</span>
  </div>
}

function SportVisual() {
  return <div className="project-art sport-art" aria-label="Conceptual sports radar interface with illustrative speed telemetry">
    <div className="art-topline"><span><Radio size={16} /> STALKER SPORT</span><span>EVERY MOMENT COUNTS.</span></div>
    <div className="radar-orbit orbit-one" /><div className="radar-orbit orbit-two" /><div className="radar-orbit orbit-three" />
    <div className="telemetry-card"><div className="telemetry-header"><span><span className="status-dot" /> RADAR CONNECTED</span><Bluetooth size={17} /></div><span className="speed-label">THE NEXT GREAT PITCH</span><div className="speed-reading">92<span>.4</span><small>MPH</small></div><div className="telemetry-chart"><svg viewBox="0 0 330 65" aria-hidden="true"><path d="M0 56H330M0 30H330" stroke="#415846" strokeWidth=".5" /><path d="M0 53 40 52 49 45 58 51 90 49 113 17 128 39 148 34 166 9 187 32 201 27 215 7 235 24 250 14 263 28 277 16 295 32 330 29" fill="none" stroke="#d0e6a5" strokeWidth="2" /></svg></div><div className="telemetry-footer"><span>LIVE TELEMETRY</span><span>ILLUSTRATIVE DATA</span></div></div>
    <div className="video-chip"><span className="record-dot" /><span>Capture the moment.</span><span>00:12</span></div>
    <span className="art-caption">CONCEPTUAL INTERFACE STUDY</span>
  </div>
}

function PipelineVisual() {
  return <div className="project-art pipeline-art" aria-label="RedmineX deployment workflow from commit through build and production">
    <div className="art-topline"><span><GitBranch size={16} /> REDMINEX</span><span>A BETTER WAY TO SHIP.</span></div>
    <div className="pipeline-window"><div className="window-chrome"><span className="window-dots">● ● ●</span><span>release / production</span><Terminal size={13} /></div><div className="pipeline-content"><span className="pipeline-label">FROM COMMIT TO CONFIDENCE</span>{['Commit & review', 'Build & validate', 'Deploy to production'].map((label, i) => <div className="pipeline-step" key={label}><span className="step-check"><Check size={16} /></span><span>{label}</span><small>0{i + 1}</small></div>)}<div className="terminal-line"><span>❯</span> more time for the next idea<span className="terminal-caret" /></div></div></div>
    <div className="release-metric"><span>A FULL DAY <ArrowUpRight size={21} /></span><strong>&lt; 1 <em>hour.</em></strong><p>The release process, rethought.</p></div>
    <span className="art-caption">ILLUSTRATED WORKFLOW · VERIFIED RELEASE IMPROVEMENT</span>
  </div>
}

function Project({ project, index }: { project: typeof projects[number]; index: number }) {
  const [open, setOpen] = useState(false)
  const visuals = [<StreamVisual />, <SportVisual />, <PipelineVisual />]
  return <article className={`project reveal project-${project.id}`} id={project.id}>
    <div className="project-visual">{visuals[index]}</div>
    <div className="project-copy"><span className="eyebrow"><span className="section-index">{project.number}</span>{project.category}</span><h3>{project.title.split('\n').map((line, i) => <span key={line}>{i === 1 ? <em>{line}</em> : line}</span>)}</h3><div className="project-name">{project.name}<span className={`project-status ${project.status === 'In development' ? 'in-development' : ''}`}><span />{project.status}</span></div><p>{project.description}</p><ul className="tags" aria-label="Technologies">{project.tags.map(tag => <li key={tag}>{tag}</li>)}</ul><button className="text-link" aria-expanded={open} aria-controls={`details-${project.id}`} onClick={() => setOpen(!open)}>{open ? 'Close the field notes' : 'A closer look'}{open ? <Minus size={17} /> : <ArrowUpRight size={17} />}</button></div>
    <div className="project-details" id={`details-${project.id}`} hidden={!open}><div className="detail-role"><span className="eyebrow">MY ROLE</span><strong>{project.role}</strong></div>{project.details.map(([title, text]) => <div key={title}><h4>{title}</h4><p>{text}</p></div>)}</div>
  </article>
}

export default function App() {
  const { dark, toggle, transitioning, reduced, paused, setPaused } = useAtmosphere()
  const [active, setActive] = useState('home')
  const [sceneProgress, setSceneProgress] = useState(3)
  const [sceneReady, setSceneReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [contentVisible, setContentVisible] = useState(false)
  const ready = useCallback(() => setSceneReady(true), [])
  const enter = useCallback(() => setLoading(false), [])
  const progress = useRef<HTMLDivElement>(null)

  useScrollJourney(reduced, progress, setActive)
  useEffect(() => {
    if (loading) return
    // Let the unobstructed landscape register before bringing in the interface.
    const reveal = setTimeout(() => setContentVisible(true), reduced ? 100 : 180)
    return () => clearTimeout(reveal)
  }, [loading, reduced])

  return <>
    {loading && <SceneLoader progress={sceneProgress} ready={sceneReady} reduced={reduced} onComplete={enter} />}
    <div className="scene-backdrop" aria-hidden={loading || undefined}><SceneBoundary onError={ready}><Suspense fallback={null}><Valley paused={paused} reduced={reduced} onProgress={setSceneProgress} onReady={ready} /></Suspense></SceneBoundary></div>
    <div className="portfolio-content" data-reveal={loading ? 'loading' : contentVisible ? 'content' : 'scene'} inert={!contentVisible} aria-hidden={!contentVisible || undefined}>
    <a className="skip-link" href="#work">Skip to selected work</a>
    <div className="reading-progress" ref={progress} aria-hidden="true" />
    <div className="light-wash" aria-hidden="true" />
    <header className="site-header"><a href="#home" className="wordmark" aria-label="Adrian Ramos, back to top"><span className="brand-icon"><Mountain size={22} strokeWidth={1.5} /></span><span>adrian ramos<span className="wordmark-dot">.</span></span></a><nav aria-label="Main navigation"><a href="#work" aria-current={active === 'work' ? 'location' : undefined}>Work</a><a href="#about" aria-current={active === 'about' ? 'location' : undefined}>About</a><a href="#contact" aria-current={active === 'contact' ? 'location' : undefined}>Contact <ArrowUpRight size={13} /></a></nav><button className="theme-toggle" onClick={toggle} aria-label={`Switch to ${dark ? 'day' : 'night'} mode`} aria-pressed={dark} title={`Bring on the ${dark ? 'sunrise' : 'moonlight'}`}><Sun size={16} /><span className="toggle-track"><span className="toggle-thumb" /></span><Moon size={15} /></button></header>

    <main>
      <section className="hero" id="home" data-section>
        <div className="hero-stage">
        <div className="hero-copy"><div className="eyebrow hero-eyebrow"><span className="status-dot" /> SOFTWARE ENGINEER · PRODUCT BUILDER</div><h1>Built with<br /><em>curiosity.</em></h1><p>I’m Adrian. I connect thoughtful software<br className="desktop-break" /> to the world beyond the screen.</p><a className="primary-link" href="#work">Explore my work <span><ArrowDown size={18} /></span></a><div className="hero-footnote"><span /> A little perspective changes everything.</div></div>
        <div className="landscape-note"><span className="tiny-cross">+</span><span>STILL WATER.<br />A WIDER PERSPECTIVE.</span></div>
        <div className="hero-bottom"><div className="scene-state"><span className="status-dot" /><span aria-live="polite">{transitioning ? dark ? 'Chasing the last light' : 'Here comes the sun' : dark ? 'A moment in the moonlight' : 'Somewhere in the daylight'}</span></div><div className="scene-controls"><span>{dark ? 'NIGHTFALL' : 'DAYLIGHT'} <span className="scene-separator">/</span> {paused ? 'STILL SCENE' : 'LIVE SCENE'}</span><button onClick={() => setPaused(!paused)} aria-label={paused ? 'Resume landscape animation' : 'Pause landscape animation'} aria-pressed={paused}>{paused ? <Play size={13} /> : <Pause size={13} />}</button></div><a href="#intro" className="scroll-cue">SCROLL TO WANDER <ArrowDown size={14} /></a></div>
        </div>
      </section>

      <div className="sky-content">

      <section className="intro section-shell reveal" id="intro"><div className="section-kicker"><span className="tiny-cross">+</span> A FEW WORDS BEFORE THE TRAIL</div><div className="intro-body"><h2>Good software doesn’t<br />stop at <em>the screen.</em></h2><p>It’s a sensor in the field. A coach catching the next pitch. A team getting a day back. I build the apps, connections, and systems that make those moments work.</p></div><div className="intro-aside"><span>FROM THE FIRST IDEA</span><ArrowDown size={27} strokeWidth={1} /><span>TO THE REAL WORLD</span></div></section>

      <section className="work section-shell" id="work" data-section><div className="section-heading reveal"><div><span className="eyebrow">01 / SELECTED WORK</span><h2>A few things<br /><em>I’ve put into the world.</em></h2></div><p>From mobile experiences to the<br />systems working quietly behind them.</p></div>{projects.map((project, index) => <Project key={project.id} project={project} index={index} />)}</section>

      <div className="marquee" aria-label="Mobile. Cloud. Connected devices. Thoughtful software."><div className={paused || reduced ? 'marquee-track paused' : 'marquee-track'}>{[0, 1].map(i => <span key={i} aria-hidden={i === 1}>THOUGHTFUL SOFTWARE <span>✳</span> REAL-WORLD CONNECTIONS <span>✳</span> ALWAYS CURIOUS <span>✳</span> </span>)}</div></div>

      <section className="about section-shell" id="about" data-section><div className="about-heading reveal"><span className="eyebrow">02 / THE PERSON BEHIND THE CODE</span><h2>Comfortable<br />connecting <em>the dots.</em></h2></div><div className="about-grid"><div className="about-card reveal"><span className="about-monogram">ar<span>.</span></span><div><span className="status-dot" /> ENGINEER. BUILDER. DOT-CONNECTOR.</div><p>Somewhere between<br />“what if” and <em>“it works.”</em></p><span className="about-card-footer">ADRIAN RAMOS <Mountain size={26} strokeWidth={1} /></span></div><div className="about-copy reveal"><p className="large-copy">I like the work that lives<br />between disciplines.</p><p>At Stalker Radar, I’m an Application Developer leading a two-person mobile team. My work stretches from Flutter interfaces to BLE protocols, backend services, and getting the release out the door.</p><p>I take products from the first technical conversation through production and maintenance. Along the way, I review code, mentor engineers in agentic development, and work with firmware, QA, product, and engineering teams to make the pieces fit.</p><div className="about-facts"><div><span className="mini-label">CURRENTLY</span><strong>Application Developer</strong><span>Stalker Radar · Dec 2024–present</span></div><div><span className="mini-label">FOUNDATIONS</span><strong>B.S. Software Engineering</strong><span>University of Texas at Arlington</span></div></div><div className="social-links"><a href={profile.github} target="_blank" rel="noreferrer"><Github size={16} /> GitHub <ArrowUpRight size={14} /></a><a href={profile.linkedin} target="_blank" rel="noreferrer"><Linkedin size={16} /> LinkedIn <ArrowUpRight size={14} /></a></div></div></div><div className="stats reveal"><div><strong>3<span>apps</span></strong><p>Native apps consolidated into Flutter</p></div><div><strong>2<span>people</span></strong><p>A small mobile team with broad ownership</p></div><div><strong>3–4<span>releases</span></strong><p>Major releases per quarter, as a team</p></div></div></section>

      <section className="notes section-shell" id="notes"><div className="section-heading reveal"><div><span className="eyebrow">03 / A LITTLE FURTHER DOWN THE TRAIL</span><h2>The work<br /><em>between the highlights.</em></h2></div><p>Some of the most interesting problems<br />don’t fit neatly on a project card.</p></div><div className="notes-grid">{fieldNotes.map((note, index) => <article className="note reveal" key={note.number}><div className="note-top"><span>{note.number} / FIELD NOTE</span>{index === 0 ? <Bluetooth size={21} /> : index === 1 ? <Radio size={21} /> : index === 2 ? <Code2 size={21} /> : <Layers size={21} />}</div><h3>{note.title}</h3><p>{note.text}</p><span className="note-tags">{note.tags}</span></article>)}</div><div className="toolkit reveal"><span className="eyebrow">TOOLS I REACH FOR</span><p>Flutter <span>/</span> Dart <span>/</span> Swift <span>/</span> Kotlin <span>/</span> Python <span>/</span> TypeScript <span>/</span> FastAPI <span>/</span> Azure <span>/</span> MCP</p></div></section>

      <section className="contact section-shell" id="contact" data-section><div className="contact-top reveal"><span className="eyebrow"><span className="status-dot" /> THE NEXT GOOD THING STARTS WITH A CONVERSATION</span><h2>Have something<br /><em>in mind?</em><a href={`mailto:${profile.email}`} aria-label="Email Adrian Ramos"><ArrowUpRight strokeWidth={1} /></a></h2><a className="email-link" href={`mailto:${profile.email}`}>{profile.email} <ArrowUpRight size={21} /></a></div><footer><a href="#home" className="wordmark">adrian ramos<span className="wordmark-dot">.</span></a><span>Built with curiosity. And a little perspective.</span><div><a href={profile.github} target="_blank" rel="noreferrer" aria-label="Adrian on GitHub"><Github size={18} /></a><a href={profile.linkedin} target="_blank" rel="noreferrer" aria-label="Adrian on LinkedIn"><Linkedin size={18} /></a><a href={`mailto:${profile.email}`} aria-label="Email Adrian"><Mail size={18} /></a></div></footer><a className="back-to-top" href="#home">BACK TO THE MOUNTAINS <ArrowUp size={14} /></a></section>
      </div>
    </main>
    <div className="page-coordinate" aria-hidden="true"><span>{active === 'home' ? '00' : active === 'work' ? '01' : active === 'about' ? '02' : '04'}</span><span className="coordinate-line" /><span>04</span></div>
    <button className="sky-pause" onClick={() => setPaused(!paused)} aria-label={paused ? 'Resume sky animation' : 'Pause sky animation'} aria-pressed={paused}>{paused ? <Play size={14} /> : <Pause size={14} />}<span>{paused ? 'RESUME SKY' : 'PAUSE SKY'}</span></button>
    </div>
  </>
}
