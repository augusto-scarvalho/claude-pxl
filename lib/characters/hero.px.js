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
// frame; G32 (a chibi, in blocks so far) and SLIM32 (a slim body seen from 15 degrees, painted in hero32.px.js) at
// topdown32's 48 px with moves of their own and the games' sword attack (library F5 4a-4f).
// Others are made from him by hero.character(name, { hair, outfit, swap, ... }): his body and moves, a hair model
// of their own, an outfit by dress(), his face. Taken with include("<path>/lib/characters/hero.px.js", { as: "hero" })
// (the hd2d plaza's: examples/hd2d/plaza.px.js; with palette: true to make characters); examples/topdown_hero/hero.px.js
// shows him on the grass.
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
  5: "#8f8f9e", 6: "#d6d6e2", 7: "#b0b0c0",              // the blocks' sword and smear, the smear fading
  M: "#6aa04f", m: "#619749", o: "#578c43", O: "#43703a", // grass, close in value; its shade (examples/topdown_hero)
})
ramps("kzsS", "kjhYL", "kDdl", "knbc", "kPp", "kg", "kwW", "OomM")
// the hero for a scene: his sizes, his moves and their timing (MOVES[move].ms), his rig (its joints), the maker (a var:
// the villagers and Reva each include this file, so a scene that takes them both runs it twice)
var hero = {}
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
// The 48 px cell (topdown32; library F5 4a, in blocks so far), the genre's 2.5 heads: the body 56.2 px and 2.96 heads
// in 3D (the head's radius 9.5), on the sprite 48 rows over the ground with its line in every view, facing us the head
// 20 of them (42%: LPC's base 40-45%; 2.4 heads), the torso 17 to the crotch and the legs 11 (LPC's base 20, 16 and 11
// of 47), 27 px wide facing us and 24 in profile; the hip 15.4 over the sole and the torso 22 (1.4 times the legs,
// LPC's 1.7). Library F5 4g grew the torso and the legs a row each (1.41 px), the head kept. The head's middle 33 rows
// over the foot point, so it moves by whole pixels, its radius a half so the blocks' head rounds alike in every view
// (topdown32's height check). k 2: the bob, the boxes, the sword and the cut; `legs` and `arms` how much longer his
// legs and arms are than the 24 px hero's (14 against 5.2, 14 against 5), `reach` as far under the shoulder as the
// arm is long (13 of 14): the stride, the feet's lift and the hands' swing scale by them. The frames 38 x 64 (the genre's
// 32 x 64 can't hold the run: the fists 33 px across facing us, the leaning head 19 px ahead of the feet in
// profile). Its moves the slim's (library F5 4d), the hips and shoulders turned less (its torso wide, its arms
// short), its stride facing s or n half itself (`deep`, as the slim's), its soles on one row in every view by rig3d's own
// `soles` (its feet nearer us standing lower seen from 45 degrees: facing s 2 rows over the profile's, n 4). The
// sword half its height (24 px: a short sword for short arms; the games' 0.6-0.7 on slim bodies) and the attack's
// frame 96 x 96 to hold the cut round him.
const G32 = {
  body: { h: 56.17, heads: 2.96, hip: 15.41, thigh: 7.78, shin: 6.23, ankle: 1.4, torso: 22.01, neck: 9.25, hips: 4.8, shoulders: [0, 7.8, -1.8],
    r: { leg: [3.2, 3, 2.8], arm: [2, 1.8, 1.6], body: [6, 6.4], head: 9.5, hand: 2, foot: [3, 4, 1.8] } },
  k: 2, legs: 2.69, arms: 2.8, pitch: 45, level: Math.SQRT2, reach: 13, out: 1.8, deep: 0.5, soles: true, sword: { grip: 1.5, len: 12 },
  frame: { w: 38, h: 64, pivot: [17, 54] }, attack: { w: 96, h: 96, pivot: [48, 76] }, sole: 5,
  foot: [10, 6], hurt: 10,
}
// The 48 px cell's other family of body (topdown32; library F5 4b-4f): slim, as Children of Morta's and Chained
// Echoes' figures are (a small head, long legs; measured for numbers only), from the traveler's proportions
// (lib/characters/traveler.px.js: the head a third, the legs longer than the torso). Seen from 15 degrees, as those
// games draw their figures (library F5 4f: Children of Morta's walk spreads the feet 4-5 rows facing us against 15-16
// px in profile, sin 14-18 degrees, and its belt is a row lower in its middle; Chained Echoes' belt level): what
// stands faces us, the tops of the shoulders and of the head hardly seen (from 45, as the chibi, they read as a
// hunch); the ground stays the genre's 45. The body 44.1 px and 3.4 heads in 3D (the head's radius 6.5), on the
// sprite 48 rows over the ground with its line, the head 14 of them (29%), the legs 18 (37%), 17 px wide facing us
// and 14 in profile (the head; the chest 11); the hip 19.7 over the sole, the torso 11.4 and the neck 8.2 (the
// shoulders 3 rows under the chin, Chained Echoes' 2-4: higher, they read shrugged), the shoulders over a narrower
// waist. The head's middle 38 rows over the foot point, so it moves by whole pixels. k 2 as G32's (the bob, the
// boxes, the sword); `legs` and `arms` how far the moves' feet and hands go (the 24 px hero's by 3.9 and 3.86: the
// stride in profile 13 px, 0.28 of the height, its leg's reach); `reach` past the arm's length, so the arms hang
// and swing straight (a long arm bent by the idle's lag reads akimbo), the hands half a px out (`out`: by the
// thighs); the near hand 0.3 back in profile, its soles on one row in every view by rig3d's own `soles` (as G32's:
// facing n its feet 2.9 px nearer us), the stride facing s or n 0.8 of itself (`deep`: facing n the full stride, its
// feet that much nearer, is out of the back leg's reach), 3 rows. What is level (the cut) at the ground's true shape
// (`level`, 1 / sin 15), what rises or falls out from the fist as tall as from 45 (`upright`, cos 45 / cos 15: the
// blade pointed down at the end of the cut 8 rows under the soles, as approved, not 16); the foot box as deep on the
// screen as the 45 degree ground draws it (5 by sin 45 / sin 15).
// The frames the genre's 32 x 64; the attack's 96 x 96, to hold the sword the games carry (29 px, 0.6 of the height:
// Children of Morta's 0.72, Dead Cells' 0.65) and the cut round him. Its moves its own (SLIM32.moves, under the
// shared ones).
const SLIM32 = {
  body: { h: 44.1, heads: 3.39, hip: 19.69, thigh: 9, shin: 8.72, ankle: 1.97, torso: 11.43, neck: 8.22, hips: 2.6, shoulders: [0, 5.6, -2.2], upper: 6.2, fore: 6.3,
    r: { leg: [2.2, 1.9, 1.6], arm: [1.4, 1.2, 1.1], body: [3.4, 4.8], head: 6.5, hand: 1.4, foot: [2, 3.2, 1.4] } },
  k: 2, legs: 3.9, arms: 3.86, pitch: 15, level: 1 / Math.sin(Math.PI / 12), upright: Math.SQRT1_2 / Math.cos(Math.PI / 12), reach: 12.6, out: 0.5, near: 0.3, soles: true, deep: 0.8, sword: { grip: 2, len: 14.5 },
  frame: { w: 32, h: 64, pivot: [15, 54] }, attack: { w: 96, h: 96, pivot: [48, 76] }, sole: 2,
  foot: [7, 13.66], hurt: 7,
}

// ---------------------------------------------------------------- the moves, once, in the 24 px hero's px
// (topdown16's states: idle 6 at 200/200/400/200/200/400, walk 4 x 210, run 8 x 70, attack 6 at 100/50/50/50/100/50)
const MS = { idle: [200, 200, 400, 200, 200, 400], walk: 210, run: 70, attack: [100, 50, 50, 50, 100, 50] }
const R = Math.PI / 180
// A pose from the moves' numbers, scaled to the cell: each foot [forward, up], the pelvis down, the lean, each
// hand [forward, out from the body, up] from where it hangs, the shoulders' twist; anything else passes on. The
// pelvis down by whole pixels on the screen (a pixel is 1.41 px in 3D at 45 degrees). In profile the near hand
// hangs a little back, so the belt and the tunic's front show past it. Facing s or n the lean an eighth of itself
// (over k: a sixteenth at 48 px, so the head moves as little): seen from above a lean only drops the head facing us
// and lifts it facing away, and the figure stands as tall whichever way it faces (topdown16's height check: a
// quarter, the first paint's at 30 degrees, left the run facing s a pixel short). The feet by the cell's `legs`, the
// hands hanging and swinging by its `arms` (k unless it says), the cut's fist by k as its blade. No drapes swing
// (dress()'s trail and sway 0). A cell may say how far back the near hand hangs (`near`, 1.3), and `deep`, the share
// of the stride facing s or n (from 45 degrees a stride runs down the screen: a long leg's 3D stride spreads the
// feet 11 rows where the games draw 3-5).
// `rise` (the chest and the head over a still pelvis) by whole pixels on the screen as `down`.
const posed = (G, { feet = [[0, 0], [0, 0]], down = 0, rise = 0, lean = 0, hands = [[0, 0, 0], [0, 0, 0]], twist = 0, ...rest }, heading) => {
  const k = G.k, s = G.legs ?? k, a = G.arms ?? k, w = G.body.hips, near = heading === 90 ? 1 : heading === 270 ? 0 : -1, deep = near < 0 ? G.deep ?? 1 : 1
  return { trail: 0, sway: 0, ...rest, ...(rise ? { rise: (rise * k) / Math.cos(G.pitch * R) } : {}), twist, lean: near < 0 ? lean / (8 * k) : lean, down: (down * k) / Math.cos(G.pitch * R), feet: feet.map(([f], i) => [f * s * deep, (i ? 1 : -1) * w]), lift: feet.map(([, u]) => u * s),
    hands: hands.map(([f, o, u, lag = 0], i) => (rest.hand && i ? rest.hand.map((v) => v * k) : [(f - (i === near ? G.near ?? 1.3 : 0)) * a, (i ? 1 : -1) * (G.out + o * a), -G.reach + u * a + lag * k])) }
}
// Idle: a breath, the body a pixel down from frame 1 to 3 (2 held 400) and back up from 4 to 0 (5 held 400), 800 ms
// each way (a slow plain bob carries a small sprite: characters §10), the arms a frame behind it: the hands' fourth
// number, a lag in the body's pixels (by k, as the bob), not a swing (by `arms`: a long arm lifted 3 px bent akimbo).
const BREATH = [0, 1, 1, 1, 0, 0]
const idle = (i) => ({ down: BREATH[i], hands: [0, 1].map(() => [0, 0, 0, BREATH[i] - BREATH[(i + 5) % 6]]) })
// The elbows bent back, the way elbows bend, as the arms swing: the run's in every view, the walk's in profile
// (rig3d's default hint, mostly down, bent the arm swung back forward there: pxl check's elbow).
const BACK = [-1, 0.5, 0]
// The walk, A B A D at 210: A passing, the swinging foot up; B the right foot forward, D the left; the body a
// pixel down at each step; the hand across from the forward foot swings forward.
const STEP = { A: [0, 0], B: [-2, 2], D: [2, -2] }
const walk = (i, heading) => {
  const s = STEP["ABAD"[i]], swing = s[1] / 2
  return { feet: [[s[0], i === 2 ? 0.8 : 0], [s[1], i === 0 ? 0.8 : 0]], down: [0, 1, 0, 1][i], lean: 3, hands: [[swing * 0.8, 0, 0], [-swing * 0.8, 0, 0]], ...(heading % 180 ? { elbow: BACK } : {}) }
}
// The run, A B C B A D E D at 70 (SLYNYRD's): A passing at the lowest (a pixel down), B half a stride, C the full
// stride on a straight front leg, the back foot kicked up (a flight frame floats a 24 px figure by a pixel, which
// pxl check calls floating; the ground never shows it); leant forward, the arms bent and pumping across.
const RUN = { A: [0, 0, 1], B: [1.5, 0.6, 0.2], C: [2.5, 1.8, 0.5] }
const run = (i) => {
  const key = "ABCBADED"[i], [f, kick, down] = RUN[key === "D" ? "B" : key === "E" ? "C" : key], side = "DE".includes(key) ? -1 : 1
  const feet = side > 0 ? [[-f, kick], [f, 0]] : [[f, 0], [-f, kick]]
  const pump = (s) => [2 * s * (f / 2.5), 0.3, 2.6 + 0.8 * Math.abs((s * f) / 2.5)]
  return { feet, down, lean: 10, hands: [pump(side), pump(-side)], elbow: BACK }
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

// ---------------------------------------------------------------- the slim body's own moves (SLIM32; library F5 4c)
// The chibi's moves on long legs read stiff at 48 px (the user): legs locked straight, a 2 px breath that bends the
// knees, a 4-drawing walk, arms swung a few px, the body in one piece. These follow what moves the games' slim bodies
// (Children of Morta, Chained Echoes, Final Fantasy Resonance, Dead Cells; measured for numbers only, library F5's
// motion study): the hips turned toward the forward leg and the shoulders against them (`turn`, `twist`, the head
// kept on the way he faces), the head a frame behind the pelvis's bob (`rise`), the knee bent as the weight lands,
// the arms in an arc, the forward hand up and its elbow bent. A cycle of 8 (C8: 1 at frame 0, -1 at frame 4); a
// foot's [forward, up] over its cycle from its contact ahead, the other foot 4 frames on.
const C8 = (i) => Math.cos((i * Math.PI) / 4), turned = (i, T) => ({ turn: -T * C8(i), twist: 2 * T * C8(i), head: -T * C8(i) })
// Idle (the genre's 6 at 200/200/400/200/200/400): the breath in the chest, a pixel up, the hands a frame behind;
// the pelvis and the knees still (Children of Morta's and Dead Cells' 1 px; the legs' rows never change).
const slimIdle = (i) => ({ rise: BREATH[i] / 2, hands: [0, 1].map(() => [0, 0, 0, -0.7 * (BREATH[i] - BREATH[(i + 5) % 6])]) })
// Walk, 8 at 105 (the genre's 840 ms cycle in 8: contact, down, passing, up), the stride 0.33 of the height: the
// pelvis a pixel down from contact to down, the head a frame later (lowest at down, highest at up: 2 px); the hips
// 8 degrees, the shoulders as much against them; the hands 6 px ahead and 5 behind, the forward one 5 px up.
const WALK8 = { foot: [[1.7, 0], [0.85, 0], [0, 0], [-0.85, 0], [-1.7, 0], [-1.9, 0.35], [0, 0.8], [1, 0.3]], down: [0.5, 0.5, 0, 0], rise: [0, -0.5, -0.5, 0] }
// A body may swing its forward hand otherwise (`arm`: how far ahead and how far up at the swing's end, by `arms`).
const arc = (x, [a, b] = [1.6, 1.2]) => (x > 0 ? [a * x, 0, b * x] : [1.2 * x, 0, -0.2 * x])
const slimWalk = (T, arm) => (i) => ({ feet: [WALK8.foot[(i + 4) % 8], WALK8.foot[i]], down: WALK8.down[i % 4], rise: WALK8.rise[i % 4], lean: 4,
  hands: [arc(C8(i), arm), arc(-C8(i), arm)], elbow: [-1, 0.15, -0.5], ...turned(i, T) })
// Run, 8 at the genre's 70, eight poses (no ping-pong): contact, down (the knee bent, the pelvis lowest), push-off,
// flight (both feet up: air); the back foot kicks up behind and passes high, the knee driving forward after it (a
// foot lifted under the body bends the swing knee up: a squat); the head a frame behind; leant 12 degrees, the hips 10
// against the shoulders; the arms bent, pumping from the hip to the chest, the elbows back and down by the body
// (swung far back, an elbow rises over the shoulder seen from 45 degrees: wings).
const RUN8 = { foot: [[1.8, 0], [0.6, 0], [-0.8, 0], [-1.9, 0.6], [-1.6, 1.4], [-0.7, 1.7], [0.8, 1.2], [1.8, 0.3]], down: [0.5, 0.75, 0.5, 0], rise: [0, 0, -0.5, 0.5] }
const pump = (x) => (x > 0 ? [1.8 * x, -0.3 * x, 1.5 + 2.1 * x] : [0.6 * x, 0, 1.5])
const slimRun = (T, up = 1) => (i) => ({ feet: [RUN8.foot[(i + 4) % 8], RUN8.foot[i]], down: RUN8.down[i % 4], rise: RUN8.rise[i % 4] * up, lean: 12, air: i % 4 === 3,
  hands: [pump(C8(i)), pump(-C8(i))], elbow: [-1, 0.15, -1], ...turned(i, T) })

// ---------------------------------------------------------------- the sword attack at 48 px (G32, SLIM32; library F5 4d)
// What the games' sword attacks do (Children of Morta, Dead Cells, Chained Echoes, Final Fantasy Resonance; measured
// for numbers only: library F5's sword study): a wind-up of 2 frames (the blade drawn back behind the right shoulder
// and raised, the body coiled away and crouched 4-5 px, the free arm forward; the peak held), the strike on one
// frame with the blade already across and the whole sweep a crescent (205 degrees, from his right-back round his
// front to his left), the hit held 100 ms, the blade on round and up over his left shoulder as the crescent goes
// darker then breaks (Children of Morta's follow-through ends high behind him), two frames back to the guard. 8
// frames, 630 ms (the genre's 6 at 400 can't hold a wind-up, a hold and a fade).
// Each key: where the blade points (`at`, degrees round from the way he faces toward his right, the ground's frame;
// `up` above level), the fist's distance from the right shoulder, the hips' turn and the shoulders' twist on them
// (the head keeps 0.7 of its way to the target), the lean, how low, the right foot's step, the free hand; `smear`
// the crescent that frame: "full" the sweep from the wind-up's peak, "fade" darker, what it swept since light and
// its tail gone, "broken" three thin pieces of its outer edge toward its head.
const SLASH = [
  { at: 115, up: 20, hand: 3.5, turn: 15, twist: 35, lean: -2, down: 1.2, step: 0, free: [1.5, 0, 0.5] },
  { at: 150, up: 30, hand: 3, turn: 25, twist: 55, lean: -5, down: 2.25, step: -0.5, free: [3, 0.5, 1.5] },
  { at: -55, up: -5, hand: 4.5, turn: -20, twist: -40, lean: 12, down: 1.75, step: 1.75, free: [-1.5, 0, 0.5], smear: "full" },
  { at: -85, up: -12, hand: 4.5, turn: -25, twist: -55, lean: 12, down: 1.75, step: 1.75, free: [-2, 0, 0], smear: "fade" },
  { at: -110, up: 2, hand: 4, turn: -25, twist: -60, lean: 9, down: 1.5, step: 1.75, free: [-1.5, 0, 0], smear: "broken" },
  { at: -125, up: 22, hand: 3.5, turn: -20, twist: -50, lean: 6, down: 1.2, step: 1.5, free: [-1, 0, 0] },
  { at: -60, up: -15, hand: 3, turn: -10, twist: -25, lean: 4, down: 0.7, step: 0.75, free: [-0.5, 0, 0] },
  { at: 10, up: -48, hand: 2.5, turn: 0, twist: 0, lean: 2, down: 0.2, step: 0.25, free: [0, 0, 0] },
]
const slash = (i, heading) => {
  const K = SLASH[i], a = (K.at - K.turn - K.twist) * R, e = K.up * R
  // the fist on the blade's line out from the right shoulder, in the shoulders' frame [forward, right, up]; the lean
  // only as far as it lies across the picture (the shoulders turned to face away or toward us, a lean only lifts or
  // drops the head: the figure as tall in every view, as posed() keeps it facing s or n)
  return { feet: [[-K.step * 0.5, 0], [K.step, 0]], down: K.down, lean: K.lean * Math.abs(Math.sin((heading + K.turn + K.twist) * R)), turn: K.turn, twist: K.twist, head: -0.7 * (K.turn + K.twist), hands: [K.free, [0, 0, 0]],
    hand: [K.hand * Math.cos(e) * Math.cos(a), K.hand * Math.cos(e) * Math.sin(a), K.hand * Math.sin(e)], slash: i }
}
// In a draw hook: the crescent first (the tip's path from the wind-up's peak to this frame's way, round the right
// shoulder, its inner edge closing from nothing at the tail to 0.55 of the blade at its head; no line), then the blade
// from the pommel to the tip, two px wide (its flat seen from above, the edge on the side it cuts toward, light) and
// the guard across it, by j.rod in the figure's depth (behind him where it swings round his back), a line round what
// lies on nothing. Out from the fist what is level is drawn at the ground's true shape (`level`), what rises or falls
// `upright` times as tall (1 unless the cell says). The hit box round what the crescent swept, on the strike and the hold. Painted in the cell's `paint` keys (lib/characters/hero32.px.js):
// the blade's (a key, or one along it from the pommel), the edge's and the guard's, and the crescent's smear(kind, u),
// u where along the strike's sweep (past 1, what it swept since); the blocks in their greys.
const BLOCK_SWORD = { blade: "5", edge: "6", guard: "5", smear: (kind, u) => (kind === "full" || (kind === "fade" && u > 1) ? "6" : "7") }
const wayAt = (j, at, up) => { const h = j.heading * R, a = at * R, e = up * R; return [Math.cos(e) * (Math.cos(a) * Math.sin(h) + Math.sin(a) * Math.cos(h)), Math.cos(e) * (Math.cos(a) * Math.cos(h) - Math.sin(a) * Math.sin(h)), Math.sin(e)] }
const slashDraw = (G, blocks) => (c, j, p) => {
  if (p.slash === undefined) return
  const K = SLASH[p.slash], k = G.k, len = G.sword.len * k, sh = j.arms[1].sh, hits = [], S = (q) => j.screen(q).map(Math.round)
  const key = blocks ? BLOCK_SWORD : G.paint
  // a point r px along the blade pointing w from the fist, h px out from the shoulder that way
  const out = (w, h, r) => add(add(sh, mul(w, h)), [w[0] * r, w[1] * r * G.level, w[2] * r * (G.upright ?? 1)])
  if (K.smear) {
    const A = SLASH[1], B = SLASH[2], N = 240, W = 0.55 * len
    for (let s = 0; s <= N; s++) {
      const t = s / N, at = A.at + (K.at - A.at) * t, w = wayAt(j, at, A.up + (K.up - A.up) * t), h = (A.hand + (K.hand - A.hand) * t) * k
      // where along the strike's sweep (A to B) this way is: past 1, what it swept since
      const u = (A.at - at) / (A.at - B.at)
      if (K.smear === "full") j.rod(out(w, h, len - W * t ** 0.6), out(w, h, len), key.smear("full", u))
      else if (K.smear === "fade" && u > 0.35) j.rod(out(w, h, len - W * Math.min(1, u) ** 0.6), out(w, h, len), key.smear("fade", u))
      else if (K.smear === "broken" && [[0.5, 0.58], [0.68, 0.82], [0.92, 1.08]].some(([a, b]) => u > a && u < b)) j.rod(out(w, h, len - 1), out(w, h, len), key.smear("broken", u))
      if (K.smear !== "broken") hits.push(S(out(w, h, len - W)), S(out(w, h, len)))
    }
  }
  const d = wayAt(j, K.at, K.up), h = K.hand * k, edge = wayAt(j, K.at - 90, 0), across = wayAt(j, K.at + 90, 0).map((v, e) => v * 1.3 * k * (e === 1 ? G.level : 1)), was = c.img.data.slice()
  j.rod(out(d, h, -G.sword.grip * k), out(d, h, len), key.blade)
  j.rod(add(out(d, h, 1.5), edge), add(out(d, h, len), edge), key.edge)
  const guard = out(d, h, 1.2 * k)
  j.rod(add(guard, across), add(guard, mul(across, -1)), key.guard)
  // (a line round the sword, not the crescent, where it lies on nothing)
  const ink = []
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) if (c.get(x, y) !== was[c.index(x, y)]) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if ((c.get(x + dx, y + dy) & 255) < 128) ink.push([x + dx, y + dy])
  for (const [x, y] of ink) c.px(x, y, "k")
  if (hits.length) {
    const xs = hits.map((q) => q[0]), ys = hits.map((q) => q[1]), x0 = Math.min(...xs), y0 = Math.min(...ys)
    c.setBox("hit", x0, y0, Math.max(...xs) - x0 + 1, Math.max(...ys) - y0 + 1)
  }
  c.setData({ phase: p.slash < 2 ? "startup" : hits.length ? "active" : "recovery" })
}
const SLASHES = { frames: 8, ms: [90, 110, 50, 100, 70, 70, 70, 70], f: slash, draw: slashDraw }
// the slim's (library F5 4f): the forward arm nearly straight, its hand 7.7 px ahead and 3.5 up at the swing's end,
// ahead of the hip (bent to 6.2 ahead and 4.6 up, the forearm lay level at the crotch). Its passing leg stays folded
// under the hip: angled back as Children of Morta's John's, the user preferred the fold.
SLIM32.moves = { idle: { ...MOVES.idle, f: slimIdle }, walk: { frames: 8, ms: 105, f: slimWalk(8, [2, 0.9]) }, run: { ...MOVES.run, f: slimRun(10) }, attack: SLASHES }
// the chibi's: the hips and shoulders turned 5 degrees walking, 6 running, its run's head rising 0.6 as far (its
// big head a row taller facing n at the full rise)
G32.moves = { idle: { ...MOVES.idle, f: slimIdle }, walk: { frames: 8, ms: 105, f: slimWalk(5) }, run: { ...MOVES.run, f: slimRun(6, 0.6) }, attack: SLASHES }

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
// the hurt box (the body: the head's top to the soles, `hurt` px wide over the pelvis); the foot and `hurt` in the
// 24 px hero's px (by k), the head's radius already the cell's
const boxes = (G) => (c, j) => {
  const [fw, fd] = G.foot.map((v) => v * G.k), a = j.screen([-fw / 2, fd / 2, 0]), b = j.screen([fw / 2, -fd / 2, 0])
  c.setBox("foot", Math.round(a[0]), Math.round(a[1]), Math.round(b[0] - a[0]), Math.round(b[1] - a[1]) + 1)
  const top = j.screen(j.head)[1] - G.body.r.head, mid = j.screen(j.pelvis), sole = j.screen([0, 0, 0])
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
const movesOf = (list, blocks, G = G16, M = G.moves ?? MOVES) => Object.fromEntries(list.map((m) => [m, { frames: M[m].frames, ms: M[m].ms, pose: (i, hd) => posed(G, M[m].f(i, hd), hd),
  ...(m === "attack" ? { draw: (M[m].draw ?? sword)(G, blocks) } : {}) }]))
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
Object.assign(hero, { G16, G32, SLIM32, MOVES, SLASH, movesOf, boxes, rig: { ...rig, pose: (m, i, heading) => posed(G16, MOVES[m].f(i, heading), heading) }, character, PLAIN, SKULL, SHORT, FACE, BROW, STRANDS, rows, over })
}
