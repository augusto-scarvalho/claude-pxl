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
const OUTLINE = [[-9, -9], [9, -9], [9, 4], [6, 10], [0, 17], [-6, 10], [-9, 4]]
const FIELD = [[-7.5, -7.5], [7.5, -7.5], [7.5, 3.6], [5, 9], [0, 15], [-5, 9], [-7.5, 3.6]]
const GRIP = [3, -3], STRAP = [-5, -3], GRIP_A = [3, -6], GRIP_B = [3, 0], STRAP_A = [-5, -6], STRAP_B = [-5, 0]
// the shield's frame turned with a forearm at angle a: its size, S (a point -> its px), C (-> pixel corners)
const shieldFrame = (a) => {
  const U = [Math.cos(a), Math.sin(a)], V = [-Math.sin(a), Math.cos(a)]
  const turn = ([u, v]) => [u * U[0] + v * V[0], u * U[1] + v * V[1]], TP = OUTLINE.map(turn)
  const x0 = Math.min(...TP.map((p) => p[0])), y0 = Math.min(...TP.map((p) => p[1]))
  return { w: Math.ceil(Math.max(...TP.map((p) => p[0])) - x0) + 1, h: Math.ceil(Math.max(...TP.map((p) => p[1])) - y0) + 1,
    S: (p) => { const [x, y] = turn(p); return [Math.round(x - x0), Math.round(y - y0)] },
    C: (p) => { const [x, y] = turn(p); return [x - x0 + 0.5, y - y0 + 0.5] } }
}
const REST_SHIELD = shieldFrame(Math.atan2(HAND[1] - ELBOW[1], HAND[0] - ELBOW[0]))

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
  shield: { at: [X + 9, Y(F.waist) + 4], size: [REST_SHIELD.w + 2, REST_SHIELD.h + 2], side: "l", out: 20, on: "arm_l.hand",
    faces: { outer: "knight_shield", inner: "knight_shield_back" }, parallel: ["strap", "grip", "arm_l.elbow", "arm_l.hand"] },
  sword:  { at: [X + 1, Y(F.crotch)], size: [17, 37], side: "r", z: -10, on: "arm_r.hand" },
  arm_r:  { at: [X - 1, Y(F.shoulders)], size: [14, 30], side: "r" },
}

// Stage 1: stand-ins only (parts: false), labelled with their slots' first letters.
rig("knight_blocking", { w: 60, h: 76, facing: "right", pivot: [X, Y(F.sole)], parts: false, slots: SLOTS })

// ---------------------------------------------------------------- stage 2: the parts, one by one
// Each part is built from plates, the way armor is: a pauldron and the lames under it, the
// rerebrace, the couter, the vambrace, the gauntlet. Each plate is drawn flat in a mid tone in a
// plate() of its own and lit there (with LIT), so its own edges take the rim light and the shade and
// the plates read as lying over one another. Seams, rivets, trims and slits go on after, unlit (they
// are dark or gold whichever way the light falls). part() makes each part and its twin, facing left
// for the turned knight: the same items drawn mirrored before they're lit, so both are lit from the
// top right, where the scene has the light. A part with a front says so (facing) and marks it with a
// `front` socket on the drawing: describe checks the marker against the label.
// The draw helper is the DSL's own ops, and plate / steel with the part's light; part() makes each part
// and its twin, knight_l_<name>: the same items drawn mirrored before they're lit (twin), so the
// mirrored part is lit from the same side, its pivot, sockets and facing mirrored.
const draw = (lit) => ({ px, rect, hline, vline, line, poly, ellipse, clip,
  plate: (...items) => plate(lit, ...items),                          // a plate, lit on its own
  steel: (...items) => plate({ ...STEEL, reach: lit.reach }, ...items), // steel, harder
})
const part = (name, w, h, o, art) => {
  const { lit = LIT, ...opts } = o
  sprite(`knight_${name}`, { w, h, outline: "k", selout: true, ...opts, twin: `knight_l_${name}` }, ...art(draw(lit)))
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

// the shield's two faces, drawn square to the forearm (shieldFrame, above): outside, a gold rim with
// its rivets and a raised gold cross on blue; inside, planks, the forearm strap and the hand grip
// riveted on. shieldParts draws both for a frame: "shield" + suffix, "shield_back" + suffix
const RIVETS = [[-8, -8], [8, -8], [8, 3], [0, 16], [-8, 3]]
const shieldParts = (suffix, fr) => {
  const o = { pivot: fr.C(GRIP), sockets: { grip: fr.C(GRIP), strap: fr.C(STRAP) } }
  const sh = (d) => ({ poly: (P, c) => d.poly(P.map(fr.S).flat(), c), line: (a, b, c, w = 1) => d.line(...fr.S(a), ...fr.S(b), c, w), field: FIELD.map(fr.S).flat() })
  part("shield" + suffix, fr.w, fr.h, o, (d) => {
    const s = sh(d)
    return [d.plate(s.poly(OUTLINE, "O")), d.plate(s.poly(FIELD, "w")),
      d.plate(d.clip(s.field, s.line([0, -7], [0, 13], "O", 2), s.line([-6, -2], [6, -2], "O", 2))),
      ...RIVETS.map((p) => d.px(...fr.S(p), "o"))]
  })
  part("shield_back" + suffix, fr.w, fr.h, o, (d) => {
    const s = sh(d)
    return [d.plate(s.poly(OUTLINE, "t")), d.plate(s.poly(FIELD, "L")),
      d.clip(s.field, ...[-4, 0, 4].map((u) => s.line([u, -9], [u, 16], "T"))),                  // planks
      d.plate(s.line(STRAP_A, STRAP_B, "T", 2)), d.plate(s.line(GRIP_A, GRIP_B, "T", 2)),          // strap, grip
      ...[STRAP_A, STRAP_B, GRIP_A, GRIP_B].map((p) => d.px(...fr.S(p), "O"))]                        // rivets
  })
}
shieldParts("", REST_SHIELD)

// a longsword pointing down and forward from the hand: a gilt pommel and crossguard, the grip
// wound in leather, a 3 px blade with its fuller down the middle; pivot on the grip. The blade is
// drawn in lines, not lit as a plate (a plate this thin steps into a chain)
part("sword", 15, 35, { facing: "right", pivot: [2, 3], sockets: { front: [14, 34] }, lit: { ...LIT, reach: 1 } }, (d) => [
  // blade: nearly upright, its faces look mostly left and right. Leaning forward (right), its upper
  // face looks up and right, into the light: lit, with glints; its lower face dark. Mirrored, the
  // blade leans left: its upper face now looks left, a little away from the light, and its lower face
  // right, a little toward it (describe caught it the other way round)
  d.line(3, 7, 13, 33, "3", 3),
  (c) => {                                                       // its faces, the fuller, the glints
    const m = c.mirrored
    c.line(4, 7, 14, 33, m ? "2" : "4"); c.line(2, 8, 12, 34, m ? "3" : "2"); c.line(4, 10, 12, 31, "2")
    if (!m) { c.px(5, 9, "5"); c.px(7, 15, "5") }
  },
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

// ---------------------------------------------------------------- stage 4: poses
// A pose is a rig of its own. What moves is drawn from the pose's joints: the sword arm from the
// shoulder to where the pose puts the fist (two bones, the elbow bending down and back), the sword at
// the pose's angle from the fist, each leg from the hip to its foot flat on the ground (the knee
// bending forward). Built plate by plate like the parts above, lit by the same rule, facing right and
// mirrored; of the blade's edges the one looking toward the light in the picture is the lit one, so
// it changes sides as the sword turns. The rest (head, torso, tabard, cape, the shield arm and the
// shield) is the parts above, carried with the body: `bob` lowers it (feet apart need it, and get it
// whether asked or not), `lean` takes the upper body forward. pose() builds a pose's parts and its two
// rigs, knight_<name> and knight_l_<name>, once per distinct pose.
const LU = 12, LF = 11, LT = 14, LS = 15, STAND = 29          // upper arm, forearm, thigh, shin; ankle under the hip
const OX = 25, OY = 36, RW = 110, RH = 112                    // room around the body for a swung sword
const nm = (...v) => v.map((x) => String(Math.round(x)).replace("-", "m")).join("_")
const lerp = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]
// the joints come from ik(a, b, target, bend): two bones from (0, 0) reaching for the target, the
// joint bent to the +angle side (bend 1) or the other; [joint, end]
// the box around some points with r px of room, and a point's pixel in it
const boxOf = (pts, r) => {
  const x0 = Math.floor(Math.min(...pts.map((p) => p[0])) - r), y0 = Math.floor(Math.min(...pts.map((p) => p[1])) - r)
  return { w: Math.ceil(Math.max(...pts.map((p) => p[0])) + r) - x0 + 1, h: Math.ceil(Math.max(...pts.map((p) => p[1])) + r) - y0 + 1,
    P: ([x, y]) => [Math.round(x - x0), Math.round(y - y0)] }
}
// a generated part is made the first time a pose asks for it
const once = (name, make) => { if (!has("knight_" + name)) make(name); return name }

// an arm, from the pauldron's middle to the fist: rerebrace, vambrace, the couter at the elbow, the
// gauntlet's cuff and fist, the lames and the pauldron over them. The sword arm ("arm") as drawn
// above, or the shield arm ("sarm"): shorter, its pauldron taller. `bend` 1 bends the elbow down and
// back, -1 up and forward. Its front is the fist when it is out in front, else the pauldron
const ARMS = { arm: { lu: LU, lf: LF, pr: [4, 3], drop: 4 }, sarm: { lu: 10, lf: 9, pr: [3, 4], drop: 3 } }
const armPart = (hand, kind = "arm", bend = 1) => once(`${kind}_${nm(...hand, bend)}`, (name) => {
  const { lu, lf, pr, drop } = ARMS[kind], s = [0, 0], [e, h] = ik(lu, lf, hand, bend), { w, h: bh, P } = boxOf([s, e, h], 5)
  const S = P(s), E = P(e), H = P(h), front = h[0] > 2 ? [H[0] + 2.5, H[1] + 0.5] : [S[0] + pr[0] + 0.5, S[1] + 0.5]
  part(name, w, bh, { facing: "right", pivot: [S[0], S[1] - drop], sockets: { front, elbow: [E[0] + 0.5, E[1] + 0.5], hand: [H[0] + 0.5, H[1] + 0.5] } }, (d) => [
    d.steel(d.line(...S, ...E, "3", 5)),                                     // rerebrace
    d.steel(d.line(...E, ...H, "3", 4)),                                     // vambrace
    d.steel(d.ellipse(...E, 2, 2, "3")),                                     // couter
    d.steel(d.line(...P(lerp(e, h, 0.55)), ...P(lerp(e, h, 0.8)), "3", 5)),  // cuff
    d.steel(d.ellipse(...H, 2, 2, "3")),                                     // fist
    d.steel(d.line(...P(lerp(s, e, 0.3)), ...P(lerp(s, e, 0.55)), "3", 6)),  // lames
    d.steel(d.ellipse(...S, ...pr, "3")), d.px(S[0] + 1, S[1] - 1, "O")])   // pauldron, rivet
})

// the longsword at any angle (degrees, clockwise from pointing forward), pivot on the grip: pommel,
// the grip wound in leather, the crossguard square to the blade, a 3 px blade and its fuller. Its tip
// is its front only while it points forward: swung back, a sword has no front of the knight's
const swordPart = (deg) => once(`sword_${nm(deg)}`, (name) => {
  const a = (deg * Math.PI) / 180, b = [Math.cos(a), Math.sin(a)], n = [-b[1], b[0]]
  const at = (t, s = 0) => [t * b[0] + s * n[0], t * b[1] + s * n[1]]
  const { w, h, P } = boxOf([at(-4), at(32), at(4, 4), at(4, -4)], 2), G = P([0, 0]), tip = P(at(31))
  part(name, w, h, { facing: "right", pivot: [G[0] + 0.5, G[1] + 0.5],
    ...(b[0] > 0.3 ? { sockets: { front: [tip[0] + 0.5, tip[1] + 0.5] } } : {}), lit: { ...LIT, reach: 1 } }, (d) => [
    (c) => {
      // which edge looks toward the light in the picture (mirrored, x runs the other way)
      const L = [c.mirrored ? -0.6 : 0.6, -1], dot = (n[0] * L[0] + n[1] * L[1]) / Math.hypot(...L), up = dot > 0 ? 1 : -1
      const edge = (s, col) => c.line(...P(at(4.5, s)), ...P(at(31, s)), col)
      c.line(...P(at(4.5)), ...P(at(31)), "3", 3); edge(up, "4"); edge(-up, "2")
      c.line(...P(at(7)), ...P(at(28)), "2")                                                      // fuller
      if (Math.abs(dot) > 0.6) { c.px(...P(at(8, up)), "5"); c.px(...P(at(15, up)), "5") }         // glints
    },
    d.plate(d.line(...P(at(-2)), ...P(at(2)), "T", 2)), d.px(...P(at(-1)), "t"), d.px(...P(at(1)), "t"),
    d.plate(d.line(...P(at(3.5, -3.5)), ...P(at(3.5, 3.5)), "O", 2)), d.plate(d.ellipse(...P(at(-3.5)), 1, 1, "O"))])
})

// a leg from the hip to its foot flat on the ground, the ankle at `ank` from the hip: cuisse, the
// poleyn and its wing at the knee, greave, the sabaton's lames to the toe
const legPart = (ank) => once(`leg_${nm(...ank)}`, (name) => {
  const hip = [0, 0], [k, a] = ik(LT, LS, ank, -1)
  const foot = [[-2.5, 0], [2.5, 0], [4.5, 2], [6.5, 3], [6.5, 4], [-2.5, 4]].map(([x, y]) => [a[0] + x, a[1] + y])
  const { w, h, P } = boxOf([hip, k, ...foot], 4), H = P(hip), K = P(k), A = P(a), toe = P(foot[3])
  part(name, w, h, { facing: "right", pivot: H, sockets: { front: [toe[0] + 0.5, toe[1] + 0.5] } }, (d) => [
    d.steel(d.line(...H, ...K, "3", 6)),                                                          // cuisse
    d.steel(d.line(...K, ...A, "3", 4)),                                                          // greave
    d.steel(d.ellipse(K[0] + 1, K[1], 3, 2, "3")), d.steel(d.ellipse(K[0] - 1, K[1], 2, 2, "3")),  // poleyn, wing
    d.steel(d.poly(foot.map(P).flat(), "3")),                                                     // sabaton
    d.hline(A[0] - 2, A[1] + 2, 5, "1"), d.px(K[0] - 3, K[1] + 2, "T")])
})

// p: { hand: [x, y] from the pauldron's middle, sword: degrees, feet: [[x from its hip, lift] of the
// far (left) foot, of the near (right) one], bob, lean, shield: { hand, bend } (the shield arm's
// fist from its pauldron, and the shield turned with its forearm; none: the arm at rest) } -> the
// pose's name
const bobOf = (p) => Math.max(p.bob ?? 0, ...(p.feet ?? [[0]]).map(([x]) => {
  const v = STAND - Math.sqrt((LT + LS - 0.01) ** 2 - x * x)
  return v > 0.1 ? Math.ceil(v) : 0
}))
const POSES = new Map()
const pose = (p) => {
  const { hand, sword, feet = [[-0.5, 0], [-0.5, 0]], lean = 0 } = p, bob = bobOf(p)
  const key = nm(...hand, sword, ...feet.flat(), lean, bob, ...(p.shield ? [...p.shield.hand, p.shield.bend ?? 1] : []))
  if (POSES.has(key)) return POSES.get(key)
  const name = `pose${POSES.size}`
  POSES.set(key, name)
  const legs = feet.map(([x, lift]) => legPart([x, STAND - bob - lift])), arm = armPart(hand), blade = swordPart(sword)
  const MOVED = { leg_l: [0, bob, legs[0]], leg_r: [0, bob, legs[1]], arm_r: [lean, bob, arm], sword: [lean, bob, blade] }
  let held = ""                                                 // the raised shield's suffix
  if (p.shield) {
    const bend = p.shield.bend ?? 1, [e, h] = ik(ARMS.sarm.lu, ARMS.sarm.lf, p.shield.hand, bend)
    const deg = Math.round((Math.atan2(h[1] - e[1], h[0] - e[0]) * 180) / Math.PI)
    held = `_${nm(deg)}`
    once("shield" + held, () => shieldParts(held, shieldFrame((deg * Math.PI) / 180)))
    MOVED.arm_l = [lean, bob, armPart(p.shield.hand, "sarm", bend)]
  }
  // the slots name their parts (shared by every pose); turned, each is looked up as knight_l_<part>
  const slots = Object.fromEntries(Object.entries(SLOTS).map(([k, s]) => {
    const [dx, dy, own] = MOVED[k] ?? [lean, bob]
    return [k, { ...s, at: [s.at[0] + OX + dx, s.at[1] + OY + dy], part: "knight_" + (own ?? k),
      ...(s.faces ? { faces: { outer: "knight_shield" + held, inner: "knight_shield_back" + held } } : {}) }]
  }))
  rig("knight_" + name, { w: RW, h: RH, facing: "right", pivot: [X + OX, Y(F.sole) + OY], height: 1.8, light: LIT.light, far: 1, slots,
    turn: { name: "knight_l_" + name, parts: ["knight_", "knight_l_"] } },
    ...PLUME.map(([dx, dy, k]) => px(29 + OX + lean + dx, 3 + OY + bob + dy, k)))
  return name
}

// ---------------------------------------------------------------- stage 5: a bout
// The knight and the one turned, a sword's reach apart. Mirror to mirror first: each cut meets the
// other's blade halfway, over the middle, and sparks fly from it (a cut from above, a rising one).
// Then from above onto the shield: the blue one cuts, the red one takes it on its shield, its sword
// already drawn back, and cuts back at once; the blue one takes that on its own. Then both wind up
// all the way and the last clash throws them both back: a draw. They salute, the sword up before the
// visor, and walk back to their marks. Each knight is an anim whose pivot is the middle of the
// lists, so both stamp on the same spot, and so does knight_bout_fx (sparks, dust).
// Its clock, named for the scene that shares it (a file including this one sees these names: included
// files share one scope): BOUT_LOOP frames at 8 fps; the knights stand still until the signal, frame
// BOUT_SIGNAL, which leaves a scene the frames before it for what comes first (a fanfare, the
// marshal's baton); they are back on their marks at BOUT_HOME (set below, where the walk ends).
const BOUT_LOOP = 96, BOUT_SIGNAL = 20
const HALF = 33                                               // each one's mark from the middle
const GUARD = [[-7, 0], [6, 0]], LUNGE = [[-10, 0], [10, 0]]  // the far foot back, the near one forward
const MOVES = {
  rest: { hand: [3.5, 21.5], sword: 69 },
  guardIn: { hand: [8, 10], sword: -60, feet: [[-4, 0], [3, 0]] },
  guard: { hand: [9, 6], sword: -50, feet: GUARD, lean: 1 },
  windHigh: { hand: [-2, -16], sword: -150, feet: GUARD, lean: -1 },
  cut: { hand: [13, -8], sword: -35, feet: LUNGE, bob: 3, lean: 2, arc: 1 },
  recoil: { hand: [10, -8], sword: -75, feet: GUARD },
  // low behind, the arm and the blade in one line, the point toward the ground (the tail guard): with
  // the fist at the hip and the blade level it read as a sword going into its scabbard
  windLow: { hand: [-15, 16], sword: 130, feet: GUARD, lean: 1 },
  rise: { hand: [13, -4], sword: -55, feet: LUNGE, bob: 3, lean: 2, arc: -1 },
  // onto the shield, a slash: from behind the head, through straight up, the edge comes down on the
  // top of the shield. Where it lands the arm still points up and forward and the blade has gone over
  // past it, down: the wrist broken over. Arm and blade in one line would be a thrust. The shield goes
  // up square before the face (the elbow up, the forearm level), the sword drawn back behind the head
  // for the answer
  swing: { hand: [3, -21], sword: -90, feet: GUARD },
  slash: { hand: [12, -18], sword: 15, feet: LUNGE, bob: 3, lean: 2, arc: 1 },
  slashDown: { hand: [14, -11], sword: 45, feet: LUNGE, bob: 3, lean: 2 },
  rebound: { hand: [9, -14], sword: -30, feet: GUARD },
  blockIn: { hand: [3, 2], sword: -110, feet: GUARD, shield: { hand: [9, -4], bend: -1 } },
  block: { hand: [-3, -14], sword: -150, feet: GUARD, bob: 2, lean: 1, shield: { hand: [11, -9], bend: -1 } },
  blockHit: { hand: [-3, -13], sword: -150, feet: GUARD, bob: 3, shield: { hand: [10, -8], bend: -1 } },
  windBig: { hand: [-4, -18], sword: -160, feet: GUARD, lean: -2 },
  big: { hand: [14, -6], sword: -45, feet: [[-12, 0], [11, 0]], bob: 4, lean: 3, arc: 1 },
  thrown: { hand: [-1, -11], sword: -125, feet: [[-9, 0], [8, 0]], lean: -3 },
  stagger: { hand: [7, 8], sword: 25, feet: [[-6, 0], [5, 0]], lean: -1 },
  saluteIn: { hand: [8, 2], sword: -60, feet: [[-3, 0], [2, 0]] },
  salute: { hand: [6, -5], sword: -88, feet: [[-1.5, 0], [0.5, 0]] },
  lower: { hand: [6, 12], sword: 35 },
}
// [frames, the blue one's move, how far forward of its mark, the red one's (default: the same)]
const RUNS = [[BOUT_SIGNAL + 1, "rest", 0], [1, "guardIn", 0], [3, "guard", 0],
  [2, "windHigh", -1], [2, "cut", 4], [1, "recoil", 2], [2, "guard", 0],                         // a cut from above, both
  [2, "windLow", -1], [2, "rise", 6], [1, "recoil", 2], [2, "guard", 0],                         // a rising cut, both
  [1, "windHigh", -1, "guard", 0], [1, "swing", 0, "blockIn", 0], [1, "slash", 6, "block", 0],    // blue cuts onto the shield,
  [1, "slashDown", 6, "blockHit", 0], [1, "rebound", 2, "block", 0], [1, "blockIn", 0, "swing", 0],
  [1, "block", 0, "slash", 6], [1, "blockHit", 0, "slashDown", 6], [1, "block", 0, "rebound", 2],  // red cuts back
  [1, "guard", 0],
  [3, "windBig", -2], [2, "big", 5],                                                             // the last
  [1, "thrown", 1], [1, "thrown", -5], [1, "thrown", -10], [1, "thrown", -13], [1, "thrown", -14],
  [1, "stagger", -14], [2, "guard", -14], [1, "saluteIn", -14], [3, "salute", -14], [1, "lower", -14], [1, "rest", -14]]
const BOUTS = [[], []]                                        // the blue one's frames, the red one's: [pose, dx, move, feet]
for (const [n, mb, db, mr = mb, dr = db] of RUNS)
  for (let i = 0; i < n; i++) { BOUTS[0].push([pose(MOVES[mb]), db, mb]); BOUTS[1].push([pose(MOVES[mr]), dr, mr]) }
// the walk back: three steps (the near foot, the far one, the near one), 4 frames each; the foot on
// the ground stays put while the body goes over it, the other is lifted and swung through
const HIPS = [SLOTS.leg_l.at[0] - X, SLOTS.leg_r.at[0] - X]
let body = -14
const ank = HIPS.map((h) => body + h - 0.5)
for (const [i, len] of [[1, 7], [0, 14], [1, 7]]) {
  const b0 = body, a0 = ank[i]
  for (let k = 1; k <= 4; k++) {
    const t = k / 4, dx = Math.round(b0 + (len / 2) * t)
    body = b0 + (len / 2) * t
    ank[i] = a0 + (len * (1 - Math.cos(Math.PI * t))) / 2
    const feet = HIPS.map((h, j) => [Math.round(ank[j] - dx - h), j === i ? Math.round(3 * Math.sin(Math.PI * t)) : 0])
    for (const b of BOUTS) b.push([pose({ ...MOVES.rest, feet }), dx, "walk", feet])
  }
}
const BOUT_HOME = BOUTS[0].length
for (const b of BOUTS) while (b.length < BOUT_LOOP) b.push([pose(MOVES.rest), 0, "rest"])

const AW = 130, AX = 102, SOLE = Y(F.sole) + OY
anim("knight_bout", { w: AW, h: RH, frames: BOUT_LOOP, fps: 8, pivot: [AX, SOLE], facing: "right", height: 1.8 }, (c) => {
  const [name, dx] = BOUTS[0][c.frame]
  c.stamp("knight_" + name, AX - HALF + dx, SOLE)
})
anim("knight_l_bout", { w: AW, h: RH, frames: BOUT_LOOP, fps: 8, pivot: [AW - AX, SOLE], facing: "left", height: 1.8 }, (c) => {
  const [name, dx] = BOUTS[1][c.frame]
  c.stamp("knight_l_" + name, AW - AX + HALF - dx, SOLE)
})

// Where a blade lands, from the middle of the lists on the ground (y up is negative), as if the blue
// one struck: on the middle line where two blades cross, or at the near edge of the other one's shield.
const handAt = (m, dx) => {
  const [, h] = ik(LU, LF, m.hand, 1)
  return [-HALF + dx - 1 + (m.lean ?? 0) + Math.round(h[0]), -54 + bobOf(m) + Math.round(h[1])]
}
const along = (m, dx, x) => {
  const [hx, hy] = handAt(m, dx), a = (m.sword * Math.PI) / 180
  return [x, Math.round(hy + ((x - hx) / Math.cos(a)) * Math.sin(a))]
}
const shieldEdge = (m, dx) => {                               // the other one's: its fist, less half the shield
  const [, h] = ik(ARMS.sarm.lu, ARMS.sarm.lf, m.shield.hand, m.shield.bend ?? 1)
  return HALF - dx - 1 - (m.lean ?? 0) - Math.round(h[0]) - 8
}
// the frame each blow lands: where, how big, whose front foot stamps (0 the blue one, 1 the red one)
const HITS = []
BOUTS[0].forEach(([, db, mb], f) => {
  const [, dr, mr] = BOUTS[1][f], fresh = (k) => BOUTS[k][f - 1][2] !== BOUTS[k][f][2]
  if (["cut", "rise", "big"].includes(mb) && fresh(0)) HITS.push({ f, big: mb === "big", at: along(MOVES[mb], db, 0), feet: [0, 1] })
  if (mb === "slash" && fresh(0)) HITS.push({ f, shield: true, at: along(MOVES[mb], db, shieldEdge(MOVES[mr], dr)), feet: [0] })
  if (mr === "slash" && fresh(1)) {
    const [x, y] = along(MOVES[mr], dr, shieldEdge(MOVES[mb], db))
    HITS.push({ f, shield: true, at: [-x, y], feet: [1] })
  }
})
// a foot's toe (near) or heel (far) on the ground, from the middle, for the blue one (the red one: -x)
const footAt = ([, dx, m, walk], j) => -HALF + dx + HIPS[j] + (walk ?? MOVES[m].feet ?? [[-0.5], [-0.5]])[j][0] + (j ? 5 : -3)
const toeOf = (k, f, j = 1) => (k ? -1 : 1) * footAt(BOUTS[k][f], j)

// The smear: the frame a blow lands (an arc of 40 degrees or more from the frame before), the path
// of the blade's outer part, a crescent from where it was to where it is, thin at its tail; the
// move's `arc` says which way round it went (a rising cut comes from below behind, not over the top).
// Only the last 100 degrees: a whole half turn in one frame would ring the bodies.
const SMEARS = []
for (const k of [0, 1]) BOUTS[k].forEach(([, dx, m], f) => {
  const was = MOVES[BOUTS[k][f - 1]?.[2]], now = MOVES[m]
  if (!now?.arc || !was || BOUTS[k][f - 1][2] === m) return
  const turn = now.arc * (((now.arc * (now.sword - was.sword)) % 360 + 360) % 360)
  const shown = Math.sign(turn) * Math.min(Math.abs(turn), 100)       // its last 100 degrees at most
  if (Math.abs(turn) >= 40) SMEARS.push({ f, k, at: handAt(now, dx), from: now.sword - shown, turn: shown })
})
// The sparks: the frame the blades hit, a white-hot star; the next, a smaller one, and the sparks
// flying out and falling, gold, then orange, then red, gone in a few frames (the last clash: twice as
// many, flying farther, the star lasting a frame longer; on a shield: fewer, and splinters of its
// wood dropping). Dust: a puff at the front foot as it stamps into each blow, and from all four feet
// as the last clash slides them back; brown, for the scene to swap to its ground.
const FW = 150, FX = 75
anim("knight_bout_fx", { w: FW, h: RH, frames: BOUT_LOOP, fps: 8, pivot: [FX, SOLE] }, (c) => {
  for (const { f, k, at: [hx, hy], from, turn } of SMEARS) {
    if (c.frame !== f) continue
    // round the fist, out to the blade's tip, thickening from the tail to the blade; the red one's mirrored
    const x = FX + (k ? -hx : hx), y = SOLE + hy, a0 = k ? 180 - from : from, a1 = k ? 180 - from - turn : from + turn
    c.arc(x, y, 31, a0, a1, "4", { inner: 22, taper: true }); c.arc(x, y, 31, a0, a1, "5", { inner: 27, taper: true })
  }
  const puff = (x, y, age) => {
    if (age === 0) c.ellipse(x, y, 1, 1, "L")
    else if (age === 1) c.ellipse(x, y - 1, 2, 1, "L")
    else if (age === 2) { c.px(x - 3, y - 1, "T"); c.px(x + 2, y - 2, "T"); c.px(x, y - 3, "T") }
  }
  for (const { f, big, shield, at: [cx, cy], feet } of HITS) {
    const age = c.frame - f, x = FX + cx, y = SOLE + cy, rnd = c.rng(f + 1)
    if (age >= 0 && age < 3) for (const k of feet) puff(FX + toeOf(k, f), SOLE - 1, age)
    if (age < 0 || age > (big ? 6 : 4)) continue
    if (age === 0) {
      const r = big ? 8 : shield ? 4 : 5, q = big ? 4 : 2
      c.line(x - r, y, x + r, y, "Y"); c.line(x, y - r, x, y + r, "Y")
      c.line(x - q, y - q, x + q, y + q, "Y"); c.line(x - q, y + q, x + q, y - q, "Y")
      c.rect(x - 1, y - 1, 3, 3, "5"); c.line(x - r + 3, y, x + r - 3, y, "5"); c.line(x, y - r + 3, x, y + r - 3, "5")
    } else if (age === 1) {
      const r = big ? 6 : 2
      c.line(x - r, y, x + r, y, "Y"); c.line(x, y - r, x, y + r, "Y"); c.px(x, y, "5")
      if (big) { c.rect(x - 1, y - 1, 3, 3, "5"); c.line(x - 2, y - 2, x + 2, y + 2, "Y"); c.line(x - 2, y + 2, x + 2, y - 2, "Y") }
    }
    for (let i = 0; i < (big ? 18 : shield ? 6 : 9); i++) {
      const a = rnd() * Math.PI * 2, v = 2 + rnd() * (big ? 3 : 2), life = 2 + Math.floor(rnd() * (big ? 5 : 3))
      if (age < 1 || age > life) continue
      const p = (t) => [Math.round(x + Math.cos(a) * v * t), Math.round(y + Math.sin(a) * v * t + 0.4 * t * t)]
      c.line(...p(age - 0.7), ...p(age), age < 2 ? "5" : age < 3 ? "Y" : age < 5 ? "O" : "R")
    }
    if (shield) for (let i = 0; i < 4; i++) {                 // splinters: knocked off, falling fast
      const vx = (rnd() - 0.5) * 3, vy = -1 - rnd() * 1.5
      if (age >= 1) c.px(Math.round(x + vx * age), Math.round(y + vy * age + 0.9 * age * age), "o")
    }
  }
  for (const k of [0, 1]) BOUTS[k].forEach((b, f) => {
    if (b[2] === "thrown") for (const j of [0, 1]) puff(FX + toeOf(k, f, j), SOLE - 1, c.frame - f)
  })
})

// every move in a row, and the bout on bare ground
const RED = { q: "x", w: "r", e: "R", x: "q", r: "w", R: "e" }
const SHOWN = ["rest", "guard", "windHigh", "cut", "windLow", "rise", "swing", "slash", "block", "windBig", "big", "thrown", "salute"]
scene("knight_moves", { w: 60 * SHOWN.length, h: 116, bg: "#2a2f3e", world: { scale: 40, light: LIT.light, ground: 108 } },
  rect(0, 108, 60 * SHOWN.length, 8, "T"), hline(0, 108, 60 * SHOWN.length, "L"),
  ...SHOWN.map((m, i) => stamp("knight_" + pose(MOVES[m]), 26 + 60 * i, 108)),
  ...SHOWN.map((m, i) => text(30 + 60 * i, 2, m.toUpperCase(), "4", { align: "c" })))
scene("bout", { w: 240, h: 120, bg: "#2a2f3e", world: { scale: 40, light: LIT.light, ground: 112 } },
  rect(0, 112, 240, 8, "T"), hline(0, 112, 240, "L"),
  layer("knights", stamp("knight_l_bout", 120, 112, { swap: RED }), stamp("knight_bout", 120, 112)),
  layer("fx", { unlit: true }, stamp("knight_bout_fx", 120, 112)))
