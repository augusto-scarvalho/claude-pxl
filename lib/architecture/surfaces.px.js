// Surfaces: tiles 16 texels a side, for floors and walls laid a texel to a pixel (a perspective()
// camera's floor and wall texel), and blocks in meters for mesh(): cobbles, an ashlar wall, planks, and
// surfaces.block(m, top, side, x0, z0, x1, z1, u0, u1). For any scene:
// include("<path>/lib/architecture/surfaces.px.js", { as: "surfaces" }), its palette its own: the HD-2D
// profile (lib/profiles/hd2d.px.js) gives a scene the same keys, 1-4 the cobbles', 5-8 the wall's.
include("../styles/nature.px.js", { palette: true })   // the planks' wood: asdf
shades("1234", "#8d8070")   // cobbles: the gaps, the stones, their lit edges
shades("5678", "#857467")   // the wall's stone and its mortar
const surfaces = {}
// in a block: its names stay its own when a scene includes the file
{
// Cobbles: rows of stones h px tall over a 1 px gap, each row's stones of its own widths (the tile's
// width in all, so it tiles) and each row moved `shift` px on, their corners softened, lit on their
// upper left edges, a stone in five a shade off.
const cobbles = (rows, shift, h = 3) => (c) => rows.forEach((ws, r) => {
  let x = (r * shift) % c.w
  ws.forEach((w, s) => {
    const tone = Math.floor(hash(r, s) * 5) === 0 ? "2" : "3"
    for (let i = 0; i < w; i++) for (let j = 0; j <= h; j++) {
      const X = (x + i) % c.w, Y = r * (h + 1) + j
      // the gaps, the stone's lower right corner rounded into them, its upper left edges lit
      const gap = j === h || i === w - 1 || (i === w - 2 && j === h - 1)
      c.px(X, Y, gap ? "1" : i === 0 && j === 0 ? tone : j === 0 || i === 0 ? "4" : tone)
    }
    x += w
  })
})
sprite("_cobble", { w: 16, h: 16 }, cobbles([[5, 5, 6], [6, 5, 5], [4, 6, 6], [5, 6, 5]], 3))
card("_cobble", { is: "cobbles: rows of stones 3 px tall over a 1 px gap, lit on their upper left edges; a tile 16 texels a side", cells: { "hd2d/24ppm": "✓" } })
// The same stones about 1.5 times as big, for a floor laid a texel to a pixel (texel: "screen"; at 24 px
// to the meter a 16-to-the-meter texel is 1.5 px, so _cobble's stones come out 7 and 9 px wide by turns):
// 5 to 8 px wide and 4 tall, as drawn, no joint nearer than 3 px to one in the next row.
sprite("_cobble_big", { w: 24, h: 20 }, cobbles([[8, 7, 9], [8, 9, 7], [7, 9, 8], [6, 9, 9]], 4, 4))
card("_cobble_big", { is: "cobbles as _cobble's, about 1.5 times as big, for a floor laid texel: \"screen\": rows of stones 4 px tall and 5 to 8 wide over a 1 px gap, lit on their upper left edges; a tile 24x20 texels", cells: { "hd2d/24ppm": "✓" } })
// Ashlar: blocks 7x3 over 1 px of mortar, every other course moved half a block.
sprite("_wall", { w: 16, h: 16 }, (c) => {
  for (let Y = 0; Y < 16; Y++) for (let X = 0; X < 16; X++) {
    const r = Y >> 2, x = (X + (r % 2) * 4) % 8, j = Y % 4
    c.px(X, Y, j === 3 || x === 7 ? "6" : j === 0 ? "8" : j === 2 ? "5" : Math.floor(hash(r, (X + (r % 2) * 4) >> 3) * 4) ? "7" : "6")
  }
})
card("_wall", { is: "an ashlar wall: blocks 7x3 over 1 px of mortar, every other course moved half a block; a tile 16 texels a side", cells: { "hd2d/24ppm": "✓" } })
// Planks running across, a dark seam under each, nail heads at the ends.
sprite("_planks", { w: 16, h: 16 }, (c) => {
  for (let Y = 0; Y < 16; Y++) for (let X = 0; X < 16; X++)
    c.px(X, Y, Y % 4 === 3 ? "a" : (X === 1 || X === 14) && Y % 4 === 1 ? "a" : Y % 4 === 0 ? "f" : "d")
})
card("_planks", { is: "planks running across, a dark seam under each, nail heads at the ends; a tile 16 texels a side", cells: { "hd2d/24ppm": "✓" } })
// A block into model m, from (x0, z0) to (x1, z1), u0 to u1 m up: its top of one material, its sides of another.
surfaces.block = (m, top, side, x0, z0, x1, z1, u0, u1) => m.prism(top, side, [[x0, z0], [x1, z0], [x1, z1], [x0, z1]], u0, u1)
}
