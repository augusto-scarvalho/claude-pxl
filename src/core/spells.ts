// A spell kit: spell("fire", 3, { from, to }) is a whole cast on the clock (charge, cast, flight,
// impact, dissipate), built of phase 5's pieces (ability, emitter, particles, trail, smoke) and drawn
// in pixel art: a ball of noise in its element's ramp, a trail, sparks, the impact's shape, and from
// the second tier a shockwave, from the third a centerpiece filling the picture (a pillar, a storm,
// spikes, a tornado, a sphere, a beam), a flash and a mark left on the ground. What it draws gives
// light (unlit, blooming in post()) and it puts lamps where it is, for a lighting() item to light the
// ground round it. An element is a recipe (ELEMENTS): its ramp, its noise, how its particles fly, how
// it moves, the shape of its impact. A tier scales it all (fire, fira, firaga). Anything can be given over it.
// A variant (VARIANTS) is another way of the same element: an iceberg rising, a boulder falling, a
// quake, a wave; its `form` the shape's size, count, facets, jaggedness, debris and how long it stays.
// It happens in a world (x and y on the ground, z up) seen through a view: side (3/4), top-down,
// isometric, or a perspective() camera; big solids are volumes (volumes.ts) seen through it.
import { type Color, TRANSPARENT } from "./color.ts";
import { noise } from "./effects.ts";
import { PxError } from "./errors.ts";
import { type View, perspective } from "./perspective.ts";
import { type SmokeCanvas, drawSmoke } from "./smoke.ts";
import { bayer, hash, rng } from "./util.ts";
import { type Ability, type EmitterOpts, type VfxCanvas, ability, drawParticles, drawTrail, emitter } from "./vfx.ts";
import { type Matter, type SolidKind, type V3, drawSolid, makeSolid, pieceAt, pieces, turn } from "./volumes.ts";

export const SHAPES = ["burst", "ring", "shards", "splash", "debris", "swirl", "rays", "implode", "sparkle"] as const;
export const BIGS = ["pillar", "bolts", "spikes", "tornado", "sphere", "beam", "helix", "nova", "blizzard", "quake", "slide", "rain", "grasp", "leaves"] as const;
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
  /** its variants (VARIANTS), the first its own way; what its solids are made of */
  variants?: string[];
  matter?: Matter;
}
const ELEMENT_KEYS = ["like", "keys", "ball", "bolt", "motion", "trail", "particles", "impact", "big", "mark", "flash", "light", "timing", "variants", "matter"];

/** The elements: each a recipe to copy and change (the guide: scenes, "Designing an element"). */
export const ELEMENTS: Record<string, Element> = {
  fire: { keys: ["#fff4c0", "#ffc040", "#ff6a1c", "#a8200c"], ball: { r: 3, scale: 1.6, speed: 2 }, motion: { arc: 4, ease: "in" },
    particles: { rate: 40, life: [150, 350], speed: [8, 24], angle: -90, spread: 50, gravity: [0, -40], keys: ["#ffd060", "#ff8a20", "#a8200c"] },
    impact: { shape: "burst", smoke: ["#b0a49a", "#706660", "#423c3a"] }, big: "pillar", mark: ["#3a2018", "#1a100c"], variants: ["pillar", "ball", "meteor", "wave"] },
  ice: { keys: ["#ffffff", "#c8f0ff", "#6ac8f0", "#2a6aa8"], ball: { r: 3, scale: 2.4, speed: 1 }, motion: { arc: 2 },
    particles: { rate: 30, life: [200, 400], speed: [6, 18], angle: 180, spread: 40, gravity: [0, 30], keys: ["#ffffff", "#9ce0ff", "#4a9ad8"] },
    impact: { shape: "shards", smoke: ["#f0f8ff", "#b8d8ec", "#7aa0c0"] }, big: "spikes", mark: ["#9cd0f0", "#e8f8ff"], matter: "ice",
    variants: ["spikes", "iceberg", "glacier", "blizzard", "nova"] },
  lightning: { keys: ["#ffffff", "#fff8a0", "#a8e0ff", "#4a60d8"], ball: false, bolt: true, motion: { ease: "out" },
    particles: { rate: 60, life: [80, 200], speed: [20, 50], spread: 180, keys: ["#ffffff", "#a8e0ff"] },
    impact: { shape: "rays", smoke: false }, big: "bolts", mark: ["#4a4a6a", "#2a2a3a"], timing: { travel: 160 }, variants: ["bolt", "sky", "chain"] },
  water: { keys: ["#e8ffff", "#8ae0ff", "#3a9ae8", "#1a4aa8"], ball: { r: 3, scale: 2, speed: 3 }, motion: { arc: 14, ease: "linear" },
    particles: { rate: 30, life: [200, 400], speed: [4, 12], angle: 90, spread: 30, gravity: [0, 120], keys: ["#8ae0ff", "#3a9ae8"] },
    impact: { shape: "splash", smoke: false }, big: "pillar", mark: ["#5aa8e8", "#2a6ab8"], variants: ["geyser", "wave"] },
  earth: { keys: ["#d8c8a0", "#a88a5a", "#6a5032", "#3a2a1c"], ball: { r: 3, scale: 3, speed: 0.3 }, motion: { arc: 16, ease: "linear" },
    particles: { rate: 15, life: [200, 400], speed: [4, 10], angle: 90, spread: 60, gravity: [0, 80], keys: ["#a88a5a", "#6a5032"] },
    impact: { shape: "debris", smoke: ["#c8b8a0", "#94846c", "#5e5240"] }, big: "spikes", mark: ["#4a3826", "#2a1e14"], light: "#ffc890", matter: "rock",
    variants: ["spikes", "spire", "boulder", "quake", "slide"] },
  wind: { keys: ["#ffffff", "#d8f8e8", "#9ae8c8", "#4aa888"], ball: { r: 2, scale: 1.2, speed: 4 }, motion: { wave: 4 },
    particles: { rate: 40, life: [150, 300], speed: [20, 40], angle: 180, spread: 20, keys: ["#ffffff", "#9ae8c8"] },
    trail: { length: 260, width: [3, 1] }, impact: { shape: "swirl", smoke: false }, big: "tornado", mark: false, variants: ["tornado", "blades"] },
  light: { keys: ["#ffffff", "#fffbd0", "#ffe680", "#d8a830"], ball: { r: 2, scale: 1.4, speed: 2 }, motion: { ease: "out" },
    particles: { rate: 40, life: [200, 400], speed: [4, 14], spread: 180, keys: ["#ffffff", "#ffe680"] },
    impact: { shape: "rays", smoke: false }, big: "beam", mark: ["#fff4c0", "#d8b850"], variants: ["beam", "rain"] },
  dark: { keys: ["#d8b0ff", "#8a4ad8", "#4a1a8a", "#1a0a2a"], ball: { r: 3, scale: 1.8, speed: 1.5 }, motion: { wave: 2, ease: "linear" },
    particles: { rate: 30, life: [250, 500], speed: [2, 8], spread: 180, keys: ["#8a4ad8", "#4a1a8a", "#1a0a2a"] },
    impact: { shape: "implode", smoke: ["#6a5a8a", "#3a2a5a", "#1a102a"] }, big: "sphere", mark: ["#3a1a5a", "#1a0a2a"], flash: "#000000", light: "#8a4ad8",
    variants: ["void", "grasp"] },
  heal: { keys: ["#ffffff", "#d0ffd0", "#80e890", "#3aa858"], ball: { r: 2, scale: 1.4, speed: 2 }, motion: { arc: 10, ease: "out" },
    particles: { rate: 25, life: [300, 600], speed: [4, 10], angle: -90, spread: 30, gravity: [0, -10], keys: ["#ffffff", "#80e890"] },
    impact: { shape: "sparkle", smoke: false }, big: "helix", mark: ["#a8f0b0", "#3aa858"], variants: ["sparkles", "leaves"] },
};

/** A shape and its complexity: its size (times the tier's), how many, facets, jaggedness 0..1, pieces it breaks into, ms it stays. */
export interface Form { size?: number; count?: number; facets?: number; jag?: number; debris?: number; stay?: number }
export interface Variant {
  /** a volume it is (seen through the view, lit, cracking, breaking up) */
  solid?: SolidKind;
  /** how it gets there: thrown from the hand, falling from the sky, running along the ground, struck from the sky, a wave, a chain, blades */
  delivery?: "throw" | "fall" | "ground" | "sky" | "wave" | "chain" | "blades";
  big?: Big | false;
  burning?: boolean;
  form?: Form;
}
/** The variants: any element takes any (an ice meteor), each element lists its own (`variants`). */
export const VARIANTS: Record<string, Variant> = {
  pillar: { big: "pillar" }, geyser: { big: "pillar" }, beam: { big: "beam" }, tornado: { big: "tornado" }, void: { big: "sphere" },
  sparkles: { big: "helix" }, bolt: { big: "bolts" }, ball: { big: false }, spikes: { big: "spikes", form: { count: 7, jag: 0.4 } },
  iceberg: { solid: "berg", delivery: "ground", form: { facets: 13, jag: 0.35, debris: 26, stay: 900 } },
  glacier: { solid: "block", delivery: "fall", form: { facets: 8, jag: 0.15, debris: 24, stay: 700 } },
  blizzard: { big: "blizzard", form: { count: 14, stay: 1300 } },
  nova: { big: "nova", delivery: "ground", form: { count: 14, stay: 700 } },
  spire: { solid: "spire", delivery: "ground", form: { facets: 10, jag: 0.25, debris: 20, stay: 900 } },
  boulder: { solid: "boulder", delivery: "fall", form: { facets: 22, jag: 0.15, debris: 20, stay: 800 } },
  quake: { big: "quake", delivery: "ground", form: { count: 5, facets: 9, jag: 0.3, stay: 1000 } },
  slide: { big: "slide", delivery: "fall", form: { count: 4, facets: 12, jag: 0.2, debris: 6, stay: 700 } },
  meteor: { solid: "boulder", delivery: "fall", burning: true, form: { size: 0.8, facets: 16, jag: 0.2, debris: 12, stay: 200 } },
  wave: { delivery: "wave", big: false },
  sky: { delivery: "sky", big: "bolts" }, chain: { delivery: "chain", form: { count: 3 } },
  blades: { delivery: "blades", form: { count: 3 } },
  rain: { big: "rain", form: { count: 10, stay: 900 } },
  grasp: { big: "grasp", form: { count: 6, stay: 900 } },
  leaves: { big: "leaves", form: { count: 14, stay: 900 } },
};

/** What a tier does: its size, how many particles, how long, its light (px, power) and glow (0..1), its drama. */
export const TIERS = [
  { scale: 1, count: 1, time: 1, reach: 28, power: 0.9, glow: 0.4, shake: 0, ring: false, big: false },
  { scale: 1.5, count: 2, time: 1.25, reach: 44, power: 1.2, glow: 0.7, shake: 1, ring: true, big: false },
  { scale: 2, count: 3, time: 1.6, reach: 72, power: 1.5, glow: 1, shake: 2, ring: true, big: true },
];

export type ViewOpt = "side" | "top" | "iso" | { kind?: "side" | "top" | "iso"; origin?: [number, number]; height?: number } | View;
export interface SpellOpts extends Partial<Element> {
  /**
   * where it starts and where it lands: [x, y, z] in the view's world (x and y on the ground, z up;
   * `from` as [x, y] stands there with its hand `hand` up), or, seen from the side with no view given,
   * [x, y] on the picture with `ground` the ground's row under the target (default a little below it).
   * `from` can be the caster's hand on the picture: a socket of an earlier placement ("hero.hand", read
   * in each frame: hold the cast's thrust while it flies) or { at: [x, y] }, its height worked out from
   * the view (from the side, standing as deep as the target; else `hand` up)
   */
  from: number[] | string | { at: [number, number] };
  to: number[];
  ground?: number;
  /** the hand's height over the ground in the view's world (default 22 px of the spell: a 34 px figure's, about 1 m) */
  hand?: number;
  /** "side" (3/4), "top", "iso", or { kind, origin: where the world's [0, 0, 0] is on the picture, height: a top view's camera }, or a perspective() view (mesh()'s camera; the world in meters, [x, ahead, up]) */
  view?: ViewOpt;
  /** a way of the element (VARIANTS), and its shape's size, count, facets, jaggedness, debris and stay */
  variant?: string;
  form?: Form;
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
export const SPELL_OPTS = ["from", "to", "ground", "hand", "view", "variant", "form", "start", "seed", "scale", "count", "time", "reach", "power", "glow", "shake", ...ELEMENT_KEYS.filter((k) => k !== "like" && k !== "variants")];
export interface Spell {
  /** its phases on the clock: charge, cast, travel, impact, dissipate */
  ability: Ability;
  /** ms from its start to its end */
  total: number;
  /** the recipe it was made of, what was given over it; its variant */
  element: Element;
  variant?: string;
  tier: number;
  /** how much light a pixel it draws gives (0..1: emission, bloom) */
  glow: number;
  /** the view it is seen through */
  view: SpellView;
  /** where the hand is now, when `from` is a socket or a point on the picture (cast() does this first) */
  bind(c: SpellCanvas): void;
  /** where it is at a time, in the view's world (the hand while it charges, the ball, where it hit) */
  at(t: number): number[];
  /** what it draws under itself (marks, shadows, fissures), what gives light, what goes over it (solids, smoke) */
  under(c: SpellCanvas): void;
  draw(c: SpellCanvas): void;
  over(c: SpellCanvas): void;
  /** its lamps at a time ({ x, y, r, power, color } on the picture) and its flash ({ color, amount } for effect("tint"), or none) */
  lights(t: number): { x: number; y: number; r: number; power: number; color: string }[];
  flash(t: number): { color: string; amount: number } | undefined;
  /** px the picture is thrown [x, y] as it hits (the tier's drama), [0, 0] otherwise */
  shake(t: number): [number, number];
}
export interface SpellCanvas extends VfxCanvas, SmokeCanvas { socket?(at: string): [number, number] }

const ease = (k: number) => 1 - (1 - k) ** 2;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const RAD = Math.PI / 180;

// ---------------------------------------------------------------- views
/** A view: where a world point lands on the picture, px a world unit there, world units a px of the spell, the camera's axes. */
export interface SpellView { kind: string; P(p: number[]): [number, number]; s(p: number[]): number; unit: number; top: boolean; R: V3; U: V3; F: V3; k(p: number[]): number }
const basis = (pitch: number, yaw: number, ahead: number) => {
  const p = pitch * RAD, c = Math.cos(yaw * RAD), s = Math.sin(yaw * RAD), rot = (v: number[]): V3 => [v[0] * c - v[1] * s, v[0] * s + v[1] * c, v[2]];
  return { R: rot([1, 0, 0]), U: rot([0, ahead * Math.sin(p), Math.cos(p)]), F: rot([0, ahead * Math.cos(p), -Math.sin(p)]) };
};
/**
 * The views. Side (3/4): x across, y toward us squashed to 0.35, z straight up. Top: x and y as they
 * are, a height foreshortened: smaller the higher it is (`height` px up for half the size, default
 * 240), where it is on the ground, so a falling rock grows as it comes down and its shadow closes on it.
 * Iso 2:1: x down to the right, y down to the left, z up. A perspective() view: the world in meters
 * ([x, ahead, up], as mesh() places things), sizes in px where the spell lands.
 */
export function spellView(v: ViewOpt | undefined, at: number[]): SpellView {
  if (v && typeof v === "object" && "horizon" in v) {
    const Pp = perspective(v), s = (p: number[]) => Pp.scale(p[1], p[0], p[2] ?? 0);
    return { kind: "perspective", P: (p) => Pp.ground(p[0], p[1], p[2] ?? 0), s, k: s, unit: 1 / s(at), top: false, ...basis(-Pp.pitch, -Pp.yaw, 1) };
  }
  const o = typeof v === "object" && v ? v : { kind: v as "side" | "top" | "iso" | undefined, origin: undefined, height: undefined }, kind = o.kind ?? "side", [ox, oy] = o.origin ?? [0, 0];
  if (kind === "side") return { kind, P: (p) => [ox + p[0], oy + 0.35 * p[1] - (p[2] ?? 0)], s: () => 1, k: () => 1, unit: 1, top: false, ...basis(20.5, 0, -1) };
  if (kind === "iso") return { kind, P: (p) => [ox + p[0] - p[1], oy + (p[0] + p[1]) / 2 - (p[2] ?? 0)], s: () => 1, k: () => 1, unit: 1, top: false, ...basis(30, -45, -1) };
  if (kind === "top") {
    const Hc = o.height ?? 240, k = (p: number[]) => Hc / (Hc + Math.max(0, p[2] ?? 0));
    return { kind, P: (p) => [ox + p[0], oy + p[1]], s: k, k, unit: 1, top: true, ...basis(90, 0, -1) };
  }
  throw new PxError(`spell: view is "side", "top", "iso", { kind, origin, height } or a perspective() view ({ w, horizon, eye, ... }), got ${JSON.stringify(v)}`);
}

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
  const pt = (v: unknown) => Array.isArray(v) && v.length >= 2 && v.every(Number.isFinite);
  if (!o || !(pt(o.from) || typeof o.from === "string" || (o.from && pt((o.from as { at: unknown }).at))) || !pt(o.to))
    throw new PxError(`spell(element, tier, { from: [x, y] | "hero.hand" | { at: [x, y] }, to: [x, y], ... }): where it starts and where it lands, got ${JSON.stringify({ from: o?.from, to: o?.to })}`);
  const { from: f0, to: t0, ground, hand, view: v0, variant, form, start = 0, seed = 1, scale, count, time, reach, power, glow, shake, ...over } = o;
  const E = element(Object.keys(over).length ? ({ ...(typeof name === "string" ? { like: name } : name), ...over } as Element) : name);
  if (variant !== undefined && !VARIANTS[variant])
    throw new PxError(`spell: no variant '${variant}'${E.variants ? `; this element's are ${E.variants.join(", ")}` : ""}; any of ${Object.keys(VARIANTS).join(", ")}`);
  const badForm = form && Object.keys(form).find((k) => !["size", "count", "facets", "jag", "debris", "stay"].includes(k));
  if (badForm) throw new PxError(`spell: form takes size, count, facets, jag, debris and stay, not '${badForm}'`);
  const T = TIERS[tier - 1], S = scale ?? T.scale, N = count ?? T.count, D = time ?? T.time, R = reach ?? T.reach, P = power ?? T.power;
  // the variant: named, it shows at every tier, as big as the tier; else the element's own, its centerpiece at tier 3
  const VR: Variant = variant ? VARIANTS[variant] : {}, F = { size: 1, count: 6, facets: 12, jag: 0.25, debris: 12, stay: 600, ...VR.form, ...form };
  const big: Big | false = variant ? VR.big ?? false : T.big ? E.big ?? "pillar" : false, del = VR.delivery ?? (E.bolt ? "bolt" : "throw"), lasting = !!variant;
  const SS = S * F.size;
  // the view, and the points in its world (from the side with no view, [x, y] on the picture as phase 7 took them)
  const onPicture = !Array.isArray(f0), legacy = (v0 === undefined || v0 === "side") && ((Array.isArray(f0) && f0.length < 3) || t0.length < 3);
  let to = t0, vw = v0;
  if (legacy) {
    const gy = ground ?? t0[1] + Math.round(7 * S);
    vw = { kind: "side", origin: [0, gy] };
    to = [t0[0], 0, gy - t0[1]];
  }
  const V = spellView(vw, [to[0], to[1], to[2] ?? 0]), U = V.unit, sc = (p: number[]) => V.s(p) * U, scr = (p: number[]) => V.P(p);
  const B3: V3 = [to[0], to[1], to[2] ?? 0], G3: V3 = [B3[0], B3[1], 0], up = hand ?? 22 * U;
  /** The world point seen at (px, py): from the side as deep as the target (its height from the picture), else `up` high. */
  const lift = (px: number, py: number): V3 => {
    const side = V.kind === "side", q: V3 = side ? [B3[0], B3[1], up] : [B3[0], B3[1], up], j = side ? 2 : 1;
    for (let i = 0; i < 8; i++) {
      const [a, b] = scr(q), e1 = [...q], e2 = [...q];
      e1[0] += U; e2[j] += U;
      const [ax, ay] = scr(e1), [bx, by] = scr(e2), j11 = (ax - a) / U, j21 = (ay - b) / U, j12 = (bx - a) / U, j22 = (by - b) / U, det = j11 * j22 - j12 * j21;
      if (Math.abs(det) < 1e-12) break;
      q[0] += ((px - a) * j22 - (py - b) * j12) / det;
      q[j] += ((py - b) * j11 - (px - a) * j21) / det;
    }
    return q;
  };
  let A3: V3 = onPicture ? (typeof f0 === "string" ? [B3[0] - 50 * U, B3[1], up] : lift(...(f0 as { at: [number, number] }).at))
    : legacy ? [f0[0], 0, (vw as { origin: number[] }).origin[1] - f0[1]] : [f0[0], f0[1], f0[2] ?? up];
  let H3: V3 = [A3[0], A3[1], 0];
  // its solid, if it is one: its size (px of the spell), and how high its middle sits once there
  const SO = VR.solid ? makeSolid(VR.solid, seed, (VR.solid === "spire" ? 8 : VR.solid === "block" ? 10 : VR.solid === "berg" ? 11 : 9) * SS, F.facets, F.jag) : undefined;
  const mat: Matter = E.matter ?? (VR.solid === "berg" || VR.solid === "block" ? "ice" : "rock");
  const rest: V3 = SO ? [G3[0], G3[1], (del === "fall" ? SO.up * 0.8 : SO.up * 0.3) * U] : B3;
  const I3: V3 = SO || del === "fall" || del === "ground" ? [G3[0], G3[1], 2 * U] : B3;
  // its phases
  const tm = { charge: 400, cast: 120, travel: 450, impact: 250, dissipate: 700, ...E.timing };
  const travel = del === "sky" ? 80 : del === "fall" ? 520 * D : del === "wave" ? 650 * D : del === "bolt" || del === "chain" ? tm.travel : tm.travel * D;
  const A = ability([["charge", tm.charge * D], ["cast", tm.cast], ["travel", travel], ["impact", SO ? (del === "fall" ? 220 : 380) * D : tm.impact * D * (big ? 1.6 : 1)],
    ["dissipate", lasting ? F.stay + 900 * D : tm.dissipate * D]], { start });
  const t0r = A.start("travel"), hit = A.start("impact"), end = start + A.total, brk = A.start("dissipate") + (lasting ? F.stay : 0);
  const after = (t: number) => clamp01((t - hit) / (end - hit)), into = (t: number) => clamp01((t - hit) / (A.start("dissipate") - hit));
  const live = (t: number) => t >= start && t < end;
  // its way
  const arc = (E.motion?.arc ?? 0) * S * U, wave = (E.motion?.wave ?? 0) * S * U, sky: V3 = [G3[0] - (V.top ? 0 : 40 * S * U), G3[1], 130 * U];
  const kTravel = (t: number) => clamp01((t - t0r) / (hit - t0r));
  const path = (t: number): V3 => {
    const k = kTravel(t);
    if (del === "fall") { const kk = k * k; return [sky[0] + (rest[0] - sky[0]) * kk, sky[1] + (rest[1] - sky[1]) * kk, sky[2] + (rest[2] - sky[2]) * kk]; }
    if (del === "ground") return G3;
    if (del === "wave") return [H3[0] + (G3[0] - H3[0]) * k, H3[1] + (G3[1] - H3[1]) * k, 0];
    const [x, y, z] = A.along(A3, B3, t, { arc, ease: E.motion?.ease ?? "in" });
    return [x, y, z + wave * Math.sin(k * Math.PI * 4) * Math.sin(k * Math.PI)];
  };
  const at = (t: number): V3 => (t < t0r ? A3 : t < hit ? path(t) : SO ? rest : I3);
  // its sparks, on the picture (seen from above, nothing falls across it: they spread all round)
  const top = V.top, pk = E.particles ? E.particles.keys ?? E.keys : E.keys, shapeName = E.impact?.shape ?? "burst";
  const fly = E.particles && del !== "sky" && del !== "wave" && big !== "slide" ? emitter({ ...E.particles, keys: undefined, at: (t: number) => scr(path(t)), rate: (E.particles.rate ?? 30) * N, from: t0r, to: hit, seed, ...(top ? { gravity: [0, 0], spread: 180 } : {}) } as EmitterOpts) : undefined;
  const k3 = sc(I3), burst = emitter({ at: scr(I3), burst: Math.round(10 * N * S), from: hit, life: [250, 600 * D], speed: [20 * S * k3, 55 * S * k3], angle: -90, spread: top ? 180 : 100, gravity: [0, top ? 0 : shapeName === "sparkle" ? -30 : 90], drag: 1.4, seed: seed + 1 });
  const charge = emitter({ at: () => scr(A3), rate: 20 * N, from: A.start("charge"), to: A.start("cast"), life: [150, 300], speed: [6, 16], spread: 180, seed: seed + 2 });
  const shards = SO && mat === "ice" ? emitter({ at: scr(rest), burst: Math.round(F.debris * 1.5), from: brk, life: [200, 500], speed: [20 * SS, 60 * SS], spread: 180, angle: -90, gravity: [0, top ? 0 : 60], drag: 1, seed: seed + 3 }) : undefined;
  const r = (E.ball ? E.ball.r ?? 3 : 2) * S;
  const pcs = SO ? pieces(seed + 11, F.debris, [0, 0, rest[2] / U], SO.r * 0.6, (70 * SS) / 2, Math.max(2, SO.r * 0.13)) : [];
  const hot = (c: VfxCanvas) => (VR.burning ? c.color(E.keys[1]) ?? undefined : undefined);

  // ------------------------------------------------ what each variant draws
  /** The solid now: rising out of the ground or falling with a slow turn, there, cracking, broken. */
  const drawBody = (c: SpellCanvas, t: number) => {
    if (!SO || t < (del === "fall" ? t0r : hit) || t >= brk) return;
    const rise = del === "fall" ? 1 : ease(clamp01((t - hit) / (A.start("dissipate") - hit)));
    const ctr: V3 = del === "fall" ? (t < hit ? path(t) : rest) : [rest[0], rest[1], rest[2] - SO.up * (1 - rise) * 1.1 * U];
    const spin = (2.2 * (Math.min(t, hit) - t0r)) / 1000, rot = del === "fall" ? turn([0.3, 1, 0.25], spin + (seed % 7) * 0.4) : turn([0, 0, 1], (seed % 7) * 0.4);
    const crack = VR.burning ? 1 : clamp01((t - (brk - F.stay * 0.6)) / (F.stay * 0.6));
    drawSolid(c, V, ctr, U, SO, rot, mat, { seed, crack, crackAt: del === "fall" ? [0, 0, -SO.up] : [0, 0, SO.up * 0.6], ground: del === "fall" ? undefined : ctr[2] / U, hot: hot(c) });
  };
  /** Its pieces once it breaks, flying out and falling, lying a while, going. */
  const drawPieces = (c: SpellCanvas, t: number, n0: number[], list: typeof pcs, kind: SolidKind, g = 260) => {
    if (t < brk) return;
    const s = (t - brk) / 1000, fade = 1 - clamp01((t - brk - (end - brk) * 0.55) / ((end - brk) * 0.45));
    for (const p of list) {
      const { at: q, ang } = pieceAt(p, s, g * SS / 2, p.size * 0.4);
      const piece = makeSolid(kind, p.seed, p.size, 7, 0.4);
      drawSolid(c, V, [n0[0] + q[0] * U, n0[1] + q[1] * U, n0[2] + q[2] * U], U, piece, turn(p.axis, ang), mat, { seed: p.seed, density: fade, hot: hot(c) });
    }
  };
  /** Fissures on the ground from g, `n` of them `len` px long at most, grown by k, opened by w px. */
  const fissures = (c: SpellCanvas, g: V3, n: number, len: number, k: number, keys: Color[], density = 1) => {
    for (let i = 0; i < n; i++) {
      const rr = rng(hash(seed, i, 919)), a0 = (i / n) * Math.PI * 2 + rr() * 0.8, L = len * (0.6 + 0.4 * rr()) * k;
      let x = 0, y = 0, a = a0;
      for (let s = 0; s < L; s += 0.5) {
        if (s % 4 < 0.5) a = a0 + (rr() - 0.5) * 1.2;
        x += Math.cos(a) * 0.5; y += Math.sin(a) * 0.5;
        const [px, py] = scr([g[0] + x * U, g[1] + y * U, 0]), wide = s < L * 0.5 ? 1 : 0;
        put(c, px, py, keys[1], density);
        put(c, px, py - 1, keys[0], density * 0.8);
        if (wide) put(c, px + 1, py, keys[1], density);
      }
    }
  };
  /** A wall of it running along the ground from the hand to where it lands (fire's flames, water's curling crest). */
  const waveWall = (c: SpellCanvas, t: number, ks: Color[]) => {
    const k = kTravel(t), f = path(t), dx = G3[0] - H3[0], dy = G3[1] - H3[1], L0 = Math.hypot(dx, dy) || 1, ux = dx / L0, uy = dy / L0;
    const Lw = 26 * S, Hw = 10 * SS, n = noise(seed + 77), water = shapeName === "splash";
    // the way ahead on the picture, for the crest's curl
    const [ax, ay] = scr(f), [bx, by] = scr([f[0] + ux * U, f[1] + uy * U, 0]), fl = Math.hypot(bx - ax, by - ay) || 1, fx = (bx - ax) / fl, fy = (by - ay) / fl;
    // far to near across it, back to front along it
    for (let w = -6 * S; w <= 6 * S; w += 3)
      for (let s = Lw; s >= 0; s -= 1.5) {
        if (s * U > k * L0) continue;
        const g: V3 = [f[0] - (ux * s + uy * w) * U, f[1] - (uy * s - ux * w) * U, 0], fr = s / Lw;
        if (water) {
          // a steep face at the front, the crest just behind it curling over, the back running out
          const crest = 3 * S, hh = Hw * (s < crest ? 0.8 + (0.2 * s) / crest : Math.exp(-(s - crest) / (9 * S))) * (0.92 + 0.16 * n(s / 3 + w, t / 90));
          column(c, V, U, g, hh, (ff) => 1.4 * S * (1 - 0.3 * ff), (d, ff) => ks[ff > 0.86 ? 0 : ff > 0.66 ? 1 : ff > 0.33 ? 2 : 3], 1,
            (ff) => { const curl = s < 5 * S ? Math.max(0, ff - 0.6) * 9 * S * (1 - s / (5 * S)) : 0; return [fx * curl, fy * curl]; });
        } else {
          // tongues of flame, tallest a little behind the front, each flickering on its own
          const env = s < 4 * S ? 0.35 + (0.65 * s) / (4 * S) : (1 - fr) ** 0.8, hh = Hw * env * (0.35 + 0.85 * n(s / 1.5 + w * 3.1, t / 60));
          column(c, V, U, g, hh, (ff) => 1.3 * S * (1 - 0.75 * ff), (d, ff) => ks[Math.min(ks.length - 1, Math.floor(ff * 3 + d * 0.8))]);
        }
      }
  };
  /** Wind's blades: crescents thrown one after another, each on its own arc. */
  const blades = (c: SpellCanvas, t: number, ks: Color[]) => {
    for (let i = 0; i < F.count; i++) {
      // each a little later than the one before, all there as it hits
      const go = (tt: number) => ease(clamp01((tt - t0r - i * 90) / (hit - t0r - (F.count - 1) * 90))), k = go(t);
      if (t < t0r + i * 90 || k >= 1) continue;
      const lift = (i - (F.count - 1) / 2) * 6 * S * U * Math.sin(k * Math.PI), pt = (kk: number) => [A3[0] + (B3[0] - A3[0]) * kk, A3[1] + (B3[1] - A3[1]) * kk, A3[2] + (B3[2] - A3[2]) * kk];
      const p = pt(k), q = pt(go(t + 15) + 0.01);
      const [x, y] = scr([p[0], p[1], p[2] + lift]), [x2, y2] = scr([q[0], q[1], q[2] + lift]), m = Math.hypot(x2 - x, y2 - y) || 1, mx = (x2 - x) / m, my = (y2 - y) / m, rb = 5 * S * sc(p);
      for (let a = -1.3; a <= 1.3; a += 0.12)
        for (let w = 0; w < Math.max(1, S); w++) {
          const rr = rb - w, X = x + rr * (Math.cos(a) * mx - Math.sin(a) * my), Y = y + rr * (Math.cos(a) * my + Math.sin(a) * mx);
          put(c, X, Y, ks[Math.min(ks.length - 1, w + (Math.abs(a) > 0.9 ? 1 : 0))]);
        }
    }
  };

  /** The centerpiece: a big thing at the target, its own way, k through impact and dissipate. */
  const centerpiece = (c: SpellCanvas, b: Big, ks: Color[], t: number) => {
    const k = after(t), grow = Math.min(1, k / 0.15), die = 1 - clamp01((k - 0.55) / 0.45), n = noise(seed + 41), kb = (t - hit) / 1000;
    if (die <= 0 && b !== "blizzard" && b !== "rain") return;
    const Hcol = top ? 110 : 200;
    switch (b) {
      case "pillar": case "beam": {
        // a column from the ground up out of the picture: a pillar wider at its foot, its edges licking
        // up in tongues and its middle churning upward; a beam straight, its core white
        const w = (b === "beam" ? 4 : 5) * SS * grow * die, fy = (f: number) => 1 - f;
        column(c, V, U, G3, Hcol, (f, sgn) => {
          const base = w * (b === "beam" ? 1 : 0.6 + 0.5 * fy(f) ** 2);
          return b === "beam" ? base : base * (0.75 + 0.5 * n(f * Hcol / 5 + t / 40, sgn < 0 ? 3 : 9));
        }, (d, f, dx) => ks[Math.min(ks.length - 1, Math.floor(d * d * 2.6 + (b === "beam" ? 0 : n(dx / 2.5, f * Hcol / 3.5 - t / 45) * 1.3)))], die);
        break;
      }
      case "bolts":
        for (let i = 0; i < 3; i++)
          if (Math.floor(t / 50 + i) % 3 !== 0 && die > 0.2) {
            const from3: V3 = [G3[0] + ((i - 1) * 9 * SS + (hash(i, Math.floor(t / 100), seed) % 9) - 4) * U, G3[1], (top ? 100 : 160) * U];
            bolt(c, scr(from3), scr([G3[0] + (i - 1) * 3 * U, G3[1], 0]), ks, seed + i * 7 + Math.floor(t / 50), i === 1 ? 1 : 0);
          }
        break;
      case "spikes":
        for (let i = 0; i < F.count; i++) {
          const m = (F.count - 1) / 2, rr = rng(hash(seed, i, 51)), g: V3 = [G3[0] + (i - m) * 5 * SS * U, G3[1] + (rr() - 0.5) * 8 * SS * U, 0];
          const h = (14 + 10 * Math.sin(i * 2.3) * (0.5 + F.jag)) * SS * grow * die * (Math.abs(i - m) < 0.6 ? 1.4 : 1), hw = (2.5 + (Math.abs(i - m) < 0.6 ? 1 : 0)) * SS * 0.8;
          column(c, V, U, g, h, (f) => hw * (1 - f), (d, f, dx) => ks[top ? Math.min(3, Math.floor(d * 3) + 1) : dx < 0 ? 1 : d < 0.4 ? 2 : 3]);
        }
        break;
      case "tornado": case "helix": {
        // strands winding up round the target, in the world: seen from above, a spiral
        const strands = b === "tornado" ? 3 : 2, Hh = (b === "tornado" ? Hcol : Math.min(Hcol, 60 * SS)) * grow;
        for (let z = 0; z < Hh; z += top ? 1.5 : 1)
          for (let s = 0; s < strands; s++) {
            const f = z / Hcol, a = b === "tornado" ? z / 4 + t / 70 + s * 2.1 : z / (5 * SS) - t / 80 + s * Math.PI;
            const Rr = b === "tornado" ? (3 + 14 * f ** 1.2) * SS * 0.6 * die : 7 * SS * (1 - z / (90 * SS)), sway = b === "tornado" ? Math.sin(z / 9 + t / 200) * 3 : 0;
            const [x, y] = scr([G3[0] + (Math.cos(a) * Rr + sway) * U, G3[1] + Math.sin(a) * Rr * U, z * U]), front = Math.sin(a) > 0;
            put(c, x, y, b === "tornado" ? ks[Math.min(ks.length - 1, s + (front ? 0 : 1))] : ks[front ? 0 : 2], (b === "tornado" ? 0.8 : front ? 1 : 0.6) * die);
          }
        if (b === "helix") {
          for (let j = 0; j < 4 * SS; j++) {
            const z = (j * 17 + t / 10) % (60 * SS), a = z / (5 * SS) - t / 80 + (j % 2) * Math.PI, Rr = 7 * SS * (1 - z / (90 * SS));
            const [x, y] = scr([G3[0] + Math.cos(a) * Rr * U, G3[1] + Math.sin(a) * Rr * U, z * U]);
            if (z < Hh && die > 0.3) spark(c, x, y, 1, ks, t + j * 40);
          }
          gring(c, V, U, G3, 9 * SS, ks.slice(1, 3), die);
        }
        break;
      }
      case "sphere": {
        const [x, y] = scr(B3), Rr = 14 * SS * grow * die * sc(B3);
        for (let dy = -Math.ceil(Rr); dy <= Rr; dy++)
          for (let dx = -Math.ceil(Rr); dx <= Rr; dx++) {
            const d = Math.hypot(dx, dy) / Math.max(1, Rr);
            if (d <= 1) put(c, x + dx, y + dy, d > 0.88 ? ks[1] : d > 0.75 ? ks[2] : ks[3], d > 0.88 ? 1 : 0.9);
          }
        break;
      }
      case "nova": {
        // a ring of frost running out along the ground, crystals springing up behind its front
        const Rn = 26 * SS, front = Rn * ease(clamp01(kb / 0.45));
        gring(c, V, U, G3, front, ks.slice(0, 2), die);
        for (let i = 0; i < F.count; i++) {
          const rr = rng(hash(seed, i, 61)), a = (i / F.count) * Math.PI * 2 + rr() * 0.3, d0 = Rn * (0.45 + 0.5 * rr());
          if (d0 > front) continue;
          const grown = clamp01((front - d0) / (6 * SS)), h = (5 + 6 * rr()) * SS * grown * die, hw = (1.2 + rr()) * SS;
          column(c, V, U, [G3[0] + Math.cos(a) * d0 * U, G3[1] + Math.sin(a) * d0 * U, 0], h, (f) => hw * (1 - f), (d, f, dx) => ks[top ? Math.min(3, Math.floor(d * 3)) : dx < 0 ? 0 : d < 0.5 ? 1 : 2]);
        }
        break;
      }
      case "blizzard": {
        // shards driven down slantwise over the target the whole time, a glint where each lands
        const n2 = F.count * N * 2;
        for (let i = 0; i < n2; i++) {
          const rr = rng(hash(seed, i, 71)), born = hit + rr() * (F.stay + 300 * D), life = 380, s = (t - born) / life;
          if (s < 0 || s > 1.25) continue;
          const g: V3 = [G3[0] + (rr() - 0.5) * 36 * SS * U, G3[1] + (rr() - 0.5) * 18 * SS * U, 0], v: V3 = [34 * SS * U, 0, -70 * SS * U];
          if (s > 1) { const [x, y] = scr(g); spark(c, x, y, 0, ks, t); continue; }
          const p: V3 = [g[0] - v[0] * (1 - s), g[1], -v[2] * (1 - s)], [x, y] = scr(p), [x2, y2] = scr([p[0] - v[0] * 0.05, p[1], p[2] - v[2] * 0.05]);
          line(c, x, y, x2, y2, [ks[0], ks[1], ks[2]]);
        }
        shape(c, V, U, "swirl", B3, G3, SS, ks, clamp01(kb), k, seed, t);
        break;
      }
      case "rain": {
        // needles of light falling round the target, each a spark and a small ring where it lands
        const n2 = F.count * N * 2;
        for (let i = 0; i < n2; i++) {
          const rr = rng(hash(seed, i, 81)), born = hit + rr() * F.stay, s = (t - born) / 140;
          if (s < 0 || s > 2.2) continue;
          const g: V3 = [G3[0] + (rr() - 0.5) * 34 * SS * U, G3[1] + (rr() - 0.5) * 22 * SS * U, 0];
          if (s > 1) { const [x, y] = scr(g); spark(c, x, y, 1, ks, t); gring(c, V, U, g, 2 + (s - 1) * 4 * SS, ks.slice(1, 3), 1 - (s - 1) / 1.2); continue; }
          const z = 90 * (1 - s) * U, [x, y] = scr([g[0], g[1], z]), [x2, y2] = scr([g[0], g[1], z + 12 * SS * U]);
          line(c, x, y, x2, y2, [ks[0], ks[1], ks[2]]);
        }
        break;
      }
      case "grasp": {
        // shadows like hands rising out of the ground round the target, reaching in and closing on it
        const k2 = ease(clamp01(kb / 0.4)) * die;
        for (let i = 0; i < F.count; i++) {
          const rr = rng(hash(seed, i, 91)), a = (i / F.count) * Math.PI * 2 + rr() * 0.5, R0 = 13 * SS, Hh = (15 + 6 * rr()) * SS;
          const b0: V3 = [G3[0] + Math.cos(a) * R0 * U, G3[1] + Math.sin(a) * R0 * U, 0];
          for (let u = 0; u <= 1; u += 0.03) {
            const pull = 0.8 * u * u * k2, wig = Math.sin(u * 5 + t / 150 + i) * 2 * SS * u;
            const p: V3 = [b0[0] + (G3[0] - b0[0]) * pull - Math.sin(a) * wig * U, b0[1] + (G3[1] - b0[1]) * pull + Math.cos(a) * wig * U, Hh * u * k2 * U];
            const [x, y] = scr(p), w = (1.3 * (1 - u) + 0.4) * SS * sc(p);
            for (let dy = -Math.ceil(w); dy <= w; dy++) for (let dx = -Math.ceil(w); dx <= w; dx++) {
              const d = Math.hypot(dx, dy) / Math.max(0.6, w);
              if (d <= 1) put(c, x + dx, y + dy, u > 0.85 ? ks[1] : d > 0.7 ? ks[2] : ks[3]);
            }
          }
        }
        break;
      }
      case "leaves": {
        // leaves whirling up round the target in a ring, turning their light side and their dark one to us
        for (let i = 0; i < F.count; i++) {
          const rr = rng(hash(seed, i, 101)), a = rr() * 6.28 + kb * 3.2, Rr = (9 + 5 * Math.sin(i * 1.7)) * SS * (0.6 + 0.4 * grow), z = ((4 + i * 2.3 + kb * 22) % 40) * SS;
          const [x, y] = scr([G3[0] + Math.cos(a) * Rr * U, G3[1] + Math.sin(a) * Rr * U, z * U]), front = Math.sin(a + kb * 5) > 0;
          if (die < 0.2) continue;
          // a leaf: a lens 2 px of the spell long turning as it goes, its light side or its dark one to us
          const turnA = a * 2 + i, L = 1.6 * SS * sc(G3), lx = Math.cos(turnA), ly = Math.sin(turnA) * 0.6;
          for (let q = -L; q <= L; q += 0.5) for (const side of [0, 1]) {
            const wq = (1 - (q / L) ** 2) * 0.9 * SS * 0.5;
            put(c, x + lx * q - ly * wq * side, y + ly * q + lx * wq * side, ks[front ? (side ? 2 : 1) : 3], die);
          }
        }
        shape(c, V, U, "sparkle", B3, G3, SS, ks, clamp01(kb), k, seed, t);
        gring(c, V, U, G3, 11 * SS, ks.slice(1, 3), die * 0.8);
        break;
      }
      case "quake": case "slide":
        break; // drawn as solids (over) and fissures (under)
    }
  };

  return {
    ability: A, total: A.total, element: E, variant, tier, glow: glow ?? T.glow, view: V, at,
    bind(c) {
      if (typeof f0 !== "string") return;
      if (!c.socket) throw new PxError(`spell: from "${f0}" is a socket, read where it is drawn (cast())`);
      A3 = lift(...c.socket(f0));
      H3 = [A3[0], A3[1], 0];
    },
    under(c) {
      const t = c.t;
      if (!live(t)) return;
      // a falling solid's shadow, closing on it as it nears the ground
      if (SO && del === "fall" && t >= t0r && t < brk) {
        // wide and faint while it is high, closing on where it lands, darker; from above, off toward the light's far side
        const k = t < hit ? kTravel(t) ** 2 : 1, Rr = SO.r * (1.6 - 0.8 * k), off = top ? (1 - k) * 18 * S * U : 0;
        gdisc(c, V, U, [G3[0] + off, G3[1] + off, 0], Rr, () => c.color("#000000")!, 0.15 + 0.35 * k);
      }
      if (t < hit) return;
      const mk = E.mark ? keysOf(c, E.mark) : undefined, fadeM = 1 - clamp01((after(t) - 0.7) / 0.3);
      if (mk && (T.big || SO || big === "quake" || big === "nova" || big === "blizzard")) mark(c, V, U, G3, Math.round((SO ? SO.r * 0.6 : 10 * S) * (big === "nova" ? 2.2 : 1)), mk, fadeM * (big === "nova" || mat === "ice" && SO ? 0.6 : 1));
      if (variant === "boulder" || variant === "meteor" || big === "quake") {
        const len = (big === "quake" ? 34 : 18) * SS, kq = ease(clamp01((t - hit) / (big === "quake" ? 600 : 250)));
        fissures(c, G3, big === "quake" ? F.count : 5, len, kq, keysOf(c, E.mark ? [E.mark[0], E.mark[1]] : ["#4a3826", "#1a120c"]), fadeM);
      }
    },
    draw(c) {
      const t = c.t, p = A(t);
      if (!live(t)) return;
      const ks = keysOf(c, E.keys), hand = scr(A3), rh = r * sc(A3);
      if (p.name === "charge") {
        drawParticles(c, charge, E.keys.slice(0, 3));
        if (E.ball !== false) orb(c, hand[0], hand[1], Math.max(1, rh * (0.3 + 0.7 * p.k)), ks, E, seed, t);
        else spark(c, hand[0], hand[1], 1 + Math.round(2 * p.k), ks, t);
      } else if (p.name === "cast") {
        ring(c, hand[0], hand[1], rh + 1 + p.k * 4 * S, ks.slice(0, 2), 1 - p.k);
        if (E.ball !== false) orb(c, hand[0], hand[1], rh, ks, E, seed, t);
      } else if (p.name === "travel") {
        const here = path(t), [x, y] = scr(here);
        if (del === "bolt" || del === "chain") bolt(c, hand, [x, y], ks, seed + Math.floor(t / 50), Math.max(1, Math.round(S / 1.5)));
        else if (del === "wave") waveWall(c, t, ks);
        else if (del === "blades") blades(c, t, ks);
        else if (del === "fall") {
          // what falls: burning, a ball of fire round the rock and a trail of it; the slide's rocks are solids
          if (VR.burning || !SO) {
            if (big !== "slide") {
              drawTrail(c, (tt) => scr(path(tt)), E.keys, { length: 200 * D, width: [Math.round((SO ? SO.r * 1.4 : r * 1.6) * sc(here)), 1], from: t0r });
              orb(c, x, y, (SO ? SO.r * 1.25 : r) * sc(here), ks, E, seed, t);
            }
          }
        } else if (del === "ground") {
          // born at the target: the hand lets it go into the ground, which glows and stirs where it will come up
          const k = kTravel(t);
          if (E.ball !== false) orb(c, hand[0], hand[1], rh * (1 - k), ks, E, seed, t);
          gring(c, V, U, G3, (3 + 10 * k) * S, ks.slice(0, 2), 0.35 + 0.65 * k);
          gring(c, V, U, G3, (1 + 5 * k) * S, ks.slice(1, 3), 0.5 * k);
        } else if (del !== "sky") {
          const rr = r * sc(here);
          if (E.trail !== false) drawTrail(c, (tt) => scr(path(tt)), E.keys, { length: (E.trail?.length ?? 160) * D, width: E.trail?.width ? (E.trail.width.map((w) => w * S) as [number, number]) : [Math.round(rr * 1.6), 1], from: t0r });
          orb(c, x, y, rr, ks, E, seed, t);
        }
        if (fly) drawParticles(c, fly, pk);
      } else {
        // the impact: the centerpiece, its shape, (tier 2 on) a shockwave on the ground, sparks
        const k = after(t), ki = into(t);
        if (big) centerpiece(c, big, ks, t);
        if (del === "sky" && ki < 0.6 && Math.floor(t / 40) % 3 !== 2) bolt(c, scr([G3[0] + 6 * U, G3[1], (top ? 100 : 160) * U]), scr(B3), ks, seed + Math.floor(t / 40), 1);
        if (del === "chain")
          for (let i = 1; i <= F.count; i++) {
            const j0 = i === 1 ? B3 : chainAt(i - 1), j1 = chainAt(i), t1 = hit + (i - 1) * 110;
            if (t < t1 || t > t1 + 320 || Math.floor(t / 40) % 4 === 3) continue;
            bolt(c, scr(j0), scr(j1), ks, seed + i * 13 + Math.floor(t / 50), 1);
            const [x, y] = scr(j1);
            shape(c, V, U, "rays", j1, [j1[0], j1[1], 0], S * 0.6, ks, clamp01((t - t1) / 200), clamp01((t - t1) / 260), seed + i, t);
            spark(c, x, y, 1, ks, t);
          }
        shape(c, V, U, shapeName, I3, G3, S * (VR.burning ? 1.8 : SO ? 0.8 : 1), E.impact?.keys ? keysOf(c, E.impact.keys) : ks, ki, k, seed, t);
        if (T.ring) gring(c, V, U, G3, Math.round(4 + ease(ki) * 18 * S), ks.slice(1, 3), 1 - ki);
        drawParticles(c, burst, pk, { trail: 30 });
        if (shards) drawParticles(c, shards, ["#ffffff", "#c8f0ff", "#6ac8f0"]);
      }
    },
    over(c) {
      const t = c.t;
      if (!live(t)) return;
      // smoke (dust, steam) first: what is solid stands in it
      const smoke = E.impact?.smoke;
      if (smoke && t >= hit && !(SO && del === "ground" && mat === "ice")) {
        const [x, y] = scr(G3), kz = sc(G3);
        drawSmoke(c, x, y, smoke, { shape: "puff", spread: 6 * S * kz * (SO ? 1.6 : 1), size: [2 * S * kz, 5 * S * kz], count: Math.round(6 + 3 * N), seed, frame: Math.floor(Math.min(0.99, after(t)) * c.frames), ...(top ? { flat: 1 } : {}) });
      }
      drawBody(c, t);
      if (SO) drawPieces(c, t, [rest[0], rest[1], 0], pcs, mat === "ice" ? "shard" : "chunk");
      if (big === "slide") slideRocks(c, t);
      if (big === "quake" && t >= hit) quakeRocks(c, t);
    },
    lights(t) {
      if (!live(t)) return [];
      const p = A(t), color = E.light ?? E.keys[1], L = (q: number[], rr: number, pw: number) => { const [x, y] = scr(q); return { x, y, r: rr * sc(q), power: pw, color }; };
      if (p.name === "charge") return [L(A3, R * 0.4 * (0.4 + 0.6 * p.k), P * 0.6 * p.k)];
      if (p.name === "cast") return [L(A3, R * 0.5, P * 0.8)];
      if (p.name === "travel") return del === "sky" || (del === "fall" && !VR.burning && SO) ? [] : [L(path(t), R * 0.5, P * 0.8)];
      return [L([I3[0], I3[1], Math.max(2 * U, I3[2])], R * (0.6 + 0.4 * ease(into(t))), P * (1 - after(t)) ** 1.5)];
    },
    flash(t) {
      return T.big && t >= hit && t < hit + 100 ? { color: E.flash ?? E.keys[0], amount: 0.35 * (1 - (t - hit) / 100) } : undefined;
    },
    shake(t) {
      // a whole pixel each way for 300 ms (a quake's for 700), smaller as it goes, a new way every 50 ms
      const heavy = big === "quake" || (SO && del === "fall") ? 1 : 0, long = big === "quake" ? 700 : 300;
      const a = Math.round(((shake ?? T.shake) + heavy) * (1 - (t - hit) / long));
      if (!(t >= hit && a > 0)) return [0, 0];
      const q = rng(hash(Math.floor(t / 50), seed, 23));
      return [Math.round((q() * 2 - 1) * a), Math.round((q() * 2 - 1) * a)];
    },
  };

  // where the chain jumps to after the target: points round it on the ground
  function chainAt(i: number): V3 {
    const rr = rng(hash(seed, i, 43)), a = (i * 2.4 + rr()) % (Math.PI * 2), d = (20 + 12 * rr()) * S;
    return [G3[0] + Math.cos(a) * d * U, G3[1] + Math.sin(a) * d * 0.6 * U, B3[2] * 0.6];
  }
  // the slide: rocks coming down one after another round the target, tumbling, lying, crumbling
  function slideRocks(c: SpellCanvas, t: number) {
    for (let i = 0; i < F.count; i++) {
      const rr = rng(hash(seed, i, 111)), size = (4 + 2.5 * rr()) * SS, solid = makeSolid("chunk", seed + i * 31, size, F.facets, F.jag);
      const g: V3 = [G3[0] + (i - (F.count - 1) / 2) * 8 * SS * U, G3[1] + (rr() - 0.5) * 10 * SS * U, solid.up * 0.8 * U], t1 = t0r + i * 110, fall = 420 * D;
      if (t < t1) continue;
      const k = clamp01((t - t1) / fall), s0: V3 = [g[0] - 45 * S * U, g[1], 95 * U + g[2]], kk = k * k;
      const roll = k >= 1 ? Math.min(1, (t - t1 - fall) / 220) : 0, ctr: V3 = [s0[0] + (g[0] - s0[0]) * kk + roll * 3 * S * U, s0[1] + (g[1] - s0[1]) * kk, s0[2] + (g[2] - s0[2]) * kk];
      const gone = clamp01((t - brk) / ((end - brk) * 0.8));
      drawSolid(c, V, ctr, U, solid, turn([0.2, 1, 0.3], (Math.min(t, t1 + fall) - t1) / 160 + roll), mat, { seed: seed + i, density: 1 - gone, crack: gone * 2 });
    }
  }
  // the quake: rocks thrust up along its fissures as they open, standing, then sinking back
  function quakeRocks(c: SpellCanvas, t: number) {
    for (let i = 0; i < F.count; i++) {
      const rr = rng(hash(seed, i, 919)), a0 = (i / F.count) * Math.PI * 2 + rr() * 0.8;
      for (let j = 1; j <= 2; j++) {
        const d = 34 * SS * (0.25 + 0.3 * j) * 0.7, t1 = hit + (d / (34 * SS)) * 600, size = (3.5 + 2 * rr()) * SS * (j === 1 ? 1.2 : 0.9);
        if (t < t1) continue;
        const solid = makeSolid("spire", seed + i * 7 + j, size, F.facets, F.jag), up = ease(clamp01((t - t1) / 180)) - ease(clamp01((t - brk) / 400));
        const ctr: V3 = [G3[0] + Math.cos(a0) * d * U, G3[1] + Math.sin(a0) * d * U, solid.up * (0.3 - 1.3 * (1 - up)) * U];
        drawSolid(c, V, ctr, U, solid, turn([Math.cos(a0), Math.sin(a0), 3], 0.25), mat, { seed: seed + i * 7 + j, ground: ctr[2] / U });
      }
    }
  }
}

// ---------------------------------------------------------------- what spells are drawn of
const keysOf = (c: VfxCanvas, keys: string[]) =>
  keys.map((k) => { const v = c.color(k); if (v === null || v === TRANSPARENT) throw new PxError(`spell: '${k}' is not a visible color`); return v; });
const put = (c: VfxCanvas, x: number, y: number, col: Color, density = 1) => {
  const X = Math.round(x), Y = Math.round(y);
  if (density >= 1 || bayer(X, Y) < density) c.plot(X, Y, col);
};
/** A line on the picture, its keys head (a) to tail (b). */
function line(c: VfxCanvas, ax: number, ay: number, bx: number, by: number, ks: Color[]): void {
  const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay)));
  for (let s = 0; s <= n; s++) put(c, ax + ((bx - ax) * s) / n, ay + ((by - ay) * s) / n, ks[Math.min(ks.length - 1, Math.floor((s / (n + 1)) * ks.length))]);
}

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
/** A ring of radius R on the picture (squashed by `flat`), thinning out by `density`. */
function ring(c: VfxCanvas, x: number, y: number, R: number, ks: Color[], density: number, flat = 1): void {
  if (density <= 0 || R <= 0) return;
  const steps = Math.ceil(R * 8);
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    for (let w = 0; w < Math.max(1, Math.round(R / 8)); w++) put(c, x + Math.cos(a) * (R - w), y + Math.sin(a) * (R - w) * flat, ks[Math.min(ks.length - 1, w)], density);
  }
}
/** A ring of radius R (px of the spell) on the ground at g, as the view sees it. */
function gring(c: VfxCanvas, V: SpellView, U: number, g: number[], R: number, ks: Color[], density: number): void {
  if (density <= 0 || R <= 0) return;
  const [cx, cy] = V.P(g), [ux, uy] = V.P([g[0] + R * U, g[1], 0]), [vx, vy] = V.P([g[0], g[1] + R * U, 0]);
  const steps = Math.ceil((Math.hypot(ux - cx, uy - cy) + Math.hypot(vx - cx, vy - cy)) * 4) + 8, w = Math.max(1, Math.round(R / 8));
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
    for (let j = 0; j < w; j++) {
      const f = 1 - j / Math.max(1, R);
      put(c, cx + ((ux - cx) * ca + (vx - cx) * sa) * f, cy + ((uy - cy) * ca + (vy - cy) * sa) * f, ks[Math.min(ks.length - 1, j)], density);
    }
  }
}
/** A disc of radius R on the ground at g, as the view sees it, each pixel colored by how far out it is (0..1). */
function gdisc(c: VfxCanvas, V: SpellView, U: number, g: number[], R: number, color: (d: number) => Color | null, density = 1): void {
  if (density <= 0 || R <= 0) return;
  const [cx, cy] = V.P(g), [ux, uy] = V.P([g[0] + R * U, g[1], 0]), [vx, vy] = V.P([g[0], g[1] + R * U, 0]);
  const a1 = ux - cx, a2 = uy - cy, b1 = vx - cx, b2 = vy - cy, det = a1 * b2 - a2 * b1, ex = Math.abs(a1) + Math.abs(b1), ey = Math.abs(a2) + Math.abs(b2);
  if (Math.abs(det) < 1e-6) return;
  for (let y = Math.floor(cy - ey); y <= Math.ceil(cy + ey); y++)
    for (let x = Math.floor(cx - ex); x <= Math.ceil(cx + ex); x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy, a = (dx * b2 - dy * b1) / det, b = (a1 * dy - a2 * dx) / det, d = Math.hypot(a, b);
      if (d > 1) continue;
      const col = color(d);
      if (col !== null) put(c, x, y, col, density);
    }
}
/**
 * A column standing at `base`, `H` px of the spell high: at each height `f` (0 its foot, 1 its top) a
 * span `half(f, side)` px each side of its axis, colored by `color(d, f, dx)` (d 0..1 out from the
 * axis); seen from above, discs from its foot up, the higher (nearer) over.
 */
function column(c: VfxCanvas, V: SpellView, U: number, base: number[], H: number, half: (f: number, side: number) => number, color: (d: number, f: number, dx: number) => Color | null, density = 1, shift?: (f: number) => number[]): void {
  if (H <= 0) return;
  if (!V.top) {
    const [bx, by] = V.P(base), [tx, ty] = V.P([base[0], base[1], (base[2] ?? 0) + H * U]), n = Math.max(1, Math.ceil(Math.hypot(tx - bx, ty - by)));
    for (let i = 0; i <= n; i++) {
      const f = i / n, sh = shift?.(f) ?? [0, 0], x = bx + (tx - bx) * f + sh[0], y = by + (ty - by) * f + sh[1], k = V.s([base[0], base[1], (base[2] ?? 0) + H * U * f]) * U;
      const hl = half(f, -1) * k, hr = half(f, 1) * k;
      for (let dx = -Math.ceil(hl); dx <= hr; dx++) {
        const col = color(dx < 0 ? -dx / Math.max(1, hl) : dx / Math.max(1, hr), f, dx);
        if (col !== null) put(c, x + dx, y, col, density);
      }
    }
    return;
  }
  const n = Math.max(2, Math.ceil(H / 2));
  for (let i = 0; i <= n; i++) {
    const f = i / n, p = [base[0], base[1], (base[2] ?? 0) + H * U * f], [x, y] = V.P(p), hw = half(f, 1) * V.s(p) * U;
    for (let dy = -Math.ceil(hw); dy <= hw; dy++)
      for (let dx = -Math.ceil(hw); dx <= hw; dx++) {
        const d = Math.hypot(dx, dy) / Math.max(1, hw);
        if (d > 1) continue;
        const col = color(d, f, dx);
        if (col !== null) put(c, x + dx, y + dy, col, density);
      }
  }
}
/** A small spark (a plus) that twinkles. */
function spark(c: VfxCanvas, x: number, y: number, s: number, ks: Color[], t: number): void {
  const on = Math.floor(t / 80) % 2 ? 0 : 1;
  put(c, x, y, ks[0]);
  for (let k = 1; k <= s + on; k++) for (const [dx, dy] of [[k, 0], [-k, 0], [0, k], [0, -k]]) put(c, x + dx, y + dy, ks[Math.min(ks.length - 1, k)]);
}
/** A jagged bolt from a to b on the picture, a kink every 7 px, `w` px each side of its white core, forking (forks thinner, dimmer). */
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
/** The mark on the ground: a disc as the view sees it, its rim one key and its middle the other, going in a dither. */
function mark(c: VfxCanvas, V: SpellView, U: number, g: number[], R: number, ks: Color[], density: number): void {
  gdisc(c, V, U, g, R, (d) => ks[d > 0.7 ? 0 : 1], density);
}
/** The impact's own shape at `to` (its foot `g` on the ground): `ki` through the impact, `k` through impact and dissipate. */
function shape(c: VfxCanvas, V: SpellView, U: number, s: Shape, to: number[], g: number[], S: number, ks: Color[], ki: number, k: number, seed: number, t: number): void {
  const [x, y] = V.P(to), kk = V.s(to) * U, R = ease(ki) * 9 * S * kk, fade = 1 - clamp01((k - 0.5) / 0.5), r = rng(hash(seed, 5, 9));
  // a thrown drop or stone, in the world: out and up from `to`, falling, lying on the ground
  const thrown = (i: number, v: number, up: number, tt: number, grav: number): [number, number] => {
    const a = r() * Math.PI * 2, sp = v * (0.6 + 0.6 * r()), z = Math.max(0, (to[2] ?? 0) / U + up * tt - grav * tt * tt);
    return V.P([to[0] + Math.cos(a) * sp * tt * U, to[1] + Math.sin(a) * sp * tt * U, z * U]);
  };
  switch (s) {
    case "burst":
      for (let dy = -Math.ceil(R); dy <= R; dy++)
        for (let dx = -Math.ceil(R); dx <= R; dx++) {
          const d = Math.hypot(dx, dy) / Math.max(1, R);
          if (d <= 1) put(c, x + dx, y + dy, ks[Math.min(ks.length - 1, Math.floor(d * ks.length * 0.9 + ki * 1.5))], (1 - ki * 0.9) * (d < 0.6 ? 1 : 0.6));
        }
      break;
    case "ring": ring(c, x, y, R, ks, fade); break;
    case "implode": ring(c, x, y, (1 - ease(ki)) * 12 * S * kk, ks.slice(0, 2), fade); orb(c, x, y, ki * 3 * S * kk * fade, [...ks].reverse(), {} as Element, seed, t); break;
    case "shards": case "rays": {
      const n = s === "rays" ? 8 : 6;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + (s === "shards" ? r() : 0), L = (s === "rays" ? (6 + 4 * Math.sin(t / 40 + i)) * (1 - ki * 0.5) : 8 * (0.7 + 0.6 * r()) * ease(ki)) * S * kk;
        for (let j = 0; j <= L; j++) put(c, x + Math.cos(a) * j, y + Math.sin(a) * j * (s === "shards" ? 0.8 : 1), ks[Math.min(ks.length - 1, Math.floor((j / Math.max(1, L)) * ks.length))], fade);
      }
      break;
    }
    case "splash":
      gring(c, V, U, g, Math.round(2 + ease(ki) * 12 * S), ks.slice(1, 3), fade);
      for (let i = 0; i < 6 * S; i++) { const [X, Y] = thrown(i, 30 * S, 45 * S, ki * 0.6, 60 * S); put(c, X, Y, ks[1 + (i % 2)], fade); }
      break;
    case "debris":
      for (let i = 0; i < 5 * S; i++) {
        const [X, Y] = thrown(i, 28 * S, 40 * S, ki * 0.7, 70 * S);
        for (let q = 0; q < 2; q++) for (let w = 0; w < 2; w++) put(c, X + q, Y + w, ks[Math.min(ks.length - 1, 2 + ((q + w) % 2))]);
      }
      break;
    case "swirl":
      for (let i = 0; i < 3; i++)
        for (let j = 0; j < 24; j++) {
          const a = (j / 24) * Math.PI * 1.5 + i * 2.1 + t / 120, rr = (3 + j * 0.35) * S * (0.4 + ki), [X, Y] = V.P([to[0] + Math.cos(a) * rr * U, to[1] + Math.sin(a) * rr * (V.kind === "side" ? 1.7 : 1) * U, to[2]]);
          put(c, X, Y, ks[Math.min(ks.length - 1, Math.floor(j / 8))], fade);
        }
      break;
    case "sparkle":
      for (let i = 0; i < 5 * S; i++) {
        const [X, Y] = V.P([to[0] + (r() - 0.5) * 14 * S * U, to[1] + (r() - 0.5) * 8 * S * U, to[2] + ((r() * 0.4 + ki) * 14 * S - 4 * S) * U]);
        if (Math.floor(t / 90 + i) % 3 && fade > 0.2) spark(c, X, Y, 1, ks, t + i * 40);
      }
      break;
  }
}
