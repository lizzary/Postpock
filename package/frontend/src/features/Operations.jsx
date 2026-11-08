import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { Dialog, Icon, PlatformBadge } from '../components/UI.jsx'
import { formatDate, local, platforms as platformCatalog } from '../data/library.js'
import {
  acknowledgeArchive, activePostStates, beginLogin, cancelLogin, clearTaskHistory,
  getLibraryOperations, getOperationsSnapshot, platformIds, submitPostTask, submitStatusCheck, subscribeOperations,
  validateLogin,
} from '../data/operations.js'
import './operations.css'

const labels = {
  connected: ['已连接', 'Connected'],
  disconnected: ['未连接', 'Not connected'],
  expired: ['连接已失效', 'Expired'],
  all: ['全部', 'All'],
  saved: ['已归档', 'Archived'],
  missing: ['待同步', 'Not archived'],
  update: ['有更新', 'Update available'],
  running: ['进行中', 'In progress'],
  queued: ['排队中', 'Queued'],
  completed: ['已完成', 'Completed'],
}

const taskLabels = {
  check: ['同步状态检查', 'Check archive status'],
  sync: ['同步投稿', 'Archive posts'],
  update: ['检查投稿更新', 'Check for updates'],
}

const pick = (language) => (zh, en) => language === 'en' ? en : zh

export function useOperations() {
  return useSyncExternalStore(subscribeOperations, getOperationsSnapshot, getOperationsSnapshot)
}

function Status({ status, language }) {
  return <span className={`op-status op-status-${status}`}><span aria-hidden="true" />{pick(language)(...labels[status])}</span>
}

export function ConnectionStatus({ platform, language }) {
  const { connections } = useOperations()
  return connections[platform] && <Status status={connections[platform]} language={language} />
}

function Connections({ language, snapshot, onClose }) {
  const t = pick(language)
  const { connections, logins } = snapshot
  return (
    <Dialog title={t('连接管理', 'Connections')} eyebrow={t('归档工具', 'Archive tools')} onClose={onClose} wide className="op-dialog">
      <div className="op-connections">
        {platformIds.map((platform) => {
          const status = connections[platform]
          const phase = logins[platform]?.phase
          return (
            <section key={platform} className="op-connection-card">
              <div className="op-connection-top">
                <PlatformBadge platform={platform} />
                <Status status={status} language={language} />
              </div>
              <div className="op-connection-action" aria-live="polite">
                {phase === 'awaiting' ? (
                  <>
                    <p>{t('请在平台网站登录，完成后返回这里。', 'Sign in on the platform, then return here.')}</p>
                    <div className="op-actions">
                      <button type="button" className="button button-primary" onClick={() => validateLogin(platform)}>
                        <Icon name="check" size={16} />{t('我已登录', 'I’ve signed in')}
                      </button>
                      <button type="button" className="button button-quiet" onClick={() => cancelLogin(platform)}>{t('取消', 'Cancel')}</button>
                    </div>
                  </>
                ) : phase === 'verifying' ? (
                  <span className="op-verifying"><Icon name="loader" size={18} className="op-spin" />{t('校验中', 'Verifying')}</span>
                ) : (
                  <a
                    href={platformCatalog.find(({ id }) => id === platform)?.url}
                    target="_blank"
                    rel="noreferrer"
                    className={`button ${status === 'connected' ? 'button-quiet' : 'button-soft'}`}
                    onClick={() => beginLogin(platform)}
                  >
                    <Icon name="log-in" size={17} />
                    {status === 'disconnected' ? t('登录平台', 'Sign in') : t('重新连接', 'Reconnect')}
                  </a>
                )}
              </div>
            </section>
          )
        })}
      </div>
      <p className="op-note"><Icon name="info" size={16} />{t('当前为本地预览，登录和校验使用模拟会话。', 'This local preview simulates sign-in and verification.')}</p>
    </Dialog>
  )
}

function Settings({ language, settings, onSettingsChange, onClose, notify }) {
  const t = pick(language)
  const [path, setPath] = useState(settings.databasePath)
  const directoryInput = useRef(null)

  async function chooseDirectory() {
    if (!window.showDirectoryPicker) {
      directoryInput.current?.click()
      return
    }
    try {
      const directory = await window.showDirectoryPicker()
      setPath(directory.name)
    } catch (error) {
      if (error.name !== 'AbortError') directoryInput.current?.click()
    }
  }

  function savePath(event) {
    event.preventDefault()
    const databasePath = path.trim()
    if (!databasePath || databasePath === settings.databasePath) return
    onSettingsChange({ databasePath })
    setPath(databasePath)
    notify?.(t('数据库目录设置已保存', 'Library folder preference saved'))
  }

  return (
    <Dialog title={t('设置', 'Preferences')} eyebrow="POSTPOCK" onClose={onClose} className="op-dialog">
      <div className="op-preferences">
        <section aria-labelledby="general-preferences">
          <h3 id="general-preferences"><Icon name="sliders" size={17} />{t('常规', 'General')}</h3>
          <div className="op-setting">
            <span id="language-setting">{t('语言', 'Language')}</span>
            <div className="op-segment" role="group" aria-labelledby="language-setting">
              <button type="button" aria-pressed={settings.language === 'zh'} onClick={() => onSettingsChange({ language: 'zh' })}>简体中文</button>
              <button type="button" aria-pressed={settings.language === 'en'} onClick={() => onSettingsChange({ language: 'en' })}>English</button>
            </div>
          </div>
          <div className="op-setting">
            <span id="theme-setting">{t('主题', 'Appearance')}</span>
            <div className="op-segment" role="group" aria-labelledby="theme-setting">
              <button type="button" aria-pressed={settings.theme === 'light'} onClick={() => onSettingsChange({ theme: 'light' })}><Icon name="sun" size={16} />{t('浅色', 'Light')}</button>
              <button type="button" aria-pressed={settings.theme === 'dark'} onClick={() => onSettingsChange({ theme: 'dark' })}><Icon name="moon" size={16} />{t('深色', 'Dark')}</button>
            </div>
          </div>
        </section>
        <section aria-labelledby="data-preferences">
          <h3 id="data-preferences"><Icon name="database" size={17} />{t('数据', 'Data')}</h3>
          <form className="op-path-setting" onSubmit={savePath}>
            <label htmlFor="database-path">{t('数据库目录', 'Library folder')}</label>
            <div className="op-folder-field">
              <input id="database-path" className="input" placeholder="data" value={path} onChange={(event) => setPath(event.target.value)} required />
              <button type="button" className="button button-soft" onClick={chooseDirectory}><Icon name="folder" size={18} />{t('选择', 'Browse')}</button>
              <input
                ref={directoryInput}
                type="file"
                webkitdirectory=""
                hidden
                onChange={(event) => {
                  const selected = event.target.files[0]?.webkitRelativePath.split('/')[0]
                  if (selected) setPath(selected)
                  event.target.value = ''
                }}
              />
              <button type="submit" className="button button-primary" disabled={!path.trim() || path.trim() === settings.databasePath}>{t('应用', 'Apply')}</button>
            </div>
            <p className="op-setting-help">{t('也可输入完整路径。浏览器目录选择器仅返回目录名称。', 'You can enter a full path. The browser picker returns the folder name.')}</p>
          </form>
          <div className="op-setting">
            <label htmlFor="worker-count">{t('同步任务线程数', 'Sync workers')}</label>
            <div className="op-stepper">
              <button type="button" className="icon-button" disabled={settings.threads <= 1} aria-label={t('减少线程', 'Fewer workers')} onClick={() => onSettingsChange({ threads: settings.threads - 1 })}><Icon name="minus" size={17} /></button>
              <output id="worker-count">{settings.threads}</output>
              <button type="button" className="icon-button" disabled={settings.threads >= 8} aria-label={t('增加线程', 'More workers')} onClick={() => onSettingsChange({ threads: settings.threads + 1 })}><Icon name="plus" size={17} /></button>
            </div>
          </div>
        </section>
      </div>
    </Dialog>
  )
}

function formattedTime(timestamp, language) {
  return new Intl.DateTimeFormat(language === 'en' ? 'en' : 'zh-CN', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(timestamp)
}

function TaskProgress({ task, language }) {
  const t = pick(language)
  const phaseLabel = {
    connecting: t('正在检查连接', 'Checking connections'),
    processing: t('正在处理投稿', 'Processing posts'),
    finishing: t('正在保存结果', 'Saving results'),
  }
  return (
    <div className="op-progress">
      <div><span>{phaseLabel[task.phase]}</span><span>{task.completed} / {task.total}</span></div>
      <progress aria-label={t('任务进度', 'Task progress')} value={task.completed} max={task.total || 1} />
    </div>
  )
}

function Tasks({ language, snapshot, onClose }) {
  const t = pick(language)
  const [filter, setFilter] = useState('all')
  const counts = { all: snapshot.tasks.length, running: 0, queued: 0, completed: 0 }
  for (const task of snapshot.tasks) counts[task.status]++
  const priority = { running: 0, queued: 1, completed: 2 }
  const tasks = snapshot.tasks.filter(({ status }) => filter === 'all' || status === filter)
    .sort((a, b) => priority[a.status] - priority[b.status]
      || (a.status === 'queued' ? a.createdAt - b.createdAt : b.finishedAt - a.finishedAt))

  return (
    <Dialog title={t('任务记录', 'Activity')} eyebrow={t('归档工具', 'Archive tools')} onClose={onClose} className="op-dialog">
      <div className="op-task-toolbar">
        <div className="op-tabs" role="group" aria-label={t('任务状态', 'Task status')}>
          {Object.keys(counts).map((status) => (
            <button type="button" key={status} aria-pressed={filter === status} onClick={() => setFilter(status)}>
              {t(...labels[status])} <span>{counts[status]}</span>
            </button>
          ))}
        </div>
        <button type="button" className="button button-quiet" disabled={!counts.completed} onClick={clearTaskHistory}>
          <Icon name="trash" size={16} />{t('清空历史', 'Clear history')}
        </button>
      </div>
      {tasks.length ? (
        <ul className="op-task-list">
          {tasks.map((task) => (
            <li key={task.id} className="op-task">
              <div className="op-task-icon"><Icon name={task.type === 'check' ? 'list' : task.type === 'update' ? 'refresh' : 'archive'} size={20} /></div>
              <div className="op-task-details">
                <div className="op-task-title"><strong>{t(...taskLabels[task.type])}</strong><Status status={task.status} language={language} /></div>
                {task.status === 'running' ? <TaskProgress task={task} language={language} /> : (
                  <p>
                    {t(`${task.total} 篇投稿`, `${task.total} ${task.total === 1 ? 'post' : 'posts'}`)} · {formattedTime(task.finishedAt ?? task.createdAt, language)}
                    {task.updates !== undefined && ` · ${t(`${task.updates} 篇有更新`, `${task.updates} with updates`)}`}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : <div className="op-empty op-empty-small"><Icon name="activity" size={32} /><p>{t('这里暂时没有任务', 'No tasks here yet')}</p></div>}
    </Dialog>
  )
}

const PAGE_SIZE = 7

function SelectVisible({ checked, mixed, onChange, label, disabled }) {
  const input = useRef(null)
  useEffect(() => { input.current.indeterminate = mixed }, [mixed])
  return <input ref={input} type="checkbox" checked={checked} onChange={onChange} aria-label={label} disabled={disabled} />
}

function Sync({ language, authors, authorId, posts, settings, snapshot, onOpen, onClose, notify, libraryReady = true }) {
  const t = pick(language)
  const { connections, tasks } = snapshot
  const { databasePath } = settings
  const { checkpoint } = getLibraryOperations(snapshot, databasePath)
  const scopedAuthor = authors.find(({ id }) => id === authorId)
  const [platforms, setPlatforms] = useState(() => scopedAuthor ? [scopedAuthor.platform] : platformIds.filter((id) => connections[id] === 'connected'))
  const [authorIds, setAuthorIds] = useState(() => scopedAuthor ? [scopedAuthor.id] : authors.filter(({ platform }) => connections[platform] === 'connected').map(({ id }) => id))
  const [scopeExpanded, setScopeExpanded] = useState(!checkpoint)
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(new Set())
  const authorsById = useMemo(() => new Map(authors.map((author) => [author.id, author])), [authors])
  const activeStates = useMemo(() => activePostStates(tasks, databasePath), [tasks, databasePath])
  const availableAuthors = authors.filter(({ platform }) => platforms.includes(platform))
  const chosenAuthors = availableAuthors.filter(({ id }) => authorIds.includes(id))
  const blocked = chosenAuthors.some(({ platform }) => connections[platform] !== 'connected')
  const checking = tasks.find((task) => task.type === 'check' && task.status !== 'completed' && task.path === databasePath)
  const rows = checkpoint?.rows ?? []
  const statuses = ['all', 'missing', 'saved', 'update']
  const matches = rows.filter(({ post, authorId: rowAuthor, status }) => {
    if (filter !== 'all' && filter !== status) return false
    return [local(post.title, language), local(authorsById.get(rowAuthor)?.name, language)].join(' ').toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
  })
  const pageCount = Math.max(1, Math.ceil(matches.length / PAGE_SIZE))
  const visiblePage = Math.min(page, pageCount)
  const visible = matches.slice((visiblePage - 1) * PAGE_SIZE, visiblePage * PAGE_SIZE)
  const ready = ({ post, platform }) => libraryReady && connections[platform] === 'connected' && !activeStates.has(post.id)
  const visibleIds = visible.filter(ready).map(({ post }) => post.id)
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id))
  const someSelected = visibleIds.some((id) => selected.has(id))
  const chosenRows = rows.filter((row) => ready(row) && selected.has(row.post.id))
  const toSync = chosenRows.filter(({ status }) => status !== 'saved')
  const toUpdate = chosenRows.filter(({ status }) => status === 'saved')

  function togglePlatform(platform) {
    if (platforms.includes(platform)) {
      setPlatforms((values) => values.filter((id) => id !== platform))
      setAuthorIds((values) => values.filter((id) => authorsById.get(id)?.platform !== platform))
    } else {
      setPlatforms((values) => [...values, platform])
      setAuthorIds((values) => [...values, ...authors.filter((author) => author.platform === platform).map(({ id }) => id)])
    }
  }

  function toggleIds(ids, checked) {
    setSelected((prior) => {
      const next = new Set(prior)
      for (const id of ids) {
        if (checked) next.add(id)
        else next.delete(id)
      }
      return next
    })
  }

  function check() {
    if (submitStatusCheck(chosenAuthors, posts, settings.threads, databasePath)) {
      setSelected(new Set())
      setPage(1)
      setQuery('')
      setFilter('all')
      setScopeExpanded(false)
      notify?.(t('同步状态检查已加入队列', 'Archive status check queued'))
    }
  }

  function submit(type, selectedRows) {
    const ids = submitPostTask(type, selectedRows.map(({ post }) => post.id), settings.threads, databasePath)
    if (ids.length) {
      toggleIds(ids, false)
      notify?.(type === 'sync' ? t('同步任务已加入队列', 'Archive task queued') : t('更新检查已加入队列', 'Update check queued'))
    }
  }

  return (
    <Dialog title={t('同步归档', 'Archive sync')} eyebrow={t('归档工具', 'Archive tools')} onClose={onClose} wide className="op-dialog op-dialog-sync">
      <div className="op-sync-layout">
        <aside className="op-scope" aria-label={t('检查范围', 'Check scope')}>
          <div className="op-scope-header">
            <Icon name="layers" size={19} /><h3>{t('检查范围', 'Check scope')}</h3>
            <button
              className="icon-button op-scope-toggle"
              type="button"
              aria-expanded={scopeExpanded}
              aria-controls="sync-scope-fields"
              aria-label={scopeExpanded ? t('收起检查范围', 'Collapse check scope') : t('展开检查范围', 'Expand check scope')}
              onClick={() => setScopeExpanded(!scopeExpanded)}
            ><Icon name="chevron-down" size={17} /></button>
          </div>
          <div id="sync-scope-fields" className="op-scope-content" data-collapsed={!scopeExpanded}>
            <div className="op-scope-fields">
              <fieldset>
                <legend>{t('平台', 'Platforms')}</legend>
                {platformIds.map((platform) => (
                  <label key={platform} className="op-choice">
                    <input type="checkbox" checked={platforms.includes(platform)} onChange={() => togglePlatform(platform)} />
                    <PlatformBadge platform={platform} />
                    <span className={`op-scope-dot op-status-${connections[platform]}`} role="img" title={t(...labels[connections[platform]])} aria-label={t(...labels[connections[platform]])} />
                  </label>
                ))}
              </fieldset>
              <fieldset>
                <legend>{t('作者', 'Creators')}</legend>
                {availableAuthors.length ? (
                  <div className="op-creator-choices">
                    {availableAuthors.map((author) => (
                      <label key={author.id} className="op-choice">
                        <input
                          type="checkbox"
                          checked={authorIds.includes(author.id)}
                          onChange={(event) => {
                            const checked = event.target.checked
                            setAuthorIds((values) => checked ? [...values, author.id] : values.filter((id) => id !== author.id))
                          }}
                        />
                        <span>{local(author.name, language)}</span>
                      </label>
                    ))}
                  </div>
                ) : <p className="op-scope-help">{t('所选平台下暂无作者。', 'No creators in the selected platforms.')}</p>}
              </fieldset>
            </div>
            {blocked && <button type="button" className="button button-quiet op-connect-hint" onClick={() => onOpen('connections')}><Icon name="alert" size={17} />{t('请先连接所选平台', 'Connect the selected platforms')}</button>}
            <button type="button" className="button button-primary op-check-button" disabled={!libraryReady || !chosenAuthors.length || blocked || !!checking} onClick={check}>
              <Icon name={checking ? 'loader' : 'sync'} className={checking ? 'op-spin' : undefined} size={17} />
              {checking ? t('检查任务已提交', 'Check submitted') : t('检查同步状态', 'Check archive status')}
            </button>
          </div>
        </aside>
        <section className="op-ledger" aria-label={t('投稿清单', 'Post ledger')}>
          <div className="op-ledger-header">
            <div>
              <h3>{t('投稿清单', 'Post ledger')}</h3>
              {rows.length > 0 && <p>{t('上次检查', 'Last checked')} · {formattedTime(checkpoint.checkedAt, language)}</p>}
            </div>
            <button type="button" className="button button-quiet" onClick={() => onOpen('tasks')}><Icon name="activity" size={17} />{t('任务记录', 'Activity')}</button>
          </div>
          {checking?.status === 'running' && <div className="op-ledger-progress"><TaskProgress task={checking} language={language} /></div>}
          {rows.length ? (
            <>
              <div className="op-ledger-tools">
                <div className="op-tabs" role="group" aria-label={t('投稿状态', 'Post status')}>
                  {statuses.map((status) => (
                    <button key={status} type="button" aria-pressed={filter === status} onClick={() => { setFilter(status); setPage(1) }}>
                      {t(...labels[status])} <span>{status === 'all' ? rows.length : rows.filter((row) => row.status === status).length}</span>
                    </button>
                  ))}
                </div>
                <div className="op-ledger-search">
                  <Icon name="search" size={16} />
                  <input className="input" type="search" aria-label={t('筛选清单', 'Filter ledger')} placeholder={t('查找投稿或作者', 'Find a post or creator')} value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} />
                </div>
              </div>
              <div className="op-table-scroll">
                <table aria-label={t('投稿清单', 'Post ledger')}>
                  <thead>
                    <tr>
                      <th scope="col"><SelectVisible checked={allSelected} mixed={someSelected && !allSelected} disabled={!visibleIds.length} label={t('选择本页可操作的投稿', 'Select actionable posts on this page')} onChange={(event) => toggleIds(visibleIds, event.target.checked)} /></th>
                      <th scope="col">{t('投稿', 'Post')}</th>
                      <th scope="col">{t('发布日期', 'Published')}</th>
                      <th scope="col">{t('状态', 'Status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((row) => {
                      const { post, authorId: rowAuthor, status } = row
                      const enabled = ready(row)
                      const title = local(post.title, language)
                      return (
                        <tr key={post.id} className={selected.has(post.id) && enabled ? 'op-row-selected' : ''}>
                          <td><input type="checkbox" disabled={!enabled} checked={selected.has(post.id) && enabled} aria-label={t(`选择 ${title}`, `Select ${title}`)} onChange={(event) => toggleIds([post.id], event.target.checked)} /></td>
                          <td><div className="op-ledger-title"><strong>{title}</strong><span>{local(authorsById.get(rowAuthor)?.name, language)}</span></div></td>
                          <td className="op-ledger-date">{formatDate(post.publishedAt, language)}</td>
                          <td><Status status={activeStates.get(post.id) ?? status} language={language} /></td>
                        </tr>
                      )
                    })}
                    {!visible.length && <tr><td className="op-no-matches" colSpan="4">{t('没有匹配的投稿', 'No matching posts')}</td></tr>}
                  </tbody>
                </table>
              </div>
              {pageCount > 1 && (
                <nav className="op-pagination" aria-label={t('清单分页', 'Ledger pagination')}>
                  <button type="button" className="icon-button" aria-label={t('上一页', 'Previous page')} disabled={visiblePage <= 1} onClick={() => setPage(visiblePage - 1)}><Icon name="chevron-left" size={17} /></button>
                  <span>{visiblePage} / {pageCount}</span>
                  <button type="button" className="icon-button" aria-label={t('下一页', 'Next page')} disabled={visiblePage >= pageCount} onClick={() => setPage(visiblePage + 1)}><Icon name="chevron-right" size={17} /></button>
                </nav>
              )}
              <div className="op-ledger-footer">
                <span role="status">{t(`已选 ${chosenRows.length} 篇`, `${chosenRows.length} selected`)}</span>
                <div className="op-actions">
                  <button type="button" className="button button-soft" disabled={!toUpdate.length} onClick={() => submit('update', toUpdate)}>
                    <Icon name="refresh" size={16} />{t('检查更新', 'Check updates')}{toUpdate.length > 0 && ` · ${toUpdate.length}`}
                  </button>
                  <button type="button" className="button button-primary" disabled={!toSync.length} onClick={() => submit('sync', toSync)}>
                    <Icon name="download" size={16} />{t('同步所选', 'Archive selected')}{toSync.length > 0 && ` · ${toSync.length}`}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="op-empty op-ledger-empty">
              <div className="op-empty-emblem"><Icon name="archive" size={34} /></div>
              <strong>{t('清单等待第一次检查', 'Your ledger is ready for its first check')}</strong>
              <p>{t('选择平台与作者，查看已归档的投稿与待同步的内容。', 'Choose platforms and creators to see what you have archived and what is ready to save.')}</p>
            </div>
          )}
        </section>
      </div>
    </Dialog>
  )
}

export function Operations(props) {
  const snapshot = useOperations()
  const { view, onArchivePosts, settings, libraryReady = true } = props
  const { databasePath } = settings
  const { archivePosts } = getLibraryOperations(snapshot, databasePath)

  useEffect(() => {
    if (!libraryReady || !archivePosts.length || !onArchivePosts) return
    Promise.resolve(onArchivePosts(archivePosts)).then((saved) => {
      if (saved !== false) acknowledgeArchive(databasePath, archivePosts)
    }).catch(() => {
      // Pending posts can be delivered when this library is opened again.
    })
  }, [archivePosts, databasePath, libraryReady, onArchivePosts])

  const View = { connections: Connections, settings: Settings, tasks: Tasks, sync: Sync }[view]
  return View ? <View key={view} {...props} snapshot={snapshot} /> : null
}
