import { contextBridge, ipcRenderer } from 'electron';

// Expose a safe API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isElectron: true,

  // App info
  getVersion: () => ipcRenderer.invoke('app:version'),

  // Window controls
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),

  // Open external URL in default browser
  openExternal: (url: string) => ipcRenderer.send('open:external', url),
});
