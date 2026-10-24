// Turnarounds: a thing in 3D seen from N headings by turnaround(), a sprite each that any scene stamps,
// named by the compass (n away from us, e to the right, s toward us, clockwise; 16 adds nne, ene, ...).
// The mushroom house, its door its front: the 4 diagonals of an iso game (ne, se, sw, nw: a sprite to a
// quarter of its grid), 8 through the HD-2D camera, 16 from the side (3/4) as a top-down action game's.
// A shrine that is its own mirror, lit from above and in front, its east headings its west ones flipped
// (as the traveler's are). Each family is one size, its pivot at the thing's foot, so each sprite stands
// where it is stamped: on an iso grid, among mesh()'s faces. The contact sheets and the house turning.
include("kit.px.js", { palette: true })   // the palette, the camera, the ground, the materials and the light (look3d)

const HOUSE = make3d.house()
const CAM = hd2d(320, 180)
// (each gives its sprites' names, its headings', their size and pivot, and those mirrored)
const H4 = turnaround("house4", HOUSE, { view: "iso", n: 4 }), H8 = turnaround("house8", HOUSE, { view: CAM, n: 8 })
const H16 = turnaround("house16", HOUSE, { view: "side", n: 16 })

// A wayside shrine: a stone step, a wooden box with an arched niche in its front, a lamp glowing in it,
// a pitched red roof with its ridge running front to back; nothing off its middle, so it is its own mirror.
const SHRINE = sdf.box([0.9, 0.8, 0.2]).at(0, 0, 0.1).mat("stone")
  .union(sdf.box([0.62, 0.56, 0.75]).at(0, 0, 0.57).mat("door"),
    sdf.box([0.62, 0.9, 0.62], { round: 0.03 }).rotate(45, "y").at(0, 0, 0.95).intersect(sdf.plane([0, 0, -1], -0.95)).mat("cap"))
  .subtract(sdf.cylinder(0.16, 0.5).rotate(90, "x").at(0, -0.3, 0.62).union(sdf.box([0.32, 0.5, 0.2]).at(0, -0.3, 0.52)))
  .union(sdf.sphere(0.08).at(0, -0.14, 0.58).mat("glow"))
const SH = turnaround("shrine", SHRINE, { view: "side", n: 8, light: [0, -0.55, 1] })

// the contact sheets: a family in a row (16 in two), each heading's name over it
const contact = (name, T, cols) => {
  const cw = Math.max(T.w, 22) + 4, rows = Math.ceil(T.names.length / cols)
  scene(name, { w: cols * cw + 4, h: rows * (T.h + 12) + 4, bg: "K" }, (c) => T.names.forEach((n, i) => {
    const x = 4 + (i % cols) * cw, y = 4 + Math.floor(i / cols) * (T.h + 12)
    c.text(x, y, T.headings[i], "W")
    c.stamp(n, x + T.pivot[0], y + 8 + T.pivot[1])
  }))
}
contact("sheet4", H4, 4)
contact("sheet8", H8, 8)
contact("sheet16", H16, 8)
contact("sheet_shrine", SH, 8)

// the house turning, a heading a frame, clockwise, once round in about 2.7 s
anim("house_turning", { w: H16.w, h: H16.h, frames: 16, fps: 6 }, (c) => c.stamp(H16.names[c.frame], ...H16.pivot))

// stamped: four houses on an iso grid, each facing its way; and the HD-2D ones standing on the grass of a
// diorama through the same camera, among its faces (a wall in front hides a door), on the model
scene("iso_lane", { w: 224, h: 150, bg: "K" }, (c) => {
  c.poly([112, 40, 216, 92, 112, 144, 8, 92], "s")
  for (const [n, x, y] of [["nw", 112, 70], ["ne", 160, 94], ["sw", 64, 94], ["se", 112, 120]]) c.stamp(`house4_${n}`, x, y)
})
const G = ground(CAM.z)
G.box("wall", [-1.6, CAM.z - 0.4, 0], [1.6, CAM.z - 0.2, 0.7])
scene("diorama_turned", { w: 320, h: 180, bg: "k" }, (c) => c.mesh(CAM, G.faces, GMATS, {
  stand: true, sprites: [["s", -4.2, 0.6], ["e", 0, 1.2], ["ne", 4.2, 1.6], ["w", -1.4, -3.2]].map(([n, x, z]) => ({ name: `house8_${n}`, at: [x, CAM.z + z] })),
}))
