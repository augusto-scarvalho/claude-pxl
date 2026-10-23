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
include("../fonts/font5x7.px.js")


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


// Grass spilling over an edge: a few blades standing up, lit at their tips, the clump hanging a row or
// two over the edge in the shade, the blue dark at its lowest blades. Small, three shapes.
sprite("_lip_a", { pivot: "bottom" }, `
  ..e.r..e..
  .ewewwewe.
  ewwqwwqwwe
  qwqQqqwqqw
  .q.Qq.qQ..
  ...Q...q..`)
sprite("_lip_b", { pivot: "bottom" }, `
  .e..r...
  ewwewe..
  wqwwqwe.
  qQqqQqq.
  .Q.q..Q.`)
sprite("_lip_c", { pivot: "bottom" }, `
  ...e..e..r..
  .eewwewweww.
  ewqwwqwwqwwe
  qwqqQqqwqqQq
  .Qq..Qq..q..
  ..Q...Q.....`)
// Boulders for the hill's corners, drawn as the kit's rocks are (environment §5), only bigger: two or
// three masses on one flat foot, a tone to each plane: the top in the sun (cream only as a 1 px rim at
// its back), the side toward the sun mauve, the front toward us in the shade, the far side darker; a
// ledge (a light band over a dark undercut) and a crack; the darkest tone only as the line under it and
// down its shaded side; grass blades over its foot, so it sits in the ground.
const boulder = (name, w, h, lobes) => sprite(name, { w, h, pivot: "bottom" }, (c) => {
  // a lobe: a dome over its middle row, widening a little from there to the foot
  const lobeAt = (X, Y) => lobes.findLast(([x, y, rx, ry]) => { const d = Math.max(0, Y + 0.5 - y) / ry, nx = (X + 0.5 - x) / (rx * (1 + 0.2 * d)), ny = Math.min(0, (Y + 0.5 - y) / ry); return nx * nx + ny * ny <= 1 })
  const [bx, by, brx, bry] = lobes[0]
  for (let Y = 0; Y < h; Y++) for (let X = 0; X < w; X++) {
    const l = lobeAt(X, Y)
    if (!l) continue
    const [x, y, rx, ry] = l, nx = (X + 0.5 - x) / rx, ny = (Y + 0.5 - y) / ry
    const rim = !lobeAt(X, Y - 1), right = !lobeAt(X + 1, Y)
    let k = ny < -0.62 - 0.25 * nx ? (rim && nx < 0.2 ? "E" : "U") : nx < -0.5 ? "u" : nx > 0.5 ? "t" : "T"
    if (l === lobes[0] && Y === Math.round(by + bry * 0.3) && nx > -0.75 && nx < 0) k = "D"              // the ledge's undercut
    if (l === lobes[0] && Y === Math.round(by + bry * 0.3) - 1 && nx > -0.75 && nx < 0) k = "U"          // its lit band
    if (Y === h - 1 || (right && ny > -0.35)) k = "D"                                                     // under it, its shaded edge
    c.px(X, Y, k)
  }
  // a crack down the front of the biggest mass
  for (let i = 0; i < 3; i++) c.px(Math.round(bx + 2 + i * 0.6), Math.round(by + 1 + i), "t")
  // grass over its foot, in tufts of two
  for (let X = 1; X < w - 2; X++) if (hash(X, w * 7 + h) < 0.22 && lobeAt(X, h - 2)) { c.px(X, h - 1, "w"); c.px(X + 1, h - 1, "e"); c.px(X, h - 2, "e") }
}, bump("hybrid"))
boulder("_boulder", 28, 16, [[11, 8, 9, 7], [19, 10, 7.5, 5.5], [8, 12, 6, 3]])
boulder("_boulder_b", 21, 12, [[9, 6, 7, 5.5], [14.5, 8, 5.5, 4]])

// The rose he lays at the old grave: lying on the grass, its stem toward us, a red bloom of three tones
// lit from above, two leaves.
sprite("_rose", { w: 8, h: 4, pivot: "bottom" }, (c) => {
  for (const [x, y, k] of [[5, 0, "#ff8c96"], [6, 0, "#e8455a"], [4, 1, "#e8455a"], [5, 1, "#ff8c96"], [6, 1, "#c42a44"], [7, 1, "#c42a44"], [5, 2, "#c42a44"], [6, 2, "#8a1a32"],
    [0, 3, "#577f3c"], [1, 3, "#577f3c"], [2, 2, "#577f3c"], [3, 2, "#3d6b42"], [4, 2, "#3d6b42"], [2, 3, "#6c9243"], [3, 1, "#6c9243"]]) c.px(x, y, k)
})
// A small dead leaf tumbling in the wind: face on, turning, edge on, turned the other way; brown, or
// yellow.
anim("_leaf", { w: 3, h: 3, frames: 4, fps: 1000 / 110, pivot: "bottom" },
  frame({}, ".dd\nsd.\n..."), frame({}, "..d\n.d.\ns.."), frame({}, "...\nsdd\n..."), frame({}, ".d.\n.d.\n.s."))
anim("_leaf_y", { base: "_leaf", swap: { d: "O", s: "f" } })

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
  rampart: { tex: "_rampart", texel: [CAM.wall[0], 1.5 / 29] }, riser: { tex: "_riser", anchor: "face", texel: CAM.wall },
  // the fence's weathered wood in the trunks' browns, a tone to each face by its light (in the HD picture
  // in blocks of the sprites' pixel, its outline on the shaded side: pixel art as they are), the grain
  // in dashes a step darker
  wood: { ramp: "basdf", edge: "b", bias: 0.08, texture: (x, y) => (hash(x, y >> 2) < 0.18 ? -1 : 0) }, rail: { ramp: "basdf", edge: "b", bias: 0.08, texture: (x, y) => (hash(x >> 2, y) < 0.2 ? -1 : 0) },
  edge: { tex: "_edge", anchor: "face", texel: CAM.floor }, edge_r: { tex: "_edge_r", anchor: "face", texel: CAM.floor },
}
const TOP = 1.5                                                     // the hill's top
M.face("turf", [-40, Z - 25, 0], [40, Z - 25, 0], [40, Z + 60, 0], [-40, Z + 60, 0])
// The hill: not a box. Its outline a rectangle with rounded corners (1.6 m), its edges wandering a few
// cm in and out (smooth noise along them), the front straight where the steps meet it; its top one
// floor of grass (a fan of triangles from its middle), its wall a face for each piece of the outline,
// so each turn takes the light its own way.
const OUTLINE = (() => {
  const x0 = -6.5, x1 = 6.5, z0 = Z - 2.5, z1 = Z + 6, r = 1.6, pts = []
  const corners = [[x1 - r, z0 + r, -Math.PI / 2], [x1 - r, z1 - r, 0], [x0 + r, z1 - r, Math.PI / 2], [x0 + r, z0 + r, Math.PI]]
  const sides = [[[x0 + r, z0], [x1 - r, z0]], [[x1, z0 + r], [x1, z1 - r]], [[x1 - r, z1], [x0 + r, z1]], [[x0, z1 - r], [x0, z0 + r]]]
  sides.forEach(([a, b], k) => {
    const n = Math.max(2, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.45))
    for (let i = 0; i < n; i++) pts.push([a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n])
    const [cx, cz, a0] = corners[k]
    for (let i = 0; i < 6; i++) { const t = a0 + (i * Math.PI) / 12; pts.push([cx + r * Math.cos(t), cz + r * Math.sin(t)]) }
  })
  const mid = [0, (z0 + z1) / 2]
  return pts.map(([x, z], i) => {
    if (z === z0 && Math.abs(x) < 1.4) return [x, z]                     // where the steps meet it
    const d = 0.1 * (vnoise(i * 0.7, 3) - 0.5) * 2, out = [x - mid[0], z - mid[1]], l = Math.hypot(...out)
    return [x + (out[0] / l) * d, z + (out[1] / l) * d]
  })
})()
OUTLINE.forEach((a, i) => {
  const b = OUTLINE[(i + 1) % OUTLINE.length]
  M.face("grass", [0, Z + 1.75, TOP], [a[0], a[1], TOP], [b[0], b[1], TOP])
  M.face("rampart", [a[0], a[1], TOP], [b[0], b[1], TOP], [b[0], b[1], 0], [a[0], a[1], 0])
})
// the steps: four of 0.3 m up the wall's front, 0.35 m deep
for (let i = 0; i < 4; i++) block("flags", "riser", -1, Z - 2.5 - 0.35 * (i + 1), 1, Z - 2.5 - 0.35 * i, 0, TOP - 0.3 * (i + 1))
block("flags", "flags", -0.9, Z - 2.5, 0.9, Z + 5.2, TOP, TOP + 0.02)   // the path
// the grass reaching over its margins (8 texels of the floor each)
const EDGE = 8 * CAM.floor[0], PU = TOP + 0.025
M.face("edge", [-0.9, Z + 5.2, PU], [-0.9 + EDGE, Z + 5.2, PU], [-0.9 + EDGE, Z - 2.5, PU], [-0.9, Z - 2.5, PU])
M.face("edge_r", [0.9 - EDGE, Z + 5.2, PU], [0.9, Z + 5.2, PU], [0.9, Z - 2.5, PU], [0.9 - EDGE, Z - 2.5, PU])
// The fence round the top, open at the steps, following the hill's rounded outline 0.3 m in (straight
// runs between the points of its arcs), built of boxes of weathered boards turned along each run, so
// it stands on the ground with depth and throws its shadow from its foot: pickets 11 cm wide every
// 25 cm, each with a pointed head, one in seven missing or shorter; a post at each end of a straight
// run and halfway along a long one, a head taller and thicker, a flat cap a little wider than it; two rails of boards behind the
// pickets (on the hill's side).
const FENCE = (() => {
  const x0 = -6.2, x1 = 6.2, z0 = Z - 2.2, z1 = Z + 5.7, r = 1.3, pts = [[1.3, z0]]
  const arc = (cx, cz, a0) => { for (let i = 0; i <= 4; i++) { const t = a0 + (i * Math.PI) / 8; pts.push([cx + r * Math.cos(t), cz + r * Math.sin(t)]) } }
  arc(x1 - r, z0 + r, -Math.PI / 2); arc(x1 - r, z1 - r, 0); arc(x0 + r, z1 - r, Math.PI / 2); arc(x0 + r, z0 + r, Math.PI)
  pts.push([-1.3, z0])
  return pts
})()
// a box of `mat` centred on (x, z), `along` the way (dx, dz) and `across` it, from u0 up to u1
const turnedBox = (mat, [x, z], [dx, dz], along, across, u0, u1) => {
  const c = (a, b, u) => [x + dx * a - dz * b, z + dz * a + dx * b, u], A = along / 2, B = across / 2
  const q = [c(-A, -B, u0), c(A, -B, u0), c(A, B, u0), c(-A, B, u0)], t = q.map(([px, pz]) => [px, pz, u1])
  M.face(mat, ...t)
  for (let i = 0; i < 4; i++) M.face(mat, q[i], q[(i + 1) % 4], t[(i + 1) % 4], t[i])
}
let picket = 0
FENCE.forEach((a, k) => {
  const b = FENCE[k + 1]
  if (!b) return
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]), d = [(b[0] - a[0]) / len, (b[1] - a[1]) / len], at = (s, off = 0) => [a[0] + d[0] * s - d[1] * off, a[1] + d[1] * s + d[0] * off]
  for (const u of [0.22, 0.52]) turnedBox("rail", at(len / 2, 0.06), d, len + 0.06, 0.05, TOP + u, TOP + u + 2 / 24)
  for (let s = 0.12; s < len - 0.06; s += 0.25) {
    const kk = Math.floor(hash(picket++, 7) * 7), top = TOP + (kk === 1 ? 0.48 : 0.62)
    if (!kk) continue
    turnedBox("wood", at(s), d, 3 / 24, 1 / 24, TOP, top)
    // its head: a wedge rising to a point over its middle, its slopes catching the light from above
    const P = (sa, sb, u) => { const [x, z] = at(s + sa, sb); return [x, z, u] }
    const L = P(-1.5 / 24, -0.5 / 24, top), Rr = P(1.5 / 24, -0.5 / 24, top), L2 = P(-1.5 / 24, 0.5 / 24, top), R2 = P(1.5 / 24, 0.5 / 24, top), T = P(0, -0.5 / 24, top + 2 / 24), T2 = P(0, 0.5 / 24, top + 2 / 24)
    M.face("wood", L, Rr, T); M.face("wood", L2, R2, T2); M.face("wood", L, T, T2, L2); M.face("wood", Rr, T, T2, R2)
  }
  // posts on the straight runs only, at their ends and halfway along the long ones (the arcs' short
  // runs between have none, or the corners bristle)
  const posts = len < 1 ? [] : len > 2.4 ? [0, len / 2, len] : [0, len]
  for (const s of posts) { turnedBox("wood", at(s), d, 4 / 24, 4 / 24, TOP, TOP + 0.85); turnedBox("rail", at(s), d, 6 / 24, 6 / 24, TOP + 0.85, TOP + 0.85 + 1 / 24) }
})
// hills behind, far enough for the mist to take them
for (const [x0, x1, z0, h] of [[-40, -8, 30, 7], [-12, 14, 36, 9], [10, 40, 28, 6]]) block("turf", "turf", x0, Z + z0, x1, Z + z0 + 8, 0, h)

// The wood, the tree, and what grows on the hill: placed once, seeded. The detail goes on the hill's
// top; the wood round it is quieter, and the far trees are hazed.
const R = rng(13), things = [{ name: "_snag", at: [-4.6, Z + 4.9, TOP] }]
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
  things.push({ name: z > Z + 13 ? "_spruce_far" : h < 0.3 ? "_spruce_s" : h < 0.65 ? "_spruce_m" : "_spruce", at: [x, z] })
}
for (const [x, z] of [[-1.6, 1], [1.7, 2.6], [-5.6, 3.5], [5.3, 0.2], [-0.9, 5.4]]) things.push({ name: R() < 0.5 ? "_rock" : "_rock_small", at: [x, Z + z, TOP], shadow: 0 })
for (const x of [-5.8, -3.6, -1.6, 2, 4.4, 5.9]) tufts(x, Z - 2.25, TOP, 2)                 // along the fence
// grass spilling over the wall's top along its front and sides (the hill's edge isn't a line), small
// clumps at uneven gaps, a little out from it; mossy boulders at its corners, breaking them
OUTLINE.forEach(([x, z], i) => {
  if (z > Z + 5.5 || (z < Z - 2.4 && Math.abs(x) < 1.4) || hash(i, 31) < 0.4) return
  const out = [x, z - (Z + 1.75)], l = Math.hypot(...out)
  things.push({ name: ["_lip_a", "_lip_b", "_lip_c"][Math.floor(hash(i, 32) * 3)], at: [x + (out[0] / l) * 0.05, z + (out[1] / l) * 0.05, TOP - 0.07], shadow: 0 })
})
// the boulders: in front of the wall where it turns at the front corners, at its foot; on top inside
// the fence's back corners (the hill's corners are round: past them is the air)
for (const [cx, cz, dx, dz, r, u, name] of [[-4.9, -0.9, -1, -1, 1.95, 0, "_boulder"], [4.9, -0.9, 1, -1, 1.9, 0, "_boulder_b"],
  [-4.9, 4.4, -1, 1, 0.55, TOP, "_boulder_b"], [4.9, 4.4, 1, 1, 0.55, TOP, "_boulder_b"]])
  things.push({ name, at: [cx + dx * r * Math.SQRT1_2, Z + cz + dz * r * Math.SQRT1_2, u] })
// bushes in twos and threes at the wall's foot, tufts between
for (const [x0, n] of [[-6.1, 3], [-3.2, 2], [2.4, 2], [4.9, 3]]) {
  for (let k = 0; k < n; k++) things.push({ name: ["_bush", "_bush_b", "_bush_c"][Math.floor(R() * 3)], at: [x0 + k * 0.62 + R() * 0.2, Z - 2.7 - R() * 0.15] })
  tufts(x0 + n * 0.62 + 0.2, Z - 2.75, 0, 2)
}

// The traveler's visit, on the scene's clock (80 ms a frame): he comes in from the near left through a
// gap in the wood, climbs the steps, kneels by the old grave and lays a rose at its foot, crosses to the
// mourner and asks if she's all right; she turns to him and answers; he goes back down and away. Each leg walked
// in one of the 8 directions, so every one of them shows, at the walk's own pace (two steps of 6.4 px a
// cycle of 8 frames, 24 px to the meter: 0.067 m a frame), no faster, or the feet slide; his feet on
// the ground, each step, the path. He starts just out of the picture, in view within a second; the
// wait that makes the loop a whole number of the pines' sways (44 frames) comes after he has gone.
const PACE = (4 * 3.2) / 24 / 8, MS = 80
const feetAt = (x, z) => {                         // how high the ground is under (x, z): the hill, its steps, the wood
  const dz = Z - 2.5 - z
  if (dz <= 0) return TOP + (Math.abs(x) < 0.9 ? 0.02 : 0)
  if (dz < 1.4 && Math.abs(x) < 1) return TOP - 0.3 * (Math.floor(dz / 0.35) + 1)
  return 0
}
const LEGS = [
  ["ne", [-2.6, -7.8], [-0.2, -5.4]],              // in from the near left, from just out of the picture
  ["n", [-0.2, -5.4], [-0.2, 0.4]],                // up the steps and the path
  ["e", [-0.2, 0.4], [1.2, 0.4]],                  // to the old grave with flowers, beside it
  ["e", 40, "grave"],                              // kneels and lays a flower at its foot (in front, he'd hide it)
  ["nw", [1.2, 0.4], [-0.2, 1.8]],
  ["w", [-0.2, 1.8], [-1.95, 1.8]],                // to the mourner's side
  ["w", 76, "talk"],
  ["se", [-1.95, 1.8], [-0.2, 0.05]],
  ["s", [-0.2, 0.05], [-0.2, -5.4]],               // back down
  ["sw", [-0.2, -5.4], [-2.6, -7.8]],              // and away
].map(([dir, a, b]) => (Array.isArray(a) ? { dir, a, b, n: Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / PACE) } : { dir, n: a, what: b }))
const BUSY = LEGS.reduce((n, l) => n + l.n, 0), FRAMES = Math.ceil(BUSY / 44) * 44
const TALK = LEGS.slice(0, 6).reduce((n, l) => n + l.n, 0)              // the frame he stops by her
const GRAVE = LEGS.slice(0, 3).reduce((n, l) => n + l.n, 0)             // the frame he stops by the grave
// the gap in the wood he comes and goes by: no pine within a meter of his way
const nearWay = ([x, z]) => LEGS.some(({ a, b }) => {
  if (!a) return false
  const [ax, az] = [a[0], Z + a[1]], [bx, bz] = [b[0], Z + b[1]], dx = bx - ax, dz = bz - az
  const k = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)))
  return Math.hypot(x - ax - dx * k, z - az - dz * k) < 1
})
const wood = things.filter((t) => !(t.name.startsWith("_spruce") && nearWay(t.at)))
// where he is and what he does at frame f; the mourner's turn to him and back
const traveler = (f) => {
  let t = f, at = LEGS[0].a
  for (const L of LEGS) {
    if (L.a && t < L.n) {
      const k = t / L.n, x = L.a[0] + (L.b[0] - L.a[0]) * k, z = Z + L.a[1] + (L.b[1] - L.a[1]) * k
      return { name: `tr_walk_${L.dir}`, at: [x, z, feetAt(x, z)], frame: f % 8 }
    }
    // at the grave: down (a frame of the kneel every 2 of the scene's), the flower laid, held, up again
    const kneel = L.what === "grave" && t < 30 ? (t < 8 ? t >> 1 : t < 22 ? 3 : 4 + Math.min(2, (t - 22) >> 1)) : -1
    if (!L.a && t < L.n) return { name: kneel >= 0 ? `tr_kneel_${L.dir}` : `tr_idle_${L.dir}`, at: [at[0], Z + at[1], feetAt(at[0], Z + at[1])], frame: kneel >= 0 ? kneel : Math.floor((f * MS) / 250) % 4 }
    if (L.a) at = L.b
    t -= L.n
  }
  return null
}
const TURN = ["nw", "n", "ne", "e"]
const mourner = (f) => {
  const t = f - TALK, k = t < 12 ? 0 : t < 76 ? Math.min(3, Math.floor((t - 12) / 2) + 1) : Math.max(0, 3 - Math.floor((t - 80) / 2) - 1)
  return { name: `mo_idle_${TURN[t < 76 || t >= 80 ? k : 3]}`, at: [-2.75, Z + 2.45, TOP], frame: Math.floor((f * MS) / 250) % 4 }
}
const SAYS = [
  [4, 32, "Alden", ["Are you all right?"], () => [-1.95, Z + 1.8, TOP], 1],
  [36, 74, "Edith", ["I will be.", "Thank you for asking."], () => [-2.75, Z + 2.45, TOP], -1],
]
// A dialogue box as HD-2D games draw theirs (Triangle Strategy above all): parchment, its corners cut;
// a warm beige with faint fibers running across it, darker toward its edges as old paper is, a light
// line just inside its thin brown outline; the speaker's name at its top over a rule that starts at a
// small diamond and fades out; the words below in the 5x7 letters, a dark sepia; a short tail from its
// lower edge down to the speaker's head; a blue-grey mark at its lower right corner that more is
// coming. Over the speaker and off to one side (side: 1 right, -1 left), in pixels finer than the
// art's (3 of the picture's to the art's 4), as a game's interface is.
const bubble = (c, K, v, [x, z, u], name, lines, side, t) => {
  const U = Math.max(1, Math.round(K * 0.75)), pad = 7, lineH = 10, ch = 5
  const tw = Math.max(name.length * 6 + 16, ...lines.map((l) => l.length * 6)), w = tw + 2 * pad + 8, h = pad + 7 + 6 + lines.length * lineH + pad - 2
  const [hx, hy] = v.ground(x, z, u + 1.5), tail = 9
  const X0 = Math.round(hx - (side > 0 ? 0.22 : 0.78) * w * U), Y0 = Math.round(hy - (h + tail) * U) - 2 * U
  const sx = Math.max(ch + 5, Math.min(w - ch - 6, Math.round((hx - X0) / U))), tip = Math.round((hx - X0) / U)
  const cells = new Set(), key = (i, j) => i + "," + j, has = (i, j) => cells.has(key(i, j))
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++)
    if (i + j >= ch && w - 1 - i + j >= ch && i + h - 1 - j >= ch && w - 1 - i + h - 1 - j >= ch) cells.add(key(i, j))
  for (let r = 0; r <= tail; r++) { const k = r / tail, cx = sx + (tip - sx) * k, half = 4 * (1 - k); for (let i = Math.round(cx - half); i <= Math.round(cx + half); i++) cells.add(key(i, h - 1 + r)) }
  const R = (i, j, ww, hh, col) => c.rect(X0 + i * U, Y0 + j * U, ww * U, hh * U, col)
  for (const cell of cells) {
    const [i, j] = cell.split(",").map(Number)
    let d = 1                                                                      // how far in from its edge
    while (d < 5 && [[d, 0], [-d, 0], [0, d], [0, -d]].every(([dx, dy]) => has(i + dx, j + dy))) d++
    const fiber = hash(i >> 3, j) < 0.12 || hash(i >> 1, j * 7) < 0.06
    R(i, j, 1, 1, d === 1 ? "#6e5a43" : d === 2 ? "#f4ecda" : d <= 4 ? (fiber ? "#d8c6a2" : "#dfcfae") : fiber ? "#e3d5b8" : "#ebdfc4")
  }
  c.text(X0 + (pad + 4) * U, Y0 + pad * U, name, "#4a3a2c", { font: "5x7", scale: U })
  // the rule under the name: a diamond, then a line fading out
  R(pad, pad + 9, 1, 1, "#8c7457"); R(pad + 1, pad + 8, 1, 3, "#8c7457"); R(pad + 2, pad + 9, 1, 1, "#8c7457")
  const rule = Math.round(tw * 0.62)
  R(pad + 3, pad + 9, Math.round(rule * 0.6), 1, "#8c7457"); R(pad + 3 + Math.round(rule * 0.6), pad + 9, Math.round(rule * 0.4), 1, "#b9a483")
  lines.forEach((l, k) => c.text(X0 + (pad + 6) * U, Y0 + (pad + 14 + k * lineH) * U, l, "#3a2f27", { font: "5x7", scale: U }))
  // more is coming, waiting for a button: a small triangle pointing down over a short rule, bobbing a
  // pixel down and back and blinking off, as a game's prompt does (t: frames since the box opened)
  const mx = w - pad - 10, ph = t % 10, my = h - pad - 5 + (ph >= 4 && ph < 8 ? 1 : 0)
  if (ph < 8) {
    R(mx, my, 7, 1, "#4f6382"); R(mx + 1, my + 1, 1, 1, "#4f6382"); R(mx + 5, my + 1, 1, 1, "#4f6382"); R(mx + 2, my + 2, 1, 1, "#4f6382"); R(mx + 4, my + 2, 1, 1, "#4f6382"); R(mx + 3, my + 3, 1, 1, "#4f6382")
    R(mx + 2, my + 1, 3, 1, "#9db0cc"); R(mx + 3, my + 2, 1, 1, "#9db0cc")
  }
  R(mx, h - pad, 7, 1, "#4f6382")
}
const talk = (c, K) => {
  const t = c.frame - TALK, v = perspective(view(K))
  for (const [t0, t1, name, lines, who, side] of SAYS) if (t >= t0 && t < t1) bubble(c, K, v, who(), name, lines, side, t - t0)
}
// The wind from the left: the pines and the dead tree sway with it (16 frames of 220 ms, a whole number
// of sways a loop), the gust reaching the ones on the left first; and it brings small dead leaves in
// from the left and carries them off to the right, tumbling, rising and falling, each crossing six
// times a loop (5 m/s) at its own height over the hill and the fence and its own depth, its shadow
// running on the ground below.
const sway = (t, f) => (t.name.startsWith("_spruce") || t.name === "_snag" ? { ...t, frame: (((Math.floor((f * MS) / 220) - Math.round(t.at[0] * 0.6)) % 16) + 16) % 16 } : t)
const LEAVES = Array.from({ length: 14 }, (_, i) => ({ x0: hash(i, 41) * 36, z: Z - 7 + hash(i, 42) * 17, u: TOP + 0.5 + hash(i, 43) * 2.2, ph: hash(i, 44) * 6.28, name: hash(i, 45) < 0.55 ? "_leaf" : "_leaf_y" }))
const leaves = (f) => LEAVES.map((l, i) => {
  const s = f / FRAMES, w = 2 * Math.PI * s
  return { name: l.name, at: [-18 + ((l.x0 + 36 * 6 * s) % 36), l.z + 0.4 * Math.sin(8 * w + l.ph), l.u + 0.45 * Math.sin(12 * w + l.ph)], frame: (f + i) % 4, shadow: 0 }
})
const laid = (f) => (f >= GRAVE + 8 ? [{ name: "_rose", at: [1.55, Z + 0.3, TOP], shadow: 0 }] : [])
const people = (f) => [...wood.map((t) => sway(t, f)), ...leaves(f), ...laid(f), mourner(f), ...[traveler(f)].filter(Boolean)]
const CLOCK = { frames: FRAMES, fps: 1000 / MS }
// Morning: the sun behind on the left (the shadows fall toward us and to the right), warm; the sky's
// light violet in the shade.
const LIGHT = { light: [-0.55, 0.6, 0.72], sun: { color: "#ffe2b4", strength: 1.3 }, sky: { color: "#a4a6d8", strength: 0.45 } }
// checked one frame in 24: no scene rule runs on it (no world.light, nothing with a height or a front
// marker), so the frames checked only prove they build; the tests stay fast
scene("graveyard", { w: W, h: H, bg: "q", ...CLOCK, check: { every: 24 } }, (c) => c.mesh(view(1), M.faces, MATS, { sprites: people(c.frame), ...LIGHT }), (c) => talk(c, 1))

// K times the size and through the camera: the hill's top sharp, the wood below and the hills behind
// blurred and taken by a warm mist, a bloom, darker corners; the fence in blocks of a sprite's pixel.
// `graveyard_hd` four times (1920x1080); `graveyard_md` twice (960x540: the gallery's GIF, its 46 s a
// quarter of the pixels to draw and to store).
const camera = (name, K) => scene(name, { w: W * K, h: H * K, bg: "q", ...CLOCK, check: false },
  (c) => c.mesh(view(K), M.faces, { ...MATS, wood: { ...MATS.wood, block: K }, rail: { ...MATS.rail, block: K } }, { sprites: people(c.frame), pixel: K, ...LIGHT }),
  post({ blur: 9 * K, focus: [(W * K) / 2, H * K * 0.55], sharp: 2.5, soft: [3, 8], fog: { color: "#dcdccc", from: DIST + 2, to: DIST + 26, max: 0.7 }, bloom: { strength: 0.6, r: 10 * K }, vignette: 0.35 }),
  (c) => talk(c, K))
camera("graveyard_hd", 4)
camera("graveyard_md", 2)
