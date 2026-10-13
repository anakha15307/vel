# Vel

Turn any picture into a cute floating icon on your desktop.

Vel is a small desktop app for Mac and Windows. Pick any photo and it floats on
your screen like a little app icon, with a soft golden glow. Drag it anywhere,
click it to spin, double-click to zoom. It comes with six built-in pictures and
remembers your own between restarts.

## Download

Get the latest version from
[Releases](https://github.com/anakha15307/vel/releases):

- **Mac (Apple Silicon):** `Vel-mac-arm64.zip`
- **Mac (Intel):** `Vel-mac-x64.zip`
- **Windows:** `Vel-win-x64.zip`

Unzip, drag `Vel.app` to Applications (Mac), and open it. On first launch your
Mac may warn that the app is from an unidentified developer: right-click the
app, choose Open, then click Open. You only do this once.

## Use

- Click the tray icon (menu bar) and choose **Add your own picture…**
- Your photo becomes a rounded icon and starts floating.
- Right-click the floating picture for options, or pick another from the menu.
- Remove a picture anytime from the same menu.
- In Settings you can switch on **Open at login**.

## Run from source

```sh
npm install
npm start
```

## Build installers

```sh
npm run dist
```

Installers land in `dist/`.

## Tests

```sh
npm test
```
