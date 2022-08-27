const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
    setConfig: (input) => ipcRenderer.send('setConfig', input),
    getConfig: (callback) => ipcRenderer.on('getConfig', callback),
    updatePreviewFrame: (callback) => ipcRenderer.on('updatePreviewFrame', callback)
})