// A spell kit: spell("fire", 3, { from, to }) is a whole cast on the clock (charge, cast, flight,
// impact, dissipate), built of phase 5's pieces (ability, emitter, particles, trail, smoke) and drawn
// in pixel art: a ball of noise in its element's ramp, a trail, sparks, the impact's shape, and from
// the second tier a shockwave, from the third a centerpiece filling the picture (a pillar, a storm,
// spikes, a tornado, a sphere, a beam), a flash and a mark left on the ground. What it draws gives
// light (unlit, blooming in post()) and it puts lamps where it is, for a lighting() item to light the
// ground round it. An element is a recipe (ELEMENTS): its ramp, its noise, how its particles fly, how
// it moves, the shape of its impact. A tier scales it all (fire, fira, firaga). Anything can be given over it.
import { type Color, TRANSPARENT } from "./color.ts";
import { noise } from "./effects.ts";
import { PxError } from "./errors.ts";
import { type SmokeCanvas, drawSmoke } from "./smoke.ts";
import { bayer, hash, rng } from "./util.ts";
import { type Ability, type EmitterOpts, type VfxCanvas, ability, drawParticles, drawTrail, emitter } from "./vfx.ts";

export const SHAPES = ["burst", "ring", "shards", "splash", "debris", "swirl", "rays", "implode", "sparkle"] as const;
export const BIGS = ["pillar", "bolts", "spikes", "tornado", "sphere", "beam", "helix"] as const;
type Shape = (typeof SHAPES)[number];
type Big = (typeof BIGS)[number];
export interface Element {
  /** an element to start from: what this one gives goes over it */
  like?: string;
  /** its ramp: the bright core first, the dark edge last (3 or 4 tones, keys or #hex) */
  keys: string[];
  /** the ball it flies as: its radius at tier 1 (px), its noise's cell (px), how fast it churns; false: none (a bolt) */
  ball?: false | { r?: number; scale?: number; speed?: number };
  /** it flies as a jagged bolt from the hand to where it has got (lightning) */
  bolt?: boolean;
  /** how it moves: an arc (px up at tier 1), its easing, a wave across its way (px) */
  motion?: { arc?: number; ease?: "linear" | "in" | "out"; wave?: number };
  trail?: false | { length?: number; width?: [number, number] };
  /** the sparks it throws as it flies (an emitter's options, px and px a second) and their keys, young to old */
  particles?: false | (EmitterOpts & { keys?: string[] });
  /** the impact's shape and its keys (default the ramp); smoke's three keys (lit, middle, shaded), or false */
  impact?: { shape?: Shape; keys?: string[]; smoke?: false | string[] };
  /** the third tier's centerpiece */
  big?: Big;
  /** the mark it leaves on the ground at the third tier: two keys, the rim first; false for none */
  mark?: false | string[];
  /** the third tier's flash (default the ramp's first); its light's color (default the ramp's second) */
  flash?: string;
  light?: string;
  /** ms of each phase at tier 1 */
  timing?: { charge?: number; cast?: number; travel?: number; impact?: number; dissipate?: number };
}
const ELEMENT_KEYS = ["like", "keys", "ball", "bolt", "motion", "trail", "particles", "impact", "big", "mark", "flash", "light", "timing"];

/** The elements: each a recipe to copy and change (the guide: scenes, "Designing an element"). */
export const ELEMENTS: Record<string, Element> = {
  fire: { keys: ["#fff4c0", "#ffc040", "#ff6a1c", "#a8200c"], ball: { r: 3, scale: 1.6, speed: 2 }, motion: { arc: 4, ease: "in" },
    particles: { rate: 40, life: [150, 350], speed: [8, 24], angle: -90, spread: 50, gravity: [0, -40], keys: ["#ffd060", "#ff8a20", "#a8200c"] },
    impact: { shape: "burst", smoke: ["#b0a49a", "#706660", "#423c3a"] }, big: "pillar", mark: ["#3a2018", "#1a100c"] },
  ice: { keys: ["#ffffff", "#c8f0ff", "#6ac8f0", "#2a6aa8"], ball: { r: 3, scale: 2.4, speed: 1 }, motion: { arc: 2 },
    particles: { rate: 30, life: [200, 400], speed: [6, 18], angle: 180, spread: 40, gravity: [0, 30], keys: ["#ffffff", "#9ce0ff", "#4a9ad8"] },
    impact: { shape: "shards", smoke: ["#f0f8ff", "#b8d8ec", "#7aa0c0"] }, big: "spikes", mark: ["#9cd0f0", "#e8f8ff"] },
  lightning: { keys: ["#ffffff", "#fff8a0", "#a8e0ff", "#4a60d8"], ball: false, bolt: true, motion: { ease: "out" },
    particles: { rate: 60, life: [80, 200], speed: [20, 50], spread: 180, keys: ["#ffffff", "#a8e0ff"] },
    impact: { shape: "rays", smoke: false }, big: "bolts", mark: ["#4a4a6a", "#2a2a3a"], timing: { travel: 160 } },
  water: { keys: ["#e8ffff", "#8ae0ff", "#3a9ae8", "#1a4aa8"], ball: { r: 3, scale: 2, speed: 3 }, motion: { arc: 14, ease: "linear" },
    particles: { rate: 30, life: [200, 400], speed: [4, 12], angle: 90, spread: 30, gravity: [0, 120], keys: ["#8ae0ff", "#3a9ae8"] },
    impact: { shape: "splash", smoke: false }, big: "pillar", mark: ["#5aa8e8", "#2a6ab8"] },
  earth: { keys: ["#d8c8a0", "#a88a5a", "#6a5032", "#3a2a1c"], ball: { r: 3, scale: 3, speed: 0.3 }, motion: { arc: 16, ease: "linear" },
    particles: { rate: 15, life: [200, 400], speed: [4, 10], angle: 90, spread: 60, gravity: [0, 80], keys: ["#a88a5a", "#6a5032"] },
    impact: { shape: "debris", smoke: ["#c8b8a0", "#94846c", "#5e5240"] }, big: "spikes", mark: ["#4a3826", "#2a1e14"], light: "#ffc890" },
  wind: { keys: ["#ffffff", "#d8f8e8", "#9ae8c8", "#4aa888"], ball: { r: 2, scale: 1.2, speed: 4 }, motion: { wave: 4 },
    particles: { rate: 40, life: [150, 300], speed: [20, 40], angle: 180, spread: 20, keys: ["#ffffff", "#9ae8c8"] },
    trail: { length: 260, width: [3, 1] }, impact: { shape: "swirl", smoke: false }, big: "tornado", mark: false },
  light: { keys: ["#ffffff", "#fffbd0", "#ffe680", "#d8a830"], ball: { r: 2, scale: 1.4, speed: 2 }, motion: { ease: "out" },
    particles: { rate: 40, life: [200, 400], speed: [4, 14], spread: 180, keys: ["#ffffff", "#ffe680"] },
    impact: { shape: "rays", smoke: false }, big: "beam", mark: ["#fff4c0", "#d8b850"] },
  dark: { keys: ["#d8b0ff", "#8a4ad8", "#4a1a8a", "#1a0a2a"], ball: { r: 3, scale: 1.8, speed: 1.5 }, motion: { wave: 2, ease: "linear" },
    particles: { rate: 30, life: [250, 500], speed: [2, 8], spread: 180, keys: ["#8a4ad8", "#4a1a8a", "#1a0a2a"] },
    impact: { shape: "implode", smoke: ["#6a5a8a", "#3a2a5a", "#1a102a"] }, big: "sphere", mark: ["#3a1a5a", "#1a0a2a"], flash: "#000000", light: "#8a4ad8" },
  heal: { keys: ["#ffffff", "#d0ffd0", "#80e890", "#3aa858"], ball: { r: 2, scale: 1.4, speed: 2 }, motion: { arc: 10, ease: "out" },
    particles: { rate: 25, life: [300, 600], speed: [4, 10], angle: -90, spread: 30, gravity: [0, -10], keys: ["#ffffff", "#80e890"] },
    impact: { shape: "sparkle", smoke: false }, big: "helix", mark: ["#a8f0b0", "#3aa858"] },
};

/** What a tier does: its size, how many particles, how long, its light (px, power) and glow (0..1), its drama. */
export const TIERS = [
  { scale: 1, count: 1, time: 1, reach: 28, power: 0.9, glow: 0.4, shake: 0, ring: false, big: false },
  { scale: 1.5, count: 2, time: 1.25, reach: 44, power: 1.2, glow: 0.7, shake: 1, ring: true, big: false },
  { scale: 2, count: 3, time: 1.6, reach: 72, power: 1.5, glow: 1, shake: 2, ring: true, big: true },
];

export interface SpellOpts extends Partial<Element> {
  /** where it starts (the hand) and where it lands, [x, y] px; the ground's row under the target (default a little below it) */
  from: [number, number];
  to: [number, number];
  ground?: number;
  /** ms on the clock it begins */
  start?: number;
  seed?: number;
  /** the tier's factors over its own: size, particles, duration, the light's reach (px) and power, the glow, the shake (px) */
  scale?: number;
  count?: number;
  time?: number;
  reach?: number;
  power?: number;
  glow?: number;
  shake?: number;
}
export const SPELL_OPTS = ["from", "to", "ground", "start", "seed", "scale", "count", "time", "reach", "power", "glow", "shake", ...ELEMENT_KEYS.filter((k) => k !== "like")];
export interface Spell {
  /** its phases on the clock: charge, cast, travel, impact, dissipate */
  ability: Ability;
  /** ms from its start to its end */
  total: number;
  /** the recipe it was made of, what was given over it */
  element: Element;
  tier: number;
  /** how much light a pixel it draws gives (0..1: emission, bloom) */
  glow: number;
  /** where it is at a time (the hand while it charges, the ball, where it hit) */
  at(t: number): number[];
  /** what it draws under itself (the mark), what gives light, what goes over it (smoke) */
  under(c: SpellCanvas): void;
  draw(c: SpellCanvas): void;
  over(c: SpellCanvas): void;
  /** its lamps at a time ({ x, y, r, power, color }) and its flash ({ color, amount } for effect("tint"), or none) */
  lights(t: number): { x: number; y: number; r: number; power: number; color: string }[];
  flash(t: number): { color: string; amount: number } | undefined;
  /** px the picture is thrown [x, y] as it hits (the tier's drama), [0, 0] otherwise */
  shake(t: number): [number, number];
}
export interface SpellCanvas extends VfxCanvas, SmokeCanvas {}

const ease = (k: number) => 1 - (1 - k) ** 2;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** The recipe a name or a recipe stands for, `like` resolved, its keys checked. */
export function element(e: string | Element): Element {
  if (typeof e === "string") {
    if (!ELEMENTS[e]) throw new PxError(`spell: no element '${e}'; there are ${Object.keys(ELEMENTS).join(", ")} (or give a recipe: { keys, ball, motion, particles, impact, big, ... })`);
    return ELEMENTS[e];
  }
  if (!e || typeof e !== "object") throw new PxError("spell: the element is a name or a recipe { keys: [4 tones], ... }");
  const bad = Object.keys(e).filter((k) => !ELEMENT_KEYS.includes(k));
  if (bad.length) throw new PxError(`spell: an element has no '${bad[0]}'; it takes ${ELEMENT_KEYS.join(", ")}`);
  const base = e.like ? element(e.like) : undefined, out = { ...base, ...e, impact: { ...base?.impact, ...e.impact } } as Element;
  if (!Array.isArray(out.keys) || out.keys.length < 2) throw new PxError(`spell: an element's keys are its ramp, the core first: 3 or 4 tones, got ${JSON.stringify(out.keys)}`);
  if (out.impact?.shape && !SHAPES.includes(out.impact.shape)) throw new PxError(`spell: an impact's shape is ${SHAPES.join(", ")}, got ${JSON.stringify(out.impact.shape)}`);
  if (out.big && !BIGS.includes(out.big)) throw new PxError(`spell: big is ${BIGS.join(", ")}, got ${JSON.stringify(out.big)}`);
  return out;
}

/** spell(element, tier, { from, to, ... }): a whole cast, its phases scaled by the tier, drawn on the clock. */
export function spell(name: string | Element, tier: number, o: SpellOpts): Spell {
  if (![1, 2, 3].includes(tier)) throw new PxError(`spell: the tier is 1, 2 or 3 (fire, fira, firaga), got ${JSON.stringify(tier)}`);
  if (!o || !Array.isArray(o.from) || !Array.isArray(o.to)) throw new PxError("spell(element, tier, { from: [x, y], to: [x, y], ... }): where it starts and where it lands");
  const { from, to, ground, start = 0, seed = 1, scale, count, time, reach, power, glow, shake, ...over } = o;
  const E = element(Object.keys(over).length ? ({ ...(typeof name === "string" ? { like: name } : name), ...over } as Element) : name);
  const T = TIERS[tier - 1], S = scale ?? T.scale, N = count ?? T.count, D = time ?? T.time, R = reach ?? T.reach, P = power ?? T.power;
  const tm = { charge: 400, cast: 120, travel: 450, impact: 250, dissipate: 700, ...E.timing };
  const A = ability([["charge", tm.charge * D], ["cast", tm.cast], ["travel", tm.travel * (E.bolt ? 1 : D)], ["impact", tm.impact * D * (T.big ? 1.6 : 1)], ["dissipate", tm.dissipate * D]], { start });
  const hit = A.start("impact"), end = start + A.total;
  const gy = ground ?? to[1] + Math.round(7 * S), arc = (E.motion?.arc ?? 0) * S, wave = (E.motion?.wave ?? 0) * S;
  const path = (t: number) => {
    const [x, y] = A.along(from, to, t, { arc, ease: E.motion?.ease ?? "in" }), k = clamp01((t - A.start("travel")) / (hit - A.start("travel")));
    return [x, y + wave * Math.sin(k * Math.PI * 4) * Math.sin(k * Math.PI)];
  };
  const pk = E.particles ? E.particles.keys ?? E.keys : E.keys;
  const fly = E.particles ? emitter({ ...E.particles, keys: undefined, at: (t: number) => path(t) as [number, number], rate: (E.particles.rate ?? 30) * N, from: A.start("travel"), to: hit, seed } as EmitterOpts) : undefined;
  const burst = emitter({ at: to, burst: Math.round(10 * N * S), from: hit, life: [250, 600 * D], speed: [20 * S, 55 * S], angle: -90, spread: 100, gravity: [0, E.impact?.shape === "sparkle" ? -30 : 90], drag: 1.4, seed: seed + 1 });
  const charge = emitter({ at: from, rate: 20 * N, from: A.start("charge"), to: A.start("cast"), life: [150, 300], speed: [6, 16], spread: 180, seed: seed + 2 });
  // how far through impact and dissipate (0..1), and through the impact alone
  const after = (t: number) => clamp01((t - hit) / (end - hit)), into = (t: number) => clamp01((t - hit) / (A.start("dissipate") - hit));
  const live = (t: number) => t >= start && t < end;
  const r = (E.ball ? E.ball.r ?? 3 : 2) * S;
  const at = (t: number) => (t < A.start("travel") ? from : t < hit ? path(t) : to);
  return {
    ability: A, total: A.total, element: E, tier, glow: glow ?? T.glow, at,
    under(c) {
      if (T.big && E.mark && live(c.t) && c.t >= hit) mark(c, to[0], gy, Math.round(10 * S), keysOf(c, E.mark), 1 - clamp01((after(c.t) - 0.7) / 0.3));
    },
    draw(c) {
      const t = c.t, p = A(t);
      if (!live(t)) return;
      const ks = keysOf(c, E.keys);
      if (p.name === "charge") {
        drawParticles(c, charge, E.keys.slice(0, 3));
        if (E.ball !== false) orb(c, from[0], from[1], Math.max(1, r * (0.3 + 0.7 * p.k)), ks, E, seed, t);
        else spark(c, from[0], from[1], 1 + Math.round(2 * p.k), ks, t);
      } else if (p.name === "cast") {
        ring(c, from[0], from[1], r + 1 + p.k * 4 * S, ks.slice(0, 2), 1 - p.k);
        if (E.ball !== false) orb(c, from[0], from[1], r, ks, E, seed, t);
      } else if (p.name === "travel") {
        if (E.bolt) bolt(c, from, path(t), ks, seed + Math.floor(t / 50), Math.max(1, Math.round(S / 1.5)));
        else {
          if (E.trail !== false) drawTrail(c, path, E.keys, { length: (E.trail?.length ?? 160) * D, width: E.trail?.width ? (E.trail.width.map((w) => w * S) as [number, number]) : [Math.round(r * 1.6), 1], from: A.start("travel") });
          const [x, y] = path(t);
          orb(c, x, y, r, ks, E, seed, t);
        }
        if (fly) drawParticles(c, fly, pk);
      } else {
        // the impact: (tier 3) the centerpiece, its shape, (tier 2 on) a shockwave on the ground, sparks
        const k = after(t), ki = into(t);
        if (T.big) centerpiece(c, E.big ?? "pillar", to, gy, S, ks, k, seed, t);
        shape(c, E.impact?.shape ?? "burst", to, gy, S, E.impact?.keys ? keysOf(c, E.impact.keys) : ks, ki, k, seed, t);
        if (T.ring) ring(c, to[0], gy, Math.round(4 + ease(ki) * 18 * S), ks.slice(1, 3), 1 - ki, 0.35);
        drawParticles(c, burst, pk, { trail: 30 });
      }
    },
    over(c) {
      const smoke = E.impact?.smoke;
      if (smoke && live(c.t) && c.t >= hit)
        drawSmoke(c, to[0], gy, smoke, { shape: "puff", spread: 6 * S, size: [2 * S, 5 * S], count: Math.round(6 + 3 * N), seed, frame: Math.floor(Math.min(0.99, after(c.t)) * c.frames) });
    },
    lights(t) {
      if (!live(t)) return [];
      const p = A(t), color = E.light ?? E.keys[1];
      if (p.name === "charge") return [{ x: from[0], y: from[1], r: R * 0.4 * (0.4 + 0.6 * p.k), power: P * 0.6 * p.k, color }];
      if (p.name === "cast" || p.name === "travel") { const [x, y] = at(t); return [{ x, y, r: R * 0.5, power: P * 0.8, color }]; }
      return [{ x: to[0], y: Math.min(to[1], gy - 2), r: R * (0.6 + 0.4 * ease(into(t))), power: P * (1 - after(t)) ** 1.5, color }];
    },
    flash(t) {
      return T.big && t >= hit && t < hit + 100 ? { color: E.flash ?? E.keys[0], amount: 0.35 * (1 - (t - hit) / 100) } : undefined;
    },
    shake(t) {
      // a whole pixel each way for 300 ms, smaller as it goes, a new way every 50 ms
      const a = Math.round((shake ?? T.shake) * (1 - (t - hit) / 300));
      if (!(t >= hit && a > 0)) return [0, 0];
      const q = rng(hash(Math.floor(t / 50), seed, 23));
      return [Math.round((q() * 2 - 1) * a), Math.round((q() * 2 - 1) * a)];
    },
  };
}

// ---------------------------------------------------------------- what spells are drawn of
const keysOf = (c: VfxCanvas, keys: string[]) =>
  keys.map((k) => { const v = c.color(k); if (v === null || v === TRANSPARENT) throw new PxError(`spell: '${k}' is not a visible color`); return v; });
const put = (c: VfxCanvas, x: number, y: number, col: Color, density = 1) => {
  const X = Math.round(x), Y = Math.round(y);
  if (density >= 1 || bayer(X, Y) < density) c.plot(X, Y, col);
};

/** A ball of the ramp: noise churning in a disc, brighter toward the middle, its rim the darkest. */
function orb(c: VfxCanvas, x: number, y: number, r: number, ks: Color[], E: Element, seed: number, t: number): void {
  const n = noise(seed), sc = (E.ball && E.ball.scale) || 2, a = (t / 1000) * ((E.ball && E.ball.speed) || 1), R = Math.ceil(r);
  for (let dy = -R; dy <= R; dy++)
    for (let dx = -R; dx <= R; dx++) {
      const d = Math.hypot(dx, dy) / Math.max(r, 0.5);
      if (d > 1) continue;
      const i = Math.min(ks.length - 1, Math.floor(d * d * 2.2 + n(dx / sc + Math.cos(a) * 2, dy / sc + Math.sin(a) * 2) * 1.6));
      put(c, x + dx, y + dy, ks[d > 0.85 && r > 1.5 ? Math.max(i, ks.length - 2) : i]);
    }
}
/** A ring of radius R (squashed by `flat`: on the ground), thinning out by `density`. */
function ring(c: VfxCanvas, x: number, y: number, R: number, ks: Color[], density: number, flat = 1): void {
  if (density <= 0 || R <= 0) return;
  const steps = Math.ceil(R * 8);
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    for (let w = 0; w < Math.max(1, Math.round(R / 8)); w++) put(c, x + Math.cos(a) * (R - w), y + Math.sin(a) * (R - w) * flat, ks[Math.min(ks.length - 1, w)], density);
  }
}
/** A small spark (a plus) that twinkles. */
function spark(c: VfxCanvas, x: number, y: number, s: number, ks: Color[], t: number): void {
  const on = Math.floor(t / 80) % 2 ? 0 : 1;
  put(c, x, y, ks[0]);
  for (let k = 1; k <= s + on; k++) for (const [dx, dy] of [[k, 0], [-k, 0], [0, k], [0, -k]]) put(c, x + dx, y + dy, ks[Math.min(ks.length - 1, k)]);
}
/** A jagged bolt from a to b, a kink every 7 px, `w` px each side of its white core, forking (forks thinner, dimmer). */
function bolt(c: VfxCanvas, a: number[], b: number[], ks: Color[], seed: number, w = 1, fork = true): void {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (L < 1) return;
  const r = rng(hash(seed, 17, 3)), n = Math.max(2, Math.round(L / 7)), ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L, steep = Math.abs(uy) > Math.abs(ux);
  let px = a[0], py = a[1];
  for (let i = 1; i <= n; i++) {
    const k = i / n, jit = i === n ? 0 : (r() - 0.5) * 12, qx = a[0] + (b[0] - a[0]) * k - uy * jit, qy = a[1] + (b[1] - a[1]) * k + ux * jit;
    const m = Math.max(1, Math.ceil(Math.hypot(qx - px, qy - py)));
    for (let s = 0; s <= m; s++) {
      const x = px + ((qx - px) * s) / m, y = py + ((qy - py) * s) / m;
      for (let d = -w; d <= w; d++) put(c, x + (steep ? d : 0), y + (steep ? 0 : d), ks[Math.min(ks.length - 1, d ? Math.abs(d) + 1 : 0)]);
    }
    if (fork && i < n - 1 && r() < 0.3) {
      const side = r() < 0.5 ? -1 : 1, fl = (6 + r() * 8) * 0.7;
      bolt(c, [qx, qy], [qx + (ux - side * uy) * fl, qy + (uy + side * ux) * fl], ks.slice(1), seed + i * 31, 0, false);
    }
    px = qx; py = qy;
  }
}
/** The mark on the ground: a flat ellipse, its rim one key and its middle the other, going in a dither. */
function mark(c: VfxCanvas, x: number, y: number, R: number, ks: Color[], density: number): void {
  const h = Math.ceil(R * 0.35);
  for (let dy = -h; dy <= h; dy++)
    for (let dx = -R; dx <= R; dx++) {
      const d = Math.hypot(dx / R, dy / (R * 0.35));
      if (d <= 1) put(c, x + dx, y + dy, ks[d > 0.7 ? 0 : 1], density * (d > 0.85 ? 0.5 : 1));
    }
}
/** The impact's own shape at `to`: `ki` through the impact, `k` through impact and dissipate. */
function shape(c: VfxCanvas, s: Shape, to: number[], gy: number, S: number, ks: Color[], ki: number, k: number, seed: number, t: number): void {
  const [x, y] = to, R = ease(ki) * 9 * S, fade = 1 - clamp01((k - 0.5) / 0.5), r = rng(hash(seed, 5, 9));
  switch (s) {
    case "burst":
      for (let dy = -Math.ceil(R); dy <= R; dy++)
        for (let dx = -Math.ceil(R); dx <= R; dx++) {
          const d = Math.hypot(dx, dy) / Math.max(1, R);
          if (d <= 1) put(c, x + dx, y + dy, ks[Math.min(ks.length - 1, Math.floor(d * ks.length * 0.9 + ki * 1.5))], (1 - ki * 0.9) * (d < 0.6 ? 1 : 0.6));
        }
      break;
    case "ring": ring(c, x, y, R, ks, fade); break;
    case "implode": ring(c, x, y, (1 - ease(ki)) * 12 * S, ks.slice(0, 2), fade); orb(c, x, y, ki * 3 * S * fade, [...ks].reverse(), {} as Element, seed, t); break;
    case "shards": case "rays": {
      const n = s === "rays" ? 8 : 6;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + (s === "shards" ? r() : 0), L = (s === "rays" ? (6 + 4 * Math.sin(t / 40 + i)) * (1 - ki * 0.5) : 8 * (0.7 + 0.6 * r()) * ease(ki)) * S;
        for (let j = 0; j <= L; j++) put(c, x + Math.cos(a) * j, y + Math.sin(a) * j * (s === "shards" ? 0.8 : 1), ks[Math.min(ks.length - 1, Math.floor((j / Math.max(1, L)) * ks.length))], fade);
      }
      break;
    }
    case "splash":
      ring(c, x, gy, Math.round(2 + ease(ki) * 12 * S), ks.slice(1, 3), fade, 0.3);
      for (let i = 0; i < 6 * S; i++) {
        const a = -Math.PI / 2 + (r() - 0.5) * 2.2, v = (20 + 25 * r()) * S, tt = ki * 0.6;
        put(c, x + Math.cos(a) * v * tt, Math.min(gy, y + Math.sin(a) * v * tt + 60 * tt * tt), ks[1 + (i % 2)], fade);
      }
      break;
    case "debris":
      for (let i = 0; i < 5 * S; i++) {
        const a = -Math.PI / 2 + (r() - 0.5) * 2.6, v = (18 + 22 * r()) * S, tt = ki * 0.7, X = x + Math.cos(a) * v * tt, Y = Math.min(gy, y + Math.sin(a) * v * tt + 70 * tt * tt);
        for (let q = 0; q < 2; q++) for (let w = 0; w < 2; w++) put(c, X + q, Y + w, ks[Math.min(ks.length - 1, 2 + ((q + w) % 2))]);
      }
      break;
    case "swirl":
      for (let i = 0; i < 3; i++)
        for (let j = 0; j < 24; j++) {
          const a = (j / 24) * Math.PI * 1.5 + i * 2.1 + t / 120, rr = (3 + j * 0.35) * S * (0.4 + ki);
          put(c, x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.6, ks[Math.min(ks.length - 1, Math.floor(j / 8))], fade);
        }
      break;
    case "sparkle":
      for (let i = 0; i < 5 * S; i++) {
        const X = x + (r() - 0.5) * 14 * S, Y = y + 4 * S - (r() * 0.4 + ki) * 14 * S;
        if (Math.floor(t / 90 + i) % 3 && fade > 0.2) spark(c, X, Y, 1, ks, t + i * 40);
      }
      break;
  }
}
/** The third tier's centerpiece at the target, filling the picture: `k` through impact and dissipate. */
function centerpiece(c: VfxCanvas, b: Big, to: number[], gy: number, S: number, ks: Color[], k: number, seed: number, t: number): void {
  const [x] = to, grow = Math.min(1, k / 0.15), die = 1 - clamp01((k - 0.55) / 0.45), n = noise(seed + 41), top = Math.min(0, gy - 200);
  if (die <= 0) return;
  switch (b) {
    case "pillar": case "beam": {
      // a column from the ground up out of the picture: a pillar wider at its foot, its edges licking
      // up in tongues and its middle churning upward; a beam straight, its core white
      const w = (b === "beam" ? 4 : 5) * S * grow * die;
      for (let y = top; y <= gy; y++) {
        const f = clamp01(y / gy), base = w * (b === "beam" ? 1 : 0.6 + 0.5 * f * f);
        const hl = b === "beam" ? base : base * (0.75 + 0.5 * n(y / 5 + t / 40, 3)), hr = b === "beam" ? base : base * (0.75 + 0.5 * n(y / 5 + t / 40, 9));
        for (let dx = -Math.ceil(hl); dx <= hr; dx++) {
          const d = dx < 0 ? -dx / Math.max(1, hl) : dx / Math.max(1, hr), v = b === "beam" ? 0 : n(dx / 2.5, y / 3.5 + t / 45);
          put(c, x + dx, y, ks[Math.min(ks.length - 1, Math.floor(d * d * 2.6 + v * 1.3))], die);
        }
      }
      break;
    }
    case "bolts":
      for (let i = 0; i < 3; i++)
        if (Math.floor(t / 50 + i) % 3 !== 0 && die > 0.2) bolt(c, [x + (i - 1) * 9 * S + (hash(i, Math.floor(t / 100), seed) % 9) - 4, top], [x + (i - 1) * 3, gy], ks, seed + i * 7 + Math.floor(t / 50), i === 1 ? 1 : 0);
      break;
    case "spikes":
      for (let i = 0; i < 7; i++) {
        const sx = x + (i - 3) * 5 * S, h = (14 + 10 * Math.sin(i * 2.3)) * S * grow * die * (i === 3 ? 1.4 : 1), hw = (2.5 + (i === 3 ? 1 : 0)) * S * 0.8;
        for (let j = 0; j < h; j++) for (let dx = -hw * (1 - j / h); dx <= hw * (1 - j / h); dx++) put(c, sx + dx, gy - j, ks[dx < 0 ? 1 : dx < hw * 0.4 ? 2 : 3]);
      }
      break;
    case "tornado":
      for (let y = top; y <= gy; y++) {
        const f = clamp01(1 - y / gy), R = (3 + 14 * f ** 1.2) * S * 0.6 * grow * die;
        for (let s = 0; s < 3; s++) {
          const a = y / 4 + t / 70 + s * 2.1;
          put(c, x + Math.cos(a) * R + Math.sin(y / 9 + t / 200) * 3, y, ks[Math.min(ks.length - 1, s + (Math.sin(a) < 0 ? 1 : 0))], 0.8 * die);
        }
      }
      break;
    case "helix":
      // two strands of light winding up round the target, sparkling, and a halo on the ground
      for (let s = 0; s < 2; s++)
        for (let h = 0; h < Math.min((gy - top) * grow, 60 * S); h++) {
          const a = h / (5 * S) - t / 80 + s * Math.PI, front = Math.sin(a) > 0;
          put(c, x + Math.cos(a) * 7 * S * (1 - h / (90 * S)), gy - h, ks[front ? 0 : 2], die * (front ? 1 : 0.6));
        }
      for (let j = 0; j < 4 * S; j++) {
        const h = (j * 17 + t / 10) % (60 * S), a = h / (5 * S) - t / 80 + (j % 2) * Math.PI;
        if (h < (gy - top) * grow && die > 0.3) spark(c, x + Math.cos(a) * 7 * S * (1 - h / (90 * S)), gy - h, 1, ks, t + j * 40);
      }
      ring(c, x, gy, Math.round(9 * S), ks.slice(1, 3), die, 0.3);
      break;
    case "sphere": {
      const R = 14 * S * grow * die;
      for (let dy = -Math.ceil(R); dy <= R; dy++)
        for (let dx = -Math.ceil(R); dx <= R; dx++) {
          const d = Math.hypot(dx, dy) / Math.max(1, R);
          if (d <= 1) put(c, x + dx, to[1] + dy, d > 0.88 ? ks[1] : d > 0.75 ? ks[2] : ks[3], d > 0.88 ? 1 : 0.9);
        }
      break;
    }
  }
}
