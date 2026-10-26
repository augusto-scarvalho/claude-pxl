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
  /** a frame by phase: steps [phase, from, to?, ms?] in order (see ability()) */
  frame(t: number, steps: Step[], opts?: { before?: number; after?: number }): number;
  /** 0..1 from moment `a` to `b` (default the end of phase `a`), held at both ends */
  span(t: number, a: Moment, b?: Moment): number;
  /** in and out over a span, 0 outside it: min(1, k / in) × min(1, (1 - k) / out) */
  fade(t: number, a: Moment, b?: Moment, opts?: { in?: number; out?: number }): number;
  /** whole `ms` steps since a moment (negative before it), up to n - 1 */
  since(t: number, a: Moment, ms?: number, n?: number): number;
}
/** a moment of an ability: a phase's start or an event, or [that, ms after it] */
export type Moment = string | [string, number];
export type Step = [string, number, number?, number?];

/**
 * A spell's phases in time: `ability([["charge", 600], ["cast", 150], ...], { start, events })` (or
 * { charge: 600, ... }), `start` ms on the clock, `events` named moments: { hit: ["impact", 0] }.
 * `A.frame(t, steps)` times a pose's frames by phase: each step [phase, from, to?, ms?] begins at its
 * phase's start, or where the step before it ends when that one is of the same phase; a range plays at
 * `ms` a frame, or spread over what is left of the phase, and holds its last frame till the next step
 * (`before` the first step, `after` the last one ends: default held).
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
  const phase = (name: unknown) => {
    const i = list.findIndex((q) => q[0] === name);
    if (i < 0) throw new PxError(`ability: no phase '${name}'; it has ${list.map((q) => q[0]).join(", ")}`);
    return i;
  };
  const when = (m: Moment) => (Array.isArray(m) ? at.start(m[0]) + m[1] : at.start(m));
  const until = (a: Moment, b?: Moment) => { if (b !== undefined) return when(b); const i = phase(Array.isArray(a) ? a[0] : a); return starts[i] + list[i][1]; };
  at.span = (t, a, b) => { const t0 = when(a); return Math.max(0, Math.min(1, (t - t0) / (until(a, b) - t0))); };
  at.fade = (t, a, b, o = {}) => {
    const t0 = when(a), k = (t - t0) / (until(a, b) - t0);
    return k < 0 || k >= 1 ? 0 : (o.in ? Math.min(1, k / o.in) : 1) * (o.out ? Math.min(1, (1 - k) / o.out) : 1);
  };
  at.since = (t, a, ms = 1, n = Infinity) => Math.min(n - 1, Math.floor((t - when(a)) / ms));
  at.frame = (t, steps, o = {}) => {
    if (!Array.isArray(steps) || !steps.length || steps.some((s) => !Array.isArray(s) || !Number.isInteger(s[1]) || !(s[2] === undefined || (Number.isInteger(s[2]) && s[2] >= s[1])) || !(s[3] === undefined || s[3] > 0)))
      throw new PxError(`ability: frame's steps are [[phase, from, to?, ms?], ...]: frames from..to (whole, to at least from) at ms a frame, or spread over the rest of the phase, got ${JSON.stringify(steps)}`);
    let cur: { from: number; to: number; ms?: number; t0: number; t1: number } | undefined, prev: typeof cur & { i: number } | undefined;
    for (const [name, from, to = from, ms] of steps) {
      const i = phase(name), t0 = prev?.i === i ? prev.t1 : starts[i];
      prev = { i, from, to, ms, t0, t1: ms ? t0 + (to - from + 1) * ms : starts[i] + list[i][1] };
      if (t >= t0) cur = prev;
    }
    if (!cur) return o.before ?? steps[0][1];
    if (cur === prev && t >= cur.t1 && o.after !== undefined) return o.after;
    const k = t - cur.t0;
    return cur.from + Math.min(cur.to - cur.from, Math.floor(cur.ms ? k / cur.ms : (k * (cur.to - cur.from + 1)) / (cur.t1 - cur.t0)));
  };
  return at;
}

type Keyed = Record<string, unknown> & { t: number };
/**
 * Values keyed in time, `tween([{ t: 0, yaw: 60, look: "calm" }, { t: 4 }, { t: 6, yaw: 90 }], { moments })`:
 * at(t) gives the values at t, with t. Each key takes what it doesn't say from the one before; between
 * two keys numbers (and arrays of them) go eased in and out (straight over a span of 1 or less, so a run
 * of one-frame keys doesn't stop at each), anything else held till the next key; `moments` are said
 * only at their own key's t (a smear, a hit), never carried. Before the first key the first, after the last the last.
 */
export function tween(keys: Keyed[], opts: { moments?: string[] } = {}): (t: number) => Keyed {
  if (!Array.isArray(keys) || !keys.length || keys.some((k, i) => typeof k?.t !== "number" || (i > 0 && !(k.t > keys[i - 1].t))))
    throw new PxError(`tween: keys are [{ t: 0, ...values }, { t: 4, ... }, ...], each t a number past the one before, got ${JSON.stringify(keys)?.slice(0, 120)}`);
  const moments = opts.moments ?? [], once = new Set(["t", ...moments]), K: Keyed[] = [];
  for (const k of keys) { const o = { ...k }, prev = K[K.length - 1]; if (prev) for (const n in prev) if (!(n in o) && !once.has(n)) o[n] = prev[n]; K.push(o); }
  const mix = (a: unknown, b: unknown, e: number): unknown => (Array.isArray(b) ? b.map((v, j) => mix((a as unknown[])[j], v, e)) : (a as number) + ((b as number) - (a as number)) * e);
  return (t) => {
    const i = K.findIndex((k) => k.t > t);
    if (i <= 0) { const k = i ? K[K.length - 1] : K[0], p: Keyed = { ...k, t }; if (t !== k.t) for (const n of moments) delete p[n]; return p; }
    const a = K[i - 1], b = K[i], p: Keyed = { t }, s = (t - a.t) / (b.t - a.t), e = b.t - a.t > 1 ? s * s * (3 - 2 * s) : s;
    for (const n in b) if (!once.has(n)) p[n] = typeof b[n] === "number" || Array.isArray(b[n]) ? mix(a[n], b[n], e) : a[n];
    if (t === a.t) for (const n of moments) if (n in a) p[n] = a[n];
    return p;
  };
}

/** `[frames, value]` runs as a value a frame: unroll([[3, "rest"], [2, "cut"]]) is rest ×3, cut ×2; `[frames, a, b, ...]` holds [a, b, ...]. */
export function unroll<T>(runs: [number, ...T[]][]): (T | T[])[] {
  if (!Array.isArray(runs) || runs.some((r) => !Array.isArray(r) || !(Number.isInteger(r[0]) && r[0] >= 0) || r.length < 2))
    throw new PxError(`unroll: runs are [[frames, value], ...] (frames a whole number, 0 or more), got ${JSON.stringify(runs)?.slice(0, 120)}`);
  return runs.flatMap(([n, ...v]) => Array(n).fill(v.length > 1 ? v : v[0]));
}

/**
 * A value that lags the list's, a frame of a loop each: eased toward each value by (1 - damp) a frame
 * (a tail swinging after a turn), or with `peak` falling back at damp a frame from each peak it takes
 * (a coat's flare). Worked out over the loop twice, so its first frame follows its last.
 */
export function follow(values: number[], o: { damp?: number; peak?: boolean } = {}): number[] {
  const d = o.damp ?? 0.5;
  if (!Array.isArray(values) || !values.every(Number.isFinite) || !(d >= 0 && d < 1))
    throw new PxError(`follow(values, { damp, peak }): a number a frame, damp 0..1 (how much of the frame before it keeps), got ${JSON.stringify([values?.slice?.(0, 8), o.damp])}`);
  const out: number[] = [];
  let x = 0;
  for (let pass = 0; pass < 2; pass++) for (let i = 0; i < values.length; i++) out[i] = x = o.peak ? Math.max(values[i], x * d) : x * d + values[i] * (1 - d);
  return out;
}

// ---------------------------------------------------------------- a figure's way on the clock
const DIR8 = ["n", "ne", "e", "se", "s", "sw", "w", "nw"];
/** which of the 8 directions a way [dx, dz] on the ground goes (+z away from us: n) */
const dir8 = (dx: number, dz: number) => ((Math.round(Math.atan2(dx, dz) / (Math.PI / 4)) % 8) + 8) % 8;
const isPoint = (p: unknown): p is number[] => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite);
const isObj = (v: unknown): v is Record<string, any> => typeof v === "object" && v !== null && !Array.isArray(v);
type FrameFn = (f: number, t: number) => number;
interface Look { anim?: string; frame?: FrameFn; flip?: boolean }
export interface RouteOpts { pace?: number; origin?: number[]; ground?: (x: number, z: number) => number; climb?: boolean; walk?: string | Look; idle?: string | Look; loop?: number; round?: number }
export type RouteStep = number[] | { to?: number[]; hold?: number; name?: string; dir?: string; anim?: string; frame?: FrameFn };
/** a step of a route: a leg walked from a to b, or a hold at a (= b); its frames, from `start` */
export interface RouteLeg { name?: string; dir: string; a: number[]; b: number[]; n: number; start: number; walk: boolean; anim?: string; frame?: FrameFn }
type Placed = { name: string; at: number[]; frame: number; dir: string; flip?: "x" };
type Way = { x: number; z: number; heading: number[] };
export interface Route {
  /** the figure at frame f: a sprite for mesh() (`${anim}_${dir}`, its feet, its frame), null before it starts and once it is done */
  (f: number): Placed | null;
  /** the frame a named step begins (ability()'s, as span, fade and since) */
  start(name: string): number;
  span: Ability["span"]; fade: Ability["fade"]; since: Ability["since"];
  /** a named step: its ends as written, its frames and start */
  step(name: string): RouteLeg;
  /** a point [x, z] nearer than d to a leg (a tree in its way) */
  near(p: number[], d: number): boolean;
  /** s m along its points (holds left out, `round` corners), past both ends straight on: where, and the unit way it heads */
  at(s: number): Way;
  /** its frames, and those rounded up to a whole number of `loop` */
  total: number;
  frames: number;
}

/**
 * A figure's way on the clock, `route({ pace, origin, ground, walk, idle }, [[x, z], [x, z], { hold: 40, name: "talk" }, ...])`:
 * from the first point, each [x, z] (or `{ to, name?, dir?, anim?, frame? }`) a leg walked at `pace` m a
 * frame (its frames its length over the pace, `climb` counting the ground's rise), facing the one of 8
 * directions its way is nearest (`dir` says another); each `{ hold: frames }` a wait there, facing the
 * last leg's way. A step's sprite `${anim}_${dir}` of `walk` or `idle` (or its own `anim`), at `frame(f, t)`
 * (f the scene's, t into the step; default f), `flip: true` one side view flipped going west. Points
 * from `origin`; `ground(x, z)` the feet's height (where they stand: the third number of `at`).
 */
export function route(o: RouteOpts, steps: RouteStep[]): Route {
  if (!Array.isArray(steps) || !isPoint(steps[0]))
    throw new PxError(`route: steps are [[x, z] (where it starts), then [x, z] or { to: [x, z], name?, dir?, anim?, frame? } (a leg walked there), { hold: frames, name?, dir?, anim?, frame? } (a wait)], got ${JSON.stringify(steps)?.slice(0, 120)}`);
  if (o.pace !== undefined && !(o.pace > 0)) throw new PxError(`route: pace is m a frame, above 0, got ${JSON.stringify(o.pace)}`);
  if (o.ground !== undefined && typeof o.ground !== "function") throw new PxError("route: ground is (x, z) => the ground's height there");
  const look = (v: unknown, what: string): Look => {
    if (typeof v === "string") return { anim: v };
    if (v !== undefined && !(isObj(v) && typeof v.anim === "string" && (v.frame === undefined || typeof v.frame === "function")))
      throw new PxError(`route: ${what} is an anim's name ("tr_${what}": tr_${what}_ne, ...) or { anim, frame?: (f, t) => n, flip? }, got ${JSON.stringify(v)}`);
    return (v ?? {}) as Look;
  };
  const walk = look(o.walk, "walk"), idle = look(o.idle, "idle"), [ox, oz] = o.origin ?? [0, 0], world = (p: number[]) => [ox + p[0], oz + p[1]];
  const legs: RouteLeg[] = [];
  let at = steps[0] as number[], dir = "s", start = 0;
  for (const s of steps.slice(1)) {
    const p = isPoint(s) ? { to: s } : s;
    if (!isObj(p) || (p.to === undefined) === (p.hold === undefined) || (p.dir !== undefined && !DIR8.includes(p.dir)) || (p.frame !== undefined && typeof p.frame !== "function"))
      throw new PxError(`route: a step is [x, z], { to: [x, z], ... } or { hold: frames, ... } (dir one of ${DIR8.join(", ")}, frame (f, t) => n), got ${JSON.stringify(s)}`);
    let n: number;
    if (p.to !== undefined) {
      const b = isPoint(p.to) ? p.to : [NaN, NaN], dx = b[0] - at[0], dz = b[1] - at[1];
      if (!(dx || dz)) throw new PxError(`route: a leg goes to a point [x, z] other than the last, got ${JSON.stringify(p.to)}`);
      const [A, B] = [world(at), world(b)], len = o.climb && o.ground ? Math.hypot(dx, dz, o.ground(B[0], B[1]) - o.ground(A[0], A[1])) : Math.hypot(dx, dz);
      n = o.pace ? Math.max(1, Math.round(len / o.pace)) : 0;
      dir = p.dir ?? DIR8[dir8(dx, dz)];
      legs.push({ name: p.name, dir, a: at, b, n, start, walk: true, anim: p.anim, frame: p.frame });
      at = b;
    } else {
      n = p.hold as number;
      if (!(Number.isInteger(n) && n > 0)) throw new PxError(`route: a hold is a whole number of frames, got ${JSON.stringify(p.hold)}`);
      dir = p.dir ?? dir;
      legs.push({ name: p.name, dir, a: at, b: at, n, start, walk: false, anim: p.anim, frame: p.frame });
    }
    start += n;
  }
  const A = o.pace ? ability(legs.map((l) => [l.name ?? "", l.n])) : undefined;
  const timed = () => { if (!A) throw new PxError("route: walking it by frames takes a pace (m a frame)"); return A; };
  const visit = ((f: number) => {
    timed();
    for (const L of legs) {
      const t = f - L.start;
      if (t < 0) return null;
      if (t >= L.n) continue;
      // as far along as the frame is through the leg, from the start's place in the world
      const k = t / L.n, x = ox + L.a[0] + (L.b[0] - L.a[0]) * k, z = oz + L.a[1] + (L.b[1] - L.a[1]) * k;
      const lk = L.walk ? walk : idle, anim = L.anim ?? lk.anim, frame = L.frame ?? lk.frame, flip = !L.anim && lk.flip;
      if (!anim) throw new PxError(`route: no anim to ${L.walk ? "walk" : "hold"} in: give ${L.walk ? "walk" : "idle"} or the step's anim`);
      return { name: flip ? anim : `${anim}_${L.dir}`, at: o.ground ? [x, z, o.ground(x, z)] : [x, z], frame: frame ? frame(f, t) : f, dir: L.dir, ...(flip && L.dir.includes("w") ? { flip: "x" as const } : {}) };
    }
    return null;
  }) as Route;
  visit.start = (name) => timed().start(name);
  visit.span = (t, a, b) => timed().span(t, a, b);
  visit.fade = (t, a, b, f) => timed().fade(t, a, b, f);
  visit.since = (t, a, ms, n) => timed().since(t, a, ms, n);
  visit.step = (name) => {
    const L = legs.find((l) => l.name === name);
    if (!L) throw new PxError(`route: no step named '${name}'; it has ${legs.filter((l) => l.name).map((l) => l.name).join(", ") || "none"}`);
    return L;
  };
  visit.near = (p, d) => legs.some((L) => {
    if (!L.walk) return false;
    const [ax, az] = world(L.a), [bx, bz] = world(L.b), dx = bx - ax, dz = bz - az;
    const k = Math.max(0, Math.min(1, ((p[0] - ax) * dx + (p[1] - az) * dz) / (dx * dx + dz * dz)));
    return Math.hypot(p[0] - ax - dx * k, p[1] - az - dz * k) < d;
  });
  let way: ((s: number) => Way) | undefined;
  visit.at = (s) => (way ??= along([steps[0] as number[], ...legs.filter((l) => l.walk).map((l) => l.b)].map(world), o.round ?? 0))(s);
  visit.total = start;
  visit.frames = Math.ceil(start / (o.loop ?? 1)) * (o.loop ?? 1);
  return visit;
}

/** s along the points: straight runs, each corner an arc of radius r touching both (none on a U-turn); straight on past both ends */
function along(P: number[][], r: number): (s: number) => Way {
  if (P.length < 2) throw new PxError("route: at(s) goes along its legs: give it one");
  const d = P.slice(1).map((p, i) => { const dx = p[0] - P[i][0], dz = p[1] - P[i][1], l = Math.hypot(dx, dz); return [dx / l, dz / l]; });
  const pieces: [number, (u: number) => Way][] = [];
  let from = P[0];
  d.forEach((di, i) => {
    const run = from;
    let to = P[i + 1], arc: [number, (u: number) => Way] | undefined, next = to;
    const dn = d[i + 1], cos = dn ? di[0] * dn[0] + di[1] * dn[1] : 1, sin = dn ? di[0] * dn[1] - di[1] * dn[0] : 0;
    if (r > 0 && sin !== 0 && 1 + cos > 1e-9) {
      // the arc's ends on this run (A) and the next (B), its middle C to the inside of the turn
      const e = (r * Math.abs(sin)) / (1 + cos), p = P[i + 1], sg = Math.sign(sin), len = r * Math.atan2(Math.abs(sin), cos);
      const a = [p[0] - di[0] * e, p[1] - di[1] * e], b = [p[0] + dn[0] * e, p[1] + dn[1] * e], c = [a[0] - sg * di[1] * r, a[1] + sg * di[0] * r];
      const a0 = Math.atan2(a[1] - c[1], a[0] - c[0]), a1 = Math.atan2(b[1] - c[1], b[0] - c[0]);
      let da = a1 - a0;
      if (da > Math.PI) da -= 2 * Math.PI;
      if (da < -Math.PI) da += 2 * Math.PI;
      arc = [len, (u) => {
        const t = u / len, ang = a0 + da * t, hd = [di[0] + (dn[0] - di[0]) * t, di[1] + (dn[1] - di[1]) * t], n = Math.hypot(hd[0], hd[1]);
        return { x: c[0] + Math.cos(ang) * r, z: c[1] + Math.sin(ang) * r, heading: [hd[0] / n, hd[1] / n] };
      }];
      to = a; next = b;
    }
    pieces.push([Math.hypot(to[0] - run[0], to[1] - run[1]), (u) => ({ x: run[0] + di[0] * u, z: run[1] + di[1] * u, heading: di })]);
    if (arc) pieces.push(arc);
    from = next;
  });
  return (s) => {
    let u = s;
    for (let i = 0; i < pieces.length - 1; i++) { if (u < pieces[i][0]) return pieces[i][1](u); u -= pieces[i][0]; }
    return pieces[pieces.length - 1][1](u);
  };
}

/**
 * A figure turning to a target a direction every `every` frames (the shorter way round; counted from
 * frame `from`): `turnToward("mo_idle", [x, z], visit, { rest: "s", within: 6.5 })`. The target, at a
 * frame: a sprite (its `at`), a point, a direction ("e"), or null (back to `rest`), or a function of the
 * frame giving one; nearer than `within` m only. Gives (f) => its sprite `${anim}_${dir}` at `frame(f)` (default f).
 */
export function turnToward(anim: string, at: number[], target: unknown, o: { every?: number; rest?: string; within?: number; from?: number; frame?: (f: number) => number } = {}): (f: number) => { name: string; at: number[]; frame: number } {
  const every = o.every ?? 2, rest = DIR8.indexOf(o.rest ?? "s"), within = o.within ?? Infinity, from = o.from ?? 0, ks: number[] = [];
  if (typeof anim !== "string" || !Array.isArray(at) || at.length < 2 || !at.every(Number.isFinite)) throw new PxError(`turnToward(anim, [x, z], target, opts): an anim's name ("mo_idle": mo_idle_n, ...) and where it stands, got ${JSON.stringify([anim, at])}`);
  if (rest < 0 || !(Number.isInteger(every) && every > 0)) throw new PxError(`turnToward: rest is one of ${DIR8.join(", ")} and every a whole number of frames, got ${JSON.stringify([o.rest, o.every])}`);
  const want = (f: number) => {
    const g = typeof target === "function" ? target(f) : target;
    if (typeof g === "string") {
      if (!DIR8.includes(g)) throw new PxError(`turnToward: a direction is one of ${DIR8.join(", ")}, got '${g}'`);
      return DIR8.indexOf(g);
    }
    const p = Array.isArray(g) ? g : isObj(g) ? g.at : undefined;
    if (!p) return rest;
    const dx = p[0] - at[0], dz = p[1] - at[1];
    return Math.hypot(dx, dz) > within ? rest : dir8(dx, dz);
  };
  return (f) => {
    f = Math.max(0, Math.floor(f));
    // each frame's facing from the one before (worked out once, in order: any frame sought comes out the same)
    for (let i = ks.length; i <= f; i++) {
      let k = i ? ks[i - 1] : rest;
      if ((((i - from) % every) + every) % every === 0) { const w = want(i); if (w !== k) k = (k + ((w - k + 8) % 8 <= 4 ? 1 : 7)) % 8; }
      ks.push(k);
    }
    return { name: `${anim}_${DIR8[ks[f]]}`, at, frame: o.frame ? o.frame(f) : f };
  };
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
