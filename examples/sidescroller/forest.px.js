// Side-scroller kit, part 1: one game's art split over files. The palette lives in palette.hex
// (keys written next to their colors) and palette.px.js, which every art file includes. Props stand
// on the ground by their pivot; ground and wall tiles wrap; props cast silhouettes on the back wall;
// stones are scattered evenly; the hero breathes in pingpong and has a hit-flash anim.
// Part 2, duel.px.js, imports PNGs.
include("palette.px.js", { palette: true })

const GROUND = 90   // walkable row: the grass top of the ground tiles

// ---------------------------------------------------------------- tiles
// Topsoil: roots hang from the turf and it darkens toward the subsoil below. Pebbles and stones
// are scattered evenly over the scene (below), not baked into a tile, so they never repeat as a pattern.
sprite("_pebble", ".s\nsS")
sprite("_stone", `
  .sss.
  sssSS
  SSSSK`)
group("stones", ["_stone", "_pebble", "_pebble"])
sprite("ground", { w: 16, h: 16, wrap: "x" }, rect(0, 2, 16, 14, "W"), rect(0, 0, 16, 2, "_"), `
  ..l.....l.....l.
  lglg..lglg..lglg
  gggggggggggggggg
  GgGGGgGGGGgGGGgG
  GGGGGGGGGGGGGGGG
  HHGHHHGHHHHGHHHG
  .H...H..H..H...H
  .....H.....H....`,
  dither(0, 14, 16, 1, "W", "K", 0.25), dither(0, 15, 16, 1, "W", "K", 0.75))

// Back wall: stone courses with offset joints, so wrap: true lines up on every side.
sprite("wall", { w: 16, h: 16, wrap: true }, rect(0, 0, 16, 16, "S"),
  hline(0, 7, 16, "K"), hline(0, 15, 16, "K"), vline(3, 0, 7, "K"), vline(11, 8, 7, "K"),
  hline(4, 0, 7, "s"), hline(12, 8, 7, "s"))

// ---------------------------------------------------------------- props (pivot: bottom)
sprite("tree", { w: 26, h: 34, outline: "k", pivot: "bottom" },
  rect(11, 20, 4, 14, "W"), vline(11, 20, 14, "w"),
  circ(13, 11, 10, "H"), circ(7, 15, 6, "H"), circ(19, 15, 6, "H"),
  circ(11, 9, 7, "G"), circ(6, 14, 4, "G"), circ(17, 13, 4, "G"),
  circ(9, 7, 3, "g"), px(5, 12, "g"), px(15, 10, "g"))
sprite("lamp", { w: 7, h: 30, outline: "k", pivot: "bottom" },
  rect(3, 6, 1, 24, "K"), rect(2, 28, 3, 2, "K"), rect(1, 0, 5, 6, "K"), rect(2, 1, 3, 4, "o"), px(2, 1, "x"))
sprite("crate", { w: 12, h: 10, outline: "k", pivot: "bottom" },
  rect(0, 0, 12, 10, "w"), box(0, 0, 12, 10, "W"), line(1, 1, 10, 8, "W"), hline(1, 1, 10, "o"))

// ---------------------------------------------------------------- hero
// Upper body rides down 1px on the out-breath; pingpong plays 0 1 2 1, so it's drawn one way.
const LEGS = `
  ..bb..bb..
  ..bb..bb..
  ..WW..WW..`
const TOP = `
  ...WWWW...
  ..WWWWWW..
  ..WWnnnn..
  ..Wnnnkn..
  ...nnnn...
  ..bbbbbb..
  .nbbbbbbn.
  .nbbbbbbn.
  ..bbbbbb..
  ..WWoWWW..`
anim("hero", { w: 10, h: 14, frames: 3, fps: 5, dir: "pingpong", outline: "k", pivot: "bottom" }, (c) => {
  c.grid(0, 11, LEGS)
  c.grid(0, [0, 0, 1][c.frame] + 1, TOP)
  if (c.frame === 1) c.px(1, 7, "n")    // arms start to drop
})
anim("hero_hit", { base: "hero", fps: 12 }, frame(), frame(recolor({ "*": "x", k: "k" })), frame(), frame(recolor({ "*": "x", k: "k" })))

// ---------------------------------------------------------------- the strip
const props = [["tree", 30], ["crate", 62], ["lamp", 84], ["tree", 150], ["crate", 172]]

scene("forest", { w: 192, h: 128, bg: "l" },
  layer("sky", grad(0, 0, 192, 40, "bs")),
  layer("wall", pattern("wall", 0, 32, 192, GROUND - 32)),
  // Props shade the wall behind them, a little right and up; the clip keeps it off the ground.
  layer("shadows", { shade: true }, clip([0, 32, 192, GROUND - 32],
    ...props.map(([n, x]) => stamp(n, x + 4, GROUND - 2, { silhouette: "k" })))),
  layer("ground", pattern("ground", 0, GROUND - 2, 192, 16), rect(0, GROUND + 14, 192, 24, "K"),
    scatter("_pebble", 0, GROUND + 6, 192, 6, 17, { even: true, rflip: "x" }), scatter("stones", 0, GROUND + 15, 192, 24, 36, { even: true, rflip: "x" })),
  layer("props", ...props.map(([n, x]) => stamp(n, x, GROUND)), stamp("hero", 118, GROUND)))

sheet("hero_sheet", ["hero", "hero_hit"], { pad: 1 })
