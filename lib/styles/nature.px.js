// The nature style: the nature kit's palette (lib/nature/kit.px.js draws in it), for a scene of your own
// in its colors: include("<path>/lib/styles/nature.px.js", { palette: true }). Its ramps, dark to light,
// by role: grass Qqwer, leaf (pine needles) ZzxcvVJ, bush ghjlG, stone DtTuUE, moss mMnN, wood (weathered)
// bBiI, trunk (and planks) asdf; flowers poO.
// grass: a yellow-green base, its darks turning blue, its light yellow (SLYNYRD's lush grass)
pal({ Q: "#23484a", q: "#3d6b42", w: "#577f3c", e: "#6c9243", r: "#a4b45a" })
ramps("Qqwer")
shades("asdf", "#8a5a36")   // trunks, planks
// pine needles: indigo in the deepest shade to a yellow-green in the sun, the hue doing much of the shading
pal({ Z: "#1d1d38", z: "#233a4c", x: "#24573f", c: "#2f6b3e", v: "#4a8240", V: "#73983f", J: "#b4b85a" })
ramps("ZzxcvVJ")
pal({ g: "#1f4a46", h: "#2f6a3e", j: "#4f8a3a", l: "#7fa046", G: "#b0bb5c" })   // bushes: teal to yellow-green
ramps("ghjlG")
pal({ D: "#2a2840", t: "#4b4660", T: "#6c6476", u: "#928694", U: "#c0b39f", E: "#e6dcbd" })   // stone: indigo in the shade,
ramps("DtTuUE")                                                                               // a mauve grey, cream in the sun
shades("mMnN", "#6f8a3a")   // moss
pal({ b: "#2a2236", B: "#4a3c4a", i: "#6f5c5a", I: "#9c8774" })   // weathered wood, grey, violet in the shade
ramps("bBiI")
pal({ p: "#e7a3c2", o: "#f1ece0", O: "#e8cf6c" })   // flowers
