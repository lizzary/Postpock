export const platformIds = ['fanbox', 'fantia', 'patreon', 'x']

const STORAGE_KEY = 'postpock-operations-v1'
const now = Date.now()
const initial = {
  connections: { fanbox: 'connected', fantia: 'disconnected', patreon: 'expired', x: 'disconnected' },
  logins: {},
  libraries: {},
  tasks: [
    { id: 'first-archive', type: 'sync', status: 'completed', total: 4, completed: 4, createdAt: now - 86400000, finishedAt: now - 86376000 },
    { id: 'first-check', type: 'check', status: 'completed', total: 9, completed: 9, createdAt: now - 172800000, finishedAt: now - 172790000 },
  ],
}

function readSnapshot() {
  try {
    const stored = JSON.parse(globalThis.localStorage?.getItem(STORAGE_KEY) ?? 'null')
    return stored ? { ...initial, ...stored } : initial
  } catch {
    return initial
  }
}

let snapshot = readSnapshot()
let timer
const listeners = new Set()
const emptyLibrary = { checkpoint: null, archivePosts: [] }

export function getLibraryOperations(state, path) {
  return state.libraries[`:${path}`] ?? emptyLibrary
}

function withLibrary(state, path, library) {
  return { ...state, libraries: { ...state.libraries, [`:${path}`]: library } }
}

export function getOperationsSnapshot() {
  return snapshot
}

export function subscribeOperations(listener) {
  listeners.add(listener)
  schedule()
  return () => listeners.delete(listener)
}

function publish(next) {
  snapshot = next
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(snapshot))
  } catch {
    // The current session can continue without browser storage.
  }
  for (const listener of listeners) listener()
  schedule()
}

function schedule() {
  if (timer || typeof window === 'undefined') return
  const busy = snapshot.tasks.some(({ status }) => status !== 'completed')
  const verifying = Object.values(snapshot.logins).some(({ phase }) => phase === 'verifying')
  if (busy || verifying) timer = setTimeout(tick, 350)
}

export function beginLogin(platform) {
  if (!platformIds.includes(platform) || snapshot.logins[platform]) return
  publish({ ...snapshot, logins: { ...snapshot.logins, [platform]: { phase: 'awaiting' } } })
}

export function validateLogin(platform) {
  if (snapshot.logins[platform]?.phase !== 'awaiting') return
  const login = { phase: 'verifying', finishesAt: Date.now() + 1450 }
  publish({ ...snapshot, logins: { ...snapshot.logins, [platform]: login } })
}

export function cancelLogin(platform) {
  if (snapshot.logins[platform]?.phase !== 'awaiting') return
  const logins = { ...snapshot.logins }
  delete logins[platform]
  publish({ ...snapshot, logins })
}

const remoteEntries = [
  {
    title: { zh: '藏在余晖里的速写', en: 'Sketches from the afterglow' },
    subtitle: { zh: '把没画完的光，留在这一页。', en: 'A page for the light I never quite finished drawing.' },
    text: { zh: '今天整理了几张尚未完成的速写。画面里还留着铅笔的痕迹，也留着下笔时的犹豫。', en: 'I sorted a few unfinished sketches today. They still have the pencil marks and the pauses between strokes.' },
    publishedAt: '2026-11-04',
  },
  {
    title: { zh: '周末工作间手记', en: 'Notes from the weekend studio' },
    subtitle: { zh: '纸张、颜色和一点灵感。', en: 'Paper, colour, and a little inspiration.' },
    text: { zh: '这周试了一些新的颜色组合，想用更轻的笔触画出下午的空气。', en: 'This week I tried a few colour pairings, looking for a lighter way to draw the afternoon air.' },
    publishedAt: '2026-10-29',
  },
]

function mockRemoteRows(authors, posts) {
  return authors.flatMap((author) => {
    const localPosts = posts.filter((post) => post.authorId === author.id)
    const remotePosts = remoteEntries.map((entry, index) => {
      const id = `remote-${author.id}-${index + 1}`
      const archived = localPosts.find((post) => post.id === id)
      const sample = localPosts.find((post) => post.cover)
      const { text, ...metadata } = entry
      const cover = sample?.cover || author.cover || author.avatar
      return archived ?? {
        ...metadata,
        id,
        authorId: author.id,
        cover,
        archivedAt: '',
        blocks: [{ type: 'text', text }, ...(cover ? [{ type: 'image', src: cover, alt: metadata.title }] : [])],
        files: sample?.files.filter(({ type }) => type === 'cover' || type === 'image') ?? [],
      }
    })
    const remoteIds = new Set(remotePosts.map(({ id }) => id))
    return [...localPosts.filter(({ id }) => !remoteIds.has(id)), ...remotePosts].map((post, index) => ({
      post,
      authorId: author.id,
      platform: author.platform,
      status: post.archivedAt || !remoteIds.has(post.id) ? 'saved' : 'missing',
      remoteRevision: index % 3 === 1 && !post.sourceRevision,
    }))
  }).sort((a, b) => b.post.publishedAt.localeCompare(a.post.publishedAt) || a.post.id.localeCompare(b.post.id))
}

export function activePostStates(tasks, path) {
  return new Map(tasks.flatMap((task) => {
    if (task.status === 'completed' || task.type === 'check' || task.path !== path) return []
    return task.rows.map(({ post }) => [post.id, task.status])
  }))
}

export function submitStatusCheck(authors, posts, threads, path) {
  if (!authors.length || authors.some(({ platform }) => snapshot.connections[platform] !== 'connected')) return false
  if (snapshot.tasks.some((task) => task.type === 'check' && task.status !== 'completed' && task.path === path)) return false
  enqueue('check', mockRemoteRows(authors, posts), threads, path)
  return true
}

export function submitPostTask(type, ids, threads, path) {
  const { checkpoint } = getLibraryOperations(snapshot, path)
  if (!checkpoint || !['sync', 'update'].includes(type)) return []
  const requested = new Set(ids)
  const active = activePostStates(snapshot.tasks, path)
  const rows = checkpoint.rows.filter(({ post, platform, status }) => (
    requested.has(post.id) && !active.has(post.id) && snapshot.connections[platform] === 'connected'
    && (type === 'sync' ? ['missing', 'update'].includes(status) : status === 'saved')
  ))
  if (rows.length) enqueue(type, rows, threads, path)
  return rows.map(({ post }) => post.id)
}

let taskSequence = 0

function enqueue(type, rows, threads, path) {
  const task = {
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${++taskSequence}`,
    type,
    path,
    status: 'queued',
    completed: 0,
    total: rows.length,
    duration: Math.min(14000, 2300 + Math.ceil(rows.length / threads) * 520),
    createdAt: Date.now(),
    rows,
  }
  publish({ ...snapshot, tasks: [task, ...snapshot.tasks] })
}

export function clearTaskHistory() {
  publish({ ...snapshot, tasks: snapshot.tasks.filter(({ status }) => status !== 'completed') })
}

export function acknowledgeArchive(path, posts) {
  const library = getLibraryOperations(snapshot, path)
  if (library.archivePosts === posts) publish(withLibrary(snapshot, path, { ...library, archivePosts: [] }))
}

export function removeLibraryRecords(path, { authorId, postId }) {
  const library = getLibraryOperations(snapshot, path)
  const keep = (post) => authorId ? post.authorId !== authorId : post.id !== postId
  const keepRow = ({ post }) => keep(post)
  const pending = library.archivePosts.filter(keep)
  const rows = library.checkpoint?.rows.filter(keepRow)
  let tasksChanged = false
  const tasks = snapshot.tasks.flatMap((task) => {
    if (task.path !== path || task.status === 'completed') return [task]
    const remaining = task.rows.filter(keepRow)
    if (remaining.length === task.rows.length) return [task]
    tasksChanged = true
    return remaining.length ? [{
      ...task,
      rows: remaining,
      total: remaining.length,
      completed: Math.min(task.completed, remaining.length),
    }] : []
  })
  const checkpointChanged = rows && rows.length !== library.checkpoint.rows.length
  const pendingChanged = pending.length !== library.archivePosts.length
  if (tasksChanged || checkpointChanged || pendingChanged) {
    publish(withLibrary({ ...snapshot, tasks }, path, {
      checkpoint: checkpointChanged ? { ...library.checkpoint, rows } : library.checkpoint,
      archivePosts: pendingChanged ? pending : library.archivePosts,
    }))
  }
}

function localDate(timestamp) {
  const date = new Date(timestamp)
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function finishTask(state, task, time) {
  const { rows, duration, ...record } = task
  const completedTask = { ...record, status: 'completed', completed: task.total, finishedAt: time }
  const tasks = state.tasks.map((entry) => entry.id === task.id ? completedTask : entry)
  const library = getLibraryOperations(state, task.path)

  if (task.type === 'check') {
    const current = new Map((library.checkpoint?.rows ?? []).map((row) => [row.post.id, row]))
    const checkedRows = rows.map((row) => {
      const latest = current.get(row.post.id)
      if (latest && latest.status !== 'missing' && row.status === 'missing') return latest
      return row
    })
    return withLibrary({ ...state, tasks }, task.path, { ...library, checkpoint: { checkedAt: time, rows: checkedRows } })
  }

  const targeted = new Map(rows.map((row) => [row.post.id, row]))
  const archived = task.type === 'sync' ? rows.map(({ post, remoteRevision }) => ({
    ...post,
    archivedAt: post.archivedAt || localDate(time),
    ...(remoteRevision ? { sourceRevision: 2 } : {}),
  })) : []
  const archivedById = new Map(archived.map((post) => [post.id, post]))
  const nextRows = library.checkpoint.rows.map((row) => {
    const match = targeted.get(row.post.id)
    if (!match) return row
    if (task.type === 'sync') return { ...row, post: archivedById.get(row.post.id), status: 'saved', remoteRevision: false }
    return match.remoteRevision ? { ...row, status: 'update' } : row
  })
  if (task.type === 'update') completedTask.updates = rows.filter(({ remoteRevision }) => remoteRevision).length
  return withLibrary({ ...state, tasks }, task.path, {
    checkpoint: { ...library.checkpoint, rows: nextRows },
    archivePosts: [...library.archivePosts.filter(({ id }) => !archivedById.has(id)), ...archived],
  })
}

function tick() {
  timer = undefined
  let next = snapshot
  const time = Date.now()
  for (const [platform, login] of Object.entries(next.logins)) {
    if (login.phase !== 'verifying' || time < login.finishesAt) continue
    const logins = { ...next.logins }
    delete logins[platform]
    next = { ...next, logins, connections: { ...next.connections, [platform]: 'connected' } }
  }

  let running = next.tasks.find(({ status }) => status === 'running')
  if (running) {
    const fraction = (time - running.startedAt) / running.duration
    if (fraction >= 1) {
      next = finishTask(next, running, time)
      running = undefined
    } else {
      const phase = fraction < 0.18 ? 'connecting' : fraction < 0.87 ? 'processing' : 'finishing'
      const completed = Math.max(0, Math.floor(running.total * (fraction - 0.18) / 0.82))
      if (phase !== running.phase || completed !== running.completed) {
        const progress = { ...running, phase, completed }
        next = { ...next, tasks: next.tasks.map((task) => task.id === running.id ? progress : task) }
      }
    }
  }
  if (!running) {
    const queued = next.tasks.findLast(({ status }) => status === 'queued')
    if (queued) {
      const active = { ...queued, status: 'running', phase: 'connecting', startedAt: time }
      next = { ...next, tasks: next.tasks.map((task) => task.id === active.id ? active : task) }
    }
  }
  if (next !== snapshot) publish(next)
  else schedule()
}
