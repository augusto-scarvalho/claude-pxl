// Small shared helpers: grids, randomness, regions, dithering.

/** Grid string -> rows: each row trimmed, blank leading/trailing rows dropped. */
export function gridRows(s: string): string[] {
  const rows = s.replace(/\r/g, "").split("\n").map((r) => r.trim());
  while (rows.length && rows[0] === "") rows.shift();
  while (rows.length && rows[rows.length - 1] === "") rows.pop();
  return rows;
}

export function gridSize(rows: string[]): { w: number; h: number } {
  let w = 0;
  for (const r of rows) w = Math.max(w, [...r].length);
  return { w, h: rows.length };
}

/** sfc32 seeded through splitmix: fast, well distributed, deterministic. Returns f() -> [0, 1). */
export function rng(seed = 1): () => number {
  let s = seed >>> 0;
  const mix = () => {
    s = (s + 0x9e3779b9) >>> 0;
    let z = s;
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b);
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35);
    return (z ^ (z >>> 16)) >>> 0;
  };
  let a = mix(), b = mix(), c = mix(), d = mix();
  const next = () => {
    const t = (((a + b) >>> 0) + d) >>> 0;
    d = (d + 1) >>> 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) >>> 0;
    c = ((c << 21) | (c >>> 11)) >>> 0;
    c = (c + t) >>> 0;
    return t / 4294967296;
  };
  for (let i = 0; i < 8; i++) next();
  return next;
}

/** Position-based seed: the same placement always makes the same choices. */
export function hash(a: number, b: number, seed: number): number {
  let h = Math.imul(Math.floor(a) | 0, 0x9e3779b1) ^ Math.imul(Math.floor(b) | 0, 0x85ebca77) ^ Math.imul(Math.floor(seed) | 0, 0xc2b2ae3d);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  return (h ^ (h >>> 15)) >>> 0;
}

/** A number in [0, 1) for a lattice point: the same (i, j) always gives the same (procedural texture). */
export function latticeHash(i: number, j: number): number {
  let k = Math.imul(i, 374761393) + Math.imul(j, 668265263);
  k = Math.imul(k ^ (k >>> 13), 1274126177);
  return ((k ^ (k >>> 16)) >>> 0) / 4294967296;
}

/** Smooth value noise in [0, 1]: one unit a cell, the corners' hashes blended with a smoothstep. */
export function vnoise(x: number, y: number): number {
  const i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j, su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v);
  const a = latticeHash(i, j), b = latticeHash(i + 1, j), c = latticeHash(i, j + 1), d = latticeHash(i + 1, j + 1);
  return a + (b - a) * su + (c - a) * sv + (a - b - c + d) * su * sv;
}

/** Octaves of vnoise, each finer (x2.03) and half as strong, summed and kept in [0, 1]: billows, clouds, rock. */
export function fbm(x: number, y: number, octaves = 4): number {
  let s = 0, a = 0.5, f = 1;
  for (let i = 0; i < octaves; i++) { s += a * vnoise(x * f, y * f); a *= 0.5; f *= 2.03; }
  return s / (1 - 0.5 ** octaves);
}

/**
 * A function of (x, y) made to close over `w` (and `h`): its value at x blended with its value one
 * width back, so the end of a strip runs into its start. Noise for strips and tiles that wrap.
 */
export function seamless(fn: (x: number, y: number) => number, w: number, h?: number): (x: number, y: number) => number {
  return (x: number, y: number) => {
    const xm = ((x % w) + w) % w, tx = xm / w, row = (yy: number) => (1 - tx) * fn(xm, yy) + tx * fn(xm - w, yy);
    if (!h) return row(y);
    const ym = ((y % h) + h) % h, ty = ym / h;
    return (1 - ty) * row(ym) + ty * row(ym - h);
  };
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
/** Ordered-dither threshold in (0, 1) for pixel (x, y). */
export function bayer(x: number, y: number): number {
  return (BAYER[(((y % 4) + 4) % 4) * 4 + (((x % 4) + 4) % 4)] + 0.5) / 16;
}

/**
 * Region -> predicate(x, y). undefined = everywhere; [cx, cy, r] circle; [x, y, w, h] rect;
 * [x0, y0, x1, y1, x2, y2, ...] polygon (vertices on pixel corners); or a function.
 */
export type Region = undefined | null | number[] | ((x: number, y: number) => boolean);

export function regionPred(r: Region): (x: number, y: number) => boolean {
  if (r == null) return () => true;
  if (typeof r === "function") return r;
  if (Array.isArray(r)) {
    if (r.length === 3) {
      const [cx, cy, rad] = r, rr = (rad + 0.5) ** 2;
      return (x, y) => (x - cx) ** 2 + (y - cy) ** 2 <= rr;
    }
    if (r.length === 4) {
      const [x0, y0, w, h] = r;
      return (x, y) => x >= x0 && y >= y0 && x < x0 + w && y < y0 + h;
    }
    if (r.length >= 6 && r.length % 2 === 0) return inPoly(r);
  }
  throw new Error("region must be [cx,cy,r], [x,y,w,h], a polygon [x0,y0,x1,y1,x2,y2,...] or a function(x,y)");
}

/** Even-odd test of pixel centers; vertices sit on pixel corners. */
export function inPoly(pts: number[]): (x: number, y: number) => boolean {
  const n = pts.length / 2;
  return (px, py) => {
    const x = px + 0.5, y = py + 0.5;
    let inside = false;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = pts[2 * i], yi = pts[2 * i + 1], xj = pts[2 * j], yj = pts[2 * j + 1];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
}

/** Bounding box of a polygon point list. */
export function polyBounds(pts: number[]): { x0: number; y0: number; x1: number; y1: number } {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < pts.length; i += 2) {
    x0 = Math.min(x0, pts[i]); x1 = Math.max(x1, pts[i]);
    y0 = Math.min(y0, pts[i + 1]); y1 = Math.max(y1, pts[i + 1]);
  }
  return { x0, y0, x1, y1 };
}

/** "abc" or ["a", "b", "c"] -> list of color specs. */
export function colorList(cols: string | string[]): string[] {
  return Array.isArray(cols) ? [...cols] : [...cols];
}

/** Glob with "*" -> RegExp. */
export function globRe(pattern: string): RegExp {
  return new RegExp("^" + pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$");
}

/** Compact, readable argument formatting for op labels. */
export function fmtArgs(args: unknown[]): string {
  const f = (v: unknown, depth: number): string => {
    if (typeof v === "string") return v.includes("\n") ? "`" + v.trim().split("\n")[0].trim() + "…`" : JSON.stringify(v);
    if (typeof v === "function") return "fn";
    if (Array.isArray(v)) return depth > 1 ? "[…]" : "[" + v.slice(0, 8).map((x) => f(x, depth + 1)).join(",") + (v.length > 8 ? ",…" : "") + "]";
    if (v && typeof v === "object") {
      if (depth > 1) return "{…}";
      return "{" + Object.entries(v).filter(([k]) => !k.startsWith("__")).map(([k, x]) => k + ":" + f(x, depth + 1)).join(",") + "}";
    }
    return String(v);
  };
  return args.map((a) => f(a, 0)).join(", ");
}
