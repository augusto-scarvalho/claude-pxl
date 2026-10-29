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
// the engine's own builders (make3d.rock, house, bush, pine) as library entries, drawn in this style: their
// cards, so pxl lib lists them and pxl lib draft draws them at a cell. Their box in tiles, [tall, wide], is the
// scale curve's for their category (scenes §19, lib/profiles/topdown16.px.js): a boulder 2 x 2 and a bush 1 x 1
// (measured on Ninja Adventure's 16 px boulders, 30-31 px, and bushes, 12-15 px), a house 4.5 x 5 (a door a
// little over the tallest figure, scenes §1; no house measured yet), a pine 3.5 x 2 (the library lab's).
const DRAW = { mats: MATS, light: LIGHT }
// At topdown16 (✎): the boulder as pxl lib draft make3d.rock --genre topdown16 drew it (library F5's kit): the genre's
// boulder box, 2 x 2 tiles, seen from what stands' 30 degrees, in its 3 tones and its line (_rock_td16_live); frozen
// (frozen/rock_td16.png: pxl check renders the live one and says if it drifted); then by hand: a pixel of another
// plane's tone left inside a plane goes back to its plane's (the moss's light, the lit face, the stone, the shadow); its
// line in its own darkest (selout), its shade face a step up; in the island's high key (library F5's environment study):
// its lit top near white, its moss the kit's greens. Grounded, as the school sits a rock in the grass: its foot flat
// where it rests (as wide as its widest low row, its ends rounded a pixel or two), its last two rows the stone's
// darkest (the contact), tufts of the island's grass over its foot.
turnaround("_rock_td16_live", make3d.rock(), { ...DRAW, surface: { ink: "#1a1620", tones: 3 }, view: { kind: "side", pitch: 30 }, ppm: 18.36, headings: ["s"] })
sprite("_rock_td16_draft", { png: "frozen/rock_td16.png", frozen: "_rock_td16_live_s" })
sprite("_rock_td16", { base: "_rock_td16_draft" }, grid(17, 9, "NN"), grid(12, 20, "E"), grid(6, 22, "EE"), grid(10, 25, "u"), grid(19, 28, "D.DDD"), (c) => {
  // no black line (topdown16: the figures only): the line in the darkest of what it edges (selout), the moss's by the
  // moss, the stone's (t) elsewhere; its shade face a step up from the near-black (D to T), so the stone keeps 3 tones;
  // the moss in the island's green (lib/styles/island: the kit's grass, bushes and leaves)
  const ink = c.color("#1a1620"), at = []
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) if (c.get(x, y) === ink) {
    const n = [[0, -1], [-1, 0], [1, 0], [0, 1]].map(([u, v]) => c.key(x + u, y + v))
    at.push([x, y, n.some((k) => "mMnN".includes(k) && k !== "?" && k !== ".") ? "m" : "t"])
  }
  for (const [x, y, k] of at) c.px(x, y, k)
  c.recolor({ D: "#75798f", T: "#75798f", t: "#3f3d55", u: "#aeb0bc", U: "#d6d4d2", E: "#f4f1e6", N: "#b9f06c", n: "#7cd640", M: "#48a838", m: "#1b4d34" })
}, (c) => {
  const has = (x, y) => c.key(x, y) !== ".", xs = (y) => Array.from({ length: c.w }, (_, x) => x).filter((x) => has(x, y))
  let y0 = 0
  for (let y = 0; y < c.h; y++) if (xs(y).length >= xs(y0).length) y0 = y
  const L = Math.min(...xs(y0)), R = Math.max(...xs(y0)), yb = y0 + 4
  // the foot: each row under the widest as wide as it, its ends rounded; nothing under the base
  for (let y = y0 + 1; y <= yb; y++) { const d = [0, 0, 1, 2][y - y0 - 1] ?? 3; for (let x = L + d; x <= R - d; x++) if (!has(x, y)) c.px(x, y, x < (L + R) / 2 ? "#75798f" : "#3f3d55") }
  for (let y = yb + 1; y < c.h; y++) for (let x = 0; x < c.w; x++) c.px(x, y, "_")
  // the contact: its last two rows the stone's darkest
  for (const y of [yb - 1, yb]) for (const x of xs(y)) c.px(x, y, "#3f3d55")
  // tufts of grass over its foot: lit tips, the field, its shade
  for (const x of [L + 1, L + 9, R - 12, R - 4]) [[1, 0, "#b9f06c"], [3, 0, "#b9f06c"], [0, 1, "#b9f06c"], [1, 1, "#7cd640"], [2, 1, "#b9f06c"], [3, 1, "#7cd640"], [4, 1, "#7cd640"],
    [0, 2, "#50ad39"], [1, 2, "#7cd640"], [2, 2, "#50ad39"], [3, 2, "#7cd640"], [4, 2, "#288556"]].forEach(([u, v, k]) => c.px(x + u, yb - 2 + v, k))
})
card("make3d.rock", { is: "a boulder of planes, each one tone, its edges softened; moss where it faces up", cells: { "topdown/16": ["✎", "_rock_td16"] }, tiles: [2, 2], category: "boulder", draw: DRAW })
card("make3d.house", { is: "a mushroom house: a stem with a sunk door and a window lit from inside, a red cap with cream spots, a chimney", cells: { "topdown/16": "◐" }, tiles: [4.5, 5], category: "house", draw: DRAW })
card("make3d.bush", { is: "a bush: a few lumps of leaves melted together, swaying a little", cells: { "side/16": "◐" }, tiles: [1, 1], category: "bush", draw: DRAW })
card("make3d.pine", { is: "a conifer: a trunk under cones of needles stacked up it, each narrower, their rims ragged", cells: { "side/16": "◐" }, tiles: [3.5, 2], category: "pine", draw: DRAW })
}
