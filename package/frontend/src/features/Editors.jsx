import { lazy, Suspense, useRef, useState } from 'react'
import Select from '../components/Select.jsx'
import { Dialog, Icon } from '../components/UI.jsx'
import { local, platforms, today } from '../data/library.js'
import { mediaFormats, updateText, webUrl } from '../data/postContent.js'
import AssetField from './AssetField.jsx'

const PostComposer = lazy(() => import('./PostComposer.jsx'))

export function AuthorEditor({ author, language, onClose, onSave }) {
  const en = language === 'en'
  const [platform, setPlatform] = useState(author?.platform ?? platforms[0].id)
  const [avatar, setAvatar] = useState(author?.avatar ?? '')
  const [cover, setCover] = useState(author?.cover ?? '')

  function submit(event) {
    event.preventDefault()
    if (event.currentTarget.querySelector('.file-picker input:disabled')) return
    const fields = new FormData(event.currentTarget)
    const name = fields.get('name').trim()
    if (!name) return
    onSave({
      ...author, platform, avatar, cover,
      name: updateText(author?.name, name, language),
      description: updateText(author?.description, fields.get('description').trim(), language),
      url: webUrl(fields.get('url')) || platforms.find((entry) => entry.id === platform).url,
    })
  }

  return <Dialog title={author ? (en ? 'Edit creator' : '编辑作者') : (en ? 'Add a creator' : '收藏新作者')}
    eyebrow={en ? 'COLLECTION' : '收藏馆'} onClose={onClose}>
    <form className="editor-form" onSubmit={submit}>
      <div className="form-pair">
        <label className="field"><span>{en ? 'Creator name' : '作者名称'}</span><input className="input" name="name" defaultValue={local(author?.name, language)} required maxLength={80} pattern=".*\S.*" /></label>
        <Select showLabel label={en ? 'Platform' : '所属平台'} value={platform} onChange={setPlatform} language={language}
          options={platforms.map((entry) => ({ value: entry.id, label: entry.name }))} />
      </div>
      <label className="field"><span>{en ? 'Creator page URL' : '作者主页链接'}</span><input className="input" type="url" name="url" defaultValue={author?.url} placeholder={platforms.find((entry) => entry.id === platform).url} pattern="https?://.+" /></label>
      <AssetField label={en ? 'Avatar (optional)' : '头像（可选）'} value={avatar} onChange={setAvatar} accept="image/*" language={language} />
      <AssetField label={en ? 'Header image (optional)' : '头图（可选）'} value={cover} onChange={setCover} accept="image/*" language={language} />
      <label className="field"><span>{en ? 'Biography' : '作者简介'}</span><textarea className="input" name="description" rows="3" defaultValue={local(author?.description, language)} maxLength={1000} /></label>
      <div className="dialog-actions"><button type="button" className="button button-quiet" onClick={onClose}>{en ? 'Cancel' : '取消'}</button>
        <button className="button button-primary"><Icon name="check" size={17} />{en ? 'Save creator' : '保存作者'}</button></div>
    </form>
  </Dialog>
}

function fileRecord(block) {
  const path = block.src.split(/[?#]/)[0]
  const fileName = block.name || (path.startsWith('data:') ? '' : path.split('/').pop())
  return { name: fileName || block.type, src: block.src, type: block.type, bytes: block.bytes }
}

export function PostEditor({ post, author, authors, posts, language, onClose, onSave }) {
  const en = language === 'en'
  const [cover, setCover] = useState({ src: post?.cover ?? '' })
  const composer = useRef(null)
  const [editorReady, setEditorReady] = useState(false)
  const [draftOpen, setDraftOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const authorNames = new Map(authors.map((entry) => [entry.id, local(entry.name, language)]))
  const linkTargets = [
    { value: '', label: en ? 'External URL' : '外部链接' },
    ...posts.filter((entry) => entry.id !== post?.id).map((entry) => ({
      value: entry.id,
      label: `${authorNames.get(entry.authorId)} / ${local(entry.title, language)}`,
    })),
  ]

  function submit(event) {
    event.preventDefault()
    if (!editorReady || draftOpen || importing || event.currentTarget.querySelector('.file-picker input:disabled')) return
    const fields = new FormData(event.currentTarget)
    const title = fields.get('title').trim()
    if (!title) return
    const cleanBlocks = composer.current.readBlocks()
    const files = cleanBlocks.filter((block) => mediaFormats[block.type]).map((block) => {
      const existing = post?.files.find((file) => file.src === block.src && file.type === block.type
        && (!block.name || file.name === block.name))
      return existing ?? fileRecord(block)
    })
    const coverSource = cover.src || author.cover || author.avatar
    files.unshift(post?.files.find((file) => file.type === 'cover' && file.src === coverSource)
      ?? { ...fileRecord({ ...cover, src: coverSource, type: 'cover' }), type: 'cover' })
    onSave({
      ...post, authorId: author.id, title: updateText(post?.title, title, language),
      subtitle: updateText(post?.subtitle, fields.get('subtitle').trim(), language),
      cover: coverSource, publishedAt: fields.get('publishedAt'), archivedAt: fields.get('archivedAt'), blocks: cleanBlocks, files,
    })
  }

  return <Dialog title={post ? (en ? 'Edit post' : '编辑文章') : (en ? 'Add a post' : '添加文章')}
    eyebrow={local(author.name, language)} onClose={onClose} className="post-editor-dialog">
    <form className="editor-form" onSubmit={submit}>
      <label className="field"><span>{en ? 'Title' : '标题'}</span><input className="input" name="title" required defaultValue={local(post?.title, language)} maxLength={150} pattern=".*\S.*" /></label>
      <label className="field"><span>{en ? 'Subtitle' : '副标题或简介'}</span><input className="input" name="subtitle" defaultValue={local(post?.subtitle, language)} maxLength={300} /></label>
      <div className="form-pair">
        <label className="field"><span>{en ? 'Publication date' : '发布日期'}</span><input className="input" type="date" name="publishedAt" defaultValue={post?.publishedAt || today()} required /></label>
        <label className="field"><span>{en ? 'Archive date' : '归档日期'}</span><input className="input" type="date" name="archivedAt" defaultValue={post?.archivedAt || today()} required /></label>
      </div>
      <AssetField label={en ? 'Cover image' : '封面图'} value={cover.src} onChange={(src, file) => setCover({ src, name: file?.name, bytes: file?.size })} accept="image/*" language={language} />
      <Suspense fallback={<p className="composer-loading" role="status">{en ? 'Loading editor…' : '正在加载正文编辑器…'}</p>}>
        <PostComposer ref={composer} blocks={post?.blocks ?? []} posts={posts} linkTargets={linkTargets} language={language}
          onDraftChange={setDraftOpen} onImportingChange={setImporting} onReady={setEditorReady} />
      </Suspense>
      <div className="dialog-actions"><button type="button" className="button button-quiet" onClick={onClose}>{en ? 'Cancel' : '取消'}</button>
        <button className="button button-primary" disabled={!editorReady || draftOpen || importing}><Icon name="check" size={17} />{en ? 'Save post' : '保存文章'}</button></div>
    </form>
  </Dialog>
}
