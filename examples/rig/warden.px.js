// A forest warden's axe combo, 48 px tall: idle, a wind-up, a whirling cut that turns the whole body
// round (front, back, front again) with the coat flaring out, a thrust, a second wind-up overhead, a
// turn into a chop to the floor with sparks and dust, and back to idle. The body is a skeleton in 3D,
// in px: it turns about its upright, the shoulders twist against the hips, the knees bend, and each
// part is drawn where the skeleton puts it and as it is turned to us, far to near. The axe's haft is
// drawn in 3D from the fist; its edge always faces the way the cut goes (worked out from the motion),
// and its head is drawn side on, the blade reaching out that way on screen; its smear is the path the
// edge took since the frame before, behind the body where that path is. On the floor, its reflection.
pal({
  k: "#17111c",
  S: "#7d4636", s: "#c47c5a", z: "#eab08a",                   // skin
  R: "#4a1b1a", r: "#8c3a22", q: "#c4622c",                   // auburn hair
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
ramps("kSsz", "kRrq", "kDGgh", "kLl", "kFfeE", "kBbn", "kTt", "kOo", "k1234", "kWwm", "kuY")

// ---- the head by hand, as it is turned to us: front, front 3/4 right, right, back 3/4 right, back;
// facing left are these mirrored. The tail of hair is drawn apart (it swings).
const HEADS = [`
  ..RRRRR..
  .RrqqqrR.
  RrqqqqqrR
  RrrzzzrrR
  RrzzzzzsR
  RszkzkzsR
  RszzzzsSR
  .RszzsSR.
  ..SssS...
  ...SS....`, `
  ..RRRRR...
  .RrqqqqR..
  RrqqqqrrR.
  RrqqrrzzzR
  RrrrSzzzzR
  RrrSzkzzkz
  RrrSszzzzR
  .RrSszzsS.
  ..RSsssS..
  ....SS....`, `
  ..RRRRR...
  .RrqqqqR..
  RrqqqqqrR.
  RrqqqrrzzR
  RrrqrSzzzR
  RrrrSszkzz
  RrrrSszzzR
  .RRrSsszS.
  ..RRSssS..
  ....SSS...`, `
  ..RRRRR...
  .RrqqqqR..
  RrqqqqqrR.
  RrqqqqqrrR
  RrrqqqrrrR
  RrrrqrrrSR
  RRrrrrrRsR
  .RRrrrRSS.
  ..RRRRSS..
  ....SS....`, `
  ..RRRRR..
  .RrqqqrR.
  RrqqqqqrR
  RrqqqqqrR
  RrrqqqrrR
  RrrrqrrrR
  RRrrrrrRR
  .RRrrrRR.
  ..RRRRR..
  ...SSS...`]
HEADS.forEach((g, i) => sprite(`_whead${i}`, { outline: "k", pivot: "center" }, g))

// ---- the camera: px, x to the right, y up, z toward us; a little from above, so a level circle is a
// flat ellipse (the smear of a level cut)
const PITCH = (12 * Math.PI) / 180, CP = Math.cos(PITCH), SP = Math.sin(PITCH)
const W = 112, H = 84, OX = 56, OY = 76                      // the anim's size; where the ground under the body lands
const scr = ([x, y, z]) => [OX + x, OY - y * CP + z * SP]
const depth = ([x, y, z]) => z * CP + y * SP                 // toward us
const LIGHT = [-0.6, -1]                                      // from the upper left, on screen
const rad = (d) => (d * Math.PI) / 180
const add = (a, b) => a.map((v, i) => v + b[i]), sub = (a, b) => a.map((v, i) => v - b[i])
const mul = (a, k) => a.map((v) => v * k), dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const len = (a) => Math.hypot(...a), unit = (a) => mul(a, 1 / (len(a) || 1))
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const lerp = (a, b, t) => (Array.isArray(a) ? a.map((v, i) => v + (b[i] - v) * t) : a + (b - a) * t)
const UP = [0, 1, 0], VIEW = [0, SP, CP]                      // toward the eye
// a frame turned `yaw` degrees from facing us (90: facing right): forward, right, up
const frame3 = (yaw) => { const f = [Math.sin(rad(yaw)), 0, Math.cos(rad(yaw))]; return { f, r: [-f[2], 0, f[0]] } }
const local = (o, fr, [a, b, c]) => add(o, add(add(mul(fr.f, a), mul(fr.r, b)), mul(UP, c)))
// two bones from a reaching for b, the joint pushed toward `hint`
const ik3 = (a, b, l1, l2, hint) => {
  const d = sub(b, a), dl = Math.min(len(d), l1 + l2 - 0.01), u = unit(d)
  const x = (l1 * l1 - l2 * l2 + dl * dl) / (2 * dl), y = Math.sqrt(Math.max(0, l1 * l1 - x * x))
  const side = unit(sub(hint, mul(u, dot(hint, u))))
  return add(add(a, mul(u, x)), mul(side, y))
}

// ---- the body, in px over the sole
const HIP = 22, TORSO = 12, NECK = 6, HIPW = 3, SHW = 6
const THIGH = 10, SHIN = 10, UPPER = 8, FORE = 8, HAFT = 17

// ---- the poses: keys at frames, in between eased. yaw: which way the hips face (90 = right; the cut
// turns it on, so it only grows); twist: the shoulders against the hips; head: the head against the
// shoulders (it leads a turn); lean (deg), crouch (px down); feet [left, right] as [forward, right]
// from the pelvis on the floor; hand: the axe hand from its shoulder, [forward, right, up]; axe: which
// way the haft points from it (the edge's way is worked out from the motion, below); off: the other hand from its
// shoulder; smear: draw what the blade swept since the frame before; spark: the chop's hit
const REST = { yaw: 60, twist: 0, head: 0, lean: 2, crouch: 0, feet: [[-1, -4], [1, 4]], hand: [2, 2, -15], axe: [0.35, 0.15, -1], off: [0, -1, -15] }
const KEYS = [
  { t: 0, ...REST },
  { t: 2, crouch: 1 },
  { t: 4, crouch: 0 },
  // the wind-up: the shoulders coil back, the axe up behind the head, the free hand forward
  { t: 5, twist: -35, head: 25, crouch: 2, lean: 6, hand: [-3, 4, 6], axe: [-0.5, 0.3, 0.8], off: [6, -1, -4] },
  { t: 6, twist: -55, head: 40, crouch: 3, lean: 8, hand: [-5, 5, 8], axe: [-0.6, 0.35, 0.7], off: [8, -1, -2], feet: [[1, -5], [-2, 5]] },
  // the whirl: low, the arm out level, the axe pointing out, its edge leading; the free arm tucked
  { t: 7, yaw: 115, twist: 10, head: 15, crouch: 5, lean: 12, hand: [4, 14, 3], axe: [0.25, 1, 0.3], off: [3, 3, -6], smear: 1 },
  { t: 8, yaw: 185, twist: 25, head: 20, hand: [3, 14, 6], axe: [0.2, 1, 0.5], smear: 1 },
  { t: 9, yaw: 255, twist: 25, head: 20, hand: [4, 14, 1], axe: [0.25, 1, 0.1], smear: 1 },
  { t: 10, yaw: 325, twist: 25, head: 15, hand: [5, 14, -3], axe: [0.3, 1, -0.35], smear: 1 },
  // out of the turn into a thrust: the arm straight forward, the weight on the front foot
  { t: 11, yaw: 390, twist: 15, head: 0, crouch: 4, lean: 14, hand: [13, 3, 1], axe: [1, 0.15, 0.05], off: [-3, -2, -8], feet: [[-4, -5], [5, 4]], smear: 1 },
  { t: 12, yaw: 420, twist: 5, crouch: 3, lean: 10, hand: [14, 2, 0], axe: [1, 0.05, -0.05], smear: 0 },
  { t: 13, twist: 0 },
  // the second wind-up: the axe straight up, the body coiled the other way round
  { t: 15, yaw: 400, twist: -45, head: 35, crouch: 1, lean: 2, hand: [-1, 3, 13], axe: [-0.2, 0.15, 1], off: [5, -2, 2], feet: [[1, -5], [-2, 5]] },
  { t: 16, twist: -60, head: 45, crouch: 2 },
  // a turn and the chop: round once, the axe coming over and down into the floor
  { t: 17, yaw: 480, twist: -10, head: 20, crouch: 4, lean: 10, hand: [3, 12, 4], axe: [0.3, 1, 0.3], off: [3, 3, -5], smear: 1 },
  { t: 18, yaw: 560, twist: 15, head: 15, hand: [3, 12, 7], axe: [0.25, 1, 0.55], smear: 1 },
  { t: 19, yaw: 640, twist: 20, hand: [4, 12, 0], axe: [0.3, 1, -0.2], smear: 1 },
  { t: 20, yaw: 720, twist: 10, head: 10, crouch: 2, lean: 4, hand: [2, 3, 12], axe: [0.4, 0.1, 1], smear: 1 },
  { t: 20.5, yaw: 750, crouch: 4, lean: 12, hand: [9, 3, 6], axe: [1, 0.05, 0.5], smear: 1 },
  { t: 21, yaw: 780, twist: 0, head: 0, crouch: 7, lean: 22, hand: [10, 2, -9], axe: [0.95, 0.05, -0.5], off: [-2, -4, -8], feet: [[-5, -5], [6, 4]], smear: 1, spark: 1 },
  { t: 22, crouch: 7, spark: 2 },
  { t: 23, crouch: 6, spark: 3 },
  // up again, the axe let down to the side
  { t: 25, yaw: 760, crouch: 3, lean: 8, hand: [6, 3, -11], axe: [0.8, 0.2, -0.7], off: [0, -2, -14], feet: [[-2, -5], [3, 4]] },
  { t: 28, yaw: 780, twist: 0, head: 0, crouch: 0, lean: 2, ...{ hand: REST.hand, axe: REST.axe, off: REST.off, feet: REST.feet } },
  { t: 31, crouch: 1 },
  { t: 33, crouch: 0 },
]
const FRAMES = 34
// each key takes what it doesn't say from the one before; between keys, eased in and out
KEYS.forEach((k, i) => { if (i) for (const n in KEYS[i - 1]) if (!(n in k) && n !== "smear" && n !== "spark") k[n] = KEYS[i - 1][n] })
const pose = (t) => {
  t = Math.max(0, Math.min(FRAMES - 1, t))
  let i = KEYS.findIndex((k) => k.t > t)
  if (i < 0) return { ...KEYS[KEYS.length - 1], t }
  const a = KEYS[i - 1], b = KEYS[i], s = (t - a.t) / (b.t - a.t), e = b.t - a.t > 1 ? s * s * (3 - 2 * s) : s
  const p = { t }
  for (const n in b) if (n !== "t" && n !== "smear" && n !== "spark") p[n] = Array.isArray(b[n]) ? b[n].map((v, j) => lerp(a[n][j], v, e)) : lerp(a[n], b[n], e)
  if (t === b.t) { p.smear = b.smear; p.spark = b.spark } else if (t === a.t) { p.smear = a.smear; p.spark = a.spark }
  return p
}
// the joints a pose puts where
const bones = (p) => {
  const hips = frame3(p.yaw), sh = frame3(p.yaw + p.twist), hd = frame3(p.yaw + p.twist + p.head)
  const spine = unit(add(mul(UP, Math.cos(rad(p.lean))), mul(sh.f, Math.sin(rad(p.lean)))))
  const pelvis = [0, HIP - p.crouch, 0], chest = add(pelvis, mul(spine, TORSO))
  const head = add(chest, mul(spine, NECK))
  const legs = [-1, 1].map((sd, i) => {
    const hip = local(pelvis, hips, [0, sd * HIPW, 0]), ankle = local([0, 2, 0], hips, [...p.feet[i], 0])
    const knee = ik3(hip, ankle, THIGH, SHIN, add(hips.f, [0, 0.2, 0]))
    return { hip, knee, ankle, toe: add(ankle, mul(hips.f, 3)) }
  })
  const shoulders = [-1, 1].map((sd) => local(chest, sh, [0, sd * SHW, -1]))
  const hand = local(shoulders[1], sh, p.hand), off = local(shoulders[0], sh, p.off)
  const elbow = ik3(shoulders[1], hand, UPPER, FORE, local([0, 0, 0], sh, [-0.3, 0.6, -1]))
  const offElbow = ik3(shoulders[0], off, UPPER, FORE, local([0, 0, 0], sh, [-0.3, -0.6, -1]))
  const axe = unit(local([0, 0, 0], sh, p.axe))
  return { hips, sh, hd, spine, pelvis, chest, head, legs, shoulders, hand, off, elbow, offElbow, axe }
}
// The blade's edge always faces the way the cut goes, so it never strikes with the flat or the back
// like a club. Where the axe head cuts (moves fast into a frame with a smear), that is the way it
// moves; held, wound up or let
// down, it is the way of the nearer cut in time, the one coming or the one just made (the wrist doesn't
// turn the axe between a backswing and its cut); further from any, at rest, forward. Then turned square
// to the haft.
const STEP = 0.25, CUT = 12, NEAR = 2.5                                    // px a frame: a cut; frames from one
const WAY = []
for (let i = 0; i < FRAMES / STEP; i++) {
  const t = i * STEP, at = (u) => { const j = bones(pose(u)); return add(j.hand, mul(j.axe, 15)) }
  const v = mul(sub(at(t + STEP / 2), at(t - STEP / 2)), 1 / STEP)
  WAY.push({ v, fast: len(v) >= CUT && !!pose(Math.ceil(t - 1e-6)).smear })   // a cut leaves a smear; a backswing doesn't
}
const wayAt = (t) => {
  const n = WAY.length, i = ((Math.round(t / STEP) % n) + n) % n
  if (WAY[i].fast) return WAY[i].v
  for (let d = 1; d <= NEAR / STEP; d++) for (const k of [i - d, i + d]) { const w = WAY[((k % n) + n) % n]; if (w.fast) return w.v }
  return null
}
const skeleton = (p) => {
  const j = bones(p), way = wayAt(p.t) ?? j.sh.f, sq = sub(way, mul(j.axe, dot(way, j.axe)))
  const fall = sub(j.sh.f, mul(j.axe, dot(j.sh.f, j.axe)))                 // the haft along the cut: its forward
  return { ...j, edge: unit(len(sq) > 0.35 * len(way) ? sq : fall) }
}
// a point of the axe: t along the haft from the hand, s along the edge's way
const axeAt = (j, t, s) => add(j.hand, add(mul(j.axe, t), mul(j.edge, s)))
// The head is drawn in profile on screen, whatever way it is turned: along the haft where the camera
// puts it, the blade reaching out the way the edge goes on screen. Seen true, a level cut would show
// the blade edge on, a sliver that says nothing about where it cuts; a pixel artist draws the head
// side on. (t along the haft, s out toward the edge, in px.)
const BLADE = [[11, 0], [16.5, 0], [18, 4], [17.5, 9], [14.5, 8], [12.5, 6], [11, 3]]
const head2 = (j) => {
  const a = scr(axeAt(j, 0, 0)), b = scr(axeAt(j, HAFT, 0)), e = sub(scr(add(axeAt(j, HAFT, 0), j.edge)), b)
  let hd = sub(b, a), hl = Math.hypot(...hd)
  hd = hl > 3 ? mul(hd, 1 / hl) : unit(e)
  let side = [-hd[1], hd[0]]; if (side[0] * e[0] + side[1] * e[1] < 0) side = mul(side, -1)
  if (hl <= 3) hd = [-side[1], side[0]]
  return (t, s) => add(scr(axeAt(j, Math.min(t, HAFT), 0)), add(mul(hd, Math.max(0, t - HAFT)), mul(side, s)))
}

// how fast the body turns (deg a frame), and the coat's flare and the hair's swing that follow it a
// frame late: worked out over the loop twice, so the first frame already has the last one's
const SPIN = [], FLARE = [], TAIL = []
for (let pass = 0, fl = 0, tl = 0; pass < 2; pass++) for (let i = 0; i < FRAMES; i++) {
  const w = ((((pose(i).yaw - pose(i ? i - 1 : FRAMES - 1).yaw + 180) % 360) + 360) % 360) - 180
  fl = Math.max(Math.min(1, Math.abs(w) / 70), fl * 0.55); tl = tl * 0.5 + w * 0.5
  SPIN[i] = w; FLARE[i] = fl; TAIL[i] = tl
}

// ---- painting the parts
const limb = (c, a, b, r0, r1, ramp) => {
  const [x0, y0] = scr(a), [x1, y1] = scr(b)
  c.capsule(x0, y0, r0 + 1, x1, y1, r1 + 1, "k")
  c.capsule(x0, y0, r0, x1, y1, r1, ramp, { light: LIGHT })
}
const poly3 = (c, pts, key) => c.poly(pts.flatMap((q) => scr(q)).map(Math.round), key)
const fist = (c, q, key) => { const [x, y] = scr(q).map(Math.round); c.rect(x - 2, y - 2, 4, 4, "k"); c.rect(x - 1, y - 1, 2, 2, key) }
// a surface sampled point by point: each pixel takes the nearest sample's key, and a pixel round it
// the outline, so the part stands off whatever it's drawn over
const zpaint = (c, sample) => {
  const best = new Map()
  sample((q, key) => {
    if (!key) return
    const [x, y] = scr(q).map(Math.round), d = depth(q), k = y * 4096 + x, b = best.get(k)
    if (!b || d > b[0]) best.set(k, [d, key, x, y])
  })
  for (const [, , x, y] of best.values()) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!best.has((y + dy) * 4096 + x + dx)) c.px(x + dx, y + dy, "k")
  for (const [, key, x, y] of best.values()) c.px(x, y, key)
}
// the light, in the world: from the upper left and in front
const SUN = unit([-0.6, 0.65, 0.45])
const tone = (n, ramp, bias = 0) => { const l = dot(n, SUN) + bias; return ramp[l > 0.55 ? 3 : l > 0.12 ? 2 : l > -0.3 ? 1 : 0] ?? ramp[ramp.length - 1] }

// the tunic from the belt to the shoulders, an ellipse round that turns with the hips at the belt and
// with the shoulders at the top (the twist between them shows); the belt and its buckle, the coat's
// front edge with its toggles, and the fur mantle over the shoulders, its lower edge in tufts
const torso = (c, j, p) => zpaint(c, (emit) => {
  const waist = add(j.pelvis, [0, 2, 0])
  for (let hi = 0; hi <= 24; hi++) {
    const h = hi / 24, center = lerp(waist, j.chest, h), fr = frame3(p.yaw + p.twist * h * h * (3 - 2 * h))
    const a = 4.2 + 2.2 * h, b = 2.7 + 0.8 * h
    for (let ti = 0; ti < 64; ti++) {
      const th = (ti / 64) * Math.PI * 2, cs = Math.cos(th), sn = Math.sin(th), front = Math.abs(Math.atan2(sn, cs))
      const q = add(center, add(mul(fr.f, b * cs), mul(fr.r, a * sn))), n = unit(add(mul(fr.f, cs / b), mul(fr.r, sn / a)))
      let key = tone(n, "DGgh")
      if (h < 0.16) key = front < 0.3 && h > 0.03 && h < 0.13 ? (dot(n, SUN) > 0 ? "Y" : "u") : tone(n, "Bbbn")
      else if (front < 0.13) key = hi === 8 || hi === 14 ? "Y" : "D"
      emit(q, key)
    }
  }
  // the mantle: wider than the shoulders, narrowing to the collar round the neck
  const fr = frame3(p.yaw + p.twist), base = add(j.chest, mul(j.spine, -3.5))
  for (let hi = 0; hi <= 14; hi++) {
    const h = hi / 14, center = add(base, mul(j.spine, 5 * h)), a = 7.6 - 4.2 * h * h, b = 4.6 - 1.8 * h * h
    for (let ti = 0; ti < 72; ti++) {
      const th = (ti / 72) * Math.PI * 2, cs = Math.cos(th), sn = Math.sin(th)
      if (h < 0.42 * Math.max(0, cs) + 0.25 * hash(Math.floor(ti / 3), 7)) continue   // shorter in front; tufts at the hem
      const q = add(center, add(mul(fr.f, b * cs), mul(fr.r, a * sn))), n = unit(add(add(mul(fr.f, cs / b), mul(fr.r, sn / a)), mul(UP, 0.5 + h)))
      emit(add(q, mul(VIEW, 0.6)), tone(n, h > 0.7 ? "FfeE" : "Ffee", (ti + hi) % 3 === 0 ? -0.4 : -0.05))
    }
  }
})

// the coat's skirt, open at the front: from the belt it hangs out at an angle that grows with the turn
// (a frame late), so it flares into a bell, its hem trailing round behind the hips; pleats; inside, the
// lining shows where it turns away from us; fur along the hem, like the collar
const SKIRTL = 12, WAIST = 4.3
const skirt = (c, j, flare, lag) => zpaint(c, (emit) => {
  const w = add(j.pelvis, [0, 1.5, 0]), fall = rad(8 + 44 * flare)
  for (let si = 0; si <= 22; si++) {
    const s = si / 22, open = 0.32 + 0.3 * s
    for (let ti = 0; ti < 96; ti++) {
      const th = (ti / 96) * Math.PI * 2 - Math.PI
      if (Math.abs(th) < open) continue
      const at = th - lag * s, dir = add(mul(j.hips.f, Math.cos(at)), mul(j.hips.r, Math.sin(at)))
      const pleat = Math.sin(th * 7) * 0.45, out = unit(add(dir, mul(cross(UP, dir), pleat)))
      const q = add(w, add(mul(dir, WAIST + s * SKIRTL * Math.sin(fall)), mul(UP, -s * SKIRTL * Math.cos(fall))))
      const n = unit(add(mul(out, Math.cos(fall)), mul(UP, Math.sin(fall))))
      const fold = ((((th * 9) / (2 * Math.PI)) % 1) + 1) % 1 < 0.14 ? -0.4 : 0          // a fold every 40 degrees
      const outside = dot(n, VIEW) > -0.05
      emit(q, si >= 20 ? (outside ? tone(n, "Ffe", (ti % 3 === 0 ? -0.4 : 0)) : "F")               // the fur at the hem
        : outside ? tone(n, "DGgh", fold - 0.2) : tone(mul(n, -1), "LLll", -0.2))
    }
  }
})

anim("warden_combo", { w: W, h: H, frames: FRAMES, fps: 11, pivot: [OX, OY], outline: "k", facing: "right" },
  // what the blade swept since the frame before, where it ran behind the body
  layer("smear_back", { outline: false, unlit: true }, (c) => smear(c, c.frame, -1)),
  layer("body", (c) => {
    const p = pose(c.frame), j = skeleton(p), parts = [], mid = depth(j.chest)
    const at = (d, draw) => parts.push({ d, draw })
    at(mid - 2.5, () => skirt(c, j, FLARE[c.frame], rad(Math.max(-32, Math.min(32, -TAIL[c.frame] * 0.4)))))
    // the legs, the far one first; the near one in the coat's opening
    j.legs.forEach((L) => at(depth(L.knee) - (depth(L.knee) > mid ? -0.2 : 3), () => {
      limb(c, L.hip, L.knee, 2.2, 1.9, "Ttt"); limb(c, L.knee, L.ankle, 1.9, 1.7, "Tt")
      limb(c, lerp(L.knee, L.ankle, 0.45), L.ankle, 2, 1.8, "Oo")
      poly3(c, [add(L.ankle, [0, 1, 0]), add(L.toe, [0, -0.5, 0]), add(L.toe, [0, -2, 0]), add(L.ankle, [0, -2, 0])], "O")
    }))
    at(mid, () => torso(c, j, p))
    // the head as it is turned, and the tail of hair swinging behind it
    const look = (((p.yaw + p.twist + p.head) % 360) + 360) % 360, view = Math.round(look / 45) % 8
    at(depth(j.head) + 1, () => { const [x, y] = scr(j.head).map(Math.round); c.stamp(`_whead${view > 4 ? 8 - view : view}`, x, y, view > 4 ? { flip: "x" } : {}) })
    const tailYaw = rad(p.yaw + p.twist + p.head + 180 - Math.max(-70, Math.min(70, TAIL[c.frame] * 0.8))), lift = Math.min(1, Math.abs(TAIL[c.frame]) / 60)
    const tdir = unit([Math.sin(tailYaw) * (0.3 + lift), -1 + lift * 0.8, Math.cos(tailYaw) * (0.3 + lift)])
    const t0 = local(j.head, j.hd, [-3.5, 0, 0]), t1 = add(t0, mul(tdir, 5)), t2 = add(t1, mul(unit(add(tdir, [0, -0.6, 0])), 4))
    at(depth(t1) - 0.5, () => { limb(c, t0, t1, 1.5, 1.2, "Rrq"); limb(c, t1, t2, 1.2, 0.6, "Rr") })
    // the arms: the free one, and the axe arm with the axe in its fist
    at((depth(j.shoulders[0]) + depth(j.off)) / 2, () => {
      limb(c, j.shoulders[0], j.offElbow, 2, 1.7, "DGg"); limb(c, j.offElbow, j.off, 1.7, 1.4, "Bbn"); fist(c, j.off, "s")
    })
    at((depth(j.shoulders[1]) + depth(j.elbow)) / 2, () => limb(c, j.shoulders[1], j.elbow, 2, 1.7, "DGgh"))
    at(depth(axeAt(j, 9, 2)), () => {
      limb(c, axeAt(j, -3, 0), axeAt(j, HAFT, 0), 0.9, 0.9, "Wwm")
      const at = head2(j), pt = (q) => at(...q).map(Math.round)
      c.poly(BLADE.flatMap(pt), "k")                                                   // its outline, a px out
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) c.poly(BLADE.flatMap((q) => add(pt(q), [dx, dy])), "k")
      c.poly(BLADE.flatMap(pt), "3")
      c.poly([[11, 0], [16.5, 0], [16.5, 2.5], [11, 2.5]].flatMap(pt), "2")             // the cheek by the haft, darker
      const edge = [[18, 4], [17.5, 9], [14.5, 8]].map(pt)
      c.line(...edge[0], ...edge[1], "4"); c.line(...edge[1], ...edge[2], "4")          // the edge, bright
      c.poly([[13, 0], [15.5, 0], [14.5, -3.5]].flatMap(pt), "1")                         // the back spike
    })
    at(Math.max(depth(j.elbow), depth(j.hand)) + 0.2, () => { limb(c, j.elbow, j.hand, 1.7, 1.4, "Bbn"); fist(c, j.hand, "s") })
    parts.sort((a, b) => a.d - b.d).forEach((q) => q.draw())
  }),
  layer("smear", { outline: false, unlit: true }, (c) => {
    smear(c, c.frame, 1)
    const p = pose(c.frame)
    if (p.spark) {
      const j = skeleton(p), [gx] = scr(axeAt(j, 16, 3)).map(Math.round), gy = OY + 1, s = p.spark
      for (const [dx, dy] of [[-4, -3], [3, -5], [6, -2], [-1, -6], [8, -4], [-7, -2]]) c.px(gx + dx * s, gy + dy * s - (s - 1) * 2, s === 1 ? "x" : "j")
      c.ellipse(gx, gy - 1, 3 + s * 3, 1 + s, s === 1 ? "d" : "p")
    }
  }))

// the blade's path since the frame before: a ribbon from the edge in toward the haft, thin at its tail
// and full at the blade; `side` -1 the stretches behind the body, 1 those in front
function smear(c, f, side) {
  if (!pose(f).smear) return
  // from the frame before (a frame and a half into a turn already under way); thick across the blade's
  // face, so a level cut leaves a band, not a line seen edge on
  const N = 24, span = pose(f - 1).smear ? 1.6 : 1, mid = depth(skeleton(pose(f)).chest)
  const wide = (k) => Math.min(1, (2.2 * k) / N) ** 0.8
  const at = (k) => { const j = skeleton(pose(f - span + (span * k) / N)); let n = unit(cross(j.axe, j.edge)); if (dot(n, [0, -1, -0.3]) < 0) n = mul(n, -1); return { tip: axeAt(j, 17.5, 5), n, back: mul(j.axe, -1) } }
  // across the path on screen: the blade's face (a level cut) or the haft (a cut seen from its side),
  // whichever stands wider across where the blade is going now
  const last = at(N), go = sub(scr(last.tip), scr(at(N - 2).tip)), gl = Math.hypot(...go) || 1
  const across2 = (v) => Math.abs(go[0] * (scr(v)[1] - scr([0, 0, 0])[1]) - go[1] * (scr(v)[0] - scr([0, 0, 0])[0])) / gl
  const face = across2(mul(last.n, 5)) >= across2(mul(last.back, 7))
  const path = []
  for (let k = 0; k <= N; k++) { const q = at(k); path.push([q.tip, add(q.tip, mul(face ? q.n : q.back, (face ? 5 : 7) * wide(k)))]) }
  for (let k = 0; k < N; k++) {
    const [o0, i0] = path[k], [o1, i1] = path[k + 1]
    if (Math.sign(depth(lerp(o0, o1, 0.5)) - mid) !== side || Math.hypot(...sub(scr(o1), scr(o0))) < 0.8) continue
    poly3(c, [o0, o1, i1, i0], k > N * 0.3 ? "v" : "j")
  }
}

// on a polished stone floor: the combo and, under it, its reflection at a quarter's opacity
scene("warden_floor", { w: W, h: 150, bg: "a" },
  rect(0, OY + 1, W, 150 - OY - 1, "A"),
  layer("reflection", { opacity: 0.25 }, stamp("warden_combo", OX, OY + 1, { flip: "y" })),
  layer("warden", stamp("warden_combo", OX, OY + 1)))
