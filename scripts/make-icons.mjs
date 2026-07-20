// Generates the extension icons (no-entry ring on an enamel-red tile) as PNGs,
// dependency-free: pixels are rasterized here and encoded with node:zlib.
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SIZES = [16, 32, 48, 128];

const RED_TOP = [226, 90, 58];
const RED_BOTTOM = [178, 55, 30];
const CREAM = [250, 242, 222];

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(8 + data.length + 4);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

function encodePng(size, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  const stride = size * 4 + 1;
  const raw = Buffer.alloc(size * stride);
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0; // filter: none
    rgba.copy(raw, y * stride + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Geometry in unit coordinates (0..1), sampled with 4x4 supersampling.
function inTile(x, y) {
  const margin = 0.02;
  const radius = 0.24;
  const half = 0.5 - margin;
  const u = Math.abs(x - 0.5);
  const v = Math.abs(y - 0.5);
  if (u > half || v > half) return false;
  const cu = u - (half - radius);
  const cv = v - (half - radius);
  if (cu <= 0 || cv <= 0) return true;
  return cu * cu + cv * cv <= radius * radius;
}

function inGlyph(x, y) {
  const u = x - 0.5;
  const v = y - 0.5;
  const dist = Math.hypot(u, v);
  const ring = 0.29;
  const width = 0.095;
  if (Math.abs(dist - ring) <= width / 2) return true;
  // Diagonal bar of the no-entry sign, clipped to the ring's interior.
  const rotated = (v - u) / Math.SQRT2;
  return Math.abs(rotated) <= width / 2 && dist <= ring;
}

function drawIcon(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const SS = 4;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let tileHits = 0;
      let glyphHits = 0;
      for (let j = 0; j < SS; j++) {
        for (let i = 0; i < SS; i++) {
          const px = (x + (i + 0.5) / SS) / size;
          const py = (y + (j + 0.5) / SS) / size;
          if (!inTile(px, py)) continue;
          tileHits++;
          if (inGlyph(px, py)) glyphHits++;
        }
      }
      const samples = SS * SS;
      const alpha = tileHits / samples;
      if (alpha === 0) continue;
      const t = (y + 0.5) / size;
      const glyphShare = glyphHits / Math.max(tileHits, 1);
      const offset = (y * size + x) * 4;
      for (let c = 0; c < 3; c++) {
        const bg = RED_TOP[c] + (RED_BOTTOM[c] - RED_TOP[c]) * t;
        rgba[offset + c] = Math.round(bg + (CREAM[c] - bg) * glyphShare);
      }
      rgba[offset + 3] = Math.round(alpha * 255);
    }
  }
  return encodePng(size, rgba);
}

export function writeIcons(outDir) {
  mkdirSync(outDir, { recursive: true });
  for (const size of SIZES) {
    writeFileSync(join(outDir, `icon${size}.png`), drawIcon(size));
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  writeIcons(new URL('../dist/icons', import.meta.url).pathname);
  console.log('Icons written to dist/icons');
}
