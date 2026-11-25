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
  /** The rectangles ([x, y, w, h]) out of which it is the frame before, pixel for pixel: only they are read (else all). */
  changed?: number[][];
}

export interface GifOpts {
  /** Nearest-neighbor integer upscale applied to indexed frames before LZW (exact match to pre-scaled frames, s²x faster scan/quantize). */
  scale?: number;
  /** Reuse a precomputed RGB palette (skipping medianCut when encoding an upscaled preview of the same frames). */
  palette?: number[];
  /** Called with the chosen RGB palette so callers can reuse it for a derived preview GIF. */
  onPalette?: (pal: number[]) => void;
  /** Called with total input frames vs unique frames after deduplication (catches accidental static GIFs). */
  onInfo?: (info: { frames: number; unique: number }) => void;
}

/**
 * The frames given at once, or made on demand: a function giving them afresh at each call (twice: the colors, then the
 * encoding), each frame read before the next is asked for, so one may be drawn over the one before (playAll's).
 */
export function encodeGif(frames: GifFrame[] | (() => Iterable<GifFrame>), opts: GifOpts = {}): Buffer {
  const S = Math.max(1, Math.floor(opts.scale ?? 1));
  const each = typeof frames === "function" ? frames : () => frames;
  const copy = each === frames, { w: rw, h: rh, transparent, counts, repeat, ms } = scan(each, copy, false) ?? scan(each, copy, true)!;
  opts.onInfo?.({ frames: repeat.length, unique: ms.length });
  const w = rw * S, h = rh * S;
  // index 0 is kept for "transparent": a clear pixel in a sprite, or in a scene, "as before"
  const room = 255;
  const pal = opts.palette ?? (counts.size <= room ? [...counts.keys()] : medianCut(counts, room));
  opts.onPalette?.(pal);
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

  const gctSize = (1 << bits) * 3;
  const head = new Uint8Array(13 + gctSize + 19);
  head.set([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, w & 255, (w >> 8) & 255, h & 255, (h >> 8) & 255, 0x80 | 0x70 | (bits - 1), 0, 0], 0);
  for (let i = 0; i < 1 << bits; i++) {
    const c = colors[i] ?? 0, o = 13 + i * 3;
    head[o] = (c >> 16) & 255; head[o + 1] = (c >> 8) & 255; head[o + 2] = c & 255;
  }
  head.set([0x21, 0xff, 11, 0x4e, 0x45, 0x54, 0x53, 0x43, 0x41, 0x50, 0x45, 0x32, 0x2e, 0x30, 3, 1, 0, 0, 0], 13 + gctSize);
  const chunks: Uint8Array[] = [head];

  const minSize = Math.max(2, bits);
  let prev: Uint8Array | undefined, due = 0, n = 0, k = 0, pw = 0, ph = 0;
  for (const f of each()) {
    if (repeat[n++]) continue;
    // in centiseconds, each frame's rounding carried to the next, so the loop keeps its length (30 fps: 3, 4, 3 cs); only
    // the rounding's half a cs at most: what the 2 cs floor adds (60 fps) isn't taken from a later frame
    due += ms[k++] / 10;
    const cs = Math.max(2, Math.round(due));
    due = Math.max(-0.5, Math.min(0.5, due - cs));
    // (what changed indexed again, the rest the frame before's)
    const { img } = f, rects = prev && pw === img.w && ph === img.h ? f.changed : undefined, idx = rects ? prev!.slice() : new Uint8Array(rw * rh);
    pw = img.w; ph = img.h;
    let last = -1, at = 0, l2 = -1, a2 = 0;   // (a pixel the same as one of the two colors before it asks no map)
    for (const [rx, ry, rw0, rh0] of rects ?? [[0, 0, img.w, img.h]])
      for (let y = ry; y < ry + rh0; y++)
        for (let x = rx, i = y * img.w + rx, o = y * rw + rx, e = rx + rw0; x < e; x++, i++, o++) {
          const c = img.data[i];
          if (c !== last) {
            const iv = c === l2 ? a2 : isClear(c) ? 0 : indexOf(c >>> 8);
            l2 = last; a2 = at; last = c; at = iv;
          }
          idx[o] = at;
        }
    // A sprite with clear pixels: whole frames, the area restored to background between them so they
    // don't pile up. A scene: after the first frame, only the rectangle that changed, what stayed the
    // same in it as index 0 (transparent), each frame left in place for the next to draw over.
    let [x0, y0, x1, y1] = [0, 0, rw - 1, rh - 1];
    if (!transparent && prev) {
      [x0, y0, x1, y1] = [rw, rh, -1, -1];
      for (const [rx, ry, rw0, rh0] of rects ?? [[0, 0, rw, rh]])
        for (let y = ry; y < ry + rh0; y++)
          for (let x = rx, i = y * rw + rx, e = rx + rw0; x < e; x++, i++)
            if (idx[i] !== prev[i]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      if (x1 < 0) [x0, y0, x1, y1] = [0, 0, 0, 0];
    }
    // (in a scene, out of what changed it is the frame before: index 0, as the rectangle starts)
    const rfw = x1 - x0 + 1, rfh = y1 - y0 + 1, fw = rfw * S, fh = rfh * S;
    let part: Uint8Array;
    if (S === 1 && (transparent || !prev)) {
      part = idx;
    } else {
      part = new Uint8Array(fw * fh);
      if (S === 1) {
        if (!transparent && rects) {
          for (const [rx, ry, rw0, rh0] of rects)
            for (let y = Math.max(ry, y0); y < Math.min(ry + rh0, y1 + 1); y++)
              for (let x = Math.max(rx, x0), e = Math.min(rx + rw0, x1 + 1); x < e; x++) {
                const i = y * rw + x;
                part[(y - y0) * fw + x - x0] = idx[i] === prev![i] ? 0 : idx[i];
              }
        } else {
          for (let y = y0; y <= y1; y++) {
            const pRow = (y - y0) * fw, sRow = y * rw;
            for (let x = x0; x <= x1; x++) {
              const i = sRow + x;
              part[pRow + x - x0] = idx[i] === prev![i] ? 0 : idx[i];
            }
          }
        }
      } else {
        for (const [rx, ry, rw0, rh0] of !transparent && rects ? rects : [[x0, y0, rfw, rfh]])
          for (let y = Math.max(ry, y0); y < Math.min(ry + rh0, y1 + 1); y++) {
            const baseRow = (y - y0) * S * fw;
            for (let x = Math.max(rx, x0), e = Math.min(rx + rw0, x1 + 1); x < e; x++) {
              const i = y * rw + x, v = !transparent && prev && idx[i] === prev[i] ? 0 : idx[i];
              if (!v) continue;
              const bx = baseRow + (x - x0) * S;
              for (let sx = 0; sx < S; sx++) part[bx + sx] = v;
            }
            for (let sy = 1; sy < S; sy++) part.copyWithin(baseRow + sy * fw, baseRow, baseRow + fw);
          }
      }
    }
    const sx = x0 * S, sy = y0 * S;
    const fhead = new Uint8Array([
      0x21, 0xf9, 4, ((transparent ? 2 : 1) << 2) | (transparent || prev ? 1 : 0),
      cs & 255, (cs >> 8) & 255, 0, 0,
      0x2c, sx & 255, (sx >> 8) & 255, sy & 255, (sy >> 8) & 255,
      fw & 255, (fw >> 8) & 255, fh & 255, (fh >> 8) & 255, 0, minSize,
    ]);
    prev = idx;
    chunks.push(fhead, lzwSubBlocks(part, minSize));
  }
  chunks.push(new Uint8Array([0x3b]));
  return Buffer.concat(chunks);
}

/**
 * The frames read once: the canvas, the frames the same as the one before (their time added to it; one held, a copy of
 * what was read when they are made on demand, as a frame may be drawn over the one before), and the colors: every
 * opaque one, counted in the order met, which is the palette's. `whole`: every frame's colors counted pixel by pixel;
 * else, once a frame comes that says where it changed, only there, for colors not met yet. Those come last, so the
 * palette's order is known when there is one at most and the palette holds them all (no cut, which reads the counts):
 * else undefined, to be read again whole.
 */
function scan(each: () => Iterable<GifFrame>, copy: boolean, whole: boolean) {
  let w = 0, h = 0, mw = Infinity, mh = Infinity, held: Uint32Array | undefined, hw = 0, hh = 0, by = false;
  const repeat: boolean[] = [], ms: number[] = [], later = new Set<number>();
  // (the last two colors met counted when a third comes, the older first: no map asked at each pixel, the colors met in
  // the same order; two, as the checker behind a preview's clear pixels at 1x changes at every pixel)
  const counts = new Map<number, number>();
  let transparent = false, a = -1, na = 0, b = -1, nb = 0;
  const add = (c: number, n: number) => { if (n) counts.set(c >>> 8, (counts.get(c >>> 8) ?? 0) + n); };
  for (const f of each()) {
    const { img } = f, d = img.data, rects = held && hw === img.w && hh === img.h ? f.changed : undefined;
    let same = !!held && hw === img.w && hh === img.h;
    for (const [x0, y0, rw, rh] of rects ?? [[0, 0, img.w, img.h]])
      for (let y = y0; y < y0 + rh && same; y++)
        for (let i = y * img.w + x0, e = i + rw; i < e; i++) if (d[i] !== held![i]) { same = false; break; }
    repeat.push(same);
    if (same) { ms[ms.length - 1] += f.ms; continue; }
    if (rects && copy) for (const [x0, y0, rw, rh] of rects) for (let y = y0; y < y0 + rh; y++) held!.set(d.subarray(y * img.w + x0, y * img.w + x0 + rw), y * img.w + x0);
    else { held = copy ? d.slice() : d; hw = img.w; hh = img.h; }
    w = Math.max(w, img.w); h = Math.max(h, img.h); mw = Math.min(mw, img.w); mh = Math.min(mh, img.h);
    ms.push(f.ms);
    if ((by ||= !whole && !!rects)) {
      let l1 = -1, l2 = -1;
      for (const [x0, y0, rw, rh] of rects ?? [[0, 0, img.w, img.h]])
        for (let y = y0; y < y0 + rh; y++)
          for (let i = y * img.w + x0, e = i + rw; i < e; i++) {
            const c = d[i];
            if (c === l1 || c === l2) continue;
            l2 = l1; l1 = c;
            if (isClear(c)) transparent = true;
            else if (!counts.has(c >>> 8)) later.add(c >>> 8);
          }
      continue;
    }
    for (let i = 0; i < d.length; i++) {
      const c = d[i];
      if (c === b) nb++;
      else if (c === a) na++;
      else if (isClear(c)) transparent = true;
      else { add(a, na); a = b; na = nb; b = c; nb = 1; }
    }
  }
  if (!ms.length) throw new Error("gif needs at least one frame");
  for (const c of by ? [a, b] : []) if (c !== -1 && !counts.has(c >>> 8)) later.add(c >>> 8);
  if (by && (later.size > 1 || counts.size + later.size > 255)) return undefined;
  add(a, na); add(b, nb);
  for (const c of later) if (!counts.has(c)) counts.set(c, 1);
  return { w, h, transparent: transparent || mw < w || mh < h, counts, repeat, ms };
}

function isClear(c: number): boolean {
  return c === TRANSPARENT || (c & 255) === 0;
}

// LZW's table, at (code << 8) | the index after it: the code of the two (0: none), emptied of what it was given after
// each use (a map asked at each pixel was most of a big GIF's LZW)
const table = new Uint16Array(4096 << 8), used = new Int32Array(4096);
let lzwBuf = new Uint8Array(65536);

/** LZW with variable code size, emitting GIF 255-byte sub-blocks + terminator directly into a single flat slice. */
function lzwSubBlocks(index: Uint8Array, minSize: number): Uint8Array {
  const clear = 1 << minSize, eoi = clear + 1;
  // Worst-case LZW bytes (<= 1.6x pixels) plus sub-block length headers (1/255) and terminator
  const maxBytes = index.length * 2 + 64;
  if (lzwBuf.length < maxBytes) lzwBuf = new Uint8Array(Math.max(maxBytes, lzwBuf.length * 2));
  const out = lzwBuf;
  let size = minSize + 1, next = eoi + 1, usedLen = 0;
  let subPos = 0, subLen = 0, outLen = 1;
  let cur = clear, shift = size;
  while (shift >= 8) {
    out[outLen++] = cur & 255;
    cur >>>= 8;
    shift -= 8;
    subLen++;
  }
  let code = index[0];
  for (let i = 1, len = index.length; i < len; i++) {
    const k = index[i], key = (code << 8) | k, hit = table[key];
    if (hit) {
      code = hit;
      continue;
    }
    cur |= code << shift;
    shift += size;
    while (shift >= 8) {
      if (subLen === 255) { out[subPos] = 255; subPos = outLen++; subLen = 0; }
      out[outLen++] = cur & 255;
      cur >>>= 8;
      shift -= 8;
      subLen++;
    }
    if (next === 4096) {
      cur |= clear << shift;
      shift += size;
      while (shift >= 8) {
        if (subLen === 255) { out[subPos] = 255; subPos = outLen++; subLen = 0; }
        out[outLen++] = cur & 255;
        cur >>>= 8;
        shift -= 8;
        subLen++;
      }
      for (let u = 0; u < usedLen; u++) table[used[u]] = 0;
      usedLen = 0;
      size = minSize + 1;
      next = eoi + 1;
    } else {
      if (next >= 1 << size) size++;
      table[key] = next++;
      used[usedLen++] = key;
    }
    code = k;
  }
  cur |= code << shift;
  shift += size;
  while (shift >= 8) {
    if (subLen === 255) { out[subPos] = 255; subPos = outLen++; subLen = 0; }
    out[outLen++] = cur & 255;
    cur >>>= 8;
    shift -= 8;
    subLen++;
  }
  cur |= eoi << shift;
  shift += size;
  while (shift >= 8) {
    if (subLen === 255) { out[subPos] = 255; subPos = outLen++; subLen = 0; }
    out[outLen++] = cur & 255;
    cur >>>= 8;
    shift -= 8;
    subLen++;
  }
  if (shift > 0) {
    if (subLen === 255) { out[subPos] = 255; subPos = outLen++; subLen = 0; }
    out[outLen++] = cur & 255;
    subLen++;
  }
  out[subPos] = subLen;
  out[outLen++] = 0;
  for (let u = 0; u < usedLen; u++) table[used[u]] = 0;
  return out.slice(0, outLen);
}

/**
 * Reduce 0xRRGGBB colors to n: median cut, then a few k-means passes. The cut weighs each color by
 * the square root of its count, so big flat areas (sky, grass) don't take every entry and small
 * distinct things (a lit figure) keep one of their own; k-means then moves each entry to the
 * count-weighted mean of the colors that map to it. On a lit 320x180 scene of 16 frames (8942
 * colors) this took the mean error from 17.5 to 1.9 and the worst on a small figure from 186 to 24.
 */
export function medianCut(counts: Map<number, number>, n: number): number[] {
  // a box's score and axis worked out once, when it is made (asked again at every cut, they made the cut cost n times the colors)
  type Box = { cs: number[]; s: number; axis: number };
  const ch = (c: number, k: number) => (c >> (16 - 8 * k)) & 255;
  const wt = (c: number) => Math.sqrt(counts.get(c)!);
  const box = (cs: number[]): Box => {
    if (cs.length < 2) return { cs, s: 0, axis: 0 };
    let best = 0, axis = 0, wsum = 0;
    for (let k = 0; k < 3; k++) {
      let lo = 255, hi = 0;
      for (const c of cs) { const v = ch(c, k); if (v < lo) lo = v; if (v > hi) hi = v; }
      if (hi - lo > best) { best = hi - lo; axis = k; }
    }
    for (const c of cs) wsum += wt(c);
    return { cs, s: best * Math.sqrt(wsum), axis };
  };
  const mean = (cs: number[], w: (c: number) => number) => {
    let r = 0, g = 0, bl = 0, wsum = 0;
    for (const c of cs) {
      const x = w(c);
      r += ch(c, 0) * x; g += ch(c, 1) * x; bl += ch(c, 2) * x; wsum += x;
    }
    return (Math.round(r / wsum) << 16) | (Math.round(g / wsum) << 8) | Math.round(bl / wsum);
  };
  const boxes: Box[] = [box([...counts.keys()])];
  while (boxes.length < n) {
    let pick = -1, score = 0;
    boxes.forEach((b, i) => { if (b.s > score) { score = b.s; pick = i; } });
    if (pick < 0) break;
    const b = boxes[pick], axis = b.axis;
    b.cs.sort((p, q) => ch(p, axis) - ch(q, axis));
    let total = 0;
    for (const c of b.cs) total += wt(c);
    let acc = 0, cut = 1;
    for (let i = 0; i < b.cs.length - 1; i++) {
      acc += wt(b.cs[i]);
      if (acc >= total / 2) { cut = i + 1; break; }
    }
    boxes.splice(pick, 1, box(b.cs.slice(0, cut)), box(b.cs.slice(cut)));
  }
  let pal = boxes.map((b) => mean(b.cs, wt));
  // Unpack unique colors and palette into flat typed arrays once; green has the largest weight (4),
  // so checking 4 * dg² >= bd skips most palette entries in the 4 k-means passes without changing any pick.
  const M = counts.size, cr = new Int32Array(M), cg = new Int32Array(M), cb = new Int32Array(M), cw = new Float64Array(M);
  let mi = 0;
  for (const [c, cnt] of counts) { cr[mi] = (c >> 16) & 255; cg[mi] = (c >> 8) & 255; cb[mi] = c & 255; cw[mi] = cnt; mi++; }
  const P = pal.length, pr = new Int32Array(P), pg = new Int32Array(P), pb = new Int32Array(P);
  const sr = new Float64Array(P), sg = new Float64Array(P), sb = new Float64Array(P), sw = new Float64Array(P);
  for (let pass = 0; pass < 4; pass++) {
    for (let i = 0; i < P; i++) { const c = pal[i]; pr[i] = (c >> 16) & 255; pg[i] = (c >> 8) & 255; pb[i] = c & 255; }
    sr.fill(0); sg.fill(0); sb.fill(0); sw.fill(0);
    for (let j = 0; j < M; j++) {
      const r = cr[j], g = cg[j], b = cb[j], w = cw[j];
      let best = 0, bd = 1e9;
      for (let i = 0; i < P; i++) {
        const dg = pg[i] - g, d0 = 4 * dg * dg;
        if (d0 >= bd) continue;
        const dr = pr[i] - r, d1 = d0 + 2 * dr * dr;
        if (d1 >= bd) continue;
        const db = pb[i] - b, d = d1 + 3 * db * db;
        if (d < bd) { bd = d; best = i; }
      }
      sr[best] += r * w; sg[best] += g * w; sb[best] += b * w; sw[best] += w;
    }
    for (let i = 0; i < P; i++)
      if (sw[i] > 0) pal[i] = (Math.round(sr[i] / sw[i]) << 16) | (Math.round(sg[i] / sw[i]) << 8) | Math.round(sb[i] / sw[i]);
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
