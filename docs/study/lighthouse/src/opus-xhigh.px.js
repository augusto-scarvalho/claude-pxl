// Storm Light: a lighthouse on a rocky headland, a stormy night. 160x120, 96 frames at 10 fps (9.6 s loop).
// The one light is the lamp, its lens at (110, 19): the glass glows, a halo hangs in the rain round it, and two
// opposed beams turn once a loop, so one sweeps past us every 4.8 s and flashes. The keeper's hand lantern is a
// small fill on their front. Wind from the sea (left): rain slants right, spray and the oilskin blow right, the
// gulls face left into it and get pushed back.
pal({
  k: "#080a12", K: "#0f1424", n: "#161d33", N: "#202943", m: "#2e3a56", M: "#44516d", v: "#66718a", V: "#949ba6", y: "#cfc8a4", Y: "#fff6d2",
  j: "#2a3450", J: "#56637f", l: "#a3aab6",                                                       // rain
  s: "#0a141e", S: "#0f1f2c", t: "#163040", T: "#22465a", f: "#4a7482", F: "#8fb4b6", w: "#dcebe6", // sea, foam
  r: "#120f18", R: "#1c1824", o: "#2a2533", O: "#3c3647", q: "#57505f", Q: "#7d7484",            // rock
  G: "#141f1b", g: "#203229", H: "#344c3b",                                                       // grass
  u: "#232a3b", U: "#373f54", i: "#545e74", I: "#828ba0", W: "#bfc3c8",                          // white tower at night
  e: "#2a0f17", E: "#4c1a25", x: "#7a2833", X: "#ad4a40",                                         // red paint
  a: "#b8702e", A: "#f2ae4c", Z: "#ffe39a",                                                       // lamp glass, lantern
  c: "#4a3a10", C: "#8f721c", h: "#d2ad2c", P: "#f4d862",                                         // yellow oilskin
  z: "#b07458",                                                                                   // skin
})
ramps("kKnNmMvVyY", "kjJlY", "ksStTfFwY", "krRoOqQ", "kGgH", "kuUiIW", "keExX", "kaAZY", "kcChP")

const W = 160, H = 120, F = 96, HZ = 66, LX = 110, LY = 19, TAU = Math.PI * 2
const mod = (a, n) => ((a % n) + n) % n

// ------------------------------------------------------------------ the beams, in 3D
// Camera at the origin looking down +z, eye on the horizon row, focal FOC px. The lamp is LZ deep.
const FOC = 140, CX = 80, LZ = 300, EYE = 18
const L = [(LX - CX) * LZ / FOC, (HZ - LY) * LZ / FOC, LZ]
const ALPHA = Math.tan(0.07), R0 = 5
const CAM = Math.atan2(-L[2], -L[0])           // heading from the lamp toward us
const PHI0 = CAM - TAU * 40 / F                // a beam faces us at frames 40 and 88
const phiAt = (f) => PHI0 + TAU * f / F
const BULB = [93.5, 25]                         // the keeper's lantern

const fields = new Map()
function lightField(frame) {
  if (fields.has(frame)) return fields.get(frame)
  const far = new Float32Array(W * H), near = new Float32Array(W * H)
  let glare = 0
  for (const ph of [phiAt(frame), phiAt(frame) + Math.PI]) {
    const d = [Math.cos(ph), 0, Math.sin(ph)]
    const g = Math.acos(Math.max(-1, Math.min(1, Math.cos(ph - CAM))))
    glare = Math.max(glare, Math.max(0, 1 - g / 0.32) ** 2)
    const e = -(d[0] * L[0] + d[2] * L[2])
    for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
      let r = [(px + 0.5 - CX) / FOC, (HZ - py - 0.5) / FOC, 1]
      const rl = Math.hypot(...r); r = r.map((v) => v / rl)
      const b = r[0] * d[0] + r[2] * d[2], dd = -(r[0] * L[0] + r[1] * L[1] + r[2] * L[2])
      const den = 1 - b * b
      if (den < 1e-6) continue
      const s = (b * e - dd) / den, t = (e - b * dd) / den
      if (t <= 0 || s <= 0) continue
      let v = 0, z
      if (r[1] < 0 && s > EYE / -r[1]) {
        // below the horizon the ray meets the sea first: the beam lights the water where it comes down that far
        const sw = EYE / -r[1], P = r.map((q) => q * sw)
        const tt = (P[0] - L[0]) * d[0] + (P[2] - L[2]) * d[2]
        if (tt <= 0) continue
        const dx = P[0] - L[0] - d[0] * tt, dy = P[1] - L[1], dz = P[2] - L[2] - d[2] * tt
        const rad = R0 + tt * ALPHA, dist = Math.hypot(dx, dy, dz)
        if (dist >= rad) continue
        v = 2.2 * (1 - dist / rad) * Math.exp(-tt / 2600); z = P[2]
      } else {
        const dx = r[0] * s - L[0] - d[0] * t, dy = r[1] * s - L[1], dz = r[2] * s - L[2] - d[2] * t
        const rad = R0 + t * ALPHA, dist = Math.hypot(dx, dy, dz)
        if (dist >= rad) continue
        const core = Math.sqrt(1 - (dist / rad) ** 2)
        const spread = (R0 / rad) ** 0.55
        const side = Math.min(1.5, 1 / Math.sqrt(den))
        const fwd = 1.25 + 2 * Math.max(0, -b) ** 8
        v = 9 * core * spread * side * fwd * Math.exp(-t / 420)
        z = L[2] + d[2] * t
      }
      const i = py * W + px
      v = 4.6 * (1 - Math.exp(-v / 4.6))                                  // saturates softly: a shaft of haze, not a solid wedge
      if (z < LZ - 25) near[i] = Math.max(near[i], v); else far[i] = Math.max(far[i], v)
    }
  }
  // the haze in the beams is dithered at its edges; the halo, the flare and the lantern's pool step in crisp rings
  const farB = new Float32Array(W * H), nearB = new Float32Array(W * H)
  for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
    const i = py * W + px
    const dl = Math.hypot((px - LX) / 1.3, py - LY)
    farB[i] = 3.4 * Math.max(0, 1 - dl / 20) ** 1.4                                 // halo in the rain
    nearB[i] = glare * 5 * Math.max(0, 1 - dl / 48) ** 1.6 + (glare > 0.55 ? 1 : 0)  // lens flare, and the flash
      + 1.6 * Math.max(0, 1 - Math.hypot(px - BULB[0], py - BULB[1]) / 5)          // hand lantern
  }
  const q = (a, bnd) => {
    const o = new Uint8Array(W * H)
    for (let i = 0; i < W * H; i++) o[i] = Math.floor(a[i] + 0.5 + (bayer(i % W, (i / W) | 0) - 0.5) * 0.7) + Math.floor(bnd[i])
    return o
  }
  const out = { far: q(far, farB), near: q(near, nearB), glare }
  fields.set(frame, out)
  return out
}
function lightUp(c, lev) {
  let max = 0
  for (const v of lev) if (v > max) max = v
  for (let k = 1; k <= max; k++) c.light((x, y) => lev[y * W + x] >= k, 1)
}

// ------------------------------------------------------------------ sea (drives the 96-frame loop)
// Swell bands, thicker toward us; crests slide right, faster the nearer; whitecaps on some crests.
anim("sea", { w: W, h: H - HZ, frames: F, fps: 10 }, (c) => {
  const p = c.phase
  for (let y = 0; y < c.h; y++) {
    const u = 6 * Math.log(y + 2), b = Math.floor(u), fr = u - b
    const lam = 3 + 0.85 * (y + 1), n = Math.max(4, Math.min(24, Math.round(120 / lam)))
    const m = Math.max(1, Math.round(n / 3))
    for (let x = 0; x < W; x++) {
      const ph = x / lam - n * p + b * 0.37
      const env = 0.6 + 0.4 * Math.sin(TAU * (x * m / (lam * n) - m * p + b * 0.71))   // sets of bigger swells
      const hgt = Math.sin(TAU * ph) * env + (env - 0.6)
      // troughs dark, the backs of the swells mid, crests catching the glow only where a set of big ones runs
      let k = y < 3 ? "t" : fr > 0.6 ? "s" : "S"
      if (fr < 0.35 && hgt > 0.9) k = "T"
      else if (fr < 0.6 && hgt > 0.5) k = "t"
      if (fr < 0.25 && hgt > 1.12 && hash(b, mod(Math.floor(ph), n)) > 0.35) k = y > 18 ? "F" : "f"
      c.px(x, y, k)
    }
  }
})

// ------------------------------------------------------------------ gulls (front view, beating into the wind)
sprite("gull_up", `
  k.........k
  .v.......v.
  ..vv...vv..
  ....vVv....
  .....V.....`)
sprite("gull_mid", `
  ..vv...vv..
  .v..vVv..v.
  k....V....k`)
sprite("gull_down", `
  .....V.....
  ...vvVvv...
  ..v.....v..
  .v.......v.
  k.........k`)
sprite("gull_tilt", `
  ........vvk
  .....vVv...
  ..vvvV.....
  kv.........`)
const GULLS = [[30, 38, 0.1], [56, 30, 0.45], [16, 52, 0.75]]
const gust = (u) => u < 0.14 ? Math.sin(u / 0.14 * Math.PI / 2) : 0.5 + 0.5 * Math.cos((u - 0.14) / 0.86 * Math.PI)

// ------------------------------------------------------------------ the keeper (facing out to sea, lantern held out)
// Lit by the lamp behind them (right rim) and by their own lantern below the hand (front); a shadow core between.
// Sou'wester (a round crown, the brim longer behind), the arm bent down to the lantern, the coat to the shins.
const KEEPER = `
  .....cCCh....
  ...cCCCCCCh..
  ....zzcCChh..
  .....hCCCCh..
  ...hhcCcCCh..
  ..z..cCcCCh..
  ..k..hCcCC...
  .aZa.hCcCC...
  .aAa.hCcCC...
  ..k..cCcCC...
  .....kK.kK...`
const HEM = [[10, 11, 11, 12], [11, 11, 12, 13], [11, 12, 12, 13], [11, 12, 13, 13], [10, 12, 12, 13], [10, 11, 12, 12], [10, 11, 11, 12], [10, 10, 11, 11]]
anim("keeper", { w: 14, h: 11, frames: 8, fps: 10, facing: "left", height: 1.95 }, (c) => {
  c.grid(0, 0, KEEPER)
  HEM[c.frame].forEach((rx, i) => { for (let x = 10; x <= rx; x++) c.px(x, 6 + i, x === rx ? "h" : "C") })   // the coat's tail flaps downwind
  if (c.frame % 4 < 2) c.px(11, 1, "h"); else c.px(11, 2, "h")      // and the sou'wester's back brim
  if (c.frame === 3 || c.frame === 4) c.px(2, 7, "A")                 // the flame gutters
})

// ------------------------------------------------------------------ the lighthouse (local x 0..30, lamp at 15,16)
sprite("lighthouse", { w: 31, h: 81, pivot: "bottom", height: 14.5 }, (c) => {
  // tower: 17 px wide under the gallery, 25 at the base; top-lit, the deck's shadow under it
  for (let y = 27; y < 81; y++) {
    const hw = 8 + Math.round((y - 27) * 4 / 53)
    for (let x = 15 - hw; x <= 15 + hw; x++) {
      const uu = (x - 15) / (hw + 0.5)
      const band = y >= 46 && y <= 53
      // front-lit by the halo above: the middle catches it, the flanks turn away, and it fades down the shaft
      let k = Math.abs(uu) > 0.72 ? 0 : Math.abs(uu) > 0.35 ? 1 : 2
      if (y > 64 && k > 0) k -= 1
      if (y < 30) k = 0
      c.px(x, y, band ? "eEEx"[k] : "uUiI"[k])
    }
  }
  // runoff streaks under the gallery corbels, and from the window sills
  for (const x of [8, 22]) c.vline(x, 30, 4, "U")
  for (const wy of [38, 60]) { c.rect(14, wy, 3, 4, "k"); c.hline(14, wy + 4, 3, "I"); c.vline(15, wy + 5, 3, "U") }
  // door: arched, at the foot
  c.rect(12, 72, 7, 9, "k"); c.hline(13, 71, 5, "k"); c.hline(11, 80, 9, "U"); c.vline(19, 73, 7, "u")
  // plinth
  c.rect(2, 79, 27, 2, "U"); c.hline(2, 79, 27, "i")
  // gallery: deck slab seen from below, corbels
  c.rect(1, 25, 29, 2, "U"); c.hline(1, 25, 29, "I"); c.hline(1, 27, 29, "u")
  for (const x of [3, 8, 15, 22, 27]) { c.px(x, 27, "U"); c.px(x, 28, "u") }
  // parapet under the glass, cornice and dome
  c.rect(9, 21, 13, 4, "E"); c.hline(9, 21, 13, "x"); c.hline(9, 24, 13, "e")
  c.rect(9, 12, 13, 9, "a")                                          // glass, filled each frame by the scene
  c.hline(7, 11, 17, "e"); c.hline(8, 10, 15, "x")
  for (const [y, hw] of [[5, 3], [6, 5], [7, 6], [8, 6], [9, 7]]) c.hline(15 - hw, y, 2 * hw + 1, y === 5 ? "e" : "E")
  c.hline(9, 9, 13, "x")                                           // the dome's foot, lit by the glass below it
  c.rect(14, 3, 3, 2, "E"); c.hline(14, 4, 3, "x"); c.vline(15, 0, 3, "e")
})

// ------------------------------------------------------------------ the headland
// A plateau for the tower, a cliff of broken facets dropping to the sea on the left, a stack and a low rock offshore.
const WATER = 113
const HEAD = [57, 113, 58, 109, 60, 106, 62, 104, 63, 100, 65, 98, 67, 97, 68, 93, 70, 90, 72, 88, 74, 86, 78, 85, 82, 83, 86, 84, 91, 82, 96, 83, 124, 83, 129, 82, 134, 80, 139, 81, 145, 79, 151, 80, 156, 78, 160, 79, 160, WATER]
const STACK = [23, WATER, 24, 108, 25, 104, 27, 101, 27, 98, 29, 96, 30, 93, 32, 92, 33, 95, 34, 97, 36, 99, 36, 102, 38, 104, 39, 108, 41, WATER]
const ROCK = [5, WATER, 7, 110, 10, 108, 13, 107, 16, 108, 18, 110, 20, WATER]
function inPoly(pts, x, y) {
  let ins = false
  for (let i = 0, j = pts.length - 2; i < pts.length; j = i, i += 2) {
    const [xi, yi, xj, yj] = [pts[i], pts[i + 1], pts[j], pts[j + 1]]
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) ins = !ins
  }
  return ins
}
const LAND = new Uint8Array(W * H), TOP = new Array(W).fill(H)
for (let y = 0; y < WATER; y++) for (let x = 0; x < W; x++)
  if ([HEAD, STACK, ROCK].some((p) => inPoly(p, x + 0.5, y + 0.5))) { LAND[y * W + x] = 1; TOP[x] = Math.min(TOP[x], y) }
const land = (x, y) => x >= 0 && x < W && y >= 0 && y < H && LAND[y * W + x] === 1
// The rock breaks into facets (cells round scattered seeds, a little taller than wide), each tilted its own way:
// a facet turned up toward the lamp catches its light, one turned away or down goes dark; cracks under each facet.
const SEEDS = []
for (let gy = 72; gy < WATER + 8; gy += 7) for (let gx = -6; gx < W + 8; gx += 7)
  SEEDS.push([gx + hash(gx, gy) * 7, gy + hash(gy, gx + 1) * 7, (hash(gx + 3, gy + 5) - 0.5) * 1.3, -(0.1 + 0.8 * hash(gx + 7, gy + 2))])
const CELL = new Int16Array(W * H).fill(-1)
for (let y = 0; y < WATER; y++) for (let x = 0; x < W; x++) {
  if (!land(x, y)) continue
  let best = 1e9
  SEEDS.forEach(([sx, sy], i) => { const dd = (x - sx) ** 2 + ((y - sy) * 0.8) ** 2; if (dd < best) { best = dd; CELL[y * W + x] = i } })
}
const cellAt = (x, y) => land(x, y) ? CELL[y * W + x] : -1

function rockTone(x, y) {
  const d = y - TOP[x], toward = Math.sign(LX - x) || 1, id = cellAt(x, y)
  const grassy = x >= 72
  if (grassy && d === 0) return "H"
  if (grassy && d === 1) return "g"
  if (grassy && d === 2) return hash(x, 3) > 0.5 ? "g" : "G"
  if (!grassy && d === 0) return "q"
  if (!land(x + toward, y) && !land(x + toward, y - 1)) return "q"     // a rim turned to the lamp
  if (!land(x - toward, y)) return "R"                                 // a face turned away
  const up = cellAt(x, y - 1), up2 = cellAt(x, y - 2), side = cellAt(x + toward, y)
  if (d > 2 && up !== id && up >= 0 && hash(id, up) > 0.2) return y >= WATER - 5 ? "r" : "R"   // crack under the facet above
  const [, , nx, ny] = SEEDS[id], lx = LX - x, ly = LY - y, ll = Math.hypot(lx, ly)
  let b = 0.5 + 1.2 * (nx * lx + ny * ly) / ll - (y - 86) / 40
  if (up2 !== id && up2 >= 0) b += 0.3                                  // the lip just under a crack
  if (side !== id && side >= 0) b -= 0.3                                // the edge toward the next facet
  if (!grassy && d === 1) b += 0.4
  if (y >= WATER - 4) b -= 0.35                                         // wet foot
  return b < 0.1 ? "r" : b < 0.42 ? "R" : b < 0.78 ? "o" : b < 1.05 ? "O" : "q"
}

// Breakers: a swell runs in from the left, hits a rock face and throws up spray that the wind carries right.
const CRASHES = [{ x: 23, f: 6, s: 1.05 }, { x: 57, f: 30, s: 1.45 }, { x: 5, f: 54, s: 0.75 }, { x: 57, f: 78, s: 1.15 }]
function surf(c) {
  const f = c.frame
  // the sea surging up and down the foot of every rock, higher where a breaker has just hit
  for (let x = 0; x < W; x++) {
    if (!land(x, WATER - 1)) continue
    const ph = TAU * (x / 19 - 3 * c.phase) + hash(x >> 3, 5) * 2
    let surge = 1.3 + 1.3 * Math.sin(ph)
    for (const { x: rx, f: f0, s } of CRASHES) {
      const a = mod(f - f0, F), d = Math.abs(x - rx - 3)
      if (a < 14 && d < 11) surge += 6 * s * (1 - a / 14) * (1 - d / 11)
    }
    const wl = Math.round(WATER - surge)
    for (let y = Math.max(wl, TOP[x] + 1); y < WATER; y++) c.px(x, y, y === wl ? (Math.cos(ph) < 0 || hash(x, f) > 0.6 ? "F" : "f") : "S")
  }
  // churn against the rocks' seaward sides
  for (let x = 0; x < W; x++) for (let y = WATER - 3; y < WATER; y++) {
    if (land(x, y) || !(land(x + 1, y) || land(x + 2, y))) continue
    const hv = hash(x * 7 + y, Math.floor(f / 2))
    if (hv > 0.4) c.px(x, y, hv > 0.8 ? "F" : "f")
  }
  CRASHES.forEach(({ x: rx, f: f0, s }, ci) => {
    const a = mod(f - f0 + 16, F) - 16
    if (a < 0 && a >= -14) {                                           // the swell coming in: a dark hump, its crest whitening
      const k = (a + 15) / 15, cx = rx - 2 + a * 1.4
      const hgt = (1.5 + 5 * k) * s, half = Math.round(6 + 6 * s)
      for (let dx = -half; dx <= 2; dx++) {
        const x = Math.round(cx) + dx
        const hh = Math.round(dx < 0 ? hgt * (1 + dx / half) ** 1.6 : hgt * (1 - dx / 3))
        for (let y = WATER - hh; y <= WATER + 1; y++) {
          if (land(x, y)) continue
          const d = y - (WATER - hh)
          c.px(x, y, d === 0 ? (k > 0.7 && dx > -5 ? "w" : k > 0.45 && dx > -4 ? "F" : "T") : d === 1 ? "t" : dx >= 0 || y >= WATER ? "s" : "S")
        }
      }
      if (k > 0.6) { const lx = Math.round(cx) + 2, ly = WATER - Math.round(hgt) + 1; if (!land(lx, ly)) c.px(lx, ly, "F"); if (!land(lx + 1, ly + 1)) c.px(lx + 1, ly + 1, "f") }
    }
    if (a >= 0 && a < 30) {                                            // the spray
      // a burst fanning from the impact (4 frames), torn from its rim inward, its fingers flying on as drops that
      // slow, fall and drift downwind; every drop leaves along a finger of the burst, so the two read as one
      // the burst is lumps of foam strung along seven fingers, each lump lit on its side toward the lamp
      const ox = rx - 2, R = 24 * s, fan = (g) => Math.cos(g * 1.2)
      const tip = (k) => { const g = -0.72 + 1.44 * k / 6 + (hash(k, ci + 60) - 0.5) * 0.15; return [g, R * fan(g) * (0.7 + 0.4 * hash(k, ci + 70))] }
      const bent = (g, d) => { const up = d * Math.cos(g); return [ox + d * Math.sin(g) + 0.025 * up * up, WATER - 1 - up] }
      if (a < 4) {
        const grow = [0.35, 0.65, 0.88, 1][a]
        for (let k = 0; k < 7; k++) {
          const [g, reach] = tip(k)
          ;[[0.3, 3.4], [0.62, 2.8], [0.93, 2.1]].forEach(([f, rad], j) => {
            const [cx, cy] = bent(g, reach * f * grow), rr = rad * Math.sqrt(s) * (a === 3 ? 0.75 - j * 0.12 : a === 0 ? 0.8 : 1)
            if (a === 3 && j === 2 && hash(k, ci) < 0.5) return              // the tips are first to tear away
            for (let y = Math.floor(cy - rr); y <= cy + rr; y++) for (let x = Math.floor(cx - rr); x <= cx + rr; x++) {
              const ddx = x + 0.5 - cx, ddy = y + 0.5 - cy, dd = Math.hypot(ddx, ddy)
              if (dd > rr) continue
              c.px(x, y, (ddx * 0.6 - ddy * 0.8) / rr < -0.35 ? "F" : "w")
            }
          })
        }
        if (a < 2) for (let y = WATER - 3 + a; y <= WATER; y++) for (let x = rx - 9 + a * 3; x <= rx; x++)   // the crest collapsing at the root
          if (!land(x, y) && hash(x + y * 3, a + ci) > 0.2) c.px(x, y, y === WATER - 3 + a ? "F" : "w")
      }
      const n = Math.round(64 * s)
      for (let i = 0; i < n; i++) {
        const h1 = hash(i, 100 + ci), h2 = hash(i, 200 + ci), h3 = hash(i, 300 + ci)
        const [g0, reach] = tip(i % 7), g = g0 + (h1 - 0.5) * 0.22, born = 2 + h3 * 2.5
        if (a < born) continue
        const far = reach * (0.7 + 0.55 * h2)
        const at = (tt) => {
          const d = far * (1 - Math.exp(-tt / 1.6)), fall = Math.max(0, tt - 2.5)
          const up = d * Math.cos(g) - 0.11 * fall * fall
          return [ox + d * Math.sin(g) + 0.025 * Math.max(0, up) ** 2 + 0.07 * fall * fall, WATER - 1 - up]
        }
        const [px, py] = at(a)
        if (py > WATER || a > 15 + h1 * 9) continue
        const X = Math.round(px), Y = Math.round(py)
        if (a < 9) { const [qx, qy] = at(a - 0.7); c.line(Math.round(qx), Math.round(qy), X, Y, a < 6 ? "w" : "F") }
        else c.px(X, Y, a < 14 ? "F" : "f")
      }
    }
    if (a >= 4 && a < 18) {                                            // water running back off the rock
      for (const j of [2, 6, 11]) {
        const x = rx + j
        if (!land(x, WATER - 1)) continue
        const y1 = TOP[x] + 1 + Math.round((a - 4) * 1.6 * (0.8 + 0.4 * hash(j, ci)))
        for (let y = y1 - 3; y <= y1; y++) if (y > TOP[x] && y < WATER) c.px(x, y, a < 10 ? "F" : "f")
      }
    }
    if (a >= 0 && a < 40) {                                            // the foam spreading on the water
      const rxx = 3 + a * 0.55, ryy = 1 + a * 0.1, dens = 1 - a / 40
      for (let y = WATER - 3; y <= WATER + 4; y++) for (let x = Math.floor(rx - 2 - rxx); x <= rx + rxx; x++) {
        if (land(x, y) || ((x - rx + 2) / rxx) ** 2 + ((y - WATER) / ryy) ** 2 > 1) continue
        const hv = hash(x * 13 + y, ci * 50 + (a >> 1))
        if (hv < dens * 0.8) c.px(x, y, hv < dens * 0.3 ? "w" : hv < dens * 0.55 ? "F" : "f")
      }
    }
  })
}

scene("storm_light", { w: W, h: H, bg: "K", world: { light: { at: [LX, LY] }, scale: 5.5 } },
  layer("sky", (c) => {
    // heavy cloud racing right; two copies of the field crossfade so the loop closes
    const p = c.phase, D = 48, norm = Math.hypot(1 - p, p)
    const cl = (x, y) => fbm(x / 34, y / 10 + 3.7, 4)
    for (let y = 0; y < HZ; y++) for (let x = 0; x < W; x++) {
      const v = 0.5 + (cl(x - D * p, y) * (1 - p) + cl(x - D * (p - 1), y) * p - 0.5 * (1 - p) - 0.5 * p) / norm
      const g = y / HZ
      const b = 0.16 + 0.3 * g * g + 1.1 * (v - 0.5)
      c.px(x, y, b < 0.1 ? "k" : b < 0.22 ? "K" : b < 0.34 ? "n" : b < 0.46 ? "N" : "m")
    }
  }),
  layer("sea", stamp("sea", 0, HZ)),
  layer("rain_far", (c) => {
    for (let i = 0; i < 170; i++) {
      const P = 16, tt = c.frame + Math.floor(hash(i, 1) * P), cyc = Math.floor(tt / P) % (F / P), u = tt % P
      const x = Math.floor(-44 + hash(i, 10 + cyc) * (W + 44) + 4 * u), y = Math.floor(-12 + hash(i, 40 + cyc) * 12 + 8 * u)
      c.px(x, y, "j"); c.px(x, y + 1, "j"); c.px(x + 1, y + 2, "j"); c.px(x + 1, y + 3, "j")
    }
  }),
  layer("gulls", (c) => {
    GULLS.forEach(([x0, y0, off], i) => {
      const u = mod(c.phase - off, 1), push = gust(u)
      const x = Math.round(x0 + 9 * push + 1.5 * Math.sin(TAU * (3 * c.phase + i * 0.3)))
      const y = Math.round(y0 - 3 * push + 2 * Math.sin(TAU * (2 * c.phase + i * 0.6)))
      const beat = (c.frame + i) % 4
      const name = u < 0.16 ? "gull_tilt" : ["gull_up", "gull_mid", "gull_down", "gull_mid"][beat]
      c.stamp(name, x, y)
    })
  }),
  (c) => lightUp(c, lightField(c.frame).far),
  layer("land", (c) => {
    for (let y = 0; y < WATER; y++) for (let x = 0; x < W; x++) if (land(x, y)) c.px(x, y, rockTone(x, y))
    // tufts on the plateau combed right by the wind, and turf hanging over the cliff's rim
    for (let x = 72; x < W; x++) {
      if (x >= 96 && x <= 124) continue
      const y = TOP[x]
      if (hash(x, 7) > 0.55) { const lean = mod(c.frame + x * 3, 8) < 3 ? 1 : 0; c.px(x, y - 1, "g"); if (hash(x, 8) > 0.4) c.px(x + lean, y - 2, "H") }
    }
    for (let x = 66; x < 80; x++) if (hash(x, 11) > 0.5 && !land(x - 1, TOP[x] + 2)) c.vline(x, TOP[x] + 2, 1 + Math.floor(hash(x, 12) * 3), "G")
  }),
  layer("lighthouse", stamp("lighthouse", LX, 83), (c) => {
    // the glass: warm air, a beehive lens with its bullseyes turning, dark mullions in front
    const phi = phiAt(c.frame)
    c.rect(104, 15, 13, 9, "a")
    for (let y = 15; y <= 23; y++) {
      const hw = y === 15 || y === 23 ? 3 : y === 16 || y === 22 ? 4 : 5
      for (let x = LX - hw; x <= LX + hw; x++) c.px(x, y, y === 19 ? "Z" : (y % 2 ? "A" : "Z"))
    }
    for (const ph of [phi, phi + Math.PI]) {
      if (Math.sin(ph) > 0.15) continue
      const bx = Math.round(LX + 4.5 * Math.cos(ph))
      c.px(bx, 19, "Y"); c.px(bx, 18, "Y"); c.px(bx, 20, "Y"); c.px(bx - 1, 19, "Y"); c.px(bx + 1, 19, "Y")
    }
    for (const x of [104, 108, 112, 116]) c.vline(x, 15, 9, "k")
  }),
  layer("keeper", stamp("keeper", 92, 17)),
  layer("rail", (c) => {
    // the gallery rail in front: black against the glass, warm glints along its top beside it
    c.hline(96, 23, 29, "n")
    for (let x = 96; x <= 124; x++) if (x >= 104 && x <= 116) c.px(x, 23, "k"); else if (x % 3 === 1) c.px(x, 23, "a")
    for (const x of [96, 103, 110, 117, 124]) c.vline(x, 24, 4, x > 100 && x < 120 ? "k" : "n")
  }),
  layer("surf", surf),
  layer("rain_near", (c) => {
    for (let i = 0; i < 34; i++) {
      const P = 12, tt = c.frame + Math.floor(hash(i, 2) * P), cyc = Math.floor(tt / P) % (F / P), u = tt % P
      const x = Math.floor(-80 + hash(i, 20 + cyc) * (W + 80) + 7 * u), y = Math.floor(-20 + hash(i, 60 + cyc) * 16 + 14 * u)
      for (let k = 0; k < 6; k++) c.px(x + (k >> 1), y + k, "J")
    }
  }),
  (c) => lightUp(c, lightField(c.frame).near))
