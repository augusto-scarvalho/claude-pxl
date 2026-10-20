// The cockpit of a mid-nineties Japanese sports coupe (after the Supra A80's: the dash wrapped round
// the driver, three gauges under one hood, the centre stack turned toward him, a flat dash on the
// passenger's side with the glovebox lid), left-hand drive. It is built in 3D, in meters, from the
// driver's eye (x right, y up, z ahead), and drawn through the same camera as the road: each surface
// a few flat faces, every pixel keeping the nearest face; a face takes its material's tone by how it
// lies to the light (the low sun ahead and to the left, through the glass, and the sky above), and a
// line is drawn where one surface ends in front of another or two faces meet at an edge. The details
// (gauges, vents, buttons, stitching) are painted over it where the camera puts them.

// ---------------------------------------------------------------- the camera and the renderer
const CAM = { f: 204.8, pitch: Math.atan((H / 2 - HORIZON) / 204.8) }
const CP = Math.cos(CAM.pitch), SP = Math.sin(CAM.pitch)
// a point from the driver's eye to the picture: [x, y, depth]
const eye = ([x, y, z]) => { const yc = y * CP + z * SP, zc = z * CP - y * SP; return [W / 2 + (CAM.f * x) / zc, H / 2 - (CAM.f * yc) / zc, zc] }
const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const unit3 = (a) => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l] }
const SUNDIR = unit3([-0.45, 0.5, 0.75])                              // toward the sun: ahead, left, low
// a model: faces (flat polygons, 3 or 4 corners) with a material each
function model() {
  const faces = []
  const face = (mat, ...pts) => { faces.push({ mat, pts }); return faces.length - 1 }
  // a strip between two lines of points (a loft): quads between neighbours
  const strip = (mat, a, b) => { for (let i = 0; i + 1 < a.length; i++) face(mat, a[i], a[i + 1], b[i + 1], b[i]) }
  // a grid of sections, each a line of points: quads between neighbouring sections
  const loft = (mat, secs) => { for (let j = 0; j + 1 < secs.length; j++) strip(mat, secs[j], secs[j + 1]) }
  const box = (mat, [x0, y0, z0], [x1, y1, z1]) => {
    const p = (i, j, k) => [i ? x1 : x0, j ? y1 : y0, k ? z1 : z0]
    face(mat, p(0, 1, 0), p(1, 1, 0), p(1, 1, 1), p(0, 1, 1)); face(mat, p(0, 0, 0), p(1, 0, 0), p(1, 1, 0), p(0, 1, 0))
    face(mat, p(0, 0, 0), p(0, 1, 0), p(0, 1, 1), p(0, 0, 1)); face(mat, p(1, 0, 0), p(1, 0, 1), p(1, 1, 1), p(1, 1, 0))
    face(mat, p(0, 0, 0), p(0, 0, 1), p(1, 0, 1), p(1, 0, 0))
  }
  return { faces, face, strip, loft, box }
}
// draws a model: depth per pixel, the nearest face's tone, lines at its edges. MATS: per material its
// tones dark to light, and the key of its outline
function render3d(c, faces, MATS, x0 = 0, y0 = 0) {
  const n = W * H, depth = new Float32Array(n).fill(1e9), who = new Int32Array(n).fill(-1)
  faces.forEach((F, k) => {
    const N = unit3(cross3(sub3(F.pts[1], F.pts[0]), sub3(F.pts[2], F.pts[0])))
    const mid = F.pts.reduce((s, p) => [s[0] + p[0] / F.pts.length, s[1] + p[1] / F.pts.length, s[2] + p[2] / F.pts.length], [0, 0, 0])
    const toward = mid[0] * N[0] + mid[1] * N[1] + mid[2] * N[2] > 0 ? -1 : 1   // the side we see
    F.n = N.map((v) => v * toward)
    const sun = Math.max(0, F.n[0] * SUNDIR[0] + F.n[1] * SUNDIR[1] + F.n[2] * SUNDIR[2]), sky = Math.max(0, F.n[1])
    const glass = Math.max(0, -F.n[2] * 0.4 + F.n[1] * 0.3)                   // the glow off the windshield and the sky
    const toGlass = Math.max(0, Math.min(1, (mid[2] - 0.72) / 0.25)), low = Math.max(0, Math.min(1, (-0.3 - mid[1]) / 0.3))
    F.light = 0.22 + (MATS_BIAS[F.mat] ?? 0) + 0.55 * sun + 0.25 * sky + 0.2 * glass + 0.14 * toGlass - 0.22 * low
    const P = F.pts.map(eye)
    if (P.some((p) => p[2] < 0.05)) return
    for (let t = 1; t + 1 < P.length; t++) {
      const [a, b, d] = [P[0], P[t], P[t + 1]]
      const area = (b[0] - a[0]) * (d[1] - a[1]) - (b[1] - a[1]) * (d[0] - a[0])
      if (Math.abs(area) < 1e-6) continue
      const xa = Math.max(0, Math.floor(Math.min(a[0], b[0], d[0]))), xb = Math.min(W - 1, Math.ceil(Math.max(a[0], b[0], d[0])))
      const ya = Math.max(0, Math.floor(Math.min(a[1], b[1], d[1]))), yb = Math.min(H - 1, Math.ceil(Math.max(a[1], b[1], d[1])))
      for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++) {
        const px = x + 0.5, py = y + 0.5
        const w1 = ((d[0] - a[0]) * (py - a[1]) - (d[1] - a[1]) * (px - a[0])) / -area, w2 = ((b[0] - a[0]) * (py - a[1]) - (b[1] - a[1]) * (px - a[0])) / area
        const w0 = 1 - w1 - w2
        if (w0 < -1e-4 || w1 < -1e-4 || w2 < -1e-4) continue
        const z = 1 / (w0 / a[2] + w1 / b[2] + w2 / d[2]), i = y * W + x
        if (z < depth[i]) { depth[i] = z; who[i] = k }
      }
    }
  })
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, k = who[i]
    if (k < 0) continue
    const F = faces[k], M = MATS[F.mat]
    // an outline where this surface is in front of another or of nothing; a crease where faces meet
    let line = null
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const xx = x + dx, yy = y + dy
      if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue
      const j = yy * W + xx, k2 = who[j]
      if (k2 === k) continue
      if (k2 < 0 || depth[j] > depth[i] * 1.06) { line = M.edge; break }
      const F2 = faces[k2]
      if (F2.mat !== F.mat && depth[j] >= depth[i]) line = line ?? M.edge
      else if (F2.mat === F.mat && F.n[0] * F2.n[0] + F.n[1] * F2.n[1] + F.n[2] * F2.n[2] < 0.82 && depth[j] >= depth[i]) line = line ?? M.ramp[0]
    }
    const r = M.ramp, lv = Math.max(0, Math.min(r.length - 1, Math.floor(F.light * r.length + (bayer(x, y) - 0.5) * (M.dither ?? 0))))
    // the top edge of a surface, just under its outline, catches the light: a step lighter
    const up1 = y > 0 ? who[i - W] : -1, up2 = y > 1 ? who[i - 2 * W] : -1
    const rim = !line && up1 === k && (up2 < 0 || (up2 !== k && depth[i - 2 * W] > depth[i] * 1.06)) && F.n[1] > -0.3
    const tw = M.weave && !line && !rim && (x + y * 2) % 5 === 0 ? -1 : 0                // cloth: a twill a shade darker
    c.px(x + x0, y + y0, line ?? (rim ? M.top ?? r[Math.min(r.length - 1, lv + 1)] : r[Math.max(0, lv + tw)]))
  }
  return { depth, who }
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
  const m = model(), { face, strip, loft, box } = m
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
  loft("cloth", [[[-0.407, -0.205, 0.95], [-0.407, -0.335, 0.93]], [[-0.407, -0.205, 0.3], [-0.407, -0.335, 0.3]]])
  loft("trim", [[[-0.41, -0.335, 0.7], [-0.36, -0.33, 0.7], [-0.34, -0.345, 0.69], [-0.34, -0.42, 0.69]], [[-0.41, -0.335, 0.2], [-0.36, -0.33, 0.2], [-0.34, -0.345, 0.2], [-0.34, -0.42, 0.2]]])
  // the left pillar, from the windshield's foot up to the roof, rounded on its inside
  const pil = (t) => { const a = [-0.5, COWL[0] + 0.005, 0.99], b = [-0.405, 0.165, 0.56]; return a.map((v, i) => v + (b[i] - v) * t) }
  loft("pillar", [0, 0.5, 1].map((t) => { const p = pil(t); return [[p[0] - 0.02, p[1], p[2] + 0.03], [p[0] + 0.03, p[1], p[2]], [p[0] + 0.07, p[1] - 0.01, p[2] - 0.02]] }))
  // the roof's front edge over the windshield
  loft("liner", [[[-0.42, 0.165, 0.56], [-0.42, 0.18, 0.45]], [[1.0, 0.165, 0.56], [1.0, 0.18, 0.45]]])
  return m.faces
})()
const MATS_BIAS = { cloth: 0.38, trim: 0.12 }
const COCKPIT_MATS = {
  dash: { ramp: ["0", "-", "=", "~", "^"], edge: "0", top: "%" },
  stack: { ramp: ["0", "-", "=", "~", "^"], edge: "0" },
  lip: { ramp: ["-", "=", "~", "^"], edge: "0", top: "%" },
  hood: { ramp: ["0", "0", "-"], edge: "0" },
  gauge: { ramp: ["0", "0"], edge: "0" },
  door: { ramp: ["0", "-", "=", "~", "^"], edge: "0" },
  trim: { ramp: ["-", "=", "~", "^"], edge: "0" },
  cloth: { ramp: ["-", "=", "]", "}"], edge: "0", weave: true },
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

// the door's handle: a chrome lever in its dark recess, seen along the door
sprite("_handle", `
  ...........00000.
  ........000wwwW0.
  .....000^WWWW^^0.
  ...00^^^000000-0.
  .00-=000.....00..
  0--00............`)

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
  digits(c, "1:24", seen(onStack(0.362, -0.302)), seen(onStack(0.438, -0.302)), "y")
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
  put("_handle", [-0.406, -0.255, 0.62], 17, 6)
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
  // the left mirror out past the side glass: a dark housing, the sunset in the glass
  c.poly([0, 84, 25, 83, 30, 95, 27, 103, 0, 104], "-")
  c.poly([0, 86, 23, 85, 27, 95, 24, 101, 0, 102], "6"); c.poly([0, 90, 25, 89, 27, 95, 24, 101, 0, 102], "5"); c.poly([0, 96, 26, 96, 24, 101, 0, 102], "a")
  c.line(4, 87, 14, 86, "8"); c.line(25, 83, 30, 95, "~")
}

sprite("_cockpit", { w: W, h: H }, (c) => { render3d(c, COCKPIT, COCKPIT_MATS); cockpitDetails(c) })
