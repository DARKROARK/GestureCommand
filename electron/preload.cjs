const { contextBridge, ipcRenderer } = require('electron')
contextBridge.exposeInMainWorld('gestureDesktop', {
  status: () => ipcRenderer.invoke('control:status'),
  arm: (value) => ipcRenderer.invoke('control:arm', value),
  action: (action) => ipcRenderer.invoke('control:action', action),
  move: (x, y) => ipcRenderer.invoke('control:move', { x, y }),
  onStatus: (callback) => {
    const listener = (_event, status) => callback(status)
    ipcRenderer.on('control:status-changed', listener)
    return () => ipcRenderer.removeListener('control:status-changed', listener)
  }
})
