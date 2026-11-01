// Houses: a village cottage as a 3D builder in meters (x right, y away, z up, its front -y), for any scene:
// include("<path>/lib/architecture/houses.px.js", { as: "houses" }). make3d.cottage: walls on a stone plinth,
// framed in timber, a pitched roof with eaves, a door, windows, a chimney; drawn by turnaround() or draw3d() in
// houses.MATS, its materials by role (wall, timber, roof and its courses, door, glass, stone): another roof
// is mats: { ...houses.MATS, ...houses.ROOFS.slate }. Sized to a top-down game's grid at 16 px a meter (a tile a
// meter): the door 1 m wide and 2.3 m tall, so seen from 30 degrees it is a tile wide and two tall (topdown16's
// door box, a little over its 24 px figure: scenes §1, §16).
const houses = {}
// in a block: its names stay its own when a scene includes the file
{
// ---------------------------------------------------------------- the materials, by role (dark to light)
const MATS = {
  wall: ["#6e5a52", "#a8907a", "#d9c5a3", "#f2e6c8"],     // plaster
  timber: ["#2a1a17", "#4b2f24", "#6f4a33", "#8f6545"],   // the frame, the sills, the lintel
  roof: ["#4a1a22", "#7d2a2a", "#b24534", "#d9704a"],     // clay tiles
  courses: ["#4a1a22", "#4a1a22", "#7d2a2a", "#b24534"],  // their lower edges, a step darker
  door: ["#3a2418", "#5c3a24", "#875a34", "#a87a48"],
  glass: ["#1a2440", "#2c4a6e", "#5a8ab0", "#a8d0e8"],
  stone: ["#3a3640", "#5e5866", "#878090", "#b2aab4"],    // the plinth, the step, the chimney
}
// other roofs, the tiles and their courses: mats: { ...houses.MATS, ...houses.ROOFS.slate }
const roofOf = (r) => ({ roof: r, courses: [r[0], r[0], r[1], r[2]] })
const ROOFS = { clay: roofOf(MATS.roof), slate: roofOf(["#1e2433", "#33405a", "#52627e", "#7a8aa6"]), thatch: roofOf(["#4a3418", "#7a5a28", "#a88438", "#d2b45a"]) }
// from above, a little to the left and toward us: the front lit, the roof's slope toward us brighter than the walls
const LIGHT = [-0.5, -0.45, 0.75]

// A cottage: `width` and `depth` m (the walls'), `storeys` 1 to 3 of 2.7 m on a 0.15 m plinth, the roof's `pitch`
// in degrees (its ridge along the width, the eaves front and back), its `eaves` m past the walls all round; the
// door at `door` along the front (-1 the left end, 0 the middle, 1 the right), `windows` a storey across the
// front (those that fit; on the ground floor beside the door), the chimney on the front slope at the `chimney` end (or none).
// The roof's tiles in courses 0.3 m apart down the slope (4 px at 16 px a meter, seen from 30 degrees), each
// course's lower edge a step darker. Sockets: `door` (the threshold, where a figure stands to go in), `chimney`
// (its top, for smoke), `top` (the ridge).
make3d.define("cottage", ({ width = 4.2, depth = 2.8, storeys = 1, pitch = 32, eaves = 0.3, door = 0, windows = 2, chimney = "right" } = {}) => {
  const W = width, D = depth, S = Math.round(storeys), E = eaves, R = (pitch * Math.PI) / 180, T = Math.tan(R), C = Math.cos(R), Sn = Math.sin(R)
  const PL = 0.15, ST = 2.7, top = PL + S * ST, front = -D / 2, ridge = top + (D / 2) * T, t = 0.16
  // under the two slopes meeting over the middle at height z
  const under = (z) => sdf.intersect(sdf.plane([0, -Sn, C], z * C), sdf.plane([0, Sn, C], z * C))
  // the openings in the front wall: [x, z of the middle, w, h]
  const dx = door * (W / 2 - 0.9), holes = [[dx, PL + 1.15, 1, 2.3]]
  for (let s = 0; s < S; s++) {
    // a storey's windows evenly across it, the ground floor's in the slots the door leaves
    const n = Math.round(windows), slots = s ? n : n + 1, xs = Array.from({ length: slots }, (_, i) => -W / 2 + ((i + 0.5) * W) / slots)
    const skip = s ? -1 : xs.reduce((b, x, i) => (Math.abs(x - dx) < Math.abs(xs[b] - dx) ? i : b), 0)
    xs.forEach((x, i) => { if (i !== skip && (s || Math.abs(x - dx) > 1.1)) holes.push([x, PL + s * ST + 1.45, 0.75, 0.85]) })
  }
  const cut = (w, h, x, z) => sdf.box([w, 0.3, h]).at(x, front, z)
  // the walls and the gables under the roof, the openings cut 0.15 m into them
  const walls = sdf.box([W, D, ridge]).at(0, 0, ridge / 2).intersect(under(ridge)).subtract(...holes.map(([x, z, w, h]) => cut(w, h, x, z))).mat("wall")
  // the frame: corner posts, a beam at each storey's top all round, the door's lintel and jambs, the windows'
  // sills and crosses
  const ring = (z) => sdf.box([W + 0.06, D + 0.06, 0.16]).subtract(sdf.box([W - 0.3, D - 0.3, 1])).at(0, 0, z)
  const timber = sdf.union(
    ...[-1, 1].flatMap((sx) => [-1, 1].map((sy) => sdf.box([0.2, 0.2, top - PL]).at((sx * W) / 2, (sy * D) / 2, PL + (top - PL) / 2))),
    ...Array.from({ length: S }, (_, s) => ring(PL + (s + 1) * ST - 0.08)),
    sdf.box([1.3, 0.1, 0.16]).at(dx, front - 0.03, PL + 2.38), ...[-1, 1].map((s) => sdf.box([0.12, 0.1, 2.3]).at(dx + s * 0.56, front - 0.03, PL + 1.15)),
    ...holes.slice(1).flatMap(([x, z, w, h]) => [sdf.box([w + 0.16, 0.16, 0.08]).at(x, front - 0.05, z - h / 2 - 0.04), sdf.box([0.06, 0.06, h]).at(x, front + 0.03, z), sdf.box([w, 0.06, 0.06]).at(x, front + 0.03, z)])).mat("timber")
  const doorLeaf = sdf.box([0.96, 0.06, 2.28]).at(dx, front + 0.12, PL + 1.15).mat("door")
  const glass = holes.length > 1 ? sdf.union(...holes.slice(1).map(([x, z, w, h]) => sdf.box([w, 0.04, h]).at(x, front + 0.1, z))).mat("glass") : undefined
  // the roof: a shell t thick over the slopes, past the walls by the eaves, the tiles' courses down it; a ridge
  const shell = under(ridge + t / C).subtract(under(ridge)).intersect(sdf.box([W + 2 * E, D + 2 * E, ridge + t / C]).at(0, 0, (ridge + t / C) / 2))
  const roof = sdf.union(shell.paint((q) => ((Math.abs(q[1]) / C / 0.3) % 1 > 0.76 ? "courses" : "roof")), sdf.box([W + 2 * E, 0.24, 0.12]).at(0, 0, ridge + t / C).mat("courses"))
  // the plinth, the step before the door, the chimney through the front slope with its cap
  const cx = chimney === "left" ? -W / 2 + 0.7 : W / 2 - 0.7, cy = -Math.min(0.8, D / 4), cz = ridge + t / C + cy * T + 0.75
  const stone = sdf.union(sdf.box([W + 0.12, D + 0.12, PL]).at(0, 0, PL / 2), sdf.box([1.3, 0.36, 0.1]).at(dx, front - 0.12, 0.05),
    ...(chimney === "none" ? [] : [sdf.box([0.5, 0.5, cz - top]).at(cx, cy, (cz + top) / 2), sdf.box([0.64, 0.64, 0.12]).at(cx, cy, cz)])).mat("stone")
  const parts = Object.fromEntries(Object.entries({ walls, timber, door: doorLeaf, windows: glass, roof, stone }).filter(([, f]) => f))
  return { field: sdf.union(...Object.entries(parts).map(([n, f]) => f.part(n))), parts,
    sockets: { door: [dx, front - 0.5, 0], top: [0, 0, ridge + t / C + 0.06], ...(chimney === "none" ? {} : { chimney: [cx, cy, cz + 0.06] }) } }
}, { params: { width: [3, 10], depth: [2.5, 8], storeys: [1, 3], pitch: [20, 60], eaves: [0, 0.8], door: [-1, 1], windows: [0, 4], chimney: ["right", "left", "none"] } })
// At topdown16 (✎): the cottage drawn by hand as the action top-down school draws a house (The Minish Cap; library
// F5's environment study, numbers only): mostly roof, seen steeply (its roof 68% of its height, the references'
// 72-77%: what a camera at 60 degrees gives a cottage of these proportions), both slopes showing (the far one
// shorter and in shade), the tiles in courses with their seams, the eaves over a one-tile wall, a porch at the door
// (a gabled hood jutting from the eaves on two posts, as the school's town houses give the door its own roof), the
// door under it the darkest shape (an arch a tile wide, so the figure goes in), two windows high under the beam, a stone plinth and a step, a
// chimney on the far slope.
// Its line in its materials' own darkest, strong (topdown16: a black line round the figures only). pxl lib draft
// drew it first from 30 degrees (_cottage_td16_live, frozen in frozen/cottage_td16.png, kept as the draft for its
// width and its door).
turnaround("_cottage_td16_live", make3d.cottage(), { mats: MATS, light: LIGHT, surface: { ink: "#1a1620", tones: 3 }, view: { kind: "side", pitch: 30 }, ppm: 15.81, headings: ["s"] })
sprite("_cottage_td16_draft", { png: "frozen/cottage_td16.png", frozen: "_cottage_td16_live_s" })
// the roof pale to its line, the plaster, the timber, the glass, the stone, the doorway
pal({ R: "#ffc27a", r: "#ff8f55", q: "#e8553c", Q: "#b8343a", u: "#7a1f30", U: "#4a1426", P: "#fff4d8", p: "#efdcb0", n: "#c4a67c",
  T: "#9a6038", t: "#6a3a24", y: "#3e2018", G: "#c6ecff", g: "#5aa0e0", j: "#2c4a8a", S: "#eeebe0", s: "#b8b6c0", K: "#75798f", k: "#3f3d55", Z: "#2a1836" })
sprite("_cottage_td16", { w: 80, h: 76, pivot: "bottom" }, (c) => {
  // the wall, a tile tall under the eaves: plaster between timber posts, a beam under the eaves; the plinth, the step
  c.rect(2, 51, 76, 17, "p"); c.rect(2, 54, 76, 1, "n"); c.rect(5, 55, 70, 12, "P"); c.rect(2, 51, 76, 3, "n")
  for (const x of [2, 75]) { c.rect(x, 51, 3, 17, "T"); c.rect(x + 2, 51, 1, 17, "t") }
  c.rect(2, 68, 76, 3, "s"); c.rect(2, 68, 76, 1, "S"); c.rect(2, 71, 76, 1, "K"); c.rect(1, 72, 78, 1, "k")
  // two windows high on the wall, just under the beam: a timber frame, the glass lit at its upper left, a sill
  for (const x of [7, 60]) { c.rect(x, 54, 13, 9, "t"); c.rect(x + 1, 55, 11, 7, "j"); c.rect(x + 1, 55, 5, 3, "g"); c.rect(x + 1, 55, 2, 1, "G"); c.rect(x + 7, 55, 5, 3, "g"); c.rect(x + 6, 55, 1, 7, "t"); c.rect(x + 1, 58, 11, 1, "t"); c.rect(x - 1, 63, 15, 2, "T"); c.rect(x - 1, 64, 15, 1, "y") }
  // the roof: the far slope (rows 6-17, in shade, its courses every 3 rows), the ridge, the near slope (rows 20-48,
  // lit, a course every 4 rows: its lit edge, its tiles, its seams staggered every 6 px, darker toward the eaves)
  for (let y = 6; y < 17; y++) c.rect(1, y, 78, 1, (y - 6) % 3 === 2 ? "u" : "Q")
  c.rect(1, 17, 78, 1, "r"); c.rect(1, 18, 78, 1, "R"); c.rect(1, 19, 78, 1, "u")
  for (let y = 20; y < 49; y++) {
    const i = (y - 20) % 4, row = Math.floor((y - 20) / 4), low = row > 4 ? 1 : 0
    c.rect(1, y, 78, 1, i === 0 ? ["R", "r"][low] : i === 3 ? "Q" : ["r", "q"][low])
    if (i === 1 || i === 2) for (let x = 3 + (row % 2) * 3; x < 78; x += 6) c.px(x, y, i === 1 ? ["q", "Q"][low] : "Q")
  }
  // the eaves: their edge and underside over the wall, its shade on the wall's top
  c.rect(0, 49, 80, 1, "Q"); c.rect(0, 50, 80, 1, "u"); c.rect(2, 51, 76, 1, "y")
  // the roof's ends rolled away (two steps darker) and its line, the roof's darkest
  for (let y = 6; y < 51; y++) { c.px(1, y, "u"); c.px(2, y, y < 20 ? "u" : "Q"); c.px(77, y, y < 20 ? "u" : "Q"); c.px(78, y, "u"); c.px(0, y, "U"); c.px(79, y, "U") }
  c.rect(0, 5, 80, 1, "U"); c.rect(0, 50, 1, 1, "U"); c.rect(79, 50, 1, 1, "U")
  // the chimney on the far slope as the school draws one (The Minish Cap's town): a stone pot seen mostly from above,
  // its thick rim lit on the left round a big dark flue (its far inner wall a step lighter), a short front of stones
  // dark at its foot; its line the stone's darkest, its shade on the roof to its right, from the roof's
  // edge down to the pot's foot, its top edge falling away from the light
  for (let y = 6; y < 13; y++) c.rect(66, y, Math.min(4, y - 5), 1, "u")
  ;["...kkkkkk...", ".kkSSSSSSkk.", ".kSSKKKKSsk.", "kSSKZZZZKssk", "kSKZZZZZZKsk", "kSKZZZZZZKsk", "kSsKZZZZKssk",
    "kSssssssssKk", "kKSsssssssKk", "kKSsKsssKsKk", "kKKsssKsssKk", ".kKKKKKKKKk.", "..kkkkkkkk.."]
    .forEach((row, y) => [...row].forEach((k, x) => { if (k !== ".") c.px(54 + x, y, k) }))
  // the porch, as the school's houses give the door its own roof: a gabled hood jutting from the near slope toward
  // us, its ridge lit down its middle, its left slope lit and its right in shade, its valleys into the roof a V, its
  // eave arched over the door (higher in the middle) on a dark fascia; under it the wall in its shade, two posts down
  // to a stone floor before the door, and a step
  const arch = (x) => 51 + Math.round(3 * ((x - 40) / 15) ** 2)
  for (let x = 25; x < 56; x++) {
    const e = arch(x), top = 31 + Math.ceil(Math.abs(x - 39.5) * 12 / 15)
    for (let y = top; y < e - 1; y++) {
      const i = (y - 31) % 3, seam = i === 1 && (x + 3 * Math.floor((y - 31) / 3)) % 6 === 0
      c.px(x, y, y === top || x === 25 || x === 55 ? "U" : x === 39 || x === 40 ? "R" : x < 40 ? (i === 2 || seam ? "q" : "r") : (i === 2 || seam ? "u" : "Q"))
    }
    c.px(x, e - 1, x === 25 || x === 55 ? "U" : "t"); c.px(x, e, "U")
    for (let y = e + 1; y < 68; y++) c.px(x, y, y === e + 1 ? "y" : "n")
  }
  c.rect(22, 69, 36, 1, "S"); c.rect(22, 70, 36, 2, "s"); c.rect(22, 72, 36, 1, "K"); c.rect(21, 73, 38, 1, "k")
  c.rect(29, 73, 22, 1, "S"); c.rect(29, 74, 22, 1, "s"); c.rect(28, 75, 24, 1, "k")
  for (const x of [25, 53]) { const e = arch(x + 1); c.rect(x, e + 1, 3, 71 - e, "T"); c.rect(x + 2, e + 1, 1, 71 - e, "t"); c.rect(x, e + 1, 1, 71 - e, "y") }
  // the door, a tile wide so a figure goes in: a timber frame, the near-black doorway 16 wide and 16 tall under its
  // arch, down to the porch's floor
  c.rect(30, 53, 20, 18, "T"); c.rect(30, 53, 1, 18, "y"); c.rect(49, 53, 1, 18, "y"); c.rect(48, 54, 1, 17, "t")
  c.rect(32, 57, 16, 14, "Z"); c.rect(33, 56, 14, 1, "Z"); c.rect(34, 55, 12, 1, "Z")
})
// At topdown32 (✎): the 16 px cottage above (approved) redrawn at twice its density, never scaled: mostly roof, seen
// steeply (its roof 67% of its 152 rows), both slopes showing (the far one shorter and in shade), the tiles in
// courses as the school draws a roof (Chained Echoes' clay tiles, numbers only: a tile 4-5 px wide and 3-4 tall at
// 16 px, staggered, each lit along its top, its lower edge rounded, the course under it in its shade; a tile here
// 10 x 8), the eaves over a wall a tile tall, the porch (a gabled hood on two posts), the door under it the darkest
// shape (an arch a tile wide), two windows high under the beam, a stone plinth in a course of stones and a step; its
// line its materials' own darkest. pxl lib draft drew it from 30 degrees first (_cottage_td32_live, frozen in
// frozen/cottage_td32.png: its width and its door).
turnaround("_cottage_td32_live", make3d.cottage(), { mats: MATS, light: LIGHT, surface: { tones: 4 }, view: { kind: "side", pitch: 30 }, ppm: 32.26, headings: ["s"] })
sprite("_cottage_td32_draft", { png: "frozen/cottage_td32.png", frozen: "_cottage_td32_live_s" })
// The chimney, modeled and finished by hand: a stack of stones in courses 0.18 m tall (each stone 0.3 m long,
// staggered course to course, the mortar between them darker), under a cap slab jutting past it, its flue a round
// hole 0.34 m across sunk into it (by hand a square flue: a brick or stone stack's); drawn from 40 degrees (its stones' courses showing over the ridge) at 32 px a meter, 4 tones
// (_chimney_td32_live, frozen in frozen/chimney_td32.png); then by hand: the flue a square hole (its far wall a step
// lighter where the light reaches into it, its depth the near-black), soot round the hole on the cap (a ring a step darker, darkest at the
// flue's lip), a lone pixel inside a stone taken into it, its line the stone's
// darkest along its right and its foot.
const CHIMNEY = (() => {
  const W = 0.56, H = 0.8, mortar = (q) => { const row = Math.floor(q[2] / 0.18), along = Math.abs(q[1]) > Math.abs(q[0]) ? q[0] : q[1], u = (along + 2 + 0.15 * (row % 2)) / 0.3
    return (q[2] / 0.18) % 1 < 0.2 || u % 1 < 0.14 ? "mortar" : "stone" }
  const flue = sdf.cylinder(0.17, H + 0.4).at(0, 0, -0.2)
  return sdf.union(sdf.box([W, W, H]).at(0, 0, H / 2).paint(mortar), sdf.box([0.68, 0.68, 0.1]).at(0, 0, H + 0.05).mat("cap")).subtract(flue)
})()
// (drawn three times over and brought down by shrink's edge treatment, a block in where a third of it is drawn)
turnaround("_chimney_td32_live", CHIMNEY, { mats: { stone: MATS.stone, cap: MATS.stone, mortar: ["#2a2630", "#3a3640", "#5e5866", "#6e6878"] }, light: LIGHT, surface: { tones: 4, outline: false }, view: { kind: "side", pitch: 40 }, ppm: 96, headings: ["s"] })
sprite("_chimney_td32_draft3", { png: "frozen/chimney_td32.png", frozen: "_chimney_td32_live_s" })
sprite("_chimney_td32_draft", { base: "_chimney_td32_draft3", shrink: { by: 3, cover: 1 / 3 } })
sprite("_chimney_td32", { base: "_chimney_td32_draft" }, (c) => {
  const MAP = { "#b2aab4": "S", "#878090": "s", "#5e5866": "K", "#3a3640": "k", "#6e6878": "K", "#2a2630": "k" }
  const by = new Map(Object.keys(MAP).map((h) => [c.color(h), MAP[h]]))
  const g = Array.from({ length: c.h }, (_, y) => Array.from({ length: c.w }, (_, x) => (c.get(x, y) ? by.get(c.get(x, y)) ?? "k" : null))), at = (x, y) => g[y]?.[x] ?? null
  // the cap's top: the rows down to its widest; the flue the darkest pixels inside it
  const xs = (y) => g[y].map((v, x) => (v ? x : -1)).filter((x) => x >= 0), L = (y) => Math.min(...xs(y)), R = (y) => Math.max(...xs(y))
  const y0 = g.findIndex((r) => r.some(Boolean))
  // the flue a square hole, its edges parallel to the cap's: 12 px across (55% of the cap's 22), 8 rows deep (its 12
  // seen from 40 degrees); inside, the far wall a tone lighter where the light falls in (between the side walls, in
  // shade), under it the wall going dark, the depth near-black; round it a ring of soot on the cap (not at its corners),
  // its far lip lit (the rim's top, catching the light)
  const hx = Math.round((L(y0 + 6) + R(y0 + 6) + 1) / 2) - 6, hy = y0 + 3, HW = 12, HH = 8
  const inHole = (x, y) => x >= hx && x < hx + HW && y >= hy && y < hy + HH
  for (let y = y0; y < y0 + 17; y++) for (let x = 0; x < c.w; x++) {
    if (!at(x, y)) continue
    const u = x - hx, v = y - hy, ring = u >= -1 && u <= HW && v >= -1 && v <= HH, corner = (u === -1 || u === HW) && (v === -1 || v === HH)
    if (inHole(x, y)) g[y][x] = v < 2 && u > 0 && u < HW - 1 ? "K" : v < 3 ? "k" : "Z"
    else if (ring && !corner) g[y][x] = v === -1 ? "S" : "K"
  }
  // a lone pixel taken into its stone
  const out = g.map((r) => [...r])
  for (let y = 1; y < c.h - 1; y++) for (let x = 1; x < c.w - 1; x++) {
    const v = g[y][x], n = [at(x, y - 1), at(x - 1, y), at(x + 1, y), at(x, y + 1)]
    if (!v || n.some((q) => !q) || n.includes(v) || inHole(x, y)) continue
    out[y][x] = n.sort((a, b) => n.filter((q) => q === b).length - n.filter((q) => q === a).length)[0]
  }
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    if (!out[y][x]) continue
    if (at(x + 1, y) === null || at(x, y + 1) === null) out[y][x] = "k"
    c.px(x, y, out[y][x])
  }
})
// the plaster's darkest, under the eaves
pal({ N: "#a88a64" })
// (the facade raised for the door at the figures' scale: the wall 57 rows, 21 over the 36 it had, the roof as it was)
const RAISE = 21
sprite("_cottage_td32", { w: 160, h: 152 + RAISE, pivot: "bottom" }, (c) => {
  const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s) }
  // the wall under the eaves, 57 rows (1.2 of the 48 px figure: the door 52 under them with room): plaster between
  // timber posts, in the eaves' shade at its top; the plinth
  c.rect(4, 100, 152, 36 + RAISE, "P"); c.rect(4, 100, 152, 1, "y"); c.rect(4, 101, 152, 5, "N"); c.rect(4, 106, 152, 2, "n"); c.rect(4, 108, 152, 1, "p")
  c.rect(4, 132 + RAISE, 152, 4, "p")                                                       // the wall's foot, splashed by the rain off the eaves
  for (const x of [4, 150]) { c.rect(x, 100, 6, 36 + RAISE, "T"); c.rect(x + 4, 100, 2, 36 + RAISE, "t"); c.rect(x, 100, 1, 36 + RAISE, "y"); c.rect(x, 101, 6, 5, "t") }
  // the plinth: a course of stones, each lit along its top and its left, its lower right in shade, mortar between
  c.rect(2, 136 + RAISE, 156, 8, "k")
  for (let x = 3, i = 0; x < 157; i++) {
    const w = Math.min(157 - x, 11 + Math.floor(hash(i, 3) * 6))
    c.rect(x, 137 + RAISE, w - 1, 6, "s"); c.rect(x, 137 + RAISE, w - 1, 1, "S"); c.rect(x, 137 + RAISE, 1, 6, "S"); c.rect(x + w - 2, 138 + RAISE, 1, 5, "K"); c.rect(x + 1, 142 + RAISE, w - 2, 1, "K")
    x += w
  }
  // two windows at a figure's height, under the beam: their sills at its waist (23 px over the floor), their heads near
  // the door's (47 px over it; the door 52), the eave 10 rows over them: a timber frame, four panes lit at their upper
  // left, a cross, a sill; under each sill a stain where the rain runs off it
  for (const x of [14, 120]) {
    c.rect(x, 110, 26, 24, "t"); c.rect(x + 2, 112, 22, 20, "j")
    for (const [u, v] of [[2, 112], [14, 112], [2, 122], [14, 122]]) { c.rect(x + u, v, 10, 2, "g"); c.rect(x + u, v + 2, 4, 2, "g"); c.rect(x + u, v, 3, 1, "G") }
    c.rect(x + 12, 112, 2, 20, "t"); c.rect(x + 2, 121, 22, 1, "t"); c.rect(x - 2, 134, 30, 3, "T"); c.rect(x - 2, 134, 30, 1, "#b8743c"); c.rect(x - 2, 136, 30, 1, "y")
    for (const u of [4, 5, 20]) c.rect(x + u, 137, 1, u === 5 ? 3 : 5, "p")
  }
  // the roof: rows 10-33 the far slope in shade (its courses every 6 rows), the ridge's rolled cap, rows 40-95 the near
  // slope lit, in courses 8 rows tall of tiles 10 wide staggered by 5 (each lit along its top and its left, its lower
  // edge rounded over the course under it, the seam between two tiles in shade; one in seven a step lighter, one in
  // nine a step darker: tiles weathered or put back), the lowest two courses a step darker toward the eaves
  const tile = (x, y, y0, h, far, dark) => {
    const i = y - y0, course = Math.floor(i / h), v = i % h, o = (course % 2) * 5, s = (x + o) % 10, r = hash(Math.floor((x + o) / 10), course + y0)
    // [the gap, the shade, the body, the lit bulge, a glint]: the far slope's, a darker tile's, a lighter one's, the near slope's
    const [gap, sh, body, lit, glint] = far ? ["U", "u", "Q", "Q", "q"] : dark || r > 0.92 ? ["U", "u", "Q", "q", "q"] : r < 0.08 ? ["u", "Q", "r", "r", "R"] : ["U", "Q", "q", "r", "R"]
    const b = h - 1 - v                                                           // rows up from its lower edge
    // its lower edge rounded over the course under it (in shade between two tiles), the seam beside it
    if ((b === 0 && (s <= 1 || s >= 8)) || (b === 1 && (s === 0 || s === 9))) return gap
    if (v === 0 || b === 0 || s === 9 || (b === 1 && (s === 1 || s === 8)) || (b === 2 && s === 0)) return sh   // the course above's shade on it, its lip
    // its bulge lit toward the upper left, a glint on it; curving away at its lower right
    if (v >= 1 && b >= 2 && s >= 1 && s <= 4) return v === 2 && s === 2 ? glint : lit
    return b === 1 && s >= 6 ? sh : body
  }
  for (let y = 10; y < 34; y++) for (let x = 1; x < 159; x++) c.px(x, y, tile(x, y, 10, 6, true))
  // the chimney on the far slope, its foot behind the ridge; its shade on the slope to its right: from under its cap
  // down to the ridge, its top edge falling away from the light, a step darker over the tiles
  const DARKER = { R: "q", r: "q", q: "Q", Q: "u", u: "u", U: "U" }, darker = (x, y) => { const k = c.get(x, y); for (const [a, b] of Object.entries(DARKER)) if (k === c.color(a)) return c.px(x, y, b) }
  for (let y = 11; y < 34; y++) for (let x = 142; x < 142 + Math.min(9, (y - 8) >> 1); x++) darker(x, y)
  c.rect(0, 9, 160, 1, "U"); c.rect(1, 10, 158, 1, "u")
  c.stamp("_chimney_td32", 130, 32)
  c.rect(0, 34, 160, 1, "Q"); c.rect(0, 35, 160, 2, "r"); c.rect(0, 37, 160, 1, "R"); c.rect(0, 38, 160, 1, "q"); c.rect(0, 39, 160, 1, "u")
  for (let x = 6; x < 156; x += 12) { c.rect(x, 35, 1, 3, "q"); c.px(x + 1, 37, "r") }   // the ridge tiles' joints
  for (let y = 40; y < 96; y++) for (let x = 1; x < 159; x++) c.px(x, y, tile(x, y, 40, 8, false, y >= 80))
  // the eaves: their edge and underside over the wall
  c.rect(0, 96, 160, 1, "Q"); c.rect(0, 97, 160, 2, "u"); c.rect(0, 99, 160, 1, "U")
  // the roof's ends rolled away (two steps darker) and its line, the roof's darkest (a step lighter toward the light)
  for (let y = 10; y < 99; y++) { c.px(0, y, "U"); c.px(1, y, "u"); c.px(2, y, y < 40 ? "u" : "Q"); c.px(157, y, y < 40 ? "u" : "Q"); c.px(158, y, "u"); c.px(159, y, "U") }
  // the porch, as the school's houses give the door its own roof: a gabled hood jutting from the near slope toward
  // us, its ridge running toward us down its middle (lit, its cap's joints every 8 rows), its left slope lit and its
  // right in shade, its eave arched over the door (higher in the middle) on a dark fascia; under it the wall in its
  // shade, two posts down to a stone floor before the door, and a step. At the figures' scale (topdown32's door: a
  // little over the tallest figure, 1.1-1.2 of the 48 px one; LPC's door tile 32 x 47 beside its 50 px figures): the
  // door 32 wide and 52 tall (1.08 of the figure; 1.17 with its frame). The hood's tiles as a gable's lie (its slopes
  // fall left and right, their eaves run toward us): in courses along those eaves, up and down the picture, 6 px each,
  // stacked from the ridge outward, each tile 10 long, staggered by 5, its lower edge rounded outward and down its
  // slope (left on the left slope, right on the right) over the course beyond it, lit along its upper end
  const arch = (x) => 78 + RAISE + Math.round(6 * ((x - 80) / 30) ** 2)
  const across = (d, y) => {
    const course = Math.floor(d / 6), v = d % 6, b = 5 - v, o = (course % 2) * 5, s = (y + o) % 10, r = hash(Math.floor((y + o) / 10), course + 61)
    const [gap, sh, body, lit, glint] = r > 0.92 ? ["U", "u", "Q", "q", "q"] : r < 0.08 ? ["u", "Q", "r", "r", "R"] : ["U", "Q", "q", "r", "R"]
    if ((b === 0 && (s <= 1 || s >= 8)) || (b === 1 && (s === 0 || s === 9))) return gap
    if (v === 0 || b === 0 || s === 9 || (b === 1 && (s === 1 || s === 8)) || (b === 2 && s === 0)) return sh
    if (v >= 1 && b >= 2 && s >= 1 && s <= 4) return v === 2 && s === 2 ? glint : lit
    return b === 1 && s >= 6 ? sh : body
  }
  for (let x = 50; x < 111; x++) {
    const e = arch(x), top = 40 + RAISE + Math.ceil((Math.abs(x - 79.5) * 24) / 30)
    for (let y = top; y < e - 2; y++) {
      c.px(x, y, y <= top + 1 || x <= 51 || x >= 109 ? (x < 80 && y > top ? "u" : "U") : x >= 78 && x <= 81 ? (x < 81 && (y - 40 - RAISE) % 8 === 0 ? "q" : x < 80 ? "R" : "r") : across(x < 80 ? 77 - x : x - 82, y))
      if (x > 81 && y > top + 1 && x < 109) darker(x, y)
    }
    c.px(x, e - 2, x <= 51 || x >= 109 ? "U" : "T"); c.px(x, e - 1, x <= 51 || x >= 109 ? "U" : "t"); c.px(x, e, "U")
    for (let y = e + 1; y < 136 + RAISE; y++) c.px(x, y, y <= e + 2 ? "y" : y < 132 + RAISE ? "n" : "N")
  }
  // the porch's floor and the step before it
  const F = 136 + RAISE   // the floor
  c.rect(44, F, 72, 2, "S"); c.rect(44, F + 2, 72, 4, "s"); c.rect(44, F + 6, 72, 2, "K"); c.rect(42, F + 8, 76, 1, "k")
  for (const x of [56, 74, 92, 108]) c.rect(x, F + 1, 1, 6, "K")
  c.rect(56, F + 9, 48, 2, "S"); c.rect(56, F + 11, 48, 2, "s"); c.rect(56, F + 13, 48, 1, "K"); c.rect(103, F + 9, 1, 4, "K"); c.px(103, F + 13, "k"); c.rect(54, F + 14, 52, 2, "k")
  for (const x of [50, 106]) { const e = arch(x + 2); c.rect(x, e + 1, 6, F - e, "T"); c.rect(x + 4, e + 1, 2, F - e, "t"); c.rect(x, e + 1, 1, F - e, "y"); c.rect(x + 1, e + 1, 1, F - e, "#b8743c") }
  // the door: a timber frame 3 px round it (its lintel arched as the doorway, lit on its left, its right in shade); the
  // door of upright planks 4 px wide (each lit along its left, a seam of the wood's darkest between), two ledges across
  // with a nail where each plank meets them, an iron ring for a handle on its right, the porch's shade over its top
  // rows; a stone threshold
  const dt = (x) => 84 + RAISE + Math.round(4 - 4 * Math.sqrt(Math.max(0, 1 - ((x + 0.5 - 80) / 16) ** 2)))   // its top: an even arch
  for (let x = 61; x < 99; x++) { const t = dt(Math.min(95, Math.max(64, x))) - 3; c.rect(x, t, 1, F - t, x < 63 ? "#b8743c" : x > 96 ? "t" : "T"); c.px(x, t, "y") }
  for (let x = 64; x < 96; x++) {
    const t = dt(x), u = (x - 64) % 4
    for (let y = t; y < F; y++) {
      const L1 = 96 + RAISE, L2 = 122 + RAISE, ledge = (y >= L1 && y < L1 + 3) || (y >= L2 && y < L2 + 3)
      c.px(x, y, u === 3 ? "y" : ledge ? (y === L1 || y === L2 ? "#b8743c" : "t") : u === 0 ? "#b8743c" : "T")
      if (y < t + 5 && c.is(x, y, "T")) c.px(x, y, "t")
    }
    if (u === 1) { c.px(x, 97 + RAISE, "y"); c.px(x, 123 + RAISE, "y") }
  }
  for (const [u, v, k] of [[0, 0, "K"], [1, 0, "s"], [-1, 1, "K"], [2, 1, "K"], [-1, 2, "k"], [2, 2, "K"], [0, 3, "k"], [1, 3, "k"]]) c.px(89 + u, 108 + RAISE + v, k)   // the ring
  c.rect(61, F - 1, 38, 1, "S"); c.rect(61, F, 38, 1, "s")
})
card("make3d.cottage", { is: "a village cottage: plaster walls framed in timber on a stone plinth, a pitched tile roof with eaves, a door, windows, a chimney", cells: { "topdown/16": ["✎", "_cottage_td16"], "topdown/32": ["✎", "_cottage_td32"] },
  tiles: [4.5, 5], category: "house", draw: { mats: MATS, light: LIGHT }, vary: { color: "its roles: wall, timber, roof and courses, door, glass, stone (mats: { ...houses.MATS, ...houses.ROOFS.slate })" } })
Object.assign(houses, { MATS, ROOFS, LIGHT })
}
