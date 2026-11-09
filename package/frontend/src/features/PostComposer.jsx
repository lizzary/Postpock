import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Markdown } from '@tiptap/markdown'
import { EditorContent, Extension, Node, NodeViewWrapper, ReactNodeViewRenderer, useEditor, useEditorState } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Select from '../components/Select.jsx'
import { Icon } from '../components/UI.jsx'
import { local } from '../data/library.js'
import { bodyLink, fromEditorContent, mediaFormats, postHref, toEditorContent, updateText, webUrl } from '../data/postContent.js'
import AssetField from './AssetField.jsx'
import PostBody from './PostBody.jsx'
import { MarkdownImage, MarkdownPanel, MarkdownTableSource, MarkdownTaskSource, insertMarkdown } from './PostMarkdown.jsx'
import PostFileDrop from './PostFileDrop.js'
import './post-composer.css'

const inserts = {
  image: ['图片', 'Image', 'image'], audio: ['音频', 'Audio', 'music'],
  video: ['视频', 'Video', 'video'], attachment: ['附件', 'File', 'file'],
  link: ['链接', 'Link', 'link'], linkCard: ['链接卡', 'Link card', 'bookmark'],
}

function EmbedView({ node, extension, getPos, deleteNode, selected }) {
  const { language, openDraft } = extension.options
  const en = language === 'en'
  const block = node.attrs.block
  const [zh, english, icon] = inserts[block.type]
  const label = en ? english : zh
  const detail = local(block.caption ?? block.title, language) || block.name
  const image = block.type === 'image' ? block.src : block.image
  return <NodeViewWrapper className="composer-embed" data-selected={selected || undefined} contentEditable={false}>
    <span data-drag-handle className="composer-drag" title={en ? 'Drag to move' : '拖动以调整顺序'}><Icon name="menu" size={15} /></span>
    {image ? <img className="composer-thumbnail" src={image} alt="" /> : <span className="composer-embed-icon"><Icon name={icon} size={18} /></span>}
    <span className="composer-embed-copy"><strong>{label}</strong>{detail && <span>{detail}</span>}</span>
    <button type="button" className="icon-button" aria-label={`${en ? 'Edit' : '编辑'} ${label}`} onClick={() => openDraft({ block, getPosition: getPos })}><Icon name="edit" size={16} /></button>
    <button type="button" className="icon-button" aria-label={`${en ? 'Remove' : '移除'} ${label}`} onClick={deleteNode}><Icon name="trash" size={16} /></button>
  </NodeViewWrapper>
}

const ComposerDocument = Node.create({ name: 'doc', topNode: true, content: '(block | archive)+' })
const ArchiveEmbed = Node.create({
  name: 'archiveEmbed',
  group: 'archive',
  atom: true,
  draggable: true,
  addAttributes: () => ({ block: { default: null, rendered: false } }),
  addNodeView: () => ReactNodeViewRenderer(EmbedView),
  renderHTML: ({ node }) => ['div', node.attrs.block.name || node.attrs.block.src || node.attrs.block.url || ''],
})
const PreserveTranslation = Extension.create({
  name: 'preserveTranslation',
  addGlobalAttributes: () => [{
    types: ['paragraph', 'heading', 'blockquote', 'orderedList', 'bulletList', 'codeBlock', 'horizontalRule'],
    attributes: { translation: { default: null, rendered: false, keepOnSplit: false, parseHTML: () => null } },
  }],
})

const formatting = [
  { zh: '粗体', en: 'Bold', mark: 'bold', glyph: <strong>B</strong>, toggle: (chain) => chain.toggleBold() },
  { zh: '斜体', en: 'Italic', mark: 'italic', glyph: <em>I</em>, toggle: (chain) => chain.toggleItalic() },
  { zh: '下划线', en: 'Underline', mark: 'underline', glyph: <u>U</u>, toggle: (chain) => chain.toggleUnderline() },
  { zh: '小标题', en: 'Heading', mark: 'heading', glyph: <strong>H</strong>, toggle: (chain) => chain.toggleHeading({ level: 2 }) },
  { zh: '项目符号列表', en: 'Bulleted list', mark: 'bulletList', glyph: <Icon name="list" size={19} />, toggle: (chain) => chain.toggleBulletList() },
  { zh: '引用', en: 'Quote', mark: 'blockquote', glyph: <span className="composer-quote-glyph">“</span>, toggle: (chain) => chain.toggleBlockquote() },
]

function ComposerTools({ editor, en, disabled, onInsert }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      active: formatting.map(({ mark }) => current.isActive(mark)),
      undo: current.can().undo(),
      redo: current.can().redo(),
    }),
  })
  return <div className="composer-tools" role="group" aria-label={en ? 'Post formatting and inserts' : '正文格式与插入'}>
    <div className="composer-tool-group">
      {formatting.map(({ zh, en: english, mark, glyph, toggle }, index) => {
        const label = en ? english : zh
        return <button className="composer-tool" key={mark} type="button" aria-label={label} title={label}
          aria-pressed={state.active[index]} disabled={disabled} onMouseDown={(event) => event.preventDefault()}
          onClick={() => toggle(editor.chain().focus()).run()}>{glyph}</button>
      })}
    </div>
    <div className="composer-tool-group composer-inserts">
      {Object.entries(inserts).map(([type, [zh, english, icon]]) =>
        <button key={type} className="composer-tool" type="button" disabled={disabled}
          onMouseDown={(event) => event.preventDefault()} onClick={() => onInsert(type)}>
          <Icon name={icon} size={16} /><span>{en ? english : zh}</span>
        </button>)}
      <button className="composer-tool" type="button" disabled={disabled}
        onMouseDown={(event) => event.preventDefault()} onClick={() => onInsert('markdown')}>
        <Icon name="file" size={16} />{en ? 'Insert Markdown' : '插入 Markdown'}
      </button>
    </div>
    <div className="composer-tool-group composer-history">
      <button className="composer-tool" type="button" disabled={disabled || !state.undo} aria-label={en ? 'Undo' : '撤销'}
        title={en ? 'Undo' : '撤销'} onMouseDown={(event) => event.preventDefault()}
        onClick={() => editor.chain().focus().undo().run()}><Icon name="arrow-left" size={17} /></button>
      <button className="composer-tool" type="button" disabled={disabled || !state.redo} aria-label={en ? 'Redo' : '重做'}
        title={en ? 'Redo' : '重做'} onMouseDown={(event) => event.preventDefault()}
        onClick={() => editor.chain().focus().redo().run()}><Icon name="arrow-right" size={17} /></button>
    </div>
  </div>
}

function InsertFields({ draft, language, linkTargets, onCancel, onCommit, onUnlink }) {
  const en = language === 'en'
  const [block, setBlock] = useState(draft.block)
  const [error, setError] = useState('')
  const fields = useRef(null)
  const { type } = block
  const [zh, english, icon] = inserts[type]
  const label = en ? english : zh
  const isMedia = !!mediaFormats[type]
  const change = (patch) => { setBlock((current) => ({ ...current, ...patch })); setError('') }
  const assetSource = (src) => /^(?:data:[^,]*;base64,|\.\/|\/)/.test(src) ? src : webUrl(src)

  useEffect(() => { fields.current.querySelector('.input')?.focus({ preventScroll: true }) }, [])

  function commit() {
    if (fields.current.querySelector('input[type="file"]:disabled')) return
    const url = isMedia ? assetSource(block.src) : webUrl(block.url)
    const image = assetSource(block.image)
    if ((!url && (isMedia || !block.postId)) || (block.image && !image)) {
      setError(en ? 'Enter a valid web address or choose a source.' : '请输入有效的网址，或选择内容来源。')
      return
    }
    onCommit(isMedia ? { ...block, src: url } : { ...block, url, ...(type === 'linkCard' && { image }) })
  }

  return <section ref={fields} className="composer-insert-panel" aria-label={label} onKeyDown={(event) => {
    if (event.key === 'Enter' && !event.defaultPrevented && !event.nativeEvent.isComposing && event.target.matches('input.input')) {
      event.preventDefault()
      commit()
    }
  }}>
    <div className="composer-insert-title"><Icon name={icon} size={17} /><strong>{label}</strong></div>
    {isMedia ? <>
      <AssetField label={en ? 'Source' : '文件来源'} value={block.src} validate={false} accept={mediaFormats[type]} language={language}
        onChange={(src, file) => change({ src, name: file?.name, bytes: file?.size })} />
      {type !== 'attachment' && <label className="field"><span>{en ? 'Caption' : '说明'}</span><input className="input"
        value={local(block.caption, language)} onChange={(event) => change({ caption: updateText(block.caption, event.target.value, language) })} /></label>}
    </> : <>
      <Select showLabel searchable label={en ? 'Link destination' : '链接目标'} value={block.postId ?? ''} language={language}
        options={linkTargets} onChange={(postId) => change({ postId })} />
      {!block.postId && <label className="field"><span>{en ? 'Web address' : '网页地址'}</span><input className="input" inputMode="url" placeholder="https://…"
        value={block.url ?? ''} onChange={(event) => change({ url: event.target.value })} /></label>}
      {!draft.selection && <label className="field"><span>{en ? 'Link title' : '链接标题'}</span><input className="input"
        value={local(block.title, language)} onChange={(event) => change({ title: updateText(block.title, event.target.value, language) })} /></label>}
      {type === 'linkCard' && <>
        <label className="field"><span>{en ? 'Description' : '链接简介'}</span><input className="input"
          value={local(block.text, language)} onChange={(event) => change({ text: updateText(block.text, event.target.value, language) })} /></label>
        <AssetField label={en ? 'Card image' : '链接卡配图'} value={block.image} validate={false} onChange={(image) => change({ image })}
          accept="image/*" language={language} />
      </>}
    </>}
    {error && <p className="field-error" role="status">{error}</p>}
    <div className="composer-insert-actions">
      {draft.existingLink && <button type="button" className="button button-quiet button-danger" onClick={onUnlink}>{en ? 'Remove link' : '移除链接'}</button>}
      <button type="button" className="button button-quiet" onClick={onCancel}>{en ? 'Cancel' : '取消'}</button>
      <button type="button" className="button button-soft" onClick={commit}>{draft.getPosition || draft.existingLink
        ? (en ? 'Apply' : '应用') : (en ? 'Insert' : '插入')}</button>
    </div>
  </section>
}

function fileImportMessage({ name, kind }, en) {
  if (kind === 'placement') return en ? 'Files could not be inserted at this position.' : '无法在当前光标处插入文件。'
  return en ? `“${name}” could not be read.` : `无法读取「${name}」。`
}

export default function PostComposer({ ref, blocks, posts, linkTargets, language, onDraftChange, onImportingChange, onReady }) {
  const en = language === 'en'
  const [preview, setPreview] = useState(false)
  const [draft, setDraft] = useState(null)
  const [fileImport, setFileImport] = useState({ pending: false, failures: [] })
  const [initial] = useState(() => toEditorContent(blocks, language))
  const original = useRef(null)
  const openDraft = (value) => { setDraft(value); onDraftChange(!!value) }
  const editor = useEditor({
    extensions: [
      ComposerDocument,
      StarterKit.configure({
        dropcursor: { class: 'composer-drop-cursor' },
        document: false,
        link: { openOnClick: false, defaultProtocol: 'https', markdownLinks: true, isAllowedUri: (url) => !!bodyLink(url) },
      }),
      ArchiveEmbed.configure({ language, openDraft }),
      Markdown,
      MarkdownImage,
      MarkdownTableSource,
      MarkdownTaskSource,
      PreserveTranslation,
      PostFileDrop.configure({ onStatus: (status) => {
        setFileImport(status)
        onImportingChange(status.pending)
      } }),
    ],
    content: initial,
    onCreate: ({ editor: current }) => {
      original.current = current.state.doc
      onReady(true)
    },
    editorProps: { attributes: {
      class: 'rich-prose composer-canvas',
      role: 'textbox', 'aria-multiline': 'true', 'aria-label': en ? 'Post content' : '文章正文',
      'data-placeholder': en ? 'Write here, or drop files at the cursor…' : '在这里写下正文，也可拖入文件到光标处…',
    } },
  })
  const empty = useEditorState({ editor, selector: ({ editor: current }) => current?.isEmpty ?? true })

  function readBlocks() {
    return !original.current || editor.state.doc.eq(original.current) ? blocks : fromEditorContent(editor.getJSON(), language)
  }

  useImperativeHandle(ref, () => ({ readBlocks }))
  const previewBlocks = preview ? readBlocks() : []

  function insert(type) {
    if (type === 'markdown') {
      openDraft({ markdown: true })
      return
    }
    const href = type === 'link' ? editor.getAttributes('link').href : undefined
    const postId = href?.startsWith('#') ? posts.find(({ id }) => postHref(id) === href)?.id : undefined
    openDraft({
      block: { type, postId, url: postId ? undefined : href },
      selection: type === 'link' && (!editor.state.selection.empty || !!href),
      existingLink: !!href,
    })
  }

  function cancelInsert() {
    openDraft(null)
    editor.commands.focus()
  }

  function commitInsert(block) {
    const chain = editor.chain().focus()
    if (draft.getPosition) {
      const position = draft.getPosition()
      if (position != null) chain.setNodeSelection(position).updateAttributes('archiveEmbed', { block }).run()
    } else if (block.type === 'link') {
      const href = block.postId ? postHref(block.postId) : block.url
      if (draft.selection) chain.extendMarkRange('link').setLink({ href }).run()
      else {
        const title = posts.find(({ id }) => id === block.postId)?.title
        const text = local(block.title, language).trim() || local(title, language) || href
        chain.insertContent({ type: 'text', text, marks: [{ type: 'link', attrs: { href } }] }).run()
      }
    } else {
      chain.insertContentAt(editor.state.selection.to, { type: 'archiveEmbed', attrs: { block } }).run()
    }
    openDraft(null)
  }

  return <fieldset className="post-composer">
    <legend>{en ? 'Post content' : '文章正文'}</legend>
    <div className="composer-header">
      <div className="composer-modes" role="group" aria-label={en ? 'Post content view' : '正文视图'}>
        <button type="button" aria-pressed={!preview} onClick={() => setPreview(false)}><Icon name="edit" size={15} />{en ? 'Write' : '编辑正文'}</button>
        <button type="button" aria-pressed={preview} disabled={!!draft || fileImport.pending} onClick={() => setPreview(true)}><Icon name="file" size={15} />{en ? 'Preview' : '预览正文'}</button>
      </div>
    </div>
    <div hidden={preview}>
      {editor && <ComposerTools editor={editor} en={en} disabled={!!draft} onInsert={insert} />}
      {draft?.markdown && <MarkdownPanel language={language} onCancel={cancelInsert} onInsert={(source) => {
        if (!insertMarkdown(editor, source)) return false
        openDraft(null)
        return true
      }} />}
      {draft?.block && <InsertFields draft={draft} language={language} linkTargets={linkTargets} onCancel={cancelInsert}
        onCommit={commitInsert} onUnlink={() => { editor.chain().focus().extendMarkRange('link').unsetLink().run(); openDraft(null) }} />}
      <div inert={!!draft} className={empty ? 'composer-empty' : undefined}><EditorContent editor={editor} /></div>
      {(fileImport.pending || fileImport.failures.length > 0) && <div className="composer-file-status" role="status">
        {fileImport.pending && <p>{en ? 'Importing files…' : '正在导入文件…'}</p>}
        {fileImport.failures.map((failure, index) => <p className="field-error" key={index}>{fileImportMessage(failure, en)}</p>)}
      </div>}
    </div>
    {preview && <div className="composer-preview">
      {previewBlocks.length ? <PostBody blocks={previewBlocks} posts={posts} language={language} preview />
        : <p className="composer-preview-empty">{en ? 'Your post content will appear here.' : '写下正文后，即可在这里预览。'}</p>}
    </div>}
  </fieldset>
}
