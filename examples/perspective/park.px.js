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
  o: "#24572f", p: "#3b8034", q: "#6aac3e", r: "#b9d65c",
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
  // foliage: the deep shade under a crown; the ipê's deepest and its glint; bark's deepest; the treeline's dark and light
  "=": "#1a3838", "-": "#9a6a12", ":": "#fff6c0", ";": "#2e2018", "<": "#466f52", ">": "#a3c39e",
  // worn earth, a darker patch of it, pebbles, earth in shade; grass blades in the sun and in their own shade; daisies
  "(": "#8f6d48", ")": "#6e5236", "[": "#b49a72", "]": "#4f3b2b", "{": "#98d25c", "}": "#5a9a3a", ",": "#fbfbef",
  // paving: slabs a shade lighter and darker, a crack; the plaza's warm stone
  "|": "#e6dece", "/": "#cdc3b0", "?": "#a59b8b", "`": "#e9d6b6",
  // the lawn a shade lighter and darker in patches; grass tips in the sun, and catching the blue of the sky
  "á": "#8bc858", "é": "#63a63f", "ú": "#cfe070", "ó": "#a6d6c0",
  // bark's cool deep shade and its lit edge
  N: "#2b2330", "'": "#c49464",
  // grass worn thin, the earth nearly through
  "~": "#a7b45e",
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
const noise = (x, y) => {
  const i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j, su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v)
  const a = hash(i, j), b = hash(i + 1, j), c = hash(i, j + 1), d = hash(i + 1, j + 1)
  return a + (b - a) * su + (c - a) * sv + (a - b - c + d) * su * sv
}

// ================================================================ ground
const PATH_A = [6.4, 8.6], PATH_B = [5.2, 7.4], PLAZA = [4.4, 5.6, 8.2, 9.4], SAND = [10, 11, 23, 21]
const inRect = (x, z, [x0, z0, x1, z1]) => x >= x0 && x <= x1 && z >= z0 && z <= z1
// Square panels half a path wide, as a sidewalk's are laid (joints as far apart as the slab is wide):
// on the paths, their joints run on from the plaza's edges; on the plaza, the paths' edges and middles
// run on across it, so every joint lines up with another
const SLAB = 1.1
const joints = (lo, hi) => [...Array.from({ length: 10 }, (_, k) => lo - (k + 1) * SLAB), ...Array.from({ length: 50 }, (_, k) => hi + (k + 1) * SLAB)]
const JOINTS_A = joints(PLAZA[0], PLAZA[2]), JOINTS_B = joints(PLAZA[1], PLAZA[3])
const GRID_X = [PLAZA[0], PATH_B[0], (PATH_B[0] + PATH_B[1]) / 2, PATH_B[1], PLAZA[2]], GRID_Z = [PLAZA[1], PATH_A[0], (PATH_A[0] + PATH_A[1]) / 2, PATH_A[1], PLAZA[3]]
const paved = (x, z) => (z >= PATH_A[0] && z <= PATH_A[1]) || (x >= PATH_B[0] && x <= PATH_B[1]) || inRect(x, z, PLAZA)
// Worn earth, each where something wore the grass away: a shortcut cut across the corner by the
// crossing, bare ground in the deep shade under the big trees, in front of the benches on the lawn;
// in the sand, hollows dug by feet under the swings and at the slide's end.
const SHORTCUT = [[5.2, 4.4], [3.6, 6.4]]
const BARE = [[3, 17.3, 1.7], [25, 27, 1.8], [31, 13.5, 1.6], [40, 22, 1.6]]
const FEET = [[20, 9.05, 1.0, 0.35], [-2, 9.05, 1.0, 0.35]]
const PITS = [[11.9, 12.8, 0.35, 0.9], [13.6, 12.8, 0.3, 0.7], [23.0, 13.45, 0.45, 0.4]]
// a stretch of lawn the mower goes around, left to grow tall: an uneven oval, (x, z) and its radii
const MEADOW = [2.0, 10.0, 1.1, 0.5]
const inMeadow = (x, z) => ((x - MEADOW[0]) / MEADOW[2]) ** 2 + ((z - MEADOW[1]) / MEADOW[3]) ** 2 < 0.85 + 0.3 * noise(x * 2.5, z * 2.5)
const distSeg = (x, z, [[ax, az], [bx, bz]]) => { const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz))); return Math.hypot(x - ax - t * dx, z - az - t * dz) }
function worn(x, z) {
  const n = noise(x * 3, z * 3), d = distSeg(x, z, SHORTCUT)
  if (d < 0.14 + 0.06 * n && noise(x * 6, z * 6) > 0.42) return n > 0.82 ? "[" : "("
  if (d < 0.3 && noise(x * 7, z * 7) > 0.5) return "~"
  for (const [tx, tz, rad] of BARE) { const e = Math.hypot(x - tx, (z - tz) * 1.1) / rad; if (e < 0.7 + 0.35 * n) return e < 0.45 && n > 0.6 ? ")" : "(" }
  for (const [fx, fz, hx, hz] of FEET) if (Math.abs(x - fx) < hx * (0.8 + 0.3 * n) && Math.abs(z - fz) < hz * (0.7 + 0.4 * n)) return "("
  return null
}
// Concrete as it is outside: an almost even gray, a panel here and there a shade lighter (one replaced)
// or darker. Near, a step darker: the large soft stains rain and dirt leave, and the grain of its
// aggregate, except in the margin troweled smooth along every joint and edge (`edge` m from the nearest).
function concrete(dd, tone, u, v, edge) {
  const base = tone < 0.14 ? "/" : tone > 0.9 ? "|" : "f", dark = { f: "/", "/": "g", "|": "f" }[base]
  if (dd > 8) return base
  if (noise(u * 1.4 + 40, v * 1.4) > 0.6 + dd * 0.025) return dark
  if (edge < 0.06) return base
  return hash(Math.floor(u * 22) + 7, Math.floor(v * 22)) < 0.045 ? dark : base
}
// mowing stripes along z (they run to the left point), and in them large soft patches a shade lighter or
// darker, where the grass grows thicker or thinner; far off, the stripes alone
const lawn = (x, z) => {
  const a = Math.floor(x / 2.5) & 1, n = ahead(x, z) < 45 ? noise(x / 4.5 + 31, z / 4.5) : 0.5
  // a thicker patch lifts both stripes a step, a thinner one lowers both: the stripes stay, softer or stronger
  if (n > 0.64) return a ? "á" : "a"
  if (n < 0.3) return a ? "b" : "é"
  return a ? "a" : "b"
}
function ground(x, z) {
  const dd = ahead(x, z)
  if (dd > 140) return "e"
  if (inRect(x, z, PLAZA)) {
    // the plaza: the same poured concrete, its panels cut by the paths' lines; one with the mark a puddle
    // left drying
    const i = GRID_X.findIndex((g) => g > x) - 1, j = GRID_Z.findIndex((g) => g > z) - 1
    if (Math.hypot(x - 6.9, (z - 8.05) * 1.3) < 0.28 + 0.06 * noise(x * 9, z * 9)) return "/"
    const edge = Math.min(x - GRID_X[i], GRID_X[i + 1] - x, z - GRID_Z[j], GRID_Z[j + 1] - z)
    return concrete(dd, hash(i * 13 + 5, j * 7 + 3), x, z, edge)
  }
  if (inMeadow(x, z)) return noise(x * 8, z * 8) > 0.55 ? "c" : "é"
  const onA = z >= PATH_A[0] && z <= PATH_A[1], onB = x >= PATH_B[0] && x <= PATH_B[1]
  if (onA || onB) {
    // grass creeping over the slabs' edges, where it's near enough to see; slabs weathered each its own shade
    const edge = Math.min(onA ? Math.min(z - PATH_A[0], PATH_A[1] - z) : 9, onB ? Math.min(x - PATH_B[0], PATH_B[1] - x) : 9)
    if (dd < 16 && edge < 0.1 && noise(x * 9, z * 9) > 0.45) return lawn(x, z)
    // near, the soil that rain and the mower throw onto the slabs' edges by the lawn; and where the
    // shortcut across the lawn meets a path, the earth feet carry onto it, thinning out along the path
    if (dd < 10 && edge < 0.16 && noise(x * 7 + 5, z * 7) > 0.6) return edge < 0.07 && noise(x * 13, z * 13) > 0.62 ? "(" : "["
    const tracked = Math.min(...SHORTCUT.map(([ex, ez]) => (onA ? Math.hypot(x - ex, (z - ez) * 1.6) : Math.hypot((x - ex) * 1.6, z - ez))))
    if (dd < 12 && tracked < 1.1 && noise(x * 10, z * 10) > 0.38 + tracked * 0.5) return tracked < 0.4 && noise(x * 4, z * 4) > 0.5 ? "[" : "/"
    if (dd > 26) return "f"
    // poured concrete in square panels, two across the path, counted out from the plaza
    const along = onA ? x : z, across = onA ? z - PATH_A[0] : x - PATH_B[0], width = onA ? PATH_A[1] - PATH_A[0] : PATH_B[1] - PATH_B[0]
    const q = (along - (along < (onA ? PLAZA[0] : PLAZA[1]) ? (onA ? PLAZA[0] : PLAZA[1]) : (onA ? PLAZA[2] : PLAZA[3]))) / SLAB, k = Math.floor(q)
    const fa = (q - k) * SLAB, joint = Math.min(fa, SLAB - fa, Math.abs(across - width / 2), edge)
    return concrete(dd, hash(k * 7 + (onA ? 1 : 2), across < width / 2 ? 0 : 1), along, across, joint)
  }
  if (inRect(x, z, SAND)) {
    for (const [px, pz, rx, rz] of PITS) if (((x - px) / rx) ** 2 + ((z - pz) / rz) ** 2 < 1) return "j"
    return "i"
  }
  if (dd > 70) return "e"
  return worn(x, z) ?? lawn(x, z)
}
// A tuft of grass at (x, y) on screen, its blades about `len` px: a few, fanning out from a dark foot,
// the body a step lighter than the lawn, the tips in the sun (some yellow) or catching the sky (a few
// bluish). Under 2 px a tuft is a tick.
const LAWN = "abáé"
function tuft(c, x, y, len, n, seed) {
  const r = rng(seed)
  if (len < 1.6) { c.px(x, y, "}"); c.px(x, y - 1, r() < 0.3 ? "ú" : "{"); return }
  for (let i = 0; i < n; i++) {
    const lean = ((i + 0.5) / n - 0.5) * 0.9 + (r() - 0.5) * 0.25, h = Math.max(2, Math.round(len * (0.65 + r() * 0.55))), tip = r()
    for (let k = 0; k < h; k++) {
      const t = k / (h - 1), key = t < 0.3 ? "}" : t < 0.99 ? "{" : tip < 0.12 ? "ó" : tip < 0.45 ? "ú" : "{"
      c.px(Math.round(x + lean * k * (0.5 + t * 0.8)), y - k, key)
    }
  }
}
// near the eye, what a flat color can't say: tufts of grass over the lawn and a daisy here and there,
// farther only a tick now and then; roots across the bare earth under the trees
function details(c) {
  for (let y = H - 1; y > P.horizon + 6; y--) {
    const dd = (P.focal * P.eye) / (y + 0.5 - P.horizon), len = (0.08 * P.focal) / dd
    if (dd > 26) continue
    for (let x = 0; x < W; x++) {
      if (!LAWN.includes(c.key(x, y))) continue
      const h = hash(x * 3 + 1, y * 7)
      if (dd < 10) {
        if (h < 0.0035) { c.px(x, y, ","); if (len > 2) c.px(x, y - 1, ","); continue }
        if (h < 0.022) { tuft(c, x, y, len, 3 + Math.floor(hash(x, y) * 3), x * 131 + y); continue }
        // the lawn's own blades: short strokes, some catching the light, some in their own shade
        if (h < 0.022 + 0.13 * Math.min(1, 4 / dd)) {
          const g = hash(y, x * 5), n = Math.max(1, Math.round(len * (0.35 + g * 0.35))), key = g < 0.5 ? "}" : "{"
          for (let i = 0; i < n; i++) if (LAWN.includes(c.key(x, y - i))) c.px(x, y - i, key)
        }
      } else if (h < 0.012) c.px(x, y - 1, "{")
    }
  }
  for (const [tx, tz, rad] of BARE) {
    const r = rng(Math.round(tx * 7 + tz))
    for (let i = 0; i < 6; i++) { const a = r() * Math.PI * 2, len = rad * (0.45 + r() * 0.45); seg(c, tx, tz, tx + Math.cos(a) * len, tz + Math.sin(a) * len * 0.9, 0, i % 2 ? "m" : "l") }
  }
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
// The pavement's lines, as a sidewalk's are: thin dark joints between the panels (no highlight: a sawn
// joint is a groove, not a bevel), the panels' edges against the soil, a crack across a panel here and
// there, a weed come up in a joint by the lawn.
function paving(c) {
  // the paths' edges and middles, straight on across the plaza; its own edges; the joints across
  for (const z of GRID_Z.slice(1, 4)) seg(c, -30, z, 90, z, 0, "g")
  for (const x of GRID_X.slice(1, 4)) seg(c, x, -30, x, 90, 0, "g")
  const [px0, pz0, px1, pz1] = PLAZA, mid = (a, b) => (a + b) / 2
  for (const x of [px0, px1]) seg(c, x, pz0, x, pz1, 0, "g")
  for (const z of [pz0, pz1]) seg(c, px0, z, px1, z, 0, "g")
  for (const x of JOINTS_A) if (ahead(x, 7.5) < 26) seg(c, x, PATH_A[0], x, PATH_A[1], 0, "g")
  for (const z of JOINTS_B) if (ahead(6.3, z) < 26) seg(c, PATH_B[0], z, PATH_B[1], z, 0, "g")
  // cracks: across a half panel, from the edge by the lawn to the middle joint, wandering a little
  for (const [onA, list] of [[true, JOINTS_A], [false, JOINTS_B]])
    for (const a of list) for (const side of [0, 1]) {
      const h = onA ? PATH_A : PATH_B, r = rng(Math.round(a * 10) * 7 + side * 3 + (onA ? 1 : 2))
      if (r() > 0.18) continue
      const lo = a < (onA ? px0 : pz0) ? a : a - SLAB, start = side ? h[1] : h[0], dir = side ? -1 : 1, pts = []
      let along = lo + 0.2 + r() * (SLAB - 0.4)
      for (let i = 0; i <= 4; i++) {
        pts.push(onA ? [along, start + dir * (i / 4) * (SLAB - 0.02)] : [start + dir * (i / 4) * (SLAB - 0.02), along])
        along = Math.max(lo + 0.06, Math.min(lo + SLAB - 0.06, along + (r() - 0.5) * 0.3))
      }
      if (ahead(...pts[0]) < 14) for (let i = 1; i < pts.length; i++) seg(c, ...pts[i - 1], ...pts[i], 0, "?")
    }
  // a weed in a joint by the lawn, here and there; near, one where the joints cross mid-path
  for (const [x, z] of [...JOINTS_A.flatMap((x) => [[x, PATH_A[0] + 0.05], [x, PATH_A[1] - 0.05]]), ...JOINTS_B.flatMap((z) => [[PATH_B[0] + 0.05, z], [PATH_B[1] - 0.05, z]])]) {
    if (ahead(x, z) > 12 || hash(Math.round(x * 10) + 3, Math.round(z * 10)) > 0.3) continue
    tuft(c, ...at(x, z), 0.1 * P.scale(ahead(x, z)), 3, Math.round(x * 91 + z * 7))
  }
  for (const [x, z] of [...JOINTS_A.map((x) => [x, mid(...PATH_A)]), ...JOINTS_B.map((z) => [mid(...PATH_B), z])])
    if (ahead(x, z) > 1 && ahead(x, z) < 8 && hash(Math.round(x * 10) + 7, Math.round(z * 10)) < 0.5) tuft(c, ...at(x, z), 0.06 * P.scale(ahead(x, z)), 4, Math.round(x * 13 + z * 5))
}

// ================================================================ shapes
// Everything is made of three shapes in meters: sticks { a: [x, z, u], b, half, key } (round: trunks,
// limbs, poles, bars), blobs { e: [x, z, u], rx, ry, key } (crowns, heads, wheels) and boxes
// { box: [x0, z0, x1, z1, u0, u1], keys: { top, lit, shade } }. The same shapes draw a thing and cast
// its shadow.
const stick = (a, b, half, key, extra) => ({ a, b, half, key, ...extra })
const blob = (e, rx, ry, key, extra) => ({ e, rx, ry, key, ...extra })
const box = (b, keys, extra) => ({ box: b, keys, ...extra })
// and cones { cone: [a, ra, b, rb], key }: a round shape tapering from a to b (a torso, a skirt, a bin),
// drawn as the hull of its two end rings, so it has the right outline from any side; `wrap` adds rings
// [[x, z, u], r] it has to go round (a skirt round the knees)
const cone = (a, ra, b, rb, key, extra) => ({ cone: [a, ra, b, rb], key, ...extra })
const ring = ([x, z, u], r, f) => Array.from({ length: 10 }, (_, i) => f(x + Math.cos((i / 10) * Math.PI * 2) * r, z + Math.sin((i / 10) * Math.PI * 2) * r, u))
const rings = ({ cone: [a, ra, b, rb], wrap = [] }, f) => [[a, ra], [b, rb], ...wrap].flatMap(([p, r]) => ring(p, r, f))

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
      if (q.cone) { c.poly(hull(rings(q, (x, z, u) => P.ground(x - CX, z - CZ, u))).flat().map(Math.round), q.key); continue }
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
    if (q.cone) { fillGround(out, hull(rings(q, (x, z, u) => [x + u * SOX, z + u * SOZ]))); continue }
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
const SHADE = { a: "c", b: "d", e: "c", f: "h", g: "h", i: "j", k: "l", m: "l", t: "s", u: "t", "(": ")", ")": "]", "[": ")", "{": "c", "}": "d", "|": "h", "/": "h", "`": "h", "?": "h", ",": "2", "~": "d", "á": "c", "é": "d", "ú": "c", "ó": "d" }
const darken = (c, out) => { for (const i of out) { const x = i % W, y = (i - x) / W, d = SHADE[c.key(x, y)]; if (d) c.px(x, y, d) } }

// ================================================================ things
// Leaf clumps, for the hedges: serrated, lit on the upper left, dark underneath, leaf strokes from the middle.
const LEAF = [-0.6, -0.8]                                            // light from the upper left, on screen
// A clump of leaves: a disc with a serrated rim; lit on the upper left (its brightest band just inside
// the rim there), darker underneath with a deep line along its lower edge, and dark leaf strokes
// radiating from its middle, the way a bunch of leaves seen from outside looks.
function clump(c, x, y, R, base, ramp, r) {
  const teeth = Math.max(5, Math.round(R * 1.2)), ph = r() * 6.28, top = ramp.length - 1
  const edge = (a) => R * (0.86 + 0.14 * Math.abs(Math.sin((teeth * a) / 2 + ph)))
  const k0 = (xx, yy) => {
    const d = Math.hypot(xx, yy), a = Math.atan2(yy, xx), e = edge(a)
    if (d > e + 0.3) return -1
    const f = d ? (xx * LEAF[0] + yy * LEAF[1]) / d : 0
    if (yy > 0 && d > e - 1.2) return 0                                // the deep line under it
    let k = base
    if (yy > R * 0.3 && d > R * 0.55) k = base - 1                      // its underside
    if (f > 0.2 && d < e - 1) k = base + 1                              // the lit side
    if (f > 0.55 && d > R * 0.45 && d < e - 0.5) k = Math.min(top, base + 2)   // the brightest band inside the rim
    return Math.max(1, Math.min(top, k))
  }
  const px = []
  for (let yy = -R - 1; yy <= R + 1; yy++) for (let xx = -R - 1; xx <= R + 1; xx++) { const k = k0(xx, yy); if (k >= 0) px.push([xx, yy, k]) }
  for (const [xx, yy, k] of px) c.px(x + xx, y + yy, ramp[k])
  if (R < 5) return
  // leaf strokes from the middle out, a tone darker than what they cross
  const n = Math.round(R * 0.9)
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + r() * 0.4, from = R * (0.15 + r() * 0.15), to = R * (0.5 + r() * 0.2)
    for (let d = from; d < to; d += 0.7) {
      const xx = Math.round(Math.cos(a) * d), yy = Math.round(Math.sin(a) * d), k = k0(xx, yy)
      if (k > 0) c.px(x + xx, y + yy, ramp[Math.max(1, k - 1)])
    }
  }
}

// Trees, grown the way the r/aseprite tree generators grow them (pxl-dogfood/refs/reddit-aseprite/NOTES.md):
// a skeleton in meters first (a trunk, main limbs leaving it at different heights all around, some toward
// us and some away, forking into branches and twigs, thinner and shorter each time, bending up and out),
// then leaf clusters at the twig ends, each a small ragged stamp whose tone comes from where it sits in 3D
// against the sun: on top and toward the sun lit, deep inside and underneath dark, the deepest a cool
// blue-green. Drawn far to near together with the wood, so the leaves behind a limb are hidden by it and
// the ones in front hide it. The shadow is cast by the clusters and limbs themselves, so it comes out lacy.
const norm = (v) => { const l = Math.hypot(...v) || 1; return v.map((c) => c / l) }
const SUN3 = norm([SUN_FROM[0] * Math.cos((55 * Math.PI) / 180), SUN_FROM[1] * Math.cos((55 * Math.PI) / 180), Math.sin((55 * Math.PI) / 180)])   // x, z, up
function grow(seed, { tall = 7, spread = 1, limbs = 4, depth = 3, side = [1, 0] }) {
  const r = rng(seed), wood = [], tips = []
  const trunk = tall * 0.36, lean = [(r() - 0.5) * 0.25, (r() - 0.5) * 0.25]
  const tr = 0.15 + tall * 0.02
  // a limb in three pieces that bend a little each way, thinning as it goes
  const piece = (p, e, r0, r1, gnarl, trunkPiece = false) => {
    const len = Math.hypot(...e.map((c, i) => c - p[i])), pts = [p]
    for (const t of [1 / 3, 2 / 3]) pts.push(p.map((c, i) => c + (e[i] - c) * t + (r() - 0.5) * len * gnarl))
    pts.push(e)
    for (let i = 0; i < 3; i++) wood.push({ a: pts[i], b: pts[i + 1], r0: r0 + ((r1 - r0) * i) / 3, r1: r0 + ((r1 - r0) * (i + 1)) / 3, trunk: trunkPiece })
    return pts
  }
  // the trunk: one line, bending a little, drawn as one body (not pieces)
  const line = [[0, 0, 0]]
  for (const t of [1 / 3, 2 / 3, 1]) line.push([lean[0] * t + (t < 1 ? (r() - 0.5) * trunk * 0.05 : 0), lean[1] * t + (t < 1 ? (r() - 0.5) * trunk * 0.05 : 0), trunk * t])
  // roots: thick where they leave the foot, thinning into the ground, out to the sides only (one
  // coming at us would be a lump), one more behind
  for (const [sd, spread2] of [[1, 0.35], [-1, 0.35], [1, -0.5]]) {
    const out = tr * (2.3 + r() * 1.1), dir = [side[0] * sd + side[1] * spread2 * (r() + 0.5), side[1] * sd - side[0] * spread2 * (r() + 0.5)], l = Math.hypot(...dir)
    wood.push({ a: [0, 0, tr * 1.0], b: [(dir[0] / l) * out, (dir[1] / l) * out, -tr * 0.25], r0: tr * 0.6, r1: tr * 0.16, root: true })
  }
  const branch = (p, d, len, rad, depth) => {
    const e = p.map((c, i) => c + d[i] * len)
    piece(p, e, rad, rad * 0.7, 0.14)
    if (depth === 0) { tips.push(e); return }
    const n = 2 + (r() < 0.45 ? 1 : 0)
    for (let i = 0; i < n; i++) {
      // turn away from the parent by 25-50 degrees, around a random axis; a pull up and outward
      const side = norm([r() - 0.5, r() - 0.5, r() - 0.5]), turn = (25 + r() * 25) * (Math.PI / 180)
      const cross = norm([d[1] * side[2] - d[2] * side[1], d[2] * side[0] - d[0] * side[2], d[0] * side[1] - d[1] * side[0]])
      let nd = d.map((c, k) => c * Math.cos(turn) + cross[k] * Math.sin(turn))
      nd = norm([nd[0] * (1 + 0.2 * spread), nd[1] * (1 + 0.2 * spread), nd[2] + 0.25])
      const at = 0.45 + r() * 0.55, start = p.map((c, k) => c + d[k] * len * at)
      branch(start, nd, len * (0.6 + r() * 0.15), Math.max(0.012, rad * 0.62), depth - 1)
    }
  }
  for (let i = 0; i < limbs; i++) {
    const az = i * 2.4 + r() * 0.6, el = (32 + r() * 28) * (Math.PI / 180), h = trunk * (0.82 + 0.5 * (i / limbs))
    const d = norm([Math.cos(el) * Math.cos(az) * spread, Math.cos(el) * Math.sin(az) * spread, Math.sin(el)])
    branch([lean[0] * (h / trunk), lean[1] * (h / trunk), h], d, tall * 0.3, 0.06 + tall * 0.008, depth)
  }
  branch([lean[0], lean[1], trunk], norm([(r() - 0.5) * 0.3, (r() - 0.5) * 0.3, 1]), tall * 0.32, 0.07 + tall * 0.008, depth)
  return { wood, tips, trunk: { line, r: tr } }
}
function foliage(seed, tree, { size = 0.75, per = 6, reach = 0.85 }) {
  const r = rng(seed + 1), out = []
  for (const t of tree.tips) for (let i = 0; i < per; i++) {
    const o = norm([r() - 0.5, r() - 0.5, r() - 0.3]), d = Math.cbrt(r()) * reach
    out.push({ p: t.map((c, k) => c + o[k] * d), size: size * (0.7 + r() * 0.6), v: r() })
  }
  const C = [0, 1, 2].map((k) => out.reduce((s, q) => s + q.p[k], 0) / out.length)
  const R = Math.max(...out.map((q) => Math.hypot(...q.p.map((c, k) => c - C[k])))) * 0.9
  for (const q of out) {
    const rel = q.p.map((c, k) => c - C[k]), rim = Math.min(1, Math.hypot(...rel) / R), n = norm(rel)
    const facing = n[0] * SUN3[0] + n[1] * SUN3[1] + n[2] * SUN3[2]
    q.tone = 0.5 + 0.38 * facing * (0.4 + 0.6 * rim) - 0.32 * (1 - rim) - 0.12 * (n[2] < -0.4 ? 1 : 0) + (q.v - 0.5) * 0.12
  }
  return { leaves: out, C, R }
}
// a leaf cluster stamp of about `px` pixels: a few leaflets in a ragged clump, lit along its top, dark
// along its bottom; four shapes a size
const STAMPS = new Map()
function leafStamp(px, which) {
  const key = px + ":" + which
  if (STAMPS.has(key)) return STAMPS.get(key)
  const r = rng(px * 97 + which * 13), pts = new Map(), rad = px / 2
  const blobs = px <= 2 ? [[0, 0, 0.8]] : Array.from({ length: 3 + (px > 5 ? 2 : 0) }, () => [(r() - 0.5) * rad, (r() - 0.5) * rad, rad * (0.45 + r() * 0.3)])
  for (const [bx, by, br] of blobs)
    for (let y = Math.floor(by - br - 1); y <= Math.ceil(by + br + 1); y++) for (let x = Math.floor(bx - br - 1); x <= Math.ceil(bx + br + 1); x++)
      if ((x + 0.5 - bx) ** 2 + (y + 0.5 - by) ** 2 <= br * br + 0.3) pts.set(x + "," + y, [x, y])
  const out = [...pts.values()].map(([x, y]) => [x, y, px >= 4 && !pts.has(x + "," + (y - 1)) ? 1 : px >= 4 && !pts.has(x + "," + (y + 1)) ? -1 : 0])
  STAMPS.set(key, out)
  return out
}
// A piece of wood as a capsule on screen, tapering from r0 to r1. Each pixel in it shaded by how much it
// faces the light (upper left), like a cylinder: lit, mid, shade, a cool deep tone on the far shade
// side, no outline on the lit side. On thick wood, bark furrows run along it, wavy and broken; above
// the crown's lower part everything is in the crown's shade, pixel by pixel by height.
const LIT2 = norm([-0.75, -0.66])
function limb(c, w, scr, s, C, R, bark) {
  const [x0, y0] = scr(w.a), [x1, y1] = scr(w.b), h0 = Math.max(0.5, w.r0 * s), h1 = Math.max(0.5, w.r1 * s)
  const dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy || 1, len = Math.sqrt(L2)
  const shade = (u) => (u > C[2] - R * 0.25 ? 2 : u > C[2] - R * 0.62 ? 1 : 0)
  if (h0 < 1.2 && h1 < 1.2) { c.line(Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1), bark[Math.max(0, 3 - shade((w.a[2] + w.b[2]) / 2))], 1); return }
  const hm = Math.max(h0, h1)
  for (let y = Math.floor(Math.min(y0, y1) - hm); y <= Math.ceil(Math.max(y0, y1) + hm); y++)
    for (let x = Math.floor(Math.min(x0, x1) - hm); x <= Math.ceil(Math.max(x0, x1) + hm); x++) {
      const px = x + 0.5, py = y + 0.5, t = Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / L2))
      const ax = x0 + dx * t, ay = y0 + dy * t, h = h0 + (h1 - h0) * t, ox = px - ax, oy = py - ay
      if (Math.hypot(ox, oy) > h) continue
      const lit = (ox * LIT2[0] + oy * LIT2[1]) / h, across = ((ox * -dy + oy * dx) / len) / h
      let k = lit > 0.68 && h >= 3 ? 5 : lit > 0.32 ? 4 : lit > -0.2 ? 3 : lit > -0.62 ? 2 : 1
      if (h >= 2.5) for (const f of [-0.45, -0.05, 0.38]) if (Math.abs(across - f - 0.07 * Math.sin(t * len * 0.35 + f * 9)) < 0.09 && hash(Math.round(f * 10) + 7, Math.floor((t * len) / 4)) > 0.22) k = Math.max(1, k - 1)
      c.px(x, y, bark[Math.max(0, k - shade(w.a[2] + (w.b[2] - w.a[2]) * t))])
    }
}
// The trunk as one body: the line smoothed through its points, the radius flaring at the foot and
// narrowing upward; every pixel takes its nearest point on the line, so the shading runs unbroken from
// the ground to the fork, and the furrows run the whole length.
function trunkBody(c, tk, scr, scaleAt, C, R, bark) {
  const cr = (p0, p1, p2, p3, t) => p1.map((_, k) => 0.5 * (2 * p1[k] + (p2[k] - p0[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t * t + (3 * p1[k] - p0[k] - 3 * p2[k] + p3[k]) * t * t * t))
  const L = tk.line, ext = [L[0], ...L, L[L.length - 1]], pts = []
  for (let i = 1; i < ext.length - 2; i++) for (let k = 0; k < 12; k++) pts.push(cr(ext[i - 1], ext[i], ext[i + 1], ext[i + 2], k / 12))
  pts.push(L[L.length - 1])
  const top = L[L.length - 1][2], samples = pts.map((p) => {
    const f = p[2] / top, rad = tk.r * (1.06 - 0.2 * f + 0.42 * Math.exp(-p[2] / (tk.r * 1.6)))
    return { p, scr: scr(p), h: Math.max(0.6, rad * scaleAt(p)), u: p[2] }
  })
  let along = 0
  samples.forEach((q, i) => { if (i) along += Math.hypot(q.scr[0] - samples[i - 1].scr[0], q.scr[1] - samples[i - 1].scr[1]); q.along = along })
  const xs = samples.map((q) => q.scr[0]), ys = samples.map((q) => q.scr[1]), hm = Math.max(...samples.map((q) => q.h))
  for (let y = Math.floor(Math.min(...ys) - hm); y <= Math.ceil(Math.max(...ys) + 1); y++)
    for (let x = Math.floor(Math.min(...xs) - hm); x <= Math.ceil(Math.max(...xs) + hm); x++) {
      let best = null, bd = Infinity
      for (const q of samples) { const d = (x + 0.5 - q.scr[0]) ** 2 + (y + 0.5 - q.scr[1]) ** 2 - q.h * q.h; if (d < bd) { bd = d; best = q } }
      const ox = x + 0.5 - best.scr[0], oy = y + 0.5 - best.scr[1]
      if (Math.hypot(ox, oy) > best.h || y > Math.ceil(samples[0].scr[1])) continue
      const lit = (ox * LIT2[0] + oy * LIT2[1]) / best.h, across = ox / best.h
      let k = lit > 0.62 && best.h >= 3 ? 5 : lit > 0.25 ? 4 : lit > -0.25 ? 3 : lit > -0.65 ? 2 : 1
      for (const f of [-0.5, -0.08, 0.36]) if (best.h >= 2.5 && Math.abs(across - f - 0.06 * Math.sin(best.along * 0.3 + f * 9)) < 0.09 && hash(Math.round(f * 10) + 7, Math.floor(best.along / 5)) > 0.2) k = Math.max(1, k - 1)
      if (best.u > C[2] - R * 0.25) k -= 2
      else if (best.u > C[2] - R * 0.62) k -= 1
      c.px(x, y, bark[Math.max(0, k)])
    }
}

// a grown tree standing at (tx, tz), drawn far to near through the camera
function paintTree(c, tx, tz, t, ramp, bark) {
  const W3 = ([x, z, u]) => [tx + x, tz + z, u], scr = (p) => { const [x, z, u] = W3(p); return P.ground(x - CX, z - CZ, u) }
  const items = [...t.wood.map((w) => ({ d: ahead(tx + (w.a[0] + w.b[0]) / 2, tz + (w.a[1] + w.b[1]) / 2) - (w.root ? 0.2 : 0), w })), { d: ahead(tx, tz) - 0.3, trunk: t.trunk }, ...t.leaves.map((q) => ({ d: ahead(tx + q.p[0], tz + q.p[1]), q }))].sort((a, b) => b.d - a.d)
  for (const it of items) {
    const s = P.scale(it.d)
    if (it.trunk) { trunkBody(c, it.trunk, scr, (p) => P.scale(ahead(tx + p[0], tz + p[1])), t.C, t.R, bark); continue }
    if (it.w) { limb(c, it.w, scr, s, t.C, t.R, bark); continue }
    const q = it.q, px = Math.max(2, Math.min(10, Math.round(q.size * s))), [x, y] = scr(q.p)
    const base = Math.max(0, Math.min(ramp.length - 1, Math.floor(q.tone * ramp.length)))
    for (const [dx, dy, edge] of leafStamp(px, Math.floor(q.v * 4))) c.px(Math.round(x + dx), Math.round(y + dy), ramp[Math.max(0, Math.min(ramp.length - 1, base + edge))])
  }
}
// a tree in the park: grown, painted where it stands; its limbs and leaf clusters cast its shadow
function tree(x, z, { tall = 7, crown = 2.6, ipe = false, seed = 1, limbs = 4 } = {}) {
  const opts = { tall, spread: crown / 2.2, limbs, side: [COS, -SIN], ...(ipe ? { size: 0.5, per: 12, reach: 0.75 } : {}) }
  const t = grow(seed, opts), f = foliage(seed, t, opts), body = { ...t, ...f }
  const shapes = [...t.wood.map((w) => stick([x + w.a[0], z + w.a[1], w.a[2]], [x + w.b[0], z + w.b[1], w.b[2]], (w.r0 + w.r1) / 2, "m")),
    ...t.trunk.line.slice(1).map((b, i) => stick([x + t.trunk.line[i][0], z + t.trunk.line[i][1], t.trunk.line[i][2]], [x + b[0], z + b[1], b[2]], t.trunk.r, "m")),
    ...f.leaves.map((q) => blob([x + q.p[0], z + q.p[1], q.p[2]], q.size / 2, q.size / 2, "p", { ghost: true }))]
  const bare = BARE.find(([bx, bz]) => bx === x && bz === z), ring = bare ? bare[2] * 0.95 : (0.15 + tall * 0.02) * 3
  // tall grass and weeds where the mower doesn't go: against the trunk and at the ends of the roots,
  // on the side toward us; they sway (see sway())
  const r = rng(seed + 9), tr = t.trunk.r, spots = t.wood.filter((w) => w.root).map((w) => [x + w.b[0] * 0.8, z + w.b[1] * 0.8])
  for (const [px, pz] of around(x, z, tr * 1.8, 9)) if (r() < 0.35) spots.push([px, pz])
  for (const [px, pz] of around(x, z, ring * 0.9, 12)) if (r() < 0.25) spots.push([px, pz])
  const weeds = spots.filter(([px, pz]) => !paved(px, pz)).map(([px, pz]) => weed(r, px, pz))
  return { d: ahead(x, z), shapes, paint: (c) => paintTree(c, x, z, body, ipe ? "-stu:" : "=opqr", "N;lmn'"), fringe: around(x, z, ring, 14), weeds, ipe, x, z, crown, tall, seed }
}
// a clump of tall grass about (x, z), its blades `tall` times 0.3-0.65 m fanning `fan` wide, a few with
// a seed head
function weed(r, x, z, tall = 1, fan = 0.7) {
  const n = 5 + Math.floor(r() * 4)
  return { x: x + (r() - 0.5) * 0.2, z: z + (r() - 0.5) * 0.2, blades: Array.from({ length: n }, (_, i) => ({ h: (0.3 + r() * 0.35) * tall, lean: ((i + 0.5) / n - 0.5) * fan + (r() - 0.5) * 0.2, ph: r() * 6.28, head: r() < 0.3, tip: r() })) }
}
// Weeds swaying: each blade, dark at the foot and lit at the tip, bends more at the tip than at the
// foot, the wind a slow wave crossing the lawn (8 s, three to the loop), so neighbouring clumps lean in
// turn rather than all at once; a few carry a seed head.
function sway(c, weeds, frame) {
  for (const w of weeds) {
    const s = P.scale(ahead(w.x, w.z)), [bx, by] = at(w.x, w.z), gust = (frame / 80) * Math.PI * 2 - w.x * 0.6 - w.z * 0.35
    for (const b of w.blades) {
      const hp = Math.max(2, Math.round(b.h * s)), bend = (0.07 + 0.05 * Math.sin(gust * 0.5 + b.ph)) * s * (b.h / 0.5) * Math.sin(gust + b.ph * 0.25)
      let ex = bx, ey = by
      for (let k = 0; k < hp; k++) {
        const f = k / (hp - 1)
        ex = Math.round(bx + b.lean * hp * f * 0.6 + bend * f * f); ey = by - k
        const key = f < 0.2 ? "c" : f < 0.5 ? "}" : f < 0.97 ? "{" : b.tip < 0.15 ? "ó" : b.tip < 0.5 ? "ú" : "{"
        c.px(ex, ey, key)
        if (hp > 9 && f < 0.35) c.px(ex + 1, ey, key)
      }
      if (b.head && hp > 4) { c.px(ex, ey - 1, "@"); c.px(ex + (bend > 0 ? 1 : -1), ey, "&"); c.px(ex, ey + 1, "@") }
    }
  }
}
// Where a mower can't reach, the grass grows taller: points around a thing's foot on the side toward us
// (the far side is hidden behind it anyway)
const around = (x, z, rad, n) => Array.from({ length: n }, (_, i) => [x + Math.cos((i / n) * Math.PI * 2) * rad, z + Math.sin((i / n) * Math.PI * 2) * rad]).filter(([px, pz]) => ahead(px, pz) < ahead(x, z) && !paved(px, pz) && !inRect(px, pz, SAND))
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
  return { d: ahead(x, z), shapes: [stick([x, z, 0], [x, z, 3.4], 0.05, "4"), stick([x, z, 0], [x, z, 0.3], 0.09, "0"), blob([x, z, 3.55], 0.16, 0.2, "2"), stick([x, z, 3.75], [x, z, 3.8], 0.12, "4")], fringe: around(x, z, 0.14, 6) }
}
const bin = (x, z) => ({ d: ahead(x, z), shapes: [stick([x, z, 0], [x, z, 0.8], 0.22, "V"), stick([x, z, 0.8], [x, z, 0.86], 0.24, "W")], fringe: around(x, z, 0.26, 7) })
// hedges: boxes of trimmed bush, in short lengths so whoever walks behind one is drawn behind it
function hedge(x0, z0, x1, z1, tall) {
  const out = [], along = x1 - x0 > z1 - z0, n = Math.ceil((along ? x1 - x0 : z1 - z0) / 1.5)
  for (let i = 0; i < n; i++) {
    const a = i / n, b = (i + 1) / n, bx = along ? [x0 + (x1 - x0) * a, z0, x0 + (x1 - x0) * b, z1] : [x0, z0 + (z1 - z0) * a, x1, z0 + (z1 - z0) * b]
    const b3 = [...bx, 0, tall], keys = { top: "q", lit: "p", shade: "o" }, mx = (bx[0] + bx[2]) / 2, mz = (bx[1] + bx[3]) / 2
    const paint = (c) => {
      const s = P.scale(ahead(mx, mz)), r = rng(Math.round(mx * 17 + mz * 5)), rb = Math.max(2, Math.round(0.3 * s)), small = Math.max(2, Math.round(0.17 * s))
      let lit = false
      for (const [kind, pts] of faces(b3)) { c.poly(pts, keys[kind]); if (kind === "lit") lit = true }
      const [fx0, fz0, fx1, fz1] = bx, near = along ? fz0 : fx0
      const len = along ? fx1 - fx0 : fz1 - fz0
      for (let i = 0; i < Math.round(len * tall * 2.2); i++) {
        const a = r() * len, u = 0.2 + r() * (tall - 0.45)
        const [px, py] = along ? at(fx0 + a, near, u) : at(near, fz0 + a, u)
        clump(c, px, py, small, lit ? 2 : 1, "=opqr", r)
      }
      for (const [row, base] of [[along ? fz1 : fx1, 2], [near, 3]])
        for (let a = 0; a <= (along ? fx1 - fx0 : fz1 - fz0); a += 0.45) {
          const [px, py] = along ? at(fx0 + a, row, tall) : at(row, fz0 + a, tall)
          clump(c, px, py, rb, base, "=opqr", r)
        }
    }
    // along the foot of the face we see
    const foot = [], [fx0, fz0, fx1, fz1] = bx
    for (let a = 0.1; a < (along ? fx1 - fx0 : fz1 - fz0); a += 0.22) foot.push(along ? [fx0 + a, fz0 - 0.06] : [fx0 - 0.06, fz0 + a])
    out.push({ d: ahead(mx, mz), shapes: [box(b3, keys)], paint, fringe: foot.filter(([px, pz]) => !paved(px, pz)) })
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
  const edge = (pts) => pts.filter(([px, pz]) => !paved(px, pz))
  for (let x = x0; x < x1; x += 2.6) for (const zz of [z0, z1])
    out.push({ d: ahead(x + 1.3, zz), shapes: [box([x, zz - t, Math.min(x + 2.6, x1), zz, 0, 0.2], k)], fringe: zz === z0 ? edge(Array.from({ length: 8 }, (_, i) => [x + 0.15 + i * 0.32, zz - t - 0.06])) : [] })
  for (let zz = z0; zz < z1; zz += 2.5) for (const xx of [x0, x1])
    out.push({ d: ahead(xx, zz + 1.25), shapes: [box([xx, zz, xx + t, Math.min(zz + 2.5, z1), 0, 0.2], k)], fringe: xx === x0 ? edge(Array.from({ length: 8 }, (_, i) => [xx - 0.06, zz + 0.15 + i * 0.3])) : [] })
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
// from any angle the paths give it, at any distance, and casts its own shadow. Its details are
// shapes too, on the body where they belong: hands, socks, a shirt's stripes or collar, a dress's belt
// and the folds falling from it, a hat's band, a bag; eyes on whichever side of the head is toward us,
// once the head is big enough to hold them.
const KID = { hip: 0.62, thigh: 0.3, shin: 0.3, torso: 0.36, shoulder: 0.13, hipw: 0.075, arm: 0.2, fore: 0.18, head: 0.12, neck: 0.13, limb: 0.045, body: 0.1 }
const WOMAN = { hip: 0.86, thigh: 0.42, shin: 0.42, torso: 0.5, shoulder: 0.17, hipw: 0.09, arm: 0.28, fore: 0.25, head: 0.105, neck: 0.15, limb: 0.038, body: 0.115 }
const MAN = { ...WOMAN, hip: 0.9, thigh: 0.44, shin: 0.44, torso: 0.54, shoulder: 0.2, body: 0.14, head: 0.11 }
const GAITS = {
  run: { reach: 0.42, lift: 0.55, bob: 0.035, lean: 0.12, swing: 0.95, elbow: 1.5 },
  walk: { reach: 0.3, lift: 0.12, bob: 0.018, lean: 0.02, swing: 0.4, elbow: 0.35 },
  stand: { reach: 0, lift: 0, bob: 0, lean: 0, swing: 0, elbow: 0.25 },
}
const lerp3 = (a, b, t) => a.map((v, k) => v + (b[k] - v) * t)
// does a point's outward direction (dx, dz) at (x, z) face the eye?
const facing = (x, z, dx, dz) => (dx * (CX - x) + dz * (CZ - z)) / (Math.hypot(dx, dz) * Math.hypot(CX - x, CZ - z) || 1) > 0.2
function person(b, { x, z, heading: [hx, hz], phase, gait, look, hat, tail, wave = 0, bag = null }) {
  const g = GAITS[gait], th = phase * Math.PI * 2, L = b.thigh + b.shin, sh = [], wrap = [], px = P.scale(ahead(x, z))
  const w3 = (f, r, u) => [x + f * hx + r * hz, z + f * hz - r * hx, u], fine = { noShadow: true }
  const hipU = b.hip + g.bob * Math.cos(2 * th) - (gait === "run" ? 0.04 : 0)
  for (const sd of [-1, 1]) {
    const t = th + (sd > 0 ? Math.PI : 0), ff = g.reach * L * Math.cos(t), lift = g.lift * L * Math.max(0, -Math.sin(t))
    const du = lift - hipU, d = Math.min(Math.hypot(ff, du), L - 0.002), ka = Math.atan2(du, ff) + Math.acos((b.thigh ** 2 + d * d - b.shin ** 2) / (2 * b.thigh * d))
    const hip = w3(0, sd * b.hipw, hipU), knee = w3(Math.cos(ka) * b.thigh, sd * b.hipw, hipU + Math.sin(ka) * b.thigh), ankle = w3(ff, sd * b.hipw, lift + 0.05)
    // under a skirt the thigh never shows: the skirt goes round it instead, so its hem follows the stride
    if (look.skirt) wrap.push([lerp3(hip, knee, 0.85), b.limb * 1.9])
    else sh.push(stick(hip, knee, b.limb * 1.25, look.thigh))
    sh.push(stick(knee, ankle, b.limb, look.shin), stick(ankle, w3(ff + 0.12, sd * b.hipw, lift + 0.03), b.limb * 0.9, look.shoe))
    if (look.socks) sh.push(stick(ankle, lerp3(ankle, knee, 0.22), b.limb * 1.1, look.socks, { top: 1, ...fine }))
    // the arm on this side swings with the other leg; with a bag, the hand on its strap
    const top = hipU + b.torso, holds = bag && sd < 0
    const swing = holds ? 0.15 : g.swing * Math.cos(t + Math.PI) + (sd > 0 ? wave : 0), bend = holds ? 1.4 : g.elbow + (sd > 0 ? wave * 0.6 : 0)
    const shoulder = w3(g.lean, sd * b.shoulder, top), elbow = w3(g.lean + Math.sin(swing) * b.arm, sd * (b.shoulder + 0.02), top - Math.cos(swing) * b.arm)
    const hand = w3(g.lean + Math.sin(swing) * b.arm + Math.sin(swing + bend) * b.fore, sd * (b.shoulder + 0.03), top - Math.cos(swing) * b.arm - Math.cos(swing + bend) * b.fore)
    const cuff = lerp3(shoulder, elbow, 0.55)
    sh.push(stick(shoulder, cuff, b.limb * 1.2, look.shirt), stick(cuff, elbow, b.limb, look.skin), stick(elbow, hand, b.limb * 0.9, look.skin), blob(hand, b.limb * 1.15, b.limb * 1.15, look.skin))
    if (look.cuffs) sh.push(stick(lerp3(shoulder, elbow, 0.45), cuff, b.limb * 1.25, look.cuffs, { top: 1, ...fine }))
    if (sd > 0) sh.hand = hand
  }
  const top = hipU + b.torso, waist = w3(0, 0, hipU + 0.04), chest = w3(g.lean * 0.9, 0, top - 0.07)
  sh.push(cone(waist, b.body * 0.8, chest, b.body * 1.15, look.shirt), stick(w3(g.lean, -b.shoulder, top - 0.03), w3(g.lean, b.shoulder, top - 0.03), b.limb * 1.3, look.shirt))
  // a band round the torso from f0 to f1 of the way up it (a stripe, a collar), just outside it
  const band = (f0, f1, key) => sh.push(cone(lerp3(waist, chest, f0), b.body * (0.8 + 0.35 * f0) + 0.008, lerp3(waist, chest, f1), b.body * (0.8 + 0.35 * f1) + 0.008, key, { top: 1, ...fine }))
  for (const f of look.stripes ? [0.18, 0.6] : []) band(f, f + 0.2, look.stripes)
  if (look.collar) band(0.88, 1.05, look.collar)
  if (look.skirt) {
    const wst = w3(0, 0, hipU + 0.07), hem = w3(0.04 * Math.cos(2 * th), 0, hipU - 0.36)
    sh.push(cone(wst, b.body * 0.85, hem, b.body * 2.1, look.skirt, { top: 1, wrap }))
    // the folds falling from the waist on the side toward us, and the belt
    if (px > 20) for (const a of [-1.15, -0.45, 0.3, 1.0]) {
      const ang = Math.atan2(CZ - z, CX - x) + a, c = Math.cos(ang), s = Math.sin(ang)
      sh.push(stick([wst[0] + c * b.body * 0.8, wst[1] + s * b.body * 0.8, wst[2] - 0.06], [hem[0] + c * b.body * 2.05, hem[1] + s * b.body * 2.05, hem[2] + 0.03], 0.005, look.fold, { top: 2, ...fine }))
    }
    if (look.belt) sh.push(cone(w3(0, 0, hipU + 0.05), b.body * 0.92, w3(0, 0, hipU + 0.1), b.body * 0.9, look.belt, { top: 2, ...fine }))
  } else sh.push(cone(w3(0, 0, hipU - 0.1), b.hipw + b.limb * 1.1, w3(0, 0, hipU + 0.06), b.body * 0.85, look.waist ?? look.shirt))
  // a bag on the left shoulder, hanging at the hip by its strap
  if (bag) {
    const [p, q] = [w3(-0.1, -(b.hipw + 0.17), 0), w3(0.12, -(b.hipw + 0.1), 0)]
    sh.push(box([Math.min(p[0], q[0]), Math.min(p[1], q[1]), Math.max(p[0], q[0]), Math.max(p[1], q[1]), hipU - 0.14, hipU + 0.08], bag),
      stick(w3(g.lean - 0.02, -b.shoulder * 0.8, top - 0.01), w3(0.01, -(b.hipw + 0.13), hipU + 0.08), 0.012, bag.shade, { top: 2 }))
  }
  const head = w3(g.lean * 1.2, 0, top + b.neck), back = (k) => w3(g.lean * 1.2 - k * b.head, 0, top + b.neck + 0.35 * b.head)
  sh.push(stick(w3(g.lean, 0, top - 0.02), head, b.limb * 0.9, look.skin), blob(head, b.head, b.head * 1.08, look.skin, { top: 2 }),
    blob(back(0.35), b.head * (look.curls ? 1.12 : 0.95), b.head * (look.curls ? 0.95 : 0.8), look.hair, { top: 3 }))
  if (look.fringe) sh.push(blob(w3(g.lean * 1.2 + b.head * 0.55, 0, top + b.neck + b.head * 0.6), b.head * 0.7, b.head * 0.3, look.hair, { top: 4, ...fine }))
  // the face, if it's toward us and big enough: eyes, a mouth open laughing; a moustache
  if (b.head * px >= 2.4) for (const sd of [-1, 1]) {
    const e = w3(g.lean * 1.2 + b.head * 0.88, sd * b.head * 0.42, top + b.neck - b.head * 0.05)
    if (facing(e[0], e[1], e[0] - head[0], e[1] - head[1])) sh.push(blob(e, 0.003, 0.003, look.eyes ?? "0", { top: 5, ...fine }))
  }
  if (look.mouth && b.head * px >= 2.4 && facing(head[0], head[1], hx, hz)) sh.push(blob(w3(g.lean * 1.2 + b.head * 0.9, 0, top + b.neck - b.head * 0.5), 0.003, 0.003, look.mouth, { top: 5, ...fine }))
  if (look.moustache && facing(head[0], head[1], hx, hz)) sh.push(blob(w3(g.lean * 1.2 + b.head * 0.95, 0, top + b.neck - b.head * 0.42), b.head * 0.4, b.head * 0.13, look.moustache, { top: 5, ...fine }))
  if (tail) sh.push(stick(back(0.8), w3(g.lean * 1.2 - b.head * 1.6, Math.sin(th * 2) * 0.04, top + b.neck - 0.12), 0.035, look.hair))
  if (hat) sh.push(blob(w3(g.lean * 1.2, 0, top + b.neck + b.head * 0.7), b.head * 2.1, b.head * 0.35, look.hat, { top: 4 }), blob(w3(g.lean * 1.2, 0, top + b.neck + b.head * 1.1), b.head * 1.05, b.head * 0.55, look.hat, { top: 5 }))
  if (hat && look.band) sh.push(blob(w3(g.lean * 1.2, 0, top + b.neck + b.head * 0.88), b.head * 1.1, b.head * 0.17, look.band, { top: 6, ...fine }))
  if (look.bell && wave) sh.push(blob(sh.hand, 0.035, 0.045, look.bell, { top: 6, ...fine }))
  return sh
}
// the dog, trotting: diagonal legs together, the tail up and wagging; white paws, a collar, an eye
function dog({ x, z, heading: [hx, hz], phase }) {
  const th = phase * Math.PI * 2, w3 = (f, r, u) => [x + f * hx + r * hz, z + f * hz - r * hx, u], sh = [], fine = { noShadow: true }
  for (const [f, sd, off] of [[0.22, -1, 0], [0.22, 1, 0.5], [-0.27, -1, 0.5], [-0.27, 1, 0]]) {
    const t = th + off * Math.PI * 2, ff = 0.13 * Math.cos(t), lift = 0.08 * Math.max(0, -Math.sin(t)), knee = w3(f + ff * 0.5 - (f < 0 ? 0.04 : 0), sd * 0.08, 0.2 + lift * 0.5), paw = w3(f + ff, sd * 0.08, lift + 0.02)
    sh.push(stick(w3(f, sd * 0.08, 0.4), knee, 0.045, f < 0 ? "$" : "%"), stick(knee, paw, 0.035, "%"), stick(lerp3(knee, paw, 0.7), paw, 0.036, "+", { top: 1, ...fine }))
  }
  const bob = 0.015 * Math.cos(th * 2), muzzle = w3(0.62, 0, 0.6 + bob)
  sh.push(stick(w3(-0.3, 0, 0.44 + bob), w3(0.24, 0, 0.47 + bob), 0.11, "%"), blob(w3(0.24, 0, 0.42 + bob), 0.12, 0.13, "+"),
    stick(w3(0.26, 0, 0.5 + bob), w3(0.42, 0, 0.64 + bob), 0.06, "%"), blob(w3(0.45, 0, 0.66 + bob), 0.1, 0.09, "%", { top: 2 }),
    stick(w3(0.5, 0, 0.64 + bob), muzzle, 0.045, "+", { top: 3 }), blob(muzzle, 0.025, 0.022, "0", { top: 4, ...fine }),
    stick(w3(0.3, 0, 0.53 + bob), w3(0.34, 0, 0.58 + bob), 0.068, "!", { top: 1, ...fine }))
  for (const sd of [-1, 1]) {
    sh.push(stick(w3(0.42, sd * 0.06, 0.72 + bob), w3(0.4, sd * 0.08, 0.82 + bob), 0.025, "$", { top: 3 }))
    const e = w3(0.51, sd * 0.06, 0.69 + bob)
    if (facing(e[0], e[1], sd * hz + hx * 0.5, -sd * hx + hz * 0.5)) sh.push(blob(e, 0.003, 0.003, "0", { top: 5, ...fine }))
  }
  sh.push(stick(w3(-0.3, 0, 0.5 + bob), w3(-0.42, 0.06 * Math.sin(th * 4), 0.74 + bob), 0.03, "%"))
  sh.collar = w3(0.36, 0, 0.6 + bob)
  return sh
}
const LOOKS = {
  // a Flamengo shirt, red and black, and navy shorts; the other a Brazil one: yellow, green collar and
  // cuffs, blue shorts; white socks
  runner: { skin: "7", shirt: "y", stripes: "0", thigh: "U", waist: "U", shin: "7", socks: "1", shoe: "1", hair: "9", curls: true, mouth: "x" },
  chaser: { skin: "6", shirt: "Z", collar: "V", cuffs: "V", thigh: "v", waist: "v", shin: "6", socks: "1", shoe: "1", hair: "8", fringe: true, mouth: "x" },
  swinger: { skin: "5", shirt: "!", thigh: "!", waist: "!", shin: "5", shoe: "U", hair: "8" },
  // a coral sundress, its folds and a straw belt; a straw hat with a coral band
  woman: { skin: "6", shirt: "X", skirt: "X", fold: "Y", belt: "&", thigh: "6", shin: "6", shoe: "Y", hair: "9", hat: "@", band: "Y" },
  vendor: { skin: "8", shirt: "1", waist: "1", thigh: "1", shin: "1", shoe: "0", hair: "9", hat: "y", collar: "y", moustache: "9", bell: "z" },
}
const BODY_RAMPS = ["xy", "zZ", "0U", "WV", "YX", "&@", "876", "765", "65", "21", "$%+", "98", "vw"]

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
  const woman = person(WOMAN, { ...wp, phase: (frame % 10) / 10, gait: "walk", look: LOOKS.woman, hat: true, tail: true, bag: { top: "@", lit: "@", shade: "&" } })
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
  tree(3, 17.3, { tall: 8, crown: 3.2, seed: 3 }), tree(16, 31, { tall: 7, crown: 2.6, ipe: true, seed: 5 }),
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
// Tall grass where neither mower nor edger reaches, swaying like the weeds under the trees: the stretch
// left to grow on the left lawn, and along the paths' edges. Each clump is sorted on its own, so whoever
// walks by passes in front of or behind it.
const WILD = (() => {
  const r = rng(77), out = []
  for (let i = 0; i < 34; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()), x = MEADOW[0] + Math.cos(a) * d * MEADOW[2], z = MEADOW[1] + Math.sin(a) * d * MEADOW[3]
    if (inMeadow(x, z)) out.push(weed(r, x, z, 0.6 + r() * 0.4, 0.9))
  }
  // along the paths, a panel's length here and there the edger missed, grown tall over the edge (which
  // path, which edge, which panel); and a clump at a joint now and then
  const edges = [(a) => [a, PATH_A[0] - 0.08], (a) => [a, PATH_A[1] + 0.08], (a) => [PATH_B[0] - 0.08, a], (a) => [PATH_B[1] + 0.08, a]]
  const spot = (x, z) => ahead(x, z) > 3 && ahead(x, z) < 14 && !paved(x, z) && !inRect(x, z, SAND) && !worn(x, z) && distSeg(x, z, SHORTCUT) > 0.6
  for (const [e, from] of [[1, JOINTS_A[0]], [0, JOINTS_A[10]], [3, JOINTS_B[1]], [3, JOINTS_B[11]], [1, JOINTS_A[11]]])
    for (let a = 0.08; a < SLAB; a += 0.17) { const [x, z] = edges[e](from + a); if (spot(x, z)) out.push(weed(r, x, z, 0.45, 1.2)) }
  for (const e of [0, 1, 2, 3]) for (const j of e < 2 ? JOINTS_A : JOINTS_B) {
    const [x, z] = edges[e](j)
    if (spot(x, z) && !(e === 2 && z > 10 && z < 18) && hash(Math.round(j * 10) + 40, e) < 0.3) out.push(weed(r, x, z, 0.5, 1.4))
  }
  return out
})()

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
    const seed = Math.round(x * 13 + z) & 0xffff, opts = { tall, spread: 1.3, depth: 2, size: 1.1, per: 4 }, t = grow(seed, opts)
    paintTree(c, x, z, { ...t, ...foliage(seed, t, opts) }, "<<ST>", "<<<SST")
  }
}
// Clouds, drifting: two lanes of cumulus, the far one lower, smaller, flatter and slower. A lane is a
// row of slots S px apart; over the loop each slot drifts one slot over and its cloud slowly turns into
// the next slot's cloud, so the sky at the end is the sky at the start and no cloud jumps.
const LANES = [{ y: 22, S: 130, w: 66, h: 16, n: 4, seed: 3, x0: 0 }, { y: 45, S: 80, w: 30, h: 7, n: 3, seed: 8, x0: 41 }]
const DESIGNS = LANES.map((L) => Array.from({ length: L.n }, (_, i) => {
  const r = rng(L.seed * 31 + i)
  return Array.from({ length: 7 }, () => [(r() - 0.5) * L.w * 0.85, -r() * L.h * 0.45, L.h * (0.32 + r() * 0.3)])
}))
function clouds(c, frame) {
  const t = frame / FRAMES
  LANES.forEach((L, li) => {
    const D = DESIGNS[li], at = (j) => D[((j % L.n) + L.n) % L.n]
    for (let j = -2; (j - 1) * L.S < W + L.w; j++) {
      const a = at(j), b = at(j + 1)
      cloud(c, L.x0 + (j + t) * L.S, L.y, a.map((p, k) => p.map((v, m) => v + (b[k][m] - v) * t)), L.h)
    }
  })
}
// a cumulus: puffs cut flat at its base; white where the sun is on it, a light gray lower down and
// along its right side, a bluer gray along the base
function cloud(c, cx, base, puffs, h) {
  const px = new Map()
  for (const [dx, dy, r] of puffs)
    for (let y = Math.floor(base + dy - r); y <= base; y++)
      for (let x = Math.floor(cx + dx - r); x <= Math.ceil(cx + dx + r); x++)
        if (x >= 0 && x < W && y >= 0 && (x + 0.5 - cx - dx) ** 2 + (y + 0.5 - base - dy) ** 2 <= r * r) px.set(y * W + x, [x, y])
  for (const [i, [x, y]] of px) {
    const right = !px.has(i + 1), key = y >= base ? "H" : y >= base - h * 0.3 || right ? "G" : "F"
    c.px(x, y, key)
  }
}

// a hopscotch chalked on the plaza: squares, pairs, and the sky at the end, every line on the axes
function hopscotch(c) {
  const x0 = 5.6, z0 = 2.4, sq = 0.45
  const cell = (x, z) => { for (const [a, b, cc, d] of [[x, z, x + sq, z], [x + sq, z, x + sq, z + sq], [x + sq, z + sq, x, z + sq], [x, z + sq, x, z]]) seg(c, a, b, cc, d, 0, "1") }
  let z = z0
  for (const pair of [false, true, false, true, false, true]) {
    if (pair) { cell(x0, z); cell(x0 + sq, z) } else cell(x0 + sq / 2, z)
    z += sq
  }
  const n = 8, pts = Array.from({ length: n + 1 }, (_, i) => [x0 + sq / 2 + sq / 2 + Math.cos((i / n) * Math.PI) * sq * 0.9, z + Math.sin((i / n) * Math.PI) * sq * 0.9])
  for (let i = 0; i < n; i++) seg(c, ...pts[i], ...pts[i + 1], 0, "1")
}
// fallen ipê flowers on the grass under their trees; leaves on the path under the big tree
function decals(c) {
  const r = rng(91)
  for (let i = 0; i < 70; i++) {
    const z = 13.5 + r() * 8, x = PATH_B[0] + 0.15 + r() * (PATH_B[1] - PATH_B[0] - 0.3), [px, py] = at(x, z)
    if (ahead(x, z) > 22) continue
    const k = r() < 0.5 ? "o" : r() < 0.6 ? "q" : "(", long = r() < 0.5
    c.px(px, py, k); if (long) c.px(px + 1, py, k)
  }
  // near, on the paths, a few dry leaves and ipê flowers the wind brought
  for (let i = 0; i < 40; i++) {
    const onA = r() < 0.5, a = r() * 6, x = onA ? a - 1 : PATH_B[0] + 0.1 + r() * 2, z = onA ? PATH_A[0] + 0.1 + r() * 2 : a - 1
    if (!paved(x, z) || inRect(x, z, PLAZA) || ahead(x, z) > 7 || ahead(x, z) < 1) continue
    const [px, py] = at(x, z), k = r() < 0.35 ? "t" : r() < 0.5 ? "(" : "["
    c.px(px, py, k); c.px(px + 1, py, k); if (r() < 0.5) c.px(px + (r() < 0.5 ? 2 : -1), py + (r() < 0.5 ? 1 : -1), k === "t" ? "s" : ")")
  }
  for (const t of STATIC) {
    if (!t.ipe) continue
    const r = rng(t.seed + 50)
    for (let i = 0; i < 260; i++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * t.crown * 1.4, [x, y] = at(t.x + Math.cos(a) * d + 0.8, t.z + Math.sin(a) * d - 0.4)
      if (y > P.horizon && "abcde".includes(c.key(x, y))) c.px(x, y, r() < 0.5 ? "t" : "u")
    }
  }
}

// the sky on its own, the clouds drift over it each frame, the rest of the picture over them
sprite("_sky", { w: W, h: P.horizon + 1 }, grad(0, 0, W, P.horizon + 1, "ABCDE", "v"))
sprite("_bg", { w: W, h: H },
  (c) => city(c),
  (c) => treeline(c),
  plane(P, (x, z) => ground(x + CX, z + CZ)),
  (c) => paving(c),
  (c) => details(c),
  (c) => { const out = new Set(); for (const s of STATIC) cast(out, s.shapes); darken(c, out) },
  (c) => decals(c),
  (c) => hopscotch(c))

// each still thing on a sprite of its own, lit once; the scene interleaves them with the moving ones
// (cropped to what it draws, its pivot the canvas corner, so stamping it at 0, 0 copies only its pixels)
for (const s of STATIC)
  sprite("_s" + s.id, { w: W, h: H, crop: true, pivot: [0, 0] }, (c) => {
    if (s.paint) s.paint(c)
    else {
      drawShapes(c, s.shapes.filter((q) => !q.umbrella && !q.poly), s.ramps)
      for (const q of s.shapes) {
        if (q.umbrella) umbrella(c, q.umbrella)
        if (q.poly) c.poly(q.poly.flatMap((p) => at(...p)), q.key)
      }
    }
    // the taller grass at its foot, in front of it
    for (const [x, z] of s.fringe ?? []) {
      const sc = P.scale(ahead(x, z)), [px, py] = at(x, z), h = hash(Math.round(x * 100), Math.round(z * 100))
      tuft(c, px, py, 0.26 * sc * (0.75 + h * 0.5), 4 + Math.floor(h * 3), Math.round(x * 977 + z * 31))
    }
  })

anim("park", { w: W, h: H, frames: FRAMES, fps: FPS },
  stamp("_sky", 0, 0),
  (c) => clouds(c, c.frame),
  stamp("_bg", 0, 0),
  (c) => {
    const moving = figures(c.frame), out = new Set()
    for (const m of moving) cast(out, m.shapes)
    for (const i of out) { const x = i % W, y = (i - x) / W, k = c.key(x, y); if (SHADE[k] && !"cdhjl]".includes(k)) c.px(x, y, SHADE[k]) }
    const all = [...STATIC.map((s) => ({ d: s.d, still: s })), ...STATIC.filter((s) => s.weeds).map((s) => ({ d: s.d - 0.02, weeds: s.weeds })), ...WILD.map((w) => ({ d: ahead(w.x, w.z), weeds: [w] })), ...moving].sort((m, n) => n.d - m.d)
    for (const m of all) {
      if (m.still) { c.stamp("_s" + m.still.id, 0, 0); continue }
      if (m.weeds) { sway(c, m.weeds, c.frame); continue }
      const big = P.scale(m.d) * 1.2 > 14
      drawShapes(c, m.shapes, big ? BODY_RAMPS : undefined)
      if (m.leash) { const [hx, hy, cx, cy] = m.leash, mx = Math.round((hx + cx) / 2), my = Math.round((hy + cy) / 2) + 1; c.line(hx, hy, mx, my, "!"); c.line(mx, my, cx, cy, "!") }
    }
  })
