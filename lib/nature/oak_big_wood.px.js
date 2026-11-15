// oak_big's trunk: the recipe of frozen/oak_big_wood.png, which side.px.js's oak_big stamps as it is (the side kit
// includes no tree kit: its load would pay for it). Kept here as a frozen cell of that PNG, so pxl check renders the
// recipe and says when the PNG and the code part ways. Not an entry to draw with: take oak_big from side.px.js.
// trees.px.js's oak grown for oak_big's box (forking low into five limbs), bare, seed 7, no wind; four sdf roots
// flaring along the ground (capsules 0.26 to 0.08 m thick from 0.45 m up, out 0.95, 1, 0.7 and 0.7 m at 195, -15, 95
// and 270 degrees), joined smooth and cut level at the ground; drawn side on at 124 / 7 px a m in the bark (its line
// e, 3 tones), lit [-0.75, -0.6, 0.3]; side.px.js's colors.
include("trees.px.js", { as: "trees" })
pal({ R: "#1f4636", K: "#2e6a38", M: "#4f9a3c", L: "#97cd55", T: "#eef08a", e: "#3a2420", w: "#6b4430", W: "#9c6a40" })
ramps("RKMLT", "ewW")
// in a block: its names stay its own when a scene includes the file
{
const BIG = { ...trees.species.oak, fork: 0.2, r: 0.34, limbs: 5, rise: [1.0, 0.6, 0.45], len: [0.2], spread: 0.75, kink: 0.45 }
make3d.define("oak_set", (o) => trees.grow(BIG, o), trees.params(BIG))
const ROOTS = sdf.union([[195, 0.95], [-15, 1.0], [95, 0.7], [270, 0.7]].map(([az, l]) => {
  const a = (az * Math.PI) / 180
  return sdf.capsule([0, 0, 0.45], [l * Math.cos(a), l * Math.sin(a), 0.03], 0.26, 0.08)
})).mat("bark")
const WOOD = make3d.oak_set({ season: "bare", seed: 7, wind: 0 }).field.union(ROOTS, { smooth: 0.15 }).intersect(sdf.plane([0, 0, -1], 0))
turnaround("_oak_big_wood_live", WOOD, { view: "side", ppm: 124 / 7, headings: ["s"], mats: { bark: "ewW" }, light: [-0.75, -0.6, 0.3], surface: { soft: 0, rim: 0.3, ink: "e", tones: 3 } })
sprite("_oak_big_wood", { png: "frozen/oak_big_wood.png", frozen: "_oak_big_wood_live_s" })
}
