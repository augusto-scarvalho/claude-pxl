// A top-down village's props at a 32 px grid (lib/profiles/topdown32.px.js), each drafted in 3D and finished by hand
// (topdown32: form and light from 3D, the final pixels by hand): a field in meters seen from what stands' 30 degrees at
// 32 px a meter (a tile a meter), drawn three times over and brought down (its edges step evenly), 4 tones a
// material, each material's darkest along the contour away from the light (topdown32's selective line, none toward
// the light), lit from the upper left; the draft kept live (_<name>_live) and frozen (frozen/<name>_td32.png, three
// times over), the hand pass on top. A pot to lift and break
// (pot; pot_break: it cracks, bursts, lies in shards), a chest (chest, chest_open; chest_opening plays it), a sign to
// read, a crate, a barrel and a lamp; a big chest (bigchest, bigchest_open; bigchest_opening). Sizes against the 48 px
// figure: the pot 22 px wide (A Link to the Past's and The Minish Cap's pots a tile, half their heroes' height), the
// chest 30 (Secret of Mana's 20 at its 30 px heroes; A Link to the Past's 16 at its 24), the big one 1.5 times it (Echoes
// of Wisdom's big chest 1.6 times its small one), the crate a tile (topdown32's crate box), the lamp two tiles tall and
// half a tile wide (its box). The chest, the sign and the crate built as the games' 3D models are (library F5 4n:
// numbers only). The 16 px kit's (lib/props/village.px.js), crates.px.js's and lamps.px.js's untouched. For any
// scene: include("<path>/lib/props/village32.px.js", { as: "village32" }), its palette its own.
pal({
  d: "#2a1836",                                                        // a dark inside: a pot's mouth, an open chest, a crack, a keyhole
  q: "#6e2420", o: "#b4452c", O: "#e8763e", P: "#ffb26a", Q: "#fff0c8", // clay: its line, shade, body, light, a glint
  w: "#5e2c1a", Y: "#8a4e28", W: "#b8743c", V: "#f0b066",              // wood: its line, shade, body, light
  F: "#7a4810", G: "#c07a14", g: "#ffd84a", h: "#fff6c0",              // gold: its line, shade, light, a glint
  I: "#2a2632", i: "#4a4656", J: "#6e6a7c", j: "#a4a0b0",              // iron: its line, shade, body, light
  E: "#e0702a", l: "#ffb84a", L: "#ffe9a0", X: "#fffbe8",              // a lamp's light: the glass's edge, the glass, its glow, the flame
})
ramps("qoOPQ", "wYWV", "FGgh", "IiJj", "ElLX")
include("../styles/hand32.px.js")
// in a block: its names stay its own when a scene includes the file
{
const MATS = { clay: ["#6e2420", "#b4452c", "#e8763e", "#ffb26a"], wood: ["#5e2c1a", "#8a4e28", "#b8743c", "#f0b066"], seam: ["#5e2c1a", "#5e2c1a", "#8a4e28", "#b8743c"],
  gold: ["#7a4810", "#c07a14", "#ffd84a", "#fff6c0"], iron: ["#2a2632", "#4a4656", "#6e6a7c", "#a4a0b0"], glass: ["#e0702a", "#ffb84a", "#ffe9a0", "#fffbe8"], dark: ["#2a1836", "#2a1836", "#2a1836", "#2a1836"] }
// (each drawn three times over, its selective line with it, and brought down by shrink's edge treatment: the silhouette
// from the coverage and evened, the tones by vote, the line by its own vote on the edge, its gaps closed)
const K = 3, DRAW = { mats: MATS, light: [-0.5, -0.45, 0.75], surface: { tones: 4, outline: true }, view: { kind: "side", pitch: 30 }, ppm: 32 * K, headings: ["s"] }
// (a block in where a third of it is drawn: the bulk kit32d approved; the pot, 4l's, where half is: what its one ray a
// pixel drew)
const draft = (name, field, o = {}, shrink = { by: K, cover: 1 / 3 }) => {
  turnaround(`_${name}_live`, field, { ...DRAW, ...o, surface: { ...DRAW.surface, ...o.surface } })
  sprite(`_${name}_draft3`, { png: `frozen/${name}_td32.png`, frozen: `_${name}_live_s` })
  sprite(`_${name}_draft`, { base: `_${name}_draft3`, shrink })
}
// a profile's radius at the height z (m): `pts` [[z, r], ...], a smooth curve through them (Catmull-Rom: no kink at
// a point, so the silhouette has none)
const radius = (pts) => (z) => {
  const i = Math.max(1, pts.findIndex((p) => z <= p[0])), n = pts.length - 1, at = (k) => pts[Math.max(0, Math.min(n, k))][1]
  if (z >= pts[n][0]) return pts[n][1]
  const t = (z - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0]), [a, b, c, d] = [at(i - 2), at(i - 1), at(i), at(i + 1)]
  return b + 0.5 * t * (c - a + t * (2 * a - 5 * b + 4 * c - d + t * (3 * (b - c) + d - a)))
}
// a solid turned round the upright, its radius at each height by `pts` (smooth false: straight between them)
const lathe = (pts, smooth = true) => {
  const top = pts.at(-1)[0], R = Math.max(...pts.map((p) => p[1]))
  const r = smooth ? radius(pts) : (z) => { for (let i = 1; i < pts.length; i++) if (z <= pts[i][0]) { const [z0, r0] = pts[i - 1], [z1, r1] = pts[i]; return r0 + ((r1 - r0) * (z - z0)) / (z1 - z0) } return pts.at(-1)[1] }
  return sdf.field((x, y, z) => Math.max((Math.hypot(x, y) - r(Math.max(0, Math.min(top, z)))) * 0.7, -z, z - top), [-R, -R, 0], [R, R, top])
}
// The hand pass of a turned thing, drawn whole from its profile (the 3D form) as topdown32's stand sees it (30 degrees,
// 32 px a meter) and lit by the draft's light: each pixel inside it if the front surface or the top's disc lies
// there, so its silhouette, its rings and its rims step as clean pixel curves (the draft placed it and showed the
// light). `zAt(x, y)` the height of the surface the pixel sees (negative on a back point) or null;
// `lit(x, z)` how square the light falls there (-1..1); `at(z, r)` a ring's ellipse there [middle x, row, rx, ry];
// `s(x, z)` the sine of the pixel's angle round the upright (0 facing us); `top` its height.
const turned = (c, pts, yb) => {
  const K = 32, sP = 0.5, cP = Math.sqrt(3) / 2, r = radius(pts), top = pts.at(-1)[0]
  const cx = c.w / 2, py = yb + 1 - pts[0][1] * sP * K, L = [-0.5, -0.45, 0.75].map((v, _, a) => v / Math.hypot(...a))
  const sy = (z, u) => py - (z * cP - Math.sqrt(Math.max(0, r(z) ** 2 - u * u)) * sP) * K
  // (each height's circle meets the pixel's column at a front point and a back one; of those landing on its row, the
  // nearest: the back ones show above a shoulder, where nothing stands in front of them)
  const zAt = (x, y) => {
    const u = (x + 0.5 - cx) / K, Y = y + 0.5
    let best = null, near = -Infinity, pf, pb
    for (let z = top; z > -0.001; z -= 0.002) {
      const rr = r(Math.max(0, z))
      if (Math.abs(u) > rr) { pf = pb = undefined; continue }
      const q = Math.sqrt(rr * rr - u * u), f = py - (z * cP - q * sP) * K, b = py - (z * cP + q * sP) * K
      if (pf !== undefined && (pf - Y) * (f - Y) <= 0 && q * cP + z * sP > near) { near = q * cP + z * sP; best = Math.max(0, z) }
      if (pb !== undefined && (pb - Y) * (b - Y) <= 0 && -q * cP + z * sP > near) { near = -q * cP + z * sP; best = -Math.max(0.0001, z) }
      pf = f; pb = b
    }
    return best
  }
  // (a back point's height given negative)
  const lit = (x, zz) => {
    const z = Math.abs(zz), s = Math.max(-1, Math.min(1, (x + 0.5 - cx) / K / r(z))), cphi = Math.sqrt(1 - s * s) * (zz < 0 ? -1 : 1), slope = (r(Math.min(top, z + 0.01)) - r(Math.max(0, z - 0.01))) / 0.02
    const n = [s, -cphi, -slope], l = Math.hypot(...n)
    return (n[0] * L[0] + n[1] * L[1] + n[2] * L[2]) / l
  }
  return { cx, r, top, zAt, lit, u: (x) => (x + 0.5 - cx) / K, s: (x, z) => Math.max(-1, Math.min(1, (x + 0.5 - cx) / K / r(Math.abs(z)))), at: (z, rr = r(z)) => [cx, py - z * cP * K, rr * K, rr * sP * K] }
}

// the pixels of `name` within `keep(u, v)` (from its drawing's top left) put with that corner at [X, Y] (a shard of the pot)
const piece = (c, name, keep, X, Y) => { const im = c.asset(name), b = im.bounds(); for (let v = 0; v < b.h; v++) for (let u = 0; u < b.w; u++) { const k = im.get(b.x + u, b.y + v); if (k && keep(u, v)) c.plot(X + u, Y + v, k) } }

// ---------------------------------------------------------------- the pot
// A clay pot turned on a wheel, built as the games' pots are (Link's Awakening's, Echoes of Wisdom's Hyrule Castle and
// Gerudo pots, Tears of the Kingdom's; library F5 4n: numbers only), the user's pick of three: as tall as it is wide,
// widest at 0.52 of its height, a neck 0.60 of its widest at 0.82, a lip rolled out 0.74 of it at 0.94, its foot 0.66;
// hollow from its neck up (theirs from 0.6-0.8 of their height)
const POT = [[0, 0.2046], [0.062, 0.2387], [0.124, 0.2697], [0.186, 0.2914], [0.2542, 0.3069], [0.3224, 0.31], [0.3844, 0.2976], [0.434, 0.2728], [0.4712, 0.2356], [0.5084, 0.186], [0.5456, 0.2046], [0.5828, 0.2294], [0.62, 0.2232]]
{
  const top = POT.at(-1)[0], inner = POT.filter((p) => p[0] >= top * 0.55).map(([z, r]) => [z - top * 0.55, Math.max(0.02, r - 0.06)])
  draft("pot", lathe(POT).subtract(lathe([...inner, [inner.at(-1)[0] + 0.1, inner.at(-1)[1]]]).at(0, 0, top * 0.55 + 0.001)).mat("clay"), { surface: { ao: 0.6 } }, { by: K, cover: 0.5 })
}
// the pot by hand, drawn whole from its profile (as the barrel is; the draft placed it and showed the light): one
// smooth light on its belly in bands; a rolled lip (Link's Awakening's, Echoes of Wisdom's), its front band lit on its
// left, its shadow on the neck a ring under it, its top a ring seen from above (lit, a glint at its far left, a step
// down at its near right), 0.045 m thick so the mouth stays open at 32; the mouth near-black (every model's), its far
// wall lit where the light reaches in; the shoulder glazed a step darker, dripping in three drips over the belly (Link's
// Awakening's big pot); the shine on the shoulder; a chip off the lip's near right where it was knocked (the raw clay
// lighter); its edge evened, its selective line; last, by hand, six pixels where the lip meets the shoulder and at the
// foot, so the edge's runs step in order (found against check --edges's own reading)
const POT_DOWN = { Q: "P", P: "O", O: "o", o: "o", q: "q" }, POT_TOUCH = [[7, 14, "fill"], [7, 29, "clear"], [9, 31, "clear"], [8, 11, "clear"], [21, 13, "clear"], [21, 14, "clear"]]
// pixels touched by hand last, [x, y, "fill" | "clear"]: a pixel added takes its first drawn neighbour's color (right,
// left, below, above)
const touch = (c, list) => { for (const [x, y, how] of list) { if (how === "clear") { c.px(x, y, "_"); continue } const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([u, v]) => c.get(x + u, y + v)).find((k) => k); if (n) c.plot(x, y, n) } }
sprite("pot", { w: 30, h: 34, pivot: [15, Math.round(33 - POT[0][1] * 16)] }, (c) => {
  const T = turned(c, POT, c.h - 2), top = T.top, zs = POT.map((p) => p[0]), rs = POT.map((p) => p[1])
  const zWide = zs[rs.indexOf(Math.max(...rs))], zNeck = POT.filter((p) => p[0] > zWide).reduce((a, p) => (p[1] < a[1] ? p : a))[0]
  const LIP = 0.045, BAND = 0.04, Z = []
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) Z.push(T.zAt(x, y))
  const z = (x, y) => (x < 0 || y < 0 || x >= c.w || y >= c.h ? null : Z[y * c.w + x])
  // (the glaze's edge a little under halfway from the neck to the widest, three drips hanging from it, 2 px wide)
  const zg = zNeck - (zNeck - zWide) * 0.55, cx0 = Math.round(T.cx)
  const drip = (x) => { const d = x - cx0; return [-6, -1, 4].some((m) => d === m || d === m + 1) ? 0.07 : [-7, -2, 3, -4, 1, 6].includes(d) ? 0.035 : 0 }
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    const zz = z(x, y)
    if (zz === null) continue
    const za = Math.abs(zz), b = T.lit(x, za)
    let k = b > 0.62 ? "P" : b > 0.28 ? "O" : "o"
    if (za > zg - drip(x) && za < top - BAND - 0.02) k = POT_DOWN[k]
    if (za >= top - BAND) k = b > 0.3 ? "P" : b > 0 ? "O" : "o"
    else if (za >= top - BAND - 0.02) k = POT_DOWN[POT_DOWN[k]]
    c.px(x, y, k)
  }
  const [cx, cy, RX, RY] = T.at(top), [, , rx, ry] = T.at(top, T.r(top) - LIP)
  const e = (x, y, a, b, dy = 0) => ((x + 0.5 - cx) / a) ** 2 + ((y + 0.5 - cy - dy) / b) ** 2
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    if (e(x, y, RX, RY) >= 1) continue
    if (e(x, y, rx, ry) < 1) c.px(x, y, e(x, y, rx, ry, 1.6) >= 1 && y + 0.5 < cy ? "o" : "d")
    else c.px(x, y, y + 0.5 > cy && x + 0.5 > cx + 1 ? "O" : "P")
  }
  const gl = [...Array(c.w).keys()].find((x) => c.is(x, Math.round(cy) - 1, "P"))
  if (gl !== undefined) { c.px(gl, Math.round(cy) - 1, "Q"); c.px(gl + 1, Math.round(cy) - 2, "Q") }
  let best = -2, bx = 0, by = 0
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) { const zz = z(x, y); if (zz !== null && zz > zWide && zz < zg + 0.03 && T.lit(x, zz) > best) { best = T.lit(x, zz); bx = x; by = y } }
  for (const [u, v] of [[0, 0], [1, 0], [0, 1]]) c.px(bx + u, by + v, "Q")
  const chx = Math.round(cx + RX * 0.5), chy = Math.round(cy + RY) - 1
  c.px(chx, chy, "Q"); c.px(chx + 1, chy, "Q"); c.px(chx, chy + 1, "q"); c.px(chx + 1, chy + 1, "q")
  even32(c)
  for (const side of [0, 1]) {
    const ys = [...Array(c.h).keys()].filter((y) => [...Array(c.w).keys()].some((x) => c.get(x, y)))
    const ex = (y) => { const xs = [...Array(c.w).keys()].filter((x) => c.get(x, y)); return side ? xs.at(-1) : xs[0] }
    const runs = []
    for (const y of ys) { const x = ex(y), r = runs.at(-1); if (r && r.x === x) r.n++; else runs.push({ x, y, n: 1 }) }
    runs.forEach((r, i) => {
      const a = runs[i - 1], b = runs[i + 1]
      if (!a || !b || r.n !== 1 || a.n < 2 || b.n < 2 || Math.abs(a.x - r.x) !== 1 || Math.abs(b.x - r.x) !== 1 || a.x - r.x !== r.x - b.x) return
      c.plot(side ? Math.max(a.x, b.x) : Math.min(a.x, b.x), r.y, c.get(r.x, r.y))
    })
  }
  line32(c, [[...MATS.clay, "#fff0c8"]])
  touch(c, POT_TOUCH)
})
// ---------------------------------------------------------------- the chest
// A wooden chest as the games' models build one (Link's Awakening's and Echoes of Wisdom's, Tears of the Kingdom's):
// a body 0.41 of its width tall, 0.7 deep, of two planks; a lid a lip 0.09 of its width tall, overhanging the body
// 0.03 of its width at the sides and 0.06 front and back, then an arch rising 0.31 of its width (a half-cylinder
// flattened to 0.75 of its half-depth: theirs rises 0.44 over 0.6), planks across it, five to the arch; gold bands up
// the body's four corners and over the lid's two ends, a gold lip along the lid's front, a lock plate at the seam; open,
// the lid swung back on its hinge, hollow, the inside dark. `s` its size (1.5 the big one)
const CHEST = (s = 1, open = false) => {
  const Wd = 0.86 * s, D = 0.6 * s, H = 0.35 * s, LIP = 0.08 * s, RISE = 0.27 * s, B = 0.07 * s, LW = Wd + 0.05 * s, LD = D + 0.1 * s
  const body = sdf.box([Wd, D, H]).at(0, 0, H / 2).paint((q) => (((q[2] + 0.02) / (H / 2)) % 1 < 0.12 ? "seam" : "wood"))
  const bands = sdf.union(...[-1, 1].flatMap((sx) => [-1, 1].map((sy) => sdf.box([B, B, H]).at((sx * (Wd - B)) / 2 + sx * 0.004, (sy * (D - B)) / 2 + sy * 0.004, H / 2)))).mat("gold")
  // the lid built round its hinge at the back's top edge; its planks' seams every fifth of the arch
  const arc = (q) => ((Math.atan2(q[2] - LIP, (q[1] / (LD / 2)) * RISE) / Math.PI) * 5 + 0.5) % 1 < 0.14 ? "seam" : "wood"
  const half = (w, d, r) => sdf.union(sdf.box([w, d, LIP]).at(0, 0, LIP / 2), sdf.ellipsoid([w * 4, d / 2, r]).at(0, 0, LIP).intersect(sdf.box([w, d, r]).at(0, 0, LIP + r / 2)), { smooth: 0.01 })
  let lid = sdf.union(half(LW, LD, RISE).paint(arc), ...[-1, 1].map((sx) => half(B, LD + 0.012, RISE + 0.006).at((sx * (LW - B)) / 2, 0, 0).mat("gold")), sdf.box([LW, 0.03 * s, 0.035 * s]).at(0, -LD / 2 - 0.004, 0.02 * s).mat("gold"))
  if (open) lid = lid.subtract(sdf.ellipsoid([LW * 4, LD / 2 - 0.04 * s, RISE - 0.04 * s]).at(0, 0, LIP - 0.01).intersect(sdf.box([LW - 2 * B, LD - 0.08 * s, RISE + LIP]).at(0, 0, LIP / 2 + RISE / 2 - 0.02)))
  const hinged = lid.at(0, -LD / 2 + 0.02 * s, 0), placed = (open ? hinged.rotate(-105, "x") : hinged).at(0, LD / 2 - 0.02 * s, H)
  // (the lock's plate placed and lit here; its shield and keyhole by hand)
  const lock = sdf.intersect(sdf.box([0.15 * s, 0.04 * s, 0.17 * s]).at(0, -D / 2 - 0.02 * s, H + 0.01 * s), sdf.cylinder(0.14 * s, 0.1 * s).rotate(90, "x").at(0, -D / 2 - 0.02 * s, H + 0.09 * s)).mat("gold")
  if (!open) return sdf.union(body, bands, placed, lock)
  return sdf.union(body.subtract(sdf.box([Wd - 2 * B, D - 2 * B, H]).at(0, 0, H / 2 + 0.05 * s)), bands, placed, sdf.box([Wd - 2 * B, D - 2 * B, 0.02]).at(0, 0, H - 0.12 * s).mat("dark"))
}
draft("chest", CHEST(1))
draft("chest_open", CHEST(1, true))
draft("bigchest", CHEST(1.5))
draft("bigchest_open", CHEST(1.5, true))

// ---------------------------------------------------------------- the sign
// One board on a post (no joint across it: the user's pick; LPC's signs one framed panel), as the games' models build
// a sign: the board thick, 0.12 m (0.14 of its width: theirs 0.12-0.21), 0.84 x 0.48 (w/h 1.75: Tears of the Kingdom's
// 1.7, Link's Awakening's 1.23), its edges rounded 0.04 m, its foot 0.4 m up; the post behind it running up 0.08 m over
// its top (Tears of the Kingdom's), its cut end showing
draft("sign", sdf.union(sdf.box([0.12, 0.1, 0.96]).at(0, 0.06, 0.48).mat("wood"), sdf.box([0.84, 0.12, 0.48], { round: 0.04 }).at(0, -0.05, 0.64).mat("wood")))

// ---------------------------------------------------------------- the crate
// A crate 0.72 m a side: a frame of boards along its edges, planks between them (their seams 0.15 m apart)
const E = 0.72, B = 0.1, edges = []
for (const s of [-1, 1]) for (const t of [-1, 1]) {
  edges.push(sdf.box([B, B, E]).at((s * (E - B)) / 2, (t * (E - B)) / 2, E / 2))
  edges.push(sdf.box([E, B, B]).at(0, (s * (E - B)) / 2, t > 0 ? E - B / 2 : B / 2), sdf.box([B, E, B]).at((s * (E - B)) / 2, 0, t > 0 ? E - B / 2 : B / 2))
}
draft("crate", sdf.union(sdf.union(...edges).mat("wood"), sdf.box([E - 0.04, E - 0.04, E - 0.04]).at(0, 0, E / 2).paint((q, n) => (((Math.abs(n[2]) > 0.7 ? q[0] : Math.abs(n[0]) > 0.7 ? q[1] : q[0]) + 1) / 0.15) % 1 < 0.14 ? "seam" : "wood")))

// ---------------------------------------------------------------- the barrel
// A barrel bulging at its middle, four iron hoops; its staves' seams and its head by hand (below)
const HOOPS = [[0.07, 0.12], [0.27, 0.31], [0.55, 0.59], [0.75, 0.8]]
// (its belly a quarter wider than its ends, 0.76 m against 0.58, curving all the way as a cask's bilge does; LPC's barrel 28 px against 24)
const BARREL = [[0, 0.29], [0.1, 0.33], [0.25, 0.365], [0.43, 0.38], [0.61, 0.365], [0.76, 0.33], [0.86, 0.29]]
draft("barrel", lathe(BARREL).subtract(sdf.cylinder(0.27, 0.2).at(0, 0, 0.84)).paint((q) => (HOOPS.some(([a, b]) => q[2] > a && q[2] < b) ? "iron" : "wood")))

// ---------------------------------------------------------------- the lamp
// A street lamp: an iron post on a stepped foot, a lantern of glass in an iron frame on top, its cap a pyramid with a
// knob
const POST = sdf.union(sdf.box([0.24, 0.24, 0.1]).at(0, 0, 0.05), sdf.box([0.16, 0.16, 0.08]).at(0, 0, 0.14), sdf.box([0.08, 0.08, 1.36]).at(0, 0, 0.84), sdf.box([0.2, 0.2, 0.05]).at(0, 0, 1.5))
const FRAME = sdf.union(...[-1, 1].flatMap((s) => [-1, 1].map((t) => sdf.box([0.035, 0.035, 0.3]).at(s * 0.11, t * 0.11, 1.68))), sdf.box([0.28, 0.28, 0.04]).at(0, 0, 1.85))
draft("lamp", sdf.union(POST.mat("iron"), FRAME.mat("iron"), sdf.box([0.2, 0.2, 0.28]).at(0, 0, 1.68).mat("glass"), sdf.cone(0.2, 0.14, 0.02).at(0, 0, 1.87).mat("iron"), sdf.sphere(0.035).at(0, 0, 2.03).mat("iron")))

// ---------------------------------------------------------------- the hand passes
// rows and columns of a sprite's pixels of `keys`: [x0, y0, x1, y1] (inclusive), or undefined
const box = (c, keys, where = () => true) => {
  let x0 = c.w, y0 = c.h, x1 = -1, y1 = -1
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) if (c.is(x, y, keys) && where(x, y)) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y) }
  return x1 < 0 ? undefined : [x0, y0, x1, y1]
}
// the pot broken (3 frames, 32 x 36, the pot where pot stands): a crack down from under its lip where it was struck;
// burst, its rim (the lip and its ring, the top 8 rows) flying up in two halves, its sides out, its foot left where it
// stood; its shards on the ground (the lip's band, the belly, the foot's ring: no piece of the dark mouth). Each piece
// the pot's own pixels, moved by hand.
anim("pot_break", { w: 32, h: 36, pivot: "bottom", loop: false },
  frame({ ms: 80 }, (c) => {
    const b = c.asset("pot").bounds(), X = Math.floor((32 - b.w) / 2), Y = 36 - b.h
    piece(c, "pot", () => true, X, Y)
    // the crack: from the lip's front down the belly, zigzagging, lit along its left edge
    ;[[0, 0], [0, 1], [1, 2], [1, 3], [0, 4], [0, 5], [1, 6], [2, 7], [2, 8], [1, 9]].forEach(([u, v]) => { c.px(X + 7 + u, Y + 8 + v, "d"); if (c.is(X + 6 + u, Y + 8 + v, "OP")) c.px(X + 6 + u, Y + 8 + v, "P") })
  }),
  frame({ ms: 100 }, (c) => {
    const b = c.asset("pot").bounds(), X = Math.floor((32 - b.w) / 2), Y = 36 - b.h, m = b.w / 2
    // (each piece broken off along a slant, its broken edge lined as its own; its edges evened)
    const cut = (u, v) => u - m + (v - 8) * 0.3
    piece(c, "pot", (u, v) => v < 8 && cut(u, v) < 0, X - 5, Y - 7)                       // the rim's left half, flying up and left
    piece(c, "pot", (u, v) => v < 8 && cut(u, v) >= 0, X + 5, Y - 9)                      // its right half, higher
    piece(c, "pot", (u, v) => v >= 8 && v < b.h - 6 + (u > m ? 1 : 0) && cut(u, v) < -1, X - 4, Y - 1)   // the sides out
    piece(c, "pot", (u, v) => v >= 8 && v < b.h - 6 + (u > m ? 1 : 0) && cut(u, v) >= 1, X + 4, Y - 2)
    piece(c, "pot", (u, v) => v >= b.h - 6 + (u > m ? 1 : 0), X, Y)                        // the foot where it stood
    even32(c); line32(c, [[...MATS.clay, "#fff0c8"]]); even32(c); line32(c, [[...MATS.clay, "#fff0c8"]])
    // (four pixels by hand where the pieces' broken edges stepped out of order, against check --edges's reading)
    touch(c, [[8, 32, "fill"], [21, 34, "fill"], [28, 28, "fill"], [27, 10, "fill"]])
  }),
  frame({ ms: 400 }, (c) => {
    const b = c.asset("pot").bounds()
    // shards: bits of the rim and the belly lying on the ground round where it stood, the foot's ring in the middle,
    // each a rounded shard, lined as its own
    for (const [x, y, w, h, X, Y] of [[1, 5, 7, 4, 1, 31], [b.w - 8, 5, 7, 4, 24, 30], [1, 11, 6, 4, 8, 32], [b.w - 7, 12, 6, 4, 19, 32], [5, b.h - 5, 10, 5, 11, 31]])
      piece(c, "pot", (u, v) => ((u - x - (w - 1) / 2) / (w / 2)) ** 2 + ((v - y - (h - 1) / 2) / (h / 2)) ** 2 <= 1, X - x, Y - y)
    even32(c); line32(c, [[...MATS.clay, "#fff0c8"]]); even32(c); line32(c, [[...MATS.clay, "#fff0c8"]])
    touch(c, [[25, 30, "clear"]])
  }))
card("pot", { is: "a clay pot to lift and break at 32, turned in 3D and finished by hand as the games' pots are: as tall as it is wide, a rolled lip lit on top over a ring of its shadow, its mouth dark with its far wall lit, the shoulder glazed darker and dripping, a shine on the shoulder, a chip off the lip, its line only along its lower right", cells: { "topdown/32": "✎" },
  vary: { part: "pot_break: it cracks, bursts, lies in shards (the pot's own pixels moved)" } })

// the chest by hand: the arch in its bands (the back slope a step down, the crown lit, the front slope going down to
// the lip, a seam every fifth: the planks across it), its gold ends shaded with it; a shield lock plate over the seam
// with its keyhole; rivets on the corner bands (2, the big one 3, and its lid's ends 2 each, a lozenge crest over the
// lock: Echoes of Wisdom's big chest has its rivets and a crest); the grain a dash or two a plank; the lid's top corners
// rounded off. Open: the lid's inside (its rim lit, its far half curving away in shade, a seam every fifth, the hinge's
// shade, its ends gold), the back wall's inside in the box's shade under its lit top edge, coins in the dark
const span = (c, y) => { const xs = []; for (let x = 0; x < c.w; x++) if (c.get(x, y)) xs.push(x); return xs }
const DOWN = { V: "W", W: "Y", Y: "w", w: "w", h: "g", g: "G", G: "F", F: "F" }
const SHIELD = ["FGGGF", "GhggG", "GgdgG", "GgdgG", "FGgGF", ".FGF."], SHIELD_BIG = [".FGGGGF.", "FGhgggGF", "FGggdgGF", "FGgdddGF", "FGggdgGF", ".FGgggF.", "..FGGF..", "...FF..."]
const chestPass = (open, big = false) => (c) => {
  const ys = [...Array(c.h).keys()].filter((y) => span(c, y).length), top = ys[0], bot = ys.at(-1), x0 = span(c, bot)[0] - 1, X0 = Math.min(...ys.map((y) => span(c, y)[0]))
  // (the lid's rows: those reaching its left edge, past the body)
  const lidRows = ys.filter((y) => span(c, y)[0] === X0), lidBot = lidRows.at(-1), L = span(c, top)[0], R = span(c, top).at(-1), cx = Math.floor((L + R) / 2), bodyTop = lidBot + 1
  if (!open) {
    const a0 = top, a1 = lidBot - 2, n = a1 - a0 + 1
    for (let y = a0; y <= a1; y++) {
      const t = (y - a0) / (n - 1), seam = y > a0 + 1 && Math.floor((y - a0 + 1) / (n / 5)) !== Math.floor((y - a0) / (n / 5))
      const wood = t < 0.1 ? "W" : t < 0.5 ? "V" : t < 0.84 ? "W" : "Y", gold = t < 0.1 ? "g" : t < 0.5 ? "h" : t < 0.84 ? "g" : "G"
      for (let x = L; x < R; x++) if (c.get(x, y)) { const g = c.is(x, y, "FGgh"), k = g ? gold : wood; c.px(x, y, seam && !g ? DOWN[k] : k) }
      // (the gold ends' outer columns a step down: their edges, so they read round)
      if (c.is(L, y, "gh")) c.px(L, y, "g")
      if (c.is(R - 1, y, "gh")) c.px(R - 1, y, "G")
    }
    const S = big ? SHIELD_BIG : SHIELD, sw = S[0].length
    S.forEach((r, j) => [...r].forEach((k, i) => { if (k !== ".") c.px(cx - (sw >> 1) + i + (sw % 2 ? 0 : 1), lidBot - 2 + j, k) }))
    if (big) {
      for (const x of [L + 1, R - 2]) for (const y of [top + 3, lidBot - 5]) if (c.is(x, y, "FGgh")) { c.px(x, y, x < cx ? "h" : "g"); c.px(x, y + 1, "F") }
      ;["..F..", ".FgF.", "FghgF", ".FgF.", "..F.."].forEach((r, j) => [...r].forEach((k, i) => { if (k !== ".") c.px(cx - 2 + i, lidBot - 10 + j, k) }))
    }
  }
  for (const [x, k] of [[x0 + 2, "h"], [R - 1, "g"]]) for (const y of big ? [bodyTop + 2, Math.round((bodyTop + bot) / 2), bot - 3] : [bodyTop + 2, bot - 3]) if (c.is(x, y, "FGgh")) { c.px(x, y, k); if (c.is(x, y + 1, "FGgh")) c.px(x, y + 1, "F") }
  if (!big) for (const [u, v, w] of [[5, 2, 3], [16, 3, 2], [9, 6, 3], [20, 7, 2]]) for (let i = 0; i < w; i++) if (c.is(x0 + u + i, bodyTop + v, "Y")) c.px(x0 + u + i, bodyTop + v, "w")
  if (open) {
    const n = lidRows.length
    lidRows.forEach((y, j) => {
      const t = j / (n - 1), seam = j > 1 && j < n - 1 && Math.floor((j + 1) / (n / 5)) !== Math.floor(j / (n / 5)), sp = span(c, y), l = sp[0], r = sp.at(-1)
      for (const x of sp) {
        const end = x - l < (big ? 3 : 2) || r - x < (big ? 3 : 2), k = end ? (x - l < 1 ? "g" : r - x < 1 ? "F" : t < 0.4 ? "h" : "g") : j === 0 ? "V" : j === n - 1 ? "w" : t < 0.35 ? "Y" : "W"
        c.px(x, y, seam && !end ? DOWN[k] : k)
      }
    })
    const d = []; for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) if (c.is(x, y, "d")) d.push([x, y])
    const dx = Math.min(...d.map((p) => p[0])), dy = Math.min(...d.map((p) => p[1])), dBot = Math.max(...d.map((p) => p[1]))
    for (let y = bodyTop; y < dy; y++) { const sp = span(c, y); for (const x of sp) if (y === bodyTop) c.px(x, y, c.is(x, y, "FGgh") ? "h" : "V"); else if (!c.is(x, y, "FGgh") && x !== sp[0] && x !== sp.at(-1)) c.px(x, y, "Y") }
    for (const x of span(c, dBot + 1)) c.px(x, dBot + 1, c.is(x, dBot + 1, "FGgh") ? (x < cx ? "h" : "g") : "V")
    for (const [u, v, k] of [[3, 1, "g"], [4, 1, "h"], [5, 2, "G"], [3, 2, "G"], [9, 2, "g"], [10, 1, "g"], [11, 2, "G"], [15, 1, "g"], [16, 1, "h"], [17, 2, "G"], [21, 2, "g"]]) if (c.is(dx + u, dy + v, "d")) c.px(dx + u, dy + v, k)
  } else { c.px(L, top, "_"); c.px(R, top, "_") }
  line32(c, [MATS.wood, MATS.gold])
}
sprite("chest", { base: "_chest_draft" }, chestPass(false))
sprite("chest_open", { base: "_chest_open_draft" }, chestPass(true))
anim("chest_opening", { w: 32, h: 48, pivot: "bottom" }, frame({ ms: 700 }, stamp("chest", 16, 48)), frame({ ms: 900 }, stamp("chest_open", 16, 48)))
card("chest", { is: "a wooden chest at 32, modeled as the games' chests are and finished by hand: a body of two planks under a barrel lid (a flattened half-cylinder over a lip, planks across it, its crown lit), gold bands up its corners and over the lid's ends with rivets, a shield lock with a keyhole, a line only along its lower right", cells: { "topdown/32": "✎" },
  vary: { part: "chest_open: the lid swung back (its inside, gold ends), coins glinting in the dark inside; chest_opening plays the two" } })
sprite("bigchest", { base: "_bigchest_draft" }, chestPass(false, true))
sprite("bigchest_open", { base: "_bigchest_open_draft" }, chestPass(true, true))
anim("bigchest_opening", { w: 48, h: 72, pivot: "bottom" }, frame({ ms: 700 }, stamp("bigchest", 24, 72)), frame({ ms: 900 }, stamp("bigchest_open", 24, 72)))
card("bigchest", { is: "a big chest at 32, the dungeon's prize, 1.5 times the chest (Echoes of Wisdom's big one 1.6 times its small one): its rivets three to a corner band and two to each of the lid's gold ends, a gold lozenge crest over a bigger shield lock", cells: { "topdown/32": "✎" },
  vary: { part: "bigchest_open; bigchest_opening plays the two" } })

// the sign by hand, as the games' signs: its face catching the light a tone over the draft's, its lowest row weathered
// a step darker (the rain runs off it); the writing carved in three rows of rounded bars, 2-3-2 (Link's Awakening's),
// each groove the wood's darkest, its lower lip lit (the light falls into it from above), its ends a step lighter
// (rounded); the grain two dashes under the writing and a knot; a chip off its top right corner; the post's cut end
// over the board, its heart darker (its rings)
sprite("sign", { base: "_sign_draft" }, (c) => {
  const ys = [...Array(c.h).keys()].filter((y) => span(c, y).length > 14), y0 = ys[0], y1 = ys.at(-1), xs = span(c, y0 + 3), x0 = xs[0], x1 = xs.at(-1), face = y0 + 3
  for (let y = face; y < y1; y++) for (let x = x0 + 2; x < x1; x++) c.px(x, y, y === y1 - 1 ? "Y" : "W")
  const row = (v, bars) => bars.forEach(([a, b]) => { for (let x = a; x < b; x++) { const end = x === a || x === b - 1; c.px(x0 + x, face + v, end ? "Y" : "w"); c.px(x0 + x, face + v + 1, end ? "W" : "V") } })
  row(1, [[5, 12], [15, 23]]); row(4, [[4, 9], [11, 17], [19, 24]]); row(7, [[6, 13], [15, 21]])
  for (const [a, b] of [[3, 9], [17, 24]]) for (let x = a; x < b; x++) c.px(x0 + x, face + 9, "Y")
  ;[[1, 0, "Y"], [0, 1, "Y"], [1, 1, "w"], [2, 1, "Y"], [1, 2, "Y"]].forEach(([u, v, k]) => c.px(x0 + 22 + u, face + 6 + v, k))
  c.px(x1 - 2, y0, "_"); c.px(x1 - 1, y0 + 1, "_")
  const top = [...Array(c.h).keys()].find((y) => span(c, y).length), ps = span(c, top), pl = ps[0], pr = ps.at(-1)
  for (let x = pl; x <= pr; x++) { c.px(x, top, x === pr ? "Y" : "V"); c.px(x, top + 1, x === pl ? "W" : x === pr ? "w" : x === pl + 1 ? "Y" : "W") }
  line32(c, [MATS.wood])
})
card("sign", { is: "a wooden sign at 32, modeled as the games' signs are and finished by hand: one thick board, its edges rounded, on a post running up behind it (its cut end over the board), three rows of bars carved in it, its grain, a knot, a chipped corner, a line only along its lower right", cells: { "topdown/32": "✎" } })

// the crate by hand, as the games' boxes are built (Echoes of Wisdom's, Tears of the Kingdom's): each face a frame of
// four boards, the two across running over the uprights (a nail in each end), the panel inside sunk in the frame's
// shade (its top row the board's shadow, its left the upright's), of planks across (Tears of the Kingdom's), each lit
// along its top, a seam between; the top seen from above a frame of boards round a panel, the far board's shade on it;
// the grain a dash along each board; its corners worn round; the draft's light (the top lit, the front a step down)
sprite("crate", { base: "_crate_draft" }, (c) => {
  const [x0, y0, x1, y1] = box(c, "wYWV"), ft = y0 + Math.round(0.72 * 0.5 * 32), B = 3, H = 4
  for (let y = y0; y < ft; y++) for (let x = x0; x <= x1; x++) {
    if (!c.get(x, y)) continue
    c.px(x, y, x < x0 + B || x > x1 - B || y < y0 + 2 || y >= ft - 3 ? "V" : y === y0 + 2 ? "Y" : "W")
  }
  for (let y = ft; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (!c.get(x, y)) continue
    let k
    if (y < ft + H) k = y === ft + H - 1 ? "Y" : "W"
    else if (y > y1 - H) k = y === y1 - H + 1 ? "V" : "W"
    else if (x < x0 + B || x > x1 - B) k = x === x0 ? "V" : x === x0 + B - 1 || x === x1 - B + 1 ? "Y" : "W"
    else if (x === x0 + B) k = "w"
    else { const v = y - (ft + H); k = v === 0 || (v - 1) % 4 === 3 ? "w" : x === x1 - B || (v - 1) % 4 === 0 ? "W" : "Y" }
    c.px(x, y, k)
  }
  for (const [x, y, n] of [[x0 + 6, ft + 1, 4], [x0 + 14, ft + 2, 3], [x0 + 4, y1 - 1, 3], [x0 + 15, y1 - 2, 4]]) for (let i = 0; i < n; i++) if (c.is(x + i, y, "WV")) c.px(x + i, y, c.is(x + i, y, "V") ? "W" : "Y")
  for (const [x, y] of [[x0 + 1, ft + 1], [x1 - 1, ft + 1], [x0 + 1, y1 - 2], [x1 - 1, y1 - 2], [x0 + 1, y0 + 1], [x1 - 1, y0 + 1], [x0 + 1, ft - 2], [x1 - 1, ft - 2]]) c.px(x, y, "I")
  c.px(x0, y0, "_"); c.px(x1, y0, "_"); c.px(x0, y1, "_")
  line32(c, [MATS.wood])
})
card("crate", { is: "a wooden crate at 32, a tile, modeled and finished by hand as the games' boxes are built: each face a frame of four boards (those across over the uprights, nailed), a sunk panel of planks across, the top a frame round a panel, a line only along its lower right", cells: { "topdown/32": "✎" } })

// the barrel by hand: each hoop's shade a row on the staves under it, a nail in each hoop on the lit side (in the
// frame its draft was approved in, its foot's front on row 35)
sprite("barrel", { w: 26, h: 37, pivot: [13, 30] }, (c) => {
  const T = turned(c, BARREL, 35), DOWN = { V: "W", W: "Y", Y: "w", w: "w" }, Z = []
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) Z.push(T.zAt(x, y))
  const z = (x, y) => (x < 0 || x >= c.w ? null : Z[y * c.w + x])
  // the staves in the wood's 4 tones by the light; four iron hoops (each pixel whose front surface lies in a hoop's
  // height, lit at its left), the staves under each in its shade a row deep
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    const zz = z(x, y)
    if (zz === null) continue
    const h = Math.abs(zz), b = T.lit(x, zz), hoop = HOOPS.some(([a, t]) => h > a && h < t)
    c.px(x, y, hoop ? (b > 0.6 ? "j" : b > 0.25 ? "J" : "i") : b > 0.7 ? "V" : b > 0.4 ? "W" : b > 0.05 ? "Y" : "w")
    if (!hoop && HOOPS.some(([a]) => h <= a && h > a - 0.035)) c.px(x, y, DOWN[["V", "W", "Y", "w"].find((k) => c.is(x, y, k))])
  }
  // each stave's seam: a pixel a row where its edge runs round the bulge, every 30 degrees, a step darker (not on a hoop)
  for (let y = 0; y < c.h; y++) {
    const xs = [...Array(c.w).keys()].filter((x) => z(x, y) !== null)
    if (!xs.length) continue
    for (const a of [-60, -30, 0, 30, 60]) {
      const x = Math.round(T.cx - 0.5 + T.r(Math.abs(z(xs[0], y))) * 32 * Math.sin(((a + 15) * Math.PI) / 180))
      if (c.is(x, y, "VWY")) c.px(x, y, DOWN[["V", "W", "Y"].find((k) => c.is(x, y, k))])
    }
  }
  // the head seen from above: its rim lit along the back, the head inside it, the rim's shade along its back edge and a
  // seam between two planks a step down
  const [cx, cy, RX, RY] = T.at(0.86), [, , rx, ry] = T.at(0.86, 0.26)
  const e = (x, y, a, b) => ((x + 0.5 - cx) / a) ** 2 + ((y + 0.5 - cy) / b) ** 2
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    if (e(x, y, RX, RY) >= 1) continue
    c.px(x, y, e(x, y, rx, ry) < 1 ? (y + 0.5 < cy - ry + 1 || Math.abs(y + 0.5 - cy) < 0.5 ? "Y" : "W") : y + 0.5 < cy ? "V" : "W")
  }
  even32(c); line32(c, [MATS.wood, MATS.iron])
})
card("barrel", { is: "a barrel at 32, modeled and finished by hand: staves bulging at its middle, four iron hoops each shading the staves under it, a line only along its lower right", cells: { "topdown/32": "✎" } })

// the lamp by hand: a flame in the lantern, the glass glowing round it, the frame's bars across it
sprite("lamp", { base: "_lamp_draft" }, (c) => {
  const [x0, y0, x1, y1] = box(c, "ElLX"), cx = Math.floor((x0 + x1) / 2), cy = Math.floor((y0 + y1) / 2)
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (c.is(x, y, "ElLX")) c.px(x, y, Math.abs(x - cx - 0.5) + Math.abs(y - cy) < 2.5 ? "L" : y === y0 || x === x1 ? "E" : "l")
  for (const [u, v] of [[0, -1], [0, 0], [1, 0], [0, 1], [1, 1]]) c.px(cx + u, cy + v, "X")
})
card("lamp", { is: "a street lamp at 32, two tiles tall, modeled and finished by hand: an iron post on a stepped foot, a glass lantern with its flame, a pyramid cap, a line only along its lower right", cells: { "topdown/32": "✎" } })
}
