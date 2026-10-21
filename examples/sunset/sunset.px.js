// Journey's end: on top of a sea cliff at sunset, an adventurer seen from behind stands at the edge,
// hatchet still in hand, watching the sun go down over the sea. Behind them the camp is going up:
// the tent's last corner not yet pegged (it lifts in the wind), the fire just caught, the pack half
// unloaded, a cairn with a pennant marking the end of the trail. Low camera behind the camp, so the
// horizon crosses the hero at the shoulders. Backlight: what faces us is in shadow, edges toward
// the sun glow, shadows run long toward us, away from the sun. Wind from the left.
// 320x180, loops in 19.2 s (192 frames at 10 fps; everything but the sky repeats every 1.2 s).
pal({
  k: "#110d1a",                                                              // ink
  N: "#1d1a3d", n: "#2d2452", V: "#462b63", v: "#683470", M: "#923e74",      // sky, top down
  m: "#c25270", O: "#e57560", o: "#f59e5e", y: "#fbc870", Y: "#ffe9a8", w: "#fffbe6",
  S: "#191733", s: "#251f47", b: "#3a2b5e",                                  // sea
  R: "#2a1d33", r: "#45293f", q: "#6b3a4a", j: "#9a5050",                    // rock
  E: "#16141f", G: "#272536", g: "#3e3c30", l: "#6a6038", L: "#b0904a",      // grass, sunlit tops
  T: "#3b2c3c", t: "#6a4c4e", u: "#a8785a", U: "#e0ae6c",                    // canvas
  W: "#2c1c22", d: "#553328", e: "#87553a",                                  // wood
  C: "#2e1426", c: "#5a1e32", x: "#922c3a", X: "#d4583e",                    // cloak, red cloth
  p: "#1f1b2e", P: "#352d45",                                                // tunic, trousers
  F: "#5e3440", f: "#a0605a", h: "#2e1a22", H: "#6e3a2c",                    // skin, hair
  K: "#2a1a1c", B: "#4e2e26", A: "#7a4a32",                                  // leather
  I: "#3a3a4c", i: "#8a86a0",                                                // iron
  D: "#20283a", z: "#34495e", Z: "#5d7c8c",                                  // sleeping bag, slate wool
  a: "#b8322a", Q: "#5e4c6a",                                                // ember red, smoke
  1: "#2c1a26", 2: "#4e2e36", 3: "#7a4640", 4: "#a8643f", 5: "#e09a5a",      // tent canvas, backlit: seams to glow
})
ramps("NnVvMmOoyYw", "Ssb", "kRrqj", "EGglL", "TtuU", "Wde", "CcxX", "pP", "Ff", "hH", "KBA", "Ii", "DzZ", "12345")

const W = 320, H = 180, HZ = 100          // horizon
const SX = 230, SR = 14                   // the sun: centre x (on the horizon), radius
const FPS = 10, N = 12                    // every loop is 12 frames at 10 fps
const LOOP = 192                          // except the sky's: 19.2 s, so clouds and birds can move slowly

// Pixels of a key that border empty space on one of `sides` take that key's rim color. One pass, so
// a rim never creeps inward. Drawn last in an asset; the sun is ahead and to the right.
const rim = (map, sides = [[1, 0]]) => (c) => {
  const hits = []
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    const to = map[c.key(x, y)]
    if (to && sides.some(([dx, dy]) => c.is(x + dx, y + dy, "."))) hits.push([x, y, to])
  }
  for (const [x, y, k] of hits) c.px(x, y, k)
}

// ================================================================ sky
// long flat clouds lit from underneath by the sun: [x, y, length, body, mid, underside]. High ones
// are lighter than the dark sky around them, low ones darker than the glow behind them.
const STREAKS = [
  [6, 22, 84, "V", "v", "M"], [148, 14, 116, "V", "v", "M"], [36, 42, 124, "v", "M", "m"], [206, 36, 100, "v", "M", "O"],
  [0, 62, 80, "v", "M", "O"], [240, 58, 80, "v", "m", "o"], [100, 74, 90, "M", "m", "o"], [258, 80, 62, "M", "O", "y"]]
// They drift with the wind (from the left), each in one piece, a whole pixel at even intervals.
// Scrolling a strip that wraps would make the loop as long as the strip is wide over the speed (half a
// minute or more at this pace), so the loop is closed the other way: each streak lives one loop,
// forming out of thin wisps, drifting, and thinning away again where it started, slowly (a quarter
// of its life each way), out of step with the others. A wisp is only its body color, close to the
// sky's; the sunlit underside comes in column by column as it gains body (an ordered spread that
// travels with the cloud), so nothing pops. Low ones are nearer the horizon, farther off, so they
// drift slower.
anim("_clouds", { w: W, h: HZ, frames: LOOP, fps: FPS }, (c) => {
  const r = c.rng(3)
  STREAKS.forEach(([x0, y, len, body, mid, under], k) => {
    const drift = LOOP / (y < 30 ? 4 : y < 60 ? 6 : 8)                  // px per loop: 1 px every 4, 6, 8 frames
    const age = (c.phase - ((k * 5) % 8) / 8 + 1) % 1
    const env = Math.min(1, 1.5 * Math.sin(age * Math.PI))              // forms over the first quarter, fades over the last
    const x = x0 - drift / 2 + Math.floor(drift * age)
    const n = 3 + Math.floor(r() * 3)
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n
      const cx = Math.round(x + len * t + (r() - 0.5) * 10)
      const rx = Math.round(len * (0.16 + r() * 0.14) * env)
      const ry = Math.max(1, Math.round((1 + Math.sin(t * Math.PI) * 1.6) * env))
      const cy = y + Math.round((r() - 0.5) * 3)
      if (rx > 1) c.ellipse(cx, cy, rx, ry, body)
    }
    // thin tails trailing off both ends
    const t0 = 8 + Math.floor(r() * 10), t1 = 12 + Math.floor(r() * 10)
    c.hline(x - t0, y + 1, Math.round(16 * env), body); c.hline(x + len - 6, y + 2, Math.round(t1 * env), body)
    // the underside catches the sun, and where the cloud is thick, the row above it too
    for (let px = x - 20; px < x + len + 24; px++) {
      const order = ((px - x + 64) * 5 % 8 + 0.5) / 8                    // this column's turn, 0..1
      if (order > (env - 0.25) / 0.5) continue
      for (let py = y + 5; py >= y - 4; py--)
        if (c.is(px, py, body)) {
          c.px(px, py, under)
          if (order < (env - 0.7) / 0.3 && c.is(px, py - 1, body) && c.is(px, py - 2, body)) c.px(px, py - 1, mid)
          break
        }
    }
  })
})

// the first stars, at the top of the sky where it is already night; a few twinkle
const STARS = [[22, 5], [58, 2], [97, 8], [118, 3], [166, 4], [214, 2], [260, 6], [300, 4], [40, 11], [290, 11]]
anim("_stars", { w: W, h: 14, frames: N, fps: FPS }, (c) => {
  STARS.forEach(([x, y], i) => c.px(x, y, i % 3 === 0 && (c.frame + i) % 6 < 2 ? "m" : "M"))
})

// the glow, wide and low, and the sun's aura in it: three faint halo rings, stepped, with a checker
// only on their 1 px edges. The outer two breathe by under a pixel over the whole loop, so the edge
// checker shifts a half step now and then; the sun itself stays put. A ring only ever lightens.
const SKY_RAMP = "NnVvMmOoyYw"
anim("_aura", { w: 260, h: 45, frames: LOOP, fps: FPS }, grad(0, 0, 260, 88, "yoO.", "r"), (c) => {
  // key, radius, swell, and whether it's all checker: the corona right round the disc is, so the solid
  // disc keeps its edge against it
  // each ring's radius this frame, worked out once a frame, not once a pixel
  const cx = 130, cy = 45, rings = [["Y", SR + 2, 0, true], ["y", SR + 6, 0.5], ["o", SR + 11, 0.75]]
    .map(([k, r0, swell, checker], i) => ({ k, rank: SKY_RAMP.indexOf(k), checker, r: r0 + swell * Math.sin((c.phase - i * 0.12) * Math.PI * 2) }))
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    const d = Math.hypot(x - cx, (y - cy) * 1.3), on = (x + y) % 2 === 0   // flattened: the glow spreads along the horizon
    for (const g of rings) {
      if (d < g.r + 0.5 && (on || (!g.checker && d < g.r - 0.5))) {
        if (g.rank > SKY_RAMP.indexOf(c.key(x, y))) c.px(x, y, g.k)
        break
      }
    }
  }
})

// the sun, half under, still. The thin bands across it are clouds in front: they drift and come and
// go like the others.
anim("_sun", { w: 76, h: SR + 3, frames: LOOP, fps: FPS }, (c) => {
  const cx = 37, cy = SR + 3                                       // the centre: scene (SX, HZ + 1)
  c.circ(cx, cy, SR, "Y"); c.circ(cx - 1, cy - 1, SR - 5, "w")
  ;[[-22, -8, 30, "o"], [-10, -7, 26, "o"], [4, -4, 20, "y"]].forEach(([dx, dy, len, key], i) => {
    const age = (c.phase - i / 3 + 1) % 1, n = Math.round(len * Math.min(1, 1.5 * Math.sin(age * Math.PI)))
    if (n > 0) c.hline(cx + dx - 12 + Math.floor(24 * age) + ((len - n) >> 1), cy - 1 + dy, n, key)
  })
})

const sky = [
  grad(0, 0, W, 58, "NnV"),
  stamp("_stars", 0, 0),
  grad(0, 54, W, HZ - 54, "VvMmOo"),
  stamp("_aura", SX - 130, HZ - 44),
  stamp("_clouds", 0, 0),
  stamp("_sun", SX - 37, HZ - SR - 2),
]

// ================================================================ sea
// the sun's road: crests catch it in dashes that widen toward us; each dash comes and goes
anim("_glitter", { w: 130, h: 30, frames: N, fps: FPS }, (c) => {
  const r = c.rng(5)
  for (let y = 0; y < 30; y++) {
    if (y > 5 && y % 2) continue                   // rows spread out nearer the viewer
    if (y > 16 && y % 4 === 2) continue
    const half = 10 + y * 1.7, n = 3 + Math.floor(y / 2)
    for (let i = 0; i < n; i++) {
      const len = 1 + Math.floor(r() * (y < 5 ? 7 : 5))
      const x = Math.round(65 + (r() + r() - 1) * half)
      const on = Math.sin((c.phase + r()) * Math.PI * 2)
      if (on < -0.2) continue
      const col = y < 3 ? "Y" : y < 10 ? (on > 0.6 ? "Y" : "y") : y < 20 ? (on > 0.6 ? "y" : "o") : on > 0.6 ? "o" : "O"
      c.hline(x - (len >> 1), y, len, col)
    }
  }
})

const sea = [
  grad(0, HZ, W, 34, "vbsS"),
  hline(0, HZ, W, "M"),
  // wave crests catching the sky, one tone up from the water around them; rows spread out toward us
  (c) => {
    const r = c.rng(8), up = { S: "s", s: "b", b: "v", v: "M" }
    for (const [dy, n, len] of [[2, 30, 2], [4, 26, 3], [7, 22, 3], [10, 18, 4], [14, 16, 5], [19, 13, 6], [25, 10, 7]])
      for (let i = 0; i < n; i++) {
        const x = Math.round(r() * W), y = HZ + dy, l = len - Math.floor(r() * 2)
        const to = up[c.key(x, y)]
        if (to && Math.abs(x - SX) > 40 + dy * 1.5) c.hline(x, y, l, to)
      }
  },
  stamp("_glitter", SX - 65, HZ),
]

// ================================================================ the coast to the left
// Headlands receding toward the horizon. Their tops sit level with ours (on the horizon), their
// feet far below: that's what says how high we are. The long sides face us and are in shadow; the
// end faces turn to the sun and take it. Farther = hazier, closer to the sky's colors.
const NEAR = [0, 91, 9, 90, 19, 91, 28, 91, 37, 93, 45, 94, 51, 96, 55, 98, 57, 104, 59, 111, 61, 118, 0, 119]
const NEAR_END = [51, 96, 55, 98, 57, 104, 59, 111, 61, 118, 54, 118, 53, 110, 52, 103]
const coast = [
  // far
  poly([84, 101, 96, 100, 106, 100, 112, 101, 115, 103, 86, 103], "M"),
  poly([109, 100, 112, 101, 115, 103, 111, 103], "m"), hline(86, 103, 30, "o"),
  // middle
  poly([50, 99, 60, 97, 70, 97, 80, 98, 87, 99, 90, 101, 93, 108, 54, 108], "v"),
  poly([86, 99, 90, 101, 93, 108, 88, 108, 87, 103], "m"), line(90, 101, 93, 108, "O"),
  hline(52, 97, 6, "V"), hline(62, 96, 6, "V"),
  ...[[56, 108, 10], [70, 108, 8], [84, 108, 10]].map(([x, y, l]) => hline(x, y, l, "y")),
  // a sea stack broken off the near headland
  poly([63, 118, 64, 108, 66, 105, 68, 106, 70, 118], "r"), line(68, 106, 69, 117, "j"), hline(65, 105, 2, "R"),
  // near: shadowed side with a few strata, darker toward the wet foot; a turf cap; the lit end
  poly(NEAR, "r"),
  clip(NEAR, grad(0, 106, 62, 14, "rR"),
    line(0, 99, 50, 101, "R"), line(4, 104, 30, 105, "R"), line(18, 109, 52, 111, "R"), hline(0, 113, 40, "R")),
  clip(NEAR, poly([0, 91, 9, 90, 19, 91, 28, 91, 37, 93, 45, 94, 51, 96, 55, 98, 55, 100, 45, 97, 30, 95, 0, 95], "R")),
  hline(0, 91, 9, "q"), hline(9, 90, 10, "q"), hline(19, 91, 9, "q"),
  poly(NEAR_END, "q"), line(55, 98, 61, 118, "j"), line(56, 104, 59, 113, "j"), line(54, 106, 55, 114, "r"),
  // surf at the foot
  ...[[2, 119, 9], [16, 118, 6], [28, 119, 12], [46, 118, 7], [58, 119, 16], [74, 118, 6]].map(([x, y, l]) => hline(x, y, l, "y")),
  ...[[6, 119, 3], [32, 119, 4], [60, 119, 5]].map(([x, y, l]) => hline(x, y, l, "Y")),
]

// ================================================================ the cliff top
const EDGE = [0, 131, 12, 129, 26, 130, 44, 128, 62, 129, 84, 127, 106, 128, 128, 127, 150, 128, 170, 130,
  192, 129, 214, 127, 236, 128, 256, 130, 276, 128, 298, 129, 320, 127]
const edgeY = (x) => {
  for (let i = 0; i < EDGE.length - 2; i += 2) {
    const [x0, y0, x1, y1] = EDGE.slice(i, i + 4)
    if (x >= x0 && x <= x1) return Math.round(y0 + (y1 - y0) * (x - x0) / (x1 - x0))
  }
  return EDGE.at(-1)
}

// grass: at the edge the blades stand against the sea with the sun on their tips; nearer us,
// bigger and darker tufts
sprite("_edge1", { pivot: "bottom" }, `
  ..L.
  .Ll.
  Lgl.
  gG..`)
sprite("_edge2", { pivot: "bottom" }, `
  L...L
  lL.l.
  .glg.
  .GgG.`)
sprite("_tuft1", { pivot: "bottom" }, `
  .l..
  .gl.
  Ggg.`)
sprite("_tuft2", { pivot: "bottom" }, `
  l..l.
  gl.g.
  Gglg.`)
sprite("_dark1", { pivot: "bottom" }, `
  ..g...
  g.G..g
  G.Gg.G
  .GGgGG`)
sprite("_dark2", { pivot: "bottom" }, `
  .g..
  .Gg.
  gGG.
  GGEG`)
sprite("_black1", { pivot: "bottom" }, `
  ..G...
  E.E..G
  E.EE.E
  .EEEEE`)
sprite("_black2", { pivot: "bottom" }, `
  .G..
  .EE.
  GEE.
  EEEE`)
sprite("_thrift", { pivot: "bottom" }, `
  .m.
  mOm
  .g.`)

const ground = [
  poly([...EDGE, W, H, 0, H], "g"),
  // the ground falls away gently toward us, out of the low sun: two darker bands, their edges
  // broken by grass below
  poly([0, 156, 40, 153, 90, 157, 150, 154, 210, 158, 270, 155, 320, 157, 320, H, 0, H], "G"),
  poly([0, 170, 60, 168, 120, 172, 190, 169, 250, 173, 320, 170, 320, H, 0, H], "E"),
  (c) => { for (let x = 0; x < W; x++) { const y = edgeY(x); c.px(x, y, "L"); c.px(x, y + 1, "l"); if (x % 3) c.px(x, y + 2, "l") } },
]
const tufts = [
  scatter("_edge*", 0, 128, W, 6, 34, { on: "lL", below: true, even: true, rflip: "x", seed: 2 }),
  scatter("_tuft*", 0, 138, W, 16, 26, { on: "gl", below: true, even: true, rflip: "x", seed: 5 }),
  scatter("_dark*", 0, 150, W, 12, 30, { on: "g", near: "G", within: 2, below: true, rflip: "x", seed: 6 }),
  scatter("_black*", 0, 164, W, 12, 30, { on: "G", near: "E", within: 2, below: true, rflip: "x", seed: 7 }),
  scatter("_thrift", 200, 130, 120, 10, 7, { on: "glL", below: true, seed: 4 }),
]

// ================================================================ the hero
// Back view, 46 px, head turned a little toward the sun (the right ear and cheek show). Left hand
// holds the hatchet, right fist on the hip under the cloak; the cloak streams right in the wind.
const HERO = {
  0: [[10, "hhhhh"]],
  1: [[9, "hhhhhhh"]],
  2: [[9, "hhhhhhh"]],
  3: [[9, "hhhhhhf"]],
  4: [[9, "hhhhhhf"]],
  5: [[9, "hhhhhhf"]],
  6: [[10, "hhhhf"]],
  7: [[11, "FFF"]],
  8: [[11, "FFF"]],
  9: [[8, "PPPPPPPPP"]],
  10: [[6, "PPPPPPPPPPPPP"]],
  11: [[5, "PPPPPPPPPPPPPPP"]],
  12: [[4, "PPPPPPPPPPPPPPP"]],
  13: [[4, "PPPPPPPPPPPPPP"]],
  14: [[4, "PPPPPPPPPPPPPP"]],
  15: [[4, "PPPPPPPPPPPPPP"]],
  16: [[4, "PPP.PPPPPPPPPP"]],
  17: [[4, "PPP.PPPPPPPPPP"]],
  18: [[3, "BBB.PPPPPPPPPP"]],
  19: [[3, "BBB.PPPPPPPPPP"]],
  20: [[3, "BBB.PPPPPPPPP"]],
  21: [[3, "BBB.KKKKKKKKKKK"]],
  22: [[3, "fff.BBBKKKKKKKK"]],
  23: [[3, "fff.BBBpppppppp"]],
  24: [[3, "fFf.BBBpppppppp"]],
  25: [[7, "pppppppppp"]],
  26: [[7, "ppppp.ppppp"]],
  27: [[7, "ppppp.ppppp"]],
  28: [[7, "pppp...pppp"]],
  29: [[7, "pppp...pppp"]],
  30: [[6, "pppp.....pppp"]],
  31: [[6, "pppp.....pppp"]],
  32: [[6, "pppp.....pppp"]],
  33: [[6, "pppp.....pppp"]],
  34: [[6, "pppp......pppp"]],
  35: [[5, "pppp.......pppp"]],
  36: [[5, "pppp.......pppp"]],
  37: [[5, "pppp.......pppp"]],
  38: [[5, "BBBBB......BBBBB"]],
  39: [[5, "BBBBB.......BBBB"]],
  40: [[4, "BBBBB........BBBBB"]],
  41: [[4, "BBBBB........BBBBB"]],
  42: [[4, "BBBBB........BBBBB"]],
  43: [[4, "BBBBB........BBBBB"]],
  44: [[4, "KKKKK........KKKKK"]],
}
// the hatchet hangs head down from the fist, blade out
const HATCHET = {
  21: [[4, "e"]], 25: [[4, "e"]], 26: [[4, "e"]], 27: [[4, "e"]], 28: [[4, "e"]],
  29: [[2, "IIeI"]], 30: [[0, "iiIIII"]], 31: [[0, "iiI"]],
}

anim("hero", { w: 40, h: 46, frames: N, fps: FPS, outline: "k", pivot: [12, 45] }, (c) => {
  const k = c.phase * Math.PI * 2, s = (o, a = 1) => Math.round(Math.sin(k + o) * a)
  c.runs(HERO)
  c.runs(HATCHET)
  // the cloak: from the shoulders, pushed out by the elbow, streaming right; the hem ripples
  const pts = [8, 8, 17, 8, 19, 10, 21, 15, 23, 18, 28 + s(0), 20 + s(1), 33 + s(1, 1.5), 23 + s(2),
    37 + s(2, 2), 26 + s(3, 1.5), 32 + s(3), 29 + s(4), 27 + s(4), 32 + s(5), 23 + s(5), 31 + s(0),
    19, 34 + s(1), 15, 32 + s(2), 12, 33 + s(3), 9, 26, 7, 20, 7, 14, 5, 11]
  c.poly(pts, "c")
  // folds follow the wind; the thin streaming end lets the sun through
  c.line(12, 11, 13, 31 + s(3), "C"); c.line(16, 11, 21, 30 + s(5), "C"); c.line(21, 17, 30 + s(4), 27 + s(4), "C")
  for (let y = 18; y < 32; y++) for (let x = 28; x < 40; x++) if (c.is(x, y, "c")) c.px(x, y, "x")
  // ponytail, streaming
  c.rect(15, 2, 2, 2, "h"); c.px(17, 2, "h"); c.px(17, 3, "h"); c.px(18, 3 + s(0), "h"); c.px(19, 3 + s(1), "h")
  c.px(15, 2, "a"); c.px(15, 3, "a")                                               // the hair tie
}, rim({ h: "O", F: "o", f: "o", P: "O", p: "j", B: "A", K: "B", c: "X", C: "x", x: "X", W: "d", d: "e", e: "U", I: "i" }),
  rim({ h: "H", c: "x" }, [[0, -1]]))

// ================================================================ the tent
// A two-person ridge tent, pitched with its door end toward the fire: we see its long near slope
// and the door end. The sun is low behind it, so the near slope glows where light comes through the
// canvas (brightest under the ridge, fading toward the hem, where the grass and the ground block the
// low rays), and whatever doubles the cloth reads darker against the glow: the taped ridge seam, the
// panel seams with their stitching, two patches, the creases. Creases fan from what pulls: down from
// the pole tops, up from the pegged hem. The door end is edge-on to the sun and takes the fire's
// light instead; its flaps are rolled back and tied, the far end glowing faintly inside. The
// windward corner isn't pegged yet: it lifts and wrinkles in the wind, its hem frayed, its rope
// trailing to a peg lying in the grass. The ground sheet's edge peeks out under the hem.
const TO = 100                                                  // the canvas starts at scene y 100
const tp = (...v) => v.map((n, i) => (i % 2 ? n - TO : n))      // scene coordinates into it
const mix = (a, b, t) => a + (b - a) * t
const FT = [32, 114], SAG = [67, 117], DT = [103, 117]          // the ridge: far pole, sag, door pole (a bit taller than the hero's shoulders: the tent stands nearer the camera)
const FN = [24, 153], DN = [90, 164], DF = [116, 155]           // feet: far end's near, door end's near and far
const ridgeY = (x) => x < SAG[0] ? mix(FT[1], SAG[1], (x - FT[0]) / (SAG[0] - FT[0])) : mix(SAG[1], DT[1], (x - SAG[0]) / (DT[0] - SAG[0]))
const hemY = (x) => mix(FN[1], DN[1], (x - FN[0]) / (DN[0] - FN[0]))
const PEGGED = [[46, 157], [69, 160]]                           // hem pulled down to pegs; it rides up between
const DARKER = { 5: "4", 4: "3", 3: "2", 2: "1" }, LIGHTER = { 1: "2", 2: "3", 3: "4", 4: "5" }

// walk a straight line given in scene coordinates, calling f(x, y) on each pixel in canvas coordinates
const walk = (x0, y0, x1, y1, f) => {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1)
  for (let i = 0; i <= n; i++) f(Math.round(mix(x0, x1, i / n)), Math.round(mix(y0, y1, i / n)) - TO)
}
// a crease: the fold line one tone darker, its sunward (right) side one tone lighter; on cloth only
const crease = (c, x0, y0, x1, y1) => walk(x0, y0, x1, y1, (x, y) => {
  if (DARKER[c.key(x, y)]) c.px(x, y, DARKER[c.key(x, y)])
  if (LIGHTER[c.key(x + 1, y)] && !c.is(x + 1, y, "1")) c.px(x + 1, y, LIGHTER[c.key(x + 1, y)])
})

anim("tent", { w: 132, h: 72, frames: N, fps: FPS, pivot: [64, 156 - TO] }, (c) => {
  const k = c.phase * Math.PI * 2
  const lift = 6 + Math.round(2 * Math.sin(k)), flap = Math.round(1.5 * Math.sin(k + 1)), ripple = Math.round(Math.sin(k * 2))
  const TIP = [FN[0] - 2 + flap, FN[1] - lift]
  const hemL = (x0) => Math.round(mix(155 - lift * 0.7, 156 - lift * 0.3, (x0 - 33) / 7))   // the lifted hem near the corner
  // the ground sheet's edge under the hem and across the doorway
  for (let x = 42; x <= DN[0]; x++) c.px(x, Math.round(hemY(x)) + 1 - TO, "I")
  walk(DN[0], DN[1] + 1, DF[0] - 2, DF[1] + 2, (x, y) => c.px(x, y, "I"))
  // under the lifted corner, the dark inside shows between the hem and the grass
  c.poly(tp(...TIP, 33, Math.round(155 - lift * 0.7) + ripple, 40, Math.round(156 - lift * 0.3), ...PEGGED[0], ...FN), "E")
  // the near slope, glowing with the light that comes through it: brightest under the ridge, the
  // bands dipping between the seams where each panel hangs a little slack
  c.poly(tp(...FT, ...SAG, ...DT, ...DN, 80, 161, ...PEGGED[1], 57, 157, ...PEGGED[0],
    40, Math.round(156 - lift * 0.3), 33, Math.round(155 - lift * 0.7) + ripple, ...TIP, 27, 141), "3")
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    if (!c.is(x, y, "3")) continue
    const r = ridgeY(x), v0 = (y + TO - r) / (hemY(x) - r)
    const left = mix(FT[0], FN[0], v0), right = mix(DT[0], DN[0], v0), t = (x - left) / (right - left)
    const v = v0 - 0.07 * Math.sin(Math.PI * ((t * 4) % 1)), d = (x + y) % 2
    c.px(x, y, v < 0.06 ? "5" : v < 0.11 ? (d ? "5" : "4") : v < 0.26 ? "4" : v < 0.32 ? (d ? "4" : "3") : v < 0.64 ? "3" : v < 0.7 ? (d ? "3" : "2") : "2")
  }
  // panel seams run from ridge to hem: doubled cloth, two tones darker, stitched along one side
  for (const t of [0.25, 0.5, 0.75]) {
    const rx = mix(FT[0], DT[0], t), hx = mix(FN[0], DN[0], t)
    let i = 0
    walk(Math.round(rx), Math.round(ridgeY(rx)) + 2, Math.round(hx), Math.round(hemY(hx)) - 1, (x, y) => {
      const key = c.key(x, y)
      if (!DARKER[key]) return
      c.px(x, y, DARKER[DARKER[key]] ?? "1")
      if (i++ % 2 === 0 && DARKER[c.key(x + 1, y)]) c.px(x + 1, y, DARKER[c.key(x + 1, y)])
    })
  }
  // two patches: thicker cloth lets less light through, sewn on with a seam all round
  for (const [x, y, w, h] of [[72, 128, 7, 5], [42, 124, 4, 3]]) {
    const tone = c.key(x + 2, y + 2 - TO)
    c.poly(tp(x, y, x + w, y + 1, x + w, y + h + 1, x, y + h), DARKER[tone] ?? "2")
    for (const [a, b, e, f] of [[x, y, x + w, y + 1], [x, y + h, x + w, y + h + 1], [x, y, x, y + h], [x + w, y + 1, x + w, y + h + 1]])
      walk(a, b, e, f, (px, py) => c.px(px, py, DARKER[DARKER[tone]] ?? "1"))
  }
  // creases: down from the pole tops, up from the pegs, a sag fold mid-ridge, wrinkles at the loose corner
  crease(c, 34, 117, 42, 130); crease(c, 34, 118, 36, 134); crease(c, 101, 121, 93, 134); crease(c, 100, 121, 99, 137)
  for (const [x, y] of PEGGED) { crease(c, x, y - 1, x - 4, y - 8); crease(c, x, y - 1, x + 3, y - 9) }
  crease(c, 66, 119, 62, 130)
  // the far pole stands inside the far end: its shadow shows through the cloth
  walk(FT[0], FT[1] + 2, FT[0], 149, (x, y) => DARKER[c.key(x, y)] && c.px(x, y, DARKER[c.key(x, y)]))
  crease(c, TIP[0] + 3, TIP[1] - 2, TIP[0] + 9, TIP[1] - 5 + ripple); crease(c, TIP[0] + 5, TIP[1] + 1, TIP[0] + 12, TIP[1] - 1)
  crease(c, TIP[0] + 9, TIP[1] + 2, TIP[0] + 15, TIP[1] + 1 - ripple)
  // the lifted hem curls, its single layer bright against the dark under it
  const curl = (x, y) => c.is(x, y, "2345") && c.px(x, y, "4")
  walk(TIP[0] + 1, TIP[1], 33, Math.round(155 - lift * 0.7) + ripple - 1, curl)
  walk(33, Math.round(155 - lift * 0.7) + ripple - 1, 40, Math.round(156 - lift * 0.3) - 1, curl)
  // the ridge: its top edge catches the sun, the taped seam under it is doubled cloth
  for (let x = FT[0]; x <= DT[0]; x++) { const y = Math.round(ridgeY(x)) - TO; c.px(x, y, "5"); c.px(x, y + 1, "1") }
  // the door end, lit by the fire from the right; its edge toward the sun takes a rim
  const mid = [Math.round(mix(DN[0], DF[0], 0.5)), Math.round(mix(DN[1], DF[1], 0.5))]
  c.poly(tp(...DT, ...DN, ...DF), "3"); c.poly(tp(...DT, ...mid, ...DF), "4"); c.line(...tp(...DT, ...DF), "5")
  // the doorway, a triangle a little inside the end wall so the canvas frames it. Looking in: the far
  // end wall glows faintly with the sun behind it (that glow is what says "open, and a room inside"),
  // dark all round it, and the ground sheet on the floor takes the firelight at the threshold. The
  // sleeping bag laid out in front of the threshold is the only thing near it; nothing to puzzle out.
  const apex = [DT[0], DT[1] + 6], dl = [mid[0] - 6, mid[1] + 2], dr = [mid[0] + 5, mid[1] - 2]
  c.poly(tp(...apex, ...dl, ...dr), "E")
  const back = [Math.round(mix(apex[0], mix(dl[0], dr[0], 0.5), 0.55)), Math.round(mix(apex[1], mix(dl[1], dr[1], 0.5), 0.55))]
  c.poly(tp(back[0], back[1] - 7, back[0] - 3, back[1] + 3, back[0] + 3, back[1] + 2), "1")      // the far end, backlit
  c.line(...tp(back[0], back[1] - 6, back[0], back[1] + 2), "2")                                       // its seam
  walk(dl[0] + 1, dl[1] - 1, dr[0] - 1, dr[1] - 1, (x, y) => { c.px(x, y, "I"); c.px(x, y - 1, "G") })  // the floor
  walk(Math.round(mix(dl[0], dr[0], 0.5)), Math.round(mix(dl[1], dr[1], 0.5)) - 1, dr[0] - 1, dr[1] - 1, (x, y) => c.px(x, y, "u"))
  // the flaps, rolled back to both sides: a 2 px roll along each edge of the opening, lit by the fire
  // on its right, its other side in shadow, a tie cinching it halfway down
  const roll = (from, to, lit, dark) => {
    walk(from[0], from[1], to[0], to[1], (x, y) => { c.px(x, y, lit); c.px(x - 1, y, dark) })
    const t = [Math.round(mix(from[0], to[0], 0.5)), Math.round(mix(from[1], to[1], 0.5))]
    c.hline(t[0] - 2, t[1] - TO, 4, "e"); c.px(t[0] - 2, t[1] + 1 - TO, "d")
  }
  roll([apex[0] - 1, apex[1] + 1], [dl[0], dl[1] - 2], "4", "2")
  roll([apex[0] + 2, apex[1] + 1], [dr[0] + 2, dr[1] - 2], "5", "3")
  // pole tips above the ridge
  c.vline(FT[0], FT[1] - 5 - TO, 5, "d"); c.vline(DT[0], DT[1] - 5 - TO, 5, "d"); c.px(DT[0], DT[1] - 5 - TO, "e")
  // ink line round the cloth (the ropes come after it, so they stay thin)
  const edge = []
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++)
    if (c.is(x, y, ".") && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !c.is(x + dx, y + dy, "."))) edge.push([x, y])
  for (const [x, y] of edge) c.px(x, y, "k")
  // frayed threads under the loose hem
  c.px(31, hemL(33) + ripple + 2 - TO, "3"); c.px(36, hemL(36) + 2 - TO, "2"); c.px(36, hemL(36) + 3 - TO, "2")
  // ropes and pegs: guys from the pole tops out along the ridge line, the pegged hem, the loose corner's rope
  c.line(...tp(DT[0] + 1, DT[1] - 5, 128, 165), "e"); c.vline(128, 164 - TO, 3, "d"); c.px(128, 164 - TO, "U")
  c.line(...tp(FT[0] - 1, FT[1] - 4, 6, 146), "e"); c.vline(5, 145 - TO, 3, "d"); c.px(5, 145 - TO, "U")
  for (const [x, y] of PEGGED) { c.vline(x, y + 1 - TO, 3, "d"); c.px(x, y + 1 - TO, "e") }
  c.vline(DN[0] - 1, DN[1] + 1 - TO, 3, "d")
  c.curve(tp(...TIP, 19, 160, 13, 162), "e"); c.hline(9, 163 - TO, 4, "d"); c.px(12, 163 - TO, "U")
})
// its shadow, laid away from the sun: the footprint plus where the ridge's shadow lands, and the
// guy ropes' shadows from where the pole tips' shadows fall to their pegs
const TENT_SHADOW = [poly([40, 147, ...DF, ...DN, 71, 180, 0, 161, ...FN], "k"), line(62, 180, 128, 165, "k"), line(0, 160, 6, 146, "k")]

// ================================================================ the camp
// the fire just caught: three small tongues licking up through the kindling, leaning with the wind,
// each on its own beat, inside a ring of stones; the split logs beside it are still waiting
anim("campfire", { w: 26, h: 22, frames: 6, fps: FPS, pivot: "bottom" }, (c) => {
  const k = c.phase * Math.PI * 2, y = 18
  for (const x of [3, 7, 12, 17, 21]) c.rect(x, 15, 3, 2, "r"), c.hline(x, 15, 3, "q")      // stones behind
  c.line(8, 18, 12, 13, "d"); c.line(18, 18, 14, 13, "d")                                   // kindling leaning in
  for (const [cx, h, off] of [[10, 7, 0], [13, 11, 2.1], [16, 8, 4.2]]) {
    const top = y - Math.round(h + Math.sin(k + off) * 2), lean = Math.round(1 + Math.sin(k + off + 1))
    c.poly([cx - 2, y, cx + lean, top, cx + 3, y], "a")
    c.poly([cx - 1, y, cx + lean, top + 3, cx + 2, y], "O")
  }
  c.poly([11, y, 13, y - 3 - Math.round(Math.sin(k + 1)), 16, y], "y"); c.hline(13, y - 1, 2, "Y")
  c.rect(8, 17, 10, 2, "W"); c.hline(8, 17, 10, "d"); c.px(11, 18, "a"); c.px(15, 18, "O")   // the first stick, catching
  for (const x of [1, 5, 10, 15, 20]) c.rect(x, 18, 4, 3, "r"), c.hline(x, 18, 4, "j"), c.px(x, 20, "R")  // stones in front, fire-lit
  if (c.frame % 3 === 0) c.px(15 + (c.frame % 2), 3 - (c.frame % 2), "y")                  // a spark
})
// smoke from the young fire: puffs climbing a thin column, bent right by the wind, spreading and
// breaking up as they rise (drawn in a translucent layer)
anim("smoke", { w: 46, h: 48, frames: N, fps: FPS, pivot: [4, 47] }, (c) => {
  const k = c.phase * Math.PI * 2
  for (let i = 0; i < 14; i++) {
    const t = (i + c.phase) / 14
    if (t > 0.75 && (i % 2)) continue
    const x = Math.round(4 + t * t * 20 + Math.sin(t * 7 - k) * 1.5 * t), y = Math.round(45 - t * 36)
    c.circ(x, y, t < 0.25 ? 0 : t < 0.6 ? 1 : 2, "Q")
  }
})

// the pack, open, a coil of rope still on top; the bedroll is already out
sprite("pack", { outline: "k", pivot: "bottom" }, `
  .....uUu.....
  ....u...u....
  ...BuBBBuB...
  ..BkkkkkkkB..
  ..BAAAAAAAAB.
  .BAKAAAAAKAB.
  .BAKAAAAAKAB.
  .BAUAAAAAUABB
  BBAKAAAAAKABA
  BABKAAAAAKBAA
  BABAAAAAAAABA
  BABAAAAAAABAA
  BBBBAAAAAABBB
  .BBBBBBBBBBB.`, rim({ B: "A", A: "e", u: "U" }))

// the bedroll: a quilted wool sleeping bag laid out on the ground, its head at the doorway, seen almost
// from the side. A rolled shirt for a pillow; the top turned back at the head, a lip of the folded
// layer and the red flannel lining showing; then three puffs between quilting seams, lower toward the
// foot (it lies along the tent's axis, coming toward us). The sun rims the puffs, the fire the foot.
// Slate, so it doesn't melt into the tent or the grass. Pivot: the head's bottom, on the threshold.
sprite("bedroll", { outline: "k", pivot: [3, 6] }, `
  ..............................
  ..........Z...................
  .........zZ.ZZZZ..............
  .UUUUUxxxzzzzzzzz..ZZZ........
  UUUUUUxxxzzzzzzzzDzzzzzz.ZZZ..
  uuuuuucccczzzzzzzDzzzzzzDzzzzZ
  ....DDDDDDzzzzzzzDzzzzzzDzzzzZ
  ..........DDDDDDDDzzzzzzDzzzz.
  ..................DDDDDDDDDD..`)

// split logs for later, stacked two and one, cut ends toward us, bark running back toward the sun
sprite("logs", { w: 18, h: 9, outline: "k", pivot: "bottom" }, (c) => {
  for (const [x, y] of [[1, 5], [6, 5], [3, 2]]) {
    c.line(x + 2, y + 1, x + 10, y - 2, "d", 3); c.line(x + 3, y - 1, x + 10, y - 3, "e")
    c.rect(x, y, 3, 3, "u"); c.px(x + 1, y + 1, "e"); c.px(x + 2, y, "U")
  }
})

// the cooking pot, out of the pack and waiting for the fire to take
sprite("pot", { outline: "k", pivot: "bottom" }, `
  ...iii...
  ..i...i..
  .i.....i.
  IiiiiiiiI
  IIIIIIIii
  IIIIIIIii
  .IIIIIIi.`, rim({ I: "i" }))

// a cairn: the end of the trail, with a pennant on a stick
sprite("cairn", { outline: "k", pivot: "bottom" }, `
  ....qjj....
  ...qjjjq...
  ....rqj....
  ..rqjjjjq..
  ...rqqjr...
  .rqjjqqjjr.
  ..rqqrqjq..
  rqjjqrqjjjr
  RrrqrRrqrrR`, rim({ q: "j", r: "q", R: "r" }))
anim("pennant", { w: 18, h: 26, frames: N, fps: FPS, pivot: [1, 26] }, (c) => {
  const k = c.phase * Math.PI * 2
  c.vline(1, 0, 26, "d"); c.vline(2, 1, 25, "e")
  const tip = [16 + Math.round(Math.sin(k)), 4 + Math.round(Math.sin(k + 2) * 1.5)]
  c.poly([3, 1, 9, 2 + Math.round(Math.sin(k + 1)), ...tip, 9, 6 + Math.round(Math.sin(k + 1)), 3, 7], "x")
  c.line(3, 1, 9, 2 + Math.round(Math.sin(k + 1)), "X")
})

// birds: two gulls hanging on the wind off the edge, wings up and level in turn, sliding a little
// back and forth; and a skein of five flying out toward the sun, crossing the whole sky once a loop
// (off screen at the seam), black against the glow, each on its own wingbeat
const GULL = ["n.....n\n.nn.nn.\n...n...", ".......\nnnn.nnn\n...n..."]
const BIRD = ["k...k\n.k.k.\n..k..", ".....\nkk.kk\n..k..", ".....\n.kkk.\nk.k.k"]   // wings up, level, down
const SKEIN = [[0, 0], [-6, -3], [-6, 4], [-12, -5], [-13, 7]]
anim("_birds", { w: W, h: HZ, frames: LOOP, fps: FPS }, (c) => {
  const k = c.phase * Math.PI * 2
  ;[[146, 66, 0], [160, 72, 3]].forEach(([x, y, d], i) =>
    c.grid(x + Math.round(3 * Math.sin(k + i * 2)), y + Math.round(1.5 * Math.sin(2 * k + i)), GULL[Math.floor((c.frame + d) / 3) % 2]))
  const lx = -20 + c.phase * (W + 40), ly = 46 + c.phase * 14
  SKEIN.forEach(([dx, dy], i) => {
    const beat = [0, 1, 2, 1][Math.floor(c.frame / 2 + i * 1.3) % 4]
    c.grid(Math.round(lx + dx), Math.round(ly + dy + Math.sin(k * 8 + i) * 0.8), BIRD[beat])
  })
})

// tall grass at our feet, backlit: each blade dark on the left, its sunward edge glowing toward the
// tip; it bends with the wind in a gust that runs left to right through the blades
anim("tallgrass", { w: 52, h: 26, frames: N, fps: FPS, pivot: [0, 26] }, (c) => {
  const k = c.phase * Math.PI * 2, r = c.rng(21)
  for (let i = 0; i < 18; i++) {
    const x0 = Math.round(r() * 46), h = 7 + Math.round(r() * 17)
    const lean = 0.3 * h + Math.sin(k - x0 * 0.2) * h / 16
    for (let s = 0; s <= h; s++) {
      const t = s / h, x = Math.round(x0 + lean * t ** 1.6), y = 25 - s
      if (t < 0.8) c.px(x, y, "E")
      c.px(x + 1, y, t > 0.85 ? "L" : t > 0.4 ? "l" : "G")
    }
  }
})

// Shadows run straight away from the sun's point on the horizon, so they fan out: left of the sun
// they fall left, right of it right. `len` = how far a pixel's shadow lands per px of its height.
const awayFromSun = (x, y, len) => { const dx = x - SX, dy = y - HZ, d = Math.hypot(dx, dy); return [len * dx / d, len * dy / d] }

const AT = { hero: [200, 134], fire: [148, 164], pack: [127, 148], bedroll: [99, 162],
  logs: [171, 165], pot: [137, 151], cairn: [282, 132] }
// The sleeping bag lies on a slant (its underside runs from the pillow's row down to the foot's, 3 px
// lower), and cast lays a shadow from one base row, so its shadow is drawn: the bag's underside moved
// away from the sun (left and toward us) by about its own thickness, the way the pack's falls. It
// lies inside the tent's shadow, where one more shadow in the same layer adds nothing, so it goes in
// a layer of its own and darkens there too (a contact shadow, where the bag meets the ground).
const BEDROLL_SHADOW = ((x, y) => poly([x - 4, y - 3, x - 3, y, x + 1, y + 1, x + 7, y + 2, x + 15, y + 3, x + 25, y + 3, x + 27, y + 1,
  x + 22, y + 4, x + 20, y + 6, x + 10, y + 6, x + 2, y + 5, x - 4, y + 4, x - 8, y + 3, x - 8, y - 1], "k"))(...AT.bedroll)

scene("sunset", { w: W, h: H, bg: "N", world: { light: [1, -0.4] } },
  layer("sky", ...sky, stamp("_birds", 0, 0)),
  layer("sea", ...sea),
  layer("coast", ...coast),
  layer("ground", ...ground),
  layer("tufts", ...tufts),
  // long shadows, laid away from the sun's point on the horizon (toward us, and out to the sides)
  layer("shadows", { shade: true },
    stamp("hero", ...AT.hero, { cast: awayFromSun(...AT.hero, 1), silhouette: "k" }),
    ...TENT_SHADOW,
    stamp("pack", ...AT.pack, { cast: awayFromSun(...AT.pack, 1), silhouette: "k" }),
    stamp("pot", ...AT.pot, { cast: awayFromSun(...AT.pot, 1), silhouette: "k" }),
    stamp("logs", ...AT.logs, { cast: awayFromSun(...AT.logs, 1.5), silhouette: "k" }),
    stamp("cairn", ...AT.cairn, { cast: awayFromSun(...AT.cairn, 1.2), silhouette: "k" }),
    // the pennant stands 8 px up inside the cairn: its shadow starts where that point's shadow lands
    ((k) => stamp("pennant", Math.round(AT.cairn[0] + 8 * k[0]), Math.round(AT.cairn[1] + 8 * k[1]), { cast: k, silhouette: "k" }))(awayFromSun(...AT.cairn, 1.2))),
  // the fire's light falls off in three rings, the faintest reaching the tent's door; the bag
  // blocks it, so its shadow comes after that ring
  layer("firelight0", { light: true, density: 0.25 }, ellipse(146, 164, 42, 10, "k")),
  layer("contact", { shade: true }, BEDROLL_SHADOW),
  layer("firelight", { light: true, density: 0.5 }, ellipse(148, 163, 26, 7, "k")),
  layer("firelight2", { light: true }, ellipse(148, 163, 14, 4, "k")),
  layer("camp", { sort: "y" },
    stamp("tent", 64, 156),                       // sorted at y 156, behind the bedroll lying half out of its door
    stamp("pack", ...AT.pack), stamp("pot", ...AT.pot), stamp("bedroll", ...AT.bedroll),
    stamp("campfire", ...AT.fire), stamp("logs", ...AT.logs),
    stamp("pennant", AT.cairn[0], AT.cairn[1] - 8), stamp("cairn", ...AT.cairn),
    stamp("hero", ...AT.hero)),
  layer("smoke", { opacity: 0.45 }, stamp("smoke", 149, 152)),
  layer("fore", stamp("tallgrass", -6, 180), stamp("tallgrass", 22, 180, { reseed: true }), stamp("tallgrass", 272, 180, { reseed: 2 })),
  glow("ayY", { where: [132, 142, 34, 24], r: 8, strength: 0.35 }),
  glow("wY", { where: [SX - SR, HZ - SR, 2 * SR, SR + 1], r: 12, strength: 0.2 }),
)

// close-ups for checking details at a readable size
scene("zoom_hero", { w: 80, h: 56, bg: "N" }, stamp("sunset", -168, -86))
scene("zoom_camp", { w: 180, h: 76, bg: "N" }, stamp("sunset", 0, -104))
scene("zoom_cairn", { w: 80, h: 56, bg: "N" }, stamp("sunset", -240, -90))
scene("zoom_tent", { w: 64, h: 48, bg: "N" }, stamp("sunset", 0, -118))
scene("zoom_door", { w: 72, h: 44, bg: "N" }, stamp("sunset", -80, -132))
scene("zoom_sky", { w: 200, h: 70, bg: "N" }, stamp("sunset", -120, -38))
