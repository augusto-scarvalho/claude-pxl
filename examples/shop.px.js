// "Comet Repair": a night-time telescope shop under its own observatory dome.
pal({
  k: "#1b1630",                                   // ink
  Z: "#2a2550", z: "#383270",                     // night sky (lit)
  w: "#fff6e0",                                   // starlight
  c: "#efdcb6", C: "#c8ae8a", e: "#a88c6c",       // plaster
  d: "#8a5a3c", D: "#5c3a2c",                     // wood
  t: "#3e7f86", T: "#2a5560", q: "#62a8a4",       // teal wall
  o: "#d9844a", O: "#a0553a", u: "#f2b36e",       // copper / brass
  p: "#78c4a4", P: "#4b8c7a",                     // patina
  l: "#fff0a8", L: "#ffc85e", a: "#ef8f3e",       // lamp light
  m: "#b4b8cf", M: "#727893", n: "#4a4e6a",       // metal / stone
  r: "#e2585e", R: "#a63a4c",                     // red
  g: "#8ccf63", G: "#4c8a44",                     // leaves
})
// dark -> light; earlier ramps win when a key appears twice (lighting D gives wood d)
ramps("kZz", "kDd", "kDeCc", "kTtq", "kOou", "aLl", "kPp", "knMm", "kRr", "kGg")
include("../lib/props/lamps.px.js")    // the street lamp and the lantern, taken in these colors
include("../lib/props/crates.px.js")   // the crate

// ---------------------------------------------------------------- small parts
sprite("_dentil", `
  dd..
  DD..`)
sprite("_awning", `
  RRRRCCCC
  RRRRCCCC
  rrrrcccc
  rrrrcccc
  rrrrcccc
  rrrrcccc
  rrrrcccc
  rrrrcccc
  rrrrcccc
  .rr..cc.`)
sprite("_rail", `
  nM.
  nM.
  nM.
  nM.
  nM.
  nM.
  nM.`)

// shop-window trinkets (6x7, bottom row sits on the shelf)
sprite("_globe", `
  ......
  ..PP..
  .PpgP.
  .PppP.
  ..PP..
  ...n..
  ..nnn.`)
sprite("_jar", `
  ......
  .nnnn.
  .MllM.
  .MlwM.
  .MllM.
  .MLLM.
  ..MM..`)
sprite("_scope", `
  ......
  ....uo
  ...uO.
  ..nn..
  .n.n..
  n...n.
  n...n.`)
sprite("_books", `
  ......
  ......
  .r....
  .rd...
  .rdt..
  .rdtq.
  .rdtq.`)
sprite("_bottle", `
  ......
  ...n..
  ...M..
  ..ppp.
  ..pwp.
  ..ppp.
  ..PPP.`)
group("trinkets", ["_globe", "_jar", "_scope", "_books", "_bottle"])

sprite("_pot", `
  .g.g..
  gGgg.g
  .gGgg.
  ..Gg..
  .oooo.
  .OooO.
  ..OO..`)

sprite("_porthole", { w: 19, h: 19 },
  circ(9, 9, 9, "M"), circ(9, 9, 7, "L"), circ(7, 7, 4, "l"), px(6, 6, "w"), px(5, 7, "w"),
  hline(2, 9, 15, "M"), vline(9, 2, 15, "M"), ring(9, 9, 7, "m"), ring(9, 9, 9, "n"),
  shade([10, 10, 9, 9]))

sprite("_ac", { w: 13, h: 10 }, rect(0, 0, 13, 10, "m"), box(0, 0, 13, 10, "M"),
  circ(4, 4, 3, "M"), circ(4, 4, 1, "n"), vline(9, 2, 6, "M"), vline(11, 2, 6, "M"), hline(1, 9, 11, "n"))

sprite("_lantern", { base: "_lantern_hanging", swap: roleSwap(lamps.ROLES._lantern_hanging, { frame: "n", light: "aLlw" }) })

sprite("_drip_a", "p\np\nP")
sprite("_drip_b", "P\np\np\np\nP")

sprite("_bulb_y", "l\nL")
sprite("_bulb_r", "r\nR")
sprite("_bulb_p", "p\nP")
group("bulbs", ["_bulb_y", "_bulb_y", "_bulb_r", "_bulb_p"])

sprite("_star_a", "w")
sprite("_star_b", "m")
sprite("_star_c", `
  .m.
  mwm
  .m.`)
group("stars", ["_star_a", "_star_a", "_star_b", "_star_b", "_star_c"])

// ---------------------------------------------------------------- the shop (with its own layers)
sprite("shop", { w: 104, h: 100, outline: "k", layers: true },
  layer("walls",
    rect(0, 0, 104, 48, "c"), noise(0, 6, 104, 42, "C", 0.05, 2, "c"),
    rect(0, 48, 104, 52, "t"), noise(0, 52, 104, 44, "T", 0.05, 3, "t"),
    rect(0, 0, 104, 4, "d"), hline(0, 4, 104, "D"), pattern("_dentil", 0, 5, 104, 2),
    rect(0, 48, 104, 3, "d"), hline(0, 51, 104, "D"),
    rect(0, 95, 104, 5, "M"), hline(0, 95, 104, "m"), noise(0, 96, 104, 4, "n", 0.2, 4, "M")),

  layer("upstairs",
    rect(20, 9, 50, 15, "D"), box(20, 9, 50, 15, "d"),
    px(21, 10, "u"), px(68, 10, "u"), px(21, 22, "u"), px(68, 22, "u"),
    text(45, 12, "COMET", "l", { scale: 2, align: "c", shadow: "a" }),
    stamp("_porthole", 5, 26), stamp("_porthole", 47, 26), stamp("_ac", 28, 36),
    rect(76, 18, 18, 30, "D"), grad(78, 20, 14, 27, "lLa"), vline(84, 20, 27, "D"),
    rect(70, 46, 34, 2, "D"), hline(70, 37, 34, "n"), pattern("_rail", 70, 38, 34, 8),
    stamp("_pot", 70, 30), stamp("_pot", 96, 30, { flip: "x" })),

  layer("storefront",
    pattern("_awning", 2, 52, 56, 10),
    rect(6, 62, 48, 31, "d"), grad(8, 64, 44, 28, "lLLa"),
    tile("trinkets", 9, 65, 7, 1), tile("trinkets", 9, 75, 7, 1), tile("trinkets", 9, 85, 7, 1),
    hline(8, 72, 44, "D"), hline(8, 82, 44, "D"), vline(30, 64, 28, "d"),
    rect(4, 92, 52, 3, "d"), hline(4, 94, 52, "D"),
    rect(60, 57, 20, 38, "D"), rect(62, 59, 16, 36, "d"),
    circ(69, 65, 4, "L"), circ(68, 64, 2, "l"), ring(69, 65, 4, "D"),
    box(64, 79, 12, 7, "D"), box(64, 87, 12, 7, "D"), px(76, 82, "u"),
    line(64, 71, 69, 69, "n"), line(75, 71, 70, 69, "n"),
    rect(61, 71, 18, 7, "c"), box(61, 71, 18, 7, "C"), text(63, 72, "OPEN", "r"),
    stamp("_lantern", 86, 60),
    rect(83, 71, 14, 19, "c"), box(83, 71, 14, 19, "C"),
    circ(90, 78, 3, "o"), circ(89, 77, 1, "u"), line(84, 80, 96, 76, "R"),
    px(85, 73, "a"), px(94, 74, "a"), text(90, 84, "SKY", "D", { align: "c" }),
    rect(99, 6, 3, 89, "m"), vline(101, 6, 89, "M"), hline(98, 30, 5, "n"), hline(98, 70, 5, "n")),

  layer("awning_shadow", { shade: true }, rect(0, 62, 60, 3, "k")),
  layer("glow", { light: true }, circ(88, 63, 8, "k")),
)

// ---------------------------------------------------------------- rooftop
sprite("dome", { w: 56, h: 32, outline: "k" },
  clip([0, 0, 56, 28],
    ellipse(27, 28, 27, 26, "o"),
    ellipse(27, 28, 15, 26, "O", true), ellipse(27, 28, 6, 26, "O", true)),
  light([17, 12, 13], 1, 0.5), light([16, 11, 9]), light([14, 9, 4], 1, 0.5),
  shade([38, 0, 18, 28], 1, 0.5), shade([45, 0, 11, 28]), shade([0, 22, 56, 6], 1, 0.5),
  scatter("_drip_*", 0, 2, 56, 24, 9, { on: "oOu", clip: true, seed: 4 }),
  rect(30, 0, 6, 28, "k"), vline(29, 2, 26, "O"), vline(36, 2, 26, "D"),
  rect(0, 26, 56, 6, "M"), hline(0, 26, 56, "m"), hline(0, 31, 56, "n"),
  (c) => { for (let x = 3; x <= 53; x += 6) c.px(x, 28, "n") })

sprite("scope", { w: 30, h: 24, outline: "k" },
  line(4, 19, 20, 8, "M", 5), line(3, 17, 19, 6, "m"), line(5, 21, 21, 10, "n"),
  line(8, 13, 11, 17, "u"), line(9, 13, 12, 17, "o"),
  line(20, 8, 24, 5, "n", 6), line(19, 6, 23, 3, "M"),
  line(23, 2, 27, 8, "u"), line(24, 3, 26, 6, "l"))

sprite("dish", { outline: "k" }, `
  ....nn......
  ..nmmmn.....
  .nmmmmmn....
  nmmmmmMMn...
  nmmmmMMn....
  .nmmMMn.....
  ..nMMn......
  ....n.......
  ....n.......
  ...nMn......
  ..nMMMn.....
  ..nnnnn.....`)

sprite("_cat", `
  n...n..
  nn.nn..
  nlnln..
  nnnnn..
  .nnnn..
  .nnnnn.
  .nnnnnn`)

// ---------------------------------------------------------------- street props
sprite("_plank", `
  dddD
  dddD
  ddDD
  dddD`)
sprite("_tin", `
  ppP
  ppP
  pPP`)

sprite("shed", { w: 30, h: 34, outline: "k" },
  clip([0, 7, 30, 0, 30, 16, 0, 16], pattern("_tin", 0, 0, 30, 16)),   // roof sloping up to the right
  pattern("_plank", 0, 16, 30, 18),
  rect(8, 19, 12, 9, "D"), grad(9, 20, 10, 7, "lLa"), vline(13, 20, 7, "D"), hline(9, 23, 10, "D"),
  rect(0, 33, 30, 1, "D"))

sprite("crate", { base: "_crate_latch", swap: roleSwap(crates.ROLES._crate_latch, { line: "k", wood: "Dd", metal: "ul" }) })

sprite("lamp", { base: "_lamp_square", swap: roleSwap(lamps.ROLES._lamp_square, { line: "k", frame: "nM", light: "Llw" }) })

// ---------------------------------------------------------------- scene
scene("comet_repair", { w: 192, h: 192, bg: "Z", layers: true },
  layer("sky",
    scatter("stars", 0, 0, 192, 140, 46, { seed: 9 }),
    // comet: bright core, tail fading up-left
    (c) => {
      c.line(41, 35, 19, 20, "L")
      c.line(41, 35, 29, 27, "l")
      const r = c.rng(5)
      for (let t = 0; t <= 44; t++) {
        const x = 40 - t, y = 34 - t * 0.7, half = 1 + t * 0.07
        for (let o = -half; o <= half; o++)
          if (r() < 1 - t / 46)
            c.px(Math.floor(x - o * 0.5), Math.floor(y + o * 0.8), t < 6 ? "w" : t < 14 ? "l" : t < 28 ? "L" : "a")
      }
      c.circ(41, 35, 2, "w")
    }),

  layer("roof",
    stamp("dome", 75, 36), stamp("scope", 101, 32), stamp("dish", 52, 54),
    vline(140, 34, 34, "n"), hline(136, 44, 9, "n"), hline(137, 52, 7, "n"),
    line(136, 44, 140, 38, "n"), line(144, 44, 140, 38, "n"), circ(140, 33, 1, "r")),

  layer("buildings",
    stamp("shed", 15, 133), stamp("shop", 45, 67),
    stamp("_cat", 64, 61), stamp("_cat", 30, 124, { flip: "x" })),

  layer("street",
    rect(8, 169, 178, 4, "M"), hline(8, 169, 178, "m"), noise(8, 170, 178, 3, "n", 0.15, 3, "M"),
    hline(10, 173, 174, "n"),
    stamp("crate", 150, 158), stamp("crate", 156, 148), stamp("crate", 162, 158, { flip: "x" }),
    stamp("_pot", 22, 162), stamp("_pot", 36, 162, { flip: "x" }),
    stamp("lamp", 170, 111),
    vline(10, 112, 57, "n"), hline(7, 114, 7, "n"),
    wire(47, 70, 10, 114, 6, "n", { hang: "bulbs", every: 4 }),
    wire(151, 70, 175, 112, 5, "n", { hang: "bulbs", every: 4, seed: 2 })),

  // window and lamp light on the street and the night air: dithered halo + solid core
  layer("halo", { light: true, density: 0.5 },
    circ(175, 117, 16, "k"), circ(140, 33, 5, "k"), poly([40, 169, 110, 169, 120, 175, 30, 175], "k")),
  layer("spill", { light: true },
    poly([50, 169, 100, 169, 106, 173, 44, 173], "k"), poly([166, 169, 184, 169, 188, 173, 162, 173], "k"),
    circ(175, 117, 10, "k"), circ(140, 33, 3, "k")),
)
