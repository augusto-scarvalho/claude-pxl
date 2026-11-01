// The two villagers at 48 px for top-down 32 (topdown32), the 24 px villager and elder (villagers.px.js) redrawn on
// the genre's slim body by hero32.character(name, { hair, retouch, outfit, swap }): the hero's body, moves and face,
// each with a hair model, a head painted by hand over its bake (views(), held to the hero's skull row by row), an
// outfit and colors of their own, so they are other people, not recolors. The villager: a young woman, long fair
// hair parted in the middle and down past her shoulders, a red dress to the ankles with a brown belt. The elder: an
// old man, bald with a grey ring of hair and a beard, a long brown robe tied with a green sash, grey boots. Each
// idles and walks facing down, up and to the side (the game flips the side): villager32_idle_down, ... For any scene:
// include("<path>/lib/characters/villagers32.px.js", { as: "villagers32" }).
include("hero32.px.js", { as: "hero32", palette: true })
// in a block: its names stay its own when a scene includes the file
{
const { character, ROBE32, R31 } = hero32, DIRS = (n) => ["idle", "walk"].flatMap((m) => ["down", "up", "side"].map((d) => `${n}_${m}_${d}`))

// ---------------------------------------------------------------- the villager
// the hair: the hero's cap and nape, its sides and back down past the shoulders, parted in the middle, two short locks
// swept aside over the brow
const LONG = sdf.ellipsoid([4.35, 4.6, 3.9]).at(0, -0.5, 1.5).union(sdf.ellipsoid([3.4, 2.2, 2.6]).at(0, -2.9, -1.2), { smooth: 0.9 })
  .union(sdf.ellipsoid([4.1, 2.8, 5.0]).at(0, -2.4, -3.0), sdf.capsule([-3.9, -0.4, 1], [-3.8, -1.2, -6.0], 0.9, 1.0), sdf.capsule([3.9, -0.4, 1], [3.8, -1.2, -6.0], 0.9, 1.0), { smooth: 1 })
  .subtract(sdf.ellipsoid([4.2, 4.3, 4.2]).at(0, 3.7, -0.9), sdf.capsule([0, 4, 4], [0, -1.4, 5], 0.35), { smooth: 0.35 })
  .union(sdf.capsule([-1.5, 3.2, 3.7], [-2.7, 4.0, 2.5], 0.6, 0.35), sdf.capsule([1.5, 3.2, 3.7], [2.7, 4.0, 2.5], 0.6, 0.35), { smooth: 0.45 })
  .noise({ amp: 0.25, scale: 1.2, seed: 8 }).mat("jhYL")
// her head painted by hand over its bake, row by row on R31's grid (the hero's face: his eyes, nose and chin; the hair
// framing it down both sides past the chin facing us, down her back in profile, in strands from the parting behind),
// the face's own line where the hair covers it taken into the hair's shade
const VRETOUCH = {
  s: R31({
    7: [13, "kkkkk"],
    8: [11, "kkLLjLLkk"],
    9: [10, "khLLLjLLLYk"],
    10: [9, "khYLLLjLLLYhk"],
    11: [9, "khYYLYjYLLYhk"],
    12: [8, "khYYjYYjYYjYhk"],
    13: [8, "khYjYYhjhYYjYhk"],
    14: [8, "khjhjhsSshjhjhk"],
    15: [8, "kYhskkssskkshYk"],
    16: [8, "khzsWkssskWszhk"],
    17: [8, "khzssssSsssszhk"],
    18: [8, "kYhsssszsssshYk"],
    19: [8, "kYYhzssssszhYYk"],
    20: [8, "kYYYYzzzzzYYYYk"],
    21: [8, "kYYYh_____hYYYk"],
    22: [8, "khYYh_____hYYhk"],
    23: [9, "khhk_____khhk"],
    24: [10, "kk_______kk"],
  }),
  w: R31({
    7: [12, "kkkkk"],
    8: [10, "kkhLLLYkk"],
    9: [9, "khLLLjLLYhk"],
    10: [9, "kYLLjYLLYYhk"],
    11: [9, "kYYjYYLLjYYhk"],
    12: [9, "kYjYYYjYYYjYhk"],
    13: [9, "khjjYjYYjYYjhk"],
    14: [9, "ksjjjhYYjYYjYhk"],
    15: [9, "kskksssshYjYYhk"],
    16: [9, "kskWssszshjYYhk"],
    17: [9, "SsssssszshjYYhk"],
    18: [9, "ksssssszhhjYYhk"],
    19: [9, "kzsssszhhjYYhk"],
    20: [10, "kzzzzkhhjYhhk"],
    21: [16, "khjYhhk"],
    22: [16, "khjhhjk"],
    23: [17, "khhjk"],
    24: [18, "kkk"],
  }),
  n: R31({
    7: [14, "kkk"],
    8: [11, "kkhLjLhkk"],
    9: [10, "khYLLjLLYhk"],
    10: [9, "khYLLYjYLLYhk"],
    11: [9, "khYjYYjYYjYhk"],
    12: [8, "khYjYYYjYYYjYhk"],
    13: [8, "khYjYYhjhYYjYhk"],
    14: [8, "khjYYhhjhhYYjhk"],
    15: [8, "khjYhhjjjhhYjhk"],
    16: [8, "khjYhjhjhjhYjhk"],
    17: [8, "khjhhjhjhjhhjhk"],
    18: [8, "khjhhjhjhjhhjhk"],
    19: [8, "khjhhjhjhjhhjhk"],
    20: [8, "khjhhjhjhjhhjhk"],
    21: [8, "khjhhjhjhjhhjhk"],
    22: [8, "kjhhjhhjhhjhhjk"],
    23: [8, "kjhhjhhjhhjhhjk"],
    24: [9, "kjhjhhjhhjhjk"],
    25: [10, "kkjhhjhhjkk"],
    26: [12, "kkkkkkk"],
  }),
}
character("villager32", { hair: LONG, retouch: VRETOUCH, outfit: ROBE32("Dd"),
  swap: { N: "#5a1f2c", n: "#7a2f3a", b: "#b64a52", c: "#e07a74", j: "#6e4a1c", h: "#a8782e", Y: "#d8ac4c", L: "#f2d886" } })
group("villager32", DIRS("villager32"))
card("villager32", { is: "a villager at 48 px, the slim hero's body: a young woman, long fair hair parted in the middle, a red dress to the ankles; idle and walk facing down, up and to the side", cells: { "topdown/32": "✎" },
  vary: { part: "villager32_<idle, walk>_<down, up, side>" } })

// ---------------------------------------------------------------- the elder
// bald: a grey ring of hair round the back of the head over the ears, a beard from the ears round the chin
const RING = sdf.ellipsoid([4.3, 4.65, 4.3]).at(0, -0.5, 0.3).subtract(sdf.ellipsoid([4.9, 5.4, 3.6]).at(0, 0.6, 3.6), sdf.ellipsoid([4.0, 4.2, 4.6]).at(0, 3.6, -1.0), { smooth: 0.5 })
const BEARD = sdf.ellipsoid([2.8, 1.9, 2.6]).at(0, 2.5, -4.4).union(sdf.capsule([-3.0, 1.2, -1.2], [-1.6, 2.6, -4.6], 0.8), sdf.capsule([3.0, 1.2, -1.2], [1.6, 2.6, -4.6], 0.8), { smooth: 0.8 })
const BALD = RING.union(BEARD, { smooth: 0.2 }).noise({ amp: 0.2, scale: 1.5, seed: 2 }).mat("jhYL")
// his head painted by hand over its bake on R31's grid: the bald crown lit, the grey ring round the back of the head
// over the ears, grey brows, the hero's eyes and nose, the beard from the ears round the jaw and down under the chin
// (its chin row the hero's, 20: the beard hangs below it)
const ERETOUCH = {
  s: R31({
    8: [14, "kkk"],
    9: [12, "kkSSSkk"],
    10: [11, "ksSSSSSsk"],
    11: [10, "kssSSSSSssk"],
    12: [9, "kYssSSSSSssYk"],
    13: [9, "kYsssSSSsssYk"],
    14: [9, "kYsLLLsLLLsYk"],
    15: [9, "kYskkssskksYk"],
    16: [9, "kzsWkssskWszk"],
    17: [9, "kYssssSssssYk"],
    18: [9, "kYLssszsssLYk"],
    19: [9, "khYLLLzLLLYhk"],
    20: [9, "khYLLLLLLLYhk"],
    21: [10, "khYLLLLLYhk"],
    22: [10, "kjhYLLLYhjk"],
    23: [11, "kjhYYYhjk"],
    24: [12, "kjhhhjk"],
    25: [13, "kkkkk"],
  }),
  w: R31({
    8: [14, "kkk"],
    9: [12, "kkSSSkk"],
    10: [11, "ksSSSSSsk"],
    11: [10, "ksSSSSSSSsk"],
    12: [9, "kssSSSSSSShYk"],
    13: [9, "ksssSSSSShYYhk"],
    14: [9, "ksLLssssshYjYhk"],
    15: [9, "kskksssshYjYhk"],
    16: [9, "kskWssszshjhhk"],
    17: [9, "SssssssLshjhk"],
    18: [9, "ksssssLLhjhk"],
    19: [9, "kzssLLLLhhk"],
    20: [9, "kLLLLLLLhk"],
    21: [9, "kYLLLLLhk"],
    22: [10, "kYLLLhk"],
    23: [11, "kYYhk"],
    24: [12, "kkk"],
  }),
  n: R31({
    8: [14, "kkk"],
    9: [12, "kkSSSkk"],
    10: [11, "ksSSSSSsk"],
    11: [10, "ksSSSSSSSsk"],
    12: [9, "kssSSSSSSSssk"],
    13: [9, "kYsssSSSsssYk"],
    14: [9, "khYYsssssYYhk"],
    15: [9, "khYLYYsYYLYhk"],
    16: [9, "khjYLYYYLYjhk"],
    17: [9, "khjhYjYjYhjhk"],
    18: [10, "khjhjhjhjhk"],
    19: [10, "kzhhhhhhhzk"],
    20: [11, "kzssssszk"],
  }),
}
character("elder32", { hair: BALD, retouch: ERETOUCH, chin: 20, outfit: ROBE32("QPpq"),
  swap: { j: "#4a4650", h: "#7c7884", Y: "#b4b0b8", L: "#e2dee4", N: "#3a2618", n: "#4a3424", b: "#76563a", c: "#a07c56", Q: "#1f3a1c", P: "#2f5a2c", p: "#4f8a3e", q: "#7cb060", D: "#3a3640", d: "#5e5866", l: "#878090", e: "#b2aab4" } })
group("elder32", DIRS("elder32"))
card("elder32", { is: "a village elder at 48 px, the slim hero's body: an old man, bald, a grey ring of hair and a beard, a long brown robe tied with a green sash; idle and walk facing down, up and to the side", cells: { "topdown/32": "✎" },
  vary: { part: "elder32_<idle, walk>_<down, up, side>" } })
}
