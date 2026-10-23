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
  private cache = new Map<string, Built>();
  private scat = new Map<string, Splats>();
  constructor(spec: WorldSpec) {
    if (!spec || typeof spec !== "object" || !spec.parts || typeof spec.parts !== "object") throw new PxError("world3d({ seed, wind: { from, strength }, parts: { name: { make, params, at | on | beside | around | attach } } })");
    for (const [name, p] of Object.entries(spec.parts)) {
      if (!/^[\w-]+$/.test(name)) throw new PxError(`world3d: a part's name is letters, digits, _ or -, got '${name}'`);
      if (!p || !BUILDERS[p.make]) throw new PxError(`world3d: part '${name}' is made by one of ${Object.keys(BUILDERS).join(", ")}, got ${JSON.stringify(p?.make)}`);
      for (const r of [p.on, p.around, p.beside?.[0], p.attach?.[0]]) if (r !== undefined && !spec.parts[r]) throw new PxError(`world3d: part '${name}' refers to '${r}', which isn't a part (it has: ${Object.keys(spec.parts).join(", ")})`);
      if (p.beside && !SIDES[p.beside[1]]) throw new PxError(`world3d: part '${name}' is beside on "left", "right", "front" or "behind", got ${JSON.stringify(p.beside[1])}`);
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
  /** A part as its builder makes it: its parameters, its seed (its own, or the world's and its name), the wind if it sways. */
  built(name: string): Built {
    let b = this.cache.get(name);
    if (b) return b;
    const p = this.spec.parts[name];
    if (!p) throw new PxError(`world3d: no part '${name}' (it has: ${this.names.join(", ")})`);
    const params: Record<string, unknown> = { seed: p.seed ?? partSeed(this.spec.seed ?? 1, name), ...p.params };
    if (["tree", "mist", "smoke"].includes(p.make) && params.wind === undefined) params.wind = this.wind();
    b = BUILDERS[p.make](params);
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
  /** Where a part stands at a moment, by its relations. */
  place(name: string, clock: Clock = STILL, seen: string[] = []): V3 {
    if (seen.includes(name)) throw new PxError(`world3d: parts placed by each other in a ring: ${[...seen, name].join(" -> ")}`);
    const p = this.spec.parts[name], s = [...seen, name];
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
      spec.parts[part].params![key] = v;
    }
    return new World(spec);
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
    // a named part rides the whole's moves (a canopy swaying with its tree)
    const carry = peel(b.field!).carry(clock), C = compile(sub ? f : peel(f).inner, clock), s = 0.1;
    for (let z = C.lo[2]; z <= C.hi[2]; z += s) for (let y = C.lo[1]; y <= C.hi[1]; y += s) for (let x = C.lo[0]; x <= C.hi[0]; x += s)
      if (C.d(x, y, z) <= 0) { const q = carry([x, y, z]); out.push([q[0] + at[0], q[1] + at[1], q[2] + at[2]]); }
    return out;
  }
}

/** A rule of expect3d: above, on, apart, near, reaches, within. */
export type Rule = { above?: [string, string]; on?: [string, string]; apart?: [string, string]; near?: [string, string, number]; reaches?: [string, number[], number, number?]; within?: [string, number[][]] };
const box = (pts: V3[]) => {
  const lo: V3 = [Infinity, Infinity, Infinity], hi: V3 = [-Infinity, -Infinity, -Infinity], c: V3 = [0, 0, 0];
  for (const p of pts) for (let e = 0; e < 3; e++) { lo[e] = Math.min(lo[e], p[e]); hi[e] = Math.max(hi[e], p[e]); c[e] += p[e] / pts.length; }
  return { lo, hi, c };
};
const f2 = (v: number) => v.toFixed(2);
/** Run expect3d's rules over a loop of `frames` moments: each rule's text, whether it held, and where it didn't. */
export function runExpects(W: World, rules: Rule[], frames = 8, ms = 3600): { text: string; ok: boolean; detail?: string }[] {
  const clocks = Array.from({ length: frames }, (_, f): Clock => ({ t: (f * ms) / frames, phase: f / frames, frame: f, frames }));
  const memo = new Map<string, V3[]>();
  const pts = (ref: string, k: number) => { const key = `${ref}#${k}`; let v = memo.get(key); if (!v) memo.set(key, (v = W.points(ref, clocks[k]))); if (!v.length) throw new PxError(`expect3d: '${ref}' has nothing in it at frame ${k}`); return v; };
  return rules.map((r) => {
    const [kind, args] = Object.entries(r)[0] ?? [];
    if (!kind || !Array.isArray(args)) throw new PxError(`expect3d: a rule is { above: [a, b] }, { on: [a, b or "ground"] }, { apart: [a, b] }, { near: [a, b, m] }, { reaches: [a, [x, y, z], ms] } or { within: [a, [[x0, y0, z0], [x1, y1, z1]]] }, got ${JSON.stringify(r)}`);
    const text = `${args[0]} ${kind} ${kind === "reaches" || kind === "within" ? JSON.stringify(args[1]) : args[1]}${kind === "near" ? ` within ${args[2]} m` : kind === "reaches" ? ` by ${args[2]} ms` : ""}`;
    for (let k = 0; k < frames; k++) {
      const a = box(pts(args[0] as string, k));
      if (kind === "above") { const b = box(pts(args[1] as string, k)); if (!(a.c[2] > b.hi[2])) return { text, ok: false, detail: `at frame ${k} its middle is ${f2(a.c[2])} m up, ${args[1]}'s top ${f2(b.hi[2])} m` }; }
      else if (kind === "on") { const top = args[1] === "ground" ? 0 : box(pts(args[1] as string, k)).hi[2]; if (Math.abs(a.lo[2] - top) > 0.15) return { text, ok: false, detail: `at frame ${k} its foot is ${f2(a.lo[2] - top)} m ${a.lo[2] > top ? "over" : "under"} it` }; }
      else if (kind === "apart") {
        const [bn, bsub] = String(args[1]).split("."), bb = W.built(bn), bf = bsub ? bb.parts[bsub] : bb.field, at = W.place(bn, clocks[k]);
        if (!bf) throw new PxError(`expect3d: apart needs '${args[1]}' to be a solid`);
        const C = compile(peel(bf).inner, clocks[k]), back = (q: V3): V3 => [q[0] - at[0], q[1] - at[1], q[2] - at[2]];
        const into = pts(args[0] as string, k).filter((q) => { const p = back(q); return C.d(p[0], p[1], p[2]) < -0.05; }).length;
        if (into) return { text, ok: false, detail: `at frame ${k} ${into} of its points are inside ${args[1]}` };
      } else if (kind === "near") { const b = box(pts(args[1] as string, k)), dd = Math.hypot(a.c[0] - b.c[0], a.c[1] - b.c[1], a.c[2] - b.c[2]); if (dd > (args[2] as number)) return { text, ok: false, detail: `at frame ${k} their middles are ${f2(dd)} m apart` }; }
      else if (kind === "within") { const [lo, hi] = args[1] as number[][]; if (a.lo.some((v, e) => v < lo[e] - 1e-9) || a.hi.some((v, e) => v > hi[e] + 1e-9)) return { text, ok: false, detail: `at frame ${k} it spans [${a.lo.map(f2)}] to [${a.hi.map(f2)}]` }; }
      else if (kind !== "reaches") throw new PxError(`expect3d: no rule '${kind}' (above, on, apart, near, reaches, within)`);
    }
    if (kind === "reaches") {
      const [, p, by, tol = 0.3] = args as [string, number[], number, number?];
      let best = Infinity;
      for (let k = 0; k < frames; k++) { if (clocks[k].t > by) break; const a = box(pts(args[0] as string, k)); best = Math.min(best, Math.hypot(a.c[0] - p[0], a.c[1] - p[1], a.c[2] - p[2])); if (best <= tol) return { text, ok: true }; }
      return { text, ok: false, detail: `by ${by} ms its middle came no nearer than ${f2(best)} m` };
    }
    return { text, ok: true };
  });
}
export { Density, Sdf };

export interface Draw3dOpts {
  view?: unknown; ppm?: number; pixel?: number; light?: number[];
  /** every material's ramp (a mist's "mist_<color>" too) */
  mats?: Record<string, unknown>;
  /** these parts only */
  only?: string[];
  /** where the world's [0, 0, 0] stands in the view's world (m; through a camera, [x, ahead, up]) */
  at?: number[];
}
export const DRAW3D_OPTS = ["view", "ppm", "pixel", "light", "mats", "only", "at"];
type Drawers = {
  surface: (f: Sdf, o: Record<string, unknown>) => void; splats: (s: Splats, o: Record<string, unknown>) => void;
  volume: (d: Density, o: Record<string, unknown>) => void; decal: (name: string, o: Record<string, unknown>) => void; clock: Clock;
};
/**
 * Draw a world through a view: its solids (each pixel named by its part, "oak.canopy"), the details on
 * them, their decals, then its air (mists, smoke) the farthest first. Each part where its relations put
 * it at this moment.
 */
export function drawWorld(W: unknown, o: Draw3dOpts, d: Drawers): void {
  if (!(W instanceof World)) throw new PxError("draw3d(world, { view, mats, light, ppm, pixel, only }): a world3d(...)");
  const names = W.names.filter((n) => !o.only || o.only.includes(n)), mats = o.mats ?? {};
  for (const n of o.only ?? []) if (!W.spec.parts[n]) throw new PxError(`draw3d: only names '${n}', which isn't a part (it has: ${W.names.join(", ")})`);
  const off = o.at ?? [0, 0, 0];
  if (!(Array.isArray(off) && off.length === 3 && off.every(Number.isFinite))) throw new PxError(`draw3d: at is where the world's [0, 0, 0] stands, [x, y, z] m, got ${JSON.stringify(o.at)}`);
  const base = { view: o.view, ppm: o.ppm, pixel: o.pixel, light: o.light }, at = (n: string) => { const p = W.place(n, d.clock); return [p[0] + off[0], p[1] + off[1], p[2] + off[2]]; };
  for (const n of names) { const b = W.built(n); if (b.field) d.surface(b.field, { ...base, at: at(n), mats, part: n }); }
  for (const n of names) for (const [k, s] of W.details(n)) d.splats(s, { ...base, at: at(n), mats, part: `${n}.${k}` });
  for (const n of names) {
    const b = W.built(n);
    for (const [k, dc] of Object.entries(b.decals)) d.decal(dc.asset, { ...base, at: at(n), on: b.field, point: dc.point, views: dc.views, lit: dc.lit, mode: dc.mode, size: dc.size, up: dc.up, part: `${n}.${k}` });
  }
  const air = names.filter((n) => W.built(n).density).sort((a, b) => at(b)[1] - at(a)[1]);
  for (const n of air) {
    const b = W.built(n), L = b.look!, ramp = mats[L.ramp];
    if (ramp === undefined) throw new PxError(`draw3d: part '${n}' is drawn in '${L.ramp}': give mats a ramp for it`);
    const emit = L.emit ? { ...L.emit, ramp: mats[L.emit.ramp] } : undefined;
    d.volume(b.density!, { ...base, at: at(n), ...L, ramp, ...(emit ? { emit } : {}), part: n });
  }
}
