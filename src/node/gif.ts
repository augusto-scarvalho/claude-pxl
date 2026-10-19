// Animated GIF encoder (GIF89a, looping). One global palette for all frames; more than 256
// colors (lit scenes) are reduced by median cut. Fully transparent pixels become the
// transparent index. Identical consecutive frames are merged. When no pixel is transparent (a
// scene), each frame after the first stores only the rectangle that changed, its unchanged pixels
// as the transparent index over the frame kept from before: in a scene where a few things move,
// that's most of the file gone.
import { TRANSPARENT } from "../core/color.ts";
import type { Img } from "../core/image.ts";

export interface GifFrame {
  img: Img;
  /** Duration in ms (GIF stores centiseconds; minimum 20ms). */
  ms: number;
}

export function encodeGif(frames: GifFrame[]): Buffer {
  if (!frames.length) throw new Error("gif needs at least one frame");
  const w = Math.max(...frames.map((f) => f.img.w)), h = Math.max(...frames.map((f) => f.img.h));
  const merged = mergeRepeats(frames);

  // Palette: every opaque color, reduced if needed; index 0 is transparent when any pixel is.
  const counts = new Map<number, number>();
  let transparent = false;
  for (const { img } of merged) {
    if (img.w < w || img.h < h) transparent = true;
    for (const c of img.data) {
      if (isClear(c)) { transparent = true; continue; }
      const rgb = c >>> 8;
      counts.set(rgb, (counts.get(rgb) ?? 0) + 1);
    }
  }
  // index 0 is kept for "transparent": a clear pixel in a sprite, or in a scene, "as before"
  const room = 255;
  const pal = counts.size <= room ? [...counts.keys()] : medianCut(counts, room);
  const colors = [0, ...pal];
  const base = 1;
  let bits = 1;
  while (1 << bits < colors.length) bits++;
  const exact = new Map<number, number>();
  pal.forEach((c, i) => exact.set(c, i + base));
  const indexOf = (rgb: number): number => {
    let i = exact.get(rgb);
    if (i === undefined) {
      i = nearest(pal, rgb) + base;
      exact.set(rgb, i);
    }
    return i;
  };

  const out: number[] = [];
  const u16 = (v: number) => out.push(v & 255, (v >> 8) & 255);
  out.push(...Buffer.from("GIF89a"));
  u16(w); u16(h);
  out.push(0x80 | 0x70 | (bits - 1), 0, 0);
  for (let i = 0; i < 1 << bits; i++) {
    const c = colors[i] ?? 0;
    out.push((c >> 16) & 255, (c >> 8) & 255, c & 255);
  }
  out.push(0x21, 0xff, 11, ...Buffer.from("NETSCAPE2.0"), 3, 1, 0, 0, 0);   // loop forever

  const minSize = Math.max(2, bits);
  let prev: Uint8Array | undefined;
  for (const { img, ms } of merged) {
    const cs = Math.max(2, Math.round(ms / 10));
    const idx = new Uint8Array(w * h);
    for (let y = 0; y < img.h; y++)
      for (let x = 0; x < img.w; x++) {
        const c = img.data[y * img.w + x];
        idx[y * w + x] = isClear(c) ? 0 : indexOf(c >>> 8);
      }
    // A sprite with clear pixels: whole frames, the area restored to background between them so they
    // don't pile up. A scene: after the first frame, only the rectangle that changed, what stayed the
    // same in it as index 0 (transparent), each frame left in place for the next to draw over.
    let [x0, y0, x1, y1] = [0, 0, w - 1, h - 1];
    if (!transparent && prev) {
      [x0, y0, x1, y1] = [w, h, -1, -1];
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++)
          if (idx[y * w + x] !== prev[y * w + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      if (x1 < 0) [x0, y0, x1, y1] = [0, 0, 0, 0];
    }
    const fw = x1 - x0 + 1, fh = y1 - y0 + 1, part = new Uint8Array(fw * fh);
    for (let y = 0; y < fh; y++)
      for (let x = 0; x < fw; x++) {
        const i = (y + y0) * w + x + x0;
        part[y * fw + x] = !transparent && prev && idx[i] === prev[i] ? 0 : idx[i];
      }
    out.push(0x21, 0xf9, 4, ((transparent ? 2 : 1) << 2) | (transparent || prev ? 1 : 0));
    u16(cs);
    out.push(0, 0);
    out.push(0x2c);
    u16(x0); u16(y0); u16(fw); u16(fh);
    out.push(0);
    prev = idx;
    out.push(minSize);
    const data = lzw(part, minSize);
    for (let i = 0; i < data.length; i += 255) {
      const n = Math.min(255, data.length - i);
      out.push(n);
      for (let j = 0; j < n; j++) out.push(data[i + j]);
    }
    out.push(0);
  }
  out.push(0x3b);
  return Buffer.from(out);
}

function isClear(c: number): boolean {
  return c === TRANSPARENT || (c & 255) === 0;
}

function mergeRepeats(frames: GifFrame[]): GifFrame[] {
  const out: GifFrame[] = [];
  for (const f of frames) {
    const prev = out[out.length - 1];
    if (prev && same(prev.img, f.img)) prev.ms += f.ms;
    else out.push({ img: f.img, ms: f.ms });
  }
  return out;
}

function same(a: Img, b: Img): boolean {
  if (a.w !== b.w || a.h !== b.h) return false;
  for (let i = 0; i < a.data.length; i++) if (a.data[i] !== b.data[i]) return false;
  return true;
}

/** LZW with variable code size, clearing the table when it fills (4096 codes). */
function lzw(index: Uint8Array, minSize: number): number[] {
  const clear = 1 << minSize, eoi = clear + 1;
  let size = minSize + 1, next = eoi + 1;
  let table = new Map<number, number>();
  const out: number[] = [];
  let cur = 0, shift = 0;
  const emit = (code: number) => {
    cur |= code << shift;
    shift += size;
    while (shift >= 8) {
      out.push(cur & 255);
      cur >>>= 8;
      shift -= 8;
    }
  };
  emit(clear);
  let code = index[0];
  for (let i = 1; i < index.length; i++) {
    const k = index[i], key = (code << 8) | k, hit = table.get(key);
    if (hit !== undefined) {
      code = hit;
      continue;
    }
    emit(code);
    if (next === 4096) {
      emit(clear);
      table = new Map();
      size = minSize + 1;
      next = eoi + 1;
    } else {
      if (next >= 1 << size) size++;
      table.set(key, next++);
    }
    code = k;
  }
  emit(code);
  emit(eoi);
  if (shift > 0) out.push(cur & 255);
  return out;
}

/**
 * Reduce 0xRRGGBB colors to n: median cut, then a few k-means passes. The cut weighs each color by
 * the square root of its count, so big flat areas (sky, grass) don't take every entry and small
 * distinct things (a lit figure) keep one of their own; k-means then moves each entry to the
 * count-weighted mean of the colors that map to it. On a lit 320x180 scene of 16 frames (8942
 * colors) this took the mean error from 17.5 to 1.9 and the worst on a small figure from 186 to 24.
 */
export function medianCut(counts: Map<number, number>, n: number): number[] {
  type Box = { cs: number[] };
  const ch = (c: number, k: number) => (c >> (16 - 8 * k)) & 255;
  const wt = (c: number) => Math.sqrt(counts.get(c)!);
  const range = (b: Box) => {
    let best = 0, axis = 0;
    for (let k = 0; k < 3; k++) {
      let lo = 255, hi = 0;
      for (const c of b.cs) { const v = ch(c, k); if (v < lo) lo = v; if (v > hi) hi = v; }
      if (hi - lo > best) { best = hi - lo; axis = k; }
    }
    return { best, axis };
  };
  const mean = (cs: number[], w: (c: number) => number) => {
    let r = 0, g = 0, bl = 0, wsum = 0;
    for (const c of cs) {
      const x = w(c);
      r += ch(c, 0) * x; g += ch(c, 1) * x; bl += ch(c, 2) * x; wsum += x;
    }
    return (Math.round(r / wsum) << 16) | (Math.round(g / wsum) << 8) | Math.round(bl / wsum);
  };
  const boxes: Box[] = [{ cs: [...counts.keys()] }];
  while (boxes.length < n) {
    let pick = -1, score = 0, axis = 0;
    boxes.forEach((b, i) => {
      if (b.cs.length < 2) return;
      const r = range(b);
      let wsum = 0;
      for (const c of b.cs) wsum += wt(c);
      const s = r.best * Math.sqrt(wsum);
      if (s > score) { score = s; pick = i; axis = r.axis; }
    });
    if (pick < 0) break;
    const b = boxes[pick];
    b.cs.sort((p, q) => ch(p, axis) - ch(q, axis));
    let total = 0;
    for (const c of b.cs) total += wt(c);
    let acc = 0, cut = 1;
    for (let i = 0; i < b.cs.length - 1; i++) {
      acc += wt(b.cs[i]);
      if (acc >= total / 2) { cut = i + 1; break; }
    }
    boxes.splice(pick, 1, { cs: b.cs.slice(0, cut) }, { cs: b.cs.slice(cut) });
  }
  let pal = boxes.map((b) => mean(b.cs, wt));
  for (let pass = 0; pass < 4; pass++) {
    const groups: number[][] = pal.map(() => []);
    for (const c of counts.keys()) groups[nearest(pal, c)].push(c);
    pal = groups.map((g, i) => (g.length ? mean(g, (c) => counts.get(c)!) : pal[i]));
  }
  return pal;
}

/** The image in at most n colors (median cut + k-means, nearest by eye), alpha kept. */
export function reduceColors(img: Img, n: number): Img {
  const counts = new Map<number, number>();
  for (const c of img.data) if (!isClear(c)) counts.set(c >>> 8, (counts.get(c >>> 8) ?? 0) + 1);
  if (counts.size <= n) return img;
  const pal = medianCut(counts, n), memo = new Map<number, number>(), o = img.copy();
  o.data.forEach((c, i) => {
    if (isClear(c)) return;
    let m = memo.get(c >>> 8);
    if (m === undefined) { m = pal[nearest(pal, c >>> 8)]; memo.set(c >>> 8, m); }
    o.data[i] = ((m << 8) | (c & 255)) >>> 0;
  });
  return o;
}

function nearest(pal: number[], rgb: number): number {
  const r = (rgb >> 16) & 255, g = (rgb >> 8) & 255, b = rgb & 255;
  let best = 0, bd = Infinity;
  for (let i = 0; i < pal.length; i++) {
    const c = pal[i], dr = ((c >> 16) & 255) - r, dg = ((c >> 8) & 255) - g, db = (c & 255) - b;
    const d = 2 * dr * dr + 4 * dg * dg + 3 * db * db;
    if (d < bd) { bd = d; best = i; }
  }
  return best;
}
