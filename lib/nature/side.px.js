// The side-on world of a platformer at a 16 px grid (lib/profiles/platformer16.px.js): the ground, water, what grows
// on it and the backdrop's two planes, drawn by hand to the numbers of Mega Man X2's and X3's stages and Symphony of
// the Night's maps (library F5's platformer kit study, numbers only; never their pixels). The ground is busy and
// set apart from the backdrop by value: a grass lip 11 rows deep, a dark rim on its top and its light hanging below
// it (leaves 4-5 wide, lit, yellow at their tips: the lightest pixels of the level), a dark band under it, ragged,
// then a body of earth with stones set in it in rough strata (a lens of rock pinching out, stones of 2-9 px lit on
// their tops), 6 tones from V16 to V86 (V 44, sd 16). No line: a wall face is the body losing its light over its
// last 4 columns, set 2 px in from the tile's edge, the lip hanging over it. Tiles by their four neighbours:
// ground_<mask>_<v>, the mask's bits the sides open to the air (1 up, 2 right, 4 down, 8 left), v 0-3 seamless in
// any order (side.ground() picks one by the tile's place, at random); slopes of 8 px a tile (slope_up_a, slope_up_b
// and their feet under them; slope_down_* their mirrors). Water with its surface (water_top, water: 4 frames, a lit
// line, a glint, caustics, three bands interlocking; water_deep). An oak, a pine and a bush at the figure's scale
// (1.9x, 1.9x and 0.5x its 32 px; pxl lib draft drew them first, side on, kept local), lined in their own darkest.
// The backdrop: clouds far (thin streaks) and near (cumulus), and hills, strips that wrap for scroll(), V 66-100
// against the ground's 44, their colors by role for a palette swap (dusk, night). The light by the time of day: the
// same drawings at dusk and at night by a palette swap, side.DUSK and side.NIGHT (each color to its new one: a
// layer's `swap`, layer("ground", { swap: side.DUSK }, side.ground(map))), and the sky as the air at each time
// (side.sky, sky_dusk, sky_night) and the full moon. For any scene: include("<path>/lib/nature/side.px.js",
// { as: "side" }), its palette its own; side.ground(map) draws a level.
const side = {}
// in a block: its names stay its own when a scene includes the file
{
const DAY = {
  R: "#1f4636", K: "#2e6a38", M: "#4f9a3c", L: "#97cd55", T: "#eef08a",                 // the lip: rim, leaves dark to lit, tips
  a: "#2a1a26", d: "#4a3036", h: "#6e4c40", l: "#957056", p: "#bb9370", u: "#e0c29a",   // the body: band, cracks, shade, body, lit, tops
  e: "#3a2420", w: "#6b4430", W: "#9c6a40",                                              // bark
  o: "#173e6e", n: "#235894", q: "#2d74b4", s: "#5cb4e2", f: "#d4f6ff",                  // water: deep, middle, body, light, foam
  c: "#ffffff", C: "#e6f2fc", B: "#bed6ec", b: "#9ebddc",                                // clouds: lit rim, lit, shade, underside
  v: "#a8dcc4", V: "#86c2ae", x: "#6aa898",                                              // hills
}
pal(DAY)
ramps("RKMLT", "adhlpu", "ewW", "onqsf")
// ---------------------------------------------------------------- the lip, by hand
// Two strips 16 wide, 11 deep: row 0 the blades' ragged tips in the rim's dark (R), row 1 the rim, then leaves
// 3-5 wide hanging from it, 4 a tile of 5-8 rows, overlapping: each its dark side (K), its middle (M), lit (L), a
// yellow tip (T) at its end; the rim's dark between them, the band (a) under them. Their edge columns between
// leaves, so the two join in any order.
const LIP = [`
.RK..RKR.KR..RK.
RRRRRRRRRRRRRRRR
RKMMKRKMMKKMMKRR
KMLLMKMLLMMLLMKR
KMLLLMKLLMMLLLMK
RKMLLMKMLMKMLLMK
RKMLTMKKMKRKMLTK
RRKMTKRKMKRRKMTR
aRKTKRaRKRaRRKTR
aaRTRaaaRaaaRRKa
aaaRaaaaaaaaaRaa`, `
.KR.RRK..RKR.KR.
RRRRRRRRRRRRRRRR
RRKMMKRKMMKRKMKR
RKMLLMKMLLMKMLMK
KMLLLMKMLLLKMLLM
KMLLMKRKMLLKMLMK
RKMTMKRRKMLKKMKR
RRKTKRaRKMTKRKRR
aRRKRaaRKLTRaRRa
aaRRaaaaRKTaaaRa
aaaaaaaaaRaaaaaa`].map((s) => s.trim().split("\n"))
const DEEP = 11
// the band under the lip: 0 to 2 rows more, ragged
const band = (x, v) => Math.floor(hash(x, v, 7) * 3)
// ---------------------------------------------------------------- the body
// Earth with stones set in it, in rough strata: the earth the shade flecked with the dark. A stratum of rock in each
// tile, a lens that swells to 2-3 rows inside it and pinches out at the tile's edges (or sooner), its top lit in
// broken dashes, a dark seam under it. Stones 2-9 px wide and 2-4 tall in loose rows round it (the rows wander, the
// sizes and gaps vary by the variant), each a rounded block lit along its top (its first pixels the lightest), its
// left a step lit, its right and its last row the shade, its shadow under it in the dark. Nothing crosses a tile's
// edge but the earth, so any variant meets any other. A row changes color every 2-3 px (the references': 2.4).
const LENS = [[4, 0, 10, 3], [10, 6, 15, 2], [7, 2, 12, 3], [12, 0, 8, 2]]   // a variant's: its middle row, from x, to x, its swell
const lens = (x, y, v) => {
  const [yc, a, b, T] = LENS[v], t = Math.round(T * Math.sin((Math.PI * (x - a)) / (b - a)))
  if (x <= a || x >= b || t < 1) return null
  const top = yc - (t >> 1), r = y - top
  if (r < 0 || r > t) return null
  if (r === t) return "d"   // the seam under it
  if (r === 0) return hash(x >> 1, yc, v + 50) < 0.25 ? "h" : (x + v) % 5 < 2 ? "u" : "p"
  return r === t - 1 && t > 1 ? "h" : hash(x, y, v + 51) < 0.25 ? "p" : "l"
}
const STONES = [0, 1, 2, 3].map((v) => {
  const out = [], [yc] = LENS[v]
  for (const y of [0, 5, 11].map((y) => (Math.abs(y - yc) < 4 ? (y < yc ? Math.max(0, yc - 7) : Math.min(12, yc + 3)) : y))) {
    let x = 1 + Math.floor(hash(y, v, 30) * 2)
    for (let s = 0; x < 13; s++) {
      const w = Math.min(14 - x, 2 + Math.floor(hash(s, y, v + 31) ** 1.5 * 8)), h = Math.min(4, 2 + Math.floor((w / 9) * 3 * hash(s, y, v + 32) + 0.5))
      const y0 = Math.min(16 - h - 1, y + Math.floor(hash(s, y, v + 33) * 3))
      if (w >= 2) out.push([x, y0, w, h])
      x += w + 1 + Math.floor(hash(s, y, v + 34) * 3)
    }
  }
  return out
})
const stone = (x, y, v) => {
  for (const [x0, y0, w, h] of STONES[v]) {
    if (x < x0 || x >= x0 + w || y < y0 || y > y0 + h) continue
    const u = x - x0, r = y - y0, corner = (u === 0 || u === w - 1) && (r === 0 || r === h - 1) && w > 2 && h > 2
    if (r === h) return u > 0 ? "d" : null   // its shadow under it
    if (corner) return r === 0 ? null : "d"
    if (r === 0) return u < 1 + (w >> 2) ? "u" : "p"
    if (r === h - 1) return "h"
    return u === 0 ? "p" : u === w - 1 ? "h" : hash(x, y, v + 40) < 0.2 ? "p" : "l"
  }
  return null
}
const earth = (x, y, v) => lens(x, y, v) ?? stone(x, y, v) ?? (hash(x, y, v + 41) < 0.2 ? "d" : hash(x, y, v + 42) < 0.06 ? "a" : hash(x, y, v + 43) < 0.2 ? "l" : "h")
// The edges. A face (a side open to the air): stones jutting 0-2 px out of the stone's line into the 2 px it is set
// in from the tile's edge, 2-4 rows each, a crevice of the dark between them, so it is never a straight cut; the
// body losing its light over its last columns: a little on a face to the left (toward the light), more on a face to
// the right (in shade), its edge column there the dark. The lip over a face runs on past the stone and drapes down
// it: a tuft overhanging the corner, strands of leaves hanging 2-6 px below the lip, lit at their tips. An underside
// (the bottom open): its edge cut up 0-3 px in runs of 2-5 columns, the last row a dark crevice, now and then a root
// hanging from it to the tile's foot. All by the variant and the side, so the edges don't repeat.
const DARKER = { u: "l", p: "h", l: "h", h: "d", d: "a", a: "a" }
// the stones along a face: [first row, rows, jut] of the one at row y
const jutAt = (y, v, side) => { for (let a = 0, i = 0; ; i++) { const n = 3 + Math.floor(hash(i, v, side + 60) * 4); if (y < a + n) return [a, n, [0, 0, 1, 2, 1, 2][Math.floor(hash(i, v, side + 61) * 6)]]; a += n } }
const face = (k, s, lit) => (lit ? (s === 0 ? (k === "u" || k === "p" ? "l" : k === "l" ? "h" : k) : s < 2 && k === "u" ? "p" : k)
  : s === 0 ? (k === "a" ? "a" : "d") : s < 3 ? DARKER[k] : s < 5 && (k === "u" || k === "p") ? "l" : k)
// the lip past a face: how far each of the 2 columns out from the stone keeps its rows (a tuft), and the strands
// hanging from it down the face's first 4 columns
const HANG = (o, v, side) => [[8, 9, 7, 10], [5, 6, 3, 7]][o][(v + side) % 4]
const drape = (o, y, v, side) => {
  if (hash(o, v, side + 70) > 0.8) return null
  const len = 2 + Math.floor(hash(o, v, side + 71) * 6), r = y - (DEEP - 1)
  return r < 0 || r >= len ? null : r === len - 1 ? (hash(o, v, side + 72) < 0.5 ? "L" : "T") : o % 2 ? "K" : "M"
}
// an underside's edge: rows cut up from the tile's foot at column x, and a root hanging there or not
const cutAt = (x, v) => { for (let a = 0, i = 0; ; i++) { const n = 2 + Math.floor(hash(i, v, 80) * 4); if (x < a + n) return [0, 1, 3, 2, 1, 0][Math.floor(hash(i, v, 81) * 6)]; a += n } }
const rootAt = (x, v) => hash(x, v, 82) < 0.16
// a tile: its mask's open sides
const tile = (m, v) => (c) => {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    // each open side: its column out from the tile's edge (o), the stone's edge there (2 less the jut)
    const sides = [[8, x, 0], [2, 15 - x, 1]].filter(([b]) => m & b).map(([, o, side]) => { const [a, n, j] = jutAt(y, v, side); return { o, side, edge: 2 - j, r: y - a, n } })
    const f = sides.reduce((p, q) => (q.o - q.edge < (p ? p.o - p.edge : 99) ? q : p), null), s = f ? f.o - f.edge : 99
    const cut = m & 4 ? cutAt(x, v) : -1, foot = 15 - cut
    let k = null
    if (m & 1 && y < DEEP) {
      k = LIP[v & 1][y][x]
      const out = f && f.o < 2 ? 2 - f.o : 0   // 1 or 2 columns out from the stone's line
      if (out && (y >= HANG(out - 1, v, f.side) || k === "a" || (y === 0 && out === 2))) k = null
      if (out === 2 && y === 1) k = "R"
      if (k === ".") k = null
    } else if (f && f.o < 2 && s < 0) k = null
    else if (y > foot) k = rootAt(x, v) && y < 15 ? (y === 14 || hash(x, y, v) < 0.3 ? "d" : "h") : null
    else {
      k = m & 1 && y < DEEP + band(x, v) ? "a" : earth(x, y, v)
      // a jutting stone: rounded (its outermost column on its middle rows only), lit along its top, the crevice under
      // it, its side lit on a face to the left, in shade on one to the right
      if (f && f.o < 2) k = s === 0 && (f.r === 0 || f.r === f.n - 1) && f.edge === 0 ? null : f.r === f.n - 1 ? "d" : f.r === 0 ? "p" : f.side ? "h" : "l"
      if (k && f && s < 5) k = face(k, s, f.side === 0)
      if (k && cut >= 0 && y === foot) k = "a"
      else if (k && cut >= 0 && y === foot - 1) k = DARKER[DARKER[k]]
    }
    if (m & 1 && f && f.o < 4 && y >= DEEP - 1) k = drape(f.o, y, v, f.side) ?? k
    if (k) c.px(x, y, k)
  }
}
for (let m = 0; m < 16; m++) {
  for (let v = 0; v < 4; v++) sprite(`ground_${m}_${v}`, { w: 16, h: 16 }, tile(m, v))
  group(`ground_${m}`, [0, 1, 2, 3].map((v) => `ground_${m}_${v}`))
}
// ---------------------------------------------------------------- slopes
// 8 px up a tile (Mega Man X2's: 1 px every 2), the lip following it in steps of 2 px: slope_up_a rises from the
// tile's foot to its middle, slope_up_b from its middle to its top; under each its foot (the lip's lower rows), for
// the tile below. The down slopes are their mirrors.
const SURF = { a: (x) => 16 - Math.floor((x + 1) / 2), b: (x) => 8 - Math.floor((x + 1) / 2) }
const slope = (surf, below, v) => (c) => {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const dd = y + below - surf(x)
    const k = dd < 0 ? null : dd < DEEP ? LIP[v & 1][dd][x] : dd < DEEP + band(x, v) ? "a" : earth(x, y, v)
    if (k && k !== ".") c.px(x, y, k)
  }
}
for (const p of ["a", "b"]) {
  sprite(`slope_up_${p}`, { w: 16, h: 16 }, slope(SURF[p], 0, p === "a" ? 0 : 1))
  sprite(`slope_up_${p}_foot`, { w: 16, h: 16 }, slope(SURF[p], 16, p === "a" ? 2 : 3))
  sprite(`slope_down_${p}`, { base: `slope_up_${p}`, flip: "x" })
  sprite(`slope_down_${p}_foot`, { base: `slope_up_${p}_foot`, flip: "x" })
}

// ---------------------------------------------------------------- a level
// ground(map): a layer's function drawing a map of 16 px tiles, a row a line: # ground, // a slope's two tiles
// going up a tile (\\ down), # under them; anything else air. Each tile by its neighbours, its variant by its place.
const NS = own("ground_0_0").slice(0, -"ground_0_0".length)   // this file's names as the including file sees them
const ground = (map) => (c) => {
  const rows = map.trim().split("\n").map((r) => r.trim()), at = (i, j) => rows[j]?.[i] ?? (j >= rows.length ? "#" : ".")
  const slope = (ch) => ch === "/" || ch === "\\", open = (i, j) => at(i, j) !== "#" && !slope(at(i, j))
  // a slope's tile, the first or the second of its pair: up a then b, down b then a
  const part = (i, j) => { let k = 0; while (at(i - k - 1, j) === at(i, j)) k++; return (at(i, j) === "/") === (k % 2 === 0) ? "a" : "b" }
  rows.forEach((r, j) => [...r].forEach((ch, i) => {
    const up = at(i, j - 1), dir = (s) => (s === "/" ? "up" : "down")
    if (ch === "#" && slope(up)) c.stamp(`${NS}slope_${dir(up)}_${part(i, j - 1)}_foot`, i * 16, j * 16)
    else if (ch === "#") c.stamp(`${NS}ground_${(at(i, j - 1) !== "#" ? 1 : 0) | (open(i + 1, j) ? 2 : 0) | (at(i, j + 1) !== "#" ? 4 : 0) | (open(i - 1, j) ? 8 : 0)}_${Math.floor(hash(i, j, 5) * 4)}`, i * 16, j * 16)
    else if (slope(ch)) c.stamp(`${NS}slope_${dir(ch)}_${part(i, j)}`, i * 16, j * 16)
  }))
}
card("ground_1", { is: "the ground's top: a grass lip 11 rows, a dark rim over leaves lit at their tips, a ragged dark band, earth with stones set in it in rough strata, lit on their tops; ground_<mask>_<v> for every side open to the air (1 up, 2 right, 4 down, 8 left), its stone set 2 px in from a face, the lip hanging over it; v 0-3 seamless", cells: { "side/16": "✓" },
  vary: { part: "16 masks x 4 variants (ground_<mask> a group of them); slopes of 8 px a tile, slope_up_a, slope_up_b, their _foot under them, slope_down_* their mirrors; side.ground(map) draws a map of # / \\ by its neighbours" } })
card("slope_up_a", { is: "a slope's lower tile, rising 8 px across (1 px every 2), the lip stepping with it; slope_up_b the upper; their feet under them", cells: { "side/16": "✓" } })

// ---------------------------------------------------------------- water
// Four frames at 150 ms, a loop of 16 px. water_top: the surface a lit line (foam broken by ripples drifting 4 px a
// frame), the light under it, a glint that moves along it and flares into a cross every other frame; the body under
// it with caustics, dashes of the light wandering back and forth. water: the body grading into the deep in three
// bands that interlock (each boundary a wave a pixel or two high, a dithered row over it), its caustics fewer and
// slower. water_deep, under them: the deep, faint dashes of the middle band in it.
const CAUSTIC = [[2, 6, 3], [9, 8, 2], [5, 11, 2], [12, 13, 3]]
const caustics = (c, i, list, k, step) => { for (const [x, y, n] of list) for (let j = 0; j < n; j++) c.px((x + j + (y % 2 ? i : -i) * step + 32) % 16, y, k) }
// a wavy boundary at row y0: under it the darker band, a dithered row over it
const grade = (c, y0, phase, k) => { for (let x = 0; x < 16; x++) { const yb = y0 + Math.round(1.4 * Math.sin(((x + phase) * Math.PI) / 8)); c.rect(x, yb, 1, 16 - yb, k); if ((x + yb) % 2) c.px(x, yb - 1, k) } }
anim("water_top", { w: 16, h: 16 }, ...[0, 1, 2, 3].map((i) => frame({ ms: 150 }, (c) => {
  c.rect(0, 4, 16, 12, "q")
  for (let x = 0; x < 16; x++) { const u = (x + 4 * i) % 16; c.px(x, 3, u % 8 === 5 || u % 8 === 6 ? "s" : "f"); if (u % 8 < 3) c.px(x, 4, "s") }
  const g = [3, 7, 11, 14][i]
  c.px(g, 3, "c"); if (i % 2 === 0) { c.px(g, 2, "c"); c.px(g - 1, 3, "c"); c.px(g + 1, 3, "c") }
  caustics(c, i, CAUSTIC, "s", 2)
})))
anim("water", { w: 16, h: 16 }, ...[0, 1, 2, 3].map((i) => frame({ ms: 150 }, (c) => {
  c.rect(0, 0, 16, 16, "q"); grade(c, 5, 0, "n"); grade(c, 12, 5, "o")
  caustics(c, i, [[3, 1, 2], [11, 3, 2], [7, 8, 2]], "s", 1)
})))
sprite("water_deep", { w: 16, h: 16 }, rect(0, 0, 16, 16, "o"), (c) => { for (const [x, y] of [[2, 3], [3, 3], [10, 7], [11, 7], [6, 12], [7, 12], [14, 14]]) c.px(x, y, "n") })
card("water_top", { is: "water's surface: a lit line broken by drifting ripples, a glint that moves and flares, caustics in the body (4 frames, a 16 px loop); water under it grading to the deep in three interlocking bands, water_deep lower down", cells: { "side/16": "✓" } })

// ---------------------------------------------------------------- what grows: an oak, a pine, a bush
// A leafy mass the top-down kit's way (lib/nature/trees.px.js's crown, side on; Mega Man X2's jungle crowns: leaf
// marks 3-5 px, 60% of the crown in its two darkest greens, its light sparse and high): an ellipse whose rim steps out
// in square teeth (3 px every 3-4 px round it, out 0 or 1), not a smooth outline; clusters of 5 px set diagonally,
// each one tone by where it sits (lit on the upper left, the shade a band along the lower right and the underside,
// darkest inside it), each cluster's upper left two pixels a step lighter; pale blobs [x, y, w, h] on the upper two
// thirds (a lobe's lit top, a crescent of the middle green under it); holes [x, y] where what is behind shows; its
// edge the darkest green, a step lighter on the lit upper left. `flat`: cut level at its middle (a mound).
const CROWN = ["R", "K", "M", "L", "T"]
const leafy = (cx, cy, rx, ry, blobs, { flat = false, holes = [] } = {}) => (c) => {
  const role = new Map(), key = (x, y) => `${x},${y}`, set = (x, y, t) => role.set(key(x, y), t), has = (x, y) => role.has(key(x, y))
  const bottom = flat ? cy : cy + ry, sh = (x, y) => ((x - cx) / rx) * 0.45 + ((y - cy) / ry) * (flat ? 1.6 : 0.9)
  for (let y = Math.floor(cy - ry); y <= bottom; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1) set(x, y, 2)
  const n = Math.round((Math.PI * (rx + ry)) / 3.4)
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, o = [1, 0, 1, 1, 0][i % 5], x0 = Math.round(cx + (rx - 1 + o) * Math.cos(a) - 1), y0 = Math.round(cy + (ry - 1 + o) * Math.sin(a) - 1)
    for (let v = 0; v < 3; v++) for (let u = 0; u < 3; u++) if (y0 + v <= bottom) set(x0 + u, y0 + v, 2)
  }
  for (let gy = Math.floor(cy - ry) - 3; gy < bottom + 3; gy += 5) for (let gx = Math.floor(cx - rx) - 3 + (Math.round(gy / 5) % 2 ? 0 : 2); gx < cx + rx + 3; gx += 5) {
    const s = sh(gx + 2, gy + 2), t = s > 0.45 ? 0 : s > 0.05 ? 1 : s > -0.45 ? 2 : 3
    for (let v = 0; v < 5; v++) for (let u = 0; u < 5; u++) {
      const x = gx + u, y = gy + v
      if (!has(x, y) || ((u === 0 || u === 4) && (v === 0 || v === 4))) continue
      set(x, y, (v === 0 && u < 3) || (u === 0 && v < 3) ? Math.min(3, t + 1) : t)
    }
  }
  for (const [x, y, w, h] of blobs) {
    for (let v = 0; v < h; v++) for (let u = 0; u < w; u++) if (!((u === 0 || u === w - 1) && (v === 0 || v === h - 1)) && has(x + u, y + v)) set(x + u, y + v, 4)
    for (let u = 1; u < w + 1; u++) if (has(x + u, y + h)) set(x + u, y + h, 2)
  }
  for (const [x, y] of holes) for (let v = 0; v < 2; v++) for (let u = 0; u < 3; u++) if (!(v && (u === 0 || u === 2))) role.delete(key(x + u, y + v))
  for (const [k, t] of role) {
    const [x, y] = k.split(",").map(Number), edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([i, j]) => !has(x + i, y + j))
    c.px(x, y, CROWN[edge ? (sh(x, y) < -0.3 ? 1 : 0) : t])
  }
}
// a trunk from [x, y] down to the ground row g, w wide: lit on its left, its edges the bark's darkest (its line); its
// roots flaring 3 px each side over its last 3 rows, on the ground row
const trunk = (x, y, w, g) => (c) => {
  for (let j = y; j <= g; j++) { const flare = j > g - 3 ? g - 3 - j + 3 : 0; for (let i = x - flare; i < x + w + flare; i++) c.px(i, j, i === x - flare || i === x + w - 1 + flare || j === g ? "e" : i < x + w / 2 ? "W" : "w") }
}
// The oak: 48 x 60 (2 tiles over the figure, 3 wide): a round crown wider than tall (the 3D draft's spread), 46 x 36,
// its limbs showing through two gaps low down; a stout trunk 6 px lit on its left, its roots flaring on the ground row
// (its foot: stamp it at the ground's top + 1, behind the lip).
sprite("oak", { w: 48, h: 60, pivot: "bottom" },
  (c) => { for (const [x0, x1, y1] of [[21, 14, 31], [26, 34, 30], [23, 23, 26]]) { c.line(x0, 42, x1, y1, "w"); c.line(x0 + 1, 42, x1 + 1, y1, "e") } },
  trunk(21, 38, 6, 59), rect(21, 38, 6, 2, "e"),
  leafy(24, 22, 22, 17, [[13, 7, 6, 4], [24, 5, 5, 3], [7, 14, 5, 3], [19, 12, 6, 4], [31, 10, 5, 3], [12, 21, 4, 3], [25, 19, 4, 3]], { holes: [[14, 33], [29, 34]] }))
card("oak", { is: "an oak side on, 48 x 60: a round crown of leaf clusters lit on their upper left, pale blobs high on it, the shade a band low and to the right, square teeth round its edge, limbs through gaps; a stout trunk lit on its left, its roots flaring on the ground", cells: { "side/16": "✎" } })
// The pine: 32 x 60: a spire, then 5 tiers of boughs, each tier a bough a side reaching out and down from the trunk:
// thick where it leaves the trunk's top, thinning to a tip that droops, split into clumps by a notch, its underside
// in needle points (2 px every 3); lit from above and from the left (the right a step darker), dark inside by the
// trunk, its edge the darkest (a step lighter along its lit top). Under each tier the boughs leave the trunk bare
// for a few rows before the next: the trunk shows between them.
const TIERS = [[11, 6, 5, 2], [18, 9, 5, 3], [26, 12, 6, 4], [34, 14, 6, 4], [42, 16, 6, 5]]   // [top, reach, thickness, droop]
sprite("pine", { w: 34, h: 60, pivot: "bottom" }, trunk(15, 14, 4, 59), (c) => {
  const cx = 16.5, role = new Map(), key = (x, y) => `${x},${y}`
  const set = (x, y, t) => role.set(key(x, y), t)
  // the spire: a spike 2-3 px wide over the first tier, lit on its left
  for (let y = 1; y < 12; y++) { const hw = y < 4 ? 0 : y < 8 ? 1 : 2; for (let i = -hw; i <= hw; i++) set(Math.floor(cx + i), y, i < 0 ? 3 : i === 0 ? 2 : 1) }
  for (const [top, reach, th, droop] of TIERS) for (const s of [-1, 1]) for (let d = 0; d <= reach; d++) {
    const f = d / reach, notch = Math.abs(f - 0.5) < 0.07 ? 1 : 0, clump = f > 0.78 ? 1 : 0
    const y0 = top + Math.round(droop * f * f) + notch - clump, t = Math.max(2, Math.round(th * (1 - 0.45 * f)) - notch + clump), x = Math.floor(cx + s * (d + 0.5))
    const tooth = d % 3 === 1 ? 2 : d % 3 === 2 ? 1 : 0
    for (let y = y0; y < y0 + t + tooth; y++) {
      const rr = (y - y0) / Math.max(1, t - 1), light = 3 - 2.4 * rr + (s < 0 ? 0.4 : -0.4) - (d < 3 ? 1.2 : 0) + (f > 0.8 && y === y0 ? 1 : 0)
      set(x, y, Math.max(0, Math.min(4, Math.round(light))))
    }
  }
  for (const [k, t] of role) {
    const [x, y] = k.split(",").map(Number), edge = [[1, 0], [-1, 0], [0, 1]].some(([i, j]) => !role.has(key(x + i, y + j)))
    c.px(x, y, CROWN[edge ? (t >= 3 ? 1 : 0) : t])
  }
})
card("pine", { is: "a pine side on, 34 x 60: a spire, five tiers of boughs reaching out and drooping to their tips, split in clumps, needle points under them, lit on top and on the left, dark by the trunk, the trunk showing between the tiers", cells: { "side/16": "✎" } })
// The bush: a low mound the crown's way (cut level at its foot), a band of the darkest where it meets the ground,
// blades of grass in front of its foot (1 px, 2-4 tall, lit at their tips). bush 28 x 16 (half the figure), bush_small
// 18 x 11. Stamp it at the ground's top + 1, behind the lip.
const bush = (W, H, rx, ry, blobs, BLADES) => (c) => {
  leafy(W / 2, H - 3, rx, ry, blobs, { flat: true })(c)
  for (let x = Math.ceil(W / 2 - rx) + 1; x < W / 2 + rx - 1; x++) { c.px(x, H - 2, "R"); if (x > W / 2 - rx + 2 && x < W / 2 + rx - 3) c.px(x, H - 1, "R") }
  for (const [x, h] of BLADES) for (let j = 0; j < h; j++) c.px(x, H - 1 - j, j === h - 1 ? "L" : j ? "M" : "K")
}
sprite("bush", { w: 28, h: 16, pivot: "bottom" }, bush(28, 16, 13, 11, [[6, 4, 4, 3], [12, 2, 5, 3], [19, 5, 4, 3]], [[4, 3], [7, 2], [11, 4], [17, 3], [20, 2], [24, 3]]))
sprite("bush_small", { w: 18, h: 11, pivot: "bottom" }, bush(18, 11, 8, 7, [[5, 2, 3, 2], [9, 1, 4, 3]], [[3, 2], [8, 3], [13, 2]]))
card("bush", { is: "a bush side on, 28 x 16: a low mound of leaf clusters lit on their upper left, pale blobs on top, square teeth round it, a dark band at its foot, blades of grass in front; bush_small 18 x 11", cells: { "side/16": "✎" } })

// ---------------------------------------------------------------- the backdrop's two planes
// The sky's clouds in two strips, far and near, and the hills under them; all wrap for scroll(), the farther the
// slower. Their colors by role, so a palette swap turns them to dusk or night: c the lit tops, C the lit body, B the
// shade, b the underside (and the far clouds' C and B).
// clouds, the near layer, 192 x 40: cumulus, each a heap of puffs [x, y, r] (a little wider than tall; the back ones
// first), flat at its base. Lit as one mass from above: its upper half the lit body (C), then the shade (B), its
// underside the darkest (b) on a flat base, its lower edge broken (a row with gaps); each puff's own top contour,
// where nothing in front covers it, lit (its rim c on the high puffs, C on the low ones), more on its left; over a
// puff in front, the one behind a step darker (its shadow), so the heap has depth. V 85-100.
const CUMULI = [
  { base: 33, puffs: [[56, 9, 5], [30, 19, 9], [47, 15, 11], [63, 21, 8], [23, 21, 5], [18, 27, 6], [36, 25, 8], [54, 26, 7], [71, 28, 5]] },
  { base: 31, puffs: [[143, 13, 5], [123, 22, 7], [137, 17, 9], [151, 22, 7], [129, 27, 5], [144, 27, 6], [158, 27, 4]] },
]
sprite("clouds", { w: 192, h: 40, wrap: "x" }, (c) => {
  for (const { base, puffs } of CUMULI) {
    const top = Math.min(...puffs.map(([, py, r]) => py - r)), H = base - top
    const inPuff = ([px, py, r], x, y) => ((x + 0.5 - px) / (r * 1.2)) ** 2 + ((y + 0.5 - py) / r) ** 2 <= 1
    // the flat base the low puffs sit on, its ends rounded
    const low = puffs.filter(([, py, r]) => py + r >= base - 2), x0 = Math.min(...low.map(([px, , r]) => px - r)), x1 = Math.max(...low.map(([px, , r]) => px + r))
    const slab = (x, y) => y > base - 5 && x > x0 + (base - y) && x < x1 - (base - y)
    for (let y = top; y <= base; y++) for (let x = 0; x < 192; x++) {
      const i = puffs.findLastIndex((p) => inPuff(p, x, y))
      if ((i < 0 && !slab(x, y)) || (y === base && (x % 3 === 0 || hash(x, base) < 0.3))) continue
      const v = (y - top) / H
      if (i < 0) { c.px(x, y, v < 0.8 ? "B" : "b"); continue }
      const front = puffs.slice(i + 1), exposed = (yy) => !inPuff(puffs[i], x, yy) && !front.some((p) => inPuff(p, x, yy)) && !slab(x, yy)
      let t = v < 0.5 ? 2 : v < 0.8 ? 1 : 0
      // the rim: 2 steps on the high puffs, 1 on the low ones
      if (v < 0.8 && x < puffs[i][0] + puffs[i][2] * 0.7 && (exposed(y - 1) || exposed(y - 2))) t = exposed(y - 1) ? (v < 0.45 ? 3 : 2) : Math.max(t, 2)
      if (front.some(([qx, qy, q]) => y < qy && ((x + 0.5 - qx) / (q * 1.2 + 1.5)) ** 2 + ((y + 0.5 - qy) / (q + 1.5)) ** 2 <= 1)) t = Math.max(0, t - 1)
      c.px(x, y, "bBCc"[t])
    }
  }
})
card("clouds", { is: "the backdrop's near clouds: cumulus heaps of overlapping puffs, lit tops in 2 steps, shaded undersides, a broken lower edge, each puff shadowing the one behind it, 192 x 40, wraps for scroll()", cells: { "side/16": "✓" } })
// clouds_far, the far layer, 160 x 16: thin flat streaks 12-50 px long, 1-3 rows, tapered at their ends, their top row
// the lit body (C), the rest the shade (B): low in contrast against the sky
const STREAKS = [[6, 4, 34, 2], [20, 7, 22, 1], [62, 10, 48, 3], [74, 13, 18, 1], [120, 3, 30, 2], [128, 6, 14, 1]]   // [x, y, length, rows]
sprite("clouds_far", { w: 160, h: 16, wrap: "x" }, (c) => {
  for (const [x0, y0, len, rows] of STREAKS) for (let j = 0; j < rows; j++) {
    const inset = (rows - j) * 3 + j * 2
    for (let x = x0 + inset; x < x0 + len - inset; x++) c.px(x % 160, y0 + j, j === 0 && rows > 1 ? "C" : "B")
  }
})
card("clouds_far", { is: "the backdrop's far clouds: thin flat streaks, tapered, lit on their top row, low in contrast, 160 x 16, wraps for scroll()", cells: { "side/16": "✓" } })
// hills, under the clouds: 160 x 48, rolling, tree clumps on their crests in 2 tones a step apart, flat below
// (V 66-86): lighter and flatter than the ground (V 44, its sd 16).
sprite("hills", { w: 160, h: 48, wrap: "x" }, (c) => {
  const top = (x) => Math.round(18 + 7 * Math.sin((x / 160) * Math.PI * 4) + 4 * Math.sin((x / 160) * Math.PI * 6 + 1))
  for (let x = 0; x < 160; x++) {
    const t = top(x), clump = Math.round(3 * Math.max(0, Math.sin((x / 160) * Math.PI * 18)) * (hash(Math.floor(x / 9), 3) < 0.6 ? 1 : 0))
    for (let y = t - clump; y < 48; y++) c.px(x, y, y < t ? (y === t - clump ? "v" : "V") : y < t + 2 ? "v" : y < t + 10 ? "V" : "x")
  }
})
card("hills", { is: "the backdrop's near plane: rolling hills, tree clumps on their crests, flat below, 160 x 48, wraps for scroll()", cells: { "side/16": "✓" } })
// ---------------------------------------------------------------- the light by the time of day
// The same drawings at dusk and at night by a palette swap, each color by its role (measured on a dusk village's pan
// and Symphony of the Night's castle at night, numbers only). Dusk: what the low sun lights turns warm (H 5-35) and
// what it doesn't violet (H 250-320), S 40-60, the ground a value under the sky's light and its lip's tips still its
// lightest pixels; the clouds coral on their lit side, violet under; the hills a flat violet (V 25-35), the far
// silhouettes against the sky. Night: everything cool and low (H 210-240, V 5-70), the moonlit tips of the grass the
// lightest of the ground, the water near black with a pale glint, the clouds the moon's grey. side.DUSK and
// side.NIGHT map each day color to its new one, keyed by hex so they read in any file: a layer's `swap` (the
// ground, the trees, the water, the strips scroll() draws: layer("near", { swap: side.DUSK }, scroll("side.hills",
// ...))), or a stamp's; side.TIME the same by this file's keys.
const TIME = {
  dusk: {
    R: "#1c1a2e", K: "#2e3040", M: "#4a463a", L: "#76583e", T: "#a6744e",
    a: "#1a1222", d: "#2c1c30", h: "#432838", l: "#5e3440", p: "#7a4440", u: "#9a5c4a",
    e: "#1e1220", w: "#3e2430", W: "#6a3a38",
    o: "#24183a", n: "#3a2450", q: "#583262", s: "#c06478", f: "#ffc8a0",
    c: "#ffbc90", C: "#dc6468", B: "#9c4a64", b: "#5e2c58",
    v: "#4c3058", V: "#3c2852", x: "#302248",
  },
  night: {
    R: "#0a1220", K: "#142436", M: "#203a4a", L: "#3a6070", T: "#7aa4b0",
    a: "#08080e", d: "#12121e", h: "#1c1e2e", l: "#282c42", p: "#363e58", u: "#4e5a7a",
    e: "#0a0a12", w: "#181a28", W: "#262a3e",
    o: "#060c22", n: "#0c1834", q: "#14264a", s: "#2e5a8a", f: "#9ac0e8",
    c: "#c8d4ec", C: "#7a88aa", B: "#4e5a7c", b: "#343e5c",
    v: "#202c46", V: "#1a243c", x: "#141c32",
  },
}
const swapOf = (m) => Object.fromEntries(Object.entries(m).map(([k, v]) => [DAY[k], v]))
const DUSK = swapOf(TIME.dusk), NIGHT = swapOf(TIME.night)
// The sky as the air: sky(time, h, w) draws a strip w wide (wraps across) and h tall, the world's height, darker the
// higher: the bands' colors from its foot up, each blended into the next by an ordered dither over a third of its
// height. Day: the day still's two blues, its haze (V 99) at the foot under the horizon's light blue (V 96), deeper
// higher (Blizzard Buffalo's sky S 76 at V 68: S 50 V 92 at the world's top, a value over the hills, the clouds'
// white over all of it); dusk (a dusk village's pan): a warm orange low, coral (V 85), pink, a red violet (V 50), a
// deep violet at the top; night: a blue (V 28) low to near black at the top, stars thicker higher up, a few bright
// ones in a cross. sky_day, sky_dusk and sky_night are 160 x 240 (a level 15 tiles tall).
const SKY = { day: ["#cfeefc", "#bbe5f9", "#a6dcf6", "#8ccdf1", "#74bdeb"], dusk: ["#e8885e", "#d86064", "#a8445c", "#6e2c52", "#3e1c44", "#24142e"], night: ["#1e2a4a", "#162038", "#10182c", "#0c1222", "#080c18"] }
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]
const sky = (time, h, w = 160) => (c) => {
  const K = SKY[time], n = K.length - 1
  for (let y = 0; y < h; y++) {
    const t = ((h - 1 - y) / (h - 1)) * n, i = Math.min(n - 1, Math.floor(t)), f = t - i
    // within a band, the last third dithers into the next one up
    const mix = Math.max(0, (f - 0.66) / 0.34)
    for (let x = 0; x < w; x++) c.px(x, y, mix * 16 > BAYER[y % 4][x % 4] + 0.5 ? K[i + 1] : K[i])
  }
  if (time !== "night") return
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const r = hash(x, y, 91), high = 1 - y / h
    if (r < 0.004 + 0.012 * high) c.px(x, y, r < 0.003 ? "#c8d4f0" : "#6a7aa0")
  }
  for (let i = 0; i < Math.round(w * h / 4000); i++) {
    const x = 2 + Math.floor(hash(i, 7, 92) * (w - 4)), y = 2 + Math.floor(hash(i, 8, 92) * h * 0.7)
    c.px(x, y, "#ffffff"); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) c.px(x + dx, y + dy, "#8a9ac0")
  }
}
sprite("sky_day", { w: 160, h: 240, wrap: "x" }, sky("day", 240))
sprite("sky_dusk", { w: 160, h: 240, wrap: "x" }, sky("dusk", 240))
sprite("sky_night", { w: 160, h: 240, wrap: "x" }, sky("night", 240))
card("sky_day", { is: "the sky as the air by day, 160 x 240 (wraps across): a pale haze low to a deeper blue at the top, its bands dithered; the day still's two blues where the camera rests", cells: { "side/16": "✎" } })
card("sky_dusk", { is: "the sky as the air at dusk, 160 x 240 (wraps across): a warm orange low through coral and pink to a deep violet at the top, its bands dithered; side.sky(time, h, w) at the world's height", cells: { "side/16": "✎" } })
card("sky_night", { is: "the sky as the air at night, 160 x 240: blue low to near black high, stars thicker higher up, a few bright ones in a cross", cells: { "side/16": "✎" } })
// The full moon, 32 x 32: a disc 21 across, pale (V 96), its seas a step and two darker in soft patches, its lit rim
// on the upper left; a halo round it two rings of the night's blue dithered thinner outward.
sprite("moon", { w: 32, h: 32 }, (c) => {
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const d = Math.hypot(x + 0.5 - 16, y + 0.5 - 16)
    if (d <= 10.5) {
      const sea = vnoise(x / 5 + 3, y / 5), lit = (x - 16) + (y - 16) < -10 && d > 8
      c.px(x, y, lit ? "#fffef4" : sea > 0.62 ? "#c4bea6" : sea > 0.5 ? "#dcd6bc" : "#f2eed8")
    } else if (d <= 12.5 && (x + y) % 2 === 0) c.px(x, y, "#3a4a72")
    else if (d <= 15 && (x + y) % 4 === 0 && y % 2 === 0) c.px(x, y, "#2a3658")
  }
})
card("moon", { is: "the full moon, 32 x 32: a pale disc 21 across, its seas in soft patches, a lit rim on the upper left, a halo dithered round it", cells: { "side/16": "✎" } })
Object.assign(side, { ground, LIP, earth, DUSK, NIGHT, TIME, sky })
}
