import { useEffect, useRef, useState } from 'react'
import { Extension, InputRule } from '@tiptap/react'
import { webUrl } from '../data/postContent.js'

function imageBlock(href, alt, caption) {
  const src = webUrl(href)
  return src ? { type: 'image', src, alt: alt || '', caption: caption || '' } : null
}

export const MarkdownImage = Extension.create({
  name: 'markdownArchiveImage',
  markdownTokenName: 'image',
  parseMarkdown(token, helpers) {
    const block = imageBlock(token.href, token.text, token.title)
    return block ? helpers.createNode('archiveEmbed', { block }) : helpers.createTextNode(token.text || token.raw)
  },
  addInputRules() {
    return [new InputRule({
      find: /^!\[([^\]\n]*)\]\(((?:[^\s()]|\([^\s()]*\))+)(?:\s+(["'])(.*?)\3)?\)$/,
      handler: ({ state, range, match: [, alt, href, , caption] }) => {
        const block = imageBlock(href, alt, caption)
        if (!block || state.doc.resolve(range.from).depth !== 1) return null
        const embed = state.schema.nodes.archiveEmbed.create({ block })
        state.tr.replaceRangeWith(range.from, range.to, embed).scrollIntoView()
      },
    })]
  },
})

export const MarkdownTableSource = Extension.create({
  name: 'markdownTableSource',
  markdownTokenName: 'table',
  parseMarkdown(token, helpers) {
    return helpers.createNode('codeBlock', { language: 'markdown' }, [helpers.createTextNode(token.raw.trimEnd())])
  },
})

export const MarkdownTaskSource = Extension.create({
  name: 'markdownTaskSource',
  priority: 101,
  markdownTokenName: 'list_item',
  parseMarkdown(token, helpers) {
    if (!token.task) return null
    const tokens = token.tokens?.filter((child) => child.type !== 'checkbox')
    const [item] = helpers.parseChildren([{ ...token, task: false, tokens }])
    const [first, ...rest] = item.content
    const checkbox = helpers.createTextNode(token.checked ? '[x] ' : '[ ] ')
    return { ...item, content: [{ ...first, content: [checkbox, ...(first.content ?? [])] }, ...rest] }
  },
})

// Images use the same top-level nodes as media added from the toolbar.
function liftImages(node) {
  if (!node.content?.length) return [node]
  const result = []
  let group = []

  function appendTextGroup() {
    if (!group.length) return
    if (node.type === 'listItem' && group[0].type !== 'paragraph') group.unshift({ type: 'paragraph' })
    result.push({ ...node, content: group })
    group = []
  }

  for (const child of node.content.flatMap(liftImages)) {
    if (child.type === 'archiveEmbed') {
      appendTextGroup()
      result.push(child)
    } else {
      group.push(child)
    }
  }

  appendTextGroup()
  return result
}

export function insertMarkdown(editor, source) {
  try {
    const nodes = editor.markdown.parse(source).content.flatMap(liftImages)
    return nodes.length > 0 && editor.chain().focus().insertContentAt(editor.state.selection.to, nodes).run()
  } catch {
    return false
  }
}

export function MarkdownPanel({ language, onCancel, onInsert }) {
  const en = language === 'en'
  const textarea = useRef(null)
  const [source, setSource] = useState('')
  const [error, setError] = useState(false)

  useEffect(() => { textarea.current.focus() }, [])

  return <section className="composer-insert-panel" aria-label={en ? 'Insert Markdown' : '插入 Markdown'}>
    <label className="field">
      <span>{en ? 'Markdown source' : 'Markdown 源文'}</span>
      <textarea ref={textarea} className="input composer-markdown-input" rows={6} spellCheck={false}
        placeholder={en ? 'Paste or type Markdown…' : '粘贴或输入 Markdown…'} value={source}
        onChange={(event) => { setSource(event.target.value); setError(false) }} />
    </label>
    {error && <p className="field-error" role="status">{en ? 'This Markdown could not be inserted.' : '无法插入这段 Markdown。'}</p>}
    <div className="composer-insert-actions">
      <button type="button" className="button button-quiet" onClick={onCancel}>{en ? 'Cancel' : '取消'}</button>
      <button type="button" className="button button-soft" disabled={!source.trim()}
        onClick={() => { if (!onInsert(source)) setError(true) }}>{en ? 'Insert' : '插入'}</button>
    </div>
  </section>
}
