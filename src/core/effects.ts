// Effects: what a shader does to a sprite (VFX Essential's dissolve and emission, VFX.js's pixelate
// and dither, a tint, a UV distortion), done on the CPU. `effect(name, opts)` runs one on what the
// canvas holds so far: a sprite, an anim's frame, a layer.
//
// The contract, shaped so a GPU could run the same effects later (BACKLOG): an effect is a pure
// function of the pixels, its parameters, the seed and the clock (the frame of the loop). RGBA in,
// RGBA of the same size out, alpha straight (not premultiplied), nothing kept from one call to the
// next, so a frame is the same image in the viewer, shot, a sheet and a GIF. Cells and offsets are in
// the art's pixels (`pixel: K`: K px to one, for a picture made K times as big); past the image's edge
// is clear, or the other side on a wrapped canvas. Noise and cells are anchored to the drawing's
// origin (a layer's x, y), not to the image. Written anew from what each one does, no code copied.
import { type Color, LIN, MIXES, TRANSPARENT, fromLinear, oklab, pack } from "./color.ts";
import { PxError, didYouMean } from "./errors.ts";
import { Img } from "./image.ts";
import type { Palette } from "./palette.ts";
import { bayer, colorList, fbm, hash, rng } from "./util.ts";

/** What an effect gets besides the pixels and its parameters. */
export interface FxCtx {
  /** The clock: frame of frames (an anim's, or the loop of what the asset places); 0 of 1 when still. */
  frame: number;
  frames: number;
  /** The effect's seed plus the canvas's reseed offset. */
  seed: number;
  /** The drawing's origin in the image (a layer's x, y). */
  ox: number;
  oy: number;
  pal: Palette;
  wrap?: { x: boolean; y: boolean };
}

type Params = Record<string, any>;
/** Reads one parameter: its default when not given, an error naming it when wrong. */
type Check = (v: unknown, what: string, pal: Palette) => unknown;
interface Effect { params: Record<string, Check>; run(src: Img, p: Params, x: FxCtx): Img }

const num = (def: number, lo: number, hi = Infinity, whole = false): Check => (v, what) => {
  if (v === undefined) return def;
  if (typeof v !== "number" || !(v >= lo && v <= hi) || (whole && !Number.isInteger(v)))
    throw new PxError(`${what} is ${whole ? "a whole number" : "a number"} from ${lo}${hi < Infinity ? ` to ${hi}` : " up"}, got ${JSON.stringify(v)}`);
  return v;
};
const oneOf = (...of: string[]): Check => (v, what) => {
  if (v === undefined) return of[0];
  if (!of.includes(v as string)) throw new PxError(`${what} is ${of.map((s) => `"${s}"`).join(", ")}, got ${JSON.stringify(v)}`);
  return v;
};
const color = (need: boolean): Check => (v, what, pal) => {
  if (v === undefined) {
    if (need) throw new PxError(`${what}: give a color (a key or "#hex")`);
    return undefined;
  }
  const c = typeof v === "string" ? pal.resolve(v) : null;
  if (c === null || c === TRANSPARENT) throw new PxError(`${what} is a visible color (a key or "#hex"), got ${JSON.stringify(v)}`);
  return c;
};
const colors: Check = (v, what, pal) => {
  if (v === undefined) return [];
  if (typeof v !== "string" && !Array.isArray(v)) throw new PxError(`${what} is keys ("yo") or a list (["y", "#ff8040"]), got ${JSON.stringify(v)}`);
  return colorList(v).map((k) => color(true)(k, what, pal));
};
const PIXEL = num(1, 1, 64, true);

/** Octaves of the noise: two keep the holes and patches in blobs (pixel art's clusters), not speckle. */
const OCTAVES = 2;
/** Value noise's fbm made even: a value below v on a share v of the plane, so a threshold of 0.3 takes 30%. */
let CDF: Float64Array | undefined;
function even(n: number): number {
  if (!CDF) {
    const bins = new Uint32Array(1024);
    for (let j = 0; j < 256; j++) for (let i = 0; i < 256; i++) bins[Math.min(1023, Math.floor(fbm(i * 0.377 + 0.1, j * 0.411 + 0.3, OCTAVES) * 1024))]++;
    CDF = new Float64Array(1025);
    for (let k = 0, s = 0; k < 1024; k++) { s += bins[k]; CDF[k + 1] = s / 65536; }
  }
  const f = Math.min(1023.999, Math.max(0, n * 1024)), k = Math.floor(f);
  return CDF[k] + (CDF[k + 1] - CDF[k]) * (f - k);
}
/** An even noise field in [0, 1) for a seed, one unit a cell. It keeps its last answer: the pixels of a block along a row ask for the same point. */
function noise(seed: number): (u: number, v: number) => number {
  const su = (hash(seed, 1, 7) % 4096) + 0.5, sv = (hash(seed, 2, 7) % 4096) + 0.5;
  let lu = NaN, lv = NaN, last = 0;
  return (u, v) => (u === lu && v === lv ? last : ((lu = u), (lv = v), (last = even(fbm(u + su, v + sv, OCTAVES)))));
}

/** The index of the pixel at (x, y), -1 past the edges (or across them, on a wrapped canvas). */
function at(img: Img, x: number, y: number, wrap?: { x: boolean; y: boolean }): number {
  if (wrap?.x) x = ((x % img.w) + img.w) % img.w;
  if (wrap?.y) y = ((y % img.h) + img.h) % img.h;
  return x < 0 || y < 0 || x >= img.w || y >= img.h ? -1 : y * img.w + x;
}

/**
 * Pixels moved as warp() moves them: each place takes the pixel `from` names (an index, -1 for the
 * clear), its normal along with it, so a normal map lights what moved as it lit it before.
 */
function moved(src: Img, from: (px: number, py: number, i: number) => number): Img {
  const out = new Img(src.w, src.h), n = src.norm, on = n ? (out.norm = new Int8Array(n.length)) : undefined;
  for (let py = 0, i = 0; py < src.h; py++)
    for (let px = 0; px < src.w; px++, i++) {
      const j = from(px, py, i);
      if (j < 0) continue;
      out.data[i] = src.data[j];
      if (on) { on[3 * i] = n![3 * j]; on[3 * i + 1] = n![3 * j + 1]; on[3 * i + 2] = n![3 * j + 2]; }
    }
  return out;
}

/** Each pixel of the image with its place in the art's pixels (K px to one, from the drawing's origin). */
function each(img: Img, x: FxCtx, K: number, fn: (i: number, ax: number, ay: number, px: number, py: number) => void): void {
  for (let py = 0; py < img.h; py++) {
    const ay = Math.floor((py - x.oy) / K);
    for (let px = 0; px < img.w; px++) fn(py * img.w + px, Math.floor((px - x.ox) / K), ay, px, py);
  }
}

/** The clock as a turn, 0 up to just below 1. */
const turn = (x: FxCtx) => (x.frames > 1 ? x.frame / x.frames : 0);

export const EFFECTS: Record<string, Effect> = {
  /**
   * Noise over the drawing; pixels under the threshold go clear. `progress` is the share gone (the
   * noise is made even, so 0.5 takes half): 0 keeps everything, 1 takes everything. `edge` keys draw
   * rings round the holes, a pixel each, the first touching the hole (the hottest): a burning rim.
   */
  dissolve: {
    params: { progress: num(0.5, 0, 1), scale: num(6, 0.5), edge: colors, pixel: PIXEL },
    run(src, p, x) {
      const out = new Img(src.w, src.h, src.data.slice()), K: number = p.pixel, W = src.w, H = src.h;
      if (p.progress <= 0) return out;
      if (p.progress >= 1) return new Img(W, H);
      const n = noise(x.seed), keys: Color[] = p.edge;
      // ring: 0 a hole, k the k-th ring round one, 255 neither (yet)
      const ring = new Uint8Array(W * H).fill(255);
      each(src, x, K, (i, ax, ay) => {
        if (src.data[i] !== TRANSPARENT && n(ax / p.scale, ay / p.scale) < p.progress) { ring[i] = 0; out.data[i] = TRANSPARENT; }
      });
      for (let k = 1; k <= keys.length; k++)
        for (let py = 0; py < H; py++)
          for (let px = 0; px < W; px++) {
            const i = py * W + px;
            if (ring[i] !== 255 || out.data[i] === TRANSPARENT) continue;
            const was = (qx: number, qy: number) => qx >= 0 && qy >= 0 && qx < W && qy < H && ring[qy * W + qx] === k - 1;
            if (was(px - K, py) || was(px + K, py) || was(px, py - K) || was(px, py + K)) { ring[i] = k; out.data[i] = keys[k - 1]; }
          }
      return out;
    },
  },
  /**
   * Cells of `size` px, each in the color most of its pixels have (clear counts as a color), a tie
   * going to the pixel nearest its middle: a lower resolution that keeps the palette.
   */
  pixelate: {
    params: { size: num(2, 1, 256, true) },
    run(src, p, x) {
      const K: number = p.size, out = new Img(src.w, src.h, src.data.slice());
      if (K === 1) return out;
      const mid = (K - 1) / 2, cell = Array.from({ length: K * K }, (_, i) => [i % K, Math.floor(i / K)])
        .sort((a, b) => (a[0] - mid) ** 2 + (a[1] - mid) ** 2 - (b[0] - mid) ** 2 - (b[1] - mid) ** 2);
      // the colors of a cell in the order they came in (nearest the middle first, so a tie goes there) and their counts
      const seen = new Uint32Array(K * K), count = new Uint32Array(K * K);
      for (let cy = (((x.oy % K) + K) % K) - K; cy < src.h; cy += K)
        for (let cx = (((x.ox % K) + K) % K) - K; cx < src.w; cx += K) {
          let n = 0;
          for (const [dx, dy] of cell) {
            const px = cx + dx, py = cy + dy;
            if (px < 0 || py < 0 || px >= src.w || py >= src.h) continue;
            const c = src.data[py * src.w + px];
            let j = 0;
            while (j < n && seen[j] !== c) j++;
            if (j === n) { seen[n] = c; count[n++] = 0; }
            count[j]++;
          }
          let best = TRANSPARENT, most = 0;
          for (let j = 0; j < n; j++) if (count[j] > most) { most = count[j]; best = seen[j]; }
          for (let py = Math.max(0, cy); py < Math.min(src.h, cy + K); py++)
            for (let px = Math.max(0, cx); px < Math.min(src.w, cx + K); px++) out.data[py * src.w + px] = best;
        }
      return out;
    },
  },
  /**
   * Ordered (Bayer 4x4) dither to `keys` (default: the palette): each color goes to the two keys whose
   * mix is nearest it (OKLab, keys far apart counted against), the second on as many pixels as the
   * color is far along toward it (times `spread`: 0 the nearest key alone). A color already a key
   * stays; part-clear pixels go clear or opaque by the same pattern.
   */
  dither: {
    params: { keys: colors, pixel: PIXEL, spread: num(1, 0, 1) },
    run(src, p, x) {
      const to: Color[] = (p.keys as Color[]).length ? p.keys : x.pal.chosen().filter((c) => (c & 255) === 255);
      if (!to.length) throw new PxError("effect \"dither\": no colors to dither to: give keys");
      const lab = to.map(oklab), memo = new Map<Color, [Color, Color, number]>(), out = new Img(src.w, src.h, src.data.slice());
      const pair = (c: Color): [Color, Color, number] => {
        const L = oklab(c), d2 = (P: number[]) => (L[0] - P[0]) ** 2 + (L[1] - P[1]) ** 2 + (L[2] - P[2]) ** 2;
        let a = 0;
        for (let k = 1; k < to.length; k++) if (d2(lab[k]) < d2(lab[a])) a = k;
        let best: [Color, Color, number] = [to[a], to[a], 0], near = d2(lab[a]);
        const A = lab[a];
        for (let k = 0; k < to.length; k++) {
          const B = lab[k], ab = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], n2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2;
          if (!n2) continue;
          const t = ((L[0] - A[0]) * ab[0] + (L[1] - A[1]) * ab[1] + (L[2] - A[2]) * ab[2]) / n2;
          if (!(t > 0 && t < 1)) continue;
          // two keys far apart make a loud checker: their distance counts against them (Yliluoma's mixing)
          const d = d2([A[0] + t * ab[0], A[1] + t * ab[1], A[2] + t * ab[2]]) + 0.1 * n2 * (Math.abs(t - 0.5) + 0.5);
          if (d < near) { near = d; best = [to[a], to[k], t]; }
        }
        return best;
      };
      each(src, x, p.pixel, (i, ax, ay) => {
        const c = src.data[i];
        if (c === TRANSPARENT) return;
        const b = bayer(ax, ay), alpha = c & 255;
        if (alpha < 255 && b >= alpha / 255) { out.data[i] = TRANSPARENT; return; }
        const o = (c | 255) >>> 0;
        let m = memo.get(o);
        if (!m) memo.set(o, (m = pair(o)));
        out.data[i] = b < m[2] * p.spread ? m[1] : m[0];
      });
      return out;
    },
  },
  /**
   * Every opaque pixel blended toward `color` by `amount`, as a layer's `blend` mode does; alpha kept.
   * `ramp`: the result goes to the nearest of the palette's colors (true) or of those keys (OKLab), so
   * it stays in the palette, each color to one key: its clusters keep their shapes.
   */
  tint: {
    params: {
      color: color(true), amount: num(0.5, 0, 1), blend: oneOf("normal", "multiply", "screen", "add", "overlay"),
      ramp: (v, what, pal) => (v === undefined || v === false ? undefined : v === true ? true : colors(v, what, pal)),
    },
    run(src, p, x) {
      const f = MIXES[p.blend], k: number = p.amount, s = p.color as Color, out = new Img(src.w, src.h, src.data.slice()), memo = new Map<Color, Color>();
      const sr = s >>> 24, sg = (s >>> 16) & 255, sb = (s >>> 8) & 255;
      const mix = (d: number, s: number) => Math.round(d + (f(s, d) - d) * k);
      const to: Color[] | undefined = p.ramp === true ? x.pal.chosen().filter((c) => (c & 255) === 255) : p.ramp, lab = to?.map(oklab);
      const snap = (c: Color) => {
        if (!to?.length) return c;
        const L = oklab(c);
        let best = 0, bd = Infinity;
        lab!.forEach((P, j) => { const d = (L[0] - P[0]) ** 2 + (L[1] - P[1]) ** 2 + (L[2] - P[2]) ** 2; if (d < bd) { bd = d; best = j; } });
        return ((to[best] & ~255) | (c & 255)) >>> 0;
      };
      for (let i = 0; i < out.data.length; i++) {
        const d = out.data[i];
        if (d === TRANSPARENT) continue;
        let c = memo.get(d);
        if (c === undefined) memo.set(d, (c = k ? snap(pack(mix(d >>> 24, sr), mix((d >>> 16) & 255, sg), mix((d >>> 8) & 255, sb), d & 255)) : d));
        out.data[i] = c;
      }
      return out;
    },
  },
  /**
   * UV distortion: each pixel takes the one up to `amount` px away, the offset read off noise `scale`
   * px a cell (rounded: whole pixels move, no color is made up), on `axis`. Over the loop the noise
   * goes round a circle `speed` cells long, so the last frame runs into the first.
   */
  distort: {
    params: { amount: num(1, 0), scale: num(8, 0.5), speed: num(1, 0), axis: oneOf("xy", "x", "y"), pixel: PIXEL },
    run(src, p, x) {
      const nx = noise(x.seed), ny = noise(x.seed + 7919), K: number = p.pixel;
      const a = 2 * Math.PI * turn(x), r = p.speed / (2 * Math.PI), u0 = r * Math.cos(a), v0 = r * Math.sin(a);
      const off = (n: (u: number, v: number) => number, ax: number, ay: number) => Math.round(p.amount * (2 * n(ax / p.scale + u0, ay / p.scale + v0) - 1));
      return moved(src, (px, py, i) => {
        const ax = Math.floor((px - x.ox) / K), ay = Math.floor((py - x.oy) / K);
        const dx = p.axis !== "y" ? off(nx, ax, ay) : 0, dy = p.axis !== "x" ? off(ny, ax, ay) : 0;
        return dx || dy ? at(src, px - dx * K, py - dy * K, x.wrap) : i;
      });
    },
  },
  /**
   * Swaying in the wind, a plant's way: each row moves sideways by its height over the base (the pivot's
   * row, or the bottom): nothing at the foot and `still` rows above it, `amount` px at the top, growing
   * with the height to the `power` (2: a trunk bending). Over the loop it sways `cycles` times, `lean`
   * of the bend always downwind (negative `amount`: the wind blows to the left), the rest to and fro;
   * `flutter` px more at the top, twice as fast, row by row (the leaves). `vary` (0..1) of a turn and of
   * the reach comes from the seed: placed with `reseed`, each copy sways its own way, out of step.
   * Whole pixels move, with their normals (warp's way).
   */
  sway: {
    params: { amount: num(1.5, -64, 64), lean: num(0.5, 0, 1), power: num(2, 0.25, 8), still: num(0, 0), cycles: num(1, 1, 64, true), flutter: num(0, 0, 16), vary: num(0.25, 0, 1), pixel: PIXEL },
    run(src, p, x) {
      const r = rng(hash(x.seed, 3, 11)), start = p.vary * r(), far = 1 + p.vary * (2 * r() - 1), K: number = p.pixel;
      const th = 2 * Math.PI * (p.cycles * turn(x) + start), s = p.lean + (1 - p.lean) * Math.sin(th);
      const base = Math.round(src.pivot?.[1] ?? src.h), top = Math.max(1, Math.floor((base - 1) / K) - p.still);
      const row = new Int32Array(src.h);
      for (let py = 0; py < src.h; py++) {
        const up = Math.floor((base - 1 - py) / K) - p.still, w = up <= 0 ? 0 : Math.min(1, up / top) ** p.power;
        row[py] = K * Math.round(w * (p.amount * far * s + p.flutter * Math.sin(2 * th + 0.3 * up)));
      }
      return moved(src, (px, py, i) => (row[py] ? at(src, px - row[py], py, x.wrap) : i));
    },
  },
  /**
   * Emission: the pixels (`on` keys, `where`) give light: `strength` of `color` (default their own)
   * added in linear light, what goes past white spilling into the other channels (a hot core turns
   * white). `pulse` takes that much of it away and back over the loop.
   */
  emit: {
    params: { color: color(false), strength: num(0.5, 0), pulse: num(0, 0, 1) },
    run(src, p, x) {
      const k = p.strength * (1 - p.pulse * (0.5 - 0.5 * Math.cos(2 * Math.PI * turn(x)))), out = new Img(src.w, src.h, src.data.slice());
      if (!k) return out;
      const e = p.color as Color | undefined, memo = new Map<Color, Color>();
      for (let i = 0; i < out.data.length; i++) {
        const c = out.data[i];
        if (c === TRANSPARENT) continue;
        let o = memo.get(c);
        if (o === undefined) {
          const r = LIN[c >>> 24], g = LIN[(c >>> 16) & 255], b = LIN[(c >>> 8) & 255], E = e ?? c;
          let R = r + k * LIN[E >>> 24], G = g + k * LIN[(E >>> 16) & 255], B = b + k * LIN[(E >>> 8) & 255];
          const over = Math.max(R, G, B) - 1;
          if (over > 0) { R += over; G += over; B += over; }
          memo.set(c, (o = fromLinear(R, G, B, c & 255)));
        }
        out.data[i] = o;
      }
      return out;
    },
  },
};

/** Options every effect takes besides its own (the canvas reads where and on). */
const COMMON = ["seed", "where", "on"];

/** Run effect `name` on `src` (left as it is): its options checked, its seed added to the canvas's. */
export function runEffect(name: string, src: Img, opts: Record<string, unknown>, x: FxCtx): Img {
  const fx = EFFECTS[name];
  if (!fx) throw new PxError(`effect: no effect '${name}'${didYouMean(String(name), Object.keys(EFFECTS))}; there are ${Object.keys(EFFECTS).join(", ")}`);
  const allowed = [...Object.keys(fx.params), ...COMMON];
  for (const k of Object.keys(opts))
    if (!allowed.includes(k)) throw new PxError(`effect "${name}": unknown option '${k}'${didYouMean(k, allowed)} (allowed: ${allowed.join(", ")})`);
  const p: Params = {};
  for (const [k, check] of Object.entries(fx.params)) p[k] = check(opts[k], `effect "${name}": ${k}`, x.pal);
  const seed = opts.seed ?? 0;
  if (!Number.isInteger(seed)) throw new PxError(`effect "${name}": seed is a whole number, got ${JSON.stringify(opts.seed)}`);
  return fx.run(src, p, { ...x, seed: (seed as number) + x.seed });
}
