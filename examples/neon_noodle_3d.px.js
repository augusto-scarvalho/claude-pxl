// "Neon Noodle": a steel-blue ramen bar on a rainy night street, 3/4 view (front, side, roof).
pal({
  k: "#0c0a1e",                                              // ink
  X: "#1f2f5a", x: "#2f4a8a", y: "#4a6cb8", Y: "#7fa0e0",  // blue steel
  e: "#6e6892", C: "#9a94b8", c: "#d4d0e4",                  // concrete
  M: "#b01e70", m: "#ff3d9a", i: "#ffd0e8",                  // neon magenta
  T: "#169aa8", t: "#2fe6e0", j: "#c4fffa",                  // neon cyan
  A: "#c26a1e", a: "#ffb84a", l: "#fff0b0",                  // lantern amber
  R: "#9a2038", r: "#e83a4a",                                // noren red
  G: "#1f8a5a", g: "#4ade80",                                // plants
  w: "#e8f0ff",                                              // steam
  N: "#141842", B: "#1e2a5e", b: "#2c3f86", d: "#26357a",   // night sky / far city
  z: "#14173a", s: "#3a4272",                                // road / sidewalk
})
ramps("kXxyY", "keCc", "kMmi", "kTtj", "kAal", "kRr", "kGg")
include("../lib/props/lamps.px.js", { as: "lamps" })   // the street lamp and the lanterns, taken in these colors

// ---------------------------------------------------------------- parts
sprite("_panel", `
  xxxxxxxxxxxxxxxX
  xyxxxxxxxxxxxxyX
  xxxxxxxxxxxxxxxX
  xxxxxxxxxxxxxxxX
  xxxxxxxxxxxxxxxX
  xyxxxxxxxxxxxxyX
  xxxxxxxxxxxxxxxX
  XXXXXXXXXXXXXXXX`)
sprite("_tile", `
  ccccccCe
  ccccccCe
  ccccccCe
  ccccccCe
  ccccccCe
  ccccccCe
  CCCCCCCe
  eeeeeeee`)
sprite("_bowl", `
  .......
  .lilil.
  lllllll
  .rrrrr.
  .rrrrr.
  ..RRR..
  .......`)
sprite("_noren", `
  rrrrrrr
  rrrrrrr
  rrcccrr
  rrrcrrr
  rrcccrr
  rrrrrrr
  RRRRRRR
  R.R.R.R`)
sprite("_chef", `
  ..jjj..
  .jjjjj.
  ..ccc..
  .ckckc.
  ..ccc..
  .jjjjj.
  jjjjjjj
  jjjjjjj`)
sprite("_stool", `
  .mmmm.
  .MMMM.
  ..kk..
  ..kk..
  ..kk..
  ..kk..
  .k..k.
  k....k`)
sprite("_lantern", { base: "lamps._lantern_paper", swap: roleSwap(lamps.ROLES._lantern_paper, { frame: "k", light: "al", tassel: "A" }) })
sprite("_shrub", `
  g.g.g
  gGggG
  .GGG.`)
sprite("_pigeon", `
  ..ee.
  .eeee
  eeee.
  .k.k.`)
sprite("_cat", `
  k...k..
  kk.kk..
  kakak..
  kkkkk..
  .kkkk..
  .kkkkk.
  .kkkkkk`)
sprite("_dish", { outline: "k" }, `
  ....ee...
  ..eCCCe..
  .eCCCCCe.
  eCCCCYYe.
  eCCCYYe..
  .eCYYe...
  ..eYe....
  ....e....
  ....e....
  ...eYe...
  ..eYYYe..`)
sprite("_steam_a", `
  .w.
  www
  .w.`)
sprite("_steam_b", "w")
sprite("_bulb_t", "t\nT")
sprite("_bulb_m", "m\nM")
sprite("_bulb_a", "a\nA")
group("bulbs", ["_bulb_t", "_bulb_m", "_bulb_a", "_bulb_m"])

sprite("lamp", { base: "lamps._lamp_wide", swap: roleSwap(lamps.ROLES._lamp_wide, { line: "k", frame: "eC", light: "tj" }) })

sprite("blade", { w: 12, h: 36, outline: "k" },
  rect(0, 0, 12, 36, "k"), box(0, 0, 12, 36, "m"),
  text(6, 4, "B\nA\nR", "t", { align: "c", lead: 3, shadow: "T" }), vline(6, 30, 5, "M"))

// ---------------------------------------------------------------- 3/4 geometry
const FX0 = 22, FX1 = 106, TOP = 58, BOT = 150, D = 30
const sp = (u, y) => [FX1 + u, y - u / 2]                                  // point on the side plane
const sidePoly = (u0, u1, y0, y1) =>                                       // y relative to TOP
  [...sp(u0, TOP + y0), ...sp(u1, TOP + y0), ...sp(u1, TOP + y1), ...sp(u0, TOP + y1)]
const SIDE = [FX1, TOP, FX1 + D, TOP - D / 2, FX1 + D, BOT - D / 2, FX1, BOT]
const ROOF = [FX0, TOP, FX1, TOP, FX1 + D, TOP - D / 2, FX0 + D, TOP - D / 2]
const box3 = (x, y, w, h, d, f, s, t) => (c) => {
  c.poly([x + w, y, x + w + d, y - d / 2, x + w + d, y + h - d / 2, x + w, y + h], s)
  c.poly([x, y, x + w, y, x + w + d, y - d / 2, x + d, y - d / 2], t)
  c.rect(x, y, w, h, f)
}
const sideLines = (y0, y1, step, col) => (c) => {
  for (let y = TOP + y0; y <= TOP + y1; y += step) c.line(FX1, y, FX1 + D - 1, y - (D - 1) / 2, col)
}
const sideJoints = (y0, y1, step, col) => (c) => {
  let r = 0
  for (let y = TOP + y0; y < TOP + y1; y += step, r++)
    for (let u = 4 + (r % 2) * 4; u < D; u += 8) c.vline(FX1 + u, y - Math.floor(u / 2) + 1, step - 1, col)
}
const vpipe = (u, y0, y1, col) => (c) => c.vline(FX1 + u, TOP + y0 - u / 2, y1 - y0, col)

// ---------------------------------------------------------------- scene
scene("neon_noodle_3d", { w: 192, h: 170, bg: "B", layers: true },
  layer("backdrop",
    grad(0, 0, 192, 135, "NNBBb", "v", 0.6),
    circ(158, 26, 10, "c"), circ(162, 24, 2, "C"), circ(155, 30, 1, "C"),
    // far skyline: lit windows sit on a regular grid
    (c) => {
      const r = c.rng(11)
      for (let x = 0, i = 0; x < 192; i++) {
        const w = 12 + Math.floor(r() * 10), h = 40 + Math.floor(r() * 50), y = 135 - h
        c.rect(x, y, w, h, "d"); c.hline(x, y, w, "b")
        for (let wy = y + 4; wy < 130; wy += 5)
          for (let wx = x + 3; wx < x + w - 2; wx += 4)
            if (r() < 0.22) c.px(wx, wy, r() < 0.5 ? "a" : "t")
        x += w + 1
      }
    },
    rect(0, 135, 192, 15, "s"), hline(0, 135, 192, "C"),
    rect(0, 150, 192, 20, "z"), hline(0, 150, 192, "c"), hline(0, 151, 192, "e"),
    (c) => { for (let x = 4; x < 192; x += 24) c.hline(x, 162, 12, "a") }),

  layer("roof",
    poly(ROOF, "y"),
    line(FX0 + D, TOP - D / 2, FX1 + D, TOP - D / 2, "Y"), line(FX0, TOP, FX0 + D, TOP - D / 2, "Y"),
    line(FX1, TOP, FX1 + D, TOP - D / 2, "Y"),
    // water tank on legs
    vline(36, 52, 4, "k"), vline(51, 52, 4, "k"), vline(44, 52, 4, "k"),
    ellipse(44, 49, 9, 4, "e"), rect(35, 38, 19, 11, "C"), ellipse(44, 38, 9, 4, "c"),
    hline(35, 42, 19, "e"), hline(35, 46, 19, "e"), shade([47, 38, 8, 14], 1),
    stamp("_dish", 66, 44), box3(82, 50, 10, 5, 5, "x", "X", "y"),
    // antenna mast with a warning light
    vline(94, 26, 26, "e"), hline(90, 30, 9, "e"), hline(91, 36, 7, "e"), px(94, 25, "r"),
    stamp("_pigeon", 24, 48), stamp("_cat", 112, 40), stamp("_shrub", 58, 52), stamp("_shrub", 126, 38)),

  // ---- side face
  layer("side",
    poly(SIDE, "y"),
    sideLines(8, 28, 8, "x"),
    poly(sidePoly(0, D, 0, 3), "x"), poly(sidePoly(0, D, 3, 4), "Y"),
    poly(sidePoly(0, D, 30, 33), "e"),
    poly(sidePoly(0, D, 33, 84), "c"), sideLines(41, 83, 8, "C"), sideJoints(33, 84, 8, "C"),
    poly(sidePoly(0, D, 84, 92), "y"),
    // upstairs window with blinds
    poly(sidePoly(14, 26, 8, 26), "k"), poly(sidePoly(15, 25, 9, 25), "a"),
    poly(sidePoly(15, 25, 12, 13), "A"), poly(sidePoly(15, 25, 16, 17), "A"), poly(sidePoly(15, 25, 20, 21), "A"),
    poly(sidePoly(13, 27, 26, 28), "C"),
    // downstairs window, cyan tv glow
    poly(sidePoly(16, 28, 40, 54), "k"), poly(sidePoly(17, 27, 41, 53), "T"), poly(sidePoly(17, 22, 41, 47), "t"),
    // fire escape platform + rails
    poly(sidePoly(1, 29, 58, 61), "k"), poly(sidePoly(1, 29, 58, 59), "e"),
    poly(sidePoly(1, 29, 50, 51), "e"),
    (c) => { for (let u = 1; u <= 29; u += 4) c.vline(FX1 + u, TOP + 50 - Math.floor(u / 2), 9, "e") },
    // drainpipe + ladder
    vpipe(13, -4, 92, "Y"), vpipe(12, -4, 92, "y"),
    (c) => { for (let y = 62; y < 90; y += 4) c.hline(FX1 + 3, TOP + y - 1, 4, "C"); c.vline(FX1 + 3, TOP + 61, 30, "e"); c.vline(FX1 + 6, TOP + 61, 30, "e") },
    shade(SIDE, 1)),

  // ---- front face (local coords: x = FX0, y = TOP)
  layer("front", { x: FX0, y: TOP },
    pattern("_panel", 0, 0, 84, 30),
    rect(0, 0, 84, 3, "X"), hline(0, 3, 84, "y"),
    rect(0, 30, 84, 3, "e"), hline(0, 30, 84, "C"),
    pattern("_tile", 0, 33, 84, 51),
    rect(0, 84, 84, 8, "X"), hline(0, 84, 84, "y"),
    (c) => { for (let x = 4; x < 80; x += 6) c.vline(x, 87, 4, "k") },
    // neon sign plate: bowl icon + RAMEN / NOODLE
    rect(5, 6, 54, 22, "k"), box(5, 6, 54, 22, "T"), px(6, 7, "t"), px(57, 7, "t"), px(6, 26, "t"), px(57, 26, "t"),
    poly([8, 16, 20, 16, 18, 23, 10, 23], "m"), hline(8, 16, 13, "i"), line(11, 8, 16, 15, "j"), line(14, 8, 18, 15, "j"),
    px(9, 10, "t"), px(12, 12, "T"),
    text(41, 10, "RAMEN", "t", { align: "c", shadow: "T" }),
    text(41, 18, "NOODLE", "m", { align: "c", shadow: "M" }),
    // rooftop ac units on the front
    rect(64, 6, 17, 10, "e"), box(64, 6, 17, 10, "C"), ring(70, 11, 3, "C"), circ(70, 11, 1, "k"), hline(75, 9, 4, "C"), hline(75, 12, 4, "C"),
    rect(64, 18, 17, 9, "e"), box(64, 18, 17, 9, "C"), ring(70, 22, 3, "C"), circ(70, 22, 1, "k"), hline(75, 20, 4, "C"), hline(75, 23, 4, "C"),
    // corner neon tube
    vline(82, 4, 80, "m"), vline(83, 4, 80, "M"), vline(82, 20, 8, "i"),
    // open front: frame, warm interior, shelf of bowls, chef, counter, stools
    rect(3, 36, 54, 48, "X"), hline(3, 36, 54, "y"),
    rect(5, 38, 50, 44, "k"), rect(6, 39, 48, 30, "A"), grad(6, 39, 48, 30, "Aaal", "v", 0.4),
    hline(6, 55, 48, "e"), tile("_bowl", 9, 48, 6, 1, { seed: 3 }),
    stamp("_chef", 24, 57),
    rect(5, 65, 50, 7, "C"), hline(5, 65, 50, "c"), hline(5, 71, 50, "e"),
    rect(5, 72, 50, 10, "e"), vline(18, 72, 10, "X"), vline(31, 72, 10, "X"), vline(44, 72, 10, "X"),
    tile("_noren", 5, 38, 7, 1),
    stamp("_stool", 12, 74), stamp("_stool", 26, 74), stamp("_stool", 40, 74),
    // door with porthole and OPEN strip
    rect(62, 33, 20, 8, "k"), box(62, 33, 20, 8, "m"), text(72, 35, "OPEN", "t", { align: "c" }),
    rect(62, 41, 20, 43, "X"), rect(64, 43, 16, 41, "x"), hline(64, 62, 16, "X"),
    circ(72, 53, 5, "T"), circ(70, 51, 2, "t"), ring(72, 53, 5, "y"), px(78, 70, "a"), px(78, 71, "a"),
    // lantern string across the opening
    wire(3, 38, 57, 38, 3, "k", { hang: "_lantern", every: 14, start: 6 })),

  layer("awning_shadow", { shade: true }, rect(FX0 + 3, TOP + 46, 54, 2, "k")),
  layer("roof_light", { light: true, density: 0.5 }, poly(ROOF, "k")),
  // blade sign hanging off the corner
  layer("blade", stamp("blade", FX1 + 2, TOP + 6)),

  layer("cast", { shade: true },
    poly([FX1, BOT, FX1 + D, BOT - D / 2, FX1 + D + 28, BOT - D / 2, FX1 + 28, BOT], "k")),

  layer("street",
    stamp("lamp", 5, 92), stamp("lamp", 178, 86, { flip: "x" }),
    // vending machine, bin
    box3(150, 118, 14, 30, 6, "T", "X", "t"), rect(152, 121, 10, 16, "k"),
    (c) => {
      const cols = ["m", "a", "t", "r"]
      for (let ry = 0; ry < 3; ry++) for (let rx = 0; rx < 4; rx++) c.rect(153 + rx * 2 + (rx > 1 ? 0 : 0), 123 + ry * 5, 1, 3, cols[(rx + ry) % 4])
    },
    rect(152, 140, 10, 5, "k"), px(160, 130, "a"),
    box3(138, 138, 8, 10, 3, "e", "X", "C"), hline(138, 138, 8, "c"),
    // puddles with neon reflections
    ellipse(52, 158, 16, 2, "T"), hline(44, 158, 8, "t"), ellipse(48, 160, 4, 1, "m"),
    ellipse(138, 164, 12, 2, "M"), hline(132, 164, 6, "m"),
    // manhole + steam
    ellipse(104, 155, 8, 2, "X"), hline(98, 155, 12, "y"),
    stamp("_steam_a", 102, 148), stamp("_steam_a", 106, 142), stamp("_steam_b", 100, 140), stamp("_steam_b", 108, 136), stamp("_steam_a", 101, 131), stamp("_steam_b", 105, 127),
    stamp("_shrub", 14, 146),
    wire(FX1 + D, TOP - D / 2, 184, 90, 9, "e", { hang: "bulbs", every: 4, seed: 3 }),
    wire(10, 97, FX0, TOP + 3, 4, "e", { hang: "bulbs", every: 4, seed: 6 })),

  // neon + window spill on the sidewalk, antenna light, soft halo in the night air
  layer("spill", { light: true },
    poly([FX0 + 5, BOT, FX0 + 55, BOT, FX0 + 68, BOT + 8, FX0 - 6, BOT + 8], "k"),
    circ(94, 25, 2, "k")),
  layer("halo", { light: true, density: 0.5 },
    circ(FX0 + 32, TOP + 17, 24, "k"), circ(FX0 + 30, TOP + 60, 28, "k"),
    circ(10, 94, 14, "k"), circ(182, 88, 14, "k"), circ(94, 25, 6, "k")),
)
