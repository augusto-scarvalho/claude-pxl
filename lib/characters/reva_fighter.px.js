// Reva the fighter, fighting's body (lib/profiles/fighting.px.js): an original woman fighter seen from the side, 110 px
// standing and 101-103 in her stance, in KOF 2002's school (the library's fighting study, measured for numbers only,
// never its pixels): a dark violet bob under a gold headband whose two tails trail behind, a red crop top over a bare
// midriff, a gold sash, loose navy trousers bound at the ankle over slippers, bare arms, the forearms and fists wrapped;
// long legs, a short torso. The chibi Reva (reva.px.js) is the same woman at topdown16.
// Made in 3D on her rig (rig3d(), one heading) with her head drawn by hand: the body painted by surface() as Guilty
// Gear Xrd paints a model for its one camera (each material a ramp cut where its terminator should fall, the shadows
// and creases drawn by design, the trousers' folds placed from the side the camera sees), a cleanup by rule over each
// frame; the head drawn at 3/4 (the guard's, a shout's, the hurt's) and stamped between the body and the near arm, her
// guard's fist before her face. 18 colors; a line by material (each part's own darkest), black on the hair and the
// shoes (the genre's ink). Idle (8 x 100 ms), strike (a rear cross, 450 ms: startup 2, active 2, recovery 3 at
// 67/33/50/67/67/83/83, a smear on the second), hurt (thrown back, then back over half of it), walk_f and walk_b (her school's step and
// join, 8 drawings: 533 ms a cycle forward, 667 back), crouch (a kneel, 3 drawings in 67 ms) and crouch_hold (a breath,
// 8 x 83), jump (straight up: a prejump of 2, 9 drawings in the air over 617 ms, 2 landing) and block and block_low (the
// guard up in 33 ms, the hit's 200 ms shaken by its steps, then pushed back), turn and crouch_turn (when she crosses
// over him: through her front to face him, the game mirroring her on the drawing that faces us, 84 and 67 ms), win
// (MUGEN's 181, her win pose: one fist thrown up over her head, 600 ms to the pose, its last drawing held to the
// round's end, on a frame of its own, taller), and her normals, drawn and timed for
// their impact: jab (the lead hand, 250 ms), kick_l (a front snap kick to the chest, 317 ms), kick_h (a roundhouse to
// the head, 485 ms), crouch_kick (a low kick from the kneel, 250 ms), jump_kick (a kick in the air, played over the
// jump's arc) and strike_old (the first cross, kept), and her reactions: hurt_low (doubled over, 233 ms), crouch_hurt
// (thrown back on her knee, 233 ms), knockdown (thrown off her feet, landing on her shoulders, a bounce, 900 ms,
// rig3d's roll turning the whole of her), down (lying, a breath of 667 ms), get_up (to her guard, 417 ms,
// untouchable) and down_face (lying on her front, a breath: where a heavy's throw onto her face lets her go), and her two specials, archetypes in her own look: wave (a gold wave pushed from both palms, 683 ms, the
// wave born on the push, 200 ms in: wave_start, wave_fly, wave_end its own anims) and rise_kick (a rising spinning
// kick, untouchable as it starts, one turn in the air with a gold trail, 550 ms), and her drawings for being thrown
// (thrown_grabbed, thrown_folded, thrown_face_up, thrown_face_down: each turned whole to the angles a heavy's throws
// ask, a frame an angle, its pivot her pelvis, the point a thrower binds) facing e, the game flips her for w;
// the feet on one row through every move but the air (the genre's ground; lying, her body on it). Each frame's hurt
// boxes (head, body, legs, the striking arm or leg while it is out) and hit box (round the fist or the foot on the
// active frames), from her joints (none lying), and its data { phase, damage, hitstun, hitstop and pushback (what the
// engine does on contact), air, step: the motion an engine applies, the frames drawn in place, invuln, spawn (the wave:
// where it starts and how fast), knockdown, roll (a thrown drawing's angle), flip (the drawing the game mirrors her
// on), fx (the dust a landing or her knockdown's fall raises: lib/vfx/dust.px.js) }; 3 palette slots (base, jade, dusk:
// 11 keys swapped) on the sheet
// reva_fighter for an engine to recolor, the wave's anims with them.
// Taken with include("<path>/lib/characters/reva_fighter.px.js", { as: "reva_fighter" }): reva_fighter.idle, .strike,
// .hurt, .walk_f, .walk_b, .crouch, .crouch_hold, .jump, .block, .block_low, .turn, .crouch_turn, .win, .jab, .kick_l, .kick_h,
// .crouch_kick,
// .jump_kick, .strike_old, .hurt_low, .crouch_hurt, .knockdown, .down, .get_up, .down_face, .wave, .rise_kick, .wave_start,
// .wave_fly, .wave_end, .thrown_grabbed, .thrown_folded, .thrown_face_up, .thrown_face_down; revaFighter.SLOTS a slot's swap (stamp(..., { swap: revaFighter.SLOTS.jade })).
// What she shares with the other fighters (the vectors, the toon, the shadows by design, a strike's smear, the cleanup, the boxes) is in
// fighter.px.js; her stance, tones, parts, poses and heads are hers.
include("../profiles/fighting.px.js")
include("fighter.px.js")
// the values set from the references' lightness (OKLab), hue and chroma her own: skin line 0.37, shadow band 0.52,
// plane 0.73, lit 0.89; the trousers a dark cloth (0.25, 0.42, folds' ridges 0.66); the top a red (0.42, 0.60); the sash
// a gold (0.58, 0.80) (characters §14). 18 colors, every ramp from the ink: skin, hair, top, trousers (the shoes too),
// sash, wraps; the hair and the sash a third, light tone (0.57 and 0.92: the fighting study's shares, the hair its own
// material in every model, the sash her third-biggest after the trousers and the skin)
pal({ k: "#1a1220", S: "#652c23", s: "#9c5135", z: "#db956d", Z: "#ffd0ab", H: "#362b4f", h: "#534370", J: "#7d6aa8", R: "#783345", r: "#cc525b", N: "#191f3d", n: "#3e4a76", m: "#7d90c6", Y: "#a16e3c", y: "#f0b053", u: "#ffe39a", W: "#8f8478", w: "#e1d7c0", U: "#fffbea" })
ramps("kSszZ", "kHhJ", "kRr", "kNnm", "kYyu", "kWw")
var revaFighter = {}
// in a block: its names stay its own when a scene includes the file
{
// her slots, a swap each of the roles' keys: hair (H h J), top (R r), trousers and shoes (N n m), sash (Y y u); skin and
// wraps kept. Each light a step up in OKLab as far as the base's, in its slot's hue; dusk's pale hair has no room above
// its h, so its h steps down and its old h is the light
const F = genre("fighting"), SLOTS = {
  jade: { R: "#30544b", r: "#4b9176", N: "#27211d", n: "#574c44", m: "#998a7c", Y: "#914741", y: "#d96650", u: "#ef9c73", H: "#44231a", h: "#8b4e3a", J: "#c4735d" },
  dusk: { R: "#40366c", r: "#6659b6", N: "#371d1d", n: "#764242", m: "#c77f78", Y: "#426d75", y: "#58afaf", u: "#a3d0c6", H: "#dccbab", h: "#ede0c4", J: "#fff4dc" } }
const { RAD, add, sub, mul, dot, len, unit, cross, clamp, smooth, hipsFloor, shadowed, nearOf, band, bone, aimed, nearArm, pinholes } = fighter

// ---------------------------------------------------------------- the poses, in her px (rig3d's pose fields)
// Measured on the references' idles and light punches (characters §14): feet 0.82 of her height apart, the weight 0.51
// toward the front foot, the line of action 23 degrees (the genre's pose), leaning 10, the knees bent 11. Her legs long
// and her torso short (the fighting study's models: the hip joint at 0.53 of her height, the women's 0.57, the men's
// 0.52): the hip 58 px over the sole, the thigh 28, the shin 27, the torso 32; the head and her height kept. A lean tips
// the shorter torso as far forward as rig3d's 37 px one went, so the head, the shoulders and the fists stay where the
// poses put them (the strike's reach too). Her foot as long as her shoe, 21 px heel to toe (the models' 23).
// Opened to the camera as the 3D games stand their fighters (their models and in-game stances, characters §14): the
// hips 40 degrees from profile, the chest 60, the head 40, turned to her opponent whatever the shoulders do; the front
// foot 20 open, the rear one turned 78 out (rig3d's toes, its knee over it), its leg nearly straight and its heel flat
// in the guard. On the strike's drive the rear heel rises on its ball, 1.7 px a step, the foot pivoting forward 10
// degrees a step. The near fist under her chin in the guard and kept off the face the drawn head turns to us.
const BODY = { h: 110, heads: 6.5, shoulders: [0, 11.5, -1], hip: 58, thigh: 28, shin: 27, torso: 32, r: { foot: [3.1, 10.5, 3.1] } }
// (the feet by hipsFloor, between the hips' frame and the floor: planted where they were measured (as the hips turned
// -70 faced, the strike's as its own), whatever a frame's hips do; the rear foot 7.5 px farther back than measured, the
// leg straighter)
const STANCE = { turn: -50, twist: 20, lean: 10, down: 11, feet: [hipsFloor([27, -5], -70), hipsFloor([-34.5, 6], -70)], drive: 0, hands: [[14, 2, 6], [20, -9, -1]] }
const tipped = (lean) => Math.asin(Math.sin((lean * Math.PI) / 180) * 37 / BODY.torso) * 180 / Math.PI
// (a pose's `way`: each foot's heading on the floor, compass degrees, the stance's 110 and 168 by default; `heel`
// its own)
const posed = (o) => { const q = { ...STANCE, ...o }, h = 180 + q.turn, way = q.way ?? [110, 168 - 10 * q.drive]
  return { ...q, lean: tipped(q.lean), head: 130 - (h + q.twist), feet: q.feet.map((f) => hipsFloor(f, q.turn)), toes: [h - way[0], way[1] - h], heel: q.heel ?? [0, q.drive * 1.7] } }
// The sash's ends swing a step behind her hips: `sway` [forward, up] px at their tips (in the idle, up as the body
// sinks, down as it rises; on the cross, left behind as the hips drive and swung through on the way back; on the hurt,
// flung forward as she is thrown back).
// the idle: the knees bouncing the body 3 px (the extremes held), the fists a frame late
const BOB = [0, 0.5, 1.5, 2.5, 3, 3, 2, 1]
const idle = (i) => posed({ phase: "idle", down: STANCE.down + BOB[i], hands: STANCE.hands.map((h) => [h[0], h[1], h[2] - BOB[(i + 7) % 8] * 0.6]),
  sway: [0, (BOB[i] - BOB[(i + 7) % 8]) * 0.9] })
// strike_old: the first cross (approved before the impact study, kept beside the redone strike): coil, pull, two frames at full reach (the front foot slid, the rear heel up, the weight forward, the guard
// hand in front of the face, her shout), then back the way it came; feet 0.91, weight 0.64, line 35 degrees
const AT_REACH = [hipsFloor([26, -5], -78), hipsFloor([-41.5, 6], -78)]
const STRIKE_OLD = [
  { phase: "startup", twist: 30, down: 12, hands: [[14, 3, 7], [9, -3, 2]], sway: [0.4, 0] },
  { phase: "startup", turn: -54, twist: -6, lean: 14, down: 12, drive: 1, hands: [[11, 0, 7], [21, -4, 5]], sway: [-1.2, 0.4] },
  { phase: "active", turn: -58, twist: -48, lean: 20, down: 13, feet: AT_REACH, drive: 3, hands: [[22, -1, 7], [35, -5, -1]], face: "shout", sway: [-3, 1.2] },
  { phase: "active", turn: -58, twist: -50, lean: 21, down: 13, feet: AT_REACH, drive: 3, hands: [[22, -1, 7], [35.5, -5, -1]], face: "shout", sway: [-2.2, 0.8] },
  { phase: "recovery", turn: -56, twist: -26, lean: 16, down: 12.5, feet: [hipsFloor([26, -5], -76), hipsFloor([-40.5, 6], -76)], drive: 2, hands: [[19, 0, 7], [25, -4, 1]], face: "shout", sway: [-0.4, 0] },
  { phase: "recovery", turn: -52, twist: 6, lean: 12, down: 11.5, hands: [[12, 1, 6], [13, -4, -1]], sway: [1.2, 0] },
  { phase: "recovery", down: 11.5, hands: [[14, 2, 5], [20, -9, -1]], sway: [0.4, 0] },
]
const strikeOld = (i) => posed(STRIKE_OLD[i])
// hurt: thrown back from the hips, the head the whole way in the first drawing and back over half of it in the next;
// the guard opened, the fists flung back; the feet planted
const HURT = [
  { phase: "hurt", turn: -46, twist: 16, lean: -16, down: 10, hands: [[16, -2, -10], [2, 6, -22]], face: "hurt", sway: [2.6, 1.2] },
  { phase: "hurt", turn: -48, twist: 19, lean: -3, down: 12.5, hands: [[16, 0, -2], [8, 2, -16]], face: "hurt", sway: [1.2, 0.4] },
]
const hurt = (i) => posed(HURT[i])
// Her movement and defense, as the 6b2 study measured them (KOF 2002 and its neighbours, SF III 3rd Strike and the
// Alpha games: the profile's states say whose numbers each is). A pose's `step` is the motion an engine applies as
// its frame shows ([dx, dy] px from the frame before, dx the way she faces, dy down): the frames are drawn in place
// round the one pivot. The timing is the profile's, whole 60ths of a second (ms rounded). What follows the body comes
// a frame late: the fists by LAG of the pelvis's last change, the band's tails and the sash's ends the other way
// (down as the body rises, up as it sinks).
const TICKS = (ms) => Math.round((ms * 60) / 1000), LAG = 0.6
const msOf = (s) => (Array.isArray(s.ms) ? s.ms : Array.from({ length: s.frames }, () => s.ms))
const late = (hands, d) => hands.map((h) => [h[0], h[1], h[2] - d * LAG])
// The walk, her school's (KOF 2002's Vanessa, May Lee and Whip, KOF '98's King and Athena): step and join, the lead
// foot always ahead and the legs never crossing, the hips kept turned. From the contact (the ankles 0.4 of her
// height apart, both knees nearly straight) the rear foot comes in to join the lead, the body rising as they close;
// the lead lifts (the highest: its knee up, the standing leg nearly straight, 20 degrees) and steps out, and the body
// settles onto it. Joined, the ankles stay 25 px apart on screen, so the far leg shows its whole width beside the near
// one, never a strip at its edge. The pelvis always over the guard's, +5.5 to +9 px (the references walk 0-12% of their
// height over their guard, none under it; at the guard's height with the feet closing under it the knees fold: a
// squat). Each row: the hip (px over the sole), the lead foot [across, away], its lift and heel, the rear foot's, the
// lean
const WALK = [
  [53, [22, -4.5], 0, 0, [-21, 6], 0, 0, 10],    // contact
  [52.5, [21, -4.5], 0, 0, [-21, 6], 0, 1, 10],  // the weight onto the lead: the lowest
  [54, [19, -4.5], 0, 0, [-14, 5], 3, 3, 9],     // the rear foot coming in
  [55.5, [14, -4.5], 0, 2, [-11, 4], 0, 3, 8],   // joined, on the balls
  [56, [15, -4.5], 8, 0, [-11, 4], 0, 0, 7],     // the lead lifts: the highest
  [55.5, [20, -4.5], 3, 0, [-12, 4], 0, 0, 8],   // the lead reaching
  [53.5, [21, -4.5], 0, 0, [-17, 5], 0, 0, 9],   // the lead lands
  [53, [22, -4.5], 0, 0, [-21, 6], 0, 1, 10]]    // the weight forward
// (back: the same drawings the other way round, the lead drawn back to the rear and the rear stepping back, as KOF
// '98's and 2002's walks run theirs; the speeds in px a tick, the planted foot sliding as KOF's do)
const WALK_V = { f: 2.75, b: 2.5 }
const walk = (back) => { const rows = back ? [...WALK].reverse() : WALK, ms = msOf(back ? F.states.walk_b : F.states.walk_f), n = rows.length
  return (i) => { const [hip, lf, ll, lh, rf, rl, rh, lean] = rows[i], d = hip - rows[(i + n - 1) % n][0]
    return posed({ phase: "walk", down: BODY.hip - hip, lean, feet: [lf, rf], lift: [ll, rl], heel: [lh, rh], hands: late(STANCE.hands, d),
      step: [(back ? -WALK_V.b : WALK_V.f) * TICKS(ms[i]), 0], sway: [back ? 1 : -1, -d * 0.9] }) } }
// The crouch, her school's kneel (KOF 2002's Vanessa, KOF '98's King, the Alpha games' Cammy and Karin): the rear knee
// down to the floor, its foot on the toes, the lead shin upright, the guard at the chin, the back rounded (the chest 3
// px down over the pelvis); down in 4 ticks (Vanessa's 1, 1, 2), held breathing (8 drawings of 5 ticks, 1.5 px, the
// fists a frame late: Vanessa, Whip and 3S's Chun-Li breathe 1-3% in 6-12 drawings). Knelt, the far fist 4 px higher:
// its elbow off the lead knee, which rises to it
const KNEEL = { feet: [[23, -4.5], [-30, 6]], heel: [0, 14], way: [110, 134] }, KNELT = STANCE.hands.map((h, k) => [h[0], h[1], h[2] + (k ? 0 : 4)])
const CROUCH = [[40, 13, [[24, -4.5], [-30, 6]], [0, 10], [110, 134], -1], [27, 15, KNEEL.feet, KNEEL.heel, KNEEL.way, -2], [23, 16, KNEEL.feet, KNEEL.heel, KNEEL.way, -3]]
const crouch = (i) => { const [hip, lean, feet, heel, way, rise] = CROUCH[i], d = hip - (i ? CROUCH[i - 1][0] : BODY.hip - STANCE.down)
  return posed({ phase: "crouch", down: BODY.hip - hip, lean, rise, feet, heel, way, hands: late(i > 1 ? KNELT : STANCE.hands, d), sway: [0, -d * 0.15] }) }
const BREATH = [0, 0.5, 1, 1.5, 1.5, 1, 0.5, 0]
const crouchHold = (i) => { const d = BREATH[i] - BREATH[(i + 7) % 8]
  return posed({ phase: "crouch", down: BODY.hip - 23 - BREATH[i], lean: 16, rise: -3, ...KNEEL, hands: late(KNELT, d), sway: [0, -d * 0.9] }) }
// The jump, straight up (KOF 2002's Vanessa, her school; May Lee, King and Athena alike): a prejump of two drawings
// (the knees folding, the near fist dropped and cocked, the far one kept at the chin, its wraps clear of the near one;
// the head down), the takeoff stretched (the legs nearly straight and apart, the toes pointed, the far fist up before
// her brow, the near one at her chest: the near arm is drawn over the head, so it stays off the face; the head up),
// rising as the lead knee comes up and the arms come down, tucked round the apex (the knees at the chest, the fists
// reaching for the shins, the head down, while the body hardly moves), opening as it falls (the arms out), one leg
// reaching for the floor and the other still bent, then stretched to land. In the air the feet stay apart by a step
// (the far leg shows its width, never a strip by the near one's edge). The landing plays the prejump back. The arms go
// against the knees: up while they are down, down while they are up. The tails and the sash's ends hang as she rises
// and float up as she falls. Its height is the steps': KOF's throw (36-40 ticks in the air, 0.73-0.86 of the height
// up), APEX px at the top, sampled at each air frame's middle
const APEX = 92, AIR = true
const FAR_UP = [[12, 0, 15], [16, -6, 0]], OVER = [0, 1, 0]
const JUMP = [
  { phase: "prejump", down: 16, lean: 18, feet: [[24, -4.5], [-30, 6]], heel: [0, 5], hands: [[16, 2, -2], [22, -9, -7]], face: "down", sway: [0, 1] },
  { phase: "prejump", down: 21, lean: 22, feet: [[22, -4.5], [-28, 6]], heel: [0, 7], hands: [[16, 2, -1], [24, -9, -11]], face: "down", sway: [0, 1.5] },
  { phase: "air", air: AIR, down: 0, lean: 2, feet: [[12, -3], [-8, 3]], heel: [6, 3], way: [116, 128], hands: FAR_UP, elbow: OVER, face: "up", sway: [0, -2] },
  { phase: "air", air: AIR, down: 1, lean: 4, feet: [[18, -3], [-6, 3]], lift: [12, 0], heel: [6, 7], way: [116, 128], hands: [[12, 2, 12], [15, -6, 1]], elbow: OVER, face: "up", sway: [0, -1.5] },
  { phase: "air", air: AIR, down: 2, lean: 8, feet: [[11, -3], [-5, 3]], lift: [16, 10], heel: [6, 7], way: [116, 128], hands: [[12, 3, 6], [15, -7, 4]], sway: [0, -0.5] },
  { phase: "air", air: AIR, down: 3, lean: 16, feet: [[11, 3], [9, -3]], lift: [24, 22], heel: [6, 6], way: [116, 128], hands: [[26, 4, -9], [30, -4, -8]], face: "tuck", sway: [0, 0] },
  { phase: "air", air: AIR, down: 3, lean: 19, feet: [[12, 3], [10, -3]], lift: [27, 25], heel: [6, 6], way: [116, 128], hands: [[27, 4, -11], [31, -4, -10]], face: "tuck", sway: [0, 0.5] },
  { phase: "air", air: AIR, down: 2, lean: 9, feet: [[10, -2], [-4, 2]], lift: [13, 8], heel: [5, 5], way: [116, 128], hands: [[6, -9, 3], [6, 10, 3]], sway: [0, 1.5] },
  { phase: "air", air: AIR, down: 1, lean: 5, feet: [[14, -3], [-8, 3]], lift: [4, 6], heel: [6, 6], way: [116, 128], hands: [[12, 2, 11], [14, -6, 2]], elbow: OVER, sway: [0, 2.5] },
  { phase: "air", air: AIR, down: 0, lean: 3, feet: [[12, -3], [-8, 3]], lift: [0, 2], heel: [6, 5], way: [116, 128], hands: FAR_UP, elbow: OVER, sway: [0, 3] },
  { phase: "air", air: AIR, down: 0, lean: 3, feet: [[11, -3], [-9, 3]], lift: [0, 0], heel: [3, 3], way: [116, 128], hands: FAR_UP, elbow: OVER, sway: [0, 3] },
  { phase: "landing", down: 21, lean: 22, feet: [[22, -4.5], [-28, 6]], heel: [0, 7], hands: [[18, 2, 0], [26, -9, -8]], face: "down", sway: [0, -2], fx: { name: "dust_jump" } },
  { phase: "landing", down: 16, lean: 18, feet: [[24, -4.5], [-30, 6]], heel: [0, 5], hands: [[16, 2, -2], [22, -9, -7]], sway: [0, -0.5] },
]
const JT = msOf(F.states.jump).map(TICKS), AT = JT.reduce((s, t, k) => s + (JUMP[k].air ? t : 0), 0)
const JY = JT.map((t, k) => { if (!JUMP[k].air) return 0; const t0 = JT.slice(0, k).reduce((s, u, q) => s + (JUMP[q].air ? u : 0), 0) + t / 2; return Math.round((4 * APEX * t0 * (AT - t0)) / AT ** 2) })
const jump = (i) => posed({ ...JUMP[i], step: [0, i ? JY[i - 1] - JY[i] : 0] })
// The block (KOF 2002's Vanessa, the 3D games' guards; 3S's blockstun): the guard brought up in one drawing (2
// ticks), at her guard's height and curled (the fists at the cheek and the brow, the elbows in before the ribs, the
// chin down behind them: the head turned down, the shoulders turned in); the hit: frozen 12 ticks and shaken a px
// each way by its steps (KOF's guard pause, 10-12 ticks of shaking), sunk 3 px and curled further, the tails flung
// forward; then pushed back by its steps (KOF's guard slide, 10-18 ticks slowing, about 30 px) through two drawings
// back to the guard. Low: the same from the kneel
const GUARD = { phase: "block", down: 12.5, lean: 13, twist: 26, hands: [[9, 4, 12], [12, -5, 15]], face: "down" }
const STUN = { phase: "blockstun", down: 15.5, lean: 16, twist: 31, heel: [0, 2], hands: [[8, 4, 13], [11, -5, 16]], face: "down", sway: [2.5, 0.5] }
const BLOCK = [{ ...GUARD, sway: [-0.5, 0] }, { ...GUARD, sway: [0, 0] }, ...[1, -2, 2, -1].map((x) => ({ ...STUN, step: [x, 0] })),
  { ...STUN, down: 13.5, lean: 14, twist: 28, sway: [1, 0], step: [-14, 0] }, { ...GUARD, phase: "blockstun", sway: [-0.5, 0], step: [-9, 0] }, { ...GUARD, sway: [0, 0], step: [-7, 0] }]
const block = (i) => posed(BLOCK[i])
const blockLow = (i) => posed({ ...BLOCK[i], down: BLOCK[i].down + 22.5, rise: -3, ...KNEEL })
// The normals (the 6b2 study's section 9: KOF 2002's Vanessa, May Lee and Whip, Mai's 2002 UM timing, KOF '98's King
// and Mature, KOF XI's Leona, the Alpha games' Cammy and Karin, 3S's captures), redone for their impact (its section
// 10: motion capture of real strikes, those sprites and Garou's, the 3D games): each frame's `limb` the one that
// strikes, `out` while it is out (a hurt box of its own: a counter-hit), and on the active frames `hit` [damage,
// hitstun (60 fps frames), hitstop (ms), pushback (px)], light below heavy (the references: x1.7 the hitstun, x1.6-3.4
// the damage; the engine's pause 10 and 12 ticks, its push about 30 and 48 px). As the games draw a strike, in
// contrast: the anticipation down and in (not back) and held, the snap a cut (no drawing between the chamber and the
// blow, or one smeared), the blow past anatomy and held (its first drawing a step farther, then settled), the way back
// slower than the way out; the body behind it (the trunk paying for a kick, the hips turning on through it, the heel
// up); the band's tails and the sash's ends left behind on the snap and flung on after the stop. A kicking foot is
// turned at its ankle by `point` (pointed along the shin: the toes, the instep), or turned out across a shin lying
// low (the low kick: the heel leading).
// (the jab's fists placed on the floor's axes, [ahead, away, up] px from each shoulder, and turned into the shoulders'
// frame: the guard's far fist is 13 px nearer us than its shoulder, before her face, and the jab runs from there to
// the opponent's centre line)
const onFloor = (p) => { const h = (180 + (p.turn ?? STANCE.turn) + (p.twist ?? STANCE.twist)) * RAD
  return { ...p, hands: p.hands.map(([e, a, u]) => [e * Math.sin(h) + a * Math.cos(h), e * Math.cos(h) - a * Math.sin(h), u]) } }
const SOFT = [167, 30], HARD = [200, 48]
// jab: the lead shoulder drawn back a little (a light hardly winds up), the fist out in a cut past the arm's length
// (38 px from the shoulder, the arm 36), the shoulders turned on and the trunk leaning in, settled a step back and held,
// then back in two; the rear fist at the chin, the feet still
const JAB = [
  { phase: "startup", twist: 16, lean: 11, down: 11.5, hands: [[9, -11, 3], [17, -13, -1]], sway: [0.4, -0.3] },
  { phase: "active", turn: -44, twist: 32, lean: 15.5, down: 12, hands: [[38, -5, 2], [17, -13, 0]], out: true, hit: [3, 9, ...SOFT], sway: [-1.6, 0.4] },
  { phase: "recovery", turn: -44, twist: 30, lean: 15, down: 12, hands: [[35.5, -5, 2], [17, -13, 0]], out: true, sway: [2, -0.4] },
  { phase: "recovery", turn: -47, twist: 25, lean: 12.5, hands: [[21, -8, 3], [17, -13, -1]], out: true, sway: [0.6, 0] },
  { phase: "recovery", twist: 22, hands: [[12, -11, 5], [18, -13, -1]], sway: [0, 0] },
].map((p) => onFloor({ limb: "arm0", ...p }))
// kick_l: a front snap kick with the lead leg to the chest: the weight back (the rear foot slid in under her, as KOF's),
// the knee to the chest held, then the leg out in a cut, the toes pointed, the trunk back and the rear heel up; the knee
// back, down
const KICK_L = [
  { phase: "startup", down: 10, lean: 6, feet: [[22, -4.5], [-16, 6]], lift: [6, 0], heel: [0, 4], hands: [[14, 2, 7], [18, -9, 0]], sway: [0, -0.5] },
  { phase: "startup", down: 9, lean: 2, feet: [[16, -4.5], [-12, 6]], lift: [44, 0], heel: [0, 5], point: [45, null], hands: [[16, 4, 12], [8, -5, -10]], out: true, sway: [-0.5, -0.5] },
  { phase: "active", down: 8, lean: -6, feet: [[52, -4.5], [-12, 6]], lift: [55, 0], heel: [0, 6], point: [55, null], way: [100, 168], hands: [[18, 4, 14], [2, -4, -13]], out: true, hit: [4, 10, ...SOFT], sway: [-1.6, 0.3] },
  { phase: "recovery", down: 9, lean: 2, feet: [[23, -4.5], [-12, 6]], lift: [42, 0], heel: [0, 5], point: [45, null], hands: [[16, 4, 12], [8, -5, -10]], out: true, sway: [2, -0.4] },
  { phase: "recovery", down: 10, lean: 8, feet: [[24, -4.5], [-24, 6]], lift: [4, 0], heel: [0, 3], hands: [[14, 2, 7], [19, -9, 0]], sway: [0.5, 0.5] },
  { phase: "recovery", hands: [[14, 2, 6], [20, -9, -1]], sway: [0, 0] },
].map((p) => ({ limb: "leg0", ...p }))
// kick_h: a roundhouse with the rear leg (the near one) to the head: coiled down, the hips wound back and the rear heel
// up; turned on the ball of the lead foot (carried 22 px on by its step, the foot kept on the floor), the knee up ahead
// with the shin folded and held; a smeared drawing as the leg whips round; the leg out at the head's height, the foot
// pointed (the instep), the trunk back, the standing heel up (the pelvis risen), the near arm flung back and down; the
// hips turning on past it; the knee back, the foot set down behind (22 px back), the guard
const KICK_H = [
  { phase: "startup", turn: -42, twist: 30, lean: 13, down: 15, heel: [0, 5], way: [100, 168], hands: [[14, 3, 8], [16, -8, -3]], sway: [0.6, -0.6] },
  { phase: "startup", turn: -100, twist: 62, lean: 4, down: 1, feet: [[2, -4.5], [8, -7]], lift: [0, 43], heel: [6, 0], point: [null, 50], way: [100, 90], hands: [[13, 3, 8], [2, 2, -14]], step: [22, 0], out: true, sway: [-1, 0.5] },
  { phase: "startup", turn: -118, twist: 68, lean: -6, down: -1, feet: [[2, -4.5], [36, -7]], lift: [0, 72], heel: [8, 0], point: [null, 55], way: [100, 70], hands: [[12, 4, 9], [-6, 4, -16]], out: true, smear: { limb: "leg1" }, sway: [-2.4, 0.8] },
  { phase: "active", turn: -125, twist: 72, lean: -14, down: -2, feet: [[2, -4.5], [48, -7]], lift: [0, 85], heel: [8, 0], point: [null, 55], way: [100, 60], hands: [[12, 4, 9], [-12, 6, -17]], elbow: [-1, 0.5, -1], out: true, hit: [9, 16, ...HARD], face: "shout", sway: [-3, 1] },
  { phase: "recovery", turn: -132, twist: 76, lean: -12, down: -1, feet: [[2, -4.5], [47, -6]], lift: [0, 81], heel: [8, 0], point: [null, 58], way: [100, 55], hands: [[12, 4, 9], [-10, 6, -16]], elbow: [-1, 0.5, -1], out: true, face: "shout", sway: [2, -0.4] },
  { phase: "recovery", turn: -108, twist: 62, lean: 2, down: 1, feet: [[2, -4.5], [10, -7]], lift: [0, 44], heel: [6, 0], point: [null, 50], way: [100, 90], hands: [[13, 3, 8], [2, 2, -14]], out: true, sway: [0.5, 0.5] },
  { phase: "recovery", turn: -78, twist: 46, lean: 8, down: 10, feet: [[24, -4.5], [-30, 6]], lift: [0, 4], heel: [0, 5], way: [60, 168], hands: [[14, 2, 6], [14, -9, -4]], step: [-22, 0], sway: [1, 0] },
  { phase: "recovery", turn: -60, twist: 30, lean: 11, down: 11.5, heel: [0, 3], way: [100, 168], hands: [[14, 2, 6], [18, -9, -2]], sway: [0.5, 0] },
  { phase: "recovery", hands: [[14, 2, 6], [20, -9, -1]], sway: [0, 0] },
].map((p) => ({ limb: "leg1", ...p }))
// crouch_kick: from the kneel, the lead leg drawn in and the body down, then out along the floor in a cut, the foot
// turned out (the heel leading), the trunk leaning in over it; settled and held, drawn back; the guard kept at the face
const CROUCH_KICK = [
  { phase: "startup", down: 37.5, lean: 11, rise: -3, feet: [[25, -4.5], [-30, 6]], heel: [0, 14], way: [80, 134], hands: KNELT, sway: [0, -0.5] },
  { phase: "active", down: 37.5, lean: 5, rise: -3, feet: [[53, -4.5], [-30, 6]], heel: [0, 14], way: [20, 134], hands: KNELT, out: true, hit: [3, 9, ...SOFT], sway: [-1.5, 0] },
  { phase: "recovery", down: 37.5, lean: 6, rise: -3, feet: [[51, -4.5], [-30, 6]], heel: [0, 14], way: [20, 134], hands: KNELT, out: true, sway: [1.6, 0] },
  { phase: "recovery", down: 36, lean: 11, rise: -3, feet: [[36, -4.5], [-30, 6]], heel: [0, 14], way: [50, 134], hands: KNELT, out: true, sway: [0.3, 0] },
  { phase: "recovery", down: 35, lean: 15, rise: -3, ...KNEEL, hands: KNELT, sway: [0, 0] },
].map((p) => ({ limb: "leg0", ...p }))
// jump_kick: in the air, both knees drawn up and the hips turning, the near knee up with its shin folded and held, then
// the leg out in a cut 20 degrees under level, the foot pointed, the far leg tucked under, the trunk back; held,
// drawn back in, and opened for the floor (the last drawing held to it: the KOF conversions' -1); no step of its own
// (the jump's arc goes on under it)
const JUMP_KICK = [
  { phase: "startup", turn: -75, twist: 44, down: 3, lean: 8, feet: [[6, 0], [6, 2]], lift: [22, 26], heel: [10, 6], way: [116, 95], hands: [[15, 3, 7], [16, -7, -2]], sway: [0, 0.5] },
  { phase: "startup", turn: -95, twist: 60, down: 3, lean: 2, feet: [[6, 0], [10, -4]], lift: [22, 36], heel: [10, 0], point: [null, 45], way: [116, 90], hands: [[14, 3, 8], [6, -2, -10]], out: true, sway: [-0.5, 0.2] },
  { phase: "active", turn: -112, twist: 70, down: 3, lean: -12, feet: [[3, 0], [52, -5]], lift: [24, 35], heel: [10, 0], point: [null, 50], way: [116, 60], hands: [[13, 4, 9], [-6, 4, -14]], elbow: [-1, 0.5, -1], out: true, hit: [7, 14, 200, 34], face: "shout", sway: [-2, 1] },
  { phase: "recovery", turn: -116, twist: 72, down: 3, lean: -11, feet: [[3, 0], [50, -4]], lift: [24, 34], heel: [10, 0], point: [null, 52], way: [116, 60], hands: [[13, 4, 9], [-5, 4, -13]], out: true, face: "shout", sway: [2, -0.4] },
  { phase: "recovery", turn: -90, twist: 54, down: 3, lean: 5, feet: [[6, 0], [12, -4]], lift: [22, 30], heel: [10, 0], point: [null, 40], way: [116, 95], hands: [[15, 3, 7], [16, -7, -2]], out: true, sway: [0, 1.5] },
  { phase: "recovery", down: 0, lean: 3, feet: [[11, -3], [-9, 3]], lift: [0, 0], heel: [3, 3], way: [116, 128], hands: FAR_UP, elbow: OVER, sway: [0, 3] },
].map((p) => ({ limb: "leg1", air: AIR, ...p }))
// strike: the cross, redone for its impact (the first kept as strike_old): wound down and back (the pelvis
// 4 px lower, the hips and the shoulders turned toward us, the rear fist dropped to the chest), a smeared drawing as it
// comes through, the fist out past the arm's length (39 px from the shoulder, the arm 36) with the shoulders turned on
// further than the hips, the trunk leaning in, the front foot slid and the rear heel up; settled a step back and held,
// then back to the guard in three, slower
const CROSS_REACH = [hipsFloor([29, -5], -80), hipsFloor([-41.5, 6], -80)]
const STRIKE = [
  { phase: "startup", turn: -45, twist: 34, lean: 13, down: 14, drive: 1.5, way: [110, 168], hands: [[16, 1, 7], [4, -3, -4]], sway: [0.6, -0.6] },
  { phase: "startup", turn: -55, twist: -22, lean: 18, down: 14, feet: [hipsFloor([27, -5], -76), hipsFloor([-38, 6], -76)], drive: 2, hands: [[18, 0, 7], [26, -4, 0]], smear: { limb: "arm1" }, sway: [-2, 0.6] },
  { phase: "active", turn: -62, twist: -26, lean: 25, down: 14, feet: CROSS_REACH, drive: 3.5, hands: [[27, -2, 8], [41, -5, -1]], face: "shout", hit: [8, 14, ...HARD], sway: [-3, 1.2] },
  { phase: "active", turn: -62, twist: -26, lean: 24, down: 14, feet: CROSS_REACH, drive: 3.5, hands: [[27, -2, 8], [39, -5, -1]], face: "shout", hit: [8, 14, ...HARD], sway: [2, -0.4] },
  { phase: "recovery", turn: -58, twist: -30, lean: 18, down: 13, feet: [hipsFloor([26, -5], -76), hipsFloor([-40.5, 6], -76)], drive: 2, hands: [[19, 0, 7], [26, -4, 1]], face: "shout", sway: [0.8, 0] },
  { phase: "recovery", turn: -53, twist: 4, lean: 13, down: 12, hands: [[13, 1, 6], [15, -5, -1]], sway: [-0.5, 0] },
  { phase: "recovery", down: 11.5, hands: [[14, 2, 5], [20, -9, -1]], sway: [0.3, 0] },
]
// The reactions (the 6b2 study's section 11: the MUGEN conversions' hit, fall, lying and get-up actions and their
// .cns physics, KOF 2002's Vanessa and May Lee, KOF '98's King, KOF XI's Leona, Whip, Garou's Hotaru; 3S's captures).
// A hit is a cut: the first drawing (held through the hitstop by the engine) most of the way, the farthest the next,
// held, then back over half the way, slower; the band's tails and the sash's ends flung on and swinging back.
// hurt_low: hit in the body, doubled over: the trunk folded forward over the hips, the pelvis down and back, the fists
// pulled in to the belly, the head bowed; then back half the way
const HURT_LOW = [
  { phase: "hurt", turn: -46, twist: 12, lean: 42, down: 16, heel: [0, 4], hands: [[-4, 5, -14], [0, -6, -16]], face: "low", sway: [2, 0.8] },
  { phase: "hurt", turn: -44, twist: 8, lean: 52, down: 18, heel: [0, 5], hands: [[-6, 5, -18], [-2, -6, -20]], face: "low", sway: [2.6, 1] },
  { phase: "hurt", turn: -47, twist: 14, lean: 30, down: 14, heel: [0, 3], hands: [[4, 4, -10], [8, -7, -12]], face: "tuck", sway: [0.8, 0.3] },
]
// crouch_hurt: hit while kneeling, thrown back from the hips as her standing hurt is, the knee kept down
const CROUCH_HURT = [
  { lean: -6, down: 34, hands: [[18, -2, 6], [1, 10, -18]], sway: [2, 1] },
  { lean: -16, down: 33, hands: [[16, -2, -10], [2, 6, -22]], sway: [2.6, 1.2], tails: "up" },
  { lean: 4, down: 34.5, hands: [[16, 0, 8], [6, 8, -16]], sway: [1, 0.4] },
].map((p) => ({ phase: "hurt", rise: -3, ...KNEEL, turn: -46, twist: 16, face: "hurt", ...p }))
// knockdown: thrown off her feet by a heavy blow (KOF's blowback): the hit drawing on her feet, thrown back; then a
// plank tipped back over the hips, the legs trailing, rising and turning flat; she lands on her shoulders, the legs
// up, bounces once (flat, lifted) and settles on her back. Each frame's `roll` turns the whole of her (rig3d) about
// the pelvis; `step` carries her as the conversions' physics do: back 4 px a tick in the air (KOF's 3.4-5), 30 px up
// at the top (KOF's 18-45), the floor's hit freezing her, the bounce at 3/4 of the speed and 12 px up, then sliding
// to a stop (lying friction 0.85 a tick). Lying, her legs as they rest, from her hips (fighter.lie: the rig puts each
// hip 5.3 px from the pelvis; her heading, her legs 41 px under a pelvis lowered to lie); the bounce the same legs, flung
// up and bent
const HIPS = 5.3
const lie = (o) => fighter.lie({ hips: HIPS, turn: -46, lift: -41, ...o })
const KNOCKDOWN = [
  { lean: -26, down: 10, hands: [[18, -4, -12], [2, 8, -22]], face: "back", sway: [3, 1.4] },
  { air: AIR, roll: 30, lean: -14, down: 9, feet: [[8, -4.5], [-8, 6]], lift: [-5, -5], hands: [[22, -2, 2], [14, 8, -6]], face: "back", sway: [3, 1.6] },
  { air: AIR, roll: 58, lean: -12, down: 14, feet: [[14, -4.5], [-2, 6]], lift: [-4, -8], hands: [[18, -2, 14], [16, 8, 8]], face: "flat", sway: [2.4, 2] },
  { air: AIR, roll: 84, lean: -10, down: 22, feet: [[18, -4.5], [15, 6]], lift: [-6, -6], point: [30, 30], hands: [[12, -2, 18], [18, 4, -4]], face: "flat", sway: [1.6, 2.4] },
  { roll: 108, lean: 4, down: 35, feet: [[16, -4.5], [14, 6]], lift: [-14, -14], point: [30, 30], hands: [[10, -4, 10], [12, 2, -22]], elbow: [0.4, 0, -1], face: "flat", sway: [-1, -1], lying: true, tails: "flat", fx: { name: "dust_fall", at: "middle" } },
  { air: AIR, roll: 86, lean: -6, down: 39, ...lie({ lift: -30, back: -4, out: 3, point: 25 }), hands: [[8, -4, 16], [14, 2, -20]], elbow: [0.4, 0, -1], face: "flat", sway: [-0.5, 2], lying: true, tails: "flat" },
  { air: AIR, roll: 90, lean: -4, down: 41, ...lie({ lift: -36, back: -1, out: 1, point: 20 }), hands: [[4, -4, 8], [13, 2, -22]], elbow: [0.4, 0, -1], face: "flat", sway: [0, 1], lying: true, tails: "flat" },
  { roll: 90, lean: -2, down: 43, ...lie({ lift: -40, back: 2 }), hands: [[2, -2, -22], [12, 2, -22]], elbow: [-0.4, 0, -1], face: "flat", sway: [0, -1], lying: true, tails: "flat" },
  { roll: 90, lean: 0, down: 44, ...lie({}), hands: [[1, -2, -24], [12, 2, -24]], elbow: [-0.4, 0, -1], face: "flat", sway: [0, 0], lying: true, tails: "flat" },
].map((p) => ({ phase: "fall", turn: -46, twist: 14, ...p }))
// (the flight's steps, fighter.flight: back 4 px a tick, 30 up, the bounce 12)
const FLIGHT = fighter.flight(msOf(F.states.knockdown).map(TICKS))
const knockdown = (i) => posed({ ...KNOCKDOWN[i], step: FLIGHT(i) })
// down: lying on her back, held: a breath, the chest a px up and down (the conversions lie 38-60 ticks: KOF's 38-40)
const DOWN = KNOCKDOWN[8], BREATHE = [0, 1, 1.5, 0.5]
const down = (i) => posed({ ...DOWN, phase: "down", lean: DOWN.lean + BREATHE[i] * 1.5, sway: [0, 0] })
// get_up's head (face "chin", the 6b2 study's 11.8) is drawn TIP degrees chin down, and sits where her neck puts it:
// the neck (the chest to the head's middle, as the rig lays it along her spine) bent forward about the chest, in the
// picture's plane, until it stands at the head's own angle (rig3d's `nod`): lying back on an elbow, the head stands over
// her chest, its chin on it, as the games' get-ups hold it
const TIP = { chin: 12 }
// get_up: from lying to her guard, as her school does (KOF 2002's Vanessa, King and May Lee put their weight on a
// hand): up on the near forearm, sat up on the near hand, the legs drawn in under her as the hand pushes (the rear knee
// folding, the lead foot planted), a knee down and a hand pushing on the lead knee, risen, her stance; the head up and
// at her opponent from the first drawing (its chin on her chest, her eyes up at her: the chin head, where her neck
// puts it), the push held and the rise quick; untouchable throughout (MUGEN's get-up: hit by nothing until it ends).
// The rolled ones' hands and feet placed where the floor is (a hand flat on it, the soles on it), in her upright frame
const GET_UP = [
  { roll: 68, lean: 6, down: 40, feet: [[2.4, -4], [5.4, 6]], lift: [-24, -31], point: [0, 0], hands: [[-3.8, 3.4, -21.5], [-1.9, 13.2, -11]], elbow: [-0.56, 0.97, 0.09], face: "chin", sway: [0, 0] },
  { roll: 50, lean: 8, down: 38, feet: [[4.7, -4], [16.3, 6]], lift: [-11.4, -25.2], point: [0, 0], hands: [[-2.7, 1.2, -28.6], [-4.2, 14.9, -23.3]], elbow: [-0.58, 1, -0.18], face: "chin", sway: [0.5, 0.5] },
  { roll: 46, lean: 6, down: 38, way: [110, 120], feet: [[5.2, -4], [-15.7, 6]], lift: [-11.4, 10.2], point: [-12, 10], hands: [[1.5, 2.2, -26], [-4.2, 17.1, -24.3]], elbow: [-0.57, 0.98, -0.26], face: "chin", sway: [1, 0.5] },
  { lean: 26, down: 35, rise: -3, ...KNEEL, hands: [[16, 2, 0], [6, -27.3, -17]], elbow: [-1, 0.5, 0], face: "chin", sway: [1, 0] },
  { lean: 18, down: 21, feet: [[22, -4.5], [-28, 6]], heel: [0, 7], hands: [[16, 2, -1], [24, -9, -11]], face: "chin", sway: [0, -1] },
  // her stance as the idle's first drawing has it, so the idle follows without a jump
  { down: STANCE.down + BOB[0], hands: STANCE.hands.map((h) => [h[0], h[1], h[2] - BOB[7] * 0.6]), sway: [0, (BOB[0] - BOB[7]) * 0.9] },
].map((p) => ({ phase: "getup", invuln: true, nod: TIP[p.face], ...p }))
const getUp = (i) => posed(GET_UP[i])
// Her two specials (the 6b2 study's section 12: the MUGEN conversions' specials and their .cns, KOF '98's and CvS's
// King, Athena, Mai, the CvS Chun-Li and Cammy, Garou's Hotaru; 3S's captures), archetypes in her own look. A special's
// wind-up is its own and long (9-16 ticks, a normal's 2-9), the hands gathered and drawn in to the body; the release a
// cut, held while the effect leaves; the way back long (the special's price).
// wave: a gold wave pushed from both palms. Turned away from her opponent, the weight back, both hands drawn back to the
// rear hip, then lower and held while a light gathers between the palms; the push a cut, both palms out at her chest
// (one over the other, the wrists together: from the side both show), past the arms' length, the trunk thrown in, the
// front foot slid and the rear heel up: the wave is born over the palms (`spawn`, the study's medians: 0.36 of her
// height ahead, 0.55 up, 5 px a tick); held while it leaves, then back the long way
const WAVE_AT = [hipsFloor([33, -5], -72), hipsFloor([-36, 6], -72)], SPAWN = { name: "wave", at: [40, -60], speed: 5 }
const WAVE = [
  { phase: "startup", turn: -24, twist: 38, lean: 5, down: 16, heel: [3, 3], hands: [[-6, 24, -17], [-12, 13, -21]], elbow: [-1, 0.5, 0], sway: [0.8, -0.4] },
  { phase: "startup", turn: -20, twist: 42, lean: 9, down: 19, heel: [4, 4], hands: [[-8, 29, -18], [-15, 17, -19]], elbow: [-1, 0.5, 0], palm: true, gather: true, sway: [1.2, -0.6] },
  { phase: "active", turn: -72, twist: -16, lean: 21, down: 13, feet: WAVE_AT, drive: 3, hands: [[37, -4, 0], [36, -12, -6]], palm: true, face: "shout", spawn: SPAWN, sway: [-2.6, 0.8] },
  { phase: "recovery", turn: -70, twist: -14, lean: 19, down: 13, feet: WAVE_AT, drive: 3, hands: [[35, -4, 0], [34, -12, -6]], palm: true, face: "shout", sway: [1.6, -0.4] },
  { phase: "recovery", turn: -60, twist: 2, lean: 15, down: 12.5, feet: [hipsFloor([30, -5], -70), hipsFloor([-35, 6], -70)], drive: 1.5, hands: [[22, 0, 3], [24, -8, -3]], sway: [0.6, 0] },
  { phase: "recovery", turn: -52, twist: 16, lean: 11, down: 11.5, hands: [[15, 2, 5], [20, -9, -2]], sway: [0.2, 0] },
  { phase: "recovery", down: STANCE.down + BOB[0], hands: STANCE.hands.map((h) => [h[0], h[1], h[2] - BOB[7] * 0.6]), sway: [0, (BOB[0] - BOB[7]) * 0.9] },
]
// rise_kick: a rising spinning kick. Coiled down, open to the camera, the fists crossed low (untouchable from the first
// tick, `invuln`, as the conversions' anti-airs are: 4-6 ticks); up on the ball of the lead foot as the rear leg sweeps
// forward and up (a smear along its arc); off the floor, the leg out ahead and a little up, the trunk back, the arms out
// for the turn; then one whole turn in three drawings (her back to us, the far side, back to her own), the leg turning
// with the hips, the gold trail its foot's path; the leg folding at the top, a hang, the fall with the legs reaching
// (the jump's), the landing (the jump's). Off the floor its steps rise and fall RISE px and sum to 0: she lands where
// she left (the 3S kazakiri's way). Each turned frame's feet, toes and head from its hips' heading
// (a pose's feet are on the floor's axes: turned with the hips here, from where they are as the kick lands, at -125).
// The rising knee hits already, on the floor, from tick 3 (its box round the knee, `at: "knee"`; still untouchable), as
// the games' rising kicks catch a crouching foe in their first frames (6h1: Haldor crouched)
const RISE = 76, KICK_FEET = [[4, 2], [45, -6]], SPIN = (turn) => ({ turn, way: [180 + turn - 14, 180 + turn - 4], feet: KICK_FEET.map((f) => hipsFloor(hipsFloor(f, -125), turn)) })
const KICKED = { lift: [24, 86], heel: [0, 0], point: [40, 55], hands: [[4, -26, 6], [4, 26, 2]], elbow: [-1, 0.5, -1] }
const RISE_KICK = [
  { phase: "startup", turn: -30, twist: 30, lean: 18, down: 19, heel: [4, 5], hands: [[12, 6, -14], [14, -12, -12]], invuln: true, face: "down", sway: [0.4, -0.8] },
  { phase: "active", turn: -95, twist: 46, lean: -2, down: 3, feet: [[2, -4.5], [44, -7]], lift: [0, 26], heel: [8, 0], point: [null, 50], way: [100, 95], hands: [[6, -12, 2], [0, 14, -2]], invuln: true, hit: [12, 18, 200, 0], knockdown: true, at: "knee", face: "up", sway: [-1, 1] },
  { phase: "active", air: AIR, ...KICKED, ...SPIN(-125), twist: 34, lean: -12, down: -4, hands: [[-16, -18, -10], [4, 26, 2]], elbow: [-1, 0.5, 0], hit: [12, 18, 200, 0], knockdown: true, trail: true, face: "up", sway: [-2, 2] },
  { phase: "active", air: AIR, ...KICKED, ...SPIN(-215), feet: [SPIN(-215).feet[0], [40, 4]], lift: [24, 70], twist: 30, lean: -8, down: -4, hit: [12, 18, 200, 0], knockdown: true, trail: true, face: "rear", sway: [-1.5, 2.4] },
  { phase: "active", air: AIR, ...KICKED, ...SPIN(-305), twist: 30, lean: -8, down: -4, hands: [[6, -24, -12], [-16, 18, -10]], elbow: [-1, 0.5, 0], hit: [12, 18, 200, 0], knockdown: true, trail: true, face: "mirror", sway: [-1, 2.4] },
  { phase: "recovery", air: AIR, ...SPIN(-410), twist: 30, lean: 4, down: 0, feet: [[6, 2], [16, -4]], lift: [22, 38], heel: [0, 0], point: [30, 30], hands: [[6, -14, 6], [8, 12, 4]], face: "up", sway: [0, 1] },
  { ...JUMP[7], phase: "recovery", sway: [0, 0] },
  { ...JUMP[8], phase: "recovery" },
  { ...JUMP[9], phase: "recovery" },
  { ...JUMP[11], phase: "recovery" },
  { ...JUMP[12], phase: "recovery" },
].map((p) => ({ limb: "leg1", out: p.phase === "active", ...p }))
const RT = msOf(F.states.rise_kick).map(TICKS), RA = RT.reduce((s, t, k) => s + (RISE_KICK[k].air ? t : 0), 0)
const RY = RT.map((t, k) => { if (!RISE_KICK[k].air) return 0; const t0 = RT.slice(0, k).reduce((s, u, q) => s + (RISE_KICK[q].air ? u : 0), 0) + t / 2; return Math.round((4 * RISE * t0 * (RA - t0)) / RA ** 2) })
const riseKick = (i) => { const q = smeared(RISE_KICK, i); return { ...q, step: [0, (i ? RY[i - 1] : 0) - RY[i]] } }
// a drawing with a smear: given the drawing after (its limb stretched toward where it goes)
const smeared = (P, i) => { const q = posed(P[i]); return q.smear ? { ...q, smear: { ...q.smear, to: posed(P[i + 1]) } } : q }
// Thrown (the 6b2 study's 13.5 and 13.18: the conversions draw the one thrown with her own reaction drawings, bound
// each tick at a point of hers, px from the thrower's axis, and turned by flipping them whole; a heavy's throws ask 3-4
// poses of her at a few angles): four poses, each a weight he carries, the limbs hanging where her angle puts the
// floor and lagging the turn, her face the hurt's; each turned whole by `roll` (rig3d) about her pelvis to the angles
// his throws ask for, a frame an angle. thrown_<pose>: grabbed (the start: startled, the arms dropped loose, the feet
// leaving the floor), folded (doubled over his forearm at the waist, the head and the arms hanging, the legs
// dangling), face_up (stretched on her back, the head back, the arms and legs hanging behind her) and face_down
// (stretched face down, the limbs hanging ahead of her; and slammed flat on her face, the limbs flung out along the
// floor); flat on her back, her arms flung up off the drop (they lag it). Each frame's data says its `roll`; the thrower's `bind` names
// the anim and the roll. Her pivot in these is her pelvis, the point a thrower binds; drawn on a frame of their own
const THROWN = {
  // (two drawings each: the start, upright, the arms flung up, then dropped loose; folded, tipped 45 toward him over his
  // arm, the head hanging face down, the legs swung back as he lifts, then forward)
  thrown_grabbed: [
    { roll: 0, turn: -46, twist: 12, lean: -12, feet: [[8, -4.5], [-16, 6]], heel: [0, 6], hands: [[12, -4, -6], [4, 9, -10]], elbow: [-0.2, 1, -0.6], face: "hurt", sway: [2.6, 1.6] },
    { roll: 0, turn: -46, twist: 12, lean: -6, feet: [[6, -4.5], [-12, 6]], lift: [8, 4], point: [20, 30], hands: [[6, -3, -22], [-2, 9, -24]], elbow: [-0.2, 1, -1], face: "hurt", sway: [1.6, 0.8] }],
  thrown_folded: [
    { roll: -45, turn: -46, twist: 8, lean: 45, feet: [[14, -4.5], [6, 6]], lift: [8, 4], point: [30, 40], hands: [[24, 3, 4], [20, -6, 2]], elbow: [0.4, 1, -0.4], face: "dn90", sway: [1, 2] },
    { roll: -45, turn: -46, twist: 8, lean: 45, feet: [[24, -4.5], [16, 6]], lift: [10, 6], point: [30, 40], hands: [[26, 3, 0], [22, -6, -2]], elbow: [0.4, 1, -0.4], face: "dn90", sway: [2.4, 1] }],
  thrown_face_up: [
    { roll: 45, turn: -46, twist: 14, lean: -16, feet: [[2, -4.5], [-10, 6]], lift: [6, 14], point: [20, 30], hands: [[4, -4, 36], [-28, 8, -22]], elbow: [-1, 0.5, -1], face: "back", sway: [1, 2.2] },
    { roll: 90, turn: -46, twist: 14, lean: -12, feet: [[-4, -4.5], [-12, 6]], lift: [10, 16], point: [25, 35], hands: [[32, -8, 4], [24, -14, -16]], elbow: [-0.4, 0.5, -1], face: "flat", sway: [0, 2.4] },
  ],
  thrown_face_down: [
    { roll: -90, turn: -46, twist: 10, lean: 6, feet: [[12, -4.5], [4, 6]], lift: [12, 18], point: [10, 20], hands: [[20, -3, -10], [16, 7, -14]], elbow: [0.2, 1, -1], face: "dn90", sway: [2.6, 0] },
    { roll: 180, turn: -46, twist: 10, lean: 2, feet: [[6, -4.5], [-6, 6]], lift: [8, 14], point: [20, 25], hands: [[6, -4, 18], [0, 8, 20]], elbow: [0.4, 1, 0.4], face: "inv", sway: [0, -2] },
    // (slammed flat on her face: the body straight along the floor, the arms flung on past her head, the legs out
    // straight behind, the feet pointed; his Sledge's impact)
    { roll: -90, turn: -46, twist: 10, lean: 0, feet: [[2, -4.5], [0, 6]], point: [30, 35], hands: [[0, -10, 20], [2, 10, 16]], elbow: [0.2, 1, 0.4], face: "dn90", sway: [0, 0] },
  ],
}
// down_face: lying on her front, held: where a heavy's throw that slams her on her face lets her go (Haldor's Sledge).
// Her slammed drawing (thrown_face_down's last) laid on the floor, her pelvis as low as on her back, her legs straight
// from her hips to it, the arms flung on past her head along the floor; down's breath, her back a px up and down
const DOWN_FACE = { ...THROWN.thrown_face_down[2], down: 44, lift: [-41, -41], hands: [[-1.6, -3.3, 21], [16.2, -13.3, 19]], elbow: [0.2, 1, 0], phase: "down", lying: true, sway: [0, 0] }
const downFace = (i) => posed({ ...DOWN_FACE, lean: DOWN_FACE.lean - BREATHE[i] * 1.5 })
// The turns (the 6b2 study's 13.21: the conversions' turn anims, MUGEN's 5 standing and 6 crouching, 4-12 ticks
// standing, the median 6-7, and 3-7 crouching, in 2-5 drawings): when she crosses over the other in neutral, the engine
// turns her to face him. Hers quick, as her school's: turn 1, 2, 1, 1 ticks, crouch_turn 1, 2, 1. Through her front, as
// Haldor's tongs_hold turns him: the hips, the chest and the head come round to us, the feet pivoting on their balls
// where they stand; facing us, square (the hips, the chest and the head, the fists before her chest side by side), the
// engine mirrors her (`flip`: from that frame on she is drawn in her new facing, each foot on the screen px it left,
// the one behind her now her lead: fighter.flipped); turned on to her, the feet shuffled toward her guard's; her guard.
// Crouching, low the whole way (her head never over the kneel's): up off her knee onto the balls of both feet, square
// on them facing us, down onto the other knee. Before the flip the rear foot turns on its ball to point at him behind
// her (250), the lead one kept (110), so the frame facing us has them the same, mirrored. The fists' places on the
// floor's axes, from each shoulder (onFloor)
const GUARD_AT = { down: STANCE.down + BOB[0], hands: STANCE.hands.map((h) => [h[0], h[1], h[2] - BOB[7] * 0.6]), sway: [0, (BOB[0] - BOB[7]) * 0.9] }
const halfway = (a, b) => a.map((f, k) => f.map((v, e) => (v + b[k][e]) / 2))
const TURN = [
  { turn: -24, twist: 10, lean: 8, down: 12, heel: [3, 3], way: [110, 250], hands: [[0, -13, 3], [11, -13, -1]], face: "front", sway: [0.6, 0] },
  { turn: 0, twist: 0, lean: 6, down: 12.5, feet: fighter.flipped(STANCE.feet), heel: [3, 3], way: [110, 250], hands: [[-5, -13, -1], [5, -13, -1]], face: "front", flip: true, sway: [0, 0] },
  { turn: -32, twist: 14, lean: 9, down: 12, feet: halfway(fighter.flipped(STANCE.feet), STANCE.feet), heel: [2, 2], way: [110, 210], hands: [[0, -13, 3], [11, -13, -1]], sway: [-0.6, 0] },
].map((p) => onFloor(p)).concat([GUARD_AT]).map((p) => ({ phase: "turn", ...p }))
const KNELT_AT = { down: BODY.hip - 23, lean: 16, rise: -3, ...KNEEL, hands: KNELT, sway: [0, 0] }
const CROUCH_TURN = [
  { turn: -24, twist: 10, lean: 14, down: 36, rise: -3, feet: KNEEL.feet, heel: [6, 6], way: [110, 250], hands: [[2, -13, 5], [12, -13, -2]], face: "front", sway: [0.6, 0] },
  { turn: 0, twist: 0, lean: 14, down: 37, rise: -2, feet: fighter.flipped(KNEEL.feet), heel: [6, 6], way: [110, 250], hands: [[-5, -13, 0], [5, -13, 0]], face: "front", flip: true, sway: [0, 0] },
].map((p) => onFloor(p)).concat([KNELT_AT]).map((p) => ({ phase: "turn", ...p }))
// The win (MUGEN's 180 and 181, the win pose: the 6b2 study's 15.6): played from her guard when the round is won, held
// on its last drawing to the round's end (the games hold 52 of 55 light fighters' wins); hers quick, 5 drawings, 36
// ticks to the pose (6, 8, 12, 10: the profile's). One fist thrown up over her head, opened to us at 3/4, her head on
// him: risen out of the guard, the near (rear) fist drawn down past her hip, brought up past her shoulder and punched
// straight up, the arm straight, the knees settling under it; the other fist at her hip. The raised arm is the near
// one: drawn over the head, it goes up behind it, beside her bob, the face clear (the far arm, drawn under the head,
// would be hidden behind it). On a frame of its own, taller (TALL)
const WIN = [
  { turn: -44, twist: 10, lean: 6, down: 8, feet: [[20, -3.5], [-30, 5.5]], way: [115, 172], hands: [[8, -6, -14], [1, -13, -29]], sway: [0.6, -0.6] },
  { turn: -40, twist: 4, lean: 2, down: 5, feet: [[16, -3], [-24, 5]], way: [120, 180], hands: [[-2, -6, -27], [-5, -1, 31]], elbow: [0, 1, 0], sway: [0, -0.4] },
  { turn: -38, twist: 0, lean: -2, down: 4.5, feet: [[16, -3], [-24, 5]], way: [120, 180], hands: [[-2, -6, -28], [-8, -1, 38]], sway: [0, 0.6] },
  { turn: -38, twist: 0, lean: 0, down: 6, feet: [[16, -3], [-24, 5]], way: [120, 180], hands: [[-2, -6, -29], [-8, -1, 36]], sway: [0, 0.4] },
  { turn: -38, twist: 0, lean: -1, down: 5, feet: [[16, -3], [-24, 5]], way: [120, 180], hands: [[-2, -6, -28], [-8, -1, 37]], sway: [0, 0] },
].map((p) => ({ phase: "win", ...onFloor(p) }))
const MOVES = { idle: { pose: idle, ms: BOB.map(() => F.states.idle.ms) }, strike: { pose: (i) => smeared(STRIKE, i), ms: msOf(F.states.strike) }, hurt: { pose: hurt, ms: F.states.hurt.ms },
  walk_f: { pose: walk(false), ms: msOf(F.states.walk_f) }, walk_b: { pose: walk(true), ms: msOf(F.states.walk_b) },
  crouch: { pose: crouch, ms: msOf(F.states.crouch) }, crouch_hold: { pose: crouchHold, ms: msOf(F.states.crouch_hold) },
  jump: { pose: jump, ms: msOf(F.states.jump) }, block: { pose: block, ms: msOf(F.states.block) }, block_low: { pose: blockLow, ms: msOf(F.states.block_low) },
  // (MUGEN's 5 and 6, the turns in neutral)
  turn: { pose: (i) => posed(TURN[i]), ms: msOf(F.states.turn) }, crouch_turn: { pose: (i) => posed(CROUCH_TURN[i]), ms: msOf(F.states.crouch_turn) },
  // (MUGEN's 181, the win pose: its last drawing held)
  win: { pose: (i) => posed(WIN[i]), ms: msOf(F.states.win) },
  ...Object.fromEntries([["jab", JAB], ["kick_l", KICK_L], ["kick_h", KICK_H], ["crouch_kick", CROUCH_KICK], ["jump_kick", JUMP_KICK]].map(([m, P]) => [m, { pose: (i) => smeared(P, i), ms: msOf(F.states[m]) }])),
  strike_old: { pose: strikeOld, ms: F.states.strike_old.ms },
  hurt_low: { pose: (i) => posed(HURT_LOW[i]), ms: msOf(F.states.hurt_low) }, crouch_hurt: { pose: (i) => posed(CROUCH_HURT[i]), ms: msOf(F.states.crouch_hurt) },
  knockdown: { pose: knockdown, ms: msOf(F.states.knockdown) }, down: { pose: down, ms: msOf(F.states.down) }, get_up: { pose: getUp, ms: msOf(F.states.get_up) },
  down_face: { pose: downFace, ms: msOf(F.states.down) },
  wave: { pose: (i) => posed(WAVE[i]), ms: msOf(F.states.wave) }, rise_kick: { pose: riseKick, ms: msOf(F.states.rise_kick) },
  ...Object.fromEntries(Object.entries(THROWN).map(([m, P]) => [m, { pose: (i) => posed({ phase: "thrown", air: AIR, tails: "down", ...P[i] }), ms: P.map(() => 100) }])) }
// (lying, she is as long as she stands: the moves that lie down are drawn on a pivot 8 px further right, so her head
// stays in the frame, the frame the same size)
const FALLS = ["knockdown", "down", "get_up"], PIV2 = [60, 114]
// (lying on her front, her head to the right as he slams her: on a pivot of its own, 10 px further right)
const FACE = ["down_face"], PIV4 = [70, 114]
// (her win, a fist raised over her head: on a frame of its own, 32 px taller, her feet as low in it)
const TALLS = ["win"], PIV5 = [52, 146]
// (thrown, turned any way about her pelvis: drawn on a square of TW px, her pelvis at its middle, the anims' pivot)
const THROWS = Object.keys(THROWN), TW = 144
const W = 130, H = 118, PIV = [52, 114], PITCH = F.camera.pitch, TAN = Math.tan((PITCH * Math.PI) / 180)

// ---------------------------------------------------------------- the tones: where each falls, by design (Xrd's threshold)
// (fighter.toonOf: a material a ramp of 24 steps cut where its terminator falls, moved by a bias.) Her materials, each
// [its line, its fills dark to light, the cuts between them]: skin S s z Z, hair H h J (its line black), top S R r,
// trousers N n m, shoes N n m (black line), sash Y y u, wraps W w; S under the skin and the top their crease tone
const TONE = {
  skin: ["S", "SszZ", [0.08, 0.4, 0.74]], hair: ["k", "HhJ", [0.4, 0.84]], top: ["S", "SRr", [0.08, 0.44]],
  fist: ["W", "SszZ", [0.08, 0.4, 0.74]], tr: ["N", "Nnm", [0.42, 0.88]], shoe: ["k", "Nnm", [0.36, 0.8]], sash: ["Y", "Yyu", [0.4, 0.8]], wrap: ["W", "Ww", [0.4]],
  sole: ["k", "W", []] }
const toon = fighter.toonOf(TONE, "S")
// a material with its bias: the place's own, a shadow cast on it, a crease (deep), a light (shine, below 0)
const T = (m, base, cast = 0, occ = 0, shine = 0) => toon(m, base + cast + shine, occ)
// (the shadows the parts cast on each other and the creases by design: fighter's shadowed and nearOf)

// ---------------------------------------------------------------- her parts, each painted in its own coordinates
// the fist in its own frame (y ahead, z up, x across, toward us), upright as she draws it whatever the forearm does
// (only a little of its slope kept): the wrapped hand a rounded block; its knuckles bare, three bumps along its top
// (shaped for the side view, as Xrd shapes a model for its camera: from the side a fist's knuckle row runs away from
// us), a light on each, lined in the wraps' dark as she draws them; the fingers' creases across its front; the thumb
// across its side toward us, lined as a piece of its own; the wraps' bands round the back of the hand
const FIST = (fb) => sdf.union(
  sdf.union(sdf.box([6.6, 7.6, 8.2], { round: 2.5 }).at(0, 0.2, -0.4), ...[-1.4, 0.9, 3.1].map((y) => sdf.sphere(1.45).at(0, y, 3.3)), { smooth: 0.6 })
    // (the knuckles' dents between the bumps; the fingers' two creases across the front; one band at the wrist)
    .paint((p, n) => p[2] > 2.6 && p[1] > -2.6 ? T("fist", fb - 0.04 + (band(p[1] + 9, 2.3, 1.82, 0.35) ? 0.45 : 0), 0, 0, n[2] > 0.6 ? -0.24 : 0)
      : p[1] > 2.4 ? T("wrap", fb + (band(p[2] + 9, 2.1, 1.5, 0.4) ? 0.5 : 0))
        : T("wrap", fb + (p[1] < -2.4 && p[1] > -3.4 ? 0.5 : 0))).part("hand"),
  sdf.capsule([2.9, -1.4, -3.3], [3.1, 3.2, -1.3], 1.3, 1.1).paint(() => T("wrap", fb + 0.08)).part("thumb"))
// the open hand of the wave's push, in the fist's frame: the palm a slab facing ahead, its heel on the wrist, the
// fingers together up from it (`up` -1: down, the lower hand), the thumb along its side; the palm and the fingers bare,
// lit where they face up or ahead, the back of the hand in its wraps
const PALM = (fb, up) => sdf.union(sdf.box([5.6, 2.6, 6.6], { round: 1.2 }).at(0, 0, 2.4), sdf.box([5, 2.1, 4.4], { round: 1 }).at(0, -0.2, 6.4), { smooth: 0.7 })
  .paint((p, n) => n[1] < -0.55 && p[2] < 5 ? T("wrap", fb) : T("skin", fb, 0, p[2] > 4.6 && Math.abs(n[0]) > 0.6 ? 0.3 : 0, n[1] > 0.5 || n[2] * up > 0.6 ? -0.2 : 0)).part("hand")
  .union(sdf.capsule([2.7, 0.8, 0.4], [3.2, 1.6, 3.8], 1.1, 1).paint(() => T("skin", fb + 0.06)).part("thumb")).rotate(up > 0 ? 0 : 180, "y")
const fistWay = (fd, f) => { const h = Math.hypot(fd[0], fd[1]) / (len(fd) || 1); return h < 0.35 ? [f[0], f[1], 0] : [fd[0], fd[1], 0.3 * fd[2]] }

// the figure below the head, part by part, for a frame's joints
const parts = (j, p = {}) => {
  const near = j.depth(j.legs[1].hip) > j.depth(j.legs[0].hip) ? 1 : 0, nearArm = j.depth(j.arms[1].sh) > j.depth(j.arms[0].sh) ? 1 : 0
  const out = {}, UP = [0, 0, 1], twist = Math.atan2(dot(j.sh.f, j.r), dot(j.sh.f, j.f))
  // the bones that throw shadows and make creases (with their radii)
  const armB = j.arms.map((A) => [[A.sh, A.elbow, 4.7, 3.6], [A.elbow, A.hand, 3.8, 3.3], [A.hand, A.hand, 4.8, 4.8]])
  const legB = j.legs.map((L) => [[L.hip, L.knee, 7.2, 5.8], [L.knee, L.ankle, 5.8, 4.6]])
  // the torso: the bare waist, the ribs, the bust ahead (the way the shoulders face), swept along her spine
  const waist = j.pelvis[2] + 1.4, top = j.chest[2] + 0.5, lean = sub(j.chest, j.pelvis), hips = [j.pelvis[0], j.pelvis[1], 0], HEM = 0.4
  const along = (h) => { const t = (waist + h * (top - waist) - j.pelvis[2]) / lean[2]; return [lean[0] * t, lean[1] * t] }
  const ahead = (h, a) => a - twist * smooth(0.2, 0.8, h)
  // an hourglass, not a drum: narrowest at the waist, the ribcage widening to under the bust, the bust ahead, and above
  // it the chest rounding in to the shoulders' root; a V from the armpits down to the waist (a drum's straight sides
  // and flat top read as a crate)
  const R = (h, a) => { const b = ahead(h, a), wide = 6 + 3.6 * smooth(0.1, 0.74, h) - 1.6 * smooth(0.8, 1, h)
    return wide * (0.78 + 0.22 * Math.abs(Math.sin(b))) + 4.2 * Math.exp(-(((h - 0.68) / 0.13) ** 2)) * Math.max(0, Math.cos(b)) ** 2 }
  const swept = (z0, z1, rad, shift, paint) => { const P = j.sweep(hips, z0, z1, rad, { shift }); return P.field.paint((q, n) => { const [h, a] = P.at(q); return paint(h, a, q, n) }) }
  // (the midriff: the line down the belly; the top's shadow a px or two under its hem, the arms' on it; the creases at
  // the sash; its heights from the waist, as the top's)
  const z0 = waist - 3, wh = (h) => (z0 + h * (top - z0) - waist) / (top - waist)
  out.torso = swept(z0, top, (h, a) => R(wh(h), a), (h) => along(wh(h)), (h0, a, q) => { const h = wh(h0)
    return T("skin", Math.abs(ahead(h, a)) < 0.13 && h > 0.06 && h < HEM - 0.05 ? 0.32 : 0, (h > HEM - 0.07 && h < HEM + 0.1 ? 0.45 : 0) + 0.4 * shadowed(q, armB.flat()), h < 0.05 ? 0.25 : 0) })
  // the crop top over the chest, its hem a px off the skin, just under the ribs (the waist bare): under the bust a
  // crescent of shadow, the side away in shadow (not the lower half: a band across read as a crate's lid); the arms'
  // shadows, the armpits' creases; a light on the bust's top
  const NECK = 0.9, tH = (h) => HEM + (NECK - HEM) * h
  out.top = swept(waist + HEM * (top - waist), waist + NECK * (top - waist), (h, a) => R(tH(h), a) + 0.9, (h) => along(tH(h)), (h, a, q) => { const b = ahead(tH(h), a)
    return T("top", (Math.abs(b) < 0.9 && tH(h) > 0.5 && tH(h) < 0.58 ? 0.3 : 0) + (Math.abs(b) > 2 ? 0.16 : 0), 0.4 * shadowed(q, armB.flat()), 0.5 * nearOf(q, armB.map((B) => B[0]), 2.2), Math.abs(tH(h) - 0.74) < 0.08 && Math.abs(b) < 0.9 ? -0.2 : 0) })
  // its straps from the neckline over the shoulders' tops, lying on the skin where it is lit, so they read (on the slope
  // by the neck they stood in the air behind it, and in its shadow they were lost); each by its arm's side, the near one
  // drawn with the near arm, over its shoulder; no line of their own (tidy's "straps")
  for (const i of [0, 1]) { const o = add(j.chest, mul(j.sh.r, i ? 8 : -8)), crest = add(o, [0, 0, 2.3]), at = (fw) => add(o, add(mul(j.sh.f, fw), [0, 0, -3]))
    out[`strap${i}`] = sdf.capsule(at(5.5), crest, 1).union(sdf.capsule(crest, at(-5.5), 1)).paint(() => T("top", 0.04)) }
  // the sash wound round the hips over the trousers' top, 5 px, lower at her front than at her back (it sits on the
  // hip bones): its upper edge in the light, its lower in shadow, creases pulled toward the knot. The knot at the front
  // of her hips toward us, its top in the light; two ends hanging from it, the longer near us, tapering, a light ridge
  // down each, swung by the pose's sway (their middles half as far)
  const kn = (fw, rt, z) => add(add(hips, add(mul(j.f, fw + 1.4), mul(j.r, rt))), [0, 0, waist + z]), kA = Math.atan2(4, 11)
  const mid = (a) => waist + 0.9 - 0.4 * Math.cos(a), sz0 = waist - 2.6, sz1 = waist + 4.4
  const band5 = j.sweep(hips, sz0, sz1, (h, a) => 10.4 - 0.6 * Math.abs(Math.sin(a)) + 0.3 * h, { keep: (h, a) => Math.abs(sz0 + h * (sz1 - sz0) - mid(a)) < 2.5 })
  out.sash = band5.field.paint((q, n) => { const a = band5.at(q)[1], u = (q[2] - mid(a)) / 2.5, d = Math.atan2(Math.sin(a - kA), Math.cos(a - kA))
    const crease = Math.abs(d) > 0.35 && Math.abs(d) < 1.1 && band(u * 2.5 + Math.abs(d) * 5, 4.2, 2.1, 0.6)
    return T("sash", 0.04 + (crease ? 0.36 : 0), 0, u < -0.55 ? 0.25 : 0, u > 0.5 && n[2] > -0.1 ? -0.3 : 0) })
  const sway = p.sway ?? [0, 0], swung = (q, k) => add(q, add(mul(j.f, sway[0] * k), [0, 0, sway[1] * k]))
  const end = (a, b, r0, r1) => { const m = swung(mul(add(a, b), 0.5), 0.45), rm = (r0 + r1) / 2, paint = (t) => (t2, ang) => T("sash", t + t2 / 2 > 0.85 ? 0.28 : 0.04, 0, 0, Math.abs(ang - 0.6) < 0.5 ? -0.25 : 0)
    return sdf.union(bone(a, m, r0, rm, j.f, j.r, paint(0)), bone(m, swung(b, 1), rm, r1, j.f, j.r, paint(0.5)), { smooth: 0.6 }) }
  out.knot = [sdf.ellipsoid([2.8, 2.1, 2.4]).at(...kn(9.9, 3.9, 0.2)).paint((q, n) => T("sash", n[2] < -0.4 ? 0.3 : 0.04, 0, 0, n[2] > 0.3 ? -0.3 : 0)),
    end(kn(10.2, 4.8, -1.4), kn(11.2, 6, -12.2), 1.9, 1.1), end(kn(9.8, 3, -1.2), kn(10.6, 1.8, -8.7), 1.6, 1)]
  // the neck, in the jaw's shadow (bent with get_up's head, to 4 px short of its middle)
  const nk = p.nod === undefined ? add(j.head, [0, 0, -4]) : add(j.chest, mul(sub(j.head, j.chest), 1 - 4 / len(sub(j.head, j.chest))))
  out.neck = sdf.capsule(sub(j.chest, [0, 0, 2]), nk, 3.1, 2.8).paint((q) => T("skin", 0.04, q[2] > j.head[2] - 6.2 ? 0.36 : 0))
  // the trousers: loose, the seat round her hips, each leg a thigh and a shin, the cuff gathered over the shoe and
  // bound at the ankle; painted along and round each bone: the terminator down the back and the inner thigh, the
  // calf; the folds; the sash's shadow under it, the near leg's on the far one. The hem gathered over the ankle's
  // wrap, its edge level 7.2 px over the ankle (10.2 over the sole), no wider than the shoe and a px each side: the
  // shoe below it whole
  // (the point on the shin z px over the ankle: the shin's own line, the rig's ankle where the foot puts it; a shin
  // lying low, a knee on the floor, measured along it instead, as far as at FLAT of upright)
  // (a kick: the leg that strikes, raised and nearer us than the other, out of the sash's shadow and its underside lit a
  // step by the light the other leg throws up, so its edge reads over that leg's shadow, the same cloth: its line on it
  // is that shadow's tone)
  const kick = /^leg/.test(p.limb ?? "") ? +p.limb.slice(3) : -1
  const FLAT = 0.6, SAG = 2.5, shinAt = (L, z) => { const d = unit(sub(L.knee, L.ankle)); return add(L.ankle, mul(d, z / Math.max(d[2], FLAT))) }
  const legs = j.legs.map((L, i) => {
    const far = i !== near, inner = mul(j.r, i ? -1 : 1), cuffAt = shinAt(L, 8), lb = far ? 0.06 : 0
    // (a thigh raised near level: kept whole ahead of its hip, the cloth hanging under it, out of the sash's shadow)
    const level = L.knee[2] > L.hip[2] - 6, ahead = unit([L.knee[0] - L.hip[0], L.knee[1] - L.hip[1], 0]), under = (q) => !level || dot(sub(q, L.hip), ahead) < 4
    const raised = i === kick && !far && level, rim = (n) => (raised && n[2] < -0.5 ? -0.4 : 0)
    const sashSh = (q) => (q[2] > waist - 6.2 && under(q) && !raised ? 0.38 : 0), legSh = (q) => (far ? 0.32 * shadowed(q, legB[near], 9) : 0)
    // the folds as loose cloth makes them, not streaks along the bone: each a spindle on the cloth unwrapped (t along
    // the bone, a round it from the front toward the inner side, in px by the leg's radius), pointed at both ends and
    // widest in its middle, running from where the cloth is pulled: its groove a step darker (two behind the knee, the
    // deepest), a lit ridge along one side. The thigh: two drag folds from the crotch, high on the inner side, round to
    // the front over the knee; a bent knee: short folds bunched across its back, the cloth taut and lit over its front;
    // the shin: three pipe folds fanning up from the cuff, where the cloth is gathered.
    const bend = Math.acos(clamp(dot(unit(sub(L.knee, L.hip)), unit(sub(L.ankle, L.knee))), -1, 1)) / RAD
    const spindle = (t, a, len, R, [t0, a0, t1, a1, w, deep = 0.42, side = 1]) => { const x = t * len, y = a * R, x0 = t0 * len, y0 = a0 * R, dx = t1 * len - x0, dy = a1 * R - y0
      const L2 = dx * dx + dy * dy, s = ((x - x0) * dx + (y - y0) * dy) / L2; if (s <= 0 || s >= 1) return 0
      const d = (side * ((x - x0) * dy - (y - y0) * dx)) / Math.sqrt(L2), half = 2 * w * s * (1 - s)
      return Math.abs(d) < half ? deep : d >= half && d < half + 1 ? -0.3 : 0 }
    const folds = (t, a, len, R, list) => { for (const F of list) for (const a2 of [a, a + 2 * Math.PI, a - 2 * Math.PI]) { const v = spindle(t, a2, len, R, F); if (v) return v } return 0 }
    // (each fold's `a` from the side of the bone that faces the camera, the knee's from the inside of its bend: as Xrd
    // shapes a model for its one camera, so the folds fall where they are seen whichever way the leg is turned)
    const roundOf = (a, b, d) => { const u = unit(sub(b, a)), f0 = unit(sub(j.f, mul(u, dot(j.f, u)))), s0 = unit(sub(inner, add(mul(u, dot(inner, u)), mul(f0, dot(inner, f0))))); return Math.atan2(dot(d, s0), dot(d, f0)) }
    const CAM = [0, -1, TAN], bendIn = sub(mul(add(L.hip, L.ankle), 0.5), L.knee), bunched = bend > 20
    const v1 = roundOf(L.hip, L.knee, CAM), b1 = roundOf(L.hip, L.knee, bendIn), v2 = roundOf(L.knee, cuffAt, CAM), b2 = roundOf(L.knee, cuffAt, bendIn)
    const THIGH = [[0.05, 1.3, 0.75, -0.6, 2.8], [0.32, 1.4, 0.95, -0.1, 2.2]], SHIN = [[0.3, -1.1, 0.97, -0.4, 2.6], [0.25, 0.1, 0.97, 0.15, 2.4], [0.35, 1.2, 0.97, 0.6, 2.6]]
    const KNEE1 = [[0.84, -1, 0.9, 1, 1.8, 0.6, -1], [0.72, -0.8, 0.77, 0.8, 1.5, 0.42, -1]], KNEE2 = [[0.06, -1, 0.1, 1, 1.8, 0.6, -1]]
    const taut = (on) => (on && bunched ? -0.15 : 0), off = (a, r) => Math.abs(Math.atan2(Math.sin(a - r), Math.cos(a - r)))
    const thighPaint = (t, a, q, n, len) => T("tr", lb + rim(n) + (Math.abs(a) > 2.25 ? 0.22 : a > 1 && a < 2.25 ? 0.14 : 0)
      + ((bunched && folds(t, a - b1, len, 6.6, KNEE1)) || folds(t, a - v1, len, 6.6, THIGH) || taut(t > 0.82 && off(a, b1 + Math.PI) < 0.9)), sashSh(q) + legSh(q))
    const DOWN = [0, 0, -SAG]
    const thigh = level ? sdf.union(bone(L.hip, L.knee, 7.4, 5.9, j.f, inner, thighPaint), bone(add(L.hip, DOWN), add(L.knee, DOWN), 6.6, 5.6, j.f, inner, thighPaint), { smooth: 1.2 })
      : bone(L.hip, L.knee, 7.4, 5.9, j.f, inner, thighPaint)
    const shin = bone(L.knee, cuffAt, 5.9, 4.9, j.f, inner, (t, a, q, n, len) => T("tr", lb + rim(n) + (Math.abs(a) > 2.25 ? 0.2 : Math.abs(a) > 1.6 && t < 0.5 ? 0.12 : 0)
      + ((bunched && folds(t, a - b2, len, 5.4, KNEE2)) || folds(t, a - v2, len, 5.4, SHIN) || taut(t < 0.18 && off(a, b2 + Math.PI) < 0.9)), legSh(q)))
    // the hem: the trousers gathered into a ring over the wrap, a fold round it
    const hem = sdf.ellipsoid([4, 4.2, 1.7]).at(...shinAt(L, 8.4))
      .paint((q) => T("tr", lb + (band(Math.atan2(q[1] - L.ankle[1], q[0] - L.ankle[0]) * 4 + 9, 2.4, 0.6, 0.5) ? 0.3 : -0.08), legSh(q), 0.2))
    const seat = far ? [sdf.ellipsoid([9.2, 9.6, 8.2]).at(j.pelvis[0], j.pelvis[1], waist - 5.6).paint((q) => T("tr", 0.1, sashSh(q), nearOf(q, legB[near], 3) * 0.45))] : []
    // (the cuff's edge level over the ankle; square to a shin lying low. The top cut level at the waist, under the sash;
    // a thigh raised near level (a kneel, a tuck) kept whole ahead of its hip, or its top half went with the cut)
    const sd = unit(sub(L.knee, L.ankle)), cut = sd[2] >= FLAT ? sdf.plane([0, 0, -1], -(L.ankle[2] + 7.2)) : sdf.plane(mul(sd, -1), -dot(shinAt(L, 7.2), sd))
    const top = sdf.plane([0, 0, 1], waist - 1.4)
    const keep = level ? sdf.union(top, sdf.plane(mul(ahead, -1), -dot(L.hip, ahead) - 1)) : top
    return sdf.union(thigh, shin, hem, ...seat, { smooth: 1.6 }).intersect(keep, cut)
  })
  out.legFar = legs[1 - near]; out.legNear = legs[near]
  // the ankles' wraps between the hem and the shoe: bands round the ankle, 3.1 px out (the shoe's width), along the
  // shin from the instep's root (1.6 px over the ankle) up under the hem
  out.wraps = j.legs.map((L, i) => { const lb = i !== near ? 0.14 : 0
    return sdf.capsule(shinAt(L, 1.6), shinAt(L, 7.4), 3, 3.2).paint((q) => T("wrap", lb + (band(q[2] - L.ankle[2] + 12, 1.9, 0.9, 0.4) ? 0.5 : 0))) })
  // the shoes: slippers 21 px on the rig's sole, from its heel to its toe along the foot's heading; a heel block at the
  // back, the instep falling from the ankle's root (5.4 px) to a low round toe box (2.3 px over the sole); a sole of its
  // own value (the wraps' W), a line of 1.2 px (thicker, the rear foot turned to us showed its heel's sole as a block);
  // the shoe a step darker, its light a ridge along the instep's top, a hit on the toe cap. A lifted heel bends the shoe
  // at the ball as the rig's foot bends: the toe box flat on the floor, what is behind the ball turned up with the heel
  // (a point t of the way heel to toe and h up off the sole: behind the ball on the heel's slope, past it on the floor)
  // (a free foot, turned by the pose's point, lies all along its heel-toe line, its up square to it)
  out.shoes = j.legs.map((L, i) => {
    const pt = L.point !== undefined, f = pt ? unit(sub(L.toe, L.ball)) : [Math.sin(L.heading * RAD), Math.cos(L.heading * RAD), 0], rb = unit(sub(L.heel, L.ball))
    const up0 = pt ? unit(sub(sub(L.ankle, L.ball), mul(f, dot(sub(L.ankle, L.ball), f)))) : UP, uR = pt ? up0 : cross(rb, unit(cross(f, UP)))
    const lb = len(sub(L.heel, L.ball)), lf = len(sub(L.toe, L.ball)), tb = lb / (lb + lf)
    const at = (t, h) => t < tb ? add(add(L.heel, mul(rb, -t * (lb + lf))), mul(uR, h)) : add(add(L.ball, mul(f, t * (lb + lf) - lb)), pt ? mul(up0, h) : [0, 0, h])
    const turned = (e, t, h) => (pt ? e.rotate(Math.asin(clamp(f[2], -1, 1)) / RAD, "x").rotate(-Math.atan2(f[0], f[1]) / RAD, "z") : e.rotate(-L.heading, "z")).at(...at(t, h))
    return sdf.union(turned(sdf.ellipsoid([2.9, 3.2, 3.1]), 0.15, 3), sdf.capsule(at(0.33, 4), at(0.7, 2.5), 2.6, 2.2), turned(sdf.ellipsoid([2.7, 3.3, 2.1]), 0.85, 2.1), { smooth: 1.3 })
      .intersect(sdf.plane(mul(uR, -1), -dot(L.ball, uR)), pt ? sdf.plane(mul(up0, -1), -dot(L.ball, up0)) : sdf.plane([0, 0, -1], -L.ball[2])).paint((q, n) => {
        const t = clamp(dot(sub(q, L.ball), f) / (lb + lf) + tb), up = t < tb ? uR : up0, h = pt ? dot(sub(q, L.ball), uR) : Math.min(dot(sub(q, L.ball), uR), q[2] - L.ball[2]), fb = i !== near ? 0.08 : 0
        if (h < 1.2) return T("sole", fb)
        if (t > 0.8 && dot(n, up) > 0.55) return "shoeHit"
        return T("shoe", fb + 0.22, 0, 0, t > 0.3 && t < 0.85 && dot(n, up) > 0.78 ? -0.5 : 0) })
  })
  // the arms: the upper arm with its deltoid (a light on its top), the back of it in shadow, the elbow's fold; the
  // forearm bare to the wraps, their bands round it a little aslant; the fist
  j.arms.forEach((A, i) => {
    const far = i !== nearArm, fb = far ? 0.14 : 0, fd = sub(A.hand, A.elbow), inner = mul(j.sh.r, i ? -1 : 1), torsoB = [[j.pelvis, j.chest, 8, 10]]
    const upper = sdf.union(bone(A.sh, A.elbow, 4.7, 3.6, j.sh.f, inner, (t, a, q) => T("skin", fb + (Math.abs(a) > 2.1 ? 0.14 : 0), 0, (t > 0.82 && a > 0.3 ? 0.42 : 0) + 0.45 * nearOf(q, torsoB, 2.2))),
      sdf.ellipsoid([4.9, 5.4, 4.6]).at(...add(A.sh, add(mul(unit(sub(A.elbow, A.sh)), 2.4), [0, 0, 0.4]))).paint((q, n) => T("skin", fb, 0, 0, n[2] > 0.55 ? -0.18 : 0)), { smooth: 1.4 })
    const fore = bone(A.elbow, add(A.hand, mul(unit(fd), -3)), 3.8, 3.3, j.sh.f, inner, (t, a, q, n, len) => t < 0.56 ? T("skin", fb, 0, t < 0.16 && a > 0.3 ? 0.42 : 0)
      : T("wrap", fb + (band(t * len + a * 0.7, 3.2, 1.6, 0.42) ? 0.5 : 0)))
    // (a palm: turned a third toward us, so its face shows; the higher hand's fingers up, the lower's down)
    const hand = p.palm ? aimed(PALM(fb, A.hand[2] >= j.arms[1 - i].hand[2] ? 1 : -1), ((w) => [w[0] * 0.87 + w[1] * 0.5, w[1] * 0.87 - w[0] * 0.5, w[2]])(fistWay(fd, j.sh.f)), A.hand) : aimed(FIST(fb), fistWay(fd, j.sh.f), A.hand)
    out[`arm${i}`] = sdf.union(upper, fore, hand, { smooth: 0.8 })
  })
  // a smear (a pose's `smear: { limb, to }`, `to` the drawing after): fighter's, the striking limb stretched along its
  // arc to where the next drawing puts it, in the limb's shadow tone
  if (p.smear) { const { limb, to } = p.smear, leg = limb.startsWith("leg")
    out[`${limb}Smear`] = fighter.smear(j, RIG.joints(to, 180), limb, leg ? 4.4 : 3.2).paint((q) => T(leg ? "tr" : "skin", 0.18)) }
  return out
}

// ---------------------------------------------------------------- the cleanup, by rules, over each rendered frame
// - fighter.clean's "corners" and "lone" on her lines' darks (k S N Y W H);
// - "straps": no line round a strap (its parts strap0, strap1; lined both sides, a strap read as a dungarees'): a pixel
//   of a line beside one, not on the outline, takes the colour across from it (the line it puts on the skin and the top
//   round it, nearer); one of its own (where they are nearer) the colour of its unlined neighbour. The near strap is
//   drawn with the body and again with the near arm, over its shoulder: there its edges off the arm are cut, the body's
//   (unlined) showing under them.
const LINES = "kSNYWH"
const tidy = (c) => { fighter.clean(c, LINES); unstrap(c) }
const unstrap = (c) => { const P = c.img.parts, { w, h } = c.img, D = c.img.data
  if (!P) return
  const strap = (x, y) => /^strap/.test(P.names[P.ids[y * w + x]] ?? ""), dark = new Set([...LINES].map((k) => c.color(k))), set = []
  const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]], fill = (v) => (v & 255) >= 128 && !dark.has(v)
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const v = D[y * w + x]
    if (!dark.has(v) || N4.some(([dx, dy]) => (D[(y + dy) * w + x + dx] & 255) < 128)) continue
    const own = strap(x, y), to = N4.find(([dx, dy]) => own ? strap(x + dx, y + dy) && fill(D[(y + dy) * w + x + dx])
      : strap(x + dx, y + dy) && fill(D[(y - dy) * w + x - dx]) && !strap(x - dx, y - dy))
    if (to) set.push([x, y, own ? D[(y + to[1]) * w + x + to[0]] : D[(y - to[1]) * w + x - to[0]]]) }
  for (const [x, y, v] of set) D[y * w + x] = v }
const strapOnArm = (c) => { unstrap(c); const P = c.img.parts, { w, h } = c.img, D = c.img.data, cut = []
  if (!P) return
  const name = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? "" : P.names[P.ids[y * w + x]] ?? ""), strap = (x, y) => /^strap/.test(name(x, y))
  const off = (x, y) => x < 0 || y < 0 || x >= w || y >= h || (D[y * w + x] & 255) < 128
  // its edge off the arm, and the ring of line round it there (the arm's own pixels kept)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { if (off(x, y)) continue
    if (strap(x, y) ? off(x + 1, y) || off(x - 1, y) || off(x, y + 1) || off(x, y - 1)
      : !/^arm/.test(name(x, y)) && [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]].some(([dx, dy]) => strap(x + dx, y + dy))) cut.push(y * w + x) }
  for (const i of cut) D[i] = 0 }

// ---------------------------------------------------------------- her body in 3D, in two
// Each sole on the floor (seen 10 degrees down, a foot nearer us lands lower, as in the 3D games). Her guard holds the
// near fist before her face, and the head is drawn by hand, so the body is drawn in two: all of it but the near arm
// (cleaned), then the near arm alone (and her flat blocks, _rf_bk_<move>_s, to judge a move by); the head between
const LOOK = { body: BODY, headings: ["s"], pitch: PITCH, w: W, h: H,
  mats: { shoeHit: { ramp: toon("shoe", -0.3), shine: 0.9 } }, surface: fighter.SURFACE }
const strapOf = (j) => nearArm(j).replace("arm", "strap")
// (the moves that lie down on a rig of their own, _rf_fall and _rf_fall_arm, at their pivot)
const rigs = (body, arm, pivot, list, w = W, h = H) => { const L = { ...LOOK, w, h, pivot, moves: Object.fromEntries(list.map((m) => [m, { frames: MOVES[m].ms.length, ms: MOVES[m].ms, pose: MOVES[m].pose }])) }
  const R = rig3d(body, { ...L, parts: (j, p) => { const P = parts(j, p); delete P[nearArm(j)]; delete P[`${nearArm(j)}Smear`]; return P }, draw: tidy })
  // (a smear of the near arm drawn with it)
  rig3d(arm, { ...L, blocks: "_rf_bk", parts: (j, p) => { const P = parts(j, p), A = nearArm(j); return { [A]: P[A], [strapOf(j)]: P[strapOf(j)], ...(P[`${A}Smear`] ? { [`${A}Smear`]: P[`${A}Smear`] } : {}) } }, draw: strapOnArm })
  return R }
const RIG = rigs("_rf_body", "_rf_arm", PIV, Object.keys(MOVES).filter((m) => !FALLS.includes(m) && !THROWS.includes(m) && !FACE.includes(m) && !TALLS.includes(m))), FALL = rigs("_rf_fall", "_rf_fall_arm", PIV2, FALLS)
const FACED = rigs("_rf_face", "_rf_face_arm", PIV4, FACE), TALL = rigs("_rf_tall", "_rf_tall_arm", PIV5, TALLS, W, 150)
// (the thrown rig's pivot, its floor under her, put so her pelvis lands on the square's middle: where the rig puts the
// pelvis over its floor, the same for every thrown pose (their `down` the stance's))
const PEL = RIG.screen(RIG.joints(posed(THROWN.thrown_grabbed[0]), 180).pelvis).map((v, e) => v - PIV[e]), PIV3 = PEL.map((v) => Math.round(TW / 2 - v))
const THROWN_AT = [Math.round(PIV3[0] + PEL[0]), Math.round(PIV3[1] + PEL[1])], TH = rigs("_rf_thrown", "_rf_thrown_arm", PIV3, THROWS, TW, TW)

// ---------------------------------------------------------------- her head, drawn by hand at 3/4
// Turned 40 degrees from profile, as her stance holds it, drawn as the fighting sprites draw a face this small: mostly
// light skin, the profile in its own dark (s); the eye a lash over a px of white at its outer corner and a violet iris
// toward the nose, a glint in it; no far eye (behind the nose's bridge at this turn); the nose a px; the mouth a px of
// s and one of R; the fringe over the brows, a row of skin under it; the band in an arc, lowest where it is nearest
// us, its shadow on the hair under it; the bob's side behind the cheekbone; a chin as far forward as the lips, its
// underside a line apart from the neck, the jaw rising. The shout (the strike's reach): the brow down, the eye
// narrowed, the mouth open; the hurt: the eye shut, the mouth open wide, tipped back. The bob as the fighting sprites
// draw hair this small: one mass in its mid tone, its dark only along the back, under the band and under the cut (strand
// lines all over it read as noise, a dark lower half as a helmet); a ring of light below the band, its edges toothed as
// strands; one parting, at the ends. The band's two tails drawn apart (_rf_band_*), hung from its knot behind the head
// and swung by the pose. Three heads at a new angle for the moves, each both ways: down (12 degrees: the
// guard's ducked head, the prejump and the landing), tuck (25: the jump's tuck), up (-12: the takeoff); _rf_head_<a>
// drawn by hand on the turn's geometry (the features sliding over the skull, the eye looking where the head goes, the
// bob's ends hanging), _rf_head_<a>_t turned by pxl's angle and mended; TILTED picks which the moves stamp. The
// get-up's chin head, by hand only (a turn keeps the guard's eye looking ahead): see TIP.

// ---------------------------------------------------------------- what each frame says to an engine
// hurt boxes round the head, the body (chest, pelvis, elbows) and the legs, and the punching arm while it is out (a
// counter-hit); the hit box round the fist on the active frames; the phase, and on a hit its damage and hitstun (60 fps
// frames: the hurt's two drawings, 230 ms), the hurt's frames the hitstun they play out. From the joints the body is
// drawn on, so they can't drift off the art. Lying (the knockdown's floor, down) none: the conversions keep one low box
// only for the attacks that hit a fighter on the floor; the get-up's frames say invuln.
const HITSTUN = 14, STRIKING = ["startup", "active", "recovery"]
// (the striking limb, `limb` arm0, arm1 (the cross's, by default), leg0 or leg1: out, its own hurt box, an arm from
// its elbow to its fist, a leg from its knee to its foot, and the legs' box then the other's; the hit box round the
// fist or the foot, the shoe whole)
const boxes = (c, p, R = RIG) => { const j = R.joints(p, 180), S = (q) => R.screen(q), boxOf = (pts, m) => fighter.boxOf(pts, m, R.w, R.h), limb = p.limb ?? "arm1", k = +limb.slice(3), leg = limb.startsWith("leg")
  // (thrown: no box of hers, as the conversions' bound one has none: the thrower's frame holds her; her angle)
  if (p.phase === "thrown") return c.setData({ phase: "thrown", roll: p.roll, air: true })
  const out = p.out ?? (STRIKING.includes(p.phase) && p.twist < 0), L = j.legs[k], A = j.arms[k]
  if (!p.lying) c.setBox("hurt", ...boxOf([headAt(R, p)], 9))
  if (!p.lying) c.setBox("hurt", ...boxOf([S(j.chest), S(j.pelvis), ...j.arms.map((A) => S(A.elbow))], 5))
  if (!p.lying) c.setBox("hurt", ...boxOf([S(j.pelvis), ...j.legs.filter((_, i) => !(out && leg && i === k)).flatMap((L) => [S(L.knee), S(L.foot)])], 4))
  if (out) c.setBox("hurt", ...(leg ? boxOf([S(L.knee), S(L.ankle), S(L.toe), S(L.heel)], 4) : boxOf([S(A.elbow), S(A.hand)], 3)))
  if (p.phase === "active" && !p.spawn) c.setBox("hit", ...(p.at === "knee" ? boxOf([S(L.knee)], 5) : leg ? boxOf([S(L.ankle), S(L.toe), S(L.heel)], 4) : boxOf([S(A.hand)], 5)))
  const [damage, hitstun, hitstop, pushback] = p.hit ?? [8, HITSTUN]
  // (the wave's throw: no hit box of hers, its spawn instead; a hit that knocks down says so)
  c.setData(p.spawn ? { phase: p.phase, spawn: p.spawn } : p.phase === "active" ? { phase: "active", damage, hitstun, ...(hitstop !== undefined ? { hitstop, pushback } : {}), ...(p.knockdown ? { knockdown: true } : {}), ...(p.air ? { air: true } : {}), ...(p.step ? { step: p.step } : {}), ...(p.invuln ? { invuln: true } : {}) } : p.phase === "hurt" ? { phase: "hurt", hitstun: HITSTUN }
    : { phase: p.phase, ...(p.air ? { air: true } : {}), ...(p.step ? { step: p.step } : {}), ...(p.invuln ? { invuln: true } : {}), ...(p.flip ? { flip: true } : {}), ...(p.fx ? { fx: fighter.fxOf(p.fx, j, S, R.pivot) } : {}) }) }

// ---------------------------------------------------------------- the moves, facing e: the body, the head, the near arm
const ON = { w: W, h: H, pivot: PIV, genre: "fighting", category: "character" }
// the band's tails behind the head, by the pose's sway: streaming back on the cross's drive, flung on the hurt, lifted
// as the body sinks and hanging as it rises (the idle), else at rest
const tailsOf = (p) => { const [f, u] = p.sway ?? [0, 0]; return p.tails ?? (f < -1 ? "back" : f > 2 ? "fling" : u > 0.3 ? "up" : u < -0.3 ? "down" : "rest") }
// the heads at a new angle (down, tuck, up) are drawn both ways: by hand ("") or turned by pxl and mended
// ("_t"); this line picks which the moves stamp. Each head's knot: where its band's tails hang from
const TILTED = "", KNOT = { hurt: [-13, -5], down: [-9, -7], tuck: [-5, -8], up: [-15, -3] }
// The reactions' heads (low: 40 degrees down, doubled over; back: 45 back, thrown; flat: 90 back, lying), both ways
// too: FELL picks them
const FELL = ""
Object.assign(KNOT, { low: [-6, -12], back: [-12, 5], flat: [-5, 12], chin: [-9, -7] })
// (the spin's: her back to us, the tails drawn on the head; the mirrored head's knot the guard's, mirrored)
Object.assign(KNOT, { rear: null, mirror: [12, -5] })
// The thrown ones' (dn90: face down, turned 90 degrees forward; inv: upside down), both ways too, drawn without a neck
// of their own and their band's tails on them: HELD picks them
const HELD = ""
Object.assign(KNOT, { dn90: null, inv: null })
// The turns' head facing us (the frame the engine mirrors her on), both ways too: FRONT picks it; its band's tails on it
const FRONT = ""
Object.assign(KNOT, { front: null })
const headOf = (face) => (!face ? "_rf_head" : ["down", "tuck", "up"].includes(face) ? `_rf_head_${face}${TILTED}` : ["low", "back", "flat"].includes(face) ? `_rf_head_${face}${FELL}`
  : ["dn90", "inv"].includes(face) ? `_rf_head_${face}${HELD}` : face === "front" ? `_rf_head_front${FRONT}` : `_rf_head_${face}`)
// (the head's middle on screen, as the rig puts it: on get_up, nodded)
const headAt = (R, p) => R.screen(R.joints(p, 180).head)
sprite("_rf_head", { pivot: [15, 10] }, `
  ..........kkkkkk..........
  ........kkhJJJJhkk........
  ......khhJJJhhhhhhk.......
  ..yuuuuhJJhhhhhHhhhk......
  .Yyyyyyuuuuhhhhhhhhhhk....
  .....kHyyyyuuuuuuuuuuuk...
  .....khHHHHyyyyyyyyyyyY...
  ....khhhhhhhhhhhhhhhhhk...
  ...kHhJhhJJhhJhZZhZZhZs...
  ...kHhJJJJJJJhzZZZZZZZs...
  ...kHhJJhhJhJhzkkkksZZs...
  ...kHhhhhhhhhhzkwHHZZZs...
  ...kHhhhhhhhhHzZzhJZZZZs..
  ...kHhhhhhhhhHzZZZZZZzs...
  ....kHhhhHhhhhHzZZZZZZs...
  .....kHhhHHhhhhHzZZZsRs...
  ......kHHkHHhhHszZZZZZs...
  .......kk.kkHSssSzZZZZs...
  .............SsssSSSSs....
  ............SsssszsS......
  .........SssssszzsS.......
  .........SssssszzsS.......`)
sprite("_rf_head_shout", { pivot: [15, 10] }, `
  ..........kkkkkk..........
  ........kkhJJJJhkk........
  ......khhJJJhhhhhhk.......
  ..yuuuuhJJhhhhhHhhhk......
  .Yyyyyyuuuuhhhhhhhhhhk....
  .....kHyyyyuuuuuuuuuuuk...
  .....khHHHHyyyyyyyyyyyY...
  ....khhhhhhhhhhhhhhhhhk...
  ...kHhJhhJJhhJhZZhZZhZs...
  ...kHhJJJJJJJhzZzsSZZZs...
  ...kHhJJhhJhJhzkkkksZZs...
  ...kHhhhhhhhhhzsZHHZZZs...
  ...kHhhhhhhhhHzZzzzZZZZs..
  ...kHhhhhhhhhHzZZZZZZzs...
  ....kHhhhHhhhhHzZZZZZZs...
  .....kHhhHHhhhhHzZZskks...
  ......kHHkHHhhHszZZzRZs...
  .......kk.kkHSssSzZZZZs...
  .............SsssSSSSs....
  ............SsssszsS......
  .........SssssszzsS.......
  .........SssssszzsS.......`)
sprite("_rf_head_hurt", { pivot: [17, 10] }, `
  ..........kkkkkk..............
  ........kkhJJJJhkk............
  ......khhJJJhhhhhhk...........
  ...yuuuuhJJhhhhhHhhhk.........
  ..Yyyyyyuuuuhhhhhhhhhhk.......
  ......kHyyyyuuuuuuuuuuuk......
  ......khHHHHyyyyyyyyyyyY......
  .....khhhhhhhhhhhhhhhhhk......
  .....kHhJhhJJhhJhZZhZZhZs.....
  .....kHhJJJJJJJhzZZZsZZZs.....
  .....kHhJJhhJhJhzZZZZZZZs.....
  .....kHhhhhhhhhhzsSSsZZZs.....
  .....kHhhhhhhhhHzZZZZZZZZs....
  ......kHhhhhhhhhHzZZZZZZzs....
  .......kHhhhHhhhhHzZZZZsss....
  ........kHhhHHhhhhHzZZskkks...
  .........kHHkHHhhHszZZzkkZs...
  ..........kk.kkHSssSzZZZZs....
  .................SsssSSSSs....
  ................SsssszsS......
  .............SssssszzsS.......
  .............SssssszzsS.......`)
sprite("_rf_head_down", { pivot: [11, 9] }, `
  ........kkkkkk.......
  YyuuukhhJJJJJJkk.....
  .yyyyuhJJJhhhhhhk....
  ....kyuuuhhhhhhhhk...
  ...khHyyyuhhhhhhhhk..
  ..khhhHHHyuuuuuhhhhk.
  .kHhJhhhhhyyyyyuuuuuk
  .kHhJhJJhhhhhhyyyyyuk
  kHhhJJJJJJJJhZhhhhhyY
  kHhhhhhJJJJhzZZhZhhhk
  kHhhhhhhhhhzZhZhZZZs.
  kHhhhhhhhhhkkkkksZZs.
  .khhhhhhhhHzkHHZZZZs.
  ..khhhHhhhHzZZZZZZZs.
  ..kHHHHhhhhzZZZZZZZss
  ..kHHkHHhhhHzZZZZZZs.
  ..kk.kkHHhHszZZZsRs..
  .........SsszZZZZZs..
  ........SsssSSzZZZs..
  ....SssssssszSSSSs...
  .....ssssszzzsS......
  ........sszzsS.......`)
sprite("_rf_head_down_t", { pivot: [11, 9] }, `
  ........kkkkkk.......
  YyuuukhhJJJJJJkk.....
  .yyyyuhJJJhhhhhhk....
  ....kyuuuhhhhhhhhk...
  ...khHyyyuhhhhhhhhk..
  ..khhhHHHyuuuuuhhhhk.
  .kHhJhhhhhyyyyyuuuuuk
  .kHhJhJJhhhhhhyyyyyuk
  kHhhJJJJJJJJhZhhhhhyY
  kHhhhhhJJJJhzZZhZhhhk
  kHhhhhhhhhhzZZZZZZZs.
  kHhhhhhhhhhzkkkksZZs.
  .khhhhhhhhHzkwHHZZZs.
  ..khhhHhhhHzZZhJZZZs.
  ..kHHHHhhhhzZZZZZZZss
  ...kkkHHhhhHzZZZZZZs.
  ......kHHhHszZZZsRs..
  .........SsszZZZZZs..
  ........SsssSSZZZZs..
  ....SssssssszSSSSs...
  .....ssssszzzsS......
  ........sszzsS.......`)
sprite("_rf_head_tuck", { pivot: [8, 10] }, `
  ...yu................
  ..yyyuukhkkkkk.......
  ....yyuuhJJJJJkk.....
  .....kyuuJJhJhJJk....
  ....khHyyuhhhhhhhk...
  ..kkhhhHyyuhhhhhhhk..
  .kHhJhhhHHyuuhhhhhk..
  .kHhJJhhhyyyyuuhhhk..
  kHhhJJJJJhhhhyyuuhhhk
  kHhhhhhJJJJJhhyyyuuhk
  kHhhhhhJhJJhhZhhhyyuk
  kHhhhhhhhhhzhZhhZhhyY
  .khhhhhhhhzzkkZZZhhk.
  .kHhHHhhhHzzkHksZZZs.
  .kHHHHhhhHzZzhZZZZs..
  .kHHkHhhhHzZZZZZZZs..
  .kk.kkHhhhzZZZZZZZs..
  ......HSsszZZZZZzzs..
  ......SssszZZZsZZs...
  ..SsssssssSZZZZzs....
  ...sssssssSSZZZZs....
  .....sszzzssSSss.....
  .......zzsSS.........
  .........sS..........`)
sprite("_rf_head_tuck_t", { pivot: [8, 10] }, `
  ...yu................
  ..yyyuukhkkkkk.......
  ....yyuuhJJJJJkk.....
  .....kyuuJJhJhJJk....
  ....khHyyuhhhhhhhk...
  ..kkhhhHyyuhhhhhhhk..
  .kHhJhhhHHyuuhhhhhk..
  .kHhJJhhhyyyyuuhhhk..
  kHhhJJJJJhhhhyyuuhhhk
  kHhhhhhJJJJJhhyyyuuhk
  kHhhhhhJhJJhhZhhhyyuk
  kHhhhhhhhhhzZZZhZhhyY
  .khhhhhhhhzzkkZZZhhk.
  .kHhHHhhhHzkwHksZZZs.
  .kHHHHhhhHzZzhJZZZs..
  ..kkkHhhhHzZZZZZZZs..
  .....kHhhhzZZZZZZZs..
  ......HSsszZZZZZzzs..
  ......SssszZZZsZZs...
  ..SsssssssSZZZZRs....
  ...sssssssSSZZZZs....
  .....sszzzssSSss.....
  .......zzsSS.........
  .........sS..........`)
sprite("_rf_head_up", { pivot: [17, 10] }, `
  ...........kkk..........
  .........kkJJhhkk.......
  .......kkJJhhhhhhk......
  ......kJJJhhhhhhhhhhk...
  .....khJJhhhhhhhuuuuuY..
  ..uuuuuuuuuhuuuuyyyyyk..
  .yyyyyyyyyyuyyyyyyhhhs..
  Yy..kHHHHHyyyhhhhhZZZZs.
  ....khhhhhhhhJhZZZZZZZs.
  ....khhhhJJJJhzZZkksZZs.
  ...kHhJJJJJJJhzkkHJZZZZs
  ...kHhJJJhJhhhzkwwZZZZss
  ...kHhhhhhhhhhzzZZZZZZZs
  ...kHhhhhhhhhhHzZZZZZsRs
  ....kHhhhhhhhhhHzZZZZZZs
  ....kHhhhhHhhhhhHzZZZZZs
  .....kkHhhHHHhhhszzZZZZs
  .......kHHkkHHHSsszZZZs.
  ........kk.....ssSSSSS..
  ..............SsssszS...
  .............sssszzsS...
  ............sssssz......
  ............S...........`)
sprite("_rf_head_up_t", { pivot: [17, 10] }, `
  ...........kkk..........
  .........kkJJhhkk.......
  .......kkJJhhhhhhk......
  ......kJJJhhhhhhhhhhk...
  .....khJJhhhhhhhuuuuuY..
  ..uuuuuuuuuhuuuuyyyyyk..
  .yyyyyyyyyyuyyyyyyhhhs..
  Yy..kHHHHHyyyhhhhhZhZZs.
  ....khhhhhhhhJhZZZZZZZs.
  ....khhhhJJJJhzZZkksZZs.
  ...kHhJJJJJJJhzkkHHZZZZs
  ...kHhJJJhJhhhzkwhJZZZss
  ...kHhhhhhhhhhzzZZZZZZZs
  ...kHhhhhhhhhhHzZZZZZsRs
  ....kHhhhhhhhhhHzZZZZZZs
  ....kHhhhhHhhhhhHzZZZZZs
  .....kkHhhHHHhhhszzZZZss
  .......kHHkkHHHSssSSSSS.
  ........kk.....sssszsS..
  ..............SsssszS...
  .............sssszzsS...
  ............sssssz......
  ............S...........`)
// (lying: the tails on the floor behind her head)
sprite("_rf_band_flat", { pivot: [6, 1] }, `
  ...yyyY
  uyy....`)
sprite("_rf_head_low", { pivot: [12, 13] }, `
  .....................
  .....................
  .......kkuhhkkk......
  ......kkHuhJJhJk.....
  ...kkkkhHyuJJJJJk....
  ..kkHhhhHyyuhhhJJk...
  .kkHhJJhhHyuhhhhhhk..
  .kHhhJJhhhHyuhhhhhk..
  kHhhhJJJJhhyyuhhHhhk.
  kHhhhhhJJJhhyyuhhhhk.
  kHhhhhhhJJJJhhyuuhhk.
  .HhhhhhhhJJhhhhyuuh..
  .HhhHhhhhhhzZZhhyuuh.
  .kHHHhhhhhzZZZhhhyyuk
  .kkkHhhhHzZsZZsZhhyY.
  ...kHhhhHzZZSZZZZhhk.
  ....kHHhHZZZZsZZZZs..
  ....kHhHzZZZZZZZZs...
  .....kHkzZZZZZZZs....
  .....kk.zSZZZZzZs....
  ........sSZskssss....
  .........zSkkks......
  .........sSZZks......
  ..........Ssss.......`)
sprite("_rf_head_low_t", { pivot: [12, 13] }, `
  .....yyu.............
  ......yuu............
  .......yyuhhkkk......
  ......kkyuhJJhJk.....
  ...kkkhhHyuJJJJJk....
  ..kkHhhhHyyuhhhJJk...
  .kkHhJJhhHyuhhhhhhk..
  .kHhhJJhhhHyuhhhhhk..
  kHhhhJJJJhhyyuhhHhhk.
  kHhhhhhJJJhhyyuhhhhk.
  kHhhhhhhJJJJhhyuuhhk.
  .HhhhhhhhJJhhhhyuuh..
  .HhhHhhhhhhzZZhhyuuh.
  .kHHHhhhhhzZZZhhhyyuk
  .kkkHhhhHzZsZZsZhhyY.
  ...kHhhhHzZZSZZZZhhk.
  ....HHhhHZZZZsZZZZs..
  Ss...ShHHzZZZZZZZs...
  sssSSSsszZZZZZZZs....
  .ssssssszZZZZZzZs....
  ..ssssssSZZskssss....
  ...szzzzSSZkkks......
  .....zzssSSZZks......
  ......sS..Ssss.......`)
sprite("_rf_head_back", { pivot: [14, 9] }, `
  ..............kkY........
  .......kkkhhhhuyyk.......
  ......kJhhhhhuyyhZs......
  .....kJJhHhhuyyhhZZs.....
  ....kJJhhhhuyyhZZZZZss...
  ....kJhhhhuyyhJZZZZZZs...
  ...kkJhhhuyyhZZZZZZZZsss.
  ...kJJhuuyyhhZZZSsZZZskks
  ...hJJuuyyhJhzZSSZZZZskZs
  ..kuuuyHHJhJhzzsZZZZZskZs
  ..uuyyHHJhJJJhzzZZZZZZZSs
  .uuyHHHJhJJhhhHzzzzzZZSS.
  ...kkhhhJJJhhhhHHhHzzSSS.
  ....khJJJhhhhhhhhhsssSzs.
  ....kHhJJhhhhhhhhhssssssS
  ....kHHhhhhhhHhHHHSssszz.
  .....kHHhhhhhHHHk.Ssssz..
  ......kHHhhhhHk....sss...
  .......kHHHHHHk...sss....
  ........kkkkkk...Sss.....
  .................SS......`)
sprite("_rf_head_back_t", { pivot: [14, 9] }, `
  ...........k..kkY........
  .......kkkhhhhuyyk.......
  ......kJhhhhhuyyhZs......
  .....kJJhHhhuyyhhZZs.....
  ....kJJhhhhuyyhZZZZZss...
  ....kJhhhhuyyhhZZZZZZs...
  ...kkJhhhuyyhZZZZZZZZsss.
  ...kJJhuuyyhhZZZSsZZZskks
  ...hJJuuyyhJhzZSSZZZZskZs
  ..kuuuyHHhhJhzzsZZZZZskZs
  ..uuyyHHhhJJJhzzZZZZZZZSs
  .uuyHHHhhJJhhhHzzzzzZZSS.
  yyy.khhhJJJhhhhHHhHzzSSS.
  yy..khJJJhhhhhhhhhsssSzs.
  Y...kHhJJhhhhhhhhhssssssS
  ....kHHhhhhhhHhHHHSssszz.
  .....kHHhhhhhHHHk.Ssssz..
  ......kHHhhhhHk....sss...
  .......kHHHHHHk...sss....
  ........kkkkkk...Sss.....
  .................SS......`)
sprite("_rf_head_flat", { pivot: [10, 9] }, `
  ............s..ss.....
  .....kYkssssZsskZs....
  ....kuyhZZZZZzskkZs...
  ....huyhhZZZZZskkZS...
  ...kJuyhZZZZZZZszZSS..
  ..kJJuyhZZZSZZZZZZSsSS
  .kJJhuyhhZZSZZZZZzSzss
  .khJhuyhZZZSZZZzzSsszz
  khhHhuyhZZZsZZzHsssszz
  khhhhuyhhzzzzzHhHsssss
  khhhhuyhJhhhHHhhhSSsss
  khhhhuyhhJJhhhhhhH.Sss
  khhhhuyhhJhhhhhhHk..ss
  khhhuyHhJJJhhhhHHk..ss
  .kJJuyHhJJhhhhHHk...SS
  .khJuyHhhJhhhhhhHk....
  ..hhuyHhhJJhhhhhHk....
  ..kHyHhhJJJhhhhHk.....
  ...kkkkhhhhhhhHk......
  .......kHHHHHHk.......
  ........kkkkkk........
  ......................
  ......................`)
sprite("_rf_head_flat_t", { pivot: [10, 9] }, `
  ............s..ss.....
  .....kYkssssZsskZs....
  ....kuyhZZZZZzskkZs...
  ....huyhhZZZZZskkZS...
  ...khuyhZZZZZZZszZSS..
  ..khhuyhZsZsZZZZZZSsSS
  .khhhuyhhZZSZZZZZzSzss
  .khhhuyhZZZSZZZzzSsszz
  khhHhuyhZZZsZZzHsssszz
  kJhhhuyhhzzzzzHhHsssss
  kJhhhuyhJhhhHHhhhSSsss
  kJhhhuyhhJJhhhhhhH.Sss
  kJJhhuyhhJhhhhhhHk..ss
  khJhuyHhJJJhhhhHHk..ss
  .kJJuyHhJJhhhhHHk...SS
  .khJuyHhhJhhhhhhHk....
  ..hhuyHhhJJhhhhhHk....
  ..kuyHhhJJJhhhhHk.....
  ...uykkhhhhhhhHk......
  ...uy..kHHHHHHk.......
  ...uy...kkkkkk........
  ...yy.................
  ....Y.................`)
// get_up's head (face "chin", the 6b2 study's 11.8), drawn by hand on the down head's skull (12 degrees): the chin
// tucked to her chest, its underside one mid line where it meets the chest (no jaw's dark across the face, no neck of
// its own: the body's, bent with it, meets the jaw in every frame); the eye open, the iris up under the lash and the
// white under it (the up head's look), at her opponent from under the fringe's strands on the brow
sprite("_rf_head_chin", { pivot: [11, 9] }, `
  ........kkkkkk.......
  YyuuukhhJJJJJJkk.....
  .yyyyuhJJJhhhhhhk....
  ....kyuuuhhhhhhhhk...
  ...khHyyyuhhhhhhhhk..
  ..khhhHHHyuuuuuhhhhk.
  .kHhJhhhhhyyyyyuuuuuk
  .kHhJhJJhhhhhhyyyyyuk
  kHhhJJJJJJJJhZhhhhhyY
  kHhhhhhJJJJhzZZhZhhhk
  kHhhhhhhhhhzZhZhZZZs.
  kHhhhhhhhhhzkkkksZZs.
  .khhhhhhhhHzkwHJZZZs.
  ..khhhHhhhHzZzwwZZZs.
  ..kHHHHhhhhzZZZZZZZss
  ..kHHkHHhhhHzZZZZZZs.
  ..kk.kkHHhHszZZZsRs..
  .........SsszZZZZZs..
  ..........SszZZZZs...
  ...........ssssss....`)
// rise_kick's heads as the spin turns her: her back to us (drawn by hand: the bob from behind, the band round it lowest
// at its knot, its tails hanging from it over the hair, the nape under the cut, her cheek's edge where she faces), and
// her guard's head from the other side (the drawing mirrored: the game mirrors the whole of her for the west the same)
sprite("_rf_head_rear", { pivot: [11, 10] }, `
  .......kkkkkkk........
  .....kkhhJJJJhkk......
  ....khJJJJJJJJhhk.....
  ...khJJJJhhhhJhhhk....
  ..khJJJhhhhhhhhhhhk...
  ..kuuhhhhhhhhhhhhhk...
  .kHyyuuhhhhhhhhhuuYk..
  .kHhHyyuuuhhhhuuyyYk..
  .kHhhHHHyyuuuuyyHHhk..
  .kHhJhhhhHHuuYHhhhHk..
  .kHhJJhhhhhyYyYhhhHk..
  .kHhhJhhhhhyYhyYhhHk..
  .zHhhhhhhhhyhhhyYhHk..
  .zkHhhhJhhhyhhhhyHk...
  .ZzkHhhhhhhhYhhhhYk...
  ..zSkHHhHHhhhhHHkk....
  ...SskHHkkHkHkkk......
  ....SskkSsssss........
  ......SsssssssS.......
  ......SsssssssS.......`)
sprite("_rf_head_mirror", { base: "_rf_head", flip: "x" })
// the turns' head facing us (the frame the engine mirrors her on), both ways, FRONT picking: by hand ("") from her 3/4
// drawing, its rows kept (the crown, the band, the fringe, the eye, the mouth and the chin at the same heights), the face
// between the bob's two sides, an eye each side of the nose's px, the band across the brow and its tails hanging behind
// her neck; symmetric about its middle column, so it reads the same mirrored
sprite("_rf_head_front", { mx: "c", pivot: [9, 10] }, `
  ......kkkk
  ....kkhJJJ
  ...khhJJJh
  ..khhhhhhh
  ..kuuuuuuu
  .kYyyyyyyy
  .khHHHHHHH
  .kHhhhhhhh
  .kHhJhZZhZ
  .kHhJzZZZZ
  .kHhhzkkkZ
  .kHhhzwHHZ
  .kHhhzZhJZ
  .kHhhzZZZz
  ..kHhzZZZZ
  ..kHhszZsR
  ..kHHszZZZ
  ...kkHszZZ
  ...yYkSSss
  ...Y..Sszz
  ...Y..Sszz`)
// by pxl ("_t"): angle turns a drawing in its plane and can't bring her 3/4 round to the front, so her head modeled (the
// skull and the jaw, the bob round it open over the face below the fringe, the band round it, its tails behind), drawn
// at the s view by views() at her camera and light, and mended by hand: the eyes, the nose's px, the mouth, the fringe's
// strands, the face lit (the render left it in the bob's shadow), the tails' tips by her neck
sprite("_rf_head_front_t", { mx: "c", pivot: [7, 9] }, `
  ....kkkk
  ...kJJJJ
  .kkhJJJJ
  kuhJJJJJ
  kuuuuuuu
  kHyyyyyy
  khhhhhJJ
  khhhhhhh
  khhhZZhZ
  khhskkkZ
  kHhzwHHZ
  .kHzzhJZ
  .kHHzZZz
  ..kHzZZZ
  ..YkszsR
  ..YkSzzz
  ..Y.kSSs
  .....Ssz`)
// a rolled body (falling, lying, getting up) turns her neck with it, but a head's own neck under the jaw turns with
// the head: those heads go without it (its box erased), the body's neck joining the jaw
const NECK = { _rf_head: [0, 19, 26, 4], _rf_head_down: [0, 19, 21, 3], _rf_head_back: [17, 16, 8, 5], _rf_head_flat: [18, 10, 4, 5] }
for (const [h, box] of Object.entries(NECK)) for (const t of h === "_rf_head" ? [""] : ["", "_t"]) sprite(`${h}${t}_nn`, { base: h + t }, rect(...box, "_"))
sprite("_rf_head_hurt_nn", { base: "_rf_head_hurt" }, rect(0, 19, 30, 3, "_"))
sprite("_rf_head_dn90_t", { base: "_rf_head_hurt_nn", rot: 90 })
sprite("_rf_head_inv_t", { base: "_rf_head_hurt_nn", rot: 180 })
// by hand on the turn's geometry, the same face: the bob falling from her scalp as her head hangs (upside down its
// ends past the crown and the ear and the nape bared, the fringe fallen off the brow; face down the back and the
// crown's hair hanging past her face, the nape's down over the jaw), lit from above again, the band's tails hanging
sprite("_rf_head_inv", { pivot: [13, 9] }, `
  ....sSSSSsssS.................
  ....sZZZZzSssS................
  ...sZkkzZZzszZs...............
  ...skkksZZzszSzs..............
  ....sssZZZZzszZsk.............
  ....szZZZZZZzskhhk............
  ....sZZZZZZZZzhJJhHk..........
  .....sZZZsSSszhJJJhHk.........
  .....sZZZZZZZzhJhJJhHk........
  .....sZZZsZZZzhJJhJJhHk.......
  .....sZZZZZZZzJJhJJhhJHk......
  ......khhhhhhhhhJhJJhhHk......
  ......YyyyyyyyyyyyhhhhhHk.....
  ......kuuuuuuuuuuuyyyyHHk.....
  ......khhhhhhhhhhhuuuuyHk.....
  ......kHhJhhhhJhhhhhhuyYk.....
  ......kHhJhhhhJhhhJhhhyHk.....
  ......kHhhJhhhJhhhJhhhuHk.....
  ......kHhhJhhhhJhhhJhhyHk.....
  .......kHhhJhhhJhhhhhhYk......
  .......kHhhHhhhHhhhHhHyk......
  ........kHhkHHhkHhHkHkY.......
  .........k..kk..kk.k..y.......
  ......................Y.......`)
sprite("_rf_head_dn90", { pivot: [11, 17] }, `
  .....................
  .....................
  .....................
  .....................
  .....................
  ........kkkkkk.......
  .......kJJJJJhkk.....
  ......kHJJJJhhhkyY...
  .....kHhJJhhhhHyuyk..
  ....kHhhhJJJhHyuhhuk.
  ...kHhhhhJJhhHyuJJyk.
  ..kHhhhhhhJhhHyuJJhYk
  ..kHhhhhhhJJhHyuhJJyk
  ..kHHhhhhJJJhyuhhhJuk
  ..kHHhhhhhJhhyuhhhJyk
  ..kHhhhhhJJhhyuhhhJYk
  ..kHhhhhHhhhJhyuhhhhk
  .kHhhhhHzzzzhhyuhHhhk
  .kHsHhHzZsZZZhyuhhhHk
  .kHssHzZZSZZZhyuhhhHk
  .kHSzzZZZSZZhhyuhhHHk
  .kHzZZZZZsZsZhyuhhHk.
  .kHZZZZZZZZZZhyuhhHk.
  .kHZzsZZZZZZhhyuhHHk.
  .kHZkksZZZZZZkYkHHk..
  .kHZkkszZsssskHHkk...
  ..kkZksss...kHkk.....
  ....ss.......k.......`)
sprite("_rf_band_rest", { pivot: [3, 0] }, `
  ..yY.
  .y.Y.
  u..Y.
  y..Y.
  ..Y..`)
sprite("_rf_band_up", { pivot: [3, 0] }, `
  ..yY.
  uy.Y.
  y..Y.
  ...Y.
  .....`)
sprite("_rf_band_down", { pivot: [3, 0] }, `
  ..yY.
  .y.Y.
  .y.Y.
  u..Y.
  y..Y.`)
sprite("_rf_band_back", { pivot: [3, 0] }, `
  uyyY.
  y.YY.
  .Y...
  .....`)
sprite("_rf_band_fling", { pivot: [3, 0] }, `
  u....
  yy...
  .yyY.
  ...Y.`)
// pinholes (fighter's: a hole in the drawn frame of 6 px or less filled from its neighbours): where tidy's corners cut
// one inside a shoe's line, where the band's tails or the head meet the body (the knot, the nape). Not on idle, strike_old and hurt: their few (3-8 px a
// frame, the same knot and nape) kept as they were approved
const KEPT = ["idle", "strike_old", "hurt"]
// rise_kick's trail (pxl's trail()): the band the kicking shin's outer half sweeps from the drawing before to this one,
// the hips turning between them (the pose's feet, lift and turn taken part way), hot at the foot (the light core U, then
// the sash's light and gold) and thinning to nothing at its tail, its last 60% (a thread before it read as a stray line
// where it leaves her side); the stretches behind her drawn under her, those nearer us over her (`side` -1, 1); its core
// gives light (emit), and its glow is baked, a wider band of the gold under it fading to its tail (a sheet has no
// bloom). Each drawing keeps the kicking leg in the picture's plane, as the 2D games cheat a spin's depth: turned her
// back to us, the leg out to her side, level (frame 3's own feet)
const kickTrail = (c, P, i, side) => { const a = P[i - 1], b = P[i], mix = (u, v, t) => (Array.isArray(u) ? u.map((e, k) => mix(e, v[k], t)) : u === null || v === null ? v : u + (v - u) * t)
  const own = (q) => (q.feet ?? STANCE.feet).map((f) => hipsFloor(f, q.turn ?? STANCE.turn)), mid = RIG.depth(RIG.joints(posed(b), 180).pelvis)
  const edge = (t) => { const turn = mix(a.turn ?? STANCE.turn, b.turn, t), L = RIG.joints(posed({ ...b, turn, feet: mix(own(a), own(b), t).map((f) => hipsFloor(f, turn)), lift: mix(a.lift ?? [0, 0], b.lift, t) }), 180).legs[1]
    const seen = (q) => [...RIG.screen(q), RIG.depth(q)]
    return [seen(L.toe), seen(add(L.toe, mul(sub(L.knee, L.toe), 0.55)))] }
  const glow = (t) => { const [a2, b2] = edge(t), d = [a2[0] - b2[0], a2[1] - b2[1]]; return [[a2[0] + 0.2 * d[0], a2[1] + 0.2 * d[1], a2[2]], [a2[0] - 1.45 * d[0], a2[1] - 1.45 * d[1], b2[2]]] }
  const opts = { t: 1, length: 0.6, step: 0.6 / 14, taper: true, side: (q) => (q[2] > mid) === (side > 0) }
  c.trail(glow, "yyY", { ...opts, fade: 0.6 }); c.trail(edge, "Uuyy", opts) }
// the wave's light gathering in her palms: _wave_gather (below) stamped between them
const gather = (c, p) => { const J = RIG.joints(p, 180), [x, y] = mul(add(RIG.screen(J.arms[0].hand), RIG.screen(J.arms[1].hand)), 0.5).map(Math.round)
  c.stamp("_wave_gather", x, y, { frame: 0 }) }
// The wave her `spawn` names: her own, in the sash's gold (her slots swap it with the sash; its light core U white-hot in
// every slot), made with pxl's effects: a crest standing up like a breaking wave (the push's front), thickest at its
// middle and thinning to its tips, filled by `energy` in two clean bands of the light and the core, its front edge the
// core; behind it its wake, a `trail()` full height at the crest and thinning to nothing 48 px back, rippling, a lighter
// streak down its middle and its tail dithered away; its glow baked as `aura` bands round all of it (a sheet carries no
// bloom). Not a ball: 76 x 52, its crest's middle on its pivot (the spawn point). wave_start: the light at her palms (an
// orb of energy in an aura) opening into the crest (2 x 2 ticks); wave_fly: its loop (8 x 2 ticks), a hit box round the
// crest and the hit's data on each frame; wave_end: on a hit or a block, the wave dissolving out from its front, its edge
// the core, giving light, sparks thrown off (6 x 2 ticks: the study's 15-23 ticks shortened to her own). Off the screen
// an engine drops it 50 px past the edge (KOF's).
const WV = { w: 76, h: 52, pivot: [54, 26] }, WAVE_HIT = { phase: "active", damage: 10, hitstun: 18, hitstop: 200, pushback: 30 }
// a crest's shape round (cx, cy): the pixels inside the ellipse rx x ry and outside the same one d px back; its front edge
const crest = (c, cx, cy, rx, ry, d, k, edge = false) => { for (let y = Math.floor(cy - ry); y <= cy + ry; y++) { const v = (y + 0.5 - cy) / ry; if (Math.abs(v) >= 1) continue
  const half = rx * Math.sqrt(1 - v * v); if (half < 1.5) continue
  const front = cx + half, back = front - Math.min(d, 2 * half) * (1 - 0.5 * v * v)
  if (edge) c.rect(Math.ceil(front) - 2, y, 2, 1, k); else for (let x = Math.floor(back); x < front; x++) c.px(x, y, k) } }
const waveDraw = (c, f, grow = 1) => { const [px, py] = WV.pivot, cx = px + 2, L = 48 * grow, H = 18 * grow
  const path = (t) => [cx - 7 + t, py + 1.5 * Math.sin(2 * Math.PI * ((-t / L) * 1.3 - f))]
  c.trail(path, "yyYY", { t: 0, length: L, width: [H, 1], fade: 0.55, step: 1 }); c.trail(path, "uuy", { t: 0, length: L * 0.6, width: [H * 0.45, 1], fade: 0.5, step: 1 })
  crest(c, cx, py, 9 * grow, 21 * grow, 7 * grow, "u"); c.effect("energy", { keys: "uU", scale: 12, speed: 1, rim: 0, where: [cx - 10, 0, 24, WV.h] })
  crest(c, cx, py, 9 * grow, 21 * grow, 0, "U", true); c.effect("aura", { color: "uy", width: 2, fade: 0.45, keep: true }) }
anim("_wave_body", { ...WV, frames: 8, fps: 30 }, (c) => waveDraw(c, c.phase))
anim("wave_fly", { base: "_wave_body", loop: true }, (c) => { const [px, py] = WV.pivot; c.setBox("hit", px - 6, py - 20, 18, 40); c.setData(WAVE_HIT) })
// (the light in her palms: an orb of energy in an aura, for her charge and the wave's first drawing)
anim("_wave_gather", { w: 20, h: 20, pivot: [10, 10], frames: 4, fps: 15 }, (c) => { c.circ(10, 10, 3, "y"); c.effect("energy", { keys: "yuUU", scale: 1.6, speed: 2, rim: 1 })
  c.effect("aura", { color: "uy", width: 2, fade: 0.4, flicker: 0.3, scale: 3, keep: true }) })
anim("wave_start", { ...WV, frames: 2, fps: 30 }, (c) => { const [px, py] = WV.pivot
  if (c.frame === 0) { c.circ(px - 4, py, 5, "y"); c.effect("energy", { keys: "yuUU", scale: 2, speed: 2, rim: 1 }); c.effect("aura", { color: "uy", width: 3, fade: 0.4, flicker: 0.3, scale: 3, keep: true }); c.setBox("hit", px - 12, py - 9, 16, 18) }
  else { waveDraw(c, 0, 0.7); c.setBox("hit", px - 5, py - 15, 14, 30) }
  c.setData(WAVE_HIT) })
anim("wave_end", { base: "_wave_body", frames: 6, fps: 30, loop: false }, (c) => c.effect("dissolve", { pattern: "out", at: [WV.pivot[0] + 8, WV.pivot[1]], progress: (c.frame + 1) / 6, edge: "Uu", glow: 1, debris: { kind: "sparks", keys: "Uu" } }))
for (const [m, M] of Object.entries(MOVES)) { const fall = FALLS.includes(m), face = FACE.includes(m), thrown = THROWS.includes(m), tall = TALLS.includes(m), R = thrown ? TH : face ? FACED : fall ? FALL : tall ? TALL : RIG, at = thrown ? PIV3 : face ? PIV4 : fall ? PIV2 : tall ? PIV5 : PIV
  const [body, arm] = thrown ? ["_rf_thrown", "_rf_thrown_arm"] : face ? ["_rf_face", "_rf_face_arm"] : fall ? ["_rf_fall", "_rf_fall_arm"] : tall ? ["_rf_tall", "_rf_tall_arm"] : ["_rf_body", "_rf_arm"]
  anim(m, { ...ON, pivot: at, ...(thrown ? { w: TW, h: TW, pivot: THROWN_AT } : tall ? { h: TALL.h } : {}) }, (c) => { const i = c.frame, p = M.pose(i), hd = headAt(R, p)
    const x = Math.round(hd[0]), y = Math.round(hd[1]), knot = p.face in KNOT ? KNOT[p.face] : [-12, -5]
    if (p.trail) kickTrail(c, RISE_KICK, i, -1)
    c.stamp(`${body}_${m}_s`, ...at, { frame: i }); if (knot) c.stamp(`_rf_band_${tailsOf(p)}`, x + knot[0], y + knot[1], p.face === "mirror" ? { flip: "x" } : {})
    c.stamp(headOf(p.face) + (p.roll && !["chin", "dn90", "inv"].includes(p.face) ? "_nn" : ""), x, y)
    c.stamp(`${arm}_${m}_s`, ...at, { frame: i }); if (p.trail) { kickTrail(c, RISE_KICK, i, 1); c.effect("emit", { on: "U", strength: 0.4 }) }
    if (p.gather) gather(c, p)
    if (!KEPT.includes(m)) pinholes(c)
    boxes(c, p, R) }, ...M.ms.map((ms) => frame({ ms }))) }
sheet("reva_fighter", [...Object.keys(MOVES), "wave_start", "wave_fly", "wave_end"], { rows: "tag", pad: 2, slots: SLOTS })
card("idle", { is: "Reva the fighter, 110 px standing, side view in KOF 2002's school, in 3D on her rig with her head drawn by hand: a violet bob under a gold headband, a red crop top, a gold sash, navy trousers bound at the ankle over slippers, wrapped fists; idle, strike (a rear cross), hurt, walk_f, walk_b, crouch, crouch_hold, jump, block, block_low, turn, crouch_turn, win (her win pose: one fist raised over her head, the last drawing held, on a frame 150 px high), jab, kick_l (a front kick), kick_h (a roundhouse to the head), crouch_kick, jump_kick, strike_old (the first cross), hurt_low, crouch_hurt, knockdown, down, get_up, down_face (lying face down), and her specials wave (a gold wave from both palms; wave_start, wave_fly, wave_end the wave itself) and rise_kick (a rising spinning kick with a gold trail), her thrown drawings (thrown_grabbed, thrown_folded, thrown_face_up, thrown_face_down, each turned to a throw's angles, its pivot her pelvis) facing e, hurt and hit boxes and frame data (the phase, the hitstop and the pushback, the air, the motion an engine applies, invuln, spawn, knockdown, a thrown drawing's roll, the drawing the game mirrors her on) from her joints", cells: { "side/?": "✓" },
  vary: { color: "3 palette slots on the sheet reva_fighter (base, jade, dusk: hair, top, trousers, sash): revaFighter.SLOTS", part: "her moves: idle, strike, hurt, walk_f, walk_b, crouch, crouch_hold, jump, block, block_low, turn, crouch_turn, win, jab, kick_l, kick_h, crouch_kick, jump_kick, strike_old, hurt_low, crouch_hurt, knockdown, down, get_up, down_face, wave, rise_kick facing e (the game flips her for w) and the wave's wave_start, wave_fly, wave_end, her thrown drawings thrown_grabbed, thrown_folded, thrown_face_up, thrown_face_down (a frame an angle, its data's roll), on the sheet reva_fighter, a row a move; their blocks _rf_bk_<move>_s" } })
Object.assign(revaFighter, { SLOTS, MOVES, rig: RIG })
}
