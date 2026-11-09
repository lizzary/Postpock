export const MCP_PERMISSIONS = {
  author: ['author:create', 'author:delete', 'author:update', 'author:read'],
  post: ['post:create', 'post:delete', 'post:update', 'post:read'],
}

const knownPermissions = new Set(Object.values(MCP_PERMISSIONS).flat())
const storageKey = (path) => `postpock.mcp-keys.${path}`

function mcpError(code) {
  return Object.assign(new Error(code), { code })
}

function readConfig(config) {
  const { name, authorIds, permissions } = config ?? {}
  const trimmedName = typeof name === 'string' ? name.trim() : ''
  if (!trimmedName) throw mcpError('nameRequired')
  if (trimmedName.length > 80) throw mcpError('nameTooLong')
  if (!Array.isArray(authorIds) || !authorIds.length || authorIds.some((id) => typeof id !== 'string' || !id.trim())) {
    throw mcpError('authorsRequired')
  }
  if (!Array.isArray(permissions) || !permissions.length) throw mcpError('permissionsRequired')
  if (permissions.some((permission) => !knownPermissions.has(permission))) throw mcpError('invalidPermissions')
  return {
    name: trimmedName,
    authorIds: [...new Set(authorIds)],
    permissions: [...knownPermissions].filter((permission) => permissions.includes(permission)),
  }
}

function isKeyRecord(record) {
  return record && typeof record.id === 'string' && typeof record.prefix === 'string'
    && Number.isFinite(record.createdAt) && Number.isFinite(record.updatedAt)
    && typeof record.name === 'string' && Array.isArray(record.authorIds) && Array.isArray(record.permissions)
}

export function listMcpKeys(path = './data') {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey(path)) ?? '[]')
    if (Array.isArray(stored) && stored.every(isKeyRecord)) return stored
  } catch {
    throw mcpError('storageUnavailable')
  }
  throw mcpError('storageUnavailable')
}

function saveKeys(path, records) {
  try {
    localStorage.setItem(storageKey(path), JSON.stringify(records))
  } catch {
    throw mcpError('storageUnavailable')
  }
}

function randomHex(length) {
  try {
    const bytes = crypto.getRandomValues(new Uint8Array(length))
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  } catch {
    throw mcpError('randomUnavailable')
  }
}

export function createMcpKey(config, path = './data') {
  const settings = readConfig(config)
  const records = listMcpKeys(path)
  const secret = `ppk_${randomHex(32)}`
  const createdAt = Date.now()
  const key = {
    ...settings,
    id: randomHex(16),
    prefix: secret.slice(0, 12),
    createdAt,
    updatedAt: createdAt,
  }
  saveKeys(path, [key, ...records])
  return { key, secret }
}

export function updateMcpKey(id, config, path = './data') {
  const settings = readConfig(config)
  const records = listMcpKeys(path)
  const index = records.findIndex((record) => record.id === id)
  if (index === -1) throw mcpError('notFound')
  const key = { ...records[index], ...settings, updatedAt: Date.now() }
  records[index] = key
  saveKeys(path, records)
  return key
}

export function deleteMcpKey(id, path = './data') {
  const records = listMcpKeys(path)
  const remaining = records.filter((record) => record.id !== id)
  if (remaining.length === records.length) return false
  saveKeys(path, remaining)
  return true
}

export function isMcpActionAllowed(record, authorId, permission) {
  return Boolean(typeof authorId === 'string' && authorId.trim() && knownPermissions.has(permission)
    && Array.isArray(record?.authorIds) && record.authorIds.includes(authorId)
    && Array.isArray(record.permissions) && record.permissions.includes(permission))
}
