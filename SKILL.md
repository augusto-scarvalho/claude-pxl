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
   it's cheaper than an image.
4. Fix with small edits (a `grid(x, y, ...)` patch, one op) and rebuild. Repeat.
5. If the user wants to watch: start `PXL serve art.px.js` in the background and give them the URL.
   It rebuilds on every save and replays the edited asset's painting steps; it also writes the same
   `out/` files, so keep reading previews as usual.

Errors name the file:line:col, the asset/layer/op path, and suggest fixes ("did you mean 'r'?").
One broken asset doesn't stop the others from building.

## Template

```js
pal({ k: "#1b1630", g: "#8ccf63", G: "#4c8a44", t: "#2a5560", w: "#fff6e0", r: "#e2585e", R: "#a63a4c" })
ramps("ktGg", "kRr")                   // dark -> light, drives shade()/light()

// Symmetric: write the left half, mirror it, outline it.
sprite("slime", { mx: true, outline: "k" }, `
  ....ggg
  ..ggGGg
  .ggGwGg
  gggkwgg
  gggkkgg
  tgggggg
  .tttttt`)
sprite("slime_red", { base: "slime", swap: { g: "r", G: "R" } })   // variant: 1 line

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
  (`0-f`); `use("sweetie16" | "db16" | "endesga32" | "gray8")` for others.
- **Items run in order**: grid strings (drawn at 0,0), ops, `(c) => { c.rect(...) }` functions,
  `layer(...)`s. Then mirror → swap → flip → rot → outline (grows 1px each side) → crop.
- **Shapes**: `px rect box line(…, width) hline vline circ ring ellipse poly fill wire text`.
- **Tone**: `dither grad noise`, `shade/light(region, steps, density)`, `recolor`, and
  `shade:`/`light:` layers for cast shadows and glows. Regions: `[cx,cy,r]`, `[x,y,w,h]`,
  polygon, or a function. `clip(region, ...items)` restricts any items (half shapes, slopes).
- **Reuse**: `stamp tile pattern tilemap scatter`. Names can be groups or globs
  (`group("rocks", ["rock_a", "rock_a", "rock_b"])`, `"tree_*"`). Each placement picks randomly but
  reproducibly. Use `rflip`, `rswap`, `seed`, and `reseed: true` for per-copy variety.
  Give props `pivot: "bottom"`: `stamp("tree", x, groundY)` then stands them on the ground at any size.
- **Brushes**: `scatter("_leaf*", x, y, w, h, 30, { on: "g", clip: true, rflip: "xy" })` paints
  texture with tiny part sprites, only on the given colors.
- **Animation**: `anim("cat", { outline: "k", fps: 10 }, grid, frame(), frame(grid(23, 0, "_K")))`:
  frames are patches over shared items or a `base`; or `frames: 6` + `(c) => ... c.phase ...` for
  procedural loops. Stamping an anim animates the scene (`rdelay: true` desyncs copies, `frame: n`
  freezes one). Check `_preview/<name>.png` (all frames side by side) or `pxl ascii` per frame.
- **Glow**: `glow("zgQ", { r: 6, strength: 0.5 })` directly in a sprite/scene body gives every pixel
  of those keys a halo (flames, potions, moons, neon); `ramp: 2` instead stays in the palette.
  Give glowing things their own keys so nothing else lights up, or limit it with `where`.

Full API with every option: [reference.md](reference.md).
Dynamic lighting (lamps, light blocked by solid layers, sky light, Terraria-style): read
[lighting.md](lighting.md) only when a scene needs lights.

## Examples

Finished, working art files in `examples/` (in this skill's directory). Before starting a scene,
a building, an animation or anything lit, read the closest one and copy its structure; it's
cheaper than inventing one.

| File | What it is | Read it for |
|---|---|---|
| `basics.px.js` | slimes, heart, coin, chest | the starter: `mx` + `outline`, `base`/`swap` variants, parts, `sheet` |
| `platformer.px.js` | 16×16 platformer tileset laid out as a level | `tilemap`, a `group` for tile variety, a tile `sheet` for the engine, `dither`, `fill` (arched door), `my`, `include` |
| `topdown.px.js` | island in an overhead RPG view | a 16-tile corner ("wang") shore generated by one loop, the tilemap computed from a corner map, `scatter` on the layers below, cast shadows |
| `isometric.px.js` | small isometric island of stacked 2:1 blocks | iso helpers (diamond row by row, block with lit/dark sides, cell → screen), back-to-front draw order with props in the same pass, a block `sheet` |
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
| `no_magic.px.js` | witch's room, 256×224, the largest | character anims (cat, frog) with `frame()` patches, procedural fire/bubbles, an interior full of props, a flat and a lamp-lit version of one scene |

To find an op in real use: `grep -n "scatter(" <skill dir>/examples/*.px.js`. `PXL list <file>`
gives each asset's line. To see one rendered, build it into your own dir so the skill's folder
stays clean: `PXL build <skill dir>/examples/shop.px.js --only comet_repair --out <scratch dir>`.

## Habits that save tokens and give better art

- Write half of anything symmetric (`mx`) and let `outline` draw outlines. Never hand-draw either.
- Recolors are `base` + `swap`; repeated details are `_parts` + `stamp`; families are a `group` or a
  loop: `for (let i = 1; i <= 3; i++) sprite("tree_" + i, ...)`.
- Large areas: primitives, `grad`, `noise`, `pattern`, `tilemap`. Never big hand grids.
- Organic texture (leaves, grass, stones, rust): 2–3 tiny brush parts + `scatter` with `on`/`clip`.
- **No filler noise.** Don't sprinkle `noise` speckle over walls, floors or plaster to make them
  "less flat": it reads as random dots, not material. Every mark on a surface needs a cause you
  could name, and it should sit where that cause would put it:
  - built structure: siding/plank lines, brick or stone courses with offset joints, tile seams;
  - weathering: rain-stain streaks under ledges and sills, splash-back grime fading up from the
    ground, rust runs under metal brackets, paint flaking off boards (following the board lines);
  - clutter that tells the story: posters, pipes, vents, cracks from a corner.
  Flat color is fine; a clean wall beats a dotted one. `noise` is OK only where the material itself
  is granular (gravel, sand, asphalt, tar roofs, rough stone), and keep it sparse. On faces drawn
  at an angle (3/4 views), make the marks follow the face's slant.
- Lighting: define `ramps`, then `light`/`shade` regions; stack a `density: 0.5` pass for soft edges.
  Use `shade: true` layers with a `poly` for cast shadows across many objects.
- Use mnemonic keys (`g`/`G` light/dark green). Keep 2–4 shades per material for a clean pixel-art look.
- Build with `--only` while iterating; a full build also writes every preview.
