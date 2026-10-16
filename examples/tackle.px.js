// "Gull & Gill": a bait & tackle shop with a tugboat bridge parked on its roof.
// 3/4 oblique view: front face + right side face receding up-right (2:1 slope).
pal({
  k: "#2a1b3d",                                             // ink
  v: "#c9b6ee", V: "#a891d8", U: "#8670b9", X: "#6a5598",    // lilac bg / pavement
  q: "#7cc6b4", t: "#3f8f8c", T: "#2c6670", N: "#1f4554",    // sea-green walls
  w: "#fffaf0", c: "#f4e4c8", C: "#d4bea4", e: "#a8907e",    // cream
  o: "#ffb39a", r: "#f0766a", R: "#c24d5a", Q: "#7e2f4a",    // coral
  h: "#ffe28a", y: "#f2b544", Y: "#c47f2e",                 // mustard
  d: "#9a6248", D: "#663c3c",                               // wood
  m: "#b7b4d6", M: "#7d7aa6", n: "#4b4774",                 // metal
  W: "#e6fff8", a: "#8ff0e0", A: "#4cc2c4",                 // aquarium glow
  g: "#8fcf6a", G: "#4a8a52",                               // kelp / plants
})
ramps("kNTtq", "kQRro", "keCcw", "kDd", "kYyh", "knMm", "AaW", "kGg", "XUVv")

// ---------------------------------------------------------------- oblique helpers
// Main block: front face at x F0..F0+W, y T0..T0+H; side face goes D px right and D/2 up.
const F0 = 36, T0 = 76, W = 76, H = 94, D = 24
const S = (u, v) => [F0 + W + u, T0 + v - u / 2]           // side-face coords -> screen
const side = (u0, v0, u1, v1, c) => poly([...S(u0, v0), ...S(u1, v0), ...S(u1, v1), ...S(u0, v1)], c)
// A box seen from the front-right-top: (x, y) = front top-left corner.
const box3 = (x, y, w, h, d, top, sd, front) => [
  poly([x, y, x + d, y - d / 2, x + w + d, y - d / 2, x + w, y], top),
  poly([x + w, y, x + w + d, y - d / 2, x + w + d, y + h - d / 2, x + w, y + h], sd),
  rect(x, y, w, h, front),
]
// Ordered-dither test: true on a fraction t of pixels, evenly spread.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
const dirty = (x, y, t) => BAYER[(y & 3) * 4 + (x & 3)] / 16 < t
// Paint flaked off a siding board: rows of [offset, length] starting at face coords (u, v).
// "front" maps straight; "side" follows the side face slant. Top row is shadowed by the paint edge.
const flake = (face, u, v, rows) => (c) => rows.forEach(([o, n], j) => {
  for (let i = o; i < o + n; i++) {
    const x = F0 + i + u + (face === "side" ? W : 0)
    const y = face === "side" ? Math.floor(T0 + v + j - (u + i) / 2) : T0 + v + j
    c.px(x, y, j === 0 ? "D" : "d")
  }
})
// Rain stain running down from a ledge: solid at the top, broken up toward the end.
const stain = (x, y, len, from, to) => (c) => {
  for (let k = 0; k < len; k++) if ((k < len / 2 || k % 2 === 0) && c.is(x, y + k, from)) c.px(x, y + k, to)
}
// Rain splash-back: darkens "from" pixels in the h rows above yb(x), densest at the bottom.
const grime = (x0, x1, yb, h, from, to) => (c) => {
  for (let x = x0; x < x1; x++)
    for (let k = 0; k < h; k++) {
      const y = yb(x) - 1 - k
      if (c.is(x, y, from) && dirty(x, y, 1 - k / h)) c.px(x, y, to)
    }
}

// ---------------------------------------------------------------- the shop block
sprite("shop", { w: 192, h: 172, outline: "k" },
  layer("mass",
    ...box3(F0, T0, W, H, D, "M", "T", "t"),                // roof deck, side, front
    ...box3(52, 50, 40, 23, 12, "N", "C", "c"),             // wheelhouse on the roof
    noise(40, 65, 94, 11, "n", 0.08, 5, "M")),              // tar-and-gravel roof deck (on "M": same layer)

  layer("roof",
    // funnel behind the bridge: red stack, white band, sooty rim
    rect(66, 25, 11, 22, "r"), vline(66, 25, 22, "o"), rect(75, 25, 2, 22, "R"),
    rect(66, 31, 11, 4, "w"), rect(75, 31, 2, 4, "C"), stamp("_anchor", 69, 37),
    ellipse(71, 25, 5, 2, "Q"), ellipse(71, 25, 3, 1, "k"),
    // mast with radar bar and fish weathervane
    vline(99, 14, 33, "n"), hline(94, 27, 11, "n"), px(94, 28, "r"), px(104, 28, "q"),
    rect(97, 20, 5, 3, "M"), hline(92, 20, 15, "m"), hline(92, 21, 15, "n"),
    stamp("_vane", 95, 8),
    // bridge front: portholes, nameplate; side: porthole; railing on the bridge roof
    ...[60, 72, 84].map((x) => stamp("_porthole", x - 4, 53)),
    rect(53, 64, 38, 8, "N"), hline(53, 64, 38, "T"), text(72, 66, "GULL&GILL", "h", { align: "c" }),
    stamp("_porthole", 94, 54),
    hline(52, 46, 40, "m"), (c) => { for (let x = 52; x <= 91; x += 6) c.vline(x, 46, 4, "m") },
    line(92, 46, 103, 41, "m"), vline(97, 44, 4, "m"), vline(103, 41, 4, "m"),
    // deck clutter: rope coil, lobster trap, vent
    ellipse(47, 72, 4, 2, "y"), ellipse(47, 72, 2, 1, "Y"), px(47, 72, "M"),
    ...box3(104, 67, 9, 7, 6, "D", "D", "d"),
    (c) => { for (let x = 105; x < 113; x += 2) c.vline(x, 68, 5, "D"); c.hline(104, 70, 9, "D") },
    rect(118, 60, 4, 5, "m"), rect(117, 59, 6, 2, "M"),
  ),
  layer("self_shadow", { shade: true },
    rect(46, 101, 50, 2, "k"), rect(96, 84, 2, 18, "k"),          // under/right of the sign
    rect(38, 135, 52, 2, "k"), rect(F0, 124, 2, 40, "k"),         // under the awning, corner
    poly([92, 73, 104, 67, 104, 70, 98, 73], "k"),                // wheelhouse on the deck
    poly([77, 47, 80, 47, 86, 44, 77, 44], "k")),                 // funnel on the bridge roof

  layer("facade",
    // siding on the upper floor (front + side), cornice, floor band, cream ground floor, stone base
    (c) => { for (let v = 9; v < 44; v += 4) { c.hline(F0, T0 + v, W, "T"); c.line(...S(0, v), ...S(23, v), "N") } },
    rect(F0, T0, W, 5, "c"), hline(F0, T0, W, "w"), hline(F0, T0 + 5, W, "C"),
    side(0, 0, 24, 5, "C"), line(...S(0, 5), ...S(23, 5), "e"),
    rect(F0, 120, W, 4, "d"), hline(F0, 123, W, "D"), side(0, 44, 24, 48, "D"),
    rect(F0, 124, W, 40, "c"), side(0, 48, 24, 88, "C"),
    // stone base: front blocks in running bond, side in shadow
    rect(F0, 164, W, 6, "M"), hline(F0, 164, W, "m"), hline(F0, 167, W, "n"),
    (c) => { for (let x = F0 + 6; x < F0 + W; x += 8) { c.vline(x, 165, 2, "n"); c.vline(x + 4, 168, 2, "n") } },
    side(0, 88, 24, 94, "n"), line(...S(0, 88), ...S(23, 88), "M"),
    vline(119, 157, 3, "k"), vline(127, 153, 3, "k"), line(...S(0, 91), ...S(23, 91), "k"),

    // big sign board with thickness
    ...box3(42, 85, 50, 16, 4, "h", "Y", "y"),
    text(46, 88, "BAIT", "Q", { scale: 2, shadow: "Y" }), stamp("_fish", 79, 90),
    px(43, 86, "w"), px(90, 86, "Y"), px(43, 99, "Y"), px(90, 99, "Y"),

    // upper windows, life ring
    stamp("_win", 41, 105), stamp("_win", 59, 105),
    circ(91, 111, 6, "r"), circ(91, 111, 3, "t"), ring(91, 111, 6, "R"), ring(91, 111, 3, "R"),
    rect(90, 105, 3, 3, "w"), rect(90, 115, 3, 3, "w"), rect(85, 110, 3, 3, "w"), rect(95, 110, 3, 3, "w"),
    line(91, 104, 91, 102, "e"),

    // side window with a half-down blind
    side(5, 11, 17, 31, "e"), side(6, 12, 16, 30, "N"), side(6, 12, 16, 17, "C"),
    line(...S(7, 22), ...S(11, 20), "T"), line(...S(7, 26), ...S(14, 23), "T"),

    // awning (coral/white stripes, scalloped hem)
    (c) => {
      for (let x = 38; x < 90; x += 8) {
        c.rect(x, 124, 4, 9, "r"); c.rect(x + 4, 124, 4, 9, "w")
        c.hline(x + 1, 133, 2, "R"); c.hline(x + 5, 133, 2, "C")
      }
    },
    shade([38, 124, 52, 2]),

    // shop window: aquarium on the left, the bait-man at the counter on the right
    rect(40, 135, 48, 28, "D"), rect(42, 137, 44, 24, "N"),
    rect(43, 140, 20, 13, "A"), hline(43, 140, 20, "W"), rect(43, 141, 20, 2, "a"),
    rect(43, 153, 20, 2, "n"), vline(45, 155, 6, "n"), vline(60, 155, 6, "n"),
    line(46, 152, 47, 147, "g"), line(48, 152, 48, 145, "G"), line(58, 152, 59, 148, "g"),
    stamp("_minnow", 50, 145), stamp("_minnow", 54, 148, { flip: "x", swap: { o: "h" } }),
    vline(64, 137, 24, "D"),
    stamp("_baitman", 69, 140), rect(65, 153, 21, 3, "d"), hline(65, 153, 21, "C"),
    stamp("_jar", 66, 149), stamp("_jar", 81, 149, { swap: { g: "o", G: "r" } }),
    line(43, 138, 45, 136, "q"), line(66, 139, 69, 136, "q"),
    rect(38, 162, 52, 2, "c"), hline(38, 162, 52, "w"),

    // door + wall lamp
    rect(92, 129, 18, 35, "D"), rect(94, 131, 14, 33, "t"), vline(94, 131, 33, "q"),
    circ(101, 139, 4, "M"), circ(101, 139, 3, "a"), px(100, 137, "W"), px(99, 138, "W"), ring(101, 139, 4, "n"),
    box(96, 147, 10, 14, "T"), px(106, 152, "h"),
    rect(99, 125, 5, 3, "h"), hline(98, 124, 7, "n"),

    // side wall: drain pipe, chalk price board
    vline(131, 68, 91, "m"), vline(132, 67, 91, "M"), hline(130, 90, 4, "n"), hline(130, 130, 4, "n"),
    side(8, 52, 18, 66, "D"), side(9, 53, 17, 65, "N"),
    (c) => { for (let v = 56; v < 64; v += 3) c.line(...S(10, v), ...S(15 - (v % 4), v), "C") },

    // weathering: sea air has flaked the paint off a few siding boards down to bare wood,
    // rust runs off the pipe bracket, rain splash-back grime darkens the base of both walls
    flake("front", 41, 34, [[1, 5], [0, 4], [1, 2]]), flake("front", 67, 38, [[0, 6], [1, 4], [3, 2]]),
    flake("front", 41, 30, [[2, 4], [0, 3]]), flake("front", 70, 14, [[0, 3], [0, 2]]),
    flake("side", 3, 34, [[1, 6], [0, 5], [2, 3]]), flake("side", 10, 38, [[0, 4], [1, 4], [1, 2]]),
    flake("side", 1, 18, [[0, 3], [1, 2]]), flake("side", 21, 26, [[0, 2], [0, 3], [1, 1]]),
    stain(114, 124, 6, "C", "e"), stain(117, 122, 4, "C", "e"), stain(134, 114, 7, "C", "e"),
    stain(89, 136, 5, "c", "C"), stain(110, 124, 6, "c", "C"),
    px(130, 131, "Y"), px(130, 132, "Y"), px(130, 133, "e"), px(130, 135, "e"),
    px(133, 131, "Y"), px(133, 132, "e"), px(133, 134, "e"),
    grime(F0, F0 + W, () => 164, 7, "c", "C"),
    grime(F0 + W, F0 + W + D, (x) => 164 - Math.floor((x - F0 - W) / 2), 9, "C", "e"),

    // blade sign sticking out toward the viewer from the front-left corner
    poly([24, 96, 36, 90, 36, 126, 24, 132], "y"),
    line(24, 96, 35, 90, "Y"), line(24, 131, 35, 126, "Y"), vline(24, 96, 36, "Y"),
    text(28, 98, "F\nI\nS\nH", "R"), line(24, 94, 36, 88, "n"), line(24, 133, 36, 128, "n"),
  ),
)

// ---------------------------------------------------------------- facade parts
sprite("_fish", `
  ..RRR...R.
  .RrrrR.RR.
  RrkrrrrRR.
  .RrrrR.RR.
  ..RRR...R.`)
sprite("_minnow", `
  .oo.o
  okooo
  .oo.o`)
sprite("_win", { w: 15, h: 14 },
  rect(0, 0, 15, 13, "e"), rect(1, 1, 13, 11, "N"), rect(1, 1, 13, 4, "C"), hline(1, 4, 13, "e"),
  vline(7, 5, 7, "e"), line(2, 10, 5, 7, "T"), line(9, 11, 13, 7, "T"),
  rect(0, 12, 15, 2, "c"), hline(0, 12, 15, "w"))
sprite("_baitman", `
  ..yyyy...
  .yyhhyy..
  yyyyyyyyy
  ..ooko...
  ..oooo...
  .cccccc..
  yyccccyy.
  yyyccyyyy
  yyyyyyyyy
  yyyyyyyyy
  yYyyyyyYy
  yYyyyyyYy`)
sprite("_porthole", { w: 9, h: 9 },
  circ(4, 4, 4, "M"), circ(4, 4, 3, "a"), ring(4, 4, 4, "n"), px(3, 2, "W"), px(2, 3, "W"),
  shade([5, 5, 4, 4]))
sprite("_anchor", `
  .n.
  nnn
  .n.
  n.n
  .n.`)
sprite("_vane", `
  ....n.....
  ..yyyy..y.
  .yykyyyyy.
  ..yyyy..y.
  ....n.....
  ....n.....`)
sprite("_jar", `
  nnn
  gGg
  GgG`)

// ---------------------------------------------------------------- scene
// ---------------------------------------------------------------- street props
sprite("lamp", { w: 13, h: 80, outline: "k" },
  vline(6, 12, 64, "n"), vline(5, 12, 64, "M"), rect(3, 75, 7, 5, "n"), hline(3, 75, 7, "M"),
  rect(2, 3, 9, 9, "t"), rect(3, 4, 7, 7, "h"), rect(4, 5, 3, 4, "w"), vline(6, 4, 7, "T"),
  hline(1, 2, 11, "T"), hline(3, 1, 7, "T"), px(6, 0, "T"), hline(1, 12, 11, "T"),
  rect(0, 30, 13, 7, "c"), hline(0, 36, 13, "C"), text(1, 31, "EEL", "R"),
  rect(0, 39, 13, 7, "c"), hline(0, 45, 13, "C"), text(1, 40, "COD", "T"))
sprite("pole", { w: 4, h: 64, outline: "k" }, rect(1, 0, 2, 64, "d"), vline(1, 0, 64, "o"), rect(0, 60, 4, 4, "D"))

sprite("crate", { w: 20, h: 19, outline: "k" },
  ...box3(0, 6, 14, 12, 6, "D", "D", "d"),
  hline(0, 11, 14, "D"), line(1, 17, 13, 7, "D"), rect(1, 7, 12, 1, "C"),
  stamp("_tail", 2, 1), stamp("_tail", 8, 0, { flip: "x" }), stamp("_tail", 12, 2))
sprite("_tail", `
  m.m
  mmm
  .M.
  .M.
  .m.`)
sprite("icebox", { w: 30, h: 22, outline: "k" },
  ...box3(0, 5, 22, 16, 8, "m", "C", "w"), rect(0, 5, 22, 3, "m"), hline(0, 8, 22, "M"),
  line(22, 5, 29, 1, "M"), text(11, 11, "ICE", "A", { align: "c", shadow: "a" }),
  rect(1, 19, 3, 2, "M"), rect(18, 19, 3, 2, "M"))
sprite("buoy", { w: 9, h: 16, outline: "k" },
  ellipse(4, 8, 4, 7, "r"), rect(0, 5, 9, 3, "w"), rect(0, 11, 9, 2, "w"),
  shade([6, 0, 3, 16]), vline(4, 0, 2, "n"), light([1, 3, 2, 3]))
sprite("rods", { w: 14, h: 50 },
  line(1, 49, 6, 0, "D"), line(8, 49, 13, 6, "n"), line(2, 44, 6, 6, "d"),
  rect(1, 37, 3, 3, "k"), rect(2, 38, 1, 1, "m"), rect(8, 39, 3, 3, "k"), px(9, 40, "y"))
sprite("bucket", { w: 10, h: 10, outline: "k" },
  poly([0, 2, 10, 2, 9, 10, 1, 10], "q"), hline(0, 2, 10, "w"), vline(8, 3, 7, "t"),
  px(2, 1, "o"), px(3, 0, "o"), px(5, 1, "r"), px(6, 1, "o"), line(1, 2, 5, -2, "n"), line(9, 2, 5, -2, "n"))
sprite("_cat", `
  n...n..
  nn.nn..
  nhnhn..
  nnnnn..
  .nnnn..
  .nnnnn.
  .nnnnnn`)
sprite("_gull", `
  ..ww.
  .wwwy
  mwww.
  .Mw..
  ..y..`)
sprite("_gull_fly", `
  mm...mm
  ..mwm..
  ...w...`)
sprite("_pennant_r", `rrr\nrr\nr`)
sprite("_pennant_y", `yyy\nyy\ny`)
sprite("_pennant_w", `www\nww\nw`)
sprite("_pennant_t", `qqq\nqq\nq`)
group("pennants", ["_pennant_*"])

// ---------------------------------------------------------------- scene
scene("gull_and_gill", { w: 192, h: 192, bg: "v", layers: true },
  layer("sky",
    circ(82, 18, 3, "w"), circ(88, 12, 4, "w"), circ(96, 7, 3, "c"), circ(102, 4, 2, "c"), px(86, 10, "c"),
    stamp("_gull_fly", 22, 30), stamp("_gull_fly", 150, 22, { flip: "x" }), stamp("_gull_fly", 162, 34)),
  layer("pavement",
    poly([8, 178, 158, 178, 192, 161, 192, 154, 50, 154, 42, 158, 8, 158], "V"),
    rect(8, 178, 150, 3, "U"), poly([158, 178, 192, 161, 192, 164, 158, 181], "X"),
    (c) => { for (let x = 22; x < 190; x += 16) c.line(x, 177, x + 44, 155, "U") },
    hline(8, 172, 156, "U"), hline(8, 165, 170, "U")),
  layer("cast_shadow", { shade: true },
    poly([112, 171, 136, 159, 166, 159, 148, 171], "k"),
    poly([4, 172, 22, 172, 24, 169, 6, 169], "k"),
    poly([132, 170, 168, 170, 172, 165, 136, 165], "k")),
  layer("buildings", stamp("shop", -1, -1)),
  layer("props",
    stamp("rods", 18, 122), stamp("bucket", 23, 161),
    stamp("lamp", 2, 92), stamp("_gull", 4, 88),
    stamp("pole", 176, 106), stamp("_gull", 175, 101, { flip: "x" }),
    stamp("crate", 113, 152), stamp("crate", 116, 140, { flip: "x" }),
    stamp("icebox", 137, 148), stamp("buoy", 166, 154),
    stamp("_cat", 84, 77), stamp("_gull", 60, 41),
    wire(103, 27, 178, 107, 10, "n", { hang: "pennants", every: 5, seed: 3 }),
    wire(8, 93, 25, 95, 2, "n")),
)
