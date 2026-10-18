// Big pieces skeleton first. A rig names slots: where each part's joint sits in the whole, how big
// the part is, which side of the body it is on. Every part not drawn yet shows as a stand-in box,
// so the layout and the proportions can be judged before any part exists; then each part is drawn
// on its own as an ordinary sprite (or anim) at its slot's size, and drops in. The rig orders the
// parts from the way it faces: the near side's limbs in front of the body, the far side's behind,
// so a left arm never ends up in front because of a left/right mix-up. Retouches go on top.
import type { Canvas } from "./canvas.ts";
import { PxError } from "./errors.ts";

export interface Slot {
  /** The joint in the rig where the part's pivot lands. */
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
  /** The part's asset (default "<rig>_<slot>"). */
  part?: string;
}

export interface RigDef {
  name: string;
  facing: "right" | "left" | "front" | "back";
  slots: [string, Slot][];
  /** false: stand-ins only, a blocking pass (no part is looked up). */
  parts: boolean;
  loc?: string;
}

const SLOT_KEYS = ["at", "size", "pivot", "side", "z", "part"];
const pair = (v: unknown) => Array.isArray(v) && v.length === 2 && v.every(Number.isFinite);

/** Check a rig's options; the slots in the order they were written. */
export function readRig(name: string, facing: unknown, slots: unknown, parts: unknown = true, loc?: string): RigDef {
  if (typeof parts !== "boolean") throw new PxError(`rig '${name}': parts must be true or false (stand-ins only, a blocking pass), got ${JSON.stringify(parts)}`, loc);
  if (!["right", "left", "front", "back"].includes(facing as string))
    throw new PxError(`rig '${name}' needs facing: "right", "left", "front" (toward us) or "back": it decides which side's parts are near`, loc);
  if (typeof slots !== "object" || slots === null || Array.isArray(slots) || !Object.keys(slots).length)
    throw new PxError(`rig '${name}' needs slots: { torso: { at: [x, y], size: [w, h] }, arm: { at, size, side: "r" }, ... }`, loc);
  const out: [string, Slot][] = [];
  for (const [k, v] of Object.entries(slots as Record<string, unknown>)) {
    const s = v as Slot, bad = (why: string) => new PxError(`rig '${name}' slot '${k}': ${why}`, loc);
    if (typeof v !== "object" || v === null) throw bad("must be { at: [x, y], size: [w, h], ... }");
    const extra = Object.keys(v).filter((x) => !SLOT_KEYS.includes(x));
    if (extra.length) throw bad(`unknown option '${extra[0]}' (slots take ${SLOT_KEYS.join(", ")})`);
    if (!pair(s.at)) throw bad(`at must be [x, y], the joint the part hangs from, got ${JSON.stringify(s.at)}`);
    if (!pair(s.size) || s.size[0] < 1 || s.size[1] < 1) throw bad(`size must be [w, h], got ${JSON.stringify(s.size)}`);
    if (s.pivot !== undefined && !pair(s.pivot)) throw bad(`pivot must be [x, y] in the part, got ${JSON.stringify(s.pivot)}`);
    if (s.side !== undefined && s.side !== "l" && s.side !== "r") throw bad(`side must be "l" (its left) or "r" (its right), got ${JSON.stringify(s.side)}`);
    if (s.z !== undefined && !Number.isFinite(s.z)) throw bad(`z must be a number, got ${JSON.stringify(s.z)}`);
    out.push([k, s]);
  }
  return { name, facing: facing as RigDef["facing"], slots: out, parts, loc };
}

/** "near", "far" or "" (middle, or a front/back view where both sides show) for a body side. */
export function depthOf(facing: RigDef["facing"], side?: "l" | "r"): "near" | "far" | "" {
  if (!side || facing === "front" || facing === "back") return "";
  // facing right, its right side is toward us (its front x its top points out of the picture)
  return (facing === "right") === (side === "r") ? "near" : "far";
}

/** The slots back to front: far side at -100, middle 0, near side +100, plus each slot's z; ties as written. */
export function ordered(rig: RigDef): [string, Slot][] {
  const rank = (s: Slot) => ({ far: -100, "": 0, near: 100 })[depthOf(rig.facing, s.side)] + (s.z ?? 0);
  return rig.slots.map((e, i) => ({ e, i })).sort((a, b) => rank(a.e[1]) - rank(b.e[1]) || a.i - b.i).map(({ e }) => e);
}

export const partOf = (rig: RigDef, slot: string, s: Slot) => s.part ?? `${rig.name}_${slot}`;

/** Stand-in colors: its right green, its left magenta (as pose sides), the middle gray; far ones darker. */
function standIn(rig: RigDef, s: Slot): [string, string] {
  const d = depthOf(rig.facing, s.side);
  if (s.side === "r") return d === "far" ? ["#2f7a3a", "#1d4a24"] : ["#5ccf5c", "#2f7a3a"];
  if (s.side === "l") return d === "far" ? ["#7a2f7a", "#4a1d4a"] : ["#d05cd0", "#7a2f7a"];
  return ["#9a9aae", "#5a5a6e"];
}

/** Top-left where a part (or its stand-in) goes: its pivot on the slot's joint. */
function corner(s: Slot, pivot?: [number, number]): [number, number] {
  const [px, py] = pivot ?? s.pivot ?? [s.size[0] / 2, 0];
  return [Math.round(s.at[0] - px), Math.round(s.at[1] - py)];
}

const drawn = (rig: RigDef, c: Canvas, part: string) => rig.parts && c.exists(part);

/**
 * Draw the parts back to front: each drawn part on its joint, a stand-in box where none is drawn
 * yet, labelled with the slot's first letters when it has room.
 */
export function drawParts(rig: RigDef, c: Canvas): void {
  for (const [slot, s] of ordered(rig)) {
    const part = partOf(rig, slot, s);
    if (drawn(rig, c, part)) {
      const img = c.asset(part);
      const [x, y] = corner(s, img.pivot);
      // stamped by its top-left: the pivot (its own, or the slot's) already worked out
      c.stamp(part, x + Math.floor(img.pivot?.[0] ?? 0), y + Math.floor(img.pivot?.[1] ?? 0), { id: slot });
      continue;
    }
    const [x, y] = corner(s), [fill, edge] = standIn(rig, s), [w, h] = s.size;
    c.rect(x, y, w, h, fill);
    c.box(x, y, w, h, edge);
    const n = w >= 9 ? 2 : w >= 5 ? 1 : 0;
    if (n && h >= 7) c.text(x + 1 + Math.floor((w - 2 - (4 * n - 1)) / 2), y + 1, slot.slice(0, n).toUpperCase(), edge);
  }
}

/** The skeleton over the art, for previews: each drawn part's slot box in its side's color, and the joints. */
export function drawGuide(rig: RigDef, c: Canvas): void {
  for (const [slot, s] of ordered(rig)) {
    if (!drawn(rig, c, partOf(rig, slot, s))) continue;
    const [x, y] = corner(s);
    c.box(x, y, s.size[0], s.size[1], standIn(rig, s)[0]);
  }
  for (const [, s] of rig.slots) c.px(s.at[0], s.at[1], "#ffffff");
}

/** The RIG section of describe: slots back to front, where each goes, its side, and whether it's drawn. */
export function rigLines(rig: RigDef, size: (part: string) => [number, number] | undefined): string[] {
  const side = (s: Slot) => {
    if (!s.side) return "middle";
    const d = depthOf(rig.facing, s.side), its = s.side === "r" ? "its right" : "its left";
    if (d) return `${its}, ${d} side (${d === "near" ? "in front of the body" : "behind it"})`;
    const ours = (rig.facing === "front") === (s.side === "r") ? "left" : "right";
    return `${its}, on our ${ours}`;
  };
  const out = [`RIG (facing ${rig.facing}; slots back to front; each part's pivot, or the slot's, sits on the joint):`];
  let missing = 0;
  for (const [slot, s] of ordered(rig)) {
    const part = partOf(rig, slot, s), got = rig.parts ? size(part) : undefined;
    const [x, y] = corner(s), box = `${s.size[0]}x${s.size[1]} at x ${x}-${x + s.size[0] - 1}, y ${y}-${y + s.size[1] - 1}`;
    let state: string;
    if (!rig.parts) { missing++; state = "stand-in (blocking pass)"; }
    else if (!got) { missing++; state = `not drawn yet: stand-in box (draw '${part}' ${s.size[0]}x${s.size[1]})`; }
    else if (got[0] === s.size[0] && got[1] === s.size[1]) state = `drawn '${part}'`;
    else state = `drawn '${part}' at ${got[0]}x${got[1]}, not the slot's ${s.size[0]}x${s.size[1]}`;
    out.push(`  ${slot}: ${box}, joint ${s.at[0]},${s.at[1]}; ${side(s)}; ${state}`);
  }
  out.push(`  ${rig.slots.length - missing} of ${rig.slots.length} parts drawn`);
  return out;
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
