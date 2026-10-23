// Abilities on the scene's clock: a spell's phases in time (charge, cast, travel, impact, dissipate),
// sparks from an emitter, and trails behind what moves. Each is a function of the time alone (no
// state carried from frame to frame): any frame, sought on its own, comes out the same.
import { type Color, TRANSPARENT } from "./color.ts";
import { PxError } from "./errors.ts";
import { bayer, colorList, hash, rng } from "./util.ts";

export type Phases = [string, number][] | Record<string, number>;
export interface PhaseAt {
  /** the phase at that time ("" before the first, the last one's name once done) */
  name: string;
  /** its index, -1 before the first */
  i: number;
  /** how far through it, 0..1 */
  k: number;
  /** ms into it */
  ms: number;
  /** ms since the ability began (negative before) */
  since: number;
  /** before it began, after it ended */
  before: boolean;
  done: boolean;
}
export interface Ability {
  (t: number): PhaseAt;
  /** when a phase (or an event) begins, ms on the clock */
  start(name: string): number;
  /** ms from its start to its end */
  total: number;
  /** a point from `from` to `to` (2 or 3 numbers) over the phase `name` (default "travel"): from before it, to after; `arc` lifts its middle (up is -y for 2, +up for 3) */
  along(from: number[], to: number[], t: number, opts?: { phase?: string; arc?: number; ease?: "linear" | "in" | "out" }): number[];
}

/**
 * A spell's phases in time: `ability([["charge", 600], ["cast", 150], ...], { start, events })` (or
 * { charge: 600, ... }), `start` ms on the clock, `events` named moments: { hit: ["impact", 0] }.
 */
export function ability(phases: Phases, opts: { start?: number; events?: Record<string, [string, number]> } = {}): Ability {
  const list: [string, number][] = Array.isArray(phases) ? phases : Object.entries(phases ?? {});
  if (!list.length || !list.every((p) => Array.isArray(p) && typeof p[0] === "string" && typeof p[1] === "number" && p[1] > 0))
    throw new PxError(`ability: phases are [["charge", ms], ["cast", ms], ...] or { charge: ms, ... }, each above 0 ms, got ${JSON.stringify(phases)}`);
  const t0 = opts.start ?? 0, starts: number[] = [];
  let acc = t0;
  for (const [, ms] of list) { starts.push(acc); acc += ms; }
  const total = acc - t0;
  const at = ((t: number): PhaseAt => {
    const since = t - t0;
    if (since < 0) return { name: "", i: -1, k: 0, ms: since, since, before: true, done: false };
    for (let i = 0; i < list.length; i++)
      if (t < starts[i] + list[i][1]) return { name: list[i][0], i, k: (t - starts[i]) / list[i][1], ms: t - starts[i], since, before: false, done: false };
    const i = list.length - 1;
    return { name: list[i][0], i, k: 1, ms: list[i][1], since, before: false, done: true };
  }) as Ability;
  at.start = (name: string) => {
    const i = list.findIndex((p) => p[0] === name);
    if (i >= 0) return starts[i];
    const e = opts.events?.[name];
    if (e) return at.start(e[0]) + e[1];
    throw new PxError(`ability: no phase or event '${name}'; it has ${[...list.map((p) => p[0]), ...Object.keys(opts.events ?? {})].join(", ")}`);
  };
  at.total = total;
  at.along = (from, to, t, o = {}) => {
    const p = o.phase ?? "travel", i = list.findIndex((q) => q[0] === p);
    if (i < 0) throw new PxError(`ability: along goes over a phase it has, not '${p}'`);
    const raw = Math.max(0, Math.min(1, (t - starts[i]) / list[i][1])), k = o.ease === "in" ? raw * raw : o.ease === "out" ? 1 - (1 - raw) ** 2 : raw;
    const lift = (o.arc ?? 0) * 4 * k * (1 - k), up = from.length === 3 ? 2 : 1, sign = from.length === 3 ? 1 : -1;
    return from.map((v, e) => v + (to[e] - v) * k + (e === up ? sign * lift : 0));
  };
  return at;
}

export interface Particle { x: number; y: number; vx: number; vy: number; age: number; life: number; id: number }
export interface EmitterOpts {
  /** where it emits from at a time: [x, y], or a function of the time (a moving source) */
  at?: [number, number] | ((t: number) => [number, number]);
  /** particles a second while it emits (from `from` to `to` ms), or `burst` of them at `from` */
  rate?: number;
  burst?: number;
  from?: number;
  to?: number;
  /** a particle's life in ms, [shortest, longest] */
  life?: [number, number];
  /** speed in units a second, [slowest, fastest], toward `angle` degrees (0 right, -90 up) give or take `spread` */
  speed?: [number, number];
  angle?: number;
  spread?: number;
  /** units a second a second ([x, y], +y down), and how much of its speed it loses a second (0..) */
  gravity?: [number, number];
  drag?: number;
  /** seamless on a loop of this many ms: births before the loop's start carry over */
  loop?: number;
  seed?: number;
}

/** A seeded emitter: (t) gives the particles alive at time t, each where its own closed-form path puts it. */
export function emitter(o: EmitterOpts = {}): (t: number) => Particle[] {
  const [l0, l1] = o.life ?? [400, 800], [v0, v1] = o.speed ?? [20, 60], ang = ((o.angle ?? -90) * Math.PI) / 180, spread = ((o.spread ?? 30) * Math.PI) / 180;
  const [gx, gy] = o.gravity ?? [0, 0], drag = o.drag ?? 0, seed = o.seed ?? 1, from = o.from ?? 0, to = o.to ?? Infinity;
  if (!(l0 > 0 && l1 >= l0) || !(v1 >= v0 && v0 >= 0) || !(drag >= 0) || (o.rate === undefined) === (o.burst === undefined) || !((o.rate ?? 1) > 0) || !((o.burst ?? 1) >= 1))
    throw new PxError(`emitter: give rate (a second) or burst (how many), life [ms, ms], speed [slow, fast] from 0, drag from 0; got ${JSON.stringify(o)}`);
  const src = typeof o.at === "function" ? o.at : (() => (o.at as [number, number] | undefined) ?? [0, 0]);
  const dist = (age: number) => (drag > 0 ? (1 - Math.exp(-drag * age)) / drag : age);
  const one = (id: number, born: number, key: number, t: number): Particle | undefined => {
    const r = rng(hash(key, seed, 977)), life = l0 + (l1 - l0) * r(), age = (t - born) / 1000;
    if (age < 0 || age * 1000 >= life) return undefined;
    const sp = v0 + (v1 - v0) * r(), a = ang + spread * (2 * r() - 1), [sx, sy] = src(born), d = dist(age), k = drag > 0 ? Math.exp(-drag * age) : 1;
    return { x: sx + Math.cos(a) * sp * d + 0.5 * gx * age * age, y: sy + Math.sin(a) * sp * d + 0.5 * gy * age * age, vx: Math.cos(a) * sp * k + gx * age, vy: Math.sin(a) * sp * k + gy * age, age: (age * 1000) / life, life, id };
  };
  return (t: number) => {
    const out: Particle[] = [];
    if (o.burst !== undefined) {
      for (let k = 0; k < o.burst; k++) { const p = one(k, from, k, t); if (p) out.push(p); }
      return out;
    }
    // births every 1000 / rate ms from `from`; on a loop, a birth's randomness repeats with it
    const every = 1000 / o.rate!, per = o.loop ? Math.max(1, Math.round((o.loop * o.rate!) / 1000)) : 0;
    const first = o.loop ? t - l1 : Math.max(from, t - l1), k0 = Math.ceil((first - from) / every), k1 = Math.floor((Math.min(t, to) - from) / every);
    for (let k = k0; k <= k1; k++) {
      const p = one(k, from + k * every, per ? ((k % per) + per) % per : k, t);
      if (p) out.push(p);
    }
    return out;
  };
}

/** What the particles and trails draw on. */
export interface VfxCanvas { t: number; color(k: unknown): Color | null; get(x: number, y: number): Color; plot(x: number, y: number, c: Color): boolean }

const keysOf = (c: VfxCanvas, keys: string | string[], what: string) => {
  const ks = colorList(keys).map((k) => c.color(k));
  if (!ks.length || ks.some((k) => k === null || k === TRANSPARENT)) throw new PxError(`${what}: keys are its tones, young (hot) to old ("wyor"), got ${JSON.stringify(keys)}`);
  return ks as Color[];
};

/** Draw an emitter's particles now (the canvas's clock), each in the key of its age, a streak `trail` ms back along its way. */
export function drawParticles(c: VfxCanvas, emit: (t: number) => Particle[], keys: string | string[], o: { x?: number; y?: number; trail?: number; size?: [number, number] } = {}): void {
  if (typeof emit !== "function") throw new PxError("particles(emitter({ ... }), keys, opts): the first is an emitter");
  const ks = keysOf(c, keys, "particles"), [s0, s1] = o.size ?? [1, 1], ox = o.x ?? 0, oy = o.y ?? 0, tr = o.trail ?? 0;
  const now = emit(c.t), back = tr > 0 ? new Map(emit(c.t - tr).map((p) => [p.id, p])) : undefined;
  // the oldest first, so the young (bright) ones are on top
  for (const p of now.sort((a, b) => b.age - a.age)) {
    const key = ks[Math.min(ks.length - 1, Math.floor(p.age * ks.length))], r = Math.max(0, (s0 + (s1 - s0) * p.age) / 2 - 0.5);
    const q = back?.get(p.id), pts: [number, number][] = [[p.x, p.y]];
    if (q) { const n = Math.ceil(Math.hypot(p.x - q.x, p.y - q.y)); for (let s = 1; s <= n; s++) pts.push([p.x + ((q.x - p.x) * s) / n, p.y + ((q.y - p.y) * s) / n]); }
    for (const [x, y] of pts)
      for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy++)
        for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++) if (dx * dx + dy * dy <= r * r + 0.5) c.plot(Math.round(ox + x) + dx, Math.round(oy + y) + dy, key);
  }
}

/**
 * A trail behind what moves along `path` (a function of the time giving [x, y]): from now back
 * `length` ms, `width` px across at its head and at its tail, in the keys head (hot) to tail, the
 * tail thinning in an ordered dither by `fade` (0..1).
 */
export function drawTrail(c: VfxCanvas, path: (t: number) => number[], keys: string | string[], o: { length?: number; width?: [number, number]; fade?: number; step?: number; from?: number } = {}): void {
  if (typeof path !== "function") throw new PxError("trail(t => [x, y], keys, opts): the first is the path, a function of the time");
  const ks = keysOf(c, keys, "trail"), L = o.length ?? 300, [w0, w1] = o.width ?? [4, 1], fade = o.fade ?? 0.6, step = o.step ?? 10, t = c.t;
  if (!(L > 0 && w0 >= 0 && w1 >= 0 && step > 0 && fade >= 0 && fade <= 1)) throw new PxError(`trail: length ms above 0, width [head, tail] px, fade 0..1, step ms above 0, got ${JSON.stringify(o)}`);
  const n = Math.max(1, Math.ceil(L / step)), drawn = new Set<number>();
  // the head first, so it keeps its tone where the trail folds over it; nothing before `from` (its start)
  for (let s = 0; s <= n; s++) {
    const k = s / n, tt = t - k * L;
    if (o.from !== undefined && tt < o.from) break;
    const [x, y] = path(tt), r = Math.max(0, (w0 + (w1 - w0) * k) / 2 - 0.5), key = ks[Math.min(ks.length - 1, Math.floor(k * ks.length))];
    for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy++)
      for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++) {
        if (dx * dx + dy * dy > r * r + 0.5) continue;
        const px = Math.round(x) + dx, py = Math.round(y) + dy, id = py * 65536 + px;
        if (drawn.has(id) || bayer(px, py) >= 1 - fade * k) continue;
        drawn.add(id);
        c.plot(px, py, key);
      }
  }
}
