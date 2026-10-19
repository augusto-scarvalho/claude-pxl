// Traffic on the street (plan.md, part 7): two lanes of original, chunky 80s-retro-future vehicles.
// Far lane drives left (wheels on scene row 151, 7.8 px/m), near lane drives right (wheels on row
// 164, 10 px/m). In the city's shade: lit by the sky from above (roofs and hoods one tone lighter,
// sills and wheel wells darkest), glass reflecting the dusty sky in its upper half. Headlights and
// taillights are on. Every vehicle is drawn facing right; the far lane flips them.
include("palette.px.js", { palette: true })

// ---------------------------------------------------------------- wheels: two hub poses, swapped every frame
sprite("_traffic_wheel_n0", `
  ..kkk..
  .kCcCk.
  kCcecCk
  kceEeck
  kCcecCk
  .kCcCk.
  ..kkk..`)
sprite("_traffic_wheel_n1", `
  ..kkk..
  .kcCck.
  kcCeCck
  kCeEeCk
  kcCeCck
  .kcCck.
  ..kkk..`)
sprite("_traffic_wheel_f0", `
  .kkk.
  kCcCk
  kcEck
  kCcCk
  .kkk.`)
sprite("_traffic_wheel_f1", `
  .kkk.
  kcCck
  kCECk
  kcCck
  .kkk.`)
sprite("_traffic_wheel_t0", `
  ...kkk...
  .kkkkkkk.
  .kkCcCkk.
  kkCcecCkk
  kkceEeckk
  kkCcecCkk
  .kkCcCkk.
  .kkkkkkk.
  ...kkk...`)
sprite("_traffic_wheel_t1", `
  ...kkk...
  .kkkkkkk.
  .kkcCckk.
  kkcCeCckk
  kkCeEeCkk
  kkcCeCckk
  .kkcCckk.
  .kkkkkkk.
  ...kkk...`)

// ---------------------------------------------------------------- near lane (10 px/m)
// wedge sedan, teal: a low raked nose, pop-up-style slit lamps, a sky-lit crease along the side
sprite("_traffic_sedan_n", { w: 46, h: 14 }, `
  .................jjjjjjjjjjj..................
  ...............jthhhhhhKhhhhTj................
  .............jjttVVVVVVKVVVVVThj..............
  ...........jjttttKKKKKKKKKKKKKKThj............
  ..jjjjjjjjjttttttTTTTTTTTTTTTTTTttjjj.........
  .tttttttttttttttttttttttttttttttttttjjjjjj....
  pJJJJJJkkkkkJJJJJJJJJJJJJJJJJJJJJJkkkkkJJJjjjA
  Ptttttkkkkkkkttttttttttttttttttttkkkkkkkttttta
  pttttkkkkkkkkkttttttttttttttttttkkkkkkkkkttttC
  CTTTTkkkkkkkkkTTTTTTTTTTTTTTTTTTkkkkkkkkkTTTTC
  CTTTTkkkkkkkkkKKKKKKKKKKKKKKKKKKkkkkkkkkkTTTTC
  .KKKKkkkkkkkkkKKKKKKKKKKKKKKKKKKkkkkkkkkkKKKK.`,
  vline(15, 5, 4, "T"), vline(31, 5, 4, "T"), hline(17, 5, 2, "K"))

// cab-like sedan, dusty yellow: upright three-box, a glowing roof sign, a faded checker band
sprite("_traffic_cab_n", { w: 46, h: 14 }, `
  ...................CwwwwwwC...................
  .............UUUUUUUUUUUUUUUUUUUUU............
  ............UshhhhhhhhShhhhhhhhhsU............
  ...........UssVVVVVVVVSVVVVVVVVVssU...........
  ..........UsssKKKKKKKKSKKKKKKKKKsssU..........
  .UUUUUUUUUssssSSSSSSSSSSSSSSSSSSssssUUUUUUUUU.
  puuuuuuukkkkkuuuuuuuuuuuuuuuuuuuuukkkkkuuuuuuA
  PUUUUUUkkkkkkkUUUUUUUUUUUUUUUUUUUkkkkkkkUUUUUa
  puuuuukkkkkkkkkuuuuuuuuuuuuuuuuukkkkkkkkkuuuuC
  CssssskkkkkkkkkSuSuSuSuSuSuSuSuSkkkkkkkkkssssC
  CssssskkkkkkkkkssssssssssssssssskkkkkkkkkssssC
  .SSSSSkkkkkkkkkSSSSSSSSSSSSSSSSSkkkkkkkkkSSSS.`,
  vline(22, 6, 3, "s"), vline(31, 6, 3, "s"), hline(19, 6, 2, "s"), hline(28, 6, 2, "s"))

// delivery van, grimy red: a sloped cab-forward nose, a sand company stripe, a teal ring mark
sprite("_traffic_van_n", { w: 50, h: 20 }, `
  .MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM..........
  mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmM.........
  rmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmhhhhhhhrVhM........
  rmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmVVVVVVVrVVhM.......
  rmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmTTTTTTTrVVVhM......
  rmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmKKKKKKKrKVVVhM.....
  rmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmKKKKKKKrKKVVVhM....
  rmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmrrrrrrrrMMMMMMMM...
  rmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmM..
  rmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmM.
  pUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUA
  Puuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuua
  prrrrrrrrkkkkkrrrrrrrrrrrrrrrrrrrrrrrrkkkkkrrrrrrC
  CrrrrrrrkkkkkkkrrrrrrrrrrrrrrrrrrrrrrkkkkkkkrrrrrC
  CRRRRRRkkkkkkkkkRRRRRRRRRRRRRRRRRRRRkkkkkkkkkRRRRC
  CRRRRRRkkkkkkkkkRRRRRRRRRRRRRRRRRRRRkkkkkkkkkRRRRC
  .RRRRRRkkkkkkkkkRRRRRRRRRRRRRRRRRRRRkkkkkkkkkRRRR.`,
  vline(30, 1, 9, "r"), vline(20, 2, 8, "r"), vline(20, 12, 4, "R"), vline(30, 12, 4, "R"),
  ring(12, 5, 2, "t"), px(12, 5, "j"), px(3, 6, "R"), px(23, 6, "R"))

// box truck: a ribbed pale cargo box with a teal band and a double-chevron mark, dust run down from the rail; a red cab
sprite("_traffic_truck_n", { w: 66, h: 28 },
  rect(0, 0, 48, 19, "E"), hline(0, 0, 48, "L"), hline(0, 1, 48, "e"), hline(0, 17, 48, "e"), hline(0, 18, 48, "c"),
  ...[6, 12, 18, 24, 30, 36, 42].map((x) => vline(x, 2, 15, "e")), vline(0, 1, 18, "e"), vline(47, 1, 18, "e"),
  rect(0, 11, 48, 3, "t"), hline(0, 10, 48, "j"), hline(0, 14, 48, "T"),
  poly([9, 3, 12, 3, 15, 6, 12, 9, 9, 9, 12, 6], "m"), poly([15, 3, 18, 3, 21, 6, 18, 9, 15, 9, 18, 6], "m"),
  ...[3, 21, 27, 39, 45].map((x, i) => vline(x, 2, 2 + (i % 3), "e")),
  px(0, 15, "p"), px(0, 16, "P"), px(0, 17, "p"),
  rect(2, 19, 47, 2, "K"), hline(2, 21, 47, "k"), rect(0, 21, 4, 2, "C"), hline(0, 21, 4, "c"),
  rect(26, 20, 12, 4, "c"), hline(26, 20, 12, "e"), hline(26, 23, 12, "C"), hline(7, 19, 11, "C"),
  vline(48, 5, 16, "K"),
  poly([49, 5, 60, 5, 66, 13, 66, 24, 49, 24], "m"), hline(49, 5, 11, "M"), vline(49, 6, 18, "r"),
  rect(51, 7, 8, 5, "K"), hline(51, 7, 8, "h"), hline(51, 8, 8, "V"), hline(51, 9, 8, "T"),
  line(60, 5, 65, 12, "h"), line(59, 6, 63, 12, "r"),
  vline(50, 7, 14, "r"), vline(60, 13, 8, "r"), hline(57, 14, 2, "R"),
  rect(49, 19, 17, 4, "r"), hline(49, 23, 17, "R"),
  px(65, 13, "o"), px(65, 15, "A"), px(65, 16, "a"), rect(61, 20, 5, 3, "C"), hline(61, 20, 5, "e"),
  hline(51, 18, 9, "k"), rect(50, 19, 11, 5, "k"),
  px(51, 4, "o"), px(54, 4, "o"), px(57, 4, "o"))

// matte black corp car: long, low, tinted flush glass, a teal running line
sprite("_traffic_corp_n", { w: 50, h: 13 }, `
  ..................cccccccccccccc..................
  ...............cccVVVVVVVVVVVVVVCcc...............
  ............cccCCKKKKKKKKKKKKKKKKKKCcc............
  .cccccccccccCCCCCCCCCCCCCCCCCCCCCCCCCCcccccccccc..
  pCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCA
  PJJJJJJJkkkkkJJJJJJJJJJJJJJJJJJJJJJJJJkkkkkJJJJJJa
  pCCCCCCkkkkkkkCCCCCCCCCCCCCCCCCCCCCCCkkkkkkkCCCCCC
  CKKKKKkkkkkkkkkKKKKKKKKKKKKKKKKKKKKKkkkkkkkkkKKKKC
  CKKKKKkkkkkkkkkKKKKKKKKKKKKKKKKKKKKKkkkkkkkkkKKKKC
  .KKKKKkkkkkkkkkKKKKKKKKKKKKKKKKKKKKKkkkkkkkkkKKKK.`,
  vline(25, 4, 1, "K"), vline(25, 6, 3, "K"))

// motorbike: rider in a red jacket and teal helmet, leaning into the bars
sprite("_traffic_bike_n", { w: 20, h: 16 }, `
  ..........jjj.......
  .........jtthh......
  .........TttVK......
  ..........TTT.......
  ........mMMMm.......
  .......rmmmmmm......
  .......rrmmr..m.....
  .pTTTTTrCCCCjJjkCA..
  ..TKKKKKCCCCCttcCa..
  .....eCececK...c....
  ......CcCC.K....c...
  .......eE.kkk.......`)

// ---------------------------------------------------------------- far lane (7.8 px/m)
// rusty pickup, red, with junk in the bed
sprite("_traffic_pickup_f", { w: 40, h: 13 }, `
  ....................MMMMMMMM............
  ...................rhhhhhhhrM...........
  ...................rVVVVVVVrhM..........
  ...................rKKKKKKKrVhM.........
  MMMMMMMMMMMMMMMMMMMmmmmmmmmmmmmMMMMMMMM.
  pmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmA
  Pmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmma
  pmmmmmmkkkmmmmmmmmmmmmmmmmmmmmkkkmmmmmmC
  CrrrrkkkkkkkrrrrrrrrrrrrrrrrkkkkkkkrrrrC
  .RRRRkkkkkkkRRRRRRRRRRRRRRRRkkkkkkkRRRR.`,
  vline(18, 4, 5, "R"), vline(27, 4, 4, "r"), px(21, 5, "R"),
  rect(2, 2, 6, 2, "b"), hline(2, 2, 6, "f"), rect(10, 1, 3, 3, "t"), px(10, 1, "j"), px(11, 1, "j"), hline(14, 3, 3, "c"),
  px(10, 6, "r"), px(11, 6, "r"), px(11, 7, "r"), px(12, 7, "R"), px(35, 6, "r"), px(36, 7, "r"), px(3, 6, "r"))

// boxy hatchback, sun-faded grey
sprite("_traffic_hatch_f", { w: 36, h: 11 }, `
  ...........LLLLLLLLLLLLL............
  .........LehhhhhhchhhhhcL...........
  .......LEeeKKKKKKcKKKKKcVL..........
  .LLLLLLeeeeeeeeeeeeeeeeeeeLLLLLLLL..
  pEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEA
  PEEEEEkkkEEEEEEEEEEEEEEEEEEkkkEEEEEa
  CeeekkkkkkkeeeeeeeeeeeeeekkkkkkkeeeC
  .ccckkkkkkkcccccccccccccckkkkkkkccc.`,
  vline(17, 3, 3, "c"), px(19, 4, "c"))
// the same hatch in dusty yellow
sprite("_traffic_hatchy_f", { base: "_traffic_hatch_f", swap: { L: "U", E: "u", e: "s", c: "S" } })

// microbus, teal two-tone with a sand stripe
sprite("_traffic_van_f", { w: 39, h: 16 }, `
  ..JJJJJJJJJJJJJJJJJJJJJJJJJJJJJ........
  .jjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjJ......
  .thhhhhhthhhhhhhthhhhhhhthhhhhhthJ.....
  .tVVVVVVtVVVVVVVtVVVVVVVtVVVVVVtVhJ....
  .tKKKKKKtKKKKKKKtKKKKKKKtKKKKKKtKVhJ...
  .tTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTtJ..
  pttttttttttttttttttttttttttttttttttttJ.
  PUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUA
  pttttttttttttttttttttttttttttttttttttta
  CtttttttttttttttttttttttttttttttttttttC
  CTTTTTTkkkTTTTTTTTTTTTTTTTTTTTkkkTTTTTC
  .TTTTkkkkkkkTTTTTTTTTTTTTTTTkkkkkkkTTT.
  .KKKKkkkkkkkKKKKKKKKKKKKKKKKkkkkkkkKKK.`,
  vline(24, 6, 1, "T"), vline(24, 8, 3, "T"))

// matte black corp car, far
sprite("_traffic_corp_f", { w: 38, h: 10 }, `
  .............ccccccccccc..............
  ...........ccVVVVVVVVVVVCcc...........
  .........ccCKKKKKKKKKKKKKKKCcc........
  .ccccccccCCCCCCCCCCCCCCCCCCCCcccccccc.
  pCCCCCkkkCCCCCCCCCCCCCCCCCCCCCkkkCCCCA
  PJJJkkkkkkkJJJJJJJJJJJJJJJJJkkkkkkkJJa
  .KKKkkkkkkkKKKKKKKKKKKKKKKKKkkkkkkkKK.`)

// ---------------------------------------------------------------- the lanes
// Each vehicle: box size, wheel kind and where its wheels sit (top-left, drawn facing right).
const TRAFFIC_V = {
  sedan_n: { w: 46, h: 14, wheel: "n", wheels: [[6, 7], [33, 7]] },
  cab_n: { w: 46, h: 14, wheel: "n", wheels: [[7, 7], [33, 7]] },
  van_n: { w: 50, h: 20, wheel: "n", wheels: [[8, 13], [37, 13]] },
  truck_n: { w: 66, h: 28, wheel: "t", wheels: [[8, 19], [51, 19]] },
  corp_n: { w: 50, h: 13, wheel: "n", wheels: [[7, 6], [37, 6]] },
  bike_n: { w: 20, h: 16, wheel: "n", wheels: [[0, 9], [13, 9]] },
  pickup_f: { w: 40, h: 13, wheel: "f", wheels: [[6, 8], [29, 8]] },
  hatch_f: { w: 36, h: 11, wheel: "f", wheels: [[5, 6], [26, 6]] },
  hatchy_f: { w: 36, h: 11, wheel: "f", wheels: [[5, 6], [26, 6]] },
  van_f: { w: 39, h: 16, wheel: "f", wheels: [[6, 11], [29, 11]] },
  corp_f: { w: 38, h: 10, wheel: "f", wheels: [[5, 5], [29, 5]] },
}
const TRAFFIC_WHEEL_W = { n: 7, f: 5, t: 9 }
// A lane is a ring: a vehicle at ring position s is drawn at x = s - off. v * 240 is a whole number
// of rings (far: 5 * 240 = 2 * 600, near: 6 * 240 = 2 * 720), so the loop closes, and the wrap
// happens off screen. `base` is the box row under the wheels (scene rows 152 and 165).
const TRAFFIC_LANES = [
  { v: -5, span: 600, off: 140, base: 24,
    cars: [["pickup_f", 0], ["hatch_f", 100], ["van_f", 246], ["corp_f", 330], ["hatchy_f", 488]] },
  { v: 6, span: 720, off: 200, base: 37,
    cars: [["sedan_n", 0], ["truck_n", 116], ["bike_n", 272], ["cab_n", 332], ["corp_n", 478], ["van_n", 588]] },
]
// where everything is at frame f, far lane first (the near lane draws over it)
const TRAFFIC_AT = (f) => TRAFFIC_LANES.flatMap((l) => l.cars.map(([n, s0]) => {
  const v = TRAFFIC_V[n], s = (((s0 + l.v * f) % l.span) + l.span) % l.span
  return { n, ...v, x: s - l.off, y: l.base - v.h, left: l.v < 0 }
})).filter((p) => p.x < 352 && p.x + p.w > -32)

anim("traffic_cars", { w: 320, h: 40, frames: 240, fps: 12 }, (c) => {
  for (const p of TRAFFIC_AT(c.frame)) {
    c.stamp(`_traffic_${p.n}`, p.x, p.y, p.left ? { flip: "x" } : {})
    const ww = TRAFFIC_WHEEL_W[p.wheel]
    for (const [wx, wy] of p.wheels)
      c.stamp(`_traffic_wheel_${p.wheel}${c.frame % 2}`, p.left ? p.x + p.w - wx - ww : p.x + wx, p.y + wy)
  }
})

// contact shadows (key k, for a shade layer): a band from bumper to bumper, 2 px past each end,
// its bottom on the wheels' row; the top row is a pixel shorter at each end
anim("traffic_shadow", { w: 320, h: 40, frames: 240, fps: 12 }, (c) => {
  for (const p of TRAFFIC_AT(c.frame)) {
    const rows = p.left ? 2 : 3, b = p.y + p.h
    c.rect(p.x - 2, b - rows + 1, p.w + 4, rows - 1, "k")
    c.rect(p.x - 1, b - rows, p.w + 2, 1, "k")
  }
})

// headlight light on the road ahead (key k, for a light layer): 2 rows at the bumper widening to 4
anim("traffic_beams", { w: 320, h: 40, frames: 240, fps: 12 }, (c) => {
  for (const p of TRAFFIC_AT(c.frame)) {
    const b = p.y + p.h, len = p.left ? -20 : 28, front = p.left ? p.x : p.x + p.w
    c.poly([front, b - 2, front + len, b - 4, front + len, b, front, b], "k")
  }
})

// ---------------------------------------------------------------- test: the part where the city places it,
// over a stand-in street (the real one is street_ground)
scene("test_traffic", { w: 320, h: 180, bg: "h", world: { horizon: 104, eye: 6, light: [-1, -0.45] } },
  layer("standin", rect(0, 104, 320, 32, "c"), rect(0, 112, 320, 24, "C"), rect(0, 136, 320, 6, "e"), rect(0, 142, 320, 2, "C"),
    rect(0, 144, 320, 23, "G"), rect(0, 148, 320, 4, "g"), rect(0, 160, 320, 5, "g"), hline(0, 155, 320, "u"), hline(0, 156, 320, "u"),
    rect(0, 167, 320, 2, "c"), hline(0, 167, 320, "E"), rect(0, 169, 320, 11, "e")),
  layer("shadows", { shade: 2 }, stamp("traffic_shadow", 0, 128)),
  layer("beams", { light: true, density: 0.5 }, stamp("traffic_beams", 0, 128)),
  layer("cars", stamp("traffic_cars", 0, 128)),
  glow("aA", { r: 6, strength: 0.35 }), glow("pP", { r: 4, strength: 0.35 }), glow("w", { r: 2, strength: 0.15 }))
