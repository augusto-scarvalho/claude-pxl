// The island's nature kit: the ground of a top-down map at a 16 px grid and what grows and lies on it, from
// examples/topdown.px.js (which includes it), in the island style (lib/styles/island.px.js), drawn by hand as the
// action top-down school draws its maps (The Minish Cap; library F5's environment study, numbers only): a flat
// field in 2 tones with blade marks a step darker, regions of a darker grass, tall grass that stands up, a warm path
// whose edge is a fringe of grass tufts leaning over it, a sandy shore with a cyan rim, the vertical faces that show
// the camera (an earth bank under a grass lip, a hedge's front), flowers in groups and beds, a bush, a rock, a stump.
// The shore, the path and the darker grass are corner-based ("wang") sets: a map marks each tile corner, one
// function draws all 16 corner combinations, and tilemap() picks the right one per cell (examples/topdown.px.js shows
// how); full land and full sea have variants (the groups land and sea), so big areas don't repeat. The bank and the
// hedge are rows of 16 px tiles (a west end, middles, an east end). For any scene:
// include("<path>/lib/nature/island.px.js", { as: "island" }), its palette its own (or the style's with palette:
// true); island.shore(t) the shore's bands, for corners() at another tile size.
include("../styles/island.px.js", { palette: true })
pal({ R: "#d8365a", J: "#4f86e6", Y: "#f2b62e" })   // the flowers' petal shades
const island = {}
// in a block: its names stay its own when a scene includes the file
{
const T = 16
// the corners' wobble: it repeats every 8 px, so it matches across every tile seam
const wob = (x, y, t) => t + 0.035 * Math.sin((x + 0.5) * Math.PI / 4) + 0.035 * Math.sin((y + 0.5) * Math.PI / 4)
// a mark: a few blades fanning from a root, the field's step darker (m), 2 a tile, the same in every tile so the
// seams join; the land group's variants put theirs elsewhere
const marks = (list) => { const at = new Set(); for (const [x0, y0, g] of list) g.forEach((r, j) => [...r].forEach((k, i) => { if (k !== ".") at.add(`${x0 + i},${y0 + j}`) })); return at }
const W5 = ["m.m.m", ".mmm.", "..m.."], V3 = ["m.m", ".m."], Y4 = ["m..m", ".mm.", ".m.."]
const FIELD = marks([[2, 2, W5], [10, 10, V3]])
const grass = (x, y) => (FIELD.has(`${x},${y}`) ? "m" : "g")

// ---------------------------------------------------------------- shore (wang corners)
// Corner bits: 1 top-left, 2 top-right, 4 bottom-left, 8 bottom-right; a set bit is water. Inside a tile the
// corners blend bilinearly; the bands of that value: the field, the grass's lip in shade, sand, wet sand, then the
// water's rim (foam, a pale cyan, the shallows), its deep band where the bottom drops, the water. No line: the
// bands are its tones.
const band = (t) => t < 0.33 ? "g" : t < 0.36 ? "G" : t < 0.43 ? "a" : t < 0.47 ? "A" : t < 0.5 ? "f" : t < 0.53 ? "c" : t < 0.6 ? "b" : t < 0.64 ? "N" : "B"
corners("shore", { size: T }, (x, y, t) => { const k = band(wob(x, y, t)); return k === "g" ? grass(x, y) : k })
card("shore_0", { is: "the shore's 16 corner tiles (shore_0 all land to shore_15 all sea, a bit a corner: 1 top-left, 2 top-right, 4 bottom-left, 8 bottom-right): the field with its blade marks, the grass's lip, sand, wet sand, the water's rim (foam, pale cyan, shallows), a deep band, the water; no line", cells: { "topdown/16": "✎" },
  vary: { part: "shore_0 to shore_15 by the corners' mask; tilemap(map, { corners: \"w\", map }) picks them" } })

// ---------------------------------------------------------------- path (wang corners again)
// A set bit is path: the dirt, its middle lighter (u), a soft darker spot here and there (a step darker than what's
// round it). Its edge is a fringe of grass tufts leaning over the dirt, every 3 px along it: each a clump 5 px wide,
// lit at its tips, its foot in the grass's shade, and under it on the dirt the dirt's shade (E). No line.
const SPOTS = marks([[3, 9, ["SSS.", ".SSSS", "..SS"]], [11, 3, ["SS.", ".SS"]]])
const dirt = (x, y, w) => { const k = w > 0.82 ? "u" : "e"; return SPOTS.has(`${x},${y}`) ? (k === "u" ? "e" : "E") : k }
corners("_path", { size: T }, (x, y, t) => { const w = wob(x, y, t); return w < 0.42 ? grass(x, y) : dirt(x, y, w) })
const LEAF = [[-1, -2, "l"], [0, -2, "l"], [-2, -1, "l"], [-1, -1, "v"], [0, -1, "l"], [1, -1, "m"], [-1, 0, "m"], [0, 0, "l"], [1, 0, "m"], [2, 0, "G"], [0, 1, "m"], [1, 1, "G"]]
const fringe = (c) => {
  const soil = (x, y) => c.is(x, y, "euE"), at = []
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    if (!c.is(x, y, "gm") || (x * 3 + y * 7) % 3) continue
    const d = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([u, v]) => soil(x + u, y + v))
    if (d.length) at.push([x + d[0][0], y + d[0][1]])
  }
  for (const [x, y] of at) {
    for (const [u, v, k] of LEAF) if (x + u >= 0 && x + u < T && y + v >= 0 && y + v < T) c.px(x + u, y + v, k)
    for (const u of [0, 1, 2]) if (soil(x + u, y + 2)) c.px(x + u, y + 2, "E")
  }
}
for (let m = 0; m < 16; m++) sprite(`path_${m}`, { base: `_path_${m}` }, fringe)
card("path_0", { is: "a dirt path's 16 corner tiles on the grass (path_0 all grass to path_15 all path, the shore's corner bits): a fringe of grass tufts leaning over its edge, their shade on the dirt, warm yellow dirt with a lighter middle and soft spots, no line", cells: { "topdown/16": "✎" },
  vary: { part: "path_0 to path_15 by the corners' mask, as the shore's" } })

// ---------------------------------------------------------------- the darker grass (wang corners again)
// A set bit is the darker region (under trees, by a bank): its own tone (M) and its marks a step darker still (G),
// its edge a wobbling line where the two tones meet pixel by pixel. No line.
const DARK = marks([[3, 4, Y4], [11, 11, V3], [12, 2, ["G"]]])
corners("meadow", { size: T }, (x, y, t) => {
  const w = wob(x, y, t)
  if (w < 0.42) return grass(x, y)
  if (w < 0.48) return (x + y) % 2 ? "M" : grass(x, y)
  return DARK.has(`${x},${y}`) ? "G" : "M"
})
card("meadow_0", { is: "a darker grass's 16 corner tiles in the field (meadow_0 all field to meadow_15 all dark, the shore's corner bits): a region under trees or by a bank, its own marks, its edge pixel by pixel, no line", cells: { "topdown/16": "✎" },
  vary: { part: "meadow_0 to meadow_15 by the corners' mask" } })

// ---------------------------------------------------------------- the field's variants
// A tuft: a clump of blades standing up, lit at their tips, its foot in the field's shade
sprite("_tuft", `
  .v.l.
  lvllv
  gllgl
  .MGM.`)
card("_tuft", { is: "a tuft of grass, 5x4: a clump of blades lit at their tips over a foot in shade", cells: { "topdown/16": "✎" } })
// the flowers: four petals round a heart (a 5 x 5 cross of the petals' shade), red, white, blue and yellow
const flower = (P, S, H) => [`${P}${P}.${P}${P}`, `${P}${P}${S}${P}${P}`, `.${S}${H}${S}.`, `${P}${P}${S}${P}${P}`, `${P}${P}.${P}${P}`].join("\n")
sprite("_flower_r", flower("r", "R", "y"))
sprite("_flower_w", flower("p", "c", "y"))
sprite("_flower_b", flower("j", "J", "p"))
sprite("_flower_y", flower("y", "Y", "p"))
group("flowers", ["_flower_r", "_flower_w", "_flower_b", "_flower_y"])
card("flowers", { is: "four flowers, 5x5: four petals round a heart, red, white, blue and yellow, to set in groups", cells: { "topdown/16": "✎" } })
// the field's tiles: two tufts; three flowers in a group (a column of two, one beside), as the school sets them;
// other marks; tall grass, standing up from the field: blade tips along a ragged top, its body lit, its front in shade
sprite("grass_tuft", { w: T, h: T }, rect(0, 0, T, T, "g"), grid(1, 1, V3.join("\n")), grid(9, 12, W5.join("\n")),
  stamp("_tuft", 3, 6), stamp("_tuft", 10, 3))
sprite("grass_flower", { w: T, h: T }, rect(0, 0, T, T, "g"), grid(12, 1, V3.join("\n")), stamp("_flower_r", 2, 1), stamp("_flower_w", 2, 7), stamp("_flower_y", 8, 5))
sprite("grass_marks", { w: T, h: T }, rect(0, 0, T, T, "g"), grid(8, 1, W5.join("\n")), grid(2, 9, Y4.join("\n")), grid(12, 12, V3.join("\n")))
sprite("grass_tall", { w: T, h: T }, rect(0, 0, T, T, "g"), grid(0, 0, `
  .v...v...v..v...
  .l..vl..vl..lv..
  vl.vll.vlll.ll.v
  llvlllvllllvlllv
  lllgllllglllgllg
  lglllglllglllgll
  glllgllgllglllgl
  lgllglglgllglglg
  ggglggggglgggglg
  MgggMggMgggMgggM
  MMgMMMgMMMgMMMgM
  MMMMMMMMMMMMMMMM
  GMMMGMMMMGMMMGMM
  GGMGGGMGGGGMGGGG
  .GG.GGG.GG.GGG..
  ................`))
group("land", ["shore_0", "shore_0", "grass_marks", "shore_0", "grass_tuft", "grass_flower"])
card("land", { is: "full land: the field tile, other marks, two tufts, three flowers in a group; tall grass (grass_tall) to set in patches", cells: { "topdown/16": "✎" },
  vary: { part: "grass_tall: a tile of tall grass standing up, its front in shade" } })
// full sea: the water and its glints (short pale dashes, a dark ripple under each)
sprite("sea_glint", { base: "shore_15" }, hline(3, 4, 4, "c"), hline(5, 5, 3, "N"), px(4, 4, "f"), hline(10, 11, 3, "c"), hline(11, 12, 2, "N"))
group("sea", ["shore_15", "shore_15", "shore_15", "sea_glint"])
card("sea", { is: "full sea: the water tile three times in four, one with two glints", cells: { "topdown/16": "✎" } })
// a bed of flowers, 32 x 20: a stone rim seen from above (its top lit, its front a step down), dark earth, the
// flowers packed in two rows with leaves between
sprite("flower_bed", { w: 32, h: 20, pivot: "bottom" }, rect(0, 0, 32, 17, "S"), rect(0, 0, 32, 1, "s"), rect(0, 0, 1, 16, "s"),
  rect(31, 0, 1, 17, "K"), rect(0, 16, 32, 4, "K"), rect(0, 19, 32, 1, "t"), rect(1, 16, 30, 1, "S"),
  rect(2, 2, 28, 13, "D"), rect(2, 2, 28, 1, "z"),
  (c) => { for (let x = 2; x < 30; x++) for (const y of [7, 8, 13, 14]) if ((x + y) % 3) c.px(x, y, (x + y) % 2 ? "M" : "m") },
  stamp("_flower_r", 3, 3), stamp("_flower_y", 9, 2), stamp("_flower_w", 15, 3), stamp("_flower_b", 21, 2), stamp("_flower_r", 26, 3),
  stamp("_flower_w", 6, 9), stamp("_flower_b", 12, 10), stamp("_flower_r", 18, 9), stamp("_flower_y", 24, 10))
card("flower_bed", { is: "a bed of flowers, 32x20: a stone rim seen from above with its front, dark earth, nine flowers packed in two rows, leaves between", cells: { "topdown/16": "✎" } })

// ---------------------------------------------------------------- what shows the camera: a bank and a hedge
// A bank, rows of 16 x 32 tiles: the higher ground's field on top (6 rows), its lip (the grass's edge, its shade, its
// tufts dripping 1-4 px down the front), then the earth's front 22 px tall: a dark band under the lip, the earth with
// lit streaks and dark roots running down it, its foot dark and a line of the near-black. ledge_w and ledge_e turn it
// at its ends (a dark side with teeth); ledge and ledge_b are two middles, every pattern 16 px wide, so they join.
const LIP = [7, 7, 8, 7, 6, 7, 8, 9, 7, 7, 6, 7, 8, 7, 7, 8], DRIP = [0, 2, 0, 0, 3, 0, 0, 1, 0, 0, 2, 0, 0, 4, 0, 0]
const rnd = (a, b) => { const v = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return v - Math.floor(v) }
// the earth: a streak lit (i) or a root dark (D) down a column, starting and ending where its hash says, wandering
// a pixel now and then; a pebble lit here and there
const front = (seed) => (c) => {
  const k = Array.from({ length: 32 }, (_, y) => Array.from({ length: T }, (_, x) => {
    const lip = LIP[x]
    return y < lip - 1 ? grass(x, y) : y < lip ? "G" : y < lip + 3 ? "D" : y > 28 ? (y === 31 ? "z" : "D") : "d"
  }))
  for (let x = 0; x < T; x++) {
    const r = rnd(x, seed), y0 = LIP[x] + 4 + Math.floor(rnd(x, seed + 1) * 8), len = 3 + Math.floor(rnd(x, seed + 2) * 10)
    if (r > 0.42) continue
    let u = x
    for (let y = y0; y < Math.min(28, y0 + len); y++) {
      if (rnd(y, x + seed) < 0.18) u = Math.max(0, Math.min(T - 1, u + (rnd(y, seed) < 0.5 ? -1 : 1)))
      if (k[y][u] === "d") k[y][u] = r < 0.26 ? "i" : "D"
    }
  }
  for (let y = 12; y < 28; y++) for (let x = 0; x < T; x++) if (k[y][x] === "d" && rnd(x * 31 + y, seed + 3) < 0.04) k[y][x] = "i"
  for (let x = 0; x < T; x++) for (let y = LIP[x]; y < LIP[x] + DRIP[x]; y++) k[y][x] = y === LIP[x] + DRIP[x] - 1 ? "G" : "M"
  k.forEach((row, y) => row.forEach((key, x) => c.px(x, y, key)))
}
sprite("ledge", { w: T, h: 32 }, front(1))
sprite("ledge_b", { w: T, h: 32 }, front(7))
// an end: the front's last columns turn away (the side, seen from above, a dark band with teeth up the higher ground)
const end = (side) => (c) => {
  for (let y = 0; y < 32; y++) for (let i = 0; i < 4; i++) {
    const x = side < 0 ? i : T - 1 - i, tooth = (y % 4) < 2 ? 3 : 2
    if (i < tooth) c.px(x, y, i === 0 || y > 28 ? "z" : "D")
    else if (i === tooth && y >= LIP[x]) c.px(x, y, "D")
  }
}
sprite("ledge_w", { base: "ledge" }, end(-1))
sprite("ledge_e", { base: "ledge_b" }, end(1))
card("ledge", { is: "a bank where the ground steps up, a row of 16x32 tiles: the higher field and its lip on top, an earth front 22 px tall (lit streaks, dark roots, tufts dripping from the lip), a dark foot; ledge_w and ledge_e its ends", cells: { "topdown/16": "✎" },
  vary: { part: "ledge_w, ledge, ledge_b, ledge_e: a west end, two middles, an east end; any width in 16 px" } })
// A hedge, rows of 16 x 22 tiles: its top lit (the light with pale leaf clusters, the field's tone between them, its
// edge in bumps), its front 8 px in shade (a lit lip, then darker, clusters marked), a dark foot; edged in the
// green's darkest. hedge_w and hedge_e round its ends.
const hedge = (c) => {
  for (let y = 0; y < 22; y++) for (let x = 0; x < T; x++) {
    let k = y === 0 ? (x % 4 === 1 || x % 4 === 2 ? "h" : null) : y === 1 ? (x % 4 === 1 || x % 4 === 2 ? "l" : "h") : y < 13 ? "l" : y === 13 ? "m" : y < 20 ? "M" : y === 20 ? "G" : "h"
    if (k === "l" && ((x + 3 * Math.floor(y / 3)) % 5 === 0 || (x + 3 * Math.floor(y / 3)) % 5 === 1) && y % 3 !== 2) k = y % 3 === 0 ? "v" : "l"
    if (k === "l" && (x * 3 + y * 5) % 11 === 0) k = "g"
    if (k === "M" && (x + 2 * Math.floor(y / 3)) % 4 === 0) k = y % 3 === 0 ? "m" : "G"
    if (k) c.px(x, y, k)
  }
}
sprite("hedge", { w: T, h: 22, pivot: "bottom" }, hedge)
const round = (side) => (c) => {
  const xs = side < 0 ? [0, 1] : [T - 1, T - 2]
  for (let y = 0; y < 22; y++) { c.px(xs[0], y, y < 2 || y > 20 ? "_" : "h"); if (y < 1 || y > 20) c.px(xs[1], y, "_"); else if (y === 1 || y === 20) c.px(xs[1], y, "h") }
}
sprite("hedge_w", { base: "hedge" }, round(-1))
sprite("hedge_e", { base: "hedge" }, round(1))
card("hedge", { is: "a hedge, a row of 16x22 tiles: its lit top in leaf clusters, its front 8 px in shade, edged in the green's darkest; hedge_w and hedge_e its rounded ends", cells: { "topdown/16": "✎" },
  vary: { part: "hedge_w, hedge, hedge_e: any width in 16 px" } })

// ---------------------------------------------------------------- what grows and lies on it
// Standing things lit from the upper left, edged in their own darkest (selout), never a black line (topdown16's ink).
// A bush, a tile: lobes of leaves in the field's light, pale clusters of 2 x 2 on their tops, darker clusters low
// and on the right, the green's darkest round it and a warm foot where it meets the ground.
sprite("bush", { pivot: "bottom" }, `
  .....hhh.hhh....
  ...hhvvlhlvvhh..
  ..hlvvllglvvllh.
  .hllllgllllllgh.
  .hlvvlgmglvvlmh.
  hgllvvllmglvvlgh
  hmgllllgmmgllmMh
  hMmglmgMmgmgmMMh
  hMMmgMmMMmMmMMGh
  .hGMMGMMGMMMGGh.
  .oOGhGGOhGGhGOo.
  ..oOOooOOooOOo..`)
card("bush", { is: "a bush, 16x12: lobes of leaves lit with pale clusters on their tops, darker low and on the right, edged in the green's darkest, a warm foot", cells: { "topdown/16": "✎" } })
// A rock sitting in the grass: its top lit near white (s), its side (S), its shade on the lower right (K), edged in
// the stone's darkest (t); its foot flat where it rests, its last row the contact's dark, tufts over its foot
sprite("rock", { pivot: "bottom" }, `
  ....tttttt....
  ..ttssssssSt..
  .tssssssssSSt.
  tssssssssSSKKt
  tSsssssSSSSKKt
  tSSSSSSSSSKKKt
  lSSSSSSSSKKKKv
  gltSSSSSKKKKtl
  MgttttttttttgM`)
card("rock", { is: "a rock, 14x9: a low oval sitting in the grass, its top lit near white, its lower right in shade, edged in the stone's darkest, its foot flat, tufts over it", cells: { "topdown/16": "✎" } })
// A stump: its cut top seen from above (its rings), its bark round it lit on the left, grass tufts at its foot
sprite("stump", { pivot: "bottom" }, `
  ...xxxxxxxx...
  ..xwwwwwwwwx..
  .xwwWWWWWWwwx.
  .xwWwwwwwwWwx.
  .xwWwWWWWwWwx.
  .xwWwwwwwwWwx.
  .xwwWWWWWWwwx.
  ..xwwwwwwwwx..
  .OxxxxxxxxxxO.
  .ooOoooooOoOO.
  .oooOooooOooO.
  vlooOoooOoOOlv
  lmloOoOOoOOMml
  .mlzOOOOOOzlm.`)
card("stump", { is: "a stump, 14x14: its cut top seen from above with its rings, its bark lit on the left, tufts at its foot", cells: { "topdown/16": "✎" } })

Object.assign(island, { shore: band })
}
