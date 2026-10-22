// An HD-2D traveler in the 8 directions Octopath's figures turn to, walking and idle; built as
// rig/warden.px.js is: a skeleton in 3D, in px (characters §11), its parts painted where the skeleton
// puts them and as they are turned to us, nearest wins, each with its outline; the head drawn by hand
// in 5 views (front, front 3/4, profile, back 3/4, back), the other three mirrored. Measured on 16
// games' field sprites (characters §6, §10): 34 px tall, the head 11 rows (a third: Olberic's; more
// reads as a big head), a body like a little barrel (the waist about as wide as the chest,
// the arms slim and close along it, the hands at the crotch: shoulders broad over a narrow waist read
// as a body-builder); the same rows for the head, shoulders, hands, crotch and soles in every view. Lit from above
// and toward us, so a mirrored view keeps its light. Step 1 was the same skeleton as flat blocks, the
// motion judged before anything was painted (characters §4). The mourner is the same figure recolored.
pal({
  k: "#1c1418",                                                   // outline
  L: "#fde6c6", S: "#f0c79e", s: "#d2966f", z: "#9c5b45",         // skin, its lightest only on the nose
  Y: "#c9934f", h: "#7d4a2a", j: "#4a2716", J: "#24110b",         // chestnut hair
  E: "#1f2f55", e: "#3a6aa2", G: "#f4f0e6",                       // the iris (navy, lighter under), the eye's white
  C: "#77a068", c: "#4c7652", n: "#30503d", N: "#1c2e27",         // a green travel cloak
  W: "#d8c69e", w: "#a68f6c", v: "#6f5c4a",                       // linen
  p: "#66637a", P: "#423f53", R: "#2e2b3c",                       // trousers
  l: "#83542f", d: "#4b2e1e", D: "#2e1a10", g: "#f0cc62",         // leather: boots, belt; a buckle
})
ramps("kzsSL", "kJjhY", "kNncC", "kvwW", "kRPp", "kDdl")
// in a block: its names stay its own when a scene includes the file
{
// ---------------------------------------------------------------- the heads, by hand
// 11 rows, the same hair in every view (spiky at the top, tufts lit a pixel or two over its dark, as
// the faces already approved for the diagonals have it; those are 16 wide, a few rows of hair taken off
// their top, the face as it was); front, profile and back 15 wide (odd: the middle column on the
// body's), lit from above: front, the face's lower 6 rows under a fringe, 2x2 eyes (the dark lid over the white
// outside and the iris inside), 3 px between the irises, the nose the skin's lightest pixel, a pixel
// of mouth in the chin row; front 3/4 (down and to the left), the face on the leading side, the far eye
// a pixel at its edge, the ear past the near eye's white; profile (left), the eye 1 px behind the face's
// edge (the iris in front, the white behind), a nose of a pixel past it, the ear just behind the head's
// middle; back 3/4 and back, all hair, lit at the crown, darkest at the nape, an ear's sliver.
const HEADS = {
  s: `
  ....JY.Y.YJ....
  ..JYjhYjYhjYJ..
  .JYjhjjYjjhjYJ.
  JjhYjhjYjhjYhjJ
  JjhSjhSSShjShjJ
  JjSSSSSSSSSSSjJ
  JjSSkkSSSkkSSjJ
  JjSSGESSSEGSSjJ
  .JsSSSSLSSSSsJ.
  ..JsSSSzSSSsJ..
  ....JJsssJJ....`,
  sw: `
  .....JY.YJ......
  ..JYjhYjhjYjJjJ.
  .JYjhjjYjjhjjYjJ
  .JjhYjhjYjjhjJjJ
  .JjhSjhSSjjhjjJ.
  .jjSSSSSSjhjjYjJ
  ..hSkSSkkjhjjjJ.
  ..jSESSEGjsjjJ..
  ..JSSLLeSjzjJ...
  ...JSSzSsjjJ....
  ....JsssjJ......`,
  w: `
  .....JY.YJ.....
  ...JYjhYjhjYJ..
  ..JYjhjjYjjhjYJ
  .JjhYjhjYjjhjJJ
  jhShjhSjhjjhYjJ
  .SSSSSjhjjjhjjJ
  .SkkSSsjjjjjjJ.
  .SEGSSzjjjjjJ..
  SLSSSsjjjjjJ...
  .zSSsjjjjJ.....
  ..JzsJJJJ......`,
  nw: `
  .....JY.YJ......
  ..JYjYYjhYjjJjJ.
  .JYjYhjYjhjjjjjJ
  .JjYhjhjjhjjjjjJ
  .JjhjjhjjjjhjjjJ
  .JhjjhjjjhjjjjJ.
  .Jsjjhjjjjhjjjj.
  .Jzjjjjjjjjjjj..
  ..JzJjjJjjJjjJ..
  ..JzJJjJJjJJjJ..
  ...JJ.JJ.JJ.J...`,
  n: `
  ....JY.Y.YJ....
  ..JYjhYjYhjYJ..
  .JYjhjjYjjhjYJ.
  JjhYjhjYjhjYhjJ
  JjYhjYjhjYjhYjJ
  JjhjYjhjhjYjhjJ
  JjjhjjhjhjjhjjJ
  sJjjhjjjjjhjjJs
  zJjjjjhjhjjjjJz
  .JJjjjjjjjjjJJ.
  ...JJjJjJjJJ...`,
}
for (const [v, g] of Object.entries(HEADS)) sprite(`_tr_head_${v}`, g)
const GRID = Object.fromEntries(Object.entries(HEADS).map(([v, g]) => [v, g.trim().split("\n").map((r) => r.trim())]))
const HEADX = { s: -7, n: -7, w: -5, sw: -8, nw: -8 }

// ---------------------------------------------------------------- the skeleton
// the camera: px, x right, y up, z toward us; 20 degrees down (a field sprite, nearly level)
const PITCH = (20 * Math.PI) / 180, CP = Math.cos(PITCH), SP = Math.sin(PITCH)
const W = 26, H = 40, OX = 13, OY = 38
const scr = ([x, y, z]) => [OX + x, OY - y * CP + z * SP]
const depth = ([x, y, z]) => z * CP + y * SP
const rad = (d) => (d * Math.PI) / 180
const add = (a, b) => a.map((v, i) => v + b[i]), sub = (a, b) => a.map((v, i) => v - b[i])
const mul = (a, k) => a.map((v) => v * k), dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const len = (a) => Math.hypot(...a), unit = (a) => mul(a, 1 / (len(a) || 1))
const UP = [0, 1, 0], SUN = unit([0, 0.75, 0.6])   // from above, toward us: a mirrored view keeps it where it is
const frame3 = (yaw) => { const f = [Math.sin(rad(yaw)), 0, Math.cos(rad(yaw))]; return { f, r: [-f[2], 0, f[0]] } }
const local = (o, fr, [a, b, c]) => add(o, add(add(mul(fr.f, a), mul(fr.r, b)), mul(UP, c)))
const ik3 = (a, b, l1, l2, hint) => {
  const d = sub(b, a), dl = Math.min(len(d), l1 + l2 - 0.01), u = unit(d)
  const x = (l1 * l1 - l2 * l2 + dl * dl) / (2 * dl), y = Math.sqrt(Math.max(0, l1 * l1 - x * x))
  const side = unit(sub(hint, mul(u, dot(hint, u))))
  return add(add(a, mul(u, x)), mul(side, y))
}
// the body in px over the sole: the head 11 rows, the shoulders under it, the torso 10 to the crotch,
// the legs about a third of the height
const HIP = 11.5, TORSO = 10, NECK = 1.6, HEADR = 5.5, HIPW = 2, SHW = 3.7
const THIGH = 5.3, SHIN = 5, UPPER = 3.4, FORE = 3.2, CLOAK = 13   // the cloak from the shoulders to mid-thigh

// ---------------------------------------------------------------- the moves
// Walking, 8 frames at 110 ms, by the view (characters §10): facing us or away, the feet step in their
// own columns, the lifted one up 1, 3, 1 px while the other stays planted, the hand across from it
// coming forward and up, the body down a pixel at each contact; in profile, the stride long (14-16 px
// toe to heel), the foot lifted as it swings through, the body a 2 px triangle (lowest at the contacts),
// the hands forward and back past the body; on the diagonals, between the two. Idle: a breath.
const FRONT = { lift: [[0, 0, 0, 0, 0, 1, 3, 1], [0, 1, 3, 1, 0, 0, 0, 0]], down: [1, 0, 0, 0, 1, 0, 0, 0] }
const walk = (i, yaw) => {
  const ph = (2 * Math.PI * i) / 8, sn = Math.sin(ph), cs = Math.cos(ph), a = Math.abs(Math.sin(rad(yaw)))
  if (a < 0.1) {   // facing us or away
    const up = (k) => FRONT.lift[k][i] * 1.07, fwd = [up(0) > 0 ? 1 : 0, up(1) > 0 ? 1 : 0]
    return { feet: [[0.6 * sn, -HIPW], [-0.6 * sn, HIPW]], lift: [up(0), up(1)], down: FRONT.down[i], lean: 2, trail: 0.4, sway: sn,
      hands: [fwd[1] ? [0.8, -0.8, -5.6] : [-0.5, -0.8, -7], fwd[0] ? [0.8, 0.8, -5.6] : [-0.5, 0.8, -7]] }
  }
  const stride = a > 0.9 ? 4.6 : 3.4, lift = a > 0.9 ? 2.5 : 1.8, hand = (s) => (s > 0 ? [4.4 * s, 0, -7 + 1.4 * s] : [3.6 * s, 0, -7 - 0.3 * s])
  const hl = hand(-sn), hr = hand(sn)
  return { feet: [[stride * sn, -HIPW], [-stride * sn, HIPW]], lift: [lift * Math.max(0, cs), lift * Math.max(0, -cs)],
    down: [0, 1, 2, 1, 0, 1, 2, 1][i] * (a > 0.9 ? 1 : 0.6), lean: 4, trail: 1 + 0.3 * Math.abs(Math.sin(ph - 0.8)), sway: Math.sin(ph - 0.8) * (1 - a),
    hands: [[hl[0], -0.8 + 0.6 * a, hl[2]], [hr[0], 0.8 - 0.6 * a, hr[2]]] }
}
const idle = (i) => ({ feet: [[0, -HIPW - 0.3], [0, HIPW + 0.3]], lift: [0, 0], down: [0, 1, 1, 0][i], lean: 1, trail: 0.15, sway: 0,
  hands: [[0, -0.8, -7], [0, 0.8, -7]] })
const MOVES = { walk: { ms: 110, frames: 8, f: walk }, idle: { ms: 250, frames: 4, f: idle } }

const bones = (p, yaw) => {
  const fr = frame3(yaw), spine = unit(add(mul(UP, Math.cos(rad(p.lean))), mul(fr.f, Math.sin(rad(p.lean)))))
  const pelvis = [0, HIP - p.down, 0], chest = add(pelvis, mul(spine, TORSO)), head = add(chest, mul(spine, NECK + HEADR))
  const legs = [0, 1].map((i) => {
    const hip = local(pelvis, fr, [0, i ? HIPW : -HIPW, 0]), ankle = local([0, 1.2 + p.lift[i], 0], fr, [...p.feet[i], 0])
    return { hip, ankle, knee: ik3(hip, ankle, THIGH, SHIN, add(fr.f, [0, 0.3, 0])) }
  })
  const arms = [0, 1].map((i) => {
    const sh = local(chest, fr, [0, i ? SHW : -SHW, -1]), hand = local(sh, fr, p.hands[i])
    return { sh, hand, elbow: ik3(sh, hand, UPPER, FORE, local([0, 0, 0], fr, [-0.4, i ? 0.5 : -0.5, -1])) }
  })
  return { fr, spine, pelvis, chest, head, legs, arms }
}

// ---------------------------------------------------------------- painting the parts
// every surface sampled into one z-buffer (the nearest point wins its pixel), toned along its ramp by
// how it faces the light; an outline round each part on what is next to it: nothing, or another part
// lying behind it (painted after the colors, so it stays)
const surface = (best, q, n, ramp, part, key) => {
  const [x, y] = scr(q).map(Math.round), d = depth(q), k = y * 4096 + x, b = best.get(k)
  const t = (dot(n, SUN) + 0.55) / 1.3, c = key ?? ramp[Math.max(0, Math.min(ramp.length - 1, Math.round(t * (ramp.length - 1))))]
  if (!b || d > b[0]) best.set(k, [d, c, x, y, part])
}
const tube = (best, a, b, r0, r1, ramp, part, rampOf) => {
  const d = sub(b, a), u = unit(d), e1 = unit(Math.abs(u[1]) < 0.9 ? [u[2], 0, -u[0]] : [1, 0, 0])
  const e2 = [u[1] * e1[2] - u[2] * e1[1], u[2] * e1[0] - u[0] * e1[2], u[0] * e1[1] - u[1] * e1[0]]
  for (let t = -0.15; t <= 1.15; t += 0.04) for (let k = 0; k < 24; k++) {
    const tc = Math.min(1, Math.max(0, t)), a2 = (k / 24) * Math.PI * 2, n = add(mul(e1, Math.cos(a2)), mul(e2, Math.sin(a2)))
    surface(best, add(add(a, mul(d, tc)), mul(n, r0 + (r1 - r0) * tc)), n, rampOf ? rampOf(tc) : ramp, part)
  }
}
const ball = (best, c, fr, rx, ry, rz, ramp, part) => {
  for (let i = 0; i <= 16; i++) for (let k = 0; k < 28; k++) {
    const th = (i / 16) * Math.PI, ph = (k / 28) * Math.PI * 2, o = [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)]
    const n = add(add(mul(fr.r, o[0]), mul(UP, o[1])), mul(fr.f, o[2]))
    surface(best, add(c, add(add(mul(fr.r, o[0] * rx), mul(UP, o[1] * ry)), mul(fr.f, o[2] * rz))), n, ramp, part)
  }
}
// a ring-swept surface round an upright axis from y0 up to y1: `radius(h, a)` at height h (0..1) and
// angle a (0 = the way he faces), `paint(h, a, outside)` its key or ramp, `keep(h, a)` which of it there
// is, `shift(h)` how far that height of it is carried off the axis
const sweep = (best, base, fr, y0, y1, radius, paint, part, keep = () => true, shift = () => [0, 0, 0]) => {
  for (let hi = 0; hi <= 24; hi++) for (let ti = 0; ti < 72; ti++) {
    const h = hi / 24, a = (ti / 72) * Math.PI * 2 - Math.PI
    if (!keep(h, a)) continue
    const dir = add(mul(fr.f, Math.cos(a)), mul(fr.r, Math.sin(a)))
    const q = add(add(add(base, mul(UP, y0 + (y1 - y0) * h)), mul(dir, radius(h, a))), shift(h))
    const outside = dot(dir, [0, SP, CP]) > -0.05, pt = paint(h, a, outside)
    surface(best, q, outside ? dir : mul(dir, -1), pt, part, pt.length === 1 ? pt : undefined)
  }
}
const figure = (c, set, p, yaw, mirror) => {
  const j = bones(p, yaw), best = new Map(), fr = j.fr
  // the limb on the side away from us a step darker
  const farLeg = depth(j.legs[0].hip) < depth(j.legs[1].hip) ? 0 : 1, farArm = depth(j.arms[0].sh) < depth(j.arms[1].sh) ? 0 : 1
  // the legs: trousers to mid-shin, then the boot, and the foot pointing ahead
  j.legs.forEach((L, i) => {
    const far = i === farLeg, tr = far ? "RRP" : "RPp", bt = far ? "DDd" : "Ddl"
    tube(best, L.hip, L.knee, 1.6, 1.5, tr, "leg" + i)
    tube(best, L.knee, L.ankle, 1.5, 1.4, null, "leg" + i, (t) => (t < 0.45 ? tr : bt))
    ball(best, add(L.ankle, mul(fr.f, 1.1)), fr, 1.6, 1.1, 2.3, bt, "leg" + i)
  })
  // the cloak, behind him: hung from the shoulders (it rises, falls and leans with him), an ellipse a
  // little wider than deep, flaring to mid-thigh, open in front; walking, it trails behind, more toward
  // the hem, and swings aside with each step a little after the legs; its inside in its darkest tone
  const top = j.chest[1] + 0.6
  sweep(best, [j.chest[0], 0, j.chest[2]], fr, top - CLOAK, top,
    (h, a) => { const s = Math.abs(Math.sin(a)); return (3.9 + 1.2 * (1 - h)) * (1 - s) + (4.4 + 1.4 * (1 - h)) * s + 0.2 * Math.sin(a * 7) * (1 - h) },
    (h, a, out) => (out ? "NncC" : "N"), "cloak", (h, a) => Math.abs(a) > 1.35,
    (h) => { const down = 1 - h; return add(mul(fr.f, -(0.3 + 1.1 * p.trail) * down), mul(fr.r, 0.9 * p.sway * down ** 1.5)) })
  // the tunic: its short skirt flaring a little below the belt; from the belt up, round, a little deeper
  // at the sides; the belt and its buckle in front
  const waist = j.pelvis[1] + 1.4, base = [j.pelvis[0], 0, j.pelvis[2]]
  sweep(best, base, fr, waist - 2.4, waist, (h) => 3.6 + 0.6 * (1 - h), (h, a, out) => (out ? "vwW" : "v"), "tunic")
  sweep(best, base, fr, waist, j.chest[1] + 0.5, (h, a) => (4 - 0.5 * h * h) * (0.84 + 0.16 * Math.abs(Math.sin(a))),
    (h, a) => (h < 0.1 ? (Math.abs(a) < 0.3 ? "g" : "Ddl") : "vwW"), "tunic")
  // the arms: linen sleeves, the hands
  j.arms.forEach((A, i) => {
    const far = i === farArm
    tube(best, A.sh, A.elbow, 1.1, 1, far ? "vvw" : "vwW", "arm" + i)
    tube(best, A.elbow, A.hand, 1, 0.9, far ? "vvw" : "vwW", "arm" + i)
    ball(best, A.hand, fr, 1, 1, 1, far ? "zzs" : "zsS", "arm" + i)
  })
  const inner = new Set()
  for (const [d0, , x, y, part] of best.values()) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const k = (y + dy) * 4096 + x + dx, o = best.get(k)
    if (!o) c.px(x + dx, y + dy, "k")
    else if (o[4] !== part && o[0] < d0 - 0.5) inner.add(k)
  }
  for (const [, key, x, y] of best.values()) c.px(x, y, key)
  for (const k of inner) c.px(k % 4096, Math.floor(k / 4096), "k")
  // the head over all, by hand, its middle row on the skeleton's head (the profile's 2 px back, so the
  // face doesn't jut ahead of the body); under it, where it meets the body, a line of dark brown (the
  // chin's and the nape's edge), so the face and the clothes don't run together
  const [hx, hy] = scr(j.head).map(Math.round), v = HEADVIEW[yaw], g = GRID[v], w = g[0].length
  const x0 = hx + HEADX[v], x = mirror ? 2 * hx - x0 - (w - 1) : x0, y = hy - 5
  c.stamp(`${set}_head_${v}`, x, y, mirror ? { flip: "x" } : {})
  for (let col = 0; col < w; col++) {
    let r = g.length - 1
    while (r >= 0 && g[r][col] === ".") r--
    const X = x + (mirror ? w - 1 - col : col)
    if (r >= 0 && c.get(X, y + r + 1)) c.px(X, y + r + 1, "D")
  }
}
// 8 directions: the left ones drawn, the right ones their mirrors
const DIRS = { s: [0, "s"], sw: [-45, "sw"], w: [-90, "w"], nw: [-135, "nw"], n: [180, "n"], ne: [135, "nw"], e: [90, "w"], se: [45, "sw"] }
const HEADVIEW = Object.fromEntries(Object.values(DIRS).map(([yaw, v]) => [yaw, v]))
// The mourner: grey hair, a shawl of dark violet, grey linen.
const MOURNER = {
  Y: "#bdb8ae", h: "#8f8a84", j: "#625e5c", J: "#383536",
  C: "#7a6c8c", c: "#56496a", n: "#3a3150", N: "#231d33", W: "#a8a196", w: "#7f786f", v: "#58534e",
}
for (const v of Object.keys(HEADS)) sprite(`_mo_head_${v}`, { base: `_tr_head_${v}`, swap: MOURNER })
for (const [who, set] of [["tr", "_tr"], ["mo", "_mo"]]) for (const [move, M] of Object.entries(MOVES)) for (const [d, [yaw]] of Object.entries(DIRS)) {
  const mirror = yaw > 0 && yaw < 180
  anim(`${who}_${move}_${d}`, { w: W, h: H, pivot: [OX, OY], ...(who === "mo" ? { swap: MOURNER } : {}) },
    (c) => figure(c, set, M.f(c.frame, yaw), yaw, mirror), ...Array.from({ length: M.frames }, () => frame({ ms: M.ms })), bump("hybrid"))
}
sheet("traveler", ["tr_*", "mo_*"], { rows: "tag", pad: 1 })
}
