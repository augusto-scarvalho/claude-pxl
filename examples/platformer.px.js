// Platformer tileset: 16x16 terrain tiles laid out as a level with tilemap(), plus a tile sheet
// for a game engine. Also shows dither() (water depth), fill() (an arched door), my (a gem drawn
// as one quarter) and include() (the slimes come from basics.px.js, in their own palette).
include("basics.px.js")     // its palette stays with its sprites; { palette: true } would share it

pal({
  k: "#20142c",                                    // ink
  n: "#a8e4ff", N: "#78c0f0",                      // sky
  c: "#ffffff", C: "#cfe8ff",                      // clouds
  v: "#8cc8b0", V: "#6aa898",                      // far hills
  g: "#9ce05a", G: "#58b03c", h: "#2f7a3a",        // grass
  d: "#c8844e", D: "#94573a", e: "#5e3428",        // dirt
  s: "#c4c0d4", S: "#7c7894",                      // stone, spikes
  l: "#f0c888", w: "#d8a060", W: "#a06838", x: "#6a4028",   // wood
  b: "#58c8f0", B: "#2f88d0", f: "#e8fbff",        // water, foam
  r: "#ff5a6a", R: "#b8305a", y: "#ffe070",        // gem, brass
})

// ---------------------------------------------------------------- dirt
sprite("_pebble", `
  .ss.
  sSSS
  .ee.`)
sprite("_rock", `
  ..sss.
  .ssSSS
  sSSSSS
  .eeee.`)

// Mostly plain dirt: a pebble or a rock in every tile would line up into a visible grid.
sprite("dirt_a", { w: 16, h: 16 }, rect(0, 0, 16, 16, "d"))
sprite("dirt_b", { base: "dirt_a" }, stamp("_pebble", 3, 5))
sprite("dirt_c", { base: "dirt_a" }, stamp("_rock", 8, 9))
group("dirt", ["dirt_a", "dirt_a", "dirt_a", "dirt_b", "dirt_c"])   // each tilemap cell picks one

// Exposed wall of a ground mass; the right wall is the left one flipped.
sprite("dirt_l", { base: "dirt_a" }, vline(0, 0, 16, "e"), vline(1, 0, 16, "D"))
sprite("dirt_r", { base: "dirt_l", flip: "x" })

// ---------------------------------------------------------------- grass tops
// Erase the dirt's top rows, then lay the turf over it: blades stick up into the air above,
// roots hang into the dirt below. wrap: "x" previews it 3 wide, so a seam between copies shows.
sprite("grass", { w: 16, h: 16, wrap: "x" }, stamp("dirt_a", 0, 0), rect(0, 0, 16, 2, "_"), `
  ...g.......g....
  ..gGg..g..gGg..g
  ggGGGggGggGGGggG
  GGGGGGGGGGGGGGGG
  GGGGhGGGGGGhGGGG
  hGhhhhGhhGhhhhGh
  .h..h..h...h..h.`)
sprite("grass_l", { w: 16, h: 16 }, stamp("dirt_l", 0, 0), rect(0, 0, 16, 2, "_"), `
  ................
  ...g..g...gGg..g
  __gGggGggGGGGggG
  _gGGGGGGGGGGGGGG
  gGGGGhGGGGGhGGGG
  gGhhhhGhhGhhhhGh
  hh..h..h...h..h.
  h...............`)
sprite("grass_r", { base: "grass_l", flip: "x" })

// ---------------------------------------------------------------- platforms, ladder, spikes
sprite("plat_l", { w: 16, h: 16 }, `
  .lllllllllllllll
  lwwwwwwwwwwwwwww
  wwwSwwwwwwwwSwww
  wwwwwwwwwwwwwwww
  WWWWWWWWWWWWWWWW
  .xxxxxxxxxxxxxxx`)
sprite("plat", { w: 16, h: 16 }, `
  llllllllllllllll
  wwwwwwwwwwwwwwwW
  wwwSwwwwwwwwSwwW
  wwwwwwwwwwwwwwwW
  WWWWWWWWWWWWWWWx
  xxxxxxxxxxxxxxxx`)
sprite("plat_r", { base: "plat_l", flip: "x" })

sprite("ladder", { w: 16, h: 16 },
  vline(3, 0, 16, "w"), vline(4, 0, 16, "W"), vline(11, 0, 16, "w"), vline(12, 0, 16, "W"),
  ...[1, 5, 9, 13].flatMap((y) => [hline(5, y, 6, "l"), hline(5, y + 1, 6, "x")]))

// Written as the left spike; mx makes the pair.
sprite("spikes", { w: 16, h: 16, mx: true }, grid(0, 8, `
  ...ss...
  ...sS...
  ..ssSS..
  ..sSSS..
  .ssSSSS.
  .sSSSSS.
  ssSSSSSS
  eeeeeeee`))

// ---------------------------------------------------------------- water
// The surface is light; dither() bands step it down to the deep color so the tile below joins
// without a seam.
sprite("water_top", { w: 16, h: 16 },
  rect(0, 3, 16, 13, "b"),
  dither(0, 7, 16, 3, "b", "B", 0.25), dither(0, 10, 16, 3, "b", "B", 0.75), rect(0, 13, 16, 3, "B"),
  hline(0, 3, 16, "f"), hline(2, 2, 3, "f"), hline(10, 2, 3, "f"), px(6, 5, "f"), px(13, 6, "f"))
sprite("water", { w: 16, h: 16 }, rect(0, 0, 16, 16, "B"))

// ---------------------------------------------------------------- door, gem, cloud
// No primitive draws an arch: the top half of an ellipse ring plus two posts and a sill make a
// closed outline, and fill() pours the wood in. Seams are recolored only where there is wood.
sprite("door", { w: 13, h: 21 },
  clip([0, 0, 13, 7], ellipse(6, 6, 6, 6, "x", true)),
  vline(0, 6, 15, "x"), vline(12, 6, 15, "x"), hline(0, 20, 13, "x"),
  fill(6, 10, "w"),
  recolor({ w: "W" }, (x) => x % 3 === 0),
  px(9, 12, "y"))

// Symmetric both ways: write the top-left quarter, mx + my mirror it.
sprite("gem", { mx: true, my: true, outline: "k" }, `
  ...r
  ..rf
  .rrf
  rrRr
  rRRR`)
sprite("gem_blue", { base: "gem", swap: { r: "b", R: "B" } })

sprite("_cloud", { w: 28, h: 12 },
  circ(7, 7, 4, "c"), circ(14, 5, 5, "c"), circ(21, 7, 4, "c"), rect(3, 7, 22, 5, "c"),
  recolor({ c: "C" }, [0, 10, 28, 2]))

// ---------------------------------------------------------------- the level
// One char per 16x16 tile. "." is air.
const LEVEL = `
  ................
  ................
  ...........[=]..
  ............H...
  ..[=].......H...
  ....^.....<GGGGG
  GGGGG>....(ddddd
  ddddd)~~~~(ddddd
  ddddd)wwww(ddddd
  ddddd)wwww(ddddd`

scene("level", { w: 256, h: 160 },
  layer("sky",
    grad(0, 0, 256, 160, "Nn", "v", 0.3),
    stamp("_cloud", 24, 18), stamp("_cloud", 140, 36, { flip: "x" }),
    ellipse(40, 112, 64, 26, "V"), ellipse(170, 116, 80, 30, "V"), ellipse(110, 120, 50, 22, "v")),
  layer("tiles", tilemap(LEVEL, {
    size: 16,
    map: {
      "<": "grass_l", G: "grass", ">": "grass_r", d: "dirt", "(": "dirt_l", ")": "dirt_r",
      "[": "plat_l", "=": "plat", "]": "plat_r", H: "ladder", "~": "water_top", w: "water", "^": "spikes",
    },
  })),
  layer("props",
    stamp("door", 220, 61),
    stamp("slime_red", 20, 88), stamp("slime_blue", 166, 72, { flip: "x" }),
    stamp("gem", 39, 48), stamp("gem", 119, 70), stamp("gem_blue", 199, 16)))

// For the engine: the tiles alone, one 16x16 cell each. extrude: 1 repeats each edge 1px out so
// filtering never bleeds a neighbour in; a grid-slicing importer then wants margin 1, separation 2.
sheet("tiles", ["grass_l", "grass", "grass_r", "dirt_a", "dirt_b", "dirt_c", "dirt_l", "dirt_r", "plat_l", "plat", "plat_r", "ladder", "spikes", "water_top", "water"], { cols: 8, extrude: 1 })
