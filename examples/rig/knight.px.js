// The knight of lib/characters/knight.px.js (a 72 px knight built skeleton first, its poses and a bout),
// to look at. The tournament (tournament.px.js) includes this file.
include("../../lib/characters/knight.px.js", { palette: true })
const { BOUT_LOOP, BOUT_SIGNAL, BOUT_HOME, RED } = knight   // their old names, for the files that include this one

// The knight, the finished knight flipped, and the turned rig, on the ground of a world 40 px to
// the meter, lit from the top right. pxl describe reads out which way each faces, which side is
// toward us, whether it's a mirror image, which side it's lit from against the scene's light (the
// flipped one is lit from the left), its size and whether it stands on the ground.
scene("knights", { w: 200, h: 92, bg: "#2a2f3e", world: { scale: 40, light: knight.LIT.light, ground: 84 } },
  rect(0, 84, 200, 8, "T"), hline(0, 84, 200, "L"),
  layer("knights", stamp("knight", 40, 84), stamp("knight", 100, 84, { flip: "x" }), stamp("knight_l", 160, 84)),
  text(40, 2, "RIG", "4", { align: "c" }), text(100, 2, "FLIP", "4", { align: "c" }), text(160, 2, "TURN", "4", { align: "c" }))

// every move in a row, and the bout on bare ground
const SHOWN = ["rest", "guard", "windHigh", "cut", "windLow", "rise", "swing", "slash", "block", "windBig", "big", "thrown", "salute"]
scene("knight_moves", { w: 60 * SHOWN.length, h: 116, bg: "#2a2f3e", world: { scale: 40, light: knight.LIT.light, ground: 108 } },
  rect(0, 108, 60 * SHOWN.length, 8, "T"), hline(0, 108, 60 * SHOWN.length, "L"),
  ...SHOWN.map((m, i) => stamp("knight_" + knight.poseOf(knight.MOVES[m]), 26 + 60 * i, 108)),
  ...SHOWN.map((m, i) => text(30 + 60 * i, 2, m.toUpperCase(), "4", { align: "c" })))
scene("bout", { w: 240, h: 120, bg: "#2a2f3e", world: { scale: 40, light: knight.LIT.light, ground: 112 } },
  rect(0, 112, 240, 8, "T"), hline(0, 112, 240, "L"),
  layer("knights", stamp("knight_l_bout", 120, 112, { swap: RED }), stamp("knight_bout", 120, 112)),
  layer("fx", { unlit: true }, stamp("knight_bout_fx", 120, 112)))
