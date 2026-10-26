// An HD-2D traveler in the 8 directions Octopath's figures turn to, walking, idle, kneeling and casting,
// drawn in 3D (rig3d, characters §11): a skeleton in px, its parts fields along the bones painted as
// his outfit is, the head modeled too (the skull and the hair as fields, the eyes, nose and mouth drawn
// by hand on it), a line all round. Measured on 16 games' field sprites (characters §6, §10): 34 px
// tall, the head 11 rows (a third: Olberic's; more reads as a big head), a body like a little barrel
// (the waist about as wide as the chest, the arms slim and close along it, the hands at the crotch:
// shoulders broad over a narrow waist read as a body-builder); the same rows for the head, shoulders,
// hands, crotch and soles in every view. Lit from above and toward us, so a mirrored view keeps its
// light. Each move was judged first as flat blocks (bk_<move>_<dir>, characters §4). The mourner is
// the same figure, her hair her own.
pal({
  k: "#1c1418",                                                   // outline
  L: "#fde6c6", S: "#f0c79e", s: "#d2966f", z: "#9c5b45",         // skin, its lightest only on the nose
  Y: "#c9934f", H: "#a56c3a", h: "#7d4a2a", j: "#4a2716", J: "#24110b",   // chestnut hair
  E: "#1f2f55", e: "#3a6aa2", G: "#f4f0e6",                       // the iris (navy, lighter under), the eye's white
  C: "#77a068", c: "#4c7652", n: "#30503d", N: "#1c2e27",         // a green travel cloak
  W: "#d8c69e", w: "#a68f6c", v: "#6f5c4a",                       // linen
  p: "#66637a", P: "#423f53", R: "#2e2b3c",                       // trousers
  l: "#83542f", d: "#4b2e1e", D: "#2e1a10", g: "#f0cc62",         // leather: boots, belt; a buckle
})
ramps("kzsSL", "kJjhHY", "kNncC", "kvwW", "kRPp", "kDdl")
// the first engine (a skeleton, its moves, a painter of tubes and balls), for crew.px.js until its
// people are dressed on rig3d too
const travelerRig = {}
// in a block: its names stay its own when a scene includes the file
{
// ---------------------------------------------------------------- the heads, by hand
// (His head is modeled now, below; these stay as the crew's measure: their heads are held to these rows.)
// 11 rows. One haircut seen from each side (characters §5, hair): short and tousled, parted just left
// of the middle as we see it, a 2 px tuft on one side of the parting and a 4 px lobe on the other, each
// lobe lit by a pair of short strokes along its strands (an arc over the crown, not dots), the top edge
// in the hair's dark and not the outline's black, the darkest at the nape; three locks of fringe ending
// on the brow, side locks 2-3 px wide hanging to the jaw, so the face is narrower than the hair and the
// jaw closes the shape (no ball); in profile a forelock over the brow and the back flicking out, from
// behind the mass narrowing to points at the nape. The diagonals keep the faces already approved (16
// wide); front, profile and back are 15 wide (odd: the middle column on the body's). Lit from above: front, the face's lower 6 rows under a fringe, 2x2 eyes (the dark lid over the white
// outside and the iris inside), 3 px between the irises, the nose the skin's lightest pixel, a pixel
// of mouth in the chin row; front 3/4 (down and to the left), the face on the leading side, the far eye
// a pixel at its edge, the ear past the near eye's white; profile (left), the eye 1 px behind the face's
// edge (the iris in front, the white behind), a nose of a pixel past it, the ear just behind the head's
// middle; back 3/4 and back, all hair, lit at the crown, darkest at the nape, an ear's sliver.
const HEADS = {
  s: `
  .....jh.jhhj...
  ...jhHYjhYHj...
  ..jhHYHhjHYHj..
  .jhHHhhhjHHhhj.
  .JhhhjhHhjhhhJ.
  JhhjSShhjSSjhhJ
  JjjSkkSSSkkSjjJ
  .JjSGESSSEGSjJ.
  .JjsSSSLSSSsjJ.
  ..jJsSSzSSsJj..
  .....JsssJ.....`,
  sw: `
  ......jh.jhhj...
  ....jhHYjhYHj...
  ...jhHYHhjHYHhj.
  ..jhHHhjhhHHhhjJ
  .jhhSjhSShjhhhjJ
  .jjSSSSSShjhjjhJ
  ..hSkSSkkjhjjjJ.
  ..jSESSEGjsjhjJ.
  ..JSSLLeSjzjjJ..
  ...JSSzSsjjJjJ..
  ....JsssjJ......`,
  w: `
  .......jh......
  .....jhHYhj....
  ...jhHYHHhhj...
  ..jhHHhhhjhhj..
  .jhhhhjhhhjhhjJ
  jhSSShhjhhhjhhJ
  .SkkSSsjhhjjjJ.
  .SEGSSzjjhjjjJ.
  SLSSSsjjjjjjjJ.
  .zSSsJjjjJjjJ..
  ..JzsJ.JJ.JJ...`,
  nw: `
  .....jhhj.jh....
  ....jhHYHYHhj...
  ...jhHYHjHYHhj..
  ..jhHHYhjhYHHhj.
  .jhhhHHhhhHHhhjJ
  .JjhhhhhhhhhhjjJ
  .Jsjhhjhhhjhhjj.
  .Jzjjhjjjhjjjj..
  ..JzjjjjhjjjJ...
  ..JzJjjJjjJjJ...
  ...JJ.zJjJz.....`,
  n: `
  ...jhhj.hj.....
  ...jhHYHYHhj...
  ..jhHYHjHYHhj..
  .jhHHYhjhYHHhj.
  .JhhHHhhhHHhhJ.
  JhjhhhhhhhhhjjJ
  JjjhhjhhhjhhjjJ
  .sJjhhjjjhhjJs.
  .zJjjjjhjjjjJz.
  ...JjjJjJjjJ...
  .....zJjJz.....`,
}
// each view's pixel on the skeleton's head (the profile's 2 px back, so the face doesn't jut ahead of
// the body); the right-hand views their mirrors (views())
const ANCHOR = { s: [7, 5], sw: [8, 5], w: [5, 5], nw: [8, 5], n: [7, 5] }
views("_tr_head", HEADS, { anchor: ANCHOR })

// ---------------------------------------------------------------- the skeleton
// the camera: px, x right, y up, z toward us; 20 degrees down (a field sprite, nearly level)
const PITCH = (20 * Math.PI) / 180, CP = Math.cos(PITCH), SP = Math.sin(PITCH)
const W = 26, H = 40, OX = 13, OY = 38
const scr = ([x, y, z]) => [OX + x, OY - y * CP + z * SP]
const depth = ([x, y, z]) => z * CP + y * SP
const rad = (d) => (d * Math.PI) / 180
// 3D vectors, written out: a figure samples its surfaces some 100,000 times a frame
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const len = (a) => Math.hypot(a[0], a[1], a[2]), unit = (a) => mul(a, 1 / (len(a) || 1))
const UP = [0, 1, 0], SUN = unit([0, 0.75, 0.6])   // from above, toward us: a mirrored view keeps it where it is
const frame3 = (yaw) => { const f = [Math.sin(rad(yaw)), 0, Math.cos(rad(yaw))]; return { f, r: [-f[2], 0, f[0]] } }
const local = (o, fr, [a, b, c]) => add(o, add(add(mul(fr.f, a), mul(fr.r, b)), mul(UP, c)))
// the body in px over the sole: the head 11 rows, the shoulders under it, the torso 10 to the crotch,
// the legs about a third of the height
const HIP = 11.5, TORSO = 10, NECK = 1.6, HEADR = 5.5, HIPW = 2, SHW = 4.3
const THIGH = 5.3, SHIN = 5, UPPER = 3.4, FORE = 3.2, CLOAK = 13   // the cloak from the shoulders to mid-thigh

// ---------------------------------------------------------------- the moves
// Walking, 8 frames at 110 ms, by the view (characters §10, gait()): facing us or away, the feet step in
// their own columns, the lifted one up 1, 3, 1 px while the other stays planted, the hand across from
// it coming forward and up, the body down a pixel at each contact; in profile, the stride long (14-16
// px toe to heel), the foot lifted as it swings through, the body a 2 px triangle (lowest at the
// contacts), the hands forward and back past the body; on the diagonals, between the two. Facing us
// the lift a little more, so it shows its pixels through the camera's tilt; on the diagonals the body
// dips 0.6 of the profile's. The body leans, the cloak trails and sways by the view. Idle: a breath.
const GAIT_TR = { front: { lift: [0, 0, 0, 0, 0, 1, 3, 1].map((v) => v * 1.07) }, diagonal: { bob: [0, 1, 2, 1, 0, 1, 2, 1].map((v) => v * 0.6) } }
const walk = (i, yaw) => {
  const g = gait(i / 8, { heading: 180 - yaw, ...GAIT_TR }), ph = (2 * Math.PI * i) / 8, side = g.view === "profile" || g.view === "diagonal"
  const feet = g.feet.map(([fwd], k) => [fwd, k ? HIPW : -HIPW]), lift = g.feet.map(([, up]) => up)
  const hands = g.hands.map(([fwd, up], k) => [fwd, side ? (k ? 0.8 - 0.6 * g.a : -0.8 + 0.6 * g.a) : k ? 1 : -1, -7 + up])
  return side ? { feet, lift, down: g.bob, lean: 4, trail: 1 + 0.3 * Math.abs(Math.sin(ph - 0.8)), sway: Math.sin(ph - 0.8) * (1 - g.a), hands }
    : { feet, lift, down: g.bob, lean: 2, trail: 0.4, sway: Math.sin(ph), hands }
}
const idle = (i) => ({ feet: [[0, -HIPW - 0.3], [0, HIPW + 0.3]], lift: [0, 0], down: [0, 1, 1, 0][i], lean: 1, trail: 0.15, sway: 0,
  hands: [[0, -1, -7], [0, 1, -7]] })
// Kneeling to lay something on the ground before him, on one knee as game figures do: the near foot
// planted ahead with its knee up, the back knee down to the ground and its shin lying behind, the body
// upright (leant forward, a short-armed chibi buried its reaching arm in the tunic: a lump), one hand
// on the raised knee and the other reaching down in front of him; held, then up again. The cloak
// settles back and lies on the ground behind him (hanging straight, its side hid the raised knee and
// the shin behind: what the blocks showed).
const KNEEL = [0.3, 0.65, 0.9, 1, 0.7, 0.4, 0.1]
const kneel = (i) => {
  const k = KNEEL[i], mix = (a, b) => a + (b - a) * k
  return { feet: [[mix(0, 3.2), -HIPW - 0.2], [mix(0, -4.4), HIPW + 0.2]], lift: [0, mix(0, 0.6)], down: mix(0, 5.6), lean: mix(1, 8), trail: mix(0.2, 2.6), sway: 0,
    hands: [[mix(0, 5.4), mix(-1, -0.2), mix(-7, -7.6)], [mix(0, 2.6), 0.8, mix(-7, -5.4)]] }
}
// Casting (the blocks approved first, characters §4): the near hand drawn back and up as the energy
// gathers at it (held while it grows), thrust forward at shoulder height, then back down; the foot
// across from it steps forward, the body leaning back, then into the throw. 13 frames of 100 ms:
// wind-up 2, held 3, the thrust and its hold 2, back 4, rest 2. The near hand is a socket, "hand", that
// moves with the pose: where the spell starts. In the four views a spell is cast in (profiles, diagonals).
const CH = [0, 0.5, 0.9, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0], TH = [0, 0, 0, 0, 0, 0, 1, 1, 0.75, 0.45, 0.2, 0.05, 0]
const casting = (i, yaw) => {
  const a = CH[i], b = TH[i], near = yaw < 0 ? 0 : 1, s = near ? 1 : -1, mix = (p, q, k) => p.map((v, e) => v + (q[e] - v) * k)
  const rest = (k) => [0, (k ? 1 : -1), -7]
  const hands = [0, 1].map((k) => k === near
    ? mix(mix(rest(k), [-4.2, s * 1.8, -0.3], a), [5.8, -s * 1.2, -0.4], b)
    : mix(mix(rest(k), [1.4, -s * 1, -5.6], a), [-1.6, -s * 1, -6.4], b))
  const front = 1 - near, step = 1.6 * a + 3 * b
  const feet = [0, 1].map((k) => [k === front ? step : -step * 0.8, k ? HIPW + 0.3 : -HIPW - 0.3])
  return { feet, lift: [0, 0], down: a + 1.5 * b, lean: 1 - 3 * a + 7 * b, trail: 0.2 + 1.2 * b, sway: 0, hands }
}
const MOVES = { walk: { ms: 110, frames: 8, f: walk }, idle: { ms: 250, frames: 4, f: idle }, kneel: { ms: 160, frames: 7, f: kneel },
  cast: { ms: 100, frames: 13, f: casting, dirs: ["e", "w", "se", "sw"], hand: true } }

const bones = (p, yaw) => {
  const fr = frame3(yaw), spine = unit(p.tilt ? add(add(mul(UP, Math.cos(rad(p.lean))), mul(fr.f, Math.sin(rad(p.lean)))), mul(fr.r, Math.sin(rad(p.tilt)))) : add(mul(UP, Math.cos(rad(p.lean))), mul(fr.f, Math.sin(rad(p.lean)))))   // tilt: bent to his right (degrees)
  const pelvis = [0, HIP - p.down, 0], chest = add(pelvis, mul(spine, TORSO)), head = add(chest, mul(spine, NECK + HEADR))
  const legs = [0, 1].map((i) => {
    const hip = local(pelvis, fr, [0, i ? HIPW : -HIPW, 0]), ankle = local([0, 1.2 + p.lift[i], 0], fr, [...p.feet[i], 0])
    return { hip, ankle, knee: ik3(hip, ankle, THIGH, SHIN, add(fr.f, [0, 0.3, 0])) }
  })
  const arms = [0, 1].map((i) => {
    const sh = local(chest, fr, [0.5, i ? SHW : -SHW, -1]), hand = local(sh, fr, p.hands[i])
    return { sh, hand, elbow: ik3(sh, hand, UPPER, FORE, local([0, 0, 0], fr, [-0.4, i ? 0.5 : -0.5, -1])) }
  })
  return { fr, spine, pelvis, chest, head, legs, arms }
}

// ---------------------------------------------------------------- painting the parts
// every surface sampled into one z-buffer (the nearest point wins its pixel), toned along its ramp by
// how it faces the light; an outline round each part on what is next to it: nothing, or another part
// lying behind it (painted after the colors, so it stays)
const sample = (best, q, n, ramp, part, key) => {
  if (q[1] < -0.2) return                                                  // nothing below the ground: a cloak lies on it
  const x = Math.round(OX + q[0]), y = Math.round(OY - q[1] * CP + q[2] * SP), d = depth(q), k = y * 4096 + x, b = best.get(k)   // scr(q), rounded
  if (b && !(d > b[0])) return                                             // behind what is there: its tone isn't needed
  const t = (dot(n, SUN) + 0.55) / 1.3
  best.set(k, [d, key ?? ramp[Math.max(0, Math.min(ramp.length - 1, Math.round(t * (ramp.length - 1))))], x, y, part])
}
const tube = (best, a, b, r0, r1, ramp, part, rampOf) => {
  const d = sub(b, a), u = unit(d), e1 = unit(Math.abs(u[1]) < 0.9 ? [u[2], 0, -u[0]] : [1, 0, 0])
  const e2 = [u[1] * e1[2] - u[2] * e1[1], u[2] * e1[0] - u[0] * e1[2], u[0] * e1[1] - u[1] * e1[0]]
  for (let t = -0.15; t <= 1.15; t += 0.04) for (let k = 0; k < 24; k++) {
    const tc = Math.min(1, Math.max(0, t)), a2 = (k / 24) * Math.PI * 2, n = add(mul(e1, Math.cos(a2)), mul(e2, Math.sin(a2)))
    sample(best, add(add(a, mul(d, tc)), mul(n, r0 + (r1 - r0) * tc)), n, rampOf ? rampOf(tc) : ramp, part)
  }
}
const ball = (best, c, fr, rx, ry, rz, ramp, part) => {
  for (let i = 0; i <= 16; i++) for (let k = 0; k < 28; k++) {
    const th = (i / 16) * Math.PI, ph = (k / 28) * Math.PI * 2, o = [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)]
    const n = add(add(mul(fr.r, o[0]), mul(UP, o[1])), mul(fr.f, o[2]))
    sample(best, add(c, add(add(mul(fr.r, o[0] * rx), mul(UP, o[1] * ry)), mul(fr.f, o[2] * rz))), n, ramp, part)
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
    sample(best, q, outside ? dir : mul(dir, -1), pt, part, pt.length === 1 ? pt : undefined)
  }
}
// What a figure wears, part by part (ramps dark to light): the traveler's own here; other files dress
// theirs (crew.px.js). The legs' trousers down to `cuff` of the shin and what shows under them (boots,
// or bare skin), the feet; drapes swept round the body from a height down a length (a cloak behind, a
// coat open at the front, a long skirt), trailing as he walks by `trail`; the shirt's skirt at the
// hips and its body (a key or ramp by height and angle: stripes, a vest, the belt); drapes over it (an
// apron); the sleeves to the elbow, the forearms, the hands; the outline, the line under the head, and
// the head's grids by view.
const TRAVELER = {
  legs: (far) => ({ tr: far ? "RRP" : "RPp", shin: far ? "DDd" : "Ddl", foot: far ? "DDd" : "Ddl" }), cuff: 0.45,
  drapes: [{ top: (j) => j.chest[1] + 0.6, len: CLOAK, out: "NncC", in: "N", trail: 1, keep: (h, a) => Math.abs(a) > 1.35,
    radius: (h, a) => { const s = Math.abs(Math.sin(a)); return (3.9 + 1.2 * (1 - h)) * (1 - s) + (4.4 + 1.4 * (1 - h)) * s + 0.2 * Math.sin(a * 7) * (1 - h) } }],
  skirt: (h, a, out) => (out ? "vwW" : "v"), body: (h, a) => (h < 0.1 ? (Math.abs(a) < 0.3 ? "g" : "Ddl") : "vwW"), over: [],
  sleeve: (far) => (far ? "vvw" : "vwW"), fore: (far) => (far ? "vvw" : "vwW"), hand: (far) => (far ? "zzs" : "zsS"), ink: "k", chin: "D",
}
// a drape swept round the body (or the hips, base "pelvis"), hung from its top, trailing behind as he walks
const drape = (best, j, fr, p, D, part) => {
  const top = D.top(j), base = D.base === "pelvis" ? [j.pelvis[0], 0, j.pelvis[2]] : [j.chest[0], 0, j.chest[2]]
  sweep(best, base, fr, top - D.len, top, D.radius, typeof D.out === "function" ? D.out : (h, a, out) => (out ? D.out : D.in), part, D.keep ?? (() => true),
    (h) => { const down = 1 - h; return add(mul(fr.f, -(0.3 + 1.1 * p.trail) * down * D.trail), mul(fr.r, 0.9 * p.sway * down ** 1.5 * D.trail)) })
}
const figure = (c, set, p, yaw, o = TRAVELER) => {
  const j = bones(p, yaw), best = new Map(), fr = j.fr
  // the limb on the side away from us a step darker
  const farLeg = depth(j.legs[0].hip) < depth(j.legs[1].hip) ? 0 : 1, farArm = depth(j.arms[0].sh) < depth(j.arms[1].sh) ? 0 : 1
  // the legs: trousers to the cuff, then what is under, and the foot pointing ahead
  j.legs.forEach((L, i) => {
    const g = o.legs(i === farLeg)
    tube(best, L.hip, L.knee, 1.6, 1.5, g.tr, "leg" + i)
    tube(best, L.knee, L.ankle, 1.5, 1.4, null, "leg" + i, (t) => (t < o.cuff ? g.tr : g.shin))
    ball(best, add(L.ankle, mul(fr.f, 1.1)), fr, 1.6, 1.1, 2.3, g.foot, "leg" + i)
  })
  // The traveler's cloak, behind him: hung from the shoulders (it rises, falls and leans with him), an
  // ellipse a little wider than deep, flaring to mid-thigh, open in front; walking, it trails behind,
  // more toward the hem, and swings aside with each step a little after the legs; its inside in its
  // darkest tone.
  o.drapes.forEach((D, k) => drape(best, j, fr, p, D, k ? "drape" + k : "cloak"))
  // the tunic: its short skirt flaring a little below the belt; from the belt up, round, a little deeper
  // at the sides; the belt and its buckle in front
  const waist = j.pelvis[1] + 1.4, base = [j.pelvis[0], 0, j.pelvis[2]]
  sweep(best, base, fr, waist - 2.4, waist, (h) => 3.6 + 0.6 * (1 - h), o.skirt, "tunic")
  sweep(best, base, fr, waist, j.chest[1] + 0.5, (h, a) => (4 - 0.5 * h * h) * (0.84 + 0.16 * Math.abs(Math.sin(a))), o.body, "tunic")
  o.over.forEach((D, k) => drape(best, j, fr, p, D, "over" + k))
  // the arms: sleeves, forearms, the hands
  j.arms.forEach((A, i) => {
    const far = i === farArm
    tube(best, A.sh, A.elbow, 1.1, 1, o.sleeve(far), "arm" + i)
    tube(best, A.elbow, A.hand, 1, 0.9, o.fore(far), "arm" + i)
    ball(best, A.hand, fr, 1, 1, 1, o.hand(far), "arm" + i)
  })
  o.prop?.(best, j, fr, sample)                                           // something he carries, in the same depth
  const inner = new Set()
  for (const [d0, , x, y, part] of best.values()) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const k = (y + dy) * 4096 + x + dx, ob = best.get(k)
    if (!ob) c.px(x + dx, y + dy, o.ink)
    else if (ob[4] !== part && ob[0] < d0 - 0.5) inner.add(k)
  }
  for (const [, key, x, y] of best.values()) c.px(x, y, key)
  for (const k of inner) c.px(k % 4096, Math.floor(k / 4096), o.ink)
  // the head over all, by hand, the view its heading's, anchored on the skeleton's head; under it, where
  // it meets the body, a line of dark brown (the chin's and the nape's edge), so the face and the clothes
  // don't run together
  const [hx, hy] = scr(j.head).map(Math.round), head = { heading: 180 - yaw }, g = c.asset(`${set}_head`, head)
  const x = hx - Math.floor(g.pivot[0]), y = hy - Math.floor(g.pivot[1])
  c.stamp(`${set}_head`, hx, hy, head)
  for (let col = 0; col < g.w; col++) {
    let r = g.h - 1
    while (r >= 0 && !g.data[r * g.w + col]) r--
    if (r >= 0 && c.get(x + col, y + r + 1)) c.px(x + col, y + r + 1, o.chin)
  }
}
// Step 1 again, for a new move: the same skeleton as flat blocks (the crew's bk_carrylow), to judge the pose
// and the motion before anything is painted: the head yellow with a red patch where the face is, the
// body orange, his right limbs light and his left dark, outlined. Drawn turned to each direction, no
// mirror (nothing in it is lit from one side).
const BLOCK = { head: ["#f2cd3a"], face: ["#d8402e"], body: ["#e7763a"], right: ["#98e2ec"], left: ["#2b6b91"] }
const blocks = (c, p, yaw) => {
  const j = bones(p, yaw), best = new Map(), fr = j.fr
  j.legs.forEach((L, i) => {
    const k = i ? BLOCK.right : BLOCK.left
    tube(best, L.hip, L.knee, 1.6, 1.5, k, "leg" + i); tube(best, L.knee, L.ankle, 1.5, 1.4, k, "leg" + i)
    ball(best, add(L.ankle, mul(fr.f, 1.1)), fr, 1.6, 1.1, 2.3, k, "leg" + i)
  })
  tube(best, j.pelvis, j.chest, 3.6, 3.9, BLOCK.body, "body")
  j.arms.forEach((A, i) => {
    const k = i ? BLOCK.right : BLOCK.left
    tube(best, A.sh, A.elbow, 1.1, 1, k, "arm" + i); tube(best, A.elbow, A.hand, 1, 0.9, k, "arm" + i); ball(best, A.hand, fr, 1, 1, 1, k, "arm" + i)
  })
  ball(best, j.head, fr, HEADR, HEADR, HEADR, BLOCK.head, "head")
  ball(best, add(j.head, mul(fr.f, HEADR * 0.75)), fr, 2.4, 2, 1.6, BLOCK.face, "face")
  const inner = new Set()
  for (const [d0, , x, y, part] of best.values()) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const k = (y + dy) * 4096 + x + dx, o = best.get(k)
    if (!o) c.px(x + dx, y + dy, "k")
    else if (o[4] !== part && o[0] < d0 - 0.5) inner.add(k)
  }
  for (const [, key, x, y] of best.values()) c.px(x, y, key)
  for (const k of inner) c.px(k % 4096, Math.floor(k / 4096), "k")
}
// 8 directions, each turned to (yaw: degrees from facing us, to the right)
const DIRS = { s: 0, sw: -45, w: -90, nw: -135, n: 180, ne: 135, e: 90, se: 45 }
// ---------------------------------------------------------------- the traveler, on the 3D layer
// The skeleton and moves above on the 3D layer (rig3d: its parts fields along the bones, drawn by
// surface()): tr_<move>_<dir>, and as blocks bk_<move>_<dir>. Painted as his outfit is: the trousers to
// the cuff and the boots, the far limbs a step darker; the cloak a cloth hung from the shoulders, open
// in front, trailing and swaying as he walks; the tunic's skirt and its body with the belt and the
// buckle; the sleeves, the hands.
const BODY3 = { h: 34, heads: 3, hip: HIP, torso: TORSO, neck: NECK + HEADR, thigh: THIGH, shin: SHIN, upper: UPPER, fore: FORE, ankle: 1.2, hips: HIPW, shoulders: [0.5, SHW, -1] }
const MOVES3 = Object.fromEntries(Object.entries(MOVES).map(([m, M]) => [m, { frames: M.frames, ms: M.ms, pose: (i, h) => M.f(i, 180 - h), ...(M.dirs ? { dirs: M.dirs } : {}),
  ...(M.hand ? { draw: (c, j) => c.setSocket("hand", ...j.screen(j.arms[j.heading > 180 ? 0 : 1].hand)) } : {}) }]))
const O = TRAVELER, CLOAK3 = O.drapes[0]
const parts3 = (j, p) => {
  const farLeg = j.depth(j.legs[0].hip) < j.depth(j.legs[1].hip) ? 0 : 1, farArm = j.depth(j.arms[0].sh) < j.depth(j.arms[1].sh) ? 0 : 1
  const waist = j.pelvis[2] + 1.4, hips = [j.pelvis[0], j.pelvis[1], 0], top = j.chest[2] + 0.6
  // the cloak trails behind as he walks, more toward the hem, and swings aside a little after the legs
  const trail = (h) => { const down = 1 - h; return [0, 1].map((e) => j.f[e] * -(0.3 + 1.1 * p.trail) * down * CLOAK3.trail + j.r[e] * 0.9 * p.sway * down ** 1.5 * CLOAK3.trail) }
  return {
    ...Object.fromEntries(j.legs.map((L, i) => { const g = O.legs(i === farLeg); return [`leg${i}`, [j.limb(L.hip, L.knee, 1.6, 1.5, g.tr), j.limb(L.knee, L.ankle, 1.5, 1.4, (h) => (h < O.cuff ? g.tr : g.shin)), j.ball(L.foot, [1.6, 2.3, 1.1], g.foot)]] })),
    cloak: j.sweep([j.chest[0], j.chest[1], 0], top - CLOAK, top, CLOAK3.radius, { keep: CLOAK3.keep, shift: trail, shell: 0.4, paint: (h, a, out) => (out ? CLOAK3.out : CLOAK3.in) }),
    // (the belt a pixel and more, so a pixel's middle falls on it)
    tunic: [j.sweep(hips, waist - 2.4, waist, (h) => 3.6 + 0.6 * (1 - h), { paint: O.skirt }), j.sweep(hips, waist, j.chest[2] + 0.5, (h, a) => (4 - 0.5 * h * h) * (0.84 + 0.16 * Math.abs(Math.sin(a))), { paint: (h, a) => O.body(h < 0.14 ? 0 : h, a) })],
    ...Object.fromEntries(j.arms.map((A, i) => { const far = i === farArm; return [`arm${i}`, [j.limb(A.sh, A.elbow, 1.1, 1, O.sleeve(far)), j.limb(A.elbow, A.hand, 1, 0.9, O.fore(far)), j.ball(A.hand, 1, O.hand(far))]] })),
  }
}
// lit as he is, from above and toward us, the light wrapped round him (a side square to it half lit)
const LIT3 = { soft: 0.55 }
// The head modeled too, as the grove's snow spirit is, in his head's
// frame (x his right, y ahead, z up, px): the skull; the hair a cap over it cut away at the face, with a
// mass at the nape, a parting, locks of fringe, side locks to the jaw, tufts at the crown, tousled by
// noise; a neck. The eyes, the nose (the skin's lightest pixel, as on the hand heads: a sphere smaller
// than a pixel poked out of the face as a wart) and the mouth in the chin row drawn by hand as decals
// pinned on it. Turned to 16 directions without drawing a view (tr_turn_<dir>).
// The eyes as the hand heads' rows, a grid a view picked by how far the face turns from us: facing us
// the irises toward the nose; three quarters the near eye's white and iris looking the way it turns,
// the far eye a pixel inside the face's edge; in profile the white and the iris a pixel behind the
// edge, the lid where the fringe allows (each drawn looking right and its mirror; the pivot on the
// pixel between the eyes, in profile on the near eye's point)
sprite("_tr_eyes_s", { pivot: [2.5, 1] }, "kk.kk\nGE.EG")
sprite("_tr_eyes_se", { pivot: [4.5, 0.5] }, "kk.k\nGE.E")
sprite("_tr_eyes_sw", { pivot: [-0.5, 0.5] }, "k.kk\nE.EG")
sprite("_tr_eyes_e", { pivot: [3.5, 0] }, "kk\nGE")
sprite("_tr_eyes_w", { pivot: [-1.5, 0] }, "kk\nEG")
sprite("_tr_mouth", "z")
sprite("_tr_nose", "L")
// the cap close on the skull, off the face from the brow down, a mass at the nape, a parting groove;
// three locks of fringe ending on the brow, side locks behind the cheeks to the jaw, tufts at the crown
const CAP = sdf.ellipsoid([5.3, 5.6, 4.8]).at(0, -0.5, 1.2).union(sdf.ellipsoid([4, 2.6, 3]).at(0, -3.4, -1.6), { smooth: 1 })
  .subtract(sdf.ellipsoid([4.4, 4.8, 4.4]).at(0, 4, -2.3), sdf.capsule([-0.9, 4.4, 4.6], [-0.7, -1.5, 5.6], 0.45), { smooth: 0.4 })
const LOCKS = sdf.union(sdf.capsule([-2.4, 3.4, 3.8], [-2.8, 4.9, 1.6], 0.9, 0.5), sdf.capsule([0.6, 3.8, 4], [1, 5.1, 1.9], 0.9, 0.5), sdf.capsule([2.7, 3.2, 3.7], [3.1, 4.5, 1.7], 0.9, 0.5),
  sdf.capsule([-4.5, 0, 2], [-4.4, 0.3, -3.2], 1, 0.7), sdf.capsule([4.5, 0, 2], [4.4, 0.3, -3.2], 1, 0.7),
  sdf.capsule([-1.6, 0.4, 5], [-2.4, -0.6, 6.4], 0.9, 0.4), sdf.capsule([1.2, 1, 5.1], [2.2, 0.8, 6.2], 0.8, 0.4), sdf.capsule([0, -2.2, 4.8], [0.4, -3.6, 5.6], 0.8, 0.4), { smooth: 0.6 })
const HAIR = CAP.union(LOCKS, { smooth: 0.6 }).noise({ amp: 0.5, scale: 1.1, seed: 3 }).mat("JjhH")
const head3 = (j, hair = HAIR) => {
  const into = (f) => f.rotate(-j.hd.heading, "z").at(j.head), at = (x, y, z) => [0, 1, 2].map((e) => j.head[e] + j.hd.r[e] * x + j.hd.f[e] * y + (e === 2 ? z : 0))
  const skull = sdf.ellipsoid([4.6, 5, 5.3]), turn = ((((180 - j.hd.heading) % 360) + 540) % 360) - 180
  const eyes = Math.abs(turn) < 20 ? "s" : Math.abs(turn) < 60 ? (turn > 0 ? "se" : "sw") : turn > 0 ? "e" : "w"
  return {
    neck: j.limb(j.chest, [j.head[0], j.head[1], j.head[2] - 3], 1.6, 1.5, "zs"),
    head: [into(skull.mat("zsSL")), into(hair)],
    // (the face's turn from us, degrees, to our right +; past 105 the eyes are behind it)
    face: [...(Math.abs(turn) < 105 ? [j.decal(`_tr_eyes_${eyes}`, Math.abs(turn) < 60 ? at(0, 5, -0.6) : at(Math.sign(turn) * 1.8, 4.6, -0.6), { depth: 3 })] : []),
      j.decal("_tr_nose", at(0, 5, -1.7)), j.decal("_tr_mouth", at(0, 4.4, -3.9))],
  }
}
sprite("_tr_clasp", "g")
// The body as parts3 paints it, with a few accents where the cloth bends or pieces meet, in his ramps (each a cause,
// none a texture): the trousers' crease at the front of the knee; the boots' cuffs turned down a tone
// lighter, their soles dark; the tunic's hem in shadow under its flare, two folds where the skirt flares
// from the belt, a crease inside each elbow; the cloak's hem darker, its edge at the opening catching
// the light, two folds down its back that swing with it, the lining's edge a step lighter, the clasp at
// the collar. (Brushes of cloth on the cloak's trailing hem read as a bush at this size: none.)
const parts3m = (j, p, hair) => {
  const P = parts3(j, p), farLeg = j.depth(j.legs[0].hip) < j.depth(j.legs[1].hip) ? 0 : 1, farArm = j.depth(j.arms[0].sh) < j.depth(j.arms[1].sh) ? 0 : 1
  const dark = (r) => r.slice(0, 2)
  j.legs.forEach((L, i) => {
    const g = O.legs(i === farLeg)
    P[`leg${i}`] = [j.limb(L.hip, L.knee, 1.6, 1.5, (h, a) => (h > 0.78 && Math.abs(a) < 1 ? dark(g.tr) : g.tr)),
      j.limb(L.knee, L.ankle, 1.5, 1.4, (h) => (h < O.cuff ? g.tr : h < O.cuff + 0.14 ? "dl" : g.shin)), j.ball(L.foot, [1.6, 2.3, 1.1], (h) => (h < 0.3 ? "D" : g.foot))]
  })
  j.arms.forEach((A, i) => { const far = i === farArm, s = O.sleeve(far); P[`arm${i}`][0] = j.limb(A.sh, A.elbow, 1.1, 1, (h, a) => (h > 0.8 && Math.abs(a) < 1.2 ? dark(s) : s)) })
  const waist = j.pelvis[2] + 1.4, hips = [j.pelvis[0], j.pelvis[1], 0], top = j.chest[2] + 0.6
  P.tunic[0] = j.sweep(hips, waist - 2.4, waist, (h) => 3.6 + 0.6 * (1 - h), { paint: (h, a, out) => (!out ? "v" : h < 0.25 || Math.abs(Math.abs(a) - 0.75) < 0.13 ? "vw" : "vwW") })
  const trail = (h) => { const down = 1 - h; return [0, 1].map((e) => j.f[e] * -(0.3 + 1.1 * p.trail) * down * CLOAK3.trail + j.r[e] * 0.9 * p.sway * down ** 1.5 * CLOAK3.trail) }
  const cloakPaint = (h, a, out) => {
    const edge = Math.abs(a) < 1.6
    if (!out) return edge ? "n" : "N"
    return h < 0.08 ? "nc" : edge ? "cC" : Math.abs(Math.abs(a) - 2.45) < 0.1 ? "Nn" : CLOAK3.out
  }
  const cloak = j.sweep([j.chest[0], j.chest[1], 0], top - CLOAK, top, CLOAK3.radius, { keep: CLOAK3.keep, shift: trail, shell: 0.4, paint: cloakPaint })
  P.cloak = cloak
  return { ...P, clasp: j.decal("_tr_clasp", [0, 1, 2].map((e) => j.chest[e] + j.f[e] * 3.8 + (e === 2 ? 0.2 : 0)), { depth: 2 }), ...head3(j, hair) }
}
const ALL8 = ["n", "ne", "e", "se", "s", "sw", "w", "nw"]
// cleaned as a pixel artist would at this size (surface's clean: no pixel sticking out, no black run
// 2 px thick, the outline whole), under the jaw (not the hair) the hand heads' chin line
const FIG = { body: BODY3, w: W, h: H, pivot: [OX, OY], ink: "k", chin: ["D", "zsSL"], surface: { ...LIT3, clean: true } }
rig3d("tr", { ...FIG, n: 16, parts: parts3m, blocks: true,
  moves: { ...Object.fromEntries(Object.entries(MOVES3).map(([m, M]) => [m, { dirs: ALL8, ...M }])), turn: { frames: 1, ms: 250, pose: MOVES3.idle.pose } } })
// The mourner (mo_<move>_<dir>): the same figure, her hair her own, grey, parted in the middle and
// drawn back smooth over the ears into a bun at the back of the head, the brow bare; a shawl of dark
// violet, grey linen (his colors swapped)
const MOURNER = {
  Y: "#bdb8ae", H: "#a6a199", h: "#8f8a84", j: "#625e5c", J: "#383536",
  C: "#7a6c8c", c: "#56496a", n: "#3a3150", N: "#231d33", W: "#a8a196", w: "#7f786f", v: "#58534e",
}
const MO_HAIR = sdf.ellipsoid([5, 5.4, 5.4]).at(0, -0.3, 0.6)
  .subtract(sdf.ellipsoid([4.4, 4.6, 4.6]).at(0, 4.2, -1.6), sdf.capsule([0, 4.4, 4.6], [0, -1.5, 6.5], 0.25), sdf.plane([0, -0.55, 0.83], -1.2), { smooth: 0.4 })
  .noise({ amp: 0.4, scale: 1.4, seed: 5 }).mat("JjhH")
const BUN = sdf.ellipsoid([2.6, 2.2, 2.4]).at(0, -6.2, 0).noise({ amp: 0.2, scale: 1, seed: 6 }).mat("JjhH")
// (the bun a part of its own, so the line runs round it where it lies over the head)
for (const n of rig3d("_mo", { ...FIG, parts: (j, p) => ({ ...parts3m(j, p, MO_HAIR), bun: BUN.rotate(-j.hd.heading, "z").at(j.head) }), moves: MOVES3 }).names) anim(n.slice(1), { base: n, swap: MOURNER })
sheet("traveler", ["tr_*", "mo_*"], { rows: "tag", pad: 1 })
Object.assign(travelerRig, { figure, blocks, bones, scr, depth, local, sample, TRAVELER, MOVES, DIRS, W, H, OX, OY })
}
