// Tests for iconshape.js — run with: node iconshape.test.js
const assert = require("node:assert");
const { decodePng, encodePng, squircleIcon } = require("./iconshape.js");

function solidRgba(w, h, r, g, b, a = 255) {
  const d = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    d[i * 4] = r; d[i * 4 + 1] = g; d[i * 4 + 2] = b; d[i * 4 + 3] = a;
  }
  return d;
}

// round-trip: encode then decode keeps pixels
{
  const buf = encodePng(4, 3, solidRgba(4, 3, 10, 20, 30));
  const { width, height, data } = decodePng(buf);
  assert.strictEqual(width, 4);
  assert.strictEqual(height, 3);
  assert.strictEqual(data[0], 10);
  assert.strictEqual(data[1], 20);
  assert.strictEqual(data[2], 30);
  assert.strictEqual(data[3], 255);
  console.log("codec round-trip ok");
}

// squircle: corners transparent, edges and center opaque
{
  const buf = encodePng(16, 16, solidRgba(16, 16, 200, 100, 50));
  const out = squircleIcon(buf, 16, 0.25); // r = 4
  const { width, height, data } = decodePng(out);
  assert.strictEqual(width, 16);
  assert.strictEqual(height, 16);
  const alpha = (x, y) => data[(y * 16 + x) * 4 + 3];
  assert.strictEqual(alpha(0, 0), 0, "corner transparent");
  assert.strictEqual(alpha(15, 0), 0, "corner transparent");
  assert.strictEqual(alpha(0, 15), 0, "corner transparent");
  assert.strictEqual(alpha(8, 8), 255, "center opaque");
  assert.strictEqual(alpha(8, 0), 255, "top edge opaque");
  assert.strictEqual(alpha(0, 8), 255, "left edge opaque");
  // color survives
  assert.strictEqual(data[(8 * 16 + 8) * 4], 200);
  console.log("squircle mask ok");
}

// squircle center-crops a wide picture
{
  const buf = encodePng(32, 16, solidRgba(32, 16, 1, 2, 3));
  const out = squircleIcon(buf, 16, 0.25);
  const { width, height } = decodePng(out);
  assert.strictEqual(width, 16);
  assert.strictEqual(height, 16);
  console.log("center crop ok");
}

// rejects a picture smaller than the target
{
  const buf = encodePng(8, 8, solidRgba(8, 8, 1, 2, 3));
  assert.throws(() => squircleIcon(buf, 16), /too small/);
  console.log("size guard ok");
}

console.log("All iconshape tests passed.");
