// HD-2D: a graveyard on a hill in a pine wood, morning mist, as Octopath Traveler lays out its
// dioramas: a plateau of grass held up by a mossy stone wall, stone steps up its front, a flagstone
// path to the back, gravestones either side of it, a picket fence round the top, a dead tree, the
// wood all round and hills fading into the mist. Built in meters with mesh() (blocks of the kit,
// textures anchored on their faces where a face carries one drawing: a gravestone's front, a
// fence's pickets, whose clear pixels are holes the sun shines through), the people and the trees
// as sprites standing in it, a low sun behind on the left. `graveyard` is the art at its own size,
// the one checked; `graveyard_hd` the same four times as big through post().
include("../topdown_hero/hero.px.js")
include("kit.px.js", { palette: true })

pal({ D: "#2c2c40", t: "#4a4c60", T: "#6b6c7c", u: "#8e8c90", U: "#bdb39c", E: "#e6dcbd" })   // stone: blue-violet in the shade
ramps("DtTuUE")                                                                               // to cream in the sun
shades("mMnN", "#6f8a3a")   // moss
shades("bBiI", "#6b5a4c")   // dead wood
pal({ p: "#e7a3c2", o: "#f1ece0", O: "#e8cf6c", 9: "#7a6048", 0: "#55432f" })   // flowers; earth

// The rampart's face: courses of their own heights, blocks of their own widths (each course's 16 in
// all, so it tiles), each block lit along its top, its joint dark below and to the right, a block in
// three a shade off; the grass of the top hanging over it in clumps, some drips longer.
sprite("_rampart", { w: 16, h: 32 }, (c) => {
  const H = [4, 5, 4, 6, 4, 5, 4], W = [[6, 5, 5], [4, 7, 5], [5, 6, 5], [7, 4, 5], [5, 5, 6], [6, 6, 4], [4, 6, 6]]
  let y = 0
  H.forEach((h, row) => {
    let x = (row * 3) % 16
    W[row].forEach((w, b) => {
      const tone = Math.floor(hash(row, b) * 3) ? "7" : "6"
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++)
        c.px((x + i) % 16, y + j, j === h - 1 || i === w - 1 ? "5" : j === 0 ? "8" : i === w - 2 && j === h - 2 ? "6" : tone)
      x += w
    })
    y += h
  })
  for (let X = 0; X < 16; X++) {
    const len = 2 + Math.round(1.5 + 1.5 * Math.sin((Math.PI * 2 * X) / 16 * 2 + 1)) + (Math.floor(hash(X, 3) * 5) === 0 ? 3 : 0)
    for (let Y = 0; Y < len; Y++) c.px(X, Y, Y === len - 1 ? "m" : Y === 0 ? "N" : (X + Y) % 3 ? "n" : "M")
  }
})
// Flagstones: irregular slabs, each the texels nearest one of six points (measured round the tile,
// so it tiles), moss where two slabs meet; a slab lit along its top, less along its left, dark along
// its lower right, a tone of its own.
sprite("_flags", { w: 16, h: 16 }, (c) => {
  const P = [[3, 3], [11, 2], [7, 8], [14, 10], [2, 11], [10, 14]]
  const near = (X, Y) => {
    let a = [9e9, -1], b = 9e9
    P.forEach(([x, y], k) => {
      const dx = Math.min(Math.abs(X - x), 16 - Math.abs(X - x)), dy = Math.min(Math.abs(Y - y), 16 - Math.abs(Y - y)), d = Math.hypot(dx, dy * 1.2)
      if (d < a[0]) { b = a[0]; a = [d, k] } else if (d < b) b = d
    })
    return { k: a[1], gap: b - a[0] < 0.9 }
  }
  const at = (X, Y) => near((X + 16) % 16, (Y + 16) % 16)
  for (let Y = 0; Y < 16; Y++) for (let X = 0; X < 16; X++) {
    const { k, gap } = at(X, Y)
    if (gap) { c.px(X, Y, Math.floor(hash(X, Y) * 3) ? "M" : "m"); continue }
    const up = at(X, Y - 1), lf = at(X - 1, Y), dn = at(X, Y + 1), rt = at(X + 1, Y)
    c.px(X, Y, up.gap ? "U" : lf.gap ? "u" : dn.gap || rt.gap ? "t" : Math.floor(hash(k, 5) * 3) ? "T" : "u")
  }
})
// Pickets, 12 rows high (0.75 m): a picket every 4 px, 2 px wide and pointed, two rails across.
sprite("_fence", { w: 16, h: 12 }, (c) => {
  for (let X = 0; X < 16; X++) for (let Y = 0; Y < 12; Y++) {
    const p = X % 4, picket = p < 2 && (Y > 0 || p === 0), rail = Y === 4 || Y === 9
    if (picket) c.px(X, Y, p === 0 ? "f" : "d")
    else if (rail) c.px(X, Y, Y === 4 ? "d" : "s")
  }
})

// A dead tree, 4 m: a trunk splitting into branches that split again, thinner each time, drawn from
// the ground up; dark on the right.
sprite("_deadtree", { w: 56, h: 72, pivot: "bottom" }, (c) => {
  const r = rng(8)
  const limb = (x, y, a, len, w) => {
    const steps = Math.ceil(len)
    for (let s = 0; s <= steps; s++) {
      const t = s / steps, X = x + Math.cos(a) * len * t, Y = y - Math.sin(a) * len * t, ww = w * (1 - 0.4 * t)
      for (let d = -ww / 2; d <= ww / 2; d += 0.5) c.px(Math.round(X + d), Math.round(Y), d > 0 ? "b" : d < -ww / 4 ? "I" : "B")
    }
    const ex = x + Math.cos(a) * len, ey = y - Math.sin(a) * len
    if (w > 1.2) for (const da of [-0.5 - r() * 0.3, 0.45 + r() * 0.3]) limb(ex, ey, a + da, len * (0.62 + r() * 0.15), w * 0.62)
  }
  limb(28, 71, Math.PI / 2 + 0.05, 24, 6)
}, bump("hybrid"))
sprite("_flowers", { w: 7, h: 4, pivot: "bottom" }, ".p...o.\npOp.oOo\n.q.p.q.\n.q.q.q.")
sprite("_gytuft", { w: 7, h: 5, pivot: "bottom" }, "..e.e..\n.ew.we.\new.e.we\nwqwqwqw\nqqqqqqq")
// Rocks as CrossCode draws them: two or three masses, each in flat facets (its normal rounded to a few
// directions), the tops in the sun, the fronts in the shade, the darkest tone an outline on the shaded
// side only; moss along the foot here and there.
const rock = (name, w, h, lobes) => sprite(name, { w, h, pivot: "bottom", outline: "D", selout: true }, (c) => {
  for (const [x, y, rx, ry] of lobes) for (let Y = 0; Y < h; Y++) for (let X = 0; X < w; X++) {
    const nx = (X + 0.5 - x) / rx, ny = (Y + 0.5 - y) / ry
    if (nx * nx + ny * ny > 1) continue
    const L = 0.7 - 0.45 * (Math.round(nx * 2) / 2) - 0.55 * (Math.round(ny * 2) / 2)
    c.px(X, Y, "tTuUE"[Math.max(0, Math.min(4, Math.round(L * 4)))])
  }
  for (let X = 0; X < w; X++) if (c.get(X, h - 1) && Math.floor(hash(X, w) * 3) === 0) c.px(X, h - 1, "m")
}, bump("hybrid"))
rock("_rock", 15, 10, [[5.5, 5, 5, 4], [10.5, 6.5, 3.5, 3]])
rock("_rock_small", 9, 7, [[4.5, 4, 4, 3]])

// Headstones, drawn at the scene's scale (24 px to the meter) as the games draw them, seen from 38
// degrees up: the front in the shade (the sun is behind them), the slab's top above it in the sun, its
// front edge brightest; the left edge catching the light, the right dark; a cross or lines cut in the
// front (the cut's upper wall dark, its floor lit); rain streaks down from the top, lichen in spots,
// moss climbing unevenly from the foot.
// The old ones lean (lean: px at the top).
const headstone = (name, w, h, inside, cut, lean = 0) => sprite(name, { w: w + 2 + Math.abs(lean), h: h + 3, pivot: "bottom", outline: "D", selout: true }, (c) => {
  const face = (x, y) => x >= 0 && x < w && y >= 0 && y < h && inside(x + 0.5 - w / 2, y)
  const groove = (x, y) => face(x, y) && cut(x + 0.5 - w / 2, y)
  const put = (x, y, k) => c.px(1 + Math.max(0, -lean) + x + Math.round((lean * (h - 1 - y)) / h), y + 3, k)
  for (let y = -3; y < h; y++) for (let x = 0; x < w; x++) {
    if (!face(x, y)) {
      if (face(x, y + 1)) put(x, y, "E")
      else if (face(x, y + 2) || face(x, y + 3)) put(x, y, "U")
      continue
    }
    const moss = 1 + ((hash(x >> 1, w) * 7) >> 0) % 3 + (x % 3 === 1 ? 1 : 0), streak = Math.floor(hash(x, w + 1) * 4) === 0 && y < 4 + (Math.floor(hash(x, w) * 5))
    put(x, y, groove(x, y) ? (!groove(x, y - 1) ? "D" : !groove(x, y + 1) ? "u" : "t")
      : y >= h - moss ? (y === h - moss ? "M" : "m")
      : !face(x - 1, y) ? "U" : !face(x + 1, y) ? "t" : !face(x, y - 1) ? "U" : streak ? "T" : Math.floor(hash(x * 3 + w, y) * 40) === 0 ? "M" : "u")
  }
}, bump("hybrid"))
const arch = (w) => (x, y) => y >= (w / 2) * 0.75 * (1 - Math.sqrt(Math.max(0, 1 - ((2 * x) / w) ** 2)))
headstone("_grave_arch", 15, 22, arch(15), (x, y) => (Math.abs(x) < 1 && y >= 5 && y <= 15) || (Math.abs(x) < 4 && y >= 8 && y <= 9))
headstone("_grave_slab", 14, 18, (x, y) => y >= (Math.abs(x) > 5.5 ? 1 : 0), (x, y) => Math.abs(x) < 4.5 && (y === 4 || y === 5 || y === 8 || y === 9 || ((y === 12 || y === 13) && Math.abs(x) < 2.5)), 1)
headstone("_grave_cross", 13, 24, (x, y) => Math.abs(x) < 2.5 || (y >= 5 && y <= 8) || (y >= 20 && Math.abs(x) < 5.5), () => false)
headstone("_grave_old", 13, 16, arch(13), () => false, -2)

// The camera: 24 px to the meter, 38 degrees down, 30 across; the hill centred (Z, 1.6 m behind where it
// looks, is the hill's middle).
const W = 480, H = 270, CAM = hd2dCamera({ w: W, h: H, pitch: -38, fov: 30, ppm: 24 }), Z = CAM.z - 1.6, DIST = CAM.dist, view = CAM.view
const M = model(), block = (...a) => hd2dBlock(M, ...a)
// The textures a texel to a pixel where the camera looks: the floors foreshortened, the walls a little.
const MATS = {
  grass: { tex: "_grass", texel: CAM.floor }, flags: { tex: "_flags", texel: CAM.floor },
  rampart: { tex: "_rampart", anchor: "face", texel: CAM.wall }, fence: { tex: "_fence", anchor: "face" },
}
const TOP = 1.5                                                     // the hill's top
M.face("grass", [-40, Z - 25, 0], [40, Z - 25, 0], [40, Z + 60, 0], [-40, Z + 60, 0])
block("grass", "rampart", -6.5, Z - 2.5, 6.5, Z + 6, 0, TOP)
// the steps: four of 0.3 m up the wall's front, 0.35 m deep
for (let i = 0; i < 4; i++) block("flags", "rampart", -1, Z - 2.5 - 0.35 * (i + 1), 1, Z - 2.5 - 0.35 * i, 0, TOP - 0.3 * (i + 1))
block("flags", "flags", -0.9, Z - 2.5, 0.9, Z + 5.2, TOP, TOP + 0.02)   // the path
// the fence round the top, open at the steps
const fence = (a, b) => M.face("fence", [...a, TOP], [...b, TOP], [...b, TOP + 0.75], [...a, TOP + 0.75])
fence([-6.2, Z + 5.7], [6.2, Z + 5.7]); fence([-6.2, Z - 2.2], [-6.2, Z + 5.7]); fence([6.2, Z - 2.2], [6.2, Z + 5.7])
fence([-6.2, Z - 2.2], [-1.3, Z - 2.2]); fence([1.3, Z - 2.2], [6.2, Z - 2.2])
// hills behind, far enough for the mist to take them
for (const [x0, x1, z0, h] of [[-40, -8, 30, 7], [-12, 14, 36, 9], [10, 40, 28, 6]]) block("grass", "grass", x0, Z + z0, x1, Z + z0 + 8, 0, h)

// The wood, the tree, and what grows on the hill: placed once, seeded.
const R = rng(13), things = [{ name: "_deadtree", at: [-4.6, Z + 4.9, TOP] }]
// the gravestones either side of the path
for (const [x, dz, name] of [[-3.4, 3.2, "_grave_arch"], [-2, 4.6, "_grave_cross"], [-4.4, 0.8, "_grave_old"], [2.6, 3.8, "_grave_arch"], [3.9, 1.6, "_grave_slab"], [2.1, 0.4, "_grave_old"]])
  things.push({ name, at: [x, Z + dz, TOP] })
for (let k = 0; k < 160; k++) {
  const x = -16 + R() * 32, z = Z - 9 + R() * 34
  if (Math.abs(x) < 7.5 && z > Z - 4.5 && z < Z + 7.5) continue   // not on the hill or at its foot
  things.push({ name: "_pine", at: [x, z] })
}
for (let k = 0; k < 26; k++) {
  const x = -6 + R() * 12, z = Z - 2 + R() * 7.5
  if (Math.abs(x) < 1.1) continue                                  // not on the path
  things.push({ name: R() < 0.35 ? "_flowers" : R() < 0.7 ? "_gytuft" : R() < 0.5 ? "_rock" : "_rock_small", at: [x, z, TOP], shadow: 0 })
}
for (let x = -6; x <= 6; x += 1.5) if (Math.abs(x) > 1.4) things.push({ name: "_bush", at: [x + R() * 0.4, Z - 2.75] })

// The scene's clock: 16 frames of 210 ms. One hero walks up the path and back down it; another
// stands at a grave, his back to us.
const walker = (f) => {
  const down = f >= 8, z = Z - 1.6 + 0.25 * (down ? 16 - f : f)
  return { name: down ? "walk_down" : "walk_up", at: [0.2, z, TOP + 0.02], frame: f % 4 }
}
const people = (f) => [...things, walker(f), { name: "idle_up", at: [-3.4, Z + 2.5, TOP], frame: 0 }]
const CLOCK = { frames: 16, fps: 1000 / 210 }
// Morning: the sun low behind on the left (the shadows fall toward us and to the right), warm; the
// sky's light cool in the shade.
const LIGHT = { light: [-0.6, 0.65, 0.5], sun: { color: "#ffe2b4", strength: 1.3 }, sky: { color: "#a9b9d6", strength: 0.45 } }
scene("graveyard", { w: W, h: H, bg: "q", ...CLOCK }, (c) => c.mesh(view(1), M.faces, MATS, { sprites: people(c.frame), ...LIGHT }))

// Four times the size (1920x1080) and through the camera: the hill's top sharp, the wood below and
// the hills behind blurred and taken by a warm mist, a bloom, darker corners.
scene("graveyard_hd", { w: W * 4, h: H * 4, bg: "q", ...CLOCK, check: false },
  (c) => c.mesh(view(4), M.faces, MATS, { sprites: people(c.frame), pixel: 4, ...LIGHT }),
  post({ blur: 36, focus: [W * 2, H * 2.2], sharp: 1.2, soft: 3, fog: { color: "#dcdccc", from: DIST + 2, to: DIST + 26, max: 0.7 }, bloom: { strength: 0.6, r: 40 }, vignette: 0.35 }))
