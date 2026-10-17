// The trail's tileset, drawn here: the 16 corner pieces of a dirt terrain from one function, after
// the look of LPC terrains (a streaky worn fill, a darker rim, a ragged edge that frays into the
// grass in loose crumbs). Corner bits: 1 top-left, 2 top-right, 4 bottom-left, 8 bottom-right; a
// set bit is dirt. tilemap({ corners, map: "dirt_" }) picks dirt_<mask>.
use("palette.hex")
const DT = 16
const dstep = (t) => t * t * (3 - 2 * t)
// one hash per pixel and variant; every piece of a variant shares it, so fill and edges match
const dhash = (x, y, k) => { const v = Math.sin(x * 12.9898 + y * 78.233 + k * 37.719) * 43758.5453; return v - Math.floor(v) }

// The fill: light dirt with short streaks running across, darker (packed) and lighter (worn).
const streak = (x, y, k, len, odds) => {
  for (let d = 0; d < len; d++) if (dhash((x - d + DT) % DT, y, k) < odds) return true
  return false
}
const dirtFill = (x, y, v) => (streak(x, y, v * 7 + 1, 3, 0.09) ? "o" : streak(x, y, v * 7 + 2, 3, 0.045) ? "A" : "a")

const dirtTile = (m, v) => (c) => {
  for (let y = 0; y < DT; y++) for (let x = 0; x < DT; x++) {
    // how much dirt: the corners blended with a dstep step, so the edge curves between them
    const u = dstep((x + 0.5) / DT), w = dstep((y + 0.5) / DT)
    const f = (m & 1) * (1 - u) * (1 - w) + ((m >> 1) & 1) * u * (1 - w) + ((m >> 2) & 1) * (1 - u) * w + ((m >> 3) & 1) * u * w
    const e = f + (dhash(x, y, v * 7) - 0.5) * 0.24          // ragged, not a clean curve
    if (e < 0.3) {                                          // crumbs scattered into the grass
      if (e > 0.18 && dhash(x, y, v * 7 + 3) < 0.3) c.px(x, y, dhash(x, y, v * 7 + 4) < 0.5 ? "O" : "Q")
    } else c.px(x, y, e < 0.33 ? "Q" : e < 0.38 ? "O" : e < 0.46 ? "o" : dirtFill(x, y, v))
  }
}
// three variants of every piece, picked at random per tile, so the fill never repeats as a grid
for (let m = 1; m < 16; m++) {
  for (const v of [0, 1, 2]) sprite(`dirt_${m}_${v}`, { w: DT, h: DT }, dirtTile(m, v))
  group("dirt_" + m, [0, 1, 2].map((v) => `dirt_${m}_${v}`))
}

scene("trail_tiles", { w: 112, h: 80, bg: "g" }, tilemap(`
  ........
  .##.....
  ..##....
  ...####.
  ..####..
  ........`, { corners: "#", size: DT, map: "dirt_", x: -8, y: -8 }))
