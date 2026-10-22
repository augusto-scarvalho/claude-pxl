// "Keeper's Watch": a lighthouse on a rocky headland on a stormy night. The one light is the lamp in
// the lantern room (42, 22): its beam turns once every 4 s (48 frames), lighting the rain and the
// cloud it passes through, and flares when it swings toward us. The keeper, in a yellow oilskin, stands
// on the gallery's seaward side with a hand lantern, the coat flapping in a gale from the right (the
// sea). Rain slants down-left with it, the spray of each breaker is blown back over the rocks, and
// three gulls beat into the wind and lose ground.
// 160x120, 12 fps, loops in 96 frames (8 s): the beam turns twice, three breakers come in.
pal({
  k: "#07080c",
  N: "#0d111c", n: "#141a28", B: "#1c2433", b: "#262f40", C: "#333d4e", c: "#4a5262",   // sky, cloud
  J: "#6d7076", K: "#a09c8c", L: "#d8cfa8",                                              // beam haze
  S: "#080e17", s: "#0d1622", a: "#142130", A: "#1d2e40", m: "#2d4254",                  // sea
  f: "#4a6474", F: "#8aa2ac", w: "#d4e0e2",                                              // foam, spray
  R: "#0a0a0f", r: "#131319", q: "#1d1d25", Q: "#2a2a34", j: "#3c3b47", i: "#57545e",    // rock
  g: "#141c1a", G: "#1e2a25", l: "#2b3b30",                                              // turf
  1: "#161922", 2: "#232835", 3: "#363d4c", 4: "#525b6a", 5: "#78808c", 6: "#a8adb2",    // white paint
  d: "#1e0e14", D: "#3a161e", e: "#5e2228", x: "#8a3430",                                // red paint
  o: "#8a5a28", y: "#e0a848", Y: "#fbe7a0", W: "#fffbea",                                // lamp
  v: "#4a3608", u: "#a07c14", U: "#dcb028", X: "#f8e070",                                // oilskin
  p: "#9a6650", P: "#c89070",                                                            // skin
})
ramps("NnBbCcJKL", "SsaAmfFw", "RrqQji", "gGl", "123456", "dDex", "oyYW", "vuUX", "pP")

const W = 160, H = 120, HZ = 74, FPS = 12, LOOP = 96, TURN = 48, SURF = 32
const LX = 42, LY = 21                    // the lamp
const TAU = Math.PI * 2

// --- the beam --------------------------------------------------------------------------------------
// The optic turns about the tower's axis: angle 0 points right, a quarter turn later it points at us.
// On screen the beam reaches |cos| of its length; pointing at us it shortens into a flare round the lamp.
const beamAt = (f) => {
  const th = TAU * (f % TURN) / TURN
  return { dir: Math.cos(th), toward: Math.sin(th) }
}
// how lit a point is by the beam in frame f, 0..1
const beamI = (f, x, y) => {
  const { dir, toward } = beamAt(f)
  let I = 0
  const dx = (x - LX) * Math.sign(dir), d = dx, len = 175 * Math.abs(dir)
  if (d > 0 && d < len + 6 && toward > -0.92) {
    const cy = LY + d * 0.035, hw = 1.5 + d * (0.12 + 0.18 * Math.max(0, toward))
    const across = 1 - Math.abs(y - cy) / hw
    if (across > 0) I = Math.min(1, 1.3 * across ** 0.6) * (1 - 0.6 * d / 175) * Math.min(1, (len + 6 - d) / 30)
    if (toward < 0) I *= 1 + toward * 0.6        // pointing away: the near side is the lantern's back
  }
  if (toward > 0) {                              // the flare as it faces us
    const r = Math.hypot(x - LX, (y - LY) * 1.3), R = 6 + 40 * toward ** 6
    I = Math.max(I, toward ** 5 * Math.max(0, 1 - r / R))
  }
  return I
}
const beamLayer = (t, dens) => (c) => {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
    if (beamI(c.frame, x, y) + (bayer(x, y) - 0.5) * dens > t) c.px(x, y, "k")
}

// --- sky ---------------------------------------------------------------------------------------------
// a heavy deck that boils slowly (its noise sampled round a small circle over the loop) and a lower
// scud racing left with the gale, one width a loop
const scud = seamless((x, y) => fbm(x / 26, y / 5), W)
const sky = (c) => {
  const a = TAU * c.frame / LOOP
  for (let y = 0; y < HZ; y++) for (let x = 0; x < W; x++) {
    let v = 0.15 + 0.35 * (y / HZ)
    v += 0.55 * (fbm(x / 34 + 0.35 * Math.cos(a), y / 11 + 0.35 * Math.sin(a)) - 0.45)
    if (y > 30) v -= Math.max(0, scud((x + c.frame * W / LOOP) % W, y) - 0.5) * 1.6 * Math.min(1, (y - 30) / 12)
        c.px(x, y, v < 0.12 ? "N" : v < 0.28 ? "n" : v < 0.42 ? "B" : v < 0.54 ? "b" : "C")
  }
}

// --- the headland ----------------------------------------------------------------------------------
// The headland is bedded rock dipping toward the sea: each bed a ledge with a top catching what light
// there is, a face split by joints, and a dark undercut where the bed above overhangs. The seaward edge
// steps in and out bed by bed; turf only on the flat top.
const TOP = [[0, 85], [10, 84], [22, 87], [34, 89], [52, 90], [64, 91], [74, 92]]
const topAt = (x) => {
  for (let i = 1; i < TOP.length; i++) if (x <= TOP[i][0]) {
    const [x0, y0] = TOP[i - 1], [x1, y1] = TOP[i]
    return y0 + (y1 - y0) * (x - x0) / (x1 - x0)
  }
  return 92
}
const BEDS = [0]
for (let k = 0; BEDS[k] < 80; k++) BEDS.push(BEDS[k] + 6 + Math.round(6 * hash(k, 91)))
// the beds pinch and swell along their length
const bedTop = (k, x) => BEDS[k] + 3 * (vnoise(x / 13, k * 3.1) - 0.5)
const bedOf = (x, y) => {
  const v = y - 80 - x * 0.12
  let k = 0
  while (k < BEDS.length - 2 && v >= bedTop(k + 1, x)) k++
  return [k, v - bedTop(k, x), bedTop(k + 1, x) - bedTop(k, x)]
}
const cliffX = (y) => y < 92 ? 99 : 74 + (y - 92) * 0.85
const inLand = (x, y) => {
  if (y < topAt(x)) return false
  const [k] = bedOf(x, y)
  return x <= cliffX(y) + Math.round(7 * hash(k, 17)) - 3
}
const rockKey = (x, y, wet) => {
  const [k, r, th] = bedOf(x, y)
  const seg = (x + 13 * k + r * 0.4) / 9, sj = Math.floor(seg), fj = seg - sj
  if (r > 1 && hash(sj, k) > 0.62 && fj < 0.12) return "R"                 // a joint, here and there
  if (r < 1) return wet && hash(x, y) > 0.4 ? "i" : hash(x >> 1, k) > 0.75 ? "j" : "Q"   // the ledge's lit lip
  if (r < 2) return "q"
  if (r < 3.2 && vnoise(x / 6, k) > 0.45) return "q"
  if (r >= th - 1.2 && vnoise(x / 9, k + 7) > 0.4) return "R"               // undercut where the bed above juts out
  return "r"
}
const headland = (c) => {
  for (let x = 0; x < 100; x++) {
    const t = Math.round(topAt(x))
    const turf = x < 74 ? 3 + Math.round(2 * hash(x, 7)) : 0
    for (let y = t; y < H; y++) {
      if (!inLand(x, y)) continue
      const dy = y - t
      if (dy < turf) { c.px(x, y, dy === 0 ? (hash(x, 3) > 0.6 ? "l" : "G") : dy < 2 ? "G" : "g"); continue }
      // the edge facing the sea is lit only on ledge tops; the face itself is in shadow
      const edge = !inLand(x + 1, y) || !inLand(x + 2, y)
      const k = dy === turf && turf ? "R" : rockKey(x, y, x > 70)
      c.px(x, y, edge && k !== "i" && k !== "j" ? (k === "R" ? "R" : "r") : k)
    }
  }
  // a sea stack off the point, where the breakers land
  c.poly([99, 120, 100, 112, 102, 109, 101, 106, 104, 104, 105, 101, 108, 100, 110, 99, 112, 101, 113, 104, 115, 105, 116, 109, 118, 112, 119, 120], "q")
  for (let y = 99; y < H; y++) for (let x = 99; x < 121; x++) if (c.is(x, y, "q")) c.px(x, y, x > 113 ? "R" : x > 110 ? "r" : rockKey(x, y + 3, true))
  c.line(105, 101, 108, 100, "i"); c.hline(109, 99, 2, "j"); c.line(101, 106, 104, 104, "i"); c.hline(113, 104, 2, "Q"); c.vline(112, 102, 9, "R")
}

// grass on the turf laid over by gusts that run in from the sea (four a loop), and rain splashing on it
const turfLife = (c) => {
  for (let x = 1; x < 74; x++) {
    if (hash(x, 21) < 0.45) continue
    const t = Math.round(topAt(x)) - 1, g = Math.sin(TAU * (c.frame / 24 + x / 40))
    c.px(x, t, "l")
    if (hash(x, 22) > 0.65 && g < 0.5) c.px(x - (g > -0.2 ? 1 : 0), t - 1, "G")
    if (g > 0.5) c.px(x - 1, t, "G")
  }
  for (let i = 0; i < 9; i++) {
    const x = Math.floor(hash(i, c.frame) * 74), t = Math.round(topAt(x)) - 1
    c.px(x, t - 1, "c"); if (i % 3 === 0) { c.px(x - 1, t - 2, "C"); c.px(x + 1, t - 2, "C") }
  }
}

// --- the sea -----------------------------------------------------------------------------------------
// swells rolling in from the right toward the headland; whitecaps torn off their crests
const swell = seamless((x, y) => vnoise(x / 9, y * 1.7), W)
const SEA_KEYS = "SsaAm"
const sea = (c) => {
  for (let y = HZ; y < H; y++) {
    const z = (y - HZ) / (H - HZ)                       // 0 far .. 1 near
    const run = c.frame * W / LOOP * (1 + Math.round(z * 2))
    for (let x = 0; x < W; x++) {
      const v = swell((x * (1.6 - z) + run) % W, y) + (bayer(x, y) - 0.5) * 0.04
      let k = v > 0.72 ? 3 : v > 0.55 ? 2 : v > 0.3 ? 1 : 0
      if (y < HZ + 3) k = Math.min(3, k + 1)               // the far water takes the sky's grey
      c.px(x, y, SEA_KEYS[k])
      if (v > 0.8 && hash(x >> 2, y) > 0.55 + 0.3 * (1 - z)) c.px(x, y, z > 0.5 ? "f" : "m")
    }
  }
}

// the breakers: a swell rises as it nears the stack, curls, bursts, the spray thrown up and blown
// back over the rocks; foam spreads round the stack and drains. Three a loop, of different sizes.
const BIG = [1, 0.6, 0.85]
anim("surf", { w: W, h: H, frames: LOOP, fps: FPS }, (c) => {
  const n = Math.floor(c.frame / SURF), f = c.frame % SURF, s = BIG[n]
  const r = c.rng(11 + n)
  // the incoming swell: a hump steep in front, long behind, foam running along its crest
  if (f < 13) {
    const t = f / 12, xc = 172 - 58 * t, h = (3 + 7 * t * t) * s
    for (let x = Math.max(0, Math.floor(xc - 14)); x < W; x++) {
      const u = (x - xc) / (x < xc ? 4 : 16), hh = Math.round(h * Math.exp(-u * u))
      for (let k = 0; k <= hh; k++) {
        const top = hh - k
        c.px(x, 112 - k, top === 0 ? (hh > 3 && Math.abs(x - xc) < 5 ? "F" : hh > 1 ? "f" : "m") : top < 2 ? "m" : "A")
      }
    }
    if (t > 0.7) for (let k = 0; k < 3; k++) c.px(Math.round(xc - 4 - k), Math.round(112 - h + k + 1), k ? "f" : "F")  // the lip pitching forward
  }
  if (f >= 12) {
    const age = f - 12
    // the impact: a low white fan across the stack's seaward face
    if (age < 2) for (let x = 100; x <= 121; x++) {
      const hh = Math.round((5 + age * 4) * s * (1 - Math.abs(x - 111) / 12) ** 0.6 + 3 * hash(x, n) - 1)
      for (let k = 0; k < hh; k++) if (k < hh - 2 || hash(x, k + age) > 0.4) c.px(x, 111 - k, k > hh - 3 ? "F" : "w")
    }
    // mist torn off the burst, blown back over the point, thinning as it goes
    if (age > 2 && age < 18) {
      const mx = 106 - age * 2.4, my = 96 - age * 1.2 * s, rx = 5 + age * 1.3, ry = 4 + age * 0.6, th = 0.35 + 0.65 * age / 18
      for (let y = Math.floor(my - ry); y <= my + ry; y++) for (let x = Math.floor(mx - rx); x <= mx + rx; x++) {
        const e = ((x - mx) / rx) ** 2 + ((y - my) / ry) ** 2
        if (e < 1 && hash(x * 7 + f, y) > th + 0.45 * e && y < 112) c.px(x, y, age < 8 ? "f" : "m")
      }
    }
    // the plume: clumps launched over three frames, rising as a white column that breaks apart at the
    // top, falls back under its weight and is carried left by the gale
    const N = Math.round(150 * s)
    for (let i = 0; i < N; i++) {
      const x0 = 102 + r() * 15, y0 = 106 + r() * 3
      const vx = -0.3 - r() * 0.9 + (x0 - 110) * 0.07, vy = -(2.2 + r() * 3.8) * s, a = age - r() * 3
      if (a < 0) continue
      const x = Math.round(x0 + vx * a - 0.045 * a * a), y = Math.round(y0 + vy * a + 0.22 * a * a)
      if (y > 112 || a > 18) continue
      if (a > 10 && hash(i, f) < (a - 10) / 8) continue
      const k = a < 4 ? "w" : a < 9 ? "F" : "f"
      c.px(x, y, k)
      if (a < 3) { c.px(x + 1, y, k); c.px(x, y + 1, k); c.px(x + 1, y + 1, "F") }
      else if (a < 6 && i % 2) c.px(x + 1, y, "F")
    }
  }
  // foam round the stack and against the point: spreads, then drains in streaks
  const fa = (f - 12 + SURF) % SURF
  const spread = fa < 20 ? Math.min(1, fa / 5) * (1 - fa / 20) : 0
  for (let x = 78; x < W; x++) {
    const near = Math.max(0, 1 - Math.abs(x - 110) / (18 + 18 * spread * s))
    for (let y = 110; y < H; y++)
      if (hash(x, y) < near * spread * 0.9) c.px(x, y, hash(y, x) > 0.6 ? "F" : "f")
  }
  // the backwash pouring off the stack
  if (fa > 2 && fa < 14) for (let i = 0; i < 5; i++) {
    const x = 102 + i * 3 + (i > 2 ? 2 : 0), y0 = 104 + Math.abs(i - 2) * 2
    for (let y = y0 + Math.floor((fa - 2) / 2); y < y0 + Math.floor((fa - 2) / 2) + 3; y++) if (y < 120) c.px(x, y, "f")
  }
})

// --- the lighthouse --------------------------------------------------------------------------------
// drawn in its own box: local x = scene x - (LX - 13); y as in the scene
const CX = 13
const towerHalf = (y) => 6 + (y - 36) / 53 * 3.5
anim("lighthouse", { w: 27, h: 91, frames: TURN, fps: FPS }, (c) => {
  // finial and dome
  c.vline(CX, 4, 4, "2"); c.rect(CX - 1, 8, 3, 2, "3"); c.px(CX + 1, 8, "4")
  ;[1, 2, 3, 4, 5, 6, 7].forEach((h, i) => {
    const y = 10 + i
    c.hline(CX - h, y, 2 * h + 1, "D")
    c.hline(CX - h, y, Math.max(1, Math.round(h * 0.6)), "d")
    if (i < 6) c.px(CX + h - 1, y, "e")
  })
  c.hline(CX - 7, 16, 15, "d")
  // the lantern room: glass lit from within, the lens a bright drum in the middle
  const { dir, toward } = beamAt(c.frame)
  c.rect(CX - 5, 17, 11, 12, "o")
  c.rect(CX - 4, 17, 9, 12, "y")
  for (let y = 17; y < 26; y++) for (let x = CX - 2; x <= CX + 2; x++) {
    // the bullseye panel faces where the beam points: brightest on that side of the drum
    const u = (x - CX) / 2.5, lit = 0.5 + 0.5 * (u * dir + Math.sqrt(Math.max(0, 1 - u * u)) * toward)
    c.px(x, y, lit > 0.8 ? "W" : lit > 0.45 ? "Y" : "y")
  }
  for (let y = 17; y < 27; y += 2) { c.px(CX - 3, y, "o"); c.px(CX + 3, y, "o") }   // the prisms' rings
  if (toward > 0.7) c.rect(CX - 4, 18, 9, 10, toward > 0.92 ? "W" : "Y")
  ;[CX - 5, CX - 2, CX + 2, CX + 5].forEach((x) => c.vline(x, 17, 12, "1"))         // astragals
  c.hline(CX - 5, 23, 11, "1")
  // parapet below the glass, lit along its top by the lamp
  c.rect(CX - 6, 29, 13, 5, "3"); c.hline(CX - 6, 29, 13, "4")
  c.rect(CX - 6, 30, 3, 4, "2"); c.rect(CX + 3, 30, 3, 4, "4")
  c.rect(CX - 1, 30, 3, 4, "2"); c.hline(CX - 1, 30, 3, "1")                       // the hatch to the gallery
  // gallery deck seen from below, and its corbels
  c.hline(CX - 11, 34, 23, "2"); c.hline(CX - 11, 35, 23, "1")
  for (let x = CX - 9; x <= CX + 9; x += 3) { c.px(x, 36, "1"); c.px(x, 37, "1"); c.px(x + 1, 36, "1") }
  // the tower: a white cylinder with two red bands, under the gallery's shadow at the top
  for (let y = 36; y < 87; y++) {
    const hw = towerHalf(y)
    for (let x = Math.round(CX - hw); x <= Math.round(CX + hw); x++) {
      const u = (x - CX) / hw
      let t = u < -0.75 ? 1 : u < -0.3 ? 2 : u < 0.45 ? 3 : u < 0.85 ? 4 : 3
      if (y < 40) t = Math.max(1, t - 1)
      const band = (y >= 45 && y < 52) || (y >= 66 && y < 73)
      c.px(x, y, band ? "dDex"[Math.min(3, t - 1)] : "123456"[t - 1])
    }
  }
  // rain streaks run down from each corbel, where the water drips off
  for (let x = CX - 6; x <= CX + 6; x += 3) for (let y = 38; y < 38 + 3 + (x % 2) * 2; y++) c.px(x, y, c.key(x, y) === "4" ? "3" : "2")
  // slit windows and the door
  c.vline(CX, 56, 3, "1"); c.vline(CX, 77, 3, "1"); c.px(CX + 1, 56, "3"); c.px(CX + 1, 77, "4")
  c.rect(CX - 2, 81, 4, 6, "1"); c.hline(CX - 2, 80, 4, "2"); c.vline(CX + 2, 81, 6, "2")
  // plinth of dressed stone
  c.rect(CX - 11, 86, 23, 4, "q"); c.hline(CX - 11, 86, 23, "Q"); c.hline(CX - 11, 89, 23, "r")
  for (let x = CX - 9; x < CX + 11; x += 5) c.px(x, 87 + (x % 2), "r")
})

// the gallery rail, drawn in front of the keeper; the lamp catches its top
sprite("rail", { w: 27, h: 4 }, (c) => {
  c.hline(1, 0, 25, "2"); c.hline(1, 2, 25, "1")
  for (let x = 1; x <= 25; x += 4) c.vline(x, 1, 3, "1")
})

// --- the keeper ------------------------------------------------------------------------------------
// facing right, into the wind; the coat's tail flaps out behind. Sou'wester with a back flap, arm out
// with the lantern hanging from the hand. His back is lit by the lamp room (X), his front by his lantern.
const HEAD = `......XU..
   .....XUUu.
   ....vXUP.o
   ....XUuuPY`
const KEEPER = [`
   ...uXUUu.o
   ..uUXUUu..
   .uUvXUuu..
   uv..XUuu..
   ....XUuu..
   ....k..k..`, `
   .uUvXUUu.o
   uUv.XUUu..
   ....XUuu..
   ....XUuu..
   ....XUuu..
   ....k..k..`, `
   ....XUUu.o
   ...uXUUu..
   ..uUXUuu..
   .uUvXUuu..
   uv..XUuu..
   ....k..k..`]
anim("keeper", { w: 10, h: 10, fps: FPS, pivot: "bottom", facing: "right", height: 1.8 },
  grid(0, 0, HEAD), ...[0, 1, 0, 2].map((i) => frame(grid(0, 4, KEEPER[i]))))

// --- gulls -------------------------------------------------------------------------------------------
const GULL = [
  `2.......2
   .6.....6.
   ..6...6..
   ...566y..
   .........`,
  `.........
   .66...66.
   2..566y.2
   .........
   .........`,
  `.........
   .........
   ...566y..
   ..6...6..
   .2.....2.`,
]
anim("gull", { w: 9, h: 5, fps: FPS, facing: "right" },
  frame(grid(0, 0, GULL[0])), frame(grid(0, 0, GULL[1])), frame(grid(0, 0, GULL[2])), frame(grid(0, 0, GULL[1])))

// three gulls holding into the wind, gusts setting them back and up; each loops whole cycles
const GULLS = [[118, 40, 0], [134, 50, 2], [98, 30, 1]]
const gullAt = (f, [x0, y0, d]) => {
  const p = TAU * f / LOOP
  return [Math.round(x0 + 6 * Math.sin(p + d * 2) + 2 * Math.sin(3 * p + d)), Math.round(y0 + 3 * Math.sin(2 * p + d) + Math.sin(5 * p + d * 3))]
}

// --- rain --------------------------------------------------------------------------------------------
// each drop crosses the picture 6 times down and twice across in the loop; lit where the beam is
const rain = (n, len, seed, dim) => (c) => {
  const r = c.rng(seed)
  for (let i = 0; i < n; i++) {
    const x0 = r() * W, y0 = r() * 130
    const y = ((y0 + c.frame * 780 / LOOP) % 130) - 5, x = ((x0 - c.frame * 2 * W / LOOP) % W + W) % W
    for (let k = 0; k < len; k++) {
      const px = Math.round(x + k * 0.44), py = Math.round(y - k)
      if (py < 0 || py >= H) continue
      const I = beamI(c.frame, px, py)
      c.px(px, py, I > 0.55 ? "L" : I > 0.3 ? "K" : I > 0.1 ? "J" : dim)
    }
  }
}

scene("keepers_watch", { w: W, h: H, bg: "N", world: { light: { at: [LX, LY] } } },
  layer("sky", sky),
  layer("gulls", ...GULLS.map((g, i) => (c) => c.stamp("gull", ...gullAt(c.frame, g), { delay: i * 2 * 1000 / FPS }))),
  layer("sea", sea),
  layer("rain_far", rain(70, 2, 5, "b")),
  layer("land", headland, turfLife),
  layer("surf", { unlit: true }, stamp("surf", 0, 0)),
  ...[0.05, 0.16, 0.3, 0.46, 0.64, 0.82].map((t, i) => layer("beam" + i, { light: true }, beamLayer(t, 0))),
  layer("tower", stamp("lighthouse", LX - CX, 0)),
  layer("keeper", stamp("keeper", LX + 9, 34)),
  layer("rail", stamp("rail", LX - CX, 30)),
  layer("rain", rain(110, 3, 9, "C")),
  glow("WY", { where: [LX - 6, 16, 13, 14], r: 10, strength: 0.35 }),
)
