import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUpRight, ArrowUp, Sun, Moon, Pause, Play, Github, Linkedin, Mail, Mountain, Workflow, Sparkles, BookOpen } from 'lucide-react'
import { useAtmosphere } from './useAtmosphere'
import { useScrollJourney } from './useScrollJourney'
import { profile, fieldNotes } from './content'
import { SceneLoader, SceneBoundary } from './SceneLoader'
import { SectionNavigation } from './SectionNavigation'
import { AIAdoption } from './AIAdoption'
import { PhoneShowcase } from './PhoneShowcase'
import { Skills } from './Skills'

const Valley = lazy(() => import('./Valley'))

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
    <header className="site-header"><SectionNavigation active={active} /><button className="theme-toggle" onClick={toggle} aria-label={`Switch to ${dark ? 'day' : 'night'} mode`} aria-pressed={dark} title={`Bring on the ${dark ? 'sunrise' : 'moonlight'}`}><Sun size={16} /><span className="toggle-track"><span className="toggle-thumb" /></span><Moon size={15} /></button></header>

    <main>
      <section className="hero" id="home" data-section data-slide="The overlook">
        <div className="hero-stage">
        <div className="hero-copy"><div className="eyebrow hero-eyebrow"><span className="status-dot" /> SOFTWARE ENGINEER · PRODUCT BUILDER</div><h1>Built with<br /><em>curiosity.</em></h1><p>I’m Adrian. I connect thoughtful software<br className="desktop-break" /> to the world beyond the screen.</p><a className="primary-link" href="#work">Explore my work <span><ArrowDown size={18} /></span></a><div className="hero-footnote"><span /> A little perspective changes everything.</div></div>
        <div className="hero-bottom"><div className="scene-state"><span className="status-dot" /><span aria-live="polite">{transitioning ? dark ? 'Chasing the last light' : 'Here comes the sun' : dark ? 'A moment in the moonlight' : 'Somewhere in the daylight'}</span></div><div className="scene-controls"><span>{dark ? 'NIGHTFALL' : 'DAYLIGHT'} <span className="scene-separator">/</span> {paused ? 'STILL SCENE' : 'LIVE SCENE'}</span><button onClick={() => setPaused(!paused)} aria-label={paused ? 'Resume landscape animation' : 'Pause landscape animation'} aria-pressed={paused}>{paused ? <Play size={13} /> : <Pause size={13} />}</button></div><a href="#intro" className="scroll-cue">NEXT CHAPTER <ArrowDown size={14} /></a></div>
        </div>
      </section>

      <div className="sky-content">

      <section className="intro section-shell reveal" id="intro" data-slide="Introduction">
        <div className="intro-body">
          <h2>Good software doesn’t<br />stop at <em>the screen.</em></h2>
          <p>Software Engineering is more than the code you write. I believe that the success of any software product requires <strong>vision</strong>, <strong>discipline</strong>, and an <strong>attention to detail</strong>.</p>
          <p>As a professional Software Developer, I have embraced the use of agentic tools to enhance the output of lean teams on major products with many moving parts. From full-stack mobile apps, working restaurant portals for real businesses, and internal project management infrastructure, I am <strong>not limited by any specific tech stack.</strong></p>
          <p>If you are looking for an engineer who isn't afraid to tackle new problems and iterate on prototypes quickly, one who takes initiative to identify inefficiencies with internal/stakeholder communication, or just someone who can deliver on time, <strong>I am who you are looking for.</strong></p>
        </div>
      </section>

      <div id="work" data-section>
        <PhoneShowcase reduced={reduced} />
        <AIAdoption enabled={contentVisible} />
      </div>

      <div className="marquee" aria-label="Mobile. Cloud. Connected devices. Thoughtful software."><div className={paused || reduced ? 'marquee-track paused' : 'marquee-track'}>{[0, 1].map(i => <span key={i} aria-hidden={i === 1}>THOUGHTFUL SOFTWARE <span>✳</span> REAL-WORLD CONNECTIONS <span>✳</span> ALWAYS CURIOUS <span>✳</span> </span>)}</div></div>

      <section className="about section-shell" id="about" data-section data-slide="About Adrian"><div className="about-heading"><span className="eyebrow">02 / THE PERSON BEHIND THE CODE</span></div><div className="about-grid"><div className="about-left"><div className="about-heading"><h2>Comfortable<br />connecting <em>the dots.</em></h2></div><div className="about-card"><span className="about-monogram">ar<span>.</span></span><div><span className="status-dot" /> ENGINEER. BUILDER. DOT-CONNECTOR.</div><p>Somewhere between<br />“what if” and <em>“it works.”</em></p><span className="about-card-footer">ADRIAN RAMOS <Mountain size={26} strokeWidth={1} /></span></div></div><div className="about-copy"><p className="large-copy">I like the work that lives<br />between disciplines.</p><p>At Stalker Radar, I’m an Application Developer leading a two-person mobile team. My work stretches from Flutter interfaces to BLE protocols, backend services, and getting the release out the door.</p><p>I take products from the first technical conversation through production and maintenance. Along the way, I review code, mentor engineers in agentic development, and work with firmware, QA, product, and engineering teams to make the pieces fit.</p><div className="about-facts"><div><span className="mini-label">CURRENTLY</span><strong>Application Developer</strong><span>Stalker Radar · Dec 2024–present</span></div><div><span className="mini-label">FOUNDATIONS</span><strong>B.S. Software Engineering</strong><span>University of Texas at Arlington</span></div></div><div className="stats"><div><strong>6<span>apps</span></strong><p>Native apps consolidated into cross-platform apps</p></div><div><strong>2<span>people</span></strong><p>AI workflows maximized output on a lean team</p></div><div><strong>3–4<span>releases</span></strong><p>Major releases per quarter, as a team</p></div></div></div></div></section>

      <section className="notes section-shell" id="notes" data-slide="Field notes"><div className="section-heading reveal"><div><span className="eyebrow">03 / A LITTLE FURTHER DOWN THE TRAIL</span><h2>The work<br /><em>between the highlights.</em></h2></div><p>Some of the most interesting problems<br />don’t fit neatly on a project card.</p></div><div className="notes-grid">{fieldNotes.map((note, index) => <article className="note reveal" key={note.number}><div className="note-top"><span>{note.number} / FIELD NOTE</span>{index === 0 ? <Workflow size={21} /> : index === 1 ? <Sparkles size={21} /> : <BookOpen size={21} />}</div><h3>{note.title}</h3><p>{note.text}</p><span className="note-tags">{note.tags}</span></article>)}</div></section>

      <Skills />

      <section className="contact section-shell" id="contact" data-section data-slide="Get in touch"><div className="contact-top reveal"><span className="eyebrow"><span className="status-dot" /> THE NEXT GOOD THING STARTS WITH A CONVERSATION</span><h2>Have something<br /><em>in mind?</em><a href={`mailto:${profile.email}`} aria-label="Email Adrian Ramos"><ArrowUpRight strokeWidth={1} /></a></h2><a className="email-link" href={`mailto:${profile.email}`}>{profile.email} <ArrowUpRight size={21} /></a></div><footer><a href="#home" className="wordmark">adrian ramos<span className="wordmark-dot">.</span></a><span>Built with curiosity. And a little perspective.</span><div><a href={profile.github} target="_blank" rel="noreferrer" aria-label="Adrian on GitHub"><Github size={18} /></a><a href={profile.linkedin} target="_blank" rel="noreferrer" aria-label="Adrian on LinkedIn"><Linkedin size={18} /></a><a href={`mailto:${profile.email}`} aria-label="Email Adrian"><Mail size={18} /></a></div></footer><a className="back-to-top" href="#home">BACK TO THE MOUNTAINS <ArrowUp size={14} /></a></section>
      </div>
    </main>
    <div className="page-coordinate" aria-hidden="true"><span>{active === 'home' ? '00' : active === 'work' ? '01' : active === 'about' ? '02' : '04'}</span><span className="coordinate-line" /><span>04</span></div>
    <button className="sky-pause" onClick={() => setPaused(!paused)} aria-label={paused ? 'Resume sky animation' : 'Pause sky animation'} aria-pressed={paused}>{paused ? <Play size={14} /> : <Pause size={14} />}<span>{paused ? 'RESUME SKY' : 'PAUSE SKY'}</span></button>
    </div>
  </>
}
