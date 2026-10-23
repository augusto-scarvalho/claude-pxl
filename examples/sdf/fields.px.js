// Fields in 3D drawn as pixel art: a tree, a rock, a mushroom house and a crystal built as distance
// fields (sdf.*: primitives in meters joined, moved, bent and painted), each drawn by surface() from
// the side (3/4), from the top and in isometric 2:1, and all of them standing in a mesh() diorama seen
// through an HD-2D camera, at their depth, their shadows on the ground. Parameters read the clock: the
// tree sways in the wind, the crystal turns, the rock and the house turn on a turntable. The tree is
// the reference the 3D DSL is measured by: its spec is at tree() below.
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
// view(k): the same picture k times as big (HD), a pixel of art k x k px.
const hd2d = (w, h) => {
  const focal = w / 2 / Math.tan((FOV / 2) * RAD), dist = focal / PPM
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

// A field in the four views: from the side, the top and in iso as sprites (anims on the clock, sized to
// it), and `<name>_camera`, a scene of it standing on the grass through the HD-2D camera, its shadow on
// the ground. `turn`: on a turntable, once round over the loop.
const views = (name, field, { ppm = 16, turn = false, stage = [128, 112] } = {}) => {
  const f = turn ? field.rotate((c) => 360 * c.phase) : field
  for (const v of ["side", "top", "iso"]) {
    const S = sdf.size(f, { view: v, ppm, frames: CLOCK.frames })
    anim(`${name}_${v}`, { w: S.w, h: S.h, pivot: S.pivot, ...CLOCK }, surface(f, { view: v, ppm, at: S.pivot, mats: MATS }))
  }
  // (its middle where the camera looks: its foot nearer by what its half height rises on the picture)
  const C = hd2d(...stage), G = ground(C.Z), [lo, hi] = field.bounds(), at = [0, C.Z - ((lo[2] + hi[2]) / 2) / Math.tan(-PITCH * RAD), 0]
  scene(`${name}_camera`, { w: stage[0], h: stage[1], bg: "k", ...CLOCK, check: { every: 12 } },
    (c) => c.mesh(C.view, G.faces, GMATS, { light: LIGHT }), (c) => c.surface(f, { view: C.view, at, mats: MATS, light: LIGHT }))
}
views("tree", tree(), { stage: [144, 176] })

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
views("rock", rock(), { ppm: 32, turn: true, stage: [96, 72] })

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
views("house", house(), { turn: true, stage: [112, 112] })

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
views("crystal", crystal(), { ppm: 32, stage: [80, 80] })

// The four standing in a diorama: mesh() draws the ground, a flagstone path and a low wall seen
// through an HD-2D camera (40 degrees down, a long lens, 24 px to the meter where it looks); then each
// field is drawn through the same camera where it stands, a ray to a pixel, behind what mesh() drew
// nearer the eye (the wall hides the rock's foot), its shadow marched to the light and laid on the
// ground, the wall and the others.
const W = 320, H = 180, { Z, view: VIEW, hd: HD } = hd2d(W, H), G = ground(Z)
for (let i = 0; i < 6; i++) G.box("path", [0.55 + (i % 2) * 0.15, Z - 3.6 + i * 0.62, 0], [1.2 + (i % 2) * 0.15, Z - 3.1 + i * 0.62, 0.04])
G.box("wall", [1.5, Z - 2.05, 0], [4.3, Z - 1.75, 0.45])
const THINGS = [[tree(), [-2.7, Z - 0.6, 0]], [house(), [0.9, Z + 0.4, 0]], [rock(), [2.8, Z - 1.4, 0]], [crystal(), [-0.9, Z - 2.3, 0]]]
scene("diorama", { w: W, h: H, bg: "k", ...CLOCK, check: { every: 12 } },
  (c) => c.mesh(VIEW, G.faces, GMATS, { light: LIGHT }),
  (c) => { for (const [f, at] of THINGS) c.surface(f, { view: VIEW, at, mats: MATS, light: LIGHT }) })
// The same three times as big (960x540), each pixel of art 3 x 3 px: the faces in blocks, a ray to each
// block; and what the camera does to it (post()): the band where the things stand sharp, the rest blurred.
const K = 3, BLOCKS = Object.fromEntries(Object.entries(GMATS).map(([k, m]) => [k, { ...m, block: K }]))
scene("diorama_hd", { w: W * K, h: H * K, bg: "k", ...CLOCK, check: false },
  (c) => c.mesh(HD(K), G.faces, BLOCKS, { light: LIGHT }),
  (c) => { for (const [f, at] of THINGS) c.surface(f, { view: HD(K), at, mats: MATS, light: LIGHT, pixel: K }) },
  post({ blur: 12, sharp: 2.5, soft: 4, bloom: { strength: 0.5 } }))

// The tree as a sprite: drawn from the camera's pitch at its px to the meter, standing among mesh()'s
// faces as the pines do (upright, turned to the camera, a depth per row), its normals lit by the sun,
// its shadow the sun's (a billboard's); beside it the same tree drawn through the camera by surface().
const CARD = sdf.size(tree(), { view: { kind: "side", pitch: -PITCH }, ppm: PPM, frames: CLOCK.frames })
anim("tree_card", { w: CARD.w, h: CARD.h, pivot: CARD.pivot, ...CLOCK }, surface(tree(), { view: { kind: "side", pitch: -PITCH }, ppm: PPM, at: CARD.pivot, mats: MATS }))
// (the sun lights textured faces: grass laid a texel to a pixel, a tone darker in ragged blobs)
sprite("_grass", { w: 32, h: 32 }, (c) => { for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) c.px(x, y, fbm(x / 6, y / 4) > 0.55 ? "Q" : "s") })
const SUN = { light: LIGHT, sun: { color: "#ffe2b0", strength: 1.25 }, sky: { color: "#8aa2d0", strength: 0.45 } }
scene("two_trees", { w: W, h: H, bg: "k", ...CLOCK, check: { every: 12 } },
  (c) => c.mesh(VIEW, G.faces, { ...GMATS, grass: { tex: "_grass", texel: [1 / PPM, 1 / (PPM * Math.sin(-PITCH * Math.PI / 180))] } }, { ...SUN, sprites: [{ name: "tree_card", at: [-2.2, Z - 0.6] }] }),
  (c) => c.surface(tree(), { view: VIEW, at: [1.6, Z - 0.6, 0], mats: MATS, light: LIGHT }))
