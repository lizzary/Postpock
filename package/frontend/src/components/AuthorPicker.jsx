import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Icon, PlatformBadge } from './UI.jsx'
import { local, platforms } from '../data/library.js'
import './author-picker.css'

const platformOrder = new Map(platforms.map(({ id }, index) => [id, index]))
const searchable = (value) => value.normalize('NFKC').toLowerCase()
const platformName = (platform) => platforms[platformOrder.get(platform)]?.name ?? platform

function groupAuthors(authors, language) {
  const collator = new Intl.Collator(language === 'en' ? 'en' : 'zh-CN', { numeric: true })
  const groups = new Map()
  for (const author of authors) {
    const name = local(author.name, language)
    const searchText = searchable([local(author.name, 'zh'), local(author.name, 'en'), author.id].join(' '))
    const entry = { ...author, name, searchText }
    if (!groups.has(author.platform)) groups.set(author.platform, [])
    groups.get(author.platform).push(entry)
  }
  return [...groups].sort(([a], [b]) => (platformOrder.get(a) ?? Infinity) - (platformOrder.get(b) ?? Infinity))
    .map(([platform, entries]) => [platform, entries.sort((a, b) => collator.compare(a.name, b.name))])
}

function GroupSelection({ platform, entries, selected, onSelect, language }) {
  const checkbox = useRef(null)
  const count = entries.filter(({ id }) => selected.has(id)).length
  useEffect(() => { checkbox.current.indeterminate = count > 0 && count < entries.length }, [count, entries.length])

  return <label className="author-picker-group-heading">
    <input ref={checkbox} type="checkbox" className="archive-check" checked={count === entries.length} aria-label={
      language === 'en' ? `Select matching creators on ${platformName(platform)}` : `选择 ${platformName(platform)} 的匹配作者`
    } onChange={(event) => onSelect(entries.map(({ id }) => id), event.target.checked)} />
    <PlatformBadge platform={platform} />
    <span aria-hidden="true">{count} / {entries.length}</span>
  </label>
}

export function AuthorPicker({ authors, selectedIds, onChange, language, filterPlatforms = true }) {
  const id = useId()
  const t = (zh, en) => language === 'en' ? en : zh
  const [query, setQuery] = useState('')
  const [platformFilter, setPlatformFilter] = useState('')
  const results = useRef(null)
  const groups = useMemo(() => groupAuthors(authors, language), [authors, language])
  const selected = useMemo(() => new Set(selectedIds), [selectedIds])
  const selectedCount = authors.filter(({ id: authorId }) => selected.has(authorId)).length
  const activePlatform = filterPlatforms && groups.some(([platform]) => platform === platformFilter) ? platformFilter : ''
  const search = searchable(query.trim())
  const terms = search ? search.split(/\s+/) : []
  const scoped = Boolean(search || activePlatform)
  const matches = groups
    .filter(([platform]) => !activePlatform || platform === activePlatform)
    .map(([platform, entries]) => [platform, entries.filter(({ searchText }) => terms.every((term) => searchText.includes(term)))])
    .filter(([, entries]) => entries.length)
  const matchIds = matches.flatMap(([, entries]) => entries.map(({ id: authorId }) => authorId))

  function changeSelection(ids, checked) {
    const next = new Set(selected)
    for (const authorId of ids) {
      if (checked) next.add(authorId)
      else next.delete(authorId)
    }
    onChange([...next])
  }

  function filterResults(setFilter, value) {
    setFilter(value)
    results.current.scrollTop = 0
  }

  return <div className="author-picker">
    <label className="author-picker-search">
      <Icon name="search" size={16} />
      <input className="input" type="search" value={query} aria-label={t('搜索作者', 'Search creators')}
        placeholder={t('搜索作者', 'Search creators')} onChange={(event) => filterResults(setQuery, event.target.value)} />
    </label>
    {filterPlatforms && <div className="author-picker-platforms" role="group" aria-label={t('按平台筛选作者', 'Filter creators by platform')}>
      <button type="button" aria-pressed={!activePlatform} aria-label={t('全部平台', 'All platforms')}
        onClick={() => filterResults(setPlatformFilter, '')}>{t('全部', 'All')}</button>
      {groups.map(([platform]) => (
        <button key={platform} type="button" aria-pressed={activePlatform === platform} aria-label={platformName(platform)}
          title={platformName(platform)} onClick={() => filterResults(setPlatformFilter, platform)}>
          <PlatformBadge platform={platform} showName={false} />
          <span className="author-picker-platform-name">{platformName(platform)}</span>
        </button>
      ))}
    </div>}
    <div className="author-picker-toolbar">
      <span id={`${id}-status`} role="status">{t(`已选 ${selectedCount} / ${authors.length}`, `${selectedCount} / ${authors.length} selected`)}</span>
      <div className="author-picker-actions">
        <button type="button" disabled={matchIds.every((id) => selected.has(id))} onClick={() => changeSelection(matchIds, true)}>
          {scoped ? t('全选结果', 'Select results') : t('全选', 'Select all')}
        </button>
        <button type="button" disabled={!matchIds.some((id) => selected.has(id))} onClick={() => changeSelection(matchIds, false)}>
          {scoped ? t('清除结果', 'Clear results') : t('清除', 'Clear')}
        </button>
      </div>
    </div>
    <div ref={results} className="author-picker-results" role="region" aria-label={t('作者列表', 'Creator list')} aria-describedby={`${id}-status`}>
      {matches.length ? matches.map(([platform, entries]) => (
        <section key={platform} className="author-picker-group">
          <GroupSelection platform={platform} entries={entries} selected={selected} onSelect={changeSelection} language={language} />
          <div className="author-picker-grid">
            {entries.map(({ id, name, avatar }) => (
              <label key={id} className="author-picker-option" title={name}>
                <input type="checkbox" className="archive-check" checked={selected.has(id)} onChange={(event) => changeSelection([id], event.target.checked)} />
                {avatar && <img src={avatar} alt="" width="22" height="22" loading="lazy" />}
                <span>{name}</span>
              </label>
            ))}
          </div>
        </section>
      )) : (
        <div className="author-picker-empty">
          <Icon name={search ? 'search' : 'layers'} size={23} />
          <p>{search ? t('没有匹配的作者', 'No matching creators') : t('当前范围内暂无作者', 'No creators in this scope')}</p>
        </div>
      )}
    </div>
  </div>
}
