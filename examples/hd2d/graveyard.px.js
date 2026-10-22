// HD-2D: a graveyard on a hill in a pine wood, morning mist, as Octopath Traveler lays out its
// dioramas: a plateau of grass held up by a mossy stone wall, stone steps up its front, a flagstone
// path to the back, headstones either side of it, a picket fence round the top, a dead tree, the wood
// all round and hills fading into the mist. Built in meters with mesh() (blocks of the kit, textures
// laid a texel to a pixel where the camera looks; the grass reaching over the path's margins laid on
// them, its clear texels holes the stones show through; the fence of boxes), the people (traveler.px.js), trees, stones and plants as sprites standing in it,
// a low sun behind on the left. Its ground, plants and stones are drawn after the games' sheets (pxl
// study) and SLYNYRD's, Saint11's and final boss blues' tutorials. `graveyard` is the art at its own
// size, the one checked; `graveyard_hd` the same four times as big through post().
include("traveler.px.js")
include("kit.px.js", { palette: true })


// Weathered wood for the fence's boxes: grain running along it.
sprite("_wood", { w: 4, h: 8 }, (c) => { for (let y = 0; y < 8; y++) for (let x = 0; x < 4; x++) c.px(x, y, x === 1 && y % 3 ? "i" : x === 3 && y % 4 === 1 ? "B" : "I") })
// Where the grass meets the path: blades reaching over the stones' edge 1-5 px, in clumps, their tips
// lit, the blue dark under some; laid over the path's margins (anchored to the strip, its clear texels
// letting the stones show), the grass's side at its left; flipped for the other margin. 48 rows, so it
// tiles along the path.
sprite("_edge", { w: 8, h: 48 }, (c) => {
  const T = Math.PI * 2
  for (let y = 0; y < 48; y++) {
    const reach = Math.max(1, Math.round(2.4 + 1.6 * Math.sin((T * 4 * y) / 48) + 1.2 * Math.sin((T * 11 * y) / 48 + 2)))
    for (let x = 0; x < reach; x++) c.px(x, y, x === reach - 1 ? (y % 5 ? "e" : "r") : (x + y) % 4 ? "w" : "q")
    if (y % 2) c.px(reach, y, "Q")
  }
})
sprite("_edge_r", { base: "_edge", flip: "x" })


// Headstones, drawn at the scene's scale (24 px to the meter), seen from 38 degrees up: the front in the
// shade (the sun is behind them), the slab's top above it in the sun, its front edge a 1 px cream rim;
// the left edge catching the light; a cross or lines cut in the front (the cut's upper wall dark, its
// floor lit); a pair of pockmarks, lichen in clusters of 2-3 px, moss in lumps 2-3 px wide climbing from
// the foot; the old ones chipped at a corner, cracked, leaning (lean: px at the top); the darkest tone
// only down the right side.
const headstone = (name, w, h, inside, cut, { lean = 0, seed = 1, chip = 0, crack = false } = {}) =>
  sprite(name, { w: w + 3 + Math.abs(lean), h: h + 3, pivot: "bottom" }, (c) => {
    const r = rng(seed), first = []
    const shape = (x, y) => x >= 0 && x < w && y >= 0 && y < h && inside(x + 0.5 - w / 2, y)
    for (let x = 0; x < w; x++) { let y = 0; while (y < h && !shape(x, y)) y++; first[x] = y }
    const face = (x, y) => shape(x, y) && !(chip && w - 1 - x < chip && y - first[x] < chip - (w - 1 - x))
    const groove = (x, y) => face(x, y) && cut(x + 0.5 - w / 2, y)
    const put = (x, y, k) => c.px(1 + Math.max(0, -lean) + x + Math.round((lean * (h - 1 - y)) / h), y + 3, k)
    const marks = new Map(), mark = (x, y, k) => face(x, y) && marks.set(x + y * 99, k)
    for (let n = 0; n < 2; n++) { const x = 2 + Math.floor(r() * (w - 5)), y = 5 + Math.floor(r() * (h - 10)); mark(x, y, "t"); mark(x + 1, y + 1, "U") }
    for (let n = 0; n < 2; n++) { const x = 1 + Math.floor(r() * (w - 3)), y = 3 + Math.floor(r() * (h - 8)); mark(x, y, "M"); mark(x + 1, y, "M"); mark(x, y + 1, "m") }
    if (crack) { const x = w - 4; [[0, 0], [0, 1], [-1, 2], [-1, 3]].forEach(([dx, dy]) => mark(x + dx, first[x] + 1 + dy, "D")) }
    const moss = []
    for (let x = 0; x < w; ) { const n = 2 + Math.floor(r() * 2), m = Math.floor(r() * 4); for (let i = 0; i < n; i++) moss[x + i] = m; x += n }
    for (let y = -3; y < h; y++) for (let x = 0; x < w; x++) {
      if (!face(x, y)) {
        if (face(x, y + 1)) put(x, y, "E")
        else if (face(x, y + 2) || face(x, y + 3)) put(x, y, "U")
        continue
      }
      put(x, y, groove(x, y) ? (!groove(x, y - 1) ? "D" : !groove(x, y + 1) ? "u" : "t")
        : y >= h - moss[x] ? (y === h - moss[x] ? "M" : "m")
        : marks.get(x + y * 99) ?? (!face(x - 1, y) ? "U" : !face(x + 1, y) ? "t" : !face(x, y - 1) ? "U" : "u"))
      if (!face(x + 1, y)) put(x + 1, y, "D")
    }
  }, bump("hybrid"))
const arch = (w) => (x, y) => y >= (w / 2) * 0.75 * (1 - Math.sqrt(Math.max(0, 1 - ((2 * x) / w) ** 2)))
headstone("_grave_arch", 15, 22, arch(15), (x, y) => (Math.abs(x) < 1 && y >= 5 && y <= 15) || (Math.abs(x) < 4 && y >= 8 && y <= 9), { seed: 1 })
headstone("_grave_slab", 14, 18, (x, y) => y >= (Math.abs(x) > 5.5 ? 1 : 0), (x, y) => Math.abs(x) < 4.5 && (y === 4 || y === 5 || y === 8 || y === 9 || ((y === 12 || y === 13) && Math.abs(x) < 2.5)), { lean: 1, seed: 2, chip: 2, crack: true })
headstone("_grave_cross", 13, 24, (x, y) => Math.abs(x) < 2.5 || (y >= 5 && y <= 8) || (y >= 20 && Math.abs(x) < 5.5), () => false, { seed: 3 })
headstone("_grave_old", 13, 16, arch(13), () => false, { lean: -2, seed: 4, chip: 3, crack: true })

// The camera: 24 px to the meter, 38 degrees down, 30 across; the hill centred (Z, 1.6 m behind where it
// looks, is the hill's middle).
const W = 480, H = 270, CAM = hd2dCamera({ w: W, h: H, pitch: -38, fov: 30, ppm: 24 }), Z = CAM.z - 1.6, DIST = CAM.dist, view = CAM.view
const M = model(), block = (...a) => hd2dBlock(M, ...a)
// The textures a texel to a pixel where the camera looks: the floors foreshortened, the walls a little.
const MATS = {
  grass: { tex: "_grass", texel: CAM.floor }, turf: { tex: "_turf", texel: CAM.floor }, flags: { tex: "_flags", texel: CAM.floor },
  rampart: { tex: "_rampart", anchor: "face", texel: CAM.wall }, riser: { tex: "_riser", anchor: "face", texel: CAM.wall },
  wood: { tex: "_wood", texel: [1 / 64, 1 / 64] },
  edge: { tex: "_edge", anchor: "face", texel: CAM.floor }, edge_r: { tex: "_edge_r", anchor: "face", texel: CAM.floor },
}
const TOP = 1.5                                                     // the hill's top
M.face("turf", [-40, Z - 25, 0], [40, Z - 25, 0], [40, Z + 60, 0], [-40, Z + 60, 0])
block("grass", "rampart", -6.5, Z - 2.5, 6.5, Z + 6, 0, TOP)
// the steps: four of 0.3 m up the wall's front, 0.35 m deep
for (let i = 0; i < 4; i++) block("flags", "riser", -1, Z - 2.5 - 0.35 * (i + 1), 1, Z - 2.5 - 0.35 * i, 0, TOP - 0.3 * (i + 1))
block("flags", "flags", -0.9, Z - 2.5, 0.9, Z + 5.2, TOP, TOP + 0.02)   // the path
// the grass reaching over its margins (8 texels of the floor each)
const EDGE = 8 * CAM.floor[0], PU = TOP + 0.025
M.face("edge", [-0.9, Z + 5.2, PU], [-0.9 + EDGE, Z + 5.2, PU], [-0.9 + EDGE, Z - 2.5, PU], [-0.9, Z - 2.5, PU])
M.face("edge_r", [0.9 - EDGE, Z + 5.2, PU], [0.9, Z + 5.2, PU], [0.9, Z - 2.5, PU], [0.9 - EDGE, Z - 2.5, PU])
// The fence round the top, open at the steps, as boxes, so it stands on the ground with depth and throws
// its shadow from its foot: pickets 9 cm wide every 25 cm (their tops and the sides toward the sun lit),
// one in seven missing or shorter; a post every 2 m, a head taller; two rails behind the pickets.
// `inside`: which way the hill's top is from the run (the rails go that side).
const fenceRun = ([ax, az], [bx, bz], inside, seed) => {
  const len = Math.hypot(bx - ax, bz - az), dx = (bx - ax) / len, dz = (bz - az) / len, nx = -dz * inside, nz = dx * inside
  const box = (s, along, across, u0, u1, off = 0) => {
    const x = ax + dx * s + nx * off, z = az + dz * s + nz * off, hx = (Math.abs(dx) * along + Math.abs(nx) * across) / 2, hz = (Math.abs(dz) * along + Math.abs(nz) * across) / 2
    M.box("wood", [x - hx, z - hz, u0], [x + hx, z + hz, u1])
  }
  for (const u of [0.2, 0.5]) box(len / 2, len, 0.04, TOP + u, TOP + u + 0.06, 0.05)
  for (let s = 0.12, i = 0; s < len - 0.05; s += 0.25, i++) {
    const k = Math.floor(hash(i, seed) * 7)
    if (k) box(s, 0.09, 0.05, TOP, TOP + (k === 1 ? 0.5 : 0.7))
  }
  for (let s = 0; s <= len + 0.01; s += Math.min(2, len)) box(s, 0.13, 0.13, TOP, TOP + 0.85)
}
fenceRun([-6.2, Z + 5.7], [6.2, Z + 5.7], -1, 1); fenceRun([-6.2, Z - 2.2], [-6.2, Z + 5.7], -1, 2); fenceRun([6.2, Z - 2.2], [6.2, Z + 5.7], 1, 3)
fenceRun([-6.2, Z - 2.2], [-1.3, Z - 2.2], 1, 4); fenceRun([1.3, Z - 2.2], [6.2, Z - 2.2], 1, 5)
// hills behind, far enough for the mist to take them
for (const [x0, x1, z0, h] of [[-40, -8, 30, 7], [-12, 14, 36, 9], [10, 40, 28, 6]]) block("turf", "turf", x0, Z + z0, x1, Z + z0 + 8, 0, h)

// The wood, the tree, and what grows on the hill: placed once, seeded. The detail goes on the hill's
// top; the wood round it is quieter, and the far trees are hazed.
const R = rng(13), things = [{ name: "_deadtree", at: [-4.6, Z + 4.9, TOP] }]
const tufts = (x, z, u, n) => { for (let k = 0; k < n; k++) things.push({ name: ["_tuft_a", "_tuft_b", "_tuft_c"][Math.floor(R() * 3)], at: [x + (R() - 0.5) * 0.7, z - R() * 0.15, u], shadow: 0 }) }
// the headstones either side of the path, tufts at their feet, flowers by some
for (const [x, dz, name, flowers] of [[-3.4, 3.2, "_grave_arch", "_flowers_w"], [-2, 4.6, "_grave_cross", ""], [-4.4, 0.8, "_grave_old", ""], [2.6, 3.8, "_grave_arch", "_flowers_p"], [3.9, 1.6, "_grave_slab", ""], [2.1, 0.4, "_grave_old", "_flowers_w"]]) {
  things.push({ name, at: [x, Z + dz, TOP] })
  tufts(x, Z + dz - 0.04, TOP, 2 + Math.floor(R() * 2))
  if (flowers) things.push({ name: flowers, at: [x + 0.45, Z + dz - 0.25, TOP], shadow: 0 })
}
for (let k = 0; k < 170; k++) {
  const x = -16 + R() * 32, z = Z - 9 + R() * 34, h = R()
  if (Math.abs(x) < 7.5 && z > Z - 4.5 && z < Z + 7.5) continue   // not on the hill or at its foot
  things.push({ name: z > Z + 13 ? "_pine_far" : h < 0.3 ? "_pine_s" : h < 0.65 ? "_pine_m" : "_pine", at: [x, z] })
}
for (const [x, z] of [[-1.6, 1], [1.7, 2.6], [-5.6, 3.5], [5.3, 0.2], [-0.9, 5.4]]) things.push({ name: R() < 0.5 ? "_rock" : "_rock_small", at: [x, Z + z, TOP], shadow: 0 })
for (const x of [-5.8, -3.6, -1.6, 2, 4.4, 5.9]) tufts(x, Z - 2.25, TOP, 2)                 // along the fence
// bushes in twos and threes at the wall's foot, tufts between
for (const [x0, n] of [[-6.1, 3], [-3.2, 2], [2.4, 2], [4.9, 3]]) {
  for (let k = 0; k < n; k++) things.push({ name: ["_bush", "_bush_b", "_bush_c"][Math.floor(R() * 3)], at: [x0 + k * 0.62 + R() * 0.2, Z - 2.7 - R() * 0.15] })
  tufts(x0 + n * 0.62 + 0.2, Z - 2.75, 0, 2)
}

// The scene's clock: 64 frames of 110 ms, the walk's own. The traveler walks up the path and back
// down it, his feet planted: he goes on as far as his steps cover (two of 6.4 px a cycle of 8 frames,
// at 24 px to the meter: 0.067 m a frame), no faster, or they slide; the mourner stands at a grave,
// her back to us, breathing (a frame of hers every 250 ms).
const STEP = (4 * 3.2) / 24 / 8
const walker = (f) => {
  const down = f >= 32, z = Z - 1.6 + STEP * (down ? 64 - f : f)
  return { name: down ? "tr_walk_s" : "tr_walk_n", at: [0.2, z, TOP + 0.02], frame: f % 8 }
}
const people = (f) => [...things, walker(f), { name: "mo_idle_nw", at: [-2.75, Z + 2.45, TOP], frame: Math.floor((f * 110) / 250) % 4 }]
const CLOCK = { frames: 64, fps: 1000 / 110 }
// Morning: the sun behind on the left (the shadows fall toward us and to the right), warm; the sky's
// light violet in the shade.
const LIGHT = { light: [-0.55, 0.6, 0.72], sun: { color: "#ffe2b4", strength: 1.3 }, sky: { color: "#a4a6d8", strength: 0.45 } }
scene("graveyard", { w: W, h: H, bg: "q", ...CLOCK }, (c) => c.mesh(view(1), M.faces, MATS, { sprites: people(c.frame), ...LIGHT }))

// Four times the size (1920x1080) and through the camera: the hill's top sharp, the wood below and
// the hills behind blurred and taken by a warm mist, a bloom, darker corners.
scene("graveyard_hd", { w: W * 4, h: H * 4, bg: "q", ...CLOCK, check: false },
  (c) => c.mesh(view(4), M.faces, MATS, { sprites: people(c.frame), pixel: 4, ...LIGHT }),
  post({ blur: 36, focus: [W * 2, H * 2.2], sharp: 2.5, soft: [3, 8], fog: { color: "#dcdccc", from: DIST + 2, to: DIST + 26, max: 0.7 }, bloom: { strength: 0.6, r: 40 }, vignette: 0.35 }))
