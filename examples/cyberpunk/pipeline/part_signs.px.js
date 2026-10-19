// signs: the street's lights coming on. A video billboard on B's roof, a pole sign in the lot, a neon
// blade on the laundromat, the shop neons and a holo-ad over the liquor store (plan.md, part 5).
// The low sun at the upper left rims the top and left edges of what stands above row 100; the signs
// light themselves. 12 fps, 240 frames, every cycle a divisor of 240.
include("palette.px.js", { palette: true })

const SIGNS_N = 240, SIGNS_FPS = 12
// a fixed hash in [0, 1): seeded flicker without Math.random
const SIGNS_HASH = (n) => {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b) >>> 0
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

// ================================================================ billboard (B's roof)
// Box 52x36, pivot bottom: the legs stand on B's roof (row 94). The 48x22 video panel is box
// x 2-49, rows 2-23 (scene x 66-113, rows 60-81).
sprite("_signs_bb_struct", { w: 52, h: 36 },
  // the steel frame round the panel, its top and left caught by the low sun
  rect(1, 1, 50, 24, "C"), hline(1, 1, 50, "L"), vline(1, 2, 23, "E"), vline(50, 2, 23, "K"),
  px(10, 0, "c"), px(41, 0, "c"),                                          // lifting eyes
  // the catwalk under the panel, a grating whose top takes the sky
  hline(0, 25, 52, "e"), px(0, 25, "E"), hline(0, 26, 52, "C"),
  (c) => { for (let x = 1; x < 52; x += 3) c.px(x, 26, "K") },
  // three legs on the roof, cross-braced, on base plates
  ...[8, 25, 42].flatMap((x) => [rect(x, 27, 2, 9, "C"), vline(x, 27, 9, "E"), hline(x - 1, 35, 4, "K")]),
  line(10, 28, 24, 34, "K"), line(10, 34, 24, 28, "K"), line(27, 28, 41, 34, "K"), line(27, 34, 41, 28, "K"),
  // service ladder up the right side; the lamps' conduit down the left leg
  vline(46, 27, 9, "c"), vline(48, 27, 9, "c"), ...[28, 30, 32, 34].map((y) => px(47, y, "C")),
  vline(11, 27, 8, "K"), px(11, 26, "K"))

// two flood lamps on the catwalk, their lenses turned up at the panel
sprite("_signs_bb_lamps", { w: 52, h: 36 },
  ...[11, 37].flatMap((x) => [hline(x + 1, 22, 2, "A"), px(x, 23, "C"), hline(x + 1, 23, 2, "a"), px(x + 3, 23, "C"), hline(x, 24, 4, "K")]))

// ad 1, on teal: a bleached grin in mirror shades under the sun; sunscreen, ironically
sprite("_signs_face_sun", { mx: true }, `
  ....UYY
  ..UYYYY
  .UYYUYY
  .UYU888
  .UU8888
  .Ukkkkk
  .8kJJYk
  .8kJJJk
  .88kkk8
  .788888
  ..7888L
  ..7kkkk
  ..7kLLL
  ..78kLL
  ...78kk
  ...7888
  ....777
  .....77`)
sprite("_signs_ad_sun", { w: 48, h: 22 },
  grad(0, 0, 48, 22, "jtt"),
  circ(40, 6, 4, "Y"),
  stamp("_signs_face_sun", 3, 2),
  poly([0, 22, 4, 19, 10, 19, 17, 19, 19, 22], "7"), hline(5, 21, 4, "M"), hline(11, 21, 4, "M"),   // shoulders, a red tank top
  text(21, 4, "SPF", "U"), text(21, 11, "200", "M"),
  // the bottle
  rect(35, 12, 3, 2, "m"), rect(34, 14, 5, 7, "U"), rect(34, 16, 5, 2, "t"), vline(38, 14, 7, "u"))
const SIGNS_SUN_RAYS = [[[40, 0], [40, 12], [34, 6], [46, 6]], [[36, 2], [44, 2], [36, 10], [44, 10]]]

// ad 2, on grimy red: a chunky wedge car, speed lines behind it
sprite("_signs_ad_car", { w: 48, h: 22 },
  grad(0, 0, 48, 19, "Mmmr"), rect(0, 19, 48, 3, "R"),
  text(2, 2, "KORVA", "U"), hline(2, 8, 19, "u"),
  poly([13, 11, 36, 11, 46, 13, 46, 18, 13, 18], "C"),                     // body
  poly([17, 11, 22, 7, 33, 7, 37, 11], "K"),                               // cabin
  poly([19, 11, 23, 8, 27, 8, 27, 11], "J"), poly([28, 11, 28, 8, 32, 8, 35, 11], "J"),
  hline(23, 7, 10, "e"), hline(13, 11, 23, "e"), hline(13, 13, 33, "L"),   // roofline, shoulder, chrome
  rect(13, 16, 33, 2, "K"), rect(13, 13, 1, 2, "M"), px(45, 14, "Y"),      // sill, taillight, headlight
  hline(14, 19, 32, "k"), circ(19, 17, 2, "k"), circ(40, 17, 2, "k"))

// ad 3, on dusty yellow: a head in profile with a teal chip at the temple
// the head in profile, facing right: [back, front] of each row (skull, brow, nose, lips, chin, neck, shoulders)
const SIGNS_PROFILE = [[5, 9], [3, 11], [2, 12], [1, 13], [1, 13], [0, 14], [0, 14], [0, 15], [0, 13], [0, 14], [1, 15],
  [1, 16], [2, 13], [2, 14], [3, 13], [3, 14], [4, 14], [5, 12], [5, 9], [5, 9], [4, 11], [1, 15]]
sprite("_signs_ad_mind", { w: 48, h: 22 },
  rect(0, 0, 48, 22, "U"), rect(0, 19, 48, 3, "u"),
  (c) => SIGNS_PROFILE.forEach(([l, r], y) => c.hline(6 + l, y, r - l + 1, "T")),
  hline(8, 7, 5, "Z"), vline(10, 3, 4, "Z"), px(10, 3, "z"), px(8, 7, "z"),   // traces over the skull
  rect(13, 6, 3, 3, "z"),                                                  // the chip at the temple
  text(26, 4, "THINK", "T"), text(26, 11, "+50%", "m"),
  rect(26, 18, 19, 2, "T"), hline(27, 18, 6, "t"))

const SIGNS_ADS = ["_signs_ad_sun", "_signs_ad_car", "_signs_ad_mind"]
// what moves inside each ad, at panel origin (ox, oy)
const SIGNS_AD_LIVE = [
  (c, f, ox, oy) => SIGNS_SUN_RAYS.forEach((set, i) => set.forEach(([x, y]) => c.px(ox + x, oy + y, (f >> 3) % 2 === i ? "Y" : "U"))),
  (c, f, ox, oy) => {
    for (let x = 0; x < 13; x++) for (const [y, len] of [[10, 7], [13, 5], [15, 8]])
      if ((x + 2 * f + y) % 16 < len) c.px(ox + x, oy + y, "U")
    for (let x = 0; x < 48; x++) if ((x + 3 * f) % 12 < 5) c.px(ox + x, oy + 20, "m")
    for (const wx of [19, 40]) c.px(ox + wx + (f % 2), oy + 17, "e")
  },
  (c, f, ox, oy) => {
    if (f % 24 < 12) c.px(ox + 14, oy + 7, "x")
    const t = f % 12                                                       // a pulse runs back along the trace
    if (t < 5) c.px(ox + 12 - t, oy + 7, "x")
  },
]
const SIGNS_PANEL = (c, i, f, dx = 0) => { c.stamp(SIGNS_ADS[i], 2 + dx, 2); SIGNS_AD_LIVE[i](c, f, 2 + dx, 2) }
// a band of the panel's rows drawn from ad i, shifted dx
const SIGNS_BAND = (c, i, f, y0, h, dx) => c.clip([2, 2 + y0, 48, h], () => { c.rect(2, 2 + y0, 48, h, "k"); SIGNS_PANEL(c, i, f, dx) })

anim("signs_billboard", { w: 52, h: 36, frames: SIGNS_N, fps: SIGNS_FPS, pivot: "bottom" },
  layer("struct", stamp("_signs_bb_struct", 0, 0)),
  layer("ad", (c) => c.clip([2, 2, 48, 22], () => {
    const f = c.frame, cur = Math.floor(f / 80), nxt = (cur + 1) % 3, g = f % 80 - 76
    if (g < 0) return SIGNS_PANEL(c, cur, f)
    // the change: four frames of scanline glitch
    if (g === 0) { SIGNS_PANEL(c, cur, f); SIGNS_BAND(c, cur, f, 3, 3, 2); SIGNS_BAND(c, cur, f, 12, 3, -3) }
    if (g === 1) { SIGNS_PANEL(c, cur, f); for (let y = 0; y < 22; y += 4) SIGNS_BAND(c, nxt, f, y, 2, 1); c.hline(2, 11, 48, "J") }
    if (g === 2) { SIGNS_PANEL(c, nxt, f); SIGNS_BAND(c, nxt, f, 6, 3, -2); SIGNS_BAND(c, nxt, f, 16, 4, 3); c.hline(2, 5, 48, "k") }
    if (g === 3) { SIGNS_PANEL(c, nxt, f); for (let y = 2; y < 24; y += 3) c.hline(2, y, 48, "k") }
  })),
  // the floods light a patch of the panel just above them
  layer("flood", { light: true }, poly([11, 24, 15, 24, 16, 21, 10, 21], "k"), poly([37, 24, 41, 24, 42, 21, 36, 21], "k")),
  layer("lamps", stamp("_signs_bb_lamps", 0, 0)))

// ================================================================ pole sign (in the lot)
// Box 24x80, pivot bottom on the lot ground (scene 146, 132). Pole box x 10-13 (scene 144-147).
// Above box row 48 (scene row 100) the sun still rims top and left edges.
sprite("_signs_arrow", { w: 24, h: 15 }, (c) => {
  c.poly([0, 7, 9, 0, 9, 4, 24, 4, 24, 11, 9, 11, 9, 15, 0, 8], "r")
  const edge = []
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    if (!c.is(x, y, "r")) continue
    if (c.is(x, y - 1, ".") || c.is(x - 1, y, ".")) edge.push([x, y, "M"])         // toward the sun
    else if (c.is(x, y + 1, ".") || c.is(x + 1, y, ".")) edge.push([x, y, "R"])
  }
  for (const [x, y, k] of edge) c.px(x, y, k)
  c.hline(10, 6, 13, "m"); c.hline(10, 8, 13, "R")                        // the bulb channel along the shaft
})
// the arrow's bulbs, in chase order toward the tip
const SIGNS_BULBS = [...[22, 20, 18, 16, 14, 12, 10].map((x) => [[x, 7]]), [[7, 3], [7, 11]], [[5, 5], [5, 9]], [[3, 7]]]
const SIGNS_CHASE = ["A", "a", "o", "O"]
// cabinet letters: dark until 60, each stutters on in turn, all dark again at 228
const SIGNS_PARK_ON = (f, i) => {
  if (f >= 228 || f < 60) return false
  const t = f - (60 + 7 * i)
  return t >= 6 || (t >= 0 && [1, 0, 1, 1, 0, 1][t] === 1)
}
sprite("_signs_pylon_static", { w: 24, h: 80 },
  // the pole: steel in shade, its left edge sun-lit up high and sky-lit below
  rect(10, 14, 4, 62, "c"), vline(10, 14, 34, "E"), vline(10, 48, 28, "e"), vline(13, 14, 62, "C"),
  px(12, 37, "m"), vline(12, 38, 3, "r"),                                  // a rust run from the panel's bolt
  rect(14, 58, 3, 5, "t"), hline(14, 58, 3, "j"), px(16, 62, "T"), vline(15, 63, 13, "K"),   // junction box, conduit
  rect(10, 66, 3, 3, "u"), px(11, 67, "s"), px(12, 71, "M"), px(10, 72, "U"),               // flyers and stickers
  rect(7, 76, 10, 4, "c"), hline(7, 76, 10, "e"), hline(7, 79, 10, "C"), px(8, 77, "K"), px(15, 77, "K"),   // footing
  stamp("_signs_arrow", 0, 0),
  // the cabinet
  rect(1, 16, 22, 11, "K"), hline(1, 16, 22, "L"), vline(1, 17, 10, "E"), vline(22, 17, 10, "C"), hline(1, 26, 22, "C"),
  // the teal panel under it: a car and "24"
  rect(3, 29, 18, 8, "T"), hline(3, 29, 18, "L"), vline(3, 30, 6, "E"), vline(20, 30, 6, "C"), hline(3, 36, 18, "C"))
const SIGNS_CAR_GLYPH = [[1, 0], [2, 0], [3, 0], [4, 0], [0, 1], [1, 1], [3, 1], [5, 1], [6, 1], [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2]]

anim("signs_pylon", { w: 24, h: 80, frames: SIGNS_N, fps: SIGNS_FPS, pivot: "bottom" },
  stamp("_signs_pylon_static", 0, 0),
  (c) => {
    const f = c.frame, step = f >> 1
    SIGNS_BULBS.forEach((group, i) => group.forEach(([x, y]) => c.px(x, y, SIGNS_CHASE[(((step - i) % 4) + 4) % 4])))
    // "PARK", the letters coming on one by one
    for (let i = 0; i < 4; i++) c.text(4 + 4 * i + (i > 1 ? 1 : 0), 19, "PARK"[i], SIGNS_PARK_ON(f, i) ? "p" : "r")
    for (let i = 0; i < 4; i++) { const x = 4 + 4 * i + (i > 1 ? 1 : 0); if (SIGNS_PARK_ON(f, i) && c.is(x + 1, 19, "p")) c.px(x + 1, 19, "P") }
    // the teal panel stays on, with a buzz now and then
    const teal = SIGNS_HASH(f + 77) < 0.04 ? "Z" : "z"
    SIGNS_CAR_GLYPH.forEach(([x, y]) => c.px(5 + x, 31 + y, teal)); c.px(6, 34, "x"); c.px(10, 34, "x")
    c.text(14, 30, "24", teal)
  })

// ================================================================ blade sign (E's facade)
// Box 10x32, top-left at scene (274, 80). It hangs from a bracket on row 0.
const SIGNS_GLYPHS = {
  W: ["p...p", "p...p", "p.p.p", "p.p.p", ".p.p."],
  A: [".ppp.", "p...p", "ppppp", "p...p", "p...p"],
  S: [".pppp", "p....", ".ppp.", "....p", "pppp."],
  H: ["p...p", "p...p", "ppppp", "p...p", "p...p"],
}
const SIGNS_GLYPH = (c, ch, x, y, k, hot) => SIGNS_GLYPHS[ch].forEach((row, j) => [...row].forEach((v, i) => {
  if (v === "p") c.px(x + i, y + j, hot && (i + j) % 4 === 1 ? hot : k)
}))
sprite("_signs_blade_box", { w: 10, h: 32 },
  hline(0, 0, 10, "L"), px(9, 0, "E"), px(2, 1, "C"), px(7, 1, "C"),        // bracket arm and hangers
  rect(0, 2, 10, 30, "K"), hline(0, 2, 10, "L"), vline(0, 3, 17, "E"), vline(0, 20, 12, "e"),
  vline(9, 3, 29, "C"), hline(0, 31, 10, "C"), px(9, 31, "k"))
anim("signs_blade", { w: 10, h: 32, frames: SIGNS_N, fps: SIGNS_FPS },
  stamp("_signs_blade_box", 0, 0),
  (c) => {
    const f = c.frame
    // the whole sign drops out at 150 and buzzes back by 170
    const sign = f < 150 || f >= 170 || (f >= 162 && [1, 0, 1, 1, 0, 0, 1, 1][f - 162] === 1)
    "WASH".split("").forEach((ch, i) => {
      let on = sign
      if (ch === "S") on = false                                            // a dead tube
      if (ch === "A" && SIGNS_HASH(f * 3 + 5) < 0.18) on = false             // a buzzing one
      SIGNS_GLYPH(c, ch, 3, 4 + 7 * i, on ? "p" : "r", on ? "P" : null)
    })
  })

// ================================================================ shop neons (the strip's sign spots)
// Box 320x32, top-left at scene (0, 104): box y = scene row - 104. Only the tubes; the strip draws
// the dark boards behind them.
const SIGNS_PIX = (c, x, y, rows, k, hot) => rows.forEach((row, j) => [...row].forEach((v, i) => {
  if (v === "z") c.px(x + i, y + j, k)
  if (v === "x") c.px(x + i, y + j, hot)
}))
const SIGNS_WRENCH = [".z..z.", ".zzzz.", "..zz..", "..zx..", "..zz..", "..zz.."]
const SIGNS_CHIP = ["z.z.z", "zzzzz", "zxxxz", "zzzzz", "z.z.z"]
const SIGNS_CHILI = ["....x", "...x.", ".zzz.", "zzzz.", "zzz..", "zz..."]
const SIGNS_BOTTLE = [".zz.", ".zz.", "z..z", "z..z", "z..z", "zzzz"]
const SIGNS_WASHER = ["zzzzzz", "z....z", "z.zz.z", "zz..zz", "z.zz.z", "zzzzzz"]
const SIGNS_SHIRT = ["zzz.zzz", "z.....z", "zz...zz", ".z...z.", ".z...z.", ".zzzzz."]
const SIGNS_EYE = ["..zzzzz..", ".z..x..z.", "z..xxx..z", ".z..x..z.", "..zzzzz.."]
const SIGNS_EYE_SHUT = ["", "", "zzzzzzzzz", "", ""]
// D's open sign: dark from 20, stutters on at 180, steady by 200
const SIGNS_OPEN_ON = (f) => f < 20 || f > 200 || (f >= 180 && SIGNS_HASH(f + 300) < 0.45) || f === 200

anim("signs_neons", { w: 320, h: 32, frames: SIGNS_N, fps: SIGNS_FPS }, (c) => {
  const f = c.frame
  // A, the repair and pawn shop (x 6-34, rows 113-118): a wrench, FIX, a chip; the I flickers
  SIGNS_PIX(c, 7, 9, SIGNS_WRENCH, "z", "x")
  c.text(15, 10, "F", "z"); c.text(19, 10, "I", SIGNS_HASH(f * 5 + 11) < 0.08 ? "Z" : "z"); c.text(23, 10, "X", "z")
  SIGNS_PIX(c, 28, 10, SIGNS_CHIP, "z", f % 24 < 3 ? "z" : "x")
  // B, the taco counter (x 72-92, rows 106-111): a red chili and warm letters, buzzing now and then
  const buzz = SIGNS_HASH(f + 101) < 0.04
  SIGNS_PIX(c, 72, 2, SIGNS_CHILI, buzz ? "r" : "p", "a")
  c.text(78, 3, "TACO", buzz ? "O" : "a")
  // D, the liquor store (x 176-206, rows 112-117): bottle, OPEN, bottle
  const open = SIGNS_OPEN_ON(f), ok = open ? "p" : "r"
  SIGNS_PIX(c, 178, 8, SIGNS_BOTTLE, ok, ok); SIGNS_PIX(c, 201, 8, SIGNS_BOTTLE, ok, ok)
  c.text(184, 9, "OPEN", ok); if (open) { c.px(185, 9, "P"); c.px(193, 9, "P") }
  // E, the laundromat (x 248-270, rows 113-118): washer, shirt, washer, the doors' drums turning
  SIGNS_PIX(c, 248, 9, SIGNS_WASHER, "z", "x"); SIGNS_PIX(c, 256, 9, SIGNS_SHIRT, "z", "x"); SIGNS_PIX(c, 265, 9, SIGNS_WASHER, "z", "x")
  const drum = [[2, 3], [3, 3]][Math.floor(f / 3) % 2]
  c.px(248 + drum[0], 9 + drum[1], "x"); c.px(265 + 5 - drum[0], 9 + drum[1], "x")
  // F, the cyberware clinic (x 290-316, rows 112-117): an eye wired to DOC; it blinks, a pulse runs the wire
  SIGNS_PIX(c, 291, 9, f % 60 === 40 || f % 60 === 41 ? SIGNS_EYE_SHUT : SIGNS_EYE, "z", "x")
  c.px(300, 10, "Z"); c.px(301, 9, "Z"); c.hline(302, 8, 13, "Z"); c.px(315, 8, "z")
  if (f % 24 < 14) c.px(302 + (f % 24), 8, "x")
  c.text(304, 10, "DOC", "z")
})

// ================================================================ holo-ad (D's roof)
// Box 44x64, pivot bottom on D's roof (scene 201, 110). The projector sits on box rows 56-63; the
// hologram, a giant woman in a high-collared jacket, floats over it, turning in steps (front, to the
// right, front, to the left) through the loop. Holo keys only; the scene lays it at opacity 0.85.
sprite("_signs_holo_front", { mx: true }, `
  .....zzz
  ...zzxxx
  ..zZZZZZ
  .zZZZZZZ
  .zZZZZZZ
  zZZzZZZZ
  zZZzzzzz
  zZzZZZZZ
  zZzZzzZZ
  zZzZxxZZ
  zZzZZZZZ
  zZzZZZZz
  zZzZZZZZ
  zZzZZZzx
  zZz.zZZZ
  zzz..zZZ
  ......zZ
  .......z`)
sprite("_signs_holo_turn", `
  ......zzzz......
  ....zzxxxxzz....
  ...zZZZZZZZZz...
  ..zZZZZZZZZZZz..
  .zZZZZZZZzZZZz..
  .zZZZZZZzZZZZZz.
  zZZZzzzzzzzzzZz.
  zZZzZZZZZZZZZzz.
  zZZzZZzzZZZzzZz.
  zZZzZZxxZZZxZZz.
  zZZzZZZZZZZZZzz.
  zZZzZZZZZZZZZZz.
  zZZzZZZZZZZzzz..
  zZZzZZZZzzxzz...
  zZZ.zZZZZZZz....
  zzz..zZZZZz.....
  ......zZZz......
  .......zz.......`)
// the turn: [from frame, head]; two frames of glitch hide each change
const SIGNS_HOLO_POSES = [[0, "front"], [30, "right"], [110, "front"], [150, "left"], [230, "front"]]
const SIGNS_HOLO_SWAPS = SIGNS_HOLO_POSES.slice(1).map(([f]) => f)

anim("signs_holo", { w: 44, h: 64, frames: SIGNS_N, fps: SIGNS_FPS, pivot: "bottom" },
  // the beam fanning up from the lens
  layer("beam", { density: 0.5 }, poly([20, 56, 24, 56, 36, 47, 8, 47], "Z")),
  layer("figure", (c) => {
    const f = c.frame
    if (f === 207) return                                                  // the blank frame of the glitch
    const bob = Math.round((1 - Math.cos((2 * Math.PI * f) / 120)) / 2)
    const pose = SIGNS_HOLO_POSES.filter(([s]) => f >= s).pop()[1]
    // body: neck, high collar, sloping shoulders, arms at the sides; filled, then rimmed
    c.rect(19, 21 + bob, 6, 7, "Z")
    c.poly([5, 53, 5, 37, 7, 34, 11, 32, 18, 29, 26, 29, 33, 32, 37, 34, 39, 37, 39, 53], "Z")
    c.poly([16, 31, 16, 26 + bob, 18, 24 + bob, 26, 24 + bob, 28, 26 + bob, 28, 31], "Z")   // the high collar
    const rim = []
    for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++)
      if (c.is(x, y, "Z") && (c.is(x - 1, y, ".") || c.is(x + 1, y, ".") || c.is(x, y - 1, "."))) rim.push([x, y])
    for (const [x, y] of rim) c.px(x, y, "z")
    if (pose === "front") c.stamp("_signs_holo_front", 14, 4 + bob)
    else c.stamp("_signs_holo_turn", 14, 4 + bob, pose === "left" ? { flip: "x" } : {})
    // lapels and zip, the arms' seams, the collar's lit edge, the light on the shoulders
    c.line(19, 30, 22, 41, "z"); c.line(25, 30, 22, 41, "z"); c.vline(22, 42, 11, "z")
    c.vline(11, 38, 15, "z"); c.vline(33, 38, 15, "z")
    c.hline(18, 24 + bob, 8, "x"); c.px(17, 25 + bob, "x"); c.px(26, 25 + bob, "x")
    c.line(7, 34, 11, 32, "x"); c.line(37, 34, 33, 32, "x")
    // see-through: every third row of the fill is a gap, climbing a row every 2 frames (thinner
    // gaps than fill, or the figure reads as an outline against the busy city behind it)
    const off = (f >> 1) % 3
    for (let y = 0; y < 54; y++) {
      const t = (y + off) % 3
      for (let x = 0; x < c.w; x++) if (c.is(x, y, "Z") && t === 0) c.px(x, y, "_")
    }
    // the bottom dissolves into the beam
    for (let y = 45; y < 54; y++) for (let x = 0; x < c.w; x++) if ((x * 7 + y * 3) % 9 < y - 45) c.px(x, y, "_")
    // a bright scan sweeping up every 80 frames
    const sw = f % 80
    if (sw < 26) { const y = 52 - 2 * sw; for (let x = 0; x < c.w; x++) { if (c.is(x, y, "z")) c.px(x, y, "x"); else if (c.is(x, y, "Z")) c.px(x, y, "z") } }
    // glitches: 200-215, and two frames before each change of pose
    const glitch = (f >= 200 && f <= 215) || SIGNS_HOLO_SWAPS.some((w) => f === w - 1 || f === w - 2)
    if (glitch) {
      for (let y = 0, i = 0; y < 54; i++) {
        const h = 2 + Math.floor(SIGNS_HASH(f * 31 + i) * 5), r = SIGNS_HASH(f * 17 + i * 7)
        if (r < 0.5) { const dx = r < 0.25 ? -1 - Math.floor(r * 8) : 1 + Math.floor((r - 0.25) * 8); c.warp(() => [-dx, 0], [0, y, c.w, h]) }
        y += h
      }
    }
  }),
  // the projector on the roof: in shade, sky on its top, a status light
  layer("projector",
    rect(19, 56, 6, 3, "K"), hline(20, 56, 4, "x"),
    rect(16, 59, 12, 5, "C"), hline(16, 59, 12, "c"), hline(16, 63, 12, "K"),
    px(18, 61, "K"), px(20, 61, "K"), px(22, 61, "K"), px(26, 61, "p"),
    hline(28, 63, 8, "K")))

// ================================================================ test scene
// The part as the city places it, over stand-ins for the strip, the freeway and the haze.
scene("test_signs", { w: 320, h: 180, bg: "h", world: { horizon: 104, eye: 6, light: [-1, -0.45] } },
  layer("standins",
    grad(0, 0, 320, 104, "NnvVhH"), rect(0, 40, 320, 72, "3"), rect(196, 14, 26, 30, "1"),
    rect(0, 78, 320, 10, "e"), hline(0, 78, 320, "L"), rect(0, 88, 320, 3, "C"),
    rect(0, 58, 62, 78, "c"), rect(62, 94, 56, 42, "u"), rect(118, 112, 52, 24, "G"), rect(170, 110, 62, 26, "U"),
    rect(232, 76, 54, 60, "c"), rect(286, 92, 34, 44, "r"),
    rect(6, 113, 29, 6, "K"), rect(72, 106, 21, 6, "K"), rect(176, 112, 31, 6, "K"), rect(248, 113, 23, 6, "K"), rect(290, 112, 27, 6, "K"),
    rect(0, 136, 320, 44, "g")),
  layer("signs", stamp("signs_billboard", 90, 94), stamp("signs_pylon", 146, 132), stamp("signs_blade", 274, 80),
    stamp("signs_neons", 0, 104)),
  layer("holo", { opacity: 0.85, unlit: true }, stamp("signs_holo", 201, 110)),   // it gives light: no lit side to read
  glow("W", { r: 16, strength: 0.3 }),
  glow("aA", { r: 6, strength: 0.35 }),
  glow("zx", { r: 5, strength: 0.3 }),
  glow("pP", { r: 4, strength: 0.35 }),
  glow("wi", { r: 2, strength: 0.15 }))
