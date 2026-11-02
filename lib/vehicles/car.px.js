// A car: a small two-door coupe with a wedge nose, a narrow greenhouse leaning in, a ducktail wing on two struts, a
// stripe down its middle and a roundel on its roof, as a 3D builder in meters, seen by racing from above
// (lib/profiles/racing_topdown.px.js) and from behind (racing_behind.px.js). For any scene:
// include("<path>/lib/vehicles/car.px.js", { as: "car", palette: true }) (its palette yours, to draw it at a cell of
// your own in its role keys). make3d.car (x across, right +; y along, its nose at -y as turnaround()'s front; z up):
// `length`, `width`, `height` (the roof), `wheelbase`, `spoiler` 0..1 (none to a tall wing), `number` (the roof's
// decal: num7, num7_laguna, a plain roundel, roundel_laguna, or none), `numsize` (its m across: a cell's, a texel a
// screen px is 7 / ppm) and `stance` (m the tyres stand out past the body: 0 flush, the lab's). Sockets
// `exhaust` (rear right) and `tow` (rear middle). Colors by role: the model paints with role names, car.ROLES gives
// each its keys, a livery other keys (car.LIVERY.fuego, .laguna): mats: car.LIVERY.laguna in 3D, roleSwap(car.ROLES,
// car.LIVERY.laguna) in 2D. car.SPEC the two cars (laguna a shorter tail, a low lip for a wing).
// At racing_topdown: car_fuego and car_laguna, its 32 rotations each (a group, n, 11, nne, 34, ne, ... clockwise
// from facing up the picture, a heading off the 16-point compass named by its degrees), seen from the genre's 58
// degrees at 28 px along, 3 tones, a line all round, a roundel on the roof; the pivot where its origin lands, the
// middle of its footprint, so it turns in place. car.facing(livery, heading): its rotation facing a route's heading. From the
// library's first lab: the model, the roles and the decal.
include("../profiles/racing_topdown.px.js")
const car = {}
// in a block: its names stay its own when a scene includes the file
{
// ---------------------------------------------------------------- colors by role
pal({
  k: "#120e16", t: "#2a2630", T: "#48424f", s: "#77727f", S: "#c4c0cc",        // tyre, trim, rim (dark to light)
  g: "#141d33", G: "#2b4466", h: "#86aacb",                                     // glass, the sky in it
  r: "#5c1418", R: "#ff2e48", e: "#ffd2b8", y: "#9a8458", Y: "#fff2c4",         // tail lights, headlights
  a: "#4a1424", A: "#8e2230", b: "#d8432e", B: "#ff9a5e", w: "#7e7a8c", W: "#d6d2de", x: "#ffffff",   // livery "fuego"
  c: "#0c2432", C: "#125460", d: "#1f9488", D: "#7ad8b4", u: "#6a4a0c", U: "#d89e1c", v: "#ffe27a",   // livery "laguna"
})
ramps("aAbB", "wWx", "cCdD", "uUv", "gGh", "rRe", "yY", "ktTsS")
// a role to its ramp's keys, dark to light
const ROLES = { primary: "aAbB", accent: "wWx", glass: "gG", tyre: "ktT", rim: "TsS", tail: "rR", head: "yY", trim: "ktT" }
const LIVERY = { fuego: ROLES, laguna: { ...ROLES, primary: "cCdD", accent: "uUv" } }
const SPEC = { fuego: { number: "num7" }, laguna: { number: "num7_laguna", spoiler: 0.25, length: 4.1 } }

// the number: a roundel in the accent with the digit in the tyre's black, pinned on the roof (laguna's the same
// swapped)
sprite("num7", { pivot: "center" }, `
  .WWWWW.
  WWkkkWW
  WWWWkWW
  WWWkWWW
  WWWkWWW
  WWWkWWW
  .WWWWW.`)
sprite("num7_laguna", { base: "num7", swap: roleSwap(ROLES, LIVERY.laguna) })
// from above, the roundel alone: a disc is the same at every heading
sprite("roundel", { pivot: "center" }, `
  .WWW.
  WWWWW
  WWWWW
  WWWWW
  .WWW.`)
sprite("roundel_laguna", { base: "roundel", swap: roleSwap(ROLES, LIVERY.laguna) })
// (the decal by its full name, so the model finds it under an include's as)
const NUM = { num7: own("num7"), num7_laguna: own("num7_laguna"), roundel: own("roundel"), roundel_laguna: own("roundel_laguna") }

// ---------------------------------------------------------------- the model
// The lower body a rounded slab from the sills to the belt, the hood sloping down to the nose; the greenhouse narrower
// and leaning in, its windshield and rear window raked, its top (the roof) painted, its sides glass; arches cut round
// four wheels (tyre, rim); tail lights, headlights, a black diffuser; mirrors; the wing on two struts. The livery: the
// body in primary, a stripe down its middle in accent on what faces up or out.
const N = (v) => { const l = Math.hypot(...v); return v.map((e) => e / l) }
const below = (n, p) => { const u = N(n); return sdf.plane(u, u[0] * p[0] + u[1] * p[1] + u[2] * p[2]) }   // the side of the plane through p away from n
make3d.define("car", ({ length: L = 4.3, width: W = 1.85, height: H = 1.22, wheelbase: B = 2.55, spoiler: SP = 0.6, number = "num7", numsize = 0.62, stance = 0 } = {}) => {
  const R = 0.33, clear = 0.16, belt = Math.min(0.74, H * 0.6), tw = 0.26
  const yA = -L / 2 + 1.3, yC = L / 2 - 0.7                      // the windshield's foot, the rear window's foot
  const stripe = (p, n) => (Math.abs(p[0]) < 0.17 && n[2] > -0.3 ? "accent" : "primary")
  const arch = (y) => sdf.cylinder(R + 0.06, W + 0.4).at(0, 0, -(W + 0.4) / 2).rotate(90, "y").at(0, y, R)
  const lower = sdf.box([W, L, belt - clear], { round: 0.12 }).at(0, 0, (clear + belt) / 2)
    .intersect(below([0, -0.16, 1], [0, yA, belt]))              // the hood falls 0.2 m to the nose
    .subtract(arch(-B / 2), arch(B / 2)).paint(stripe)
  const roofTop = (p, n) => (n[2] > 0.8 ? stripe(p, n) : "glass")
  const cabin = sdf.box([W * 0.84, yC - yA, H - belt + 0.1]).at(0, (yA + yC) / 2, (belt + H) / 2 - 0.05)
    .intersect(below([0, -0.62, 0.78], [0, yA, belt]), below([0, 0.75, 0.66], [0, yC, belt]),  // windshield, rear window raked
      below([1, 0, 0.32], [W * 0.42, 0, belt]), below([-1, 0, 0.32], [-W * 0.42, 0, belt])).paint(roofTop)  // the sides leaning in
  const wheel = (x, y) => sdf.cylinder(R, tw).at(0, 0, -tw / 2).rotate(90, "y").at(x, y, R).mat("tyre")
    .union(sdf.cylinder(R * 0.58, tw + 0.02).at(0, 0, -(tw + 0.02) / 2).rotate(90, "y").at(x, y, R).mat("rim"))
  const wx = W / 2 - tw / 2 - 0.03 + stance
  const wheels = sdf.union([wheel(-wx, -B / 2), wheel(wx, -B / 2), wheel(-wx, B / 2), wheel(wx, B / 2)])
  const lamp = (y, z, m) => sdf.union([-1, 1].map((s) => sdf.box([0.42, 0.06, 0.13], { round: 0.02 }).at(s * (W / 2 - 0.3), y, z))).mat(m)
  const lights = lamp(L / 2, belt - 0.12, "tail").union(lamp(-L / 2 + 0.02, belt - 0.32, "head"),
    sdf.box([W * 0.8, 0.08, 0.12]).at(0, L / 2, clear + 0.07).mat("trim"),
    sdf.box([W - 0.3, 0.04, 0.17]).at(0, L / 2 - 0.005, belt - 0.12).mat("trim"))   // the black panel the tail lights sit in
  const mirrors = sdf.union([-1, 1].map((s) => sdf.box([0.16, 0.08, 0.09], { round: 0.02 }).at(s * (W / 2 + 0.05), yA + 0.2, belt + 0.1))).paint(stripe)
  const parts = { body: lower.union(cabin, mirrors).part("body"), wheels: wheels.part("wheels"), lights: lights.part("lights") }
  let field = parts.body.union(parts.wheels, parts.lights)
  if (SP > 0.05) {
    const up = 0.08 + 0.32 * SP, yw = L / 2 - 0.22
    parts.wing = sdf.box([W * 0.92, 0.3, 0.05], { round: 0.015 }).at(0, yw, belt + up)
      .union(...[-1, 1].map((s) => sdf.box([0.05, 0.14, up]).at(s * 0.5, yw, belt + up / 2))).mat("accent").part("wing")
    field = field.union(parts.wing)
  }
  const decals = number === "none" ? {} : { number: { asset: NUM[number], point: [0, (yA + yC) / 2 + 0.1, H + 0.05], mode: "wrap", up: [0, -1, 0], size: numsize } }
  return { field, parts, decals, sockets: { exhaust: [0.45, L / 2, clear + 0.1], tow: [0, L / 2 + 0.05, 0.3] } }
}, { params: { length: [3.6, 5.0], width: [1.6, 2.1], height: [1.0, 1.5], wheelbase: [2.2, 3.0], spoiler: [0, 1], number: ["num7", "num7_laguna", "roundel", "roundel_laguna", "none"], numsize: [0.3, 1.2], stance: [0, 0.3] } })

// ---------------------------------------------------------------- racing_topdown: 32 rotations a livery
// Seen from racing_topdown's 58 degrees (its pitch: one camera for the cars and all that stands; a little of their
// sides and their volume) at 28 px along (fuego's 4.3 m; laguna's 4.1 m at the same scale), lit from the upper left
// as the track's things are, its line the genre's ink for its characters all round. Made chunkier for the view, as
// Super Sprint's and Micro Machines' cars are (1.6-2 long a width: the profile's numbers): 1.9 m wide, the tyres
// standing 0.28 m out so they show at its corners. Its roof's mark a plain roundel: a disc reads at every heading
// (the lab's 3x5 digit read as a "?" from above), so one turnaround a livery.
const G = genre("racing_topdown")
const TD = { view: { kind: "side", pitch: G.pitch }, ppm: 28 / 4.3, n: 32, light: [-0.6, 0.5, 0.65], surface: { soft: 0.4, rim: 0.6, ink: G.ink.character }, mirror: false, genre: "racing_topdown", category: "character" }
const TOP = { width: 1.9, stance: 0.28, numsize: 5 / TD.ppm }, ROT = {}
for (const liv of ["fuego", "laguna"]) {
  const T = turnaround(`car_${liv}`, make3d.car({ ...SPEC[liv], ...TOP, number: liv === "fuego" ? "roundel" : "roundel_laguna" }), { ...TD, mats: LIVERY[liv] })
  ROT[liv] = T.names.map((n) => own(n))
}
card("make3d.car", { is: "a small two-door coupe in meters: a wedge nose, a narrow greenhouse leaning in, a ducktail wing on two struts, a stripe down its middle, a roundel on the roof (its number in it from behind); 4.3 x 1.85 x 1.22 m (1.9 wide, the tyres out, from above); racing_behind's car too, its cells to come",
  cells: { "topdown/16": ["◐", "car_fuego"] }, vary: { color: "liveries by roles: fuego (red-orange, white; car_fuego), laguna (teal, yellow; car_laguna); a third is one line", part: "the roof's mark (num7, num7_laguna, roundel, roundel_laguna, none), the wing by spoiler 0 (none) to 1", shape: "stance 0..0.3: the tyres out past the body" } })
// a livery's rotation facing `heading`, a route's [dx, dy] on the picture (up it is n; R.at(s).heading on a px route),
// the nearest of 32: car.facing("fuego", [1, 0]) is car.car_fuego_e
const facing = (liv, [dx, dy]) => { const n = ROT[liv].length; return ROT[liv][Math.round((Math.atan2(dx, -dy) * n) / (2 * Math.PI) + n) % n] }
Object.assign(car, { ROLES, LIVERY, SPEC, facing })
}
