/**
 * Hand-rolls a simple 256x256 PNG app icon (no image-library dependency —
 * this only needs to run once, so a raw PNG encoder is cheaper than adding
 * a native/image dependency for it). Indigo square, white "T" mark.
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const SIZE = 256;
const BG = [91, 60, 196]; // matches the ERP's primary brand color
const FG = [255, 255, 255];

function inT(x, y) {
  // Horizontal bar of the T
  if (y >= 64 && y < 96 && x >= 48 && x < 208) return true;
  // Vertical stem of the T
  if (x >= 112 && x < 144 && y >= 64 && y < 192) return true;
  return false;
}

function buildPixels() {
  const raw = Buffer.alloc(SIZE * (1 + SIZE * 4));
  for (let y = 0; y < SIZE; y++) {
    const rowStart = y * (1 + SIZE * 4);
    raw[rowStart] = 0; // filter type: none
    for (let x = 0; x < SIZE; x++) {
      const [r, g, b] = inT(x, y) ? FG : BG;
      const off = rowStart + 1 + x * 4;
      raw[off] = r;
      raw[off + 1] = g;
      raw[off + 2] = b;
      raw[off + 3] = 255;
    }
  }
  return raw;
}

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function buildPng() {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(SIZE, 0);
  ihdrData.writeUInt32BE(SIZE, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type: RGBA
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  const idatData = zlib.deflateSync(buildPixels());

  return Buffer.concat([
    signature,
    chunk("IHDR", ihdrData),
    chunk("IDAT", idatData),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const outDir = path.join(__dirname, "..", "electron", "assets");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "icon.png"), buildPng());
console.log("Wrote", path.join(outDir, "icon.png"));
