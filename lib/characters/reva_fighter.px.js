// Reva the fighter, fighting's body (lib/profiles/fighting.px.js): an original woman fighter seen from the side, 110 px
// standing and 101-103 in her stance, drawn in KOF 2002's school (the library's fighting study, measured for numbers
// only, never its pixels): a dark violet bob under a gold headband whose two tails trail behind, a red crop top over a
// bare midriff, a gold sash, loose navy trousers bound at the ankle, bare arms, the forearms and fists wrapped. 16
// colors; a flat plane a material and one shaped shadow band, the trousers' folds as long thin light streaks; a line by
// material (each part's own darkest), black on the hair and the shoes (the genre's ink). The chibi Reva (reva.px.js)
// is the same woman at topdown16.
// Made the study's way (characters §14): her moves posed and timed as rig3d() blocks (_rf_bk_<move>_s), her parts
// drawn by hand over a block frame (the head, the torso, each arm's upper arm, forearm and fist, each leg's thigh,
// shin and foot), and a 2D rig that stamps them on the pose's joints every frame, turned to their bones by stamp
// `angle`; new drawings only where a shape changes (the torso turned on the strike, the hurt's face). Idle
// (8 x 100 ms), strike (a rear cross: startup 2, active 2, recovery 3 at 60/40/60/80/80/80/100) and hurt (2 drawings:
// the head thrown the whole way back, then back over half of it) facing e, the game flips her for w; the feet on one
// row through every move (the genre's ground). Each frame's hurt boxes (head, body, legs, the punching arm while it is
// out) and hit box (round the fist on the active frames), from the same joints, and its data { phase, damage,
// hitstun }; 3 palette slots (base, jade, dusk: 9 keys swapped) on the sheet reva_fighter for an engine to recolor.
// Taken with include("<path>/lib/characters/reva_fighter.px.js", { as: "reva_fighter" }): reva_fighter.idle, .strike,
// .hurt; revaFighter.SLOTS a slot's swap (stamp(..., { swap: revaFighter.SLOTS.jade })).
include("../profiles/fighting.px.js")
// the values set from the references' lightness (OKLab), hue and chroma her own: skin line 0.37, shadow band 0.52,
// plane 0.73, lit 0.89; the trousers a dark cloth (0.25, 0.42, streaks 0.66); the top a red (0.42, 0.60); the sash a
// gold (0.58, 0.80) (characters §14). 16 colors, every ramp from the ink: skin, hair, top, trousers (the shoes too),
// sash, wraps
pal({ k: "#1a1220", S: "#652c23", s: "#9c5135", z: "#db956d", Z: "#ffd0ab", H: "#261e39", h: "#534370", R: "#783345", r: "#cc525b", N: "#191f3d", n: "#3e4a76", m: "#7d90c6", Y: "#a16e3c", y: "#f0b053", W: "#8f8478", w: "#e1d7c0" })
ramps("kSszZ", "kHh", "kRr", "kNnm", "kYy", "kWw")
var revaFighter = {}
// in a block: its names stay its own when a scene includes the file
{
// her slots, a swap each of the roles' keys: hair (H h), top (R r), trousers and shoes (N n m), sash (Y y); skin and wraps kept
const F = genre("fighting"), SLOTS = {
  jade: { R: "#30544b", r: "#4b9176", N: "#27211d", n: "#574c44", m: "#998a7c", Y: "#914741", y: "#d96650", H: "#44231a", h: "#8b4e3a" },
  dusk: { R: "#40366c", r: "#6659b6", N: "#371d1d", n: "#764242", m: "#c77f78", Y: "#426d75", y: "#58afaf", H: "#dccbab", h: "#fff4dc" } }

// ---------------------------------------------------------------- the poses, in her px (rig3d's pose fields)
// Measured on the references' idles and light punches (characters §14): the hips turned most of the way to profile
// (turn -70) while the shoulders twist back toward us (34), leaning 10, the knees bent 11; feet 0.82 of her height
// apart, the weight 0.51 toward the front foot, the line of action 23 degrees (the genre's pose). The head turned to her
// opponent whatever the shoulders do.
const BODY = { h: 110, heads: 6.5, shoulders: [0, 11.5, -1] }
const STANCE = { turn: -70, twist: 34, head: 0, lean: 10, down: 11, feet: [[27, -5], [-27, 6]], lift: [0, 0], hands: [[14, 2, 6], [12, -3, 5]] }
const posed = (o) => { const q = { ...STANCE, ...o }; return { ...q, head: -80 - q.turn - q.twist } }
// the idle: the knees bouncing the body 3 px (the extremes held), the fists a frame late; the near (rear) fist below
// the chin in front of the chest
const BOB = [0, 0.5, 1.5, 2.5, 3, 3, 2, 1], NEAR = [20, -9, 3]
const idle = (i) => { const p = posed({ phase: "idle", down: STANCE.down + BOB[i], hands: STANCE.hands.map((h) => [h[0], h[1], h[2] - BOB[(i + 7) % 8] * 0.6]) })
  return { ...p, hands: [p.hands[0], [NEAR[0], NEAR[1], p.hands[1][2] - 5 + NEAR[2]]] } }
// the cross: coil, pull, two frames at full reach (the front foot slid, the rear heel up, the weight forward, the
// guard hand in front of the face), then back the way it came; feet 0.91, weight 0.64, line 35 degrees
const STRIKE = [
  { phase: "startup", twist: 44, down: 12, hands: [[14, 3, 7], [5, -3, 8]] },
  { phase: "startup", turn: -74, twist: 8, lean: 14, down: 12, lift: [0, 1], hands: [[11, 0, 7], [21, -4, 5]] },
  { phase: "active", turn: -78, twist: -34, lean: 20, down: 13, feet: [[26, -5], [-34, 6]], lift: [0, 3], hands: [[22, -1, 7], [35, -5, 4]] },
  { phase: "active", turn: -78, twist: -36, lean: 21, down: 13, feet: [[26, -5], [-34, 6]], lift: [0, 3], hands: [[22, -1, 7], [35.5, -5, 4]] },
  { phase: "recovery", turn: -76, twist: -12, lean: 16, down: 12.5, feet: [[26, -5], [-33, 6]], lift: [0, 2], hands: [[19, 0, 7], [25, -4, 5]] },
  { phase: "recovery", turn: -72, twist: 20, lean: 12, down: 11.5, hands: [[12, 1, 6], [13, -4, 6]] },
  { phase: "recovery", down: 11.5, hands: [[14, 2, 5], [12, -3, 5]] },
]
const strike = (i) => { const p = posed(STRIKE[i]); return i === 6 ? { ...p, hands: [p.hands[0], [NEAR[0], NEAR[1], p.hands[1][2] - 5 + NEAR[2]]] } : p }
// hurt: thrown back from the hips, the head the whole way in the first drawing and back over half of it in the next;
// the guard opened, the fists flung back; the feet planted
const HURT = [
  { phase: "hurt", turn: -66, twist: 30, lean: -16, down: 10, hands: [[16, -2, -10], [2, 6, -22]] },
  { phase: "hurt", turn: -68, twist: 33, lean: -3, down: 12.5, hands: [[16, 0, -2], [8, 2, -16]] },
]
const hurt = (i) => posed(HURT[i])
const MOVES = { idle: { pose: idle, ms: BOB.map(() => F.states.idle.ms) }, strike: { pose: strike, ms: F.states.strike.ms }, hurt: { pose: hurt, ms: F.states.hurt.ms } }
// the skeleton seen at the genre's pitch, its joints where each part goes; its flat blocks to judge a move by
const W = 130, H = 118, PIV = [52, 114]
const RIG = rig3d("_rf", { body: BODY, headings: ["s"], pitch: F.camera.pitch, w: W, h: H, pivot: PIV, blocks: "_rf_bk",
  moves: Object.fromEntries(Object.entries(MOVES).map(([m, M]) => [m, { frames: M.ms.length, ms: M.ms, pose: M.pose }])) })

// ---------------------------------------------------------------- her parts, by hand over a block frame
// Each in the frame's own size (the idle's frame 0 where it was drawn), or along +x from its joint with its pivot on it
// (a part that turns). A part's line is its own (inline) and a shade of what it touches (selout), then turned from
// black to the material's darkest (`line`): black stays on the hair and the shoes (the genre's ink by material, which
// pxl check reads: no edge pixel lighter than its material's fill inside it).
const span = (k, rows) => Object.entries(rows).flatMap(([y, xs]) => { const out = []; for (let i = 0; i < xs.length; i += 2) out.push(rect(xs[i], +y, (xs[i + 1] ?? xs[i]) - xs[i] + 1, 1, k)); return out })
const part = (name, sel, line, ...items) => line
  ? (sprite(name + "_ink", { w: W, h: H, inline: "k", selout: sel }, ...items.flat()), sprite(name, { base: name + "_ink", swap: { k: line } }))
  : sprite(name, { w: W, h: H, inline: "k", selout: sel }, ...items.flat())
// a part that turns, lined by the material it touches, never black (floor: each ramp stops a key above the ink)
const joint = (name, w, h, pivot, sel, ...items) => sprite(name, { w, h, pivot, inline: "k", selout: sel, floor: "k" }, ...items.flat())

// the legs: loose trousers bound at the ankle, the shadow band down the back of the thigh, behind the knee and under
// the calf, the folds long thin light streaks from the hip to the knee and down the shin
part("_rf_near_leg", 1, "N",
  poly([42,72, 57,72, 55,80, 52,90, 50,99, 44,103, 36,107, 30,108, 22,108, 21,104, 27,100, 34,95, 36,89, 38,81, 41,76], "n"),
  span("N", { 74: [42,43], 75: [42,43], 76: [41,43], 77: [41,44], 78: [40,44], 79: [40,45], 80: [39,45], 81: [39,45], 82: [38,44], 83: [38,44], 84: [38,43], 85: [37,42],
    86: [37,41], 87: [37,40], 88: [36,40], 89: [36,41], 90: [36,42], 91: [35,41], 92: [35,40], 93: [34,39], 94: [33,38], 95: [32,36], 96: [30,34], 97: [29,32], 98: [27,31],
    99: [26,31], 100: [26,31], 101: [25,30], 102: [24,29], 103: [23,27], 104: [23,26], 105: [22,25], 106: [22,24], 107: [22,24] }),
  line(54,74, 51,86, "m"), line(56,76, 54,84, "m"), line(51,88, 48,96, "m"), line(47,85, 45,93, "m"), line(48,100, 40,104, "m"), line(44,99, 37,103, "m"), line(52,97, 46,101, "m"))
part("_rf_near_foot", 2, undefined,
  span("w", { 103: [21,29], 104: [20,29], 105: [20,29], 106: [20,30] }), span("W", { 104: [23,23, 27,27], 106: [20,30] }), span("Z", { 103: [22,28] }),
  poly([19,107, 30,107, 34,109, 38,112, 38,114, 16,114, 16,110], "n"), span("N", { 113: [16,38], 112: [16,24] }), line(30,108, 35,111, "m"))
part("_rf_far_leg", 1, "N",
  poly([54,70, 64,70, 72,79, 80,87, 82,93, 82,104, 82,107, 75,107, 74,99, 71,94, 63,87, 57,79], "n"),
  span("N", { 79: [54,56], 80: [55,58], 81: [56,59], 82: [57,60], 83: [58,61], 84: [59,62], 85: [60,63], 86: [61,65], 87: [63,67], 88: [66,70], 89: [68,72], 90: [70,73], 91: [71,74],
    92: [72,74], 93: [72,74], 94: [73,75], 95: [73,75], 96: [74,75], 97: [74,76], 98: [74,76], 99: [75,76], 100: [75,77], 101: [75,77], 102: [75,77], 103: [75,77], 104: [75,77], 105: [75,77], 106: [75,77] }),
  line(58,72, 66,80, "m"), line(61,72, 70,80, "m"), line(68,78, 77,86, "m"), line(79,90, 80,103, "m"), line(77,91, 78,99, "m"))
part("_rf_far_foot", 2, undefined,
  span("w", { 103: [75,83], 104: [75,83], 105: [75,83], 106: [75,84] }), span("W", { 104: [78,78, 82,82], 106: [75,84] }), span("Z", { 103: [76,82] }),
  poly([74,107, 85,107, 89,109, 95,112, 95,114, 72,114, 72,110], "n"), span("N", { 113: [72,95], 112: [72,79] }), line(85,108, 91,111, "m"))

// the body: the seat of the trousers, the bare midriff, the sash and its knot, the crop top, the neck
part("_rf_seat", 1, "N", poly([42,69, 67,69, 68,74, 62,77, 50,77, 41,75], "n"), span("N", { 70: [43,66], 71: [43,45], 72: [42,44] }), line(60,72, 62,77, "m"), line(57,72, 58,76, "m"))
part("_rf_mid", 2, "S",
  poly([46,54, 68,54, 67,60, 65,66, 47,66, 46,60], "z"),
  span("s", { 55: [47,67], 56: [47,49], 57: [47,49], 58: [47,48], 59: [47,48], 60: [47,48], 61: [47,48], 62: [48,49], 63: [48,49], 64: [48,50] }),
  span("s", { 58: [57,57], 59: [57,57], 61: [58,58], 62: [58,58], 63: [57,57] }),
  span("Z", { 57: [62,65], 58: [62,66], 59: [61,66], 60: [61,65], 61: [61,64], 62: [61,64], 63: [60,63] }))
part("_rf_sash", 1, "Y",
  poly([44,65, 67,65, 68,70, 43,70], "y"), span("Y", { 69: [44,67] }),
  poly([64,64, 70,64, 71,70, 66,71], "y"), poly([66,70, 69,70, 69,81, 66,80], "y"), poly([69,70, 72,70, 74,77, 71,77], "Y"), span("Y", { 70: [66,70] }))
part("_rf_top", 1, "R",
  poly([44,38, 52,36, 60,36, 66,38, 70,42, 72,47, 71,52, 68,55, 45,55, 43,48], "r"),
  span("R", { 40: [44,46], 41: [44,46], 42: [44,46], 43: [44,46], 44: [44,46], 45: [44,46], 46: [44,47], 47: [44,47], 48: [44,47], 49: [44,48], 50: [45,48, 64,71], 51: [45,49, 61,71],
    52: [46,70], 53: [46,69], 54: [46,68] }),
  span("z", { 36: [55,59], 37: [56,58] }))
part("_rf_neck", 2, "S", rect(54,32, 7, 6, "z"), span("s", { 32: [54,56], 33: [54,56], 34: [54,57], 35: [54,60], 36: [54,60], 37: [54,58] }))
// the torso turned toward profile as the cross lands (the strike's frames 2-4): the shoulders rotated away, the chest
// closing, the back toward us a little, leaning in from the hips; the belly drawn 2 px on under the sash, so the
// chest rising off the hips on the cross opens no gap between them
part("_rf_top_tw", 1, "R",
  poly([57,39, 64,37, 69,38, 73,41, 76,45, 76,50, 73,54, 70,56, 54,56, 55,48], "r"),
  span("R", { 41: [56,57], 42: [56,58], 43: [55,58], 44: [55,58], 45: [55,57], 46: [55,57], 47: [55,57], 48: [55,57], 49: [55,58], 50: [55,58, 70,75], 51: [55,59, 68,75],
    52: [55,74], 53: [55,73], 54: [55,72], 55: [55,70] }),
  span("z", { 37: [64,67] }))
part("_rf_mid_tw", 2, "S",
  poly([54,55, 70,55, 69,60, 66,65, 66,67, 48,67, 48,65, 50,60], "z"),
  span("s", { 56: [54,69], 57: [53,56], 58: [52,55], 59: [51,54], 60: [50,53], 61: [50,52], 62: [49,52], 63: [49,51], 64: [49,51], 65: [49,51], 66: [49,51] }),
  span("s", { 59: [63,63], 60: [63,63], 62: [62,62] }), span("Z", { 58: [65,68], 59: [65,68], 60: [64,67], 61: [64,66], 62: [63,65] }))
part("_rf_neck_tw", 2, "S", rect(61,31, 7, 7, "z"), span("s", { 31: [61,63], 32: [61,63], 33: [61,64], 34: [61,67], 35: [61,67], 36: [61,65] }))

// the head, drawn with its own lines (black round the hair, the skin's dark at the face): the bob in locks, the band
// across it, the eye under the fringe; the band's two tails behind
sprite("_rf_head", { w: W, h: H }, runs({
  17: [[55, "kkkkk"]], 18: [[52, "kkkhhhhhkk"]], 19: [[51, "khhhhhhhhhhk"]], 20: [[50, "khhhHhhhhHhhhk"]],
  21: [[49, "kYyyyyyyyyyyyyyk"]], 22: [[48, "kYYYYYYYYYYYYYYYYk"]],
  23: [[48, "khhhhHhhhhHHhHzZS"]],
  24: [[47, "khhhHhhhHhhHhhHzZZzS"]],
  25: [[47, "khhhHhhhHhhHhzHHHZzS"]],
  26: [[47, "khhHhhhHhhHhHzzZZZS"]],
  27: [[47, "khhHhhhHhhHhHzwkZZzS"]],
  28: [[47, "khhHhhhHhhHhHszkzZZzS"]],
  29: [[47, "khhHhhhHhhHhHszzzzS"]],
  30: [[48, "khHhhhHhhHhHszzZzzS"]],
  31: [[48, "khHhhhHhhHhHsszzSS"]],
  32: [[48, "khHhhhHhhHhkssszzS"]],
  33: [[48, "kHkhHkhHkhHkSsszS"]],
  34: [[49, "k"], [52, "k"], [55, "k"], [58, "k"], [61, "SSS"]] }))
part("_rf_tails", 2, "Y", poly([48,20, 48,23, 41,25, 35,29, 33,28, 40,23], "y"), poly([48,22, 48,24, 42,27, 38,32, 36,32, 41,26], "Y"))

// the arms' parts along +x from their joint, two tones each (a plane and its lit band: a turned part's bands are kept
// few so the turn can't jag them): the upper arm with its deltoid, the forearm with its wrap; the fist, wrapped, from
// the side, knuckles forward (the knuckles' bumps with a dent between each, the fingers' creases, the thumb's
// diagonal), upright at the hand whatever the forearm does
joint("_rf_uarm", 30, 16, [5, 8], 2,
  poly([0,4, 4,1, 9,2, 13,4, 21,5, 23,7, 23,11, 21,13, 12,13, 6,15, 2,14, 0,10], "z"),
  ...span("Z", { 2: [4,8], 3: [2,11], 4: [1,13], 5: [2,20], 6: [8,22] }))
joint("_rf_farm", 22, 12, [3, 6], 2,
  poly([0,3, 4,2, 13,3, 15,4, 15,9, 13,10, 4,10, 0,9], "z"), ...span("Z", { 3: [2,12], 4: [1,6] }),
  rect(9,3, 7, 7, "w"), ...span("Z", { 3: [9,14] }), ...span("W", { 6: [11,11], 8: [13,13] }))
joint("_rf_fist", 12, 11, [6, 5], 1, grid(0, 0, `
...wwwwww...
..wZZZZZZw..
.wZZZZZZZZw.
wwZZWZZWZZZw
wwwwwwwwwwZw
wwwwwwWWWWWw
wwwwwwwwwwZw
wwWwwwWWWWWw
.wwWwwwwwwZw
..wwWWWwwww.
...wwwwww...`))

// ---------------------------------------------------------------- the 2D rig: each part on its joint, every frame
// The pose's joints where they land on the sprite; each part placed by its joint's offset from the idle's frame 0, the
// limbs turned on their joints by how far their bone turned (the arms to their bones' angles)
const JO = (p) => { const j = RIG.joints(p, 180), S = (q) => RIG.screen(q)
  return { head: S(j.head), chest: S(j.chest), pelvis: S(j.pelvis), sh: j.arms.map((A) => S(A.sh)), el: j.arms.map((A) => S(A.elbow)), hand: j.arms.map((A) => S(A.hand)),
    hip: j.legs.map((L) => S(L.hip)), knee: j.legs.map((L) => S(L.knee)), ankle: j.legs.map((L) => S(L.ankle)) } }
const K0 = JO(idle(0)), TW = JO(strike(2))
const rd = (p) => p.map(Math.round), off = (a, b) => [Math.round(a[0] - b[0]), Math.round(a[1] - b[1])]
const deg = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI
// the legs cut at the knee from their drawings (their lines kept: a cut leaves no seam), their joints as pivots
const below = (y) => rect(0, y, W, H - y, "_"), above = (y) => rect(0, 0, W, y, "_")
sprite("_rf_nthigh", { base: "_rf_near_leg", pivot: rd(K0.hip[1]) }, below(97)); sprite("_rf_nshin", { base: "_rf_near_leg", pivot: rd(K0.knee[1]) }, above(97))
sprite("_rf_fthigh", { base: "_rf_far_leg", pivot: rd(K0.hip[0]) }, below(89)); sprite("_rf_fshin", { base: "_rf_far_leg", pivot: rd(K0.knee[0]) }, above(89))
// the far arm a step darker along its ramps, a key above the ink (the far leg keeps its tones)
const FAR = { shade: 1, floor: "k" }
const turned = (c, name, at, angle, far) => c.stamp(name, Math.round(at[0]), Math.round(at[1]), { angle: Math.round(angle), ...(far ? FAR : {}) })
const arm = (c, J, k, far) => {
  turned(c, "_rf_uarm", J.sh[k], deg(J.sh[k], J.el[k]), far); turned(c, "_rf_farm", J.el[k], deg(J.el[k], J.hand[k]), far)
  c.stamp("_rf_fist", Math.round(J.hand[k][0]), Math.round(J.hand[k][1])) }   // the fist keeps its light on the far side: a guard read in front of the face
// A foot stays on the sole's row (seen from 10 degrees up, a foot slid back would rise a pixel: the genre's ground is
// one row); a heel lifted turns the foot on its toe by the angle that raises the ankle that much; the shin is aimed at
// the ankle where the foot is drawn (only the rear foot lifts its heel: the strike's drive)
const TOE = [38, 113]
sprite("_rf_nfoot_toe", { base: "_rf_near_foot", pivot: TOE })
const leg = (c, J, k, lift) => {
  const foot = k ? "_rf_near_foot" : "_rf_far_foot", th = k ? "_rf_nthigh" : "_rf_fthigh", sh = k ? "_rf_nshin" : "_rf_fshin"
  const dx = Math.round(J.ankle[k][0] - K0.ankle[k][0]), ankle = [J.ankle[k][0], K0.ankle[k][1] - lift]
  if (lift) turned(c, "_rf_nfoot_toe", [TOE[0] + dx, TOE[1]], Math.asin(lift / (TOE[0] - K0.ankle[k][0])) * 180 / Math.PI)
  else c.stamp(foot, dx, 0)
  turned(c, sh, J.knee[k], deg(J.knee[k], ankle) - deg(K0.knee[k], K0.ankle[k]))
  turned(c, th, J.hip[k], deg(J.hip[k], J.knee[k]) - deg(K0.hip[k], K0.knee[k])) }
// the torso (the idle's frame 0) turned on the pelvis as the spine bends back: the hurt
sprite("_rf_torso", { w: W, h: H, pivot: rd(K0.pelvis) }, stamp("_rf_mid", 0, 0), stamp("_rf_top", 0, 0), stamp("_rf_neck", 0, 0))
const body = (c, J, how) => { const ch = off(J.chest, K0.chest), pv = off(J.pelvis, K0.pelvis), hd = off(J.head, K0.head)
  c.stamp("_rf_tails", ...hd); c.stamp("_rf_seat", ...pv)
  if (how === "twisted") { const t = off(J.chest, TW.chest); c.stamp("_rf_mid_tw", ...t); c.stamp("_rf_top_tw", ...t); c.stamp("_rf_neck_tw", ...t) }
  else if (how === "bent") turned(c, "_rf_torso", J.pelvis, deg(J.pelvis, J.chest) - deg(K0.pelvis, K0.chest))
  else { c.stamp("_rf_mid", ...ch); c.stamp("_rf_top", ...ch); c.stamp("_rf_neck", ...hd) }
  c.stamp("_rf_sash", ...pv) }
// the head hit: the eye shut, the mouth open, tipped back with the spine on its middle
sprite("_rf_head_hurt", { base: "_rf_head", pivot: rd(K0.head) }, runs({ 27: [[61, "zz"]], 28: [[61, "kk"]], 31: [[64, "Sk"]] }))
// a frame, back to front: the far arm and leg, the body, the near leg, the head, the near arm
const drawn = (c, p, how) => { const J = JO(p)
  arm(c, J, 0, true); leg(c, J, 0, p.lift[0]); body(c, J, how); leg(c, J, 1, p.lift[1])
  if (how === "bent") turned(c, "_rf_head_hurt", J.head, deg(J.pelvis, J.chest) - deg(K0.pelvis, K0.chest))
  else c.stamp("_rf_head", ...off(J.head, K0.head))
  arm(c, J, 1, false) }

// ---------------------------------------------------------------- what each frame says to an engine
// hurt boxes round the head, the body (chest, pelvis, elbows) and the legs, and the punching arm while it is out (a
// counter-hit); the hit box round the fist on the active frames; the phase, and on a hit its damage and hitstun (60 fps
// frames: the hurt's two drawings, 230 ms), the hurt's frames the hitstun they play out. From the joints the parts are
// drawn on, so they can't drift off the art.
const HITSTUN = 14
const boxOf = (pts, m) => { const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]), x0 = Math.min(...xs) - m, y0 = Math.min(...ys) - m; return [x0, y0, Math.max(...xs) + m - x0, Math.max(...ys) + m - y0] }
const boxes = (c, p) => { const j = RIG.joints(p, 180), S = (q) => RIG.screen(q)
  c.setBox("hurt", ...boxOf([S(j.head)], 9))
  c.setBox("hurt", ...boxOf([S(j.chest), S(j.pelvis), ...j.arms.map((A) => S(A.elbow))], 5))
  c.setBox("hurt", ...boxOf([S(j.pelvis), ...j.legs.flatMap((L) => [S(L.knee), S(L.foot)])], 4))
  if (p.phase !== "idle" && p.twist < 0) c.setBox("hurt", ...boxOf([S(j.arms[1].elbow), S(j.arms[1].hand)], 3))
  if (p.phase === "active") c.setBox("hit", ...boxOf([S(j.arms[1].hand)], 5))
  c.setData(p.phase === "active" ? { phase: "active", damage: 8, hitstun: HITSTUN } : p.phase === "hurt" ? { phase: "hurt", hitstun: HITSTUN } : { phase: p.phase }) }

// ---------------------------------------------------------------- the moves, facing e
const ON = { w: W, h: H, pivot: PIV, genre: "fighting", category: "character" }
anim("idle", ON, (c) => { const p = idle(c.frame); drawn(c, p, ""); boxes(c, p) }, ...MOVES.idle.ms.map((ms) => frame({ ms })))
anim("strike", ON, (c) => { const p = strike(c.frame); drawn(c, p, c.frame >= 2 && c.frame <= 4 ? "twisted" : ""); boxes(c, p) }, ...MOVES.strike.ms.map((ms) => frame({ ms })))
anim("hurt", ON, (c) => { const p = hurt(c.frame); drawn(c, p, "bent"); boxes(c, p) }, ...MOVES.hurt.ms.map((ms) => frame({ ms })))
sheet("reva_fighter", ["idle", "strike", "hurt"], { rows: "tag", pad: 2, slots: SLOTS })
card("idle", { is: "Reva the fighter, 110 px standing, side view in KOF 2002's school: a violet bob under a gold headband, a red crop top, a gold sash, navy trousers bound at the ankle, wrapped fists; idle, strike (a rear cross) and hurt facing e, hurt and hit boxes and frame data from her joints", cells: { "side/?": "✎" },
  vary: { color: "3 palette slots on the sheet reva_fighter (base, jade, dusk: hair, top, trousers, sash): revaFighter.SLOTS", part: "her moves: idle, strike, hurt facing e (the game flips her for w), on the sheet reva_fighter, a row a move; their blocks _rf_bk_<move>_s" } })
Object.assign(revaFighter, { SLOTS, MOVES, rig: RIG })
}
