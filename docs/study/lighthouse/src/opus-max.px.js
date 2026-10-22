// The Keeper's Watch: a lighthouse on a rocky headland on a stormy night. 160x120, 96 frames at
// 80 ms (7.68 s): one turn of the lens per loop.
//
// Where the light comes from: one lamp, in the lantern at (50, 29) (world.light). Its lens throws a
// single beam that turns counterclockwise seen from above: at frame 0 out over the sea to the right,
// round toward us (the flash, frame 30, as it crosses the camera), out to the left over the land,
// away behind the tower. A beam is lit air, rain scattering the lamp's light toward us, so it is
// computed: the light gathered along each pixel's line of sight through a cone in 3D (rain scatters
// forward: brightest coming at us, faint going away), stepped up the palette's ramps. The camera
// stands below the lamp, so the beam swings like a clock hand: up as it comes at us, down as it
// goes away. The beam throws the keeper's shadow as it passes him, lights each gull only where its
// cone really reaches it, and lights the spray of the big wave that bursts with the flash. The
// glass glows all round; the keeper's own lantern lights his front. The gallery deck hides the lamp
// from everything below it: the tower and the headland get only the light the beam spills from the
// sky above, the tower's lit side turning with it.
// Wind from the right, off the sea: rain slants down-left, spray blows left, the gulls face right
// into it and are pushed back, the keeper's coat streams left.
pal({
  1: "#0c0f19", 2: "#121726", 3: "#1b2234", 4: "#283046",                            // night air, dark -> lit by the beam
  5: "#3b425a", 6: "#5a5e70", 7: "#858576", 8: "#b5ad8e", 9: "#e8dcb2",
  z: "#04070c", s: "#08101a", S: "#0e1a25", m: "#172a35", M: "#24404a",               // sea
  k: "#050508", K: "#0b0b12", R: "#14141e", r: "#22222f", j: "#363643",               // rock, ink
  G: "#0b1511", g: "#14231b", h: "#22382a",                                           // wet turf
  T: "#20242f", t: "#303644", u: "#464e60", U: "#666e80", w: "#959cab", X: "#d6dcd9", // pale things in the dark: whitewash, gulls, foam
  D: "#1d1317", d: "#3b2426", e: "#6b4533",                                           // iron, lit by the glass
  a: "#8a4a1a", L: "#d08030", l: "#f8c463", W: "#fff6da",                             // lamplight
  O: "#3e2a14", o: "#7a5a1c", y: "#c48f22", Y: "#f4c94a",                             // oilskin
  P: "#6a3a2a", p: "#c88058",                                                         // skin
})
const RAMPS = ["123456789", "zsSmM", "kKRrj", "Ggh", "TtuUwX", "Dde", "aLlW", "OoyY", "Pp"]
ramps(...RAMPS)
const RAMP_OF = {}
for (const r of RAMPS) for (const k of r) RAMP_OF[k] = r
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const up = (k, n) => { const r = RAMP_OF[k]; return !r || !n ? k : r[clamp(r.indexOf(k) + n, 0, r.length - 1)] }   // n steps along k's ramp (down if negative)

const W = 160, H = 120, N = 96, FPS = 12.5, TAU = Math.PI * 2
const HZ = 76                         // horizon: the camera's eye level
const LX = 50, LY = 29                // the lamp: the middle of the lens
const SKY = "123456789"

// ================================================================ the beam, in 3D
// Camera at the origin looking along +z; the lighthouse ZL metres off. The beam is a cone from the
// lens, R0 wide there, widening by TA a metre, tilted down by TILT so that it sweeps right over the
// camera once a turn; its light fades with distance (FADE) and spreads over its cross-section.
const F = 240, PPM = 4.44, ZL = F / PPM, EYE = 5.5   // focal length px, px a metre at the lighthouse, its distance, eye above the sea
const PL = [(LX + 0.5 - 80) / PPM, (HZ - LY - 0.5) / PPM, ZL]
const DEG = Math.PI / 180, TILT = 7 * DEG, TA = Math.tan(7 * DEG), R0 = 0.7, FADE = 40, S_IN = 1.4, S_MAX = 160
const KT = 1.7 * TA, C2 = 1 / (1 + KT * KT)              // the cone the integral looks inside: 1.7 radii
const heading = (f) => TAU * (f - 8) / N                 // 0: right, 90 deg: at us (frame 30), 180: left, 270: away
const beamDir = (phi) => [Math.cos(phi) * Math.cos(TILT), -Math.sin(TILT), -Math.sin(phi) * Math.cos(TILT)]
// the keeper on the gallery, metres from the lens: in the beam's way as it swings round toward us
const KEEP = { x: 2.1, z: -1.1, r: 0.36, y0: -2.0, y1: 0.05 }
const inKeeperShadow = (w0, w1, w2) => {
  const u = (KEEP.x * w0 + KEEP.z * w2) / (w0 * w0 + w2 * w2)
  if (u <= 0 || u >= 1) return false
  const dx = u * w0 - KEEP.x, dz = u * w2 - KEEP.z, yy = u * w1
  return dx * dx + dz * dz < KEEP.r * KEEP.r && yy > KEEP.y0 && yy < KEEP.y1
}

// where the ray (unit r) runs inside the cone round d: one interval of t, or null
function coneSpan(r, d) {
  const back = R0 / TA, A = [PL[0] - d[0] * back, PL[1] - d[1] * back, PL[2] - d[2] * back]
  const rd = r[0] * d[0] + r[1] * d[1] + r[2] * d[2], Ad = A[0] * d[0] + A[1] * d[1] + A[2] * d[2]
  const rA = r[0] * A[0] + r[1] * A[1] + r[2] * A[2], AA = A[0] * A[0] + A[1] * A[1] + A[2] * A[2]
  const a = rd * rd - C2, b = 2 * (C2 * rA - rd * Ad), c = Ad * Ad - C2 * AA
  let hLo = -Infinity, hHi = Infinity                   // the front nappe: t * rd >= Ad
  if (rd > 1e-9) hLo = Ad / rd; else if (rd < -1e-9) hHi = Ad / rd; else if (Ad > 0) return null
  const pieces = []
  if (Math.abs(a) < 1e-12) { if (b > 0) pieces.push([-c / b, Infinity]); else if (b < 0) pieces.push([-Infinity, -c / b]) }
  else {
    const disc = b * b - 4 * a * c
    if (disc < 0) { if (a > 0) pieces.push([-Infinity, Infinity]) }
    else {
      const q = Math.sqrt(disc), t1 = (-b - q) / (2 * a), t2 = (-b + q) / (2 * a), lo = Math.min(t1, t2), hi = Math.max(t1, t2)
      if (a > 0) pieces.push([-Infinity, lo], [hi, Infinity]); else pieces.push([lo, hi])
    }
  }
  let best = null
  for (const [lo, hi] of pieces) { const l = Math.max(lo, hLo), h = Math.min(hi, hHi); if (l < h && (!best || h - l > best[1] - best[0])) best = [l, h] }
  return best
}

// the lamp's light scattered toward us along the line of sight through pixel (x, y), up to depth tMax
function gather(x, y, d, tMax) {
  let r0 = (x + 0.5 - 80) / F, r1 = (HZ - y - 0.5) / F, r2 = 1
  const rl = Math.hypot(r0, r1, r2); r0 /= rl; r1 /= rl; r2 /= rl
  const span = coneSpan([r0, r1, r2], d)
  if (!span) return 0
  const rd = r0 * d[0] + r1 * d[1] + r2 * d[2], pd = PL[0] * d[0] + PL[1] * d[1] + PL[2] * d[2]
  let lo = Math.max(span[0], 0.3), hi = Math.min(span[1], tMax)
  if (rd > 1e-9) { lo = Math.max(lo, (S_IN + pd) / rd); hi = Math.min(hi, (S_MAX + pd) / rd) }
  else if (rd < -1e-9) { lo = Math.max(lo, (S_MAX + pd) / rd); hi = Math.min(hi, (S_IN + pd) / rd) }
  if (!(lo < hi)) return 0
  const n = 20, dt = (hi - lo) / n
  let sum = 0
  for (let i = 0; i < n; i++) {
    const t = lo + (i + 0.5) * dt, w0 = t * r0 - PL[0], w1 = t * r1 - PL[1], w2 = t * r2 - PL[2]
    const s = w0 * d[0] + w1 * d[1] + w2 * d[2]
    if (s < S_IN) continue
    const R = R0 + s * TA, rho2 = w0 * w0 + w1 * w1 + w2 * w2 - s * s
    if (inKeeperShadow(w0, w1, w2)) continue
    const q = rho2 / (R * R)
    sum += Math.exp(-s / FADE - 2 * q * q) / (R * R) * dt
  }
  const g = 0.25, hg = (cs) => (1 - g * g) / (1 + g * g - 2 * g * cs) ** 1.5
  return sum * hg(-rd) / hg(0)
}

// per frame: how many ramp steps the beam lifts each pixel (read off what is drawn: sky is open to
// infinity, the sea lies on its plane, the rest stands at the lighthouse)
const STEPS = new Map()
function beamSteps(c) {
  if (STEPS.has(c.frame)) return STEPS.get(c.frame)
  const d = beamDir(heading(c.frame)), out = new Int8Array(W * H)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = c.key(x, y)
    const depth = SKY.includes(k) ? Infinity : y > HZ && "zsSmMuUwX".includes(k) ? EYE * F / (y + 0.5 - HZ) : ZL
    const b = gather(x, y, d, depth)
    if (b > 0) out[y * W + x] = clamp(Math.floor(Math.log2(b / 0.026) * 0.92 + 1 + (bayer(x, y) - 0.5) * 0.75), 0, 7)
  }
  STEPS.set(c.frame, out)
  return out
}
// how squarely the beam meets the keeper (0..1): he is lit by it, his back and his coat
const keeperHit = (f) => {
  const d = beamDir(heading(f)), k = [KEEP.x, (KEEP.y0 + KEEP.y1) / 2, KEEP.z], kl = Math.hypot(...k)
  const s = (d[0] * k[0] + d[1] * k[1] + d[2] * k[2]), rho2 = kl * kl - s * s, R = R0 + Math.max(0, s) * TA
  return s <= 0 ? 0 : Math.exp(-2 * rho2 / (R * R))
}
// how squarely the beam meets the camera (0..1): the flash
const camHit = (f) => {
  const d = beamDir(heading(f)), cl = Math.hypot(...PL), cosA = -(d[0] * PL[0] + d[1] * PL[1] + d[2] * PL[2]) / cl
  return Math.exp(-((Math.acos(clamp(cosA, -1, 1)) / (6 * DEG)) ** 2))
}

// ================================================================ the land
// The headland stands in the sea: the brow, a buttress under the tower, a crag at its tip, its wet
// foot at the waterline; a sea stack off the tip and a boulder in the shallows in front.
const BROW = [[0, 60], [6, 59], [12, 59], [18, 61], [24, 63], [30, 65], [36, 67], [41, 68], [46, 69], [56, 69], [62, 69], [68, 70], [73, 72], [78, 75]]
const CLIFF = [[81, 78], [83, 82], [86, 85], [89, 87], [92, 88], [95, 89], [98, 87], [100, 86], [102, 88], [104, 92], [106, 97], [107, 101], [106, 105], [104, 106]]
const FOOT = [[98, 107], [90, 106], [82, 107], [74, 108], [64, 107], [54, 108], [44, 107], [34, 108], [24, 107], [14, 108], [6, 107], [0, 108]]
const LAND = [...BROW, ...CLIFF, ...FOOT]
const STACK = [[110, 107], [110, 103], [112, 100], [115, 99], [117, 100], [119, 103], [121, 107]]
const BOULDER = [[15, 118], [17, 113], [21, 110], [27, 110], [31, 112], [33, 116], [32, 119], [16, 119]]
// the masses, each lit on its own edges from the lamp's side (left of the tower from the upper
// right, right of it from the upper left), the upper ones paler, the foot darker
const MASSES = [
  { pts: [0, 60, 6, 59, 12, 59, 18, 61, 24, 63, 30, 65, 36, 67, 41, 68, 46, 69, 56, 69, 62, 69, 68, 70, 73, 72, 78, 75, 81, 78, 74, 79, 66, 77, 58, 76, 48, 76, 40, 74, 32, 72, 24, 70, 16, 68, 8, 67, 0, 67], k: "R", light: [0, -1] },
  { pts: [0, 67, 8, 67, 16, 68, 24, 70, 30, 72, 33, 78, 34, 88, 30, 96, 20, 98, 10, 97, 0, 98], k: "K", light: [0.6, -1] },
  { pts: [33, 74, 40, 74, 48, 76, 58, 76, 66, 77, 74, 79, 81, 78, 84, 84, 85, 92, 80, 98, 70, 100, 58, 99, 46, 98, 38, 96, 33, 88, 34, 80], k: "R", light: [-0.6, -1] },
  { pts: [84, 84, 86, 85, 89, 87, 92, 88, 95, 89, 98, 87, 100, 86, 102, 88, 104, 92, 106, 97, 107, 101, 106, 105, 104, 106, 98, 107, 92, 104, 86, 98, 85, 92], k: "R", light: [-0.6, -1] },
  { pts: [0, 98, 10, 97, 20, 98, 30, 96, 38, 96, 46, 98, 58, 99, 70, 100, 80, 98, 86, 98, 92, 104, 98, 107, 90, 106, 82, 107, 74, 108, 64, 107, 54, 108, 44, 107, 34, 108, 24, 107, 14, 108, 6, 107, 0, 108], k: "K", light: [-0.3, -1] },
  { pts: STACK.flat(), k: "R", light: [-0.6, -1] },
  { pts: BOULDER.flat(), k: "R", light: [0.4, -1] },
]
const inPoly = (pts, x, y) => {
  let inside = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j]
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}
const isLand = (x, y) => [LAND, STACK, BOULDER].some((P) => inPoly(P, x + 0.5, y + 0.5))
const browY = (x) => {
  for (let i = 1; i < BROW.length; i++) if (x <= BROW[i][0]) { const [x0, y0] = BROW[i - 1], [x1, y1] = BROW[i]; return y0 + (y1 - y0) * (x - x0) / (x1 - x0) }
  return BROW[BROW.length - 1][1]
}
// Rock in flat angular facets: each mass split into cells round seeds about 7 px apart, each cell a
// plane at its own tilt (tilted up more near the mass's top), toned by how squarely it faces the
// light from the lamp's side. A crack only where two facets far apart in tone meet. The silhouette
// against the sky catches a rim; at the waterline the wet rock shines.
const FACETS = MASSES.map((m, mi) => {
  const P = []
  for (let i = 0; i < m.pts.length; i += 2) P.push([m.pts[i], m.pts[i + 1]])
  const xs = P.map((p) => p[0]), ys = P.map((p) => p[1])
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  const r = rng(40 + mi), seeds = []
  for (let y = y0 - 3; y < y1 + 6; y += 6) for (let x = x0 - 4; x < x1 + 8; x += 8) {
    const sx = x + r() * 7, sy = y + r() * 5, top = (sy - y0) / Math.max(1, y1 - y0)
    const n = [(r() - 0.5) * 1.3, (r() - 0.5) * 1.1 - 0.7 * (1 - top), -1], l = Math.hypot(...n)
    seeds.push([sx, sy, n.map((v) => v / l)])
  }
  const L = [m.light[0] * 0.8, -1, -0.7], ll = Math.hypot(...L)
  return { P, seeds, L: L.map((v) => v / ll), dark: m.k === "K" ? 1 : 0, box: [x0, x1, y0, y1] }
})
function facets(c) {
  const tone = new Int8Array(W * H).fill(-1), cellOf = new Int16Array(W * H).fill(-1)
  FACETS.forEach((f, fi) => {
    const [x0, x1, y0, y1] = f.box
    for (let y = Math.max(0, y0); y <= Math.min(H - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(W - 1, x1); x++) {
      if (!inPoly(f.P, x + 0.5, y + 0.5)) continue
      let best = 0, bd = Infinity
      f.seeds.forEach(([sx, sy], i) => { const d = (x - sx) ** 2 * 0.8 + (y - sy) ** 2; if (d < bd) { bd = d; best = i } })
      const n = f.seeds[best][2], lam = n[0] * f.L[0] + n[1] * f.L[1] + n[2] * f.L[2]
      tone[y * W + x] = clamp((lam > 0.82 ? 3 : lam > 0.62 ? 2 : lam > 0.4 ? 1 : 0) - f.dark, 0, 3)
      cellOf[y * W + x] = fi * 1000 + best
    }
  })
  const T = "KKRr"
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, t = tone[i]
    if (t < 0) continue
    let k = T[t]
    const above = y > 0 ? tone[i - W] : -1, below = y < H - 1 ? tone[i + W] : -1, right = x < W - 1 ? tone[i + 1] : -1
    if (above < 0) k = T[Math.min(3, t + 1)] === "r" && y < 80 ? "j" : T[Math.min(3, t + 1)]                 // rim against the sky
    else if ((cellOf[i - W] !== cellOf[i] && Math.abs(above - t) >= 2) || (right >= 0 && cellOf[i + 1] !== cellOf[i] && Math.abs(right - t) >= 2)) k = "k"   // a crack
    if (below < 0 && y > 100 && hash(x, 77) < 0.22) k = hash(x, 78) < 0.5 ? "j" : "r"                       // wet at the waterline
    c.px(x, y, k)
  }
}

// turf along the brow: tufts against the sky, combed left by the wind, a gust running through them
function turf(c) {
  for (let x = 0; x < 80; x++) {
    const yb = Math.round(browY(x))
    c.px(x, yb, "G"); if (c.is(x, yb + 1, "*")) c.px(x, yb + 1, "g")
    if (hash(x, 5) < 0.45) continue
    const h = 1 + Math.floor(hash(x, 9) * 3), gust = Math.sin(TAU * (2 * c.frame / N + x / 37))
    const lean = gust > 0.3 ? 2 : gust > -0.4 ? 1 : 0
    for (let j = 1; j <= h; j++) c.px(x - Math.round(lean * j / h), yb - j, j === h ? "g" : "G")
  }
}

// ================================================================ the sea
// A storm sea seen from 5.5 m above it: three swells crossing (sharp crests, wide troughs), each
// running in a whole number of times a loop. Drawn column by column from the nearest water out to
// the horizon, so a near crest hides the trough behind it. A face turned toward us is dark (it
// shows the black sky behind the camera), a crest's top catches the glow low over the sea, and
// where the swells pile up the crest breaks white. What a pixel can't resolve far out flattens, so
// the far sea lies calm under the horizon. It is drawn after the rocks, only where it is nearer.
const SWELLS = [
  { len: 32, dx: -0.3, dz: -0.95, cyc: 2, amp: 1.1, ph: 0.3 },
  { len: 17, dx: -0.85, dz: -0.53, cyc: 3, amp: 0.6, ph: 1.7 },
  { len: 9, dx: 0.45, dz: -0.89, cyc: 4, amp: 0.3, ph: 4.1 },
]
const AMAX = SWELLS.reduce((a, s) => a + s.amp, 0)
const crestShape = (th) => 2 * Math.pow((1 + Math.cos(th)) / 2, 1.8) - 1
const seaHeight = (X, Z, t) => {
  const foot = Z * Z / (EYE * F)                          // metres of sea one pixel row spans there
  let h = 0
  for (const s of SWELLS) {
    const att = Math.exp(-((1.2 * foot / s.len) ** 2))
    if (att > 0.02) h += s.amp * att * crestShape(TAU * ((X * s.dx + Z * s.dz) / s.len - s.cyc * t) + s.ph)
  }
  return h
}
let LAND_Z = null                                         // how far off the rock is at each pixel (the boulder nearer)
const landZ = (x, y) => {
  if (!LAND_Z) {
    LAND_Z = new Float32Array(W * H).fill(Infinity)
    for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++)
      LAND_Z[yy * W + xx] = inPoly(BOULDER, xx + 0.5, yy + 0.5) ? 26 : inPoly(STACK, xx + 0.5, yy + 0.5) ? 28 : inPoly(LAND, xx + 0.5, yy + 0.5) ? 34 : Infinity
  }
  return LAND_Z[y * W + x]
}
function sea(c) {
  const t = c.frame / N
  for (let x = 0; x < W; x++) {
    let top = H
    for (let Z = 24; Z < 4000 && top > HZ - 4; Z *= 1.01) {
      const X = (x + 0.5 - 80) * Z / F, h = seaHeight(X, Z, t)
      const y = Math.floor(HZ + F * (EYE - h) / Z)
      if (y >= top) continue
      const ahead = seaHeight(X, Z * 1.04, t), behind = seaHeight(X, Z * 0.96, t)
      const rising = ahead - h, isCrest = h >= ahead && h >= behind
      let k
      if (Z > 260) k = y <= HZ ? "m" : y <= HZ + 1 ? "S" : "s"                       // far off: flat, the horizon's glow along its edge
      else if (h > AMAX * 0.5 && (isCrest || rising < 0)) {
        const patch = vnoise(X / 2.2 + Z * 0.3, Z / 6 + 7)
        k = patch > 0.52 ? (h > AMAX * 0.62 ? "w" : "U") : isCrest ? "M" : "m"          // breaking white, in patches
      } else if (isCrest && h > -0.2 && vnoise(X / 3 + 11, Z / 4) > 0.42) k = "m"
      else if (rising > 0.04 * Z / 30) k = h < -0.3 ? "z" : "s"                       // a face toward us
      else k = "S"
      for (let yy = Math.max(0, y); yy < top; yy++) if (landZ(x, yy) > Z) c.px(x, yy, k)
      top = y
    }
  }
}

// ================================================================ the lighthouse
// local coordinates: the sprite's (0, 0) is the scene's (37, 11); the axis is column 13
const LH_X = 37, LH_Y = 11, AX = 13
const towerHW = (y) => Math.round(6 + 2 * (y - 40) / 32)       // half width at scene row y
sprite("_lighthouse", { w: 27, h: 62 }, (c) => {
  const S = (y) => y - LH_Y
  // rod, vane (its head into the wind), ventilator ball
  c.vline(AX, S(14), 4, "D")
  c.hline(AX - 1, S(18), 3, "D"); c.hline(AX - 1, S(19), 3, "D"); c.px(AX - 1, S(18), "d")
  // dome: dark iron; its lip catches the glass's light from below
  ;[[20, 2], [21, 4], [22, 5], [23, 6], [24, 6]].forEach(([y, hw]) => c.hline(AX - hw, S(y), 2 * hw + 1, "D"))
  c.hline(AX - 3, S(21), 2, "d"); c.px(AX - 4, S(22), "d")
  c.hline(AX - 7, S(25), 15, "e")
  // glazing: the lamp room seen through the glass, warm and dim away from the lens; astragals
  for (let y = S(26); y <= S(33); y++) for (let x = AX - 6; x <= AX + 6; x++) {
    const dd = Math.hypot((x - AX) / 1.6, y - S(29.5))
    c.px(x, y, dd < 3.2 ? "L" : dd < 4.4 && bayer(x, y) < 0.5 ? "L" : "a")
  }
  for (const x of [AX - 6, AX - 3, AX + 3, AX + 6]) c.vline(x, S(26), 8, "D")
  c.hline(AX - 6, S(34), 13, "D")
  // pedestal under the glass
  c.rect(AX - 6, S(35), 13, 3, "D")
  // gallery deck, seen from below: its edge and underside; braces under the overhang
  c.hline(0, S(38), 27, "d"); c.hline(1, S(39), 25, "D")
  for (const s of [-1, 1]) { c.px(AX + s * 9, S(40), "D"); c.px(AX + s * 8, S(41), "D"); c.px(AX + s * 7, S(42), "D") }
  // the tower: whitewash in the gallery's shadow; a cornice band with the brackets' ends, two slit windows
  for (let y = 40; y <= 72; y++) { const hw = towerHW(y); c.hline(AX - hw, S(y), 2 * hw + 1, y < 44 ? "T" : "t") }
  for (let x = AX - 6; x <= AX + 6; x += 3) c.px(x, S(40), "D")
  c.grid(AX + 1, S(47), "KK\nKK\nKK\nuu"); c.grid(AX - 2, S(58), "KK\nKK\nKK\nuu")
  // rust run down from the brackets
  for (const x of [AX - 5, AX + 4]) c.vline(x, S(44), 4, "T")
})
// the railing, in front of the keeper: dark against the lamp room, lit by the glass out at the sides
sprite("_railing", { w: 27, h: 4 }, (c) => {
  for (let x = 0; x < 27; x++) c.px(x, 0, x >= 7 && x <= 19 ? "D" : "e")
  for (let x = 0; x < 27; x += 2) c.vline(x, 1, 3, "D")
})

// ================================================================ the keeper
// Facing right into the wind, his lantern held out over the rail. Lit from behind by the lamp room's
// glass and in front by his own lantern: both his edges catch light. The coat's skirt and the
// sou'wester's back brim stream left; they flutter faster in the gusts.
const KEEPER = `
  ......Yyy...
  ....YYyyoo..
  ......Yop...
  .....Yooyyyp
  .....Yoo...D
  .....Yooy..W
  .....Yooy..l
  .....yoOy..D
  ......k.k...`
// the skirt streaming behind him, row by row how far back it reaches (its edge catches the glass's
// light, the cloth behind the edge is in its own shade)
const FLAPS = [
  { 4: 4, 5: 3, 6: 2, 7: 1 },          // straight back
  { 4: 4, 5: 2, 6: 2, 7: 3 },          // a ripple running down it
  { 5: 3, 6: 1, 7: 2 },                // flung out at the hem
  { 4: 4, 5: 4, 6: 3, 7: 3 },          // falling back
]
anim("_keeper", { w: 12, h: 9, frames: N, fps: FPS, facing: "right", pivot: [7, 9] }, KEEPER, (c) => {
  const gust = 0.5 + 0.5 * Math.sin(TAU * (2 * c.frame / N) + 1.2)
  const beat = Math.floor(c.frame / (gust > 0.6 ? 1 : 2)) % 4
  for (const [row, xl] of Object.entries(FLAPS[beat])) for (let x = xl; x <= 4; x++) c.px(x, +row, x === xl ? "y" : "o")
  c.px(4, 1, beat % 2 ? "y" : ".")             // the back brim lifts
  const hit = keeperHit(c.frame)                 // the beam sweeping over him
  if (hit > 0.15) c.recolor({ O: "o", o: "y", y: "Y" }, [0, 0, 7, 9])
})

// ================================================================ gulls
// A gull drawn from its wings: each an arm (root to wrist) and a hand (wrist to the black tip), the
// hand lagging the arm through the beat so the wing bends; a roll tips one wing up and the other
// down. Facing right, into the wind. Grey in the dark, the side toward the lamp a step lighter; a
// gull is as far off as its size says, so it lights up only where the beam's cone really reaches
// it (each gull at its own moment of the turn) and stays a dark shape against the beam behind it.
function gull(c, cx, cy, span, beat, roll, stiff, lift) {
  const K = (k) => up(k, lift)
  const upb = Math.sin(TAU * beat), arm = stiff ? 0.55 : 0.8 * upb + 0.1, hand = stiff ? -0.5 : arm - 0.3 - 0.55 * Math.sin(TAU * beat - 1.2)
  const L1 = span * 0.48, L2 = span * 0.55
  for (const sd of [-1, 1]) {
    const e1 = arm - sd * roll, e2 = hand - sd * roll
    const rx = cx + sd, wx = rx + sd * L1 * Math.cos(e1), wy = cy - L1 * Math.sin(e1)
    const tx = wx + sd * L2 * Math.cos(e2), ty = wy - L2 * Math.sin(e2)
    const R = (v) => Math.round(v)
    c.line(R(wx), R(wy), R(tx), R(ty), K("u"))                  // the hand
    if (span > 7) c.line(rx, cy + 1, R(wx), R(wy) + 1, K("u"))  // the arm is broad: its trailing edge
    c.line(rx, cy, R(wx), R(wy), K(sd < 0 ? "U" : "u"))         // and its leading edge
    c.px(R(tx), R(ty), "k")
    if (span > 7) c.px(R(tx - sd * (tx - wx) / L2), R(ty - (ty - wy) / L2), "k")
  }
  const tilt = roll > 0.25 ? 1 : 0
  c.hline(cx - 1, cy, 3, K("U")); c.px(cx + 2, cy - tilt, K("U")); c.px(cx - 2, cy, K("w"))
  if (span > 7) { c.px(cx + 3, cy - tilt, "o"); c.hline(cx - 1, cy + 1, 3, K("u")) }
}
// where: the anim's place in the scene; ph: its own phase; span: half its wingspan in px; beat:
// frames a wingbeat; push: how hard the gusts throw it. Each beats hard into the wind; when a gust
// takes it, it stiffens its wings into a bent M, rolls, is thrown back and down, and claws back.
const GULLS = [
  { name: "_gull_a", at: [100, 30], ph: 0, span: 10, beat: 6, push: 1.2 },
  { name: "_gull_b", at: [112, 4], ph: 2.1, span: 5, beat: 4, push: 0.8 },
  { name: "_gull_c", at: [76, 6], ph: 4.3, span: 6, beat: 6, push: 1 },
]
const gullPose = (g, f) => {
  const k = TAU * f / N, gust = Math.sin(k * 3 + g.ph), stiff = gust > 0.6
  return {
    x: 24 + Math.round(g.push * (6 * Math.sin(k * 3 + g.ph - 0.6) + 2 * Math.sin(k * 5 + g.ph * 2))),
    y: 13 + Math.round(3 * gust + 1.2 * Math.sin(k * 8 + g.ph)),
    stiff, roll: stiff ? 0.3 * Math.abs(Math.sin(k * 6 + g.ph)) : 0.18 * Math.sin(k * 6 + g.ph), beat: (f % g.beat) / g.beat,
  }
}
const gullLift = (g, f) => {
  const p = gullPose(g, f), Z = F * 0.7 / g.span                     // a 1.4 m wingspan
  const P = [(g.at[0] + p.x + 0.5 - 80) * Z / F, (HZ - g.at[1] - p.y - 0.5) * Z / F, Z], d = beamDir(heading(f))
  const w = [P[0] - PL[0], P[1] - PL[1], P[2] - PL[2]], s = w[0] * d[0] + w[1] * d[1] + w[2] * d[2]
  if (s < S_IN) return 0
  const R = R0 + s * TA, q = (w[0] ** 2 + w[1] ** 2 + w[2] ** 2 - s * s) / (R * R)
  return clamp(Math.floor(Math.log2(Math.exp(-s / FADE - 2 * q * q) / (R * R) / 0.006)), 0, 3)
}
const inGull = (x, y, f) => GULLS.some((g) => { const p = gullPose(g, f), gx = g.at[0] + p.x, gy = g.at[1] + p.y; return Math.abs(x - gx) <= g.span + 2 && Math.abs(y - gy) <= g.span })
for (const g of GULLS)
  anim(g.name, { w: 48, h: 28, frames: N, fps: FPS, facing: "right" }, (c) => {
    const p = gullPose(g, c.frame)
    gull(c, p.x, p.y, g.span, p.beat, p.roll, p.stiff, gullLift(g, c.frame))
  })

// ================================================================ surf: waves bursting on the rocks
// Each break: the swell slams the rock's sea face, a jet of white water climbs it and is torn off
// left by the wind as spray (joined at first, then ribbons, then drops falling), the water pours back
// down the rock in white streaks and a raft of foam spreads on the water and comes apart.
const SURF_Y = 50
const BREAKS = [
  { x: 107, y: 102, at: 26, power: 1.0, n: 90, rock: LAND },
  { x: 107, y: 103, at: 74, power: 0.75, n: 70, rock: LAND },
  { x: 121, y: 104, at: 8, power: 0.55, n: 45, rock: STACK },
  { x: 121, y: 105, at: 56, power: 0.6, n: 45, rock: STACK },
  { x: 33, y: 114, at: 34, power: 0.5, n: 40, rock: BOULDER },
  { x: 33, y: 114, at: 82, power: 0.45, n: 35, rock: BOULDER },
  { x: 78, y: 108, at: 44, power: 0.3, n: 20, rock: LAND },
  { x: 52, y: 108, at: 90, power: 0.3, n: 20, rock: LAND },
]
anim("_surf", { w: W, h: 70, frames: N, fps: FPS }, (c) => {
  const P = (x, y, k) => c.px(Math.round(x), Math.round(y) - SURF_Y, k)
  const blob = (x, y, r, k) => {
    if (r < 0.75) return P(x, y, k)
    const R = Math.ceil(r)
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) if (dx * dx + dy * dy <= r * r + 0.3) P(x + dx, y + dy, k)
  }
  const G = 0.32, WIND = 0.12                                   // px a frame squared: gravity, and the wind pushing left
  BREAKS.forEach((b, bi) => {
    const age = (c.frame - b.at + N) % N
    if (age > 30) return
    const r = c.rng(100 + bi)
    // the surge: white water heaped against the face, then sinking back
    if (age < 5) {
      const hgt = [2, 3, 3, 2, 1][age] * b.power + 1, wid = [4, 6, 7, 8, 7][age]
      for (let j = 0; j < hgt; j++) for (let i = -wid; i <= 1; i++) {
        const e = (i / wid) ** 2 + (j / hgt) ** 2
        if (e <= 1 && !(age > 3 && hash(i + bi, j) < (age - 3) * 0.3)) P(b.x + i, b.y - j, e > 0.6 ? "U" : "w")
      }
    }
    // the jet: a fan of water thrown up the face, leaning back over the rock with the wind; clumps
    // at first (they join into one sheet), smaller and duller as they fly, single drops at the end
    const drops = []
    for (let i = 0; i < b.n; i++) {
      const u = r(), delay = r() * 2.5, ang = -0.18 - 0.22 * u + (r() - 0.5) * (0.15 + 0.7 * u), sp = (1.4 + 3.2 * u) * Math.sqrt(b.power)
      const x0 = b.x - r() * 3, y0 = b.y - 1 - r() * 6, life = 14 + r() * 12, a = age - delay
      if (a < 0 || a > life) continue
      const vx = Math.sin(ang) * sp, vy = -Math.cos(ang) * sp
      const x = x0 + vx * a - 0.5 * WIND * a * a * (1 + a / 8), y = y0 + vy * a + 0.5 * G * a * a
      if (vy + G * a > 0 && (isLand(Math.round(x), Math.round(y)) || y > b.y + 1)) continue   // fell back on the rock or the sea
      drops.push([x, y, a])
    }
    drops.sort((p, q) => q[2] - p[2])                            // the young, bright ones on top
    for (const [x, y, a] of drops) {
      const rad = (a < 1.5 ? 1.5 : a < 3 ? 1.1 : a < 6 ? 0.8 : 0.4) * (y < b.y - 14 && a > 2 ? 0.7 : 1)
      blob(x, y, rad, a < 4 ? "w" : a < 9 ? "U" : "u")
      if (a < 3 && rad > 1) P(x - 1, y - 1, "X")                // the side toward the lamp
    }
    // the water pours back off the rock: streams down its face, the last of it dribbling
    if (age >= 6 && age < 26) for (let s = 0; s < 5; s++) {
      const sx = b.x - 2 - s * 3 + (s % 2), start = 6 + s * 1.5
      if (age < start) continue
      const onRock = (y) => inPoly(b.rock, sx + 0.5, y + 0.5)
      let topY = b.y - 14
      while (topY < b.y && !onRock(topY)) topY++
      const head = topY + (age - start) * 2.2
      for (let y = Math.max(topY, Math.floor(head) - 4); y <= Math.min(head, b.y); y++)
        if (onRock(y) && !(age > 16 && (y + s) % 3 === 0)) P(sx, y, age < 14 ? "w" : "U")
    }
  })
})
// foam rafts on the water round the rocks after each break: a sheet that spreads thin along the
// surface, opens into a lace of bubbles' edges, and the lace comes apart
function foam(c) {
  BREAKS.forEach((b, bi) => {
    const age = (c.frame - b.at + N) % N
    if (age < 3 || age > 44) return
    const a = age - 3, wHalf = 3 + a * 0.75 * b.power + 2, hHalf = 1 + a * 0.08, cx = b.x - 2 - a * 0.25
    for (let y = Math.floor(b.y - hHalf); y <= b.y + hHalf + 1; y++) for (let x = Math.floor(cx - wHalf); x <= cx + wHalf; x++) {
      if (!c.is(x, y, "*") || isLand(x, y)) continue
      const e = ((x - cx) / wHalf) ** 2 + ((y - b.y - 0.5) / hHalf) ** 2
      if (e > 1) continue
      if (vnoise(x / 1.7 + bi * 7, y / 0.9) < 0.32 + 0.55 * a / 44 + 0.3 * e) continue
      c.px(x, y, a < 8 && e < 0.5 ? "w" : "U")
    }
  })
}

// ================================================================ sky
// A heavy overcast rolling slowly left (80 px a loop: its pattern repeats every 80 px, too soft to
// see), and under it ragged scud racing with the gale (a picture's width a loop). Low over the sea
// the sky keeps a little glow. The scud's undersides are lit from below, by the lantern's glow
// near the tower and anywhere the beam passes (the beam itself is laid over all of it later).
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t) }
const OVERCAST = seamless((x, y) => fbm(x / 34, y / 11, 3), 80)
const SCUD = seamless((x, y) => fbm(x / 20, y / 5, 4), W)
function sky(c) {
  const t = c.frame / N
  const scud = (x, y) => smooth(0.56, 0.63, SCUD(x + W * t, y)) * smooth(10, 22, y) * (1 - smooth(52, 66, y))
  for (let y = 0; y < HZ; y++) for (let x = 0; x < W; x++) {
    const g = y / HZ
    let v = 0.9 + 2.9 * g ** 1.7
    v += smooth(0.48, 0.6, OVERCAST(x + 80 * t, y)) * (1.1 - g * 0.6)
    const sc = scud(x, y)
    v += sc * 1.1
    if (sc > 0.5 && scud(x, y + 2) < 0.3) v += 0.45 + 0.5 * Math.exp(-(((x - LX) / 40) ** 2))   // a lit underside
    v += (bayer(x, y) - 0.5) * 0.22
    c.px(x, y, SKY[clamp(Math.floor(v) - 1, 0, 4)])
  }
}

// ================================================================ rain
// Three depths, each drop on a 2:1 slant down-left; each goes round a whole number of times a loop
// (the far ones 3, the near ones 9). A streak is the ground behind it one step up its own ramp,
// more in the beam, where the drops glitter.
const RAIN = [
  { n: 110, len: 2, k: 3, lift: 1, far: true },
  { n: 55, len: 4, k: 6, lift: 1 },
  { n: 16, len: 8, k: 9, lift: 2 },
].map((L, li) => ({ ...L, drops: Array.from({ length: L.n }, (_, i) => [hash(i, 31 + li) * 192, hash(i, 57 + li) * 128]) }))
function rain(c) {
  const st = beamSteps(c)
  for (const L of RAIN) {
    const vy = 128 * L.k / N
    for (const [x0, y0] of L.drops) {
      const yy = y0 + vy * c.frame, hy = Math.floor(yy % 128) - 8, hx = Math.floor((((x0 - yy / 2) % 192) + 192) % 192) - 32
      for (let i = 0; i < L.len; i++) {
        const x = hx + (i >> 1), y = hy - i
        if (x < 0 || y < 0 || x >= W || y >= H) continue
        const k = c.key(x, y)
        if (!k || (L.far && !SKY.includes(k) && !"zsSmM".includes(k))) continue
        const b = st[y * W + x]
        c.px(x, y, up(k, L.lift + (b >= 2 ? 1 : 0) + (b >= 4 ? 1 : 0)))
      }
    }
  }
}

// where the near rain lands: on the water in front and on the rock's upturned edges, a drop shows
// as a dot, then a crown two pixels wide, and is gone. 40 of them, each landing every 12 frames
// somewhere new (8 places a loop, so the loop closes).
function splashes(c) {
  for (let i = 0; i < 40; i++) {
    const t = c.frame + Math.floor(hash(i, 3) * 12), age = t % 12, cyc = Math.floor(t / 12) % 8
    if (age > 1) continue
    let x = Math.floor(hash(i, cyc + 10) * W), y = 0, ok = false
    if (i % 3) { y = 100 + Math.floor(hash(i, cyc + 20) * 20); ok = y < H && "zsSmM".includes(c.key(x, y)) }
    else for (y = 60 + Math.floor(hash(i, cyc + 30) * 50); y < H - 1; y++) if (!SKY.includes(c.key(x, y - 1)) && "kKRrjGgh".includes(c.key(x, y)) && SKY.includes(c.key(x, y - 2))) { ok = true; break }
    if (!ok && i % 3 === 0) for (y = 60; y < H - 1; y++) if ("KRrj".includes(c.key(x, y)) && !"KRrjkGgh".includes(c.key(x, y - 1))) { ok = true; break }
    if (!ok) continue
    const lift = (k) => up(k, 2)
    if (age === 0) c.px(x, y - 1, lift(c.key(x, y - 1)))
    else { c.px(x - 1, y - 1, lift(c.key(x - 1, y - 1))); c.px(x + 1, y - 1, lift(c.key(x + 1, y - 1))) }
  }
}

// ================================================================ the lens, the flash
// The lens turns with the beam: its bull's-eye, the bright panel, rides round the drum; facing us
// it blazes and throws a star.
function lens(c) {
  const phi = heading(c.frame), hit = camHit(c.frame)
  const rows = { 26: [49, 51], 27: [48, 52], 28: [48, 52], 29: [48, 52], 30: [48, 52], 31: [48, 52], 32: [49, 51] }
  for (const [y, [a, b]] of Object.entries(rows)) for (let x = a; x <= b; x++) c.px(x, +y, +y % 2 ? "L" : "l")
  c.px(LX, 29, "W")                                      // the lamp inside
  if (Math.sin(phi) > -0.4) {                            // the bull's-eye, on the near side of the drum
    const bx = LX + Math.round(2.3 * Math.cos(phi))
    for (let y = 27; y <= 31; y++) c.px(bx, y, y >= 28 && y <= 30 ? "W" : "l")
  }
  if (hit > 0.2) {
    for (const [y, [a, b]] of Object.entries(rows)) for (let x = a; x <= b; x++) c.px(x, +y, "W")
    const arm = Math.round(4 + 18 * hit), arm2 = Math.round(2 + 7 * hit)
    for (let i = 1; i <= arm; i++) for (const s of [-1, 1]) if (s < 0 || LX + i + 2 < 54 || LX + i + 2 > 64) c.px(LX + s * (i + 2), LY, i < arm * 0.4 ? "9" : i < arm * 0.75 ? "8" : "7")
    for (let i = 1; i <= arm2; i++) for (const s of [-1, 1]) c.px(LX, LY + s * (i + 3), i < arm2 * 0.5 ? "9" : "8")
  }
}

// the tower's whitewash takes the light the beam spills: the side toward it, turning with it
function towerLight(c) {
  const d = beamDir(heading(c.frame)), hl = Math.hypot(d[0], d[2]), dx = d[0] / hl, dz = d[2] / hl
  for (let y = 44; y <= 72; y++) {
    const hw = towerHW(y)
    for (let x = LX - hw; x <= LX + hw; x++) {
      if (!c.is(x, y, "t")) continue
      const th = Math.asin(clamp((x - LX) / (hw + 0.5), -1, 1)), lam = Math.sin(th) * dx - Math.cos(th) * dz
      const v = lam * (y < 58 ? 1 : 0.8)
      if (v > 0.78) c.px(x, y, "U"); else if (v > 0.32) c.px(x, y, "u")
    }
  }
}

// the beam laid over the picture: the air takes every step it gathers; solid things only the veil
// in front of them (a step, two on pale whitewash and foam); the lamp's own glass is left alone
function beamLight(c) {
  const st = beamSteps(c)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const n = st[y * W + x]
    if (!n) continue
    const k = c.key(x, y), air = SKY.includes(k)
    if ("aLlW".includes(k) || (!air && (inGull(x, y, c.frame) || (x >= 53 && x <= 64 && y >= 29 && y <= 37)))) continue
    c.px(x, y, up(k, air ? n : Math.min(n, "TtuUwX".includes(k) ? 2 : 1)))
  }
}

// ================================================================ the scene
scene("keepers_watch", { w: W, h: H, bg: "1", world: { light: { at: [LX, LY] } } },
  layer("sky", sky),
  layer("lighthouse", stamp("_lighthouse", LH_X, LH_Y), towerLight),
  layer("land", poly(LAND.flat(), "k"), facets, turf),
  layer("sea", sea, foam),
  layer("keeper", stamp("_keeper", 53 + 7, 29 + 9)),
  layer("railing", stamp("_railing", LH_X, 34)),
  layer("gulls", ...GULLS.map((g) => stamp(g.name, ...g.at))),
  layer("surf", { unlit: true }, stamp("_surf", 0, SURF_Y)),
  glow("lW", { where: [44, 26, 13, 9], r: 9, ramp: 2 }),
  glow("Wl", { where: [63, 33, 3, 4], r: 3, ramp: 1 }),
  beamLight,
  splashes,
  rain,
  lens,
)

