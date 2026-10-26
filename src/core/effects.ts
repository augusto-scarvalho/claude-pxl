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
  /** Another asset's picture (a dissolve's mask). */
  asset?: (name: string) => Img;
}

type Params = Record<string, any>;
/** Reads one parameter: its default when not given, an error naming it when wrong. */
type Check = (v: unknown, what: string, pal: Palette) => unknown;
interface Effect { params: Record<string, Check>; run(src: Img, p: Params, x: FxCtx): Img; prepare?(opts: Record<string, unknown>): Record<string, unknown> }

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
export function noise(seed: number): (u: number, v: number) => number {
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
  const e = src.emit, oe = e ? (out.emit = new Uint8Array(e.length)) : undefined;
  for (let py = 0, i = 0; py < src.h; py++)
    for (let px = 0; px < src.w; px++, i++) {
      const j = from(px, py, i);
      if (j < 0) continue;
      out.data[i] = src.data[j];
      if (on) { on[3 * i] = n![3 * j]; on[3 * i + 1] = n![3 * j + 1]; on[3 * i + 2] = n![3 * j + 2]; }
      if (oe) oe[i] = e![j];
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

/**
 * A dissolve's looks: what eats it. Each sets the edge (its keys over the progress), the char (a band
 * ahead of the edge the material's own colors go toward), the glow and the debris; any can be given
 * over it. "neutral" (the default with no look and no edge): one ring of the drawing's lightest tone,
 * half clear, fading at the end.
 */
export const LOOKS: Record<string, Record<string, unknown>> = {
  neutral: { edge: "neutral" },
  burn: { edge: [["#fff2b0", "#ffa040"], ["#ff8a30", "#c8361e"], ["#a02818", "#3a2a2a"], ["#4a4040", "#2a2626"]], char: { width: 3, tones: ["#8a5a30", "#3a2618", "#141010"] }, glow: 1, debris: "ash", flames: true },
  acid: { edge: [["#e8ff80", "#9adf40"], ["#9adf40", "#5a8a2a"]], char: { width: 4, tones: ["#c8d860", "#7a9a30", "#4a6a28"], desat: 0.7 }, glow: 0.4, debris: "acid" },
  magic: { edge: ["#fff4b0", "#ffae3c"], glow: 1, debris: "sparks" },
  frost: { edge: ["#ffffff", "#bfe8ff"], char: { width: 3, tones: ["#d8f0ff", "#9ccbf0"], desat: 0.6 }, glow: 0.5, debris: "frost", jag: 0.5 },
};
/** What falls off, by kind: its tones young to old, how many of the gone pixels throw one, how far they go (px) and which way. */
const DEBRIS: Record<string, { keys: string[]; density: number; life: number; dx: number; dy: number; fall?: boolean }> = {
  ash: { keys: ["#2a2424", "#5a5252", "#8a8282"], density: 0.1, life: 0.3, dx: 3, dy: -14 },
  acid: { keys: ["#c8ff60", "#8ac838", "#5a8a2a"], density: 0.07, life: 0.25, dx: 0, dy: 12, fall: true },
  frost: { keys: ["#ffffff", "#cfeaff", "#9ccbf0"], density: 0.06, life: 0.35, dx: 2, dy: 8 },
  sparks: { keys: ["#fffbe0", "#ffe080", "#ffae3c"], density: 0.08, life: 0.25, dx: 1, dy: -10 },
};
/** A dissolve's edge: none, the neutral ring, or ring keys over the progress (one entry when it doesn't change). */
type EdgeSpec = { none: true } | { neutral: true } | { over: Color[][] };
export const dissolveEdge = (v: unknown, what: string, pal: Palette): EdgeSpec => edgeSpec(v, what, pal) as EdgeSpec;
export const dissolveChar = (v: unknown, what: string, pal: Palette) => charSpec(v, what, pal);
const edgeSpec: Check = (v, what, pal): EdgeSpec => {
  if (v === undefined || v === false) return { none: true };
  if (v === "neutral") return { neutral: true };
  if (typeof v === "string") return { over: [colors(v, what, pal) as Color[]] };
  if (!Array.isArray(v)) throw new PxError(`${what} is keys ("yo"), a list of them over the progress ([["y?", "?r", "r0"]]), or false, got ${JSON.stringify(v)}`);
  // a list over the progress when an entry is itself several keys (a string of two or more, or a list)
  const over = v.some((e) => Array.isArray(e) || (typeof e === "string" && !e.startsWith("#") && [...e].length > 1));
  return over ? { over: v.map((e) => colors(e, what, pal) as Color[]) } : { over: [colors(v, what, pal) as Color[]] };
};
const charSpec: Check = (v, what, pal) => {
  if (v === undefined || v === false || v === 0) return undefined;
  const o = (typeof v === "number" ? { width: v } : v) as { width?: number; tones?: unknown; amount?: number; desat?: number };
  if (typeof o !== "object" || !(Number.isInteger(o.width) && o.width! >= 1 && o.width! <= 32) || !(o.amount === undefined || (o.amount >= 0 && o.amount <= 1)) || !(o.desat === undefined || (o.desat >= 0 && o.desat <= 1)))
    throw new PxError(`${what} is a width in px, or { width, tones, amount (0..1), desat (0..1) }: a band ahead of the edge going toward its tones, got ${JSON.stringify(v)}`);
  return { width: o.width!, tones: o.tones === undefined ? colors(["#6a4a30", "#201818"], what, pal) : colors(o.tones, what, pal), amount: o.amount ?? 0.85, desat: o.desat ?? 0 };
};
/** Flames rising from a burning front: how tall (art px), from how many of its pixels, in which tones (the base first, the tips last). */
const flameSpec: Check = (v, what, pal) => {
  if (v === undefined || v === false) return undefined;
  const o = (v === true ? {} : v) as { height?: number; density?: number; keys?: unknown };
  if (typeof o !== "object" || !(o.height === undefined || (o.height > 0 && o.height <= 64)) || !(o.density === undefined || (o.density > 0 && o.density <= 1)))
    throw new PxError(`${what} is true, or { height (px), density (0..1), keys (base to tips) }, got ${JSON.stringify(v)}`);
  return { height: o.height ?? 8, density: o.density ?? 0.3, keys: colors(o.keys ?? ["#fff8d0", "#ffd050", "#ff8a20", "#c8301c"], what, pal) };
};
const debrisSpec: Check = (v, what, pal) => {
  if (v === undefined || v === false || v === "none") return undefined;
  const o = (typeof v === "string" ? { kind: v } : v) as { kind?: string; keys?: unknown; density?: number; life?: number };
  const base = DEBRIS[o?.kind ?? ""];
  if (!base || !(o.density === undefined || (o.density >= 0 && o.density <= 1)) || !(o.life === undefined || (o.life > 0 && o.life <= 1)))
    throw new PxError(`${what} is ${Object.keys(DEBRIS).map((k) => `"${k}"`).join(", ")}, or { kind, keys, density (0..1), life (0..1 of the progress) }, got ${JSON.stringify(v)}`);
  return { ...base, keys: colors(o.keys ?? base.keys, what, pal), density: o.density ?? base.density, life: o.life ?? base.life };
};
/** A color pushed toward a tone by t, grey first by `desat` of t (sRGB, its alpha kept). */
export function toward(c: Color, tone: Color, t: number, desat = 0): Color {
  const r = c >>> 24, g = (c >>> 16) & 255, b = (c >>> 8) & 255, y = 0.2126 * r + 0.7152 * g + 0.0722 * b, d = desat * t;
  const m = (v: number, s: number) => Math.round(v + (y - v) * d + (s - (v + (y - v) * d)) * t);
  return pack(m(r, tone >>> 24), m(g, (tone >>> 16) & 255), m(b, (tone >>> 8) & 255), c & 255);
}
/** The lightest color of a drawing (white when it has none). */
export const lightestOf = (img: Img): Color => lightest(img);
function lightest(img: Img): Color {
  let best = 0xffffffff, l = -1;
  for (const c of new Set(img.data)) {
    if ((c & 255) === 0) continue;
    const y = 0.2126 * (c >>> 24) + 0.7152 * ((c >>> 16) & 255) + 0.0722 * ((c >>> 8) & 255);
    if (y > l) { l = y; best = c; }
  }
  return best;
}

/** The orders a dissolve can eat a drawing (or a face) in. */
export const PATTERNS = ["noise", "top", "bottom", "left", "right", "out", "in", "scatter", "scan", "mask"];
/** Rows of a scan in the order they go: every fourth from the top, then the ones two below, then the rest. */
export const SCAN = [0, 2, 1, 3];

/**
 * When each pixel of the drawing goes (0 first, below 1), in art pixels (ax, ay) or at image pixel
 * (px, py) for a mask: by the dissolve's pattern, over the box of what is drawn.
 */
function holeOrder(src: Img, p: Params, x: FxCtx): (ax: number, ay: number, px: number, py: number) => number {
  const n = noise(x.seed), K: number = p.pixel, b = src.bounds() ?? { x: 0, y: 0, w: src.w, h: src.h };
  const x0 = Math.floor((b.x - x.ox) / K), x1 = Math.floor((b.x + b.w - 1 - x.ox) / K) + 1, y0 = Math.floor((b.y - x.oy) / K), y1 = Math.floor((b.y + b.h - 1 - x.oy) / K) + 1;
  const r: number = p.ragged, rag = (pos: number, ax: number, ay: number) => Math.min(0.9999, Math.max(0, pos * (1 - r) + (r ? r * n(ax / p.scale, ay / p.scale) : 0)));
  const [cx, cy] = p.at ?? [(x0 + x1) / 2, (y0 + y1) / 2], far = Math.max(...[[x0, y0], [x1, y0], [x0, y1], [x1, y1]].map(([a, c]) => Math.hypot(a - cx, c - cy)), 1e-6);
  switch (p.pattern as string) {
    case "top": return (ax, ay) => rag((ay - y0 + 0.5) / (y1 - y0), ax, ay);
    case "bottom": return (ax, ay) => rag((y1 - ay - 0.5) / (y1 - y0), ax, ay);
    case "left": return (ax, ay) => rag((ax - x0 + 0.5) / (x1 - x0), ax, ay);
    case "right": return (ax, ay) => rag((x1 - ax - 0.5) / (x1 - x0), ax, ay);
    case "out": return (ax, ay) => rag(Math.hypot(ax + 0.5 - cx, ay + 0.5 - cy) / far, ax, ay);
    case "in": return (ax, ay) => rag(1 - Math.hypot(ax + 0.5 - cx, ay + 0.5 - cy) / far, ax, ay);
    case "scatter": return (ax, ay) => hash(ax, ay, x.seed) / 4294967296;
    case "scan": return (ax, ay) => (SCAN[((ay % 4) + 4) % 4] + Math.min(0.9999, Math.max(0, (ay - y0 + 0.5) / (y1 - y0)))) / 4;
    case "mask": {
      if (!p.mask || !x.asset) throw new PxError('effect "dissolve": pattern "mask" needs mask: the name of an asset of the same size, its dark pixels going first');
      const m = x.asset(p.mask);
      // (its lightness, the clear last)
      return (_ax, _ay, px, py) => { const c = m.get(px, py); return c === TRANSPARENT ? 0.9999 : Math.min(0.9999, (0.2126 * (c >>> 24) + 0.7152 * ((c >>> 16) & 255) + 0.0722 * ((c >>> 8) & 255)) / 255); };
    }
    default: return (ax, ay) => n(ax / p.scale, ay / p.scale);
  }
}

/** The clock as a turn, 0 up to just below 1. */
const turn = (x: FxCtx) => (x.frames > 1 ? x.frame / x.frames : 0);

export const EFFECTS: Record<string, Effect> = {
  /**
   * Holes eat the drawing in an order, `progress` the share gone: 0 keeps everything, 1 takes
   * everything. `pattern`: "noise" (blobs `scale` px, made even so 0.5 takes half), a sweep from the
   * "top", "bottom", "left" or "right", "out" from a point (`at`, default the middle) or "in" toward
   * it, each with a `ragged` edge (noise mixed in); "scatter" (pixel by pixel, a block by `pixel`);
   * "scan" (every fourth row going top to bottom, then the rows between: a teleport); "mask" (an
   * asset of the same size, its dark pixels first). `edge` keys draw rings round the holes, a pixel
   * each, the first touching the hole (the hottest): a burning rim; scattered and scanned holes have
   * no rim to ring, so there the pixels next to go glow first.
   */
  dissolve: {
    params: {
      progress: num(0.5, 0, 1), scale: num(6, 0.5), edge: edgeSpec, pixel: PIXEL, pattern: oneOf(...PATTERNS), ragged: num(0.25, 0, 1),
      at: (v, what) => { if (v !== undefined && !(Array.isArray(v) && v.length === 2 && v.every(Number.isFinite))) throw new PxError(`${what} is [x, y] in the drawing, got ${JSON.stringify(v)}`); return v; },
      mask: (v, what) => { if (v !== undefined && typeof v !== "string") throw new PxError(`${what} is an asset's name, got ${JSON.stringify(v)}`); return v; },
      look: (v, what) => { if (v !== undefined && !(typeof v === "string" && LOOKS[v])) throw new PxError(`${what} is ${Object.keys(LOOKS).map((k) => `"${k}"`).join(", ")}, got ${JSON.stringify(v)}`); return v; },
      char: charSpec, glow: num(0, 0, 1), debris: debrisSpec, jag: num(1, 0, 1), flames: flameSpec,
    },
    // a look sets what isn't given; with neither a look nor an edge, the neutral one
    prepare: (o) => ({ ...LOOKS[(o.look as string) ?? (o.edge === undefined ? "neutral" : "")], ...o }),
    run(src, p, x) {
      const out = new Img(src.w, src.h, src.data.slice()), K: number = p.pixel, W = src.w, H = src.h;
      if (p.progress <= 0) return out;
      if (p.progress >= 1) return new Img(W, H);
      const order = holeOrder(src, p, x), E = p.edge as EdgeSpec, ch = p.char as { width: number; tones: Color[]; amount: number; desat: number } | undefined;
      // the ring keys now (the neutral ring: the lightest tone, half clear, gone over the last 15%)
      const fadeEnd = 1 - Math.min(1, Math.max(0, (p.progress - 0.85) / 0.15));
      const keys: Color[] = "over" in E ? E.over[Math.min(E.over.length - 1, Math.floor(p.progress * E.over.length))] : "neutral" in E ? [(((lightest(src) & ~255) | Math.round(127 * fadeEnd)) >>> 0)] : [];
      const glow = p.glow > 0 ? (out.emit = new Uint8Array(W * H)) : undefined, nE = keys.length, cw = ch?.width ?? 0;
      const charAt = (i: number, t: number) => { const tone = ch!.tones[Math.min(ch!.tones.length - 1, Math.floor(t * ch!.tones.length))]; out.data[i] = toward(src.data[i], tone, ch!.amount * t, ch!.desat); };
      let thr = p.progress, band = false;
      const gone = new Uint8Array(W * H);
      if (p.pattern === "scatter" || p.pattern === "scan") {
        // scattered holes have no rim to ring: the pixels next to go glow first, a band of the order a key
        const w = 0.06 * nE, c = 0.04 * cw;
        thr = -w + p.progress * (1 + w);
        band = true;
        each(src, x, K, (i, ax, ay, px, py) => {
          if (src.data[i] === TRANSPARENT) return;
          const v = order(ax, ay, px, py);
          if (v < thr) { out.data[i] = TRANSPARENT; gone[i] = 1; }
          else if (v < thr + w) { const k = Math.min(nE - 1, Math.floor((v - thr) / 0.06)); out.data[i] = keys[k]; if (glow) glow[i] = Math.round(255 * p.glow * (1 - k / nE)); }
          else if (ch && v < thr + w + c) charAt(i, 1 - (v - thr - w) / c);
        });
      } else {
        // ring: 0 a hole, k the k-th ring round one, 255 neither (yet); the edge's rings, then the char's
        const ring = new Uint8Array(W * H).fill(255);
        each(src, x, K, (i, ax, ay, px, py) => {
          if (src.data[i] !== TRANSPARENT && order(ax, ay, px, py) < thr) { ring[i] = 0; out.data[i] = TRANSPARENT; gone[i] = 1; }
        });
        for (let k = 1; k <= nE + cw; k++)
          for (let py = 0; py < H; py++)
            for (let px = 0; px < W; px++) {
              const i = py * W + px;
              if (ring[i] !== 255 || src.data[i] === TRANSPARENT) continue;
              const was = (qx: number, qy: number) => qx >= 0 && qy >= 0 && qx < W && qy < H && ring[qy * W + qx] === k - 1;
              if (!(was(px - K, py) || was(px + K, py) || was(px, py - K) || was(px, py + K))) continue;
              ring[i] = k;
              if (k <= nE) {
                // (frost: the outer rings only here and there, as crystals)
                if (k > 1 && p.jag < 1 && hash(Math.floor(px / K), Math.floor(py / K), x.seed + 31) / 4294967296 > p.jag) { if (ch) charAt(i, 1); continue; }
                out.data[i] = keys[k - 1];
                if (glow) glow[i] = Math.round(255 * p.glow * (1 - (k - 1) / nE));
              } else charAt(i, 1 - (k - nE - 1) / cw);
            }
      }
      // flames from the burning front (what is left next to a hole), a tongue from a few of its pixels:
      // tapering up from the base's tone to the tips', flickering on the clock (a few times a second,
      // whole times a loop), growing as the fire takes and dying down as the last of it goes; giving light
      const fl = p.flames as { height: number; density: number; keys: Color[] } | undefined;
      if (fl) {
        const life = Math.min(1, p.progress / 0.25) * Math.min(1, (1 - p.progress) / 0.35), cyc = Math.max(1, Math.round(x.frames / 5)), t = turn(x) * cyc;
        const gn = (qx: number, qy: number) => qx >= 0 && qy >= 0 && qx < W && qy < H && gone[qy * W + qx] === 1, emit = (out.emit ??= new Uint8Array(W * H));
        each(src, x, K, (i, ax, ay, px, py) => {
          if (src.data[i] === TRANSPARENT || gone[i] || px % K || py % K || !(gn(px - K, py) || gn(px + K, py) || gn(px, py - K) || gn(px, py + K))) return;
          const h = hash(ax, ay, x.seed + 91) / 4294967296;
          if (h >= fl.density) return;
          const ph = hash(ax, ay, x.seed + 92) / 4294967296, flick = 0.55 + 0.45 * Math.sin(2 * Math.PI * (t + ph));
          const n = Math.round(fl.height * life * flick * (0.6 + (0.8 * h) / fl.density));
          for (let j = 0; j < n; j++) {
            const f = j / n, wob = Math.round(Math.sin(f * 3.5 + 2 * Math.PI * (t + ph)) * 0.9 * f), half = Math.round((1 - f) * 1.2), key = fl.keys[Math.min(fl.keys.length - 1, Math.floor(f * fl.keys.length))];
            for (let d = -half; d <= half; d++)
              for (let q = 0; q < K; q++) for (let r = 0; r < K; r++) {
                const X = px + (wob + d) * K + q, Y = py - j * K + r;
                if (X >= 0 && Y >= 0 && X < W && Y < H) { out.data[Y * W + X] = key; emit[Y * W + X] = 255; }
              }
          }
        });
      }
      // debris from the pixels gone: each of a few throws one off as it goes, aged by how far the
      // front has gone past it since (so it moves as the progress does, on the clock that drives it)
      const db = p.debris as { keys: Color[]; density: number; life: number; dx: number; dy: number; fall?: boolean } | undefined;
      if (db)
        each(src, x, K, (i, ax, ay, px, py) => {
          if (src.data[i] === TRANSPARENT || px % K || py % K) return;
          const h = hash(ax, ay, x.seed + 77) / 4294967296;
          if (h >= db.density) return;
          const v = order(ax, ay, px, py), a = (thr - v) / db.life;
          if (a <= 0 || a >= 1) return;
          const side = (hash(ax, ay, x.seed + 78) / 4294967296) * 2 - 1, wob = Math.sin(a * 7 + side * 40) * 1.5;
          const X = px + K * Math.round(db.dx * a * side + wob), Y = py + K * Math.round(db.fall ? db.dy * a * a : db.dy * a);
          const key = db.keys[Math.min(db.keys.length - 1, Math.floor(a * db.keys.length))];
          if (a > 0.7 && bayer(ax, ay) > 0.5) return;
          for (let j = 0; j < K; j++) for (let q = 0; q < K; q++) if (X + q >= 0 && Y + j >= 0 && X + q < W && Y + j < H) out.data[(Y + j) * W + X + q] = key;
        });
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
   * `push`: where something passes through it (its column, px from the sprite's left): the stems within
   * `reach` px of it bent away from it, `bend` px at the top for the nearest, by the same height (grass
   * parted by a walker: give each copy the walker's column through its `fx`). `mask`: what moves painted
   * instead of by height, an asset of the same size, each pixel's lightness its share of the sway (white
   * all of it, black and the clear none: a vine's tips, a flag's free edge).
   * Whole pixels move, with their normals (warp's way).
   */
  sway: {
    params: { amount: num(1.5, -64, 64), lean: num(0.5, 0, 1), power: num(2, 0.25, 8), still: num(0, 0), cycles: num(1, 1, 64, true), flutter: num(0, 0, 16), vary: num(0.25, 0, 1),
      push: num(NaN, -4096, 4096), reach: num(6, 1, 256), bend: num(3, -64, 64), pixel: PIXEL,
      mask: (v, what) => { if (v !== undefined && typeof v !== "string") throw new PxError(`${what} is an asset's name, got ${JSON.stringify(v)}`); return v; } },
    run(src, p, x) {
      const r = rng(hash(x.seed, 3, 11)), start = p.vary * r(), far = 1 + p.vary * (2 * r() - 1), K: number = p.pixel;
      const th = 2 * Math.PI * (p.cycles * turn(x) + start), s = p.lean + (1 - p.lean) * Math.sin(th);
      const base = Math.round(src.pivot?.[1] ?? src.h), top = Math.max(1, Math.floor((base - 1) / K) - p.still);
      const row = new Int32Array(src.h), wt = new Float64Array(src.h), by = new Float64Array(src.h);
      for (let py = 0; py < src.h; py++) {
        const up = Math.floor((base - 1 - py) / K) - p.still, w = up <= 0 ? 0 : Math.min(1, up / top) ** p.power;
        by[py] = p.amount * far * s + p.flutter * Math.sin(2 * th + 0.3 * up);
        row[py] = K * Math.round(w * by[py]);
        wt[py] = w;
      }
      if (p.mask) {
        if (!x.asset) throw new PxError('effect "sway": mask needs the name of an asset of the same size, drawn where an asset is');
        const m = x.asset(p.mask), lum = (c: number) => (c === TRANSPARENT ? 0 : (0.2126 * (c >>> 24) + 0.7152 * ((c >>> 16) & 255) + 0.0722 * ((c >>> 8) & 255)) / 255);
        return moved(src, (px, py, i) => { const d = K * Math.round(lum(m.get(px, py)) * by[py]); return d ? at(src, px - d, py, x.wrap) : i; });
      }
      if (!Number.isFinite(p.push)) return moved(src, (px, py, i) => (row[py] ? at(src, px - row[py], py, x.wrap) : i));
      // the stems near what passes through, bent away from it: each row's pixels carried out, where
      // each lands the one taken from (the farthest first, so the nearest, pushed, lands over them)
      const W = src.w, from = new Int32Array(W * src.h).fill(-1), order = [...Array(W).keys()].sort((a, b) => Math.abs(b + 0.5 - p.push) - Math.abs(a + 0.5 - p.push));
      for (let py = 0; py < src.h; py++)
        for (const px of order) {
          const d = (px + 0.5 - p.push) / K, to = px + (Math.abs(d) < p.reach ? K * Math.round(Math.sign(d) * p.bend * (1 - Math.abs(d) / p.reach) * wt[py]) : 0), j = py * W + to;
          if (to >= 0 && to < W && (from[j] < 0 || src.data[py * W + px] !== TRANSPARENT)) from[j] = py * W + px;
        }
      return moved(src, (px, py, i) => { const j = row[py] ? at(src, px - row[py], py, x.wrap) : i; return j < 0 ? -1 : from[j]; });
    },
  },
  /**
   * A glow hugging the drawing: its silhouette grown `width` px round it, in bands of the `color`
   * keys (the first next to it), each band clearer than the one inside it by `fade` (2-3 tones fading
   * out, not a smooth gradient). `pulse` breathes the width over the loop; `flicker` licks its edge
   * with noise `scale` px a cell, going round `speed` cells a loop. Only the glow is left (`keep`: the
   * drawing too), marked as giving light: made from an anim (`base`), it hugs every pose; in mesh()
   * as a sprite with `blend: "add"` over the figure.
   */
  aura: {
    params: { width: num(3, 1, 32), color: (v, what, pal) => { const c = colors(v, what, pal) as Color[]; if (!c.length) throw new PxError(`${what}: give its keys, the one next to the drawing first ("cC")`); return c; },
      fade: num(0.6, 0, 1), pulse: num(0, 0, 1), flicker: num(0, 0, 1), scale: num(3, 0.5), speed: num(1, 0), keep: (v, what) => { if (v !== undefined && typeof v !== "boolean") throw new PxError(`${what} is true or false`); return !!v; }, pixel: PIXEL },
    run(src, p, x) {
      const K: number = p.pixel, W = src.w, H = src.h, keys: Color[] = p.color, nb = keys.length, out = new Img(W, H), glow = (out.emit = new Uint8Array(W * H));
      const a = 2 * Math.PI * turn(x), wid = p.width * (1 - p.pulse * (0.5 - 0.5 * Math.cos(a))), reach = Math.ceil(wid * (1 + p.flicker)) * K;
      const n = noise(x.seed), r = p.speed / (2 * Math.PI), u0 = r * Math.cos(a), v0 = r * Math.sin(a);
      // how far (art px) each clear pixel is from the drawing, within reach
      for (let py = 0; py < H; py++)
        for (let px = 0; px < W; px++) {
          const i = py * W + px;
          if (src.data[i] !== TRANSPARENT) { if (p.keep) out.data[i] = src.data[i]; continue; }
          let best = Infinity;
          for (let y = Math.max(0, py - reach); y <= Math.min(H - 1, py + reach); y++)
            for (let xx = Math.max(0, px - reach); xx <= Math.min(W - 1, px + reach); xx++)
              if (src.data[y * W + xx] !== TRANSPARENT) best = Math.min(best, Math.hypot(Math.floor(xx / K) - Math.floor(px / K), Math.floor(y / K) - Math.floor(py / K)));
          if (best === Infinity) continue;
          const ax = Math.floor((px - x.ox) / K), ay = Math.floor((py - x.oy) / K);
          const d = best + (p.flicker ? p.flicker * wid * (2 * n(ax / p.scale + u0, ay / p.scale + v0) - 1) : 0);
          if (d > wid || d <= 0) continue;
          const k = Math.min(nb - 1, Math.floor(((d - 1) / Math.max(1, wid)) * nb)), al = Math.round(255 * (1 - (p.fade * Math.max(0, k)) / nb));
          out.data[i] = ((keys[Math.max(0, k)] & ~255) | al) >>> 0;
          glow[i] = al;
        }
      return out;
    },
  },
  /**
   * Energy, a spell's matter: inside the drawing (its shape the mask), noise `scale` px a cell flowing
   * round `speed` cells a loop, laid on the `keys` dark to bright in clustered bands, `rim` px of its
   * edge in the brightest; all of it marked as giving light (the bright bands most). Then a distort
   * and a dissolve after it make it a spell: `effect("energy", ...), effect("distort", ...)`.
   */
  energy: {
    params: { keys: (v, what, pal) => { const c = colors(v, what, pal) as Color[]; if (c.length < 2) throw new PxError(`${what}: give two or more keys, dark to bright ("bBcw")`); return c; },
      scale: num(4, 0.5), speed: num(1, 0), rim: num(1, 0, 8, true), pixel: PIXEL },
    run(src, p, x) {
      const keys: Color[] = p.keys, nk = keys.length, K: number = p.pixel, W = src.w, H = src.h, out = new Img(W, H, src.data.slice()), glow = (out.emit = new Uint8Array(W * H));
      const n = noise(x.seed), a = 2 * Math.PI * turn(x), r = p.speed / (2 * Math.PI), u0 = r * Math.cos(a), v0 = r * Math.sin(a);
      // how far in from the edge each pixel is (up to rim + 1), a block at a time
      const inside = (px: number, py: number) => px >= 0 && py >= 0 && px < W && py < H && src.data[py * W + px] !== TRANSPARENT;
      each(src, x, K, (i, ax, ay, px, py) => {
        const c = src.data[i];
        if (c === TRANSPARENT) return;
        let edge = false;
        for (let d = 1; d <= p.rim && !edge; d++) edge = !inside(px - d * K, py) || !inside(px + d * K, py) || !inside(px, py - d * K) || !inside(px, py + d * K);
        const k = edge ? nk - 1 : Math.min(nk - 1, Math.floor(n(ax / p.scale + u0, ay / p.scale + v0) * nk));
        out.data[i] = ((keys[k] & ~255) | (c & 255)) >>> 0;
        glow[i] = Math.round(255 * (0.35 + (0.65 * k) / (nk - 1)));
      });
      return out;
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
      // the pixels marked as giving light, as strong as they shine (mesh() lights what is near them)
      const e = p.color as Color | undefined, memo = new Map<Color, Color>(), glow = (out.emit = new Uint8Array(out.data.length)), g = Math.min(255, Math.round(k * 255));
      for (let i = 0; i < out.data.length; i++) {
        const c = out.data[i];
        if (c === TRANSPARENT) continue;
        glow[i] = g;
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
  if (fx.prepare) opts = fx.prepare(opts);
  for (const k of Object.keys(opts))
    if (!allowed.includes(k)) throw new PxError(`effect "${name}": unknown option '${k}'${didYouMean(k, allowed)} (allowed: ${allowed.join(", ")})`);
  const p: Params = {};
  for (const [k, check] of Object.entries(fx.params)) p[k] = check(opts[k], `effect "${name}": ${k}`, x.pal);
  const seed = opts.seed ?? 0;
  if (!Number.isInteger(seed)) throw new PxError(`effect "${name}": seed is a whole number, got ${JSON.stringify(opts.seed)}`);
  return fx.run(src, p, { ...x, seed: (seed as number) + x.seed });
}
