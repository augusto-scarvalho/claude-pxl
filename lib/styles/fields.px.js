// The fields style: the palette examples/sdf draws its fields in (bark, leaves, stone, moss, a mushroom's
// cap and stem, a door, a lit window, a crystal, the diorama's ground), its materials by role (MATS: what
// the 3D ops take by name) and its light (LIGHT), from the upper left, a little toward us: shadows fall
// right and away. The light and the materials are set as look3d's: what the 3D ops take where a call
// doesn't say them (light: "view" for a view's own, from its upper left). For a scene of your own in its
// colors: include("<path>/lib/styles/fields.px.js", { palette: true, as: "fields" }) (examples/sdf/kit.px.js
// does).
pal({ k: "#141222", K: "#1f1a30" })
// bark: violet in the shade to a warm grey-brown
pal({ b: "#2a2236", B: "#4a3c4a", i: "#6f5c5a", I: "#9c8774" })
ramps("bBiI")
// leaves: indigo in the deepest shade to a yellow-green in the sun, the hue doing much of the shading
pal({ Z: "#1d1d38", z: "#233a4c", x: "#24573f", c: "#2f6b3e", v: "#4a8240", V: "#73983f", J: "#b4b85a" })
ramps("ZzxcvVJ")
// stone: indigo in the shade, a mauve grey, cream in the sun; moss
pal({ D: "#2a2840", t: "#4b4660", T: "#6c6476", u: "#928694", U: "#c0b39f", E: "#e6dcbd" })
ramps("DtTuUE")
pal({ m: "#2c4620", M: "#46662a", n: "#66883a", N: "#8fa64a" })
ramps("mMnN")
// the mushroom's cap, its spots and stem, a door, a window lit from inside
pal({ r: "#4a1830", R: "#7a2438", o: "#b23a3a", O: "#e0603e", a: "#5a4a5a", w: "#9a8a8a", W: "#cdbfae", y: "#f0e6d0", d: "#3a2a24", e: "#5c4030", X: "#8a6a4a", f: "#ffd27a", F: "#ffb04a" })
ramps("rRoO", "awWy", "deX", "Ff")
// a crystal: violet to ice blue
pal({ g: "#22205a", G: "#3a3a9a", h: "#4e6ad0", H: "#7aa8f0", j: "#b8e4ff", l: "#f4fcff" })
ramps("gGhHjl")
// the diorama's ground
pal({ q: "#2c3a28", Q: "#3d5232", s: "#56703e", S: "#7a8c4e", p: "#6a5a48", P: "#8a7860" })
ramps("qQsS", "pP")

const fields = {}
// in a block: its names stay its own when a scene includes the file
{
const MATS = { bark: "bBiI", leaf: "ZzxcvVJ", stone: "DtTuUE", moss: "mMnN", cap: "rRoO", spot: "Wyy", stem: "awWy", door: "deX", glow: "Ff", gem: { ramp: "gGhHjl", shine: 0.7 }, snow: "Wyy" }
const LIGHT = [-0.65, -0.35, 0.68]
look3d({ light: LIGHT, mats: MATS })
Object.assign(fields, { MATS, LIGHT })
}
