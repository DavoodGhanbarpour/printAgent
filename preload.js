const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
    setConfig: (input) => ipcRenderer.send('setConfig', input),
    getConfig: () => ipcRenderer.send('getConfig'),
    replyGetConfig: (config) => ipcRenderer.on('replyGetConfig',config),
    updatePreviewFrame: (callback) => ipcRenderer.on('updatePreviewFrame', callback)
})