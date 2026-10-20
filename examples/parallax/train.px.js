// Parallax: a maria-fumaça crossing the hills of Minas on a misty morning. The camera rides along with
// the train, so the train stands still and the land runs past behind it, each plane at its own speed:
// the far ridge barely moves, the hills a little, the pasture more, the trackside fast, the grass in
// front a blur. Every plane is a strip that wraps in x and goes round a whole number of times in the
// loop, so the last frame runs into the first.
//
// planes, far to near (px a loop; the loop is 192 frames, 12 s), each a scroll():
//   sky       still
//   clouds    pxl's clouds(): slots 48 px apart, each drifting one slot while it turns into the next
//   ridge     32: too slow for a strip to go round, so its outline drifts one step and crossfades
//   hills     320 (one strip, once round)       pasture   640      trackside 1280      grass 1920
// the train: drivers that turn a whole number of times, rods on their crank pins, its smoke a
// plume() left behind at the ground's speed, as the air it's in stays put. In the cab the driver looks
// ahead and the fireman feeds the firebox; at the windows people lean out, a child waves.
pal({
  A: "#5f9fd9", B: "#78b0e0", C: "#97c4e8", D: "#b9d8ee",                          // sky, top to horizon
  W: "#ffffff", w: "#e4edf3", v: "#c0d2e0",                                         // clouds
  F: "#9bb0ca", f: "#b2c4da", E: "#889fbd",                                         // far ridge
  M: "#dbe7ef", m: "#cbdbe7",                                                       // mist
  H: "#86a796", h: "#9dbaa6", J: "#6f927f", j: "#5b7f6d",                           // hills, woods, araucárias
  G: "#8fbd5c", g: "#76a74c", Q: "#5f8e3f", q: "#4c7633", z: "#acd36e", ":": "#3a5e2b", // pasture, woods
  "^": "#b2c16a", "~": "#94a654",                                                   // dry grass, in shade
  o: "#f1eee6", O: "#2e2924", u: "#8d5c3b", R: "#b65a33", r: "#87401f", b: "#3e6cb4", // cows, farmhouse
  "+": "#c9449f", "&": "#ec8ccb", "!": "#86307f",                                   // ipê-roxo
  e: "#a95b36", n: "#7c4226", p: "#958f88", P: "#6f6a65", s: "#4b3627",             // earth, ballast, sleepers
  i: "#d3d7db", I: "#5c6067",                                                       // rail head, web
  x: "#6b4b34", X: "#4d3726", y: "#3b3b42",                                         // poles, wires
  t: "#2f5523", T: "#44772f", l: "#6fa53f", L: "#f0cf48", K: "#ece6f2",             // grass in front, flowers
  k: "#1b1b21", c: "#2f2f39", d: "#4b4b58", a: "#7a7a89",                           // the engine's black
  1: "#bb3a2e", 2: "#7d2219", 3: "#e3b552", 4: "#a67a2f", "%": "#fff4b8",          // red, brass, lamp
  5: "#7b2b35", 6: "#9b3c46", 7: "#ead9b1", 8: "#c3ae87", 9: "#23252d", 0: "#8fb7cf", // coach, window, glass
  S: "#c98b5f", U: "#8b5a39", N: "#3a2a20",                                         // skin, hair
  Y: "#f4f4f1", V: "#d4d4d7", "=": "#a9a9b1", $: "#7d7d87",                         // smoke
  "(": "#cf6e36", ")": "#b0542a", "[": "#86391b", "]": "#5a2611", "{": "#3a2017", "}": "#9fbfa0", // coach wood, inside, far windows
  "<": "#c97a3c", ">": "#5d616a", "/": "#8b8f99",                                   // copper, graphite
  ";": "#eab892", "|": "#bcbcc2", "-": "#b9a676", ",": "#8b7b4f", "'": "#e2c47c", "@": "#ff9b3c", // skin, gray hair, khaki, straw, firelight
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
// Near hills of pasture as in the hills of Minas: patches of drier grass and greener, the cattle's
// trails stepping along the slopes, woods filling the folds between the hills, a tree alone here and
// there with its shade, a fence, cows, a farmhouse with a blue door under a mango tree, coffee planted
// along the contour.
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
// a round crown seen from the side: dark, lit on its upper left, a dark rim underneath
function crown(c, x, y, r) {
  c.circ(x, y, r, "q"); c.circ(x - 1, y - 1, Math.max(1, r - 1), "Q"); c.hline(x - r + 1, y + r, r * 2 - 1, ":")
  c.px(x - r + 1, y - r + 2, "g"); if (r > 2) c.px(x - 1, y - r + 1, "g")
}
// the pasture's patches: noise made to close over the strip, so its end runs into its start
const pastureNoise = seamless((x, y) => fbm(x / 34, y / 34, 3), NEAR_W)
sprite("_near", { w: NEAR_W, h: 60, wrap: "x" }, (c) => {
  const topF = (x) => 16 + waves(x, NEAR_W, [[2, 5, 0.9], [5, 3, 2.1], [11, 1.2, 0.4]]), top = (x) => Math.round(topF(x))
  const r = rng(13)
  // the pasture: patches of drier grass and greener, lit on the faces turned left (toward the sun),
  // darker on those turned away and down in the folds, the crest a lit edge
  const dark = { "^": "~", G: "g", g: "Q" }
  for (let x = 0; x < NEAR_W; x++) {
    const t0 = top(x), slope = topF(x + 2) - topF(x - 2)
    for (let y = t0; y < 60; y++) {
      const depth = y - t0, n = pastureNoise(x, y * 4)
      let k = n > 0.64 ? "^" : n < 0.36 ? "G" : "g"
      if ((slope > 0.6 && depth < 16) || depth > 28) k = dark[k]
      c.px(x, y, depth === 0 ? "z" : k)
    }
  }
  // cattle trails on the steeper slopes: terraces running along the hill parallel to its crest, a
  // shadowed step under a lit lip, in pieces that bunch and wander
  for (let d = 3; d < 30; d += 3) for (let x = 0; x < NEAR_W; x++) {
    const slope = topF(x + 3) - topF(x - 3)
    if (Math.abs(slope) < 0.5 || hash(Math.floor((x + d * 13) / (9 + (d % 7))), d) > 0.66) continue
    const y = top(x) + d + Math.round(Math.sin(x / 9 + d * 1.7) * 0.8), k = c.key(x, y)
    c.px(x, y, k === "^" || k === "~" ? "~" : k === "G" ? "g" : "Q")
    if (slope < 0 && hash(x, d) < 0.5) c.px(x, y - 1, k === "^" ? "^" : "G")
  }
  // grass: short dashes of the darker tone here and there
  for (let i = 0; i < 260; i++) {
    const x = Math.floor(r() * NEAR_W), y = top(x) + 2 + Math.floor(r() * 30), k = c.key(x, y)
    if (dark[k]) c.hline(x, y, 2, dark[k])
  }
  // woods filling the folds between the hills, and a few trees alone in the pasture with their shade
  for (let x = 0; x < NEAR_W; x++) {
    const v = topF(x)
    if (![-24, -12, -6, 6, 12, 24].every((k) => topF(x + k) <= v)) continue
    const crowns = Array.from({ length: 12 }, () => { const cx = x + (r() - 0.5) * 44; return [Math.round(cx), Math.round(topF(cx) - 1 + r() * 7), 2 + Math.floor(r() * 3)] })
    for (const [cx, cy, cr] of crowns.sort((a, b) => a[1] - b[1])) crown(c, cx, cy, cr)
  }
  for (const tx of [130, 210, 430, 585]) {
    const ty = top(tx) + 6
    c.hline(tx + 1, ty + 1, 9, "Q"); c.hline(tx + 3, ty + 2, 6, "Q")
    c.vline(tx, ty - 3, 4, "X"); crown(c, tx, ty - 6, 4); crown(c, tx + 3, ty - 4, 3)
  }
  // coffee planted along the contour: rows of bushes touching each other, lit along their tops, a
  // notch where one bush meets the next, the pasture showing in the alleys between the rows
  for (let row = 0; row < 7; row++) for (let x = 470 + row * 3; x < 560 - row * 2; x++) {
    const y = top(x) + 4 + row * 3
    c.px(x, y, "q"); c.px(x, y - 1, (x + row * 2) % 5 === 0 ? "q" : "Q"); if ((x + row) % 7 === 0) c.px(x, y - 1, "g")
  }
  // a fence along the slope: posts every 9 px, a wire between them; it stops where the woods are
  const wood = (x, y) => ["q", "Q", ":"].includes(c.key(x, y))
  for (let x = 0; x < NEAR_W; x += 9) {
    const y = top(x) + 9
    if (wood(x, y - 3) || wood(x + 9, top(x + 9) + 6)) continue
    c.vline(x, y - 4, 5, "x"); c.line(x, y - 3, x + 9, top(x + 9) + 6, "X")
  }
  // cows grazing up near the crest, where they show over the train
  for (const [x0, flip, brown] of [[40, false, false], [54, true, true], [250, false, true], [380, true, false], [560, false, false], [574, true, true]]) {
    let x = x0
    while (["q", "Q", ":"].includes(c.key(x + 4, top(x + 4) + 3))) x += 7
    c.stamp(brown ? "_cow_b" : "_cow", x, top(x + 4) + 2, { flip: flip ? "x" : undefined })
  }
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
sprite("_side", { w: SIDE_W, h: 110, wrap: "x" }, (c) => {
  const r = rng(23), G0 = 80                                         // the embankment's top, in the strip
  const bank = (x) => G0 + Math.round(waves(x, SIDE_W, [[4, 2, 0.5], [13, 1.2, 2]]))
  // a cutting of red earth where the line goes through a rise
  const cut = (x) => (x > 700 && x < 860 ? Math.max(0, 22 - Math.abs(x - 780) * 0.28) : 0)
  for (let x = 0; x < SIDE_W; x++) {
    const t0 = bank(x) - Math.round(cut(x))
    for (let y = t0; y < 110; y++) {
      const d = y - t0, inCut = cut(x) > 0 && y < bank(x)
      const k = inCut ? (d < 2 ? "g" : (x + d * 2) % 7 === 0 ? "n" : "e") : d < 1 ? "z" : d < 4 ? "g" : "Q"
      c.px(x, y, k)
    }
  }
  // ballast: stones under the rails, the odd one catching the light; the sleepers' ends every 8 px
  // just under the rail's foot; the shoulder of stones running down into the grass, blades reaching
  // up over its edge
  const shoulder = (x) => 105 + Math.round(waves(x, SIDE_W, [[23, 1, 0.3], [57, 0.8, 1]]))
  for (let x = 0; x < SIDE_W; x++) for (let y = 90; y < 110; y++) {
    const h = hash(x, y)
    c.px(x, y, y >= shoulder(x) ? (h < 0.2 ? "g" : "Q") : y === 90 || h < 0.28 ? "P" : h > 0.94 ? "/" : "p")
  }
  for (let x = 0; x < SIDE_W; x += 8) { c.rect(x, 101, 5, 3, "s"); c.hline(x, 103, 5, "]") }
  for (let x = 0; x < SIDE_W; x++) if (hash(x, 31) < 0.5) { const h = 1 + Math.floor(hash(x, 32) * 3); c.vline(x, shoulder(x) - h, h, h > 2 ? "g" : "Q") }
  // grass at the ballast's edge, and the odd weed come up through the stones
  for (let x = 0; x < SIDE_W; x++) if (hash(x, 11) < 0.55) { const h = 1 + Math.floor(hash(x, 12) * 3); c.vline(x, 90 - h, h + 1, h > 2 ? "Q" : "g") }
  for (let i = 0; i < 70; i++) { const x = Math.floor(r() * SIDE_W), y = 92 + Math.floor(r() * 3); c.px(x, y, "g"); c.px(x + 1, y - 1, "Q"); c.px(x - 1, y - 1, "g") }
  // the embankment's grass: short dark dashes, a few flowers
  for (let i = 0; i < 500; i++) { const x = Math.floor(r() * SIDE_W), y = bank(x) + 3 + Math.floor(r() * 7); if (c.key(x, y) === "Q") c.hline(x, y, 2, r() < 0.3 ? "g" : "q") }
  for (let i = 0; i < 60; i++) { const x = Math.floor(r() * SIDE_W), y = bank(x) + 2 + Math.floor(r() * 6); if (c.key(x, y) === "Q") c.px(x, y, r() < 0.4 ? "K" : r() < 0.6 ? "L" : "+") }
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
  // an ipê-roxo in flower, bare of leaves: a trunk forking into dark branches that open like an
  // umbrella, the flowers in small clusters at their tips, the sky showing between them
  const ix = 250, iy = bank(ix), tips = []
  const branch = (x, y, a, len, depth) => {
    const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len
    c.line(Math.round(x), Math.round(y), Math.round(ex), Math.round(ey), "X", depth > 2 ? 2 : 1)
    if (depth === 0) { tips.push([ex, ey]); return }
    for (const da of [-0.45 - r() * 0.2, 0.4 + r() * 0.25]) branch(ex, ey, a + da, len * (0.62 + r() * 0.12), depth - 1)
    if (depth < 3) tips.push([ex, ey])
  }
  c.line(ix, iy, ix - 1, iy - 14, "X", 2)
  for (const a of [-2.3, -1.85, -1.3, -0.85]) branch(ix - 1, iy - 14, a + (r() - 0.5) * 0.2, 9 + r() * 3, 3)
  for (const [tx, ty] of tips) for (let k = 0; k < 5; k++) {
    const x = Math.round(tx + (r() - 0.5) * 4), y = Math.round(ty + (r() - 0.5) * 3)
    c.px(x, y, "+"); c.px(x + 1, y, "+"); c.px(x, y + 1, "!"); if (r() < 0.5) c.px(x - 1, y - 1, "&")
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
  const r = rng(31), edge = (x) => 5 + Math.round(waves(x, FG_W, [[6, 1.2, 0], [17, 0.9, 1], [43, 0.6, 2]]))
  for (let x = 0; x < FG_W; x++) { const e = edge(x); c.vline(x, e, 2, "T"); c.vline(x, e + 2, 30 - e - 2, "t") }
  // blades: thin strokes in three greens, short and close in the bank and longer along its edge,
  // leaning back a little with the speed
  for (let i = 0; i < 2400; i++) {
    const x = Math.floor(r() * FG_W), e = edge(x), y = e + Math.floor(r() * (30 - e)), len = 2 + Math.floor(r() * (y < e + 4 ? 6 : 3))
    c.line(x, y, x - Math.round(len * 0.3), y - len, y < e + 3 ? (r() < 0.5 ? "l" : "T") : r() < 0.25 ? "l" : r() < 0.6 ? "T" : ":")
  }
  // flowers: a dot of white, yellow or the maria-sem-vergonha's pink
  for (let i = 0; i < 50; i++) { const x = Math.floor(r() * FG_W), y = edge(x) + Math.floor(r() * 12); c.px(x, y, r() < 0.4 ? "K" : r() < 0.6 ? "L" : "+"); if (r() < 0.5) c.px(x + 1, y, "K") }
  // a clump of tall grass now and then, its seed heads dry and pale, below the wheels' hubs
  for (let i = 0; i < 12; i++) {
    const x0 = Math.floor(r() * FG_W), n = 5 + Math.floor(r() * 6), tall = 6 + r() * 6
    for (let k = 0; k < n; k++) {
      const tx = Math.round(x0 + k + (k / n - 0.5) * 6), ty = Math.round(edge(x0) - tall * (0.6 + r() * 0.4))
      c.line(x0 + k, edge(x0) + 1, tx, ty, k % 3 ? "T" : "l")
      if (r() < 0.35) { c.px(tx, ty - 1, "^"); c.px(tx, ty - 2, "~") }
    }
  }
})

// ---------------------------------------------------------------- the train
// After the Oeste de Minas engines (Baldwin 2-8-0s on the 76 cm gauge, in black with red wheels and
// polished rods): a tall straight stack on a graphite smokebox, the headlamp with its red
// number plate, two round domes and a bell, a handrail and copper pipes along the boiler, four coupled
// drivers and a pony wheel, a red slatted pilot; the cab's window framed in red, its number plate
// edged in white. The tender: firewood behind a railing, the number big in white in a framed panel,
// two trucks. The coaches: varnished wood, a small pane over each window, the windows let down, the
// far side's windows showing through, boarding below, a monogram, truss rods under the frame.
// The drivers turn DRIVE times a loop, about the 1280 px the land goes by over their 6 px radius; the
// small wheels SMALL times.
const DRIVE = 34, SMALL = 51
const DRIVERS = [238, 252, 266, 280], AXLE = RAIL - 7
// a driving wheel: black tire, red center with spokes and a counterweight opposite the crank pin
function drivingWheel(c, cx, cy, th) {
  c.circ(cx, cy, 6, "k"); c.circ(cx, cy, 5, "1")
  for (let i = 0; i < 10; i++) { const a = th + (i / 10) * TAU; c.line(cx, cy, Math.round(cx + Math.cos(a) * 4), Math.round(cy + Math.sin(a) * 4), "2") }
  // the counterweight: a solid crescent opposite the pin
  const ca = th + Math.PI
  for (let y = cy - 5; y <= cy + 5; y++) for (let x = cx - 5; x <= cx + 5; x++) {
    const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy)
    if (d <= 4.6 && d >= 1.5 && dx * Math.cos(ca) + dy * Math.sin(ca) > 1.8) c.px(x, y, "2")
  }
  c.rect(cx - 1, cy - 1, 3, 3, "k"); c.px(cx, cy, "a")
  // the steel tire, lit along its top
  c.px(cx - 1, cy - 6, "a"); c.px(cx - 2, cy - 6, "d"); c.px(cx - 4, cy - 5, "d"); c.px(cx - 5, cy - 4, "d")
}
function smallWheel(c, cx, cy, th) {
  c.circ(cx, cy, 4, "k"); c.circ(cx, cy, 3, "c")
  for (let i = 0; i < 4; i++) { const a = th + (i / 4) * TAU; c.px(Math.round(cx + Math.cos(a) * 2), Math.round(cy + Math.sin(a) * 2), "d") }
  c.px(cx - 1, cy - 4, "a"); c.px(cx - 2, cy - 4, "d"); c.px(cx - 3, cy - 3, "d")
}
// a truck after the old arch-bar ones: the side frame outside the wheels, its axle boxes over their
// hubs, an arch bar over the boxes and a tie bar under them, the bolster riding on springs in the
// middle with the car resting on its center plate
function truck(c, x, th) {
  const ay = RAIL - 4
  smallWheel(c, x, ay, th); smallWheel(c, x + 11, ay, th + 1)
  c.line(x - 1, ay - 2, x + 2, ay - 5, "k"); c.hline(x + 2, ay - 5, 8, "k"); c.line(x + 9, ay - 5, x + 12, ay - 2, "k"); c.hline(x + 2, ay - 6, 8, "d")
  c.hline(x - 1, ay + 2, 14, "k")
  for (const bx of [x, x + 11]) { c.rect(bx - 2, ay - 2, 4, 4, "k"); c.hline(bx - 2, ay - 2, 4, "d"); c.px(bx - 1, ay, "c") }
  c.rect(x + 4, ay - 4, 3, 6, "k"); c.px(x + 4, ay - 3, "a"); c.px(x + 5, ay - 2, "a"); c.px(x + 4, ay - 1, "a")
  c.rect(x + 2, ay - 7, 8, 2, "k")
}

// ---- people. A head is 4 px across; `skin` is [light, shade], `hair` a key; they look out at us.
const SKINS = [[";", "S"], ["S", "U"], ["u", "n"], ["U", "n"]]
function head(c, x, y, skin, hair, { long = false, hat = false, flutter = 0 } = {}) {
  c.rect(x, y, 4, 4, skin[0]); c.vline(x + 3, y + 1, 3, skin[1])
  c.px(x + 1, y + 1, "k"); c.px(x + 3, y + 1, "k")                                       // eyes
  c.hline(x, y - 1, 4, hair); c.px(x, y, hair)
  if (long) { c.vline(x - 1, y, 5 + flutter, hair); c.vline(x - 2, y + 1, 2 + flutter, hair); if (flutter) c.px(x - 3, y + 2, hair) }
  if (hat) { c.hline(x - 2, y - 1, 8, "'"); c.rect(x, y - 3, 4, 2, "'"); c.hline(x, y - 2, 4, "4") }
}
// someone at a window, leaning on the sill (y): shoulders, the forearms along the sill
function passenger(c, x, sill, p, f) {
  const [skin, hair, shirt] = [SKINS[p.skin], p.hair, p.shirt]
  if (p.kid) {
    // a child, head out over the sill, waving if asked
    head(c, x + 2, sill - 5, skin, hair)
    c.rect(x + 1, sill - 1, 6, 2, shirt)
    if (p.wave) { const up = Math.floor(f / 4) % 2; c.vline(x + 7, sill - 5 - up * 2, 4, skin[0]); c.px(x + 8, sill - 6 - up * 2, skin[0]) }
    return
  }
  head(c, x + 2, sill - 9, skin, hair, { long: p.long, hat: p.hat, flutter: p.long ? Math.floor(f / 3) % 2 : 0 })
  c.rect(x + 1, sill - 5, 7, 5, shirt); if (p.stripes) for (let y = sill - 4; y < sill; y += 2) c.hline(x + 1, y, 7, p.stripes)
  c.vline(x + 7, sill - 5, 5, p.shade ?? "k")
  c.hline(x, sill, 9, skin[0]); c.px(x + 8, sill, skin[1])                                // forearms
}
// the coaches' people, window by window (null: nobody at it)
const PEOPLE = [
  { skin: 1, hair: "k", shirt: "o", stripes: "b" }, null, { pair: [{ skin: 0, hair: "8", shirt: "&" }, { skin: 2, hair: "k", shirt: "g" }] },
  { kid: true, wave: true, skin: 0, hair: "N", shirt: "L" }, { skin: 3, hair: "k", shirt: "1", long: true }, { skin: 0, hair: "|", shirt: "o", hat: true },
  null, { skin: 2, hair: "N", shirt: "&", long: true }, { kid: true, skin: 1, hair: "k", shirt: "b" }, { skin: 0, hair: "N", shirt: "b", shade: "y" },
]

// ---- a wooden coach, x0 to x0 + 124
const COACH = 124
function coach(c, x0, f, people) {
  const x1 = x0 + COACH, th = (f / FRAMES) * SMALL * TAU
  // under the frame: the trucks, and truss rods sagging between them
  for (const bx of [x0 + 8, x0 + 104]) truck(c, bx, th)
  c.line(x0 + 26, 151, x0 + 42, 154, "c"); c.hline(x0 + 42, 154, 40, "c"); c.line(x0 + 82, 154, x0 + 98, 151, "c")
  c.vline(x0 + 42, 151, 3, "k"); c.vline(x0 + 82, 151, 3, "k"); c.rect(x0 + 1, 149, COACH - 2, 2, "k")
  // the roof: pale, rounded at its edge, its eaves overhanging; the lamp vents on top
  c.hline(x0 + 6, 115, COACH - 12, "8"); c.hline(x0 + 2, 116, COACH - 4, "7"); c.rect(x0, 117, COACH, 3, "7")
  c.hline(x0 - 1, 120, COACH + 2, "8"); c.hline(x0 - 2, 121, COACH + 4, "]")
  for (let x = x0 + 14; x < x1 - 10; x += 32) { c.rect(x, 113, 3, 2, "8"); c.px(x + 1, 112, "d") }
  // the body: letterboard, the window band, the belt rail, boarding below
  c.rect(x0, 122, COACH, 27, ")"); c.hline(x0, 122, COACH, "(")
  c.hline(x0, 138, COACH, "("); c.hline(x0, 139, COACH, "[")
  for (let x = x0 + 2; x < x1; x += 3) c.vline(x, 141, 7, "[")
  c.hline(x0, 148, COACH, "]"); c.vline(x0, 122, 27, "("); c.vline(x1 - 1, 122, 27, "[")
  // the monogram, in yellow, in the middle of the boarding
  const mx = x0 + COACH / 2 - 2
  c.rect(mx, 141, 5, 5, ")"); c.ring(mx + 2, 143, 2, "L"); c.vline(mx + 2, 142, 3, "L"); c.px(mx + 1, 142, "L"); c.px(mx + 3, 142, "L")
  // ten windows: a small pane above, the window let down, someone leaning on the sill or the far
  // side's windows showing through
  for (let i = 0; i < 10; i++) {
    const wx = x0 + 3 + i * 12, p = people[i]
    c.rect(wx, 124, 9, 3, "0"); c.hline(wx, 124, 9, "/"); c.hline(wx, 127, 9, "[")
    c.rect(wx, 128, 9, 10, "{"); c.rect(wx + 2, 129, 5, 4, "}"); c.vline(wx + 8, 128, 10, "]")
    if (!p) continue
    if (p.pair) { passenger(c, wx - 1, 137, p.pair[0], f); passenger(c, wx + 3, 137, p.pair[1], f) } else passenger(c, wx, 137, p, f)
  }
  // open end platforms: floor, railing, steps
  for (const px of [x0 - 7, x1]) {
    c.rect(px, 147, 7, 2, "k"); c.hline(px, 133, 7, "k"); for (const dx of [0, 3, 6]) c.vline(px + dx, 133, 14, dx === 3 ? "c" : "k")
    c.vline(px + (px < x0 ? 1 : 5), 149, 6, "c"); c.hline(px + (px < x0 ? 0 : 4), 152, 3, "c"); c.hline(px + (px < x0 ? 0 : 4), 155, 3, "c")
  }
}
// the conductor on the platform: cap, blue coat, a hand on the rail
function conductor(c, x) {
  c.rect(x, 128, 4, 4, ";"); c.vline(x + 3, 129, 3, "S"); c.px(x + 2, 129, "k")
  c.rect(x - 1, 126, 5, 2, "b"); c.hline(x - 1, 127, 6, "k"); c.px(x + 1, 126, "3")
  c.rect(x - 1, 132, 6, 10, "b"); c.vline(x + 4, 132, 10, "y"); c.vline(x + 1, 133, 6, "3")
  c.rect(x, 142, 2, 5, "y"); c.rect(x + 3, 142, 2, 5, "y"); c.px(x + 5, 134, ";")
}

// ---- the engine and its tender
function tender(c, f) {
  const ths = (f / FRAMES) * SMALL * TAU
  truck(c, 152, ths); truck(c, 183, ths)
  // the tank: black, its top edge lit, a white panel with the number, a step at each end
  c.rect(146, 124, 57, 25, "k"); c.hline(146, 124, 57, "a"); c.hline(146, 125, 57, "d"); c.hline(146, 148, 57, "c")
  c.box(151, 129, 47, 15, "o")
  c.text(165, 132, "41", "o", { scale: 2 })
  for (let x = 149; x < 202; x += 5) c.px(x, 146, "d")
  // firewood heaped behind a railing on top
  for (let i = 0; i < 17; i++) { const lx = 148 + i * 3, ly = 113 + Math.round(1.5 * Math.sin(i * 1.9)); c.rect(lx, ly, 3, 124 - ly, i % 2 ? "u" : "r"); c.px(lx + 1, ly, "8"); if (i % 3 === 0) c.px(lx + 1, ly + 3, "8") }
  c.hline(147, 116, 55, "k"); c.hline(147, 115, 55, "d"); for (let x = 148; x < 202; x += 6) c.vline(x, 115, 9, "k")
  // the hand-brake wheel at the front, and the plate across to the cab
  c.vline(200, 112, 12, "c"); c.hline(198, 112, 5, "a"); c.rect(201, 140, 8, 2, "c")
}
function engine(c, f) {
  const th = (f / FRAMES) * DRIVE * TAU, ths = (f / FRAMES) * SMALL * TAU
  // the cab: black planking, the window framed in red, the number plate edged in white, the roof
  c.rect(208, 102, 31, 39, "k"); for (let x = 219; x < 237; x += 4) c.vline(x, 133, 7, "c")
  c.rect(210, 106, 7, 35, "9"); c.vline(209, 104, 37, "d"); c.vline(217, 106, 35, "c")
  c.vline(238, 103, 38, "c"); c.vline(237, 104, 36, "d")
  c.rect(221, 106, 15, 15, "1"); c.rect(222, 107, 13, 13, "9"); c.hline(221, 120, 15, "2")
  c.rect(219, 123, 19, 8, "o"); c.rect(220, 124, 17, 6, "k"); c.text(224, 124, "41", "o")
  c.hline(207, 97, 33, "c"); c.hline(205, 98, 37, "a"); c.rect(204, 99, 39, 2, "k"); c.hline(204, 101, 39, "c")
  c.rect(219, 95, 7, 2, "c"); c.hline(219, 95, 7, "d")
  c.vline(210, 141, 7, "c"); c.hline(209, 144, 3, "c"); c.hline(209, 147, 3, "c"); c.vline(208, 108, 30, "a")
  // inside: the fireman feeding the firebox, its door opening on an orange glow; the driver at the
  // window, looking ahead with his arm on the sill
  fireman(c, f); engineer(c)
  // the boiler: a black cylinder lit along its top, brass bands, the handrail on its stanchions
  const shade = ["k", "c", "d", "a", "d", "c", "k", "k", "k", "k", "k", "k", "k", "k", "k", "c", "c", "d", "k"]
  shade.forEach((k, i) => c.hline(239, 114 + i, 52, k))
  for (const bx of [247, 262, 277]) { c.vline(bx, 115, 17, "c"); c.px(bx, 116, "4"); c.px(bx, 117, "3"); c.px(bx, 118, "4") }
  c.hline(240, 119, 64, "a"); for (const x of [244, 258, 272, 286, 300]) c.px(x, 120, "c")
  // copper: a pipe along the boiler's foot
  c.hline(241, 131, 46, "<")
  // the domes: sand ahead, steam behind with its brass safety valves and whistle; the bell between
  const dome = (x0, w, top) => {
    c.rect(x0, top + 2, w, 115 - top - 2, "k"); c.hline(x0 + 1, top + 1, w - 2, "k"); c.hline(x0 + 2, top, w - 4, "k")
    c.vline(x0 + 1, top + 2, 111 - top, "d"); c.px(x0 + 2, top + 1, "a"); c.hline(x0 - 1, 113, w + 2, "c")
  }
  dome(250, 10, 103); dome(271, 9, 105)
  c.rect(254, 100, 2, 3, "3"); c.px(254, 99, "%"); c.rect(257, 101, 2, 2, "4"); c.vline(252, 97, 6, "3"); c.px(252, 96, "%")
  c.rect(264, 108, 4, 4, "3"); c.hline(263, 111, 6, "4"); c.px(264, 108, "%"); c.vline(265, 106, 2, "k")
  // the air pump on the boiler's side
  c.rect(283, 121, 4, 11, "k"); c.vline(283, 121, 11, "d"); c.hline(283, 120, 4, "3")
  // smokebox in graphite, rivets round its front; the stack tall and straight with its cap
  const graphite = ["c", "/", "/", ">", ">", ">", ">", ">", "d", "d", "d", "d", "d", "d", "d", "d", "d", "d", ">", ">", "c", "k"]
  graphite.forEach((k, i) => c.hline(290, 112 + i, 16, k)); c.vline(305, 113, 21, "c"); c.vline(290, 112, 22, "c")
  for (const y of [116, 120, 124, 128]) c.px(303, y, "/")
  c.rect(293, 94, 7, 18, "k"); c.vline(293, 94, 18, "d"); c.vline(294, 95, 16, "c")
  c.hline(291, 91, 11, "/"); c.rect(291, 92, 11, 2, "a"); c.hline(292, 94, 9, "c")
  // the headlamp on the smokebox's front, its number plate in red under it
  c.rect(300, 103, 8, 9, "k"); c.hline(300, 103, 8, "3"); c.vline(300, 104, 8, "c"); c.rect(308, 105, 2, 5, "%"); c.px(303, 102, "c")
  c.rect(301, 112, 7, 3, "1"); c.px(303, 113, "o"); c.px(305, 113, "o")
  // running board with its red valance; steam chest and cylinder; buffer beam and the pilot
  c.rect(212, 133, 93, 2, "c"); c.hline(212, 133, 93, "d"); c.hline(226, 135, 79, "1")
  // under the smokebox: the saddle, the steam chest on the cylinder, its covers bright, lagging bands
  c.rect(290, 134, 15, 4, "k"); c.hline(290, 134, 15, "c")
  c.rect(289, 138, 16, 4, "k"); c.hline(289, 138, 16, "d")
  c.rect(287, 142, 18, 7, "k"); c.hline(287, 142, 18, "d"); c.hline(288, 148, 16, "c")
  for (const x of [292, 299]) c.vline(x, 143, 5, "c")
  c.vline(287, 142, 7, "/"); c.vline(304, 141, 8, "/"); c.px(304, 143, "a"); c.px(304, 146, "a")
  // the buffer beam in red with its coupler; the pilot sloping down to the rails in red slats
  c.rect(305, 137, 10, 7, "1"); c.hline(305, 137, 10, "6"); c.hline(305, 143, 10, "2"); c.rect(315, 139, 3, 3, "c"); c.px(317, 140, "a")
  c.poly([305, 144, 314, 144, 320, RAIL - 1, 304, RAIL - 1], "1")
  for (let x = 306; x < 320; x += 2) { const top = x <= 314 ? 145 : Math.ceil(144 + ((x - 314) * (RAIL - 145)) / 6) + 1; c.vline(x, top, RAIL - 1 - top, "2") }
  c.line(314, 144, 320, RAIL - 1, "6"); c.hline(304, RAIL - 1, 16, "2")
  // the frame behind the wheels, filling down from the running board: leaf springs over the drivers,
  // the ash pan under the cab; the pony wheel, then the drivers and their rods
  c.rect(226, 136, 64, 9, "k"); c.rect(208, 141, 31, 4, "k"); c.hline(212, 144, 26, "c")
  for (const x of DRIVERS) { c.hline(x - 4, 139, 9, "c"); c.px(x - 4, 140, "d"); c.px(x + 4, 140, "d"); c.vline(x, 140, 3, "c") }
  smallWheel(c, 298, RAIL - 4, ths); c.line(286, 146, 296, 152, "k"); c.rect(296, 152, 4, 4, "k"); c.hline(296, 152, 4, "d")
  for (const x of DRIVERS) drivingWheel(c, x, AXLE, th)
  const pin = (x) => [Math.round(x + Math.cos(th) * 3), Math.round(AXLE + Math.sin(th) * 3)]
  const pins = DRIVERS.map(pin)
  c.line(...pins[0], ...pins[3], "d", 2); c.line(...pins[0], ...pins[3], "a")
  // the main rod from the crosshead, sliding along its guide, to the third driver's pin; the
  // eccentric rod from that pin back to the link
  const p2 = pins[2], chx = p2[0] + 20
  c.hline(279, AXLE - 4, 10, "a"); c.line(...p2, chx, AXLE - 3, "d", 2); c.line(...p2, chx, AXLE - 3, "/"); c.rect(chx - 1, AXLE - 5, 3, 4, "a")
  c.line(...p2, 272, AXLE - 9, "c"); c.rect(271, AXLE - 11, 2, 4, "k")
  for (const p of pins) c.px(...p, "3")
}
// the fireman: every 48 frames he stoops for a log from the tender and swings it into the firebox,
// whose door lets out an orange glow while it is open
function fireman(c, f) {
  const t = f % 48, glow = t >= 22 && t < 34 ? (f % 2 ? "%" : "@") : null
  const x = 211, y = 111 + (t < 12 ? 5 : t < 22 ? 2 : 0)
  if (glow) { c.rect(214, 122, 3, 14, "@"); c.vline(216, 124, 10, glow) }
  c.rect(x + 1, y, 3, 3, "S"); c.px(x + 3, y + 1, glow ? "@" : "U"); c.hline(x, y - 1, 4, "k"); c.px(x + 3, y - 1, "c")
  c.rect(x, y + 3, 5, 140 - y - 3, "y"); c.vline(x + 4, y + 3, 140 - y - 3, glow ? "@" : "c")
  // the log, from the tender to the firebox
  if (t >= 12 && t < 28) { c.rect(x + 2, y + 4, 5, 2, "u"); c.px(x + 6, y + 4, "8") }
}
// the driver at the window, looking ahead: grey hair and mustache, khaki shirt, an arm on the sill
function engineer(c) {
  const x = 229, y = 109
  c.rect(x, y, 4, 4, ";"); c.px(x + 4, y + 1, ";"); c.vline(x, y + 1, 3, "S")
  c.hline(x, y - 1, 4, "|"); c.vline(x - 1, y, 3, "|"); c.px(x + 3, y + 1, "k"); c.hline(x + 2, y + 3, 3, "|")
  c.rect(x - 2, y + 4, 7, 7, "-"); c.vline(x - 2, y + 4, 7, ","); c.hline(x - 1, y + 6, 4, ",")
  c.hline(x + 1, 120, 8, "-"); c.hline(x + 6, 120, 3, ";"); c.px(x + 8, 119, ";")
}

// ---------------------------------------------------------------- the loop
// the rails stand still with the train: the head lit on top, the web, the foot; their joints go by
// with the land, a bolted plate every 80 px
function rails(c, f) {
  c.rect(0, RAIL, W, 1, "i"); c.rect(0, RAIL + 1, W, 1, "a"); c.rect(0, RAIL + 2, W, 1, "I"); c.rect(0, RAIL + 3, W, 1, "d")
  for (let x = -(moved(f, 1280) % 80); x < W + 4; x += 80) { c.rect(x - 3, RAIL + 1, 7, 3, "c"); c.px(x - 2, RAIL + 2, "a"); c.px(x + 2, RAIL + 2, "a"); c.vline(x, RAIL, 2, "I") }
}
anim("train", { w: W, h: H, frames: FRAMES, fps: FPS },
  (c) => c.stamp("_sky", 0, 0),
  clouds({ y: 30, gap: 48, w: 46, h: 11, n: 9, seed: 4, sizes: [1, 0.5, 1, 1, 0.5, 1, 0.5, 1, 0.5], empty: [2, 7], keys: "Wwv" }),
  (c) => farRidge(c, c.frame),
  scroll("_hills", HILLS_Y, 320),
  scroll("_near", NEAR_Y, 640),
  scroll("_side", SIDE_Y, 1280),
  // under the train the ballast lies in its shade, between the wheels
  recolor({ p: "P", P: "y", "/": "p", s: "]", g: "Q", Q: "q", z: "g" }, [0, 150, 312, RAIL - 150]),
  (c) => rails(c, c.frame),
  (c) => { coach(c, -COACH, c.frame, [...PEOPLE].reverse()); coach(c, 14, c.frame, PEOPLE); conductor(c, 8); tender(c, c.frame); engine(c, c.frame) },
  // smoke: a puff every frame from the stack, dark while fresh, left behind at the ground's speed
  plume(296, 89, "YV=", { every: 1, life: 38, rise: 30, wind: -1280 / FRAMES, inertia: 5, size: [3, 13], young: "=$", seed: 5 }),
  scroll("_fg", 164, 1920))
