// Faceted solids drawn as pixel art by the volume method (the nature kit's pineVolume): a convex body
// of planes, each pixel the facet a ray from it meets first, lit flat by a light from the picture's
// upper left; seen through any camera (its right, up and forward in the world) at any turn. Ice:
// flat facets, a cold rim, lighter where it is thin (the planes inside showing), a few glints. Rock:
// lumpy facets, cracks, moss on what faces up. Cracks that spread from a point, for a solid about to
// break; what is under the ground cut away, for one rising out of it.
import type { Color } from "./color.ts";
import { noise } from "./effects.ts";
import { bayer, hash, rng } from "./util.ts";

export type V3 = [number, number, number];
export type M3 = number[];
export interface Solid { planes: [V3, number][]; r: number; up: number }
/** How the solid is seen: the camera's right, up and forward (into the picture) in the world, where a point lands and px a unit there. */
export interface SolidCamera { R: V3; U: V3; F: V3; P(p: number[]): [number, number]; k(p: number[]): number }
interface Plotter { color(k: unknown): Color | null; plot(x: number, y: number, c: Color): boolean }

export const unit3 = (v: number[]): V3 => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
export const dot3 = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const along = (a: number[], b: number[], k: number): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
/** A turn of `ang` radians about `axis`, and a vector turned by it (or back). */
export const turn = (axis: number[], ang: number): M3 => {
  const [x, y, z] = unit3(axis), c = Math.cos(ang), s = Math.sin(ang), t = 1 - c;
  return [t * x * x + c, t * x * y - s * z, t * x * z + s * y, t * x * y + s * z, t * y * y + c, t * y * z - s * x, t * x * z - s * y, t * y * z + s * x, t * z * z + c];
};
export const mul = (m: M3, v: number[]): V3 => [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];
const back = (m: M3, v: number[]): V3 => [m[0] * v[0] + m[3] * v[1] + m[6] * v[2], m[1] * v[0] + m[4] * v[1] + m[7] * v[2], m[2] * v[0] + m[5] * v[1] + m[8] * v[2]];

/** The two matters, dark to light, and their rim, glint, crack and moss. */
export const MATTER = {
  ice: { tones: ["#163866", "#24589a", "#3a84c8", "#68b8ea", "#a6def8", "#e2f6ff"], rim: "#bfeeff", glint: "#ffffff", crack: "#f4fcff", moss: undefined },
  rock: { tones: ["#261c14", "#3c2c1e", "#584430", "#745e40", "#937c58", "#b29c76"], rim: undefined, glint: undefined, crack: "#140e0a", moss: ["#2c4620", "#46662a", "#66883a"] },
};
export type Matter = keyof typeof MATTER;
export type SolidKind = "berg" | "block" | "boulder" | "spire" | "shard" | "chunk";

/**
 * A faceted body `size` units across its middle: `facets` planes round it (a sphere's even spread,
 * moved by `jag`), stretched by its kind: a berg tall and narrowing up, a block squat with bevelled
 * corners, a boulder round, a spire tall and tapering to a point, a shard long, a chunk lumpy.
 */
export function makeSolid(kind: SolidKind, seed: number, size: number, facets: number, jag: number): Solid {
  const r = rng(hash(seed, 71, 5)), planes: [V3, number][] = [];
  const A = kind === "spire" ? [0.5, 0.5, 2.6] : kind === "berg" ? [1, 0.85, 1.45] : kind === "block" ? [1.2, 0.95, 0.85] : kind === "shard" ? [0.45, 0.45, 1.4] : [1, 0.95, 0.85];
  const tilt = kind === "spire" ? 0.45 : kind === "berg" ? 0.2 : 0;
  const add = (n: number[], h: number) => {
    const m = [n[0] / A[0], n[1] / A[1], n[2] / A[2]], l = Math.hypot(m[0], m[1], m[2]);
    planes.push([[m[0] / l, m[1] / l, m[2] / l], h / l]);
  };
  const N = Math.max(4, Math.round(facets));
  for (let i = 0; i < N; i++) {
    const z = 1 - (2 * (i + 0.5)) / N, rr = Math.sqrt(1 - z * z), a = i * 2.39996 + r() * 0.8;
    const n = unit3([Math.cos(a) * rr + (r() - 0.5) * jag, Math.sin(a) * rr + (r() - 0.5) * jag, z + (r() - 0.5) * jag + (z > -0.6 ? tilt * rr : 0)]);
    add(n, size * (1 - jag * 0.6 * r()));
  }
  if (kind === "block") for (const n of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) add(n, size * 0.82);
  if (kind === "spire" || kind === "berg") add([0, 0, -1], size * 0.95);
  return { planes, r: size * Math.max(A[0], A[1], A[2]) * 1.15, up: size * A[2] };
}

/**
 * Draw a solid with its middle at `at` (the world's units), turned by `rot`, `unit` world units to
 * one of its own. `crack` 0..1: cracks spread from `crackAt` (its own coords) over that much of it;
 * `ground`: its middle's height above the ground in its own units (what is below is cut away);
 * `density` 0..1 thins it out in an ordered dither (breaking up, fading).
 */
export function drawSolid(c: Plotter, cam: SolidCamera, at: number[], unit: number, S: Solid, rot: M3, mat: Matter,
  o: { seed: number; crack?: number; crackAt?: number[]; ground?: number; density?: number; hot?: Color }): void {
  const M = MATTER[mat], k = cam.k(at) * unit, [cx, cy] = cam.P(at), rad = S.r * k + 1, density = o.density ?? 1;
  if (rad < 1 || density <= 0) return;
  const d = back(rot, cam.F), sun = unit3([-0.55 * cam.R[0] + 0.55 * cam.U[0] - 0.6 * cam.F[0], -0.55 * cam.R[1] + 0.55 * cam.U[1] - 0.6 * cam.F[1], -0.55 * cam.R[2] + 0.55 * cam.U[2] - 0.6 * cam.F[2]]);
  const n1 = noise(o.seed + 5), n2 = noise(o.seed + 9), cr = o.crack ?? 0, ca = o.crackAt ?? [0, 0, 0];
  const x0 = Math.floor(cx - rad), x1 = Math.ceil(cx + rad), y0 = Math.floor(cy - rad), y1 = Math.ceil(cy + rad), W = x1 - x0 + 1, H = y1 - y0 + 1;
  // what each pixel shows: 0-5 the tones, 6 the rim, 7 a glint, 8 a crack, 9-11 moss; -1 nothing
  const cell = new Int8Array(W * H).fill(-1), tone = new Int8Array(W * H);
  for (let py = y0; py <= y1; py++)
    for (let px = x0; px <= x1; px++) {
      const dx = (px + 0.5 - cx) / k, dy = (cy - py - 0.5) / k;
      const oo = back(rot, [cam.R[0] * dx + cam.U[0] * dy - cam.F[0] * 2 * S.r, cam.R[1] * dx + cam.U[1] * dy - cam.F[1] * 2 * S.r, cam.R[2] * dx + cam.U[2] * dy - cam.F[2] * 2 * S.r]);
      let tn = -Infinity, tf = Infinity, ni = -1;
      for (let i = 0; i < S.planes.length; i++) {
        const [n, h] = S.planes[i], den = dot3(n, d), num = h - dot3(n, oo);
        if (Math.abs(den) < 1e-9) { if (num < 0) { tn = Infinity; break; } continue; }
        const t = num / den;
        if (den < 0) { if (t > tn) { tn = t; ni = i; } } else if (t < tf) tf = t;
      }
      if (ni < 0 || !(tn <= tf)) continue;
      const q = along(oo, d, tn);
      if (o.ground !== undefined && o.ground + mul(rot, q)[2] < 0) continue;
      const nw = mul(rot, S.planes[ni][0]), j = (py - y0) * W + (px - x0);
      let L = 0.26 + 0.55 * Math.max(0, dot3(nw, sun)) + 0.17 * nw[2], v = -1;
      if (mat === "ice") {
        L += 0.24 * (1 - Math.min(1, (tf - tn) / (1.4 * S.r)));
        const rf = along(cam.F, nw, -2 * dot3(cam.F, nw));
        if (dot3(rf, sun) > 0.96 && ni % 3 === 0) v = 7;
      } else {
        if (Math.abs(n1(q[0] * 0.3 + q[2] * 0.2, q[1] * 0.3 - q[2] * 0.15) - 0.5) < 0.02) v = 8;
        else if (nw[2] > 0.5 && n2(q[0] * 0.35, q[1] * 0.35) > 0.56) v = 9 + Math.max(0, Math.min(2, Math.round(L * 2.6 - 0.6)));
      }
      if (cr > 0 && Math.hypot(q[0] - ca[0], q[1] - ca[1], q[2] - ca[2]) < cr * 2.4 * S.r && Math.abs(n2(q[0] * 0.2 + q[2] * 0.1, q[1] * 0.2 + q[2] * 0.12) - 0.5) < 0.04) v = 8;
      tone[j] = Math.max(0, Math.min(5, Math.round(L * 5)));
      cell[j] = v >= 0 ? v : tone[j];
    }
  const keys = [...M.tones, M.rim ?? M.tones[5], M.glint ?? M.tones[5], M.crack, ...(M.moss ?? M.tones.slice(2, 5))].map((h) => c.color(h)!);
  if (o.hot) keys[8] = o.hot;
  const empty = (x: number, y: number) => x < 0 || y < 0 || x >= W || y >= H || cell[y * W + x] < 0;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let v = cell[y * W + x];
      if (v < 0) continue;
      // the rim: ice cold all round (white on the lit side); rock lit up and left, darkest down and right
      const lit = empty(x - 1, y) || empty(x, y - 1), shade = empty(x + 1, y) || empty(x, y + 1);
      if (mat === "ice" && (lit || shade)) v = lit ? 7 : 6;
      else if (mat === "rock" && v < 8) v = lit ? Math.min(5, tone[y * W + x] + 1) : shade ? 0 : v;
      if (density < 1 && bayer(x0 + x, y0 + y) >= density) continue;
      c.plot(x0 + x, y0 + y, keys[v]);
    }
}

/** A solid's pieces after it breaks: n of them from inside it, flying out and falling, at rest on the ground. */
export function pieces(seed: number, n: number, center: number[], spread: number, speed: number, size: number) {
  return Array.from({ length: Math.max(0, Math.round(n)) }, (_, i) => {
    const r = rng(hash(seed, i, 313)), a = r() * Math.PI * 2, out = speed * (0.5 + 0.7 * r());
    return {
      seed: hash(seed, i, 7), size: size * (0.55 + 0.6 * r()),
      p0: [center[0] + Math.cos(a) * spread * r(), center[1] + Math.sin(a) * spread * r(), center[2] + spread * (r() - 0.3)] as V3,
      v: [Math.cos(a) * out, Math.sin(a) * out, speed * (0.4 + 0.8 * r())] as V3,
      axis: [r() - 0.5, r() - 0.5, r() - 0.5], spin: (r() - 0.5) * 14,
    };
  });
}
/** Where a piece is `s` seconds after the break (gravity `g` units/s², landing at `rest` up), and how far it has turned. */
export function pieceAt(p: ReturnType<typeof pieces>[number], s: number, g: number, rest: number): { at: V3; ang: number } {
  // when it lands: z0 + vz t - g t^2 / 2 = rest
  const a = g / 2, b = -p.v[2], cc = rest - p.p0[2], disc = b * b - 4 * a * cc, land = disc < 0 ? 0 : (-b + Math.sqrt(disc)) / (2 * a), t = Math.min(s, Math.max(0, land));
  return { at: [p.p0[0] + p.v[0] * t, p.p0[1] + p.v[1] * t, s >= land ? rest : p.p0[2] + p.v[2] * t - a * t * t], ang: p.spin * t };
}
