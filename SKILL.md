---
name: pxl-pixel-art
description: Creates pixel art (game sprites, characters, animations, items, icons, tiles and tilesets, scenes, sprite sheets) with pxl, a compact JavaScript DSL that renders PNGs, GIFs and engine-ready sheets and lets the user watch the painting live in a browser. Use when asked to draw, design, animate or iterate on pixel art or 2D game assets.
---

# pxl: pixel art as code

You write a small `.px.js` file; pxl renders PNGs and upscaled previews you can look at. The DSL
avoids writing pixels twice: mirroring, auto-outline, palette-swap variants, reusable parts,
primitives, brushes and tilemaps. `PXL` below means `node <this skill's directory>/bin/pxl.js`
(Node ≥ 22.18, no install).

## Workflow

1. Read the [example](#examples) closest to what you're making and start from the template below.
2. Build only what you're working on: `PXL build art.px.js --only slime,heart`.
3. Look at `out/_preview/<name>.png` (checkerboard = transparent, pixel grid). For exact pixels:
   `PXL ascii art.px.js <name>` (keys + rulers, cheaper than an image). Anims: also
   `_preview/<name>_onion.png` (motion map + onion skin). Scenes: `PXL describe art.px.js <scene>`
   (`--brief` when busy) gives each object's position, gaps, cover, contrast and motion as text:
   answer layout questions from it, not by eyeballing.
4. Fix with small edits and rebuild. In a scene, `PXL describe ... --diff` lists what the edit moved,
   redrew or recolored. A wrong pixel: `PXL steps art.px.js <name> --at x,y` names the line that
   painted it.
5. Before handing over, look as a critic. Replacing approved art: keep `name_old` beside the new one
   in a `compare` scene and let the user choose. Matching a reference: `PXL compare art.px.js <name>
   ref.png [--shrink N]` lists each row's extents side by side.
6. If the user wants to watch: start `PXL serve art.px.js` in the background and give them the URL.

Errors name file:line:col and the asset/layer/op, and suggest fixes. One broken asset doesn't stop
the others.

## Looking things up

Don't read reference.md whole. `PXL help` lists every op and option by section; `PXL help <name>`
prints what the reference says about it and where the examples use it (a few hundred tokens).
Read the guide your task needs, whole, before starting:

| Making | Read |
|---|---|
| a person, humanoid or small animal; limbs that animate | [characters.md](characters.md) |
| a big figure or prop (48 px and up), built part by part on a skeleton | [characters.md](characters.md) §11 (`rig`) |
| a scene, level, building or environment | [scenes.md](scenes.md) |
| lamps, night, light blocked by walls | [lighting.md](lighting.md) |
| a turn that isn't a quarter turn; 8/16 directions | [rotation.md](rotation.md) |

## Template

```js
pal({ k: "#1b1630", l: "#c8f0a0", g: "#8ccf63", G: "#4c8a44", t: "#2a5560", w: "#fff6e0", r: "#e2585e", R: "#a63a4c" })
ramps("ktGgl", "kRr")                  // dark -> light, drives shade()/light(); a key in one ramp only

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
  layer("ground", { y: 64 }, rect(0, 0, 160, 32, "G")),
  layer("props", { sort: "y" }, stamp("slime", 40, 54), stamp("slime_red", 70, 54, { flip: "x" })),
  layer("shadow", { shade: true }, poly([38, 64, 88, 64, 92, 67, 34, 67], "k")))   // cast shadow

sheet("chars", ["slime*", "chest"], { pad: 1 })
```

## Essentials

- **Colors**: one-char keys from `pal`; `"#hex"`; `"."` skip; `"_"` erase. Palettes: `use("pico8" |
  "sweetie16" | "endesga32" | "palette.hex")` (Lospec files; `1a1626 k ink` gives a color its key);
  `shades("HGgl", "#5aa040")` makes a hue-shifted ramp from one color.
- **Order**: grid strings, ops, `(c) => { ... }` functions and `layer(...)`s run in order; then
  mirror → swap → flip → rot → outline (grows 1px) → crop.
- **Regions** (`where`, `clip(region, ...items)`): `[cx, cy, r]`, `[x, y, w, h]`, a polygon's points,
  or `(x, y) => bool`. Shading: `shade`/`light(region, steps, density)` step colors along the ramps;
  a second pass at `density: 0.5` softens the edge.
- **Reuse**: variants are `base` + `swap`; repeated details `_parts` + `stamp`; families a `group` or a
  loop; props get `pivot: "bottom"`; texture is `scatter` of tiny parts; areas are `tilemap`/`pattern`.
- **Animation**: `anim(...)` with `frame()` patches, or `frames: n` and functions reading `c.phase`;
  `dir: "pingpong"`; stamping an anim animates the scene. Limbs, walks, hair: characters.md §9–10.
- **Existing art**: `sprite("x", { png, area, shrink, palettize })`, `anim(..., { png, frames })`;
  `rampmap` maps imported tones onto a ramp without merging them.
- **Out**: `sheet()` (+ JSON with tags), GIFs, Tiled `.tmj` for tilemaps, `build --aseprite` for a
  person to keep editing in Aseprite.
- **Light**: `shade:`/`light:` layers and `cast` shadows, `glow`, `lighting()` (lighting.md).

## Examples

Finished art files in `examples/` (this skill's directory). Copy the structure of the closest one;
`PXL help <op>` shows where each op is used.

| File | Read it for |
|---|---|
| `basics.px.js` | the starter: `mx` + `outline`, `base`/`swap`, parts, `sheet` |
| `platformer.px.js` | a tileset laid out as a level: `tilemap`, `group` variety, tile `sheet`, `include` |
| `topdown.px.js` | overhead RPG island: corner-tile shore generated in code, `scatter`, cast shadows |
| `isometric.px.js` | 2:1 blocks, back-to-front order, iso helpers |
| `sidescroller/` | a game's art over several files: shared `palette.hex`, `wrap` tiles, `png` import, hit flash |
| `shop.px.js`, `moon_bakery.px.js` | flat building facades from parts: tiles, signs, `wire` lights |
| `moon_bakery_3d.px.js`, `tackle.px.js` | 3/4 buildings; weathering with a cause |
| `neon_noodle_3d.px.js` | night street: neon, reflections, steam |
| `lighting.px.js`, `outpost.px.js` | `lighting()` scenes: lamps, `solid`/`wall` layers |
| `normals.px.js` | normal maps: `bump` vs painted `normals` |
| `cave.px.js`, `grotto.px.js` | animated glow scenes: pulsing lamps, waterfall, particles |
| `tropical/` | 320×240 animated forest: imported trees, river, trail tileset, animals, a walking girl |
| `halloween/` | 320×180 night party: `lighting()` with many lamps, point-light `cast` shadows, dancing monsters (bones drawn between joints, a cape polygon, `warp`) |
| `no_magic.px.js` | the largest interior: character anims, fire, many props |
| `rig/knight.px.js` | a 72 px knight built skeleton first: `rig`, `figure`, stand-ins, parts, retouch; turned around; `facing` and `world` read out by describe |
| `fonts/font5x7.px.js` | a 5×7 font for titles: `include` it, `text(..., { font: "5x7" })` |

Render one into your own dir to keep the skill clean: `PXL build <skill dir>/examples/shop.px.js
--only comet_repair --out <scratch dir>`.

## Habits that give better art

- Write half of anything symmetric (`mx`) and let `outline` draw outlines (`selout` takes a dark
  shade of what it touches, `inline` stays inside). Shine is a lighter tone of the color, not white.
  Something on one side only (a shine, a shadow side): mirror a `_part`, stamp it, then draw it.
- Small organic shapes (a face, a leaf, an item icon) are grids, pixel by pixel; primitives are for
  structure, large areas and long lines. Never big hand grids.
- Every mark on a surface needs a cause (seams, weathering, story): no filler `noise` or `dither`.
- 2–4 shades per material, mnemonic keys (`g`/`G`).
- Build with `--only` while iterating.

## When pxl gets in your way

If something cost you a rebuild or a workaround (a misleading error, a missing op, a doc that sent
you wrong, a trap), add one line to `FEEDBACK.md` in this skill's directory (create it if missing):
the date, the kind of asset, what happened in pxl, what would have helped. pxl's side only, never
the project. The file stays out of git; the curators turn its lines into fixes and docs.
