const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("velApi", {
  move: (dx, dy) => ipcRenderer.send("vel:move", { dx, dy }),
  menu: () => ipcRenderer.send("vel:menu"),
  zoom: () => ipcRenderer.send("vel:zoom"),
  getSettings: () => ipcRenderer.invoke("settings:get"),
  setSmallLevel: (value) => ipcRenderer.invoke("settings:set-size", value),
  setZoomLevel: (value) => ipcRenderer.invoke("settings:set-zoom", value),
  setOpenAtLogin: (value) => ipcRenderer.invoke("settings:set", value),
  getVel: (id) => ipcRenderer.invoke("vel:get", id),
  exportIcon: (payload) => ipcRenderer.invoke("icon:export", payload),
  applyIcon: (payload) => ipcRenderer.invoke("icon:apply", payload),
});
