// A drive along a winding road from a truck's cab: a valley in the far north at midwinter noon, the sun 12
// degrees up behind a thin overcast, snowing in a wind, spruces heavy with snow swaying, a red house on the
// outside of a bend, snow poles. The road is laid out once by its sections (straight, a right bend, straight,
// the left bend that turns us back, straight); a camera each frame takes those still ahead of it as
// perspective({ bend: [[z, k], ...] }). Everything along the road is laid in meters as if it ran straight
// (u across it from its middle, z ahead, up), and that camera bends it all alike: the ground (plane), the
// shadows, the house's faces and the firs and poles among them (mesh). The far things sit on directions
// (toward, ray), which don't bend: they turn by our heading instead.
include("../../lib/nature/kit.px.js", { as: "nature" })          // make3d.spruce: the kit's conifer in 3D
const PAL = {
  // an overcast sky, top down, the glow round the sun, its pale disc; the range fading into the snow
  1: "#7d8ca6", 2: "#8e9cb4", 3: "#a0acc1", 4: "#b3bdcd", 5: "#c5cdd9", 6: "#d6dce4", 7: "#e8ebee", 8: "#f6f6f1", M: "#cdd4df", m: "#b4bdcc", n: "#9aa5b9",
  // snow: a glint, lit, rough or far, the haze; facing away from the sun (a shadow's soft edge), in shadow
  x: "#ffffff", w: "#e8edf2", W: "#d9e0e9", v: "#cdd4df", B: "#c0cadb", b: "#a9b7cf",
  // the road: asphalt, wet tracks, the sky in meltwater, slush, grit, packed snow, a track in shade,
  // spindrift over it thin and thicker; paint
  a: "#4c4d5a", q: "#40414e", Q: "#9aa9c4", g: "#8d8a88", r: "#5e5550", s: "#cdd3dc", A: "#393a4a", c: "#5d606e", C: "#717586", l: "#eef0f2", L: "#9aa6be", y: "#e2b84a", Y: "#a07c3a",
  // spruce needles dark to lit, bark; a snow pole lit and in shade
  f: "#0f2420", F: "#18372c", e: "#28503a", E: "#4b7350", t: "#2e2224", T: "#5a4038", o: "#e4642a", O: "#a04020",
  // the house: Falu red, white trim, the door, lamplit glass and a dark pane, stone, brick, logs' ends
  D: "#4a1820", R: "#6c2027", h: "#8e2c2a", H: "#b23a2c", i: "#9aa3bd", I: "#e9e6de", u: "#26303e",
  z: "#ffd27a", Z: "#f0a050", j: "#6b7fa8", p: "#4e505e", P: "#7d7f8c", K: "#7a3a30", G: "#b08a5c", N: "#4a3426",
}
pal(PAL)

const W = 320, H = 180, FPS = 16, FRAMES = 160, R = Math.round, DEG = Math.PI / 180
// 20 m/s (72 km/h): 200 m a loop in 10 s, room for an S and the straights round it. Everything along the
// road repeats every LOOP_M, so it comes round. Past FAR m it is off the picture. We drive the right lane.
const LOOP_M = 200, FAR = 140, LANE = 1.75
// The road by its curvature along it ([m along, 1/m]): straight, a right bend of 50 m at 0.01 (a radius of
// 100 m: it turns us 0.5 rad, 29 degrees, a road's bend at 72 km/h), 40 m straight, the left bend that
// turns us back, straight: its turns sum to 0, so the heading is back to 0 when the loop closes.
const K = 0.01, WAY = [[0, 0], [30, K], [80, 0], [120, -K], [170, 0]]
// s m along: the sections still ahead of us as perspective()'s bend takes them (this lap's and the next's, so the
// bend past the loop's end shows) and our heading, radians to the right (k times the length of each section behind)
const way = road(WAY, LOOP_M)
// The eye 2.5 m up (a cab: from a car's 1.4 m a bend ahead lies in a few rows and hardly reads), 70 degrees
// across. The sun 20 degrees left of the first straight, 12 up: turned right by our heading, it is further left.
const VIEW = { w: W, horizon: 58, eye: 2.5, fov: 70 }, SUN_AZ = -20 * DEG, LIGHT = [-1, -0.3]
const SUN0 = [Math.sin(SUN_AZ), Math.cos(SUN_AZ), Math.tan(12 * DEG)]          // the sun at heading 0 (the firs are lit by it)
const WIND = [0.68, 0.73]                     // the way the wind blows on the ground (across, along): from behind us on the left
// Each frame makes its camera (P, from the sections ahead) and its sun (turned by our heading), passed to all
// below that reads them (made in the frame, not kept in a file-level let: so pxl keeps the frames it builds)
const look = (s) => {
  const { bend, heading: hd } = way(s), az = SUN_AZ - hd, v = [Math.sin(az), Math.cos(az), Math.tan(12 * DEG)]
  const P = perspective({ ...VIEW, bend }), SUN_N = v.map((x) => x / Math.hypot(...v))
  return { P, hd, SUN_N, SUN_COL: P.toward(SUN_N)?.[0] ?? -999, BANK_SH: (0.9 * -v[0]) / v[2] }
}
// a value between tones, dithered only near the step up to the next (soft bands, not noise)
const tone = (v, x, y) => { const k = Math.floor(v), t = v - k; return k + (t > 0.6 && bayer(x, y) < (t - 0.6) / 0.4 ? 1 : 0) }
// m from a place along the loop, -100 to 100 (the way round that is shorter)
const wrap = (v) => ((((v % LOOP_M) + LOOP_M * 1.5) % LOOP_M) - LOOP_M / 2)

// ================================================================ far off: the sky, the range, the sun
// by the way each pixel looks (ray): lighter toward the horizon and the sun; the range, 10 km off, by the
// world's direction (the ray's turned by our heading): it slides across as we turn, and comes back
function sky(c, { P, hd, SUN_N }) {
  for (let y = 0; y <= P.horizon; y++) for (let x = 0; x < W; x++) {
    const r = P.ray(x, y), up = Math.asin(r[2]) / DEG, apart = Math.acos(r[0] * SUN_N[0] + r[1] * SUN_N[1] + r[2] * SUN_N[2]) / DEG
    c.px(x, y, String(Math.min(7, Math.max(1, tone(5.6 - up / 6 + Math.max(0, 1.4 - apart / 22), x, y)))))
  }
  const height = (a) => 4 + 12 * (1 - Math.abs(2 * vnoise(a * 9, 3) - 1)) + 2 * vnoise(a * 40, 5)
  for (let x = 0; x < W; x++) {
    const a = Math.atan2(...P.ray(x, P.horizon)) + hd, hx = height(a), top = R(P.horizon - hx), slope = height(a + 0.01) - height(a - 0.01)
    for (let y = top; y <= P.horizon; y++)
      c.px(x, y, P.horizon - y < hx * 0.3 + 2 * vnoise(a * 107, 9) ? "n" : slope > 0.3 && y - top < 1 + slope * 3 ? "M" : "m")
  }
  const [sx, sy] = P.toward(SUN_N).map(R)
  c.circ(sx, sy, 5, "7"); c.circ(sx, sy, 3, "8")                          // the sun, a pale disc through the cloud
}

// ================================================================ the firs, in 3D
// The kit's spruce (make3d.spruce: a trunk, tiers of drooping bough clumps, a spire; here a leader joins
// its knots), 10.5 m tall, 4 m across, sunk 1.2 m in the snow (the drift and well at its foot are the
// ground's, plane below). Snow wherever a bough faces up (paint by the normal), thinner where the wind
// took it. Drawn by surface(), lit by the veiled sun from behind on the left: shaded boughs, lit rims. Lit
// once, by the sun at heading 0: under this overcast a turn of 29 degrees doesn't show in it.
const FIR_M = 10.5, NEEDLES = { needles: { ramp: "fFeE", strokes: 4 / 24, hem: 2 }, bark: "tT", snow: "bBWw" }
const firField = (seed) => make3d.spruce({ h: 150, seed, sway: 0 }).field.scale([1.75, 1.75, 1.6]).at(0, 0, -1.2)
  .union(sdf.cone(0.16, 1.9, 0).at(0, 0, 8).mat("needles")).paint("snow", (p, n) => n[2] > 0.3 + 0.35 * vnoise(2 * (p[0] + p[1]), 3 * p[2], seed))
// A ladder of sizes, drawn once and picked by distance: a rung for each px of height up to 53 px, then
// one for each step a fir grows from one frame to the next there (1.25 m nearer a frame, it grows
// h²/1900 px: 5 px at 100, 20 at 200), so changing rungs it never jumps more than it grows. Two firs.
// The small rungs, the far firs, fade toward the sky's color a little more each rung down (the falling
// snow between). Each rung sways in 2D (effect "sway", whole px, its foot still), (h - 30) / 60 px at the
// top: 1 px at 90 px tall, 2 at 150, none far off (a px kinks the spire), once in 2 s, 5 times a loop.
const RUNGS = [], mix = (a, b, t) => "#" + [1, 3, 5].map((i) => R(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t).toString(16).padStart(2, "0")).join("")
for (let h = 10; h <= 300; h += Math.max(1, R((h * h) / 1900))) RUNGS.push(h)
for (const seed of [3, 9]) {
  const field = firField(seed)
  for (const h of RUNGS) {
    const ppm = h / FIR_M, w = Math.ceil(4.6 * ppm) + 4, haze = Math.max(0, (70 - h) / 60) * 0.65
    const swap = haze ? Object.fromEntries([..."fFeEtTbBWw"].map((k) => [k, mix(PAL[k], PAL[5], haze)])) : undefined
    sprite(`_fir${seed}_${h}`, { w, h: h + 2, pivot: "bottom", swap }, surface(field, { view: { kind: "side", pitch: 4 }, ppm, at: [w / 2, h + 1],
      light: SUN0, soft: 0.8, rim: 0.6, shadows: false, outline: false, mats: NEEDLES }))
    anim(`_firw${seed}_${h}`, { base: `_fir${seed}_${h}`, frames: 32, fps: FPS }, effect("sway", { amount: Math.max(0, Math.min(4, (h - 30) / 60)), still: R(h * 0.12), lean: 0.4 }))
  }
}
const firName = (seed, px) => `_firw${seed}_${RUNGS.reduce((a, b) => (Math.abs(b - px) < Math.abs(a - px) ? b : a))}`

// ================================================================ the road and the snow
const EDGE = 3.3, ROAD = 3.5, SHOULDER = 4.3, CREST = 5.2, BANK = 6.4             // m from the road's middle
// A line along the road steps sideways from one row of the picture to the next: by the perspective
// (off to the side, it runs out to the vanishing point), and more where the road bends across the
// view. Sampled per pixel it breaks into dots unless each row's run of it is as long as that step, so
// its width is the larger of its own and that step (at least 0.6 px), in meters where it is.
const step = (P, x, z) => { const [c0, r0] = P.ground(x, z), [c1, r1] = P.ground(x, z * 1.02); return Math.abs((c1 - c0) / (r1 - r0)) }
const wide = (P, w, x, z) => Math.max(w, Math.max(0.6, step(P, x, z)) / P.scale(z, x))
const on = (P, u, z, w, ...at) => at.some((a) => Math.abs(u - a) < 1 && Math.abs(u - a) < wide(P, w, a - LANE, z) / 2)
// the house: m along the loop (in the right bend, on its outside: the left), m across; SIDE: which side
const HOUSE = { at: 58, u: -13.5 }, SIDE = Math.sign(HOUSE.u), ROW1 = VIEW.eye * (W / 2 / Math.tan(35 * DEG))
// s: how far we have gone; p = z + s, a place along the road round the loop (0 to 200 m): each mark repeats
// a whole number of times in it, the noise along it closed over it (seamless). Each mark in the snow has a
// cause, and only near, where it is a px or more: past 30 m the snow is its tone by distance alone.
const loopNoise = (k) => seamless((p, v) => vnoise(p * k, v), LOOP_M)
const N = { crest: loopNoise(1 / 5), spray: loopNoise(1.5), grit: loopNoise(1 / 3), rip: loopNoise(1 / 7), rip2: loopNoise(1 / 3) }
// spindrift: the wind combs loose snow off the left bank across the lanes in streamers along its way,
// one every 0.7 m, each a row thick on the picture (a line lying across the view: z² / (focal · eye) m
// deep), broken where the gusts drop it and feathered at its ends, thinning out by the middle and far
// off; a step or two over the asphalt, which shows through its gaps. Its breaks slide 6 m/s, 60 m a loop.
const SPIN = seamless((a, k) => vnoise(a / 1.5, k), 60)
const streamer = (u, p, t, z, col, row) => {
  const dens = Math.min(1, Math.max(0, (2.5 - u) / 6)) * (1 - z / 24), a = u * WIND[0] + p * WIND[1]
  if (dens <= 0) return ""
  const c = p * WIND[0] - u * WIND[1] + 0.12 * Math.sin((a * Math.PI) / 6), k = Math.floor(c / 0.7)
  if (c - 0.7 * k > (1.2 * WIND[0] * z * z) / ROW1) return ""
  const on = SPIN(a - 6 * t, k * 1.7) - (0.8 - 0.7 * dens)
  return on > 0.08 || (on > 0 && bayer(col, row) < on / 0.08) ? (on > 0.2 && u < -1.5 ? "C" : "c") : ""
}
const ground = (V, s) => (x, z, col, row) => {
  const u = x + LANE, au = Math.abs(u), p = (z + s) % LOOP_M, near = z < 30, crest = CREST + 0.3 * N.crest(p, 3)
  // a bank 0.9 m high throws its shadow BANK_SH m to the right (the left one's onto the road's edge)
  const key = paint(V, u, au, p, z, col, row, crest, near, s / 20)
  return (u < 0 ? u > -crest && u < V.BANK_SH - crest : u > crest && u < crest + V.BANK_SH) && SHADE[key] && !(u < 0 && au > SHOULDER) ? SHADE[key] : key
}
const paint = ({ P, SUN_N, SUN_COL }, u, au, p, z, col, row, crest, near, t) => {
  if (au < ROAD || (z > 70 && au < wide(P, 2 * ROAD, -LANE, z) / 2)) {
    if (z > 70) return "a"                                                       // far, the road is a thin line itself
    if (on(P, u, z, 0.15, EDGE, -EDGE)) return "l"                               // the edge lines
    if (au > EDGE) return "s"                                                    // packed snow outside them, where no tyre goes
    if (on(P, u, z, 0.12, 0) && p % 10 < 3) return "y"                           // the centre line, 3 m in 10
    const sp = streamer(u, p, t, z, col, row); if (sp) return sp
    // the tyres keep two tracks wet; far off toward the sun the meltwater in them mirrors the bright sky
    if (on(P, u, z, 0.3, 0.95, 2.55, -0.95, -2.55)) return z > 30 && Math.abs(col - SUN_COL) < z / 4 ? "Q" : "q"
    return "a"
  }
  const a = (u - HOUSE.u) * SIDE, b = wrap(p - HOUSE.at)
  if (u * SIDE > SHOULDER && a < -2.5 && b > -5 && b < 4 && (a > -5.5 || (b > -0.5 && b < 3))) return yard(a, b, z)
  // slush, the sander's grit churned into streaks along it by the tyres
  if (au < SHOULDER) return on(P, u, z, 0.06, 3.75, 4.05, -3.75, -4.05) && N.grit(p, au * 3) > 0.45 ? "r" : "g"
  if (au < BANK) {
    // the ploughed bank: its face to the road turned to the sun on the right, away on the left; the
    // tyres' spray greys its foot; chunks the plough threw lie on it, each lit on its left
    const inner = au < crest, lit = u > 0 === inner
    if (inner && au < SHOULDER + 0.1 + 0.25 * N.spray(p, 2)) return lit ? "W" : "B"
    if (near && hash(R(u * 3), R(p * 3), 3) > 0.8) { const fu = u * 3 - R(u * 3), fp = p * 3 - R(p * 3); if (fu * fu + fp * fp < 0.12) return fu > 0 ? "B" : "w" }
    return lit ? "w" : "B"
  }
  // the open snow, hazier far off, the firs' drifts and wells in it (below); near, the wind's ripples
  // (each one's lee a step down, over the drifts too), a ski trail on the left (two grooves, the poles'
  // marks beside them), a fox's line of prints on the right, a rare glint toward the sun
  const ski = -7.6 - 0.8 * Math.sin((p * Math.PI) / 20), fox = 8.5 + 2.5 * Math.sin((p * Math.PI) / 10)
  if (z < 50 && (on(P, u, z, 0.07, ski - 0.1, ski + 0.1) || (z < 20 && p % 1.6 < 0.12 && on(P, u, z, 0.08, ski - 0.6, ski + 0.6)))) return "B"
  const lv = z < 45 ? drift(u, p, col, row, SUN_N) : 2
  if (!near) return lv !== 2 ? "BWwx"[lv] : "wWv"[Math.min(2, Math.max(0, tone(Math.log2(z / 30), col, row)))]
  if (z < 20 && Math.abs(u - fox) < 0.07 && p % 0.4 < 0.12) return "B"
  // (a ripple every 2 m, 100 to the loop, drawn only where it spans a row: z² / (focal · eye) m)
  const ph = (0.6 * u) / 1.3 + 0.5 * p + 0.8 * N.rip(p, u / 7), f = ph - Math.floor(ph), row1 = (z * z) / ROW1
  if (row1 < 0.3 && f < Math.max(row1, 0.3 * N.rip2(p, u / 3))) return "BWwx"[Math.max(0, lv - 1)]
  return lv === 2 && Math.abs(col - SUN_COL) < 60 && f < 0.5 && hash(R(u * 12), R(p * 12), 4) > 0.993 ? "x" : "BWwx"[lv]
}
// The snow round each fir, m over the field: a drift on its lee, long downwind and short upwind, and the
// well at its trunk, the hollow the boughs kept the snow from. Painted in the ground by the fir's place
// along the road, it rides the bends under it; lit by how its slope lies to this frame's sun (half the
// light the sky's), it is the field's own snow, feathering into it.
const heap = (u, p) => { let h = 0
  for (let i = Math.floor(p / 5) - 2; i <= Math.floor(p / 5) + 1; i++) for (const f of SLOT[(i + 2 * SLOT.length) % SLOT.length]) {
    const du = (u - f.u) / f.k, dp = wrap(p - f.p) / f.k, a = du * WIND[0] + dp * WIND[1], c = dp * WIND[0] - du * WIND[1]
    if (a > -3 && a < 10 && Math.abs(c) < 4) h += f.k * (0.6 * Math.exp(-((c / (1.1 + 0.25 * Math.max(0, a))) ** 2) - (a > 0 ? a / 3 : (a / 0.8) ** 2)) - 0.55 * Math.exp(-(du * du + dp * dp) / 0.7))
  }
  return h
}
const drift = (u, p, col, row, SUN_N) => {
  const h = heap(u, p), gu = (heap(u + 0.08, p) - h) / 0.08, gp = (heap(u, p + 0.08) - h) / 0.08, [Lu, Lp, Lz] = SUN_N
  const lit = 0.5 + (0.5 * (Lz - Lu * gu - Lp * gp)) / Lz / Math.hypot(gu, gp, 1)
  return Math.min(3, Math.max(0, tone(4 * (lit - 0.5), col, row)))           // B, W, w (flat), x (toward the sun)
}
// the house's yard, ploughed to packed snow from the road: a berm heaped where the blade turned, the
// car's ruts slushy, cut into the snow only where they span a row of the picture or more
const yard = (a, b, z) => {
  const edge = a > -5.5 ? Math.min(b + 5, 4 - b, b > -0.5 && b < 3 ? 9 : a + 5.5) : Math.min(b + 0.5, 3 - b)
  return edge < 0.4 ? "w" : z * z < ROW1 * 0.3 && (Math.abs(b - 0.3) < 0.15 || Math.abs(b - 2) < 0.15) ? "g" : "s"
}
// what each color of the ground turns into in a shadow and at its soft edge: faint, the sun behind cloud
const SHADE = { x: "B", w: "B", W: "B", v: "B", B: "b", s: "B", a: "q", q: "A", Q: "q", c: "a", C: "c", g: "P", r: "p", l: "L", y: "Y" }
const SOFT = { x: "W", w: "W", s: "W" }

// ================================================================ the house, in 3D
// A red timber house in meters, model() faces drawn by mesh() with the firs and poles among them, so each
// hides what is behind it: walls 6 m by 5 on a stone plinth, a roof pitched 40 degrees under 25 cm of snow,
// its eaves 45 cm out (their shadow on the walls is mesh()'s), white corner boards and window frames, a
// door to the yard, the lamp lit inside, a chimney, icicles, a woodpile against the gable, a drift up it.
// On the bend's outside, it stands ahead of us coming in, gable and side in view, and swings by as we turn.
const house = (m, d, thin, cast) => {
  const X = HOUSE.u - LANE, q = (a, b, up) => [X + a * SIDE, d + b, up]          // a across (to the road -), b along (to us -)
  const quad = (mat, ...pts) => m.face(mat, ...pts.map((v) => q(...v)))
  const sq = (a0, b0, a1, b1) => [q(a0, b0), q(a1, b0), q(a1, b1), q(a0, b1)].map(([x, z]) => [x, z])
  const box = (a0, b0, a1, b1, u0, u1) => solid.box([Math.min(X + a0 * SIDE, X + a1 * SIDE), d + b0, Math.max(X + a0 * SIDE, X + a1 * SIDE), d + b1, u0, u1], { ghost: true })
  const TOP = 3.4, RIDGE = TOP + 2.5 * 0.84, EAVE = TOP - 0.45 * 0.84
  m.prism("stone", "stone", sq(-2.55, -3.05, 2.55, 3.05), 0, 0.5)
  m.prism("wall", "wall", sq(-2.5, -3, 2.5, 3), 0.5, TOP)
  for (const b of [-3, 3]) quad("wall", [-2.5, b, TOP], [2.5, b, TOP], [0, b, RIDGE])
  for (const sg of [-1, 1]) {
    const E = sg * 2.95
    quad("roof", [E, -3.35, EAVE + 0.25], [0, -3.35, RIDGE + 0.25], [0, 3.35, RIDGE + 0.25], [E, 3.35, EAVE + 0.25])   // the snow on the slope
    quad("snowedge", [E, -3.35, EAVE + 0.1], [E, 3.35, EAVE + 0.1], [E, 3.35, EAVE + 0.25], [E, -3.35, EAVE + 0.25]) // its edge over the eave
    quad("snowedge", [E, -3.35, EAVE + 0.1], [0, -3.35, RIDGE + 0.1], [0, -3.35, RIDGE + 0.25], [E, -3.35, EAVE + 0.25])
    quad("trim", [E, -3.36, EAVE - 0.08], [0, -3.36, RIDGE - 0.08], [0, -3.36, RIDGE + 0.1], [E, -3.36, EAVE + 0.1])   // the barge board
    quad("soffit", [E, -3.35, EAVE], [sg * 2.5, -3.35, EAVE], [sg * 2.5, 3.35, EAVE], [E, 3.35, EAVE])               // under the eave
    quad("soffit", [E, -3.35, EAVE], [0, -3.35, RIDGE], [0, -3, RIDGE], [E, -3, EAVE])                               // under the gable's overhang
    for (const b of [-3, 3]) m.stick("trim", q(sg * 2.5, b, 0.5), q(sg * 2.5, b, TOP), thin(0.07))                  // corner boards
  }
  // windows: a white frame, the pane, a cross of glazing bars; on the road's side (a = -2.5) or the gable
  const pane = (side, c, w, u0, h, mat) => {
    const at = (o, t, v) => (side ? q(-2.5 - o, c + t, v) : q(c + t, -3 - o, v))
    m.face("trim", at(0.03, -w / 2 - 0.09, u0 - 0.09), at(0.03, w / 2 + 0.09, u0 - 0.09), at(0.03, w / 2 + 0.09, u0 + h + 0.09), at(0.03, -w / 2 - 0.09, u0 + h + 0.09))
    m.face(mat, at(0.06, -w / 2, u0), at(0.06, w / 2, u0), at(0.06, w / 2, u0 + h), at(0.06, -w / 2, u0 + h))
    m.stick("trim", at(0.08, 0, u0), at(0.08, 0, u0 + h), thin(0.03)); m.stick("trim", at(0.08, -w / 2, u0 + h * 0.6), at(0.08, w / 2, u0 + h * 0.6), thin(0.03))
  }
  pane(true, -1.7, 1, 1.3, 1.2, "glass"); pane(true, 2.3, 0.8, 1.3, 1.2, "glass"); pane(false, -1.1, 0.9, 1.3, 1.2, "glass"); pane(false, 0, 0.6, 3.7, 0.8, "dark")
  // the door, in its frame, over a stone step swept clear
  quad("trim", [-2.53, 0.3, 0.5], [-2.53, 1.4, 0.5], [-2.53, 1.4, 2.7], [-2.53, 0.3, 2.7])
  quad("door", [-2.56, 0.4, 0.5], [-2.56, 1.3, 0.5], [-2.56, 1.3, 2.6], [-2.56, 0.4, 2.6])
  m.prism("stone", "stone", sq(-3.2, 0.2, -2.5, 1.5), 0, 0.45)
  // the chimney out of the slope away from the road, a cap of snow
  m.prism("brick", "brick", sq(0.6, 0.9, 1.2, 1.5), 4.2, 6.1); m.prism("roof", "snowedge", sq(0.55, 0.85, 1.25, 1.55), 6.1, 6.25)
  // a few icicles on the eave where the roof's melt froze dripping: wherever a drip fell, most short
  for (let k = 0; k < 7; k++) { const b = -3.1 + 6.2 * hash(k, 5); m.stick("ice", q(-2.95, b, EAVE + 0.1), q(-2.95, b, EAVE - 0.05 - 0.7 * hash(k, 6) ** 3), thin(0.025)) }
  // the woodpile under the gable's eave, its logs' ends to us, snow on it; by it the chopping block, a
  // round sawn and cut on top, and a round not yet split under snow; the drift the wind heaped up the gable
  const round = (a, b, r) => Array.from({ length: 8 }, (_, k) => q(a + r * Math.cos((k * Math.PI) / 4), b + r * Math.sin((k * Math.PI) / 4)).slice(0, 2))
  m.prism("logs", "logs", sq(0.6, -3.65, 2.3, -3.05), 0, 1.2); m.prism("roof", "snowedge", sq(0.55, -3.7, 2.35, -3.05), 1.2, 1.35)
  m.prism("cut", "brick", round(2.8, -4.1, 0.24), 0, 0.45); m.prism("brick", "brick", round(2.25, -4.5, 0.18), 0, 0.28); m.prism("roof", "snowedge", round(2.25, -4.5, 0.19), 0.28, 0.36)
  m.loft("drift", [-2.9, -1.2, 0.25].map((a, k) => [q(a, -3.02, [1.0, 1.2, 0.6][k]), q(a, -3.5, [0.75, 0.9, 0.42][k]), q(a, [-4.7, -4.5, -3.9][k], 0)]))
  // its shadow: the walls, the roof, the chimney, the woodpile (f m wider at the soft edge), each cut
  cast((f) => [box(-2.5 - f, -3 - f, 2.5 + f, 3 + f, 0, TOP), box(0.6 - f, 0.9 - f, 1.2 + f, 1.5 + f, 4.2, 6.25), box(0.6 - f, -3.65 - f, 2.3 + f, -3.05, 0, 1.35),
    ...[-1, 1].map((sg) => solid.poly([[sg * (2.95 + f), -3.35 - f, EAVE], [0, -3.35 - f, RIDGE + 0.25], [0, 3.35 + f, RIDGE + 0.25], [sg * (2.95 + f), 3.35 + f, EAVE]].map(([a, b, up]) => q(a, b, up)), "b", { ghost: true }))])
}
const MATS = {
  wall: { ramp: "DRhH", edge: "D", bias: 0.1 }, trim: { ramp: "iI", edge: "i" }, soffit: { ramp: "DD" }, door: { ramp: "uD" }, stone: { ramp: "pP" }, brick: { ramp: "NK" },
  roof: { ramp: "bBWw", bias: 0.35, edge: "B" }, snowedge: { ramp: "bBW", edge: "b" }, drift: { ramp: "bBWw", smooth: true, bias: 0.2, edge: "B" }, ice: { ramp: "BWx" },
  glass: { ramp: "Zz", bias: 1 }, dark: { ramp: "uj" }, pole: { ramp: "Oo", edge: "O" }, cut: { ramp: "KG", bias: 0.4, edge: "N" },
  // the logs' ends, a round of 2 px each, the dark between them, each row set half a log over
  logs: { ramp: "NKG", edge: "N", bias: 0.3, texture: (x, y) => (y % 3 === 2 || (x + (Math.floor(y / 3) % 2) * 2) % 3 === 2 ? -1 : 0) },
}

// ================================================================ along the road
// Everything along the road has a place in the loop (p m along it), so it comes round, and the last frame
// leads into the first. The firs, laid once in rows [row, m across, how dense]: thick on the right,
// thinner on the left, none in the house's clearing; each its own place (a hash of its slot i), height (7
// to 13 m) and one of the two; by 5 m slot (SLOT), for the ground. A gust runs downwind across them at
// 8 m/s: each sways as late as it stands downwind (delay, ms).
const ROWS = [[0, 9.5, 0.45], [1, 15, 0.6], [2, 22, 0.75], [3, -11, 0.3], [4, -18, 0.45], [5, -26, 0.6]], FIRS = []
for (let i = 0; i < LOOP_M / 5; i++) for (const [row, u0, dense] of ROWS) {
  const u = u0 + 3 * hash(i, row + 9) - 1.5, p = i * 5 + 4 * hash(i, row + 19) - 2, k = 0.7 + 0.55 * hash(i, row + 29)
  if (hash(i, row) <= dense && !(Math.abs(wrap(i * 5 - HOUSE.at)) < 13 && Math.abs(u - HOUSE.u) < 9))
    FIRS.push({ i, u, p, k, seed: hash(i, row + 39) < 0.5 ? 3 : 9, delay: R(((((-125 * (u * WIND[0] + p * WIND[1])) % 2000) + 2000) % 2000)) })
}
const SLOT = Array.from({ length: LOOP_M / 5 }, (_, i) => FIRS.filter((f) => f.i === i))
function things({ P }, s) {
  const m = model(), sprites = [], ghosts = [], soft = []
  // what casts a shadow, twice: as it is, and f m wider with the sun a little lower, for the soft edge
  const cast = (make) => { ghosts.push(...make(0, { ghost: true })); soft.push(...make(0.12, { ghost: true })) }
  // no thinner than a px where it stands (the thin-line rule, for a stick)
  const thinAt = (d, x) => (r) => Math.max(r, 0.55 / P.scale(Math.max(1, d), x))
  // snow poles every 20 m on both banks. A pole's shadow runs across the view, and past some 16 m it is
  // narrower than its step from row to row and breaks into dots: only the near ones cast.
  for (let k = 0; k < LOOP_M / 20; k++) for (const x of [CREST - LANE, -CREST - LANE]) {
    const d = (((k * 20 - s) % LOOP_M) + LOOP_M) % LOOP_M
    if (d < 2 || d > FAR) continue
    m.stick("pole", [x, d, 0], [x, d, 1.8], thinAt(d, x)(0.05))
    if (d < 16) cast((f, o) => [solid.stick([x, d, 0], [x, d, 1.8], 0.05 + f / 2, "b", o)])
  }
  for (const { u, p, k, seed, delay } of FIRS) {
    const dd = (((p - s) % LOOP_M) + LOOP_M) % LOOP_M, x = u - LANE, tall = FIR_M * k
    if (dd < 3 || dd > FAR) continue
    sprites.push({ name: firName(seed, tall * P.scale(dd, x)), at: [x, dd], shadow: 0, delay })
    // Its shadow a spruce's, at its full length (shadows() draws what lies ahead of us): a short
    // trunk, four tiers of boughs, each a cone wider at its foot than the tier above it there (so the edge is
    // serrated, notches of 0.2 of its girth), the spire to a point. Where all of it lies past 60 m (12 m
    // fall about 54 m), a notch is under 1.5 px: one cone; the soft edge is one cone, the notches in it
    const R0 = 0.19 * tall, one = (f, o) => solid.cone([x, dd, 0], R0 + f, [x, dd, tall + f], 0, "b", o)
    cast((f, o) => (f || dd - 4.6 * tall > 60 ? [one(f, o)] : [solid.stick([x, dd, 0], [x, dd, 0.15 * tall], 0.12 * k, "b", o), solid.cone([x, dd, 0.72 * tall], 0.3 * R0, [x, dd, tall], 0, "b", o),
      ...[0, 1, 2, 3].map((i) => solid.cone([x, dd, tall * (0.06 + 0.17 * i)], R0 * (1 - 0.2 * i), [x, dd, tall * (0.3 + 0.17 * i)], R0 * 0.25 * (1 - 0.2 * i), "b", o))]))
  }
  const dh = wrap(HOUSE.at - s)
  if (dh > -6 && dh < FAR) house(m, dh, thinAt(dh, HOUSE.u - LANE), cast)
  return { faces: m.faces, sprites, ghosts, soft, dh }
}

// ================================================================ the snow falling
// Flakes in a box 16 m across, 20 along, 10 high, laid again and again: each falls 1 m/s (the box's height in
// the loop's 10 s) and we drive through 10 boxes. The wind blows one way over the land: turned by our heading
// it crosses our view at another slant. Its drift in our frame, summed frame by frame, is scaled to whole
// boxes over the loop, so it closes. Through the camera without the bend (the air near us): a near flake a
// short streak, a mid one a px, past 25 m fewer and paler, a veil; spindrift low and three times as fast.
const AIR = perspective(VIEW), FLAKES = Array.from({ length: 100 }, (_, k) => [16 * hash(k, 1, 7), 20 * hash(k, 2, 7), 10 * hash(k, 3, 7), k < 8])
const SUM = [[0, 0]]
for (let f = 0; f < FRAMES; f++) { const a = Math.atan2(...WIND) - way((f / FRAMES) * LOOP_M).heading; SUM.push([SUM[f][0] + (2.9 * Math.sin(a)) / FPS, SUM[f][1] + (2.9 * Math.cos(a)) / FPS]) }
const blow = (f, i) => { const box = [16, 20][i], end = SUM[FRAMES][i]; return ((SUM[f % FRAMES][i] + Math.floor(f / FRAMES) * end) * box * Math.max(1, R(end / box))) / end }
function snowfall(c, f, s) {
  f %= FRAMES; const t = f / FPS, z0 = s % 20                  // (the next lap's first frame is this one's, to the bit)
  for (const [x0, zb, y0, low] of FLAKES) for (let n = 0; n < 5; n++) for (let mm = 0; mm < 5; mm++) {
    const dx = (blow(f + 1, 0) - blow(f, 0)) * (low ? 3 : 1), dz = blow(f + 1, 1) - blow(f, 1), zw = zb + blow(f, 1)
    const z = zw - 20 * Math.floor(zw / 20) + 20 * n - z0, y = low ? 0.15 + y0 / 12 : (((y0 - t) % 10) + 10) % 10
    const x = (((x0 + blow(f, 0) * (low ? 3 : 1)) % 16) + 16) % 16 + 16 * mm - 40, key = hash(n * 5 + mm, R(x0 * 1000))
    if (z < (low ? 4 : 0.6) || z > (low ? 30 : 100) || (z > 25 && key > 25 / z)) continue
    const [c1, r1] = AIR.ground(x, z, y), [cp, rp] = AIR.ground(x - dx, z + 1.25 - dz, low ? y : y + 1 / FPS)
    if (c1 < -4 || c1 > W + 4 || r1 < -4 || r1 > H + 4) continue
    const len = Math.hypot(c1 - cp, r1 - rp), k = Math.min(1, 3 / len), c0 = c1 + (cp - c1) * k, r0 = r1 + (rp - r1) * k   // 3 px at most
    if (low || z < 6) c.line(R(c0), R(r0), R(c1), R(r1), "W", 1)                                    // the near ones dimmer, blurred
    else c.px(R(c1), R(r1), z > 25 ? "W" : "x")
  }
}

anim("bend", { w: W, h: H, frames: FRAMES, fps: FPS, world: { horizon: VIEW.horizon, eye: VIEW.eye, light: LIGHT }, check: { every: 16 } }, (c) => {
  const s = (c.frame / FRAMES) * LOOP_M, V = look(s), { P, hd, SUN_N } = V, T = things(V, s), sun = { from: SUN_N.slice(0, 2), up: 12 }
  sky(c, V)
  c.plane(P, ground(V, s))
  c.shadows(P, T.soft, { sun: { ...sun, up: 11.8 }, shade: SOFT })
  c.shadows(P, T.ghosts, { sun, shade: SHADE })
  c.mesh(P, T.faces, MATS, { light: SUN_N, sprites: T.sprites })
  // a thin smoke from the chimney, leaning with the wind across our view (the billows born round the loop)
  if (T.dh > 2 && T.dh < 90) c.smoke(0, 0, "WBi", { view: P, at: [HOUSE.u - LANE + 0.9 * SIDE, T.dh + 1.2, 6.3], rise: 2.5, wind: 4.4 * Math.sin(Math.atan2(...WIND) - hd), size: [0.25, 0.7], count: 10, alpha: [0.3, 0.45, 0.6] })
  snowfall(c, c.frame, s)
})
