// Fields in 3D, in meters, [x, y, z]: x across, y ahead (away from the viewer, mesh()'s z), z up.
// Four kinds, never one: a distance (an SDF: how far to the surface, negative inside), and from it an
// occupancy (inside or not: voxels), a density (how much matter: fog, smoke) and an appearance (which
// material a surface point is). A distance is built of primitives (sphere, box, capsule, cylinder,
// cone, torus, plane, ellipsoid), joined plainly or smoothly (union, subtract, intersect), moved
// (at, rotate, scale), deformed (twist, bend, mirror, repeat, noise) and painted by region (mat,
// paint). A field is a description, not numbers: any parameter may be a function of the clock
// ({ t, phase, frame, frames }), resolved when it is drawn, so a tree sways and a crystal turns.
// compile() turns it into plain functions for a renderer, with its bounds and how much its
// deformations stretch distances (`lip`: a march steps d / lip and never passes the surface).
import { PxError } from "./errors.ts";

export type V3 = [number, number, number];
/** What a parameter can read: the time in ms, 0..1 over the loop, the frame and the loop's frames. */
export interface Clock { t: number; phase: number; frame: number; frames: number }
export type Num = number | ((clock: Clock) => number);
export type Vec = readonly Num[] | ((clock: Clock) => readonly number[]);
export const STILL: Clock = { t: 0, phase: 0, frame: 0, frames: 1 };

type Node =
  | { op: "sphere"; r: Num }
  | { op: "box"; size: Vec; round: Num }
  | { op: "capsule"; a: Vec; b: Vec; r: Num; r2?: Num }
  | { op: "cylinder"; r: Num; h: Num }
  | { op: "cone"; r: Num; h: Num; top: Num }
  | { op: "torus"; R: Num; r: Num }
  | { op: "plane"; n: Vec; h: Num }
  | { op: "ellipsoid"; r: Vec }
  | { op: "union" | "intersect"; of: Sdf[]; k: Num }
  | { op: "subtract"; of: [Sdf, Sdf]; k: Num }
  | { op: "at"; of: Sdf; v: Vec }
  | { op: "rotate"; of: Sdf; deg: Num; axis: Vec }
  | { op: "scale"; of: Sdf; s: Num | Vec }
  | { op: "twist"; of: Sdf; deg: Num }
  | { op: "bend"; of: Sdf; k: Num | Vec }
  | { op: "mirror"; of: Sdf; axes: string }
  | { op: "repeat"; of: Sdf; step: Vec; count: Vec }
  | { op: "noise"; of: Sdf; amp: Num; scale: Num; seed: number; octaves: number }
  | { op: "mat"; of: Sdf; name: string }
  | { op: "paint"; of: Sdf; name: string; where: (p: V3, n: V3) => unknown }
  | { op: "paintBy"; of: Sdf; by: (p: V3, n: V3) => unknown }
  | { op: "part"; of: Sdf; name: string }
  | { op: "fn"; d: (x: number, y: number, z: number) => number; lo: V3; hi: V3; lip: number; id: number };

/** A field compiled at one moment: its distance, its material (an index into `mats`, -1 none) and its named part (into `parts`, -1 none) at a point with its normal, its box, its stretch. */
export interface Compiled {
  d(x: number, y: number, z: number): number;
  m(x: number, y: number, z: number, nx: number, ny: number, nz: number): number;
  part(x: number, y: number, z: number, nx: number, ny: number, nz: number): number;
  /** both at once: (material + 1) + 1024 (part + 1), 0 neither */
  mp(x: number, y: number, z: number, nx: number, ny: number, nz: number): number;
  parts: string[];
  /** its distance's code and numbers: the same key, the same field (a fingerprint) */
  key: string;
  lo: V3;
  hi: V3;
  lip: number;
  mats: string[];
}
type Fd = (x: number, y: number, z: number) => number;
type Fm = (x: number, y: number, z: number, nx: number, ny: number, nz: number) => number;
/** A part of a compiled field: its material as a function, its box, its stretch, and `e`, which writes its distance as code (see Code). */
interface Part { m: Fm; lo: V3; hi: V3; lip: number; e: (c: Code, x: string, y: string, z: string) => string }

const fin = (v: unknown, what: string): number => {
  if (typeof v !== "number" || !Number.isFinite(v)) throw new PxError(`sdf: ${what} must be a number (or a function of the clock giving one), got ${JSON.stringify(v)}`);
  return v;
};
export const num = (v: Num, c: Clock, what: string): number => fin(typeof v === "function" ? v(c) : v, what);
export const vec = (v: Num | Vec, c: Clock, what: string, n = 3): number[] => {
  const a = typeof v === "function" ? (v as (c: Clock) => unknown)(c) : v;
  if (typeof a === "number") return Array(n).fill(fin(a, what));
  if (!Array.isArray(a) || a.length !== n) throw new PxError(`sdf: ${what} must be [${"xyz".slice(0, n).split("").join(", ")}] (or a function of the clock giving it), got ${JSON.stringify(a)}`);
  return a.map((x, i) => num(x as Num, c, `${what}[${i}]`));
};
const pos = (v: number, what: string) => { if (!(v > 0)) throw new PxError(`sdf: ${what} must be above 0, got ${v}`); return v; };
const AXES: Record<string, V3> = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };

// ---------------------------------------------------------------- noise
/** A number in [0, 1) for a lattice point and a seed. */
function lattice(i: number, j: number, k: number, s: number): number {
  let h = Math.imul(i, 0x27d4eb2d) ^ Math.imul(j, 0x165667b1) ^ Math.imul(k, 0x9e3779b1) ^ Math.imul(s, 0x85ebca77);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}
/** A seed's lattice values, 32 cells each way (a noise that repeats every 32 cells: far past any field's size). */
const TABLES = new Map<number, Float32Array>();
// (the last two seeds' at hand: an fbm's octaves take turns)
let s0 = NaN, t0: Float32Array = new Float32Array(0), s1 = NaN, t1 = t0;
const table = (s: number) => {
  if (s === s0) return t0;
  if (s === s1) return t1;
  let t = TABLES.get(s);
  if (!t) {
    t = new Float32Array(32 * 32 * 32);
    for (let i = 0; i < 32; i++) for (let j = 0; j < 32; j++) for (let k = 0; k < 32; k++) t[(i << 10) | (j << 5) | k] = lattice(i, j, k, s);
    if (TABLES.size > 64) TABLES.clear();
    TABLES.set(s, t);
  }
  s1 = s0; t1 = t0; s0 = s; t0 = t;
  return t;
};
/** Smooth value noise in [0, 1], one unit a cell, seeded. */
export function vnoise3(x: number, y: number, z: number, s = 0): number {
  const T = table(s), fi = Math.floor(x), fj = Math.floor(y), fk = Math.floor(z), u = x - fi, v = y - fj, w = z - fk;
  const su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v), sw = w * w * (3 - 2 * w);
  const i0 = (fi & 31) << 10, i1 = ((fi + 1) & 31) << 10, j0 = (fj & 31) << 5, j1 = ((fj + 1) & 31) << 5, k0 = fk & 31, k1 = (fk + 1) & 31;
  const a0 = T[i0 | j0 | k0], a1 = T[i1 | j0 | k0], a2 = T[i0 | j1 | k0], a3 = T[i1 | j1 | k0];
  const b0 = T[i0 | j0 | k1], b1 = T[i1 | j0 | k1], b2 = T[i0 | j1 | k1], b3 = T[i1 | j1 | k1];
  const lo0 = a0 + (a1 - a0) * su, lo1 = a2 + (a3 - a2) * su, hi0 = b0 + (b1 - b0) * su, hi1 = b2 + (b3 - b2) * su;
  const lo = lo0 + (lo1 - lo0) * sv, hi = hi0 + (hi1 - hi0) * sv;
  return lo + (hi - lo) * sw;
}
/** Octaves of vnoise3, each twice as fine and half as strong, in [0, 1]. */
export function fbm3(x: number, y: number, z: number, s = 0, octaves = 2): number {
  let t = 0, a = 0.5, f = 1;
  for (let o = 0; o < octaves; o++) { t += a * vnoise3(x * f, y * f, z * f, s + o * 101); a *= 0.5; f *= 2.03; }
  return t / (1 - 0.5 ** octaves);
}

// ---------------------------------------------------------------- the field
/** A distance field: how far a point is from the surface, negative inside. Methods give new fields; it never changes. */
export class Sdf {
  readonly kind = "distance";
  readonly node: Node;
  constructor(node: Node) { this.node = node; }

  /** This and others as one (smooth: how far, in m, they melt into each other). */
  union(...a: (Sdf | { smooth?: Num })[]): Sdf { return join("union", [this, ...a]); }
  /** This with others cut out of it. */
  subtract(...a: (Sdf | { smooth?: Num })[]): Sdf {
    const { of, k } = parts("subtract", a);
    return of.reduce<Sdf>((s, o) => new Sdf({ op: "subtract", of: [s, o], k }), this);
  }
  /** Only where this and others overlap. */
  intersect(...a: (Sdf | { smooth?: Num })[]): Sdf { return join("intersect", [this, ...a]); }
  /** Moved by [x, y, z] m (or at(x, y, z)). */
  at(x: Num | Vec, y?: Num, z?: Num): Sdf { return new Sdf({ op: "at", of: this, v: Array.isArray(x) || typeof x === "function" && y === undefined ? (x as Vec) : [x as Num, y ?? 0, z ?? 0] }); }
  /** Turned `deg` degrees about an axis through its origin ("x", "y", "z" (default: about the upright) or [x, y, z]), counterclockwise looking down it. */
  rotate(deg: Num, axis: "x" | "y" | "z" | Vec = "z"): Sdf {
    const ax = typeof axis === "string" ? AXES[axis] : axis;
    if (!ax) throw new PxError(`sdf: rotate(deg, axis): axis is "x", "y", "z" or [x, y, z], got ${JSON.stringify(axis)}`);
    return new Sdf({ op: "rotate", of: this, deg, axis: ax });
  }
  /** Scaled about its origin: one factor, or [x, y, z] (distances then stay a bound, the march takes more steps). */
  scale(s: Num | Vec): Sdf { return new Sdf({ op: "scale", of: this, s }); }
  /** Twisted about the upright, `deg` degrees for each m up. */
  twist(deg: Num): Sdf { return new Sdf({ op: "twist", of: this, deg }); }
  /** Bent as a way bends (perspective()'s bend): a point z m up moved k·z²/2 m along x, or [kx, ky] along both. The wind in a tree. */
  bend(k: Num | Vec): Sdf { return new Sdf({ op: "bend", of: this, k }); }
  /** The half on the positive side of each axis named ("x", "xy"...) mirrored to the other. */
  mirror(axes = "x"): Sdf {
    if (typeof axes !== "string" || !/^[xyz]+$/.test(axes)) throw new PxError(`sdf: mirror(axes): "x", "y", "z" or several ("xy"), got ${JSON.stringify(axes)}`);
    return new Sdf({ op: "mirror", of: this, axes });
  }
  /** Copies `step` m apart ([x, y, z], 0 for an axis not repeated), `count` each way from the middle ([x, y, z] or one number for all). Keep each copy inside its cell. */
  repeat(step: Vec, count: Num | Vec = 1): Sdf { return new Sdf({ op: "repeat", of: this, step, count: typeof count === "object" || typeof count === "function" ? count as Vec : [count, count, count] }); }
  /** The surface pushed in and out by seeded noise: `amp` m at most, in bumps `scale` m across. */
  noise(o: { amp: Num; scale?: Num; seed?: number; octaves?: number }): Sdf {
    if (!o || typeof o !== "object") throw new PxError("sdf: noise({ amp (m), scale (m, the bumps' size), seed, octaves })");
    const { amp, scale = 0.5, seed = 1, octaves = 2 } = o;
    if (!Number.isInteger(seed) || !(Number.isInteger(octaves) && octaves >= 1 && octaves <= 6)) throw new PxError(`sdf: noise: seed is a whole number, octaves 1 to 6, got ${JSON.stringify(o)}`);
    return new Sdf({ op: "noise", of: this, amp, scale, seed, octaves });
  }
  /** Its material, by name (a key of the renderer's mats); a material given inside it wins. */
  mat(name: string): Sdf {
    if (typeof name !== "string" || !name) throw new PxError(`sdf: mat(name): a material's name, got ${JSON.stringify(name)}`);
    return new Sdf({ op: "mat", of: this, name });
  }
  /** A name for this part of it (the trunk, the canopy): what painted a pixel is said by it (pxl steps --at), its parts' names joined ("oak.canopy"). */
  part(name: string): Sdf {
    if (typeof name !== "string" || !/^[\w-]+$/.test(name)) throw new PxError(`sdf: part(name): a name of letters, digits, _ or -, got ${JSON.stringify(name)}`);
    return new Sdf({ op: "part", of: this, name });
  }
  /** A material where `where(p, n)` holds: p the point and n its normal, in this field's own frame (moss where n[2] > 0.6); or paint((p, n) => name), the material it names there (nothing: what it was). */
  paint(name: string | ((p: V3, n: V3) => unknown), where?: (p: V3, n: V3) => unknown): Sdf {
    if (typeof name === "function" && where === undefined) return new Sdf({ op: "paintBy", of: this, by: name });
    if (typeof name !== "string" || !name || typeof where !== "function") throw new PxError("sdf: paint(name, (p, n) => true where it is that material), or paint((p, n) => the material's name there)");
    return new Sdf({ op: "paint", of: this, name, where });
  }
  /** Its box [lo, hi] at a moment (Infinity for a plane's sides). */
  bounds(clock: Clock = STILL): [V3, V3] { const c = compile(this, clock); return [c.lo, c.hi]; }
  /** The distance at a point, at a moment. */
  dist(p: readonly number[], clock: Clock = STILL): number { return compile(this, clock).d(p[0], p[1], p[2]); }
}

/** Inside or not: what voxels are made of. From a distance field: inside where it is 0 or less. */
export class Occupancy {
  readonly kind = "occupancy";
  readonly of: Sdf;
  constructor(of: Sdf) { needSdf(of, "occupancy"); this.of = of; }
  inside(p: readonly number[], clock: Clock = STILL): boolean { return this.of.dist(p, clock) <= 0; }
  bounds(clock: Clock = STILL): [V3, V3] { return this.of.bounds(clock); }
}
/** A density's options: how soft its edge is, the noise that eats into it and how it flows, where it thins away up. */
export interface DensityOpts {
  /** m over which it goes from none at the shape's surface to full inside (default 0.1) */
  edge?: number;
  /** m the seeded noise pushes its edge in and out (default 0: none) */
  noise?: Num;
  /** the noise's billows, m across (default 0.5) */
  scale?: Num;
  seed?: number;
  /** octaves of the noise (default 3: big billows and their curls) */
  octaves?: number;
  /** m the noise is carried through the shape over the loop, [x, y, z]: boiling, rising, creeping (it closes) */
  flow?: Vec;
  /** [z0, z1] m: full up to z0, thinning to none at z1 (smoke going, mist lying low) */
  fade?: [number, number];
}
/**
 * How much matter there is, 0..1: fog, smoke, a cloud. Made from a distance field: none outside its
 * shape, full `edge` m inside, smooth between; the edge pushed in and out by seeded noise (fBm) that
 * flows through it on the clock (sampled twice and crossfaded, so the loop closes), thinned away
 * above `fade`.
 */
export class Density {
  readonly kind = "density";
  readonly of: Sdf;
  readonly edge: number;
  readonly o: DensityOpts;
  constructor(of: Sdf, o: number | DensityOpts = {}) {
    needSdf(of, "density");
    const opts = typeof o === "number" ? { edge: o } : o ?? {};
    const bad = Object.keys(opts).filter((k) => !["edge", "noise", "scale", "seed", "octaves", "flow", "fade"].includes(k));
    if (bad.length) throw new PxError(`sdf.density(field, { edge, noise, scale, seed, octaves, flow, fade }): no option ${bad.join(", ")}`);
    if (opts.seed !== undefined && !Number.isInteger(opts.seed)) throw new PxError(`sdf.density: seed is a whole number, got ${opts.seed}`);
    if (opts.octaves !== undefined && !(Number.isInteger(opts.octaves) && opts.octaves >= 1 && opts.octaves <= 6)) throw new PxError(`sdf.density: octaves 1 to 6, got ${opts.octaves}`);
    if (opts.fade !== undefined && !(Array.isArray(opts.fade) && opts.fade.length === 2 && opts.fade.every(Number.isFinite) && opts.fade[1] > opts.fade[0])) throw new PxError(`sdf.density: fade is [z0, z1] m, full below z0, none above z1, got ${JSON.stringify(opts.fade)}`);
    this.of = of; this.o = opts; this.edge = pos(opts.edge ?? 0.1, "density's edge");
  }
  at(p: readonly number[], clock: Clock = STILL): number { return compileDensity(this, clock).rho(p[0], p[1], p[2]); }
  bounds(clock: Clock = STILL): [V3, V3] { const c = compileDensity(this, clock); return [c.lo, c.hi]; }
}
/** A density at a moment: rho(x, y, z) 0..1, and its box (the shape's, grown by the noise's reach). */
export function compileDensity(D: Density, clock: Clock = STILL): { rho: (x: number, y: number, z: number) => number; lo: V3; hi: V3 } {
  const C = compile(D.of, clock), o = D.o, A = Math.abs(num(o.noise ?? 0, clock, "density's noise")), sc = pos(num(o.scale ?? 0.5, clock, "density's scale"), "density's scale");
  const seed = o.seed ?? 1, oc = o.octaves ?? 3, f = vec(o.flow ?? [0, 0, 0], clock, "density's flow"), ph = clock.phase, edge = D.edge, fade = o.fade;
  const moves = f.some((v) => v !== 0), w0 = 1 - ph, w1 = ph, norm = 1 / Math.sqrt(w0 * w0 + w1 * w1);
  // the noise carried by flow over the loop: at phase 0 and 1 the same, so it closes; the two crossfaded
  // samples brought back to one's spread
  const n = (x: number, y: number, z: number) => {
    if (!moves) return fbm3(x / sc, y / sc, z / sc, seed, oc);
    const a = fbm3((x - f[0] * ph) / sc, (y - f[1] * ph) / sc, (z - f[2] * ph) / sc, seed, oc), b = fbm3((x - f[0] * (ph - 1)) / sc, (y - f[1] * (ph - 1)) / sc, (z - f[2] * (ph - 1)) / sc, seed, oc);
    return 0.5 + (w0 * a + w1 * b - 0.5) * norm;
  };
  const rho = (x: number, y: number, z: number): number => {
    if (fade && z >= fade[1]) return 0;
    const d = C.d(x, y, z);
    if (d >= A) return 0;
    let t = (-d + (A > 0 ? A * (2 * n(x, y, z) - 1) : 0)) / edge;
    if (t <= 0) return 0;
    if (t > 1) t = 1;
    t = t * t * (3 - 2 * t);
    if (fade) { if (z > fade[0]) { const u = (z - fade[0]) / (fade[1] - fade[0]); t *= 1 - u * u * (3 - 2 * u); } }
    return t;
  };
  return { rho, lo: C.lo.map((v) => v - A) as V3, hi: C.hi.map((v) => v + A) as V3 };
}
/** Which material a point of a surface is (by its normal there too): a distance field's mat() and paint(), apart from its shape. */
export class Appearance {
  readonly kind = "appearance";
  readonly of: Sdf;
  constructor(of: Sdf) { needSdf(of, "appearance"); this.of = of; }
  at(p: readonly number[], n: readonly number[] = [0, 0, 1], clock: Clock = STILL): string | null {
    const c = compile(this.of, clock), k = c.m(p[0], p[1], p[2], n[0], n[1], n[2]);
    return k < 0 ? null : c.mats[k];
  }
}
/**
 * A field given by its distance function itself, in a box, stretching distances by at most `lip` (a
 * march steps d / lip): what the primitives can't make (rig3d's sweeps: a cloak round a body).
 */
let FNS = 0;
export const fieldOf = (d: (x: number, y: number, z: number) => number, lo: V3, hi: V3, lip = 1): Sdf => new Sdf({ op: "fn", d, lo, hi, lip, id: ++FNS });

/** "a density", "an occupancy". */
export const article = (w: string) => `${/^[aeiou]/.test(w) ? "an" : "a"} ${w}`;
function needSdf(f: unknown, what: string): asserts f is Sdf {
  if (!(f instanceof Sdf)) throw new PxError(`sdf: ${what} is made from a distance field (sdf.sphere(...) and the rest), got ${f && typeof f === "object" && "kind" in f ? article((f as { kind: string }).kind) : JSON.stringify(f)}`);
}

function parts(op: string, a: unknown[]): { of: Sdf[]; k: Num } {
  const last = a[a.length - 1], o = last && typeof last === "object" && !Array.isArray(last) && !("kind" in last) ? (a.pop() as { smooth?: Num }) : {};
  const of = a.flat() as Sdf[];
  for (const f of of) needSdf(f, op);
  if (o && Object.keys(o).some((k) => k !== "smooth")) throw new PxError(`sdf: ${op}(...fields, { smooth }): no option ${Object.keys(o).filter((k) => k !== "smooth").join(", ")}`);
  return { of, k: o.smooth ?? 0 };
}
function join(op: "union" | "intersect", a: unknown[]): Sdf {
  const { of, k } = parts(op, a);
  if (!of.length) throw new PxError(`sdf: ${op} of nothing`);
  return of.length === 1 ? of[0] : new Sdf({ op, of, k });
}

/** The primitives and joins, as art files call them: sdf.sphere(r), sdf.union(a, b, { smooth }), ... */
export const sdf = {
  /** A ball of radius r round the origin. */
  sphere: (r: Num) => new Sdf({ op: "sphere", r }),
  /** A box `size` [x, y, z] m round the origin, its edges rounded by `round` m. */
  box: (size: Vec | Num, o: { round?: Num } = {}) => new Sdf({ op: "box", size: typeof size === "object" || typeof size === "function" ? size as Vec : [size, size, size], round: o?.round ?? 0 }),
  /** A rod from a to b ([x, y, z]), radius r, tapering to r2 at b (a limb, a trunk). */
  capsule: (a: Vec, b: Vec, r: Num, r2?: Num) => new Sdf({ op: "capsule", a, b, r, r2 }),
  /** Upright, standing on the origin: radius r, h m tall. */
  cylinder: (r: Num, h: Num) => new Sdf({ op: "cylinder", r, h }),
  /** Upright, standing on the origin: radius r at the foot, h m tall, `top` its radius at the top (0, a point). */
  cone: (r: Num, h: Num, top: Num = 0) => new Sdf({ op: "cone", r, h, top }),
  /** A ring lying on the ground plane round the origin: R to the middle of its tube, r the tube's radius. */
  torus: (R: Num, r: Num) => new Sdf({ op: "torus", R, r }),
  /** Everything below a plane: its normal n (default up) and h m along it (sdf.plane() is the ground, z = 0). Endless: intersect it with something. */
  plane: (n: Vec = [0, 0, 1], h: Num = 0) => new Sdf({ op: "plane", n, h }),
  /** A field of the file's own: `d(x, y, z)` its distance (or less: never more), inside the box `lo`..`hi` (an axe's head cut to its outline). */
  field: (d: (x: number, y: number, z: number) => number, lo: number[], hi: number[]) => {
    if (typeof d !== "function" || ![lo, hi].every((v) => Array.isArray(v) && v.length === 3 && v.every(Number.isFinite))) throw new PxError("sdf.field((x, y, z) => distance, [lo x, y, z], [hi x, y, z])");
    return fieldOf(d, lo as V3, hi as V3);
  },
  /** An ellipsoid round the origin, radii [x, y, z]. */
  ellipsoid: (r: Vec) => new Sdf({ op: "ellipsoid", r }),
  union: (...a: (Sdf | Sdf[] | { smooth?: Num })[]) => join("union", a),
  intersect: (...a: (Sdf | Sdf[] | { smooth?: Num })[]) => join("intersect", a),
  /** Seeded 3D noise in [0, 1] (what noise() pushes the surface by), for paint()'s regions: moss in patches. */
  fbm: (x: number, y: number, z: number, seed = 0, octaves = 2) => fbm3(x, y, z, seed, octaves),
  occupancy: (f: Sdf) => new Occupancy(f),
  density: (f: Sdf, o: DensityOpts = {}) => new Density(f, o),
  appearance: (f: Sdf) => new Appearance(f),
};

// ---------------------------------------------------------------- compiling
const INF = Infinity;
const smin = (a: number, b: number, k: number) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
// (inside, a lookup gives the material and the part as one number: (material + 1) + 1024 (part + 1), 0 none)
const NONE: Fm = () => 0;
const MOVES_ITSELF = new Set(["sphere", "box", "cylinder", "cone", "torus", "ellipsoid"]);
const corners = (lo: V3, hi: V3): V3[] => [0, 1, 2, 3, 4, 5, 6, 7].map((i) => [i & 1 ? hi[0] : lo[0], i & 2 ? hi[1] : lo[1], i & 4 ? hi[2] : lo[2]]);
const boxOf = (pts: V3[]): [V3, V3] => [[0, 1, 2].map((e) => Math.min(...pts.map((p) => p[e]))) as V3, [0, 1, 2].map((e) => Math.max(...pts.map((p) => p[e]))) as V3];

/**
 * A field's distance written as one function's code, its numbers in K: the same field at another
 * moment is the same code with other numbers, so it is compiled (and optimized) once, not once a
 * frame; and one function with every step inlined runs several times faster than a function a part.
 */
class Code {
  lines: string[] = [];
  K: number[] = [];
  /** each join also writes which child it took into W, its slot's (for its material) */
  track: boolean;
  constructor(track = false) { this.track = track; }
  /** distance functions the code calls (a field given by one) */
  F: ((x: number, y: number, z: number) => number)[] = [];
  private n = 0;
  /** a number of the field, by reference (its value changes with the clock, the code doesn't) */
  k(v: number): string { this.K.push(v); return `K[${this.K.length - 1}]`; }
  /** a new name for a value */
  v(expr: string, mutable = false): string { const name = `v${this.n++}`; this.lines.push(`${mutable ? "let" : "const"} ${name} = ${expr};`); return name; }
  line(s: string): void { this.lines.push(s); }
  /** the lines `f` writes, kept apart */
  take(f: () => void): string[] { const outer = this.lines; this.lines = []; f(); const own = this.lines; this.lines = outer; return own; }
  /** functions the code calls: runs of a join's children */
  subs: string[] = [];
  /**
   * A join's children after the first, each a block of lines updating `vs` (the distance so far, and
   * which child it is): written as they are, or past RUN lines in all, in runs a function each,
   * (x, y, z, ...vs) => vs. V8 doesn't optimize a function of thousands of lines: the graveyard's tree
   * of 105 rods took 8 us a point in one, 1.5 in runs. The same steps either way.
   */
  runs(blocks: string[][], x: string, y: string, z: string, vs: string[]): void {
    if (blocks.reduce((n, b) => n + b.length, 0) <= RUN || new Set([x, y, z, ...vs]).size < 3 + vs.length) { for (const b of blocks) this.lines.push(...b); return; }
    let run: string[] = [];
    const out = vs.length > 1 ? `[${vs.join(", ")}]` : vs[0];
    const flush = () => {
      const name = `s${this.subs.length}`;
      this.subs.push(`const ${name} = (${x}, ${y}, ${z}, ${vs.join(", ")}) => {\n${run.join("\n")}\nreturn ${out};\n};`);
      this.line(`${out} = ${name}(${x}, ${y}, ${z}, ${vs.join(", ")});`);
      run = [];
    };
    for (const b of blocks) { if (run.length && run.length + b.length > RUN) flush(); run.push(...b); }
    flush();
  }
}
const RUN = 250;
type Factory = (K: number[], smin: (a: number, b: number, k: number) => number, fbm: typeof fbm3, F: Fd[], W?: Int32Array) => Fd;
const FACTORIES = new Map<string, Factory>(), TRACKING = new Map<string, string>();
/** A distance's code (tracking: each join also writing which child it takes), its numbers and the functions it calls. */
function written(e: Part["e"], track = false): { src: string; K: number[]; F: Fd[] } {
  const c = new Code(track), r = e(c, "x", "y", "z");
  return { src: `${c.subs.join("\n")}\nreturn (x, y, z) => {\n${c.lines.join("\n")}\nreturn ${r};\n}`, K: c.K, F: c.F };
}
/** Code as a function, its source made once. */
function made(src: string, K: number[], F: Fd[], W?: Int32Array): Fd {
  let f = FACTORIES.get(src);
  if (!f) {
    f = new Function("K", "smin", "fbm3", "F", "W", src) as Factory;
    if (FACTORIES.size > 256) FACTORIES.clear();
    FACTORIES.set(src, f);
  }
  return f(K, smin, fbm3, F, W);
}

/** Each field's last compile: drawn and a decal laid on it at one moment, or its dist() asked again, it is compiled once. */
const LAST = new WeakMap<Sdf, { clock: Clock; C: Compiled; n: number }>();
/** The field at a moment, as functions. Materials are numbered in `mats`. */
export function compile(f: Sdf, clock: Clock = STILL): Compiled {
  needSdf(f, "compile");
  // (not when a paint() function has named more materials since: a renderer tells them from those it had)
  const was = LAST.get(f), c = was?.clock;
  if (was && c && was.C.mats.length === was.n && c.t === clock.t && c.phase === clock.phase && c.frame === clock.frame && c.frames === clock.frames) return was.C;
  const C = compiled(f, clock);
  LAST.set(f, { clock: { t: clock.t, phase: clock.phase, frame: clock.frame, frames: clock.frames }, C, n: C.mats.length });
  return C;
}
function compiled(f: Sdf, clock: Clock): Compiled {
  const mats: string[] = [], parts: string[] = [], prefix: string[] = [];
  // (each join's slot in W: the child it took at the point a material is asked for)
  let slots = 0, W = new Int32Array(0), tracks = false;
  const idx = (name: string) => { const i = mats.indexOf(name); return i >= 0 ? i : mats.push(name) - 1; };
  // (a primitive moved by at() takes the move itself, (ox, oy, oz): one function a point, not two)
  const go = (s: Sdf, ox = 0, oy = 0, oz = 0): Part => {
    const n = s.node;
    const shift = (lo: V3, hi: V3): [V3, V3] => [[lo[0] + ox, lo[1] + oy, lo[2] + oz], [hi[0] + ox, hi[1] + oy, hi[2] + oz]];
    switch (n.op) {
      case "sphere": {
        const r = pos(num(n.r, clock, "sphere's r"), "sphere's r"), [lo, hi] = shift([-r, -r, -r], [r, r, r]);
        return {
          m: NONE, lo, hi, lip: 1,
          e: (c, x, y, z) => { const a = c.v(`${x} - ${c.k(ox)}`), b = c.v(`${y} - ${c.k(oy)}`), d = c.v(`${z} - ${c.k(oz)}`); return c.v(`Math.sqrt(${a} * ${a} + ${b} * ${b} + ${d} * ${d}) - ${c.k(r)}`); },
        };
      }
      case "box": {
        const s = vec(n.size, clock, "box's size").map((v) => pos(v, "box's size") / 2), rd = Math.max(0, Math.min(num(n.round, clock, "box's round"), ...s));
        const bx = s[0] - rd, by = s[1] - rd, bz = s[2] - rd, [lo, hi] = shift([-s[0], -s[1], -s[2]], [s[0], s[1], s[2]]);
        return {
          m: NONE, lo, hi, lip: 1,
          e: (c, x, y, z) => {
            const qx = c.v(`Math.abs(${x} - ${c.k(ox)}) - ${c.k(bx)}`), qy = c.v(`Math.abs(${y} - ${c.k(oy)}) - ${c.k(by)}`), qz = c.v(`Math.abs(${z} - ${c.k(oz)}) - ${c.k(bz)}`);
            const ex = c.v(`Math.max(${qx}, 0)`), ey = c.v(`Math.max(${qy}, 0)`), ez = c.v(`Math.max(${qz}, 0)`);
            return c.v(`Math.sqrt(${ex} * ${ex} + ${ey} * ${ey} + ${ez} * ${ez}) + Math.min(Math.max(${qx}, ${qy}, ${qz}), 0) - ${c.k(rd)}`);
          },
        };
      }
      case "capsule": {
        const a = vec(n.a, clock, "capsule's a"), b = vec(n.b, clock, "capsule's b"), r1 = pos(num(n.r, clock, "capsule's r"), "capsule's r"), r2 = n.r2 === undefined ? r1 : Math.max(0, num(n.r2, clock, "capsule's r2"));
        const bax = b[0] - a[0], bay = b[1] - a[1], baz = b[2] - a[2], bb = bax * bax + bay * bay + baz * baz || 1e-12, R = Math.max(r1, r2);
        return {
          m: NONE,
          e: (c, x, y, z) => {
            const BX = c.k(bax), BY = c.k(bay), BZ = c.k(baz), px = c.v(`${x} - ${c.k(a[0])}`), py = c.v(`${y} - ${c.k(a[1])}`), pz = c.v(`${z} - ${c.k(a[2])}`);
            const h = c.v(`Math.max(0, Math.min(1, (${px} * ${BX} + ${py} * ${BY} + ${pz} * ${BZ}) / ${c.k(bb)}))`);
            const dx = c.v(`${px} - ${BX} * ${h}`), dy = c.v(`${py} - ${BY} * ${h}`), dz = c.v(`${pz} - ${BZ} * ${h}`);
            return c.v(`Math.sqrt(${dx} * ${dx} + ${dy} * ${dy} + ${dz} * ${dz}) - (${c.k(r1)} + ${c.k(r2 - r1)} * ${h})`);
          },
          lo: [Math.min(a[0], b[0]) - R, Math.min(a[1], b[1]) - R, Math.min(a[2], b[2]) - R], hi: [Math.max(a[0], b[0]) + R, Math.max(a[1], b[1]) + R, Math.max(a[2], b[2]) + R],
          lip: Math.hypot(1, (r1 - r2) / Math.sqrt(bb)),
        };
      }
      case "cylinder": {
        const r = pos(num(n.r, clock, "cylinder's r"), "cylinder's r"), h = pos(num(n.h, clock, "cylinder's h"), "cylinder's h") / 2, [lo, hi] = shift([-r, -r, 0], [r, r, 2 * h]);
        return {
          m: NONE, lo, hi, lip: 1,
          e: (c, x, y, z) => {
            const X = c.v(`${x} - ${c.k(ox)}`), Y = c.v(`${y} - ${c.k(oy)}`), Z = c.v(`${z} - ${c.k(oz)}`), H = c.k(h);
            const dx = c.v(`Math.sqrt(${X} * ${X} + ${Y} * ${Y}) - ${c.k(r)}`), dz = c.v(`Math.abs(${Z} - ${H}) - ${H}`);
            return c.v(`Math.min(Math.max(${dx}, ${dz}), 0) + Math.hypot(Math.max(${dx}, 0), Math.max(${dz}, 0))`);
          },
        };
      }
      case "cone": {
        // the capped cone (Inigo Quilez's), standing on the origin: r1 at the foot, r2 at the top
        const r1 = pos(num(n.r, clock, "cone's r"), "cone's r"), H = pos(num(n.h, clock, "cone's h"), "cone's h"), r2 = Math.max(0, num(n.top, clock, "cone's top")), h = H / 2, R = Math.max(r1, r2);
        const k2x = r2 - r1, k2y = 2 * h, kk = k2x * k2x + k2y * k2y, [lo, hi] = shift([-R, -R, 0], [R, R, H]);
        return {
          m: NONE, lo, hi, lip: 1,
          e: (c, x, y, z) => {
            const X = c.v(`${x} - ${c.k(ox)}`), Y = c.v(`${y} - ${c.k(oy)}`), Hh = c.k(h), R1 = c.k(r1), R2 = c.k(r2), KX = c.k(k2x), KY = c.k(k2y);
            const qx = c.v(`Math.sqrt(${X} * ${X} + ${Y} * ${Y})`), qy = c.v(`${z} - ${c.k(oz)} - ${Hh}`);
            const cax = c.v(`${qx} - Math.min(${qx}, ${qy} < 0 ? ${R1} : ${R2})`), cay = c.v(`Math.abs(${qy}) - ${Hh}`);
            const t = c.v(`Math.max(0, Math.min(1, ((${R2} - ${qx}) * ${KX} + (${Hh} - ${qy}) * ${KY}) / ${c.k(kk)}))`), cbx = c.v(`${qx} - ${R2} + ${KX} * ${t}`), cby = c.v(`${qy} - ${Hh} + ${KY} * ${t}`);
            return c.v(`(${cbx} < 0 && ${cay} < 0 ? -1 : 1) * Math.sqrt(Math.min(${cax} * ${cax} + ${cay} * ${cay}, ${cbx} * ${cbx} + ${cby} * ${cby}))`);
          },
        };
      }
      case "torus": {
        const R = pos(num(n.R, clock, "torus's R"), "torus's R"), r = pos(num(n.r, clock, "torus's r"), "torus's r");
        const [lo, hi] = shift([-R - r, -R - r, -r], [R + r, R + r, r]);
        return {
          m: NONE, lo, hi, lip: 1,
          e: (c, x, y, z) => {
            const X = c.v(`${x} - ${c.k(ox)}`), Y = c.v(`${y} - ${c.k(oy)}`), q = c.v(`Math.sqrt(${X} * ${X} + ${Y} * ${Y}) - ${c.k(R)}`), w = c.v(`${z} - ${c.k(oz)}`);
            return c.v(`Math.sqrt(${q} * ${q} + ${w} * ${w}) - ${c.k(r)}`);
          },
        };
      }
      case "plane": {
        const v = vec(n.n, clock, "plane's normal"), l = Math.hypot(v[0], v[1], v[2]), h = num(n.h, clock, "plane's h");
        if (!(l > 0)) throw new PxError("sdf: plane(n, h): n is the way out of it, not [0, 0, 0]");
        const nx = v[0] / l, ny = v[1] / l, nz = v[2] / l;
        // what is below it: bounded only where the plane lies along an axis
        const lo: V3 = [-INF, -INF, -INF], hi: V3 = [INF, INF, INF];
        [nx, ny, nz].forEach((c, e) => { if (Math.abs(c) > 0.9999) (c > 0 ? hi : lo)[e] = c > 0 ? h : -h; });
        return { m: NONE, lo, hi, lip: 1, e: (c, x, y, z) => c.v(`${x} * ${c.k(nx)} + ${y} * ${c.k(ny)} + ${z} * ${c.k(nz)} - ${c.k(h)}`) };
      }
      case "ellipsoid": {
        const r = vec(n.r, clock, "ellipsoid's r").map((v) => pos(v, "ellipsoid's r")), [a, b, c] = r, ia = 1 / a, ib = 1 / b, ic = 1 / c, [lo, hi] = shift([-a, -b, -c], [a, b, c]);
        return {
          m: NONE, lo, hi, lip: 1.1,
          e: (cc, x, y, z) => {
            const IA = cc.k(ia), IB = cc.k(ib), IC = cc.k(ic), X = cc.v(`(${x} - ${cc.k(ox)}) * ${IA}`), Y = cc.v(`(${y} - ${cc.k(oy)}) * ${IB}`), Z = cc.v(`(${z} - ${cc.k(oz)}) * ${IC}`);
            const k0 = cc.v(`Math.sqrt(${X} * ${X} + ${Y} * ${Y} + ${Z} * ${Z})`), X2 = cc.v(`${X} * ${IA}`), Y2 = cc.v(`${Y} * ${IB}`), Z2 = cc.v(`${Z} * ${IC}`), k1 = cc.v(`Math.sqrt(${X2} * ${X2} + ${Y2} * ${Y2} + ${Z2} * ${Z2})`);
            return cc.v(`${k1} > 1e-12 ? (${k0} * (${k0} - 1)) / ${k1} : ${cc.k(-Math.min(a, b, c))}`);
          },
        };
      }
      case "union": case "intersect": {
        const ps = n.of.map((o) => go(o)), k = Math.max(0, num(n.k, clock, `${n.op}'s smooth`)), uni = n.op === "union";
        const lip = Math.max(...ps.map((p) => p.lip)), grow = k / 4;
        const [lo, hi] = uni
          ? [[0, 1, 2].map((e) => Math.min(...ps.map((p) => p.lo[e])) - grow) as V3, [0, 1, 2].map((e) => Math.max(...ps.map((p) => p.hi[e])) + grow) as V3]
          : [[0, 1, 2].map((e) => Math.max(...ps.map((p) => p.lo[e]))) as V3, [0, 1, 2].map((e) => Math.min(...ps.map((p) => p.hi[e]))) as V3];
        const N = ps.length, bx = new Float64Array(N * 7);
        ps.forEach((p, i) => bx.set([...p.lo, ...p.hi, p.lip], i * 7));
        // the nearest child (a union) or the farthest (an intersection), and the distance joined: child i's
        // lines, skipped where its box is farther than the best so far (a union: it can't be nearer, nor
        // melt in); with `w`, which child it is
        const child = (c: Code, i: number, x: string, y: string, z: string, u: string, K: string, w?: string, raw?: string) => c.take(() => {
          c.line("{");
          if (uni) {
            const o = i * 7, L = c.k(bx[o + 6]);
            const ex = c.v(`Math.max(${c.k(bx[o])} - ${x}, 0, ${x} - ${c.k(bx[o + 3])})`), ey = c.v(`Math.max(${c.k(bx[o + 1])} - ${y}, 0, ${y} - ${c.k(bx[o + 4])})`), ez = c.v(`Math.max(${c.k(bx[o + 2])} - ${z}, 0, ${z} - ${c.k(bx[o + 5])})`), lim = c.v(`${u} + ${K}`);
            c.line(`if (!(${lim} < 0 || (${ex} * ${ex} + ${ey} * ${ey} + ${ez} * ${ez}) * ${L} * ${L} >= ${lim} * ${lim})) {`);
            const v = ps[i].e(c, x, y, z);
            if (w) c.line(`if (${v} < ${u}) ${w} = ${i};`);
            c.line(`${u} = ${k > 0 ? `smin(${u}, ${v}, ${K})` : `Math.min(${u}, ${v})`};`);
            c.line("}");
          } else {
            const v = ps[i].e(c, x, y, z);
            if (w) c.line(`if (${v} > ${raw}) { ${raw} = ${v}; ${w} = ${i}; }`);
            c.line(`${u} = ${k > 0 ? `-smin(-${u}, -${v}, ${K})` : `Math.max(${u}, ${v})`};`);
          }
          c.line("}");
        });
        const slot = slots++;
        const e = (c: Code, x: string, y: string, z: string) => {
          const K = c.k(k), u = c.v(ps[0].e(c, x, y, z), true);
          if (!c.track) { c.runs(ps.slice(1).map((_, j) => child(c, j + 1, x, y, z, u, K)), x, y, z, [u]); return u; }
          const w = c.v("0", true), raw = uni ? "" : c.v("-Infinity", true);
          if (!uni) c.line(`if (${u} > ${raw}) ${raw} = ${u};`);
          c.runs(ps.slice(1).map((_, j) => child(c, j + 1, x, y, z, u, K, w, raw)), x, y, z, uni ? [u, w] : [u, w, raw]);
          c.line(`W[${slot}] = ${w};`);
          return u;
        };
        // its material: that of the child its distance takes there (the tracking pass wrote which)
        if (ps.every((p) => p.m === NONE)) return { m: NONE, lo, hi, lip, e };
        tracks = true;
        return { m: (x, y, z, a, b, c) => ps[W[slot]].m(x, y, z, a, b, c), lo, hi, lip, e };
      }
      case "subtract": {
        const [A, B] = n.of.map((o) => go(o)), k = Math.max(0, num(n.k, clock, "subtract's smooth"));
        return {
          m: A.m, lo: A.lo, hi: A.hi, lip: Math.max(A.lip, B.lip),
          e: (c, x, y, z) => {
            const a = c.v(A.e(c, x, y, z), true), K = c.k(k);
            const dx = c.v(`Math.max(${c.k(B.lo[0])} - ${x}, 0, ${x} - ${c.k(B.hi[0])})`), dy = c.v(`Math.max(${c.k(B.lo[1])} - ${y}, 0, ${y} - ${c.k(B.hi[1])})`), dz = c.v(`Math.max(${c.k(B.lo[2])} - ${z}, 0, ${z} - ${c.k(B.hi[2])})`);
            c.line(`if (!(Math.sqrt(${dx} * ${dx} + ${dy} * ${dy} + ${dz} * ${dz}) * ${c.k(B.lip)} > Math.max(0, -${a}) + ${K})) {`);
            const b = c.v(`-${B.e(c, x, y, z)}`);
            c.line(`${a} = ${k > 0 ? `-smin(-${a}, -${b}, ${K})` : `Math.max(${a}, ${b})`};`);
            c.line("}");
            return a;
          },
        };
      }
      case "at": {
        const [vx, vy, vz] = vec(n.v, clock, "at's [x, y, z]");
        if (MOVES_ITSELF.has(n.of.node.op)) return go(n.of, vx, vy, vz);
        const C = go(n.of);
        return {
          m: C.m === NONE ? NONE : (x, y, z, a, b, c) => C.m(x - vx, y - vy, z - vz, a, b, c), lo: [C.lo[0] + vx, C.lo[1] + vy, C.lo[2] + vz], hi: [C.hi[0] + vx, C.hi[1] + vy, C.hi[2] + vz], lip: C.lip,
          e: (c, x, y, z) => C.e(c, c.v(`${x} - ${c.k(vx)}`), c.v(`${y} - ${c.k(vy)}`), c.v(`${z} - ${c.k(vz)}`)),
        };
      }
      case "rotate": {
        const ax = vec(n.axis, clock, "rotate's axis"), l = Math.hypot(ax[0], ax[1], ax[2]), C = go(n.of);
        if (!(l > 0)) throw new PxError("sdf: rotate(deg, axis): the axis can't be [0, 0, 0]");
        const [u, v, w] = ax.map((e) => e / l), g = (num(n.deg, clock, "rotate's deg") * Math.PI) / 180, co = Math.cos(g), si = Math.sin(g), t = 1 - co;
        // M turns the field into the world; a point goes back into the field by M's transpose
        const M = [t * u * u + co, t * u * v - si * w, t * u * w + si * v, t * u * v + si * w, t * v * v + co, t * v * w - si * u, t * u * w - si * v, t * v * w + si * u, t * w * w + co];
        const [lo, hi] = Number.isFinite(C.lo[0] + C.lo[1] + C.lo[2] + C.hi[0] + C.hi[1] + C.hi[2])
          ? boxOf(corners(C.lo, C.hi).map((p) => [M[0] * p[0] + M[1] * p[1] + M[2] * p[2], M[3] * p[0] + M[4] * p[1] + M[5] * p[2], M[6] * p[0] + M[7] * p[1] + M[8] * p[2]] as V3))
          : [[-INF, -INF, -INF] as V3, [INF, INF, INF] as V3];
        return {
          m: C.m === NONE ? NONE : (x, y, z, a, b, c) => C.m(M[0] * x + M[3] * y + M[6] * z, M[1] * x + M[4] * y + M[7] * z, M[2] * x + M[5] * y + M[8] * z, M[0] * a + M[3] * b + M[6] * c, M[1] * a + M[4] * b + M[7] * c, M[2] * a + M[5] * b + M[8] * c),
          lo, hi, lip: C.lip,
          e: (c, x, y, z) => { const m = M.map((v) => c.k(v)); return C.e(c, c.v(`${m[0]} * ${x} + ${m[3]} * ${y} + ${m[6]} * ${z}`), c.v(`${m[1]} * ${x} + ${m[4]} * ${y} + ${m[7]} * ${z}`), c.v(`${m[2]} * ${x} + ${m[5]} * ${y} + ${m[8]} * ${z}`)); },
        };
      }
      case "scale": {
        const [sx, sy, sz] = vec(n.s, clock, "scale").map((v) => pos(v, "scale")), C = go(n.of), k = Math.min(sx, sy, sz);
        const lo: V3 = [C.lo[0] * sx, C.lo[1] * sy, C.lo[2] * sz], hi: V3 = [C.hi[0] * sx, C.hi[1] * sy, C.hi[2] * sz];
        return {
          m: C.m === NONE ? NONE : (x, y, z, a, b, c) => C.m(x / sx, y / sy, z / sz, a * sx, b * sy, c * sz), lo, hi, lip: C.lip,
          e: (c, x, y, z) => c.v(`${C.e(c, c.v(`${x} / ${c.k(sx)}`), c.v(`${y} / ${c.k(sy)}`), c.v(`${z} / ${c.k(sz)}`))} * ${c.k(k)}`),
        };
      }
      case "twist": {
        const k = (num(n.deg, clock, "twist's deg") * Math.PI) / 180, C = go(n.of), R = Math.max(...[C.lo[0], C.lo[1], C.hi[0], C.hi[1]].map(Math.abs)) * Math.SQRT2;
        return {
          m: C.m === NONE ? NONE : (x, y, z, a, b, cc) => { const g = -k * z, c = Math.cos(g), si = Math.sin(g); return C.m(c * x - si * y, si * x + c * y, z, c * a - si * b, si * a + c * b, cc); },
          lo: [-R, -R, C.lo[2]], hi: [R, R, C.hi[2]], lip: C.lip * Math.hypot(1, k * R),
          e: (c, x, y, z) => { const g = c.v(`-${c.k(k)} * ${z}`), co = c.v(`Math.cos(${g})`), si = c.v(`Math.sin(${g})`); return C.e(c, c.v(`${co} * ${x} - ${si} * ${y}`), c.v(`${si} * ${x} + ${co} * ${y}`), z); },
        };
      }
      case "bend": {
        const kv = typeof n.k === "function" ? (n.k as (c: Clock) => unknown)(clock) : n.k;
        const [kx, ky] = typeof kv === "object" ? vec(kv as Vec, clock, "bend's [kx, ky]", 2) : [num(kv as Num, clock, "bend's k"), 0], C = go(n.of), Z = Math.max(0, C.hi[2]), off = (z: number) => (z > 0 ? (z * z) / 2 : 0);
        const ex = kx * off(Z), ey = ky * off(Z);
        return {
          m: C.m === NONE ? NONE : (x, y, z, a, b, c) => C.m(x - kx * off(z), y - ky * off(z), z, a, b, c),
          lo: [C.lo[0] + Math.min(0, ex), C.lo[1] + Math.min(0, ey), C.lo[2]], hi: [C.hi[0] + Math.max(0, ex), C.hi[1] + Math.max(0, ey), C.hi[2]],
          lip: C.lip * Math.hypot(1, Math.hypot(kx, ky) * Z),
          e: (c, x, y, z) => { const o = c.v(`${z} > 0 ? (${z} * ${z}) / 2 : 0`); return C.e(c, c.v(`${x} - ${c.k(kx)} * ${o}`), c.v(`${y} - ${c.k(ky)} * ${o}`), z); },
        };
      }
      case "mirror": {
        const C = go(n.of), mx = n.axes.includes("x"), my = n.axes.includes("y"), mz = n.axes.includes("z");
        const lo = [...C.lo] as V3, hi = [...C.hi] as V3;
        [mx, my, mz].forEach((on, e) => { if (on) { const r = Math.max(Math.abs(lo[e]), Math.abs(hi[e])); lo[e] = -r; hi[e] = r; } });
        return {
          m: C.m === NONE ? NONE : (x, y, z, a, b, c) => C.m(mx ? Math.abs(x) : x, my ? Math.abs(y) : y, mz ? Math.abs(z) : z, mx && x < 0 ? -a : a, my && y < 0 ? -b : b, mz && z < 0 ? -c : c),
          lo, hi, lip: C.lip,
          e: (c, x, y, z) => C.e(c, mx ? c.v(`Math.abs(${x})`) : x, my ? c.v(`Math.abs(${y})`) : y, mz ? c.v(`Math.abs(${z})`) : z),
        };
      }
      case "repeat": {
        const s = vec(n.step, clock, "repeat's step"), cnt = vec(n.count, clock, "repeat's count").map((v) => Math.max(0, Math.round(v))), C = go(n.of);
        const q = (v: number, e: number) => (s[e] > 0 ? v - s[e] * Math.max(-cnt[e], Math.min(cnt[e], Math.round(v / s[e]))) : v);
        return {
          m: C.m === NONE ? NONE : (x, y, z, a, b, c) => C.m(q(x, 0), q(y, 1), q(z, 2), a, b, c),
          lo: C.lo.map((v, e) => v - (s[e] > 0 ? s[e] * cnt[e] : 0)) as V3, hi: C.hi.map((v, e) => v + (s[e] > 0 ? s[e] * cnt[e] : 0)) as V3, lip: C.lip,
          e: (c, x, y, z) => {
            const qe = (v: string, e: number) => (s[e] > 0 ? c.v(`${v} - ${c.k(s[e])} * Math.max(-${c.k(cnt[e])}, Math.min(${c.k(cnt[e])}, Math.round(${v} / ${c.k(s[e])})))`) : v);
            return C.e(c, qe(x, 0), qe(y, 1), qe(z, 2));
          },
        };
      }
      case "noise": {
        const amp = num(n.amp, clock, "noise's amp"), sc = pos(num(n.scale, clock, "noise's scale"), "noise's scale"), C = go(n.of), seed = n.seed, oc = n.octaves, A = Math.abs(amp);
        // how steep it can get: a value noise rises at most 1.5 a cell along an axis, each octave twice as
        // fine and half as strong (the sum over the axes would be sqrt 3 times that, never met in practice)
        let S = 0;
        for (let o = 0, a = 0.5, fq = 1; o < oc; o++, a *= 0.5, fq *= 2.03) S += a * fq;
        S /= 1 - 0.5 ** oc;
        const L = 1 + (2 * A * 1.5 * S) / sc;
        return {
          // (far from the surface the noise can't reach it: what it could take away is a bound, and cheap)
          m: C.m,
          lo: C.lo.map((v) => v - A) as V3, hi: C.hi.map((v) => v + A) as V3, lip: C.lip * L,
          e: (c, x, y, z) => {
            const v = C.e(c, x, y, z), AA = c.k(A), SC = c.k(sc);
            return c.v(`${v} > 3 * ${AA} ? ${v} - ${AA} : ${v} + ${c.k(amp)} * (2 * fbm3(${x} / ${SC}, ${y} / ${SC}, ${z} / ${SC}, ${c.k(seed)}, ${c.k(oc)}) - 1)`);
          },
        };
      }
      case "mat": {
        const C = go(n.of), k = idx(n.name);
        return { ...C, m: (x, y, z, a, b, c) => { const v = C.m(x, y, z, a, b, c); return v % 1024 ? v : v + k + 1; } };
      }
      case "paint": {
        const C = go(n.of), k = idx(n.name), where = n.where;
        return { ...C, m: (x, y, z, a, b, c) => { const v = C.m(x, y, z, a, b, c); return where([x, y, z], [a, b, c]) ? v - (v % 1024) + k + 1 : v; } };
      }
      case "paintBy": {
        // (the names it gives join `mats` as they come: a renderer looks up those it hasn't seen)
        const C = go(n.of), by = n.by;
        return { ...C, m: (x, y, z, a, b, c) => { const v = C.m(x, y, z, a, b, c), w = by([x, y, z], [a, b, c]); return typeof w === "string" && w ? v - (v % 1024) + idx(w) + 1 : v; } };
      }
      case "fn": {
        // (its id among the numbers: two such fields are never the same field)
        const fd = n.d, [lo, hi] = shift(n.lo, n.hi);
        return { m: NONE, lo, hi, lip: n.lip, e: (c, x, y, z) => { c.k(n.id); c.F.push(fd); return c.v(`F[${c.F.length - 1}](${x}, ${y}, ${z})`); } };
      }
      case "part": {
        // its full name: the parts round it first; the innermost names a point
        const full = [...prefix, n.name].join("."), k = parts.indexOf(full) >= 0 ? parts.indexOf(full) : parts.push(full) - 1;
        prefix.push(n.name);
        const C = go(n.of);
        prefix.pop();
        return { ...C, m: (x, y, z, a, b, c) => { const v = C.m(x, y, z, a, b, c); return v >= 1024 ? v : v + 1024 * (k + 1); } };
      }
    }
  };
  const P = go(f), raw = P.m, D = written(P.e);
  W = new Int32Array(slots);
  // a material asked for: the distance there once more, writing which child each join takes, then down
  // that way through the joins. The tracking code is the distance's with those lines, the same numbers
  // in the same order: written once for a field of that shape.
  let track: Fd | undefined;
  const tracker = () => {
    let src = TRACKING.get(D.src);
    if (!src) { if (TRACKING.size > 256) TRACKING.clear(); TRACKING.set(D.src, (src = written(P.e, true).src)); }
    return made(src, D.K, D.F, W);
  };
  const mp: Fm = !tracks ? raw : (x, y, z, a, b, c) => { (track ??= tracker())(x, y, z); return raw(x, y, z, a, b, c); };
  return {
    d: made(D.src, D.K, D.F), get key() { return `${D.src}#${D.K.join(",")}`; }, lo: P.lo, hi: P.hi, lip: P.lip, mats, parts, mp,
    m: (x, y, z, a, b, c) => (mp(x, y, z, a, b, c) % 1024) - 1,
    part: (x, y, z, a, b, c) => Math.floor(mp(x, y, z, a, b, c) / 1024) - 1,
  };
}
