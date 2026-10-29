// The top-down hero (hero.px.js) seen from the side, for a platformer at a 16 px grid (platformer16): the same
// person in a second genre. Idle, walk, run, dash, the jump in four (jump, apex, fall, land) and hurt facing e (the
// game flips him for w) at the genre's timings, on the sheet hero_side, a row a move (the dash's afterimage and dust
// after them), the pivot the row under his soles. 32 px tall with his line, 2 tiles, 2.5 heads: Mega Man X's hero's
// size and head (library F5's platformer study, measured for numbers only). The body between the study's thin
// top-down rig and X's bulk, upright, the elbows bent back; the moves judged first as flat blocks (_hsb_<move>_e),
// approved by the user. Drawn the traveler's way: a rig3d() skeleton seen at pitch 0, dressed by dress() in the
// hero's plain blue tunic, belt with the gold buckle, dark trousers and brown boots (hero.PLAIN, thicker); the head
// the hero's skull and short hair (hero.SKULL, hero.SHORT) baked in profile by views(), its face painted by hand: a
// 2 x 2 eye under the fringe, a one-pixel nose, the ear. A near-black line outside him and where one part passes
// over another (rig3d's ink), 3 tones a material (the hair 4), 15 colors, lit from above and flat side to side. A
// small hurt box at his middle on every frame (scenes §15); in the frames' data `air` off the ground, `loop` on the
// frames a game repeats (the rise, the fall, the dash held), the dash's `dust` and `ghost`; the hit flash on the
// hurt's first frame. Taken with include("<path>/lib/characters/hero_side.px.js", { as: "hero_side" }); the hero's
// people side on by heroSide.character(name, { hair, strands, face, outfit, swap, moves }), as hero.character()
// makes them top-down.
include("hero.px.js", { as: "hero", palette: true })
include("../profiles/platformer16.px.js")
include("../vfx/dust.px.js", { as: "dust" })
var heroSide = {}
// in a block: its names stay its own when a scene includes the file
{
// ---------------------------------------------------------------- the sizes: the side cell at the 16 px grid
// The body 30 px and 2.5 heads in 3D (32 with the line all round): the head's radius 5.4 (13 rows with its line),
// its middle 23.8 over the sole; the legs 9.9 to the ankle (the hip 11 over the sole: straight standing), the arms
// 7.8 (3.9 a bone), hanging `reach` 7.2 under the shoulder (a little bent), `out` from it. Thicker than the top-down
// hero (its limbs vanish side on at 32 px), thinner than X's armor: legs 2 -> 2.15 at the boot, arms 1.4 -> 1.25,
// fists 1.7, the torso 4.3-4.4 deep, the boots 2.7 long; his clothes as thick (dress()'s `r`). The frame the
// genre's 32 x 48, the foot point at [15, 45] (the dash's 40 x 48 at [19, 45]: its held pose is 27 px long), the game's
// anims standing on the row under the soles, `sole` rows lower. The elbows' hint behind him; `raised` with a hand at or over the shoulder. The hurt box [w, h] at the
// middle of his torso.
const SIDE16 = {
  body: { h: 30, heads: 2.5, hip: 11, thigh: 5.4, shin: 4.5, ankle: 1.1, torso: 7.6, neck: 5.2, hips: 2.7, shoulders: [0.6, 5.2, -1], upper: 3.9, fore: 3.9,
    r: { leg: [2, 2, 2.15], arm: [1.4, 1.3, 1.25], body: [4.3, 4.4], head: 5.4, hand: 1.7, foot: [2.05, 2.7, 1.2] } },
  reach: 7.2, out: 0.3, frame: { w: 32, h: 48, pivot: [15, 45] }, dash: { w: 40, h: 48, pivot: [19, 45] }, sole: 2, hurt: [8, 14],
  elbow: [-1, 0.5, 0], raised: [-1, 0.5, -1],
}

// ---------------------------------------------------------------- the moves, in this cell's px (the blocks')
// A pose: each foot [forward, up] (the far, left foot first; the near, right foot second: facing e he shows his
// right side), the pelvis down, the lean, each hand [forward, out, up] from where it hangs, the elbows' hint;
// `air` on the frames off the ground; `flash` the hit flash.
const posed = (S, { feet = [[0, 0], [0, 0]], down = 0, lean = 0, hands = [[0, 0, 0], [0, 0, 0]], elbow = S.elbow, ...rest }) => ({ ...rest, down, lean, elbow,
  feet: feet.map(([f], i) => [f, (i ? 1 : -1) * S.body.hips]), lift: feet.map(([, u]) => u),
  hands: hands.map(([f, o, u], i) => [f, (i ? 1 : -1) * (S.out + o), -S.reach + u]) })
// Idle 4 at 400/200/400/200: a breath, the body down a pixel (half on the frames between), the arms a frame late;
// leant 1. Set wide (X's stance, his feet 12 px apart): the feet 3 ahead and behind (the pelvis half a pixel lower,
// the knees soft), the near hand a little ahead (1: at 3 it hid the buckle) and the far one at his back, so the
// silhouette isn't a column (12 px across at the blocks' 1.2 and 0.3).
const BREATH = [0, 0.5, 1, 0.5]
const idle = (i) => ({ feet: [[-3, 0], [3, 0]], down: 0.5 + BREATH[i], lean: 1, hands: [-2.2, 1].map((f) => [f, 0.1, BREATH[i] - BREATH[(i + 3) % 4]]) })
// Walk 8 at 125 ms (1 s a cycle; characters §12: SLYNYRD's game walk 8 at 140, final boss blues' 8 at 100-150;
// Symphony of the Night's Alucard walks in 16 drawings, Mega Man X and Zero don't walk): contact, down (the lowest),
// passing (the highest), reach; then the other side. Upright (lean 2), a stride of 7 px (the run's 11), the free foot
// low (1.8 at passing, a little ahead of the planted one: at 1.3 over it, the far planted boot vanished under the
// near one, its sliver cleaned away), always a foot down, a bob of 1 px, the arms hanging loose, swinging 2.2 at the hips.
const WLEGS = [
  { plant: [3.5, 0], free: [-3.5, 0], down: 0.8 },
  { plant: [1.5, 0], free: [-2.2, 0.8], down: 1.2 },
  { plant: [-0.5, 0], free: [0.6, 1.8], down: 0.3 },
  { plant: [-2.5, 0], free: [2.5, 0.5], down: 0.5 },
]
const loose = (s) => [2.2 * s, 0.1, 0.3 * Math.abs(s)]
const walk = (i) => {
  const L = WLEGS[i % 4], near = i < 4, s = [1, 0.6, 0, -0.6][i % 4]   // near: the near (right) leg planted ahead
  return { feet: near ? [L.free, L.plant] : [L.plant, L.free], down: L.down, lean: 2, hands: near ? [loose(s), loose(-s)] : [loose(-s), loose(s)] }
}
// Run 8 at 75: contact, down (the lowest), passing, up (the highest); then the other side. A foot on the ground every
// frame; the pelvis 2 px from its lowest to its highest (bob 2). Leant 15 from the hips, the back straight and the
// head along the spine (12 hardly read side on; the blocks' 5 read as a jog). The arms pump opposite the legs, the
// elbows near 90 degrees and behind: each fist from the hip behind (B) to the chest ahead (F), 5.5-5.9 px from the
// shoulder (the bones 3.9 each), [forward, out, up] from where the hand hangs, 7.2 under the shoulder.
const LEGS = [
  { plant: [5.5, 0], free: [-5.5, 1.5], down: 1.8 },
  { plant: [2, 0], free: [-4, 3.5], down: 2.8 },
  { plant: [-0.8, 0], free: [0.6, 4.5], down: 1.8 },
  { plant: [-3.2, 0], free: [3.8, 3], down: 0.8 },
]
const FIST = { F: [5, 0.2, 4.5], B: [-3.5, 0.2, 2.5] }
const pump = (s) => FIST.F.map((v, e) => FIST.B[e] + ((v - FIST.B[e]) * (s + 1)) / 2)
const run = (i) => {
  const L = LEGS[i % 4], near = i < 4, swing = [1, 0.7, 0.1, -0.7][i % 4]   // near: the near (right) leg planted
  return { feet: near ? [L.free, L.plant] : [L.plant, L.free], down: L.down, lean: 15, hands: near ? [pump(swing), pump(-swing)] : [pump(-swing), pump(swing)] }
}
// The jump, from what the references' jumps share (Mega Man X, Zero 3, ZX Advent's Ashe, Symphony of the Night's
// Richter, Dawn of Sorrow's Soma, Celeste's Madeline: library F5's jump study), split so a game can loop the rise and
// the fall: `air` on every frame off the ground, `loop` on the frames to repeat while rising or falling.
// jump 4 at 60/60/80/80: the anticipation (a crouch, 88%, the arms swung back: the GBA and DS games' 93-97%), the
// take-off (stretched, leaving the ground, the arms swinging up), the rise twice (stretched 103-106%, the near knee
// up, the far leg trailing, the near fist to the chin: X's 2 rise drawings, Zero's and Ashe's 6; looped while rising).
const JUMP = [
  { feet: [[-1.5, 0], [1.5, 0]], down: 3.5, lean: 10, hands: [[-2.5, 0.3, 1.5], [-2, 0.3, 1.5]] },
  { feet: [[-1.2, 1], [1.4, 1.6]], down: -0.8, lean: 5, hands: [[1, 0.3, 4], [1.5, 0.3, 5]], air: true },
  { feet: [[-1, 1], [2.5, 4.5]], down: -1, lean: 3, hands: [[-2, 0.3, 1.5], [2.5, 0.3, 8.5]], elbow: SIDE16.raised, air: true, loop: true },
  { feet: [[-1.2, 1.3], [2.4, 4.8]], down: -1.2, lean: 3, hands: [[-2.2, 0.3, 1.8], [2.4, 0.3, 8.2]], elbow: SIDE16.raised, air: true, loop: true },
]
// apex 2 at 100: the tuck, both knees up (88-91%), the arms out, held 200 ms (the hang: the references' 1-3 drawings,
// Soma's 8, Richter's ball at 72%; Madeline's is her gravity's).
const APEX = [
  { feet: [[-0.6, 4], [1.8, 5]], down: 0, lean: -2, hands: [[-2.5, 0.8, 3], [3, 0.8, 5.5]], air: true },
  { feet: [[-0.5, 4.2], [1.9, 5.2]], down: 0.1, lean: -2, hands: [[-2.6, 0.8, 3.3], [3.1, 0.8, 5.8]], air: true },
]
// fall 3 at 80/100/100: the turn (untucking, the legs starting down: Zero's, Ashe's and Richter's 2), then the fall
// twice (the legs reaching down apart, the arms up and out; looped while falling, as Madeline's fallSlow and fallFast,
// 2 at 100 ms).
const FALL = [
  { feet: [[-1.6, 2.4], [2.2, 2]], down: -0.3, lean: -3, hands: [[-2.4, 1, 4.6], [2.4, 1, 5.2]], air: true },
  { feet: [[-2.5, 1.5], [2, 0.8]], down: -0.5, lean: -3, hands: [[-2.5, 1, 5.6], [2.5, 1, 6]], air: true, loop: true },
  { feet: [[-2.8, 1.8], [2.4, 1]], down: -0.5, lean: -3, hands: [[-2.2, 1, 6.2], [2.2, 1, 6.6]], air: true, loop: true },
]
// land 3 at 60: the pre-landing reach (the legs down to meet the ground, the front foot ahead: X's and Ashe's), then
// X's two: the crouch of the impact (88%; the references' 89-98%), rising, 2 px under standing.
const LAND = [
  { feet: [[-1.4, 0.6], [2, 0.6]], down: 0, lean: 2, hands: [[-1.5, 0.8, 3.5], [2, 0.8, 4]], air: true },
  { feet: [[-2, 0], [2, 0]], down: 3.5, lean: 8, hands: [[1.5, 0.5, 2], [2.5, 0.5, 2.5]] },
  { feet: [[-1.8, 0], [1.8, 0]], down: 2, lean: 4, hands: [[0.6, 0.2, 1], [1, 0.2, 1]] },
]
// Hurt 3 at 120/240/120 (Richter's): thrown back, the hit flash on it; down on a knee; getting up.
const HURT = [
  { feet: [[-2, 0], [1.5, 1.5]], down: 0.5, lean: -15, hands: [[3, 1, 4], [3.5, 1, 5]], elbow: SIDE16.raised, flash: true },
  { feet: [[-4.5, 1], [3, 0]], down: 5, lean: 15, hands: [[0.5, 0.3, 1], [2, 0.3, 3]] },
  { feet: [[-2, 0], [2, 0]], down: 2.5, lean: 8, hands: [[1, 0.3, 2], [1.5, 0.3, 2.5]] },
]
// Dash 6 at 60/60/90/90/80/120 (Mega Man X's: a start drawing, crouched, 97% of his height; a held one long and low,
// 81% of his height, the back leg trailing, the front knee bent; the start again to stop; no timing on a sheet:
// characters §12's dash at the run's pace): the push-off crouched, the launch, the held pose twice (looped while the
// dash lasts: `loop`), the brake, rising. `dust` where a puff goes (the frame's data: the back heel at the launch and each
// held loop, the front foot at the brake, kicked ahead), `ghost` the held frames behind which the afterimages go.
const DASH = [
  { feet: [[-2, 0], [1.5, 0]], down: 2.5, lean: 15, hands: [[-3, 0.3, 2], [1.5, 0.3, 1]] },
  { feet: [[-4.5, 0], [2.5, 0]], down: 3, lean: 28, hands: [[-4, 0.5, 3], [-2.5, 0.5, 2]], dust: 0 },
  { feet: [[-7, 0], [3, 0]], down: 3, lean: 40, hands: [[-4.5, 0.6, 4], [-3.5, 0.6, 3]], dust: 0, ghost: true, loop: true },
  { feet: [[-6.7, 0], [3.2, 0]], down: 3.2, lean: 40, hands: [[-4.8, 0.6, 4.6], [-3.8, 0.6, 3.6]], ghost: true, loop: true },
  { feet: [[-3, 0], [2.5, 0]], down: 2.5, lean: 12, hands: [[-1.5, 0.3, 1.5], [1, 0.3, 1]], dust: 1 },
  { feet: [[-1.5, 0], [1.5, 0]], down: 1, lean: 5, hands: [[0, 0, 0.5], [0.5, 0, 0.5]] },
]
const MOVES = {
  idle: { frames: 4, ms: [400, 200, 400, 200], f: idle },
  walk: { frames: 8, ms: 125, f: walk },
  run: { frames: 8, ms: 75, f: run },
  dash: { frames: 6, ms: [60, 60, 90, 90, 80, 120], f: (i) => DASH[i] },
  jump: { frames: 4, ms: [60, 60, 80, 80], f: (i) => JUMP[i] },
  apex: { frames: 2, ms: 100, f: (i) => APEX[i] },
  fall: { frames: 3, ms: [80, 100, 100], f: (i) => FALL[i] },
  land: { frames: 3, ms: 60, f: (i) => LAND[i] },
  hurt: { frames: 3, ms: [120, 240, 120], f: (i) => HURT[i] },
}
const movesOf = (list) => Object.fromEntries(list.map((m) => [m, { frames: MOVES[m].frames, ms: MOVES[m].ms, pose: (i) => posed(SIDE16, MOVES[m].f(i)) }]))

// ---------------------------------------------------------------- the near fist, the hurt box and the hit flash
// The near fist (the hand nearer us) closed: a line of the skin's dark across it, past its middle away from the wrist
// (the curled fingers), on its skin's pixels; a ball of skin alone read as a blob.
const fist = (c, j) => {
  const A = j.arms.reduce((a, b) => (j.depth(a.hand) > j.depth(b.hand) ? a : b)), [hx, hy] = j.screen(A.hand), [ex, ey] = j.screen(A.elbow)
  const n = Math.hypot(hx - ex, hy - ey) || 1, skin = ["s", "S"].map((k) => c.color(k))
  for (let y = Math.floor(hy) - 2; y <= hy + 2; y++) for (let x = Math.floor(hx) - 2; x <= hx + 2; x++) {
    const u = ((x + 0.5 - hx) * (hx - ex) + (y + 0.5 - hy) * (hy - ey)) / n
    if (u > 0.3 && u < 1.3 && skin.includes(c.get(x, y))) c.px(x, y, "z")
  }
}
// every frame: the fist, the hurt box at the middle of the torso; on a `flash` frame every color but the line the
// eyes' white
const boxes = (c, j, p) => {
  fist(c, j)
  // (the dust's place: the foot's toe or heel on the ground, in the frame's px)
  if (p.dust !== undefined) { const [x, y] = j.screen([...j.legs[p.dust].foot.slice(0, 2), 0]); c.setData({ dust: [Math.round(x + (p.dust ? 2 : -2)), Math.round(y)] }) }
  if (p.ghost) c.setData({ ghost: true })
  if (p.loop) c.setData({ loop: true })
  const [w, h] = SIDE16.hurt, m = j.screen(j.pelvis.map((v, e) => (v + j.chest[e]) / 2))
  c.setBox("hurt", Math.round(m[0] - w / 2), Math.round(m[1] - h / 2), w, h)
  if (p.flash) c.recolor({ "*": "W", k: "k" })
}

// ---------------------------------------------------------------- the head, in profile
// The hero's skull and hair (hero.SKULL, hero.SHORT: modeled for a head of radius 5), scaled to this one's; baked at
// pitch 0 by views() into a square of 19 px whose middle (9, 9) is the head's, the west painted by hand (the east
// its mirror, the way he faces), row by row ("." keeps the render's pixel), as the top-down hero's profile. FACE,
// every head's: the eye 2 x 2 under the fringe (the pupil in front, a pixel of skin before it), the nose a single
// pixel of the lightest skin in the line's column, the ear two pixels of skin and their shade behind the cheek, the
// chin's line in the skin's dark.
const FACE = hero.rows(19, {
  10: "...kskWs.zs........",
  11: "...kskWs.zsz.......",
  12: "...Ss..............",
  13: "....kz.............",
})
// STRANDS, the short hair's own: the fringe down to the brow, its edge the hair's darkest (j) right over the eye; the
// light (L) on the strands' tops by the crown, 2 dark gaps (j) fanning from it, the shade (h) low and at the back
const STRANDS = hero.rows(19, {
  4: ".......LLL.........",
  5: ".....YLLLjYYjY.....",
  6: "....hYYLjYYYYjY....",
  7: "....hYYjYYYYYYj....",
  8: "....hhjhh..........",
  9: "....jjjjj..........",
})
const HEAD = { pitch: 0, ink: "k", jaw: ["z", "zsS"], surface: { soft: 0.55, tones: 4 }, anchor: [9, 9] }

// ---------------------------------------------------------------- a figure side on
// character(name, { hair, strands, face, outfit, swap, moves }): this body and these moves, dressed in `outfit`
// (dress()'s fields; the hero's, PLAIN below, by default) as thick as the body, a neck under the head; the head the
// skull and `hair` (hero.SHORT by default) baked in profile, its west painted by hand with the hair's own `strands`
// (none: rows(19, {})) and `face`; recolored by `swap` (the hero's keys).
// It makes <name>_<move> (the hero's own with no name: idle, run, ...) facing e, standing on the row under the soles,
// and gives back the rig (its joints).
const LIT = { soft: 0.55, tones: 3, clean: true }
// the hero's outfit. The belt a band of 2.3 px (the shirt's lowest 0.3; the top-down one's 0.14, a pixel the straight
// skirt below left to the line) and its lower edge the leather's darkest (dress() hands the lowest 0.14 as 0); its
// gold buckle a little wider round the front (|a| under 0.8 rad, the hero's 0.35): side on, the front of the belt is
// the edge of his outline, and a buckle as narrow as the top-down one's lies under the line. The tunic's skirt straight down from the belt, 3.2 px ahead and behind (in line with his back above it) and over the
// hips at the sides (4.9): the top-down one's, flared and round (4.3-5), stuck out behind him side on (the user: "too
// much behind"), most in the run, the jump's push-off and the landing
// The far leg and arm a tone darker than the near ones all through (the trousers all their dark, the sleeve its
// darkest, the boot and the hand with no light), so the legs read apart as they cross in the run, as the blocks'
// and Mega Man X's do; the top-down hero's far limbs a step darker only (PPp against Ppp) merged side on.
const PLAIN = { ...hero.PLAIN, body: (h, a) => (h === 0 ? "D" : h < 0.3 ? (Math.abs(a) < 0.8 ? "g" : "Dd") : "nbc"), skirtRadius: (h, a) => 4.9 * (0.65 + 0.35 * Math.abs(Math.sin(a))),
  legs: (far) => ({ tr: far ? "PPP" : "Ppp", shin: far ? "DDd" : "Ddl", foot: far ? "DDd" : "Ddl" }), sleeve: (far) => (far ? "nnn" : "nbc"), fore: (far) => (far ? "zzs" : "zsS"), hand: (far) => (far ? "zzs" : "zsS") }
const character = (name, { hair = hero.SHORT, strands = STRANDS, face = FACE, outfit = PLAIN, swap, moves = Object.keys(MOVES) } = {}) => {
  const id = name || "hero", at = name ? `${name}_` : "", F = SIDE16.frame, B = SIDE16.body
  views(`_hds_${id}`, sdf.union(hero.SKULL, hair).scale(B.r.head / 5), { ...HEAD, retouch: { w: hero.over(strands, face) } })
  const dressed = dress({ ...outfit, r: B.r })
  // a rig a frame size: the dash's own, 40 wide (rig3d draws every move of a rig in one size)
  const fig = (rn, list, F) => rig3d(rn, { body: B, headings: ["e"], pitch: 0, w: F.w, h: F.h, pivot: F.pivot, ink: "k", surface: LIT, head: `_hds_${id}`,
    parts: (j, p) => ({ ...dressed(j, p), neck: j.limb(j.chest, [j.head[0], j.head[1], j.head[2] - 0.7 * B.r.head], 1.3, 1.2, "zs") }),
    moves: movesOf(list), draw: boxes, genre: "platformer16" })
  const rig = fig(`_rs_${id}`, moves.filter((m) => m !== "dash"), F)
  if (moves.includes("dash")) fig(`_rsd_${id}`, ["dash"], SIDE16.dash)
  for (const m of moves) {
    const [px, py] = (m === "dash" ? SIDE16.dash : F).pivot
    anim(`${at}${m}`, { base: `_rs${m === "dash" ? "d" : ""}_${id}_${m}_e`, pivot: [px, py + SIDE16.sole], ...(swap ? { swap } : {}) })
  }
  // the dash's afterimage: its held pose a flat silhouette in the tunic's light, for the game to draw behind him
  // (two, 10 and 20 px back, at half and a quarter strength, on the frames whose data says ghost)
  if (moves.includes("dash")) sprite(`${at}dash_ghost`, { w: 40, h: 48, pivot: [19, 47] }, stamp(`${at}dash`, 19, 47, { frame: 2, silhouette: "c" }))
  return rig
}

// ---------------------------------------------------------------- the hero
// For the game: every move facing e, tagged idle, walk, run, dash, jump, apex, fall, land, hurt; and each move as its flat
// blocks (two rigs too, the dash's 40 wide).
const rig = character("")
for (const [n, list, F] of [["_hsr", Object.keys(MOVES).filter((m) => m !== "dash"), SIDE16.frame], ["_hsrd", ["dash"], SIDE16.dash]])
  rig3d(n, { body: SIDE16.body, headings: ["e"], pitch: 0, w: F.w, h: F.h, pivot: F.pivot, ink: "k", blocks: "_hsb", moves: movesOf(list) })
// the dash's dust: the library's puff (lib/vfx/dust.px.js, in its own colors), for the game to place where a dash
// frame's data says (dust: [x, y] in the frame; flipped at the brake, kicked ahead)
anim("dash_dust", { base: "dust.dust" })
sheet("hero_side", [...Object.keys(MOVES), "dash_ghost", "dash_dust"], { rows: "tag", pad: 1 })   // a move a row, then the dash's effects
card("idle", { is: "the top-down hero side on for a platformer, 32 px and 2.5 heads in a blue tunic: idle, walk, run, dash, a jump in four (jump, apex, fall, land) and hurt facing e", cells: { "side/16": "✓" },
  vary: { part: "its moves: idle, walk, run, dash (40 wide; dash_ghost, dash_dust), jump, apex, fall, land (air and loop in each frame's data), hurt facing e (flipped for w), on the sheet hero_side; its blocks _hsb_<move>_e; others made side on by heroSide.character(name, { hair, strands, face, outfit, swap })" } })
Object.assign(heroSide, { SIDE16, MOVES, rig, character, PLAIN, FACE, STRANDS })
}
