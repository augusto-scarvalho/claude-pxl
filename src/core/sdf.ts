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
  | { op: "paint"; of: Sdf; name: string; where: (p: V3, n: V3) => unknown };

/** A field compiled at one moment: its distance, its material (an index into `mats`, -1 none) at a point with its normal, its box, its stretch. */
export interface Compiled {
  d(x: number, y: number, z: number): number;
  m(x: number, y: number, z: number, nx: number, ny: number, nz: number): number;
  lo: V3;
  hi: V3;
  lip: number;
  mats: string[];
}
type Fd = (x: number, y: number, z: number) => number;
type Fm = (x: number, y: number, z: number, nx: number, ny: number, nz: number) => number;
/** A part of a compiled field: its distance and material as functions, its box, its stretch, and `e`, which writes the same distance as code (see Code). */
interface Part { d: Fd; m: Fm; lo: V3; hi: V3; lip: number; e: (c: Code, x: string, y: string, z: string) => string }

const fin = (v: unknown, what: string): number => {
  if (typeof v !== "number" || !Number.isFinite(v)) throw new PxError(`sdf: ${what} must be a number (or a function of the clock giving one), got ${JSON.stringify(v)}`);
  return v;
};
const num = (v: Num, c: Clock, what: string): number => fin(typeof v === "function" ? v(c) : v, what);
const vec = (v: Num | Vec, c: Clock, what: string, n = 3): number[] => {
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
const table = (s: number) => {
  let t = TABLES.get(s);
  if (!t) {
    t = new Float32Array(32 * 32 * 32);
    for (let i = 0; i < 32; i++) for (let j = 0; j < 32; j++) for (let k = 0; k < 32; k++) t[(i << 10) | (j << 5) | k] = lattice(i, j, k, s);
    if (TABLES.size > 64) TABLES.clear();
    TABLES.set(s, t);
  }
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
  /** A material where `where(p, n)` holds: p the point and n its normal, in this field's own frame (moss where n[2] > 0.6). */
  paint(name: string, where: (p: V3, n: V3) => unknown): Sdf {
    if (typeof name !== "string" || !name || typeof where !== "function") throw new PxError("sdf: paint(name, (p, n) => true where it is that material)");
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
/** How much matter there is, 0..1: fog, smoke. From a distance field: 1 deeper than `edge` m inside, 0 outside, smooth between. */
export class Density {
  readonly kind = "density";
  readonly of: Sdf;
  readonly edge: number;
  constructor(of: Sdf, edge = 0.1) { needSdf(of, "density"); this.of = of; this.edge = pos(edge, "density's edge"); }
  at(p: readonly number[], clock: Clock = STILL): number { const t = Math.max(0, Math.min(1, -this.of.dist(p, clock) / this.edge)); return t * t * (3 - 2 * t); }
  bounds(clock: Clock = STILL): [V3, V3] { return this.of.bounds(clock); }
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
  /** An ellipsoid round the origin, radii [x, y, z]. */
  ellipsoid: (r: Vec) => new Sdf({ op: "ellipsoid", r }),
  union: (...a: (Sdf | Sdf[] | { smooth?: Num })[]) => join("union", a),
  intersect: (...a: (Sdf | Sdf[] | { smooth?: Num })[]) => join("intersect", a),
  /** Seeded 3D noise in [0, 1] (what noise() pushes the surface by), for paint()'s regions: moss in patches. */
  fbm: (x: number, y: number, z: number, seed = 0, octaves = 2) => fbm3(x, y, z, seed, octaves),
  occupancy: (f: Sdf) => new Occupancy(f),
  density: (f: Sdf, o: { edge?: number } = {}) => new Density(f, o?.edge),
  appearance: (f: Sdf) => new Appearance(f),
};

// ---------------------------------------------------------------- compiling
const INF = Infinity;
const smin = (a: number, b: number, k: number) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
/** How far a point is outside a box (0 inside): a child farther than the best so far can't be nearer. */
const boxOut = (lo: V3, hi: V3, x: number, y: number, z: number) => {
  const dx = Math.max(lo[0] - x, 0, x - hi[0]), dy = Math.max(lo[1] - y, 0, y - hi[1]), dz = Math.max(lo[2] - z, 0, z - hi[2]);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};
const NONE: Fm = () => -1;
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
  private n = 0;
  /** a number of the field, by reference (its value changes with the clock, the code doesn't) */
  k(v: number): string { this.K.push(v); return `K[${this.K.length - 1}]`; }
  /** a new name for a value */
  v(expr: string, mutable = false): string { const name = `v${this.n++}`; this.lines.push(`${mutable ? "let" : "const"} ${name} = ${expr};`); return name; }
  line(s: string): void { this.lines.push(s); }
}
type Factory = (K: number[], smin: (a: number, b: number, k: number) => number, fbm: typeof fbm3) => Fd;
const FACTORIES = new Map<string, Factory>();
function written(P: Part): Fd {
  const c = new Code(), r = P.e(c, "x", "y", "z"), src = `return (x, y, z) => {\n${c.lines.join("\n")}\nreturn ${r};\n}`;
  let f = FACTORIES.get(src);
  if (!f) {
    f = new Function("K", "smin", "fbm3", src) as Factory;
    if (FACTORIES.size > 256) FACTORIES.clear();
    FACTORIES.set(src, f);
  }
  return f(c.K, smin, fbm3);
}

/** The field at a moment, as functions. Materials are numbered in `mats`. */
export function compile(f: Sdf, clock: Clock = STILL): Compiled {
  needSdf(f, "compile");
  const mats: string[] = [];
  const idx = (name: string) => { const i = mats.indexOf(name); return i >= 0 ? i : mats.push(name) - 1; };
  // (a primitive moved by at() takes the move itself, (ox, oy, oz): one function a point, not two)
  const go = (s: Sdf, ox = 0, oy = 0, oz = 0): Part => {
    const n = s.node;
    const shift = (lo: V3, hi: V3): [V3, V3] => [[lo[0] + ox, lo[1] + oy, lo[2] + oz], [hi[0] + ox, hi[1] + oy, hi[2] + oz]];
    switch (n.op) {
      case "sphere": {
        const r = pos(num(n.r, clock, "sphere's r"), "sphere's r"), [lo, hi] = shift([-r, -r, -r], [r, r, r]);
        return {
          d: (x, y, z) => { x -= ox; y -= oy; z -= oz; return Math.sqrt(x * x + y * y + z * z) - r; }, m: NONE, lo, hi, lip: 1,
          e: (c, x, y, z) => { const a = c.v(`${x} - ${c.k(ox)}`), b = c.v(`${y} - ${c.k(oy)}`), d = c.v(`${z} - ${c.k(oz)}`); return c.v(`Math.sqrt(${a} * ${a} + ${b} * ${b} + ${d} * ${d}) - ${c.k(r)}`); },
        };
      }
      case "box": {
        const s = vec(n.size, clock, "box's size").map((v) => pos(v, "box's size") / 2), rd = Math.max(0, Math.min(num(n.round, clock, "box's round"), ...s));
        const bx = s[0] - rd, by = s[1] - rd, bz = s[2] - rd, [lo, hi] = shift([-s[0], -s[1], -s[2]], [s[0], s[1], s[2]]);
        return {
          d: (x, y, z) => {
            const qx = Math.abs(x - ox) - bx, qy = Math.abs(y - oy) - by, qz = Math.abs(z - oz) - bz, ex = Math.max(qx, 0), ey = Math.max(qy, 0), ez = Math.max(qz, 0);
            return Math.sqrt(ex * ex + ey * ey + ez * ez) + Math.min(Math.max(qx, qy, qz), 0) - rd;
          }, m: NONE, lo, hi, lip: 1,
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
          d: (x, y, z) => {
            const px = x - a[0], py = y - a[1], pz = z - a[2], h = Math.max(0, Math.min(1, (px * bax + py * bay + pz * baz) / bb));
            const dx = px - bax * h, dy = py - bay * h, dz = pz - baz * h;
            return Math.sqrt(dx * dx + dy * dy + dz * dz) - (r1 + (r2 - r1) * h);
          }, m: NONE,
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
          d: (x, y, z) => { x -= ox; y -= oy; z -= oz; const dx = Math.sqrt(x * x + y * y) - r, dz = Math.abs(z - h) - h; return Math.min(Math.max(dx, dz), 0) + Math.hypot(Math.max(dx, 0), Math.max(dz, 0)); },
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
          d: (x, y, z) => {
            x -= ox; y -= oy;
            const qx = Math.sqrt(x * x + y * y), qy = z - oz - h;
            const cax = qx - Math.min(qx, qy < 0 ? r1 : r2), cay = Math.abs(qy) - h;
            const t = Math.max(0, Math.min(1, ((r2 - qx) * k2x + (h - qy) * k2y) / kk)), cbx = qx - r2 + k2x * t, cby = qy - h + k2y * t;
            return (cbx < 0 && cay < 0 ? -1 : 1) * Math.sqrt(Math.min(cax * cax + cay * cay, cbx * cbx + cby * cby));
          }, m: NONE, lo, hi, lip: 1,
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
          d: (x, y, z) => { x -= ox; y -= oy; const q = Math.sqrt(x * x + y * y) - R, w = z - oz; return Math.sqrt(q * q + w * w) - r; }, m: NONE, lo, hi, lip: 1,
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
        return { d: (x, y, z) => x * nx + y * ny + z * nz - h, m: NONE, lo, hi, lip: 1, e: (c, x, y, z) => c.v(`${x} * ${c.k(nx)} + ${y} * ${c.k(ny)} + ${z} * ${c.k(nz)} - ${c.k(h)}`) };
      }
      case "ellipsoid": {
        const r = vec(n.r, clock, "ellipsoid's r").map((v) => pos(v, "ellipsoid's r")), [a, b, c] = r, ia = 1 / a, ib = 1 / b, ic = 1 / c, [lo, hi] = shift([-a, -b, -c], [a, b, c]);
        return {
          d: (x, y, z) => {
            const X = (x - ox) * ia, Y = (y - oy) * ib, Z = (z - oz) * ic, k0 = Math.sqrt(X * X + Y * Y + Z * Z), X2 = X * ia, Y2 = Y * ib, Z2 = Z * ic, k1 = Math.sqrt(X2 * X2 + Y2 * Y2 + Z2 * Z2);
            return k1 > 1e-12 ? (k0 * (k0 - 1)) / k1 : -Math.min(a, b, c);
          }, m: NONE, lo, hi, lip: 1.1,
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
        const N = ps.length, ds = ps.map((p) => p.d), bx = new Float64Array(N * 7);
        ps.forEach((p, i) => bx.set([...p.lo, ...p.hi, p.lip], i * 7));
        // the nearest child (a union) or the farthest (an intersection), and the distance joined
        const which = new Int32Array(1);
        const d: Fd = uni
          ? (x, y, z) => {
            let best = INF, w = -1;
            for (let i = 0, o = 0; i < N; i++, o += 7) {
              // (its box farther than the best so far: it can't be nearer, nor melt in, so skip it)
              const ex = Math.max(bx[o] - x, 0, x - bx[o + 3]), ey = Math.max(bx[o + 1] - y, 0, y - bx[o + 4]), ez = Math.max(bx[o + 2] - z, 0, z - bx[o + 5]), lim = best + k;
              if (lim < 0 || (ex * ex + ey * ey + ez * ez) * bx[o + 6] * bx[o + 6] >= lim * lim) continue;
              const v = ds[i](x, y, z);
              if (w < 0) { best = v; w = i; continue; }   // (the first is always looked at: best starts endless)
              if (v < best) w = i;
              best = k > 0 ? smin(best, v, k) : Math.min(best, v);
            }
            which[0] = w;
            return best;
          }
          : (x, y, z) => {
            let best = -INF, w = 0, raw = -INF;
            for (let i = 0; i < N; i++) {
              const v = ps[i].d(x, y, z);
              if (v > raw) { raw = v; w = i; }
              best = i === 0 ? v : k > 0 ? -smin(-best, -v, k) : Math.max(best, v);
            }
            which[0] = w;
            return best;
          };
        const e = (c: Code, x: string, y: string, z: string) => {
          const K = c.k(k), u = c.v(ps[0].e(c, x, y, z), true);
          for (let i = 1; i < N; i++) {
            c.line("{");
            if (uni) {
              // (its box farther than the best so far: it can't be nearer, nor melt in, so skip it)
              const o = i * 7, L = c.k(bx[o + 6]);
              const ex = c.v(`Math.max(${c.k(bx[o])} - ${x}, 0, ${x} - ${c.k(bx[o + 3])})`), ey = c.v(`Math.max(${c.k(bx[o + 1])} - ${y}, 0, ${y} - ${c.k(bx[o + 4])})`), ez = c.v(`Math.max(${c.k(bx[o + 2])} - ${z}, 0, ${z} - ${c.k(bx[o + 5])})`), lim = c.v(`${u} + ${K}`);
              c.line(`if (!(${lim} < 0 || (${ex} * ${ex} + ${ey} * ${ey} + ${ez} * ${ez}) * ${L} * ${L} >= ${lim} * ${lim})) {`);
              const v = ps[i].e(c, x, y, z);
              c.line(`${u} = ${k > 0 ? `smin(${u}, ${v}, ${K})` : `Math.min(${u}, ${v})`};`);
              c.line("}");
            } else {
              const v = ps[i].e(c, x, y, z);
              c.line(`${u} = ${k > 0 ? `-smin(-${u}, -${v}, ${K})` : `Math.max(${u}, ${v})`};`);
            }
            c.line("}");
          }
          return u;
        };
        return { d, m: (x, y, z, a, b, c) => { d(x, y, z); return ps[which[0]].m(x, y, z, a, b, c); }, lo, hi, lip, e };
      }
      case "subtract": {
        const [A, B] = n.of.map((o) => go(o)), k = Math.max(0, num(n.k, clock, "subtract's smooth"));
        return {
          d: (x, y, z) => { const a = A.d(x, y, z); if (boxOut(B.lo, B.hi, x, y, z) * B.lip > Math.max(0, -a) + k) return a; const b = -B.d(x, y, z); return k > 0 ? -smin(-a, -b, k) : Math.max(a, b); },
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
          d: (x, y, z) => C.d(x - vx, y - vy, z - vz), m: (x, y, z, a, b, c) => C.m(x - vx, y - vy, z - vz, a, b, c), lo: [C.lo[0] + vx, C.lo[1] + vy, C.lo[2] + vz], hi: [C.hi[0] + vx, C.hi[1] + vy, C.hi[2] + vz], lip: C.lip,
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
          d: (x, y, z) => C.d(M[0] * x + M[3] * y + M[6] * z, M[1] * x + M[4] * y + M[7] * z, M[2] * x + M[5] * y + M[8] * z),
          m: (x, y, z, a, b, c) => C.m(M[0] * x + M[3] * y + M[6] * z, M[1] * x + M[4] * y + M[7] * z, M[2] * x + M[5] * y + M[8] * z, M[0] * a + M[3] * b + M[6] * c, M[1] * a + M[4] * b + M[7] * c, M[2] * a + M[5] * b + M[8] * c),
          lo, hi, lip: C.lip,
          e: (c, x, y, z) => { const m = M.map((v) => c.k(v)); return C.e(c, c.v(`${m[0]} * ${x} + ${m[3]} * ${y} + ${m[6]} * ${z}`), c.v(`${m[1]} * ${x} + ${m[4]} * ${y} + ${m[7]} * ${z}`), c.v(`${m[2]} * ${x} + ${m[5]} * ${y} + ${m[8]} * ${z}`)); },
        };
      }
      case "scale": {
        const [sx, sy, sz] = vec(n.s, clock, "scale").map((v) => pos(v, "scale")), C = go(n.of), k = Math.min(sx, sy, sz);
        const lo: V3 = [C.lo[0] * sx, C.lo[1] * sy, C.lo[2] * sz], hi: V3 = [C.hi[0] * sx, C.hi[1] * sy, C.hi[2] * sz];
        return {
          d: (x, y, z) => C.d(x / sx, y / sy, z / sz) * k, m: (x, y, z, a, b, c) => C.m(x / sx, y / sy, z / sz, a * sx, b * sy, c * sz), lo, hi, lip: C.lip,
          e: (c, x, y, z) => c.v(`${C.e(c, c.v(`${x} / ${c.k(sx)}`), c.v(`${y} / ${c.k(sy)}`), c.v(`${z} / ${c.k(sz)}`))} * ${c.k(k)}`),
        };
      }
      case "twist": {
        const k = (num(n.deg, clock, "twist's deg") * Math.PI) / 180, C = go(n.of), R = Math.max(...[C.lo[0], C.lo[1], C.hi[0], C.hi[1]].map(Math.abs)) * Math.SQRT2;
        return {
          d: (x, y, z) => { const g = -k * z, c = Math.cos(g), si = Math.sin(g); return C.d(c * x - si * y, si * x + c * y, z); },
          m: (x, y, z, a, b, cc) => { const g = -k * z, c = Math.cos(g), si = Math.sin(g); return C.m(c * x - si * y, si * x + c * y, z, c * a - si * b, si * a + c * b, cc); },
          lo: [-R, -R, C.lo[2]], hi: [R, R, C.hi[2]], lip: C.lip * Math.hypot(1, k * R),
          e: (c, x, y, z) => { const g = c.v(`-${c.k(k)} * ${z}`), co = c.v(`Math.cos(${g})`), si = c.v(`Math.sin(${g})`); return C.e(c, c.v(`${co} * ${x} - ${si} * ${y}`), c.v(`${si} * ${x} + ${co} * ${y}`), z); },
        };
      }
      case "bend": {
        const [kx, ky] = typeof n.k === "object" ? vec(n.k, clock, "bend's [kx, ky]", 2) : [num(n.k as Num, clock, "bend's k"), 0], C = go(n.of), Z = Math.max(0, C.hi[2]), off = (z: number) => (z > 0 ? (z * z) / 2 : 0);
        const ex = kx * off(Z), ey = ky * off(Z);
        return {
          d: (x, y, z) => C.d(x - kx * off(z), y - ky * off(z), z),
          m: (x, y, z, a, b, c) => C.m(x - kx * off(z), y - ky * off(z), z, a, b, c),
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
          d: (x, y, z) => C.d(mx ? Math.abs(x) : x, my ? Math.abs(y) : y, mz ? Math.abs(z) : z),
          m: (x, y, z, a, b, c) => C.m(mx ? Math.abs(x) : x, my ? Math.abs(y) : y, mz ? Math.abs(z) : z, mx && x < 0 ? -a : a, my && y < 0 ? -b : b, mz && z < 0 ? -c : c),
          lo, hi, lip: C.lip,
          e: (c, x, y, z) => C.e(c, mx ? c.v(`Math.abs(${x})`) : x, my ? c.v(`Math.abs(${y})`) : y, mz ? c.v(`Math.abs(${z})`) : z),
        };
      }
      case "repeat": {
        const s = vec(n.step, clock, "repeat's step"), cnt = vec(n.count, clock, "repeat's count").map((v) => Math.max(0, Math.round(v))), C = go(n.of);
        const q = (v: number, e: number) => (s[e] > 0 ? v - s[e] * Math.max(-cnt[e], Math.min(cnt[e], Math.round(v / s[e]))) : v);
        return {
          d: (x, y, z) => C.d(q(x, 0), q(y, 1), q(z, 2)), m: (x, y, z, a, b, c) => C.m(q(x, 0), q(y, 1), q(z, 2), a, b, c),
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
          d: (x, y, z) => { const v = C.d(x, y, z); return v > 3 * A ? v - A : v + amp * (2 * fbm3(x / sc, y / sc, z / sc, seed, oc) - 1); }, m: C.m,
          lo: C.lo.map((v) => v - A) as V3, hi: C.hi.map((v) => v + A) as V3, lip: C.lip * L,
          e: (c, x, y, z) => {
            const v = C.e(c, x, y, z), AA = c.k(A), SC = c.k(sc);
            return c.v(`${v} > 3 * ${AA} ? ${v} - ${AA} : ${v} + ${c.k(amp)} * (2 * fbm3(${x} / ${SC}, ${y} / ${SC}, ${z} / ${SC}, ${c.k(seed)}, ${c.k(oc)}) - 1)`);
          },
        };
      }
      case "mat": {
        const C = go(n.of), k = idx(n.name);
        return { ...C, m: (x, y, z, a, b, c) => { const v = C.m(x, y, z, a, b, c); return v < 0 ? k : v; } };
      }
      case "paint": {
        const C = go(n.of), k = idx(n.name), where = n.where;
        return { ...C, m: (x, y, z, a, b, c) => (where([x, y, z], [a, b, c]) ? k : C.m(x, y, z, a, b, c)) };
      }
    }
  };
  const P = go(f);
  return { d: written(P), m: P.m, lo: P.lo, hi: P.hi, lip: P.lip, mats };
}
