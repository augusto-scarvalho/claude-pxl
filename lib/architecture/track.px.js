// A race track seen from above at a 16 px grid, for racing_topdown (lib/profiles/racing_topdown.px.js, whose numbers
// these are: measured on top-down racers for numbers only, their pixels never taken): the track as corner sets on the
// island's grass, its start line and grid, a tyre wall, a cone, skid marks. For any scene:
// include("<path>/lib/architecture/track.px.js", { as: "track" }), its palette its own (the island style's greens and
// stone, with the asphalt's, the kerb's, rubber and a cone's orange).
// - track_<mask> and kerb_<mask>: the track's 16 corner tiles (a set bit is track: 1 top-left, 2 top-right, 4
//   bottom-left, 8 bottom-right), each a group of 2 variants: asphalt in 3 tones of grain, its edge a white line
//   (track) or a kerb (kerb: red and white blocks 4 px along, 3 px across, a darker lip on the grass side), the
//   island's field. The two sets meet anywhere: kerbs on the bends, the line on the straights. Three rows of track
//   corners make a track 46 px of asphalt across (2.9 cars; a kerb takes a px of it each side).
// - start_<mask>, start_v_<mask>: the track tiles with a start line on their asphalt (a checker of 2 px squares 8 px
//   deep), across a road running east-west (start) or north-south (start_v); grid_slot a car's place on the grid, a
//   white bracket open to the rear, for a car facing east (rot it for the others).
// - make3d.tyres, make3d.cone, make3d.barrier, make3d.gantry, make3d.lamp: the track's things in 3D, in meters at the
//   car's scale, so racing_topdown and racing_behind draw the same models; drawn here at racing_topdown, from its 58
//   degrees as its cars, each lined all round, each part in its own material's line tones: tyres, tyre_wall, cone,
//   barrier, lamp (the small things at twice the car's scale, the genre's boxes), gantry.
// - the trackside's trees, bush and rock, drawn by their 3D builders the same way: lib/nature/trackside.px.js.
// - track.skid(c, path, opts): a car's skid marks, its two rear tyres' trails (trail()) of rubber, fading at the
//   tail; skid a bend's, drawn by it.
include("../styles/island.px.js", { palette: true })
include("../profiles/racing_topdown.px.js")
pal({
  q: "#45475a", n: "#56586c", F: "#686a7f",   // asphalt: its dark grain, body, light grain
  Q: "#9c2a3a", R: "#e8414b",                 // the kerb's red: its lip, its top (its white the stone's s, the lip S)
  T: "#26222f",                               // rubber (lit t, the stone's edge)
  V: "#b8461c", U: "#ff8a2a",                 // a cone's orange: its shade, its body
})
ramps("qnF", "QR", "zTt", "VU")
const track = {}
// in a block: its names stay its own when a scene includes the file
{
const T = 16
// ---------------------------------------------------------------- the track (corner sets)
// The grass: the island's field (g) with its blade marks a step darker (m), placed a variant's way inside a tile
const marks = (list) => { const at = new Set(); for (const [x0, y0, g] of list) g.forEach((r, j) => [...r].forEach((k, i) => { if (k !== ".") at.add(`${x0 + i},${y0 + j}`) })); return at }
const W5 = ["m.m.m", ".mmm.", "..m.."], V3 = ["m.m", ".m."], Y4 = ["m..m", ".mm.", ".m.."]
const FIELD = [marks([[2, 2, W5], [10, 10, V3]]), marks([[9, 2, Y4], [3, 11, V3]])]
const grass = (x, y, v) => (FIELD[v].has(`${x},${y}`) ? "m" : "g")
// the asphalt: its body with a grain of single pixels, a tenth dark, one in sixteen light; a variant's own
const asphalt = (x, y, v) => { const h = hash(x, y, 7 + v); return h < 0.1 ? "q" : h > 0.94 ? "F" : "n" }
// the bands by how much of the tile's corners are track (t, linear: a straight edge 1/16 a px): the asphalt, then its
// edge (a white line 1 px, or the kerb's top 2 px and its lip 1 px, here R and Q till the blocks are laid), the grass
corners("track", { size: T, variants: 2 }, (x, y, t, v) => (t >= 0.56 ? asphalt(x, y, v) : t >= 0.5 ? "s" : grass(x, y, v)))
corners("_kerb", { size: T, variants: 2 }, (x, y, t, v) => (t >= 0.62 ? asphalt(x, y, v) : t >= 0.5 ? "R" : t >= 0.44 ? "Q" : grass(x, y, v)))
// The kerb's blocks, 4 px along, red and white by turns. Along a straight by x or y; round a bend's corner (the
// track's, or the grass's where three corners are track) by the angle from that corner, so many blocks the turn that
// each tile side meets the same block: red where it leaves by the left or the top, white by the right or the bottom.
// Each pattern goes from the bend's vertical side to its horizontal side.
const ARC = { 1: [0, 0, "RWR"], 14: [0, 0, "RWR"], 2: [T, 0, "WRWR"], 13: [T, 0, "WRWR"], 4: [0, T, "RWRW"], 11: [0, T, "RWRW"], 8: [T, T, "WRW"], 7: [T, T, "WRW"] }
const red = (x, y, m) => {
  if (m === 3 || m === 12) return (x >> 2) % 2 === 0
  if (m === 5 || m === 10) return (y >> 2) % 2 === 0
  const a = ARC[m]
  if (!a) return ((x + y) >> 2) % 2 === 0   // two opposite corners: diagonal blocks
  const th = Math.atan2(Math.abs(x + 0.5 - a[0]), Math.abs(y + 0.5 - a[1])) / (Math.PI / 2)
  return a[2][Math.min(a[2].length - 1, Math.floor(th * a[2].length))] === "R"
}
const blocks = (m) => (c) => {
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    if (c.is(x, y, "R")) c.px(x, y, red(x, y, m) ? "R" : "s")
    else if (c.is(x, y, "Q")) c.px(x, y, red(x, y, m) ? "Q" : "S")
  }
}
for (let m = 0; m < 16; m++) {
  for (let v = 0; v < 2; v++) sprite(`kerb_${m}_${v}`, { base: `_kerb_${m}_${v}` }, blocks(m))
  group(`kerb_${m}`, [`kerb_${m}_0`, `kerb_${m}_1`])
}
card("track_0", { is: "a race track's 16 corner tiles on the grass (track_0 all grass to track_15 all asphalt, a bit a corner: 1 top-left, 2 top-right, 4 bottom-left, 8 bottom-right): asphalt in 3 tones of grain, a white edge line 1 px, the island's field; three rows of track corners make 46 px of asphalt", cells: { "topdown/16": "✎" },
  vary: { part: "track_0 to track_15 by the corners' mask, each a group of 2 variants (track_<mask>_<v>); tilemap(map, { corners: \"r\", map: \"track_\" }) lays them" } })
card("kerb_0", { is: "the track's corner tiles with a kerb for an edge (kerb_<mask>, the same masks and asphalt as track_): red and white blocks 4 px along and 3 px across, a darker lip on the grass side, turning round a bend's corner block by block so every tile side meets the next tile's", cells: { "topdown/16": "✎" },
  vary: { part: "kerb_0 to kerb_15 by the corners' mask, a group of 2 variants each; a bend's tiles from this set, a straight's from track_" } })

// ---------------------------------------------------------------- the start line and the grid
// The start line across the asphalt only, whatever the tile's mask: a checker of 2 px squares, 8 px deep (4 rows),
// in the tile's middle; for a road running east-west (start_) and north-south (start_v_)
const checker = (vertical) => (c) => {
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    const along = vertical ? x : y, across = vertical ? y : x
    if (across >= 4 && across < 12 && c.is(x, y, "nqF")) c.px(x, y, ((across >> 1) + (along >> 1)) % 2 ? "z" : "s")
  }
}
for (let m = 1; m < 16; m++) {
  sprite(`start_${m}`, { base: `track_${m}_0` }, checker(false))
  sprite(`start_v_${m}`, { base: `track_${m}_0` }, checker(true))
}
card("start_15", { is: "a start line on the track's asphalt (start_<mask> on track_<mask>_0, across a road running east-west; start_v_<mask> north-south): a checker of 2 px squares, 8 px deep, stopping at the edge line", cells: { "topdown/16": "✎" } })
// a car's place on the grid: a white bracket round its nose, its arms back along its sides (a car 16 px across)
sprite("grid_slot", { pivot: "center" }, `
  sssss
  ....s
  ....s
  ....s
  ....s
  ....s
  ....s
  ....s
  ....s
  ....s
  ....s
  ....s
  ....s
  ....s
  ....s
  ....s
  ....s
  sssss`)
card("grid_slot", { is: "a car's place on the starting grid, 5x18: a white bracket in front of its nose, its arms back along its sides; for a car facing east (rot: 90 faces it south), two abreast and staggered half a car", cells: { "topdown/16": "✎" } })

// ---------------------------------------------------------------- the track's things in 3D
// Modeled once in meters, as the car is (x across, y along, z up; the same scale: the car 4.3 x 1.9 m), so every
// racing genre's camera draws them: a stack of tyres (each 0.62 m across, 0.2 m thick; along a straight as a wall), a
// cone 0.5 m, a barrier of red and white blocks, a start gantry over the line, a lamp. Their colors by material, as
// hex ramps dark to light (no palette needed where they're drawn): DRAW, the cards' `draw`. Each ramp's first two its
// line, away from the light and toward it (surface's ink: 2), at least a step (pxl study's 0.08 of lightness) under
// its fill and none a near-black (racing_topdown's ink: a near-black line the cars' alone): the rubber a blue-grey
// (one tone: its fill lifted a step, a lighter one would sit in it), the white blocks a grey, the red a dark red, the
// cone a dark orange-brown, the metal, the iron and the banner the slate (its black squares its pattern, inside the
// line), the lantern's glass a dark amber. The lamp's iron and glass the village's (lib/props/village.px.js), the
// iron lifted a step to sit above its line.
const SLATE = ["#36344a", "#3f3d55"]
const MATS = {
  rubber: ["#36344a", "#36344a", "#4a4c62", "#5d5b74", "#75798f"], paint: ["#75798f", "#8a8ca0", "#aeb0bc", "#eeebe0", "#ffffff"],
  red: ["#6e1c2a", "#74202e", "#9c2a3a", "#e8414b", "#ff8a84"], orange: ["#7a2e14", "#8f3818", "#b8461c", "#ff8a2a", "#ffc27a"],
  metal: [...SLATE, "#56586c", "#75798f", "#aeb0bc"], black: [...SLATE, "#141018", "#1e1a2e", "#2c2840"],
  iron: [...SLATE, "#545270", "#8a88a8"], glass: ["#7a4a1c", "#8f5a22", "#ffd060", "#fff8d0"],
}
const DRAW = { mats: MATS, light: [-0.6, 0.5, 0.65], surface: { soft: 0.4, rim: 0.6, outline: false, ink: 2 } }
// a stack of `stack` tyres, `along` stacks side by side in x (0.62 m apart); every other stack's tyre `paint` (0 the
// lowest) painted white, -1 none
make3d.define("tyres", ({ stack = 3, along = 1, paint = -1 } = {}) => {
  const list = []
  for (let i = 0; i < along; i++) for (let k = 0; k < stack; k++) list.push(sdf.torus(0.21, 0.1).at((i - (along - 1) / 2) * 0.62, 0, 0.1 + k * 0.2).mat(k === paint && i % 2 ? "paint" : "rubber"))
  return { field: sdf.union(list) }
}, { params: { stack: [1, 6], along: [1, 8], paint: [-1, 5] } })
// a cone `height` m: orange, a white band above its middle, on a square rubber foot
make3d.define("cone", ({ height: h = 0.5 } = {}) => {
  const body = sdf.cone(0.15, h, 0.025).at(0, 0, 0.03).paint((p) => (p[2] > h * 0.5 && p[2] < h * 0.68 ? "paint" : "orange"))
  return { field: body.union(sdf.box([0.36, 0.36, 0.04], { round: 0.01 }).at(0, 0, 0.02).mat("rubber")) }
}, { params: { height: [0.3, 1] } })
// a barrier along x, `length` m of `blocks` blocks red and white by turns, 0.45 m thick, `height` m tall
make3d.define("barrier", ({ length: L = 2.46, blocks = 2, height: H = 0.8 } = {}) => {
  const b = L / blocks
  return { field: sdf.box([L, 0.45, H], { round: 0.06 }).at(0, 0, H / 2).paint((p) => (Math.floor((p[0] + L / 2) / b) % 2 ? "paint" : "red")) }
}, { params: { length: [1, 12], blocks: [1, 8], height: [0.5, 1.5] } })
// a start gantry spanning `span` m in x (the track and a step each side), `height` m to its beam: two posts, the beam,
// a checkered banner under it (squares 0.33 m)
make3d.define("gantry", ({ span: S = 8.6, height: H = 4.6 } = {}) => {
  const post = (s) => sdf.box([0.3, 0.3, H], { round: 0.03 }).at((s * S) / 2, 0, H / 2).mat("metal")
  const banner = sdf.box([S - 0.5, 0.08, 1.0]).at(0, 0, H - 0.72).paint((p) => ((Math.floor((p[0] + S) / 0.33) + Math.floor(p[2] / 0.33)) % 2 ? "black" : "paint"))
  return { field: sdf.union([post(-1), post(1), sdf.box([S + 0.3, 0.35, 0.35]).at(0, 0, H).mat("metal"), banner]) }
}, { params: { span: [4, 16], height: [3, 8] } })
// a street lamp, its post `height` m to the lantern: a stepped foot, an iron post, a lantern of warm glass in an iron
// frame, a round cap and its knob
make3d.define("lamp", ({ height: H = 3.2 } = {}) => {
  const iron = sdf.union([sdf.box([0.42, 0.42, 0.14], { round: 0.02 }).at(0, 0, 0.07), sdf.box([0.26, 0.26, 0.12]).at(0, 0, 0.2), sdf.box([0.14, 0.14, H]).at(0, 0, H / 2),
    ...[-1, 1].flatMap((s) => [-1, 1].map((t) => sdf.box([0.06, 0.06, 0.6]).at(s * 0.19, t * 0.19, H + 0.3))), sdf.box([0.46, 0.46, 0.06]).at(0, 0, H + 0.03),
    sdf.cone(0.27, 0.16, 0.02).at(0, 0, H + 0.6), sdf.sphere(0.04).at(0, 0, H + 0.78)]).mat("iron")
  return { field: iron.union(sdf.box([0.36, 0.36, 0.56]).at(0, 0, H + 0.33).mat("glass")) }
}, { params: { height: [2, 8] } })
// At racing_topdown: each seen from its 58 degrees (what stands as its cars: one camera), facing us, in 3 tones. The
// small things at twice the car's scale, racing_topdown's boxes for them (its scale's tyres, cone, barrier, lamp), as
// Super Sprint draws its small things about twice true (at the car's they were 2-4 px); the gantry at the car's, as it
// spans the track. tyres (a stack), tyre_wall (four stacks, 32 px: two tiles along a straight), cone, barrier (two
// tiles), lamp (two tiles tall, the village's lamp's size), gantry (over a road running north-south).
const PPM = 28 / 4.3, BIG = 2 * PPM
const TD = { ...DRAW, view: { kind: "side", pitch: genre("racing_topdown").stand }, headings: ["s"], genre: "racing_topdown", category: "prop" }
for (const [name, thing, ppm] of [["tyres", make3d.tyres(), BIG], ["tyre_wall", make3d.tyres({ along: 4, paint: 1 }), BIG], ["cone", make3d.cone(), BIG], ["barrier", make3d.barrier(), BIG], ["lamp", make3d.lamp(), BIG], ["gantry", make3d.gantry(), PPM]]) {
  turnaround(`_${name}_td`, thing, { ...TD, ppm })
  sprite(name, { base: `_${name}_td_s` })
}
const BEHIND = "racing_behind's car too: one model for both cameras (drawn from behind in library F5's stage 5b proof), its cells to come"
card("make3d.tyres", { is: `a stack of tyres in meters, each 0.62 m across and 0.2 m thick, three high; stacks side by side make a tyre wall; ${BEHIND}`, cells: { "topdown/16": ["◐", "tyres"] }, category: "tyres", draw: DRAW,
  vary: { part: "tyre_wall: four stacks along a straight (two tiles at racing_topdown), every other one's middle tyre white" } })
card("make3d.cone", { is: `a traffic cone in meters, 0.5 m: orange, a white band, a square rubber foot; ${BEHIND}`, cells: { "topdown/16": ["◐", "cone"] }, category: "cone", draw: DRAW })
card("make3d.barrier", { is: `a barrier in meters: blocks red and white by turns, 0.45 m thick, 0.8 m tall, along a straight (two tiles at racing_topdown); ${BEHIND}`, cells: { "topdown/16": ["◐", "barrier"] }, category: "barrier", draw: DRAW })
card("make3d.gantry", { is: `a start gantry in meters over the line: two posts 4.6 m tall, a beam, a checkered banner under it, spanning 8.6 m (the track and a step each side); ${BEHIND}`, cells: { "topdown/16": ["◐", "gantry"] }, draw: DRAW })
card("make3d.lamp", { is: `a street lamp in meters, 4 m: a stepped foot, an iron post, a lantern of warm glass in an iron frame, a round cap, in the village lamp's iron and glass; ${BEHIND}`, cells: { "topdown/16": ["◐", "lamp"] }, category: "lamp", draw: DRAW })

// ---------------------------------------------------------------- skid marks
// A car's skid marks: its two rear tyres' trails, each 1 px of rubber going to the asphalt's dark grain and fading at the tail. `path(t)`
// where the car's middle is at t ([x, y]), `t` now and `length` back from it in the path's own time; `gap` px between
// the tyres (the car's 16 px across less a tyre each side: 12), `back` px from its middle to the rear axle
const skid = (c, path, { t, length, gap = 12, back = 7, fade = 0.6 } = {}) => {
  const at = (s, side) => {
    const p = path(s), q = path(s + length / 100), dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1
    return [p[0] - (dx / l) * back + (-dy / l) * side * gap / 2, p[1] - (dy / l) * back + (dx / l) * side * gap / 2]
  }
  // a stretch every 1.5 px of the path (trail() leaves out one under 0.8 px)
  let px = 0
  for (let i = 0; i < 20; i++) { const a = path(t - (length * i) / 20), b = path(t - (length * (i + 1)) / 20); px += Math.hypot(a[0] - b[0], a[1] - b[1]) }
  const step = length / Math.max(4, Math.round(px / 1.5))
  for (const side of [-1, 1]) c.trail((s) => at(s, side), "Tq", { t, length, width: [1, 1], fade, step })
}
// a bend's marks, 40 x 40: a quarter turn of 24 px radius round its upper left corner
sprite("skid", { w: 40, h: 40 }, (c) => skid(c, (s) => [4 + 28 * Math.sin(s), 4 + 28 * Math.cos(s)], { t: Math.PI / 2, length: Math.PI / 2 }))
card("skid", { is: "a bend's skid marks, 40x40: two 1 px trails of rubber going to the asphalt's dark grain, fading at the tail; track.skid(c, path, { t, length }) draws them behind a car on any path", cells: { "topdown/16": "✎" } })
Object.assign(track, { skid })
}
