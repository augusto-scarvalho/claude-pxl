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
and GIF need nothing.

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
(`--no-out` to skip them, `--port` for another port). A file that exports 3D models (`export3d`) gets a
"3D" link in the viewer: http://127.0.0.1:4321/3d turns them round with the mouse.

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

## Loops, clocks and sheets

- **A scene's clock.** A scene runs on the clock of the animations it stamps. When its own functions
  pick what to draw by time (a hero who walks, then swings), give it a clock of its own:
  `scene("test", { w, h, frames: 48, fps: 12 }, ...)`. Otherwise its loop is the least common
  multiple of its animations' loops. [`examples/topdown_hero/`](../examples/topdown_hero) does this.
- **Things going by.** `scroll()` moves a strip that wraps across the picture, one call per parallax
  plane; `axis: "y"` moves it down instead (a shooter's backdrop). A plane should move a whole number
  of px a frame, or 1 px every so many frames: otherwise it judders, and pxl warns and names a speed
  that doesn't. `clouds()` and `plume()` (smoke, steam) close their loops too
  (`pxl help "scenes 8 9 10"`).
- **Sheets for a game.** `sheet("hero", ["idle_*", "walk_*"], { rows: "tag" })` puts each animation
  on a row of its own, and the sheet's preview GIF plays every animation in it at once.

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
- **A head, both ways.** Model it (the skull, the hair, a hat), bake it once per view with
  `views(name, field, { retouch })` (five views for eight directions, the east the west's mirror),
  then paint its face over each view by hand (`"."` keeps the render's pixel, `"_"` erases one). The
  3D gets the hair's volume right; a face of fields and decals read worse than a painted one. Baked
  once, it costs nothing a frame (`pxl help "a body that turns"`; the traveler, the miko).
- **What didn't work:** a whole tree as splats (soft blobs beside the same tree drawn by
  `surface()`); a figure pre-rendered in Blender (a stiff borrowed walk, turns stuck at the angles
  rendered, every fix of a proportion a round trip through another program).

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
out/sprites/<name>.png            each sprite at 1x (+ <name>_n.png when it has a normal map)
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
| see one asset now, without building everything | `pxl shot art.px.js slime` writes `out/_shot/slime.png` |
| see some frames side by side (in rows when too wide), or a part enlarged | `pxl shot art.px.js slime_hop --frames all --at 0,0,8,8` |
| watch several animations play side by side | `pxl shot art.px.js walk_s walk_w walk_n --gif` writes one GIF |
| preview a long scene as a GIF, quickly | `pxl shot art.px.js street --gif --every 4` builds one frame in four and prints its size |
| check the values (lights and darks) without the color | `pxl shot art.px.js meadow --grey` adds the same picture in greys |
| see the guide layers (`ref: true`: guide rows, a skeleton) over the art | `pxl shot art.px.js meadow --ref` |
| compare two versions | `pxl shot art.px.js slime slime_old`, or `--vs HEAD --diff` against your last commit |
| the exact pixels as text | `pxl ascii art.px.js slime` |
| know what is where in a scene, what covers what | `pxl describe art.px.js meadow` (`--brief` when busy) |
| find which line painted a pixel | `pxl steps art.px.js slime --at 3,2` |
| check before calling it done | `pxl check art.px.js` (see below) |
| post it | `pxl build art.px.js --share 4`: every asset 4 times bigger in `out/share/`, clean, a GIF when it moves |
| get around a long file | `pxl list art.px.js` (each definition's line range and comment) |
| look up an op or option | `pxl help <name>`; `pxl help` alone for the index |
| match a reference sprite's silhouette | `pxl compare art.px.js hero ref.png --shrink 2`; `pxl compare ref.png` alone measures its rows |
| hold a new part to one you approved, row by row | `pxl compare art.px.js head_new head_old` (or `other.px.js:head`) |
| learn from finished art or a reference | `pxl study ref.gif` |
| measure one thing moving in a reference | `pxl study ref.gif --at x,y,w,h` (its box every frame, its spacing; the region in the drawing's own pixels, as `shot` shows it) |
| fix a 3D scene's rule that fails (the rock inside the house, the house off the ground) | `pxl check art.px.js --fix` changes the one number that makes it hold and says which |
| turn an exported 3D model round | `pxl serve art.px.js`, then the viewer's "3D" link |

`pxl check` makes every check `describe` can warn on (facing, feet on the ground, lit side,
lettering, and more) on every scene at every frame, and exits 1 when it finds anything. Its LOOK lines don't fail it: they point at the L-corners and jaggies of
sprites drawn by hand and at tones side by side too close to tell apart. `pxl shot` rings those
pixels in `<name>_look.png`. Delete a doubled step on a smooth line; keep a corner the shape has.

## Starting from a reference

Give pxl the picture you want to learn from, a PNG, GIF, JPEG, WebP (animated too) or video, pixel
art or not:

```sh
pxl shot ref.gif            # every frame of the clip on one sheet, at 1x
pxl study ref.gif           # what it is made of, and what to use in pxl for each part
```

`study` reads pixel art back at 1× (even when it was posted enlarged or blurred) for its palette,
ramps and their hue shifts, outlines, dithering, anti-aliasing, banding, the faults of its lines
(L-corners, jaggies) and its light. It reads a photo or painting for its masses of light and dark
and its colors, translated into a small picture to draw over. It finds the perspective (horizon,
vanishing points). In a clip it also finds:

- the timing, the cycle and whether the loop closes; a GIF of exactly one cycle of an idle or a run
  in place is read as that cycle;
- the parallax planes and their speeds, as bands of rows or as planes that share rows (a city's far
  blocks behind its near ones);
- each moving piece (walks, things carried, anims in place, attacks with their smears, effects,
  lights), cut out of the background, with the spacing of what travels (easing, anticipation,
  overshoot, squash and stretch).

Everything goes to `out/_study/` next to the picture: a sheet to look at, the palette as `.hex`, and
each piece as a strip. `--no-out` prints the text only.

## Where to read next

- [reference.md](../reference.md): every op and option. Search it with `pxl help <name>`.
- [scenes.md](../scenes.md): layout, ground, texture, distance, true perspective, parallax, shadows,
  one-shot effects, a game's screen and projections.
- [characters.md](../characters.md): proportions, faces, views, clean lines and anti-aliasing,
  animating with parts (timing an action, squash and stretch, walks), rigs, a body in 3D with its
  head baked and retouched (§3). What the tutorials teach about lines, anti-aliasing, clusters and
  timing is in §4, §7, §10 and §12 (frame counts measured on Saint11's cards).
- [environment.md](../environment.md): grass, trees, bushes, rocks, walls and paths as games draw
  them, with kits to start from (`examples/nature/kit.px.js`; tree species in their seasons,
  `examples/nature/trees.px.js`).
- [lighting.md](../lighting.md): lamps, light blocked by walls, normal maps, glow.
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
