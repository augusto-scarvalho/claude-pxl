// Nature kit: the ground and what grows and lies on it, drawn as 16-bit games draw them, for any scene
// to take with include("<path>/nature/kit.px.js", { palette: true }) (top-down, HD-2D, a level's
// scenery). The rules each piece follows, with their sources and the numbers measured on the games'
// sheets, are in the environment guide (pxl help "environment"): SLYNYRD's Pixelblog, Saint11, final
// boss blues, So You Want To Be A Pixel Artist, and pxl study on Chrono Trigger, CrossCode, Terranigma,
// Final Fantasy Tactics Advance and others. Builders make more of a kind (grassTile, pine, pineVolume, deadTreeVolume, bush,
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
// a tone up (one clump in four with a lit left tip, the sun behind catching it), a short shadow of 2 px
// a tone down at their foot, away from the light (a whole row of the darkest there reads as a dash); between them small marks a tone down; no two touching (corners may), some crossing the tile's
// edges so its seams don't show. 64x48, its fields made seamless over it. `lush: false` for the wood's
// floor: no clumps, fewer marks.
const CLUMPS = [
  ["e..r..e", ".e.e.e.", ".e.e.e.", "..eee..", "...qq.."],
  ["r.e..", ".ee.e", ".eee.", "..qq."],
  [".e..e.", "e.ee.r", ".eeee.", "...qq."],
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
        pts.push([X, y + j, k === "q" ? K[b - 1] : k === "r" ? tip : up])
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
// A pine built as volumes in 3D, as the traveler's body is (characters §3), each pixel the nearest
// surface a ray from it meets: a trunk (a cylinder narrowing up), tiers of branches, each a core round
// the trunk and clumps around it, ellipsoids reaching out and drooping more toward the top, and a spire;
// lit by the sun behind on the left (the upper left contour rimmed), the tiers above shading the ones
// below where the light can't reach and darkening what hangs just under them, a sky light from above,
// darker in toward the trunk and on the far side; needles in strokes along each branch, the hems
// hanging in points; the normals the surfaces really have, so mesh()'s sun lights it as it is. Seen
// from 20 degrees up, as a billboard is drawn. Swaying in a wind from the left: the trunk bending with
// the square of the height, the gust coming and going over the loop, each branch's tip fluttering
// twice as fast. h: its height in px; frames of the sway at fps.
const pineVolume = (name, h, seed, { frames = 16, fps = 1000 / 220, sway = 1.6 } = {}) => {
  const W = 42, OX = 21, OY = h - 1, P = (20 * Math.PI) / 180, CP = Math.cos(P), SP = Math.sin(P), { unit, dot, cross } = vec
  const SUN = unit([-0.55, 0.62, -0.55]), D = [0, SP, CP]               // toward the sun; toward us
  const Hw = (h - 1.5) / CP, y0 = 0.17 * Hw, T = Math.max(4, Math.round(h / 12)), Rmax = 19
  const bend = (y, g) => g * Math.pow(Math.max(0, y) / Hw, 2)             // the trunk's lean at height y
  // the parts at one moment of the sway: g the gust (px at the top), ph the flutter's phase
  const partsAt = (g, ph) => {
    const r = rng(seed), parts = []
    const ell = (C, e1, e2, rr, tier, clump, R) => { e1 = unit(e1); e2 = unit(e2); C = [C[0] + bend(C[1], g), C[1], C[2]]; parts.push({ C, E: [e1, e2, cross(e1, e2)], rr, tier, clump, R, reach: Math.max(...rr) }) }
    for (let t = 0; t < T; t++) {
      const f = t / T, sp = ((Hw * 0.84 - y0) * 0.95) / T, yb = y0 + sp * t, th = sp * 1.3, R = 3.5 + (Rmax - 3.5) * Math.pow(1 - f, 1.1)
      ell([0, yb + th * 0.5, 0], [1, 0, 0], [0, 0, 1], [R * (0.45 - 0.15 * f), R * (0.45 - 0.15 * f), th * 0.55], t, false, R)
      const K = Math.round(5 + R / 2.4), a0 = r() * 6.28
      for (let k = 0; k < K; k++) {
        const a = a0 + (k * 6.28) / K + (r() - 0.5) * 0.4, out = [Math.sin(a), 0, Math.cos(a)], rho = R * (0.5 + r() * 0.08), flick = r() * 6.28
        const droop = 0.5 + 0.8 * f * f + r() * 0.15, e1 = [out[0], -droop, out[2]], tang = [Math.cos(a), 0, -Math.sin(a)]
        const flut = 0.35 * Math.sin(2 * ph + flick)
        ell([out[0] * rho + flut, yb + th * 0.32 - droop * rho * 0.3, out[2] * rho], e1, tang, [R * 0.55, Math.max(1.5, ((3.14 * rho) / K) * 1.15), th * 0.28], t, true, R)
      }
    }
    // the spire: a narrow cone of three, the leader at its tip
    for (const [y, rad, hh] of [[Hw * 0.86, 3.4, 4.5], [Hw * 0.93, 2.2, 3.5], [Hw - 1.8, 0.9, 2.2]]) ell([0, y, 0], [1, 0, 0], [0, 0, 1], [rad, rad, hh], T, false, rad * 2)
    return parts
  }
  const hit = (o, d, p) => {                                             // where the ray o + t d meets p: t (the far root) and t2
    const v = [o[0] - p.C[0], o[1] - p.C[1], o[2] - p.C[2]], b0 = dot(v, d)
    if (dot(v, v) - b0 * b0 > p.reach * p.reach) return null              // misses its bounding sphere
    const q0 = p.E.map((e, i) => dot(v, e) / p.rr[i]), qd = p.E.map((e, i) => dot(d, e) / p.rr[i])
    const a = dot(qd, qd), b = 2 * dot(q0, qd), c = dot(q0, q0) - 1, disc = b * b - 4 * a * c
    if (disc < 0) return null
    return { t: (-b + Math.sqrt(disc)) / (2 * a), t2: (-b - Math.sqrt(disc)) / (2 * a), q0, qd }
  }
  const trunkR = (y) => 1.7 - (0.9 * y) / Hw + (y < 1.5 ? 1 : 0)
  const keys = "ZzxcvVJ"
  const dir = (n) => {                                                   // a normal as the numpad grid takes it
    const sx = n[0], sy = n[1] * CP - n[2] * SP, l = Math.hypot(sx, sy)
    if (l < 0.3) return "5"
    const k = Math.round(((Math.atan2(sy, sx) + 2 * Math.PI) % (2 * Math.PI)) / (Math.PI / 4)) % 8
    return (l < 0.7 ? "dewqazxc" : "69874123")[k]
  }
  const render = (g, ph) => {
    const parts = partsAt(g, ph), grid = Array.from({ length: h }, () => Array(W).fill(null))
    for (let sy = 0; sy < h; sy++) for (let sx = 0; sx < W; sx++) {
      const o = [sx + 0.5 - OX, CP * (OY - sy - 0.5), -SP * (OY - sy - 0.5)]   // on the screen's plane through the foot
      let best = null
      for (const p of parts) {
        const H = hit(o, D, p)
        if (H && (!best || H.t > best.t)) {
          const q = H.q0.map((v, i) => v + H.t * H.qd[i]), n = unit(p.E.reduce((s, e, i) => [s[0] + (e[0] * q[i]) / p.rr[i], s[1] + (e[1] * q[i]) / p.rr[i], s[2] + (e[2] * q[i]) / p.rr[i]], [0, 0, 0]))
          best = { t: H.t, n, p, q, at: o.map((v, i) => v + H.t * D[i]) }
        }
      }
      // the trunk, leaning with the crown, where the crown doesn't hide it
      const x = o[0] - bend(o[1], g), tr = trunkR(Math.max(0, o[1]))
      if (Math.abs(x) < tr) {
        const z = Math.sqrt(tr * tr - x * x), t = (z - o[2]) / CP, y = o[1] + SP * t
        if (y >= 0 && y < Hw * 0.8 && (!best || t > best.t)) best = { t, n: [x / tr, 0, z / tr], trunk: true, at: [x, y, z] }
      }
      if (!best) continue
      const { n, at } = best
      let sun = Math.max(0, dot(n, SUN))
      if (sun > 0) for (const p of parts) { if (p === best.p) continue; const H = hit(at, SUN, p); if (H && H.t > 0.6 && H.t2 > 0.6) { sun *= 0.25; break } }
      let L = 0.33 + 0.28 * n[1] + 0.5 * sun - 0.12 * Math.max(0, n[0])
      if (best.p) {
        L -= 0.22 * Math.min(1, best.p.R / 8) * Math.max(0, 1 - Math.hypot(at[0] - bend(at[1], g), at[2]) / (0.6 * best.p.R))      // in toward the trunk
        for (const p of parts) { if (p.tier <= best.p.tier) continue; const H = hit(at, [0, 1, 0], p); if (H && H.t2 > 0.3 && H.t2 < 4) { L -= 0.12; break } }   // just under the tier above
        if (best.p.clump && sun > 0.15 && L < 0.85 && ((Math.floor(best.q[1] * best.p.rr[1] + best.p.tier * 1.7) % 4) + 4) % 4 === 0) L += 0.09   // needles in strokes along the branch
      }
      grid[sy][sx] = { L, n, trunk: !!best.trunk, tier: best.p ? best.p.tier : -1 }
    }
    // the hems: needles hanging in points under each tier where nothing is below
    for (let sy = h - 2; sy >= 0; sy--) for (let sx = 0; sx < W; sx++) {
      const g0 = grid[sy][sx]
      if (!g0 || g0.trunk || grid[sy + 1][sx] || (sx + g0.tier + seed) % 2 !== 0) continue
      for (let d = 1; d <= 1 + ((sx + seed) % 2) && sy + d < h - 2 && !grid[sy + d][sx]; d++) grid[sy + d][sx] = { ...g0, L: g0.L - 0.12 * d }
    }
    const px = []
    for (let sy = 0; sy < h; sy++) for (let sx = 0; sx < W; sx++) {
      const g0 = grid[sy][sx]
      if (!g0) continue
      const open = (dx, dy) => !(grid[sy + dy] && grid[sy + dy][sx + dx])
      let L = g0.L
      if (!g0.trunk && open(-1, 0) && open(-2, 0) && open(0, -1) && sx < OX - 2) L = Math.max(L + 0.25, 0.85)   // the outer rim the sun behind lights
      else if (!g0.trunk && (open(1, 0) || open(0, 1)) && sx >= OX) L -= 0.1              // the shaded contour
      px.push([sx, sy, g0.trunk ? (g0.n[0] < -0.3 ? "s" : g0.n[0] < 0.4 ? "d" : "a") : keys[Math.max(0, Math.min(6, Math.round(L * 6)))]])
    }
    return { px, normals: grid.map((row) => row.map((g0) => (g0 ? dir(g0.n) : ".")).join("")).join("\n") }
  }
  const memo = new Map()
  return anim(name, { w: W, h, pivot: "bottom", frames, fps }, (c) => {
    const f = c.frame % frames
    if (!memo.has(f)) { const ph = (2 * Math.PI * f) / frames; memo.set(f, render(sway * (0.45 + 0.55 * Math.sin(ph)), ph)) }
    const { px, normals: nm } = memo.get(f)
    for (const [x, y, k] of px) c.px(x, y, k)
    c.normals(0, 0, nm)
  })
}
pineVolume("_spruce", 68, 3)
pineVolume("_spruce_m", 60, 5)
pineVolume("_spruce_s", 52, 9)
anim("_spruce_far", { base: "_spruce_m", swap: { Z: "#3b4260", z: "#405468", x: "#4b6866", c: "#567763", v: "#6a8865", V: "#879d6c", J: "#b6bc8c" } })
// The same spruce on fields (beside the hand one, to compare): make3d.define, a builder of this file's,
// of the hand one's parts in meters at 24 px a meter ([x, ahead, up]: its px x, toward us and up turned
// so), the ellipsoids turned each to its branch, the trunk a cone, swaying as the hand one does (the
// trunk bent with the square of the height, each branch's tip fluttering twice as fast); drawn by
// surface() from 20 degrees up at 24 px a meter, as the billboard is: the sun behind on the left lighting
// its edge (rim: 0.85), no self-shadow, no outline, the hems hanging in points, the needles in strokes.
const fromPx = ([x, y, z]) => [x / 24, -z / 24, y / 24]
// an ellipsoid of radii rr along the ways e1 and e2 (and their cross), at C: one turn about an axis takes it there
const ellipsoidAlong = (rr, e1, e2, C) => {
  const { unit, cross } = vec, a = unit(e1), b = unit(e2), c = cross(a, b), th = Math.acos(Math.max(-1, Math.min(1, (a[0] + b[1] + c[2] - 1) / 2)))
  let ax = [b[2] - c[1], c[0] - a[2], a[1] - b[0]]
  if (Math.hypot(...ax) < 1e-6) ax = th < 0.1 ? [0, 0, 1] : [[a[0] + 1, a[1], a[2]], [b[0], b[1] + 1, b[2]], [c[0], c[1], c[2] + 1]].sort((u, v) => Math.hypot(...v) - Math.hypot(...u))[0]
  return sdf.ellipsoid(rr).rotate((th * 180) / Math.PI, ax).at(C)
}
make3d.define("spruce", ({ h = 68, seed = 3, sway = 1.6 }) => {
  const P = (20 * Math.PI) / 180, CP = Math.cos(P), Hw = (h - 1.5) / CP, y0 = 0.17 * Hw, T = Math.max(4, Math.round(h / 12)), Rmax = 19, { unit } = vec
  const r = rng(seed), clumps = [], cores = []
  for (let t = 0; t < T; t++) {
    const f = t / T, sp = ((Hw * 0.84 - y0) * 0.95) / T, yb = y0 + sp * t, th = sp * 1.3, R = 3.5 + (Rmax - 3.5) * Math.pow(1 - f, 1.1)
    cores.push(sdf.ellipsoid([R * (0.45 - 0.15 * f), R * (0.45 - 0.15 * f), th * 0.55].map((v) => v / 24)).at(0, 0, (yb + th * 0.5) / 24))
    const K = Math.round(5 + R / 2.4), a0 = r() * 6.28
    for (let k = 0; k < K; k++) {
      const a = a0 + (k * 6.28) / K + (r() - 0.5) * 0.4, out = [Math.sin(a), 0, Math.cos(a)], rho = R * (0.5 + r() * 0.08), flick = r() * 6.28
      const droop = 0.5 + 0.8 * f * f + r() * 0.15, C = fromPx([out[0] * rho, yb + th * 0.32 - droop * rho * 0.3, out[2] * rho])
      clumps.push(ellipsoidAlong([R * 0.55, Math.max(1.5, ((3.14 * rho) / K) * 1.15), th * 0.28].map((v) => v / 24), fromPx(unit([out[0], -droop, out[2]])), fromPx([Math.cos(a), 0, -Math.sin(a)]),
        (c) => [C[0] + (0.35 / 24) * Math.sin(4 * Math.PI * c.phase + flick), C[1], C[2]]))
    }
  }
  // the spire: a narrow cone of three, the leader at its tip
  for (const [y, rad, hh] of [[Hw * 0.86, 3.4, 4.5], [Hw * 0.93, 2.2, 3.5], [Hw - 1.8, 0.9, 2.2]]) cores.push(sdf.ellipsoid([rad / 24, rad / 24, hh / 24]).at(0, 0, y / 24))
  const crown = sdf.union([...cores, ...clumps]).mat("needles"), trunk = sdf.cone(1.7 / 24, (Hw * 0.8) / 24, 0.98 / 24).union(sdf.cylinder(2.7 / 24, 1.5 / 24)).mat("bark")
  const H = Hw / 24, bend = (c) => (2 * (sway / 24) * (0.45 + 0.55 * Math.sin(2 * Math.PI * c.phase))) / (H * H)
  return { field: trunk.part("trunk").union(crown.part("crown")).bend(bend), parts: { trunk, crown } }
}, { params: { h: [20, 160], sway: [0, 6] } })
const spruce3d = (name, h, seed, { frames = 16, fps = 1000 / 220 } = {}) => {
  const W = 42, ST = make3d.spruce({ h, seed })
  anim(name, { w: W, h, pivot: "bottom", frames, fps }, surface(ST.field, { view: "side", ppm: 24, at: [W / 2, h - 0.5], light: [-0.55, 0.55, 0.62], soft: 0.6, rim: 0.85, shadows: false, outline: false,
    mats: { needles: { ramp: "ZzxcvVJ", strokes: 4 / 24, hem: 2 }, bark: "ads" } }))
}
spruce3d("_spruce_3d", 68, 3)
spruce3d("_spruce_m_3d", 60, 5)
spruce3d("_spruce_s_3d", 52, 9)
anim("_spruce_far_3d", { base: "_spruce_m_3d", swap: { Z: "#3b4260", z: "#405468", x: "#4b6866", c: "#567763", v: "#6a8865", V: "#879d6c", J: "#b6bc8c" } })
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
// Tufts: fans of blades on a base that tapers, lit tips, a short shadow a tone down under them; three sizes, never
// symmetric, set in twos to fours at the feet of things.
sprite("_tuft_a", { w: 7, h: 5, pivot: "bottom" }, ".r...e.\n..e.e..\n.e.ee.e\n..eww..\n...qq..")
sprite("_tuft_b", { w: 5, h: 4, pivot: "bottom" }, "r..e.\n.e.e.\n.ewe.\n..qq.")
sprite("_tuft_c", { w: 9, h: 6, pivot: "bottom" }, "..r.....e\ne..e..e..\n.e.e.e.e.\n..eewee..\n...www...\n....qq...")
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
// A rock of any size by the same rules, drawn from its masses: `lobes` [[x, y, rx, ry], ...], each a
// dome over its middle row widening a little to the foot, the first the biggest (its ledge and crack)
// and the last drawn over the others; a tone to each plane, the darkest as the line under it and down
// its shaded side, grass over its foot (graveyard's boulders: rock("_boulder", 28, 16, [...]))
const rock = (name, w, h, lobes) => sprite(name, { w, h, pivot: "bottom" }, (c) => {
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
// A dead tree built as limbs in 3D, as the pine is: a trunk that kinks every 4-6 px and splits in one
// to three limbs at angles of their own all round it (toward us and away too), each kinking and
// splitting again, tapering to a pixel; each limb a tube, each pixel the nearest tube a ray from it
// meets, lit by the sun behind on the left (the upper left rimmed), bark in dashes a step darker on
// the trunk and the big limbs, the thin ones one tone, the darkest only as their outline on the
// shaded side; two roots. Swaying a little in the wind, the trunk with the square of the height, the
// thin limbs trembling twice as fast, more toward their tips. h: its height in px.
// Its limbs, once: segments [A, B, radius at A, at B, how many splits from the trunk] in px (x across,
// y up, z toward the eye), h px tall, and how high they reach; drawn as a sprite by deadTreeVolume, and
// as capsules in 3D by the graveyard's graveyard_3d.
const deadTreeLimbs = (h, seed) => {
  const CP = Math.cos((20 * Math.PI) / 180), Hw = (h - 1.5) / CP, { unit, dot, cross, add, mul } = vec
  // turn v about the unit axis k by angle a
  const turn = (v, k, a) => add(add(mul(v, Math.cos(a)), mul(cross(k, v), Math.sin(a))), mul(k, dot(k, v) * (1 - Math.cos(a))))
  const r = rng(seed), segs = []
  const limb = (p, d, len, rad, lvl) => {
    for (let done = 0; done < len - 0.5; ) {
      const l = Math.min(4 + r() * 2, len - done), q = add(p, mul(d, l)), r1 = Math.max(0.55, rad * (1 - (0.35 * (done + l)) / len))
      segs.push([p, q, Math.max(0.55, rad * (1 - (0.35 * done) / len)), r1, lvl])
      p = q
      const side = unit(cross(d, [r() - 0.5, r() - 0.5, r() - 0.5]))
      d = unit(turn(d, side, (r() - 0.5) * 0.45))
      done += l
    }
    if (rad < 0.9 || lvl > 3) return
    // splits that stay apart: from the trunk one each way across the picture (and now and then one on
    // up); from a limb one carrying on its way, a little thicker, and one bending further out from the
    // trunk, never back over it (limbs crossing at a fork, or one going off behind the trunk, read as a
    // tangle). Each turned in the picture's plane, with a little depth of its own.
    const out = lvl === 0 ? 1 : Math.sign(p[0]) || 1
    const ways = lvl === 0 ? [[0.5 + r() * 0.35, 0.68], [-(0.4 + r() * 0.3), 0.62], ...(r() < 0.6 ? [[0.08, 0.55]] : [])] : [[0.15 * (r() - 0.5), 0.74], [0.55 + r() * 0.3, 0.6]]
    for (const [a, k] of ways) {
      const nd = unit(add(turn(d, [0, 0, 1], -out * (a + (r() - 0.5) * 0.15)), [0, 0.1, (r() - 0.5) * 0.25]))
      limb(p, nd, Math.min(len * (0.7 + r() * 0.15), rad < 1.4 ? 6 : 99), rad * (k + r() * 0.06), lvl + 1)
    }
  }
  limb([0, 0, 0], unit([0.04, 1, 0.02]), Hw * 0.3, 3.4, 0)
  for (const a of [Math.PI + 0.3, -0.35]) segs.push([[0, 0.6, 0], [Math.cos(a) * 4, -0.4, Math.sin(a) * 1.5 + 0.8], 1.2, 0.6, 0])   // roots
  const top = Math.max(...segs.map((s) => s[1][1]))
  return { segs, top }
}
const deadTreeVolume = (name, h, seed, { frames = 16, fps = 1000 / 220, sway = 1 } = {}) => {
  const W = 76, OX = 38, OY = h - 1, P = (20 * Math.PI) / 180, CP = Math.cos(P), SP = Math.sin(P), { unit, dot, add, mul } = vec
  const SUN = unit([-0.55, 0.62, -0.55]), D = [0, SP, CP], { segs, top } = deadTreeLimbs(h, seed)
  const dir = (n) => {
    const sx = n[0], sy = n[1] * CP - n[2] * SP, l = Math.hypot(sx, sy)
    if (l < 0.3) return "5"
    const k = Math.round(((Math.atan2(sy, sx) + 2 * Math.PI) % (2 * Math.PI)) / (Math.PI / 4)) % 8
    return (l < 0.7 ? "dewqazxc" : "69874123")[k]
  }
  const render = (g, ph) => {
    // the limbs at this moment of the sway
    const moved = segs.map(([A, B, ra, rb, lvl], k) => {
      const shift = (p) => [p[0] + g * Math.pow(Math.max(0, p[1]) / top, 2) + (lvl > 1 ? 0.25 * lvl * Math.sin(2 * ph + k) * (p[1] / top) : 0), p[1], p[2]]
      return [shift(A), shift(B), ra, rb, lvl]
    })
    // each limb's box on the screen (x across, y·CP - z·SP up) widened by its radius: a pixel's ray
    // outside it passes the limb by
    const boxes = moved.map(([A, B, ra, rb]) => {
      const r = Math.max(ra, rb) + 0.01, va = A[1] * CP - A[2] * SP, vb = B[1] * CP - B[2] * SP
      return [Math.min(A[0], B[0]) - r, Math.max(A[0], B[0]) + r, Math.min(va, vb) - r, Math.max(va, vb) + r]
    })
    const grid = Array.from({ length: h }, () => Array(W).fill(null))
    for (let sy = 0; sy < h; sy++) for (let sx = 0; sx < W; sx++) {
      const o = [sx + 0.5 - OX, CP * (OY - sy - 0.5), -SP * (OY - sy - 0.5)], up = OY - sy - 0.5
      let best = null
      for (let i = 0; i < moved.length; i++) {
        const b = boxes[i]
        if (o[0] < b[0] || o[0] > b[1] || up < b[2] || up > b[3]) continue
        const [A, B, ra, rb, lvl] = moved[i]
        // the ray's nearest approach to the limb's axis, and whether it passes within the limb's radius there
        const u = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], w = [o[0] - A[0], o[1] - A[1], o[2] - A[2]]
        const uu = dot(u, u), ud = dot(u, D), uw = dot(u, w), dw = dot(D, w), den = uu - ud * ud
        let s = den > 1e-9 ? (uw - ud * dw) / den : 0
        s = Math.max(0, Math.min(1, s))
        const Q = add(A, mul(u, s)), t = dot([Q[0] - o[0], Q[1] - o[1], Q[2] - o[2]], D), v = add(o, mul(D, t)), off = [v[0] - Q[0], v[1] - Q[1], v[2] - Q[2]]
        const rad = ra + (rb - ra) * s, d2 = dot(off, off)
        if (d2 >= rad * rad) continue
        const th = t + Math.sqrt(rad * rad - d2)
        if (best && th <= best.t) continue
        const at = add(o, mul(D, th)), n = unit([at[0] - Q[0], at[1] - Q[1], at[2] - Q[2]])
        best = { t: th, n, rad, s, len: Math.sqrt(uu), lvl, Q }
      }
      if (!best) continue
      const sun = Math.max(0, dot(best.n, SUN))
      let L = 0.52 + 0.25 * best.n[1] + 0.5 * sun - 0.15 * Math.max(0, best.n[0])
      if (best.lvl === 0 && best.rad > 1.8 && hash(Math.floor(best.Q[1] / 2.5), Math.floor(Math.atan2(best.n[2], best.n[0]) * 2)) < 0.2) L -= 0.22   // bark, on the trunk
      grid[sy][sx] = { L, n: best.n, thin: best.rad < 0.9 }
    }
    const px = []
    for (let sy = 0; sy < h; sy++) for (let sx = 0; sx < W; sx++) {
      const g0 = grid[sy][sx]
      if (!g0) continue
      const open = (dx, dy) => !(grid[sy + dy] && grid[sy + dy][sx + dx])
      let k
      if (g0.thin) k = "B"
      else if (open(1, 0) || open(0, 1)) k = "b"                                    // the outline, on the shaded side
      else if (open(-1, 0)) k = g0.n[1] > -0.2 ? "I" : "i"                         // the edge toward the sun, lit
      else k = "bBiI"[Math.max(0, Math.min(3, Math.round(g0.L * 3)))]
      px.push([sx, sy, k])
    }
    return { px, normals: grid.map((row) => row.map((g0) => (g0 ? dir(g0.n) : ".")).join("")).join("\n") }
  }
  const memo = new Map()
  return anim(name, { w: W, h, pivot: "bottom", frames, fps }, (c) => {
    const f = c.frame % frames
    if (!memo.has(f)) { const ph = (2 * Math.PI * f) / frames; memo.set(f, render(sway * (0.4 + 0.6 * Math.sin(ph)), ph)) }
    const { px, normals: nm } = memo.get(f)
    for (const [x, y, k] of px) c.px(x, y, k)
    c.normals(0, 0, nm)
  })
}
deadTreeVolume("_snag", 76, 4)
// The same dead tree on fields (beside the hand one, to compare): its limbs (deadTreeLimbs) as tapering
// rods in meters, the bark in dashes a step darker on the trunk and the big limbs, swaying as the hand
// one does; drawn by surface() from 20 degrees up at 24 px a meter, the sun behind on the left.
make3d.define("snag", ({ h = 76, seed = 4, sway = 1 }) => {
  const { segs, top } = deadTreeLimbs(h, seed), near = {}
  // (in bunches half a meter across: a point far from a bunch's box skips its rods)
  for (const [A, B, ra, rb, lvl] of segs) {
    const rod = sdf.capsule(fromPx(A), fromPx(B), ra / 24, rb / 24)
    ;(near[`${Math.floor((A[0] + B[0]) / 24)},${Math.floor((A[1] + B[1]) / 24)}`] ??= []).push(ra + rb < 1.8 ? rod.mat("twig") : lvl === 0 && ra > 1.8 ? rod.paint("dash", (p, n) => hash(Math.floor((p[2] * 24) / 2.5), Math.floor(Math.atan2(-n[1], n[0]) * 2)) < 0.2) : rod)
  }
  const H = top / 24, bend = (c) => (2 * (sway / 24) * (0.4 + 0.6 * Math.sin(2 * Math.PI * c.phase))) / (H * H)
  return { field: sdf.union(Object.values(near).map((g) => sdf.union(g))).mat("bark").bend(bend) }
}, { params: { h: [20, 160], sway: [0, 6] } })
anim("_snag_3d", { w: 76, h: 76, pivot: "bottom", frames: 16, fps: 1000 / 220 }, surface(make3d.snag({ h: 76, seed: 4 }).field, { view: "side", ppm: 24, at: [38, 75.5],
  light: [-0.55, 0.55, 0.62], soft: 1, ao: 0, rim: 0.85, shadows: false, mats: { bark: "bBiiI", dash: "bbBii", twig: "BB" } }))
// All of it on one sheet, to look at (pxl build writes it).
sheet("nature", ["_grass", "_turf", "_pine", "_pine_m", "_pine_s", "_pine_far", "_bush", "_bush_b", "_bush_c", "_rock", "_rock_small", "_tuft_a", "_tuft_b", "_tuft_c", "_flowers_w", "_flowers_p", "_deadtree", "_rampart", "_riser", "_flags"], { pad: 2 })
