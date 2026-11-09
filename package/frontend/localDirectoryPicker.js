import { execFile } from 'node:child_process'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { isWindowsDirectoryPath, localDirectoryEndpoint } from './src/data/localDirectory.js'

const runFile = promisify(execFile)
const loopbackAddresses = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1'])
const loopbackHost = /^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/i
const pickerScript = String.raw`
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.Application]::EnableVisualStyles()
$owner = [System.Windows.Forms.Form]::new()
$owner.ShowInTaskbar = $false
$owner.TopMost = $true
$picker = [System.Windows.Forms.FolderBrowserDialog]::new()
$picker.Description = 'PostPock'
try {
  if ($picker.ShowDialog($owner) -eq [System.Windows.Forms.DialogResult]::OK) {
    [Console]::Write($picker.SelectedPath)
  }
} finally {
  $picker.Dispose()
  $owner.Dispose()
}
`

async function pickDirectory(signal) {
  const powershell = join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe')
  const { stdout } = await runFile(powershell, ['-NoProfile', '-NonInteractive', '-STA', '-Command', pickerScript], {
    windowsHide: true,
    encoding: 'utf8',
    timeout: 300_000,
    maxBuffer: 128 * 1024,
    signal,
  })
  if (!stdout) return null
  if (!isWindowsDirectoryPath(stdout)) throw new Error('Expected an absolute folder path')
  return stdout
}

function isLocalSameOrigin(request) {
  const { host, origin } = request.headers
  const protocol = request.socket.encrypted ? 'https' : 'http'
  return loopbackAddresses.has(request.socket.remoteAddress)
    && loopbackHost.test(host)
    && origin === protocol + '://' + host
}

export default function localDirectoryPicker() {
  let active = false

  function install(server) {
    server.middlewares.use(async (request, response, next) => {
      if (request.url !== localDirectoryEndpoint) return next()

      response.setHeader('Cache-Control', 'no-store')
      if (request.method !== 'POST') {
        response.setHeader('Allow', 'POST')
        response.writeHead(405).end()
        return
      }
      if (!isLocalSameOrigin(request)) {
        response.writeHead(403).end()
        return
      }
      if (process.platform !== 'win32' || active) {
        response.writeHead(503).end()
        return
      }

      const controller = new AbortController()
      response.once('close', () => { if (!response.writableEnded) controller.abort() })
      active = true
      try {
        const path = await pickDirectory(controller.signal)
        if (controller.signal.aborted) return
        if (path === null) response.writeHead(204).end()
        else response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' }).end(JSON.stringify({ path }))
      } catch {
        if (!controller.signal.aborted) response.writeHead(503).end()
      } finally {
        active = false
      }
    })
  }

  return { name: 'postpock-local-directory-picker', configureServer: install, configurePreviewServer: install }
}
