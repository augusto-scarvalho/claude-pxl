# Getting started

pxl turns a short JavaScript file into pixel art: PNGs, sprite sheets with JSON, animated GIFs, Tiled
maps and Aseprite files. This page takes you from nothing to a sprite, an animation and a scene, then
shows where each command fits. For the full API see [reference.md](../reference.md); to have an AI
agent draw for you, see [Working with an agent](agents.md).

## Contents

- [Install](#install)
- [Your first sprite](#your-first-sprite)
- [Watch it while you edit](#watch-it-while-you-edit)
- [An animation and a scene](#an-animation-and-a-scene)
- [What a build writes](#what-a-build-writes)
- [Which command, when](#which-command-when)
- [Starting from a reference](#starting-from-a-reference)
- [Where to read next](#where-to-read-next)
- [Troubleshooting](#troubleshooting)

## Install

You need Node 22.18 or newer (`node -v`). pxl has no runtime dependencies and no build step.

```sh
git clone https://github.com/augusto-scarvalho/claude-pxl.git
cd claude-pxl
node bin/pxl.js            # prints every command and its options
```

Below, `pxl` means `node bin/pxl.js` in the clone (or `node <path to the clone>/bin/pxl.js` from
anywhere). Without cloning, `npx github:augusto-scarvalho/claude-pxl <command>` runs the same CLI.

Reading videos, JPEG or WebP (only `pxl study` and `pxl shot` do) needs `ffmpeg` on your PATH. PNG
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
(`--no-out` to skip them, `--port` for another port).

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

## What a build writes

```
out/sprites/<name>.png            each sprite at 1x (+ <name>_n.png when it has a normal map)
out/anims/<name>.png .json .gif   a strip of the frames, Aseprite-style JSON (tags), the playback
out/scenes/<name>.png             each scene (+ a GIF when it moves, a folder of layers with layers: true,
                                  a Tiled .tmj when it holds tilemaps)
out/<sheet>.png .json             each sheet() and its JSON (frames, tags)
out/_preview/                     enlarged previews; anims also get <name>_onion.png (onion skin)
out/share/                        with --share N: each asset N times bigger, clean (no grid), to post
```

Useful options: `--only a,b` builds some assets; `--out DIR` writes elsewhere; `--share 4` writes
each asset 4 times bigger in `out/share/`, clean for posting (a whole number: pixel art at 2.5× has
pixels of two sizes); `--aseprite` also
writes each asset as an `.aseprite` file to keep editing by hand (copy it out of `out/`: the next
build overwrites it); `--every 3` keeps one frame in three in the preview GIFs of a long loop;
`--profile` says where a slow build spends its time.

## Which command, when

| You want to | Run |
| --- | --- |
| see one asset now, without building everything | `pxl shot art.px.js slime` writes `out/_shot/slime.png` |
| see some frames side by side, or a part enlarged | `pxl shot art.px.js slime_hop --frames all --at 0,0,8,8` |
| compare two versions | `pxl shot art.px.js slime slime_old`, or `--vs HEAD --diff` against your last commit |
| the exact pixels as text | `pxl ascii art.px.js slime` |
| know what is where in a scene, what covers what | `pxl describe art.px.js meadow` (`--brief` when busy) |
| find which line painted a pixel | `pxl steps art.px.js slime --at 3,2` |
| check before calling it done | `pxl check art.px.js` (a scene's facing, feet on the ground and lit side at every frame; and, to look at, the lines and near-identical tones of sprites drawn by hand; `pxl shot` rings those pixels in `<name>_look.png`) |
| post it | `pxl build art.px.js --share 4`: every asset 4 times bigger in `out/share/`, clean, a GIF when it moves |
| get around a long file | `pxl list art.px.js` (each definition's line range and comment) |
| look up an op or option | `pxl help <name>`; `pxl help` alone for the index |
| match a reference sprite's silhouette | `pxl compare art.px.js hero ref.png --shrink 2` |
| learn from finished art or a reference | `pxl study ref.gif` |
| measure one thing moving in a reference | `pxl study ref.gif --at x,y,w,h` (its box every frame, its spacing; the region in the drawing's own pixels, as `shot` shows it) |

`pxl` alone prints every command with all its options.

## Starting from a reference

Give pxl the picture you want to learn from, a PNG, GIF, JPEG, WebP or video, pixel art or not:

```sh
pxl shot ref.gif            # every frame of the clip on one sheet, at 1x
pxl study ref.gif           # what it is made of, and what to use in pxl for each part
```

`study` reads pixel art back at 1× (even when it was posted enlarged or blurred) for its palette,
ramps and their hue shifts, outlines, dithering, anti-aliasing, banding, the faults of its lines
(L-corners, jaggies) and its light; a photo or painting for its masses of light and dark and its
colors, translated into a small picture to draw over. It finds the perspective (horizon, vanishing
points), and in a clip the timing, the loop, parallax planes and each moving piece (walks, things
carried, anims in place, attacks with their smears, effects, lights), cut out of the background,
with the spacing of what travels (easing, anticipation, overshoot, squash and stretch). Everything
goes to `out/_study/` next to the picture: a sheet to look at, the palette as `.hex`, and each piece
as a strip.

What the tutorials teach about lines, anti-aliasing, clusters and timing is in
[characters.md](../characters.md) §4, §7, §10 and §12 (frame counts measured on Saint11's cards),
effects in [scenes.md](../scenes.md) "One-shot effects", and `pxl check` points at a hand-drawn
sprite's doubled steps and jaggies to look at.

## Where to read next

- [reference.md](../reference.md): every op and option. Search it with `pxl help <name>`.
- [scenes.md](../scenes.md): layout, ground, texture, distance, true perspective, parallax, shadows,
  one-shot effects.
- [characters.md](../characters.md): proportions, faces, views, clean lines and anti-aliasing,
  animating with parts (timing an action, squash and stretch, walks), rigs.
- [lighting.md](../lighting.md): lamps, light blocked by walls, normal maps, glow.
- [rotation.md](../rotation.md): turning sprites by any angle, 8 or 16 directions.
- [`examples/`](../examples): finished files to copy the structure of. [SKILL.md](../SKILL.md) has a
  table of which example teaches what.

Art files can be `.ts`: add `/// <reference path="<pxl>/types/pxl.d.ts" />` at the top for editor
completion.

## Troubleshooting

- **An error.** It names `file:line:col`, the asset, layer and op, and often suggests a fix. One
  broken asset doesn't stop the others from building.
- **`node: bad option` or a syntax error inside pxl.** Your Node is older than 22.18.
- **A video or JPEG won't open.** Install `ffmpeg` and make sure `ffmpeg -version` runs.
- **`study` reads a reference at the wrong size** (its `Kind:` line says 8x where you count 16 screen
  pixels to an art pixel; it happens on blurred copies). Give the size: `pxl study ref.png --px 16`.
- **A preview GIF is many MB.** Build with `--every 3`; the GIFs in `out/` keep every frame.
- **Running an example filled the repository with `out/` folders.** Commands write next to the art
  file; pass `--out <some scratch folder>`. `out/` is ignored by git.
