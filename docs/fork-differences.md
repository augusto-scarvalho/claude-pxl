# Fork differences

This fork, [augusto-scarvalho/claude-pxl](https://github.com/augusto-scarvalho/claude-pxl), is
**283 commits ahead** of the original, [crsolver/claude-pxl](https://github.com/crsolver/claude-pxl),
and none behind. The work spans October 16–21, 2026. Everything the original does still works; this
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

| | Original (Oct 14) | This fork (Oct 21) |
| --- | --- | --- |
| Commands | 4: `build`, `serve`, `ascii`, `list` | 12: adds `describe`, `shot`, `check`, `steps`, `help`, `compare`, `blind`, `study` |
| Engine modules | 16 core, 6 Node | 31 core, 14 Node, plus `scripts/calibrate.ts` |
| Guides | README, SKILL, reference, lighting | adds [characters](../characters.md), [scenes](../scenes.md), [rotation](../rotation.md), [getting started](getting-started.md), [working with an agent](agents.md), [BACKLOG](../BACKLOG.md) |
| Example files | 13 | 52 |
| Tests | 59 | 226 |

## Looking and checking

The original could build and serve. The fork lets an agent see and verify its own art, one call per
look, in text where text is cheaper than an image.

| Command | What it gives |
| --- | --- |
| `pxl describe` | A whole scene as text: each object's position, gaps, what covers it, contrast, motion, which way it faces, the light. `--diff` against the last look, `--brief`, `--frame N`; works on plain PNGs too. |
| `pxl shot` | One asset built and written as a PNG to look at, with what changed since the last shot and the check's lines (LOOK pixels ringed in `<name>_look.png`). Frames side by side (`0-17`, `all`), zoomed regions, several assets or other files in rows, `--vs HEAD --diff` against the committed version. A reference GIF or video too: all its frames on one sheet, at 1×. |
| `pxl check` | Every check `describe` makes, over every scene, rig and frame, and, to look at without failing it, the 1 px lines of every sprite drawn by hand (L-corners, jaggies), and which rules actually ran, so "no warnings" can't hide a check that never applied. `--readings` shows each light reading. |
| `pxl steps` | The painting log as text; `--at x,y` names the source line that painted a pixel. |
| `pxl list` | A file as a map: each definition's line range and comment, so an agent reads only the lines it needs. |
| `pxl help` | Every op and option by section; `help <name>` prints the reference text and where the examples use it; guide sections on demand. |
| `pxl compare` | An asset against a reference image, row by row. |
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
| Outlines and light | `aa: true` anti-aliases inner edges as by hand (a strip half the step long, in the key between); `inline` and `selout` outlines, `relight` and `plate()` for lit parts, cast shadows (also from a point light: a fire, a lamp), `glow` that keeps what glows as drawn. |
| Placing things | `pivot` (which point a stamp lands on), `smear` (motion blur: the silhouette swept from where it was), `sub` stamps half a pixel along (subpixel motion, edges in the in-between key), `wrap` for seamless tiles, `scatter` with `even` and `near` (along the edge of a color), sockets and sorted layers, `register` for frames aligned on a marked point. |
| Tiles and maps | Tilemap corner tiles, isometric tilemaps, export to Tiled (`.tmj`), sheet extrude against texture bleeding. |
| Rotation | Free angles, `directions()` for 8 or 16 views, RotSprite checked on real sprites, and a rotation guide. |
| Import and export | `build --share N` (each asset N times bigger, clean, to post), PNG import (`shrink`, `palettize` to the nearest key in OKLab), Aseprite export (layers, frames, tags, palette, slices), GIFs that keep small figures' colors in lit scenes. |
| Procedural | `hash`, `vnoise`, `fbm`, `bayer`, `seamless`; `scroll()` for parallax planes, `clouds()`, `plume()` for smoke and steam. |

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
| `perspective()` | A pinhole camera in meters: one point; two points (`yaw`, the camera turned); three points (`pitch`, tilted up or down); `bend` for a road that curves. |
| `plane()`, stamp `fit` | Flat ground drawn through the camera; sprites sized by their distance, with hand-drawn small sizes picked automatically. |
| `terrain()` | Hills and mountains from a height function, lit and fading with distance. |
| `solids()`, `shadows()` | Things built of solid shapes, each face lit by the side it faces, casting its shadow from one sun. |
| `ray()`, `toward()` | Where a screen point lands in the world, and where the sun or any direction sits in the picture. |
| `mesh()`, `model()` | Flat faces in meters drawn with a depth per pixel, like the race's car interior, modelled after a Supra A80. |

Four scenes are built on this: a road across the sertão, a park at 2 pm in two-point perspective, the
end of the Cretaceous in three-point, and a street race from the driver's seat.

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
- **Perspective:** straight edges (LSD) and where they meet: one, two or three vanishing points, with
  the lens, the turn and the tilt they imply.
- **Motion:** timing and holds, the cycle, whether the loop closes, parallax planes and their speeds
  to a fraction of a pixel, a camera moving forward.
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

37 new example files are finished scenes an agent copies the structure of; each was curated against
references until it read right.

| Example | What it teaches |
| --- | --- |
| [`platformer`](../examples/platformer.px.js), [`topdown`](../examples/topdown.px.js), [`isometric`](../examples/isometric.px.js) | Tilesets laid out as levels: tilemaps, corner tiles generated in code, isometric blocks. |
| [`sidescroller/`](../examples/sidescroller) | A game's art over several files: a shared palette, seamless tiles, PNG import, a hit flash. |
| [`tropical/`](../examples/tropical) | A 320×240 animated forest: imported trees, river, trail tileset, animals, a girl walking with hair that swings. |
| [`halloween/`](../examples/halloween) | A night party: many lamps, point-light shadows, eight dancing monsters. |
| [`sunset/`](../examples/sunset) | A backlit cliff at sunset: long shadows toward us, glowing edges, a tent lit through. |
| [`rig/`](../examples/rig) | A 72 px knight built skeleton first, two knights fighting a bout at a tournament, and a warden's whirling axe combo on a skeleton in 3D, the body turning with the swing, with smears and a floor reflection. |
| [`cyberpunk/`](../examples/cyberpunk) | One city street made two ways: by one agent, and by a planner with eight forked agents. |
| [`perspective/`](../examples/perspective) | The sertão road, the park at 2 pm, the end of the Cretaceous, a street race from the cockpit. |
| [`parallax/`](../examples/parallax) | A steam train crossing the hills of Minas Gerais, planes going by at their own speeds. |
| [`fonts/`](../examples/fonts) | A 5×7 font for titles. |

## Speed, size and reliability

- GIFs store only what changed in each frame: the gallery went from 34.5 MB to 8.5 MB.
- The tests run in about a minute (they took nearly two): the examples' check in worker threads, the
  longest first; `study` reads a long clip a third faster (the train's 192 frames, 34 to 23 s) and
  `check` runs two to three times faster on the heaviest scenes, every output the same.
- Lit scenes keep small figures' colors in GIFs (a weighted median cut refined by k-means).
- Timed builds are cached within a budget of bytes, so a long loop no longer fills memory.
- `build --profile` names where the time went; `build --every N` keeps long previews small; the onion
  sheet no longer costs frames squared.
- Tests went from 59 to 226. One keeps the editor types in step with what the runtime accepts, and
  another keeps the guides in step with the CLI: every command, flag and section they cite exists.

## How it was built

Every change was made by Claude while drawing real scenes, and reviewed by a person on a curation page:
223 entries, each with its picture and the note that asked for it.

- **Dogfooding:** each scene was drawn with pxl itself; every friction went to `FEEDBACK.md` and became
  a fix or a doc line. Work first done in throwaway scripts (camera math, noise, shadow sweeps) moved
  into the engine in three waves.
- **Measured agent runs:** fresh agents were given only the skill and timed. A 320×180 animated street
  took one agent 85 turns and 31 minutes. A planner with eight forked agents made a denser street for
  about five times the tokens and twice the time. The skill now asks which to use on a big scene.
- **Tutorials read:** 31 saved pages (Saint11, Pedro Medeiros, Pixel Joint, the subpixel threads) gave
  the outline push for subpixel motion, the line, palette and cluster readings in study, a pixel-perfect
  `wire()` (study found its doubled steps) and the lessons on lines, anti-aliasing, timing an action,
  very low resolution and one-shot effects in the guides.
- **Docs checked against the code:** four full reviews of the written skill, every tool and option
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
