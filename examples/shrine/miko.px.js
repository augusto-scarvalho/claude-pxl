// A miko (a shrine maiden) on the traveler's figure (examples/hd2d/traveler.px.js: rig3d's body, his walk
// and its pace, dress()), in her own outfit: the white kosode, its collar crossed, its wide sleeves hanging
// from the forearms; the red hakama from high on the waist to the ankles, pleated, flaring; white tabi.
// Her head the hybrid way, as his: modeled (his skull; black hair with straight bangs to the brows, side
// locks past the jaw, drawn back low and tied at the nape with a white paper ribbon, the rest hanging down
// her back), baked once per view, its face painted over it from the approved hand faces. Her moves: his
// walk and idle; the sweep with a bamboo broom (judged first as blocks, bk_sweep_<dir>); a bow.
// mk_<move>_<dir>; mikoFigure holds what a scene needs (the rig, the moves' timing, the pace).
include("../hd2d/traveler.px.js")
pal({
  k: "#1c1418",                                                     // outline
  L: "#fde6c6", S: "#f0c79e", s: "#d2966f", z: "#9c5b45", D: "#2e1a10", // skin (his), under the jaw
  J: "#221e2c", j: "#2e2a3c", h: "#3e384e", H: "#585070", Y: "#7c7498", // black hair (a step over the line), blue-violet in its light
  E: "#1f2f55", e: "#3a6aa2", G: "#f4f0e6",                         // the eyes (his)
  V: "#77718c", v: "#b2acbe", W: "#e2dcda", w: "#faf6ee",           // white silk, its shade a cool lavender
  d: "#6e1620", R: "#b02a2c", r: "#e04838",                         // the hakama's red
  t: "#4e4c22", y: "#9a983e",                                       // bamboo
  n: "#4a3018", N: "#7a5430", o: "#b08a50",                         // the broom's twigs
})
ramps("kzsSL", "kJjhHY", "kVvWw", "kdRr", "ty", "nNo")
const mikoFigure = {}
// in a block: its names stay its own when a scene includes the file
{
const T = travelerFigure, B3 = T.FIG.body, RAD = Math.PI / 180
const { add, mul, sub, unit } = vec

// ---------------------------------------------------------------- the outfit (dress()'s, his way)
const two = (near, far) => (isFar) => (isFar ? far : near)
// the hakama's pleats: a darker fold every 30 degrees round it
const pleats = (h, a, out) => (!out ? "d" : ((((a * 6) / Math.PI) % 1) + 1) % 1 < 0.2 ? "kdR" : "dRr")
// the kosode's collar crossed at the chest: two bands from the shoulders down to the hakama's top
const collar = (h, a) => h > 0.45 && Math.abs(Math.abs(a) - (1 - h) * 1.2) < 0.13
const MIKO = {
  ...T.TRAVELER, over: [],
  legs: (far) => ({ tr: far ? "kdR" : "dRr", shin: far ? "kdR" : "dRr", foot: far ? "VvW" : "vWw" }), cuff: 0.97,
  drapes: [{ base: "pelvis", top: (j) => j.pelvis[2] + 3.6, len: 13.6, out: pleats, in: "d", trail: 0.35, keep: () => true, radius: (h) => 3.7 + 2.1 * (1 - h) }],
  skirt: (h, a, out) => (out ? "dRr" : "d"),
  body: (h, a) => (h < 0.3 ? "dRr" : collar(h, a) ? "Vv" : "vWw"),
  sleeve: two("vWw", "VvW"), fore: two("vWw", "VvW"), hand: two("zsS", "zzs"),
}
// the dressed figure (the kosode's body along her spine, as dress() sweeps it: round an upright through
// the hips it stood as she bowed, a column her shoulders and head left, and swallowed her hair), and what
// dress() hasn't: the wide sleeves hanging from each forearm; the hair's tail down her back from the
// nape, lying along her back as she leans (hung plumb from a nape the lean carries forward, it ran inside her),
// pushed out to her back where the lean brings the nape over it
const parts = (j, p) => {
  const P = T.dress(MIKO)(j, p), farArm = j.depth(j.arms[0].sh) < j.depth(j.arms[1].sh) ? 0 : 1
  j.arms.forEach((A, i) => {
    const a = add(A.elbow, [0, 0, -2]), b = add(add(A.elbow, mul(sub(A.hand, A.elbow), 0.85)), [0, 0, -2.6])
    P[`sode${i}`] = j.limb(a, b, 1.9, 2.3, i === farArm ? "VvW" : "vWw")
  })
  const nape = add(add(j.head, mul(j.hd.f, -3.6)), [0, 0, -3.4])
  const back = unit(add(mul(j.sh.f, -1), mul(j.spine, vec.dot(j.sh.f, j.spine)))), top = add(nape, mul(back, Math.max(0, 3.6 - vec.dot(sub(nape, j.chest), back))))
  P.tail = j.limb(top, add(add(top, mul(j.spine, -9)), mul(back, 1.4)), 1.5, 1.0, "JjhH")
  return { ...P, neck: T.neck(j) }
}

// ---------------------------------------------------------------- the head
// His skull; the hair a cap close over it, a mass at the nape where it is gathered, side locks falling
// past the jaw, the face cut out of it, then straight bangs across the brow (cut level just above the
// eyes); the ribbon a white bow at the nape (its own part: the line runs round it).
const FACE_CUT = sdf.ellipsoid([4.2, 4.8, 4.6]).at(0, 4.2, -1.6)
const MK_HAIR = sdf.ellipsoid([5.1, 5.5, 5.1]).at(0, -0.4, 0.9)
  .union(sdf.ellipsoid([4.4, 3, 4]).at(0, -2.8, -2.8), sdf.capsule([-4.4, 1.5, 1.5], [-4.5, 1, -5.2], 1.1, 0.8), sdf.capsule([4.4, 1.5, 1.5], [4.5, 1, -5.2], 1.1, 0.8), { smooth: 1 })
  .subtract(FACE_CUT, { smooth: 0.4 })
  .union(sdf.ellipsoid([4.5, 1.7, 2.6]).at(0, 3.8, 2.4).intersect(sdf.plane([0, 0, -1], -0.5)), { smooth: 0.3 })
  .noise({ amp: 0.3, scale: 1.1, seed: 13 }).mat("JjhH")
const RIBBON = sdf.union(sdf.ellipsoid([2.4, 0.9, 1.2]).at(0, -6.1, -3.2), sdf.ellipsoid([0.8, 0.7, 1.8]).at(0, -6.2, -4.8)).mat("vWw").part("ribbon")
// the face: the approved hand faces (the traveler's FACE), their brow row left to the bangs (the row of the
// head's middle, its anchor's)
const FACE_MK = Object.fromEntries(Object.entries(T.FACE).map(([v, g]) => {
  const rows = g.split("\n"), r = rows.findIndex((l) => l.trim()) + T.HEAD.anchor[v][1]
  rows[r] = rows[r].replace(/\S/g, ".")
  return [v, rows.join("\n")]
}))
views("_mk_head", sdf.union(T.SKULL, MK_HAIR, RIBBON), { ...T.HEAD, retouch: FACE_MK })

// ---------------------------------------------------------------- the moves
// The sweep (approved as blocks): a bamboo broom (takebōki) in both hands, the left on top at her middle,
// the right lower on the handle; the broom's head on the ground ahead of her, swept from her right to
// her left in a flat arc (3 frames, the flick), held, then carried back a little off the ground (4
// frames); her shoulders turn with the stroke, her hips half as much, her head the other way to keep her
// eyes on the leaves; the left foot ahead, the knees a little bent, the body leaning over the broom.
const STROKE = [0, 0.45, 0.85, 1, 1, 0.75, 0.4, 0.12], OFF = [0, 0, 0, 0, 1.2, 1.8, 1.4, 0.5], LEAN = 14
const sweep = (i) => {
  const s = STROKE[i], down = 0.8 + 0.3 * Math.sin(Math.PI * s), cf = B3.torso * Math.sin(LEAN * RAD), cz = B3.hip - down + B3.torso * Math.cos(LEAN * RAD)
  // the grip (px: forward, right, up from under the pelvis, as her shoulders face): the top hand under her
  // chest (cf, cz), the broom's head on the ground, the lower hand on the line between them 2.8 px lower
  const top = [cf + 2.5, -0.8, cz - 4.5], head = [12 + 1.5 * Math.sin(Math.PI * s), 6 - 12 * s, OFF[i]]
  return { feet: [[1.4, -2.5], [-0.9, 2.5]], lift: [0, 0], down, lean: LEAN, turn: 5 * (1 - 2 * s), twist: 8 * (1 - 2 * s), head: -8 * (1 - 2 * s),
    grip: { from: top, to: head, at: [0, 2.8 / (top[2] - head[2])] }, trail: 0.2, sway: 0, stroke: s }
}
// the broom by hand after her: the handle from above the top hand through the lower one, the head a fan
// of twigs from a third of the way up to the ground; drawn where it is nearer us than her chest or on
// nothing, and never over her hands. As blocks, two flat colors; painted, bamboo with its nodes, seven
// twigs fanning out, their ends lighter.
const broomOf = (j) => { const [H0, G] = j.grip, up = sub(H0, G); return { H0, H1: j.arms[1].hand, G, up, across: unit([up[1], -up[0], 0]) } }
const BLOCK = { handle: "#c8d46a", twigs: "#7a5530" }
const drawBroom = (painted) => (c, j, p) => {
  const { H0, H1, G, up, across } = broomOf(j), chest = j.depth(j.chest), hands = [H0, H1].map((q) => j.screen(q).map(Math.round))
  const put = (q, key, handle) => {
    const [x, y] = j.screen(q).map(Math.round)
    if (painted && handle && hands.some(([hx, hy]) => Math.abs(hx - x) + Math.abs(hy - y) <= 1)) return
    if (j.depth(q) > chest - 1 || !c.get(x, y)) c.px(x, y, key)
  }
  if (!painted) {
    for (let t = 0.35; t <= 1.3; t += 0.02) put(add(G, mul(up, t)), BLOCK.handle)
    for (let t = 0; t <= 0.38; t += 0.02) for (let u = -1; u <= 1; u += 0.08) put(add(add(G, mul(up, t)), mul(across, u * 4 * (1 - t / 0.42))), BLOCK.twigs)
    return
  }
  for (let k = -3; k <= 3; k++) for (let t = 0; t <= 1; t += 0.04) put(add(add(G, mul(up, 0.36 * (1 - t))), mul(across, k * 1.3 * t)), t > 0.8 ? "o" : k % 2 ? "N" : "n")
  for (let t = 0.34; t <= 1.3; t += 0.02) put(add(G, mul(up, t)), Math.round(t * 50) % 7 === 0 ? "t" : "y", true)
}
// The bow (ojigi): from standing, the body leaning forward from the hips to about 26 degrees, the hands
// coming together in front of the thighs, held, then up again. 12 frames of 120 ms.
const BOW = [0, 0.35, 0.75, 1, 1, 1, 1, 1, 0.8, 0.5, 0.2, 0]
const bow = (i) => {
  const k = BOW[i], hand = (s) => [1.8 * k, s * (1 - 3.4 * k), -7 + 0.6 * k]
  return { feet: [[0, -2.1], [0, 2.1]], lift: [0, 0], down: 0.4 * k, lean: 26 * k, trail: 0.15, sway: 0, hands: [hand(-1), hand(1)] }
}
const MOVES = { walk: T.MOVES.walk, idle: T.MOVES.idle, sweep: { frames: 8, ms: 110, pose: sweep, draw: drawBroom(true) }, bow: { frames: 12, ms: 120, pose: bow } }
// (a little wider and taller than his: the broom reaches ahead of her, down the picture in front)
const FIG = { ...T.FIG, w: 40, h: 50, pivot: [20, 41] }
const R = rig3d("mk", { ...FIG, head: "_mk_head", parts, moves: MOVES })
// the sweep as it was judged, in blocks: bk_sweep_<dir>
rig3d("_mkb", { body: B3, w: FIG.w, h: FIG.h, pivot: FIG.pivot, blocks: true, moves: { sweep: { ...MOVES.sweep, draw: drawBroom(false) } } })
Object.assign(mikoFigure, { rig: R, MOVES, pace: T.pace, STROKE })
}
// To look at: the miko in her 8 directions, standing, then mid-stroke of the sweep.
scene("miko_dirs", { w: 8 * 40, h: 2 * 50 + 4, bg: "#56606e" },
  ...["s", "sw", "w", "nw", "n", "ne", "e", "se"].flatMap((d, i) => [stamp(`mk_idle_${d}`, 20 + i * 40, 43), stamp(`mk_sweep_${d}`, 20 + i * 40, 93, { frame: 2 })]))
