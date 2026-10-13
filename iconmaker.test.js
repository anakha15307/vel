// Tests for iconmaker.js — run with: node iconmaker.test.js
const assert = require("node:assert");
const zlib = require("node:zlib");
const { buildIco, buildIcns } = require("./iconmaker.js");

// --- minimal PNG writer (solid color, RGBA) so the test needs no dependencies ---
function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let c = ~0;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (~c) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function makePng(size, r, g, b) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  const raw = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y++) {
    raw[y * (1 + size * 4)] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const o = y * (1 + size * 4) + 1 + x * 4;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = 255;
    }
  }
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
const PNG_MAGIC = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const isPng = (b) => b.subarray(0, 8).equals(PNG_MAGIC);

// --- ICO ---
{
  const entries = [16, 32, 48, 256].map((s) => ({ size: s, png: makePng(s, 200, 30, 30) }));
  const ico = buildIco(entries);
  assert.strictEqual(ico.readUInt16LE(0), 0, "reserved");
  assert.strictEqual(ico.readUInt16LE(2), 1, "type=icon");
  assert.strictEqual(ico.readUInt16LE(4), 4, "count");
  let pos = 6 + 4 * 16;
  for (let i = 0; i < 4; i++) {
    const p = 6 + i * 16;
    const dim = ico.readUInt8(p) || 256;
    assert.strictEqual(dim, entries[i].size, "entry size order");
    const len = ico.readUInt32LE(p + 8);
    const off = ico.readUInt32LE(p + 12);
    assert.strictEqual(off, pos, "entry offset");
    assert.ok(isPng(ico.subarray(off, off + 8)), "entry data is PNG");
    assert.ok(ico.subarray(off, off + len).equals(entries[i].png), "PNG bytes intact");
    pos += len;
  }
  assert.strictEqual(pos, ico.length, "no trailing bytes");
  console.log("ICO ok:", ico.length, "bytes,", 4, "sizes");
}

// --- ICNS ---
{
  const entries = [16, 32, 128, 256, 512].map((s) => ({ size: s, png: makePng(s, 30, 120, 200) }));
  const icns = buildIcns(entries);
  assert.strictEqual(icns.subarray(0, 4).toString("ascii"), "icns", "magic");
  assert.strictEqual(icns.readUInt32BE(4), icns.length, "total length");
  const want = ["icp4", "icp5", "ic07", "ic08", "ic09"];
  let pos = 8;
  for (let i = 0; i < want.length; i++) {
    const type = icns.subarray(pos, pos + 4).toString("ascii");
    const len = icns.readUInt32BE(pos + 4);
    assert.strictEqual(type, want[i], "type code");
    assert.ok(isPng(icns.subarray(pos + 8, pos + 16)), "entry data is PNG");
    assert.ok(icns.subarray(pos + 8, pos + len).equals(entries[i].png), "PNG bytes intact");
    pos += len;
  }
  assert.strictEqual(pos, icns.length, "no trailing bytes");
  console.log("ICNS ok:", icns.length, "bytes,", want.length, "sizes");
}

// --- ICNS rejects unknown sizes ---
{
  assert.throws(() => buildIcns([{ size: 48, png: makePng(48, 1, 2, 3) }]), /icns needs/);
  console.log("ICNS size guard ok");
}

console.log("All iconmaker tests passed.");
