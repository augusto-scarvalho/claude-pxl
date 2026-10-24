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
  anim(`${name}_side`, { w, h, ...CLOCK }, volume(d, { view: "side", ppm: 16, at: [w / 2 - (lo[0] + hi[0]) * 8, h - 4 + lo[2] * 16], ...LOOK[name], cast: 0 }))
  const C = hd2d(...stage), G = ground(C.z), at = C.aim(lift + (lo[2] + hi[2]) / 2, lift)
  scene(`${name}_camera`, { w: stage[0], h: stage[1], bg: "k", ...CLOCK, check: { every: 24 } },
    (c) => c.mesh(C, G.faces, GMATS), (c) => c.volume(d, { view: C, at, ...LOOK[name] }))
}
alone("cloud", cloud(), { stage: [160, 128], lift: 2.4 })
alone("mist", mist(), { stage: [160, 96] })
alone("smoke", smokeField(), { stage: [96, 112] })
alone("orb", orb(), { stage: [112, 96] })

// All four in a diorama, a world: the mushroom house, the tree and a rock; the cloud, the smoke at the
// house's chimney, the mist and the orb made by builders of this file's own (make3d.define), each drawn
// in its look; draw3d draws the solids, then the air the farthest first (it writes no depth): the cloud
// floating low over the rock, its shadow on the ground, the mist creeping round the house's foot, the
// orb bobbing over the path, lighting it.
make3d.define("cloud", ({ size = 1 }) => ({ density: cloud(size) }), { params: { size: [0.2, 3] } })
make3d.define("chimney_smoke", () => ({ density: smokeField() }))
make3d.define("bank", () => ({ density: mist() }))
make3d.define("orb", () => ({ density: orb() }))
const W = 320, H = 180, VIEW = hd2d(W, H), Z = VIEW.z, G = ground(Z)
for (let i = 0; i < 6; i++) G.box("path", [-0.9 + (i % 2) * 0.15, Z - 3.6 + i * 0.62, 0], [-0.25 + (i % 2) * 0.15, Z - 3.1 + i * 0.62, 0.04])
const DIORAMA = world3d({ parts: {
  house: { make: "house", at: [0.9, Z + 0.4], seed: 5 },
  tree: { make: "tree", at: [-3.0, Z + 0.2], seed: 7, params: { wind: 0.2 } },
  rock: { make: "rock", at: [3.0, Z - 1.2], seed: 3 },
  cloud: { make: "cloud", at: [3.2, Z - 0.9, 2.3], params: { size: 0.55 }, look: LOOK.cloud },
  smoke: { make: "chimney_smoke", attach: ["house", "chimney"], at: [0, 0, -0.03], look: LOOK.smoke },
  mist: { make: "bank", at: [0.6, Z - 0.3], look: LOOK.mist },
  orb: { make: "orb", at: [-0.6, Z - 2.4], look: LOOK.orb },
} })
scene("volumes", { w: W, h: H, bg: "k", ...CLOCK, check: { every: 24 } },
  (c) => c.mesh(VIEW, G.faces, GMATS), (c) => c.draw3d(DIORAMA, { view: VIEW }))
