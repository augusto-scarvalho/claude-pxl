// Tropical forest: the plants, props and small animals drawn here (trees.px.js has the ones reduced
// from CC art). Light comes from the top left (the sun shafts fall that way), so
// left and top faces are lit and right and bottom faces sit in shade. Big shapes are primitives and
// procedural fronds; small organic bits (leaf clumps, flowers) are hand-placed pixels.
use("palette.hex")
ramps("DHGglL", "nNmM", "qQOoa", "BbcC", "WwvVF", "Ssr", "kD")

// ---------------------------------------------------------------- leaf lobes
// A canopy is a heap of lobes. Each lobe is shaded like a sphere lit from the top left, with a
// leaf-cluster texture (clumps of 3x2 px nudged lighter or darker) instead of noise, a scalloped
// leafy edge, and a dark rim on its lower right where it sits over the lobe behind it. Lobes are
// drawn back to front, so the front ones overlap with that rim.
const L3 = (() => { const v = [-0.55, -0.7, 0.45], n = Math.hypot(...v); return v.map((k) => k / n) })()
const hash = (x, y) => { const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return h - Math.floor(h) }
const lobe = (c, cx, cy, r, ramp = "DHGglL", seed = 0) => {
  for (let y = Math.floor(cy - r - 2); y <= cy + r + 2; y++)
    for (let x = Math.floor(cx - r - 2); x <= cx + r + 2; x++) {
      const dx = (x + 0.5 - cx) / r, dy = (y + 0.5 - cy) / r, ang = Math.atan2(dy, dx)
      const edge = 1 + 0.09 * Math.sin(ang * 9 + seed) + 0.05 * Math.sin(ang * 17 + seed * 2)
      const d2 = dx * dx + dy * dy
      if (d2 > edge * edge) continue
      const z = Math.sqrt(Math.max(0, 1 - d2)), lit = dx * L3[0] + dy * L3[1] + z * L3[2]
      const tex = (hash(Math.floor((x + (Math.floor(y / 2) % 2) * 1.5) / 3), Math.floor(y / 2)) - 0.5) * 0.35
      let k = Math.round((lit + tex) * 2.6 + 1.6)
      if (d2 > (edge - 0.16) ** 2 && dx + dy > 0.2) k = 0                    // rim over the lobe behind
      c.px(x, y, ramp[Math.max(0, Math.min(ramp.length - 1, k))])
    }
}

// ---------------------------------------------------------------- leaves
// A big leaf is a paddle along a midrib that lifts off the stem and droops at the tip; the lit
// half is lighter, the midrib pale, the edge dark, and the wind may have torn it into strips.
const paddle = (c, x0, y0, ang, len, wid, lift, drop, tone = "lgGL", tears = true) => {
  const [lit, shade, edge, rib] = tone
  const at = (t) => [x0 + Math.cos(ang) * len * t, y0 + Math.sin(ang) * len * t * 0.6 - lift * Math.sin(Math.PI * t * 0.8) + drop * t * t]
  const n = Math.ceil(len * 2.5)
  for (let i = 1; i <= n; i++) {
    const t = i / n, [x, y] = at(t), [px, py] = at((i - 1) / n)
    const l = Math.hypot(x - px, y - py) || 1, nx = -(y - py) / l, ny = (x - px) / l
    const w = Math.sin(Math.PI * Math.pow(t, 0.55)) * wid
    const tear = tears && t > 0.25 && i % 6 === 3
    for (let k = -w; k <= w; k += 0.4) {
      if (tear && Math.abs(k) > 1) continue
      const d = Math.abs(k), half = k * (nx - ny) > 0                    // the half toward the top left is lit
      c.px(Math.round(x + nx * k), Math.round(y + ny * k), d > w - 0.7 ? edge : half ? lit : shade)
    }
    if (t < 0.92) c.px(Math.round(x), Math.round(y), rib)
  }
}

// ---------------------------------------------------------------- fern
// Fronds rising out of the ground and arching over, leaflets paired across the rib and
// shortening toward the tip; back fronds darker.
const fernFrond = (c, side, spread, rise, drop, tone) => {
  const [rib, leaf] = tone
  let px = 22, py = 21
  for (let i = 1; i <= 20; i++) {
    const t = i / 20, x = Math.round(22 + side * spread * t), y = Math.round(21 - rise * t + drop * t * t)
    c.line(px, py, x, y, rib)
    const n = Math.round(3 * (1 - t) + 0.6)
    if (t > 0.15 && i % 2 === 0) { c.line(x, y, x - n, y - n, leaf); c.line(x, y, x + n, y + n, leaf) }
    px = x; py = y
  }
}
sprite("fern", { w: 44, h: 24, outline: "D", pivot: [22, 23] },
  (c) => fernFrond(c, -1, 8, 18, 10, ["H", "G"]), (c) => fernFrond(c, 1, 8, 18, 10, ["H", "G"]),
  (c) => fernFrond(c, -1, 18, 14, 14, ["G", "g"]), (c) => fernFrond(c, 1, 18, 14, 14, ["G", "g"]),
  (c) => fernFrond(c, -1, 20, 6, 10, ["g", "l"]), (c) => fernFrond(c, 1, 20, 6, 10, ["g", "l"]))

// ---------------------------------------------------------------- understory
// Heliconia: zigzag red bracts tipped yellow on a stem, between two long leaves.
sprite("heliconia", { w: 22, h: 34, outline: "D", pivot: [11, 33] },
  (c) => paddle(c, 10, 33, -1.95, 26, 2.5, 4, 6, "lgGL", false), (c) => paddle(c, 12, 33, -1.2, 28, 2.5, 4, 8, "lgGL", false),
  vline(11, 6, 27, "G"),
  runs({ 2: [[10, "Y"]], 3: [[9, "RRy"]], 4: [[11, "yRR"]], 5: [[8, "RRRy"]], 6: [[11, "yRRR"]],
    7: [[8, "RRRy"]], 8: [[11, "yRRR"]], 9: [[9, "RRy"]], 10: [[11, "yRR"]], 11: [[10, "Ry"]] }))

// Bromeliad: a rosette of stiff leaves around a red heart.
sprite("bromeliad", { w: 15, h: 9, outline: "D", pivot: [7, 8] }, runs({
  0: [[1, "g"], [7, "l"], [13, "g"]], 1: [[2, "g"], [6, "lL"], [12, "g"]], 2: [[0, "l"], [3, "gG"], [7, "l"], [10, "Gg"], [14, "l"]],
  3: [[1, "lg"], [4, "GRRRRG"], [11, "gl"]], 4: [[2, "lgGRyRGgl"]], 5: [[0, "gg"], [4, "GRRRG"], [12, "gg"]],
  6: [[2, "gGgGGGgGg"]], 7: [[4, "GGGGG"]] }))

// Small flowers for scatter: orchids, a yellow and an orange bloom.
sprite("_orchid", ".p.\npEp\n.P.")
sprite("_ybloom", ".Y.\nYyY\n.Y.")
sprite("_obloom", "y.y\n.R.\ny.y")
group("blooms", ["_orchid", "_orchid", "_ybloom", "_obloom"])

// ---------------------------------------------------------------- rocks, log
// Rocks reuse the lobe painter on the rock ramp; moss grows on their lit tops.
const mossy = (c, cx, cy, r) => {
  lobe(c, cx, cy, r, "kSsrr", cx)
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++)
    if (c.is(x, y, "rs") && y < cy - r * 0.25 + Math.sin(x * 1.3) * 1.2) c.px(x, y, c.is(x, y, "r") ? "l" : "g")
}
sprite("rock", { w: 18, h: 13, outline: "k", pivot: [9, 12] }, (c) => mossy(c, 9, 7, 7))
sprite("rock_small", { w: 11, h: 8, outline: "k", pivot: [5, 7] }, (c) => mossy(c, 5, 4, 4))

// Fallen log: a lit top, a shaded side, the cut end with rings, moss and bracket mushrooms.
sprite("log", { w: 50, h: 16, outline: "k", pivot: [25, 15] },
  rect(4, 3, 42, 11, "b"), hline(4, 3, 42, "c"), hline(4, 4, 42, "c"), rect(4, 11, 42, 3, "B"),
  hline(8, 7, 9, "B"), hline(22, 8, 12, "B"), hline(36, 6, 6, "B"),
  ellipse(44, 8, 3, 5, "o"), ellipse(44, 8, 2, 3, "O"), px(44, 8, "o"),
  runs({ 2: [[10, "gGg"], [24, "lgGg"]], 3: [[9, "gllg"], [23, "glllg"], [33, "gg"]], 4: [[10, "gg"], [25, "gg"]] }),
  runs({ 9: [[14, "aoy"]], 10: [[13, "yyyO"]], 12: [[30, "Eo"]], 13: [[29, "EEo"]] }))

// ---------------------------------------------------------------- water props
sprite("lilypad", { w: 9, h: 6, pivot: [4, 3] }, runs({
  0: [[2, "NNmN"]], 1: [[1, "NmmMN"], [7, "N"]], 2: [[0, "NmmM."], [6, "mN"]], 3: [[0, "NNm"], [5, "mmN"]], 4: [[1, "nNNNNn"]], 5: [[3, "nnn"]] }))
sprite("lilyflower", { w: 9, h: 7, pivot: [4, 4] }, stamp("lilypad", 0, 1),
  runs({ 0: [[3, "p.p"]], 1: [[2, "pEEp"]], 2: [[3, "Yp"]] }))

// Waterfall over a rock lip: rock lobes on both sides, a sheet of falling water whose streaks run
// down 2px a frame (8 frames = one seamless loop), and foam churning where it lands.
const FALL = { frames: 8, fps: 8 }
anim("waterfall", { w: 56, h: 40, ...FALL, pivot: [28, 39] }, (c) => {
  for (const [x, y, r] of [[8, 10, 10], [14, 22, 9], [46, 9, 10], [42, 21, 9], [28, 4, 7]]) lobe(c, x, y, r, "kSsrr", x)
  // moss on the lit tops of the rocks
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++)
    if (c.is(x, y, "rs") && (y + Math.round(Math.sin(x * 1.1) * 2)) % 12 < 5) c.px(x, y, c.is(x, y, "r") ? "g" : "G")
  for (let y = 4; y < 34; y++) for (let x = 20; x < 36; x++) {
    const s = (y - c.frame * 2 + 64 + (x * 7) % 5) % 8
    c.px(x, y, s < 2 ? "F" : s < 4 ? "V" : x % 3 === 0 ? "v" : "w")
  }
  for (let x = 16; x < 40; x++) {
    const h = 2 + Math.round(1.5 + 1.5 * Math.sin(x * 0.9 + c.frame * Math.PI / 4))
    for (let y = 34 - h; y < 37; y++) c.px(x, y, (x + y + c.frame) % 3 ? "F" : "V")
  }
})

// ---------------------------------------------------------------- bridge
// Boards run across the river (vertical in this view), rope rails top and bottom on posts.
sprite("bridge", { w: 80, h: 24, outline: "k" }, (c) => {
  for (let x = 4; x < 76; x += 3) { c.rect(x, 6, 2, 13, "c"); c.vline(x + 2, 6, 13, "B"); c.px(x, 6, "C") }
  c.hline(4, 19, 72, "B"); c.hline(4, 20, 72, "B")
  for (const x of [2, 74]) { c.rect(x, 2, 4, 20, "b"); c.vline(x, 2, 20, "c"); c.rect(x, 1, 4, 2, "c") }
  c.curve([5, 4, 40, 7, 75, 4], "o"); c.curve([5, 17, 40, 20, 75, 17], "o")
})

// ---------------------------------------------------------------- fauna
sprite("macaw", { w: 10, h: 17, outline: "k", pivot: [5, 16] }, runs({
  0: [[3, "RRR"]], 1: [[2, "REkR"]], 2: [[1, "kkERR"]], 3: [[2, "kRRR"]], 4: [[3, "RRRR"]], 5: [[2, "RRYYR"]],
  6: [[2, "RYYuR"]], 7: [[2, "RYuuR"]], 8: [[3, "uuuR"]], 9: [[3, "uuR"]], 10: [[4, "RR"]], 11: [[4, "Ru"]],
  12: [[4, "Ru"]], 13: [[5, "R"]], 14: [[5, "u"]], 15: [[5, "u"]] }))
anim("butterfly", { w: 9, h: 6, frames: 2, fps: 8, outline: "k" }, frame(runs({
  0: [[0, "uU"], [7, "Uu"]], 1: [[0, "uUUk"], [5, "kUUu"]], 2: [[1, "uUUkUUu"]], 3: [[2, "UUkUU"]], 4: [[3, "uku"]] })),
  frame(runs({ 1: [[3, "UkU"]], 2: [[3, "UkU"]], 3: [[3, "uku"]], 4: [[4, "k"]] })))
sprite("frog", { w: 8, h: 5, outline: "D", pivot: [4, 4] }, runs({
  0: [[1, "lk"], [5, "kl"]], 1: [[1, "ggllgg"]], 2: [[0, "gGgllgGg"]], 3: [[1, "GgggggG"]] }))

// ---------------------------------------------------------------- showcase
scene("plants", { w: 300, h: 70, bg: "v", world: { light: [-0.5, -1] } },
  stamp("heliconia", 14, 40), stamp("fern", 46, 34), stamp("bromeliad", 78, 30), stamp("rock", 98, 30), stamp("rock_small", 116, 30),
  stamp("log", 150, 30), stamp("lilypad", 182, 24), stamp("lilyflower", 196, 24), stamp("waterfall", 230, 44),
  stamp("macaw", 266, 30), stamp("butterfly", 280, 14), stamp("frog", 292, 28),
  stamp("bridge", 2, 46), scatter("blooms", 100, 40, 60, 24, 10, { even: true }))
