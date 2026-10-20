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
  "]": "#27222d", "{": "#b8282e", "}": "#5c5466", ">": "#2a4aa0", "/": "#4a6ad0", "<": "#18264e",
  // the Bonfim ribbons
  X: "#2ea04a", ":": "#e06aa0",
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
  const bands = [["1", 0], ["2", 10], ["3", 22], ["4", 34], ["5", 44], ["6", 53], ["7", 61], ["8", 67]]
  for (const [k, y0] of bands) c.rect(0, y0, W, HORIZON + 2 - y0, k)
  for (const [k, y0] of bands.slice(1)) for (let x = 0; x < W; x++) for (let r = 1; r <= 4; r++) if (1 - r / 5 > bayer(x, y0 - r)) c.px(x, y0 - r, k)
})
// the sun on the sea, 4 degrees up, 14 degrees left of the road where the loop starts; it swings
// across as we turn. A soft halo, then the disc.
const SUN_AZ = -14, SUN_UP = 3
const sunDir = (f) => { const a = ((SUN_AZ * Math.PI) / 180) - heading(f); return [Math.sin(a), Math.cos(a), Math.tan((SUN_UP * Math.PI) / 180)] }
function sun(c, f) {
  const [sx, sy] = P.toward(sunDir(f))
  for (let r = 22; r > 9; r -= 4) c.ellipse(Math.round(sx), Math.round(sy), r + 6, r, r > 17 ? "7" : "8")
  c.circ(Math.round(sx), Math.round(sy), 8, "9")
}

// ---------------------------------------------------------------- far off: islands and the serra
// One strip that wraps, far enough to move only as we turn: the islands out at sea on the left, the
// Serra do Mar on the right, hazy; then the nearer ridge, which moves a little more (parallax).
const FAR_W = 960
const farRidge = seamless((x, y) => fbm(x / 40, y, 3), FAR_W)
sprite("_far", { w: FAR_W, h: 30, wrap: "x" }, (c) => {
  for (let x = 0; x < FAR_W; x++) {
    // islands: low humps on the sea; the serra: a long range, higher toward the right
    const isl = Math.max(0, 7 * Math.sin((x / FAR_W) * TAU * 7) - 3 + 8 * (farRidge(x, 0) - 0.5))
    const serra = 10 + 14 * farRidge(x, 3) + 6 * Math.sin((x / FAR_W) * TAU * 2 + 1)
    const onLand = x > FAR_W * 0.5 && x < FAR_W * 0.95
    const hgt = Math.round(onLand ? serra : isl)
    for (let y = 30 - hgt; y < 30; y++) c.px(x, y, onLand ? (y < 30 - hgt + 2 ? "m" : "M") : "I")
  }
})
sprite("_near_ridge", { w: FAR_W, h: 26, wrap: "x" }, (c) => {
  for (let x = 0; x < FAR_W; x++) {
    if (x < FAR_W * 0.55 || x > FAR_W * 0.92) continue
    const hgt = Math.round(8 + 12 * farRidge(x * 1.7, 9) + 4 * Math.sin((x / FAR_W) * TAU * 5))
    for (let y = 26 - hgt; y < 26; y++) c.px(x, y, "N")
  }
})
// the far strip's 0 lands on the road's vanishing point where the loop starts; then it slides by
// the heading (the near ridge a quarter more)
function far(c, f) {
  const shift = P.focal * heading(f)
  c.scroll("_far", HORIZON - 29, 0, { x: Math.round(P.vp - FAR_W * 0.6 - shift) })
  c.scroll("_near_ridge", HORIZON - 25, 0, { x: Math.round(P.vp - FAR_W * 0.6 - shift * 1.25) })
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
sprite("_rf_y_12", { mx: true, pivot: "bottom" }, `
  ...ggg
  ..Jzzz
  .JJJJJ
  J99JJJ
  -jjjjj
  0-....`)
sprite("_rf_y_8", { mx: true, pivot: "bottom" }, `
  ..gg
  .Jzz
  J9JJ
  -0..`)
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
for (const n of ["12", "8"]) { sprite("_rf_r_" + n, { base: "_rf_y_" + n, swap: RED }); sprite("_rf_b_" + n, { base: "_rf_y_" + n, swap: BLUE }) }
// the flank, for when one draws level: the haunch lit along its shoulder, the side intakes' strakes,
// the rear wheel seen from the side, rim and hub; drawn for the car's left side, flipped for its right
sprite("_rs_y_64", { pivot: "bottom" }, `
  ............
  ............
  ............
  ............
  ............
  ............
  ............
  ............
  ............
  ............
  ............
  ............
  ............
  ............
  000000000000
  0ggggggggggg
  0JJJJJJJJJJJ
  0JDDDDDDDJJJ
  0JJJJJJJJJJJ
  0JDDDDDDDJJJ
  0jjjjjjjjjjj
  0jDDDDDDDjjj
  0jjj0000jjjj
  0jj0----0jjj
  0j0-WWWW-0jj
  0D0W~--~W0DD
  0D0W-ww-W0DD
  0D0W-ww-W0DD
  0D0W~--~W0DD
  0D0-WWWW-0DD
  .00------000
  ..0------0..
  ..0------0..
  ...0----0...
  ....0000....
  ............`)
sprite("_rs_y_48", { pivot: "bottom" }, `
  .........
  .........
  .........
  .........
  .........
  .........
  .........
  .........
  .........
  .........
  .........
  .........
  000000000
  0gggggggg
  0JJJJJJJJ
  0JDDDDDJJ
  0jjjjjjjj
  0jDDDDDjj
  0jj000jjj
  0j0---0jj
  0D0WWW0DD
  0D0WwW0DD
  0D0W-W0DD
  0D0WWW0DD
  .00---000
  ..0---0..
  ...000...
  .........`)
for (const n of ["64", "48"]) { sprite("_rs_r_" + n, { base: "_rs_y_" + n, swap: RED }); sprite("_rs_b_" + n, { base: "_rs_y_" + n, swap: BLUE }) }

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
// a rival on the road: the shade right under it; the flank on the side we see when it is near and off to
// one side; then the drawing, which bobs a pixel now and then on its springs when it is near; the red
// one's pipes backfire
function rival(c, r, z, f) {
  const x = cx(r.lane, z + 0.2, f), sc = P.scale(z + 0.2, x), [sx, sy] = P.ground(x, z + 0.2).map(Math.round), w = 1.9 * sc
  const [name, dw, dh] = RV.reduce((a, b) => (Math.abs(b[2] - 1.07 * sc) < Math.abs(a[2] - 1.07 * sc) ? b : a))
  c.ellipse(sx, sy, Math.round(w * 0.56), Math.max(1, Math.round(w * 0.05)), "Q")
  const bob = sc > 18 && (f + r.pass * 5) % 8 < 2 ? 1 : 0
  if ((name === "64" || name === "48") && Math.abs(x) > 1.2 && Math.abs(x) / Math.max(1, z) > 0.2) {
    const sw = name === "64" ? 12 : 9, side = x > 0 ? -1 : 1
    c.stamp(`_rs_${r.color}_${name}`, sx + side * (Math.floor(dw / 2) + sw / 2 - 1), sy + 1 - bob, side > 0 ? { flip: "x" } : undefined)
  }
  c.stamp(`_rv_${r.color}_${name}`, sx, sy + 1 - bob)
  backfire(c, sx, sy, w, r, f)
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
      c.stamp(`_rf_${r.color}_*`, px, py + 1, { fit: Math.max(2, Math.round(1.07 * sc)) })
    }
  })

// ---------------------------------------------------------------- the cockpit
// The roof's edge with the sun visor down, the A-pillars, the dash with its hood over the gauges, the
// door on the left and the console on the right. The glass is left empty: the view shows through.
sprite("_cockpit", { w: W, h: H }, (c) => {
  // roof liner and the visor down on the driver's side
  c.rect(0, 0, W, 6, "-"); c.hline(0, 6, W, "="); c.hline(0, 7, W, "0")
  c.poly([24, 0, 132, 0, 128, 15, 30, 13], "~"); c.poly([30, 13, 128, 15, 128, 16, 30, 14], "-"); c.hline(34, 2, 90, "=")
  // the mirror: housing, stem, glass (empty here: the mirror's view goes under)
  c.rect(156, 0, 8, 4, "-"); c.rect(125, 3, 70, 16, "0"); c.rect(126, 4, 68, 14, "-"); c.hline(127, 4, 66, "~")
  c.rect(128, 5, MW + 2, MH + 2, "0"); c.rect(129, 6, MW, MH, "_")
  // A-pillars, wide at the foot; beyond them the side windows, whose sills run down to the doors
  c.poly([0, 0, 22, 0, 52, 106, 36, 112, 0, 112], "=") ; c.poly([0, 0, 14, 0, 36, 104, 0, 104], "_")
  c.poly([22, 0, 26, 0, 54, 104, 52, 106], "~")
  c.poly([W, 0, W - 22, 0, W - 52, 106, W - 36, 112, W, 112], "="); c.poly([W, 0, W - 14, 0, W - 36, 104, W, 104], "_")
  c.poly([W - 22, 0, W - 26, 0, W - 54, 104, W - 52, 106], "~")
  // the doors: the window's sill, the panel, the handle; the console on the right with its vents
  c.poly([0, 100, 36, 104, 40, H, 0, H], "-"); c.hline(0, 100, 36, "^"); c.rect(8, 128, 18, 3, "~"); c.rect(10, 129, 14, 1, "0")
  c.poly([W, 100, W - 36, 104, W - 40, H, W, H], "-"); c.hline(W - 36, 100, 36, "^")
  // the dash: across under the glass, its top edge catching the sun, the hood over the gauges
  c.poly([30, 112, 112, 106, 124, 99, 196, 99, 208, 106, 290, 112, W - 30, H, 30, H], "-")
  c.hline(36, 111, 76, "%"); c.hline(208, 106, 0, "%"); c.line(112, 106, 124, 99, "%"); c.hline(124, 99, 73, "%"); c.line(196, 99, 208, 106, "%"); c.line(208, 106, 290, 112, "%")
  c.line(36, 112, 112, 107, "~"); c.line(208, 107, 288, 113, "~"); c.hline(125, 100, 71, "~")
  // the binnacle: dark under its hood, the two gauges and the readout between
  c.rect(122, 101, 76, 26, "0")
  for (const gx of [139, 181]) {
    c.circ(gx, 115, 12, "-"); c.ring(gx, 115, 12, "~"); c.circ(gx, 115, 10, "0")
    for (let i = 0; i <= 8; i++) { const a = Math.PI * (0.8 + (i / 8) * 1.4), r0 = i % 2 ? 8 : 7; c.line(Math.round(gx + Math.cos(a) * r0), Math.round(115 + Math.sin(a) * r0), Math.round(gx + Math.cos(a) * 9), Math.round(115 + Math.sin(a) * 9), ")") }
    c.px(gx + 7, 117, "(")
  }
  c.rect(152, 106, 16, 14, "-"); c.rect(153, 107, 14, 12, "0")
  // the console, the vents, the start button
  c.rect(228, 118, 40, 20, "-"); for (let y = 121; y < 135; y += 3) c.hline(231, y, 34, "0"); c.circ(250, 146, 3, "("); c.px(249, 145, ")")
  // stitching along the dash
  for (let x = 40; x < 280; x += 4) if (x < 120 || x > 200) c.px(x, x < 160 ? 116 - Math.round((x - 40) / 16) : 111 + Math.round((x - 200) / 16), "(")
})

// ---------------------------------------------------------------- the driver
// The wheel turns with the bend and with every change of lane; the hands go round with it at ten to
// two, the forearms in the blue suit painted round. The gauges' needles: the revs flutter, the speed
// holds about 200; the ribbons from the mirror swing against the turn.
const steer = (f) => {
  const s = (f / FRAMES) * SECONDS, h = 0.02
  const lat = (ourX(((s + h) / SECONDS) * FRAMES) - 2 * ourX(f) + ourX(((s - h) / SECONDS) * FRAMES)) / (h * h)
  return kappa(f) * 90 + lat * 0.05
}
const WHEEL = { x: 160, y: 188, rx: 82, ry: 60 }
const onRim = (a, inset = 0) => [WHEEL.x + (WHEEL.rx - inset) * Math.cos(a), WHEEL.y - (WHEEL.ry - inset) * Math.sin(a)]
function wheel(c, f) {
  const turn = steer(f), R = (v) => Math.round(v)
  // the spokes from the hub to the rim, left, right and down; the hub with its badge
  for (const a of [Math.PI + 0.2, -0.2, -Math.PI / 2]) {
    const [x0, y0] = onRim(a - turn, 60), [x1, y1] = onRim(a - turn, 6)
    c.line(R(x0), R(y0), R(x1), R(y1), "=", 9); c.line(R(x0), R(y0) - 3, R(x1), R(y1) - 3, "~", 2)
  }
  c.ellipse(WHEEL.x, WHEEL.y, 20, 14, "-"); c.ellipse(WHEEL.x, WHEEL.y - 1, 16, 10, "="); c.ellipse(WHEEL.x, WHEEL.y - 3, 5, 3, "(")
  // the rim, 9 px of leather: dark under, lit on top, the red mark at the top
  for (let i = 0; i < 720; i++) {
    const a = (i / 720) * TAU, [x, y] = onRim(a), [xi, yi] = onRim(a, 9), up = Math.sin(a)
    c.line(R(x), R(y), R(xi), R(yi), up > 0.3 ? "=" : "-")
    if (up > 0.15) { const [xl, yl] = onRim(a, 2); c.px(R(xl), R(yl), up > 0.6 ? "^" : "~") }
  }
  for (let i = -6; i <= 6; i++) { const a = Math.PI / 2 - turn + i * 0.011, [x, y] = onRim(a), [xi, yi] = onRim(a, 9); c.line(R(x), R(y), R(xi), R(yi), "(") }
  // the hands at ten to two, gripping the rim: the forearms first, then the gloves over the rim
  for (const [a0, toward] of [[Math.PI * 0.8, [18, 200]], [Math.PI * 0.2, [302, 200]]]) {
    const [x, y] = onRim(a0 - turn, 4)
    c.capsule(toward[0], toward[1], 18, x, y + 8, 8, "<>/", { light: [0.3, -1] })
    const mx = (toward[0] + x) / 2, my = (toward[1] + y) / 2
    c.line(R(toward[0] + (x - toward[0]) * 0.15), R(toward[1] - 10 + (y - toward[1]) * 0.15), R(x + (toward[0] - x) * 0.1), R(y + 2), "w", 2)
    c.line(R(mx - 5), R(my + 2), R(mx + 3), R(my - 4), "<")
    c.rect(R(x) - 9, R(y) + 6, 18, 5, "{"); c.hline(R(x) - 9, R(y) + 6, 18, "(")
    c.ellipse(R(x), R(y), 12, 9, "]"); c.ellipse(R(x) - 1, R(y) - 2, 9, 5, "}"); c.ellipse(R(x), R(y) - 1, 9, 5, "]")
    c.hline(R(x) - 8, R(y) + 1, 17, "{")
    for (let k = 0; k < 4; k++) {
      const fx = R(x) - 8 + k * 5
      c.rect(fx, R(y) - 8, 4, 4, "]"); c.hline(fx, R(y) - 8, 4, "}"); c.vline(fx + 4, R(y) - 8, 4, "0")
    }
    c.rect(R(x) + (a0 > Math.PI / 2 ? 9 : -12), R(y) - 3, 4, 6, "]"); c.px(R(x) + (a0 > Math.PI / 2 ? 10 : -11), R(y) - 3, "}")
  }
}
function needles(c, f) {
  const rev = 0.72 + 0.04 * Math.sin((TAU * f * 52) / FRAMES) + 0.06 * Math.sin((TAU * f * 3) / FRAMES), kmh = 200 + 4 * Math.sin((TAU * f) / FRAMES * 2)
  for (const [gx, v] of [[139, rev], [181, kmh / 300]]) {
    const a = Math.PI * (0.8 + v * 1.4)
    c.line(gx, 115, Math.round(gx + Math.cos(a) * 9), Math.round(115 + Math.sin(a) * 9), "["); c.px(gx, 115, "~")
  }
  c.text(154, 109, String(Math.round(kmh)), ")"); c.text(158, 116, "6", "(")
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
