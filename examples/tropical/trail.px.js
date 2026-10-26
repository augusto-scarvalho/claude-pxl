// The trail's tileset, drawn here: the 16 corner pieces of a dirt terrain from one function, after
// the look of LPC terrains (a streaky worn fill, a darker rim, a ragged edge that frays into the
// grass in loose crumbs). Corner bits: 1 top-left, 2 top-right, 4 bottom-left, 8 bottom-right; a
// set bit is dirt. tilemap({ corners, map: "dirt_" }) picks dirt_<mask>.
use("palette.hex")
const DT = 16
// one hash per pixel and variant; every piece of a variant shares it, so fill and edges match
const dhash = (x, y, k) => { const v = Math.sin(x * 12.9898 + y * 78.233 + k * 37.719) * 43758.5453; return v - Math.floor(v) }

// The fill: light dirt with short streaks running across, darker (packed) and lighter (worn).
const streak = (x, y, k, len, odds) => {
  for (let d = 0; d < len; d++) if (dhash((x - d + DT) % DT, y, k) < odds) return true
  return false
}
const dirtFill = (x, y, v) => (streak(x, y, v * 7 + 1, 3, 0.09) ? "o" : streak(x, y, v * 7 + 2, 3, 0.045) ? "A" : "a")

// how much dirt (f): the corners blended with an eased step (smooth), so the edge curves between them;
// three variants of every piece, picked at random per tile, so the fill never repeats as a grid
corners("dirt", { size: DT, variants: 3, smooth: true }, (x, y, f, v) => {
  const e = f + (dhash(x, y, v * 7) - 0.5) * 0.24          // ragged, not a clean curve
  if (e < 0.3) return e > 0.18 && dhash(x, y, v * 7 + 3) < 0.3 ? (dhash(x, y, v * 7 + 4) < 0.5 ? "O" : "Q") : null   // crumbs scattered into the grass
  return e < 0.33 ? "Q" : e < 0.38 ? "O" : e < 0.46 ? "o" : dirtFill(x, y, v)
})

scene("trail_tiles", { w: 112, h: 80, bg: "g" }, tilemap(`
  ........
  .##.....
  ..##....
  ...####.
  ..####..
  ........`, { corners: "#", size: DT, map: "dirt_", x: -8, y: -8 }))
