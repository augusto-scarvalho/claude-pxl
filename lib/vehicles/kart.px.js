// A kart and its driver, Mario Kart's kind of racer (racing_behind: lib/profiles/racing_behind.px.js): an open
// pipe-frame kart with four fat tyres, a low tub, side pods, a seat, the engine behind it, and the library's top-down
// hero (lib/characters/hero.px.js, his 24 px chibi body) seated in it, his hands on the wheel. For any
// scene: include("<path>/lib/vehicles/kart.px.js", { as: "kart" }). make3d.kart (x across, right +; y along, its nose
// at -y as turnaround()'s front; z up), in meters: `width` (over the tyres), `wheelbase`, `tyre` (its diameter),
// `tread` (its width). Its proportions Mario Kart 8's standard kart and tyres (Collada, measured for numbers only:
// library F5's stage 7a study): the axles as far apart as the tyres' middles across (10 and 10 of the files' units), a
// tyre 0.35 of that across and 0.26 of it wide, the driver's hips between the axles (each body's origin 55-62% back from
// its nose); its size Super Circuit's: from behind as wide as two of its driver's heads. Sockets `seat` (the hips' point
// on the cushion), `wheel` (the steering wheel's middle), `pedals`, `exhaust`. Colors by role: the model paints with role
// names, kart.ROLES gives each its keys, a livery other keys (kart.LIVERY.fuego, .laguna; the car's two: red-orange and
// white, teal and yellow); the driver's roles the hero's colors. kart.racer(params) is the kart with the hero seated
// in it, one field, for turnaround() at any size (kart.VIEW its options, mats: kart.LIVERY.laguna its livery). As blocks (library F5's stage 7a): one flat tone a role, a line all
// round; kart_fuego and kart_laguna, the 48 headings of a full turn each (7.5 degrees apart, as Super Circuit's
// racers), seen from racing_behind's camera at its 24 px a meter: 25 drawn, front to back, the other 23 their mirrors.
include("../profiles/racing_behind.px.js")
include("../characters/hero.px.js", { as: "hero" })
const kart = {}
// in a block: its names stay its own when a scene includes the file
{
// ---------------------------------------------------------------- colors by role (flat: one tone each, for the blocks)
pal({
  k: "#1a1620",                                     // the line all round (racing_behind's ink)
  t: "#2a2630", T: "#48424f", s: "#9a96a6",         // tyre; trim (the frame, the engine, the wheel); rim and pipes
  e: "#3b2c3c",                                     // the seat
  b: "#d8432e", W: "#d6d2de",                       // livery "fuego": primary, accent (the car's)
  d: "#1f9488", U: "#d89e1c",                       // livery "laguna"
  z: "#de9f76", Y: "#b5653a", n: "#4c7fd0", p: "#5f5878", D: "#7f3f25",   // the hero: skin, hair, tunic, trousers, boots
})
// a role to its keys, dark to light (one key a role while the racer is blocks)
const ROLES = { primary: "b", accent: "W", tyre: "t", rim: "s", trim: "T", seat: "e", skin: "z", hair: "Y", tunic: "n", trousers: "p", boots: "D" }
const LIVERY = { fuego: ROLES, laguna: { ...ROLES, primary: "d", accent: "U" } }

// ---------------------------------------------------------------- the kart
// The tub a rounded slab between the wheels, its nose a wedge out past the front tyres with a bumper in the accent;
// side pods between the tyres; the seat on the tub, its back up to under the driver's shoulders (from behind his tunic
// shows over it); the engine block behind it over the rear axle, two pipes out of its back; the steering column up from
// the nose to a wheel; the axles.
const N = (v) => { const l = Math.hypot(...v); return v.map((e) => e / l) }
const below = (n, p) => { const u = N(n); return sdf.plane(u, u[0] * p[0] + u[1] * p[1] + u[2] * p[2]) }   // the side of the plane through p away from n
make3d.define("kart", ({ width: W = 1.25, wheelbase: B = 1.0, tyre: D = 0.36, tread: TW = 0.26 } = {}) => {
  const R = D / 2, x = W / 2 - TW / 2, floor = 0.1, seatY = 0.12, seatZ = 0.2
  const wheel = (sx, y) => sdf.cylinder(R, TW).at(0, 0, -TW / 2).rotate(90, "y").at(sx * x, y, R).mat("tyre")
    .union(sdf.cylinder(R * 0.5, TW + 0.02).at(0, 0, -(TW + 0.02) / 2).rotate(90, "y").at(sx * x, y, R).mat("rim"))
  const wheels = sdf.union([wheel(-1, -B / 2), wheel(1, -B / 2), wheel(-1, B / 2), wheel(1, B / 2)])
  const axles = sdf.union([-B / 2, B / 2].map((y) => sdf.cylinder(0.035, 2 * x).at(0, 0, -x).rotate(90, "y").at(0, y, R))).mat("trim")
  const tub = sdf.box([W - 2 * TW - 0.08, B + 0.55, 0.16], { round: 0.06 }).at(0, -0.1, floor + 0.04)
    .intersect(below([0, -0.5, 1], [0, -B / 2, 0.3])).mat("primary")                  // the nose falls toward the bumper
  const pods = sdf.union([-1, 1].map((s) => sdf.box([0.2, B - D - 0.06, 0.15], { round: 0.05 }).at(s * (x - 0.02), 0, floor + 0.12))).mat("primary")
  const bumper = sdf.box([W - 0.2, 0.1, 0.1], { round: 0.04 }).at(0, -B / 2 - R - 0.08, floor + 0.06).mat("accent")
  const seat = sdf.box([0.42, 0.3, 0.08], { round: 0.03 }).at(0, seatY, seatZ - 0.04)
    .union(sdf.box([0.42, 0.08, 0.3], { round: 0.03 }).at(0, seatY + 0.17, seatZ + 0.11)).mat("seat")
  const engine = sdf.box([0.4, 0.26, 0.24], { round: 0.03 }).at(0, B / 2 - 0.02, floor + 0.22).mat("trim")
    .union(sdf.union([-1, 1].map((s) => sdf.cylinder(0.04, 0.24).rotate(90, "x").at(s * 0.12, B / 2 + 0.2, floor + 0.3))).mat("rim"))
  // the wheel where the seated hero's hands are (kart.driver.joints, in his px: his short arms reach 0.23 m ahead of his
  // chest), the column down to the nose
  const wz = 0.43, wy = -0.05
  const steer = sdf.torus(0.1, 0.025).rotate(-60, "x").at(0, wy, wz).union(sdf.capsule([0, wy + 0.03, wz - 0.03], [0, -B / 2 + 0.05, floor + 0.15], 0.025, 0.025)).mat("trim")
  const parts = { body: tub.union(pods, bumper).part("body"), seat: seat.part("seat"), engine: engine.part("engine"), wheels: wheels.union(axles).part("wheels"), steer: steer.part("steer") }
  const field = parts.body.union(parts.seat, parts.engine, parts.wheels, parts.steer)
  return { field, parts, sockets: { seat: [0, seatY, seatZ], wheel: [0, wy, wz], pedals: [0, -B / 2 + 0.05, floor + 0.06], exhaust: [0.12, B / 2 + 0.32, floor + 0.3] } }
}, { params: { width: [1.0, 1.6], wheelbase: [0.8, 1.3], tyre: [0.28, 0.48], tread: [0.18, 0.34] } })

// ---------------------------------------------------------------- the driver: the hero seated
// His 24 px body (hero.G16: 27 px tall standing, 2.1 heads, the head's radius 6.43) posed by his own rig: the hips on the
// seat, the legs out to the pedals, leaning back 10 degrees, the hands forward and down to the wheel; as blocks, a
// piece a bone, one flat color a role (his skin, his brown hair as a cap over the back of his head, the blue tunic,
// the dark trousers, the boots). In his px, drawn at racing_behind's 24 px a meter (a px of his a px of the sprite: his
// native size; the head 15 px across with its line, Super Circuit's drivers' 16 on a 32 px kart).
const PPM = genre("racing_behind").ppm, G = hero.G16, BR = G.body.r
const SEATED = { down: 2.5, lean: -10, feet: [[4, -G.body.hips], [4, G.body.hips]], hands: [[5.5, 2, -3], [5.5, -2, -3]], elbow: [-0.4, 1, -0.6], air: true }
const J = hero.rig.joints(SEATED, 180)
const driver = (() => {
  const L = J.legs, A = J.arms, H = J.head, v = (p, d) => p.map((e, i) => e + d[i])
  const hairUp = N([0, 0.7, 1])                      // the hair's cap: the head's sphere a little bigger, above the brow and behind
  const hair = sdf.sphere(BR.head + 0.5).at(...H).intersect(sdf.plane(hairUp.map((e) => -e), -(hairUp[0] * H[0] + hairUp[1] * H[1] + hairUp[2] * H[2]) + 1.5))
  return sdf.union([
    sdf.sphere(BR.head).at(...H).mat("skin"), hair.mat("hair"),
    sdf.capsule(J.pelvis, J.chest, BR.body[0], BR.body[1]).mat("tunic"),
    ...A.map((a) => sdf.capsule(a.sh, a.elbow, BR.arm[0], BR.arm[1]).mat("tunic")),
    ...A.map((a) => sdf.capsule(a.elbow, a.hand, BR.arm[1], BR.arm[2]).union(sdf.sphere(BR.hand).at(...a.hand)).mat("skin")),
    ...L.map((l) => sdf.capsule(l.hip, l.knee, BR.leg[0], BR.leg[1]).union(sdf.capsule(l.knee, l.ankle, BR.leg[1], BR.leg[2])).mat("trousers")),
    ...L.map((l) => sdf.ellipsoid(BR.foot).at(...v(l.foot, [0, 0, 0.3])).mat("boots")),
  ])
})()
// the hero (his px, his feet's floor at 0 under his hips) into the kart's meters: his hips' point on the seat socket
const racer = (params = {}) => {
  const K = make3d.kart(params), [sx, sy, sz] = K.sockets.seat
  const hip = J.pelvis
  return K.field.union(driver.scale(1 / PPM).at(sx - hip[0] / PPM, sy - hip[1] / PPM, sz - (hip[2] - BR.leg[0]) / PPM))
}

// ---------------------------------------------------------------- racing_behind: 48 headings a livery, as blocks
// From the genre's camera (its pitch: the angle down to where your kart meets the road) at its 24 px a meter: one flat
// tone a role, its line all round (the genre's ink), lit from above and behind the camera, so the west half drawn and
// the east its mirror (turnaround's mirror "auto": Super Circuit's 25 drawings front to back and 23 mirrors).
const GB = genre("racing_behind")
const VIEW = { view: { kind: "side", pitch: GB.pitch }, ppm: PPM, n: GB.dirs.n, light: [0, -0.4, 0.9], surface: { soft: 0, rim: 0, ink: GB.ink.character, shadows: false, ao: 0 }, genre: "racing_behind", category: "character" }
const TURN = {}
for (const liv of ["fuego", "laguna"]) TURN[liv] = turnaround(`kart_${liv}`, racer(), { ...VIEW, mats: LIVERY[liv] }).names.map((n) => own(n))
card("make3d.kart", { is: "an open pipe-frame kart in meters, four fat tyres, a low tub and side pods, a seat, the engine behind; 1.25 m over the tyres, 1.0 m between the axles; with the hero seated in it (kart.racer) racing_behind's racer, blocks for now",
  cells: { "behind/24ppm": ["◐", "kart_fuego"] }, vary: { color: "liveries by roles: fuego (red-orange, white; kart_fuego), laguna (teal, yellow; kart_laguna)", shape: "width, wheelbase, tyre, tread" } })
// a livery's drawing for a heading against the camera (degrees, 0 its back to us: driving away; clockwise), the
// nearest of its 48
const facing = (liv, deg) => { const n = TURN[liv].length; return TURN[liv][((Math.round((deg * n) / 360) % n) + n) % n] }
// kart.VIEW: the drawings' turnaround() options, for a racer at another size (a rival far off: its ppm the floor's there)
Object.assign(kart, { ROLES, LIVERY, VIEW, racer, facing, driver: { pose: SEATED, joints: J } })
}
