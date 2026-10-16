// Isometric island: 2:1 blocks (32x16 top face, 8px sides) stacked from a terrain map, with
// props placed in the same back-to-front pass. The iso helpers below are the reusable part.
pal({
  k: "#1c1626",                                                     // ink
  l: "#c8ee88", g: "#8ccf5a", G: "#5aa040", h: "#3c7a3a",           // grass: rim, top, sides
  U: "#e6b884", u: "#c89058", d: "#a8703e", D: "#7e4e30",           // dirt: rim, top, left, right
  I: "#e2e2ec", i: "#b4b4c8", s: "#8e8ea8", S: "#66667e", Z: "#4c4c62", // stone, mortar
  Y: "#fff4c8", y: "#f2dc9c", a: "#d8b874", A: "#ae8c58",           // sand
  f: "#dff8ff", b: "#5cc4ec", B: "#3a92d0", n: "#2a68a8",           // water
  w: "#9a6438", W: "#6a4026",                                       // wood
  j: "#f4eeff", c: "#c0a0ff", C: "#8a64e0", x: "#5a3ab0",           // crystal
  o: "#22304c",                                                     // backdrop
})

// ---------------------------------------------------------------- iso helpers
// A 2:1 diamond grows 2px per side per row: widths 4, 8, .., 32, 32, .., 4. Drawn as hlines,
// so both edges are clean 2-px stair steps.
const diamond = (c, y, left, right = left) => {
  for (let r = 0; r < 16; r++) {
    const hw = 2 * (r < 8 ? r + 1 : 16 - r)
    c.hline(16 - hw, y + r, hw, left)
    c.hline(16, y + r, hw, right)
  }
}

// A 32x24 block: the side faces are the diamond pushed down 1..8px (left lit, right darker),
// then the top face, `y0` px down (water sits lower). `lip` recolors the top 2px of the sides
// (grass folding over the edge). The top's two front edges get a 2px rim; on flat ground the
// next block covers it, so the rim only shows along drops.
const block = (top, rim, left, right, y0 = 0, lip = [left, right]) => (c) => {
  for (let d = 8; d > y0; d--) diamond(c, d, ...(d - y0 <= 2 ? lip : [left, right]))
  diamond(c, y0, top)
  for (let k = 0; k < 8; k++) {
    c.hline(2 * k, y0 + 8 + k, 2, rim)
    c.hline(30 - 2 * k, y0 + 8 + k, 2, rim)
  }
}

// A single-level map needs none of this: tilemap(map, { iso: true, w: 32, h: 16 }). Stacked
// heights do: map cell -> screen position of its block at stack level z. Columns run down-right, rows
// down-left, each level lifts the block by its 8px side.
const OX = 112, OY = 24
const iso = (col, row, z) => [OX + (col - row) * 16, OY + (col + row) * 8 - z * 8]

// ---------------------------------------------------------------- blocks
sprite("dirt", { w: 32, h: 24 }, block("u", "U", "d", "D"))
// Masonry: a mortar course halfway down each side face, following the iso slant, and joints
// staggered between the courses (stacked blocks repeat it, so they stagger too).
const masonry = (lm, rm) => (c) => {
  for (let k = 0; k < 8; k++) { c.hline(2 * k, 12 + k, 2, lm); c.hline(30 - 2 * k, 12 + k, 2, rm) }
  for (const [k, down] of [[2, 1], [6, 1], [4, 5]]) { c.vline(2 * k, 8 + k + down, 3, lm); c.vline(31 - 2 * k, 8 + k + down, 3, rm) }
}
sprite("stone", { w: 32, h: 24 }, block("i", "I", "s", "S"), masonry("S", "Z"))
sprite("sand", { w: 32, h: 24 }, block("y", "Y", "a", "A"))
sprite("water", { w: 32, h: 24 }, block("b", "f", "B", "n", 4))

// Grass: dirt sides with the turf folding 2px over the edge and a few roots hanging lower.
sprite("grass", { w: 32, h: 24 },
  block("g", "l", "d", "D", 0, ["G", "h"]),
  px(5, 15, "G"), px(10, 18, "G"), px(11, 18, "G"), px(21, 19, "h"), px(26, 16, "h"), px(27, 16, "h"))

// ---------------------------------------------------------------- props
// Written as the left half; mx mirrors it. Outer edges dark, middle light: a lit cone.
sprite("pine", { mx: true, outline: "k", pivot: "bottom" }, `
  ......h
  .....hG
  .....hg
  ....hGg
  ...hGgg
  .....hG
  ....hGg
  ...hGgg
  ..hGGgg
  .hhGggg
  ....hGg
  ...hGgg
  ..hGGgg
  .hGGggg
  hhhGGgg
  ......W
  ......W`)

sprite("rock", { w: 11, h: 7, outline: "k", pivot: "bottom" },
  ellipse(5, 4, 5, 3, "s"), ellipse(4, 3, 3, 2, "i"), px(3, 2, "I"), hline(2, 6, 7, "S"), hline(7, 5, 2, "S"))

// Odd width: the center column is shared.
sprite("crystal", { mx: "c", outline: "k", pivot: "bottom" }, `
  ...j
  ..cj
  ..cj
  .Ccj
  .Ccc
  .Ccc
  xCcc
  xCcc
  xCcc
  .xCc`)

// ---------------------------------------------------------------- the island
// Terrain: one char per cell. Each type says which block goes on top, how tall the stack is,
// and what fills the stack below it.
const TERRAIN = `
  ~~~~~~~~
  ~~ssss~~
  ~ssggss~
  ~sgGGgs~
  ~sgGRgs~
  ~ssggss~
  ~~sss~~~
  ~~~~~~~~`
const TYPES = {
  "~": { top: "water", h: 1 },
  s: { top: "sand", h: 1 },
  g: { top: "grass", h: 2, under: "dirt" },
  G: { top: "grass", h: 3, under: "dirt" },
  R: { top: "stone", h: 4, under: "stone" },
}
const PROPS = `
  ........
  .....o..
  ....p...
  ..p.....
  ....*p..
  ......o.
  ..o.....
  ........`
// Props have pivot: "bottom", so each one stands on the middle of its cell's top face.
const PROP = { p: "pine", o: "rock", "*": "crystal" }

const rows = (s) => s.trim().split("\n").map((r) => r.trim())

scene("island", { w: 256, h: 168, bg: "o" }, (c) => {
  const ground = rows(TERRAIN), props = rows(PROPS)
  // Back to front by diagonal: a cell can only hide cells with a smaller col + row.
  for (let sum = 0; sum <= 14; sum++)
    for (let row = 0; row < 8; row++) {
      const col = sum - row
      if (col < 0 || col > 7) continue
      const t = TYPES[ground[row][col]]
      for (let z = 0; z < t.h; z++) {
        const [x, y] = iso(col, row, z)
        c.stamp(z === t.h - 1 ? t.top : t.under, x, y)
      }
      const p = PROP[props[row][col]]
      // The prop map is drawn apart from the terrain: fail loudly instead of floating a rock on water.
      if (p && t.top === "water") throw new Error(`${p} at row ${row}, col ${col} would stand in water`)
      if (p) {
        const [x, y] = iso(col, row, t.h - 1)
        c.stamp(p, x + 16, y + 9)
      }
    }
})

// For the engine: the blocks alone, one 32x24 cell each.
sheet("blocks", ["grass", "dirt", "stone", "sand", "water"], { cols: 5 })
