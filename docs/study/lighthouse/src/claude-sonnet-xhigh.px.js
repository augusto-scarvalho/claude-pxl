// Made for the model study (docs/model-study.md) by Claude Code, Sonnet 5.5 at xhigh effort; its file as it left it.
// STORM LIGHT: a lighthouse on a rocky headland in a gale. 160x120, 48 frames at 10 fps, loops seamlessly.
//
// WHERE THE LIGHT COMES FROM: the lamp in the lantern room, at (LX, LY). Its two beams (a lens turning half a
// turn per loop) light the rain, the cloud and the gulls they pass; its halo warms the dome, gallery and rail;
// the keeper's hand lantern lights his coat and the rail beside him. Everything else is cool, dull storm-sky glow.

const W = 160, H = 120, T = 48, FPS = 10
const TAU = Math.PI * 2
const HZ = 62                  // horizon row
const LX = 92, LY = 38         // the lamp: middle of the lantern room
const FLOOR = 49               // gallery floor, top row

pal({
  // night sky, dark -> hazy horizon
  0: "#080b17", 1: "#0c1223", 2: "#111a31", 3: "#182641", 4: "#213350", 5: "#2d4462", 6: "#3e5a78", 7: "#587592", 8: "#7f98ad",
  // sea, then foam
  p: "#07121e", q: "#0b1b2a", r: "#102738", s: "#173649", t: "#224a62", u: "#326580", v: "#5f93a6", w: "#a9ccd3", x: "#e8f3f0",
  // rock
  A: "#080912", B: "#10111d", C: "#191b2b", D: "#252940", E: "#353b55", F: "#4b536f", G: "#667090", H: "#8e9ab5",
  // whitewash (cool, night), red band
  I: "#1b2340", J: "#2d3858", K: "#44527a", L: "#63749a", M: "#8a9bb8", N: "#b5c3d3",
  e: "#34142a", f: "#5c1f35", g: "#8a2f40", h: "#b24a48",
  // lamplight, ember -> white-hot
  n: "#7a3a22", O: "#c96f2b", o: "#f0a63c", Y: "#ffd868", y: "#fff4cc",
  // oilskin and skin
  i: "#5e3f12", j: "#a87a14", k: "#e0ac22", l: "#ffd54d", m: "#d39a72", S: "#8a5a4a",
  // gulls
  Q: "#e6edf2", R: "#98a6bd", W: "#bcc8d8", P: "#3a4466", U: "#171c33",
  // rain: far, near, lit far, lit near
  a: "#4f6a8c", b: "#7898bd", c: "#ffe9a8", d: "#fff6d6",
  // wind-flattened grass
  V: "#11292a", X: "#1b3f3b", Z: "#2c5a52",
  z: "#05060b",
})
ramps("012345678", "pqrstuvwx", "ABCDEFGH", "IJKLMN", "efgh", "nOoYy", "ijkl", "VXZ")

// ---------------------------------------------------------------- helpers
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t) }
const unpack = (v) => [(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255]
const css = (rgb) => "#" + rgb.map((n) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0")).join("")
const toward = (v, tgt, t) => css(unpack(v).map((n, i) => n + (tgt[i] - n) * t))
const lum = (v) => { const [r, g, b] = unpack(v); return 0.3 * r + 0.55 * g + 0.15 * b }
const WARM = [255, 228, 150]       // the beams: pale yellow
const GLOW = [255, 176, 70]        // the halo and the hand lantern: deeper, more orange
const ROCK = "ABCDEFGH"

// ---------------------------------------------------------------- the beams
// Two arms of one lens turn half a turn per loop (so the loop closes). Seen from the sea, a beam turning round
// the lamp runs an ellipse: toward us it climbs and widens, away from us it sinks toward the horizon.
const armGeom = (f, k) => {
  const th = Math.PI * (f / T + k), dx = Math.cos(th), dz = Math.sin(th)
  const q = 200 / (200 - 100 * dz)                               // perspective: nearer = bigger, higher
  const ex = LX + 118 * dx * q, ey = HZ - (HZ - LY) * q
  let ux = ex - LX, uy = ey - LY
  const len = Math.hypot(ux, uy)
  ux /= len; uy /= len
  return { ux, uy, len: Math.max(len, 74), hw: 12 * q, gain: 0.9 + 0.4 * Math.max(dz, 0), dz }
}
const ARMS = Array.from({ length: T }, (_, f) => [armGeom(f, 0), armGeom(f, 1)])
const BEAM = ARMS.map((arms) => {                                // brightness 0..1 of the beams at every pixel
  const m = new Float32Array(W * H)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let best = 0
    for (const a of arms) {
      const vx = x - LX, vy = y - LY
      const s = (vx * a.ux + vy * a.uy) / a.len
      if (s < -0.02 || s > 1) continue
      const d = Math.abs(-vx * a.uy + vy * a.ux)
      const hw = 1 + (a.hw - 1) * Math.max(s, 0)
      if (d > hw) continue
      const i = Math.pow(1 - d / hw, 0.9) * Math.pow(1 - Math.max(s, 0), 0.5) * a.gain
      if (i > best) best = i
    }
    m[y * W + x] = best
  }
  return m
})
const beamAt = (f, x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? 0 : BEAM[f][y * W + x]
const FLASH = (f) => Math.pow(Math.sin(Math.PI * f / T), 2)      // the beam swinging toward us: the lamp blazes

// ---------------------------------------------------------------- sky
const SKY_DRIFT = 26
// storm cloud: heaped banks (low frequency) torn into streaks by the wind (high, stretched along it)
const cloudF = (x, y) => 0.6 * fbm(x / 80 + 5, y / 20, 4) + 0.4 * fbm(x / 38, y / 6, 3)
const MOON = [30, 15]              // a dull glow behind the cloud: the cool light on the rocks and wave crests comes from up here
function sky(c) {
  const u = c.frame / T, d = SKY_DRIFT * u
  const D = (x, y) => (1 - u) * cloudF(x - d + 200, y) + u * cloudF(x - d + SKY_DRIFT + 200, y)
  for (let y = 0; y <= HZ; y++) {
    const g = y / HZ
    for (let x = 0; x < W; x++) {
      const n = D(x, y), nl = D(x - 2.5, y - 2)                    // nl: the same cloud a step toward the glow
      const glow = Math.exp(-(((x - MOON[0]) / 44) ** 2 + ((y - MOON[1]) / 28) ** 2))
      const dens = smooth((n - 0.44) / 0.2)                        // 0 thin sky .. 1 thick cloud
      const rim = smooth((n - nl) * 7 + 0.1)                       // faces turned to the glow catch it
      const haze = 2.9 + 2.3 * Math.pow(g, 2.2) + 2.0 * glow      // thin sky: paler toward the horizon and the glow
      const body = 0.6 + 0.9 * g
      const t = haze * (1 - dens) + body * dens + rim * dens * (1.7 + 1.4 * glow) + (bayer(x, y) - 0.5) * 0.35
      c.px(x, y, String(clamp(Math.round(t), 0, 7)))
    }
  }
}

// ---------------------------------------------------------------- sea
const SEA = "pqrstu"
// ridges of the swell, far to near: [row, height, wavelength, phase]. Each rolls right one wavelength per loop.
const RIDGES = [[63.5, 0.5, 31, 0.0], [65.5, 0.7, 38, 1.3], [68.2, 0.9, 44, 2.1], [71.5, 1.1, 50, 0.4], [75.5, 1.4, 56, 3.0],
  [80.5, 1.8, 62, 1.7], [86.5, 2.2, 68, 4.4], [94, 2.7, 76, 2.6], [103, 3.2, 84, 5.2], [113, 3.6, 92, 0.9]]
function sea(c) {
  for (let y = HZ; y < H; y++) {
    const g = (y - HZ) / (H - HZ)
    for (let x = 0; x < W; x++) {
      const t = 3.9 - 3.9 * Math.pow(g, 0.6) + (bayer(x, y) - 0.5) * 0.7
      c.px(x, y, SEA[clamp(Math.round(t), 0, 5)])
    }
  }
  RIDGES.forEach(([Y, A, lam, ph], k) => {
    const near = k / (RIDGES.length - 1)
    const crest = near < 0.3 ? "t" : near < 0.65 ? "u" : "v", dim = near < 0.3 ? "s" : near < 0.65 ? "t" : "u"
    const face = near < 0.3 ? "s" : near < 0.65 ? "t" : "u", under = near < 0.3 ? "q" : "r"
    for (let x = 0; x < W; x++) {
      const p = TAU * (x / lam - c.frame / T) + ph
      const y = Math.round(Y + A * (Math.sin(p) + 0.45 * Math.sin(2 * p + 1.1 * ph)))
      const lit = smooth((Math.sin(p + 1.2) + 0.2) / 1.1)           // how much of the front face catches the sky here
      const th = Math.round((0.6 + 2.6 * near) * lit)
      for (let d = 1; d <= th; d++) c.px(x, y + d, d === th && th > 1 ? dim : face)
      if (lit > 0.3) c.px(x, y + th + 1, under)
      c.px(x, y, lit > 0.9 && near > 0.45 ? "w" : lit > 0.55 ? crest : dim)
      if (lit > 0.95 && near > 0.6) c.px(x, y - 1, "v")
    }
  })
  c.hline(0, HZ - 1, W, "7")                                     // the line of the horizon, hazy
}

// the beams light what is behind the tower: sky, cloud, the far sea
const LEVELS = [0, 0.09, 0.2, 0.34]
function beams(c) {
  const f = c.frame
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = beamAt(f, x, y)
    if (i < 0.06) continue
    const v = i + (bayer(x, y) - 0.5) * 0.12
    const lv = v >= 0.55 ? 3 : v >= 0.3 ? 2 : v >= 0.1 ? 1 : 0
    if (lv) c.px(x, y, toward(c.get(x, y), WARM, LEVELS[lv]))
  }
}

// ---------------------------------------------------------------- the headland
const LAND = [160, 69, 157, 70, 155, 73, 151, 72, 150, 70, 148, 71, 147, 76, 144, 76, 143, 80, 139, 79, 137, 83, 133, 84, 131, 88, 127, 87, 125, 90, 121, 90, 119, 93, 114, 92, 112, 94,
  70, 94, 68, 96, 66, 97, 68, 99, 65, 101, 63, 103, 64, 105, 61, 107, 59, 108, 57, 110, 53, 111, 51, 114, 47, 115, 45, 118, 42, 119, 40, 120, 160, 120]
const STACK = [43, 112, 44, 102, 43, 96, 46, 92, 47, 94, 50, 90, 51, 96, 53, 102, 54, 112]
// Rock is cut into flat facets (cells of a sheared lattice, so they lie along the bedding that slants down to the right).
// Each facet has its own tilt, so each takes the dull sky-glow from the upper left differently: a flat tone with hard edges.
const FACET = new Int32Array(W * H), TILT = new Float32Array(W * H)
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const big = smooth((y - 96) / 16) * smooth((x - 70) / 40)              // bigger blocks in the near rock at lower right
  const cw = 10 + 9 * big, ch = 5 + 4 * big
  const u = (x - 0.4 * y) / cw, v = y / ch
  const i0 = Math.floor(u), j0 = Math.floor(v)
  let best = 9, bi = 0, bj = 0
  for (let j = j0 - 1; j <= j0 + 1; j++) for (let i = i0 - 1; i <= i0 + 1; i++) {
    const d = (i + hash(i * 7 + 3, j * 13 + 1) - u) ** 2 + (j + hash(j * 11 + 5, i * 3 + 2) - v) ** 2
    if (d < best) { best = d; bi = i; bj = j }
  }
  FACET[y * W + x] = (bi + 500) * 1000 + (bj + 500) * (big > 0.5 ? 7 : 1)
  const nx = hash(bi * 5 + 1, bj * 9 + 2) - 0.5, ny = hash(bj * 3 + 7, bi * 4 + 9) - 0.62      // more of them face up than down
  TILT[y * W + x] = -(nx * 0.55 + ny * 0.85) * 2
}
function land(c) {
  c.poly(LAND, "C"); c.poly(STACK, "C")
  for (const [cx, cy, rx, ry] of [[62, 107, 5, 4], [53, 112, 5, 3], [46, 116, 6, 3], [20, 112, 8, 5], [29, 114, 5, 4], [12, 114, 4, 3]]) c.ellipse(cx, cy, rx, ry, "C")
  const inside = new Uint8Array(W * H)
  for (let y = 66; y < H; y++) for (let x = 0; x < W; x++) inside[y * W + x] = c.is(x, y, "C") ? 1 : 0
  const m = (x, y) => x >= 0 && y >= 0 && x < W && y < H && inside[y * W + x] === 1
  const tone = (x, y) => 2.1 + TILT[y * W + x] * 2.0 - 1.7 * smooth((y - 94) / 26)
  for (let y = 66; y < H; y++) for (let x = 0; x < W; x++) {
    if (!m(x, y)) continue
    const i = y * W + x
    let v = tone(x, y)
    // a ledge catches the sky where the facet above it is darker (a lit edge), a crack shows where the one beside is brighter
    if (y > 0 && m(x, y - 1) && FACET[i - W] !== FACET[i] && tone(x, y - 1) < v - 0.6) v += 1.2
    else if (m(x + 1, y) && FACET[i + 1] !== FACET[i] && tone(x + 1, y) > v + 1.3) v -= 1
    if (!m(x, y - 1)) v += 1.8                                    // the top edge of the whole rock
    else if (!m(x - 1, y) && !m(x - 1, y - 1)) v += 0.9
    if (!m(x, y + 1) && y < H - 1) v -= 0.8                       // wet dark at the waterline
    c.px(x, y, "ABCDEFGH"[clamp(Math.round(v), 0, 6)])
  }
}
function grass(c) {
  const gust = 0.5 + 0.5 * Math.sin(TAU * c.frame / T - 0.8)
  for (let x = 64; x < 160; x += 3) {
    if (x > LX - 21 && x < LX + 21) continue
    if (hash(x, 3) < 0.3) continue
    let y = 66; while (y < H && !c.is(x, y, ROCK)) y++
    const h = 2 + Math.floor(hash(x, 9) * 3), lean = Math.round(gust * 1.6)
    for (const [dx, hh] of [[-1, h - 1], [0, h], [1, h - 1]])
      for (let k = 1; k <= hh; k++) c.px(x + dx + Math.round(lean * k / hh), y - k, k === hh ? "Z" : "X")
  }
}


// ---------------------------------------------------------------- surf
const nearRock = (c, x, y, r) => {
  for (let d = 1; d <= r; d++)
    for (let dy = -d; dy <= d; dy++) for (let dx = -d; dx <= d; dx++)
      if (Math.max(Math.abs(dx), Math.abs(dy)) === d && c.is(x + dx, y + dy, ROCK)) return d
  return 99
}
// lacy foam lapping at the foot of every rock, thicker and thinner as the swell comes and goes (two laps a loop)
function fringe(c) {
  for (let y = 103; y < H; y++) for (let x = 0; x < 72; x++) {
    if (c.is(x, y, ROCK)) continue
    const d = nearRock(c, x, y, 3)
    if (d > 3) continue
    const th = 1 + 1.6 * (0.5 + 0.5 * Math.sin(TAU * c.frame / 24 - (x + y) * 0.35))
    if (d > th || (d > 1 && hash(x, y + 7) < 0.4)) continue
    c.px(x, y, d === 1 && th > 1.8 ? "x" : d / th < 0.6 ? "w" : "v")
  }
}
// A breaker: the swell stands up against the rock, the crest folds and bursts, spray climbs and is blown to the right,
// foam sheets down the rock and the water runs back. Everything is a function of the frames since the impact.
const BREAKS = [{ f0: 8, x: 64, y: 104, k: 1.25 }, { f0: 26, x: 44, y: 111, k: 0.85 }, { f0: 42, x: 22, y: 108, k: 0.6 }]
BREAKS.forEach((e, n) => {
  const r = rng(40 + n)
  e.drops = Array.from({ length: 46 }, (_, i) => ({ dx: (r() - 0.5) * 8, vx: -0.4 + r() * 1.7, vy: -(1.9 + r() * 2.4) * e.k, big: i < 12, mist: i >= 32, late: Math.floor(r() * 3) }))
  e.rills = Array.from({ length: 7 }, (_, i) => ({ dx: i * 1.5 - 1, y0: e.y - 9 * e.k - (i % 3) * 2, v: 0.8 + r() * 0.5 }))
})
function breaker(c, e) {
  const tau = ((c.frame - e.f0 + T + 10) % T) - 10                // -10 .. 37 around the impact
  const water = (x, y, key) => { if (!c.is(x, y, ROCK)) c.px(x, y, key) }
  const X = e.x, Y = e.y, k = e.k
  if (tau >= -10 && tau < 3) {                                   // the swell stands up, crest first, and arrives
    const rise = smooth((tau + 10) / 10), h = (3 + 11 * rise) * k * (tau > 0 ? 1 - 0.75 * smooth(tau / 3) : 1)
    const cx = X - 2 - (tau < 0 ? 2.1 * -tau : 0)
    for (let x = Math.round(cx - 24); x <= X; x++) {
      const hp = Math.round(x <= cx ? h * Math.pow(Math.max(0, 1 - (cx - x) / 24), 1.35) : h * Math.max(0, 1 - (x - cx) / 3))
      for (let d = 0; d <= hp; d++) water(x, Y + 3 - d, d === hp ? "w" : d === hp - 1 ? "v" : d >= hp - 3 ? "u" : "t")
      if (hp > 3 * k && x > cx - 4 && x <= cx + 1) water(x + 1, Y + 3 - hp, "x")        // the crest folding over
    }
  }
  if (tau >= -1 && tau < 18) {                                   // the burst
    const u = tau + 1
    const bell = Math.sin(Math.PI * clamp(u / 19, 0, 1))
    for (let n = 0; n < 70; n++) {                               // white water boiling up where it hit
      const a = hash(e.f0 + 3, n) * Math.PI, d = Math.pow(hash(n, e.f0 + 5), 0.7) * (3 + u * 1.1) * k
      water(Math.round(X - 2 - Math.cos(a) * d * 1.3 + u * 0.4), Math.round(Y + 1 - Math.sin(a) * d * 1.05 * bell), u < 9 && n % 3 ? "x" : "w")
    }
    e.drops.forEach((p) => {
      const t = u - p.late
      if (t < 0) return
      const life = p.mist ? 19 : 14
      if (t >= life) return
      const wind = p.mist ? 0.1 : 0.05
      const px = X + p.dx * 0.5 + p.vx * t + wind * t * t, py = Y - 3 + p.vy * (p.mist ? 0.55 : 1) * t + 0.19 * t * t
      if (py > Y + 4) return
      const x = Math.round(px), y = Math.round(py)
      const key = p.mist ? (t > life - 5 ? "u" : "v") : t > life - 4 ? "v" : t > life - 7 ? "w" : "x"
      c.px(x, y, key)
      if (p.big && t < life - 5) { c.px(x - 1, y, "w"); c.px(x, y + 1, "w") }              // blobs of water
      if (!p.mist && t > 2) c.px(Math.round(px - p.vx * 0.9), Math.round(py - p.vy * 0.5 + 1), "v")   // short streak behind
    })
    for (const rl of e.rills) {                                  // foam sheeting down the rock
      const t0 = u - 3
      if (t0 < 0 || t0 > 13) continue
      const y = Math.round(rl.y0 + t0 * rl.v), x = X + Math.round(rl.dx)
      for (let d = 0; d < 4; d++) if (c.is(x, y - d, ROCK)) c.px(x, y - d, d === 0 ? "x" : d < 3 ? "w" : "v")
    }
  }
}
// wind-torn mist: ragged puffs of spray the gale tears off the burst and drives to the right, thinning as they go
function mist(c) {
  for (const e of BREAKS) {
    const tau = (c.frame - e.f0 + T) % T
    if (tau > 24) continue
    for (let i = 0; i < 6; i++) {
      const t = tau - i * 1.5
      if (t < 0 || t > 17) continue
      const a = Math.sin(Math.PI * t / 18), cx = e.x + 3 + i * 2.6 + t * 0.9, cy = e.y - 5 * e.k - i * 1.5 - t * 0.35
      const rx = (4 + i * 0.7) * e.k, ry = (2 + i * 0.35) * e.k
      for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
        const d = Math.hypot((x - cx) / rx, (y - cy) / ry)
        if (d > 1 || x < 0 || y < 0 || x >= W || y >= H || y > e.y + 3) continue
        const k = d < 0.55 ? 0.2 : (x + y) % 2 === 0 ? 0.1 : 0
        if (k) c.px(x, y, toward(c.get(x, y), [190, 214, 224], k * a))
      }
    }
  }
}
const surf = (c) => { fringe(c); BREAKS.forEach((e) => breaker(c, e)) }


// ---------------------------------------------------------------- tower, gallery, lantern room
const GH = 21                                                    // half width of the gallery
const TW = (y) => 12.5 + (y - 52) * 2.5 / 41                     // half width of the tower at row y
function tower(c) {
  // plinth
  c.rect(LX - 17, 93, 35, 5, "D"); c.hline(LX - 17, 93, 35, "F"); c.hline(LX - 17, 97, 35, "B")
  // the shaft: whitewash with two red bands, a cylinder lit on its left, shadowed under the gallery
  for (let y = 52; y <= 93; y++) {
    const hw = TW(y), x0 = Math.round(LX - hw), x1 = Math.round(LX + hw)
    const red = (y >= 60 && y <= 67) || (y >= 76 && y <= 83)
    const under = clamp(1 - (y - 52) / 9, 0, 1) * 1.6
    for (let x = x0; x <= x1; x++) {
      const u = (x - x0) / (x1 - x0)
      const v = clamp(Math.round(3.5 - 4.9 * u - under + (bayer(x, y) - 0.5) * 0.5), 0, 4)
      c.px(x, y, red ? "efgh"[clamp(v, 0, 3)] : "IJKLM"[v])
    }
  }
  // weathering with a cause: sea spray stains the whitewash up from the plinth to a ragged line; rain runs off the gallery in streaks
  const DARK = { J: "I", K: "J", L: "K", M: "L", f: "e", g: "f", h: "g" }
  const dim = (x, y) => { const k = c.key(x, y); if (DARK[k]) c.px(x, y, DARK[k]) }
  for (let x = LX - 14; x <= LX + 14; x++) for (let y = 93, top = 93 - 5 - Math.floor(hash(x, 2) * 6); y > top; y--) dim(x, y)
  for (const dx of [-10, -6, 2, 7, 11]) for (let y = 53, end = 53 + 6 + Math.floor(hash(dx, 4) * 9); y < end; y++) dim(LX + dx, y)
  c.rect(LX - 1, 70, 2, 4, "O"); c.px(LX - 1, 70, "Y"); c.rect(LX + 5, 87, 2, 3, "O")   // stair windows, lit
  c.rect(LX - 3, 88, 7, 6, "B"); c.hline(LX - 2, 87, 5, "B"); c.vline(LX - 3, 88, 6, "E"); c.rect(LX - 1, 89, 2, 2, "n")   // door
  // gallery floor: front fascia lit by the lamp through the glass, dark underside, corbels
  for (let x = LX - GH; x <= LX + GH; x++) {
    const d = Math.abs(x - LX)
    c.px(x, FLOOR, d < 8 ? "Y" : d < 13 ? "o" : d < 18 ? "O" : "n")
    c.px(x, FLOOR + 1, d < 8 ? "o" : d < 13 ? "O" : "n")
  }
  c.hline(LX - GH, FLOOR + 2, 2 * GH + 1, "B")
  for (let x = LX - GH + 2; x <= LX + GH - 2; x += 4) { c.vline(x, FLOOR + 3, 2, "C"); c.px(x, FLOOR + 3, "D") }
  // the lantern room: glass, lit from inside by the lens
  const gx0 = LX - 6, gx1 = LX + 6
  for (let y = 31; y <= 46; y++) {
    const k = Math.abs(y - 38.5)
    c.hline(gx0, y, 13, k <= 2 ? "y" : k <= 4 ? "Y" : k <= 6 ? "o" : "O")
  }
  for (let y = 34; y <= 43; y++) c.hline(LX - 1, y, 3, y % 2 ? "Y" : "y")                    // prisms of the lens
  for (const x of [gx0, LX - 2, LX + 2, gx1]) c.vline(x, 31, 16, "C")                       // mullions
  c.hline(gx0 - 1, 47, 15, "C"); c.hline(LX - 10, 30, 21, "E"); c.hline(LX - 10, 31, 3, "B"); c.hline(LX + 8, 31, 3, "B")   // base ring, eaves
  // dome, vent, rod
  for (let y = 23; y <= 29; y++) {
    const hw = [2.5, 4.5, 6, 7.2, 8.2, 9, 9.5][y - 23]
    for (let x = Math.round(LX - hw); x <= Math.round(LX + hw); x++) {
      const u = (x - (LX - hw)) / (2 * hw)
      c.px(x, y, u < 0.2 ? "G" : u < 0.45 ? "F" : u < 0.75 ? "D" : "C")
    }
  }
  c.hline(LX - 8, 29, 17, "n")                                                              // underside warmed by the lamp
  c.rect(LX - 1, 20, 3, 3, "E"); c.vline(LX, 14, 6, "F"); c.px(LX - 1, 20, "G")
}
function rails(c) {
  for (let x = LX - GH; x <= LX + GH; x += 4) c.vline(x, FLOOR - 5, 5, Math.abs(x - LX) < 14 ? "n" : "C")
  const lit = (x) => Math.abs(x - LX) < 10 ? "O" : Math.abs(x - LX) < 18 ? "n" : "D"
  for (let x = LX - GH; x <= LX + GH; x++) { c.px(x, FLOOR - 5, lit(x)); c.px(x, FLOOR - 3, "C") }
}


// ---------------------------------------------------------------- the keeper
// Facing us across the sea, into the wind (it comes from the left): cape and hat brim stream to the right, lantern held out
// in his near hand. Seen from below he is cut off by the gallery: only the top 13 rows show above the rail.
const KEEPER = `
  ......lkkj.........
  .....lkkkkj........
  .....lkkkkkj.......
  ...llkkkkkkkjj.....
  ...jjjjjjjjjj......
  ....mUmmUmj........
  ....mRRRRmj........
  ...lkkRRkkkj.......
  mllllkkkkkkkj......
  .n..lkkkkkkkj......
  oYo.lkkkkkkkjj.....
  YyY.lkkkkkkkjj.....
  oOo.kkkkkkkkkjj....
  ....lkkkkkkkkkj....
  ....kkkj...kkj.....
  ....lkj....lkj.....
  ...CCCC...CCCC.....`
anim("keeper", { w: 20, h: 17, frames: T, fps: FPS, outline: "B" }, (c) => {
  const f = c.frame
  const gust = 0.55 + 0.45 * Math.sin(TAU * f / T - 0.8)         // a slow gust over the loop...
  const flutter = TAU * (f % 8) / 8                              // ...and a quick flap, 6 a loop
  c.grid(0, 0, KEEPER)
  // the cape streams out behind him like a flag, in shade: its fold crests run down the wind to the tip
  const L = Math.round(5 + 6 * gust)
  for (let k = 0; k < L; k++) {
    const s = k / (L - 1), ph = flutter - 1.3 * k
    const yc = 10.4 - 3 * s * (0.4 + 0.6 * gust) + 1.8 * s * Math.sin(ph)
    const hh = 3.4 * Math.pow(1 - s, 0.8) + 0.7
    const top = Math.round(yc - hh), bot = Math.round(yc + hh)
    for (let y = top; y <= bot; y++)
      c.px(13 + k, y, k === L - 1 || y === bot ? "i" : Math.sin(ph) > 0.45 ? "k" : Math.sin(ph) < -0.3 ? "i" : y === top && k < 4 ? "l" : "j")
  }
  // the brim's windward... no: its lee side lifts and flaps
  const fl = Math.round(1 + 2 * gust + 1.2 * Math.sin(flutter + 1))
  for (let r = 3; r <= 4; r++) {
    let x = 19; while (x > 0 && !c.is(x, r, "*")) x--
    const n = Math.round(fl - (r - 3) * 0.8)
    for (let k = 0; k < n; k++) c.px(x + 1 + k, r, k === n - 1 ? "i" : r === 3 ? "k" : "j")
  }
  // the lantern swings in his hand
  const sw = [0, 0, 1, 1, 0, -1][f % 6]
  if (sw) c.grid(0, 9, "...\n...\n...\n...")
  c.px(1 + sw, 9, "n"); c.grid(0 + sw, 10, "oYo\nYyY\noOo")
})


// ---------------------------------------------------------------- gulls
// Three gulls beating into the gale: every beat they gain a couple of pixels and are thrown back, and over the loop they
// hang, wavering, in the same patch of sky. A gull caught in the beam flares white.
const WING = [58, 22, -30, 22]                                   // wing angle (deg above level) through a 4-frame beat
function gullAt(c, x, y, pose, lit, size) {
  const a = (WING[pose] * Math.PI) / 180, body = lit ? "Q" : "W", wing = lit ? "Q" : "R", tip = lit ? "R" : "P"
  const sx = x + 5, sy = y + 3, L = 6 * size
  c.hline(x + 3, sy, 5, body); c.px(x + 2, sy, "o"); c.px(x + 8, sy + 1, wing)           // beak, body, tail
  c.px(x + 3, sy - 1, body); c.hline(x + 4, sy + 1, 3, body)
  for (const dir of [-1, 1]) {
    const len = dir < 0 ? L : L * 0.85
    const ex = Math.round(sx + dir * len * Math.cos(a)), ey = Math.round(sy - len * Math.sin(a))
    c.line(sx, sy, ex, ey, wing)
    c.px(ex, ey, tip)
  }
}
const GULLS = [{ x: 28, y: 22, ph: 0, s: 1 }, { x: 58, y: 36, ph: 2, s: 1 }, { x: 10, y: 44, ph: 1, s: 0.75 }]
function gulls(c) {
  const f = c.frame
  for (const g of GULLS) {
    const pose = (f + g.ph) % 4
    const x = Math.round(g.x + 7 * Math.sin(TAU * f / T + g.ph) + [0, -2, -3, -1][pose])
    const y = Math.round(g.y + 2 * Math.sin(TAU * 2 * f / T + g.ph) + [1, 0, -1, 0][pose])
    gullAt(c, x, y, pose, beamAt(f, x + 5, y + 3) > 0.1, g.s)
  }
}


// ---------------------------------------------------------------- rain
// Wind-driven: every drop moves (vx, vy) a frame over a torus whose size makes the loop close.
const RAIN = [
  { n: 260, vx: 4, vy: 8, wp: 192, hp: 192, len: 3, key: "a", lit: "c", seed: 1 },
  { n: 120, vx: 5, vy: 10, wp: 240, hp: 240, len: 6, key: "b", lit: "d", seed: 2 },
]
for (const L of RAIN) {
  if ((T * L.vx) % L.wp || (T * L.vy) % L.hp) throw new Error("rain layer does not close")
  const r = rng(L.seed)
  L.drops = Array.from({ length: L.n }, () => [r() * L.wp, r() * L.hp])
}
function rain(c) {
  const f = c.frame, reach = 15 + 9 * FLASH(f)
  for (const L of RAIN) for (const [x0, y0] of L.drops) {
    const X = (x0 + L.vx * f) % L.wp, Y = (y0 + L.vy * f) % L.hp
    for (const ox of [0, -L.wp]) for (const oy of [0, -L.hp]) {
      const hx = Math.round(X + ox), hy = Math.round(Y + oy)
      if (hx < -4 || hx >= W + 4 || hy < -8 || hy >= H + 8) continue
      for (let k = 0; k < L.len; k++) {
        const x = hx - Math.round(k * 0.5), y = hy - k
        if (x < 0 || y < 0 || x >= W || y >= H) continue
        const lit = beamAt(f, x, y) > 0.12 || Math.hypot(x - LX, y - LY) < reach
        const key = lit ? L.lit : (k === L.len - 1 ? "a" : L.key)
        const under = c.get(x, y)
        if (lum(under) > (lit ? 190 : 95)) continue
        c.px(x, y, key)
      }
    }
  }
}

// ---------------------------------------------------------------- lamp halo and the keeper's lantern
// light spilling in clean rings, the outermost one half-stepped, over whatever is already drawn
function glowAt(c, cx, cy, R, A, skip) {
  for (let y = Math.floor(cy - R); y <= cy + R; y++) for (let x = Math.floor(cx - R); x <= cx + R; x++) {
    const d = Math.hypot(x - cx, y - cy)
    if (d > R || x < 0 || y < 0 || x >= W || y >= H || (skip && skip(x, y))) continue
    const s = d / R
    const t = s < 0.28 ? 1 : s < 0.52 ? 0.6 : s < 0.76 ? 0.32 : (x + y) % 2 === 0 ? 0.16 : 0
    if (t) c.px(x, y, toward(c.get(x, y), GLOW, t * A))
  }
}
const inGlass = (x, y) => x >= LX - 6 && x <= LX + 6 && y >= 31 && y <= 46
function lamp(c) {
  const f = c.frame
  glowAt(c, LX, LY, 15 + 11 * FLASH(f), 0.5 + 0.2 * FLASH(f), inGlass)
}
function lantern(c) {
  const f = c.frame, sw = [0, 0, 1, 1, 0, -1][f % 6]
  glowAt(c, 101 + sw, 31 + 11, 7, 0.55 + 0.1 * Math.sin(TAU * 6 * f / T), null)
}


// ---------------------------------------------------------------- scene
anim("_clock", { w: 1, h: 1, frames: T, fps: FPS }, () => {})

scene("gale_watch", { w: W, h: H, bg: "0", world: { horizon: HZ, light: { at: [LX, LY] } } },
  layer("clock", stamp("_clock", 0, 0)),
  sky, sea, beams, land, grass, tower, surf, mist,
  lantern,
  layer("keeper", stamp("keeper", 100, 31)),
  rails, lamp, gulls, rain)
