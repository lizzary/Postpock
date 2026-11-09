import { Extension } from '@tiptap/react'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { readLocalFile } from '../data/localFiles.js'

const fileDropKey = new PluginKey('postFileDrop')
const fileTargetClass = 'composer-file-target'
const extensionMime = {
  apng: 'image/apng', avif: 'image/avif', bmp: 'image/bmp', gif: 'image/gif', ico: 'image/x-icon',
  jfif: 'image/jpeg', jpeg: 'image/jpeg', jpg: 'image/jpeg', png: 'image/png', svg: 'image/svg+xml', webp: 'image/webp',
  aac: 'audio/aac', flac: 'audio/flac', m4a: 'audio/mp4', mp3: 'audio/mpeg', oga: 'audio/ogg', ogg: 'audio/ogg',
  opus: 'audio/ogg', wav: 'audio/wav', weba: 'audio/webm',
  avi: 'video/x-msvideo', m4v: 'video/mp4', mkv: 'video/x-matroska', mov: 'video/quicktime', mp4: 'video/mp4',
  mpeg: 'video/mpeg', mpg: 'video/mpeg', ogv: 'video/ogg', webm: 'video/webm',
}

function isFileDrag(event) {
  return event.dataTransfer?.types.includes('Files')
}

async function toEmbed(file) {
  const dot = file.name.lastIndexOf('.')
  const suffix = dot > 0 ? file.name.slice(dot + 1).toLowerCase() : ''
  const inferred = Object.hasOwn(extensionMime, suffix) ? extensionMime[suffix] : ''
  const mime = !file.type || file.type === 'application/octet-stream' ? inferred : file.type
  const category = mime?.split('/')[0]
  const type = ['image', 'audio', 'video'].includes(category) ? category : 'attachment'
  const source = mime && mime !== file.type ? file.slice(0, file.size, mime) : file
  const src = await readLocalFile(source)
  return { type: 'archiveEmbed', attrs: { block: { type, src, name: file.name, bytes: file.size } } }
}

function preventFileNavigation(event) {
  if (event.defaultPrevented || !isFileDrag(event)) return
  event.preventDefault()
  event.dataTransfer.dropEffect = 'none'
}

export default Extension.create({
  name: 'postFileDrop',

  addProseMirrorPlugins() {
    const { editor, options } = this
    let queue = Promise.resolve()
    let pending = 0
    let failures = []

    async function importFiles(view, files, token) {
      const results = await Promise.allSettled(files.map(toEmbed))
      if (view.isDestroyed) return
      const embeds = []
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') embeds.push(result.value)
        else failures.push({ name: files[index].name, kind: 'unreadable' })
      })

      const position = fileDropKey.getState(view.state).get(token)
      let inserted = false
      if (embeds.length) {
        try {
          inserted = editor.chain()
            .insertContentAt(position, embeds, { updateSelection: false })
            .command(({ tr }) => {
              let after
              const lastBlock = embeds.at(-1).attrs.block
              tr.doc.forEach((node, offset) => {
                if (node.attrs.block === lastBlock) after = offset + node.nodeSize
              })
              tr.setMeta(fileDropKey, { remove: token, insertion: { position, after } })
              return tr.docChanged
            })
            .run()
        } catch {
          // A deleted or otherwise invalid insertion point can no longer accept the batch.
        }
        if (!inserted) failures.push({ kind: 'placement' })
      }
      if (!inserted) view.dispatch(view.state.tr.setMeta(fileDropKey, { remove: token }))
      pending -= 1
      options.onStatus({ pending: pending > 0, failures: [...failures] })
    }

    return [new Plugin({
      key: fileDropKey,
      state: {
        init: () => new Map(),
        apply(transaction, anchors) {
          const action = transaction.getMeta(fileDropKey)
          if (!transaction.docChanged && !action) return anchors
          const mapped = new Map()
          for (const [token, position] of anchors) {
            if (token === action?.remove) continue
            const nextPosition = position === action?.insertion?.position
              ? action.insertion.after ?? transaction.mapping.map(position, 1)
              : transaction.mapping.map(position, -1)
            mapped.set(token, nextPosition)
          }
          if (action?.add) mapped.set(...action.add)
          return mapped
        },
      },
      view() {
        const preventOutsideDrop = (event) => preventFileNavigation(event)
        window.addEventListener('dragover', preventOutsideDrop)
        window.addEventListener('drop', preventOutsideDrop)
        return { destroy() {
          window.removeEventListener('dragover', preventOutsideDrop)
          window.removeEventListener('drop', preventOutsideDrop)
        } }
      },
      props: {
        handleDOMEvents: {
          dragover(view, event) {
            if (!isFileDrag(event) || view.dom.closest('[inert]')) return false
            event.preventDefault()
            event.dataTransfer.dropEffect = 'copy'
            view.dom.classList.add(fileTargetClass)
            return true
          },
          dragleave(view, event) {
            if (!view.dom.contains(event.relatedTarget)) view.dom.classList.remove(fileTargetClass)
            return false
          },
          drop(view, event) {
            view.dom.classList.remove(fileTargetClass)
            const files = Array.from(event.dataTransfer?.files ?? [])
            if (!files.length || view.dom.closest('[inert]')) return false
            event.preventDefault()
            const token = Symbol()
            view.dispatch(view.state.tr.setMeta(fileDropKey, { add: [token, view.state.selection.to] }))
            if (!pending) failures = []
            pending += 1
            options.onStatus({ pending: true, failures: [...failures] })
            queue = queue.then(() => importFiles(view, files, token))
            return true
          },
        },
      },
    })]
  },
})
