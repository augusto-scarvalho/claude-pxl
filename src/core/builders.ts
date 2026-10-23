// A small library of 3D builders with semantic parameters (in the spirit of ShapeLib and ProcFunc): a
// tree, a rock, a mushroom house, a crystal, a mist, smoke. Each says what it is made of in named parts
// (a tree's trunk, branches and canopy; a house's stem, door, cap, chimney), the details scattered on it
// (leaves, moss, snow), the decals pinned to it (a door, windows, a rune), the points others attach to
// (sockets: the chimney's top), and takes parameters that mean something (canopy, twist, wind, moss,
// snow) rather than radii. Each part's random choices come from its own seed, so changing one part's
// parameter leaves the others' numbers as they were. The fields are those of examples/sdf/kit.px.js.
import { PxError } from "./errors.ts";
import type { ScatterOpts } from "./scatter.ts";
import { type Clock, Density, type DensityOpts, Sdf, type V3, fbm3, sdf } from "./sdf.ts";
import { hash, rng } from "./util.ts";

const TAU = 2 * Math.PI;
/** A decal a builder pins: an asset (by name), where on its field, its other views, lit or glowing. */
export interface BuiltDecal { asset: string; point: V3; views?: { three?: string; profile?: string }; lit?: boolean; mode?: "pin" | "wrap"; size?: number; up?: number[] }
/** What a builder makes: a solid (a field, its named parts) or air (a density and how it is drawn); details, decals, sockets. */
export interface Built {
  field?: Sdf;
  density?: Density;
  /** air: its ramp's material name, how thick, glowing (volume()'s options) */
  look?: { ramp: string; thickness?: number; ambient?: number; cast?: number; emit?: { ramp: string; strength?: number; glow?: number } };
  /** its named parts as fields of their own (what the world fingerprints, and what expects read) */
  parts: Record<string, Sdf>;
  /** details scattered on it: sdf.scatter's options, by name */
  details: Record<string, ScatterOpts>;
  decals: Record<string, BuiltDecal>;
  sockets: Record<string, V3>;
  /** which of its parameters move with the wind */
  windy?: boolean;
}
type P = Record<string, unknown>;
const n = (p: P, k: string, d: number, who: string): number => {
  const v = p[k] ?? d;
  if (typeof v !== "number" || !Number.isFinite(v)) throw new PxError(`${who}: ${k} is a number, got ${JSON.stringify(v)}`);
  return v;
};
const known = (p: P, keys: string[], who: string) => {
  const bad = Object.keys(p).filter((k) => !keys.includes(k));
  if (bad.length) throw new PxError(`${who}: no parameter ${bad.join(", ")} (it has: ${keys.join(", ")})`);
};
/** A part's own seed: the thing's seed and the part's name. */
export const partSeed = (seed: number, part: string) => hash(seed, [...part].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) | 0, 7), 977) % 100000;

/**
 * A broadleaf: a trunk flaring into roots and forking, `limbs` limbs climbing from the fork, each
 * kinking (`twist`), a canopy of lobes at their tips melted with noise (`canopy`: how full, 1 as it
 * is drawn in the kit, more lobes and bigger past it), `leaves` leaf clusters to a square meter on it (0
 * none), swaying in the `wind` (m at its top; [x, y] a direction: [-0.2, 0] blows to the left).
 */
export function tree(p: P = {}): Built {
  const who = "make3d.tree";
  known(p, ["height", "limbs", "twist", "lobe", "canopy", "leaves", "wind", "seed"], who);
  const height = n(p, "height", 4.4, who), limbs = n(p, "limbs", 3, who), twist = n(p, "twist", 0.35, who), lobe = n(p, "lobe", 0.9, who), canopy = n(p, "canopy", 1, who), leavesN = n(p, "leaves", 0, who), seed = n(p, "seed", 7, who);
  const wind = p.wind ?? 0.2;
  if (!(typeof wind === "number" || (Array.isArray(wind) && wind.length === 2 && wind.every(Number.isFinite)))) throw new PxError(`${who}: wind is m at its top, or [x, y], got ${JSON.stringify(wind)}`);
  const R = rng(seed), H = height / 4.4, fork: V3 = [0, 0, 1.6 * H], wood: Sdf[] = [], lobes: Sdf[] = [];
  const trunk = sdf.capsule([0, 0, 0], fork, 0.2, 0.13).union(sdf.capsule([0, 0, 0.25], [-0.55, -0.25, -0.05], 0.11, 0.04), sdf.capsule([0, 0, 0.25], [0.5, 0.3, -0.05], 0.1, 0.04), { smooth: 0.15 });
  wood.push(trunk.part("trunk"));
  const tips: V3[] = [], branches: Sdf[] = [];
  for (let i = 0; i < limbs; i++) {
    const az = Math.PI + (i * TAU) / limbs + (R() - 0.5) * 0.5, up = ((45 + R() * 15) * Math.PI) / 180, len = (1.1 + R() * 0.3) * H;
    const dir = (a: number, e: number): V3 => [Math.cos(a) * Math.cos(e), Math.sin(a) * Math.cos(e), Math.sin(e)];
    const d1 = dir(az, up), mid = fork.map((v, k) => v + d1[k] * len * 0.5) as V3;
    const d2 = dir(az + (i % 2 ? 1 : -1) * twist, up + 0.15), tip = mid.map((v, k) => v + d2[k] * len * 0.5) as V3;
    const a = sdf.capsule(fork, mid, 0.11, 0.08), b = sdf.capsule(mid, tip, 0.08, 0.05);
    wood.push(a.part("branches"), b.part("branches"));
    branches.push(a, b);
    tips.push(tip);
  }
  const top: V3 = [0, 0, fork[2] + 1.9 * H];
  const at: V3[] = [...tips.map((t): V3 => [t[0] * 1.1, t[1] * 1.1, t[2] + 0.4]), top, ...tips.map((t, i): V3 => { const u = tips[(i + 1) % tips.length]; return [(t[0] + u[0]) * 0.5, (t[1] + u[1]) * 0.5, (t[2] + u[2]) / 2 + 0.75]; })];
  const grow = canopy === 1 ? 1 : canopy ** 0.35;
  at.forEach((q, i) => {
    const r = lobe * (i < tips.length ? 0.85 : i === tips.length ? 1.05 : 0.75) * (0.9 + R() * 0.2) * grow, ph = R();
    lobes.push(sdf.ellipsoid([r, r, r * 0.8]).at((c: Clock) => [q[0] + 0.05 * Math.sin(TAU * (2 * c.phase + ph)), q[1], q[2]]));
  });
  // fuller: lobes more round the crown, from a seed of their own
  if (canopy > 1) {
    const R2 = rng(partSeed(seed, "canopy")), extra = Math.round((canopy - 1) * 5);
    for (let k = 0; k < extra; k++) {
      const a = R2() * TAU, rr = 0.9 + R2() * 0.6, z = top[2] - 0.6 - R2() * 0.9, r = lobe * 0.7 * grow * (0.9 + R2() * 0.2), ph = R2();
      lobes.push(sdf.ellipsoid([r, r, r * 0.8]).at((c: Clock) => [Math.cos(a) * rr + 0.05 * Math.sin(TAU * (2 * c.phase + ph)), Math.sin(a) * rr, z]));
    }
  }
  const crown = sdf.union(lobes, { smooth: 0.15 }).noise({ amp: 0.14, scale: 0.45, seed, octaves: 1 });
  // the wind: the top `wind` m over at the gust, half that between
  const k = (w: number) => (c: Clock) => (2 * w * (0.45 + 0.55 * Math.sin(TAU * c.phase))) / (height * height);
  const field = sdf.union(wood, { smooth: 0.08 }).mat("bark").union(crown.mat("leaf").part("canopy"))
    .bend(typeof wind === "number" ? k(wind) : (c: Clock) => [k((wind as number[])[0])(c), k((wind as number[])[1])(c)]);
  return {
    field, windy: true, decals: {}, sockets: { top },
    parts: { trunk: trunk.mat("bark"), branches: sdf.union(branches).mat("bark"), canopy: crown.mat("leaf") },
    details: leavesN > 0 ? { leaves: { on: "leaf", count: leavesN, brush: "cluster", size: 0.1, vary: 0, seed: partSeed(seed, "leaves"), flutter: 0.03 } } : {},
  };
}

/** A boulder of planes, moss where it faces up (`moss` 0..1: how much; patches drawn on it, and tufts scattered there), `size` m. */
export function rock(p: P = {}): Built {
  const who = "make3d.rock";
  known(p, ["size", "seed", "moss"], who);
  const size = n(p, "size", 0.9, who), seed = n(p, "seed", 3, who), moss = n(p, "moss", 0, who), R = rng(seed), cuts: Sdf[] = [];
  for (let i = 0; i < 9; i++) {
    const a = (i * TAU) / 9 + R() * 0.5, e = ((R() * 70 - 15) * Math.PI) / 180;
    cuts.push(sdf.plane([Math.cos(a) * Math.cos(e), Math.sin(a) * Math.cos(e), Math.sin(e)], size * (0.62 + R() * 0.12)));
  }
  const stone = sdf.ellipsoid([size, size * 0.8, size * 0.62]).intersect(...cuts, { smooth: 0.06 }).noise({ amp: 0.04, scale: 0.3, seed, octaves: 1 })
    .at(0, 0, size * 0.42).intersect(sdf.plane([0, 0, -1], 0)).mat("stone");
  const field = stone.paint("moss", (q, nn) => nn[2] > 0.72 && fbm3(q[0] * 2.2, q[1] * 2.2, q[2] * 2.2, seed) > 0.42).part("stone");
  return {
    field, parts: { stone }, decals: {}, sockets: { top: [0, 0, size * 0.42 + size * 0.62] },
    details: moss > 0 ? { moss: { up: 0.66, count: 220 * moss, brush: "clump", size: 0.05, vary: 1, mat: "moss", seed: partSeed(seed, "moss"), where: (q) => fbm3(q[0] * 2.2, q[1] * 2.2, q[2] * 2.2, seed) > 0.62 - 0.3 * moss } } : {},
  };
}

/** A mushroom house: a stem with a door and a window lit from inside, a spotted cap, a chimney (socket "chimney"); `snow` 0..1 on its cap; `door`, `window`, `sign`: decals' asset names pinned on it. */
export function house(p: P = {}): Built {
  const who = "make3d.house";
  known(p, ["seed", "snow", "door", "window", "sign"], who);
  const seed = n(p, "seed", 5, who), snow = n(p, "snow", 0, who);
  const stem = sdf.cone(0.78, 1.5, 0.6).union(sdf.torus(0.66, 0.1).at(0, 0, 0.1), { smooth: 0.15 }).mat("stem");
  const door = sdf.box([0.5, 0.4, 0.9], { round: 0.04 }).union(sdf.cylinder(0.25, 0.4).rotate(90, "x").at(0, 0.2, 0.9)).at(0, -0.75, 0.45);
  const window = sdf.cylinder(0.14, 0.4).rotate(90, "x").at(0.42, -0.6, 1.05);
  const body = stem.subtract(door, window).part("stem")
    .union(sdf.box([0.42, 0.06, 0.8]).at(0, -0.58, 0.4).union(sdf.sphere(0.04).at(0.13, -0.62, 0.45)).mat("door").part("door"), sdf.cylinder(0.13, 0.08).rotate(90, "x").at(0.42, -0.52, 1.05).mat("glow").part("window"));
  const R = rng(seed), spots = Array.from({ length: 11 }, (_, i) => { const a = (i * TAU) / 11 + R() * 0.8, e = 0.3 + R() * 1; return [Math.cos(a) * Math.cos(e), Math.sin(a) * Math.cos(e), Math.sin(e)]; });
  const cap = sdf.ellipsoid([1.3, 1.3, 0.85]).intersect(sdf.plane([0, 0, -1], -0.1)).at(0, 0, 1.4).mat("cap")
    .paint("spot", (q, nn) => spots.some((s) => s[0] * nn[0] + s[1] * nn[1] + s[2] * nn[2] > 0.982));
  const chimney = sdf.cylinder(0.12, 0.6).at(0.45, 0.35, 1.85).union(sdf.cylinder(0.16, 0.08).at(0.45, 0.35, 2.4)).mat("door");
  const decals: Record<string, BuiltDecal> = {};
  if (typeof p.door === "string") decals.door = { asset: p.door, point: [0, -0.62, 0.55] };
  if (typeof p.window === "string") decals.window = { asset: p.window, point: [-0.45, -0.6, 1.0] };
  if (typeof p.sign === "string") decals.sign = { asset: p.sign, point: [0, -0.7, 1.12] };
  return {
    field: body.union(cap.part("cap"), chimney.part("chimney")), decals, sockets: { chimney: [0.45, 0.35, 2.48] },
    parts: { stem, cap, chimney },
    details: snow > 0 ? { snow: { up: 0.45, count: 260 * snow, brush: "clump", size: 0.06, vary: 1, mat: "snow", seed: partSeed(seed, "snow"), where: (q) => q[2] > 1.5 } } : {},
  };
}

/** Crystals on a rock: three hexagonal prisms with pointed tips leaning apart; `rune`: a glowing decal's asset on the tallest. */
export function crystal(p: P = {}): Built {
  const who = "make3d.crystal";
  known(p, ["seed", "rune"], who);
  const seed = n(p, "seed", 2, who);
  const prism = (r: number, h: number) => {
    const sides = [0, 1, 2, 3, 4, 5].map((k) => { const a = (k * TAU) / 6; return sdf.plane([Math.cos(a), Math.sin(a), 0], r); });
    const tip = [0, 1, 2, 3, 4, 5].map((k) => { const a = (k * TAU) / 6, e = 0.6; return sdf.plane([Math.cos(a) * Math.cos(e), Math.sin(a) * Math.cos(e), Math.sin(e)], (h - r * 0.9) * Math.sin(e) + r * Math.cos(e)); });
    return sdf.cylinder(r * 1.2, h + 0.1).intersect(...sides, ...tip);
  };
  const gems = sdf.union(prism(0.2, 1.3), prism(0.15, 0.95).rotate(-30, "y").rotate(25).at(0.14, 0.04, 0), prism(0.13, 0.75).rotate(34, "y").rotate(-50).at(-0.12, -0.05, 0), prism(0.1, 0.5).rotate(40, "x").at(0, -0.12, 0)).mat("gem");
  const base = rock({ size: 0.45, seed }).field!;
  const decals: Record<string, BuiltDecal> = typeof p.rune === "string" ? { rune: { asset: p.rune, point: [0.0, -0.21, 1.0], lit: false } } : {};
  return { field: gems.at(0, 0, 0.12).part("gems").union(base), parts: { gems, base }, details: {}, decals, sockets: { tip: [0, 0, 1.4] } };
}

/** A mist lying low: `color` (its ramp's material is "mist_<color>"), `size` [x, y] m, creeping with the `wind`. */
export function mist(p: P = {}): Built {
  const who = "make3d.mist";
  known(p, ["color", "size", "seed", "wind"], who);
  const color = String(p.color ?? "grey"), size = (p.size ?? [5.6, 3.6]) as number[], seed = n(p, "seed", 6, who), wind = (p.wind ?? [0.2, 0]) as number[];
  const flow = [wind[0] * 12, wind[1] * 12 + 0.6, 0];
  const density = new Density(sdf.ellipsoid([size[0] / 2, size[1] / 2, 0.6]).at(0, 0, 0.1), { edge: 0.6, noise: 0.6, scale: 0.8, seed, octaves: 3, flow, fade: [0.1, 0.7] } as DensityOpts);
  return { density, look: { ramp: `mist_${color}`, thickness: 1.4 }, parts: {}, details: {}, decals: {}, sockets: {}, windy: true };
}

/** Smoke rising from where it is attached (a chimney), leaning with the `wind`. */
export function smoke(p: P = {}): Built {
  const who = "make3d.smoke";
  known(p, ["seed", "wind", "color"], who);
  const seed = n(p, "seed", 8, who), wind = (p.wind ?? [0.2, 0]) as number[], color = String(p.color ?? "grey");
  const density = new Density(sdf.capsule([0, 0, 0.05], [wind[0] * 2.7, 0.15 + wind[1] * 2.7, 2.7], 0.14, 0.55), { edge: 0.2, noise: 0.3, scale: 0.25, seed, octaves: 3, flow: [0.2, 0, 2.6], fade: [1.2, 2.8] });
  return { density, look: { ramp: `smoke_${color}`, thickness: 4 }, parts: {}, details: {}, decals: {}, sockets: {}, windy: true };
}

export const BUILDERS: Record<string, (p: P) => Built> = { tree, rock, house, crystal, mist, smoke };
/** make3d.tree({ ... }) and the rest, as art files call them. */
export const make3d = Object.fromEntries(Object.entries(BUILDERS).map(([k, f]) => [k, (p: P = {}) => f(p)])) as Record<string, (p?: P) => Built>;
export { Sdf };
