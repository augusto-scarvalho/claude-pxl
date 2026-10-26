---
name: pxl-pixel-art
description: Creates pixel art (game sprites, characters, animations, items, icons, tiles and tilesets, scenes, sprite sheets) with pxl, a compact JavaScript DSL that renders PNGs, GIFs and engine-ready sheets and lets the user watch the painting live in a browser. Use when asked to draw, design, animate or iterate on pixel art or 2D game assets.
---

# pxl: pixel art as code

You write a small `.px.js` file; pxl renders PNGs and upscaled previews you can look at. The DSL
avoids writing pixels twice: mirroring, auto-outline, palette-swap variants, reusable parts,
primitives, brushes and tilemaps. `PXL` below means `node <this skill's directory>/bin/pxl.js`
(Node ≥ 22.18, no install). `PXL --help` lists every command and flag.

## Workflow

1. Start from the closest example ([below](#examples); `PXL list <file>` maps it: read the lines you
   need) and the template. Given a reference (PNG, GIF; JPEG, WebP or video need ffmpeg; pixel art
   or not): `PXL shot ref.gif` shows it (a clip's frames on one sheet), `PXL study ref.gif` reads it:
   palette, ramps, outlines, light, perspective, a clip's timing and planes, each moving piece cut
   out, and what in pxl makes each part (`--at x,y,w,h` follows one thing; `PXL help "characters 2 3"`).
2. Look with one call: `PXL shot art.px.js <name>` builds just that asset and writes
   `out/_shot/<name>.png` (read it); its text says what changed since your last shot of it and
   the warnings `check` finds on it. `--frames 0,12,30` side by side, `--at x,y,w,h` enlarges a
   part, more names make a row each to compare, `--gif` (`--every 3`) plays them, `--grey` shows the
   values. Exact pixels: `PXL ascii art.px.js <name>`. Scenes: `PXL describe art.px.js <scene>`
   (`--brief` when busy) gives each object's position, gaps, cover, contrast and motion as text:
   answer layout questions from it, not by eyeballing.
3. Fix everything one look showed, then look again: all the edits in the same message (every turn
   re-reads the whole conversation). After the first write, change the file with Edit, never write
   it whole again. `describe --diff` lists what an edit moved or redrew; `shot --vs HEAD --diff`
   shows the pixels it changed; `PXL steps art.px.js <name> --at x,y` names the line that painted
   a pixel.
4. `PXL build art.px.js` writes the PNGs, sheets and GIFs to `out/`, previews to `out/_preview/`
   (`--only a,b`; `--every 3` keeps a long loop's GIF small; `--profile` when a build has grown slow).
5. Before handing over, `PXL check art.px.js`: every scene and rig of the file, every frame of an
   animated scene (`check: { every: N }` on a long story), warnings only, with their frames. Fix each
   or say why it's meant. LOOK lines (L-corners, jaggies, tones too close) don't fail it: look at
   each. Its last line says which rules ran: "not run: lit side" means nothing about the light was
   checked (give the scene `world.light`, or lamps and `lighting()`); `expect3d` rules run there too
   (`--fix`). Then look as a critic. Replacing approved art: keep `name_old` beside the new one and
   show both (`PXL shot art.px.js name name_old`); against a reference or an approved part,
   `PXL compare` lists each row's extents. More: `PXL help "scenes 14"`.
6. If the user wants to watch: start `PXL serve art.px.js` in the background, give them the URL,
   and stop it when you're done. Never open a page in a headless browser (one froze a laptop), and
   run one heavy job (a long render, a test run) at a time.

Errors name file:line:col and the asset/layer/op; one broken asset doesn't stop the others.

## A big scene: ask how to make it

For a big, busy scene (320×180 and up, many props, animated), ask the user first, with the numbers
and how long this conversation already is:

- **One agent** (the default): the cheapest and the most coherent; a 320×180 animated city street
  took 85 turns and 31 minutes. In a conversation already long, a fresh agent given a brief file
  costs less than going on here.
- **A pipeline**: a planner and one fork per part, then a fork that puts the scene together:
  denser but less coherent, ~5× the tokens and ~2× the time. Run it from a new session, never
  forked from a long one (each fork rereads all of it).

How to run each, with the commands: [docs/agents.md](docs/agents.md#a-big-scene-one-agent-a-fresh-one-or-a-pipeline).
Either way, show it in stages for the user to approve before painting on: the camera and the ground
as blocks, the props, then the people; a new move as flat blocks first (`bk_<move>_<dir>` in
`hd2d/traveler.px.js`).

## Looking things up

What you read early is paid again on every later turn (guides and examples dumped whole were a third
of what sessions re-read). Read the reference and the guides by section, never whole: `PXL help`
is the index (every op, option and guide section, with its size); `PXL help <name>` prints an op's
reference and its uses in the examples; `PXL help "<guide> <numbers or words of a heading>"` prints
those sections. Read the ones your task needs first:

| Making | Read |
|---|---|
| a person or humanoid | `PXL help "characters 1 4 5 6 7"` (style, build order, faces, views, placing pixels); 2 and 3 with a reference or existing art, 8 for variants, 10 when limbs animate, 12 for frame counts, 13 for a game's look |
| a small animal | `PXL help "characters 1 9"` |
| a big figure or prop (48 px and up), built part by part on a skeleton | `PXL help "characters 11"` (`rig`) |
| a figure that turns to 4 or 8 directions and walks (a field sprite) | `PXL help "a body that turns"` (`rig3d`, blocks first; the head baked per view, its face retouched by hand), then `"characters 5 6 10"` |
| a story: figures walking a path and talking | `PXL help route`, `PXL help bubble`; `hd2d/graveyard.px.js` |
| a scene, level, building or environment | `PXL help "scenes 1 3 11 14"`; then by need: 2 ground, 4 trees, 5 water, 6 distance, 7 perspective and HD-2D, 8-10 loops and parallax, 16 a game's projections; grass, trees, rocks, walls: `PXL help "environment 1"` |
| lamps, night, light blocked by walls | [lighting.md](lighting.md), whole (~3k tokens) |
| a turn that isn't a quarter turn; 8/16 directions | `PXL help "rotation short version"`, then "rotation angles" |
| a thing in 3D: turns, sways, seen from several cameras | `PXL help "scenes 17"`; start from `examples/sdf/world.px.js`; a prop turned into a game's sprites: `turnaround` |
| an effect a shader would do, particles, smoke, a spell | `PXL help effects`, `PXL help abilities`, `PXL help "scenes 12"`; your own element: `PXL help "designing an element"` |

## Template

```js
pal({ k: "#1b1630", l: "#c8f0a0", g: "#8ccf63", G: "#4c8a44", t: "#2a5560", w: "#fff6e0", r: "#e2585e", R: "#a63a4c", D: "#6b2a44" })
ramps("ktGgl", "kDRr")                  // dark -> light, drives shade()/light(); a key in one ramp only (ends shared)

// Symmetric: write the left half, mirror it, outline it. The shine is a light green (l), not white.
sprite("slime", { mx: true, outline: "k", pivot: "bottom" }, `
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
  layer("props", { sort: "y" }, stamp("slime", 40, 64), stamp("slime_red", 70, 64, { flip: "x" })),
  layer("shadow", { shade: true }, poly([38, 64, 88, 64, 92, 67, 34, 67], "k")))   // cast shadow

sheet("chars", ["slime*", "chest"], { pad: 1 })
```

## Essentials

What exists, a line each; `PXL help <name>` prints the rest of any op or option named here.

- **Colors**: one-char keys from `pal`; `"#hex"`; `"."` skip; `"_"` erase. Palettes: `use("pico8" |
  "sweetie16" | "endesga32" | "palette.hex")`; `shades("HGgl", "#5aa040")` makes a hue-shifted ramp.
- **Order**: grid strings, ops, `(c) => { ... }` functions and `layer(...)`s run in order; then
  mirror → swap → flip → rot → angle → aa → inline/outline/outline8 (grows 1px) → crop.
- **Regions** (`where`, `clip(region, ...items)`): `[cx, cy, r]`, `[x, y, w, h]`, a polygon's points,
  or `(x, y) => bool`. `shade`/`light(region, steps, density)` step colors along the ramps.
- **Reuse**: variants are `base` + `swap`; repeated details `_parts` + `stamp`; families a `group` or a
  loop; props get `pivot: "bottom"`; texture is `scatter` of tiny parts; areas are `tilemap`/`pattern`
  (a terrain's 16 corner pieces from one function: `corners()`).
- **Animation**: `anim(...)` with `frame()` patches, or `frames: n` and functions reading `c.phase`;
  stamping an anim animates the scene; `scroll()`, `clouds()`, `plume()`, `c.cross()` go by in a
  loop; `tween()` keys poses in time; `route()` walks a figure along a path (`px: true` on a flat map).
  Limbs, walks, hair: `PXL help "characters 9 10"`; loops and parallax: `PXL help "scenes 8 9 10"`.
- **Existing art**: `sprite("x", { png, normals, area, shrink, palettize })`, `anim(..., { png, frames })`, `rampmap`.
- **Out**: `sheet()` (+ JSON with tags), GIFs, Tiled `.tmj`, `build --aseprite`, `build --share 4`.
- **Light**: `shade:`/`light:` layers and `cast` shadows (a shade layer `of` what stands; `"sun"`: `look3d`'s),
  `relight`/`plate()`, `glow`, `lighting()` ([lighting.md](lighting.md)).
- **Text**: `text()` in the 3×5 built in, or `include` `examples/fonts/font5x7.px.js` for `{ font: "5x7" }`; `bubble()` a dialogue box.
- **In meters and HD-2D**: `perspective()`, `plane()`, `terrain()`, `solids()`/`shadows()`,
  `mesh()` of `model()` faces, a scene's `sizes` (HD, faces in the sprites' pixel), `post()` for depth
  of field, bloom, a `lut`, `grain`; `capsule`, `flame` (`PXL help "scenes 7"`, `PXL help post`).
- **Effects and spells**: `effect(kind)` (dissolve, pixelate, dither, tint, distort, emit,
  aura, sway, energy), one copy's `fx`; `smoke()`, `emitter()` + `particles()`,
  `trail()`, `ability()` from a hand's socket; `cast(spell("fire", 3, { from, to }))`.
- **3D fields**: `sdf` drawn by `surface()` (`clean: true` for a small thing: a figure, a head),
  `voxels()`, `mesh()`, `volume()`, or any of them by `draw3d(thing, { as })`; details by
  `sdf.scatter` + `splats()`; hand-drawn art pinned on by `decal()`; a scene of named parts by
  `world3d` and `make3d`, checked by `expect3d`; light and mats once by `look3d`; a game's sprites
  from N headings by `turnaround()`; in a `mesh()` diorama's sun and shadows by `light: "mesh"`; out
  by `export3d` (`PXL help "scenes 17"`).
- **Procedural texture**: `hash`, `vnoise`, `fbm`, `bayer`, `seamless` (`PXL help vnoise`).

## Examples

[examples/README.md](examples/README.md) says what each example is for. Copy the structure of the
closest:

- **First files**: `basics.px.js` (mirror, outline, variants, parts, a sheet), `platformer.px.js`
  (a tileset as a level), `topdown.px.js`, `isometric.px.js`.
- **Characters**: `topdown_hero/` (four directions, a tagged sheet), `rig/knight.px.js` and
  `rig/warden.px.js` (skeleton first), `hd2d/traveler.px.js`, `hd2d/crew.px.js` and
  `shrine/miko.px.js` (`rig3d`, 8 directions, moves as blocks first), `tropical/girl.px.js` (a walk).
- **Scenes**: `sunset/`, `tropical/`, `halloween/`, `cyberpunk/`, `no_magic.px.js`; `shrine/`
  (top-down, props drawn in 3D and turned); lamps in `lighting.px.js` and `outpost.px.js`; parallax
  in `parallax/train.px.js`.
- **Perspective and HD-2D**: `perspective/` (one, two and three points, a cockpit),
  `hd2d/plaza.px.js`, `hd2d/graveyard.px.js` (a story with dialogue), `hd2d/harbor.px.js`.
- **Effects, spells, 3D**: `hd2d/clearing.px.js` (every shader at once), `spells.px.js`, `sdf/`
  (start from `world.px.js`); grass, trees and rocks to `include`: `nature/kit.px.js`; tree species
  by season: `nature/trees.px.js`.

Every command run on an example writes an `out/` next to it: give it `--out <scratch dir>`.

## Habits that give better art

- Write half of anything symmetric (`mx`) and let `outline` draw outlines (`selout` takes a dark
  shade of what it touches, `inline` stays inside, `outline8` squares the steps). Shine is a lighter
  tone of the color, not white (a glint on metal or a gem may be white; pure black only as an
  outline, never in a shadow).
- Small organic shapes (a face, a leaf, an item icon) are grids, pixel by pixel; primitives are for
  structure, large areas and long lines. Never big hand grids.
- Every mark on a surface needs a cause (seams, weathering, story): no filler `noise` or `dither`.
- Drawing a kind of thing new to you: `PXL study` a game's sheet of it and your drawing, and hold
  your numbers against the game's (`PXL help "environment 1"`).
- 2–4 shades per material, mnemonic keys (`g`/`G`); reuse a tone across materials before adding a
  color. Light and shadow are two families: the step across the terminator is bigger than any
  within them. A flat face is one tone; a round form changes only along its curve, never darker all
  round its rim (pillow shading). A sprite the game will flip is lit from straight above
  (`light: [0, -1]`).
- Lines step diagonally, without L-corners, their runs in order; at 16 px and under, drop the
  outline (unless it's 8-bit). Lines, clusters, banding, shared ramps: `PXL help "characters 7"`.

## When pxl gets in your way

If something cost you a rebuild or a workaround (a misleading error, a missing op, a doc that sent
you wrong, a trap), add one line to `FEEDBACK.md` in this skill's directory (create it if missing):
the date, the kind of asset, what happened in pxl, what would have helped. pxl's side only, never
the project. It stays out of git.
