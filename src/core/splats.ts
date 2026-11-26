// Procedural Gaussian splats (experimental): a field's surface as flat discs lying along it (each
// oriented by the normal there, of the material there, its sun seen or not), a density's inside as round
// blobs (opaque as it is dense, lit as the light gets in). Not a trained radiance field: what the field
// says, laid as splats. Drawn by a CPU rasterizer to pixel art: each splat's ellipse on the picture (its
// covariance carried through the camera, EWA), the nearest first, their opacity gathered until a pixel is
// full; then the gathered light snapped to the material's ramp in clusters, thin edges dithered, an
// outline on the side away from the light where it is solid. Written as a 3DGS .ply (files3d.ts).
import { type Color, TRANSPARENT, oklab, pack } from "./color.ts";
import { PxError } from "./errors.ts";
import { sizeOf } from "./grids.ts";
import { type Clock, Density, STILL, Sdf, type V3, article, compile, compileDensity } from "./sdf.ts";
import { type SurfaceCanvas, type SurfaceView, clockOf, partIndex, slab, viewOf } from "./surface.ts";
import { bayer, hash, once } from "./util.ts";

/** A set of splats: for each, where (m), its three radii (std devs, m) along its own axes, its turn (quaternion w, x, y, z), opacity, normal (0 for a round one), how much sun reaches it, its material. */
export class Splats {
  readonly kind = "splats";
  readonly n: number;
  readonly pos: Float32Array; readonly scale: Float32Array; readonly rot: Float32Array; readonly opacity: Float32Array;
  readonly normal: Float32Array; readonly sun: Float32Array; readonly mat: Uint16Array; readonly mats: string[];
  /** details scattered on a form (scatter.ts): each one's brush (0 an ellipse), its step along the ramp, its flutter's phase, and how the form carries them at a moment */
  brush?: Uint8Array; shift?: Int8Array; phase?: Float32Array;
  move?: (clock: Clock) => (i: number, p: V3) => V3;
  /** Imported 3DGS .ply spherical harmonics: DC coefficients (3 floats/splat), optional SH degree 1..3 and channel-major f_rest coefficients. */
  dc?: Float32Array;
  shDeg?: number;
  shRest?: Float32Array;
  /** Whether imported SH coefficients are expressed in Y-up coordinates (standard 3DGS .ply). */
  shYup?: boolean;
  constructor(n: number, mats: string[]) {
    this.n = n; this.mats = mats;
    this.pos = new Float32Array(n * 3); this.scale = new Float32Array(n * 3); this.rot = new Float32Array(n * 4); this.opacity = new Float32Array(n);
    this.normal = new Float32Array(n * 3); this.sun = new Float32Array(n); this.mat = new Uint16Array(n);
  }
  /** its box, m (each splat's middle, widened by its biggest radius twice) */
  bounds(): [V3, V3] {
    const lo: V3 = [Infinity, Infinity, Infinity], hi: V3 = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < this.n; i++) {
      const r = 2 * Math.max(this.scale[i * 3], this.scale[i * 3 + 1], this.scale[i * 3 + 2]);
      for (let e = 0; e < 3; e++) { lo[e] = Math.min(lo[e], this.pos[i * 3 + e] - r); hi[e] = Math.max(hi[e], this.pos[i * 3 + e] + r); }
    }
    return this.n ? [lo, hi] : [[0, 0, 0], [0, 0, 0]];
  }
  /** Each one where it stands on the field at rest (carried by the field's moves: a scatter's points are kept inside them), its normal, whether the sun reaches it, its material: a decal's `point` for each. */
  points(): { p: V3; n: V3; sun: boolean; mat: string }[] {
    const mv = this.move?.(STILL) ?? ((_: number, p: V3) => p);
    return Array.from({ length: this.n }, (_, i) => {
      const q: V3 = [this.pos[i * 3], this.pos[i * 3 + 1], this.pos[i * 3 + 2]], nn: V3 = [this.normal[i * 3], this.normal[i * 3 + 1], this.normal[i * 3 + 2]];
      const p = mv(i, q), t = mv(i, [q[0] + nn[0] * 0.01, q[1] + nn[1] * 0.01, q[2] + nn[2] * 0.01]);
      return { p, n: unit([t[0] - p[0], t[1] - p[1], t[2] - p[2]]), sun: this.sun[i] > 0, mat: this.mats[this.mat[i]] };
    });
  }
}

const unit = (v: number[]): V3 => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
/** The turn taking the z axis to n, as a quaternion (w, x, y, z). */
function toward(n: V3): [number, number, number, number] {
  const c = n[2];
  if (c < -0.999999) return [0, 1, 0, 0];
  const w = Math.sqrt((1 + c) / 2), k = 1 / (2 * w);
  return [w, -n[1] * k, n[0] * k, 0];
}
/** The default light, in the world: the upper left, a little toward the viewer. */
export const SPLAT_LIGHT: V3 = unit([-0.65, -0.35, 0.68]);

/**
 * Splats from a field's surface or a density's inside, `spacing` m apart (jittered by `seed`): a
 * surface's flat discs `size` m across their plane (a std dev; default 0.6 of the spacing, so they
 * overlap), a sixth of that thick; a density's round blobs, as opaque as it is dense. `light`: the
 * way to the sun, whose shadow each one remembers.
 */
export function makeSplats(thing: unknown, o: { spacing?: number; size?: number; seed?: number; light?: number[]; clock?: Clock; thickness?: number } = {}): Splats {
  // (the same splats, the same key: its defaults filled in)
  const c = o.clock ?? STILL, L = Array.isArray(o.light) && o.light.every(Number.isFinite) ? unit(o.light) : o.light ?? SPLAT_LIGHT, sp = o.spacing ?? (thing instanceof Sdf ? 0.05 : 0.1);
  return once(thing, `s|${sp}|${o.size ?? sp * 0.6}|${o.seed ?? 1}|${L}|${o.thickness}|${c.t}|${c.phase}|${c.frame}|${c.frames}`, () => makeSplatsNow(thing, o));
}
function makeSplatsNow(thing: unknown, o: { spacing?: number; size?: number; seed?: number; light?: number[]; clock?: Clock; thickness?: number }): Splats {
  const clock = o.clock ?? STILL, seed = o.seed ?? 1, L = o.light ? unit(o.light) : SPLAT_LIGHT;
  if (o.light !== undefined && !(Array.isArray(o.light) && o.light.length === 3 && o.light.every(Number.isFinite))) throw new PxError(`sdf.splats: light is the way toward it, [x, y, z], got ${JSON.stringify(o.light)}`);
  const surface = thing instanceof Sdf;
  if (!surface && !(thing instanceof Density)) throw new PxError(`sdf.splats(field or density, { spacing, size, seed, light }) is made from a distance field (its surface) or a density (its inside)${thing && typeof thing === "object" && "kind" in thing ? `, not ${article((thing as { kind: string }).kind)}` : ""}`);
  const sp = o.spacing ?? (surface ? 0.05 : 0.1);
  sizeOf(sp, "sdf.splats' spacing");
  const size = o.size ?? sp * 0.6;
  if (!(size > 0)) throw new PxError(`sdf.splats: size is a splat's radius in m (a std dev), above 0, got ${JSON.stringify(o.size)}`);
  const out: { p: V3; n: V3; m: number; a: number; sun: number }[] = [];
  const jit = (i: number, j: number, k: number, e: number) => (hash(i * 3 + e, j * 7 + k * 131, seed) / 4294967296 - 0.5) * sp;
  let mats: string[], lo: V3, hi: V3;
  if (surface) {
    const C = compile(thing, clock);
    if (![...C.lo, ...C.hi].every(Number.isFinite)) throw new PxError("sdf.splats: the field goes on without end (a plane): intersect it with something that ends");
    mats = [...C.mats]; lo = C.lo; hi = C.hi;
    const d = C.d, h = sp * 0.1;
    const grad = (x: number, y: number, z: number): V3 => {
      const a = d(x + h, y - h, z - h), b = d(x - h, y - h, z + h), c = d(x - h, y + h, z - h), e = d(x + h, y + h, z + h);
      return unit([a - b - c + e, -a - b + c + e, -a + b - c + e]);
    };
    // the light reaching a point off the surface: a march toward the sun
    const lip = C.lip * 1.05, shut = (x: number, y: number, z: number) => {
      const s = slab([x, y, z], L, C.lo, C.hi);
      if (!s) return false;
      for (let t = Math.max(0, s[0]), i = 0; i < 120 && t <= s[1]; i++) { const v = d(x + L[0] * t, y + L[1] * t, z + L[2] * t); if (v < sp * 0.1) return true; t += Math.max(v / lip, sp * 0.05); }
      return false;
    };
    const n = lo.map((v, e) => Math.ceil((hi[e] - v) / sp) + 1);
    for (let k = 0; k < n[2]; k++) for (let j = 0; j < n[1]; j++) for (let i = 0; i < n[0]; i++) {
      let x = lo[0] + i * sp, y = lo[1] + j * sp, z = lo[2] + k * sp;
      if (Math.abs(d(x, y, z)) > sp * 0.9) continue;
      x += jit(i, j, k, 0); y += jit(i, j, k, 1); z += jit(i, j, k, 2);
      // onto the surface along its slope, twice
      for (let it = 0; it < 2; it++) { const v = d(x, y, z), g = grad(x, y, z); x -= g[0] * v; y -= g[1] * v; z -= g[2] * v; }
      if (Math.abs(d(x, y, z)) > sp * 0.25) continue;
      const g = grad(x, y, z), m = C.m(x, y, z, g[0], g[1], g[2]), lit = g[0] * L[0] + g[1] * L[1] + g[2] * L[2] > 0 && !shut(x + g[0] * sp * 0.3, y + g[1] * sp * 0.3, z + g[2] * sp * 0.3);
      out.push({ p: [x, y, z], n: g, m, a: 0.92, sun: lit ? 1 : 0 });
    }
  } else {
    const D = compileDensity(thing as Density, clock), th = o.thickness ?? 3;
    mats = [""]; lo = D.lo; hi = D.hi;
    const n = lo.map((v, e) => Math.ceil((hi[e] - v) / sp) + 1);
    for (let k = 0; k < n[2]; k++) for (let j = 0; j < n[1]; j++) for (let i = 0; i < n[0]; i++) {
      const x = lo[0] + i * sp + jit(i, j, k, 0), y = lo[1] + j * sp + jit(i, j, k, 1), z = lo[2] + k * sp + jit(i, j, k, 2), r = D.rho(x, y, z);
      if (r < 0.05) continue;
      // the light getting in: what it passes through toward the sun (forward scattering, as volume()'s)
      let s = 0;
      for (let t = sp; t < 4; t += sp) { const px = x + L[0] * t, py = y + L[1] * t, pz = z + L[2] * t; if (px < lo[0] || py < lo[1] || pz < lo[2] || px > hi[0] || py > hi[1] || pz > hi[2]) break; s += D.rho(px, py, pz); }
      out.push({ p: [x, y, z], n: [0, 0, 0], m: -1, a: Math.min(0.9, r * 0.45), sun: Math.exp(-0.4 * th * s * sp) });
    }
  }
  const none = mats.length;
  if (out.some((s) => s.m < 0)) mats.push("");
  const S = new Splats(out.length, mats);
  out.forEach((s, i) => {
    S.pos.set(s.p, i * 3); S.normal.set(s.n, i * 3);
    S.scale.set(surface ? [size, size, size / 6] : [size, size, size], i * 3);
    S.rot.set(surface ? toward(s.n) : [1, 0, 0, 0], i * 4);
    S.opacity[i] = s.a; S.sun[i] = s.sun; S.mat[i] = s.m < 0 ? none : s.m;
  });
  return S;
}

/** A splat's light, 0..1: a disc by how it faces the light, the sun reaching it and the sky; a blob by the light getting in. */
export function splatLight(S: Splats, i: number, L: V3, ambient = 0.35): number {
  const nx = S.normal[i * 3], ny = S.normal[i * 3 + 1], nz = S.normal[i * 3 + 2];
  if (!nx && !ny && !nz) return ambient + (1 - ambient) * S.sun[i];
  return 0.1 + 0.65 * Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]) * S.sun[i] + 0.2 * (0.5 + 0.5 * nz);
}

/** Standard real spherical harmonic constants used by 3D Gaussian Splatting (degrees 0..3). */
const SH_C0 = 0.28209479177387814;
const SH_C1 = 0.4886025119029199;
const SH_C2 = [1.0925484305920792, -1.0925484305920792, 0.31539156525252005, -1.0925484305920792, 0.5462742152960396];
const SH_C3 = [-0.5900435899266435, 2.890611442640554, -0.4570457994644658, 0.3731763325901154, -0.4570457994644658, 1.445305721320277, -0.5900435899266435];

/**
 * Evaluate a 3DGS splat's view-dependent sRGB color [r, g, b] in [0, 1] from its SH DC and optional
 * higher-order `f_rest_*` coefficients (degrees 1..3), given unit viewing direction `dir` (camera -> splat) in pxl Z-up.
 */
export function evalSplatColor(S: Splats, i: number, dir: V3): [number, number, number] {
  const dc = S.dc;
  if (!dc) return [0.5, 0.5, 0.5];
  let r = 0.5 + SH_C0 * dc[i * 3];
  let g = 0.5 + SH_C0 * dc[i * 3 + 1];
  let b = 0.5 + SH_C0 * dc[i * 3 + 2];
  const deg = S.shDeg ?? 0, rest = S.shRest;
  if (deg > 0 && rest) {
    // Convert pxl Z-up viewing direction into Y-up if the PLY was trained in standard Y-up coordinates
    const x = dir[0], y = S.shYup ? dir[2] : dir[1], z = S.shYup ? -dir[1] : dir[2];
    const K = (deg + 1) * (deg + 1) - 1;
    const base = i * 3 * K;
    const addChan = (cOff: number): number => {
      let v = SH_C1 * (-y * rest[cOff] + z * rest[cOff + 1] - x * rest[cOff + 2]);
      if (deg >= 2) {
        const xx = x * x, yy = y * y, zz = z * z, xy = x * y, yz = y * z, xz = x * z;
        v += SH_C2[0] * xy * rest[cOff + 3]
          + SH_C2[1] * yz * rest[cOff + 4]
          + SH_C2[2] * (2 * zz - xx - yy) * rest[cOff + 5]
          + SH_C2[3] * xz * rest[cOff + 6]
          + SH_C2[4] * (xx - yy) * rest[cOff + 7];
        if (deg >= 3) {
          v += SH_C3[0] * y * (3 * xx - yy) * rest[cOff + 8]
            + SH_C3[1] * xy * z * rest[cOff + 9]
            + SH_C3[2] * y * (4 * zz - xx - yy) * rest[cOff + 10]
            + SH_C3[3] * z * (2 * zz - 3 * xx - 3 * yy) * rest[cOff + 11]
            + SH_C3[4] * x * (4 * zz - xx - yy) * rest[cOff + 12]
            + SH_C3[5] * z * (xx - yy) * rest[cOff + 13]
            + SH_C3[6] * x * (xx - 3 * yy) * rest[cOff + 14];
        }
      }
      return v;
    };
    r += addChan(base);
    g += addChan(base + K);
    b += addChan(base + 2 * K);
  }
  return [Math.max(0, Math.min(1, r)), Math.max(0, Math.min(1, g)), Math.max(0, Math.min(1, b))];
}

export interface SplatOpts {
  view?: SurfaceView; ppm?: number; at?: number[];
  /** given a field or a density: made into splats this far apart now (and size, seed: sdf.splats's) */
  spacing?: number; size?: number; seed?: number;
  /** each material's ramp dark to light (what has none takes the first); or one ramp for all */
  mats?: Record<string, string | string[] | { ramp: string | string[] }>; ramp?: string | string[];
  light?: number[];
  /** where it is thin: "dither" (default), "cut" (solid past half), or "alpha" */
  blend?: "dither" | "cut" | "alpha";
  /** the darkest tone on the solid contour away from the light (default true) */
  outline?: boolean;
  /** cast ground shadows from opaque splats onto z = floor (true, a color key, or { color?, floor?, opacity? }) */
  cast?: boolean | string | { color?: string; floor?: number | "min"; opacity?: number };
  /** for imported 3DGS .ply splats: snap SH RGB to the active palette (default true; false keeps true RGB) */
  palette?: boolean;
  pixel?: number;
  /** the name of the part they are (pxl steps --at) */
  part?: string;
}
export const SPLAT_OPTS = ["view", "ppm", "at", "spacing", "size", "seed", "mats", "ramp", "light", "blend", "outline", "cast", "palette", "pixel", "part"];
/** A brush's cells (scatter.ts's BRUSH_CELLS, by its code): [dx, dy, a step along the ramp]. */
const CELLS: number[][][] = [[], [[0, 0, 0]], [[0, 0, 1], [1, 0, 0], [0, 1, 0], [1, 1, -1]], [[0, -1, 1], [-1, 0, 0], [0, 0, 0], [1, 0, -1], [0, 1, -1]], [[0, 0, -1], [0, -1, 0], [0, -2, 1]], [[0, -1, 1], [1, -1, 0], [-1, 0, 1], [0, 0, 0], [1, 0, 0], [-1, 1, 0], [0, 1, -1], [1, 1, -1]]];

/** Draw splats on the canvas (see the top of this file). */
export function drawSplats(c: SurfaceCanvas, set: unknown, o: SplatOpts = {}): void {
  const who = "splats";
  if (set instanceof Sdf || set instanceof Density) set = makeSplats(set, { spacing: o.spacing, size: o.size, seed: o.seed, light: o.light, clock: clockOf(c) });
  else if (o.spacing !== undefined || o.size !== undefined || o.seed !== undefined) throw new PxError(`${who}: spacing, size and seed are for a field or a density made splats here; a set has them`);
  if (!(set instanceof Splats)) throw new PxError(`splats(set, opts) draws splats (sdf.splats(field or density, { spacing })), or a field or a density with { spacing }${set && typeof set === "object" && "kind" in set ? `, not ${article((set as { kind: string }).kind)}` : ""}`);
  // (details scattered on a form: solid where gathered, no outline of their own, as a painter's dabs)
  const S = set, persp = !!o.view && typeof o.view === "object" && "horizon" in o.view, K = o.pixel ?? c.k ?? 1, blend = o.blend ?? (S.brush ? "cut" : "dither"), outline = o.outline ?? !S.brush;
  if (!(Number.isInteger(K) && K >= 1)) throw new PxError(`${who}: pixel is px to a cell, a whole number from 1, got ${JSON.stringify(o.pixel)}`);
  if (!["dither", "cut", "alpha"].includes(blend)) throw new PxError(`${who}: blend is "dither", "cut" or "alpha", got ${JSON.stringify(o.blend)}`);
  const origin = !persp && o.view && typeof o.view === "object" ? (o.view as { origin?: unknown }).origin : undefined;
  // its materials' ramps (not required when rendering SH-colored imported .ply splats without explicit mats/ramp)
  const useShColor = !!S.dc && !o.mats && !o.ramp;
  const keys = (spec: unknown, what: string): Color[] => {
    const r = spec && typeof spec === "object" && !Array.isArray(spec) ? (spec as { ramp?: unknown }).ramp : spec, ks = typeof r === "string" ? [...r] : r;
    if (!Array.isArray(ks) || !ks.length) throw new PxError(`${who}: ${what} is a ramp of keys dark to light, got ${JSON.stringify(spec)}`);
    return ks.map((k) => { const col = c.color(k); if (col === null || col === TRANSPARENT) throw new PxError(`${who}: ${what}: '${k}' is not a color`); return col; });
  };
  const names = Object.keys(o.mats ?? {});
  const ramps = useShColor
    ? [[pack(0, 0, 0), pack(255, 255, 255)]]
    : o.mats ? names.map((n) => keys(o.mats![n], `material '${n}'`)) : [keys(o.ramp ?? c.pal.ramps[0], "ramp")];
  const missing = S.mats.filter((m) => m && o.mats && !names.includes(m));
  if (missing.length) throw new PxError(`${who}: the splats' material ${missing.map((m) => `'${m}'`).join(", ")} is not in mats (it has: ${names.join(", ")})`);
  const matOf = S.mats.map((m) => (o.mats ? Math.max(0, names.indexOf(m)) : 0)), M = ramps.length;
  if (!S.n) return;
  // where each is now: carried by its form's moves, fluttering (a scatter), or where it was made
  let P = S.pos;
  if (S.move) {
    const mv = S.move(clockOf(c));
    P = new Float32Array(S.n * 3);
    for (let i = 0; i < S.n; i++) P.set(mv(i, [S.pos[i * 3], S.pos[i * 3 + 1], S.pos[i * 3 + 2]]), i * 3);
  }
  const lo: V3 = [Infinity, Infinity, Infinity], hi: V3 = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < S.n; i++) { const r = 2 * Math.max(S.scale[i * 3], S.scale[i * 3 + 1], S.scale[i * 3 + 2]); for (let e = 0; e < 3; e++) { lo[e] = Math.min(lo[e], P[i * 3 + e] - r); hi[e] = Math.max(hi[e], P[i * 3 + e] + r); } }
  const cam = viewOf(c, o as never, lo, hi, undefined, who, persp, K, origin), { W, H, x0, y0, axisDepth, toScreen, L, lx, ly, F, eye } = cam;

  // each splat on the picture: its middle, its depth, its ellipse (the covariance through the camera's
  // slope there, a third of a cell added so none falls between cells), in cells
  const n = S.n, cx = new Float32Array(n), cy = new Float32Array(n), dep = new Float32Array(n), conic = new Float32Array(n * 3), rad = new Float32Array(n), tone = new Float32Array(n);
  const shRgb = S.dc ? new Float32Array(n * 3) : undefined;
  const keep: number[] = [], brushes: number[] = [], lean = new Int8Array(n);
  for (let i = 0; i < n; i++) {
    const p: V3 = [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]], q = toScreen(p);
    if (!q) continue;
    const hh = Math.max(1e-3, S.scale[i * 3]) * 0.5, J: number[][] = [];
    let ok = true;
    for (let e = 0; e < 3; e++) { const pp = [...p] as V3; pp[e] += hh; const r = toScreen(pp); if (!r) { ok = false; break; } J.push([(r[0] - q[0]) / hh / K, (r[1] - q[1]) / hh / K]); }
    if (!ok) continue;
    // its covariance: R diag(s^2) R^T, from its quaternion
    const [w, x, y, z] = [S.rot[i * 4], S.rot[i * 4 + 1], S.rot[i * 4 + 2], S.rot[i * 4 + 3]];
    const Rm = [1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y), 2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x), 2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y)];
    const s2 = [S.scale[i * 3] ** 2, S.scale[i * 3 + 1] ** 2, S.scale[i * 3 + 2] ** 2];
    const Sg = (a: number, b: number) => Rm[a * 3] * Rm[b * 3] * s2[0] + Rm[a * 3 + 1] * Rm[b * 3 + 1] * s2[1] + Rm[a * 3 + 2] * Rm[b * 3 + 2] * s2[2];
    let A = 0.3, B = 0, Cc = 0.3;
    for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) { const sg = Sg(a, b); A += J[a][0] * sg * J[b][0]; B += J[a][0] * sg * J[b][1]; Cc += J[a][1] * sg * J[b][1]; }
    const det = A * Cc - B * B;
    if (!(det > 1e-9)) continue;
    conic[i * 3] = Cc / det; conic[i * 3 + 1] = -B / det; conic[i * 3 + 2] = A / det;
    const mid = (A + Cc) / 2, l1 = mid + Math.sqrt(Math.max(0.01, mid * mid - det));
    rad[i] = Math.ceil(3 * Math.sqrt(l1));
    cx[i] = q[0] / K; cy[i] = q[1] / K; dep[i] = axisDepth(p);
    if (shRgb) {
      const vdir: V3 = persp && eye ? unit([p[0] - eye[0], p[1] - eye[1], p[2] - eye[2]]) : F;
      const [sr, sg, sb] = evalSplatColor(S, i, vdir);
      shRgb[i * 3] = sr; shRgb[i * 3 + 1] = sg; shRgb[i * 3 + 2] = sb;
      tone[i] = 0.2126 * sr + 0.7152 * sg + 0.0722 * sb;
    } else {
      tone[i] = splatLight(S, i, L);
    }
    // a detail smaller than a few cells: a pixel-art brush, not an ellipse
    if (S.brush?.[i] && Math.sqrt(l1) < 2) {
      brushes.push(i);
      // a blade leans the way its axis goes on the picture
      const zx = 2 * (x * z + w * y), zy = 2 * (y * z - w * x), zz = 1 - 2 * (x * x + y * y), sx = J[0][0] * zx + J[1][0] * zy + J[2][0] * zz, sy = J[0][1] * zx + J[1][1] * zy + J[2][1] * zz;
      lean[i] = Math.abs(sx) > 0.4 * Math.abs(sy) ? Math.sign(sx) : 0;
    } else keep.push(i);
  }
  keep.sort((a, b) => dep[a] - dep[b]);

  // the cells: gather each splat's opacity, the nearest first, until a cell is full (3DGS's blending)
  const gx0 = Math.floor(x0 / K), gy0 = Math.floor(y0 / K), GW = Math.ceil((x0 + W) / K) - gx0, GH = Math.ceil((y0 + H) / K) - gy0;
  const N = GW * GH, T = new Float32Array(N).fill(1), lt = new Float32Array(N), mw = new Float32Array(N * M), front = new Float32Array(N).fill(Infinity), vis = c.img.depth;
  const accR = useShColor ? new Float32Array(N) : undefined, accG = useShColor ? new Float32Array(N) : undefined, accB = useShColor ? new Float32Array(N) : undefined;
  const behind = new Float32Array(N).fill(Infinity);
  if (vis) for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) { const q = c.index((gx0 + gx) * K, (gy0 + gy) * K); if (q >= 0) behind[gy * GW + gx] = vis[q]; }
  for (const i of keep) {
    const ux = cx[i] - gx0, uy = cy[i] - gy0, r = rad[i], a0 = S.opacity[i], k0 = conic[i * 3], k1 = conic[i * 3 + 1], k2 = conic[i * 3 + 2], mi = matOf[S.mat[i]];
    for (let gy = Math.max(0, Math.floor(uy - r)); gy <= Math.min(GH - 1, Math.ceil(uy + r)); gy++)
      for (let gx = Math.max(0, Math.floor(ux - r)); gx <= Math.min(GW - 1, Math.ceil(ux + r)); gx++) {
        const j = gy * GW + gx;
        if (T[j] < 0.01 || dep[i] > behind[j]) continue;
        const dx = gx + 0.5 - ux, dy = gy + 0.5 - uy, a = Math.min(0.99, a0 * Math.exp(-0.5 * (k0 * dx * dx + 2 * k1 * dx * dy + k2 * dy * dy)));
        if (a < 1 / 255) continue;
        const wgt = T[j] * a;
        if (accR && shRgb) { accR[j] += wgt * shRgb[i * 3]; accG![j] += wgt * shRgb[i * 3 + 1]; accB![j] += wgt * shRgb[i * 3 + 2]; }
        lt[j] += wgt * tone[i]; mw[j * M + mi] += wgt;
        T[j] -= wgt;
        if (T[j] < 0.5 && front[j] === Infinity) front[j] = dep[i];
      }
  }
  // each cell: its material (the one gathered most), its tone along that ramp, in clusters
  const mat = new Int16Array(N).fill(-1), tn = new Int8Array(N), al = new Float32Array(N);
  const shCol = useShColor ? new Uint32Array(N) : undefined;
  const palList = useShColor ? (c.pal.chosen().length ? c.pal.chosen() : [...c.pal.list]) : [];
  const palLab = palList.map((col) => oklab(col));
  const nearCache = new Map<number, Color>();
  const nearestPal = (raw: Color): Color => {
    if (!palList.length) return raw;
    const hit = nearCache.get(raw);
    if (hit !== undefined) return hit;
    const [L, a, b] = oklab(raw);
    let best = palList[0], bd = Infinity;
    for (let k = 0; k < palList.length; k++) {
      const p = palLab[k], d = (L - p[0]) ** 2 + (a - p[1]) ** 2 + (b - p[2]) ** 2;
      if (d < bd) { bd = d; best = palList[k]; }
    }
    if (nearCache.size < 4096) nearCache.set(raw, best);
    return best;
  };
  for (let j = 0; j < N; j++) {
    const A = 1 - T[j];
    if (A < 0.02) continue;
    let best = 0;
    for (let m = 1; m < M; m++) if (mw[j * M + m] > mw[j * M + best]) best = m;
    mat[j] = best; al[j] = A;
    if (shCol && accR) {
      const raw = pack(Math.round((accR[j] / A) * 255), Math.round((accG![j] / A) * 255), Math.round((accB![j] / A) * 255));
      shCol[j] = o.palette === false ? raw : nearestPal(raw);
    } else {
      tn[j] = Math.max(0, Math.min(ramps[best].length - 1, Math.round((lt[j] / A) * (ramps[best].length - 1))));
    }
  }
  if (!useShColor) {
    const was = tn.slice();
    for (let gy = 1; gy < GH - 1; gy++)
      for (let gx = 1; gx < GW - 1; gx++) {
        const i = gy * GW + gx, k = mat[i];
        if (k < 0) continue;
        const nb = [i - 1, i + 1, i - GW, i + GW].filter((j) => mat[j] === k).map((j) => was[j]);
        if (nb.length < 3 || nb.includes(was[i])) continue;
        const best = nb.find((v) => nb.filter((u) => u === v).length >= 3) ?? (nb.length === 4 && nb.filter((u) => u === nb[0]).length === 2 ? nb[0] : undefined);
        if (best !== undefined) tn[i] = best;
      }
  }
  // the brushes: each cell of each, nearer than what is there (and than the other brushes), in its tone
  // along its ramp (its light, its own step, the brush's shading)
  const bz = new Float32Array(N).fill(Infinity), bcol = new Uint32Array(N);
  for (const i of brushes) {
    const ramp = ramps[matOf[S.mat[i]]], base = Math.round(tone[i] * (ramp.length - 1)) + (S.shift?.[i] ?? 0), ux = Math.floor(cx[i]) - gx0, uy = Math.floor(cy[i]) - gy0;
    for (const [dx, dy, dt] of CELLS[S.brush![i]] ?? CELLS[1]) {
      const gx = ux + dx + (S.brush![i] === 4 && dy < -1 ? lean[i] : 0), gy = uy + dy;
      if (gx < 0 || gy < 0 || gx >= GW || gy >= GH) continue;
      const j = gy * GW + gx;
      if (dep[i] >= bz[j] || dep[i] > behind[j]) continue;
      bz[j] = dep[i];
      // (never the ramp's darkest, the outline's: a clump in shade is dark, not a hole)
      bcol[j] = ramp[Math.max(ramp.length > 3 ? 1 : 0, Math.min(ramp.length - 1, base + dt))];
    }
  }
  // on the picture: thin, dithered (or cut, or laid over); the solid contour away from the light outlined
  const shown = (j: number, gx: number, gy: number) => mat[j] >= 0 && (blend === "alpha" ? true : blend === "cut" ? al[j] > 0.5 : al[j] > 0.2 + 0.6 * bayer(gx0 + gx, gy0 + gy));
  const on = new Uint8Array(N);
  for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) { const j = gy * GW + gx; if (shown(j, gx, gy)) on[j] = 1; }
  // Optional ground cast shadows from opaque splats projected along -L onto z = floor
  if (o.cast && L[2] > 0.05) {
    const cfg = typeof o.cast === "object" ? o.cast : typeof o.cast === "string" ? { color: o.cast } : {};
    const floorZ = cfg.floor === "min" ? lo[2] : (cfg.floor ?? 0);
    const shColor = cfg.color !== undefined ? c.color(cfg.color) : null;
    if (cfg.color !== undefined && (shColor === null || shColor === TRANSPARENT))
      throw new PxError(`${who}: cast color '${cfg.color}' is not a visible color`);
    const shOp = cfg.opacity ?? 0.45;
    const stepDown = shColor === null ? c.pal.stepMap(-1) : undefined;
    const shBuf = new Float32Array(N);
    for (let i = 0; i < n; i++) {
      if (S.opacity[i] < 0.25) continue;
      const pz = P[i * 3 + 2];
      const tHit = (pz - floorZ) / L[2];
      if (!(tHit > 0.01)) continue;
      const sx = P[i * 3] - L[0] * tHit, sy = P[i * 3 + 1] - L[1] * tHit;
      const gp = toScreen([sx, sy, floorZ]);
      if (!gp) continue;
      const sRad = Math.max(S.scale[i * 3], S.scale[i * 3 + 1], S.scale[i * 3 + 2]);
      const gp2 = toScreen([sx + sRad, sy, floorZ]);
      const rCell = Math.max(1, Math.min(24, Math.ceil((gp2 ? Math.hypot(gp2[0] - gp[0], gp2[1] - gp[1]) : sRad * 16) * 1.4 / K)));
      const scx = gp[0] / K - gx0, scy = gp[1] / K - gy0;
      for (let gy = Math.max(0, Math.floor(scy - rCell)); gy <= Math.min(GH - 1, Math.ceil(scy + rCell)); gy++)
        for (let gx = Math.max(0, Math.floor(scx - rCell)); gx <= Math.min(GW - 1, Math.ceil(scx + rCell)); gx++) {
          const d2 = ((gx + 0.5 - scx) ** 2 + (gy + 0.5 - scy) ** 2) / (rCell * rCell);
          if (d2 > 1) continue;
          const j = gy * GW + gx;
          shBuf[j] = Math.min(1, shBuf[j] + S.opacity[i] * Math.exp(-2 * d2));
        }
    }
    const shadowDark = shColor ?? pack(20, 20, 32);
    for (let gy = 0; gy < GH; gy++)
      for (let gx = 0; gx < GW; gx++) {
        const j = gy * GW + gx;
        if (on[j] || bcol[j] || shBuf[j] < 0.25) continue;
        if (blend === "dither" && shBuf[j] < 0.35 + 0.45 * bayer(gx0 + gx, gy0 + gy)) continue;
        for (let y = 0; y < K; y++)
          for (let x = 0; x < K; x++) {
            const px = (gx0 + gx) * K + x, py = (gy0 + gy) * K + y, q = c.index(px, py);
            if (q < 0) continue;
            const under = c.img.data[q];
            if (shColor !== null) c.plot(px, py, under === TRANSPARENT || cfg.opacity === undefined || cfg.opacity >= 1 ? shColor : mixRgb(under, shColor, cfg.opacity));
            else if (under !== TRANSPARENT) c.plot(px, py, stepDown?.get(under) ?? mixRgb(under, shadowDark, shOp));
            else c.plot(px, py, (((shadowDark & ~255) | Math.round(shOp * 255)) >>> 0));
          }
      }
  }
  const zbuf = (c.img.depth ??= new Float32Array(W * H).fill(Infinity)), pk = o.part !== undefined ? partIndex(c.img, o.part) : -1;
  const darkCol = nearestPal(pack(16, 14, 24));
  for (let gy = 0; gy < GH; gy++)
    for (let gx = 0; gx < GW; gx++) {
      const j = gy * GW + gx;
      // a brush in front of what the ellipses gathered (or where they left nothing)
      if (bcol[j] && (!on[j] || bz[j] <= front[j])) {
        for (let y = 0; y < K; y++)
          for (let x = 0; x < K; x++) {
            const px = (gx0 + gx) * K + x, py = (gy0 + gy) * K + y, q = c.index(px, py);
            if (q < 0 || !c.plot(px, py, bcol[j])) continue;
            zbuf[q] = Math.min(zbuf[q], bz[j]);
            if (pk >= 0) c.img.parts!.ids[q] = pk;
          }
        continue;
      }
      if (!on[j]) continue;
      const ramp = ramps[mat[j]];
      let col = shCol ? shCol[j] : ramp[tn[j]];
      if (outline && al[j] > 0.6) {
        const open = (x: number, y: number) => x < 0 || y < 0 || x >= GW || y >= GH || !on[y * GW + x];
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (open(gx + dx, gy + dy) && dx * lx + dy * ly < 0 && !open(gx - dx, gy - dy)) { col = shCol ? darkCol : ramp[0]; break; }
      }
      for (let y = 0; y < K; y++)
        for (let x = 0; x < K; x++) {
          const px = (gx0 + gx) * K + x, py = (gy0 + gy) * K + y, q = c.index(px, py);
          if (q < 0) continue;
          if (blend === "alpha") {
            const u = c.img.data[q], k = al[j];
            c.plot(px, py, u === TRANSPARENT ? (((col & ~255) | Math.round(k * 255)) >>> 0) : mixRgb(u, col, k));
          } else c.plot(px, py, col);
          if (front[j] < Infinity && al[j] > 0.5) zbuf[q] = Math.min(zbuf[q], front[j]);
          if (pk >= 0) c.img.parts!.ids[q] = pk;
        }
    }
}
const mixRgb = (u: Color, c: Color, k: number): Color => {
  const m = (sh: number) => Math.round(((u >>> sh) & 255) * (1 - k) + ((c >>> sh) & 255) * k);
  return ((m(24) << 24) | (m(16) << 16) | (m(8) << 8) | (u & 255)) >>> 0;
};
