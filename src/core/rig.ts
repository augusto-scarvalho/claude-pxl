// Big pieces skeleton first. A rig names slots: where each part's joint sits in the whole, how big
// the part is, which side of the body it is on. Every part not drawn yet shows as a stand-in box,
// so the layout and the proportions can be judged before any part exists; then each part is drawn
// on its own as an ordinary sprite (or anim) at its slot's size, and drops in. The rig orders the
// parts from the way it faces: the near side's limbs in front of the body, the far side's behind,
// so a left arm never ends up in front because of a left/right mix-up. Retouches go on top.
import type { Canvas } from "./canvas.ts";
import type { Img } from "./image.ts";
import { TRANSPARENT } from "./color.ts";
import { PxError } from "./errors.ts";
import { type Steps, frontWords, lightWords } from "./checks.ts";

export interface Slot {
  /** The joint in the rig where the part's pivot lands (with `on`: where it goes while that part isn't drawn). */
  at: [number, number];
  /** The part's box, w x h: the size to draw it at (and the stand-in's size until then). */
  size: [number, number];
  /** Where in the part `at` lands when the part has no pivot of its own (default: top middle). */
  pivot?: [number, number];
  /** The body's side it belongs to: "l" its left, "r" its right; none for the middle (head, torso). */
  side?: "l" | "r";
  /**
   * Fine order (higher = in front). The far side's parts sit at -100, the middle's at 0, the near
   * side's at +100, and z adds to that: a tabard over the near leg (z -50) but under the near arm
   * (z 0) is a middle part with z 75; a cape behind everything, z -150. Default 0.
   */
  z?: number;
  /**
   * How far out from the body's side a side part sits, beyond its limb (a shield outside the arm):
   * over the arm on the near side, under it on the far side. Default 0.
   */
  out?: number;
  /** The part's asset (default "<rig>_<slot>"). */
  part?: string;
  /** Its joint is a socket of the part in another slot ("arm_l.hand"): a shield held in the hand. */
  on?: string;
  /**
   * A part with two faces (a shield: the cross outside, the straps inside), each its own drawing:
   * the rig shows the one turned to us, from which way the face points (`facesTo`) and the facing.
   * `edge`: seen side on (facing front, a shield at the side of the body).
   */
  faces?: { outer?: string; inner?: string; edge?: string };
  /** Which way its outer face points, in the body's terms (default: its side, outward; middle: front). */
  facesTo?: "left" | "right" | "front" | "back";
  /** Two of its sockets and two of another slot's, whose lines must run parallel: ["strap", "grip", "arm_l.elbow", "arm_l.hand"]. */
  parallel?: [string, string, string, string];
  /** A turned rig's slot: the part of the rig it was turned from, flipped, while it has none of its own. */
  mirrorOf?: string;
}

export interface RigDef {
  name: string;
  facing: "right" | "left" | "front" | "back";
  slots: [string, Slot][];
  /** false: stand-ins only, a blocking pass (no part is looked up). */
  parts: boolean;
  /** Where the light its parts are drawn under comes from, [x, y]: each part's lit side is checked against it. */
  light?: [number, number];
  /** Steps darker along the ramps for the far side's parts (a turned rig's far limbs darken with it). */
  far?: number;
  /** Turned from this rig (the slots mirrored). */
  from?: string;
  /** Turned with a part-name prefix map: a part named from[0]+x is looked up as from[1]+x. */
  rename?: [string, string];
  loc?: string;
}

const SLOT_KEYS = ["at", "size", "pivot", "side", "z", "out", "part", "on", "faces", "facesTo", "parallel"];
const pair = (v: unknown) => Array.isArray(v) && v.length === 2 && v.every(Number.isFinite);
const BODY = ["left", "right", "front", "back"];

/** Check a rig's options; the slots in the order they were written. */
export function readRig(name: string, facing: unknown, slots: unknown, parts: unknown = true, light?: unknown, far?: unknown, loc?: string): RigDef {
  if (far !== undefined && !(Number.isInteger(far) && (far as number) >= 0)) throw new PxError(`rig '${name}': far is how many steps darker the far side's parts are (e.g. 1), got ${JSON.stringify(far)}`, loc);
  if (light !== undefined && !pair(light)) throw new PxError(`rig '${name}': light must be [x, y], where the light comes from (e.g. [0.6, -1]: the top right), got ${JSON.stringify(light)}`, loc);
  if (typeof parts !== "boolean") throw new PxError(`rig '${name}': parts must be true or false (stand-ins only, a blocking pass), got ${JSON.stringify(parts)}`, loc);
  if (!["right", "left", "front", "back"].includes(facing as string))
    throw new PxError(`rig '${name}' needs facing: "right", "left", "front" (toward us) or "back": it decides which side's parts are near`, loc);
  if (typeof slots !== "object" || slots === null || Array.isArray(slots) || !Object.keys(slots).length)
    throw new PxError(`rig '${name}' needs slots: { torso: { at: [x, y], size: [w, h] }, arm: { at, size, side: "r" }, ... }`, loc);
  const out: [string, Slot][] = [];
  const names = Object.keys(slots as object);
  for (const [k, v] of Object.entries(slots as Record<string, unknown>)) {
    const s = v as Slot, bad = (why: string) => new PxError(`rig '${name}' slot '${k}': ${why}`, loc);
    if (typeof v !== "object" || v === null) throw bad("must be { at: [x, y], size: [w, h], ... }");
    const extra = Object.keys(v).filter((x) => !SLOT_KEYS.includes(x));
    if (extra.length) throw bad(`unknown option '${extra[0]}' (slots take ${SLOT_KEYS.join(", ")})`);
    if (!pair(s.at)) throw bad(`at must be [x, y], the joint the part hangs from, got ${JSON.stringify(s.at)}`);
    if (!pair(s.size) || s.size[0] < 1 || s.size[1] < 1) throw bad(`size must be [w, h], got ${JSON.stringify(s.size)}`);
    if (s.pivot !== undefined && !pair(s.pivot)) throw bad(`pivot must be [x, y] in the part, got ${JSON.stringify(s.pivot)}`);
    if (s.side !== undefined && s.side !== "l" && s.side !== "r") throw bad(`side must be "l" (its left) or "r" (its right), got ${JSON.stringify(s.side)}`);
    for (const n of ["z", "out"] as const) if (s[n] !== undefined && !Number.isFinite(s[n])) throw bad(`${n} must be a number, got ${JSON.stringify(s[n])}`);
    const ref = (r: unknown, what: string) => {
      const i = typeof r === "string" ? r.lastIndexOf(".") : -1;
      if (i <= 0 || !names.includes((r as string).slice(0, i)) || (r as string).slice(0, i) === k)
        throw bad(`${what} must be "<another slot>.<socket>" (e.g. "arm_l.hand"), got ${JSON.stringify(r)}`);
    };
    if (s.on !== undefined) ref(s.on, "on");
    if (s.faces !== undefined && (typeof s.faces !== "object" || s.faces === null || !Object.keys(s.faces).length ||
      Object.entries(s.faces).some(([f, n]) => !["outer", "inner", "edge"].includes(f) || typeof n !== "string")))
      throw bad(`faces must be { outer, inner, edge }: the part drawn as seen from each side, got ${JSON.stringify(s.faces)}`);
    if (s.facesTo !== undefined && !BODY.includes(s.facesTo)) throw bad(`facesTo must be "left", "right", "front" or "back" (the body's), got ${JSON.stringify(s.facesTo)}`);
    if (s.parallel !== undefined) {
      if (!Array.isArray(s.parallel) || s.parallel.length !== 4 || !s.parallel.every((x) => typeof x === "string"))
        throw bad(`parallel must be [its socket, its socket, "slot.socket", "slot.socket"], got ${JSON.stringify(s.parallel)}`);
      ref(s.parallel[2], "parallel's third");
      ref(s.parallel[3], "parallel's fourth");
    }
    out.push([k, s]);
  }
  return { name, facing: facing as RigDef["facing"], slots: out, parts, light: light as [number, number] | undefined, far: far as number | undefined, loc };
}

/**
 * The same rig facing the other way, `w` wide: every joint and pivot mirrored. Each slot's part is
 * "<turned>_<slot>" when that is drawn (a near limb seen from its own side, a part relit for the
 * light), else the original's part flipped; a two-faced part's faces likewise. The light stays where
 * it was: it doesn't turn with the rig.
 */
export function turnRig(rig: RigDef, name: string, w: number, rename?: [string, string]): RigDef {
  if (rig.facing !== "right" && rig.facing !== "left") throw new PxError(`rig '${rig.name}': turn mirrors a side view, so it needs facing "right" or "left"`, rig.loc);
  const map = (n: string) => (rename && n.startsWith(rename[0]) ? rename[1] + n.slice(rename[0].length) : undefined);
  const slots = rig.slots.map(([k, s]): [string, Slot] => {
    const [px, py] = s.pivot ?? [s.size[0] / 2, 0], was = partOf(rig, k, s);
    return [k, { ...s, at: [w - s.at[0], s.at[1]], pivot: [s.size[0] - px, py], part: map(was), mirrorOf: was }];
  });
  return { ...rig, name, facing: rig.facing === "right" ? "left" : "right", slots, from: rig.name, ...(rename ? { rename } : {}) };
}

/** "near", "far" or "" (middle, or a front/back view where both sides show) for a body side. */
export function depthOf(facing: RigDef["facing"], side?: "l" | "r"): "near" | "far" | "" {
  if (!side || facing === "front" || facing === "back") return "";
  // facing right, its right side is toward us (its front x its top points out of the picture)
  return (facing === "right") === (side === "r") ? "near" : "far";
}

/**
 * The slots back to front: far side at -100, middle 0, near side +100, plus each slot's z, and its
 * `out` beyond its limb (added near, taken away far); ties as written.
 */
export function ordered(rig: RigDef): [string, Slot][] {
  const rank = (s: Slot) => {
    const d = depthOf(rig.facing, s.side);
    return (d === "near" ? 100 + (s.out ?? 0) : d === "far" ? -100 - (s.out ?? 0) : 0) + (s.z ?? 0);
  };
  return rig.slots.map((e, i) => ({ e, i })).sort((a, b) => rank(a.e[1]) - rank(b.e[1]) || a.i - b.i).map(({ e }) => e);
}

export const partOf = (rig: RigDef, slot: string, s: Slot) => s.part ?? `${rig.name}_${slot}`;

/** Picture-space direction (x right, y down, z into the picture) of the body's front, by facing. */
const FRONT: Record<RigDef["facing"], [number, number, number]> = { right: [1, 0, 0], left: [-1, 0, 0], front: [0, 0, -1], back: [0, 0, 1] };

/** Which face of a two-faced part is turned to us: its outer face points the body's `facesTo` way. */
export function viewOf(rig: RigDef, s: Slot): "outer" | "inner" | "edge" | undefined {
  if (!s.faces) return undefined;
  const to = s.facesTo ?? (s.side === "l" ? "left" : s.side === "r" ? "right" : "front");
  const [fx, fy, fz] = FRONT[rig.facing], [ux, uy, uz] = [0, -1, 0];
  const right = [fy * uz - fz * uy, fz * ux - fx * uz, fx * uy - fy * ux];   // front x top
  const z = to === "front" ? fz : to === "back" ? -fz : to === "right" ? right[2] : -right[2];
  return z < -0.5 ? "outer" : z > 0.5 ? "inner" : "edge";
}

/** Stand-in colors: its right green, its left magenta (as pose sides), the middle gray; far ones darker. */
function standIn(rig: RigDef, s: Slot): [string, string] {
  const d = depthOf(rig.facing, s.side);
  if (s.side === "r") return d === "far" ? ["#2f7a3a", "#1d4a24"] : ["#5ccf5c", "#2f7a3a"];
  if (s.side === "l") return d === "far" ? ["#7a2f7a", "#4a1d4a"] : ["#d05cd0", "#7a2f7a"];
  return ["#9a9aae", "#5a5a6e"];
}

type View = "outer" | "inner" | "edge";
interface Source { part: string; flip: boolean; view?: View; lacking?: View }
/** How a rig looks its parts up: on a canvas while drawing, in the project for describe. */
export interface Look { has: (part: string) => boolean; image: (part: string, flip: boolean) => Img }

/**
 * What fills a slot: its own part, or (a turned rig) the original's flipped; for a two-faced part,
 * the face turned to us (or another face, noted as lacking, while that one isn't drawn); undefined:
 * a stand-in.
 */
function source(rig: RigDef, has: (n: string) => boolean, slot: string, s: Slot): Source | undefined {
  if (!rig.parts) return undefined;
  if (s.faces) {
    const view = viewOf(rig, s)!, want = s.faces[view], name = want ?? s.faces.outer ?? s.faces.inner ?? s.faces.edge!;
    const lacking = want ? undefined : view;
    const mapped = rig.rename ? (name.startsWith(rig.rename[0]) ? rig.rename[1] + name.slice(rig.rename[0].length) : undefined)
      : rig.from && name.startsWith(rig.from + "_") ? rig.name + name.slice(rig.from.length) : undefined;
    if (mapped) {
      const own = mapped;
      if (has(own)) return { part: own, flip: false, view, lacking };
      if (has(name)) return { part: name, flip: true, view, lacking };
      return undefined;
    }
    return has(name) ? { part: name, flip: false, view, lacking } : undefined;
  }
  const own = partOf(rig, slot, s);
  if (has(own)) return { part: own, flip: false };
  if (s.mirrorOf && has(s.mirrorOf)) return { part: s.mirrorOf, flip: true };
  return undefined;
}

interface Placed { src?: Source; img?: Img; x: number; y: number; joint: [number, number]; hung: boolean }

/**
 * Where every slot's part goes (top-left): its pivot (its own, or the slot's) on its joint, which is
 * the slot's `at`, or (`on`) a socket of the part placed in another slot.
 */
function place(rig: RigDef, look: Look): Map<string, Placed> {
  const out = new Map<string, Placed>(), busy = new Set<string>(), slots = new Map(rig.slots);
  const get = (slot: string): Placed => {
    const done = out.get(slot);
    if (done) return done;
    if (busy.has(slot)) throw new PxError(`rig '${rig.name}': slot '${slot}' hangs from itself through 'on'`, rig.loc);
    busy.add(slot);
    const s = slots.get(slot)!, src = source(rig, look.has, slot, s), img = src && look.image(src.part, src.flip);
    let joint: [number, number] = [s.at[0], s.at[1]], hung = false;
    if (s.on) {
      const i = s.on.lastIndexOf("."), other = get(s.on.slice(0, i)), so = other.img?.sockets?.[s.on.slice(i + 1)];
      if (so) { joint = [other.x + so[0], other.y + so[1]]; hung = true; }
    }
    const [px, py] = img?.pivot ?? s.pivot ?? [s.size[0] / 2, 0];
    const p: Placed = { src, img, x: Math.round(joint[0] - px), y: Math.round(joint[1] - py), joint, hung };
    out.set(slot, p);
    return p;
  };
  for (const [slot] of rig.slots) get(slot);
  return out;
}

const canvasLook = (c: Canvas): Look => ({ has: (n) => c.exists(n), image: (n, flip) => c.asset(n, flip ? { flip: "x" } : {}) });

/**
 * Draw the parts back to front: each drawn part on its joint, a stand-in box where none is drawn
 * yet, labelled with the slot's first letters when it has room.
 */
export function drawParts(rig: RigDef, c: Canvas): void {
  const at = place(rig, canvasLook(c));
  for (const [slot, s] of ordered(rig)) {
    const { src, img, x, y } = at.get(slot)!;
    if (src && img) {
      // stamped by its top-left: the pivot (its own, or the slot's) already worked out
      c.stamp(src.part, x + Math.floor(img.pivot?.[0] ?? 0), y + Math.floor(img.pivot?.[1] ?? 0), { ...(src.flip ? { flip: "x" as const } : {}), id: slot });
      // the far side a step or more darker, on this part's own pixels only
      if (rig.far && depthOf(rig.facing, s.side) === "far")
        c.shade((px, py) => img.get(px - x, py - y) !== TRANSPARENT, rig.far);
      continue;
    }
    const [fill, edge] = standIn(rig, s), [w, h] = s.size;
    c.rect(x, y, w, h, fill);
    c.box(x, y, w, h, edge);
    const n = w >= 9 ? 2 : w >= 5 ? 1 : 0;
    if (n && h >= 7) c.text(x + 1 + Math.floor((w - 2 - (4 * n - 1)) / 2), y + 1, slot.slice(0, n).toUpperCase(), edge);
  }
}

/** The skeleton over the art, for previews: each drawn part's box in its side's color, and the joints. */
export function drawGuide(rig: RigDef, c: Canvas): void {
  const at = place(rig, canvasLook(c));
  for (const [slot, s] of ordered(rig)) {
    const { img, x, y } = at.get(slot)!;
    if (img) c.box(x, y, img.w, img.h, standIn(rig, s)[0]);
  }
  for (const [slot] of rig.slots) {
    const j = at.get(slot)!.joint;
    c.px(j[0], j[1], "#ffffff");
  }
}

/** Which way a part's front points, in the rig's words, or undefined when it doesn't say. */
function facingOf(img: Img): RigDef["facing"] | undefined {
  const f = img.orient?.f;
  if (!f) return undefined;
  if (Math.abs(f[2]) > Math.max(Math.abs(f[0]), Math.abs(f[1]))) return f[2] < 0 ? "front" : "back";
  return Math.abs(f[0]) >= Math.abs(f[1]) ? (f[0] > 0 ? "right" : "left") : undefined;
}

/** The angle between two lines, 0 to 90 degrees, or undefined if either is a point. */
function between(a: [number, number], b: [number, number]): number | undefined {
  if (!Math.hypot(...a) || !Math.hypot(...b)) return undefined;
  const d = Math.abs(((Math.atan2(a[1], a[0]) - Math.atan2(b[1], b[0])) * 180) / Math.PI) % 180;
  return Math.round(Math.min(d, 180 - d));
}

/**
 * The RIG section of describe: slots back to front, where each goes, its side, and whether it's
 * drawn; which face of a two-faced part shows; what hangs from what; and the checks: a part labelled
 * another way than the rig, its front marker, its lit side, and lines that should run parallel.
 */
export function rigLines(rig: RigDef, look: Look, steps?: Steps): string[] {
  const side = (s: Slot) => {
    if (!s.side) return "middle";
    const d = depthOf(rig.facing, s.side), its = s.side === "r" ? "its right" : "its left";
    if (d) return `${its}, ${d} side (${d === "near" ? "in front of the body" : "behind it"})`;
    const ours = (rig.facing === "front") === (s.side === "r") ? "left" : "right";
    return `${its}, on our ${ours}`;
  };
  const lit = rig.light ? `; parts lit from ${rig.light[0] > 0 ? "the right" : "the left"}${rig.light[1] < 0 ? ", above" : ""}` : "";
  const out = [`RIG (facing ${rig.facing}${rig.from ? `, turned from '${rig.from}'` : ""}${lit}; slots back to front; each part's pivot, or the slot's, sits on the joint):`];
  const at = place(rig, look);
  let missing = 0;
  for (const [slot, s] of ordered(rig)) {
    const part = partOf(rig, slot, s), { src, img, x, y, joint, hung } = at.get(slot)!;
    const w = img?.w ?? s.size[0], h = img?.h ?? s.size[1], box = `${w}x${h} at x ${x}-${x + w - 1}, y ${y}-${y + h - 1}`;
    const name = src?.flip ? `'${src.part}' flipped${s.faces ? "" : ` (no '${part}' of its own)`}` : `'${src?.part ?? part}'`;
    let state: string;
    if (!rig.parts) { missing++; state = "stand-in (blocking pass)"; }
    else if (!img) { missing++; state = `not drawn yet: stand-in box (draw '${s.faces ? Object.values(s.faces)[0] : part}' ${s.size[0]}x${s.size[1]})`; }
    else if (w === s.size[0] && h === s.size[1]) state = `drawn ${name}`;
    else state = `drawn ${name} at ${w}x${h}, not the slot's ${s.size[0]}x${s.size[1]}`;
    if (src?.view) state += `; shows its ${src.view} face` + (src.lacking ? ` (WARNING: no ${src.lacking} face drawn: faces.${src.lacking} is what shows here)` : "");
    if (s.on && rig.parts) state += hung ? `; hangs from ${s.on}` : `; WARNING: ${s.on} isn't there yet: placed by its at`;
    const pf = img && facingOf(img);
    if (pf && pf !== rig.facing) state += `; WARNING: it faces ${pf}, the rig faces ${rig.facing}`;
    else if (pf && img?.orient?.mirrored) state += "; a mirror image (flipped)";
    if (img) for (const ws of [frontWords(img), rig.light ? lightWords(img, rig.light, steps) : ""]) if (ws) state += "; " + ws;
    if (s.parallel && img) {
      const [a, b, c, d] = s.parallel, sock = (im: Img | undefined, n: string) => im?.sockets?.[n];
      const of = (r: string) => at.get(r.slice(0, r.lastIndexOf(".")))?.img, nm = (r: string) => r.slice(r.lastIndexOf(".") + 1);
      const p1 = sock(img, a), p2 = sock(img, b), q1 = sock(of(c), nm(c)), q2 = sock(of(d), nm(d));
      const ang = p1 && p2 && q1 && q2 ? between([p2[0] - p1[0], p2[1] - p1[1]], [q2[0] - q1[0], q2[1] - q1[1]]) : undefined;
      if (ang === undefined) state += `; parallel: can't check (a socket of ${a}, ${b}, ${c}, ${d} is missing)`;
      else if (ang <= 12) state += `; its ${a}-${b} runs parallel to ${c.split(".")[0]}'s ${nm(c)}-${nm(d)} (${ang} deg apart)`;
      else state += `; WARNING: its ${a}-${b} is ${ang} deg off ${c.split(".")[0]}'s ${nm(c)}-${nm(d)}: they should run parallel`;
    }
    out.push(`  ${slot}: ${box}, joint ${Math.round(joint[0])},${Math.round(joint[1])}; ${side(s)}; ${state}`);
  }
  out.push(`  ${rig.slots.length - missing} of ${rig.slots.length} parts drawn`);
  return out;
}

/**
 * Two bones of lengths a and b from (0, 0) reaching for `target`: [joint, end]. The joint bends to
 * the side of increasing angle (bend 1: with y down, an arm reaching forward has its elbow below; a
 * leg reaching down has its knee behind) or the other (bend -1). Out of reach, the bones lie (to the pixel)
 * straight toward the target and `end` stops short of it.
 */
export function ik(a: number, b: number, target: [number, number], bend = 1): [[number, number], [number, number]] {
  if (!(a > 0 && b > 0) || !Array.isArray(target) || target.length !== 2 || !target.every(Number.isFinite) || (bend !== 1 && bend !== -1))
    throw new PxError(`ik(a, b, [x, y], bend): two bone lengths, the point to reach and 1 or -1, got ${a}, ${b}, ${JSON.stringify(target)}, ${bend}`);
  const [tx, ty] = target, d = Math.max(1e-6, Math.min(Math.hypot(tx, ty), a + b - 0.01)), f = Math.atan2(ty, tx);
  const al = Math.acos(Math.max(-1, Math.min(1, (a * a + d * d - b * b) / (2 * a * d))));
  return [[a * Math.cos(f + bend * al), a * Math.sin(f + bend * al)], [d * Math.cos(f), d * Math.sin(f)]];
}

export interface Figure {
  head: number; headW: number; eyes: number; chin: number; shoulders: number; chest: number; elbows: number;
  waist: number; crotch: number; wrists: number; knees: number; ankles: number; sole: number;
  shoulderW: number; hipW: number;
}

/**
 * Where a standing figure's landmarks fall (y from the top of its head, rounded), from its height in
 * px and how many heads tall it is: 8 heroic, 7-7.5 an average adult, 5-6 stylized, 2-3 a chibi.
 * Below the chin the body keeps an adult's proportions (Loomis's 8-head canon: shoulders a third of
 * a head under the chin, chest one head, navel two, crotch three, knees five, ankles 6.75), scaled
 * into what is left; arms hang with the elbows at the waist and the wrists at the crotch.
 */
export function figure(h: number, heads = 7.5): Figure {
  if (!(h > 0) || !(heads >= 1.5 && heads <= 10)) throw new PxError(`figure(h, heads): a height in px and 1.5 to 10 heads, got ${h}, ${heads}`);
  const head = h / heads, body = h - head, at = (heads8: number) => Math.round(head + (body * heads8) / 7);
  const shoulderW = Math.round(head * Math.min(2, Math.max(1.1, heads / 4)));
  return {
    head: Math.round(head), headW: Math.round(head * (heads < 4 ? 0.95 : 0.78)), eyes: Math.round(head / 2), chin: Math.round(head),
    shoulders: at(1 / 3), chest: at(1), elbows: at(2), waist: at(2), crotch: at(3), wrists: at(3), knees: at(5), ankles: at(6.75), sole: Math.round(h),
    shoulderW, hipW: Math.round(shoulderW * 0.75),
  };
}
