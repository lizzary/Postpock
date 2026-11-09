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
Add-Type -ReferencedAssemblies System.dll, System.Windows.Forms.dll -TypeDefinition @'
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Windows.Forms;

public static class PostPockFolderPicker
{
    private static readonly Guid FileOpenDialogClsid = new Guid("DC1C5A9C-E88A-4DDE-A5A1-60F82A20AEF7");
    private const uint PickFolders = 0x20;
    private const uint ForceFileSystem = 0x40;
    private const uint FileSystemPath = 0x80058000;
    private const int Cancelled = unchecked((int)0x800704C7);
    private static readonly IntPtr PerMonitorAwareV2 = new IntPtr(-4);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern IntPtr SetThreadDpiAwarenessContext(IntPtr context);

    // Keep the native method order, including the unused slots before GetResult.
    [ComImport, Guid("42F85136-DB7E-439C-85F1-E4075D135FC8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IFileDialog
    {
        [PreserveSig] int Show(IntPtr owner);
        void SetFileTypes(uint count, IntPtr filters);
        void SetFileTypeIndex(uint index);
        void GetFileTypeIndex(out uint index);
        void Advise(IntPtr events, out uint cookie);
        void Unadvise(uint cookie);
        void SetOptions(uint options);
        void GetOptions(out uint options);
        void SetDefaultFolder(IShellItem folder);
        void SetFolder(IShellItem folder);
        void GetFolder(out IShellItem folder);
        void GetCurrentSelection(out IShellItem item);
        void SetFileName([MarshalAs(UnmanagedType.LPWStr)] string name);
        void GetFileName(out IntPtr name);
        void SetTitle([MarshalAs(UnmanagedType.LPWStr)] string title);
        void SetOkButtonLabel([MarshalAs(UnmanagedType.LPWStr)] string label);
        void SetFileNameLabel([MarshalAs(UnmanagedType.LPWStr)] string label);
        void GetResult(out IShellItem item);
    }

    [ComImport, Guid("43826D1E-E718-42EE-BC55-A1E261C37BFE"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IShellItem
    {
        void BindToHandler(IntPtr bindContext, ref Guid handler, ref Guid iid, out IntPtr result);
        void GetParent(out IShellItem parent);
        void GetDisplayName(uint format, out IntPtr name);
    }

    public static string Pick()
    {
        // Windows captures the thread's DPI awareness when each window is created.
        IntPtr previousContext = SetThreadDpiAwarenessContext(PerMonitorAwareV2);
        if (previousContext == IntPtr.Zero) throw new Win32Exception(Marshal.GetLastWin32Error());

        try
        {
            Application.EnableVisualStyles();
            using (var owner = new Form { ShowInTaskbar = false, TopMost = true })
            {
                return ShowDialog(owner.Handle);
            }
        }
        finally
        {
            SetThreadDpiAwarenessContext(previousContext);
        }
    }

    private static string ShowDialog(IntPtr owner)
    {
        var dialog = (IFileDialog)Activator.CreateInstance(Type.GetTypeFromCLSID(FileOpenDialogClsid));
        try
        {
            uint options;
            dialog.GetOptions(out options);
            dialog.SetOptions(options | PickFolders | ForceFileSystem);
            dialog.SetTitle("PostPock");

            int result = dialog.Show(owner);
            if (result == Cancelled) return null;
            Marshal.ThrowExceptionForHR(result);

            IShellItem item;
            dialog.GetResult(out item);
            IntPtr path = IntPtr.Zero;
            try
            {
                item.GetDisplayName(FileSystemPath, out path);
                return Marshal.PtrToStringUni(path);
            }
            finally
            {
                Marshal.FreeCoTaskMem(path);
                Marshal.ReleaseComObject(item);
            }
        }
        finally
        {
            Marshal.ReleaseComObject(dialog);
        }
    }
}
'@
$path = [PostPockFolderPicker]::Pick()
if ($null -ne $path) { [Console]::Write($path) }
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
