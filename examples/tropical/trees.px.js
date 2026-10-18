// Trees and big-leaf plants reduced from CC-BY 4.0 art and cleaned ("reduce a bigger version, then clean it"):
//  - palm: "Animated Palm Tree Sprite" by Sevarihk (Aurora-Sprites), https://opengameart.org/node/138809
//  - tree, tree2: "[LPC] Jungle" v2 by bluecarrot16, Lanea Zimmerman (Sharm), Sevarihk, Hyptosis,
//    Emcee Flesher, ansimuz, KnoblePersona, surt, Talosaurus and the Open Pixel Project contributors
//    (full list in refs/CREDITS-jungle.txt), https://opengameart.org/content/lpc-jungle
// Each is shrunk 2x (most common colour per block), snapped to the forest palette, and outlined:
// the palm had no outline, so it gets one; the LPC trees keep theirs and only the gaps are closed.
use("palette.hex")
ramps("DHGglL")   // the greens; the palm's trunk steps along its own ramp below
const DARK = "kKDHqBSn"
// The palm has 3 greens and 3 browns. Snapping them to the nearest palette color merged its mid
// and dark greens into one, which left it flat, so rampmap() gives them keys by brightness instead
// (the greens to "Ggl", the browns to "bco", told apart by hue): nothing merges. relight()
// then gives it depth: frond tops and left edges catch the light, undersides and right edges
// darken. The heart of the crown sits in shade, the frond tips hanging low are darker, and the
// trunk is lit on its left and dark on its right.
sprite("palm", { png: "refs/palm.png", shrink: 2, outline: "D", pivot: [23, 60] },
  rampmap("Ggl", { hue: [70, 170] }), rampmap("bco", { hue: [10, 50] }),
  relight(),
  shade((x, y) => Math.hypot(x - 29, (y - 13) * 1.4) < 7),
  shade([0, 22, 64, 64]),
  relight(null, { ramps: ["BbcoC"], light: [-1, 0], reach: 2 }))
// two loose root bits lying apart from the trunk read as debris at half size: removed
sprite("tree", { png: "refs/jungle_05.png", shrink: 2, palettize: true, inline: { color: "D", keep: DARK }, pivot: "bottom" },
  rect(20, 84, 12, 6, "_"), rect(74, 96, 12, 6, "_"))
sprite("tree2", { png: "refs/jungle_04.png", shrink: 2, palettize: true, inline: { color: "D", keep: DARK }, pivot: "bottom" })
scene("trees", { w: 220, h: 112, bg: "q" }, stamp("tree", 44, 108), stamp("tree2", 120, 108), stamp("palm", 186, 108))

// Big-leaf understory from the same [LPC] Jungle pack: two banana-like plants, a monstera and a fan
// palm seen from above. Their dominant green is a deep shade green that our palette maps to its
// darkest key, so it's lifted one step (D -> H) to sit with the rest of the forest.
sprite("banana", { png: "refs/jungle_07.png", shrink: 2, palettize: true, inline: { color: "D", keep: DARK }, swap: { D: "H" }, pivot: "bottom" })
sprite("banana2", { png: "refs/jungle_06.png", shrink: 2, palettize: true, inline: { color: "D", keep: DARK }, swap: { D: "H" }, pivot: "bottom" })
sprite("monstera", { png: "refs/jungle_08.png", shrink: 2, palettize: true, inline: { color: "D", keep: DARK }, swap: { D: "H" }, pivot: "bottom" })
sprite("fanpalm", { png: "refs/jungle_09.png", shrink: 2, palettize: true, inline: { color: "D", keep: DARK }, swap: { D: "H" }, pivot: "bottom" })
