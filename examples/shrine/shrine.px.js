// A fox shrine's courtyard in autumn at dusk, top-down (an RPG's 3/4), 240x160 at 20 px to the meter, an
// 11.5 s loop. The things are the Japanese kit's (nature/japan.px.js: a torii, the hall with its
// shimenawa and bell, stone lanterns, the foxes, the basin, the ema rack) and the trees the species kit's
// (nature/trees.px.js: two momiji, the sacred ginkgo with a shimenawa round its trunk, a black pine),
// each drawn in 3D by turnaround() through the scene's camera under its one sun, low in the west, golden;
// the lanterns' lamps just lit, glowing. The ground is painted by the pixel: the approach in ishidatami
// laid along a lane() (its slabs fanning round the bend, a landing before the hall and one under the
// torii, a curb, a strip of pebbles), white gravel raked along it and in rings round the lanterns and the
// basin, stepping stones, moss under the trees, fallen leaves where the wind leaves them. The miko
// (miko.px.js, on the traveler's figure) sweeps the path toward the torii, walks back, bows to the hall
// between the foxes and comes down to sweep again; the trees sway in the wind from the east, which
// carries their leaves down across the courtyard.
include("miko.px.js")
include("../nature/trees.px.js")
include("../nature/japan.px.js", { palette: true })

pal({ k: "#1a1622" })   // ink

const S = 20                                       // px to the meter
// the sun: low in the west, a little in front, golden late afternoon (the way to it: x right, y away, z up)
const SUN = [-0.8, -0.3, 0.5]
look3d({ light: SUN, mats: { ...japan.mats, ...trees.mats } })
const front = (name, thing, o = {}) => turnaround(name, thing, { view: "side", ppm: S, headings: ["s"], ...o })

// ---------------------------------------------------------------- the things (japan.px.js)
const HALL = make3d.haiden()
front("hall", HALL, { draw: japan.hand(HALL) })
front("torii", make3d.torii())
front("toro", make3d.toro())
front("basin", make3d.chozubachi({ moss: 0.1 }))
front("ema", make3d.ema())
// the foxes, a pair as at Inari shrines, facing each other across the landing; their edges toward the
// sun lit, their faces carved
const FOX_TAMA = make3d.kitsune({ holds: "tama" }), FOX_KEY = make3d.kitsune({ holds: "key" })
// the fox with the jewel (tama) under a forepaw, on the left
turnaround("fox_tama", FOX_TAMA, { view: "side", ppm: S, headings: ["e"], surface: { rim: true }, draw: japan.carve(FOX_TAMA) })
// the fox with the key in its mouth, on the right
turnaround("fox_key", FOX_KEY, { view: "side", ppm: S, headings: ["w"], surface: { rim: true }, draw: japan.carve(FOX_KEY) })

// ---------------------------------------------------------------- the trees (trees.px.js), in autumn
// (swaying: 12 frames of a gust coming and going, the wind from the east, so their tops lean west)
const TREE = { surface: trees.look }, SWAY = { ...TREE, frames: 12 }
front("momiji_red", make3d.momiji({ season: "autumn", color: 0, height: 3, seed: 2, wind: -0.12 }), SWAY)
front("momiji_orange", make3d.momiji({ season: "autumn", color: 1, height: 2.4, seed: 5, wind: -0.12 }), SWAY)
front("kuromatsu", make3d.kuromatsu({ height: 3, seed: 4, wind: -0.05 }), SWAY)
// the ginkgo is the shrine's sacred tree (goshinboku): a shimenawa round its trunk, its paper hanging in front
const GK = make3d.ginkgo({ season: "autumn", height: 5.5, seed: 3, wind: -0.16 }), RING = [0.22, 0.06, 1.45]
const SACRED = { ...GK, field: GK.field.union(sdf.torus(RING[0], RING[1]).at(0, 0, RING[2]).paint((p) => ((((Math.atan2(p[1], p[0]) * 3 + p[2] * 20) % 1) + 1) % 1 < 0.4 ? "rope" : "straw"))),
  sockets: { ...GK.sockets, ...Object.fromEntries([-50, 0, 50].map((a, i) => [`shide${i}`, [RING[0] * Math.sin(a * Math.PI / 180), -RING[0] * Math.cos(a * Math.PI / 180) - RING[1], RING[2] - RING[1]]])) } }
front("ginkgo", SACRED, { ...SWAY, draw: japan.hand(SACRED) })

// ---------------------------------------------------------------- the ground
// The approach: in from below the frame through the torii, standing on a landing of wide slabs, up, its
// bend rounded so its slabs fan round it, along to the left into the landing before the hall's steps,
// between the foxes. Rings raked round the lanterns' and the basin's feet; stepping stones from the path
// to the basin's front; moss under the maples and the pine and along the hall's base.
const WAY = [189, 180, 189, 116, 92, 116], ALONG = lane(WAY)   // the approach's line
const PAVE = japan.paving({ points: WAY, width: 28, round: 26, landings: [[60, 76, 48, 56, "y"], [154, 142, 70, 18, "y"]] })
// where the lanterns and the basin stand along it, [s px along it, u px to its right]: they are stamped
// there (and follow it where it's laid), the gravel raked in rings round them a px up from their feet
const BY_WAY = { toro_w: [115, 21], toro_e: [87, 21], basin: [133, -34] }
const ringAt = ([s, u], r) => [...ALONG.point(s, u + 1), r]
const RINGS = [ringAt(BY_WAY.toro_w, 9), ringAt(BY_WAY.toro_e, 9), ringAt(BY_WAY.basin, 15)]
const STONES = [[104, 139, 4, 2.5], [99, 145, 4, 2.5], [104, 151, 4.5, 2.5], [113, 157, 4.5, 2.5]]
const MOSS = [[14, 54, 30, 12], [26, 154, 32, 12], [84, 72, 52, 3], [238, 152, 18, 8], [50, 97, 9, 3], [118, 97, 9, 3]]
// the leaves: under each crown in its color (the ginkgo's a carpet), and where the wind from the east
// leaves them: against the path's north curb, at the feet of the lanterns, the torii and the basin, by
// the hall's step; thin on the path ahead of her (east), none where she has swept
// (full over its inner half, thinning out to its rim)
const blob = (cx, cy, rx, ry, a) => (x, y) => a * Math.max(0, Math.min(1, 1.8 * (1 - Math.hypot((x - cx) / rx, (y - cy) / ry))))
const UNDER = [[14, 58, 30, 14, 0.75, "eRr"], [236, 152, 24, 9, 0.7, "ouU"], [190, 85, 34, 13, 1, "gGY"]].map(([x, y, rx, ry, a, ramp]) => [blob(x, y, rx, ry, a), ramp])
const WIND = [[150, 100, 44, 3, 0.9], [138, 95, 7, 3, 1], [166, 95, 7, 3, 1], [165, 158, 6, 3, 1], [212, 158, 6, 3, 1], [106, 100, 6, 4, 0.8], [151, 117, 5, 3, 1],
  [98, 80, 8, 3, 0.8], [129, 151, 6, 3, 0.9], [152, 116, 32, 12, 0.25]].map((b) => blob(...b))
const density = (x, y) => Math.max(...UNDER.map(([f]) => f(x, y)), ...WIND.map((f) => f(x, y))) * (x < 104 && y >= 103 && y < 127 ? 0 : 1)
// where they lie thick, a second layer of them filling the gaps: a pile
const piled = (x, y) => Math.max(0, density(x, y) - 0.5) * 2
const color = (x, y, t) => UNDER.find(([f]) => f(x, y) > 0.05)?.[1] ?? (t < 0.4 ? "eRr" : t < 0.75 ? "ouU" : "gGY")
const bare = japan.ground(japan.stones(STONES), PAVE.paint, japan.moss(MOSS), japan.raked(PAVE.dist, RINGS))
const paint = japan.ground(japan.leaves(piled, color, { cell: 2, seed: 9 }), japan.leaves(density, color), bare)
sprite("_ground", { w: 240, h: 160 }, (c) => { for (let y = 0; y < 160; y++) for (let x = 0; x < 240; x++) c.px(x, y, paint(x, y)) })

// ---------------------------------------------------------------- the miko's round
// About eleven seconds at 110 ms a frame (her sweep's and walk's own), opening on her sweeping: four strokes
// along the path toward the torii, a short step between them; then she walks back, up onto the landing
// before the hall, bows to it between the foxes, and comes down to where she began. In the picture's px
// (px: true), at the walk's own pace, so her feet stay planted.
const MS = 110
const steps = [[100, 118]]
for (let k = 0; k < 4; k++) {
  steps.push({ hold: 8, dir: "e", anim: "mk_sweep", frame: (f, t) => t % 8, ...(k ? {} : { name: "sweep" }) })
  if (k < 3) steps.push({ to: [100 + 12 * (k + 1), 118], dir: "e" })
}
steps.push({ to: [100, 118], name: "back" }, [84, 104],
  { hold: 16, name: "bow", dir: "n", anim: "mk_bow", frame: (f, t) => Math.min(11, Math.max(0, Math.floor((t * MS) / 120) - 1)) }, [100, 118])
const round = route({ px: true, pace: mikoFigure.pace, walk: "mk_walk", idle: { anim: "mk_idle", frame: (f) => Math.floor((f * MS) / 250) % 4 } }, steps)
const L = round.frames, BACK = round.start("back")

// ---------------------------------------------------------------- the leaves that move
// On the path ahead of her lie the leaves that fell since she last swept (LANE); her broom gathers each
// as it reaches it into a heap pushed along ahead of her, left on the pile where her last stroke ends.
// The wind from the east carries leaves down from the crowns, tumbling: LANE's land on the path behind
// her before she comes round again, others in the carpets under their trees, the red maple's blow out
// of the picture to the west.
const SHAPES = [[[0, 0, 2], [1, 0, 1]], [[0, 0, 2], [0, 1, 1]], [[0, 0, 1], [1, 1, 2]], [[1, 0, 2], [0, 1, 1]]]
const leaf = (c, x, y, ramp, k) => { for (const [dx, dy, t] of SHAPES[((k % 4) + 4) % 4]) c.px(Math.round(x) + dx, Math.round(y) + dy, ramp[t]) }
// a flight: from (x, y) on the picture, `dx` across and `h` down in `n` frames from frame t0 (round the
// loop), swaying a little as it tumbles
const flight = (x, y, dx, h, n, t0, ph = 0) => (f) => {
  const t = (((f - t0) % L) + L) % L
  if (t >= n) return null
  const q = t / n
  return [x + dx * q + 2 * Math.sin(q * 9 + ph), y + h * q]
}
const heapAt = (f) => { const r = round(f); return r ? [r.at[0] + 14, r.at[1] - 1] : null }
const LANE = [[114, 110], [118, 123], [123, 114], [128, 120], [133, 109], [138, 125], [142, 115], [147, 121]].map(([x, y], i) => {
  let swept = L
  for (let f = 0; f < BACK; f++) if (heapAt(f)[0] >= x) { swept = f; break }
  // from the ginkgo's crown and the orange maple's, landing after she has gone by and before the loop ends
  const land = L - 3 - i * 5, n = 30
  return { x, y, ramp: ["gGY", "ouU", "eRr"][i % 3], k: i, swept, land, air: flight(x + 72, y - 66, -72, 66, n, land - n, i) }
})
const AIR = [
  ...[0, 1, 2, 3].map((i) => ["eRr", flight(14 + i * 9, 18 + (i % 2) * 10, -44 - i * 6, 36 + i * 4, 34, i * 27 + 5, i)]),
  ...[0, 1, 2, 3, 4].map((i) => ["gGY", flight(190 + i * 8, 14 + (i % 3) * 12, -18 - i * 3, 64 - (i % 3) * 12, 36, i * 22 + 11, i + 4)]),
  ...[0, 1, 2].map((i) => ["ouU", flight(222 + i * 7, 112 + i * 4, -12, 34, 24, i * 33 + 20, i + 9)]),
]
// on the ground: LANE's where they lie, and the heap ahead of her broom (left where her sweep ends)
const groundLeaves = (c) => {
  const f = c.frame, at = heapAt(Math.min(f, BACK - 1))
  let n = 0
  for (const l of LANE) {
    if (f >= l.land || f < l.swept) leaf(c, l.x, l.y, l.ramp, l.k)
    if (f >= l.swept && f < l.land) leaf(c, at[0] + (n % 3) * 2 - 2, at[1] + ((n / 3) | 0) * 2 - 1, l.ramp, l.k + n++)
  }
}
// in the air, over everything: tumbling a shape a frame
const airLeaves = (c) => {
  for (const [i, [ramp, fl]] of AIR.entries()) { const p = fl(c.frame); if (p) leaf(c, p[0], p[1], ramp, c.frame + i) }
  for (const l of LANE) { const p = l.air(c.frame); if (p) leaf(c, p[0], p[1], l.ramp, c.frame + l.k) }
}

// ---------------------------------------------------------------- the courtyard
const PLACES = [["hall_s", 84, 63], ["ema_s", 152, 62]]
// what moves, stamped by the frame: the trees swaying three times a loop, each a little after another,
// and the miko; the shade layer casts them as it casts the rest
const TREES = [["momiji_red_s", 14, 52, 3], ["momiji_orange_s", 238, 150, 0], ["ginkgo_s", 212, 82, 1], ["kuromatsu_s", 22, 158, 4]]
const movers = (c) => {
  for (const [n, x, y, lag] of TREES) c.stamp(n, x, y, { frame: Math.floor((36 * c.frame) / L + lag) % 12 })
  const r = round(c.frame)
  if (r) c.stamp(r.name, ...r.at, { frame: r.frame, id: "miko" })
}
// What the courtyard holds to (pxl check runs them at the frames it checks): the two lanterns just off
// the north curb of the approach's run to the hall, apart; the miko never behind the key fox, in front
// of the west lantern whenever she is below it, and on the stretch she sweeps until she walks back.
const APPROACH = [WAY[4], WAY[5] - 14, WAY[0] - WAY[4] + 1, 28], SWEPT = [88, 80, 68, 45]   // the way's run west, 28 wide; her strokes
const COURTYARD = [
  { beside: ["toro_w", APPROACH, { gap: [2, 8], side: "above" }] }, { beside: ["toro_e", APPROACH, { gap: [2, 8], side: "above" }] },
  { apart: ["toro_w", "toro_e", 12] }, { before: ["miko", "fox_key_w"] },
  { while: [{ before: ["miko", "toro_w"] }, { beside: ["miko", "toro_w", { side: "below" }] }] }, { inside: ["miko", SWEPT], frames: [0, BACK - 1] },
]
scene("shrine", { w: 240, h: 160, frames: L, fps: 1000 / MS, world: { scale: S, view: "top", light: "sun" }, check: { every: 35 }, expect: COURTYARD },
  layer("ground", stamp("_ground", 0, 0), groundLeaves),
  layer("shadows", { shade: 1, of: "props", cast: "sun" }),
  layer("props", { sort: "y" }, ...PLACES.map(([n, x, y]) => stamp(n, x, y)),
    // the foxes, a call each: an edit flips or moves one
    stamp("fox_tama_e", 50, 95), stamp("fox_key_w", 118, 95),
    // what stands by the approach, placed along it: the lanterns off its north curb, the basin off its
    // south one, the torii over it as it comes in
    stamp("toro_s", { along: [ALONG, ...BY_WAY.toro_w], id: "toro_w" }), stamp("toro_s", { along: [ALONG, ...BY_WAY.toro_e], id: "toro_e" }),
    stamp("basin_s", { along: [ALONG, ...BY_WAY.basin] }), stamp("torii_s", { along: [ALONG, 22] }), movers),
  layer("air", airLeaves),
  // the lanterns' lamps, just lit as the sun goes: a faint warm halo round each window
  glow("iI", { r: 5, strength: 0.3, bands: 2 }))
