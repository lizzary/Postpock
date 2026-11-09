import { useSyncExternalStore } from 'react'
import { removeLibraryRecords } from './operations.js'

export const platforms = [
  { id: 'fanbox', name: 'Fanbox', url: 'https://www.fanbox.cc/' },
  { id: 'fantia', name: 'Fantia', url: 'https://fantia.jp/' },
  { id: 'patreon', name: 'Patreon', url: 'https://www.patreon.com/' },
  { id: 'x', name: 'X', url: 'https://x.com/' },
]

export function local(value, language) {
  return typeof value === 'string' ? value : value?.[language] ?? value?.zh ?? value?.en ?? ''
}

export function asset(path) {
  return import.meta.env.BASE_URL + path
}

export function today() {
  const date = new Date()
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part) => String(part).padStart(2, '0')).join('-')
}

export function newId() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function formatDate(value, language) {
  if (!value) return ''
  return new Intl.DateTimeFormat(language === 'zh' ? 'zh-CN' : 'en', {
    year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC',
  }).format(new Date(value))
}

const illustrated = (name) => asset(`art/${name}.svg`)
const profiles = [
  ['mio', 'fanbox', '澪 / MIO', '把海、月亮和那些来不及寄出的信画下来。', 'Painting the sea, the moon, and letters never sent.', 'moon-coast', 'https://www.fanbox.cc/'],
  ['ame', 'fanbox', '雨栖 / AME', '雨后街角的采集者，偶尔画一点旧电车。', 'Collecting rain-washed street corners and the occasional tram.', 'rain-station', 'https://www.fanbox.cc/'],
  ['mori', 'fanbox', '森屿 / MORI', '虚构小镇的植物图鉴与纸上散步。', 'A botanical atlas and paper walks through imaginary towns.', 'moss-library', 'https://www.fanbox.cc/'],
  ['komorebi', 'fantia', '木漏日', '把下午四点的光收进一页速写。', 'Saving the four-o’clock light in a page of sketches.', 'amber-room', 'https://fantia.jp/'],
  ['nami', 'patreon', 'Nami Studio', '云层之上的颜色练习与创作笔记。', 'Color studies and studio notes from above the clouds.', 'cloud-diary', 'https://www.patreon.com/'],
  ['sable', 'x', 'Sable Sketches', '虚构天文台的来信与场景速写。', 'Letters from an imaginary observatory and scenes from the road.', 'dune-observatory', 'https://x.com/'],
]

const authors = profiles.map(([id, platform, name, zh, en, scene, url]) => ({
  id, platform, name, description: { zh, en }, cover: illustrated(scene), avatar: illustrated(`avatar-${id}`), url,
}))

const defaultAuthorImages = {
  cover: [
    ...authors.map(({ cover }) => cover),
    ...['lake-lanterns', 'persimmon-lane', 'snowbound-post', 'hillside-greenhouse'].map(illustrated),
  ],
  avatar: authors.map(({ avatar }) => avatar),
}

const normalizeImagePath = (path) => path?.replace(/^\.\//, '/')
export function isDefaultAuthorImage(type, src) {
  const path = normalizeImagePath(src)
  return defaultAuthorImages[type].some((image) => normalizeImagePath(image) === path)
}

function withDefaultAuthorImages({ pattern: _pattern, ...author }, pickImage) {
  return {
    ...author,
    cover: author.cover || pickImage(defaultAuthorImages.cover),
    avatar: author.avatar || pickImage(defaultAuthorImages.avatar),
  }
}

function restoreAuthor(author) {
  // Older records may have no image. Use their ID to keep the replacement stable across reloads.
  return withDefaultAuthorImages(author, (images) => {
    let hash = 0
    for (const char of author.id) hash = (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0
    return images[hash % images.length]
  })
}

const scenes = [
  ['mio', 'moon-coast', '给月亮的回信', 'A Letter to the Moon', '海边夜行手记 · 第四章', 'Coastal field notes · chapter four', '2026-11-06'],
  ['mio', 'cloud-diary', '云朵归还日', 'The Day We Returned the Clouds', '关于天空的三张色稿', 'Three color studies of the sky', '2026-11-03'],
  ['mio', 'dune-observatory', '观星站的窗', 'An Observatory Window', '夜行途中', 'On a night walk', '2026-10-29'],
  ['mio', 'rain-station', '电车到站以前', 'Before the Tram Arrives', '城市的微光', 'A faint city glow', '2026-10-23'],
  ['mio', 'amber-room', '不慌不忙的早晨', 'An Unhurried Morning', '', '', '2026-10-20'],
  ['mio', 'moss-library', '苔藓邮局', 'The Moss Post Office', '', '', '2026-10-18'],
  ['mio', 'moon-coast', '留声机与远潮', 'The Gramophone and the Tide', '', '', '2026-10-10'],
  ['mio', 'cloud-diary', '浅蓝一百次', 'Pale Blue, a Hundred Times', '', '', '2026-09-27'],
  ['ame', 'rain-station', '雨停在末班车之前', 'Rain Before the Last Tram', '雨中速写', 'Sketches in the rain', '2026-11-06'],
  ['ame', 'amber-room', '十一月的灯', 'A November Lamp', '', '', '2026-11-03'],
  ['mori', 'moss-library', '林地拾遗', 'Things Found in the Woods', '小镇植物图鉴', 'Botanical notes from a small town', '2026-11-04'],
  ['mori', 'dune-observatory', '岩缝里的小花', 'Wildflowers Between the Rocks', '', '', '2026-10-22'],
  ['komorebi', 'amber-room', '晒过太阳的书页', 'Sun-Warmed Pages', '下午四点', 'Four in the afternoon', '2026-11-02'],
  ['nami', 'cloud-diary', '云间游记', 'A Walk Between Clouds', '从画室寄来的信', 'A letter from the studio', '2026-11-03'],
  ['sable', 'dune-observatory', '月面地图', 'Map of the Lunar Surface', '在沙丘等月亮', 'Waiting for the moon in the dunes', '2026-10-25'],
]

const audio = asset('media/low-tide.wav')
const video = asset('media/shorelight.webm')
const note = asset('media/studio-notes.txt')

const posts = scenes.map(([authorId, scene, zh, en, subZh, subEn, publishedAt], index) => {
  const cover = illustrated(scene)
  const caption = { zh: `${zh} · 色彩手稿`, en: `${en} · color study` }
  const text = index === 0
    ? { zh: '潮水退到很远的时候，海边会短暂地出现一条路。我沿着那条路慢慢走，把夜风的颜色和水面上的月光记下来。\n\n这是这个系列的第四张画。希望你也能听见，海浪之间那一点安静。', en: 'When the tide recedes, a path briefly appears along the shore. I followed it slowly, taking note of the color of the night wind and the moonlight on the water.\n\nThis is the fourth painting in the series. I hope you can hear that little quiet between the waves, too.' }
    : { zh: `这页手记收录了《${zh}》的图像和片段。作画时留出了一点空白，给路上遇到的光和声音。`, en: `This page holds the images and fragments behind ${en}. I left a little room on the canvas for the light and sounds along the way.` }
  const blocks = [{ type: 'text', text }, { type: 'image', src: cover, caption, alt: caption }]
  if (index === 0) blocks.push(
    { type: 'audio', src: audio, caption: { zh: '退潮时的旋律', en: 'A melody for the falling tide' } },
    { type: 'text', text: { zh: '天还没完全黑。把这一段微光也放进信里。', en: 'It isn’t completely dark yet. I’m putting this last bit of light in the letter, too.' } },
    { type: 'video', src: video, caption: { zh: '海面上的暮光', en: 'Twilight on the water' } },
    { type: 'attachment', src: note, name: 'studio-notes.txt' },
    { type: 'link', url: 'https://www.fanbox.cc/', title: { zh: '在 Fanbox 打开平台主页', en: 'Open Fanbox' } },
    { type: 'linkCard', postId: 'mio-2', title: { zh: '云朵归还日', en: 'The Day We Returned the Clouds' }, text: { zh: '沿着海岸，读到下一封信。', en: 'Follow the coast to the next letter.' }, image: illustrated('cloud-diary') },
  )
  return {
    id: `${authorId}-${index + 1}`, authorId, title: { zh, en }, subtitle: { zh: subZh, en: subEn },
    cover, publishedAt, archivedAt: '2026-11-08', blocks,
    files: [
      { name: `${scene}-cover.svg`, type: 'cover', src: cover, width: 1120, height: 680 },
      { name: `${scene}-study.svg`, type: 'image', src: cover, width: 1120, height: 680 },
      ...(index === 0 ? [
        { name: 'low-tide.wav', type: 'audio', src: audio, bytes: 384044 },
        { name: 'shorelight.webm', type: 'video', src: video, bytes: 17712, width: 640, height: 360 },
        { name: 'studio-notes.txt', type: 'attachment', src: note, bytes: 486 },
      ] : []),
    ],
    customKeys: index < 12 ? {
      aggregation: { membership: { label: { zh: '订阅档位', en: 'Membership tier' }, value: 'public', valueLabel: { zh: '公开', en: 'Public' } } },
      data: { collection: { label: { zh: '系列', en: 'Collection' }, value: 'field-notes', valueLabel: { zh: '旅途手记', en: 'Field notes' } } },
    } : undefined,
  }
})

const defaults = { language: 'zh', theme: 'light', databasePath: './data', threads: 4 }
function readSettings() {
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem('postpock.settings')) }
  } catch {
    return defaults
  }
}

let library = { authors, posts, settings: readSettings(), ready: false }
const listeners = new Set()
function publish(patch) {
  library = { ...library, ...patch }
  listeners.forEach((listener) => listener())
}

const database = new Promise((resolve) => {
  if (!globalThis.indexedDB) return resolve(null)
  const request = indexedDB.open('postpock.preview', 1)
  request.onupgradeneeded = () => request.result.createObjectStore('libraries')
  request.onsuccess = () => resolve(request.result)
  request.onerror = request.onblocked = () => resolve(null)
})

let revision = 0
async function loadLibrary(path) {
  const current = ++revision
  const db = await database
  const saved = db && await new Promise((resolve) => {
    const request = db.transaction('libraries').objectStore('libraries').get(path)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => resolve(null)
  })
  if (current === revision) publish({ authors: saved?.authors?.map(restoreAuthor) ?? authors, posts: saved?.posts ?? posts, ready: true })
}

loadLibrary(library.settings.databasePath)

async function persist(patch) {
  const { databasePath } = library.settings
  publish(patch)
  const snapshot = { authors: library.authors, posts: library.posts }
  const db = await database
  if (!db) return false
  return new Promise((resolve) => {
    try {
      const transaction = db.transaction('libraries', 'readwrite')
      transaction.objectStore('libraries').put(snapshot, databasePath)
      transaction.oncomplete = () => resolve(true)
      transaction.onabort = transaction.onerror = () => resolve(false)
    } catch {
      resolve(false)
    }
  })
}

function upsert(current, incoming) {
  const records = new Map(current.map((record) => [record.id, record]))
  incoming.forEach((record) => records.set(record.id, record))
  return [...records.values()]
}

export const libraryApi = {
  saveAuthor(author) {
    const record = withDefaultAuthorImages({ ...author, id: author.id || newId() },
      (images) => images[Math.floor(Math.random() * images.length)])
    return { record, saved: persist({ authors: upsert(library.authors, [record]) }) }
  },
  savePost(post) {
    const record = { ...post, id: post.id || newId() }
    return { record, saved: this.archivePosts([record]) }
  },
  archivePosts(records) {
    return persist({ posts: upsert(library.posts, records) })
  },
  deleteAuthor(authorId) {
    const saved = persist({
      authors: library.authors.filter(({ id }) => id !== authorId),
      posts: library.posts.filter((post) => post.authorId !== authorId),
    })
    removeLibraryRecords(library.settings.databasePath, { authorId })
    return saved
  },
  deletePost(postId) {
    const saved = persist({ posts: library.posts.filter(({ id }) => id !== postId) })
    removeLibraryRecords(library.settings.databasePath, { postId })
    return saved
  },
  setSettings(patch) {
    const settings = { ...library.settings, ...patch }
    const changed = settings.databasePath !== library.settings.databasePath
    try { localStorage.setItem('postpock.settings', JSON.stringify(settings)) } catch { /* Session state still works. */ }
    publish({ settings, ...(changed ? { ready: false } : {}) })
    if (changed) loadLibrary(settings.databasePath)
  },
  pageSettings(authorId) {
    try {
      return { sort: 'newest', layout: 'double', ...JSON.parse(localStorage.getItem(`postpock.page.${library.settings.databasePath}.${authorId}`)) }
    } catch {
      return { sort: 'newest', layout: 'double' }
    }
  },
  setPageSettings(authorId, preferences) {
    try { localStorage.setItem(`postpock.page.${library.settings.databasePath}.${authorId}`, JSON.stringify(preferences)) } catch { /* The page keeps its optimistic state. */ }
  },
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useLibrary() {
  return useSyncExternalStore(subscribe, () => library)
}

export function searchPosts(query, platformIds, fields, authorId, language, availableAuthors, availablePosts) {
  const word = query.trim().toLocaleLowerCase()
  if (!word) return []
  const byAuthor = new Map(availableAuthors.map((author) => [author.id, author]))
  const contains = (value) => local(value, language).toLocaleLowerCase().includes(word)
  return availablePosts.filter((post) => {
    const author = byAuthor.get(post.authorId)
    if (!author || (authorId && author.id !== authorId)) return false
    const inPlatform = platformIds.includes(author.platform)
    if (inPlatform && contains(platforms.find(({ id }) => id === author.platform)?.name)) return true
    const hasScope = (scope) => inPlatform || fields.includes(scope)
    return (hasScope('title') && [post.title, post.subtitle].some(contains))
      || (hasScope('author') && [author.name, author.description].some(contains))
      || (hasScope('body') && post.blocks.some((block) => ['text', 'link', 'linkCard'].includes(block.type) && [block.text, block.title].some(contains)))
      || (hasScope('image') && post.blocks.some((block) => block.type === 'image' && [block.alt, block.caption, block.name].some(contains)))
      || (hasScope('image') && post.files.some((file) => ['image', 'cover'].includes(file.type) && contains(file.name)))
  })
}
