// The cockpit of a mid-nineties Japanese sports coupe (after the Supra A80's: the dash wrapped round
// the driver, three gauges under one hood, the centre stack turned toward him, a flat dash on the
// passenger's side with the glovebox lid), left-hand drive. It is built in 3D, in meters, from the
// driver's eye (x right, y up, z ahead) as a model() of flat faces, and drawn by mesh() through the
// same lens as the road: every pixel keeps the nearest face; a face takes its material's tone by how it
// lies to the light (the low sun ahead and to the left, through the glass, and the sky above), and a
// line is drawn where one surface ends in front of another or two faces meet at an edge. The details
// (gauges, vents, buttons, stitching) are painted over it where the camera puts them.

// ---------------------------------------------------------------- the camera and the light
const CAM = { f: 204.8, pitch: Math.atan((H / 2 - HORIZON) / 204.8) }
const CP = Math.cos(CAM.pitch), SP = Math.sin(CAM.pitch)
// a point from the driver's eye to the picture: [x, y, depth]
const eye = ([x, y, z]) => { const yc = y * CP + z * SP, zc = z * CP - y * SP; return [W / 2 + (CAM.f * x) / zc, H / 2 - (CAM.f * yc) / zc, zc] }
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const unit3 = (a) => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l] }
const SUNDIR = unit3([-0.45, 0.5, 0.75])                              // toward the sun: ahead, left, low
// the light on a face (mesh() steps it along the material's ramp): the low sun through the glass, the
// sky above, the glow off the windshield on what faces it, more toward the glass, less down by the knees
const LIT = {
  light: (n, mid, F) => {
    const sun = Math.max(0, n[0] * SUNDIR[0] + n[1] * SUNDIR[1] + n[2] * SUNDIR[2]), sky = Math.max(0, n[1])
    const glass = Math.max(0, -n[2] * 0.4 + n[1] * 0.3)
    const toGlass = Math.max(0, Math.min(1, (mid[2] - 0.72) / 0.25)), low = Math.max(0, Math.min(1, (-0.3 - mid[1]) / 0.3))
    return 0.22 + (MATS_BIAS[F.mat] ?? 0) + 0.55 * sun + 0.25 * sky + 0.2 * glass + 0.14 * toGlass - 0.22 * low
  },
}

// ---------------------------------------------------------------- the model, in meters
// The driver sits at x 0; the car's middle is 0.37 m to his right, its doors 0.42 m to his left and
// 1.16 m to his right (out of sight at this lens: the frame shows the left pillar and door, the dash
// across, and the centre stack). The windshield's foot is a meter ahead and 17 cm below the eye.
// the dash's back edge: round the driver, then turned toward him at the centre stack, then across
const STACK_TURN = 0.24                                                 // how far the stack's face comes back per meter across
const backZ = (x) => (x < 0.24 ? 0.74 : x < 0.58 ? 0.7 + (x - 0.24) * STACK_TURN : 0.7 + 0.34 * STACK_TURN + (x - 0.58) * 0.08)
const backY = (x) => (x < 0.24 ? -0.21 : -0.205)
const COCKPIT = (() => {
  const m = model(), { face, strip, loft } = m
  const COWL = [-0.17, 1.0]                                             // the windshield's foot: height, distance
  // the dash top, from the glass to its back edge and over its rounded lip, the left end to the far right
  const xs = [-0.44, -0.36, -0.3, -0.25, 0.25, 0.3, 0.36, 0.44, 0.52, 0.58, 0.66, 0.76, 0.9]
  const prof = (x) => {
    const bz = backZ(x), by = backY(x)
    return [[x, COWL[0], COWL[1]], [x, -0.175, 0.93], [x, by + 0.02, bz + 0.08], [x, by, bz + 0.015], [x, by - 0.02, bz - 0.005], [x, by - 0.045, bz]]
  }
  loft("dash", xs.map(prof))
  // the centre stack, turned toward the driver, and the passenger's dash face, down out of sight
  const face2 = (x) => [[x, backY(x) - 0.045, backZ(x)], [x, -0.42, backZ(x) - 0.01], [x, -0.7, backZ(x) - 0.03]]
  loft("stack", [0.25, 0.3, 0.36, 0.44, 0.52, 0.58].map(face2))
  loft("dash", [0.58, 0.66, 0.76, 0.9].map(face2))
  // the instrument hood over the gauges: an arch, its lip toward the driver, its inside dark
  const arch = (z, w, top, base, k = 9) => Array.from({ length: k }, (_, i) => { const t = Math.PI * (i / (k - 1)); return [-w * Math.cos(t), base + top * Math.sin(t), z] })
  loft("dash", [arch(0.97, 0.27, 0.06, -0.19), arch(0.86, 0.275, 0.11, -0.24), arch(0.76, 0.27, 0.125, -0.26), arch(0.69, 0.26, 0.12, -0.265)])
  strip("lip", arch(0.69, 0.26, 0.12, -0.265), arch(0.7, 0.24, 0.105, -0.266))
  loft("hood", [arch(0.7, 0.24, 0.105, -0.266), arch(0.8, 0.24, 0.1, -0.27), arch(0.87, 0.235, 0.095, -0.275)])
  // the gauge panel at the back of the hood, and the dash face under it, toward the knees
  const back = arch(0.87, 0.235, 0.095, -0.275)
  for (let i = 0; i + 1 < back.length; i++) face("gauge", [0, -0.33, 0.875], back[i], back[i + 1])
  face("gauge", [-0.235, -0.275, 0.87], [0.235, -0.275, 0.87], [0.235, -0.36, 0.87], [-0.235, -0.36, 0.87])
  loft("dash", [[[-0.44, -0.25, 0.74], [-0.44, -0.6, 0.76]], [[-0.25, -0.25, 0.73], [-0.25, -0.6, 0.75]]])
  loft("dash", [[[-0.26, -0.27, 0.69], [-0.24, -0.36, 0.7], [-0.24, -0.6, 0.73]], [[0.26, -0.27, 0.69], [0.24, -0.36, 0.7], [0.24, -0.6, 0.73]]])
  // the left door: its sill under the side glass, the panel, the armrest
  loft("door", [[[-0.5, -0.135, 1.0], [-0.42, -0.14, 1.0], [-0.41, -0.2, 1.0], [-0.41, -0.75, 0.98]], [[-0.5, -0.135, 0.2], [-0.42, -0.14, 0.2], [-0.41, -0.2, 0.2], [-0.41, -0.75, 0.2]]])
  loft("door", [[[-0.41, -0.185, 0.97], [-0.4, -0.19, 0.97], [-0.4, -0.205, 0.96]], [[-0.41, -0.185, 0.3], [-0.4, -0.19, 0.3], [-0.4, -0.205, 0.3]]])
  loft("cloth", [[[-0.407, -0.205, 0.95], [-0.407, -0.335, 0.93]], [[-0.407, -0.205, 0.3], [-0.407, -0.335, 0.3]]])
  // the handle's cup, set into the cloth, and the chrome lever across it
  loft("cup", [[[-0.406, -0.228, 0.7], [-0.418, -0.245, 0.69], [-0.406, -0.28, 0.7]], [[-0.406, -0.228, 0.53], [-0.418, -0.245, 0.535], [-0.406, -0.28, 0.53]]])
  loft("chrome", [[[-0.404, -0.24, 0.68], [-0.394, -0.246, 0.68], [-0.404, -0.253, 0.68]], [[-0.404, -0.24, 0.56], [-0.394, -0.246, 0.56], [-0.404, -0.253, 0.56]]])
  // the left mirror's foot: a black sail in the window's front corner, its adjusting lever
  face("sail", [-0.49, -0.135, 0.98], [-0.47, -0.05, 0.96], [-0.47, -0.135, 0.86])
  face("sail", [-0.47, -0.05, 0.96], [-0.455, -0.05, 0.955], [-0.455, -0.135, 0.86], [-0.47, -0.135, 0.86])
  loft("trim", [[[-0.41, -0.335, 0.7], [-0.36, -0.33, 0.7], [-0.34, -0.345, 0.69], [-0.34, -0.42, 0.69]], [[-0.41, -0.335, 0.2], [-0.36, -0.33, 0.2], [-0.34, -0.345, 0.2], [-0.34, -0.42, 0.2]]])
  // the left pillar, from the windshield's foot up to the roof, rounded on its inside
  const pil = (t) => { const a = [-0.5, COWL[0] + 0.005, 0.99], b = [-0.405, 0.165, 0.56]; return a.map((v, i) => v + (b[i] - v) * t) }
  loft("pillar", [0, 0.5, 1].map((t) => { const p = pil(t); return [[p[0] - 0.02, p[1], p[2] + 0.03], [p[0] + 0.03, p[1], p[2]], [p[0] + 0.07, p[1] - 0.01, p[2] - 0.02]] }))
  // the roof's front edge over the windshield
  loft("liner", [[[-0.42, 0.165, 0.56], [-0.42, 0.18, 0.45]], [[1.0, 0.165, 0.56], [1.0, 0.18, 0.45]]])
  return m.faces
})()
const MATS_BIAS = { cloth: 0.38, trim: 0.12, rim: 0.22, spoke: 0.14, hub: 0.1, chrome: 0.5 }
const COCKPIT_MATS = {
  dash: { ramp: ["0", "-", "=", "~", "^"], edge: "0", top: "%" },
  stack: { ramp: ["0", "-", "=", "~", "^"], edge: "0" },
  lip: { ramp: ["-", "=", "~", "^"], edge: "0", top: "%" },
  hood: { ramp: ["0", "0", "-"], edge: "0" },
  gauge: { ramp: ["0", "0"], edge: "0" },
  door: { ramp: ["0", "-", "=", "~", "^"], edge: "0" },
  trim: { ramp: ["-", "=", "~", "^"], edge: "0" },
  cloth: { ramp: ["-", "=", "]", "}"], edge: "0", texture: (x, y) => ((x + y * 2) % 7 === 0 ? -1 : 0) },   // a twill a shade darker
  cup: { ramp: ["0", "0", "-"], edge: "0" },
  chrome: { ramp: ["^", "W", "w"], edge: "0", smooth: true },
  sail: { ramp: ["0", "-", "=", "~"], edge: "0", top: "^" },
  pillar: { ramp: ["0", "-", "=", "~"], edge: "0" },
  liner: { ramp: ["-", "=", "~", "^"], edge: "0" },
}

// ---------------------------------------------------------------- the small parts, drawn by hand
// a climate dial: knurled round its edge, its top in the light, the pointer
sprite("_dial", `
  ...00000...
  ..0^^w^^0..
  .0^~~w~~^0.
  0^~~~w~~~=0
  0~~~~~~~~=0
  0~~~~~~~==0
  0=~~~~~~==0
  0-=====-=-0
  .0-=====-0.
  ..0-----0..
  ...00000...`)
// the hazard switch: a black button, its red triangle
sprite("_hazard", `
  .00000.
  0-----0
  0--(--0
  0-(@(-0
  0(((((0
  0-----0
  .00000.`)
// a rocker switch on the dash, its top in the light
sprite("_rocker", `
  00000
  0^~~0
  0=-=0
  00000`)


// ---------------------------------------------------------------- the details, where the camera puts them
const seen = (p) => { const [x, y] = eye(p); return [x, y] }
const add3 = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k]
// a round thing lying on a surface (u, v: its directions there), as the polygon the camera sees
const disc = (ctr, u, v, r, n = 28) => Array.from({ length: n }, (_, i) => { const t = (TAU * i) / n; return seen(add3(add3(ctr, u, r * Math.cos(t)), v, r * Math.sin(t))) })
const fillPts = (c, pts, key) => c.poly(pts.flat().map((v) => Math.round(v * 2) / 2), key)
const lineAt = (c, a, b, key) => { const [x0, y0] = seen(a), [x1, y1] = seen(b); c.line(Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1), key) }
// the three gauges in the hood: the speedometer, the tachometer (bigger, in the middle), fuel and
// temperature; each with its centre and radius in the picture, for the needles
const GAUGE_PLANE = { u: [1, 0, 0], v: [0, 1, 0] }
const GAUGES = [[-0.135, -0.228, 0.043, "speed"], [0, -0.222, 0.053, "revs"], [0.135, -0.228, 0.043, "fuel"]].map(([x, y, r, kind]) => {
  const ctr = [x, y, 0.868], [cx, cy] = seen(ctr), [ex] = seen(add3(ctr, [1, 0, 0], r))
  return { ctr, r, kind, x: cx, y: cy, rp: ex - cx }
})
// the clock's digits, 3 x 5, written along a line in the picture (from a toward b) so they lie on
// a face turned away from the eye: each column of pixels dropped as the line drops
const DIGITS = { 0: "111101101101111", 1: "010110010010111", 2: "111001111100111", 3: "111001111001111", 4: "101101111001001",
  5: "111100111001111", 6: "111100111101111", 7: "111001010010010", 8: "111101111101111", 9: "111101111001111", ":": "000010000010000" }
function digits(c, str, [ax, ay], [bx, by], key) {
  const slope = (by - ay) / (bx - ax), R = Math.round
  let x = 0
  for (const ch of str) {
    const g = DIGITS[ch], w = ch === ":" ? 1 : 3
    for (let j = 0; j < 5; j++) for (let i = 0; i < 3; i++) if (g[j * 3 + i] === "1") { const cx = ch === ":" ? 0 : i, px = x + cx; c.px(R(ax + px), R(ay + j + px * slope), key) }
    x += w + 1
  }
}
// a round vent in perspective: a short tube set into the face (u, v: the face's directions, its
// normal out toward the cabin); the bezel is the ellipse the camera sees, lit on the side toward the
// light; through its mouth, the tube's inner wall on the far side, and at its back the slats and the
// knob, on the face's own plane
function vent3(c, ctr, u, v, r) {
  const n = unit3(cross3(u, v)), out = n[2] < 0 ? n : n.map((k) => -k), deep = add3(ctr, out, -0.03)
  const R = Math.round, ring = (k, at = ctr, m = 32) => disc(at, u, v, r * k, m)
  fillPts(c, ring(1.2), "0"); fillPts(c, ring(1.1), "W")
  const rim = ring(1.1, ctr, 32)
  for (let i = 0; i < 32; i++) {
    const t = (TAU * i) / 32, lit = -Math.cos(t) * 0.7 + Math.sin(t) * 0.7     // u right, v up: the upper left is lit
    if (Math.abs(lit) < 0.35) continue
    const [x0, y0] = rim[i], [x1, y1] = rim[(i + 1) % 32]
    c.line(R(x0), R(y0), R(x1), R(y1), lit > 0 ? "w" : "^")
  }
  const mouth = ring(0.9)
  fillPts(c, mouth, "0")
  c.clip(mouth.flat().map(R), () => {
    fillPts(c, disc(add3(ctr, out, -0.012), u, v, r * 0.9), "=")                 // the inner wall
    fillPts(c, disc(deep, u, v, r * 0.86), "-")                                   // the back
    for (let k = -3; k <= 3; k++) {
      const y = (k / 3.7) * r, w = Math.sqrt(Math.max(0, r * r * 0.72 - y * y))
      lineAt(c, add3(add3(deep, v, y), u, -w), add3(add3(deep, v, y), u, w), "0")
      lineAt(c, add3(add3(deep, v, y + r * 0.06), u, -w), add3(add3(deep, v, y + r * 0.06), u, w * 0.2), "~")
    }
    fillPts(c, disc(add3(deep, out, 0.008), u, v, r * 0.24, 14), "0"); fillPts(c, disc(add3(deep, out, 0.01), u, v, r * 0.17, 12), "^")
  })
}
function cockpitDetails(c) {
  const R = Math.round
  // the defroster's slots along the foot of the windshield, and the stitching along the dash's lip
  for (const x0 of [-0.36, 0.04, 0.44]) lineAt(c, [x0, -0.172, 0.965], [x0 + 0.28, -0.172, 0.965], "0")
  for (let x = -0.43; x < 0.9; x += 0.018) { if (Math.abs(x) < 0.29) continue; const [px, py] = seen([x, backY(x) + 0.003, backZ(x) + 0.013]); c.px(R(px), R(py), "(") }
  // the gauges: bezel, dark face, the marks round it, the redline on the tachometer
  for (const g of GAUGES) {
    const { u, v } = GAUGE_PLANE
    fillPts(c, disc(g.ctr, u, v, g.r * 1.12), "W"); fillPts(c, disc(g.ctr, u, v, g.r * 1.02), "w"); fillPts(c, disc(g.ctr, u, v, g.r * 0.96), "0")
    const marks = g.kind === "fuel" ? 6 : 12
    for (let i = 0; i <= marks; i++) {
      const a = Math.PI * (1.25 - (1.5 * i) / marks), long = i % 2 === 0, red = g.kind === "revs" && i >= 10
      lineAt(c, add3(g.ctr, [Math.cos(a), Math.sin(a), 0], g.r * (long ? 0.68 : 0.78)), add3(g.ctr, [Math.cos(a), Math.sin(a), 0], g.r * 0.9), red ? "(" : ")")
    }
  }
  // the vent at the dash's left end, toward the driver; the two on the centre stack, between them the
  // hazard switch, under them the clock, the three climate dials, and the radio low down
  const put = (name, p, w, h) => { const [x, y] = seen(p); c.stamp(name, R(x - w / 2), R(y - h / 2)) }
  const onStack = (x, y) => [x, y, backZ(x) - 0.004], su = unit3([1, 0, STACK_TURN]), sv = [0, 1, 0.03]
  // the stack's bezel: a panel a shade lighter round the controls, its edge catching the light
  const bez = [onStack(0.27, -0.235), onStack(0.55, -0.235), onStack(0.55, -0.375), onStack(0.27, -0.375)].map(seen)
  fillPts(c, bez, "0"); fillPts(c, bez.map(([x, y], i) => [x + (i === 0 || i === 3 ? 1 : -1), y + (i < 2 ? 1 : -1)]), "=")
  lineAt(c, onStack(0.275, -0.24), onStack(0.545, -0.24), "~")
  vent3(c, [-0.345, -0.3, 0.738], [1, 0, 0], [0, 1, 0], 0.036)
  vent3(c, onStack(0.318, -0.282), su, sv, 0.028)
  vent3(c, onStack(0.478, -0.282), su, sv, 0.028)
  put("_hazard", onStack(0.4, -0.262), 7, 7)
  const lcd = [onStack(0.355, -0.296), onStack(0.445, -0.296), onStack(0.445, -0.326), onStack(0.355, -0.326)].map(seen)
  fillPts(c, lcd, "0"); fillPts(c, lcd.map(([x, y], i) => [x + (i === 0 || i === 3 ? 1 : -1), y + (i < 2 ? 1 : -1)]), "-")
  const [l0, l1] = [seen(onStack(0.355, -0.302)), seen(onStack(0.445, -0.302))], wide = l1[0] - l0[0], sl = (l1[1] - l0[1]) / wide, x0 = (wide - 18) / 2
  digits(c, "18:24", [l0[0] + x0, l0[1] + x0 * sl], l1, "y")
  for (const x of [0.3, 0.4, 0.5]) put("_dial", onStack(x, -0.35), 11, 11)
  const radio = [onStack(0.27, -0.385), onStack(0.55, -0.385), onStack(0.55, -0.46), onStack(0.27, -0.46)].map(seen)
  fillPts(c, radio, "0"); fillPts(c, radio.map(([x, y], i) => [x + (i === 0 || i === 3 ? 1 : -1), y + (i < 2 ? 1 : -1)]), "~")
  const disp = [onStack(0.33, -0.395), onStack(0.49, -0.395), onStack(0.49, -0.418), onStack(0.33, -0.418)].map(seen)
  fillPts(c, disp, "0"); fillPts(c, disp.map(([x, y], i) => [x + (i === 0 || i === 3 ? 1 : -1), y + (i < 2 ? 1 : -1)]), "!")
  lineAt(c, onStack(0.335, -0.399), onStack(0.485, -0.399), "@")
  for (const x of [0.35, 0.39, 0.43]) { const [px, py] = seen(onStack(x, -0.408)); c.px(R(px), R(py), "9"); c.px(R(px) + 1, R(py), "9") }
  for (const x of [0.29, 0.51]) { fillPts(c, disc(onStack(x, -0.405), su, sv, 0.016, 14), "0"); fillPts(c, disc(onStack(x, -0.405), su, sv, 0.012, 14), "^") }
  // the passenger's vent, square, turned toward the middle
  const pv = [[0.6, -0.245, 0.842], [0.72, -0.245, 0.852], [0.72, -0.295, 0.852], [0.6, -0.295, 0.842]].map(seen)
  fillPts(c, pv, "0"); for (let k = 1; k < 6; k++) lineAt(c, [0.605, -0.245 - k * 0.0085, 0.842], [0.715, -0.245 - k * 0.0085, 0.852], k % 2 ? "~" : "-")
  // the door: the handle in the cloth, the window switches on the armrest
  for (const z of [0.6, 0.53]) put("_rocker", [-0.36, -0.332, z], 5, 4)
  // a lighter cap along the door under the sill
  lineAt(c, [-0.409, -0.155, 0.98], [-0.409, -0.155, 0.3], "~"); lineAt(c, [-0.409, -0.162, 0.98], [-0.409, -0.162, 0.3], "=")
  // the stitching round the hood's lip
  for (let i = 1; i < 26; i += 2) { const t = Math.PI * (i / 26), [px, py] = seen([-0.262 * Math.cos(t), -0.263 + 0.122 * Math.sin(t), 0.684]); c.px(R(px), R(py), "(") }
  // left of the hood, on the dash face: the lights' switches; the knee panel's seam under them
  for (const [x, y] of [[-0.335, -0.365], [-0.295, -0.365], [-0.335, -0.395], [-0.295, -0.395]]) put("_rocker", [x, y, 0.738], 5, 4)
  lineAt(c, [-0.44, -0.43, 0.75], [-0.26, -0.43, 0.742], "0")
  // the left pillar: its inside edge in the light, and along it on the glass the black ceramic band,
  // in dots that thin out into the glass; the same band under the roof
  const pillarEdge = (t) => [-0.5 + 0.095 * t + 0.07, -0.165 + 0.33 * t - 0.01, 0.99 - 0.43 * t - 0.02]
  lineAt(c, pillarEdge(0), pillarEdge(1), "~")
  const [ex0, ey0] = seen(pillarEdge(0)), [ex1, ey1] = seen(pillarEdge(1))
  for (let y = Math.max(15, R(Math.min(ey0, ey1))); y <= R(Math.max(ey0, ey1)) - 2; y++) {
    const xe = ex0 + ((ex1 - ex0) * (y - ey0)) / (ey1 - ey0)
    for (let k = 1; k <= 4; k++) {
      const x = R(xe) + k
      if (k === 1 || (k === 2 && (x + y) % 2 === 0) || (k === 3 && x % 2 === 0 && y % 2 === 0) || (k === 4 && x % 3 === 0 && y % 3 === 0)) c.px(x, y, "0")
    }
  }
  for (let x = 0; x < W; x++) for (let k = 0; k < 3; k++) {
    const y = 9 + k
    if (x > 123 && x < 197) continue
    if (k === 0 || (k === 1 && (x + y) % 2 === 0) || (k === 2 && x % 3 === 0)) c.px(x, y, "0")
  }
  // the sun visor, folded up against the roof on the driver's side
  c.poly([18, 0, 120, 0, 116, 9, 26, 8], "~"); c.poly([26, 8, 116, 9, 116, 10, 26, 9], "-"); c.hline(30, 2, 82, "="); c.rect(112, 2, 3, 4, "^")
  // the rear-view mirror: housing, stem, the glass left empty for the mirror's own view
  c.rect(156, 0, 8, 4, "-"); c.rect(125, 3, 70, 16, "0"); c.rect(126, 4, 68, 14, "-"); c.hline(127, 4, 66, "~")
  c.rect(128, 5, MW + 2, MH + 2, "0"); c.rect(129, 6, MW, MH, "_")
  // the left mirror, out past the side glass by the window's front corner: its foot there (a black
  // sail with its adjusting lever), a short arm, the housing round the glass, left empty for the mirror's
  // own view behind
  c.poly([48, 99, 60, 96, 62, 104, 50, 105], "0"); c.poly([49, 100, 59, 97, 60, 103, 51, 104], "-"); c.line(50, 100, 59, 97, "~")
  const [lx, ly] = seen([-0.462, -0.115, 0.9]); c.rect(Math.round(lx) - 1, Math.round(ly) - 1, 3, 2, "^"); c.px(Math.round(lx) - 1, Math.round(ly) - 1, "W")
  c.poly([14, 86, 20, 82, 44, 81, 48, 86, 47, 100, 42, 104, 18, 105, 13, 100], "0")
  c.poly([15, 87, 20, 83, 43, 82, 47, 87, 46, 99, 42, 103, 18, 104, 14, 99], "-")
  c.poly([17, 88, 21, 85, 42, 84, 44, 88, 44, 98, 41, 101, 19, 102, 16, 98], "_")
  c.line(44, 84, 47, 88, "~"); c.line(20, 82, 43, 81, "~")
}

sprite("_cockpit", { w: W, h: H }, (c) => { c.mesh(eye, COCKPIT, COCKPIT_MATS, LIT); cockpitDetails(c) })

// ---------------------------------------------------------------- the steering wheel
// The car's own wheel, the A80 RZ-S's: a thick leather rim; four spokes, the two across wide and nearly
// level with the horn's marks on them, the two below narrower, splayed down to the rim; the airbag's
// big padded boss in the middle, a rounded box a little wider at its top, its seam across it and the
// oval badge on it; behind, the column going down into the dash with the stalks for the lights and the
// wipers. Fitted so its rim falls where the hands were set on it: 0.62 m out toward the picture's
// (160, 140), leaning back 55°, 15 cm round its outside. It turns: the boss and the spokes go round
// with it, the column stays.
const lookAt = (sx, sy) => { const k = -(sy - H / 2) / CAM.f; return unit3([(sx - W / 2) / CAM.f, k * CP - SP, k * SP + CP]) }
const WHEEL3 = (() => {
  const t = (55 * Math.PI) / 180, C = lookAt(160, 140).map((v) => v * 0.62)
  return { C, U: [1, 0, 0], V: [0, Math.cos(t), Math.sin(t)], N: [0, Math.sin(t), -Math.cos(t)], R: 0.15, RHO: 0.014, PX: eye(C)[2] / CAM.f }
})()
const rimDir = (a) => add3(add3([0, 0, 0], WHEEL3.U, Math.cos(a)), WHEEL3.V, Math.sin(a))
// a point on the wheel's face, `inset` px in from the rim's outside, and the rim's middle line
const onRim = (a, inset = 0) => seen(add3(WHEEL3.C, rimDir(a), WHEEL3.R - inset * WHEEL3.PX))
const rimMid = (a) => seen(add3(add3(WHEEL3.C, rimDir(a), WHEEL3.R - WHEEL3.RHO), WHEEL3.N, WHEEL3.RHO * 0.5))
function wheelFaces(turn) {
  const m = model(), { face } = m, { C, U, V, N, R, RHO } = WHEEL3, RC = R - RHO
  const at3 = (a, r, n) => add3(add3(C, rimDir(a), r), N, n)
  // the rim: a tube right round
  const K = 64, J = 8
  for (let i = 0; i < K; i++) for (let j = 0; j < J; j++) {
    const a0 = (TAU * i) / K, a1 = (TAU * (i + 1)) / K, p0 = (TAU * j) / J, p1 = (TAU * (j + 1)) / J
    const q = (a, p) => at3(a, RC + RHO * Math.cos(p), RHO * Math.sin(p))
    face("rim", q(a0, p0), q(a1, p0), q(a1, p1), q(a0, p1))
  }
  // four spokes from the boss, set back, out to the rim's inside: two across, two splayed below
  for (const [own, w] of [[Math.PI + 0.08, 0.056], [-0.08, 0.056], [-2.32, 0.036], [-0.82, 0.036]]) {
    const a = own - turn, side = add3(add3([0, 0, 0], U, -Math.sin(a)), V, Math.cos(a))
    const sec = (r, n, ww) => [-1, 1].flatMap((s) => [add3(at3(a, r, n), side, s * ww)])
    const A = sec(0.07, -0.024, w * 0.95), B = sec(RC - RHO * 0.5, -0.002, w * 0.7)
    const up = (p) => add3(p, N, 0.006), dn = (p) => add3(p, N, -0.006)
    face("spoke", up(A[0]), up(A[1]), up(B[1]), up(B[0])); face("spoke", dn(A[0]), dn(A[1]), dn(B[1]), dn(B[0]))
    face("spoke", up(A[0]), up(B[0]), dn(B[0]), dn(A[0])); face("spoke", up(A[1]), up(B[1]), dn(B[1]), dn(A[1]))
  }
  // the airbag's boss: a rounded box (a superellipse) a little wider at its top, domed toward the driver
  const hub = add3(C, N, -0.03), ux = rimDir(-turn), vy = rimDir(Math.PI / 2 - turn), S = 28
  const box = (a, b, n, t) => { const c0 = Math.cos(t), s0 = Math.sin(t), x = a * Math.sign(c0) * Math.abs(c0) ** 0.5, y = b * Math.sign(s0) * Math.abs(s0) ** 0.5; return add3(add3(add3(hub, ux, x * (1 + (0.07 * y) / b)), vy, y), N, n) }
  const rings = [[0.088, 0.068, 0], [0.086, 0.066, 0.012], [0.078, 0.059, 0.022], [0.052, 0.04, 0.03], [0.002, 0.002, 0.032]]
  for (let k = 0; k + 1 < rings.length; k++) for (let i = 0; i < S; i++) {
    const [a0, b0, n0] = rings[k], [a1, b1, n1] = rings[k + 1], t0 = (TAU * i) / S, t1 = (TAU * (i + 1)) / S
    face("hub", box(a0, b0, n0, t0), box(a0, b0, n0, t1), box(a1, b1, n1, t1), box(a1, b1, n1, t0))
  }
  // the column, into the dash, and its stalks either side
  const col = (t, du, dv) => add3(add3(add3(C, N, -0.04 - t), U, du), V, dv - 0.02)
  for (const [a, b] of [[[-1, 1], [1, 1]], [[1, 1], [1, -1]], [[1, -1], [-1, -1]], [[-1, -1], [-1, 1]]])
    face("column", col(0, a[0] * 0.045, a[1] * 0.035), col(0, b[0] * 0.045, b[1] * 0.035), col(0.3, b[0] * 0.05, b[1] * 0.04), col(0.3, a[0] * 0.05, a[1] * 0.04))
  for (const s of [-1, 1]) {
    const p0 = col(0.06, s * 0.045, 0.005), p1 = add3(add3(p0, U, s * 0.085), N, 0.03), w = 0.006
    for (const [du, dn] of [[[0, 1], [0, 1]]]) void du, void dn
    face("stalk", add3(p0, V, w), add3(p1, V, w), add3(p1, V, -w), add3(p0, V, -w))
    face("stalk", add3(p0, N, w), add3(p1, N, w), add3(p1, N, -w), add3(p0, N, -w))
  }
  return m.faces
}
const WHEEL_MATS = {
  rim: { ramp: ["0", "-", "=", "~", "^"], edge: "0", top: "%", smooth: true },
  spoke: { ramp: ["0", "-", "=", "~", "^"], edge: "0" },
  hub: { ramp: ["0", "-", "=", "~"], edge: "0", top: "^", smooth: true },
  column: { ramp: ["0", "0", "-", "="], edge: "0" },
  stalk: { ramp: ["0", "-", "=", "^"], edge: "0", top: "W" },
}
// over it: the stitching along the rim's inside, dark as the leather; on the boss its seam across and
// the oval badge; the horn's marks on the spokes across
function wheelDetails(c, turn) {
  const R = Math.round, { C, N, R: RR, RHO } = WHEEL3, hub = add3(C, N, 0.002)
  for (let i = 0; i < 90; i++) {
    const a = (TAU * i) / 90, [x, y] = seen(add3(add3(C, rimDir(a), RR - RHO * 1.75), N, RHO * 0.75))
    if (i % 3 === 0) c.px(R(x), R(y), "=")
  }
  const ux = rimDir(-turn), vy = rimDir(Math.PI / 2 - turn), on = (x, y) => seen(add3(add3(hub, ux, x), vy, y))
  { const [a0, a1] = [on(-0.07, 0.012), on(0.07, 0.012)]; c.line(R(a0[0]), R(a0[1]), R(a1[0]), R(a1[1]), "-") }
  const badge = Array.from({ length: 16 }, (_, i) => { const t = (TAU * i) / 16; return on(0.022 * Math.cos(t), 0.004 + 0.014 * Math.sin(t)) })
  c.poly(badge.flat().map(R), "0"); c.poly(badge.map(([x, y]) => [(x - on(0, 0.004)[0]) * 0.6 + on(0, 0.004)[0], (y - on(0, 0.004)[1]) * 0.6 + on(0, 0.004)[1]]).flat().map(R), "^")
  for (const sd of [-1, 1]) { const [hx, hy] = seen(add3(add3(C, N, -0.02), rimDir((sd < 0 ? Math.PI + 0.08 : -0.08) - turn), 0.105)); c.px(R(hx), R(hy), "^"); c.px(R(hx) + 1, R(hy), "~") }
}
