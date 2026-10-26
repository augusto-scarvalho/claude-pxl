// A forest warden's axe combo, 48 px tall: idle, a wind-up, a whirling cut that turns the whole body
// round (front, back, front again) with the coat flaring out, a thrust, a second wind-up overhead, a
// turn into a chop to the floor with sparks and dust, and back to idle. The body is a skeleton on the
// 3D layer (rig3d, characters §11), in px: it turns about its upright, the shoulders twist against the
// hips, the knees bend, and its parts are fields along the bones, drawn by surface() as they are turned
// to us, the nearest in front. The axe is its own fields, its head as an axe is made (the edge a long
// curve from toe to heel along the haft); the edge faces the way each cut goes (worked out from the
// motion), and its smear is the path the edge took since the frame before, behind the body where that
// path is. The head modeled, drawn once per view, its faces painted over by hand. On the floor, its
// reflection.
pal({
  k: "#17111c",
  S: "#7d4636", s: "#c47c5a", z: "#eab08a", Z: "#f7cfa8",     // skin
  i: "#2e1d1d", y: "#b05a4c", c: "#e0907a", U: "#f4ece0",     // eyes, mouth, a blush, teeth
  R: "#4a1b1a", r: "#8c3a22", q: "#c4622c", Q: "#e8924c",     // auburn hair
  D: "#16302a", G: "#275240", g: "#3f7a4c", h: "#79a85a",     // the coat
  L: "#4a1e22", l: "#7a3030",                                 // its lining
  F: "#33241c", f: "#5a4232", e: "#86684c", E: "#b89a74",     // fur
  B: "#33201a", b: "#5e3b24", n: "#8e5e34",                   // leather
  T: "#2b2d45", t: "#4c5078",                                 // trousers
  O: "#24160f", o: "#4f3020",                                 // boots
  1: "#333a4a", 2: "#657084", 3: "#a3afc0", 4: "#eef3fa",     // steel
  W: "#3e2414", w: "#7a4d28", m: "#a8743c",                   // the haft
  Y: "#e2b048", u: "#a06a28",                                 // brass
  v: "#fff7e0", j: "#d9b870",                                 // the smear: warm white, a gold edge
  x: "#fffbe8", d: "#8a7d70", p: "#5c534c",                   // sparks, dust
  a: "#262230", A: "#383444",                                 // the floor
})
ramps("kSszZ", "kRrqQ", "kDGgh", "kLl", "kFfeE", "kBbn", "kTt", "kOo", "k1234", "kWwm", "kuY")

// ---- the body, in px over the sole (the stage's: 12 degrees down, the sprite's size, where the ground under the body lands)
const PITCH = (12 * Math.PI) / 180, CP = Math.cos(PITCH), SP = Math.sin(PITCH)
const W = 112, H = 84, OX = 56, OY = 76
const rad = (d) => (d * Math.PI) / 180
const add = (a, b) => a.map((v, i) => v + b[i]), sub = (a, b) => a.map((v, i) => v - b[i])
const mul = (a, k) => a.map((v) => v * k), dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const len = (a) => Math.hypot(...a), unit = (a) => mul(a, 1 / (len(a) || 1))
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const HIP = 22, TORSO = 12, NECK = 6, HIPW = 3, SHW = 6
const THIGH = 10, SHIN = 10, UPPER = 8, FORE = 8, HAFT = 17
// ---- the poses: keys at frames, in between eased. yaw: which way the hips face (90 = right; the cut
// turns it on, so it only grows); twist: the shoulders against the hips; head: the head against the
// shoulders (it leads a turn); lean (deg), crouch (px down); feet [left, right] as [forward, right]
// from the pelvis on the floor; hand: the axe hand from its shoulder, [forward, right, up]; axe: which
// way the haft points from it (the edge's way is worked out from the motion, below); off: the other hand from its
// shoulder; smear: draw what the blade swept since the frame before; spark: the chop's hit
const REST = { look: "calm", yaw: 60, twist: 0, head: 0, lean: 2, crouch: 0, feet: [[-1, -4], [1, 4]], hand: [2, 2, -15], axe: [0.6, 0.15, -1], off: [0, -1, -15] }
const KEYS = [
  { t: 0, ...REST },
  { t: 4 },                                                   // at rest till the wind-up (the stance below)
  // the wind-up: the shoulders coil back, the axe up behind the head, the free hand forward
  { t: 5, look: "grit", twist: -35, head: 25, crouch: 2, lean: 6, hand: [-3, 4, 6], axe: [-0.5, 0.3, 0.8], off: [6, -1, -4] },
  { t: 6, twist: -55, head: 40, crouch: 3, lean: 8, hand: [-5, 5, 8], axe: [-0.6, 0.35, 0.7], off: [8, -1, -2], feet: [[1, -5], [-2, 5]] },
  // the whirl: low, the arm out level, the axe pointing out, its edge leading; the free arm tucked
  { t: 7, look: "shout", yaw: 115, twist: 10, head: 15, crouch: 5, lean: 12, hand: [4, 14, 0], axe: [0.25, 1, 0.05], off: [3, 3, -6], smear: 1 },
  { t: 8, yaw: 185, twist: 25, head: 20, smear: 1 },
  { t: 9, yaw: 255, twist: 25, head: 20, hand: [4, 14, 1], axe: [0.25, 1, 0.1], smear: 1 },
  { t: 10, yaw: 325, twist: 25, head: 15, hand: [5, 14, 3], axe: [0.3, 1, 0.3], smear: 1 },
  // out of the turn, a cut falling across to the front: the arm straight, the weight on the front foot
  { t: 11, yaw: 390, twist: 15, head: 0, crouch: 4, lean: 14, hand: [13, 3, -3], axe: [1, 0.1, -0.45], off: [-3, -2, -8], feet: [[-4, -5], [5, 4]], smear: 1 },
  { t: 12, yaw: 420, twist: 5, crouch: 3, lean: 10, hand: [14, 2, -5], axe: [1, 0.05, -0.55], smear: 0 },
  { t: 13, look: "grit", twist: 0 },
  // the second wind-up: the axe straight up, the body coiled the other way round
  { t: 15, yaw: 400, twist: -45, head: 35, crouch: 1, lean: 2, hand: [-1, 3, 13], axe: [-0.2, 0.15, 1], off: [5, -2, 2], feet: [[1, -5], [-2, 5]] },
  { t: 16, twist: -60, head: 45, crouch: 2 },
  // a turn and the chop: round once, the axe coming over and down into the floor
  { t: 17, look: "shout", yaw: 480, twist: -10, head: 20, crouch: 4, lean: 10, hand: [3, 12, 2], axe: [0.3, 1, 0.1], off: [3, 3, -5], smear: 1 },
  { t: 18, yaw: 560, twist: 15, head: 15, smear: 1 },
  { t: 19, yaw: 640, twist: 20, smear: 1 },
  { t: 20, yaw: 720, twist: 10, head: 10, crouch: 2, lean: 4, hand: [2, 3, 12], axe: [0.4, 0.1, 1] },
  { t: 20.5, yaw: 750, crouch: 4, lean: 12, hand: [9, 3, 6], axe: [1, 0.05, 0.5], smear: 1 },
  { t: 21, yaw: 780, twist: 0, head: 0, crouch: 7, lean: 22, hand: [10, 2, -9], axe: [0.95, 0.05, -0.5], off: [-2, -4, -8], feet: [[-5, -5], [6, 4]], smear: 1, spark: 1 },
  { t: 22, crouch: 7, spark: 2 },
  { t: 23, crouch: 6, spark: 3 },
  // up again, the axe let down to the side
  { t: 25, look: "calm", yaw: 760, crouch: 3, lean: 8, hand: [6, 3, -11], axe: [0.8, 0.2, -0.7], off: [0, -2, -14], feet: [[-2, -5], [3, 4]] },
  { t: 28, yaw: 780, twist: 0, head: 0, crouch: 0, lean: 2, ...{ hand: REST.hand, axe: REST.axe, off: REST.off, feet: REST.feet } },
]
const FRAMES = 34
// The fighting stance at rest, in its beat (a boxer finding his rhythm, about a second a sway): the
// weight going from foot to foot, the body over the planted feet a pixel and a half either way, dipping
// nearly a pixel as it passes the middle (the knees giving), the head a frame behind; all by half pixels
// (subpixel), the legs and feet still. [right, down] in px on screen, at a frame of the loop.
const IDLE = [28, 29, 30, 31, 32, 33, 0, 1, 2, 3, 4]
const stance = (f) => {
  const k = IDLE.indexOf(((f % FRAMES) + FRAMES) % FRAMES)
  if (k < 0) return [0, 0]
  const a = Math.sin((2 * Math.PI * k) / IDLE.length)
  return [1.5 * a, 0.8 * (1 - Math.abs(a))]
}
// each key takes what it doesn't say from the one before; between keys, eased in and out (tween); a
// smear or a spark only on its own frame
const KEYED = tween(KEYS, { moments: ["smear", "spark"] }), poseAt = (t) => KEYED(Math.max(0, Math.min(FRAMES - 1, t)))
// The moments as rig3d's poses (headings by the compass: the hips turned -yaw from facing us, the
// twist and the head the other way round, the free hand the left). The stance's sway moves the body
// over the feet: the feet carried back under it, the figure stamped a whole pixel over.
const pose3 = (t) => {
  const p = poseAt(t), [sx, sy] = stance(t), fx = Math.sin(rad(p.yaw)), rx = -Math.cos(rad(p.yaw))
  return { turn: -p.yaw, twist: -p.twist, head: -p.head, lean: p.lean, down: p.crouch + sy, feet: p.feet.map(([a, b]) => [a - Math.round(sx) * fx, b - Math.round(sx) * rx]), hands: [p.off, p.hand], i: t, look: p.look }
}
// how fast the body turns (deg a frame), and the coat's flare and the hair's swing that follow it a
// frame late (follow(): over the loop, so the first frame already has the last one's)
const SPIN = Array.from({ length: FRAMES }, (_, i) => ((((poseAt(i).yaw - poseAt(i ? i - 1 : FRAMES - 1).yaw + 180) % 360) + 360) % 360) - 180)
const FLARE = follow(SPIN.map((w) => Math.min(1, Math.abs(w) / 70)), { damp: 0.55, peak: true }), TAIL = follow(SPIN, { damp: 0.5 })
const SKIRTL = 12, WAIST = 4.3

// ---- the parts
// the signed distance to a polygon of [t, s] (inside below 0), and to a line through points
const inPoly = (P, u, v) => {
  let d = Infinity, inside = false
  for (let i = 0, k = P.length - 1; i < P.length; k = i++) {
    const [a0, a1] = P[k], [b0, b1] = P[i], e0 = b0 - a0, e1 = b1 - a1, w0 = u - a0, w1 = v - a1, h = Math.max(0, Math.min(1, (w0 * e0 + w1 * e1) / (e0 * e0 + e1 * e1)))
    d = Math.min(d, Math.hypot(w0 - e0 * h, w1 - e1 * h))
    if ((a1 > v) !== (b1 > v) && u < (e0 * (v - a1)) / e1 + a0) inside = !inside
  }
  return inside ? -d : d
}
const along = (P, u, v) => Math.min(...P.slice(1).map(([b0, b1], i) => { const [a0, a1] = P[i], e0 = b0 - a0, e1 = b1 - a1, h = Math.max(0, Math.min(1, ((u - a0) * e0 + (v - a1) * e1) / (e0 * e0 + e1 * e1))); return Math.hypot(u - a0 - e0 * h, v - a1 - e1 * h) }))
// the axe at a moment: the haft from the fist, and the head a slab 1.2 px thick cut to its outline
// (sdf.field): the bit lit, its edge bright from toe to heel, the cheek and the poll darker
const axe3 = (j, p) => {
  const k = skeleton(p.i), A = k.axe, E = k.edge, N = unit(cross(A, E)), h = j.arms[1].hand
  const at = (t, s) => add(h, add(mul(A, t), mul(E, s))), tsw = (q) => { const r = sub(q, h); return [dot(r, A), dot(r, E), dot(r, N)] }
  const pts = [...BIT, ...POLL].map(([t, s]) => at(t, s)), box = (f) => [0, 1, 2].map((e) => f(...pts.map((q) => q[e])))
  const head = sdf.field((x, y, z) => { const [t, s, w] = tsw([x, y, z]); return Math.max(Math.min(inPoly(BIT, t, s), inPoly(POLL, t, s)), Math.abs(w) - 0.6) }, box(Math.min).map((v) => v - 1), box(Math.max).map((v) => v + 1))
    .paint((q) => { const [t, s] = tsw(q); return along(EDGE, t, s) < 0.9 ? "4" : inPoly(POLL, t, s) < 0 ? "12" : inPoly(CHEEK, t, s) < 0 ? "123" : "234" })
  return [sdf.capsule(at(-3, 0), at(HAFT, 0), 0.9).mat("Wwm"), head]
}
// the tail of hair: from behind the head, swinging out with the turn a frame late
const tail3 = (j, p) => {
  const o = poseAt(p.i), lift = Math.min(1, Math.abs(TAIL[p.i]) / 60), ty = rad(o.yaw + o.twist + o.head + 180 - Math.max(-70, Math.min(70, TAIL[p.i] * 0.8)))
  const d = unit([Math.sin(ty) * (0.3 + lift), -Math.cos(ty) * (0.3 + lift), -1 + lift * 0.8]), t0 = sub(j.head, mul(j.hd.f, 3.5)), t1 = add(t0, mul(d, 5)), t2 = add(t1, mul(unit(add(d, [0, 0, -0.6])), 4))
  return [j.limb(t0, t1, 1.5, 1.2, "Rrq"), j.limb(t1, t2, 1.2, 0.6, "Rr")]
}
const parts3 = (j, p) => {
  const tw = rad(p.twist), base = [j.pelvis[0], j.pelvis[1], 0], ell = (A, B, a) => 1 / Math.hypot(Math.cos(a) / B, Math.sin(a) / A)
  const lag = rad(Math.max(-32, Math.min(32, -TAIL[p.i] * 0.4))), fall = rad(8 + 44 * FLARE[p.i]), waist = j.pelvis[2] + 1.5, hem = waist - SKIRTL * Math.cos(fall)
  return {
    // the legs below the coat's hem (above it the skirt holds them, as the first figure's painted halves did)
    ...Object.fromEntries(j.legs.map((L, i) => {
      const top = add(L.knee, mul(sub(L.ankle, L.knee), 0.38)), cuff = add(top, mul(sub(L.ankle, L.knee), 0.14))
      return [`leg${i}`, [sdf.union(sdf.capsule(L.hip, L.knee, 2.2, 1.9), sdf.capsule(L.knee, top, 1.9, 1.8)).intersect(sdf.plane([0, 0, 1], hem)).mat("Ttt"), j.limb(top, cuff, 2.4, 2.3, "Obbn"), j.limb(cuff, L.ankle, 2, 1.8, "Oob"), j.ball(L.foot, [1.8, 2.9, 1.5], (h) => (h < 0.3 ? "O" : "Oob"))]]
    })),
    // the coat's skirt: from the belt it hangs out at an angle that grows with the turn, its hem trailing
    // round behind (its cloth at a was at a + lag down it); pleats; the lapped front edge
    coat: j.sweep(base, hem, waist, (h, a) => WAIST + (1 - h) * SKIRTL * Math.sin(fall) + 0.35 * Math.sin((a + lag * (1 - h)) * 7), { shell: 0.4,
      paint: (h, a, out) => { const th = a + lag * (1 - h); return h < 0.1 ? (out ? "Ffe" : "F") : !out ? "Ll" : Math.abs(th) < 0.12 ? "D" : ((((th * 9) / (2 * Math.PI)) % 1) + 1) % 1 < 0.14 ? "DGg" : "DGgh" } }),
    // the tunic: an ellipse round, turning from the hips at the belt to the shoulders at the top; the belt
    // and its buckle, the front edge with its toggles
    tunic: j.sweep(base, j.pelvis[2] + 2, j.chest[2], (h, a) => ell(4.2 + 2.2 * h, 2.7 + 0.8 * h, a - tw * h * h * (3 - 2 * h)), { shift: (h) => [(j.chest[0] - j.pelvis[0]) * h, (j.chest[1] - j.pelvis[1]) * h],
      paint: (h, a) => { const f = Math.abs(a - tw * h * h * (3 - 2 * h)); return h < 0.16 ? (f < 0.3 && h > 0.03 && h < 0.13 ? "uY" : "Bbn") : f < 0.13 ? (Math.abs(h - 0.33) < 0.04 || Math.abs(h - 0.58) < 0.04 ? "Y" : "D") : "DGgh" } }),
    // the mantle: wider than the shoulders, narrowing to the collar, shorter in front, tufts at its hem
    mantle: j.sweep([j.chest[0], j.chest[1], 0], j.chest[2] - 3.5 * j.spine[2], j.chest[2] + 1.5 * j.spine[2], (h, a) => ell(7.6 - 4.2 * h * h, 4.6 - 1.8 * h * h, a - tw), {
      shift: (h) => [j.spine[0] * (5 * h - 3.5), j.spine[1] * (5 * h - 3.5)], keep: (h, a) => h >= 0.42 * Math.max(0, Math.cos(a - tw)) + 0.25 * hash(Math.floor(((a + Math.PI) / (2 * Math.PI)) * 24), 7),
      paint: (h, a) => (hash(Math.floor(((a + Math.PI) / (2 * Math.PI)) * 36), Math.floor(h * 8)) < 0.3 ? "Ffe" : h > 0.7 ? "FfeE" : "Ffee") }),
    arm0: [j.limb(j.arms[0].sh, j.arms[0].elbow, 2, 1.7, "DGg"), j.limb(j.arms[0].elbow, j.arms[0].hand, 1.7, 1.4, "Bbn"), j.ball(j.arms[0].hand, 1.5, "Ssz")],
    arm1: [j.limb(j.arms[1].sh, j.arms[1].elbow, 2, 1.7, "DGgh"), j.limb(j.arms[1].elbow, j.arms[1].hand, 1.7, 1.4, "Bbn"), j.ball(j.arms[1].hand, 1.5, "Ssz")],
    axe: axe3(j, p),
    tail: tail3(j, p),
    neck: j.limb(j.chest, sub(j.head, [0, 0, 4]), 1.8, 1.7, "Ssz"),
  }
}
// The head modeled: the skull; the auburn hair a cap cut away at the face, locks at the sides to the
// jaw, tousled. Drawn once per view as the figure is lit (every view: the light is from the left), its
// face painted over by hand for each look: calm; the brows down and drawn together over a hard mouth
// when winding up; and a shout, the jaw dropped, in the cut (the first hand heads' faces, "." keeps the
// render's pixel). The tail of hair drawn apart (it swings).
const WSKULL = sdf.ellipsoid([4.7, 5, 6]).mat("SszZ")
const WHAIR = sdf.ellipsoid([5.3, 5.6, 5.4]).at(0, -0.6, 1.4)
  .union(sdf.capsule([-4.7, 0.6, 2], [-4.6, 1.2, -4.4], 1.1, 0.8), sdf.capsule([4.7, 0.6, 2], [4.6, 1.2, -4.4], 1.1, 0.8), { smooth: 0.8 })
  .subtract(sdf.ellipsoid([4.3, 4.8, 5]).at(0, 4.3, -2.6), { smooth: 0.4 }).noise({ amp: 0.45, scale: 1.2, seed: 4 }).mat("RrqQ")
const WFACE3 = {
  calm: {
    s: `
      .............
      .............
      .............
      .............
      .............
      .............
      .............
      ...zzZzzzs...
      ...zizzzis...
      ...zizzzis...
      ...czzzszc...
      ...szzyzzs...`,
    se: `
      .............
      .............
      .............
      .............
      .............
      .............
      .............
      ....SszzZzzz.
      ....Sszizziz.
      ....Sszizziz.
      ....Sczzzscz.
      ....Sszzyzz..`,
    e: `
      ..............
      ..............
      ..............
      ..............
      ..............
      ..............
      ..............
      .....Sszzzzz..
      .....Sszzizz..
      .....Sszzizzz.
      .....SsczzzS..
      .....Sszzyz...`,
    w: `
      ..............
      ..............
      ..............
      ..............
      ..............
      ..............
      ..............
      ..zzzzzsS.....
      ..zzizzsS.....
      ..zzizzsS.....
      ..SzzzcsS.....
      ...zyzzsS.....`,
    sw: `
      .............
      .............
      .............
      .............
      .............
      .............
      .............
      .zzzZzzsS....
      .zizzizsS....
      .zizzizsS....
      .zcszzzcS....
      ..zzyzzsS....`,
  },
  grit: {
    s: `
      .............
      .............
      .............
      .............
      .............
      .............
      .............
      .....zzz.....
      ...ziRzRis...
      ...zizzzis...
      ...czzzszc...
      ...szSSSzs...`,
    se: `
      .............
      .............
      .............
      .............
      .............
      .............
      .............
      ....SszRzRzz.
      ....Sszizziz.
      ....Sszizziz.
      ....Sczzzscz.
      ....SszSSSz..`,
    e: `
      ..............
      ..............
      ..............
      ..............
      ..............
      ..............
      ..............
      .....SszzRzz..
      .....Sszzizz..
      .....Sszzizzz.
      .....SsczzzS..
      .....SszzSS...`,
    w: `
      ..............
      ..............
      ..............
      ..............
      ..............
      ..............
      ..............
      ..zzRzzsS.....
      ..zzizzsS.....
      ..zzizzsS.....
      ..SzzzcsS.....
      ...SSzzsS.....`,
    sw: `
      .............
      .............
      .............
      .............
      .............
      .............
      .............
      .zzRzRzsS....
      .zizzizsS....
      .zizzizsS....
      .zcszzzcS....
      ..zSSSzsS....`,
  },
  shout: {
    s: `
      .............
      .............
      .............
      .............
      .............
      .............
      .............
      .....zzz.....
      ...ziRzRis...
      ...zizzzis...
      ...czzzszc...
      ...sziiizs...`,
    se: `
      .............
      .............
      .............
      .............
      .............
      .............
      .............
      ....SszRzRzz.
      ....Sszizziz.
      ....Sszizziz.
      ....Sczzzscz.
      ....Ssziiiz..`,
    e: `
      ..............
      ..............
      ..............
      ..............
      ..............
      ..............
      ..............
      .....SszzRzz..
      .....Sszzizz..
      .....Sszzizzz.
      .....SsczzzS..
      .....Sszzii...`,
    w: `
      ..............
      ..............
      ..............
      ..............
      ..............
      ..............
      ..............
      ..zzRzzsS.....
      ..zzizzsS.....
      ..zzizzsS.....
      ..SzzzcsS.....
      ...iizzsS.....`,
    sw: `
      .............
      .............
      .............
      .............
      .............
      .............
      .............
      .zzRzRzsS....
      .zizzizsS....
      .zizzizsS....
      .zcszzzcS....
      ..ziiizsS....`,
  },
}
const LIGHT3 = [-0.6, -0.45, 0.65]
for (const look of ["calm", "grit", "shout"]) views(look === "calm" ? "_whead" : `_whead_${look}`, sdf.union(WSKULL, WHAIR), { pitch: 12, light: LIGHT3, ink: "k", surface: { clean: true },
  anchor: { s: [6, 8], se: [6, 8], e: [7, 8], w: [7, 8], sw: [6, 8] }, retouch: WFACE3[look] })
// the head stamped by the look on the head joint; the axe and the tail of hair kept over it where they
// are nearer, a line on the head round them
const stampHead = (c, j, p) => {
  const ids = c.img.parts?.ids, names = c.img.parts?.names ?? [], near = (q) => j.depth(q) > j.depth(j.head), data = c.img.data
  const over = new Set([...(near(j.arms[1].hand) ? ["axe"] : []), ...(near(sub(j.head, mul(j.hd.f, 5))) ? ["tail"] : [])].map((n) => names.indexOf(n)))
  const keep = ids ? [...ids.keys()].filter((i) => over.has(ids[i])) : [], was = keep.map((i) => data[i]), before = data.slice()
  const [x, y] = j.screen(j.head).map(Math.round)
  c.stamp(p.look === "calm" ? "_whead" : `_whead_${p.look}`, x, y, { heading: j.hd.heading })
  const kept = new Set(keep.filter((i, n) => data[i] !== was[n])), ink = c.color("k")
  keep.forEach((i, n) => { data[i] = was[n] })
  for (const i of kept) for (const d of [1, -1, c.img.w, -c.img.w]) if (!kept.has(i + d) && data[i + d] !== before[i + d] && !over.has(ids[i + d])) data[i + d] = ink
}

// ---- the figure: the moves on rig3d, 12 degrees down, lit from the upper left in front
const B3 = { h: 48, hip: HIP, torso: TORSO, neck: NECK, thigh: THIGH, shin: SHIN, upper: UPPER, fore: FORE, ankle: 2, hips: HIPW, shoulders: [0, SHW, -1] }
const R = rig3d("_warden", { body: B3, headings: ["s"], pitch: 12, w: W, h: H, pivot: [OX, OY], light: LIGHT3, ink: "k", surface: { clean: true }, parts: parts3,
  moves: { combo: { frames: FRAMES, ms: 1000 / 11, pose: (i) => pose3(i), draw: stampHead } } })

// The blade's edge always faces the way the cut goes, so it never strikes with the flat or the back
// like a club. Where the axe head cuts (moves fast into a frame with a smear), that is the way it
// moves; held, wound up or let down, it is the way of the nearer cut in time, the one coming or the one
// just made (the wrist doesn't turn the axe between a backswing and its cut); further from any, at rest,
// forward. Then turned square to the haft. (rig3d's frame: y away from us, z up; EYE the way to the eye)
const UP = [0, 0, 1], EYE = [0, -CP, SP]
const STEP = 0.25, CUT = 12, NEAR = 2.5                                    // px a frame: a cut; frames from one
// the fist and the haft's way at a moment (the pose's axe: [forward, right, up] in the shoulders' frame)
const grip = (t) => { const j = R.joints(pose3(t), 180), a = poseAt(t).axe; return { j, hand: j.arms[1].hand, axe: unit(add(add(mul(j.sh.f, a[0]), mul(j.sh.r, a[1])), mul(UP, a[2]))) } }
const WAY = []
for (let i = 0; i < FRAMES / STEP; i++) {
  const t = i * STEP, at = (u) => { const g = grip(u); return add(g.hand, mul(g.axe, 15)) }
  const v = mul(sub(at(t + STEP / 2), at(t - STEP / 2)), 1 / STEP)
  WAY.push({ v, fast: len(v) >= CUT && !!poseAt(Math.ceil(t - 1e-6)).smear })   // a cut leaves a smear; a backswing doesn't
}
const wayAt = (t) => {
  const n = WAY.length, i = ((Math.round(t / STEP) % n) + n) % n
  if (WAY[i].fast) return { v: WAY[i].v, cut: true }
  for (let d = 1; d <= NEAR / STEP; d++) for (const k of [i - d, i + d]) { const w = WAY[((k % n) + n) % n]; if (w.fast) return { v: w.v } }
  return null
}
const skeleton = (t) => {
  // held (wound up, or after a cut), the blade is turned to show its side to us, its edge still on
  // the way the cut goes as we see it; in a cut it turns as the cut does
  const w = wayAt(t), g = grip(t), sf = g.j.sh.f, seen = (v) => (w?.cut ? v : sub(v, mul(EYE, dot(v, EYE))))
  const way = seen(w?.v ?? sf), sq = sub(way, mul(g.axe, dot(way, g.axe))), fall = sub(sf, mul(g.axe, dot(sf, g.axe)))   // the haft along the cut: its forward
  return { ...g, edge: unit(len(sq) > 0.35 * len(way) ? sq : fall) }
}
// a point of the axe: t along the haft from the hand, s along the edge's way
const axeAt = (k, t, s) => add(k.hand, add(mul(k.axe, t), mul(k.edge, s)))
// The head as an axe is made, in 3D on the haft (t along it from the hand, s out to the bit, px): the
// eye round the haft's top; the bit out on the edge's side, its edge a long curve running from the toe
// (its top corner) down to the heel at the tip of the beard, along the haft, not across it; the poll on
// the other side. Turned level in a whirl it shows edge on, as a real one would.
const BIT = [[17.5, 0], [18.6, 3], [19.6, 6.5], [18.4, 8.4], [15.5, 9.1], [12.6, 8.5], [10.3, 6.8], [11.3, 4.9], [13.4, 2.2], [14.5, 0]]
const EDGE = [[19.6, 6.5], [18.4, 8.4], [15.5, 9.1], [12.6, 8.5], [10.3, 6.8]]
const CHEEK = [[17.5, 0], [18.4, 2.6], [13.6, 2.6], [14.5, 0]], POLL = [[17.5, 0], [17.5, -2.6], [14.6, -2.6], [14.6, 0]]

// the blade's path since the frame before: a ribbon from the edge in toward the haft, thin at its tail
// and full at the blade; `side` -1 the stretches behind the body, 1 those in front
function smear(c, f, side) {
  if (!poseAt(f).smear) return
  // from the frame before (a frame and a half into a turn already under way), 24 stretches, the tail third
  // gold; thick across the blade's face, so a level cut leaves a band, not a line seen edge on
  const span = poseAt(f - 1).smear ? 1.6 : 1, mid = R.depth(grip(f).j.chest), scr = R.screen, u = (k) => f - span + (span * k) / 24
  const at = (t) => { const s = skeleton(t); let n = unit(cross(s.axe, s.edge)); if (dot(n, [0, 0.3, -1]) < 0) n = mul(n, -1); return { tip: axeAt(s, 17.5, 5), n, back: mul(s.axe, -1) } }
  // across the path on screen: the blade's face (a level cut) or the haft (a cut seen from its side),
  // whichever stands wider across where the blade is going now
  const last = at(u(24)), go = sub(scr(last.tip), scr(at(u(22)).tip)), gl = Math.hypot(...go) || 1
  const across2 = (v) => Math.abs(go[0] * (scr(v)[1] - scr([0, 0, 0])[1]) - go[1] * (scr(v)[0] - scr([0, 0, 0])[0])) / gl
  const face = across2(mul(last.n, 5)) >= across2(mul(last.back, 7)), seen = (q) => [...scr(q), R.depth(q)]
  // the edge: the tip and a point in from it, widening from the tail; kept on this side of the body
  const edge = (t, k) => { const q = at(t), w = Math.min(1, (2.2 * k) / 24) ** 0.8; return [seen(q.tip), seen(add(q.tip, mul(face ? q.n : q.back, (face ? 5 : 7) * w)))] }
  c.trail(edge, "vvj", { t: f, length: span, step: span / 24, side: (q) => Math.sign(q[2] - mid) === side })
}

// the combo: what the blade swept since the frame before where it ran behind the body, the figure, what
// it swept in front, the chop's sparks and dust
anim("warden_combo", { w: W, h: H, frames: FRAMES, fps: 11, pivot: [OX, OY], facing: "right" },
  layer("smear_back", { outline: false, unlit: true }, (c) => smear(c, c.frame, -1)),
  layer("body", (c) => c.stamp("_warden_combo_s", OX + Math.round(stance(c.frame)[0]), OY, { frame: c.frame })),
  layer("smear", { outline: false, unlit: true }, (c) => {
    smear(c, c.frame, 1)
    const p = poseAt(c.frame)
    if (p.spark) {
      const [gx] = R.screen(axeAt(skeleton(c.frame), 16, 3)).map(Math.round), gy = OY + 1, s = p.spark
      for (const [dx, dy] of [[-4, -3], [3, -5], [6, -2], [-1, -6], [8, -4], [-7, -2]]) c.px(gx + dx * s, gy + dy * s - (s - 1) * 2, s === 1 ? "x" : "j")
      c.ellipse(gx, gy - 1, 3 + s * 3, 1 + s, s === 1 ? "d" : "p")
    }
  }))

// on a polished stone floor: the combo and, under it, its reflection at a quarter's opacity
scene("warden_floor", { w: W, h: 150, bg: "a" },
  rect(0, OY + 1, W, 150 - OY - 1, "A"),
  layer("reflection", { opacity: 0.25 }, stamp("warden_combo", OX, OY + 1, { flip: "y" })),
  layer("warden", stamp("warden_combo", OX, OY + 1)))
