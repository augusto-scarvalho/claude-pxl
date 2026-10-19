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

1. Read the [example](#examples) closest to what you're making (`PXL list <file>` maps it: read the
   lines you need) and start from the template below.
2. Look with one call: `PXL shot art.px.js <name>` builds just that asset and writes
   `out/_shot/<name>.png` (read it). Its text says what changed since your last shot of it (pixels
   and where, so an edit that did nothing shows) and the warnings `check` finds on it.
   `--frames 0,12,30` puts frames side by side, `--at x,y,w,h` enlarges a part (again for another
   part, a column each); more names (another file's as `other.px.js:name`, or any PNG at 1×) make a
   row each, to compare. Exact pixels: `PXL ascii art.px.js <name>` (keys + rulers, cheaper than an
   image). Scenes: `PXL describe art.px.js <scene>` (`--brief` when busy) gives each object's
   position, gaps, cover, contrast and motion as text: answer layout questions from it, not by
   eyeballing (`--frame N` for another frame).
3. Fix everything one look showed, then look again: send all the edits in the same message
   (parallel tool calls are one turn, and every turn re-reads the whole conversation, so a turn
   per edit is what makes a long session expensive). `PXL describe ... --diff` lists the objects an
   edit moved, redrew or recolored; `PXL shot ... --vs HEAD --diff` shows the last
   committed version above and the pixels that changed below. A wrong pixel: `PXL steps art.px.js
   <name> --at x,y` names the line that painted it.
4. `PXL build art.px.js` writes the outputs: PNGs, sheets, GIFs, and previews in `out/_preview/`
   (checkerboard = transparent, pixel grid; anims also `<name>_onion.png`, a motion map + onion
   skin). `--only a,b` for some of them; a long loop's preview GIF runs to many MB, `--every 3`
   keeps one frame in three. A build that has grown slow: `--profile` names the functions where
   the time went, in your file and in pxl.
5. Before handing over, run `PXL check art.px.js`: every check describe makes, on every scene and
   rig of the file and every frame of an animated scene, warnings only, with the frames they happen
   at. Fix each or say why it's meant. Its last line says which rules ran: a rule runs only where
   the art says what it needs (`world.light`, `world.ground`, `height`, a `front` socket), so "no
   warnings" with "not run: lit side" checked nothing about the light (a scene lit by a fire or a
   lamp: `world: { light: { at: [x, y] } }`). A lit-side warning that looks wrong: `--readings` shows
   what the rule read on every placement. Then look as a critic. Replacing approved art: keep
   `name_old` beside the new one and show both, `PXL shot art.px.js name name_old`, for the user to
   choose. Matching a reference: `PXL compare art.px.js <name> ref.png [--shrink N]` lists each
   row's extents side by side.
6. If the user wants to watch: start `PXL serve art.px.js` in the background and give them the URL.

Errors name file:line:col and the asset/layer/op, and suggest fixes. One broken asset doesn't stop
the others.

## A big scene: ask how to make it

For a big, busy scene (320×180 and up, many props, animated), ask the user first, with the numbers:

- **One agent** (the default): you plan and draw it all. The cheapest and the most coherent: a
  320×180 animated city street took 85 turns and 31 minutes.
- **A pipeline**: a planner writes `palette.px.js` (keys and ramps only), a plan (per part: its
  file, its assets with the part's name as prefix, box, pivot, where it is stamped, its light, one
  timing for every loop) and the scene file that includes the parts. Then one fork of the planner
  per part draws it in its own file with a `test_<part>` scene, all at once, and a last fork puts
  the scene together. The same street came out denser (more people, cars, shops) but less
  coherent, for ~5× the tokens and ~2× the time.

  Run it from a new session, not from this conversation. A fork carries everything in the session
  that makes it and rereads it on every step: the ~5× was measured with the planner new (~130k of
  context when it forked); forked from a long conversation (500k and more), each of 8-10 forks
  carries all of it, many times the cost, enough to run out a usage limit. So say how long this
  conversation is when you ask. Write the brief to a file; the planner is
  `claude -p --session-id <new uuid> --allowedTools "Bash Read Write Edit Glob Grep" < plan_prompt.txt`,
  each part `claude -p --resume <that uuid> --fork-session --allowedTools "..." < part_prompt.txt`
  (the prompt on stdin: `--add-dir` takes several values and would swallow it). Only when this
  session is still short is a fork of yourself (Claude Code's Agent tool, `subagent_type: "fork"`)
  as cheap.

Both are in `examples/cyberpunk/`; `pipeline/plan.md` is a plan whose parts fit. Included files
share one scope, so every top-level name in a part starts with the part's name.

## Looking things up

Don't read reference.md or characters.md whole: what you read early is paid again on every later
turn (scenes.md and lighting.md are short enough to read whole).
`PXL help` lists every op and option by section, and each guide's sections with their size;
`PXL help <name>` prints what the reference says about it and where the examples use it;
`PXL help "<guide> <numbers or words of a heading>"` prints those sections. Read the ones your
task needs before starting:

| Making | Read |
|---|---|
| a person or humanoid | `PXL help "characters 1 4 5 6 7"` (style, build order, faces, views, placing pixels); 2 and 3 with a reference or existing art, 8 for variants, 10 when limbs animate |
| a small animal | `PXL help "characters 1 9"` |
| a big figure or prop (48 px and up), built part by part on a skeleton | `PXL help "characters 11"` (`rig`) |
| a scene, level, building or environment | [scenes.md](scenes.md), whole (~4.5k tokens) |
| lamps, night, light blocked by walls | [lighting.md](lighting.md), whole (~2k tokens) |
| a turn that isn't a quarter turn; 8/16 directions | `PXL help "rotation short version"`, then "rotation angles" |

An example, or your own file after many edits: `PXL list <file>` maps it (each definition's line
range, the comment above it, what a loop makes on one line). Read those lines, not the file.

## Template

```js
pal({ k: "#1b1630", l: "#c8f0a0", g: "#8ccf63", G: "#4c8a44", t: "#2a5560", w: "#fff6e0", r: "#e2585e", R: "#a63a4c" })
ramps("ktGgl", "kRr")                  // dark -> light, drives shade()/light(); a key in one ramp only (ends shared)

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
  `dir: "pingpong"`; stamping an anim animates the scene, and the scene's own functions then get its
  loop (`c.frame`, `c.frames`, `c.phase`, `c.t`). Limbs, walks, hair: `PXL help "characters 9 10"`.
- **Existing art**: `sprite("x", { png, area, shrink, palettize })`, `anim(..., { png, frames })`;
  `rampmap` maps imported tones onto a ramp without merging them.
- **Out**: `sheet()` (+ JSON with tags), GIFs, Tiled `.tmj` for tilemaps, `build --aseprite` for a
  person to keep editing in Aseprite.
- **Light**: `shade:`/`light:` layers and `cast` shadows, `glow`, `lighting()` (lighting.md).
- **In meters**: `perspective()` (one, two or three points: `yaw`, `pitch`), `plane()` for flat ground,
  `terrain()` for hills and mountains, `solids()`/`shadows()` for things built of `solid` shapes,
  `capsule` for a limb painted round, `flame` for fire; procedural texture with `hash`, `vnoise`, `fbm`, `bayer`
  (scenes.md "True perspective", "Closing a loop").

## Examples

Finished art files in `examples/` (this skill's directory). Copy the structure of the closest one;
`PXL help <op>` shows where each op is used.

| File | Read it for |
|---|---|
| `basics.px.js` | the starter: `mx` + `outline`, `base`/`swap`, parts, `sheet` |
| `platformer.px.js` | a tileset laid out as a level: `tilemap`, `group` variety, tile `sheet`, `include` |
| `topdown.px.js` | overhead RPG island: corner-tile shore generated in code, `scatter`, cast shadows |
| `isometric.px.js` | 2:1 blocks, back-to-front order, iso helpers |
| `perspective/road.px.js` | true perspective: `perspective()` and `plane()`, props in meters whose parts also cast their shadows, a walker shrinking step by step with hand-drawn small sizes picked by `fit` |
| `perspective/park.px.js` | two-point perspective (`yaw`) at 2 pm: benches, trees and people as `solid` shapes drawn by `solids()` and cast by `shadows()`, boxes lit by the side they face, people and a dog posed in 3D by a gait (any heading, own shadows), moving things interleaved far to near with still ones, a loop closed by hiding behind hedges |
| `perspective/extinction.px.js` | three-point perspective (`pitch`, `vertical()`), a worm's-eye view: a volcano on a massif by `terrain()`, lava down the steepest way, the sun at `toward()`, a sky by `ray()`, uprights leaning to the third point, dinosaurs drawn from their profile on a 3D run (legs by `capsule`), pterosaurs by hand placed by the camera, everything burning by `flame` |
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
| `sunset/` | 320×180 backlit scene: long shadows toward us, glowing edges, a tent lit through, a sky that loops slower than the rest |
| `rig/tournament.px.js` | the knights in a scene: ground in perspective with every height checked, a 96-frame bout with trumpeters and marshal on named cues, pavilions, ground shadows from one sun, distance haze |
| `rig/knight.px.js` | a 72 px knight built skeleton first: `rig`, `figure`, stand-ins, `plate`-lit parts, `twin` parts for the turned rig; poses from `ik`, slashes with `arc` smears; `facing` and `world` read out by describe |
| `cyberpunk/` | a 320×180 animated city street at dusk made two ways: by one agent (`sodium_hour.px.js`) and by a pipeline (`pipeline/`: the plan, the palette, eight part files, the scene) |
| `fonts/font5x7.px.js` | a 5×7 font for titles: `include` it, `text(..., { font: "5x7" })` |

Every command run on an example writes an `out/` next to it (build, shot, describe): give it
`--out <scratch dir>` to keep the skill clean, e.g. `PXL shot <skill dir>/examples/shop.px.js
comet_repair --out <scratch dir>`.

## Habits that give better art

- Write half of anything symmetric (`mx`) and let `outline` draw outlines (`selout` takes a dark
  shade of what it touches, `inline` stays inside). Shine is a lighter tone of the color, not white.
  Something on one side only (a shine, a shadow side): mirror a `_part`, stamp it, then draw it.
- Small organic shapes (a face, a leaf, an item icon) are grids, pixel by pixel; primitives are for
  structure, large areas and long lines. Never big hand grids.
- Every mark on a surface needs a cause (seams, weathering, story): no filler `noise` or `dither`.
- 2–4 shades per material, mnemonic keys (`g`/`G`).
- Look with `shot` while iterating; `build` when you need the files.

## When pxl gets in your way

If something cost you a rebuild or a workaround (a misleading error, a missing op, a doc that sent
you wrong, a trap), add one line to `FEEDBACK.md` in this skill's directory (create it if missing):
the date, the kind of asset, what happened in pxl, what would have helped. pxl's side only, never
the project. The file stays out of git; the curators turn its lines into fixes and docs.
