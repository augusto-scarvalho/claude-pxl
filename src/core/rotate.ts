// Rotating pixel art by any angle without wrecking it. Quarter turns are exact (Img.rot); small
// angles shear (a lean: whole rows shift, no pixel lost or doubled, after Paeth 1986); the rest
// use RotSprite (Xenowhirl): magnify 8x with Scale2x three times, then sample the rotated
// magnified image back at 1x. No method invents colors. Written from the published descriptions.
import { type Color, TRANSPARENT } from "./color.ts";
import { PxError } from "./errors.ts";
import { Img } from "./image.ts";

export type RotateMethod = "auto" | "rotsprite" | "shear" | "nearest";

/** Below this many degrees off a quarter turn, "auto" shears instead of resampling. */
export const SHEAR_BELOW = 12;

/** Rotate clockwise by `deg`. The canvas grows to hold the result; the pivot turns with it. */
export function rotate(img: Img, deg: number, method: RotateMethod = "auto"): Img {
  if (!Number.isFinite(deg)) throw new PxError(`angle must be a number of degrees, got ${deg}`);
  const q = Math.round(deg / 90), r = deg - q * 90, quarter = ((q % 4) + 4) % 4;
  // Exact quarter turns go first, so what's left to resample is at most 45 degrees.
  const base = quarter ? img.rot(quarter * 90) : img.copy();
  if (Math.abs(r) < 1e-9) return base;
  const m = method === "auto" ? (Math.abs(r) < SHEAR_BELOW ? "shear" : "rotsprite") : method;
  if (m === "shear") return shear(base, r);
  if (m === "nearest") return sampled(base, r, base, 1);
  if (m === "rotsprite") return sampled(base, r, scale2x(scale2x(scale2x(base))), 8);
  throw new PxError(`rotate must be "auto", "rotsprite", "shear" or "nearest", got ${JSON.stringify(method)}`);
}

/** Scale2x (EPX / AdvMAME2x): each pixel becomes 2x2; a corner takes a neighbour where two edges meet. */
export function scale2x(img: Img): Img {
  const o = new Img(img.w * 2, img.h * 2);
  for (let y = 0; y < img.h; y++)
    for (let x = 0; x < img.w; x++) {
      const P = img.get(x, y), A = img.get(x, y - 1), B = img.get(x + 1, y), C = img.get(x - 1, y), D = img.get(x, y + 1);
      let e0 = P, e1 = P, e2 = P, e3 = P;
      if (A !== D && C !== B) {
        if (C === A) e0 = C;
        if (A === B) e1 = B;
        if (C === D) e2 = C;
        if (D === B) e3 = B;
      }
      const i = 2 * y * o.w + 2 * x;
      o.data[i] = e0; o.data[i + 1] = e1; o.data[i + o.w] = e2; o.data[i + o.w + 1] = e3;
    }
  return o;
}

/** Size of the rotated canvas, and a map from its pixel centers back to source coordinates. */
function frame(w: number, h: number, deg: number) {
  const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  const W = Math.max(1, Math.ceil(Math.abs(w * c) + Math.abs(h * s) - 1e-6)), H = Math.max(1, Math.ceil(Math.abs(w * s) + Math.abs(h * c) - 1e-6));
  const back = (x: number, y: number): [number, number] => {
    const dx = x - W / 2, dy = y - H / 2;
    return [dx * c + dy * s + w / 2, -dx * s + dy * c + h / 2];
  };
  const fwd = (x: number, y: number): [number, number] => {
    const dx = x - w / 2, dy = y - h / 2;
    return [dx * c - dy * s + W / 2, dx * s + dy * c + H / 2];
  };
  return { W, H, back, fwd };
}

/**
 * Nearest-neighbour rotation of `src` (k = 1), or of its k-times magnification `big` (RotSprite).
 * For RotSprite the sub-pixel offset is chosen so samples fall inside flat areas, not on edges.
 */
function sampled(src: Img, deg: number, big: Img, k: number): Img {
  const { W, H, back, fwd } = frame(src.w, src.h, deg);
  const at = (x: number, y: number, u: number, v: number): Color => {
    const [sx, sy] = back(x + 0.5, y + 0.5);
    return big.get(Math.floor(sx * k + u), Math.floor(sy * k + v));
  };
  let best = [0, 0];
  if (k > 1) {
    let fewest = Infinity;
    for (const u of [-2, 0, 2]) for (const v of [-2, 0, 2]) {
      let edges = 0;
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
          const [sx, sy] = back(x + 0.5, y + 0.5), bx = Math.floor(sx * k + u), by = Math.floor(sy * k + v), p = big.get(bx, by);
          if (p !== big.get(bx + 1, by) || p !== big.get(bx - 1, by) || p !== big.get(bx, by + 1) || p !== big.get(bx, by - 1)) edges++;
        }
      if (edges < fewest) { fewest = edges; best = [u, v]; }
    }
  }
  const o = new Img(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) o.data[y * W + x] = at(x, y, best[0], best[1]);
  // what gives light (effect("emit")) and the normals turn with their pixels: each one's mark and
  // normal from the pixel it was sampled from, the normal's x and y turned by the angle
  if (src.emit || src.norm) {
    const e = src.emit && (o.emit = new Uint8Array(W * H)), nm = src.norm && o.normals(), a = (deg * Math.PI) / 180, cos = Math.cos(a), sin = Math.sin(a);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (o.data[y * W + x] === TRANSPARENT) continue;
      // (RotSprite's corners take a neighbour's color: the mark of the nearest pixel of that color)
      const [sx, sy] = back(x + 0.5, y + 0.5), bx = Math.floor((sx * k + best[0]) / k), by = Math.floor((sy * k + best[1]) / k), c = o.data[y * W + x];
      let j = -1;
      for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
        const X = bx + dx, Y = by + dy;
        if (X >= 0 && Y >= 0 && X < src.w && Y < src.h && (j < 0 || src.data[Y * src.w + X] === c)) { j = Y * src.w + X; if (src.data[j] === c) break; }
      }
      if (j < 0) continue;
      if (e) e[y * W + x] = src.emit![j];
      if (nm) turnNorm(src.norm!, j, nm, y * W + x, cos, sin);
    }
  }
  src.movePivot(o, fwd);
  return o;
}

/** Three shears (x, y, x), each shifting whole rows or columns: a lean that keeps every pixel. */
function shear(src: Img, deg: number): Img {
  const a = (deg * Math.PI) / 180, t = Math.tan(a / 2), s = Math.sin(a), cx = src.w / 2, cy = src.h / 2;
  const move = (x: number, y: number): [number, number] => {
    x -= Math.round(t * y); y += Math.round(s * x); x -= Math.round(t * y);
    return [x, y];
  };
  const pts: [number, number, Color, number][] = [];
  for (let y = 0; y < src.h; y++)
    for (let x = 0; x < src.w; x++) {
      const c = src.data[y * src.w + x];
      if (c !== TRANSPARENT) pts.push([...move(x + 0.5 - cx, y + 0.5 - cy), c, y * src.w + x]);
    }
  if (!pts.length) return src.copy();
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const o = new Img(x1 - x0 + 1, y1 - y0 + 1);
  for (const [x, y, c] of pts) o.set(x - x0, y - y0, c);
  if (src.emit) { const e = (o.emit = new Uint8Array(o.w * o.h)); for (const [x, y, , i] of pts) e[(y - y0) * o.w + x - x0] = src.emit[i]; }
  if (src.norm) { const nm = o.normals(); for (const [x, y, , i] of pts) turnNorm(src.norm, i, nm, (y - y0) * o.w + x - x0, Math.cos(a), s); }
  src.movePivot(o, (x, y) => { const [px, py] = move(x - cx, y - cy); return [px - x0, py - y0]; });
  return o;
}

/** Pixel j's normal into pixel i, its x and y turned clockwise by the angle (cos c, sin s), as the pixels turn; none stays none. */
function turnNorm(src: Int8Array, j: number, dst: Int8Array, i: number, c: number, s: number): void {
  const nx = src[j * 3], ny = src[j * 3 + 1], nz = src[j * 3 + 2];
  if (!nz) return;
  dst[i * 3] = Math.round(nx * c - ny * s);
  dst[i * 3 + 1] = Math.round(nx * s + ny * c);
  dst[i * 3 + 2] = nz;
}
