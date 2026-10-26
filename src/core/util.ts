// Small shared helpers: grids, randomness, regions, dithering.
import { PxError } from "./errors.ts";

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
/** Vectors as arrays (any length; dot and cross in 3D): what the art files wrote each for itself. */
export const vec = {
  add: (a: number[], b: number[]) => a.map((v, i) => v + b[i]),
  sub: (a: number[], b: number[]) => a.map((v, i) => v - b[i]),
  mul: (a: number[], k: number) => a.map((v) => v * k),
  dot: (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + (a.length > 2 ? a[2] * b[2] : 0),
  cross: (a: number[], b: number[]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: (a: number[]) => Math.hypot(...a),
  unit: (a: number[]) => { const l = Math.hypot(...a) || 1; return a.map((v) => v / l); },
};

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

/** What `make` gives for this owner and key, made once (the last 8 kept an owner): a field's voxels, splats or mesh at a moment, asked for by several panels or headings. */
const ONCE = new WeakMap<object, Map<string, unknown>>();
export function once<T>(owner: unknown, key: string, make: () => T): T {
  if (!owner || typeof owner !== "object") return make();
  let m = ONCE.get(owner);
  if (!m) ONCE.set(owner, (m = new Map()));
  let v = m.get(key) as T | undefined;
  if (v === undefined) { m.set(key, (v = make())); if (m.size > 8) m.delete(m.keys().next().value!); }
  return v;
}

/**
 * A ground (or a ceiling) drawn as a polyline, [x0, y0, x1, y1, ...] with x going up: (x) => its row
 * there, rounded; before the first point the first leg carried on, past the last the last row.
 */
/**
 * A lane along a polyline, [x0, y0, x1, y1, ...] px, its corners rounded `round` px (as far as its legs
 * allow): (x, y) => [s, u], how far along it the nearest point of it lies (px from the first point; its
 * first and last legs carried on past their ends) and how far the point lies to its side (px, + on the
 * right going along it); `.total` its length along. What is laid along a path: slabs in courses at steps
 * of s (fanning round a bend), its edges at |u|, its ends at s 0 and total, a road's lines, a river's banks.
 */
export function lane(pts: number[], o: { round?: number } = {}): ((x: number, y: number) => [number, number]) & { total: number } {
  const r = o.round ?? 0;
  if (!Array.isArray(pts) || pts.length < 4 || pts.length % 2 || !pts.every(Number.isFinite) || !(r >= 0))
    throw new PxError(`lane: points are [x0, y0, x1, y1, ...] (two or more), round px (0 up), got ${JSON.stringify(pts)?.slice(0, 120)}, ${JSON.stringify(o.round)}`);
  const P: number[][] = [];
  for (let i = 0; i < pts.length; i += 2) if (!P.length || pts[i] !== P[P.length - 1][0] || pts[i + 1] !== P[P.length - 1][1]) P.push([pts[i], pts[i + 1]]);
  if (P.length < 2) throw new PxError("lane: two points apart at least");
  const dir = (a: number[], b: number[]) => { const l = Math.hypot(b[0] - a[0], b[1] - a[1]); return [(b[0] - a[0]) / l, (b[1] - a[1]) / l, l]; };
  // its pieces in order: legs [a, way, length] and arcs [center, radius, start angle, sweep (+ clockwise on the picture)]
  type Leg = { a: number[]; d: number[]; len: number; s: number } | { c: number[]; rad: number; a0: number; sw: number; len: number; s: number };
  const out: Leg[] = [];
  let from = P[0], s = 0;
  for (let i = 1; i < P.length; i++) {
    const [dx, dy, l] = dir(P[i - 1], P[i]);
    let to = P[i], next: Leg | undefined, after = P[i];
    if (i < P.length - 1 && r > 0) {
      const [ex, ey, m] = dir(P[i], P[i + 1]), turn = Math.atan2(dx * ey - dy * ex, dx * ex + dy * ey);
      if (Math.abs(turn) > 1e-6) {
        // its tangents no longer than half of either leg; the center on the side it turns to
        const t = Math.min(r * Math.tan(Math.abs(turn) / 2), l / 2, m / 2), rad = t / Math.tan(Math.abs(turn) / 2), side = Math.sign(turn);
        to = [P[i][0] - dx * t, P[i][1] - dy * t];
        after = [P[i][0] + ex * t, P[i][1] + ey * t];
        const c = [to[0] - dy * side * rad, to[1] + dx * side * rad];
        next = { c, rad, a0: Math.atan2(to[1] - c[1], to[0] - c[0]), sw: turn, len: rad * Math.abs(turn), s: 0 };
      }
    }
    const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
    out.push({ a: from, d: [dx, dy], len, s });
    s += len;
    if (next) { next.s = s; out.push(next); s += next.len; }
    from = after;
  }
  const at = (x: number, y: number): [number, number] => {
    let best = Infinity, bs = 0, bu = 0;
    out.forEach((q, k) => {
      if ("d" in q) {
        let t = (x - q.a[0]) * q.d[0] + (y - q.a[1]) * q.d[1];
        if (k > 0) t = Math.max(t, 0);
        if (k < out.length - 1) t = Math.min(t, q.len);
        const px = q.a[0] + q.d[0] * t, py = q.a[1] + q.d[1] * t, dist = Math.hypot(x - px, y - py);
        if (dist < best) { best = dist; bs = q.s + t; bu = (x - px) * -q.d[1] + (y - py) * q.d[0]; }
      } else {
        const vx = x - q.c[0], vy = y - q.c[1], rho = Math.hypot(vx, vy);
        let phi = (Math.atan2(vy, vx) - q.a0) * Math.sign(q.sw);
        phi = ((phi % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        if (phi > Math.abs(q.sw)) return;
        const dist = Math.abs(rho - q.rad);
        if (dist < best) { best = dist; bs = q.s + q.rad * phi; bu = -Math.sign(q.sw) * (rho - q.rad); }
      }
    });
    return [bs, bu];
  };
  return Object.assign(at, { total: s });
}

export function profile(pts: number[]): (x: number) => number {
  if (!Array.isArray(pts) || pts.length < 4 || pts.length % 2 || !pts.every(Number.isFinite) || pts.some((v, i) => i % 2 === 0 && i > 0 && v <= pts[i - 2]))
    throw new PxError(`profile: points are [x0, y0, x1, y1, ...] (two or more, x going up), got ${JSON.stringify(pts)?.slice(0, 120)}`);
  return (x) => {
    for (let i = 0; i < pts.length - 2; i += 2)
      if (x <= pts[i + 2]) return Math.round(pts[i + 1] + (pts[i + 3] - pts[i + 1]) * (x - pts[i]) / (pts[i + 2] - pts[i]));
    return pts[pts.length - 1];
  };
}
