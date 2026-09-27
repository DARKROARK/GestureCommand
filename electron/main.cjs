const { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage, screen, protocol, net } = require('electron')
const { spawn } = require('node:child_process')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

protocol.registerSchemesAsPrivileged([{ scheme: 'gesturecommand', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }])

let window, tray, worker, armed = false, ready = false, error = '', lastAction = 0, lastMove = 0
const actions = new Set(['left-click', 'right-click', 'double-click', 'scroll-up', 'scroll-down', 'volume-up', 'volume-down', 'next-window', 'previous-window', 'escape', 'play-pause'])
const status = () => ({ armed, ready, error })
function publish() { window?.webContents.send('control:status-changed', status()); tray?.setToolTip(`GestureCommand — ${armed ? 'Armed' : 'Paused'}`) }
function disarm() { armed = false; publish() }
function send(message) { if (worker?.stdin.writable) worker.stdin.write(JSON.stringify(message) + '\n') }
function startWorker() {
  const script = path.join(__dirname, '..', 'scripts', 'system-control.py').replace('app.asar', 'app.asar.unpacked')
  const python = process.env.GESTURECOMMAND_PYTHON || (process.platform === 'win32' ? 'python' : 'python3')
  worker = spawn(python, ['-u', script], { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true })
  let output = ''
  worker.stdout.on('data', chunk => {
    output += chunk.toString()
    const lines = output.split('\n'); output = lines.pop()
    for (const line of lines) {
      try { const result = JSON.parse(line); if (result.error) { error = result.error; ready = false; disarm() } else if (result.ready) { error = ''; ready = true; publish() } } catch { /* ignore malformed worker output */ }
    }
  })
  worker.on('error', e => { error = `Python could not start: ${e.message}`; worker = null; ready = false; disarm() })
  worker.on('exit', () => { worker = null; ready = false; error ||= 'System control stopped. Install Python and pyautogui, then restart.'; disarm() })
}
function createWindow() {
  window = new BrowserWindow({ width: 1450, height: 940, minWidth: 950, minHeight: 700, title: 'GestureCommand', webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true } })
  if (!app.isPackaged) window.loadURL('http://127.0.0.1:5173')
  else window.loadURL('gesturecommand://app/index.html')
  window.on('hide', disarm)
  window.on('minimize', disarm)
  window.on('closed', () => { window = null; disarm() })
}
app.whenReady().then(() => {
  protocol.handle('gesturecommand', request => {
    const url = new URL(request.url)
    const root = path.resolve(__dirname, '..', 'dist')
    const target = path.resolve(root, '.' + decodeURIComponent(url.pathname))
    if (url.hostname !== 'app' || !target.startsWith(root + path.sep)) return new Response('Not found', { status: 404 })
    return net.fetch(pathToFileURL(target).href)
  })
  createWindow(); startWorker()
  const icon = nativeImage.createFromPath(path.join(__dirname, '..', 'public', 'icon-192.png'))
  if (!icon.isEmpty()) {
    tray = new Tray(icon)
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: 'Show GestureCommand', click: () => window?.show() },
      { label: 'Pause control', click: disarm },
      { label: 'Quit', click: () => app.quit() }
    ]))
    tray.on('double-click', () => window?.show()); publish()
  }
})
app.on('before-quit', () => { disarm(); worker?.kill() })
app.on('window-all-closed', () => app.quit())
ipcMain.handle('control:status', () => status())
ipcMain.handle('control:arm', (_event, value) => {
  armed = value === true && ready && !error && !!window?.isVisible()
  publish(); return status()
})
ipcMain.handle('control:action', (_event, action) => {
  const now = Date.now()
  if (!armed || !actions.has(action) || now - lastAction < 350) return false
  lastAction = now; send({ type: 'action', action }); return true
})
ipcMain.handle('control:move', (_event, point) => {
  const now = Date.now()
  if (!armed || now - lastMove < 24 || !Number.isFinite(point?.x) || !Number.isFinite(point?.y)) return false
  lastMove = now
  const bounds = screen.getDisplayMatching(window.getBounds()).workArea
  send({ type: 'move', x: Math.round(bounds.x + Math.max(0, Math.min(1, point.x)) * (bounds.width - 1)), y: Math.round(bounds.y + Math.max(0, Math.min(1, point.y)) * (bounds.height - 1)) })
  return true
})
