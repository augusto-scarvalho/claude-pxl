// Normal maps: bump() derives surface directions from shape, normals() paints them by hand, and
// lighting() rakes each lamp across them. The anim swings a lantern so the relief shows.
pal({
  k: "#141020", K: "#2a2238",
  b: "#7a3b2e", B: "#a4553d", m: "#4a3c4e",               // brick, mortar
  s: "#6d7a8c", S: "#9aa8b8",                             // stone
  g: "#3e8a5a", G: "#6cc27c",                             // slime
  w: "#8a5a32", W: "#b07a44", i: "#5a6470",               // crate wood, iron
  y: "#ffd36b",
})

sprite("_brick", `
  bbbbbbbm
  bbbbbbbm
  bbbbbbbm
  mmmmmmmm
  bbbmbbbb
  bbbmbbbb
  bbbmbbbb
  mmmmmmmm`)

// Each brick bevels on its own: mortar counts as the edge. 1px, because the bricks are 3px tall: a
// wider bevel leaves no flat face, and under a near lamp they read as holes.
sprite("bricks", { w: 32, h: 24 }, pattern("_brick", 0, 0, 32, 24), bump("bevel", { on: "b", w: 1 }))

sprite("slime", { w: 15, h: 10 }, ellipse(7, 9, 7, 8, "g"),
  px(5, 5, "k"), px(9, 5, "k"), bump("dome", { depth: 1.5 }))

// Hand-painted: plank edges face out (8 up, 2 down, 4 left, 6 right; 5 = straight at you).
sprite("crate", `
  iwwwwwwwwi
  wWWWWWWWWw
  wWwwwwwwWw
  wWwWWWWwWw
  wWwWWWWwWw
  wWwwwwwwWw
  wWWWWWWWWw
  iwwwwwwwwi`,
  normals(0, 0, `
  7888888889
  4777777776
  4626666464
  4625555464
  4625555464
  4623333364
  4111111116
  1222222223`))

// Shaded the classic way, then luma turns that shading into relief.
sprite("rock", { w: 14, h: 10 }, ellipse(7, 6, 6, 4, "s"), ellipse(5, 4, 3, 2, "S"), px(9, 7, "K"), bump("luma", { depth: 2 }))

sprite("lantern", ".y.\nyyy\n.y.")

const props = () => [
  layer("wall", rect(0, 0, 96, 40, "K"), stamp("bricks", 2, 2), stamp("bricks", 34, 2), stamp("bricks", 66, 2)),
  layer("props", stamp("slime", 6, 29), stamp("crate", 40, 30), stamp("rock", 70, 29)),
];
const lantern = (c, x, y) => { c.stamp("lantern", x - 1, y - 1); c.lamp(x, y, { r: 60, color: "#ffd9a0", z: 6 }); };

anim("relief", { w: 96, h: 40, fps: 8, frames: 16 }, ...props(),
  (c) => lantern(c, 48 + Math.round(40 * Math.cos(c.phase * 2 * Math.PI)), 14 + Math.round(6 * Math.sin(c.phase * 2 * Math.PI))),
  lighting({ cell: 1, ambient: 0.12, emit: "y" }))

// Side by side: the same lamp with relief (normals on) and without.
scene("lit", { w: 96, h: 40 }, ...props(), (c) => lantern(c, 30, 12), lighting({ cell: 1, ambient: 0.12, emit: "y" }))
scene("flat", { w: 96, h: 40 }, ...props(), (c) => lantern(c, 30, 12), lighting({ cell: 1, ambient: 0.12, emit: "y", relief: 0 }))
