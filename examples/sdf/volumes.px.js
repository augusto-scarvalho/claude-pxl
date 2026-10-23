// Density volumes (phase 4 of the 3D DSL): a cloud, a ground mist, smoke and a magic orb, each a shape
// from the fields kit eaten by seeded noise that flows on the clock (sdf.density), drawn by volume():
// ray-marched through its own light (darker where deeper from the sun), a few tones of its ramp in
// clusters, dithered where it is thin, in the palette. Each on its own (from the side as a sprite, and
// through the HD-2D camera on the grass), and all four in a diorama with the mushroom house: the mist
// creeping round its foot, smoke rising from its chimney, the cloud drifting over and its shadow on the
// ground, the orb floating by the path lighting what is round it. What stands nearer hides them; they
// lie over what is behind.
include("kit.px.js", { palette: true })
// the cloud: slate blue in its shade to white in the sun
pal({ 1: "#3c4868", 2: "#5d6d92", 3: "#8b9cbc", 4: "#c3cfe0", 5: "#f2f5f8" })
ramps("12345")
// the mist: a cool blue
pal({ 6: "#4a6488", 7: "#7090b4", 8: "#a6c0dc" })
ramps("678")
// smoke: warm greys
pal({ 9: "#3a3638", 0: "#5c5658", "+": "#86807c", "=": "#b0aaa2" })
ramps("90+=")
// the orb: violet in its shade; what glows cyan to white
pal({ "<": "#3a2470", ">": "#6a3cc0", "[": "#5ab8f0", "]": "#b8f0ff", "^": "#ffffff" })
ramps("<>", "[]^")

// A cumulus: four puffs melted on a flat base, the noise boiling through them over the loop, the
// whole drifting a little and back; `size` scales it all.
const cloud = (size = 1) => sdf.density(
  sdf.union(sdf.ellipsoid([1.4, 1.0, 0.75]), sdf.sphere(0.85).at(1.0, 0.2, 0.3), sdf.sphere(0.8).at(-1.0, -0.1, 0.2), sdf.sphere(0.75).at(0.25, 0.2, 0.65), { smooth: 0.4 })
    .intersect(sdf.plane([0, 0, -1], 0.45)).at((c) => [0.25 * Math.sin(TAU * c.phase), 0, 0]).scale(size),
  { edge: 0.3 * size, noise: 0.45 * size, scale: 0.55 * size, seed: 4, octaves: 3, flow: [1.2 * size, 0.2 * size, 0.3 * size] })
// A mist lying low: a flat bank on the ground, thinning away up from 0.1 m to 0.7 m, its billows
// creeping along over the loop.
const mist = () => sdf.density(sdf.ellipsoid([2.8, 1.8, 0.6]).at(0, 0, 0.1), { edge: 0.6, noise: 0.6, scale: 0.8, seed: 6, octaves: 3, flow: [2.4, 0.6, 0], fade: [0.1, 0.7] })
// Smoke from a chimney: a column widening as it rises and leans away from the wind, its billows
// carried up through it, thinning away from 1.2 m to 2.8 m.
const smoke = () => sdf.density(sdf.capsule([0, 0, 0.05], [0.55, 0.15, 2.7], 0.14, 0.55), { edge: 0.2, noise: 0.3, scale: 0.25, seed: 8, octaves: 3, flow: [0.2, 0, 2.6], fade: [1.2, 2.8] })
// A magic orb: a ball of swirling matter bobbing a meter up, glowing from its middle.
const orb = () => sdf.density(sdf.sphere(0.42).at((c) => [0, 0, 1 + 0.08 * Math.sin(TAU * c.phase)]), { edge: 0.42, noise: 0.1, scale: 0.18, seed: 2, octaves: 2, flow: [0, 0.2, 0.6] })
const LOOK = {
  cloud: { ramp: "12345", thickness: 3, cast: 0.5 },
  mist: { ramp: "678", thickness: 1.4 },
  smoke: { ramp: "90+=", thickness: 4 },
  orb: { ramp: "<>", thickness: 8, emit: { ramp: "[]^", strength: 1.1, glow: 2.2 } },
}

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
