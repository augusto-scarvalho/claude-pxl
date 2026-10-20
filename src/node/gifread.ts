// GIF decoder (87a/89a): every frame composited as a viewer shows it (disposal, transparency,
// interlace, local palettes) with its delay. For `pxl study`, which reads animations to learn from.
import { pack, TRANSPARENT } from "../core/color.ts";
import { Img } from "../core/image.ts";

export interface GifRead { w: number; h: number; frames: { img: Img; ms: number }[] }

export function decodeGif(b: Uint8Array): GifRead {
  const sig = String.fromCharCode(...b.subarray(0, 6));
  if (sig !== "GIF87a" && sig !== "GIF89a") throw new Error("not a GIF");
  const u16 = (i: number) => b[i] | (b[i + 1] << 8);
  const w = u16(6), h = u16(8), flags = b[10];
  let p = 13;
  const table = (n: number) => { const t: number[] = []; for (let i = 0; i < n; i++) t.push(pack(b[p + 3 * i], b[p + 3 * i + 1], b[p + 3 * i + 2])); p += 3 * n; return t; };
  const global = flags & 0x80 ? table(2 << (flags & 7)) : [];
  const canvas = new Img(w, h), frames: { img: Img; ms: number }[] = [];
  let delay = 100, transparent = -1, disposal = 0;
  const blocks = () => { const parts: Uint8Array[] = []; while (p < b.length && b[p]) { parts.push(b.subarray(p + 1, p + 1 + b[p])); p += b[p] + 1; } p++; return parts; };
  while (p < b.length) {
    const k = b[p++];
    if (k === 0x3b) break;
    if (k === 0x21) {
      const label = b[p++];
      if (label === 0xf9 && b[p] >= 4) {
        const f = b[p + 1];
        disposal = (f >> 2) & 7;
        const cs = u16(p + 2);
        delay = cs >= 2 ? cs * 10 : 100;                                   // what browsers do with 0 and 1
        transparent = f & 1 ? b[p + 4] : -1;
      }
      blocks();
      continue;
    }
    if (k !== 0x2c) break;
    const fx = u16(p), fy = u16(p + 2), fw = u16(p + 4), fh = u16(p + 6), lf = b[p + 8];
    p += 9;
    const pal = lf & 0x80 ? table(2 << (lf & 7)) : global;
    const minCode = b[p++];
    const data = blocks(), idx = lzw(data, minCode, fw * fh);
    const saved = disposal === 3 ? canvas.copy() : null;
    // rows in the order an interlaced image stores them
    const rows: number[] = [];
    if (lf & 0x40) for (const [s, d] of [[0, 8], [4, 8], [2, 4], [1, 2]]) for (let y = s; y < fh; y += d) rows.push(y);
    else for (let y = 0; y < fh; y++) rows.push(y);
    rows.forEach((y, r) => {
      for (let x = 0; x < fw; x++) {
        const i = idx[r * fw + x];
        if (i === transparent || i >= pal.length) continue;
        canvas.set(fx + x, fy + y, pal[i]);
      }
    });
    frames.push({ img: canvas.copy(), ms: delay });
    if (disposal === 2) for (let y = fy; y < fy + fh; y++) for (let x = fx; x < fx + fw; x++) canvas.set(x, y, TRANSPARENT);
    else if (saved) canvas.data.set(saved.data);
    delay = 100; transparent = -1; disposal = 0;
  }
  return { w, h, frames };
}

/** LZW codes to palette indices (n of them). */
function lzw(parts: Uint8Array[], minCode: number, n: number): Uint8Array {
  const out = new Uint8Array(n), clear = 1 << minCode, end = clear + 1;
  const prefix = new Int32Array(4096), suffix = new Uint8Array(4096), first = new Uint8Array(4096), len = new Int32Array(4096);
  for (let i = 0; i < clear; i++) { prefix[i] = -1; suffix[i] = i; first[i] = i; len[i] = 1; }
  let size = minCode + 1, next = end + 1, prev = -1, o = 0, acc = 0, bits = 0;
  // a code's string, written backwards from its last index
  const put = (c: number) => { let k = c; for (let j = o + len[c] - 1; k >= 0; j--) { if (j < n) out[j] = suffix[k]; k = prefix[k]; } o += len[c]; };
  const add = (pre: number, ch: number) => {
    if (next >= 4096) return;
    prefix[next] = pre; suffix[next] = ch; first[next] = first[pre]; len[next] = len[pre] + 1; next++;
    if (next === 1 << size && size < 12) size++;
  };
  for (const part of parts) for (const byte of part) {
    acc |= byte << bits; bits += 8;
    while (bits >= size) {
      const code = acc & ((1 << size) - 1);
      acc >>>= size; bits -= size;
      if (code === clear) { size = minCode + 1; next = end + 1; prev = -1; continue; }
      if (code === end) return out;
      if (prev < 0) put(code);
      else if (code < next) { put(code); add(prev, first[code]); }
      else { add(prev, first[prev]); put(next - 1); }                       // the code being defined: prev + its own first
      prev = code;
      if (o >= n) return out;
    }
  }
  return out;
}
