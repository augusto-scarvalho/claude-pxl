// The island's ground and what grows and lies on it at a 32 px grid (lib/profiles/topdown32.px.js), in the island
// style (lib/styles/island.px.js), as its 16 px kit (lib/nature/island.px.js) at twice the density: redrawn, never
// scaled. The shore, the dirt path and the field's lighter and darker regions as corner sets ("wang"; tilemap()
// picks them by the corners' mask), the path by the 16 kit's band (island.path), the shore by its own bands of depth;
// what had to change at 32 in px: the wobble's wave 16 px long (8 at 16: the same length on the ground, still matching
// across every seam), the path's fringe of grass tufts 7 px wide every 5 px (5 every 3 at 16), their shade two rows
// deep; and the density a 32 px tile holds (measured below): its marks in clusters, regions spanning tiles, eight
// drawings of each piece. Drawn by hand: three flowers (red, white, blue); drafted in 3D and finished by hand, as the
// games' 3D models build them (library F5 4n: numbers only): a tuft and a big one, tall grass and its cut stubs, a
// bush, a rock; 4 tones a material, lit from the upper left, edged selectively (the material's darkest away from the
// light, none toward it: topdown32's props); the ground no line. For any scene: include("<path>/lib/nature/island32.px.js", { as: "isl32" }),
// its palette its own (or the style's with palette: true).
include("../styles/island.px.js", { palette: true })
include("island.px.js", { as: "isl16" })
include("../styles/hand32.px.js")
pal({ R: "#d8365a", J: "#4f86e6", Y: "#f2b62e" })   // the flowers' petal shades, as the 16 kit's
// in a block: its names stay its own when a scene includes the file
{
const T = 32
// the corners' wobble: a wave 16 px long, so it matches across every 32 px seam
const wob = (x, y, t) => t + 0.035 * Math.sin((x + 0.5) * Math.PI / 8) + 0.035 * Math.sin((y + 0.5) * Math.PI / 8)
// The ground's density at 32, measured on the school's maps (numbers only):
// - The Minish Cap at 16: its grass 2-3 blade marks of 5-8 px a tile (14% of it), 5 colors; its path flat, soft spots
//   3-6 px every ~20 px; its shore's rim 3 px over a dark band 2 px.
// - Chained Echoes at 16 (its atlases): the field calm, 92% one tone, 2 sprigs a tile in 4 colors, and regions of the
//   field a tone lighter (15% of its grass tiles) or darker (16%) with leafy edges, spanning tiles; 580 drawings in 970
//   grass tiles; its dirt 43% one tone, in patches; its sand two tones in soft patches and a wet band; its water two
//   tones lighter near the shore, a wave line in one tile in ten, foam along the shore.
// - LPC at 32, the check at this grid: its grass 90-97% one tone, 6-18 marks of 5-6 px (3-10% of the tile); its dirt
//   half one tone and half the next; its water 3 tones.
// So at 32 (four times a 16's area): the field calm, its marks in 1 to 3 clusters a tile (2-4 marks each: blade fans,
// a tall clump, clover, pebbles), the rest bare; regions of it lighter and darker as terrains of their own over it
// (corner sets: a map lays them over several tiles, their edges leafy); eight drawings of each piece (variants: the
// tile picked by where it lies), so no tile repeats in a row.
const VARIANTS = 8, hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s) }
// marks drawn in a tile, each [x0, y0, rows] in keys; a mark wholly inside it (none cut by a seam)
const marks = (list) => { const at = new Map(); for (const [x0, y0, g] of list) g.forEach((r, j) => [...r].forEach((k, i) => { if (k !== ".") at.set(`${x0 + i},${y0 + j}`, k) })); return at }
// `groups` clusters in a tile, each 2-4 marks of `kinds` within ~6 px of its middle, the rest of the tile bare
const cluster = (v, seed, kinds, groups) => {
  const list = []
  for (let g = 0; g < groups; g++) {
    const r = (k) => hash(v * 53 + g * 17 + seed, k * 7 + g), cx = 7 + Math.floor(r(0) * 18), cy = 7 + Math.floor(r(1) * 18), n = 2 + Math.floor(r(2) * 3)
    for (let i = 0; i < n; i++) {
      const q = (k) => hash(v * 97 + g * 31 + i * 13 + seed, k), m = kinds[Math.floor(q(0) * kinds.length)], w = m[0].length, h = m.length
      list.push([Math.max(1, Math.min(T - 1 - w, cx + Math.round((q(1) - 0.5) * 12) - (w >> 1))), Math.max(1, Math.min(T - 1 - h, cy + Math.round((q(2) - 0.5) * 10) - (h >> 1))), m])
    }
  }
  return marks(list)
}
const recolor = (at, map) => new Map([...at].map(([p, k]) => [p, map[k] ?? k]))
// The field's marks: blade fans a step darker (m) from a root, some with a lit blade (l) and a pale tip (v); a tall
// clump (blades lit at their tips, its foot in shade); clover (three leaves lit on their upper left round a dark
// heart); pebbles together, their shade on the grass (G)
const W7 = ["m..m..m", ".m.m.m.", "..mmm..", "...m..."], V5 = ["m...m", ".m.m.", "..m.."], Y4 = ["v..m", "lm.m", ".mm.", "..m."], L6 = ["v.v...", "l.lm.m", ".mlmm.", "..m..."]
const TALL = ["..v...v..", ".vl..vl.v", ".ll.vll.l", "vlg.llg.l", "llgvlgglg", "lgglgglgm", ".mGmGmGm."], CLOVER = [".ll.ll", "lvllvl", ".lMMl.", "..lM..", "...M.."], PEBBLES = [".ss...", "sSSK.s", ".GGG.S", "....GG"]
// eight variants: one to three clusters, the kinds by turns (a tall clump in two of them, clover or pebbles in four)
const KINDS = [[W7, V5, Y4, CLOVER], [W7, V5, L6, PEBBLES, Y4], [V5, Y4, W7], [TALL, W7, L6, V5], [L6, V5, CLOVER], [W7, Y4], [W7, V5, PEBBLES], [V5, W7, L6]]
const FIELDS = KINDS.map((k, v) => cluster(v, 0, k, [2, 3, 1, 2, 1, 2, 2, 1][v]))
const grass = (x, y, v = 0) => FIELDS[v].get(`${x},${y}`) ?? "g"

// ---------------------------------------------------------------- the field's regions
// Lighter and darker grass as terrains of their own over the field (corner sets, as the path: a map lays a region
// over a few tiles), as Chained Echoes' fields are patched: each one tone step off the field (the light one a green
// between the field and its light, the dark one the blade marks' tone), its marks the field's recolored, no outline
// and no rim; its edge irregular (the wobble, lobes 8 px apart: a period of 32, so every seam matches) and broken by
// hand: along it, tufts of the region's tone crossing out into the field and tufts of the field's crossing in, so no
// line runs along a border.
pal({ Z: "#9ce354", X: "#64c83d" })   // the light region's tone; the dark one's while it is drawn (the blade marks' m after)
const leafy = (x, y, t) => wob(x, y, t) + 0.07 * (Math.abs(Math.sin((x + 0.5) * Math.PI / 8)) * Math.abs(Math.sin((y + 0.5) * Math.PI / 8)) - 0.4)
const LIGHT = FIELDS.map((f) => recolor(f, { m: "g", g: "Z", G: "m", M: "m" })), DARK = FIELDS.map((f) => recolor(f, { m: "M", l: "g", v: "l", g: "X" }))
corners("_grasslight32", { size: T, variants: VARIANTS }, (x, y, t, v) => (leafy(x, y, t) > 0.5 ? LIGHT[(v + 1) % VARIANTS].get(`${x},${y}`) ?? "Z" : grass(x, y, v)))
corners("_grassdark32", { size: T, variants: VARIANTS }, (x, y, t, v) => (leafy(x, y, t) > 0.5 ? DARK[(v + 2) % VARIANTS].get(`${x},${y}`) ?? "X" : grass(x, y, v)))
// (a tuft: three blades from a root, the middle one tallest)
const TUFT = [[-1, -1], [1, -1], [0, -2], [-1, 0], [0, 0], [1, 0], [0, -1]]
const broken = (R, v, after) => (c) => {
  const reg = (x, y) => c.is(x, y, R), field = (x, y) => c.is(x, y, "gml"), N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]], stamps = []
  for (let y = 2; y < T - 1; y++) for (let x = 1; x < T - 1; x++) {
    if (hash(x + 37 * v, y + 11 * v) > 0.3) continue
    // a region pixel at the border: a tuft of its tone two px out; a field pixel at it: a tuft of the field's two px in
    const d = N4.find(([u, w]) => (reg(x, y) ? field(x + u, y + w) : field(x, y) && reg(x + u, y + w)))
    if (!d) continue
    const s = reg(x, y) ? 1 : -1, k = reg(x, y) ? R : "g"
    stamps.push([x + 2 * s * d[0], y + 2 * s * d[1], k])
  }
  for (const [x, y, k] of stamps) for (const [u, w] of TUFT) if (x + u >= 0 && x + u < T && y + w >= 0 && y + w < T) c.px(x + u, y + w, k)
  if (after) for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) if (c.is(x, y, R)) c.px(x, y, after)
}
for (const [set, R, after] of [["grasslight32", "Z"], ["grassdark32", "X", "m"]]) for (let m = 0; m < 16; m++) {
  for (let v = 0; v < VARIANTS; v++) sprite(`${set}_${m}_${v}`, { base: `_${set}_${m}_${v}` }, broken(R, v, after))
  group(`${set}_${m}`, Array.from({ length: VARIANTS }, (_, v) => `${set}_${m}_${v}`))
}
card("grasslight32_0_0", { is: "the field's lighter and darker regions at 32 as terrains over it (grasslight32_<mask>_<variant>, grassdark32_...; a map lays one over a few tiles): each one tone step off the field, no outline or rim, its edge irregular and broken by tufts of both tones crossing it", cells: { "topdown/32": "✎" },
  vary: { part: "grasslight32_0 (none) to grasslight32_15 (all region) by the corners' mask, each a group of 8 variants; grassdark32 the same" } })

// ---------------------------------------------------------------- the shore
// Its bands by depth: the field, the grass's lip, sand, wet sand, the foam's rim, a pale cyan, the shallows, a middle
// tone, the water (lighter near the shore, darker out); then by hand: shells on the dry sand (a pixel lit, its shade
// under it), the foam's lace along the rim and a second line of foam a few px out, broken, following the shore; waves
// grouped and sparse (one group in half the tiles: 2-3 crests of the shallows' tone stacked, their middles pale)
pal({ n: "#4aaede" })   // the water's middle tone, between the shallows and the water
const DEPTH = (t) => t < 0.33 ? "g" : t < 0.36 ? "G" : t < 0.43 ? "a" : t < 0.47 ? "A" : t < 0.5 ? "f" : t < 0.53 ? "c" : t < 0.62 ? "b" : t < 0.74 ? "n" : "B"
corners("_shore32", { size: T, variants: VARIANTS }, (x, y, t, v) => {
  const e = wob(x, y, t), k = DEPTH(e)
  return k === "g" ? grass(x, y, v) : (k === "b" || k === "n") && e > 0.585 && e < 0.6 && (x + 2 * y) % 5 ? "c" : k
})
const WAVES = Array.from({ length: VARIANTS }, (_, v) => (v % 2 ? new Map() : cluster(v, 5, [["bbcbb"], ["bcbb"], ["bbb"], ["bcbbb"]], 1)))
const shore = (v) => (c) => {
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    if (c.is(x, y, "B") && WAVES[v].has(`${x},${y}`)) c.px(x, y, WAVES[v].get(`${x},${y}`))
    else if (c.is(x, y, "a") && hash(x + v * 32, y) > 0.985 && y < T - 1 && c.is(x, y + 1, "a")) { c.px(x, y, "s"); c.px(x, y + 1, "A") }
    else if (c.is(x, y, "b") && c.is(x, y - 1, "c") && (x + 2 * y + v) % 5 === 0) c.px(x, y, "f")
  }
}
for (let m = 0; m < 16; m++) { for (let v = 0; v < VARIANTS; v++) sprite(`shore32_${m}_${v}`, { base: `_shore32_${m}_${v}` }, shore(v)); group(`shore32_${m}`, Array.from({ length: VARIANTS }, (_, v) => `shore32_${m}_${v}`)) }
card("shore32_0_0", { is: "the shore's 16 corner tiles at 32, eight drawings each (shore32_<mask>_<variant>; shore32_<mask> the group, picked by where a tile lies): the field, the grass's lip, sand with shells, wet sand, the foam's rim and lace, a second line of foam following the shore, the shallows, a middle tone, the water, waves grouped and sparse; no line", cells: { "topdown/32": "✎" },
  vary: { part: "shore32_0 (all land) to shore32_15 (all sea) by the corners' mask, each a group of 8 variants; tilemap(map, { corners: \"w\", map }) picks them" } })

// ---------------------------------------------------------------- the path
// The dirt; then by hand: loose patches of different sizes (up to seven a tile, overlapping): worn lighter where people
// walk, darker where it stays damp; pebbles in clusters, lit on top, their shade on the dirt; a crack where it dried; grass growing into it near
// its edge (sprigs in the dirt within 4 px of the grass); its edge a fringe of grass tufts leaning over the dirt, each lit
// at its tips, its foot in the grass's shade, and under it on the dirt the dirt's shade two rows deep
// (the 16 kit's band, the dirt one tone: its lighter middle and its darker spots laid as patches below, so it is about
// half one tone, as LPC's and Chained Echoes' paths are, 32-58%)
const PATH32 = (t) => (t < 0.42 ? "g" : "e")
corners("_path32", { size: T, variants: VARIANTS }, (x, y, t, v) => { const k = PATH32(wob(x, y, t)); return k === "g" ? grass(x, y, v) : k })
const GIANT = ["....eeeeeee.....", "..eeeeeeeeeeee..", ".eeeeeeeeeeeeeee", "eeeeeEeeeeeeeeee", "eeeeeeeeeeeEeee.", ".eeeeeeeeeeeeee.", "..eeeeeeeeeee...", "....eeeeee......"]
const HUGE = ["...eeeeee...", ".eeeeeeeeee.", "eeeeeeeEeeee", "eeeEeeeeeeee", ".eeeeeeeeee.", "...eeeeeee.."]
const BIG = ["..eeee...", ".eeeeeee.", "eeeEeeeee", ".eeeeeeee", "..eeeee.."], MID = [".eee.", "eeEee", ".eee."], SMALL = ["ee", ".e"]
const WORN = BIG.map((r) => r.replace(/[eE]/g, "u")), WORNS = MID.map((r) => r.replace(/[eE]/g, "u"))
const STONES = [".s....", "sSK.s.", ".EE.SK", "....EE"], STONE = [".s", "sS", "EE"], CRACK = ["E...", ".E..", ".EE.", "...E"]
// (the patches on a jittered 3 x 3 grid, one cell in ten left bare, one or two patches a cell of sizes by turns, their
// places in it at random: they overlap and leave the dirt about half one tone)
const DIRT = Array.from({ length: VARIANTS }, (_, v) => {
  const list = [], GW = GIANT.map((r) => r.replace(/[eE]/g, "u")), KIND = [GW, HUGE, WORN, GW, MID, STONES, BIG, SMALL, GW, CRACK, STONE, WORNS]
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    const r = (k) => hash(v * 41 + i * 7 + 9, j * 13 + k)
    if (r(0) < 0.1) continue
    for (const q of r(4) < 0.7 ? [0, 5] : [0]) {
      const g = KIND[Math.floor(r(1 + q) * KIND.length)], w = g[0].length, h = g.length
      list.push([Math.max(0, Math.min(T - w, i * 10 + Math.floor(r(2 + q) * 12) - 1)), Math.max(0, Math.min(T - h, j * 10 + Math.floor(r(3 + q) * 12) - 1)), g])
    }
  }
  return marks(list)
})
const CLUMP = ["..v.v..", ".vlvlv.", "vlllllm", "mlglmmG", ".mGmG.."], SPRIG = [[0, 0, "l"], [1, 1, "g"], [2, 0, "l"], [1, 2, "m"]]
const path = (v) => (c) => {
  const soil = (x, y) => c.is(x, y, "euE"), grassy = (x, y) => c.is(x, y, "gmMlv"), at = []
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) { const k = DIRT[v].get(`${x},${y}`); if (k && c.is(x, y, "eu")) c.px(x, y, k === "E" ? (c.is(x, y, "u") ? "e" : "E") : k === "e" ? (c.is(x, y, "u") ? "e" : "E") : k) }
  // grass growing into the dirt near its edge
  for (let y = 1; y < T - 3; y++) for (let x = 1; x < T - 3; x++) {
    if (!soil(x, y) || hash(x + 31 * v, y + 7) < 0.97) continue
    let near = false
    for (let d = 2; d <= 4 && !near; d++) near = grassy(x - d, y) || grassy(x + d, y) || grassy(x, y - d) || grassy(x, y + d)
    if (near) for (const [u, w, k] of SPRIG) if (soil(x + u, y + w)) c.px(x + u, y + w, k)
  }
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    if (!c.is(x, y, "gmM") || (x * 3 + y * 7) % 5) continue
    const d = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([u, w]) => soil(x + u, y + w))
    if (d.length) at.push([x + d[0][0], y + d[0][1]])
  }
  for (const [x, y] of at) {
    CLUMP.forEach((r, j) => [...r].forEach((k, i) => { const u = x + i - 3, w = y + j - 3; if (k !== "." && u >= 0 && u < T && w >= 0 && w < T) c.px(u, w, k) }))
    for (let w = 2; w < 4; w++) for (let u = -2; u < 3; u++) if (soil(x + u, y + w)) c.px(x + u, y + w, "E")
  }
}
for (let m = 0; m < 16; m++) { for (let v = 0; v < VARIANTS; v++) sprite(`path32_${m}_${v}`, { base: `_path32_${m}_${v}` }, path(v)); group(`path32_${m}`, Array.from({ length: VARIANTS }, (_, v) => `path32_${m}_${v}`)) }
card("path32_0_0", { is: "a dirt path's 16 corner tiles at 32 on the grass, eight drawings each (path32_<mask>_<variant>; path32_<mask> the group): a fringe of grass tufts leaning over its edge, grass growing into it near the edge, warm dirt with a worn lighter middle, loose patches of different sizes, pebbles in clusters, a dry crack; no line", cells: { "topdown/32": "✎" },
  vary: { part: "path32_0 (all grass) to path32_15 (all path) by the corners' mask, each a group of 8 variants, as the shore's" } })

// ---------------------------------------------------------------- what grows and lies on it
// Flowers, 9 x 9: four petals round a heart, seen from above, the upper left petal lit and the lower right in its
// shade, the heart yellow with its own shade; red, white and blue
const FLOWER = `
  .PP...PP.
  PPPP.PPPS
  PPPPHPPSS
  .PPHHhSS.
  ..PHhhS..
  .PShhhSS.
  PPSS.SSSS
  PSSS.SSSS
  .SS...SS.`
for (const [n, P, S] of [["r", "r", "R"], ["w", "p", "c"], ["b", "j", "J"]]) sprite(`_flower_${n}`, { pivot: "bottom" }, FLOWER.replace(/P/g, P).replace(/S/g, S).replace(/H/g, "y").replace(/h/g, "Y"))
group("flowers", ["_flower_r", "_flower_w", "_flower_b"])
card("flowers", { is: "three flowers at 32, 9x9: four petals round a yellow heart, lit on the upper left, red, white and blue, to set in groups", cells: { "topdown/32": "✎" } })
// The grass, a bush and a rock, each drafted in 3D and finished by hand (topdown32: form and light from 3D, the final
// pixels by hand): seen from what stands' 30 degrees at 32 px a meter, 4 tones, the material's darkest along the
// contour away from the light (no line toward it), lit from the upper left; drawn three times over and brought down by shrink's edge
// treatment (the silhouette from the coverage and evened, the line by its own vote, its gaps closed), the draft kept
// live and frozen (frozen/<name>_td32.png), the pass on top.
const K3 = 3, DRAFT32 = { light: [-0.5, -0.45, 0.75], surface: { tones: 4, outline: true }, view: { kind: "side", pitch: 30 }, ppm: 32 * K3, headings: ["s"] }
// (the frozen draft drawn three times over, and the draft brought down from it)
const draft3 = (name) => {
  sprite(`_${name}_draft3`, { png: `frozen/${name}_td32.png`, frozen: `_${name}_live_s` })
  sprite(`_${name}_draft`, { base: `_${name}_draft3`, shrink: { by: K3, cover: 1 / 3 } })
}
const LEAVES32 = ["#1b4d34", "#288556", "#7cd640", "#b9f06c"], STONE32 = ["#3f3d55", "#75798f", "#aeb0bc", "#eeebe0"], MOSS32 = ["#288556", "#50ad39", "#7cd640", "#b9f06c"]
const STEM32 = ["#64382a", "#64382a", "#a06a40", "#cf9553"], GRASS32 = { ...DRAFT32, surface: { tones: 4, outline: false } }
// the island's greens dark to light: edge, shadow, the darker region, the field, light, pale
const GREENS = ["h", "G", "M", "g", "l", "v"]
// The grass, as the games' 3D models build it: Link's Awakening's clump (three rings of broad blades round its root,
// their tops at 0.42, 0.73 and 1 of its height, leaning out 56, 41 and 32 degrees: the lower the ring the flatter), its
// tall grass (a tile of blades, Link's Awakening's 22 cards each a strip of about three, their tips at 0.75-1 of its
// height), the colour from root to tip (theirs #277c21 to #4a9c1d, and #014c10 to #00a91f: darker and bluer at the
// root, lighter and yellower at the tip). Each drafted in 3D (its blades rods tapering to a point, placing them and
// their lean), then by hand: each blade a stroke from root to tip where the draft drew it, back to front, as wide as
// the draft's blade up to near its middle then tapering to a pixel, along the ramp from its root to its tip, its left
// edge a step lighter (the light from the left).
// a blade's rod, from its root [x, y, 0] to its tip, `r` m wide at its root, tapering to a point
const bladeRod = ({ root, tip }, r) => sdf.capsule(root, tip, r, r * 0.25)
const stroke = (c, [x0, y0], [x1, y1], w0, ramp) => {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1)
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = Math.round(x0 + (x1 - x0) * t), y = Math.round(y0 + (y1 - y0) * t), w = Math.max(1, t < 0.45 ? w0 : Math.round(w0 + ((1 - w0) * (t - 0.45)) / 0.55))
    const k = ramp[Math.min(ramp.length - 1, Math.floor(t * ramp.length))], j = GREENS.indexOf(k)
    for (let u = 0; u < w; u++) c.px(x - (w >> 1) + u, y, w > 1 && u === 0 ? GREENS[Math.min(5, j + 1)] : w > 2 && u === w - 1 ? GREENS[Math.max(0, j - 1)] : k)
  }
}
// a point [x, y, z] m on the screen as the draft sees it (30 degrees down, 32 px a meter), its origin at [ox, oy]
const onScreen = ([x, y, z], ox, oy) => [Math.round(ox + x * 32), Math.round(oy - (z * Math.cos(Math.PI / 6) + y * Math.sin(Math.PI / 6)) * 32)]
// the blades drawn by hand over their draft (which placed them): the draft's origin over the middle of its drawing,
// its lowest row the nearest root's
const blades = (list) => (c) => {
  let x0 = c.w, x1 = -1, y1 = -1
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) if (c.get(x, y)) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y1 = Math.max(y1, y) }
  const ox = (x0 + x1 + 1) / 2, oy = y1 - Math.max(...list.map((b) => onScreen(b.root, 0, 0)[1]))
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) c.px(x, y, "_")
  for (const b of [...list].sort((p, q) => q.root[1] - p.root[1] || q.tip[2] - p.tip[2])) stroke(c, onScreen(b.root, ox, oy), onScreen(b.tip, ox, oy), b.w, b.ramp)
}
// the tuft's blades: three rings (`N` blades each), the inner the tallest and darkest (deepest in it), the outer low,
// flaring and lit; `H` m tall, `r` m wide at a root
const RING = [["M", "g", "l", "v"], ["G", "M", "l", "v"], ["h", "G", "M", "l"]]
const tuftBlades = (H, r, N) => [[0.42, 56], [0.73, 41], [1, 32]].flatMap(([t, lean], ring) => Array.from({ length: N[ring] }, (_, i) => {
  const a = ((i + ring * 0.5) / N[ring]) * 2 * Math.PI + 0.3, rr = 0.02 * (2 - ring), h = H * t * (0.92 + 0.16 * hash(i, ring)), s = Math.tan((lean * Math.PI) / 180) * h
  return { root: [Math.cos(a) * rr, Math.sin(a) * rr, 0], tip: [Math.cos(a) * (rr + s), Math.sin(a) * (rr + s), h], w: Math.max(3, Math.round(r * 32 * 1.6)), ramp: RING[ring], r }
}))
// the tall grass's blades: eight rows across the tile back to front (4-5 px apart on the screen, each a little off the
// grid), each blade one of three ramps from its dark root (so tiles of it in a block don't band), each leaning `lean` of its offset out from the middle, its tip at 0.75-1 of `H`; its roots
// spread over its tile's whole square on the ground (the ground's 32 px grid, 2 m deep at the 30 degrees things stand
// at), so tiles of it side by side close up
const TALL_RAMPS = [["h", "G", "M", "g", "l"], ["h", "G", "M", "l", "v"], ["G", "M", "g", "l", "v"]]
const tallBlades = (H, lean = 0.35) => Array.from({ length: 48 }, (_, i) => {
  const row = Math.floor(i / 6), j = i % 6, y = 1 - (row * 2) / 7 + (hash(i, 2) - 0.5) * 0.12, x = -0.38 + (j + hash(row, 9)) * 0.14 + (hash(i, 1) - 0.5) * 0.08, h = H * (0.75 + 0.25 * hash(i, 4))
  return { root: [x, y, 0], tip: [x + x * lean + (hash(i, 3) - 0.5) * 0.08 * lean, y, h], w: 4, r: 0.04, ramp: TALL_RAMPS[Math.floor(hash(i, 6) * 3)] }
})
for (const [name, list] of [["tuft", tuftBlades(0.3, 0.045, [4, 3, 2])], ["tuft_big", tuftBlades(0.5, 0.065, [5, 4, 3])], ["tallgrass", tallBlades(0.5)], ["tallgrass_cut", tallBlades(0.14, 0).map((b) => ({ ...b, w: 3, ramp: ["h", "G", "M", "l"] }))]]) {
  turnaround(`_${name}_live`, sdf.union(list.map((b) => bladeRod(b, b.r))).mat("blade"), { ...GRASS32, mats: { blade: LEAVES32 } })
  draft3(name)
  sprite(name === "tuft" ? "_tuft" : name, { base: `_${name}_draft` }, blades(list))
}
card("_tuft", { is: "a tuft of grass at 32, as Link's Awakening's clump: three rings of blades round its root, the inner tallest and darkest, the outer low, flaring and lit, dark and blue-green at the root, pale and yellow-green at the tips; drafted in 3D, each blade by hand", cells: { "topdown/32": "✎" },
  vary: { part: "tuft_big: the clump a tile across, to cut (its rings 5, 4 and 3 blades)" } })
card("tallgrass", { is: "tall grass at 32, a tile, as Link's Awakening's: blades in rows across it, the back rows darker, leaning a little out, their roots dark, their tips pale; drafted in 3D, each blade by hand; tiles of it side by side make a field of it", cells: { "topdown/32": "✎" },
  vary: { part: "tallgrass_cut: its stubs, cut (0.3 of its height, their cut tops lit)" } })
// The tall grass's edges, a corner set as the shore's and the path's (tallgrass_<mask>_<variant>, two drawings each, the
// mask the corners that are tall grass: 1 the top left, 2 the top right, 4 the bottom left, 8 the bottom right;
// tallgrass_15 the inside tile above): its own blades (the inside tile's, as its draft laid them) weighed by how much
// of the corners round each root are tall grass (blended across the tile, a wobble 16 px long on it so no border runs
// straight and every seam matches), then by hand: deep in, as the inside tile; along the border shorter (0.6 of its
// height at the line), sparser and leaning out, away from the patch (toward us only a little: a blade leaning at us is a
// dash); past the line a blade straying alone here and
// there; a corner alone rounds off (the blend's curve). Its canvas wider than the inside tile's, its blades placed as
// the inside tile's are (the same origin over its pivot), so the set closes up with it.
const tallEdge = (m, v) => (c) => {
  const list = tallBlades(0.5), d = c.asset("_tallgrass_draft"), b = d.bounds(), [px, py] = d.pivot
  const ox = 24 + (b.x + b.w / 2 - px), oy = 36 + (b.y + b.h - 1 - Math.max(...list.map((q) => onScreen(q.root, 0, 0)[1])) - py)
  const K = [m & 1, (m >> 1) & 1, (m >> 2) & 1, (m >> 3) & 1]
  // (the corners' weight at a root, from its place on the ground square: u across, w down, 0..1)
  const at = (u, w) => K[0] * (1 - u) * (1 - w) + K[1] * u * (1 - w) + K[2] * (1 - u) * w + K[3] * u * w
  const weigh = ([x, y]) => {
    const u = Math.min(1, Math.max(0, x + 0.5)), w = Math.min(1, Math.max(0, (1 - y) / 2)), e = 0.05
    const t = at(u, w) + 0.07 * Math.sin((u * 32 + 0.5) * Math.PI / 8) + 0.07 * Math.sin((w * 32 + 0.5) * Math.PI / 8)
    return [t, (at(u + e, w) - at(u - e, w)) / (2 * e), (at(u, w + e) - at(u, w - e)) / (2 * e)]
  }
  const out = []
  list.forEach((q, i) => {
    const [t, gu, gw] = weigh(q.root), g = Math.hypot(gu, gw) || 1, r = hash(i * 7 + v * 131, m)
    if (t >= 0.62) return out.push(q)
    // (out: away from the patch, down its weight: across in x, down the square in y)
    const lean = (k, h) => ({ ...q, tip: [q.tip[0] - (gu / g) * k, q.tip[1] + (gw / g) * k * (gw > 0 ? 2 : 0.6), h] })
    if (t >= 0.38 && r < 0.45 + (t - 0.38) * 2.2) return out.push(lean(0.12 + (0.62 - t) * 0.4, q.tip[2] * (0.6 + (t - 0.38) * 1.7)))
    if (t >= 0.15 && t < 0.38 && r < 0.09) out.push({ ...lean(0.16, q.tip[2] * 0.5), w: 3 })
  })
  for (const q of [...out].sort((p, q) => q.root[1] - p.root[1] || q.tip[2] - p.tip[2])) stroke(c, onScreen(q.root, ox, oy), onScreen(q.tip, ox, oy), q.w, q.ramp)
}
for (let m = 1; m < 15; m++) {
  for (let v = 0; v < 2; v++) sprite(`tallgrass_${m}_${v}`, { w: 48, h: 60, pivot: [24, 36] }, tallEdge(m, v))
  group(`tallgrass_${m}`, [`tallgrass_${m}_0`, `tallgrass_${m}_1`])
}
group("tallgrass_15", ["tallgrass"])
card("tallgrass_1_0", { is: "the tall grass's edges at 32, a corner set as the shore's (tallgrass_<mask>_<variant>; tallgrass_15 the inside tile): along the border its blades shorter, sparser and leaning out, a blade straying alone past it, a corner alone rounded; no straight run", cells: { "topdown/32": "✎" },
  vary: { part: "tallgrass_1 (the top left corner) to tallgrass_14, each a group of 2 drawings; a map's corners pick them, each placed with its pivot on its square's middle" } })
// The bush, a tile (its bulk 4m's, 0.95 m across), as Pokemon Let's Go's bushes are built: four stems from its root
// spreading up and out, 30 leaves (pointed ovals 0.18 m long: two spheres' lens, flattened) on a dome over them, each
// tilted out from its middle, over a core of leaves; by hand: the draft's light smoothed into four zones (deep, shade,
// middle, lit: its speckle gone), the holes between the leaves each zone's darkest, then leaves laid over it shingled
// (rows 3 px apart from its top down, each row over the one behind it, the tips behind still showing; 4 px apart along
// a row), pointed ovals 5 x 5 pointing out from its middle (up on its top, out at its sides), each in its zone's tones
// (its side toward the light the lighter, its midrib's side away the darker), so its edge is scalloped by leaf tips;
// its stems showing at its foot between the lowest leaves; its line the leaves' darkest along its lower right
const LEAVES = Array.from({ length: 30 }, (_, i) => {
  const a = i * 2.39996, u = (i + 0.5) / 30, el = Math.asin(1 - u * 1.15)   // a golden spiral over the dome, down to a little under its middle
  const R = 0.44 * (0.9 + 0.2 * hash(i, 7)), x = Math.cos(a) * Math.cos(el) * R, y = Math.sin(a) * Math.cos(el) * R * 0.85, z = 0.36 + Math.sin(el) * R * 0.8
  return sdf.intersect(sdf.sphere(0.11).at(0, 0.065, 0), sdf.sphere(0.11).at(0, -0.065, 0), sdf.box([0.24, 0.24, 0.04])).rotate(90, "z").rotate(-Math.max(15, (el * 180) / Math.PI), "y").rotate((a * 180) / Math.PI, "z").at(x, y, z)
})
const STEMS = sdf.union([0.5, 2.3, 3.9, 5.4].map((a, i) => sdf.capsule([0, 0, 0], [Math.cos(a) * 0.2, Math.sin(a) * 0.2, 0.38 + 0.06 * (i % 2)], 0.035, 0.018))).mat("stem")
turnaround("_bush_live", sdf.union(STEMS, sdf.union(LEAVES, { smooth: 0.01 }).mat("leaf"), sdf.ellipsoid([0.36, 0.3, 0.26]).at(0, 0, 0.36).mat("leaf")), { ...GRASS32, mats: { leaf: LEAVES32, stem: STEM32 } })
draft3("bush")
const ZONES = [["G", "h", "h"], ["g", "G", "h"], ["l", "g", "G"], ["v", "l", "g"]]
const LEAF = { up: ["..a..", ".aab.", "aabbd", ".abd.", "..d.."], left: ["..aa.", ".aabb", "aabbd", ".bdd.", "....."], right: [".aa..", "abba.", "abbbd", ".bdd.", "....."] }
sprite("bush", { base: "_bush_draft" }, (c) => {
  const LUM = { h: 0, G: 1, g: 2, l: 3, v: 4 }, on = (x, y) => c.is(x, y, "hGglv")
  let x0 = c.w, x1 = -1, y0 = c.h, y1 = -1
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) if (on(x, y)) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y) }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2
  // (each pixel's light averaged over 5 x 5, a step down toward its lower right)
  const zone = (x, y) => { let s = 0, n = 0; for (let v = -2; v <= 2; v++) for (let u = -2; u <= 2; u++) if (on(x + u, y + v)) { s += LUM[c.key(x + u, y + v)]; n++ } const z = n ? s / n - ((x - cx) / (x1 - x0) + (y - cy) / (y1 - y0)) * 0.6 : 0; return z < 1.1 ? 0 : z < 1.9 ? 1 : z < 2.6 ? 2 : 3 }
  const Z = []; for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) Z.push(on(x, y) ? zone(x, y) : -1)
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) if (Z[y * c.w + x] >= 0) c.px(x, y, ZONES[Z[y * c.w + x]][2])
  for (let gy = y0 - 2, row = 0; gy <= y1 - 3; gy += 3, row++) for (let gx = x0 - 2 + (row % 2) * 2; gx <= x1 - 1; gx += 4) {
    const x = gx + Math.round((hash(gx, gy) - 0.5) * 1.6), y = gy + Math.round((hash(gy, gx) - 0.5) * 1.2)
    if (!on(x + 2, y + 2)) continue
    const [a, b, d] = ZONES[Math.max(0, Z[(y + 2) * c.w + x + 2])], kind = y + 2 < cy - (y1 - y0) * 0.1 ? "up" : x + 2 < cx ? "left" : "right"
    LEAF[kind].forEach((r, j) => [...r].forEach((k, i) => { if (k !== ".") c.px(x + i, y + j, k === "a" ? a : k === "b" ? b : d) }))
  }
  for (const [u, v, k] of [[0, 0, "o"], [1, 0, "O"], [-1, -1, "o"], [2, -1, "O"], [-2, -2, "o"], [3, -2, "O"], [0, -1, "O"], [1, -1, "o"]]) c.px(Math.round(cx) + u, y1 + 1 + v, k)
  even32(c)
  line32(c, [["h", "G", "g", "l", "v"], ["O", "o"]])
})
card("bush", { is: "a bush at 32, a tile, modeled as Pokemon Let's Go's bushes are built and finished by hand: leaves shingled over it, pointed ovals pointing out from its middle, lit on its upper left and in shade low and right, its edge scalloped by leaf tips, its stems showing at its foot, its line only along its lower right", cells: { "topdown/32": "✎" } })
// The rock, a tile (topdown32's rock box): an irregular stone of broad planes cut from a flattened ellipsoid, its ridges
// soft (the planes met smoothly), its top tilted (its left side the taller), a face each way, a chip off its front-left
// corner, resting on a flat base; moss where its top lies flattest and lowest (where water sits). Picked from four (two
// make3d.rock seeds, two cuts of planes) as the one with the boulder's language: a lit facet on the left, the front in
// the middle tone, the right in shade, the moss on top. By hand: the stone's darkest only on its line, grounded (its
// foot flat where it rests, tufts of the island's grass over it); its contact shadow the scene's (topdown32's shadow).
const unit = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l) }
const ROCK_CUTS = [[[0.3, 0.12, 1], 0.2], [[-1, -0.15, 0.25], 0.42], [[1, 0, 0.35], 0.38], [[-0.1, -1, 0.3], 0.33], [[0.7, -0.7, 0.45], 0.38], [[0, 1, 0.2], 0.34], [[-0.55, -0.6, 0.6], 0.34]]
const ROCK = sdf.ellipsoid([0.5, 0.4, 0.44]).intersect(...ROCK_CUTS.map(([n, d]) => sdf.plane(unit(n), d)), { smooth: 0.03 })
  .at(0, 0, 0.2).intersect(sdf.plane([0, 0, -1], 0)).mat("stone").paint("moss", (q, n) => n[2] > 0.9 && q[0] > 0.04)
draft3("rock", turnaround("_rock_live", ROCK, { ...DRAFT32, mats: { stone: STONE32, moss: MOSS32 } }))
sprite("rock", { base: "_rock_draft" }, (c) => {
  // (the stone's darkest only on its line: a crease of it inside the stone taken into its shade)
  const inner = []
  for (let y = 1; y < c.h - 1; y++) for (let x = 1; x < c.w - 1; x++) if (c.is(x, y, "t") && [[0, -1], [0, 1], [-1, 0], [1, 0]].every(([u, v]) => c.get(x + u, y + v))) inner.push([x, y])
  for (const [x, y] of inner) c.px(x, y, "K")
  const on = (x, y) => !!c.get(x, y), ys = [...Array(c.h).keys()].filter((y) => [...Array(c.w).keys()].some((x) => on(x, y))), yb = ys.at(-1)
  // tufts of the island's grass over its foot: lit tips, the field, its shade
  const xs = [...Array(c.w).keys()].filter((x) => on(x, yb)), L = xs[0], R = xs.at(-1)
  for (const x of [L, L + 9, R - 12, R - 5]) [[1, 0, "v"], [3, 0, "l"], [0, 1, "l"], [1, 1, "l"], [2, 1, "g"], [3, 1, "l"], [4, 1, "g"],
    [0, 2, "G"], [1, 2, "h"], [2, 2, "G"], [3, 2, "h"], [4, 2, "h"]].forEach(([u, v, k]) => c.px(x + u, yb - 2 + v, k))
})
card("rock", { is: "a rock at 32, a tile, modeled and finished by hand: broad facets each one tone, its left side taller, a chip off its front, moss where water sits on its top, its line only along its lower right, tufts over its foot", cells: { "topdown/32": "✎" } })
}
