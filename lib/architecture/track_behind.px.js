// A race track for racing_behind (lib/profiles/racing_behind.px.js: Mario Kart's kind, the floor a flat map seen in
// perspective by plane()): the map's tiles drawn from above at the profile's 8 px tile, and the things that stand along
// it drawn from its camera, each at a ladder of sizes for its distances (Super Circuit draws its trees by size: 64, 32,
// 16 and 8 px tall; measured for numbers only, library F5's stage 7a study). For any scene:
// include("<path>/lib/architecture/track_behind.px.js", { as: "circuit" }), its palette its own.
// - The floor (a map px 0.177 m, the kart 7 map px across: library F5's stage 7a), corner sets as the top-down track's
//   (lib/architecture/track.px.js; a set bit is the first terrain: 1 top-left, 2 top-right, 4 bottom-left, 8
//   bottom-right), each with 4 variants: the grass's tone (v & 1: light, dark, laid in bands for mown stripes) and the
//   asphalt's grain (v >> 1):
//   - road_<mask>_<v>: asphalt with a fine grain, its edge line 2 px (white, a paler one inside), the grass;
//   - kerb_<mask>_<v>: the same with a kerb for its edge (red and white blocks 4 px along, 5 across, a dark lip on the
//     grass side), for the bends; kerbsand_<mask>_<v> the kerb on the sand (the outside of a bend);
//   - sand_<mask>_<v>: a runoff of sand and its grain on the grass (sand the set bit);
//   - start_<mask>: the road's tiles with the start line's checker (2 px squares, 8 px deep) across a road running
//     north-south; grid_mark a kart's place on the grid; boost a strip painted on the road, arrows up the map.
//   Nine rows of road corners make the asphalt 72 px edge to edge: 12.7 m, 10.2 karts (the profile's 10.5).
// - What stands, `<name>_<k>`, k the rung: drawn for 11 m from the eye (your kart's distance) and its doublings (22,
//   44, 89, 178 m), each from the angle down to it there (17, 8.5, 4.3, 2.1, 1.1 degrees), at half the size each rung,
//   none under 4 px; under 16 px tall without its line. Their line racing_behind's ink for props: all round, each part
//   in its own darker tones (surface's ink: 2), never near-black. Lit from the upper left and a little from the camera.
//   The top-down kit's builders (track.px.js: tyres, tyre_wall, cone, barrier, lamp at 24 px a meter at 11 m, true to
//   the floor; the gantry from 22 m, spanning this road), and new ones: make3d.chevron (a bend's sign), make3d.guardrail,
//   make3d.flag, make3d.grandstand (its crowd), make3d.billboard (blank). The trees, the palm and the backdrop:
//   lib/nature/trackside_behind.px.js.
include("../profiles/racing_behind.px.js")
include("track.px.js", { as: "track" })
pal({
  q: "#45475a", n: "#56586c", F: "#686a7f",   // asphalt: its dark grain, body, light grain (the top-down track's)
  w: "#f4f2ea", W: "#c9c7cf",                 // the edge line, and its paler inside; the kerb's and the checker's white
  R: "#e8414b", Q: "#9c2a3a",                 // the kerb's red, its lip
  g: "#6cbc40", G: "#58a238", m: "#4c8f34",   // grass: its light and dark bands, a blade mark
  d: "#e2c88e", D: "#c4a46a",                 // sand and its grain
  k: "#1e1a2e",                               // the checker's black
  y: "#ffd84a", o: "#ff8a2a", O: "#a8461c",   // the boost strip's arrows, their edge
  p: "#2c2840",                               // its panel
})
var circuit = {}
// in a block: its names stay its own when a scene includes the file
{
const T = 8
// ---------------------------------------------------------------- the floor's tiles
// the asphalt: its body with a grain of single pixels, a tenth dark, one in twenty light, a variant's own; the grass in
// its band's tone with a blade mark a step darker here and there; the sand with its grain
const asphalt = (x, y, v) => { const h = hash(x, y, 11 + (v >> 1)); return h < 0.1 ? "q" : h > 0.95 ? "F" : "n" }
const grass = (x, y, v) => (hash(x, y, 31 + (v >> 1)) > 0.93 ? "m" : v & 1 ? "G" : "g")
const sand = (x, y, v) => (hash(x, y, 41 + (v >> 1)) > 0.85 ? "D" : "d")
// the bands by how much of the tile's corners are the first terrain (t, linear: 1/8 a px across a straight edge)
corners("road", { size: T, variants: 4 }, (x, y, t, v) => (t >= 0.625 ? asphalt(x, y, v) : t >= 0.5 ? "W" : t >= 0.375 ? "w" : grass(x, y, v)))
const kerbed = (off) => (x, y, t, v) => (t >= 0.875 ? asphalt(x, y, v) : t >= 0.375 ? "R" : t >= 0.25 ? "Q" : off(x, y, v))
corners("_kerb", { size: T, variants: 4 }, kerbed(grass))
corners("_kerbsand", { size: T, variants: 4 }, kerbed(sand))
corners("sand", { size: T, variants: 4 }, (x, y, t, v) => (t >= 0.5 ? sand(x, y, v) : grass(x, y, v)))
// The kerb's blocks, 4 px along, red and white by turns, as the top-down track's: along a straight by x or y, round a
// bend's corner by the angle from it (red where it leaves by the left or the top, white by the right or the bottom)
const ARC = { 1: [0, 0, "RWR"], 14: [0, 0, "RWR"], 2: [T, 0, "WR"], 13: [T, 0, "WR"], 4: [0, T, "RW"], 11: [0, T, "RW"], 8: [T, T, "WRW"], 7: [T, T, "WRW"] }
const red = (x, y, m) => {
  if (m === 3 || m === 12) return (x >> 2) % 2 === 0
  if (m === 5 || m === 10) return (y >> 2) % 2 === 0
  const a = ARC[m]
  if (!a) return ((x + y) >> 2) % 2 === 0
  const th = Math.atan2(Math.abs(x + 0.5 - a[0]), Math.abs(y + 0.5 - a[1])) / (Math.PI / 2)
  return a[2][Math.min(a[2].length - 1, Math.floor(th * a[2].length))] === "R"
}
const blocks = (m) => (c) => {
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    if (c.is(x, y, "R")) c.px(x, y, red(x, y, m) ? "R" : "w")
    else if (c.is(x, y, "Q")) c.px(x, y, red(x, y, m) ? "Q" : "W")
  }
}
for (const set of ["kerb", "kerbsand"]) for (let m = 0; m < 16; m++) {
  for (let v = 0; v < 4; v++) sprite(`${set}_${m}_${v}`, { base: `_${set}_${m}_${v}` }, blocks(m))
  group(`${set}_${m}`, [0, 1, 2, 3].map((v) => `${set}_${m}_${v}`))
}
// the start line across the asphalt of a road running north-south: a checker of 2 px squares over the tile's 8 rows
for (let m = 1; m < 16; m++) sprite(`start_${m}`, { base: `road_${m}_0` }, (c) => {
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) if (c.is(x, y, "qnF")) c.px(x, y, ((x >> 1) + (y >> 1)) % 2 ? "k" : "w")
})
// a kart's place on the grid (the kart 7 px across, 8 along): a white bar before its nose, its arms back along its sides
sprite("grid_mark", { pivot: "center" }, `
  wwwwwwwww
  w.......w
  w.......w
  w.......w`)
// a boost strip, 16 x 32: a dark panel with an orange edge, three arrows up the map in yellow on orange
sprite("boost", { w: 16, h: 32 }, (c) => {
  c.rect(0, 0, 16, 32, "O"); c.rect(1, 1, 14, 30, "p")
  for (let k = 0; k < 3; k++) for (let i = 0; i < 6; i++) {
    const y = 4 + k * 9 + i, x = 7 - i
    c.rect(x, y, 2 + 2 * i, 1, i < 2 ? "y" : "o"); c.rect(x + 2, y + 1, 2 * i - 2, 1, "p")
  }
})
const FLOOR = { "behind/8": "✎" }
card("road_0", { is: "racing_behind's floor: the road's 16 corner tiles on the grass at an 8 px tile (road_0 all grass to road_15 all asphalt): asphalt with a fine grain, an edge line 2 px (white, a paler one inside); 4 variants a mask, the grass's tone (v & 1, in bands for mown stripes) and the grain (v >> 1); nine rows of road corners make 72 px of asphalt (12.7 m, 10.2 karts)", cells: FLOOR,
  vary: { part: "road_<mask>_<v>; kerb_<mask>_<v> with a kerb for its edge, kerbsand_ the kerb on the sand, sand_ the runoff on the grass, start_<mask> the start line" } })
card("kerb_0", { is: "the road's corner tiles with a kerb for its edge: red and white blocks 4 px along and 5 across, a dark lip outside, turning round a bend's corner; kerbsand_ the same on the sand (a bend's outside)", cells: FLOOR })
card("sand_0", { is: "a sand runoff's 16 corner tiles on the grass (sand the set bit), the sand with its grain, for the outside of a bend", cells: FLOOR })
card("start_15", { is: "the start line on the road's asphalt, across a road running north-south: a checker of 2 px squares 8 px deep, stopping at the edge line", cells: FLOOR })
card("grid_mark", { is: "a kart's place on the starting grid, 9 x 4: a white bar before its nose, its arms back along its sides", cells: FLOOR })
card("boost", { is: "a boost strip painted on the road, 16 x 32: a dark panel edged in orange, three arrows pointing up the map", cells: FLOOR })

// ---------------------------------------------------------------- what stands, new builders
// In meters, as the top-down kit's (x across, y along, z up; their colors the kit's MATS, the cards' draw): a bend's
// chevron sign (a board of chevrons on two posts), a guardrail, a flag on a pole, a grandstand with its crowd, a blank
// billboard.
const KIT = card("make3d.cone").draw, MATS = {
  ...KIT.mats,
  board: ["#3f3d55", "#4a4860", "#c9c7cf", "#eeebe0", "#ffffff"],
  blue: ["#1c2a4e", "#22335c", "#2f4f8e", "#4a7ccc", "#7db4ec"], green: ["#16402a", "#1c4d32", "#2c7a44", "#4aa858", "#8ed49c"],
  yellow: ["#6a4a0c", "#7a5810", "#c9952a", "#ffd84a", "#fff2a0"], skin: ["#5a3020", "#6a3a26", "#a8644f", "#de9f76", "#f6cfa5"],
}
// a chevron sign `width` m: a board on two posts, red chevrons pointing `way` (1 right, -1 left) on white
make3d.define("chevron", ({ width: W = 1.4, way = 1 } = {}) => {
  const zc = 0.95, board = sdf.box([W, 0.06, 0.6], { round: 0.02 }).at(0, 0, zc)
    .paint((p) => (Math.floor((way * p[0] + Math.abs(p[2] - zc) + 3) / 0.25) % 2 ? "red" : "paint"))
  const posts = sdf.union([-1, 1].map((s) => sdf.box([0.08, 0.08, zc], { round: 0.01 }).at(s * W * 0.35, 0.05, zc / 2))).mat("metal")
  return { field: board.union(posts) }
}, { params: { width: [0.8, 3], way: [-1, 1] } })
// a guardrail along x, `length` m: a steel beam with its two ridges 0.55 m up, on posts every meter
make3d.define("guardrail", ({ length: L = 4 } = {}) => {
  const beam = sdf.box([L, 0.08, 0.3], { round: 0.02 }).at(0, -0.06, 0.55).paint((p) => (Math.abs(p[2] - 0.55) < 0.03 ? "iron" : "metal"))
  const posts = sdf.union(Array.from({ length: Math.floor(L) + 1 }, (_, i) => sdf.box([0.1, 0.1, 0.7]).at(-L / 2 + i * (L / Math.floor(L)), 0.04, 0.35))).mat("iron")
  return { field: beam.union(posts) }
}, { params: { length: [1, 12] } })
// a flag on a pole `height` m: the pole, its knob, a flag of two bands (the red over the white) flying from its top
make3d.define("flag", ({ height: H = 3.4 } = {}) => {
  const pole = sdf.cylinder(0.04, H).union(sdf.sphere(0.07).at(0, 0, H)).mat("paint")
  const flag = sdf.box([0.9, 0.03, 0.56]).rotate(-25, "z").at(0.42, -0.2, H - 0.34).paint((p) => (p[2] > H - 0.34 ? "red" : "paint"))
  return { field: pole.union(flag, sdf.box([0.3, 0.3, 0.1]).at(0, 0, 0.05).mat("metal")) }
}, { params: { height: [2, 6] } })
// a grandstand `width` m: four tiers stepping up and back, the crowd sitting on them (a cell 0.35 m a person: a shirt of
// one of four colors, a head of skin or hair over it), a back wall, a roof on posts
make3d.define("grandstand", ({ width: W = 8, tiers = 4 } = {}) => {
  const step = 0.55, deep = 0.8, list = []
  for (let i = 0; i < tiers; i++) {
    list.push(sdf.box([W, deep, step * (i + 1)]).at(0, i * deep, (step * (i + 1)) / 2).mat("metal"))
    const z0 = step * (i + 1)
    list.push(sdf.box([W - 0.2, 0.36, 0.5], { round: 0.08 }).at(0, i * deep - 0.1, z0 + 0.25).paint((p) => {
      const cell = Math.floor((p[0] + W) / 0.35) + 17 * i, h = hash(cell, i, 5)
      return p[2] > z0 + 0.36 ? (h > 0.75 ? "black" : "skin") : ["red", "blue", "yellow", "green", "paint"][Math.floor(hash(cell, i, 9) * 5)]
    }))
  }
  const back = sdf.box([W, 0.2, step * tiers + 1.6]).at(0, tiers * deep - 0.3, (step * tiers + 1.6) / 2).mat("iron")
  const roof = sdf.box([W + 0.4, tiers * deep + 0.8, 0.15]).rotate(-6, "x").at(0, (tiers * deep) / 2 - 0.3, step * tiers + 1.9).paint((p, n) => (n[2] > 0.5 ? "red" : "iron"))
  const posts = sdf.union([-1, 1].map((s) => sdf.box([0.15, 0.15, step * tiers + 1.9]).at(s * (W / 2 - 0.1), -0.25, (step * tiers + 1.9) / 2))).mat("iron")
  return { field: sdf.union([...list, back, roof, posts]) }
}, { params: { width: [4, 16], tiers: [2, 6] } })
// a blank billboard `width` m: a white board in a frame, on two legs 1.4 m tall
make3d.define("billboard", ({ width: W = 3.6, height: H = 1.8 } = {}) => {
  const board = sdf.box([W, 0.1, H], { round: 0.03 }).at(0, 0, 1.4 + H / 2).paint((p, n) => (n[1] < -0.7 && Math.abs(p[0]) < W / 2 - 0.08 && Math.abs(p[2] - 1.4 - H / 2) < H / 2 - 0.08 ? "board" : "metal"))
  const legs = sdf.union([-1, 1].map((s) => sdf.box([0.14, 0.14, 1.45]).at(s * W * 0.32, 0.08, 0.72))).mat("iron")
  return { field: board.union(legs) }
}, { params: { width: [1.5, 8], height: [0.8, 4] } })
const NEW = { chevron: "a bend's chevron sign, 1.4 m: red chevrons on a white board on two posts (way: 1 points right, -1 left)",
  guardrail: "a guardrail, 4 m: a steel beam with its ridges 0.55 m up on posts every meter",
  flag: "a flag on a pole, 3.4 m: a white pole, a flag of two bands, red over white",
  grandstand: "a grandstand, 8 m across: four tiers stepping up and back, its crowd sitting on them in shirts of five colors, a back wall, a red roof on posts",
  billboard: "a blank billboard, 3.6 x 1.8 m: a white board in a frame on two legs" }

// ---------------------------------------------------------------- what stands, drawn at racing_behind
// rung k for (11.1 m from the eye) x 2^k: seen from atan(eye / z) down, at ppm / 2^k; under 16 px tall without its line
// (the density rule: a line all round would be most of it), so outside the genre's ink and its footprint check
const GB = genre("racing_behind"), C = GB.camera, NEAR = C.focal / GB.ppm
const LIGHT = [-0.6, -0.3, 0.75], LOOK = { soft: 0.4, rim: 0.6, outline: false, ink: 2 }, { ink: _ink, ...BARE } = LOOK
// circuit.rungs({ ppm, from, to, tall, category, mats, line }): each rung's [k, its turnaround() options] (`ppm` at rung 0,
// `tall` its height in m, `line` the px tall it is lined from: 16), the caller drawing them (pxl check reads a thing in the file that draws it):
//   for (const [k, o] of circuit.rungs(spec)) { turnaround(`_${name}_${k}`, thing, o); sprite(`${name}_${k}`, { base: `_${name}_${k}_s` }) }
const rungs = ({ ppm, from = 0, to = 3, tall, category = "prop", mats = MATS, line = 16 }) => {
  const out = []
  for (let k = from; k <= to; k++) {
    const p = ppm / 2 ** k, px = tall * p
    if (px < 4) break
    const pitch = (Math.atan(C.eye / (NEAR * 2 ** k)) * 180) / Math.PI, lined = px >= line
    out.push([k, { view: { kind: "side", pitch }, ppm: p, headings: ["s"], mats, light: LIGHT, surface: lined ? LOOK : { ...BARE, rim: 0.3 }, ...(lined ? { genre: "racing_behind", category } : {}) }])
  }
  return out
}
const ladder = (name, thing, spec) => {
  const made = rungs(spec).map(([k, o]) => { turnaround(`_${name}_${k}`, thing, o); sprite(`${name}_${k}`, { base: `_${name}_${k}_s` }); return `${name}_${k}` })
  group(name, made)
  return made.map((n) => own(n))
}
const ROAD = 12.7 + 1.8   // the gantry spans the road and a step each side
const STAND = [
  ["tyres", make3d.tyres(), { ppm: 24, tall: 0.6 }], ["tyre_wall", make3d.tyres({ along: 4, paint: 1 }), { ppm: 24, tall: 0.6 }],
  ["cone", make3d.cone(), { ppm: 24, to: 2, tall: 0.5 }], ["barrier", make3d.barrier(), { ppm: 24, tall: 0.8 }],
  ["lamp", make3d.lamp(), { ppm: 24, tall: 4 }], ["gantry", make3d.gantry({ span: ROAD }), { ppm: 24, from: 1, to: 4, tall: 4.8 }],
  ["chevron", make3d.chevron(), { ppm: 24, tall: 1.25 }], ["guardrail", make3d.guardrail(), { ppm: 24, tall: 0.7 }],
  ["flag", make3d.flag(), { ppm: 24, to: 2, tall: 3.5 }], ["grandstand", make3d.grandstand(), { ppm: 24, from: 1, to: 4, tall: 4.2 }],
  ["billboard", make3d.billboard(), { ppm: 24, tall: 3.2 }],
]
const RUNGS = {}
for (const [name, thing, o] of STAND) RUNGS[name] = ladder(name, thing, o)
const BEHIND = "at racing_behind, a rung k for 11 m from the eye x 2^k, from the angle down to it there, half the size a rung (its group: the rungs)"
for (const [name, , o] of STAND) card(`${name}_${o.from ?? 0}`, { is: `${["tyres", "tyre_wall", "cone", "barrier", "lamp", "gantry"].includes(name) ? `make3d.${name === "tyre_wall" ? "tyres" : name} (the top-down kit's)` : `make3d.${name}`} ${BEHIND}: ${RUNGS[name].join(", ")}`, cells: { "behind/24ppm": "◐" }, category: "prop" })
for (const [name, is] of Object.entries(NEW)) card(`make3d.${name}`, { is, cells: { "behind/24ppm": ["◐", RUNGS[name][0]] }, category: "prop", draw: { ...KIT, mats: MATS } })
// circuit.rung(name, z): the rung for a thing z m from the eye (the nearest by size; past its last, its last: none is
// drawn under 4 px), circuit.RUNGS its names
const rung = (name, z) => { const L = RUNGS[name], k0 = Number(L[0].split("_").pop()), k = Math.round(Math.log2(Math.max(1, z / NEAR))); return L[Math.max(0, Math.min(L.length - 1, k - k0))] }
Object.assign(circuit, { RUNGS, rung, rungs, NEAR, LIGHT, MATS })
}
