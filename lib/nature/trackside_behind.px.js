// The trackside's nature for racing_behind (lib/profiles/racing_behind.px.js: Mario Kart's kind) and its backdrop. For
// any scene: include("<path>/lib/nature/trackside_behind.px.js", { as: "trackside" }); it includes the track's kit
// (lib/architecture/track_behind.px.js, as "circuit") and the top-down trackside (trackside.px.js, for make3d.spruce,
// make3d.palm and their colors): a scene takes those through it, not again itself.
// - oak, spruce, palm, bush, rock: drawn by their 3D builders as the track's things (circuit.rungs: a rung k for
//   11 m from the eye x 2^k, seen from the angle down to it there, half the size a rung, under 16 px tall without its
//   line), the trees by size as Super Circuit draws them (64, 32, 16 and 8 px tall; the palm and the spruce 72), the bush
//   and the rock true to the floor; their colors the top-down trackside's (the island's greens, browns and greys), the
//   palm's trees.px.js's; a line all round in each part's own dark (racing_behind's ink for trees and props).
// - The backdrop: a strip 256 px across that wraps (the GBA's background width), 74 rows over the floor (rows 0-73 of
//   the screen, Super Circuit's), in four layers for the demo to slide at their own speeds (the farther the slower):
//   sky (bands of blue paling to the horizon), clouds (white puffs, lit from above, on clear), hills (far blue-green
//   ridges, lit from the left), treeline (the near line of round crowns along the horizon, on clear).
include("../architecture/track_behind.px.js", { as: "circuit" })
include("trackside.px.js", { as: "td" })
pal({
  a: "#5d9be0", b: "#78b0ea", c: "#94c4f2", e: "#b2d8f8", f: "#cfe8fb",   // the sky, high to the horizon
  w: "#ffffff", x: "#e2eef8", X: "#b8c8de",                               // clouds: lit, body, shade
  h: "#4f7f8a", H: "#6c9c9c", j: "#8cb8b0", J: "#3e6874",                 // hills: shade, body, lit, the far ridge
  t: "#1f5e3a", T: "#2e7a46", u: "#46984e", U: "#17472e",                 // the treeline: shade, body, lit, its foot
})
{
// ---------------------------------------------------------------- the trees, the bush and the rock
// each [its line away from the light, its line toward it, its fill dark to light] (the top-down trackside's)
const LEAVES = ["#123a2a", "#1b4d34", "#287a44", "#3f9a3c", "#97e04a"], BARK = ["#4a2a22", "#57322a", "#7a4630", "#a06a40", "#c98a55"]
const NEEDLES = ["#103a36", "#16493f", "#1f6e5a", "#288556", "#8ed49c"], STONE = ["#36344a", "#3f3d55", "#75798f", "#aeb0bc", "#eeebe0"]
const spruceMats = card("make3d.spruce").draw.mats
// the palm's (trees.mats') with its line lifted off near-black: the fronds' and the bark's darkest a step up, the rings
// a line of their own
const PALM = { palm_fronds: ["#244a26", "#2e5a2c", "#3a7230", "#5e9638", "#94bc4c"], palm_bark: ["#4a3a2e", "#5c4a3a", "#7e6a52", "#a08c6c"], palm_ring: ["#3a2c22", "#40342a", "#4e4034"], coconut: ["#44361f", "#4e3e1e", "#6e5a2a", "#8e7a3a"] }
// the oak 7.8 m to its crown's top (make3d.oak_full, below), the spruce 2.83 m
// (its builder's 68 px at 24), the palm 8 m with its fronds (lined from 32 px: under, its fronds and its trunk a pixel
// thin, the line would be all of them), the bush and the rock under a meter
// The full oak (library F5's stage 7c): from this low camera the lifted oak's crown reads thin over its long trunk, so
// this one forks lower (at 0.34 of its height, the lifted 0.5), its limbs out wider and its crown fuller and rounder
// (10 clusters 1.05 across, the lifted 4 at 0.75), as topdown32's oak is
const OAK = trees.species.oak, FULL = { ...OAK, fork: 0.34, rise: [1.0, 0.6, 0.4], spread: 0.75, mass: { ...OAK.mass, r: 1.05, flat: 1.1, clusters: 10, cr: 0.6, lift: 0.1 } }
make3d.define("oak_full", (o) => trees.grow(FULL, o), trees.params(FULL))
const NAT = [
  ["oak", make3d.oak_full({ seed: 3 }), { ppm: 64 / 7.8, tall: 7.8, category: "tree", mats: { ...trees.mats, bark: BARK, oak_summer: LEAVES } }],
  ["spruce", make3d.spruce(), { ppm: 72 / 2.83, tall: 2.83, category: "tree", mats: { needles: { ...spruceMats.needles, ramp: NEEDLES }, bark: BARK } }],
  ["palm", make3d.palm({ height: 7, seed: 2 }), { ppm: 72 / 8, tall: 8, line: 32, category: "tree", mats: { ...trees.mats, ...PALM } }],
  ["bush", make3d.bush(), { ppm: 24, to: 2, tall: 0.75, category: "tree", mats: { leaf: LEAVES, bark: BARK } }],
  ["rock", make3d.rock(), { ppm: 24, to: 2, tall: 0.6, category: "prop", mats: { stone: STONE, moss: LEAVES } }],
]
const RUNGS = {}
for (const [name, thing, o] of NAT) {
  const made = circuit.rungs(o).map(([k, v]) => { turnaround(`_${name}_${k}`, thing, v); sprite(`${name}_${k}`, { base: `_${name}_${k}_s` }); return `${name}_${k}` })
  group(name, made)
  RUNGS[name] = made.map((n) => own(n))
}
card("make3d.oak_full", { is: "an open-grown oak forking low, its limbs out wide, its crown full and round (10 clusters): racing_behind's oak from its low camera (the lifted oak's crown read thin there)", cells: { "behind/24ppm": ["◐", "oak_0"] }, category: "tree" })
for (const [name] of NAT) card(`${name}_0`, { is: `make3d.${name === "oak" ? "oak_full" : name} at racing_behind in the trackside's colors, a rung k for 11 m from the eye x 2^k, half the size a rung: ${RUNGS[name].join(", ")}`, cells: { "behind/24ppm": "◐" }, category: name === "rock" ? "prop" : "tree" })
Object.assign(circuit.RUNGS, RUNGS)

// ---------------------------------------------------------------- the backdrop
// Periodic over 256 px, so each layer wraps: a ridge's height a sum of sines whole times round the strip
const W = 256, H = 74, wave = (x, parts) => parts.reduce((s, [n, a, ph]) => s + a * Math.sin((2 * Math.PI * n * x) / W + ph), 0)
sprite("sky", { w: W, h: H }, (c) => {
  const bands = [["a", 0], ["b", 18], ["c", 34], ["e", 48], ["f", 62]]
  for (const [k, y] of bands) c.rect(0, y, W, H - y, k)
  // each band's edge stepped into the next by a dither row (a row of every other pixel), as the games' skies
  for (const [k, y] of bands.slice(1)) for (let x = 0; x < W; x += 2) c.px(x + ((y >> 1) & 1), y, bands[bands.findIndex((b) => b[1] === y) - 1][0])
})
// clouds: puffs of overlapping discs, their tops lit, their bellies flat and shaded
sprite("clouds", { w: W, h: 40 }, (c) => {
  const CL = [[20, 14, 26], [92, 24, 18], [150, 10, 30], [214, 22, 22]]
  for (const [cx, cy, r] of CL) for (let i = -2; i <= 2; i++) {
    const x = cx + i * r * 0.45, rr = r * (0.55 - Math.abs(i) * 0.08)
    for (let dy = -rr; dy <= rr * 0.35; dy++) for (let dx = -rr; dx <= rr; dx++) {
      if (dx * dx + dy * dy > rr * rr) continue
      const px = (((Math.round(x + dx) % W) + W) % W), py = Math.round(cy + dy)
      c.px(px, py, dy > rr * 0.15 ? "X" : dy < -rr * 0.45 && dx < rr * 0.3 ? "w" : "x")
    }
  }
})
// the hills: a far ridge (the darker blue) and a nearer one, lit from the left (the slope rising rightward lit)
sprite("hills", { w: W, h: 40 }, (c) => {
  const far = (x) => 14 + wave(x, [[2, 6, 0.4], [5, 3, 1.3], [9, 1.5, 2.1]]), near = (x) => 22 + wave(x, [[3, 5, 2.2], [7, 2.5, 0.2], [13, 1, 1]])
  for (let x = 0; x < W; x++) {
    const f = Math.round(far(x)), n = Math.round(near(x)), slope = near(x + 1) - near(x - 1)
    for (let y = f; y < 40; y++) c.px(x, y, "J")
    for (let y = n; y < 40; y++) c.px(x, y, y < n + 2 ? (slope < -0.3 ? "j" : slope > 0.3 ? "h" : "H") : y > 32 ? "h" : "H")
  }
})
// the treeline: round crowns of three sizes along the horizon, each lit on its upper left, their feet a dark band
sprite("treeline", { w: W, h: 20 }, (c) => {
  c.rect(0, 15, W, 5, "U")
  for (let i = 0; i < 40; i++) {
    const cx = Math.round(i * 6.4 + 3 * hash(i, 1, 3)), r = 3 + Math.floor(3 * hash(i, 2, 3)), cy = 16 - r
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > r * r + r || cy + dy > 18) continue
      c.px(((cx + dx) % W + W) % W, cy + dy, dx + dy < -r * 0.6 ? "u" : dx + dy > r * 0.5 ? "t" : "T")
    }
  }
})
for (const [name, is] of [["sky", "the backdrop's sky, 256 x 74: blue bands paling to the horizon, their edges dithered a row"], ["clouds", "the backdrop's clouds, 256 x 40 on clear: four puffs, lit on top, shaded bellies"],
  ["hills", "the backdrop's hills, 256 x 40 on clear: a far blue ridge and a nearer blue-green one lit from the left"], ["treeline", "the backdrop's near treeline, 256 x 20 on clear: round crowns of three sizes lit on their upper left, a dark foot"]])
  card(name, { is: `${is}; wraps round (periodic over its width), a layer for racing_behind's horizon (Super Circuit's strip 256 across, 74 rows over the floor), slid by the demo at its own speed`, cells: { "behind/24ppm": "✎" } })
}
