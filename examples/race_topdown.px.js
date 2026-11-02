// Racing seen from above (racing_topdown, lib/profiles/racing_topdown.px.js), 320 x 240 (20 x 15 tiles of 16): the
// library's racing demo, its layout library F5's stage 5c's, approved: a short loop of track by corners (kerbs on
// the bends, the white line on the straights), the start line, its gantry and the grid on the left straight, every
// prop and tree from lib (lib/architecture/track.px.js, lib/nature/trackside.px.js), each shadow cast from what it
// falls from. Two cars lap it (lib/vehicles/car.px.js), one lap each in the 4 s loop, clockwise: fuego leads out of the
// start, laguna dives inside it into the first bend and passes on the top straight, fuego dives inside the third
// bend and passes back on the bottom straight. Each frame a car takes the rotation of its heading from its 32
// (car.facing), so it turns through a bend rotation by rotation, never sliding sideways; its shadow cast from its
// wheels; skid marks in the bends behind it (track.skid: its rear tyres' two 1 px lines of rubber, fading at the
// tail), laid as it turns and worn away a while after. The scene's expect: the cars on the asphalt or the kerbs, on
// no prop, never on each other, at every frame.
include("../lib/architecture/track.px.js", { as: "track", palette: true })
include("../lib/vehicles/car.px.js", { as: "car" })
include("../lib/nature/trackside.px.js", { as: "trackside" })
include("../lib/nature/island.px.js", { as: "isl" })
const T = 16
// one char per tile corner: r track, . grass (21 x 16 corners for 20 x 15 tiles); the bends' corners cut
const CORNERS = `
  .....................
  .....................
  ...rrrrrrrrrrrrrrr...
  ..rrrrrrrrrrrrrrrrr..
  ..rrrrrrrrrrrrrrrrr..
  ..rrrr.........rrrr..
  ..rrr...........rrr..
  ..rrr...........rrr..
  ..rrr...........rrr..
  ..rrr...........rrr..
  ..rrrr.........rrrr..
  ..rrrrrrrrrrrrrrrrr..
  ..rrrrrrrrrrrrrrrrr..
  ...rrrrrrrrrrrrrrr...
  .....................
  .....................`.trim().split("\n").map((r) => r.trim())
// the bends' tiles take the kerb (the four corners of the loop, 4 x 4 tiles each); the start line across the left
// straight at tile row 8 (its checker y 132-139)
const bend = (i, j) => (i < 6 || i > 13) && (j < 5 || j > 9)
const START = 8
const ground = (c) => {
  for (let j = 0; j < 15; j++) for (let i = 0; i < 20; i++) {
    const k = [CORNERS[j][i], CORNERS[j][i + 1], CORNERS[j + 1][i], CORNERS[j + 1][i + 1]]
    const m = k.reduce((a, ch, b) => a | (ch === "r" ? 1 << b : 0), 0)
    const name = m && j === START && i < 5 ? `track.start_v_${m}` : m === 0 ? `track.track_0_${(i * 7 + j * 3) % 2}` : `track.${bend(i, j) ? "kerb" : "track"}_${m}_${(i + j) % 2}`
    c.stamp(name, i * T, j * T)
  }
}
// what stands, by its foot: [asset, x, y, flip]
const STAND = [
  ["trackside.oak", 112, 132], ["trackside.spruce", 200, 136], ["trackside.oak", 304, 234], ["trackside.spruce", 8, 100],
  ["trackside.bush", 150, 150], ["trackside.bush", 90, 102, "x"], ["trackside.bush", 312, 128], ["trackside.bush", 10, 232, "x"], ["trackside.rock", 160, 112],
  ["track.lamp", 226, 104],
  // the start gantry over the line; barriers along the straights' outsides (two tiles each); tyre walls round the
  // bends' outsides (two tiles), a stack every 4 px where they run north-south; cones at the bends' apexes
  ["track.gantry", 48, 136],
  ...[0, 1, 2].flatMap((k) => [["track.barrier", 120 + 32 * k, 20], ["track.barrier", 120 + 32 * k, 226]]),
  ["track.tyre_wall", 44, 18], ["track.tyre_wall", 276, 18], ["track.tyre_wall", 44, 228], ["track.tyre_wall", 276, 228],
  ...[0, 1, 2, 3, 4, 5, 6].flatMap((k) => [["track.tyres", 10, 30 + 4 * k], ["track.tyres", 310, 30 + 4 * k], ["track.tyres", 10, 190 + 4 * k], ["track.tyres", 310, 190 + 4 * k]]),
  ["track.cone", 96, 84], ["track.cone", 228, 162], ["track.cone", 96, 160], ["track.cone", 228, 86],
]
// each its id (its asset's short name and its place in the list), for the scene's expect
const id = (n, i) => `${n.split(".")[1]}_${i}`
// the shadows: the light's way (from the upper left, as the 3D things are lit), short (a high sun); from each column's
// lowest pixel for what rests on the ground, from the foot (the pivot's row) for what stands on one
const CAST = [0.6, 0.3]
const foot = (n) => (/oak|spruce|gantry|lamp/.test(n) ? "pivot" : "column")
const TUFTS = [[70, 120], [132, 92], [180, 160], [240, 128], [128, 172], [300, 90], [20, 60], [8, 160], [86, 8], [60, 10], [250, 236], [216, 236]]

// ---------------------------------------------------------------- the race
// 4 s a lap at 25 fps (the profile names no fps; a GIF's delays are hundredths, so 40 ms is exact, and the references'
// 60 Hz would be 240 frames for steps of 3 px): 100 frames, one lap each.
const MS = 40, N = 100
// The line: the track's middle with its corners rounded wider than the track's own (48 px against the middle's 41),
// so it cuts toward each bend's apex; s px along it from the start line, north up the left straight. Its bends
// (s on each arc): 40-115, 243-319, 367-442, 570-646; the lap 654 px.
const R = 48, ARC = (R * Math.PI) / 2, LAP = 2 * (224 + 144) - (8 - 2 * Math.PI) * R
const LINE = route({ px: true, round: R }, [[48, 136], [48, 48], [272, 48], [272, 192], [48, 192], [48, 136]]).at
const ARCS = [0, 1, 2, 3].map((i) => 40 + i * ARC + [0, 128, 176, 304][i])
const wrap = (s) => ((s % LAP) + LAP) % LAP, near = (s, a) => s - a - LAP * Math.round((s - a) / LAP)
// the speed along it: slower into a bend and faster out, 0.7 of a straight's at its apex, braking over ~35 px before
// it and pulling away over ~60 after
const speed = (s) => 1 - 0.3 * ARCS.reduce((v, a) => { const x = near(s, a + ARC / 2); return v + Math.exp(-((x / (x < 0 ? 35 : 60)) ** 2)) }, 0)
// The passes. The two follow the line nose to tail, their middles G px apart (a car's 30 with its line, and room to
// keep apart round a bend), except where one passes the other: before the bend the two split, the
// passer to the inside and the other wide, LANE px each side of the line; through the bend the inside one gains
// (its way shorter), level by its exit, ahead by G at the straight's end, where the two close up on the line again.
// Laguna passes on the top straight, fuego back on the bottom one. The one passed holds its pace; the passer runs
// faster by what it gains (about 1.4 times the other's speed down the straight), so out of the passes both run
// a little under the pace that makes the lap (k), each gaining 2G in its own pass.
const G = 36, LANE = 11, SPLIT = 48, k = 1 - (2 * G) / LAP
const sm = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u))
// the pass by S (the pace's own s): from the bend's start to the straight's end, the pair's middle at those places
const PASS = [[ARCS[0] / k, (ARCS[1] - G) / k], [(ARCS[2] - G) / k, (ARCS[3] - 2 * G) / k]]
// how far into it, 0..1: linear, eased at both ends, and a bend's length counting double
const passed = (S, [a, b]) => {
  const x = wrap(S) - a, u = (x + (ARC / k) * sm((x * k) / ARC)) / (b - a + ARC / k), e = 0.2
  return u <= 0 ? 0 : u >= 1 ? 1 : u < e ? (u * u) / (2 * e * (1 - e)) : u > 1 - e ? 1 - (1 - u) ** 2 / (2 * e * (1 - e)) : (u - e / 2) / (1 - e)
}
// how far split, 0..1: in over SPLIT px of the line before the pass, out over SPLIT after it
const split = (S, [a, b]) => { const x = near(S, a), w = SPLIT / k; return sm((x + w) / w) * (1 - sm((x - (b - a)) / w)) }
// The pace: S along the line at frame f, frame 0 the pair's middle at the start line, the speed read at the pair's
// middle; its time over each px summed, the lap brought to N frames
const middle = (S) => k * S + G * (passed(S, PASS[0]) + passed(S, PASS[1]))
const STEP = LAP / 700, TIME = [0]
for (let i = 0; i < 700; i++) TIME.push(TIME[i] + (STEP * k) / speed(middle((i + 0.5) * STEP)))
const pace = (f) => {
  const lap = Math.floor(f / N), t = ((f - lap * N) * TIME[700]) / N
  let lo = 0, hi = 700
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (TIME[m] <= t) lo = m; else hi = m }
  return lap * LAP + (lo + (t - TIME[lo]) / (TIME[hi] - TIME[lo])) * STEP
}
// A car at frame f (any real): where it is on the picture and how far along the line (s). Laguna starts G behind
// fuego and gains 2G in the first pass, fuego in the second; split, the passer LANE px to the inside of the line (its
// right, the way round is clockwise) and the other as far out.
const CARS = ["fuego", "laguna"]
const at = (liv, f) => {
  const S = pace(f), x = wrap(S), lap = S - x, [p1, p2] = PASS.map((w) => passed(x, w)), [q1, q2] = PASS.map((w) => split(x, w))
  const s = lap + k * x + (liv === "fuego" ? G / 2 + 2 * G * p2 : -G / 2 + 2 * G * p1), d = LANE * (q1 - q2) * (liv === "fuego" ? -1 : 1)
  const p = LINE(wrap(s))
  return { x: p.x - p.heading[1] * d, y: p.z + p.heading[0] * d, s }
}
// each car as stamped at a time (ms): its rotation facing the way it moves over that frame, at whole px
const racers = (t) => CARS.map((liv) => {
  const f = t / MS, a = at(liv, f - 0.5), b = at(liv, f + 0.5), p = at(liv, f)
  return [car.facing(liv, [b.x - a.x, b.y - a.y]), Math.round(p.x), Math.round(p.y), liv]
})
// Skid marks: laid while a car is on a bend's arc, its rear tyres' two lines (track.skid), each stretch worn away
// WEAR frames after it was laid, the tail fading; the turns found over two laps (the last before the loop's start
// too, so its marks are there at frame 0 as at its end)
const WEAR = 20
const TURNS = Object.fromEntries(CARS.map((liv) => {
  const list = []
  for (let f = -N; f <= N; f += 0.25) {
    const s = wrap(at(liv, f).s), on = ARCS.some((a) => s >= a && s < a + ARC), last = list[list.length - 1]
    if (on && last && last[1] === f - 0.25) last[1] = f
    else if (on) list.push([f, f])
  }
  return [liv, list]
}))
const marks = (c) => {
  const f = c.t / MS
  for (const liv of CARS) for (const [a, b] of TURNS[liv]) {
    const t = Math.min(f, b), from = Math.max(a, f - WEAR)
    if (t > from) track.skid(c, (u) => { const p = at(liv, u); return [p.x, p.y] }, { t, length: t - from })
  }
}

// The scene's rules, held by pxl check at every frame. The cars on the track: every pixel of a car on asphalt, its
// white edge line or a bend's kerb, never on the grass (the corner sets' share of track at a pixel, as corners() draws
// it: the white line from 0.5, a kerb's lip from 0.44). On no prop (the gantry over the track, the cars run under
// it), and never on each other.
const onTrack = (x, y) => {
  const i = Math.floor(x / T), j = Math.floor(y / T), u = (x - i * T + 0.5) / T, w = (y - j * T + 0.5) / T, r = (a, b) => (CORNERS[b]?.[a] === "r" ? 1 : 0)
  return r(i, j) * (1 - u) * (1 - w) + r(i + 1, j) * u * (1 - w) + r(i, j + 1) * (1 - u) * w + r(i + 1, j + 1) * u * w >= (bend(i, j) ? 0.44 : 0.5)
}
const RULES = [
  ...CARS.map((liv) => ({ inside: [liv, onTrack] })),
  ...CARS.flatMap((liv) => STAND.map(([n], i) => n !== "track.gantry" && { apart: [liv, id(n, i)] }).filter(Boolean)),
  { apart: ["fuego", "laguna"] },
]
scene("race_topdown", { w: 320, h: 240, bg: "g", frames: N, fps: 1000 / MS, expect: RULES },
  layer("ground", ground),
  layer("marks", marks),
  layer("grid", stamp("track.grid_slot", 37, 145, { rot: 270 }), stamp("track.grid_slot", 59, 159, { rot: 270 })),
  layer("tufts", ...TUFTS.map(([x, y]) => stamp("isl._tuft", x, y))),
  // the cars from their wheels (each column's lowest pixel), as what rests on the ground
  layer("shadow", { shade: true }, ...STAND.map(([n, x, y, f]) => stamp(n, x, y, { cast: CAST, castBase: foot(n), silhouette: "k", ...(f ? { flip: f } : {}) })),
    (c) => racers(c.t).forEach(([n, x, y]) => c.stamp(n, x, y, { cast: CAST, castBase: "column", silhouette: "k" }))),
  layer("props", { sort: "y" }, ...STAND.map(([n, x, y, f], i) => stamp(n, x, y, { id: id(n, i), ...(f ? { flip: f } : {}) })),
    (c) => racers(c.t).forEach(([n, x, y, liv]) => c.stamp(n, x, y, { id: liv }))))
