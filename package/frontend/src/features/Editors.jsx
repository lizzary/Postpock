import { useState } from 'react'
import Select from '../components/Select.jsx'
import { Dialog, Icon } from '../components/UI.jsx'
import { local, newId, platforms, today } from '../data/library.js'

const updateText = (previous, value, language) => typeof previous === 'object' && previous
  ? { ...previous, [language]: value } : value

export function webUrl(value) {
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) ? url.href : ''
  } catch {
    return ''
  }
}

function AssetField({ label, value, onChange, accept, language }) {
  const en = language === 'en'
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [fileName, setFileName] = useState('')
  const isLocal = value?.startsWith('data:')
  const isFixture = value && !isLocal && !/^[a-z]+:/i.test(value)
  const sourceLabel = isLocal ? fileName || (en ? 'Local file' : '本地文件') : isFixture ? value.split('/').pop() : value

  function chooseFile(event) {
    const file = event.target.files[0]
    if (!file) return
    event.target.value = ''
    if (file.size > 16 * 1024 * 1024) {
      setError(en ? 'Choose a file smaller than 16 MB.' : '请选择小于 16 MB 的文件。')
      return
    }
    const reader = new FileReader()
    setError('')
    setPending(true)
    reader.onload = () => {
      setFileName(file.name)
      onChange(reader.result, file)
      setPending(false)
    }
    reader.onerror = () => {
      setPending(false)
      setError(en ? 'This file could not be read.' : '无法读取此文件。')
    }
    reader.readAsDataURL(file)
  }

  return <div className="asset-field field">
    <label><span>{label}</span>
      <input className="input" type={isLocal || isFixture ? 'text' : 'url'} value={sourceLabel || ''} readOnly={isLocal || isFixture}
        placeholder={en ? 'https://…' : '输入网址或选取本地文件'}
        pattern={isLocal || isFixture ? undefined : 'https?://.+'}
        onChange={(event) => onChange(event.target.value)} />
    </label>
    <label className="button button-soft file-picker"><Icon name="folder" size={16} />{pending ? (en ? 'Reading…' : '读取中…') : (en ? 'Browse' : '浏览')}
      <input type="file" accept={accept} onChange={chooseFile} disabled={pending} />
    </label>
    {value && <button className="icon-button" type="button" onClick={() => { setFileName(''); onChange('') }}
      aria-label={en ? 'Remove file' : '移除文件'}><Icon name="x" size={16} /></button>}
    {error && <p className="field-error" role="status">{error}</p>}
  </div>
}

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

const blockTypes = [
  ['text', '文本', 'Text'], ['image', '图片', 'Image'], ['audio', '音频', 'Audio'], ['video', '视频', 'Video'],
  ['attachment', '附件', 'File'], ['link', '链接', 'Link'], ['linkCard', '链接卡', 'Link card'],
]

const mediaFormats = { image: 'image/*', audio: 'audio/*', video: 'video/*', attachment: '*/*' }

function fileRecord(block) {
  const path = block.src.split(/[?#]/)[0]
  const fileName = block.name || (path.startsWith('data:') ? '' : path.split('/').pop())
  return { name: fileName || block.type, src: block.src, type: block.type, bytes: block.bytes }
}

export function PostEditor({ post, author, authors, posts, language, onClose, onSave }) {
  const en = language === 'en'
  const [cover, setCover] = useState({ src: post?.cover ?? '' })
  const [blocks, setBlocks] = useState(() => (post?.blocks ?? []).map((block) => ({ ...block, editorId: newId() })))
  const [newType, setNewType] = useState('text')
  const label = (type) => blockTypes.find(([id]) => id === type)?.[en ? 2 : 1]
  const change = (id, patch) => setBlocks((current) => current.map((block) => block.editorId === id ? { ...block, ...patch } : block))
  const move = (index, offset) => setBlocks((current) => {
    const next = current.slice()
    const target = index + offset
    const block = next[index]
    next[index] = next[target]
    next[target] = block
    return next
  })
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
    if (event.currentTarget.querySelector('.file-picker input:disabled')) return
    const fields = new FormData(event.currentTarget)
    const title = fields.get('title').trim()
    if (!title) return
    const cleanBlocks = blocks.map(({ editorId, ...block }) => block)
      .filter((block) => block.type === 'text' ? local(block.text, language).trim()
        : mediaFormats[block.type] ? block.src : block.postId || webUrl(block.url))
    const files = cleanBlocks.filter((block) => mediaFormats[block.type]).map((block) => {
      const existing = post?.files.find((file) => file.src === block.src && file.type === block.type)
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
    eyebrow={local(author.name, language)} onClose={onClose} wide>
    <form className="editor-form" onSubmit={submit}>
      <label className="field"><span>{en ? 'Title' : '标题'}</span><input className="input" name="title" required defaultValue={local(post?.title, language)} maxLength={150} pattern=".*\S.*" /></label>
      <label className="field"><span>{en ? 'Subtitle' : '副标题或简介'}</span><input className="input" name="subtitle" defaultValue={local(post?.subtitle, language)} maxLength={300} /></label>
      <div className="form-pair">
        <label className="field"><span>{en ? 'Publication date' : '发布日期'}</span><input className="input" type="date" name="publishedAt" defaultValue={post?.publishedAt || today()} required /></label>
        <label className="field"><span>{en ? 'Archive date' : '归档日期'}</span><input className="input" type="date" name="archivedAt" defaultValue={post?.archivedAt || today()} required /></label>
      </div>
      <AssetField label={en ? 'Cover image' : '封面图'} value={cover.src} onChange={(src, file) => setCover({ src, name: file?.name, bytes: file?.size })} accept="image/*" language={language} />
      <fieldset className="post-block-editor">
        <legend>{en ? 'Post content' : '文章正文'}</legend>
        {blocks.map((block, index) => <section className="editor-block" key={block.editorId}>
          <div className="editor-block-head">
            <strong>{String(index + 1).padStart(2, '0')} / {label(block.type)}</strong>
            <div>
              <button type="button" className="icon-button move-up" disabled={index === 0} onClick={() => move(index, -1)} aria-label={en ? 'Move up' : '上移'}><Icon name="chevron-down" size={16} /></button>
              <button type="button" className="icon-button" disabled={index === blocks.length - 1} onClick={() => move(index, 1)} aria-label={en ? 'Move down' : '下移'}><Icon name="chevron-down" size={16} /></button>
              <button type="button" className="icon-button" onClick={() => setBlocks((current) => current.filter((entry) => entry.editorId !== block.editorId))} aria-label={en ? 'Remove block' : '移除内容块'}><Icon name="trash" size={16} /></button>
            </div>
          </div>
          {block.type === 'text' && <textarea className="input" rows="4" aria-label={label('text')} value={local(block.text, language)} onChange={(event) => change(block.editorId, { text: updateText(block.text, event.target.value, language) })} />}
          {mediaFormats[block.type] && <>
            <AssetField label={label(block.type)} value={block.src} onChange={(src, file) => change(block.editorId, { src, name: file?.name, bytes: file?.size })} accept={mediaFormats[block.type]} language={language} />
            {block.type !== 'attachment' && <label className="field"><span>{en ? 'Caption' : '说明'}</span><input className="input" value={local(block.caption, language)} onChange={(event) => change(block.editorId, { caption: updateText(block.caption, event.target.value, language) })} /></label>}
          </>}
          {['link', 'linkCard'].includes(block.type) && <>
            <label className="field"><span>{en ? 'Link title' : '链接标题'}</span><input className="input" value={local(block.title, language)} onChange={(event) => change(block.editorId, { title: updateText(block.title, event.target.value, language) })} /></label>
            <Select showLabel searchable label={en ? 'Link to an archived post' : '链接到库内文章'} value={block.postId ?? ''} language={language}
              options={linkTargets} onChange={(postId) => change(block.editorId, { postId })} />
            {!block.postId && <label className="field"><span>URL</span><input className="input" type="url" value={block.url ?? ''} pattern="https?://.+" onChange={(event) => change(block.editorId, { url: event.target.value })} /></label>}
            {block.type === 'linkCard' && <>
              <label className="field"><span>{en ? 'Description' : '链接简介'}</span><input className="input" value={local(block.text, language)} onChange={(event) => change(block.editorId, { text: updateText(block.text, event.target.value, language) })} /></label>
              <AssetField label={en ? 'Card image' : '链接卡配图'} value={block.image} onChange={(image) => change(block.editorId, { image })} accept="image/*" language={language} />
            </>}
          </>}
        </section>)}
        <div className="add-block">
          <Select label={en ? 'Content type' : '内容类型'} value={newType} onChange={setNewType} language={language}
            options={blockTypes.map(([type]) => ({ value: type, label: label(type) }))} />
          <button className="button button-soft" type="button" onClick={() => setBlocks((current) => [...current, { type: newType, editorId: newId() }])}><Icon name="plus" size={16} />{en ? 'Add block' : '添加内容'}</button>
        </div>
      </fieldset>
      <div className="dialog-actions"><button type="button" className="button button-quiet" onClick={onClose}>{en ? 'Cancel' : '取消'}</button>
        <button className="button button-primary"><Icon name="check" size={17} />{en ? 'Save post' : '保存文章'}</button></div>
    </form>
  </Dialog>
}
