// iconapply.js — pure helpers for putting an icon straight onto a folder.
// The actual running of scripts stays in main.js (needs Electron); everything
// here is plain string-building so it can be unit-tested with node.

// Escape a path for embedding inside an AppleScript double-quoted string.
function escapeAS(s) {
  return String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

// AppleScript (via osascript, ships with macOS) that sets a folder's icon
// using NSWorkspace. No extra software needed on the user's Mac.
function buildAppleScript(iconPath, folderPath) {
  const icon = escapeAS(iconPath);
  const folder = escapeAS(folderPath);
  return [
    'use framework "AppKit"',
    `set theImage to current application's NSImage's alloc()'s initWithContentsOfFile:"${icon}"`,
    'if theImage is missing value then error "Could not read icon file."',
    `current application's NSWorkspace's sharedWorkspace()'s setIcon:theImage forFile:"${folder}" options:0`,
  ].join("\n");
}

// Windows applies folder icons through a desktop.ini file inside the folder.
function buildDesktopIni(icoPath) {
  return `[.ShellClassInfo]\r\nIconResource=${icoPath},0\r\n`;
}

const api = { escapeAS, buildAppleScript, buildDesktopIni };
if (typeof module !== "undefined" && module.exports) module.exports = api;
else globalThis.IconApplyLib = api;
