// Details on a form: many small things scattered on a field's surface as splats (splats.ts) — leaves on
// a canopy, moss and lichen on a rock, tufts and pebbles on the ground, snow on a roof's cap, sparkles
// on a crystal. The field is the form, a volume continuous matter; these are the small things on it,
// each with its own size, turn and tone. Where: on a material or a region (`where`), as dense as asked,
// by rules (facing up, on the lit side); turned by the normal, up, or a flow (blades leaning in a wind);
// seeded jitter, a tone a step up or down the ramp. At a sprite's size each is a pixel-art brush (a dot,
// a clump, a leaf, a blade: how pixel artists paint foliage), lit by its normal and the sun reaching it,
// at its depth; bigger than a few px it stays an ellipse. They go where the form goes: scattered on it
// at rest, then carried by its moves (at, rotate, scale, bend: a tree's sway), each fluttering on the
// clock out of step.
import { PxError } from "./errors.ts";
import { type Clock, STILL, Sdf, type V3, compile, num, vec } from "./sdf.ts";
import { slab } from "./surface.ts";
import { Splats } from "./splats.ts";
import { hash } from "./util.ts";

export const BRUSHES = ["ellipse", "dot", "clump", "leaf", "blade", "cluster"] as const;
export type Brush = (typeof BRUSHES)[number];
/** Each brush's cells round its middle, [dx, dy, a step up (+) or down (-) its tone]: lit up and left, darker down and right, as a clump is shaded. */
export const BRUSH_CELLS: Record<Exclude<Brush, "ellipse">, number[][]> = {
  dot: [[0, 0, 0]],
  clump: [[0, 0, 1], [1, 0, 0], [0, 1, 0], [1, 1, -1]],
  leaf: [[0, -1, 1], [-1, 0, 0], [0, 0, 0], [1, 0, -1], [0, 1, -1]],
  blade: [[0, 0, -1], [0, -1, 0], [0, -2, 1]],
  cluster: [[0, -1, 1], [1, -1, 0], [-1, 0, 1], [0, 0, 0], [1, 0, 0], [-1, 1, 0], [0, 1, -1], [1, 1, -1]],
};

export interface ScatterOpts {
  /** on this material (or these) only */
  on?: string | string[];
  /** where (p, n) holds, in the field's own frame */
  where?: (p: V3, n: V3) => unknown;
  /** how many to a square meter (default 80) */
  count?: number;
  /** only where the surface faces up at least this much, 0..1 (snow, moss: 0.5) */
  up?: number;
  /** only where the sun reaches */
  lit?: boolean;
  /** which way each stands: "normal" (default), "up", or a flow [x, y, z] (blades leaning in the wind) */
  orient?: "normal" | "up" | number[];
  /** each one's size in m, or [smallest, biggest] (default [0.04, 0.08]) */
  size?: number | [number, number];
  brush?: Brush;
  /** steps up or down the ramp, at most (default 1) */
  vary?: number;
  /** the material they are drawn in (default the one they sit on) */
  mat?: string;
  seed?: number;
  /** the way to the sun in the world (default the upper left, a little toward the viewer) */
  light?: number[];
  /** m each flutters on the clock, out of step, twice a loop (default 0) */
  flutter?: number;
}
export const SCATTER_OPTS = ["on", "where", "count", "up", "lit", "orient", "size", "brush", "vary", "mat", "seed", "light", "flutter"];

const unit = (v: number[]): V3 => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
/** The turn taking the z axis to n, as a quaternion (w, x, y, z). */
const toward = (n: V3): [number, number, number, number] => {
  if (n[2] < -0.999999) return [0, 1, 0, 0];
  const w = Math.sqrt((1 + n[2]) / 2), k = 1 / (2 * w);
  return [w, -n[1] * k, n[0] * k, 0];
};

/**
 * A field's moves at its root (at, rotate, scale, bend), peeled off: the form inside, and how a point on
 * it is carried by them at a moment. What is scattered on the form at rest goes where the form goes.
 */
export function peel(f: Sdf): { inner: Sdf; carry: (clock: Clock) => (p: V3) => V3; back: (clock: Clock) => (p: V3) => V3 } {
  const outer: Sdf[] = [];
  let s = f;
  while (["at", "rotate", "scale", "bend"].includes(s.node.op)) { outer.push(s); s = (s.node as { of: Sdf }).of; }
  // each move at a moment, as a step forward and a step back
  const moves = (clock: Clock) => outer.slice().reverse().map((o): [(p: V3) => V3, (p: V3) => V3] => {
    const n = o.node;
    if (n.op === "at") { const v = vec(n.v, clock, "at"); return [(p) => [p[0] + v[0], p[1] + v[1], p[2] + v[2]], (p) => [p[0] - v[0], p[1] - v[1], p[2] - v[2]]]; }
    if (n.op === "scale") { const k = vec(n.s, clock, "scale"); return [(p) => [p[0] * k[0], p[1] * k[1], p[2] * k[2]], (p) => [p[0] / k[0], p[1] / k[1], p[2] / k[2]]]; }
    if (n.op === "bend") {
      const kv = typeof n.k === "function" ? (n.k as (c: Clock) => unknown)(clock) : n.k;
      const [kx, ky] = typeof kv === "object" ? vec(kv as number[], clock, "bend", 2) : [num(kv as number, clock, "bend"), 0];
      const off = (z: number) => (z > 0 ? (z * z) / 2 : 0);
      return [(p) => [p[0] + kx * off(p[2]), p[1] + ky * off(p[2]), p[2]], (p) => [p[0] - kx * off(p[2]), p[1] - ky * off(p[2]), p[2]]];
    }
    const r = n as unknown as { axis: number[]; deg: number }, ax = unit(vec(r.axis, clock, "rotate")), g = (num(r.deg, clock, "rotate") * Math.PI) / 180, [u, v, w] = ax, co = Math.cos(g), si = Math.sin(g), t = 1 - co;
    const M = [t * u * u + co, t * u * v - si * w, t * u * w + si * v, t * u * v + si * w, t * v * v + co, t * v * w - si * u, t * u * w - si * v, t * v * w + si * u, t * w * w + co];
    return [(p) => [M[0] * p[0] + M[1] * p[1] + M[2] * p[2], M[3] * p[0] + M[4] * p[1] + M[5] * p[2], M[6] * p[0] + M[7] * p[1] + M[8] * p[2]], (p) => [M[0] * p[0] + M[3] * p[1] + M[6] * p[2], M[1] * p[0] + M[4] * p[1] + M[7] * p[2], M[2] * p[0] + M[5] * p[1] + M[8] * p[2]]];
  });
  return {
    inner: s,
    // innermost first forward; outermost first back
    carry: (clock) => { const m = moves(clock); return (p) => m.reduce((q, st) => st[0](q), p); },
    back: (clock) => { const m = moves(clock); return (p) => m.reduceRight((q, st) => st[1](q), p); },
  };
}

/** Scatter small things on a field's surface (see the top of this file): a splat set that draws as brushes. */
export function scatter(field: unknown, o: ScatterOpts = {}): Splats {
  if (!(field instanceof Sdf)) throw new PxError("sdf.scatter(field, { on, where, count, up, lit, orient, size, brush, vary, mat, seed, light, flutter }): scattered on a distance field's surface");
  const bad = Object.keys(o).filter((k) => !SCATTER_OPTS.includes(k));
  if (bad.length) throw new PxError(`sdf.scatter: no option ${bad.join(", ")} (it has: ${SCATTER_OPTS.join(", ")})`);
  const count = o.count ?? 80, [s0, s1] = typeof o.size === "number" ? [o.size, o.size] : o.size ?? [0.04, 0.08], brush = o.brush ?? "clump", vary = o.vary ?? 1, seed = o.seed ?? 1, flutter = o.flutter ?? 0;
  if (!(count > 0) || !(s0 > 0 && s1 >= s0) || !BRUSHES.includes(brush) || !(vary >= 0) || !Number.isInteger(seed) || !(flutter >= 0) || (o.up !== undefined && !(o.up >= -1 && o.up <= 1)))
    throw new PxError(`sdf.scatter: count above 0, size m (or [smallest, biggest]), brush ${BRUSHES.join(", ")}, vary from 0, seed whole, flutter m, up -1..1, got ${JSON.stringify({ ...o, where: undefined })}`);
  const on = o.on === undefined ? undefined : Array.isArray(o.on) ? o.on : [o.on], L = unit(o.light ?? [-0.65, -0.35, 0.68]);
  const flow = Array.isArray(o.orient) ? unit(o.orient) : undefined;
  const { inner, carry } = peel(field), C = compile(inner, STILL), d = C.d, sp = 1 / Math.sqrt(count), h = sp * 0.1;
  if (![...C.lo, ...C.hi].every(Number.isFinite)) throw new PxError("sdf.scatter: the field goes on without end (a plane): intersect it with something that ends");
  const grad = (x: number, y: number, z: number): V3 => {
    const a = d(x + h, y - h, z - h), b = d(x - h, y - h, z + h), c = d(x - h, y + h, z - h), e = d(x + h, y + h, z + h);
    return unit([a - b - c + e, -a - b + c + e, -a + b - c + e]);
  };
  const lip = C.lip * 1.05, shut = (x: number, y: number, z: number) => {
    const s = slab([x, y, z], L, C.lo, C.hi);
    if (!s) return false;
    for (let t = Math.max(0, s[0]), i = 0; i < 120 && t <= s[1]; i++) { const v = d(x + L[0] * t, y + L[1] * t, z + L[2] * t); if (v < sp * 0.05) return true; t += Math.max(v / lip, sp * 0.05); }
    return false;
  };
  const rnd = (i: number, j: number, k: number, e: number) => hash(i * 7 + e, j * 131 + k * 8191, seed) / 4294967296;
  const out: { p: V3; n: V3; dir: V3; size: number; mat: string; sun: number; shift: number; phase: number }[] = [];
  const n = C.lo.map((v, e) => Math.ceil((C.hi[e] - v) / sp) + 1);
  for (let k = 0; k < n[2]; k++) for (let j = 0; j < n[1]; j++) for (let i = 0; i < n[0]; i++) {
    let x = C.lo[0] + i * sp, y = C.lo[1] + j * sp, z = C.lo[2] + k * sp;
    if (Math.abs(d(x, y, z)) > sp) continue;
    x += (rnd(i, j, k, 0) - 0.5) * sp; y += (rnd(i, j, k, 1) - 0.5) * sp; z += (rnd(i, j, k, 2) - 0.5) * sp;
    for (let it = 0; it < 2; it++) { const v = d(x, y, z), g = grad(x, y, z); x -= g[0] * v; y -= g[1] * v; z -= g[2] * v; }
    if (Math.abs(d(x, y, z)) > sp * 0.2) continue;
    const g = grad(x, y, z), mi = C.m(x, y, z, g[0], g[1], g[2]), mat = mi >= 0 ? C.mats[mi] : "";
    if (on && !on.includes(mat)) continue;
    if (o.up !== undefined && g[2] < o.up) continue;
    if (o.where && !o.where([x, y, z], g)) continue;
    const facing = g[0] * L[0] + g[1] * L[1] + g[2] * L[2], sun = facing > 0 && !shut(x + g[0] * sp * 0.3, y + g[1] * sp * 0.3, z + g[2] * sp * 0.3) ? 1 : 0;
    if (o.lit && !sun) continue;
    const size = s0 + (s1 - s0) * rnd(i, j, k, 3), up = size * 0.4;
    out.push({
      p: [x + g[0] * up, y + g[1] * up, z + g[2] * up], n: g, size, sun, mat: o.mat ?? mat,
      dir: o.orient === "up" ? [0, 0, 1] : flow ?? g, shift: Math.round((rnd(i, j, k, 4) * 2 - 1) * vary), phase: rnd(i, j, k, 5),
    });
  }
  const mats = [...new Set(out.map((s) => s.mat))], S = new Splats(out.length, mats.length ? mats : [""]);
  const code = BRUSHES.indexOf(brush);
  S.brush = new Uint8Array(out.length).fill(code); S.shift = new Int8Array(out.length); S.phase = new Float32Array(out.length);
  out.forEach((s, i) => {
    S.pos.set(s.p, i * 3); S.normal.set(s.n, i * 3); S.scale.set([s.size / 2, s.size / 2, s.size / 12], i * 3); S.rot.set(toward(s.dir), i * 4);
    S.opacity[i] = 0.95; S.sun[i] = s.sun; S.mat[i] = mats.indexOf(s.mat); S.shift![i] = s.shift; S.phase![i] = s.phase;
  });
  // carried by the form's moves, each fluttering out of step
  S.move = (clock) => {
    const cr = carry(clock), ph = clock.phase * 2 * Math.PI * 2;
    return (i, p) => {
      const q = cr(p);
      if (!flutter) return q;
      const a = ph + S.phase![i] * 2 * Math.PI;
      return [q[0] + flutter * Math.sin(a), q[1] + flutter * 0.5 * Math.cos(a * 1.3), q[2] + flutter * 0.4 * Math.cos(a)];
    };
  };
  return S;
}
