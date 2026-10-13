// iconshape.js — turn any picture into a cute app-style icon:
// center-crop to a square, round the corners (iOS-style squircle-ish).
// Pure JS, no dependencies (the packaged app ships without node_modules).
const zlib = require("node:zlib");

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
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

// Minimal PNG decoder: 8-bit, RGB or RGBA, non-interlaced.
// (That is exactly what Electron's nativeImage.toPNG() produces.)
function decodePng(buf) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (!buf.subarray(0, 8).equals(sig)) throw new Error("not a PNG");
  let pos = 8;
  let width, height, bitDepth, colorType;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.subarray(pos + 4, pos + 8).toString("ascii");
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
    pos += 12 + len;
  }
  if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6)) {
    throw new Error(`unsupported PNG (depth ${bitDepth}, type ${colorType})`);
  }
  const ch = colorType === 6 ? 4 : 3;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * ch;
  const data = Buffer.alloc(width * height * 4);
  let p = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[p++];
    for (let x = 0; x < width; x++) {
      for (let c = 0; c < ch; c++) {
        const i = p++;
        let v = raw[i];
        const a = x > 0 ? data[(y * width + x - 1) * 4 + c] : 0;
        const b = y > 0 ? data[((y - 1) * width + x) * 4 + c] : 0;
        const cc = x > 0 && y > 0 ? data[((y - 1) * width + x - 1) * 4 + c] : 0;
        if (filter === 1) v = (v + a) & 255;
        else if (filter === 2) v = (v + b) & 255;
        else if (filter === 3) v = (v + ((a + b) >> 1)) & 255;
        else if (filter === 4) {
          const pp = a + b - cc;
          const pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - cc);
          v = (v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : cc)) & 255;
        }
        data[(y * width + x) * 4 + c] = v;
      }
      if (ch === 3) data[(y * width + x) * 4 + 3] = 255;
    }
  }
  return { width, height, data };
}

function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0;
    rgba.copy(raw, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

function inRoundedRect(x, y, size, r) {
  let dx = 0, dy = 0, corner = false;
  if (x < r && y < r) { dx = r - x; dy = r - y; corner = true; }
  else if (x >= size - r && y < r) { dx = x - (size - r); dy = r - y; corner = true; }
  else if (x < r && y >= size - r) { dx = r - x; dy = y - (size - r); corner = true; }
  else if (x >= size - r && y >= size - r) { dx = x - (size - r); dy = y - (size - r); corner = true; }
  return !corner || dx * dx + dy * dy <= r * r;
}

// Crop to a centered square and round the corners. radiusRatio ~0.225 looks like iOS.
function squircleIcon(pngBuf, size, radiusRatio = 0.225) {
  const { width: W, height: H, data } = decodePng(pngBuf);
  if (W < size || H < size) throw new Error(`picture too small after scaling (${W}x${H}, need ${size})`);
  const r = Math.round(size * radiusRatio);
  const ox = Math.floor((W - size) / 2);
  const oy = Math.floor((H - size) / 2);
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const di = (y * size + x) * 4;
      const si = ((oy + y) * W + (ox + x)) * 4;
      out[di] = data[si];
      out[di + 1] = data[si + 1];
      out[di + 2] = data[si + 2];
      out[di + 3] = inRoundedRect(x, y, size, r) ? data[si + 3] : 0;
    }
  }
  return encodePng(size, size, out);
}

const api = { decodePng, encodePng, squircleIcon };
if (typeof module !== "undefined" && module.exports) module.exports = api;
else globalThis.IconShapeLib = api;
