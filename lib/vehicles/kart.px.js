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
// names, kart.ROLES gives each its ramp, a livery other ramps (kart.LIVERY.fuego, .laguna; the car's two: red-orange and
// white, teal and yellow); the driver's roles the hero's colors. kart.racer(params) is the kart with the hero seated
// in it, one field, for turnaround() at any size (kart.VIEW its options, mats: kart.LIVERY.laguna its livery).
// Painted (library F5's stage 7b): kart_fuego and kart_laguna, the 48 headings of a full turn each (7.5 degrees apart,
// as Super Circuit's racers), seen from racing_behind's camera at its 24 px a meter: 25 drawn, front to back, the other
// 23 their mirrors; the hero's own painted head on each (views(), his hair model and his face); kart_<livery>_left1..3
// and _right1..3 your kart from behind steering; kart.rival() a rival at a rung of kart.LADDER, drawn at its size;
// kart.small() its two last rungs (9 and 6 px) by hand.
include("../profiles/racing_behind.px.js")
include("../characters/hero.px.js", { as: "hero" })
const kart = {}
// in a block: its names stay its own when a scene includes the file
{
// ---------------------------------------------------------------- colors by role, dark to light
pal({
  k: "#1a1620",                                     // the line all round (racing_behind's ink), the pupils
  z: "#a8644f", s: "#de9f76", S: "#f6cfa5",         // the hero's skin, his keys (the head's model paints in them)
  j: "#4e2519", h: "#7f3f25", Y: "#b5653a", L: "#d68b52",   // his hair: the gaps between its strands, its shade, its mass, its light
  E: "#eef5fb",                                     // the eyes' white
  n: "#31508e", N: "#4c7fd0", O: "#7db4ec",         // the blue tunic
  P: "#3e3852", p: "#5f5878", Q: "#7f789a",         // the dark trousers
  t: "#221e29", T: "#38333f", I: "#575164",         // rubber: the tread's grooves, the tyre, its lit top
  m: "#5e5a6e", M: "#9a96a6", i: "#dcd8e6",         // metal: the rims, the pipes, the engine's head
  f: "#2c2834", F: "#48424f", G: "#6c6678",         // trim: the frame, the engine, the wheel, the hubs
  1: "#2e2232", 2: "#4a3446", 3: "#6c4c62",         // the seat
  a: "#5a1424", A: "#9a2a2c", b: "#d8432e", B: "#ff8a5e",   // livery "fuego": primary
  w: "#8a8698", W: "#d6d2de", x: "#fbf9ff",         // and its accent
  c: "#0c3038", C: "#136060", d: "#1f9488", D: "#6fd4b0",   // livery "laguna": primary
  u: "#7a520e", U: "#d89e1c", v: "#ffe07a",         // and its accent
})
const ROLES = { primary: "aAbB", accent: "wWx", seam: "aA", tyre: "tTI", tread: "ttT", rim: "mMi", hub: "fFG", trim: "fFG", head: "FGM", seat: "123",
  plate: "wWx", digit: "ff", skin: "zsS", hair: "jhY", tunic: "nNO", trousers: "PpQ", boots: "jhY", zsS: "zsS", jhY: "jhY" }
const LIVERY = { fuego: ROLES, laguna: { ...ROLES, primary: "cCdD", seam: "cC", accent: "uUv", plate: "uUv" } }

// ---------------------------------------------------------------- the kart
// The tub a rounded slab between the wheels, its nose a wedge out past the front tyres, a seam across it; side pods
// between the tyres; a number plate leaning back on the nose (the accent, its digit a stroke of the trim), the front
// bumper in the trim (in the accent it ran into the plate); the seat on the tub, its back up to the driver's shoulder blades (from behind his tunic shows over it to the
// chest); the engine behind it over the rear axle, its head a lighter grey, two pipes rising out of its back over it,
// dark at their mouths (lower, from behind, they read as eyes); the rear bumper across behind the tyres, in the accent; the steering column up from the nose to a wheel with a hub;
// the axles. The tyres' tread in grooves across them (10 round a tyre), a rim and a hub on their faces.
const N = (v) => { const l = Math.hypot(...v); return v.map((e) => e / l) }
const below = (n, p) => { const u = N(n); return sdf.plane(u, u[0] * p[0] + u[1] * p[1] + u[2] * p[2]) }   // the side of the plane through p away from n
make3d.define("kart", ({ width: W = 1.25, wheelbase: B = 1.0, tyre: D = 0.36, tread: TW = 0.26 } = {}) => {
  const R = D / 2, x = W / 2 - TW / 2, floor = 0.1, seatY = 0.12, seatZ = 0.2
  const groove = (y0) => (p, n) => (Math.abs(n[0]) < 0.6 && Math.floor(((Math.atan2(p[2] - R, p[1] - y0) / Math.PI + 1) * 10)) % 2 ? "tread" : "tyre")
  const wheel = (sx, y) => sdf.cylinder(R, TW).at(0, 0, -TW / 2).rotate(90, "y").at(sx * x, y, R).paint(groove(y))
    .union(sdf.cylinder(R * 0.55, TW + 0.02).at(0, 0, -(TW + 0.02) / 2).rotate(90, "y").at(sx * x, y, R).mat("rim"))
    .union(sdf.cylinder(R * 0.22, TW + 0.05).at(0, 0, -(TW + 0.05) / 2).rotate(90, "y").at(sx * x, y, R).mat("hub"))
  const wheels = sdf.union([wheel(-1, -B / 2), wheel(1, -B / 2), wheel(-1, B / 2), wheel(1, B / 2)])
  const axles = sdf.union([-B / 2, B / 2].map((y) => sdf.cylinder(0.035, 2 * x).at(0, 0, -x).rotate(90, "y").at(0, y, R))).mat("trim")
  const tub = sdf.box([W - 2 * TW - 0.08, B + 0.55, 0.16], { round: 0.06 }).at(0, -0.1, floor + 0.04)
    .intersect(below([0, -0.5, 1], [0, -B / 2, 0.3]))                                  // the nose falls toward the bumper
    .paint((p, n) => (Math.abs(p[1] + B / 2 - 0.12) < 0.025 && n[2] > 0.3 ? "seam" : "primary"))
  const pods = sdf.union([-1, 1].map((s) => sdf.box([0.2, B - D - 0.06, 0.15], { round: 0.05 }).at(s * (x - 0.02), 0, floor + 0.12))).mat("primary")
  const bumper = sdf.box([W - 0.2, 0.1, 0.1], { round: 0.04 }).at(0, -B / 2 - R - 0.08, floor + 0.06).mat("trim")
  const plate = sdf.box([0.3, 0.03, 0.18], { round: 0.01 }).rotate(-35, "x").at(0, -B / 2 - 0.1, floor + 0.2)
    .paint((p) => (Math.abs(p[0]) < 0.03 && Math.abs(p[2] - floor - 0.2) < 0.06 ? "digit" : "plate"))
  const rear = sdf.box([W - 0.16, 0.1, 0.1], { round: 0.04 }).at(0, B / 2 + R + 0.1, floor + 0.08).mat("accent")
  const seat = sdf.box([0.42, 0.3, 0.08], { round: 0.03 }).at(0, seatY, seatZ - 0.04)
    .union(sdf.box([0.42, 0.08, 0.22], { round: 0.03 }).at(0, seatY + 0.17, seatZ + 0.07)).mat("seat")
  const engine = sdf.box([0.4, 0.26, 0.2], { round: 0.03 }).at(0, B / 2 - 0.02, floor + 0.2).mat("trim")
    .union(sdf.box([0.3, 0.2, 0.08], { round: 0.02 }).at(0, B / 2 - 0.02, floor + 0.34).mat("head"))
  const pipe = (s) => sdf.capsule([s * 0.13, B / 2 + 0.06, floor + 0.24], [s * 0.17, B / 2 + 0.2, floor + 0.46], 0.04, 0.04)
    .paint((p) => (p[2] > floor + 0.47 ? "trim" : "rim"))
  const exhaust = sdf.union([pipe(-1), pipe(1)])
  // the wheel where the seated hero's hands are (kart.driver.joints, in his px: his short arms reach 0.23 m ahead of his
  // chest), the column down to the nose
  const wz = 0.43, wy = -0.05
  const steer = sdf.torus(0.1, 0.025).rotate(-60, "x").at(0, wy, wz).mat("trim")
    .union(sdf.sphere(0.035).at(0, wy - 0.01, wz - 0.01).mat("accent"), sdf.capsule([0, wy + 0.03, wz - 0.03], [0, -B / 2 + 0.05, floor + 0.15], 0.025, 0.025).mat("trim"))
  const parts = { body: tub.union(pods, bumper, plate, rear).part("body"), seat: seat.part("seat"), engine: engine.union(exhaust).part("engine"), wheels: wheels.union(axles).part("wheels"), steer: steer.part("steer") }
  const field = parts.body.union(parts.seat, parts.engine, parts.wheels, parts.steer)
  return { field, parts, sockets: { seat: [0, seatY, seatZ], wheel: [0, wy, wz], pedals: [0, -B / 2 + 0.05, floor + 0.06], exhaust: [0.17, B / 2 + 0.2, floor + 0.46] } }
}, { params: { width: [1.0, 1.6], wheelbase: [0.8, 1.3], tyre: [0.28, 0.48], tread: [0.18, 0.34] } })

// ---------------------------------------------------------------- the driver: the hero seated
// His 24 px body (hero.G16: 27 px tall standing, 2.1 heads, the head's radius 6.43) posed by his own rig: the hips on the
// seat, the legs out to the pedals, leaning back 10 degrees, the hands forward and down to the wheel: the tunic, his
// bare forearms and hands, the dark trousers, the boots in his leather (the hair's browns). In his px, drawn at
// racing_behind's 24 px a meter (a px of his a px of the sprite: his native size; the head 15 px across with its line,
// Super Circuit's drivers' 16 on a 32 px kart). The head his own (hero.SKULL and his hair model hero.SHORT): in 3D for a
// rival drawn small, else baked once a view by views() and painted, stamped over the kart (HEAD below).
const PPM = genre("racing_behind").ppm, G = hero.G16, BR = G.body.r
const SEATED = { down: 2.5, lean: -10, feet: [[4, -G.body.hips], [4, G.body.hips]], hands: [[5.5, 2, -3], [5.5, -2, -3]], elbow: [-0.4, 1, -0.6], air: true }
const J = hero.rig.joints(SEATED, 180)
const HEAD3D = sdf.union(hero.SKULL, hero.SHORT).scale(G.body.h / G.body.heads / 2 / 5)
const driver = (head) => {
  const L = J.legs, A = J.arms, v = (p, d) => p.map((e, i) => e + d[i])
  return sdf.union([
    ...(head ? [HEAD3D.rotate(180).at(...J.head)] : []),   // (turned as his body is, joints(SEATED, 180): his face to the kart's front)
    sdf.capsule(J.pelvis, J.chest, BR.body[0], BR.body[1]).mat("tunic"),
    ...A.map((a) => sdf.capsule(a.sh, a.elbow, BR.arm[0], BR.arm[1]).mat("tunic")),
    ...A.map((a) => sdf.capsule(a.elbow, a.hand, BR.arm[1], BR.arm[2]).union(sdf.sphere(BR.hand).at(...a.hand)).mat("skin")),
    ...L.map((l) => sdf.capsule(l.hip, l.knee, BR.leg[0], BR.leg[1]).union(sdf.capsule(l.knee, l.ankle, BR.leg[1], BR.leg[2])).mat("trousers")),
    ...L.map((l) => sdf.ellipsoid(BR.foot).at(...v(l.foot, [0, 0, 0.3])).mat("boots")),
  ])
}
// the hero (his px, his feet's floor at 0 under his hips) into the kart's meters: his hips' point on the seat socket;
// `head` false leaves his head off for the painted one
const K0 = make3d.kart(), [sx0, sy0, sz0] = K0.sockets.seat, hip = J.pelvis
const seated = (p) => [sx0 + (p[0] - hip[0]) / PPM, sy0 + (p[1] - hip[1]) / PPM, sz0 + (p[2] - hip[2] + BR.leg[0]) / PPM]
const racer = (params = {}, { head = true } = {}) => {
  const K = make3d.kart(params), [sx, sy, sz] = K.sockets.seat
  return K.field.union(driver(head).scale(1 / PPM).at(sx - hip[0] / PPM, sy - hip[1] / PPM, sz - (hip[2] - BR.leg[0]) / PPM))
}

// ---------------------------------------------------------------- racing_behind: 48 headings a livery, painted
// From the genre's camera (its pitch: the angle down to where your kart meets the road) at its 24 px a meter, a line all
// round in the genre's ink (near-black: the racer is a character), 3 tones a material and 4 on the livery's body. Lit
// from above and a little from the camera, so the tops are the lightest and what faces away the darkest: a sprite the
// game flips is lit from the picture's middle, so the west half is drawn and the east is its mirror (Super Circuit's 25
// drawings front to back and 23 mirrors).
const GB = genre("racing_behind"), LIGHT = [0, -0.45, 0.9]
const VIEW = { view: { kind: "side", pitch: GB.pitch }, ppm: PPM, n: GB.dirs.n, light: LIGHT, surface: { soft: 0.5, rim: 0.5, ink: GB.ink.character, shadows: false, ao: 0.3, tones: 4 }, genre: "racing_behind", category: "character" }
// The head: hero.SKULL and hero.SHORT baked from the genre's 17 degrees in 16 views (the east the west's mirror), each
// 27 px square on the head's middle (13, 13), then painted by hand as hero.px.js paints his (characters §5, §6):
// - the face where a view shows it (s to w): facing us the eyes 2 x 2 (the white outside, the pupil in), 3 px of
//   skin between them, the nose the skin's lightest; turned, the far eye closing in, the near one wide; in profile the
//   eye 2 px (the pupil in front), the nose a pixel past the cheek, the ear behind;
// - the fringe's dark edge over the eyes; the strands: 2-3 dark gaps (j) from the crown; from behind the render's
//   alone (the hair's ramp four tones, its light L on the crown: gaps there read as a face).
const R27 = (G2) => hero.rows(27, G2)
const PAINT = {
  s: R27({
    9: "...........j...j...........",
    10: "..........j..j..j..........",
    11: "..........j..j..j..........",
    12: "......khhjhhhjhhhjhhk......",
    13: "......khhhjjhYhjjhhhk......",
    14: ".......kssEksSskEssk.......",
    15: ".......kssEkssskEssk.......",
    16: ".......ksssssSsssssk.......",
  }),
  ssw: R27({
    12: "......khhjhhhjhhhjhhk......",
    13: ".......khjjhYhjjhhhhk......",
    14: ".......ksEksSkEsshhhk......",
    15: ".......ksEksskEsssshk......",
    16: ".......ksssSsssssssk.......",
  }),
  sw: R27({
    12: "......khhjhhjhhhhjhhhk.....",
    13: ".......khjjhjjhhhhhhk......",
    14: ".......kskSskEshhhhhk......",
    15: ".......ksksskEsshhhhk......",
    16: ".......kSsssssssshhk.......",
  }),
  wsw: R27({
    13: ".......khjjhhhhhhhhhhk.....",
    14: ".......kskEshhhhhhhhhk.....",
    15: ".......kskEsshhszhhhhk.....",
    16: ".......kSsssssszhhhk.......",
  }),
  w: R27({
    13: "......khjjjhhhhYYhhhhk.....",
    14: "......kskEshhhhhhhhhhk.....",
    15: ".......Sssshhszhhhhhhk.....",
    16: ".......ksssssszhhhhhhk.....",
  }),
}
views("_hd_kart", HEAD3D, { n: 16, pitch: GB.pitch, light: LIGHT, mats: { jhY: "jhYL" }, ink: "k", jaw: ["z", "zsS"], surface: { soft: 0.55, tones: 4 }, anchor: [13, 13], retouch: PAINT })
const HEAD = own("_hd_kart"), HEADAT = seated(J.head)
const COMPASS16 = ["n", "nne", "ne", "ene", "e", "ese", "se", "sse", "s", "ssw", "sw", "wsw", "w", "wnw", "nw", "nnw"]
const degOf = (name) => (COMPASS16.includes(name) ? COMPASS16.indexOf(name) * 22.5 : Number(name))
// the head stamped on its middle; its jaw's line (the skin's darkest under the chin) near-black where it is the
// racer's edge, as the line all round is
const headOn = (c, [x, y], heading) => {
  const X = Math.round(x), Y = Math.round(y)
  c.stamp(HEAD, X, Y, { heading })
  for (let j = Y; j <= Y + 8; j++) for (let i = X - 8; i <= X + 8; i++) if (c.is(i, j, "z") && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => !c.get(i + a, j + b))) c.px(i, j, "k")
}
// Drawn 3 times over (72 px a meter) and brought to the grid by shrink: { by: 3 } (its edges treated: steps in order,
// no notches; pxl check --edges), the head stamped after at 1x; the west half and both ends drawn, the east the west's
// mirror; _kart_<livery>_bare_<heading> the drawing without its head (the steering's back view).
// The hand pass, [x, y, keys] (a run of keys from x, "." keeping a pixel) by heading: from behind (your kart, all race
// long) the head's line under his hair turned into the tunic's shade, so the hair sits on his shoulders, not on a
// black collar
const HAND = { n: [[32, 22, "nnnnnn"]] }
const handOn = (c, h) => { for (const [x, y, ks] of HAND[h] ?? []) [...ks].forEach((k, i) => { if (k !== ".") c.px(x + i, y, k) }) }
const TURN = {}, KPIV = {}, { genre: _g, category: _k, ...DRAFT } = VIEW, ON = { genre: "racing_behind", category: "character" }
for (const liv of ["fuego", "laguna"]) {
  const T = turnaround(`_kart_${liv}_x3`, racer({}, { head: false }), { ...DRAFT, ppm: 3 * PPM, pad: 27, mats: LIVERY[liv] })
  const o = T.pivot.map((v) => ((Math.round(v) % 3) + 3) % 3), P = T.pivot.map((v, i) => Math.floor((v - o[i]) / 3))
  T.headings.forEach((h, i) => {
    if (T.mirrored.includes(T.names[i])) return
    const deg = (i * 360) / T.headings.length
    sprite(`_kart_${liv}_bare_${h}`, { base: T.names[i], shrink: { by: 3, ink: "k" } })
    sprite(`kart_${liv}_${h}`, { base: `_kart_${liv}_bare_${h}`, ...ON }, (c) => { headOn(c, [P[0] + headXY(deg)[0], P[1] + headXY(deg)[1]], deg); handOn(c, h); footOn(c, P, deg) })
  })
  T.headings.forEach((h, i) => {
    if (!T.mirrored.includes(T.names[i])) return
    const twin = T.headings[(T.headings.length - i) % T.headings.length]
    sprite(`kart_${liv}_${h}`, { base: `kart_${liv}_${twin}`, flip: "x", ...ON })
  })
  group(`kart_${liv}`, T.headings.map((h) => `kart_${liv}_${h}`))
  TURN[liv] = T.headings.map((h) => own(`kart_${liv}_${h}`))
  KPIV[liv] = P
}
card("make3d.kart", { is: "an open pipe-frame kart in meters, four fat tyres with tread and hubs, a low tub with a stripe and side pods, a number plate and bumpers, a seat, the engine and its pipes behind; 1.25 m over the tyres, 1.0 m between the axles; with the hero seated in it (kart.racer) racing_behind's racer, painted",
  cells: { "behind/24ppm": ["◐", "kart_fuego"] }, vary: { color: "liveries by roles: fuego (red-orange, white; kart_fuego), laguna (teal, yellow; kart_laguna)", shape: "width, wheelbase, tyre, tread" } })
// a livery's drawing for a heading against the camera (degrees, 0 its back to us: driving away; clockwise), the
// nearest of its 48
const facing = (liv, deg) => { const n = TURN[liv].length; return TURN[liv][((Math.round((deg * n) / 360) % n) + n) % n] }
// kart.VIEW: the drawings' turnaround() options, for a racer at another size (a rival far off: its ppm the floor's there)
// Where a point of the racer (m) lands from the pivot, at a heading (compass degrees) and a ppm: the turn as
// turnaround()'s (the front, -y, turned to the heading; the side view `pitch` down): the head's middle, and the
// footprint's box (the tyres' ground, 1.25 x 1.36 m: racing_behind's contract), which shrink doesn't carry over from
// the drawing 3 times over
const toXY = ([x, y, z], deg, ppm = PPM) => {
  const a = ((180 - deg) * Math.PI) / 180, ph = (GB.pitch * Math.PI) / 180
  return [ppm * (x * Math.cos(a) - y * Math.sin(a)), -ppm * (z * Math.cos(ph) + (x * Math.sin(a) + y * Math.cos(a)) * Math.sin(ph))]
}
const headXY = (deg, ppm = PPM) => toXY(HEADAT, deg, ppm)
const footOn = (c, [px, py], deg) => {
  const [fw, fl] = GB.contract.footprint, pts = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => toXY([(a * fw) / 2, (b * fl) / 2, 0], deg))
  const [l, t, r, b] = [Math.min(...pts.map((q) => q[0])), Math.min(...pts.map((q) => q[1])), Math.max(...pts.map((q) => q[0])), Math.max(...pts.map((q) => q[1]))].map((v, i) => Math.round(v + (i % 2 ? py : px)))
  c.setBox("footprint", l, t, r - l, b - t)
}
// Steering, your kart from behind (Super Circuit's 3 back views a way): the kart straight, its back drawing without the
// head, the head turned a view of 16 more a step (22.5 degrees: to the left nnw, nw, wnw) and leaning a pixel more into
// the turn a step, a pixel lower from the second; kart_<livery>_left1..3, and _right1..3 their mirrors.
for (const liv of ["fuego", "laguna"]) {
  const P = KPIV[liv], [hx, hy] = headXY(0)
  for (let k = 1; k <= 3; k++) {
    sprite(`kart_${liv}_left${k}`, { base: `_kart_${liv}_bare_n`, ...ON }, (c) => { headOn(c, [P[0] + hx - k, P[1] + hy + (k > 1 ? 1 : 0)], -22.5 * k); footOn(c, P, 0) })
    sprite(`kart_${liv}_right${k}`, { base: `kart_${liv}_left${k}`, flip: "x", ...ON })
  }
}
// The rivals' ladder (library F5's stage 7b): a rival drawn at the size the floor gives it where it stands, never
// scaled (scenes §19), from a ladder of rungs: [px across with the line, headings kept]. The floor's scale at z m from
// the eye is focal / z px a meter (your kart's 24 at 11.1 m), so a rung covers the distances its size is the nearest
// for: 32 (to 13 m: the painted 48, the face), 24 (to 18 m), 18 (to 25 m), 13 (to 30 m), 9 (to 45 m), 6 (beyond: the floor's
// end at 114 m draws a kart 3 px). Under 32 the head is hero.SKULL and his hair model in 3D, no face; under 16 no line.
const LADDER = [[32, 48], [24, 48], [18, 24], [13, 16], [9, 8], [6, 8]]
// kart.rival(name, livery, across): a rung's drawings (name_<heading>, a group `name`), `across` one of LADDER's; its
// .facing(deg) the drawing for a heading. The two last rungs are drawn by hand (kart.small(), below; `name` unused)
const rival = (name, liv, across) => {
  const [, n] = LADDER.find(([a]) => a === across) ?? []
  if (!n) throw new Error(`kart.rival: across is a rung of kart.LADDER (${LADDER.map(([a]) => a).join(", ")}), got ${across}`)
  if (across <= 9) return small(liv, across)
  const { ink, ...plain } = VIEW.surface   // (under 16 px no line: scenes §19's density rule)
  const T = turnaround(name, racer(), { ...VIEW, ppm: (across - (across < 16 ? 0 : 2)) / 1.25, n, mats: { ...LIVERY[liv], zsS: "zsS", jhY: "jhYL" }, ...(across < 16 ? { surface: plain } : {}) })
  // its drawing for a heading (degrees), the nearest of its n by index (a stamp by `heading` picks among the compass's
  // 16 names only)
  const names = T.names.map((m) => own(m))
  return { ...T, facing: (deg) => names[((Math.round((deg * n) / 360) % n) + n) % n] }
}
// The smallest rungs by hand (library F5's stage 7c): at 9 and 6 px across the 3D render is mush (no line, every
// part a pixel or two, the hair, the tunic and the body run together), so each is drawn: the hair a cap over the
// shoulders, the tunic's blue under it, the body's red, the tyres dark at its corners, the rear bumper's accent
// from behind and the plate and the face from in front. 8 headings each (one a 45 degrees: n its back to us, e
// driving right; enough at this size), the west half and both ends drawn, the east its mirror; in fuego's keys,
// laguna by its roles (a swap). The pivot on the ground between its tyres, a row over their lowest.
// kart_<livery>_9px_<h>, kart_<livery>_6px_<h> (h n, ne, e, se, s, sw, w, nw); kart.small(livery, across).facing(deg).
const SMALL = {
  9: {
    n: `
      ...hhh...
      ..hYLYh..
      ..hYYYh..
      ..jhhhj..
      .TnNONnT.
      tTbmMmbTt
      tIAfFfAIt
      tTWWxWWTt
      .t.....t.`,
    nw: `
      ...hhh.....
      ..hYLYh....
      ..hYYYh....
      ..jhhhj....
      .tTnNNnbT..
      .TbbbmMmbTt
      ..AAbfFfbIt
      ...tTWWxWWt
      ....t....t.`,
    w: `
      ......hhh....
      .....hYLYh...
      .....sYYYh...
      .....sshhj...
      ...ssNNNn....
      .WBbbbnbb2mm.
      tTTtAAAAtTTt.
      tIIt....tIIt.
      .tt......tt..`,
    sw: `
      .....hhh...
      ....hYLYh..
      ....sSYYh..
      ....sshhj..
      ..ssNNNnTt.
      tTBbbbnbb2t
      tIwbAAAAtTt
      .tFFF..tIIt
      ..t.....tt.`,
    s: `
      ...hhh...
      ..hYLYh..
      ..hsSsh..
      ..jsssj..
      .tnsGsnt.
      tTbnNnbTt
      tIBbwbBIt
      tTAFFFATt
      .t.....t.`,
  },
  6: {
    n: `
      ..hh..
      .hYYh.
      .jhhj.
      tnNNnt
      tbmmbt
      tWWWWt`,
    nw: `
      ..hh...
      .hYYh..
      .jhhj..
      tbnNnTt
      .AbmmbI
      ..tWWWt`,
    w: `
      ...hh...
      ..sYYh..
      ..sNNj..
      tTbbbbmt
      tt...tt.`,
    sw: `
      ...hh..
      ..sYYh.
      .sNNNjt
      tBbbbbt
      tFAAAtt`,
    s: `
      ..hh..
      .hYYh.
      .jssj.
      tnssnt
      tbwwbt
      tAFFAt`,
  },
}
const H8 = ["n", "ne", "e", "se", "s", "sw", "w", "nw"], MIRROR = { ne: "nw", e: "w", se: "sw" }, LAGUNA = { a: "c", A: "C", b: "d", B: "D", w: "u", W: "U", x: "v" }
for (const [px, D] of Object.entries(SMALL)) {
  for (const [h, g] of Object.entries(D)) {
    const rows = g.trim().split("\n")
    sprite(`kart_fuego_${px}px_${h}`, { pivot: [Math.floor(rows[0].trim().length / 2), rows.length - 2] }, g)
  }
  for (const [h, m] of Object.entries(MIRROR)) sprite(`kart_fuego_${px}px_${h}`, { base: `kart_fuego_${px}px_${m}`, flip: "x" })
  for (const h of H8) sprite(`kart_laguna_${px}px_${h}`, { base: `kart_fuego_${px}px_${h}`, swap: LAGUNA })
  for (const liv of ["fuego", "laguna"]) group(`kart_${liv}_${px}px`, H8.map((h) => `kart_${liv}_${px}px_${h}`))
}
card("kart_fuego_9px_n", { is: "racing_behind's smallest rivals by hand, 9 and 6 px across (kart_<livery>_9px_<h>, _6px_<h>): the kart and its driver in a few pixels, 8 headings each (the east the west's mirror), for kart.LADDER's two last rungs, where the render is mush", cells: { "behind/24ppm": "✎" },
  vary: { color: "liveries by roles: fuego, laguna (a swap)" } })
// kart.small(livery, across): a hand-drawn rung (9 or 6), its .facing(deg) the nearest of its 8
const SMALLS = Object.fromEntries(Object.keys(LIVERY).map((liv) => [liv, Object.fromEntries(Object.keys(SMALL).map((px) => [px, H8.map((h) => own(`kart_${liv}_${px}px_${h}`))]))]))
const small = (liv, across) => {
  const names = SMALLS[liv]?.[across]
  if (!names) throw new Error(`kart.small: a livery (${Object.keys(LIVERY).join(", ")}) and 9 or 6 px across, got ${liv}, ${across}`)
  return { names, facing: (deg) => names[((Math.round(deg / 45) % 8) + 8) % 8] }
}
Object.assign(kart, { ROLES, LIVERY, VIEW, LADDER, racer, facing, rival, small, head: { name: HEAD, at: HEADAT, xy: headXY }, driver: { pose: SEATED, joints: J } })
}
