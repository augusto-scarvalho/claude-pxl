// Two villagers for a top-down action game at a 16 px grid (topdown16), made from the hero
// (lib/characters/hero.px.js) by hero.character(name, { hair, outfit, swap, moves }): his body, moves and face,
// each with a hair model, an outfit (dress()'s fields) and colors of their own, so they are other people, not
// recolors (library F5's kit). The villager: a young woman, long fair hair parted in the middle and down past her
// shoulders, a red dress to the ankles. The elder: an old man, bald with a grey ring of hair and a beard, grey brows,
// a long brown robe tied with a green sash (the hero's leather shares his hair's browns, so the elder's boots go grey
// with his hair). Each idles and walks facing down, up and to the side (the game flips
// the side), as the hero does: villager_idle_down, elder_walk_side, ... For any scene:
// include("<path>/lib/characters/villagers.px.js", { as: "villagers" }).
include("hero.px.js", { as: "hero", palette: true })
// in a block: its names stay its own when a scene includes the file
{
const { character, PLAIN, SHORT, rows } = hero, MOVES = ["idle", "walk"]
const DIRS = (n) => MOVES.flatMap((m) => ["down", "up", "side"].map((d) => `${n}_${m}_${d}`))
// a long garment: the tunic down to the ankles, a drape from the waist widening to the hem (dress()'s way, as the
// miko's hakama), its keys the tunic's (n b c); the waist `waist`'s keys
const ROBE = (waist) => ({ ...PLAIN, legs: (far) => ({ tr: far ? "nnb" : "nbc", shin: far ? "nnb" : "nbc", foot: far ? "DDd" : "Ddl" }), cuff: 1,
  drapes: [{ base: "pelvis", top: (j) => j.pelvis[2] + 1.4, len: 6.6, out: "nbc", in: "n", trail: 0.3, keep: () => true, radius: (h) => 3.0 + 1.9 * (1 - h) }],
  body: (h) => (h < 0.1 ? waist : "nbc") })

// ---------------------------------------------------------------- the villager
// the hair parted in the middle, down past the shoulders at the back and sides, the fringe kept short; fair
const LONG = SHORT.union(sdf.ellipsoid([4.0, 2.8, 5.2]).at(0, -2.6, -3.2), sdf.capsule([-3.9, -0.6, 1], [-3.9, -1.4, -5.6], 0.9, 1.0), sdf.capsule([3.9, -0.6, 1], [3.9, -1.4, -5.6], 0.9, 1.0), { smooth: 1 })
  .subtract(sdf.ellipsoid([4.0, 4.2, 4.2]).at(0, 3.8, -2.0), { smooth: 0.3 }).noise({ amp: 0.25, scale: 1.3, seed: 8 }).mat("jhY")
character("villager", { hair: LONG, strands: {}, outfit: ROBE("Dd"), moves: MOVES,
  swap: { n: "#7a2f3a", b: "#b64a52", c: "#e07a74", j: "#6e4a1c", h: "#a8782e", Y: "#d8ac4c", L: "#f2d886" } })
group("villager", DIRS("villager"))
card("villager", { is: "a villager, the hero's body: a young woman, long fair hair parted in the middle, a red dress to the ankles; idle and walk facing down, up and to the side", cells: { "topdown/16": "✓" },
  vary: { part: "villager_<idle, walk>_<down, up, side>" } })

// ---------------------------------------------------------------- the elder
// bald: a grey ring of hair round the back of the head, a beard; no fringe, grey brows (the hair's light) over the eyes
const RING = sdf.ellipsoid([4.75, 4.85, 4.2]).at(0, -0.5, 0.4).subtract(sdf.ellipsoid([5.2, 5.6, 3.6]).at(0, 0.6, 3.8), sdf.ellipsoid([4.2, 4.3, 4.3]).at(0, 3.4, -1.0), { smooth: 0.5 })
const BEARD = sdf.ellipsoid([3.2, 2.0, 2.8]).at(0, 3.0, -3.6).union(sdf.capsule([-2.6, 2.4, -1.6], [-1.6, 3.2, -4.4], 0.8), sdf.capsule([2.6, 2.4, -1.6], [1.6, 3.2, -4.4], 0.8), { smooth: 0.8 })
const BALD = RING.union(BEARD, { smooth: 0.2 }).noise({ amp: 0.2, scale: 1.5, seed: 2 }).mat("jhY")
const BROW_BALD = { s: rows(31, { 17: ".........kssLLsSsLLssk........." }), w: rows(31, { 16: "........kssLLsssssYYsk........." }) }
character("elder", { hair: BALD, strands: {}, brow: BROW_BALD, outfit: ROBE("Ppp"), moves: MOVES,
  swap: { j: "#4a4650", h: "#7c7884", Y: "#b4b0b8", L: "#e2dee4", n: "#4a3424", b: "#76563a", c: "#a07c56", P: "#2f5a2c", p: "#4f8a3e" } })
group("elder", DIRS("elder"))
card("elder", { is: "a village elder, the hero's body: an old man, bald, a grey ring of hair and a beard, a long brown robe tied with a green sash; idle and walk facing down, up and to the side", cells: { "topdown/16": "✓" },
  vary: { part: "elder_<idle, walk>_<down, up, side>" } })
}
