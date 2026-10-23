// Procedural Gaussian splats (experimental): a field's surface as flat discs lying along it (each
// oriented by the normal there, of the material there, its sun seen or not), a density's inside as round
// blobs (opaque as it is dense, lit as the light gets in). Not a trained radiance field: what the field
// says, laid as splats. Drawn by a CPU rasterizer to pixel art: each splat's ellipse on the picture (its
// covariance carried through the camera, EWA), the nearest first, their opacity gathered until a pixel is
// full; then the gathered light snapped to the material's ramp in clusters, thin edges dithered, an
// outline on the side away from the light where it is solid. Written as a 3DGS .ply (files3d.ts).
import { type Color, TRANSPARENT } from "./color.ts";
import { PxError } from "./errors.ts";
import { sizeOf } from "./grids.ts";
import { type Clock, Density, STILL, Sdf, type V3, article, compile, compileDensity } from "./sdf.ts";
import { type SurfaceCanvas, type SurfaceView, clockOf, slab, viewOf } from "./surface.ts";
import { bayer, hash } from "./util.ts";

/** A set of splats: for each, where (m), its three radii (std devs, m) along its own axes, its turn (quaternion w, x, y, z), opacity, normal (0 for a round one), how much sun reaches it, its material. */
export class Splats {
  readonly kind = "splats";
  readonly n: number;
  readonly pos: Float32Array; readonly scale: Float32Array; readonly rot: Float32Array; readonly opacity: Float32Array;
  readonly normal: Float32Array; readonly sun: Float32Array; readonly mat: Uint16Array; readonly mats: string[];
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
  pixel?: number;
}
export const SPLAT_OPTS = ["view", "ppm", "at", "spacing", "size", "seed", "mats", "ramp", "light", "blend", "outline", "pixel"];

/** Draw splats on the canvas (see the top of this file). */
export function drawSplats(c: SurfaceCanvas, set: unknown, o: SplatOpts = {}): void {
  const who = "splats";
  if (set instanceof Sdf || set instanceof Density) set = makeSplats(set, { spacing: o.spacing, size: o.size, seed: o.seed, light: o.light, clock: clockOf(c) });
  else if (o.spacing !== undefined || o.size !== undefined || o.seed !== undefined) throw new PxError(`${who}: spacing, size and seed are for a field or a density made splats here; a set has them`);
  if (!(set instanceof Splats)) throw new PxError(`splats(set, opts) draws splats (sdf.splats(field or density, { spacing })), or a field or a density with { spacing }${set && typeof set === "object" && "kind" in set ? `, not ${article((set as { kind: string }).kind)}` : ""}`);
  const S = set, persp = !!o.view && typeof o.view === "object" && "horizon" in o.view, K = o.pixel ?? 1, blend = o.blend ?? "dither";
  if (!(Number.isInteger(K) && K >= 1)) throw new PxError(`${who}: pixel is px to a cell, a whole number from 1, got ${JSON.stringify(o.pixel)}`);
  if (!["dither", "cut", "alpha"].includes(blend)) throw new PxError(`${who}: blend is "dither", "cut" or "alpha", got ${JSON.stringify(o.blend)}`);
  const origin = !persp && o.view && typeof o.view === "object" ? (o.view as { origin?: unknown }).origin : undefined;
  // its materials' ramps
  const keys = (spec: unknown, what: string): Color[] => {
    const r = spec && typeof spec === "object" && !Array.isArray(spec) ? (spec as { ramp?: unknown }).ramp : spec, ks = typeof r === "string" ? [...r] : r;
    if (!Array.isArray(ks) || !ks.length) throw new PxError(`${who}: ${what} is a ramp of keys dark to light, got ${JSON.stringify(spec)}`);
    return ks.map((k) => { const col = c.color(k); if (col === null || col === TRANSPARENT) throw new PxError(`${who}: ${what}: '${k}' is not a color`); return col; });
  };
  const names = Object.keys(o.mats ?? {}), ramps = o.mats ? names.map((n) => keys(o.mats![n], `material '${n}'`)) : [keys(o.ramp ?? c.pal.ramps[0], "ramp")];
  const missing = S.mats.filter((m) => m && o.mats && !names.includes(m));
  if (missing.length) throw new PxError(`${who}: the splats' material ${missing.map((m) => `'${m}'`).join(", ")} is not in mats (it has: ${names.join(", ")})`);
  const matOf = S.mats.map((m) => (o.mats ? Math.max(0, names.indexOf(m)) : 0)), M = ramps.length;
  if (!S.n) return;
  const [lo, hi] = S.bounds(), cam = viewOf(c, o as never, lo, hi, undefined, who, persp, K, origin), { W, H, x0, y0, axisDepth, toScreen, L, lx, ly } = cam;

  // each splat on the picture: its middle, its depth, its ellipse (the covariance through the camera's
  // slope there, a third of a cell added so none falls between cells), in cells
  const n = S.n, cx = new Float32Array(n), cy = new Float32Array(n), dep = new Float32Array(n), conic = new Float32Array(n * 3), rad = new Float32Array(n), tone = new Float32Array(n);
  const keep: number[] = [];
  for (let i = 0; i < n; i++) {
    const p: V3 = [S.pos[i * 3], S.pos[i * 3 + 1], S.pos[i * 3 + 2]], q = toScreen(p);
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
    tone[i] = splatLight(S, i, L);
    keep.push(i);
  }
  keep.sort((a, b) => dep[a] - dep[b]);

  // the cells: gather each splat's opacity, the nearest first, until a cell is full (3DGS's blending)
  const gx0 = Math.floor(x0 / K), gy0 = Math.floor(y0 / K), GW = Math.ceil((x0 + W) / K) - gx0, GH = Math.ceil((y0 + H) / K) - gy0;
  const N = GW * GH, T = new Float32Array(N).fill(1), lt = new Float32Array(N), mw = new Float32Array(N * M), front = new Float32Array(N).fill(Infinity), vis = c.img.depth;
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
        lt[j] += wgt * tone[i]; mw[j * M + mi] += wgt;
        T[j] -= wgt;
        if (T[j] < 0.5 && front[j] === Infinity) front[j] = dep[i];
      }
  }
  // each cell: its material (the one gathered most), its tone along that ramp, in clusters
  const mat = new Int16Array(N).fill(-1), tn = new Int8Array(N), al = new Float32Array(N);
  for (let j = 0; j < N; j++) {
    const A = 1 - T[j];
    if (A < 0.02) continue;
    let best = 0;
    for (let m = 1; m < M; m++) if (mw[j * M + m] > mw[j * M + best]) best = m;
    mat[j] = best; al[j] = A;
    tn[j] = Math.max(0, Math.min(ramps[best].length - 1, Math.round((lt[j] / A) * (ramps[best].length - 1))));
  }
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
  // on the picture: thin, dithered (or cut, or laid over); the solid contour away from the light outlined
  const shown = (j: number, gx: number, gy: number) => mat[j] >= 0 && (blend === "alpha" ? true : blend === "cut" ? al[j] > 0.5 : al[j] > 0.2 + 0.6 * bayer(gx0 + gx, gy0 + gy));
  const on = new Uint8Array(N);
  for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) { const j = gy * GW + gx; if (shown(j, gx, gy)) on[j] = 1; }
  const zbuf = (c.img.depth ??= new Float32Array(W * H).fill(Infinity));
  for (let gy = 0; gy < GH; gy++)
    for (let gx = 0; gx < GW; gx++) {
      const j = gy * GW + gx;
      if (!on[j]) continue;
      const ramp = ramps[mat[j]];
      let col = ramp[tn[j]];
      if (o.outline !== false && al[j] > 0.6) {
        const open = (x: number, y: number) => x < 0 || y < 0 || x >= GW || y >= GH || !on[y * GW + x];
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (open(gx + dx, gy + dy) && dx * lx + dy * ly < 0 && !open(gx - dx, gy - dy)) { col = ramp[0]; break; }
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
        }
    }
}
const mixRgb = (u: Color, c: Color, k: number): Color => {
  const m = (sh: number) => Math.round(((u >>> sh) & 255) * (1 - k) + ((c >>> sh) & 255) * k);
  return ((m(24) << 24) | (m(16) << 16) | (m(8) << 8) | (u & 255)) >>> 0;
};
