// Parallax: a maria-fumaça crossing the hills of Minas on a misty morning. The camera rides along with
// the train, so the train stands still and the land runs past behind it, each plane at its own speed:
// the far ridge barely moves, the hills a little, the pasture more, the trackside fast, the grass in
// front a blur. Every plane is a strip that wraps in x and goes round a whole number of times in the
// loop, so the last frame runs into the first.
//
// planes, far to near (px a loop; the loop is 192 frames, 12 s):
//   sky       still
//   clouds    slots 48 px apart, each cloud drifting one slot while it turns into the next one's shape
//   ridge     32: too slow for a strip to go round, so its outline drifts one step and crossfades
//   hills     320 (one strip, once round)       pasture   640      trackside 1280      grass 1920
// the train: drivers that turn a whole number of times, rods on their crank pins, smoke puffs that
// each live 38 frames and fall behind, as the air they're in stays put.
pal({
  A: "#5f9fd9", B: "#78b0e0", C: "#97c4e8", D: "#b9d8ee",                          // sky, top to horizon
  W: "#ffffff", w: "#e4edf3", v: "#c0d2e0",                                         // clouds
  F: "#9bb0ca", f: "#b2c4da", E: "#889fbd",                                         // far ridge
  M: "#dbe7ef", m: "#cbdbe7",                                                       // mist
  H: "#86a796", h: "#9dbaa6", J: "#6f927f", j: "#5b7f6d",                           // hills, woods, araucárias
  G: "#8fbd5c", g: "#76a74c", Q: "#5f8e3f", q: "#4c7633", z: "#acd36e",             // pasture
  o: "#f1eee6", O: "#2e2924", u: "#8d5c3b", R: "#b65a33", r: "#87401f", b: "#3e6cb4", // cows, farmhouse
  "+": "#d2629e", "&": "#efa1c8",                                                   // ipê-roxo
  e: "#a95b36", n: "#7c4226", p: "#958f88", P: "#6f6a65", s: "#4b3627",             // earth, ballast, sleepers
  i: "#d3d7db", I: "#5c6067",                                                       // rail head, web
  x: "#6b4b34", X: "#4d3726", y: "#3b3b42",                                         // poles, wires
  t: "#2f5523", T: "#44772f", l: "#6fa53f", L: "#f0cf48", K: "#ece6f2",             // grass in front, flowers
  k: "#1b1b21", c: "#2f2f39", d: "#4b4b58", a: "#7a7a89",                           // the engine's black
  1: "#bb3a2e", 2: "#7d2219", 3: "#e3b552", 4: "#a67a2f", "%": "#fff4b8",          // red, brass, lamp
  5: "#7b2b35", 6: "#9b3c46", 7: "#ead9b1", 8: "#c3ae87", 9: "#23252d", 0: "#8fb7cf", // coach, window, glass
  S: "#c98b5f", U: "#8b5a39", N: "#3a2a20",                                         // skin, hair
  Y: "#f4f4f1", V: "#d4d4d7", "=": "#a9a9b1", $: "#7d7d87",                         // smoke
})
const W = 320, H = 180, FPS = 16, FRAMES = 192
const RAIL = 158                      // the rails' top row
const TAU = Math.PI * 2
// how far a plane that goes `per` px in a loop has moved at frame f (whole pixels)
const moved = (f, per) => Math.floor((f * per) / FRAMES)
// smooth waves that close over a strip `w` wide: [cycles, amplitude, phase]...
const waves = (x, w, parts) => parts.reduce((s, [k, a, ph]) => s + a * Math.sin((x / w) * TAU * k + ph), 0)
// a soft edge: rows from y0 down, `rows` of them, dithered into solid `key`
const seam = (c, x, y0, rows, key) => { for (let k = 0; k < rows; k++) if ((k + 1) / (rows + 1) > bayer(x, y0 + k)) c.px(x, y0 + k, key) }
// mist lying in a valley: its top a slow swell (in a strip `w` wide), the upper part thinner
const mist = (c, x, y0, w, deep) => {
  const top = y0 + Math.round(waves(x, w, [[5, 1.2, 0.7], [13, 0.8, 2.2], [29, 0.5, 1]]))
  c.vline(x, top, 3, "m"); c.vline(x, top + 3, deep - 3 + y0 - top, "M")
}

// ---------------------------------------------------------------- sky and clouds
// bands of blue, lighter toward the horizon, each meeting the next over 3 dithered rows
sprite("_sky", { w: W, h: 96 }, (c) => {
  const bands = [["A", 0], ["B", 22], ["C", 44], ["D", 64]]
  for (const [k, y0] of bands) c.rect(0, y0, W, 96 - y0, k)
  for (let x = 0; x < W; x++) for (const [k, y0] of bands.slice(1)) seam(c, x, y0 - 3, 3, k)
})
// a lane of slots 48 px apart; over the loop each cloud drifts one slot along and turns into the next
// slot's cloud; empty slots let a cloud form out of nothing or thin away, so the sky stays sparse
const CLOUD_S = 48
const CLOUDS = Array.from({ length: 9 }, (_, i) => {
  const r = rng(40 + i), big = [0, 3, 5].includes(i), none = [2, 7].includes(i)
  const w = big ? 46 : 22, h = big ? 11 : 6
  return { y: 28 + (big ? 0 : 7), h, puffs: Array.from({ length: 7 }, () => [(r() - 0.5) * w * 0.85, -r() * h * 0.45, none ? 0 : h * (0.35 + r() * 0.3)]) }
})
function clouds(c, f) {
  const t = f / FRAMES, n = CLOUDS.length, at = (j) => CLOUDS[((j % n) + n) % n]
  for (let j = -2; (j - 1) * CLOUD_S < W + 40; j++) {
    const a = at(j), b = at(j + 1), mix = (p, q) => p + (q - p) * t
    cloud(c, 10 + (j + t) * CLOUD_S, mix(a.y, b.y), a.puffs.map((p, k) => p.map((v, m) => mix(v, b.puffs[k][m]))), mix(a.h, b.h))
  }
}
// a morning cumulus: puffs cut flat at the base, white on top, a light gray low down and on the right
function cloud(c, cx, base, puffs, h) {
  const px = new Map()
  for (const [dx, dy, r] of puffs) {
    if (r < 0.6) continue
    for (let y = Math.floor(base + dy - r); y <= base; y++)
      for (let x = Math.floor(cx + dx - r); x <= Math.ceil(cx + dx + r); x++)
        if (x >= 0 && x < W && (x + 0.5 - cx - dx) ** 2 + (y + 0.5 - base - dy) ** 2 <= r * r) px.set(y * W + x, [x, y])
  }
  for (const [i, [x, y]] of px) c.px(x, y, y >= base ? "v" : y >= base - h * 0.3 || !px.has(i + 1) ? "w" : "W")
}

// ---------------------------------------------------------------- the far ridge
// A long stone ridge, blue with distance. It should hardly move, slower than any strip can go round,
// so its outline drifts RIDGE_S px over the loop while crossfading into itself one step on: at the
// end it is the outline it started with. With the step this small the crossfade can't be seen.
const RIDGE_S = 32, RIDGE_BASE = 86
const ridge = (x) => 26 + 8 * Math.sin(x / 61 + 0.4) + 4.5 * Math.sin(x / 23 + 1.3) + 2 * Math.sin(x / 9.7) + 7 * Math.exp(-(((x - 210) / 30) ** 2))
function farRidge(c, f) {
  const t = f / FRAMES, o = t * RIDGE_S
  const hAt = (x) => (1 - t) * ridge(x - o) + t * ridge(x - o + RIDGE_S)
  for (let x = 0; x < W; x++) {
    const top = Math.round(RIDGE_BASE - hAt(x)), slope = hAt(x + 1) - hAt(x - 1)
    // faces turned left catch the morning light; steep ones show bare rock in streaks
    for (let y = top; y < RIDGE_BASE; y++) c.px(x, y, slope > 0.8 && y < top + 5 ? "f" : slope < -1.1 && (x + 2 * y) % 5 === 0 ? "E" : "F")
    // the valley mist the ridge stands in
    mist(c, x, RIDGE_BASE - 6, W, 14)
  }
}

// ---------------------------------------------------------------- hills (320 a loop)
// Rolling hills with clumps of woods and araucárias along the crests, mist lying at their foot. Drawn
// once as a strip that wraps; the frames place it.
const HILLS_Y = 62
// an araucária far off: a bare trunk under a flat crown with its tips turned up
function araucaria(c, x, y, tall, key) {
  const cw = tall > 8 ? 3 : 2, top = y - tall
  c.vline(x, top + 2, tall - 2, key)
  c.hline(x - cw, top + 1, cw * 2 + 1, key); c.hline(x - cw + 1, top + 2, cw * 2 - 1, key)
  c.px(x - cw, top, key); c.px(x + cw, top, key); if (cw > 2) c.px(x, top, key)
}
sprite("_hills", { w: W, h: 46, wrap: "x" }, (c) => {
  const top = (x) => Math.round(18 + waves(x, W, [[1, 4, 0.3], [3, 3.5, 1.1], [7, 1.4, 2]]))
  for (let x = 0; x < W; x++) {
    const t0 = top(x), lit = top(x + 2) > top(x - 2)
    for (let y = t0; y < 46; y++) c.px(x, y, lit && y < t0 + 4 ? "h" : "H")
  }
  // woods: clumps of round crowns just under the crests, lit on top
  const r = rng(7)
  for (let i = 0; i < 12; i++) {
    const cx = Math.floor(r() * W), n = 3 + Math.floor(r() * 5)
    for (let k = 0; k < n; k++) {
      const x = cx + k * 3 - n, y = top(((x % W) + W) % W) + 2 + Math.floor(r() * 4), rr = 1 + Math.floor(r() * 2)
      c.circ(x, y, rr, "J"); c.px(x, y + rr, "j"); c.px(x - rr + 1, y - rr + 1, "h")
    }
  }
  for (let i = 0; i < 18; i++) { const x = Math.floor(r() * W); araucaria(c, x, top(x) + 1, 6 + Math.floor(r() * 5), "j") }
  // mist at their foot: a soft top edge, then solid
  for (let x = 0; x < W; x++) mist(c, x, 33, W, 13)
})

// ---------------------------------------------------------------- pasture (640 a loop)
// Near hills of pasture with the cattle's terracing trails across the slopes, a fence, cows, a
// farmhouse with a blue door under a mango tree, a hillside of coffee.
const NEAR_Y = 80, NEAR_W = 640
sprite("_cow", `
  .oo.....
  OooOooo.
  .oOooOo.
  .o.o.oO.
  .O.O.O..`)
sprite("_cow_b", { base: "_cow", swap: { o: "u", O: "O" } })
sprite("_house", `
  ....rRRRRRRRRRr...
  ..rRRRRRRRRRRRRRr.
  .rrrrrrrrrrrrrrrrr
  ..oooooooooooooo..
  ..oobboooobbooob..
  ..oobboooobbooob..
  ..oooooooooooobb..
  ..PPPPPPPPPPPPPPP.`)
sprite("_near", { w: NEAR_W, h: 60, wrap: "x" }, (c) => {
  const top = (x) => Math.round(16 + waves(x, NEAR_W, [[2, 5, 0.9], [5, 3, 2.1], [11, 1.2, 0.4]]))
  for (let x = 0; x < NEAR_W; x++) {
    const t0 = top(x), slope = top(x + 3) - top(x - 3)
    for (let y = t0; y < 60; y++) {
      const depth = y - t0
      // the light on the crest and on slopes turned left, then the pasture, darker down in the fold
      let k = depth < 1 ? "z" : slope > 1 && depth < 9 ? "G" : depth > 30 ? "Q" : "g"
      // cattle trails: thin terraces following the slope, a few px apart
      if (depth > 3 && depth < 34 && (depth + Math.round(slope * 0.6) + Math.floor(x / 50)) % 5 === 0 && hash(Math.floor(x / 9), depth) < 0.7) k = "Q"
      c.px(x, y, k)
    }
  }
  // coffee: rows of round bushes down one hillside
  for (let row = 0; row < 7; row++) for (let x = 470 + row * 3; x < 560 - row * 2; x += 4) {
    const y = top(x) + 3 + row * 3
    c.px(x, y, "q"); c.px(x + 1, y, "q"); c.px(x, y - 1, "Q")
  }
  // a fence along the slope: posts every 9 px, a wire between them
  for (let x = 0; x < NEAR_W; x += 9) { const y = top(x) + 9; c.vline(x, y - 4, 5, "x"); c.line(x, y - 3, x + 9, top(x + 9) + 6, "X") }
  // cows grazing up near the crest, where they show over the train
  for (const [x, flip, brown] of [[60, false, false], [74, true, true], [250, false, true], [380, true, false], [600, false, false], [612, true, true]])
    c.stamp(brown ? "_cow_b" : "_cow", x, top(x + 4) + 2, { flip: flip ? "x" : undefined })
  // the farmhouse on the crest, a mango tree beside it
  const hx = 300, hy = top(hx + 8) - 6
  c.rect(hx - 2, hy + 7, 22, 3, "g"); c.stamp("_house", hx, hy)
  c.vline(hx + 26, hy + 3, 6, "X"); c.circ(hx + 26, hy, 6, "q"); c.circ(hx + 25, hy - 1, 4, "Q"); c.px(hx + 23, hy - 4, "g")
})

// ---------------------------------------------------------------- trackside (1280 a loop)
// The near edge of the line: telegraph poles every 160 px with their wires sagging between, bushes on
// the embankment, a clump of bamboo, banana plants, an ipê-roxo in flower, a cutting of red earth,
// the ballast with the sleepers' ends.
const SIDE_Y = 60, SIDE_W = 1280
sprite("_side", { w: SIDE_W, h: 104, wrap: "x" }, (c) => {
  const r = rng(23), G0 = 80                                         // the embankment's top, in the strip
  const bank = (x) => G0 + Math.round(waves(x, SIDE_W, [[4, 2, 0.5], [13, 1.2, 2]]))
  // a cutting of red earth where the line goes through a rise
  const cut = (x) => (x > 700 && x < 860 ? Math.max(0, 22 - Math.abs(x - 780) * 0.28) : 0)
  for (let x = 0; x < SIDE_W; x++) {
    const t0 = bank(x) - Math.round(cut(x))
    for (let y = t0; y < 104; y++) {
      const d = y - t0, inCut = cut(x) > 0 && y < bank(x)
      const k = inCut ? (d < 2 ? "g" : (x + d * 2) % 7 === 0 ? "n" : "e") : d < 1 ? "z" : d < 4 ? "g" : "Q"
      c.px(x, y, k)
    }
  }
  // ballast: gravel under the rails, and the sleepers' ends every 8 px
  for (let y = 90; y < 104; y++) for (let x = 0; x < SIDE_W; x++) c.px(x, y, hash(x, y) < 0.3 || y === 90 ? "P" : "p")
  for (let x = 0; x < SIDE_W; x += 8) c.rect(x, 96, 4, 3, "s")
  // bushes along the embankment
  for (let i = 0; i < 60; i++) {
    const x = Math.floor(r() * SIDE_W), y = bank(x) - Math.round(cut(x)), rr = 2 + Math.floor(r() * 4)
    c.circ(x, y, rr, "q"); c.circ(x - 1, y - 1, rr - 1, "Q"); if (rr > 3) c.px(x - rr + 2, y - rr + 1, "g")
  }
  // a clump of bamboo: culms arching out from one foot, dark nodes along them, and from the upper
  // nodes fans of leaves hanging outward, thick enough to make a mass
  const culms = Array.from({ length: 16 }, (_, i) => {
    const x0 = 412 + i * 1.6 + r() * 2, tall = 46 + r() * 26, lean = (i - 7.5) * 2.2 + (r() - 0.5) * 3
    return Array.from({ length: 13 }, (_, k) => { const s = k / 12; return [x0 + lean * s * s * 2.2, bank(Math.round(x0)) - tall * s * (1 - 0.25 * s * s)] })
  })
  const leaves = []
  for (const pts of culms) {
    for (let k = 0; k < 12; k++) c.line(...pts[k].map(Math.round), ...pts[k + 1].map(Math.round), k % 4 === 3 ? "q" : "Q")
    for (let k = 5; k < 13; k++) {
      const [px, py] = pts[k], out = Math.sign(pts[12][0] - pts[0][0]) || 1
      for (let m = 0; m < 3; m++) leaves.push([px, py, out * (3 + r() * 4), 1 + r() * 3 + m])
    }
  }
  // the leaves after every culm, darker than the pasture behind: dark under, lit on top
  for (const [px, py, dx, dy] of leaves) c.line(Math.round(px), Math.round(py + 1), Math.round(px + dx), Math.round(py + dy + 1), "q")
  for (const [px, py, dx, dy] of leaves) c.line(Math.round(px), Math.round(py), Math.round(px + dx), Math.round(py + dy), dy < 2 ? "g" : "Q")
  // banana plants: a trunk and big leaves drooping both ways
  for (const x0 of [980, 1004, 1180]) {
    const y0 = bank(x0)
    c.rect(x0, y0 - 16, 2, 16, "Q")
    for (const [dx, dy] of [[-12, -4], [12, -3], [-9, -10], [10, -12], [0, -20]]) {
      c.line(x0, y0 - 16, x0 + dx, y0 - 16 + dy, "z", 2); c.line(x0 + Math.round(dx / 2), y0 - 15 + Math.round(dy / 2), x0 + dx, y0 - 14 + dy, "g")
    }
  }
  // an ipê-roxo in flower: a crooked trunk and clusters of pink with no leaves
  const ix = 250, iy = bank(ix)
  c.line(ix, iy, ix - 2, iy - 22, "X", 2); c.line(ix - 2, iy - 20, ix - 10, iy - 32, "X"); c.line(ix - 1, iy - 21, ix + 9, iy - 34, "X")
  for (let i = 0; i < 26; i++) {
    const a = r() * TAU, d = Math.sqrt(r()), cx = ix + Math.cos(a) * d * 16, cy = iy - 36 + Math.sin(a) * d * 9
    c.circ(Math.round(cx), Math.round(cy), 2, "+"); c.px(Math.round(cx) - 1, Math.round(cy) - 1, "&")
  }
  // telegraph poles every 160 px: crossarm, white insulators, wires sagging to the next pole
  for (let x = 40; x < SIDE_W + 40; x += 160) {
    const y0 = bank(x)
    c.rect(x, 4, 2, y0 - 4, "x"); c.vline(x + 1, 4, y0 - 4, "X")
    c.hline(x - 6, 8, 14, "X"); for (const dx of [-5, -1, 3, 7]) c.px(x + dx, 7, "o")
    for (const dx of [-5, 3]) c.wire(x + dx, 8, x + 160 + dx, 8, 7, "y")
  }
})

// ---------------------------------------------------------------- grass in front (1920 a loop)
// The bank nearest the eye, going by too fast to see: streaks of green, a clump of tall grass now and
// then, flowers as a dash of color.
const FG_W = 640
sprite("_fg", { w: FG_W, h: 30, wrap: "x" }, (c) => {
  const r = rng(31)
  c.rect(0, 8, FG_W, 22, "t")
  for (let x = 0; x < FG_W; x++) { const y = 8 + Math.round(waves(x, FG_W, [[6, 1, 0], [17, 0.8, 1]])); c.px(x, y, "l"); c.px(x, y + 1, "T") }
  // streaks: the grass smeared along by the speed
  for (let i = 0; i < 240; i++) { const x = Math.floor(r() * FG_W), y = 11 + Math.floor(r() * 18); c.hline(x, y, 6 + Math.floor(r() * 18), y < 16 ? "T" : r() < 0.5 ? "T" : "l") }
  for (let i = 0; i < 18; i++) { const x = Math.floor(r() * FG_W), y = 10 + Math.floor(r() * 16); c.hline(x, y, 4 + Math.floor(r() * 6), r() < 0.5 ? "L" : "K") }
  // a clump of tall grass now and then, below the wheels' hubs
  for (let i = 0; i < 9; i++) {
    const x0 = Math.floor(r() * FG_W), n = 5 + Math.floor(r() * 5), tall = 5 + r() * 6
    for (let k = 0; k < n; k++) c.line(x0 + k, 10, Math.round(x0 + k + (k / n - 0.5) * 5), Math.round(10 - tall * (0.6 + r() * 0.4)), k % 3 ? "T" : "l")
  }
})

// ---------------------------------------------------------------- the train
// Engine, tender and two coaches, facing right. The drivers turn DRIVE times a loop, about as far as
// the land goes by (1280 px for wheels 7 px across the radius); the small wheels SMALL times.
const DRIVE = 29, SMALL = 51
const DRIVERS = [236, 252, 268], AXLE = RAIL - 8
// a driving wheel: black tire, red center with spokes and a counterweight opposite the crank pin
function driver(c, cx, cy, th) {
  c.circ(cx, cy, 7, "k"); c.circ(cx, cy, 6, "1")
  for (let i = 0; i < 8; i++) { const a = th + (i / 8) * TAU; c.line(cx, cy, Math.round(cx + Math.cos(a) * 5), Math.round(cy + Math.sin(a) * 5), "2") }
  for (let i = -3; i <= 3; i++) { const a = th + Math.PI + i * 0.22; c.line(Math.round(cx + Math.cos(a) * 3), Math.round(cy + Math.sin(a) * 3), Math.round(cx + Math.cos(a) * 5), Math.round(cy + Math.sin(a) * 5), "2") }
  c.px(cx, cy, "3"); c.px(cx - 5, cy - 5, "d"); c.px(cx - 6, cy - 3, "d")
}
function smallWheel(c, cx, cy, th) {
  c.circ(cx, cy, 4, "k"); c.circ(cx, cy, 3, "c")
  for (let i = 0; i < 4; i++) { const a = th + (i / 4) * TAU; c.px(Math.round(cx + Math.cos(a) * 2), Math.round(cy + Math.sin(a) * 2), "d") }
  c.px(cx, cy, "a"); c.px(cx - 3, cy - 2, "d")
}
function coach(c, x0, f, seed) {
  const r = rng(seed), x1 = x0 + 90, th = (f / FRAMES) * SMALL * TAU
  for (const bx of [x0 + 10, x0 + 70]) { c.rect(bx - 2, AXLE + 1, 16, 3, "k"); smallWheel(c, bx, RAIL - 4, th); smallWheel(c, bx + 11, RAIL - 4, th + 1) }
  // the body: maroon planking, a cream band with the windows, the roof rounded at its ends
  c.rect(x0, 118, 90, 30, "5"); c.hline(x0, 133, 90, "6")
  for (let x = x0 + 3; x < x1; x += 4) c.vline(x, 135, 12, "2")
  c.rect(x0, 120, 90, 13, "7"); c.hline(x0, 120, 90, "8"); c.hline(x0, 132, 90, "8")
  c.rect(x0 - 1, 112, 92, 6, "c"); c.hline(x0, 111, 90, "d"); c.hline(x0 + 2, 110, 86, "a"); c.hline(x0 - 2, 117, 94, "k")
  c.rect(x0, 146, 90, 3, "k")
  // end platforms with railings and steps
  for (const px of [x0 - 6, x1]) { c.rect(px, 144, 6, 2, "k"); c.vline(px + (px < x0 ? 0 : 5), 129, 15, "k"); c.hline(px, 131, 6, "k"); c.vline(px + 2, 146, 6, "c") }
  // windows: dark glass with someone at most of them, the sky's glint at the top corner
  for (let i = 0; i < 8; i++) {
    const wx = x0 + 4 + i * 11
    c.rect(wx, 122, 7, 9, "9"); c.px(wx + 5, 122, "0"); c.px(wx + 6, 123, "0")
    if (r() < 0.8) {
      const skin = r() < 0.5 ? "S" : "U"
      c.rect(wx + 2, 125, 3, 3, skin); c.hline(wx + 2, 124, 3, r() < 0.5 ? "N" : "k"); c.rect(wx + 1, 128, 5, 3, r() < 0.5 ? "b" : r() < 0.5 ? "1" : "o")
    }
  }
}
// a child at a window waving: a hand going up and down, 8 frames a wave
function waver(c, x, f) {
  const up = Math.floor(f / 4) % 2
  c.vline(x + 6, 124 - up * 2, 4, "S"); c.px(x + 6, 123 - up * 2, "S")
}
// the balloon stack of a wood burner, a cone wide at the top over a pipe
const STACK = [[0, 7, 5], [1, 7, 6], [2, 7, 7], [3, 7, 7], [4, 7, 7], [5, 7, 6], [6, 7, 5], [7, 7, 4], [8, 8, 3]]
function engine(c, f) {
  const th = (f / FRAMES) * DRIVE * TAU, ths = (f / FRAMES) * SMALL * TAU
  // tender: a black tank with red lining, firewood heaped on it, two trucks
  for (const bx of [186, 202]) { c.rect(bx - 2, AXLE + 1, 15, 3, "k"); smallWheel(c, bx, RAIL - 4, ths); smallWheel(c, bx + 10, RAIL - 4, ths + 1) }
  c.rect(180, 124, 37, 24, "k"); c.hline(180, 124, 37, "a"); c.hline(180, 125, 37, "d"); c.rect(182, 129, 33, 1, "1"); c.rect(182, 143, 33, 1, "1")
  for (let i = 0; i < 12; i++) { const lx = 181 + i * 3, ly = 118 + Math.round(2 * Math.sin(i * 1.7)); c.rect(lx, ly, 3, 124 - ly, i % 2 ? "u" : "r"); c.px(lx + 1, ly, "8") }
  c.rect(176, 140, 5, 2, "c")
  // the cab: black, a red stripe, a brass plate, a window with the driver, the roof overhanging
  c.rect(220, 112, 30, 34, "k"); c.vline(220, 112, 34, "c"); c.rect(220, 137, 30, 2, "1")
  c.rect(226, 116, 13, 11, "9"); c.px(237, 116, "0"); c.px(238, 117, "0")
  c.rect(230, 120, 4, 3, "S"); c.hline(229, 119, 6, "b"); c.hline(230, 118, 4, "b"); c.rect(229, 123, 6, 4, "b"); c.px(234, 124, "S")
  c.rect(228, 130, 11, 4, "4"); c.hline(228, 130, 11, "3")
  c.hline(219, 106, 33, "d"); c.hline(218, 107, 35, "a"); c.rect(217, 108, 37, 2, "c"); c.hline(218, 110, 35, "k")
  c.vline(250, 103, 4, "3"); c.px(250, 102, "4")
  // the boiler: a black cylinder lit along its top, brass bands, the domes and the bell
  const shade = ["k", "d", "a", "d", "c", "c", "c", "k", "k", "k", "k", "k", "k", "k", "k", "k", "c", "c", "k"]
  shade.forEach((k, i) => c.hline(250, 121 + i, 41, k))
  for (const bx of [260, 276, 288]) { c.vline(bx, 121, 19, "4"); c.px(bx, 123, "3") }
  c.rect(266, 113, 9, 8, "3"); c.rect(267, 112, 7, 1, "3"); c.vline(274, 113, 8, "4"); c.hline(265, 120, 11, "4"); c.px(268, 114, "%")
  c.rect(255, 116, 6, 5, "k"); c.hline(256, 115, 4, "c"); c.px(256, 116, "d"); c.hline(254, 120, 8, "c")
  c.rect(281, 116, 3, 4, "3"); c.px(282, 115, "4"); c.px(281, 116, "%"); c.hline(280, 120, 5, "4")
  // smokebox: the front, a little wider; the headlamp on it; the balloon stack
  c.rect(291, 119, 13, 22, "k"); c.hline(291, 120, 13, "d"); c.hline(291, 121, 13, "a"); c.vline(303, 121, 19, "c")
  for (const y of [124, 130, 136]) c.px(292, y, "d")
  c.rect(297, 111, 8, 8, "k"); c.rect(305, 112, 2, 6, "%"); c.hline(297, 111, 8, "3"); c.hline(296, 110, 10, "4"); c.vline(297, 112, 7, "c")
  for (const [dy, x0, w] of STACK) c.hline(292 - (w - 3), 94 + dy, w * 2, "k")
  c.rect(293, 103, 6, 16, "k"); c.vline(293, 103, 16, "d")
  c.hline(287, 93, 14, "c"); c.hline(286, 94, 16, "d"); for (const [dy] of STACK.slice(1, 6)) c.px(287 + Math.abs(dy - 3) - 1, 94 + dy, "d")
  // running board, cylinder, buffer beam and the cowcatcher
  c.rect(244, 140, 62, 2, "c"); c.hline(244, 142, 62, "1")
  c.rect(291, 143, 13, 7, "k"); c.hline(291, 143, 13, "d"); c.vline(291, 143, 7, "4"); c.vline(303, 143, 7, "4")
  c.rect(304, 139, 8, 5, "1"); c.hline(304, 139, 8, "6")
  for (let i = 0; i < 5; i++) c.line(304 + i * 2, 144, 306 + i * 3, RAIL - 1, i % 2 ? "2" : "1")
  c.hline(304, RAIL - 1, 15, "2")
  // pony wheel, then the drivers and their rods
  smallWheel(c, 298, RAIL - 4, ths)
  for (const x of DRIVERS) driver(c, x, AXLE, th)
  const pin = (x) => [Math.round(x + Math.cos(th) * 4), Math.round(AXLE + Math.sin(th) * 4)]
  const [p0, p1, p2] = DRIVERS.map(pin)
  c.line(...p0, ...p2, "a", 2); c.line(...p0, ...p2, "d")
  // the main rod from the crosshead, sliding along its guide, to the front driver's pin
  const chx = p2[0] + 18
  c.hline(280, AXLE - 3, 11, "a"); c.line(...p2, chx, AXLE - 2, "d", 2); c.line(...p2, chx, AXLE - 2, "a"); c.rect(chx - 1, AXLE - 4, 3, 4, "c")
  for (const p of [p0, p1, p2]) c.px(...p, "3")
}

// ---------------------------------------------------------------- smoke
// A puff every frame from the stack. Its air doesn't move, so it falls behind as the train goes on:
// at first it keeps some of the stack's speed, then trails at the train's. It rises, swells and thins
// out in dither; dark and dense near the stack, pale where it has spread.
const SPEED = 1280 / FRAMES, LIFE = 38
function smoke(c, f) {
  for (let age = LIFE - 1; age >= 0; age--) {
    const id = (((f - age) % FRAMES) + FRAMES) % FRAMES, rr = rng(500 + id)
    const back = SPEED * (age - 5 * (1 - Math.exp(-age / 5))), rise = 30 * (1 - Math.exp(-age / 14)) + rr() * 4
    const p = { x: 294 - back + (rr() - 0.5) * 5, y: 92 - rise - (rr() - 0.5) * 4, r: 3 + age * 0.26 + rr() * 2, age, id }
    const fade = 1 - age / LIFE
    for (let y = Math.floor(p.y - p.r); y <= p.y + p.r; y++)
      for (let x = Math.floor(p.x - p.r); x <= p.x + p.r; x++) {
        if (x < 0 || x >= W || y < 0) continue
        const dx = (x + 0.5 - p.x) / p.r, dy = (y + 0.5 - p.y) / p.r
        const edge = 1 - dx * dx - dy * dy + (vnoise(x * 0.3 + id * 1.7, y * 0.3) - 0.5) * 0.6
        if (edge <= 0 || Math.min(1, 2 * fade ** 1.4) * Math.min(1, edge * 2.5) < bayer(x, y)) continue
        // lit from the upper left; dark while fresh near the stack
        const lit = -dx * 0.6 - dy * 0.8
        c.px(x, y, age < 7 ? (lit > 0.3 ? "=" : "$") : lit > 0.3 ? "Y" : lit > -0.3 ? "V" : age < 18 ? "$" : "=")
      }
  }
}

// ---------------------------------------------------------------- the loop
// each plane: its strip placed at its offset, and again a strip-width on, so it always covers
const strip = (c, name, w, per, y, f) => { const o = moved(f, per) % w; for (let x = -o; x < W; x += w) c.stamp(name, x, y) }
anim("train", { w: W, h: H, frames: FRAMES, fps: FPS },
  (c) => c.stamp("_sky", 0, 0),
  (c) => clouds(c, c.frame),
  (c) => farRidge(c, c.frame),
  (c) => strip(c, "_hills", W, 320, HILLS_Y, c.frame),
  (c) => strip(c, "_near", NEAR_W, 640, NEAR_Y, c.frame),
  (c) => strip(c, "_side", SIDE_W, 1280, SIDE_Y, c.frame),
  // the rails stand still with the train: head and web
  rect(0, RAIL, W, 1, "i"), rect(0, RAIL + 1, W, 1, "I"),
  (c) => { coach(c, -14, c.frame, 3); coach(c, 82, c.frame, 7); waver(c, 82 + 4 + 6 * 11, c.frame); engine(c, c.frame) },
  (c) => smoke(c, c.frame),
  (c) => strip(c, "_fg", FG_W, 1920, H - 30 + 8, c.frame))
