// A top-down action hero, and the base the genre's other people are made from (topdown16: an action RPG seen from
// above at a 16 px grid): idle, walk, run and a sword attack facing down, up and to the side; the game flips the
// side for the fourth direction. Seen from 45 degrees (topdown16's figures and ground) with a chibi's body, 2.1
// heads in 3D and the torso twice the legs, as The Minish Cap's and A Link to the Past's heroes (library F5's
// top-down study, measured for numbers only): on the sprite 26 px tall with its line, the head 14 of them (54%,
// 1.85 heads), 15 px wide facing us and 16 in profile. Drawn the traveler's way (lib/characters/traveler.px.js):
// a rig3d() skeleton dressed by the traveler's dress() (dress.px.js: a plain blue tunic, a belt with a gold
// buckle, dark trousers, brown boots); the head the skull and a hair model of its own, baked once per view by
// views() and its face painted by hand. A near-black line all round, 3 tones a material (the hair 4: its strands'
// light), 15 colors. His moves at the genre's timings (after SLYNYRD, characters §12), judged first as flat blocks
// (_hb_<move>_<dir>); their sizes (G16) apart from the moves (the fighting study's way). The sword is a part of
// his own in the right hand, out only in the attack, a hit box on its active frames; foot and hurt boxes on every
// frame. Others are made from him by hero.character(name, { hair, outfit, swap, ... }): his body and moves, a hair
// model of their own, an outfit by dress(), his face. Taken with include("<path>/lib/characters/hero.px.js",
// { as: "hero" }) (the hd2d plaza's: examples/hd2d/plaza.px.js; with palette: true to make characters);
// examples/topdown_hero/hero.px.js shows him on the grass.
include("../profiles/topdown16.px.js")
include("dress.px.js")   // dress(): what a figure wears, the traveler's painter
pal({
  k: "#1a1620",                                           // the line all round (topdown16's ink), the pupils
  z: "#a8644f", s: "#de9f76", S: "#f6cfa5",               // skin
  j: "#4e2519", h: "#7f3f25", Y: "#b5653a", L: "#d68b52", // the hair: the gaps between its strands, its shade, its mass, its light
  D: "#4e2519", d: "#7f3f25", l: "#b5653a",               // leather (the boots, the belt): the hair's browns, keys of their own
  n: "#31508e", b: "#4c7fd0", c: "#7db4ec",               // the blue tunic
  P: "#3e3852", p: "#5f5878",                             // dark trousers
  g: "#f2c64e",                                           // gold: the buckle, the guard
  W: "#eef5fb", w: "#7db4ec",                             // the eyes' white, the blade's edge and its smear; the blade (the tunic's light)
  5: "#8f8f9e", 6: "#d6d6e2",                             // the blocks' sword and smear
  M: "#6aa04f", m: "#619749", o: "#578c43", O: "#43703a", // grass, close in value; its shade (examples/topdown_hero)
})
ramps("kzsS", "kjhYL", "kDdl", "knbc", "kPp", "kg", "kwW", "OomM")
// the hero for a scene: his sizes, his moves and their timing (MOVES[move].ms), his rig (its joints), the maker
const hero = {}
// in a block: its names stay its own when a scene includes the file
{
// ---------------------------------------------------------------- the sizes: a cell's numbers in its px
// The body 27 px and 2.1 heads in 3D (the head's radius 6.43), the legs short (the hip 6 over the sole, the torso
// 8: The Minish Cap's and A Link to the Past's torso twice their legs), as wide as the 24 px figure (the arms and
// the head 15 px across facing us), the arms against the torso; the head's middle 19.9 over the sole, 14 rows over
// it seen from 45 degrees, so the head stamped there moves by whole pixels. k: these px over the 24 px hero's,
// which the moves are written in; `reach` how far under the shoulder the hands hang, `out` how far out. `level`:
// what is level (the cut) drawn at the ground's true shape (scenes §16), its depth stretched 1 / sin(45). The sword
// from the fist: the pommel `grip` behind, the tip `len` ahead. The frames: the genre's contract 18 x 32 (its
// 16 x 32 can't hold the profile: the head 16 px deep with its hair leans a pixel ahead walking and two running),
// the attack 32 x 40; the pivot the feet's point, a column behind the frame's middle for that lean; the game's
// anims stand on the row under the soles' line, `sole` rows lower (the old hero's pivot, where scenes put his
// feet). The foot box the stance on the ground [across, deep], the hurt box `hurt` wide over the body.
const G16 = {
  body: { h: 27, heads: 2.1, hip: 6, thigh: 3, shin: 2.2, ankle: 0.8, torso: 8, neck: 5.9, hips: 2.4, shoulders: [0, 4.3, -0.9],
    r: { leg: [1.6, 1.5, 1.4], arm: [1.1, 1, 0.9], body: [3.2, 3.4], head: 6.43, hand: 1.1, foot: [1.5, 2, 0.9] } },
  k: 1, pitch: 45, level: Math.SQRT2, reach: 4.6, out: 1.36, sword: { grip: 1.5, len: 8 },
  frame: { w: 18, h: 32, pivot: [8, 27] }, attack: { w: 32, h: 40, pivot: [16, 31] }, sole: 4,
  foot: [10, 6], hurt: 10,
}

// ---------------------------------------------------------------- the moves, once, in the 24 px hero's px
// (topdown16's states: idle 6 at 200/200/400/200/200/400, walk 4 x 210, run 8 x 70, attack 6 at 100/50/50/50/100/50)
const MS = { idle: [200, 200, 400, 200, 200, 400], walk: 210, run: 70, attack: [100, 50, 50, 50, 100, 50] }
const R = Math.PI / 180
// A pose from the moves' numbers, scaled to the cell: each foot [forward, up], the pelvis down, the lean, each
// hand [forward, out from the body, up] from where it hangs, the shoulders' twist; anything else passes on. The
// pelvis down by whole pixels on the screen (a pixel is 1.41 px in 3D at 45 degrees). In profile the near hand
// hangs a little back, so the belt and the tunic's front show past it. Facing s or n the lean an eighth of itself:
// seen from above a lean only drops the head facing us and lifts it facing away, and the figure stands as tall
// whichever way it faces (topdown16's height check: a quarter, the first paint's at 30 degrees, left the run facing
// s a pixel short). No drapes swing (dress()'s trail and sway 0).
const posed = (G, { feet = [[0, 0], [0, 0]], down = 0, lean = 0, hands = [[0, 0, 0], [0, 0, 0]], twist = 0, ...rest }, heading) => {
  const k = G.k, w = G.body.hips, near = heading === 90 ? 1 : heading === 270 ? 0 : -1
  return { trail: 0, sway: 0, ...rest, twist, lean: near < 0 ? lean / 8 : lean, down: (down * k) / Math.cos(G.pitch * R), feet: feet.map(([f], i) => [f * k, (i ? 1 : -1) * w]), lift: feet.map(([, u]) => u * k),
    hands: hands.map(([f, o, u], i) => (rest.hand && i ? rest.hand : [(f - (i === near ? 1.3 : 0)) * k, (i ? 1 : -1) * (G.out + o * k), -G.reach + u * k])) }
}
// Idle: a breath, the body a pixel down from frame 1 to 3 (2 held 400) and back up from 4 to 0 (5 held 400), 800 ms
// each way (a slow plain bob carries a small sprite: characters §10), the arms a frame behind it.
const BREATH = [0, 1, 1, 1, 0, 0]
const idle = (i) => ({ down: BREATH[i], hands: [0, 1].map(() => [0, 0, BREATH[i] - BREATH[(i + 5) % 6]]) })
// The walk, A B A D at 210: A passing, the swinging foot up; B the right foot forward, D the left; the body a
// pixel down at each step; the hand across from the forward foot swings forward.
const STEP = { A: [0, 0], B: [-2, 2], D: [2, -2] }
const walk = (i) => {
  const s = STEP["ABAD"[i]], swing = s[1] / 2
  return { feet: [[s[0], i === 2 ? 0.8 : 0], [s[1], i === 0 ? 0.8 : 0]], down: [0, 1, 0, 1][i], lean: 3, hands: [[swing * 0.8, 0, 0], [-swing * 0.8, 0, 0]] }
}
// The run, A B C B A D E D at 70 (SLYNYRD's): A passing at the lowest (a pixel down), B half a stride, C the full
// stride on a straight front leg, the back foot kicked up (a flight frame floats a 24 px figure by a pixel, which
// pxl check calls floating; the ground never shows it); leant forward, the arms bent and pumping across.
const RUN = { A: [0, 0, 1], B: [1.5, 0.6, 0.2], C: [2.5, 1.8, 0.5] }
const run = (i) => {
  const key = "ABCBADED"[i], [f, kick, down] = RUN[key === "D" ? "B" : key === "E" ? "C" : key], side = "DE".includes(key) ? -1 : 1
  const feet = side > 0 ? [[-f, kick], [f, 0]] : [[f, 0], [-f, kick]]
  const pump = (s) => [2 * s * (f / 2.5), 0.3, 2.6 + 0.8 * Math.abs((s * f) / 2.5)]
  return { feet, down, lean: 10, hands: [pump(side), pump(-side)] }
}
// The sword attack (characters §10 and §12, a melee with weight: SLYNYRD's sword): a wind-up held 100 ms, three
// active frames of 50 (the first already past the target, its smear the last 90 degrees of the way it came), the
// follow-through a little further held 100, the recovery 50. One move in every view: a level cut round him at
// waist height from his right side (drawn back there, no higher than his head), across his front, to his left.
// Each key: where the blade points (`at`, degrees round him from straight ahead toward his right, `up` above
// level; the first active frame 18 degrees out to his right, so facing s it doesn't lie along his leg), how far
// the fist is from the right shoulder, the shoulders' twist (leading the cut; the head stays on the target, the
// way he faces: its three painted views), the lean, the right foot's step, how low, the free hand; `wide` the
// smear's depth in px (none: no smear).
const CUT = [
  { at: 105, up: 15, hand: 3.5, twist: 30, lean: -3, step: -0.5, down: 0, free: [1.5, 0, 1] },
  { at: 18, up: 0, hand: 4, twist: 5, lean: 8, step: 1.5, down: 0.6, free: [-1.5, 0, 0.5], wide: 6 },
  { at: -45, up: -10, hand: 4, twist: -20, lean: 10, step: 1.5, down: 0.8, free: [-1.5, 0, 0.5], wide: 4 },
  { at: -75, up: -10, hand: 4, twist: -30, lean: 10, step: 1.5, down: 0.8, free: [-1, 0, 0.5], wide: 2 },
  { at: -85, up: -12, hand: 3.5, twist: -35, lean: 8, step: 1.5, down: 0.6, free: [-0.5, 0, 0.5] },
  { at: -30, up: -40, hand: 3, twist: -10, lean: 3, step: 0.5, down: 0.2, free: [0, 0, 0] },
]
const attack = (i) => {
  const K = CUT[i], a = (K.at - K.twist) * R, e = K.up * R
  // the fist on the blade's line out from the right shoulder, in the shoulders' frame [forward, right, up]
  return { feet: [[-K.step * 0.5, 0], [K.step, 0]], down: K.down, lean: K.lean, twist: K.twist, head: -K.twist, hands: [K.free, [0, 0, 0]],
    hand: [K.hand * Math.cos(e) * Math.cos(a), K.hand * Math.cos(e) * Math.sin(a), K.hand * Math.sin(e)], cut: i }
}
const MOVES = { idle: { frames: 6, ms: MS.idle, f: idle }, walk: { frames: 4, ms: MS.walk, f: walk }, run: { frames: 8, ms: MS.run, f: run }, attack: { frames: 6, ms: MS.attack, f: attack } }

// ---------------------------------------------------------------- the sword, its smear and the boxes
const add = (a, b) => a.map((v, e) => v + b[e]), mul = (a, s) => a.map((v) => v * s)
// a way round him in the hips' frame (`at` degrees from ahead toward his right, `up` above level)
const way = (j, at, up) => { const a = at * R, e = up * R; return add(add(mul(j.f, Math.cos(e) * Math.cos(a)), mul(j.r, Math.cos(e) * Math.sin(a))), [0, 0, Math.sin(e)]) }
// In a draw hook: the smear first, a crisp angular crescent (the blade's outer part swept from the last key's way
// to this one's round the right shoulder, at most 90 degrees of it, in 3 straight runs: its outer edge at the tip,
// its inner edge closing in from nothing to `wide` px at the blade; no line), then the blade from the pommel to the
// tip and the guard across it, drawn by j.rod in the figure's depth, a line round what lies on nothing. Out from
// the fist, what is level is drawn at the ground's true shape: its depth stretched `level` times. The hit box round
// what the blade swept in the frame (the guard to the tip, the smear's angles) on the frames that have a smear.
// Keys: the blocks' greys, or the paint's (the smear W, the eyes' white; the blade w, the tunic's light under a key of
// its own, its last 3 px W; the guard g, the grip leather): no color of its own, the sprite stays at 15.
const sword = (G, blocks) => (c, j, p) => {
  if (p.cut === undefined) return
  const K = CUT[p.cut], k = G.k, len = G.sword.len * k, sh = j.arms[1].sh, hits = []
  // a point r px out along the way w from the right shoulder, the fist h px out on it
  const out = (w, r, h) => add(sh, add(mul(w, h), [w[0] * (r - h), w[1] * (r - h) * G.level, w[2] * (r - h)]))
  const S = (q) => j.screen(q).map(Math.round)
  if (K.wide) {
    const P = CUT[p.cut - 1], from = Math.min(P.at, K.at + 90), key = blocks ? "6" : "W"
    // the crescent's edges at 4 points (u 0 to 3), straight between them, filled by rods across
    const edge = (u) => {
      const t = u / 3, w = way(j, from + (K.at - from) * t, P.up + (K.up - P.up) * t), h = (P.hand + (K.hand - P.hand) * t) * k
      return [out(w, h + len, h), out(w, h + len - Math.max(0.6, K.wide * t) * k, h), out(w, h + 1.2 * k, h)]
    }
    const E = [0, 1, 2, 3].map(edge), lerp = (a, b, t) => a.map((v, e) => v + (b[e] - v) * t)
    for (let s = 0; s <= 60; s++) {
      const u = (s / 60) * 3, i = Math.min(2, Math.floor(u)), t = u - i, [o0, i0, g0] = E[i], [o1, i1, g1] = E[i + 1]
      j.rod(lerp(i0, i1, t), lerp(o0, o1, t), key)
      hits.push(S(lerp(g0, g1, t)), S(lerp(o0, o1, t)))
    }
  }
  const d = way(j, K.at, K.up), h = K.hand * k, tip = out(d, h + len, h), guard = out(d, h + 1.2 * k, h), across = way(j, K.at + 90, 0).map((v, e) => v * 1.3 * k * (e === 1 ? G.level : 1))
  const blade = blocks ? "5" : (t) => (t < 0.13 ? "D" : t < 0.7 ? "w" : "W"), was = c.img.data.slice()
  j.rod(out(d, h - G.sword.grip * k, h), tip, blade)
  j.rod(add(guard, across), add(guard, mul(across, -1)), blocks ? "5" : "g")
  // (a line round the sword, not the smear, where it lies on nothing)
  const ink = []
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) if (c.get(x, y) !== was[c.index(x, y)]) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if ((c.get(x + dx, y + dy) & 255) < 128) ink.push([x + dx, y + dy])
  for (const [x, y] of ink) c.px(x, y, "k")
  if (K.wide) {
    hits.push(S(tip))
    const xs = hits.map((q) => q[0]), ys = hits.map((q) => q[1]), x0 = Math.min(...xs), y0 = Math.min(...ys)
    c.setBox("hit", x0, y0, Math.max(...xs) - x0 + 1, Math.max(...ys) - y0 + 1)
  }
  c.setData({ phase: p.cut === 0 ? "startup" : K.wide ? "active" : "recovery" })
}
// every frame: the foot box (the stance on the ground, the same every frame: what the world collides with) and
// the hurt box (the body: the head's top to the soles, `hurt` px wide over the pelvis)
const boxes = (G) => (c, j) => {
  const [fw, fd] = G.foot.map((v) => v * G.k), a = j.screen([-fw / 2, fd / 2, 0]), b = j.screen([fw / 2, -fd / 2, 0])
  c.setBox("foot", Math.round(a[0]), Math.round(a[1]), Math.round(b[0] - a[0]), Math.round(b[1] - a[1]) + 1)
  const top = j.screen(j.head)[1] - G.body.r.head * G.k, mid = j.screen(j.pelvis), sole = j.screen([0, 0, 0])
  c.setBox("hurt", Math.round(mid[0] - (G.hurt * G.k) / 2), Math.round(top), G.hurt * G.k, Math.round(sole[1] - top) + 1)
}

// ---------------------------------------------------------------- the outfit, through the traveler's dress()
// His parts as he is dressed (ramps dark to light; the far limbs a step darker): the trousers down to 0.6 of the
// shin, then the boots; the tunic's skirt at the hips, its body with the belt and the gold buckle in front; the
// sleeves to the elbow, the forearms and hands bare; a neck under the head. An outfit is dress()'s fields
// (dress.px.js, the traveler's painter).
const PLAIN = {
  legs: (far) => ({ tr: far ? "PPp" : "Ppp", shin: far ? "DDd" : "Ddl", foot: far ? "DDd" : "Ddl" }), cuff: 0.6,
  drapes: [], over: [], skirt: (h, a, out) => (out ? "nnb" : "n"),
  body: (h, a) => (h < 0.1 ? (Math.abs(a) < 0.35 ? "g" : "Dd") : "nbc"),
  sleeve: (far) => (far ? "nnb" : "nbc"), fore: (far) => (far ? "zzs" : "zsS"), hand: (far) => (far ? "zzs" : "zsS"),
}
const dressed = (outfit) => (j, p) => ({ ...dress(outfit)(j, p), neck: j.limb(j.chest, [j.head[0], j.head[1], j.head[2] - 4.5], 1.3, 1.2, "zs") })

// ---------------------------------------------------------------- the head: the skull, and the hair a model of its own
// Modeled in the head's frame (x his right, y ahead, z up) for a head of radius 5, scaled to his. The base's hair:
// plain and short, a cap a row over the skull cut away at the face from the brow down, a mass at the nape, a side
// parting, a fringe of three locks to the brow, tousled a little. Baked once per view (views(): s, w and n at 45
// degrees; the east the west's mirror) into a square of 31 px whose middle (15, 15) is the head's, then painted by
// hand (characters §5, §6), row by row ("." keeps the render's pixel):
// - FACE, every head's: facing us the eyes 2 x 2 (the white outside, the pupil in), 3 px of skin between, the nose
//   the skin's lightest, the face 11 px wide; in profile (w; e its mirror) the face 6 px, the eye 2 x 2 (the pupil
//   in front, a pixel of skin before it), the nose a single pixel of the lightest skin in the line's column, the ear
//   two pixels of skin and their shade behind the cheek;
// - BROW, the fringe's dark edge right over the eyes;
// - STRANDS, the hair model's own: a lighter mass, 2-3 dark gaps (j) fanning from the crown, the light (L) on the
//   strands' tops by the crown, the shade (h) low and at the sides; from behind, the gaps down to the nape.
const SKULL = sdf.ellipsoid([4.3, 4.5, 4.6]).mat("zsS")
const SHORT = sdf.ellipsoid([4.75, 4.85, 4.2]).at(0, -0.5, 0.9).union(sdf.ellipsoid([3.6, 2.4, 2.8]).at(0, -3, -1.4), { smooth: 0.9 })
  .subtract(sdf.ellipsoid([4.2, 4.3, 4.3]).at(0, 3.6, -1.5), sdf.capsule([-1.4, 4, 4], [-1.2, -1.4, 5], 0.35), { smooth: 0.35 })
  .union(sdf.capsule([-2.3, 3.1, 3.4], [-2.5, 4.3, 2.0], 0.7, 0.35), sdf.capsule([0.3, 3.4, 3.7], [0.6, 4.6, 2.2], 0.7, 0.35), sdf.capsule([2.4, 3.0, 3.4], [2.7, 4.2, 2.0], 0.7, 0.35), { smooth: 0.45 })
  .noise({ amp: 0.3, scale: 1.2, seed: 4 }).mat("jhY")
const HEAD = { pitch: G16.pitch, ink: "k", jaw: ["z", "zsS"], surface: { soft: 0.55, tones: 4 }, anchor: [15, 15] }
const headOf = (hair) => sdf.union(SKULL, hair).scale(G16.body.h / G16.body.heads / 2 / 5)
// rows(size, { row: text }): a retouch grid, the rest kept; over(...grids): a later grid's keys over an earlier one's
const rows = (n, G) => Array.from({ length: n }, (_, y) => G[y] ?? ".".repeat(n)).join("\n")
const over = (...gs) => gs.filter(Boolean).reduce((a, b) => a.split("").map((c, i) => (b[i] !== "." && b[i] !== "\n" ? b[i] : c)).join(""))
const FACE = {
  s: rows(31, {
    18: ".........kssWksSskWssk.........",
    19: "..........zsWkssskWsz..........",
    20: "...........zsssSsssz...........",
  }),
  w: rows(31, {
    17: ".........kskWsszs..............",
    18: ".........kskWsszsz.............",
    19: ".........Sssssszz..............",
    20: ".........kzssssz...............",
    21: "..........kzzzzz...............",
  }),
}
const BROW = { s: rows(31, { 17: ".........khhjjhYhjjhhk........." }), w: rows(31, { 16: "........kjjjjjYYYYYYYhhk......." }) }
const STRANDS = {
  s: rows(31, {
    8: "...........kkhLLLYkk...........",
    9: "..........khYLjLLjYhk..........",
    10: ".........khYYjLYLYjhk..........",
    11: "........khYYjYYjYYjYhk.........",
    12: "........khYYjYYjYYYjYhk........",
    13: "........khYjYYhjYYhjYhk........",
    14: "........khhjYYYhjYYjhhk........",
    15: "........khhjYYhYjYhjhhk........",
    16: ".........khjYYhYjYhjhhk........",
  }),
  w: rows(31, {
    7: "............kkkkk..............",
    8: "...........kkLLLYhkk...........",
    9: "..........kYLLjLjLYhk..........",
    10: ".........khYLjLYYjYhhk.........",
    11: "........khYYjYYYYYjYYhk........",
    12: "........khYjYYYhYYYjYhk........",
    13: "........khjYYYhYYYYhjhhk.......",
    14: "........kYjYYhYYYYhYjhhk.......",
    15: "........kjYYhYYYYhYYYjhk.......",
    17: "................hYYhhhhk.......",
    18: ".................hhhhhk........",
    19: "................hhhhhhk........",
    20: "...............zhhhhhk.........",
    21: "................kkkkk..........",
  }),
  n: rows(31, {
    8: "...........kkkkLLkkk...........",
    9: "..........khYLjLjLYhk..........",
    10: "..........khYjYLYjYhk..........",
    11: ".........khYjYYjYYjYhk.........",
    12: ".........khYjYYjYYjYYk.........",
    13: "........khYjYYYjYYYjYhk........",
    14: "........khYjYYYjYYYjYhk........",
    15: "........khhjYYhjYYhjhhk........",
    16: "........khhjhYhjhYhjhhk........",
    17: "........khhhjhhjhhjhhk.........",
    18: ".........khhjhhjhhjhhk.........",
  }),
}

// ---------------------------------------------------------------- a figure from the base
// character(name, { hair, strands, brow, outfit, swap, moves }): his body and moves dressed in `outfit` (dress()'s,
// PLAIN by default), the head the skull and the `hair` model (a field in the head's frame, SHORT's scale; its
// keys the hair's, j h Y), baked and painted with his FACE, the hair's own `strands` grids (s, w, n; none: the
// render's) and `brow` (the fringe's edge; BROW by default), recolored by `swap` (his keys: j h Y L the hair, n b c
// the tunic, P p the trousers, D d l the leather, z s S the skin). It makes <name>_<move>_<down, up, side> (the
// hero's own with no name: idle_down, ...), standing on the row under the soles, for `moves` (["idle", "walk",
// "run"] by default; "attack" in its own 32 x 40 frames, with the sword), and gives back the rig of the walking
// moves (or the attack's): its joints. A file that makes one includes this one with { as: "hero", palette: true }.
const LIT = { soft: 0.55, tones: 3, clean: true }, DIRS = [["down", "s"], ["up", "n"], ["side", "e"]]
const movesOf = (list, blocks) => Object.fromEntries(list.map((m) => [m, { frames: MOVES[m].frames, ms: MOVES[m].ms, pose: (i, hd) => posed(G16, MOVES[m].f(i), hd),
  ...(m === "attack" ? { draw: sword(G16, blocks) } : {}) }]))
const character = (name, { hair = SHORT, strands = STRANDS, brow = BROW, outfit = PLAIN, swap, moves = ["idle", "walk", "run"] } = {}) => {
  const id = name || "hero", at = name ? `${name}_` : "", rigs = {}
  views(`_hd_${id}`, headOf(hair), { ...HEAD, retouch: { s: over(strands.s, brow.s, FACE.s), w: over(strands.w, brow.w, FACE.w), ...(strands.n ? { n: strands.n } : {}) } })
  const fig = (rn, list, F) => rig3d(rn, { body: G16.body, headings: ["s", "e", "n"], pitch: G16.pitch, w: F.w, h: F.h, pivot: F.pivot, ink: "k", surface: LIT,
    parts: dressed(outfit), head: `_hd_${id}`, moves: movesOf(list, false), draw: boxes(G16), genre: "topdown16" })
  const walking = moves.filter((m) => m !== "attack")
  if (walking.length) rigs.walk = fig(`_r_${id}`, walking, G16.frame)
  if (moves.includes("attack")) rigs.attack = fig(`_ra_${id}`, ["attack"], G16.attack)
  for (const m of moves) for (const [dir, d] of DIRS) {
    const [px, py] = (m === "attack" ? G16.attack : G16.frame).pivot
    anim(`${at}${m}_${dir}`, { base: `_r${m === "attack" ? "a" : ""}_${id}_${m}_${d}`, pivot: [px, py + G16.sole], ...(swap ? { swap } : {}) })
  }
  return rigs.walk ?? rigs.attack
}

// ---------------------------------------------------------------- the hero
// For the game, by the old names: every move facing down (s), up (n) and to the side (e), tagged idle_down,
// walk_up, run_side, attack_down, ...; and each move as its flat blocks (_hb_<move>_<dir>).
const rig = character("", { moves: ["idle", "walk", "run", "attack"] })
for (const [n, list, F] of [["_hrb", ["idle", "walk", "run"], G16.frame], ["_hrba", ["attack"], G16.attack]])
  rig3d(n, { body: G16.body, headings: ["s", "e", "n"], pitch: G16.pitch, w: F.w, h: F.h, pivot: F.pivot, ink: "k", blocks: "_hb", moves: movesOf(list, true), draw: boxes(G16) })
// The four views at rest, the blocks under them; the fourth view the side flipped, as the game shows it.
sprite("views", { w: 72, h: 64 },
  ...DIRS.map(([dir], k) => stamp(`idle_${dir}`, 18 * k + 9, 31, { frame: 5 })), stamp("idle_side", 63, 31, { frame: 5, flip: "x" }),
  ...DIRS.map(([, d], k) => stamp(`_hb_idle_${d}`, 18 * k + 9, 60, { frame: 5 })), stamp("_hb_idle_e", 63, 60, { frame: 5, flip: "x" }))
sheet("hero", ["idle_*", "walk_*", "run_*", "attack_*"], { rows: "tag", pad: 1 })   // a move and a direction a row
card("walk_down", { is: "a top-down action hero and the genre's base body, a chibi seen from 45 degrees in a blue tunic: idle, walk, run and a sword attack facing down, up and to the side", cells: { "topdown/16": "✓" },
  vary: { part: "its moves: idle_, walk_, run_, attack_ down, up and side (flipped for the fourth), on the sheet hero; its blocks _hb_<move>_<s, e, n>; others made from it by hero.character(name, { hair, outfit, swap })" } })
// the rig: its joints for a pose (hero.rig.joints(hero.rig.pose("walk", 1, 180), 180)) and where a point lands
// (hero.rig.screen(p), in the 18 x 32 frame), to place 2D parts at them
Object.assign(hero, { G16, MOVES, rig: { ...rig, pose: (m, i, heading) => posed(G16, MOVES[m].f(i), heading) }, character, PLAIN, SKULL, SHORT, FACE, BROW, STRANDS, rows })
}
