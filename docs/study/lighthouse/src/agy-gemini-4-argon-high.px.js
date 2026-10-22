// Made for the model study (docs/model-study.md) by Antigravity, Gemini 4 Argon at high effort, its second run; its file as it left it.
// Stormy Night at Headland Light: a 160x120 animated scene looping seamlessly in 24 frames (2.4 s at 10 fps).
// Gale-force wind blows from the sea on the left onto the rocky headland on the right:
// - The lighthouse lamp at (122, 24) sweeps its twin-beam Fresnel optic through the slanting rain.
// - Heavy swells roll in from the left, breaking on the outer sea stack and headland cliffs and throwing up spray.
// - On the seaward gallery deck, a keeper in a yellow oilskin coat holds a storm lantern into the wind, coat flapping.
// - Three gulls battle into the headwind over the churning sea.

pal({
  k: "#090a14",                                                              // deep abyssal ink
  N: "#0f1426", n: "#172038", V: "#22304c", v: "#334666",                    // night storm sky & clouds
  m: "#5c6878", y: "#d99b43", Y: "#f5cf64", w: "#fff9e6",                    // beam haze, amber, gold, lamp core
  S: "#0d182b", s: "#162842", b: "#213d5c", c: "#345c7d",                    // stormy sea depths to swell
  t: "#5382a1", l: "#8cb8cc", i: "#d4eef7",                                  // churning foam, spray, whitecap
  R: "#141624", r: "#222638", q: "#373e54", j: "#59627a",                    // wet basalt headland & sea stacks
  D: "#2b2d3d", d: "#484d63", u: "#7a8299", U: "#b8c0d4",                    // lighthouse masonry (shadow to lit)
  C: "#2b1420", A: "#541f2e", x: "#8c2f39", X: "#c44d46",                    // crimson cupola & daymark band
  G: "#1c2030", F: "#404963",                                                // iron railings, mullions, boots
  B: "#4a2c1d", o: "#9e6324", p: "#d4956a",                                  // leather, oilskin shade, weathered skin
})

ramps(
  "kNnVvmyYw",
  "kSsbctli",
  "kRrqj",
  "kDduU",
  "kCAxX",
  "kGF",
  "kBop",
)

const W = 160, H = 120, HZ = 78
const LX = 122, LY = 24                   // the lighthouse lamp (Fresnel lens centre)
const FRAMES = 24, FPS = 10

// ================================================================ 1. Stormy Sky & Clouds
// Low-slung storm clouds shear across the night sky in the gale, forming and thinning over the loop
// so slow drift closes seamlessly in 24 frames.
const CLOUDS = [
  [10, 8, 54, "N", "n", "V"],
  [72, 6, 62, "N", "n", "V"],
  [28, 19, 68, "n", "V", "v"],
  [96, 17, 58, "n", "V", "v"],
  [4, 33, 56, "n", "V", "v"],
  [62, 31, 52, "n", "V", "v"],
]

const drawSky = (c) => {
  c.grad(0, 0, W, 32, "kN")
  c.grad(0, 32, W, 24, "Nn")
  c.grad(0, 56, W, HZ - 56, "nV")
  // Distant mist-veiled headland across the bay on the far left horizon
  c.poly([0, 73, 14, 72, 28, 74, 42, 76, 48, 78, 0, 78], "N")
  c.hline(0, 77, 48, "S")

  // Wind-driven storm cloud banks
  const r = c.rng(11)
  CLOUDS.forEach(([x0, y0, len, dark, mid, under], idx) => {
    const drift = 8
    const age = (c.phase + idx / CLOUDS.length) % 1
    const env = Math.min(1, 1.45 * Math.sin(age * Math.PI))
    const x = x0 - (drift >> 1) + Math.floor(drift * age)
    const puffs = 4
    for (let i = 0; i < puffs; i++) {
      const t = (i + 0.5) / puffs
      const cx = Math.round(x + len * t + (r() - 0.5) * 6)
      const rx = Math.round(len * (0.18 + r() * 0.1) * env)
      const ry = Math.max(1, Math.round((2 + Math.sin(t * Math.PI) * 2.5) * env))
      const cy = y0 + Math.round((r() - 0.5) * 2)
      if (rx > 1) {
        c.ellipse(cx, cy, rx, ry, dark)
        if (ry >= 2) c.ellipse(cx + 2, cy + 1, Math.max(1, rx - 2), ry - 1, mid)
      }
    }
    // Wind-sheared anvil tails streaming right
    const tail = Math.round(14 * env)
    if (tail > 2) {
      c.hline(x + len - 4, y0 + 1, tail, mid)
      c.hline(x - 6, y0 + 2, Math.round(10 * env), dark)
    }
    // Faintly lit underside where cloud faces the lighthouse glow
    const distToLamp = Math.abs(x + len * 0.5 - LX)
    if (distToLamp < 75 && env > 0.45) {
      for (let px = Math.max(0, x); px < Math.min(W, x + len); px++) {
        for (let py = y0 + 5; py >= y0 - 2; py--) {
          if (c.is(px, py, mid) || c.is(px, py, dark)) {
            if ((px + py) % 2 === 0 || Math.abs(px - LX) < 42) c.px(px, py, under)
            break
          }
        }
      }
    }
  })
}

// ================================================================ 2. Sweeping Beam & Slanting Rain
// Twin-beam Fresnel optic revolving around (LX, LY). A half-turn (pi radians) brings the opposing
// lens into the first lens's place, closing the loop seamlessly in 24 frames.
// Drawn in the scene's flat projection: horizontal axis (with a slight seaward dip), running all
// the way out of the frame when extended, shortening and widening as it turns toward the viewer,
// and dissolving smoothly into the driving rain without any hard cutoff in mid-air.
const SKY_STEP = { k: "n", N: "V", n: "v", V: "m", v: "y", m: "Y", y: "w", Y: "w", w: "w", S: "b", s: "c", b: "t" }
const stepUp = (k, n) => {
  let cur = k
  for (let i = 0; i < n; i++) cur = SKY_STEP[cur] || cur
  return cur
}

// Evaluates the beam intensity (0..4.2) at any screen pixel (x, y) for frame phase.
// Uses smooth elliptical distance so as the beam turns toward us it shortens and widens with a
// rounded, rain-dithered falloff—never a vertical cutoff line in mid-air.
const beamIntensity = (x, y, phase) => {
  const theta = phase * Math.PI           // 0..pi over 24 frames (twin opposed beams at theta and theta + pi)
  const dx = x - LX
  const dy = y - (LY + 0.04 * Math.abs(dx))
  let best = 0

  for (let b = 0; b < 2; b++) {
    const a = theta + b * Math.PI
    const ux = -Math.cos(a)               // -1 = straight left, +1 = straight right
    const uz = Math.sin(a)                // +1 = toward viewer, -1 = behind lantern

    // Radial glare around the lantern room, peaking when a beam sweeps across the viewer (uz -> 1)
    const glareR = 11 + Math.max(0, uz) * 24
    const distToLamp = Math.hypot(dx, (y - LY) * 1.25)
    if (distToLamp < glareR) {
      const g = Math.pow(1 - distToLamp / glareR, 1.35) * (1.8 + 2.4 * Math.max(0, uz))
      if (g > best) best = g
    }

    // Cone projection along ux
    if (dx * ux <= 0) continue
    const absUx = Math.abs(ux)
    // Vertical half-width widens as the beam turns toward us (absUx decreases)
    const widen = 1 / Math.max(0.32, absUx)
    const halfW = 1.8 + Math.abs(dx) * 0.095 * Math.min(2.4, widen)
    const absDy = Math.abs(dy)
    if (absDy > halfW) continue

    const across = 1 - absDy / halfW      // 1 on axis, 0 at cone edge
    // Smooth elliptical distance along the cone (couples dx and dy so tip is softly rounded, never vertical)
    const reach = (uz >= 0 ? 175 : 130) * Math.pow(absUx, 0.85)
    const effDist = Math.hypot(dx, dy * 3.8)
    if (effDist > reach * 1.25) continue

    const along = Math.max(0, 1 - effDist / (reach * 1.25))
    const frontFactor = uz >= 0 ? 1.0 : 0.65
    const core = across > 0.45 ? (across - 0.45) * 1.4 : 0
    const val = (Math.pow(across, 0.7) * (0.9 + 2.3 * Math.pow(along, 0.7)) + core * along) * frontFactor
    if (val > best) best = val
  }
  return best
}

// Ordered 4x4 Bayer threshold for smooth atmospheric fade into rain without hard edges
const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
]

// Drawn at the end of the sky layer so c.key(x, y) reads the sky and cloud keys and steps them up!
const drawSkyBeam = (c) => {
  const ph = c.phase
  for (let y = 0; y < HZ; y++) {
    for (let x = 0; x < W; x++) {
      const raw = beamIntensity(x, y, ph)
      if (raw <= 0.25) continue
      const bayer = (BAYER4[y & 3][x & 3] + 0.5) / 16
      const steps = Math.floor(raw + bayer * 0.85)
      if (steps > 0) {
        const cur = c.key(x, y)
        c.px(x, y, stepUp(cur, Math.min(4, steps)))
      }
    }
  }
}

// Slanting rain drawn in a foreground unlit layer so rain streaks cross sky, beam, sea, and headland
const drawSlantingRain = (c) => {
  const f = c.frame
  const ph = c.phase
  // 96 drops moving at (vx=2, vy=5) px per frame -> (48, 120) per 24-frame loop.
  // Each drop is a clean 2:1 diagonal streak (two 2-px vertical runs stepped by 1 px: no L-corners).
  const r = c.rng(42)
  for (let i = 0; i < 96; i++) {
    const x0 = Math.floor(r() * 192)
    const y0 = Math.floor(r() * 120)
    const bx = ((x0 + f * 2) % 192) - 16
    const by = (y0 + f * 5) % 120
    const pts = [[bx, by], [bx, by + 1], [bx + 1, by + 2], [bx + 1, by + 3]]
    for (let s = 0; s < pts.length; s++) {
      const [px, py] = pts[s]
      if (px < 0 || px >= W || py < 0 || py >= H) continue
      // Keep the keeper and lantern room face clean of obscuring streaks
      if (px >= 94 && px <= 134 && py >= 16 && py <= 37) continue
      const bVal = beamIntensity(px, py, ph)
      const nearKeeperLantern = Math.hypot(px - 96, py - 29) < 9
      if (bVal > 1.8) {
        c.px(px, py, s >= 2 ? "w" : "Y")
      } else if (bVal > 0.65 || nearKeeperLantern) {
        c.px(px, py, s >= 2 ? "Y" : "y")
      } else if (py < HZ) {
        if (s === 1 || s === 2) c.px(px, py, py < 36 ? "V" : "v")
      } else if (px < 70 || i % 3 === 0) {
        if (s === 1 || s === 2) c.px(px, py, "c")
      }
    }
  }
}

// ================================================================ 3. Gulls Struggling Against the Wind
// Three gulls battling left into the gale. Slender 2-px-thick wings in a full 4-pose flap cycle
// (high V upstroke -> arched M glide -> deep downstroke -> recovery). Every horizontal run steps
// dark-to-light from left to right along "kSsbctli" toward the lighthouse lamp at [122, 24].
const GULL_FRAMES = [
  // Pose 0: High V upstroke - two slender wings arched high with open sky between them
  `
  ..tl......li
  ...tl....tli
  ....tl..tli.
  ...ctlllti..
  .....cti....`,
  // Pose 1: Classic gull M-wings - arched wrists, slender wingtips angled into the gale
  `
  ..tl.....tli
  .ctl.tl.tli.
  .ct..ctllti.
  ......cti...
  ............`,
  // Pose 2: Deep power downstroke - near wing sweeps down below body, far wing & tail gleam
  `
  ........tli.
  ...ctlllti..
  ..ctl..tli..
  .ctl...ti...
  .ct.........`,
  // Pose 3: Recovery stroke - wings lifting at the carpal joint
  `
  ..tl....tli.
  .ctl...ctli.
  ....ctllti..
  .....cti....
  ............`,
]

function makeGull(name, phaseOffset, swayAmp) {
  anim(name, { w: 15, h: 8, frames: FRAMES, fps: FPS }, (c) => {
    const f = (c.frame + phaseOffset) % 8
    const poseIdx = [0, 0, 1, 2, 2, 3, 3, 1][f]
    const dx = [2, 2, 1, 0, 0, 1, 1, 2][f]
    const dy = Math.round(1 + swayAmp * Math.sin(((c.frame + phaseOffset) / 8) * Math.PI * 2))
    c.grid(dx, dy, GULL_FRAMES[poseIdx])
  })
}

makeGull("gull_high", 0, 1.0)
makeGull("gull_lead", 3, 1.0)
makeGull("gull_low", 6, 1.0)

// ================================================================ 4. Stormy Sea, Rocks & Breaking Waves
// Asymmetric, wind-driven ocean swells with long dark troughs, angled teal faces, and ragged foam crests
const drawSea = (c) => {
  c.grad(0, HZ, W, 12, "Ss")
  c.grad(0, HZ + 12, W, 16, "sb")
  c.grad(0, HZ + 28, W, 14, "bS")
  c.hline(0, HZ, W, "n")

  const ph = c.phase
  const SWELL_BANDS = [
    [HZ + 2,  24, [[0, 10, "S"], [8, 8, "b"], [11, 4, "c"]]],
    [HZ + 5,  24, [[6, 12, "S"], [15, 9, "b"], [18, 5, "c"]]],
    [HZ + 9,  32, [[2, 14, "S"], [13, 11, "b"], [16, 7, "c"], [19, 3, "t"]]],
    [HZ + 14, 32, [[14, 16, "s"], [26, 12, "c"], [29, 6, "t"], [31, 3, "l"]]],
    [HZ + 20, 48, [[4, 20, "S"], [20, 16, "b"], [24, 11, "c"], [28, 6, "t"], [31, 3, "l"]]],
    [HZ + 27, 48, [[24, 22, "S"], [40, 18, "b"], [44, 12, "c"], [48, 7, "t"], [51, 4, "l"]]],
    [HZ + 34, 48, [[10, 24, "k"], [28, 18, "b"], [32, 13, "c"], [36, 8, "t"], [39, 4, "i"]]],
  ]
  SWELL_BANDS.forEach(([y, period, segs]) => {
    const shift = Math.round(ph * period)
    for (let base = -period; base < 96; base += period) {
      for (const [ox, len, col] of segs) {
        const x = base + ((ox + shift) % period)
        const wy = y + ((col === "S" || col === "k") ? 1 : (col === "l" || col === "i") ? -1 : 0)
        c.hline(x, wy, len, col)
        if ((col === "c" || col === "t" || col === "l") && x > 2 && x < 84) {
          const bVal = beamIntensity(x + (len >> 1), HZ - 2, ph)
          if (bVal > 0.9) {
            c.hline(x + 1, wy, Math.max(2, len >> 1), bVal > 1.7 ? "Y" : "y")
          }
        }
      }
    }
  })
}

// Offshore jagged basalt sea stack & reef at (14, 91): uses ramp "kRrqj" throughout so its rim
// reads cleanly as lit from the top-right toward [122, 24].
sprite("sea_stack", { w: 38, h: 28 }, (c) => {
  c.poly([2, 26, 5, 19, 8, 15, 11, 16, 14, 9, 19, 3, 23, 5, 27, 10, 30, 9, 34, 14, 36, 21, 36, 26], "r")
  c.poly([8, 22, 12, 14, 18, 6, 26, 12, 32, 16, 32, 23], "q")
  c.line(2, 26, 5, 19, "k"); c.line(5, 19, 8, 15, "k"); c.line(8, 15, 11, 16, "R"); c.line(11, 16, 14, 9, "R")
  c.line(3, 26, 6, 19, "R"); c.line(6, 19, 9, 16, "R")
  c.rect(2, 24, 34, 3, "k")
  c.hline(4, 23, 30, "R")
  c.line(15, 8, 19, 3, "j")
  c.line(19, 3, 23, 5, "j"); c.line(19, 4, 23, 6, "q")
  c.line(23, 5, 27, 10, "j"); c.line(23, 6, 27, 11, "q")
  c.line(27, 10, 30, 9, "j")
  c.line(30, 9, 34, 14, "j"); c.line(34, 14, 36, 21, "j")
  c.vline(35, 15, 8, "j"); c.vline(36, 20, 4, "j")
})

// Rocky headland on the right at (66, 72): sculpted basalt sea-cliffs with diagonal fault crevices,
// undercut ledge shadows, and wet top-lit terraces using ramp "kRrqj".
sprite("headland", { w: 94, h: 48 }, (c) => {
  // 1. Craggy stepped cliff body in 'r'
  c.poly([
    2, 47, 4, 40, 8, 36, 12, 36, 15, 28, 20, 22, 24, 14, 30, 6, 36, 3,
    72, 3, 77, 7, 83, 9, 88, 15, 92, 22, 92, 47,
  ], "r")

  // 2. Angular faceted rock planes ('q') and diagonal geological fault crevices ('R'/'k')
  c.poly([20, 22, 24, 14, 30, 6, 36, 3, 38, 11, 31, 18, 22, 23], "q")
  c.poly([39, 4, 62, 4, 58, 14, 47, 17, 38, 13], "q")
  c.poly([44, 21, 59, 19, 55, 28, 41, 29], "q")
  c.poly([64, 4, 72, 3, 77, 7, 80, 15, 70, 17, 62, 13], "q")
  c.poly([65, 22, 79, 20, 76, 29, 63, 30], "q")
  // Stepped diagonal fault crevices & undercut shadows below the rock shelves (no vertical chimneys!)
  c.poly([35, 12, 39, 14, 34, 24, 28, 33, 25, 32, 31, 22], "R")
  c.poly([61, 11, 65, 13, 60, 23, 54, 34, 51, 33, 57, 21], "R")
  c.poly([22, 15, 34, 16, 32, 19, 20, 18], "R")
  c.poly([41, 17, 57, 16, 55, 20, 39, 20], "R")
  c.poly([64, 16, 78, 16, 76, 19, 63, 19], "R")
  c.poly([42, 29, 56, 28, 54, 32, 40, 32], "R")

  // 3. Dark left seaward rim & bottom wave-cut base ('k'/'R' outside 'r'/'q' inside)
  c.line(2, 46, 4, 40, "k"); c.line(4, 40, 8, 36, "k"); c.line(8, 36, 12, 36, "k")
  c.line(12, 36, 15, 28, "k"); c.line(15, 28, 20, 22, "R"); c.line(20, 22, 24, 14, "R")
  c.line(3, 46, 5, 40, "R"); c.line(13, 36, 16, 28, "R")
  c.rect(2, 43, 91, 5, "k")
  c.hline(3, 41, 89, "R"); c.hline(3, 42, 89, "R")

  // 4. Bright top & right cliff rims ('j' outside 'q'/'r' inside) catching the lamp at [122, 24]
  c.line(25, 13, 30, 6, "j"); c.line(30, 6, 36, 3, "j")
  c.hline(34, 3, 39, "j"); c.hline(31, 4, 43, "j"); c.hline(29, 5, 46, "q")
  c.line(72, 3, 77, 7, "j"); c.line(77, 7, 83, 9, "j"); c.line(83, 9, 88, 15, "j"); c.line(88, 15, 92, 22, "j")
  c.vline(92, 22, 20, "j"); c.vline(91, 22, 20, "q")
  // Stepped mid-cliff terrace rims
  c.hline(23, 14, 12, "j")
  c.hline(41, 16, 16, "j")
  c.hline(64, 15, 14, "j")
  c.hline(19, 22, 11, "j")
  c.hline(44, 21, 14, "j")
  c.hline(65, 21, 13, "j")
})

// Organic breaking waves, billowing surf aprons, and wind-whipped spray plumes on the rocks below
const drawBreakersAndSpray = (c) => {
  const f = c.frame

  const runBreaker = (baseX, baseY, phaseShift, scale) => {
    const bf = (f + phaseShift) % 12      // 12-frame breaker cycle (2 full breaks per 24-frame loop)

    // 1. Steepening curling wave rolling in from the left (frames 0..4)
    if (bf <= 4) {
      const wx = baseX - 15 + bf * 3
      const wy = baseY + 2 - (bf >> 1)
      const wLen = Math.round((10 + bf * 2) * scale)
      c.poly([wx, wy + 3, wx + wLen, wy + 1, wx + wLen - 1, wy - 1, wx + 2, wy + 1], "b")
      c.line(wx + 1, wy + 2, wx + wLen, wy, "c")
      c.line(wx + 2, wy + 1, wx + wLen - 1, wy - 1, "t")
      c.line(wx + 4, wy, wx + wLen - 1, wy - 2, bf >= 3 ? "i" : "l")
      if (bf >= 2) {
        c.px(wx + wLen, wy - 2, "w")
        c.px(wx + wLen - 1, wy - 2, "w")
      }
    }

    // 2. Organic multi-lobed surf apron surging up the diagonal rock face (frames 3..9)
    if (bf >= 3 && bf <= 9) {
      const p = bf - 3 // 0..6
      const reach = Math.round([5, 9, 12, 11, 8, 6, 4][p] * scale)
      const xTop = baseX + Math.round(reach * 0.6)
      const yTop = baseY - reach
      // Broad turquoise/foam base apron hugging the rock slope
      c.poly([
        baseX - 6, baseY + 2,
        baseX + 5, baseY + 1,
        xTop + 2, yTop + 3,
        xTop - 2, yTop,
        baseX - 4, baseY - 1,
      ], p <= 4 ? "l" : "t")
      // Bright frothy inner surge & irregular scalloped crest lobes
      c.poly([
        baseX - 3, baseY + 1,
        baseX + 3, baseY,
        xTop + 1, yTop + 2,
        xTop - 1, yTop,
      ], p <= 3 ? "i" : "l")
      // Secondary lower splash lobe on the seaward left
      const xLobe = baseX - 3 + Math.round(reach * 0.25)
      const yLobe = baseY - Math.round(reach * 0.65)
      c.line(baseX - 5, baseY, xLobe, yLobe, "i")
      if (p >= 1 && p <= 3) {
        c.hline(xTop - 2, yTop, 3, "w")
        c.px(xTop, yTop + 1, "w")
        c.px(xLobe, yLobe, "w")
      }
      // Dark rock crags poking through the receding white water (p >= 3)
      if (p >= 3) {
        c.px(baseX, baseY - 3, "R")
        c.px(baseX + 1, baseY - 4, "k")
        c.line(baseX + 3, baseY - 5, baseX + 2, baseY, "t")
      }
    }

    // 3. Fan of wind-torn spray ribbons & spindrift droplets thrown high over the rocks (frames 4..11)
    if (bf >= 4) {
      const st = bf - 4 // 0..7
      const jets = [
        [-2, -3.5, 1.3],
        [1,  -4.4, 1.9],
        [3,  -3.8, 2.5],
        [-4, -2.7, 0.8],
        [4,  -3.0, 3.0],
      ]
      jets.forEach(([ox, vy0, vx0], idx) => {
        const jx = Math.round(baseX + ox + vx0 * st * scale)
        const jy = Math.round(baseY - 3 + (vy0 * st + 0.43 * st * st) * scale)
        if (st <= 1) {
          c.line(baseX + ox, baseY - 3, jx, jy, "i")
          c.px(jx, jy, "w")
          c.px(jx - 1, jy + 1, "w")
        } else if (st <= 3) {
          c.px(jx, jy, st === 2 ? "w" : "i")
          c.px(jx - 1, jy + 1, "i")
          c.px(jx - 2, jy + 2, "l")
          if (idx < 3) c.px(jx + 1, jy, "l")
        } else if (st <= 6 || idx % 2 === 0) {
          c.px(jx, jy, st <= 5 ? "i" : "l")
          c.px(jx - 1, jy + 1, "t")
          if (st === 4 && idx < 3) c.px(jx + 2, jy - 1, "l")
        }
      })
    }

    // 4. Churning foam rings & eddies at the water-line (all frames)
    const bw = (bf + 6) % 12
    const rx = baseX - 9 + (bw >> 1)
    c.hline(rx, baseY + 2, 12, "t")
    c.hline(rx + 2, baseY + 1, 7, bw < 6 ? "i" : "l")
    c.hline(baseX - 11, baseY + 4, 16, "c")
    c.hline(baseX - 6, baseY + 3, 9, "l")
  }

  runBreaker(73, 99, 0, 1.25)             // Main headland cliff face
  runBreaker(62, 110, 6, 1.05)            // Lower headland reef shelf
  runBreaker(21, 107, 3, 1.1)             // Offshore sea stack seaward flank
  runBreaker(48, 114, 9, 0.9)             // Channel skerry
}

// ================================================================ 5. Lighthouse Tower & Lantern Room
anim("lantern_room", { w: 20, h: 31, frames: FRAMES, fps: FPS }, (c) => {
  const cx = 9                            // scene x = 113 + 9 = 122 (LX)
  const ph = c.phase
  const theta = ph * Math.PI
  const glare = Math.max(Math.sin(theta), Math.sin(theta + Math.PI))

  // 1. Lightning rod & finial ball (y = 0..5 -> scene y = 5..10)
  c.vline(cx, 0, 5, "F")
  c.px(cx, 0, "w")
  c.rect(cx - 1, 4, 3, 2, "X")

  // 2. Crimson/copper conical cupola dome (y = 5..13 -> scene y = 10..18)
  c.poly([cx, 5, cx + 8, 12, cx - 8, 12], "A")
  c.poly([cx, 5, cx + 5, 12, cx - 5, 12], "x")
  c.poly([cx, 5, cx + 2, 12, cx - 2, 12], "X")
  c.hline(cx - 9, 12, 19, "C")
  c.hline(cx - 8, 13, 17, "G")

  // 3. Glazed lantern housing & revolving Fresnel lens (y = 14..23 -> scene y = 19..28)
  c.rect(cx - 7, 14, 15, 10, "y")
  c.rect(cx - 5, 15, 11, 8, "Y")
  const lensX = cx + Math.round(Math.cos(theta) * 3)
  c.rect(cx - 3, 16, 7, 6, "w")
  c.circ(lensX, 19, glare > 0.6 ? 3 : 2, "w")
  for (const dx of [-7, -3, 0, 3, 7]) {
    if (dx === 0 && glare > 0.72) continue
    c.vline(cx + dx, 14, 10, dx === 0 ? "o" : "G")
  }
  c.hline(cx - 7, 14, 15, "G")
  c.hline(cx - 7, 23, 15, "G")

  // 4. Watch-room service parapet & right gallery railing (y = 24..30 -> scene y = 29..35)
  c.rect(cx - 8, 24, 17, 7, "d")
  c.rect(cx - 6, 24, 13, 7, "u")
  c.rect(cx - 4, 24, 9, 7, "U")
  c.hline(cx - 7, 24, 15, "Y")
  c.rect(cx - 1, 26, 3, 3, "o")
  c.px(cx, 27, "Y")
  c.hline(cx + 8, 27, 3, "F")
  c.vline(cx + 10, 27, 4, "G")
})

// Cylindrical stone lighthouse tower with corbelled gallery deck (x = 96..139, y = 36..75).
sprite("tower", { w: 44, h: 40 }, (c) => {
  const cx = 24                           // scene x = 96 + 24 = 120

  // 1. Corbelled stone gallery deck across the top (y = 0..5 -> scene y = 36..41)
  c.rect(1, 0, 41, 2, "U")
  c.hline(3, 1, 37, "u")
  c.rect(3, 2, 37, 2, "u")
  c.hline(3, 2, 2, "D"); c.hline(38, 2, 2, "U")
  c.rect(7, 4, 30, 2, "d")
  c.hline(7, 4, 3, "D"); c.hline(34, 4, 3, "u")
  for (let bx = 9; bx <= 35; bx += 4) {
    c.px(bx, 4, "U")
    c.px(bx, 5, "D")
  }

  // 2. Cylindrical masonry tower shaft (y = 6..39 -> scene y = 42..75)
  for (let y = 6; y < 40; y++) {
    const t = (y - 6) / 33
    const hw = Math.round(11 + t * 4)
    const xL = cx - hw, w = hw * 2 + 1
    const isBand = y >= 14 && y <= 23
    const isBase = y >= 31

    const cDark = isBase ? "k" : isBand ? "C" : "D"
    const cMid  = isBase ? "R" : isBand ? "A" : "d"
    const cLit  = isBase ? "r" : isBand ? "x" : "u"
    const cBri  = isBase ? "q" : isBand ? "X" : "U"

    c.hline(xL, y, w, cMid)
    c.hline(xL, y, 2, cDark)
    c.hline(xL + w - 2, y, 2, cLit)
    if (y < 33) {
      const lPad = Math.max(4, Math.round(w * (0.24 + t * 0.08)))
      if (w > lPad * 2) c.hline(xL + lPad, y, w - lPad * 2, cLit)
      if (y < 24) {
        const bPad = Math.max(6, Math.round(w * (0.32 + t * 0.08)))
        if (w > bPad * 2) c.hline(xL + bPad, y, w - bPad * 2, cBri)
      }
      c.px(xL + w - 1, y, cBri)
    }

    if (y % 5 === 0) {
      c.hline(xL, y, w - 1, cDark)
    } else if (y % 2 === 1) {
      for (let jx = xL + 4 + ((y * 3) % 6); jx < xL + w - 3; jx += 7) {
        c.px(jx, y, cMid)
      }
    }
  }
  c.rect(cx - 15, 37, 31, 3, "k")

  // 3. Glowing stairwell slit windows & rain-weathering streaks below sills
  c.rect(cx - 2, 10, 3, 4, "o"); c.rect(cx - 1, 10, 2, 3, "Y"); c.px(cx, 11, "w")
  c.vline(cx - 1, 14, 3, "D")
  c.rect(cx + 1, 25, 2, 4, "o"); c.vline(cx + 1, 25, 3, "Y")
  c.vline(cx + 1, 29, 3, "R")
})

// ================================================================ 6. The Keeper in Yellow Oilskin
anim("keeper", { w: 15, h: 14, frames: FRAMES, fps: FPS }, (c) => {
  const wf = c.frame % 6
  const sway = wf === 2 || wf === 3 ? 1 : 0

  // 1. Seaward iron gallery railing at the keeper's left (x = 2..4, y = 10..13)
  c.vline(2, 10, 4, "G")
  c.hline(2, 10, 3, "F")

  // 2. Hooded storm lantern held out over the rail (x = 0..3, y = 5..9)
  const lx = sway
  c.px(lx + 1, 4, "G")
  c.hline(lx, 5, 3, "G")
  c.vline(lx, 6, 3, "G")
  c.px(lx + 1, 6, "w"); c.px(lx + 2, 6, "Y")
  c.px(lx + 1, 7, "Y"); c.px(lx + 2, 7, "y")
  c.hline(lx, 8, 3, "G")

  // 3. Outstretched left arm in oilskin sleeve (x = 2..5, y = 4..5)
  c.px(1 + sway, 4, "B")
  c.hline(3, 4, 3, "y")
  c.hline(3, 5, 3, "o")

  // 4. Sou'wester storm hat (x = 5..10, y = 0..2), brightly lit on top-right by the lamp at (122, 24)
  c.hline(6, 0, 3, "Y"); c.px(8, 0, "w")
  c.px(5, 1, "o"); c.hline(6, 1, 3, "Y"); c.px(9, 1, "w")
  c.px(9, 2, "Y"); c.px(10, 2, "w")

  // 5. Head & beard facing left into the gale (x = 5..8, y = 2..3)
  c.px(6, 2, "p"); c.px(7, 2, "B"); c.px(8, 2, "y")
  c.px(5, 3, "u"); c.px(6, 3, "U")
  c.px(7, 3, "o"); c.px(8, 3, "Y")

  // 6. Yellow oilskin coat torso (x = 5..9, y = 4..10)
  for (let y = 4; y <= 10; y++) {
    c.px(5, y, y >= 6 && y <= 7 ? "y" : "o")
    c.px(6, y, "y")
    c.px(7, y, "y")
    c.px(8, y, "Y")
    c.px(9, y, y <= 7 ? "w" : "Y")
  }

  // 7. Coat-tails flapping wildly to the right in the wind (x = 10..14, y = 6..10)
  const FLAP = [
    [[10, 7, "w"], [10, 8, "Y"], [10, 9, "y"], [11, 7, "w"], [11, 8, "Y"], [11, 9, "y"], [12, 8, "Y"], [12, 9, "y"], [13, 9, "Y"], [13, 10, "y"]],
    [[10, 7, "w"], [10, 8, "Y"], [10, 9, "y"], [11, 7, "w"], [11, 8, "Y"], [12, 6, "w"], [12, 7, "Y"], [12, 8, "y"], [13, 6, "w"], [13, 7, "Y"], [14, 7, "w"]],
    [[10, 7, "w"], [10, 8, "Y"], [11, 7, "w"], [11, 8, "Y"], [11, 9, "y"], [12, 7, "w"], [12, 8, "Y"], [12, 9, "y"], [13, 8, "w"], [13, 9, "Y"], [14, 8, "w"], [14, 9, "Y"]],
    [[10, 8, "Y"], [10, 9, "y"], [10, 10, "o"], [11, 8, "w"], [11, 9, "Y"], [11, 10, "y"], [12, 9, "w"], [12, 10, "Y"], [13, 9, "w"], [13, 10, "Y"]],
    [[10, 7, "w"], [10, 8, "Y"], [10, 9, "y"], [11, 8, "w"], [11, 9, "Y"], [11, 10, "o"], [12, 8, "w"], [12, 9, "Y"], [13, 8, "Y"]],
    [[10, 7, "w"], [10, 8, "Y"], [10, 9, "y"], [11, 7, "w"], [11, 8, "Y"], [11, 9, "y"], [12, 7, "w"], [12, 8, "Y"], [13, 8, "w"], [13, 9, "Y"], [14, 8, "Y"]],
  ]
  for (const [fx, fy, col] of FLAP[wf]) c.px(fx, fy, col)

  // 8. Heavy storm boots planted on the gallery deck (y = 11..13)
  c.rect(5, 11, 2, 3, "G")
  c.rect(8, 11, 2, 3, "G"); c.vline(9, 11, 2, "F")
})

// ================================================================ 7. The Scene
scene("headland_light", { w: W, h: H, bg: "k", world: { light: { at: [LX, LY] } } },
  layer("sky", { unlit: true }, drawSky, drawSkyBeam),
  layer("sea", { unlit: true }, drawSea),
  layer("rocks",
    stamp("sea_stack", 14, 91),
    stamp("headland", 66, 72),
  ),
  layer("breakers", { unlit: true }, drawBreakersAndSpray),
  layer("structure",
    stamp("tower", 96, 36),
    stamp("lantern_room", 113, 5),
    stamp("keeper", 95, 22),
  ),
  layer("gulls",
    stamp("gull_high", 20, 19),
    stamp("gull_lead", 46, 29),
    stamp("gull_low", 28, 43),
  ),
  layer("rain", { unlit: true }, drawSlantingRain),
  glow("wY", { where: [113, 17, 20, 14], r: 8, strength: 0.35 }),
  glow("wY", { where: [94, 26, 7, 7], r: 5, strength: 0.3 }),
)
