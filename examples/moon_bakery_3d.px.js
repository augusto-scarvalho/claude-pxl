// "Moon Buns": a lilac corner bakery with a crescent sign, a brick-oven chimney and a roof cat.
pal({
  k: "#2b1740",                                   // ink
  W: "#4a2a74", V: "#6a3d9a", v: "#8a5cc0", q: "#b894ec", // lilac walls
  p: "#ff7fa8", P: "#c9487a",                     // pink
  R: "#8a3a30", O: "#d9643c", o: "#ff9a62", u: "#ffc890", // bread / oven
  a: "#c98a2e", L: "#f2b84a", l: "#ffe27a", w: "#fffaf0", // butter light
  n: "#1f5f66", M: "#2f9a86", m: "#7fe0b0",       // mint
  e: "#bb9b82", C: "#e6cfae", c: "#fff3dc",       // cream plaster
  B: "#ffcfae", b: "#f5ab8a",                     // peach backdrop
  r: "#ff5d6c",
})
ramps("kWVvq", "kPp", "kROou", "kaLlw", "knMm", "keCc")
include("../lib/props/lamps.px.js")   // the street lamp, taken in these colors

// ---------------------------------------------------------------- small parts
sprite("_dentil", `
  LL..
  aa..`)
sprite("_brick", `
  cccccccC
  cccccccC
  cccccccC
  CCCCCCCC
  cccCcccc
  cccCcccc
  cccCcccc
  CCCCCCCC`)
sprite("_siding", `
  vvvvvvvv
  vvvvvvvv
  vvvvvvvv
  vvvvvvvv
  VVVVVVVV
  vvvvvvvv`)
sprite("_awning", `
  PPPPCCCC
  ppppcccc
  ppppcccc
  ppppcccc
  ppppcccc
  ppppcccc
  .pp..cc.`)

// window goods, 7x7, bottom row sits on the shelf
sprite("_loaf", `
  .......
  ..ooo..
  .ouooO.
  .oooOO.
  .ooOOO.
  .ROOOR.
  .RRRRR.`)
sprite("_croissant", `
  .......
  ..ouo..
  .ouoOo.
  ouOoOou
  .oOoOo.
  ..ROR..
  .......`)
sprite("_donut", `
  .......
  ..ppp..
  .pwpPp.
  .pP.Pp.
  .pPPPp.
  ..ooo..
  .......`)
sprite("_pie", `
  .......
  .......
  .uuuuu.
  uooooOO
  .OOOOO.
  .RRRRR.
  .......`)
sprite("_cupcake", `
  ..ppp..
  .pwpPp.
  .PPPPP.
  .cCcCc.
  .cCcCc.
  ..CcC..
  .......`)
sprite("_baguette", `
  .....uo
  ....uoO
  ...uoO.
  ..uoO..
  .uoO...
  uoO....
  oO.....`)
group("goods", ["_loaf", "_loaf", "_croissant", "_donut", "_pie", "_cupcake", "_baguette"])

sprite("_plant", `
  .m.m..
  mMmm.m
  .mMmm.
  ..Mm..
  .pppp.
  .PppP.
  ..PP..`)

sprite("_moon_win", { w: 19, h: 19 },
  circ(9, 9, 9, "L"), circ(9, 9, 7, "l"), circ(7, 7, 4, "w"),
  hline(2, 9, 15, "L"), vline(9, 2, 15, "L"), ring(9, 9, 7, "a"), ring(9, 9, 9, "a"),
  shade([10, 10, 9, 9]))

sprite("_bell", `
  .a.
  LLL
  LlL
  aLa`)
sprite("_bulb_y", "l\nL")
sprite("_bulb_p", "p\nP")
sprite("_bulb_m", "m\nM")
group("bulbs", ["_bulb_y", "_bulb_p", "_bulb_m", "_bulb_y"])

sprite("_steam_a", `
  .w.
  www
  .w.`)
sprite("_steam_b", "w")
group("steam", ["_steam_a", "_steam_b", "_steam_b"])

sprite("_spark", `
  .l.
  lwl
  .l.`)
sprite("_dot", "w")
group("sparks", ["_spark", "_dot", "_dot", "_dot"])

sprite("_cat", `
  k...k..
  kk.kk..
  kmkmk..
  kkkkk..
  .kkkk..
  .kkkkk.
  .kkkkkk`)
sprite("_bird", `
  .k.
  kkk
  ..k`)

sprite("lamp", { base: "_lamp_globe", swap: roleSwap(lamps.ROLES._lamp_globe, { line: "k", frame: "WV", glass: "a", light: "lw", beads: "pm" }) })

sprite("cart", { w: 30, h: 22, outline: "k" },
  rect(0, 0, 30, 4, "p"), pattern("_awning", 0, 0, 30, 6),
  vline(2, 6, 10, "W"), vline(27, 6, 10, "W"),
  rect(0, 16, 30, 3, "V"), hline(0, 16, 30, "v"),
  stamp("_loaf", 4, 9), stamp("_croissant", 11, 9), stamp("_baguette", 18, 9), stamp("_pie", 22, 9),
  circ(6, 20, 2, "n"), circ(24, 20, 2, "n"), px(6, 20, "m"), px(24, 20, "m"))

sprite("board", { w: 22, h: 20, outline: "k" },
  rect(1, 0, 20, 17, "W"), box(1, 0, 20, 17, "L"),
  text(11, 3, "FRESH", "l", { align: "c" }), text(11, 10, "HOT", "p", { align: "c" }),
  line(3, 17, 1, 19, "W"), line(18, 17, 20, 19, "W"))

// ---------------------------------------------------------------- 3/4 view: front face + side face + roof
// Oblique projection: depth runs right and up at 2:1. Front face is lit, side is stepped down a shade.
const FX0 = 20, FX1 = 112, TOP = 56, BOT = 150, D = 30
const sp = (u, y) => [FX1 + u, y - u / 2]                       // point on the side plane
const sidePoly = (u0, u1, y0, y1) => [...sp(u0, TOP + y0), ...sp(u1, TOP + y0), ...sp(u1, TOP + y1), ...sp(u0, TOP + y1)]   // y relative to TOP
// small box with front, side and top faces
const box3 = (x, y, w, h, d, f, s, t) => (c) => {
  c.poly([x + w, y, x + w + d, y - d / 2, x + w + d, y + h - d / 2, x + w, y + h], s)
  c.poly([x, y, x + w, y, x + w + d, y - d / 2, x + d, y - d / 2], t)
  c.rect(x, y, w, h, f)
}
// slanted course lines across the side face
const sideLines = (y0, y1, step, col) => (c) => {
  for (let y = y0; y <= y1; y += step) c.line(FX1, y, FX1 + D - 1, y - (D - 1) / 2, col)
}
const sideJoints = (y0, y1, step, col) => (c) => {
  let r = 0
  for (let y = y0; y < y1; y += step, r++)
    for (let u = 4 + (r % 2) * 4; u < D; u += 8) c.vline(FX1 + u, y - Math.floor(u / 2) + 1, step - 1, col)
}
const SIDE = [FX1, TOP, FX1 + D, TOP - D / 2, FX1 + D, BOT - D / 2, FX1, BOT]


scene("moon_buns_3d", { w: 192, h: 170, bg: "B", layers: true },
  layer("backdrop",
    scatter("sparks", 0, 0, 192, 110, 26, { seed: 8 }),
    circ(160, 26, 16, "b"), circ(160, 26, 13, "c"), circ(166, 23, 11, "B"),
    rect(0, 135, 192, 35, "b"), hline(0, 135, 192, "B"),
    rect(0, 150, 192, 20, "C"), hline(0, 150, 192, "e"), hline(0, 151, 192, "c"),
    (c) => { for (let x = 6; x < 192; x += 28) c.vline(x, 153, 17, "c") }),

  // ---- roof (top face), then the things standing on it
  layer("roof",
    poly([FX0, TOP, FX1, TOP, FX1 + D, TOP - D / 2, FX0 + D, TOP - D / 2], "q"),
    line(FX0 + D, TOP - D / 2, FX1 + D, TOP - D / 2, "v"), line(FX0, TOP, FX0 + D, TOP - D / 2, "v"),
    line(FX1, TOP, FX1 + D, TOP - D / 2, "v"),
    // roof hatch and ac
    box3(34, 48, 14, 6, 6, "m", "M", "w"), px(37, 50, "n"), px(41, 50, "n"),
    // brick-oven chimney
    box3(74, 24, 14, 29, 8, "O", "R", "o"), rect(76, 14, 10, 4, "k"),
    (c) => { for (let y = 28; y < 52; y += 4) c.hline(74, y, 14, "R") },
    box3(72, 18, 18, 5, 10, "L", "a", "l"),
    // weather vane star
    vline(58, 26, 24, "W"), hline(54, 38, 9, "W"), circ(58, 23, 3, "l"), px(58, 23, "w"), px(55, 25, "l"), px(61, 25, "l"),
    stamp("_cat", 98, 44), stamp("_plant", 28, 44), stamp("_plant", 118, 38, { flip: "x" }), stamp("_bird", 112, 29)),

  // ---- side face
  layer("side",
    poly(SIDE, "v"),
    // upstairs siding
    sideLines(TOP + 6, TOP + 34, 6, "V"),
    // cornice + band
    poly(sidePoly(0, D, 0, 4), "L"), poly(sidePoly(0, D, 4, 5), "a"),
    poly(sidePoly(0, D, 36, 39), "L"), poly(sidePoly(0, D, 39, 40), "a"),
    // brick below the band
    poly(sidePoly(0, D, 40, 88), "c"),
    sideLines(TOP + 47, TOP + 87, 8, "C"), sideJoints(TOP + 40, TOP + 88, 8, "C"),
    poly(sidePoly(0, D, 88, 94), "n"),
    // upstairs side windows
    poly(sidePoly(3, 11, 9, 27), "W"), poly(sidePoly(4, 10, 10, 26), "l"), poly(sidePoly(2, 12, 27, 29), "L"),
    poly(sidePoly(18, 26, 9, 27), "W"), poly(sidePoly(19, 25, 10, 26), "l"), poly(sidePoly(17, 27, 27, 29), "L"),
    // big side bay window
    poly(sidePoly(4, 26, 50, 82), "W"), poly(sidePoly(6, 24, 52, 80), "L"), poly(sidePoly(6, 24, 52, 80), "l"),
    poly(sidePoly(14, 16, 52, 80), "W"),
    poly(sidePoly(4, 26, 82, 86), "V"),
    poly(sidePoly(8, 14, 58, 66), "p"), poly(sidePoly(17, 23, 58, 66), "m"),
    // lit lamp sign hanging at the corner
    shade(SIDE, 1)),

  // ---- front face (local coords: x = FX0, y = TOP)
  layer("front", { x: FX0, y: TOP },
    pattern("_siding", 0, 0, 92, 36),
    pattern("_brick", 0, 39, 92, 55),
    rect(0, 0, 92, 4, "L"), hline(0, 4, 92, "a"), pattern("_dentil", 0, 5, 92, 2),
    rect(0, 36, 92, 3, "L"), hline(0, 39, 92, "a"),
    rect(0, 88, 92, 6, "n"), hline(0, 88, 92, "m"),
    // sign plate with crescent
    rect(8, 10, 46, 20, "W"), box(8, 10, 46, 20, "L"),
    px(9, 11, "l"), px(52, 11, "l"), px(9, 28, "l"), px(52, 28, "l"),
    circ(19, 20, 7, "l"), circ(22, 18, 6, "W"), px(16, 16, "w"),
    text(38, 13, "MOON", "l", { align: "c", shadow: "a" }),
    text(38, 21, "BUNS", "p", { align: "c", shadow: "P" }),
    // round window + planters, drainpipe
    stamp("_moon_win", 62, 10), rect(60, 27, 23, 3, "L"), hline(60, 29, 23, "a"),
    stamp("_plant", 63, 21), stamp("_plant", 74, 21, { flip: "x" }),
    rect(86, 0, 4, 88, "M"), vline(89, 0, 88, "n"), vline(87, 0, 88, "m"),
    // shop window
    rect(5, 52, 54, 34, "W"), rect(7, 54, 50, 27, "L"), grad(7, 54, 50, 27, "lLLa"),
    tile("goods", 9, 56, 7, 1, { seed: 1 }), hline(8, 63, 48, "W"),
    tile("goods", 9, 65, 7, 1, { seed: 2 }), hline(8, 72, 48, "W"),
    tile("goods", 9, 74, 7, 1, { seed: 3 }), rect(5, 81, 54, 5, "V"), hline(5, 81, 54, "v"),
    vline(32, 54, 27, "W"),
    // door
    rect(64, 48, 22, 40, "W"), rect(66, 50, 18, 38, "M"), grad(66, 50, 18, 38, "mMMn", "v", 0.3),
    circ(75, 60, 5, "l"), circ(73, 58, 2, "w"), ring(75, 60, 5, "n"),
    box(68, 70, 14, 6, "n"), box(68, 78, 14, 8, "n"), px(82, 74, "L"), px(82, 75, "L"),
    rect(66, 40, 18, 7, "c"), box(66, 40, 18, 7, "C"), text(75, 41, "OPEN", "r", { align: "c" }),
    // awning
    pattern("_awning", 0, 42, 62, 10)),

  layer("awning_shadow", { shade: true }, rect(FX0, TOP + 52, 62, 2, "k")),
  layer("roof_light", { light: true, density: 0.5 },
    poly([FX0, TOP, FX1, TOP, FX1 + D, TOP - D / 2, FX0 + D, TOP - D / 2], "k")),
  layer("glow", { light: true, density: 0.5 }, circ(FX0 + 30, TOP + 70, 20, "k")),
  // cast shadow on the ground, falling right and back
  layer("cast", { shade: true },
    poly([FX1, BOT, FX1 + D, BOT - D / 2, FX1 + D + 26, BOT - D / 2, FX1 + 26, BOT], "k"),
    poly([FX0 - 2, BOT, FX1, BOT, FX1 + 26, BOT, FX1 + 22, BOT + 3, FX0 - 2, BOT + 3], "k")),

  layer("steam",
    stamp("_steam_a", 78, 11), stamp("_steam_a", 83, 4), stamp("_steam_a", 77, -3),
    stamp("_steam_b", 86, 9), stamp("_steam_b", 74, 6)),

  layer("street",
    stamp("lamp", 2, 92), stamp("lamp", 176, 84, { flip: "x" }),
    stamp("board", 30, 138),
    box3(100, 140, 9, 12, 5, "r", "P", "p"), vline(104, 152, 5, "W"),
    box3(140, 148, 28, 3, 6, "V", "W", "v"),
    stamp("cart", 142, 134),
    stamp("_plant", 128, 146), stamp("_plant", 12, 150),
    wire(142, 41, 184, 90, 8, "W", { hang: "bulbs", every: 4, seed: 3 }),
    wire(2, 98, 20, 58, 2, "W", { hang: "bulbs", every: 4, seed: 5 })),

  layer("spill", { light: true },
    poly([FX0 + 4, BOT, FX0 + 60, BOT, FX0 + 66, BOT + 5, FX0 - 4, BOT + 5], "k")),
)
