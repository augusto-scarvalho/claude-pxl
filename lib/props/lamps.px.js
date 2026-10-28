// Lamps to stand in a scene, the post lamps and the small lights the examples drew, each in role keys:
// lamps.ROLES names each one's roles (line, frame, cap, glass, light and so on, each its keys dark to
// light), so a scene takes one in its own colors by base and swap:
//   sprite("lamp", { base: "_lamp_square", swap: roleSwap(lamps.ROLES._lamp_square, { line: "k", frame: "nM", light: "Llw" }) })
// (a swap on a base from another file reads its keys here, the colors it swaps to in yours). Each is
// drawn in the colors of the scene it was made for. For any scene: include("<path>/lib/props/lamps.px.js"),
// its palette its own.
// Posts: _lamp (the HD-2D one), _lamp_tiny, _lamp_globe, _lamp_wide, _lamp_square, _lamp_box,
// _lamp_signs. Small lights: _torch, _lantern_hanging, _lantern_paper, _lantern_ship, _oil_lamp.
const lamps = { ROLES: {} }
// in a block: its names stay its own when a scene includes the file
{
const R = lamps.ROLES
// The HD-2D post (the hd2d plaza's, 7x30, its pivot at its foot): a pole of dark iron, a lantern of glass
// on top under a cap, its glass brighter than anything lit, for the bloom.
pal({ F: "#1a1620", L: "#ffd27a", l: "#fff3c4" })
R._lamp = { frame: "F", light: "Ll" }
sprite("_lamp", { w: 7, h: 30, pivot: "bottom" }, rect(3, 8, 1, 22, "F"), rect(1, 28, 5, 2, "F"),
  rect(1, 1, 5, 1, "F"), rect(1, 2, 5, 5, "L"), rect(2, 3, 3, 3, "l"), rect(0, 7, 7, 1, "F"))
// A tiny post, 3x18, a box of light on top that carries its own lamp (lighting.px.js's).
pal({ F: "#3d2617", l: "#e0f4ff" })
R._lamp_tiny = { frame: "F", light: "l" }
sprite("_lamp_tiny", { w: 3, h: 18 },
  rect(1, 3, 1, 15, "F"), box(0, 0, 3, 3, "F"), px(1, 1, "l"),
  lamp(1, 1, { r: 30, color: "#bfe0ff" }))
// A globe on a post with a crossbar, a bead hung at each end (moon_bakery_3d.px.js's, 19x68).
pal({ k: "#2b1740", F: "#4a2a74", f: "#6a3d9a", G: "#c98a2e", l: "#ffe27a", w: "#fffaf0", p: "#ff7fa8", m: "#7fe0b0" })
R._lamp_globe = { line: "k", frame: "Ff", glass: "G", light: "lw", beads: "pm" }
sprite("_lamp_globe", { w: 17, h: 66, outline: "k" },
  vline(8, 16, 50, "F"), vline(7, 16, 50, "f"), rect(4, 62, 9, 4, "F"), hline(4, 62, 9, "f"),
  hline(0, 12, 17, "f"), line(8, 16, 2, 12, "F"), line(8, 16, 14, 12, "F"),
  circ(8, 6, 6, "l"), circ(6, 4, 3, "w"), ring(8, 6, 6, "G"),
  circ(2, 14, 2, "p"), circ(14, 14, 2, "m"))
// A wide head, its light underneath (neon_noodle_3d.px.js's, 13x62).
pal({ k: "#0c0a1e", F: "#6e6892", f: "#9a94b8", L: "#2fe6e0", l: "#c4fffa" })
R._lamp_wide = { line: "k", frame: "Ff", light: "Ll" }
sprite("_lamp_wide", { w: 11, h: 60, outline: "k" },
  vline(5, 8, 52, "F"), vline(4, 8, 52, "f"), rect(2, 56, 7, 4, "F"), hline(2, 56, 7, "f"),
  rect(0, 0, 11, 6, "F"), rect(1, 2, 9, 4, "L"), rect(2, 3, 7, 2, "l"), hline(0, 0, 11, "f"))
// A square lantern under a stepped cap (shop.px.js's, 13x60).
pal({ k: "#1b1630", F: "#4a4e6a", f: "#727893", L: "#ffc85e", l: "#fff0a8", w: "#fff6e0" })
R._lamp_square = { line: "k", frame: "Ff", light: "Llw" }
sprite("_lamp_square", { w: 11, h: 58, outline: "k" },
  vline(5, 12, 44, "F"), vline(4, 12, 44, "f"), rect(2, 54, 7, 4, "F"), hline(2, 54, 7, "f"),
  rect(1, 2, 9, 9, "F"), rect(2, 3, 7, 7, "L"), rect(3, 4, 4, 4, "l"), px(3, 4, "w"),
  hline(0, 1, 11, "F"), hline(3, 0, 5, "F"), hline(1, 11, 9, "F"))
// A small box lantern, its pivot at its foot (sidescroller/forest.px.js's, 9x32).
pal({ k: "#1a1626", F: "#3b2a40", L: "#c48a50", w: "#f4f0e0" })
R._lamp_box = { line: "k", frame: "F", light: "Lw" }
sprite("_lamp_box", { w: 7, h: 30, outline: "k", pivot: "bottom" },
  rect(3, 6, 1, 24, "F"), rect(2, 28, 3, 2, "F"), rect(1, 0, 5, 6, "F"), rect(2, 1, 3, 4, "L"), px(2, 1, "w"))
// A tall post with a lantern in a painted cage and two signs hung on it (tackle.px.js's, 15x82; the
// second sign's letters in the cap's dark).
pal({ k: "#2a1b3d", F: "#4b4774", f: "#7d7aa6", C: "#2c6670", c: "#3f8f8c", l: "#ffe28a", w: "#fffaf0", S: "#d4bea4", s: "#f4e4c8", r: "#c24d5a" })
R._lamp_signs = { line: "k", frame: "Ff", cap: "Cc", light: "lw", sign: "Ss", letters: "r" }
sprite("_lamp_signs", { w: 13, h: 80, outline: "k" },
  vline(6, 12, 64, "F"), vline(5, 12, 64, "f"), rect(3, 75, 7, 5, "F"), hline(3, 75, 7, "f"),
  rect(2, 3, 9, 9, "c"), rect(3, 4, 7, 7, "l"), rect(4, 5, 3, 4, "w"), vline(6, 4, 7, "C"),
  hline(1, 2, 11, "C"), hline(3, 1, 7, "C"), px(6, 0, "C"), hline(1, 12, 11, "C"),
  rect(0, 30, 13, 7, "s"), hline(0, 36, 13, "S"), text(1, 31, "EEL", "r"),
  rect(0, 39, 13, 7, "s"), hline(0, 45, 13, "S"), text(1, 40, "COD", "C"))
// A torch, 3x5, that carries its own lamp (lighting.px.js's).
pal({ L: "#ff8a2a", l: "#ffd36b", h: "#3d2617" })
R._torch = { light: "Ll", handle: "h" }
sprite("_torch", `
  .l.
  lLl
  .L.
  .h.
  .h.`, lamp(1, 1, { r: 44, color: "#ffb35c" }))
// A lantern to hang, 5x6, a glint on its glass (shop.px.js's).
pal({ F: "#4a4e6a", O: "#ef8f3e", L: "#ffc85e", l: "#fff0a8", w: "#fff6e0" })
R._lantern_hanging = { frame: "F", light: "OLlw" }
sprite("_lantern_hanging", `
  ..F..
  .FFF.
  FllLF
  FlwLF
  FlLOF
  .FFF.`)
// A paper lantern with a tassel, 5x6, to hang on a wire (neon_noodle_3d.px.js's).
pal({ F: "#0c0a1e", L: "#ffb84a", l: "#fff0b0", t: "#c26a1e" })
R._lantern_paper = { frame: "F", light: "Ll", tassel: "t" }
sprite("_lantern_paper", `
  ..F..
  .LLL.
  LlllL
  LlllL
  .LLL.
  ..t..`)
// A ship's lantern as on a galleon's stern (hd2d/harbor.px.js's, 15x38, its pivot at its foot): a gold
// finial, a red roof, white panels with dark windows between red corner posts, a red foot; lit from
// behind on the right; normal-mapped (bump), so its colors stay the harbor's: the bump reads them.
pal({ k: "#1d1410", T: "#b8892e", t: "#f0d077", F: "#741820", f: "#a52a32", P: "#7d776c", p: "#f2ecdd", G: "#2e1e14", g: "#4f3320" })
R._lantern_ship = { line: "k", trim: "Tt", frame: "Ff", panel: "Pp", glass: "Gg" }
sprite("_lantern_ship", { w: 13, h: 36, pivot: "bottom", outline: "k" }, (c) => {
  c.rect(6, 0, 1, 2, "t"); c.rect(5, 2, 3, 1, "T")
  for (let r = 0; r < 6; r++) { const half = r + 1; c.rect(6 - half, 3 + r, half, 1, "F"); c.rect(6, 3 + r, half + 1, 1, "f") }
  c.rect(1, 9, 11, 1, "T")
  c.rect(1, 10, 3, 18, "P"); c.rect(4, 10, 8, 18, "p")       // the side toward the sun as light as the front, the other in shade
  for (const x of [3, 9]) c.rect(x, 10, 1, 18, "F")
  for (const y of [12, 20]) { c.rect(5, y, 3, 6, "G"); c.rect(6, y, 1, 6, "g"); c.rect(5, y + 3, 3, 1, "g"); c.rect(1, y, 2, 6, "G"); c.rect(10, y, 1, 6, "g") }
  c.rect(1, 28, 11, 1, "T")
  for (let r = 0; r < 5; r++) c.rect(1 + r, 29 + r, 11 - 2 * r, 1, r < 2 ? "f" : "F")
  c.rect(6, 34, 1, 2, "G")
}, bump("hybrid"))
// An oil lamp, a flame in a glass chimney on a brass foot (no_magic.px.js's, 7x10).
pal({ k: "#1a1220", F: "#8a5a24", f: "#d39a3a", G: "#ddd0b0", g: "#f4ecd2", L: "#f5cf6a", l: "#fff4b8" })
R._oil_lamp = { line: "k", frame: "Ff", glass: "Gg", light: "Ll" }
sprite("_oil_lamp", { outline: "k" }, `
  ..g..
  .glg.
  .gLg.
  .Gfg.
  ..F..
  .fff.
  fLLLF
  .FFF.`)
}
