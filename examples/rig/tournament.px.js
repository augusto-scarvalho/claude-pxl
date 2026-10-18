// A tournament: two knights meet on foot in the lists, the blue one (the rig, facing right) and the
// red one (the same rig turned, its colors swapped), each with the shield on its left arm and the
// sword in its right hand. Behind them the lists' palisade, the grandstand under a striped canopy
// with the crowd on its tiers, the pavilions with their pennants, a castle on the hill, clouds
// drifting over. Everything runs on one 12 s loop (96 frames at 8 fps): the trumpeters sound a
// fanfare, the marshal drops his baton, and the knights fight their bout (knight.px.js, stage 5), a
// draw; they walk back to their marks and it starts again. Daylight
// from the top right, as the knights are lit. The ground is seen in perspective: the horizon at
// y 104 and the eye 1.6 m up make 40 px to the meter where the knights stand (y 168), so their
// 1.8 m is 72 px, and everything with a height is checked against it by pxl describe.
include("knight.px.js", { palette: true })
pal({
  A: "#3a6ea8", B: "#5b92c8", C: "#8cbbe2", D: "#c6e2f2",                 // sky, top down
  E: "#f4f8fb", F: "#d6e2ee", K: "#a8bcd2",                               // clouds: lit, body, underside
  P: "#56688a", Q: "#8a9cc0",                                              // slate roofs, hazy
  M: "#3f6460", u: "#5b8270", p: "#7ea48c", X: "#b2b49c",                 // the castle's hill: woods, slopes, fields, road
  G: "#7d9cb4", H: "#5e8098", I: "#4a6a64",                               // far hills, haze
  i: "#2c5a32", g: "#3e7a3a", h: "#5e9a48", l: "#8cbc5a",                 // grass
  S: "#5e6470", s: "#8a909c", U: "#c4c8d0",                               // castle stone
  f: "#8a6a3e", b: "#a8844e", a: "#c8a46a", d: "#e2c88e",                 // sand
  W: "#c08a50",                                                            // wood, sunlit
  n: "#1e4a2a", N: "#2e7a3e", m: "#56aa5a",                               // green cloth
  y: "#b88a1e", Z: "#f2d24a",                                              // yellow cloth
  c: "#e8e2d4", v: "#b8b0a0",                                              // white cloth
  j: "#e2aa7c", J: "#b47a52", z: "#3a2418",                               // skin, hair
})
ramps("ABCD", "KFE", "PQ", "Mup", "IHG", "ighl", "SsU", "fbad", "tTLW", "nNm", "yZ", "vc", "Jj")

const W = 320, H = 180, HZ = 104, EYE = 1.6, LIGHT = [0.6, -1]
const ppm = (y) => (y - HZ) / EYE                       // px per meter on the ground at row y
const FEET = 168                                        // where the knights stand

// ---------------------------------------------------------------- sky and the far land
// Clouds, the sunset's way: each drifts with the wind from the left in one piece, a whole pixel at
// even intervals (the high ones, nearer, 1 px every 4 frames; the low ones, toward the horizon and
// farther, every 6), and lives one loop: it forms out of a pale haze, drifts, and thins away again
// where it started, out of step with the others, so the loop has no seam and needs no strip
// scrolling a whole width. A wisp is a long thin streak of haze; as it gains body the light takes it
// from the top down (a cap of white thickening row by row, then its gray underside). The sunset's
// thin streaks took their light column by column; on a heaped cloud that shows as stripes.
const LOOP = BOUT_LOOP                                  // the bout's 12 s at 8 fps (knight.px.js): one clock for the scene
const CLOUDS = [[44, 16, 28, 4], [196, 12, 32, 5], [124, 34, 22, 3], [262, 26, 18, 3], [78, 46, 16, 2]]   // x, y (base), half-length, height
anim("clouds", { w: W, h: HZ, frames: LOOP, fps: 8 }, (c) => {
  const r = c.rng(5)
  CLOUDS.forEach(([x0, y, len, hgt], k) => {
    const drift = LOOP / (y < 25 ? 4 : 6)
    const age = (c.phase - ((k * 3) % 5) / 5 + 1) % 1
    const env = Math.min(1, 1.5 * Math.sin(age * Math.PI))
    const x = x0 - drift / 2 + Math.floor(drift * age)
    // a heap of puffs on a flat base, the middle ones the tallest. Thin, it is a long wisp: the puffs
    // lose their height faster than their length, and the base joins them from the start
    const n = 4 + Math.floor(r() * 3)
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n, cx = Math.round(x - len + 2 * len * t + (r() - 0.5) * 6)
      const rx = Math.round(len * (0.28 + r() * 0.16) * (0.4 + 0.6 * env)), ry = Math.round(hgt * (0.6 + Math.sin(t * Math.PI) * 0.8) * env)
      if (ry >= 1 && rx > 1) c.ellipse(cx, y - ry + 1, rx, ry, "D")
    }
    if (env > 0.08) c.hline(Math.round(x - len * (0.5 + 0.4 * env)), y, Math.round(2 * len * (0.5 + 0.4 * env)), "D")
    // as it gains body it takes the light from the top down: first its own body tone, then a white
    // cap thickening row by row to half its height, then the gray of its underside
    if (env < 0.3) return
    const cap = Math.min(1, (env - 0.3) / 0.5)
    for (let px = x - len - 6; px <= x + len + 6; px++) {
      let top = -1, bot = -1
      for (let py = y - 3 * hgt - 2; py <= y + 1; py++) if (c.is(px, py, "D")) { if (top < 0) top = py; bot = py }
      if (top < 0) continue
      const white = Math.round(((bot - top + 1) / 2) * cap)
      for (let py = top; py <= bot; py++) c.px(px, py, py === bot && env > 0.55 ? "K" : py < top + white ? "E" : "F")
    }
  })
})
const sky = [grad(0, 0, W, HZ, "ABCD"), stamp("clouds", 0, 0)]
const hills = [
  poly([0, 98, 40, 92, 90, 95, 150, 90, 200, 93, 230, 86, 256, 82, 296, 82, 314, 87, 320, 90, 320, HZ, 0, HZ], "G"),
  poly([0, 101, 60, 98, 130, 100, 200, 97, 260, 99, 320, 96, 320, HZ, 0, HZ], "H"),
]
// A castle on the far hill, its towers and roofs over the pavilions: a curtain wall with its merlons
// between two drum towers under slate cones, the keep behind with a turret on its corner, the
// gatehouse in front with its portcullis down, arrow slits, the knights' colors flying from the
// towers and gold from the keep. Each mass is drawn flat and lit on its own from the top right, the
// round towers with a band of light where they turn toward the sun. Hazy with the distance: no
// black, its darkest a blue gray.
const merlons = (x0, x1, y) => [...Array(Math.floor((x1 - x0) / 4) + 1).keys()].map((i) => rect(x0 + i * 4, y, 2, 3, "s"))
const mass = (...items) => plate({ light: LIGHT, reach: 2 }, ...items)
sprite("castle", { w: 66, h: 50, pivot: "bottom" },
  // the keep, behind, and the stair turret on its corner: a slim round tower coming up from behind
  // the wall and over the battlements, under a cone as steep as the drum towers'
  mass(rect(22, 12, 20, 30, "s"), ...merlons(22, 34, 9)),
  mass(rect(37, 8, 6, 20, "s"), poly([35, 8, 39, 0, 40, 0, 44, 8], "P")), vline(41, 9, 19, "U"), rect(39, 12, 1, 2, "S"),
  // the curtain wall, its merlons, the wall-walk's shadow under them
  mass(rect(8, 31, 50, 19, "s"), ...merlons(8, 56, 28)),
  hline(8, 31, 50, "S"),
  // the drum towers under their cones, the light turning round them
  mass(rect(0, 20, 13, 30, "s"), poly([0, 20, 6, 6, 7, 6, 13, 20], "P")), vline(9, 21, 29, "U"),
  mass(rect(53, 18, 13, 32, "s"), poly([53, 18, 59, 4, 60, 4, 66, 18], "P")), vline(62, 19, 31, "U"),
  // the gatehouse, its arch and the portcullis
  mass(rect(25, 25, 16, 25, "s"), ...merlons(25, 39, 22)),
  rect(29, 39, 8, 11, "S"), ellipse(33, 39, 4, 3, "S"),
  ...[30, 32, 34, 36].map((x) => vline(x, 37, 13, "H")), hline(29, 43, 8, "H"), hline(29, 47, 8, "H"),
  // arrow slits and windows
  ...[[5, 28], [5, 38], [58, 26], [58, 36], [27, 18], [35, 18], [16, 36], [48, 36]].map(([x, y]) => rect(x, y, 1, 3, "S")),
  rect(30, 28, 2, 3, "S"), rect(34, 28, 2, 3, "S"),
  // the flags: blue on the left tower, red on the right, gold on the keep
  vline(6, 1, 6, "S"), poly([7, 1, 11, 2, 7, 4], "w"),
  vline(59, 0, 5, "S"), poly([60, 0, 64, 1, 60, 3], "r"),
  vline(28, 3, 7, "S"), poly([29, 3, 33, 4, 29, 6], "Z"))
// The hill the castle stands on: its slopes lit from the right, the rock it is built on cropping out
// under the walls, the road winding down from the gate, woods in clumps on the slopes, a few fields
// edged with hedges. Greens already cooled by the distance; the haze over it does the rest.
// The castle doesn't perch on a peak: it stands on a plateau wider than its walls, the rock it is
// built on showing as a scarp all round under them, and the slopes fall away from there.
const HW = 160, HH = 32
const HILL = [0, 32, 12, 28, 24, 22, 34, 15, 40, 9, 43, 5, 117, 5, 120, 9, 126, 15, 136, 22, 148, 28, 160, 30, 160, 32]
const SCARP = [[40, 7, 50, 6, 52, 12, 47, 15, 39, 10], [50, 6, 62, 6, 62, 9, 58, 11, 52, 12], [62, 6, 76, 6, 77, 11, 71, 15, 64, 12, 62, 9],
  [83, 6, 90, 6, 92, 12, 86, 15, 83, 10], [90, 6, 102, 6, 103, 9, 97, 11, 92, 12], [102, 6, 112, 6, 114, 12, 108, 15, 103, 9],
  [112, 6, 118, 6, 121, 10, 118, 12, 114, 12]]
sprite("castle_hill", { w: HW, h: HH, pivot: "bottom" }, (c) => {
  const r = c.rng(11)
  c.poly(HILL, "u"); c.relight(undefined, { light: LIGHT, reach: 3 })
  // fields and their hedges, on the gentler slopes low down
  for (const f of [[96, 18, 112, 21, 108, 25, 92, 22], [118, 23, 132, 25, 128, 29, 114, 27], [22, 27, 34, 22, 40, 26, 28, 30], [44, 18, 54, 16, 56, 20, 46, 21]]) {
    c.clip(HILL, () => { c.poly(f, "p"); for (let i = 0; i < f.length; i += 2) { const j = (i + 2) % f.length; c.line(f[i], f[i + 1], f[j], f[j + 1], "M") } })
  }
  // woods: clumps of crowns, dark with a lit top, thicker low on the slopes, none on the plateau
  for (let i = 0; i < 90; i++) {
    const x = Math.round(r() * (HW - 2)), y = Math.round(13 + r() * (HH - 14))
    if (!c.is(x, y, "u") && !c.is(x, y, "p") && !c.is(x, y, "M")) continue
    c.ellipse(x, y, 2, 1, "M"); c.px(x, y - 1, "u"); c.px(x + 1, y - 1, "p")
  }
},
// the scarp: the rock under the walls, a row of crags each lit on its own (the plate way), so they
// read as faces of rock and not one slab; the grass rim of the plateau stays above them
...SCARP.map((f) => plate({ light: LIGHT, reach: 2 }, poly(f, "s"))),
// the road from the gate, through a cut in the scarp and winding down to the left
(c) => c.curve([80, 6, 80, 13, 72, 16, 78, 19, 64, 22, 70, 25, 50, 28, 36, 32], "X"))
const CASTLE_X = 257                                    // in the gap between the two pavilions
const far = [...hills, stamp("castle_hill", CASTLE_X, 104), stamp("castle", CASTLE_X, 78)]
// The air between us and all that: a veil of the sky's pale blue laid over the far things only
// (their silhouettes, so the sky and its clouds stay as they are), which lowers their contrast and
// cools their colors (at 0.45: at 0.32 the castle's dark windows and its flags still read as near);
// over it a band of haze down to the horizon, so the hill's foot fades more than its top (the sky
// there is the haze's own color already, so only the land shows it); and a mist lying in the valley
// at the hill's foot, half hiding the woods and the road's last bend. Real translucency: new colors,
// not palette keys (opacity layers leave the palette).
const veil = [...hills.map((h) => ({ ...h, args: [h.args[0], "D"] })),
  stamp("castle_hill", CASTLE_X, 104, { silhouette: "D" }), stamp("castle", CASTLE_X, 78, { silhouette: "D" })]
const valleyMist = [...Array(7).keys()].map((i) => ellipse(20 + i * 48 + (i % 2) * 10, 101 - (i % 3), 34, 3, "D"))

// ---------------------------------------------------------------- the field
const field = [
  grad(0, HZ, W, 28, "hg"),
  grad(0, 132, W, H - 132, "ad"),
]

// ---------------------------------------------------------------- the grandstand
// Tiers of benches under a canopy striped blue and white, the lord's box in the middle under a
// banner, posts of sunlit wood. At y 122 a meter is 11 px: the stand is 3.6 m to the canopy.
const STAND_W = 150, STAND_H = 46
sprite("grandstand", { w: STAND_W, h: STAND_H, pivot: "bottom", outline: "k", height: 4.1 },
  // the tiers: three benches stepping back and up, their fronts in shade (the light is behind and above)
  ...[0, 1, 2].map((i) => rect(4, 30 - i * 7, STAND_W - 8, 7, "T")),
  ...[0, 1, 2].map((i) => hline(4, 30 - i * 7, STAND_W - 8, "W")),
  rect(4, 37, STAND_W - 8, 9, "t"),                                                    // under the tiers
  // posts and the canopy
  ...[4, 40, 75, 110, STAND_W - 6].map((x) => rect(x, 6, 2, 40, "L")),
  ...[...Array(15).keys()].map((i) => rect(2 + i * 10, 0, 10, 6, i % 2 ? "c" : "e")),
  hline(2, 6, STAND_W - 4, "q"),
  ...[...Array(15).keys()].map((i) => poly([2 + i * 10, 6, 12 + i * 10, 6, 7 + i * 10, 9], i % 2 ? "v" : "w")),   // scalloped edge
  // the lord's box: a red cloth over its rail
  rect(64, 24, 22, 6, "r"), hline(64, 24, 22, "R"))// the crowd: small figures on the benches, a head and shoulders above the bench in front; they
// cheer in turn (an arm up)
const CROWD = ["w", "r", "N", "y", "c", "T", "e", "R", "m", "Z"]
anim("fan", { w: 5, h: 8, frames: 4, fps: 4, pivot: "bottom" }, (c) => {
  c.rect(1, 3, 3, 5, "w"); c.rect(1, 0, 3, 3, "j"); c.hline(1, 0, 3, "z"); c.px(1, 1, "z")
  if (c.frame === 1) { c.vline(4, 0, 4, "w"); c.px(4, 0, "j") }
  if (c.frame === 3) { c.vline(0, 0, 4, "w"); c.px(0, 0, "j") }
})
const crowd = []
for (let t = 0; t < 3; t++) for (let x = 8; x < STAND_W - 8; x += 6) {
  if (t === 0 && x > 60 && x < 90) continue                                             // the lord's box
  const k = (x * 7 + t * 3) % CROWD.length
  const hair = ["z", "T", "L", "y", "c", "w", "r"][(x * 3 + t) % 7]                     // hair, a hood or a hat
  crowd.push(stamp("fan", x, 31 - t * 7, { swap: { w: CROWD[k], j: k % 3 ? "j" : "J", z: hair }, rdelay: true, seed: x + t * 100 }))
}
// heraldic banners hanging from the canopy's edge in front of the crowd: the blue knight's and the
// red knight's, each with a gold cross
const BANNERS = [[20, "w", "e"], [56, "r", "R"], [92, "w", "e"], [128, "r", "R"]].flatMap(([x, c, l]) => [
  poly([x, 9, x + 8, 9, x + 8, 20, x + 4, 23, x, 20], c), vline(x + 7, 9, 12, l), hline(x, 9, 9, "k"),
  rect(x + 3, 11, 2, 8, "Z"), rect(x + 1, 13, 6, 2, "Z")])
sprite("stand_full", { w: STAND_W, h: STAND_H, pivot: "bottom", height: 4.1 }, stamp("grandstand", STAND_W / 2, STAND_H), ...crowd, ...BANNERS)
// a herald's trumpeter in a red and gold tabard, 1.7 m, so 18 px where the stand stands. The
// fanfare opens the loop, both together: the trumpet comes up to the lips, the call in threes (the
// bell lifting on each note, the banner hanging from it swinging) and a long last note, then down to
// the waist for the bout, the banner still.
const CALL = [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 1, 1, 1, 1]                          // the bell up on the notes
anim("trumpeter", { w: 12, h: 18, frames: BOUT_LOOP, fps: 8, pivot: [4, 18], outline: "k", facing: "right", height: 1.7, sockets: { front: [6, 3] } }, (c) => {
  c.rect(2, 2, 4, 4, "j"); c.rect(2, 1, 4, 2, "Z"); c.px(5, 3, "z")                    // face, cap
  c.rect(1, 6, 6, 7, "r"); c.rect(1, 6, 3, 7, "y"); c.hline(1, 12, 6, "Z")             // tabard, quartered
  c.rect(2, 13, 2, 5, "q"); c.rect(5, 13, 2, 5, "q")                                   // legs
  const f = c.frame
  if (f >= 2 && f < BOUT_SIGNAL - 2) {                                                 // playing, done by the signal
    const s = CALL[f - 2], d = 1 - s                                                    // the bell a pixel lower between notes
    c.line(6, 4, 11, 1 + d, "Z"); c.px(11, d, "Z"); c.px(11, 2 + d, "Z")
    c.poly([8, 4 + d, 10, 3 + d, 10 + s, 7 + d, 9 + s, 8 + d], "r"); c.px(9, 5 + d, "Z")
  } else if (f < BOUT_SIGNAL) {                                                        // on the way up or down
    c.line(6, 6, 11, 5, "Z"); c.px(11, 4, "Z"); c.px(11, 6, "Z")
    c.poly([8, 7, 10, 6, 10, 10, 9, 11], "r"); c.px(9, 8, "Z")
  } else {                                                                             // at rest, at the waist
    c.line(6, 9, 11, 9, "Z"); c.px(11, 8, "Z"); c.px(11, 10, "Z")
    c.poly([8, 10, 10, 10, 10, 14, 9, 15], "r"); c.px(9, 12, "Z")
  }
})

// ---------------------------------------------------------------- pavilions
// Round pavilions in a knight's colors, a cylinder under a cone seen from the side: the stripes run
// round it, so they narrow toward its sides, and each is shaded by how far it has turned toward the
// light from the right; the roof's stripes run up to the pole; a scalloped valance hangs from the eave
// with a gold trim at its top; the door's flaps are tied back on their white lining; the base curves a
// pixel toward us (it lies below the eye, the eave a little above). A gold finial, the pennant
// flapping in the breeze from the left, guy ropes out to stakes (drawn outside the outline: a rope
// isn't 3 px thick).
anim("pennant_t", { w: 10, h: 5, frames: 8, fps: 8 }, (c) => {
  const k = c.phase * Math.PI * 2
  for (let x = 0; x < 9; x++) { const dy = Math.round(Math.sin(k - x * 0.7) * (x / 8)); c.vline(x, 1 + dy, Math.max(1, 3 - Math.floor(x / 3)), x > 5 ? "Z" : "y") }
})
const PW = 38, PC = 19, PH = 46, TOP = 4, EAVE = 22, BASE = 44, WALL = 13, RIM = 17, STRIPES = 10
const COLS = [["q", "w", "e"], ["v", "v", "c"]]                  // a stripe's shade, middle and lit tones
sprite("pavilion", { w: PW, h: PH, pivot: "bottom", outline: "k", height: 4.2 }, (c) => {
  // where round the tent a point is (-90 to 90 degrees, 0 facing us), its stripe and its tone
  const turn = (x, r) => Math.asin(Math.max(-1, Math.min(1, (x + 0.5 - PC) / r)))
  const band = (a) => Math.min(STRIPES - 1, Math.floor(((a + Math.PI / 2) / Math.PI) * STRIPES))
  const tone = (a) => (Math.sin(a) > 0.3 ? 2 : Math.sin(a) > -0.5 ? 1 : 0)
  const paint = (x, y, a, up = 0, shift = 0) => c.px(x, y, COLS[(band(a) + shift) % 2][Math.max(0, Math.min(2, tone(a) + up))])
  // the wall, down to its base curving toward us; a row of shade under the valance
  for (let x = PC - WALL; x < PC + WALL; x++) {
    const a = turn(x, WALL), foot = BASE + Math.round(1.2 * Math.cos(a))
    for (let y = EAVE; y <= foot; y++) paint(x, y, a, y <= EAVE + 7 ? -1 : 0)
  }
  // the roof sags a little between the pole and the eave (its radius grows faster low down); each
  // pixel's stripe from where its line up to the pole meets the eave; facing the sky, a step lighter
  for (let y = TOP; y <= EAVE; y++) {
    const r = RIM * ((y - TOP + 0.5) / (EAVE - TOP)) ** 1.35
    for (let x = Math.ceil(PC - r); x < PC + r; x++) paint(x, y, turn(x, r), 1)
  }
  // the valance round the eave, its stripes set half a stripe over from the wall's so it stands off
  // it, each ending in a scallop; a gold trim along its top
  for (let x = PC - RIM; x < PC + RIM; x++) {
    const a = turn(x, RIM), s = ((a + Math.PI / 2) / Math.PI) * STRIPES, f = s - Math.floor(s)
    const drop = EAVE + 3 + (f > 0.1 && f < 0.9 ? 1 : 0) + (f > 0.25 && f < 0.75 ? 1 : 0) + (f > 0.4 && f < 0.6 ? 1 : 0)
    for (let y = EAVE + 1; y <= drop; y++) paint(x, y, a, 0, 1)
    c.px(x, EAVE + 1, tone(a) === 2 ? "Z" : "y")
  }
  // the door: a pointed opening, dark inside, its flaps tied back on their white lining
  c.poly([PC - 7, BASE + 2, PC - 3, 31, PC - 2, 31, PC - 3, BASE + 2], "c"); c.poly([PC + 3, BASE + 2, PC + 2, 31, PC + 3, 31, PC + 7, BASE + 2], "v")
  c.poly([PC - 3, BASE + 2, PC - 2, 31, PC + 2, 31, PC + 3, BASE + 2], "z")
  c.px(PC - 5, 38, "Z"); c.px(PC + 5, 38, "Z")
  // the pole's top and its gold finial
  c.vline(PC, 1, TOP, "L"); c.px(PC, 0, "Z")
})
// with its pennant and its guy ropes, pegged into the grass
const ROPE = 6
sprite("pavilion_set", { w: PW + 2 * ROPE, h: PH + 4, pivot: "bottom", height: 4.5 },
  line(ROPE + PC - RIM, EAVE + 5, 1, PH + 3, "v"), line(ROPE + PC + RIM, EAVE + 5, PW + 2 * ROPE - 2, PH + 3, "v"),
  px(0, PH + 3, "t"), px(PW + 2 * ROPE - 1, PH + 3, "t"),
  stamp("pavilion", ROPE + PC + 1, PH + 3), stamp("pennant_t", ROPE + PC + 2, 2, { rdelay: true }))

// ---------------------------------------------------------------- the lists' palisade
// a rail of planks on posts, painted, between the field and the sand where the knights fight
// 0.9 m high on row 132, so 16 px; its wood paled toward the sand's tones by the distance
sprite("palisade", { w: 14, h: 16, wrap: "x" },
  rect(0, 3, 14, 4, "a"), rect(0, 9, 14, 4, "a"), hline(0, 6, 14, "b"), hline(0, 12, 14, "b"),
  hline(0, 3, 14, "d"), hline(0, 9, 14, "d"), rect(5, 0, 2, 16, "b"), vline(6, 0, 16, "a"), rect(5, 0, 2, 1, "d"))

// ---------------------------------------------------------------- the marshal
// the tournament's marshal, between the two and a little behind, facing us: an old herald in a red
// chaperon (its rolled brim, a gold brooch, a white feather), grey hair and a trimmed white beard, a
// tabard quartered in both knights' colors under a gold cross, its short wings over the shoulders,
// parti-colored hose (a blue leg and a red one) and pointed shoes; his left hand on his hip, the
// right holding the white baton with its gold ends. When it drops, they fight. 1.65 m on row 140 is
// 37 px. Each mass is drawn flat and lit on its own. His arm and baton: up through the fanfare, swept
// down at the bout's signal (BOUT_SIGNAL), up again once the knights are back on their marks.
// Drawn 8 px in and 3 down, for the baton's room: each mass a plate lit on its own, the details unlit.
const lit = (...items) => plate({ light: LIGHT, reach: 1 }, ...items)
const TABARD = [4, 13, 12, 13, 13, 27, 3, 27]
const BATON = {
  up: [rect(2, 7, 2, 7, "c"), rect(2, 5, 2, 2, "j"), vline(3, -3, 8, "c"), px(3, -3, "Z")],
  out: [line(3, 14, -1, 10, "c", 2), rect(-3, 8, 2, 2, "j"), line(-3, 8, -7, 4, "c"), px(-7, 4, "Z")],
  down: [rect(2, 14, 2, 7, "c"), rect(2, 21, 2, 2, "j"), line(2, 23, -1, 30, "c"), px(-1, 30, "Z")],
}
const RAISE = BOUT_HOME + 5                             // the baton goes up again: the knights home and settled
anim("marshal", { w: 27, h: 40, pivot: [16, 40], fps: 8, outline: "k", selout: true, facing: "front", height: 1.65 },
  // the baton arm, under the tabard's wing
  layer("arm", { x: 8, y: 3 },
    frame({ hold: BOUT_SIGNAL }, ...BATON.up), frame(...BATON.out), frame({ hold: RAISE - BOUT_SIGNAL - 1 }, ...BATON.down),
    frame(...BATON.out), frame({ hold: BOUT_LOOP - RAISE - 1 }, ...BATON.up),
    relight(undefined, { light: LIGHT, reach: 1 })),
  layer("body", { x: 8, y: 3 },
    lit(rect(5, 28, 3, 7, "w")), lit(rect(9, 28, 3, 7, "r")),                                   // hose
    lit(rect(4, 35, 4, 2, "T"), px(3, 36, "T")), lit(rect(9, 35, 4, 2, "T"), px(13, 36, "T")),   // shoes
    lit(clip(TABARD, rect(0, 13, 8, 7, "w"), rect(9, 13, 8, 7, "r"), rect(0, 21, 8, 7, "r"), rect(9, 21, 8, 7, "w")),
      poly([2, 13, 5, 13, 5, 16, 2, 17], "w"), poly([11, 13, 14, 13, 14, 17, 11, 16], "r")),     // tabard, its wings
    clip(TABARD, vline(8, 13, 15, "Z"), hline(0, 20, 17, "Z")), hline(3, 27, 11, "y"),          // the gold cross, the hem
    lit(line(13, 16, 15, 19, "c", 2), line(15, 19, 13, 21, "c", 2)), lit(rect(12, 21, 2, 2, "j")),   // the hand on his hip
    rect(7, 12, 3, 1, "J"),                                                                   // neck
    lit(rect(5, 6, 7, 5, "j"), hline(6, 11, 5, "j"), px(4, 8, "j"), px(12, 8, "j")),           // face, ears
    vline(4, 6, 2, "v"), vline(12, 6, 2, "v"),                                                // grey hair
    px(6, 7, "z"), px(10, 7, "z"), px(6, 6, "v"), px(10, 6, "v"), px(8, 8, "J"),               // eyes, brows, nose
    lit(hline(6, 9, 5, "c"), rect(6, 10, 5, 1, "c"), hline(7, 11, 3, "c"), px(8, 12, "c")), px(8, 10, "v"),   // beard
    lit(poly([10, 3, 12, 0, 14, -2, 15, -2, 15, -1, 13, 1, 11, 4], "c")),                    // the feather, behind the brooch
    lit(ellipse(8, 2, 3, 2, "r")), lit(ellipse(8, 4, 5, 1, "R")), px(10, 4, "Z")))           // chaperon, brooch

// ---------------------------------------------------------------- the two knights
// fighting their bout, both anims on the middle of the lists; the red one (knight.px.js's RED: its
// surcoat and shield field red, its cape blue) first, so the blue one's sword, on its near side,
// crosses over the red one's, on its far side
const KNIGHTS = [["knight_l_bout", 160, { swap: RED }], ["knight_bout", 160, {}]]
// The sun is high, in front of us and to the right (the knights' fronts are lit): shadows fall to the
// left and a little back, onto the ground behind what casts them. Those of what stands behind the
// lists (the stand, the pavilions, the trumpeters, the palisade itself) go on the grass before those
// things are drawn, so the palisade hides them where it should and they don't darken its rails (two
// steps darker: one is lost in the grass's dither); the knights' and the marshal's go on the sand.
const SUN = [-0.45, -0.25]
const BEHIND = [["stand_full", 92, 122, {}], ["pavilion_set", 210, 121, {}], ["pavilion_set", 304, 121, { swap: RED }],
  ["trumpeter", 14, 122, {}], ["trumpeter", 252, 122, { flip: "x" }]]
const knights = KNIGHTS.map(([n, x, o]) => stamp(n, x, FEET, o))
const shadows = [...KNIGHTS.map(([n, x, o]) => stamp(n, x, FEET, { ...o, cast: SUN, silhouette: "k" })),
  stamp("marshal", 160, 140, { cast: SUN, silhouette: "k" })]
// the sand: trampled darker along the palisade's foot, scuffed where the knights have been
// shifting their feet, a few straws blown in
const sand = [
  hline(0, 133, W, "b"), ...[...Array(40).keys()].map((i) => px((i * 83) % W, 134 + (i % 2), "b")),
  ...[[96, 166, 6], [104, 169, 5], [124, 167, 4], [196, 168, 5], [216, 166, 6], [224, 170, 4], [160, 172, 7], [150, 163, 3]].map(([x, y, n]) => hline(x, y, n, "b")),
  ...[[92, 165], [130, 170], [204, 171], [230, 165], [168, 175]].map(([x, y]) => px(x, y, "d")),
  ...[[40, 160, 4, -1], [270, 172, 5, 1], [150, 156, 3, 1], [60, 176, 4, 1]].map(([x, y, n, d]) => line(x, y, x + n, y + d, "Z")),
]

scene("tournament", { w: W, h: H, bg: "A", world: { horizon: HZ, eye: EYE, light: LIGHT } },
  layer("sky", ...sky),
  layer("far", ...far),
  layer("veil", { opacity: 0.45 }, ...veil),
  layer("horizon haze", { opacity: 0.3 }, rect(0, 86, W, 18, "D")),
  layer("valley", { opacity: 0.45 }, ...valleyMist, rect(0, 102, W, 2, "D")),
  layer("field", ...field, ...sand),
  layer("ground shadows", { shade: 2 }, ...BEHIND.map(([n, x, y, o]) => stamp(n, x, y, { ...o, cast: SUN, silhouette: "k" })),
    tile("palisade", 0, 117, 23, 1, { cast: SUN, silhouette: "k" })),
  layer("stands", { sort: "y" }, ...BEHIND.map(([n, x, y, o]) => stamp(n, x, y, o))),
  layer("lists", tile("palisade", 0, 117, 23, 1)),
  layer("shadows", { shade: true }, ...shadows),
  layer("knights", { sort: "y" }, stamp("marshal", 160, 140), ...knights),
  // sparks, smears and dust give light or take none: `unlit`, so describe doesn't read a lit side off them
  layer("sparks", { unlit: true }, stamp("knight_bout_fx", 160, FEET, { swap: { L: "v", T: "d" } })))
