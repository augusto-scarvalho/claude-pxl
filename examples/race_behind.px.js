// Racing seen from behind (racing_behind, lib/profiles/racing_behind.px.js: Mario Kart's kind), 240 x 160: the
// library's demo, from library F5's stage 7b still (the map laid by plane(), the eye behind your kart, what stands by
// the floor's scale where it stands). A closed lap drawn as the floor's map from the kit's corner sets
// (lib/architecture/track_behind.px.js); the trees, the palm and the backdrop lib/nature/trackside_behind.px.js's;
// the karts and their drivers lib/vehicles/kart.px.js's. Your kart, fuego, runs one lap in the loop; the camera
// sits behind it at the profile's eye and turns with it (perspective()'s yaw: the floor turns under it), the
// backdrop's layers sliding as it turns, the farther the slower; your kart steering through the bends, a step at a
// time. Two lagunas race you: you pass one on the start straight off the boost strip and one inside the left kink,
// and both come back past you round the last sweep, so the loop closes; fuego's twin leads far ahead, small. Each
// rival's drawing is the one of its 48 for its heading against the line from the eye to it, at the rung of
// kart.LADDER its distance gives (kart.rival(): the two smallest by hand). The trees oaks, palms, spruces. The scene's expect: the karts never overlap, yours drawn over every rival
// in view and whole on the picture; the file's own checks (they throw): every kart's four tyres on asphalt or a kerb
// at every frame, by the map under them; the steering a step a frame at most.
include("../lib/vehicles/kart.px.js", { as: "kart", palette: true })
include("../lib/nature/trackside_behind.px.js", { as: "trackside" })
const GB = genre("racing_behind"), C = GB.camera, TX = 0.177, T = 8

// ---------------------------------------------------------------- the course
// Its middle line in map px (TX m each: the kit's 0.177), from the start line north up the map, clockwise: [len] a
// straight, [r, deg, fast] a bend of radius r turning deg (right +); the two straights given null are sized so the lap
// closes. The start straight, a fast right (sand outside), a short straight east, the hairpin (135 right, slow), a
// short run south-west, a fast left kink (sand outside), the back straight south, a long fast right sweep (sand
// outside) onto the start straight. The road 72 px edge to edge (HALF each side: the kit's nine rows of corners).
const HALF = 36, SAND = 28
const PIECES = [[180], [126, 90, true], [null], [58, 135], [80], [92, -45, true], [null], [100, 180, true], [120]]
const RAD = Math.PI / 180
const walk = (list) => {
  let x = 0, y = 0, th = 0
  return list.map(([a, deg, fast]) => {
    const s = { x, y, th }
    if (deg === undefined) Object.assign(s, { L: a, dx: Math.sin(th), dy: -Math.cos(th) }), (x += a * s.dx), (y += a * s.dy)
    else {
      const sg = Math.sign(deg), phi = deg * RAD, cx = x + sg * a * Math.cos(th), cy = y + sg * a * Math.sin(th), vx = x - cx, vy = y - cy
      Object.assign(s, { r: a, sg, phi, cx, cy, fast: !!fast, L: a * Math.abs(phi), a0: Math.atan2(vy, vx) })
      x = cx + vx * Math.cos(phi) - vy * Math.sin(phi); y = cy + vx * Math.sin(phi) + vy * Math.cos(phi); th += phi
    }
    return s
  }).concat([{ end: [x, y, th] }])
}
// the two open straights: the lap's end on its start, solved (the end moves linearly with each length)
const OPEN = PIECES.map((p, i) => (p[0] === null ? i : -1)).filter((i) => i >= 0)
const endOf = (a, b) => walk(PIECES.map((p, i) => (i === OPEN[0] ? [a] : i === OPEN[1] ? [b] : p))).pop().end
const E0 = endOf(0, 0), EA = endOf(1, 0), EB = endOf(0, 1), ax = EA[0] - E0[0], ay = EA[1] - E0[1], bx = EB[0] - E0[0], by = EB[1] - E0[1], det = ax * by - ay * bx
const LENS = [(-E0[0] * by + E0[1] * bx) / det, (-ax * E0[1] + ay * E0[0]) / det]
const SEGS = walk(PIECES.map((p, i) => (i === OPEN[0] ? [LENS[0]] : i === OPEN[1] ? [LENS[1]] : p))).slice(0, -1)
let acc = 0
for (const s of SEGS) { s.s0 = acc; acc += s.L }
const LAP = acc, wrap = (s) => ((s % LAP) + LAP) % LAP
// the middle line s px along: where (start-relative map px) and its heading (compass radians)
const mid0 = (s) => {
  s = wrap(s)
  const g = SEGS.find((q) => s < q.s0 + q.L) ?? SEGS[SEGS.length - 1], u = s - g.s0
  if (!g.r) return { x: g.x + g.dx * u, y: g.y + g.dy * u, th: g.th }
  const a = (g.phi * u) / g.L, vx = g.x - g.cx, vy = g.y - g.cy
  return { x: g.cx + vx * Math.cos(a) - vy * Math.sin(a), y: g.cy + vx * Math.sin(a) + vy * Math.cos(a), th: g.th + a }
}
// the map: the course with MARGIN px of grass round it (the floor reaches 645 px ahead; past the map plain grass)
const MARGIN = 280, BOX = Array.from({ length: 400 }, (_, i) => mid0((i * LAP) / 400))
const OX = Math.ceil((MARGIN - Math.min(...BOX.map((p) => p.x))) / T) * T, OY = Math.ceil((MARGIN - Math.min(...BOX.map((p) => p.y))) / T) * T
const MW = Math.ceil((OX + Math.max(...BOX.map((p) => p.x)) + MARGIN) / T) * T, MH = Math.ceil((OY + Math.max(...BOX.map((p) => p.y)) + MARGIN) / T) * T
const mid = (s) => { const p = mid0(s); return { x: p.x + OX, y: p.y + OY, th: p.th } }
// a point `lat` px to the right of the middle line s px along
const at = (s, lat = 0) => { const p = mid(s); return [p.x + lat * Math.cos(p.th), p.y + lat * Math.sin(p.th)] }
// the bends: their middle (s), length, way (1 right), radius, fast
const BENDS = SEGS.filter((g) => g.r).map((g) => ({ s: g.s0 + g.L / 2, L: g.L, sg: g.sg, r: g.r, fast: g.fast }))

// The middle line's nearest piece to a map point: how far (px), to which side (lat, + right of the way), in a bend's
// sweep (u along it, `ext` px past its ends counting)
const near = (px, py, ext = 0) => {
  let best = { d: Infinity }
  for (const g of SEGS) {
    const x = px - OX, y = py - OY
    if (!g.r) {
      const vx = x - g.x, vy = y - g.y, u = Math.max(0, Math.min(g.L, vx * g.dx + vy * g.dy)), d = Math.hypot(x - g.x - g.dx * u, y - g.y - g.dy * u)
      if (d < best.d) best = { d, lat: vx * Math.cos(g.th) + vy * Math.sin(g.th), g }
    } else {
      const vx = x - g.cx, vy = y - g.cy, rp = Math.hypot(vx, vy)
      let rel = g.sg * (Math.atan2(vy, vx) - g.a0)
      rel = ((rel % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
      if (rel > Math.PI * 1.5) rel -= 2 * Math.PI
      const d = Math.abs(rp - g.r), e = ext / g.r
      if (rel >= -e && rel <= Math.abs(g.phi) + e && d < best.d) best = { d, lat: g.sg * (g.r - rp), g, bend: rel >= -e && rel <= Math.abs(g.phi) + e }
    }
  }
  return best
}
// ---------------------------------------------------------------- the lines
// Each kart's racing line, `lat` px right of the middle: its own lane, and its own reach to the inside of each bend
// (apex(s) 1 there at its middle, eased in over its first half and 60 px before, out over its second half and 60 after;
// your kart's 14 px)
const near1 = (s, a) => s - a - LAP * Math.round((s - a) / LAP)
const apex = (s) => BENDS.reduce((v, b) => v + b.sg * Math.exp(-((near1(s, b.s) / (b.L / 2 + 60)) ** 2)), 0)
const YOURLINE = 14
// the boost strip on your line, px after the start line
const BOOST = 70
// each tile corner: r road (within HALF of the middle), s sand (a band SAND px wide outside a fast bend, 40 px past
// its ends), g grass
const terrainAt = (x, y) => {
  const n = near(x, y)
  if (n.d <= HALF) return "r"
  const b = near(x, y, 40)
  return b.bend && b.g.fast && b.lat * b.g.sg < 0 && b.d > HALF && b.d <= HALF + SAND ? "s" : "g"
}
const CG = Array.from({ length: MH / T + 1 }, (_, j) => Array.from({ length: MW / T + 1 }, (_, i) => terrainAt(i * T, j * T)))
// the start line's tile row (the line on its middle's row)
const SROW = Math.floor(at(0)[1] / T)
sprite("_map", { w: MW, h: MH }, (c) => {
  for (let j = 0; j < MH / T; j++) for (let i = 0; i < MW / T; i++) {
    const k = [CG[j][i], CG[j][i + 1], CG[j + 1][i], CG[j + 1][i + 1]], mask = (t) => k.reduce((a, ch, b) => a | (ch === t ? 1 << b : 0), 0)
    const mr = mask("r"), ms = mask("s"), v = ((j >> 1) & 1) | (((i + j) & 1) << 1)
    // a road tile in a bend's sweep (12 px past its ends) its kerb: inside always, outside on the sand
    const b = mr ? near(i * T + 4, j * T + 4, 12) : {}, set = b.bend ? (b.lat * b.g.sg > 0 ? "kerb" : ms ? "kerbsand" : "road") : "road"
    const name = mr && j === SROW ? `trackside.circuit.start_${mr}` : mr ? `trackside.circuit.${set}_${mr}_${v}` : `trackside.circuit.${ms ? `sand_${ms}` : "road_0"}_${v}`
    c.stamp(name, i * T, j * T)
  }
  // the grid behind the line, two by two staggered; the boost strip on your line down the start straight
  for (let r = 0; r < 4; r++) for (const sd of [-1, 1]) { const [x, y] = at(-24 - r * 28 - (sd > 0 ? 14 : 0), sd * 14); c.stamp("trackside.circuit.grid_mark", Math.round(x), Math.round(y)) }
  const [bx, by] = at(BOOST, YOURLINE * apex(BOOST)); c.stamp("trackside.circuit.boost", Math.round(bx) - 8, Math.round(by) - 16)
})
// on the road: a map point's share of road by its tile's corners (as the corner sets draw it: the edge line from 3/8)
const onRoad = (x, y) => {
  const i = Math.floor(x / T), j = Math.floor(y / T), u = (x - i * T) / T, w = (y - j * T) / T, r = (a, b) => (CG[b]?.[a] === "r" ? 1 : 0)
  return r(i, j) * (1 - u) * (1 - w) + r(i + 1, j) * u * (1 - w) + r(i, j + 1) * (1 - u) * w + r(i + 1, j + 1) * u * w >= 0.375
}

// ---------------------------------------------------------------- the race
// 60 ms a frame (16.7 fps, a GIF's whole hundredths): the profile names no frame rate, and the top-down demo's 25 would
// take 210 frames for the lap's 8.4 s; N frames, one lap.
const MS = 60, N = 140
// the speed along the line, 1 a straight's: slower into each bend, the more the tighter (the hairpin to 0.6), braking
// over its first half and 40 px before, pulling away over its second half and 70 px after; the boost strip a push
// (+0.35, gone over ~150 px)
const DIP = BENDS.map((b) => 0.4 * Math.min(1, 60 / b.r) * Math.sqrt(Math.min(1, b.L / b.r / (Math.PI / 2))))
const speed = (s) => {
  let v = 1
  BENDS.forEach((b, i) => { const x = near1(s, b.s), w = x < 0 ? b.L / 2 + 40 : b.L / 2 + 70; v -= DIP[i] * Math.exp(-((x / w) ** 2)) })
  const x = near1(s, BOOST)
  return v + (x < 0 ? 0 : 0.35 * (1 - Math.exp(-x / 6)) * Math.exp(-x / 80))
}
// your pace: s at frame f (any real), frame 0 S0 px before the start line; its time over each px summed, the lap
// brought to N frames
const S0 = LAP - 150, STEPS = 1400, DS = LAP / STEPS, TIME = [0]
for (let i = 0; i < STEPS; i++) TIME.push(TIME[i] + DS / speed(S0 + (i + 0.5) * DS))
const pace = (f) => {
  const lap = Math.floor(f / N), t = ((f - lap * N) * TIME[STEPS]) / N
  let lo = 0, hi = STEPS
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (TIME[m] <= t) lo = m; else hi = m }
  return S0 + lap * LAP + (lo + (t - TIME[lo]) / (TIME[hi] - TIME[lo])) * DS
}
// The rivals, each its own line (its lane, its reach into the bends) and how far it runs ahead of you (px along the
// line, at frames; a smooth loop through them). Laguna a, on the left: 4 m ahead at the start, passed off the boost
// strip down the start straight, back past you round the outside of the last sweep. Laguna b, on the right: 8 m
// ahead, caught down the back half, passed inside the left kink, back past you inside the last sweep. Fuego's twin
// leads, 50-60 m ahead.
const RIVALS = [
  { id: "rival_a", liv: "laguna", lane: -16, amp: 8, gap: [[0, 22], [14, 20], [20, 12], [26, 0], [32, -22], [40, -40], [104, -40], [112, -22], [120, 0], [130, 12]] },
  { id: "rival_b", liv: "laguna", lane: 16, amp: 15, gap: [[0, 45], [40, 34], [70, 14], [86, 0], [92, -20], [98, -36], [104, -22], [112, 0], [124, 24]] },
  { id: "leader", liv: "fuego", lane: 0, amp: 10, gap: [[0, 330], [70, 290]] },
]
// through the keys, looping: Catmull-Rom (a smooth speed)
const loopKeys = (K) => (f) => {
  f = ((f % N) + N) % N
  const n = K.length, i = K.findLastIndex(([k]) => k <= f), k = (j) => { const q = K[((j % n) + n) % n]; return [q[0] + N * Math.floor(j / n), q[1]] }
  const [p0, p1, p2, p3] = [k(i - 1), k(i), k(i + 1), k(i + 2)], u = (f - p1[0]) / (p2[0] - p1[0]), dt = p2[0] - p1[0]
  const m1 = ((p2[1] - p0[1]) / (p2[0] - p0[0])) * dt, m2 = ((p3[1] - p1[1]) / (p3[0] - p1[0])) * dt
  return (2 * u ** 3 - 3 * u ** 2 + 1) * p1[1] + (u ** 3 - 2 * u ** 2 + u) * m1 + (-2 * u ** 3 + 3 * u ** 2) * p2[1] + (u ** 3 - u ** 2) * m2
}
for (const r of RIVALS) r.gapAt = loopKeys(r.gap)
// each kart at frame f: its s, and where it is on the map
const YOU = { id: "you", liv: "fuego", lane: 0, amp: YOURLINE, gapAt: () => 0 }
const where = (k, f) => { const s = pace(f) + k.gapAt(f); return at(s, k.lane + k.amp * apex(s)) }
// its heading (compass degrees) over the frame
const headingOf = (k, f) => { const a = where(k, f - 0.5), b = where(k, f + 0.5); return Math.atan2(b[0] - a[0], -(b[1] - a[1])) / RAD }
// your heading, unwrapped over the loop (it turns once round: 360 more at its end)
const YAW = [headingOf(YOU, 0)]
for (let f = 1; f <= N + 1; f++) { const h = headingOf(YOU, f), p = YAW[f - 1]; YAW.push(p + ((((h - p) % 360) + 540) % 360) - 180) }
// the eye ZK m behind your kart along the yaw (your kart's pivot DROP rows over its tyres' lowest, the profile's row)
const DROP = 3, ZK = (C.focal * C.eye) / (GB.kart.row - DROP - C.horizon)
// the camera's yaw: your heading eased over 7 frames (a camera on a string: it follows the kart's turn a moment late)
const CAMYAW = Array.from({ length: N }, (_, f) => [-3, -2, -1, 0, 1, 2, 3].reduce((a, d) => { const g = f + d, w = Math.exp(-(d * d) / 4); return [a[0] + w * (YAW[((g % N) + N) % N] + 360 * Math.floor(g / N)), a[1] + w] }, [0, 0])).map(([a, w]) => a / w)
// Your kart's steering, by how hard its line turns (degrees a px: the hairpin's 0.8 three steps, the first bend's and
// the sweep's 0.4-0.5 two, the kink's 0.25 one; right +), at most a step a frame each way (easing in and out)
const TURN = Array.from({ length: N }, (_, f) => (YAW[f + 1] - YAW[f]) / Math.hypot(...where(YOU, f + 0.5).map((v, i) => v - where(YOU, f - 0.5)[i])))
const WANT = TURN.map((k) => Math.sign(k) * (Math.abs(k) >= 0.65 ? 3 : Math.abs(k) >= 0.35 ? 2 : Math.abs(k) >= 0.12 ? 1 : 0))
const STEER = WANT.slice()
for (let pass = 0; pass < 3; pass++) for (let f = 0; f < N; f++) { const p = STEER[(f + N - 1) % N]; STEER[f] = Math.max(p - 1, Math.min(p + 1, WANT[f])) }
STEER.forEach((k, f) => { if (Math.abs(k - STEER[(f + N - 1) % N]) > 1) throw new Error(`race_behind: the steering jumps at frame ${f}`) })
const YOURS = (k) => (k ? `kart.kart_fuego_${k < 0 ? "left" : "right"}${Math.abs(k)}` : kart.facing("fuego", 0))

// ---------------------------------------------------------------- what stands
// [name, map x, map y, flip]: at the start the gantry over the line, flags either side of it, lamps down the right,
// the grandstand on the left and a billboard on the right; round each bend's outside tyre walls past the sand, its
// chevrons pointing the way it turns (flipped for the left kink) where it begins, a guardrail round the last sweep;
// trees, palms and bushes over the grass beyond, away from the road, scattered by a hash
const side = (name, s, lat, flip) => [name, ...at(s, lat), flip]
const PROPS = [
  side("flag", 6, -(HALF + 10)), side("flag", 6, HALF + 10), ...[-110, -40, 30, 100].map((s) => side("lamp", s, HALF + 12)),
  side("grandstand", -40, -(HALF + 64)), side("billboard", 130, HALF + 40), side("billboard", -150, -(HALF + 34)),
  ...BENDS.flatMap((b) => {
    const s0 = b.s - b.L / 2, out = -b.sg, w = b.fast ? SAND : 0, flip = b.sg < 0 ? "x" : undefined
    return [...[0.15, 0.4, 0.65, 0.9].map((u) => side("tyre_wall", s0 + u * b.L, out * (HALF + w + 14))),
      ...[0.02, 0.22].map((u) => side("chevron", s0 + u * b.L, out * (HALF + w + 6), flip))]
  }),
  ...[0.3, 0.45, 0.6, 0.75].map((u) => side("guardrail", BENDS[3].s - BENDS[3].L / 2 + u * BENDS[3].L, -(HALF + SAND + 30))),
]
const KEEP = PROPS.map(([, x, y]) => [x, y])
for (let y = 24; y < MH; y += 52) for (let x = 24; x < MW; x += 52) {
  const tx = x + 30 * (hash(x, y, 7) - 0.5), ty = y + 30 * (hash(x, y, 8) - 0.5), h = hash(x, y, 9)
  if (h > 0.42 || near(tx, ty).d < HALF + SAND + 16 || KEEP.some(([a, b]) => Math.hypot(a - tx, b - ty) < 40)) continue
  PROPS.push([h < 0.14 ? "oak" : h < 0.22 ? "palm" : h < 0.32 ? "spruce" : h < 0.38 ? "bush" : "rock", tx, ty])
}

// ---------------------------------------------------------------- each frame
// The camera behind your kart, ZK m back along its yaw; a map point seen from it: [x, z] m in the camera's world (z
// ahead before the turn), how far ahead along its axis (depth), where it lands on the screen
const CAM = (f) => {
  const yaw = CAMYAW[f], [kx, ky] = where(YOU, f), a = yaw * RAD, ex = kx - (ZK / TX) * Math.sin(a), ey = ky + (ZK / TX) * Math.cos(a)
  const view = { w: C.w, horizon: C.horizon, eye: C.eye, focal: C.focal, yaw }, P = perspective(view)
  const see = (mx, my) => { const x = (mx - ex) * TX, z = (ey - my) * TX, depth = x * Math.sin(a) + z * Math.cos(a), [sx, sy] = P.ground(x, z); return { x, z, depth, side: x * Math.cos(a) - z * Math.sin(a), sx, sy } }
  return { yaw, ex, ey, P, see, view }
}
// the rivals' drawings: the painted 48 at 32 px across, the ladder's other rungs for each livery (kart.rival: from 24
// to 13 drawn at their size from 3D, 9 and 6 by hand); a rung for a kart at depth z the nearest by its px across
// (1.25 m x focal / z, with its line)
const RUNG = Object.fromEntries(["laguna", "fuego"].map((liv) => [liv, Object.fromEntries(kart.LADDER.filter(([a]) => a < 32).map(([a]) => [a, kart.rival(`_rv_${liv}_${a}`, liv, a)]))]))
const rungOf = (z) => { const want = (1.25 * C.focal) / z + 2; return kart.LADDER.map(([a]) => a).reduce((b, a) => (Math.abs(a - want) < Math.abs(b - want) ? a : b)) }
const drawingOf = (liv, z, deg) => { const a = rungOf(z); return a === 32 ? kart.facing(liv, deg) : RUNG[liv][a].facing(deg) }
// What each frame stamps, far to near: what stands (the rung for its depth), the rivals (each its drawing for its
// heading against the line from the eye to it); then your kart, its steering's drawing, on its row
const FRAMES = Array.from({ length: N }, (_, f) => {
  const cam = CAM(f), items = []
  for (const [name, x, y, flip] of PROPS) {
    const q = cam.see(x, y)
    if (q.depth > 2 && q.depth < 125 && q.sx > -160 && q.sx < C.w + 160) items.push({ name: circuit.rung(name, q.depth), x: q.sx, y: q.sy, depth: q.depth, flip })
  }
  for (const r of RIVALS) {
    const q = cam.see(...where(r, f))
    // drawn where some of it shows: its middle within half its width of the sides, its head over the bottom edge
    const a = q.depth > 2 ? rungOf(q.depth) : 32
    if (q.depth < 2 || Math.abs(q.sx - C.w / 2) > C.w / 2 + a / 2 - 4 || q.sy > C.h + 0.75 * a) continue
    const deg = headingOf(r, f) - cam.yaw - Math.atan2(q.side, q.depth) / RAD
    items.push({ name: drawingOf(r.liv, q.depth, deg), x: q.sx, y: q.sy, depth: q.depth, id: r.id })
  }
  items.sort((a, b) => b.depth - a.depth)
  const k = cam.see(...where(YOU, f))
  return { cam, items, you: { name: YOURS(STEER[f]), x: k.sx, y: k.sy } }
})
const F = (c) => Math.round(c.t / MS) % N

// ---------------------------------------------------------------- the gantry, passed from below
// Over the start line it spans the road and a step each side (the kit's make3d.gantry, 14.5 m, its beam 4.6 m up: two
// posts, the beam, the checkered banner under it, squares 0.33 m, facing the karts coming): drawn through the turned
// camera each frame as flat faces (mesh()), so it grows and passes over the top of the screen as you drive under it
// (its rungs, drawn for 22 m and beyond, can't come nearer); in the kit's metal and banner tones
pal({ 4: "#36344a", 5: "#56586c", 6: "#75798f", 7: "#aeb0bc", 8: "#eeebe0", 9: "#1e1a2e" })
const GMATS = { metal: { ramp: "567", edge: "4" }, white: { ramp: "78", edge: "4" }, black: { ramp: "9", edge: "4" } }
const GS = 14.5, GH = 4.6, GATE = at(0)
const gantry = (cam) => {
  const m = model(), x0 = (GATE[0] - cam.ex) * TX, z0 = (cam.ey - GATE[1]) * TX, p = (a, b, u) => [x0 + a, z0 + b, u]
  for (const sd of [-1, 1]) m.box("metal", p((sd * GS) / 2 - 0.15, -0.15, 0), p((sd * GS) / 2 + 0.15, 0.15, GH))
  m.box("metal", p(-GS / 2 - 0.15, -0.17, GH - 0.17), p(GS / 2 + 0.15, 0.17, GH + 0.17))
  const n = Math.round((GS - 0.5) / 0.33), w = (GS - 0.5) / n
  for (let i = 0; i < n; i++) for (let j = 0; j < 3; j++) {
    const a = -(GS - 0.5) / 2 + i * w, u = GH - 0.22 - (j + 1) * 0.33
    m.face((i + j) % 2 ? "black" : "white", p(a, -0.05, u), p(a + w, -0.05, u), p(a + w, -0.05, u + 0.33), p(a, -0.05, u + 0.33))
  }
  return m.faces
}
for (const fr of FRAMES) {
  const q = fr.cam.see(...GATE)
  if (q.depth > 0.5 && q.depth < 125) fr.items.push({ depth: q.depth, draw: (c) => c.mesh(fr.cam.view, gantry(fr.cam), GMATS) }), fr.items.sort((a, b) => b.depth - a.depth)
}

// ---------------------------------------------------------------- the rules
// The file's own check (expect can't say it: a region's pixels are the screen's, and the floor under a kart turns with
// the camera): every kart's four tyres, at the corners of its footprint (racing_behind's 1.25 x 1.36 m), on asphalt,
// its edge line or a kerb, at every frame, by the map under them; never on the grass or the sand.
for (const k of [YOU, ...RIVALS]) for (let f = 0; f < N; f++) {
  const [x, y] = where(k, f), a = headingOf(k, f) * RAD, [fw, fl] = GB.contract.footprint.map((m) => m / 2 / TX)
  for (const [i, j] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const px = x + i * fw * Math.cos(a) + j * fl * Math.sin(a), py = y + i * fw * Math.sin(a) - j * fl * Math.cos(a)
    if (!onRoad(px, py)) throw new Error(`race_behind: ${k.id}'s tyre is off the road at frame ${f} (map ${Math.round(px)}, ${Math.round(py)})`)
  }
}
// The scene's expect, held by pxl check at every frame: the karts never overlap (each pair at the frames both are
// drawn), yours drawn over each rival in view and all on the picture
const DRAWN = (id) => {
  const on = FRAMES.map((fr) => id === "you" || fr.items.some((t) => t.id === id)), spans = []
  on.forEach((v, f) => { if (v && (f === 0 || !on[f - 1])) spans.push([f, f]); if (v) spans[spans.length - 1][1] = f })
  return spans
}
const IDS = ["you", ...RIVALS.map((r) => r.id)], both = (a, b) => DRAWN(a).flatMap(([p, q]) => DRAWN(b).map(([r, s]) => [Math.max(p, r), Math.min(q, s)])).filter(([p, q]) => p <= q)
const RULES = [
  ...IDS.flatMap((a, i) => IDS.slice(i + 1).flatMap((b) => both(a, b).map((frames) => ({ apart: [a, b], frames })))),
  ...RIVALS.flatMap((r) => DRAWN(r.id).map((frames) => ({ before: ["you", r.id], frames }))),
  { inside: ["you", [0, 0, C.w, C.h]] },
]

// ---------------------------------------------------------------- the scene
// The backdrop: the sky's bands the same all across (it stands); the clouds slide a strip's width (256 px) a turn of
// the camera, the study's, the hills two, the treeline three, each to the left as the camera turns right: a lap turns
// it once round, so each comes back to where it was
const SLIDE = [["trackside.clouds", 1, -8, 4], ["trackside.hills", 2, -40, C.floor - 40], ["trackside.treeline", 3, -20, C.floor - 20]]
const backdrop = (c, f) => {
  c.stamp("trackside.sky", 0, 0)
  for (const [name, n, x0, y] of SLIDE) {
    const x = Math.round(((((x0 - (n * 256 * (CAMYAW[f] - CAMYAW[0])) / 360) % 256) + 256) % 256) - 256)
    c.stamp(name, x, y); c.stamp(name, x + 256, y)
  }
}
// the floor: the grass, the map over it through the turned camera; the haze over its first rows, each row paler toward
// the backdrop's palest the farther it is (half way on the first, nothing past the 15th)
const HAZE = [0xcf, 0xe8, 0xfb]
const haze = (c) => {
  for (let y = C.floor; y < C.floor + GB.backdrop.haze; y++) {
    const k = 0.5 * (1 - (y - C.floor) / GB.backdrop.haze)
    for (let x = 0; x < C.w; x++) {
      const v = c.get(x, y), rgb = [v >>> 24, (v >>> 16) & 255, (v >>> 8) & 255].map((e, i) => Math.round(e + (HAZE[i] - e) * k))
      c.px(x, y, `#${rgb.map((e) => e.toString(16).padStart(2, "0")).join("")}`)
    }
  }
}
const floor = (c, f) => {
  const cam = FRAMES[f].cam
  c.rect(0, C.floor, C.w, C.h - C.floor, "#6cbc40")
  c.plane(cam.view, { tex: "_map", texel: TX, at: [-cam.ex * TX, cam.ey * TX] }, [0, C.floor, C.w, C.h - C.floor])
  haze(c)
}
// what stands where some of it lands on the picture (the rivals chosen so as they're placed: the rules read them)
const shows = (c, t) => { const im = c.asset(t.name), b = im.bounds(), [px, py] = im.pivot ?? [0, 0], x = Math.round(t.x - px) + b.x, y = Math.round(t.y - py) + b.y; return x < C.w && y < C.h && x + b.w > 0 && y + b.h > 0 }
const things = (c, f) => { for (const t of FRAMES[f].items) t.draw ? t.draw(c) : (t.id || shows(c, t)) && c.stamp(t.name, Math.round(t.x), Math.round(t.y), { ...(t.id ? { id: t.id } : {}), ...(t.flip ? { flip: t.flip } : {}) }) }
const you = (c, f) => { const y = FRAMES[f].you; c.stamp(y.name, Math.round(y.x), Math.round(y.y), { id: "you" }) }
scene("race_behind", { w: C.w, h: C.h, bg: "#cfe8fb", frames: N, fps: 1000 / MS, expect: RULES },
  layer("backdrop", (c) => backdrop(c, F(c))),
  layer("floor", (c) => floor(c, F(c))),
  layer("things", (c) => things(c, F(c))),
  layer("you", (c) => you(c, F(c))))
