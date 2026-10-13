// iconmaker.js — pure functions that turn PNG buffers into real icon files.
// No Electron needed here, so this file is unit-testable with plain node.
//
// entries: [{ size: Number, png: Buffer }]  (square PNGs, any sizes)
// buildIco(entries)  -> Buffer, a Windows .ico file
// buildIcns(entries) -> Buffer, a macOS .icns file

function buildIco(entries) {
  const list = [...entries].sort((a, b) => a.size - b.size);
  const count = list.length;
  const headerSize = 6 + count * 16;
  const total = headerSize + list.reduce((n, e) => n + e.png.length, 0);
  const out = Buffer.alloc(total);

  out.writeUInt16LE(0, 0); // reserved
  out.writeUInt16LE(1, 2); // type: icon
  out.writeUInt16LE(count, 4);

  let offset = headerSize;
  list.forEach((e, i) => {
    const p = 6 + i * 16;
    const dim = e.size >= 256 ? 0 : e.size; // 0 means 256 in ICO
    out.writeUInt8(dim, p); // width
    out.writeUInt8(dim, p + 1); // height
    out.writeUInt8(0, p + 2); // color count
    out.writeUInt8(0, p + 3); // reserved
    out.writeUInt16LE(1, p + 4); // planes
    out.writeUInt16LE(32, p + 6); // bits per pixel
    out.writeUInt32LE(e.png.length, p + 8);
    out.writeUInt32LE(offset, p + 12);
    e.png.copy(out, offset);
    offset += e.png.length;
  });
  return out;
}

// macOS icon type codes for PNG data, by pixel size.
const ICNS_TYPES = {
  16: "icp4",
  32: "icp5",
  64: "icp6",
  128: "ic07",
  256: "ic08",
  512: "ic09",
  1024: "ic10",
};

function buildIcns(entries) {
  const list = [...entries]
    .filter((e) => ICNS_TYPES[e.size])
    .sort((a, b) => a.size - b.size);
  if (list.length === 0) throw new Error("icns needs at least one of: " + Object.keys(ICNS_TYPES).join(", "));

  const parts = list.map((e) => {
    const head = Buffer.alloc(8);
    head.write(ICNS_TYPES[e.size], 0, 4, "ascii");
    head.writeUInt32BE(8 + e.png.length, 4);
    return Buffer.concat([head, e.png]);
  });
  const body = Buffer.concat(parts);
  const out = Buffer.alloc(8 + body.length);
  out.write("icns", 0, 4, "ascii");
  out.writeUInt32BE(out.length, 4);
  body.copy(out, 8);
  return out;
}

const api = { buildIco, buildIcns, ICNS_TYPES };
if (typeof module !== "undefined" && module.exports) module.exports = api;
else globalThis.IconMakerLib = api;
