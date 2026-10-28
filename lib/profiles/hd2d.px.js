// The HD-2D profile's starter kit: what the hd2d scenes share (the plaza, the graveyard, the clearing;
// the harbor takes its sprites), taken with include("<path>/lib/profiles/hd2d.px.js", { palette: true }):
// the nature kit (grass, pines, bushes, rocks, walls, paths, its builders as nature.*:
// lib/nature/kit.px.js), the surfaces (cobbles, an ashlar wall, planks, and blocks in meters by
// surfaces.block: lib/architecture/surfaces.px.js) and the lamps (lib/props/lamps.px.js: its own post is
// _lamp), and their keys in the palette for a scene's own use. The camera high up through a long lens is the DSL's:
// perspective({ w, h, pitch, fov, ppm }).
include("../nature/kit.px.js", { palette: true })
pal({ k: "#1a1620" })
shades("1234", "#8d8070")   // cobbles: the gaps, the stones, their lit edges
shades("5678", "#857467")   // the wall's stone and its mortar
pal({ y: "#fff3c4", Y: "#ffd27a" })   // a lamp's glass: brighter than anything lit, for the bloom
include("../architecture/surfaces.px.js")
include("../props/lamps.px.js")
// the profile as data: pxl lib --genre hd2d lists what the library has at its cell (hd2d/24ppm). Its numbers
// come from the approved kit and pxl's guides (characters §12, §13; scenes §19): Octopath Traveler and
// Triangle Strategy measured for numbers only, never their pixels
genre("hd2d", {
  camera: { kind: "hd2d", pitch: -38, fov: 30 },   // high up through a long lens: the clearing's and the graveyard's
  ppm: 24,                 // px a meter, no tile grid: the world is built in meters
  pitch: 20,               // what stands drawn as a billboard from 20 degrees: rig3d's figures, the kit's spruce (pxl lib draft's)
  // [tall, wide] in m at 24 px a meter, from the kit: the traveler 34 px (Octopath's 33-34, characters §13); the
  // pine 68 px and the spruce 84, 42 px wide; a broad tree (an oak, a maple, a cherry) 3 m tall, up to 4.5 across
  // (F5's drafts beside the traveler); the bush and the rock as drawn; a lamp post over a head, about 44 px (the
  // kit's _lamp, 30 px, stands under the traveler: it stays for the plaza's 24 px hero)
  scale: { character: [1.4, 0.6], tree: [3, 4.5], pine: [3.5, 2], bush: [0.5, 0.8], rock: [0.5, 0.75], lamp: [1.8, 0.3] },
  heads: 3,
  dirs: ["s", "sw", "w", "nw", "n", "ne", "e", "se"],   // 8, the east the west's mirror where the light allows
  // the traveler's (pxl lib traveler.tr)
  states: { walk: { frames: 8, ms: 110 }, idle: { frames: 4, ms: 250 }, kneel: { frames: 7, ms: 160 }, cast: { frames: 13, ms: 100 } },
  // a sheet a row a tag; normal maps beside the sprites (Triangle Strategy's way, characters §13)
  contract: { rows: "tag", normals: true },
  tones: [4, 6],           // a ramp (characters §13)
  colors: [22, 30],        // a figure (characters §13)
  ink: { character: "#1a1620", rest: "selective" },   // figures: a near-black line on 79-84% of the edge (characters §13); the kit's trees and rocks rimmed or lined in a shade of what they touch
  mix: true,               // sprites in a finer 3D world, on purpose: a scene's sizes and pixel, the harbor at 17 px a meter
})
