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
const VIEW = { w: W, horizon: HORIZON, eye: EYE, fov: 76 }, P = perspective(VIEW)          // the sun, the far things
// the road's bend, and our heading: a right-hander, then a left-hander
const BEND = 0.0022
const kappa = (f) => BEND * Math.sin((TAU * f) / FRAMES)
const heading = (f) => ((BEND * SPEED * SECONDS) / TAU) * (1 - Math.cos((TAU * f) / FRAMES))
// our speed over the loop: steady in fifth; at 2.2 s the right hand goes down to the gear lever and
// drops to fourth (the revs jump), and from 3.4 s we pull away, 60% faster by 4.4 s; at
// 5 s the hand goes down again, back up to fifth (the revs fall), and from 5.6 s we ease off, back to
// the steady speed by 7.2 s. Each ramp is half a cosine; the steady speed is set so the loop still
// covers LOOP_M (about 180 km/h steady, 285 at the height).
const BOOST = { a: 3.4, b: 4.4, c: 5.6, d: 7.2, up: 0.6 }
const ease = (t) => 0.5 - 0.5 * Math.cos(Math.PI * Math.max(0, Math.min(1, t)))
const eased = (t) => (t <= 0 ? 0 : t >= 1 ? t - 0.5 : t / 2 - Math.sin(Math.PI * t) / (2 * Math.PI))   // ease's integral from 0 to t
const boostAt = (s) => ease((s - BOOST.a) / (BOOST.b - BOOST.a)) - ease((s - BOOST.c) / (BOOST.d - BOOST.c))
const boostSum = (s) => (BOOST.b - BOOST.a) * eased((s - BOOST.a) / (BOOST.b - BOOST.a)) - (BOOST.d - BOOST.c) * eased((s - BOOST.c) / (BOOST.d - BOOST.c))
const V0 = LOOP_M / (SECONDS + BOOST.up * boostSum(SECONDS))
const speedAt = (f) => V0 * (1 + BOOST.up * boostAt((f / FRAMES) * SECONDS))
const travelled = (f) => { const s = (f / FRAMES) * SECONDS; return V0 * (s + BOOST.up * boostSum(s)) }
// the gear changes: the hand leaves the wheel at each SHIFTS time, is at the lever 0.3 s later, moves it
// from 0.4 s to 0.6 s, lets go at 0.75 s and is back on the wheel at 1.05 s; GEAR is 1 in fourth
const SHIFTS = [2.2, 5.0]
const reachAt = (s) => Math.max(...SHIFTS.map((s0) => { const t = s - s0; return t < 0.3 ? ease(t / 0.3) : 1 - ease((t - 0.75) / 0.3) }))
const gearAt = (s) => ease((s - SHIFTS[0] - 0.4) / 0.2) - ease((s - SHIFTS[1] - 0.4) / 0.2)
// our lane: the left one (-1.75) while passing the rivals in the right lane, the right one while
// passing the one in the left lane; smooth changes between
const LANE = 1.75
const ourX = (f) => { const s = (f / FRAMES) * SECONDS; return -LANE + 2 * LANE * (ease((s - 3) / 1.5) - ease((s - 7.5) / 1.5)) }
// the camera along the road at a frame, bent with it (a point d ahead sits kappa·d²/2 to the side),
// and a place across the road from our lane
let wayAt = -1, wayCam = null
const way = (f) => (f === wayAt ? wayCam : ((wayAt = f), (wayCam = perspective({ ...VIEW, bend: kappa(f) }))))
const cx = (u, f) => u - ourX(f)

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
  return (x, z, px) => {
    const u = x + ox, along = (z + s) % LOOP_M, wide = Math.max(0.07, (z / P.focal) * 0.8)
    const col = px + 0.5, far = z > 90
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
    if (u > SHOULDER) {
      // the verge: grass in clumps of two greens, the forest's shade along its foot; near us its blades
      // (a dark stroke, a tip warm in the sun) and a few flowers
      const clumpy = hash(Math.floor(u * 1.4), Math.floor(along * 1.1)), fine = hash(Math.floor(u * 9), Math.floor(along * 7))
      if (u > FOREST - 1.3) return clumpy < 0.6 ? "x" : "F"
      if (z < 28 && fine < 0.012) return ":"
      if (z < 28 && fine > 0.99) return "y"
      if (z < 18 && fine < 0.13) return "x"
      if (z < 18 && fine > 0.9) return "H"
      return (Math.floor(along / 16) % 2 ? clumpy > 0.35 : clumpy > 0.65) ? "V" : "v"
    }
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
// a palm: where its foot and top are on the road's ground, and how big it is there (null when out of
// the picture); drawn by hand after the things in meters, far to near
function palmAt(it, f) {
  const P = way(f)
  const d = along(it.p, f)
  if (d < 2 || d > 260) return null
  const bx = cx(it.u, f), sc = P.scale(d, bx)
  return { d, base: P.ground(bx, d, 0), top: P.ground(bx + it.lean, d, it.tall), sc, seed: it.seed }
}
function pole(it, f) {
  const P = way(f)
  const d = along(it.p, f)
  if (d < 2 || d > 260) return []
  const x = cx(it.u, f), arm = cx(it.u - 2.2, f), { stick, box } = solid
  const g = { ghost: true }
  return [stick([x, d, 0], [x, d, 9], 0.09, "n", g), stick([x, d, 9], [arm, d, 9.3], 0.06, "n", g), box([arm - 0.4, d - 0.15, arm + 0.1, d + 0.15, 9.0, 9.25], { top: "n", lit: "l", shade: "l", under: "l" }, g)]
}
function chevron(it, f) {
  const P = way(f)
  const d = along(it.p, f)
  if (d < 2 || d > 200) return []
  // on the outside of the bend
  const side = kappa(f) >= 0 ? -1 : 1, x = cx(side * 5.2, f), { stick, box } = solid
  const g = { ghost: true }
  return [stick([x, d, 0], [x, d, 1.2], 0.04, "p", g), box([x - 0.35, d, x + 0.35, d + 0.05, 1.2, 1.75], { lit: "Z", shade: "Z", top: "k" }, g)]
}
function sign(f) {
  const P = way(f)
  const d = along(SIGN.p, f)
  if (d < 2 || d > 240) return []
  const x = cx(SIGN.u, f), { stick, box } = solid
  const g = { ghost: true }
  return [stick([x - 1.2, d, 0], [x - 1.2, d, 2.2], 0.05, "n", g), stick([x + 1.2, d, 0], [x + 1.2, d, 2.2], 0.05, "n", g), box([x - 1.6, d, x + 1.6, d + 0.08, 2.2, 3.8], { lit: "E", shade: "E", top: "E" }, g)]
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
const RIVAL_V = (LOOP_M - 240) / SECONDS                               // 36 m/s: they fall 240 m behind a loop
const rivalZ = (r, f) => { const t = (f / FRAMES) * SECONDS, z = (SPEED - RIVAL_V) * r.pass - (travelled(f) - RIVAL_V * t); return ((((z + 40) % 240) + 240) % 240) - 40 }
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
  const P = way(f)
  const x = cx(r.lane, f), sc = P.scale(z + 0.2, x), [sx, sy] = P.ground(x, z + 0.2).map(Math.round), w = 1.9 * sc
  const [name, dw, dh] = RV.reduce((a, b) => (Math.abs(b[2] - 1.07 * sc) < Math.abs(a[2] - 1.07 * sc) ? b : a))
  c.ellipse(sx, sy, Math.round(w * 0.56), Math.max(1, Math.round(w * 0.05)), "Q")
  const bob = sc > 18 && (f + r.pass * 5) % 8 < 2 ? 1 : 0
  if (sc > 13 && Math.abs(cx(r.lane, f)) > 1.3) carInPerspective(c, r, z, f, bob)
  else c.stamp(`_rv_${r.color}_${name}`, sx, sy + 1 - bob)
  backfire(c, sx, sy, w, r, f)
}
// A rival near and off to a side is drawn whole in perspective: the side it shows us, the top of its
// tail, its back, each in meters along the car (u from the tail), up from the road (h) and across it
// (o, the left side at -0.95), put where the camera puts them, so the car runs off toward the vanishing
// point as a car does when it draws level. A low wedge: the haunch high over the rear wheel, the
// glasshouse set back and in from the sides, the strakes over the side intake, the wheels with their
// five-spoke rims, the door's seams and handle, the mirror; on the tail the louvred engine cover, the
// rear window, the wing on its posts and end plates, and its back, curved (see BACK): lit over its
// top, a tone down under the tail lights' black band, its corners turning away, the bumper standing
// out, the plate, the twin pipes and the diffuser, the tyres under it; edged where it meets the side
// in the paint's darkest, not in black. The side toward the low sun (a car's left) is lit, the other
// in shade, the back in its paint as the drawing from behind has it, the tops take the sky; it follows the road's bend. Far off or straight ahead, the drawing
// from behind stands in for it.
const PAINT = { y: ["D", "j", "J", "g"], r: [",", "&", "K", ";"], b: ["$", "u", "U", "|"] }
const BODY_SIDE = [[0.1, 0.2], [0.01, 0.38], [0, 0.5], [0.04, 0.66], [0.1, 0.76], [0.4, 0.78], [1.25, 0.79], [1.6, 0.77], [2.9, 0.71], [3.7, 0.63], [4.2, 0.53], [4.25, 0.36], [4.2, 0.2]]
const WHEELS = [0.85, 3.55]
// The back's outer edge, across (o) and up (h), after the drawings from behind and the games' cars seen
// from behind: from the diffuser's edge round the bumper's corner, out to the haunch at its widest by
// the lights, in to the chamfered top corner and along the deck; and how far its face leans in from the
// tail at each height, tucked under at the bottom and leaning forward over the top, so it isn't a
// slab: its bands of light come from that curve.
const BACK = [[0.74, 0.2], [0.88, 0.25], [0.94, 0.35], [0.97, 0.5], [0.95, 0.64], [0.88, 0.73], [0.74, 0.775], [0, 0.785]]
const backW = (h) => { for (let i = 1; i < BACK.length; i++) if (h <= BACK[i][1]) { const [o0, h0] = BACK[i - 1], [o1, h1] = BACK[i]; return o0 + ((o1 - o0) * (h - h0)) / (h1 - h0) } return 0 }
const backLean = (h) => 0.1 * ((h - 0.5) / 0.29) ** 2
function carInPerspective(c, r, z, f, bob) {
  const P = way(f)
  const xc = cx(r.lane, f), s = xc > 0 ? -1 : 1, lit = s < 0, ramp = PAINT[r.color], R = Math.round
  const pt = (u, h, o) => { const zz = z + 0.2 + u, [x, y] = P.ground(cx(r.lane + o, f), zz, h); return [x, y - bob] }
  const fill = (pts, k) => c.poly(pts.flatMap(([u, h, o]) => pt(u, h, o)).map(R), k)
  const line = (a, b, k) => { const [x0, y0] = pt(...a), [x1, y1] = pt(...b); c.line(R(x0), R(y0), R(x1), R(y1), k) }
  const S = (o) => s * o                                                   // across, toward the side we see
  const body = lit ? ramp[2] : ramp[1], high = lit ? ramp[3] : ramp[2], low = lit ? ramp[1] : ramp[0]
  const side = (pts, k, out = 0) => fill(pts.map(([u, h]) => [u, h, S(0.95 + out)]), k)
  // the side: its outline, the paint, the lower band in shade, the sill
  side(BODY_SIDE, "0")
  side([[0.12, 0.22], [0.04, 0.38], [0.03, 0.5], [0.06, 0.66], [0.12, 0.74], [0.4, 0.76], [1.25, 0.77], [1.6, 0.75], [2.9, 0.69], [3.7, 0.61], [4.17, 0.52], [4.21, 0.37], [4.17, 0.22]], body)
  side([[0.12, 0.22], [0.04, 0.36], [4.2, 0.36], [4.17, 0.22]], low)
  const sl = (a, b, k) => line([a[0], a[1], S(0.95)], [b[0], b[1], S(0.95)], k)
  sl([0.05, 0.21], [4.15, 0.21], "0")
  // the shoulder line in the light, the strakes over the intake, the door's seams and handle
  sl([0.08, 0.72], [1.25, 0.75], high); sl([1.6, 0.73], [2.9, 0.67], high)
  for (let k = 0; k < 5; k++) { const h = 0.44 + k * 0.055; sl([1.0, h], [2.55, h - 0.01], ramp[0]); sl([1.0, h + 0.022], [2.55, h + 0.012], high) }
  sl([1.45, 0.24], [1.45, 0.77], ramp[0]); sl([3.05, 0.24], [3.05, 0.71], ramp[0]); sl([1.55, 0.69], [1.7, 0.69], "0")
  // the top of the body: the shoulder over the side, the engine cover over the tail with its louvres
  fill([[0.1, 0.74, S(0.95)], [1.25, 0.78, S(0.95)], [2.9, 0.7, S(0.95)], [3.7, 0.62, S(0.95)], [3.7, 0.66, S(0.7)], [2.9, 0.79, S(0.71)], [1.25, 0.83, S(0.73)], [0.1, 0.8, S(0.75)]], high)
  fill([[0.1, 0.78, -0.76], [0.1, 0.78, 0.76], [1.1, 0.8, 0.95], [1.1, 0.8, -0.95]], ramp[2])
  for (let k = 1; k < 6; k++) line([0.1 + k * 0.16, 0.755 + k * 0.008, -0.6], [0.1 + k * 0.16, 0.755 + k * 0.008, 0.6], ramp[1])
  // the glasshouse, set in from the sides, its pillars in the paint as on the car: the side glass with
  // the sky in it, the roof's rail along its top; at its back the rear window between the buttresses
  const cab = (pts, k) => fill(pts.map(([u, h]) => [u, h, S(0.71)]), k)
  cab([[1.05, 0.8], [1.55, 1.13], [2.75, 1.14], [3.3, 0.79]], body)
  cab([[1.3, 0.84], [1.66, 1.09], [2.68, 1.1], [3.1, 0.82]], "z")
  line([1.5, 1.13, S(0.71)], [2.78, 1.14, S(0.71)], high)
  line([1.62, 0.92, S(0.71)], [1.9, 1.06, S(0.71)], "c"); line([1.95, 0.88, S(0.71)], [2.2, 1.0, S(0.71)], "C")
  fill([[1.06, 0.8, -0.72], [1.06, 0.8, 0.72], [1.55, 1.13, 0.68], [1.55, 1.13, -0.68]], ramp[2])
  fill([[1.12, 0.83, -0.56], [1.12, 0.83, 0.56], [1.5, 1.1, 0.52], [1.5, 1.1, -0.52]], "z")
  line([1.15, 0.87, -0.42], [1.42, 1.06, -0.18], "C")
  line([1.55, 1.13, -0.68], [1.55, 1.13, 0.68], high)
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
  // the rear tyres under the back: their treads toward us, grooved, the top caught by the light
  for (const sd of [-1, 1]) {
    fill([[0.2, 0, sd * 0.95], [0.2, 0.2, sd * 0.95], [0.2, 0.2, sd * 0.68], [0.2, 0, sd * 0.68]], "0")
    for (const h of [0.05, 0.1, 0.15]) line([0.2, h, sd * 0.92], [0.2, h, sd * 0.71], "-")
    line([0.2, 0.19, sd * 0.92], [0.2, 0.19, sd * 0.71], "=")
  }
  // the back, curved after BACK: a band at a time, from its outline in, each following the curve
  const band = (h0, h1, k, inset = 0, n = 12) => {
    const hs = Array.from({ length: n + 1 }, (_, i) => h0 + ((h1 - h0) * i) / n)
    fill([...hs.map((h) => [backLean(h), h, backW(h) - inset]), ...hs.reverse().map((h) => [backLean(h), h, -(backW(h) - inset)])], k)
  }
  const across = (h, k, inset = 0.03) => line([backLean(h), h, -(backW(h) - inset)], [backLean(h), h, backW(h) - inset], k)
  band(0.2, 0.785, ramp[0], -0.015)                                        // its edge in the paint's darkest, not black: it meets the side
  band(0.215, 0.77, ramp[2], 0.02)
  // the panel lit by the sky over its top, which leans back toward it; a tone down under the lights,
  // where it faces down as it tucks under, darkest at the bottom; its corners darker where they turn away
  band(0.69, 0.77, ramp[3], 0.04); across(0.765, ramp[3], 0.12)
  band(0.215, 0.456, ramp[1], 0.02)
  band(0.215, 0.255, ramp[0], 0.03)
  for (const sd of [-1, 1]) {
    const hs = Array.from({ length: 9 }, (_, i) => 0.27 + (0.42 * i) / 8)
    fill([...hs.map((h) => [backLean(h), h, sd * (backW(h) - 0.02)]), ...hs.reverse().map((h) => [backLean(h), h, sd * (backW(h) - 0.11)])], ramp[1])
  }
  // the bumper standing out a little: its top edge catching the light over a dark crease
  across(0.36, "0", 0.06); across(0.35, ramp[2], 0.07)
  // the tail lights in a black band set into the panel, wrapping round its corners: the lip over it
  // lit, under it a shade; a grille of slats between the lamps
  band(0.462, 0.628, "0", 0.04); across(0.636, ramp[3], 0.05); across(0.456, ramp[0], 0.05)
  for (const h of [0.49, 0.6]) line([0, h, -0.45], [0, h, 0.45], "-")
  const lamp = (o, rr, k) => fill(Array.from({ length: 14 }, (_, i) => { const t = (TAU * i) / 14; return [0, 0.545 + rr * Math.sin(t), o + rr * Math.cos(t)] }), k)
  for (const o of [-0.77, -0.58, 0.58, 0.77]) { lamp(o, 0.07, "("); lamp(o, 0.046, "!"); lamp(o, 0.02, "@") }
  fill([[0, 0.535, -0.45], [0, 0.535, 0.45], [0, 0.555, 0.45], [0, 0.555, -0.45]], "&")
  // the plate in its recess on the bumper, lit from over it
  fill([[0.01, 0.27, -0.21], [0.01, 0.27, 0.21], [0.01, 0.42, 0.21], [0.01, 0.42, -0.21]], "0")
  fill([[0.01, 0.29, -0.18], [0.01, 0.29, 0.18], [0.01, 0.395, 0.18], [0.01, 0.395, -0.18]], "w")
  for (const o of [-0.12, -0.04, 0.04, 0.12]) line([0.01, 0.325, o], [0.01, 0.36, o], "0")
  line([0.01, 0.405, -0.1], [0.01, 0.405, 0.1], "W")
  // under it the diffuser, black, its fins, the twin pipes through it
  fill([[0.08, 0.17, -0.74], [0.08, 0.17, 0.74], [0.06, 0.25, 0.8], [0.06, 0.25, -0.8]], "0")
  for (const o of [-0.6, -0.3, 0.3, 0.6]) line([0.07, 0.18, o], [0.07, 0.24, o], "-")
  for (const sd of [-1, 1]) { const ring = (rr) => Array.from({ length: 12 }, (_, i) => { const t = (TAU * i) / 12; return [0.05, 0.24 + rr * Math.sin(t), sd * 0.35 + rr * Math.cos(t)] }); fill(ring(0.06), "0"); fill(ring(0.042), "~"); fill(ring(0.022), "0") }
  // the wing over the tail: two posts, the end plates outlined, the blade thick enough to show its
  // edge toward us dark and its top in the light
  for (const sd of [-1, 1]) fill([[0.18, 0.78, sd * 0.42], [0.18, 0.93, sd * 0.42], [0.24, 0.93, sd * 0.42], [0.24, 0.78, sd * 0.42]], "0")
  for (const sd of [-1, 1]) {
    fill([[0.12, 0.74, sd * 0.8], [0.12, 0.97, sd * 0.8], [0.36, 0.97, sd * 0.8], [0.36, 0.76, sd * 0.8]], "0")
    fill([[0.14, 0.76, sd * 0.8], [0.14, 0.95, sd * 0.8], [0.34, 0.95, sd * 0.8], [0.34, 0.78, sd * 0.8]], ramp[1])
  }
  fill([[0.1, 0.915, -0.88], [0.1, 0.915, 0.88], [0.1, 0.975, 0.88], [0.4, 0.965, 0.88], [0.4, 0.965, -0.88], [0.1, 0.975, -0.88]], "0")
  fill([[0.11, 0.955, -0.86], [0.11, 0.955, 0.86], [0.38, 0.958, 0.86], [0.38, 0.958, -0.86]], ramp[3])
  fill([[0.1, 0.925, -0.86], [0.1, 0.925, 0.86], [0.1, 0.952, 0.86], [0.1, 0.952, -0.86]], ramp[1])
  // the blue one's white stripes, down its middle over the tail
  if (r.color === "b") for (const o of [-0.16, 0.08]) {
    fill([[0.1, 0.78, o], [0.1, 0.78, o + 0.08], [1.1, 0.805, o + 0.08], [1.1, 0.805, o]], "w")
    fill([[backLean(0.64), 0.64, o], [backLean(0.64), 0.64, o + 0.08], [backLean(0.69), 0.69, o + 0.08], [backLean(0.69), 0.69, o]], "W")
    fill([[backLean(0.69), 0.69, o], [backLean(0.69), 0.69, o + 0.08], [backLean(0.77), 0.77, o + 0.08], [backLean(0.77), 0.77, o]], "w")
  }
}
// the red one backfires as we come up on it: a short burst of flame from each pipe
function backfire(c, sx, sy, w, r, f) {
  const t = Math.floor((22 - rivalZ(r, f)) * 0.7)
  if (r.color !== "r" || t < 0 || t >= 6) return
  for (const side of [-1, 1]) c.flame(Math.round(sx + side * 0.15 * w), Math.round(sy - 0.19 * 0.56 * w), Math.max(3, 0.3 * w), "98767", { seed: 4 + side, frame: t, wind: 0 })
}

// Foliage as a pixel artist builds it, in the dusk: clumps of leaves, each a dark body with its cap
// toward the low sun (ahead and to the left) a tone lighter, its shadow cast down to the right over
// what is behind it, a few leaves' gaps and glints speckling the big ones; the sun's warm rim only
// where a clump's edge shows against the sky; on the forest's face, which the low sun grazes, some clumps
// lit a tone more with their left edge warm. Those lower and nearer are drawn over those behind.
const LEAVES = new Set(["F", "f", "x", "v", "H", "P"])
function clump(c, x, y, rc, seed, rim = true, glint = false) {
  const R = Math.round, rx = Math.max(1, R(rc)), ry = Math.max(1, R(rc * 0.82)), kx = R(x), ky = R(y)
  if (rc > 1.5) c.ellipse(R(x + rc * 0.25), R(y + rc * 0.3), rx, ry, "F")          // its shadow on what is behind
  c.ellipse(kx, ky, rx, ry, "f")
  if (rc > 2.2) c.ellipse(R(x - rc * 0.25), R(y - rc * 0.3), Math.max(1, R(rc * 0.55)), Math.max(1, R(rc * 0.4)), glint ? "v" : "x")
  // a face the low sun grazes: its left edge warm
  if (glint && rc > 2.2) for (let t = 2.5; t < 3.9; t += 0.7 / rc) c.px(R(x + Math.cos(t) * rc * 0.92), R(y + Math.sin(t) * rc * 0.75), hash(R(t * 10), seed) < 0.6 ? "H" : "V")
  if (rc > 4) for (let i = 0; i < rc * 1.4; i++) {
    const a = hash(seed + i, kx) * TAU, d = hash(ky, seed + i) * rc * 0.85
    c.px(R(x + Math.cos(a) * d), R(y + Math.sin(a) * d * 0.8), i % 4 ? "F" : "v")
  }
  if (rim) for (let t = 3.0; t < 4.8; t += 0.5 / Math.max(1, rc)) {
    const px = R(x + Math.cos(t) * rc), py = R(y + Math.sin(t) * rc * 0.82)
    if (!LEAVES.has(c.key(px - 1, py - 1)) || !LEAVES.has(c.key(px - 1, py))) c.px(px, py, "H")
  }
}
// a tree's crown: a handful of clumps in a dome; far off, one dark lump with its rim
function crown(c, x, y, r, seed) {
  const n = Math.max(1, Math.min(14, Math.round(r / 2)))
  const clumps = Array.from({ length: n }, (_, i) => {
    const a = hash(seed, i * 3) * TAU, d = n > 1 ? Math.sqrt(hash(seed, i * 3 + 1)) * 0.6 : 0
    return { x: x + Math.cos(a) * d * r, y: y + Math.sin(a) * d * r * 0.75, rc: n > 1 ? r * (0.34 + 0.2 * hash(seed, i * 3 + 2)) : r }
  }).sort((p, q) => p.y - q.y)
  for (const k of clumps) clump(c, k.x, k.y, k.rc, seed + Math.round(k.x))
}

// ---------------------------------------------------------------- trees, palms, big leaves, tall grass
// Drawn in code after the tropical example's trees, palm and big leaves (free pixel art there:
// "[LPC] Jungle" and Sevarihk's palm), studied for how they are built, in the evening's colours:
// a tree's trunk twisting up from a flared foot and splitting into branches; its crown a dark mass
// heaped with clumps, each lit on its upper left, mid below, dark under, deep shade between them, its
// outline lumpy, the warm rim of the low sun where it shows against the sky. A palm's ringed trunk
// curving up; its fronds broad and drooping, lit on top, dark under, their edges cut by the leaflets.
// A banana's paddle leaves round a midrib, torn at the edges.
function tree(c, x, y, h, seed) {
  const R = Math.round
  if (h < 7) { crown(c, x, y - h * 0.62, h * 0.38, seed); return }
  const lean = (hash(seed, 1) - 0.5) * h * 0.14, base = h * 0.045, split = y - h * 0.5
  // the trunk, flared at its foot, its left edge in the light, bark lines down it
  for (let yy = R(y); yy >= R(split); yy--) {
    const t = (y - yy) / (y - split), xx = x + lean * t * t, w = Math.max(0.6, base * (1.25 - 0.45 * t) + (t < 0.12 ? base * (0.12 - t) * 9 : 0))
    c.hline(R(xx - w), yy, Math.max(1, R(2 * w)), "T")
    c.px(R(xx - w), yy, "B")
    if (w > 2 && (yy + seed) % 3 === 0) c.px(R(xx + (hash(seed, yy) - 0.3) * w), yy, "P")
  }
  // branches up into the crown
  for (const sd of [-1, 1, 0]) {
    const x0 = x + lean, x1 = x0 + sd * h * 0.2, y1 = split - h * (sd === 0 ? 0.22 : 0.14), w = Math.max(1, R(base * 0.8))
    for (let k = 0; k < w; k++) c.line(R(x0 + k - w / 2), R(split), R(x1 + k - w / 2), R(y1), k === 0 ? "B" : "T")
  }
  // the crown: a dark mass, heaped with clumps (the upper ones first, the lower over them)
  const cx0 = x + lean, cy = y - h * 0.7, cw = h * 0.4, chh = h * 0.3
  c.ellipse(R(cx0), R(cy), R(cw), R(chh), "F")
  const n = Math.max(6, Math.min(48, R(h / 2.2)))
  const clumps = Array.from({ length: n }, (_, i) => {
    const a = hash(seed, 10 + i) * TAU, d = Math.sqrt(hash(seed, 40 + i))
    return { x: cx0 + Math.cos(a) * d * cw * 0.92, y: cy + Math.sin(a) * d * chh * 0.92, rc: h * (0.05 + 0.035 * hash(seed, 70 + i)) }
  }).sort((p, q) => p.y - q.y)
  for (const k of clumps) leafClump(c, k.x, k.y, k.rc, seed + R(k.x * 3), (k.y - cy) / chh)
}
// one clump of leaves: dark under, mid body, lit cap on its upper left with a few bright leaves, a
// shade toward the bottom of the crown; the sun's warm rim where its edge shows against the sky
function leafClump(c, x, y, rc, seed, low = 0) {
  const R = Math.round, rx = Math.max(1, R(rc)), ry = Math.max(1, R(rc * 0.8))
  c.ellipse(R(x + rc * 0.2), R(y + rc * 0.28), rx, ry, "F")
  c.ellipse(R(x), R(y), rx, ry, low > 0.4 ? "x" : "f")
  if (rc > 2) c.ellipse(R(x - rc * 0.22), R(y - rc * 0.26), Math.max(1, R(rc * 0.6)), Math.max(1, R(rc * 0.45)), low > 0.4 ? "f" : "v")
  if (rc > 3.5) for (let i = 0; i < rc; i++) {
    const a = 3.4 + hash(seed, i) * 1.6, d = rc * (0.35 + 0.4 * hash(i, seed))
    c.px(R(x + Math.cos(a) * d * 0.7), R(y + Math.sin(a) * d * 0.6), i % 3 ? "V" : "F")
  }
  for (let t = 3.0; t < 4.8; t += 0.5 / Math.max(1, rc)) {
    const px = R(x + Math.cos(t) * rc), py = R(y + Math.sin(t) * rc * 0.8)
    if (!LEAVES.has(c.key(px - 1, py - 1)) || !LEAVES.has(c.key(px - 1, py))) c.px(px, py, "H")
  }
}
// a palm's crown: broad fronds fanning from its top and drooping, the upper ones behind; each lit on
// its top, dark under, its lower edge cut by the leaflets; the nuts at the heart
function palmCrown(c, x, y, s, seed) {
  const R = Math.round, n = 9, steps = Math.max(5, R(s / 1.2))
  const fronds = Array.from({ length: n }, (_, i) => -Math.PI * (0.03 + (0.94 * i) / (n - 1)) + (hash(seed, i) - 0.5) * 0.3)
  fronds.sort((a, b) => Math.abs(Math.sin(b)) - Math.abs(Math.sin(a)))
  for (const [i, a] of fronds.entries()) {
    const len = s * (0.8 + 0.3 * hash(seed, 20 + i)), droop = 0.6 + 0.3 * hash(seed, 40 + i), toSun = Math.cos(a) < 0
    const at = (t) => [x + Math.cos(a) * len * t, y + Math.sin(a) * len * t + droop * len * t * t]
    for (let k = 1; k <= steps; k++) {
      const t = k / steps, [px, py] = at(t), [qx, qy] = at(t - 1 / steps), tx = px - qx, ty = py - qy, tl = Math.hypot(tx, ty) || 1
      const wdt = len * 0.13 * Math.sin(Math.PI * Math.min(1, t * 1.15)) + 0.6, nx = -ty / tl, ny = tx / tl, up = ny < 0 ? 1 : -1
      // the blade across the rib: its upper half lit, its lower half dark, a leaflet's notch now and then
      for (let o = -wdt; o <= wdt; o += 0.5) {
        const ex = R(px + nx * o), ey = R(py + ny * o), upper = o * up > 0, edge = Math.abs(o) > wdt - 0.7
        if (edge && !upper && (k + i) % 2) continue
        c.px(ex, ey, edge ? (upper && toSun ? "H" : "F") : upper ? (toSun ? "v" : "x") : "f")
      }
      c.line(R(qx), R(qy), R(px), R(py), toSun ? "V" : "x")
    }
  }
  for (let k = 0; k < 5; k++) c.px(R(x + (hash(seed, 60 + k) - 0.5) * s * 0.12), R(y + 1 + hash(seed, 70 + k) * s * 0.07), "T")
}
// a palm's trunk: dark against the light, its left edge warm, the rings of its old leaves across it
function palmTrunk(c, base, top, w) {
  const R = Math.round, [bx, by] = base, [tx, ty] = top, L = Math.hypot(tx - bx, ty - by) || 1
  for (let i = 0; i <= L; i++) {
    const t = i / L, x = bx + (tx - bx) * t + Math.sin(t * Math.PI) * w * 1.5, y = by + (ty - by) * t, hw = Math.max(0.5, w * (1 - 0.35 * t))
    c.hline(R(x - hw), R(y), Math.max(1, R(hw * 2)), "T")
    // the rings: bands of old leaf bases, uneven, lit on the sun's side, a dark notch under each
    const ring = Math.max(3, R(w * 1.6)), ph = (i + R(hash(Math.floor(i / ring), 9) * 2)) % ring
    if (ph === 0) c.hline(R(x - hw), R(y), Math.max(1, R(hw * 2)), "P")
    else if (ph === 1) c.hline(R(x - hw), R(y), Math.max(1, R(hw * 1.1)), "B")
    c.px(R(x - hw), R(y), ph === 0 ? "B" : "H")
  }
}
// a banana plant at the forest's foot: paddle leaves round their midribs, lit on top, torn at the edge
function banana(c, x, y, h, seed) {
  const R = Math.round
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI * (0.15 + 0.7 * hash(seed, i)), len = h * (0.55 + 0.35 * hash(seed, 10 + i)), wid = len * 0.22
    const ax = Math.cos(a), ay = Math.sin(a), sx = x, sy = y - h * 0.25
    for (let t = 0.15; t <= 1; t += 0.5 / Math.max(4, len)) {
      const px = sx + ax * len * t, py = sy + ay * len * t + len * 0.35 * t * t, w = wid * Math.sin(Math.PI * t)
      for (let o = -w; o <= w; o += 0.5) {
        const ex = R(px - ay * o), ey = R(py + ax * o), torn = Math.abs(o) > w - 1 && hash(R(t * 40), seed + i) < 0.35
        if (!torn) c.px(ex, ey, o < 0 ? "v" : "f")
      }
      c.px(R(px), R(py), "x")
    }
  }
  c.line(R(x), R(y), R(x), R(y - h * 0.3), "x")
}
// tall grass and weeds in clumps, backlit by the low sun on the left: each blade dark, its sunward
// edge glowing toward the tip; some carry a seed head; all bend with a gust that runs through them
function tallGrass(c, u, d, f, seed) {
  const P = way(f)
  const x = cx(u, f), [gx, gy] = P.ground(x, d, 0), sc = P.scale(d, x), R = Math.round
  if (sc < 2) return
  const n = Math.max(4, Math.min(20, R(sc * 0.7))), k = (TAU * f) / FRAMES * 6
  for (let i = 0; i < n; i++) {
    const x0 = gx + (hash(seed, i) - 0.5) * sc * 1.1, h = (0.25 + 0.45 * hash(seed, 20 + i)) * sc
    const lean = (hash(seed, 40 + i) - 0.45) * h * 0.9 + Math.sin(k - x0 * 0.15) * h * 0.12
    let lx = null
    for (let s = 0; s <= h; s++) {
      const t = s / h, bx = R(x0 + lean * t ** 1.8), by = R(gy - s)
      c.px(bx, by, t < 0.45 ? "F" : "x")
      if (t > 0.6 && bx !== lx) c.px(bx - 1, by, t > 0.85 ? "H" : "v")
      lx = bx
    }
    if (hash(seed, 60 + i) < 0.25 && h > 6) { const tx = R(x0 + lean), ty = R(gy - h); c.px(tx, ty - 1, "H"); c.px(tx - 1, ty, "b") }
  }
}

// ---------------------------------------------------------------- lamp posts, chevrons, the sign
// Their shapes in meters still throw the long shadows (ghosts: they cast, they are not drawn); each is
// drawn by hand where the camera puts it. A lamp post tapers up, dark against the dusk with its sunward
// edge lit, a swan neck carrying the lamp out over the road, its lens lit for the evening and its glow
// round it. A chevron is a yellow board in a black rim on a grey post, its top edge catching the light,
// a thick black arrow round the bend. The guide sign is green in a white rim on two posts, its lower
// part a tone darker, the light along its top, the town and the distance on it.
function lampPost(c, it, f) {
  const P = way(f)
  const d = along(it.p, f)
  if (d < 2 || d > 260) return
  const x = cx(it.u, f), arm = cx(it.u - 2.2, f), sc = P.scale(d, x), R = Math.round
  const [bx, by] = P.ground(x, d, 0), [tx, ty] = P.ground(x, d, 8.7), w = Math.max(0.5, 0.11 * sc)
  for (let y = R(ty); y <= R(by); y++) {
    const t = (y - ty) / Math.max(1, by - ty), hw = w * (0.6 + 0.5 * t), xx = tx + (bx - tx) * t
    c.hline(R(xx - hw), y, Math.max(1, R(hw * 2)), "p"); if (hw > 1) c.px(R(xx - hw), y, "R")
  }
  if (w > 1.5) { const [qx, qy] = P.ground(x, d, 0.5); c.rect(R(qx - w * 1.4), R(qy), R(w * 2.8), Math.max(1, R(by - qy)), "n"); c.hline(R(qx - w * 1.4), R(qy), R(w * 2.8), "R") }
  // the swan neck: up from the top and round over the road
  let prev = null
  for (let k = 0; k <= 12; k++) {
    const t = k / 12, u = x + (arm + 0.2 - x) * t * t, h = 8.7 + 0.8 * Math.sin(Math.PI * Math.min(1, t * 1.3)) * (1 - t * 0.4), pt = P.ground(u, d, h)
    if (prev) { c.line(R(prev[0]), R(prev[1]), R(pt[0]), R(pt[1]), "p"); if (w > 1) c.line(R(prev[0]), R(prev[1]) - 1, R(pt[0]), R(pt[1]) - 1, "R") }
    prev = pt
  }
  // the lamp: its head, the lens under it lit, the glow round it
  const [lx, ly] = P.ground(arm, d, 9.25), lw = Math.max(1, 0.38 * sc), lh = Math.max(1, 0.13 * sc)
  for (let y = -R(lw * 1.6); y <= R(lw * 1.6); y++) for (let xx = -R(lw * 2.2); xx <= R(lw * 2.2); xx++) {
    const g = 1 - Math.hypot(xx / (lw * 2.2), y / (lw * 1.6))
    if (g > 0 && bayer(R(lx) + xx, R(ly) + y) < g * g * 0.7) c.px(R(lx) + xx, R(ly) + y + R(lh), g > 0.6 ? "8" : "l")
  }
  c.ellipse(R(lx), R(ly), R(lw), R(lh), "n"); c.hline(R(lx - lw), R(ly) - R(lh), R(lw * 2), "R")
  c.hline(R(lx - lw * 0.7), R(ly + lh * 0.5) + 1, Math.max(1, R(lw * 1.4)), "9")
}
function chevronSign(c, it, f) {
  const P = way(f)
  const d = along(it.p, f)
  if (d < 2 || d > 200) return
  const side = kappa(f) >= 0 ? -1 : 1, x = cx(side * 5.2, f), dir = -side, sc = P.scale(d, x), R = Math.round
  const [px0, py0] = P.ground(x, d, 0), [, py1] = P.ground(x, d, 1.2), pw = Math.max(1, R(0.06 * sc))
  c.rect(R(px0 - pw / 2), R(py1), pw, Math.max(1, R(py0 - py1)), "p"); if (pw > 1) c.line(R(px0 - pw / 2), R(py1), R(px0 - pw / 2), R(py0), "R")
  const [ax, ay] = P.ground(x - 0.36, d, 1.76), [bx, by] = P.ground(x + 0.36, d, 1.18), bw = R(bx - ax), bh = R(by - ay)
  c.rect(R(ax), R(ay), Math.max(1, bw), Math.max(1, bh), "k")
  if (bw > 3 && bh > 3) {
    c.rect(R(ax) + 1, R(ay) + 1, bw - 2, bh - 2, "Z"); c.hline(R(ax) + 1, R(ay) + 1, bw - 2, "t")
    const pts = [[-0.17 * dir, 1.66], [0.13 * dir, 1.47], [-0.17 * dir, 1.28]].map(([u, h]) => P.ground(x + u, d - 0.01, h).map(R))
    const wd = Math.max(1, R(0.1 * sc))
    for (let k = 0; k < wd; k++) { c.line(pts[0][0] + k * dir, pts[0][1], pts[1][0] + k * dir, pts[1][1], "k"); c.line(pts[1][0] + k * dir, pts[1][1], pts[2][0] + k * dir, pts[2][1], "k") }
  }
}
function guideSign(c, f) {
  const P = way(f)
  const d = along(SIGN.p, f)
  if (d < 2 || d > 240) return
  const x = cx(SIGN.u, f), sc = P.scale(d, x), R = Math.round
  for (const o of [-1.2, 1.2]) {
    const [px0, py0] = P.ground(x + o, d, 0), [, py1] = P.ground(x + o, d, 2.3), pw = Math.max(1, R(0.08 * sc))
    c.rect(R(px0 - pw / 2), R(py1), pw, Math.max(1, R(py0 - py1)), "p"); if (pw > 1) c.line(R(px0 - pw / 2), R(py1), R(px0 - pw / 2), R(py0), "R")
  }
  const [x0, y0] = P.ground(x - 1.6, d, 3.8).map(R), [x1, y1] = P.ground(x + 1.6, d, 2.2).map(R)
  c.rect(x0, y0, Math.max(1, x1 - x0), Math.max(1, y1 - y0), "E")
  if (sc < 3) return
  c.rect(x0, R(y0 + (y1 - y0) * 0.6), x1 - x0, R((y1 - y0) * 0.4), "D".length ? "E" : "E")
  for (let yy = R(y0 + (y1 - y0) * 0.65); yy < y1; yy++) for (let xx = x0; xx < x1; xx++) if ((xx + yy) % 2 === 0) c.px(xx, yy, "x")
  c.box(x0, y0, x1 - x0, y1 - y0, "k")
  if (sc >= 5) c.box(x0 + 1, y0 + 1, x1 - x0 - 2, y1 - y0 - 2, "w")
  c.hline(x0 + 2, y0 + 2, Math.max(1, x1 - x0 - 4), "X")
  if (sc > 14) {
    const sz = Math.max(1, Math.floor(sc / 16)), mx = R((x0 + x1) / 2)
    c.text(mx, y0 + 3 * sz, "PARATY", "w", { scale: sz, align: "c" }); c.text(mx, y0 + 10 * sz, "18 km", "w", { scale: sz, align: "c" })
    c.line(mx + 14 * sz, y0 + 5 * sz, mx + 18 * sz, y0 + 5 * sz, "w"); c.line(mx + 16 * sz, y0 + 3 * sz, mx + 18 * sz, y0 + 5 * sz, "w"); c.line(mx + 16 * sz, y0 + 7 * sz, mx + 18 * sz, y0 + 5 * sz, "w")
  }
}

// ---------------------------------------------------------------- the clouds
// Sunset clouds on a strip that wraps round the sky and turns with us as the sun does: high puffy
// banks, each a heap of rounded puffs with a flat base, their tops in the purple of the dusk and their
// undersides lit from below by the sun under the horizon, gold near it and pink away from it, their
// edges soft; long thin streaks low down, lit along their bottoms. The sun sits at the strip's x 525.
const CLOUD_RAMP = ["2", "C", "3", "c", "5", "e", "7", "8"]
sprite("_clouds", { w: FAR_W, h: 46, wrap: "x" }, (c) => {
  const R = Math.round, SUNX = 525
  const near = (x) => Math.max(0, 1 - Math.min(Math.abs(x - SUNX), FAR_W - Math.abs(x - SUNX)) / 260)
  const puff = (px, py, rx, ry) => {
    for (let y = R(py - ry); y <= R(py + ry); y++) for (let x = R(px - rx); x <= R(px + rx); x++) {
      const nx = (x - px) / rx, ny = (y - py) / ry, r = nx * nx + ny * ny
      if (r > 1) continue
      const soft = r > 0.72 && ny < 0.3 && bayer(x, y) < (r - 0.72) * 3.5
      if (soft) continue
      const lit = (ny + 1) / 2 * 2.2 + near(x) * 3.6 + (bayer(x, y) - 0.5) * 0.9 + (ny > 0.55 ? 1 : 0)
      c.px(((x % FAR_W) + FAR_W) % FAR_W, y, CLOUD_RAMP[Math.max(0, Math.min(7, Math.floor(lit)))])
    }
  }
  // the banks: a row of puffs over a flat base, the middle ones higher
  for (let i = 0; i < 9; i++) {
    const cx0 = 40 + i * 107 + hash(i, 3) * 40, base = 14 + hash(i, 4) * 10, w = 22 + hash(i, 5) * 34, n = 4 + R(hash(i, 6) * 4)
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n, rx = w * (0.22 + 0.12 * hash(i, 10 + k)), ry = rx * 0.55
      puff(cx0 + (t - 0.5) * w * 1.6, base - Math.sin(Math.PI * t) * w * 0.18 - ry * 0.4, rx, ry)
    }
    for (let x = R(cx0 - w * 0.8); x <= R(cx0 + w * 0.8); x++) c.px(((x % FAR_W) + FAR_W) % FAR_W, R(base), CLOUD_RAMP[Math.min(7, 4 + R(near(x) * 3))])
  }
  // the streaks low down, thin and long, lit along their bottoms
  for (let i = 0; i < 14; i++) {
    const x0 = hash(i, 30) * FAR_W, y0 = 33 + hash(i, 31) * 11, len = 30 + hash(i, 32) * 90
    for (let x = R(x0); x < x0 + len; x++) {
      const t = (x - x0) / len, th = Math.sin(Math.PI * t) * (1.2 + hash(i, 33) * 1.4)
      for (let y = R(y0 - th); y <= R(y0); y++) c.px(((x % FAR_W) + FAR_W) % FAR_W, y, CLOUD_RAMP[Math.max(1, Math.min(7, R(2 + (y === R(y0) ? 2 : 0) + near(x) * 3.5)))])
    }
  }
})

// ---------------------------------------------------------------- the view through the glass
const SUN = (f) => { const [sx, sz] = sunDir(f); return { from: [sx, sz], up: SUN_UP + 6 } }
const SHADE = { a: "q", A: "q", q: "Q", w: "W", y: "Y", t: "Y", v: "x", V: "x", W: "q" }
function view(c, f) {
  c.stamp("_sky", 0, 0)
  c.scroll("_clouds", 8, 0, { x: Math.round(P.vp - FAR_W * 0.6 - P.focal * heading(f)) })
  sun(c, f)
  far(c, f)
  const V = way(f), at = (x, z, up = 0) => V.ground(x, z, up).map(Math.round)
  c.plane(V, ground(f))
  // the forest along the right: a dark body under a row of round crowns (drawn with the rest below)
  const wall = []
  for (let d = 240; d >= 4; d -= 4) { const p = (travelled(f) + d) % LOOP_M; wall.push([cx(FOREST, f), d, 7 + 4 * hash(Math.floor(p / 8), 2)]) }
  for (let i = 0; i + 1 < wall.length; i++) {
    const [x0, d0, h0] = wall[i], [x1, d1, h1] = wall[i + 1]
    c.poly([...at(x0, d0, 0), ...at(x0, d0, h0), ...at(x1, d1, h1), ...at(x1, d1, 0)], "F")
  }
  // its face: foliage down to the ground, darker low down, a trunk or two in the gaps near us, the
  // undergrowth along its foot
  for (let i = 0; i < wall.length; i++) {
    const [x0, d0, h0] = wall[i], sc = V.scale(d0, x0), pm = Math.floor((travelled(f) + d0) % LOOP_M)
    if (d0 < 70) for (const k of [0, 1]) {
      const tu = hash(pm, 40 + k) * 3, [tx, ty] = at(cx(FOREST - 0.2, f), d0 + tu, 0), [, tt] = at(cx(FOREST - 0.2, f), d0 + tu, h0 * 0.7)
      const tw = Math.max(1, Math.round(0.25 * V.scale(d0 + tu, x0)))
      c.rect(tx - tw, tt, tw * 2, ty - tt, "P"); c.line(tx - tw, tt, tx - tw, ty, "H")
    }
    for (let k = 0; k < 3; k++) {
      const h = h0 * (0.15 + 0.25 * k + 0.1 * hash(pm, 50 + k)), du = hash(pm, 60 + k) * 4, [qx, qy] = at(cx(FOREST - 0.1, f), d0 + du, h)
      clump(c, qx, qy, (1.1 + 0.6 * hash(pm, 70 + k)) * sc, pm * 7 + k, false, hash(pm, 80 + k) < 0.45)
    }
  }
  // tufts of grass standing up along the edge of the asphalt, near us: a few blades each, a tip warm
  for (let p = Math.floor((travelled(f) + 30) / 1.3) * 1.3; p > travelled(f) + 2.5; p -= 1.3) {
    const d = p - travelled(f), pm = Math.floor(p * 10), u = SHOULDER + 0.3 + hash(pm, 91) * 1.5
    const [gx, gy] = at(cx(u, f), d, 0), sc = V.scale(d, cx(u, f)), hgt = (0.2 + 0.25 * hash(pm, 92)) * sc
    if (hgt < 2) continue
    for (let b = 0; b < 4; b++) {
      const lean = (hash(pm, 93 + b) - 0.5) * hgt * 0.8, bx = gx + (b - 1.5) * Math.max(1, sc * 0.05)
      c.line(Math.round(bx), gy, Math.round(bx + lean), Math.round(gy - hgt * (0.6 + 0.4 * hash(pm, 97 + b))), b % 2 ? "v" : "x")
      c.px(Math.round(bx + lean), Math.round(gy - hgt * (0.6 + 0.4 * hash(pm, 97 + b))), "H")
    }
  }
  // the guardrail on the left: two lines along the posts, a post every 4 m
  for (let d = 200; d >= 4; d -= 4) {
    const p = d - (travelled(f) % 4)
    if (p < 3) continue
    const [ax, ay] = at(cx(RAIL_U, f), p, 0.8), [bx, by] = at(cx(RAIL_U, f), p + 4, 0.8), [px0, py0] = at(cx(RAIL_U, f), p, 0)
    const [ax2, ay2] = at(cx(RAIL_U, f), p, 0.5), [bx2, by2] = at(cx(RAIL_U, f), p + 4, 0.5)
    c.poly([ax, ay, bx, by, bx2, by2, ax2, ay2], "R"); c.line(ax, ay, bx, by, "r"); c.line(px0, py0, ax, ay, "p")
  }
  // shadows of everything, long toward us with the sun so low; then the things, far to near
  // the forest's crowns along its top, far to near, each a clump of clumps
  for (let p = Math.floor((travelled(f) + 240) / 5) * 5; p > travelled(f) + 3; p -= 5) {
    const d = p - travelled(f), pm = p % LOOP_M, rm = 2.2 + 1.2 * hash(Math.floor(pm / 5), 4)
    const [qx, qy] = V.ground(cx(FOREST + 0.5, f), d, 7 + 4 * hash(Math.floor(pm / 8), 2)), sc = V.scale(d, cx(FOREST + 0.5, f))
    crown(c, qx, qy, rm * sc, Math.floor(pm / 5) + 17)
  }
  for (let p = Math.floor((travelled(f) + 200) / 7) * 7; p > travelled(f) + 12; p -= 7) {
    const d = p - travelled(f), pm = Math.round(p % LOOP_M)
    if (hash(pm, 81) < 0.55) { const x = cx(FOREST - 0.6, f), [px, py] = V.ground(x, d, 0); tree(c, px, py, (10 + 4 * hash(pm, 82)) * V.scale(d, x), pm) }
    if (hash(pm, 84) < 0.7) { const x = cx(FOREST - 1.6, f), [px, py] = V.ground(x, d - 2.5, 0); banana(c, px, py, 2.6 * V.scale(d - 2.5, x), pm + 3) }
  }
  const things = [...POLES.flatMap((it) => pole(it, f)), ...CHEVRONS.flatMap((it) => chevron(it, f)), ...sign(f)]
  // a rival nearer than 4 m is beside us, behind the pillar and the door
  const cars = RIVALS.map((r) => ({ r, z: rivalZ(r, f) })).filter((o) => o.z > 4 && o.z < 200)
  const carParts = cars.flatMap(({ r, z }) => carShapes(cx(r.lane, f), z, r.keys))
  c.shadows(V, [...things, ...carParts], { sun: SUN(f), shade: SHADE })
  c.solids(V, things, { sun: SUN(f) })
  // the palms, far to near: the trunk, then its crown
  for (const it of [...PALMS].sort((a, b) => along(b.p, f) - along(a.p, f))) {
    const pa = palmAt(it, f)
    if (!pa) continue
    palmTrunk(c, pa.base, pa.top, 0.17 * pa.sc)
    palmCrown(c, pa.top[0], pa.top[1], 3.4 * pa.sc, pa.seed * 13 + 5)
  }
  // tall grass and weeds along both verges, far to near
  for (let p = Math.floor((travelled(f) + 70) / 2.2) * 2.2; p > travelled(f) + 2; p -= 2.2) {
    const d = p - travelled(f), pm = Math.floor(p * 3)
    tallGrass(c, SHOULDER + 0.6 + hash(pm, 3) * 2.2, d, f, pm)
    if (hash(pm, 4) < 0.6) tallGrass(c, RAIL_U - 0.5 - hash(pm, 5) * 1.0, d + 1.1, f, pm + 999)
  }
  // the lamp posts, the chevrons and the sign, far to near
  for (const it of [...POLES].sort((a, b) => along(b.p, f) - along(a.p, f))) lampPost(c, it, f)
  for (const it of [...CHEVRONS].sort((a, b) => along(b.p, f) - along(a.p, f))) chevronSign(c, it, f)
  guideSign(c, f)
  for (const { r, z } of cars.sort((a, b) => b.z - a.z)) rival(c, r, z, f)
}

// ---------------------------------------------------------------- the rear-view mirror
// What's behind, flipped: dusk on that side of the sky, the road running back to its own vanishing
// point, the rivals we passed falling away with their headlights on.
const MW = 62, MH = 12
const MIRROR = { w: MW, horizon: 5, eye: EYE, fov: 48 }
anim("_mirror", { w: MW, h: MH, frames: FRAMES, fps: FPS }, rect(0, 0, MW, 3, "2"), rect(0, 3, MW, 3, "3"),
  (c) => {
    const f = c.frame, ox = ourX(f)
    // behind, the bend goes the other way; in the mirror left stays left
    const PM = perspective({ ...MIRROR, bend: -kappa(f) })
    c.plane(PM, (x, z) => {
      const u = x + ox
      if (u < RAIL_U) return u < BEACH ? "S" : "x"
      if (u > SHOULDER) return "v"
      if (Math.abs(Math.abs(u) - 0.1) < Math.max(0.04, (z / PM.focal) * 0.5)) return "y"
      if (Math.abs(Math.abs(u) - EDGE) < Math.max(0.07, z / PM.focal)) return "W"
      return "a"
    })
    for (const r of RIVALS) {
      const z = -rivalZ(r, f) - 4.4
      if (z < 1 || z > 60) continue
      const x = r.lane - ox, sc = PM.scale(z), [px, py] = PM.ground(x, z, 0).map(Math.round)
      const lw = Math.max(1, Math.round(0.55 * sc)), [gx, gy] = PM.ground(x, z - 2.5, 0).map(Math.round)
      if (sc > 2.5) for (const sd of [-1, 1]) c.ellipse(gx + sd * lw, gy, Math.max(1, Math.round(sc * 0.35)), Math.max(1, Math.round(sc * 0.12)), "A")
      c.stamp(`_rf_${r.color}_*`, px, py + 1, { fit: Math.max(3, Math.round(1.07 * sc)) })
    }
  })

// ---------------------------------------------------------------- the left mirror
// A third camera, at the left mirror a meter out from our seat, looking back: the dusk behind us (the
// sky darker that way, a pink glow low down), the road going away to its own vanishing point with its
// lines, the guardrail's posts falling behind, the rock strip, the beach and the sea; a rival we passed
// on the left coming on behind, its lights lit; and, along the mirror's inner edge, our own car's flank
// (a silver A80), the sunset's glow along its shoulder. In a mirror left stays left.
const SMW = 30, SMH = 20
const SIDE = { w: SMW, horizon: 8, eye: 1.0, fov: 42, vp: 16 }
anim("_sidemirror", { w: SMW, h: SMH, frames: FRAMES, fps: FPS }, rect(0, 0, SMW, 3, "1"), rect(0, 3, SMW, 3, "2"), rect(0, 6, SMW, 2, "3"), rect(0, 7, SMW, 1, "4"),
  (c) => {
    const f = c.frame, cam = ourX(f) - 1.1, s = travelled(f), R = Math.round
    const PS = perspective({ ...SIDE, bend: -kappa(f) })
    c.plane(PS, (x, z) => {
      const u = cam + x, back = ((s - z) % LOOP_M + LOOP_M) % LOOP_M
      if (u < SEA) return z > 40 ? "L" : z > 15 ? "s" : "S"
      if (u < BEACH) return Math.floor(back / 6) % 2 ? "b" : "B"
      if (u < RAIL_U) return "x"
      if (Math.abs(Math.abs(u) - 0.1) < Math.max(0.04, (z / PS.focal) * 0.5)) return "y"
      if (Math.abs(Math.abs(u) - EDGE) < Math.max(0.07, z / PS.focal)) return "W"
      return u > SHOULDER ? "v" : "a"
    })
    // the guardrail's posts going away behind, the rail along their tops
    let prev = null
    for (let i = 0; i < 16; i++) {
      const z = 2 + i * 4 - ((s % 4) + 4) % 4
      if (z < 1.5) continue
      const x = RAIL_U - cam, [bx, by] = PS.ground(x, z, 0), [tx, ty] = PS.ground(x, z, 0.8)
      c.line(R(bx), R(by), R(tx), R(ty), "p")
      if (prev) c.line(prev[0], prev[1], R(tx), R(ty), "r")
      prev = [R(tx), R(ty)]
    }
    // a rival behind on our left
    for (const r of RIVALS) {
      const z = -rivalZ(r, f) - 4.4
      if (z < 2 || z > 60) continue
      const x = r.lane - cam, sc = PS.scale(z), [px, py] = PS.ground(x, z, 0).map(R)
      c.stamp(`_rf_${r.color}_*`, px, py + 1, { fit: Math.max(3, R(1.07 * sc)) })
    }
    // our own flank along the inner edge, running back toward the vanishing point
    c.poly([SMW, 6, 22, 9, 21, 11, 22, 13, SMW, SMH], "0")
    c.poly([SMW, 7, 23, 9.5, 22.5, 11, 23.5, 12.5, SMW, SMH - 1], "r")
    c.poly([SMW, 14, 23.5, 12.5, SMW, SMH - 1], "R")
    c.line(23, 10, SMW - 1, 8, "e"); c.line(24, 11, SMW - 1, 10, "W")
    c.line(26, 15, 27, 18, "0")
  })

include("cockpit.px.js")

// ---------------------------------------------------------------- the driver
// The wheel, small as a racing car's, turns with the bend and with every change of lane; the hands
// go round with it at ten to two, gripping as drivers do: the back of the glove up and toward us, the palm down on
// the rim, the fingers curled forward over it, the thumbs pointing in. The forearms come up from the
// corners in the blue suit with its white stripes, a knit cuff at each wrist. The gauges' needles:
// the revs flutter and follow the speed and the gear; the ribbons from the mirror swing against the turn.
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
// (reach 0), or on its way to the gear lever below the picture at `to` (reach 1), turned a little
function handOn(side, turn, reach = 0, to = LEVER.at) {
  const a = (side > 0 ? HAND.a : Math.PI - HAND.a) - turn
  let [gx, gy] = rimMid(a)
  const [x1, y1] = rimMid(a - 0.01 * side), [x0, y0] = rimMid(a + 0.01 * side)
  const mir = ([x, y]) => [x * side, y], [L, Q] = HAND.rim.map(mir)
  let th = Math.atan2(y0 - y1, x1 - x0) - Math.atan2(Q[1] - L[1], Q[0] - L[0])
  gx += (to[0] - gx) * reach; gy += (to[1] - gy) * reach; th += LEVER.turn * reach
  const co = Math.cos(th), si = Math.sin(th)
  const mx = (L[0] + Q[0]) / 2, my = (L[1] + Q[1]) / 2
  const k = HAND.size
  return (p) => { const [x, y] = mir(p), dx = (x - mx) * k, dy = (y - my) * k; return [gx + dx * co - dy * si, gy - (dx * si + dy * co)] }
}
// the gear lever's knob under the centre stack, out of the picture: in fifth up and to the right, in
// fourth back toward us and to the left; the elbow drops back as the hand goes down to it
const LEVER = { fifth: [262, 202], fourth: [257, 207], turn: -0.6, elbow: [292, 226] }
LEVER.at = LEVER.fifth
const GLOVE = "=]}}'"
const steer = (f) => {
  const s = (f / FRAMES) * SECONDS, h = 0.02
  const lat = (ourX(((s + h) / SECONDS) * FRAMES) - 2 * ourX(f) + ourX(((s - h) / SECONDS) * FRAMES)) / (h * h)
  return (kappa(f) * 90 + lat * 0.05) * 0.45
}
function wheel(c, f) {
  const turn = steer(f), R = Math.round, s = (f / FRAMES) * SECONDS, reach = reachAt(s), g = gearAt(s)
  const lever = LEVER.fifth.map((v, i) => v + (LEVER.fourth[i] - v) * g)
  // the wheel in 3D, lit as the cockpit is, its stitching and badge over it
  c.mesh(eye, wheelFaces(turn), WHEEL_MATS, LIT); wheelDetails(c, turn)
  // the arms: each forearm from its corner up to the wrist, then the hand on the rim (all its parts
  // outlined first and filled after, so they read as one glove, a crease between the fingers), then
  // the knit cuff over the join
  for (const side of [1, -1]) {
    const r = side > 0 ? 0 : reach, S = handOn(side, turn, r, lever), wrist = S(HAND.wrist)
    const elbow = side > 0 ? [44, 214] : [276 + (LEVER.elbow[0] - 276) * r, 214 + (LEVER.elbow[1] - 214) * r]
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
    if (t < rim || Math.abs(o) > h) continue                                // off the sleeve: no folds to work out
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
  const kmh = speedAt(f) * 3.6 + 3 * Math.sin((TAU * f) / FRAMES * 2), g = gearAt((f / FRAMES) * SECONDS)
  const rev = kmh / (358 + (296 - 358) * g) + 0.03 * Math.sin((TAU * f * 52) / FRAMES) + 0.02 * Math.sin((TAU * f * 3) / FRAMES)
  for (const g of GAUGES) {
    const v = g.kind === "revs" ? rev : g.kind === "speed" ? kmh / 300 : 0.62, a = Math.PI * (1.25 - 1.5 * v), R = Math.round
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
  stamp("_sidemirror", 15, 83),
  stamp("_cockpit", 0, 0),
  (c) => { ribbons(c, c.frame); needles(c, c.frame); wheel(c, c.frame) })
