// Tropical forest, 3/4 top-down: a river falling from a rock lip into a pool and winding down
// through the jungle, a dirt trail crossing it on a plank bridge, big canopy trees, palms, bananas
// and the understory, a macaw, butterflies, a frog, and an Indigenous girl walking the trail.
// Light comes from the top left: crowns cast their shadows down and right, sun shafts fall through.
// The art is spread over the files included below; refs/ has the CC-BY art the trees are reduced from.
use("palette.hex")
include("plants.px.js", { palette: true })
include("trail.px.js")    // the trail's tileset, drawn in code
include("trees.px.js")    // trees, palms and big leaves reduced from CC-BY art (credits inside)
include("fauna.px.js")    // the jaguar and the monkey
include("girl.px.js")     // the girl, with her own palette
ramps("DHGglL", "nNmM", "qQOoa", "BbcC", "WwvVF", "Ssr", "kD")

const T = 16, W = 320, H = 240

// ---------------------------------------------------------------- river
// One char per corner of a 16px grid ("w" water): a pool under the waterfall (top right), then the
// river winds down to the bottom left. The corners blend bilinearly into a smooth shape with a
// small wobble (smoothstep between corners, so the banks curve instead of zigzagging); depth then comes from the distance to the bank, so the water shades from foam at
// the edge to deep in the middle, and the soil darkens and gets wet near it.
const CORNERS = `
  ...............ww....
  .............wwwww...
  ............wwwwwww..
  ............wwwwwww..
  .............wwwww...
  ............wwww.....
  ...........wwww......
  ..........wwww.......
  .........wwww........
  ........wwww.........
  ........wwww.........
  .........wwww........
  ..........wwww.......
  .........wwww........
  ........wwww.........
  .......wwww..........`
const cr = CORNERS.trim().split("\n").map((r) => [...r.trim()].map((ch) => (ch === "w" ? 1 : 0)))
const field = (x, y) => {
  const fx = Math.min(cr[0].length - 1.001, x / T), fy = Math.min(cr.length - 1.001, y / T)
  const i = Math.floor(fx), j = Math.floor(fy), s = (t) => t * t * (3 - 2 * t), u = s(fx - i), v = s(fy - j)
  return cr[j][i] * (1 - u) * (1 - v) + cr[j][i + 1] * u * (1 - v) + cr[j + 1][i] * (1 - u) * v + cr[j + 1][i + 1] * u * v
    + 0.03 * Math.sin(x * 0.21) + 0.025 * Math.sin(y * 0.17 + 1) + 0.02 * Math.sin((x + y) * 0.43)
}
const isWater = (x, y) => field(x + 0.5, y + 0.5) > 0.5
// distance (in px, 4-way) from every pixel to the other side of the bank
const dist = (() => {
  const d = new Float32Array(W * H).fill(Infinity), q = []
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const wet = isWater(x, y)
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const X = x + dx, Y = y + dy; return X >= 0 && Y >= 0 && X < W && Y < H && isWater(X, Y) !== wet })) { d[y * W + x] = 0; q.push(x, y) }
  }
  for (let h = 0; h < q.length; h += 2) {
    const x = q[h], y = q[h + 1], n = d[y * W + x] + 1
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const X = x + dx, Y = y + dy, k = Y * W + X
      if (X >= 0 && Y >= 0 && X < W && Y < H && d[k] > n) { d[k] = n; q.push(X, Y) }
    }
  }
  return d
})()
const depth = (x, y) => dist[y * W + x]

// Bands by distance, with a checker only where two tones meet (never over a whole area).
const terrain = (c) => {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = depth(x, y), chk = (x + y) % 2 === 0
    if (isWater(x, y)) c.px(x, y, d < 1 ? "V" : d < 4 ? "v" : d < 6 ? (chk ? "v" : "w") : d < 13 ? "w" : d < 15 ? (chk ? "w" : "W") : "W")
    else c.px(x, y, d < 1 ? "q" : d < 3 ? "Q" : d < 5 ? "H" : d < 7 ? "G" : d < 9 ? (chk ? "G" : "g") : "g")
  }
}

// ---------------------------------------------------------------- trail
// A dirt trail from the bottom right to the bridge, and from the bridge up to the top left, laid
// with a tileset (trail.px.js): "#" marks dirt at a tile corner, 21x16 corners for 20x15
// tiles; tilemap({ corners }) picks each tile's piece by its 4 corners (edge, outer or inner corner,
// full dirt).
const TRAIL = `
  ...#.................
  ...#.................
  ...#.................
  ...#.................
  ...##................
  ....#................
  ....##...............
  .....#...............
  .....##..............
  ......##.............
  ............###......
  ..............##.....
  ...............##....
  ................#....
  ................##...
  .................#...`
const trail = tilemap(TRAIL, { corners: "#", size: T, map: "dirt_" })
const tc = TRAIL.trim().split("\n").map((r) => [...r.trim()].map((ch) => (ch === "#" ? 1 : 0)))
const dirt = (i, j) => tc[j]?.[i] ?? 0

// ---------------------------------------------------------------- ground cover
// Fallen leaves and seedlings, evenly spread so they never clump into a pattern.
sprite("_leaf1", "o.\noO"); sprite("_leaf2", ".y\nO."); sprite("_leaf3", "Q.\n.O")
sprite("_seed1", "g.g\n.G."); sprite("_seed2", ".l.\ngGg")
group("litter", ["_leaf1", "_leaf2", "_leaf3", "_leaf3"])
group("seedlings", ["_seed1", "_seed2"])
sprite("_tuft1", `
  .g...g.
  .Gg.gG.
  g.GgG.g
  .HGGGH.`)
sprite("_tuft2", `
  ..l.g..
  g.gGg.l
  .GgGgG.
  ..HGH..`)
group("tufts", ["_tuft1", "_tuft2"])

// ---------------------------------------------------------------- what stands where
// [asset, x, y] by its pivot (the base); drawn back to front by y. The build fails if anything
// that grows on land lands in the water.
const PLANTS = [
  ["tree", 42, 122], ["tree2", 130, 74], ["tree", 22, 238, { flip: "x" }],
  ["palm", 296, 104], ["palm", 228, 140], ["palm", 100, 214],                    // not flipped: its light would go with it
  ["banana", 212, 206], ["banana", 300, 200, { flip: "x" }], ["banana", 36, 176],
  ["heliconia", 252, 178], ["heliconia", 232, 222], ["heliconia", 90, 178],
  ["monstera", 16, 150], ["monstera", 92, 236, { flip: "x" }], ["monstera", 288, 238],
  ["fern", 60, 206], ["fern", 244, 100], ["fern", 304, 150], ["fern", 18, 96], ["fern", 178, 238],
  ["bromeliad", 70, 222], ["bromeliad", 180, 76],
  ["rock", 216, 124], ["rock", 190, 58], ["rock_small", 278, 78], ["rock_small", 124, 186],
  ["log", 62, 232],
  ["fern", 268, 120], ["heliconia", 316, 168], ["banana", 132, 118, { flip: "x" }], ["fern", 96, 72], ["monstera", 196, 150],
]
for (const [n, x, y] of PLANTS) if (isWater(x, y)) throw new Error(`${n} at ${x},${y} stands in the water`)
const POOL_LIFE = [["lilypad", 216, 46], ["lilyflower", 204, 58], ["lilypad", 288, 24], ["lilypad", 150, 206], ["lilyflower", 140, 168]]
const place = ([n, x, y, o]) => stamp(n, x, y, o)
// ---------------------------------------------------------------- grass and weeds
// Clumps that stand on the ground (pivot at the base) and are sorted with the plants, so a clump in
// front of a trunk hides its roots and one behind is hidden. Lit blade tips, a dark base that
// anchors them to the ground.
sprite("grass_a", { pivot: "bottom" }, `
  ...l....
  .g.l..l.
  .gLg.lg.
  lgGgggG.
  GgGGgGGg
  .HGHGHH.`)
sprite("grass_b", { pivot: "bottom" }, `
  ..l....
  ..l..l.
  .Lg..g.
  .lg.lg.
  glGlgG.
  gGgGGg.
  GGHGHGG
  .HHHHH.`)
sprite("weed", { pivot: "bottom" }, `
  ..gl.lg.
  .glLgLl.
  ..gGlG..
  .lgGGgl.
  gGGHGGg.
  .HHHHH..`)
sprite("grass_flower", { pivot: "bottom" }, `
  ...Y...
  ..yYy..
  ...l.l.
  .l.g.g.
  .gLglg.
  gGgGGG.
  .HHHHH.`)
sprite("sprout", { pivot: "bottom" }, ".l.g\ngGlG\n.HH.")
group("clump", ["grass_a", "grass_a", "grass_b", "weed", "grass_flower"])
const CLUMPS = ["grass_a", "grass_b", "weed", "grass_a", "grass_flower", "grass_b", "weed"]

// Around the foot of every tree and palm, and against rocks and the log.
const AROUND = { tree: [[-20, -1], [-16, 1], [-9, 2], [-4, 3], [5, 3], [10, 2], [17, 0], [22, -1]], tree2: [[-12, 0], [-7, 2], [6, 3], [11, 1]],
  palm: [[-7, 1], [6, 2]], rock: [[-9, 1], [8, 0]], rock_small: [[6, 1]], log: [[-24, 1], [22, 0], [0, 2]] }
const bridge = (x, y) => x >= 108 && x <= 196 && y >= 136 && y <= 166
const GRASS = [
  ...PLANTS.flatMap(([n, x, y]) => (AROUND[n] ?? []).map(([dx, dy], k) => [CLUMPS[(k + x) % CLUMPS.length], x + dx, y + dy])),
].filter(([, x, y]) => x > 2 && x < W - 2 && y > 6 && y < H + 4 && !isWater(x, y - 1) && !isWater(x, y - 4) && !bridge(x, y))

// ---------------------------------------------------------------- light and air
// Sun shafts fall from the top left through gaps in the canopy (light, dithered thin), and land as
// dapples on the floor. Lianas hang from the crowns, with a leaf every few px.
const SHAFTS = [[64, 34], [150, 26], [226, 20]]
const shafts = SHAFTS.map(([x, w]) => poly([x, 0, x + w, 0, x + w + 150, H, x + 150, H], "Z"))
const DAPPLES = [[100, 92, 6, 3], [86, 132, 5, 2], [176, 168, 7, 3], [214, 186, 6, 2], [262, 214, 8, 3], [288, 126, 5, 2], [40, 70, 4, 2], [150, 110, 4, 2]]
const liana = (pts) => (c) => {
  c.curve(pts, "H", { width: 2 })
  c.curve(pts.map((v, i) => (i % 2 ? v : v - 1)), "G")
  // a small leaf every few px, alternating sides
  for (let i = 0; i < pts.length - 2; i += 2)
    for (const t of [0.3, 0.75]) {
      const x = Math.round(pts[i] + (pts[i + 2] - pts[i]) * t), y = Math.round(pts[i + 1] + (pts[i + 3] - pts[i + 1]) * t)
      const right = (i / 2 + (t > 0.5 ? 1 : 0)) % 2 === 1
      c.runs(right ? { [y]: [[x + 1, "gl"]], [y + 1]: [[x + 1, "Gg"]] } : { [y]: [[x - 2, "lg"]], [y + 1]: [[x - 2, "gG"]] })
    }
}
const LIANAS = [[100, 10, 98, 26, 101, 40, 99, 52], [150, 14, 153, 30, 151, 44], [64, 70, 61, 88, 63, 104, 60, 114], [30, 196, 33, 212, 31, 222]]

// ripples on the river: short light dashes that drift with the current (down and left), one
// seamless loop over the waterfall's 8 frames
anim("ripples", { w: W, h: H, frames: 8, fps: 8 }, (c) => {
  for (let k = 0; k < 160; k++) {
    const x0 = (k * 97) % W, y0 = (k * 61) % H
    const x = x0 - c.frame * 2, y = y0 + c.frame * 2
    if (isWater(x, y) && isWater(x + 3, y) && depth(x, y) > 3) { c.hline(x, y, depth(x, y) > 9 ? 3 : 2, depth(x, y) > 9 ? "w" : "V") }
  }
})

// Where the waterfall lands (IX, IY) the pool churns: foam spreads to the sides and forward (down
// the screen, toward us and the outlet), in bands pushed outward every loop; rings run out past
// it; a wake of foam flecks drifts off with the current toward the river; spray jumps up around
// the foot of the fall. All of it loops over the waterfall's 8 frames.
const IX = 248, IY = 32
const noise = (x, y, f) => (((x * 73856093) ^ (y * 19349663) ^ (f * 83492791)) >>> 0) % 97
// distance from the impact, 1 at the plume's edge: wide to the sides, long forward, short behind
const plumeR = (x, y) => Math.hypot((x - IX) / 22, (y - IY) / (y < IY ? 6 : 18))
anim("splash", { w: W, h: H, frames: 8, fps: 8 }, (c) => {
  const f = c.frame
  for (let y = IY - 8; y < IY + 40; y++) for (let x = IX - 40; x < IX + 40; x++) {
    if (!isWater(x, y)) continue
    const r = plumeR(x, y), n = noise(x, y, f), band = (((r * 6 - f * 0.75) % 1) + 1) % 1
    if (r < 0.4) c.px(x, y, n % 4 ? "F" : "V")                                    // churning white
    else if (r < 0.75) { if (band < 0.5) c.px(x, y, n % 3 ? "F" : "V"); else if (n % 3 === 0) c.px(x, y, "V") }
    else if (r < 1) { if (band < 0.3 && n % 2) c.px(x, y, "V"); else if (n % 9 === 0) c.px(x, y, "F") }
    else for (const k of [0, 4]) {                                                    // rings running out
      const ring = 1.05 + (((f + k) % 8) / 8) * 0.9
      if (Math.abs(r - ring) < 0.045 && n % 3 && depth(x, y) > 1) c.px(x, y, ring < 1.5 ? "V" : "v")
    }
  }
  // the wake: flecks leave the plume and ride the current down and left, thinning out
  const pick = rng(31)
  for (let k = 0; k < 46; k++) {
    const along = 6 + pick() * 34, side = (pick() - 0.5) * 22, phase = Math.floor(pick() * 8), t = (f + phase) % 8
    const x = Math.round(IX - along * 0.7 + side * 0.7 - t * 2), y = Math.round(IY + 8 + along * 0.7 + side * 0.3 + t * 2)
    if (!isWater(x, y) || !isWater(x + 2, y) || depth(x, y) < 2 || pick() < along / 60) continue
    c.hline(x, y, t < 5 ? 2 : 1, along + t * 3 < 22 ? "F" : t < 6 ? "V" : "v")
  }
})
// nothing floats in the churn
for (const [n, x, y] of POOL_LIFE) if (!isWater(x, y) || plumeR(x, y) < 1.4) throw new Error(`${n} at ${x},${y}: not on calm water`)
anim("spray", { w: W, h: H, frames: 8, fps: 8 }, (c) => {
  const pick = rng(37)
  for (let k = 0; k < 18; k++) {
    const side = k % 2 ? 1 : -1, x0 = IX + side * (2 + pick() * 7), vx = side * (0.4 + pick() * 0.9), h = 3 + pick() * 6
    const t = (c.frame + Math.floor(pick() * 8)) % 8
    if (t === 0 || t === 7) continue
    c.px(Math.round(x0 + vx * t), Math.round(IY - 1 - h * 4 * (t / 8) * (1 - t / 8)), t < 4 ? "F" : "V")
  }
})

// The girl breathes: everything above her knees sinks 1px on the out-breath (rows shift, nothing
// is redrawn; the skirt's frayed hem row stays), 4 frames at 4 fps so her loop lines up with the
// waterfall's.
anim("girl", { base: "girl_pose", frames: 4, fps: 4, flip: "x", pivot: "bottom" },
  (c) => { if (c.frame % 2) c.warp((x, y) => y <= 21 && [0, 1]) })

// ---------------------------------------------------------------- cast shadows
// Everything standing on the ground throws a shadow, the girl too: the thing laid flat on the ground
// (cast), a pixel h px above its base landing h * (0.62, 0.22) away, down and right of it, since the
// light comes from the top left. Low things (the log, rocks, ferns) get a short one that only
// grounds them. cast applies after flip, so a mirrored palm still throws its shadow to the right.
// Shadows in one layer don't add up, so whatever stands inside a tree's shadow (the girl does) shows
// none of its own there: that's right, there's no sun to block. What still grounds it is the contact
// shadow, where it meets the ground and the light around can't reach: the same silhouette squashed
// to a tenth, in a layer of its own so it darkens inside the big shadows too. The tall plants don't
// get one; their trunks and roots already meet the ground in their own shade.
const TALL = ["tree", "tree2", "palm", "banana"]
const GIRL = ["girl", 92, 137]
const shadowOf = ([n, x, y, o]) => stamp(n, x, y, { ...o, cast: [0.62, 0.22], silhouette: "k" })
const contactOf = ([n, x, y, o]) => stamp(n, x, y, { ...o, cast: [0.18, 0.12], silhouette: "k" })

scene("forest", { w: W, h: H, world: { light: [-0.5, -1] } },
  layer("ground", terrain),
  layer("trail", trail),
  layer("cover", scatter("litter", 0, 0, W, H, 90, { on: "g", below: true, even: true, rflip: "xy", seed: 2 }),
    scatter("seedlings", 0, 0, W, H, 40, { on: "g", below: true, even: true, seed: 5 }),
    scatter("tufts", 0, 0, W, H, 34, { on: "g", below: true, even: true, rflip: "x", seed: 7 }),
    // grass and weed clumps over all the open ground, not only near things, plus sprouts between
    scatter("clump", 0, 0, W, H, 80, { on: "g", below: true, even: true, rflip: "x", seed: 13 }),
    scatter("sprout", 0, 0, W, H, 60, { on: "g", below: true, even: true, rflip: "x", seed: 17 }),
    scatter("blooms", 0, 0, W, H, 26, { on: "g", below: true, even: true, seed: 9 })),
  layer("shadows", { shade: 2 }, ...[...PLANTS, GIRL].map(shadowOf)),
  layer("contact", { shade: 2 }, ...[...PLANTS.filter(([n]) => !TALL.includes(n)), GIRL].map(contactOf)),
  layer("water", stamp("ripples", 0, 0), stamp("splash", 0, 0), ...POOL_LIFE.map(place), stamp("frog", 217, 44)),
  layer("dapples", { light: 1 }, ...DAPPLES.map(([x, y, rx, ry]) => ellipse(x, y, rx, ry, "Z"))),
  layer("bridge", stamp("bridge", 112, 140)),
  // sort: "y" draws what stands lower (nearer) over what stands higher, whatever the call order
  layer("props", { sort: "y" }, ...[...PLANTS, ...GRASS, GIRL].map(place),
    // grass along both edges of the trail (on grass within 3 px of its dirt), and now and then a
    // sprout on the trail itself, where feet go less; sorted with the rest by where they stand
    scatter("clump", 0, 0, W, H, 110, { on: "g", near: "aAo", within: 3, below: true, even: true, rflip: "x", seed: 23 }),
    scatter("sprout", 0, 0, W, H, 8, { on: "a", below: true, seed: 29 })),
  layer("perch", stamp("macaw", 116, 142)),
  // in the trees: the jaguar on the big tree's low branch, the monkey under a leaf pad of the other
  layer("fauna", stamp("jaguar", 21, 73), stamp("monkey", 150, 51)),
  layer("falls", stamp("waterfall", 248, 34), stamp("spray", 0, 0)),
  layer("mist", { light: 1, density: 0.3 }, ellipse(IX, IY - 2, 18, 7, "Z")),
  layer("shafts", { light: 1, density: 0.28 }, ...shafts),
  layer("air", stamp("butterfly", 244, 156), stamp("butterfly", 98, 150, { rdelay: true }), stamp("butterfly", 206, 226, { rdelay: true })))

scene("terrain", { w: W, h: H }, layer("ground", terrain))

// A layout check, previews only: every plant's pivot (where it stands) and the trail's dirt
// corners, over the finished scene.
scene("forest_guide", { w: W, h: H }, stamp("forest"),
  layer("guide", { ref: true }, ...PLANTS.map(([, x, y]) => rect(x - 1, y - 1, 3, 3, "R")),
    ...tc.flatMap((row, j) => row.flatMap((d, i) => (d ? [rect(i * T - 1, j * T - 1, 3, 3, "Y")] : [])))))

// For a game: the plants, props and animals on one sheet.
sheet("jungle_kit", ["tree", "tree2", "palm", "banana", "fanpalm", "fern", "monstera", "heliconia", "bromeliad", "rock", "rock_small", "log",
  "lilypad", "lilyflower", "bridge", "waterfall", "macaw", "butterfly", "frog", "jaguar", "monkey", "girl_walk", "girl_walk_se"], { pad: 1 })
