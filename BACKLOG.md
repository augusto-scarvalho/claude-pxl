# Backlog

Features to add, ordered by value for the cost. References are what Aseprite / Pixelorama call it.
Mark items `[x]` when they ship, with the commit.

## Now: basic, cheap, high value

- [x] **Pivot / anchor**: `pivot: "bottom" | "center" | [x, y]` on an asset. `stamp`, `scatter` and
  wire hangs place the pivot on the given point; flips and rotations carry it; sheet JSON exports
  it. (Aseprite slice pivot.) Fixes "props in iso need hardcoded sizes".
- [x] **Tile mode**: `wrap: true | "x" | "y"` on an asset: drawing past an edge continues on the
  other side and the preview shows the tile 3x3. (Aseprite Tiled Mode, Pixelorama Tile Mode.)
  `offset(dx, dy)` skipped: with wrapped drawing there was nothing left for it to fix; add it if a
  seam ever needs rolling into view.
- [x] **Palette files**: `use("file.hex" | ".gpl" | ".pal")`, relative to the art file (Lospec
  downloads). (Both editors load palettes.)
- [x] **Import PNG**: `sprite("hero", { png: "hero.png", area?, palettize? })`, strips into anims
  with `frames`, `use("art.png")` for an image's palette. The decoder matches Pillow pixel for
  pixel on 200+ real and generated PNGs (indexed 1-8 bit, gray, gray+alpha, 16-bit, RGB, RGBA,
  tRNS); interlaced PNGs fail with a message.
- [x] **Silhouette / flash**: a placement option that paints every opaque pixel one color
  (drop shadows, silhouettes), plus `recolor({ "*": "w" })` for hit-flash frames, which a
  placement can't do once the sprite has a pivot. (Pixelorama Drop Shadow.)
- [x] **Ping-pong**: `anim(..., { dir: "pingpong" | "reverse" })`, exported as the tag direction.
  (Aseprite tag directions.)

## Next

- [x] **`pxl steps <file> <asset>`**: the painting log pxl already records (every op with its args,
  file:line and pixels changed; today only the live viewer replays it) as text: how a complex
  piece is built, step by step. `--at x,y` lists only the steps that touched that pixel (which
  line painted it wrong?); `--sheet` writes thumbnails of the steps for a human.
- [x] **Curves**: `curve(points, c, { width, closed })` through the points (Catmull-Rom), pixel-perfect. (Aseprite
  curve tool + pixel-perfect mode.)
- [x] **Radial gradient**: `grad(..., "r")`, center out to the ellipse that fits the box. (Gradient tool, both editors.)
- [x] **Free rotation**: `angle` (quarter turns exact, shear under 12°, RotSprite otherwise),
  outline after the turn, and `directions()` for 8/16-direction sets via exact quarter turns and
  diagonal mirrors, with hand-drawn poses through `draw`. Study and angle guide in `rotation.md`.
  (Aseprite RotSprite; Paeth three-shear.)
- [x] **cleanEdge or MMPX inside the rotation**: newer edge-aware magnifiers; MMPX could replace
  Scale2x in RotSprite. Only if RotSprite's results fall short on real sprites. Evaluated on the
  examples' sprites (knight parts, palms, girl) at 15°-60°: RotSprite held; the one loss, a 1px
  eye at 60°, happens sampling back at 1×, which no magnifier fixes. Not needed (see `rotation.md`).
- [x] **Inside outline and selout** (`inline`, `selout`) (outline takes the dark shade of the color it touches).
  (Aseprite Outline command.)
- [x] **Hue-shifted ramp generator**: `shades("HGgl", "#5aa040")` defines the keys and their ramp. (Aseprite
  Shading ink, Pixelorama shading with hue shift.)
- [x] **Sheet extrude**: `sheet(..., { extrude: n })` against texture bleeding in engines. (Aseprite export options.)
- [x] **9-slice**: `slice` margins + `panel(name, x, y, w, h)`, exported as Aseprite `meta.slices`. (Aseprite 9-patch slices.)
- [x] **Palette keys in the file** (dogfood): `1a1626 k ink` (a one-character word after the color;
  the name in a `.gpl`), so a shared palette needs no `pal({ k: 0, K: 1, ... })` index mapping.
- [x] **Asset size inside functions**: `c.size("name")` (found building the iso example).

## Characters (from dogfooding a 64 px character)

Each of these was first worked around by hand in an art file or by a Python script on the side.
characters.md has the workflow they serve.

- [x] **`runs()`**: `runs({ 30: [[19, "3H3"], [23, "deeR"]] })` places `[x, chars]` runs at
  absolute x, so nothing in a wide figure is counted by hand.
- [x] **Close outline gaps**: `inline: { color, keep }` turns only light edge pixels into the line
  and keeps the dark ones, selective colours included. Still open: thin parts. Putting the line
  outside fixed one calf and fattened the other, so thin parts stay a hand fix.
- [x] **Downscale on import**: `png` + `shrink: n` takes the most common colour of each block. It
  reproduces the side script exactly, pixel for pixel.
- [x] **Reference / guide layer**: `layer(..., { ref: true })` shows in previews and the live viewer,
  over the art, and is left out of the export, sheets and stamps. (Aseprite reference layer.)
- [x] **Silhouette compare**: `pxl compare art.px.js <asset> ref.png [--shrink N] [--offset x,y]`
  prints each row's opaque extents side by side. Comparing rows like this showed a figure 1–3 px
  too wide per side, which no preview made obvious.
- [x] **Pose skeleton import**: `pose("pose.json", { scale, x, y })` draws a detector's bones and
  joints. It reads `{ name: [x, y, score] }` maps and OpenPose COCO-18 or BODY_25. The detector
  stays outside pxl.

## From the tropical forest

Each was first done by hand in the forest's files; `examples/tropical/` now uses the shipped ones.

- [x] **Projected cast shadows** (ae43468): `stamp(name, x, y, { cast: [0.62, 0.22] })` lays the asset
  flat on the ground from its base (a pixel h above it lands h * (kx, ky) away), after `flip`, for a
  `shade` layer. A `silhouette` stamped at an offset is an upright dark copy: for tall objects it
  reads wrong, and a mirrored palm then throws its shadow the other way.
- [x] **Relight a flat sprite** (ae43468): `relight(where?, { light, reach, strength, ramps })` steps
  every pixel along its ramp by the edges it sits on. A reduced palm (3 greens that `palettize` merged
  into one) gets its depth back with it, pixel for pixel what the hand-written pass did.
- [x] **Corner tilemaps** (ae43468): `tilemap(map, { corners: "#", map: "dirt_" })` reads one char
  per tile corner and picks each tile by its corner mask. The corner-to-mask loop had been
  hand-written twice (topdown.px.js, the forest's trail); reference.md maps an LPC terrain block
  to the masks.

## Animation and editors (from the studio pipeline handoff and a second look at Aseprite / Pixelorama)

The studio pipeline drove Smack Studio (bone rigs), Warp Studio (pin meshes) and mocap guides;
what its curator accepted was drawn poses composed from parts, reviewed as whole cycles. In order:

- [x] **Onion review sheet** (f613acc): `_preview/<anim>_onion.png`, a motion map plus each frame over
  its neighbours' ghosts, wrapping to show the loop seam. (Aseprite / Pixelorama onion skin, as an
  image: an agent can't watch a GIF.)
- [x] **Sockets and sorted layers** (f613acc): `sockets` on assets, `stamp(..., { at: "id.socket" })`,
  `layer({ sort: "y" | "z" })`. Parts attached per pose with a draw order per frame; top-down depth
  sort. (Aseprite cel z-index; engines' y-sort.)
- [x] **Motion guides per frame** (c43c0e1): `motion("walk.json", { dir, scale, at })` reads a guide (joints per
  frame, which foot is down, which limb is nearer) and `pose(frame, { sides: true })` draws it, limbs
  colored by side; anim previews show `ref` layers. CC0 walk and run cycles in 8 directions ship in
  `examples/motion/`, converted from the pipeline's projections; the tropical girl walks with them.
  Skipped: dimming inferred joints (the CC0 projections have none).
- [x] **Register by a point**: move each frame so a marked point (the pelvis) lands on the same x, with
  one y offset per cycle; never by the bounding box. `register: "m"` (or `{ key, x }`) on a sprite
  or anim: a marker pixel per frame, best in a `ref: true` layer (in the art it's erased once found);
  each frame moves sideways to put it on x, y left alone (the bob; a constant offset is the pivot's
  or a layer's job).
- [x] **Small warps for secondary motion** (b20305a): `warp((x, y) => [dx, dy], where?)`, whole-pixel
  offsets read back from each pixel's new place (no holes, no new colors): the useful side of Warp's
  pins. The forest's breathing and the jaguar's shear became one line each (identical output). For the
  walking girl's hair it fell short: a stretch on the rise alone read as a twitch, so the hair became
  a part drawn in four poses, picked a frame late. Skipped: `breathe` / `sway` helpers (each is one line of
  `warp`; recipes in characters.md §9). Not for bending limbs.
- [x] **Scatter near a color** (67bc9ee): `scatter(..., { on: "g", near: "aAo", within: 3 })`, and scatter
  picks sort with stamps in `sort` layers. The forest's hand-computed trail-edge grass became one
  scatter. (Selection border / expand in both editors.)
- [x] **Map tones onto a ramp by luminance** (c64d91d): `rampmap(ramp, { where, hue })`, an op rather than
  an import option, so it works on anything drawn too. The palm's hand-written color map became two
  rampmaps (identical output). (Pixelorama Gradient Map.)
- [x] **Export `.aseprite`** (f17ed83): `build --aseprite` writes layers, frames with durations, the tag,
  slices and the palette (keys as color names). Outline, shade layers and glow go to one layer over
  the others, so the file shows exactly the built frames; Aseprite 1.3.18 renders the girl's walk and
  the forest pixel for pixel. One way: nothing reads it back. (Documented format; zlib cels.)

- [x] **Hair physics** (35a57b4): `chain(anchors, { links, length, gravity, drag, rest, stiff, move })`,
  Celeste-style: points that follow an anchor with inertia and weight, simulated over the loop until
  it repeats, plus Celeste's way of following (`follow`, `step`, `max`). Asked for after a GameMaker
  hair-physics clip. For the 32 px girl it read wrong (it turned her hair into a point): her hair is
  drawn, cut straight, and its ends swing like a skirt's hem. Kept for long hair, tails and scarves.

- [x] **`pxl describe`** (2df0431): a whole scene as text an agent reads at once (asked as an experiment:
  how to translate a whole image for the model, compressed but semantic). Levels: painting steps by
  source line, placements with repeats folded, cell maps (on top, color, light), and how each
  placement stands out after lighting; exact pixels of a region on request. The Halloween scene:
  ~11k characters against ~60k for its raw keys, and it measured what reading the image only
  suggested (three monsters as dark as the ground around them). Any PNG: index keys and a map of
  repeated 16x16 tiles. Second pass (study: object lists beat raw grids for LLMs, ARC 2305.18354):
  OBJECTS with visible ranges, feet, cover, nearest neighbours by pixel gap, OKLab contrast and
  motion; shapes at any offset on clear backgrounds. Blind readers: preview 66%, first form 77%,
  this 100% (20 questions, two scenes, one held out). Then `--diff` (what changed since the last
  describe: moved, redrawn, recolored, regions; b285ad1), objects in opaque PNGs (large one-color
  patches as background, the rest as objects; touching things merge and lit renders band: 460780d)
  and `--brief` (a third of the size, 96% on the same test).

- [x] **A leaner skill** (c007439): SKILL.md from ~5k to ~2k tokens (the core, a one-level "where to
  look" table); scene guidance moved to `scenes.md`, read only for scenes; `pxl help [name]` looks
  the reference up instead of reading it (~350 tokens for the index, 200-850 per name, against ~9k
  for reference.md); contents lines in the long guides (Anthropic's skill authoring guidance:
  progressive disclosure, scripts over docs, contents for files over 100 lines). Fresh agents with
  each version: same results (6/6 lookups, 4/4 first-try builds), 2-5% fewer tokens on small tasks
  (a subagent's fixed overhead dominates there), fewer tool calls.

Left out on purpose: effects that leave the palette (blur, curves, HSV, convolution), keyframed
tweens and interpolating between drawings, free rotation of cut-out limbs, 2.5D thickness, 3D layers
(render a base in Blender and reduce it instead), mouse-only tools.

## From the tournament bout (rigs in motion): review tooling first, then the engine, in waves

What a long art session wrote again and again in throwaway scripts (cropping and enlarging ~45
times, exact frames of a 96-frame scene, a shell loop of 66 describes, a light-check comparison over
four scenes, three scripts to see what a haze layer reached), and what the knight's file had to build
by hand. Shipped in waves; each item names the friction it removes.

Wave 1: looking and checking
- [x] **`pxl shot <file> <name>`**: `--frames a,b,c` (timeline frames, not the GIF's, which merges
  equal ones), `--at x,y,w,h`, `--scale N`, side by side; `--vs <git rev | file>` puts the same shot
  of another version under it, `--diff` marks the pixels that changed. Before/after pictures without
  copying old versions of a file by hand.
- [x] **`pxl check <file> [names...]`**: every check that can warn (facing, front marker, light,
  parallel, feet, lettering) on every scene and rig of the file, warnings only, the project loaded
  once, exit code 1 when there is any. An animated scene at every frame of its loop, each distinct
  placement (name, layer, position, image) checked once: the tournament's 96 frames hold 2112
  placements, 339 distinct, 4 s. The checks were moved out of describe into one function both use.
  A rig with 33 poses took 66 describes in a loop.
- [x] **`describe --frame N`, `ascii --frame N`**: describe reads frame 0 only, so an effects anim
  reads "nothing drawn", a fight can't be read mid-loop, a baton raised at frame 0 makes a figure
  "10% too tall".
- [x] **The examples' warnings as a test**: what `pxl check` says on every example, every frame, kept
  in `test/examples.checks.txt` (`PXL_UPDATE=1 npm test` after a change you meant). Its first run
  caught a false positive mid-loop: a slash's smear read as a thing lit from the left; effects now go
  on `unlit` layers, which describe doesn't read a lit side off.

Wave 2: describe and small engine features
- [x] **Blend layers in describe**: an opacity / blend / shade layer's line: what it covers, px
  changed per object under it, px hidden by what is in front ("does the haze reach the castle?" took
  three scripts; the part it seemed to miss was behind the tents).
- [x] **`outline: false` on a layer**: keep 1 px ropes, pegs, smears out of the asset's outline
  (reported twice: a tent's guy ropes, a pavilion's).
- [x] **`plate(relightOpts?, ...items)`**, allowed anywhere (layers don't nest): the castle's
  masses, the knight's parts, a hill's crags and the marshal all wrapped `layer(...items, relight())`,
  and the marshal had to repeat its offset on every top-level layer. All four use it now, pixel for
  pixel the same (`pxl shot --vs HEAD --diff`: 0 px changed).
- [x] **`pxl check` says which rules ran**: a rule only runs where the art says what it needs
  (`world.light`, `world.ground`, `height`, a front marker), and on most examples none does: "no
  warnings" read as approval. Its last line now counts where each ran and says why the others didn't.
- [x] **The examples declare what they mean**: 16 example files ran no rule at all. The five whose
  comments state the light (cemetery, tropical forest and plants, island, sunset) declare it now.
  What came up: a palm flipped for variety in the forest carried its light to the wrong side (fixed:
  not flipped); grass tufts and an 8 px frog gave a side from a pixel or two (a side now needs 6 rim
  pixels facing each way, and pxl check skips brushes scattered many times, as describe does); the
  crypt stays a known misreading (its outline is mostly trims). No example states real sizes, so
  none declares heights: feet and size still don't run there, and check says so.

Wave 3: rigs in motion
- [x] **`twin: "<n>_l"` on a sprite**: its items drawn mirrored before lighting, pivot, sockets and
  facing mirrored: a 25-line draw helper wrapped every op to get a part lit for both facings. The
  canvas mirrors x where pixels are read and written, relight takes the light where it really is,
  `c.mirrored` for the hand-lit choices (a blade's lit edge). The knight's parts use it: the turned
  ones are now the exact mirror of the drawing, where the helper rasterized mirrored coordinates (a
  pixel here and there on rims; every part still reads lit from the right side).
- [x] **`turn` with a part-name prefix map** (`turn: { name, parts: ["knight_", "knight_l_"] }`), so
  pose rigs whose slots name shared parts can use it (the knight's 33 poses do: one rig each instead
  of two built by hand, 0 px changed); **`ik(a, b, target, bend)`** in the DSL (two bones for arms
  and legs; the knight's own copy is gone).
- [x] **`arc(cx, cy, r, from, to, c, { inner, taper })`** (smears, halos, partial rings: the bout's
  smears use it) and **`has(name)`** (a generated part defined once without a guard of one's own).
- [x] Docs: included files share one scope (only an error message said so): reference.md says it, and
  the bout names its clock (BOUT_LOOP, BOUT_SIGNAL, BOUT_HOME), which the tournament's clouds,
  trumpeters and marshal read instead of numbers matched by hand.

## Token efficiency (measured on a fresh agent's sunset scene)

Measured with `tools/tokens.py` in the dogfood folder on the agent that made `examples/sunset`
from the skill alone: 149 model calls, context 38k at the start, 285k in the middle, 415k at the
end. Cache reads were 75% of the cost, cache writes 20%, the text it wrote 4%. Every call re-reads
the whole context, so one more call costs ~27k tokens, and a token read at call 10 is paid ~15
times. Of the 377k the context grew, tool results were ~96k (docs and examples read with
`sed`/Read 39k, its own art file re-read 18k, images 16k, `pxl help` 5k), the tool inputs it wrote
~47k, and the rest (~230k) its own reasoning, kept for the whole run because a sub-agent's run is
one turn. So the levers are, in order: fewer calls, less read early, smaller outputs. Each wave is
measured again on the same brief.

Wave 1: fewer calls.
- [x] **One look, all fixes** (SKILL.md habit): send every edit decided from one look in the same
  message (parallel tool calls are one model call), then one shot. The run made 52 edits, mostly
  one per call.
- [x] **`pxl shot` is the loop's step**: it already builds the asset; its text adds the warnings
  `check` finds on it (at the frames shown) and what changed since the last shot of it (pixels,
  box), so the loop is edit → shot → look, with no separate build, check, describe or `| tail`.
  The run chained build + describe + tail in long commands 35 times.
- [x] **`pxl build` of a whole file prints a summary** (counts, warnings, out dir), not one line per
  asset (knight.px.js: 297 lines, ~3k tokens); `--list` for the lines. Shipped together; shot's
  default size also became an area budget (~600k px, what a preview costs) instead of 1600 px wide,
  which made a whole 2:1 scene cost ~2x a preview.

Wave 2: less read early.
- [x] **Short `pxl help`**: the row that defines the name, then one line per other place that
  mentions it (section and sentence), examples capped at 3 (`--all` for the rest). `help stamp`
  is 5.5k characters, mostly whole rows of other ops that mention stamp.
- [x] **Guide sections on demand**: `pxl help "<heading>"` prints that section of a guide, and
  SKILL.md's table names the sections to read (a walk: characters.md §9-10) instead of "whole".
  The run read characters.md whole twice (10k) and reference.md in `sed` slices (7.6k).
- [x] **`pxl list` as a file's map**: each definition's line range, the comment above it, and the
  assets a loop makes grouped on one line (knight.px.js: 330 lines today). Then an agent reads the
  40 lines of the example it needs, and the asset it is fixing in its own file, not the whole file.
  Shipped: `help stamp` 5.5k -> 1.6k characters, `help plate` 3.0k -> 1.2k; `pxl help "characters
  1 9"` prints those sections; `list` of knight.px.js 330 lines (16.6k characters) -> 22 (2.1k).

Measured after waves 1 and 2: four fresh agents on one brief (a 160x120 night campsite, animated),
two with the skill from before the waves (d393d84), two with it after (a282cfc). Early reading
fell ~40% (docs, examples and help: 50k and 56k tokens before, 32k and 32k after), but the runs
cost about the same: cache reads 15.8M and 22.6M before, 18.0M and 18.6M after (-5% on the mean,
less than the gap between the two runs before); 82 and 107 calls before, 92 and 104 after. Two
reasons: the agent's own reasoning is most of the context (each ended near 265k, of which tool
results were ~70k and written text ~20k), and a cheaper look got more looks (30 and 35 shots
after, 22 and 24 builds before). The edits were already batched (each run wrote its fixes as one
script). The art came out alike. So what's left to win is in the reasoning: split runs (wave 3).

Wave 3: experiments, measured before anything is built.
- [x] **Sub-agents for the props of a big scene**: each draws one prop from its spec in a small
  context; the main agent composes. The reasoning that piles up over one long run is most of the
  context; split runs start fresh. Tried, not adopted: the same campsite brief as a pipeline, a
  planner (palette, plan, scene file), five part agents at once, a composer; twice. Each pipeline
  cost ~1.75x a single agent (cache reads 27.5M and 25.8M against ~18.3M, writes ~910k against
  ~265k; 260 and 243 calls against ~98) and took longer (~40 min against ~27). Every agent pays
  the skill and docs again, the part agents still grew to 126-171k (a part is not a small job),
  and the composer alone cost ~8M, reworking parts that didn't fit. The scenes came out about as
  good, cleaner in places. Worth trying again only for scenes whose single run goes past ~400k.
  Then with forks, through the headless CLI: the planner as a session (`claude -p --session-id`),
  each part and the composer as `claude -p --resume <id> --fork-session`. Every fork's first
  request read the planner's 118.6k from the cache (1h TTL for -p runs) and wrote ~3.7k: the
  reasoning stays in a resumed session, so the prefix matches. But the parts cost more, not less
  (2.65M input units against 2.42M and 2.35M with fresh agents; 1h writes at 2x): each fork rereads
  the planner's 118k, reasoning included, on every call, and peaked at 147-205k. The composer got
  cheap (0.53M against ~1.0M, 3.7 min): parts that share the planner's whole picture fit together.
  Total 3.56M against 3.80M for fresh agents and 2.16M for one agent; ~26 min against ~40 and ~27;
  art about as good. Forks help a pipeline a little; one agent is still the cheapest.
  And on the scene a pipeline should win: a 320x180 Night City street at dusk, animated, with
  traffic, people, signs (one headless agent against a planner + 8 part forks + a composer fork).
  The single agent didn't balloon: 85 turns, mean context ~130k, 1.60M input units + 0.77M output
  (x5), 31 min. The pipeline: 350 turns, 8.71M + 3.62M, 5.2x the cost, ~55 min end to end; each
  fork starts at the planner's ~130k and the busiest parts (the shop strip, the signs) and the
  composer (88 turns) grew past it. Its scene came out denser (more people and cars, more shops, a
  hologram) but busier and off the brief's dusty-yellow palette; the single one more coherent. So
  a pipeline buys detail at ~5x the tokens and ~2x the time, a choice to offer, not a default.
- [x] **describe brief by default on busy scenes** (forest: 23k characters full), with a line
  saying how to get the full text.
  Closed, not done: SKILL.md already says `--brief` on busy scenes and the A/B agents used it;
  reading less early didn't move a run's cost, which the agent's own reasoning sets.

Not worth it (measured): images (previews cap at 768 px, ~340 tokens each), a shorter CLI
invocation (~12 tokens a call), new ops for helpers the examples repeat (at most 3 files share
one), and the art code itself (4% of the cost).

## From the campsite A/B runs

- [x] **A point light for the lit-side check**: `world: { light: { at: [x, y] } }` (a fire, a lamp
  in the scene), each object checked against the direction from it to the light. Three of four
  agents lighting a campsite by its fire had to pick one direction for the whole scene and either
  live with warnings on what stands on the fire's other side (a woodpile lit correctly, flagged)
  or leave those objects out of the check.
  Shipped: on two of those campsites, the fire's place as the light cleared every false warning
  (two and one), and a head lit from the wrong side of a fire is still caught (test).
- [x] **A glow that leaves its source as drawn**: `glow(keys, { ramp })` steps up everything in its
  radius, the source asset's own darker pixels too: logs and stones under the flames turned tan and
  lost their shapes. Two agents stamped the fire a second time after the glow. An option to keep
  the glowing asset (or given keys) out of the halo would make that a word instead of a trick.
  Shipped as `keep: "WuRr"` (keys, so it works in a sprite too): on one agent's fire, the stones
  and logs kept their shapes under the halo and the ground around stayed lit.
- [x] **Height of deep things in perspective**: a tent or a log seen at an angle has its far end
  higher on screen, so its box is taller than its front, and describe calls it too tall (a tent
  1.3 m at its front: "drawn 22 px, 32% too tall"). Measure from the front's foot to its top, or
  say what the box includes.
  Shipped as the second: measuring from the silhouette was tried twice and dropped (per-column
  scale flagged the pines, whose bough tips sit near the horizon's fast-changing scale; a foot-line
  rise read a lunging knight's back foot as a far end and still left the tent at 20%). Now a wide
  thing that comes out too tall gets told the box counts its far end, and `height` says so.

## From the Night City runs

- [x] **Builds of a long loop kept in memory**: the project cached every build at every time, so
  `pxl check` of a 320x180 city with a 360-frame loop held 3803 builds and peaked at 2.7 GB; two
  agents checking at once ran the machine out of memory and their runs were stopped. Builds at
  time 0 stay cached; the timed ones keep only the latest 64. Same check: 309 MB, as fast.

## From the pipeline experiments (proposals)

- [x] **`pxl check` of a long loop on all cores**: a 320x180 street with a 240- or 360-frame loop
  takes ~24 s to check, each frame built in turn; the examples test went from ~35 s to ~91 s with
  the two cyberpunk streets. Frames are independent: split them over worker threads.
  Shipped otherwise: workers gave the same text but little speed on this laptop's i5 (4 cores,
  1 GHz base: 2 workers 21.8 s, 4 workers 19.8 s against 25.8 s) and lost the sunset's reuse across
  its scenes (17 s to 62 s). A city frame spent 2/3 of its time in `lighting()` and `glow()`, which
  no check reads: `pxl check` loads the file with `checksOnly` and skips them. The cities' checks
  went from ~25 s to 11 s, the examples test from 174 s to 51 s, the suite from 91 s to 56 s.
- [x] **Preview GIFs of long loops**: `pxl build` writes a 6 MB GIF for each of those streets; the
  README's needed every third frame (the gallery script's `every`). `build --every n`, or a note
  when a preview GIF passes a few MB.
  Shipped both: past 4 MB the build line says so (the city's: 16.4 MB, 360 frames), and `--every 3`
  makes it 5.5 MB; the GIFs in `out/` keep every frame.
- [x] **Small lettering that misreads**: a pipeline's composer reported its 3x5 "PARK" reading as
  "FASK". When `text()` uses a tiny font at scale 1 for a word, describe could say which letters
  are ambiguous at that size (P/F, R/K, B/8) and point to the 5x7 font.
  Shipped as docs, not a check: in the 3x5 font O/0 and S/5 are the same glyph, 21 pairs differ
  by one pixel and 45 more by two, so a rule per word would flag nearly every sign. The `text()`
  row says what 3x5 is for and sends words that must read to the 5x7 or `scale: 2`. (That row was
  also split in two by a real line break where `
` was meant, so `pxl help text` showed half.)
- [x] **`pxl shot` of several assets, other files' too** (`pxl shot a.px.js sodium_hour b.px.js:city`):
  a row each, top down, and each one's warnings; what every A/B here was compared with, by hand.
- [x] **The last image and light tools of the dogfood folder, into pxl**: `pxl shot` takes PNGs from
  anywhere and `--at` more than once, a column per region (what crop, hcat, stack and grid did), and
  `pxl check --readings` lists the lit-side rule's reading on every placement with a tally (what
  light_readings did, to tune the rule). The dogfood folder keeps only the measuring tools.
- [x] **Run the pipeline headless as a script** (dogfood tools): planner, forks in batches by free
  memory, a run cut by the usage limit resumed, a JSON per run and `runcost.py` at the end. What
  this round did by hand, for the next A/B.
  Shipped as `tools/pipeline.py` in the dogfood folder (with `--single` for the one-agent side,
  `--batch`, `--resume` after a usage limit, `--dry`); tried on a stand-in `claude` that cuts a part
  off once: the part resumed, the composer waited for it, the costs added up.

## Later / niche

- [x] Layer blend modes and opacity (`blend`, `opacity`, `palettize`), with the palette caveats in
  SKILL.md: they make new colors, so the palette-safe `shade`/`light`/`density`/`glow` come first.
- [x] Onion skin in the live viewer: an "onion" toggle, `,` and `.` step frames.
- [x] Isometric `tilemap` (`iso: true`, one level).
- [x] Export tilemaps to Tiled: `<asset>.tmj` + a tileset image per layer (isometric alignment unchecked in Tiled itself).
- [x] Bitmap fonts: `font(name, sprite, { chars, w, h })` + `text(..., { font })`, and a ready 5x7 font in `examples/fonts/`.

## Perspective scenes (from dogfooding road, park and extinction)

- [x] **Three-point perspective**: `pitch` on `perspective()`, `vertical()` for the third point (fa5231e).
- [x] **`ray(col, row)` and `toward(dir)`** on the camera: a pixel's direction, a direction's pixel
  (the sun, where parallel lines meet). Extinction computed both by hand.
- [x] **`terrain()`**: land with relief, ray-marched through the camera, column by column, with an
  optional cheap bound and the sky's color for misses. Extinction's volcano had its own march.
- [x] **`hash`, `vnoise`, `fbm`, `bayer` as globals**: all three perspective examples carried the same
  hash and value noise, and extinction fbm and a Bayer dither.
- [x] **Shapes in meters**: `solids(view, shapes, opts)` and `shadows(view, shapes, { sun, shade })`
  over the `solid` global (`stick`, `blob`, `box`, `cone`, `poly`), drawn far to near and swept onto
  the ground from one sun; the park's own, lifted out (src/core/solids.ts), and the park now uses
  them. Cones stay the park's: the hull of level rings, for things standing roughly upright (a tilted
  limb is a `capsule`). road keeps its own: its shapes are 2D in a plane. Lifting it out showed
  the park had sized everything by `P.scale` of its depth, which with the camera turned is
  1/cos(yaw) = 1.3 times too big: it now takes the camera's own scale, its people, dog, pigeons and
  trunks at their true widths, and the crowns and tall grass given real sizes that fill as before.
- [x] **A capsule painted round**: `capsule(x0, y0, r0, x1, y1, r1, ramp, { light, rim })`, in px:
  every pixel shaded by where it sits across it toward the light, a rim on the lit side. extinction's
  limbs use it through `P.ground`/`P.scale`.
- [x] **Flames**: `flame(x, y, size, keys, { wind, period, seed, frame })`: tongues that flicker with
  the frame and lean with the wind, the root's key hottest, the last key for the edges up top.
  extinction's trees, logs, scrub and fronds burn with it.
- [x] **Where a build spends its time**: `pxl build --profile` naming the slowest assets and the
  functions that spent the most time themselves, in the art file and in pxl, read off V8's
  profiler; extinction went from 17 s to 1m43s without anyone seeing why until a CPU profile was
  read by hand. Its first run found pxl's own: the onion sheet asked every pixel of every frame
  whether it ever changes, frames squared; worked out once, the park's build went from 94 s to 17 s.

## Parallax (from dogfooding the train)

- [x] **A strip going by**: `scroll(name, y, per)`, the train's own `strip()` + `moved()`: a sprite
  that wraps placed at its offset for the frame and again a width on, refusing a `per` that isn't a
  whole number of widths (the loop wouldn't close). Each of the train's planes is one call.
- [x] **A lane of clouds**: `clouds({ y, gap, w, h, n, seed, keys, empty, sizes })`, the slot-morph
  lane the park and the train each carried (the same code twice). The park's sky comes out pixel for
  pixel the same through it; `empty` slots give the train's sparse sky, clouds forming and thinning.
- [x] **Smoke that closes over the loop**: `plume(x, y, keys, { every, life, rise, wind, inertia,
  size, young })`, the train's smoke: puffs born before the loop's start present on its first frame,
  carried by a wind they take on over `inertia` frames (an engine's smoke falling behind). The
  street's steam and the volcano's are the same idea, written by hand.
- [x] **Noise that closes over a strip**: `seamless(fn, w, h?)`, the train's `loopNoise`: any
  function of (x, y) blended with itself a width back, for strips and tiles that wrap.
- Considered, left in the example: `waves()` (a few sines of whole cycles over a strip: one line of
  JS), the far ridge's crossfading drift (one scene's trick, written up in scenes.md), the trucks,
  wheels and people (one train's). The shade under the train was a hand loop; `recolor` with a
  region does it. Reference photos come as JPEG, which pxl doesn't read: they were cropped and
  sheeted with an outside tool, as they should be (study, not input).

## From the street race (a cockpit view)

- [x] **Shapes far off the picture were drawn pixel by pixel anyway**: `poly` and `ellipse` walked
  their whole bounding box, so a forest wall or a crown with a vertex near the camera (screen x in
  the thousands) cost millions of invisible pixels: the race built in 47 minutes. They now walk
  only what can land on the image (all of it along an edge that wraps): 31 seconds, every example
  pixel for pixel the same.
- [x] **Loops along a way**: things picked by `hash()` of where they stand along the road jumped at
  the loop's seam until taken modulo the loop's distance; written up in scenes.md, with flutters as
  whole cycles of the loop.
- Considered: a curved road in `perspective()` (`bend`: the offset kappa·d²/2 the race works out
  itself, in its `cx()`): one scene's so far; worth it if another road bends.
- [ ] **A mesh op** (proposal): the cockpit (`examples/perspective/cockpit.px.js`) is modelled in 3D
  and carries its own renderer, `render3d`: flat faces in meters through the road's camera, the
  nearest face kept per pixel, each face toned along its material's ramp by how it lies to the sun
  and the sky, an outline where a surface ends in front of another, a crease where two faces of one
  material meet, the top edge of every surface a step lighter. `solids()` could not make it: it
  sorts whole shapes, and its boxes are square to the ground, so a dash wrapped round the driver
  draws in the wrong order. If a second scene wants one (a car, a ship's bridge, a room), move it
  into pxl as `c.mesh(view, faces, mats)` with a builder for lofts and boxes.
