const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("tallyConnector", {
  loadSettings: () => ipcRenderer.invoke("settings:load"),
  saveSettings: (values) => ipcRenderer.invoke("settings:save", values),
  syncNow: () => ipcRenderer.invoke("sync:now"),
  getStatus: () => ipcRenderer.invoke("sync:status"),
  onStatusChanged: (callback) => {
    const handler = (_event, status) => callback(status);
    ipcRenderer.on("sync:status-changed", handler);
    return () => ipcRenderer.removeListener("sync:status-changed", handler);
  },
});
