// Reva, the fighting study's original woman fighter (library F1 and the fighting study), as a top-down chibi at a 16
// px grid (topdown16), remade from the hero (lib/characters/hero.px.js) by hero.character() so she shares his view
// (45 degrees), proportions (2.1 heads), moves and face: her own hair, a dark violet bob to the jaw with a straight
// fringe, under a gold headband; her own outfit, a fighter's red vest open over a navy shirt, a gold sash, navy
// trousers, dark shoes; her colors (the fighter's palette: skin, hair, primary, secondary, accent). She idles and walks facing
// down, up and to the side (the game flips the side): reva_idle_down, reva_walk_side, ... For any scene:
// include("<path>/lib/characters/reva.px.js", { as: "reva" }).
include("hero.px.js", { as: "hero", palette: true })
// in a block: its names stay its own when a scene includes the file
{
const { character, PLAIN, SHORT, rows } = hero, MOVES = ["idle", "walk"]
// the bob: the hero's cap grown down the sides and the back to the jaw, the face cut away under the fringe
const BOB = SHORT.union(sdf.ellipsoid([5.0, 4.4, 3.4]).at(0, -0.9, -1.4), { smooth: 0.9 })
  .subtract(sdf.ellipsoid([4.2, 4.3, 4.3]).at(0, 3.7, -2.0), { smooth: 0.3 }).noise({ amp: 0.2, scale: 1.3, seed: 5 }).mat("jhY")
// the headband painted on the baked head (a modeled ring read as a halo from 45 degrees): a gold row across the hair
// near its top, as her own chibi wore it (the fighting study's head), over the hero's brow; its knot at the back
const BAND = ".".repeat(10) + "g".repeat(11) + ".".repeat(10)
const row = (grid, y) => grid.split("\n")[y]
const BROW = { s: rows(31, { 10: BAND, 17: row(hero.BROW.s, 17) }), w: rows(31, { 10: BAND, 16: row(hero.BROW.w, 16) }) }
const STRANDS = { n: rows(31, { 10: ".".repeat(11) + "g".repeat(9) + ".".repeat(11), 11: ".".repeat(14) + "gg" + ".".repeat(15) }) }
// the outfit (dress()'s fields in the hero's keys, recolored by the swap): trousers (P p) to the ankle, dark shoes
// (the leather's keys share the hair's colors: her shoes take its violet), the hips in the trousers, a gold sash, the
// top down to it, its sleeves short: her bare midriff and arms read as a red mouth under the face at 24 px (a feature
// under 2 px, or one that reads as something else, goes: the library lab's floor); the top a red vest (n b c) open
// down the front over a navy shirt (the trousers' P p): a red block under the face, the whole top red, read as a bib
const FIGHTER = { ...PLAIN, legs: (far) => ({ tr: far ? "PPp" : "Ppp", shin: far ? "PPp" : "Ppp", foot: far ? "DDd" : "Ddl" }), cuff: 1,
  skirt: (h, a, out) => (out ? "PPp" : "P"), body: (h, a) => (h < 0.12 ? "g" : Math.abs(a) < 0.32 ? "Ppp" : "nbc"),
  sleeve: (far) => (far ? "nnb" : "nbc") }
character("reva", { hair: BOB, strands: STRANDS, brow: BROW, outfit: FIGHTER, moves: MOVES,
  swap: { z: "#b86a4e", s: "#e09a72", S: "#f6c39a", j: "#1e1630", h: "#3a2a55", Y: "#5e4a80", L: "#8a74b0",
    n: "#5c1a2e", b: "#a8303e", c: "#e0584a", P: "#323e68", p: "#55679a", g: "#f2c95e" } })
group("reva", MOVES.flatMap((m) => ["down", "up", "side"].map((d) => `reva_${m}_${d}`)))
card("reva", { is: "Reva, the fighting study's fighter as a top-down chibi on the hero's body: a dark violet bob under a gold headband, a red vest open over a navy shirt, a gold sash, navy trousers; idle and walk facing down, up and to the side", cells: { "topdown/16": "✓" },
  vary: { part: "reva_<idle, walk>_<down, up, side>" } })
}
