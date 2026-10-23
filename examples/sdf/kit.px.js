// The fields kit: the palette, an HD-2D camera, the ground, and the builders of examples/sdf (a tree,
// a rock, a mushroom house, a crystal), each a distance field in meters with semantic parameters.
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
const MATS = { bark: "bBiI", leaf: "ZzxcvVJ", stone: "DtTuUE", moss: "mMnN", cap: "rRoO", spot: "Wyy", stem: "awWy", door: "deX", glow: "Ff", gem: { ramp: "gGhHjl", shine: 0.7 } }

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
const tree = ({ height = 4.4, limbs = 3, twist = 0.35, lobe = 0.9, wind = 0.2, seed = 7 } = {}) => {
  const R = rng(seed), H = height / 4.4, fork = [0, 0, 1.6 * H], parts = [], leaves = []
  const trunk = sdf.capsule([0, 0, 0], fork, 0.2, 0.13).union(
    sdf.capsule([0, 0, 0.25], [-0.55, -0.25, -0.05], 0.11, 0.04), sdf.capsule([0, 0, 0.25], [0.5, 0.3, -0.05], 0.1, 0.04), { smooth: 0.15 })
  parts.push(trunk)
  const tips = []
  for (let i = 0; i < limbs; i++) {
    // all round the fork, the first to the left: each its own way and climb
    const az = (Math.PI + (i * TAU) / limbs + (R() - 0.5) * 0.5), up = (45 + R() * 15) * Math.PI / 180, len = (1.1 + R() * 0.3) * H
    const dir = (a, e) => [Math.cos(a) * Math.cos(e), Math.sin(a) * Math.cos(e), Math.sin(e)]
    const d1 = dir(az, up), mid = fork.map((v, k) => v + d1[k] * len * 0.5)
    const d2 = dir(az + (i % 2 ? 1 : -1) * twist, up + 0.15), tip = mid.map((v, k) => v + d2[k] * len * 0.5)
    parts.push(sdf.capsule(fork, mid, 0.11, 0.08), sdf.capsule(mid, tip, 0.08, 0.05))
    tips.push(tip)
  }
  const wood = sdf.union(parts, { smooth: 0.08 }).mat("bark")
  // the crown: a lobe at each tip, one over the fork, one between each two tips
  const top = [0, 0, fork[2] + 1.9 * H]
  const lobes = [...tips.map((t) => [t[0] * 1.1, t[1] * 1.1, t[2] + 0.4]), top, ...tips.map((t, i) => { const u = tips[(i + 1) % tips.length]; return [(t[0] + u[0]) * 0.5, (t[1] + u[1]) * 0.5, (t[2] + u[2]) / 2 + 0.75] })]
  lobes.forEach((p, i) => {
    const r = lobe * (i < tips.length ? 0.85 : i === tips.length ? 1.05 : 0.75) * (0.9 + R() * 0.2), ph = R()
    leaves.push(sdf.ellipsoid([r, r, r * 0.8]).at((c) => [p[0] + 0.05 * Math.sin(TAU * (2 * c.phase + ph)), p[1], p[2]]))
  })
  const crown = sdf.union(leaves, { smooth: 0.15 }).noise({ amp: 0.14, scale: 0.45, seed, octaves: 1 }).mat("leaf")
  // the wind: the top `wind` m over at the gust, half that between
  return wood.union(crown).bend((c) => (2 * wind * (0.45 + 0.55 * Math.sin(TAU * c.phase))) / (height * height))
}

// A boulder: a squat ellipsoid cut flat by planes all round (rocks read as a few big planes, each one
// tone), their edges softened, a lumpy noise over it, the part under the ground cut away; stone, and
// moss where it faces up.
const rock = ({ size = 0.9, seed = 3 } = {}) => {
  const R = rng(seed), cuts = []
  for (let i = 0; i < 9; i++) {
    const a = (i * TAU) / 9 + R() * 0.5, e = (R() * 70 - 15) * Math.PI / 180
    cuts.push(sdf.plane([Math.cos(a) * Math.cos(e), Math.sin(a) * Math.cos(e), Math.sin(e)], size * (0.62 + R() * 0.12)))
  }
  return sdf.ellipsoid([size, size * 0.8, size * 0.62]).intersect(...cuts, { smooth: 0.06 }).noise({ amp: 0.04, scale: 0.3, seed, octaves: 1 })
    .at(0, 0, size * 0.42).intersect(sdf.plane([0, 0, -1], 0)).mat("stone")
    .paint("moss", (p, n) => n[2] > 0.72 && sdf.fbm(p[0] * 2.2, p[1] * 2.2, p[2] * 2.2, seed) > 0.42)
}
// A mushroom house: a stem widening to its foot, a door sunk into it (its frame, a knob) and a round
// window lit from inside, under a cap a dome flattened and cut below, red with cream spots, a chimney
// through it.
const house = ({ seed = 5 } = {}) => {
  const stem = sdf.cone(0.78, 1.5, 0.6).union(sdf.torus(0.66, 0.1).at(0, 0, 0.1), { smooth: 0.15 }).mat("stem")
  const door = sdf.box([0.5, 0.4, 0.9], { round: 0.04 }).union(sdf.cylinder(0.25, 0.4).rotate(90, "x").at(0, 0.2, 0.9)).at(0, -0.75, 0.45)
  const window = sdf.cylinder(0.14, 0.4).rotate(90, "x").at(0.42, -0.6, 1.05)
  const body = stem.subtract(door, window)
    .union(sdf.box([0.42, 0.06, 0.8]).at(0, -0.58, 0.4).union(sdf.sphere(0.04).at(0.13, -0.62, 0.45)).mat("door"), sdf.cylinder(0.13, 0.08).rotate(90, "x").at(0.42, -0.52, 1.05).mat("glow"))
  const R = rng(seed), spots = Array.from({ length: 11 }, (_, i) => { const a = (i * TAU) / 11 + R() * 0.8, e = 0.3 + R() * 1; return [Math.cos(a) * Math.cos(e), Math.sin(a) * Math.cos(e), Math.sin(e)] })
  const cap = sdf.ellipsoid([1.3, 1.3, 0.85]).intersect(sdf.plane([0, 0, -1], -0.1)).at(0, 0, 1.4).mat("cap")
    .paint("spot", (p, n) => spots.some((s) => s[0] * n[0] + s[1] * n[1] + s[2] * n[2] > 0.982))
  const chimney = sdf.cylinder(0.12, 0.6).at(0.45, 0.35, 1.85).union(sdf.cylinder(0.16, 0.08).at(0.45, 0.35, 2.4)).mat("door")
  return body.union(cap, chimney)
}
// A crystal cluster: three hexagonal prisms with pointed tips (each the inside of six planes round it,
// six leaning in over its tip), leaning apart from a rock at their foot; glinting where the light
// mirrors toward the eye. It turns once round over the loop.
const crystal = ({ seed = 2 } = {}) => {
  const prism = (r, h) => {
    const sides = [0, 1, 2, 3, 4, 5].map((k) => { const a = (k * TAU) / 6; return sdf.plane([Math.cos(a), Math.sin(a), 0], r) })
    const tip = [0, 1, 2, 3, 4, 5].map((k) => { const a = (k * TAU) / 6, e = 0.6; return sdf.plane([Math.cos(a) * Math.cos(e), Math.sin(a) * Math.cos(e), Math.sin(e)], (h - r * 0.9) * Math.sin(e) + r * Math.cos(e)) })
    return sdf.cylinder(r * 1.2, h + 0.1).intersect(...sides, ...tip)
  }
  const gems = sdf.union(prism(0.2, 1.3), prism(0.15, 0.95).rotate(-30, "y").rotate(25).at(0.14, 0.04, 0), prism(0.13, 0.75).rotate(34, "y").rotate(-50).at(-0.12, -0.05, 0), prism(0.1, 0.5).rotate(40, "x").at(0, -0.12, 0)).mat("gem")
  const base = rock({ size: 0.45, seed })
  return gems.at(0, 0, 0.12).union(base).rotate((c) => 360 * c.phase)
}

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
const smoke = () => sdf.density(sdf.capsule([0, 0, 0.05], [0.55, 0.15, 2.7], 0.14, 0.55), { edge: 0.2, noise: 0.3, scale: 0.25, seed: 8, octaves: 3, flow: [0.2, 0, 2.6], fade: [1.2, 2.8] })
// A magic orb: a ball of swirling matter bobbing a meter up, glowing from its middle.
const orb = () => sdf.density(sdf.sphere(0.42).at((c) => [0, 0, 1 + 0.08 * Math.sin(TAU * c.phase)]), { edge: 0.42, noise: 0.1, scale: 0.18, seed: 2, octaves: 2, flow: [0, 0.2, 0.6] })
const LOOK = {
  cloud: { ramp: "12345", thickness: 3, cast: 0.5 },
  mist: { ramp: "678", thickness: 1.4 },
  smoke: { ramp: "90+=", thickness: 4 },
  orb: { ramp: "<>", thickness: 8, emit: { ramp: "[]^", strength: 1.1, glow: 2.2 } },
}
