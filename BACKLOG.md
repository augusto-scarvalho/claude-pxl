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
- [x] **A warning when `pal()` gives a key in a ramp another color** (found by the lit-side rule in
  wave 1): `hd2d/clearing.px.js` gave the kit's cobble and wall keys 1-8 its scarecrow's colors, so
  the ramps "1234" and "5678" no longer ran dark to light (`shade()` on it stepped along cobbles; the
  rule read its lit side backwards until `rampSteps` skipped such ramps). Done (round 5, R2): `pal:`
  names the keys, the ramp, where it was made (`ramps()` or `shades()`) and whether it still runs
  dark to light; a kit's ramps count with `include(..., { palette: true })`. An includer's ramps
  don't: a file included without `palette` (the traveler in the clearing, the girl in the forest, the
  5x7 font) gives those keys its own colors for its own art, and its art builds the same there as
  alone (161, 15 and 1 assets checked). No example warns.
- [x] **A field that moves on the clock, made once** (the distance written in blocks): the cost was never a moment's compile
  (0.8 ms for the dead tree's 105 rods) but V8 not optimizing one function of thousands of lines (the
  tree's distance: 73 kB of code, 8 us a point, swaying or still alike once past its limit). A join's
  children now go in runs of 250 lines a function (1.5 us); the tree costs ~80 ms of a graveyard_3d
  frame instead of ~400, the frame 0.8 s instead of 1.2, its check 7.5 s instead of 10.5. The numbers
  are still worked out each moment (rebuilding them alone would save that 0.8 ms).
- [ ] **The figures in 3D (wave 3): what is still open**
  - the heads are modeled and drawn once per view, their faces painted over: cut by a script from
    the approved hand heads where the render has the head, then the profiles widened and the nose's
    tip given back by hand; in round 5 (R3) the traveler's 3/4 cheek and profile jaw (the side lock
    dark down past the ear to a chin 3 px wide, where the render left a jowl of the skull's shade) and
    the warden's profiles (the nose's tip a pixel past the line, the chin in skin where the side locks
    hung as a beard);
  - the same cheek and jaw retouch for the mourner and the crew (their sw and w grids: the render's
    block of skin under the ear reads as a jowl). Done (round 6, R3), approved: a chin 3 px wide; the
    bandana's and the flat cap's by a side lock dark down to the jaw (the traveler's grids), the
    mourner's (`FACE3_MO`, `FACE3` kept for the miko) and the grey head's, their hair drawn back, in
    skin: the jaw's line in `D` up toward the ear, a pixel of the neck in shade, the hair behind; the
    beard and the braid already close it;
  - the traveler's head is a little smaller and its hair has less volume and fewer light strokes than
    the hand heads had; from behind it is smoother and darker; seams between pieces can make shapes
    by chance (a "face" on the back was fixed once);
  - the crew's bandana and long hair had one pass each (a knot and tails, a hem; locks, a parting, a
    braid of plaits); the flat cap's brim and the bald crown's highlight could take one. Done (round
    6), approved: the brim in profile (w and its mirror, the view the harbor shows) was flush with the
    puffed crown over a lit brow; its tip now a pixel past the crown, lit on top under the crown's dark
    edge, a pixel of its shadow on the brow (6 px a head, the w grid three columns wider). The bald
    crown was a blob of the skin's lightest 5 px wide, the same in every view: now a dash of 3 a pixel
    under the dome's top, the rest in skin, the dome's lower sides a step darker, in all five views
    (nw and n retouched too: their anchors in the traveler's `ANCHOR`);
  - 1 px creases (knee, elbow) hardly read; the cloak's and boots' accents do. Done (round 6),
    approved: only the traveler and the mourner had them (`parts3m`); a tone darker on every frame,
    they blinked with the idle's breath (its 1 px down bends the knees 51 degrees). Now a pair, only
    where the joint bends: past 60 degrees at the knee (a step, the kneel) the hollow behind it in the
    trousers' darkest and the kneecap in their lightest, past 45 at the elbow its inside in the
    sleeve's darkest and the forearm's top in its lightest; straight limbs none. The crew (`dress()`)
    and the warden have none: giving them some is a step of its own, not done;
  - the warden's stance sways by half pixels again (round 5, R3: the figure stamped with `sub`, its
    feet carried back to the place it stays crisp at; the boots' outline ahead takes the tone between
    on those frames); its head is no longer a frame behind the body (on rig3d the figure is one
    image);
  - the bodies are drawn every frame: after perf3d the traveler 5.7 ms a frame warm (6.2 before), the
    mourner 5.1 (6.4), the crew 3.7 (4.9), the warden 18 (22); 5-19 cold. Each pixel's distance ~10
    times and 4 more for its normal; a third of it the cloth's sweeps (the art's `trail` and `radius`).
    A box per part to skip rays or start them later moves pixels (13 rays of the mourner's head hit
    outside every box), so what's left: frames of a move drawn once where its pose repeats (idle's
    held breath, cast's hold, turn as idle's first), and cheaper cloth functions in the art files;
  - `views()` doesn't hold a baked head's crown and chin to one row (one head turned keeps them; the
    line under a jaw that turns may reach a row lower in 3/4). The crew's grey head (once its own item)
    is this: its crown on row -7 from the anchor in s and sw, -6 in w, nw and n, a tuft of 2 px at its
    top. Done (round 6, R3), approved: its s and sw grids two rows taller and their anchor two rows
    down (a set's own `anchor` only places a baked head's retouch), the tuft erased and the crown's
    line closed on row -6.
- [x] **What the 3D stage (wave 2) left to fix by hand, each a small change of pixels for the user to
  see before and after:**
  - three grass tufts along the graveyard's fence stand at its top, 1.5 m over the turf, past the
    hill's rounded corners: `stand` drops them onto the turf beside the wall (33 px);
  - the standing rule skips things placed as "many copies" (tufts, flowers), so small things floating
    go unseen: run it on them too, once the tufts are down;
  - the graveyard's traveler on `stand`: 2 px at frame 150 (the path's stones are 2.5 cm in the
    model, 2 cm in its `feetAt`); the harbor keeps `feetAt` (the deck bobs with the ship);
  - `sdf/splats.px.js`'s mesh-through-the-camera panel and `sdf/grids.px.js`'s `tree_three_ways` stay
    by hand: through `draw3d` the grass before the trunk's foot loses its outline (8 px);
  - four texels kept by hand (the graveyard's 2.5 cm kerb, the harbor's hull, boat and deck past 45°),
    where `texel: "screen"` is more correct but moves a few pixels;
  - `sizes` blocks only ramp materials by default; blocking textures too would keep HD scenes nearer
    pixel art (plaza_hd and graveyard_hd would change: show both).

  Done (round 5, R3), each shown and approved: the fence's tufts on `stand` (28 px; the grass lips
  hanging over the wall's edge say `air`); check's standing rule on many copies too (nothing else of
  them checked); the graveyard's traveler on `stand`, `feetAt` gone (23 px over 239 frames); both
  panels through `draw3d` (8 and 7 px at the trunk's foot); `texel: "screen"` on the graveyard's flags
  (0 px at its size), the harbor's hull (7) and boats (20), the deck across kept by hand at first (a
  dark band on the castles' tops, 428 px: their faces began with three points in a line, so the
  normal came out zero; plan() now starts at a corner and the deck takes "screen" too, F3 wave 1);
  `sizes` lays textures in blocks too, a texel a
  block (`block: 1` keeps one finer: the clearing's grass and path, unchanged).
- [x] **The walk's feet slide** (wave 4a): `gait()`'s stride is a sine swing per view (±4.6 px in
  profile, ±3.4 on a diagonal, ±0.6 facing us), so the planted foot moves back at 1.35 to 3.25 px a
  frame over its stance (2.3 on average in profile) and no one pace keeps it planted; the graveyard
  and the harbor walk at 1.6 px a frame, 30% under the profile's 2.3, so on their east and west legs
  the feet slide back (graveyard's PACE comment, "two steps of 6.4 px", is from before rig3d). The
  fix belongs to the gait work (A.md P4): a stance moving back at a constant speed and a stride in px
  a cycle per view; then `route()` could take its pace from the walk by heading. It retimes the
  stories: the user sees both.
  Done (round 5, R3): a number of `stride` is the foot planted half the cycle, going back at an even
  speed (2.3 px a frame in profile), and swung through the other half (frames 1, 3, 5 and 7 change);
  `gait()` gives its `pace` (4 strides a cycle); `route({ pace: (dir) => ... })` walks each leg at its
  way's, the traveler's `travelerFigure.pace` (1.6 px toward us or away, where the stride hardly
  shows). The graveyard went from 528 frames to 484, the harbor from 384 to 288 (its docker walks
  3 m and rests 1.6 s at each end). Left: 0.35 px a frame on the harbor's pier, nearer the camera
  than its 17 px to the meter (19.6 there); 0.1 or less elsewhere. Done (round 6, R3), approved: the
  docker's step at the pier's px to the meter (`CAM.scale(z)`, 19.9), its body 1.61 px a frame as its
  planted foot (1.88 before); 2.6 m there and back, so his 32 frames walking and 1.6 s at rest stay.
- [x] **The cave and the grotto on their floor** (wave 4b, a visual step): `world: { ground: [...] }`
  with their floor's profile and a `height` on what stands, so the feet rule runs there; they are
  anims (an anim with a `world` is checked as a scene). Standing their props with
  `stamp(name, x, "ground")` moves the stamps' x, y, which seed `rflip` and `rdelay`: the picks change
  (show both).
  Done (round 5, R3): `world.ground` takes several profiles (the floor everywhere, a ledge or an
  island over its own span; the feet read against the nearest, `"ground"` the floor); the props a
  `height` and a pivot at the foot of their stem, stood by `stamp(name, x, "ground")`; the feet rule
  runs on 12 placements in the cave and 108 in the grotto, and found the giant mushroom 2 px into its
  island (up a pixel). The picks changed: the fungi and lanterns pulse out of step as before, at other
  moments. Without the pivots (stamps where they were, no pixel moved) 3 props read 2 px off: the rule
  reads under the drawing's middle, not its stem.
- [ ] **A lit-side rule for art without an outline** (wave 4b): it reads the side from the rim of an
  outlined drawing, so on the five perspective anims' named drawings (park, road, race, extinction,
  train) it ran on every one and read none ("a clear reading on 0"). Read the light from the tones
  instead: which side of the shape holds its ramp's lighter steps.
  Found in round 5 (R2): the outline isn't what stops it; those files have no ramps (road one), so no
  rim pair lies on one. Tried and taken out: (1) luminance pairs at the rim where a drawing's colors
  are on no ramp: 6 readings against the light in park alone, material read as light (the pigeon "lit
  from the right" by its darker grey head and white beak); (2) within each hue, where its lighter
  pixels sit against its darker ones: 26 against across park, race and extinction (a car's mirrors,
  the rival car). What it needs: materials told apart without ramps (a ramp per hue family guessed
  from the palette, checked by eye on those drawings), or ramps given to those files.
- [x] **The crew's grey-haired head turned to profile is a row short at the crown** (`_og_head_w` in
  `hd2d/crew.px.js`): `pxl check`'s views rule reads its crown on row -4 from the anchor, -5 in the
  other views, so the head drops a pixel at its top as it turns. Redraw its top to reach the others'
  crown (a change of pixels for the user to see before and after).
  Closed (round 5, R3): the hand head is gone; the baked one is in the figures' item above (its
  `views()` line).

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

- [x] **A leaner skill, again**: SKILL.md had grown back to 30 KB (~7.5k tokens, every session that
  draws) as each round added its lines; now 13.5 KB, a map whose parts point to the guide sections,
  `pxl help` and `pxl --help`. The examples' table moved to `examples/README.md`; the three art rules
  only SKILL.md had went to characters.md §7. A test keeps it under 14,000 characters.
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

## Learning from references (`pxl study`)

- [x] **Read a finished piece or a reference for what it is made of**, PNG, GIF, JPEG/WebP and
  video, pixel art or not, and say what to use in pxl for it. Asked for after the race, where every
  reference (Top Gear, Out Run, photos of the Rio-Santos, a game's video) was cropped, scaled and
  read by eye. Two ways in: pixel art is read as drawn (its grid found, exact or blurred and
  fractional, the picture taken back to 1x; then palette, ramps and their hue shifts, outlines,
  dithering, anti-aliasing, lone pixels, light, tiles counted on its own pixels); anything else is
  read for masses, colors as ramps, the light's color, haze, and translated into a small picture in
  few colors. Both: perspective (Hough lines, vanishing points, the horizon, two-point lens) and
  motion (timing, cycle, loop, parallax bands to a fraction of a pixel, the focus of expansion,
  moving parts). A native GIF decoder (LZW, disposal, interlace); ffmpeg on PATH for the rest.
  Measured on art whose numbers are known: the train's four planes at 1.63, 3.38, 6.63 and 10.00
  px/frame (made at 1.67, 3.33, 6.67, 10); the race at 2x, one-point with the horizon on row 72 and
  the camera on column 150 (made at 70 and 160) and the motion opening out from 169,58; a game
  video at 800x392 found drawn at 3.23x, 22 colors once folded; a road photo translated at 160x120.
- [x] **Read back what pxl made, and fix what reads wrong**: every gallery GIF studied against its
  source. First pass: a 360-frame loop cut at 240 (and called open), a pan, a sunset's grass and a
  bout taken for a camera moving forward, a 96-frame loop called a cycle of 95, vanishing points in
  flat scenes (a cave, a shop, a street front) out of texture lines, the park's two points missed and
  its lens 34° (made at 90°), the volcano's tilt missed. Then, from the literature: straight edges
  by LSD-style region growing (Grompone von Gioi et al., IPOL 2012) instead of a Hough transform; a
  point must lie beyond its lines' ends; a second point sought along the first's horizon; a third
  only for uprights fanning out, meeting off the picture on its middle column, with the lens and the
  tilt from the horizon (after the orthogonality the 2-line and Manhattan methods use: Lu et al.,
  WACV 2017; Zhang et al., IJCV 2016); forward motion only with vectors either side of its point.
  Now: the race one-point at 160,70 (made at 160,70), the road at 159,71 (160,72), the park two-point
  with fov 89° and yaw 39° (90°, 40°), the volcano three-point with fov 75° and a tilt of 21° (80°,
  18°), no point in the flat scenes, every loop closed; a test reads the train and the park back.
- [x] **Pieces: what moves how, and what to build it with**: asked after the read-back (is it a
  sprite, an animated rig, which parts move?). The backdrop by each pixel's commonest color; planes
  carried by their own measured step (1.67 px/frame goes by in steps of 1 and 2); the rest followed
  frame to frame (a piece of about the same size, a plausible step on) and, where pieces don't hold
  together, read as a region: the longest stretch in which what changes there goes steadily one way
  (a walker in parts, a cloud), flow mostly sideways (traffic), neighbors brightening together with
  the hue kept (a light) or changing at odds without repeating (an effect), separate parts against a
  still body (a rig), else a cycle in place. On the gallery: the tropical forest's animals in place
  and its water an effect, the party's lights at a 4-frame cycle and its dancers a rig, the cave a
  pulsing light, the road's walker going away with its limbs moving and the windmill a rig, the
  park's people walking nearer, the tournament's clouds drifting. Still one piece where things touch
  (the party's dancers, a street's traffic). A test takes a synthetic clip apart.
  Then each object isolated (asked next): fragments that touch, regrouped only when near, in the same
  rhythm and sharing colors; numbered, each cut out across the clip in `_pieces.png`, and its box in
  every frame in `_pieces.json`. The party now comes apart into the witch at her cauldron, the
  pumpkins, the lanterns, the ghost, the mirror ball, the fire, groups of dancers; the road into the
  walker shrinking as it goes, the windmill, the vultures, the lit window.
  Then each capture cut out of its background (asked next): the background's colors, read round the
  piece's box (that frame's, when it goes somewhere), flood in from the edge and stop at its outline;
  what's left touching what moves is it, holes filled; the rule decided once a piece so its frames
  agree; a thing in place in a box grown round its whole body (closed, at most ten times what moves);
  a thing wandering about its box (a bird circling) cut by its own difference, and reported as going
  round. Groups with the same still body are one thing (two arms either side of it: a rig). A strip a
  piece, `_piece<N>.png`.
  Then the light told apart first (asked next, after Weiss 2001, Matsushita et al. 2004, Koppal and
  Narasimhan 2006): a change smooth from pixel to pixel, stopping softly or at an edge the picture had,
  not the background moved a step, in step with its neighbors over the clip, is the light's; taken
  away before things are looked for; each light a piece (where it shines from, how strong, its color),
  pools pulsing to their own rhythm apart. The dancers the green light round the cauldron glued
  together came apart. Dividing the light out of things' colors was tried and dropped: against the
  source it made them worse (0.052 to 0.091 OKLab off on the party's dancers under the mirror ball).
  Measured with `scripts/calibrate.ts` against the examples' own source (each stamp's box and pixels
  per frame; the frame before `lighting()`): light found 69-76% and right 73-99% where a scene lights
  itself (party, cave, no_magic); things found by box or as the light they shine about half the time
  in place (party 6 of 21 and 4 loosely, forest 3 of 10 and 4 loosely), captures 65-69% the thing and
  holding 74-80% of it. Weak: the perspective scenes (road, park, sodium_hour, tournament), where a
  figure is many stamps or drawn by `solids()` (the harness counts parts) and walkers are lost; sunset
  and cyberpunk, unlit, where what's taken for light is mostly things (backlit people).
- [x] **The weak points, measured and attacked** (asked next). The harness first: its things were
  wrong (a stamp's name and turn: the "first car" was another car each frame, a pigeon pecking another
  asset than the pigeon walking, a stamp of birds one thing); now each piece of a stamp's own pixels,
  followed frame to frame whatever its name, 12 px and 4 frames at least, moving when its stamp is
  drawn otherwise or elsewhere (not when something passes in front of it); one piece a thing (the best pairs first, as Fast Sprite Decomposition matches); the share of
  the things' frames found. Then study: fragments by common fate (pixels that differ in the same
  frames: phi of their two series); touching fragments joined in the same rhythm or in turns (together
  steadier than either), farther ones only by the same body; things that go somewhere followed first,
  in the frames as they are, by a SORT-like tracker (each carried on by its speed, two passing coast
  through the piece they share), and the light not looked for where they go; a hard edge for the light
  is one far bigger than the background's own step there (a silhouette on a dithered sky); two going
  opposite ways over one stretch aren't one found twice; a group moving inside another's closed body
  is part of it. Things' frames found, both measured with the harness as it is now: party 33 to 44%,
  road 0 to 22, forest 42 to 53, cyberpunk 6 to 11 (17 to 32 cars and people), park 0 to 33,
  tournament 36 to 41. Lower: cave 50 to 33 (a mushroom at the line), sunset 31 to 21, where clouds and
  tall grass come apart and its old big pieces held them by luck; headlights going with their cars are
  no longer taken for light (cyberpunk's light found 41 to 32%, as right).
- [x] **A sprite posted with its editor's backdrop** (asked next, from an attack GIF on r/aseprite: a
  warrior's three-blow axe combo, 38 frames, the checker and a reflection exported with it). The checker
  is taken for clear (two colors in squares, where they fall as a checker would nearly always); a
  reflection told (the row and opacity where what's below is what's above mirrored over what was
  behind: here row 112 at 24%, 98% of it) and set aside; then the palette is the sprite's, its outline
  read against the clear (58% near-black). The warrior is an action (many poses, none coming back, its
  blocks found again a step on: not fire), not an effect, not a walk (going somewhere is most of its
  size: a smear moves the middle of what changes as far); its smears told (colors that show a lot on a
  few frames, mostly in long thin pieces: #fffae4 and #9dcfce on frames 3-5, 8-12, 15-18, 24-28), not
  the cloak's back turned. Still: a part swung about a still body (an axe on a body that doesn't move)
  is followed as carried; telling a swing by its pivot would part them.
- [x] **A part swung about a still body** (an axe on an arm, the body not moving) was followed as a thing
  carried: it passes over its pivot every frame, and a thing carried never stays over one point, so
  neither the tracker nor the in-place stretch takes it for carried now, and turning about a joint it
  keeps makes a run of poses an action. Measured: no scene finds fewer of its things' frames; the sunset
  finds two more clouds, its masks a little looser (precision 41% to 37%).
- [x] **Subpixel in the DSL.** Studied from ApplefatGOV's How-to-subpixel (r/PixelArt): a part moves
  half a pixel when its edge takes the tone between its color and its neighbor's, and an idle (its own
  is a fighting stance) keeps the feet still and moves its parts by turns. `pxl study` tells it in a
  clip now, but pxl draws it only by hand: a stamp at a fractional offset whose edges take the
  in-between keys from the ramps (palette-safe; on a transparent sprite only inner edges have a
  neighbor to blend with) would let an idle sway or a slow drift move by half pixels without a drawing
  per frame. Done: `stamp(..., { sub: true })` (the part crisp where it's past, half a pixel of it
  past its edge in the key between, of the keys the file chose), `examples/subpixel.px.js`; study
  lists the tones a clip takes and marks the pieces.
- [ ] **Still weak in study's pieces**, each tried this round against the calibration and dropped:
  - Big animated things touching (the tournament's knights in their bout against the stands): joining
    neighbors only when the colors they show when they differ are alike moved the tournament not at all
    (44%) and cost the road's and the cave's masks.
  - Soft clouds drifting slowly read as light: a light whose middle drifts one way over the clip given
    back to the frames left the sunset as it was and cost the party things (44% to 39%) and the
    cyberpunk street its headlights (light found 32% to 25%): a glow going with a dancer or a car drifts
    too.
  - A ghost's top bobbing over a gravestone is a piece of its own: its body read over four frames in a
    row (a short cycle's every pose) chained the dancers into one piece again.
  - Traffic crossing at speed (cyberpunk 11%): the tracker carries hidden things on; more needs telling
    cars apart where they overlap.
  - Not done: a light as a few basis images times a curve (NMF, Oya et al. 2020): where scenes light
    themselves the light is already 71-99% right, and the misses are clouds and backlit people.
  - Left as it is this round (the curator's sweep): no quick idea left for these that the tries above
    don't cover; each needs captures cut from the frame difference or the cars told apart, not a tweak.
  - Tried next (one idea, time-boxed): a run of light whose pixels change in step with the whole run,
    not only with their neighbors (a lamp lights all of it at once; a soft cloud drifting reaches its
    far side frames after its near one): each pixel's curve against the run's mean, kept at 0.4 and up.
    The sunset's clouds stayed light (its light precision 5%), and the tournament lost light (found
    91% -> 84%). Taken out.
  - The 3D round's sweep: no new quick idea; the calibration as it stands (`calibrate.ts --summary`:
    party 44% of frames found, sunset 25%, sodium_hour 10%, tournament 43%). When: captures cut from
    the frame difference, or cars told apart where they overlap, are taken on as a piece of work.
- [x] **More of what the papers measure**: a sprite's light from its rim (Johnson and Farid, 2005);
  banding by Pixel Logic's rule as the Pixel Fixer paper (TU Delft, 2025) states it; pillow shading;
  the translation of a photo by superpixels after Gerstner et al. (NPAR 2012), which keeps edges.
  Studied and left: a contrario validation (NFA) of segments and points (the length and density
  tests do here), RANSAC for the points (the crossings are few enough to try them all), deep
  vanishing-point nets, Wang and Adelson's affine layers (bands of rows serve for parallax planes).

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
- [x] **`pxl list` of a file meant to be included**: it ran the file alone and stopped at the first
  name the includer defines (`H is not defined`), and its map named assets only, so the race's 1155
  lines (wheel, hands, sleeves, vegetation: all functions) were found with grep. Now a file that
  doesn't run alone is mapped from its text, and every map also has each function and each const of
  5 lines or more (the race: 29 lines to 72; the knight: 22 to 32).
- [x] **`shot --vs <rev>` read the included files as they are now**: comparing the cockpit before and
  after the mesh op failed (`render3d is not defined`: the old race with the new cockpit). At a
  revision the file and every art file it includes are now read from git (nothing written beside it).
- [x] **`shrink: 1`** was refused ("a whole factor from 2"): importing art already at 1:1 for study
  needed the option removed. 1 now leaves the image as it is (and `compare --shrink 1`).
- [x] **The race built in ~90 s**: `--profile` put it in the art, not in pxl: the sleeves' cloth
  shading worked out its folds for every pixel of the arm's bounding box (48%). Skipping the pixels
  off the sleeve first: 72 s, pixel for pixel the same. The ground's colour function is the rest.
- [x] **A road that bends, in `perspective()`**: the race worked out the offset kappa·d²/2 itself
  (`cx()` for its things, `roadU()` back for its ground, the same again with the sign turned for both
  mirrors). Now `bend` on the camera: `ground()`, `at()`, `scale()` take and give places on the way,
  so `plane`, `solids`, `mesh` and `terrain` follow it; `shadows` sweep along the sun's straight way
  and then project; directions don't bend. `plane`'s function also gets the pixel's column and row
  (the race's sun glitter needed the column). The race's three cameras use it: 67 px of 230k changed
  over four frames (a rival's shadow now follows the bend along its length, a few glints).
- [x] **A mesh op**: the cockpit (`examples/perspective/cockpit.px.js`) is modelled in 3D and carried
  its own renderer, `render3d`: flat faces in meters through the road's camera, the nearest face kept
  per pixel, each face toned along its material's ramp by how it lies to the light, an outline where a
  surface ends in front of another, a crease where two faces of one material meet, the top edge of
  every surface a step lighter. `solids()` could not make it: it sorts whole shapes, and its boxes are
  square to the ground, so a dash wrapped round the driver draws in the wrong order. Reported in
  FEEDBACK.md too. Shipped as `mesh(view, faces, mats, { light })` (src/core/mesh.ts) with the
  `model()` builder (faces, strips, lofts, boxes): `view` a `perspective()` camera or a camera of one's
  own (a function to `[col, row, depth]`), `light` a direction or a function of the face; per material
  `ramp`, `edge`, `top`, `smooth`, `bias`, `dither`, `texture` (the cloth's weave). The cockpit and the
  wheel use it, pixel for pixel the same (0 px changed over four frames of the race).

## From the tutorials (Saint11, Pedro Medeiros, Pixel Joint, the subpixel threads)

Shipped from them: `stamp`'s `sub` and `c.subpixel` (the outline push), study's subpixel reading,
near-twin colors and ramp steps too close, a line's L-corners and jaggies, lone pixels without a
dither's or AA's, `wire()` drawn pixel-perfect, `--scale` whole numbers only, a ramp going the
wrong way warned, and the lessons in characters §1, §4, §7, §9, §10 and scenes.md. Still open:

- [x] **`aa` on an asset**, opt-in: inner edges only, steps of 2 px and more, a strip about half the
  step long in the in-between key `sub` picks. Hand AA beats automatic AA, so never by default.
  Done: `aa: true`, the strip on the lighter side of each step, before the outline.
- [x] **`check` on sprites** for the line faults study finds (L-corners, jaggies in a 1 px line),
  so a hand grid gets them before it's built; a sprite drawn square (`outline8`) is exempt. Only
  sprites drawn by hand (a grid string, `grid()`, `runs()`; not variants, not parts): the knight's
  posed parts and the big pictures made as anims gave 1000s of warnings that said nothing. Parts too,
  after an audit (faces and leaves are parts). Then over the examples nearly every one was a corner
  meant (a tyre, a van's roof, a wingtip, an outline into a notch), and the skill says fix every
  warning: they are LOOK lines now, not warnings, and don't fail the check.
- [x] **study: spacing of each moving piece** (from `_pieces.json`): eased, linear, anticipation
  (back first), overshoot (past its rest and back), holds; and squash and stretch as the box's
  w×h and its area. For an action, the frames per phase. Done for things carried (4 drawings at
  most) and actions over 24 frames at most: elsewhere a box's steps were its drawings changing (a
  rig's limbs, an anim in place), noise over the whole gallery. Frames per phase not done.
- [x] **`font(..., { mono: true })`**: every glyph its cell's width, so a score or a timer doesn't
  jitter as it counts. And one font with lowercase. Done: `mono` centers each glyph in the widest
  one's width; `examples/fonts/font5x7.px.js` has lowercase and a "5x7 mono".
- [x] **`shades(..., { sat })`**: shadows less saturated, lights more (Saint11's ramps), beside
  `hue`. The default stays (darks a little more saturated, lights less toward white).
- [x] **`palettize` in OKLab** rather than RGB distance, so a reference's darks don't fold into the
  wrong hue. The tropical trees' trunks came out with darker, browner shadows.
- [x] **`build --share N`**: one scale for every preview and GIF of a file, so a set shown together
  matches (Saint11: one base resolution, whole multiples). First closed as `build --scale N`, wrongly:
  the previews carry a checker and a grid. Done as `out/share/`: each asset N times bigger, nearest
  neighbour, clear kept, nothing over it, a GIF when it moves.
- [x] **Shading-shift detection** in study: a hue that turns toward the light's color in the lights
  and away from it in the shadows, named as hue shifting, or its absence ("value only: muddy").
  Done as a count of the colored ramps: warmer in the light, cooler in the light, one hue. By pixels
  a sky's gradient outvoted every material, so a ramp is a vote.

## From Saint11's cards read frame by frame (study on them)

Four agents read the 80 cards and ran `pxl study` on their demos; what got fixed is in the commits
(timing per drawing and on twos, the loop check, `--at` in 1x pixels, `--no-out`, paint that comes and
goes no longer called a light in words, spacing on jumps and squash in place). Open (the cards are
Saint11's, read from his page, and not kept in the repository):

- [x] **Tracks break on leaps**: the follower accepts a match only near a prediction that starts at
  rest, so a thing that launches (a jump's takeoff, a dash at 28 px a frame, a shard at 8-15) loses
  its track on the frames that teach the most. Join a track that ends at t to one that starts at t+1
  or t+2 in the same colors, wherever it is. Fast small things (a 2 px marker at 11 px a frame) are
  never found. Tried: joining the only track that ends at t to the only one that starts by t+2, of
  about its size, left the calibration as it was and made a box leaping mid-dash worse (one drawing
  carried at 4 px a frame became a walk of 8). The deeper fault is the light pass: a flat thing on a
  flat ground, where it rests the background is it, and its leaving reads as a lamp going off. For
  now `study --at` on the region follows it (THE REGION). Done after all: a track left without a match
  takes the one piece left over near it (4 times its size), of about its size, going on the way it
  went and not at the picture's edge, when each is the other's only choice; and a thing going one way
  all along is carried with its speed changing. A dash read 4 4 4 30 30 4 4; the cyberpunk street's
  traffic found 31 -> 34, masks P 39 -> 42%, R 43 -> 47%; the tournament's frames found 44 -> 43%.
  And a thing at rest most of the clip, then leaping (the background has it where it rested): a piece
  whose background is what another piece of that frame shows, a size of it away over ground nearly
  always there, with the same ground showing whenever the place isn't the background, is the place it
  left, and that ground the background. A box resting 7 frames of 12 read "holds 6; right 30 30 30 19"
  where it read as two lights; the calibration as it was. Tried first: a light keeping its hue (cost
  the cave's glowing fungi, whose light turns the rock's hue, and the leap's ground has too little
  color for it anyway). Checked on a made-up clip only: on Saint11's squash card the dasher rests 7
  frames of 19 (not the background), and a GIF made by pxl merges a still rest into one frame.
  On the card itself, the dash was followed through its leap but broke in two: crouching moved its
  middle back under a pixel, so it wasn't "one way". Done: a little back before it sets off or once it
  has arrived doesn't count, when it is found in every frame of its way (anywhere, or with frames
  missing, cost the party's light 75% -> 69%); a track barely moving, a tenth of its size a frame, has
  no way to keep. The card reads "holds 4; right 1 1 34 27 20 14 2 1; holds 1; right 2 4 4 1" in 19
  of 19 frames; the calibration as it was.
- [x] **A smear inflates the box**: spacing and squash read off the bounding box, which a smear
  stretches. Track the pixels present every frame apart from those that come and go. Tried: the
  middle of its pixels instead of its box's: a smear joined to the body pulls it as much; and the box
  without the colors `smearsOf` finds: it changed nothing on the attack cards, whose smears are in the
  body's own whites (`smearsOf` asks for colors of their own). Smears are now also told by their
  shape (thin, there three frames at most): the punch card's on frames 1-2 of each cycle, the slash's
  on 4-5. Measuring the body without them on those frames changed none of the cards' spacing lines,
  so it isn't in. Done for a thing carried: a ball smeared on its two fast frames (stamp's smear)
  broke into three pieces, the piece there too big to follow. Now its drawing found in that piece
  (85% of its pixels in the same colors, a step of half its size at least, the rest of the piece
  behind it on the way it came) is it, and the rest its smear, out of its box: "right 3 3 3 20 20 3",
  "Smears on frames 4-5", with `stamp`'s `smear` as the way to draw it. The calibration as it was (the
  cyberpunk street's traffic found 34 -> 33, its masks the same). Checked on pxl's own `smear` too (a
  slime dashing over a dotted floor, built and read back from its GIF): three pieces before, one
  after, "right 3 3 3 22 22 3". No card read has a thing carried with a smear (the punch's and the
  slash's are in place).
- [x] **Effects as effects**: an explosion (dark, white, blast, fade) read as an attack with an
  anticipation; read its value and area per frame instead, and "plays once, then N frames empty".
  Done in `study --at`'s region reading (its area and lightness per frame, "played once"), and in the
  automatic pieces: one that shows, flashes near-white in its first frames and shrinks to nothing
  before the clip ends is an effect, its whole box (Saint11's explosion card read as one; the
  calibration as it was).
  Relabelling lights ten times stronger as effects in the decomposer cost the tournament's masks
  (precision 48% to 42%): it needs captures cut from the frame difference, not the light.
- [x] **A walk's flipped half** (top-down: frames 3-5 are 0-2 mirrored) and the body's bob per frame.
  Done for a piece whose cycle study finds; on the card itself the goblin seen from the front is
  symmetric, so its flipped half repeats the first and the clip reads as a cycle of 3.
- [ ] **A see-through body** (a ghost): what changes behind it read as lights; its whole-body float
  (0, 1, 2, 2, 1, 0 px) not reported. Tried and taken out: the pixels where it comes and goes, each
  showing two colors, what is behind and that mixed toward one color by one share (the lines from
  each to its mix meeting at that color). It read a made-up ghost over a dotted ground, and nothing
  real: Saint11's ghost is added to what is behind ("additive color blend": its tones in one blue
  direction at two strengths, snapped to the palette), its hair and hem move (a pixel shows three
  colors or more), and pxl's own ghost at `opacity: 0.6` over a night sky, its hem waving, wasn't read
  either: over one flat color a body seen through can't be told from an opaque one of the mixed color.
  What it needs: the body followed by its float, each of its own pixels compared over the frames as
  different things pass behind it (the change in it against the change behind gives the share), and
  added light told from a glow by its silhouette moving, not its brightness.
- [ ] **The harbor read as tilted ~31° where its camera is 22°** (`pxl study` on the HD-2D fixtures; the
  graveyard reads 39° for 38°). Tried once: the point above the picture with the most lines instead of
  the one nearest the middle column: the same point (the only one with four lines or more), no change.
  Tried in the 3D round: the point's lines in the lower half of the picture alone (the pier's, nearer
  the ground) meet higher still (row -416 against -396: 32°), so the lower lines aren't the ground's
  either; taken out. When: the lines are told by what they lie on (planks along the ground, an
  awning's slope), not by where they are on the picture.
  What it needs: the lines along the ground (planks, the pier's edges) weighed over the awnings' and
  the ship's slopes, which meet higher.
  Measured since, and not enough alone: (1) edges behind kept through the body while it moves: 1% of
  the changing side-by-side pairs in both ghosts, as in opaque movers (0-4%): a ghost floating a pixel
  or two changes only at its edges, its middle stays, behind and its own drawing alike; (2) each
  pixel's darkest color against the others it shows: pxl's ghost at opacity converges on one color
  (median 0.7 off the lines) where an opaque slime's lines meet at the floor behind it (the mixed
  color has to lie past what covers); Saint11's added ghost goes one way, 73% within 20 degrees of one
  blue, and so does the cave's light (74%): by color an added body is a light. Telling them apart
  takes the motion: two layers, one still and one following the body's float, added (Szeliski,
  Avidan and Anandan, "Layer extraction from multiple images containing reflections and
  transparency", CVPR 2000), the share where the body's edge crosses what is behind.
  Looked at again (time-boxed, no quick idea fits): pxl's own ghost at `opacity: 0.6` over a night sky
  is found as one piece of 12x7, the rows at its top and hem where it changes, so its float can't be
  read off the piece either; following the body whole comes first, and that is the two-layer model.
  The 3D round: no new quick idea; waits for the two-layer model, when a reference with a see-through
  body is studied for real.
- [x] **A runner in place read as a camera moving forward**: require the backdrop to move first.
  Done another way: the opening out has to hold frame after frame (a runner spreads its limbs and
  draws them in by turns); the race still reads as a camera going forward.
- [x] **How long each piece's drawings are held**, per piece (the clip's own holds are said now).
  Done when its cycle is a whole number of times its drawings: "each held about 2 frames: on twos".
- [x] **A ball crossing a still backdrop** read as a plane going by ("nothing moves on its own"), and
  a one-way move that jumps back to its start read as "a loop that closes" (the seam measured
  against the steps, which are as big): found by the second audit. Done: a track just begun reaches
  2.5 times its size for its next step (it has no speed to predict by yet); a thing faster than half
  its size a frame is carried when it keeps one speed nearly all the way; a plane has to move all
  across its band each frame; the seam has to span no farther than a usual step. The calibration:
  the cyberpunk street's traffic found 31 to 33, its masks 39/43% to 41/46%, the rest as it was.
  Both came back when a smear makes the change wide: pxl's slime resting (one frame in the GIF), then
  three smeared leaps, read as a plane going by at 16 px a frame and a loop that closes. Done: a plane
  carries its texture, the edges in its rows meeting again where its step puts them more than where
  they were (the floor's dots stay); and a loop doesn't close when what differs from the clip's
  commonest frame goes one way every step and back at the seam over more than any step ("back 66 px
  against the way every step went"). The examples' planes and loops read as they did. Its pieces too:
  the slime was an action and three lights; a smeared piece is now cut to its drawing as soon as it is
  taken (not only when it is left over), a track of one frame finds its drawing in the next, and a
  track all through a short clip (4 or 5 frames) can be carried: "right 24 24 16 2, slowing", smears
  on frames 1-3. Cutting for one-frame tracks in the first pass too cost the cyberpunk street a car
  (33 -> 32). And Saint11's
  parallax card's ball (4 px, bouncing, passing behind a tree) broke into three pieces. Its track was
  whole (the follower kept it through the tree and the hop); what turned it down was a step of -0.03
  px counted as going back, and its way 1.27 times as long as how far it went (it hops) where 1.1 was
  allowed, at an uneven speed. Done: on a track found in every frame, a step back under half a pixel
  doesn't count, and a way up to 1.3 times as long is still one way. The card reads one piece, 35 of
  64 frames (it rolls out and the panel is empty after). 1.5 cost no_magic's light 76% -> 73%, and
  half a pixel on a track with frames missing cost the party's 75% -> 69%; the cyberpunk street found
  33 -> 34, its masks' precision 42% -> 41%.
- [x] **Banding across a 1 px gap**, and 45° runs whose ends step together (Pixel Joint): study's
  banding counts only runs side by side. Done: the gallery's facades read about 1.7 times the pairs.

Left out, with why: a `check` rule for a far plane with more colors than a near one (no reliable way
to tell which layer is nearer), a warning for a ramp whose light end is cooler (the guides now
recommend that for metals), anti-aliasing quality (study's in-between detection already requires a
tone between the two), `relight`'s reflected light (it pushes toward pillow shading), an oblique
camera note for `mesh` (a camera function culls faces from an eye at the origin: a cabinet view
shows only its front; `mesh` would need an eye for a camera of one's own).

## From the second batch of tutorials (SLYNYRD's Pixelblog, final boss blues, Les Forges, So You Want To Be A Pixel Artist, Make Games, Pixelation)

Read by ten agents, each item checked against the guides; what came of it so far: parallax planes a
whole px a frame (the train fixed, `scroll` warns), a game's timings in characters 10 and 12, a
sprite the game flips lit from straight above (and study no longer calls it pillow-shaded), animated
WebP read frame by frame, one cycle of a loop in place read as such.

- [x] **One cycle of a loop in place** (an idle, a run on the spot, the clip its whole cycle): study
  read it as "a run of poses played once" with smears and lights that weren't. Now its last frame
  running into its first, with the clip played there and back, its second half its first with the
  limbs swapped, or nothing going more than a few px a frame, is a cycle of its own ("one cycle in
  place ... dir: "pingpong"" or "draw half, then copy it and swap the limbs"); a light changes in one
  to three parts, not many; a wave's crests followed a few frames at a time, again and again at a
  steady beat, are one piece ("the same going by 33 times, a new one every 6 frames: a texture
  scrolling past"). The calibration as it was on every scene.
- [x] **A waterfall read as a camera going forward**: its splash spreads out from where the water
  lands (44% of the moving blocks agree), as a cockpit's view does (42%); what tells them apart
  isn't found yet (blocks coming toward the point: the cockpit has more; speed growing with the
  distance from the point, as going forward should: the cockpit's correlates -0.17).
  Tried next: the share of the moving blocks above the point that move away from it (up), which a
  waterfall's falling water should lack: on SLYNYRD's card of bobbing enemy units, read as a camera
  going forward too, 345 of 503 do, as in the cockpit (452 of 668). Not it. What that sweep of some 300
  tutorial clips did find: 6 misread as a camera moving with the point off the picture (his shooter
  scrolling down, cards of tiles and sprites); done, the point must be in view (a starfield and the
  cockpit keep theirs).
  Done (one idea, time-boxed): a camera going forward has the ground going by under its point (a sky
  stays put), so at least 15% of the blocks opening out from the point lie under it. The waterfall:
  6% (its splash spreads up and out from where it lands, low in the picture); the cockpit 39%. The
  calibration as it was. A forward camera seeing no ground (a tunnel's ceiling only) would need it
  back.
- [x] **A flat figure running in place read as a light** (SLYNYRD's run demo): a light changes all
  brighter or all darker from one frame to the next (70% one way and more: the party's lanterns 73-100%),
  a flat figure moving lightens at its front and darkens at its back (56-60%). The calibration as it
  was (the party's masks 64% -> 63% precise, 71% -> 74% whole).
- [x] **A 16 px walk read as nothing moving** (Final Fantasy's 4 frames at 300 ms): in a clip of 4
  frames or fewer a part may change in one (each hand swings once), so it counts; the walk is now one
  cycle in place played there and back. Its shading swapping with the legs still reads as subpixel
  motion (18%): not told apart.
- [x] **Planes study misses** (SLYNYRD's parallax cards): planes sharing rows (a city's far blocks behind
  its near ones) now come from the block flow, a whole speed over most of the width in most pairs and a
  good share of all that moves, at a speed no band has: the 96 px card gains its 8 px plane, the 192 px
  one goes from 1 speed to 4 (1, 3, 4, 6); no gallery clip gains a false one. Left: planes of 16-32 px a
  frame (a farther band search found nothing reliable), 0.5 px a frame, a vertical scroll's columns.
- [x] **`caps` on an outline** (So You Want To Be A Pixel Artist, ch. 12): done, `caps: true | n` on
  a sprite or anim: each straight run of the edge's line ends `n` steps darker where the line steps on
  diagonally (after `outline`/`selout`; without an outline, the sprite's own edge). 1:1 diagonals stay.
- [x] **`shot --grey`, a vertical `scroll`, sky seams by whole rows** (three batches asked for a
  values view; SLYNYRD's shooters and skies): done.
- [x] **Notes from drawing `examples/topdown_hero`** (a fresh agent, 98 tool calls). A scene has a
  clock of its own now, `scene(..., { frames, fps })`, as an anim's (the example's empty 1x1 clock
  anim gone); `shot --ref` draws an asset's `ref: true` layers over it; `shot` with several names
  gives each its own frames (a still sprite among anims shows its one frame; the report lists each
  row's) and counts them off the clock, building nothing; `sheet(..., { rows: "tag" })` puts each
  animation on a row of its own. A pivot that moves with a stamp's `flip` is meant (a joint mirrors
  about itself) and documented: no change.

## Shaders, wind and abilities (a plan ported from VFX Essential, VFX.js, Three and Babylon)

- [x] **Effects on assets**: `effect(name, opts)`, an op that runs on what a sprite, an anim's frame
  or a layer holds so far: `dissolve` (noise holes with burning rings), `pixelate`, `dither` (ordered,
  to the palette), `tint`, `distort` (UV distortion off noise, looping), `emit`. Each a pure function
  of the pixels, its options, a seed and the clock; on the CPU, the canonical implementation. Written
  anew from what each does, no code copied.
- [x] **The emission mask travels** (done with mesh() materials, below): `emit` brightened its pixels, and nothing marked them as shining after. For
  `mesh()` (sprites that shine and aren't darkened by the sun), `lighting()` and a bloom fed by it,
  the mask has to move with the pixels as normals do (stamp, flip, rot, crop, outline); since the
  sweep below, through free `angle` turns too (shear's pixels carry it, RotSprite's samples take the
  mark of the nearest source pixel of their color).
- [x] **Vegetation in the wind, for flat sprites**: `effect("sway")`, rows moved by their height over
  the base (warp's whole pixels, the normals along), a lean downwind and a to-and-fro on the loop;
  each copy its own phase and reach by `reseed`, a gust across the scene by `delay`, and the same in
  `mesh()` (its sprites take `delay`, `rdelay`, `seed`, `reseed`), whose shadows, cut from the swayed
  picture, sway with them. Normals move with their pixels, not turned (a lean of 2 px over 68 is
  under 2 degrees). Grass parted by a passer-by is an option now, not a recipe: `push` (the column
  where something passes through), `reach`, `bend`: the stems near it carried away from it, by their
  height, their feet where they were.
- [x] **post() finishing** (Three's and Babylon's, written anew): `bloom: { levels }` for Three's
  bloom beside pxl's (they differ in use: a halo round small lights, a glow over bright surfaces),
  `lut` from a .cube file or a LUT strip PNG (Unreal's and Babylon's 256x16), `grain` seeded by the
  frame in blocks of `pixel`, `sharpen`, and `palette` to take the picture back to the palette. The
  blur sums only near what isn't 0 (rows and columns of nothing skipped, the same result to the bit):
  post() with Three's bloom at 1920x1080 went from 0.5-0.7 s a frame to 0.26-0.4 s (960x540:
  0.13-0.16 to 0.07-0.13; the blur itself from 1.3 s to 0.36 s over eight frames); the rest is the
  trip to linear light and back.
- [x] **mesh() materials and transparency**: `effect("emit")` marks the pixels that give light and the
  mark travels with them (as normals do); `mesh()` draws them as they are and lights what is round
  them (a lamp at their middle per sprite, `light: { r, strength }`; `each: true` a lamp for each
  part glowing apart, two lanterns on a beam), `lighting()` leaves them lit, `post()`'s bloom takes
  them. `dissolve` on a material eats its faces with holes that show what is behind and let the sun
  through. `blend` on a sprite (alpha, add, screen, `opacity`): laid over what is behind by its
  alpha, after everything solid, farthest first, hidden by what is in front, no shadow (scenes 7);
  an "alpha" one a faint one with `veil` (a second map of the sun's: the share its pixels hold back).
- [x] **Auras, smoke shapes, dissolve patterns**: `effect("aura")` grows the silhouette into a glow
  of 2-3 tones, flickering, marked as light, hugging every pose of an anim; `smoke()` draws a column
  on a path, a puff, a bank or a ring of lit billows in three opacities (dithered in the palette over
  what is drawn); the dissolve's `pattern` (sweeps, radial, scatter, scan, a painted mask) on sprites
  and on mesh faces. A variant of an anim timed by its frame()s now keeps their pace (it took 8 fps).
- [x] **Abilities**: `ability()` (phases in time, events, a point along the way), `emitter()` (seeded
  particles in closed form, bursts, loops that close), `particles()` and `trail()` drawn on the clock,
  `effect("energy")`, a placement's `fx` (effects on one copy, on stamps and mesh() sprites),
  `c.socket()` and `c.meshSocket()` for a spell's start at a hand; the traveler's cast pose (blocks
  first, `examples/hd2d/clearing.px.js`).
- [x] **A spell kit**: `spell(element, tier, { from, to })` on the abilities' pieces, drawn by `cast()`;
  nine elements as recipes (ramp, noise, particles, motion, impact, centerpiece, mark), three tiers
  (size, particles, time, light, glow, shake; a shockwave from 2, a centerpiece, flash and mark at
  3); a guide to designing an element (scenes 12); the sheet in `examples/spells.px.js`. Variants
  and forms (solids by the volume method in src/core/volumes.ts: rising, falling, cracking, breaking
  up; quakes, slides, novas, blizzards, waves, chains, blades, rain, grasping shadows, leaves) and
  views (side, top, iso, a perspective() camera), `examples/spell_variants.px.js`. Since: a cast
  after a `mesh()` through the spell's own camera is drawn in its depth (what is nearer the eye stays
  in front: the ball behind a wall), `S.lamps(t)` light the diorama through `mesh()`'s `lamps`, and
  `cast(S, { shake: false })` with `shake(S)` shakes a whole scene from a cast in one cell of it.
- [x] **Dissolve looks**: `look` (neutral by default, burn, acid, magic, frost), the edge's keys over
  the progress, a char band ahead of the edge, glow, seeded debris (ash, drips, frost, sparks) aged by
  the progress; on sprites and on mesh faces (no debris on faces: below).

What the phases left, each waiting for a reason:

- [ ] **A GPU executor for the effects** (WebGL2, the plan's phase 2): deferred. WebGL exists only in
  the browser and a GPU in Node needs native dependencies, while pxl renders in Node with none; a
  simple effect on a sprite costs less on the CPU than a texture's round trip. The contract keeps the
  door open: RGBA of a fixed size in and out, alpha straight, options as uniforms (numbers, colors,
  keys), the clock and seed passed in, nothing kept between frames; noise is a function of (x, y,
  seed), so a shader can compute the same field. Measured on the curator's laptop (a 4-core i5 at
  1 GHz): post() with Three's bloom at 1920x1080 is 0.26-0.4 s a frame since the sparse blur, and the
  HD-2D scenes' frames are spent in mesh()'s rasterizer, not in effects (harbor's check: mesh() a
  third of it and more, effects none). Worth it only for a measured slow pass (a long
  HD run's bloom, many effects on a long scene), with a CPU/GPU comparison test per effect. Still so
  in the 3D round: the slow passes are now fields and volumes ray-marched on the CPU (a 320x180
  diorama with a leafy tree, smoke and mist 0.6 to 1.3 s a frame; `pxl check` on `sdf/volumes.px.js`,
  one frame of each scene, 3.4 s), and those are a GPU engine's case (below), not the effects'.
- [ ] **A cast's depth part by part**: `cast()` in `mesh()`'s depth takes one depth for all of the
  spell, its head's (nearer by its size). A beam reaching toward the eye, or a mark on the ground half
  behind a wall, would need a depth for each primitive it draws (its points are in the world, so the
  view could hand one out): when a scene shows the one depth wrong.
- [x] **A spell's art pieces blended in cast()**: `cast()` plots the file's anims (`ball`, `impact`,
  `big`) as they are, so an energy ball's dark rim shows; the clearing's hand version laid them
  `blend: "add"` in mesh() and they glowed. Done (round 5, R2): `spell(..., { blend: "add" | "screen" })`
  lays the pieces on what is drawn by their alpha in linear light, as mesh()'s blended sprites; over the
  clear as they are. The clearing keeps its look (no `blend`).
- [ ] **Pieces that collide with each other** (a spell's shards, a boulder breaking up): waits. The
  pieces fly on closed-form paths, so any frame is drawn alone; colliding needs a stepped simulation
  replayed from the start to each frame (seeded and deterministic, seekable at O(frames) a frame) and
  each piece's shape as a body. Worth it when a cast reads wrong without it.
- [ ] **Debris on dissolving mesh faces**: waits. The burning edge is found pixel by pixel in the
  rasterizer; debris needs its points in meters handed back and an emitter per face, its particles
  then sprites in the depth. Today a dissolving sprite's own debris, or a cast's sparks, stand in.
- [ ] **A trail as a ribbon in mesh()**: waits. Faces in mesh() are opaque and a ribbon is see-through
  (blended faces, or a strip drawn as a cast is now, at one depth). Today a few sprites at past moments.
- [x] **A painted sway mask** (what moves, painted, instead of by height): done (round 5, R2):
  `effect("sway", { mask: "_m" })`, an asset of the same size, each pixel's lightness its share of the
  sway (white all, black and clear none); `push` still goes by height.
- [x] **The emitting pixels' light in plain lighting()**: done (round 5, R2): `lighting({ emitLight: r |
  { r, power } })`, the `emit` keys and what an effect or a spell marked as giving light lighting what is
  round them in their colors, as a lamp at each of their cells; on a normal map it comes straight on.

## A 3D DSL: fields, voxels, volumes, splats (the dsl3d plan, in phases)

- [x] **Distance fields and surface()** (phases 1-2): `sdf.*` primitives, joins plain and smooth,
  moves, deformations, noise, materials by region, parameters on the clock; drawn as pixel art from the
  side, the top, in iso and through a perspective() camera after a mesh(), at its depth with its shadow.
- [x] **Voxels and meshes from a field** (phase 3): `sdf.voxels` (cells of any size, per axis too),
  `voxels()` drawing cubes on the pixel grid (iso, top) or through a camera, `sdf.mesh` by surface nets,
  greedy voxel faces, `export3d` to `.vox`, `.obj`, `.glb` (Y up), each read back.
- [x] **Density volumes** (phase 4): `sdf.density` with flowing seeded noise that closes its loop and a
  fade up, `volume()` ray-marched through its own light on a grid, its ramp in clusters, dithered where
  thin, in mesh()'s depth, its shadow (`cast`) and its glow (`emit.glow`) on what is drawn.
- [x] **Procedural splats** (phase 5, experimental): `sdf.splats` from a field's surface (flat discs
  along the normals) or a density's inside (round blobs), `splats()` a CPU rasterizer to pixel art (EWA
  ellipses, the nearest first, 3DGS's blending, snapped to the ramps in clusters), `.ply` in 3DGS's layout.
- [x] **Details, decals and a scene of parts** (phase 6): `sdf.scatter` (leaves, moss, snow on a form,
  drawn as pixel-art brushes under a few px, carried by its sway), `decal()` (hand-drawn art pinned or
  wrapped on a form, a grid per view, lit or glowing), `.part()` and what painted each pixel (`pxl steps
  --at`), the builders (`make3d`), `world3d` (parts, seeds, relations, a shared wind; `edit` and `changed`,
  the rest byte for byte), `draw3d`, `expect3d` run by `pxl check`.
- [x] **Evaluation and the guides** (phase 7): the protocol for the plan's four comparisons with a first
  run of one ([docs/evaluation-3d.md](docs/evaluation-3d.md), `scripts/eval3d.ts`), the grove in the
  gallery, scenes.md section 17, SKILL.md's lines.
- [ ] **Splats' own shadows**: a splat set lays none; a field's `surface(..., { hide: true })` lays it.
  When: splats come from somewhere with no field behind them (a capture read from a .ply).
- [ ] **Reading a .ply of trained splats** (a capture, from Spark's or SuperSplat's files) into
  splats() as pixel art: the one use where splats bring what a field can't. Why: a photographed thing
  drawn in a scene's palette. When: someone has one to draw (SH degree 0 colors first; the rest as an
  average).
- [ ] **The .ply as splats in a viewer**: `pxl serve`'s `/3d` shows it as points in their colors (three.js
  reads 3DGS's 17 properties); drawn as splats needs Spark's renderer. When: the first time one is
  shared, or points read wrong.
- [x] **mesh() in surface()'s orthographic views**: `mesh("side" | "top" | "iso" | { kind, ... }, faces,
  mats, { ppm, at })`, the faces in the world's meters at their depth (a field drawn after it through
  the same view stands in front or behind); `examples/sdf/splats.px.js` uses it for its mesh panels
  instead of its own camera function (3 px and 1 px moved). Faces only: the sun and sprites keep
  needing a perspective view.
- [ ] **Higher SH degrees in the .ply**: the DC color only. When: a viewer shows the flat color wrong.
  (Sizes by material: a scatter set has its own size, a crown's leaves and a rock's moss each theirs.)

- [ ] **Volumes among volumes**: a volume writes no depth (it hides nothing), so volumes are drawn
  farthest first by hand; two crossing (mist through smoke) lie one over the other, not mixed. Why: a
  fog bank a column of smoke rises through. When: a scene shows it wrong (march them in one pass, their
  grids together, each ray gathering from all of them by depth).
- [ ] **A volume's glow on fields and volumes**: `emit.glow` steps up what is drawn round it (the ground,
  walls, a field's pixels) by distance alone; another volume isn't lit, nor does the light turn with a
  surface's facing. When: an orb in a fog reads wrong (the picture's normals are there to read: the
  facing is a few lines; lighting another volume is the one pass above).
- [ ] **A volume's shadow on another volume, and on itself from a field**: the cloud's shadow falls on
  what has a depth; mist under it isn't darkened. When: a scene needs it (with volumes in one pass).
- [x] **How far light gets into a volume, as an option**: `volume(..., { shadow })`, the share of its
  thickness on the light's way that counts (0.4 as before; 1 a dense smoke's deep shade, 0.1 a thin
  cloud lit through).

- [x] **surface() on voxels' pixel grid in iso**: `view: { kind: "iso", grid: true }` draws a field on
  the projection voxels() uses (a meter `ppm` px along each axis), so a field and its voxels line up
  on one canvas (a 0.5 m box and its 0.5 m voxel cover the same pixels).
- [x] **A grid past 256 a side as several MagicaVoxel models**: cut in models of 256 at most, each
  placed by the scene graph (nTRN, nGRP, nSHP; `_t` its middle), read back voxel by voxel to where the
  grid had them.
- [x] **mesh() casting shadows from ramp faces without a sun**: only textured faces and sprites take the
  sun's shadows, and only with `sun` on; a mesh made from a field (sdf.mesh) gets its shadow from its
  field (`surface(..., { hide: true })`). Done (round 5, R2): without a sun, `shadows: true` builds the
  SunMap from `light` (every face, the sprites as cut-outs), a ramp face a step down its ramp where it
  shades; off by default, so no scene moved. Textured faces without a sun still take none.
- [x] **surface(), voxels() and volume() in mesh()'s sun**: they light by their own ramps and lay their
  shadow on what is drawn, but walls' shadows don't fall on them and the sun's and sky's colours don't
  tint them. `light: "mesh"` (wave 2) gave them the sun's and sky's colours and its lamps; done (round
  5, R2): mesh() leaves its SunMap with its light, and with `light: "mesh"` a surface's or voxels' hit
  in a wall's or a figure's shadow takes the sky alone. graveyard_3d's snag stands in the sun: no pixel
  moved. A volume still takes the sun all through (its light read at its box's middle): per cell when
  a mist in a wall's shadow reads wrong.
- [ ] **An SDF sprite's depth pixel by pixel in mesh()**: a sprite stands as a card, each row at its
  height's depth; a field drawn through the camera has the true depth. Why: a wide crown in front of a
  fence behind the trunk. When: a card reads wrong (surface() already leaves a depth on its picture:
  carry it with the sprite's pixels, as its normals are, offset to the card's).
- [x] **A leafier canopy**: `make3d.tree({ leaves })`, leaf clusters scattered on the lobes as brushes
  (examples/sdf/details.px.js).
- [x] **Voxels' creases darker**: `voxels(..., { ao })`, each face darker toward the cubes beside it, by
  its corners as block games shade them (off by default: no example moved).
- [x] **Voxels on the pixel grid from the side**: `view: { kind: "side", grid: true }`, a cube's front
  `px` wide and tall and a quarter of its top.
- [x] **Exports that move**: `export3d(name, (c) => sdf.mesh(field, { size, clock: c }), { frames, fps })`:
  one `.glb` holding a mesh a moment, shown in turn by an animation (scales stepped), which loops in
  three.js and other viewers; `.vox`, `.obj`, `.ply` a file a moment. Morph targets skipped: surface
  nets give each moment its own vertices.
- [x] **The material lookup as generated code too**: the distance is one generated function; the
  material is still closures, read at each hit, voxel and quad (surface nets at 0.05 m: 0.5 s). Not
  needed (round 5, R2, measured): `make3d.tree` meshed at 0.05 m takes 0.9 s, 35% of it the generated
  distance and 30% surface nets' own loop; the material closures don't reach the profile's top 18
  (under 0.3% each). Voxels at 0.1 m: 50 ms.
- [ ] **A GPU engine**: not yet, by decision. Why not: the CPU renderer holds, measured: a 320x180
  diorama with a tree, smoke and mist 0.6 to 1.3 s a frame, the HD-2D scenes' checks 5 s or so a file
  alone, every 24th frame. When: a long HD sequence is measured slow (minutes a render), or an
  interactive tool needs frames at 30 fps.
- [x] **An interactive 3D view**: `pxl serve` serves `/3d` (and a "3D" link in the viewer): the `.glb`
  and `.ply` export3d wrote, turned with the mouse, a moving `.glb` playing; three.js 0.169 from a
  pinned CDN build, nothing installed, and nothing else of pxl needs the network.
- [ ] **A Blender pipeline**: not yet, by decision; `.obj` and `.glb` reach it (the moving `.glb` too,
  its moments shown in turn). When: a render or an edit only Blender does is asked for.

Left from phase 6 (details, decals, the scene of parts):

- [x] **What painted a pixel through stamp()**: a picture's parts travel with a stamp, a copy and a
  flip; what a stamp covers no longer says it; `pxl steps --at` names a part only when a 3D op or a
  stamp painted the pixel last (a rect over it said the part before).
- [x] **Decals on voxels() and on a mesh of a field**: they lie on the field the grid or the mesh was
  made of (`on: field`), checked against the depth those leave. A hand-modelled mesh (`model()`) still
  takes none: when a modelled building wants a sign (the anchor from the face's plane).
- [ ] **Views for wrapped decals**: `views` picks a grid by the angle; a `wrap` decal is one grid laid on
  the surface (it foreshortens on its own). On a hard edge (a prism's) its texels bend round with it.
  Today: a wrap decal for each face, each its own drawing. When: an emblem round a hard edge reads wrong.
- [ ] **Brushes by distance**: under 2 cells a detail is a fixed brush (dot, clump, leaf, blade,
  cluster), whatever its size; past that an ellipse. Why: a camera close to a crown could show leaves
  as bigger brushes (a 5x5 leaf) before they turn to ellipses. When: a close-up reads wrong.
- [x] **More builders**: `make3d.pine({ height, tiers, girth, snow })` (cones of needles up a trunk,
  ragged with noise, snow on the tiers) and `make3d.bush({ size, leaves })`, both in the world's wind;
  `make3d.crystal({ moss })` (the evaluation's builders arm couldn't give its rock moss).
- [x] **More relations**: `along` a path (a fence, a row), `apart` kept by placing (not only checked).
  Done (round 5, R2): `along: [points, s]` (s m along the path, straight on past its ends; a row is a
  part a step of s) and `apart: [part, gap]` (moved out of the other's box seen from above the shorter
  way, x or y, when its relations put it inside). Boxes, not the field: a rock is kept clear of a
  tree's crown too; `expect3d`'s `apart` and `--fix` still read the field.
- [x] **expect3d's sampling and its tenses**: `{ before: [rule, rule] }` (the first holds at an earlier
  frame than the second first does) and `{ while: [rule, rule] }`; a part thinner than the samples (a
  twig) is taken by the points within half a step of it instead of reading as nothing.
- [ ] **Edits finer than a builder's part**: an edit re-makes what it names (the canopy, its leaves)
  whole; one limb or one leaf can't be kept while the others change. Why: "this branch is approved, the
  rest can move". When: an agent's edit loop asks for it (seeds per limb, a part per limb).

Left from phase 7 (evaluation):

- [x] **The four comparisons run**: one run an arm of each (Sonnet, low effort, US$1.57 in all), in
  docs/evaluation-3d.md: a rewrite keeps the approved parts as a local edit does at half again the
  cost; builders write less but bend a request to their parameters; `pxl check --fix` fixes seeded
  defects with no model; the trace saved a turn. Next: three runs an arm and a second model before
  reading a difference as one, and the defects a picture hides (a part placed by the wrong relation).
- [x] **A numeric fixer for expect3d**: `pxl check --fix`: a failing rule's parts' numbers (where one
  stands, its gap beside another, then a parameter) searched outward from their values until it
  holds, the least change (rounded where a rounder number holds), the rules that held still holding,
  written into the file where the part's spec is written out once; each fix on the world the ones
  before it left.

## Editing by name (pxl inspect, pxl edit)

- [x] **flip turns a turnaround's sprite** (round 6, R2): in the edit experiment `flip` mirrored the
  shrine's fox, so it was lit from the side away from the sun. A `turnaround()` sprite flipped across
  is turned instead: its stamp takes the family's mirror heading (`fox_tama_e` to `fox_tama_w`), drawn
  under the same light, the heading added to the call's `headings` when the family has none there
  (`["e"]` to `["e", "w"]`; refused, saying where, when the call is a helper's or its headings code).
  Facing n or s (its own mirror) or with `axis: "y"` it mirrors as before.
- [x] **inspect --find reads the comment above an asset's definition** (round 6, R2): after its call's,
  the block above the statement that makes it (a helper's caller, a loop) and that line's own; the
  line shown is the one with the most words. The shrine's foxes have a comment each, so "the fox with
  the jewel" finds `fox_tama_e` first.
- [x] **pxl edit faster** (round 6, R2): the rebuild takes the first build's images of what the edit
  can't reach. An asset is drawn again when its defining call, a statement of its own, holds a changed
  character, or when it reads one that is (built, or a group or a name asked for whose answer
  changed); a change outside such a call (a table, a const) rebuilds everything, as before. The check
  after writing runs on that rebuild. Measured on the laptop, HEAD's CLI and this one alternating, the
  same lines printed: a stamp moved on the shrine 23-28 s to 10-16 s (written and checked), 16-18 s to
  9 s dry; the lantern by its table (all rebuilt) 22 s to 17; the sunset's logs and the grove's rock
  5.3 s to 4.4.
- [x] **The ink line round a 3D figure has no normal** (round 6, R2): `scripts/pulse.ts` found 22% of
  the traveler's pixels that only move with none, lit flat: `rig3d`'s and `views()`' `ink` line, drawn
  outside the model, where it has no surface (and the jaw line and a retouch pixel on it). Giving each
  line pixel the mean normal of the model pixels beside it (the silhouette's, facing out) leaves none
  without, but moves the HD-2D scenes that light the figures by their normals (the clearing, the
  graveyard, the harbor). Decided against (round 6, R3, the user's choice): lit by those normals the
  line on the sun's side turns pale and the figure loses its edge against the ground; flat, the ink
  keeps its contrast.
