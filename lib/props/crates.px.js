// Crates and barrels to stand in a scene, the ones the examples drew, each in role keys: crates.ROLES
// names each one's roles (line, wood, metal and so on, each its keys dark to light), so a scene takes
// one in its own colors by base and swap:
//   sprite("crate", { base: "crates._crate_latch", swap: roleSwap(crates.ROLES._crate_latch, { line: "k", wood: "Dd", metal: "ul" }) })
// (a swap on a base from another file reads its keys here, the colors it swaps to in yours). Each is
// drawn in the colors of the scene it was made for. For any scene: include("<path>/lib/props/crates.px.js",
// { as: "crates" }), its palette its own.
// Crates, 14 to 30 px: _crate_latch, _crate_plain, _crate_fish, _crate_bottles, and _crate_face with
// _crate_lid (a mesh crate's textures). Barrels: _barrel_small, _barrel_big.
const crates = { ROLES: {} }
// in a block: its names stay its own when a scene includes the file
{
const R = crates.ROLES
// A crate's faces for mesh() (hd2d/harbor.px.js's, laid a texel to a pixel): boards 3 px across over dark
// seams, each its own tone, grain in runs, nail heads at their ends, a lighter brace on the diagonal;
// the lid's boards. Its wood one ramp, 1 the nails to 7 the lit brace; a board's grain a step under it.
pal({ 1: "#2e1e14", 2: "#4f3320", 3: "#66432a", 4: "#74502f", 5: "#876039", 6: "#9c7244", 7: "#c49c64" })
R._crate_face = R._crate_lid = { wood: "1234567" }
sprite("_crate_face", { w: 14, h: 13 }, (c) => {
  for (let Y = 0; Y < 13; Y++) for (let X = 0; X < 14; X++) {
    const b = Math.floor(Y / 4), r = Y % 4, base = hash(b, 51) < 0.5 ? 4 : 5
    c.px(X, Y, String(Math.abs(X - ((12 - Y) * 14) / 12) < 1.2 ? (r === 3 ? 5 : 7) : r === 3 ? 2 : (X === 1 || X === 12) && r === 1 ? 1 : hash(Math.floor(X / 4), Y) < 0.25 ? base - 1 : base))
  }
})
sprite("_crate_lid", { w: 14, h: 6 }, (c) => { for (let Y = 0; Y < 6; Y++) for (let X = 0; X < 14; X++) c.px(X, Y, X % 5 === 4 ? "2" : Y === 0 ? "7" : hash(X % 5, Y) < 0.3 ? "5" : "6") })
// A barrel at a 17 px to the meter scene's scale (the harbor's, 0.65 x 0.9 m, 13x17, its pivot at its
// foot): staves 3 px, bulging at its middle, two pairs of dark hoops, its lid seen from above; lit on the
// right. Normal-mapped (bump), so its colors stay the harbor's: the bump reads them. The same wood.
pal({ k: "#1d1410" })
R._barrel_small = { line: "k", wood: "1234567" }
sprite("_barrel_small", { w: 11, h: 15, pivot: "bottom", outline: "k" }, (c) => {
  for (let Y = 0; Y < 15; Y++) {
    const half = Y === 0 ? 3 : Y < 3 ? 4 : 4 + Math.round(Math.sin(((Y - 2) / 12) * Math.PI))
    for (let X = 5 - half; X <= 5 + half; X++) {
      const dx = X - 5
      c.px(X, Y, Y < 3 ? (Y === 0 || Math.abs(dx) === half ? "2" : Y === 1 ? "6" : "4")
        : Y === 4 || Y === 12 ? (dx >= 2 ? "4" : "1") : Y === 5 || Y === 11 ? "2" : X % 3 === 0 ? "2" : dx >= 2 ? "7" : dx <= -2 ? "4" : "6")
    }
  }
}, bump("hybrid"))
// A crate with a brace and a brass latch (shop.px.js's, 14x12).
pal({ k: "#1b1630", W: "#5c3a2c", w: "#8a5a3c", M: "#f2b36e", m: "#fff0a8" })
R._crate_latch = { line: "k", wood: "Ww", metal: "Mm" }
sprite("_crate_latch", { w: 12, h: 10, outline: "k" },
  rect(0, 0, 12, 10, "w"), box(0, 0, 12, 10, "W"), line(1, 8, 10, 1, "W"),
  px(5, 4, "M"), px(6, 4, "M"), px(5, 5, "M"), px(6, 5, "m"))
// A crate with a brace, its top board lit, its pivot at its foot (sidescroller/forest.px.js's, 14x12).
pal({ k: "#1a1626", W: "#5a3a2a", w: "#8a5a3a", o: "#c48a50" })
R._crate_plain = { line: "k", wood: "Wwo" }
sprite("_crate_plain", { w: 12, h: 10, outline: "k", pivot: "bottom" },
  rect(0, 0, 12, 10, "w"), box(0, 0, 12, 10, "W"), line(1, 1, 10, 8, "W"), hline(1, 1, 10, "o"))
// A crate seen from the front and the right, a top and a side going 6 px back, three fish tails sticking
// out of it (tackle.px.js's, 22x21).
pal({ k: "#2a1b3d", W: "#663c3c", w: "#9a6248", c: "#d4bea4", F: "#7d7aa6", f: "#b7b4d6" })
R._crate_fish = { line: "k", wood: "Ww", rim: "c", fish: "Ff" }
sprite("_crate_fish_tail", `
  f.f
  fff
  .F.
  .F.
  .f.`)
sprite("_crate_fish", { w: 20, h: 19, outline: "k" },
  poly([0, 6, 6, 3, 20, 3, 14, 6], "W"), poly([14, 6, 20, 3, 20, 15, 14, 18], "W"), rect(0, 6, 14, 12, "w"),
  hline(0, 11, 14, "W"), line(1, 17, 13, 7, "W"), rect(1, 7, 12, 1, "c"),
  stamp("_crate_fish_tail", 2, 1), stamp("_crate_fish_tail", 8, 0, { flip: "x" }), stamp("_crate_fish_tail", 12, 2))
// A crate of potion bottles packed upright, seen from above, corks and shoulders, stencilled XXX
// (no_magic.px.js's, 30x26).
pal({ k: "#1a1220", e: "#3b2324", W: "#5c3832", w: "#7d5040", u: "#9d6c50", g: "#2f9a4e", b: "#3d5a9a", r: "#b84a62", y: "#d39a3a", c: "#ddd0b0", x: "#f4ecd2" })
R._crate_bottles = { line: "k", wood: "eWwu", bottles: "gbry", cork: "c", glint: "x" }
sprite("_crate_bottles", { w: 28, h: 24, outline: "k" },
  rect(0, 0, 28, 8, "e"), box(0, 0, 28, 8, "u"),
  (c) => {
    const cols = ["g", "b", "r", "g", "y", "b", "r", "g"]
    for (let i = 0; i < 8; i++) {
      const x = 3 + (i % 4) * 6, y = 1 + Math.floor(i / 4) * 3, k = cols[i]
      c.rect(x, y + 1, 4, 3, k); c.px(x + 1, y + 1, "x"); c.rect(x + 1, y, 2, 2, "u"); c.px(x + 1, y, "c")
    }
  },
  rect(0, 8, 28, 16, "w"), hline(0, 8, 28, "u"),
  hline(0, 13, 28, "W"), hline(0, 18, 28, "W"), vline(0, 8, 16, "W"), vline(27, 8, 16, "W"),
  rect(1, 10, 2, 13, "W"), rect(25, 10, 2, 13, "W"), text(14, 12, "XXX", "W", { align: "c" }))
// A barrel with iron hoops, its top an ellipse (no_magic.px.js's, 24x32).
pal({ k: "#1a1220", W: "#5c3832", w: "#7d5040", u: "#9d6c50", M: "#3d3a4c", m: "#7c7a92" })
R._barrel_big = { line: "k", wood: "Wwu", metal: "Mm" }
sprite("_barrel_big", { w: 22, h: 30, outline: "k" },
  rect(0, 4, 22, 24, "w"), ellipse(11, 4, 10, 3, "u"), ellipse(11, 4, 10, 3, "W", true),
  ellipse(11, 4, 7, 2, "w", true),
  (c) => { for (let x = 4; x < 22; x += 5) c.vline(x, 7, 21, "W") },
  vline(1, 7, 21, "u"), rect(0, 9, 22, 2, "M"), rect(0, 21, 22, 2, "M"), hline(0, 9, 22, "m"), hline(0, 21, 22, "m"),
  ellipse(11, 28, 10, 2, "W"))
}
