---
name: pxl-pixel-art
description: Create pixel art (game sprites, characters, items, tiles, tilesets, icons, scenes, sprite sheets) with pxl, a compact JavaScript DSL that renders PNGs and lets the user watch the painting live in a browser. Use when asked to draw, design or iterate on pixel art or game assets.
---

# pxl: pixel art as code

You write a small `.px.js` file; pxl renders PNGs and upscaled previews you can look at. The DSL
is built to avoid writing pixels twice: mirroring, auto-outline, palette-swap variants, reusable
parts, primitives, brushes and tilemaps. Needs Node ≥ 22.18. No install step.

`PXL` below means `node <this skill's directory>/bin/pxl.js`.

## Workflow

1. Write `art.px.js`: start from the template below, and first read the example closest to what
   you're making (see [Examples](#examples)).
2. Build only what you're working on: `PXL build art.px.js --only slime,heart`
3. **Look at it**: read `out/_preview/<name>.png` (upscaled, checkerboard = transparent, grid every
   pixel, darker every 8). For exact pixel fixes use `PXL ascii art.px.js <name>` (keys + x/y rulers);
   it's cheaper than an image. For an anim, also read `_preview/<name>_onion.png`: a motion map and
   each frame over its neighbours' ghosts, where jitter, jumps and a hitch at the loop show (a GIF
   opens as its first frame only). For a whole scene, `PXL describe art.px.js <scene>` gives it as
   text (~5k tokens): each object's visible ranges, feet, what covers it, its nearest neighbours and
   gaps, how it stands out after lighting and how much it moves, then cell maps; `--at x,y,w,h` adds
   a region's exact pixels; `--brief` keeps one line per object (a third of the size) for busy
   scenes. Answer layout questions from it, not by eyeballing the preview.
4. Fix with small edits (a `grid(x, y, ...)` patch, one op) and rebuild. Repeat. In a scene,
   `PXL describe art.px.js <scene> --diff` after the edit lists what moved, was redrawn or
   recolored since the last describe, so a change that spilled somewhere else shows. A pixel came out
   wrong and you don't know which op painted it? `PXL steps art.px.js <name> --at x,y` lists the
   steps that changed it, with file:line and the color after each.
5. Before handing it over, look at the preview once more as a critic, for what reviewers flag most:
   tiles repeating into a visible grid, props floating or standing on the wrong ground, big flat
   areas with no detail, dither used as a texture.
6. Replacing art someone already approved? Keep the old one as `name_old`, stamp both side by side
   in a `compare` scene, and let them choose. Your redraw is not always better. Following a
   reference image (a bigger version, a sprite to match)? `PXL compare art.px.js <name> ref.png
   [--shrink N] [--offset x,y]` lists each row's extents side by side. A preview won't show that a
   figure is 1–2 px too wide per side; this does.
7. If the user wants to watch: start `PXL serve art.px.js` in the background and give them the URL.
   It rebuilds on every save and replays the edited asset's painting steps; it also writes the same
   `out/` files, so keep reading previews as usual.

Errors name the file:line:col, the asset/layer/op path, and suggest fixes ("did you mean 'r'?").
One broken asset doesn't stop the others from building.

## Template

```js
pal({ k: "#1b1630", l: "#c8f0a0", g: "#8ccf63", G: "#4c8a44", t: "#2a5560", w: "#fff6e0", r: "#e2585e", R: "#a63a4c" })
ramps("ktGgl", "kRr")                  // dark -> light, drives shade()/light()

// Symmetric: write the left half, mirror it, outline it. The shine is a light green (l), not white.
sprite("slime", { mx: true, outline: "k" }, `
  ....ggg
  ..gglgg
  .gglllg
  gggkwgg
  gggkkgg
  tgggggg
  .tttttt`)
sprite("slime_red", { base: "slime", swap: { g: "r", G: "R", l: "#f6b0a8" } })   // variant: 1 line

sprite("_eye", "wk\nkk")                                            // "_" = part, not exported
sprite("chest", { w: 16, h: 12, outline: "k" },
  rect(0, 3, 16, 9, "R"), rect(0, 0, 16, 4, "r"), stamp("_eye", 7, 4), shade([0, 9, 16, 3]))

scene("meadow", { w: 160, h: 96, bg: "w" },
  layer("ground", { y: 64 }, rect(0, 0, 160, 32, "G"), noise(0, 0, 160, 32, "g", 0.1, 3)),
  layer("props", stamp("slime", 40, 54), stamp("slime_red", 70, 54, { flip: "x" })),
  layer("shadow", { shade: true }, poly([38, 64, 88, 64, 92, 67, 34, 67], "k")))   // cast shadow

sheet("chars", ["slime*", "chest"], { pad: 1 })
```

## Essentials

- **Colors**: one-char keys from `pal`, `"#hex"`, `"."` skip, `"_"` erase. Default palette is pico8
  (`0-f`); `use("sweetie16" | "db16" | "endesga32" | "gray8")` for others, or a palette file next to
  the art file: `use("palette.hex")` (Lospec downloads; also `.gpl`, `.pal`, `.txt`). Write each
  color's key right after it in the file, rest of the line is a comment: `1a1626 k ink`. A game's
  art files share it through a `palette.px.js` with `use("palette.hex")` and `ramps(...)`, loaded
  with `include("palette.px.js", { palette: true })`.
- **Items run in order**: grid strings (drawn at 0,0), ops, `(c) => { c.rect(...) }` functions,
  `layer(...)`s. Then mirror → swap → flip → rot → outline (grows 1px each side) → crop.
- **Shapes**: `px rect box line(…, width) curve hline vline circ ring ellipse poly fill wire text`;
  `curve([x0, y0, x1, y1, ...], c)` passes through every point, pixel-perfect (tails, vines, hair).
  `text` uses a 3×5 font; for titles and UI, `include("<skill dir>/examples/fonts/font5x7.px.js")`
  and pass `{ font: "5x7" }`.
- **Tone**: `dither`, `grad` (`"v"`, `"h"`, `"r"` radial), `noise`, `shade/light(region, steps, density)`, `recolor`, and
  `shade:`/`light:` layers for cast shadows and glows. Regions: `[cx,cy,r]`, `[x,y,w,h]`,
  polygon, or a function. `clip(region, ...items)` restricts any items (half shapes, slopes).
- **Reuse**: `stamp tile pattern tilemap scatter`, and `panel` for 9-slice UI frames (`slice: 4` on the asset).
  A scene with tilemaps also exports a Tiled map (`<scene>.tmj`), for levels in an engine. For a person
  to keep editing in Aseprite: `PXL build art.px.js --only hero --aseprite` writes `hero.aseprite` (layers,
  frames, tag, palette; one way, copy it out of `out/`). Names can be groups or globs
  (`group("rocks", ["rock_a", "rock_a", "rock_b"])`, `"tree_*"`). Each placement picks randomly but
  reproducibly. Use `rflip`, `rswap`, `seed`, and `reseed: true` for per-copy variety.
  Give props `pivot: "bottom"`: `stamp("tree", x, groundY)` then stands them on the ground at any size.
- **Brushes**: `scatter("_leaf*", x, y, w, h, 30, { on: "g", clip: true, rflip: "xy" })` paints
  texture with tiny part sprites, only on the given colors.
- **Animation**: `anim("cat", { outline: "k", fps: 10 }, grid, frame(), frame(grid(23, 0, "_K")))`:
  frames are patches over shared items or a `base`; or `frames: 6` + `(c) => ... c.phase ...` for
  procedural loops. `dir: "pingpong"` plays them there and back, so a sway or a breath is drawn
  one way only. Stamping an anim animates the scene (`rdelay: true` desyncs copies, `frame: n`
  freezes one); keep frame times on one grid (fps 4, 5, 10) so several anims loop short together. Hit flash, keeping the outline:
  `anim("hero_hit", { base: "hero" }, frame(), frame(recolor({ "*": "w", k: "k" })))`. Check
  `_preview/<name>_onion.png` (motion map + onion skin) and `_preview/<name>.png` (frames side by
  side), or `pxl ascii` per frame. A character moving its limbs: draw the parts per pose and attach
  them with `sockets` + `stamp(..., { at })` in a `sort: "z"` layer, timed by a motion guide
  (`motion("<skill dir>/examples/motion/walk.json", { dir: "SW" })`: CC0 walk and run cycles in 8
  directions) drawn in a `ref: true` layer (characters.md §10). Motion that bends what's drawn
  (breathing, hair and tails swaying, a body on a slope) is `warp((x, y) => [dx, dy])`: whole-pixel
  offsets, nothing redrawn (characters.md §9).
- **Existing PNGs**: `sprite("hero", { png: "hero.png", outline: "k" })` starts an asset from a file,
  then every option and item works on it; `area: [x, y, w, h]` cuts one out of a sheet,
  `anim("walk", { png: "walk.png", frames: 4 })` splits a strip, `rampmap("Ggl", { hue: [70, 170] })`
  maps its tones onto a ramp by brightness (none merge), `palettize: true` snaps its colors to
  your keyed palette so `ascii`/`swap`/`recolor` see keys. `use("art.png")` takes a palette from an
  image (keys `0-9a-z` in order of appearance).
- **Glow**: `glow("zgQ", { r: 6, strength: 0.5 })` directly in a sprite/scene body gives every pixel
  of those keys a halo (flames, potions, moons, neon); `ramp: 2` instead stays in the palette.
  Give glowing things their own keys so nothing else lights up, or limit it with `where`.

Full API with every option: [reference.md](reference.md).
Dynamic lighting (lamps, light blocked by solid layers, sky light, Terraria-style): read
[lighting.md](lighting.md) only when a scene needs lights.
Turning a sprite by an angle that isn't a quarter turn (`angle: 30`), or making 8/16 directions
(`directions("ship", 16, { from, symmetric })`): read [rotation.md](rotation.md) first. It says which
angles hold up, which to draw by hand, and why the outline goes on after the turn.
Drawing a person, a humanoid or a small animal: read [characters.md](characters.md) first. It has
head-to-body proportions measured on finished 16–64 px sprites, how to start from existing art
(reduce a bigger version and clean it, or dress a base body), the build order, face sizes, 3/4-view
rules, turning a character into someone else, and animals lying on a slope or swinging.

## Examples

Finished, working art files in `examples/` (in this skill's directory). Before starting a scene,
a building, an animation or anything lit, read the closest one and copy its structure; it's
cheaper than inventing one.

| File | What it is | Read it for |
|---|---|---|
| `basics.px.js` | slimes, heart, coin, chest | the starter: `mx` + `outline`, `base`/`swap` variants, parts, `sheet` |
| `platformer.px.js` | 16×16 platformer tileset laid out as a level | `tilemap`, a `group` for tile variety, a tile `sheet` for the engine, `dither`, `fill` (arched door), `my`, `include` |
| `topdown.px.js` | island in an overhead RPG view | a 16-tile corner ("wang") shore generated by one loop, laid with `tilemap(..., { corners })`, `scatter` on the layers below, cast shadows |
| `isometric.px.js` | small isometric island of stacked 2:1 blocks | iso helpers (diamond row by row, block with lit/dark sides, cell → screen), back-to-front draw order with props in the same pass, a block `sheet` |
| `sidescroller/` | one game's art over several files: a side-scroller strip (`forest.px.js`) and a PNG-import duel (`duel.px.js`) | a shared `palette.hex` with keys + `include(..., { palette: true })`, `pivot`, `wrap` tiles, `silhouette` shadows, `scatter` with `even`, `dir: "pingpong"`, hit flash, `png` import with `frames` and `palettize` |
| `fonts/font5x7.px.js` | a ready 5×7 pixel font (include it) | `font()` from glyph cells, proportional text, `text(..., { font: "5x7" })` for titles and UI |
| `shop.px.js` | telescope shop under a dome, night, flat front view | building a facade from parts, `group`s of trinkets/bulbs, `wire` light strings, `text` signs, dithered window/lamp halos |
| `moon_bakery.px.js` | corner bakery, day, flat front view | the same toolkit on a smaller build: brick/siding `tile`s, window goods, awning, street props |
| `moon_bakery_3d.px.js` | the same bakery in 3/4 view | turning a flat facade into front + side + roof: oblique helpers, slanted course lines, cast shadow |
| `tackle.px.js` | bait shop with a tugboat on the roof, 3/4 view | weathering with a cause: paint flaking along boards, rust runs, rain stains, splash-back grime |
| `neon_noodle_3d.px.js` | ramen bar on a rainy night street, 3/4 view | night city: neon, skyline window grid, puddle reflections, steam, light spill on the sidewalk |
| `lighting.px.js` | snowy cabin at night | the smallest `lighting()` setup: lamps on props, `solid` and `wall` layers, sky light |
| `outpost.px.js` | smithy + house over a dug-out cave, rain | a larger `lighting()` scene; grass on every dirt edge; brick/plank/shingle tiles |
| `normals.px.js` | bricks, crate, rock, slime under a swinging lantern | normal maps: `bump` (dome, bevel, luma) vs hand-painted `normals`, lit vs flat |
| `cave.px.js` | animated cave lit only by glowing fungus and bugs | `glow`, pulsing lamps, props placed on polyline terrain, seamless loops, `rdelay` |
| `grotto.px.js` | big animated cavern with pool and waterfall | `cave.px.js` scaled up: swaying plants, waterfall, water reflection, drifting particles |
| `tropical/` | animated tropical forest, 3/4 top-down, 320×240, the largest: river, waterfall, trail, jungle, animals, a girl | trees and big leaves reduced from CC art (`png` + `shrink`, `inline` keep, `relight`), a river from a corner field with depth bands, a trail laid with a corner tileset drawn in code (`tilemap` `corners`, 16 pieces from one function), `cast` shadows, a waterfall that churns its pool, grass over all the ground, a jaguar sheared onto a sloping branch, a swinging monkey, a breathing girl, a `ref` guide layer, credits for the third-party art |
| `no_magic.px.js` | witch's room, 256×224 | character anims (cat, frog) with `frame()` patches, procedural fire/bubbles, an interior full of props, a flat and a lamp-lit version of one scene |

To find an op in real use: `grep -n "scatter(" <skill dir>/examples/*.px.js`. `PXL list <file>`
gives each asset's line. To see one rendered, build it into your own dir so the skill's folder
stays clean: `PXL build <skill dir>/examples/shop.px.js --only comet_repair --out <scratch dir>`.
To see how a complex piece was built, in order: `PXL steps <example> <asset> --out <scratch dir>`
(every op with its line and what it changed; "no change" marks an op that painted nothing).

## Habits that save tokens and give better art

- Write half of anything symmetric (`mx`) and let `outline` draw outlines. Never hand-draw either.
  Shine on a face or a body in a lighter tone of its own color, not white: `mx` mirrors it, and
  two white dots near the eyes read as a second pair of eyes.
  `selout: true` makes the outline take a dark shade of what it touches (softer than flat black);
  `inline: "k"` draws it on the sprite's own edge without growing it.
- Recolors are `base` + `swap`; repeated details are `_parts` + `stamp`; families are a `group` or a
  loop: `for (let i = 1; i <= 3; i++) sprite("tree_" + i, ...)`.
- Large areas: primitives, `grad`, `noise`, `pattern`, `tilemap`. Never big hand grids.
- Small organic shapes are the opposite: a leaf, a face, a character, an item icon look far better
  placed pixel by pixel in a grid string, where you choose each cluster, highlight and shadow.
  Built from `curve`/`ellipse` + `fill` they come out vector-like (even outline, no shading). Use
  primitives for structure, large areas and long linework (cables, tails, vines), and grids for
  anything small enough that each pixel is a decision.
- Tiles that repeat: give them `wrap: true` (or `"x"`/`"y"`). The preview then shows the tile 3×3,
  so you can check the seams, and anything drawn past an edge continues on the other side.
  Keep small details that dot an area (pebbles, stones, flowers, tufts) out of tiles: baked in, they
  repeat as a pattern. Lay plain tiles, then `scatter(..., { even: true })` the details over the area.
- Organic texture (leaves, grass, stones, rust): 2–3 tiny brush parts + `scatter` with `on`/`clip`.
  Along an edge (grass on a path's border, moss at a rock's foot): `scatter(..., { on: "g", near:
  "<path keys>", within: 3 })`.
- **No filler noise.** Don't sprinkle `noise` speckle over walls, floors or plaster to make them
  "less flat": it reads as random dots, not material. Every mark on a surface needs a cause you
  could name, and it should sit where that cause would put it:
  - built structure: siding/plank lines, brick or stone courses with offset joints, tile seams;
  - weathering: rain-stain streaks under ledges and sills, splash-back grime fading up from the
    ground, rust runs under metal brackets, paint flaking off boards (following the board lines);
  - clutter that tells the story: posters, pipes, vents, cracks from a corner.
  Flat color is fine; a clean wall beats a dotted one. `noise` is OK only where the material itself
  is granular (gravel, sand, asphalt, tar roofs, rough stone), and keep it sparse. On faces drawn
  at an angle (3/4 views), make the marks follow the face's slant. The same goes for `dither`: over
  a whole area it reads as a checkerboard; use it only where two tones meet.
- Lighting: define `ramps`, then `light`/`shade` regions; stack a `density: 0.5` pass for soft edges.
  Use `shade: true` layers with a `poly` for cast shadows across many objects, and stamp tall props
  there with `cast: [0.6, 0.2]` (laid flat from their base; a mirrored prop still throws its shadow
  the same way). Art that came out flat in one tone gets its volume back with `relight()`.
- **Paths, roads, shores and patches of ground: lay them with tiles**, marked at tile corners with
  `tilemap(..., { corners })` and a terrain tileset (drawn, or reduced from a free LPC-style one).
  A `curve` or `poly` stroke of dirt reads as paint on top of the grass.
- **Trees, palms and other big organic shapes** are where code drawing fails worst (lobes read as
  broccoli, fronds as combs). Start from free art instead (CC0 / CC-BY, credited in the file; share-alike art such as
  CC-BY-SA puts its license on everything built with it, so ask the user first):
  `png` + `shrink: 2`, then fix it (`examples/tropical/trees.px.js`; characters.md §3 has the steps).
- **Things that land leave marks.** A waterfall that ends in a strip of foam over still water looks
  pasted on: spread churning foam to the sides and forward, send rings out, and let a wake of foam
  ride the current downstream. A character walks on the ground, not over it: grass and tufts at
  the edges of paths and at the foot of trees and rocks.
- **Blend modes leave the palette.** A layer with `blend: "multiply"` (or `"screen"`, `"add"`,
  `"overlay"`) and/or `opacity` does color math with what's below: one `rect` of deep blue at
  `{ blend: "multiply", opacity: 0.7 }` turns a scene to night, `opacity` makes real glass or fog.
  But every pixel it touches becomes a color nobody picked: the art is no longer palette pixel art,
  and palette swaps in an engine stop finding those colors. Try the palette-safe tools first:
  `shade:`/`light:` layers (step along the ramps), `density` (dithered translucency), `glow`,
  `lighting()`. Use blend modes for whole-scene grading or true translucency, and tell the user.
  `palettize: true` snaps the results back to the palette, but only works when the palette already
  has those tones; without them, distinct colors collapse into one and the shading disappears
  (night-tinted trees merge into the grass).
- Use mnemonic keys (`g`/`G` light/dark green). Keep 2–4 shades per material for a clean pixel-art look:
  `shades("HGgl", "#5aa040")` makes them from one base color, hue-shifted, and adds the ramp.
- Build with `--only` while iterating; a full build also writes every preview.
- Assert what a preview hides. When a scene is built from separate maps (terrain, props), a `throw`
  in the placement loop (a prop landing on water) catches the drift before anyone sees it.

## When pxl gets in your way

If something cost you a rebuild or a workaround (a misleading error, a missing op, a doc that sent
you wrong, a trap you fell into), add one line to `FEEDBACK.md` in this skill's directory (create it
if missing): the date, the kind of asset, what happened in pxl, what would have helped. Describe
pxl's side only, never the project: no names, paths or story details. Only real friction, not
taste. The file stays out of git; the skill's curators turn its lines into fixes, docs and examples.
