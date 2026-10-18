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
// steel takes the light harder than cloth: its corners facing the light flash, those away go dark
const STEEL = { ...LIT, strength: 1.3 }

// The body: 72 px, 6.5 heads (stylized heroic), two rows of margin above the head.
const F = figure(72, 6.5), Y = (y) => 2 + y          // figure's y (from the top of the head) -> rig's
const X = 30                                         // the body's centre line in the rig; the pivot is
                                                     // its sole, so stamp("knight", x, groundY) stands it

// The shield is held by enarmes: a strap the forearm goes through and a grip for the hand, both
// across the forearm, so the shield turns with the forearm: forearm level (on guard), the shield
// stands up; forearm hanging, it lies down. At rest here the left forearm goes down and forward, as
// the arm part draws it (its elbow and hand sockets), and the shield leans with it: its top forward,
// its point back. In its own frame, u runs along the straps (elbow to hand) and v to its point.
const ELBOW = [3.5, 12.5], HAND = [9.5, 19.5]
const A = Math.atan2(HAND[1] - ELBOW[1], HAND[0] - ELBOW[0]), U = [Math.cos(A), Math.sin(A)], V = [-Math.sin(A), Math.cos(A)]
const OUTLINE = [[-9, -9], [9, -9], [9, 4], [6, 10], [0, 17], [-6, 10], [-9, 4]]
const FIELD = [[-7.5, -7.5], [7.5, -7.5], [7.5, 3.6], [5, 9], [0, 15], [-5, 9], [-7.5, 3.6]]
const GRIP = [3, -3], STRAP = [-5, -3], GRIP_A = [3, -6], GRIP_B = [3, 0], STRAP_A = [-5, -6], STRAP_B = [-5, 0]
const turn = ([u, v]) => [u * U[0] + v * V[0], u * U[1] + v * V[1]], TP = OUTLINE.map(turn)
const SX0 = Math.min(...TP.map((p) => p[0])), SY0 = Math.min(...TP.map((p) => p[1]))
const SW = Math.ceil(Math.max(...TP.map((p) => p[0])) - SX0) + 1, SH = Math.ceil(Math.max(...TP.map((p) => p[1])) - SY0) + 1
const S = (p) => { const [x, y] = turn(p); return [Math.round(x - SX0), Math.round(y - SY0)] }   // shield frame -> its px
const C = (p) => { const [x, y] = turn(p); return [x - SX0 + 0.5, y - SY0 + 0.5] }                // -> pixel corners
const shieldPoly = (P, c) => poly(P.map(S).flat(), c)
const shieldLine = (a, b, c, w = 1) => line(...S(a), ...S(b), c, w)
const SHIELD = { pivot: C(GRIP), sockets: { grip: C(GRIP), strap: C(STRAP) } }

// Where each part's joint sits, the part's box (the size to draw it at, its outline included), and
// its side. Far side at -100, the middle at 0, the near side at +100; z adds to that. z is the
// body's layering, the same on both sides (both legs under the tabard): the facing says which is near.
const SLOTS = {
  cape:   { at: [X - 4, Y(F.shoulders) - 1], size: [18, 46], z: -150 },
  leg_l:  { at: [X - 5, Y(F.crotch)], size: [14, 36], side: "l", z: -50 },
  arm_l:  { at: [X + 1, Y(F.shoulders)], size: [14, 24], side: "l" },
  torso:  { at: [X, Y(F.chin)], size: [16, F.crotch - F.chin + 2] },
  head:   { at: [X + 1, Y(F.chin) + 1], size: [17, 14], z: 10 },
  leg_r:  { at: [X + 3, Y(F.crotch)], size: [14, 36], side: "r", z: -50 },
  tabard: { at: [X, Y(F.waist)], size: [18, 19], z: 75 },
  // the shield hangs from the left hand, outside the arm (over it near, under it far); the rig shows
  // the face turned to us: facing right its outer face points away (we see the straps), facing left
  // toward us (the cross); its straps must run along the forearm
  shield: { at: [X + 9, Y(F.waist) + 4], size: [SW + 2, SH + 2], side: "l", out: 20, on: "arm_l.hand",
    faces: { outer: "knight_shield", inner: "knight_shield_back" }, parallel: ["strap", "grip", "arm_l.elbow", "arm_l.hand"] },
  sword:  { at: [X + 1, Y(F.crotch)], size: [17, 37], side: "r", z: -10, on: "arm_r.hand" },
  arm_r:  { at: [X - 1, Y(F.shoulders)], size: [14, 30], side: "r" },
}

// Stage 1: stand-ins only (parts: false), labelled with their slots' first letters.
rig("knight_blocking", { w: 60, h: 76, facing: "right", pivot: [X, Y(F.sole)], parts: false, slots: SLOTS })

// ---------------------------------------------------------------- stage 2: the parts, one by one
// Each part is built from plates, the way armor is: a pauldron and the lames under it, the
// rerebrace, the couter, the vambrace, the gauntlet. Each plate is drawn flat in a mid tone on a layer
// of its own and lit there (relight with LIT), so its own edges take the rim light and the shade and
// the plates read as lying over one another. Seams, rivets, trims and slits go on after, unlit (they
// are dark or gold whichever way the light falls). part() builds each part twice from the same
// drawing: as drawn, facing right, and with every x mirrored, facing left, for the turned knight;
// both lit from the top right, where the scene has the light. A part with a front says so (facing)
// and marks it with a `front` socket on the drawing: describe checks the marker against the label.
let PLATES = 0
const draw = (w, m, lit) => {
  const X = (x) => (m ? w - 1 - x : x), XS = (p) => p.map((v, i) => (i % 2 ? v : X(v)))
  return {
    m,                                                  // drawn mirrored (facing left)
    px: (x, y, c) => px(X(x), y, c),
    rect: (x, y, rw, rh, c) => rect(m ? w - x - rw : x, y, rw, rh, c),
    hline: (x, y, n, c) => hline(m ? w - x - n : x, y, n, c),
    vline: (x, y, n, c) => vline(X(x), y, n, c),
    line: (x0, y0, x1, y1, c, wd = 1) => line(X(x0), y0, X(x1), y1, c, wd),
    poly: (p, c) => poly(XS(p), c),
    ellipse: (cx, cy, rx, ry, c) => ellipse(X(cx), cy, rx, ry, c),
    clip: (p, ...items) => clip(XS(p), ...items),
    // a plate: its own layer, lit on its own; steel harder
    plate: (...items) => layer(`plate${PLATES++}`, ...items, relight(undefined, lit)),
    steel: (...items) => layer(`plate${PLATES++}`, ...items, relight(undefined, { ...STEEL, reach: lit.reach })),
  }
}
const part = (name, w, h, o, art) => {
  const { lit = LIT, ...opts } = o
  const m = (p) => p && [w - p[0], p[1]]
  sprite(`knight_${name}`, { w, h, outline: "k", selout: true, ...opts }, ...art(draw(w, false, lit)))
  sprite(`knight_l_${name}`, { w, h, outline: "k", selout: true, ...opts, ...(opts.facing ? { facing: "left" } : {}), pivot: m(opts.pivot),
    ...(opts.sockets ? { sockets: Object.fromEntries(Object.entries(opts.sockets).map(([k, p]) => [k, m(p)])) } : {}) }, ...art(draw(w, true, lit)))
}

// a hounskull bascinet in profile: the round skull, the pointed visor over the face with its sight
// slit and breaths, the gilt rivet of its hinge at the temple, a gorget lame at the neck
part("head", 15, 12, { facing: "right", pivot: [6, 12], sockets: { front: [14, 8] } }, (d) => [
  d.steel(d.ellipse(6, 5, 5, 5, "3")),                                            // skull
  d.steel(d.poly([5, 3, 9, 2, 12, 5, 14, 7, 12, 9, 9, 10, 6, 10], "3")),         // visor, its snout forward
  d.steel(d.rect(3, 10, 7, 2, "3")),                                              // a gorget lame over the collar
  d.line(7, 5, 12, 6, "k"), d.px(11, 8, "1"), d.px(12, 8, "1"), d.px(10, 9, "1"),   // the slit, the breaths
  d.px(4, 7, "O")])                                                               // the hinge

// the chest under a blue surcoat: the gorget's steel at the neck with a gold trim, the cloth over
// the chest's swell, a fold falling from under it, the belt with its buckle
part("torso", 14, F.crotch - F.chin, { facing: "right", pivot: [7, 0], sockets: { front: [14, 10] } }, (d) => [
  d.steel(d.poly([4, 0, 10, 0, 11, 2, 3, 2], "3")),                                                // gorget
  d.plate(d.poly([3, 2, 9, 2, 10, 14, 11, 16, 12, 22, 12, 25, 2, 25, 2, 18, 1, 12, 1, 7, 2, 4], "w")),   // back, stomach
  d.plate(d.poly([8, 2, 10, 2, 12, 5, 13, 9, 13, 12, 12, 14, 10, 15, 8, 12], "w")),                    // the chest's swell
  d.hline(4, 2, 7, "O"),                                                                           // trim
  d.line(10, 13, 9, 15, "q"), d.line(4, 7, 3, 14, "q"),                                            // folds
  d.plate(d.poly([1, 16, 12, 16, 12, 18, 1, 18], "T")), d.plate(d.rect(9, 15, 3, 4, "O"))])        // belt, buckle

// the surcoat's skirt: a back panel and a narrow front flap, split where the leg moves; folds
// hanging, a gold hem. It has no front of its own (two blind readers said so): no facing
part("tabard", 16, 17, { pivot: [8, 0] }, (d) => [
  d.plate(d.poly([2, 0, 11, 0, 11, 16, 0, 16], "w")),
  d.plate(d.poly([11, 0, 13, 0, 15, 16, 11, 16], "w")),
  d.line(5, 2, 3, 14, "q"), d.line(8, 1, 8, 14, "q"),
  d.plate(d.rect(0, 15, 16, 2, "O"))])

// a leg in plate, profile: the cuisse over the thigh, the poleyn at the knee with its round wing,
// the greave swelling over the calf, the sabaton's lames down to a pointed toe. Both legs are this
// drawing (the far one comes out a step darker: the rig's `far`)
part("leg", 12, 34, { facing: "right", pivot: [5, 0], sockets: { front: [12, 33] } }, (d) => [
  d.steel(d.poly([1, 0, 8, 0, 9, 5, 8, 12, 2, 13, 1, 6], "3")),                  // cuisse
  d.steel(d.poly([3, 16, 7, 16, 7, 28, 6, 29, 3, 29, 2, 25, 1, 21, 2, 18], "3")),   // greave
  d.steel(d.ellipse(6, 14, 3, 2, "3")), d.steel(d.ellipse(4, 14, 2, 2, "3")),    // poleyn, its wing
  d.steel(d.poly([2, 29, 7, 29, 9, 31, 11, 32, 11, 33, 2, 33], "3")),           // sabaton
  d.hline(3, 31, 5, "1"), d.px(1, 16, "T"), d.px(1, 17, "T")])                   // its lames, the knee strap
for (const s of ["", "l_"]) for (const side of ["l", "r"]) sprite(`knight_${s}leg_${side}`, { base: `knight_${s}leg` })

// the right arm: the pauldron and its two lames, the rerebrace down to the couter behind the elbow
// with its fan, the vambrace reaching forward, the gauntlet's flared cuff and the fist closed on the
// sword's grip in front of the hip
part("arm_r", 12, 28, { facing: "right", pivot: [5, 0], sockets: { front: [12, 25], hand: [8.5, 25.5] } }, (d) => [
  d.steel(d.rect(3, 8, 5, 7, "3")),                                               // rerebrace
  d.steel(d.line(4, 16, 8, 22, "3", 4)),                                          // vambrace
  d.steel(d.ellipse(4, 16, 2, 2, "3")), d.steel(d.poly([2, 14, 5, 15, 3, 19, 1, 17], "3")),   // couter, fan
  d.steel(d.ellipse(8, 25, 3, 2, "3")), d.steel(d.poly([6, 21, 10, 20, 11, 23, 7, 24], "3")), // fist, cuff
  d.steel(d.poly([2, 9, 8, 9, 7, 11, 3, 11], "3")), d.steel(d.poly([1, 6, 9, 6, 9, 8, 8, 9, 2, 9, 1, 8], "3")),  // lames
  d.steel(d.ellipse(5, 4, 4, 3, "3")),                                            // pauldron
  d.px(10, 25, "1"), d.px(10, 26, "1"), d.px(6, 3, "O")])                         // knuckles, rivet
// the left arm at rest, carrying the shield: the same plates, the forearm down and forward from the
// elbow to the fist on the shield's grip (ELBOW and HAND, which the shield is drawn from)
part("arm_l", 12, 22, { facing: "right", pivot: [3, 0], sockets: { front: [11, 20], elbow: ELBOW, hand: HAND } }, (d) => [
  d.steel(d.rect(1, 7, 5, 5, "3")),                                               // rerebrace
  d.steel(d.line(3, 12, 9, 19, "3", 4)),                                          // vambrace
  d.steel(d.ellipse(3, 12, 2, 2, "3")), d.steel(d.ellipse(9, 19, 2, 2, "3")),    // couter, fist
  d.steel(d.poly([0, 5, 6, 5, 5, 8, 1, 8], "3")), d.steel(d.ellipse(3, 3, 3, 4, "3"))])   // lame, pauldron

// the shield's two faces, drawn square to the forearm (SHIELD, above): outside, a gold rim with its
// rivets and a raised gold cross on blue; inside, planks, the forearm strap and the hand grip riveted on
const sh = (d) => ({ poly: (P, c) => d.poly(P.map(S).flat(), c), line: (a, b, c, w = 1) => d.line(...S(a), ...S(b), c, w), field: FIELD.map(S).flat() })
const RIVETS = [[-8, -8], [8, -8], [8, 3], [0, 16], [-8, 3]]
part("shield", SW, SH, SHIELD, (d) => {
  const s = sh(d)
  return [d.plate(s.poly(OUTLINE, "O")), d.plate(s.poly(FIELD, "w")),
    d.plate(d.clip(s.field, s.line([0, -7], [0, 13], "O", 2), s.line([-6, -2], [6, -2], "O", 2))),
    ...RIVETS.map((p) => d.px(...S(p), "o"))]
})
part("shield_back", SW, SH, SHIELD, (d) => {
  const s = sh(d)
  return [d.plate(s.poly(OUTLINE, "t")), d.plate(s.poly(FIELD, "L")),
    d.clip(s.field, ...[-4, 0, 4].map((u) => s.line([u, -9], [u, 16], "T"))),                  // planks
    d.plate(s.line(STRAP_A, STRAP_B, "T", 2)), d.plate(s.line(GRIP_A, GRIP_B, "T", 2)),          // strap, grip
    ...[STRAP_A, STRAP_B, GRIP_A, GRIP_B].map((p) => d.px(...S(p), "O"))]                        // rivets
})

// a longsword pointing down and forward from the hand: a gilt pommel and crossguard, the grip
// wound in leather, a 3 px blade with its fuller down the middle; pivot on the grip. The blade is
// drawn in lines, not lit as a plate (a plate this thin steps into a chain)
part("sword", 15, 35, { facing: "right", pivot: [2, 3], sockets: { front: [14, 34] }, lit: { ...LIT, reach: 1 } }, (d) => [
  // blade: nearly upright, its faces look mostly left and right. Leaning forward (right), its upper
  // face looks up and right, into the light: lit, with glints; its lower face dark. Mirrored, the
  // blade leans left: its upper face now looks left, a little away from the light, and its lower face
  // right, a little toward it (describe caught it the other way round)
  d.line(3, 7, 13, 33, "3", 3), d.line(4, 7, 14, 33, d.m ? "2" : "4"), d.line(2, 8, 12, 34, d.m ? "3" : "2"),
  d.line(4, 10, 12, 31, "2"), ...(d.m ? [] : [d.px(5, 9, "5"), d.px(7, 15, "5")]),   // fuller, glints
  d.plate(d.line(2, 1, 2, 5, "T", 2)), d.px(2, 2, "t"), d.px(2, 4, "t"),         // grip and its binding
  d.plate(d.line(0, 7, 6, 4, "O", 2)), d.plate(d.ellipse(2, 1, 1, 1, "O"))])      // crossguard, pommel

// the cape hanging from a gold clasp at the shoulder and swinging back in the wind: two panels of
// cloth, the front one over the back one, each catching the light on its own edge; the darker
// lining shows along the back edge where the wind lifts it
part("cape", 16, 44, { pivot: [12, 0] }, (d) => [
  d.plate(d.poly([6, 3, 11, 3, 8, 22, 5, 40, 2, 43, 0, 40, 1, 28, 3, 14], "r")),
  d.plate(d.poly([10, 0, 15, 0, 15, 10, 14, 24, 15, 38, 12, 43, 8, 41, 9, 22], "r")),
  d.line(1, 29, 3, 15, "x"), d.line(0, 40, 1, 30, "x"),                           // the lining at the back edge
  d.plate(d.ellipse(13, 1, 1, 1, "O"))])

sheet("knight_parts", ["knight_head", "knight_torso", "knight_tabard", "knight_arm_r", "knight_arm_l", "knight_leg",
  "knight_shield", "knight_shield_back", "knight_sword", "knight_cape"], { pad: 2 })

// ---------------------------------------------------------------- stage 3: assembled, retouched
// The retouch layer goes over the assembled parts: what spans more than one part, or only makes
// sense once they are together (a plume over the helmet and the cape's top). `turn` makes the same
// rig facing left, its slots mirrored: it takes the knight_l_<slot> parts (relit above), puts its
// left side (shield arm, left leg) in front and darkens its right (sword arm, sword) behind, and
// mirrors the retouch. `light` is checked against each part's lit side; `far` darkens the far side.
// the plume: a feather from a holder at the back of the skull's crown, curling back over the cape
const PLUME = [[0, 0, "x"], [0, -1, "R"], [-1, -2, "R"], [-2, -2, "R"], [-3, -2, "r"], [-4, -1, "r"], [-5, 0, "r"], [-6, 1, "x"], [-7, 2, "x"],
  [-1, -1, "r"], [-2, -1, "r"], [-3, -1, "x"], [-4, 0, "x"], [-5, 1, "x"], [1, -1, "k"], [0, -2, "k"], [-1, -3, "k"], [-2, -3, "k"], [-3, -3, "k"]]
rig("knight", { w: 60, h: 76, facing: "right", pivot: [X, Y(F.sole)], height: 1.8, light: LIT.light, far: 1, turn: "knight_l", slots: SLOTS },
  ...PLUME.map(([dx, dy, k]) => px(29 + dx, 3 + dy, k)))

// The knight, the finished knight flipped, and the turned rig, on the ground of a world 40 px to
// the meter, lit from the top right. pxl describe reads out which way each faces, which side is
// toward us, whether it's a mirror image, which side it's lit from against the scene's light (the
// flipped one is lit from the left), its size and whether it stands on the ground.
scene("knights", { w: 200, h: 92, bg: "#2a2f3e", world: { scale: 40, light: LIT.light, ground: 84 } },
  rect(0, 84, 200, 8, "T"), hline(0, 84, 200, "L"),
  layer("knights", stamp("knight", 40, 84), stamp("knight", 100, 84, { flip: "x" }), stamp("knight_l", 160, 84)),
  text(40, 2, "RIG", "4", { align: "c" }), text(100, 2, "FLIP", "4", { align: "c" }), text(160, 2, "TURN", "4", { align: "c" }))
