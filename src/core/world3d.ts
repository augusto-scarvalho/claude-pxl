// A scene as data: named parts, each made by a builder (builders.ts) with its parameters and its own
// seed, placed by relations (at, on, beside, around, attached to a socket), and a wind the swaying ones
// share. Built part by part and fingerprinted part by part (its fields' code and numbers, its details,
// its decals, where it stands over the loop), so a local edit ("a denser canopy, twistier branches,
// wind from the left, a bluish ground mist") changes only the parts it names and what depends on them,
// and says which; the rest stays byte for byte as it was. Drawn by draw3d() through any view (each
// pixel knowing its part, for pxl steps --at); checked by expect3d()'s rules (MoVer's spirit: what
// should hold over the loop, run by pxl check).
import { BUILDERS, type Built, partSeed } from "./builders.ts";
import { PxError } from "./errors.ts";
import { type Clock, Density, STILL, Sdf, type V3, compile, compileDensity } from "./sdf.ts";
import { peel, scatter } from "./scatter.ts";
import type { Splats } from "./splats.ts";
import { type Voxels, surfaceNets } from "./grids.ts";

/** How a solid is drawn: surface() (rays to its surface), voxels(), splats() or mesh() of its surface. */
export const AS = ["surface", "voxels", "splats", "mesh"];

export interface PartSpec {
  make: string;
  params?: Record<string, unknown>;
  seed?: number;
  /** where it stands, [x, y] or [x, y, z] m (or a function of the clock) */
  at?: number[] | ((c: Clock) => number[]);
  /** beside another: [part, "left" | "right" | "front" | "behind", gap m] */
  beside?: [string, string, number?];
  /** on another's top */
  on?: string;
  /** where another stands (a mist round a house) */
  around?: string;
  /** at another's socket: [part, socket] (smoke at a chimney) */
  attach?: [string, string];
  /** on a path: [points [x, y] or [x, y, z] m, s m along it from its first point] (straight on past its ends); a row is a part a step of s */
  along?: [number[][], number];
  /** kept clear of another's box, seen from above: [part, gap m]; where it would stand in it, moved out the shorter way (x or y) */
  apart?: [string, number?];
  /** its own materials, over draw3d's (a birch's bark beside an oak's) */
  mats?: Record<string, unknown>;
  /** air: how it is drawn, over its builder's look (ramp: the keys themselves, thickness, ambient, cast, emit) */
  look?: Partial<NonNullable<Built["look"]>>;
  /** a solid drawn as "surface" (default), "voxels", "splats" or "mesh", over draw3d's */
  as?: string;
}
export interface WorldSpec {
  seed?: number;
  /** the wind the swaying parts share: where it comes from, m at a tree's top */
  wind?: { from?: "left" | "right" | "front" | "behind"; strength?: number };
  parts: Record<string, PartSpec>;
}
const SIDES: Record<string, V3> = { left: [-1, 0, 0], right: [1, 0, 0], front: [0, -1, 0], behind: [0, 1, 0] };

/** A world of named parts (see the top of this file). */
export class World {
  readonly kind = "world";
  readonly spec: WorldSpec;
  /** its builders: the eight built in and the art file's own (make3d.define) */
  readonly makers: Record<string, (p: Record<string, unknown>) => Built>;
  private cache = new Map<string, Built>();
  private scat = new Map<string, Splats>();
  constructor(spec: WorldSpec, makers: Record<string, (p: Record<string, unknown>) => Built> = BUILDERS) {
    this.makers = makers;
    if (!spec || typeof spec !== "object" || !spec.parts || typeof spec.parts !== "object") throw new PxError("world3d({ seed, wind: { from, strength }, parts: { name: { make, params, at | on | beside | around | attach } } })");
    for (const [name, p] of Object.entries(spec.parts)) {
      if (!/^[\w-]+$/.test(name)) throw new PxError(`world3d: a part's name is letters, digits, _ or -, got '${name}'`);
      if (!p || !makers[p.make]) throw new PxError(`world3d: part '${name}' is made by one of ${Object.keys(makers).join(", ")} (or one of the file's own, make3d.define, before the world), got ${JSON.stringify(p?.make)}`);
      if ((p.mats !== undefined && (typeof p.mats !== "object" || p.mats === null)) || (p.look !== undefined && (typeof p.look !== "object" || p.look === null))) throw new PxError(`world3d: part '${name}': mats is { material: ramp } and look { thickness, ramp, ... }`);
      for (const r of [p.on, p.around, p.beside?.[0], p.attach?.[0], p.apart?.[0]]) if (r !== undefined && !spec.parts[r]) throw new PxError(`world3d: part '${name}' refers to '${r}', which isn't a part (it has: ${Object.keys(spec.parts).join(", ")})`);
      if (p.beside && !SIDES[p.beside[1]]) throw new PxError(`world3d: part '${name}' is beside on "left", "right", "front" or "behind", got ${JSON.stringify(p.beside[1])}`);
      if (p.along !== undefined && !(Array.isArray(p.along) && Array.isArray(p.along[0]) && p.along[0].length >= 2 && p.along[0].every((q) => Array.isArray(q) && q.length >= 2 && q.every(Number.isFinite)) && Number.isFinite(p.along[1])))
        throw new PxError(`world3d: part '${name}' is along [[[x, y], [x, y], ...], s]: two points or more (m) and how far along them, got ${JSON.stringify(p.along)}`);
      if (p.apart !== undefined && !(Array.isArray(p.apart) && (p.apart[1] === undefined || p.apart[1] >= 0))) throw new PxError(`world3d: part '${name}' is apart [part, gap m >= 0], got ${JSON.stringify(p.apart)}`);
      if (p.as !== undefined && !AS.includes(p.as)) throw new PxError(`world3d: part '${name}' is drawn as ${AS.map((a) => `"${a}"`).join(", ")}, got ${JSON.stringify(p.as)}`);
    }
    this.spec = spec;
  }
  get names(): string[] { return Object.keys(this.spec.parts); }
  /** The wind as a way it blows, m: from the left blows to the right. */
  wind(): [number, number] {
    const w = this.spec.wind ?? {}, d = SIDES[w.from ?? "left"], k = w.strength ?? 0.2;
    if (!d) throw new PxError(`world3d: wind.from is "left", "right", "front" or "behind", got ${JSON.stringify(w.from)}`);
    return [-d[0] * k, -d[1] * k];
  }
  /** A part as its builder makes it: its parameters, its seed (its own, or the world's and its name), the world's wind if what it builds sways. */
  built(name: string): Built {
    let b = this.cache.get(name);
    if (b) return b;
    const p = this.spec.parts[name];
    if (!p) throw new PxError(`world3d: no part '${name}' (it has: ${this.names.join(", ")})`);
    const params: Record<string, unknown> = { seed: p.seed ?? partSeed(this.spec.seed ?? 1, name), ...p.params };
    b = this.makers[p.make](params);
    if (b.windy && params.wind === undefined) b = this.makers[p.make]({ ...params, wind: this.wind() });
    this.cache.set(name, b);
    return b;
  }
  /** A part's details scattered on it, made once. */
  details(name: string): [string, Splats][] {
    const b = this.built(name);
    return Object.entries(b.details).map(([d, o]) => {
      const key = `${name}.${d}`;
      let s = this.scat.get(key);
      if (!s) this.scat.set(key, (s = scatter(b.field!, o)));
      return [d, s];
    });
  }
  /** Its box at rest, the field's own frame. */
  box(name: string): [V3, V3] {
    const b = this.built(name);
    if (b.field) { const C = compile(b.field, STILL); return [C.lo, C.hi]; }
    const D = compileDensity(b.density!, STILL);
    return [D.lo, D.hi];
  }
  /** Where a part stands at a moment, by its relations, kept clear of what it is `apart` from. */
  place(name: string, clock: Clock = STILL, seen: string[] = []): V3 {
    if (seen.includes(name)) throw new PxError(`world3d: parts placed by each other in a ring: ${[...seen, name].join(" -> ")}`);
    const q = this.placed(name, clock, [...seen, name]), ap = this.spec.parts[name].apart;
    if (!ap) return q;
    const [r, gap = 0] = ap, o = this.place(r, clock, [...seen, name]), [lo, hi] = this.box(r), [lo2, hi2] = this.box(name);
    let move: [number, number] | undefined;
    for (const e of [0, 1, 2]) {
      // how far it moves up the axis to clear the other's box, and down it; clear on one axis is clear
      const up = o[e] + hi[e] + gap - (q[e] + lo2[e]), down = q[e] + hi2[e] - (o[e] + lo[e] - gap);
      if (up <= 0 || down <= 0) return q;
      if (e < 2 && (!move || Math.min(up, down) < Math.abs(move[1]))) move = [e, up <= down ? up : -down];
    }
    q[move![0]] += move![1];
    return q;
  }
  private placed(name: string, clock: Clock, s: string[]): V3 {
    const p = this.spec.parts[name];
    const own = typeof p.at === "function" ? p.at(clock) : p.at;
    const base: V3 = own ? [own[0], own[1], own[2] ?? 0] : [0, 0, 0];
    if (p.attach) { const [r, sock] = p.attach, q = this.place(r, clock, s), so = this.built(r).sockets[sock]; if (!so) throw new PxError(`world3d: part '${r}' has no socket '${sock}' (it has: ${Object.keys(this.built(r).sockets).join(", ")})`); return [q[0] + so[0] + base[0], q[1] + so[1] + base[1], q[2] + so[2] + base[2]]; }
    if (p.around) { const q = this.place(p.around, clock, s); return [q[0] + base[0], q[1] + base[1], base[2]]; }
    if (p.on) { const q = this.place(p.on, clock, s), [, hi] = this.box(p.on); return [q[0] + base[0], q[1] + base[1], q[2] + hi[2] + base[2]]; }
    if (p.beside) {
      const [r, side, gap = 0.5] = p.beside, q = this.place(r, clock, s), d = SIDES[side], [lo, hi] = this.box(r), [lo2, hi2] = this.box(name);
      const e = d[0] ? 0 : 1, far = d[e] > 0 ? hi[e] - lo2[e] : hi2[e] - lo[e];
      return [q[0] + d[0] * (far + gap) + base[0], q[1] + d[1] * (far + gap) + base[1], base[2]];
    }
    if (p.along) {
      // the segment s falls on (the first or the last past the ends), and the point s along it
      const [pts, at] = p.along, P = pts.map((v): V3 => [v[0], v[1], v[2] ?? 0]);
      let i = 0, s0 = 0;
      for (; i < P.length - 2; i++) { const l = Math.hypot(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1], P[i + 1][2] - P[i][2]); if (s0 + l > at) break; s0 += l; }
      const a = P[i], b = P[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) || 1, k = (at - s0) / l;
      return [a[0] + (b[0] - a[0]) * k + base[0], a[1] + (b[1] - a[1]) * k + base[1], a[2] + (b[2] - a[2]) * k + base[2]];
    }
    return base;
  }
  /** The same world with some parameters changed: "part.param" (or "wind.from", "wind.strength") to a value. */
  edit(changes: Record<string, unknown>): World {
    const spec: WorldSpec = { ...this.spec, wind: { ...this.spec.wind }, parts: Object.fromEntries(Object.entries(this.spec.parts).map(([k, v]) => [k, { ...v, params: { ...v.params } }])) };
    for (const [path, v] of Object.entries(changes)) {
      const [part, key, ...rest] = path.split(".");
      if (rest.length || !key) throw new PxError(`edit: "part.parameter" (or "wind.from"), got '${path}'`);
      if (part === "wind") { if (key !== "from" && key !== "strength") throw new PxError(`edit: the wind has from and strength, got '${key}'`); (spec.wind as Record<string, unknown>)[key] = v; continue; }
      if (!spec.parts[part]) throw new PxError(`edit: no part '${part}' (it has: ${this.names.join(", ")})`);
      // how it is drawn ("oak.as": "voxels") is the part's, not its builder's
      if (key === "as") spec.parts[part].as = v as string;
      else spec.parts[part].params![key] = v;
    }
    return new World(spec, this.makers);
  }
  /** What a part is, as a string: its fields' code and numbers, its density, details, decals and place over the loop (the same string, the same pixels). */
  prints(name: string): Record<string, string> {
    const b = this.built(name), out: Record<string, string> = {}, times = [0, 0.25, 0.5, 0.75].map((ph): Clock => ({ t: 0, phase: ph, frame: 0, frames: 1 }));
    const key = (f: Sdf) => times.map((c) => { const C = compile(f, c); return C.key + C.mats.join() + C.parts.join(); }).join("|");
    if (b.field) out[name] = key(b.field) + JSON.stringify(b.decals);
    if (b.density) out[name] = key(b.density.of) + JSON.stringify(b.density.o, (_k, v) => (typeof v === "function" ? String(v) : v)) + JSON.stringify(b.look);
    for (const [k, f] of Object.entries(b.parts)) out[`${name}.${k}`] = key(f);
    for (const [k, s] of this.details(name)) out[`${name}.${k}`] = Buffer.from(s.pos.buffer).toString("base64") + Buffer.from(s.mat.buffer).toString("base64");
    out[`${name}@`] = JSON.stringify(times.map((c) => this.place(name, c)));
    if (this.spec.parts[name].as) out[`${name}.as`] = this.spec.parts[name].as!;
    return out;
  }
  /** Which parts (and their named parts, details, places) differ from another world's. */
  changed(other: World): string[] {
    const out: string[] = [];
    for (const n of new Set([...this.names, ...other.names])) {
      const a = this.spec.parts[n] ? this.prints(n) : {}, b = other.spec.parts[n] ? other.prints(n) : {};
      for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) if (a[k] !== b[k]) out.push(k);
    }
    return out;
  }
  /** A part's points at a moment, in the world: a solid's cells inside (0.1 m), a density's thick enough, a details set's splats. For expect3d. */
  points(ref: string, clock: Clock): V3[] {
    const [name, sub] = ref.split(".");
    if (!this.spec.parts[name]) throw new PxError(`expect3d: no part '${name}' (it has: ${this.names.join(", ")})`);
    const b = this.built(name), at = this.place(name, clock), out: V3[] = [];
    const det = sub ? this.details(name).find(([d]) => d === sub)?.[1] : undefined;
    if (det) {
      const mv = det.move?.(clock);
      for (let i = 0; i < det.n; i++) { const p: V3 = [det.pos[i * 3], det.pos[i * 3 + 1], det.pos[i * 3 + 2]], q = mv ? mv(i, p) : p; out.push([q[0] + at[0], q[1] + at[1], q[2] + at[2]]); }
      return out;
    }
    if (b.density) {
      const D = compileDensity(b.density, clock), s = 0.15;
      for (let z = D.lo[2]; z <= D.hi[2]; z += s) for (let y = D.lo[1]; y <= D.hi[1]; y += s) for (let x = D.lo[0]; x <= D.hi[0]; x += s) if (D.rho(x, y, z) > 0.2) out.push([x + at[0], y + at[1], z + at[2]]);
      return out;
    }
    const f = sub ? b.parts[sub] : b.field;
    if (!f) throw new PxError(`expect3d: part '${name}' has no part '${sub}' (it has: ${[...Object.keys(b.parts), ...Object.keys(b.details)].join(", ")})`);
    // a named part rides the whole's moves (a canopy swaying with its tree); one thinner than the
    // samples (a twig between them) taken as the points within half a step of it
    const carry = peel(b.field!).carry(clock), C = compile(sub ? f : peel(f).inner, clock), s = 0.1;
    for (const lim of [0, s / 2]) {
      for (let z = C.lo[2]; z <= C.hi[2]; z += s) for (let y = C.lo[1]; y <= C.hi[1]; y += s) for (let x = C.lo[0]; x <= C.hi[0]; x += s)
        if (C.d(x, y, z) <= lim) { const q = carry([x, y, z]); out.push([q[0] + at[0], q[1] + at[1], q[2] + at[2]]); }
      if (out.length) break;
    }
    return out;
  }
}

/** A rule of expect3d: above, on, apart, near, reaches, within; and two rules in time, before and while. */
export type Rule = { above?: [string, string]; on?: [string, string]; apart?: [string, string]; near?: [string, string, number]; reaches?: [string, number[], number, number?]; within?: [string, number[][]]; before?: [Rule, Rule]; while?: [Rule, Rule] };
const box = (pts: V3[]) => {
  const lo: V3 = [Infinity, Infinity, Infinity], hi: V3 = [-Infinity, -Infinity, -Infinity], c: V3 = [0, 0, 0];
  for (const p of pts) for (let e = 0; e < 3; e++) { lo[e] = Math.min(lo[e], p[e]); hi[e] = Math.max(hi[e], p[e]); c[e] += p[e] / pts.length; }
  return { lo, hi, c };
};
const f2 = (v: number) => v.toFixed(2);
const RULES = "{ above: [a, b] }, { on: [a, b or \"ground\"] }, { apart: [a, b] }, { near: [a, b, m] }, { reaches: [a, [x, y, z], ms] }, { within: [a, [[x0, y0, z0], [x1, y1, z1]]] }, { before: [rule, rule] } or { while: [rule, rule] }";
const ruleOf = (r: Rule): [string, unknown[]] => {
  const [kind, args] = Object.entries(r ?? {})[0] ?? [];
  if (!kind || !Array.isArray(args)) throw new PxError(`expect3d: a rule is ${RULES}, got ${JSON.stringify(r)}`);
  if (!["above", "on", "apart", "near", "reaches", "within", "before", "while"].includes(kind)) throw new PxError(`expect3d: no rule '${kind}' (above, on, apart, near, reaches, within, before, while)`);
  return [kind, args];
};
/** A rule as words: "rock apart house", "smoke near house within 3.5 m", "a above b before c on ground". */
export function ruleText(r: Rule): string {
  const [kind, args] = ruleOf(r);
  if (kind === "before" || kind === "while") return `${ruleText(args[0] as Rule)} ${kind} ${ruleText(args[1] as Rule)}`;
  return `${args[0]} ${kind} ${kind === "reaches" || kind === "within" ? JSON.stringify(args[1]) : args[1]}${kind === "near" ? ` within ${args[2]} m` : kind === "reaches" ? ` by ${args[2]} ms` : ""}`;
}
/** Run expect3d's rules over a loop of `frames` moments: each rule's text, whether it held, and where it didn't. */
export function runExpects(W: World, rules: Rule[], frames = 8, ms = 3600): { text: string; ok: boolean; detail?: string }[] {
  const clocks = Array.from({ length: frames }, (_, f): Clock => ({ t: (f * ms) / frames, phase: f / frames, frame: f, frames }));
  const memo = new Map<string, V3[]>();
  const pts = (ref: string, k: number) => { const key = `${ref}#${k}`; let v = memo.get(key); if (!v) memo.set(key, (v = W.points(ref, clocks[k]))); if (!v.length) throw new PxError(`expect3d: '${ref}' has nothing in it at frame ${k}`); return v; };
  // where a rule of a place fails at frame k (undefined: it holds)
  const failAt = (r: Rule, k: number): string | undefined => {
    const [kind, args] = ruleOf(r), a = box(pts(args[0] as string, k));
    if (kind === "above") { const b = box(pts(args[1] as string, k)); return a.c[2] > b.hi[2] ? undefined : `its middle is ${f2(a.c[2])} m up, ${args[1]}'s top ${f2(b.hi[2])} m`; }
    if (kind === "on") { const top = args[1] === "ground" ? 0 : box(pts(args[1] as string, k)).hi[2]; return Math.abs(a.lo[2] - top) <= 0.15 ? undefined : `its foot is ${f2(a.lo[2] - top)} m ${a.lo[2] > top ? "over" : "under"} it`; }
    if (kind === "apart") {
      const [bn, bsub] = String(args[1]).split("."), bb = W.built(bn), bf = bsub ? bb.parts[bsub] : bb.field, at = W.place(bn, clocks[k]);
      if (!bf) throw new PxError(`expect3d: apart needs '${args[1]}' to be a solid`);
      const C = compile(peel(bf).inner, clocks[k]), back = (q: V3): V3 => [q[0] - at[0], q[1] - at[1], q[2] - at[2]];
      const into = pts(args[0] as string, k).filter((q) => { const p = back(q); return C.d(p[0], p[1], p[2]) < -0.05; }).length;
      return into ? `${into} of its points are inside ${args[1]}` : undefined;
    }
    if (kind === "near") { const b = box(pts(args[1] as string, k)), dd = Math.hypot(a.c[0] - b.c[0], a.c[1] - b.c[1], a.c[2] - b.c[2]); return dd <= (args[2] as number) ? undefined : `their middles are ${f2(dd)} m apart`; }
    if (kind === "within") { const [lo, hi] = args[1] as number[][]; return a.lo.some((v, e) => v < lo[e] - 1e-9) || a.hi.some((v, e) => v > hi[e] + 1e-9) ? `it spans [${a.lo.map(f2)}] to [${a.hi.map(f2)}]` : undefined; }
    throw new PxError(`expect3d: ${kind} goes in time on its own, not inside before or while (they take rules of a place: above, on, apart, near, within)`);
  };
  return rules.map((r) => {
    const [kind, args] = ruleOf(r), text = ruleText(r);
    if (kind === "before" || kind === "while") {
      const [r1, r2] = args as Rule[], t1 = ruleText(r1), t2 = ruleText(r2);
      const h1 = clocks.map((_, k) => !failAt(r1, k)), h2 = clocks.map((_, k) => !failAt(r2, k));
      if (kind === "while") { const k = h2.findIndex((h, q) => h && !h1[q]); return k < 0 ? { text, ok: true } : { text, ok: false, detail: `at frame ${k} ${t2} holds and ${t1} doesn't` }; }
      const k1 = h1.indexOf(true), k2 = h2.indexOf(true);
      if (k1 >= 0 && k2 >= 0 && k1 < k2) return { text, ok: true };
      return { text, ok: false, detail: k1 < 0 ? `${t1} never holds` : k2 < 0 ? `${t2} never holds` : `${t1} first holds at frame ${k1}, ${t2} at frame ${k2}` };
    }
    if (kind === "reaches") {
      const [, p, by, tol = 0.3] = args as [string, number[], number, number?];
      let best = Infinity;
      for (let k = 0; k < frames; k++) { if (clocks[k].t > by) break; const a = box(pts(args[0] as string, k)); best = Math.min(best, Math.hypot(a.c[0] - p[0], a.c[1] - p[1], a.c[2] - p[2])); if (best <= tol) return { text, ok: true }; }
      return { text, ok: false, detail: `by ${by} ms its middle came no nearer than ${f2(best)} m` };
    }
    for (let k = 0; k < frames; k++) { const d = failAt(r, k); if (d) return { text, ok: false, detail: `at frame ${k} ${d}` }; }
    return { text, ok: true };
  });
}

/** A number of a part's spec a fix may change: its place (`at`'s x, y or z), its gap `beside` another, or a parameter. */
export interface Knob { part: string; key: string; i?: number; value: number }
const KNOB_ORDER = ["at", "beside"];
function knobsOf(W: World, part: string): Knob[] {
  const p = W.spec.parts[part], out: Knob[] = [];
  if (Array.isArray(p.at)) p.at.forEach((v, i) => out.push({ part, key: "at", i, value: v }));
  if (p.beside) out.push({ part, key: "beside", i: 2, value: p.beside[2] ?? 0.5 });
  for (const [k, v] of Object.entries(p.params ?? {})) if (typeof v === "number") out.push({ part, key: k, value: v });
  return out;
}
/** The world with one number of a part's spec changed. */
export function turnKnob(W: World, k: Knob, v: number): World {
  const parts = { ...W.spec.parts }, p = { ...parts[k.part], params: { ...parts[k.part].params } };
  if (k.key === "at") { const a = [...(p.at as number[])]; a[k.i!] = v; p.at = a; }
  else if (k.key === "beside") { const b = [...p.beside!] as [string, string, number?]; b[2] = v; p.beside = b; }
  else p.params[k.key] = v;
  parts[k.part] = p;
  return new World({ ...W.spec, parts }, W.makers);
}
/**
 * A failing rule fixed by one number, with no model: each number of the parts it names (where they
 * stand, the gap beside, then their parameters) searched outward from its value, a step that grows,
 * then narrowed to where the rule starts to hold and taken a little past it; the smallest change
 * that holds and leaves every rule that held holding. Undefined when none does.
 */
export function fixRule(W: World, rules: Rule[], r: Rule, frames = 8, ms = 3600): { knob: Knob; to: number } | undefined {
  const [kind, args] = ruleOf(r);
  if (kind === "before" || kind === "while" || kind === "reaches") return undefined;
  const held = rules.filter((q) => q !== r && runExpects(W, [q], frames, ms)[0].ok);
  const holds = (w: World) => { try { return runExpects(w, [r], frames, ms)[0].ok; } catch { return false; } };
  const names = [args[0], args[1]].filter((n): n is string => typeof n === "string" && n !== "ground").map((n) => n.split(".")[0]).filter((n, i, a) => W.spec.parts[n] && a.indexOf(n) === i);
  const knobs = names.flatMap((n) => knobsOf(W, n)).sort((a, b) => +!KNOB_ORDER.includes(a.key) - +!KNOB_ORDER.includes(b.key));
  const at = (k: Knob, v: number) => holds(turnKnob(W, k, v));
  return searchKnobs(knobs, {
    place: (k) => KNOB_ORDER.includes(k.key), holds: at, steps: [0.05, 0.1, 0.2, 0.3, 0.5, 0.75, 1, 1.5, 2, 3],
    keeps: (k, v) => { const w = turnKnob(W, k, v); return held.every((q) => runExpects(w, [q], frames, ms)[0].ok); },
    settle: (k, sign, lo, h) => {
      // narrowed to where it starts to hold, then a little past it
      for (let n = 0; n < 6; n++) { const mid: number = (lo + h) / 2; if (at(k, k.value + sign * mid)) h = mid; else lo = mid; }
      let to = Math.round((k.value + sign * (h + 0.05)) * 100) / 100;
      if (!at(k, to)) to = Math.round((k.value + sign * h) * 1000) / 1000;
      // the roundest number near it that holds too (a foot set on the ground at 0, not 0.03)
      for (const q of [1, 0.5, 0.25, 0.1, 0.05])
        for (const c of [Math.floor(to / q) * q, Math.ceil(to / q) * q].map((v) => +v.toFixed(2)))
          if (Math.abs(c - k.value) <= Math.abs(to - k.value) + 0.1 && at(k, c)) return c;
      return to;
    },
  });
}
/**
 * The fix's search, for any numbers (a world's, a 2D scene's placements'): each knob tried outward from
 * its value by `steps` that grow, then `settle`d between the last step that failed and the first that
 * held; the smallest change that holds and `keeps` the rest, a knob of a place (`place`) before any
 * other. Undefined when none does.
 */
export function searchKnobs<K extends { value: number }>(knobs: K[], o: { place: (k: K) => boolean; holds: (k: K, v: number) => boolean; keeps: (k: K, v: number) => boolean; steps: number[]; settle: (k: K, sign: number, lo: number, hi: number) => number }): { knob: K; to: number } | undefined {
  let best: { knob: K; to: number; d: number; place: boolean } | undefined;
  for (const k of knobs) {
    const place = o.place(k);
    if (best && best.place && !place) break;
    for (const sign of [1, -1]) {
      let lo = 0, hi: number | undefined;
      for (const d of o.steps) { if (best && best.place === place && d >= best.d) break; if (o.holds(k, k.value + sign * d)) { hi = d; break; } lo = d; }
      if (hi === undefined) continue;
      const to = o.settle(k, sign, lo, hi);
      if (!o.holds(k, to) || !o.keeps(k, to)) continue;
      const d = Math.abs(to - k.value);
      if (!best || d < best.d || (place && !best.place)) best = { knob: k, to, d, place };
    }
  }
  return best && { knob: best.knob, to: best.to };
}
/** `m` a list found in `text` (`at: [...]`, its items its first group): its i-th number set to `to` (one past its end: added); undefined when that isn't a number written out. */
export function setListItem(text: string, m: RegExpExecArray | null, i: number, to: number): string | undefined {
  if (!m || m[1].includes("[")) return undefined;
  const items = m[1].split(","), num = String(+to.toFixed(3));
  if (i < items.length) { if (!/^\s*-?[\d.]+\s*$/.test(items[i])) return undefined; items[i] = items[i].replace(/-?[\d.]+/, num); }
  else if (i === items.length) items.push(" " + num);
  else return undefined;
  return text.slice(0, m.index) + m[0].replace(m[1], items.join(",")) + text.slice(m.index + m[0].length);
}
/**
 * A knob's number found in the art file's text (the part's `name: { ... }`, its at, beside or parameter;
 * or a place written as a bare array in a table, `const AT = { pack: [127, 148] }`, a 2D scene's) and
 * set to `to`; undefined when it isn't there once, written as a literal.
 */
export function setKnobInSource(src: string, k: Knob, to: number): string | undefined {
  const head = (open: string) => [...src.matchAll(new RegExp(`(^|[\\s{,])${k.part}\\s*:\\s*\\${open}`, "g"))];
  const heads = head("{"), item = (text: string, m: RegExpExecArray | null) => setListItem(text, m, k.i!, to);
  if (!heads.length && k.key === "at" && head("[").length === 1) return item(src, new RegExp(`(?:^|[\\s{,])${k.part}\\s*:\\s*\\[([^\\]]*)\\]`).exec(src));
  if (heads.length !== 1) return undefined;
  // the part's braces
  const start = heads[0].index! + heads[0][0].length - 1;
  let depth = 0, end = start;
  for (; end < src.length; end++) { if (src[end] === "{") depth++; else if (src[end] === "}" && --depth === 0) break; }
  const body = src.slice(start, end + 1);
  let out: string | undefined;
  if (k.key === "at" || k.key === "beside") {
    out = item(body, new RegExp(`\\b${k.key}\\s*:\\s*\\[([^\\]]*)\\]`).exec(body));
    if (out === undefined) return undefined;
  } else {
    const m = new RegExp(`\\b${k.key}\\s*:\\s*(-?[\\d.]+)`).exec(body);
    if (!m) return undefined;
    out = body.slice(0, m.index) + m[0].replace(m[1], String(+to.toFixed(3))) + body.slice(m.index + m[0].length);
  }
  return src.slice(0, start) + out + src.slice(end + 1);
}
export { Density, Sdf };

export interface Draw3dOpts {
  view?: unknown; ppm?: number; pixel?: number; light?: number[];
  /** how its solids are drawn ("surface", "voxels", "splats", "mesh"), where a part doesn't say; `size` the cell of voxels and of a mesh (m, default 0.1), `spacing` the splats' (m) */
  as?: string; size?: number; spacing?: number;
  /** every material's ramp (a mist's "mist_<color>" too) */
  mats?: Record<string, unknown>;
  /** these parts only */
  only?: string[];
  /** where the world's [0, 0, 0] stands in the view's world (m; through a camera, [x, ahead, up]) */
  at?: number[];
  /** more of surface()'s options for the solids it draws so (soft, outline, rim, shadows, ao, inner, clean) */
  surface?: Record<string, unknown>;
}
export const DRAW3D_OPTS = ["view", "ppm", "pixel", "light", "mats", "only", "at", "as", "size", "spacing", "surface"];
type Drawers = {
  surface: (f: Sdf, o: Record<string, unknown>) => void; splats: (s: Splats | Sdf, o: Record<string, unknown>) => void;
  voxels: (f: Sdf | Voxels, o: Record<string, unknown>) => void; mesh: (view: unknown, faces: { mat: string; pts: V3[] }[], mats: Record<string, unknown>, o: Record<string, unknown>) => void;
  volume: (d: Density, o: Record<string, unknown>) => void; decal: (name: string, o: Record<string, unknown>) => void; clock: Clock;
};
/** A world, or a field or a built thing (make3d's) as a world of one part, "thing" (made once each). */
const ONE = new WeakMap<object, World>();
function worldOf(t: unknown): World {
  if (t instanceof World) return t;
  const b = t instanceof Sdf ? { field: t, parts: {}, details: {}, decals: {}, sockets: {} } : t as Built;
  if (!b || typeof b !== "object" || !(b.field instanceof Sdf || b.density instanceof Density)) throw new PxError("draw3d(thing, { view, as, mats, light, ppm, pixel, only, at }): a world3d(...), a field (sdf.*) or a built thing (make3d.tree(...))");
  let W = ONE.get(t as object);
  if (!W) ONE.set(t as object, (W = new World({ parts: { thing: { make: "thing" } } }, { thing: () => b as Built })));
  return W;
}

/**
 * Draw a world through a view: its solids (each pixel named by its part, "oak.canopy"), the details on
 * them, their decals, then its air (mists, smoke) the farthest first. Each part where its relations put
 * it at this moment.
 */
export function drawWorld(thing: unknown, o: Draw3dOpts, d: Drawers): void {
  const W = worldOf(thing);
  if (o.as !== undefined && !AS.includes(o.as)) throw new PxError(`draw3d: as is ${AS.map((a) => `"${a}"`).join(", ")}, got ${JSON.stringify(o.as)}`);
  const names = W.names.filter((n) => !o.only || o.only.includes(n)), mats = o.mats ?? {};
  for (const n of o.only ?? []) if (!W.spec.parts[n]) throw new PxError(`draw3d: only names '${n}', which isn't a part (it has: ${W.names.join(", ")})`);
  const off = o.at ?? [0, 0, 0];
  if (!(Array.isArray(off) && off.length === 3 && off.every(Number.isFinite))) throw new PxError(`draw3d: at is where the world's [0, 0, 0] stands, [x, y, z] m, got ${JSON.stringify(o.at)}`);
  const base = { view: o.view, ppm: o.ppm, pixel: o.pixel, light: o.light, world: (o as { world?: unknown }).world }, at = (n: string) => { const p = W.place(n, d.clock); return [p[0] + off[0], p[1] + off[1], p[2] + off[2]]; };
  const own = (n: string) => (W.spec.parts[n].mats ? { ...mats, ...W.spec.parts[n].mats } : mats);
  for (const n of names) {
    const b = W.built(n), f = b.field, as = W.spec.parts[n].as ?? o.as ?? "surface", where = { ...base, at: at(n), mats: own(n), part: n };
    if (!f) continue;
    if (as === "surface") d.surface(f, { ...o.surface, ...where });
    else if (as === "voxels") d.voxels(f, { ...where, size: o.size ?? 0.1 });
    else if (as === "splats") d.splats(f, { ...where, spacing: o.spacing });
    else {
      // its surface as faces where it stands, drawn in the depth what is drawn already left, a smooth ramp a material
      const p = at(n), ortho = !(o.view && typeof o.view === "object" && "horizon" in o.view);
      const faces = surfaceNets(f, { size: o.size ?? 0.1, clock: d.clock }).faces.map((F) => ({ mat: F.mat, pts: F.pts.map((q) => [q[0] + p[0], q[1] + p[1], q[2] + p[2]] as V3) }));
      const ramps = Object.fromEntries(Object.entries(own(n)).map(([k, m]) => [k, { ramp: m && typeof m === "object" && !Array.isArray(m) ? (m as { ramp: unknown }).ramp : m, smooth: true }]));
      d.mesh(o.view, faces, ramps, { ...(o.light !== undefined ? { light: o.light } : {}), ...(ortho && o.ppm !== undefined ? { ppm: o.ppm } : {}) });
    }
    // (a mesh's and splats' shadow: the field's, laid by surface() drawing nothing else)
    if ((as === "mesh" || as === "splats") && o.view && typeof o.view === "object" && "horizon" in o.view) d.surface(f, { ...where, hide: true });
  }
  for (const n of names) for (const [k, s] of W.details(n)) d.splats(s, { ...base, at: at(n), mats: own(n), part: `${n}.${k}` });
  for (const n of names) {
    const b = W.built(n);
    for (const [k, dc] of Object.entries(b.decals)) d.decal(dc.asset, { ...base, at: at(n), on: b.field, point: dc.point, views: dc.views, lit: dc.lit, mode: dc.mode, size: dc.size, up: dc.up, part: `${n}.${k}` });
  }
  const air = names.filter((n) => W.built(n).density).sort((a, b) => at(b)[1] - at(a)[1]);
  for (const n of air) {
    // its own look's ramp is the keys themselves; its builder's names a material of mats
    const b = W.built(n), pl = W.spec.parts[n].look, L = { ...b.look!, ...pl }, M = own(n), ramp = pl?.ramp ?? M[L.ramp];
    if (ramp === undefined) throw new PxError(`draw3d: part '${n}' is drawn in '${L.ramp}': give mats (draw3d's or the part's) a ramp for it, or the part a look: { ramp: "keys" }`);
    const emit = L.emit ? { ...L.emit, ramp: pl?.emit?.ramp ?? M[L.emit.ramp] } : undefined;
    d.volume(b.density!, { ...base, at: at(n), ...L, ramp, ...(emit ? { emit } : {}), part: n });
  }
}
