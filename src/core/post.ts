// Post: what a camera does to the picture once the scene is drawn, the HD-2D look (Octopath
// Traveler's dioramas): haze with distance; a depth of field that keeps one band of depth sharp and
// blurs what is nearer and farther (from a camera high up, the tilt-shift look of a model); a bloom
// round what is bright; darker corners. Depth is mesh()'s (Img.depth): what it didn't draw (a sky
// painted under it) is far away. In linear light; the blurs at a fraction of the picture's size
// (they are smooth) and brought back up bilinearly. It leaves the palette: colors mix.
import { type Color, TRANSPARENT } from "./color.ts";
import { PxError } from "./errors.ts";
import type { Img } from "./image.ts";
import { blur } from "./normals.ts";

export interface PostOpts {
  /** the pixel [col, row] whose depth is sharp (default the picture's middle) */
  focus?: [number, number];
  /** m of depth either side of the focus that stay sharp (default 1) */
  sharp?: number;
  /** m past that over which the blur grows to full (default 4) */
  soft?: number;
  /** the most blur, about its radius in px (default 0: none) */
  blur?: number;
  /** a glow round what is brighter than `above` (0..1, default 0.75), `r` px out (default 1/40 of the width), at `strength` (default 0.6); a number is the strength */
  bloom?: number | { above?: number; r?: number; strength?: number };
  /** haze toward `color` from `from` m of depth to `to`, up to `max` of it there (default 0.6) */
  fog?: { color: string; from: number; to: number; max?: number };
  /** darker corners: 0 none (default), 1 black */
  vignette?: number;
}

const LIN = Float64Array.from({ length: 256 }, (_, v) => { const s = v / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
const SRGB = Uint8Array.from({ length: 4096 }, (_, i) => { const l = i / 4095; return Math.round(255 * (l <= 0.0031308 ? 12.92 * l : 1.055 * l ** (1 / 2.4) - 0.055)); });
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

export function applyPost(img: Img, o: PostOpts, fogColor: Color | null): void {
  const { w, h } = img, n = w * h, D = img.depth;
  for (const [k, lo, hi] of [["sharp", 0, Infinity], ["soft", 1e-6, Infinity], ["blur", 0, Infinity], ["vignette", 0, 1]] as const)
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
    const sharp = o.sharp ?? 1, soft = o.soft ?? 4;
    // each pixel's blur, 0 sharp to 1 full; nothing drawn there is as far as it gets
    const coc = new Float32Array(n), near = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      const d = D![i];
      if (!(d < Infinity)) { coc[i] = 1; continue; }
      coc[i] = clamp01((Math.abs(d - fd) - sharp) / soft);
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
    if (!num(above, 0, 1) || !num(r, 1e-6, Infinity) || !num(strength, 0, Infinity)) throw new PxError(`post: bloom is a strength, or { above (0..1), r (px), strength }, got ${JSON.stringify(o.bloom)}`);
    // what is brighter than `above`, by how much, spread r px and r / 2 px and added back
    const aL = LIN[Math.round(above * 255)], f = Math.max(1, Math.round(r / 4)), s = r / f / 2, { lw, lh, share, col } = cells(w, h, f);
    const eR = new Float64Array(lw * lh), eG = new Float64Array(lw * lh), eB = new Float64Array(lw * lh);
    for (let y = 0; y < h; y++) {
      const jy = Math.floor(y / f) * lw;
      for (let x = 0; x < w; x++) {
        const i = y * w + x, Y = 0.2126 * R[i] + 0.7152 * G[i] + 0.0722 * B[i];
        if (Y <= aL) continue;
        const e = ((Y - aL) / Y) * share, j = jy + col[x];
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

  const data = img.data;
  for (let i = 0; i < n; i++) {
    const c = data[i];
    if (c === TRANSPARENT) continue;
    const r = R[i], g = G[i], b = B[i];
    data[i] = (((r >= 1 ? 255 : r <= 0 ? 0 : SRGB[(r * 4095 + 0.5) | 0]) << 24) | ((g >= 1 ? 255 : g <= 0 ? 0 : SRGB[(g * 4095 + 0.5) | 0]) << 16) | ((b >= 1 ? 255 : b <= 0 ? 0 : SRGB[(b * 4095 + 0.5) | 0]) << 8) | (c & 255)) >>> 0;
  }
}
