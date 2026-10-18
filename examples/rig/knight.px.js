// A big piece built skeleton first: a 72 px knight in side view, facing right, a sword in its right
// hand (the near side) and a shield on its left arm (the far side). Three stages, all kept:
//   knight_blocking  the rig alone: a stand-in box per part, to judge the layout and proportions
//   knight_parts     every part drawn on its own, at its slot's size (a sheet)
//   knight           the parts dropped into the rig, plus a retouch layer on top
// The rig orders the parts from the way it faces: the far side's (left leg, left arm) behind the
// body, the near side's (right leg, right arm, sword) in front. Light from the top right.
pal({
  k: "#14101c",                                                         // ink
  1: "#262a3a", 2: "#454d63", 3: "#727d96", 4: "#aeb8cc", 5: "#eef2f8", // steel, dark to glint
  q: "#1a2148", w: "#2c3e7c", e: "#4a68b4",                             // surcoat blue
  o: "#6a4618", O: "#b8862e", Y: "#f2cc66",                             // gold trim
  x: "#3a1420", r: "#6e2030", R: "#a8383c",                             // cape red
  t: "#2e1c14", T: "#5a3a24", L: "#8a5a36",                             // leather
})
ramps("k12345", "qwe", "oOY", "xrR", "tTL")
const LIGHT = { light: [0.6, -1], reach: 2 }                          // relight: lit from the top right

// The body: 72 px, 6.5 heads (stylized heroic), two rows of margin above the head.
const F = figure(72, 6.5), Y = (y) => 2 + y          // figure's y (from the top of the head) -> rig's
const X = 30                                         // the body's centre line in the rig; the pivot is
                                                     // its sole, so stamp("knight", x, groundY) stands it

// Where each part's joint sits, the part's box (the size to draw it at, its outline included), and
// its side. Far side at -100, the middle at 0, the near side at +100; z adds to that. z is the
// body's layering, the same on both sides (both legs under the tabard): the facing says which is near.
const SLOTS = {
  cape:   { at: [X - 4, Y(F.shoulders) - 1], size: [16, 46], pivot: [12, 0], z: -150 },
  leg_l:  { at: [X - 5, Y(F.crotch)], size: [12, 36], side: "l", z: -50 },
  arm_l:  { at: [X + 1, Y(F.shoulders)], size: [12, 18], pivot: [3, 1], side: "l" },
  torso:  { at: [X, Y(F.chin)], size: [16, F.crotch - F.chin + 2] },
  head:   { at: [X + 1, Y(F.chin) + 1], size: [15, 15], pivot: [7, 14], z: 10 },
  leg_r:  { at: [X + 3, Y(F.crotch)], size: [12, 36], side: "r", z: -50 },
  tabard: { at: [X, Y(F.waist)], size: [18, 19], z: 75 },
  shield: { at: [X + 11, Y(F.waist) + 1], size: [14, 22], pivot: [4, 9], side: "l", z: 180 },
  sword:  { at: [X + 1, Y(F.crotch)], size: [16, 38], pivot: [3, 4], side: "r", z: -10 },
  arm_r:  { at: [X - 1, Y(F.shoulders)], size: [12, 29], pivot: [5, 1], side: "r" },
}

// Stage 1: stand-ins only (parts: false), labelled with their slots' first letters.
rig("knight_blocking", { w: 60, h: 76, facing: "right", pivot: [X, Y(F.sole)], parts: false, slots: SLOTS })

// ---------------------------------------------------------------- stage 2: the parts, one by one
// Each part is drawn flat in a mid tone and given volume with relight (edges facing the light a
// step lighter, the others darker), then glints and trims by hand. Each has its own outline, so
// parts read apart where they overlap; its box is its slot's size, the outline included.

// a bascinet with its visor down, in profile facing right: the slit and breaths at the front, a
// gold band, the mail of the neck below
sprite("knight_head", { w: 13, h: 13, outline: "k", pivot: [6, 13] },
  ellipse(6, 5, 5, 5, "3"), poly([7, 2, 12, 5, 12, 8, 8, 10], "3"), rect(3, 9, 7, 4, "2"),
  relight(undefined, LIGHT),
  hline(6, 5, 7, "k"), px(10, 7, "1"), px(11, 8, "1"), px(9, 8, "1"),          // the slit, the breaths
  line(1, 6, 5, 2, "O"), line(1, 7, 5, 3, "o"),                                // gold band, back to crown
  px(8, 2, "5"), px(9, 3, "5"), px(7, 1, "4"),                                 // glint on the crown
  ...[[4, 11], [6, 11], [8, 11], [5, 12], [7, 12]].map(([x, y]) => px(x, y, "1")))   // mail rings

// the chest under a blue surcoat: steel only at the neck; a gold trim, a belt with its buckle
sprite("knight_torso", { w: 14, h: F.crotch - F.chin, outline: "k", pivot: [7, 0] },
  poly([3, 0, 9, 0, 12, 5, 13, 10, 12, 15, 11, 20, 12, 25, 3, 25, 2, 18, 1, 9, 2, 3], "w"),
  relight(undefined, LIGHT),
  hline(4, 0, 5, "2"), hline(4, 1, 6, "O"),                                     // collar of the mail, gold trim
  line(11, 8, 11, 12, "e"), px(12, 9, "e"),                                     // the chest's lit curve
  hline(2, 16, 11, "T"), hline(2, 17, 11, "t"), rect(9, 15, 3, 3, "O"), px(10, 16, "Y"))   // belt and buckle

// the surcoat's skirt below the belt: split at the front, a gold hem, folds hanging straight
sprite("knight_tabard", { w: 16, h: 17, outline: "k", pivot: [8, 0] },
  poly([2, 0, 13, 0, 15, 16, 0, 16], "w"),
  relight(undefined, LIGHT),
  vline(5, 4, 12, "q"), vline(10, 3, 13, "q"), vline(11, 5, 11, "e"),           // folds
  hline(0, 15, 16, "O"), hline(0, 16, 16, "o"), px(14, 15, "Y"))                // the hem

// a leg in plate, profile: cuisse, the knee cop pointing forward, greave, sabaton
sprite("knight_leg_r", { w: 10, h: 34, outline: "k", pivot: [5, 0] },
  poly([1, 0, 8, 0, 8, 15, 2, 15], "3"),                                        // thigh
  ellipse(6, 17, 3, 2, "3"),                                                    // knee cop
  poly([2, 19, 7, 19, 7, 30, 3, 30], "3"),                                      // shin
  poly([2, 30, 7, 30, 9, 32, 9, 33, 2, 33], "3"),                               // sabaton
  relight(undefined, LIGHT),
  hline(2, 15, 6, "1"), hline(2, 19, 6, "1"), hline(3, 30, 5, "1"),             // plate joints
  px(8, 16, "5"), vline(7, 21, 7, "4"), vline(8, 2, 10, "4"), px(8, 32, "5"))   // glints
// the far leg: the same leg, a step darker, behind
sprite("knight_leg_l", { base: "knight_leg_r", swap: { 5: "4", 4: "3", 3: "2", 2: "1" } })

// the near arm: pauldron, the upper arm straight down, the elbow's couter behind, the forearm
// reaching forward to the gauntlet closed on the sword's grip in front of the hip
sprite("knight_arm_r", { w: 10, h: 27, outline: "k", pivot: [4, 0] },
  ellipse(4, 3, 4, 3, "3"), rect(0, 3, 9, 3, "3"),                              // pauldron
  rect(2, 6, 5, 7, "3"), ellipse(2, 13, 2, 2, "3"),                             // upper arm, couter
  poly([2, 13, 6, 13, 8, 20, 4, 21], "3"),                                      // forearm, forward
  ellipse(6, 23, 3, 3, "3"),                                                    // gauntlet, a fist
  relight(undefined, LIGHT),
  hline(0, 5, 9, "1"), hline(2, 12, 5, "1"), line(4, 20, 8, 19, "1"),           // plate edges
  px(6, 1, "5"), px(7, 2, "4"), vline(6, 7, 4, "4"), line(6, 14, 7, 18, "4"), px(8, 22, "4"))   // glints
// the far arm: from the shoulder down and forward to the shield's grip, mostly hidden
sprite("knight_arm_l", { w: 10, h: 16, outline: "k", pivot: [2, 0] },
  rect(0, 0, 5, 9, "2"), poly([2, 8, 6, 8, 10, 13, 9, 15, 4, 12], "2"),
  relight(undefined, LIGHT))

// a heater shield held up on the far arm, its face turned a little toward us: a gold rim and a
// gold cross on blue, lit at the top right
sprite("knight_shield", { w: 12, h: 20, outline: "k", pivot: [4, 9] },
  poly([0, 0, 11, 0, 11, 10, 6, 19, 5, 19, 0, 10], "O"),
  poly([1, 1, 10, 1, 10, 10, 6, 17, 5, 17, 1, 10], "w"),
  relight([1, 1, 10, 17], LIGHT),
  rect(5, 3, 2, 11, "O"), rect(2, 6, 8, 2, "O"), px(6, 3, "Y"), px(9, 6, "Y"),  // the cross
  hline(1, 0, 10, "Y"), vline(11, 1, 9, "Y"))                                   // lit rim

// a longsword pointing down and forward from the hand: pommel, grip, crossguard, the blade with its
// fuller; pivot on the grip, where the gauntlet closes
sprite("knight_sword", { w: 14, h: 36, outline: "k", pivot: [2, 3] },
  rect(1, 0, 2, 2, "O"), vline(2, 1, 5, "T"),                                  // pommel, grip
  line(0, 6, 5, 4, "O"), px(5, 4, "Y"),                                         // crossguard, square to the blade
  line(3, 7, 13, 35, "3", 2), line(4, 7, 13, 34, "4"), line(3, 8, 12, 34, "2"),  // blade: lit edge, dark edge
  px(4, 8, "5"), px(6, 14, "5"))                                                // glints
// the cape hanging behind from the shoulders, swinging back in the wind: folds, a darker lining
sprite("knight_cape", { w: 14, h: 44, outline: "k", pivot: [11, 0] },
  poly([8, 0, 13, 0, 13, 6, 12, 20, 13, 38, 10, 43, 6, 41, 3, 43, 0, 40, 2, 24, 5, 8], "r"),
  relight(undefined, LIGHT),
  line(7, 6, 4, 38, "x"), line(10, 8, 9, 40, "x"), line(8, 8, 7, 39, "R"))      // folds

sheet("knight_parts", ["knight_head", "knight_torso", "knight_tabard", "knight_arm_r", "knight_arm_l", "knight_leg_r", "knight_leg_l",
  "knight_shield", "knight_sword", "knight_cape"], { pad: 2 })

// ---------------------------------------------------------------- stage 3: assembled, retouched
// The retouch layer goes over the assembled parts: what spans more than one part, or only makes
// sense once they are together (a plume over the helmet and the cape's top).
const PLUME = [[2, 0, "R"], [1, 0, "R"], [0, 1, "r"], [-1, 2, "r"], [-2, 3, "x"], [-3, 5, "x"], [0, 0, "R"], [-1, 1, "R"], [-2, 2, "r"], [-3, 3, "r"], [-4, 4, "x"]]
const plume = (x, y, flip = 1) => PLUME.map(([dx, dy, k]) => px(x + flip * dx, y + dy, k))
rig("knight", { w: 60, h: 76, facing: "right", pivot: [X, Y(F.sole)], height: 1.8, slots: SLOTS },
  ...plume(29, 1), px(28, 0, "k"), px(30, 0, "k"), px(31, 1, "k"))

// The same knight turned to face left. Not a mirror of the whole: its own rig, its slots mirrored
// and each part flipped, facing left. The rig then puts its left side (the shield arm, the left
// leg) in front, as a body facing left shows it, and the sword stays in its right hand, behind.
// (Flipping the finished knight instead would move the sword to its left hand: describe says so.)
const W = 60, flipSlots = Object.fromEntries(Object.entries(SLOTS).map(([k, s]) => {
  const px0 = (s.pivot ?? [s.size[0] / 2, 0])[0]
  return [k, { ...s, at: [W - s.at[0], s.at[1]], pivot: [s.size[0] - px0, (s.pivot ?? [0, 0])[1]], part: `knight_l_${k}` }]
}))
for (const k of Object.keys(SLOTS)) sprite(`knight_l_${k}`, { base: `knight_${k}`, flip: "x" })
rig("knight_l", { w: W, h: 76, facing: "left", pivot: [W - X, Y(F.sole)], height: 1.8, slots: flipSlots },
  ...plume(W - 29, 1, -1), px(W - 28, 0, "k"), px(W - 30, 0, "k"), px(W - 31, 1, "k"))

// The three side by side on the ground, in a world 40 px to the meter (a 1.8 m knight is 72 px):
// facing right; the finished knight flipped (a mirror: sword in its left hand now); its own rig
// facing left. pxl describe says which way each one faces, which side is toward us, and whether it
// is a mirror image, and checks each one's height against the scale.
scene("knights", { w: 200, h: 92, bg: "#2a2f3e", world: { scale: 40 } },
  rect(0, 84, 200, 8, "T"), hline(0, 84, 200, "L"),
  layer("knights", stamp("knight", 40, 85), stamp("knight", 100, 85, { flip: "x" }), stamp("knight_l", 160, 85)),
  text(40, 2, "RIG", "4", { align: "c" }), text(100, 2, "FLIP", "4", { align: "c" }), text(160, 2, "RIG LEFT", "4", { align: "c" }))
