// Tests for iconapply.js — run with: node iconapply.test.js
const assert = require("node:assert");
const { escapeAS, buildAppleScript, buildDesktopIni } = require("./iconapply.js");

{
  assert.strictEqual(escapeAS('plain/path'), 'plain/path');
  assert.strictEqual(escapeAS('a"b'), 'a\\"b');
  assert.strictEqual(escapeAS('a\\b'), 'a\\\\b');
  console.log("escapeAS ok");
}

{
  const script = buildAppleScript('/tmp/my icon.icns', '/Users/anu/My "Cool" Folder');
  assert.ok(script.includes('use framework "AppKit"'), "loads AppKit");
  assert.ok(script.includes('initWithContentsOfFile:"/tmp/my icon.icns"'), "icon path embedded");
  assert.ok(
    script.includes('forFile:"/Users/anu/My \\"Cool\\" Folder"'),
    "folder path embedded and escaped"
  );
  assert.ok(!script.includes("\n\n"), "no blank lines");
  console.log("buildAppleScript ok");
}

{
  const ini = buildDesktopIni("C:\\Icons\\my-icon.ico");
  assert.strictEqual(ini, "[.ShellClassInfo]\r\nIconResource=C:\\Icons\\my-icon.ico,0\r\n");
  console.log("buildDesktopIni ok");
}

console.log("All iconapply tests passed.");
