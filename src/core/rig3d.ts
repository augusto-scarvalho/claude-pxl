// A figure on the 3D layer: a skeleton posed in 3D (in the sprite's px: x across, y away from us, z up,
// as the fields are), its limbs distance fields along the bones (capsules, balls, what the file adds),
// drawn by surface() from the side as a field sprite is (20 degrees down), turned to each heading of
// the compass. What lib/characters/traveler.px.js and rig/warden.px.js each carried as a private engine
// (a camera, two-bone IK, a z-buffer of tubes and balls) becomes a field and a camera like any other.
// rig3d() makes the moves in every direction asked; its flat-blocks mode (the head yellow with a red
// face, the body orange, the right limbs light and the left dark) is how a new move is judged before
// it is painted. gait() gives a walk's numbers by the view, views() places hand-drawn heads.
import { PxError } from "./errors.ts";
import { Sdf, fieldOf, sdf, type V3 } from "./sdf.ts";
import { figure } from "./rig.ts";

// 3D vectors, written out: a pose is a few dozen of them
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k], dot = (a: readonly number[], b: readonly number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a: V3) => Math.hypot(a[0], a[1], a[2]), unit = (a: V3) => mul(a, 1 / (len(a) || 1));
const RAD = Math.PI / 180, UP: V3 = [0, 0, 1];
const v3 = (v: unknown, what: string): V3 => {
  if (!Array.isArray(v) || v.length !== 3 || !v.every(Number.isFinite)) throw new PxError(`${what} is a point [x, y, z], got ${JSON.stringify(v)}`);
  return v as V3;
};

/**
 * Two bones of lengths l1 and l2 from a reaching for b, in 3D: the joint between them, pushed toward
 * `hint` (a way: a knee forward, an elbow back and out). Out of reach, the bones lie straight toward b.
 */
export function ik3(a: V3, b: V3, l1: number, l2: number, hint: V3): V3 {
  if (!(l1 > 0 && l2 > 0)) throw new PxError(`ik3(a, b, l1, l2, hint): two bone lengths above 0, got ${l1}, ${l2}`);
  const d = sub(b, a), dl = Math.min(len(d), l1 + l2 - 0.01), u = unit(d);
  const x = (l1 * l1 - l2 * l2 + dl * dl) / (2 * dl), y = Math.sqrt(Math.max(0, l1 * l1 - x * x));
  const side = unit(sub(hint, mul(u, dot(hint, u))));
  return add(add(a, mul(u, x)), mul(side, y));
}

/** A body: lengths in px (heights over the sole, bones), the half-widths, and its thickness for the blocks. */
export interface Body {
  /** the hip joints' height over the sole, the spine from them to the shoulders' line, from there to the head's middle */
  hip: number; torso: number; neck: number;
  thigh: number; shin: number; upper: number; fore: number;
  /** the ankle's height over the sole */
  ankle: number;
  /** half the hips' width (the hip joints), and the shoulders: [forward, half the width, down] from the spine's top */
  hips: number; shoulders: V3;
  /** the blocks' thickness: legs and arms [at the root, the joint, the end], the body [hips, chest], the head, a hand, a foot [across, ahead, up] */
  r: { leg: V3; arm: V3; body: [number, number]; head: number; hand: number; foot: V3 };
}
const BODY_KEYS = ["h", "heads", "hip", "torso", "neck", "thigh", "shin", "upper", "fore", "ankle", "hips", "shoulders", "r"];

/**
 * A body from a height and heads (figure()'s landmarks: the crotch, the knees, the ankles, the
 * shoulders, the wrists), its thickness scaled from the traveler's (34 px, 3 heads); every number given wins.
 */
export function bodyOf(spec: Record<string, unknown> = {}): Body {
  const bad = Object.keys(spec).filter((k) => !BODY_KEYS.includes(k));
  if (bad.length) throw new PxError(`rig3d: body has no ${bad.join(", ")} (it takes ${BODY_KEYS.join(", ")})`);
  const h = (spec.h ?? 34) as number, heads = (spec.heads ?? 3) as number, F = figure(h, heads), k = h / 34;
  const up = (row: number) => h - row, headR = F.head / 2, chest = up(F.shoulders) + 1;
  const hip = up(F.crotch), knee = up(F.knees), ankle = up(F.ankles), wrist = up(F.wrists);
  const r = { leg: [1.6 * k, 1.5 * k, 1.4 * k] as V3, arm: [1.1 * k, 1 * k, 0.9 * k] as V3, body: [3.6 * k, 3.9 * k] as [number, number], head: headR, hand: k, foot: [1.6 * k, 2.3 * k, 1.1 * k] as V3, ...(spec.r as object) };
  const B: Body = {
    hip, torso: chest - hip, neck: h - headR - chest, thigh: hip - knee, shin: knee - ankle, upper: (chest - 1 - wrist) / 2, fore: (chest - 1 - wrist) / 2, ankle,
    // (the arms against the body, never out past it: at few heads figure()'s shoulders are wider than its torso)
    hips: Math.max(r.leg[0], F.hipW / 2 - r.leg[0]), shoulders: [0, Math.max(r.arm[0] + 1, Math.min(F.shoulderW / 2 - r.arm[0], r.body[1] + r.arm[0])), -1], r,
  };
  for (const key of BODY_KEYS.slice(2, -1)) if (spec[key] !== undefined) (B as unknown as Record<string, unknown>)[key] = spec[key];
  for (const key of ["hip", "torso", "neck", "thigh", "shin", "upper", "fore", "ankle", "hips"] as const) if (!(Number.isFinite(B[key]) && B[key] >= 0)) throw new PxError(`rig3d: body's ${key} is a length in px, got ${JSON.stringify(B[key])}`);
  v3(B.shoulders, "rig3d: body's shoulders ([forward, half the width, down])");
  return B;
}

/**
 * A pose: the file's own numbers, each with a default. feet: [[forward, right], ...] of each foot
 * (left, right) on the floor from under the pelvis; lift: each foot up; down: the pelvis lowered; lean:
 * degrees forward, tilt: to the right; turn: the hips turned from the heading (degrees, clockwise from
 * above), twist: the shoulders against the hips, head: the head against the shoulders; hands:
 * [[forward, right, up], ...] of each hand from its shoulder; grip: both hands on one line instead (a
 * broom, a staff), `from` and `to` [forward, right, up] from under the pelvis as the shoulders face, each
 * hand `at` [left, right] of the way; elbow: the way the elbows bend, [forward, out, up] in the shoulders'
 * frame (out mirrored for the left arm; default [-0.4, 0.5, -1], mostly down); air: in the air (a jump's
 * frames: pxl check doesn't ask its feet to be on the ground, the frame's data says air).
 */
export interface Pose { feet?: number[][]; lift?: number[]; down?: number; lean?: number; tilt?: number; turn?: number; twist?: number; head?: number; hands?: number[][]; elbow?: number[]; grip?: { from: number[]; to: number[]; at: number[] }; air?: boolean; [k: string]: unknown }

/** A piece of a part: its field, and where on it a point is: h along it (0..1) and a round it (radians from the way the body faces, toward its right), and its paint. */
export interface Piece { field: Sdf; at: (p: V3) => [number, number, V3]; paint?: unknown }
const isPiece = (v: unknown): v is Piece => typeof v === "object" && v !== null && (v as Piece).field instanceof Sdf;

/** The joints a pose puts where, turned to a heading (compass degrees: 0 away from us, 90 right, 180 toward us). */
export interface Joints {
  heading: number; f: V3; r: V3; up: V3; spine: V3; pelvis: V3; chest: V3; head: V3;
  /** the shoulders' and the head's frames (twist, head) */
  sh: { f: V3; r: V3 }; hd: { f: V3; r: V3; heading: number };
  legs: { hip: V3; knee: V3; ankle: V3; foot: V3 }[];
  arms: { sh: V3; elbow: V3; hand: V3 }[];
  /** the pose's grip, [from, to]: the line the hands hold */
  grip?: [V3, V3];
  /** in a draw hook: a line of pixels from a to b in the figure's own depth (a held broom, a staff) */
  rod?(a: V3, b: V3, paint: unknown): void;
  /** a limb along a bone, a ball turned with the body: pieces for parts() */
  limb(a: V3, b: V3, r0: number, r1?: number, paint?: unknown): Piece;
  ball(c: V3, r: number | number[], paint?: unknown): Piece;
  /** a surface swept round an upright through `base` from z0 up to z1 (a tunic, a cloak), see SweepOpts */
  sweep(base: V3, z0: number, z1: number, radius: (h: number, a: number) => number, o?: SweepOpts): Piece;
  /** a hand-drawn decal pinned on the figure at `point` (a face's eyes), its other views by the angle; `on` the field it lies on (default the whole figure: an eye on the skull, not on the lock nearest) */
  decal(asset: string, point: V3, o?: { views?: { three?: string; profile?: string }; up?: V3; on?: Sdf; lit?: boolean; depth?: number }): DecalPiece;
  /** brushes scattered on a field (sdf.scatter's: tufts, strands), drawn on the figure before its line round */
  scatter(field: Sdf, o?: Record<string, unknown>): ScatterPiece;
}
/** A sweep's shape: `keep(h, a)` which of it there is (a cloak open in front), `shift(h)` the way that height of it is carried off the axis (trailing), `shell` half its thickness (a cloth; none: solid), `paint` as a piece's. */
export interface SweepOpts { keep?: (h: number, a: number) => unknown; shift?: (h: number) => number[]; shell?: number; paint?: unknown }
export interface DecalPiece { decal: { asset: string; point: V3; views?: { three?: string; profile?: string }; up?: V3; on?: Sdf; lit?: boolean; depth?: number } }
export interface ScatterPiece { scatter: { field: Sdf; o: Record<string, unknown> } }
const frameAt = (deg: number) => { const s = Math.sin(deg * RAD), c = Math.cos(deg * RAD); return { f: [s, c, 0] as V3, r: [c, -s, 0] as V3 }; };
const num = (v: unknown, d: number, what: string) => { const x = v ?? d; if (!Number.isFinite(x)) throw new PxError(`rig3d: a pose's ${what} is a number, got ${JSON.stringify(v)}`); return x as number; };
const pairs = (v: unknown, d: number[][], n: number, what: string) => {
  const a = (v ?? d) as number[][];
  if (!Array.isArray(a) || a.length !== 2 || !a.every((q) => Array.isArray(q) && q.length === n && q.every(Number.isFinite))) throw new PxError(`rig3d: a pose's ${what} is [left, right], each [${n === 2 ? "forward, right" : "forward, right, up"}], got ${JSON.stringify(v)}`);
  return a;
};

export function jointsOf(B: Body, p: Pose, heading: number): Joints {
  const turn = num(p.turn, 0, "turn"), twist = num(p.twist, 0, "twist"), hdeg = num(p.head, 0, "head");
  const { f, r } = frameAt(heading + turn), sh = frameAt(heading + turn + twist), hd = { ...frameAt(heading + turn + twist + hdeg), heading: heading + turn + twist + hdeg };
  const lean = num(p.lean, 0, "lean") * RAD, tilt = num(p.tilt, 0, "tilt") * RAD, down = num(p.down, 0, "down");
  const lift = (p.lift ?? [0, 0]) as number[];
  if (!Array.isArray(lift) || lift.length !== 2 || !lift.every(Number.isFinite)) throw new PxError(`rig3d: a pose's lift is [left, right], got ${JSON.stringify(p.lift)}`);
  const feet = pairs(p.feet, [[0, -B.hips], [0, B.hips]], 2, "feet"), reach = B.upper + B.fore;
  const hands = pairs(p.hands, [[0, -B.r.arm[0], -reach], [0, B.r.arm[0], -reach]], 3, "hands");
  // the way the elbows bend: a hint [forward, out, up] in the shoulders' frame, mostly down by default
  const eh = p.elbow === undefined ? [-0.4, 0.5, -1] : v3(p.elbow, "rig3d: a pose's elbow (the way the elbows bend, [forward, out, up])");
  const local = (o: V3, fr: { f: V3; r: V3 }, a: number, b: number, c: number) => add(o, add(add(mul(fr.f, a), mul(fr.r, b)), mul(UP, c)));
  // a grip: both hands on one line, its ends from under the pelvis as the shoulders face
  const g = p.grip as { from: V3; to: V3; at: number[] } | undefined;
  if (g !== undefined && !(g && typeof g === "object" && [g.from, g.to].every((q) => Array.isArray(q) && q.length === 3 && q.every(Number.isFinite)) && Array.isArray(g.at) && g.at.length === 2 && g.at.every(Number.isFinite)))
    throw new PxError(`rig3d: a pose's grip is { from: [forward, right, up], to: [...] (px from under the pelvis), at: [left, right] (each hand's share of the way) }, got ${JSON.stringify(p.grip)}`);
  const grip = g && ([local([0, 0, 0], sh, ...g.from), local([0, 0, 0], sh, ...g.to)] as [V3, V3]);
  const spine = unit(add(add(mul(UP, Math.cos(lean)), mul(sh.f, Math.sin(lean))), mul(sh.r, Math.sin(tilt))));
  const pelvis: V3 = [0, 0, B.hip - down], chest = add(pelvis, mul(spine, B.torso)), head = add(chest, mul(spine, B.neck));
  const k = B.r.foot[1] / 2.3;
  const legs = [0, 1].map((i) => {
    const hip = local(pelvis, { f, r }, 0, i ? B.hips : -B.hips, 0), ankle = local([0, 0, B.ankle + lift[i]], { f, r }, feet[i][0], feet[i][1], 0);
    return { hip, ankle, knee: ik3(hip, ankle, B.thigh, B.shin, add(f, [0, 0, 0.3])), foot: add(ankle, mul(f, 1.1 * k)) };
  });
  const arms = [0, 1].map((i) => {
    const s = local(chest, sh, B.shoulders[0], i ? B.shoulders[1] : -B.shoulders[1], B.shoulders[2]);
    const hand = grip ? add(grip[0], mul(sub(grip[1], grip[0]), g!.at[i])) : local(s, sh, hands[i][0], hands[i][1], hands[i][2]);
    return { sh: s, hand, elbow: ik3(s, hand, B.upper, B.fore, local([0, 0, 0], sh, eh[0], i ? eh[1] : -eh[1], eh[2])) };
  });
  // where on a piece a point is: along its bone (or up a ball) and round it, from the way the body faces
  const round = (q: V3) => Math.atan2(dot(q, r), dot(q, f));
  const paintOf = (v: unknown, what: string) => {
    if (v !== undefined && typeof v !== "string" && typeof v !== "function") throw new PxError(`rig3d: ${what}'s paint is a material (a ramp of keys, "RPp", or a name in mats) or (h, a, outside) => one, got ${JSON.stringify(v)}`);
    return v;
  };
  return {
    heading, f, r, up: UP, spine, pelvis, chest, head, sh, hd, legs, arms, ...(grip ? { grip } : {}),
    limb: (a, b, r0, r1 = r0, paint) => {
      v3(a, "limb(a, b, r0, r1, paint): a"); v3(b, "limb: b");
      if (!(r0 > 0) || !(r1 >= 0)) throw new PxError(`limb(a, b, r0, r1, paint): radii in px, above 0, got ${r0}, ${r1}`);
      const d = sub(b, a), dd = dot(d, d) || 1e-12;
      return { field: sdf.capsule(a, b, r0, r1), paint: paintOf(paint, "a limb"), at: (q) => { const t = Math.max(0, Math.min(1, dot(sub(q, a), d) / dd)), out = sub(q, add(a, mul(d, t))); return [t, round(out), out]; } };
    },
    ball: (c, rr, paint) => {
      v3(c, "ball(c, r, paint): c");
      const R = (typeof rr === "number" ? [rr, rr, rr] : rr) as V3;
      if (!(Array.isArray(R) && R.length === 3 && R.every((x) => x > 0))) throw new PxError(`ball(c, r, paint): r is a radius or [across, ahead, up] in px, got ${JSON.stringify(rr)}`);
      return { field: sdf.ellipsoid(R).rotate(-(heading + turn), "z").at(c), paint: paintOf(paint, "a ball"), at: (q) => { const o = sub(q, c); return [Math.max(0, Math.min(1, (o[2] + R[2]) / (2 * R[2]))), round(o), o]; } };
    },
    sweep: (base, z0, z1, radius, so = {}) => {
      v3(base, "sweep(base, z0, z1, radius, opts): base");
      const { keep, shift, shell = 0, paint } = so;
      if (!(z1 > z0) || typeof radius !== "function" || (keep !== undefined && typeof keep !== "function") || (shift !== undefined && typeof shift !== "function") || !(shell >= 0))
        throw new PxError("sweep(base, z0, z1, (h, a) => radius, { keep?, shift?, shell?, paint? }): from z0 up to z1 (px), its radius at height h (0..1) and angle a (0 the way the body faces)");
      const H = z1 - z0, fx = f[0], fy = f[1], rx = r[0], ry = r[1], bx = base[0], by = base[1];
      // its box: the radius and the shift sampled over it
      let R = 0, x0 = 0, x1 = 0, y0 = 0, y1 = 0;
      for (let i = 0; i <= 8; i++) {
        const s = shift?.(i / 8) ?? [0, 0, 0];
        x0 = Math.min(x0, s[0]); x1 = Math.max(x1, s[0]); y0 = Math.min(y0, s[1]); y1 = Math.max(y1, s[1]);
        for (let k = 0; k < 24; k++) R = Math.max(R, radius(i / 8, (k / 24) * 2 * Math.PI - Math.PI));
      }
      const pad = R * 1.25 + shell + 0.5;
      // the distance: across to the swept rim (a cloth: its two faces), and up to its ends; where it is cut
      // away, at least a step (ponytail: a bound only while the radius changes slowly: lip 1.5)
      const d = (x: number, y: number, z: number) => {
        const h = Math.max(0, Math.min(1, (z - z0) / H)), s = shift ? shift(h) : undefined, vx = x - bx - (s ? s[0] : 0), vy = y - by - (s ? s[1] : 0);
        const a = Math.atan2(vx * rx + vy * ry, vx * fx + vy * fy), rr = Math.sqrt(vx * vx + vy * vy), Rr = radius(h, a);
        const side = shell ? Math.abs(rr - Rr) - shell : rr - Rr, cap = Math.max(z0 - z, z - z1);
        const v = Math.min(Math.max(side, cap), 0) + Math.sqrt(Math.max(side, 0) ** 2 + Math.max(cap, 0) ** 2);
        return keep && !keep(h, a) ? Math.max(v, 0.3) : v;
      };
      const field = fieldOf(d, [bx + x0 - pad, by + y0 - pad, z0 - 0.5], [bx + x1 + pad, by + y1 + pad, z1 + 0.5], 1.5);
      return { field, paint: paintOf(paint, "a sweep"), at: (q) => {
        const h = Math.max(0, Math.min(1, (q[2] - z0) / H)), s = shift?.(h) ?? [0, 0, 0], o: V3 = [q[0] - bx - s[0], q[1] - by - s[1], 0];
        return [h, round(o), o];
      } };
    },
    decal: (asset, point, o = {}) => {
      if (typeof asset !== "string" || !asset) throw new PxError(`decal(asset, point, { views, up, on, lit }): a sprite's name, got ${JSON.stringify(asset)}`);
      if (o.on !== undefined && !(o.on instanceof Sdf)) throw new PxError("decal(asset, point, { on }): on is the field it lies on");
      return { decal: { asset, point: v3(point, "decal(asset, point): point"), views: o.views, up: o.up, on: o.on, lit: o.lit, depth: o.depth } };
    },
    scatter: (field, o = {}) => {
      if (!(field instanceof Sdf)) throw new PxError("scatter(field, opts): brushes scattered on a field (sdf.scatter's options)");
      return { scatter: { field, o } };
    },
  };
}

/** The flat blocks' colors: the head, the face patch, the body, the right limbs (light), the left (dark). */
export const BLOCKS = { head: "#f2cd3a", face: "#d8402e", body: "#e7763a", right: "#98e2ec", left: "#2b6b91" };
/** Nothing below the ground: what lies on it stops there. */
const GROUND = sdf.plane([0, 0, -1], 0.2);

/** A tube from a to b, its ends flat (a capped cone turned onto the bone): a body that ends at the hips, not in a point between the legs. */
function tube(a: V3, b: V3, r0: number, r1: number): Sdf {
  const d = sub(b, a), l = len(d), u = mul(d, 1 / (l || 1)), ax: V3 = [-u[1], u[0], 0], s = len(ax);
  const f = sdf.cone(r0, Math.max(l, 1e-3), r1);
  return (s > 1e-9 ? f.rotate((Math.atan2(s, u[2]) * 180) / Math.PI, mul(ax, 1 / s)) : u[2] < 0 ? f.rotate(180, "x") : f).at(a);
}
/** The skeleton as flat blocks: a material and a part each, the head a ball with a red patch where the face is. */
export function blocksOf(B: Body, j: Joints): Sdf {
  const R = B.r, side = (i: number) => (i ? "right" : "left");
  const parts: Sdf[] = [];
  j.legs.forEach((L, i) => parts.push(sdf.union(sdf.capsule(L.hip, L.knee, R.leg[0], R.leg[1]), sdf.capsule(L.knee, L.ankle, R.leg[1], R.leg[2]), j.ball(L.foot, R.foot).field).mat(side(i)).part(`leg${i}`)));
  parts.push(tube(j.pelvis, j.chest, R.body[0], R.body[1]).mat("body").part("body"));
  j.arms.forEach((A, i) => parts.push(sdf.union(sdf.capsule(A.sh, A.elbow, R.arm[0], R.arm[1]), sdf.capsule(A.elbow, A.hand, R.arm[1], R.arm[2]), sdf.sphere(R.hand).at(A.hand)).mat(side(i)).part(`arm${i}`)));
  const k = R.head / 5.5;
  parts.push(sdf.sphere(R.head).at(j.head).mat("head").part("head"));
  parts.push(sdf.ellipsoid([2.4 * k, 2.4 * k, 2 * k]).rotate(-j.hd.heading, "z").at(add(j.head, mul(j.hd.f, R.head * 0.85))).mat("face").part("face"));
  return sdf.union(parts).intersect(GROUND);
}
export const BLOCK_MATS = Object.fromEntries(Object.entries(BLOCKS).map(([k, v]) => [k, [v]]));

/**
 * What parts(j, pose) gives, as one field: { name: piece, field or a list of them }, each piece its
 * paint (a material, or (h, a, outside) => one: h along it, a round it, outside its face away from
 * its middle); the materials it names that are ramps of keys, for surface()'s mats.
 */
export function partsOf(spec: unknown, j: Joints): { field: Sdf; ramps: string[]; decals: (DecalPiece["decal"] & { part: string })[]; brushes: (ScatterPiece["scatter"] & { part: string })[] } {
  if (!spec || typeof spec !== "object" || Array.isArray(spec)) throw new PxError(`rig3d: parts(j, pose) gives { name: piece or [pieces] } (j.limb(a, b, r0, r1, paint), j.ball(c, r, paint), or a field), got ${JSON.stringify(spec)?.slice(0, 80)}`);
  const ramps = new Set<string>(), all: Sdf[] = [], decals: (DecalPiece["decal"] & { part: string })[] = [], brushes: (ScatterPiece["scatter"] & { part: string })[] = [];
  for (const [name, v] of Object.entries(spec as Record<string, unknown>)) {
    const list = (Array.isArray(v) ? v : [v]).filter((q) => {
      if (q && typeof q === "object" && "decal" in q) { decals.push({ ...(q as DecalPiece).decal, part: name }); return false; }
      if (q && typeof q === "object" && "scatter" in q) { brushes.push({ ...(q as ScatterPiece).scatter, part: name }); return false; }
      return true;
    }).map((q) => {
      if (q instanceof Sdf) return q;
      if (!isPiece(q)) throw new PxError(`rig3d: part '${name}' is a piece (j.limb, j.ball), a field (sdf.*) or a list of them, got ${JSON.stringify(q)?.slice(0, 80)}`);
      const P = q.paint;
      if (typeof P === "string") { ramps.add(P); return q.field.mat(P); }
      if (typeof P !== "function") return q.field;
      return q.field.paint((p, n) => { const [h, a, out] = q.at(p); return (P as (h: number, a: number, o: boolean) => unknown)(h, a, dot(n, out) >= 0); });
    });
    if (list.length) all.push(sdf.union(list).part(name));
  }
  if (!all.length) throw new PxError("rig3d: parts(j, pose) gave no parts");
  return { field: sdf.union(all).intersect(GROUND), ramps: [...ramps], decals, brushes };
}

// ---------------------------------------------------------------- the walk's numbers
/** A walk's view from a heading: facing us or away, turned to a diagonal, or in profile; and how side-on (0..1). */
export function viewOf(heading: number): { view: "front" | "back" | "diagonal" | "profile"; a: number } {
  const a = Math.abs(Math.sin(heading * RAD));
  return { view: a < 0.1 ? (Math.cos(heading * RAD) < 0 ? "front" : "back") : a > 0.9 ? "profile" : "diagonal", a };
}
type Table = number | number[];
interface GaitView { stride: Table; lift: Table; bob: number[]; hands: number[][] }
/**
 * The guide's measured walk (characters §6, §10), by the view, in tables of 8 frames, the traveler's
 * timing (the hands [forward, up] from hanging: [ahead, behind] in profile, [forward, back] facing us).
 */
export const GAIT: Record<"front" | "diagonal" | "profile", GaitView> = {
  // the feet step in their own columns, the lifted one up 1, 3, 1 while the other stays planted, the
  // hand across from it forward and up, the body down a pixel at each contact
  front: { stride: 0.6, lift: [0, 0, 0, 0, 0, 1, 3, 1], bob: [1, 0, 0, 0, 1, 0, 0, 0], hands: [[0.8, 1.4], [-0.4, 0]] },
  // between the two: the feet part 8-9 px at a contact, the body a pixel lower there
  diagonal: { stride: 3.4, lift: 1.8, bob: [0, 0, 1, 0, 0, 0, 1, 0], hands: [[4.4, 1.4], [3.6, -0.3]] },
  // a long stride, the foot lifted as it swings through, the body a 2 px triangle lowest at the
  // contacts, the hands forward and back past the body
  profile: { stride: 4.6, lift: 2.5, bob: [0, 1, 2, 1, 0, 1, 2, 1], hands: [[4.4, 1.4], [3.6, -0.3]] },
};
const GAIT_KEYS = ["heading", "view", "stride", "lift", "bob", "hands", "front", "diagonal", "profile"];

/**
 * A walk's numbers at t (0..1 over the cycle; at 0 both feet down facing us, the left foot passing in
 * profile): `heading` (compass degrees) or `view`; each of GAIT's numbers overridable, for every view (`stride: 4`) or one
 * (`profile: { stride: 4 }`); a number of stride the foot planted half the cycle going back at an even
 * speed and swung through the other half, of lift a swing (cos over the cycle), a list one value a
 * frame. Returns { view, a, feet: [[forward, up], ...], bob, hands: [[forward, up], ...], pace }:
 * numbers, placing nothing (the right foot half a cycle after the left; pace the px a cycle the body
 * goes over a planted foot).
 */
export function gait(t: number, o: Record<string, unknown> = {}) {
  if (!Number.isFinite(t)) throw new PxError(`gait(t, opts): t is 0..1 over the cycle, got ${JSON.stringify(t)}`);
  const bad = Object.keys(o).filter((k) => !GAIT_KEYS.includes(k));
  if (bad.length) throw new PxError(`gait: no option ${bad.join(", ")} (it takes ${GAIT_KEYS.join(", ")})`);
  const hd = o.heading ?? 180;
  if (typeof hd !== "number" || !Number.isFinite(hd)) throw new PxError(`gait: heading is compass degrees (0 away from us, 90 right, 180 toward us), got ${JSON.stringify(o.heading)}`);
  const vw = o.view !== undefined ? { view: o.view as string, a: o.view === "profile" ? 1 : o.view === "diagonal" ? Math.SQRT1_2 : 0 } : viewOf(hd);
  if (!["front", "back", "diagonal", "profile"].includes(vw.view)) throw new PxError(`gait: view is "front", "back", "diagonal" or "profile", got ${JSON.stringify(o.view)}`);
  const key = vw.view === "back" ? "front" : (vw.view as "front" | "diagonal" | "profile");
  const G = { ...GAIT[key], ...Object.fromEntries(["stride", "lift", "bob", "hands"].filter((k) => o[k] !== undefined).map((k) => [k, o[k]])), ...(o[key] as object) } as GaitView;
  const ph = 2 * Math.PI * t, sn = Math.sin(ph), cs = Math.cos(ph);
  // a table's value at t (and half a cycle later), or a number's swing
  const at = (v: number[], half = 0) => v[(((Math.round(t * v.length) + (half ? v.length / 2 : 0)) % v.length) + v.length) % v.length];
  // a number of stride: the foot planted from its reach ahead back to its reach behind at an even speed
  // (half the cycle, as the body goes over it), then swung through (eased, lifted)
  const stride = (k: number) => {
    if (typeof G.stride !== "number") return at(G.stride, k);
    const u = (((t + (k ? 0.5 : 0) - 0.25) % 1) + 1) % 1;
    return u < 0.5 ? G.stride * (1 - 4 * u) : -G.stride * Math.cos(2 * Math.PI * (u - 0.5));
  };
  const lift = (k: number) => (typeof G.lift === "number" ? G.lift * Math.max(0, k ? -cs : cs) : at(G.lift, k));
  const feet = [0, 1].map((k) => [stride(k), lift(k)]);
  let hands: number[][];
  if (key === "front") {
    // the hand across from the lifted foot comes forward and up
    const up = [lift(0) > 0, lift(1) > 0];
    hands = [0, 1].map((k) => [...G.hands[up[1 - k] ? 0 : 1]]);
  } else {
    // ahead and up, or behind and a little down, as far as the foot across from it
    const hand = (s: number) => (s > 0 ? [G.hands[0][0] * s, G.hands[0][1] * s] : [G.hands[1][0] * s, G.hands[1][1] * s]);
    hands = [hand(-sn), hand(sn)];
  }
  // how far the body goes over a planted foot in a cycle (px): a figure moved this fast keeps its feet planted
  const S = G.stride, pace = typeof S === "number" ? 4 * S : 2 * S.reduce((s, v, i) => s + Math.max(0, v - S[(i + 1) % S.length]), 0);
  return { view: vw.view, a: vw.a, feet, bob: at(G.bob), hands, pace };
}

// ---------------------------------------------------------------- views' rows
type Rows = { crown: number; chin: number; runs: Map<number, [number, number]>; rows: Map<number, [number, number]> };
/**
 * A view's rows from its anchor: the crown (its top row), the chin (the row given, or its lowest row with
 * a third as many pixels as its fullest: a lock hanging below isn't the chin), each row's run through the anchor's
 * column (or nearest it: what hangs apart, a braid beside the jaw, isn't the head's) and its extent.
 */
export function viewRows(img: { w: number; h: number; data: Uint32Array; pivot?: number[] }, chin?: number): Rows | undefined {
  const [ax, ay] = (img.pivot ?? [0, 0]).map(Math.floor), on = (x: number, y: number) => (img.data[y * img.w + x] & 255) >= 128;
  const runs = new Map<number, [number, number]>(), rows = new Map<number, [number, number]>(), count: [number, number][] = [];
  for (let y = 0; y < img.h; y++) {
    let best: [number, number] | undefined, l = -1, r = -1, n = 0, first = -1, last = -1;
    for (let x = 0; x <= img.w; x++) {
      if (x < img.w && on(x, y)) { if (l < 0) l = x; r = x; n++; if (first < 0) first = x; last = x; continue; }
      if (l >= 0 && (!best || Math.abs(Math.max(l, Math.min(r, ax)) - ax) < Math.abs(Math.max(best[0], Math.min(best[1], ax)) - ax))) best = [l, r];
      l = -1;
    }
    if (best) { runs.set(y - ay, [best[0] - ax, best[1] - ax]); rows.set(y - ay, [first - ax, last - ax]); count.push([y - ay, n]); }
  }
  if (!count.length) return undefined;
  const most = Math.max(...count.map((e) => e[1]));
  return { crown: count[0][0], chin: chin ?? Math.max(...count.filter((e) => e[1] >= most / 3).map((e) => e[0])), runs, rows };
}
/**
 * What pxl check says about a views() set: the views whose crown or chin isn't on the others' row
 * (from the anchor: a head that turns doesn't bob), and with `like`, the rows from its crown to above
 * its chin that stick out past the other set's same view by more than a pixel.
 */
export function viewWarnings(set: { name: string; views: [string, Rows | undefined][]; like?: { name: string; views: Map<string, Rows | undefined> }; baked?: boolean }): string[] {
  const out: string[] = [], seen = set.views.filter((v): v is [string, Rows] => !!v[1]);
  // (views drawn from one modeled head keep their rows by being one head: the line under a jaw that
  // turns may reach a row lower, and that is the jaw, not a bob)
  if (!set.baked) for (const k of ["crown", "chin"] as const) {
    const at = new Map<number, string[]>();
    for (const [v, R] of seen) at.set(R[k], [...(at.get(R[k]) ?? []), v]);
    if (at.size > 1) out.push(`its ${k} isn't on one row in every view (from the anchor: ${[...at].map(([r, vs]) => `${r} in ${vs.join(", ")}`).join("; ")}): a head that turns bobs`);
  }
  if (!set.like) return out;
  for (const [v, R] of seen) {
    const L = set.like.views.get(v);
    if (!L) continue;
    // its head's run against the other's whole row, down to above its chin (where a beard or a braid may hang)
    const bad: string[] = [];
    for (let y = L.crown; y < L.chin; y++) {
      const a = R.runs.get(y), b = L.rows.get(y);
      if (!a) continue;
      const left = b ? b[0] - a[0] : Infinity, right = b ? a[1] - b[1] : Infinity;
      if (left > 1 || right > 1) bad.push(b ? `${y} (${left > 1 ? `${left} px left` : ""}${left > 1 && right > 1 ? ", " : ""}${right > 1 ? `${right} px right` : ""})` : `${y} (a row ${set.like.name} hasn't)`);
    }
    if (bad.length) out.push(`${v}: row${bad.length > 1 ? "s" : ""} ${bad.join(", ")} from the anchor stick${bad.length > 1 ? "" : "s"} out past ${set.like.name}_${v} by more than a pixel`);
  }
  return out;
}

// ---------------------------------------------------------------- nothing floats
/**
 * What pxl check reads in a pose, px: how far its lower foot is off the ground (both up: it floats), how
 * much longer than its two bones a leg is pulled (the foot out of its reach: the shin stretches), and how
 * far an elbow lies on the wrong side of its shoulder-hand line: ahead of it as he faces, while the hand is
 * below the shoulder (seen from the side, the elbow's side turns with the arm: under the line of a hand
 * raised ahead, ahead of a hand overhead; an arm out sideways isn't read). More than half a pixel warns:
 * `FLAWS` says each.
 */
export function poseFlaws(B: Body, j: Joints): { floats: number; reach: number; elbow: number } {
  const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const elbow = Math.max(...j.arms.map((A) => { const back = cross(unit(sub(A.hand, A.sh)), j.sh.r), n = len(back); return n < 0.3 ? 0 : -dot(sub(A.elbow, A.sh), back) / n; }));
  return { floats: Math.min(...j.legs.map((L) => L.ankle[2])) - B.ankle, reach: Math.max(...j.legs.map((L) => len(sub(L.ankle, L.hip)) - B.thigh - B.shin)), elbow };
}
export const FLAWS = {
  floats: (v: number) => `both feet off the ground (up to ${v.toFixed(1)} px): it floats`,
  reach: (v: number) => `a leg longer than its bones (by up to ${v.toFixed(1)} px): its foot out of reach; lower the pelvis or bring the foot in`,
  elbow: (v: number) => `an elbow bent the wrong way (up to ${v.toFixed(1)} px ahead of its shoulder-hand line): give the pose an elbow hint behind him: elbow: [-1, 0.5, 0] ([-1, 0.5, -1] with the hand at or over the shoulder)`,
};

// ---------------------------------------------------------------- picking a view by heading
const COMPASS16 = ["n", "nne", "ne", "ene", "e", "ese", "se", "sse", "s", "ssw", "sw", "wsw", "w", "wnw", "nw", "nnw"];
/**
 * Of a family named by the compass (name_n, name_ne, ...: a turnaround, rig3d's moves, views()), the
 * member nearest a heading: compass degrees (0 away from us, 90 right), or a way on the ground [dx, dz]
 * (dz away from us). A tie goes to the one listed first.
 */
export function byHeading(names: string[], heading: unknown, who: string): string {
  const deg = Array.isArray(heading) && heading.length === 2 && heading.every(Number.isFinite) ? (Math.atan2(heading[0], heading[1]) * 180) / Math.PI : heading;
  if (typeof deg !== "number" || !Number.isFinite(deg)) throw new PxError(`heading is compass degrees (0 away from us, 90 right) or a way on the ground [dx, dz], got ${JSON.stringify(heading)}`);
  let best: string | undefined, bd = Infinity;
  for (const n of names) {
    const i = COMPASS16.indexOf(n.slice(n.lastIndexOf("_") + 1));
    if (i < 0) continue;
    const d = Math.abs(((((deg - i * 22.5) % 360) + 540) % 360) - 180);
    if (d < bd - 1e-9) { best = n; bd = d; }
  }
  if (!best) throw new PxError(`heading: '${who}' has no members named by the compass (${who}_n, ${who}_ne, ...): it has ${names.slice(0, 4).join(", ")}${names.length > 4 ? ", ..." : ""}`);
  return best;
}
