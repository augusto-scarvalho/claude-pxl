// A distance field's surface drawn as pixel art (sdf.ts): each pixel a ray marched to the surface
// (sphere tracing), its material's ramp stepped by the light (a sun, its shadows inside the field, a
// sky from above, the creases darker), so tones come in clusters; an outline on the contour away from
// the light and a lit rim on the side toward it, as the nature kit's volumes are drawn; the normals
// written for normals()/lighting()/mesh(), the depth for post(), what isn't there left clear. Seen
// through a view: from the side (3/4, 20 degrees down), from the top, in isometric 2:1, any of them
// turned (yaw), all orthographic, `ppm` px to the meter; or through a perspective() camera (mesh()'s),
// the field standing in its world `at` [x, z, up]: there it is drawn behind what is nearer the eye
// (the depth mesh() leaves), its shadow falls on what is drawn, and with `pixel: K` a ray to each
// K x K block, the size of a sprite's pixel in an HD picture. A voxel grid (grids.ts) is drawn the same
// way, its rays stepping cell to cell (voxels()); in iso and top it is laid on the pixel grid, a cube
// `px` wide drawn the same everywhere (2:1 iso: its top half as tall as it is wide, its sides as tall;
// top: a 3/4 view from above and in front, its top and its front face), a tone to each face.
import { type Color, LIN, TRANSPARENT, fromLinear } from "./color.ts";
import { PxError } from "./errors.ts";
import type { Img } from "./image.ts";
import { setNormal } from "./normals.ts";
import type { Palette } from "./palette.ts";
import { type Perspective, type View, perspective, scaled } from "./perspective.ts";
import { type Clock, type Compiled, Sdf, type V3, article, compile } from "./sdf.ts";
import { Voxels, sizeOf, voxelize } from "./grids.ts";
import { type Lit, shine } from "./sunlight.ts";

/** A view: a name, or { kind, yaw, pitch, origin, grid } (`origin`: where the world's [0, 0, 0] lands, px; with it `at` is [x, y, z] m; `grid`: on voxels' pixel grid), or a perspective() view. */
export type SurfaceView = "side" | "top" | "iso" | { kind?: "side" | "top" | "iso"; yaw?: number; pitch?: number; origin?: [number, number]; grid?: boolean } | View;
export interface SurfaceMat { ramp: string | string[]; shine?: number }
export interface SurfaceOpts {
  view?: SurfaceView;
  /** px to the meter (an orthographic view; default 16) */
  ppm?: number;
  /** an orthographic view: where the field's origin lands, [x, y] px (default the middle of the bottom edge, pivot "bottom"), or [x, y, z] m in the view's world (its `origin` where [0, 0, 0] lands), so things drawn on one canvas stand at their depths; through a camera: where it stands, [x, z, up] m */
  at?: number[];
  /** its materials' ramps, dark to light ("asdf" or keys), or { ramp, shine (a glint where the light reflects toward the eye, 0..1) }; what has no material takes the first */
  mats?: Record<string, string | string[] | SurfaceMat>;
  /** the way toward the light, [x, y, z] in the world (default the upper left, toward the viewer) */
  light?: number[];
  /** the contour away from the light: true (each material's darkest), a key, or false */
  outline?: boolean | string;
  /** the contour toward the light a step lighter (default true) */
  rim?: boolean;
  /** shadows the field casts on itself (default true) */
  shadows?: boolean;
  /** how much the creases darken, 0..1 (default 0.5) */
  ao?: number;
  /** through a camera: px to a ray, in blocks (an HD picture's sprite pixel) */
  pixel?: number;
  /** through a camera: its shadow on what is drawn, the share of light it takes (default 0.4; 0 none) */
  cast?: number;
  /** through a camera: nothing drawn but its shadow (a mesh made of it stands in its place) */
  hide?: boolean;
  /** the name of the part it is (pxl steps --at says what part painted a pixel; a field's own .part() names go after it) */
  part?: string;
  /** (light: "mesh": the light of the mesh() drawn before it, on what it draws as on mesh()'s sprites) */
  world?: Lit;
}
export const SURFACE_OPTS = ["view", "ppm", "at", "mats", "light", "outline", "rim", "shadows", "ao", "pixel", "cast", "hide", "part"];
/** The index of a part's name in the picture's list of what painted each pixel (see Img.parts). */
export function partIndex(img: Img, name: string): number {
  if (typeof name !== "string" || !name) throw new PxError(`part is a name, got ${JSON.stringify(name)}`);
  const P = (img.parts ??= { ids: new Int32Array(img.w * img.h).fill(-1), names: [] });
  const k = P.names.indexOf(name);
  return k >= 0 ? k : P.names.push(name) - 1;
}
/** voxels()'s: surface()'s (ao off unless given: the creases a cube face's corners make), and a cell's `size` (when it is given a field) and `px` (a cube's width on the picture) */
export interface VoxelOpts extends SurfaceOpts { size?: number | number[]; px?: number }
export const VOXEL_OPTS = ["size", "px", ...SURFACE_OPTS];
export interface SurfaceCanvas {
  img: Img;
  ox: number;
  oy: number;
  pal: Palette;
  t: number;
  frame: number;
  frames: number;
  color(k: unknown): Color | null;
  index(x: number, y: number): number;
  plot(x: number, y: number, c: Color): boolean;
  /** px to an art pixel (a scene's size): a camera's px k times, a ray to k x k px unless `pixel` says */
  k?: number;
}

const dot = (a: readonly number[], b: readonly number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = (a: readonly number[]): V3 => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const RAD = Math.PI / 180;
export const corners = (lo: V3, hi: V3): V3[] => [0, 1, 2, 3, 4, 5, 6, 7].map((i) => [i & 1 ? hi[0] : lo[0], i & 2 ? hi[1] : lo[1], i & 4 ? hi[2] : lo[2]]);

/** An orthographic camera: right, up and forward (into the picture) in the world, turned `yaw` right and tilted `pitch` down. */
export function orthoBasis(view: SurfaceView | undefined): { R: V3; U: V3; F: V3 } {
  const o = typeof view === "string" || view === undefined ? { kind: view ?? "side" } : (view as { kind?: string; yaw?: number; pitch?: number });
  const kind = o.kind ?? "side";
  if (!["side", "top", "iso"].includes(kind)) throw new PxError(`surface: view is "side", "top", "iso", { kind, yaw, pitch, origin } or a perspective() view ({ w, horizon, eye, ... }), got ${JSON.stringify(view)}`);
  const p = (o.pitch ?? (kind === "top" ? 90 : kind === "iso" ? 30 : 20)) * RAD, y = (o.yaw ?? (kind === "iso" ? 45 : 0)) * RAD;
  if (!(p > -Math.PI / 2 - 1e-9 && p <= Math.PI / 2 + 1e-9) || !Number.isFinite(y)) throw new PxError(`surface: pitch is degrees down, -90 to 90, yaw degrees turned right, got ${JSON.stringify(view)}`);
  // turned right by yaw about the upright: the camera's own axes, then turned
  const c = Math.cos(y), s = Math.sin(y), rot = (v: V3): V3 => [v[0] * c + v[1] * s, -v[0] * s + v[1] * c, v[2]];
  return { R: rot([1, 0, 0]), U: rot([0, Math.sin(p), Math.cos(p)]), F: rot([0, Math.cos(p), -Math.sin(p)]) };
}

/**
 * The size a sprite needs for a field (or a voxel grid) in an orthographic view, `pad` px round it, and
 * its pivot (where the origin lands): over `frames` moments of its loop. With `size` (a cell's, m) or
 * a grid, as voxels() draws it: iso and top on the pixel grid, `px` a cube's width.
 */
export function surfaceSize(thing: Sdf | Voxels, o: { view?: SurfaceView; ppm?: number; px?: number; size?: number | number[]; pad?: number; frames?: number } = {}): { w: number; h: number; pivot: [number, number] } {
  if (!(thing instanceof Sdf || thing instanceof Voxels)) throw new PxError("sdf.size(field or voxels, { view, ppm, px, size, pad, frames }): a distance field or a voxel grid");
  const pad = o.pad ?? 2, n = thing instanceof Voxels ? 1 : Math.max(1, Math.round(o.frames ?? 1));
  const cell = thing instanceof Voxels ? thing.size : o.size !== undefined ? sizeOf(o.size, "sdf.size") : undefined;
  const pr = projection(o.view, o.ppm, o.px, cell, "sdf.size");
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let f = 0; f < n; f++) {
    let lo: V3, hi: V3;
    if (thing instanceof Voxels) [lo, hi] = thing.bounds();
    else { const C = compile(thing, { t: 0, phase: f / n, frame: f, frames: n }); finite(C); ({ lo, hi } = C); }
    for (const p of corners(lo, hi)) {
      const sx = pr.grid ? dot(p, pr.a) : dot(p, pr.R) * pr.k, sy = pr.grid ? dot(p, pr.b) : -dot(p, pr.U) * pr.k;
      x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
    }
  }
  const L = Math.floor(x0) - pad, T = Math.floor(y0) - pad;
  return { w: Math.ceil(x1) + pad - L, h: Math.ceil(y1) + pad - T, pivot: [-L, -T] };
}
/**
 * An orthographic view as a parallel projection: a point p lands dot(p, a) px right and dot(p, b) px
 * down of where the origin does, seen along D (into the picture); R, U, F the camera's right, up and
 * forward (the light's default and the normals' frame), k its px to the meter. A field's views are
 * true orthographic (`ppm`); a voxel grid's iso and top (given its cell's size) are on the pixel grid,
 * a cube `px` wide.
 */
export function projection(view: SurfaceView | undefined, ppm: number | undefined, px: number | undefined, cell: V3 | undefined, who: string): { a: V3; b: V3; D: V3; R: V3; U: V3; F: V3; k: number; grid: boolean } {
  if (ppm !== undefined && px !== undefined) throw new PxError(`${who}: give ppm (px to the meter) or px (a cube's width), not both`);
  if ((ppm !== undefined && !(ppm > 0)) || (px !== undefined && !(px > 0))) throw new PxError(`${who}: ppm and px are above 0, got ${JSON.stringify(ppm ?? px)}`);
  const o = typeof view === "string" || view === undefined ? { kind: view ?? "side" } : (view as { kind?: string; yaw?: number; pitch?: number; grid?: boolean });
  const kind = o.kind ?? "side", plain = o.yaw === undefined && o.pitch === undefined;
  if (o.grid !== undefined && (typeof o.grid !== "boolean" || (o.grid && !plain))) throw new PxError(`${who}: grid (on voxels' pixel grid) is true or false, on a view without yaw or pitch, got ${JSON.stringify(view)}`);
  // a voxel grid's iso and top are on the pixel grid unless told not to; anything's side, iso or top when told to
  const grid = plain && (o.grid ?? (!!cell && (kind === "iso" || kind === "top")));
  if (grid) {
    const [sx, sy] = cell ?? [1, 1, 1], iso = kind === "iso", side = kind === "side", k = ppm ?? (cell ? (px ?? 4) / (iso ? sx + sy : sx) : 16);
    // iso: x up to the right, y up to the left (both away), z up, a meter k px across; top: x right, y
    // (away) and z up alike, a meter k px; side: x right, z up, y (away) a quarter as far up (a cube's
    // front and a sliver of its top)
    const a: V3 = iso ? [k, -k, 0] : [k, 0, 0], b: V3 = iso ? [-k / 2, -k / 2, -k] : side ? [0, -k / 4, -k] : [0, -k, -k], D = unit(iso ? [1, 1, -1] : side ? [0, 4, -1] : [0, 1, -1]);
    return { a, b, D, R: unit(a), U: unit([-b[0], -b[1], -b[2]]), F: D, k, grid };
  }
  const { R, U, F } = orthoBasis(view), k = ppm ?? (px !== undefined && cell ? px / cell[0] : 16);
  return { a: [R[0] * k, R[1] * k, R[2] * k], b: [-U[0] * k, -U[1] * k, -U[2] * k], D: F, R, U, F, k, grid };
}

function finite(C: Compiled) {
  if (![...C.lo, ...C.hi].every(Number.isFinite)) throw new PxError("surface: the field goes on without end (a plane): intersect it with something that ends (sdf.box(...).intersect(sdf.plane()))");
}

/** Where a ray o + d t enters and leaves a box, or null. */
export function slab(o: number[], d: number[], lo: V3, hi: V3): [number, number] | null {
  let t0 = -Infinity, t1 = Infinity;
  for (let e = 0; e < 3; e++) {
    if (Math.abs(d[e]) < 1e-12) { if (o[e] < lo[e] || o[e] > hi[e]) return null; continue; }
    const a = (lo[e] - o[e]) / d[e], b = (hi[e] - o[e]) / d[e];
    t0 = Math.max(t0, Math.min(a, b)); t1 = Math.min(t1, Math.max(a, b));
  }
  return t0 <= t1 ? [t0, t1] : null;
}

/** What the rays look for: a field's surface or a grid's cells, in their own frame, its box, its materials ("" none). */
interface Tracer {
  lo: V3;
  hi: V3;
  names: string[];
  /** its own parts' names (a field's .part()) */
  parts?: string[];
  /** the first hit along o + d t for t in t0..t1, to within e: t, or -1 (it keeps what it hit for shade()) */
  hit(o: V3, d: V3, t0: number, t1: number, e: number): number;
  /** the last hit's normal, material and part (-1 none) */
  shade(p: V3, e: number): { n: V3; m: number; part?: number };
  /** how far off a surface a ray to the light starts */
  lift(e: number): number;
  /** how shut in a point is (creases), 0..1, if it says */
  ao?(p: V3, n: V3): number;
  /** a cell's size, for a voxel grid */
  cell?: V3;
}

/** A field's surface: marched by its distance. */
function fieldTracer(C: Compiled): Tracer {
  const lip = C.lip * 1.05, d = C.d;
  const march = (ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, t0: number, t1: number, e: number): number => {
    let t = t0;
    for (let i = 0; i < 160 && t <= t1; i++) {
      const v = d(ox + dx * t, oy + dy * t, oz + dz * t);
      if (v < e) return t;
      t += Math.max(v / lip, e * 0.5);
    }
    return -1;
  };
  return {
    lo: C.lo, hi: C.hi, names: C.mats, parts: C.parts,
    hit: (o, r, t0, t1, e) => march(o[0], o[1], o[2], r[0], r[1], r[2], t0, t1, e),
    shade: (p, e) => {
      // the normal (four taps, Inigo Quilez's tetrahedron), the material there
      const h = Math.max(1e-4, e * 0.6), a = d(p[0] + h, p[1] - h, p[2] - h), b = d(p[0] - h, p[1] - h, p[2] + h), cc = d(p[0] - h, p[1] + h, p[2] - h), dd = d(p[0] + h, p[1] + h, p[2] + h);
      const n = unit([a - b - cc + dd, -a - b + cc + dd, -a + b - cc + dd]);
      return { n, m: C.m(p[0], p[1], p[2], n[0], n[1], n[2]), part: C.parts.length ? C.part(p[0], p[1], p[2], n[0], n[1], n[2]) : -1 };
    },
    lift: (e) => 2 * e,
    // creases: how much nearer the field comes than the open air along the normal, a few steps out
    ao: (p, n) => { let occ = 0; for (let j = 1; j <= 3; j++) { const hh = 0.07 * j; occ += (hh - d(p[0] + n[0] * hh, p[1] + n[1] * hh, p[2] + n[2] * hh)) / hh / 2 ** j; } return occ; },
  };
}

/** A voxel grid: a ray steps cell to cell (Amanatides and Woo) to the first filled one, its normal the face it came in by. */
function voxelTracer(V: Voxels): Tracer {
  const [lo, hi] = V.bounds(), { n, size: s, origin: o, cells } = V, X = n[0], XY = n[0] * n[1];
  let last = 0, axis = 0, sign = 1;
  const i = [0, 0, 0], step = [0, 0, 0], tMax = [0, 0, 0], tDelta = [0, 0, 0];
  return {
    lo, hi, names: V.mats, cell: s,
    hit: (org, d, t0, t1) => {
      // the face it comes in by: the box's, where it starts on the box
      let ax = 0, te = -Infinity;
      for (let e = 0; e < 3; e++) if (Math.abs(d[e]) > 1e-12) { const t = ((d[e] > 0 ? lo[e] : hi[e]) - org[e]) / d[e]; if (t > te) { te = t; ax = e; } }
      for (let e = 0; e < 3; e++) {
        const p = org[e] + d[e] * (t0 + 1e-9);
        i[e] = Math.max(0, Math.min(n[e] - 1, Math.floor((p - o[e]) / s[e])));
        step[e] = d[e] > 0 ? 1 : -1;
        tMax[e] = Math.abs(d[e]) > 1e-12 ? (o[e] + (i[e] + (d[e] > 0 ? 1 : 0)) * s[e] - org[e]) / d[e] : Infinity;
        tDelta[e] = Math.abs(d[e]) > 1e-12 ? s[e] / Math.abs(d[e]) : Infinity;
      }
      let t = t0;
      for (let guard = n[0] + n[1] + n[2] + 3; guard > 0; guard--) {
        const q = i[2] * XY + i[1] * X + i[0];
        if (cells[q]) { last = q; axis = ax; sign = -step[ax]; return t; }
        ax = tMax[0] < tMax[1] ? (tMax[0] < tMax[2] ? 0 : 2) : tMax[1] < tMax[2] ? 1 : 2;
        t = tMax[ax];
        if (t > t1) return -1;
        i[ax] += step[ax];
        if (i[ax] < 0 || i[ax] >= n[ax]) return -1;
        tMax[ax] += tDelta[ax];
      }
      return -1;
    },
    shade: () => { const nn: V3 = [0, 0, 0]; nn[axis] = sign; return { n: nn, m: cells[last] - 1 }; },
    // (off the face into the empty cell beside it, never past it)
    lift: (e) => Math.min(2 * e, 0.25 * Math.min(s[0], s[1], s[2])),
    // creases, as block games shade a face's corners: at each corner of the face, the cells over it
    // beside and across (both sides filled: shut), mixed by where on the face the point is
    ao: (p, nn) => {
      const ax = nn[0] ? 0 : nn[1] ? 1 : 2, u = (ax + 1) % 3, v = (ax + 2) % 3, c = [0, 0, 0], f = [0, 0, 0];
      for (let e = 0; e < 3; e++) { const g = (p[e] - nn[e] * 0.5 * s[e] - o[e]) / s[e]; c[e] = Math.floor(g); f[e] = g - c[e]; }
      c[ax] += nn[ax];
      const full = (du: number, dv: number) => { const q = [...c]; q[u] += du; q[v] += dv; return V.at(q[0], q[1], q[2]) ? 1 : 0; };
      const corner = (du: number, dv: number) => { const a = full(du, 0), b = full(0, dv); return a && b ? 3 : a + b + full(du, dv); };
      const lo = (1 - f[v]) * corner(-1, -1) + f[v] * corner(-1, 1), hi = (1 - f[v]) * corner(1, -1) + f[v] * corner(1, 1);
      return ((1 - f[u]) * lo + f[u] * hi) / 3;
    },
  };
}

/** Draw a distance field's surface on the canvas (see the top of this file). */
export function drawSurface(c: SurfaceCanvas, field: unknown, o: SurfaceOpts = {}): void {
  if (!(field instanceof Sdf)) throw new PxError(`surface(field, opts) draws a distance field (sdf.sphere(...) and the rest)${field && typeof field === "object" && "kind" in field ? `, not ${article((field as { kind: string }).kind)}` : ""}`);
  const C = compile(field, clockOf(c));
  finite(C);
  drawTraced(c, fieldTracer(C), o, "surface");
}

/** Draw a voxel grid, or a field made voxels of `size` m at this moment, a cube to a cell (see the top of this file). */
export function drawVoxels(c: SurfaceCanvas, thing: unknown, o: VoxelOpts = {}): void {
  let V: Voxels;
  if (thing instanceof Voxels) { if (o.size !== undefined) throw new PxError("voxels: a grid has its size already (size is for a field)"); V = thing; }
  else if (thing instanceof Sdf) { if (o.size === undefined) throw new PxError("voxels(field, { size }): a cell's size in m, one number or [x, y, z]"); V = voxelize(thing, { size: o.size, clock: clockOf(c) }); }
  else throw new PxError(`voxels(grid or field, opts) draws a voxel grid (sdf.voxels(field, { size })) or a distance field${thing && typeof thing === "object" && "kind" in thing ? `, not ${article((thing as { kind: string }).kind)}` : ""}`);
  drawTraced(c, voxelTracer(V), { ...o, ao: o.ao ?? 0 }, "voxels");
}

export const clockOf = (c: SurfaceCanvas): Clock => ({ t: c.t, phase: c.frames > 0 ? c.frame / c.frames : 0, frame: c.frame, frames: c.frames });

/** The view's camera on a canvas: a ray through a cell's middle, a point's depth along the camera's axis and where it lands, how near a march must come, the camera's axes, the light (the way to it, and on the picture). */
export interface ViewCam {
  W: number; H: number; x0: number; y0: number;
  ray(cx: number, cy: number): { o: V3; d: V3 } | null;
  axisDepth(p: V3): number;
  toScreen(p: V3): [number, number] | null;
  near(t: number): number;
  R: V3; U: V3; F: V3; at: V3; L: V3; lx: number; ly: number; scale: number;
  /** through a camera: the perspective and the eye in the thing's own frame */
  P?: Perspective; eye: V3;
}
/** The camera for a thing with box lo..hi (its own frame; `cell` a voxel's size) drawn with options o: see drawTraced. */
export function viewOf(c: SurfaceCanvas, o: SurfaceOpts & { px?: number }, lo: V3, hi: V3, cell: V3 | undefined, who: string, persp: boolean, K: number, origin: unknown): ViewCam {
  const W = c.img.w, H = c.img.h, x0 = -c.ox, y0 = -c.oy;
  let ray: (cx: number, cy: number) => { o: V3; d: V3 } | null;
  let R: V3, U: V3, F: V3, at: V3 = [0, 0, 0], axisDepth: (p: V3) => number, toScreen: (p: V3) => [number, number] | null, lx = 0, ly = 0, scale = 0;
  // how near the march must come: a fraction of a cell, which through a camera grows with the distance
  let near: (t: number) => number;
  let P: Perspective | undefined, eye: V3 = [0, 0, 0];
  if (persp) {
    const V = scaled(o.view as View, c.k ?? 1);
    P = perspective({ ...V, w: V.w ?? W });
    const cy = P.horizon - P.focal * Math.tan(P.pitch * RAD), Pp = P;
    at = (o.at ?? [0, 0, 0]) as V3;
    eye = [-at[0], -at[1], P.eye - at[2]];
    const E = eye;
    F = unit(P.ray(P.vp - 0.5, cy - 0.5));
    R = unit([Math.cos(P.yaw * RAD), -Math.sin(P.yaw * RAD), 0]);
    U = [R[1] * F[2] - R[2] * F[1], R[2] * F[0] - R[0] * F[2], R[0] * F[1] - R[1] * F[0]];
    ray = (cx, cy2) => ({ o: E, d: Pp.ray(cx - 0.5, cy2 - 0.5) as V3 });
    axisDepth = (p) => dot([p[0] - E[0], p[1] - E[1], p[2] - E[2]], F);
    toScreen = (p) => (axisDepth(p) > 0.05 ? Pp.ground(p[0] + at[0], p[1] + at[1], p[2] + at[2]) : null);
    near = (t) => Math.max(0.002, (0.3 * K * t) / Pp.focal);
  } else {
    const pr = projection(o.view, o.ppm, o.px, cell, who), ppm = pr.k, { a, b, D } = pr;
    ({ R, U, F } = pr);
    scale = ppm;
    // where its origin lands: given, or where it stands in the view's world (and its depth there)
    const [ox, oy] = (origin ?? [W / 2 + x0, H + y0]) as number[];
    const world = o.at?.length === 3 ? (o.at as V3) : undefined, [ax, ay] = world ? [ox + dot(world, a), oy + dot(world, b)] : ((o.at ?? [ox, oy]) as number[]);
    const lift = world ? dot(world, D) : 0, back = Math.max(...corners(lo, hi).map((p) => Math.abs(dot(p, F)))) + 1;
    if (!pr.grid) {
      ray = (cx, cy) => {
        const u = (cx - ax) / ppm, v = (ay - cy) / ppm;
        return { o: [R[0] * u + U[0] * v - F[0] * back, R[1] * u + U[1] * v - F[1] * back, R[2] * u + U[2] * v - F[2] * back], d: F };
      };
      toScreen = (p) => [ax + dot(p, R) * ppm, ay - dot(p, U) * ppm];
    } else {
      // a point on the ray: in the plane of a and b, where it lands on (u, v)
      const aa = dot(a, a), ab = dot(a, b), bb = dot(b, b), det = aa * bb - ab * ab;
      ray = (cx, cy) => {
        const u = cx - ax, v = cy - ay, al = (u * bb - v * ab) / det, be = (v * aa - u * ab) / det;
        return { o: [a[0] * al + b[0] * be - D[0] * back, a[1] * al + b[1] * be - D[1] * back, a[2] * al + b[2] * be - D[2] * back], d: D };
      };
      toScreen = (p) => [ax + dot(p, a), ay + dot(p, b)];
    }
    // (the depth from the plane through its origin across the view: things drawn on one canvas at
    // their own px `at` stand as if side by side; at [x, y, z] m, at their depths in one world)
    axisDepth = lift ? (p) => dot(p, F) + lift : (p) => dot(p, F);
    near = () => 0.3 / ppm;
  }
  const L = unit(o.light ?? [-0.55 * R[0] + 0.55 * U[0] - 0.6 * F[0], -0.55 * R[1] + 0.55 * U[1] - 0.6 * F[1], -0.55 * R[2] + 0.55 * U[2] - 0.6 * F[2]]);
  if (o.light !== undefined && !(Array.isArray(o.light) && o.light.length === 3 && o.light.every(Number.isFinite) && Math.hypot(...o.light) > 0)) throw new PxError(`${who}: light is the way toward it, [x, y, z], got ${JSON.stringify(o.light)}`);
  // which way the light is on the picture: the contour on that side is lit, the other outlined
  lx = dot(L, R); ly = -dot(L, U);
  return { W, H, x0, y0, ray, axisDepth, toScreen, near, R, U, F, at, L, lx, ly, scale, P, eye };

}

/** What both draw: the rays through the cells, the light, the clusters, the contour, the normals and depth, the shadow on what is drawn. */
function drawTraced(c: SurfaceCanvas, T: Tracer, o: SurfaceOpts & { px?: number }, who: string): void {
  const persp = !!o.view && typeof o.view === "object" && "horizon" in o.view;
  const K = o.pixel ?? c.k ?? 1, aoK = o.ao ?? 0.5, castK = o.cast ?? 0.4;
  if (!(Number.isInteger(K) && K >= 1)) throw new PxError(`${who}: pixel is px to a ray, a whole number from 1, got ${JSON.stringify(o.pixel)}`);
  if (!(aoK >= 0 && aoK <= 1) || !(castK >= 0 && castK <= 1)) throw new PxError(`${who}: ao and cast are 0..1, got ${JSON.stringify([o.ao, o.cast])}`);
  const origin = !persp && o.view && typeof o.view === "object" ? (o.view as { origin?: unknown }).origin : undefined;
  if (origin !== undefined && !(Array.isArray(origin) && origin.length === 2 && origin.every(Number.isFinite))) throw new PxError(`${who}: view's origin is where the world's [0, 0, 0] lands, [x, y] px, got ${JSON.stringify(origin)}`);
  if (o.at !== undefined && !(Array.isArray(o.at) && (o.at.length === 3 || (!persp && o.at.length === 2)) && o.at.every(Number.isFinite)))
    throw new PxError(`${who}: at is ${persp ? "where it stands, [x, z, up] m" : "where its origin lands, [x, y] px, or where it stands in the view's world, [x, y, z] m"}, got ${JSON.stringify(o.at)}`);
  // the materials: each a ramp of resolved colors, dark to light, and its glint
  const names = Object.keys(o.mats ?? {});
  const ramps: Color[][] = [], shines: number[] = [];
  const mat = (spec: unknown, name: string) => {
    const s = (typeof spec === "string" || Array.isArray(spec) ? { ramp: spec } : spec) as SurfaceMat;
    const keys = typeof s?.ramp === "string" ? [...s.ramp] : s?.ramp;
    if (!Array.isArray(keys) || !keys.length) throw new PxError(`${who}: material '${name}' is a ramp of keys dark to light ("asdf"), or { ramp, shine }, got ${JSON.stringify(spec)}`);
    ramps.push(keys.map((k) => { const col = c.color(k); if (col === null || col === TRANSPARENT) throw new PxError(`${who}: material '${name}': '${k}' is not a color`); return col; }));
    shines.push(s.shine ?? 0);
  };
  if (names.length) names.forEach((n) => mat(o.mats![n], n));
  else if (c.pal.ramps.length) mat(c.pal.ramps[0], "the palette's first ramp");
  else throw new PxError(`${who}: give mats: { name: ramp } (or the palette a ramp)`);
  const missing = T.names.filter((m) => m && !names.includes(m));
  if (names.length && missing.length) throw new PxError(`${who}: the field's material ${missing.map((m) => `'${m}'`).join(", ")} is not in mats (it has: ${names.join(", ")})`);
  const matOf = T.names.map((m) => Math.max(0, names.indexOf(m)));
  const outKey = typeof o.outline === "string" ? c.color(o.outline) : null;
  if (typeof o.outline === "string" && (outKey === null || outKey === TRANSPARENT)) throw new PxError(`${who}: outline '${o.outline}' is not a color`);

  const cam = viewOf(c, o, T.lo, T.hi, T.cell, who, persp, K, origin), { W, H, x0, y0, ray, axisDepth, toScreen, near, R, U, F, L, lx, ly, scale } = cam;

  // the cells the field's box covers on the picture
  const pts = corners(T.lo, T.hi).map(toScreen);
  let bx0 = x0, bx1 = x0 + W, by0 = y0, by1 = y0 + H;
  if (pts.every((p) => p)) {
    bx0 = Math.max(bx0, Math.floor(Math.min(...pts.map((p) => p![0]))) - 1); bx1 = Math.min(bx1, Math.ceil(Math.max(...pts.map((p) => p![0]))) + 1);
    by0 = Math.max(by0, Math.floor(Math.min(...pts.map((p) => p![1]))) - 1); by1 = Math.min(by1, Math.ceil(Math.max(...pts.map((p) => p![1]))) + 1);
  }
  const gx0 = Math.floor(bx0 / K), gy0 = Math.floor(by0 / K), GW = Math.ceil(bx1 / K) - gx0, GH = Math.ceil(by1 / K) - gy0;
  if (GW <= 0 || GH <= 0) return;
  const N = GW * GH, m = new Int16Array(N).fill(-1), tone = new Int8Array(N), depth = new Float32Array(N), nrm = new Float32Array(N * 3), hidden = new Uint8Array(N), pt = new Int16Array(N).fill(-1);
  // in the world's light (light: "mesh"): where each cell is in the world and whether the sun reaches it
  const Wl = o.world, wpos = Wl ? new Float32Array(N * 3) : undefined, wsun = Wl ? new Uint8Array(N) : undefined;

  // something of it between a point and the light, from t0 on
  const blocks = (p: V3, t0: number, e: number): boolean => {
    const s = slab(p, L, T.lo, T.hi);
    return !!s && s[1] >= t0 && T.hit(p, L, Math.max(t0, s[0]), s[1], e) >= 0;
  };
  const vis = c.img.depth;
  for (let gy = 0; gy < GH; gy++)
    for (let gx = 0; gx < GW; gx++) {
      const cx = (gx0 + gx) * K + K / 2, cy = (gy0 + gy) * K + K / 2, r = ray(cx, cy);
      if (!r) continue;
      const s = slab(r.o, r.d, T.lo, T.hi);
      if (!s) continue;
      const e = near(Math.max(s[0], 0.05));
      const t = T.hit(r.o, r.d, Math.max(s[0], persp ? 0.05 : -Infinity), s[1], e);
      if (t < 0) continue;
      const p: V3 = [r.o[0] + r.d[0] * t, r.o[1] + r.d[1] * t, r.o[2] + r.d[2] * t], i = gy * GW + gx;
      depth[i] = axisDepth(p);
      // drawn already nearer the eye (mesh()'s depth): there, but hidden
      if (vis) { const q = c.index(cx - K / 2, cy - K / 2); if (q >= 0 && vis[q] < depth[i]) hidden[i] = 1; }
      // the normal, the material there, the light
      const { n, m: mi, part } = T.shade(p, e), k = mi < 0 ? 0 : matOf[mi];
      pt[i] = part ?? -1;
      nrm[i * 3] = n[0]; nrm[i * 3 + 1] = n[1]; nrm[i * 3 + 2] = n[2];
      m[i] = k;
      const ramp = ramps[k], up = T.lift(e), q: V3 = [p[0] + n[0] * up, p[1] + n[1] * up, p[2] + n[2] * up];
      const diffuse = Math.max(0, dot(n, L)), sun = diffuse > 0 && (o.shadows === false || !blocks(q, 0, e)) ? diffuse : 0;
      if (wpos) { wpos[i * 3] = p[0] + cam.at[0]; wpos[i * 3 + 1] = p[1] + cam.at[1]; wpos[i * 3 + 2] = p[2] + cam.at[2]; wsun![i] = sun > 0 ? 1 : 0; }
      const occ = aoK > 0 && T.ao ? T.ao(p, n) : 0;
      let lv = 0.1 + 0.65 * sun + 0.2 * (0.5 + 0.5 * n[2]) - aoK * 0.35 * Math.max(0, Math.min(1, occ));
      if (shines[k] > 0) {
        // the light mirrored by the surface, toward the eye: a glint
        const dn = dot(r.d, n), rf: V3 = [r.d[0] - 2 * dn * n[0], r.d[1] - 2 * dn * n[1], r.d[2] - 2 * dn * n[2]];
        if (sun > 0) lv += shines[k] * Math.max(0, dot(rf, L)) ** 12;
      }
      tone[i] = Math.max(0, Math.min(ramp.length - 1, Math.round(lv * (ramp.length - 1))));
    }

  // tones in clusters: a cell whose tone none of its four neighbours of the same material share takes
  // the one most of them have (three or four)
  const was = tone.slice();
  for (let gy = 1; gy < GH - 1; gy++)
    for (let gx = 1; gx < GW - 1; gx++) {
      const i = gy * GW + gx, k = m[i];
      if (k < 0) continue;
      const nb = [i - 1, i + 1, i - GW, i + GW].filter((j) => m[j] === k).map((j) => was[j]);
      if (nb.length < 3 || nb.includes(was[i])) continue;
      const best = nb.find((v) => nb.filter((u) => u === v).length >= 3) ?? (nb.length === 4 && nb.filter((u) => u === nb[0]).length === 2 ? nb[0] : undefined);
      if (best !== undefined) tone[i] = best;
    }

  // the contour: a cell with nothing beside it, or something far behind; lit toward the light,
  // outlined away from it (not a part a cell thin: it keeps its tone)
  const gap = persp ? 0.25 : Math.max(0.15, 3 / scale);
  const open = (gx: number, gy: number, i: number) => gx < 0 || gy < 0 || gx >= GW || gy >= GH || m[gy * GW + gx] < 0 || depth[gy * GW + gx] > depth[i] + gap;
  const norm = c.img.normals(), zbuf = (c.img.depth ??= new Float32Array(W * H).fill(Infinity));
  // what each part is called on the picture: the drawing's part, then the field's own
  const own = (T.parts ?? []).map((n) => partIndex(c.img, o.part ? `${o.part}.${n}` : n)), whole = o.part !== undefined ? partIndex(c.img, o.part) : -1;
  for (let gy = 0; gy < GH; gy++)
    for (let gx = 0; gx < GW; gx++) {
      const i = gy * GW + gx;
      if (m[i] < 0 || hidden[i] || o.hide) continue;
      const ramp = ramps[m[i]];
      let col = ramp[tone[i]];
      let toward = false, away = false;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (!open(gx + dx, gy + dy, i)) continue;
        if (dx * lx + dy * ly > 0) toward = true;
        else if (!open(gx - dx, gy - dy, i)) away = true;
      }
      if (away && o.outline !== false) col = outKey ?? ramp[0];
      else if (toward && o.rim !== false) col = ramp[Math.min(ramp.length - 1, tone[i] + 1)];
      // the normal as the picture sees it (x right, y down, z toward the eye)
      const n: V3 = [nrm[i * 3], nrm[i * 3 + 1], nrm[i * 3 + 2]], nx = dot(n, R), ny = -dot(n, U), nz = -dot(n, F);
      // in the world's light, as mesh() lights its sprites: the art's tone times the sky's and the sun's
      if (Wl) col = shine(col, n, wpos![i * 3], wpos![i * 3 + 1], wpos![i * 3 + 2], Wl, wsun![i], 0.5);
      for (let y = 0; y < K; y++)
        for (let x = 0; x < K; x++) {
          const px = (gx0 + gx) * K + x, py = (gy0 + gy) * K + y, j = c.index(px, py);
          if (j < 0 || (vis && vis[j] < depth[i])) continue;
          if (!c.plot(px, py, col)) continue;
          setNormal(norm, j, nx, ny, nz);
          zbuf[j] = depth[i];
          const pk = pt[i] >= 0 ? own[pt[i]] : whole;
          if (pk >= 0) c.img.parts!.ids[j] = pk;
        }
    }

  // through a camera, its shadow on what is drawn: each block of what has a depth, put back in the
  // world, and the way from it to the light marched through the field
  if (o.hide && !persp) throw new PxError(`${who}: hide (its shadow alone) is through a perspective() camera`);
  if (!persp || castK <= 0 || !vis) return;
  const { P, eye } = cam;
  const steps = c.pal.stepMap(-1);
  // in the world's light, the sun's share taken away, as mesh()'s shadows on a floor do (the sky's light
  // left; ponytail: a floor's share on walls and sprites too, the receiving normal unknown here)
  const upk = Wl && o.cast === undefined ? Math.max(0, Wl.dir[2]) : -1, keep = Wl && upk >= 0 ? Wl.sky.map((s, k) => s / (s + Wl.sun[k] * upk || 1)) : undefined;
  const down = (col: Color) => {
    if (keep) return fromLinear(LIN[col >>> 24] * keep[0], LIN[(col >>> 16) & 255] * keep[1], LIN[(col >>> 8) & 255] * keep[2], col);
    const st = steps.get(col);
    return st !== undefined && st !== col ? st : fromLinear(LIN[col >>> 24] * (1 - castK), LIN[(col >>> 16) & 255] * (1 - castK), LIN[(col >>> 8) & 255] * (1 - castK), col);
  };
  // where the shadow can fall: the box, and the box carried away from the light down to its foot
  const foot = T.lo[2], away: V3[] = corners(T.lo, T.hi).flatMap((p) => { const s = L[2] > 0.05 ? (p[2] - foot) / L[2] : 0; return [p, [p[0] - L[0] * s, p[1] - L[1] * s, foot] as V3]; });
  const sp = away.map(toScreen);
  if (!sp.every((p) => p)) return;
  const sx0 = Math.max(x0, Math.floor(Math.min(...sp.map((p) => p![0]))) - K), sx1 = Math.min(x0 + W, Math.ceil(Math.max(...sp.map((p) => p![0]))) + K);
  const sy0 = Math.max(y0, Math.floor(Math.min(...sp.map((p) => p![1]))) - K), sy1 = Math.min(y0 + H, Math.ceil(Math.max(...sp.map((p) => p![1]))) + K);
  for (let by = Math.floor(sy0 / K); by * K < sy1; by++)
    for (let bx = Math.floor(sx0 / K); bx * K < sx1; bx++) {
      const cx = bx * K + K / 2, cy = by * K + K / 2, q = c.index(cx - K / 2, cy - K / 2);
      if (q < 0 || !Number.isFinite(vis[q])) continue;
      const g = bx - gx0, gyy = by - gy0;
      if (g >= 0 && gyy >= 0 && g < GW && gyy < GH && m[gyy * GW + g] >= 0 && !hidden[gyy * GW + g]) continue;
      const dir = P!.ray(cx - 0.5, cy - 0.5), t = vis[q] / dot(dir, F), p: V3 = [eye[0] + dir[0] * t, eye[1] + dir[1] * t, eye[2] + dir[2] * t];
      if (!blocks(p, 0.02, 0.01)) continue;
      for (let y = 0; y < K; y++)
        for (let x = 0; x < K; x++) {
          const j = c.index(bx * K + x, by * K + y);
          if (j >= 0 && Math.abs(vis[j] - vis[q]) < 0.5) c.img.data[j] = down(c.img.data[j]);
        }
    }
}
