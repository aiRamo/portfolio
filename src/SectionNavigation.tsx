import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { ArrowDownRight, ChevronDown, Mountain } from 'lucide-react'

const sections = [['work', 'Work'], ['about', 'About'], ['contact', 'Contact']] as const

export function SectionNavigation({ active }: { active: string }) {
  const [open, setOpen] = useState(false)
  const container = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const navigation = useRef<HTMLElement>(null)
  const pendingFocus = useRef<'first' | 'last' | null>(null)

  useEffect(() => {
    if (!open) return
    if (pendingFocus.current) {
      const links = navigation.current?.querySelectorAll('a')
      const index = pendingFocus.current === 'last' ? (links?.length ?? 1) - 1 : 0
      links?.[index]?.focus()
      pendingFocus.current = null
    }
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !container.current?.contains(event.target)) setOpen(false)
    }
    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      setOpen(false)
      trigger.current?.focus()
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', escape)
    }
  }, [open])

  const openWithKeyboard = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    const last = event.key === 'ArrowUp'
    if (open) {
      const links = navigation.current?.querySelectorAll('a')
      links?.[last ? links.length - 1 : 0]?.focus()
    } else {
      pendingFocus.current = last ? 'last' : 'first'
      setOpen(true)
    }
  }

  return <div className="brand-navigation" ref={container} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
  }}>
    <button ref={trigger} className="wordmark brand-trigger" aria-expanded={open} aria-controls="section-navigation"
      aria-label="Adrian Ramos, section navigation" onClick={() => setOpen(value => !value)} onKeyDown={openWithKeyboard}>
      <span className="brand-icon"><Mountain size={22} strokeWidth={1.5} aria-hidden="true" /></span>
      <span>adrian ramos<span className="wordmark-dot">.</span></span>
      <ChevronDown size={15} className="navigation-chevron" aria-hidden="true" />
    </button>
    <nav id="section-navigation" className="section-navigation" aria-label="Main navigation" ref={navigation} hidden={!open}>
      {sections.map(([id, label], index) => <a key={id} href={`#${id}`} aria-current={active === id ? 'location' : undefined} onClick={() => setOpen(false)}>
        <span className="navigation-index" aria-hidden="true">0{index + 1}</span>
        <span>{label}</span><ArrowDownRight size={17} aria-hidden="true" />
      </a>)}
    </nav>
  </div>
}
