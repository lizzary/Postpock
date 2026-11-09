import { local } from './library.js'

export const mediaFormats = { image: 'image/*', audio: 'audio/*', video: 'video/*', attachment: '*/*' }
export const postHref = (id) => `#/post/${encodeURIComponent(id)}`

export const updateText = (previous, value, language) => typeof previous === 'object' && previous
  ? { ...previous, [language]: value } : value

export function webUrl(value) {
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) ? url.href : ''
  } catch {
    return ''
  }
}

export function bodyLink(value) {
  return /^#\/post\/[^/?#]+$/.test(value) ? value : webUrl(value)
}

export function richNode(value, language) {
  return value?.type ? value : value?.[language] ?? value?.zh ?? value?.en
}

function textNodes(text) {
  return text.split('\n').flatMap((line, index) => [
    ...(index ? [{ type: 'hardBreak' }] : []), ...(line ? [{ type: 'text', text: line }] : []),
  ])
}

function textBlock(block, language) {
  return richNode(block.richText, language) ?? { type: 'paragraph', content: textNodes(local(block.text, language)) }
}

export function toEditorContent(blocks, language) {
  const other = language === 'en' ? 'zh' : 'en'
  const content = blocks.map((block, index) => {
    if (block.type !== 'text') return { type: 'archiveEmbed', attrs: { block } }
    const node = textBlock(block, language)
    if (typeof block.text !== 'object') return node
    return { ...node, attrs: { ...node.attrs, translation: { index, node: textBlock(block, other) } } }
  })
  if (content.at(-1)?.type !== 'paragraph') content.push({ type: 'paragraph' })
  return { type: 'doc', content }
}

function localizedNode(node, translations) {
  const { translation, ...attrs } = node.attrs ?? {}
  if (translations && translation) {
    if (translations.has(translation.index)) return { type: 'paragraph' }
    translations.add(translation.index)
    return translation.node
  }
  return {
    type: node.type,
    ...(node.text !== undefined && { text: node.text }),
    ...(node.marks?.length && { marks: node.marks }),
    ...(Object.keys(attrs).length && { attrs }),
    ...(node.content?.length && { content: node.content.map((child) => localizedNode(child, translations)) }),
  }
}

function plainText(node) {
  if (node.type === 'hardBreak') return '\n'
  if (node.text !== undefined) return node.text
  const separator = ['paragraph', 'heading', 'codeBlock'].includes(node.type) ? '' : '\n'
  return node.content?.map(plainText).join(separator) ?? ''
}

export function fromEditorContent({ content = [] }, language) {
  const other = language === 'en' ? 'zh' : 'en'
  const last = content.findLastIndex((node) => node.type !== 'paragraph' || node.content?.length || node.attrs?.translation)
  const translations = new Set()
  return content.slice(0, last + 1).map((node) => {
    if (node.type === 'archiveEmbed') return node.attrs.block
    const primary = localizedNode(node)
    const alternate = localizedNode(node, translations)
    if (JSON.stringify(primary) === JSON.stringify(alternate)) {
      return { type: 'text', text: plainText(primary), richText: primary }
    }
    return {
      type: 'text',
      text: { [language]: plainText(primary), [other]: plainText(alternate) },
      richText: { [language]: primary, [other]: alternate },
    }
  })
}
