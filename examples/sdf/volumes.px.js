// Density volumes (phase 4 of the 3D DSL): a cloud, a ground mist, smoke and a magic orb, each a shape
// from the fields kit eaten by seeded noise that flows on the clock (sdf.density), drawn by volume():
// ray-marched through its own light (darker where deeper from the sun), a few tones of its ramp in
// clusters, dithered where it is thin, in the palette. Each on its own (from the side as a sprite, and
// through the HD-2D camera on the grass), and all four in a diorama with the mushroom house: the mist
// creeping round its foot, smoke rising from its chimney, the cloud drifting over and its shadow on the
// ground, the orb floating by the path lighting what is round it. What stands nearer hides them; they
// lie over what is behind.
include("kit.px.js", { palette: true })   // with the palette, the four densities (cloud, mist, smoke, orb) and their LOOK

// Each on its own: from the side (a sprite, clear round it) and through the HD-2D camera on the grass,
// `lift` m up (the cloud floats), its middle where the camera looks.
const alone = (name, d, { stage = [128, 112], lift = 0 } = {}) => {
  const [lo, hi] = d.bounds(), w = Math.ceil((hi[0] - lo[0]) * 16) + 8, h = Math.ceil((hi[2] - lo[2] + 0.4 * (hi[1] - lo[1])) * 16) + 8
  anim(`${name}_side`, { w, h, ...CLOCK }, volume(d, { view: "side", ppm: 16, at: [w / 2 - (lo[0] + hi[0]) * 8, h - 4 + lo[2] * 16], light: LIGHT, ...LOOK[name], cast: 0 }))
  const C = hd2d(...stage), G = ground(C.Z), mid = lift + (lo[2] + hi[2]) / 2, at = [0, C.Z - mid / Math.tan(-PITCH * RAD), lift]
  scene(`${name}_camera`, { w: stage[0], h: stage[1], bg: "k", ...CLOCK, check: { every: 24 } },
    (c) => c.mesh(C.view, G.faces, GMATS, { light: LIGHT }), (c) => c.volume(d, { view: C.view, at, light: LIGHT, ...LOOK[name] }))
}
alone("cloud", cloud(), { stage: [160, 128], lift: 2.4 })
alone("mist", mist(), { stage: [160, 96] })
alone("smoke", smoke(), { stage: [96, 112] })
alone("orb", orb(), { stage: [112, 96] })

// All four in a diorama: the HD-2D camera, the grass, a path; the mushroom house, the tree and a rock
// drawn through it (surface()); then the volumes, the farthest first (they write no depth): the cloud
// floating low over the rock, its shadow on the ground, smoke from the house's chimney, the mist creeping round the house's foot, the
// orb bobbing over the path, lighting it.
const W = 320, H = 180, { Z, view: VIEW } = hd2d(W, H), G = ground(Z)
for (let i = 0; i < 6; i++) G.box("path", [-0.9 + (i % 2) * 0.15, Z - 3.6 + i * 0.62, 0], [-0.25 + (i % 2) * 0.15, Z - 3.1 + i * 0.62, 0.04])
const HOUSE = [0.9, Z + 0.4, 0], SOLIDS = [[house(), HOUSE], [tree(), [-3.0, Z + 0.2, 0]], [rock(), [3.0, Z - 1.2, 0]]]
const AIR = [[cloud(0.55), [3.2, Z - 0.9, 2.3], LOOK.cloud], [smoke(), [HOUSE[0] + 0.45, HOUSE[1] + 0.35, 2.45], LOOK.smoke],
  [mist(), [0.6, Z - 0.3, 0], LOOK.mist], [orb(), [-0.6, Z - 2.4, 0], LOOK.orb]]
scene("volumes", { w: W, h: H, bg: "k", ...CLOCK, check: { every: 24 } },
  (c) => c.mesh(VIEW, G.faces, GMATS, { light: LIGHT }),
  (c) => { for (const [f, at] of SOLIDS) c.surface(f, { view: VIEW, at, mats: MATS, light: LIGHT }) },
  (c) => { for (const [d, at, look] of AIR) c.volume(d, { view: VIEW, at, light: LIGHT, ...look }) })
