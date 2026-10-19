// Two-point perspective: a park at two in the afternoon. The camera stands at eye height (1.6 m),
// turned 40 degrees: everything laid on the world's x and z axes (the two paths, hedges, benches,
// lamp posts, the playground, the buildings beyond) runs to one of two vanishing points on the
// horizon, P.vanish(0) on the left, P.vanish(90) off the right. The horizon is at eye height, so a
// grown-up's head sits on it wherever she walks; children's heads stay under it. The sun is high
// (55 degrees) and on the left: faces turned left are lit, faces toward us in shade, and the
// shadows are short and fall to the right, all parallel.
// Two children play tag: they come out from behind the hedge down the path from the left vanishing
// point, turn at the crossing in the middle, run off toward the right one behind the ice-cream cart,
// and are gone behind the far hedge. A woman walks her dog straight up the other path, away toward
// the left vanishing point, until the hedge hides them. A girl swings. 24 s, seamless.
pal({
  // sky, top down, and the clouds
  A: "#3f7fd0", B: "#5d98dc", C: "#80b4e6", D: "#a8cdee", E: "#cfe4f2", F: "#ffffff", G: "#e3ebf3", H: "#c3cfdf",
  // buildings: cream, salmon, blue, each lit and shaded; windows, glass catching the sky, roofs
  I: "#f0e1c0", J: "#a9a3b2", K: "#efb393", L: "#ae8e8c", M: "#b7d1dc", O: "#8c9db2", P: "#56688a", Q: "#8fb2d0", R: "#dcd0bc",
  // the park's far edge: trees in haze
  S: "#5b8b63", T: "#7ba67a",
  // lawn: mowing stripes, the same in shade; far
  a: "#7dc04f", b: "#6cb145", c: "#3e7b45", d: "#376f40", e: "#95c27a",
  // paths: concrete, joints and curbs, shade
  f: "#dcd3c2", g: "#bdb3a2", h: "#8e8a99",
  // playground sand, its shade, the wooden curb
  i: "#ead6a2", j: "#aa9a82", k: "#a8784a",
  // bark: dark, mid, lit
  l: "#4a3426", m: "#6c4c34", n: "#90704c",
  // leaves: deep, mid, lit, glint
  o: "#2c6232", p: "#3f8a3c", q: "#66ad4a", r: "#a6d468",
  // ipê amarelo in bloom: dark, mid, lit
  s: "#c8940e", t: "#f2c21e", u: "#ffe46a",
  // playground paint: blue, red, yellow, each dark and light
  v: "#24509e", w: "#3d7ad4", x: "#b2302e", y: "#e2493a", z: "#d49a14", Z: "#f6c83a",
  // neutrals: ink, white, light, mid, dark gray
  0: "#1b1b25", 1: "#fafafa", 2: "#cdd1d9", 3: "#8b909b", 4: "#4c505c",
  // skin, light to dark, and hair
  5: "#f1c39a", 6: "#cf9468", 7: "#9a6542", 8: "#5e3c2a", 9: "#2a2026",
  // clothes: navy, green and its shade, coral dress and its shade, straw and its shade, raspberry
  U: "#2b3b6c", V: "#2f8a4a", W: "#1f5e34", X: "#ec735e", Y: "#b24c42", "@": "#e8cf8a", "&": "#b89a58", "!": "#d02a5a",
  // the dog, a caramelo: caramel, its shade, cream
  "%": "#cf8a3e", "$": "#97582a", "+": "#f0cf98",
})

const W = 320, H = 180, FPS = 10, FRAMES = 240
const P = perspective({ w: W, horizon: 70, eye: 1.6, fov: 90, yaw: 40 })
// the eye stands at (CX, CZ) in the park; world positions are in meters from the park's corner
const CX = 2.2, CZ = 2.6, SIN = Math.sin((P.yaw * Math.PI) / 180), COS = Math.cos((P.yaw * Math.PI) / 180)
const at = (x, z, u = 0) => P.ground(x - CX, z - CZ, u).map(Math.round)
const ahead = (x, z) => (x - CX) * SIN + (z - CZ) * COS             // depth from the eye: what's farther is drawn first
// the sun at two in the afternoon: 55 degrees up, from the left and a little ahead. A point u m up
// throws its shadow (u * SOX, u * SOZ) along the ground: short, to the right and toward us.
const SUN_FROM = [-0.894, 0.447], LONG = 1 / Math.tan((55 * Math.PI) / 180), SOX = -SUN_FROM[0] * LONG, SOZ = -SUN_FROM[1] * LONG
const facesSun = (nx, nz) => nx * SUN_FROM[0] + nz * SUN_FROM[1] > 0
const LIGHT = [-0.8, -1]                                           // on screen: from the upper left
const hash = (i, j) => { let k = Math.imul(i, 374761393) + Math.imul(j, 668265263); k = Math.imul(k ^ (k >>> 13), 1274126177); return ((k ^ (k >>> 16)) >>> 0) / 4294967296 }

// ================================================================ ground
const PATH_A = [6.4, 8.6], PATH_B = [5.2, 7.4], PLAZA = [4.4, 5.6, 8.2, 9.4], SAND = [10, 11, 23, 21]
const inRect = (x, z, [x0, z0, x1, z1]) => x >= x0 && x <= x1 && z >= z0 && z <= z1
const paved = (x, z) => (z >= PATH_A[0] && z <= PATH_A[1]) || (x >= PATH_B[0] && x <= PATH_B[1]) || inRect(x, z, PLAZA)
function ground(x, z) {
  if (ahead(x, z) > 140) return "e"
  if (paved(x, z)) return "f"
  if (inRect(x, z, SAND)) return "i"
  if (ahead(x, z) > 70) return "e"
  return (Math.floor(x / 2.5) & 1) ? "a" : "b"                     // mowing stripes, along z: they run to the left point
}
// a level line on the ground (or u m up), cut where it would pass behind the eye
function seg(c, x0, z0, x1, z1, u, key) {
  const a = ahead(x0, z0), b = ahead(x1, z1), near = 0.6
  if (a < near && b < near) return
  const t = (near - a) / (b - a)
  if (a < near) [x0, z0] = [x0 + (x1 - x0) * t, z0 + (z1 - z0) * t]
  else if (b < near) [x1, z1] = [x0 + (x1 - x0) * t, z0 + (z1 - z0) * t]
  c.line(...at(x0, z0, u), ...at(x1, z1, u), key)
}
// curbs along the paths, slab joints where they're near enough to be more than a stripe
function paving(c) {
  for (const z of PATH_A) seg(c, -30, z, 90, z, 0, "g")
  for (const x of PATH_B) seg(c, x, -30, x, 90, 0, "g")
  for (let x = -6; x < 36; x += 1.5) if (!(x > PLAZA[0] && x < PLAZA[2])) seg(c, x, PATH_A[0], x, PATH_A[1], 0, "g")
  for (let z = -2; z < 34; z += 1.5) if (!(z > PLAZA[1] && z < PLAZA[3])) seg(c, PATH_B[0], z, PATH_B[1], z, 0, "g")
  const [x0, z0, x1, z1] = PLAZA
  for (const [a, b, cc, d] of [[x0, z0, x1, z0], [x1, z0, x1, z1], [x1, z1, x0, z1], [x0, z1, x0, z0]]) seg(c, a, b, cc, d, 0, "h")
  for (let x = x0 + 1.27; x < x1 - 0.1; x += 1.27) seg(c, x, z0, x, z1, 0, "g")
  for (let z = z0 + 1.27; z < z1 - 0.1; z += 1.27) seg(c, x0, z, x1, z, 0, "g")
}

// ================================================================ shapes
// Everything is made of three shapes in meters: sticks { a: [x, z, u], b, half, key } (round: trunks,
// limbs, poles, bars), blobs { e: [x, z, u], rx, ry, key } (crowns, heads, wheels) and boxes
// { box: [x0, z0, x1, z1, u0, u1], keys: { top, lit, shade } }. The same shapes draw a thing and cast
// its shadow.
const stick = (a, b, half, key) => ({ a, b, half, key })
const blob = (e, rx, ry, key, extra) => ({ e, rx, ry, key, ...extra })
const box = (b, keys, extra) => ({ box: b, keys, ...extra })
// and cones { cone: [a, ra, b, rb], key }: a round shape tapering from a to b (a torso, a skirt, a bin),
// drawn as the hull of its two end rings, so it has the right outline from any side
const cone = (a, ra, b, rb, key, extra) => ({ cone: [a, ra, b, rb], key, ...extra })
const rings = ([a, ra, b, rb], f) => [a, b].flatMap(([x, z, u], k) => Array.from({ length: 10 }, (_, i) => {
  const t = (i / 10) * Math.PI * 2, r = k ? rb : ra
  return f(x + Math.cos(t) * r, z + Math.sin(t) * r, u)
}))

// a box's faces the eye can see; a face turned to the sun is lit
function faces(b) {
  const [x0, z0, x1, z1, u0, u1] = b, out = [], q = (pts) => pts.flatMap(([x, z, u]) => at(x, z, u))
  if (P.eye > u1) out.push(["top", q([[x0, z0, u1], [x1, z0, u1], [x1, z1, u1], [x0, z1, u1]]), null])
  if (P.eye < u0) out.push(["under", q([[x0, z0, u0], [x1, z0, u0], [x1, z1, u0], [x0, z1, u0]]), null])
  if (x0 > CX) out.push([facesSun(-1, 0) ? "lit" : "shade", q([[x0, z0, u0], [x0, z1, u0], [x0, z1, u1], [x0, z0, u1]]), "-x"])
  if (x1 < CX) out.push([facesSun(1, 0) ? "lit" : "shade", q([[x1, z0, u0], [x1, z1, u0], [x1, z1, u1], [x1, z0, u1]]), "+x"])
  if (z0 > CZ) out.push([facesSun(0, -1) ? "lit" : "shade", q([[x0, z0, u0], [x1, z0, u0], [x1, z0, u1], [x0, z0, u1]]), "-z"])
  if (z1 < CZ) out.push([facesSun(0, 1) ? "lit" : "shade", q([[x0, z1, u0], [x1, z1, u0], [x1, z1, u1], [x0, z1, u1]]), "+z"])
  return out
}
const mid = (q) => (q.box ? [(q.box[0] + q.box[2]) / 2, (q.box[1] + q.box[3]) / 2] : q.e ? q.e : q.cone ? [(q.cone[0][0] + q.cone[2][0]) / 2, (q.cone[0][1] + q.cone[2][1]) / 2]
  : q.poly ? [q.poly.reduce((s, p) => s + p[0], 0) / q.poly.length, q.poly.reduce((s, p) => s + p[1], 0) / q.poly.length] : [(q.a[0] + q.b[0]) / 2, (q.a[1] + q.b[1]) / 2])
const depthOf = (q) => ahead(...mid(q)) - (q.top ?? 0) * 0.02

// draw shapes far to near; `ramps` light them on a plate when they're big enough to show it
function drawShapes(c, shapes, ramps) {
  const go = () => {
    for (const q of [...shapes].sort((m, n) => depthOf(n) - depthOf(m))) {
      if (q.ghost) continue
      if (q.box) { for (const [kind, pts] of faces(q.box)) c.poly(pts, q.keys[kind] ?? q.keys.shade); continue }
      if (q.cone) { c.poly(hull(rings(q.cone, (x, z, u) => P.ground(x - CX, z - CZ, u))).flat().map(Math.round), q.key); continue }
      if (q.poly) { c.poly(q.poly.flatMap((p) => at(...p)), q.key); continue }
      const s = P.scale(q.e ? ahead(q.e[0], q.e[1]) : ahead((q.a[0] + q.b[0]) / 2, (q.a[1] + q.b[1]) / 2))
      if (q.e) c.ellipse(...at(...q.e), Math.max(0, Math.round(q.rx * s)), Math.max(0, Math.round(q.ry * s)), q.key)
      else c.line(...at(...q.a), ...at(...q.b), q.key, Math.max(1, Math.round(2 * q.half * s)))
    }
  }
  ramps ? c.plate(go, { light: LIGHT, ramps }) : go()
}

// ---------------------------------------------------------------- shadows
// Each shape swept onto the ground away from the sun, in steps under a pixel; boxes by the hull of
// their corners. Pixels go into a set, so where shadows overlap the ground is no darker than in one.
// A blob with `dapple` lets light through (a crown's shade with sun flecks in it).
function hull(pts) {
  pts = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], hi = []
  for (const p of pts) { while (lo.length > 1 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p) }
  for (const p of pts.reverse()) { while (hi.length > 1 && cross(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop(); hi.push(p) }
  return lo.slice(0, -1).concat(hi.slice(0, -1))
}
function fillGround(out, poly, dapple) {
  if (poly.some(([x, z]) => ahead(x, z) < 0.4)) return
  const sp = poly.map(([x, z]) => P.ground(x - CX, z - CZ))
  const xs = sp.map((p) => p[0]), ys = sp.map((p) => p[1])
  for (let y = Math.max(Math.ceil(P.horizon) + 1, Math.floor(Math.min(...ys))); y <= Math.min(H - 1, Math.ceil(Math.max(...ys))); y++)
    for (let x = Math.max(0, Math.floor(Math.min(...xs))); x <= Math.min(W - 1, Math.ceil(Math.max(...xs))); x++) {
      let inside = false
      for (let i = 0, j = sp.length - 1; i < sp.length; j = i++) {
        const [xi, yi] = sp[i], [xj, yj] = sp[j]
        if (yi > y + 0.5 !== yj > y + 0.5 && x + 0.5 < ((xj - xi) * (y + 0.5 - yi)) / (yj - yi) + xi) inside = !inside
      }
      if (inside && !(dapple && hash(x * 7 + y, y * 13 - x) > dapple)) out.add(y * W + x)
    }
}
function cast(out, shapes) {
  for (const q of shapes) {
    if (q.noShadow) continue
    if (q.poly) { fillGround(out, hull(q.poly.map(([x, z, u]) => [x + u * SOX, z + u * SOZ]))); continue }
    if (q.cone) { fillGround(out, hull(rings(q.cone, (x, z, u) => [x + u * SOX, z + u * SOZ]))); continue }
    if (q.umbrella) {
      const [x, z, u, rad] = q.umbrella, ring = []
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; ring.push([x + Math.cos(a) * rad + u * SOX, z + Math.sin(a) * rad + u * SOZ]) }
      fillGround(out, hull(ring))
      continue
    }
    if (q.box) {
      const [x0, z0, x1, z1, u0, u1] = q.box, pts = []
      for (const x of [x0, x1]) for (const z of [z0, z1]) for (const u of [u0, u1]) pts.push([x + u * SOX, z + u * SOZ])
      fillGround(out, hull(pts))
      continue
    }
    if (q.e) {
      // an ellipsoid's shadow: points over its surface swept onto the ground, and their hull
      const pts = []
      for (let i = 0; i < 12; i++) for (let j = -2; j <= 2; j++) {
        const a = (i / 12) * Math.PI * 2, b = (j / 2) * (Math.PI / 2), u = q.e[2] + Math.sin(b) * q.ry
        pts.push([q.e[0] + Math.cos(b) * Math.cos(a) * q.rx + u * SOX, q.e[1] + Math.cos(b) * Math.sin(a) * q.rx + u * SOZ])
      }
      fillGround(out, hull(pts), q.dapple)
      continue
    }
    if (q.half < 0.012) continue
    const [ax, az, au] = q.a, [bx, bz, bu] = q.b, A = [ax + au * SOX, az + au * SOZ], B = [bx + bu * SOX, bz + bu * SOZ]
    const dx = B[0] - A[0], dz = B[1] - A[1], len = Math.hypot(dx, dz) || 1, nx = (-dz / len) * q.half, nz = (dx / len) * q.half
    fillGround(out, len < 0.02 ? [[A[0] - q.half, A[1] - q.half], [A[0] + q.half, A[1] - q.half], [A[0] + q.half, A[1] + q.half], [A[0] - q.half, A[1] + q.half]] : [[A[0] + nx, A[1] + nz], [B[0] + nx, B[1] + nz], [B[0] - nx, B[1] - nz], [A[0] - nx, A[1] - nz]])
  }
}
// what each ground color turns into in shade
const SHADE = { a: "c", b: "d", e: "c", f: "h", g: "h", i: "j", k: "l", m: "l", t: "s", u: "t" }
const darken = (c, out) => { for (const i of out) { const x = i % W, y = (i - x) / W, d = SHADE[c.key(x, y)]; if (d) c.px(x, y, d) } }

// ================================================================ things
// trees: a trunk forking into branches under a crown of leafy puffs; the ipê in yellow bloom
function tree(x, z, { tall = 7, crown = 2.6, ipe = false, seed = 1 } = {}) {
  const r = rng(seed), keys = ipe ? ["t", "s"] : ["p", "o"], shapes = [stick([x, z, 0], [x + 0.1, z, tall * 0.45], 0.18 + tall * 0.012, "m")]
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + r(), bx = x + Math.cos(a) * crown * 0.6, bz = z + Math.sin(a) * crown * 0.4
    shapes.push(stick([x + 0.1, z, tall * 0.42], [bx, bz, tall * 0.7], 0.07, "m"))
  }
  for (let i = 0; i < 11; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * crown * 0.75, rx = crown * (0.4 + r() * 0.25)
    shapes.push(blob([x + Math.cos(a) * d, z + Math.sin(a) * d * 0.7, tall * 0.72 + (r() - 0.4) * crown * 0.7], rx, rx * 0.8, keys[0], { leaves: true }))
  }
  // the crown as one mass for its shadow: shade with sun flecks
  shapes.push(blob([x, z, tall * 0.74], crown * 1.05, crown * 0.75, "p", { ghost: true, dapple: 0.82 }))
  for (const q of shapes) if (q.e && !q.ghost) q.noShadow = true
  return { d: ahead(x, z), shapes, ramps: ipe ? ["lmn", "stu"] : ["lmn", "opqr"], ipe, x, z, crown, tall, seed }
}
// a park bench: slats on two iron legs, a backrest; `along` the axis it runs on, facing `+1` or `-1`
function bench(x, z, along, face) {
  const L = 1.8, Dp = 0.45, key = { top: "n", lit: "m", shade: "l" }, iron = "0", sh = []
  const span = (a0, a1, b0, b1, u0, u1, k = key) => sh.push(box(along === "x" ? [a0, b0, a1, b1, u0, u1] : [b0, a0, b1, a1, u0, u1], k))
  const [c0, c1] = along === "x" ? [x - L / 2, x + L / 2] : [z - L / 2, z + L / 2], n = along === "x" ? z : x
  span(c0, c1, n - Dp / 2, n + Dp / 2, 0.42, 0.47)                                  // the seat
  const back = n - face * Dp / 2
  span(c0, c1, Math.min(back, back - face * 0.05), Math.max(back, back - face * 0.05), 0.55, 0.85)   // the backrest
  for (const cc of [c0 + 0.15, c1 - 0.15]) {
    const p = (a, b, u) => (along === "x" ? [cc, b, u] : [b, cc, u])
    sh.push(stick(p(0, n - Dp / 2, 0), p(0, n - Dp / 2, 0.45), 0.03, iron), stick(p(0, n + Dp / 2, 0), p(0, n + Dp / 2, 0.45), 0.03, iron), stick(p(0, back, 0.45), p(0, back, 0.85), 0.025, iron))
  }
  return { d: ahead(x, z), shapes: sh }
}
// a lamp post: a slim dark-green pole, a lantern
function lamp(x, z) {
  return { d: ahead(x, z), shapes: [stick([x, z, 0], [x, z, 3.4], 0.05, "4"), stick([x, z, 0], [x, z, 0.3], 0.09, "0"), blob([x, z, 3.55], 0.16, 0.2, "2"), stick([x, z, 3.75], [x, z, 3.8], 0.12, "4")] }
}
const bin = (x, z) => ({ d: ahead(x, z), shapes: [stick([x, z, 0], [x, z, 0.8], 0.22, "V"), stick([x, z, 0.8], [x, z, 0.86], 0.24, "W")] })
// hedges: boxes of trimmed bush, in short lengths so whoever walks behind one is drawn behind it
function hedge(x0, z0, x1, z1, tall) {
  const out = [], along = x1 - x0 > z1 - z0, n = Math.ceil((along ? x1 - x0 : z1 - z0) / 1.5)
  for (let i = 0; i < n; i++) {
    const a = i / n, b = (i + 1) / n, bx = along ? [x0 + (x1 - x0) * a, z0, x0 + (x1 - x0) * b, z1] : [x0, z0 + (z1 - z0) * a, x1, z0 + (z1 - z0) * b]
    out.push({ d: ahead((bx[0] + bx[2]) / 2, (bx[1] + bx[3]) / 2), shapes: [box([...bx, 0, tall], { top: "q", lit: "p", shade: "o" })], leafy: true })
  }
  return out
}
// the playground, each piece in its colors
function slide(x, z) {
  const sh = [], blue = { top: "w", lit: "w", shade: "v" }, X = x + 0.9, Z = z + 0.9
  for (const [px, pz] of [[x, z], [X, z], [X, Z], [x, Z]]) sh.push(stick([px, pz, 0], [px, pz, 2.2], 0.04, "v"))
  sh.push(box([x, z, X, Z, 1.45, 1.55], { top: "Z", lit: "Z", shade: "z", under: "z" }))
  for (const pz of [z, Z]) sh.push(stick([x, pz, 2.0], [X, pz, 2.0], 0.03, "y"))
  sh.push(stick([X, z, 2.2], [X, Z, 2.2], 0.03, "y"), stick([x, z, 2.2], [X, z, 2.2], 0.03, "y"))
  // the ladder up the left side, the chute down to the right
  for (const pz of [z + 0.2, Z - 0.2]) sh.push(stick([x - 0.7, pz, 0], [x, pz, 1.5], 0.03, "v"))
  for (let u = 0.3; u < 1.5; u += 0.3) sh.push(stick([x - 0.7 + (0.7 * u) / 1.5, z + 0.2, u], [x - 0.7 + (0.7 * u) / 1.5, Z - 0.2, u], 0.02, "w"))
  const chute = [[X, z + 0.15, 1.5], [X + 2.4, z + 0.15, 0.35], [X + 2.4, Z - 0.15, 0.35], [X, Z - 0.15, 1.5]]
  sh.push({ poly: chute, key: "y", top: 1 })
  for (const pz of [z + 0.15, Z - 0.15]) sh.push(stick([X, pz, 1.65], [X + 2.4, pz, 0.5], 0.035, "x"))
  return { d: ahead(x + 1, z + 0.4), shapes: sh, ramps: ["vw", "xy", "zZ"] }
}
function swings(x, z) {
  const sh = [], L = 3.6, top = 2.4
  for (const px of [x, x + L]) for (const sd of [-1, 1]) sh.push(stick([px, z + sd * 0.8, 0], [px, z, top], 0.05, "y"))
  sh.push(stick([x, z, top], [x + L, z, top], 0.05, "x"))
  // the second seat, empty and still
  for (const sd of [-1, 1]) sh.push(stick([x + 2.6 + sd * 0.22, z, top], [x + 2.6 + sd * 0.22, z, 0.5], 0.01, "3"))
  sh.push(box([x + 2.35, z - 0.12, x + 2.85, z + 0.12, 0.44, 0.5], { top: "Z", lit: "Z", shade: "z" }))
  return { d: ahead(x + L / 2, z), shapes: sh, ramps: ["xy", "zZ"] }
}
function seesaw(x, z) {
  return { d: ahead(x, z), shapes: [box([x - 0.15, z - 0.15, x + 0.15, z + 0.15, 0, 0.45], { top: "w", lit: "w", shade: "v" }),
    stick([x - 1.4, z, 0.15], [x + 1.4, z, 0.75], 0.08, "Z"), stick([x - 1.15, z, 0.2], [x - 1.15, z, 0.45], 0.025, "y"), stick([x + 1.15, z, 0.68], [x + 1.15, z, 0.95], 0.025, "y")], ramps: ["vw", "zZ", "xy"] }
}
function climber(x, z) {
  const sh = [], n = 3, d = 0.8
  for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) {
    sh.push(stick([x + i * d, z + j * d, 0], [x + i * d, z + j * d, n * d], 0.03, (i + j) % 2 ? "w" : "y"))
    for (let k = 1; k <= n; k++) {
      if (i < n) sh.push(stick([x + i * d, z + j * d, k * d], [x + (i + 1) * d, z + j * d, k * d], 0.025, "w"))
      if (j < n) sh.push(stick([x + i * d, z + j * d, k * d], [x + i * d, z + (j + 1) * d, k * d], 0.025, "y"))
    }
  }
  return { d: ahead(x + 1.2, z + 1.2), shapes: sh, ramps: ["vw", "xy"] }
}
// the sand pit's low wooden curb
function curb() {
  const [x0, z0, x1, z1] = SAND, k = { top: "n", lit: "m", shade: "l" }, t = 0.15, out = []
  for (let x = x0; x < x1; x += 2.6) for (const zz of [z0, z1]) out.push({ d: ahead(x + 1.3, zz), shapes: [box([x, zz - t, Math.min(x + 2.6, x1), zz, 0, 0.2], k)] })
  for (let zz = z0; zz < z1; zz += 2.5) for (const xx of [x0, x1]) out.push({ d: ahead(xx, zz + 1.25), shapes: [box([xx, zz, xx + t, Math.min(zz + 2.5, z1), 0, 0.2], k)] })
  return out
}
// the ice-cream cart: a white box on two wheels with a push bar, a striped umbrella seen from under
function cart(x, z) {
  const sh = [box([x, z, x + 1.2, z + 0.7, 0.35, 1.05], { top: "2", lit: "1", shade: "2" }), box([x - 0.01, z - 0.01, x + 1.21, z + 0.71, 0.75, 0.86], { top: "w", lit: "w", shade: "v" }, { top: 1 })]
  for (const px of [x + 0.2, x + 1.0]) sh.push(blob([px, z - 0.04, 0.2], 0.06, 0.2, "0", { top: 2 }), blob([px, z - 0.05, 0.2], 0.025, 0.05, "3", { top: 3 }))
  sh.push(stick([x + 1.2, z + 0.15, 0.9], [x + 1.55, z + 0.15, 1.0], 0.02, "3"), stick([x + 1.2, z + 0.55, 0.9], [x + 1.55, z + 0.55, 1.0], 0.02, "3"), stick([x + 1.55, z + 0.15, 1.0], [x + 1.55, z + 0.55, 1.0], 0.025, "0"))
  sh.push(stick([x + 0.6, z + 0.35, 1.05], [x + 0.6, z + 0.35, 2.25], 0.02, "3"))
  sh.push({ umbrella: [x + 0.6, z + 0.35, 2.0, 0.95, 2.3] })
  return { d: ahead(x + 0.6, z + 0.35), shapes: sh, ramps: ["21", "vw"] }
}
function umbrella(c, [x, z, u, rad, apex]) {
  const n = 12, ring = []
  for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI * 2; ring.push(at(x + Math.cos(a) * rad, z + Math.sin(a) * rad, u)) }
  const top = at(x, z, apex)
  for (let i = 0; i < n; i++) c.poly([...top, ...ring[i], ...ring[i + 1]], i % 2 ? "1" : "y")
  for (let i = 0; i < n; i++) c.line(...ring[i], ...ring[i + 1], i % 2 ? "2" : "x")
}

// ================================================================ people and the dog
// A body in meters, posed by a gait computed in 3D (feet, knees by two-bone IK, arms against the
// legs, bob and lean), placed at (x, z) facing `heading` and turned into shapes, so it looks right
// from any angle the paths give it, at any distance, and casts its own shadow.
const KID = { hip: 0.62, thigh: 0.3, shin: 0.3, torso: 0.36, shoulder: 0.13, hipw: 0.075, arm: 0.2, fore: 0.18, head: 0.115, neck: 0.13, limb: 0.045, body: 0.1 }
const WOMAN = { hip: 0.86, thigh: 0.42, shin: 0.42, torso: 0.5, shoulder: 0.17, hipw: 0.09, arm: 0.28, fore: 0.25, head: 0.105, neck: 0.15, limb: 0.038, body: 0.115 }
const MAN = { ...WOMAN, hip: 0.9, thigh: 0.44, shin: 0.44, torso: 0.54, shoulder: 0.2, body: 0.14, head: 0.11 }
const GAITS = {
  run: { reach: 0.42, lift: 0.55, bob: 0.035, lean: 0.12, swing: 0.95, elbow: 1.5 },
  walk: { reach: 0.3, lift: 0.12, bob: 0.018, lean: 0.02, swing: 0.4, elbow: 0.35 },
  stand: { reach: 0, lift: 0, bob: 0, lean: 0, swing: 0, elbow: 0.25 },
}
function person(b, { x, z, heading: [hx, hz], phase, gait, look, hat, tail, wave = 0 }) {
  const g = GAITS[gait], th = phase * Math.PI * 2, L = b.thigh + b.shin, sh = []
  const w3 = (f, r, u) => [x + f * hx + r * hz, z + f * hz - r * hx, u]
  const hipU = b.hip + g.bob * Math.cos(2 * th) - (gait === "run" ? 0.04 : 0)
  for (const sd of [-1, 1]) {
    const t = th + (sd > 0 ? Math.PI : 0), ff = g.reach * L * Math.cos(t), lift = g.lift * L * Math.max(0, -Math.sin(t))
    const du = lift - hipU, d = Math.min(Math.hypot(ff, du), L - 0.002), ka = Math.atan2(du, ff) + Math.acos((b.thigh ** 2 + d * d - b.shin ** 2) / (2 * b.thigh * d))
    const hip = w3(0, sd * b.hipw, hipU), knee = w3(Math.cos(ka) * b.thigh, sd * b.hipw, hipU + Math.sin(ka) * b.thigh), ankle = w3(ff, sd * b.hipw, lift + 0.05)
    sh.push(stick(hip, knee, b.limb * 1.25, look.thigh), stick(knee, ankle, b.limb, look.shin), stick(ankle, w3(ff + 0.12, sd * b.hipw, lift + 0.03), b.limb * 0.9, look.shoe))
    // the arm on this side swings with the other leg
    const top = hipU + b.torso, swing = g.swing * Math.cos(t + Math.PI) + (sd > 0 ? wave : 0), bend = g.elbow + (sd > 0 ? wave * 0.6 : 0)
    const shoulder = w3(g.lean, sd * b.shoulder, top), elbow = w3(g.lean + Math.sin(swing) * b.arm, sd * (b.shoulder + 0.02), top - Math.cos(swing) * b.arm)
    const hand = w3(g.lean + Math.sin(swing) * b.arm + Math.sin(swing + bend) * b.fore, sd * (b.shoulder + 0.03), top - Math.cos(swing) * b.arm - Math.cos(swing + bend) * b.fore)
    const cuff = [shoulder[0] + (elbow[0] - shoulder[0]) * 0.55, shoulder[1] + (elbow[1] - shoulder[1]) * 0.55, shoulder[2] + (elbow[2] - shoulder[2]) * 0.55]
    sh.push(stick(shoulder, cuff, b.limb * 1.2, look.shirt), stick(cuff, elbow, b.limb, look.skin), stick(elbow, hand, b.limb * 0.9, look.skin))
    if (sd > 0) sh.hand = hand
  }
  const top = hipU + b.torso
  sh.push(cone(w3(0, 0, hipU + 0.04), b.body * 0.8, w3(g.lean * 0.9, 0, top - 0.07), b.body * 1.15, look.shirt),
    stick(w3(g.lean, -b.shoulder, top - 0.03), w3(g.lean, b.shoulder, top - 0.03), b.limb * 1.3, look.shirt))
  if (look.skirt) sh.push(cone(w3(0, 0, hipU + 0.07), b.body * 0.85, w3(0.04 * Math.cos(2 * th), 0, hipU - 0.36), b.body * 2.1, look.skirt, { top: 1 }))
  else sh.push(cone(w3(0, 0, hipU - 0.1), b.hipw + b.limb * 1.1, w3(0, 0, hipU + 0.06), b.body * 0.85, look.waist ?? look.shirt))
  const head = w3(g.lean * 1.2, 0, top + b.neck), back = (k) => w3(g.lean * 1.2 - k * b.head, 0, top + b.neck + 0.35 * b.head)
  sh.push(stick(w3(g.lean, 0, top - 0.02), head, b.limb * 0.9, look.skin), blob(head, b.head, b.head * 1.08, look.skin, { top: 2 }), blob(back(0.35), b.head * 0.95, b.head * 0.8, look.hair, { top: 3 }))
  if (tail) sh.push(stick(back(0.8), w3(g.lean * 1.2 - b.head * 1.6, Math.sin(th * 2) * 0.04, top + b.neck - 0.12), 0.035, look.hair))
  if (hat) sh.push(blob(w3(g.lean * 1.2, 0, top + b.neck + b.head * 0.7), b.head * 2.1, b.head * 0.35, look.hat, { top: 4 }), blob(w3(g.lean * 1.2, 0, top + b.neck + b.head * 1.1), b.head * 1.05, b.head * 0.55, look.hat, { top: 5 }))
  return sh
}
// the dog, trotting: diagonal legs together, the tail up and wagging
function dog({ x, z, heading: [hx, hz], phase }) {
  const th = phase * Math.PI * 2, w3 = (f, r, u) => [x + f * hx + r * hz, z + f * hz - r * hx, u], sh = []
  for (const [f, sd, off] of [[0.22, -1, 0], [0.22, 1, 0.5], [-0.27, -1, 0.5], [-0.27, 1, 0]]) {
    const t = th + off * Math.PI * 2, ff = 0.13 * Math.cos(t), lift = 0.08 * Math.max(0, -Math.sin(t))
    sh.push(stick(w3(f, sd * 0.08, 0.4), w3(f + ff * 0.5 - (f < 0 ? 0.04 : 0), sd * 0.08, 0.2 + lift * 0.5), 0.045, f < 0 ? "$" : "%"), stick(w3(f + ff * 0.5 - (f < 0 ? 0.04 : 0), sd * 0.08, 0.2 + lift * 0.5), w3(f + ff, sd * 0.08, lift + 0.02), 0.035, "%"))
  }
  const bob = 0.015 * Math.cos(th * 2)
  sh.push(stick(w3(-0.3, 0, 0.44 + bob), w3(0.24, 0, 0.47 + bob), 0.11, "%"), blob(w3(0.24, 0, 0.42 + bob), 0.12, 0.13, "+"),
    stick(w3(0.26, 0, 0.5 + bob), w3(0.42, 0, 0.64 + bob), 0.06, "%"), blob(w3(0.45, 0, 0.66 + bob), 0.1, 0.09, "%", { top: 2 }),
    stick(w3(0.5, 0, 0.64 + bob), w3(0.62, 0, 0.6 + bob), 0.045, "+", { top: 3 }))
  for (const sd of [-1, 1]) sh.push(stick(w3(0.42, sd * 0.06, 0.72 + bob), w3(0.4, sd * 0.08, 0.82 + bob), 0.025, "$", { top: 3 }))
  sh.push(stick(w3(-0.3, 0, 0.5 + bob), w3(-0.42, 0.06 * Math.sin(th * 4), 0.74 + bob), 0.03, "%"))
  sh.collar = w3(0.36, 0, 0.6 + bob)
  return sh
}
const LOOKS = {
  runner: { skin: "7", shirt: "y", thigh: "U", waist: "U", shin: "7", shoe: "1", hair: "9" },
  chaser: { skin: "6", shirt: "Z", thigh: "V", waist: "V", shin: "6", shoe: "1", hair: "8" },
  swinger: { skin: "5", shirt: "!", thigh: "!", waist: "!", shin: "5", shoe: "U", hair: "8" },
  woman: { skin: "6", shirt: "X", skirt: "X", thigh: "6", shin: "6", shoe: "Y", hair: "9", hat: "@", sleeve: "6" },
  vendor: { skin: "8", shirt: "1", waist: "1", thigh: "1", shin: "1", shoe: "0", hair: "9", hat: "y", sleeve: "1" },
}
const BODY_RAMPS = ["xy", "zZ", "0U", "WV", "YX", "&@", "876", "765", "65", "21", "$%+"]

// ---------------------------------------------------------------- where they go
// Tag: the runner comes down path B from behind the far hedge, turns at the crossing and runs off up
// path A; the chaser follows the same line a little faster, 1.3 s behind. A route is a list of
// [x, z] points with the corner rounded; s meters along it gives a position and a heading.
function route(pts, r) {
  const segs = []
  // round each corner with an arc of radius r
  const [p0, p1, p2] = pts, d0 = [Math.sign(p1[0] - p0[0]), Math.sign(p1[1] - p0[1])], d1 = [Math.sign(p2[0] - p1[0]), Math.sign(p2[1] - p1[1])]
  const a = [p1[0] - d0[0] * r, p1[1] - d0[1] * r], b = [p1[0] + d1[0] * r, p1[1] + d1[1] * r], c = [a[0] + d1[0] * r, a[1] + d1[1] * r]
  const l0 = Math.hypot(a[0] - p0[0], a[1] - p0[1]), arc = (Math.PI / 2) * r, l2 = Math.hypot(p2[0] - b[0], p2[1] - b[1])
  return (s) => {
    if (s < l0) return { x: p0[0] + d0[0] * s, z: p0[1] + d0[1] * s, heading: d0 }
    if (s < l0 + arc) {
      const t = (s - l0) / arc, a0 = Math.atan2(a[1] - c[1], a[0] - c[0]), a1 = Math.atan2(b[1] - c[1], b[0] - c[0])
      let da = a1 - a0; if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI
      const ang = a0 + da * t, hd = [d0[0] + (d1[0] - d0[0]) * t, d0[1] + (d1[1] - d0[1]) * t], n = Math.hypot(...hd)
      return { x: c[0] + Math.cos(ang) * r, z: c[1] + Math.sin(ang) * r, heading: [hd[0] / n, hd[1] / n] }
    }
    const s2 = s - l0 - arc
    return { x: b[0] + d1[0] * s2, z: b[1] + d1[1] * s2, heading: d1 }
  }
}
const TAG = route([[6.75, 46], [6.75, 7.5], [80, 7.5]], 1.2)
const RUN_CYCLE = 6                                                  // frames a stride: 0.6 s, 40 to the loop
function figures(frame) {
  const t = frame / FPS, out = []
  for (const [who, speed, delay] of [["runner", 3.4, 0], ["chaser", 3.55, 1.3]]) {
    const s = speed * (t - delay), p = TAG(s), ph = ((frame + (who === "chaser" ? 3 : 0)) % RUN_CYCLE) / RUN_CYCLE
    out.push({ d: ahead(p.x, p.z), shapes: person(KID, { ...p, phase: ph, gait: "run", look: LOOKS[who] }) })
  }
  // the woman, 1.46 m/s up path B, a stride a second; the dog trotting ahead on its leash
  const zw = 0.2 + 1.46 * t, wp = { x: 5.75, z: zw, heading: [0, 1] }
  const woman = person(WOMAN, { ...wp, phase: (frame % 10) / 10, gait: "walk", look: LOOKS.woman, hat: true, tail: true })
  const pup = dog({ x: 6.45, z: zw + 1.5, heading: [0, 1], phase: (frame % 5) / 5 })
  const [hx, hy] = at(...woman.hand), [cx, cy] = at(...pup.collar)
  out.push({ d: ahead(5.75, zw), shapes: woman, leash: [hx, hy, cx, cy] }, { d: ahead(6.45, zw + 1.5), shapes: pup })
  // pigeons pecking on the path, each to its own beat
  for (const [px, pz, dir, off] of [[3.5, 7.0, 0.6, 0], [4.0, 7.9, 2.4, 5], [3.1, 8.2, 4.0, 9]]) {
    const peck = (frame + off) % 14 < 4, hx = Math.cos(dir), hz = Math.sin(dir), w3 = (f, r, u) => [px + f * hx + r * hz, pz + f * hz - r * hx, u]
    out.push({ d: ahead(px, pz), shapes: [blob(w3(0, 0, 0.12), 0.1, 0.07, "3"), stick(w3(-0.08, 0, 0.13), w3(-0.2, 0, 0.11), 0.035, "4"),
      blob(peck ? w3(0.14, 0, 0.05) : w3(0.11, 0, 0.2), 0.045, 0.045, "4", { top: 2 }), stick(w3(0.02, 0, 0.06), w3(0.02, 0, 0), 0.01, "!")] })
  }
  // the vendor by his cart, ringing his bell now and then
  const ring = frame % 60 < 8 ? Math.abs(Math.sin((frame % 60) * 1.2)) * 1.2 : 0
  out.push({ d: ahead(14.5, 4.85), shapes: person(MAN, { x: 14.5, z: 4.85, heading: [-0.9, -0.44], phase: 0, gait: "stand", look: LOOKS.vendor, hat: true, wave: ring }) })
  // a girl on the swing: a pendulum, 2.4 s a swing, her legs kicking out on the way forward
  const ang = 0.55 * Math.sin((frame / 24) * Math.PI * 2), sx = 11 + 0.9, sz = 12.8, Lc = 1.9, top = 2.4
  const seat = [sx, sz - Math.sin(ang) * Lc, top - Math.cos(ang) * Lc], sw = []
  for (const sd of [-1, 1]) sw.push(stick([sx + sd * 0.22, sz, top], [sx + sd * 0.22, seat[1], seat[2] + 0.05], 0.01, "3"))
  sw.push(box([sx - 0.25, seat[1] - 0.12, sx + 0.25, seat[1] + 0.12, seat[2] - 0.03, seat[2] + 0.03], { top: "Z", lit: "Z", shade: "z" }))
  const hip = [sx, seat[1], seat[2] + 0.08], fwd = [Math.sin(ang - 0.15), Math.cos(ang - 0.15)], kick = 0.9 * Math.sin((frame / 24) * Math.PI * 2 + 0.6)
  const knee = [sx, hip[1] - fwd[1] * 0.0 - 0.3 * Math.cos(ang), hip[2] + 0.3 * Math.sin(ang) * 0.6]
  for (const sd of [-0.08, 0.08]) {
    const k = [sx + sd, knee[1], knee[2]], foot = [sx + sd, k[1] - 0.28 * Math.sin(0.4 + kick * 0.5 + ang), k[2] - 0.28 * Math.cos(0.4 + kick * 0.5 + ang)]
    sw.push(stick([sx + sd, hip[1], hip[2]], k, 0.055, "!"), stick(k, foot, 0.045, "5"), stick(foot, [foot[0], foot[1] - 0.08, foot[2]], 0.04, "U"))
  }
  const sho = [sx, hip[1] + Math.sin(ang) * 0.1 + 0.08, hip[2] + 0.36], headc = [sx, sho[1] + 0.05, sho[2] + 0.2]
  sw.push(stick(hip, sho, 0.1, "!"), blob(headc, 0.115, 0.125, "5", { top: 2 }), blob([sx, headc[1] + 0.04, headc[2] + 0.04], 0.11, 0.09, "8", { top: 3 }))
  for (const sd of [-1, 1]) sw.push(stick([sx + sd * 0.12, sho[1], sho[2] - 0.02], [sx + sd * 0.2, (sho[1] + seat[1]) / 2 + 0.02, sho[2] + 0.12], 0.035, "5"))
  out.push({ d: ahead(sx, seat[1]) - 0.01, shapes: sw })
  return out
}

// ================================================================ the scene
const STATIC = [
  tree(3, 17.3, { tall: 8, crown: 3.2, seed: 3 }), tree(8.6, 27, { tall: 7, crown: 2.6, ipe: true, seed: 5 }),
  tree(25, 27, { tall: 8.5, crown: 3.4, seed: 7 }), tree(31, 13.5, { tall: 7.5, crown: 3, seed: 9 }), tree(-3.5, 31, { tall: 7, crown: 2.8, ipe: true, seed: 11 }),
  tree(40, 22, { tall: 8, crown: 3.2, seed: 13 }),
  ...hedge(4.4, 19, 5.0, 34, 1.8), ...hedge(30, 5.4, 44, 6.0, 1.5),
  ...[16, 40, 52, 64].map((z) => lamp(7.9, z)), ...[25, 37, 49, 61].map((x) => lamp(x, 9.1)),
  bench(4.75, 11.5, "z", 1), bench(4.75, 15.5, "z", 1), bench(20, 9.45, "x", -1), bench(-2, 9.45, "x", -1),
  bin(4.7, 17.4), bin(21.6, 9.4),
  slide(19.5, 13), swings(11, 12.8), seesaw(16.5, 19.4), climber(11.4, 17.2), ...curb(),
  cart(13.2, 4.6),
]
STATIC.forEach((s, i) => (s.id = i))

// the treeline at the park's far edges and the city beyond, in haze: all behind everything that moves
const BUILDINGS = [
  [[-22, 104, -3, 120, 0, 34], "K", "L"], [[8, 98, 28, 114, 0, 48], "I", "J"], [[40, 94, 62, 108, 0, 28], "M", "O"],
  [[96, 46, 114, 70, 0, 40], "I", "J"], [[102, 2, 120, 26, 0, 30], "K", "L"], [[72, 84, 90, 100, 0, 22], "M", "O"],
]
function city(c) {
  for (const [b, litKey, shadeKey] of [...BUILDINGS].sort((m, n) => ahead(n[0][0], n[0][1]) - ahead(m[0][0], m[0][1]))) {
    for (const [kind, pts, side] of faces(b)) {
      c.poly(pts, kind === "top" ? "R" : kind === "lit" ? litKey : shadeKey)
      if (!side) continue
      // windows: a grid of panes per floor, every edge running to its vanishing point; the glass on
      // the shaded faces catches the sky
      const [x0, z0, x1, z1, , u1] = b, along = side.includes("x") ? [z0, z1] : [x0, x1], fixed = side === "-x" ? x0 : side === "+x" ? x1 : side === "-z" ? z0 : z1
      for (let u = 3; u < u1 - 1.5; u += 3) for (let a = along[0] + 1.2; a < along[1] - 1.2; a += 2.6) {
        const q = (aa, uu) => (side.includes("x") ? at(fixed, aa, uu) : at(aa, fixed, uu))
        c.poly([...q(a, u), ...q(a + 1.3, u), ...q(a + 1.3, u + 1.5), ...q(a, u + 1.5)], kind === "lit" ? "P" : "Q")
      }
    }
  }
}
function treeline(c) {
  const r = rng(4), crowns = []
  for (let x = -16; x < 72; x += 4 + r() * 3) crowns.push([x, 72 + r() * 4, 8 + r() * 4])
  for (let z = -2; z < 72; z += 4 + r() * 3) crowns.push([72 + r() * 4, z, 8 + r() * 4])
  crowns.sort((m, n) => ahead(n[0], n[1]) - ahead(m[0], m[1]))
  for (const [x, z, tall] of crowns) {
    const s = P.scale(ahead(x, z)), [cx, cy] = at(x, z, tall * 0.65)
    c.line(...at(x, z, 0), cx, cy, "S", Math.max(1, Math.round(0.4 * s)))
    c.ellipse(cx, cy, Math.round(3.4 * s), Math.round(2.8 * s), "S")
    c.ellipse(cx - Math.round(0.8 * s), cy - Math.round(0.8 * s), Math.round(2.2 * s), Math.round(1.7 * s), "T")
  }
}
const CLOUDS = [[40, 18, 34, 7], [230, 12, 48, 9], [150, 34, 26, 5], [290, 40, 22, 5]]
function sky(c) {
  for (const [x, y, w, h] of CLOUDS) {
    const r = rng(x)
    for (let i = 0; i < 6; i++) { const px = x + (r() - 0.5) * w, py = y + (r() - 0.3) * h * 0.6, rr = h * (0.5 + r() * 0.5); c.ellipse(Math.round(px), Math.round(py), Math.round(rr * 1.3), Math.round(rr), "F") }
    c.hline(x - w / 2, y + h * 0.4, w, "H")
    for (let yy = y; yy < y + h; yy++) for (let xx = x - w; xx < x + w; xx++) if (c.key(xx, yy) === "F" && c.key(xx, yy + 1) !== "F" && c.key(xx, yy + 1) !== "G") c.px(xx, yy, "G")
  }
}

// a hopscotch chalked on the plaza: squares, pairs, and the sky at the end, every line on the axes
function hopscotch(c) {
  const x0 = 5.0, z0 = 5.9, sq = 0.45
  const cell = (x, z) => { for (const [a, b, cc, d] of [[x, z, x + sq, z], [x + sq, z, x + sq, z + sq], [x + sq, z + sq, x, z + sq], [x, z + sq, x, z]]) seg(c, a, b, cc, d, 0, "1") }
  let z = z0
  for (const pair of [false, true, false, true, false, true]) {
    if (pair) { cell(x0, z); cell(x0 + sq, z) } else cell(x0 + sq / 2, z)
    z += sq
  }
  const n = 8, pts = Array.from({ length: n + 1 }, (_, i) => [x0 + sq / 2 + sq / 2 + Math.cos((i / n) * Math.PI) * sq * 0.9, z + Math.sin((i / n) * Math.PI) * sq * 0.9])
  for (let i = 0; i < n; i++) seg(c, ...pts[i], ...pts[i + 1], 0, "1")
}
// fallen ipê flowers on the grass under their trees
function decals(c) {
  for (const t of STATIC) {
    if (!t.ipe) continue
    const r = rng(t.seed + 50)
    for (let i = 0; i < 260; i++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * t.crown * 1.4, [x, y] = at(t.x + Math.cos(a) * d + 0.8, t.z + Math.sin(a) * d - 0.4)
      if (y > P.horizon && "abcde".includes(c.key(x, y))) c.px(x, y, r() < 0.5 ? "t" : "u")
    }
  }
}

sprite("_bg", { w: W, h: H },
  grad(0, 0, W, P.horizon + 1, "ABCDE", "v"),
  (c) => sky(c),
  (c) => city(c),
  (c) => treeline(c),
  plane(P, (x, z) => ground(x + CX, z + CZ)),
  (c) => paving(c),
  (c) => { const out = new Set(); for (const s of STATIC) cast(out, s.shapes); darken(c, out) },
  (c) => decals(c),
  (c) => hopscotch(c))

// each still thing on a sprite of its own, lit once; the scene interleaves them with the moving ones
for (const s of STATIC)
  sprite("_s" + s.id, { w: W, h: H }, (c) => {
    drawShapes(c, s.shapes.filter((q) => !q.umbrella && !q.poly), s.ramps)
    for (const q of s.shapes) {
      if (q.umbrella) umbrella(c, q.umbrella)
      if (q.poly) c.poly(q.poly.flatMap((p) => at(...p)), q.key)
    }
    if (s.leafy) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if ("pqo".includes(c.key(x, y)) && hash(x, y + s.id * 31) < 0.12) c.px(x, y, c.key(x, y) === "o" ? "p" : "o")
    // leaves: clumps darker toward the lower right of each puff, lit flecks on the upper left
    for (const q of s.shapes) if (q.leaves) {
      const sc = P.scale(ahead(q.e[0], q.e[1])), [cx, cy] = at(...q.e), rx = Math.round(q.rx * sc), ry = Math.round(q.ry * sc), r = rng(cx * 31 + cy)
      for (let i = 0; i < rx * 3; i++) {
        const px = cx + Math.round((r() * 2 - 1) * rx * 0.85), py = cy + Math.round((r() * 2 - 1) * ry * 0.85), k = c.key(px, py)
        const lower = px - cx + (py - cy) * 1.5 > 0, dark = s.ipe ? "s" : "o", light = s.ipe ? "u" : "q"
        if (k === (s.ipe ? "t" : "p")) c.hline(px, py, 2, lower ? dark : light)
      }
    }
  })

anim("park", { w: W, h: H, frames: FRAMES, fps: FPS },
  stamp("_bg", 0, 0),
  (c) => {
    const moving = figures(c.frame), out = new Set()
    for (const m of moving) cast(out, m.shapes)
    for (const i of out) { const x = i % W, y = (i - x) / W, k = c.key(x, y); if (SHADE[k] && !"cdhjl".includes(k)) c.px(x, y, SHADE[k]) }
    const all = [...STATIC.map((s) => ({ d: s.d, still: s })), ...moving].sort((m, n) => n.d - m.d)
    for (const m of all) {
      if (m.still) { c.stamp("_s" + m.still.id, 0, 0); continue }
      const big = P.scale(m.d) * 1.2 > 14
      drawShapes(c, m.shapes, big ? BODY_RAMPS : undefined)
      if (m.leash) { const [hx, hy, cx, cy] = m.leash, mx = Math.round((hx + cx) / 2), my = Math.round((hy + cy) / 2) + 1; c.line(hx, hy, mx, my, "!"); c.line(mx, my, cx, cy, "!") }
    }
  })
