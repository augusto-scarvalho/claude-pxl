// True perspective, one point: a road across the sertão at sunset, and someone walking away along it,
// getting smaller step by step (two-point perspective: park.px.js). Everything is placed in meters (x across, z ahead, up) and projected by
// perspective(), so a cactus, a fence post or a boulder is the size it should be where it stands;
// plane() draws the ground pixel by pixel from where each pixel looks.
pal({
  // sky, top down to the sun
  N: "#1b1f4a", n: "#2e2a66", v: "#5b3a7a", m: "#a3466e", O: "#e0704a", o: "#f2a050", y: "#ffd27a", Y: "#ffe9a8", w: "#fff3c4",
  // haze, and the serras on the horizon (far, near)
  h: "#c98a6a", H: "#e6b089", i: "#8e5a6a", I: "#64405a",
  // dry red earth, near to far (the sandy patches one step up), and the shade on it, cooler
  Z: "#170f19", z: "#251a24", g: "#3b2824", G: "#4f3530", J: "#6b4738",
  d: "#17141f", D: "#2a2130", e: "#4a3440", E: "#6e4a50",
  // the road and its paint
  a: "#221e28", A: "#3a3040", b: "#6a4c58", B: "#9a6a66", l: "#c9b796", L: "#8a6e6a",
  // wood: posts, poles, the windmill, near to far
  k: "#120f1c", K: "#2e2438", j: "#5c4250",
  // cactus (mandacaru, xique-xique), its red fruit; shrub twigs; juazeiro leaves; rock; dry grass
  c: "#111a17", C: "#1f2e27", f: "#c23a3a", t: "#21171c", u: "#7a5646", q: "#142017", Q: "#22331f",
  x: "#1c1519", X: "#2e2228", V: "#6e4a44", F: "#9a7840",
  // the far house: walls, roof, the lit window
  p: "#4a302c", "0": "#6a3a2e", W: "#ffcf6a",
  // the walker drawn near: hat, skin, shirt, trousers, boots and hair, pack, bedroll, soles
  1: "#33201a", 2: "#3d2526", 3: "#2a2638", 4: "#1a1624", 5: "#0f0c14", 6: "#3c2a22", 7: "#4a2228", U: "#6c4c56",
  // the walker drawn small: body, pack, and far in the haze
  S: "#140f1d", P: "#2c2024", T: "#3a2c40",
  // rim light: the low sun on every edge that faces it
  r: "#f2a45c", R: "#ffd890",
})
ramps("NnvmOoyYw")

const W = 320, H = 180, FPS = 10, PER_STEP = 4, STEPS = 62, FRAMES = PER_STEP * STEPS
// the eye 1.6 m above the road, the horizon on row 72, a 150 px focal length (about 94 degrees across)
const P = perspective({ w: W, horizon: 72, eye: 1.6, focal: 150 })
const at = (x, z, up = 0) => P.ground(x, z, up).map(Math.round)     // a point in meters, on screen
// aerial perspective: the farther, the closer to the haze, one key per band of depth
const band = (z, edges) => { let i = 0; while (i < edges.length && z >= edges[i]) i++; return i }
const FAR = [10, 30, 90], NEAR = [18, 50, 130]                     // the ground's bands; the props'
const ROAD = "aAbB", SOIL = [["g", "G"], ["G", "J"], ["J", "E"], ["E", "h"]], PAINT = "llLL", POST = "kKjh"
const HAZE = [null, null, "I", "i"]                                // what props turn into, far off
const ROAD_HALF = 3.6, PAINT_W = 0.12, FENCE_X = -6, POLE_X = 6.6
// the sun, low ahead: 10 degrees up, so a thing's shadow is 5.7 times its height, and 6 degrees left of the road
const SR = 9, SUN_AZ = -6, SUNX = Math.round(P.vp + P.focal * Math.tan((SUN_AZ * Math.PI) / 180)), SUNY = P.horizon - 3, LONG = 1 / Math.tan((10 * Math.PI) / 180)
const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5], bayer = (x, y) => (B4[(y & 3) * 4 + (x & 3)] + 0.5) / 16
// smooth noise, for the serras' ridges and the sandy patches (in meters, so it recedes like the rest)

// ================================================================ sky
// a gradient to the sun, the evening star, long thin clouds lit from underneath
const CLOUDS = [[12, 17, 74, "n", "v"], [188, 24, 112, "v", "m"], [36, 37, 150, "v", "m"], [214, 45, 84, "m", "O"], [92, 53, 60, "m", "O"]]
sprite("_sky", { w: W, h: P.horizon + 1 },
  grad(0, 0, W, P.horizon + 1, "NnvmOoy", "v"),
  px(52, 8, "Y"), px(51, 8, "v"), px(53, 8, "v"), px(52, 7, "v"), px(118, 15, "v"), px(270, 6, "v"),
  (c) => {
    for (const [x, y, len, body, under] of CLOUDS) {
      c.hline(x + Math.round(len * 0.3), y - 1, Math.round(len * 0.4), body)
      c.hline(x, y, len, body)
      c.hline(x + Math.round(len * 0.12), y + 1, Math.round(len * 0.7), under)
    }
  })

// the sun's aura: three faint halo rings, stepped, with a checker only on their 1 px edges; the outer
// two breathe by under a pixel over the loop. A ring only ever lightens. (As in sunset/sunset.px.js.)
const SKY_RAMP = "NnvmOoyYw"
anim("_aura", { w: 240, h: 47, frames: FRAMES, fps: FPS }, grad(0, 0, 240, 94, "yoO.", "r"), (c) => {
  const cx = 120, cy = 47, rings = [["Y", SR + 2, 0, true], ["y", SR + 6, 0.5], ["o", SR + 11, 0.75]]
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    const d = Math.hypot(x - cx, (y - cy) * 1.3)                  // flattened: the glow spreads along the horizon
    for (const [i, [k, r0, swell, checker]] of rings.entries()) {
      const r = r0 + swell * Math.sin((c.phase - i * 0.12) * Math.PI * 2), on = (x + y) % 2 === 0
      if (d < r + 0.5 && (on || (!checker && d < r - 0.5))) {
        if (SKY_RAMP.indexOf(k) > SKY_RAMP.indexOf(c.key(x, y))) c.px(x, y, k)
        break
      }
    }
  }
})

// the sun, going down into a pass between the serras. The thin bands across it are clouds in front:
// they drift and come and go.
anim("_sun", { w: 60, h: 2 * SR + 3, frames: FRAMES, fps: FPS }, (c) => {
  const cx = 30, cy = SR + 1                                       // the centre: (SUNX, SUNY)
  c.circ(cx, cy, SR, "Y"); c.circ(cx - 1, cy - 1, SR - 4, "w")
  ;[[-20, -5, 24, "o"], [-8, -2, 22, "o"], [6, 1, 16, "y"]].forEach(([dx, dy, len, key], i) => {
    const age = (c.phase - i / 3 + 1) % 1, n = Math.round(len * Math.min(1, 1.5 * Math.sin(age * Math.PI)))
    if (n > 0) c.hline(cx + dx - 12 + Math.floor(24 * age) + ((len - n) >> 1), cy + dy, n, key)
  })
})

// urubus circling high over the road, twice a loop, now and then a wingbeat
const BIRDS = [[90, 38, 14, 0], [108, 44, 10, 0.4], [76, 47, 12, 0.72]]
function vultures(c) {
  for (const [cx, cy, rad, ph] of BIRDS) {
    const a = (2 * c.phase + ph) * 2 * Math.PI, x = Math.round(cx + rad * Math.cos(a)), y = Math.round(cy + rad * 0.35 * Math.sin(a))
    c.grid(x - 2, y, (c.frame + Math.round(ph * 50)) % 50 < 3 ? ".kkk.\nk...k" : "k...k\n.kkk.")
  }
}

// ================================================================ the land
// Serras kilometers off, in meters like the rest: a long serra 30 km away, up to 1100 m (5 px over the
// horizon), and nearer, 12 km off, a chapada: a table mountain 600 m high (7 px) with a flat top and
// steep sides, on the left; rolling hills on the right. They part in a pass where the sun goes down,
// and the far ridge's edge catches the glow near the sun.
const smooth = (a, b, t) => { const u = Math.max(0, Math.min(1, (t - a) / (b - a))); return u * u * (3 - 2 * u) }
const RIDGES = [
  [30000, "i", (X) => 1100 * (0.35 + 0.65 * vnoise(X / 6000, 3)) * smooth(1500, 7000, Math.abs(X))],
  [12000, "I", (X) => Math.max(600 * smooth(-2600, -3000, X) * smooth(-10500, -9800, X) * (1 + 0.04 * vnoise(X / 300, 5)),
    X > 1200 ? 420 * vnoise(X / 2200, 8) * smooth(1200, 3500, X) : 0)],
]
function serras(c) {
  for (const [Z, key, height] of RIDGES)
    for (let col = 0; col < W; col++) {
      const y = Math.round(P.horizon - (P.focal * height(((col + 0.5 - SUNX) * Z) / P.focal)) / Z)
      if (y >= P.horizon) continue
      c.vline(col, y, P.horizon - y + 1, key)
      if (key === "i" && Math.abs(col - SUNX) < 60) c.px(col, y, "m")
    }
}

function ground(x, z) {
  if (z > 400) return "h"
  const b = band(z, FAR), ax = Math.abs(x), paint = Math.max(PAINT_W, (z / P.focal) * 0.6)
  if (ax < ROAD_HALF) {
    // the center dashes, 3.5 m in 12 and one worn away now and then; the edge lines
    const dash = ax < paint && z % 12 < 3.5 && Math.floor(z / 12) % 5 !== 3
    return dash || Math.abs(ax - ROAD_HALF + 0.3) < paint ? PAINT[b] : ROAD[b]
  }
  if (ax < ROAD_HALF + 1) return SOIL[b][1]                                        // the gravel shoulder
  return SOIL[b][z < 30 && vnoise(x / 6, z / 8) > 0.72 ? 1 : 0]                     // sand patches; far, one tone
}

// ---------------------------------------------------------------- the old asphalt
// Wear with causes, after the FHWA distress manual, each where it happens on a road like this one:
// - fatigue ("alligator") cracking in the wheel paths: a net of sharp-angled pieces under 0.3 m;
// - transverse cracks across the lanes, kinking, with short branches; one sealed with tar, glossy;
// - a crack along the paving joint at the center line;
// - edge cracking, which only an unpaved shoulder gets: crescents within 0.6 m of the edge, some
//   broken away so the edge is gnawed and the gravel shows;
// - potholes, where alligatored asphalt came loose.
// Every crack is a walk in meters, projected and drawn as 1 px lines, so it stays a clean line and
// thins into the distance; none much past 20 m, where a crack across the road would flatten into a
// stripe: from there on, only the edge's wear still reads.
const CRACK = "kaAb", SEAL = "AbBB"
// a crack: short steps that keep their heading but kink now and then, branching off at a slant.
// The heading is in the ground plane: 0 runs across (+x), PI/2 runs ahead (+z).
function walk(r, x, z, ang, len, out, depth = 0) {
  const pts = [[x, z]], step = 0.07
  let a = ang
  for (let d = 0; d < len; d += step) {
    a += (r() - 0.5) * 0.5 + (r() < 0.1 ? (r() - 0.5) * 1.6 : 0) + (ang - a) * 0.2
    x += Math.cos(a) * step; z += Math.sin(a) * step
    if (Math.abs(x) > ROAD_HALF - 0.03) break
    pts.push([x, z])
    if (depth < 2 && r() < 0.045) walk(r, x, z, a + (r() < 0.5 ? -1 : 1) * (0.7 + r() * 0.7), len * (0.1 + r() * 0.2), out, depth + 1)
  }
  out.push(pts)
}
const ASPHALT = (() => {
  const r = rng(23), lines = [], sealed = [], holes = [], gnawed = []
  // alligator cracking in the wheel paths: a jittered net of pieces, complete in the middle of the
  // patch and breaking up toward its edges, with the long cracks it grew from running through it
  for (const [x0, x1, z0, z1] of [[1.5, 2.8, 2.3, 4.6], [-2.9, -1.8, 7, 10]]) {
    const cell = 0.3, nx = Math.round((x1 - x0) / cell), nz = Math.round((z1 - z0) / cell), node = []
    for (let i = 0; i <= nx; i++) for (let j = 0; j <= nz; j++) node[i * (nz + 1) + j] = [x0 + (i + (r() - 0.5) * 0.7) * cell, z0 + (j + (r() - 0.5) * 0.7) * cell]
    const keep = (i, j) => { const u = (i / nx) * 2 - 1, v = (j / nz) * 2 - 1; return r() > 0.3 + 0.7 * (u * u + v * v) ** 2 }
    for (let i = 0; i <= nx; i++) for (let j = 0; j <= nz; j++) {
      const a = node[i * (nz + 1) + j]
      for (const [di, dj] of [[1, 0], [0, 1]]) {
        if (i + di > nx || j + dj > nz || !keep(i, j)) continue
        const b = node[(i + di) * (nz + 1) + j + dj], m = [(a[0] + b[0]) / 2 + (r() - 0.5) * 0.06, (a[1] + b[1]) / 2 + (r() - 0.5) * 0.06]
        lines.push([a, m, b])
      }
    }
    for (const x of [x0 + 0.25, x1 - 0.25]) walk(r, x, z0 - 0.4, Math.PI / 2, z1 - z0 + 0.8, lines)
  }
  // transverse cracks, from an edge across one lane or both
  for (const [z, from, len] of [[3.4, -1, 3.3], [5.6, 1, 7.2], [9.6, -1, 3.4], [16.5, 1, 7.2]])
    walk(r, from * (ROAD_HALF - 0.05), z, from > 0 ? Math.PI + (r() - 0.5) * 0.2 : (r() - 0.5) * 0.2, len, lines)
  walk(r, -ROAD_HALF + 0.05, 13.4, 0.05, 7.2, sealed)                    // this one was sealed with tar
  // along the joint between the two lanes, in pieces
  for (const [z0, len] of [[4, 5], [12, 7]]) walk(r, 0.09, z0, Math.PI / 2, len, lines)
  // edge cracking: crescents on both edges; some broken away to the gravel
  for (const sd of [-1, 1]) for (let z = 2.4; z < 28; z += 1.2 + r() * 3) {
    const len = 0.6 + r() * 1.2, deep = 0.15 + r() * 0.4, pts = []
    for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push([sd * (ROAD_HALF - deep * Math.sin(Math.PI * t) * (0.8 + r() * 0.4)), z + len * t]) }
    ;(r() < 0.4 ? gnawed : lines).push(pts)
  }
  // potholes: a ragged bowl, and the cracks running out from it
  for (const [x, z, rad] of [[-1.5, 6.2, 0.36], [2.3, 14, 0.3]]) {
    const rim = []
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2, d = rad * (0.75 + r() * 0.5); rim.push([x + Math.cos(a) * d, z + Math.sin(a) * d * 0.8]) }
    holes.push(rim)
    for (let i = 0; i < 4; i++) { const a = r() * Math.PI * 2; walk(r, x + Math.cos(a) * rad, z + Math.sin(a) * rad * 0.8, a, 0.3 + r() * 0.6, lines) }
  }
  return { lines, sealed, holes, gnawed }
})()

function asphalt(c) {
  const key = (z, keys) => keys[band(z, FAR)], near = (pts) => pts.some(([, z]) => z < 25)
  // broken edges first: the gravel shows where the crescent came away, a dark lip along the break
  for (const pts of ASPHALT.gnawed) {
    if (!near(pts)) continue
    const z = pts[0][1], edge = Math.sign(pts[0][0]) * (ROAD_HALF + 0.05)
    c.poly([...pts, [edge, pts[pts.length - 1][1]], [edge, z]].flatMap(([x, zz]) => at(x, zz)), SOIL[band(z, FAR)][1])
    for (let i = 1; i < pts.length; i++) c.line(...at(...pts[i - 1]), ...at(...pts[i]), key(z, CRACK))
  }
  // sealed: a band of tar wider than the crack, glossy with the sky in it
  for (const pts of ASPHALT.sealed)
    for (let i = 1; i < pts.length; i++) {
      const [a, b] = [at(...pts[i - 1]), at(...pts[i])], z = pts[i][1]
      c.line(...a, ...b, key(z, SEAL), Math.max(1, Math.round(0.07 * P.scale(z))))
    }
  for (const pts of ASPHALT.lines) {
    if (!near(pts)) continue
    for (let i = 1; i < pts.length; i++) c.line(...at(...pts[i - 1]), ...at(...pts[i]), key(pts[i][1], CRACK))
  }
  // near, the crack's far lip catches the light: a broken line of lighter asphalt just above it
  const lip = rng(31)
  for (let y = at(0, 8)[1]; y < H; y++)
    for (let x = 0; x < W; x++) if (c.key(x, y) === "k" && c.key(x, y - 1) === "a" && lip() < 0.5) c.px(x, y - 1, "A")
  // potholes: the bowl dark, its far wall (the side facing us) a step up, loose gravel in the bottom
  for (const rim of ASPHALT.holes) {
    const z = rim.reduce((s, [, zz]) => s + zz, 0) / rim.length, pts = rim.map(([x, zz]) => at(x, zz))
    c.poly(pts.flat(), "k")
    const ys = pts.map(([, y]) => y), top = Math.min(...ys), bot = Math.max(...ys), xs = pts.map(([x]) => x)
    for (let y = top; y < top + Math.max(1, Math.round((bot - top) * 0.3)); y++)
      for (let x = Math.min(...xs); x <= Math.max(...xs); x++) if (c.key(x, y) === "k" && c.key(x, y - 1) !== "k") c.px(x, y, key(z, "Zzgg"))
    const r = rng(Math.round(z * 100))
    for (let i = 0; i < (bot - top) * 2; i++) {
      const x = Math.round(Math.min(...xs) + r() * (Math.max(...xs) - Math.min(...xs))), y = Math.round(top + (0.45 + r() * 0.5) * (bot - top))
      if (c.key(x, y) === "k") c.px(x, y, r() < 0.5 ? "Z" : "G")
    }
  }
}

// ---------------------------------------------------------------- things on the land
// A thing is built once as parts in meters from its foot: sticks { a: [x, z, up], b: [x, z, up], half,
// key } (round, `half` m thick: trunks, arms, stems, twigs, blades, posts, wires) and blobs { e: [x, z,
// up], rx, ry, key } (crowns, boulders). The same parts draw it and cast its shadow, so a mandacaru's
// shadow has its arms, a shrub's has its twigs, the walker's has their legs.
const stick = (x0, u0, x1, u1, half, key, z0 = 0, z1 = z0) => ({ a: [x0, z0, u0], b: [x1, z1, u1], half, key })
const blob = (x, u, rx, ry, key, z = 0) => ({ e: [x, z, u], rx, ry, key })   // + ghost: casts only; dapple: the share of its shadow that is shade

// Real sizes: mandacaru 3-6 m, xique-xique under 1.2 m, catingueira and jurema 1.4-3.2 m, juazeiro
// 5-7 m, boulders up to 3 m, a fence post 1.2-1.5 m, a pole 9 m, the windmill 9.5 m, the house 3.4 m.
const BUILD = {
  // a columnar cactus: a trunk, arms curving out and up like a candelabra (ribs, spines, fruit: details)
  mandacaru(p, r) {
    const h = 3 + p.v * 3, parts = [stick(0, 0, 0, h, 0.21, "C")], arms = 1 + Math.floor(r() * 4)
    for (let i = 0; i < arms; i++) {
      // out from the trunk level, bending round, then straight up: the elbow is what says mandacaru
      const sd = (i + p.seed) % 2 ? 1 : -1, hb = 1.2 + r() * h * 0.38, out = 0.6 + r() * 0.5 + i * 0.12, top = Math.min(h * 0.96, hb + 1 + r() * (h - hb - 1))
      const bend = [[0.35, 0.02], [0.7, 0.1], [0.92, 0.28], [1, 0.5]].map(([a, u]) => [sd * out * a, hb + u * out])
      let [px, pu] = [0, hb]
      for (const [x, u] of bend) { parts.push(stick(px, pu, x, u, 0.15, "C")); [px, pu] = [x, u] }
      parts.push(stick(px, pu, px, top, 0.15, "C"))
    }
    return { parts, height: h, foot: [0.45, 0.35], ramp: "cCrR", ribs: true, spines: "r", fruit: true }
  },
  // xique-xique: a low cactus sprawling from one root, its stems turning up at the ends, golden spines
  xique(p, r) {
    const spread = 0.4 + p.v * 0.8, parts = [], n = 4 + Math.floor(r() * 4)
    for (let i = 0; i < n; i++) {
      const dx = (r() * 2 - 1) * spread, dz = (r() * 2 - 1) * spread * 0.5, hs = 0.35 + r() * 0.8
      parts.push(stick(dx * 0.12, 0.05, dx, 0.14, 0.065, "C", 0, dz), stick(dx, 0.14, dx * 1.08, hs, 0.065, "C", dz))
    }
    return { parts, height: 1.2, foot: [spread * 0.9, spread * 0.6], ramp: "cCrR", spines: "F" }
  },
  // coroa-de-frade: a cactus the size of a fist, with a red cap
  coroa: () => ({ parts: [blob(0, 0.1, 0.13, 0.1, "C"), blob(0, 0.22, 0.06, 0.035, "f")], height: 0.26, foot: [0.18, 0.14], ramp: "cCrR" }),
  // catingueira, jurema: leafless in the dry season, all twigs, a few dry leaves still hanging on
  shrub(p, r) {
    const h = 1.4 + p.v * 1.8, parts = []
    const grow = (x, z, u, ang, len, depth) => {
      const x1 = x + Math.sin(ang) * len, u1 = u + Math.cos(ang) * len, z1 = z + (r() - 0.5) * len * 0.6
      parts.push(stick(x, u, x1, u1, 0.017 * (depth + 1), depth > 1 ? "t" : "u", z, z1))
      if (depth === 0) { if (r() < 0.3) parts.push(blob(x1, u1, 0.07, 0.05, "F", z1)); return }
      const n = 2 + (r() < 0.35 ? 1 : 0)
      for (let i = 0; i < n; i++) grow(x1, z1, u1, ang + (i - (n - 1) / 2) * (0.5 + r() * 0.35) + (r() - 0.5) * 0.3, len * (0.62 + r() * 0.2), depth - 1)
    }
    const stems = 2 + Math.floor(r() * 2)
    for (let i = 0; i < stems; i++) grow((r() - 0.5) * 0.3, 0, 0, (i - (stems - 1) / 2) * 0.35 + (r() - 0.5) * 0.2, h * 0.38, 4)
    // the tangle as a whole: not drawn, but it casts a dappled shadow, light through the twigs
    parts.push({ ...blob(0, h * 0.62, h * 0.38, h * 0.3, "t"), ghost: true, dapple: 0.55 })
    return { parts, height: h, foot: [h * 0.34, h * 0.24], tuft: [h * 0.55, h * 0.42, h * 0.3], twigs: true }
  },
  // juazeiro: green through the drought, a short trunk forking under a heavy round crown
  jua(p, r) {
    const h = 5 + p.v * 2, parts = [stick(0, 0, 0.1, h * 0.45, 0.17, "t")]
    for (const sd of [-1, 1]) parts.push(stick(0.1, h * 0.42, sd * 1.2, h * 0.64, 0.08, "t"))
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2, rx = 1 + r() * 0.8
      parts.push(blob(Math.cos(a) * 1.7 * (0.6 + r() * 0.4), h * 0.7 + Math.sin(a) * 0.75, rx, rx * 0.72, "Q", (r() - 0.5) * 1.5))
    }
    return { parts, height: h, foot: [1.2, 0.9], ramp: "qQrR", leaves: true }
  },
  // granite boulders, one or two together; now and then a long low lajedo
  rock(p) {
    const slab = p.v > 0.92, wd = slab ? 4 + p.v * 3 : 0.4 + p.v * p.v * 2.6, ht = slab ? 0.5 : wd * 0.6
    const parts = [blob(0, ht * 0.45, wd / 2, ht / 2, "X")]
    if (!slab && p.v > 0.45) parts.push(blob(wd * 0.45, ht * 0.3, wd * 0.28, ht * 0.3, "X", -0.2))
    return { parts, height: ht, foot: [wd * 0.6, wd * 0.4], ramp: "xXVR", crack: wd > 1.2 }
  },
  // a tuft of dry grass: curved blades, darker at the foot, their tips catching the sun
  grass(p, r) {
    const parts = [], n = 4 + Math.floor(p.v * 6)
    for (let i = 0; i < n; i++) {
      const lean = (r() * 2 - 1) * 0.14, hh = 0.16 + r() * 0.32, x0 = (r() - 0.5) * 0.06, z0 = (r() - 0.5) * 0.06
      parts.push(stick(x0, 0, x0 + lean * 0.3, hh * 0.45, 0.008, "X", z0), stick(x0 + lean * 0.3, hh * 0.45, x0 + lean, hh, 0.008, "F", z0))
    }
    return { parts, height: 0.48, foot: [0.14, 0.1], tips: true }
  },
  // a crooked stake, three strands of barbed wire to the next one, sagging a little
  post(p) {
    const tall = 1.2 + p.v * 0.3, lean = (p.v - 0.5) * 0.16, kink = lean * 0.4 + 0.03, key = POST[band(p.z, FAR)], n = p.next
    const parts = [stick(0, 0, kink, tall * 0.55, 0.05, key), stick(kink, tall * 0.55, lean, tall, 0.045, key)]
    if (n && p.z < 90) for (const up of [0.35, 0.75, 1.1]) {
      const dx = n.x - p.x, dz = n.z - p.z, w = p.z < 30 ? "K" : "j"
      parts.push(stick(0, up, dx / 2, up - 0.04, 0.004, w, 0, dz / 2), stick(dx / 2, up - 0.04, dx, up, 0.004, w, dz / 2, dz))
    }
    return { parts, height: tall, foot: [0.1, 0.08] }
  },
  // a wooden power pole with its crossarm, two wires sagging to the next
  pole(p) {
    const key = POST[band(p.z, FAR)], n = p.next, parts = [stick(0, 0, 0, 9, 0.125, key), stick(-0.9, 8.4, 0.9, 8.4, 0.05, key)]
    if (n) for (const dx of [-0.8, 0.8]) for (let i = 0; i < 12; i++) {
      const sag = (s) => 8.4 - 1.6 * s * (1 - s), s0 = i / 12, s1 = (i + 1) / 12, dz = n.z - p.z
      parts.push(stick(dx, sag(s0), dx, sag(s1), 0.004, POST[band(p.z + dz * s0, FAR)], dz * s0, dz * s1))
    }
    return { parts, height: 9, foot: [0.3, 0.25] }
  },
  // a windmill pumping water: a lattice tower, the wheel of vanes, the tail
  mill(p) {
    const key = POST[band(p.z, FAR)], parts = []
    for (const sd of [-1, 1]) parts.push(stick(sd * 0.9, 0, sd * 0.15, 8.2, 0.05, key))
    for (const u of [2.4, 4.8, 6.8]) { const half = 0.9 - (0.75 * u) / 8.2; parts.push(stick(-half, u, half, u, 0.03, key)) }
    parts.push(stick(-0.6, 1.2, 0.45, 3.6, 0.03, key), stick(0.6, 3.6, -0.4, 5.8, 0.03, key))
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2, b = ((i + 1) / 12) * Math.PI * 2
      parts.push(stick(0, 8.6, Math.cos(a) * 1.4, 8.6 + Math.sin(a) * 1.4, 0.03, key), stick(Math.cos(a) * 1.4, 8.6 + Math.sin(a) * 1.4, Math.cos(b) * 1.4, 8.6 + Math.sin(b) * 1.4, 0.04, key))
    }
    parts.push(stick(0, 8.6, 2.2, 8.7, 0.04, key), stick(2, 8.6, 2, 9.4, 0.3, key))
    return { parts, height: 10, foot: [1.1, 0.9] }
  },
  // a mud-walled house far off, its window already lit (its walls drawn by hand, its parts cast the shadow)
  house: () => ({ parts: [stick(0, 0, 0, 3.4, 3, "p")], height: 3.4, foot: [3.4, 0.8], house: true }),
}

// Scattered as many to the square meter far as near (the far ones crowd into a line of scrub along the
// horizon, as they do), some placed by hand near the road where the walk passes them; drawn far to near.
const PROPS = []
{
  const r = rng(11), clear = (x) => Math.abs(x) > ROAD_HALF + 1.4 && Math.abs(x - FENCE_X) > 0.7
  const add = (type, x, z, v, extra) => PROPS.push({ type, x, z, v, seed: Math.floor(r() * 1e6), ...extra })
  const scatter = (type, n, z0, z1) => {
    for (let i = 0; i < n; i++) {
      const z = Math.sqrt(z0 * z0 + (z1 * z1 - z0 * z0) * r()), x = (r() * 2 - 1) * (z * 1.1 + 8)
      const tall = type === "mandacaru" || type === "jua", inSun = Math.abs(P.vp + (P.focal * x) / z - SUNX) < SR + 6   // nothing tall in front of the sun
      if (clear(x) && !(tall && inSun)) add(type, x, z, r())
    }
  }
  scatter("mandacaru", 70, 10, 320); scatter("xique", 110, 9, 260); scatter("shrub", 220, 12, 350)
  scatter("jua", 12, 24, 300); scatter("rock", 80, 3, 250)
  // dry grass along the shoulders, near only (farther it would be under a pixel); between the plants the
  // dry-season ground is bare, which is where the long shadows lie
  for (let i = 0; i < 46; i++) add("grass", (r() < 0.5 ? -1 : 1) * (ROAD_HALF + 0.15 + r() * r() * 4), 3 + r() * 24, r())
  // the fence on the left: crooked stakes every ~3 m; the power line on the right
  const line = (type, x, z0, z1, step, jitter) => {
    const all = []
    for (let z = z0; z < z1; z += step + r() * jitter) all.push({ type, x: x + (r() - 0.5) * 0.12, z, v: r(), seed: Math.floor(r() * 1e6) })
    all.forEach((p, i) => { p.next = all[i + 1]; PROPS.push(p) })
  }
  line("post", FENCE_X, 2, 240, 2.6, 0.7)
  line("pole", POLE_X, 6, 640, 32, 0)
  // in view near the road: |x| under ~z, past the shoulder
  for (const [type, x, z, v] of [
    ["mandacaru", -8.5, 12, 0.95], ["mandacaru", 12, 26, 0.6], ["mandacaru", -15, 36, 0.4], ["mandacaru", 9.5, 52, 0.85],
    ["shrub", 7.4, 9, 0.8], ["shrub", -10.5, 21, 0.55], ["shrub", 17, 31, 0.75], ["shrub", -7.4, 9.5, 0.35],
    ["xique", 6.2, 6.8, 0.7], ["xique", -7.6, 8.4, 0.6], ["xique", 13, 15, 0.8],
    ["rock", 8.4, 12, 0.85], ["rock", -9, 10.5, 0.6], ["rock", 5.2, 5.6, 0.4], ["coroa", 4.6, 4.6, 0.5], ["coroa", -4.8, 5.2, 0.5],
    ["jua", -24, 44, 0.6], ["jua", 32, 64, 0.4], ["mill", 19, 42, 0.5], ["house", -36, 150, 0.5], ["jua", -42, 156, 0.8],
  ]) add(type, x, z, v)
  PROPS.sort((a, b) => b.z - a.z)
  for (const p of PROPS) p.thing = BUILD[p.type](p, rng(p.seed))
}

// ---------------------------------------------------------------- shadows
// The sun is 10 degrees up and 6 to the left of the road: a point `up` m high falls up x LONG m back
// toward us and a little to the right. Each part is swept onto the ground in steps under a pixel;
// the pixels go into one set, so where shadows cross the ground is no darker than in one. The root of a
// shadow, from the low parts, is solid; what the high parts cast thins out (dithered) toward the tip,
// the way a long shadow's far end blurs, so each one reads as coming from its thing instead of the
// field going dark. Wires and blades cast too little.
const SHADE = { g: "Z", G: "z", J: "G", E: "J", h: "E", Z: "k", z: "Z", a: "k", A: "a", b: "A", B: "b", l: "L", L: "A" }
const SX = Math.sin((-SUN_AZ * Math.PI) / 180) * LONG, SZ = Math.cos((SUN_AZ * Math.PI) / 180) * LONG
function cast(out, ox, oz, parts, height) {
  for (const q of parts) {
    const [a, b, half] = q.e ? [[q.e[0], q.e[1], q.e[2] - q.ry], [q.e[0], q.e[1], q.e[2] + q.ry], q.rx] : [q.a, q.b, q.half]
    if (half < 0.015) continue
    const onGround = (t) => { const u = a[2] + (b[2] - a[2]) * t; return [ox + a[0] + (b[0] - a[0]) * t + u * SX, oz + a[1] + (b[1] - a[1]) * t - u * SZ, u] }
    const ends = [onGround(0), onGround(1)].filter(([, z]) => z > 0.3).map(([x, z]) => P.ground(x, z))
    const n = ends.length < 2 ? 60 : Math.min(400, Math.ceil(Math.hypot(ends[1][0] - ends[0][0], ends[1][1] - ends[0][1]) * 1.5) + 1)
    for (let i = 0; i <= n; i++) {
      const [gx, gz, u] = onGround(i / n)
      if (gz < 0.3) continue
      // the sun is half a degree wide: past 216 times its half-thickness from what casts it, a shadow
      // has no dark core left, only penumbra. A twig's shadow ends a few meters out, a trunk's goes on.
      if (u * LONG > 216 * half) continue
      const soft = Math.max(0, (u / height - 0.45) / 0.4)
      if (soft >= 1) continue
      const [sx, sy] = P.ground(gx, gz), rx = half * P.scale(gz), ry = (half * P.focal * P.eye) / (gz * gz)
      if (rx < 0.71 && ry < 0.71) {                                     // thinner than a pixel: one pixel
        const x = Math.floor(sx), y = Math.floor(sy)
        if (x >= 0 && x < W && y > P.horizon && y < H && !(soft && bayer(x, y) < soft)) out.add(y * W + x)
        continue
      }
      if (sy - ry > H || sx + rx < 0 || sx - rx > W) continue
      for (let y = Math.floor(sy - ry); y <= Math.ceil(sy + ry); y++) {
        if (y <= P.horizon || y >= H) continue
        for (let x = Math.max(0, Math.floor(sx - rx)); x <= Math.min(W - 1, Math.ceil(sx + rx)); x++)
          if (((x + 0.5 - sx) / rx) ** 2 + ((y + 0.5 - sy) / ry) ** 2 <= 1 && !(soft && bayer(x, y) < soft) && !(q.dapple && hash(x * 7 + y, y * 13 - x) > q.dapple)) out.add(y * W + x)
      }
    }
  }
}
// right under a thing, where the sky can't reach either: a pool of deeper shade around its foot,
// leaning a little the way its shadow falls. It's what sets a thing on the ground.
function pool(out, x, z, rx, rz) {
  const cx = x + (rz * 0.4 * SX) / LONG, cz = z - rz * 0.4, [l] = at(cx - rx, cz), [r] = at(cx + rx, cz), top = at(cx, cz + rz)[1], bot = at(cx, cz - rz)[1]
  for (let y = Math.max(top - 1, Math.ceil(P.horizon)); y <= Math.min(bot + 1, H - 1); y++)
    for (let xx = Math.max(0, l - 1); xx <= Math.min(W - 1, r + 1); xx++) {
      const [gx, gz] = P.at(xx, y)
      if (((gx - cx) / rx) ** 2 + ((gz - cz) / rz) ** 2 <= 1) out.add(y * W + xx)
    }
}
const darken = (c, out) => { for (const i of out) { const x = i % W, y = (i - x) / W, d = SHADE[c.key(x, y)]; if (d) c.px(x, y, d) } }

// ---------------------------------------------------------------- drawing
// Near and big enough, a thing is drawn on a plate of its own and lit there: the edges toward the sun
// take the rim, the ones away from it a step darker. Then the details only near eyes see.
function paint(c, p) {
  const t = p.thing, s = P.scale(p.z), b = band(p.z, NEAR), [bx] = P.ground(p.x, p.z), r = rng(p.seed + 1)
  if (s * t.height < 1) return
  const key = (k) => HAZE[b] ?? k, end = (v) => at(p.x + v[0], p.z + v[1], v[2]), wide = (q) => Math.max(1, Math.round(2 * q.half * P.scale(p.z + (q.a[1] + q.b[1]) / 2)))
  if (t.house) {
    const [x, y] = at(p.x - 3, p.z, 2.6), [x1, y1] = at(p.x + 3, p.z, 0), roof = at(p.x - 3.4, p.z, 3.4)
    c.rect(x, y, x1 - x, y1 - y, key("p")); c.rect(roof[0], roof[1], x1 - x + 1, y - roof[1], "0")
    c.px(...at(p.x - 1.2, p.z, 1.4), "W"); c.vline(...at(p.x + 1.2, p.z, 1.9), y1 - at(p.x, p.z, 1.9)[1], "k")
    return
  }
  // far, a shrub is a tuft: its twigs would be under a pixel
  if (t.tuft && s * t.height < 7) { const [u, rx, ry] = t.tuft; return c.ellipse(...at(p.x, p.z, u), Math.max(1, Math.round(rx * s)), Math.max(0, Math.round(ry * s)), key("t")) }
  const draw = () => {
    for (const q of t.parts)
      if (q.ghost) continue
      else if (q.e) c.ellipse(...end(q.e), Math.max(0, Math.round(q.rx * s)), Math.max(0, Math.round(q.ry * s)), key(q.key))
      else c.line(...end(q.a), ...end(q.b), key(q.key), wide(q))
  }
  const thick = Math.max(...t.parts.filter((q) => !q.ghost).map((q) => (q.e ? 2 * q.rx : 2 * q.half))) * s
  if (t.ramp && b === 0 && thick >= 3) c.plate(draw, { light: [Math.max(-1, Math.min(1, (SUNX - bx) / 40)), -0.7], ramps: [t.ramp], strength: t.crack !== undefined ? 0.75 : 1 })
  else draw()
  if (b > 0) return
  const sun = SUNX > bx ? 1 : -1
  for (const q of t.parts) {
    if (q.e) {
      const [cx, cy] = end(q.e), rx = Math.round(q.rx * s), ry = Math.round(q.ry * s)
      // leaves: darker clumps in the lower part of each puff of the crown
      if (t.leaves && rx >= 4) for (let i = 0; i < rx * 2; i++) {
        const x = cx + Math.round((r() * 2 - 1) * rx * 0.8), y = cy + Math.round(r() * ry * 0.8)
        if (c.key(x, y) === "Q" && c.key(x + 1, y) === "Q") c.hline(x, y, 2, "q")
      }
      // a crack down a boulder's face
      if (t.crack && rx >= 4) {
        let x = cx + Math.round((r() - 0.5) * rx), y = cy - Math.round(ry * 0.6)
        for (let i = 0; i < ry * 1.2; i++, y++) { x += Math.round(r() * 2 - 1) * (r() < 0.4 ? 1 : 0); if (c.key(x, y) === "X") c.px(x, y, "x") }
      }
      continue
    }
    const [x0, y0] = end(q.a), [x1, y1] = end(q.b), w = wide(q)
    // a column of a cactus: ribs down its face; spines along the edge toward the sun and over the top,
    // glowing with the light behind them; now and then a red fruit by the tip
    if (x0 === x1 && (t.ribs || t.spines)) {
      const top = Math.min(y0, y1), bot = Math.max(y0, y1), half = w >> 1
      if (t.ribs && w >= 5) for (let o = -half + 1; o < half; o += 2) c.vline(x0 + o, top + 2, bot - top - 2, "c")
      if (t.spines && s >= 8) {
        for (let y = top + 1; y < bot; y += 2) if (r() < 0.55) c.px(x0 + sun * (half + 1), y, t.spines)
        if (q.b[2] === Math.max(q.a[2], q.b[2]) && q.b[2] > 0.5) for (const dx of [-1, 0, 1]) if (r() < 0.6) c.px(x0 + dx, top - 1, t.spines)
      }
      if (t.fruit && w >= 3 && q.b[2] > q.a[2] + 0.8 && r() < 0.4) c.px(x0 - sun * half, top + 1, "f")
    }
    // xique-xique stems: spines all along their tips
    if (t.spines === "F" && s >= 10 && q.b[2] > 0.3) for (let i = 0; i < 3; i++) if (r() < 0.7) c.px(x1 + Math.round((r() * 2 - 1) * (w / 2 + 1)), y1 + Math.round(r() * 3) - 1, "F")
    // backlit tips: grass blades and the outer twigs light up
    if ((t.tips && s >= 20 && q.key === "F") || (t.twigs && s >= 12 && q.key === "u" && r() < 0.35)) c.px(x1, y1, "r")
  }
}

sprite("_land", { w: W, h: H },
  (c) => serras(c),
  plane(P, ground),
  (c) => asphalt(c),
  (c) => {
    const out = new Set(), deep = new Set()
    for (const p of PROPS) {
      if (p.z > 160 || P.scale(p.z) * p.thing.height < 1.5) continue
      if (p.z < 70 && p.thing.height >= 0.8) cast(out, p.x, p.z, p.thing.parts, p.thing.height)
      if (p.thing.foot) pool(deep, p.x, p.z, ...p.thing.foot)
    }
    darken(c, out); darken(c, deep)
  },
  (c) => { for (const p of PROPS) paint(c, p) })

// heat over the far road: past ~150 m the asphalt mirrors the sky, shimmering
function mirage(c) {
  for (let row = Math.floor(P.horizon); row < P.horizon + 3; row++) {
    const z = P.at(P.vp, row)?.[1]
    if (!z || z < 150) continue
    const half = P.scale(z) * ROAD_HALF
    for (let col = Math.floor(P.vp - half); col <= Math.ceil(P.vp + half); col++) {
      const v = Math.sin(c.phase * Math.PI * 12 + col * 0.9 + row * 2.1)
      c.px(col, row, v > 0.55 ? "Y" : v > -0.3 ? "y" : "o")
    }
  }
}

// ================================================================ the walker
// 1.82 m with the hat, 0.8 m a step, four poses a step (contact, down, passing, up) at 10 fps: 2 m/s.
// Walked the way pixel art walks: the scale is held for the whole step and changes only at the next
// contact, when the pose changes anyway, and the planted foot stays where it landed: no sliding, no
// size flickering a pixel at a time mid-step. Near, they are drawn by code at their exact size; under
// 15 px a figure drawn that way turns into a blob, so they take the hand-drawn sprite nearest their
// height (stamp's `fit`), flipped every other step to swap the legs.
const Z0 = 0.6, STRIDE = 0.8, LANE = 0.9, BIG = 15, TALL = 1.82
// dark against the glow all the way (at 50 m the haze is nothing yet); in the last 12 m the figure
// and its shadow dissolve into the light, a 4x4 ordered dither taking more of it each step
const FADE = [38, 50], FAR_BODY = 24

// Small sizes, seen from behind, the four poses side by side: contact (the back arm hangs lower),
// down (the body a pixel lower), passing (the swinging foot lifted), up (it reaches ahead, the
// other arm back). The hat's brim and the bedroll on the pack are what still reads at 9 px; the rim
// is the sun catching the hat and the bedroll.
const MICRO = {
  14: `
    .rSr. ..... .rSr. .rSr.
    rSSSr .rSr. rSSSr rSSSr
    .SSS. rSSSr .SSS. .SSS.
    rPPPr .SSS. rPPPr rPPPr
    SPPPS rPPPr SPPPS SPPPS
    SPPPS SPPPS SPPPS SPPPS
    SSSSS SPPPS SSSSS SSSSS
    SSSS. SSSSS .SSS. .SSSS
    .SSS. SSSS. .SSS. .SSS.
    .S.S. .SSS. .S.S. .S.S.
    .S.S. .S.S. .S.S. .S.S.
    .S.S. .S.S. .S.S. .S.S.
    .S.S. .S.S. .S... .S.S.
    .S.S. .S.S. .S... .S...`,
  12: `
    .rSr. ..... .rSr. .rSr.
    rSSSr .rSr. rSSSr rSSSr
    .SSS. rSSSr .SSS. .SSS.
    rPPPr .SSS. rPPPr rPPPr
    SPPPS rPPPr SPPPS SPPPS
    SPPPS SPPPS SPPPS SPPPS
    SSSS. SPPPS .SSS. .SSSS
    .SSS. SSSS. .SSS. .SSS.
    .S.S. .SSS. .S.S. .S.S.
    .S.S. .S.S. .S.S. .S.S.
    .S.S. .S.S. .S... .S.S.
    .S.S. .S.S. .S... .S...`,
  10: `
    .S. ... .S. .S.
    SSS .S. SSS SSS
    .S. SSS .S. .S.
    SPS .S. SPS SPS
    SPS SPS SPS SPS
    .S. SPS .S. .S.
    S.S .S. S.S S.S
    S.S S.S S.S S.S
    S.S S.S S.. S.S
    S.S S.S S.. S..`,
  9: `
    .S. ... .S. .S.
    SSS .S. SSS SSS
    SPS SSS SPS SPS
    SPS SPS SPS SPS
    .S. SPS .S. .S.
    S.S .S. S.S S.S
    S.S S.S S.S S.S
    S.S S.S S.. S.S
    S.S S.S S.. S..`,
  8: `
    .S. ... .S. .S.
    SSS .S. SSS SSS
    SPS SSS SPS SPS
    SSS SPS SSS SSS
    .S. SSS .S. .S.
    S.S .S. S.S S.S
    S.S S.S S.S S.S
    S.S S.S S.. S.S`,
  7: `
    .S. ... .S. .S.
    SSS .S. SSS SSS
    SPS SSS SPS SPS
    .S. SPS .S. .S.
    S.S .S. S.S S.S
    S.S S.S S.S S.S
    S.S S.S S.. S.S`,
  6: `
    .S. ... .S. .S.
    SSS .S. SSS SSS
    SSS SSS SSS SSS
    .S. SSS .S. .S.
    S.S .S. S.S S.S
    S.S S.S S.. S.S`,
  5: `
    .S. ... .S. .S.
    SSS .S. SSS SSS
    SSS SSS SSS SSS
    S.S SSS S.S S.S
    S.S S.S S.. S.S`,
}
for (const [h, strip] of Object.entries(MICRO)) {
  const w = strip.trim().indexOf(" ")
  anim("walker_" + h, { w, h: +h, frames: PER_STEP, fps: FPS, pivot: "bottom" }, (c) => c.grid(-c.frame * (w + 1), 0, strip))
}

// per pose of the drawn walker, in meters from the planted foot (d forward, up above the ground):
// where the other foot is, how high the hips ride, and how far the hips are ahead of the planted foot
const POSES = [
  { foot: [-0.8, 0], hips: [-0.4, 0.92] },       // contact: the back foot still down behind
  { foot: [-0.55, 0.12], hips: [-0.25, 0.89] },  // down: its heel up behind, the body lowest
  { foot: [-0.1, 0.15], hips: [0, 0.94] },       // passing: it swings by, the body over the planted foot
  { foot: [0.4, 0.07], hips: [0.2, 0.92] },      // up: it reaches ahead
]

function walker(c, frame) {
  const k = Math.floor(frame / PER_STEP), pose = frame % PER_STEP, side = k % 2 ? 1 : -1
  const zk = Z0 + k * STRIDE, zh = zk + STRIDE / 2                // where this foot landed; the body's depth, held
  const s = P.scale(zh), tall = s * TALL                           // px per meter, held for the step
  const fade = Math.min(1, Math.max(0, (zk - FADE[0]) / (FADE[1] - FADE[0])))
  if (fade >= 1) return
  c.clip(fade > 0 ? (x, y) => bayer(x, y) >= fade : undefined, () => {
    shadow(c, frame, pose, side, zk)
    if (tall >= BIG) draw(c, frame, POSES[pose], side, zk, zh, s)
    else c.stamp("walker_*", ...at(LANE, zk), { fit: tall, frame: pose, ...(side > 0 && { flip: "x" }), ...(zk >= FAR_BODY && { swap: { S: "T", P: "T" } }) })
  })
}

// the walker's shadow: their parts cast like everything else's, so it walks too, legs scissoring,
// the hat's brim and the bedroll in its outline
function walkerParts(pose, side, frame) {
  const [hd, hu] = pose.hips, [fd, fu] = pose.foot, cx = -side * 0.11, bob = hu - 0.92, swingArm = [0, 1, 0, -1][frame % PER_STEP]
  const knee = [-side * 0.2, (hd + fd) / 2 + 0.12, (hu + fu) / 2 + 0.05]
  const parts = [
    { a: [cx + side * 0.09, hd, hu], b: [0, 0, 0.1], half: 0.07 },                       // the planted leg
    { a: [cx - side * 0.09, hd, hu], b: knee, half: 0.07 }, { a: knee, b: [-side * 0.22, fd, fu + 0.1], half: 0.06 },
    { a: [cx, hd, hu], b: [cx, hd, 1.45 + bob], half: 0.2 },                               // body and pack
    { a: [cx - 0.22, hd, 1.46 + bob], b: [cx + 0.22, hd, 1.46 + bob], half: 0.07 },        // bedroll
    { e: [cx, hd, 1.63 + bob], rx: 0.1, ry: 0.1 },                                         // head
    { a: [cx - 0.23, hd, 1.69 + bob], b: [cx + 0.23, hd, 1.69 + bob], half: 0.03 },        // brim, crown
    { a: [cx, hd, 1.7 + bob], b: [cx, hd, 1.79 + bob], half: 0.09 },
  ]
  for (const [arm, sgn] of [[-1, side < 0 ? 1 : -1], [1, side < 0 ? -1 : 1]])
    parts.push({ a: [cx + arm * 0.2, hd, 1.4 + bob], b: [cx + arm * 0.25, hd + sgn * swingArm * -0.2, 0.8 + bob], half: 0.045 })
  return parts
}
function shadow(c, frame, pose, side, zk) {
  const out = new Set()
  cast(out, LANE + side * 0.11, zk, walkerParts(POSES[pose], side, frame), TALL)
  darken(c, out)
}

// Near, drawn from behind in meters: boots and trousers, the shirt, the arms swinging against the
// legs, a pack with a bedroll strapped on top, the neck and hair, a leather hat. Backlit: all of it
// in its own shade, and the sun wraps a warm rim round the hat, the bedroll, the shoulders and arms.
const FIG = "1234567U"
function draw(c, frame, pose, side, zk, zh, s) {
  const [ax, ay] = P.ground(LANE + side * 0.11, zk)
  const pt = (x, d, up) => [Math.round(ax + x * s), Math.round(ay - (P.focal * P.eye * d) / (zh * zh) - up * s)]
  const T = (m) => Math.max(1, Math.round(m * s))                  // a thickness in meters, in px
  const big = s >= 30                                               // ~55 px tall and up: seams and buckles
  const [hd, hu] = pose.hips, [fd, fu] = pose.foot, cx = -side * 0.11, bob = hu - 0.92
  const up = (m) => m + bob                                         // what rides on the hips bobs with them
  // legs: the planted one straight, the swinging one bent at the knee; boots below the ankle
  const hipL = pt(cx - 0.09, hd, hu), hipR = pt(cx + 0.09, hd, hu)
  const hipP = side < 0 ? hipL : hipR, hipS = side < 0 ? hipR : hipL, swingX = -side * 0.22
  const kneeS = pt(-side * 0.2, (hd + fd) / 2 + 0.12, (hu + fu) / 2 + 0.05), ankleS = pt(swingX, fd, fu + 0.12), ankleP = pt(0, 0, 0.12)
  c.line(...hipS, ...kneeS, "4", T(0.15)); c.line(...kneeS, ...ankleS, "4", T(0.12)); c.line(...hipP, ...ankleP, "4", T(0.15))
  for (const [ank, x, d, u] of [[ankleP, 0, 0, 0], [ankleS, swingX, fd, fu]]) {
    const [fx, fy] = pt(x, d, u)
    c.rect(fx - T(0.065), ank[1], T(0.13) + 1, Math.max(1, fy - ank[1]), "5")
    if (u > 0.05) c.rect(fx - T(0.065), fy - T(0.03), T(0.13) + 1, T(0.03), "U")       // a lifted heel shows its sole
  }
  // the shirt: sloping shoulders from the neck, narrower at the waist; a belt under it
  const sh = up(1.45), sL = pt(cx - 0.2, hd, sh), sR = pt(cx + 0.2, hd, sh), wL = pt(cx - 0.15, hd, up(0.98)), wR = pt(cx + 0.15, hd, up(0.98))
  const nL = pt(cx - 0.07, hd, sh + 0.07), nR = pt(cx + 0.07, hd, sh + 0.07), cL = pt(cx - 0.19, hd, sh - 0.28), cR = pt(cx + 0.19, hd, sh - 0.28)
  c.poly([...nL, ...nR, ...sR, ...cR, ...wR, ...wL, ...cL, ...sL], "3")
  if (big) c.line(...pt(cx - 0.15, hd, up(0.97)), ...pt(cx + 0.15, hd, up(0.97)), "5", T(0.035))
  // arms: sleeves to the wrist, hands; the planted side's arm goes back on contact
  const swingArm = [0, 1, 0, -1][frame % PER_STEP]
  for (const [arm, sp, sgn] of [[-1, sL, side < 0 ? 1 : -1], [1, sR, side < 0 ? -1 : 1]]) {
    const back = sgn * swingArm < 0, hand = pt(cx + arm * 0.25, hd + sgn * swingArm * -0.2, up(0.8) + (back ? 0.04 : 0))
    const elbow = pt(cx + arm * 0.26, hd + sgn * swingArm * -0.08, up(1.12))
    c.line(sp[0], sp[1] + T(0.04), ...elbow, "3", T(0.1)); c.line(...elbow, ...hand, "3", T(0.09))
    c.ellipse(...hand, T(0.045), T(0.05), "2")
  }
  // the pack, its flap and buckle, and the bedroll strapped across the top
  c.poly([...pt(cx - 0.18, hd, up(1.05)), ...pt(cx + 0.18, hd, up(1.05)), ...pt(cx + 0.17, hd, up(1.4)), ...pt(cx - 0.17, hd, up(1.4))], "6")
  if (big) { c.line(...pt(cx - 0.17, hd, up(1.27)), ...pt(cx + 0.17, hd, up(1.27)), "5", T(0.02)); c.rect(...pt(cx - 0.02, hd, up(1.27)), T(0.04), T(0.05), "U") }
  c.line(...pt(cx - 0.2, hd, up(1.46)), ...pt(cx + 0.2, hd, up(1.46)), "7", T(0.14))
  if (big) for (const tx of [-0.11, 0.11]) c.line(...pt(cx + tx, hd, up(1.53)), ...pt(cx + tx, hd, up(1.39)), "5", T(0.02))
  // neck, hair under the hat, the hat: a wide brim and a round crown with a band
  const neck = pt(cx - 0.045, hd, up(1.6))
  c.rect(neck[0], neck[1], T(0.09), Math.max(1, pt(0, hd, up(1.52))[1] - neck[1]), "2")
  c.ellipse(...pt(cx, hd, up(1.63)), T(0.095), T(0.085), "5")
  c.poly([...pt(cx - 0.1, hd, up(1.69)), ...pt(cx + 0.1, hd, up(1.69)), ...pt(cx + 0.085, hd, up(1.8)), ...pt(cx - 0.085, hd, up(1.8))], "1")
  c.ellipse(...pt(cx, hd, up(1.8)), T(0.085), T(0.025), "1")
  c.ellipse(...pt(cx, hd, up(1.685)), T(0.23), T(0.028), "1")
  if (big) c.line(...pt(cx - 0.095, hd, up(1.715)), ...pt(cx + 0.095, hd, up(1.715)), "5", T(0.02))
  // backlit: the rim, on the edges the sun is behind, above the chest
  const body = (x, y) => x >= 0 && y >= 0 && x < W && y < H && FIG.includes(c.key(x, y))
  const top = pt(cx, hd, up(1.86))[1], chest = pt(cx, hd, up(1.2))[1], left = pt(cx - 0.6, hd, 0)[0], right = pt(cx + 0.6, hd, 0)[0], rim = []
  for (let y = top; y < chest; y++)
    for (let x = left; x <= right; x++)
      if (body(x, y) && (!body(x, y - 1) || !body(x - 1, y) || !body(x + 1, y))) rim.push([x, y, !body(x, y - 1)])
  for (const [x, y, above] of rim) c.px(x, y, above ? "R" : "r")
}

anim("road", { w: W, h: H, frames: FRAMES, fps: FPS },
  stamp("_sky", 0, 0),
  stamp("_aura", SUNX - 120, SUNY - 47),
  stamp("_sun", SUNX - 30, SUNY - SR - 1),
  (c) => vultures(c),
  stamp("_land", 0, 0),
  (c) => mirage(c),
  (c) => walker(c, c.frame))
