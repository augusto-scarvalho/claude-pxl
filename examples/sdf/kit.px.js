// The fields kit: the palette, an HD-2D camera, the ground, and the builders of examples/sdf (a tree,
// a rock, a mushroom house, a crystal: make3d's, the library of builders with semantic parameters, their
// fields here), each a distance field in meters.
// Taken with include("kit.px.js", { palette: true }) by fields.px.js (as pixel art) and grids.px.js
// (as voxels and meshes).
pal({ k: "#141222", K: "#1f1a30" })
// bark: violet in the shade to a warm grey-brown
pal({ b: "#2a2236", B: "#4a3c4a", i: "#6f5c5a", I: "#9c8774" })
ramps("bBiI")
// leaves: indigo in the deepest shade to a yellow-green in the sun, the hue doing much of the shading
pal({ Z: "#1d1d38", z: "#233a4c", x: "#24573f", c: "#2f6b3e", v: "#4a8240", V: "#73983f", J: "#b4b85a" })
ramps("ZzxcvVJ")
// stone: indigo in the shade, a mauve grey, cream in the sun; moss
pal({ D: "#2a2840", t: "#4b4660", T: "#6c6476", u: "#928694", U: "#c0b39f", E: "#e6dcbd" })
ramps("DtTuUE")
pal({ m: "#2c4620", M: "#46662a", n: "#66883a", N: "#8fa64a" })
ramps("mMnN")
// the mushroom's cap, its spots and stem, a door, a window lit from inside
pal({ r: "#4a1830", R: "#7a2438", o: "#b23a3a", O: "#e0603e", a: "#5a4a5a", w: "#9a8a8a", W: "#cdbfae", y: "#f0e6d0", d: "#3a2a24", e: "#5c4030", X: "#8a6a4a", f: "#ffd27a", F: "#ffb04a" })
ramps("rRoO", "awWy", "deX", "Ff")
// a crystal: violet to ice blue
pal({ g: "#22205a", G: "#3a3a9a", h: "#4e6ad0", H: "#7aa8f0", j: "#b8e4ff", l: "#f4fcff" })
ramps("gGhHjl")
// the diorama's ground
pal({ q: "#2c3a28", Q: "#3d5232", s: "#56703e", S: "#7a8c4e", p: "#6a5a48", P: "#8a7860" })
ramps("qQsS", "pP")

const CLOCK = { frames: 24, fps: 1000 / 150 }, TAU = 2 * Math.PI
const MATS = { bark: "bBiI", leaf: "ZzxcvVJ", stone: "DtTuUE", moss: "mMnN", cap: "rRoO", spot: "Wyy", stem: "awWy", door: "deX", glow: "Ff", gem: { ramp: "gGhHjl", shine: 0.7 }, snow: "Wyy" }

// An HD-2D camera, as the hd2d examples' (hd2d/kit.px.js): 40 degrees down through a long lens (30
// across), 24 px to the meter where it looks, the middle of a w x h picture on the ground Z m ahead.
// The light from the upper left, a little toward us: shadows fall right and away.
const PITCH = -40, FOV = 30, PPM = 24, LIGHT = [-0.65, -0.35, 0.68], RAD = Math.PI / 180
// view(k): the same picture k times as big (HD), a pixel of art k x k px; `ppm` another scale.
const hd2d = (w, h, ppm = PPM) => {
  const focal = w / 2 / Math.tan((FOV / 2) * RAD), dist = focal / ppm
  const view = (k = 1) => ({ w: w * k, fov: FOV, pitch: PITCH, eye: dist * Math.sin(-PITCH * RAD), horizon: (h / 2 + focal * Math.tan(PITCH * RAD)) * k })
  return { Z: dist * Math.cos(-PITCH * RAD), view: view(), hd: view }
}
const GMATS = { grass: { ramp: "qQsS" }, path: { ramp: "tTu" }, wall: { ramp: "DtTuU" } }
const ground = (Z) => { const g = model(); g.face("grass", [-12, Z - 8, 0], [12, Z - 8, 0], [12, Z + 12, 0], [-12, Z + 12, 0]); return g }

// The reference tree, the one the 3D DSL is measured by (to be made the same as voxels, a mesh and
// splats): a broadleaf. A trunk 0.2 m round at the foot flaring into two roots, narrowing to 0.13 m at
// the fork 1.6 m up; there `limbs` limbs (3) part all round it and climb at 45-60 degrees, each kinking
// once (`twist`: how far its second half turns away), 1.1-1.4 m long, tapering to 0.05 m; kept apart
// where they leave the fork (limbs crossing there read as a tangle). The crown: a lobe at each limb's
// end, one over the fork and one between each two tips, melted together (0.15 m) and pushed in and out
// by seeded noise (0.14 m in bumps 0.45 m across), so the lobes read as clumps: 2.8 m wide, 2.5 m deep,
// from 2.3 m up to 4.2 m (wider than tall by half), the trunk and the limbs' feet showing under it.
// Bark and leaves, lit from the upper left. The wind (`wind`: m at the top, 0.2) bends it as a way
// bends (the trunk with the square of the height), coming and going over the loop, each lobe
// fluttering out of step twice as fast. Seen from the side (20 degrees down), the top, iso (30 down, 45
// round) at 16 px to the meter, and through an HD-2D camera at 24. Measured by: its silhouette and
// proportions the same in every view and every representation (the crown's width over its height, the
// trunk's share under it), 4 to 7 tones a material in clusters, the outline only on the side away from
// the light, its foot on the ground and its shadow touching it, the same seed the same tree, and its
// parameters (height, limbs, twist, lobe, wind, seed) the handles a local edit turns.
const tree = (o = {}) => make3d.tree(o).field

// A boulder: a squat ellipsoid cut flat by planes all round (rocks read as a few big planes, each one
// tone), their edges softened, a lumpy noise over it, the part under the ground cut away; stone, and
// moss where it faces up.
const rock = (o = {}) => make3d.rock(o).field
// A mushroom house: a stem widening to its foot, a door sunk into it (its frame, a knob) and a round
// window lit from inside, under a cap a dome flattened and cut below, red with cream spots, a chimney
// through it.
const house = (o = {}) => make3d.house(o).field

// A crystal cluster: three hexagonal prisms with pointed tips (each the inside of six planes round it,
// six leaning in over its tip), leaning apart from a rock at their foot; glinting where the light
// mirrors toward the eye. It turns once round over the loop.
const crystal = (o = {}) => make3d.crystal(o).field.rotate((c) => 360 * c.phase)

// Densities for volume() and splats: a cloud, a mist, smoke and a magic orb, and how each is drawn (LOOK).
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
const smokeField = () => sdf.density(sdf.capsule([0, 0, 0.05], [0.55, 0.15, 2.7], 0.14, 0.55), { edge: 0.2, noise: 0.3, scale: 0.25, seed: 8, octaves: 3, flow: [0.2, 0, 2.6], fade: [1.2, 2.8] })
// A magic orb: a ball of swirling matter bobbing a meter up, glowing from its middle.
const orb = () => sdf.density(sdf.sphere(0.42).at((c) => [0, 0, 1 + 0.08 * Math.sin(TAU * c.phase)]), { edge: 0.42, noise: 0.1, scale: 0.18, seed: 2, octaves: 2, flow: [0, 0.2, 0.6] })
const LOOK = {
  cloud: { ramp: "12345", thickness: 3, cast: 0.5 },
  mist: { ramp: "678", thickness: 1.4 },
  smoke: { ramp: "90+=", thickness: 4 },
  orb: { ramp: "<>", thickness: 8, emit: { ramp: "[]^", strength: 1.1, glow: 2.2 } },
}
