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
// 67 ms, the hit's 200 ms shaken by its steps, then pushed back), and his normals as the heavies strike (13.16: a
// heavy's blow drops his weight into it): jab (the lead hand, 283 ms), strike (a smith's hammer blow with the rear
// fist, 567 ms), and his kicks as the grapplers kick (13.17: the feet and the legs in a kick): kick_l (a boot pushed
// into her shins, 333 ms), kick_h (a push kick with the rear leg, facing her, stepping in, 600 ms), crouch_kick (the
// lead leg shot out straight from his crouch, 317 ms) and jump_kick (the near leg driven out down and ahead, played over
// the jump's arc), each kicking boot flexed with its sole at her, near upright, the heel a touch ahead, and his throw
// as the heavies throw (13.18: the heavies' throws drawn and bound): throw (a smith's handling, 1167 ms: her folded
// over his arm, held at his chest, turned over and slammed on her back ahead of him, each frame binding her thrown
// drawings in reva_fighter.px.js), and his command throw, the Anvil, in three strengths (13.5's and 13.7's numbers):
// anvil_l the Sledge (1533 ms: held upside down behind his head as a sledge is raised, brought down ahead of him onto
// her face), anvil_m the Anvil (1600 ms: pressed over his head on her back like a billet, brought down across his
// thigh as he drops to his rear knee) and anvil_h the Rivet (1650 ms: upside down against his chest, driven head first
// into the floor as he drops to his knees), the three on a frame of their own, taller and wider; she is held between
// his arms (his body and far arm, her, his near arm: a move that holds her has its front layer, <move>_front); and his
// reactions as the heavies take a hit, fall and get up (13.19), with Reva's names: hurt (thrown back from the hips,
// 183 ms), hurt_low (doubled over, 183 ms), crouch_hurt (thrown back in his crouch, 183 ms), knockdown (thrown off his
// feet, landing on his shoulders, a bounce, 900 ms: her flight, the hitter's), down (lying, a breath of 667 ms) and
// get_up (a push from the floor, a knee first, to his guard, 466 ms, untouchable), the three that lie down on a frame of
// their own, wider; facing e, the game flips him for w; the feet on one row through every move but the air and the
// kneeling (lying, his body on it). Each frame's hurt boxes (head, body, legs, the striking limb while it is out; none
// lying) and hit box (round the fist or the boot on the active frames) from his joints and its data { phase, damage,
// hitstun, hitstop and pushback (what the engine does on contact), air, step: the motion an engine applies, the frames
// drawn in place, invuln, bind: where the one thrown is held, in which drawing and in which layer, release, shake }; 3
// palette slots (base, ash, moss: 12 keys swapped) on the sheet haldor_fighter.
// Taken with include("<path>/lib/characters/haldor_fighter.px.js", { as: "haldor_fighter" }): haldor_fighter.idle,
// .walk_f, .walk_b, .crouch, .crouch_hold, .jump, .block, .block_low, .jab, .strike, .kick_l, .kick_h, .crouch_kick, .jump_kick, .throw,
// .anvil_l, .anvil_m, .anvil_h, .hurt, .hurt_low, .crouch_hurt, .knockdown, .down, .get_up and the front layers
// .throw_front, .anvil_l_front, .anvil_m_front, .anvil_h_front;
// haldorFighter.SLOTS a slot's swap (stamp(..., { swap: haldorFighter.SLOTS.ash })); haldorFighter.HAND the hands' shapes.
// What he shares with Reva (the vectors, the lying legs, the toon, the shadows by design, the cleanup, the boxes) is in fighter.px.js;
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
// His normals, as Reva's (the same names, data and boxes), timed and posed as the heavies strike (the study's 13.16:
// the heavies' MUGEN conversions, the low, wide grapplers first, Chang, then Goro, Maxima, Tizoc, Clark, Zangief; their
// sheets and their boxes element by element), drawn for their impact as hers (its section 10): the anticipation held,
// the snap a cut (the heavies draw no smear), the blow past anatomy and held (its first drawing a step farther, then
// settled), the way back slower. A heavy's blow drops his weight into it (13.16: the body's top 0.11-0.22 of his guard
// lower on a heavy punch's blow, the knees giving), and his hands are a grappler's: the guard hand keeps its claw, a
// punching hand closes (HAND.grip). Each frame's `limb` the one that strikes, `out` while it is out (a hurt box of its
// own: a counter-hit), and on the active frames `hit` [damage, hitstun (60 fps frames),
// hitstop (ms), pushback (px)]: his damage 1.5-1.7 times hers (the heavies' 1.4-2), the stun the heavies' (light 10-11,
// heavy 15-17), the pause the profile's (167 light, 200 heavy: the heavies' 10 and 12 ticks, as the women's), the push
// the heavies' (light 32, heavy 64: their 25-37 and 40-77 px, the heavy 1.3 times hers)
const SOFT = [167, 32], HARD = [200, 64], GRIP = [HAND.grip, 60, 0], CLAW = STANCE.fingers
// jab: the lead (far) hand, closing into a fist as it goes, at her face (the heavies' 0.56-0.88 of their guard high,
// the fist 0.58-0.86 ahead of the axis, at a man their size; at his 1.28 times her guard, 0.63-0.76 of his own): a
// light hardly winds up (the fist back 6 px, the body down 1); the shoulders turned on and the trunk leaning in and down
// (the heavies' body 0.23-0.49 ahead, Goro's top 0.86), the fist past the arm's length, settled a step back and held;
// back in three; the near claw at his belly
const JAB = [
  { phase: "startup", turn: -47, twist: 14, lean: 8, down: 11, hands: [[24, 4, 1], [30, -3, -15]], fingers: [[HAND.half, -20, 0, 20], CLAW[1]] },
  { phase: "active", turn: -40, twist: 34, lean: 16, down: 14, hands: [[57, 0, -6], [24, -3, -12]], fingers: [GRIP, CLAW[1]], out: true, hit: [5, 10, ...SOFT] },
  { phase: "active", turn: -41, twist: 32, lean: 15, down: 14, hands: [[53, 0, -6], [24, -3, -12]], fingers: [GRIP, CLAW[1]], out: true, hit: [5, 10, ...SOFT] },
  { phase: "recovery", turn: -42, twist: 30, lean: 13, down: 13, hands: [[44, 2, -3], [26, -3, -13]], fingers: [[HAND.half + 15, 30, 0], CLAW[1]], out: true },
  { phase: "recovery", turn: -44, twist: 25, lean: 9, down: 11, hands: [[34, 3, 2], [30, -3, -15]], fingers: [[HAND.half, -40, 0, 30], CLAW[1]] },
  { phase: "recovery" },
].map((p) => ({ limb: "arm0", ...p }))
// strike: a smith's hammer blow with the rear (near) fist: wound up and back (the heavies' wind-up up a little and
// back), the fist raised behind his head, held; the snap a cut (the heavies' normals unsmeared, and an arm coming over
// in front of him would cover his face: the near arm is drawn over the head); the fist brought down and ahead at
// her chest, past the arm's length, the trunk thrown in 34 degrees on a line from the rear foot to the fist, the knees
// giving (his top 0.17 of his guard lower: Goro's lunge), the front foot slid 6 px and the rear 8 back, its heel up, the
// head ducked, the lead claw pulled in to his chest; settled and held, then back in three, slower
const STRIKE = [
  { phase: "startup", turn: -48, twist: 30, lean: 4, down: 9, rise: 2, hands: [[34, 4, 4], [-4, -6, 2]], fingers: [CLAW[0], [HAND.half, 30, 0]] },
  { phase: "startup", turn: -52, twist: 38, lean: 0, down: 8, rise: 3, hands: [[36, 4, 2], [-8, -4, 28]], fingers: [CLAW[0], GRIP] },
  { phase: "active", turn: -64, twist: -12, lean: 34, down: 22, feet: [[42, 0], [-40, 10]], heel: [0, 8], hands: [[10, 4, -4], [60, -2, -10]], fingers: [[HAND.half, -40, 0, 30], GRIP], out: true, hit: [13, 17, ...HARD], face: "down" },
  { phase: "active", turn: -63, twist: -11, lean: 32, down: 22, feet: [[42, 0], [-40, 10]], heel: [0, 8], hands: [[10, 4, -4], [57, -2, -11]], fingers: [[HAND.half, -40, 0, 30], GRIP], out: true, hit: [13, 17, ...HARD], face: "down" },
  { phase: "recovery", turn: -58, twist: -4, lean: 24, down: 19, feet: [[40, 0], [-37, 10]], heel: [0, 6], hands: [[16, 4, 0], [44, -3, -8]], fingers: [[HAND.half, -40, 0, 30], GRIP], out: true, face: "down" },
  { phase: "recovery", turn: -52, twist: 6, lean: 12, down: 14, heel: [0, 2], hands: [[24, 4, 3], [34, -3, -12]], fingers: [CLAW[0], [HAND.half, 60, -10]] },
  { phase: "recovery" },
].map((p) => ({ limb: "arm1", ...p }))
// kick_l: a boot pushed into her shins with the lead (far) leg, its sole first (the heavies' light kicks low, 0.15-0.6
// of their guard): the weight back, the rear foot slid in under him, the knee up a little, then the leg out in a cut,
// the foot flexed, the trunk back; settled, the knee back, down; the guard kept. The boot as the grapplers draw a sole
// pushed (13.17): flexed to its ankle's 30 degrees, upright with its heel a touch ahead (3 degrees on the screen; 6f4a's
// leaned its toe 7-13 out), turned 4 degrees in (`way` 98: toward us, the far leg's in; 6f4a's 7 out), on a straight
// leg (the ankle 2 px out and 3 up of 6f4a's, so the flex stays in the ankle)
const KICK_L = [
  { phase: "startup", down: 9, lean: 4, feet: [[34, 0], [-24, 10]], lift: [5, 0] },
  { phase: "startup", down: 7, lean: -2, feet: [[30, 0], [-22, 10]], lift: [24, 0], point: [-10, null] },
  { phase: "active", down: 8, lean: -10, feet: [[59.5, 0], [-22, 10]], lift: [25, 0], point: [-30, null], way: [98, 190], out: true, hit: [6, 11, ...SOFT] },
  { phase: "active", down: 8, lean: -9, feet: [[59, 0], [-22, 10]], lift: [24.5, 0], point: [-30, null], way: [98, 190], out: true, hit: [6, 11, ...SOFT] },
  { phase: "recovery", down: 8, lean: -2, feet: [[34, 0], [-22, 10]], lift: [22, 0], point: [-10, null], out: true },
  { phase: "recovery", down: 9, lean: 4, feet: [[36, 0], [-28, 10]], lift: [3, 0] },
  { phase: "recovery" },
].map((p) => ({ limb: "leg0", ...p }))
// kick_h: a push kick with the rear (near) leg, facing her (13.17: the grapplers' heavy kick, ten of the eleven read
// kick facing their man, the hips in profile and the chest open to the camera; only Chang turns his back, as 6f4a did):
// wound down on the lead leg, the rear heel up; stepped in 22 px on the lead foot (Maxima's and Clark's walk in), the
// rear knee rising; the chamber held (6 ticks: the knee at his belly, the boot hanging under it, pointed); the snap a
// cut (the heavies draw no smear); the leg straight and level from the hip at her belly and chest (0.37-0.67 of his
// guard), the boot flexed, upright, its heel a touch ahead (5 degrees on the screen) and turned 5 in, the hips in
// profile, the chest turned back to us 44, the trunk thrown back 22, the near arm back for balance, the lead claw up;
// settled, and held out a drawing more (Chang's 9 ticks), its foot easing; the chamber again, the foot set down behind
// (22 px back), the guard. The standing foot flat and at her through it all (a push kick doesn't turn it)
const KICK_H = [
  { phase: "startup", turn: -40, twist: 24, lean: 10, down: 13, heel: [0, 6], hands: [[30, 4, 3], [28, -3, -17]] },
  { phase: "startup", turn: -62, twist: 34, lean: 4, down: 7, feet: [[14, 0], [12, 6]], lift: [0, 18], point: [null, 15], way: [100, 120], hands: [[32, 4, 4], [16, -4, -16]], step: [22, 0], out: true },
  { phase: "startup", turn: -84, twist: 40, lean: -4, down: 5, feet: [[14, 0], [22, 3]], lift: [0, 38], point: [null, 10], way: [100, 100], hands: [[32, 5, 5], [4, -5, -18]], out: true },
  { phase: "active", turn: -90, twist: 44, lean: -22, down: 4, feet: [[14, 0], [60, 2]], lift: [0, 52], point: [null, -14], way: [100, 80], hands: [[30, 6, 6], [-6, -6, -20]], elbow: [-1, 0.5, -1], out: true, hit: [14, 17, ...HARD] },
  { phase: "active", turn: -89, twist: 43, lean: -21, down: 4, feet: [[14, 0], [58.5, 2]], lift: [0, 51], point: [null, -21], way: [100, 80], hands: [[30, 6, 6], [-5, -6, -20]], elbow: [-1, 0.5, -1], out: true, hit: [14, 17, ...HARD] },
  { phase: "recovery", turn: -88, twist: 42, lean: -18, down: 5, feet: [[14, 0], [55, 2]], lift: [0, 47], point: [null, -22], way: [100, 80], hands: [[30, 6, 6], [-4, -6, -20]], elbow: [-1, 0.5, -1], out: true },
  { phase: "recovery", turn: -84, twist: 40, lean: -4, down: 5, feet: [[14, 0], [22, 3]], lift: [0, 38], point: [null, 10], way: [100, 100], hands: [[32, 5, 5], [4, -5, -18]], out: true },
  { phase: "recovery", turn: -48, twist: 22, lean: 8, down: 11, lift: [0, 4], heel: [0, 4], hands: [[30, 4, 3], [28, -3, -16]], step: [-22, 0] },
  { phase: "recovery" },
].map((p) => ({ limb: "leg1", ...p }))
// crouch_kick: from his crouch, the lead (far) leg drawn in under him, then shot out straight along the floor (13.17:
// the grapplers' crouching kick a straight leg longer than the crouch's, 0.41-0.72 of their guard, the boot flexed with
// its sole upright, the rear leg folded and its foot where it was; the way back the way out): 0.60 of his guard, the
// boot upright, its heel a touch ahead (3-5 degrees), the trunk lifted off the leg 14 degrees and the hips 8 px lower,
// so his head stays at the crouch's; back through the chamber
const CROUCH_KICK = [
  { phase: "startup", ...KNELT, down: 34, lean: 38, feet: [[26, 0], [-36, 10]], lift: [8, 0], point: [10, null], way: [100, 190] },
  { phase: "active", ...KNELT, down: 40, lean: 28, feet: [[62.5, 0], [-36, 10]], lift: [5, 0], point: [-30, null], heel: [0, 10], way: [100, 190], out: true, hit: [5, 10, ...SOFT] },
  { phase: "active", ...KNELT, down: 40, lean: 29, feet: [[62, 0], [-36, 10]], lift: [4, 0], point: [-30, null], heel: [0, 10], way: [100, 190], out: true, hit: [5, 10, ...SOFT] },
  { phase: "recovery", ...KNELT, down: 34, lean: 38, feet: [[26, 0], [-36, 10]], lift: [8, 0], point: [10, null], way: [100, 190], out: true },
  { phase: "recovery", ...KNELT, down: 32, lean: 40, feet: [[38, 0], [-36, 10]] },
  { phase: "recovery", ...KNELT },
].map((p) => ({ limb: "leg0", ...p }))
// jump_kick: the near leg driven out straight, down and ahead, the sole first; the far one tucked under him (13.17: the
// heavies' kick in the air, one leg straight 20-35 degrees down, the other folded, the last drawing held to the floor;
// 6f4a's knee hid under the apron): from the jump's tuck the near knee up, then the leg out ahead (0.54 of his
// guard ahead), the boot upright, the hips in profile, the trunk back 14, held; the knee back, the legs opening for the
// floor (the last drawing held to it); no step of its own (the jump's arc goes on under it)
const JUMP_KICK = [
  { phase: "startup", down: 2, lean: 10, feet: [[12, -3], [-4, 7]], lift: [24, 16], point: [0, 10], way: [100, 140], hands: [[26, 4, 4], [30, -2, -14]] },
  { phase: "startup", turn: -70, twist: 34, down: 2, lean: 2, feet: [[8, -3], [22, 4]], lift: [30, 34], point: [0, 10], way: [100, 100], hands: [[30, 4, 6], [10, -4, -14]] },
  { phase: "active", turn: -84, twist: 40, down: 3, lean: -14, feet: [[10, -3], [55, 2]], lift: [32, 36], point: [0, -30], way: [100, 80], hands: [[32, 5, 8], [-4, -6, -16]], elbow: [-1, 0.5, -1], out: true, hit: [11, 15, 200, 36] },
  { phase: "active", turn: -83, twist: 40, down: 3, lean: -13, feet: [[10, -3], [55, 2]], lift: [32, 35], point: [0, -30], way: [100, 80], hands: [[32, 5, 8], [-3, -6, -16]], elbow: [-1, 0.5, -1], out: true, hit: [11, 15, 200, 36] },
  { phase: "recovery", turn: -70, twist: 34, down: 2, lean: 2, feet: [[8, -3], [22, 4]], lift: [28, 30], point: [0, 10], way: [100, 100], hands: [[30, 4, 6], [10, -4, -14]] },
  { phase: "recovery", down: 0, lean: 5, feet: [[22, -3], [-20, 7]], heel: [4, 4], way: [100, 160], hands: [[27, 6, 6], [31, -2, -12]] },
].map((p) => ({ limb: "leg1", air: AIR, ...p }))
// throw: his normal throw, a smith's handling (the study's 13.18: the heavies grab at tick 0, lift in 2-3 drawings, hang
// at the top, drop in a cut and hold the impact while the screen shakes; 13.7: touching, the slam at about 35 ticks,
// damage 10, the screen 12 ticks): as a smith turns a billet in the fire, he takes her by the waist, bent in to it,
// sinks and pulls her folded over his lead forearm, comes up with her at his chest, turns her over his hands onto her
// back at his shoulders' height and holds her there, then brings her down ahead of him in a cut onto her back, his
// weight dropped into it on bent knees and his trunk thrown after her; he rises. Her pose each frame is `hold` { anim,
// frame of hers, nudge: px from where his hands put her pelvis, facing (-1 toward him), layer }; the bind is reckoned
// from his hands, so it can't drift off his drawing. Held, she is drawn between his arms (`layer` "between", a hold's
// default: his body and far arm, then her, then his near arm), as his hands hold her: the far one on her far side,
// behind her, the near one on her near side, over her (drawn wholly under or over him, one arm or the other crosses
// her: crossed arms). The grab a hit box ahead of him on the first frame; the slam `slam` [damage, the screen's ticks,
// the anim she falls into]
const THROW = [
  { phase: "active", turn: -66, twist: 0, lean: 34, down: 20, feet: [[42, 0], [-30, 10]], heel: [3, 8], hands: [[26, 5, -25], [38, 8, -22]], elbow: [-0.3, 0, -1],
    fingers: [[HAND.half, -50, 0, 20], [HAND.half, 50, -10]], hold: { anim: "thrown_grabbed", frame: 0, nudge: [0, 9] }, grab: 48 },
  { phase: "throw", turn: -48, twist: 14, lean: 14, down: 24, feet: [[40, 0], [-30, 10]], heel: [0, 8], hands: [[26, 4, -25], [34, -6, -26]], fingers: [[HAND.half, -20, 0], [HAND.half, 40, 0]], hold: { anim: "thrown_folded", frame: 0, nudge: [9, -2] } },
  { phase: "throw", turn: -46, twist: 10, lean: 2, down: 10, rise: 2, hands: [[25, 4, -7], [30, -6, -8]], fingers: [[HAND.half, -20, 0], [HAND.half, 40, 0]], hold: { anim: "thrown_folded", frame: 1, nudge: [10, -2] } },
  { phase: "throw", turn: -50, twist: -6, lean: 16, down: 10, hands: [[42, 3, 3], [42, 3, 1]], fingers: [[HAND.half, -60, 0], [HAND.half, 60, 0]], hold: { anim: "thrown_face_up", frame: 0, nudge: [13, 1] } },
  { phase: "throw", turn: -52, twist: -4, lean: 24, down: 18, feet: [[44, 0], [-32, 10]], heel: [0, 8], hands: [[46, 4, -20], [42, -6, -24]], fingers: [[HAND.half, -40, 0], [HAND.half, 40, 0]], hold: { anim: "thrown_face_up", frame: 1, nudge: [0, 4] } },
  { phase: "throw", turn: -64, twist: -16, lean: 48, down: 30, feet: [[48, 0], [-36, 10]], heel: [0, 8], hands: [[38, -13, -37], [33, 0, -41]], fingers: [[HAND.half, -40, 0], [HAND.half, 40, 0]], hold: { anim: "thrown_face_up", frame: 1, nudge: [2, 10] }, slam: [10, 12, { anim: "knockdown", frame: 4 }] },
  { phase: "recovery", turn: -52, twist: 4, lean: 22, down: 20, heel: [0, 8], hands: [[36, 4, -14], [34, -4, -22]] },
  { phase: "recovery", turn: -48, twist: 14, lean: 10, down: 13, hands: [[32, 4, -4], [32, -3, -18]] },
  { phase: "recovery" },
].map((p) => ({ face: p.lean > 20 ? "down" : undefined, ...p }))
// The Anvil, his command throw, in three strengths (13.5 and 13.7: Zangief's 360 in CvS, the light reaching farthest
// and hurting least): anvil_l the Sledge, anvil_m the Anvil, anvil_h the Rivet. The grab one drawing for all three at
// tick 0 (`grab` its reach from his axis: 70, 60, 51 px), not invulnerable, refusing a blocker (the contract's); the
// lift in 2-3 drawings, the top held the longest, the drop a cut, the slam held while the screen shakes 15 ticks,
// the damage on its tick (14, 16, 18), the way back in 4; 92, 96 and 99 ticks
const HALF = [[HAND.half, -50, 0, 20], [HAND.half, 50, -10]], UP = [0.2, 1, 0.4], IN = [-0.3, 0, -1]
const AGRAB = { phase: "active", turn: -64, twist: -4, lean: 32, down: 20, feet: [[44, 0], [-28, 10]], heel: [0, 8], hands: [[35, 4, -26], [46, 8, -22]], elbow: IN, fingers: HALF, hold: { anim: "thrown_grabbed", frame: 0, nudge: [0, 10] } }
// (pulled up to his chest, her feet off the floor; then tipped back over his hands, up past his face)
const ALIFT = { phase: "throw", turn: -60, twist: -10, lean: 8, down: 10, rise: 2, hands: [[35, 7, -10], [44, 11, -6]], elbow: IN, fingers: HALF, hold: { anim: "thrown_grabbed", frame: 1, nudge: [0, 10] } }
const AOVER = { phase: "throw", turn: -58, twist: -12, lean: 8, down: 10, rise: 3, hands: [[38, 10, 5], [48, 14, 9]], elbow: [-1, 0.5, -1], fingers: HALF, hold: { anim: "thrown_face_up", frame: 0, nudge: [-8, 2] } }
const RISE = (p) => [{ phase: "recovery", ...p }, { phase: "recovery", turn: -52, twist: 6, lean: 22, down: 20, heel: [0, 8], hands: [[34, 4, -14], [34, -4, -22]] },
  { phase: "recovery", turn: -48, twist: 14, lean: 10, down: 13, hands: [[32, 4, -4], [32, -3, -18]] }, { phase: "recovery" }]
const ANVIL = {
  // the Sledge: tipped on over his head and held upside down behind it as a sledge is raised, then brought down ahead
  // of him onto her face, and let go lying face down (her down_face)
  anvil_l: [[{ ...AGRAB, grab: 70 }, ALIFT, AOVER,
    { phase: "throw", turn: -58, twist: -12, lean: -6, down: 10, rise: 4, hands: [[-12, 16, 36], [-2, 19, 40]], elbow: UP, fingers: HALF, hold: { anim: "thrown_face_down", frame: 1, nudge: [0, -8], layer: "behind" } },
    { phase: "throw", turn: -62, twist: -14, lean: 30, down: 20, feet: [[46, 0], [-34, 10]], heel: [4, 8], hands: [[42, 8, -5], [48, 12, -1]], fingers: HALF, hold: { anim: "thrown_face_down", frame: 0, nudge: [-12, 7], facing: 1 } },
    { phase: "throw", turn: -64, twist: -14, lean: 42, down: 28, feet: [[48, 0], [-36, 10]], heel: [0, 8], hands: [[33, 2, -39], [35, 6, -35]], fingers: HALF, hold: { anim: "thrown_face_down", frame: 2, nudge: [-5, 9], facing: 1 },
      slam: [14, 15, { anim: "down_face", frame: 0 }] },
    ...RISE({ turn: -60, twist: -10, lean: 36, down: 26, feet: [[48, 0], [-36, 10]], heel: [0, 8], hands: [[36, 4, -24], [34, -4, -30]] })], [4, 5, 6, 20, 3, 18, 8, 10, 10, 8]],
  // the Anvil: pressed over his head on her back like a billet, brought down across his thigh as he drops to his
  // rear knee, the thigh the anvil
  anvil_m: [[{ ...AGRAB, grab: 60 }, ALIFT, AOVER,
    { phase: "throw", turn: -58, twist: -12, lean: -6, down: 10, rise: 4, hands: [[20, 16, 39], [4, 20, 43]], elbow: UP, fingers: HALF, hold: { anim: "thrown_face_up", frame: 1, nudge: [1, -9] } },
    { phase: "throw", turn: -60, twist: -10, lean: 10, down: 30, feet: [[36, 0], [-32, 10]], heel: [0, 8], hands: [[29, 14, 28], [5, 17, 30]], elbow: [0.5, 1, 0], fingers: HALF, hold: { anim: "thrown_face_up", frame: 1, nudge: [7, -10] } },
    { phase: "throw", turn: -50, twist: 4, lean: 4, down: 24, feet: [[34, 0], [-46, 10]], heel: [0, 18], way: [100, 120], hands: [[42, 5, -25], [32, 8, -24]], fingers: HALF, hold: { anim: "thrown_face_up", frame: 1, nudge: [-1, 7] },
      slam: [16, 15, { anim: "knockdown", frame: 3 }] },
    ...RISE({ turn: -50, twist: 4, lean: 16, down: 24, feet: [[36, 0], [-48, 10]], heel: [0, 10], way: [100, 150], hands: [[30, 4, -10], [28, -4, -18]] })], [4, 5, 6, 22, 3, 18, 8, 10, 10, 10]],
  // the Rivet: tipped on over his hands and down against his chest upside down, her back to him, then driven head
  // first into the floor as he drops to his knees, as a rivet is hammered home (no jump, no spin)
  anvil_h: [[{ ...AGRAB, grab: 51 }, ALIFT, AOVER,
    { phase: "throw", turn: -60, twist: -10, lean: -4, down: 10, hands: [[33, 7, -13], [43, 11, -9]], elbow: IN, fingers: HALF, hold: { anim: "thrown_face_down", frame: 1, nudge: [-1, -8] } },
    { phase: "throw", turn: -58, twist: -10, lean: 4, down: 30, feet: [[30, 0], [-30, 10]], heel: [0, 10], hands: [[28, 6, -15], [39, 10, -11]], elbow: IN, fingers: HALF, hold: { anim: "thrown_face_down", frame: 1, nudge: [-1, -8] } },
    { phase: "throw", turn: -58, twist: -10, lean: 6, down: 28, feet: [[-30, 0], [-52, 10]], heel: [18, 18], way: [100, 120], hands: [[23, 3, -37], [34, 6, -34]], elbow: IN, fingers: HALF, hold: { anim: "thrown_face_down", frame: 1, nudge: [-1, -8] },
      slam: [18, 15, { anim: "knockdown", frame: 4 }] },
    ...RISE({ turn: -50, twist: 4, lean: 10, down: 24, feet: [[14, 0], [-24, 10]], heel: [8, 10], hands: [[30, 4, -10], [28, -4, -18]] })], [4, 5, 6, 24, 4, 18, 10, 10, 10, 8]],
}
for (const [P] of Object.values(ANVIL)) P.forEach((p, i) => { if (p.lean > 20) P[i] = { face: "down", ...p } })
// The reactions, as Reva's (the same names, phases and data, so an engine treats the two alike), timed and posed as the
// heavies take a hit, fall and get up (the study's 13.19: the KOF heavies' sheets frame by frame, Goro, Chang and
// Maxima; the hit states 5000-5120 of the heavies' MUGEN conversions and their .cns; 3S's Alex captured; against Reva's
// section 11). A hit is a cut in two drawings, as the heavies draw theirs: the first (held through the hitstop by the
// engine) most of the way, the farthest after it, held to the end of the stun (the heavies' hard hits 9-14 ticks: 3 +
// 8). Hit high a heavy stays tall (his knees give 2 px, the trunk thrown back from the hips, the head back); hit in the
// body he doubles over less than she does (his top 0.08-0.12 of his guard lower, hers 0.22-0.33: his belly in the way);
// his wide base planted. The claws flung open (lying, slack: half closed)
const HURT_T = [3, 8], HITSTUN = 11, OPEN = [[HAND.open + 10, -50, 20], [HAND.open + 10, 40, 0]], REST = [[HAND.claw, -50, 20], [HAND.half, 40, 0]]
// hurt: hit high, thrown back from the hips: the trunk 18 then 25 degrees back from his guard, the head back (the hurt
// head), the lead claw flung up by his head, the near one dropped back
const HURT = [
  { phase: "hurt", turn: -42, twist: 12, lean: -16, down: 13, hands: [[14, 6, 12], [12, -8, -30]], fingers: OPEN, face: "hurt" },
  { phase: "hurt", turn: -41, twist: 8, lean: -24, down: 14, hands: [[8, 6, 16], [6, -8, -34]], fingers: OPEN, face: "hurt" },
]
// hurt_low: hit in the body, doubled over: the trunk folded over his hips, the pelvis down and back, the claws pulled in
// to his belly, the head down (the low head)
const HURT_LOW = [
  { phase: "hurt", turn: -46, twist: 14, lean: 42, down: 16, heel: [0, 4], hands: [[14, 4, -26], [16, -6, -32]], elbow: [-1, 0.5, 0], fingers: OPEN, face: "low" },
  { phase: "hurt", turn: -45, twist: 12, lean: 50, down: 19, heel: [0, 5], hands: [[10, 4, -30], [12, -6, -34]], elbow: [-1, 0.5, 0], fingers: OPEN, face: "low" },
]
// crouch_hurt: hit in his crouch, thrown back from the hips as his standing hurt is, the feet kept
const CROUCH_HURT = [
  { lean: 22, down: 31, hands: [[20, 6, 0], [16, -8, -26]] },
  { lean: 12, down: 31, hands: [[14, 6, 6], [10, -8, -30]] },
].map((p) => ({ phase: "hurt", ...KNELT, turn: -42, twist: 12, elbow: STANCE.elbow, fingers: OPEN, face: "hurt", ...p }))
// knockdown: thrown off his feet by a heavy blow. The flight is the hitter's (13.19: the conversions fly a heavy by the
// blow's own velocity and gravity, as far as a woman), so its drawings' timing and its steps are Reva's: the hit
// drawing on his feet, thrown back; a plank tipped back over the hips, the legs trailing, rising and turning flat; he
// lands on his shoulders and upper back with his legs up, as Goro, Alex and Honda land, bounces once and settles on his
// back, his hips turned nearly to profile as the heavies lie (Goro 0.26 of his guard high and 1.2 long). Each frame's
// `roll` turns the whole of him; `step` carries him as hers does (back 4 px a tick in the air, 30 px up at the top, the
// floor's hit freezing him, the bounce at 3/4 of the speed and 12 px up, then sliding to a stop, 0.85 a tick). Lying,
// his legs from his hips (fighter.lie: his hips 6.6 px from the pelvis, his legs 50 px under a pelvis lowered to lie)
const FLY = 4, ARC = 30, BOUNCE = 12, LIE = -88, lie = (o) => fighter.lie({ hips: 6.6, turn: LIE, lift: -50, ...o })
const KNOCKDOWN = [
  { turn: -42, lean: -24, down: 12, hands: [[18, 6, 12], [10, -8, -32]], face: "back" },
  { air: AIR, roll: 30, turn: -50, lean: -14, down: 10, feet: [[10, 0], [-10, 10]], lift: [-5, -5], point: [20, 20], hands: [[30, 4, 4], [16, -8, -28]], face: "back" },
  { air: AIR, roll: 58, turn: -60, lean: -12, down: 16, feet: [[16, 0], [-2, 10]], lift: [-4, -9], point: [20, 25], hands: [[24, 4, 20], [20, -8, -26]], face: "flat" },
  { air: AIR, roll: 84, turn: -70, lean: -10, down: 26, feet: [[20, 0], [18, 10]], lift: [-7, -7], point: [30, 30], hands: [[16, 4, 26], [22, -6, -26]], face: "flat" },
  { roll: 108, turn: LIE, lean: 4, down: 38, feet: [[18, 0], [16, 10]], lift: [-16, -16], point: [30, 30], hands: [[14, 4, 14], [16, -4, -30]], elbow: [0.4, 0, -1], face: "flat", lying: true },
  { air: AIR, roll: 86, turn: LIE, lean: -6, down: 46, ...lie({ lift: -36, back: -5, out: 3, point: 25 }), hands: [[10, 4, 20], [16, -4, -28]], elbow: [0.4, 0, -1], face: "flat", lying: true },
  { air: AIR, roll: 90, turn: LIE, lean: -4, down: 49, ...lie({ lift: -44, back: -1, out: 1, point: 20 }), hands: [[6, 4, 10], [14, -4, -30]], elbow: [0.4, 0, -1], face: "flat", lying: true },
  { roll: 90, turn: LIE, twist: 0, lean: -2, down: 53, ...lie({ lift: -48, back: 2 }), hands: [[-16, 8, -38], [19.3, 13.9, -32]], elbow: [-0.2, 1, -0.3], face: "flat", lying: true },
  { roll: 90, turn: LIE, twist: 0, lean: 0, down: 52, ...lie({}), hands: [[-19.5, 7.5, -40], [17.7, 14, -34]], elbow: [-0.2, 1, -0.3], face: "flat", lying: true },
].map((p) => ({ phase: "fall", twist: 10, fingers: p.lying ? REST : OPEN, ...p }))
const KT = [4, 4, 8, 10, 4, 7, 8, 3, 6]
// (his height off the floor at each air frame's middle: the flight's arc, then the bounce's; x as the speed falls)
const KY = KT.map((t, k) => { const at = (a, b, top) => { const t0 = KT.slice(a, k).reduce((s, u) => s + u, 0) + t / 2, T = KT.slice(a, b + 1).reduce((s, u) => s + u, 0); return Math.round((4 * top * t0 * (T - t0)) / T ** 2) }
  return k >= 1 && k <= 3 ? at(1, 3, ARC) : k === 5 || k === 6 ? at(5, 6, BOUNCE) : 0 })
const KX = KT.map((t, k) => (k === 0 || k === 4 ? 0 : k <= 3 ? FLY * t : k <= 6 ? 0.75 * FLY * t : 0.75 * FLY * 0.85 ** (k === 7 ? 0 : KT[7]) * (1 - 0.85 ** t) / 0.15))
const knockdown = (i) => posed({ ...KNOCKDOWN[i], step: [-Math.round(KX[i]), i ? KY[i - 1] - KY[i] : 0] })
// down: lying on his back, held: a breath, his chest a px up and down (the heavies lie 25-60 ticks: KOF's Chang 40)
const DOWN = KNOCKDOWN[8], BREATHE = [0, 1, 1.5, 0.5]
const down = (i) => posed({ ...DOWN, phase: "down", lean: DOWN.lean + BREATHE[i] })
// get_up: from his back to his guard, as the heavies get up (13.19: a push from the floor, a knee first, Goro's and
// Maxima's; none kips up or rolls back): up on his near forearm, sat up on his near hand with the lead knee up, over onto
// his rear knee with the near hand pushing on the floor, the push off his lead knee, risen, his guard; the head up and
// at her from the first drawing (the ducked head, its chin on his chest where his neck, nodded, puts it: rig3d's
// `nod` its drawn 15 degrees), the push held and the rise quick; untouchable throughout (MUGEN's get-up, 16-29 ticks)
const NOD = 15
const GET_UP = [
  { roll: 66, turn: LIE, lean: 6, down: 48, feet: [[10.5, 10], [11.8, 10]], lift: [-34.7, -44], point: [0, 0], hands: [[-6, 8, -40], [-17.2, 20.6, -35.6]], elbow: [-1, 0, -0.5], nod: NOD, face: "down" },
  { roll: 44, turn: -60, lean: 8, down: 45, feet: [[16.2, 10], [23.4, 6]], lift: [-21.1, -28], point: [0, 0], hands: [[4, 8, -40], [-19.1, 19.5, -38.9]], elbow: [-1, 0, -0.5], nod: NOD, face: "down" },
  { lean: 44, down: 33, twist: 24, feet: [[34, 0], [-30, 15]], heel: [0, 16], way: [100, 160], hands: [[22, 6, -24], [26, 2, -47]], elbow: [-1, 0.5, 0], nod: NOD, face: "down" },
  { lean: 36, down: 30, twist: 24, feet: [[38, 0], [-34, 10]], heel: [0, 10], hands: [[26, 4, -18], [28, -4, -26]], face: "down" },
  { lean: 16, down: 20, heel: [0, 7], hands: [[25, 4, -6], [28, -2, -23]], face: "down" },
  { breath: 0, rise: 0, down: STANCE.down, hands: STANCE.hands.map(([e, a, u]) => [e + 1.5 * BREATH[6], a, u + 3 * BREATH[6]]), fingers: STANCE.fingers.map(([c, ...turns]) => [c + 12 * BREATH[6], ...turns]) },
].map((p) => ({ phase: "getup", invuln: true, ...p }))
const GT = [5, 5, 6, 5, 3, 4]
const REACTIONS = { hurt: [HURT, HURT_T], hurt_low: [HURT_LOW, HURT_T], crouch_hurt: [CROUCH_HURT, HURT_T] }
const NORMALS = { jab: [JAB, [4, 2, 2, 2, 3, 4]], strike: [STRIKE, [3, 7, 3, 4, 5, 6, 6]], kick_l: [KICK_L, [3, 2, 2, 3, 3, 3, 4]], kick_h: [KICK_H, [3, 4, 6, 3, 2, 6, 5, 4, 3]],
  crouch_kick: [CROUCH_KICK, [4, 3, 2, 4, 3, 3]], jump_kick: [JUMP_KICK, [3, 4, 5, 5, 4, 5]], throw: [THROW, [4, 8, 14, 5, 3, 12, 8, 10, 6]], ...ANVIL }
const MOVES = { idle: { pose: idle, ms: BREATH.map(() => 150) },
  walk_f: { pose: walk(false), ms: Array(8).fill(MS(WALK.ticks[0])) }, walk_b: { pose: walk(true), ms: Array(8).fill(MS(WALK.ticks[1])) },
  crouch: { pose: crouch, ms: [2, 2, 3].map(MS) }, crouch_hold: { pose: crouchHold, ms: BREATH.map(() => 150) },
  jump: { pose: jump, ms: JT.map(MS) }, block: { pose: block, ms: [4, 6, 3, 3, 3, 3, 3, 3, 6].map(MS) }, block_low: { pose: blockLow, ms: [4, 6, 3, 3, 3, 3, 3, 3, 6].map(MS) },
  ...Object.fromEntries(Object.entries(NORMALS).map(([m, [P, t]]) => [m, { pose: (i) => posed(P[i]), ms: t.map(MS) }])),
  ...Object.fromEntries(Object.entries(REACTIONS).map(([m, [P, t]]) => [m, { pose: (i) => posed(P[i]), ms: t.map(MS) }])),
  knockdown: { pose: knockdown, ms: KT.map(MS) }, down: { pose: down, ms: BREATHE.map(() => MS(10)) }, get_up: { pose: (i) => posed(GET_UP[i]), ms: GT.map(MS) } }
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
// (the parts are built on his joints upright and turned after by the pose's roll: what faces up as drawn, the camera and
// the light (fighter's), in that upright frame: falling and lying, his top lit and his underside dark as drawn)
const skyOf = (roll = 0) => { const s = Math.sin(roll * RAD), c = Math.cos(roll * RAD), L = fighter.LIGHT
  return { up: [s, 0, c], cam: [0.17 * s, -0.98, 0.17 * c], light: roll ? [L[0] * c + L[2] * s, L[1], -L[0] * s + L[2] * c] : L } }
// (each mass of skin lit on its top and in shadow under it, as the heavies' muscle is painted: what faces down a step darker)
const U = (n, w) => (dot(n, w.up) < -0.15 ? 0.22 : 0)
// bare skin as the heavies' is painted (13.8, 13.14): its cuts a step up, so a plane facing ahead falls in the shadow,
// the widest share; the light only where a form turns up to it (z), a small shine at its crown (Z), inside its edge (where
// the form still faces the camera: the edge stays a line by material, 13.8); `bias`, `cast` and `deep` as T's
const skin = (n, w, bias = 0, cast = 0, deep = 0) => { const u = dot(n, w.up); return T("skin", 0.2 + U(n, w) + bias, cast, deep, u > 0.78 && dot(n, w.cam) > 0.3 ? -0.4 : u > 0.4 ? -0.12 : 0) }
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
  const w = skyOf(p.roll), upw = (n) => dot(n, w.up), shadowed = (q, B, r) => fighter.shadowed(q, B, r, w.light)
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
    return skin(n, w, (ac > 2.4 ? 0.18 : 0) + (ac > 0.95 && ac < 2.1 ? -0.1 : 0), 0.4 * shadowed(q, armB.flat()), (under ? 0.5 : 0) + 0.45 * nearOf(q, pits, 2)) })
  // the trapezius (13.9: the heavies' rises half-way out to their chin, 10-13 px over the shoulders' joints, the neck
  // hidden in it): a wedge from round the head's foot out to each shoulder, swelling 1 px with the breath; lit on its
  // top, the back of it in shadow; one mass with the trunk (one part: no line between them)
  const neck = add(j.chest, [0, 0, 7]), back = mul(j.sh.f, -2)
  const trapF = sdf.union(sdf.ellipsoid([8, 7, 8 + b]).at(...add(neck, add(back, [0, 0, -1]))), ...j.arms.map((A) => sdf.capsule(add(neck, back), add(A.sh, [0, 0, 3.5]), 6.4 + 0.6 * b, 5.6)), { smooth: 2.5 })
  const traps = trapF.paint((q, n) => skin(n, w, 0.1, 0.4 * shadowed(q, armB.flat())))
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
  // (over its top and under its foot it ends on a plane; round the trunk, at its width: the angle test in both, or a
  // shell round the whole trunk just over the top plane shows behind a shoulder)
  const bibF = sdf.field((x, y, z) => { const q = [x, y, z], d = Math.abs(torsoF.dist(q) - 1.2) - 0.7, cap = Math.max(waist - 2 - z, z - bibZ)
    const [h, a] = trunk.at(q), off = Math.abs(ahead(h, a)) > lerp(BIB.half, h) ? 0.3 : -Infinity
    return cap > 0 ? Math.max(d, cap, off) : Math.max(d, off) }, box(waist - 3), box(bibZ + 1, 1))
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
    return T(q[2] < waist ? "skirt" : "apron", far + edge + turn + (gathered ? 0.4 : 0) + (scorch ? 0.3 : 0), shade, 0, q[2] > bibZ - 1.6 && upw(n) > -0.2 ? -0.32 : 0) })
  const cam = Math.atan2(-j.r[1], -j.f[1]) > 0 ? 1 : -1, strapPaint = (q, n) => T("apron", 0.1, 0.4 * shadowed(q, armB.flat()), 0, upw(n) > 0.4 ? -0.3 : 0)
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
    const roll = aimed(sdf.ellipsoid([9.9, 2.8, 9.9]), up, at(SHAFT - 0.5)).paint((q, n) => T("tr", lb + U(n, w), sh(q), 0, upw(n) > 0.45 ? -0.3 : 0))
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
    // (a free foot, its `point` given (a kick's, the walk's swinging one, the jump's): rolled round its sole's line to
    // the rig's own frame, its sole where the rig puts it; aimed() keeps a foot's side level, which turns a foot pointed
    // up or down as much as 145 degrees off it, the sole to the side or up (13.17))
    const lv = [f[1], -f[0], 0], own = L.point !== undefined
    const side = lvl ? lv : unit(own ? cross(f, sub(L.ankle, L.ball)) : lv), fu = lvl ? null : cross(side, f), o = lvl ? [L.ankle[0], L.ankle[1], L.ball[2]] : sub(L.ankle, mul(fu, BODY.ankle))
    const roll = own ? Math.atan2(dot(unit(lv), fu), dot(cross(unit(lv), f), fu)) / RAD : 0
    const ahead = (q) => dot(sub(q, o), f), upOf = (v) => (lvl ? v[2] : dot(v, fu))
    const shaft = sdf.capsule(at(0), at(SHAFT), 6.2, 8.4).paint((q, n) => { const z = dot(sub(q, L.ankle), up), w = unit(sub(q, at(z)))
      return T("boot", fb + (dot(w, f) > 0.72 ? (band(z, 2.6, 1.3, 0.55) ? -0.45 : 0.2) : 0), 0, 0, upw(n) > 0.5 ? -0.3 : 0) })
    const boot = sdf.union(sdf.ellipsoid([5.4, 4.6, 5]).at(0, -2.4, 4.6), sdf.capsule([0, -1.5, 6.5], [0, 10, 3.2], 6, 5.2), sdf.ellipsoid([7, 6.8, 4.4]).at(0, 12.8, 3.8), sdf.box([13.6, 18, 3.2], { round: 1.6 }).at(0, 2.2, 0), { smooth: 1.6 })
      .intersect(sdf.plane([0, 0, -1], 0))
    const foot = aimed(own ? boot.rotate(roll, "y") : boot, f, o).paint((q, n) => { const h = lvl ? q[2] - o[2] : upOf(sub(q, o)), y = ahead(q), lace = upOf(n) > 0.4 && y > -1 && y < 7 && Math.abs(dot(sub(q, o), side)) < 2.2
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
    const delt = sdf.ellipsoid([10, 10, 9.4]).at(...add(add(A.sh, mul(ud, 2.6)), add(mul(out_, 2.4), [0, 0, 1.6]))).paint((q, n) => skin(n, w, fb + (upw(n) < -0.3 ? 0.12 : 0)))
    const upper = bone(A.sh, A.elbow, 8.4, 7.2, j.sh.f, inner, (t, a, q, n) => skin(n, w, fb + (Math.abs(a) > 2.1 ? 0.14 : 0), 0, (t > 0.42 && t < 0.54 && a < -0.6 && a > -1.5 ? 0.42 : 0) + (t > 0.85 && a > 0.3 ? 0.42 : 0)))
    const bic = sdf.ellipsoid([6.6, 7.6, 6.2]).at(...add(add(A.sh, mul(ud, 15)), mul(j.sh.f, 2))).paint((q, n) => skin(n, w, fb))
    const cuff = 0.4, fore = bone(A.elbow, add(A.hand, mul(unit(fd), -4.5)), 7.6, 6.2, j.sh.f, inner, (t, a, q, n, L) => t < cuff ? skin(n, w, fb + (Math.abs(a) > 2 ? 0.14 : 0), 0, t < 0.14 && a > 0.3 ? 0.42 : 0)
      : T("glove", fb + 0.22 + (upw(n) < -0.4 ? 0.3 : 0) + (band(t * L, 5, 3.6, 0.55) ? 0.4 : 0), 0, 0, upw(n) > 0.3 ? -0.45 : 0))
    const flare = sdf.capsule(add(A.elbow, mul(fd, cuff - 0.02)), add(A.elbow, mul(fd, cuff + 0.1)), 8.6, 8).paint((q, n) => T("glove", fb + 0.22, 0, 0, upw(n) > 0.2 ? -0.45 : 0))
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
const mend = (c, j, head, rig) => { const { w, h } = c.img, D = c.img.data, P = c.img.parts
  if (!P) return
  const S = c.color("S"), fill = new Set([..."smzZ"].map((k) => c.color(k)))
  const part = (i) => (P.ids[i] >= 0 ? P.names[P.ids[i]].split(".")[0] : ""), clear = (i) => (D[i] & 255) < 128
  // (the head, drawn by hand, keeps its own: [x0, y0, x1, y1] where it was stamped)
  const own = (i) => { const x = i % w, y = (i - x) / w; return part(i) || !(x >= head[0] && x < head[2] && y >= head[1] && y < head[3]) }
  const sh = j.arms.map((A) => rig.screen(A.sh)), pass = (rule) => { const set = []
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
// then the near arm alone (and his flat blocks, _hf_bk_<move>_s); the head between. The moves `list` on a w x h frame
// at `pivot`: { rig, body, arm, w, h, pivot }
const LOOK = { body: BODY, headings: ["s"], pitch: PITCH, surface: SURFACE }
const rigs = (body, arm, list, w, h, pivot) => { const L = { ...LOOK, w, h, pivot, moves: Object.fromEntries(list.map((m) => [m, { frames: MOVES[m].ms.length, ms: MOVES[m].ms, pose: MOVES[m].pose }])) }
  const rig = rig3d(body, { ...L, parts: (j, p) => { const P = parts(j, p); delete P[nearArm(j)]; return P }, draw: tidy })
  rig3d(arm, { ...L, blocks: "_hf_bk", parts: (j, p) => { const A = nearArm(j); return { [A]: parts(j, p)[A] } }, draw: tidy })
  return { rig, body, arm, w, h, pivot } }
// (the Anvils hold her over his head and bring her down far ahead of him: on a frame of their own, taller and wider,
// his pivot as far from its foot)
// (lying, he is as long as he stands: the moves that fall, lie and get up on a frame of their own, wider, his pelvis
// over its middle)
const ANVILS = Object.keys(MOVES).filter((m) => m.startsWith("anvil_")), FALLS = ["knockdown", "down", "get_up"]
const CUT = rigs("_hf_body", "_hf_arm", Object.keys(MOVES).filter((m) => !ANVILS.includes(m) && !FALLS.includes(m)), W, H, PIV), TALL = rigs("_hf_tall", "_hf_tall_arm", ANVILS, 180, 190, [60, 186])
const FALL = rigs("_hf_fall", "_hf_fall_arm", FALLS, 180, 150, [92, 146])
const cutOf = (m) => (ANVILS.includes(m) ? TALL : FALLS.includes(m) ? FALL : CUT), RIG = CUT.rig

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
// His heads at the reactions' angles, both ways as the notes' rule says, FELL picking which the moves stamp: hurt (25
// degrees back, the hurt face: the brow knit down over the eye shut, the mouth open in the beard; hit high, the hit in
// his crouch), low (40 down, doubled over), back (45 back, thrown) and flat (90 back, lying face up); each drawn by hand
// on the turn's geometry ("": the skull lit from above again, its light on its highest, the features slid over it,
// the brow a bar over the shut eye, the beard's top edge falling from the ear to the moustache, the braid hanging
// straight down with gravity, fallen to the floor lying) and turned by pxl from his hurt face upright ("_t": angle,
// RotSprite) and mended (the braid hung down again, the lines the turn broke). The get-up's head is the ducked one
// above, at its drawn angle on his neck nodded (`nod`)
sprite("_hf_head_hurt", { pivot: [8, 8] }, `
  .....SSSSSS........
  ...SSmzZZZzSS......
  ..SmmzZZZZzzzS.....
  .SsmmzzZZzzzzHk....
  .SsmmmzzzzzHHHHk...
  SssmmmmzzzzzzHHk...
  SssmmmmzzzzkkkzzS..
  SssmmmmmzzzzzzzzzS.
  SsssmmmmmzzzzzzzsSS
  SsssmSSmHzzzzzzzhHk
  SsssSmmSHHzzzzHHkkk
  .SsssSmSHHHhhHHkkkk
  .SsssSSHhHhhHHHHksk
  ..SsssHHHHHhHHHHHHk
  ...SsskHHHhHHHHhHk.
  ....SsskHHHHhHHHk..
  .....SskkHHhHHHk...
  .......kkkHHHHk....
  ..........kcccck...
  ...........khHk....
  ...........kHhk....
  ...........kcck....
  ...........khHk....
  ............kk.....`)
sprite("_hf_head_hurt_t", { pivot: [8, 8] }, `
  .....SSSSS........
  ...SSSzzzzzSS.....
  ..SSZZZzzzzzzS....
  .SmzZZZzzzzHHHk...
  SSmzZZzzzzHHHHk...
  SmmmzzzzzzHHHkkS..
  Smmmmzzzzzzzkkzzz.
  SsmmmmmzzzzzzzzzS.
  SsmmmmmmHzzzzzzsSk
  SssmmSSmHzzzzzzhH.
  SsssmSmmSHHhhhhkkk
  SssssSmSSHHHHHkkkk
  .SssssSSHhHhhHksSk
  .SSssssHHHHHhHHhhk
  ...SssskHHHhHHHHHk
  ...SSssskkHhhhhHH.
  ....SSssskHHHHhhk.
  ......SsskkHHHHHk.
  ........kkkkcccck.
  ............khHk..
  ............kHhk..
  ............kcck..
  ............khHk..
  .............kk...`)
sprite("_hf_head_low", { pivot: [9, 9] }, `
  .........SSSSS.....
  .......SSmzZZZSS...
  ......SmmzZZZZzzS..
  .....SsmmzZZZzzzzS.
  ....SssmmzzzzzzzzS.
  ...SsssmmmzzzzzzzzS
  ...SsssmmmzzzzzzzzS
  ..SsssmSSmzzzzzzzzS
  ..SsssSmmSHzzzzzzzS
  ..SsssSmsSHzzzHHHHk
  ..SsssSSHHHzzzzHHHk
  ..SsskHHhHHzzzzkkkk
  ..SsskHHHHhzzzzzzS.
  ..kkkHHHhHHhzzzzsS.
  ..kHHHhHHhHHhzzSS..
  ..kHHhHHHhHhkksS...
  ..kHHHhHHhHhkkk....
  ..kHhHHhHHkk.......
  ...kkHhHHk.........
  ...kcccck..........
  ....khHk...........
  ....kHhk...........
  ....kcck...........
  ....khHk...........
  .....kk............`)
sprite("_hf_head_low_t", { pivot: [9, 9] }, `
  ........SSSSSS.....
  ......SSssmmmzS....
  .....SsssmmmzZZS...
  ....SsssmmmzzZZZS..
  ....SsssmmmzzZZZzS.
  ...SsssmmmmzzzzzzzS
  ...SsssSSmmzzzzzzzS
  ..SsssSSmSmzzzzzzzS
  ..SsssSmmmHzzzzzzzS
  ..SsssSSSSHzzzHHHzS
  ..ssskHHHHzzzzzHHzS
  ..sskHHhHHhzzzkHHH.
  ..sskHHHHHhzzzzkkkk
  ..kkkHHHhHhzzzzzS..
  ..kkHHhHhHHhzzzzS..
  ...kHHhHHHkkhhSz...
  ..kHHHhHHhkkkHk....
  ..kHhHhHHhskk......
  ..kkHhHHkkk........
  ..kcccck...........
  ...khHk............
  ...kHhk............
  ...kcck............
  ...khHk............
  ....kk.............`)
sprite("_hf_head_back", { pivot: [9, 8] }, `
  ......SSSSS..........
  ....SSmzZZZSS........
  ...SmmzZZZZzzS.......
  ..SsmmzZZZzzzHk......
  .SsmmmzzzzzHHHk......
  .SsmmmmzzzzzzHHk.....
  SssmmmmzzzzkkkzzS....
  SssmmmmmzzzzzzzzsS...
  SsssmmmmmzzzzzzzzSS..
  SsssmSSmHHzzzzzhHHk..
  SsssSmmSHHHzzzHHkkk..
  .SsssSmSHHhhHHHkkkk..
  .SsssSSHhHHHHhHHksk..
  ..SsssHHHhHHHHHHHHk..
  ...SssskHHHhHHHhHHk..
  ....SsssHHHHhHHHHk...
  .....SSskkHHhHHHk....
  .......SkkkHHHkk.....
  ...........kcccck....
  ............khHk.....
  ............kHhk.....
  ............kcck.....
  ............khHk.....
  .............kk......`)
sprite("_hf_head_back_t", { pivot: [9, 8] }, `
  .......SSSS..........
  ....SSSzzzzSSk.......
  ...SSzzzzzzHHk.......
  ..SSZZzzzzHHHkSS.....
  .SSZZZzzzHHHkkzzz....
  .SzZZZzzzzzzkzzzSk...
  .SmzzzzzzzzzzzzsHS...
  Smmmzzzzzzzzzzzhkkk..
  SmmmmmmmHHzzzzhHkkk..
  SsmmmmmmSHHHhhHHksSk.
  .SsmmmmSSSHHHHHHhhhk.
  .SsssmSSmSHHHhhHHHHk.
  .SSssssSSSHHHHHHHHHk.
  ..SSsssssHHHHHhhhhhHk
  ...SSssssskkHHHHHHHk.
  ....SSSssssskkHHHHk..
  .......Ssssskkkkkkk..
  .........SSskk.kcccck
  ...............khHk..
  ...............kHhk..
  ...............kcck..
  ...............khHk..
  ................kk...`)
sprite("_hf_head_flat", { pivot: [8, 9] }, `
  .......kk.SSSk............
  ....SSkHHkSzzSk...........
  ...SzzkHHkzzzzSkk.........
  ..SzzzkkkzzzzssHHk........
  .SzzzzzzzzzzzSkHHHkk......
  .SzzzzzzzzzzhHHHHHhHk.....
  SzzZzzzzzzzhHHhHHhHHHk....
  SzZZZzzzzzhHHHhHHhHHHhk...
  SzZZZzzzHHHHHhHHHhHHHkck..
  SzzZzzmmSSHhHHHHHHHHk.khk.
  SmzzzmmSmsSHHHHkkkkk..kHk.
  SmmzmmmSmmSHkkk........kck
  .SmmmmmmSSsssssk.......khk
  .SmmmmmmsssssssS........kk
  ..SsssssssssssS...........
  ...SSssssssSSS............
  .....SSSSSS...............`)
sprite("_hf_head_flat_t", { pivot: [8, 9] }, `
  ......k..SzSk.............
  ....SSHkSzzSHSkk..........
  ...SzzHHkzzshkkSkk........
  ..SzzHHHkzzzhkkshHk.......
  .SzzzHHzkzzzhHkhHHHk......
  .SzzzzHzzzzzhHHHHHhHk.....
  SzzzzzzzzzzhHHhHHhHHckk...
  SzZzzzzzzzhHHhHHhHHhkcck..
  SZZZzzzzHHHHHHHhHHHHk.kHk.
  SZZZzzzmmSSHhHHHHHHkk.khHk
  SzZzzzmmSmsSHHHkkkk....kck
  SmzzmmmmSmmSHkkssk.....kHk
  .SmmmmmmmSSssssssk......kk
  .SmmmmmmssssssssS.........
  ..SsssssssssssSS..........
  ...SSssssssSSS............
  .....SSSSSS...............`)
const FELL = ""
// no neck: stamped with the jaw on the trapezius and the face ahead of the shoulders, as the heavies' heads sit (13.11:
// the chin 0.36-0.46 heads over the shoulders' joints, the eye 0.5-0.66 heads ahead of them): its middle 4 px ahead of
// the head's joint and 2 up, the chin 7.6 px over the shoulders' joints, the eye 8.5 ahead of the spine
const HEAD_AT = [4, -2]
// (each reaction head's own: its pivot's px from the head's joint, as it sits on his neck at its angle)
const FELL_AT = { hurt: [2, -2], low: [6, 0], back: [0, -3], flat: [-3, -2] }
const headOf = (face) => (face === "down" ? `_hf_head_down${DUCK}` : face in FELL_AT ? `_hf_head_${face}${FELL}` : "_hf_head")

// ---------------------------------------------------------------- what each frame says to an engine
// hurt boxes round the head, the body (chest, pelvis, elbows: 1.5 of her width, as the heavies' are) and the legs,
// from the joints the body is drawn on; the phase
// A normal's (as Reva's): the striking limb (`limb` arm0, arm1, leg0 or leg1) while it is `out` a hurt box of its own,
// an arm from its elbow to its fist, a leg from its knee to its foot (the legs' box then the other's); the hit box on
// the active frames round the fist or the boot; their margins his (the fist and the boot 1.5 times hers)
const boxes = (c, p, K = CUT) => { const j = K.rig.joints(p, 180), S = (q) => K.rig.screen(q), boxOf = (pts, m) => fighter.boxOf(pts, m, K.w, K.h), k = p.limb ? +p.limb.slice(3) : -1, leg = /^leg/.test(p.limb ?? ""), L = j.legs[k], A = j.arms[k]
  // (lying, none: the conversions keep one only for the attacks that hit a fighter on the floor)
  if (!p.lying) c.setBox("hurt", ...boxOf([add(S(j.head), FELL_AT[p.face] ?? HEAD_AT)], 9))
  if (!p.lying) c.setBox("hurt", ...boxOf([S(j.chest), S(j.pelvis), ...j.arms.map((A) => S(A.elbow))], 5))
  if (!p.lying) c.setBox("hurt", ...boxOf([S(j.pelvis), ...j.legs.filter((_, i) => !(p.out && leg && i === k)).flatMap((L) => [S(L.knee), S(L.foot)])], 4))
  if (p.out) c.setBox("hurt", ...(leg ? boxOf([S(L.knee), S(L.ankle), S(L.toe), S(L.heel)], 6) : boxOf([S(A.elbow), S(A.hand)], 6)))
  if (p.hit) c.setBox("hit", ...(leg ? boxOf([S(L.ankle), S(L.toe), S(L.heel)], 6) : boxOf([S(A.hand)], 8)))
  // (a throw's: the grab round both hands; where she is held, her pelvis at his hands' middle nudged by the pose; the slam)
  const hands = j.arms.map((A) => S(A.hand)), h = p.hold, [hurt, shake, release] = p.slam ?? []
  // (the grab: from his belly, 20 px ahead of his axis, to `grab` px, at his hands' height; with her hurt box 4-5 px
  // out of her body it takes her when the bodies are within about 16 px, touching, 13.7)
  if (p.grab) c.setBox("hit", K.pivot[0] + 20, Math.round((hands[0][1] + hands[1][1]) / 2) - 14, p.grab - 20, 28)
  const bind = h && { anim: h.anim, frame: h.frame, at: [0, 1].map((e) => Math.round((hands[0][e] + hands[1][e]) / 2 - K.pivot[e] + h.nudge[e])), facing: h.facing ?? -1, layer: h.layer ?? "between" }
  const [damage, hitstun, hitstop, pushback] = p.hit ?? []
  c.setData({ phase: p.phase, ...(p.hit ? { damage, hitstun, hitstop, pushback } : {}), ...(p.phase === "hurt" ? { hitstun: HITSTUN } : {}), ...(p.air ? { air: true } : {}), ...(p.step ? { step: p.step } : {}), ...(p.invuln ? { invuln: true } : {}),
    ...(bind ? { bind } : {}), ...(p.slam ? { damage: hurt, shake, release } : {}) }) }

// ---------------------------------------------------------------- the moves, facing e: the body, the head, the near arm
const ON = { w: W, h: H, pivot: PIV, genre: "fighting", category: "heavy" }
const drawn = (c, m, p) => { const i = c.frame, K = cutOf(m), j = K.rig.joints(p, 180), [x, y] = K.rig.screen(j.head).map(Math.round), at = FELL_AT[p.face] ?? HEAD_AT, head = headOf(p.face)
  c.stamp(`${K.body}_${m}_s`, ...K.pivot, { frame: i })
  const hx = x + at[0], hy = y + at[1] + Math.round(1.5 * (p.breath ?? 0)), img = c.asset(head), [px, py] = img.pivot
  c.stamp(head, hx, hy)
  c.stamp(`${K.arm}_${m}_s`, ...K.pivot, { frame: i })
  mend(c, j, [hx - px, hy - py, hx - px + img.w, hy - py + img.h], K.rig); pinholes(c) }
const onOf = (m) => { const K = cutOf(m); return { w: K.w, h: K.h, pivot: K.pivot } }
for (const [m, M] of Object.entries(MOVES)) anim(m, { ...ON, ...onOf(m) }, (c) => { const p = M.pose(c.frame); drawn(c, m, p); boxes(c, p, cutOf(m)) }, ...M.ms.map((ms) => frame({ ms })))
// A move that holds her (a frame with `hold`) has its front layer, <move>_front: his near arm alone, the frame's own
// pixels where it lies, the same size and pivot. An engine draws a frame whose bind says "between" as his frame, her,
// then this frame of <move>_front over her
const HOLDS = Object.keys(MOVES).filter((m) => MOVES[m].ms.some((_, i) => MOVES[m].pose(i).hold))
for (const m of HOLDS) anim(`${m}_front`, onOf(m), (c) => { const arm = c.asset(`${cutOf(m).arm}_${m}_s`, { frame: c.frame }).data, D = c.img.data
  drawn(c, m, MOVES[m].pose(c.frame)); for (let k = 0; k < D.length; k++) if ((arm[k] & 255) < 128) D[k] = 0 }, ...MOVES[m].ms.map((ms) => frame({ ms })))
sheet("haldor_fighter", [...Object.keys(MOVES), ...HOLDS.map((m) => `${m}_front`)], { rows: "tag", pad: 2, slots: SLOTS })
card("idle", { is: "Haldor the smith, a heavy grappler 140 px standing (126-130 in his guard), side view in KOF 2002's school, Reva's opponent, in 3D on his rig with his head drawn by hand and his hands modeled (their shape a pose's fingers): bald, a braided black beard, a smith's tan leather apron (a bib on a neck strap, tied at the waist, split, to above his knees) over charcoal trousers bloused over laced work boots, leather gauntlets; a grappler's low, wide guard, the rear foot turned to the camera with its knee, the hands open claws ready to grab (the far palm turned to us, the near hand's back); idle, walk_f, walk_b, crouch, crouch_hold, jump, block, block_low and his normals jab, strike (a hammer blow), kick_l, kick_h (a push kick), crouch_kick, jump_kick, his throw (a smith's handling, Reva bound to her thrown drawings, held between his arms) and his command throw in three strengths, anvil_l (the Sledge: held upside down behind his head, brought down onto her face), anvil_m (the Anvil: pressed over his head on her back, brought down across his thigh) and anvil_h (the Rivet: upside down against his chest, driven head first as he drops to his knees), and his reactions hurt, hurt_low, crouch_hurt, knockdown, down and get_up (Reva's names, the heavies' way: tall when hit high, a push from the floor to get up) facing e, hurt and hit boxes and frame data (the phase, the damage, hitstun, hitstop and pushback, the air, the motion an engine applies, invuln, the throw's bind with her layer, release and shake) from his joints", cells: { "side/?": "✓" }, category: "heavy",
  vary: { color: "3 palette slots on the sheet haldor_fighter (base, ash, moss: beard, apron, gauntlets and boots, trousers): haldorFighter.SLOTS", part: "his moves: idle, walk_f, walk_b, crouch, crouch_hold, jump, block, block_low, jab, strike, kick_l, kick_h, crouch_kick, jump_kick, throw, anvil_l (the Sledge), anvil_m (the Anvil), anvil_h (the Rivet), hurt, hurt_low, crouch_hurt, knockdown, down, get_up facing e (the game flips him for w), and each holding move's front layer <move>_front (his near arm, drawn over her), on the sheet haldor_fighter, a row a move; their blocks _hf_bk_<move>_s" } })
Object.assign(haldorFighter, { SLOTS, MOVES, HAND, rig: RIG })
}
