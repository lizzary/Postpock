import { useEffect, useId, useRef } from 'react'
import { platforms, useLibrary } from '../data/library.js'

const drawings = {
  archive: 'M3 7h18v4H3zM5 11v9h14v-9M10 15h4M6 4h12',
  grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  search: 'M15.7 15.7 21 21M18 10.5a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z',
  link: 'm9 15 6-6m-4-2 2-2a4 4 0 0 1 6 6l-2 2m-4 4-2 2a4 4 0 0 1-6-6l2-2',
  key: 'M14.6 3.8a5.7 5.7 0 0 0-5.2 7.9l-5.8 5.8v2.9h3.2l2-2v-1.8h1.8l2.4-2.4a5.7 5.7 0 1 0 1.6-10.4ZM16.9 8.4a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Z',
  sync: 'M20 10a8 8 0 0 0-13-5L4 8m0-5v5h5m-5 6a8 8 0 0 0 13 5l3-3m0 5v-5h-5',
  activity: 'M3 12h4l3-7 4 14 3-7h4',
  settings: 'M9 3h6l.6 3 2 .9 2.5-1.2 2 3.5-2.1 2v2l2.1 2-2 3.5-2.5-1.2-2 .9-.6 2.6H9l-.6-2.6-2-.9L4 18.7l-2-3.5 2.1-2v-2L2 9.2l2-3.5 2.4 1.2 2-.9L9 3Zm6 9a3 3 0 1 0-6 0 3 3 0 0 0 6 0Z',
  export: 'M12 15V3m-4 4 4-4 4 4M5 13H4v7h16v-7h-1',
  plus: 'M12 5v14M5 12h14',
  'arrow-up-right': 'M6 18 18 6M9 6h9v9',
  'arrow-right': 'M3 12h17m-6-6 6 6-6 6',
  'arrow-left': 'M21 12H4m6-6-6 6 6 6',
  'chevron-down': 'm6 9 6 6 6-6',
  'chevron-right': 'm9 6 6 6-6 6',
  'chevron-left': 'm15 6-6 6 6 6',
  x: 'm6 6 12 12M6 18 18 6',
  menu: 'M4 7h16M4 12h16M4 17h16',
  sun: 'M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M19 5l-1.4 1.4M6.4 17.6 5 19M17 12a5 5 0 1 0-10 0 5 5 0 0 0 10 0Z',
  moon: 'M20.5 15.1A8.7 8.7 0 0 1 8.9 3.5a8.8 8.8 0 1 0 11.6 11.6Z',
  folder: 'M3 6h7l2 2h9v11H3z',
  check: 'm4 12 5 5L20 6',
  clock: 'M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  alert: 'M12 8v5m0 3h.01M12 3 2 20h20L12 3Z',
  globe: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM3 12h18m-9-9c5 5 5 13 0 18-5-5-5-13 0-18Z',
  image: 'M3 4h18v16H3zM3 17l6-6 4 4 3-3 5 5M15 8h.01',
  file: 'M6 3h8l4 4v14H6zM14 3v5h4M9 12h6m-6 4h6',
  filter: 'M3 5h18l-7 8v5l-4 2v-7Z',
  layers: 'm12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5',
  edit: 'm14 6 4 4M4 20l1-5L16 4a2.8 2.8 0 0 1 4 4L9 19l-5 1Z',
  list: 'M9 6h12M9 12h12M9 18h12M3 6h.01M3 12h.01M3 18h.01',
  calendar: 'M4 5h16v16H4zM4 10h16M8 3v4m8-4v4m-7 7h.01m6 0h.01m-6 4h.01',
  chevrons: 'm6 7 6 6 6-6m-12 5 6 6 6-6',
  refresh: 'M20 10a8 8 0 0 0-14-4L4 9m0-5v5h5m-5 5a8 8 0 0 0 14 4l2-3m0 5v-5h-5',
  external: 'M13 4h7v7m0-7-9 9m-1-8H4v15h15v-6',
  database: 'M4 6v12c0 2 3.6 3 8 3s8-1 8-3V6M4 12c0 2 3.6 3 8 3s8-1 8-3m0-6c0 2-3.6 3-8 3S4 8 4 6s3.6-3 8-3 8 1 8 3Z',
  minus: 'M5 12h14',
  loader: 'M12 3a9 9 0 1 1-9 9',
  trash: 'M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7',
  'check-circle': 'm8 12 3 3 5-6m5 3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  'log-in': 'M14 4h6v16h-6M4 12h12m-5-5 5 5-5 5',
  sliders: 'M3 6h6m4 0h8M3 12h12m4 0h2M3 18h2m4 0h12M9 3v6m6 0v6M5 15v6',
  download: 'M12 3v13m-5-5 5 5 5-5M4 16v5h16v-5',
  info: 'M12 11v6m0-10h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  bookmark: 'M6 3h12v18l-6-4-6 4z',
  spark: 'M12 2c0 7 3 10 10 10-7 0-10 3-10 10 0-7-3-10-10-10 7 0 10-3 10-10Z',
  music: 'M9 17V6l11-2v11M9 17c0 3-6 4-6 1s6-4 6-1Zm11-2c0 3-6 4-6 1s6-4 6-1Z',
  video: 'M3 5h18v14H3zm7 4v6l5-3Z',
}

export function Icon({ name, size = 20, ...props }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <path d={drawings[name] ?? drawings.file} />
  </svg>
}

const platformMarks = {
  fanbox: 'M4 7 12 3l8 4v10l-8 4-8-4V7Zm0 0 8 4 8-4m-8 4v10M8 9v5',
  fantia: 'M12 20S3.5 15 3.5 9.4A4.4 4.4 0 0 1 12 8a4.4 4.4 0 0 1 8.5 1.4C20.5 15 12 20 12 20Z',
  patreon: 'M5 4v16m15-10a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z',
  x: 'm4 4 12.5 16H20L7.5 4H4Zm0 16 6.5-7.4m3-3.3L20 4',
}

export function PlatformBadge({ platform, showName = true }) {
  const name = platforms.find((entry) => entry.id === platform)?.name ?? platform
  return <span className={`platform-badge platform-${platform}`} title={!showName ? name : undefined}>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={platformMarks[platform]} /></svg>
    {showName && name}
  </span>
}

function isBackdrop(event) {
  if (event.target !== event.currentTarget) return false
  const { left, right, top, bottom } = event.currentTarget.getBoundingClientRect()
  return event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom
}

export function Dialog({ title, eyebrow, description, onClose, children, className = '', wide = false }) {
  const ref = useRef(null)
  const backdropPointer = useRef(null)
  const id = useId()
  const { settings: { language } } = useLibrary()

  useEffect(() => {
    const element = ref.current
    if (!element.open) element.showModal()
    element.querySelector('[data-initial-focus]')?.focus()
    return () => { if (element.open) element.close() }
  }, [])

  function startBackdropPress(event) {
    if (!event.isPrimary || event.button !== 0) return
    backdropPointer.current = isBackdrop(event) ? event.pointerId : null
  }

  function cancelBackdropPress(event) {
    if (backdropPointer.current === event.pointerId) backdropPointer.current = null
  }

  function finishBackdropPress(event) {
    if (backdropPointer.current !== event.pointerId) return
    cancelBackdropPress(event)
    if (event.button === 0 && isBackdrop(event)) onClose()
  }

  return <dialog ref={ref} className={`dialog ${wide ? 'dialog-wide' : ''} ${className}`} aria-labelledby={id}
    aria-describedby={description ? `${id}-description` : undefined}
    onPointerDownCapture={startBackdropPress} onPointerUpCapture={finishBackdropPress} onPointerCancelCapture={cancelBackdropPress}
    onCancel={(event) => {
      // Dismissing a native file picker also emits a cancel event from its input.
      if (event.target !== event.currentTarget) return
      event.preventDefault()
      onClose()
    }}>
    <header className="dialog-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h2 id={id}>{title}</h2>
        {description && <p id={`${id}-description`}>{description}</p>}
      </div>
      <button type="button" className="icon-button" aria-label={language === 'zh' ? '关闭' : 'Close'} onClick={onClose}><Icon name="x" /></button>
    </header>
    {children}
  </dialog>
}
