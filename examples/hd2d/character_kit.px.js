// The character kit (lib/characters/kit.px.js): twelve people made from specs alone, on the four bodies (the traveler's,
// the dwarf, the tall one, the beast-headed one), the pieces mixed (no two wearing the same set), each its own colors;
// each standing in the four diagonals a tactics game shows (sw, se, nw, ne). A draft for the owner's eyes.
// The second scene is the kit's own check that a figure's cell holds what it wears: every body with every drape (a
// cloak, a coat's tails, a long skirt, an apron; the beast's tail) in the five drawn directions, and `pxl check` says
// where a figure touches its cell's edge (a pixel inside its margin); the third the same for every headwear on every
// body whose head it fits; the fourth for what the hands hold and the back carries.
include("../../lib/characters/kit.px.js", { as: "kit", palette: true })
const TWELVE = [
  ["aldo", { hair: "tousled", torso: "shirt", over: "vest", legs: "canvas", feet: "boots", belt: "belt", colors: { over: "red", torso: "navy", legs: "brown", hair: "dark" } }],
  ["mira", { hair: "bun", torso: "chemise", over: "bodice", legs: "skirt", feet: "shoes", colors: { over: "teal", legs: "plum", hair: "auburn", skin: "tan" } }],
  ["oswin", { hair: "tied", torso: "shirt", over: "coat", legs: "breeches", feet: "highboots", colors: { over: "green", metal: "silver", hair: "grey" } }],
  ["bruni", { body: "short", hair: "ring", beard: "full", torso: "smock", legs: "canvas", feet: "boots", arms: "rolledup", apron: "apron", colors: { torso: "rust", apron: "black", hair: "ginger", skin: "tan" } }],
  ["hilde", { body: "short", hair: "braid", torso: "shirt", over: "bodice", legs: "skirt", feet: "boots", colors: { over: "olive", legs: "navy", hair: "blond" } }],
  ["orm", { body: "short", hair: "flatcap", beard: "full", torso: "tunic", legs: "trousers", feet: "boots", belt: "belt", cloak: "travel", colors: { torso: "tweed", hat: "olive", cloak: "rust", hair: "grey" } }],
  ["sela", { body: "tall", hair: "bandana", torso: "stripes", legs: "rolled", feet: "bare", arms: "rolledup", colors: { trim: "red", hat: "navy", hair: "dark", skin: "brown" } }],
  ["talan", { body: "tall", hair: "tousled", torso: "shirt", over: "coat", legs: "trousers", feet: "boots", colors: { over: "plum", legs: "black", metal: "gold", hair: "black", skin: "deep" } }],
  ["ione", { body: "tall", hair: "bun", torso: "tunic", legs: "skirt", feet: "shoes", belt: "belt", colors: { torso: "white", legs: "green", belt: "black", hair: "blond" } }],
  ["grauwolf", { body: "beast", torso: "shirt", over: "vest", legs: "trousers", feet: "boots", belt: "belt", colors: { over: "mustard", torso: "linen", fur: "grey" } }],
  ["rusk", { body: "beast", torso: "smock", legs: "rolled", feet: "bare", arms: "rolledup", apron: "apron", colors: { torso: "red", fur: "black" } }],
  ["fenn", { body: "beast", torso: "tunic", legs: "breeches", feet: "highboots", belt: "belt", cloak: "travel", colors: { torso: "teal", cloak: "navy", fur: "red" } }],
]
for (const [name, spec] of TWELVE) kit.character(name, spec)
// four people a row, each in sw, se, nw, ne, their feet on one line, on a mid grey
const DIAG = ["sw", "se", "nw", "ne"], CW = 24, RH = 60
scene("character_kit", { w: 4 * 4 * CW + 8, h: 3 * RH + 12, bg: "#7a7a80" },
  ...TWELVE.flatMap(([name], i) => DIAG.map((d, k) => stamp(`${name}_stand_${d}`, 4 + ((i % 4) * 4 + k) * CW + CW / 2, Math.floor(i / 4) * RH + RH - 2))),
  text(4, 3 * RH + 4, "TWELVE PEOPLE MIXED FROM SPECS: SW SE NW NE (A DRAFT)", "k"))
// every body with every drape, alone on the bare mannequin (and what it needs), in the five drawn directions (the
// other three their mirrors): each figure stamped in its cell's box, the rule that every pixel of it is inside the box
// less a pixel all round
const DRAPES = { cloak: { cloak: "travel" }, coat: { over: "coat" }, skirt: { legs: "skirt" }, apron: { torso: "smock", apron: "apron" } }
const DIRS = ["s", "sw", "w", "nw", "n"], boxes = []
for (const b of Object.keys(kit.BODIES)) for (const [d, s] of Object.entries(DRAPES)) {
  const { cell } = kit.character(`cell_${b}_${d}`, { body: b, outfit: "bare", hair: "none", ...s, dirs: DIRS })
  boxes.push([`cell_${b}_${d}`, cell])
}
const CX = 40, CY = 64, at = (i, k) => [4 + k * CX + 20, 4 + i * CY + 54]
scene("character_kit_cells", { w: DIRS.length * CX + 8, h: boxes.length * CY + 8, bg: "#7a7a80",
  expect: boxes.flatMap(([n, c], i) => DIRS.map((d, k) => { const [x, y] = at(i, k); return { inside: [`${n}_${d}`, [x - c.pivot[0] + 1, y - c.pivot[1] + 1, c.w - 2, c.h - 2]] } })) },
  ...boxes.flatMap(([n], i) => DIRS.map((d, k) => stamp(`${n}_stand_${d}`, ...at(i, k), { id: `${n}_${d}` }))))
// and every headwear (kit.HATS) on every body whose head it fits, the bare mannequin under it: the cell holds a brim, a
// pointed hat's tip, a hood's cowl
const hats = []
for (const b of Object.keys(kit.BODIES)) for (const [k, P] of Object.entries(kit.HATS)) if (P.fits.head.includes(kit.BODIES[b].head ?? "human")) {
  const { cell } = kit.character(`hw_${b}_${k}`, { body: b, outfit: "bare", hair: "none", headwear: k, dirs: DIRS })
  hats.push([`hw_${b}_${k}`, cell])
}
scene("character_kit_headwear", { w: DIRS.length * CX + 8, h: hats.length * CY + 8, bg: "#7a7a80",
  expect: hats.flatMap(([n, c], i) => DIRS.map((d, k) => { const [x, y] = at(i, k); return { inside: [`${n}_${d}`, [x - c.pivot[0] + 1, y - c.pivot[1] + 1, c.w - 2, c.h - 2]] } })) },
  ...hats.flatMap(([n], i) => DIRS.map((d, k) => stamp(`${n}_stand_${d}`, ...at(i, k), { id: `${n}_${d}` }))))
// and what the hands hold and the back carries (kit.THINGS), the longest and widest on every body in the eight
// directions (a figure carrying something is drawn in each, none the mirror of another): a spear and a tall shield, a
// quarterstaff and a pack, a bow and a quiver, a mage's staff and a lantern
const DIRS8 = ["s", "sw", "w", "nw", "n", "ne", "e", "se"], LOADS = { spear: { held: "spear", off: "tallshield", hip: "scabbard" }, staff: { held: "quarterstaff", back: "pack" },
  bow: { off: "bow", back: "quiver" }, mage: { held: "magestaff", off: "lantern", hip: "pouch" } }, held = []
for (const b of Object.keys(kit.BODIES)) for (const [k, s] of Object.entries(LOADS)) {
  const { cell } = kit.character(`th_${b}_${k}`, { body: b, outfit: "bare", hair: "none", ...s })
  held.push([`th_${b}_${k}`, cell])
}
const TX = 40, TY = 76, tat = (i, k) => [4 + k * TX + 20, 4 + i * TY + 70]
scene("character_kit_held", { w: DIRS8.length * TX + 8, h: held.length * TY + 8, bg: "#7a7a80",
  expect: held.flatMap(([n, c], i) => DIRS8.map((d, k) => { const [x, y] = tat(i, k); return { inside: [`${n}_${d}`, [x - c.pivot[0] + 1, y - c.pivot[1] + 1, c.w - 2, c.h - 2]] } })) },
  ...held.flatMap(([n], i) => DIRS8.map((d, k) => stamp(`${n}_stand_${d}`, ...tat(i, k), { id: `${n}_${d}` }))))
