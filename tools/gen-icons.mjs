// Génère les icônes PWA (icon-192.png, icon-512.png, maskable-512.png) — encodage PNG minimal (zlib natif)
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}
function png(w, h, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type RGBA
  const raw = Buffer.alloc(h * (1 + w * 4));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 4)] = 0; // filter none
    rgba.copy(raw, y * (1 + w * 4) + 1, y * w * 4, (y + 1) * w * 4);
  }
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

// ---- géométrie ----
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
function sdRoundRect(px, py, cx, cy, hw, hh, r) {
  const qx = Math.abs(px - cx) - (hw - r);
  const qy = Math.abs(py - cy) - (hh - r);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const t = clamp01(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
const mix = (c1, c2, t) => [
  Math.round(lerp(c1[0], c2[0], t)),
  Math.round(lerp(c1[1], c2[1], t)),
  Math.round(lerp(c1[2], c2[2], t))
];

function draw(size, { maskable = false } = {}) {
  const px = (u) => u * size; // unit [0,1] -> px
  const rgba = Buffer.alloc(size * size * 4);
  const green1 = [143, 240, 180];
  const green2 = [52, 211, 153];
  const ac = [252, 106, 106];
  // marque (dans la zone sûre centrale)
  const ax = 0.30, bx = 0.70, t1 = 0.20, t2 = 0.80;
  const eps = maskable ? 0.06 : 0.02;
  const rrR = px(0.22);
  const cxx = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size, v = (y + 0.5) / size;
      let bgA = 1;
      if (!maskable) {
        const d = sdRoundRect(x, y, cxx, cxx, size / 2 - 1, size / 2 - 1, rrR);
        bgA = clamp01(0.75 - d); // anticrénelage
      }
      const t = clamp01((v - 0.12) * 1.4);
      let col = mix([13, 26, 44], [22, 37, 59], t);
      // barres verticales
      const inL = x >= px(ax) && x <= px(ax + 0.13) && y >= px(t1) && y <= px(t2);
      const inR = x >= px(bx - 0.13) && x <= px(bx) && y >= px(t1) && y <= px(t2);
      // diagonale (barre inclinée)
      const dDiag = segDist(x, y, px(ax + 0.13), px(t1 + 0.06), px(bx - 0.13), px(t2 - 0.06));
      const diagA = clamp01(px(0.055) / 2 + 0.75 - dDiag);
      // point rouge décoratif en bas à droite
      const dDot = Math.hypot(x - px(0.80), y - px(0.82));
      const dotA = clamp01(px(0.045) + 0.75 - dDot);

      if (inL || inR) col = mix(green1, [105, 240, 175], v);
      // fusion diagonale puis point
      col = mix(col, green2, diagA * 0.85);
      col = mix(col, ac, dotA * 0.95);
      const A = Math.round(bgA * 255);
      const i = (y * size + x) * 4;
      rgba[i] = col[0]; rgba[i + 1] = col[1]; rgba[i + 2] = col[2]; rgba[i + 3] = A;
    }
  }
  return png(size, size, rgba);
}

const dir = fileURLToPath(new URL('../icons/', import.meta.url));
writeFileSync(`${dir}icon-192.png`, draw(192));
writeFileSync(`${dir}icon-512.png`, draw(512));
writeFileSync(`${dir}maskable-512.png`, draw(512, { maskable: true }));
console.log('icônes générées:', `${dir}icon-192.png`, `${dir}icon-512.png`, `${dir}maskable-512.png`);