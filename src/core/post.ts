// Post: what a camera does to the picture once the scene is drawn, the HD-2D look (Octopath
// Traveler's dioramas): haze with distance; a depth of field that keeps one band of depth sharp and
// blurs what is nearer and farther (from a camera high up, the tilt-shift look of a model); a bloom
// round what is bright; darker corners. Depth is mesh()'s (Img.depth): what it didn't draw (a sky
// painted under it) is far away. In linear light; the blurs at a fraction of the picture's size
// (they are smooth) and brought back up bilinearly. Then the finish (Three's and Babylon's, written
// anew): a sharpen, a grade from a 3D LUT, a grain that changes with the frame, and the picture taken
// back to the palette. It leaves the palette (colors mix) unless that last one brings it back.
import { type Color, LIN, TRANSPARENT, fromLinear } from "./color.ts";
import { runEffect } from "./effects.ts";
import { PxError } from "./errors.ts";
import type { Img } from "./image.ts";
import { blur } from "./normals.ts";
import type { Palette } from "./palette.ts";
import { hash } from "./util.ts";

export interface PostOpts {
  /** the pixel [col, row] whose depth is sharp (default the picture's middle) */
  focus?: [number, number];
  /** m of depth either side of the focus that stay sharp (default 1) */
  sharp?: number;
  /**
   * m past that over which the blur grows to full (default 4), or two, [nearer, farther] (Unreal's near
   * and far transition regions); it grows slowly at first, faster in the middle, and eases into full
   */
  soft?: number | [number, number];
  /** the most blur, about its radius in px (default 0: none) */
  blur?: number;
  /**
   * a glow round what is brighter than `above` (0..1, default 0.75), `r` px out (default 1/40 of the
   * width), at `strength` (default 0.6); a number is the strength. `levels`: Three's way instead, the
   * bright part at half size and at `levels` sizes each half the last, blurred and added back, `spread`
   * (0..1, default 0.4) of the weight moved toward the big ones
   */
  bloom?: number | { above?: number; r?: number; strength?: number; levels?: number; spread?: number };
  /** haze toward `color` from `from` m of depth to `to`, up to `max` of it there (default 0.6) */
  fog?: { color: string; from: number; to: number; max?: number };
  /** darker corners: 0 none (default), 1 black */
  vignette?: number;
  /** px to an art pixel (default 1): sharpen, grain and the palette's dither work in blocks of it */
  pixel?: number;
  /** each pixel stepped away from its four neighbours a pixel off (a block off), by this much of the difference (0 none, 0.2-0.3 a little) */
  sharpen?: number;
  /** a grade: a 3D LUT (the DSL reads `"dusk.cube"` into one), at `amount` (0..1, default 1) */
  lut?: Lut | { cube: Lut; amount?: number };
  /** film grain in blocks of `pixel`, new each frame (`animated: false`: the same in every frame), most in the middle tones: up to `amount` of full scale (0..1) */
  grain?: number | { amount?: number; seed?: number; animated?: boolean };
  /** the picture taken back to the palette's colors (true), or to those keys, ordered-dithered between two by `dither` (0..1, default 1; 0 the nearest) */
  palette?: true | string | string[] | { keys?: string | string[]; dither?: number };
}

/** A 3D LUT: size^3 colors (r, g, b in 0..1), red changing fastest, as a .cube file lists them. */
export interface Lut { size: number; data: Float32Array }

/** Read a .cube file (Adobe's, Resolve's): LUT_3D_SIZE n, an optional DOMAIN_MIN / DOMAIN_MAX, then n^3 lines of r g b. */
export function readCube(text: string, name = "LUT"): Lut {
  let size = 0, lo = [0, 0, 0], hi = [1, 1, 1];
  const vals: number[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    if (!line || /^TITLE\b/.test(line)) continue;
    const [k, ...rest] = line.split(/\s+/);
    if (k === "LUT_3D_SIZE") size = Number(rest[0]);
    else if (k === "LUT_1D_SIZE") throw new PxError(`${name}: a 1D LUT; post's lut takes a 3D one (LUT_3D_SIZE)`);
    else if (k === "DOMAIN_MIN") lo = rest.map(Number);
    else if (k === "DOMAIN_MAX") hi = rest.map(Number);
    else if (/^[-+.\d]/.test(k)) vals.push(Number(k), ...rest.map(Number));
  }
  if (!(Number.isInteger(size) && size >= 2 && size <= 256)) throw new PxError(`${name}: no LUT_3D_SIZE from 2 to 256`);
  if (vals.length !== 3 * size ** 3 || !vals.every(Number.isFinite)) throw new PxError(`${name}: LUT_3D_SIZE ${size} wants ${size ** 3} lines of r g b, got ${vals.length / 3}`);
  // a domain other than 0..1 is brought to it, so the lookup reads every color the same way
  const data = Float32Array.from(vals, (v, i) => (v - lo[i % 3]) / (hi[i % 3] - lo[i % 3]));
  return { size, data };
}

/** The last vignette's factor per pixel: an animation's frames share one. */
const VIGNETTE = new Map<string, Float32Array>();
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Cells of f x f px over a w x h picture: lw x lh of them, and each pixel's share of its cell. */
const cells = (w: number, h: number, f: number) => ({ lw: Math.ceil(w / f), lh: Math.ceil(h / f), share: 1 / (f * f), col: Int32Array.from({ length: w }, (_, x) => Math.floor(x / f)) });

/** A low-res plane widened to the picture's width, bilinear across; a row of the picture is then a lerp of two of its rows (rowOf). */
function widen(p: Float64Array, lw: number, lh: number, f: number, w: number): Float32Array {
  const out = new Float32Array(w * lh);
  for (let x = 0; x < w; x++) {
    const lx = Math.max(0, Math.min(lw - 1, (x + 0.5) / f - 0.5)), x0 = Math.floor(lx), x1 = Math.min(lw - 1, x0 + 1), t = lx - x0;
    for (let y = 0; y < lh; y++) out[y * w + x] = p[y * lw + x0] + (p[y * lw + x1] - p[y * lw + x0]) * t;
  }
  return out;
}
/** For row y: where the two widened rows to lerp start, and how far between them. */
function rowOf(y: number, lh: number, f: number, w: number): [number, number, number] {
  const ly = Math.max(0, Math.min(lh - 1, (y + 0.5) / f - 0.5)), y0 = Math.floor(ly);
  return [y0 * w, Math.min(lh - 1, y0 + 1) * w, ly - y0];
}

const num = (v: unknown, lo: number, hi: number) => typeof v === "number" && v >= lo && v <= hi;

/** A box average down to half size (an odd edge's cells of fewer pixels). */
function half(p: ArrayLike<number>, w: number, h: number): Float64Array {
  const hw = Math.ceil(w / 2), hh = Math.ceil(h / 2), out = new Float64Array(hw * hh);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out[(y >> 1) * hw + (x >> 1)] += p[y * w + x];
  for (let Y = 0; Y < hh; Y++) for (let X = 0; X < hw; X++) out[Y * hw + X] /= Math.min(2, w - 2 * X) * Math.min(2, h - 2 * Y);
  return out;
}

/** Add a low-res plane (1/f of the size) to a picture's plane, brought up bilinearly, times k. */
function addUp(to: Float32Array, p: Float64Array, lw: number, lh: number, f: number, w: number, h: number, k: number): void {
  const wide = widen(p, lw, lh, f, w);
  for (let y = 0; y < h; y++) {
    const [a, b, t] = rowOf(y, lh, f, w);
    for (let x = 0; x < w; x++) to[y * w + x] += (wide[a + x] + (wide[b + x] - wide[a + x]) * t) * k;
  }
}

/** The color at sRGB (r, g, b) 0..255 through a 3D LUT, trilinear between its entries, into out[0..2]. */
function lookup(L: Lut, r: number, g: number, b: number, out: Float64Array): void {
  const N = L.size - 1, S = L.size, d = L.data, fr = (r / 255) * N, fg = (g / 255) * N, fb = (b / 255) * N;
  const r0 = Math.min(N - 1, Math.floor(fr)), g0 = Math.min(N - 1, Math.floor(fg)), b0 = Math.min(N - 1, Math.floor(fb));
  const tr = fr - r0, tg = fg - g0, tb = fb - b0, i000 = 3 * (r0 + g0 * S + b0 * S * S), dr = 3, dg = 3 * S, db = 3 * S * S;
  for (let c = 0; c < 3; c++) {
    const i = i000 + c;
    const x00 = d[i] + (d[i + dr] - d[i]) * tr, x10 = d[i + dg] + (d[i + dg + dr] - d[i + dg]) * tr;
    const x01 = d[i + db] + (d[i + db + dr] - d[i + db]) * tr, x11 = d[i + db + dg] + (d[i + db + dg + dr] - d[i + db + dg]) * tr;
    const y0 = x00 + (x10 - x00) * tg, y1 = x01 + (x11 - x01) * tg;
    out[c] = 255 * (y0 + (y1 - y0) * tb);
  }
}

const byte = (v: number) => (v <= 0 ? 0 : v >= 255 ? 255 : Math.round(v));

/** `pal`: the palette the picture goes back to; `frame`: the clock's frame, for the grain. */
export function applyPost(img: Img, o: PostOpts, fogColor: Color | null, pal?: Palette, frame = 0): void {
  const { w, h } = img, n = w * h, D = img.depth, E = img.emit;
  if (Array.isArray(o.soft) && !(o.soft.length === 2 && o.soft.every((v) => num(v, 1e-6, Infinity))))
    throw new PxError(`post: soft is m over which the blur grows to full, above 0, or two of them [nearer, farther], got ${JSON.stringify(o.soft)}`);
  for (const [k, lo, hi] of [["sharp", 0, Infinity], ...(Array.isArray(o.soft) ? [] : [["soft", 1e-6, Infinity] as const]), ["blur", 0, Infinity], ["vignette", 0, 1]] as const)
    if (o[k] !== undefined && !num(o[k], lo, hi)) throw new PxError(`post: ${k} must be a number from ${lo === 1e-6 ? "above 0" : lo}${hi < Infinity ? ` to ${hi}` : ""}, got ${JSON.stringify(o[k])}`);
  if ((o.blur || o.fog) && !D) throw new PxError("post: blur and fog go by the depth mesh() draws: put post() after a mesh() in the same sprite or scene (not in a layer)");
  const R = new Float32Array(n), G = new Float32Array(n), B = new Float32Array(n);
  for (let i = 0; i < n; i++) { const c = img.data[i]; R[i] = LIN[c >>> 24]; G[i] = LIN[(c >>> 16) & 255]; B[i] = LIN[(c >>> 8) & 255]; }

  if (o.fog) {
    const { from, to, max = 0.6 } = o.fog;
    if (fogColor === null || !Number.isFinite(from) || !(to > from) || !num(max, 0, 1)) throw new PxError(`post: fog is { color, from, to, max? }: a color, the depth in m where the haze starts and where it reaches max (0..1, default 0.6), got ${JSON.stringify(o.fog)}`);
    const fr = LIN[fogColor >>> 24], fg = LIN[(fogColor >>> 16) & 255], fb = LIN[(fogColor >>> 8) & 255];
    for (let i = 0; i < n; i++) {
      if (!(D![i] < Infinity)) continue;
      const t = clamp01((D![i] - from) / (to - from)) * max;
      R[i] += (fr - R[i]) * t; G[i] += (fg - G[i]) * t; B[i] += (fb - B[i]) * t;
    }
  }

  if (o.blur) {
    const [fc, fr] = o.focus ?? [w >> 1, h >> 1];
    if (!(Number.isFinite(fc) && Number.isFinite(fr))) throw new PxError(`post: focus is the pixel [col, row] whose depth is sharp, got ${JSON.stringify(o.focus)}`);
    const fd = D![Math.max(0, Math.min(h - 1, Math.floor(fr))) * w + Math.max(0, Math.min(w - 1, Math.floor(fc)))];
    if (!(fd < Infinity)) throw new PxError(`post: mesh() drew nothing at the focus [${fc}, ${fr}]: focus on a pixel of its ground or things`);
    const sharp = o.sharp ?? 1, [softN, softF] = Array.isArray(o.soft) ? o.soft : [o.soft ?? 4, o.soft ?? 4];
    // each pixel's blur, 0 sharp to 1 full; nothing drawn there is as far as it gets
    const coc = new Float32Array(n), near = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      const d = D![i];
      if (!(d < Infinity)) { coc[i] = 1; continue; }
      const t = clamp01((Math.abs(d - fd) - sharp) / (d < fd ? softN : softF));
      coc[i] = t * t * (3 - 2 * t);   // weak at first, eased into full
      near[i] = d < fd ? 1 : 0;
    }
    // at 1/f of the size, colors weighted by their own blur (a sharp pixel adds nothing, so no halo of
    // it spreads round what's blurred behind it), blurred twice as far for the full blur as for half;
    // the near ones apart too, to spill over what's sharp behind them, as a lens does
    const f = Math.max(1, Math.round(o.blur / 4)), s = o.blur / f / 2, { lw, lh, share, col } = cells(w, h, f), m = lw * lh;
    const lR = new Float64Array(m), lG = new Float64Array(m), lB = new Float64Array(m), lW = new Float64Array(m);
    const mR = new Float64Array(m), mG = new Float64Array(m), mB = new Float64Array(m), mW = new Float64Array(m);
    for (let y = 0; y < h; y++) {
      const jy = Math.floor(y / f) * lw;
      for (let x = 0; x < w; x++) {
        const i = y * w + x, k = coc[i];
        if (!k) continue;
        const j = jy + col[x], kc = k * share, r = R[i] * kc, g = G[i] * kc, b = B[i] * kc;
        lR[j] += r; lG[j] += g; lB[j] += b; lW[j] += kc;
        if (near[i]) { mR[j] += r; mG[j] += g; mB[j] += b; mW[j] += kc; }
      }
    }
    const norm = (planes: Float64Array[], sigma: number) => {
      const [r, g, b, wt] = planes.map((p) => blur(p, lw, lh, sigma));
      for (let j = 0; j < m; j++) if (wt[j] > 1e-6) { r[j] /= wt[j]; g[j] /= wt[j]; b[j] /= wt[j]; }
      return [r, g, b, wt].map((p) => widen(p, lw, lh, f, w));
    };
    const [hR, hG, hB] = norm([lR, lG, lB, lW], s / 2), [fR, fG, fB, fW] = norm([lR, lG, lB, lW], s), [nR, nG, nB, nW] = norm([mR, mG, mB, mW], s);
    for (let y = 0; y < h; y++) {
      const [a, b, t] = rowOf(y, lh, f, w);
      for (let x = 0; x < w; x++) {
        const i = y * w + x, k = coc[i], p = a + x, q = b + x;
        if (k > 0 && fW[p] + (fW[q] - fW[p]) * t > 1e-6) {
          // between the half blur and the full one by how blurred it is, then that much of it
          const h0 = hR[p] + (hR[q] - hR[p]) * t, h1 = hG[p] + (hG[q] - hG[p]) * t, h2 = hB[p] + (hB[q] - hB[p]) * t;
          const f0 = fR[p] + (fR[q] - fR[p]) * t, f1 = fG[p] + (fG[q] - fG[p]) * t, f2 = fB[p] + (fB[q] - fB[p]) * t;
          R[i] += (h0 + (f0 - h0) * k - R[i]) * k; G[i] += (h1 + (f1 - h1) * k - G[i]) * k; B[i] += (h2 + (f2 - h2) * k - B[i]) * k;
        }
        if (near[i]) continue;
        const cover = nW[p] + (nW[q] - nW[p]) * t;
        if (cover > 0.01) {
          const c = Math.min(1, cover * 2);
          R[i] += (nR[p] + (nR[q] - nR[p]) * t - R[i]) * c; G[i] += (nG[p] + (nG[q] - nG[p]) * t - G[i]) * c; B[i] += (nB[p] + (nB[q] - nB[p]) * t - B[i]) * c;
        }
      }
    }
  }

  if (o.bloom) {
    const bo = typeof o.bloom === "number" ? { strength: o.bloom } : o.bloom;
    const above = bo.above ?? 0.75, r = bo.r ?? w / 40, strength = bo.strength ?? 0.6;
    if (!num(above, 0, 1) || !num(r, 1e-6, Infinity) || !num(strength, 0, Infinity) || (bo.levels !== undefined && !(Number.isInteger(bo.levels) && bo.levels >= 1 && bo.levels <= 8)) || (bo.spread !== undefined && !num(bo.spread, 0, 1)))
      throw new PxError(`post: bloom is a strength, or { above (0..1), r (px), strength }, or Three's { above, strength, levels (1..8), spread (0..1) }, got ${JSON.stringify(o.bloom)}`);
    if (bo.levels !== undefined && bo.r !== undefined) throw new PxError("post: bloom's levels set their own sizes: give levels or r, not both");
  }
  if (o.bloom && typeof o.bloom === "object" && o.bloom.levels) {
    // Three's UnrealBloomPass: the part brighter than `above` (a knee of 0.01), at half size; then at
    // each level blurred (3, 5, 7... of its own px), halved for the next; all added back, the first
    // weighing 1, then 0.8, 0.6, 0.4, 0.2, `spread` of each moved toward 1.2 less it (the big ones)
    const { above = 0.75, strength = 0.6, levels, spread = 0.4 } = o.bloom, aL = LIN[Math.round(above * 255)], knee = 0.01;
    const bright = [new Float32Array(n), new Float32Array(n), new Float32Array(n)];
    let any = false;
    for (let i = 0; i < n; i++) {
      // (what gives light blooms by how much it gives, however bright it is)
      const Y = 0.2126 * R[i] + 0.7152 * G[i] + 0.0722 * B[i], t = clamp01((Y - aL) / knee), k = Math.max(t * t * (3 - 2 * t), (E?.[i] ?? 0) / 255);
      if (k) { bright[0][i] = R[i] * k; bright[1][i] = G[i] * k; bright[2][i] = B[i] * k; any = true; }
    }
    // ponytail: dense separable blurs from half size, about 0.3 s a frame at 960x540 and 0.9 s at
    // 1920x1080; a sparse first pass (few pixels are bright) if long HD runs need it faster
    if (any) {
      // (the weights brought to sum to 2, as the two sizes of the other bloom do, so a strength adds as much light)
      const wt = Array.from({ length: levels }, (_, l) => { const fl = Math.max(0.2, 1 - 0.2 * l); return fl + (1.2 - 2 * fl) * spread; }), sum = wt.reduce((a, b) => a + b, 0);
      // the levels summed at half size, brought up to the picture once
      const w0 = Math.ceil(w / 2), h0 = Math.ceil(h / 2), acc = [new Float64Array(w0 * h0), new Float64Array(w0 * h0), new Float64Array(w0 * h0)];
      let lw = w0, lh = h0, f = 1, cur = bright.map((p) => half(p, w, h));
      for (let l = 0; l < levels; l++) {
        const k = (2 * strength * wt[l]) / sum, blurred = cur.map((p) => blur(p, lw, lh, 0.55 * (3 + 2 * l)));
        blurred.forEach((p, c) => {
          if (f === 1) { for (let j = 0; j < p.length; j++) acc[c][j] += p[j] * k; return; }
          const wide = widen(p, lw, lh, f, w0);
          for (let y = 0; y < h0; y++) {
            const [a, b, t] = rowOf(y, lh, f, w0);
            for (let x = 0; x < w0; x++) acc[c][y * w0 + x] += (wide[a + x] + (wide[b + x] - wide[a + x]) * t) * k;
          }
        });
        if (l + 1 < levels) cur = blurred.map((p) => half(p, lw, lh));
        lw = Math.ceil(lw / 2); lh = Math.ceil(lh / 2); f *= 2;
      }
      [R, G, B].forEach((plane, c) => addUp(plane, acc[c], w0, h0, 2, w, h, 1));
    }
  } else if (o.bloom) {
    const bo = typeof o.bloom === "number" ? { strength: o.bloom } : o.bloom;
    const above = bo.above ?? 0.75, r = bo.r ?? w / 40, strength = bo.strength ?? 0.6;
    // what is brighter than `above`, by how much, spread r px and r / 2 px and added back
    const aL = LIN[Math.round(above * 255)], f = Math.max(1, Math.round(r / 4)), s = r / f / 2, { lw, lh, share, col } = cells(w, h, f);
    const eR = new Float64Array(lw * lh), eG = new Float64Array(lw * lh), eB = new Float64Array(lw * lh);
    for (let y = 0; y < h; y++) {
      const jy = Math.floor(y / f) * lw;
      for (let x = 0; x < w; x++) {
        const i = y * w + x, Y = 0.2126 * R[i] + 0.7152 * G[i] + 0.0722 * B[i], em = E?.[i] ?? 0;
        if (Y <= aL && !em) continue;
        // (what gives light blooms by how much it gives, however bright it is)
        const e = Math.max(Y > aL ? (Y - aL) / Y : 0, em / 255) * share, j = jy + col[x];
        eR[j] += R[i] * e; eG[j] += G[i] * e; eB[j] += B[i] * e;
      }
    }
    const [gR, gG, gB] = [eR, eG, eB].map((p) => {
      const a = blur(p, lw, lh, s), b = blur(p, lw, lh, s / 2);
      for (let j = 0; j < a.length; j++) a[j] = (a[j] + b[j]) * strength;
      return widen(a, lw, lh, f, w);
    });
    for (let y = 0; y < h; y++) {
      const [a, b, t] = rowOf(y, lh, f, w);
      for (let x = 0; x < w; x++) {
        const i = y * w + x, p = a + x, q = b + x;
        R[i] += gR[p] + (gR[q] - gR[p]) * t; G[i] += gG[p] + (gG[q] - gG[p]) * t; B[i] += gB[p] + (gB[q] - gB[p]) * t;
      }
    }
  }

  if (o.vignette) {
    const key = `${w}x${h}x${o.vignette}`;
    let v = VIGNETTE.get(key);
    if (!v) {
      v = new Float32Array(n);
      for (let y = 0; y < h; y++) {
        const dy = ((y + 0.5) / h) * 2 - 1;
        for (let x = 0; x < w; x++) {
          const dx = ((x + 0.5) / w) * 2 - 1, t = clamp01((Math.sqrt((dx * dx + dy * dy) / 2) - 0.4) / 0.6);
          v[y * w + x] = 1 - o.vignette * t * t * (3 - 2 * t);
        }
      }
      VIGNETTE.clear();
      VIGNETTE.set(key, v);
    }
    for (let i = 0; i < n; i++) { R[i] *= v[i]; G[i] *= v[i]; B[i] *= v[i]; }
  }

  const K = o.pixel ?? 1;
  if (!(Number.isInteger(K) && K >= 1)) throw new PxError(`post: pixel is how many px an art pixel takes, a whole number from 1, got ${JSON.stringify(o.pixel)}`);
  if (o.sharpen !== undefined && !num(o.sharpen, 0, 4)) throw new PxError(`post: sharpen is how far each pixel steps from its neighbours, 0 to 4, got ${JSON.stringify(o.sharpen)}`);
  const lut = o.lut === undefined ? undefined : "cube" in o.lut ? o.lut : { cube: o.lut, amount: 1 }, la = lut?.amount ?? 1;
  if (lut && !(lut.cube && Number.isInteger(lut.cube.size) && lut.cube.data instanceof Float32Array && num(la, 0, 1)))
    throw new PxError('post: lut is a .cube file ("dusk.cube"), or { cube: "dusk.cube", amount (0..1) }');
  const go = o.grain === undefined ? undefined : typeof o.grain === "number" ? { amount: o.grain } : o.grain, ga = go?.amount ?? 0.05;
  if (go && (!num(ga, 0, 1) || !(go.seed === undefined || Number.isInteger(go.seed)) || !(go.animated === undefined || typeof go.animated === "boolean"))) throw new PxError(`post: grain is an amount (0..1), or { amount, seed, animated }, got ${JSON.stringify(o.grain)}`);
  const data = img.data;
  for (let i = 0; i < n; i++) if (data[i] !== TRANSPARENT) data[i] = fromLinear(R[i], G[i], B[i], data[i]);

  if (o.sharpen) {
    // Babylon's sharpen, on the colors as they're seen (in linear light the dark side of an edge went
    // black): each pixel plus `sharpen` times how far it stands from the four around it, a block off in
    // HD so the art's own edges are what sharpens; off the picture or clear: itself
    const a = o.sharpen, src = data.slice();
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x, c = src[i];
        if (c === TRANSPARENT) continue;
        const cr = c >>> 24, cg = (c >>> 16) & 255, cb = (c >>> 8) & 255;
        let r = 4 * cr, g = 4 * cg, b = 4 * cb;
        for (let k = 0; k < 4; k++) {
          const X = x + (k === 0 ? K : k === 1 ? -K : 0), Y = y + (k === 2 ? K : k === 3 ? -K : 0);
          let d = X < 0 || Y < 0 || X >= w || Y >= h ? c : src[Y * w + X];
          if (d === TRANSPARENT) d = c;
          r -= d >>> 24; g -= (d >>> 16) & 255; b -= (d >>> 8) & 255;
        }
        data[i] = ((byte(cr + a * r) << 24) | (byte(cg + a * g) << 16) | (byte(cb + a * b) << 8) | (c & 255)) >>> 0;
      }
  }

  if ((lut && la) || (go && ga)) {
    const memo = new Map<number, number>(), out = new Float64Array(3), bw = Math.ceil(w / K), z = new Float64Array(bw);
    // grain most in the middle tones: none at black and white
    const mid = Float64Array.from({ length: 256 }, (_, l) => 0.5 - 0.5 * Math.cos((2 * Math.PI * l) / 255));
    for (let y = 0; y < h; y++) {
      // a new grain each frame (Babylon's, seeded by the frame instead of a random call), a number a block
      if (go && ga && y % K === 0) for (let bx = 0; bx < bw; bx++) z[bx] = ga * 255 * ((hash(bx, y / K, (go.animated === false ? 0 : frame) * 7919 + (go.seed ?? 0)) / 4294967296) * 2 - 1);
      for (let x = 0; x < w; x++) {
        const i = y * w + x, c = data[i];
        if (c === TRANSPARENT) continue;
        let v = c;
        if (lut && la) {
          const got = memo.get(c >>> 8);
          if (got !== undefined) v = ((got << 8) | (c & 255)) >>> 0;
          else {
            const r = c >>> 24, g = (c >>> 16) & 255, b = (c >>> 8) & 255;
            lookup(lut.cube, r, g, b, out);
            v = ((byte(r + (out[0] - r) * la) << 24) | (byte(g + (out[1] - g) * la) << 16) | (byte(b + (out[2] - b) * la) << 8) | (c & 255)) >>> 0;
            memo.set(c >>> 8, v >>> 8);
          }
        }
        if (go && ga) {
          const r = v >>> 24, g = (v >>> 16) & 255, b = (v >>> 8) & 255, d = z[(x / K) | 0] * mid[Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b)];
          v = ((byte(r + d) << 24) | (byte(g + d) << 16) | (byte(b + d) << 8) | (c & 255)) >>> 0;
        }
        data[i] = v;
      }
    }
  }

  if (o.palette !== undefined) {
    // the picture back in the palette: the dither effect, in blocks of the art's pixel
    const po = typeof o.palette === "object" && !Array.isArray(o.palette) ? o.palette : { keys: o.palette === true ? undefined : o.palette, dither: undefined };
    if (!pal) throw new PxError("post: palette needs the asset's palette");
    if (po.dither !== undefined && !num(po.dither, 0, 1)) throw new PxError(`post: palette's dither is 0 (the nearest key) to 1 (mixed by a Bayer pattern), got ${JSON.stringify(po.dither)}`);
    const out = runEffect("dither", img, { ...(po.keys !== undefined ? { keys: po.keys } : {}), pixel: K, spread: po.dither ?? 1 }, { frame, frames: 1, seed: 0, ox: 0, oy: 0, pal });
    data.set(out.data);
  }
}
