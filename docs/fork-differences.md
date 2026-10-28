# Fork differences

This fork, [augusto-scarvalho/claude-pxl](https://github.com/augusto-scarvalho/claude-pxl), is
**451 commits ahead** of the original, [crsolver/claude-pxl](https://github.com/crsolver/claude-pxl),
and none behind. The work spans October 16–27, 2026. Everything the original does still works; this
page lists what the fork adds. Every commit is in
[the comparison on GitHub](https://github.com/crsolver/claude-pxl/compare/main...augusto-scarvalho:claude-pxl:main).

## Contents

- [At a glance](#at-a-glance)
- [Looking and checking](#looking-and-checking)
- [Drawing](#drawing)
- [Characters, animation and rigs](#characters-animation-and-rigs)
- [True perspective and 3D](#true-perspective-and-3d)
- [`pxl study`: learning from finished art](#pxl-study-learning-from-finished-art)
- [Examples](#examples)
- [Speed, size and reliability](#speed-size-and-reliability)
- [How it was built](#how-it-was-built)
- [Known limits](#known-limits)

## At a glance

| | Original (Oct 14) | This fork (Oct 27) |
| --- | --- | --- |
| Commands | 4: `build`, `serve`, `ascii`, `list` | 14: adds `describe`, `shot`, `check`, `steps`, `inspect`, `edit`, `help`, `compare`, `blind`, `study` |
| Engine modules | 16 core, 6 Node | 54 core, 15 Node, plus maintainers' scripts (`calibrate`, `perf`, `hashes`, `vs`, `served`, `pulse`, `meter`, `cpuprofile`, `tokens`, `mhtml`, `model-study`, `eval3d`, `evaledit`, `gallery`) |
| Guides | README, SKILL, reference, lighting | adds [characters](../characters.md), [scenes](../scenes.md), [environment](../environment.md), [rotation](../rotation.md), [getting started](getting-started.md), [working with an agent](agents.md), [BACKLOG](../BACKLOG.md) |
| Example files | 13 | 77 |
| Tests | 59 | 404 |

## Looking and checking

The original could build and serve. The fork lets an agent see and verify its own art, one call per
look, in text where text is cheaper than an image.

| Command | What it gives |
| --- | --- |
| `pxl describe` | A whole scene as text: each object's position, gaps, what covers it, contrast, motion, which way it faces, the light. `--diff` against the last look, `--brief`, `--frame N`; works on plain PNGs too. |
| `pxl shot` | One asset built and written as a PNG to look at, with what changed since the last shot and the check's lines (LOOK pixels ringed in `<name>_look.png`). Frames side by side (`0-17`, `all`; in rows when too wide: a contact sheet of a long scene), zoomed regions, several assets or other files in rows, `--vs HEAD --diff` against the committed version. A reference GIF or video too: all its frames on one sheet, at 1×. `--gif` plays several side by side, each its own loop (a walk in 8 directions); `--every N` builds one frame in N, a long scene's preview, its size printed. |
| `pxl check` | Every check `describe` makes, over every scene, rig and frame, and, to look at without failing it, the 1 px lines of every sprite drawn by hand (L-corners, jaggies), and which rules actually ran, so "no warnings" can't hide a check that never applied. `--readings` shows each light reading. |
| `pxl steps` | The painting log as text; `--at x,y` names the source line that painted a pixel. |
| `pxl inspect`, `pxl edit` | A small change without reading the file: a scene's things by id, where the file writes each value and the operations each takes; the edit (move, set, recolor, flip, relation, swap, as, add) written where the value lives, guarded so nothing else changes, with `describe --diff` by id. Measured against editing the script ([evaluation-edit.md](evaluation-edit.md): six edits, Sonnet at low effort, one run an arm, US$1.39): both right on all six with nothing else changed; its context 4 to 8.5k tokens whatever the file, 29 to 41% cheaper on a 660-line file, even on small ones, and 2.5 times slower (each edit rebuilds the scene). |
| `pxl list` | A file as a map: each definition's line range and comment, so an agent reads only the lines it needs. |
| `pxl help` | Every op and option by section; `help <name>` prints the reference text and where the examples use it; guide sections on demand. |
| `pxl compare` | An asset against a reference image or another asset (a new head against an approved one), row by row; a picture alone, its own rows' extents to draw to. |
| `pxl blind` | A rig's parts unnamed and shuffled, for a second reader to label; `--check` scores them. |

These were tuned on measured runs of fresh agents: one call per look, all fixes in one turn, short
help, guides read in sections. That cut what each later turn re-reads.

## Drawing

Most of these began as something written by hand in a throwaway script while making a scene, then
moved into the DSL where every scene can use it.

| Area | Added |
| --- | --- |
| Palettes and color | Palette files (`.hex`, `.gpl`, `.pal`, `.txt`) that carry their own keys; `shades()` for a hue-shifted ramp from one color (`sat` for Saint11's saturated lights, a negative `hue` for metals); `rampmap` so imported tones never merge; radial gradients; layer blend modes and real opacity; included files keep their own palette. |
| Shapes and strokes | `curve()` through points, `arc()` for slashes and smears, `capsule` for limbs, `flame`, 9-slice panels for UI, bitmap fonts with a ready 5×7 (lowercase too; `mono` for a score or a timer); `wire()` and `curve()` pixel-perfect. |
| Outlines and light | `aa: true` anti-aliases inner edges as by hand (a strip half the step long, in the key between); `inline` and `selout` outlines, `relight` and `plate()` for lit parts, cast shadows (also from a point light: a fire, a lamp), `glow` that keeps what glows as drawn; `bump("hybrid")`, normal maps made the way Sprite Fusion makes them (the outline's volume plus the shading; its settings, its file format), and normal atlases laid out like every animation and sheet. |
| Placing things | `pivot` (which point a stamp lands on), `smear` (motion blur: the silhouette swept from where it was), `sub` stamps half a pixel along (subpixel motion, edges in the in-between key), `wrap` for seamless tiles, `scatter` with `even` and `near` (along the edge of a color), sockets and sorted layers, `register` for frames aligned on a marked point. |
| Tiles and maps | Tilemap corner tiles, isometric tilemaps, export to Tiled (`.tmj`), sheet extrude against texture bleeding. |
| Rotation | Free angles, `directions()` for 8 or 16 views, RotSprite checked on real sprites, and a rotation guide. |
| Import and export | `build --share N` (each asset N times bigger, clean, to post), PNG import (`shrink`, `palettize` to the nearest key in OKLab), Aseprite export (layers, frames, tags, palette, slices), GIFs that keep small figures' colors in lit scenes. |
| Procedural | `hash`, `vnoise`, `fbm`, `bayer`, `seamless`; `scroll()` for parallax planes, `clouds()`, `plume()` for smoke and steam. |
| Effects | `effect()`: what a shader does, done on the CPU on a sprite, an anim's frame or a layer, on the clock and a seed, so every frame is the same in the viewer, `shot` and the exports: `dissolve` (noise holes with burning rings), `pixelate`, `dither` to the palette, `tint` (kept in the palette with `ramp`), `distort` (a UV distortion that loops), `sway` (a plant in the wind: its foot still, its rows bending by their height, each copy out of step with `reseed`, a gust across the scene with `delay`, grass parted where someone walks through it with `push`; in `mesh()` its shadow sways too), `emit` (the pixels marked as giving light, the mark travelling with them, through any angle too), `aura` (the silhouette grown into a flickering glow that hugs every pose); the dissolve in patterns (sweeps, radial, scatter, scanlines, a painted mask). `smoke()`: a column on a path, a puff, a bank or a ring of lit billows in three opacities. In `mesh()`: what emits is drawn as it is and lights what is round it (a lamp for each glowing part with `light: { each: true }`), faces dissolve with holes that let the sun through, and sprites blend over what is behind (`alpha`, `add`, `screen`) at their depth, thick smoke throwing a faint shadow (`veil`). |
| Spell kit | `spell(element, tier, { from, to })`: a whole cast in one call on `ability()`, `emitter()`, `particles()`, `trail()` and `smoke()`, drawn by `cast()` (what it draws gives light, its lamps light the ground, a flash, a shake). Nine elements (fire, ice, lightning, water, earth, wind, light, dark, heal), each a recipe of a ramp, a noise, how its particles fly, how it moves and what it does to what it hits; three tiers in the Final Fantasy way, scaling its size, particles, time, light, glow and the drama of its impact (a shockwave; a centerpiece filling the picture, a flash, a mark on the ground); a guide to designing one's own. Variants with a form (size, count, facets, jaggedness, debris, how long it stays): solids drawn by the volume method (ice in flat facets with a cold rim and glints, rock lumpy with cracks and moss) rising, falling with a turn, cracking and breaking up; quakes, slides, novas, blizzards, waves, chains. Views: the same spell in a world seen from the side, from above, in isometric 2:1 or through a perspective() camera; after a `mesh()` through that camera it is drawn in the diorama's depth (a wall in front hides it) and its lamps light it (`S.lamps(t)`). A cast in one cell of a sheet can shake the whole scene (`cast(S, { shake: false })`, `shake(S)`). |
| Abilities | `ability()` for a spell's phases on the clock (charge, cast, travel, impact, dissipate) and a point along its way, `emitter()` for seeded particles in closed form, `particles()` and `trail()` drawn on the clock (any frame sought alone comes out the same), `effect("energy")` for its matter, a placement's `fx` (effects on one copy), `c.socket()` and `c.meshSocket()` for a hand. The dissolve's looks: what eats a thing (a burn, acid, magic, frost, or a neutral ring by default), its edge's colors over the progress, a char band ahead of it, glow, seeded debris. |
| The ground and what grows on it | An [environment guide](../environment.md): grass, trees, bushes, rocks, walls, paths and small things as 16-bit games draw them, from SLYNYRD's, Saint11's and final boss blues' tutorials and `pxl study` on seven games' sheets, with the numbers to check a drawing against; and a [nature kit](../examples/nature/kit.px.js) to include, with builders for more (`grassTile`, `pine`, `bush`, `rampart`). |

## Characters, animation and rigs

People and creatures have a guide and tools of their own, from a 16 px sprite to a 72 px knight built
skeleton first.

- **Guide:** [characters.md](../characters.md), with measured proportions, a build order, faces and
  views, drawing over a base body, and reducing a bigger version and cleaning it by hand.
- **Character tools:** `runs()`, `pose()`, reference layers, `pxl compare`, PNG shrink.
- **Motion:** motion guides with CC0 walk and run cycles, pingpong and reverse anims, onion skin in
  the viewer and an onion review sheet.
- **Secondary motion:** `warp` for small whole-pixel offsets, `chain()` for hair that follows with lag
  (Celeste-style).
- **Feet that stay planted:** `gait()`'s planted foot goes back at an even speed and gives the walk's
  `pace`; `route({ pace: (dir) => ... })` walks each leg at its way's, so a story's figure doesn't slide.
- **Rigs:** `rig()` and `figure()` build big figures skeleton first and say which way each part
  faces, how tall it is and where it stands.
  - `ik()` poses limbs from their joints.
  - `twin` gives a sprite and its mirror, lit by the same light.
  - A turned rig maps its parts by name.
  - Checks flag a part facing the wrong way, the front marker, the lit side and parallel parts.

## True perspective and 3D

Scenes can be laid out in meters through a camera instead of placed by eye; every height and shadow
follows from it.

| Op | What it does |
| --- | --- |
| `perspective()` | A pinhole camera in meters: one point; two points (`yaw`, the camera turned); three points (`pitch`, tilted up or down); `bend` for a road that curves. HD-2D's camera by px to the meter where it looks (`{ w, h, pitch, fov, ppm }`), with its floor and wall texels and `aim()`. |
| Scene `sizes`, `pixel` | One scene drawn at several sizes (`sizes: { plaza_hd: 4 }`): the camera, sprites, blocks, sockets and the 3D ops follow the art's pixel, `post()` runs only there in the art's px. |
| `look3d()` | The light and materials the 3D ops take when a call doesn't say them, once in a kit. |
| `draw3d(thing, { as })`, `turnaround()` | One thing drawn as its surface, voxels, splats or a mesh (its shadow the field's), per call or per world part; a 3D thing turned into a family of sprites from 4 (iso's diagonals), 8, 16 or N headings, named by the compass, mirrored where symmetric. |
| `mesh()`'s `stand`, `air` | Sprites standing on the model's faces instead of heights by hand; `pxl check` says when a sprite's feet are off the face under them. |
| `light: "mesh"` | Things drawn in 3D (`surface()`, `volume()`, `draw3d()`) after a `mesh()` with a sun take its sun and sky (by default) on their tones and the sun's share in their shadows, so they stand among a diorama's sprites in its light: the graveyard's `graveyard_3d` (a dead tree of rods swaying, a gate swinging on its hinges, a ground mist) beside the scene it was made from. |
| `plane()`, stamp `fit` | Flat ground drawn through the camera; sprites sized by their distance, with hand-drawn small sizes picked automatically. |
| `terrain()` | Hills and mountains from a height function, lit and fading with distance. |
| `solids()`, `shadows()` | Things built of solid shapes, each face lit by the side it faces, casting its shadow from one sun. |
| `ray()`, `toward()` | Where a screen point lands in the world, and where the sun or any direction sits in the picture. |
| `mesh()`, `model()` | Flat faces in meters drawn with a depth per pixel, like the race's car interior, modelled after a Supra A80; materials tiled with pixel-art textures (laid a texel to a pixel of the picture, anchored to a face, clear texels holes), and sprites standing among the faces in the same depth, on contact shadows (HD-2D's dioramas), or through `surface()`'s side, top and iso views; light in the world on them: a sun with shadows (sprites throw theirs, turned to it), a sky, lamps, sprites lit through their normal maps. A material can be drawn in blocks of a sprite's pixel (`block`), its outline only on its shaded side: pixel art among an HD picture's faces (the graveyard's fence). |
| `post()` | What the camera does after: depth of field by `mesh()`'s depth (the tilt-shift look of HD-2D), haze, bloom, vignette, in linear light, at 1920x1080 in about a second a frame. Then the finish: Three's bloom beside pxl's (`levels`; its blur sums only near what is bright, a frame at 1920x1080 0.6 s to 0.3 s), a grade from a `.cube` LUT or a LUT strip PNG, film grain seeded by the frame in blocks of the art's pixel, a sharpen, and `palette` to take the picture back to the palette's colors. |

| `sdf`, `surface()` | Things described as distance fields in meters: primitives (sphere, rounded box, capsule tapering, cylinder, cone, torus, plane, ellipsoid), joined plainly or smoothly, moved, twisted, bent, mirrored, repeated, pushed by seeded noise, painted by region; any number read from the clock. Four kinds kept apart: distance, occupancy, density, appearance. `surface()` draws one as pixel art (ramps stepped by the light, its own shadows, clusters, an outline away from the light, normals, depth) from the side, the top, in iso, or through a `mesh()` camera at its depth with its shadow on what is drawn; each field's distance compiled to one function. |
| `sdf.voxels`, `voxels()`, `sdf.mesh`, `export3d` | The same fields as voxel grids (cells of any size in meters, per axis too: slabs, bricks) drawn as pixel-art cubes, a tone to each face (darker at the creases with `ao`, as block games shade corners) and the outline on the shaded side, in iso, top and side on the pixel grid (a cube `px` wide; a field drawn on the same grid lines up with them) or through a camera at its depth, things of different cells in one world; as meshes by surface nets for `mesh()`; written as MagicaVoxel `.vox` (past 256 a side, several models in place), `.obj` and glTF `.glb` (Y up), each read back; something that moves as one `.glb` that plays its moments. `pxl serve` shows the `.glb` and `.ply` to turn round with the mouse (`/3d`, three.js from a CDN). |
| `sdf.density`, `volume()` | Densities from the same shapes: a soft edge eaten by seeded noise that flows through them on the clock and closes its loop, thinning away up; drawn as pixel art, ray-marched through their own light on a grid, a few tones of their ramp in clusters, dithered where thin (in the palette, or laid over by alpha); through a `mesh()` camera hidden by what is nearer and over what is behind, their shadow on the ground, and what glows lighting what is round it: a cloud, a ground mist, smoke, a magic orb. |
| `sdf.splats`, `splats()` | Procedural Gaussian splats, experimental: a field's surface as flat discs along its normals, a density's inside as round blobs; a CPU rasterizer to pixel art (each ellipse through the camera, the nearest first, 3DGS's blending, snapped to the ramps in clusters, dithered where thin, outlined); written as a `.ply` in 3D Gaussian Splatting's layout for Spark and other viewers. The reference tree as surface, voxels, mesh and splats in four cameras side by side. |
| `sdf.scatter`, `decal()`, `make3d`, `world3d`, `draw3d`, `expect3d` | A 3D scene an agent edits by name: details scattered on a form (leaves, moss, snow) drawn as pixel-art brushes that sway with it; hand-drawn decals pinned on a form a texel to a pixel, cut by its silhouette and depth, a drawing per view (front, three quarters, profile), blinking, glowing, or wrapped round it; builders with parameters that mean something (a tree's canopy, twist and wind, a pine's tiers and snow, a bush, a rock's moss, a house's door, windows and sign); a world of named parts with a seed each, placed by relations (on, beside, around, attached to a socket), whose local edits leave the rest byte for byte as it was (`changed` says which parts moved); what part painted each pixel in `pxl steps --at`, through stamps too; rules over the loop (above, on, apart, near, reaches, within; one before another, one while another) run by `pxl check`, and `pxl check --fix` fixing a failing one with one number, no model. |
| `docs/evaluation-3d.md`, `scripts/eval3d.ts` | Whether the 3D layer helps agents: a protocol for four comparisons (primitives or builders, a rewrite or a local edit, fixes by the model or by numbers, a screenshot with or without the trace), measured part by part (what an edit changed that it shouldn't have, from which part painted each pixel), each run once an arm with headless agents (US$1.57 in all): the scene as data kept approved parts whether rewritten or edited, the rewrite at half again the cost; the numeric fixer did the model's fixes with no model. |

Five scenes are built on this: a road across the sertão, a park at 2 pm in two-point perspective, the
end of the Cretaceous in three-point, a street race from the driver's seat, and two HD-2D dioramas (a
plaza, a graveyard on a hill).

## `pxl study`: learning from finished art

Give `pxl study` a PNG, GIF, JPEG, WebP or video, pixel art or not. It reports what the piece is made
of and what to use in pxl to make the same.

- **Reading the picture**
  - The pixel grid of an upscale (exact, blurred, or scaled by a fraction), read at 1×; `--px N` when
    a blurred copy is read at a harmonic of its pixel.
  - Palette and ramps with their hue shifts, counted over the ramps: warmer in the light, cooler, or one
    hue (value only).
  - Outlines against the clear, dithering, anti-aliasing, clusters, banding, pillow shading.
  - A line's faults, after Pedro Medeiros and Saint11: L-corners (a doubled step) and jaggies (runs out
    of order), with positions, or the lines named as drawn square. Near-twin colors and ramp steps too
    close to read, a tone that glares (eyeburn), dither pairs too far apart in a ramp, a halo outside the
    outline, the value range. Lone pixels counted without a dither's or anti-aliasing's, split into
    specks (noise) and points (glints). A flat backdrop is taken for clear. On the sheet the line's
    faults are ringed.
  - The light's direction off the rim (after Johnson and Farid), tiles, values, color temperature.
  - A photo or painting translated by superpixels into a small picture to draw over.
  - A sheet of sprites apart (a game's ripped sheet) taken apart: sprites by row, their sizes (a
    figure's height), each move's frames, spacing, colors to a sprite, parts to build frames from,
    sides drawn or flipped; labels, boxes, masks and normal maps told apart. Read on 38 sheets of
    twenty games, from A Link to the Past to Triangle Strategy, in [characters.md §13](../characters.md).
  - How its biggest things are built (a tree, a bush, a rock): the patches they are painted in, where
    their lights and darks sit, how their outline turns, their deep shadow, their strokes, how their hue
    turns from shade to light; numbers to hold a drawing against the games'.
- **Perspective:** straight edges (LSD) and where they meet: one, two or three vanishing points, with
  the lens, the turn and the tilt they imply; an isometric picture by its two sets of parallel lines
  (2:1 or 30°); a camera looking down from high up (an HD-2D diorama) by its horizon above the
  picture, with the tilt each lens would give, not taken for uprights meeting above; no three-point
  reading through a lens wider than 120°.
- **Motion:** timing and holds, the cycle, whether the loop closes, parallax planes and their speeds
  to a fraction of a pixel, a camera moving forward (the ground going by under its point: a
  waterfall's splash spreading up from where it lands is not one).
- **Pieces:** an animation taken apart, each piece with what to build it with.
  - Kinds: the backdrop, planes, things carried along a path, walks, traffic, anims in place, rigs,
    actions (an attack, with the frames of its smears), effects (fire, water, an explosion played
    once), lights.
  - Light is told apart first (after Weiss 2001, Matsushita 2004, Koppal and Narasimhan 2006), so a
    lamp pulsing isn't taken for a thing. Each light gets its source, strength and color.
  - Each object is isolated: pixels that change in the same frames, joined by rhythm or by a shared
    still body.
  - Each object is followed by a SORT-like tracker that carries hidden things on by their speed, and
    through what breaks a track: a leap or a dash (a thing just set off reaches farther; one left
    without a match takes the one piece near it, ahead), a smear (its drawing found in the bigger
    piece, the streak left out of its box), and a long rest (the place it left isn't taken for a lamp
    going off).
  - A part swung about a still body (an axe on an arm) is told from a thing carried: it passes over
    its pivot every frame, and a thing carried never stays over one point.
  - Each capture is cut out of its background, GrabCut-style. Files: a sheet, a strip, and a box per
    frame for every piece.
- **Timing per drawing**, and "on twos" or "threes" when every drawing is held alike; per piece too.
- **A region asked for** (`--at` on a clip): what moves in it followed frame by frame, its box,
  spacing and squash, and an effect played once (where it flashes, peaks and fades).
- **Cycles**: a second half that is the first flipped (draw half), and the bob.
- **Spacing:** for a thing carried, an action or a jump, its steps frame to frame: speeding up, slowing, even,
  holds, a move back first (anticipation), past its rest and back (overshoot), a box squashing and
  stretching with its area.
- **Subpixel:** edges moving by part of a pixel through in-between tones are told from whole-pixel
  moves, with the tones a clip uses and between which colors; a piece moving so (an idle) is marked and not
  taken for an attack or a fire (after ApplefatGOV's How-to-subpixel).
- **Cleaning the input:** an editor's transparency checker exported with a sprite is taken for clear.
  A reflection under it, over the checker or a plain floor, is told (its row and opacity) and set
  aside.

### Calibration

`scripts/calibrate.ts` checks study against the examples' own source code: where each stamped thing
really is, frame by frame, and what changes only because the light does. Where a scene lights itself,
the light is 69–76% found and 73–99% right.

Share of each scene's moving things' frames that study finds, before and after the last round of fixes:

| Scene | Before | Now |
| --- | ---: | ---: |
| Tropical forest | 42% | **53%** |
| Halloween party | 33% | **44%** |
| Tournament | 36% | **43%** |
| Park | 0% | **33%** |
| Cave | 50% | 33% |
| Sunset cliff | 31% | 25% |
| Road (sertão) | 0% | **22%** |
| Cyberpunk street | 6% | **10%** |

`--summary` prints a line a scene, `--save` keeps a run, and `--vs <revision | saved run>` runs the
same harness on another revision (in its own git worktree) and prints each scene before → now, with
the things whose score moved most. Every change to study in the last rounds was kept or dropped on
that comparison.

What moved it: a ground truth that follows each stamp whatever its name, pixels grouped by common fate,
a tracker that carries hidden things on, and no light looked for where something goes by. The cave fell
on one mushroom at the line; the sunset's clouds now come apart one by one. The last round, on what
breaks a track (leaps, a dash's crouch, smears, a long rest), found the cyberpunk street's cars 31 to
33 with its masks 39/43% to 42/47% (precision/recall), each frame's share a point lower; Saint11's
squash card's dash and the parallax card's hopping ball now read in one piece, and smeared leaps
over a still floor no longer read as a plane going by or a loop that closes.

## Examples

45 new example files are finished scenes an agent copies the structure of; each was curated against
references until it read right.

| Example | What it teaches |
| --- | --- |
| [`platformer`](../examples/platformer.px.js), [`topdown`](../examples/topdown.px.js), [`isometric`](../examples/isometric.px.js) | Tilesets laid out as levels: tilemaps, corner tiles generated in code, isometric blocks. |
| [`topdown_hero/`](../examples/topdown_hero) | A top-down game character in four directions: a colored dummy animated first, the costume painted over it, idle, walk, run and a sword attack at a game's timings, a tagged sheet. |
| [`sidescroller/`](../examples/sidescroller) | A game's art over several files: a shared palette, seamless tiles, PNG import, a hit flash. |
| [`tropical/`](../examples/tropical) | A 320×240 animated forest: imported trees, river, trail tileset, animals, a girl walking with hair that swings. |
| [`halloween/`](../examples/halloween) | A night party: many lamps, point-light shadows, eight dancing monsters. |
| [`sunset/`](../examples/sunset) | A backlit cliff at sunset: long shadows toward us, glowing edges, a tent lit through. |
| [`rig/`](../examples/rig) | A 72 px knight built skeleton first, two knights fighting a bout at a tournament, and a warden's whirling axe combo on the 3D layer (`rig3d()`), the body turning with the swing, with smears and a floor reflection. |
| [`cyberpunk/`](../examples/cyberpunk) | One city street made two ways: by one agent, and by a planner with eight forked agents. |
| [`perspective/`](../examples/perspective) | The sertão road, the park at 2 pm, the end of the Cretaceous, a street race from the cockpit. |
| [`nature/`](../examples/nature) | The nature kit: grass tiles, pines, bushes, rocks, a wall, flagstones, tufts, flowers, a dead tree. |
| [`hd2d/`](../examples/hd2d) | HD-2D dioramas: a plaza in a pine wood at the end of the afternoon, textured boxes, the hero walking behind a low wall, long shadows, lit lamps; and a graveyard on a hill in the morning mist, its grass, stones, headstones and pines drawn after the games' sheets, a traveler and a mourner drawn as Octopath draws its people; each at 1920x1080 through `post()`. Its pines and dead tree built as volumes in 3D and swaying in the wind, leaves blowing across. The traveler's visit walks his eight directions and ends in a parchment dialogue box. And a harbor after Octopath Traveler II: a galleon bobbing at a pier, sails sewn of panels, water with glints, bokeh and the hull's reflection, a crew dressed on the traveler's skeleton with heads of their own, Alden's passage aboard in a dialogue. And a clearing at dusk with every shader at once: the wood swaying in one wind, the traveler's new cast pose, a fireball of energy with an aura, hidden behind a wall on its way, a scarecrow catching fire and burning away with its shadow, smoke and sparks, through Three's bloom, a LUT and a still grain. |
| [`parallax/`](../examples/parallax) | A steam train crossing the hills of Minas Gerais, planes going by at their own speeds. |
| [`fonts/`](../examples/fonts) | A 5×7 font for titles. |
| [`spells`](../examples/spells.px.js) | The spell kit's sheet: nine elements at three tiers, each cast one call, lighting a dusk and blooming. |
| [`spell_variants`](../examples/spell_variants.px.js) | The spell kit's variants (an iceberg, a glacier, a blizzard, a nova; a spire, a boulder, a quake, a slide; a meteor, waves, a chain, blades, a rain of light, grasping shadows, leaves) and four spells seen from the side, from above, in isometric and through a perspective camera. |
| [`shrine/`](../examples/shrine), [`nature/trees`](../examples/nature/trees.px.js), [`nature/japan`](../examples/nature/japan.px.js) | A Japanese shrine courtyard in autumn, top-down: a miko on `rig3d` (a hybrid head) sweeping leaves along a temple path laid by `lane()`, a torii, a hall, lanterns and kitsune drawn in 3D by `turnaround` under one sun; a kit of tree species (momiji, ginkgo, kuromatsu) in every season, built on one shared grower; the Japanese ground (ishidatami, raked gravel, stepping stones). |

## Speed, size and reliability

- GIFs store only what changed in each frame: the gallery went from 34.5 MB to 8.5 MB.
- Art files run in a vm context that isn't contextified, so their own hot loops read globals (`Math`,
  their helpers) at full speed: the HD-2D figures' builds went 6x faster (the crew's check 9.9 s to
  1.5 s, the extinction's 9.7 s to 0.9 s, every example's hashes 1m46s to 56 s), every pixel the same.
- The tests run in about a minute (they took nearly two, then 70 s): the examples' check in worker
  threads, one per four of the machine's (more gave nothing), the slowest of the last run first, the
  study's tests in two files that run at once, tests that draw only the frames they look at (the
  spell variants' 16 s to 0.1 s); `npm run test:quick` leaves out the
  two slowest (every example's check, the gallery's study) for about 20 s while iterating, and
  `PXL_EXAMPLES=hd2d` checks one folder of examples; the HD-2D examples' own hot loops were made
  faster with every pixel the same (the harbor's check 28 s to 10 s, the suite 80 s to 58 s); `study` reads a long clip a third faster (the train's 192 frames, 34 to 23 s) and
  `check` runs two to three times faster on the heaviest scenes, every output the same.
- Every `pxl` command starts in half the time (0.5 s to 0.25 s): Node's compile cache keeps pxl's
  sources compiled between runs. The tests use it too: `npm test` 67 s to about 52 s and `test:quick`
  22 s to about 19 s on a 4-core laptop, with `check` reading a drawing's lit side once however many
  frames show it and letting a long loop's checked frames go (the city street's check 1.3 GB to
  0.8 GB, sodium_hour's 1.3 GB to 150 MB).
- Light on a laptop: `pxl` and the tests run below normal priority, so a long render or test run waits
  for the user's own programs instead of freezing them. The tests run three files at a time and the
  examples' check in two threads on a 4-core laptop: seven files and four threads took as long (the
  quick suite 21 s either way) and burned a fifth more processor. The `/3d` page draws only when the
  model or the view changes, not 60 times a second.
- `SKILL.md`, loaded into every session that draws, is a map again: 30 KB to 13.5 KB (about 7.5k
  tokens to 3.5k), each part pointing to the guide sections, `pxl help` and `pxl --help`; the examples'
  table is `examples/README.md`, and a test keeps SKILL.md under 14,000 characters. The examples'
  check is skipped when nothing it reads changed since it last passed (a commit of docs only saves
  its minute).
- Lit scenes keep small figures' colors in GIFs (a weighted median cut refined by k-means).
- Timed builds are cached within a budget of bytes, so a long loop no longer fills memory.
- `build --profile` names where the time went; `build --every N` keeps long previews small; the onion
  sheet no longer costs frames squared.
- Tests went from 59 to 327. One keeps the editor types in step with what the runtime accepts, and
  another keeps the guides in step with the CLI: every command, flag, section and link they cite exists.
- An art file whose own top-level name hides one of pxl's ops (a helper `post` hiding `post()`) is
  named in the error its load fails with, instead of only "item 2 is undefined".

## How it was built

Every change was made by Claude while drawing real scenes, and reviewed by a person on a curation page:
228 entries, each with its picture and the note that asked for it.

- **Dogfooding:** each scene was drawn with pxl itself; every friction went to `FEEDBACK.md` and became
  a fix or a doc line. Work first done in throwaway scripts (camera math, noise, shadow sweeps) moved
  into the engine in three waves.
- **Levels of abstraction, wave 1:** what the examples wrote by hand became the DSL's, each proven by
  rewriting an example with 0 pixels changed: `tween()` and `unroll()` for poses on a clock,
  `A.frame()`, `span`, `fade` and `since` for timing by an ability's phases, `make3d.define()` for a
  world's own builders (a part's `mats` and `look`, the wind a property of what was built),
  `c.cross()` and `c.moved()` for things crossing a loop, `stamp`'s `shade` and a rig slot's `far`;
  the lit-side check reads the lamps and a `mesh()`'s light without `world.light`, and a top-level name
  hiding a DSL global is a warning as the file loads.
- **Levels of abstraction, wave 3, characters in 3D:** the two private figure engines (the
  traveler's and the warden's: a camera, IK, a z-buffer of tubes and balls) became the 3D layer's:
  `rig3d()` (a skeleton posed in 3D, its parts distance fields along the bones drawn by `surface()` in
  every direction, flat blocks to judge a move, joints, raw fields and a draw hook as escape hatches),
  `views()` (heads by view mirrored about an anchor and their rows checked, or a modeled head drawn once
  per view with its face painted over by hand: the 3D's hair and beards, the hand's faces), `gait()` (a
  walk's numbers by view) and `sdf.field()`. The traveler, the mourner, the harbor's crew and the warden
  stand on them; `pxl check` reads every pose of every figure.
- **Measured agent runs:** fresh agents were given only the skill and timed. A 320×180 animated street
  took one agent 85 turns and 31 minutes. A planner with eight forked agents made a denser street for
  about five times the tokens and twice the time. The skill now asks which to use on a big scene.
  One new scene drawn in seventeen runs of models and effort levels in Claude Code, the Codex CLI and Antigravity
  ([the model study](model-study.md)): on Opus the cost doubled at every step of effort, and xhigh
  was the sweet spot; Codex drew each scene for under $3.25 in minutes, and the curator found them
  all well below Claude's (a blind agent judging stills had ranked two of them first).
- **Tokens measured:** the agent sessions' transcripts show two thirds of the cost is the model's
  thinking, kept and read again every turn; guides dumped whole and art files rewritten whole were
  most of the rest that could go. The skill now reads guides by section and edits instead of
  rewriting ([what it costs](agents.md#what-it-costs)); `scripts/tokens.ts` reads any session.
- **Tutorials read:** 31 saved pages (Saint11, Pedro Medeiros, Pixel Joint, the subpixel threads) gave
  the outline push for subpixel motion, the line, palette and cluster readings in study, a pixel-perfect
  `wire()` (study found its doubled steps) and the lessons on lines, anti-aliasing, timing an action,
  very low resolution and one-shot effects in the guides.
- **Docs checked against the code:** six full reviews of the written skill, every tool and option
  tried, with fixes where the docs and the code disagreed.
- **Calibration against the source:** for `pxl study`, the gallery scenes' own code is the ground truth
  ([above](#calibration)).

## Known limits

The gaps that remain are in `pxl study`, and they are measured, not guessed.

- Big animated things that touch, like the tournament's two knights in their bout against the stands,
  come out as one piece. Parting them by their colors was tried and measured: no better.
- Soft clouds drifting slowly still read as light, because a pulsing glow's rings shift a pixel too.
  Telling them apart by drift cost the party and the cyberpunk street more than it gave.
- Fast traffic crossing itself is followed only in part (the cyberpunk street, lowest in the table).
- Two scenes scored lower in the last round, the cave and the sunset ([the table](#calibration)).
- Not done: modelling the light as a few basis images (NMF). Where scenes light themselves the light is
  already 71–99% right, and the misses are clouds and backlit people.

The full list of what is open lives in [BACKLOG.md](../BACKLOG.md).
