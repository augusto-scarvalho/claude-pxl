// The trackside's nature for racing_topdown (lib/profiles/racing_topdown.px.js): make3d.oak, make3d.spruce, make3d.bush
// and make3d.rock drawn by their 3D builders as the track's things are (lib/architecture/track.px.js: from the genre's
// 58 degrees, its cars' camera, lit from the upper left as they are, in 3 tones), at the boxes the genre gives them
// (pxl lib draft's fit: the oak 2.5 tiles at 6.5 px a meter, the spruce 3.5 x 2 at 18.88, the bush 1 at 13.41, the
// rock 2 at 18.36). The oak with its crown lifted (make3d.oak_lifted: its trunk clear to half its height, its limbs
// rising steeper, its crown a little smaller): the open-grown oak's broad low crown hid its trunk from 58, a bush. Their
// colors the kit's, the hand pass: the leaves the island's greens, darker than its field, the needles its teal, the
// trunks its browns, the stone its greys (the builders' own olive and slate sat apart from the cones and the barriers).
// Each ramp's first two tones its line (racing_topdown's ink: a line all round, each part in its own, darker than its
// fill: the leaves a dark green, the trunk a dark brown; a step lighter facing the light; none a near-black, the cars'
// alone), its fill the other three. oak, spruce, bush, rock. For any scene:
// include("<path>/lib/nature/trackside.px.js", { as: "trackside" }); it includes lib/nature/trees.px.js and
// kit.px.js (for make3d.oak and make3d.spruce): a scene takes those through it, not again itself.
include("../profiles/racing_topdown.px.js")
include("trees.px.js", { as: "trees" })
include("kit.px.js", { as: "nature" })
// in a block: its names stay its own when a scene includes the file
{
// each [its line away from the light, its line toward it, its fill dark to light]: the line at least a step (pxl
// study's 0.08 of lightness) under the fill, the trunk's darkest lifted a step for it
const LEAVES = ["#123a2a", "#1b4d34", "#287a44", "#3f9a3c", "#97e04a"], BARK = ["#4a2a22", "#57322a", "#7a4630", "#a06a40", "#c98a55"]
const NEEDLES = ["#103a36", "#16493f", "#1f6e5a", "#288556", "#8ed49c"], STONE = ["#36344a", "#3f3d55", "#75798f", "#aeb0bc", "#eeebe0"]
const DRAW = { light: [-0.6, 0.5, 0.65], surface: { soft: 0.6, rim: 0.85, outline: false, ink: 2 }, view: { kind: "side", pitch: genre("racing_topdown").stand }, headings: ["s"], genre: "racing_topdown" }
const spruceMats = card("make3d.spruce").draw.mats
// the oak with its crown lifted, so its trunk shows under it from 58 (the species' fork at 0.26 of its height, its
// limbs out at 0.75 radians, its crown 0.9 across)
const OAK = trees.species.oak, LIFTED = { ...OAK, fork: 0.5, rise: [1.2, 0.8, 0.5], spread: 0.6, mass: { ...OAK.mass, r: 0.75 } }
make3d.define("oak_lifted", (o) => trees.grow(LIFTED, o), trees.params(LIFTED))
for (const [name, thing, ppm, mats, category] of [
  ["oak", make3d.oak_lifted({ seed: 3 }), 6.5, { ...trees.mats, bark: BARK, oak_summer: LEAVES }, "tree"],
  ["spruce", make3d.spruce(), 18.88, { needles: { ...spruceMats.needles, ramp: NEEDLES }, bark: BARK }, "tree"],
  ["bush", make3d.bush(), 13.41, { leaf: LEAVES, bark: BARK }, "tree"],
  ["rock", make3d.rock(), 18.36, { stone: STONE, moss: LEAVES }, "prop"],
]) {
  turnaround(`_${name}`, thing, { ...DRAW, ppm, mats, category })
  sprite(name, { base: `_${name}_s` })
}
const IS = "at racing_topdown, drawn by its 3D builder from 58 degrees in the track kit's colors, a line all round in each part's own dark tone, unretouched (topdown16's cell of it is the island's, by hand)"
card("make3d.oak_lifted", { is: "an open-grown oak with its crown lifted (lib/nature/trees.px.js's oak, its trunk clear to half its height, its limbs rising steeper, its crown 0.75 across): its trunk shows from racing_topdown's 58 degrees", cells: { "topdown/16": ["◐", "oak"] }, category: "tree" })
card("oak", { is: `make3d.oak_lifted ${IS}: 2.5 tiles`, cells: { "topdown/16": "◐" } })
card("spruce", { is: `make3d.spruce ${IS}: 3.5 x 2 tiles`, cells: { "topdown/16": "◐" } })
card("bush", { is: `make3d.bush ${IS}: a tile`, cells: { "topdown/16": "◐" } })
card("rock", { is: `make3d.rock ${IS}: 2 tiles`, cells: { "topdown/16": "◐" } })
}
