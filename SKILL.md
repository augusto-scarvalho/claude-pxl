---
name: pxl-pixel-art
description: Creates pixel art (game sprites, characters, animations, items, icons, tiles and tilesets, scenes, sprite sheets) with pxl, a compact JavaScript DSL that renders PNGs, GIFs and engine-ready sheets and lets the user watch the painting live in a browser. Use when asked to draw, design, animate or iterate on pixel art or 2D game assets.
---

# pxl: pixel art as code

Write a `.px.js` file; pxl renders PNGs, GIFs and upscaled previews you can inspect. `PXL` below
means `node <this skill's directory>/bin/pxl.js` (Node ≥ 22.18, no install). `PXL --help` lists
every command and flag.

## Workflow

1. Reuse before drawing: browse `PXL lib` or the closest example ([below](#examples)). Map any file
   with `PXL list <file> --own --find <words>` and read only the line ranges needed — never dump whole
   multi-thousand-line files. Given a reference: `PXL shot` or `PXL study` handles images, GIFs, video
   (JPEG/WebP/video need ffmpeg), PNG frame folders (`--px 1`), and 3D models (`.stl`/`.glb`/`.obj`/`.blend`,
   `--up z|y`; `PXL help "characters 2"`). `PXL blender` converts `.blend` ↔ `.glb` headlessly.
2. Look in one call: `PXL shot art.px.js <name>` renders to `out/_shot/<name>.png` (or straight to
   `--out FILE.png` / `FILE.gif`), reports changes since the last shot, and prints `check` warnings.
   Pack multiple views into **one** contact sheet and one process instead of separate calls: `a+b+c`
   joins labelled cells on one row (spaces start new rows), `--cols N` wraps entries/globs/GIFs into
   N columns, and `--quiet` (`-q`) drops non-warning chatter. Also: `--frames 0,12,30`, `--at x,y,w,h`,
   `--gif`, `--grey`, `--ref`, `--boxes`, `--sockets`. Exact pixels: `PXL ascii art.px.js <name...>`
   (`--trim`, `--anchor`, `--parts`, `--at x,y,w,h`). Scenes: `PXL describe art.px.js <scene>`
   (`--brief` when busy) prints positions, gaps, cover, contrast and motion as text — answer layout
   questions from it, not by eyeballing.
3. Fix everything one look showed in one turn (every turn re-reads the whole conversation). Edit in
   place instead of rewriting files whole. `describe --diff` lists what moved/redrew;
   `shot --vs <HEAD|file|dir> --diff` (and `--gif --vs`) stacks before/after diffs; `log(...)` prints
   DSL debug values during `build`/`shot`; `PXL steps art.px.js <name> --at x,y` names the line and
   3D part that painted a pixel (following `base` chains).
4. Small scene edits ("move the stall left", "add a lantern", recolor, flip, turn):
   `PXL inspect art.px.js <scene> --find stall` (`--id <id>` for one), preview with
   `PXL edit art.px.js <scene> '{ "op": "move", "target": "<id>", "by": [-3, 0] }' --dry`, then apply
   without `--dry` (refuses computed values for manual edits — `PXL help "inspect and edit"`).
5. `PXL build art.px.js` writes the file's own PNGs, sheets and GIFs to `out/` (an include's via
   `--only a,b` or `--all`) and previews to `out/_preview/`. While iterating, use `--only`,
   `--no-preview`, and `--quiet`. Use `--profile` when slow (shows slowest files, SDF time and
   non-`pure()` fields: `PXL help pure`).
6. Iterate with `PXL check art.px.js <name>`; before handing over, run `PXL check art.px.js` across
   every scene, rig and frame (`check: { every: N }` on long stories) plus `expect`/`expect3d` rules
   (`--fix`). Fix warnings or justify them; check LOOK lines (L-corners, jaggies, close tones,
   `--edges`) and verify `"not run: lit side"` didn't skip lighting (add `world.light` or `lighting()`).
   Replacing approved art: show `name` vs `name_old` or run `PXL compare` (`--anchor` aligns pivots,
   `--pixels` shows color diffs). More: `PXL help "scenes 14"`.
7. Live preview if requested: start `PXL serve art.px.js` in the background, share the URL, and stop
   it when done. Never open a headless browser; run one heavy job at a time.

## A big scene: ask how to make it

For a big, busy scene (320×180+, many props, animated), ask the user first with the numbers and
current session length: **one agent** (default, cheapest, most coherent; in a long conversation, a
fresh agent with a brief) or **a pipeline** (a fork per part from a new session: denser, less coherent,
~5× tokens, ~2× time): [docs/agents.md](docs/agents.md#a-big-scene-one-agent-a-fresh-one-or-a-pipeline).
Show stages for approval: camera + ground blocks, props, then people; a new move as flat blocks first
(`bk_<move>_<dir>` in `lib/characters/traveler.px.js`).

## Looking things up

Never `read_file` whole guides or `reference.md` to look up an option (early reads are paid every
later turn). `PXL help` is the index; `PXL help <name>` prints an op's reference and uses;
`PXL help "<guide> <numbers or words>"` prints only those sections:

| Making | Read |
|---|---|
| game sprites (platformer, top-down, fighting, racing, HD-2D) | pick the profile first: `PXL help "scenes 18 19"` (`genre()`; draw a new density simpler, never scale) |
| studying a 2D or 3D reference (.png, .gif, .mp4, .stl, .glb, .obj, .blend) | `PXL help "characters 2"`, `PXL help study`, `PXL help blender` |
| a person or humanoid | `PXL help "characters 1 4 7 basics"`; by need "three quarters", "new head", "four directions", "turned to a diagonal"; 2-3 reference/existing art, 8 variants, 10 animated limbs, 12 frame counts, 13 game look, 14 fighting sprite |
| a small animal | `PXL help "characters 1 9"` |
| a big figure or prop (48 px+), part by part on a skeleton | `PXL help "characters 11"` (`rig`) |
| a 4- or 8-direction walking field sprite | `PXL help "a body that turns"` (`rig3d`, blocks first; baked head + hand face retouch), then `PXL help "characters 5 6 idles"`; by need "attacks", "subpixel" |
| a story: figures walking and talking | `PXL help route`, `PXL help bubble`, `"story in a diorama"` |
| a scene, level, building or environment | `PXL help "scenes 1 3 11 shot describe and check"`; by need: 2 ground, 4 trees, 5 water, 6 distance, 7 perspective ("perspective basics", HD-2D "diorama"), 8-10 loops/parallax, 16 projections; kit: `PXL help "environment 10"` |
| lamps, night, light blocked by walls | [lighting.md](lighting.md) (~3.5k tokens) |
| non-quarter turns; 8/16 directions | `PXL help "rotation short version"`, then "rotation angles" |
| 3D things: turns, sways, multiple cameras | `PXL help "scenes 17"`; prop to sprites: `turnaround` |
| shader-like effects, particles, smoke, spells | `PXL help effect`, `emitter`, `smoke`, `spell`; hits/explosions `PXL help "effect cards"`; custom element `"designing an element"` |

## Template

```js
pal({ k: "#1b1630", l: "#c8f0a0", g: "#8ccf63", G: "#4c8a44", t: "#2a5560", w: "#fff6e0", r: "#e2585e", R: "#a63a4c", D: "#6b2a44" })
ramps("ktGgl", "kDRr")                  // dark -> light for shade()/light(); keep keys in one ramp (ends shared)

sprite("slime", { mx: true, outline: "k", pivot: "bottom" }, `   // mirror left half + outline
  ....ggg
  ..gglgg
  .gglllg
  gggkwgg
  gggkkgg
  tgggggg
  .tttttt`)
sprite("slime_red", { base: "slime", swap: { g: "r", G: "R", l: "#f6b0a8" } })   // 1-line variant

sprite("_eye", "wk\nkk")   // "_" = internal part, not exported
sprite("chest", { w: 16, h: 12, outline: "k" },
  rect(0, 3, 16, 9, "R"), rect(0, 0, 16, 4, "r"), stamp("_eye", 7, 4), shade([0, 9, 16, 3]))

scene("meadow", { w: 160, h: 96, bg: "w" },
  layer("ground", { y: 64 }, rect(0, 0, 160, 32, "G")),
  layer("props", { sort: "y" }, stamp("slime", 40, 64), stamp("slime_red", 70, 64, { flip: "x" })),
  layer("shadow", { shade: true }, poly([38, 64, 88, 64, 92, 67, 34, 67], "k")))

sheet("chars", ["slime*", "chest"], { pad: 1 })
```

## Essentials

One line per area; `PXL help <name>` prints full details for any op or option.

- **Colors**: 1-char `pal` keys, `"#hex"`, `"."` skip, `"_"` erase. `use("pico8" | "sweetie16" |
  "endesga32" | "palette.hex")`; `shades("HGgl", "#5aa040")` generates hue-shifted ramps.
- **Order**: grids, ops, `(c, fi) => { ... }` functions and `layer(...)`s run in order; then
  mirror → swap → flip → rot → angle → aa → inline/outline/outline8 (+1px) → crop.
- **Regions** (`where`, `clip(region, ...items)`): `[cx, cy, r]`, `[x, y, w, h]`, polygon points,
  or `(x, y) => bool`. `shade`/`light(region, steps, density)` step along `ramps` (`density` can be `(x, y) => k`).
- **Reuse**: `base` + `swap` for variants; `_parts` + `stamp` + `grid(x, y, s, { flip })`; `bg` on sprites/anims;
  `own()`/`own.prefix` + `group` for families; `pivot: "bottom"`, `id`, relations (`beside`, `on`, `along`, `apart`) +
  `expect` (`PXL help expect`); `scatter`; `tilemap`/`pattern`/`corners()`/`sides()` (`map` fn for variants).
- **Animation**: `anim(...)` with `frame()` patches, or `frames: n` (`ms: [...]`) with `(c, fi)` reading
  `fi`/`c.frame`/`c.phase`/`c.data()`/`c.asset()` (read-only, skips scene loop); `scene({ loop: "longest" | "hold" })`;
  `scroll()`, `clouds()`, `plume()`, `c.cross()` loop seamlessly; `tween()` keys poses; `route()` walks paths.
- **Existing art**: `sprite("x", { png, normals, area, shrink, palettize })`, `anim(..., { png, frames })`, `rampmap`.
- **Out**: `sheet()` (+ JSON with tags, `cell`, `format`, `scale`, `slots`, `normalSuffix`/`emitSuffix`),
  GIFs, Tiled `.tmj`, `build --aseprite`, `build --share 4`.
- **Light**: `shade:`/`light:` layers, `cast` shadows (`of` a layer; `"sun"` for `look3d`),
  `relight`/`plate()`, `glow`, `lighting()` ([lighting.md](lighting.md)).
- **Text**: built-in 3×5 `text()`, or `include` `lib/ui/font5x7.px.js` for `{ font: "5x7" }`; `bubble()`.
- **Meters & HD-2D**: `perspective()`, `plane()`, `terrain()`, `solids()`/`shadows()`, `mesh()` +
  `model()`, `sprites3d()`, `sizes`, `post()` (DoF, bloom, `lut`, `grain`); `capsule`, `flame({ style: "plume" })`
  (`PXL help "scenes 7"`, `PXL help post`). In `sort: "y"` layers, `z` breaks ties and `sortY` overrides the row.
- **Effects & spells**: `effect(kind)` (dissolve, pixelate, dither, tint, distort, emit, aura,
  `sway({ pad, profile, lag })`, energy), per-copy `fx`; `smoke()`, `emitter()` + `particles()`,
  `trail()`, `ability()`; `cast(spell(...))` (per-primitive depth in `mesh()`; `depth: "single"` legacy).
- **3D fields**: `sdf` (`lathe`, `prism`, `orient`, `grow`, closed planes, `mat({ override: true })`) via
  `surface()` (`flat`, `clean`), `voxels()`, `mesh()`, `volume()`, `draw3d()`, `sdf.scatter` +
  `sdf.splats("file.ply")` + `splats({ cast })`, `decal()`, `world3d` + `make3d` + `expect3d`, scoped `look3d`,
  `turnaround({ sockets, pivot })`, `rig3d` (`rig3d.joints()`, per-move `w`/`h`/`pivot`/`headings`,
  `j.union()`, `j.rod`/`j.smear` `{ over }`, `over: "depth"`, `views` `{ grid, on }` retouch), `export3d` (`PXL help "scenes 17"`).
- **Procedural texture**: `hash`, `vnoise`, `fbm`, `fbmLoop`, `bayer`, `seamless` (`PXL help vnoise`).

## Examples

[examples/README.md](examples/README.md) indexes all examples. Copy the closest structure:

- **First files**: `basics.px.js`, `platformer.px.js`, `topdown.px.js`, `isometric.px.js`.
- **The library** (`lib/` — `include` instead of redrawing): `PXL lib` summarizes subjects, genres
  and cells; `PXL lib props`, `--genre topdown16` or `--cell side/32` lists entries; `PXL lib <entry>`
  shows its card and `include`; `PXL lib draft <entry> --genre topdown16` drafts a 3D entry into a
  genre. Mend a near fit (params, `swap`, redone part) rather than redrawing from scratch.
- **Characters & mounts** (`lib/characters/`): `hero` (4-dir tagged sheet), `knight` (`rig`),
  `traveler`, `crew`, `miko` (`rig3d`, 8-dir), `kit` (modular HD-2D generator, `hd2d/character_kit.px.js`),
  `mounts` (8 HD-2D mount species, mounted riders & wagons, `hd2d/mounts.px.js`); `rig/warden.px.js`,
  `tropical/girl.px.js`.
- **Scenes**: `sunset/`, `tropical/`, `halloween/`, `cyberpunk/`, `no_magic.px.js`, `shrine/`,
  `lighting.px.js`, `parallax/train.px.js`.
- **Perspective & HD-2D**: `perspective/`, `hd2d/plaza.px.js`, `hd2d/graveyard.px.js`, `hd2d/harbor.px.js`.
- **Effects, spells, 3D**: `hd2d/clearing.px.js`, `spells.px.js`, `sdf/` (start from `world.px.js`).

Every command on an example writes `out/` next to it — pass `--out <scratch dir>`.

## Habits that give better art

- Mirror symmetric shapes (`mx`) and let `outline`/`selout`/`inline`/`outline8` draw lines. Shine is a
  lighter tone of the color, not white (except metal/gem glints; pure black only as outline, never in shadow).
- Small organic shapes (faces, leaves, icons) are grids, pixel by pixel; primitives for structure and
  large areas. Never big hand grids.
- Every surface mark needs a cause (seams, weathering, story): no filler `noise` or `dither`.
- New subject: `PXL study` a reference sheet and your drawing, and compare numbers (`PXL help "environment 1"`).
- 2–4 shades per material, mnemonic keys (`g`/`G`); reuse tones across materials. Light and shadow are
  two families (biggest jump across the terminator); no pillow shading; flippable sprites lit from above.
- Lines step diagonally without L-corners, runs in order; drop outlines at ≤16 px (unless 8-bit).
  Lines, clusters, banding, shared ramps: `PXL help "characters 7"`.

## When pxl gets in your way

If something costs a rebuild or workaround (misleading error, missing op, bad doc, trap), add one
line to `FEEDBACK.md` in this skill's directory: date, asset kind, what happened in pxl, what would
have helped (pxl's side only).
