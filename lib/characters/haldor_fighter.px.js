// Haldor the smith, fighting's heavy (lib/profiles/fighting.px.js): an original big grappler seen from the side, 140 px
// standing and 126-130 in his guard, Reva's opponent (reva_fighter.px.js) in the same school (the library's study of the
// heavies, section 13 of its fighting study, measured for numbers only, never their pixels): bald, a braided black
// beard, a smith's tan leather apron over his front (a narrow bib up to his breastbone on a strap round his neck, tied
// at the waist, split up to the fork, to above his knees) over charcoal trousers bloused over laced work boots, leather
// gauntlets over his forearms and hands; bare shoulders and arms; 7.8 heads, his head the size of
// hers on a body 1.27 times her height, the neck hidden under the trapezius. His body built as the heavies' 3D models
// are (13.9: a barrel trunk as deep at the belly as at the chest, the trapezius up to the jaw, deltoids 3.6 heads
// across, thick arms and thighs), turned to the camera as the games turn a heavy, his guard and idle as big men stand
// and breathe (13.10). Made as she is: in 3D on his rig (rig3d(), one heading), painted as Guilty Gear Xrd paints a
// model for its one camera (each material a ramp cut where its terminator falls, his muscle by design as the heavies
// are painted: the shadow the biggest share of the skin, a cut, a small light on top of each mass, a crease only where
// masses part, a line between parts only at a real depth break, the outer line all round; his chest's masses and
// his clothes as the heavies' 3D models and 2D sprites build them, section 13.14), a cleanup by rule over
// each frame; his hands modeled on his rig (fingers bent at their knuckles, an opposed thumb: the pose's `fingers`
// give each its shape), his head drawn by hand near profile and stamped at its joint, between the body and the near arm
// (section 13.11: the heavies' heads, hands and feet). 18 colors; a line by material, black on the beard and the boots
// (the genre's ink). His guard a grappler's low and wide (13.12: the 2D grapplers' guards by kind): the thighs spread
// over bent knees, the weight between the feet, the lead foot in profile at her, the rear foot turned to the camera
// with its knee (the boots' soles flat on one row), the trunk near upright; both hands open claws ready to grab (13.13:
// the lead at his chin a forearm ahead of his chest, its palm turned to us and to her, the fingers at her; the near one
// before his belly, its back to us, the palm down and away; the fingers spread and curled). Idle (8 x 150 ms: the shoulders up 6 px
// over knees that give 1, the head sinking into them, the hands two drawings late, up, out and closing a little), and
// his movement and defense as Reva's are made (13.15: the low, wide grapplers' moves): walk_f and walk_b (a gait whose
// legs pass each other on his low, wide base, 8 drawings: 936 ms a cycle forward, 1064 back), crouch (a wrestler's crouch, 3
// drawings in 116 ms) and crouch_hold (his breath crouched, 8 x 150), jump (straight up 78 px: a prejump of 2, 7
// drawings in the air over 631 ms, 2 landing, squashed) and block and block_low (the fists up before his ducked head in
// 67 ms, the hit's 200 ms shaken by its steps, then pushed back), facing e, the game flips him for w; the feet on one
// row through every move but the air. Each frame's hurt boxes (head, body, legs) from his joints and its data { phase,
// air, step: the motion an engine applies, the frames drawn in place }; 3 palette slots (base, ash, moss: 12 keys
// swapped) on the sheet haldor_fighter.
// Taken with include("<path>/lib/characters/haldor_fighter.px.js", { as: "haldor_fighter" }): haldor_fighter.idle,
// .walk_f, .walk_b, .crouch, .crouch_hold, .jump, .block, .block_low;
// haldorFighter.SLOTS a slot's swap (stamp(..., { swap: haldorFighter.SLOTS.ash })); haldorFighter.HAND the hands' shapes.
// What he shares with Reva (the vectors, the toon, the shadows by design, the cleanup, the boxes) is in fighter.px.js;
// his body, stance, tones, parts and head are his.
include("../profiles/fighting.px.js")
include("fighter.px.js")
// the values from the heavies' paint (the study's 13.8, OKLab): the skin five tones as KOF 2002's bare-chested heavy
// (line 0.34 and redder, 0.48, 0.59, 0.71, a light 0.83), the beard a near-black mass, its strands lighter (0.25, 0.43), the apron a tan
// leather (0.34 line, 0.48, 0.61, 0.75), the gauntlets and the boots one dark leather (0.23, 0.33, 0.50), the
// trousers a charcoal cloth (0.25, 0.34, 0.48). 18 colors, every ramp from the ink
pal({ k: "#1a1418", S: "#5c2622", s: "#8e4430", m: "#b5653f", z: "#d98d62", Z: "#f2b88c", H: "#2a201d", h: "#5e4a3c",
  A: "#4e301d", a: "#7e5230", c: "#ab7543", l: "#d6a36b", E: "#24191a", e: "#43302a", g: "#7a5843", N: "#202228", n: "#363940", i: "#5a5e68" })
ramps("kSsmzZ", "kHh", "kAacl", "kEeg", "kNni")
var haldorFighter = {}
// in a block: its names stay its own when a scene includes the file
{
const { RAD, add, sub, mul, dot, len, unit, cross, clamp, smooth, hipsFloor, capD, shadowed, nearOf, band, bone, aimed, nearArm, pinholes, SURFACE } = fighter
// his slots, a swap each of the roles' keys: the beard (H h), the apron (A a c l), the gauntlets and the boots (E e g),
// the trousers (N n i); his skin kept. Each apart from Reva in all three of hers (her tops red, green, purple; her
// trousers navy, dark brown, maroon, always dark): ash an old smith's (a grey beard, a black apron, pale stone
// trousers, oxblood leather), moss (a dark beard, an olive apron, slate-blue trousers, black leather)
const F = genre("fighting"), SLOTS = {
  ash: { H: "#5d5a58", h: "#9a9590", A: "#141416", a: "#2c2d31", c: "#45474d", l: "#6c7079", E: "#2e1416", e: "#552529", g: "#7f3a3c", N: "#5b5852", n: "#8c877d", i: "#bdb6a8" },
  moss: { H: "#2b2017", h: "#523d2a", A: "#2f3115", a: "#4f5424", c: "#737a37", l: "#9da454", E: "#141516", e: "#2b2c2f", g: "#4b4d52", N: "#1d2533", n: "#33415a", i: "#5a6c8c" } }

// ---------------------------------------------------------------- his body and his guard, in px (rig3d's pose fields)
// Built from the heavies' 3D models (the study's 13.9: Bison, Smash's and Tears of the Kingdom's Ganondorf, set against
// Ryu and Ken), in his heads (18 px): 7.8 heads, 140 px standing (the profile's heavy), the hip joint 0.48 of him; the
// shoulders' joints 40 apart (2.2 heads: the heavies' 1.9-2.3), long thick arms, the hand as big as the head; the foot
// 26 px heel to toe with its boot (13.11: SF6's heavies' 0.18-0.22 of the height), the ankle 7 px over the sole (a
// quarter of the foot, as theirs)
const BODY = { h: F.scale.heavy[0], heads: 7.8, hip: 67, thigh: 33, shin: 28, ankle: 7, torso: 47, upper: 25, fore: 23, shoulders: [0, 20, -1], r: { foot: [5.5, 13, 4.5] } }
// His guard, a grappler's low and wide (the study's 13.12, the 2D grapplers' guards by kind: never a symmetric A, never
// two upright shins under spread thighs; each foot's heading its knee's), on the screen: the hips 0.47 of the way from
// the rear ankle to the front one (the low kind's 0.46-0.51), the lead (far) thigh 45 degrees ahead and its shin 17
// (theirs 30-57 and 0-29), the knee bent 28, the foot in profile at her (heading 100); the rear (near) thigh 33 degrees
// back and its shin 26 (theirs 21-53 and -8 to 9), the knee bent 31 (24 as he breathes in), its foot turned to the
// camera with its knee as the low grapplers turn theirs (13.13: heading 190, the toes 10 degrees back from us, the knee
// 203; Reva's 168), its boot read from the front by its round toe box lit on top over a sole line; the soles flat on
// the pivot's row (the feet on the floor's axes, [across, toward her; away from us], the rear one 10 px farther than
// the hips); 68 px between the ankles (0.55 of his 124 px guard, theirs 0.35-0.73) and 90 from toe to toe (the rear
// toe ahead of its heel, turned to us); the trunk leaning 6 degrees. Turned to the camera as the games turn a heavy to
// show his breadth (13.9: the heavies' trunk 25-30 degrees from facing us
// reads 0.4 of the guard across the shoulders, the 2D heavies' 0.35-0.5): the hips 45 degrees from profile, the chest
// 20 more; his head is drawn near profile, on her, whatever the chest does. The hands as a grappler holds them, ready to
// grab (13.13: the 2D grapplers' claws), on the floor's axes ([ahead, away, up] px from each shoulder): the lead (far)
// hand at his chin (0.87 of his guard, theirs 0.83-0.91), the near one before his belly (0.68, theirs 0.61-0.72), both a
// forearm ahead of the body, the elbows bent and carried out from it (the near arm is drawn over the head, and stays
// clear of the face). `fingers` each hand's shape as numbers ([curl, roll, bend, swing], arm by arm as `hands`): HAND's
// curl, degrees its fingers bend at their knuckles (open, the claw, half closed, a grip; the more open, the wider they
// fan); the hand rolled round the forearm, degrees (0 its palm toward her or down and its edge to the camera, above 0
// its back turned to us, below 0 its palm); bent at the wrist, degrees (below 0 its fingers toward its palm); swung at
// the wrist in the palm's plane, degrees (above 0 toward its little finger). The near hand an open claw, its back to us
// as the 2D grapplers draw theirs, the palm down and away; the far one, at his chin, its palm turned to us and a little
// to her (rolled -70), its fingers swung 45 off his steep forearm so they point at her, 25 degrees up, and curled a
// little less, so they part: a claw seen from its palm side, reaching (a palm to us with the fingers up reads "stop")
const HAND = { open: 0, claw: 35, half: 55, grip: 90 }
const STANCE = { turn: -45, twist: 20, lean: 6, down: 10, rise: 0, breath: 0, feet: [[36, 0], [-32, 10]], way: [100, 190], hands: [[28, 4, 4], [32, -2, -16]], elbow: [0.2, 1, -1],
  fingers: [[HAND.claw - 10, -70, 0, 45], [HAND.claw, 60, -10]] }
// (a pose's hands turned from the floor's axes into the shoulders' frame; its feet from the floor into the hips')
const posed = (o) => { const q = { ...STANCE, ...o }, h = 180 + q.turn, t = (h + q.twist) * RAD
  return { ...q, head: 130 - (h + q.twist), feet: q.feet.map((f) => hipsFloor(f, q.turn)), toes: [h - q.way[0], q.way[1] - h],
    hands: q.hands.map(([e, a, u]) => [e * Math.sin(t) + a * Math.cos(t), e * Math.cos(t) - a * Math.sin(t), u]) } }
// the idle (13.10 and 13.12: a heavy's breath is in his shoulders, his knees and his hands, the feet planted; the 2D
// grapplers' shoulders 4-8% of their height, the head less as it sinks into the risen trapezius, the knees 1-3 px,
// the hands 2-7 px and a drawing or two late): 8 drawings of 9 ticks, the chest and the shoulders up the spine 5 px
// over knees that straighten 1 px as he breathes in (6 px in all, 4.8% of his guard), the trapezius and the chest
// swelling with it, the head sinking 1.5 px into the risen shoulders (4.5 px in all), the hands two drawings late, up
// 3 px more and out, their claws closing 12 degrees and opening again (13.13: the grapplers' claws flex with the breath)
const BREATH = [0, 0.3, 0.7, 1, 1, 0.75, 0.4, 0.1], LAG = 2
const idle = (i) => { const b = BREATH[i], l = BREATH[(i + 8 - LAG) % 8]
  return posed({ phase: "idle", breath: b, rise: 5 * b, down: STANCE.down - b, hands: STANCE.hands.map(([e, a, u]) => [e + 1.5 * l, a, u + 3 * l]),
    fingers: STANCE.fingers.map(([c, ...turns]) => [c + 12 * l, ...turns]) }) }
// His movement and defense, as Reva's (the same names, motion data and boxes, so an engine treats the two alike), timed
// and posed as the heavies move (the study's 13.15: the low, wide grapplers' sheets frame by frame, KOF 2002's Chang,
// KOF XIII's Raiden and 3S's Alex first; the timing and the motion from the heavies' MUGEN conversions, 13.4). A pose's
// `step` is the motion an engine applies as its frame shows ([dx, dy] px from the frame before, dx the way he faces, dy
// down): the frames are drawn in place round the one pivot. Whole 60ths of a second, the ms rounded
const MS = (t) => Math.round((t * 1000) / 60)
// The walk (13.15: the low, wide grappler walks out of his guard without leaving it: Chang lifts a foot high, steps it
// ahead and out, lands his base as wide as his guard or wider (1.0-1.17 of it), his knees always bent and turned out
// with his feet, his hips lower than in his guard (0.80-0.91 of its height) and bobbing 5%): a gait whose legs pass
// each other, his low, wide base and his hunch kept. 8 drawings of 7 ticks (Chang's 8 x 7; the heavies' 36-60 ticks a
// cycle), 2.5 px a tick (Chang's, Maxima's and Clark's; the heavies' 2.3-3.0), so 17.5 px a drawing and a step of 70
// (his guard's ankles 68 apart): each foot planted where it lands (it goes back under him as fast as he goes on), the
// far one 38 px ahead of the pelvis and the near one 31 (its hip behind the far one's, the hips turned 45 degrees), so
// the base 78 and 63 px at the two contacts. Each step four drawings: the contact (the pelvis at its lowest, 4 px under
// his guard's; the rear foot on its ball, pushing), the weight onto the lead (its knee giving), the pass (the free foot
// lifted 16 px by the standing one and 16 out round it, its knee turned out with it, the near one toward us and its
// foot still behind under it, the far one away and passing: bowed legs, the knees 36-44 px apart; the pelvis at his
// guard's height), the reach (the free foot ahead, 10 px up, coming down; the standing foot rolling onto its ball). The
// hips rolling 3 degrees onto the standing leg and turning 5 with the free one; the trunk 4 degrees more hunched than
// the guard; the hands in the guard, following the body's bob a drawing late. The feet turned out with their knees as
// in the guard: the far one at her (100), turning away on its ball as it pushes off (50, 40); the near one to the
// camera (190), turned out further as it swings (205-210), and up on its ball as the weight passes over its bent knee
// (an ankle bends no further over the toes turned to us); a lifted foot hangs from its shin (point). The near foot's
// track 10 px farther from us than the far one's, as in the guard, so both soles stand on one row (at his camera a foot
// nearer us lands lower).
// Back (walk_b): the same drawings the other way round (Chang's, Tizoc's and Clark's back walks), 8 ticks a drawing,
// 2.2 px a tick (the heavies' back 1.6-2.5, the median 2.0)
const WALK = { ticks: [7, 8], D: 17.5, land: [38, 31], sw: [[0, 0.1, 0.5, 0.95], [0, 0.1, 0.3, 0.95]], lift: [0, 3, 16, 10], heel: [[[0, 0, 0, 8], [0, 6, 6, 8]], [8, 12, 0, 0]], point: [null, null, 20, 0],
  out: [0, 4, 16, 6], down: [14, 12, 9, 11], way: [[100, 50, 40, 90, 98], [190, 190, 205, 210, 175]], line: [0, 10] }
const walkPose = (k, back) => { const h = k % 4, s = k < 4 ? 1 : 0, D = WALK.D, v = (a, b) => (s ? [a, b] : [b, a])
  // (the swinging leg s, the standing one 1 - s: the near leg swings first, from the guard's place behind; the standing
  // foot planted where it landed, the swinging one from behind, where it stood, to where it lands)
  const feet = v([WALK.land[1 - s] - D * h, WALK.line[1 - s]], [WALK.land[s] - 4 * D * (1 - WALK.sw[s][h]), WALK.line[s] + (s ? -1 : 1) * WALK.out[h]])
  const way = v(WALK.way[1 - s][0], WALK.way[s][1 + h]), lift = v(0, WALK.lift[h]), heel = v(WALK.heel[0][1 - s][h], WALK.heel[1][h]), point = v(null, WALK.point[h])
  const d = WALK.down[(h + 3) % 4] - WALK.down[h]
  return posed({ phase: "walk", down: WALK.down[h], lean: STANCE.lean + 4, turn: STANCE.turn + (s ? -1 : 1) * [0, 2, 5, 3][h], tilt: (s ? 3 : -3) * [0.5, 1, 1, 0.5][h],
    feet, way, lift, heel, point, hands: STANCE.hands.map(([e, a, u]) => [e, a, u - 0.6 * d]),
    step: [(back ? -1 : 1) * WALK.D, 0] }) }
const walk = (back) => (i) => walkPose(back ? 7 - i : i, back)
// The crouch (13.15: the low grapplers crouch as wrestlers shoot, Alex's and Raiden's, not as Chang squats: the trunk
// folded forward over the knees, the head low and ahead but up, on her, the open hands forward at the knees' height,
// the feet a little wider than the guard's (76 px), 0.64-0.68 of the guard's height (Alex 75 of his 110, Raiden 0.64;
// his 85 of 129, 0.66), the rear heel up on its ball (its shin leans too far over the toes for a flat foot), the lead
// flat: down in 2 drawings and the third reached (the heavies' 2-5 ticks down: Griffon's and Zangief's 2, 2), the
// trunk folding as the hips sink. crouch_hold: his idle's breath, smaller (Chang crouched breathes in his idle's
// timing): 8 x 150 ms, the shoulders up 3 px, the hands two drawings late and the claws flexing
const KNELT = { down: 32, lean: 42, twist: 24, feet: [[40, 0], [-36, 10]], heel: [0, 8], hands: [[30, 4, -10], [30, -4, -18]], fingers: [[HAND.claw, -60, -10, 30], [HAND.claw, 60, -10]] }
const CROUCH = [{ down: 18, lean: 18, hands: [[29, 4, -2], [31, -3, -16]] }, { down: 27, lean: 30, hands: [[30, 4, -12], [30, -4, -17]] }, {}]
const crouch = (i) => posed({ phase: "crouch", ...KNELT, ...CROUCH[i] })
const crouchHold = (i) => { const b = BREATH[i], l = BREATH[(i + 8 - LAG) % 8]
  return posed({ phase: "crouch", ...KNELT, breath: b, rise: 3 * b, down: KNELT.down - 0.5 * b, hands: KNELT.hands.map(([e, a, u]) => [e + l, a, u + 2 * l]),
    fingers: KNELT.fingers.map(([c, ...turns]) => [c + 12 * l, ...turns]) }) }
// The jump, straight up (13.15: Chang's, Raiden's and Alex's; the height and the time from the conversions, 13.4: Chang's
// throw 8.2 px a tick against 0.43, 78 px up and 38 ticks in the air, the heavies' 69-83 px and 33-40 ticks): a
// prejump of 2 drawings of 2 ticks (the heavies' 3-5), the knees folding and the hands dropped; in the air 7 drawings
// over 38 ticks (Goro's 5, 5, 5, 8, 5, 5, 3, the apex held, his last 5), stretched off the floor (the legs straight,
// on his toes), the knees drawn up as he rises, tucked at the apex (both knees up to his belly, the feet under him,
// the head ducked), opening as he falls (the legs reaching for the floor a step apart); the hands kept in the guard as
// Chang keeps his (an arm thrown up over the head, Raiden's and Alex's, would leave his 150 px frame, and the far claw
// raised turns its fingers up: a "stop"); the apron's halves riding on the thighs; a landing of 2 drawings
// of 2 ticks (the heavies' 2-4), squashed deeper than the prejump (Alex's landing the deepest drawing of his jump),
// then back. Its height is the steps': APEX px at the top, sampled at each air frame's middle, as Reva's
const APEX = 78, AIR = true
const JUMP = [
  { phase: "prejump", down: 15, lean: 12, heel: [0, 4], hands: [[26, 4, -2], [30, -2, -20]] },
  { phase: "prejump", down: 21, lean: 16, heel: [0, 7], hands: [[25, 4, -6], [28, -2, -23]], face: "down" },
  { phase: "air", air: AIR, down: -2, lean: 2, feet: [[12, -3], [-10, 7]], heel: [7, 7], way: [100, 160], hands: [[27, 5, 5], [29, -2, -12]] },
  { phase: "air", air: AIR, down: 0, lean: 4, feet: [[18, -3], [-11, 7]], lift: [16, 2], point: [10, 25], way: [100, 150], hands: [[26, 5, 8], [30, -2, -12]] },
  { phase: "air", air: AIR, down: 2, lean: 10, feet: [[12, -3], [-4, 7]], lift: [24, 16], point: [0, 10], way: [100, 140], hands: [[26, 4, 4], [30, -2, -14]] },
  { phase: "air", air: AIR, down: 4, lean: 16, feet: [[14, -3], [2, 7]], lift: [28, 28], point: [0, 0], way: [100, 135], hands: [[28, 4, -6], [30, -3, -20]], face: "down" },
  { phase: "air", air: AIR, down: 2, lean: 10, feet: [[14, -3], [-6, 7]], lift: [18, 10], point: [10, 10], way: [100, 140], hands: [[24, 6, 6], [28, -2, -12]] },
  { phase: "air", air: AIR, down: 0, lean: 6, feet: [[18, -3], [-14, 7]], lift: [6, 2], point: [10, 15], way: [100, 150], hands: [[26, 7, 8], [30, -2, -10]] },
  { phase: "air", air: AIR, down: 0, lean: 5, feet: [[22, -3], [-20, 7]], heel: [4, 4], way: [100, 160], hands: [[27, 6, 6], [31, -2, -12]] },
  { phase: "landing", down: 24, lean: 18, heel: [0, 8], hands: [[24, 4, -8], [28, -2, -25]], face: "down" },
  { phase: "landing", down: 16, lean: 12, heel: [0, 4], hands: [[26, 4, -3], [30, -2, -20]] },
]
const JT = [2, 2, 5, 5, 5, 8, 5, 5, 5, 2, 2], AT = JT.reduce((s, t, k) => s + (JUMP[k].air ? t : 0), 0)
const JY = JT.map((t, k) => { if (!JUMP[k].air) return 0; const t0 = JT.slice(0, k).reduce((s, u, q) => s + (JUMP[q].air ? u : 0), 0) + t / 2; return Math.round((4 * APEX * t0 * (AT - t0)) / AT ** 2) })
const jump = (i) => posed({ ...JUMP[i], step: [0, i ? JY[i - 1] - JY[i] : 0] })
// The block (13.15: Chang's guard, the heavies' in KOF 2002: both forearms up before the face and the chest, the
// hands closed, the elbows down over the ribs, the head ducked behind them; held as one drawing, shaken by the hit,
// as the conversions' guard hit holds its guard drawing): up in one drawing of 4 ticks (the heavies' 2-8, Zangief's and
// Goro's 4), then the guard; the hit as Reva's (the engine's pause and slide, 6b): 4 drawings of 3 ticks shaken a px
// each way by their steps, sunk 2 px and curled further, then pushed back by their steps through two drawings to the
// guard. Low: the same from the crouch
const FIST = [[HAND.grip, 60, 0], [HAND.grip, 60, 0]]
const GUARD = { phase: "block", down: 12, lean: 10, twist: 26, hands: [[10, 4, 16], [38, -4, -1]], elbow: [0.2, 1, -0.6], fingers: FIST, face: "down" }
const STUN = { ...GUARD, phase: "blockstun", down: 14, lean: 13, twist: 30, hands: [[9, 4, 15], [36, -4, -2]] }
const BLOCK = [{ ...GUARD, hands: [[16, 4, 10], [34, -3, -4]] }, GUARD, ...[1, -2, 2, -1].map((x) => ({ ...STUN, step: [x, 0] })),
  { ...STUN, down: 13, lean: 11, twist: 28, step: [-14, 0] }, { ...GUARD, phase: "blockstun", step: [-9, 0] }, { ...GUARD, step: [-7, 0] }]
const block = (i) => posed(BLOCK[i])
const blockLow = (i) => posed({ ...BLOCK[i], ...KNELT, down: KNELT.down + BLOCK[i].down - GUARD.down, lean: KNELT.lean - 6 + BLOCK[i].lean - GUARD.lean, hands: BLOCK[i].hands, fingers: FIST })
const MOVES = { idle: { pose: idle, ms: BREATH.map(() => 150) },
  walk_f: { pose: walk(false), ms: Array(8).fill(MS(WALK.ticks[0])) }, walk_b: { pose: walk(true), ms: Array(8).fill(MS(WALK.ticks[1])) },
  crouch: { pose: crouch, ms: [2, 2, 3].map(MS) }, crouch_hold: { pose: crouchHold, ms: BREATH.map(() => 150) },
  jump: { pose: jump, ms: JT.map(MS) }, block: { pose: block, ms: [4, 6, 3, 3, 3, 3, 3, 3, 6].map(MS) }, block_low: { pose: blockLow, ms: [4, 6, 3, 3, 3, 3, 3, 3, 6].map(MS) } }
const W = 150, H = 150, PIV = [50, 146], PITCH = F.camera.pitch

// ---------------------------------------------------------------- the tones (fighter.toonOf: Xrd's threshold)
// His materials, each [its line, its fills dark to light, the cuts between them]: skin S s m z Z (S its crease tone,
// only a crease reaches it; the shadow s the widest band and the light Z the narrowest, as 13.8 found the heavies'),
// apron A a c l (its straps and ties too, and the gauntlets' palms; its skirt A a c, the stiff leather lit only at its
// edges), gauntlets E e g, boots E e g (black line),
// trousers N n i, the soles a; the beard is the head's (by hand)
const TONE = { skin: ["S", "SsmzZ", [0.08, 0.52, 0.68, 0.91]], apron: ["A", "acl", [0.42, 0.84]], skirt: ["A", "ac", [0.42]], glove: ["E", "Eeg", [0.25, 0.55]],
  boot: ["k", "Eeg", [0.3, 0.78]], tr: ["N", "Nni", [0.4, 0.86]], sole: ["k", "a", []] }
const toon = fighter.toonOf(TONE, "S")
// a material with its bias: the place's own, a shadow cast on it, a crease (deep), a light (shine, below 0)
const T = (m, base, cast = 0, occ = 0, shine = 0) => toon(m, base + cast + shine, occ)
// (each mass of skin lit on its top and in shadow under it, as the heavies' muscle is painted: what faces down a step darker)
const U = (n) => (n[2] < -0.15 ? 0.22 : 0)
// bare skin as the heavies' is painted (13.8, 13.14): its cuts a step up, so a plane facing ahead falls in the shadow,
// the widest share; the light only where a form turns up to it (z), a small shine at its crown (Z), inside its edge (where
// the form still faces the camera: the edge stays a line by material, 13.8); `bias`, `cast` and `deep` as T's
const skin = (n, bias = 0, cast = 0, deep = 0) => T("skin", 0.2 + U(n) + bias, cast, deep, n[2] > 0.78 && n[2] * 0.17 - n[1] * 0.98 > 0.3 ? -0.4 : n[2] > 0.4 ? -0.12 : 0)
// a table of [h, value] read at h (linear between its rows)
const lerp = (rows, h) => { let k = 1; while (k < rows.length - 1 && h > rows[k][0]) k++
  const [h0, v0] = rows[k - 1], [h1, v1] = rows[k]; return v0 + (v1 - v0) * clamp((h - h0) / (h1 - h0)) }
// The trunk's section from the seat (h 0, 2 px under the pelvis) to over the shoulders' line (h 1), half its width and
// its depth ahead and behind of the spine, px (13.9's heavies at his size: the chest 40 across and 27 deep, the lats the
// widest at its foot, the waist 29 across and 24 deep, a barrel whose belly comes as far forward as the chest; the
// pecs a mass ahead of it; a man's trunk 0.85 of this across and 0.8 as deep)
const SIDE = [[0, 15.5], [0.25, 14.5], [0.45, 15.5], [0.62, 18.5], [0.75, 20], [0.88, 20], [1, 18]]
const FRONT = [[0, 12], [0.25, 13], [0.45, 14], [0.62, 13.5], [0.75, 14.5], [0.88, 13.5], [1, 11]]
const BACK = [[0, 12.5], [0.25, 11], [0.45, 11.5], [0.62, 12.5], [0.75, 13], [0.88, 13], [1, 11]]

// ---------------------------------------------------------------- his parts, each painted in its own coordinates
// the hand modeled as the heavies' are built (the study's 13.11), in its own frame from the wrist (y along the hand, x
// across with the thumb at +x, z out of its back): 18 px from the wrist to the middle finger's tip (the heavies' 1.07-1.24
// heads), the palm 0.48 of it and 0.7 across, four fingers from a knuckle line across it (the middle 0.52 of the hand,
// the index 0.45, the ring 0.47, the little 0.33), each in three bones bent at its knuckles toward the palm by `curl`
// degrees (the middle knuckle the most) and fanned apart, the more the more open (a claw 1.5 times a grip's 28 degrees,
// as the 2D heavies spread theirs), 2 px thick so a px parts them; the thumb from the palm's side by the wrist, out and
// forward, opposed (its tip 0.8 of the hand from the wrist); in the gauntlet's leather, its back dark, the palm side a
// patch of the apron's lighter leather (a smith's gauntlet's palm, worn rough), its hollow in shadow (13.14: a dark
// glove seen from its palm reads as a lump; the lighter palm round a dark hollow reads as a cupped hand)
const handOf = (fb, curl, side = 1) => {
  const finger = (x, ln, fan) => { x *= side; fan *= side; const segs = [0.45, 0.3, 0.25].map((s) => s * ln), bend = [0.6, 1, 0.7].map((s) => s * curl * RAD)
    let p = [x, 8.2, 0.4], a = 0; const caps = []
    segs.forEach((s, k) => { a += bend[k]; const q = add(p, [s * Math.sin(fan * RAD) * Math.cos(a), s * Math.cos(fan * RAD) * Math.cos(a), -s * Math.sin(a)]); caps.push(sdf.capsule(p, q, 0.98 - 0.06 * k, 0.9 - 0.06 * k)); p = q })
    return sdf.union(...caps, { smooth: 0.3 }) }
  const spread = 1.8 - (0.8 * Math.min(curl, 90)) / 90
  const fingers = [[4.8, 8.1, 14], [1.6, 9.4, 5], [-1.6, 8.5, -5], [-4.8, 6, -14]].map(([x, ln, fan]) => finger(x, ln, fan * spread))
  const t0 = [5 * side, 1.6, -1.2], t1 = add(t0, mul(unit([0.6 * side, 0.7, -0.45]), 5.4)), t2 = add(t1, mul(unit([0.15 * side, 0.9, -0.5 - curl / 120]), 4.4))
  const thumb = sdf.union(sdf.capsule(t0, t1, 1.7, 1.4), sdf.capsule(t1, t2, 1.35, 1.1), { smooth: 0.4 })
  return sdf.union(sdf.box([12, 8.6, 4.6], { round: 2 }).at(0, 4.6, 0), ...fingers, thumb, { smooth: 0.7 })
    .paint((q, n) => { const palm = n[2] < -0.3, hollow = palm && Math.abs(q[0]) < 3.5 && q[1] > 2 && q[1] < 8.5
      return palm && !hollow ? T("apron", fb + 0.3) : T("glove", fb + 0.22 + (hollow ? 0.3 : 0), 0, 0, n[2] > 0.3 ? -0.45 : 0) }).part("hand") }

// the figure below the head, part by part, for a frame's joints
const parts = (j, p = {}) => {
  const out = {}, twist = Math.atan2(dot(j.sh.f, j.r), dot(j.sh.f, j.f)), near = j.depth(j.legs[1].hip) > j.depth(j.legs[0].hip) ? 1 : 0, na = nearArm(j) === "arm1" ? 1 : 0, b = p.breath ?? 0
  const armB = j.arms.map((A) => [[A.sh, A.elbow, 8.4, 7.2], [A.elbow, A.hand, 7.6, 6.4], [A.hand, A.hand, 8, 8]])
  const legB = j.legs.map((L) => [[L.hip, L.knee, 12.5, 10.5], [L.knee, L.ankle, 10.5, 9]])
  // the trunk: a barrel swept up his spine (SIDE, FRONT, BACK), the chest swelling 1 px on a breath, the belly a dome low
  // ahead of it (13.9: as far forward as the chest); its angle round turned from the hips' way at its foot to the
  // shoulders' at its top. On it his muscle as masses, as the heavies' 3D trunks are built and read at his size (the
  // study's 13.14): each pec a slab across the chest's top, its lower edge standing 3 px off the ribcage, so it faces
  // down and falls in shadow over a crease, short, by the middle (13.8: a crease only where masses part deep: under the
  // pec, the armpit); under each pec on the side the ribcage's serratus, three small bumps; the obliques' rolls over
  // the hips, over the apron's top. Lit as the heavies are painted (13.8, 13.14): the shadow the widest share (the
  // trunk's cuts a step up, so a plane facing ahead falls in it), a sharp cut, the light only where a mass turns up to
  // it, a small shine at its crown; the back in shadow, the side the camera sees a step lighter; the armpit a short
  // crease where each upper arm leaves the trunk
  const z0 = j.pelvis[2] - 2, top = j.chest[2] + 4, lean = sub(j.chest, j.pelvis), hips = [j.pelvis[0], j.pelvis[1], 0]
  const along = (h) => { const t = (z0 + h * (top - z0) - j.pelvis[2]) / lean[2]; return [lean[0] * Math.max(0, t), lean[1] * Math.max(0, t)] }
  const ahead = (h, a) => a - twist * smooth(0.25, 0.8, h)
  const R = (h, a) => { const c = Math.cos(ahead(h, a)), s = Math.sin(ahead(h, a)), side = lerp(SIDE, h), ax = c >= 0 ? lerp(FRONT, h) + b * 0.8 * smooth(0.5, 0.75, h) : lerp(BACK, h)
    return 1 / Math.sqrt((c * c) / (ax * ax) + (s * s) / (side * side)) + 2 * Math.exp(-(((h - 0.38) / 0.16) ** 2)) * Math.max(0, c) ** 2 }
  const trunk = j.sweep(hips, z0, top, R, { shift: along }), lerp3 = (a, c, t) => add(a, mul(sub(c, a), t))
  // (a point on the barrel at height h, ac round from the chest's front, `o` px out, and the way out there)
  const onBarrel = (h, ac, o = 0) => { const a = ac + twist * smooth(0.25, 0.8, h), s = along(h), d = add(mul(j.f, Math.cos(a)), mul(j.r, Math.sin(a)))
    return [add([hips[0] + s[0], hips[1] + s[1], z0 + h * (top - z0)], mul(d, R(h, a) + o)), d] }
  const mass = (h, ac, o, r) => { const [c, d] = onBarrel(h, ac, o); return aimed(sdf.ellipsoid(r), d, c) }
  const PECS = [-1, 1].map((s) => mass(0.8, 0.45 * s, -2.4, [9.5, 5, 6.5]))
  const body = sdf.union(trunk.field, ...PECS, ...[-1, 1].flatMap((s) => [mass(0.4, 1.3 * s, -2.2, [5, 3.6, 7.5]), ...[0.6, 0.655, 0.71].map((h, k) => mass(h, (1.12 + 0.04 * k) * s, -1, [2.6, 1.8, 2]))]), { smooth: 1 })
  const pits = j.arms.map((A) => [lerp3(A.sh, A.elbow, 0.2), lerp3(A.sh, A.elbow, 0.45), 8.2, 7.9]), pecZ = onBarrel(0.8, 0)[0][2]
  const torso = body.paint((q, n) => { const [h, a] = trunk.at(q), ac = Math.abs(ahead(h, a)), pd = Math.min(...PECS.map((P) => P.dist(q)))
    const under = pd > 0.1 && pd < 1.4 && q[2] < pecZ - 3 && ac < 0.5
    return skin(n, (ac > 2.4 ? 0.18 : 0) + (ac > 0.95 && ac < 2.1 ? -0.1 : 0), 0.4 * shadowed(q, armB.flat()), (under ? 0.5 : 0) + 0.45 * nearOf(q, pits, 2)) })
  // the trapezius (13.9: the heavies' rises half-way out to their chin, 10-13 px over the shoulders' joints, the neck
  // hidden in it): a wedge from round the head's foot out to each shoulder, swelling 1 px with the breath; lit on its
  // top, the back of it in shadow; one mass with the trunk (one part: no line between them)
  const neck = add(j.chest, [0, 0, 7]), back = mul(j.sh.f, -2)
  const trapF = sdf.union(sdf.ellipsoid([8, 7, 8 + b]).at(...add(neck, add(back, [0, 0, -1]))), ...j.arms.map((A) => sdf.capsule(add(neck, back), add(A.sh, [0, 0, 3.5]), 6.4 + 0.6 * b, 5.6)), { smooth: 2.5 })
  const traps = trapF.paint((q, n) => skin(n, 0.1, 0.4 * shadowed(q, armB.flat())))
  out.torso = sdf.union(torso, traps, { smooth: 1 })
  // the apron, a smith's (13.14, read in photographs of smiths and farriers at work): heavy leather over his front only,
  // hung from the neck by a strap and tied round the waist. Its bib narrow (the width between the nipples), from the
  // waist up to his breastbone between the pecs, lying 1.2 px off the body (on the pecs' inner edges and the belly's
  // dome) and riding on the chest as the trunk curls, its top edge lit; a strap from each top corner up over the
  // trapezius and round behind his neck, under the head as it is drawn (the near one up beside his nape, the far one over
  // the far trapezius beside his jaw, both gone behind the head); the ties round the waist to a knot at his near hip,
  // two ends hanging from it; the skirt split up to the fork, each half over its thigh's front to above the knee (a
  // farrier's), so the stance reads and the trousers show behind and between them. Stiff: no fold but where the waist
  // gathers it, two short creases across the hips; its leather in two tones, the light only on the bib's lit edge (13.8
  // and 13.14: leather mostly dark, lit at its edges), so a half lifted on its thigh to the light stays the leather it
  // hangs from; its hem a step darker (the cut edge), scorch marks a step darker on its front (the forge's sparks); the
  // arms' shadows and the near thigh's on it
  const waist = z0 + 0.25 * (top - z0), hw = 0.25, BIB = { top: 0.86, half: [[0.25, 0.95], [0.6, 0.62], [0.86, 0.34]] }, SPLIT = true
  const bibZ = z0 + BIB.top * (top - z0), torsoF = sdf.union(body, trapF, { smooth: 1 })
  // (a point lying `o` px off the trunk and the trapezius, out from the spine at h and ac: the bib's and the straps' way over them)
  const onBody = (h, ac, o) => { const [c, d] = onBarrel(h, ac, -6); let lo = 0, hi = 20
    for (let k = 0; k < 14; k++) { const m = (lo + hi) / 2; if (torsoF.dist(add(c, mul(d, m))) < o) lo = m; else hi = m }
    return add(c, mul(d, lo)) }
  // (its box 34 px round the hips, or out to the bib where the trunk curls it farther: its edges and middle, 5 heights)
  const rim = [0.25, 0.4, 0.55, 0.7, BIB.top].flatMap((h) => [-1, -0.5, 0, 0.5, 1].map((t) => onBody(h, t * lerp(BIB.half, h), 1.9)))
  const box = (z, e = -1) => [0, 1].map((k) => hips[k] + e * Math.max(34, ...rim.map((q) => e * (q[k] - hips[k]) + 1))).concat(z)
  const bibF = sdf.field((x, y, z) => { const q = [x, y, z], d = Math.abs(torsoF.dist(q) - 1.2) - 0.7, cap = Math.max(waist - 2 - z, z - bibZ)
    if (cap > 0) return Math.max(d, cap)
    const [h, a] = trunk.at(q); return Math.abs(ahead(h, a)) > lerp(BIB.half, h) ? Math.max(d, 0.3) : d }, box(waist - 3), box(bibZ + 1, 1))
  // (a curtain hung from the waist to above the knees, flaring a px as it falls, pushed out by each thigh's front where
  // it comes forward; split: under the fork, where it spans from one thigh to the other, cut away)
  const hemZ = Math.min(Math.max(...j.legs.map((L) => L.knee[2])) + 7, waist - 3), forkZ = j.pelvis[2] - 6
  const SEAT0 = j.sweep(hips, hemZ, waist, (h, a) => R(hw, a) + 1.4 + (1 - h) * 1.2, { keep: (h, a) => Math.abs(ahead(hw, a)) < 0.6 - 0.1 * h, shell: 0.7, shift: () => along(hw) })
  const SEAT = { field: SPLIT ? SEAT0.field.subtract(sdf.plane([0, 0, 1], forkZ).subtract(...j.legs.map((L) => sdf.capsule(L.hip, L.knee, 16.5, 13.5)))) : SEAT0.field }
  // (a thigh raised toward the level, crouched or tucked in the air: its half of the apron lies on its top to above the
  // knee, the stiff leather a plate over it, its end the hem)
  const lying = j.legs.map((L) => (L.hip[2] - L.knee[2]) / len(sub(L.knee, L.hip)) < 0.55)
  const thighs = j.legs.map((L, i) => { const u = unit(sub(L.knee, L.hip)), f = unit(sub(j.f, mul(u, dot(j.f, u))))
    if (lying[i]) { const n = unit(sub([0, 0, 1], mul(u, u[2])))
      const end = add(L.hip, mul(u, 0.78 * len(sub(L.knee, L.hip))))
      return sdf.capsule(L.hip, end, 14.4, 12.4).subtract(sdf.capsule(L.hip, add(L.knee, mul(u, 4)), 13, 10)).intersect(sdf.plane(mul(n, -1), -dot(n, L.hip) + 3)) }
    return sdf.capsule(L.hip, L.knee, 14.4, 11.4).subtract(sdf.capsule(L.hip, L.knee, 13, 10)).intersect(sdf.plane(mul(f, -1), -dot(f, L.hip) - 1), sdf.plane([0, 0, -1], -hemZ)) })
  const skirt = sdf.union(SEAT.field, ...thighs, { smooth: 1.6 }), hem = (q) => q[2] - hemZ
  out.apron = sdf.union(bibF, skirt, { smooth: 1 }).paint((q, n) => { const lg = j.legs.map((L) => capD(q, [L.hip, L.knee, 14.4, 11.4]) < 1.2), on = lg[1 - near] ? 1 - near : lg[near] ? near : -1
    const v = sub(q, j.pelvis), ang = Math.atan2(dot(v, j.r), dot(v, j.f)), front = Math.abs(ahead(hw, ang)) < 0.8
    const far = on >= 0 && on !== near ? 0.1 : 0, edge = hem(q) < 1.4 && hem(q) > -1.5 ? 0.3 : 0, turn = front ? 0 : 0.22, gathered = v[2] < waist - j.pelvis[2] - 1 && v[2] > waist - j.pelvis[2] - 6 && band(v[2], 2.4, 0.6, 0.5)
    const scorch = front && sdf.fbm(v[0] / 3.5, v[1] / 3.5, v[2] / 3.5, 7, 2) > 0.68, shade = 0.4 * shadowed(q, armB.flat()) + 0.3 * shadowed(q, [legB[near][0]], 8)
    return T(q[2] < waist ? "skirt" : "apron", far + edge + turn + (gathered ? 0.4 : 0) + (scorch ? 0.3 : 0), shade, 0, q[2] > bibZ - 1.6 && n[2] > -0.2 ? -0.32 : 0) })
  const cam = Math.atan2(-j.r[1], -j.f[1]) > 0 ? 1 : -1, strapPaint = (q, n) => T("apron", 0.1, 0.4 * shadowed(q, armB.flat()), 0, n[2] > 0.4 ? -0.3 : 0)
  // (a loop round the neck under the head as it is drawn, HEAD_AT ahead of its joint, 6 px down the neck from it: a point
  // of it `r` px out and `a` round from the chest's front, laid `o` px over the trapezius and the chest (moved down the
  // field's gradient onto them), or, with no `o`, left inside them: the loop's back, behind the neck. The strap's way
  // round it [a, r, o]: up the neck's side on the trapezius, then behind)
  const nu = unit(sub(j.head, j.chest)), nf = unit(sub(j.sh.f, mul(nu, dot(j.sh.f, nu)))), nr = cross(nu, nf), nape = add(add(j.head, [HEAD_AT[0], 0, 0]), mul(nu, -6))
  const grad = (q) => { const d = torsoF.dist(q); return unit([0, 1, 2].map((e) => torsoF.dist(add(q, [0, 1, 2].map((i) => (i === e ? 0.3 : 0)))) - d)) }
  const onNeck = (a, r, o) => { let q = add(nape, add(mul(nf, r * Math.cos(a)), mul(nr, -r * Math.sin(a))))
    if (o !== undefined) for (let k = 0; k < 6; k++) q = sub(q, mul(grad(q), torsoF.dist(q) - o))
    return q }
  const STRAP = [[0.8, 10, 1.3], [1.2, 10, 1.3], [1.6, 9.5, 1.3], [2.1, 6], [2.6, 5], [3.1, 5]]
  out.straps = [-1, 1].map((s) => { const half = lerp(BIB.half, BIB.top), ps = [onBody(BIB.top - 0.02, (half - 0.06) * s, 1.6), onBody(0.95, (half + 0.05) * s, 1.4),
    ...STRAP.map(([a, r, o]) => onNeck(a * s, r, o))]
    return sdf.union(...ps.slice(1).map((q, k) => sdf.capsule(ps[k], q, 1.1)), { smooth: 0.6 }).paint(strapPaint) })
  const knot = onBarrel(0.25, 1.75 * cam, 2)[0]
  out.ties = sdf.union(j.sweep(hips, waist - 1.2, waist + 1.2, (h, a) => R(hw, a) + 1, { keep: (h, a) => Math.abs(ahead(hw, a)) > 1.15, shift: () => along(hw) }).field,
    sdf.ellipsoid([2.2, 2, 1.8]).at(...knot), sdf.capsule(knot, add(knot, [1.5, 0, -8]), 1, 0.8), sdf.capsule(knot, add(knot, [-1.5, 0, -6.5]), 1, 0.8), { smooth: 0.5 }).paint(strapPaint)
  // the trousers, heavy cloth (13.14: few, big folds that follow the weight): each leg a thick thigh and calf (13.9: the
  // heavies' 20-25 px round) and a shin, the seat round his hips, tucked into the boots and bloused over their tops in a
  // roll (lit on its top, in shadow under it, a line where it stands off the boot); the side away and the inner thigh
  // in shadow, the apron's hem's shadow under it, the near leg's on the far; on each thigh two pull folds from the fork
  // round to the knee's front, each a crease with its ridge lit above it; behind the bent knee two short creases across,
  // where the cloth bunches
  const SHAFT = 19, fold = (d) => (Math.abs(d) < 0.13 ? 0.4 : d < -0.13 && d > -0.36 ? -0.3 : 0)
  const legs = j.legs.map((L, i) => { const far = i !== near, lb = far ? 0.08 : 0, inner = mul(j.r, i ? -1 : 1), up = unit(sub(L.knee, L.ankle)), at = (z) => add(L.ankle, mul(up, z))
    const sh = (q) => (hem(q) > -4 && hem(q) < 0 ? 0.3 : 0) + (far ? 0.3 * shadowed(q, legB[near], 10) : 0), away = (a) => (Math.abs(a) > 2.2 ? 0.22 : a > 1 ? 0.14 : 0)
    const thighP = (t, a, q) => T("tr", lb + away(a) + (fold(a - (1.3 - 1.1 * t)) || fold(a - (0.6 - 0.75 * t))) + (t > 0.8 && Math.abs(a) > 2.3 && band(t * 33, 3.2, 1.6, 0.5) ? 0.4 : 0), sh(q))
    const shinP = (t, a, q, n, Ln) => T("tr", lb + away(a) + (t * Ln < 4 && Math.abs(a) > 2.3 && band(t * Ln, 3.2, 1, 0.5) ? 0.4 : 0), sh(q))
    const roll = aimed(sdf.ellipsoid([9.9, 2.8, 9.9]), up, at(SHAFT - 0.5)).paint((q, n) => T("tr", lb + U(n), sh(q), 0, n[2] > 0.45 ? -0.3 : 0))
    const seat = far ? [sdf.ellipsoid([14, 13, 11]).at(j.pelvis[0], j.pelvis[1], j.pelvis[2] - 3).paint((q) => T("tr", 0.1, sh(q), nearOf(q, legB[near], 3) * 0.45))] : []
    return sdf.union(sdf.union(bone(L.hip, L.knee, 12.5, 10.5, j.f, inner, thighP), bone(L.knee, at(SHAFT), 10.5, 8.2, j.f, inner, shinP), ...seat, { smooth: 2 }), roll, { smooth: 0.6 }).intersect(sdf.plane([0, 0, 1], waist)) })
  out.legFar = legs[1 - near]; out.legNear = legs[near]
  // the boots, as the heavies' are built (the study's 13.11: the foot 0.18-0.22 of the height with its boot, the ankle a
  // quarter of the foot over the sole and from the heel; over the sole the heel's counter 0.35 of the foot, the instep
  // 0.38, the ball 0.27, the toe box 0.2, the tip 0.15, round; the sole flat, a band of its own value): a foot 26 px from
  // heel to toe on the rig's sole, built along its heading (a heel block, the instep, a low round toe box over a slab as
  // wide as the foot, so the sole's near edge, its lowest row, is straight), its sole 1.5 px (the heel's 2) in the
  // sole's tone flat on the floor, the toe rising off it, the toe cap and the instep's top lit; the toe box round and
  // as wide as the ball (0.52 of the foot, the heavies' 0.48-0.55), wider than the ankle, so a boot turned to the
  // camera still reads as one (13.13: a round toe lit on top over a sole line, as the low grapplers' front feet are
  // drawn). A work boot laced up its front (13.14: the 2D heavies' boots laced or strapped, their shaft to 1.4-2.1 heads
  // over the sole; SF6's wrestler's to 0.84 of the knee's height): the shaft round the shin from the ankle to 19 px up
  // (26 over the sole, 1.45 heads, 0.75 of the knee's height), narrow at the ankle, as wide as the calf at its top,
  // the trousers' roll over it; the laces a column of lit crossings every 2.6 px up its front and over the instep;
  // black-lined, mostly dark (leather in 3D folds less than 0.08 heads: at his size, its seams, laces and edges)
  out.boots = j.legs.map((L, i) => { const fb = i !== near ? 0.08 : 0, up = unit(sub(L.knee, L.ankle)), at = (z) => add(L.ankle, mul(up, z))
    // (a foot off the level, its heel up on its ball or pointed in the air: built along its sole from heel to toe, its up
    // square to it, the ankle its 7 px over it)
    const lvl = Math.abs(L.toe[2] - L.heel[2]) < 0.01, f = lvl ? [Math.sin(L.heading * RAD), Math.cos(L.heading * RAD), 0] : unit(sub(L.toe, L.heel))
    const side = lvl ? [f[1], -f[0], 0] : unit([f[1], -f[0], 0]), fu = lvl ? null : cross(side, f), o = lvl ? [L.ankle[0], L.ankle[1], L.ball[2]] : sub(L.ankle, mul(fu, BODY.ankle))
    const ahead = (q) => dot(sub(q, o), f), upOf = (v) => (lvl ? v[2] : dot(v, fu))
    const shaft = sdf.capsule(at(0), at(SHAFT), 6.2, 8.4).paint((q, n) => { const z = dot(sub(q, L.ankle), up), w = unit(sub(q, at(z)))
      return T("boot", fb + (dot(w, f) > 0.72 ? (band(z, 2.6, 1.3, 0.55) ? -0.45 : 0.2) : 0), 0, 0, n[2] > 0.5 ? -0.3 : 0) })
    const foot = aimed(sdf.union(sdf.ellipsoid([5.4, 4.6, 5]).at(0, -2.4, 4.6), sdf.capsule([0, -1.5, 6.5], [0, 10, 3.2], 6, 5.2), sdf.ellipsoid([7, 6.8, 4.4]).at(0, 12.8, 3.8), sdf.box([13.6, 18, 3.2], { round: 1.6 }).at(0, 2.2, 0), { smooth: 1.6 })
      .intersect(sdf.plane([0, 0, -1], 0)), f, o).paint((q, n) => { const h = lvl ? q[2] - o[2] : upOf(sub(q, o)), y = ahead(q), lace = upOf(n) > 0.4 && y > -1 && y < 7 && Math.abs(dot(sub(q, o), side)) < 2.2
        if (h < 1.5 || (h < 2.2 && y < -2.5)) return T("sole", fb)
        return T("boot", fb + 0.1 + (lace ? (band(y, 2.6, 1.3, 0.55) ? -0.2 : 0.3) : 0), 0, 0, upOf(n) > 0.55 && y > -1 ? -0.45 : 0) })
    return sdf.union(shaft, foot, { smooth: 1.2 }) })
  // the arms (13.9: the heavies' deltoids 3.4-3.9 heads across, the upper arm 15-18 px round, the forearm 11-16): the
  // deltoid a ball over the shoulder (a light on its top), parted from the biceps by a short crease on its outside; the
  // biceps a mass ahead (its top lit, its underside in shadow), the elbow's fold; the forearm bare to its middle, then
  // the gauntlet: a flared cuff, its leather over the rest of the forearm to the wrist, two straps round it; the hand
  // modeled at the wrist, shaped by the pose's `fingers` (its curl, its roll round the forearm, its bend at the wrist)
  j.arms.forEach((A, i) => {
    const far = i !== na, fb = far ? 0.12 : 0, inner = mul(j.sh.r, i ? -1 : 1), fd = sub(A.hand, A.elbow)
    const ud = unit(sub(A.elbow, A.sh)), out_ = mul(j.sh.r, i ? 1 : -1)
    const delt = sdf.ellipsoid([10, 10, 9.4]).at(...add(add(A.sh, mul(ud, 2.6)), add(mul(out_, 2.4), [0, 0, 1.6]))).paint((q, n) => skin(n, fb + (n[2] < -0.3 ? 0.12 : 0)))
    const upper = bone(A.sh, A.elbow, 8.4, 7.2, j.sh.f, inner, (t, a, q, n) => skin(n, fb + (Math.abs(a) > 2.1 ? 0.14 : 0), 0, (t > 0.42 && t < 0.54 && a < -0.6 && a > -1.5 ? 0.42 : 0) + (t > 0.85 && a > 0.3 ? 0.42 : 0)))
    const bic = sdf.ellipsoid([6.6, 7.6, 6.2]).at(...add(add(A.sh, mul(ud, 15)), mul(j.sh.f, 2))).paint((q, n) => skin(n, fb))
    const cuff = 0.4, fore = bone(A.elbow, add(A.hand, mul(unit(fd), -4.5)), 7.6, 6.2, j.sh.f, inner, (t, a, q, n, L) => t < cuff ? skin(n, fb + (Math.abs(a) > 2 ? 0.14 : 0), 0, t < 0.14 && a > 0.3 ? 0.42 : 0)
      : T("glove", fb + 0.22 + (n[2] < -0.4 ? 0.3 : 0) + (band(t * L, 5, 3.6, 0.55) ? 0.4 : 0), 0, 0, n[2] > 0.3 ? -0.45 : 0))
    const flare = sdf.capsule(add(A.elbow, mul(fd, cuff - 0.02)), add(A.elbow, mul(fd, cuff + 0.1)), 8.6, 8).paint((q, n) => T("glove", fb + 0.22, 0, 0, n[2] > 0.2 ? -0.45 : 0))
    const [curl, palm, bend = 0, swing = 0] = (p.fingers ?? STANCE.fingers)[i], wrist = add(A.hand, mul(unit(fd), -4.5)), cocked = unit(add(unit(fd), [0, 0, 0.22]))
    out[`arm${i}`] = sdf.union(upper, delt, bic, fore, flare, aimed(handOf(fb, curl, i ? -1 : 1).rotate(swing, "z").rotate(bend, "x").rotate(palm, "y"), cocked, wrist), { smooth: 1 })
  })
  return out
}

// ---------------------------------------------------------------- the cleanup, by rules, over each rendered frame
// - fighter.clean's corners and lone speckles on his lines' darks (k S A E N), on each render;
// - over the frame as composed (each pixel's part carried by the stamps), the skin's line where 13.8 puts none:
//   "one mass": where the trunk and an arm meet over the shoulder (the deltoid's top on the trapezius: within 14 px of
//   the joint, no lower than it), the line between them takes the arm's fill beside it; a line between parts stays only
//   at a real depth break (the chest before the far arm, the near arm before the pec and the belly); the outer line
//   stays all round (the user: lost on the lit side it read as the outline gone); the head, drawn by hand, keeps its own
const LINES = "kSAEN", tidy = (c) => fighter.clean(c, LINES)
const mend = (c, j, head) => { const { w, h } = c.img, D = c.img.data, P = c.img.parts
  if (!P) return
  const S = c.color("S"), fill = new Set([..."smzZ"].map((k) => c.color(k)))
  const part = (i) => (P.ids[i] >= 0 ? P.names[P.ids[i]].split(".")[0] : ""), clear = (i) => (D[i] & 255) < 128
  // (the head, drawn by hand, keeps its own: [x0, y0, x1, y1] where it was stamped)
  const own = (i) => { const x = i % w, y = (i - x) / w; return part(i) || !(x >= head[0] && x < head[2] && y >= head[1] && y < head[3]) }
  const sh = j.arms.map((A) => RIG.screen(A.sh)), pass = (rule) => { const set = []
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x, nb = [i - 1, i + 1, i - w, i + w]
      if (D[i] === S && own(i)) { const v = rule(i, x, y, nb); if (v !== undefined) set.push([i, v]) } }
    for (const [i, v] of set) D[i] = v }
  // one mass: over the shoulder, between the trunk's part and an arm's, the arm's fill
  pass((i, x, y, nb) => { const skin = nb.filter((k) => fill.has(D[k]) && part(k))
    if (nb.some(clear) || !sh.some(([sx, sy]) => Math.hypot(x - sx, y - sy) < 14 && y < sy + 2) || new Set(skin.map(part)).size < 2) return
    return D[skin.find((k) => part(k).startsWith("arm")) ?? skin[0]] })
}

// ---------------------------------------------------------------- his body in 3D, in two
// Each sole on the floor; the head drawn by hand, so the body is drawn in two: all of it but the near arm (cleaned),
// then the near arm alone (and his flat blocks, _hf_bk_<move>_s); the head between
const LOOK = { body: BODY, headings: ["s"], pitch: PITCH, w: W, h: H, pivot: PIV, surface: SURFACE,
  moves: Object.fromEntries(Object.entries(MOVES).map(([m, M]) => [m, { frames: M.ms.length, ms: M.ms, pose: M.pose }])) }
const RIG = rig3d("_hf_body", { ...LOOK, parts: (j, p) => { const P = parts(j, p); delete P[nearArm(j)]; return P }, draw: tidy })
rig3d("_hf_arm", { ...LOOK, blocks: "_hf_bk", parts: (j, p) => { const A = nearArm(j); return { [A]: parts(j, p)[A] } }, draw: tidy })

// ---------------------------------------------------------------- his head, drawn by hand near profile
// Turned 20 degrees from profile, on her, as KOF's heavies draw theirs (10-35), so its features read as a profile
// (the study's 13.11, SF6's heavies drawn at his camera): the size of Reva's (18 px crown to chin), 16 px across at the
// eye (theirs 15-17 at that size whatever the turn), the ear 0.63 of the way back (theirs at 20 degrees 0.58-0.66), the
// face upright over the neck (the brow, the nose, the moustache and the beard's front on one line, 6 degrees off the
// vertical). Bald: the dome in its mid tones, a 4 x 3 light on its top front, its back third a step darker and lined.
// The brow a dark bar 2 px tall straight over the eye, a px out of the profile; the eye a lash and a px of light; the
// nose a step out, its underside dark. The beard as a beard sits on a jaw: from the sideburn by the ear down the jaw,
// its top edge falling 45 degrees from the ear to the moustache (Zangief's 41) so the cheek shows over it, the
// moustache under the nose, a px of lower lip under it, the mass under the chin into its braid (two leather ties)
const HEAD = `
  .....SSSSSS......
  ...SSmzZZzzSS....
  ..SmmzZZZZzzzS...
  .SsmmzzZZzzzzzS..
  .SsmmmzzzzzzzzzS.
  SssmmmzzzzzzzzzS.
  SssmmmmzzzzzHHHHk
  SssmmmmmzzzHHHHk.
  SsssmSSmHzzzkkZS.
  SsssSmmSHzzzZzzzS
  SsssSmsSHhzzzzzzz
  .SsssSSHHHhzzzsSS
  .SsssHHhHHHhhhhHk
  .SssskHHHhHHHHzS.
  ..SsskHHHHhHHHHk.
  ..SssskHhHHHhHHk.
  ...SsskHHhHHHhk..
  ....kkkHHHhHHHk..
  ......kHHHHhHk...
  .......kHhHHk....
  .......kcccck....
  ........khHk.....
  ........kHhk.....
  ........kcck.....
  ........khHk.....
  .........kk......`
sprite("_hf_head", { pivot: [8, 8] }, HEAD)
// His head ducked (the block's chin down behind the fists, the prejump and the landing, the jump's tuck: 13.15, the
// heavies duck their heads into their guard), both ways as the notes' rule says, DUCK picking which the moves stamp:
// by hand (""), the same skull turned 15 degrees chin down (the crown 2 px on, the brow and the nose 1-2 down, the chin
// 2 back), the brow a heavier bar over an eye that looks up from under it, the braid hanging straight down from the
// tucked chin onto the chest; turned by pxl ("_t": angle 15, RotSprite) and mended where the turn lost the face's line
// (the nose, the lip) and broke the brow, its braid turned with it
sprite("_hf_head_down", { pivot: [8, 8] }, `
  .....SSSSSS........
  ...SSmmzZZZSS......
  ..SsmmmzZZZzzS.....
  .SssmmmzzZZzzzS....
  .SssmmmzzzzzzzzS...
  SsssmmmzzzzzzzzS...
  SsssmmmmzzzzzzzzS..
  SsssmSSmzzzzHHHHk..
  SsssmmSSHzzHHHHHk..
  SsssSmmSHzzzkkHk...
  SsssSmsSHhzzZzzzS..
  SsssSSHHHhzzzzzzS..
  .SssHHhHHHhzzzsSS..
  .SsskHHHhHhhhhHk...
  .SsskHHHhHHHHzS....
  ..SskHhHHHHHHk.....
  ..kkkHHhHHhHHk.....
  ....kHHhhHHhk......
  ....kHHHhHHk.......
  .....kHhHHk........
  .....kcccck........
  ......khHk.........
  ......kHhk.........
  ......kcck.........
  ......khHk.........
  .......kk..........`)
sprite("_hf_head_down_t", { pivot: [8, 8] }, `
  .....SSSSSS........
  ...SSmmzZZZSS......
  ..SsmmmzZZZzzS.....
  .SssmmmzzZZzzzS....
  .SssmmmzzzzzzzzS...
  .SssmmmzzzzzzzzS...
  SsssmmmmzzzzzzzzS..
  SsssmSSmzzzzHHHHS..
  SsssmmSSHzzHHHHHk..
  SsssSmmSHzzzkkHk...
  SsssSSSHHzzzZzZS...
  SsssHHHHHhzzzzzzS..
  SssskHHHHhhzzzzzS..
  .SsskHHHhHhhhhSS...
  .SsskHHHhHHHHzH....
  ..sskHhHHHHHHS.....
  ..kkkHHhHHhHHk.....
  ....kHHhhHHhk......
  ....kHHHhHHk.......
  ....kHhHHHk........
  ....kkccck.........
  ....khHHk..........
  ....kHHk...........
  ....kcck...........
  ....khHk...........
  .....kk............`)
const DUCK = ""
// no neck: stamped with the jaw on the trapezius and the face ahead of the shoulders, as the heavies' heads sit (13.11:
// the chin 0.36-0.46 heads over the shoulders' joints, the eye 0.5-0.66 heads ahead of them): its middle 4 px ahead of
// the head's joint and 2 up, the chin 7.6 px over the shoulders' joints, the eye 8.5 ahead of the spine
const HEAD_AT = [4, -2]

// ---------------------------------------------------------------- what each frame says to an engine
// hurt boxes round the head, the body (chest, pelvis, elbows: 1.5 of her width, as the heavies' are) and the legs,
// from the joints the body is drawn on; the phase
const boxOf = (pts, m) => fighter.boxOf(pts, m, W, H)
const boxes = (c, p) => { const j = RIG.joints(p, 180), S = (q) => RIG.screen(q)
  c.setBox("hurt", ...boxOf([add(S(j.head), HEAD_AT)], 9))
  c.setBox("hurt", ...boxOf([S(j.chest), S(j.pelvis), ...j.arms.map((A) => S(A.elbow))], 5))
  c.setBox("hurt", ...boxOf([S(j.pelvis), ...j.legs.flatMap((L) => [S(L.knee), S(L.foot)])], 4))
  c.setData({ phase: p.phase, ...(p.air ? { air: true } : {}), ...(p.step ? { step: p.step } : {}) }) }

// ---------------------------------------------------------------- the moves, facing e: the body, the head, the near arm
const ON = { w: W, h: H, pivot: PIV, genre: "fighting", category: "heavy" }
for (const [m, M] of Object.entries(MOVES))
  anim(m, ON, (c) => { const i = c.frame, p = M.pose(i), j = RIG.joints(p, 180), [x, y] = RIG.screen(j.head).map(Math.round)
    c.stamp(`_hf_body_${m}_s`, ...PIV, { frame: i })
    const hx = x + HEAD_AT[0], hy = y + HEAD_AT[1] + Math.round(1.5 * (p.breath ?? 0))
    c.stamp(p.face === "down" ? `_hf_head_down${DUCK}` : "_hf_head", hx, hy)
    c.stamp(`_hf_arm_${m}_s`, ...PIV, { frame: i })
    mend(c, j, [hx - 8, hy - 8, hx + (p.face === "down" ? 11 : 9), hy + 18]); pinholes(c); boxes(c, p) }, ...M.ms.map((ms) => frame({ ms })))
sheet("haldor_fighter", Object.keys(MOVES), { rows: "tag", pad: 2, slots: SLOTS })
card("idle", { is: "Haldor the smith, a heavy grappler 140 px standing (126-130 in his guard), side view in KOF 2002's school, Reva's opponent, in 3D on his rig with his head drawn by hand and his hands modeled (their shape a pose's fingers): bald, a braided black beard, a smith's tan leather apron (a bib on a neck strap, tied at the waist, split, to above his knees) over charcoal trousers bloused over laced work boots, leather gauntlets; a grappler's low, wide guard, the rear foot turned to the camera with its knee, the hands open claws ready to grab (the far palm turned to us, the near hand's back); idle, walk_f, walk_b, crouch, crouch_hold, jump, block, block_low facing e, hurt boxes and frame data (the phase, the air, the motion an engine applies) from his joints", cells: { "side/?": "✓" }, category: "heavy",
  vary: { color: "3 palette slots on the sheet haldor_fighter (base, ash, moss: beard, apron, gauntlets and boots, trousers): haldorFighter.SLOTS", part: "his moves: idle, walk_f, walk_b, crouch, crouch_hold, jump, block, block_low facing e (the game flips him for w), on the sheet haldor_fighter, a row a move; their blocks _hf_bk_<move>_s" } })
Object.assign(haldorFighter, { SLOTS, MOVES, HAND, rig: RIG })
}
