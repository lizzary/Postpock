export const localDirectoryEndpoint = '/api/local/export-directory'

export function isWindowsDirectoryPath(path) {
  return typeof path === 'string' && /^(?:[a-z]:\\|\\\\[^\\]+\\[^\\]+)/i.test(path)
}

export async function chooseLocalDirectory(signal) {
  const response = await fetch(localDirectoryEndpoint, { method: 'POST', cache: 'no-store', signal })
  if (response.status === 204) return null
  if (!response.ok) throw new Error('Local folder picker unavailable')
  const { path } = await response.json()
  if (!isWindowsDirectoryPath(path)) throw new Error('Expected an absolute folder path')
  return path
}
