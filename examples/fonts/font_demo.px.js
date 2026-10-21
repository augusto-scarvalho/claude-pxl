// The 5x7 font of font5x7.px.js in use, apart from it so that including the font brings no scene
// into your build: a title at scale 2, a line in "5x7", a score in "5x7 mono", the built-in 3x5.
include("font5x7.px.js")

scene("font_demo", { w: 150, h: 54, bg: "#2a2550" },
  text(75, 4, "PIXEL FONT", "#ffe070", { font: "5x7", align: "c", scale: 2, shadow: "#1b1630" }),
  text(4, 24, "5x7: Quick fox, 012,345!", "#fff6e0", { font: "5x7" }),
  text(4, 34, "Mono: 011,111 / 088,888", "#9fe0ff", { font: "5x7 mono" }),
  text(4, 44, "3X5 BUILT-IN: SCORE 012,345!", "#b4b8cf"))
