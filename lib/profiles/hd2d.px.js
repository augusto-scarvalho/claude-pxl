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
// the profile as data: the camera high up through a long lens (the clearing's and the graveyard's), 24 px to
// the meter: pxl lib --genre hd2d lists what the library has at its cell
genre("hd2d", { camera: { kind: "hd2d", pitch: -38, fov: 30 }, grid: 24 })
