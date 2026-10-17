// The trail's tileset: the scruffy sand terrain of "ZRPG Beach" by Zabin (Zachariah Husiar), built on
// "[LPC] Beach/Desert" by bluecarrot16, Lanea Zimmerman (Sharm), Hyptosis, Guillaume Lecollinet and
// others (full list in refs/CREDITS-beach-desert.txt), CC-BY-SA 3.0,
// https://opengameart.org/content/zrpg-beach. Recoloured as dirt and shrunk 2x to 16px tiles, which
// keeps these tiles CC-BY-SA 3.0 as well.
use("palette.hex")
const ZRPG = "refs/terrain.png"   // ZRPGBeach.png cut to the terrain blocks (x 0-192, y 544-896)
// sand, lightest to darkest, onto the dirt ramp
const DIRT = {
  "#ffe6b9": "A", "#f7f996": "A", "#eec39a": "a", "#e7bb6c": "a",
  "#e8b552": "o", "#d9a066": "o", "#bda455": "o", "#c29e55": "o", "#c0925f": "o",
  "#a9875d": "O", "#96704a": "O", "#8b6f2f": "O", "#8a6f30": "O", "#8f563b": "Q",
}
// LPC terrain pieces, by corner mask. Corner bits: 1 top-left, 2 top-right, 4 bottom-left,
// 8 bottom-right; a set bit is dirt. The outer ring is a 3x3 block, the inner corners a 2x2 block
// around a hole, and the full tiles come from the sand terrain next to it (same colours).
const PIECES = {
  8: [96, 64], 12: [128, 64], 4: [160, 64],
  10: [96, 96], 5: [160, 96],
  2: [96, 128], 3: [128, 128], 1: [160, 128],
  7: [64, 0], 11: [96, 0], 13: [64, 32], 14: [96, 32],
}
const tile = (name, [x, y]) => sprite(name, { png: ZRPG, area: [x, y, 32, 32], shrink: 2 }, recolor(DIRT))
for (const [m, at] of Object.entries(PIECES)) tile("dirt_" + m, at)
for (let i = 0; i < 3; i++) tile("dirt_15" + "abc"[i], [i * 32, 320])
group("dirt_15", ["dirt_15a", "dirt_15b", "dirt_15c"])   // full dirt, 3 variants
// The two diagonal masks are two opposite outer corners laid over each other. (Inner corners made
// the same way, from the two edges they join, drew the edges' dark rims across the dirt.)
const both = (m, a, b) => sprite("dirt_" + m, { w: 16, h: 16 }, stamp("dirt_" + a, 0, 0), stamp("dirt_" + b, 0, 0))
both(9, 1, 8); both(6, 2, 4)
