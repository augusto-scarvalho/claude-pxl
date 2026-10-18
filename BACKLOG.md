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
- [ ] **cleanEdge or MMPX inside the rotation**: newer edge-aware magnifiers; MMPX could replace
  Scale2x in RotSprite. Only if RotSprite's results fall short on real sprites.
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
- [ ] **Register by a point**: move each frame so a marked point (the pelvis) lands on the same x, with
  one y offset per cycle; never by the bounding box.
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
  this 100% (20 questions, two scenes, one held out). Next: a diff against an earlier render (what
  an edit changed), segmenting opaque PNGs, a shorter mode for busy scenes.

Left out on purpose: effects that leave the palette (blur, curves, HSV, convolution), keyframed
tweens and interpolating between drawings, free rotation of cut-out limbs, 2.5D thickness, 3D layers
(render a base in Blender and reduce it instead), mouse-only tools.

## Later / niche

- [x] Layer blend modes and opacity (`blend`, `opacity`, `palettize`), with the palette caveats in
  SKILL.md: they make new colors, so the palette-safe `shade`/`light`/`density`/`glow` come first.
- [x] Onion skin in the live viewer: an "onion" toggle, `,` and `.` step frames.
- [x] Isometric `tilemap` (`iso: true`, one level).
- [x] Export tilemaps to Tiled: `<asset>.tmj` + a tileset image per layer (isometric alignment unchecked in Tiled itself).
- [x] Bitmap fonts: `font(name, sprite, { chars, w, h })` + `text(..., { font })`, and a ready 5x7 font in `examples/fonts/`.
