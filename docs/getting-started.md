# Getting started

pxl turns a short JavaScript file into pixel art: PNGs, sprite sheets with JSON, animated GIFs, Tiled
maps and Aseprite files. This page is for drawing by hand. It takes you from nothing to a sprite, an
animation and a scene, then shows where each command fits. For the full API see
[reference.md](../reference.md); to have an AI agent draw for you, see
[Working with an agent](agents.md).

## Contents

- [Install](#install)
- [Your first sprite](#your-first-sprite)
- [Watch it while you edit](#watch-it-while-you-edit)
- [An animation and a scene](#an-animation-and-a-scene)
- [Relations, rules and edits by name](#relations-rules-and-edits-by-name)
- [Loops, clocks and sheets](#loops-clocks-and-sheets)
- [By hand or in 3D](#by-hand-or-in-3d), and what a frame costs
- [What a build writes](#what-a-build-writes)
- [Which command, when](#which-command-when)
- [Starting from a reference](#starting-from-a-reference)
- [Where to read next](#where-to-read-next)
- [Troubleshooting](#troubleshooting)

## Install

You need Node 22.18 or newer (`node -v`). pxl has no runtime dependencies and no build step.

```sh
git clone --depth 1 https://github.com/augusto-scarvalho/claude-pxl.git
cd claude-pxl
node bin/pxl.js            # prints every command and its options
```

Below, `pxl` means `node bin/pxl.js` in the clone (or `node <path to the clone>/bin/pxl.js` from
anywhere). Without cloning, `npx github:augusto-scarvalho/claude-pxl <command>` runs the same CLI.

Reading videos, JPEG or WebP (only `pxl study`, `pxl shot` and `pxl compare` do) needs `ffmpeg` on your PATH. PNG
and GIF need nothing. Converting or inspecting `.blend` files (`pxl blender`, `pxl shot`, `pxl study`) needs Blender on your PATH.

## Your first sprite

Make a folder anywhere and write `art.px.js`:

```js
pal({ k: "#1b1630", g: "#8ccf63", G: "#4c8a44", w: "#fff6e0", r: "#e2585e", R: "#a63a4c" })
ramps("kGg", "kRr")                       // dark -> light, used by shade() and light()

// Write the left half: mx mirrors it, outline draws the outline.
sprite("slime", { mx: true, outline: "k", pivot: "bottom" }, `
  ....ggg
  ..ggGGg
  .ggGwGg
  gggkwgg
  GGGGGGG`)
sprite("slime_red", { base: "slime", swap: { g: "r", G: "R" } })   // a recolor in one line

sheet("chars", ["slime*"], { pad: 1 })
```

Each character in a grid is a palette key; `.` leaves the pixel clear. Then:

```sh
pxl build art.px.js
```

The art lands in `out/` next to the file, at 1×, and an enlarged preview of each asset with a pixel
grid in `out/_preview/`.

Two habits do most of the work in pxl: draw half of anything symmetric and let `mx` mirror it, and
make every variant a `base` plus a `swap` instead of a second drawing. Parts you reuse (an eye, a
rivet, a leaf) are sprites named with a leading `_`, placed with `stamp`, and never exported.

## Watch it while you edit

```sh
pxl serve art.px.js
```

Open http://127.0.0.1:4321/. Every time you save, the viewer rebuilds and replays the asset you
changed op by op, so you see how it was painted. It writes the same `out/` files as `build`
(`--no-out` to skip them, `--port` for another port). An HD scene with a long loop plays too: the
viewer builds each frame when the page asks for it (a second or two each) and leaves that scene's
`out/` files to `pxl build --only <scene>`. A file that exports 3D models (`export3d`) gets a "3D" link in the viewer: http://127.0.0.1:4321/3d
turns `.glb` meshes and `.ply` Gaussian splats round with the mouse (with a Splats/Points toggle for `.ply`).

## An animation and a scene

An animation is a base drawing and frames that patch it:

```js
anim("slime_hop", { base: "slime", fps: 8 },
  frame(),                                  // the base as it is
  frame(rect(0, 0, 16, 1, "_")),            // "_" erases: one row shorter
  frame({ hold: 2 }))                       // the base again, held two frames
```

A scene is layers of stamps and shapes; stamping an animation animates the scene:

```js
scene("meadow", { w: 160, h: 96, bg: "w" },
  layer("ground", { y: 64 }, rect(0, 0, 160, 32, "G")),
  layer("props", { sort: "y" }, stamp("slime_hop", 40, 64), stamp("slime_red", 70, 64, { flip: "x" })),
  layer("shadow", { shade: true }, poly([38, 64, 88, 64, 92, 67, 34, 67], "k")))
```

`pxl help anim` and `pxl help scene` print what the reference says about each, and where the
examples use them.

## Relations, rules and edits by name

Give what you will move an `id`, and place what goes with it by a relation: it follows when the
other moves.

```js
layer("props", { sort: "y" },
  stamp("slime_hop", 40, 64, { id: "hop" }),
  stamp("slime_red", { id: "red", beside: ["hop", "right", 14], flip: "x" }))
```

`beside` puts it a gap off one side of the other, `on` on its top (or on the ground), `along` some
px along a path, `apart` clear of it (`pxl help beside`). What the layout must keep goes on the
scene as rules, which `pxl check` holds at every frame:

```js
scene("meadow", { w: 160, h: 96, bg: "w", expect: [{ beside: ["red", "hop", { gap: [8, 16] }] }] }, ...)
```

When a rule breaks, `pxl check art.px.js --fix` changes the one number that makes it hold, where the
file writes it (`pxl help expect`). A small change then needs no reading of the file:

```sh
pxl inspect art.px.js meadow --find red     # what the scene holds, by id; --id hop: one in full
pxl edit art.px.js meadow '{ "op": "move", "target": "hop", "by": [-3, 0] }' --dry   # what it would change
pxl edit art.px.js meadow '{ "op": "move", "target": "hop", "by": [-3, 0] }'         # hop and red move
```

`edit` writes the number where it lives (hop's `40` becomes `37`), says what changed by id and runs
`pxl check`. It refuses an edit that would move anything else, and one on what code computes (make
that by hand). It also recolors, flips, swaps an asset, changes a relation and adds a stamp beside
another (`pxl help "scenes 14"`). With an agent, ask in plain words ("move the green slime a bit
left", "add another red one beside it"): it runs these same commands
([Working with an agent](agents.md#how-the-agent-works)).

## Loops, clocks and sheets

- **A scene's clock.** A scene runs on the clock of the animations it stamps. When its own functions
  pick what to draw by time (a hero who walks, then swings), give it a clock of its own:
  `scene("test", { w, h, frames: 48, fps: 12 }, ...)`. Otherwise its loop is the least common
  multiple of its animations' loops — or pass `loop: "longest"` (each shorter anim wraps) or
  `loop: "hold"` (holds its last frame) when mixing animations of unrelated lengths, and use
  `c.asset(name)` to read a sprite/anim frame without adding it to the scene's loop.
  [`examples/topdown_hero/`](../examples/topdown_hero) does this.
- **Tiles and terrain.** Use `corners()` + `tilemap(..., { corners })` for top-down ground transitions,
  or `sides()` + `tilemap(..., { sides })` for side-view platformer ground, walls, and cliffs (with
  optional `map: (mask, col, row) => ...` for deterministic tile variants).
- **Things going by.** `scroll()` moves a strip that wraps across the picture, one call per parallax
  plane; `axis: "y"` moves it down instead (a shooter's backdrop). A plane should move a whole number
  of px a frame, or 1 px every so many frames: otherwise it judders, and pxl warns and names a speed
  that doesn't. `clouds()` and `plume()` (smoke, steam) close their loops too
  (`pxl help "scenes 8 9 10"`).
- **Sheets for a game.** `sheet("hero", ["idle_*", "walk_*"], { rows: "tag" })` puts each animation
  on a row of its own, and the sheet's preview GIF plays every animation in it at once. Pass
  `normalSuffix` / `emitSuffix` if your engine expects custom normal/emission sheet suffixes.

## By hand or in 3D

Most of pxl is drawing by hand in code: grids, primitives, parts. Some things are better described
once in meters and drawn as pixel art by pxl (`pxl help "scenes 17"`). What the examples taught:

- **By hand:** a face of 11 rows or less, an eye, a leaf, an icon (a grid, pixel by pixel); anything
  a few px tall (the road's walker far off, the race's rivals at seven sizes); a tree that only
  sways (a sprite and `effect("sway")`, 2 px at its top).
- **In 3D:** a body that turns and walks (`rig3d()`): drawn by eye, its proportions drift and its
  near and far limbs swap, where one skeleton and one set of moves give every direction. A prop seen
  from several sides (`turnaround()` draws it once per heading: the shrine's torii, hall, lanterns
  and foxes). Trees, rocks and mist that one sun has to light alike (`examples/nature/`, `volume()`).
  You can also load real 3D Gaussian Splatting `.ply` captures via `sdf.splats("file.ply")` and
  render them directly into pixel art with `splats()`.
- **A head, both ways.** Model it (the skull, the hair, a hat), bake it once per view with
  `views(name, field, { retouch })` (five views for eight directions, the east the west's mirror),
  then paint its face over each view by hand (`"."` keeps the render's pixel, `"_"` erases one; or
  `{ grid, on: "face" }` to paint only over one 3D part). The 3D gets the hair's volume right; a face
  of fields and decals read worse than a painted one. Baked once, it costs nothing a frame
  (`pxl help "a body that turns"`; the traveler, the miko).
- **What didn't work:** a whole tree as splats (soft blobs beside the same tree drawn by
  `surface()`); a figure pre-rendered in Blender as a fixed sprite loop (a stiff borrowed walk, turns
  stuck at the angles rendered, every fix of a proportion a round trip through another program).
  When you *do* want to inspect a `.blend` model as a reference or move 3D assets between Blender and
  pxl, `pxl blender` converts `.blend` ↔ `.glb` and renders matching turnarounds headlessly.

What a frame costs, warm, on a 4-core laptop (i5-1035G1):

| | a frame |
| --- | --- |
| a `rig3d` figure: the traveler, 34 px | 5-6 ms (the warden, 48 px with an axe: 22) |
| a tree in 3D, 50-60 px | 0.2-0.5 s, the dense species 1-1.4 s |
| the shrine, 240×160: its props and trees turned once when it loads (10 s to its first `shot`) | 0.06 s |
| `graveyard_3d`, 480×270: a dead tree, a mist and a gate drawn in 3D every frame | 0.7 s |

So draw in 3D once and stamp the sprites where you can, and give a long story in 3D
`check: { every: N }` (the graveyard: one frame in 24).

## What a build writes

```
out/sprites/<name>.png            each sprite at 1x (+ <name>_n.png when it has a normal map, <name>_e.png
                                  when it gives light: reference.md, "Output for engines")
out/anims/<name>.png .json .gif   a strip of the frames, Aseprite-style JSON (tags), the playback
out/scenes/<name>.png             each scene (+ a GIF when it moves, a folder of layers with layers: true,
                                  a Tiled .tmj when it holds tilemaps)
out/<sheet>.png .json             each sheet() and its JSON (frames, tags)
out/_preview/                     enlarged previews (a GIF too for what moves); anims also get
                                  <name>_onion.png (onion skin), and a sheet that holds animations a GIF
                                  playing them all
out/share/                        with --share N: each asset N times bigger, clean (no grid), to post
out/<name>.vox .obj .glb .ply     each export3d(): a voxel model, a mesh, splats (something that moves:
                                  one .glb that plays, and <name>_0, <name>_1 ... for the others)
```

Useful options:

- `--only a,b` builds some assets; `--out DIR` writes elsewhere.
- `--share 4` writes each asset 4 times bigger in `out/share/`, clean for posting. Use a whole
  number: pixel art at 2.5× has pixels of two sizes.
- `--aseprite` also writes each asset as an `.aseprite` file to keep editing by hand. Copy it out of
  `out/`: the next build overwrites it.
- `--every 3` keeps one frame in three in the preview GIFs of a long loop.
- `--profile` says where a slow build spends its time.

## Which command, when

| You want to | Run |
| --- | --- |
| see one asset now, without building everything | `pxl shot art.px.js slime` writes `out/_shot/slime.png` (or `--out preview.png`) |
| pack multiple assets into one labelled contact sheet | `pxl shot art.px.js a+b+c --cols 3 --quiet` (`+` joins on one row, spaces start new rows) |
| see some frames side by side (in rows when too wide), or a part enlarged | `pxl shot art.px.js slime_hop --frames all --at 0,0,8,8` |
| watch several animations play side by side | `pxl shot art.px.js walk_s walk_w walk_n --gif` writes one GIF (`--gif --vs HEAD` stacks before/after) |
| preview a long scene as a GIF, quickly | `pxl shot art.px.js street --gif --every 4` builds one frame in four and prints its size |
| check the values (lights and darks) without the color | `pxl shot art.px.js meadow --grey` adds the same picture in greys |
| see guide layers (`ref: true`), hit/hurt boxes, or sockets | `pxl shot art.px.js hero --ref --boxes --sockets` |
| compare two versions | `pxl shot art.px.js slime slime_old`, or `--vs HEAD --diff` (also `--vs before_dir/` for uncommitted folders) |
| inspect exact pixels, tight bounds, pivot offsets, or 3D parts | `pxl ascii art.px.js slime --trim --anchor --parts` (accepts multiple names at once) |
| know what is where in a scene, what covers what | `pxl describe art.px.js meadow` (`--brief` when busy) |
| find which line (and 3D part) painted a pixel | `pxl steps art.px.js slime --at 3,2` |
| print debug values from inside a `.px.js` file | call `log("tag", value)` anywhere in your art code (prints during `build` / `shot`) |
| check before calling it done | `pxl check art.px.js` (see below; `--edges` checks contour cleanup) |
| post it | `pxl build art.px.js --share 4`: every asset 4 times bigger in `out/share/`, clean, a GIF when it moves |
| get around a long file | `pxl list art.px.js --own --find slime` (each definition's line range and comment) |
| look up an op or option | `pxl help <name>`; `pxl help` alone for the index |
| take a ready prop, tree, character, or mount instead of drawing it | `pxl lib` lists the library, `pxl lib <entry>` prints a card and the `include` that takes it, `pxl lib draft make3d.oak --genre topdown16` turns a 3D one to a genre's camera ([lib/README.md](../lib/README.md)) |
| match a reference sprite's silhouette or diff pixel colors | `pxl compare art.px.js hero ref.png --shrink 2`; `pxl compare ref.png` alone measures its rows |
| hold a new part to one you approved, row by row or pixel by pixel | `pxl compare art.px.js head_new head_old --anchor --pixels` (or `other.px.js:head`) |
| learn from finished art, a frame folder, or a 3D model | `pxl study ref.gif`, `pxl study frames/ --px 1`, or `pxl study model.stl` |
| preview a 3D reference model from multiple angles | `pxl shot model.stl --dirs 5 --pitch 20` (also `.glb`, `.obj`, `.blend`; `--up y` if tipped) |
| convert `.blend` ↔ `.glb` or render headless Blender turnarounds | `pxl blender model.blend --out model.glb` (`--dry` previews the command) |
| measure one thing moving in a reference | `pxl study ref.gif --at x,y,w,h` (its box every frame, its spacing; the region in the drawing's own pixels, as `shot` shows it) |
| move, recolor, flip or add a thing in a scene without reading the file | `pxl inspect art.px.js meadow --find red`, then `pxl edit` ([above](#relations-rules-and-edits-by-name)) |
| fix a scene's rule that fails (a gap too wide, the rock inside the house) | `pxl check art.px.js --fix` changes the one number that makes it hold and says which |
| turn an exported 3D model or Gaussian splat `.ply` round | `pxl serve art.px.js`, then the viewer's "3D" link |

`pxl check` makes every check `describe` can warn on (facing, feet on the ground, lit side,
lettering, and more) on every scene at every frame, and exits 1 when it finds anything. Its LOOK lines don't fail it: they point at the L-corners and jaggies of
sprites drawn by hand and at tones side by side too close to tell apart. `pxl shot` rings those
pixels in `<name>_look.png`. Delete a doubled step on a smooth line; keep a corner the shape has.

## Starting from a reference

Give pxl the picture, clip, folder of PNG frames, or 3D model you want to learn from — PNG, GIF,
JPEG, WebP (animated too), video, a folder of frames, or a `.stl`, `.glb`, `.obj`, or `.blend` mesh:

```sh
pxl shot ref.gif                # every frame of a clip on one sheet, at 1x
pxl study ref.gif               # what it is made of, and what to use in pxl for each part
pxl study frames_dir/ --px 1    # a folder of native-resolution PNG frames as an animation
pxl shot figurine.stl           # orthographic 5-angle turnaround sheet + proportions
pxl study figurine.stl          # geometry, watertight/symmetry stats, 10-band silhouette + sprite size hints
```

For **2D art and clips**, `study` reads pixel art back at 1× (even when posted enlarged or blurred;
pass `--px 1` for native 1× frames) for its palette, ramps and hue shifts, outlines, dithering,
anti-aliasing, banding, line faults (L-corners, jaggies) and light. It reads a photo or painting for
its masses of light and dark and its colors, translated into a small picture to draw over. It finds
the perspective (horizon, vanishing points). In a clip it also finds:

- the timing, the cycle and whether the loop closes; a GIF of exactly one cycle of an idle or a run
  in place is read as that cycle;
- the parallax planes and their speeds, as bands of rows or as planes that share rows (a city's far
  blocks behind its near ones);
- each moving piece (walks, things carried, anims in place, attacks with their smears, effects,
  translucent floating ghosts, overlapping movers, lights), cut out of the background, with the
  spacing of what travels (easing, anticipation, overshoot, squash and stretch).

For **3D models** (`.stl` 3D-printing files, `.glb`, `.obj`, and `.blend` via Blender), `pxl shot`
renders a clean orthographic multi-angle turnaround sheet (with embedded textures or VisCAM colors,
defaulting to `--up z` for `.stl` and `--up y` for `.glb`/`.obj`; pass `--up y` or `--up z` if a
file is tipped). `pxl study` adds triangle/vertex counts, watertight/volume checks for `.stl`,
left-right symmetry score, a 10-band height silhouette profile, and suggested pixel-art canvas sizes.

Everything goes to `out/_study/` next to the input: a sheet to look at, the palette as `.hex`, and
(for clips) each piece as a strip. `--no-out` prints the text only.

## Where to read next

- [reference.md](../reference.md): every op and option. Search it with `pxl help <name>`.
- [scenes.md](../scenes.md): layout, ground, texture, distance, true perspective, parallax, shadows,
  one-shot effects, a game's screen and projections.
- [characters.md](../characters.md): proportions, faces, views, clean lines and anti-aliasing,
  animating with parts (timing an action, squash and stretch, walks), rigs, a body in 3D with its
  head baked and retouched (§3). What the tutorials teach about lines, anti-aliasing, clusters and
  timing is in §4, §7, §10 and §12 (frame counts measured on Saint11's cards).
- [environment.md](../environment.md): grass, trees, bushes, rocks, walls and paths as games draw
  them, with kits to start from (`lib/nature/kit.px.js`, its old path `examples/nature/kit.px.js`
  still working; tree species in their seasons, `lib/nature/trees.px.js`, shown by
  `examples/nature/trees.px.js`).
- [lighting.md](../lighting.md): lamps, light blocked by walls, normal maps, glow.
- [lib/README.md](../lib/README.md): the library, props, trees, characters and stages to `include`
  rather than redraw (`pxl lib`, `pxl lib draft`), and the genres: a profile in
  [`lib/profiles/`](../lib/profiles) holds a genre's camera, grid and sizes as data, read back by
  `genre()` (`pxl help "scenes 18"`).
- Effects as shaders do them (a dissolve, an aura, wind, energy), particles, trails and spells:
  `pxl help effects` and `pxl help abilities`, then [`spells.px.js`](../examples/spells.px.js),
  [`spell_variants.px.js`](../examples/spell_variants.px.js) and
  [`hd2d/clearing.px.js`](../examples/hd2d/clearing.px.js).
- [rotation.md](../rotation.md): turning sprites by any angle, 8 or 16 directions.
- 3D as code (a tree, a rock, a house, mist, voxels, described in meters and drawn as pixel art):
  `pxl help "scenes 17"`, then [`examples/sdf/`](../examples/sdf), starting with `world.px.js`.
- [`examples/`](../examples): finished files to copy the structure of. Start with `basics.px.js`;
  for a game, `platformer.px.js` and `topdown.px.js` (tilesets laid out as levels) and
  [`topdown_hero/`](../examples/topdown_hero) (a character in four directions, a tagged sheet); for
  an HD-2D scene (pixel-art sprites in a 3D diorama), [`hd2d/`](../examples/hd2d); for a top-down
  scene whose props are drawn in 3D and turned, [`shrine/`](../examples/shrine).
  [examples/README.md](../examples/README.md) says which example teaches what.

Art files can be `.ts`: add `/// <reference path="<pxl>/types/pxl.d.ts" />` at the top for editor
completion.

## Troubleshooting

- **An error.** It names `file:line:col`, the asset, layer and op, and often suggests a fix. One
  broken asset doesn't stop the others from building.
- **An error ends "the art file's top level declares 'post'"** (or `text`, `frame`...). A helper of
  yours has the name of one of pxl's ops and hides it in the whole file, so the call meant for pxl's
  went to yours. Rename yours (`pole`, not `post`).
- **`node: bad option` or a syntax error inside pxl.** Your Node is older than 22.18.
- **A video, JPEG or WebP won't open.** Install `ffmpeg` and make sure `ffmpeg -version` runs.
- **`study` reads a reference at the wrong size** (its `Kind:` line says 8x where you count 16 screen
  pixels to an art pixel; it happens on blurred copies). Give the size: `pxl study ref.png --px 16`.
- **A plane judders, or a warning says it does.** Give `scroll()` a `per` that moves it a whole
  number of px a frame; the warning names one.
- **A preview GIF is many MB.** Build with `--every 3` (the GIFs in `out/` keep every frame), or
  look first with `pxl shot art.px.js scene --gif --every 3`, which builds only those frames.
- **The computer slows to a crawl.** A long scene's build or check keeps a core busy for minutes
  (pxl runs below normal priority) and pxl's own test run several: run one at a time, look with
  `pxl shot` (one asset, the frames you name) rather than a whole `build`, and stop `pxl serve`
  when you're done with it.
- **Running an example filled the repository with `out/` folders.** Commands write next to the art
  file; pass `--out <some scratch folder>`. `out/` is ignored by git.
