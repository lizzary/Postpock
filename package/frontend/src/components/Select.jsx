import { useId, useLayoutEffect, useRef, useState } from 'react'
import Popover from './Popover.jsx'
import { Icon } from './UI.jsx'
import './select.css'

export default function Select({
  label, value, options, onChange, language = 'zh', showLabel = false, compact = false, searchable = false,
}) {
  const id = useId()
  const listId = `${id}-options`
  const trigger = useRef(null)
  const search = useRef(null)
  const list = useRef(null)
  const typeahead = useRef({ text: '', time: 0 })
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const selected = options.find((option) => option.value === value)
  const term = query.trim().toLocaleLowerCase()
  const visible = term ? options.filter((option) => option.label.toLocaleLowerCase().includes(term)) : options
  const activeId = open && visible[active] ? `${listId}-${active}` : undefined
  const en = language === 'en'

  useLayoutEffect(() => {
    if (open) search.current?.focus({ preventScroll: true })
  }, [open])

  useLayoutEffect(() => {
    if (!open || !activeId) return
    const item = document.getElementById(activeId)
    const scroller = list.current
    if (!item || !scroller) return
    const bounds = item.getBoundingClientRect()
    const frame = scroller.getBoundingClientRect()
    if (bounds.top < frame.top) scroller.scrollTop -= frame.top - bounds.top
    if (bounds.bottom > frame.bottom) scroller.scrollTop += bounds.bottom - frame.bottom
  }, [activeId, open, term])

  function show(index = Math.max(0, options.indexOf(selected))) {
    typeahead.current = { text: '', time: 0 }
    setActive(index)
    setQuery('')
    setOpen(true)
  }

  function close(reason) {
    setOpen(false)
    if (reason === 'escape' || reason === 'selected') trigger.current?.focus({ preventScroll: true })
  }

  function choose(option) {
    if (!option) return
    onChange(option.value)
    close('selected')
  }

  function handleKey(event, fromSearch = false) {
    const { key } = event
    if (event.nativeEvent.isComposing) return
    if (key === 'ArrowDown' || key === 'ArrowUp') {
      event.preventDefault()
      const step = key === 'ArrowDown' ? 1 : -1
      if (open) setActive(Math.max(0, Math.min(visible.length - 1, active + step)))
      else show(selected ? options.indexOf(selected) : step === 1 ? 0 : options.length - 1)
    } else if (open && (key === 'Enter' || (key === ' ' && !fromSearch))) {
      event.preventDefault()
      choose(visible[active])
    } else if (open && !fromSearch && (key === 'Home' || key === 'End')) {
      event.preventDefault()
      setActive(key === 'Home' ? 0 : visible.length - 1)
    } else if (!fromSearch && key.length === 1 && key !== ' ' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      if (searchable) return
      event.preventDefault()
      const time = Date.now()
      const text = (time - typeahead.current.time < 650 ? typeahead.current.text : '') + key.toLocaleLowerCase()
      const prefix = [...text].every((char) => char === text[0]) ? text[0] : text
      const start = (open ? active : options.indexOf(selected)) + (prefix.length === 1 ? 1 : 0)
      const ordered = [...options.slice(start), ...options.slice(0, start)]
      const option = ordered.find((entry) => entry.label.toLocaleLowerCase().startsWith(prefix))
      if (option && !open) show(options.indexOf(option))
      if (option && open) setActive(options.indexOf(option))
      typeahead.current = { text, time }
    }
  }

  return <div className={`select-control${showLabel ? ' field' : ''}`}>
    {showLabel && <span>{label}</span>}
    <button ref={trigger} type="button" className={`input select-trigger${compact ? ' select-trigger-compact' : ''}`}
      role={searchable ? undefined : 'combobox'} aria-label={label}
      aria-expanded={open} aria-controls={open ? listId : undefined} aria-haspopup="listbox"
      aria-activedescendant={searchable ? undefined : activeId} aria-describedby={`${id}-value`}
      onKeyDown={handleKey} onClick={() => open ? close() : show()}>
      <span id={`${id}-value`}>{selected?.label ?? (en ? 'Choose an option' : '请选择')}</span>
      <Icon name="chevron-down" size={16} />
    </button>
    <Popover open={open} anchorRef={trigger} onDismiss={close} className="select-popover" minWidth={compact ? 158 : 0}>
      {searchable && <div className="select-search">
        <Icon name="search" size={16} />
        <input ref={search} type="search" role="combobox" aria-label={en ? `Search options for ${label}` : `搜索选项：${label}`}
          aria-expanded={open} aria-autocomplete="list" aria-controls={listId} aria-activedescendant={activeId}
          placeholder={en ? 'Find an option…' : '搜索选项…'} value={query}
          onKeyDown={(event) => handleKey(event, true)}
          onChange={(event) => { setQuery(event.target.value); setActive(0) }} />
      </div>}
      <div ref={list} role="listbox" aria-label={label} id={listId} className="select-options" tabIndex={-1}>
        {visible.map((option, index) => <div key={option.value} id={`${listId}-${index}`} role="option"
          aria-selected={option.value === value} data-active={index === active}
          className="select-option" onMouseMove={() => setActive(index)}
          onMouseDown={(event) => event.preventDefault()} onClick={() => choose(option)}>
          <span>{option.label}</span>
          {option.value === value && <Icon name="check" size={16} />}
        </div>)}
      </div>
      {!visible.length && <p className="select-empty" role="status">{en ? 'No matching options' : '没有匹配的选项'}</p>}
    </Popover>
  </div>
}
