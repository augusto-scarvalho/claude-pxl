// Side-scroller kit, part 2: PNG import. hero_strip.png (a 3-frame strip, as another tool or an
// earlier build would hand it over) comes back as an anim and turns into a red rival; sparkle.png,
// 2 frames in colors the palette doesn't have, is snapped to it with palettize.
include("palette.px.js", { palette: true })
include("forest.px.js")   // for "hero"

anim("rival", { png: "hero_strip.png", frames: 3, fps: 5, dir: "pingpong", pivot: "bottom", swap: { b: "R" } })
anim("sparkle", { png: "sparkle.png", frames: 2, fps: 4, palettize: true, pivot: "center" })

scene("duel", { w: 96, h: 48, bg: "s" },
  rect(0, 40, 96, 8, "G"), hline(0, 40, 96, "g"),
  stamp("hero", 30, 41), stamp("rival", 66, 41, { flip: "x" }), stamp("sparkle", 48, 18))
