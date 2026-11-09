import { useRef, useState } from 'react'
import Select from '../components/Select.jsx'
import { Icon, PlatformBadge } from '../components/UI.jsx'
import { formatDate, libraryApi, local, platforms } from '../data/library.js'
import { postHref, webUrl } from '../data/postContent.js'
import ArchiveSketch from './ArchiveSketch.jsx'
import { ConnectionStatus, useOperations } from './Operations.jsx'
import PostBody from './PostBody.jsx'

export const authorHref = (id) => `#/creator/${encodeURIComponent(id)}`

export function Home({ authors, posts, language, open }) {
  const en = language === 'en'
  const [platformFilter, setPlatformFilter] = useState('all')
  const groups = platforms.filter(({ id }) => platformFilter === 'all' || platformFilter === id)

  return <>
    <section className="home-hero" aria-labelledby="home-title">
      <div className="shell home-hero-inner">
        <ArchiveSketch />
        <div className="hero-copy">
          <h1 id="home-title">{en ? 'Hey, welcome back.' : '回来啦。'}</h1>
          <p>{en ? 'What are we looking at today?' : '今天想看点什么？'}</p>
          <a href="#collection" className="hero-button" onClick={(event) => {
            event.preventDefault()
            const collection = document.getElementById('collection')
            collection.focus({ preventScroll: true })
            collection.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
          }}>{en ? 'Browse the collection' : '翻翻收藏'}<Icon name="chevron-down" size={17} /></a>
        </div>
      </div>
    </section>

    <section className="shell collection" id="collection" tabIndex={-1} aria-labelledby="collection-title">
      <div className="collection-heading">
        <div>
          <h2 id="collection-title">{en ? 'Creators' : '创作者'}</h2>
          <p>{en ? `${authors.length} creators · ${posts.length} archived posts` : `${authors.length} 位作者 · ${posts.length} 篇馆藏文章`}</p>
        </div>
        <button type="button" className="button button-primary" onClick={() => open('newAuthor')}><Icon name="plus" size={18} />{en ? 'Add creator' : '收藏新作者'}</button>
      </div>
      <div className="platform-filters" aria-label={en ? 'Filter by platform' : '按平台筛选'}>
        <button type="button" className="filter-tab" aria-pressed={platformFilter === 'all'} onClick={() => setPlatformFilter('all')}><Icon name="grid" size={15} />{en ? 'All platforms' : '全部平台'}</button>
        {platforms.map(({ id }) => <button type="button" key={id} className="filter-tab" aria-pressed={platformFilter === id} onClick={() => setPlatformFilter(id)}><PlatformBadge platform={id} /></button>)}
      </div>
      {!authors.length && platformFilter === 'all' && <p className="empty-note">{en ? 'Your collection is empty.' : '收藏馆还是空的。'}</p>}
      {groups.map(({ id }) => {
        const creators = authors.filter((author) => author.platform === id)
        if (!creators.length) return platformFilter !== 'all' && <p className="empty-note" key={id}>{en ? 'This shelf is still empty.' : '这层书架还空着。'}</p>
        return <section className="creator-group" key={id}>
          <div className="group-heading">
            <h3><PlatformBadge platform={id} /></h3><span className="group-count">{String(creators.length).padStart(2, '0')}</span>
            <span className="group-rule" />
            <button type="button" className="status-trigger" onClick={() => open('connections')}><ConnectionStatus platform={id} language={language} /></button>
          </div>
          <div className="creator-grid">
            {creators.map((author) => <CreatorCard key={author.id} author={author} language={language} count={posts.filter((post) => post.authorId === author.id).length} />)}
          </div>
        </section>
      })}
    </section>
  </>
}

function CreatorCard({ author, language, count }) {
  return <a className="creator-card" href={authorHref(author.id)}>
    <div className={`creator-card-art ${author.cover ? '' : `pattern-${author.pattern || 'lattice'}`}`}>{author.cover && <img src={author.cover} alt="" loading="lazy" />}</div>
    <div className="creator-card-content">
      <img className="creator-avatar" src={author.avatar} alt="" loading="lazy" />
      <span className="card-arrow"><Icon name="arrow-up-right" size={18} /></span>
      <h4>{local(author.name, language)}</h4>
      {local(author.description, language) && <p>{local(author.description, language)}</p>}
      <div className="creator-card-footer"><Icon name="bookmark" size={15} />{language === 'en' ? `${count} ${count === 1 ? 'post' : 'posts'}` : `${count} 篇文章`}</div>
    </div>
  </a>
}

const pageSize = 6

export function AuthorPage({ author, posts, databasePath, language, open }) {
  const en = language === 'en'
  const [preferences, setPreferences] = useState(() => libraryApi.pageSettings(author.id))
  const [page, setPage] = useState(1)
  const archive = useRef(null)
  const { tasks } = useOperations()
  const running = tasks.find((task) => task.status === 'running' && task.path === databasePath
    && task.rows.some((row) => row.authorId === author.id))
  const authorPosts = posts.filter((post) => post.authorId === author.id)
  const pageCount = Math.max(1, Math.ceil(authorPosts.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const displayed = authorPosts.slice().sort((a, b) => {
    if (preferences.sort === 'title') return local(a.title, language).localeCompare(local(b.title, language), en ? 'en' : 'zh')
    return preferences.sort === 'oldest' ? a.publishedAt.localeCompare(b.publishedAt) : b.publishedAt.localeCompare(a.publishedAt)
  }).slice((currentPage - 1) * pageSize, currentPage * pageSize)

  function changePreference(patch) {
    const next = { ...preferences, ...patch }
    setPreferences(next)
    libraryApi.setPageSettings(author.id, next)
    if (patch.sort) setPage(1)
  }

  function turnPage(next) {
    if (next === currentPage) return
    setPage(next)
    archive.current?.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  }

  return <>
    <section className="author-hero" aria-labelledby="author-title">
      <div className={`author-cover ${author.cover ? 'has-cover' : `pattern-${author.pattern || 'lattice'}`}`}>
        {author.cover && <>
          <img className="author-cover-backdrop" src={author.cover} alt="" aria-hidden="true" />
          <img className="author-cover-image" src={author.cover} alt="" fetchPriority="high" />
        </>}
      </div>
      <div className="shell author-profile">
        <img className="profile-avatar" src={author.avatar} alt="" />
        <div className="profile-main">
          <div className="profile-kicker">
            <a href={webUrl(author.url) || platforms.find(({ id }) => id === author.platform)?.url} target="_blank" rel="noreferrer"><PlatformBadge platform={author.platform} /><Icon name="arrow-up-right" size={14} /></a>
            <button className="status-trigger" type="button" onClick={() => open('connections')}><ConnectionStatus platform={author.platform} language={language} /></button>
          </div>
          <h1 id="author-title">{local(author.name, language)}</h1>
          {local(author.description, language) && <p>{local(author.description, language)}</p>}
        </div>
        <div className="profile-actions">
          <button type="button" className="button button-soft" onClick={() => open('editAuthor')}><Icon name="edit" size={17} />{en ? 'Edit creator' : '编辑作者'}</button>
          <button type="button" className="button button-quiet button-danger" onClick={() => open('deleteAuthor')}><Icon name="trash" size={17} />{en ? 'Delete creator' : '删除作者'}</button>
        </div>
      </div>
    </section>
    <section className="shell author-library" aria-labelledby="author-library-title" ref={archive}>
      <nav className="breadcrumbs" aria-label={en ? 'Breadcrumb' : '页面路径'}><a href="#/"><Icon name="arrow-left" size={16} />{en ? 'Collection' : '收藏馆'}</a><Icon name="chevron-right" size={13} /><span aria-current="page">{local(author.name, language)}</span></nav>
      <div className="collection-heading">
        <div>
          <h2 id="author-library-title">{en ? 'Archived posts' : '馆藏文章'}</h2>
          <p>{en ? `${authorPosts.length} ${authorPosts.length === 1 ? 'entry' : 'entries'} on this shelf` : `这一页收藏了 ${authorPosts.length} 篇文章`}</p>
        </div>
        <button className="button button-primary" type="button" onClick={() => open('newPost')}><Icon name="plus" size={18} />{en ? 'Add post' : '添加文章'}</button>
      </div>
      <div className="post-tools">
        <div className="sort-control">
          <Icon name="filter" size={16} />
          <Select label={en ? 'Sort posts' : '文章排序'} language={language} value={preferences.sort} onChange={(sort) => changePreference({ sort })} compact options={[
            { value: 'newest', label: en ? 'Newest first' : '最近发布' },
            { value: 'oldest', label: en ? 'Oldest first' : '最早发布' },
            { value: 'title', label: en ? 'By title' : '按标题' },
          ]} />
        </div>
        <div className="layout-switch">
          <button type="button" className="icon-button" aria-label={en ? 'Two columns' : '双列'} aria-pressed={preferences.layout === 'double'} onClick={() => changePreference({ layout: 'double' })}><Icon name="grid" size={17} /></button>
          <button type="button" className="icon-button" aria-label={en ? 'One column' : '单列'} aria-pressed={preferences.layout === 'single'} onClick={() => changePreference({ layout: 'single' })}><Icon name="list" size={19} /></button>
        </div>
      </div>
      {running && <button className="author-task-progress" type="button" onClick={() => open('tasks')}>
        <Icon name="activity" size={17} />
        <span>{en ? 'Archive task in progress' : '归档任务进行中'}</span>
        <progress max={running.total} value={running.completed} />
        <span>{running.completed} / {running.total}</span>
        <Icon name="chevron-right" size={16} />
      </button>}
      {displayed.length ? <div className={`post-grid layout-${preferences.layout}`}>{displayed.map((post) => <PostCard key={post.id} post={post} language={language} />)}</div>
        : <p className="empty-note">{en ? 'No posts on this shelf yet.' : '这位作者还没有馆藏文章。'}</p>}
      {pageCount > 1 && <nav className="pagination" aria-label={en ? 'Pagination' : '分页'}>
        <button type="button" className="icon-button" disabled={currentPage === 1} aria-label={en ? 'Previous page' : '上一页'} onClick={() => turnPage(currentPage - 1)}><Icon name="chevron-left" size={17} /></button>
        {Array.from({ length: pageCount }, (_, index) => index + 1).filter((item) => item === 1 || item === pageCount || Math.abs(item - currentPage) <= 2)
          .map((item, index, visible) => <span key={item}>{index > 0 && visible[index - 1] < item - 1 && <span className="page-gap">…</span>}
            <button type="button" className="icon-button" aria-current={currentPage === item ? 'page' : undefined} onClick={() => turnPage(item)}>{item}</button></span>)}
        <button type="button" className="icon-button" disabled={currentPage === pageCount} aria-label={en ? 'Next page' : '下一页'} onClick={() => turnPage(currentPage + 1)}><Icon name="chevron-right" size={17} /></button>
      </nav>}
    </section>
  </>
}

function PostCard({ post, language }) {
  return <a className="post-card" href={postHref(post.id)}>
    <div className="post-card-art"><img src={post.cover} alt="" loading="lazy" /></div>
    <div className="post-card-content">
      <time dateTime={post.publishedAt}>{formatDate(post.publishedAt, language)}</time>
      <h3>{local(post.title, language)}</h3>
      {local(post.subtitle, language) && <p>{local(post.subtitle, language)}</p>}
      <span className="card-arrow"><Icon name="arrow-up-right" size={18} /></span>
    </div>
  </a>
}

export function PostPage({ post, author, posts, language, open }) {
  const en = language === 'en'
  const title = local(post.title, language)
  return <>
    <nav className="breadcrumbs" aria-label={en ? 'Breadcrumb' : '页面路径'}>
      <a href={authorHref(author.id)}><Icon name="arrow-left" size={16} />{local(author.name, language)}</a><Icon name="chevron-right" size={13} /><span aria-current="page">{title}</span>
    </nav>
    <article className="reader">
      <header className="reader-intro">
        <h1>{title}</h1>
        {local(post.subtitle, language) && <p className="reader-subtitle">{local(post.subtitle, language)}</p>}
        <div className="reader-meta">
          <a href={authorHref(author.id)}><img src={author.avatar} alt="" />{local(author.name, language)}</a>
          <span><Icon name="calendar" size={16} />{en ? 'Published' : '发布'} <time dateTime={post.publishedAt}>{formatDate(post.publishedAt, language)}</time></span>
          <span><Icon name="archive" size={16} />{en ? 'Archived' : '归档'} <time dateTime={post.archivedAt}>{formatDate(post.archivedAt, language)}</time></span>
        </div>
        <div className="reader-actions">
          <button className="button button-soft" type="button" onClick={() => open('editPost')}><Icon name="edit" size={17} />{en ? 'Edit post' : '编辑文章'}</button>
          <button className="button button-quiet" type="button" onClick={() => open('export')}><Icon name="export" size={17} />{en ? 'Export post' : '导出文章'}</button>
          <button className="button button-quiet button-danger" type="button" onClick={() => open('deletePost')}><Icon name="trash" size={17} />{en ? 'Delete post' : '删除文章'}</button>
        </div>
      </header>
      <div className="reader-cover"><img src={post.cover} alt={title} fetchPriority="high" /></div>
      <PostBody blocks={post.blocks} posts={posts} language={language} />
      <footer className="reader-end"><Icon name="spark" size={23} /><a href={authorHref(author.id)}>{en ? 'Back to the creator’s shelf' : '返回作者档案'}<Icon name="arrow-right" size={17} /></a></footer>
    </article>
  </>
}
