// Top-down tileset: an island in an RPG-style overhead view. The shore is a corner-based ("wang")
// set: the map marks land or water at every tile corner, one function draws all 16 corner
// combinations, and tilemap() picks the right one per cell. Trees, rocks, a pier and flowers sit
// on top, with cast shadows from a shade layer.
pal({
  k: "#1e1a2e",                                            // ink
  l: "#b4e46a", g: "#7ec850", G: "#4f9a3c", h: "#2f6a34",  // grass, leaves
  a: "#f0d89a", A: "#c8b078",                              // sand, wet sand
  f: "#f4fbff", b: "#5cc8e0", B: "#2f7cc0", N: "#24609c",  // foam, shallow, deep water
  o: "#8a5a3a", O: "#5a3a2a",                              // trunk
  s: "#b8b8c8", S: "#7c7c94", K: "#4c4c64",                // rock
  w: "#d8a868", W: "#a07040", x: "#6a4628",                // pier wood
  r: "#ff6a7a", y: "#ffe066", p: "#fff4f8",                // flowers
})
ramps("hGgl", "Aa", "NBbf", "KSs", "xWw", "Oo")             // the shadow layer steps colors left

// ---------------------------------------------------------------- shore (wang corners)
// Corner bits: 1 top-left, 2 top-right, 4 bottom-left, 8 bottom-right; a set bit is water.
// Inside a tile the corners blend bilinearly; the bands of that value become grass, sand, foam,
// shallow and deep water. The wobble repeats every 8 px, so it matches across every tile seam.
const T = 16
const band = (t) => t < 0.34 ? "g" : t < 0.38 ? "G" : t < 0.45 ? "a" : t < 0.49 ? "A" : t < 0.56 ? "f" : t < 0.72 ? "b" : "B"
for (let m = 0; m < 16; m++) sprite("shore_" + m, { w: T, h: T }, (c) => {
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    const u = (x + 0.5) / T, v = (y + 0.5) / T
    const t = (m & 1) * (1 - u) * (1 - v) + (m >> 1 & 1) * u * (1 - v) + (m >> 2 & 1) * (1 - u) * v + (m >> 3 & 1) * u * v
      + 0.035 * Math.sin((x + 0.5) * Math.PI / 4) + 0.035 * Math.sin((y + 0.5) * Math.PI / 4)
    c.px(x, y, band(t))
  }
})

// Full land and full sea get variants, so big areas don't repeat.
sprite("_tuft", `
  G.G
  .G.`)
sprite("grass_tuft", { base: "shore_0" }, stamp("_tuft", 3, 4), stamp("_tuft", 10, 10))
sprite("grass_flower", { base: "shore_0" }, px(5, 6, "y"), px(11, 11, "p"))
group("land", ["shore_0", "shore_0", "shore_0", "grass_tuft", "grass_flower"])
sprite("sea_glint", { base: "shore_15" }, hline(4, 5, 3, "b"), hline(10, 11, 2, "b"))
group("sea", ["shore_15", "shore_15", "shore_15", "sea_glint"])

// ---------------------------------------------------------------- props
// A canopy of three overlapping crowns, lit from the top-left; the trunk peeks out below.
sprite("tree", { w: 22, h: 26, outline: "h" },
  rect(9, 18, 4, 7, "o"), vline(12, 18, 7, "O"),
  circ(11, 10, 9, "G"), circ(6, 12, 5, "G"), circ(16, 12, 5, "G"),
  circ(9, 8, 6, "g"), circ(5, 11, 3, "g"), px(13, 5, "g"),
  circ(8, 6, 3, "l"), px(4, 10, "l"), px(5, 9, "l"))
sprite("bush", { w: 12, h: 9, outline: "h" },
  circ(4, 5, 3, "G"), circ(8, 5, 3, "G"), circ(6, 3, 3, "G"), circ(5, 3, 2, "g"), px(4, 2, "l"))
sprite("rock", { w: 12, h: 8, outline: "k" },
  ellipse(6, 4, 5, 3, "S"), ellipse(5, 3, 4, 2, "s"), hline(3, 7, 7, "K"))

// Boards run across the pier; posts stick out at both sides every 12 px.
sprite("pier", { w: 16, h: 40 }, (c) => {
  for (let y = 0; y < 40; y += 4) { c.hline(2, y, 12, "w"); c.hline(2, y + 1, 12, "w"); c.hline(2, y + 2, 12, "W"); c.hline(2, y + 3, 12, "x") }
  for (let y = 6; y < 40; y += 12) { c.rect(0, y, 2, 3, "O"); c.rect(14, y, 2, 3, "O") }
})

sprite("_flower_r", ".r.\nryr\n.r.")
sprite("_flower_y", ".y.\nyry\n.y.")
sprite("_flower_w", ".p.\npyp\n.p.")
group("flowers", ["_flower_r", "_flower_y", "_flower_w"])

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

scene("island", { w: 256, h: 160, world: { light: [-0.5, -1] } },
  layer("ground", tilemap(CORNERS, { corners: "w", size: T, map: tileMap })),
  // below: the layer starts empty, so "on grass" has to look at the layers under it.
  layer("flowers", scatter("flowers", 64, 56, 120, 48, 14, { on: "g", below: true, seed: 3 })),
  layer("shadows", { shade: true },
    ...trees.map(([x, y]) => ellipse(x + 13, y + 25, 9, 3, "k")),
    ellipse(110, 101, 7, 2, "k"), ellipse(126, 61, 7, 2, "k")),
  layer("props",
    stamp("pier", 152, 116),
    stamp("bush", 102, 92), stamp("bush", 118, 52, { flip: "x" }),
    stamp("rock", 196, 92), stamp("rock", 90, 70, { flip: "x" }),
    ...trees.map(([x, y]) => stamp("tree", x, y))))

// For the engine: the 16 shore tiles in mask order, then the variants.
sheet("tiles", ["shore_*", "grass_tuft", "grass_flower", "sea_glint"], { cols: 8 })
