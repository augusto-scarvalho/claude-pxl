// An HD-2D traveler in the 8 directions Octopath's figures turn to, walking, idle, kneeling and casting,
// drawn in 3D (rig3d, characters §11): a skeleton in px, its parts fields along the bones painted as
// his outfit is, a line all round; the head modeled too (the skull and the hair as fields), drawn once
// per view and its face painted over by hand (views()). Measured on 16 games' field sprites (characters §6, §10): 34 px
// tall, the head 11 rows (a third: Olberic's; more reads as a big head), a body like a little barrel
// (the waist about as wide as the chest, the arms slim and close along it, the hands at the crotch:
// shoulders broad over a narrow waist read as a body-builder); the same rows for the head, shoulders,
// hands, crotch and soles in every view. Lit from above and toward us, so a mirrored view keeps its
// light. Each move was judged first as flat blocks (bk_<move>_<dir>, characters §3). The mourner is
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
// his figure for files that dress people of their own on it (the hd2d crew, the shrine's miko): rig3d's
// options (the body, the size), his moves and his walk's pace, the painter of an outfit, his skull, how
// his head is drawn by view, the approved hand faces painted over it (FACE: the mourner's) and a neck
const traveler = {}
// in a block: its names stay its own when a scene includes the file
{
// ---------------------------------------------------------------- the skeleton
// the sprite's size and the pixel his feet stand on
const W = 26, H = 40, OX = 13, OY = 38
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
// how fast he walks, px a frame by the compass: across and on the diagonals as fast as his body goes
// over a planted foot (gait()'s pace, over the walk's 8 frames), so his feet don't slide; toward us or
// away, where the feet step in their own columns (the stride hardly shows through the camera's tilt),
// 1.6 px
const pace = (dir) => (dir === "n" || dir === "s" ? 1.6 : gait(0, { heading: 45 * ["n", "ne", "e", "se", "s", "sw", "w", "nw"].indexOf(dir), ...GAIT_TR }).pace / 8)
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

// What a figure wears, part by part (ramps dark to light): the traveler's own here; other files dress
// theirs (the hd2d crew). The legs' trousers down to `cuff` of the shin and what shows under them (boots,
// or bare skin), the feet; drapes swept round the body from a height down a length (a cloak behind, a
// coat open at the front, a long skirt), trailing as he walks by `trail`; the shirt's skirt at the
// hips and its body (a key or ramp by height and angle: stripes, a vest, the belt), carried along the
// spine as he leans, kneels or bows (`spine: false`: round an upright through the hips); drapes over it
// (an apron); the sleeves to the elbow, the forearms, the hands.
const TRAVELER = {
  legs: (far) => ({ tr: far ? "RRP" : "RPp", shin: far ? "DDd" : "Ddl", foot: far ? "DDd" : "Ddl" }), cuff: 0.45,
  drapes: [{ top: (j) => j.chest[2] + 0.6, len: CLOAK, out: "NncC", in: "N", trail: 1, keep: (h, a) => Math.abs(a) > 1.35,
    radius: (h, a) => { const s = Math.abs(Math.sin(a)); return (3.9 + 1.2 * (1 - h)) * (1 - s) + (4.4 + 1.4 * (1 - h)) * s + 0.2 * Math.sin(a * 7) * (1 - h) } }],
  skirt: (h, a, out) => (out ? "vwW" : "v"), body: (h, a) => (h < 0.1 ? (Math.abs(a) < 0.3 ? "g" : "Ddl") : "vwW"), over: [],
  sleeve: (far) => (far ? "vvw" : "vwW"), fore: (far) => (far ? "vvw" : "vwW"), hand: (far) => (far ? "zzs" : "zsS"),
}
// a drape swept round the body (or the hips, base "pelvis"), hung from its top, trailing behind as he walks
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
// an outfit painted on the figure (parts for rig3d): the far limbs a step darker; each drape a cloth
// hung from its top (the chest's, or the hips' with base "pelvis"), trailing behind as he walks, more
// toward the hem, and swinging aside a little after the legs
const dress = (o) => (j, p) => {
  const farLeg = j.depth(j.legs[0].hip) < j.depth(j.legs[1].hip) ? 0 : 1, farArm = j.depth(j.arms[0].sh) < j.depth(j.arms[1].sh) ? 0 : 1
  const waist = j.pelvis[2] + 1.4, hips = [j.pelvis[0], j.pelvis[1], 0], top = j.chest[2] + 0.5, lean = j.chest.map((v, e) => v - j.pelvis[e])
  // (spine: each height of the shirt's body carried along the spine, pelvis to chest)
  const along = (h) => { const t = (waist + h * (top - waist) - j.pelvis[2]) / lean[2]; return [lean[0] * t, lean[1] * t] }
  const drape = (D) => {
    const top = D.top(j), trail = (h) => { const down = 1 - h; return [0, 1].map((e) => j.f[e] * -(0.3 + 1.1 * p.trail) * down * D.trail + j.r[e] * 0.9 * p.sway * down ** 1.5 * D.trail) }
    return j.sweep(D.base === "pelvis" ? hips : [j.chest[0], j.chest[1], 0], top - D.len, top, D.radius, { keep: D.keep, shift: trail, shell: 0.4, paint: typeof D.out === "function" ? D.out : (h, a, out) => (out ? D.out : D.in) })
  }
  return {
    ...Object.fromEntries(j.legs.map((L, i) => { const g = o.legs(i === farLeg); return [`leg${i}`, [j.limb(L.hip, L.knee, 1.6, 1.5, g.tr), j.limb(L.knee, L.ankle, 1.5, 1.4, (h) => (h < o.cuff ? g.tr : g.shin)), j.ball(L.foot, [1.6, 2.3, 1.1], g.foot)]] })),
    ...Object.fromEntries(o.drapes.map((D, k) => [k ? "drape" + k : "cloak", drape(D)])),
    // (the belt a pixel and more, so a pixel's middle falls on it)
    tunic: [j.sweep(hips, waist - 2.4, waist, (h) => 3.6 + 0.6 * (1 - h), { paint: o.skirt }), j.sweep(hips, waist, top, (h, a) => (4 - 0.5 * h * h) * (0.84 + 0.16 * Math.abs(Math.sin(a))), { ...(o.spine !== false ? { shift: along } : {}), paint: (h, a, out) => o.body(h < 0.14 ? 0 : h, a, out) })],
    ...Object.fromEntries(o.over.map((D, k) => ["over" + k, drape(D)])),
    ...Object.fromEntries(j.arms.map((A, i) => { const far = i === farArm; return [`arm${i}`, [j.limb(A.sh, A.elbow, 1.1, 1, o.sleeve(far)), j.limb(A.elbow, A.hand, 1, 0.9, o.fore(far)), j.ball(A.hand, 1, o.hand(far))]] })),
  }
}
// lit as he is, from above and toward us, the light wrapped round him (a side square to it half lit)
const LIT3 = { soft: 0.55 }
// The head modeled, as the grove's snow spirit is, in his head's frame (x his right, y ahead, z up, px):
// the skull; the hair a cap over it cut away at the face, with a mass at the nape, a parting, locks of
// fringe, side locks to the jaw, tufts at the crown, tousled by noise. Drawn once per view (views(): five
// for his 8 directions, the east mirrored; his 16 take the nearest), the face painted over it by hand:
// the approved hand heads' eyes (the dark lid over the white outside and the iris inside), the nose the
// skin's lightest pixel, the mouth in the chin row, the skin under the fringe, cut from them where the
// render has the head ("." keeps its pixel); in profile the face a pixel wider than the hair leaves it,
// the nose's tip past the line. The body is drawn every frame, the head stamped on it, a neck under it.
// the cap close on the skull, off the face from the brow down, a mass at the nape, a parting groove;
// three locks of fringe ending on the brow, side locks behind the cheeks to the jaw, tufts at the crown
const CAP = sdf.ellipsoid([5.3, 5.6, 4.8]).at(0, -0.5, 1.2).union(sdf.ellipsoid([4, 2.6, 3]).at(0, -3.4, -1.6), { smooth: 1 })
  .subtract(sdf.ellipsoid([4.4, 4.8, 4.4]).at(0, 4, -2.3), sdf.capsule([-0.9, 4.4, 4.6], [-0.7, -1.5, 5.6], 0.45), { smooth: 0.4 })
const LOCKS = sdf.union(sdf.capsule([-2.4, 3.4, 3.8], [-2.8, 4.9, 1.6], 0.9, 0.5), sdf.capsule([0.6, 3.8, 4], [1, 5.1, 1.9], 0.9, 0.5), sdf.capsule([2.7, 3.2, 3.7], [3.1, 4.5, 1.7], 0.9, 0.5),
  sdf.capsule([-4.5, 0, 2], [-4.4, 0.3, -3.2], 1, 0.7), sdf.capsule([4.5, 0, 2], [4.4, 0.3, -3.2], 1, 0.7),
  sdf.capsule([-1.6, 0.4, 5], [-2.4, -0.6, 6.4], 0.9, 0.4), sdf.capsule([1.2, 1, 5.1], [2.2, 0.8, 6.2], 0.8, 0.4), sdf.capsule([0, -2.2, 4.8], [0.4, -3.6, 5.6], 0.8, 0.4), { smooth: 0.6 })
const HAIR = CAP.union(LOCKS, { smooth: 0.6 }).noise({ amp: 0.5, scale: 1.1, seed: 3 }).mat("JjhH")
const SKULL = sdf.ellipsoid([4.6, 5, 5.3]).mat("zsSL")
// each view's grid's pixel on the head's middle (nw and n for the heads retouched from behind too: the
// crew's bald crown)
const ANCHOR = { s: [7, 5], sw: [8, 5], w: [6, 5], nw: [7, 5], n: [7, 5] }
const FACE3 = {
  s: `
    ...............
    ...............
    ...............
    ...............
    ...............
    ....SS...SS....
    ...SkkSSSkkS...
    ...SGESSSEGS...
    ...sSSSLSSSs...
    ....sSSzSSs....`,
  sw: `
    ................
    ................
    ................
    ................
    ................
    ...SSSSSS.......
    ...SkSSkk.......
    ....ESSEG.s.....
    ....SLLeS.z.....
    .....SzSs.......`,
  w: `
    .................
    .................
    .................
    .................
    .................
    ...SSS...........
    ..SkkSSs.........
    ..SEGSSzs........
    kSLSSSss.........
    ...SSss..........
    ....zss..........`,
}
// as the figure is drawn: the line all round, under the skin a dark brown (the chin's edge), cleaned
const HEAD3 = { ink: "k", jaw: ["D", "zsSL"], surface: LIT3, anchor: ANCHOR }
// his own turned away: the side lock dark down past the ear to the jaw, so the cheek closes on a chin
// 3 px wide (the render left a block of the skull's shade there, a jowl); in profile the line of the
// jaw between the chin and the lock, the ear framed by the hair (the hand heads' rows)
const FACE3_TR = {
  ...FACE3,
  sw: `
    ................
    ................
    ................
    ................
    ................
    ...SSSSSS.......
    ...SkSSkk.......
    ....ESSEG.s.....
    ....SLLeSjz.....
    .....SzSsjj.....
    .........jj.....
    .........kk.....`,
  w: `
    .................
    .................
    .................
    .................
    .................
    ...SSS...........
    ..SkkSSs.........
    ..SEGSSzjj.......
    kSLSSSsj.........
    ..DSSsDjj........
    ...DzsDjj........
    ....DD_kk........`,
}
views("_tr_head", sdf.union(SKULL, HAIR), { ...HEAD3, retouch: FACE3_TR })
const neck = (j) => j.limb(j.chest, [j.head[0], j.head[1], j.head[2] - 3], 1.6, 1.5, "zs")
sprite("_tr_clasp", "g")
// The body as dress() paints his outfit, with a few accents where the cloth bends or pieces meet, in his ramps (each a cause,
// none a texture): the trousers' fold at a knee bent past 60 degrees (a step, a kneel; the idle's breath
// bends them 51: none), the hollow behind it in their darkest and the kneecap in their lightest; the
// boots' cuffs turned down a tone lighter, their soles dark; the tunic's hem in shadow under its flare,
// two folds where the skirt flares from the belt, a crease inside each elbow bent past 45 degrees in the
// sleeve's darkest, the forearm's top past it in its lightest; the cloak's hem darker, its edge at the
// opening catching the light, two folds down its back that swing with it, the lining's edge a step
// lighter, the clasp at the collar. (Brushes of cloth on the cloak's trailing hem read as a bush at this
// size: none. A crease a tone darker on every frame hardly read, and blinked with the breath.)
const parts3m = (j, p) => {
  const P = dress(O)(j, p), farLeg = j.depth(j.legs[0].hip) < j.depth(j.legs[1].hip) ? 0 : 1, farArm = j.depth(j.arms[0].sh) < j.depth(j.arms[1].sh) ? 0 : 1
  // how far a joint bends, in degrees (0 straight)
  const bend = (a, b, c) => { const u = b.map((v, e) => v - a[e]), w = c.map((v, e) => v - b[e]), d = (x, y) => x[0] * y[0] + x[1] * y[1] + x[2] * y[2]; return (Math.acos(Math.min(1, d(u, w) / Math.sqrt(d(u, u) * d(w, w)))) * 180) / Math.PI }
  j.legs.forEach((L, i) => {
    const g = O.legs(i === farLeg), bent = bend(L.hip, L.knee, L.ankle) > 60, deep = g.tr[0], lit = g.tr.at(-1)
    P[`leg${i}`] = [j.limb(L.hip, L.knee, 1.6, 1.5, (h, a) => (!bent || h < 0.75 ? g.tr : Math.abs(a) > 2.2 ? deep : Math.abs(a) < 0.8 && h > 0.85 ? lit : g.tr)),
      j.limb(L.knee, L.ankle, 1.5, 1.4, (h, a) => (bent && h < 0.15 && Math.abs(a) > 2.2 ? deep : bent && h < 0.14 && Math.abs(a) < 0.8 ? lit : h < O.cuff ? g.tr : h < O.cuff + 0.14 ? "dl" : g.shin)),
      j.ball(L.foot, [1.6, 2.3, 1.1], (h) => (h < 0.3 ? "D" : g.foot))]
  })
  j.arms.forEach((A, i) => {
    const far = i === farArm, s = O.sleeve(far), f = O.fore(far), bent = bend(A.sh, A.elbow, A.hand) > 45
    P[`arm${i}`][0] = j.limb(A.sh, A.elbow, 1.1, 1, (h, a) => (bent && h > 0.8 && Math.abs(a) < 1.2 ? s[0] : s))
    P[`arm${i}`][1] = j.limb(A.elbow, A.hand, 1, 0.9, (h, a) => (bent && h < 0.15 && Math.abs(a) < 0.9 ? f.at(-1) : f))
  })
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
  return { ...P, clasp: j.decal("_tr_clasp", [0, 1, 2].map((e) => j.chest[e] + j.f[e] * 3.8 + (e === 2 ? 0.2 : 0)), { depth: 2 }), neck: neck(j) }
}
const ALL8 = ["n", "ne", "e", "se", "s", "sw", "w", "nw"]
// cleaned as a pixel artist would at this size (surface's clean: no pixel sticking out, no black run
// 2 px thick, the outline whole), his head stamped on it by its heading
const FIG = { body: BODY3, w: W, h: H, pivot: [OX, OY], ink: "k", surface: LIT3 }
rig3d("tr", { ...FIG, n: 16, head: "_tr_head", parts: parts3m, blocks: true,
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
// (the bun a part of its own, so the line runs round it where it lies over the head)
const BUN = sdf.ellipsoid([2.6, 2.2, 2.4]).at(0, -6.2, 0).noise({ amp: 0.2, scale: 1, seed: 6 }).mat("JjhH").part("bun")
// her head drawn once per view as his, his face painted over it; turned away, her hair drawn back over
// the ears, the cheek closes in skin on a chin 3 px wide, the jaw's line up toward the ear and the neck
// under it in shadow (the render left a block of the skull's shade there, a jowl)
const FACE3_MO = {
  ...FACE3,
  sw: `
    ................
    ................
    ................
    ................
    ................
    ...SSSSSS.......
    ...SkSSkk.......
    ....ESSEG.s.....
    ....SLLeS.z.....
    .....SzSsDzj....
    ......sssD__....
    ......DDD__.....`,
  w: `
    .................
    .................
    .................
    .................
    .................
    ...SSS...........
    ..SkkSSs.........
    ..SEGSSzs........
    kSLSSSss.........
    ..DSSsDzjj.......
    ...DzsD_kk.......
    ....DD___........`,
}
views("_mo_head", sdf.union(SKULL, MO_HAIR, BUN), { ...HEAD3, retouch: FACE3_MO })
// (its names full ones, under an include's as: "mo" and what follows own("_mo") in each)
for (const n of rig3d("_mo", { ...FIG, head: "_mo_head", parts: parts3m, moves: MOVES3 }).names) anim("mo" + n.slice(own("_mo").length), { base: n, swap: MOURNER })
sheet("traveler", ["tr_*", "mo_*"], { rows: "tag", pad: 1 })
Object.assign(traveler, { FIG, MOVES: MOVES3, pace, dress, TRAVELER, SKULL, HEAD: HEAD3, FACE: FACE3, neck })
}
