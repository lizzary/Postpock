import { useCallback, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import Select from './components/Select.jsx'
import { Dialog, Icon, PlatformBadge } from './components/UI.jsx'
import { asset, libraryApi, local, platforms, searchPosts, useLibrary } from './data/library.js'
import { postHref } from './data/postContent.js'
import { AuthorEditor, PostEditor } from './features/Editors.jsx'
import Export from './features/Export.jsx'
import { AuthorPage, Home, PostPage, authorHref } from './features/LibraryPages.jsx'
import { Mcp } from './features/Mcp.jsx'
import { Operations, useOperations } from './features/Operations.jsx'
import './styles.css'
import './features/delete.css'

function readRoute() {
  const match = location.hash.match(/^#\/(creator|post)\/([^/]+)$/)
  if (!match) return { page: 'home' }
  try { return { page: match[1], id: decodeURIComponent(match[2]) } } catch { return { page: 'home' } }
}

function App() {
  const { authors, posts, settings, ready } = useLibrary()
  const [route, setRoute] = useState(readRoute)
  const [view, setView] = useState(null)
  const [toast, setToast] = useState(null)
  const { language, theme, databasePath } = settings
  const en = language === 'en'
  const post = route.page === 'post' ? posts.find((entry) => entry.id === route.id) : null
  const authorId = route.page === 'creator' ? route.id : post?.authorId
  const author = authorId ? authors.find((entry) => entry.id === authorId) : null
  const missing = route.page !== 'home' && (!author || (route.page === 'post' && !post))

  const close = useCallback(() => setView(null), [])
  const notify = useCallback((message) => setToast({ message }), [])

  useEffect(() => {
    function changeRoute() {
      setRoute(readRoute())
      setView(null)
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', changeRoute)
    return () => window.removeEventListener('hashchange', changeRoute)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.lang = en ? 'en' : 'zh-CN'
    document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#1b1822' : '#f6f3eb'
  }, [en, theme])

  useEffect(() => {
    document.title = post ? `${local(post.title, language)} · PostPock`
      : author ? `${local(author.name, language)} · PostPock` : 'PostPock'
  }, [post, author, language])

  useEffect(() => {
    function shortcut(event) {
      if (event.key.toLowerCase() === 'k' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault()
        setView('search')
      }
    }
    window.addEventListener('keydown', shortcut)
    return () => window.removeEventListener('keydown', shortcut)
  }, [])

  useEffect(() => {
    if (!toast) return
    const timeout = setTimeout(() => setToast(null), 3800)
    return () => clearTimeout(timeout)
  }, [toast])

  function saveAuthor(values) {
    const { record, saved } = libraryApi.saveAuthor(values)
    close()
    location.hash = `/creator/${encodeURIComponent(record.id)}`
    saved.then((ok) => notify(ok ? (en ? 'Creator saved.' : '作者已收藏。') : (en ? 'Creator saved for this session only.' : '作者仅保留在当前会话。')))
  }

  function savePost(values) {
    const { record, saved } = libraryApi.savePost(values)
    close()
    location.hash = postHref(record.id).slice(1)
    saved.then((ok) => notify(ok ? (en ? 'Post saved.' : '文章已保存。') : (en ? 'Post saved for this session only.' : '文章仅保留在当前会话。')))
  }

  function deleteRecord() {
    const deletingAuthor = view === 'deleteAuthor'
    const saved = deletingAuthor ? libraryApi.deleteAuthor(author.id) : libraryApi.deletePost(post.id)
    close()
    location.hash = deletingAuthor ? '/' : authorHref(author.id).slice(1)
    saved.then((ok) => notify(ok
      ? (deletingAuthor ? (en ? 'Creator deleted.' : '已删除作者。') : (en ? 'Post deleted.' : '已删除文章。'))
      : (en ? 'Deletion applies to this session only.' : '删除仅在当前会话生效。')))
  }

  return <>
    <a className="skip-link" href="#main-content" onClick={(event) => { event.preventDefault(); document.querySelector('main').focus() }}>{en ? 'Skip to content' : '跳到正文'}</a>
    <Header language={language} open={setView} home={route.page === 'home'} />
    <main key={`${route.page}:${route.id ?? ''}`} className="shell main-content" id="main-content" tabIndex={-1}>
      {!ready ? <div className="empty-note" role="status">{en ? 'Opening the archive…' : '正在打开收藏馆…'}</div>
        : missing ? <div className="empty-note"><p>{en ? 'This page is no longer on the shelf.' : '这页档案不在当前馆藏中。'}</p><a className="button button-soft" href="#/">{en ? 'Back to the collection' : '返回收藏馆'}<Icon name="arrow-right" size={16} /></a></div>
          : route.page === 'home' ? <Home authors={authors} posts={posts} language={language} open={setView} />
            : post ? <PostPage post={post} author={author} posts={posts} language={language} open={setView} />
              : <AuthorPage key={`${databasePath}:${author.id}`} author={author} posts={posts} databasePath={databasePath} language={language} open={setView} />}
    </main>
    <footer className="site-footer shell"><div className="footer-brand"><Icon name="layers" size={19} />PostPock</div><span>{en ? 'An archive of things worth keeping.' : '给值得珍藏的事物，留一页。'}</span></footer>
    <Operations view={view === 'settings-from-mcp' ? 'settings' : view} focusMcpEntry={view === 'settings-from-mcp'}
      onClose={close} authorId={author?.id} authors={authors} posts={posts} language={language} settings={settings}
      onSettingsChange={libraryApi.setSettings} notify={notify} onArchivePosts={libraryApi.archivePosts} onOpen={setView} libraryReady={ready} />
    {view === 'mcp' && <Mcp key={databasePath} lang={language} authors={authors} databasePath={databasePath} onClose={close} onBack={() => setView('settings-from-mcp')} />}
    {view === 'export' && <Export onClose={close} authorId={author?.id} postId={post?.id} authors={authors} posts={posts} language={language} notify={notify} databasePath={databasePath} />}
    {view === 'search' && <Search language={language} authors={authors} posts={posts} authorId={author?.id} onClose={close} />}
    {(view === 'newAuthor' || (view === 'editAuthor' && author)) && <AuthorEditor author={view === 'editAuthor' ? author : null} language={language} onClose={close} onSave={saveAuthor} />}
    {author && (view === 'newPost' || (view === 'editPost' && post)) && <PostEditor post={view === 'editPost' ? post : null} author={author} authors={authors} posts={posts} language={language} onClose={close} onSave={savePost} />}
    {((view === 'deleteAuthor' && author) || (view === 'deletePost' && post)) &&
      <DeleteDialog author={author} post={view === 'deletePost' ? post : null} posts={posts}
        language={language} onClose={close} onConfirm={deleteRecord} />}
    <div className="toast-region" role="status">{toast && <div className="toast"><Icon name="info" size={20} /><span>{toast.message}</span><button className="icon-button" type="button" aria-label={en ? 'Dismiss' : '关闭提示'} onClick={() => setToast(null)}><Icon name="x" size={16} /></button></div>}</div>
  </>
}

function DeleteDialog({ author, post, posts, language, onClose, onConfirm }) {
  const en = language === 'en'
  const title = post ? (en ? 'Delete post?' : '删除这篇文章？') : (en ? 'Delete creator?' : '删除这位作者？')
  const action = post ? (en ? 'Delete post' : '删除文章') : (en ? 'Delete creator' : '删除作者')
  const name = local(post?.title ?? author.name, language)
  const count = post ? 0 : posts.filter((entry) => entry.authorId === author.id).length
  const description = count
    ? (en ? `“${name}” and their ${count} archived ${count === 1 ? 'post' : 'posts'} will be permanently removed from this library.` : `「${name}」及其 ${count} 篇已归档文章将从当前收藏馆永久删除。`)
    : (en ? `“${name}” will be permanently removed from this library.` : `「${name}」将从当前收藏馆永久删除。`)

  return <Dialog title={title} description={description} className="delete-dialog" onClose={onClose}>
    <div className="dialog-actions">
      <button type="button" className="button button-quiet" data-initial-focus onClick={onClose}>{en ? 'Cancel' : '取消'}</button>
      <button type="button" className="button button-danger button-danger-solid" onClick={onConfirm}><Icon name="trash" size={16} />{action}</button>
    </div>
  </Dialog>
}

function Header({ language, open, home }) {
  const en = language === 'en'
  const { connections, tasks } = useOperations()
  const connected = platforms.filter(({ id }) => connections[id] === 'connected').length
  const active = tasks.filter((task) => task.status === 'running' || task.status === 'queued').length
  const items = [
    ['sync', 'sync', en ? 'Sync' : '同步'],
    ['export', 'export', en ? 'Export' : '导出'],
    ['tasks', 'activity', en ? 'Activity' : '任务'],
  ]

  return <header className="site-header">
    <div className="shell site-header-inner">
      <a className="wordmark" href="#/" aria-label="PostPock"><img src={asset('mark.svg')} alt="" width="39" height="39" /><span>PostPock<span className="wordmark-sub">{en ? 'PRIVATE ARCHIVE' : '私人收藏馆'}</span></span></a>
      <nav className="site-nav" aria-label={en ? 'Main navigation' : '主导航'}>
        <a className={`nav-item ${home ? 'selected' : ''}`} href="#/" aria-current={home ? 'page' : undefined}><Icon name="archive" size={17} />{en ? 'Collection' : '收藏馆'}</a>
        {items.map(([view, icon, label]) => <button type="button" key={view} className="nav-item" onClick={() => open(view)}><Icon name={icon} size={17} />{label}{view === 'tasks' && active > 0 && <span className="task-count">{active}</span>}</button>)}
      </nav>
      <div className="site-tools">
        <button type="button" className="connection-pill" onClick={() => open('connections')} title={en ? 'Manage connections' : '连接管理'} aria-label={en ? `Manage connections, ${connected} of ${platforms.length} connected` : `连接管理，已连接 ${connected} 个平台`}><span className={`status-dot ${connected ? 'live' : ''}`} />{connected}<span className="connection-slash">/</span>{platforms.length}</button>
        <button type="button" className="icon-button header-icon" aria-label={en ? 'Search' : '搜索'} title={en ? 'Search (Ctrl+K)' : '搜索（Ctrl+K）'} onClick={() => open('search')}><Icon name="search" size={19} /></button>
        <button type="button" className="icon-button header-icon" aria-label={en ? 'Settings' : '设置'} title={en ? 'Settings' : '设置'} onClick={() => open('settings')}><Icon name="settings" size={19} /></button>
      </div>
    </div>
  </header>
}

function SearchScope({ selected, onClick, children }) {
  return <button type="button" className="filter-tab search-scope" aria-pressed={selected} onClick={onClick}>
    {children}<Icon name="check" size={13} className="search-scope-check" />
  </button>
}

function Search({ authors, posts, authorId, language, onClose }) {
  const en = language === 'en'
  const [query, setQuery] = useState('')
  const [fields, setFields] = useState(['title', 'body', 'author', 'image'])
  const [platformIds, setPlatformIds] = useState([])
  const [creator, setCreator] = useState(authorId || '')
  const authorNames = new Map(authors.map((author) => [author.id, local(author.name, language)]))
  const results = searchPosts(query, platformIds, fields, creator, language, authors, posts)
  const toggle = (items, id) => items.includes(id) ? items.filter((value) => value !== id) : [...items, id]

  return <Dialog title={en ? 'Search the archive' : '在馆藏中寻找'} eyebrow={en ? 'INDEX' : '馆藏索引'} onClose={onClose} className="search-dialog">
    <div className="search-body">
      <label className="search-input"><Icon name="search" /><input data-initial-focus type="search" aria-label={en ? 'Search keywords' : '搜索关键词'} placeholder={en ? 'A title, a name, a fragment…' : '搜索标题、作者，或记得的片段…'} value={query} onChange={(event) => setQuery(event.target.value)} /><kbd>Esc</kbd></label>
      <div className="search-scopes" role="group" aria-label={en ? 'Search scopes' : '搜索范围'}>
        {[[en ? 'Title' : '标题', 'title'], [en ? 'Body' : '正文', 'body'], [en ? 'Creator' : '作者', 'author'], [en ? 'Images' : '图像', 'image']].map(([label, id]) =>
          <SearchScope selected={fields.includes(id)} key={id} onClick={() => setFields((current) => toggle(current, id))}>{label}</SearchScope>)}
        {platforms.map(({ id }) => <SearchScope selected={platformIds.includes(id)} key={id} onClick={() => setPlatformIds((current) => toggle(current, id))}><PlatformBadge platform={id} /></SearchScope>)}
      </div>
      <Select showLabel searchable label={en ? 'Creator filter' : '指定作者'} value={creator} onChange={setCreator} language={language}
        options={[{ value: '', label: en ? 'All creators' : '全部作者' }, ...authors.map(({ id }) => ({ value: id, label: authorNames.get(id) }))]} />
      {query.trim() && <div className="search-results" aria-live="polite">
        <div className="search-result-count">{en ? `${results.length} results` : `${results.length} 条结果`}</div>
        {results.map((post) => <a key={post.id} href={postHref(post.id)} onClick={onClose}>
          <img src={post.cover} alt="" /><span><strong>{local(post.title, language)}</strong><small>{authorNames.get(post.authorId)}</small></span><Icon name="arrow-up-right" size={17} />
        </a>)}
      </div>}
    </div>
  </Dialog>
}

createRoot(document.getElementById('root')).render(<App />)
