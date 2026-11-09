import { createElement } from 'react'
import { Icon } from '../components/UI.jsx'
import { local } from '../data/library.js'
import { bodyLink, postHref, richNode, webUrl } from '../data/postContent.js'
import './post-body.css'

const richTags = {
  paragraph: 'p', blockquote: 'blockquote', bulletList: 'ul', orderedList: 'ol', listItem: 'li',
}
const markTags = { bold: 'strong', italic: 'em', underline: 'u', strike: 's', code: 'code' }

function RichText({ node }) {
  if (node.type === 'text') {
    return (node.marks ?? []).reduce((text, { type, attrs }) => {
      if (type === 'link') {
        const href = bodyLink(attrs.href)
        return href ? <a href={href} {...externalTarget(href)}>{text}</a> : text
      }
      return markTags[type] ? createElement(markTags[type], null, text) : text
    }, node.text)
  }
  const children = node.content?.map((child, index) => <RichText key={index} node={child} />)
  if (node.type === 'heading') {
    const tag = [1, 2, 3, 4, 5, 6].includes(node.attrs?.level) ? `h${node.attrs.level}` : 'h2'
    return createElement(tag, null, children)
  }
  if (node.type === 'codeBlock') return <pre><code>{children}</code></pre>
  if (node.type === 'hardBreak') return <br />
  if (node.type === 'horizontalRule') return <hr />
  const attrs = node.type === 'orderedList' && node.attrs?.start > 1 ? { start: node.attrs.start } : null
  return richTags[node.type] ? createElement(richTags[node.type], attrs, children) : children
}

function externalTarget(href) {
  return href.startsWith('#') ? {} : { target: '_blank', rel: 'noreferrer' }
}

export default function PostBody({ blocks, posts, language, preview = false }) {
  return <div className={`reader-body${preview ? ' body-preview' : ''}`} onClick={preview ? (event) => {
    if (event.target.closest('a[href^="#/post/"]')) event.preventDefault()
  } : undefined}>
    {blocks.map((block, index) => <ContentBlock key={index} block={block} posts={posts} language={language} />)}
  </div>
}

function ContentBlock({ block, posts, language }) {
  const en = language === 'en'
  const caption = local(block.caption, language)
  if (block.type === 'text') {
    const node = richNode(block.richText, language)
    if (node) return <div className="rich-prose"><RichText node={node} /></div>
    return <div className="prose">{local(block.text, language).split(/\n\n+/).map((text, index) => <p key={index}>{text}</p>)}</div>
  }
  if (block.type === 'image') return <figure className="reader-image"><img src={block.src} alt={local(block.alt, language) || caption} loading="lazy" />{caption && <figcaption>{caption}</figcaption>}</figure>
  if (block.type === 'audio' || block.type === 'video') {
    const Media = block.type
    return <figure className={`reader-media media-${block.type}`}>{caption && <figcaption><Icon name={block.type === 'audio' ? 'music' : 'video'} size={18} />{caption}</figcaption>}
      <Media controls src={block.src} preload="metadata" aria-label={caption || (block.type === 'audio' ? (en ? 'Audio' : '音频') : (en ? 'Video' : '视频'))} /></figure>
  }
  if (block.type === 'attachment') return <a className="reader-attachment" href={block.src} download={block.name || true}><Icon name="file" /><span>{block.name || (en ? 'Attachment' : '附件')}</span><Icon name="download" /></a>
  if (!['link', 'linkCard'].includes(block.type)) return null
  const linked = posts.find((post) => post.id === block.postId)
  const href = linked ? postHref(linked.id) : webUrl(block.url)
  if (!href) return null
  const linkTitle = local(block.title, language) || local(linked?.title, language) || href
  const target = externalTarget(href)
  if (block.type === 'link') return <a className="reader-link" href={href} {...target}><Icon name="link" size={18} />{linkTitle}<Icon name="arrow-up-right" size={15} /></a>
  const image = block.image || linked?.cover
  return <a className="reader-link-card" href={href} {...target}>
    {image && <img src={image} alt="" loading="lazy" />}
    <span><strong>{linkTitle}</strong>{local(block.text, language) && <small>{local(block.text, language)}</small>}</span>
    <Icon name="arrow-up-right" size={19} />
  </a>
}
