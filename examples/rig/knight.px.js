// A big piece built skeleton first: a 72 px knight in side view, facing right, a sword in its right
// hand (the near side) and a shield on its left arm (the far side). The stages, all kept:
//   knight_blocking    the rig alone: a stand-in box per part, to judge the layout and proportions
//   knight_parts       every part drawn on its own, at its slot's size (a sheet)
//   knight             the parts dropped into the rig, plus a retouch layer on top
//   knight_l           the same rig turned to face left (turn), its parts relit for the same light
//   knight_turnaround  both side by side
// The rig orders the parts from the way it faces: the far side's (left leg, left arm) behind the
// body and a step darker, the near side's (right leg, right arm, sword) in front. Light from the top
// right, the same for every part and for the turned knight.
pal({
  k: "#14101c",                                                         // ink
  1: "#262a3a", 2: "#454d63", 3: "#727d96", 4: "#aeb8cc", 5: "#eef2f8", // steel, dark to glint
  q: "#1a2148", w: "#2c3e7c", e: "#4a68b4",                             // surcoat blue
  o: "#6a4618", O: "#b8862e", Y: "#f2cc66",                             // gold trim
  x: "#3a1420", r: "#6e2030", R: "#a8383c",                             // cape red
  t: "#2e1c14", T: "#5a3a24", L: "#8a5a36",                             // leather
})
ramps("k12345", "qwe", "oOY", "xrR", "tTL")
// relight: the light from the top right, 2 px of rim, and a glint (the ramp's top) on the corners
// facing it, so every part, turned or not, is lit by one rule rather than by hand
const LIT = { light: [0.6, -1], reach: 2, glint: 1.5 }

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
// Each part is its shape, drawn flat in mid tones with its trims and seams (what doesn't depend on
// the light), then lit by LIT and outlined. part() makes it twice: as drawn, facing right, and
// mirrored for the turned knight, relit after the mirror so its light stays at the top right
// (a flipped drawing would carry its light to the left). A part with a front says so (facing) and
// marks it with a `front` socket on the drawing (the visor, the chest, the toe, the fist, the
// blade's tip): describe checks the marker against the label.
const part = (name, w, h, o, ...shape) => {
  const { lit = LIT, ...opts } = o
  o = opts
  const m = (p) => p && [w - p[0], p[1]]
  sprite(`_knight_${name}_shape`, { w, h }, ...shape)
  sprite(`_knight_${name}_shape_l`, { base: `_knight_${name}_shape`, flip: "x" })
  sprite(`knight_${name}`, { base: `_knight_${name}_shape`, outline: "k", ...o }, relight(undefined, lit))
  sprite(`knight_l_${name}`, { base: `_knight_${name}_shape_l`, outline: "k", ...o, ...(o.facing ? { facing: "left" } : {}),
    pivot: m(o.pivot), ...(o.sockets ? { sockets: { front: m(o.sockets.front) } } : {}) }, relight(undefined, lit))
}

// a bascinet with its visor down, in profile: the slit and breaths at the front, a gold band, the
// mail of the neck below
part("head", 13, 13, { facing: "right", pivot: [6, 13], sockets: { front: [12, 6] } },
  ellipse(6, 5, 5, 5, "3"), poly([7, 2, 12, 5, 12, 8, 8, 10], "3"), rect(3, 9, 7, 4, "2"),
  hline(6, 5, 7, "k"), px(10, 7, "1"), px(11, 8, "1"), px(9, 8, "1"),            // the slit, the breaths
  line(1, 6, 5, 2, "O"), line(1, 7, 5, 3, "o"),                                  // gold band, back to crown
  ...[[4, 11], [6, 11], [8, 11], [5, 12], [7, 12]].map(([x, y]) => px(x, y, "1")))   // mail rings

// the chest under a blue surcoat: steel only at the neck; a gold trim, a belt with its buckle
part("torso", 14, F.crotch - F.chin, { facing: "right", pivot: [7, 0], sockets: { front: [13, 10] } },
  poly([3, 0, 9, 0, 12, 5, 13, 10, 12, 15, 11, 20, 12, 25, 3, 25, 2, 18, 1, 9, 2, 3], "w"),
  hline(4, 0, 5, "2"), hline(4, 1, 6, "O"),                                       // collar of the mail, gold trim
  hline(2, 16, 11, "T"), hline(2, 17, 11, "t"), rect(9, 15, 3, 3, "O"))           // belt and buckle

// the surcoat's skirt below the belt: a gold hem, folds hanging straight. It has no front of its own
// (two blind readers said so, against an earlier label): no facing
part("tabard", 16, 17, { pivot: [8, 0] },
  poly([2, 0, 13, 0, 15, 16, 0, 16], "w"),
  vline(5, 4, 12, "q"), vline(10, 3, 13, "q"), hline(0, 15, 16, "O"), hline(0, 16, 16, "o"))

// a leg in plate, profile: cuisse, the knee cop pointing forward, greave, sabaton; both legs are
// this drawing (the far one comes out a step darker: the rig's `far`)
part("leg", 10, 34, { facing: "right", pivot: [5, 0], sockets: { front: [10, 33] } },
  poly([1, 0, 8, 0, 8, 15, 2, 15], "3"), ellipse(6, 17, 3, 2, "3"),             // thigh, knee cop
  poly([2, 19, 7, 19, 7, 30, 3, 30], "3"), poly([2, 30, 7, 30, 9, 32, 9, 33, 2, 33], "3"),   // shin, sabaton
  hline(2, 15, 6, "1"), hline(2, 19, 6, "1"), hline(3, 30, 5, "1"))              // plate joints
for (const s of ["", "l_"]) for (const side of ["l", "r"]) sprite(`knight_${s}leg_${side}`, { base: `knight_${s}leg` })

// the right arm: pauldron, the upper arm straight down, the elbow's couter behind, the forearm
// reaching forward to the gauntlet closed on the sword's grip in front of the hip
part("arm_r", 10, 27, { facing: "right", pivot: [4, 0], sockets: { front: [9, 23] } },
  ellipse(4, 3, 4, 3, "3"), rect(0, 3, 9, 3, "3"),                               // pauldron
  rect(2, 6, 5, 7, "3"), ellipse(2, 13, 2, 2, "3"),                              // upper arm, couter
  poly([2, 13, 6, 13, 8, 20, 4, 21], "3"), ellipse(6, 23, 3, 3, "3"),            // forearm, gauntlet
  hline(0, 5, 9, "1"), hline(2, 12, 5, "1"), line(4, 20, 8, 19, "1"))            // plate edges
// the left arm: its pauldron, the upper arm, the forearm forward to the shield's grip; mostly
// behind the body facing right, in front of it (under the shield) facing left
part("arm_l", 10, 16, { facing: "right", pivot: [2, 0], sockets: { front: [10, 14] } },
  ellipse(2, 3, 3, 3, "3"), rect(0, 3, 5, 6, "3"), poly([2, 8, 6, 8, 10, 13, 9, 15, 4, 12], "3"),
  hline(0, 5, 5, "1"))

// a heater shield held up, its face turned a little toward us: a gold rim and a gold cross on blue
part("shield", 12, 20, { pivot: [4, 9] },
  poly([0, 0, 11, 0, 11, 10, 6, 19, 5, 19, 0, 10], "O"), poly([1, 1, 10, 1, 10, 10, 6, 17, 5, 17, 1, 10], "w"),
  rect(5, 3, 2, 11, "O"), rect(2, 6, 8, 2, "O"))                                 // the cross

// a longsword pointing down and forward from the hand: pommel, grip, crossguard square to the
// blade; pivot on the grip, where the gauntlet closes. A 2 px blade is lit with a 1 px rim: with 2,
// each of its pixels sees open space on both sides, and a diagonal leaning the other way (the
// turned knight's) came out lit from the left (describe caught it)
part("sword", 14, 36, { facing: "right", pivot: [2, 3], sockets: { front: [13, 35] }, lit: { ...LIT, reach: 1 } },
  rect(1, 0, 2, 2, "O"), vline(2, 1, 5, "T"), line(0, 6, 5, 4, "O"),             // pommel, grip, crossguard
  line(3, 7, 13, 35, "3", 2))                                                    // the blade

// the cape hanging behind from the shoulders, swinging back in the wind, its folds
part("cape", 14, 44, { pivot: [11, 0] },
  poly([8, 0, 13, 0, 13, 6, 12, 20, 13, 38, 10, 43, 6, 41, 3, 43, 0, 40, 2, 24, 5, 8], "r"),
  line(7, 6, 4, 38, "x"), line(10, 8, 9, 40, "x"))

sheet("knight_parts", ["knight_head", "knight_torso", "knight_tabard", "knight_arm_r", "knight_arm_l", "knight_leg",
  "knight_shield", "knight_sword", "knight_cape"], { pad: 2 })

// ---------------------------------------------------------------- stage 3: assembled, retouched
// The retouch layer goes over the assembled parts: what spans more than one part, or only makes
// sense once they are together (a plume over the helmet and the cape's top). `turn` makes the same
// rig facing left, its slots mirrored: it takes the knight_l_<slot> parts (relit above), puts its
// left side (shield arm, left leg) in front and darkens its right (sword arm, sword) behind, and
// mirrors the retouch. `light` is checked against each part's lit side; `far` darkens the far side.
const PLUME = [[2, 0, "R"], [1, 0, "R"], [0, 1, "r"], [-1, 2, "r"], [-2, 3, "x"], [-3, 5, "x"], [0, 0, "R"], [-1, 1, "R"], [-2, 2, "r"], [-3, 3, "r"], [-4, 4, "x"]]
rig("knight", { w: 60, h: 76, facing: "right", pivot: [X, Y(F.sole)], height: 1.8, light: LIT.light, far: 1, turn: "knight_l", slots: SLOTS },
  ...PLUME.map(([dx, dy, k]) => px(29 + dx, 1 + dy, k)), px(28, 0, "k"), px(30, 0, "k"), px(31, 1, "k"))

// The knight, the finished knight flipped, and the turned rig, on the ground of a world 40 px to
// the meter, lit from the top right. pxl describe reads out which way each faces, which side is
// toward us, whether it's a mirror image, which side it's lit from against the scene's light (the
// flipped one is lit from the left), its size and whether it stands on the ground.
scene("knights", { w: 200, h: 92, bg: "#2a2f3e", world: { scale: 40, light: LIT.light, ground: 84 } },
  rect(0, 84, 200, 8, "T"), hline(0, 84, 200, "L"),
  layer("knights", stamp("knight", 40, 84), stamp("knight", 100, 84, { flip: "x" }), stamp("knight_l", 160, 84)),
  text(40, 2, "RIG", "4", { align: "c" }), text(100, 2, "FLIP", "4", { align: "c" }), text(160, 2, "TURN", "4", { align: "c" }))
