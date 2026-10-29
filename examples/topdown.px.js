// Top-down tileset: an island in an RPG-style overhead view. The shore is a corner-based ("wang")
// set: the map marks land or water at every tile corner, one function draws all 16 corner
// combinations, and tilemap() picks the right one per cell. Trees, rocks, a pier, tufts and flowers
// (in groups, on the land's tiles) sit on top, each with its shadow from a shade layer: a band right under it. The palette, the shore and its variants, the tufts,
// flowers, bush, rock and pier are the library's (lib/styles/island.px.js, lib/nature/island.px.js,
// lib/architecture/pier.px.js); the tree is this island's own.
include("../lib/styles/island.px.js", { palette: true })   // the island's palette and ramps (the shadow layer steps colors left)
include("../lib/nature/island.px.js")                       // shore_0..15 (wang corners), the groups land and sea, _tuft, flowers, bush, rock
include("../lib/architecture/pier.px.js")                   // the pier
const T = 16

// ---------------------------------------------------------------- props
// A canopy of three overlapping crowns, lit from the top-left; the trunk peeks out below.
sprite("tree", { w: 22, h: 26, outline: "h" },
  rect(9, 18, 4, 7, "o"), vline(12, 18, 7, "O"),
  circ(11, 10, 9, "G"), circ(6, 12, 5, "G"), circ(16, 12, 5, "G"),
  circ(9, 8, 6, "g"), circ(5, 11, 3, "g"), px(13, 5, "g"),
  circ(8, 6, 3, "l"), px(4, 10, "l"), px(5, 9, "l"))

// ---------------------------------------------------------------- the island
// One char per tile CORNER ("w" water, "g" land): 17x11 corners for 16x10 tiles.
const CORNERS = `
  wwwwwwwwwwwwwwwww
  wwwwwwwwwwwwwwwww
  wwwwgggggggwwwwww
  wwwggggggggggwwww
  wwggggggggggggwww
  wwgggggggggggwwww
  wwwgggggggggggwww
  wwwwgggggggggwwww
  wwwwwwgggggwwwwww
  wwwwwwwwwwwwwwwww
  wwwwwwwwwwwwwwwww`
// tilemap({ corners: "w" }) reads each tile's 4 corners as its mask; full land and full sea get the
// variant groups, the rest are the shore pieces.
const tileMap = { 0: "land", 15: "sea" }
for (let m = 1; m < 15; m++) tileMap[m] = "shore_" + m

const trees = [[56, 42], [78, 34], [150, 40], [44, 74], [170, 70]]

// What the island's layout holds to (pxl check runs them; pxl check --fix puts a stray one back): the
// trees' crowns clear of each other, the bushes and rocks on the land (a corner of CORNERS nearest each
// of their pixels a "g"), the east rock at the foot of the east tree.
const ROWS = CORNERS.trim().split("\n").map((r) => r.trim()), onLand = (x, y) => ROWS[Math.round(y / T)]?.[Math.round(x / T)] === "g"
const LAYOUT = [
  { apart: ["tree1", "tree2"] }, { apart: ["tree1", "tree4"] }, { apart: ["tree3", "tree5"] },
  { beside: ["rock_e", "tree5", { gap: [4, 8], side: "right" }] },
  ...["bush_s", "bush_n", "rock_e", "rock_w"].map((n) => ({ inside: [n, onLand] })),
]

scene("island", { w: 256, h: 160, world: { light: [-0.5, -1] }, expect: LAYOUT },
  layer("ground", tilemap(CORNERS, { corners: "w", size: T, map: tileMap })),
  // below: the layer starts empty, so "on grass" has to look at the layers under it.
  layer("tufts", scatter("_tuft", 64, 56, 120, 48, 14, { on: "g", below: true, even: true, seed: 3 })),
  layer("shadows", { shade: true },
    ...trees.map(([x, y]) => ellipse(x + 11, y + 25, 8, 2, "k")),
    ellipse(109, 103, 6, 1, "k"), ellipse(125, 63, 6, 1, "k"), ellipse(97, 80, 6, 1, "k"), ellipse(203, 102, 6, 1, "k"),
    rect(156, 114, 12, 44, "k")),   // the pier's deck, 2 px over the water, its shadow to the right
  layer("props",
    stamp("pier", 152, 112),
    stamp("bush", 109, 104, { id: "bush_s" }), stamp("bush", 125, 64, { flip: "x", id: "bush_n" }),
    stamp("rock", 203, 102, { id: "rock_e" }), stamp("rock", 97, 80, { flip: "x", id: "rock_w" }),
    ...trees.map(([x, y], i) => stamp("tree", x, y, { id: `tree${i + 1}` }))))

// For the engine: the 16 shore tiles in mask order, then the variants.
sheet("tiles", ["shore_*", "grass_tuft", "grass_flower", "sea_glint"], { cols: 8 })
