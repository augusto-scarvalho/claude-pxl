// "No Magic!": the witch went out for the evening and left her apprentice three chores.
// The cat was not fed, the floor was not swept, and the spellbook came off the shelf.
// The robe is in a heap by the cauldron; the apprentice (glasses and all) is now a frog,
// hunting through the book for the way back, while the hungry cat gets ready to pounce.
// The clock says 11:55. "no_magic" is the flat palette version, "no_magic_night" is lamp-lit;
// both animate (fire, candles, bubbles, the cat's tail, the frog blinking, the pendulum).
pal({
  k: "#1a1220", K: "#2b1f35",                                  // ink, deep shadow
  j: "#1f3238", T: "#2b4a50", t: "#3a6266", y: "#4f7d7c",      // teal wallpaper
  P: "#4a2c40", p: "#643b52", m: "#7d4f62", M: "#966a74",      // plum floorboards
  e: "#3b2324", W: "#5c3832", w: "#7d5040", u: "#9d6c50",      // walnut furniture
  S: "#3d3a4c", s: "#5a5770", i: "#7c7a92", I: "#a3a2b6",      // stone, iron
  B: "#8a7a68", C: "#b8a890", c: "#ddd0b0", x: "#f4ecd2",      // paper, chalk, bone
  A: "#8a5a24", a: "#d39a3a", l: "#f5cf6a", L: "#fff4b8",      // brass, candle light
  H: "#b83a2e", h: "#e8702e",                                  // fire, pumpkin
  Z: "#1f5a3a", G: "#2f9a4e", g: "#6fd85a", z: "#c8ff9a",      // the potion
  R: "#7a2e48", r: "#b84a62", q: "#e07a88",                    // rose cloth
  F: "#46702e", f: "#6a9a3a", v: "#9cc45a",                    // frog, leaves
  N: "#141a3a", n: "#22305e", b: "#3d5a9a", o: "#6f8fd0",      // night, apprentice blue
  Q: "#f6f1d5", Y: "#f8e45c",                                  // moon, eyeshine (both glow in the dark)
})
ramps("kKPpmM", "kjTty", "keWwu", "kSsiI", "SBCcx", "eAalL", "kRrq", "RHh", "kZGgz", "kFfv", "kNnbo")
include("../lib/props/lamps.px.js", { as: "lamps" })    // the oil lamp, taken in these colors
include("../lib/props/crates.px.js", { as: "crates" })   // the barrel and the crate of potions

const FLOOR = 80   // the back wall meets the floor here

// ================================================================ room shell
sprite("_paper", { w: 12, h: 12 },
  rect(0, 0, 12, 12, "t"), vline(0, 0, 12, "T"),
  px(6, 2, "y"), px(5, 3, "y"), px(7, 3, "y"), px(6, 4, "y"),
  px(6, 9, "T"))

sprite("_wainscot", { w: 24, h: 22 },
  rect(0, 0, 24, 22, "w"),
  hline(0, 0, 24, "u"), hline(0, 2, 24, "W"),                     // top rail
  hline(3, 5, 21, "W"), vline(3, 5, 11, "W"),                     // inset panel: shadowed top/left
  hline(4, 15, 20, "u"), vline(23, 6, 10, "u"),                   // lit bottom/right
  rect(0, 18, 24, 4, "W"), hline(0, 18, 24, "u"), hline(0, 21, 24, "e"))   // baseboard

sprite("floor", { w: 256, h: 144 }, (c) => {
  const r = c.rng(7)
  for (let y = 0; y < 144; y += 8) {
    let x = -Math.floor(r() * 44)
    while (x < 256) {
      const len = 30 + Math.floor(r() * 34)
      const lit = r() < 0.2
      c.rect(x, y, len, 7, lit ? "m" : "p")
      c.hline(x, y, len, lit ? "M" : "m")
      c.hline(x, y + 7, len, "P")
      c.vline(x + len - 1, y, 7, "P")
      c.px(x + 1, y + 2, "P"); c.px(x + 1, y + 5, "P")              // nails at the board end
      x += len
    }
  }
})

sprite("cobweb", `
  CCCCCCCCCCC
  CB.C..C.B.
  C.CB.C..C
  C.BCC..C
  CC..CBC
  C.C.CC
  C..CB
  C.BC
  CCC
  CB
  C`)

// ================================================================ back wall
sprite("_curtain", `
  rrrRrq...
  rrrRrqr..
  rrRrrqrR.
  rrRrrqrR.
  rrRrrqrR.
  rrRrrqrRr
  rrRrrqrRr
  rrRrrqrRr
  rrRrrqrRr
  rrRrrqrRr
  rrRrrqrR.
  rrRrrqr..
  rrRrrqr..
  rrRrqr...
  rRrqr....
  rRrqr....
  aaAaa....
  rRrqr....
  rRrqr....
  rRrqrr...
  rRrqrr...
  rRRrqrr..
  rRRrqrr..
  rRRrqrrR.
  rRRrqrrRr
  rRRrqrrRr
  RRRrRqrRr
  .RRRRRRRR`)

sprite("_flytrap", `
  .x.x....
  frrf.x.x
  .ff.frrf
  ..f..ff.
  ..ff.f..
  ...ff...
  .RRRRRR.
  .rqrrrr.
  ..rrrR..`)

sprite("window", { w: 44, h: 50, outline: "k" },
  // night outside
  grad(9, 6, 26, 32, "NNnn", "v", 0.6),
  circ(15, 13, 5, "c"), circ(15, 13, 4, "Q"), px(13, 12, "c"), px(17, 15, "c"), px(16, 11, "c"),
  px(28, 9, "x"), px(31, 16, "c"), px(25, 22, "c"), px(11, 25, "c"), px(30, 27, "x"),
  poly([9, 38, 9, 31, 15, 28, 22, 31, 28, 27, 35, 30, 35, 38], "K"),
  vline(26, 25, 3, "K"), px(25, 26, "K"), px(27, 26, "K"),          // a lonely tree on the hill
  // frame and mullions
  box(6, 3, 32, 38, "w"), box(7, 4, 30, 36, "w"), hline(8, 5, 28, "W"), vline(8, 5, 34, "W"),
  vline(21, 5, 34, "w"), vline(22, 5, 34, "W"), hline(8, 21, 28, "w"), hline(8, 22, 28, "W"),
  hline(6, 3, 32, "u"),
  // sill
  rect(3, 41, 38, 2, "u"), rect(3, 43, 38, 2, "w"), hline(3, 45, 38, "W"),
  stamp("_flytrap", 27, 32),
  // curtain rod and curtains
  hline(0, 1, 44, "S"), hline(0, 0, 44, "i"), rect(0, 0, 2, 3, "a"), rect(42, 0, 2, 3, "a"),
  stamp("_curtain", 1, 2), stamp("_curtain", 34, 2, { flip: "x" }))

sprite("_herb_a", `
  .A.
  .F.
  FfF
  bFb
  obo
  bob
  .b.`)
sprite("_herb_b", `
  .A.
  .F.
  fFf
  vfv
  fvf
  .f.
  .F.`)
sprite("_garlic", `
  .A.
  .C.
  CxC
  cxc
  xcx
  .C.`)
sprite("_chili", `
  .F.
  .H.
  .H.
  .h.
  ..H`)
group("herbs", ["_herb_a", "_herb_b", "_herb_b", "_garlic", "_chili"])

sprite("chalkboard", { w: 48, h: 28, outline: "k" },
  rect(0, 0, 48, 26, "w"), hline(0, 0, 48, "u"), rect(2, 2, 44, 22, "j"),
  hline(2, 2, 44, "k"),
  // three chores, three empty boxes
  box(4, 4, 4, 4, "C"), text(10, 4, "FEED CAT", "c"),
  box(4, 10, 4, 4, "C"), text(10, 10, "SWEEP", "c"),
  box(4, 16, 4, 4, "C"), text(10, 16, "NO MAGIC!", "q"), hline(10, 22, 35, "r"),
  // tray: eraser, no chalk
  rect(1, 25, 46, 2, "u"), hline(1, 27, 46, "W"), rect(34, 23, 7, 2, "B"), hline(34, 23, 7, "C"))

sprite("_jar_eyes", `
  .WW.
  CxxC
  xkxC
  CxkC
  xkxC
  CCCC`)
sprite("_jar_glow", `
  .WW.
  GzzG
  GgzG
  GggG
  GgGG
  ZGGZ`)
sprite("_jar_red", `
  .uu.
  .II.
  IrrI
  IrqI
  IRrI
  IRRI`)
sprite("_jar_shroom", `
  .ee.
  sCCs
  sqrs
  sxqs
  sCCs
  ssss`)
sprite("_bottle", `
  .u.
  .b.
  .b.
  bob
  bnb
  nnn`)
group("jars", ["_jar_eyes", "_jar_glow", "_jar_red", "_jar_shroom", "_bottle"])

sprite("jar_shelf", { w: 46, h: 13, outline: "k" },
  stamp("_jar_glow", 2, 0), stamp("_jar_eyes", 7, 0), stamp("_bottle", 13, 0), stamp("_jar_red", 17, 0),
  stamp("_jar_shroom", 23, 0), stamp("_bottle", 29, 0, { swap: { b: "r", o: "q", n: "R" } }),
  stamp("_jar_glow", 33, 0, { swap: { G: "b", g: "o", z: "x", Z: "n" } }), stamp("_jar_eyes", 38, 0),
  rect(0, 6, 46, 1, "u"), rect(0, 7, 46, 2, "w"), hline(0, 9, 46, "W"),
  poly([4, 10, 9, 10, 5, 13], "W"), poly([37, 10, 42, 10, 41, 13], "W"))

sprite("portrait", { outline: "k" }, `
  AaaaaaaaaaaaaaaaaA
  aAAAAAAAAAAAAAAAAa
  aAnnnnnnnnnnnnnnAa
  aAnnnnnnnnKKnnnnAa
  aAnnnnnnnKKnnnnnAa
  aAnnnnnnKKnnnnnnAa
  aAnnnnnKKKKnnnnnAa
  aAnnnnKKKKKKnnnnAa
  aAnnnnRRaRRRnnnnAa
  aAnnKKKKKKKKKKnnAa
  aAnnnIcccccIInnnAa
  aAnnnIckcckcInnnAa
  aAnnnIccccCcInnnAa
  aAnnnIcRRRccInnnAa
  aAnnnIIccccIInnnAa
  aAnnnIPPxxPPInnnAa
  aAnnPPPPaPPPPPnnAa
  aAnnPPPPPPPPPPnnAa
  aAAAAAAAAAAAAAAAAa
  aaaaaaaaaaaaaaaaaa`)

// irregular fieldstone courses, mortar below and right of every stone
const stonework = (x0, y0, w, h, seed) => clip([x0, y0, w, h], (c) => {
  const r = c.rng(seed)
  for (let y = y0, row = 0; y < y0 + h; y += 6, row++) {
    let x = x0 - 3 - (row % 2) * 4 - Math.floor(r() * 3)
    while (x < x0 + w) {
      const bw = 6 + Math.floor(r() * 6), pale = r() < 0.2
      c.rect(x, y, bw, 5, pale ? "i" : "s"); c.hline(x, y, bw - 2, pale ? "I" : "i")
      c.vline(x + bw - 1, y, 6, "S"); c.hline(x, y + 5, bw, "S")
      x += bw
    }
  }
})
const ARCH = (x, y) => y >= 58 || (x - 26.5) ** 2 / 144 + (y - 58) ** 2 / 100 <= 1

// flames: each tongue rises and falls on its own beat; 6 frames at 10 fps loop seamlessly
anim("_fire", { w: 22, h: 23, frames: 6, fps: 10 }, (c) => {
  const k = c.phase * Math.PI * 2, y = 21
  const up = (h, amp, off) => y - Math.round(h + Math.sin(k + off) * amp)
  c.poly([2, y, 4, up(9, 2, 0), 7, up(6, 1, 2), 10, up(17, 2, 1), 13, up(9, 2, 3), 16, up(13, 2, 4.5), 19, y], "H")
  c.poly([4, y, 7, up(7, 1, 1), 10, up(12, 2, 2.5), 12, up(7, 1, 0.5), 15, up(9, 2, 4), 17, y], "h")
  c.poly([6, y, 9, up(6, 1, 3), 11, up(9, 1, 1.2), 13, up(5, 1, 2), 15, y], "a")
  c.poly([8, y + 1, 10, up(4, 1, 0.7), 12, up(2, 1, 2.2), 13, y + 1], "l")
})

sprite("hearth", { w: 54, h: 84, outline: "k" },
  // chimney breast up to the beam
  stonework(7, 0, 40, 34, 3), vline(7, 0, 34, "S"), vline(46, 0, 34, "S"),
  // firebox surround, sooted above the opening
  stonework(3, 38, 48, 46, 8),
  shade([12, 39, 30, 12], 1, 0.5), shade([17, 41, 20, 6], 1, 0.5),
  // the opening: sooty back bricks, andirons, logs, flames
  clip(ARCH,
    rect(14, 46, 26, 38, "e"), rect(14, 46, 26, 6, "K"),
    (c) => {
      for (let y = 53, row = 0; y < 82; y += 4, row++) {
        c.hline(14, y, 26, "K")
        for (let x = 14 + (row % 2) * 3; x < 40; x += 6) c.vline(x, y + 1, 3, "K")
      }
    }),
  (c) => { for (let a = 0; a <= 12; a++) {                        // voussoir stones round the arch
    const t = Math.PI * (a / 12), x = 26.5 - Math.cos(t) * 13.5, y = 58 - Math.sin(t) * 11
    c.px(Math.round(x), Math.round(y), a % 2 ? "I" : "i"); c.px(Math.round(x - Math.cos(t)), Math.round(y - Math.sin(t)), "s")
  } },
  rect(23, 44, 8, 5, "i"), hline(23, 44, 8, "I"), box(23, 44, 8, 5, "S"),     // keystone
  line(16, 81, 37, 77, "W", 3), line(17, 77, 36, 81, "e", 3), circ(16, 80, 1, "u"), circ(37, 78, 1, "u"),
  stamp("_fire", 16, 58),
  vline(15, 74, 8, "k"), vline(38, 74, 8, "k"), hline(14, 74, 3, "k"), hline(37, 74, 3, "k"),
  hline(14, 82, 26, "S"), hline(14, 83, 26, "s"),
  // mantel shelf with corbels
  rect(0, 34, 54, 2, "u"), rect(0, 36, 54, 3, "w"), hline(0, 39, 54, "W"),
  rect(4, 40, 4, 4, "w"), hline(4, 43, 4, "W"), rect(46, 40, 4, 4, "w"), hline(46, 43, 4, "W"))

anim("clock", { outline: "k", fps: 10 }, `
  ....AaA....
  ...AwuwA...
  ..WwwuwwW..
  .WwwxxxwwW.
  .WwxxxxxwW.
  .WxxxxxxxW.
  .WxxxxxxxW.
  .WxxxxxxxW.
  .WwxxxxxwW.
  .WwwxxxwwW.
  ..WwwwwwW..
  ..WKKKKKW..
  ..WKKKKKW..
  ..WKKKKKW..
  ..WKKKKKW..
  ..WKKKKKW..
  ..WKKKKKW..
  ..WKKKKKW..
  ..WwwwwwW..
  ...WWWWW...
  ....WwW....
  .....W.....`,
  // 11:55, five minutes until she's home
  vline(5, 4, 3, "k"), px(4, 4, "k"), px(5, 7, "k"), px(4, 6, "K"), px(6, 7, "a"),
  // tick... tock
  frame({ hold: 6 }, line(5, 11, 4, 14, "A"), rect(3, 15, 2, 2, "a"), px(3, 15, "l")),
  frame({ hold: 6 }, line(5, 11, 6, 14, "A"), rect(6, 15, 2, 2, "a"), px(6, 15, "l")))

sprite("door", { w: 34, h: 66, outline: "k" },
  ellipse(17, 14, 16, 14, "W"), rect(1, 14, 32, 52, "W"),               // stone-dark frame
  ellipse(17, 14, 14, 12, "w"), rect(3, 14, 28, 52, "w"),
  clip((x, y) => y >= 14 || (x - 17) ** 2 / 196 + (y - 14) ** 2 / 144 <= 1,
    (c) => { for (let x = 9; x < 31; x += 6) { c.vline(x, 0, 66, "W"); c.vline(x + 1, 0, 66, "u") } },
    rect(3, 18, 28, 3, "S"), hline(3, 18, 28, "i"), rect(3, 50, 28, 3, "S"), hline(3, 50, 28, "i"),
    px(5, 19, "I"), px(28, 19, "I"), px(5, 51, "I"), px(28, 51, "I")),
  // round window
  circ(17, 11, 5, "W"), circ(17, 11, 4, "n"), px(15, 9, "o"), px(16, 9, "o"), px(15, 10, "o"), vline(17, 7, 9, "W"), hline(13, 11, 9, "W"),
  // ring handle, keyhole
  ring(26, 36, 2, "a"), px(25, 34, "l"), px(26, 41, "K"), px(26, 42, "K"),
  // the note she pinned on her way out
  rect(6, 26, 9, 11, "c"), hline(6, 36, 9, "C"), px(10, 26, "r"),
  hline(7, 28, 6, "B"), hline(7, 30, 7, "B"), hline(7, 32, 5, "B"), hline(10, 34, 4, "R"),
  rect(1, 64, 32, 2, "S"))

sprite("horseshoe", { outline: "k" }, `
  i...i
  I...i
  I...s
  .Iis.`)

sprite("broom", { w: 15, h: 47, outline: "k" }, (c) => {
  c.line(11, 0, 6, 32, "u", 2); c.line(12, 0, 7, 32, "W")
  c.poly([2, 46, 4, 34, 9, 33, 12, 46], "a")
  c.line(5, 36, 4, 46, "A"); c.line(8, 36, 8, 46, "A"); c.line(10, 37, 11, 46, "l")
  c.rect(4, 32, 6, 3, "R"); c.hline(4, 32, 6, "r")
  // nobody has used it in ages
  c.line(9, 6, 14, 3, "C"); c.line(9, 10, 14, 8, "C"); c.line(12, 4, 12, 9, "B")
})

// ================================================================ fireplace and floor around it
sprite("hearthstone", { w: 62, h: 10, outline: "k" },
  rect(0, 0, 62, 8, "s"), hline(0, 0, 62, "i"),
  vline(20, 0, 8, "S"), vline(41, 0, 8, "S"), hline(0, 4, 62, "S"), vline(10, 4, 4, "S"), vline(31, 4, 4, "S"), vline(51, 4, 4, "S"),
  rect(0, 8, 62, 2, "S"))

sprite("logs", { w: 21, h: 17, outline: "k" }, (c) => {
  const end = (x, y) => { c.circ(x, y, 3, "W"); c.circ(x, y, 2, "u"); c.px(x, y, "w"); c.px(x - 1, y - 1, "c") }
  c.rect(4, 1, 14, 7, "W"); c.hline(4, 1, 14, "w"); c.hline(5, 3, 4, "e"); c.hline(12, 4, 4, "e")   // bark, running back
  c.rect(0, 6, 21, 5, "W"); c.hline(1, 7, 3, "e"); c.hline(17, 8, 3, "e")
  end(7, 8); end(14, 8)
  end(3, 13); end(10, 13); end(17, 13)
})

sprite("bowl", { outline: "k" }, `
  ..qqqqqqq..
  .qRRRRRRRq.
  .rqqqqqqqr.
  ..rrrxrrr..
  ...RRRRR...`)

// ================================================================ the spell
sprite("cauldron", { w: 42, h: 36, outline: "k" },
  // feet
  rect(7, 30, 5, 5, "S"), rect(19, 32, 5, 4, "S"), rect(30, 30, 5, 5, "S"),
  // pot
  ellipse(21, 21, 19, 12, "S"), ellipse(19, 18, 15, 9, "s"), ellipse(15, 15, 7, 4, "i"),
  clip([0, 24, 42, 12], ellipse(21, 21, 19, 12, "K")),
  ring(1, 13, 2, "s"), ring(41, 13, 2, "s"),
  // rim and the potion inside
  ellipse(21, 11, 18, 5, "i"), ellipse(21, 11, 18, 5, "S", true), hline(6, 7, 30, "I"),
  ellipse(21, 11, 15, 3, "G"), ellipse(20, 10, 11, 2, "g"),
  circ(13, 10, 1, "z"), ring(27, 9, 2, "z"), px(27, 9, "g"), px(19, 11, "z"), px(31, 11, "G"),
  // it's boiling over the front
  (c) => {
    const drips = [[8, 6], [12, 13], [17, 4], [22, 17], [26, 7], [31, 11], [35, 5]]
    for (const [x, len] of drips) {
      c.vline(x, 14, len, "g"); c.vline(x + 1, 14, len, "G"); c.px(x, 14 + len, "G"); c.px(x + 1, 14 + len, "Z")
    }
    c.hline(5, 14, 32, "g")
  },
  // bubbles rising out
  ring(14, 2, 1, "z"), px(24, 1, "g"), px(30, 3, "z"), px(9, 5, "g"))

sprite("goo", { w: 80, h: 32, outline: "Z" },
  ellipse(46, 6, 12, 4, "G"),
  ellipse(36, 15, 28, 8, "G"), ellipse(14, 21, 12, 6, "G"), ellipse(56, 21, 14, 6, "G"),
  ellipse(30, 25, 10, 4, "G"), circ(72, 25, 2, "G"), circ(4, 13, 1, "G"), circ(76, 18, 1, "G"),
  ellipse(34, 13, 16, 4, "g"), ellipse(12, 19, 6, 2, "g"), ellipse(54, 19, 7, 2, "g"),
  hline(30, 11, 6, "z"), px(10, 18, "z"), px(52, 18, "z"), px(44, 5, "g"), hline(42, 4, 5, "g"))

sprite("_shroom_a", `
  .qq.
  qxqq
  .xC.`)
sprite("_shroom_b", `
  qrq
  .x.`)
sprite("_shroom_c", `
  .zz.
  zggz
  .xC.`)
group("shrooms", ["_shroom_a", "_shroom_b", "_shroom_b", "_shroom_c"])

sprite("chalk_circle", { w: 92, h: 44 },
  ellipse(46, 22, 45, 21, "c", true), ellipse(46, 22, 41, 18, "C", true),
  // runes between the two rings
  grid(44, 1, "c.c\n.c."), grid(44, 40, ".c.\nc.c"), grid(2, 21, "c\ncc\nc"), grid(88, 21, ".c\ncc\n.c"),
  grid(14, 6, "cc\n.c"), grid(75, 6, "cc\nc."), grid(14, 36, ".c\ncc"), grid(75, 36, "c.\ncc"),
  // scuffed where someone stepped through
  recolor({ c: "_", C: "_" }, [62, 30, 18, 14], 0.5))

anim("candle", { outline: "k", fps: 5 }, `
  .l.
  lLl
  .a.
  xxx
  cxc
  cxc
  CCC`,
  frame(), frame(grid(0, 0, "l_.\n_Ll")), frame(grid(0, 0, "._l\nlL_")))
sprite("candle_out", { outline: "k" }, `
  ..k....
  xxxxxcB
  cccccCB
  .CCCC..`)
sprite("chalk", "xxc")

// knocked over by the blast: seat on its edge, three legs in the air
sprite("stool", { w: 21, h: 15, outline: "k" },
  line(5, 7, 16, 7, "e", 2),
  line(6, 3, 19, 1, "W", 2), line(6, 11, 19, 13, "W", 2), hline(7, 2, 11, "w"), hline(7, 11, 11, "w"),
  line(14, 2, 14, 12, "W"),
  ellipse(4, 7, 4, 7, "W"), ellipse(4, 7, 3, 6, "u"), ellipse(3, 6, 1, 3, "c"))

// ================================================================ what's left of the apprentice
sprite("clothes", { w: 38, h: 21, outline: "k" },
  // robe in a heap, one sleeve flung out
  ellipse(15, 15, 14, 5, "n"), ellipse(14, 13, 12, 5, "b"), ellipse(9, 11, 6, 3, "o"),
  line(4, 15, 12, 13, "n"), line(16, 16, 24, 14, "n"), line(12, 10, 18, 11, "n"),
  line(26, 15, 34, 18, "b", 3), line(26, 14, 34, 17, "o"), line(27, 17, 34, 19, "n"),
  rect(35, 17, 2, 3, "x"),                                                     // lace cuff
  hline(5, 10, 3, "x"), px(8, 9, "x"), px(4, 11, "x"),                         // lace collar
  // her pointy hat, fallen on its side, the tip still bent
  ellipse(14, 6, 2, 6, "N"),
  poly([15, 1, 27, 4, 33, 0, 31, 5, 15, 12], "n"), poly([16, 3, 27, 5, 31, 2, 29, 5, 16, 6], "b"),
  poly([16, 1, 19, 2, 19, 11, 16, 12], "a"), vline(17, 2, 9, "l"), px(25, 8, "l"),
  // shoes
  ellipse(3, 19, 3, 1, "W"), ellipse(9, 20, 3, 1, "W"), px(2, 18, "u"), px(8, 19, "u"))

sprite("wand", { outline: "k" }, `
  .........l.
  ........lLl
  ......Wu.l.
  ....Wu.....
  ..Wu.......
  Wu.........`)

sprite("spellbook", { w: 28, h: 15, outline: "k" },
  poly([0, 12, 3, 2, 14, 2, 14, 12], "R"), poly([14, 2, 25, 2, 28, 12, 14, 12], "R"),
  rect(0, 12, 28, 3, "R"), hline(0, 12, 28, "r"),
  poly([2, 11, 4, 1, 13, 1, 13, 11], "c"), poly([14, 1, 23, 1, 25, 11, 14, 11], "x"),
  vline(13, 1, 11, "C"), vline(14, 1, 11, "c"),
  hline(5, 3, 7, "B"), hline(5, 5, 6, "B"), hline(4, 7, 7, "B"), hline(4, 9, 5, "B"),
  // the page is a frog diagram with a glowing circle
  ring(19, 5, 3, "G"), px(18, 4, "F"), px(20, 4, "F"), hline(18, 5, 3, "f"), hline(18, 6, 3, "F"),
  hline(16, 9, 7, "B"), hline(17, 10, 5, "B"),
  rect(20, 12, 2, 3, "q"))

// written as the left half; the gold rims are the apprentice's glasses
anim("frog", { mx: true, outline: "k" }, `
  .aaa..
  axxxa.
  axkxaa
  .aaaff
  ffffff
  fFFFFF
  .fvvvv
  ffvvvv
  FFf...`,
  frame({ ms: 2200 }), frame({ ms: 200 }, grid(1, 1, "fff\nfff")))

// low on its elbows, rump up, tail tip twitching: about to pounce
anim("cat", { outline: "k" }, `
  .......................sK.
  ........................K.
  .s...s..................K.
  .Ks.sKs........sssss...K..
  .KKKKKK......ssKKKKKs.Ks..
  KKKKKKKs...ssKKKKKKKKKK...
  KkYKKkYKsssKKKKKKKKKKKK...
  KKKKKKKKKKKKKKKKKKKKKKK...
  .KKqKKrKKKKKKKKKKKKKKKK...
  ..KKKKrKKKKKKKKKKKKKKKK...
  ...KKKaKKKKKKKKKKKKKKK....
  .KKKKK.KKKK...KKKKKKK.....
  KKKKK.KKK....KKKKKKK......`,
  frame({ ms: 300 }), frame({ ms: 300 }, grid(23, 0, "__K")), frame({ ms: 300 }, grid(23, 0, "_K")),
  frame({ ms: 300 }, grid(22, 0, "sK_")))

// ================================================================ furniture
const BOOKS = ["rR", "bn", "aA", "fF", "MP", "CB", "uW", "qr", "on", "GZ"]
const books = (x0, x1, yb, hmax, seed, gaps = []) => (c) => {
  const r = c.rng(seed)
  for (let x = x0; x < x1;) {
    const g = gaps.find(([gx]) => gx === x)
    if (g) { x += g[1]; continue }
    const bw = Math.min(r() < 0.35 ? 3 : 2, x1 - x), bh = hmax - Math.floor(r() * 4)
    const [m, d] = BOOKS[Math.floor(r() * BOOKS.length)]
    c.rect(x, yb - bh + 1, bw, bh, m); c.vline(x + bw - 1, yb - bh + 1, bh, d)
    if (bw === 3 || r() < 0.4) c.hline(x, yb - bh + 3, bw - 1, r() < 0.5 ? "l" : "x")
    x += bw
  }
}

sprite("_skull", `
  .cxxc.
  cxxxxC
  xkxxkC
  cxxxxC
  .cKKC.
  .cxcC.`)

sprite("bookshelf", { w: 36, h: 66, outline: "k" },
  rect(0, 0, 36, 66, "w"),
  rect(0, 0, 36, 4, "u"), hline(0, 4, 36, "W"), vline(0, 5, 61, "u"),
  rect(3, 6, 30, 13, "e"), rect(3, 22, 30, 13, "e"), rect(3, 38, 30, 13, "e"),
  books(3, 22, 18, 12, 2), stamp("_skull", 24, 13), stamp("_bottle", 30, 13),
  books(3, 33, 34, 12, 5, [[13, 5]]),                                         // the spellbook's empty slot
  books(3, 11, 50, 11, 9), stamp("_jar_glow", 12, 45), stamp("_jar_red", 17, 45),
  rect(23, 48, 9, 3, "b"), hline(23, 48, 9, "o"), rect(24, 45, 8, 3, "R"), hline(24, 45, 8, "r"),   // lying books
  hline(3, 6, 30, "k"), hline(3, 22, 30, "k"), hline(3, 38, 30, "k"),
  rect(2, 19, 32, 3, "w"), hline(2, 19, 32, "u"), hline(2, 21, 32, "W"),
  rect(2, 35, 32, 3, "w"), hline(2, 35, 32, "u"), hline(2, 37, 32, "W"),
  rect(2, 51, 32, 3, "w"), hline(2, 51, 32, "u"), hline(2, 53, 32, "W"),
  box(3, 55, 14, 10, "W"), box(19, 55, 14, 10, "W"), px(15, 60, "a"), px(21, 60, "a"))

sprite("table", { w: 56, h: 32, outline: "k" },
  rect(0, 0, 56, 14, "u"), hline(0, 4, 56, "w"), hline(0, 9, 56, "w"), hline(0, 0, 56, "w"),
  rect(0, 14, 56, 5, "w"), hline(0, 14, 56, "u"), hline(0, 18, 56, "W"),
  rect(22, 15, 12, 3, "W"), px(27, 16, "a"), px(28, 16, "a"),                     // drawer
  rect(8, 19, 3, 8, "e"), rect(45, 19, 3, 8, "e"),                                  // back legs
  rect(2, 19, 4, 13, "W"), vline(2, 19, 13, "w"), rect(50, 19, 4, 13, "W"), vline(50, 19, 13, "w"),
  hline(6, 27, 44, "e"))

sprite("mortar", { outline: "k" }, `
  .....u..
  ....u...
  .iiiIii.
  isSSSSsi
  sssssss.
  .sssss..
  ..SSS...`)
anim("candle_tall", { outline: "k", fps: 5 }, `
  ..l..
  .lLl.
  ..a..
  .xxx.
  .cxc.
  .cxx.
  .cxc.
  .cxc.
  .CcC.
  aAAAa
  .aAa.`,
  frame(), frame(grid(1, 0, "l_\n_Ll")), frame(grid(1, 0, "._l\n.L_")))
sprite("scale", { outline: "k" }, `
  ......A......
  AAAAAAaAAAAAA
  a.....a.....a
  a.....a.....a
  aaa...a...aaa
  AAA...a...AAA
  ......a......
  ....AAaAA....`)
sprite("recipe", { outline: "k" }, `
  cccccccc..
  cBBBBcccc.
  ccccccccc.
  cBBBBBBcc.
  ccccccBBcc
  cBBBcccccc
  .ccccccccc`)
sprite("teacup", { outline: "k" }, `
  xxxxx.
  xWWWxx
  cxxxc.x
  .ccc..`)
sprite("feather", { outline: "k" }, `
  ......xc
  ....xxc.
  ..xxc...
  .xc.....
  C.......`)

// tufted wingback, written as the left half
sprite("_chair_frame", { mx: true }, `
  .....aaaaaaaa
  ...aallllllll
  ..alaaaaaaaaa
  ..alaaaaaaaaa
  ..aaaaaaaaaaA
  ..aaaaaaaaaaa
  ..aaaaaaaAaaa
  ..aaaaaaaaaaa
  ..aaaaaaaaaaa
  ..aaaaaaaaaaa
  ..aaaaaaaaaaA
  .lllaaaaaaaaa
  lllllaaaaaaaa
  allllAAAAAAAA
  aaaaaAlllllll
  aaaaaAlllllll
  aaaaaAlllllll
  aaaaaAxxxxxxx
  aaaaaAaaaaaaa
  aaaaaAaaaaaaa
  AaaaaAAaaaaaa
  AAAAAAAAAAAAA
  .AAAAAAAAAAAA
  ..WW.........
  ..We.........`)

sprite("armchair", { base: "_chair_frame", outline: "k" },
  shade([0, 12, 2, 10]),
  // a knitted blanket thrown over the right arm
  poly([19, 10, 24, 11, 26, 14, 26, 24, 20, 23, 18, 16], "c"),
  line(19, 13, 25, 14, "C"), line(19, 17, 25, 18, "C"), hline(20, 21, 6, "r"), vline(25, 12, 11, "C"),
  px(21, 24, "x"), px(23, 24, "x"), px(25, 24, "x"))

sprite("basket", { outline: "k" }, `
  ..l..rrr.....
  ..l.rqrrR.Ii.
  ..lrrrrRbbI..
  .oorrrRbbobb.
  oobnRRbbbbnbb
  uwuwuwuwuwuwu
  wuwuwuwuwuwuw
  uwuwuwuwuwuwu
  WWWWWWWWWWWWW
  .WWWWWWWWWWW.`)

sprite("rug", { w: 128, h: 36 },
  (c) => { for (let y = 1; y < 35; y += 2) { c.hline(0, y, 3, "c"); c.hline(125, y, 3, "c") } },   // fringe
  rect(3, 0, 122, 36, "R"),
  rect(5, 2, 118, 32, "a"), rect(6, 3, 116, 30, "R"),
  (c) => { for (let x = 9; x < 120; x += 6) { c.px(x, 4, "a"); c.px(x + 3, 31, "a") } },
  rect(9, 6, 110, 24, "r"), box(9, 6, 110, 24, "q"),
  // medallion and corner pieces
  poly([64, 8, 94, 18, 64, 28, 34, 18], "R"), poly([64, 10, 88, 18, 64, 26, 40, 18], "a"),
  poly([64, 12, 82, 18, 64, 24, 46, 18], "R"), poly([64, 15, 73, 18, 64, 21, 55, 18], "q"),
  poly([10, 7, 22, 7, 10, 13], "R"), poly([118, 7, 106, 7, 118, 13], "R"),
  poly([10, 29, 22, 29, 10, 23], "R"), poly([118, 29, 106, 29, 118, 23], "R"),
  hline(3, 35, 122, "P"))

sprite("doormat", { outline: "k" }, `
  AaaaaaaaaaaaaaaaaaaaaaaaaaA
  aAaAaAaAaAaAaAaAaAaAaAaAaAa
  aaAaAaAaAaAaAaAaAaAaAaAaAaa
  AAAAAAAAAAAAAAAAAAAAAAAAAAA`)

sprite("dust", `
  ..C.....
  .BCC..c.
  BBCCBk.C
  .BBBBC..`)

sprite("pumpkin", { outline: "k" }, `
  .....FF.....
  ....F.......
  .hhHhhhhHhh.
  hhhHhhhhHhhh
  hhHhhlhhhHhh
  hhHhhhhhhHhh
  hhHhhhhhhHhh
  .HhHhhhhHhH.
  ..HHHHHHHH..`)
sprite("pumpkin_s", { outline: "k" }, `
  ...F...
  .hhHhh.
  hhHhlHh
  hhHhhHh
  .HHHHH.`)

sprite("barrel", { base: "crates._barrel_big", swap: roleSwap(crates.ROLES._barrel_big, { line: "k", wood: "Wwu", metal: "Si" }) })

// pointed leaf from a base point, along an angle (degrees, 0 = right, -90 = up)
const leaf = (bx, by, deg, len, wid, body, rib, hi) => (c) => {
  const a = (deg * Math.PI) / 180, dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx
  const mx = bx + dx * len * 0.45, my = by + dy * len * 0.45, tx = bx + dx * len, ty = by + dy * len
  c.poly([bx, by, mx + nx * wid, my + ny * wid, tx, ty, mx - nx * wid, my - ny * wid], body)
  c.poly([bx, by, mx + nx * wid, my + ny * wid, tx, ty], hi)
  c.line(Math.round(bx), Math.round(by), Math.round(tx - dx), Math.round(ty - dy), rib)
}

sprite("plant", { w: 30, h: 40, outline: "k" },
  leaf(15, 27, -150, 15, 4, "F", "k", "F"), leaf(15, 27, -35, 15, 4, "F", "k", "F"),
  leaf(15, 27, -120, 20, 5, "f", "F", "v"), leaf(15, 27, -65, 22, 5, "f", "F", "v"),
  leaf(15, 27, -92, 25, 5, "f", "F", "v"), leaf(15, 27, -170, 13, 4, "f", "F", "v"), leaf(15, 27, -12, 13, 4, "f", "F", "v"),
  rect(7, 28, 16, 3, "h"), hline(7, 28, 16, "l"), rect(8, 31, 14, 9, "H"), vline(9, 31, 9, "h"), hline(8, 39, 14, "R"),
  hline(9, 29, 12, "e"))

sprite("hourglass", { outline: "k" }, `
  AAAAA
  .xcx.
  ..l..
  .lll.
  AAAAA`)
sprite("photo", { outline: "k" }, `
  aaaaaa
  anKnna
  anKnba
  acKcba
  aaaaaa`)

sprite("_page_a", `
  xxxxx..
  xBBBxxx
  xxxxxxx
  .xBBBxx
  ..CCCCC`)
sprite("_page_b", `
  ..xxxx
  xxBBxx
  xxxxxx
  xBBBxC
  xxxxC.
  CCC...`)
sprite("_page_c", `
  ccccccc
  cBBcBBc
  CCCCCCC`)
group("pages", ["_page_a", "_page_b", "_page_c"])

sprite("side_table", { w: 18, h: 22, outline: "k" },
  ellipse(9, 4, 8, 3, "w"), ellipse(9, 3, 8, 3, "u"), hline(4, 1, 8, "c"),
  rect(8, 7, 3, 12, "W"), vline(8, 7, 12, "w"), ellipse(9, 19, 6, 2, "W"), hline(5, 19, 3, "w"))

sprite("oil_lamp", { base: "lamps._oil_lamp", swap: roleSwap(lamps.ROLES._oil_lamp, { line: "k", frame: "Aa", glass: "cx", light: "lL" }) })

sprite("cookies", { outline: "k" }, `
  ..ccccc..
  .cxuuWxc.
  cxuWuuxxc
  .cxxxxuc.
  ..ccccc..`)

// potion bottles packed upright, seen from above: corks and shoulders
sprite("crate", { base: "crates._crate_bottles", swap: roleSwap(crates.ROLES._crate_bottles, { line: "k", wood: "eWwu", bottles: "Gbra", cork: "c", glint: "x" }) })

// the cat's bed, empty: it has better things to do tonight
sprite("catbed", { w: 32, h: 17, outline: "k" },
  ellipse(16, 9, 15, 7, "W"), ellipse(16, 8, 15, 7, "w"), ellipse(16, 7, 14, 6, "u"),
  (c) => { for (let x = 3; x < 30; x += 3) { c.vline(x, 10 + (x % 2), 3, "W"); c.px(x + 1, 11, "u") } },   // wicker
  ellipse(16, 7, 11, 4, "r"), ellipse(16, 8, 8, 3, "R"), ellipse(14, 6, 5, 1, "q"),
  px(19, 8, "K"), px(20, 9, "K"), px(12, 9, "K"),                               // black hairs
  ring(26, 3, 2, "b"), px(27, 2, "o"), line(24, 4, 20, 6, "b"))                    // a toy yarn ball

sprite("trunk", { w: 36, h: 24, outline: "k" },
  rect(0, 0, 36, 8, "b"), hline(0, 0, 36, "o"), rect(0, 8, 36, 3, "n"), rect(0, 11, 36, 13, "b"),
  hline(0, 11, 36, "o"), hline(0, 23, 36, "n"),
  rect(7, 0, 2, 24, "W"), rect(27, 0, 2, 24, "W"), px(7, 0, "w"), px(27, 0, "w"),
  rect(0, 0, 2, 2, "a"), rect(34, 0, 2, 2, "a"), rect(0, 22, 2, 2, "A"), rect(34, 22, 2, 2, "A"),
  rect(16, 8, 4, 5, "a"), px(17, 9, "l"), px(18, 10, "k"), px(18, 11, "k"),
  // travel stickers: a moon, a star, and (of course) a frog
  circ(4, 16, 2, "l"), circ(5, 15, 1, "b"), grid(11, 14, `.x.
  xxx
  .x.`),
  rect(30, 14, 4, 4, "f"), px(30, 14, "v"), px(33, 14, "v"), hline(31, 16, 2, "F"))

// the chair pushed back from the work table; we see its back
sprite("chair", { w: 14, h: 25, outline: "k" },
  rect(0, 0, 2, 25, "w"), rect(12, 0, 2, 25, "w"), vline(0, 0, 25, "u"),
  rect(0, 0, 14, 3, "u"), hline(0, 2, 14, "w"),
  rect(2, 6, 10, 2, "w"), hline(2, 6, 10, "u"), rect(2, 10, 10, 2, "w"), hline(2, 10, 10, "u"),
  rect(0, 14, 14, 3, "u"), hline(0, 16, 14, "W"),
  rect(0, 17, 2, 8, "W"), rect(12, 17, 2, 8, "W"), rect(3, 17, 2, 6, "e"), rect(9, 17, 2, 6, "e"))

sprite("book_stack", { outline: "k" }, `
  ..rrrrrrrrrq.
  ..RRRRRRRRRx.
  .bbbbbbbbbbbo
  .nnnnnnnnnnxx
  aaaaaaaaaaal.
  AAAAAAAAAAxx.
  .ffffffffffv.
  .FFFFFFFFFFx.`)

// bubbles rising out of the pot, popping at the top: 12 frames, each bubble on its own phase
anim("bubbles", { w: 24, h: 22, frames: 12, fps: 10 }, (c) => {
  const bubbles = [[6, 0, 2], [15, 0.35, 1], [10, 0.6, 1], [18, 0.8, 0], [4, 0.15, 0]]
  for (const [x, off, r] of bubbles) {
    const p = (c.phase + off) % 1, y = Math.round(21 - p * 20), bx = x + Math.round(Math.sin(p * 9) * 1.5)
    if (p > 0.85) { c.px(bx - 1, y, "z"); c.px(bx + 1, y, "z"); c.px(bx, y - 1, "z") }   // pop
    else if (r && p < 0.5) { c.ring(bx, y, r, "z"); c.px(bx, y, "g") }
    else c.px(bx, y, p < 0.5 ? "g" : "z")
  }
})

sprite("spider", `
  .C.
  .C.
  .C.
  .C.
  kCk
  kKk
  k.k`)

sprite("tin", { outline: "k" }, `
  .iIIi.
  siiiis
  rrrrrr
  rxxxqr
  rrxrrr
  SsssSS`)

sprite("_moth", `
  c.c
  .C.`)

sprite("mousehole", { outline: "e" }, `
  ..kkkk..
  .kkkkkk.
  kkkkkkkk
  kkkkkkkk
  kkkkkkkk
  kkkkkkkk`)
sprite("mouse", `
  .ii....
  iqis...
  .ssssk.
  .sssssq
  C.ss...`)
sprite("cheese", `
  ..l
  lla
  aAa`)

sprite("_print", "g.g")
sprite("_spark_a", ".l.\nlLl\n.l.")
sprite("_spark_b", "L")
group("sparks", ["_spark_a", "_spark_b", "_spark_b"])

// ================================================================ flickering light
// An irregular but seamless wobble (-1..1): a few sines whose frequencies are whole numbers.
const wobble = (c, seed) => {
  const k = c.phase * Math.PI * 2
  return 0.55 * Math.sin(k + seed) + 0.3 * Math.sin(3 * k + seed * 2) + 0.15 * Math.sin(5 * k + seed * 3)
}
// Invisible anims that only carry a lamp: stamping one places a light that breathes.
const flame_lamp = (name, r, power, color, seed) =>
  anim(name, { w: 1, h: 1, frames: 12, fps: 10 }, (c) => {
    const f = wobble(c, seed)
    c.lamp(0, 0, { r: r * (1 + 0.04 * f), power: power * (1 + 0.06 * f), color })
  })
flame_lamp("_fire_lamp", 90, 1.1, "#ffb27a", 0)
flame_lamp("_candle_lamp", 26, 1, "#ffd58a", 1)
flame_lamp("_lamp_lamp", 46, 1, "#ffd58a", 2)
// For the flat version: light pools (drawn into light: layers) that grow and shrink a pixel or two.
anim("_pool", { w: 13, h: 13, frames: 12, fps: 10 }, (c) => c.circ(6, 6, Math.round(4 + 0.6 * wobble(c, 1)), "k"))
anim("_pool_big", { w: 23, h: 23, frames: 12, fps: 10 }, (c) => c.circ(11, 11, Math.round(8 + 0.7 * wobble(c, 2)), "k"))
anim("_fire_pool", { w: 70, h: 20, frames: 12, fps: 10 }, (c) => {
  const f = wobble(c, 0)
  c.ellipse(35, 10, Math.round(30 + 1.5 * f), 7, "k")
})

// ================================================================ the room
const PRINTS = [[150, 160], [147, 164], [144, 168], [141, 172], [138, 176]]

scene("no_magic", { w: 256, h: 224, bg: "k", layers: true },
  layer("room",
    pattern("_paper", 0, 0, 256, 58), pattern("_wainscot", 0, 58, 256, 22),
    stamp("floor", 0, FLOOR),
    shade([0, FLOOR, 256, 2]),                                                     // where floor meets wall
    rect(0, 0, 256, 6, "w"), hline(0, 0, 256, "u"), hline(0, 5, 256, "W"), hline(0, 6, 256, "e"),
    shade([0, 7, 256, 2], 1, 0.5)),

  layer("wall",
    stamp("cobweb", 0, 7), stamp("spider", 7, 9),
    stamp("window", 42, 7),
    wire(44, 7, 86, 7, 5, "W", { hang: "herbs", every: 7, start: 5 }),
    stamp("jar_shelf", 92, 11), stamp("chalkboard", 92, 29),
    stamp("clock", 199, 12),
    stamp("horseshoe", 228, 7), stamp("door", 213, 15),
    stamp("mousehole", 70, 72)),

  layer("rugs",
    stamp("hearthstone", 138, 89), stamp("doormat", 218, 81),
    stamp("rug", 66, 172),
    stamp("chalk_circle", 78, 106),
    stamp("goo", 70, 132),
    scatter("shrooms", 70, 136, 76, 26, 9, { on: "gG", seed: 3 }),
    ...PRINTS.map(([x, y]) => stamp("_print", x, y))),

  // fire, potion and moon light on the floor
  layer("floor_light", { light: true },
    poly([52, FLOOR, 78, FLOOR, 96, 104, 66, 104], "k"),
    stamp("_fire_pool", 135, 87),
    ellipse(124, 134, 38, 17, "k")),

  layer("contact", { shade: true },
    rect(2, 89, 40, 4, "k"), ellipse(124, 140, 20, 3, "k"), ellipse(20, 133, 14, 3, "k"),
    rect(196, 150, 56, 3, "k"), ellipse(45, 139, 6, 2, "k"), ellipse(164, 191, 12, 2, "k"),
    rect(28, 197, 36, 3, "k"), ellipse(228, 180, 15, 2, "k"), rect(214, 158, 14, 2, "k"),
    ellipse(14, 222, 13, 3, "k"), ellipse(15, 155, 8, 2, "k")),

  layer("furniture",
    stamp("bookshelf", 2, 22),
    stamp("hearth", 142, 7),
    stamp("logs", 119, 77), stamp("bowl", 205, 97), stamp("tin", 219, 92), stamp("dust", 236, 86),
    stamp("broom", 239, 38),
    stamp("pumpkin", 42, 80), stamp("pumpkin_s", 54, 86),
    stamp("mouse", 77, 75), stamp("cheese", 86, 82),
    stamp("stool", 62, 106),
    stamp("table", 194, 118),
    stamp("cauldron", 102, 104),
    stamp("chair", 214, 133),
    stamp("book_stack", 6, 94),
    stamp("armchair", 6, 106), stamp("side_table", 36, 118), stamp("basket", 8, 142),
    stamp("clothes", 140, 137), stamp("wand", 128, 160),
    stamp("spellbook", 110, 178), stamp("frog", 113, 172),
    stamp("cat", 150, 177),
    stamp("catbed", 212, 163),
    stamp("trunk", 26, 172), stamp("barrel", 2, 192), stamp("crate", 32, 204), stamp("plant", 228, 186)),

  layer("props",
    stamp("portrait", 159, 9),
    // mantel
    stamp("candle", 145, 33, { rdelay: true }), stamp("hourglass", 155, 35), stamp("photo", 181, 34), stamp("candle", 190, 33, { rdelay: true }),
    // side table and work table
    stamp("bubbles", 110, 84),
    stamp("oil_lamp", 37, 109), stamp("_moth", 31, 103), stamp("_moth", 45, 100), stamp("_moth", 42, 106), stamp("cookies", 44, 115),
    stamp("mortar", 198, 112), stamp("candle_tall", 212, 104), stamp("recipe", 222, 115),
    stamp("scale", 232, 108), stamp("teacup", 201, 123), stamp("feather", 238, 122),
    // the ritual circle
    stamp("candle", 82, 120, { rdelay: true }), stamp("candle", 162, 120, { delay: 200 }), stamp("candle_out", 84, 140), stamp("chalk", 96, 156),
    stamp("_page_a", 70, 100), stamp("_page_b", 176, 128), stamp("_page_c", 100, 160), stamp("_page_a", 160, 104, { flip: "x" }),
    stamp("_page_b", 58, 156, { flip: "x" }),
    scatter("sparks", 126, 154, 22, 12, 4, { seed: 2 })),

  // small warm pools around flames
  layer("flame_light", { light: true },
    stamp("_pool", 77, 118, { rdelay: true }), stamp("_pool", 157, 118, { rdelay: true }),
    stamp("_pool_big", 28, 101, { rdelay: true }), stamp("_pool_big", 203, 99, { rdelay: true }),
    ellipse(146, 34, 3, 2, "k"), ellipse(191, 34, 3, 2, "k")),
  glow("Q", { r: 6, ramp: 2 }),
)

// The same room with the lamps doing the lighting: fire, potion, candles and moonlight.
scene("no_magic_night", { w: 256, h: 224, bg: "k" },
  stamp("no_magic", 0, 0),
  stamp("_fire_lamp", 169, 78),
  lamp(124, 112, { r: 80, color: "#b4ff9c" }),
  lamp(64, 26, { r: 30, color: "#b9c3ff", power: 0.8 }), lamp(66, 96, { r: 46, color: "#a9b6ff", power: 0.8 }),
  lamp(130, 182, { r: 40, color: "#a8ffd8", power: 0.9 }),                     // the open spellbook glows
  stamp("_lamp_lamp", 39, 112, { rdelay: true }), stamp("_lamp_lamp", 214, 106, { rdelay: true }),
  ...[[146, 34], [191, 34], [83, 121], [163, 121]].map(([x, y]) => stamp("_candle_lamp", x, y, { rdelay: true })),
  lighting({ cell: 2, smooth: true, ambient: 0.42, ambientColor: "#8f8fd0", emit: "zYQ" }),
  // things that shine get a halo on top of the light
  glow("zgG", { r: 7, strength: 0.32 }),
  glow("Q", { r: 9, strength: 0.55 }),
  glow("lLah", { where: [155, 66, 26, 22], r: 14, strength: 0.55 }),        // the fire
  glow("L", { r: 5, strength: 0.7 }),                                       // candle and lamp flames
  glow("Y", { r: 3, strength: 0.8 }))                                       // the cat's eyes

sheet("no_magic_props", [
  "window", "chalkboard", "jar_shelf", "portrait", "hearth", "clock", "door", "horseshoe", "broom", "cobweb", "spider",
  "bookshelf", "table", "chair", "armchair", "side_table", "trunk", "barrel", "crate", "plant", "catbed",
  "cauldron", "bubbles", "goo", "chalk_circle", "clothes", "wand", "spellbook", "frog", "cat",
  "hearthstone", "logs", "bowl", "tin", "stool", "basket", "book_stack", "pumpkin", "pumpkin_s", "rug", "doormat", "dust",
  "candle", "candle_out", "candle_tall", "oil_lamp", "cookies", "mortar", "scale", "recipe", "teacup", "feather", "chalk",
  "hourglass", "photo", "mousehole", "mouse", "cheese",
], { pad: 2 })
