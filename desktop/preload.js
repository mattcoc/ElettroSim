// Ponte sicuro tra la pagina di ElettroSim e il programma desktop.
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('elettroDesktop', {
  version: ipcRenderer.sendSync('es-version'),
  login: () => ipcRenderer.invoke('es-login'),
  cancelLogin: () => ipcRenderer.invoke('es-login-cancel'),
  checkUpdate: () => ipcRenderer.invoke('es-check-update'),
  openExternal: url => ipcRenderer.invoke('es-open', url),
});
