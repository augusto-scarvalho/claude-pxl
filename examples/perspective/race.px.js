// A street race on the Rio-Santos at sunset, from the driver's seat: one-point perspective down the
// road, which bends right and then left over the loop; three rivals ahead, overtaken one every four
// seconds, one in the other lane so we weave; the sea and its sun on the left, the Serra do Mar on
// the right. The camera rides with the car, so the road comes at us and the far things swing as we
// turn (parallax: the sun and the islands by the heading, the near ridge a little more).
//
// In meters, road-relative: u across the road (right +), d ahead. The road bends with a curvature
// kappa(f), the same all along it, so a point d ahead sits kappa·d²/2 to the side; our heading turns
// by its integral, which closes over the loop. We go 56 m/s (≈ 200 km/h): 672 m a loop, so every
// stripe, post and palm along the road comes round. The rivals go 20 m/s slower: each one goes from
// 200 m ahead to 40 m behind in the loop and comes round again at the horizon.
pal({
  // sky, top down to the sun
  1: "#241a44", 2: "#3d2458", 3: "#682f6a", 4: "#a23f72", 5: "#d8586e", 6: "#f2845a", 7: "#ffb35e", 8: "#ffd98a", 9: "#fff0c0",
  // clouds lit from under: their tops in the dusk, the middle pink, the underside gold
  C: "#5b3a72", c: "#b85c84", e: "#ffae6e",
  // the islands, the Serra do Mar, the near ridge; the forest along the road and its sunlit rim
  I: "#5a3468", i: "#7a4474", M: "#3c2454", m: "#54306a", N: "#2a1c3c", F: "#1c2624", f: "#2a382c", h: "#d0784c", H: "#7e6a3c",
  // the sea, the beach
  S: "#3e3274", s: "#56468e", L: "#8a6aa8", G: "#ffd890", o: "#e8cce0", b: "#b07a68", B: "#8a5a5a",
  // the road: asphalt (a sheen toward the sun far off), patches, shadow; the paint; the studs
  a: "#3a3344", A: "#52465a", q: "#2c2634", Q: "#1e1a26", w: "#eadfd0", W: "#a89aa0", y: "#f0b03a", Y: "#9a6e2c", t: "#fff0a0",
  // the verge's grass in bands, and in shade
  v: "#3a5a2c", V: "#4a6c34", x: "#24361e",
  // the guardrail, posts and poles, the lamps
  r: "#b0a8b8", R: "#6a6276", p: "#38323f", n: "#4a4452", l: "#ffe2a0",
  // palms: trunk, fronds
  T: "#3a2a2e", P: "#22301e",
  // signs: the chevrons' yellow and black, the green of the road signs
  Z: "#f2c230", k: "#121016", E: "#1f7a4a",
  // the rivals: yellow, red and blue bodies (lit, shade), their black, glass and its sky, tail lights
  D: "#5e4510", j: "#a8801a", J: "#f2c22e", g: "#ffe68a",                          // the yellow one, dark to light
  ",": "#4a1020", "&": "#8a1e2a", K: "#e03a3e", ";": "#ff8a80",                   // the red one
  "$": "#141e48", u: "#233c8a", U: "#3e6ce0", "|": "#9ab8ff",                     // the blue one
  d: "#16121c", z: "#1c1a2a", "+": "#a06a8e", "!": "#ff2e2e", "@": "#ff9a6a",
  // the cockpit: black plastic and leather, near black to its lit edges; the low sun warm on the dash;
  // red stitching; the gauges' orange numbers and red needles
  0: "#0b090e", "-": "#15121a", "=": "#221d29", "~": "#332b39", "^": "#4c4150", "%": "#9a6048", "(": "#c4303a", ")": "#ffb060", "[": "#ff4a30",
  // the driver: gloves (black, red cuffs, lit knuckles), the blue suit's sleeves
  "]": "#3b3546", "{": "#b8282e", "}": "#6c6480", ">": "#2a4aa0", "/": "#4a6ad0", "<": "#18264e",
  // the Bonfim ribbons
  X: "#2ea04a", ":": "#e06aa0",
  // the gloves' sheen
  "'": "#aaa2be",
})
const W = 320, H = 180, FPS = 16, FRAMES = 192, SECONDS = FRAMES / FPS
const TAU = Math.PI * 2
const SPEED = 56, LOOP_M = SPEED * SECONDS                          // 672 m a loop
const HORIZON = 70, EYE = 1.05
const P = perspective({ w: W, horizon: HORIZON, eye: EYE, fov: 76 })
// the road's bend, and our heading: a right-hander, then a left-hander
const BEND = 0.0022
const kappa = (f) => BEND * Math.sin((TAU * f) / FRAMES)
const heading = (f) => ((BEND * SPEED * SECONDS) / TAU) * (1 - Math.cos((TAU * f) / FRAMES))
const travelled = (f) => (LOOP_M * f) / FRAMES
// our lane: the left one (-1.75) while passing the rivals in the right lane, the right one while
// passing the one in the left lane; smooth changes between
const LANE = 1.75, ease = (a) => 0.5 - 0.5 * Math.cos(Math.PI * Math.max(0, Math.min(1, a)))
const ourX = (f) => { const s = (f / FRAMES) * SECONDS; return -LANE + 2 * LANE * (ease((s - 3) / 1.5) - ease((s - 7.5) / 1.5)) }
// a road point to the camera's frame: across, and how far ahead
const cx = (u, d, f) => u - ourX(f) + (kappa(f) * d * d) / 2
const roadU = (x, z, f) => x + ourX(f) - (kappa(f) * z * z) / 2
const at = (x, z, up = 0) => P.ground(x, z, up).map(Math.round)

// ---------------------------------------------------------------- the sky
sprite("_sky", { w: W, h: HORIZON + 2 }, (c) => {
  for (const [k, y0] of SKY_BANDS) c.rect(0, y0, W, HORIZON + 2 - y0, k)
  for (const [k, y0] of SKY_BANDS.slice(1)) for (let x = 0; x < W; x++) for (let r = 1; r <= 4; r++) if (1 - r / 5 > bayer(x, y0 - r)) c.px(x, y0 - r, k)
})
// the sun on the sea, 3 degrees up, 14 degrees left of the road where the loop starts; it swings
// across as we turn. Its glow lifts the sky round it a few tones, softest at the edge (dithered),
// over the sky only, so the clouds keep their own colours; the disc is a little flattened by the low
// air, ringed, and the slits of haze cross its lower half.
const SUN_AZ = -14, SUN_UP = 3
const sunDir = (f) => { const a = ((SUN_AZ * Math.PI) / 180) - heading(f); return [Math.sin(a), Math.cos(a), Math.tan((SUN_UP * Math.PI) / 180)] }
const SKY_BANDS = [["1", 0], ["2", 10], ["3", 22], ["4", 34], ["5", 44], ["6", 53], ["7", 61], ["8", 67]]
function sun(c, f) {
  const [sx, sy] = P.toward(sunDir(f)).map(Math.round), R = Math.round
  for (let y = Math.max(0, sy - 30); y <= HORIZON; y++) for (let x = Math.max(0, sx - 56); x <= Math.min(W - 1, sx + 56); x++) {
    const k = c.key(x, y), i = "12345678".indexOf(k)
    if (i < 0) continue
    const d = Math.hypot((x - sx) / 56, (y - sy) / 30)
    if (d >= 1) continue
    const lift = Math.floor(2.6 * (1 - d) ** 1.8 + bayer(x, y) - 0.3)
    if (lift > 0) c.px(x, y, String(Math.min(8, i + 1 + lift)))
  }
  c.ellipse(sx, sy, 11, 10, "8")
  c.ellipse(sx, sy, 9, 8, "9")
  for (const [dy, w] of [[3, 1], [5, 1], [7, 1]]) for (let x = -9; x <= 9; x++) if ((x / 9) ** 2 + ((dy) / 8) ** 2 < 1) c.px(sx + x, sy + dy, dy === 3 ? "8" : "7")
  c.px(sx - 3, sy - 4, "9")
}

// ---------------------------------------------------------------- far off: the islands and the serra
// Strips that wrap, far enough to move only as we turn, in layers that pale with distance (the air
// between): the farthest serra pink and hazy, nearly the sky's colour; the middle one darker; the
// near ridge darkest, the forest's tops along its crest. Each rises out of the sea at a headland and
// goes back down at its far end, never a cut; the slopes that face the low sun to the left are a tone
// lighter, the crest catches its light, and haze fills the foot of each. The islands out on the sea to
// the left pale the same way, the one under the sun dark against it.
const FAR_W = 960
const farRidge = seamless((x, y) => fbm(x / 40, y, 4), FAR_W)
const ridged = (x, y) => 1 - Math.abs(2 * farRidge(x, y) - 1)
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
// a range: its height along the strip, the keys from the haze at its foot to its lit crest
function range(name, h, height, keys, { detail = 0, forest = false } = {}) {
  const [haze, body, lit, rim] = keys
  sprite(name, { w: FAR_W, h, wrap: "x" }, (c) => {
    for (let x = 0; x < FAR_W; x++) {
      const hx = height(x)
      if (hx < 0.5) continue
      const top = Math.round(h - hx), slope = height(x + 2) - height(x - 2)
      const trees = forest ? (hash(x, 31) < 0.55 ? 1 : 0) + (hash(Math.floor(x / 3), 32) < 0.3 ? 1 : 0) : 0
      for (let y = top - trees; y < h; y++) {
        const d = y - top, foot = h - y
        let k = slope > 0.4 && d < 2 + slope * 2.5 ? lit : body
        if (d <= 0 && slope > -0.2) k = rim
        if (detail >= 1 && ridged(x * 3.1, y * 0.7 + 5) > 0.93 && d > 2) k = slope > 0 ? lit : body
        if (detail >= 2 && d > 1) { const cx = Math.floor(x / 4), cy = Math.floor((y + (cx % 2) * 2) / 4), u = x - cx * 4, v = y + (cx % 2) * 2 - cy * 4
          if (hash(cx, cy * 7 + 3) < 0.6 && u + v < 3 && u < 2) k = lit }                  // a crown's lit side
        if (foot <= 4 && bayer(x, y) * 4 > foot - 0.5) k = haze
        c.px(x, y, k)
      }
    }
  })
}
range("_serra_far", 30, (x) => smooth(590, 670, x) * (1 - smooth(870, 950, x)) * (13 + 14 * ridged(x, 3) + 4 * Math.sin((x / FAR_W) * TAU * 3)), ["5", "4", "c", "c"])
range("_serra_mid", 24, (x) => smooth(625, 700, x) * (1 - smooth(860, 925, x)) * (8 + 12 * ridged(x * 1.3, 7) + 3 * Math.sin((x / FAR_W) * TAU * 5 + 2)), ["4", "3", "I", "i"], { detail: 1 })
range("_serra_near", 20, (x) => smooth(660, 720, x) * (1 - smooth(850, 905, x)) * (6 + 9 * ridged(x * 1.7, 9) + 2 * Math.sin((x / FAR_W) * TAU * 6)), ["m", "M", "m", "i"], { detail: 2, forest: true })
// the islands: humps of rock on the sea, the far ones small and pale, the near ones darker
const ISLANDS = [[300, 22, 3, "far"], [352, 34, 5, "far"], [430, 16, 3, "far"], [470, 40, 7, "mid"], [522, 26, 4, "near"], [560, 30, 6, "mid"]]
sprite("_islands", { w: FAR_W, h: 12, wrap: "x" }, (c) => {
  for (const [cx0, w, hh, depth] of ISLANDS) {
    const [haze, body, rim] = depth === "far" ? ["5", "4", "c"] : depth === "mid" ? ["4", "3", "i"] : ["3", "M", "e"]
    for (let x = Math.round(cx0 - w / 2); x <= cx0 + w / 2; x++) {
      const t = (x - (cx0 - w / 2)) / w, hx = hh * Math.sin(Math.PI * t) ** 0.7 * (0.75 + 0.5 * farRidge(x * 2, 13))
      if (hx < 0.5) continue
      const top = Math.round(12 - hx)
      for (let y = top; y < 12; y++) c.px(x, y, y === top && t < 0.6 ? rim : 12 - y <= 1 && bayer(x, y) > 0.5 ? haze : body)
    }
  }
})
// the strips' 0 lands on the road's vanishing point where the loop starts; then they slide by the
// heading, the nearer ranges a little more (parallax)
function far(c, f) {
  const shift = P.focal * heading(f), x0 = P.vp - FAR_W * 0.6
  c.scroll("_serra_far", HORIZON - 29, 0, { x: Math.round(x0 - shift) })
  c.scroll("_islands", HORIZON - 11, 0, { x: Math.round(x0 - shift) })
  c.scroll("_serra_mid", HORIZON - 23, 0, { x: Math.round(x0 - shift * 1.1) })
  c.scroll("_serra_near", HORIZON - 19, 0, { x: Math.round(x0 - shift * 1.25) })
}

// ---------------------------------------------------------------- the road and what's by it
// Across the road (u, m): the left lane and the right one either side of a double yellow line with
// studs, white edge lines, the shoulders; on the left a guardrail, a strip of rock, the beach and the
// sea; on the right the verge in bands of grass and then the forest.
const EDGE = 3.5, SHOULDER = 4.8, RAIL_U = -5.4, BEACH = -7, SEA = -10, FOREST = 13
function ground(f) {
  const s = travelled(f), k = kappa(f), sunCol = P.toward(sunDir(f))[0], ox = ourX(f)
  return (x, z) => {
    const u = x + ox - (k * z * z) / 2, along = (z + s) % LOOP_M, wide = Math.max(0.07, (z / P.focal) * 0.8)
    const col = P.vp + (P.focal * x) / z, far = z > 90
    if (u < SEA) {
      // the sea: darker near, lighter toward the horizon; lines of swell, and the sun's path glittering
      const near = Math.abs(col - sunCol) < 4 + 900 / z
      if (near && hash(Math.round(col), Math.round(z * 4) + f) < 0.35 - z / 900) return "G"
      if (Math.abs(((u - (s * 15) / LOOP_M) % 5) + 5) % 5 < Math.max(0.15, z / 400)) return "s"
      return z > 140 ? "L" : z > 50 ? "s" : "S"
    }
    if (u < BEACH) return u > BEACH - 0.6 && hash(Math.floor(along / 2), 3) < 0.6 ? "o" : (Math.floor(along / 6) % 2 ? "b" : "B")
    if (u < RAIL_U) return "x"
    if (u > FOREST) return "x"
    if (u > SHOULDER) return Math.floor(along / 16) % 2 ? "v" : "V"
    // the asphalt, the paint and the studs
    if (Math.abs(Math.abs(u) - EDGE) < wide) return far ? "W" : "w"
    if (Math.abs(u) > EDGE) return "a"
    if (Math.abs(Math.abs(u) - 0.12) < Math.max(0.05, wide * 0.6)) return Math.abs(along % 8) < 0.25 && z < 60 ? "t" : far ? "Y" : "y"
    if (Math.floor(along / 42) % 4 === 0 && Math.abs(u - 1.2) < 1.1) return "q"            // a patch of repair
    const lane = Math.abs(u) - LANE
    if (!far && Math.abs(Math.abs(lane) - 0.8) < Math.max(0.18, wide)) return "q"            // the tyres' tracks
    if (!far && z < 30 && hash(Math.round(u * 20), Math.round(along * 6)) < 0.012) return "A"
    return far ? "A" : "a"
  }
}

// things along the road, by where they stand on it (a loop of 672 m): palms on the verge, poles,
// the guardrail's posts, chevrons, a road sign
const along = (p, f) => (((p - travelled(f)) % LOOP_M) + LOOP_M) % LOOP_M
const PALMS = Array.from({ length: 14 }, (_, i) => ({ p: i * 48 + 9 + hash(i, 5) * 20, u: 7 + hash(i, 6) * 4, tall: 7 + hash(i, 7) * 4, lean: (hash(i, 8) - 0.5) * 1.6, seed: i }))
const POLES = Array.from({ length: 12 }, (_, i) => ({ p: i * 56 + 30, u: 6 }))
const CHEVRONS = [100, 112, 124, 136, 420, 432, 444].map((p) => ({ p }))
const SIGN = { p: 300, u: 6.4 }
// a palm in meters: a curving trunk and fronds drooping from its crown
function palm(c, it, f) {
  const d = along(it.p, f)
  if (d < 2 || d > 260) return []
  const base = [cx(it.u, d, f), d], top = [base[0] + it.lean, d], shapes = [], { stick } = solid
  shapes.push(stick([base[0], d, 0], [base[0] + it.lean * 0.3, d, it.tall * 0.5], 0.18, "B"), stick([base[0] + it.lean * 0.3, d, it.tall * 0.5], [top[0], d, it.tall], 0.15, "B"))
  // the fronds: long leaves arching out and drooping, each a flat blade from the crown to its tip
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU + it.seed, dx = Math.cos(a), dz = Math.sin(a) * 0.7, side = [-dz * 0.45, dx * 0.45]
    const mid = [top[0] + dx * 1.8, d + dz * 1.8, it.tall + 0.5], tip = [top[0] + dx * 3.6, d + dz * 3.6, it.tall - 1.4]
    shapes.push(solid.poly([[top[0], d, it.tall], [mid[0] + side[0], mid[1] + side[1], mid[2]], tip, [mid[0] - side[0], mid[1] - side[1], mid[2] - 0.2]], dx < 0 ? "V" : "v"))
  }
  return shapes
}
function pole(it, f) {
  const d = along(it.p, f)
  if (d < 2 || d > 260) return []
  const x = cx(it.u, d, f), arm = cx(it.u - 2.2, d, f), { stick, box } = solid
  return [stick([x, d, 0], [x, d, 9], 0.09, "n"), stick([x, d, 9], [arm, d, 9.3], 0.06, "n"), box([arm - 0.4, d - 0.15, arm + 0.1, d + 0.15, 9.0, 9.25], { top: "n", lit: "l", shade: "l", under: "l" })]
}
function chevron(it, f) {
  const d = along(it.p, f)
  if (d < 2 || d > 200) return []
  // on the outside of the bend
  const side = kappa(f) >= 0 ? -1 : 1, x = cx(side * 5.2, d, f), { stick, box } = solid
  return [stick([x, d, 0], [x, d, 1.2], 0.04, "p"), box([x - 0.35, d, x + 0.35, d + 0.05, 1.2, 1.75], { lit: "Z", shade: "Z", top: "k" })]
}
// a chevron's black arrow on its board, pointing round the bend
function chevronArrow(c, it, f) {
  const d = along(it.p, f)
  if (d < 2 || d > 120) return
  const side = kappa(f) >= 0 ? -1 : 1, x = cx(side * 5.2, d, f), dir = -side, sc = P.scale(d, x)
  const pts = [[-0.15 * dir, 1.68], [0.15 * dir, 1.475], [-0.15 * dir, 1.27]].map(([u, h]) => at(x + u, d - 0.01, h))
  const wd = Math.max(1, Math.round(0.09 * sc))
  c.line(...pts[0], ...pts[1], "k", wd); c.line(...pts[1], ...pts[2], "k", wd)
}
// the road sign's border and words once it is near enough to read
function signWords(c, f) {
  const d = along(SIGN.p, f), x = cx(SIGN.u, d, f), sc = P.scale(d, x)
  if (d < 2 || d > 240 || sc < 5) return
  const [x0, y0] = at(x - 1.5, d - 0.01, 3.7), [x1, y1] = at(x + 1.5, d - 0.01, 2.3)
  c.box(x0, y0, x1 - x0, y1 - y0, "w")
  if (sc > 14) { const sz = Math.max(1, Math.floor(sc / 16)); c.text(Math.round((x0 + x1) / 2), y0 + 2 * sz, "PARATY", "w", { scale: sz, align: "c" }); c.text(Math.round((x0 + x1) / 2), y0 + 9 * sz, "18 km", "w", { scale: sz, align: "c" }) }
}
function sign(f) {
  const d = along(SIGN.p, f)
  if (d < 2 || d > 240) return []
  const x = cx(SIGN.u, d, f), { stick, box } = solid
  return [stick([x - 1.2, d, 0], [x - 1.2, d, 2.2], 0.05, "n"), stick([x + 1.2, d, 0], [x + 1.2, d, 2.2], 0.05, "n"), box([x - 1.6, d, x + 1.6, d + 0.08, 2.2, 3.8], { lit: "E", shade: "E", top: "E" })]
}

// ---------------------------------------------------------------- the rivals
// The rivals, drawn by hand from behind at seven sizes (the left half; pxl mirrors it), the camera
// picking the one nearest the height it should be. Body D j J g, the glass z with the sky across it
// (i, +), the tail lights ( ! @ 9 out to white-hot, the plate, the diffuser and the exhaust, the tyres.
// Red and blue are the yellow one with its four tones swapped.
sprite("_rv_y_64", { mx: true, pivot: "bottom", outline: "0" }, `
  ............gggggggggggggggggggg
  ...........gJJJJJJJJJJJJJJJJJJJJ
  ...........JJJzzzzzzzzzzzzzzz(!!
  ...........JJzziiiiiiiiiiiiiiiii
  ..........JJJzzz+zz+zz+zz+zz+zzz
  ...ggggg..JJzzzzzzzzzzzzzzzzzzzz
  ...gJJJJ-.JJzzzzzzzzzzzzzzzzzzzz
  ...DjjjD--JJzzzzzzzzzzzzzzzzzzzz
  ..........JJzzzzzzzzzzzzzzzzzzzz
  .......ggggJJJJJJJJJJJJJJJJJJJJw
  --....gJJjJJjJJjJJjJJjJJjJJjJJjJ
  -ggggggggggggggggggggggggggggggg
  -JJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJ
  -DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD
  --.ggggggggggggggg--gggggggggggg
  .gJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJ
  gjJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJ
  jj000000000000000000000000000000
  jj-(!!!!(-(!!!!(-(((((((((((((((
  jj-!@99@!-!@99@!-!!!!!!!!!!!!!!!
  jj-(!!!!(-(!!!!(-(((((((((((((((
  jj000000000000000000000000000000
  ~-jjjjjjjjjjjjjjjjjjjjjjj=======
  ~-jjjjjjjjjjjjjjjjjjjjjjj=wwwwww
  ~-jjjjjjjjjjjjjjjjjjjjjjj=w=ww=w
  ~-DDDDDDDDDDDDDDDDDDDDDDD=======
  ~-------00--=--=--=--wWW--=--=--
  ~=======00--=--=--=-W000W-=--=--
  ~-------00--=--=--=-W000W-=--=--
  ~=======00--=--=--=--WWW--=--=--
  ~-------000000000000000000000000
  ~=======000000000000000000000000
  ~-------........................
  -000000-........................`)
sprite("_rv_y_48", { mx: true, pivot: "bottom", outline: "0" }, `
  .........ggggggggggggggg
  ........gJJJJJJJJJJJJJJJ
  ........JJzzzzzzzzzzz(!!
  ........JJziiiiiiiiiiiii
  ..gggg.JJzz+zz+zz+zz+zzz
  ..DjjD-JJzzzzzzzzzzzzzzz
  .......JJzzzzzzzzzzzzzzz
  .....gggJJJJJJJJJJJJJJJw
  -....gJjJJjJJjJJjJJjJJjJ
  -ggggggggggggggggggggggg
  -JJJJJJJJJJJJJJJJJJJJJJJ
  -DDDDDDDDDDDDDDDDDDDDDDD
  -.gggggggggggg-ggggggggg
  gjJJJJJJJJJJJJJJJJJJJJJJ
  jj0000000000000000000000
  jj(!!!(-(!!!(-((((((((((
  jj!@9@!-!@9@!-!!!!!!!!!!
  jj0000000000000000000000
  ~-jjjjjjjjjjjjjjjjj=====
  ~-jjjjjjjjjjjjjjjjj=w=ww
  ~-DDDDDDDDDDDDDDDDD=====
  ~-----00-=-=-=-wWW-=-=-=
  ~=====00-=-=-=-W0W-=-=-=
  ~-----00-=-=-=-WWW-=-=-=
  ~=====000000000000000000
  -0000-..................`)
sprite("_rv_y_34", { mx: true, pivot: "bottom", outline: "0" }, `
  ......ggggggggggg
  ......JJzzzzzzz(!
  ......Jziiiiiiiii
  .ggg.JJzzzzzzzzzz
  .Djj-JJzzzzzzzzzz
  ....ggJJJJJJJJJJw
  -gggggggggggggggg
  -JJJJJJJJJJJJJJJJ
  -DDDDDDDDDDDDDDDD
  gJJJJJJJJJ-JJJJJJ
  j0000000000000000
  j(!!(-(!!(-((((((
  j!@@!-!@@!-!!!!!!
  j0000000000000000
  ~-jjjjjjjjjjj====
  ~-DDDDDDDDDDD=w=w
  ~===00-=-=-WW-=-=
  ~---0000000000000
  -000-............`)
sprite("_rv_y_24", { mx: true, pivot: "bottom", outline: "0" }, `
  ....gggggggg
  ....Jzzzzz(!
  ..g.Jziiiiii
  ..Dj-Jzzzzzz
  ...gJJJJJJJw
  -ggggggggggg
  -DDDDDDDDDDD
  gJJJJJJJ-JJJ
  j00000000000
  j(@!(-(@!(-!
  ~-jjjjjjj=w=
  ~==0-=-=WW-=
  -00-00000000`)
sprite("_rv_y_16", { mx: true, pivot: "bottom" }, `
  ...ggggg
  ...Jzz(!
  .g.Jiiii
  -ggggggg
  -DDDDDDD
  jJJJJJJJ
  j(!(-!!!
  ~-jjjj=w
  -0-00000`)
sprite("_rv_y_10", { mx: true, pivot: "bottom" }, `
  ..ggg
  ..Jzz
  -gggg
  jJJJJ
  j!(!!
  -0000`)
sprite("_rv_y_6", { mx: true, pivot: "bottom" }, `
  .gg
  gJJ
  j!!
  -00`)
// the rivals as the mirror shows them, coming on behind: from the front, the left half drawn and
// mirrored: the roof, the windshield dark with the dusk in it, the hood, the pop-up headlights lit
// (white at their middle, the glow round them), the bumper with its intake, the tyres; five sizes,
// the camera picking the one nearest the height each should be
sprite("_rf_y_14", { mx: true, pivot: "bottom" }, `
  .......00000
  .....00ggggg
  ....0zzzzzzz
  ...0zzCzzzzz
  ..0zzzzcCzzz
  .0jjjjjjjjjj
  0JJJJJJJJJJJ
  0gJJJJJJJJJJ
  0798J0JJJJJJ
  07997jjjjjjj
  0DDDDDDDDDDD
  0D-000000000
  00D0.0-----0
  .000.0000000`)
sprite("_rf_y_10", { mx: true, pivot: "bottom" }, `
  .....0000
  ...00zzzz
  ..0zzCzzz
  .0jjjjjjj
  0JgJJJJJJ
  0798JJJJJ
  07jjjjjjj
  0DDDDDDDD
  00D0.0---
  .00..0000`)
sprite("_rf_y_7", { mx: true, pivot: "bottom" }, `
  ...000
  ..0zzz
  .0jjjj
  0gJJJJ
  098JJJ
  0D0---
  .0.000`)
sprite("_rf_y_5", { mx: true, pivot: "bottom" }, `
  .0zz
  0JJJ
  98JJ
  0D-0
  .0..`)
sprite("_rf_y_3", { mx: true, pivot: "bottom" }, `
  0J
  98
  0.`)
const RED = { D: ",", j: "&", J: "K", g: ";" }, BLUE = { D: "$", j: "u", J: "U", g: "|" }
// the blue one wears twin white racing stripes down its middle, over the paint only (not the glass,
// the lights or the plate): bands either side of its centre line, at each size
const STRIPES = { 64: [27, 36, 4], 48: [20, 28, 3], 34: [14, 20, 2], 24: [10, 15, 1] }
const paintWhite = (x, w) => recolor({ J: "w", g: "w", j: "W", D: "W" }, [x, 0, w, 40])
for (const n of ["64", "48", "34", "24", "16", "10", "6"]) {
  sprite("_rv_r_" + n, { base: "_rv_y_" + n, swap: RED })
  const st = STRIPES[n]
  sprite("_rv_b_" + n, { base: "_rv_y_" + n, swap: BLUE }, ...(st ? [paintWhite(st[0], st[2]), paintWhite(st[1], st[2])] : []))
}
for (const n of ["14", "10", "7", "5", "3"]) { sprite("_rf_r_" + n, { base: "_rf_y_" + n, swap: RED }); sprite("_rf_b_" + n, { base: "_rf_y_" + n, swap: BLUE }) }

// Each 4.4 m long and 1.9 wide, drawn from behind (above); in meters only to throw its long shadow.
// In the loop each goes from 200 m ahead to 40 m behind us, 240 m in 12 s, and is overtaken at 2, 6
// and 10 s.
const RIVALS = [
  { lane: LANE, pass: 2, color: "y", keys: ["J", "j"] },
  { lane: -LANE, pass: 6, color: "r", keys: ["K", "&"] },
  { lane: LANE, pass: 10, color: "b", keys: ["U", "u"] },
]
const rivalZ = (r, f) => { const t = (f / FRAMES) * SECONDS, z = 20 * (r.pass - t); return ((((z + 40) % 240) + 240) % 240) - 40 }
function carShapes(x, zr, [lit, shade]) {
  const { box } = solid
  return [box([x - 0.95, zr + 0.2, x + 0.95, zr + 4.4, 0, 0.72], { top: lit, lit, shade }), box([x - 0.72, zr + 1.4, x + 0.72, zr + 3.1, 0.72, 1.16], { top: shade, lit: "z", shade: "z" })]
}
// the drawings' sizes as stamped (outline included): the camera picks the one nearest the height the
// car should be where it is
const RV = [["64", 66, 36], ["48", 50, 28], ["34", 36, 21], ["24", 26, 15], ["16", 16, 9], ["10", 10, 6], ["6", 6, 4]]
// a rival on the road: the shade right under it; near and off to a side, the car in perspective; else the
// drawing from behind, which bobs a pixel now and then on its springs when it is near; the red
// one's pipes backfire
function rival(c, r, z, f) {
  const x = cx(r.lane, z + 0.2, f), sc = P.scale(z + 0.2, x), [sx, sy] = P.ground(x, z + 0.2).map(Math.round), w = 1.9 * sc
  const [name, dw, dh] = RV.reduce((a, b) => (Math.abs(b[2] - 1.07 * sc) < Math.abs(a[2] - 1.07 * sc) ? b : a))
  c.ellipse(sx, sy, Math.round(w * 0.56), Math.max(1, Math.round(w * 0.05)), "Q")
  const bob = sc > 18 && (f + r.pass * 5) % 8 < 2 ? 1 : 0
  if (sc > 13 && Math.abs(cx(r.lane, z + 2.3, f)) > 1.3) carInPerspective(c, r, z, f, bob)
  else c.stamp(`_rv_${r.color}_${name}`, sx, sy + 1 - bob)
  backfire(c, sx, sy, w, r, f)
}
// A rival near and off to a side is drawn whole in perspective: the side it shows us, the top of its
// tail, its back, each in meters along the car (u from the tail), up from the road (h) and across it
// (o, the left side at -0.95), put where the camera puts them, so the car runs off toward the vanishing
// point as a car does when it draws level. A low wedge: the haunch high over the rear wheel, the
// glasshouse set back and in from the sides, the strakes over the side intake, the wheels with their
// five-spoke rims, the door's seams and handle, the mirror; on the tail the louvred engine cover, the
// rear window, the wing on its end plates, and on its back the black band of the tail lights, the
// plate, the twin pipes and the diffuser. The side toward the low sun (a car's left) is lit, the other
// in shade, the back in its paint as the drawing from behind has it, the tops take the sky; it follows the road's bend. Far off or straight ahead, the drawing
// from behind stands in for it.
const PAINT = { y: ["D", "j", "J", "g"], r: [",", "&", "K", ";"], b: ["$", "u", "U", "|"] }
const BODY_SIDE = [[0, 0.2], [0, 0.72], [0.4, 0.77], [1.25, 0.79], [1.6, 0.77], [2.9, 0.71], [3.7, 0.63], [4.2, 0.53], [4.25, 0.36], [4.2, 0.2]]
const WHEELS = [0.85, 3.55]
function carInPerspective(c, r, z, f, bob) {
  const xc = cx(r.lane, z + 2.3, f), s = xc > 0 ? -1 : 1, lit = s < 0, ramp = PAINT[r.color], R = Math.round
  const pt = (u, h, o) => { const zz = z + 0.2 + u, [x, y] = P.ground(cx(r.lane + o, zz, f), zz, h); return [x, y - bob] }
  const fill = (pts, k) => c.poly(pts.flatMap(([u, h, o]) => pt(u, h, o)).map(R), k)
  const line = (a, b, k) => { const [x0, y0] = pt(...a), [x1, y1] = pt(...b); c.line(R(x0), R(y0), R(x1), R(y1), k) }
  const S = (o) => s * o                                                   // across, toward the side we see
  const body = lit ? ramp[2] : ramp[1], high = lit ? ramp[3] : ramp[2], low = lit ? ramp[1] : ramp[0]
  const side = (pts, k, out = 0) => fill(pts.map(([u, h]) => [u, h, S(0.95 + out)]), k)
  // the side: its outline, the paint, the lower band in shade, the sill
  side(BODY_SIDE, "0")
  side([[0.03, 0.22], [0.03, 0.7], [0.4, 0.75], [1.25, 0.77], [1.6, 0.75], [2.9, 0.69], [3.7, 0.61], [4.17, 0.52], [4.21, 0.37], [4.17, 0.22]], body)
  side([[0.03, 0.22], [0.03, 0.36], [4.2, 0.36], [4.17, 0.22]], low)
  const sl = (a, b, k) => line([a[0], a[1], S(0.95)], [b[0], b[1], S(0.95)], k)
  sl([0.05, 0.21], [4.15, 0.21], "0")
  // the shoulder line in the light, the strakes over the intake, the door's seams and handle
  sl([0.08, 0.72], [1.25, 0.75], high); sl([1.6, 0.73], [2.9, 0.67], high)
  for (let k = 0; k < 5; k++) { const h = 0.44 + k * 0.055; sl([1.0, h], [2.55, h - 0.01], ramp[0]); sl([1.0, h + 0.022], [2.55, h + 0.012], high) }
  sl([1.45, 0.24], [1.45, 0.77], ramp[0]); sl([3.05, 0.24], [3.05, 0.71], ramp[0]); sl([1.55, 0.69], [1.7, 0.69], "0")
  // the top of the body: the shoulder over the side, the engine cover over the tail with its louvres
  fill([[0.1, 0.74, S(0.95)], [1.25, 0.78, S(0.95)], [2.9, 0.7, S(0.95)], [3.7, 0.62, S(0.95)], [3.7, 0.66, S(0.7)], [2.9, 0.79, S(0.71)], [1.25, 0.83, S(0.73)], [0.1, 0.8, S(0.75)]], high)
  fill([[0, 0.74, -0.95], [0, 0.74, 0.95], [1.1, 0.8, 0.95], [1.1, 0.8, -0.95]], ramp[2])
  for (let k = 1; k < 6; k++) line([0.1 + k * 0.16, 0.755 + k * 0.008, -0.6], [0.1 + k * 0.16, 0.755 + k * 0.008, 0.6], ramp[1])
  // the glasshouse: its side set in, the glass with the sky in it, the roof's edge; its back window
  const cab = (pts, k) => fill(pts.map(([u, h]) => [u, h, S(0.71)]), k)
  cab([[1.05, 0.81], [1.55, 1.13], [2.75, 1.14], [3.3, 0.8]], "0")
  cab([[1.18, 0.83], [1.6, 1.1], [2.72, 1.11], [3.18, 0.82]], "z")
  line([1.55, 1.13, S(0.71)], [2.75, 1.14, S(0.71)], high)
  line([1.5, 0.9, S(0.71)], [1.9, 1.08, S(0.71)], "c"); line([1.9, 0.86, S(0.71)], [2.2, 1.0, S(0.71)], "C")
  fill([[1.08, 0.8, -0.71], [1.08, 0.8, 0.71], [1.55, 1.13, 0.67], [1.55, 1.13, -0.67]], "0")
  fill([[1.12, 0.82, -0.64], [1.12, 0.82, 0.64], [1.5, 1.1, 0.6], [1.5, 1.1, -0.6]], "z")
  line([1.15, 0.86, -0.5], [1.45, 1.06, -0.2], "C")
  // the wheels on the side we see: arch, tyre, the rim and its five spokes, the hub
  for (const wu of WHEELS) {
    const ring = (rr, n = 20) => Array.from({ length: n }, (_, i) => { const t = (TAU * i) / n; return [wu + rr * Math.cos(t), 0.32 + rr * Math.sin(t), S(0.96)] })
    fill(ring(0.37), "0"); fill(ring(0.3), "-"); fill(ring(0.2), "W"); fill(ring(0.16), "^")
    for (let k = 0; k < 5; k++) { const t = (TAU * k) / 5 + z * 2; line([wu + 0.04 * Math.cos(t), 0.32 + 0.04 * Math.sin(t), S(0.97)], [wu + 0.18 * Math.cos(t), 0.32 + 0.18 * Math.sin(t), S(0.97)], "w") }
    fill(ring(0.05, 8), "~")
  }
  // the mirror out from the door's front corner; the side marker lights
  fill([[3.0, 0.8, S(0.95)], [3.0, 0.8, S(1.09)], [2.86, 0.8, S(1.09)], [2.86, 0.88, S(1.05)]], "0")
  line([3.0, 0.8, S(1.09)], [2.86, 0.88, S(1.05)], high)
  { const [a, b] = pt(0.1, 0.55, S(0.96)), [d, e] = pt(4.1, 0.45, S(0.96)); c.px(R(a), R(b), "!"); c.px(R(d), R(e), ")") }
  // the back, in shade: the panel, the black band of the tail lights lit, the plate, the diffuser and
  // its fins, the twin pipes; the rear tyres under it
  const back = (pts, k) => fill(pts.map(([o, h]) => [0, h, o]), k)
  back([[-0.95, 0.18], [-0.95, 0.75], [0.95, 0.75], [0.95, 0.18]], "0")
  back([[-0.92, 0.21], [-0.92, 0.72], [0.92, 0.72], [0.92, 0.21]], ramp[2])
  back([[-0.92, 0.21], [-0.92, 0.33], [0.92, 0.33], [0.92, 0.21]], ramp[1])
  line([-0.9, 0.715, 0], [0.9, 0.715, 0], ramp[3])
  back([[-0.88, 0.47], [-0.88, 0.62], [0.88, 0.62], [0.88, 0.47]], "0")
  // the lights: two round ones each side, red round a core lit to white; a red strip between
  const lamp = (o, rr, k) => fill(Array.from({ length: 14 }, (_, i) => { const t = (TAU * i) / 14; return [0, 0.545 + rr * Math.sin(t), o + rr * Math.cos(t)] }), k)
  for (const o of [-0.77, -0.58, 0.58, 0.77]) { lamp(o, 0.068, "("); lamp(o, 0.045, "!"); lamp(o, 0.02, "@") }
  back([[-0.45, 0.535], [-0.45, 0.555], [0.45, 0.555], [0.45, 0.535]], "&")
  back([[-0.2, 0.3], [-0.2, 0.41], [0.2, 0.41], [0.2, 0.3]], "0"); back([[-0.18, 0.32], [-0.18, 0.39], [0.18, 0.39], [0.18, 0.32]], "w")
  for (const o of [-0.12, -0.04, 0.04, 0.12]) line([0, 0.345, o], [0, 0.365, o], "0")
  back([[-0.92, 0.18], [-0.92, 0.27], [0.92, 0.27], [0.92, 0.18]], "0")
  for (const o of [-0.6, -0.3, 0.3, 0.6]) line([0, 0.19, o], [0, 0.26, o], "-")
  for (const sd of [-1, 1]) { const ring = (rr) => Array.from({ length: 12 }, (_, i) => { const t = (TAU * i) / 12; return [0, 0.25 + rr * Math.sin(t), sd * 0.35 + rr * Math.cos(t)] }); fill(ring(0.055), "0"); fill(ring(0.035), "~") }
  for (const sd of [-1, 1]) back([[sd * 0.95, 0], [sd * 0.95, 0.19], [sd * 0.7, 0.19], [sd * 0.7, 0]], "0")
  // the wing over the tail on its end plates
  for (const sd of [-1, 1]) fill([[0.12, 0.76, sd * 0.85], [0.12, 0.93, sd * 0.85], [0.35, 0.93, sd * 0.85], [0.35, 0.78, sd * 0.85]], "0")
  fill([[0.08, 0.93, -0.92], [0.08, 0.93, 0.92], [0.4, 0.96, 0.92], [0.4, 0.96, -0.92]], "0")
  fill([[0.1, 0.94, -0.9], [0.1, 0.94, 0.9], [0.38, 0.955, 0.9], [0.38, 0.955, -0.9]], high)
  // the blue one's white stripes, down its middle over the tail
  if (r.color === "b") for (const o of [-0.16, 0.08]) {
    fill([[0, 0.745, o], [0, 0.745, o + 0.08], [1.1, 0.805, o + 0.08], [1.1, 0.805, o]], "w")
    back([[o, 0.62], [o, 0.72], [o + 0.08, 0.72], [o + 0.08, 0.62]], "W")
  }
}
// the red one backfires as we come up on it: a short burst of flame from each pipe
function backfire(c, sx, sy, w, r, f) {
  const t = f - 76
  if (r.color !== "r" || t < 0 || t >= 6) return
  for (const side of [-1, 1]) c.flame(Math.round(sx + side * 0.15 * w), Math.round(sy - 0.19 * 0.56 * w), Math.max(3, 0.3 * w), "98767", { seed: 4 + side, frame: t, wind: 0 })
}

// ---------------------------------------------------------------- the view through the glass
const SUN = (f) => { const [sx, sz] = sunDir(f); return { from: [sx, sz], up: SUN_UP + 6 } }
const SHADE = { a: "q", A: "q", q: "Q", w: "W", y: "Y", t: "Y", v: "x", V: "x", W: "q" }
function view(c, f) {
  c.stamp("_sky", 0, 0)
  c.clouds({ y: 26, gap: 70, w: 54, h: 10, n: 5, seed: 11, keys: "Cce", empty: [2], x: -Math.round(P.focal * heading(f)) })
  sun(c, f)
  far(c, f)
  c.plane(P, ground(f))
  // the forest along the right: a dark body under a row of round crowns (drawn with the rest below)
  const wall = []
  for (let d = 240; d >= 4; d -= 4) { const p = (travelled(f) + d) % LOOP_M; wall.push([cx(FOREST, d, f), d, 7 + 4 * hash(Math.floor(p / 8), 2)]) }
  for (let i = 0; i + 1 < wall.length; i++) {
    const [x0, d0, h0] = wall[i], [x1, d1, h1] = wall[i + 1]
    c.poly([...at(x0, d0, 0), ...at(x0, d0, h0), ...at(x1, d1, h1), ...at(x1, d1, 0)], "F")
  }
  // the guardrail on the left: two lines along the posts, a post every 4 m
  for (let d = 200; d >= 4; d -= 4) {
    const p = d - (travelled(f) % 4)
    if (p < 3) continue
    const [ax, ay] = at(cx(RAIL_U, p, f), p, 0.8), [bx, by] = at(cx(RAIL_U, p + 4, f), p + 4, 0.8), [px0, py0] = at(cx(RAIL_U, p, f), p, 0)
    const [ax2, ay2] = at(cx(RAIL_U, p, f), p, 0.5), [bx2, by2] = at(cx(RAIL_U, p + 4, f), p + 4, 0.5)
    c.poly([ax, ay, bx, by, bx2, by2, ax2, ay2], "R"); c.line(ax, ay, bx, by, "r"); c.line(px0, py0, ax, ay, "p")
  }
  // shadows of everything, long toward us with the sun so low; then the things, far to near
  const crowns = []
  for (let p = Math.ceil(travelled(f) / 5) * 5; p < travelled(f) + 240; p += 5) {
    const d = p - travelled(f), pm = p % LOOP_M, r = 2.2 + 1.2 * hash(Math.floor(pm / 5), 4)
    if (d > 3) crowns.push(solid.blob([cx(FOREST + 0.5, d, f), d, 7 + 4 * hash(Math.floor(pm / 8), 2)], r, r * 0.8, hash(Math.floor(pm / 5), 5) < 0.5 ? "f" : "F", { noShadow: true }))
  }
  const things = [...crowns, ...PALMS.flatMap((it) => palm(c, it, f)), ...POLES.flatMap((it) => pole(it, f)), ...CHEVRONS.flatMap((it) => chevron(it, f)), ...sign(f)]
  // a rival nearer than 4 m is beside us, behind the pillar and the door
  const cars = RIVALS.map((r) => ({ r, z: rivalZ(r, f) })).filter((o) => o.z > 4 && o.z < 200)
  const carParts = cars.flatMap(({ r, z }) => carShapes(cx(r.lane, z, f), z, r.keys))
  c.shadows(P, [...things, ...carParts], { sun: SUN(f), shade: SHADE })
  c.solids(P, things, { sun: SUN(f) })
  // the crowns' rims toward the road and the low sun
  for (const q of crowns) {
    const [ex, ey] = P.ground(q.e[0], q.e[1], q.e[2]), sc = P.scale(q.e[1], q.e[0]), rx = q.rx * sc, ry = q.ry * sc
    if (rx < 2 || rx > 22) continue
    for (let a = 1.75; a < 3.0; a += 0.6 / rx) c.px(Math.round(ex + Math.cos(a) * rx * 0.94), Math.round(ey - Math.sin(a) * ry * 0.94), "H")
  }
  for (const it of CHEVRONS) chevronArrow(c, it, f)
  signWords(c, f)
  for (const { r, z } of cars.sort((a, b) => b.z - a.z)) rival(c, r, z, f)
}

// ---------------------------------------------------------------- the rear-view mirror
// What's behind, flipped: dusk on that side of the sky, the road running back to its own vanishing
// point, the rivals we passed falling away with their headlights on.
const MW = 62, MH = 12
const PM = perspective({ w: MW, horizon: 5, eye: EYE, fov: 48 })
anim("_mirror", { w: MW, h: MH, frames: FRAMES, fps: FPS }, rect(0, 0, MW, 3, "2"), rect(0, 3, MW, 3, "3"),
  (c) => {
    const f = c.frame, k = kappa(f), ox = ourX(f)
    // behind, the bend goes the other way; in the mirror left stays left
    const mu = (x, z) => x + ox + (k * z * z) / 2
    c.plane(PM, (x, z) => {
      const u = mu(x, z)
      if (u < RAIL_U) return u < BEACH ? "S" : "x"
      if (u > SHOULDER) return "v"
      if (Math.abs(Math.abs(u) - 0.12) < Math.max(0.06, z / PM.focal)) return "y"
      if (Math.abs(Math.abs(u) - EDGE) < Math.max(0.07, z / PM.focal)) return "W"
      return "a"
    })
    for (const r of RIVALS) {
      const z = -rivalZ(r, f) - 4.4
      if (z < 1 || z > 60) continue
      const x = r.lane - ourX(f) - (k * z * z) / 2, sc = PM.scale(z), [px, py] = PM.ground(x, z, 0).map(Math.round)
      const lw = Math.max(1, Math.round(0.55 * sc)), [gx, gy] = PM.ground(x, z - 2.5, 0).map(Math.round)
      if (sc > 2.5) for (const sd of [-1, 1]) c.ellipse(gx + sd * lw, gy, Math.max(1, Math.round(sc * 0.35)), Math.max(1, Math.round(sc * 0.12)), "A")
      c.stamp(`_rf_${r.color}_*`, px, py + 1, { fit: Math.max(3, Math.round(1.07 * sc)) })
    }
  })

include("cockpit.px.js")

// ---------------------------------------------------------------- the driver
// The wheel, small as a racing car's, turns with the bend and with every change of lane; the hands
// go round with it at ten to two, gripping as drivers do: the back of the glove up and toward us, the palm down on
// the rim, the fingers curled forward over it, the thumbs pointing in. The forearms come up from the
// corners in the blue suit with its white stripes, a knit cuff at each wrist. The gauges' needles:
// the revs flutter, the speed holds about 200 km/h; the ribbons from the mirror swing against the turn.
//
// The hand is a puppet: a skeleton of joints in the hand's own frame, read off photographs of a
// left hand gripping, taken from its owner's eyes as the driver sees his, then set on the rim every
// frame so that the line the rim takes under the palm lies on the rim, turning with it. Seen so, the
// back of the glove is toward us and covers the rim; the rim goes under the palm on a slant, from the
// outer edge of the hand a third of the way down its back to between the index finger and the
// thumb; the fingers go up from the knuckles and curl forward over it; the thumb comes up from below
// and holds it from underneath. The right hand is the mirror image. Each part is painted at its
// joints: the back of the hand a plate, the fingers and the thumb round (capsule), the forearm round
// with its stripes, the knit cuff ribbed along the arm.
// In px, x across the knuckles toward the index, y up the back of the hand, the left hand.
const HAND = {
  a: Math.PI * 0.8, size: 0.85,                                                // where on the rim; how big
  rim: [[-13, -3.9], [17.2, 2.4]],                                              // the rim's line under the palm
  back: [[-12.5, 0.5], [-8.4, 1.8], [-3.8, 3], [2.5, 3.6], [8.4, 2.4], [11.5, 1], [14.5, -14], [4.2, -25.4], [-12.6, -14]],
  knuckle: [[-8.4, 0.2], [-3.8, 1.5], [2.5, 2.3], [8.4, 1]],                    // pinky to index
  bend: [[-8, 4.6], [-1.3, 9], [5.5, 12.4], [13.6, 10.7]],                      // the middle joints, curled over
  tip: [[-5.9, 4.2], [0.8, 6.8], [8.8, 10], [17.4, 7.6]],                       // as far as the fingers show
  thumb: [[13.4, -15], [17.6, -10.7], [16.6, -7.8]],
  tendons: [[[-6, -1], [-6.5, -9]], [[-0.5, 0], [-1.5, -11]], [[5.5, -0.5], [2.5, -13]]],
  wrist: [-4.2, -19.7],
}
// the hand's frame on the rim at its angle: a function from the frame to the picture
function handOn(side, turn) {
  const a = (side > 0 ? HAND.a : Math.PI - HAND.a) - turn
  const [gx, gy] = rimMid(a), [x1, y1] = rimMid(a - 0.01 * side), [x0, y0] = rimMid(a + 0.01 * side)
  const mir = ([x, y]) => [x * side, y], [L, Q] = HAND.rim.map(mir)
  const th = Math.atan2(y0 - y1, x1 - x0) - Math.atan2(Q[1] - L[1], Q[0] - L[0]), co = Math.cos(th), si = Math.sin(th)
  const mx = (L[0] + Q[0]) / 2, my = (L[1] + Q[1]) / 2
  const k = HAND.size
  return (p) => { const [x, y] = mir(p), dx = (x - mx) * k, dy = (y - my) * k; return [gx + dx * co - dy * si, gy - (dx * si + dy * co)] }
}
const GLOVE = "=]}}'"
const steer = (f) => {
  const s = (f / FRAMES) * SECONDS, h = 0.02
  const lat = (ourX(((s + h) / SECONDS) * FRAMES) - 2 * ourX(f) + ourX(((s - h) / SECONDS) * FRAMES)) / (h * h)
  return (kappa(f) * 90 + lat * 0.05) * 0.45
}
function wheel(c, f) {
  const turn = steer(f), R = Math.round
  // the wheel in 3D, lit as the cockpit is, its stitching and badge over it
  render3d(c, wheelFaces(turn), WHEEL_MATS); wheelDetails(c, turn)
  // the arms: each forearm from its corner up to the wrist, then the hand on the rim (all its parts
  // outlined first and filled after, so they read as one glove, a crease between the fingers), then
  // the knit cuff over the join
  for (const side of [1, -1]) {
    const S = handOn(side, turn), wrist = S(HAND.wrist), elbow = side > 0 ? [44, 214] : [276, 214]
    forearm(c, elbow, wrist, side)
    const bones = []
    for (let i = 0; i < 4; i++) {
      const r = i === 0 ? 1.8 : 2.2
      bones.push([S(HAND.knuckle[i]), S(HAND.bend[i]), r, r], [S(HAND.bend[i]), S(HAND.tip[i]), r, r - 0.3])
    }
    bones.push([S(HAND.thumb[0]), S(HAND.thumb[1]), 2.6, 2.3], [S(HAND.thumb[1]), S(HAND.thumb[2]), 2.3, 2])
    for (const [[x0, y0], [x1, y1], r0, r1] of bones) c.capsule(x0, y0, r0 + 1, x1, y1, r1 + 1, "0")
    c.poly(HAND.back.map(S).flat().map(R), "0")
    c.plate(() => c.poly(HAND.back.map(S).flat().map(R), "]"), { light: [-0.5, -1], reach: 3, ramps: [GLOVE] })
    for (const [[x0, y0], [x1, y1], r0, r1] of bones) c.capsule(x0, y0, r0, x1, y1, r1, GLOVE, { light: [-0.5, -1] })
    for (let i = 0; i < 3; i++) {
      const m = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], [x0, y0] = S(m(HAND.knuckle[i], HAND.knuckle[i + 1])), [x1, y1] = S(m(HAND.bend[i], HAND.bend[i + 1]))
      c.line(R(x0), R(y0), R(x1), R(y1), "-")
    }
    for (const [p, q] of HAND.tendons) { const [x0, y0] = S(p), [x1, y1] = S(q); c.line(R(x0), R(y0), R(x1), R(y1), "=") }
    cuff(c, elbow, wrist, side)
  }
}
// The sleeve of a track jacket, shaded as cloth in flat facets, after a pixel-art cockpit whose
// driver wears one: in the arm's own frame (t back from the wrist along the arm, o across it, -h its
// outer edge, +h the inner), its surface is a tube with a V-shaped trough along each fold, steep on
// one wall and shallow on the other, deepest at the edge the fold starts from and dying away across.
// Every pixel is lit by the slope there (the sun from the upper left and a little in front) and
// takes one of three tones, so the cloth breaks into the facets of a crumpled sleeve: zigzag folds
// where it bunches at the cuff, long spiralling ones down the forearm, none repeating the last one's
// direction or size. The folds pinch the outline where they reach it; a seam runs along the inside,
// and the two white stripes along the outside zigzag with the cloth. The sleeve starts behind the
// cuff; its mouth, bunched, is painted over the cuff after.
// each fold: where along the arm, its slant, the stretch of the width it runs, how deep
const FOLDS = [[7, 1, 0.1, 1, 2.2], [11, -0.9, -1, -0.2, 2.4], [15, 1.1, -0.1, 1, 2], [24, 0.9, -0.7, 1, 3],
  [38, -1.2, -1, 0.3, 3.2], [52, 1.3, -0.5, 1, 3], [69, -1, -1, 0, 3.4], [86, 1.1, -0.3, 1, 3]]
const SUIT = "$<>/U"                                                     // deep shade, shade, cloth, lit, sheen
function cloth(t, o, h) {
  let z = h * Math.sqrt(Math.max(0, 1 - (o / h) ** 2)), pinch = 0, sway = 0
  for (const [tf, sl, f0, f1, depth] of FOLDS) {
    const u = o / h, from = f1 >= 1 ? 1 : -1, reach = Math.max(0, Math.min(1, 1 - ((u - from) * -from) / (f1 - f0)))
    if (reach <= 0) continue
    const d = t - (tf + sl * o + 0.03 * o * o), v = 1.5 * depth * reach * Math.max(0, d < 0 ? 1 + d / 1.6 : 1 - d / 4.5)
    z -= v; sway += v * Math.sign(sl) * 0.45
    if (Math.abs(u) > 0.75 && Math.sign(u) === from) pinch = Math.max(pinch, v * 0.5)
  }
  return { z, pinch, sway }
}
function forearm(c, [ex, ey], [wx, wy], side, from = 5, to = Infinity) {
  const dx = wx - ex, dy = wy - ey, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, nx = -uy, ny = ux
  // the light in the arm's frame: along it, across it, out of the picture
  const lt = 0.45 * ux + 0.89 * uy, lo = (-0.45 * nx - 0.89 * ny) * side, lz = 0.8, ll = Math.hypot(lt, lo, lz)
  const x0 = Math.max(0, Math.floor(Math.min(ex, wx) - 24)), x1 = Math.min(W - 1, Math.ceil(Math.max(ex, wx) + 24))
  const y0 = Math.max(0, Math.floor(Math.min(ey, wy) - 24)), y1 = Math.min(H - 1, Math.ceil(Math.max(ey, wy) + 24))
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const t = -((x + 0.5 - wx) * ux + (y + 0.5 - wy) * uy), o = ((x + 0.5 - wx) * nx + (y + 0.5 - wy) * ny) * side
    if (t < from || t > Math.min(L, to)) continue
    // the mouth of the sleeve, bunched over the cuff: wider, its rim rounded
    const mouth = Math.max(0, 1 - (t - from) / 4), h = 8.5 + t * 0.08 + mouth * 1.6
    const rim = from + 1.2 * (o / h) ** 2
    if (t < rim) continue
    const here = cloth(t, o, h), edge = h - here.pinch
    if (Math.abs(o) > edge) continue
    const oc = (v) => Math.max(-h, Math.min(h, v))
    const zt = (cloth(t + 0.7, o, h).z - cloth(t - 0.7, o, h).z) / 1.4, zo = (cloth(t, oc(o + 0.7), h).z - cloth(t, oc(o - 0.7), h).z) / 1.4
    const lit = (-zt * lt - zo * lo + lz) / Math.hypot(zt, zo, 1) / ll
    let k = lit < 0.3 ? 1 : lit < 0.72 ? 2 : 3
    if (lit < 0.05) k = 0
    if (Math.abs(o - h * 0.22) < 0.5) k = Math.max(0, k - 1)                // the seam
    let key = SUIT[k]
    for (const st of [-0.34, -0.66]) if (Math.abs(o - h * st - here.sway) < 0.95) key = k <= 1 ? "W" : "w"
    c.px(x, y, Math.abs(o) > edge - 1 || t < rim + 0.8 ? "0" : t < rim + 1.8 && o < 0 && k >= 2 ? "U" : key)
  }
}
// the knit cuff over the wrist, where the glove goes into the sleeve: a band wider than the arm, its
// edge toward the hand curved round the wrist and catching the light, ribbed along the arm
function cuff(c, [ex, ey], [wx, wy], side) {
  const R = Math.round, dx = wx - ex, dy = wy - ey, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, nx = -uy, ny = ux
  for (let y = R(wy) - 16; y <= R(wy) + 16; y++) for (let x = R(wx) - 16; x <= R(wx) + 16; x++) {
    const t = -((x + 0.5 - wx) * ux + (y + 0.5 - wy) * uy), o = ((x + 0.5 - wx) * nx + (y + 0.5 - wy) * ny) * side, hc = 10, q = (o / hc) ** 2
    const front = -3 + 1.6 * q, back = 8
    if (Math.abs(o) > hc || t < front || t > back) continue
    const lit = -o / hc, rib = Math.floor((o + 30) / 1.5) % 2
    let key = lit < -0.5 ? "=" : lit > 0.3 ? "^" : "~"
    if (rib) key = key === "^" ? "~" : key === "~" ? "=" : "-"
    if (t < front + 1.2 && lit > -0.3) key = "^"
    if (Math.abs(o) > hc - 1 || t < front + 0.6) key = "0"
    c.px(x, y, key)
  }
  forearm(c, [ex, ey], [wx, wy], side, 5, 9)
}
function needles(c, f) {
  const rev = 0.72 + 0.04 * Math.sin((TAU * f * 52) / FRAMES) + 0.06 * Math.sin((TAU * f * 3) / FRAMES), kmh = 200 + 4 * Math.sin((TAU * f) / FRAMES * 2)
  for (const g of GAUGES) {
    const v = g.kind === "revs" ? rev : g.kind === "speed" ? kmh / 280 : 0.62, a = Math.PI * (1.25 - 1.5 * v), R = Math.round
    c.line(R(g.x), R(g.y), R(g.x + Math.cos(a) * g.rp * 0.82), R(g.y - Math.sin(a) * g.rp * 0.82), "["); c.px(R(g.x), R(g.y), "~")
  }
}
// the ribbons tied to the mirror: they hang and swing against the turn
function ribbons(c, f) {
  const lean = Math.max(-1, Math.min(1, -steer(f) * 1.6)) + 0.08 * Math.sin((TAU * f * 28) / FRAMES)
  ;["X", "y", "(", "U", "w", ":"].forEach((k, i) => {
    const x0 = 152 + i * 3, len = 12 + (i % 3) * 3
    for (let j = 0; j < len; j++) c.px(Math.round(x0 + lean * j * j * 0.035 + Math.sin((TAU * f * 18) / FRAMES + i + j * 0.4) * 0.5), 19 + j, k)
  })
  c.hline(150, 19, 20, "0")
}

anim("race", { w: W, h: H, frames: FRAMES, fps: FPS },
  (c) => view(c, c.frame),
  stamp("_mirror", 129, 6),
  stamp("_cockpit", 0, 0),
  (c) => { ribbons(c, c.frame); needles(c, c.frame); wheel(c, c.frame) })
