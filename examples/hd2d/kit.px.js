// HD-2D kit: what the hd2d scenes share (plaza.px.js, graveyard.px.js), taken with
// include("kit.px.js", { palette: true }): the nature kit (grass, pines, bushes, rocks, walls, paths;
// ../nature/kit.px.js), cobbles, an ashlar wall, planks and a lamp, and blocks in meters. The camera
// high up through a long lens is the DSL's: perspective({ w, h, pitch, fov, ppm }).
include("../nature/kit.px.js", { palette: true })
pal({ k: "#1a1620" })
shades("1234", "#8d8070")   // cobbles: the gaps, the stones, their lit edges
shades("5678", "#857467")   // the wall's stone and its mortar
pal({ y: "#fff3c4", Y: "#ffd27a" })   // a lamp's glass: brighter than anything lit, for the bloom

// Cobbles: rows of stones 3 px tall over a 1 px gap, each row's stones of its own widths (16 in all,
// so it tiles), their corners softened, lit on their upper left edges, a stone in five a shade off.
sprite("_cobble", { w: 16, h: 16 }, (c) => {
  ;[[5, 5, 6], [6, 5, 5], [4, 6, 6], [5, 6, 5]].forEach((ws, r) => {
    let x = (r * 3) % 16
    ws.forEach((w, s) => {
      const tone = Math.floor(hash(r, s) * 5) === 0 ? "2" : "3"
      for (let i = 0; i < w; i++) for (let j = 0; j < 4; j++) {
        const X = (x + i) % 16, Y = r * 4 + j
        // the gaps, the stone's lower right corner rounded into them, its upper left edges lit
        const gap = j === 3 || i === w - 1 || (i === w - 2 && j === 2)
        c.px(X, Y, gap ? "1" : i === 0 && j === 0 ? tone : j === 0 || i === 0 ? "4" : tone)
      }
      x += w
    })
  })
})
// Ashlar: blocks 7x3 over 1 px of mortar, every other course moved half a block.
sprite("_wall", { w: 16, h: 16 }, (c) => {
  for (let Y = 0; Y < 16; Y++) for (let X = 0; X < 16; X++) {
    const r = Y >> 2, x = (X + (r % 2) * 4) % 8, j = Y % 4
    c.px(X, Y, j === 3 || x === 7 ? "6" : j === 0 ? "8" : j === 2 ? "5" : Math.floor(hash(r, (X + (r % 2) * 4) >> 3) * 4) ? "7" : "6")
  }
})
// Planks running across, a dark seam under each, nail heads at the ends.
sprite("_planks", { w: 16, h: 16 }, (c) => {
  for (let Y = 0; Y < 16; Y++) for (let X = 0; X < 16; X++)
    c.px(X, Y, Y % 4 === 3 ? "a" : (X === 1 || X === 14) && Y % 4 === 1 ? "a" : Y % 4 === 0 ? "f" : "d")
})
// A lamp: a pole of dark iron, a lantern of glass on top under a cap.
sprite("_lamp", { w: 7, h: 30, pivot: "bottom" }, rect(3, 8, 1, 22, "k"), rect(1, 28, 5, 2, "k"),
  rect(1, 1, 5, 1, "k"), rect(1, 2, 5, 5, "Y"), rect(2, 3, 3, 3, "y"), rect(0, 7, 7, 1, "k"))

// A block into model m, from (x0, z0) to (x1, z1), u0 to u1 m up: its top of one material, its sides of another.
const hd2dBlock = (m, top, side, x0, z0, x1, z1, u0, u1) => {
  m.face(top, [x0, z0, u1], [x1, z0, u1], [x1, z1, u1], [x0, z1, u1])
  for (const [a, b] of [[[x0, z0], [x1, z0]], [[x0, z1], [x1, z1]], [[x0, z0], [x0, z1]], [[x1, z0], [x1, z1]]])
    m.face(side, [...a, u0], [...b, u0], [...b, u1], [...a, u1])
}
