// Basics: palette, mirrored + outlined sprites, variants, parts, primitives, sheets.
use("sweetie16")
pal({ k: 0, p: 1, r: 2, o: 3, y: 4, G: 5, g: 6, t: 7, n: 8, b: 9, B: 10, c: 11, w: 12, l: 13, s: 14, d: 15 })
ramps("ktgG", "kproy", "knbBc", "kdslw")

// Draw the left half; mx mirrors it. The shine goes on after the mirror, on one side only: a
// mirrored highlight shows up twice and reads as a second pair of eyes. Then outline wraps it.
sprite("_slime_body", { mx: true }, `
  ....ggg
  ..ggggg
  .gggggg
  .gggggg
  gggkwgg
  gggkkgg
  tgggggg
  .tttttt`)
sprite("slime", { base: "_slime_body", outline: "k" }, grid(3, 1, "GG\nGwG"))

sprite("slime_red", { base: "slime", swap: { g: "r", G: "o", t: "p" } })
sprite("slime_blue", { base: "slime", swap: { g: "b", G: "B", t: "n" } })
sprite("slime_wink", { base: "slime" }, grid(10, 5, `
  gg
  kk`))

// Odd width: the center column is shared.
sprite("heart", { mx: "c", outline: "k" }, `
  .rr.
  rwrr
  rrrr
  rrrr
  .rrr
  ..rr
  ...r`)

sprite("coin", { w: 10, h: 10 },
  circ(4, 4, 4, "o"), circ(4, 4, 3, "y"), vline(4, 2, 5, "o"), px(3, 2, "w"))

sprite("_lock", `
  yy
  yo`)
sprite("chest", { w: 16, h: 12, outline: "k" },
  rect(0, 3, 16, 9, "o"), rect(0, 0, 16, 4, "r"), hline(0, 4, 16, "p"),
  vline(3, 0, 12, "y"), vline(12, 0, 12, "y"), stamp("_lock", 7, 4),
  shade([0, 9, 16, 3]))

// A dome: clip() cuts the ellipse to its top half.
sprite("dome", { w: 21, h: 11, outline: "k" },
  clip([0, 0, 21, 11], ellipse(10, 10, 10, 10, "b")),
  light([6, 4, 4], 1, 0.5), light([5, 3, 2]))

// Custom drawing code: loops get the canvas.
sprite("stripes", { w: 8, h: 8 }, (c) => {
  for (let i = 0; i < 8; i += 2) c.hline(0, i, 8, i % 4 ? "B" : "b")
})

sheet("chars", ["slime*", "heart", "coin", "chest"], { cols: 4, pad: 1 })
