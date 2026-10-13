const { app, BrowserWindow, Menu, Tray, nativeImage, ipcMain, dialog } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const { execFile } = require("node:child_process");
const { pathToFileURL, fileURLToPath } = require("node:url");
const { VELS, SMALL_SCALE } = require("./vels.js");
const { buildIco, buildIcns } = require("./iconmaker.js");
const { buildAppleScript, buildDesktopIni } = require("./iconapply.js");
const { squircleIcon } = require("./iconshape.js");

let win;
let tray;
let settingsWin;
let iconWin;
let customs = []; // user's own pictures: [{id, label, file, view, image, custom:true}]
let current = "brass";
let zoomed = false;
let zoomLevel = 1; // how big the vel is when zoomed in, as a fraction of its full view size
let smallLevel = SMALL_SCALE; // the same, for the small resting size

const ZOOM_RANGE = { min: 0.5, max: 1.5 };
const settingsFile = () => path.join(app.getPath("userData"), "settings.json");
const clampZoom = (value) =>
  Number.isFinite(value) ? Math.min(Math.max(value, ZOOM_RANGE.min), ZOOM_RANGE.max) : 1;

// The small size never exceeds the smallest zoomed size, so zooming in always grows the vel.
const SMALL_RANGE = { min: 0.2, max: 0.5 };
const clampSmall = (value) =>
  Number.isFinite(value) ? Math.min(Math.max(value, SMALL_RANGE.min), SMALL_RANGE.max) : SMALL_SCALE;

// Reads the saved sizes and custom pictures into the globals; keeps defaults on first run.
function loadSettings() {
  try {
    const saved = JSON.parse(fs.readFileSync(settingsFile(), "utf8"));
    zoomLevel = clampZoom(saved.zoomLevel);
    smallLevel = clampSmall(saved.smallLevel);
    for (const c of saved.customs || []) {
      try {
        if (!fs.existsSync(fileURLToPath(c.file))) continue; // picture deleted outside the app
        VELS[c.id] = { label: c.label, file: c.file, view: c.view, image: c.image, custom: true };
        customs.push(c);
      } catch {
        // skip bad entries
      }
    }
  } catch {
    // first run: no settings file yet
  }
}

function saveSettings() {
  fs.writeFileSync(settingsFile(), JSON.stringify({ zoomLevel, smallLevel, customs }));
}

function sizeFor(id, isZoomed) {
  const [width, height] = VELS[id].view;
  const k = isZoomed ? zoomLevel : smallLevel;
  return { width: Math.round(width * k), height: Math.round(height * k) };
}

// Resize the window around its centre so the vel stays where it is.
function resizeKeepingCentre(next) {
  const b = win.getBounds();
  win.setBounds({
    x: Math.round(b.x + (b.width - next.width) / 2),
    y: Math.round(b.y + (b.height - next.height) / 2),
    ...next,
  });
}

function loadCurrent() {
  win.loadFile("index.html", { query: { vel: current } });
}

function selectVel(id) {
  if (id === current || !VELS[id]) return;
  current = id;
  resizeKeepingCentre(sizeFor(current, zoomed));
  loadCurrent();
  tray.setContextMenu(buildMenu());
}

function toggleZoom() {
  zoomed = !zoomed;
  resizeKeepingCentre(sizeFor(current, zoomed));
  tray.setContextMenu(buildMenu());
}

// Let the user pick any picture and float it like a vel. The picture is
// normalized to PNG and kept in the app's data folder so it survives restarts.
async function addCustomPicture() {
  const picked = await dialog.showOpenDialog(win, {
    title: "Choose a picture",
    properties: ["openFile"],
    filters: [{ name: "Pictures", extensions: ["png", "jpg", "jpeg", "webp", "gif", "heic", "heif"] }],
  });
  if (picked.canceled || !picked.filePaths[0]) return;
  const src = picked.filePaths[0];
  try {
    fs.accessSync(src, fs.constants.R_OK);
  } catch {
    dialog.showErrorBox(
      "Vel",
      "Your Mac blocked that folder. Move the picture to your Pictures folder and try again."
    );
    return;
  }
  try {
    const img = nativeImage.createFromPath(src);
    if (img.isEmpty()) throw new Error("unreadable picture");
    const { width, height } = img.getSize();
    // Cover-scale so the short side hits 760px, then cut a cute rounded icon.
    const s = 760 / Math.min(width, height);
    const sized = img.resize({
      width: Math.max(1, Math.round(width * s)),
      height: Math.max(1, Math.round(height * s)),
      quality: "best",
    });
    const id = "custom-" + Date.now();
    const dir = path.join(app.getPath("userData"), "custom");
    fs.mkdirSync(dir, { recursive: true });
    const dest = path.join(dir, id + ".png");
    fs.writeFileSync(dest, squircleIcon(sized.toPNG(), 760));
    const imageW = 300;
    const imageH = 300;
    const label = path.basename(src, path.extname(src)).slice(0, 28) || "My picture";
    const vel = {
      label,
      file: pathToFileURL(dest).href,
      view: [imageW + 70, imageH + 70],
      image: [imageW, imageH],
      custom: true,
    };
    VELS[id] = vel;
    customs.push({ id, ...vel });
    saveSettings();
    selectVel(id);
  } catch {
    dialog.showErrorBox("Vel", "Could not use that picture. Try a PNG or JPG.");
  }
}

function removeCustomPicture(id) {
  const idx = customs.findIndex((c) => c.id === id);
  if (idx === -1) return;
  try {
    fs.unlinkSync(fileURLToPath(customs[idx].file));
  } catch {
    // best-effort cleanup
  }
  customs.splice(idx, 1);
  delete VELS[id];
  saveSettings();
  selectVel("brass");
}

function velRadio([id, vel]) {
  return { label: vel.label, type: "radio", checked: id === current, click: () => selectVel(id) };
}

function buildMenu() {
  const builtins = Object.entries(VELS).filter(([, v]) => !v.custom).map(velRadio);
  const mine = Object.entries(VELS).filter(([, v]) => v.custom).map(velRadio);
  return Menu.buildFromTemplate([
    { label: "Add your own picture…", click: addCustomPicture },
    { type: "separator" },
    ...builtins,
    ...(mine.length ? [{ type: "separator" }, ...mine] : []),
    ...(VELS[current]?.custom
      ? [{ label: `Remove "${VELS[current].label}"`, click: () => removeCustomPicture(current) }]
      : []),
    { type: "separator" },
    { label: zoomed ? "Zoom out" : "Zoom in", click: toggleZoom },
    { label: "Settings…", click: openSettings },
    { type: "separator" },
    { label: "Quit Vel", click: () => app.quit() },
  ]);
}

function createWindow() {
  win = new BrowserWindow({
    ...sizeFor(current, zoomed),
    transparent: true,
    frame: false,
    hasShadow: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
    },
  });
  win.setAlwaysOnTop(true, "floating");
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  loadCurrent();
}

function openSettings() {
  if (settingsWin) {
    settingsWin.focus();
    return;
  }
  settingsWin = new BrowserWindow({
    width: 380,
    height: 280,
    title: "Vel Settings",
    resizable: false,
    minimizable: false,
    maximizable: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
    },
  });
  settingsWin.setMenuBarVisibility(false);
  settingsWin.loadFile("settings.html");
  settingsWin.on("closed", () => {
    settingsWin = null;
  });
}

function openIconStudio() {
  if (iconWin) {
    iconWin.focus();
    return;
  }
  iconWin = new BrowserWindow({
    width: 600,
    height: 700,
    title: "Icon Studio",
    resizable: false,
    minimizable: false,
    maximizable: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
    },
  });
  iconWin.setMenuBarVisibility(false);
  iconWin.loadFile("iconstudio.html");
  iconWin.on("closed", () => {
    iconWin = null;
  });
}

// From source, the login item must point at Electron plus this app's folder.
function loginItemOptions() {
  return app.isPackaged ? {} : { path: process.execPath, args: [app.getAppPath()] };
}

function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, "tray.png")).resize({ height: 18 });
  tray = new Tray(icon);
  tray.setToolTip("Vel");
  tray.setContextMenu(buildMenu());
}

ipcMain.handle("settings:get", () => ({
  openAtLogin: app.getLoginItemSettings(loginItemOptions()).openAtLogin,
  packaged: app.isPackaged,
  zoomLevel,
  smallLevel,
}));

// The floating window asks for its picture config here, so custom pictures
// (which only exist in the main process) work just like the built-ins.
ipcMain.handle("vel:get", (_event, id) => VELS[id] ?? null);

// Changing the small size drops back to the resting size so the new size can be seen.
ipcMain.handle("settings:set-size", (_event, value) => {
  smallLevel = clampSmall(Number(value));
  saveSettings();
  zoomed = false;
  resizeKeepingCentre(sizeFor(current, zoomed));
  tray.setContextMenu(buildMenu());
  return smallLevel;
});

// Changing the zoom level zooms in straight away so the new size can be seen.
ipcMain.handle("settings:set-zoom", (_event, value) => {
  zoomLevel = clampZoom(Number(value));
  saveSettings();
  zoomed = true;
  resizeKeepingCentre(sizeFor(current, zoomed));
  tray.setContextMenu(buildMenu());
  return zoomLevel;
});

ipcMain.handle("settings:set", (_event, value) => {
  app.setLoginItemSettings({ openAtLogin: Boolean(value), ...loginItemOptions() });
  return app.getLoginItemSettings(loginItemOptions()).openAtLogin;
});

// Build a real icon file from the renderer's PNGs and let the user save it.
ipcMain.handle("icon:export", async (_event, { format, images }) => {
  const entries = images.map(({ size, dataUrl }) => ({
    size: Number(size),
    png: Buffer.from(String(dataUrl).split(",")[1], "base64"),
  }));
  const buffer = format === "icns" ? buildIcns(entries) : buildIco(entries);
  const ext = format === "icns" ? "icns" : "ico";
  const { canceled, filePath } = await dialog.showSaveDialog(iconWin, {
    title: "Save icon file",
    defaultPath: `my-icon.${ext}`,
    filters: [
      { name: format === "icns" ? "macOS icon (.icns)" : "Windows icon (.ico)", extensions: [ext] },
    ],
  });
  if (canceled || !filePath) return { saved: false };
  fs.writeFileSync(filePath, buffer);
  return { saved: true, path: filePath };
});

// Put the icon straight onto a folder the user picks. No manual steps.
ipcMain.handle("icon:apply", async (_event, { images }) => {
  const picked = await dialog.showOpenDialog(iconWin, {
    title: "Choose a folder to give your icon",
    properties: ["openDirectory", "createDirectory"],
  });
  if (picked.canceled || !picked.filePaths[0]) return { applied: false };
  const folder = picked.filePaths[0];
  const entries = images.map(({ size, dataUrl }) => ({
    size: Number(size),
    png: Buffer.from(String(dataUrl).split(",")[1], "base64"),
  }));
  const run = (cmd, args) =>
    new Promise((resolve) => execFile(cmd, args, (err) => resolve(err || null)));

  if (process.platform === "darwin") {
    // osascript ships with macOS; NSWorkspace sets the folder icon directly.
    const tmpIcon = path.join(app.getPath("temp"), `vel-icon-${Date.now()}.icns`);
    fs.writeFileSync(tmpIcon, buildIcns(entries));
    const err = await run("osascript", ["-e", buildAppleScript(tmpIcon, folder)]);
    await run("/usr/bin/touch", [folder]); // nudge Finder to refresh
    try { fs.unlinkSync(tmpIcon); } catch { /* temp cleanup is best-effort */ }
    if (err) return { applied: false, error: String(err.message || err) };
    return { applied: true, folder };
  }

  if (process.platform === "win32") {
    const icoPath = path.join(folder, "folder-icon.ico");
    fs.writeFileSync(icoPath, buildIco(entries));
    fs.writeFileSync(path.join(folder, "desktop.ini"), buildDesktopIni(icoPath));
    await run("attrib", ["+s", folder]);
    await run("attrib", ["+h", "+s", path.join(folder, "desktop.ini")]);
    await run("attrib", ["+h", "+s", icoPath]);
    return { applied: true, folder };
  }

  return { applied: false, reason: "unsupported" };
});

ipcMain.on("vel:move", (_event, { dx, dy }) => {
  if (!win) return;
  const [x, y] = win.getPosition();
  win.setPosition(Math.round(x + dx), Math.round(y + dy));
});

ipcMain.on("vel:zoom", toggleZoom);

ipcMain.on("vel:menu", () => {
  buildMenu().popup({ window: win });
});

app.whenReady().then(() => {
  app.dock?.hide();
  loadSettings();
  createWindow();
  createTray();
});
app.on("window-all-closed", () => app.quit());
