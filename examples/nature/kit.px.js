// Nature kit: the ground and what grows and lies on it, drawn as 16-bit games draw them, for any scene
// to take with include("<path>/nature/kit.px.js", { palette: true }) (top-down, HD-2D, a level's
// scenery). The rules each piece follows, with their sources and the numbers measured on the games'
// sheets, are in the environment guide (pxl help "environment"): SLYNYRD's Pixelblog, Saint11, final
// boss blues, So You Want To Be A Pixel Artist, and pxl study on Chrono Trigger, CrossCode, Terranigma,
// Final Fantasy Tactics Advance and others. Builders make more of a kind (grassTile, pine, bush,
// rampart); the sprites made here are the defaults. The light comes from the upper left (the sun behind
// on the left in the hd2d graveyard); the textures tile and are drawn a texel to a pixel.
// grass: a yellow-green base, its darks turning blue, its light yellow (SLYNYRD's lush grass)
pal({ Q: "#23484a", q: "#3d6b42", w: "#577f3c", e: "#6c9243", r: "#a4b45a" })
ramps("Qqwer")
shades("asdf", "#8a5a36")   // trunks, planks
// pine needles: indigo in the deepest shade to a yellow-green in the sun, the hue doing much of the shading
pal({ Z: "#1d1d38", z: "#233a4c", x: "#24573f", c: "#2f6b3e", v: "#4a8240", V: "#73983f", J: "#b4b85a" })
ramps("ZzxcvVJ")
pal({ g: "#1f4a46", h: "#2f6a3e", j: "#4f8a3a", l: "#7fa046", G: "#b0bb5c" })   // bushes: teal to yellow-green
ramps("ghjlG")
pal({ D: "#2a2840", t: "#4b4660", T: "#6c6476", u: "#928694", U: "#c0b39f", E: "#e6dcbd" })   // stone: indigo in the shade,
ramps("DtTuUE")                                                                               // a mauve grey, cream in the sun
shades("mMnN", "#6f8a3a")   // moss
pal({ b: "#2a2236", B: "#4a3c4a", i: "#6f5c5a", I: "#9c8774" })   // weathered wood, grey, violet in the shade
ramps("bBiI")
pal({ p: "#e7a3c2", o: "#f1ece0", O: "#e8cf6c" })   // flowers

// Grass after SLYNYRD (Pixelblog 2, 20, 43) and final boss blues (Tiling Tiles), for a floor laid a
// texel to a pixel (camera.floor): mostly bare ground, a tone darker in broad ragged blobs; where a
// second, broader field says it grows tall, clumps: fans of three to five blades 5-7 px wide, their tips
// a tone up (one clump in four with a lit left tip, the sun behind catching it), the blue dark at their
// foot; between them small marks a tone down; no two touching (corners may), some crossing the tile's
// edges so its seams don't show. 64x48, its fields made seamless over it. `lush: false` for the wood's
// floor: no clumps, fewer marks.
const CLUMPS = [
  ["e..r..e", ".e.e.e.", ".e.e.e.", "..eee..", ".QQQQQ."],
  ["r.e..", ".ee.e", ".eee.", "QQQQ."],
  [".e..e.", "e.ee.r", ".eeee.", ".QQQ.."],
]
const grassTile = (name, { lush = true, seed = 11 } = {}) => sprite(name, { w: 64, h: 48 }, (c) => {
  const r = rng(seed), W = 64, H = 48, wx = (v) => ((v % W) + W) % W, wy = (v) => ((v % H) + H) % H, K = "Qqwer"
  const shade = seamless((x, y) => fbm(x / 13 + seed, y / 9, 3), W, H), grow = seamless((x, y) => fbm(x / 20 + 7, y / 14 + seed, 2), W, H)
  const base = (x, y) => (shade(wx(x), wy(y)) + (hash(wx(x), wy(y)) - 0.5) * 0.06 < 0.42 ? 1 : 2)
  for (let Y = 0; Y < H; Y++) for (let X = 0; X < W; X++) c.px(X, Y, K[base(X, Y)])
  const used = new Uint8Array(W * H), near = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]
  const free = (pts) => pts.every(([x, y]) => near.every(([dx, dy]) => !used[wy(y + dy) * W + wx(x + dx)]))
  const place = (pts) => { if (!free(pts)) return; pts.forEach(([X, Y, k]) => { used[wy(Y) * W + wx(X)] = 1; c.px(wx(X), wy(Y), k) }) }
  for (let n = 0; n < 700; n++) {
    const x = Math.floor(r() * W), y = Math.floor(r() * H), g = grow(wx(x), wy(y)), b = base(x, y)
    if (lush && g > 0.56) {
      // a clump, mirrored or not; on the darker ground a tone lower all through
      const C = CLUMPS[Math.floor(r() * CLUMPS.length)], flip = r() < 0.5, lit = r() < 0.25, pts = []
      C.forEach((row, j) => [...row].forEach((k, i) => {
        if (k === ".") return
        const X = x + (flip ? row.length - 1 - i : i), up = K[b + 1], tip = lit ? K[b + 2] : up
        pts.push([X, y + j, k === "Q" ? "Q" : k === "r" ? tip : up])
      }))
      place(pts)
    } else if (g > (lush ? 0.4 : 0.5) && r() < 0.35) {
      // a small mark a tone down: a stroke of 2-3 px, upright or leaning
      const lean = r() < 0.5 ? 0 : r() < 0.5 ? 1 : -1, len = 2 + (r() < 0.4 ? 1 : 0)
      place(Array.from({ length: len }, (_, i) => [x + (i === len - 1 ? lean : 0), y + i, K[b - 1]]))
    }
  }
})
grassTile("_grass")
grassTile("_turf0", { lush: false, seed: 4 })
// The wood's floor: the same ground darker and browner under the trees, so the hill's top is what the
// eye goes to.
sprite("_turf", { base: "_turf0", swap: { Q: "#22383a", q: "#36533a", w: "#465f38", e: "#566c3c" } })
// A pine after SLYNYRD's conifers (Pixelblog 44) and Saint11's vegetation: tiers that overhang the one
// below by a few px, so each side shows its notches; a tier's hem in clumps of needles hanging in points
// 2-3 px deep every 4 px, the outer ones lower; below the tier above, 2 rows in its shadow, then 3 lit on the sun's
// side (the left), then its body, toward indigo on the far side and lower down; fronds as strips 2 px
// thick running down and out, a step lighter (clusters, no lone pixels); the upper left contour in the
// lightest tone (the sun behind rims it). A trunk in three tones, roots spreading. h: its height in px.
const pine = (name, h, seed) => sprite(name, { w: 40, h, pivot: "bottom" }, (c) => {
  const r = rng(seed), W = 40, cx = 20, T = Math.max(4, Math.round(h / 12)), base = h - 5
  const th = Math.round((base - 2) / T) + 5, step = (base - 1 - th) / (T - 1)
  const tiers = Array.from({ length: T }, (_, t) => { const top = 1 + Math.round(t * step); return { top, bot: top + th - 1, half: 3.5 + ((t + 1) * 14) / T, ph: r() * 3.5 } })
  for (let t = T - 1; t >= 0; t--) {
    const { top, bot, half, ph } = tiers[t], above = t ? tiers[t - 1] : null
    for (let y = top; y <= bot + 3; y++) for (let x = 0; x < W; x++) {
      const d = x + 0.5 - cx, f = Math.min(1, (y - top) / (bot - top)), hw = 1 + (half - 1) * Math.pow(f, 0.85)
      const k = (((d + ph) % 4) + 4) % 4, clump = k < 3, drop = clump ? Math.round((2 + (Math.abs(d) > half * 0.6 ? 1 : 0)) * (1 - Math.abs(k - 1.5) / 1.5)) : 0
      if (y > bot ? !(Math.abs(d) <= half && y - bot <= drop) : Math.abs(d) > hw + (y > bot - 2 && clump ? 1 : 0)) continue
      const side = d / half, v = above && Math.abs(d) <= above.half + 1 ? y - above.bot : y - top + 3
      let L = 0.52 - 0.3 * side - 0.18 * f
      if (v >= 1 && v <= 2) L -= 0.3                                   // in the shadow of the tier above
      else if (v >= 3 && v <= 5 && side < 0.2) L += 0.16               // lit just below it, on the sun's side
      if ((((y - top - Math.abs(d) * 0.55 + ph) % 5) + 5) % 5 < 2) L += 0.09   // a frond, down and out
      if (y >= bot) L -= 0.14                                          // the hem's needles
      c.px(x, y, "ZzxcvVJ"[Math.max(0, Math.min(6, Math.round(L * 6)))])
    }
  }
  // the upper left contour rimmed by the sun behind
  for (let y = 0; y < base; y++) for (let x = 1; x < cx - 1; x++)
    if (c.get(x, y) && !c.get(x - 1, y) && !c.get(x, y - 1)) { c.px(x, y, "J"); if (c.get(x + 1, y)) c.px(x + 1, y, "V") }
  for (let y = base - 3; y < h; y++) for (let x = cx - 1; x <= cx + 1; x++) if (!c.get(x, y)) c.px(x, y, x < cx ? "d" : x === cx ? "s" : "a")
  for (const [x, k] of [[cx - 3, "s"], [cx - 2, "s"], [cx + 2, "a"], [cx + 3, "a"]]) c.px(x, h - 1, k)
}, bump("hybrid"))
pine("_pine", 68, 3)
pine("_pine_m", 60, 5)
pine("_pine_s", 52, 9)
// The same pine far off, the haze between: lighter, greyer, its hues nearer the sky's.
sprite("_pine_far", { base: "_pine_m", swap: { Z: "#3b4260", z: "#405468", x: "#4b6866", c: "#567763", v: "#6a8865", V: "#879d6c", J: "#b6bc8c" } })
// Bushes after SLYNYRD (Pixelblog 44, 51) and Saint11: lobes of leaf clusters (2x2, or 3 px in an L),
// each lobe on a fill of its dark, a dark crescent on its shadow side and a step lighter toward its lit
// one, the light tone kept to a pixel or two (they stand in the wall's shade), the back lobes a step
// darker; five tones from teal to yellow-green; the outline a shade of what it touches, not black.
// Three of them, by their lobes: [x, y, r, back].
const bush = (name, w, lobes, seed) => sprite(name, { w, h: 11, pivot: "bottom", outline: "g", selout: true }, (c) => {
  const r = rng(seed)
  for (const [x, y, rad, back] of lobes) {
    c.ellipse(Math.round(x), Math.round(y), Math.round(rad), Math.round(rad * 0.85), back ? "g" : "h")
    for (let j = -rad; j <= rad; j += 2) for (let i = -rad; i <= rad; i += 2) {
      const d = Math.hypot(i, j)
      if (d > rad - 0.5) continue
      const X = Math.round(x + i + (r() - 0.5)), Y = Math.round(y + j * 0.85 + (r() - 0.5))
      const k = "ghjlG"[Math.max(0, Math.min(3, Math.round((0.45 - (0.35 * (i + j)) / rad - 0.2 * back - 0.15 * (d / rad) ** 2) * 4)))]
      c.px(X, Y, k); c.px(X + 1, Y, k); c.px(X, Y + 1, k); if (r() < 0.6) c.px(X + 1, Y + 1, k)
    }
    c.px(Math.round(x - rad * 0.4), Math.round(y - rad * 0.5), "G")   // its one bright leaf
  }
}, bump("hybrid"))
bush("_bush", 18, [[11, 4, 3.8, 1], [5, 4.5, 3.6, 1], [8.5, 6, 4.2, 0], [3.5, 7, 2.8, 0], [14, 7, 3, 0]], 5)
bush("_bush_b", 13, [[7.5, 4.5, 3.6, 1], [4.5, 6.5, 3.4, 0], [9, 7, 3, 0]], 7)
bush("_bush_c", 22, [[6, 5, 3.6, 1], [12, 4, 4, 1], [16.5, 6, 3.4, 0], [9.5, 6.5, 4, 0], [3.5, 7.5, 2.6, 0]], 2)
// The rampart's face after SLYNYRD (Pixelblog 45), So You Want To Be A Pixel Artist (ch. 3, 6) and
// Saint11 (ruins): courses of their own heights, blocks of their own widths (48 to a course, so it
// tiles; a vertical joint in four left out); the mortar a step under the stone, not a grid of dark
// lines; a block's lip lit along the left half or more of its top, one block in three not at all; a
// corner chipped off one block in four, a pit in one in three, a crack branching through one block; the
// lowest courses darker, moss creeping up from the foot. 29 rows: the wall's 1.5 m laid a texel to a
// pixel. `overhang`: the grass of the top hanging over its head (the steps' risers have none).
const rampart = (name, overhang) => sprite(name, { w: 48, h: 29 }, (c) => {
  const r = rng(21), HS = [5, 4, 6, 4, 5, 5]
  let y = 0
  HS.forEach((h, row) => {
    let x = Math.floor(r() * 8)
    const end = x + 48, low = row >= 4
    while (x < end) {
      let w = Math.min(5 + Math.floor(r() * 5), end - x)
      if (end - x - w > 0 && end - x - w < 4) w = end - x
      const tone = low ? (r() < 0.5 ? "t" : "T") : r() < 0.3 ? "u" : "T", joint = r() < 0.75, lip = r() < 0.67 ? Math.ceil(w * (0.5 + r() * 0.3)) : 0
      const chip = r() < 0.25, pit = r() < 0.33 ? [1 + Math.floor(r() * (w - 3)), 1 + Math.floor(r() * (h - 3))] : null
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        let k = tone
        if (j === h - 1 || (i === w - 1 && joint)) k = "t"
        else if (chip && i === w - 2 && j === 0) k = "t"
        else if (j === 0 && i < lip) k = tone === "u" ? "U" : tone === "T" ? "u" : "T"
        else if (pit && i === pit[0] && j === pit[1]) k = "t"
        else if (pit && i === pit[0] && j === pit[1] + 1) k = tone === "t" ? "T" : "u"
        c.px((x + i) % 48, y + j, k)
      }
      x += w
    }
    y += h
  })
  for (const [x, y] of [[30, 10], [30, 11], [31, 12], [31, 13], [29, 12]]) c.px(x, y, "D")
  for (let X = 0; X < 48; X++) { const n = Math.floor(hash(X >> 1, 7) * 4); for (let Y = 28; Y > 28 - n; Y--) c.px(X, Y, Y === 29 - n ? "M" : "m") }
  if (overhang) for (let X = 0; X < 48; X++) {
    const len = 1 + Math.round(2 + 2 * Math.sin(X * 0.7 + 1) * Math.sin(X * 0.23)) + (hash(X, 9) < 0.15 ? 2 : 0)
    for (let Y = 0; Y < len; Y++) c.px(X, Y, Y === len - 1 ? (X % 2 ? "e" : "w") : Y === len - 2 ? "w" : "q")
    c.px(X, len, "t")
  }
})
rampart("_rampart", true)
rampart("_riser", false)
// Flagstones after final boss blues' cobbles and So You Want To Be A Pixel Artist (ch. 6): slabs of
// mixed sizes (the texels nearest one of 22 points scattered over the tile, measured round it, so it
// tiles), each one tone (a mauve grey, three in ten lighter), the joints a step under them, moss in a
// third of them; a slab lit only by a dash of 2-4 px at the left of its top edge. Low contrast: a floor
// is felt, not looked at.
sprite("_flags", { w: 48, h: 48 }, (c) => {
  const r = rng(6), S = 48, P = [], dist = (a, b) => { const d = Math.abs(a - b); return Math.min(d, S - d) }
  for (let n = 0; P.length < 22 && n < 5000; n++) { const p = [r() * S, r() * S]; if (P.every(([x, y]) => Math.hypot(dist(x, p[0]), dist(y, p[1])) > 6.5)) P.push(p) }
  const K = new Int16Array(S * S), K2 = new Int16Array(S * S), G = new Uint8Array(S * S), top = P.map(() => S)
  for (let Y = 0; Y < S; Y++) for (let X = 0; X < S; X++) {
    let a = [9e9, -1], b = [9e9, -1]
    P.forEach(([x, y], k) => { const d = Math.hypot(dist(X, x), dist(Y, y) * 1.2); if (d < a[0]) { b = a; a = [d, k] } else if (d < b[0]) b = [d, k] })
    const i = Y * S + X
    K[i] = a[1]; K2[i] = b[1]; G[i] = b[0] - a[0] < 0.9 ? 1 : 0
    if (!G[i]) top[a[1]] = Math.min(top[a[1]], Y)
  }
  for (let Y = 0; Y < S; Y++) {
    let run = 0, prev = -1
    for (let X = 0; X < S; X++) {
      const i = Y * S + X, k = K[i]
      if (G[i]) { c.px(X, Y, hash(Math.min(k, K2[i]), Math.max(k, K2[i])) < 0.33 ? (hash(X, Y) < 0.5 ? "M" : "m") : "t"); prev = -1; continue }
      const edge = G[((Y + S - 1) % S) * S + X] === 1
      run = edge && prev === k ? run + 1 : 0
      prev = edge ? k : -1
      const body = hash(k, 5) < 0.3 ? "u" : "T", lip = edge && run < 2 + Math.floor(hash(k, 9) * 3) && Y <= top[k] + 1
      c.px(X, Y, lip ? (body === "u" || hash(k, 3) < 0.33 ? "U" : "u") : body)
    }
  }
})
// Tufts: fans of blades on a base that tapers, lit tips, the blue dark under them; three sizes, never
// symmetric, set in twos to fours at the feet of things.
sprite("_tuft_a", { w: 7, h: 5, pivot: "bottom" }, ".r...e.\n..e.e..\n.e.ee.e\n..eww..\n..QQQ..")
sprite("_tuft_b", { w: 5, h: 4, pivot: "bottom" }, "r..e.\n.e.e.\n.ewe.\n.QQ..")
sprite("_tuft_c", { w: 9, h: 6, pivot: "bottom" }, "..r.....e\ne..e..e..\n.e.e.e.e.\n..eewee..\n...www...\n...QQQ...")
// Flowers: blooms of 2-3 px, one color to a clump, a shadow pixel under some.
sprite("_flowers_w", { w: 9, h: 5, pivot: "bottom" }, ".o....o..\noo..o.oo.\n.e.oo..e.\n.e..e..e.\n..Q.e.Q..")
sprite("_flowers_p", { w: 8, h: 5, pivot: "bottom" }, "..p.....\n.pp..pp.\n..e.p.e.\np.e.e.e.\nQ.Q.Q...")
// Rocks after SLYNYRD (Pixelblog 13, 21) and Saint11: flat planes, one tone each: the top in the sun,
// cream only as a 1 px rim at its back; the side toward the sun mauve, the front toward us in the shade,
// the far side darker; a ledge (a light band over a dark undercut) and a crack; the darkest tone only
// as the line under it and down its shaded side; grass blades over its foot.
sprite("_rock", { w: 18, h: 12, pivot: "bottom" }, `
  .....EUUU.........
  ....UUUUUUUt......
  ...UuUUUUUUUTt....
  ..uuuTTTTTTTTtt...
  ..uuTTTTTtTTTTt...
  .uuuTTTTTTtTTTtt..
  .uUUUUuuTTTtTTTt..
  .uDDDDDDtTTTTTTtt.
  uuTTTTTTTTTTTTTtt.
  uTTTTTTTTTTTTTttt.
  DtTewTTTTTTTeTtttD
  .DDweDDDDDDDewDDD.`, bump("hybrid"))
sprite("_rock_small", { w: 11, h: 7, pivot: "bottom" }, `
  ..EUUU.....
  .UuUUUUt...
  .uuTTTTTt..
  uuTTTtTTtt.
  uTTTTTTTtt.
  DtTeTTTTttD
  .DDweDDDDD.`, bump("hybrid"))

// A dead tree, 4 m: limbs that kink every 4-6 px and split in one to three at angles of their own,
// tapering 5, 3, 2, 1 px, the last no longer than 5 px; lit only on the upper left of the trunk and the
// big limbs (the thin ones one tone); the foot flared, two roots, dark dashes of bark and a knot; violet
// in the shade.
sprite("_deadtree", { w: 60, h: 74, pivot: "bottom" }, (c) => {
  const r = rng(8)
  const seg = (x, y, a, len, w) => {
    for (let s = 0; s <= len; s += 0.5) {
      const X = x + Math.cos(a) * s, Y = y - Math.sin(a) * s
      for (let d = -w / 2; d <= w / 2 + 0.01; d += 0.5) {
        const ox = d * Math.sin(a), oy = d * Math.cos(a), lit = (-(ox + oy) / (w / 2)) * 0.7
        c.px(Math.round(X + ox), Math.round(Y + oy), w <= 1.6 ? "B" : lit > 0.45 ? "I" : lit > -0.2 ? "i" : lit > -0.6 ? "B" : "b")
      }
    }
    return [x + Math.cos(a) * len, y - Math.sin(a) * len]
  }
  const limb = (x, y, a, len, w, depth) => {
    for (let done = 0; done < len - 0.5; ) {
      const l = Math.min(4 + r() * 2, len - done)
      ;[x, y] = seg(x, y, a, l, Math.max(1, w * (1 - (0.35 * done) / len)))
      a += (r() - 0.5) * 0.45
      done += l
    }
    if (w < 1.3 || depth > 4) return
    const n = 1 + Math.floor(r() * 3), spread = 0.45 + r() * 0.35
    for (let i = 0; i < n; i++) {
      const da = n === 1 ? (r() - 0.5) * 0.6 : -spread + (2 * spread * i) / (n - 1) + (r() - 0.5) * 0.2
      limb(x, y, a + da, Math.min(len * (0.62 + r() * 0.15), w < 2 ? 5 : 99), w * (0.6 + r() * 0.1), depth + 1)
    }
  }
  limb(30, 72, Math.PI / 2 + 0.04, 22, 5, 0)
  for (const [x0, x1, y] of [[27, 33, 72], [28, 32, 71]]) for (let x = x0; x <= x1; x++) c.px(x, y, x < 30 ? "i" : "B")
  seg(27, 73, Math.PI + 0.3, 4, 1.5); seg(33, 73, -0.35, 4, 1.5)
  for (const [x, y] of [[30, 64], [30, 65], [31, 58], [31, 59], [29, 53], [29, 54]]) c.px(x, y, "b")
  c.px(31, 61, "b"); c.px(32, 61, "B"); c.px(31, 60, "i")
}, bump("hybrid"))
// All of it on one sheet, to look at (pxl build writes it).
sheet("nature", ["_grass", "_turf", "_pine", "_pine_m", "_pine_s", "_pine_far", "_bush", "_bush_b", "_bush_c", "_rock", "_rock_small", "_tuft_a", "_tuft_b", "_tuft_c", "_flowers_w", "_flowers_p", "_deadtree", "_rampart", "_riser", "_flags"], { pad: 2 })
