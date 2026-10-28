// The tree species of lib/nature/trees.px.js (make3d.momiji, .ginkgo, .oak, ... on one way to grow a
// tree), to look at. A scene takes them from the lib file, which draws none of these.
include("../../lib/nature/trees.px.js")

// ---------------------------------------------------------------- the species, to look at
// `trees`: a contact sheet, a row a species in its seasons at 20 px to the meter (40 to 60 px tall, as a
// game shows them), lit from the upper left in front, and far at 8; the momiji in its three autumn
// colors; the momiji and the palm turned a quarter (they are 3D: any heading). `trees_grove`: a mixed
// autumn grove seen from above, as a top-down game lays it (sprites sorted by their feet, a shadow under
// each); `trees_row`: one of each from the side, as a side-scroller's background, at 12 px to the meter.
{
const LOOK = { view: "side", ppm: 20, mats: trees.mats, surface: trees.look, light: [-0.6, -0.5, 0.65], headings: ["s"] }
// each species: its height on the sheet, a seed, and its cells: [label, season, color?]
const SHEET = {
  momiji: [2.6, 2, [["spring", "spring"], ["summer", "summer"], ["autumn", "autumn", 0], ["bare", "bare"], ["orange", "autumn", 1], ["gold", "autumn", 2]]],
  ginkgo: [4.5, 3, [["spring", "spring"], ["summer", "summer"], ["autumn", "autumn"], ["bare", "bare"]]],
  kuromatsu: [2.6, 4, [["evergreen", "summer"]]],
  oak: [2.8, 2, [["spring", "spring"], ["summer", "summer"], ["autumn", "autumn"], ["bare", "bare"]]],
  birch: [3, 2, [["spring", "spring"], ["summer", "summer"], ["autumn", "autumn"], ["bare", "bare"]]],
  willow: [2.6, 2, [["spring", "spring"], ["summer", "summer"], ["autumn", "autumn"], ["bare", "bare"]]],
  sakura: [2.6, 2, [["blossom", "spring"], ["summer", "summer"], ["autumn", "autumn"], ["bare", "bare"]]],
  cypress: [3.6, 2, [["evergreen", "summer"]]],
  acacia: [2.6, 2, [["rains", "summer"], ["dry", "autumn"]]],
  baobab: [2.8, 2, [["rains", "summer"], ["dry", "bare"]]],
  palm: [3, 2, [["evergreen", "summer"]]],
}
const CW = 120, CH = 100, DRAW = { mats: trees.mats, ...trees.look, light: LOOK.light, view: "side" }
// each row's cells: [label, the tree, px to the meter]; the momiji and the palm (its coconuts under the
// crown) turned a quarter too; last, far, in its first season
const rows = Object.entries(SHEET).map(([sp, [height, seed, cs]]) => {
  const tree = (season, color = 0) => make3d[sp]({ height, seed, season, color }).field
  const row = cs.map(([label, season, color]) => [label, tree(season, color), 20])
  if (sp === "momiji" || sp === "palm") row.push(["turned 90", tree(sp === "momiji" ? "autumn" : "summer").rotate(90), 20])
  return [...row, ["far", tree(cs[0][1], cs[0][2]), 8]]
})
// drawn in place, not as sprites: a check builds every sprite of a file (46 trees, 30 s), and the grove
// and the row below, which it checks, have every species
scene("trees", { w: 46 + 8 * (CW + 2), h: 4 + rows.length * (CH + 2), bg: "#cdc3b0", check: false },
  ...rows.flatMap((row, r) => [text(2, 2 + r * (CH + 2) + CH / 2 - 2, Object.keys(SHEET)[r], "#4a4048"), ...row.flatMap(([label, tree, ppm], c) => {
    const x = 46 + c * (CW + 2), y = 2 + r * (CH + 2)
    return [surface(tree, { ...DRAW, ppm, at: [x + CW / 2, y + CH - 3] }), text(x + 3, y + 3, label, "#4a4048")]
  })]))

/// an autumn grove from above: where each stands (its foot, x, y), sorted by their feet; a shadow on
// the grass
const GROVE = [["cypress", 22, 80], ["oak", 78, 72], ["birch", 140, 64], ["sakura", 204, 82], ["willow", 42, 148], ["birch", 108, 126], ["momiji", 162, 166], ["cypress", 236, 150]]
for (const sp of new Set(GROVE.map(([sp]) => sp))) turnaround(`_tr_${sp}_grove`, make3d[sp]({ height: SHEET[sp][0], seed: SHEET[sp][1], season: "autumn" in trees.species[sp].leaves ? "autumn" : "summer" }), LOOK)
scene("trees_grove", { w: 256, h: 176, bg: "#6e8a46" },
  ...GROVE.map(([sp, x, y]) => ellipse(x + 5, y - 1, sp === "cypress" ? 6 : 16, 5, "#56703a")),
  layer("trees", { sort: "y" }, ...GROVE.map(([sp, x, y]) => stamp(`_tr_${sp}_grove_s`, x, y))))

// a row from the side, as a side-scroller's background: one of each, at 12 px to the meter, 10 degrees down
const ROW = ["cypress", "oak", "birch", "willow", "sakura", "momiji", "ginkgo", "kuromatsu", "acacia", "baobab", "palm"]
for (const sp of ROW) turnaround(`_tr_${sp}_row`, make3d[sp]({ height: SHEET[sp][0], seed: SHEET[sp][1], season: SHEET[sp][2][0][1] }), { ...LOOK, ppm: 12, view: { kind: "side", pitch: 10 } })
scene("trees_row", { w: 8 + ROW.length * 54, h: 80, bg: "#b8c8d0" },
  rect(0, 66, 8 + ROW.length * 54, 14, "#6e7a46"), ...ROW.map((sp, i) => stamp(`_tr_${sp}_row_s`, 30 + i * 54, 68)))
}
