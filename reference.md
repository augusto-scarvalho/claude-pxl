# pxl reference

Contents: Palette · Assets (items, sprite/scene options, layer options) · Ops (shapes, texture and
tone, placing assets, perspective, going by in a loop, terrain tilesets) · Lighting · Glow · Animation ·
CLI · Library.
To look up one name instead of reading this file: `pxl help <name>`.

Art files are plain JavaScript (or TypeScript) evaluated with the DSL as globals. Nothing draws
at definition time: `sprite`, `scene`, ... record definitions; everything renders at build time,
so assets may reference each other in any order. A top-level name of the file's own that is a DSL
global's (a helper `pose`, `panel`, `smoke`) hides pxl's in it and in the files it includes: build,
shot and check warn when the file loads, at its line; name yours otherwise.

Coordinates are 0-based from the top-left. Sizes are `w, h`. Colors are a single palette key
(`"k"`), a hex string (`"#1b1630"`, `"#rgb"`, `"#rrggbbaa"`), `"."` (skip: leave the pixel) or
`"_"` (erase to transparent).

## Palette

| Call | Effect |
|---|---|
| `use("pico8")` | Built-in palette: `pico8` (default), `sweetie16`, `db16`, `endesga32`, `gray8`. Keys are index chars `0-9a-z`. |
| `use(["#000", "#fff", ...])` | Custom list, keys `0-9a-zA-Z` by index. |
| `use("art.png")` | The colors of an image, keys `0-9a-zA-Z` in the order they first appear (read someone's art with its own palette). |
| `use("colors.hex")` | Palette file, path relative to the art file: `.hex` (Lospec), `.gpl` (GIMP, Aseprite), `.pal` (JASC), `.txt` (Paint.NET). A one-character word right after a color is its key, the rest of the line a comment (`1a1626 k ink`; in a `.gpl`, the color name): only named colors get keys then. A file without keys gets `0-9a-zA-Z` by index. Any color is reachable by index in `pal()`. The live viewer rebuilds when the file changes. |
| `pal({ k: "#1b1630", g: 11, h: "k" })` | Add/override single-char keys: hex, palette index, or copy of another key. `. _ # space` are reserved. Giving a key a ramp of this file runs through another color is a warning (it says the ramp and where it was made; an included kit's ramps too, with `palette: true`): `shade()` and `light()` would step along the new colors. |
| `ramps("kDdu", "kTtq")` | Light ramps, dark → light. `shade` steps a color left, `light` steps right. When a key is in several ramps, the first ramp that goes on from it wins: where two branch from it, `pxl check` warns when a step goes through it; `pxl steps --at x,y` names the ramps a step went along. |
| `roleSwap(from, to)` | Colors by role: a map of roles to ramp keys, dark to light (`const ROLES = { primary: "aAbB", accent: "wWx", tyre: "ktT" }`), and another of the same roles in other colors (a livery `{ primary: "cCdD", accent: "uUv" }`, a palette slot `{ primary: ["#173c34", "#2a7258", "#5cb486"] }`: keys or colors, as many as the role's keys) give a `swap`, each role's keys to its new ones (roles `to` leaves out keep theirs; a key two roles share swapped two ways is an error): `sprite("num_b", { base: "num", swap: roleSwap(ROLES, LIVERY.b) })`, an anim's or a stamp's `swap`. Over a base from another file, a role's keys are that file's and the new ones yours, so a key given back as itself is that file's color to yours (a lamp of `lib/props/lamps.px.js` in your colors: `roleSwap(lamps.ROLES._lamp_square, { line: "k", frame: "nM", light: "Llw" })`). The same role map is a 3D `mats` (the field paints with role names: `.mat("tyre")`), so one livery colors the model (`mats: { ...ROLES, ...LIVERY.b }`) and what is drawn by hand (the roleSwap). A far side a step darker stays `shade` with `floor`. |
| `shades("HGgl", "#5aa040", { hue = 20, at, sat })` | Define the keys (dark → light) as shades of one base color and add them as a ramp. The base sits exactly at index `at` of the keys (0 the darkest; default the middle, floor(n / 2)); darker shades turn toward blue-violet and lighter ones toward yellow, up to `hue` degrees at the ends (hue shifting; `hue: 0` for lightness only; a negative `hue` turns the other way, for metals: lights colder, darks warmer). The darks gain a little saturation and the lights lose some toward white; `sat` (-1..1) instead makes the lights that much more saturated and the darks that much less (`sat: 0.3`: Saint11's ramps, no pastel lights). One call per material. |

Every asset keeps the palette that was active where it was defined, so files with different
palettes can be included and stamped together.

## Assets

```js
sprite(name, opts?, ...items)
scene(name, { w, h, bg?, ... }, ...items)
layer(name, layerOpts?, ...items)      // only as an item of a sprite or scene (layers don't nest)
plate(relightOpts?, ...items)          // the items drawn and lit on their own, then laid down: anywhere
group(name, ["a", "b", "rock_*", ...])  // random pick per placement; repeat a name to weight it
sheet(name, ["slime*", "heart", groupName], { cols?, pad?, extrude?, rows?, slots? })  // extrude: repeat edge pixels n px out; rows: "tag", each animation on a row of its own; slots: palette slots for an engine (Output for engines); a sheet of animations also plays them all at once in _preview/<sheet>.gif
include("other.px.js")                  // path relative to the current file; included files share one scope: a const of one is seen by the other (name what they share, like a cue frame; each name declared once)
directions("ship", 16, { from, outline?, outline8?, symmetric?, draw?, rotate?, pivot? })  // ship_0..ship_15 + group "ship"; see rotation.md
turnaround("house", thing, { view?, ppm?, n?, headings?, part?, ... })  // a thing in 3D seen from n headings: house_n, house_ne, ... + group "house"; see turnaround() below
rig3d("tr", { body, moves: { walk: { frames, ms, pose } }, n?, parts?, head?, blocks? })  // a figure on the 3D layer in n headings: tr_walk_s, ... + group "tr_walk"; see rig3d() below
genre("fighting", { camera, grid, scale, heads, dirs, states, contract, pitch, checks })  // a profile as data, its checks run by pxl check on what names it: see genre() below
views("_head", { s: grid, sw, w, nw, n }, { anchor, like? })  // hand-drawn views pivoted on an anchor, the others mirrored: _head_s, ... + group "_head"; see views() below
font(name, "glyph_sprite", { chars: "ABC...", w, h, cols?, mono? })  // bitmap font: glyphs in w x h cells, in chars order; trimmed to their ink (proportional), or all as wide as the widest with mono: true (a score, a timer)
include("palette.px.js", { palette: true })  // also take its use()/pal()/ramps() from here on
include("../nature/kit.px.js", { as: "nature" })  // its names under nature.: its "lamp" is "nature.lamp" here
own("_parchment")                       // in a kit: the full name of a name it defines, under the `as` it was included with ("dialog._parchment"; without one, "_parchment")
rig(name, { w, h, facing, slots: { torso: { at, size }, arm: { at, size, side: "r" } }, parts?, guide? }, ...retouch)  // skeleton first: characters.md §11
figure(h, heads = 7.5)                  // a standing figure's landmark rows: head, eyes, chin, shoulders, chest, elbows, waist, crotch, wrists, knees, ankles, sole; widths headW, shoulderW, hipW
rng(seed?)                              // a seeded random() for code at the top of a file: the same numbers every build
ik(a, b, [x, y], bend?)                 // two bones from (0, 0) reaching for the point: [joint, end]; bend 1 (default) bends toward increasing angle (y down: an arm's elbow below, a leg's knee behind), -1 the other way
ik3(a, b, l1, l2, hint)                 // the same in 3D: bones l1 and l2 from point a reaching for b, the joint between them pushed toward the way `hint` (a knee forward); out of reach, straight
has(name)                               // is there an asset or a group of that name yet (a generated part made once)
```

A rig is a sprite: each slot is a joint `at`, a box `size` (the part's size, outline included), the
point of the part on the joint (`pivot`, default its top middle), its body side (`side: "l" | "r"`)
and `z`; the part is the asset `<rig>_<slot>` (or `part`), a labelled stand-in box until it exists
(`parts: false`: stand-ins only). The far side's parts go behind the middle (-100), the near side's
in front (+100), plus `z`. `guide` (default true) shows the drawn parts' slot boxes and the joints in
previews. Items after the options are a retouch layer on top. `PXL describe` prints a RIG section.
`light: [x, y]`: the light the parts are drawn under; each part's lit side is checked against it.
`far: n`: the far side's parts n steps darker along the ramps (a slot's own `far: n` for its part,
0 keeping it as drawn). `turn: "name_l"`: also the same rig
facing the other way (side views), its joints and pivots mirrored, each slot taking `name_l_<slot>`
when that is drawn, else the original part flipped (`turn: { name, parts: ["a_", "a_l_"] }`: slots
that name their parts, shared by many rigs, are looked up under the other prefix instead, faces too);
the retouch mirrored; and `<rig>_turnaround`,
both side by side. A part's `front` socket (a point on its nose, toe, fist, blade's tip) is checked
against its `facing`: it must sit on the drawing, on the half the label says it faces (behind both its center of mass and the middle of what's around the marker is the back half). A long thin part (a blade) is checked for which face is lit, not which side.
Slots also take: `on: "arm_l.hand"` (its joint is that socket of the part in another slot: a shield
in the hand); `out: n` (how far out from the body's side it sits beyond its limb: over the arm on
the near side, under it on the far side); `faces: { outer, inner, edge }` (a part whose two sides
differ, each its own drawing: the rig shows the one turned to us, from `facesTo`, the body's way its
outer face points, default its side; `edge` when it is seen side on); `parallel: ["strap", "grip",
"arm_l.elbow", "arm_l.hand"]` (two of its sockets and two of another slot's, whose lines must run
parallel: the shield's straps along the forearm).

An included file's `use`/`pal`/`ramps` apply to its own assets only: they draw with its palette,
wherever they're stamped. Your palette is the same after the `include` as before it, so a `pal()`
of yours after it adds to yours (pico8 unless you said), not to the included file's: a key only it
has is unknown in your grids, and the error names the file whose palette has it. Pass
`{ palette: true }` to share one palette file across art files (your `pal()` then adds to it).

`include(file, { as: "nature" })` puts the names the file defines (its assets, groups, sheets and
fonts, and those of what it includes) under `nature.`: its `lamp` is `nature.lamp` to you, so two
kits that both have a `lamp` can be included side by side. Inside it nothing changes: its drawing
asks for `lamp` and gets its own (its stamps, `base`, groups, globs, `has()`, fonts look in its
namespace first, then outside). `nature._grass` stays a part (not exported). It doesn't cover
JavaScript: included files still share one scope, so a top-level `const` or `function` of the same
name in two files clashes (wrap a kit's own helpers in a block `{ ... }`). Names are looked up by
the asset being drawn, not by where the code was written: a kit's helper that your own asset calls
finds names as yours does (give it `nature.lamp`); the names it hands back (`R.names`,
`turnaround()`'s) are full ones. So a kit's constant that holds its own names takes them by `own()`
(`dialog.PARCHMENT = { panel: own("_parchment") }` in `lib/ui/dialog.px.js`: `dialog._parchment`
under `as: "dialog"`), at the kit's top level, while it runs. A `swap` on a `base` from another file
names that file's colors: its keys are read in the base's palette, the colors it swaps to in yours
(`sprite("lamp", { base: "props.lamp", swap: { g: "#ffd27a" } })`, `g` the kit's glass). Output
files take the full name (`sprites/nature.lamp.png`).
Locations name an included file by its path from your file's folder (`../nature/kit.px.js:13:3`),
so two `kit.px.js` stay apart in errors, `pxl list` and `pxl edit`.

`genre(name, spec)` is a profile as data (a genre as players name it: fighting, action top-down,
racing): what the art file reads, in the fields the library's profiles use: `camera` (`{ kind,
pitch }`), `grid` (a tile's px, or `null`), `scale` (a box per category, `[tall, wide]` in tiles, px
with no grid: `{ character: [1.5, 1], tree: [2.5, 2.5] }`), `heads`, `dirs`, `states` (`{ idle: {
frames, ms } }`), `contract` (`{ boxes: ["hurt", "hit"] }`), `pitch` (the figure's own, apart from
the camera's), `tones` (what a `turnaround()` or `rig3d()` naming it draws its surface in, where its `surface` gives none: 3 at 16-32 px) and `checks`; any other field is kept as given, for the file (`steer`). It
returns them with `name`. An asset made for it says `genre: "fighting"` (a sprite, an anim,
`rig3d()` and `turnaround()` pass it to what they make), and `pxl check` runs the genre's checks on
it: `"ground"`, the feet (its lowest row) on one row through every frame of a move (fighting);
`"height"`, a family (a group whose members all name the genre: a `rig3d()` move's directions, a
turnaround) standing as tall over its pivot in every direction, its tallest frame each
(action top-down); `"footprint"`, every frame's drawing reaching down to its `footprint` box, where
it meets the ground (`turnaround()` gives one; what is nearer us may hang lower, a bumper seen from
above) (racing). See scenes.md, "Profiles".

Names starting with `_` are **parts**: usable everywhere but not exported, and not matched by
sheet globs.

### Items (run in order)

- **Grid string**: one char per pixel, drawn at 0,0. Rows are trimmed, blank edge rows dropped,
  short rows padded. `.`/space keep, `_` erases. Use template literals for multi-line grids.
  In a `layer()`, `_` (here and in every op) clears that layer's own pixels only, and what lies under
  it still shows (an erase that clears nothing of its layer is a warning): erase what is below at the
  asset's top level, after the layers.
  `grid(x, y, str)` draws one at x, y: a patch over what's there (a frame's changed pixels, a fix).
  For figures wider than ~20 px, `runs()` (below) avoids counting dots.
- **Op**: `rect(...)`, `stamp(...)`, ... (below).
- **Function**: `(c) => { ... }` gets the canvas; call ops as methods (`c.rect(...)`), plus
  `c.w`, `c.h`, `c.is(x, y, "ab")` (pixel is one of these keys; `"*"` opaque, `"."` transparent),
  `c.key(x, y)`, `c.get(x, y)` (packed color), `c.rng(seed)` (deterministic, follows reseed),
  `c.size(name)` (`{ w, h }` of an asset as it would be placed, for layouts),
  `c.subpixel(dx, dy, () => { ... })` (what the function draws, laid down moved by dx, dy, between
  pixels too, as `stamp`'s `sub` lays an asset: subpixel motion for parts drawn in code);
  `c.z(depth, (c) => { ... })` and `c.y(row, ...)` (a drawing in its turn among a sorted layer's stamps,
  ties in call order; outside one, now), `c.sort("z" | "y", () => { ... })` (what it stamps and hands
  to c.z / c.y drawn in that order when it ends: a depth sort inside a function, far to near with
  `c.z(-distance, ...)`, `examples/perspective/park.px.js`); `c.as("bench", (c) => { ... }, { id, height, facing })`
  (what it paints, a placement by that name, `id` which one as a stamp's: describe lists it and check
  reads it as a stamp; kept only where something reads placements, a pixel painted over in its own
  color not counted).
  Three differ from their globals: `c.clip(region, () => { ... })` and `c.plate(() => { ... }, opts)`
  take a function instead of items, and `c.pose(joints, opts)` a joints map instead of a file;
  `lighting`, `glow` and `frame` are items only, never methods.
- **Procedural texture** (globals, plain functions, the same in every file): `hash(i, j)` a number in
  [0, 1) for a lattice point (integers: the same i, j always give the same), `hash(i, j, seed)` another
  for each seed (a leaf's place, its shape, its color: one draw each); `vnoise(x, y)` smooth
  value noise in [0, 1], one unit a cell; `fbm(x, y, octaves = 4)` octaves of it, each finer and
  fainter, for billows, clouds, rock; `bayer(x, y)` the ordered-dither threshold in (0, 1) for a pixel
  (add `bayer(x, y) - 0.5` times a little to a value before thresholding it into tones: soft edges
  without noise); `seamless(fn, w, h?)` the function `(x, y) => number` made to close over `w` (and
  `h`), its value at x blended with its value a width back, for noise on strips and tiles that wrap:
  `const n = seamless((x, y) => fbm(x / 30, y / 30), 640)`. `profile([x0, y0, x1, y1, ...])` a ground
  or a ceiling as a polyline (x going up): `(x) => ` its row there, rounded (the first leg carried on
  before it, the last row after): props stood on a cave's floor (`examples/grotto.px.js`).
  `lane([x0, y0, x1, y1, ...], { round })` a path as a polyline, its corners rounded `round` px: `(x, y) =>
  [s, u]`, how far along it the nearest point lies (px; its first and last legs carried on) and how far
  to its right (px, negative to its left), `.total` its length along, `.point(s, u)` the other way (what
  a stamp's `along` reads): what is laid along a path, slabs
  in courses at steps of `s` that fan round a bend, its edges at `|u|`, its ends at `s` 0 and `total`, a
  road's lines, a river's banks. `vec` the
  vectors of a hand-built 3D piece, as arrays: `vec.add(a, b)`, `sub`, `mul(a, k)`, `dot`, `cross`
  (3D), `len`, `unit` (`const { add, mul, unit } = vec`).
- **Layer**: drawn on its own image, then blended in at its place in the list.

### Sprite / scene options

Scenes take `w`, `h`, `bg`, `world`, the transforms, the outlines, `crop`, `layers`, `pivot` and `wrap`;
the rest are for sprites and anims (a scene refuses them by name), and `bg` for scenes only; an anim
with a `world` (and `check`) is checked as a scene (functions naming what they paint with `c.as()`).

| Option | Meaning |
|---|---|
| `w, h` | Canvas size. Sprites infer it from grid strings (including grids inside layers) when omitted; scenes require it. |
| `base: "name"` | Start from a copy of another asset (variant). Overlay coordinates are the base's final coordinates (outline included). An anim made from an anim, with no `frame()` of its own, plays as its base: its frames, each as long as the base's (100/50/150 ms stay so), its loop, `dir` and pivot, unless it gives `fps` or `ms`: `anim("hero_red", { base: "hero_walk", swap: { b: "r" } })`. |
| `bg` | Scene background color. |
| `mx: true` | Mirror the left half onto the right after all items. Inferred width doubles (write half a row). `mx: "c"`: odd width, shared center column. `my` likewise vertically. |
| `swap: { g: "r" }` | Recolor after drawing. With a `base` from another file, its keys are that file's (the base's palette), the new colors yours. |
| `flip: "x" \| "y" \| "xy"`, `rot: 90 \| 180 \| 270` | Transform. |
| `angle: deg`, `rotate: "auto" \| "rotsprite" \| "shear" \| "nearest"` | Any angle, clockwise, after `flip`/`rot` and before `outline` (the outline is drawn around the turned shape). `auto`: quarter turns exact, within 12° of one a shear (a lean that keeps every pixel), else RotSprite. No new colors. See [rotation.md](rotation.md) for which angles hold up. |
| `outline: "k"` | 1px outline around opaque pixels; **grows the canvas 1px on every side**. `outline8` also fills diagonals. |
| `inline: "k"` | 1px line over the sprite's own edge pixels (Aseprite's inside outline): the canvas keeps its size. |
| `inline: { color: "k", keep: "Kk12" }` | The same, but edge pixels in the `keep` keys stay as they are: closes only the gaps of an outline that is already there, such as the one left after shrinking an image (`shrink`), selective colors included. |
| `aa: true` | Anti-alias the edges between two colors inside the sprite, as by hand: on each step of 2 px and more, a strip half its length from the corner, on the lighter side, in the key between the two (a ramp through both, or a chosen color near their middle; none, no strip). Nothing against the clear, on 1:1 diagonals or straight edges. Before the outline. Hand AA reads better: use it on lines and big round shapes, then fix by hand. |
| `selout: true \| n` | With `outline`/`outline8`/`inline`: each line pixel takes the sprite color it touches, `n` steps darker along the ramps (`true` = 2), so the line softens next to light colors; colors without a ramp keep the line color. Needs `ramps`. (On Pixel Joint "sel-out" is something else: an outline lightened toward the fill, which they call bad anti-aliasing except over a known dark ground; keep the silhouette's outer line dark on light or busy grounds.) |
| `caps: true \| n` | Where a straight run of the edge's line ends and the line steps on diagonally, its end pixel goes `n` steps darker along its ramp (`true` = 1): light runs with dark caps, so a selective outline holds on any ground (So You Want To Be A Pixel Artist's fighters). After `outline`/`selout`; with no outline, the sprite's own edge pixels (Capcom vs SNK's look, no new colors). 1:1 diagonals stay. Needs `ramps` |
| `floor: "k"` | With `selout` or `caps`: keys a step never lands on, so each ramp stops a key above them. When every ramp starts at the ink (`ramps("kSsz", "kNn")`), `selout: 2, floor: "k"` gives skin its darkest tone two steps down and cloth its own one step down, and an edge already on a ramp's darkest keeps it: no black round everything. |
| `crop: true` | Trim to opaque bounds. |
| `layers: true` | Also export each layer as `out/<sprites\|scenes\|anims>/<name>/<layer>.png` (anims: frame 0's). |
| `png: "file.png"` | Start from a PNG (path relative to the art file), like `base` starts from another asset: every option and item then works on it. In an `anim` with `frames: n`, frame k is the k-th of n equal slices of the image (a strip). The live viewer rebuilds when the file changes. Any PNG except interlaced ones. |
| `frozen: "_live"` | With `png`: a frozen cell, an approved render kept. The PNG is a render of the asset named (the live one, defined before it; a `_` part is built only when asked): the build reads the PNG (a 128 px tree in a second instead of a minute and a half, to iterate a retouch or `foliage()` over it with `base`), and `pxl check` renders the live one and warns when it drifted from the PNG (the engine or the recipe changed what it draws). No PNG there yet: the live render, and the build writes it there; approved a new one, delete the PNG and build. Pixels only (normals, boxes and sockets aren't kept); with `pivot`, `sockets`, `height`, `genre`, `facing` at most (the pivot the live one's unless given). `sprite("oak", { png: "oak_128.png", frozen: "_oak_live" })` |
| `normals: "file_n.png"` | With `png`: its normal map, a PNG laid out as it (made by Sprite Fusion, another tool or by hand; pxl's own `_n.png`), read as data, never palettized: RGB = normal × 0.5 + 0.5, green pointing up (OpenGL's), its y flipped once to pxl's, each made unit length (one pxl wrote comes back exactly), none where either PNG is clear. `area` cuts both; an anim with `frames` takes each frame's from the same slice. Lit by `lighting()` and `mesh()` as `bump`'s are (lighting.md). Not with `shrink`. |
| `area: [x, y, w, h]` | With `png`: only this part of the image (one sprite out of a sheet). |
| `key: "#ff00ff"` | With `png`: that color read as clear before `area`, `shrink` and `palettize` (a ripped sheet's cell fill; `pxl study` names it). |
| `palettize: true` | With `png`: snap every color to the nearest keyed palette color, so `ascii`, `swap` and `recolor` see keys. |
| `shrink: n` | With `png`: shrink by a whole factor (1 leaves it as it is), after `area`. Each n×n block becomes its most common opaque color (ties: the first, scanning the block column by column), or transparent when fewer than half of its pixels are opaque. Keeps silhouettes and the curves of shapes far better than sampling one pixel per block: the start for a smaller version of finished art (then redraw what it breaks; see characters.md). |
| `slice: n \| [left, top, right, bottom]` | 9-slice margins of the final image (outline included) for `panel()`; flips and rotations turn them; sheets export them as Aseprite `meta.slices` (bounds + center). |
| `wrap: true \| "x" \| "y"` | Seamless tile (Aseprite's tiled mode): drawing, stamps, fills and reads past those edges continue on the opposite side, and the preview lays the tile out 3×3 (3×1, 1×3) so seams show. For tiles that repeat themselves; random variants placed side by side don't line up across edges. |
| `pivot: "bottom" \| "center" \| [x, y]` | The point `stamp`, `scatter` and wire hangs put on the given position. `"bottom"` is the middle of the final image's bottom edge, so `stamp("tree", x, groundY)` stands it on row `groundY` whatever its size. `[x, y]` is in drawing coordinates (pixel corners) and moves with flip, rot, outline and crop, here and in placements. A `base` variant starts with its base's pivot. Sheets export it as a normalized `pivot` (0.5, 1 = bottom center). |
| `register: "m" \| { key, x }` | Register every frame by a marked point (the pelvis): the drawing moves sideways so the pixel of key `m` lands on `x` (default the middle); y is left alone, so the bob stays. Never by the bounding box: an arm reaching out moves it. The marker is a key used for nothing else, best drawn per frame in a `ref: true` layer (`layer("marks", { ref: true }, frame(px(12, 20, "m")), ...)`); drawn in the art, it is erased once found. A frame without it is an error. |
| `twin: "name_l"` | Also the asset facing the other way under that name: the same items drawn mirrored before they are lit, so `relight` lights it from where the light really is (a `flip` carries the light across); pivot, sockets and `facing` mirrored. Art functions see `c.mirrored` (for choices a mirror doesn't make, such as which edge of a hand-lit blade is the lit one). `text`, `bump` and `normals` refuse to run in a twin. |
| `facing: "right" \| "left" \| "front" \| "back"` | Which way it faces as drawn ("front": toward us). Flips and turns carry it, and `PXL describe` says for each placement where it faces, which way its top points (upright, lying, upside down, leaning), which of its sides is toward us, and when it is a mirror image (a flip moves a sword to the other hand). Lettering is tracked even without `facing`: a mirrored sign gets a warning that it reads backwards. In a rig, a part whose `facing` differs from the rig's is called out. It is a label: pxl does not read the pixels to check it. |
| `height: meters` | Its real height. In a scene with `world`, describe says how tall it should be where it stands, and how far off the drawing is. It measures the drawing's box, top to bottom: a thing seen at an angle (a tent, a cart, a log) has its far end higher on screen, which the box counts too, so judge its near end yourself (describe says so when a wide thing comes out too tall). |
| `world: { horizon, eye }` or `{ scale }` | Scene (an anim too: then checked as a scene): the world's scale. Ground in perspective: the horizon's row and the eye's height in meters (a thing standing on row y is (y − horizon) / eye px per meter, as in `perspective()`); flat side view: `scale` px per meter, `view: "top"` a flat world seen from above (a map, its up away from us: a top-down RPG's). Used by describe with `height`. `light: [x, y]` (where the light comes from; `"sun"`: `look3d()`'s light as things standing up show it, the one sun for the 3D ops, the lit side and a shade layer's `cast: "sun"`): describe reads each object's lit side off its rim and warns when it disagrees (a flipped copy is lit from the other side). `light: { at: [x, y] }`: a point light in the scene (a fire, a lamp): each object is checked against the way from its middle to that point, and the one it sits in isn't checked. Without `light`, each object is read against the light it was drawn under: the lamp its scene's `lighting()` lit by that is strongest at its middle (by its `power` and `r`, walls not counted), or a sprite in `mesh()` against the mesh's `light` through its camera; `light: false`: not read. `ground: y` (flat views), or a profile `[x0, y0, x1, y1, ...]` (a cave's floor: the row under each thing's feet, as `profile()`; `stamp(name, x, "ground")` stands on it), or several (`[floor, ledge]`: the floor everywhere, each ledge over its own span; the feet read against the one nearest them, `"ground"` the first): what has a `height` is checked for floating or sinking; with or without it, a thing whose feet aren't where it was stamped (its pivot below its sole) is called out. |
| `sizes: { name: k }` | Scene: the same scene k times as big under each name (`sizes: { plaza_hd: 4 }`, `examples/hd2d/plaza.px.js`), each with `pixel: k` and `check: false`: one scene drawn at several sizes, the small one checked. `post()` runs only at the sizes (what the camera does to the HD picture), its px the art's. |
| `pixel: k` | Scene: px to a pixel of the art (`w` and `h` the picture's): `c.k` in its functions; `mesh()` draws its camera k times as big (`perspective()`'s or a view's), its sprites' pixel k x k and its materials in blocks of k, ramps and textures (a texel a block, as pixel art; a material's own `block` wins: `block: 1` for a texture laid finer); `surface()`, `voxels()`, `volume()`, `splats()`, `decal()` through the camera a ray a block; `c.meshSocket()` the same; `post()`'s `blur`, `focus`, `bloom.r` and `pixel` in the art's px (`px: true` keeps the picture's). `text()` doesn't follow (draw it at `c.k`'s scale yourself); `bubble()` does (`unit`). For one size with a clock of its own (an excerpt: `harbor_clip`). |
| `check: false` | Scene: `pxl check` (and the examples' test) skip it, saying so. For an HD render of a scene that is checked at its own size (`sizes` gives it). `check: { every: n }` checks one frame in n: a long story (the graveyard's 484 frames) at the cost of a short loop. |
| `expect: [rule, ...]` | Scene: rules on its placements, as `describe` measures them, run by `pxl check` at the frames it checks (a warning says the rule, the frames and the numbers: "the gap is 2 px, wanted 4-8"). `a` and `b` name a placement by its stamp's `id`, else its asset's name (placed once; not in a shade or light layer); `b` may be a box `[x, y, w, h]` (a path painted in the ground). `{ beside: [a, b, { gap, side }] }`: `gap` the empty px between their pixels (0 touching, as describe counts; `n` or `[min, max]`), `side` `"left"`, `"right"`, `"above"` or `"below"` (a's box's two edges past b's that way: a lantern above a long path wherever along it), either or both (a side alone at any distance, overlapping too); `{ before: [a, b] }` a drawn in front (a later layer, or in a layer sorted by y, its y lower); `{ apart: [a, b, min = 0] }` (0: no overlap); `{ inside: [a, region] }` every pixel (a region as `clip()`'s: a box, a circle, a polygon, `(x, y) => bool`); `{ onGround: [a, row or profile()?] }` its feet within a px of the ground under them (check's feet rule; default `world.ground`). Over a loop, `{ while: [rule, rule] }` (the first holds wherever the second does) and any rule's `frames: [first, last]` (that span only). `pxl check --fix` changes one number of a placement a failing rule names, its relation's (beside's gap, along's s or u) or else where it stands (x or y), by the fewest px that make it hold and keep holding the rules that held (`expect3d`'s search, a px at a time up to 64; what is placed by a relation to it moves with it), and writes the number where it is: the stamp's own, or a table's (`const AT = { pack: [127, 148] }` behind `stamp("pack", ...AT.pack)` or `AT.pack[0]`); one computed in code is said and left; nothing is written that doesn't hold rebuilt (a number another placement shares). `examples/sunset/sunset.px.js` (the camp), `topdown.px.js` (the island), `shrine/shrine.px.js` (the lanterns, the miko over her loop). |
| `genre: "fighting"` | The `genre()` it is made for: `pxl check` runs that genre's checks on it (above, under Assets). |
| `sockets: { name: [x, y], ... }` | Named points in drawing coordinates (pixel corners) that other stamps attach to: `stamp("arm_3", 0, 0, { at: "body.shoulder" })` puts the arm's pivot on the body's `shoulder` socket, wherever and however the body was placed. They move with flip, rot, angle, outline and crop, like the pivot. For characters built from parts (characters.md §10). |

Post-processing order: register → mirror → swap → flip → rot → angle → aa → inline → outline → outline8 →
crop; a `pivot: "bottom"` or `"center"` and `slice` are measured on the result.

### Layer options

| Option | Meaning |
|---|---|
| `x, y` | Offset of every op in the layer. |
| `sort: "y" \| "z"` | Draw the layer's `stamp`s and `scatter` picks sorted instead of in call order: `"y"` by the point they stand on (top-down scenes: what stands lower, nearer the viewer, covers what stands higher), `"z"` by each `stamp`'s `z` option (default 0; scatter picks are always 0). Ties keep call order. Other ops in the layer draw at once, before the sorted stamps. |
| `hidden: true` | Skip when compositing (still exported with `layers: true`). |
| `outline: false` | The asset's `outline` / `outline8` / `inline` isn't drawn around this layer's pixels (1 px ropes, pegs, smears stay 1 px), through mirror, flip, rot and angle. Its pixels stay where they are in the drawing order. |
| `ref: true \| (0, 1]` | Reference / guide layer: previews and the live viewer show it over the art (`true`: full color, so small marks stay visible; a number: that strength over drawn pixels, to see the art through a mannequin or a shrunk original); the exported PNG, sheets, `layers: true` and stamps of the asset leave it out. For drawing over a pose skeleton (`pose`), a mannequin or a shrunk original. It stays in drawing coordinates: an `outline`'s growth is followed, but mirror, flip, rot, angle and crop are refused. |
| `shade: true \| n \| { m: "M" }` | Blend layer: not drawn. Wherever it is opaque, what's below steps darker along the ramps (`n` steps, or the given map). |
| `light: ...` | Same, lighter. Cast shadows, light spills, glows. |
| `of: "props" \| [...]`, `cast`, `except: [names]` | A shade layer that draws the shadows of those layers' stamps and tiles (theirs listed once: a moved prop takes its shadow with it), their functions' too (each run again, only what it stamps or tiles landing: a `route()`'s walker, an anim stamped by the frame), each silhouetted and laid down by `cast` (`[kx, ky]` or `{ from, len }`, as a placement's; `"sun"`: `look3d()`'s light laid on a world seen from above, `world: { view: "top" }`, a pixel h px up landing h × [−x / z, y / z] away) or its own `shadow` (`false`: none), but those named in `except`, besides its own items, where it stands in the list (under what stands, a firelight or a bridge between): `layer("shadows", { shade: 2, of: "props", cast: [0.62, 0.22] })`, a contact one `layer("contact", { shade: 2, of: "props", cast: [0.18, 0.12], except: ["tree"] })` (`examples/tropical/forest.px.js`, `rig/tournament.px.js`) |
| `density: 0..1` | Ordered-dither the layer (soft edges). Stack a low-density big shape and a full small one for falloff. |
| `blend: "multiply" \| "screen" \| "add" \| "overlay" \| "normal"` | Color math with the pixels below, like an image editor's layer modes: `multiply` darkens (night, a tinted shadow), `screen`/`add` lighten (light, fire), `overlay` tints with contrast (color grading). **The results are new colors, off the palette.** `multiply`, `screen`, `add` and `overlay` touch only opaque pixels below; `normal` (and `opacity` alone) draws over empty ones too. |
| `opacity: 0..1` | Real translucency (glass, water, fog) instead of `density`'s dither; with `blend`, how much of the blend shows. New colors too; over empty pixels the layer keeps that alpha. |
| `palettize: true` | With `blend`/`opacity`: snap each result to the nearest keyed palette color. Works only when the palette has those tones; otherwise distinct colors collapse into one and shading is lost. For darkening inside the palette, use `shade`. |

## Ops

`?` marks optional arguments.

### Shapes
| Op | Notes |
|---|---|
| `px(x, y, c)` | |
| `grid(x, y, "str")` | a grid string drawn at (x, y) instead of 0,0: `.`/space keep, `_` erases. Frame patches (`frame(grid(...))`) and small fixes over what's drawn |
| `rect(x, y, w, h, c)` · `box(x, y, w, h, c)` | filled · 1px border |
| `line(x0, y0, x1, y1, c, width?)` | width > 1 = round brush (tubes, poles, thick strokes) |
| `curve([x0, y0, x1, y1, ...], c, { width?, closed? })` | smooth curve **through** the points (Catmull-Rom, no hidden control points): tails, vines, hair, cables, handles. 1px wide it is pixel-perfect (no doubled L-corners); `width` > 1 = round brush; `closed: true` loops back to the first point (then `fill` inside). For linework; a small closed shape such as a leaf reads better drawn pixel by pixel in a grid |
| `hline(x, y, len, c)` · `vline(x, y, len, c)` | |
| `circ(cx, cy, r, c)` · `ring(cx, cy, r, c)` | pixel-art circles; ring is a clean 1px border |
| `ellipse(cx, cy, rx, ry, c, ring?)` | |
| `arc(cx, cy, r, from, to, c, { inner?, taper? })` | part of a ring, from angle `from` to `to` (degrees, clockwise from pointing right; the sweep goes from one to the other, either way round): 1 px wide, or down to radius `inner` (0: a filled sector). `taper: true` grows its width from nothing at `from` to `inner` at `to`: a blade's smear, thickening toward the blade. Halos, rainbows, partial rings |
| `capsule(x0, y0, r0, x1, y1, r1, ramp, { light?, rim? })` | a tapered round stick, in px: from (x0, y0), `r0` px either side, to (x1, y1), `r1`. Each pixel takes the `ramp` key (dark to light) for where it sits across it toward the light (`light: [x, y]`, where it comes from, default the upper left `[-0.5, -1]`); the last key only along the lit edge (`rim: false`: spread like the rest). Limbs, logs, pipes, a snake: a round look without a plate. For a limb in meters, its ends from `P.ground` and each radius times `P.scale(z)` at that end |
| `flame(x, y, size, keys, { wind?, period?, seed?, frame? })` | fire rising from (x, y), about `size` px tall: `size / 2` tongues, each flickering to its own beat (`period` frames per cycle, default 6), bending with the wind toward the tip (`wind` px across per px up, default 0.55; negative leans left). `keys` from the root, hottest, to the tip; the last one only for the tongues' edges up top (extinction's `"XWVUT"`: white, yellow, amber, orange, and red for the edges). Follows the canvas's frame inside an anim (or `frame`): keep the frame count a multiple of `period` so it loops. Its tongues come from `seed` alone (default 1): two fires without their own `seed` flicker alike. Burning trees, logs, grass, torches |
| `poly([x0, y0, x1, y1, ...], c)` | filled; vertices on pixel corners (`[0,0, 4,0, 4,4, 0,4]` = `rect(0,0,4,4)`) |
| `fill(x, y, c)` | 4-connected flood fill |
| `wire(x0, y0, x1, y1, sag, c, { hang?, every = 6, start?, ...placement })` | sagging cable, drawn pixel-perfect (no doubled steps), symmetric when level; `hang` stamps an asset/group under it every `every` px (string lights) |
| `text(x, y, "str", c, { scale = 1, gap = 1, lead = 1, align: "l"\|"c"\|"r", shadow?, font? })` | built-in 3×5 font: A-Z 0-9 and common punctuation, `\n` for lines; `font` uses a `font()` instead (`lib/ui/font5x7.px.js` is a ready 5×7 one to `include`; its old path, `examples/fonts/font5x7.px.js`, still works). `c` a key, or each letter's: `(i, ch) => key` (`null` leaves the letter out and keeps its place; `i` counts the letters, not the line breaks): a sign's letters lit one by one, one flickering. The 3×5 is for numbers and short labels: O and 0, S and 5 are the same glyph, and 21 pairs differ by one pixel (C/E, H/K, K/X, I/1, G/6...). A reader sorts them out from the word, but not on a busy, lit sign: words that must read take the 5×7. `scale: 2` puts 2× pixels beside 1× art: keep it for a UI made as its own asset |
| `bubble(x, y, title, lines, { panel, tail?, rule?, more?, font?, color?, side?, t?, unit?, pad? })` | a dialogue box over whoever speaks, its look the file's own sprites (a game's parchment, Triangle Strategy's): `title` ("" for none) over `lines` (an array, or a string's lines) in `panel`, a 9-slice (`slice`) sized to them; off to one `side` of (x, y) (art px; 1 right, -1 left), its `tail` down to that point a fifth of the way in (the tail's top rows, the panel's bottom `slice` margin of them, lie over its bottom border: draw the join there, the rest clear); `rule` a 9-slice under the title (its left margin a diamond the title starts after), `more` the prompt in the lower right corner, an anim at frame `t` (the frames since the box opened: its bob and blink are its own frames); `color` the words' key or `[title, lines]`; `pad` px in from the edge (7). Kept inside the picture: near an edge the box slides along its tail, the tail still on the speaker; what still runs off (the tail can go no further) is a warning in check and shot. In pixels of max(1, round(`c.k` × `unit`)) px: `unit: 0.75` is finer than the art at a size, as a game's interface is. Draw it after `post()`. A parchment to include: `lib/ui/dialog.px.js` (`{ ...dialog.PARCHMENT, side, t }`; its old path, `examples/hd2d/dialog.px.js`, still works, with `PARCHMENT`) |

### Texture and tone
| Op | Notes |
|---|---|
| `dither(x, y, w, h, c1, c2, density = 0.5)` | Bayer 4×4; c2 covers `density`. Dither between neighboring tones of one ramp (two far apart make a harsh checker); a sprite under about 32 px rarely needs any |
| `grad(x, y, w, h, "abc", dir = "v", soft = 0.5, seam = "dither")` | bands with dithered seams; `"h"` horizontal; `"r"` radial, from the center out to the ellipse that fits the box (end on `"."` to leave the corners alone: suns, halos, vignettes); soft 0 = hard bands (crisp rings). `seam: "lines"`: the next tone comes in by whole rows (columns for `"h"`) at shrinking gaps, not a checker: a sky's bands |
| `noise(x, y, w, h, "ab", density = 0.1, seed = 1, on?)` | deterministic speckle; `on` (the 8th argument, a string: `noise(0, 0, 32, 32, "ab", 0.1, 1, "g")`) only touches those keys (`"*"` any opaque) |
| `shade(where?, steps = 1, density = 1)` · `light(...)` | step colors along ramps inside a region |
| `rampmap(ramp, { where?, hue? })` | gradient map onto a ramp, kept in the palette: the distinct colors in the region, sorted dark to light by brightness, take the ramp's keys in that order, spread from its darkest to its lightest. Tones never merge while there are no more colors than keys (`palettize` snaps each color to its nearest key, and two can land on one). `hue: [from, to]` (degrees, wrapping past 360) takes only colors of that hue: the greens and the browns of an import go to their own ramps, `rampmap("Ggl", { hue: [70, 170] }), rampmap("bco", { hue: [10, 50] })` |
| `foliage(ramp, { tufts?, step = [7, 4], vary = 0.5, seed?, where? })` | leaves in screen px over what is drawn (a 3D render's crown, a frozen cell): hand-drawn tufts of steps along `ramp` (`+` a tone lighter, `=` as it is, `-` darker, `.` nothing; five by default, 4 to 12 px wide), each pixel stepped from the tone already there, so they keep its light and shadow; laid in rows from the top about `step` [across, down] px apart, the lower over the upper like shingles, none on the ramp's darkest (the crown's holes stay calm) or off it; past the edge a tuft's top half scallops the silhouette. The tufts are picked at random, `vary` 0..1: how far each gap and place strays from the even rows, the tufts flipped (0: even rows, regular as bubble wrap). The library lab's 128 px winner |
| `relight(where?, { light?, reach?, strength?, ramps?, glint? })` | volume for flat art (a reduced import whose tones merged, a shape filled in one color): each pixel steps along its ramp by where it sits in the shape. An edge facing the light (empty space on that side, up to `reach` px away, default 1) gets lighter, one facing away darker. `glint: 1.5`: pixels at least that exposed (open above and toward the light) take their ramp's lightest key, so glints follow the light instead of being placed by hand. `light` is the direction it comes from, default `[-0.5, -1]` (top-left, mostly from above): a top edge +1, left +0.5, bottom -1, right -0.5, rounded, times `strength`. `ramps` defaults to the palette's. Then `shade` the occluded core (the heart of a crown) and low hanging parts by region |
| `recolor({ a: "b" }, where?, density = 1)` | swap colors inside a region; `"*"` takes every other opaque color (`frame(recolor({ "*": "w" }))`: a hit-flash frame); a ramp rotated by `c.frame` is color cycling (a waterfall, lava, a conveyor: the palette moves, not the pixels) |

**Regions** (`where`, `clip`): `undefined` = everywhere, `[cx, cy, r]` circle, `[x, y, w, h]`
rect, `[x0, y0, x1, y1, x2, y2, ...]` polygon, or `(x, y) => boolean`.

### Placing assets
| Op | Notes |
|---|---|
| `stamp(name, x = 0, y = 0, opts?)` | puts the asset's `pivot` on (x, y); without one, its top-left corner; `sub` for a place between pixels (placement options, below); y `"ground"`: on the scene's `world.ground` under x; or placed by a relation to what is stamped before it (`beside`, `on`, `along`, `apart`, below), which it then follows: `stamp(name, opts)` by the relation alone |
| `tile(name, x, y, cols = 1, rows = 1, opts?)` | grid of copies (each cell picks separately for groups) |
| `cells(rows, { at = [0, 0], gap = 2, key = "w", head?, side? })` | a labelled contact sheet: rows of assets (`[["a_1", "a_2"], ["b_1", "b_2"]]`) side by side `gap` px apart from `at`, the first one's size a cell; an entry `[name, label]` writes its label in the cell's top left corner, 3 px in, in `key`; `head: { names, y?, key? }` a title over each column (2 px in, on row `y`, default 8 over the first row), `side: { names, x = 2, key? }` one left of each row, by its middle. Variants, tiers, views compared (`examples/spells.px.js`, `examples/sdf/splats.px.js`) |
| `pattern(name, x, y, w, h, opts?)` | fill an area with copies; edges cut to fit |
| `panel(name, x, y, w, h, opts?)` | 9-slice: an asset with `slice` margins drawn at w×h. Corners stay as drawn; edges and center **repeat** (never stretch), so keep the center a flat fill or a seamless pattern. UI frames, buttons, dialog boxes |
| `tilemap("gg\nd.", { map: { g: "grass", d: "dirt" }, size?, w?, h?, x?, y?, ...placement })` | character map; `.` empty. `corners: "#"` (or `true`: any char but `.` and space): the map marks tile **corners** instead, one more row and column than tiles, and each tile is picked by its corner mask, 1 top-left + 2 top-right + 4 bottom-left + 8 bottom-right: `map: { 15: "dirt_full", ... }`, or a name prefix, `map: "dirt_"` for `dirt_1` … `dirt_15` (mask 0 stays empty unless `dirt_0` exists); the way to lay paths, shores and patches with a terrain tileset (see Terrain tilesets below). `iso: true` with the floor diamond's `w`, `h` (e.g. 32×16): cells on an isometric grid, columns down-right and rows down-left, drawn back to front; a tile's top-left sits on its diamond's top-left, and a tile with a `pivot` stands on the diamond's center (props). One level; stacked heights take a loop (`examples/isometric.px.js`) |
| `scatter(name, x, y, w, h, count, { on?, near?, within?, clip?, below?, even?, ...placement })` | brush: `count` picks centered (or pivoted) at random points; `near: "aAo", within: 3` = the center must also be within that many px (default 2) of those keys: grass along a path's edges, moss at the foot of rocks, foam along a shore; `on` = center must land on these keys (`.` = an empty pixel: around a shape, not on it); `clip` = paint only onto them; `below` = masks read the composite under this layer (a layer starts empty, so an `on` that places nothing is an error); `even` = one pick per cell of a grid sized to `count`, at a random spot in the cell: stones, pebbles and flowers spread evenly over the whole area, without the clumps and holes of pure random; under `on`/`near` the grid fits what they let through, so `count` is how many land however thin it is (moss along a ledge) |
| `warp((x, y) => [dx, dy], where?)` | move pixels by whole-pixel offsets without redrawing them: breathing, hair and tails swaying, a body sheared onto a slope. The function gives the offset at a pixel's **new** place (or nothing: it stays) and the pixel takes the color found that far behind it, so no hole opens and no color is made up; offsets are rounded; `where` limits it to a region. It moves what's on the canvas so far: in an anim built from a `sort` layer, put it as an item after that layer |
| `chain(anchors, { links?, length?, gravity?, drag?, rest?, stiff?, follow?, step?, max?, move?, steps?, loops? })` | not an op: hair, tails, scarves and ropes that follow with lag. `follow: 1.6` follows the way Celeste's hair does: each frame a point covers 1/`follow` of the way to its place (the point before plus `step`, e.g. `[0.4, 2]`: a little behind and below) and never trails more than `max` from it; no inertia, so it trails and settles without bouncing (best for hair). Without `follow` it's physical: `anchors[f]` is where the chain is fixed in frame f; each of `links` points (default 5) stays `length` px (2) from the one before, with inertia (`drag`, 0.8 kept per step), weight (`gravity`, [0, 0.5]) and a shape it turns back toward (`rest` direction, [0, 1], by `stiff`, 0.15). `move` is the character's travel per frame in the world (walking left: `[-1, 0]`), so the chain trails behind. It's simulated over the loop until the motion repeats (`loops`, 24), so the anim loops without a jump, and returns per frame `[anchor, p1, ..., pN]` (floats). Draw discs along it in a layer under the body: `layer("hair", (c) => HAIR[c.frame].forEach(([x, y], i) => c.circ(Math.round(x), Math.round(y), R[i], "h")))` |
| `motion("walk.json", { dir?, scale?, at? })` | not an op: called at the top of the art file, it reads a motion guide (`examples/motion/`: CC0 walk and run cycles, 8 directions × 8 frames) and returns one direction (`dir`: `N NE E SE S SW W NW`) as `{ ms, frames, depth, contact }`. `frames[i]` maps joint names to whole-pixel `[x, y]`, scaled by `scale` with the floor point moved to `at`; `depth[i]` says which joint is nearer the viewer; `contact[i]` is [left, right] foot down. Draw a frame with `pose()`, and use the numbers to place parts (examples/tropical/girl.px.js: a 32 px girl walking) |
| `clip(region, ...items)` | run items with drawing restricted to the region (half domes, roof slopes, masked textures) |
| `plate(relightOpts?, ...items)` | the items drawn on a plate of their own, lit there with `relight` (which then reads only the plate's edges), and laid down: a pauldron over its lames, a mass of stone, a crag, each taking the rim light and the shade on its own edges. Unlike a layer it goes anywhere, in a layer or another plate too; in a function: `c.plate(() => { ... }, opts)` |
| `runs({ y: [[x, "chars"], ...], ... })` | pixels as runs at absolute x, row by row: `runs({ 30: [[19, "3H3"], [23, "deeR"]] })`. Same keys as a grid (`.` keeps, but not a space; `_` erases), but each run starts where it says, so nothing is counted: for hand-drawn figures and patches over a shrunk or base image |
| `pose("pose.json" \| joints, { x?, y?, scale?, color?, joint?, min?, bones?, sides? })` | a pose skeleton as a guide: bones as lines (`color`, default `"R"`), joints as dots (`joint`, default `"Y"`; `false` for none): keys the palette must have (no built-in palette does), or pass your own; `sides: true` colors the limbs by side (left arm magenta, right arm green, left leg orange, right leg cyan), so a limb that swaps sides between frames shows. Reads a pose detector's output (a `{ name: [x, y, score?] }` map, or OpenPose JSON in COCO-18 or BODY_25), placed at `(x * scale + x, y * scale + y)`; joints scoring under `min` are skipped. Names: `head`, `nose`, `neck`, `l_`/`r_` + `eye ear shoulder elbow wrist hip knee ankle big_toe heel`, `mid_hip`. In an anim, draw a motion guide's current frame: `layer("guide", { ref: true }, (c) => c.pose(walk.frames[c.frame], { sides: true }))`. Usually inside a `ref: true` layer. The detector runs outside pxl (e.g. rtmlib's DWPose on the image upscaled) |

Any `name` may be a sprite, scene, group, or glob (`"tree_*"`). Placement options, for `stamp`,
`tile`, `pattern`, `panel`, `scatter`, `tilemap` and wire hangs (anims add `frame`, `delay`, `rdelay`; see
Animation); an option a placement doesn't take is an error, not ignored:

| Option | Effect |
|---|---|
| `flip: "x"\|"y"\|"xy"`, `rot: 90\|180\|270` | mirror or turn this copy |
| `angle: deg` | (stamp only) this copy turned clockwise round the point it is placed by: its pivot (a part's joint: `pivot: [x, y]` on the elbow, stamped where the elbow is now), else its top-left. As the sprite's `angle` turns it (quarter turns exact, under 12° a shear, the rest RotSprite: no new colors, a 1 px line stays 1 px), but its line is turned with it, not drawn again: for a fresh line, stamp the part unlined, turned, inside a sprite that draws the line. Shading bands inside it turn too and their edges can jag: turn the part flat and paint its bands after, or keep a turned part to one or two tones |
| `swap: { g: "r" }` | recolor this copy |
| `fit: px` | of a group or glob, the member whose drawing is nearest that height (the smaller on a tie): one thing drawn at several sizes, picked by how big it is where it stands. `stamp("walker_*", x, y, { fit: P.scale(z) * 1.75, frame: n })`: a figure far down a road takes the sprite drawn for its size instead of a scaled one |
| `rflip: "x"\|"y"\|"xy"` | random flips, per copy |
| `rswap: [{ g: "r" }, {}]` | a random recolor per copy (`{}` = none) |
| `shade: n`, `floor: "k"` | this copy n steps darker along the ramps (negative: lighter), as `shade()` steps its pixels: a far limb (`swap` wins for the keys it names). `floor`: keys a step never lands on (ramps that all start at the ink stop a key above it: the far limb a step darker, no black) |
| `seed`, `reseed: true \| n` | `reseed` rebuilds the placed asset with its own random choices; `true` derives them from the position (a stamp with an `id`: from its id), so `tile("house", 0, 0, 4, 1, { reseed: true })` gives four different houses from one definition |
| `fx: ["dissolve", { progress: 0.5 }]` | effects on this copy alone (one, or a list of `[name, opts]`), on the canvas's clock and the copy's seed: a dissolve, a tint, an aura driven per placement by the scene (Abilities) |
| `silhouette: "w"` | every opaque pixel in that color: hit flashes, and cast shadows when placed in a `shade: true` layer |
| `at: "id.socket"`, `id` | (stamp only) attach to a socket of a stamp placed earlier in the same asset, any layer: x, y become an offset from it; `id` names a placement (default: its asset name): `at`, the relations, a scene's `expect` and `describe` (and `--diff`, `steps --at`) address it by it, and its random picks (a group's member, `reseed: true`, `rswap`, `rflip`, `rdelay`) come from it instead of from where it stands, so moving it keeps its look |
| `beside`, `on`, `along`, `apart` | (stamp only) placed by a relation, so it follows what it relates to when that moves: `beside: [id, "left" \| "right" \| "above" \| "below", gap = 0]` its drawing's box `gap` px off that side of the other's (left or right: their bottoms on one row; above or below: their middles in line; a negative gap overlaps); `on: id` its lowest pixel on the other's highest under it (a cairn's top, a roof's slope; their middles in line), `on: "ground"`, a row or a `profile()` on that at x; `along: [points [x0, y0, ...] or a lane(), s, u = 0]` its pivot s px along the path and u px to its right as it runs (a lane's bend too); `apart: [id, gap = 0]` at x, y but moved out of the other's box (and `gap` px more) the shorter way. x, y are an offset from where the relation puts it (with `on` a surface and `apart`, where it stands); a stamp placed by a relation alone: `stamp(name, { along: [WAY, 87, 21] })` (`pxl edit`'s `move` writes x, y into such a call). The other is an earlier stamp of the asset (by its `id`, any layer; a shade layer's copy as the thing's); each box is measured on its drawing at its own frame 0 and stands where the stamp is now, so what moves across the scene carries its followers and flames that flicker shake no neighbour. `pxl check --fix` changes a relation's number (beside's gap, along's s or u) before x, y. `examples/shrine/shrine.px.js` (the lanterns, the basin and the torii along the approach), `examples/sunset/sunset.px.js` (the logs beside the fire, the pennant on the cairn) |
| `z` | (stamp only) its order in a `sort: "z"` layer |
| `heading: deg \| [dx, dz]` | (stamp, and a `mesh()` sprite) of a family named by the compass (`name_n`, `name_ne`, ...: `views()`, `rig3d()`'s moves, a `turnaround()`), the member nearest the heading: compass degrees (0 away from us, 90 right, 180 toward us) or a way on the ground (`dz` away from us: where a walker goes, `[b[0] - a[0], b[1] - a[1]]`); a tie goes to the one listed first |
| `cast: [kx, ky]` | the asset laid flat on the ground as its shadow: a pixel h px above its base lands h × (kx, ky) from where it stands, e.g. `[0.6, 0.2]` for light from the top left. The base is the pivot's row (the bottom edge without one), and the shadow is placed by that point, so an asset without a pivot gets a shadow that doesn't line up with it: give props `pivot: "bottom"`; it applies after `flip`, so a mirrored tree still throws its shadow the same way. In a `shade` layer: `stamp("palm", x, y, { cast: [0.6, 0.2] })`. On a stamp, away from a light: `cast: { from: [x, y], len }` a sun on the horizon at (x, y), the shadow straight away from it, `len` (1) px a px of height (shadows fanning out from a low sun); `{ from: [x, y, h] }` a light h px over the ground at (x, y) (a lamp, a fire, a mirror ball), the base's way from it over h, at most `len` (1) long |
| `shadow: false \| [kx, ky] \| { from, len }` | in a layer a shade layer casts (`of`, layer options): no shadow, or its own cast instead of the shade layer's |
| `castBase: "pivot" \| "column"` | with `cast` (default `"pivot"`): each column stands on its own lowest pixel instead of the pivot's row, for a base that isn't level (a tent seen at an angle, its hem higher at the back: from the pivot's row, what hangs below it would cast toward the sun) |
| `sub: [dx, dy] \| true` | `stamp` only (a half step that draws no in-between tone, over the clear with no outline or with no key between, is a warning in build, shot and a scene's check): x and y may fall between pixels (subpixel motion), `[dx, dy]` the way it moves (1 right or down, -1 left or up; `true` is `[1, 1]`; `{ from: [x, y] }` where it was the frame before, the way worked out from it). From a third to two thirds of the way it stays crisp at the place it comes from and its edges move: with an outline it pushes into it, the outline ahead taking the key between it and the fill and the fill behind the outline it leaves the same, the silhouette unchanged (so it works on a game sprite on clear); without one, half a pixel of it spills past its edge ahead over what's painted there. The key: one between the two in a ramp that holds both (the ink ends every ramp), else the palette's color nearest their middle, of the keys the file chose (`pal()`, `use()`); none, nothing changes. Nearer a whole place it's there. In a function, `c.subpixel(dx, dy, () => { ... }, [dirX, dirY])` moves what's drawn in it so. `characters.md` §10, `examples/subpixel.px.js` |
| `smear: [x, y] \| { from: [x, y], c? }` | `stamp` only: motion blur, the asset's silhouette swept from where it was (`[x, y]` as this stamp's x, y) to here, under it, in one key (`c`, default its lightest color): a dash's trail, a ball crossing in one frame as a capsule. Saint11's smear lasts 2 frames, the first full and light, the second thinner and darker (`PXL help "scenes One-shot effects"`); a blade's arc is `arc()`. Not with `sub`. |

Randomness is seeded from the placement position + `seed`, so builds are reproducible and moving
one placement doesn't reshuffle the others. Change `seed` to reroll.

### Perspective

| Op | Notes |
|---|---|
| `perspective({ w, horizon, eye, fov?, focal?, vp?, yaw?, pitch?, bend? })`, `perspective({ w, h, pitch, fov, ppm })` | not an op: a pinhole camera over flat ground, in meters. `eye` m above the ground, the horizon on row `horizon`, `fov` degrees across the `w` px picture (default 90) or the `focal` length in px, looking at column `vp` (default the middle), turned `yaw` degrees right of the world's z axis (default 0), tilted `pitch` degrees up, down if negative (default 0). HD-2D's camera instead, looking down at the middle of a `w` x `h` picture: `h` for `horizon` and `ppm`, px to the meter where it looks, for `eye` (or `eye` itself): `perspective({ w: 480, h: 270, pitch: -38, fov: 30, ppm: 24 })`. Looking down, any camera also gives `z` (the ground where it looks, that far ahead), `dist` (m from the eye along its axis: where `post()` focuses), `floor` and `wall` (the texels that lay a texture a texel to a pixel there, on a floor and on a wall: a material's `texel: "screen"` picks one by the face) and `aim(mid, up?)`: where to stand a thing, `[x, z, up]`, so its point `mid` m up is where the camera looks (`at: CAM.aim(1.1)`; lifted `up` m). In a scene k times as big (its `pixel`, its `sizes`) it is drawn k times as big by itself; `CAM.ground()` stays in the art's px (times `c.k` for the picture's). `bend` (1/m, default 0) makes the ground a way that curves: its z lines bend to the right (left if negative), a point z m along sitting `bend·z²/2` m to the side, so `ground()`, `at()` and `scale()` take and give places on the way and everything drawn through the camera follows it (`plane`, `solids`, `shadows`, which keep the sun's way straight, `mesh`, `terrain`); `toward()`, `ray()` and `vanish()` don't bend, so the far things stay put. A camera looking back down the way takes `-bend` (`examples/perspective/race.px.js`: a new camera each frame as the bend changes, and its mirrors'). Returns the view's numbers with the defaults filled in (`w`, `horizon`, `eye`, `focal`, `vp`, `yaw`, `pitch`, `bend`; `h` when given one: a scene `{ w: CAM.w, h: CAM.h }`) and `ground(x, z, up?)`: where a point x m across, z m ahead and `up` m above the ground lands on screen (floats); `at(col, row)`: the ground point `[x, z]` seen through a pixel (null at the horizon and above); `scale(z, x?, up?)`: px per meter there; `vanish(angle?)`: the column where ground lines heading that many degrees right of z meet (0: the z lines, 90: the x lines); `vertical()`: `[col, row]` where uprights meet (null when level); `ray(col, row)`: the way a pixel's middle looks, a unit `[x, z, up]` (a sky colored by direction, a ray marched); `toward([x, z, up])`: where a direction lands, `[col, row]` (the sun, or where any parallel lines meet: falling meteors, a ramp; null behind the eye). With yaw 0, everything running straight ahead meets at `vp`: one-point perspective; turned, the world's x and z lines meet at two points: two-point; tilted up, the camera looks `focal·tan(pitch)` px above the horizon, which stays on its row (put it low for a worm's-eye view), and uprights lean in toward a third point above the picture: three-point (a worm's-eye view; tilted down, a bird's-eye one, meeting below). Level, the same model as `world: { horizon, eye }` |
| `plane(view, (x, z, col, row) => key, where?)` | flat ground in perspective: the function gives the color of the ground point seen through each pixel under the horizon (`.` or nothing leaves it), and gets the pixel's column and row too (a glitter that follows the sun's column); `view` is a `perspective()` or its options (`w` defaults to the canvas's). Stripes in x run to the vanishing point, stripes in z space out toward the eye. A thin line sampled per pixel breaks into dots far away: keep it at least ~0.6 px wide there (`Math.max(width, z / P.focal * 0.6)`), or draw it as a `line` between two `ground()` points. The same from `(x, y) => key` with no camera (a ground seen from above, a sky): a function of the sprite, `(c) => { for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) c.px(x, y, key(x, y)) }` (the shrine's `_ground`, `cyberpunk/sodium_hour.px.js`'s sky) |
| `terrain(view, height, fn, { far?, top?, bound?, margin?, sky? })` | land with relief in perspective: `height(x, z)` is the ground's height in meters (the eye stands `eye` m above height 0 at x 0, z 0); `fn(x, z, u, t, col, row)` gives the color of the point each pixel sees (`u` its height, `t` its distance along the ray). Each column is ray-marched from the bottom up, every row starting where the one below landed, so a mountain range costs about a march per column. Below the horizon a ray that meets nothing within `far` takes the land at `far`; at and above it a pixel that sees no land is sky: `opts.sky(col, row)` colors it, or it's left (and once a column turns to sky, the rows above it are sky too). Options: `far` (m, 10000), `top` (the land's highest point: a ray rising above it is sky at once), `bound(x, z)` and `margin` (a cheap height the land never rises more than `margin` m above, e.g. the mountain without its ravines: the march steps by it and calls `height` only near the land). Shade by the slope (`height` a meter either side) and by the curvature (ridges catch the light, ravines hold the dark) (`examples/perspective/extinction.px.js`) |
| `solids(view, shapes, { at?, sun?, scale?, ramps?, light? })` | things in meters drawn through the camera, far to near: `shapes` from the `solid` global, `solid.stick(a, b, half, key)` (a round stick from point a to b, `[x, z, up]`, `half` m thick either side: trunks, limbs, poles, bars), `solid.blob(at, rx, ry, key)` (an ellipse `rx` m either side of `at` and `ry` m above and below it: crowns, heads, wheels), `solid.box([x0, z0, x1, z1, u0, u1], { top, lit, shade, under })` (benches, hedges, buildings: the faces the eye can see, `lit` the ones toward the sun; a face without its key takes `shade`'s), `solid.cone(a, ra, b, rb, key)` (round, standing roughly upright, as the hull of its two level end rings, plus `wrap: [[point, r], ...]` rings it must also go round: a torso, a skirt round the knees, a bin) and `solid.poly(points, key)` (a flat shape). Each takes extras last: `{ ghost: true }` casts but isn't drawn, `noShadow`, `top: n` (drawn n·2 cm nearer than its middle: a face over a head), `dapple: 0.6` (a blob's shadow lets the sun through). Options: `at: [x, z]` where the eye stands in the world (default 0, 0); `sun: { from: [x, z], up }` (the way toward the sun along the ground and its height in degrees: which box faces are lit; default `{ from: [0, 1], up: 60 }`, straight ahead, so the faces toward the eye are in shade); `scale(x, z)` px per meter (default the camera's); `ramps` and `light` to draw them on a plate lit along those ramps (`examples/perspective/park.px.js`) |
| `mesh(view, faces, mats, { light?, sprites?, pixel?, sun?, sky?, lamps?, emit?, shadows?, ppm?, at?, stand? })` | flat faces in meters drawn through the camera with a depth per pixel, the nearest face kept: for what `solids()` can't order (a dash wrapped round the driver, a wheel's rim in front of its spokes, a room). `faces` from the `model()` global: `const m = model()`, then `m.face(mat, ...points)` (3 or more corners), `m.strip(mat, a, b)` (quads between two lines of points), `m.loft(mat, sections)` (strips between neighbouring sections), `m.box(mat, corner, corner)`, `m.prism(top, side, [[x, z], ...], u0, u1)` (a polygon raised from u0 to u1, its top of one material and its sides of another: a block, a deck, a post of n sides), `m.stick(mat, a, b, r)` (a square stick, r half its width: a spar, a rope); `m.faces` holds them; `model.turn(faces, c, axis, th, lift)` turns faces th radians about the axis through c and lifts them (a hull on its bob), `model.turnPoint(p, ...)` a point so (what rides it). `view`: a `perspective()` camera (or its `{ w, horizon, eye, ... }`), points `[x, z, up]` as `solid`'s; one of `surface()`'s orthographic views (`"side"`, `"top"`, `"iso"`, `{ kind, yaw, pitch, origin, grid }`), points `[x, y ahead, z up]` at `ppm` px to the meter (16), their origin at `at: [x, y]` px (default the middle of the bottom edge), faces only (no sun, no sprites), a field drawn after it by `surface()` through the same view at its depth; or a camera of your own, a function from a point in its frame (`[x right, y up, z ahead]` from the eye) to `[col, row, depth]`. `mats`: per material `{ ramp, edge?, top?, smooth?, bias?, dither?, texture?, block? }`: `ramp` its tones dark to light (`"0-=~^"`), `edge` the outline's key where the surface ends in front of another or of nothing (default the ramp's darkest; a crease in the darkest tone where two faces of one material meet at an angle, unless `smooth`, for round surfaces), `top` the key of its top edge, which catches the light (default a step up the ramp), `bias` added to its light, `dither` how much the tone is dithered between steps, `texture(x, y)` steps up or down the ramp at a pixel (a weave), `block` px to one of its pixels (its faces drawn in blocks of that size, each block one point of the face, its outline a block thick under it and on the side away from the light: pixel art among an HD picture's faces, a sprite's pixel at `pixel: 4`); or `{ tex, texel?, anchor? }` instead of a ramp: an asset whose pixels tile its faces, `texel` m to a pixel (default 1/16, a 16 px tile to the meter; two, `[across, down]`, to lay it a texel to a pixel of the picture on a floor or wall the camera foreshortens, so it reads drawn on the screen and not squashed: a floor seen from 38° up `[1 / ppm, 1 / (ppm * sin 38°)]`; `"screen"`: the camera's `floor` on a face that looks more up than sideways, its `wall` on the others, a texel to a pixel of the art at every size; a material that should keep one texel on all its faces, a curved hull's or a kerb's edge, gives it by hand), from the world's origin or, `anchor: "face"`, from each face's top left (a gravestone's drawing on its front, a fence's pickets along its rail), its clear pixels holes (nothing drawn, no shadow), lying on a face that looks up and standing on one that looks sideways, each pixel stepped along its ramp by the face's light (none down where the light is fullest, one or two where it is less; no outline unless `edge`). Either kind takes `dissolve: { progress, look, pattern = "noise", scale = 0.25, ragged, at, mask, seed, edge, width = 0.06, char, glow }`: holes eat its faces as the dissolve effect eats a sprite, with the same looks and patterns (`"top"` and `"bottom"` by height, `"left"` and `"right"` across, `"out"` and `"in"` from `at: [x, z, up]`, default the middle of its faces, `"scatter"` and `"scan"` by texel, `"mask"` an asset laid over its faces' extent), noise in blobs `scale` m wide (on the texture's texels when it has one), `progress` the share gone (0 keeps it all); the edge a band `width` of the order wide in its keys (over the progress, as a sprite's), the neutral one halfway to the texture's lightest tone, the char a band ahead of it (`width` 1 is 0.03 of the order), `glow` blooming (no debris on faces); the holes show what is behind and let the sun through, so its shadow has them too (a wall crumbling under a spell). `sprites`: `[{ name, at: [x, z] or [x, z, up], heading?, flip?, frame?, delay?, rdelay?, seed?, reseed?, shadow?, stand?, air? }]`, sprites standing among the faces (a perspective view only): each upright at its feet (its pivot), a pixel to a pixel, as deep as the point it shows, so a wall in front hides only what is lower than its top, from where the camera is; a pixel less than half opaque is cut; an animation plays on the scene's clock (`delay`, `rdelay`, `seed` and `reseed` as a stamp's, picked by where it stands: trees swaying out of step); `blend: "alpha" | "add" | "screen"` (and `opacity`, 0..1) lays a sprite over what is behind it by its alpha instead of cutting it at half (smoke, an aura, energy: `"alpha"` lit like the rest, the other two light), after everything solid, the farthest first, hidden by what stands in front, hiding nothing and throwing no shadow (an `"alpha"` one a faint one with `veil`: the share of the sun its pixels hold back by their alpha, 0.3 a thin smoke); a sprite with `effect("emit")` pixels lights what is round it, a lamp at their middle in their color (`light: { r = 3, strength = 1, each }`, `each`: a lamp for each part glowing apart, two lanterns on a beam; `false` for none); each stands on a contact shadow, what is under its feet two ramp steps darker in the middle and one out to `shadow` m (default its width / 2.5; 0 for none); describe lists them. `at` can be a function of the time (ms on the clock; none where it gives none), and `ghosts: [n, ms, fade]` then draws n copies of it `ms` apart back in time, each `fade` fainter, blended (as it is, else `"alpha"`), no light, no shadow (a ball's trail); `id` names it as a stamp's does: its sockets (`"hero.hand"`: a spell's `from`, a stamp's `at`), describe's name for it, its random picks. `stand: true` (on a sprite) sets its feet on the highest face looking up under `[x, z]` (less than 60 degrees from level), `stand: ["deck", "flags"]` on those materials' (nothing under: where it is); `mesh(..., { stand })` does it for every sprite whose `at` has no up (an up given wins). `pxl check` reads each sprite's feet against the nearest face looking up under them (many copies of one small thing too, tufts, which it checks for nothing else): further than 0.15 m (expect3d's `on`) it warns that it floats or sinks, unless it says `air: true` (a gull, a leaf, a lantern hung) or is blended (smoke, light). `pixel: K` draws a sprite's pixel K x K px, for a picture K times as big (HD: the camera's `w` and `horizon` K times too; textures follow by themselves); in a scene with `pixel` or `sizes` all of it follows by itself. The depth stays on the picture for `post()`. Light in the world (HD-2D's warm sun and cool shade): `sun` (a color, or `{ color, strength }`) turns it on for textured faces and sprites, `light` being the way to it; each pixel is its art's color times the light reaching it, in linear light, so colors leave the palette: `sky` everywhere (default a third of the sun's, a little blue), the sun's by how the surface faces it, unless something stands between (`shadows`, default true: every face, and every sprite as a cut-out where it is drawn, facing the camera, so figures and trees throw their silhouettes from all along their feet, as HD-2D games' billboards do; without a sun, they are cast from `light` all the same (from a `light` function, only with `shadows: true`), a ramp face a step down its ramp where they fall (never to its darkest, the line's): blocks grounded by their own faces in a palette-lit diorama), `lamps: [{ at: [x, z, up], color, r = 4 m, strength = 1 }]` by how near; sprites through their normal maps (`bump`, `normals`; flat facing the camera without one), the light wrapping half again round them; `emit` keys give light instead of taking it (a lamp's glass), drawn as they are; contact shadows take a share of the light. Ramp materials keep their ramp steps. `pxl check` builds without it (it reads what was placed). A face reaching behind the eye is drawn up to it (HD-2D dioramas: `examples/hd2d/plaza.px.js`). `light`: the way toward the light in the points' frame (default from the upper left, behind the eye), or a function `(normal, middle, face) => 0..1` (normal turned toward the eye) for a light of your own: the sun through a windshield, the sky above (`examples/perspective/cockpit.px.js`) |
| `shadows(view, shapes, { sun, shade, at? })` | (one options object can serve both: each takes the other's and ignores them) the same shapes' shadows on the ground, each swept away from the sun (a point `up` m high falls `up / tan(sun.up)` m off), so a bench's shadow has its legs and a crowd's shadows never darken twice where they overlap. `shade: { g: "G", ... }`: what each ground color turns into; keys not in it are left (paint on them stays bright). Draw it after the ground and before `solids`, on the same canvas as the ground (top level, or the layer that drew it): it reads the ground's keys there. Shadows are in meters, so `scale` doesn't touch them |

Things standing on the ground are placed at `ground(x, z)` and sized by `scale(z)`. Hold a walker going
away at one scale for a whole step and change it only at the next contact, when the pose changes anyway
(no size flicker mid-step), with the planted foot where it landed; under ~15 px, a figure drawn by code
at its exact size turns into a blob, so draw the small sizes by hand (`walker_14`, `walker_12` ...
`walker_5`) and pick with `fit` (`examples/perspective/road.px.js`).

### Fields in 3D

A thing in meters described as a distance field (an SDF: how far a point is from its surface, negative
inside) built with the `sdf` global, `[x, y, z]` with x across, y ahead (away from the viewer, mesh()'s z) and z up, drawn as
pixel art by `surface()`. Four kinds, never one: a distance (`sdf.*`), and made from it an
occupancy (inside or not), a density (how much matter, 0..1) and an appearance (which material a
surface point is). Any number in a field may be a function of the clock, `(c) => ...` with
`c.t` (ms), `c.phase` (0..1 over the loop), `c.frame`, `c.frames`, read when it is drawn: a tree
swaying, a crystal turning (`examples/sdf/fields.px.js`).

| Op | Notes |
|---|---|
| `sdf.sphere(r)`, `sdf.box([x, y, z], { round? })`, `sdf.capsule(a, b, r, r2?)`, `sdf.cylinder(r, h)`, `sdf.cone(r, h, top?)`, `sdf.torus(R, r)`, `sdf.plane(n?, h?)`, `sdf.ellipsoid([rx, ry, rz])` | not ops: the primitives, round the origin (a box `size` m, its edges rounded `round` m; an ellipsoid its radii) except the upright ones standing on it (a cylinder and a cone `h` m tall, the cone `r` at its foot and `top` at its top, 0 a point); a capsule a rod from point a to b, radius r tapering to `r2` (a limb); a torus lying on the ground plane; a plane everything below it (normal `n`, default up, `h` m along it: endless, intersect it with something) |
| `field.union(...others, { smooth? })`, `.subtract(...)`, `.intersect(...)`; `sdf.union(list, { smooth? })`, `sdf.intersect(...)` | joined: `smooth` m over which they melt into each other (0, a crease) |
| `field.at(x, y, z)`, `.rotate(deg, axis = "z")`, `.scale(k or [x, y, z])` | moved, turned about an axis through its origin (`"x"`, `"y"`, `"z"` or `[x, y, z]`), scaled about it |
| `field.twist(deg)`, `.bend(k or [kx, ky])`, `.mirror("x")`, `.repeat([sx, sy, sz], count)`, `.noise({ amp, scale = 0.5, seed = 1, octaves = 2 })` | deformed: twisted `deg` degrees a meter up; bent as `perspective()`'s way bends, a point z m up moved k·z²/2 m along x (the wind in a tree); the positive side of the axes named mirrored to the other; copies `step` m apart, `count` each way (keep each in its cell); its surface pushed in and out by seeded noise, `amp` m at most in bumps `scale` m across. `sdf.fbm(x, y, z, seed, octaves)` is that noise, 0..1 |
| `field.mat(name)`, `.paint(name, (p, n) => bool)`, `.paint((p, n) => name)` | its material, a key of `surface()`'s `mats` (one given inside it wins), or one where `paint`'s test holds, `p` the point and `n` its normal in the field's own frame (moss where `n[2] > 0.6`) |
| `sdf.field((x, y, z) => d, lo, hi)` | not an op: a field of the file's own, `d` its distance at a point (or less, never more), inside the box `lo`..`hi` (`[x, y, z]` each): an outline no primitive has (an axe's head: a polygon's distance, made a slab) |
| `sdf.occupancy(field)`, `sdf.density(field, { edge = 0.1, noise, scale = 0.5, seed, octaves = 3, flow, fade })`, `sdf.appearance(field)` | the other kinds: `.inside(p)`; `.at(p)` 0..1; `.at(p, n)` the material's name. A density is none outside the shape, full `edge` m inside, smooth between; `noise` m of seeded fBm pushing its edge in and out in billows `scale` m across (`octaves`), carried `flow` m `[x, y, z]` through it over the loop (sampled twice and crossfaded: the loop closes; a cloud boiling, smoke rising, mist creeping), thinned away up from `fade: [z0, z1]` (full below z0, none above z1). `field.dist(p)` and `field.bounds()` read a distance field at a moment (`clock` last) |
| `sdf.size(field or grid, { view?, ppm?, px?, size?, pad?, frames? })` | the size a sprite needs for the field (or a voxel grid, or a field drawn as voxels of `size`) in an orthographic view: `{ w, h, pivot }`, `pivot` where its origin lands (give it to the sprite and to `surface()`'s or `voxels()`'s `at`), over `frames` moments of its loop |
| `surface(field, { view?, ppm?, at?, mats?, light?, soft?, outline?, ink?, inner?, rim?, shadows?, ao?, pixel?, cast?, hide?, clean?, tones? })` | the field drawn as pixel art, a ray marched to its surface through each pixel: each material's ramp (`mats: { bark: "bBiI", gem: { ramp, shine } }`, dark to light; what has no material takes the first; `tones: 3` each cut to that many, its darkest and lightest kept: a genre's tones at a density, 3 at 16-32 px) stepped by the light (`light`: the way to it in the world, default the upper left toward the viewer; `soft` 0..1 wraps it round the form, a side square to it lit soft / (1 + soft) of the full: a figure's broad light; the field's shadows on itself, `shadows: false` for none; a sky from above; the creases darker, `ao` 0..1, 0.5), a tone none of its four neighbours shares taken into theirs (clusters, not speckle), `shine` a glint where the light mirrors toward the eye; a conifer's passes on a material (`mats: { needles: { ramp, strokes: 4 / 24, hem: 2 } }`, the nature kit's `_spruce`): `strokes` its sunlit part a step lighter in strokes that many m apart, a quarter of that wide, across the way round its upright (needles along a branch), `hem` px of it hanging in points under it where nothing is below, every other column, a step darker a px (a tier's hem); an `outline` (true: each ramp's darkest, a key, or false) on the contour away from the light, unless it is a pixel thin (`ink: "k"`: a line of that key all round outside it, a px wide, as a 2D outline is: the genre's outline in one pass; the sprite needs the room, turnaround's `pad`), and a `rim` a step lighter toward it (a number 0..1: and where the contour is open both ways the light comes from, at least that share up its ramp: the edge a sun behind lights, `rim: 0.85`); `inner` (a key, or true: the outline's) a line where one of the field's parts (`.part()`) lies in front of another, on the one behind, nearer by half a pixel (each part outlined against the others: a figure's limbs; a part beside another is then never the contour; between pieces of one part, `.part()`s inside it, its own darkest tone: locks of hair); `clean` (on unless `false`; voxels() off) a pixel artist's pass before its lines: no black run 2 px thick and the outline whole (a sliver of a part behind between the clear and the part in front cut, the outline taking its place; an inner line under a nearer part's own line left out), then a pixel alone or sticking out from the figure by one (its one neighbour of it inside) cut away; the normals written (`normals()`, `lighting()`, mesh()'s sun read them) and the depth (`post()`); what it doesn't cover left as it was. `view`: `"side"` (3/4, 20 degrees down), `"top"`, `"iso"` (2:1, 30 down, 45 round), or `{ kind, yaw, pitch, origin, grid }` (degrees turned right, tilted down), orthographic at `ppm` px to the meter (16) (`grid: true`: on `voxels()`'s pixel grid instead, a meter `ppm` px along each axis, so a field and voxels line up in one iso picture: cubes of `size` s at `px` p are `ppm` p / 2s in iso, p / s in top and side), the origin landing at `at` (`[x, y]` px, default the middle of the bottom edge, as `pivot: "bottom"`), or standing at `at: [x, y, z]` m in the view's world, its `origin` (px, default the same) where the world's `[0, 0, 0]` lands: things drawn on one canvas that way are in front of or behind each other as they stand; or a `perspective()` view, the field standing at `at: [x, z, up]` m: after a `mesh()` through the same camera, drawn only where it is nearer the eye than what is there (a wall hides its foot), its shadow laid on what is drawn (`cast`: the share of light it takes, 0.4; a step down the ramps, or darker in linear light off them; `hide`: that shadow alone, for a mesh made of it standing in its place); after a `mesh()` with a `sun`, unless the call gives a light, it takes that mesh()'s (`light: "mesh"`): its way, and its sun, sky and lamps on what the field draws, as on mesh()'s sprites, the shadows its faces and sprites throw falling on it (voxels too; a `volume()` takes the sun all through), so a thing drawn in 3D stands in a diorama's light (its shadow then the sun's share, as mesh()'s on a floor; `cast` given, as before); `pixel: K` a ray to each K x K block (an HD picture's sprite pixel, with the camera's `w` and `horizon` K times too). An anim of it is a sprite like any other: in `mesh()`'s `sprites` it stands as the pines do |
| `sdf.voxels(field, { size, fill = 0.5, clock? })` | the field as a voxel grid: cells `size` m (one number, or `[x, y, z]` for cells not cubes: flat slabs `[0.1, 0.1, 0.05]`, tall bricks), as many as its box needs (a column of cells down its upright, the ground a floor of cells), each filled where the surface comes within `fill` half-cells of its middle (0: its middle inside; 0.5 keeps a limb thinner than a cell as a line of cells, nothing floats), in the material there; at a moment (`clock`, default the start). `.n` cells a side, `.size`, `.count`, `.bounds()`, `.mesh()` its outside as quads (faces of a material in one plane merged into rectangles), `.faces` those for `mesh()`. 16 million cells at most |
| `sdf.mesh(field, { size, clock? })` | the field as a mesh by surface nets: the field sampled at the corners of cells `size` m, a vertex in each cell the surface crosses (moved onto it), a quad across each edge it crosses, facing out, in the material at its middle; `.faces` for `mesh()` (a material there `{ ramp, smooth: true }`: no crease between its many faces), `.positions`, `.normals`, `.quads` |
| `voxels(grid or field, { size?, view?, px?, ppm?, at?, mats?, light?, outline?, rim?, shadows?, ao?, pixel?, cast?, hide? })` | a voxel grid (or a field made voxels of `size` m at this moment: it sways cell by cell) drawn as pixel-art cubes, as `surface()` draws: each face a tone of its material's ramp by the light (the top lit, a side a step down, the other in shade), the field's shadows on itself, an outline on the shaded side; `ao` 0..1 (default 0.25: the steps read, a fine grid not banded at each; 0.5 and up darken every step of it) darkens a face toward the cubes beside it, as block games shade their corners. In `"iso"` and `"top"` on the pixel grid, the same cube everywhere: `px` a cube's width (default 4; iso: its top half as tall as it is wide and its sides as tall; top: a 3/4 view, its top and its front face), or `ppm` the view's px to the meter, shared by things of different cells in one picture (cells of 0.25 m at 16 ppm are 8 px cubes, of 0.0625 m 2 px); x up to the right and y up to the left in iso, both away from the eye. From the side on the grid too with `view: { kind: "side", grid: true }` (a cube's front, and its top a quarter as tall). Other views and a `perspective()` camera as `surface()`'s (at its depth after a `mesh()`, its shadow on what is drawn) |
| `look3d({ light?, mats? })` | not an op: the light (the way toward it, `[x, y, z]`) and the materials (`{ name: ramp }`) the 3D ops take when a call doesn't give them: `mesh()`'s `light`, `surface()`, `voxels()`, `volume()`, `splats()` (mats unless a `ramp` is given), `decal()`, `draw3d()`, `export3d()`; for the assets defined after it, as `pal()` and `ramps()` are: once in a kit or a style (`lib/styles/fields.px.js`, which `examples/sdf/kit.px.js` includes). A call's own wins; `light: "view"` takes the op's own, from the upper left of its view; `light: "mesh"` the light of the `mesh()` drawn before it with a `sun` (`surface()`, `voxels()`, `volume()`, `draw3d()`: what they take where they give none, over look3d's). |
| `export3d(name, grid, mesh or splats, { mats?, as?, frames?, fps? })` | written by `pxl build`: splats as `name.ply` in 3D Gaussian Splatting's layout (position, normal, color as the zeroth spherical harmonic from its ramp at its light, opacity as its logit, scales as logs, rotation as a quaternion; Spark and the other viewers read it), Y up; a voxel grid as `name.vox` (MagicaVoxel; its palette each material's light middle tone; past 256 cells a side, cut in models of 256 that its scene graph puts in place), a mesh (or a grid's `.mesh()`) as `name.obj` with `name.mtl` and as `name.glb` (glTF 2.0 binary, a primitive per material, positions, normals, a base color each), both Y up (pxl's z up goes to their y, its y ahead to their -z). `as`: `["vox"]` (a grid's default, or with `"obj"`, `"glb"`), `["obj", "glb"]` (a mesh's). Each file is read back and the build says what it holds: cells and voxels, the size and the extent in m; vertices, quads or triangles, materials, the box. Something that moves: a function of the clock, `(c) => sdf.mesh(field, { size, clock: c })` (or `sdf.voxels`, `sdf.splats`), with `frames: n` moments of its loop (`fps` 8): the `.glb` holds them all as a mesh each, shown in turn by an animation that loops in any viewer; `.vox`, `.obj` and `.ply` are a file a moment (`name_0` ...). `pxl serve` shows the `.glb` and `.ply` to turn round at `/3d` |
| `volume(density, { view?, ppm?, at?, ramp?, light?, thickness?, ambient?, shadow?, cell?, emit?, blend?, pixel?, cast? })` | a density drawn as pixel art: sampled on a grid over its box (`cell` m, default its longest side / 40) with the light that reaches each point through it (deeper from the light, darker: its own shadow, `shadow` the share of its thickness on the light's way that counts, 0.4 as light in a cloud scatters on; 1 a dense smoke's deep shade, 0.1 a thin cloud lit through), then a ray through each pixel gathering how much it holds back (`thickness`: how much light a meter at full density holds back, default 3; mist 1) and how lit that is (`ambient` 0.35 in its shade); its tone along `ramp` in clusters; where it is thin an ordered dither between it and what is behind (the palette kept), or `blend: "alpha"` laid over by its alpha. `emit: { ramp, strength = 1, glow = 0 }`: what glows, in its own tones by how much, marked as giving light (`post()`'s bloom), and through a camera lighting what is round it `glow` m (ramp steps up, or the glow's color added off the palette). Views as `surface()`'s; through a `perspective()` camera after a `mesh()`, what stands nearer hides it, it lies over what is behind and hides nothing (it writes no depth: draw volumes last, the farthest first), `cast` its shadow on what is drawn (the share of light it takes where thick, default 0); after a mesh() with a `sun`, that mesh()'s light on its tones (`light: "mesh"`, unless it gives one), as `surface()`'s |
| `sdf.splats(field or density, { spacing?, size?, seed?, light?, thickness?, clock? })` | Gaussian splats, experimental: a field's surface as flat discs `spacing` m apart (default 0.05; jittered by `seed`), lying along it (turned to its normal), `size` m across their plane (a std dev, default 0.6 of the spacing) and a sixth of that thick, of the material there, each remembering whether the sun (`light`, the way to it in the world) reaches it; a density's inside as round blobs (default 0.1 apart), as opaque as it is dense, lit as the light gets in. `.n`, `.bounds()`. Not a trained radiance field: what the field says, laid as splats |
| `splats(set or field, { spacing?, size?, seed?, view?, ppm?, at?, mats?, ramp?, light?, blend?, outline?, pixel? })` | splats rasterized to pixel art on the CPU: each one's ellipse on the picture (its covariance through the camera, EWA), the nearest first, their opacity gathered until a pixel is full (3DGS's blending); then the light gathered snapped to its material's ramp (`mats`, or one `ramp`) in clusters, where it is thin dithered (`blend: "dither"`, or `"cut"` solid past half, or `"alpha"`), the solid contour away from the light outlined (`outline: false` for none). Given a field or a density with `spacing`, made into splats at each moment. Views as `surface()`'s; through a camera after a `mesh()`, hidden by what is nearer, its depth written where solid. No shadow of its own: `surface(field, { hide: true })` lays its field's |

### Details, decals and a scene of parts

The fields above as things an agent edits by name. Details (leaves, moss, snow) are many small things
scattered on a form; decals are hand-drawn pixel art pinned to it; builders (`make3d`) make a tree,
a rock, a house with parameters that mean something; `world3d` places named parts by relations,
`edit` changes some parameters and `changed` says which parts moved (the rest byte for byte as it
was), `draw3d` draws it (each pixel knows its part: `pxl steps <file> <name> --at x,y` ends with
`part: oak.canopy`), `expect3d` says what should hold over the loop and `pxl check` runs it
(`examples/sdf/details.px.js`, `decals.px.js`, `world.px.js`). `pxl inspect <file> <scene> --id oak`
lists a part's values and where its spec writes them; `pxl edit` changes its place, a parameter, a
relation, its builder or `as`, written into the spec (`--dry` shows it first; `scenes 14`).

**Decals or a sprite per view.** A small face (11 rows and under) on a figure that is itself a
sprite: draw it per view by hand, as the traveler's heads are (`characters 5 6`). A face, a rune, an
emblem, windows or a sign on a 3D form (a field that turns, sways, is seen through a camera): a
decal, drawn by hand once per view it needs (front, three quarters, profile) and pinned where it goes,
so it stays crisp and goes where the form goes. Big patterns that should bend round the form (a band,
an emblem on a barrel): `mode: "wrap"`.

| Op | Notes |
|---|---|
| `field.part(name)` | names a part of a field (letters, digits, `_`, `-`): what each pixel of `surface()` shows is said by its name, joined with the parts round it (`oak.canopy`); `surface()`, `voxels()`, `volume()`, `splats()` and `decal()` take `part` for what they draw; a picture of them stamped (or flipped) into a scene brings its parts along |
| `sdf.scatter(field, { on?, where?, count?, up?, lit?, orient?, size?, brush?, vary?, mat?, seed?, light?, flutter? })` | details on a form: small things scattered on the field's surface, `count` to a square meter (80), on a material (`on`) or where `where(p, n)` holds, facing up at least `up` (snow, moss: 0.5), on the lit side only (`lit`); each `size` m (or `[smallest, biggest]`), turned by its normal, `"up"` or a flow `[x, y, z]` (blades leaning), a tone up to `vary` steps off (1), drawn in `mat` (default what it sits on), seeded; fluttering `flutter` m on the clock out of step. Carried by the form's moves (a tree's bend: each leaf with it). `set.points()`: each as it stands on the field at rest, `{ p, n, sun, mat }` (its frame is the field's, its moves applied): a decal's `point` for each, a leaf clump at every one. A splat set: `splats(set, opts)` draws it, each detail smaller than about 4 px as a pixel-art `brush` (`"dot"`, `"clump"` 2x2, `"leaf"`, `"blade"`, `"cluster"` 3x3, each lit up and left, darker down and right; `"ellipse"` none), in its ramp by its normal and the sun reaching it, at its depth, solid, no outline of its own; bigger ones as ellipses |
| `decal(name, { on, point, up?, mode?, size?, views?, depth?, lit?, glow?, view?, ppm?, at?, pixel?, light?, part?, clean? })` | hand-drawn pixel art (`name`, a sprite or an anim: a blink) pinned on the field `on` (drawn before it with the same view and `at` by `surface()`, or as `voxels()` or a `mesh()` of `sdf.mesh` made of it; a hand-modelled mesh takes none) at `point` (`[x, y, z]`, the field as it stands at rest; carried by its moves, put back on its surface). `mode: "pin"` (default): square to the picture at the point, a texel to a pixel (or grown by a whole number to `size` m), drawn only where the picture shows that surface there (hidden behind what is nearer, cut at its silhouette, gone when it turns away; `depth` m: how far in front of or behind its point what is drawn under a texel may lie and still take it, default its own width: an eye kept on a face seen edge on, or past a lock of hair a little nearer), its tones stepped along the ramps by the light there (`lit: false`: as drawn, glowing; `glow: false` too: as drawn, not glowing; `lit: "surface"`: each texel the tone surface() left under it, stepped as far as the texel stands from the art's commonest tone, so a leaf clump drawn in steps takes the crown's light and shadow, no dark dots). `mode: "wrap"`: its texels laid on the surface along its tangents (`up` its up there, default the world's), `size` m across (`"px"`: a texel to a px where it lies, at any ppm), each a little quad put back on the surface: it bends round the form and foreshortens, no holes. `views: { three, profile }`: other grids, drawn looking to the picture's right (mirrored for the left), picked by how far the normal there turns from the eye (under 25 degrees the front, under 65 three quarters); `clean: true` none of it where the surface under a texel turns edge on (its normal under 0.3 toward the eye: no eye's pixel on the silhouette of a face turned away), and lit, never darkened into a ramp's darkest (the outline's ink) |
| `make3d.tree({ height, limbs, twist, lobe, canopy, leaves, wind, seed, ppm })`, `make3d.pine({ height, tiers, girth, snow, wind, seed })`, `make3d.bush({ size, leaves, wind, seed, ppm })`, `make3d.rock({ size, moss, seed })`, `make3d.house({ snow, door, window, sign, seed })`, `make3d.crystal({ rune, moss, seed })`, `make3d.mist({ color, size, wind })`, `make3d.smoke({ wind })` | builders with semantic parameters: `{ field (or density, look), parts: { trunk, branches, canopy, ... }, details: { leaves, moss, snow }, decals, sockets: { chimney, top } }`. A tree's `height` m (4.4), `limbs` 1..8 (3), `canopy` how full 0.5..3 (1 as drawn; more lobes and bigger past it), `leaves` clusters to a square meter (0 none; 20 to 40 reads as leaf masses), `twist` how far its limbs kink, radians 0..1.5 (0.35), `wind` m at its top or `[x, y]`; a pine's `height` m (4), `tiers` of needles 1..10 (4), `girth` its lowest tier's radius m (1.1), `snow` 0..1 on its tiers; a bush's `size` m (0.9) and `leaves`; a rock's (and a crystal's rock's) `moss` 0..1; a house's `snow` 0..1 on its cap, `door`, `window`, `sign` assets pinned as decals; a crystal's `rune` a glowing decal; a mist's `color` (drawn in the material `mist_<color>`). Each part's random choices from its own seed. `ppm`: the px to the meter it is drawn at, so its texture is set in screen px there and its form stays in meters (not given, the drawing call's: `surface()`'s, `turnaround()`'s, `draw3d()`'s, a world's parts'; through a camera, its scale where the thing stands; a field changed after it is made, `.union(...)`, keeps the meters): `make3d.px`'s floors (`{ cluster: 10, grain: 2, every: 4, edge: 2, leaf: 3 }`, measured on the library lab's trees: a cluster at least 10 px across, grain 2 px, marks 4 px apart, an edge 2 px): a tree's crown grain no finer than 2 px, its leaves a 3 px brush at every density (no cliff where they turn ellipses) and none nearer than 10 px. Tones by density are the caller's: surface()'s `tones`, or the `tones` of the `genre()` a `turnaround()` or `rig3d()` names. `make3d.tree` is one form, for a tree in the distance or a stylized one: a trunk forking into lobes, one `leaf` material, no season. A tree of a species (a leader up the middle, pads, tiers, a willow's curtains, a palm's fronds) or in its seasons: `include` `lib/nature/trees.px.js` (`make3d.oak`, `.momiji`, `.ginkgo`, ... `{ season, color, height, wind, ppm }`, its clusters then at least 10 px across (pulled in by what they grew, never past the mass they make up: its outline kept) and its bumps' grain 2 px; the nature kit's `make3d.spruce({ h, ppm })` its clumps as many px across as at its 24; a species of your own a spec of a dozen numbers: `PXL help "environment 3"`) |
| `make3d.define(name, fn, { params?: { k: [lo, hi], w: ["word", ...] }, wind? })` | a builder of the file's own, in its worlds as `make: name` (define it before the world) and as `make3d.<name>(params)`: `fn(params)` returns what the eight above do, `{ field }` or `{ density, look? }`, and `parts`, `details`, `decals`, `sockets` if it has them (its body plain `sdf`). A declared parameter out of its range is refused (so `check --fix` stays in it), a word not in its list too (`season: ["spring", "summer", "autumn", "bare"]`, `holds: ["tama", "key"]`), an undeclared one once any is declared; `wind: true`: what it makes sways, and a world gives it its wind as the `wind` parameter (`[x, y]` m). A snow spirit that looks round: `make3d.define("spirit", ({ size = 1, look = 0 }) => ({ field: SNOW.scale(size).rotate((c) => look * Math.sin(TAU * c.phase)), decals: { face: { asset: "face", point: [0, -0.38 * size, 2.5 * size] } } }), { params: { size: [0.3, 2], look: [0, 90] } })` |
| `world3d({ seed, wind: { from, strength }, parts: { name: { make, params, seed?, at?, on?, beside?, around?, attach?, along?, apart?, mats?, look? } } })` | a scene as data: named parts, each made by a builder, a seed each (its own, or the world's and its name), placed `at: [x, y(, z)]` (or a function of the clock), `on` another's top, `beside: [part, "left" \| "right" \| "front" \| "behind", gap m]`, `around` another (a mist round a house), `attach: [part, socket]` (smoke at the chimney), `along: [[[x, y], ...], s]` s m along a path (straight on past its ends; a fence, a row: a part a post, `s` stepping), `at` then an offset; `apart: [part, gap m]` kept clear of another's box seen from above, moved out the shorter way (x or y) where its relations put it inside; `as` how a solid part is drawn (`"surface"`, `"voxels"`, `"splats"`, `"mesh"`, over draw3d's); a part's own `mats` (over `draw3d`'s: a birch's bark beside an oak's) and, air, its own `look` (`{ ramp: "keys", thickness, ambient, cast, emit }`, over its builder's); the swaying ones (what its builder makes says so: trees, mist, smoke, a defined one with `wind`) share the `wind` (from `"left"` blows to the right, `strength` m at a tree's top). `world.edit({ "oak.canopy": 1.6, "wind.from": "left", "mist.color": "blue", "oak.as": "voxels" })` the same world with those changed (`as` the part's way of being drawn, not its builder's); `world.changed(other)` the parts (and named parts, details, places) that differ: an edit changes what it names and what hangs on it, the rest byte for byte; `world.place(name, clock?)` |
| `draw3d(world, { view?, ppm?, at?, mats, light?, pixel?, only?, as?, size?, spacing?, surface? })` | a world drawn through a view: its solids by `surface()` (`surface`: more of its options, `{ soft, outline, rim, ao, shadows }`: a tree's look), their details by `splats()`, their decals, then its air (mists, smoke) by `volume()` the farthest first; each part where its relations put it now, `at` where the world's `[0, 0, 0]` stands (through a camera, `[x, ahead, up]`); `mats` every material's ramp (`mist_grey`, `smoke_grey` too); `only` some parts. A field (`sdf.*`) or a built thing (`make3d.house()`) is drawn as a world of one part, `thing`. `as` (or a part's own): its solids as `"surface"` (default), `"voxels"` (cells `size` m, 0.1), `"splats"` (`spacing` m apart) or `"mesh"` (its surface as faces of `size` m, a smooth ramp a material, moved by `at`, drawn by `mesh()` into the depth what is drawn already left: hidden behind what is nearer, outlined against it); through a camera the splats' and the mesh's shadow is the field's (`surface()`'s `hide`). A mesh drawn in the ground's own `mesh()` call is outlined a little differently where the ground stands in front of it (8 px on a tree's foot): draw it there by hand when that matters |
| `turnaround(name, thing, { view = "iso", ppm = 16, n = 8, headings?, part?, mats?, light?, as?, size?, spacing?, surface?, draw?, frames?, fps = 8, mirror = "auto", pad = 2, genre? })` | a thing in 3D (a field, a built thing, a world with `part`) seen from `n` headings, a sprite each (an anim of `frames` at `fps` when it moves on the clock: a tree in the wind), `draw3d()` drawing it (`as`, `mats`, `light`, `surface`: more of surface()'s options, `{ soft: 0.6, rim: 0.85, outline: false }`). `draw: (c, v) => ...` draws by hand over each heading after it (an orthographic view): `v.screen(p)` where a point `p` (m, the thing's own) lands, `v.depth(p)` (nearer us is more), `v.heading`: paper streamers hanging from a rope, a tassel, what a decal can't hang off a surface; it is then mirrored only by `mirror: true`. A heading is where it faces on the picture's ground, by a map's compass: `n` away from us, `e` right, `s` toward us (the thing's front as built, -y), clockwise; named `name_n`, `name_ne`, ... (16: `n, nne, ne, ene, e, ese, se, sse, s, ssw, sw, wsw, w, wnw, nw, nnw`), one off that compass by its degrees, rounded (`n: 12`'s `name_30`; steering `[168.75, "s", 191.25]` is `name_169`, `name_s`, `name_191`); a group `name` in that order. `n: 4` through an iso view is its diagonals, `ne se sw nw` (one to a quarter of the 2:1 grid, as iso games turn); `headings: ["s", "e", 30]` any. The camera goes round it (`view`: `"side"`, `"top"`, `"iso"`, `{ kind, pitch }`, at `ppm`; or a `perspective()` camera, HD-2D's, the thing where it looks), its light with it, so every sprite is lit from the same side of the picture: `light` is the way toward it in the view's world as the view itself shows it (unturned: its `s` heading in a side view), x right, y away from us (-y toward us: `[0.3, 1, 0.5]` lights it from behind), z up. One size for all (its box seen at every heading and moment), the pivot at its foot: stamp it in any scene, top-down, iso, side, or as a `mesh()` sprite (through the same camera's scale). Each sprite carries the thing's height (its top over its origin, m, as `height`) and stands on its pivot: pxl check's feet rule reads them there (the front of its footprint and its line hang lower). Through an orthographic view each frame also has a box `footprint` (`c.setBox`'s, in the sheet's JSON): where the thing meets the ground (its origin's), as that heading sees it, none where it doesn't touch it. `genre` passes to every sprite. `mirror: "auto"` draws the west and flips it for the east (as `lib/characters/traveler.px.js`'s), where the thing is its own mirror across its front-to-back plane (sampled; no details or decals off its middle) and its light comes from the picture's middle (above, in front, behind); `true` always, `false` never. Returns `{ names, headings, w, h, pivot, mirrored }` (`examples/sdf/turnaround.px.js`) |
| `rig3d(name, { body?, moves, n = 8, headings?, pitch = 20, w?, h?, pivot?, parts?, mats?, light?, outline?, inner?, ink?, surface?, head?, chin?, blocks?, mirror = "auto", draw?, genre? })` | a figure on the 3D layer: a skeleton posed in 3D, its limbs fields, drawn by `surface()` from the side (`pitch` degrees down, a field sprite's 20) in every heading of `n` (4, 8, 16) or `headings`, by turnaround()'s compass: an anim `name_<move>_<dir>` each and a group `name_<move>` to stamp by `heading`. `body`: `figure(h, heads)`'s lengths in px (34, 3) unless given (`hip`, `torso`, `neck` to the head's middle, `thigh`, `shin`, `upper`, `fore`, `ankle`; `hips` half their width, `shoulders` `[forward, half the width, down]`, by default the arms against the torso, never out past it (a chibi's few heads); `r` the blocks' thickness). `moves`: `{ walk: { frames, ms, pose: (i, heading) => pose, dirs?, draw? } }` (`ms` each frame's, 100; or a list, a number a frame: a strike's `[60, 40, 60, 80, 80, 80, 100]`), the pose the file's own numbers (`feet` `[[forward, right], ...]` from under the pelvis, `lift`, `down`, `lean`, `tilt`, `turn`, `twist`, `head`, `hands` `[[forward, right, up], ...]` from the shoulders, or `grip: { from, to, at: [left, right] }` both on one line (a broom, a staff: its ends `[forward, right, up]` from under the pelvis as the shoulders face, each hand `at` its share of the way from `from`; `j.grip` the ends); `gait()` for a walk, `tween()` and `unroll()` for timing; other keys pass to `parts`), `dirs` some headings. `parts: (j, pose) => ({ name: piece or [pieces] })`, `j` the joints (`j.legs[i].hip/knee/ankle/foot`, `j.arms[i].sh/elbow/hand`, `j.pelvis`, `j.chest`, `j.head`, `j.f`, `j.r`), a piece `j.limb(a, b, r0, r1, paint)` (a capsule along a bone), `j.ball(c, r or [across, ahead, up], paint)` (turned with the body), `j.sweep(base, z0, z1, (h, a) => radius, { keep?, shift?, shell?, paint? })` (a surface swept round an upright through `base` from z0 up to z1: a tunic solid, a cloak a cloth `shell` px thick hung from the shoulders, `keep(h, a)` the part of it there is (open in front), `shift(h)` `[dx, dy]` that height carried off the axis (trailing, swaying)), `j.decal(asset, point, { views?, up?, on?, depth?, lit? })` (hand-drawn pixel art pinned on it, as `decal()`: eyes on a modeled head, `on` the field it lies on, the skull, not the lock nearest), `j.scatter(field, opts)` (`sdf.scatter`'s brushes on a field: strands, tufts; drawn on the figure before the line round it, so it takes them in) or a field (`sdf.*` in the sprite's px: x across, y away, z up), `paint` a material (a ramp of keys, `"RPp"`, or a name in `mats`) or `(h, a, outside) => one` (h along it 0..1, a round it from the way the body faces, outside its face away from its middle: a cloak's lining); each part outlined against the others (`inner`), what is below the ground left out; `ink: "k"` instead a line all round outside it and on the part behind (the traveler's look) where `outline` is surface()'s on the shadow side; `surface` more of surface()'s options (`{ soft: 0.55 }`: the light wrapped round him; its `clean` its decals' too). `head`: a `views()` set stamped on the head joint by its heading (hand-drawn, or a modeled head drawn once per view and its face painted: no cost per frame), a line of `chin` under it where it meets the body; with no `head`, a head modeled (a part named `head`), `chin: [key, ramp]` the line of key under its pixels of that ramp (the skin's: under the jaw, not the hair; a key alone, under its own ramp's). The east drawn as the west's mirror (`mirror: "auto"`) where `light` (default from above, toward us) is in the picture's middle. `blocks: true` (or a prefix): its flat blocks too, `bk_<move>_<dir>`, never mirrored (the head yellow with a red face, the body orange, the right limbs light and the left dark, outlined): a new move judged before it is painted. One size for all (`w`, `h`, the `pivot` the pixel its foot point lands on; else its fields' boxes over every frame, `parts` given `j.depth` and `j.screen` there too, `screen` from the foot point at 0, 0). Escape hatches: the returned `joints(pose, heading)`, `screen(p)` (where a point lands) and `depth(p)` (nearer us is more), a move's or the rig's `draw: (c, j, pose)` after the figure (a socket: `c.setSocket("hand", ...j.screen(j.arms[1].hand))`; a prop drawn by hand), where `j.rod(a, b, paint)` draws a line of pixels from `a` to `b` in the figure's own depth, in the blocks and painted: over what it passes in front of, under what it passes behind (the hands holding it, the line round the figure kept), `paint` a key or `(t) => key` along it (a broom's handle with its nodes, each twig of its head). pxl check reads every pose at every heading: both feet off the ground (it floats), a leg pulled longer than its bones; and its anims stand on their pivot, so its feet rule reads them where they're stamped (in px, no height in meters: their size is the scene's). `genre` passes to its painted moves (not the blocks): each move's directions are a family for the genre's height check. Returns `{ names, headings, joints, screen, depth, w, h, pivot }` (`lib/characters/traveler.px.js`'s `tr_*` and `bk_*`, its old path `examples/hd2d/traveler.px.js` still working, its head modeled and baked by `views()`; `mo_*` the same figure, her hair her own; `examples/rig/warden.px.js` one heading, the axe a field of its own, the head stamped by a `draw` hook by the look) |
| `views(name, { s: grid, sw, w, nw, n }, { anchor?, like?, chin?, swap?, outline?, ... })` | hand-drawn views of a thing (a head), each named by the compass and a grid (a string, its rows, or items: `[grid, runs(...)]`): a sprite `name_<dir>` each, pivoted on its `anchor` (the pixel `[col, row]` that lands where it is stamped, one for all or `{ s: [col, row], ... }`; `"center"`, `"bottom"`), the views not drawn the mirrors of those across (`e` of `w`, about the anchor), a group `name` to stamp by `heading` (`c.stamp("_tr_head", x, y, { heading })`); sprite options for each (`swap` a recolor, `outline`). pxl check holds a set's crown and chin to one row (from the anchor) in every view (`chin`: the chin's row in every grid, for a set whose lowest rows aren't the chin, a beard; else the lowest row with a third of the fullest's pixels), and with `like: "_other"` its head's rows, from the crown to above the chin, within a pixel of that set's same view (a braid or a beard may hang below). Or `views(name, field, { n = 8, pitch = 20, light?, mats?, surface?, ink?, jaw?, anchor?, retouch?, like?, chin?, swap? })`: a head modeled (a field in its own frame, px: x its right, y ahead, z up, its middle where it is stamped) drawn once per view as `rig3d()` draws a figure (`surface()` `pitch` degrees down, `ink` a line all round it, `jaw: [key, skin ramp]` that line in `key` under the skin; the west drawn and the east its mirror where `light` is in the picture's middle, else every view; `n: 16` the views between too), then each view's `retouch` grid painted over it by hand (`"."` keeps the render's pixel, `"_"` erases one, a key paints it), its `anchor` pixel on the head's middle: the hair, a beard and a hat modeled, the face drawn (a hybrid head), stamped by `rig3d()`'s `head` as hand heads are, its cost once per view instead of every frame. Each view an ordinary sprite (`pxl ascii` shows it) |
| `expect3d(name, world, rules, { frames = 8, ms = 3600 })` | rules that should hold over the loop (MoVer's spirit), run by `pxl check` (a warning where one doesn't, with the frame and the numbers): `{ above: [a, b] }` (a's middle over b's top), `{ on: [a, b or "ground"] }` (its foot on it, within 0.15 m), `{ apart: [a, b] }` (none of a inside b), `{ near: [a, b, m] }`, `{ reaches: [a, [x, y, z], ms, tol?] }` (by then), `{ within: [a, [[x0, y0, z0], [x1, y1, z1]]] }`; in time, `{ before: [rule, rule] }` (the first holds at an earlier frame than the second first does: the door opens before the smoke rises) and `{ while: [rule, rule] }` (wherever the second holds, the first does too); `a` a part (`rock`), a named part (`oak.canopy`) or a detail set (`oak.leaves`), sampled at 0.1 m (a part thinner than that, a twig, by the points within 0.05 m of it). `pxl check --fix` fixes a failing rule with one number of the parts it names (where one stands, its gap beside another, then a parameter), searched without a model and written into the file |

### Going by in a loop

In an anim (or a sprite or scene animated by what it places), these follow its frame and close over
its loop (`frame` draws another one); in a still asset they draw frame 0. In a function, for what
goes by on its own: `c.moved(per)`, how far something going `per` px a loop has moved at this frame
(whole px, floored); `c.cross(x0, { span, per?, from?, whole? })`, where something crossing is now:
from `x0`, `per` a loop (default `span`: once across; negative, leftward), wrapped into the strip
`span` wide from `from` (default 0), so it leaves on one side and comes back on the other where it
can't be seen (the strip wider than the picture and the thing); `per` a whole number of spans, so the
loop closes; whole px a frame unless `whole: false` (meters in `mesh()`, 1.5 px a frame).

| Op | Notes |
|---|---|
| `scroll(name, y, per, { x?, frame?, axis? })` | a strip that wraps (a sprite with `wrap: "x"`) going by: placed at its offset for the frame and again a strip-width on until the canvas is covered, `per` px a loop leftward (negative: rightward). `per` must be a whole number of the strip's widths (in an animated asset it is refused otherwise), so the last frame runs into the first; `x` shifts the strip at frame 0. It should also be a whole number of px a frame (`per` = px × frames) or 1 px every so many frames, or the plane steps unevenly and judders: `pxl check` warns, naming an even `per`. One call a parallax plane: the nearer, the more px a loop (`examples/parallax/train.px.js`). `axis: "y"`: a strip that wraps in y (`wrap: "y"`) going down, a whole number of its heights a loop (negative: up), its column the second argument and `y` its offset: a shooter's backdrop |
| `clouds({ y, gap, w, h, n?, seed?, keys?, x?, empty?, sizes?, frame? })` | a lane of cumulus: clouds `gap` px apart, each drifting one slot along over the loop (rightward; a negative `gap`, leftward) while it turns into the next slot's cloud, so the sky closes on itself however slowly it goes. `n` designs (4) from `seed`, `w` across and `h` tall, `sizes` scaling each; the designs listed in `empty` (0 to n − 1) hold no cloud, so slot after slot a cloud forms out of nothing or thins away (a sparse sky); `x` shifts the lane. Cut flat at the base on row `y`; `keys` the lit top, the gray low down and on the shaded right, the base (`"Wwv"`). Two lanes, the far one lower, smaller and with a smaller `gap`, read as depth (`examples/perspective/park.px.js`) |
| `smoke(x, y, keys, { shape?, count?, size?, vary?, rise?, path?, wind?, spread?, length?, flat?, turbulence?, rough?, thin?, life?, alpha?, light?, pixel?, seed?, frame?, view?, at? })` | smoke of a shape, drawn as SLYNYRD and Saint11 draw it: round billows in clusters, lit on top and darker beneath (`keys`: lit, middle, shaded; `light` the way to it on the picture, default the upper left), in three opacities (`alpha`, default `[0.4, 0.62, 0.85]`): thick while young, thinner, thin in the last `thin` of its life (0.35), where it also breaks up. `shape`: `"column"` (default) rising `rise` px (36) or along `path` (`[x0, y0, x1, y1, ...]` from x, y: a curve, a chimney's draft) and drifting `wind` px over its life, `count` billows (16) born in turn over the loop, each `size[0]` px in radius at its start and `size[1]` at its end (the width over its life, `[3, 8]`), wandering `turbulence` px (2), its edge `rough` (0.35); `"puff"` bursting out `spread` px (16) once a loop; `"bank"` `length` px long (48), churning, thin at both ends, drifting `wind` px a loop (whole billow spacings, so it closes); `"ring"` spreading `spread` px, `flat` (0.4, a ring on the ground). Over clear pixels it keeps its opacities (a sprite for `mesh()`'s `blend: "alpha"`); over what is drawn the thick tones are laid whole and the thin in an ordered dither, in the palette. On the loop of its anim or scene. Through a camera (a diorama, a perspective scene): `view` a `perspective()` camera and `at: [x, z, up]` where it stands in its world; its lengths given (`size`, `rise`, `path`, `wind`, `spread`, `length`, `turbulence`) are then meters there, those left out px there, each billow on the upright plane through `at` across the view, as far as it is (smaller farther), and x, y px added (`smoke(0, 0, "edc", { view: CAM, at: [2, 6, 0.5], size: [0.2, 0.6] })`) |
| `plume(x, y, keys, { every?, life?, rise?, wind?, inertia?, size?, young?, seed?, light?, frame?, view?, at?, thin?, steady? })` | smoke, steam or dust from (x, y): a puff every `every` frames (2), each living `life` frames (36), rising `rise` px (24), quickly at first (`steady: true`: at a steady rate, steam off lava), and carried by `wind` px a frame (`[x, y]`, or a number for x), which it takes on over its first `inertia` frames (0: at once). It swells from `size[0]` to `size[1]` px in radius (`[2, 8]`) and thins out in dither at its rim and with age (`thin: "age"`: with age only, a young puff whole with a crisp rim; `"shrink"`: shrinks away whole instead, for small puffs, a vent's steam, that a dither breaks up); puffs smaller than the default stray less from the stream, in proportion. `keys` lit, middle and shaded; `young` the lit and shaded keys while it is fresh (dark smoke at a stack); `light` where the light comes from (`[-0.6, -0.8]`, the upper left). Keep the frame count a multiple of `every`, so the loop closes. Puffs born before the loop's start are there on its first frame. A chimney: a small `wind`; a moving engine's stack: `wind` minus the ground's speed and an `inertia` of a few frames, so the smoke keeps the stack's speed a moment and then falls behind. Through a camera: `view` and `at: [x, z, up]`, `rise`, `wind` and `size` then meters there, each puff on the upright plane through `at` across the view, as far as it is; x, y px added |

### Terrain tilesets

A path, shore or patch laid with tiles reads as ground; the same shape stroked with `curve` or
filled with `poly` reads as paint on top of it. Mark the terrain at tile corners and let
`tilemap(..., { corners })` pick the pieces:

```js
tilemap(`
  ...#....
  ...##...
  ....###.`, { corners: "#", size: 16, map: "dirt_" })   // dirt_1 ... dirt_15, by corner mask
```

Draw the 16 pieces from one function: `corners("dirt", { size: 16, variants: 3, smooth: true },
(x, y, t, v) => key)` makes `dirt_<mask>` (with variants `dirt_<mask>_<v>`, a group `dirt_<mask>` of
them, picked at random per tile), calling it for each pixel of each piece with `t`, how much of the
terrain its corners give that pixel (0..1: the corner bits 1 top-left, 2 top-right, 4 bottom-left, 8
bottom-right blended over the tile, eased in and out with `smooth`), and `v` the variant; `null`
leaves the pixel clear, and a piece with nothing in it isn't made (`examples/topdown.px.js` a shore,
`examples/tropical/trail.px.js` dirt with a ragged edge that frays into the grass). Or take them from
a tileset. Check its license first: with a share-alike one (CC-BY-SA, GPL) everything
built with it has to be shared under that license too, so prefer CC0 / CC-BY, or draw your own
after its look. In an LPC-style terrain (32px tiles), the 3×3 ring of outer corners and edges
holds masks `8 12 4` / `10 · 5` / `2 3 1`, read row by row (its center is often empty: take full
tiles, mask 15, from the fill variants), and the 2×2 block around a hole holds the inner corners
`7 11` / `13 14`. Masks 6 and 9 (two opposite corners)
are usually missing: stamp the two outer corners over each other. LPC inner corners are cut deeper
than the edges, so they leave a 2–3 px step where they meet; building them from two edges instead
draws the edges' dark rims across the terrain. `shrink: 2` takes 32px tiles to 16px.

## Lighting

`lamp(x, y, { r, color, power, z })`, `lighting({ cell, sky, ambient, emit, ... })`, and the layer flags
`solid`, `wall`, `unlit`: see [lighting.md](lighting.md). The same file covers normal maps:
`bump("dome"|"bevel"|"luma"|"hybrid", { w, depth, on, where })` (hybrid also reads Sprite Fusion's
`shapeRadius`, `shapeStrength`, `shapeSoftness`, `detailStrength`, `detailScale`) and the numpad grid `normals(x, y, grid)`.

## Glow

`glow(keys, { where, r = 6, strength = 0.5, color, bands, ramp, keep })` goes directly in a sprite or
scene body (like `lighting`) and works on everything drawn before it: every pixel whose color is
one of `keys` spills a halo onto the opaque pixels within `r`, falling off with distance. The
glowing pixels themselves are left as they are, and transparent pixels stay empty. `keys` are palette
keys, colors (`["#f2b450", "#ffeab0"]`) or a 3D material as `surface()` takes it, its ramp of keys or
colors: `glow(kit.mats.lamp)` lights what was drawn in it, the scene's keys untouched.

| Option | Meaning |
|---|---|
| `where` | Region: only pixels inside it glow (the halo may spread past it). |
| `r` | Halo radius in px. |
| `strength` | How strongly the halo brightens (screen blend in the glowing color; 0..1+). |
| `color` | One tint for the whole halo instead of each pixel's own color. |
| `bands` | Quantize the falloff into this many rings: crisp, pixel-art halos. |
| `ramp` | Palette mode: step neighbours up to `ramp` shades lighter along the ramps, dithering between steps. Stays in the palette; ignores `strength`/`color`. Use it before `lighting()`. |
| `keep` | Keys the halo leaves as drawn: what the glowing thing is made of. Without it the halo lifts everything in reach, the logs and stones under a fire too, and two ramp steps wash their shapes out (`glow("yYo", { ramp: 2, keep: "WuRr" })`). Give the source keys of its own, or whatever shares them stays unlit too. |

Color mode leaves the palette (like lighting). Several `glow`s can stack, each with its own keys
and radius. After `lighting()`, pixels still glow by their palette key even though the light has
changed their colors.

## Post

`post({ blur, focus, sharp, soft, fog, bloom, vignette, sharpen, lut, grain, palette, pixel, px })` goes directly in a sprite or scene body,
after a `mesh()` drawn in that body (not in a layer): what a camera does to the picture, the HD-2D
look. It reads the depth `mesh()` left on each pixel (what it didn't draw, a sky painted first,
counts as far; only `blur` and `fog` need it, the rest works on any picture). In linear light; the
blurs at a fraction of the size, brought back up smoothly; then `sharpen`, `lut`, `grain` and
`palette`, in that order, on the colors as seen. It leaves the palette (`palette` brings it back);
`pxl check` skips it (it reads what was placed, not the finished pixels).

| Option | Meaning |
|---|---|
| `blur` | Depth of field: the most blur, about its radius in px (default 0, none). From a camera high up, the band of depth in focus with the rest blurred reads as a model (tilt-shift). A blurred thing in front spills over what's sharp behind it, as through a lens; a sharp thing doesn't bleed into the blur behind it. |
| `focus` | The pixel `[col, row]` whose depth is sharp (default the picture's middle). |
| `sharp`, `soft` | m of depth either side of the focus kept sharp (default 1), and m past that over which the blur grows to full (default 4), or two, `[nearer, farther]` (Unreal's near and far transition regions); the blur grows slowly at first, faster in the middle, and eases into full. HD-2D keeps the whole diorama the player stands on sharp and lets the blur grow over many meters (Octopath: the plateau sharp, the wood behind going soft over tens of meters). |
| `fog` | `{ color, from, to, max = 0.6 }`: haze toward `color` from `from` m of depth to `to`, `max` of it there. |
| `bloom` | A glow round what's bright: `{ above = 0.75, r = width / 40, strength = 0.6 }`, `above` the brightness (0..1) it starts at, and only what passes it (a light just over it hardly glows); a number is the strength. A halo round lamps, glints, embers. `levels: 5` instead is Three's bloom (UnrealBloomPass): the whole color of what passes `above`, at half size and at each size half the last, blurred and added back, the small sizes weighing most and `spread` (0..1, default 0.4) of it moved to the big ones; the same `strength` adds as much light, spread from a few px to a fifth of the picture: sunlit sails and skies glowing, the air bright round them. On the harbor's frame at `strength: 1` it lifted 29% of the picture by 8 levels and more where pxl's lifted 1%: a strength of 0.3-0.5. About 0.3 s a frame at 960x540 and 0.9 s at 1920x1080 (pxl's: under 0.1 s). |
| `vignette` | Darker corners, 0..1. |
| `sharpen` | Babylon's sharpen, on the colors as seen: each pixel plus this much of how far it stands from its four neighbours, `pixel` px off (so in HD the art's own edges sharpen, not the inside of its blocks): 0.2-0.3 a little; 0.6 drew dark lines round the graveyard's stones. |
| `lut` | A grade, a 3D LUT from a `.cube` file next to the art file (Resolve's, Photoshop's, any grading tool's) or a LUT strip PNG (Unreal's and Babylon's 256x16: n tiles of n x n side by side, red across a tile, green down it, blue tile by tile): `lut: "dusk.cube"`, or `{ cube: "dusk.cube", amount }` (0..1, default 1), on the colors as seen, after the bloom and before the grain. |
| `grain` | Film grain (Babylon's, seeded instead of a random call): an amount (0..1 of full scale, 0.05-0.1), or `{ amount, seed, animated }`; the same grain in every frame, `animated: true` a new one each frame (a grain that changes each frame changes every pixel: the clearing's GIF went from 1.1 MB to 13 MB); a number a block of `pixel` px, so in HD it reads as pixels of the art, most in the middle tones and none at black and white; the same frame always the same grain. |
| `palette` | The picture taken back to the palette, a palette LUT: `true` (every color the file chose) or keys (a ramp, `"DdvVJ"`), each color to the two keys mixed nearest it, by a Bayer pattern in blocks of `pixel` (the dither effect's way); `{ keys, dither }`, `dither: 0` the nearest key alone. Last of all, so what comes out is in the palette; where the light and the blur made colors the palette lacks they turn to other hues (the graveyard's green in the shade went brown and checkered): give keys for those tones, a ramp of the shade's greens. |
| `pixel` | px to a pixel of the art (2 at twice the size, 4 at four times): what `sharpen`, `grain` and `palette` work in blocks of. |
| `px` | In a scene k times as big (`pixel`, `sizes`), `blur`, `focus`, `bloom`'s `r` and `pixel` are in the art's px, k times on the picture (`pixel` k by default): `px: true` keeps them the picture's. |

At 1920x1080 a frame takes about a second with `mesh()` and `post()` together: make the scene at its
own size first (`check` and `shot` are fast there) and give it `sizes: { name_hd: 4 }`: `post()` runs
only there.

## Effects

`effect(name, opts)` runs a shader's effect, done on the CPU, on what the canvas holds so far: put it
after what it changes, in a sprite, an anim (on each frame), a layer, or a function as
`c.effect(...)`. A finished asset (its outline drawn) is changed by making one from it:
`sprite("ghost", { base: "hero" }, effect("tint", { color: "i" }))`; an anim with `base` plays its
base under it: `anim("hero_gone", { base: "hero", frames: 24, fps: 12 }, (c) => c.effect("dissolve", { progress: c.phase, edge: "yo" }))`.

Each one is a function of the pixels, its options, a seed and the clock (`c.frame` of `c.frames`:
the anim's, or the loop of what the asset places; a still is frame 0 of 1). The same frame is the
same image in the viewer, `shot`, a sheet and a GIF, and nothing carries from one frame to the next.
Several run in order (a tint, then a dither back to the palette). Every one takes `where` (a region)
and `on` (keys), the pixels it writes, and `seed`. Sizes are in the art's pixels: `pixel: K` makes
them K px each, for a picture drawn K times as big (HD, as `mesh({ pixel })`). Past the image's edge
is clear (the other side on a `wrap` asset) and the image doesn't grow: leave room for what moves
out. `pxl steps` lists each one with its options.

| Effect | Notes |
|---|---|
| `effect("dissolve", { progress = 0.5, look, pattern = "noise", scale = 6, ragged = 0.25, at, mask, edge, char, glow = 0, debris, jag = 1, pixel })` | holes eat the drawing in an order, `progress` the share gone (0 keeps everything, 1 takes everything). `pattern`: `"noise"`, blobs about `scale` px (made even, so `progress` is the share gone); a sweep from the `"top"`, `"bottom"`, `"left"` or `"right"` of what is drawn; `"out"` from a point (`at: [x, y]`, default its middle) or `"in"` toward it; each sweep with a `ragged` edge (noise mixed in, 0 straight); `"scatter"`, pixel by pixel (blocks of `pixel`); `"scan"`, every fourth row going top to bottom, then the rows between (a teleport); `"mask"`, an asset of the same size (`mask: "name"`), its dark pixels first, its light last (a swirl, a crack, a rune). What eats it: `look: "burn"` (paper: an orange edge going red, then grey ash, the paper browning then blackening ahead of it, ash flakes rising), `"acid"` (a green edge, the material turning a sick green and losing its color ahead of it, drips falling), `"magic"` (gold, sparkles rising), `"frost"` (white and blue, crystals at the edge, the material paling blue), or `"neutral"`, the default with no look and no edge: one ring of the drawing's lightest tone, half clear, fading over the last 15%. Any of these over a look: `edge`, its keys, a ring a pixel wide each, the first touching the hole (`edge: "yo"`, `["y", "#ff8040"]`; `false` for none: only holes), or a list of them over the progress, two keys or more each (`edge: [["#ffd080", "#ff8030"], ["#ff8030", "#b01818"], ["#5a2020", "#2a2020"]]`: a burn going from orange to red to ash); `char` a band `width` px ahead of the edge where the drawing's own colors go toward `tones` (the last one nearest the edge) by up to `amount` (0.85), greyed first by `desat` (`char: { width: 3, tones: ["#8a5a30", "#141010"] }`); `glow` (0..1) marks the edge as giving light (lit by nothing, lighting what is round it in `mesh()`, blooming); `debris` `"ash"`, `"acid"`, `"frost"` or `"sparks"`, or `{ kind, keys, density, life }`, pixels thrown off by a few of the gone ones, each aged by how far the front has gone past it (`life`, a share of the progress), so it moves as the progress does; `jag` the share of the outer rings kept (frost's crystals: 0.5); `flames` (the burn has them; `true`, or `{ height = 8, density = 0.3, keys }`) tongues of fire rising from the burning front, tapering from the base's white-yellow to the tips' deep red, flickering a few times a second on the clock, growing as the fire takes and dying down to embers as the last of it goes, giving light (they flicker on the ground in `mesh()` and bloom); leave room above the drawing for them. With `"scatter"` and `"scan"`, whose holes have no rim, the pixels next to go take the edge first. Moved by the clock: `(c) => c.effect("dissolve", { look: "burn", progress: c.phase })`. On a 26 px figure: `scale: 7`; on a 32 px sheet of paper the burn's band (2 rings and 3 of char) takes a sixth of it |
| `effect("pixelate", { size = 2 })` | cells of `size` px from the drawing's origin, each in the color most of its pixels have (the clear counts: a cell mostly empty goes empty), a tie to the pixel nearest its middle: coarser, in the palette. `size: 1` changes nothing |
| `effect("dither", { keys, pixel })` | ordered dither (Bayer 4×4) to `keys` (default every color the file chose): each color goes to the mix of two keys nearest it (OKLab; keys far apart count against, Yliluoma's way), the second on as many pixels as the color is far toward it. A key stays a key; part-clear pixels go clear or opaque by the same pattern. Back to the palette after a `tint`, an `emit`, a `blend` layer |
| `effect("tint", { color, amount = 0.5, blend = "normal", ramp })` | every opaque pixel toward `color` by `amount`, as a layer's `blend` (`multiply`, `screen`, `add`, `overlay`): poison, frost, part of a hit's flash; alpha kept. It leaves the palette, keeping each cluster one color; `ramp: true` stays in it (each tinted color goes to the palette's nearest, OKLab), `ramp: "uBbi"` to those keys only (a frost ramp). Two colors can land on one key: give the ramp as many steps as the tones it takes |
| `effect("distort", { amount = 1, scale = 8, speed = 1, axis = "xy", pixel })` | UV distortion: each pixel takes the one up to `amount` px away (rounded, as `warp`: whole pixels move, no color is made up), the offset read off noise `scale` px a cell. Over the loop the noise goes round a circle `speed` cells long, so the last frame runs into the first. Heat haze, water, a ghost's shimmer; under 0.5 px it moves nothing |
| `effect("sway", { amount = 1.5, lean = 0.5, power = 2, still = 0, cycles = 1, flutter = 0, vary = 0.25, mask?, pixel })` | a plant in the wind, grounded in `warp`: each row moves sideways by its height over the base (the pivot's row of the asset it's made from, or the bottom), nothing at the foot or in the `still` rows over it, `amount` px at the top (negative: the wind blows to the left), growing with the height to the `power` (2: a trunk bending; 1: grass). Over the loop it sways `cycles` times, `lean` of the bend always downwind, the rest to and fro; `flutter` px more, twice as fast, rippling slowly up the rows (leaves; 1 px keeps a pine's tiers whole). `vary` of a turn and of the reach comes from the seed: placed with `reseed: true` each copy sways its own way; a stamp's `delay` growing with x (10 ms a px) sends a gust across the scene. Whole pixels move with their normals, so a normal map lights them as before; in `mesh()` a sprite's shadow is cut from the swayed picture, so it sways too. `anim("_pine_wind", { base: "_pine", frames: 16, fps: 8 }, effect("sway", { amount: 2, still: 6 }))`. Grass a passer-by parts: `push`, the column (px from the sprite's left) where something passes through it, the stems within `reach` (6) px bent away from it, `bend` (3) px at the top for the nearest, by their height: each tuft's copy given the walker's column, `stamp("_tuft", x, y, { fx: ["sway", { push: feetX - x + 8 }] })` (a tuft 16 px wide, its pivot at the middle of its foot). What moves painted instead of by its height: `mask: "_vine_m"`, an asset of the same size, each pixel's lightness its share of the sway (white all of it, black and the clear none: a vine's hanging tips, a flag's free edge) |
| `effect("aura", { color, width = 3, fade = 0.6, pulse = 0, flicker = 0, scale = 3, speed = 1, keep = false, pixel })` | a glow hugging the drawing: its silhouette grown `width` px round it, in bands of the `color` keys (the first next to it; one key a band), each band clearer than the one inside by `fade` (0: all whole), so 2-3 tones fading out in steps, not a gradient. `pulse` breathes the width over the loop; `flicker` licks its edge with noise `scale` px a cell going round `speed` cells a loop (a flame's edge). Only the glow is left (`keep: true`: the drawing too), marked as giving light. Made from an anim it hugs every pose: `anim("hero_aura", { base: "hero_walk" }, effect("aura", { width: 4, color: "WCc", flicker: 0.6, scale: 3.5 }))`, placed in `mesh()` with `blend: "add"` a hair in front of the figure; in a 2D scene stamped under it, `fade: 0`. Leave room round the drawing: the image doesn't grow |
| `effect("energy", { keys, scale = 4, speed = 1, rim = 1, pixel })` | a spell's matter: inside the drawing (its shape is the mask), noise `scale` px a cell flowing round `speed` cells a loop, laid on the `keys` dark to bright in clustered bands, `rim` px of its edge in the brightest; marked as giving light, the bright bands most. Then a distort and a dissolve make it a spell: `anim("orb", { w: 13, h: 13, frames: 10, fps: 20 }, circ(6, 6, 4, "c"), effect("energy", { keys: "dbcw", scale: 1.6, speed: 2 }), effect("distort", { amount: 1, scale: 2, speed: 2, axis: "x" }))`; a ball of 4 px wants `scale` under 2, or its noise is one band |
| `effect("emit", { color, strength = 0.5, pulse = 0 })` | emission: the pixels (`on`, `where`) give light, `strength` of `color` (default their own) added in linear light, what goes past white spilling into the other channels (a hot core whitens); `pulse` takes that share away and back over the loop. Runes, eyes, an edge, embers. The pixels are marked as giving light, and the mark travels with them as normals do (stamps, flips, outlines, distort and sway): `lighting()` leaves them as they are, `mesh()` draws them as they are and lights what is round them (a lamp at their middle, the sprite's `light`), `post()`'s bloom takes them however dark they are. In plain `lighting()` their light on the rest is a `lamp()` in the same sprite |

## Abilities

A spell on the scene's clock: phases in time, sparks, trails, all functions of the time alone (seek
any frame and it comes out the same). In a scene of its own clock (`frames`, `fps`), draw it in a
function that reads `c.t`. Keep the clocks on one grid: a scene at 20 fps (50 ms) fits the
traveler's 250 ms idle and a ball's 500 ms loop; at 12.5 fps the three made a 60 s loop.

| Call | Notes |
|---|---|
| `ability(phases, { start?, events? })` | not an op: a spell's phases in time, `[["charge", 700], ["cast", 150], ["travel", 500], ["impact", 250], ["dissipate", 1000]]` (or `{ charge: 700, ... }`), from `start` ms. `A(t)` gives the phase then: `{ name, i, k (0..1 through it), ms, since, before, done }`; `A.start("impact")` when a phase begins, or an event (`events: { hit: ["impact", 0] }`); `A.along(from, to, t, { phase = "travel", arc, ease })` a point from `from` to `to` over that phase ([x, y], `arc` px up; or [x, z, up] in meters for `mesh()`), `from` before it, `to` after |
| `A.frame(t, steps, { before?, after? })` | a pose's frame timed by the ability's phases: steps `[phase, from, to?, ms?]` in order, each beginning at its phase's start, or where the step before ends when that one is of the same phase; frames `from` to `to` at `ms` a frame (holding the last), or spread over what is left of the phase; `before` the first step (default its first frame), `after` the last one ends (default held). The traveler's cast: `S.ability.frame(c.t, [["charge", 0, 1, 100], ["charge", 2, 4], ["cast", 5], ["travel", 6], ["impact", 7, 12, 100]], { before: 12 })` |
| `A.span(t, a, b?)`, `A.fade(t, a, b?, { in?, out? })`, `A.since(t, a, ms?, n?)` | by moment, `a` a phase's start or an event, or `[that, ms after it]`: `span` 0..1 from `a` to `b` (default the end of `a`'s phase), held at both ends (a burn spreading); `fade` the same span in and out, `min(1, k / in) × min(1, (1 - k) / out)`, 0 outside it (smoke fading in over the first 15%, out over the last 35%); `since` whole `ms` steps since `a`, up to `n - 1` (a one-shot anim's frame) |
| `route({ pace, origin?, ground?, climb?, walk, idle?, loop?, round? }, steps)` | not an op: a figure's way on the clock, legs and holds by name (`examples/hd2d/graveyard.px.js`). `steps`: the first `[x, z]` where it starts, then `[x, z]` or `{ to: [x, z], name?, dir?, anim?, frame? }` a leg walked there at `pace` m a frame (or `pace: (dir) => m a frame` by the leg's way: the walk's own, `gait()`'s `pace` over its frames at the scene's px to the meter, so the feet stay planted: `traveler.pace` in `lib/characters/traveler.px.js`; its frames its length over the pace, `climb: true` counting the ground's rise), facing the one of 8 directions its way is nearest (`dir` another), `{ hold: frames, name?, dir?, anim?, frame? }` a wait there facing the way it came. Points from `origin` (`[0, Z]`); `ground(x, z)` the feet's height. `px: true`, a flat scene's (top-down): points `[x, y]` on the picture (up it is `n`), `pace` px a frame (`traveler.pace` as it is), `R(f).at` the whole px to stamp it at, from a function in the layer a shade layer is `of` (its cast shadow comes with it). `R(f)` the figure at frame f, a sprite for `mesh()`: `{ name: "${anim}_${dir}", at: [x, z, up], frame, dir }` (`walk` on a leg, `idle` on a hold, or the step's `anim`: a name, or `{ anim, frame: (f, t) => n, flip }`, f the scene's frame and t into the step, default f; `flip: true` one side view flipped going west), null before frame 0 and once done: a plain object to change per frame. `R.start("talk")` the frame a step begins (an insert moves what comes after with it), `span`/`fade`/`since` as an ability's; `R.step(name)` its `{ a, b, n, start, dir }`; `R.near([x, z], 1)` true within 1 m of a leg (a tree in its way); `R.total` its frames, `R.frames` rounded up to a whole number of `loop`; `R.at(s)` `{ x, z, heading }` s m along its points (holds left out, each corner an arc of radius `round` touching both legs), straight on before and past it: a run at a speed of its own (`examples/perspective/park.px.js`) |
| `turnToward(anim, [x, z], target, { every = 2, rest = "s", within?, from = 0, frame? })` | not an op: a figure turning to a target a direction each `every` frames (counted from frame `from`), the shorter way round: (f) => its sprite `${anim}_${dir}` at `frame(f)` (default f). The target at a frame: a sprite (a route's: its `at`), a point, a direction (`"e"`), or null for `rest`, or a function of the frame giving one; farther than `within` m, `rest`. Each frame's facing follows from the one before, worked out once from frame 0 (any frame sought comes out the same): watchers turning to someone passing, one turning to whoever speaks |
| `emitter({ at, rate \| burst, from, to, life, speed, angle, spread, gravity, drag, loop, seed })` | not an op: seeded particles, `E(t)` the ones alive at `t` (`{ x, y, vx, vy, age (0..1), life, id }`), each where its own path puts it (no state: seekable). `at` [x, y] or a function of the time (a moving source: born where it was); `rate` a second while it emits (`from`, `to` ms) or a `burst` of them at `from`; `life` [ms, ms]; `speed` [slow, fast] units a second toward `angle` degrees (0 right, -90 up) give or take `spread`; `gravity` [x, y] units a second² (+y down); `drag` the share of speed lost a second; `loop` ms: seamless on a loop, births before its start carrying over. Units are px in a picture, m in `mesh()`: `E.sprites(t, { name, at, blend })` the particles alive as its sprites, `name` (or names, young to old) at `at` (`[x, z, up]`, where it emits from) + `[p.x, 0, -p.y]`, flying, no light, no shadow |
| `particles(emit, keys, { x?, y?, trail?, size? })` | an emitter's particles now, each in the key of its age (`"wyor"`: young and hot first), the young on top, `size` [young, old] px, streaked `trail` ms back along their way |
| `trail(path, keys, { length = 300, width = [4, 1], fade = 0.6, step = 10, from?, t?, taper?, side? })` | a trail behind what goes along `path` (a function of the time: `(t) => A.along(hand, rock, t)`): `length` ms of it back from now (`t`, default the clock), `width` px at its head and tail, `keys` head (hot) to tail, the tail thinning in an ordered dither by `fade`, nothing before `from` (when it set off). A blade's smear: `path(t, i)` gives its edge, `[[tip], [inner point]]` (each `[x, y, ...]`: a depth may come along), and the band it swept is filled a stretch every `step` (i the step from the tail, for a width of its own), tail to head, each stretch in its share of the keys (`"vvj"`: the tail third `j`), `taper: true` closing it to nothing at its tail, `side(q)` keeping the stretches whose tip's middle `q` passes (`(q) => q[2] > mid`: those behind the body); a stretch the tip moved under 0.8 px along is left out. `t` and `length` in the path's own time (frames: `{ t: f, length: 1.6, step: 1.6 / 24 }`) |
| `spell(element, tier, { from, to, ground?, hand?, view?, variant?, form?, start?, seed?, ...over })` | not an op: a whole cast of an element at a tier, built of the calls above: `spell("fire", 3, { from: [x, y], to: [x, y], ground: row })`, the points on the picture and `ground` the ground's row under the target; `from` the caster's hand: a socket of an earlier placement (`"hero.hand"`, read in each frame till it hits: hold the cast's thrust while it flies; a `mesh()` sprite placed with `id` gives it in its world) or `{ at: [x, y] }` on the picture, lifted into the view's world (from the side as deep as the target, else `hand` up: 22 px of the spell by default, a 34 px figure's hand, about 1 m). With a `view`, points `[x, y, z]` in its world (x and y on the ground, z up; `from` as `[x, y]` stands there with its hand `hand` up): `"side"` (3/4: y toward us squashed to 0.35), `"top"` (a height foreshortened, smaller the higher it is), `"iso"` (2:1), `{ kind, origin: where [0, 0, 0] is on the picture, height: a top view's }`, or a `perspective()` view (`mesh()`'s camera, the world in meters `[x, ahead, up]`, sizes in px where it lands). `variant`: another way of the element (each element's `variants`, the first its own; any element takes any): ice `spikes`, `iceberg` (a faceted mass rising out of the ground, cracking, shattering), `glacier` (a block falling), `blizzard`, `nova`; earth `spikes`, `spire`, `boulder` (falling with a slow turn, the ground fissuring, breaking up), `quake` (fissures running out, rocks thrusting up along them), `slide` (rocks coming down one after another); fire `pillar`, `ball`, `meteor`, `wave`; lightning `bolt`, `sky`, `chain`; water `geyser`, `wave`; wind `tornado`, `blades`; light `beam`, `rain`; dark `void`, `grasp`; heal `sparkles`, `leaves`. A named variant shows at every tier, as big as the tier. `form: { size, count, facets, jag, debris, stay }` its shape: size times the tier's, how many (spikes, rocks, blades, jumps, shards), a solid's facets and jaggedness (0..1), the pieces it breaks into, ms it stays. Big solids are volumes seen through the view, lit, drawn as matter (`matter`: `"ice"` flat facets, a cold rim, lighter where thin, glints; `"rock"` lumpy facets, cracks, moss; or the file's keys, `{ like, tones, rim, glint, crack, moss }`: `tones` dark to light, 2 to 6 spread over 6, drawn as `like`, default the element's matter, else by the solid). The file's own art in it (`examples/hd2d/clearing.px.js`), never scaled, in the art's pixel at a scene's size: `ball` an asset (an anim, played from the charge's start) or a list grown through the charge; `trail: { ghosts, every = 50 }` that many of it at past moments, each fainter (a list's entry smaller); `impact: { anim }` played once from the hit where it hits, in place of its shape; `big: { anim }` once from the hit on the ground under the target (a list: the tier picks one); `blend: "add" | "screen"` lays these pieces on what is drawn as light, by their alpha (as it is, by default). Elements: `fire`, `ice`, `lightning`, `water`, `earth`, `wind`, `light`, `dark`, `heal`, or a recipe of one's own (`{ like: "fire", keys: [...], ... }`: scenes, "Designing an element"); anything of the element can be given over it in the options (`keys`, `big`, `impact`, `timing`, ...). Tier 1 (fire) a small ball; 2 (fira) half as big again, twice the particles, a quarter longer, a shockwave on the ground, the picture shaken 1 px; 3 (firaga) twice as big, three times the particles, 1.6 times as long, the target hit by a centerpiece filling the picture (a pillar, bolts, spikes, a tornado, a sphere, a beam, a helix), a flash, a mark on the ground, shaken 2 px. The tier's factors are options too: `scale`, `count`, `time`, `reach` and `power` (its light), `glow` (0..1, what its pixels give: the bloom), `shake` (px). `S.ability` its phases (charge, cast, travel, impact, dissipate), `S.total` ms, `S.at(t)` where it is in the view's world, `S.view.P(point)` where a world point lands on the picture, `S.lights(t)` its lamps, `S.lamps(t)` the same in its world (in m through a perspective() camera: `mesh()`'s `lamps: S.lamps(c.t)`, the diorama lit by it), `S.depth(t)` how far from the eye it is now, `S.flash(t)`, `S.shake(t)`; `S.hit(t, { look?, over?, back?, ...dissolve })` the target's dissolve now for its `fx` (undefined before it hits and once whole again): in the element's look (fire and lightning burn, ice frosts, light, dark and heal magic, else neutral) spreading from the impact over `over` ms (default till it ends, or till `back`), then `back` ms of coming back whole (neutral, in noise, its `seed`) |
| `cast(spell, { shake? })` | a spell as it is now, on the canvas's clock (a scene or anim with `frames`, `fps`): the mark under it, what gives light marked as emitting by its tier's `glow` (drawn as it is by `lighting()`, bloomed by `post()`), its smoke over it, its lamps (a `lighting()` item after it lights the ground round it), its flash (a `tint` of the picture) and its shake (everything drawn before it thrown a few px; `shake: false` for none). After a `mesh()` through the spell's own perspective() view it is drawn in the diorama's depth: at the depth of where it is now, a little nearer by its size, so what stands nearer the eye (a wall it flies behind) stays in front of it; one depth for all of it (a beam reaching far toward the eye takes its head's) |
| `shake(spell)` | everything drawn so far thrown by the spell's shake now (`c.shake(dx, dy)` in a function): a whole scene shaken by a cast in one cell of it (`cast(S, { shake: false })` in the cell) |
| `c.setSocket("hand", x, y)` | in a function: a socket of what is being drawn, here in this frame, so a hand that moves with the pose carries it (`sockets` gives fixed ones); `stamp`'s `at`, `c.socket()` and `c.meshSocket()` find it in each frame |
| `c.setBox("hit", x, y, w, h)` | in a function: a box of this frame an engine reads, by kind (`hit`, `hurt`, `push`: any name), in whole px of the drawing; each call adds one (a body's hurtboxes, a fist's hitbox). The sheet's JSON (and an anim's own) gives each frame its `boxes`: `{ "hurt": [{ x, y, w, h }], "hit": [...] }` in the frame's own coords; `build --aseprite` writes them as slices, a key a frame (none where the frame has none). They travel like the pivot (a `flip` or a mirrored heading mirrors them). `pxl check` reads every frame of an anim whose first frame has one, and warns where a box leaves its frame. A box `footprint` is where the thing meets the ground (`turnaround()` sets it; a genre's footprint check reads it) |
| `c.setData({ phase: "active" })` | in a function: this frame's data for an engine (a move's phase, its damage, a cancel window), merged into what the frame has; the sheet's JSON gives it as the frame's `data` |
| `c.socket("hero.hand")` | in a function: where a socket of an earlier placement is (stamp it with `{ id: "hero" }`), in canvas coords: where a spell starts |
| `c.meshSocket(view, { name, at, frame?, flip? }, "hand", pixel?)` | where a socket of a sprite standing in `mesh()` is, in meters [x, z, up] (`pixel` as `mesh()`'s, the scene's `c.k` by default, the camera scaled with it); a sprite placed with `id` gives its sockets to a spell's `from` by itself |

A placement's `fx` (`stamp`, `tile`, `scatter`, ... and `mesh()` sprites) runs effects on that copy
alone, on the canvas's clock: `stamp("orb", x, y, { fx: ["dissolve", { pattern: "out", progress: k }] })`,
or a list of them; the ball breaking up where it hits, a hit flash on one enemy, without an asset for
each value. What gives light in `mesh()` (an `energy` ball, an `emit`) lights the ground as it flies
(`light: { r, strength }` on its sprite, its strength by the phase); its trail there `ghosts: [3, 50,
0.2]`, its `at` a function of the time. A whole `spell()` in a diorama: give it the `mesh()`'s camera
as its `view`, points in meters, the caster's sprite an `id` (`from: "hero.hand"`), `cast(S)` after the
`mesh()` and `lamps: S.lamps(c.t)` in it, the target's `fx: S.hit(c.t)`.

## Animation

```js
anim(name, { fps = 8, frames, loop = true, dir = "forward", base, w, h, outline, mx, ... }, ...items)
frame({ ms, hold }?, ...items)          // only inside an anim (top level or in its layers)
```

An anim is a sprite with frames. Its items run in order on every frame, except `frame(...)` items:
the k-th `frame()` only runs on frame k, so frames are **patches** over the shared items (or over
`base`). Post-processing (mirror, outline, ...) runs on each frame. A frame lasts `1000 / fps` ms,
or `ms`, or `hold` × that. `loop: false` plays once and holds the last frame. `dir: "pingpong"`
plays the drawn frames there and back (0 1 2 3 2 1), `"reverse"` backwards: draw a breathing or
swaying loop once, not twice. Exports keep each drawn frame once and put the direction in the tag
(Aseprite's `frameTags[].direction`); GIFs, previews and scenes play it. An anim with no `frames:`
and no `frame()` items has one frame: it is still, and doesn't set the clock of the scene that
stamps it; code in it that reads `c.frame` or `c.phase` draws frame 0 only (a warning says so): give
a gull meant to flap `frames: N` and the scene's `fps`. A scene has the clock of what it stamps; give
it `frames` and `fps` of its own, as an anim's, when its functions pick what to draw by time (a hero
walking, then swinging: `c.stamp(name, x, y, { t })` that many ms into the move it picks, its frames'
own durations counted), so its loop isn't the least common multiple of its anims' loops.

```js
pal({ k: 0, x: 7, l: 10, L: 9 })   // pico8's black, white, yellow, orange
anim("candle", { outline: "k", fps: 5 }, `
  .l.
  lLl
  xxx`,
  frame(), frame(grid(0, 0, "l_.\n_Ll")), frame(grid(0, 0, "._l\nlL_")))   // "_" erases
anim("frog", { base: "frog_idle" }, frame({ ms: 2200 }), frame({ ms: 200 }, grid(1, 1, "ff")))
```

**Procedural**: without `frame()` items, `frames: n` sets the count and functions draw from
`c.frame` (0..n-1), `c.frames` and `c.phase` (`frame / frames`, 0..<1). `ms` instead of `fps`: a
frame's duration, or each frame's, `ms: [200, 200, 400, 200]` (as many frames; a `frame()`'s own `ms`
wins): a move timed frame by frame (`lib/characters/hero.px.js`). Use `phase` with `sin`
for loops that wrap seamlessly:

```js
pal({ h: 9 })
anim("fire", { w: 22, h: 23, frames: 6, fps: 10 }, (c) => {
  const k = c.phase * Math.PI * 2
  c.poly([2, 21, 10, 21 - Math.round(16 + Math.sin(k) * 2), 19, 21], "h")
})
```

**Poses on a clock**: `tween(keys, { moments? })` (not an op) gives `at(t)`, the values at `t` (with
`t`): keys `[{ t: 0, yaw: 60, look: "calm" }, { t: 4 }, { t: 6, yaw: 90 }]` in time order, each taking
what it doesn't say from the one before; between two keys numbers (and arrays of them) eased in and
out (straight over a span of 1 or less, so a run of one-frame keys doesn't stop at each), strings and
the rest held till the next key; `moments: ["smear", "spark"]` are said only at their own key's `t`,
never carried. Before the first key the first, after the last the last; clamp `t` to keep a loop's
end (`examples/rig/warden.px.js`). `unroll([[3, "rest"], [2, "cut"]])` expands `[frames, value]` runs
into a value a frame (`[frames, a, b]` holds `[a, b]`): a bout's moves (`lib/characters/knight.px.js`).
`follow(values, { damp = 0.5, peak })` a value lagging a loop's, a frame each: eased toward each by
`1 - damp` a frame (a tail swinging after a turn), or with `peak` falling back at `damp` a frame from
each peak it takes (a coat's flare); worked out over the loop twice, so its first frame follows its
last (`examples/rig/warden.px.js`).

**A walk's numbers**: `gait(t, { heading | view, stride?, lift?, bob?, hands?, front?, diagonal?,
profile? })` (not an op) gives `{ view, a, feet, bob, hands, pace }` at `t` (0..1 over the cycle; at 0
both feet down facing us, the left foot passing in profile, as the traveler's): the view from a compass heading (`"front"` or `"back"` facing us or
away, `"profile"`, `"diagonal"` between; `a` how side-on, 0..1), each foot `[forward, up]` in px from under
the hip (the right half a cycle after the left), the body's dip in px, each hand `[forward, up]` from
hanging, and `pace` the px a cycle the body goes over a planted foot (a figure moved that fast keeps
its feet planted: `route()`'s pace by direction). The defaults are the guide's measured walk (characters §6, §10): facing us the feet in their
columns, the lifted one up 1, 3, 1, the hand across from it forward and up, a pixel down at each
contact; in profile a 4.6 px stride, the foot lifted 2.5 as it swings through, a 2 px triangle; on the
diagonals between. A number of `stride` is the foot planted half the cycle, going back at an even
speed, and swung through the other half (`pace` 4 strides); of `lift` a swing; a list a value a frame
(8 a cycle, as the guide's); each for every view, or for one (`profile: { stride: 4 }`). It places
nothing: the file maps it to its pose (`lib/characters/traveler.px.js`'s `walk`).

**Placing anims animates the placer.** A sprite or scene that stamps (tiles, scatters, ...) an anim,
directly or through other assets, is animated too: it loops over the least common multiple of
what it contains (capped at 60s), sampled at their common step. Keep durations on a shared grid
(e.g. multiples of 100ms) so loops stay short: a loop of more than 600 frames, longer than any it
plays, is said in `pxl build`'s line and as a note of `pxl check`, naming the loops that don't
divide (an idle of 4 x 250 ms beside a walk of 8 x 110 ms: 22 s, 2200 frames of 10 ms). Its own functions (in it, its layers, frames, clips)
run on that loop: `c.frame` (0..n-1 in steps of the common step), `c.frames`, `c.phase`, and `c.t`,
the time in ms. A sun's aura can pulse in the scene itself, over the sky it reads. Placement options:

| Option | Meaning |
|---|---|
| `frame: n` | Freeze on frame n (the placer doesn't animate from it). |
| `t: ms` | Freeze on the anim as it is that many ms into its own loop (its frames' own durations; past the loop, round again): a scene picking a move's moment by its clock. |
| `delay: ms` | Start later, snapped to the anim's step: desync copies. |
| `rdelay: true` | Random start per placement (seeded, reproducible). |

**Output**: anims go to `anims/<name>.png` (horizontal strip), `anims/<name>.json` (per-frame
`duration` + `meta.frameTags`, Aseprite style: Phaser, Godot, ... read it) and `anims/<name>.gif`.
Animated sprites and scenes get `<name>.gif` next to their PNG (which shows frame 0). Previews:
`_preview/<name>.png` shows an anim's frames side by side; anything animated also gets
`_preview/<name>.gif`. Reference layers (`ref`) show over every frame in an anim's previews, never in its exports. Anims also get `_preview/<name>_onion.png`, a review sheet for eyes that
can't watch a GIF: first a motion map (what stays put, dimmed; what moves, gray, with each frame's
contour in its own color, red first to violet last), then every frame over ghosts of the frame
before it (red) and after it (blue), wrapping around so the loop seam shows. Jitter, a part that
jumps, a limb that changes sides and a hitch at the loop all show there. Sheets expand anims into `name_0`, `name_1`, ... with durations and tags.
`pxl ascii` prints every frame of an anim. The live viewer loops animated assets after the
painting replay ends ("animate" toggle).

## CLI

```
node <pxl>/bin/pxl.js shot <file> <name> [<name> | <other.px.js>:<name> | <image or clip> ...] [--frames a,b,c | a-b | all] [--at x,y,w,h ...] [--scale N] [--vs <git rev | file>] [--diff] [--grey] [--ref] [--gif] [--out DIR]
node <pxl>/bin/pxl.js shot <image or clip> [<image or clip> ...] [--frames a,b,c | a-b | all] [--at x,y,w,h ...] [--scale N] [--grey] [--gif] [--out DIR]
node <pxl>/bin/pxl.js check <file> [name...] [--frame N] [--readings] [--fix]
node <pxl>/bin/pxl.js help [name | "<guide> <numbers or words of a heading>"] [--all]
node <pxl>/bin/pxl.js build <file> [--out DIR] [--only a,b] [--scale N] [--share N] [--no-preview] [--aseprite] [--list] [--every N] [--profile]
node <pxl>/bin/pxl.js serve <file> [--port 4321] [--out DIR | --no-out] [--no-preview]
node <pxl>/bin/pxl.js ascii <file> <name> [--frame N]
node <pxl>/bin/pxl.js list  <file>
node <pxl>/bin/pxl.js steps <file> <name> [--at x,y] [--sheet] [--out DIR]
node <pxl>/bin/pxl.js inspect <file> <scene> [--id x | --find words] [--frame N] [--json]
node <pxl>/bin/pxl.js edit <file> <scene> <edits.json | '{ "op": ..., "target": "id", ... }'> [--frame N] [--dry] [--allow ids]
node <pxl>/bin/pxl.js describe <file> <name> [--cell N] [--at x,y,w,h] [--frame N] [--diff] [--brief] [--out DIR | --no-out]     (or describe <image.png>)
node <pxl>/bin/pxl.js compare <file> <name> <other name | other.px.js:name | ref.png> [--shrink N] [--offset x,y]   |   compare <picture or clip> [--frame N] [--shrink N]
node <pxl>/bin/pxl.js blind <file> <name...> [--out DIR]   |   blind <file> --check answers.json
node <pxl>/bin/pxl.js study <picture | gif | video> [--at x,y,w,h] [--from S] [--seconds S] [--fps N] [--colors N] [--to WxH] [--px N] [--out DIR | --no-out]
```

`build --share N` also writes `out/share/`: each asset N times bigger, nearest neighbour, clear kept,
no checker or grid, a GIF when it moves: to post. `shot` writes `<name>_look.png` when its check has
LOOK lines (the pixels they name ringed: L-corners orange, jaggies blue), and a clip's note gives each
shown frame's ms.

`edit`'s ops (the EditIR, `scenes 14`): `move`, `set`, `recolor`, `flip`, `frame`, `relation`, `swap`,
`as` on a thing `inspect` names, and `add`: `{ "op": "add", "target": <new id>, "asset" | "like": <id>,
"beside" | "on" | "at": ... }`, a new stamp placed by another, written as a line after that one's
call (its layer). `inspect`'s `--find` takes its words quoted or not.

`shot` is the look while iterating: the asset built at those frames (side by side, cropped to the
region, enlarged to about 600k px, at most 16x and 1568 px on the longer side), what changed since the last shot of the same frames and region
(pixels, and the box around them in the asset's coordinates; for one asset and one region), and the
warnings `check` finds on it at those frames. `--frames` takes numbers, ranges (`0-17`, `0-3,12`) or
`all`. Several names make a row each, one under the other (`other.px.js:name` takes another file's,
and a picture or a clip from anywhere is a row too), and several `--at` a column each: two versions of
a scene, one scene from two agents, three details of a big one. A clip (a GIF, a video, read as
`study` reads them) shows all its frames unless `--frames` picks some, drawn larger it is shown at 1×,
and more than 12 frames go on in rows of 12: a reference's whole animation on one sheet.
Give PNGs at 1× (`out/scenes/x.png`, not an enlarged `_shot`): rows are enlarged together, so a big
one leaves no room for the rest. `--vs <rev | file>` puts the same shot of another version above (one
name, one region; at a git revision, the file and the art files it includes as they were there); `--diff` with it adds a row with the pixels that changed, in red. `check` makes every check `describe` can warn on, on every scene
and rig of a file at every frame (exit 1 on a warning), and lists as LOOK lines (not warnings: a
corner is often meant) the L-corners and jaggies in the 1 px lines of every sprite and part drawn by
hand (grid strings, `grid()`, `runs()`; not variants or `outline8`, nor a line whose steps are nearly
all L's: drawn square on purpose), and tones side by side too close to tell apart; `--readings` also lists what the lit-side
rule read on every placement, warning or not, with a tally; `--fix` fixes each failing `expect3d` rule
with one number (see `expect3d`), and each failing rule of a scene's `expect` by moving a placement it
names (see `expect:`), and says what it wrote. A `build` of a
whole file with more than 12 assets prints how many of each kind it wrote; `--list` or `--only`
print a line each (a smaller file prints them anyway).
A preview GIF past 4 MB says so; `--every N` keeps one frame in N in the previews (the GIFs in
`out/` keep every frame). A build that has grown slow: `--profile` prints where the time went, read
off the CPU profiler: the slowest assets, then the functions that spent the most time themselves,
in the art file (work redone every frame that could be done once, a noise called millions of
times, a per-pixel search) and in pxl.
`list` maps a file: each top-level statement that defines assets, each function and each const of
5 lines or more, its line range, the comment above it and what it defines (a loop's or a helper's
many assets on one line). A file that doesn't run on its own (one meant to be included) is mapped
from its text, without the assets its loops make. `help` prints the
rows that define a name in full (an op written up in prose, `corners()` under Terrain tilesets: that
paragraph, first), one line for each other place that mentions it and a few uses in the
examples (`--all`: everything in full); a guide's name with numbers or words of a heading prints those
sections.

`study --at x,y,w,h` reads a region, in the drawing's own pixels (as `shot`'s and the places study
prints are); on a clip it also follows what moves in it (THE REGION: the colors rare in it, where they
come and go, their box every frame in the whole picture's pixels, the spacing and squash; an effect
played once, where it flashes, peaks and fades). Timing is said per drawing ("on twos" when each is held
alike). `--no-out` prints the text only; `--px N` gives the pixel size when the grid found is wrong.

`study` learns from finished art or a reference (a PNG, a GIF, a JPEG or WebP, a video): a report of
what it is made of, with what to use in pxl to make the same (palette, `outline`/`selout`, `dither`,
the light for `relight`, `perspective({ horizon, vp })`, `scroll` per plane, `anim` frames), and in
`<out>/_study/` a sheet to look at (the picture; its techniques marked: banding red, checkers
magenta, dark lines cyan, in-between tones yellow; its straight edges colored by where they meet, the
horizon cyan; the ramps; frames and the flow), the picture and `<name>.hex`. An editor's transparency
checker exported with it (two colors in big squares, a GIF saved with Aseprite's backdrop) is taken for
clear first; a reflection under it (below a row, what is above mirrored over what's behind at one
opacity: a floor that shines, still water) is told, row and opacity, as `flip: "y"` in a layer with
that `opacity`, and left out of the rest. A sheet of sprites apart on clear or a flat ground (a game's
ripped sheet, a set of frames) is taken apart (SHEET): its sprites by row, left to right, their sizes
grouped by height (a figure's, in px), the rows whose sprites are one size (a move's frames), the
spacing between them and between rows, the colors a sprite gets; whether most of them are parts (pieces
under half a figure's height, to build frames from, FFT's way), a tileset's pieces on an 8 px grid, and
whether a sprite's mirror image is on the sheet too (drawn both ways) or none is (one side drawn, the other
flipped when played); a ripper's labels (small marks of a color or two side by side), boxes drawn round
frames and one-hue silhouettes (masks) are left out, its panels taken for ground (a color an eighth of
the sheet, much of it in one field), and no perspective is read off it. A ripper's cells filled in one
color round each sprite (#ff00ff, clear or a line between the cells: the color meeting the corners' in
straight lines) are taken for clear, the lines between with them, and said (`Clear:`), with the
`key` that clears that color on import (`sprite(name, { png, area, key: "#ff00ff" })`). How its biggest things are
built (OBJECTS, up to six; OBJECT for the one thing a sprite on clear is; none for a map, a screen of it
and up), to draw a tree or a rock
against: its tones, the patches of one color it is painted in (their size, its single pixels), where its
lights and darks sit from its middle, how often its outline turns in 10 px (lobes, tufts), the share of
deep shadow inside, which way its strokes run, and how its hue turns from its darkest tone to its
lightest (cool shadows and yellow lights: warmer). Normal maps laid out beside
the art (an HD-2D game's sheet: each frame's normals in the same place) are told and taken out before
the rest is read. A still of more than two million pixels is read for its look on its top rows (its
sprites still counted over all of it). An isometric picture is told by its lines, two sets rising and falling at one angle and meeting
nowhere: 26.6° (2:1, pixel art's) or 30° (true isometric). It reads two kinds of picture two ways.
Pixel art (few colors, hard steps between them, often drawn at 2x and up) is read as drawn: its grid
found (an exact upscale, or a blurred, compressed or fractional one: a video of a game, a JPEG,
2.5x; `--px N` gives the size when a blurred copy is read at a harmonic of it) and the picture taken
back to 1x, so its palette (near twins: colors under 0.03 apart in OKLab, ramp steps too close to
read), ramps (and how their hue shifts from shade to light, counted over the ramps: warmer in the
light, cooler, or one hue), outlines (near-black, a darker shade of what they border, or none), a
1 px dark line's L-corners and jaggies (with positions, ringed on the sheet), 2x2 dithering,
in-between tones on edges (anti-aliasing), lone pixels, the light (where each ramp's lighter tones
lie; on a sprite also its rim's lightness fit to one light, after Johnson and Farid), banding (runs of
two colors side by side whose ends line up, as Pixel Logic and the Pixel Fixer paper define it),
pillow shading (lighter the farther in from the edge all round) and repeating tiles are counted on
the artist's own pixels. Anything else (a photo, a painting, a render) has no pixels to read that
way: it is read for what a pixel artist takes from it (the masses of dark, middle and light, the
colors reduced to `--colors` (16) as ramps, the light's color against the shadows', contrast and
color by band for the haze of distance) and translated into a `--to` (160 px wide) picture in those
colors by superpixels (after Gerstner et al., "Pixelated Image Abstraction", 2012: edges stay edges
where a box average blurs them), to draw over in a `ref: true` layer: the lesson is in its masses
and light, not its pixels. Both are read for their perspective: straight edges found by region
growing on the level-line angle (after LSD, Grompone von Gioi et al. 2012), where they meet (each
crossing of two a candidate, scored by the lines pointing at it from beyond their ends), a second
point looked for along the first one's horizon; one point; two either side of the middle with the
lens and the turn they imply (`focal`, `yaw`); uprights meeting above or below, off the picture and
on its middle column, with the horizon giving the lens and the tilt (`pitch`). Animated, for their
motion: the frames' timing and holds, a
cycle (the shortest shift after which frames repeat), whether the last frame runs into the first,
edges moving by part of a pixel through in-between tones (subpixel motion: a part halfway between
two places takes the tone between its color and its neighbor's at its edge, not carried along with a
whole-pixel move; the tones it takes and between which colors are listed, the palette's keys to
draw it with `stamp(..., { sub: true })`; a piece moving so is marked, and not taken for an attack
or an effect),
bands of rows carried across together and their speeds to a fraction of a pixel (parallax planes:
`scroll`'s `per` is the speed times the loop's frames), the point the motion opens out from (a camera
moving forward: the vanishing point of the motion, which picks the road's among the still ones). And
taken apart into PIECES, each with what to build it with (after layered motion, Wang and Adelson
1994): the backdrop (each pixel's commonest color over the clip: what never differs from it is one
picture); the planes; the light, told apart before anything else is looked for, so a lamp pulsing or
a fire on the walls isn't taken for a thing (a change of light multiplies every color under it alike:
it changes smoothly from pixel to pixel, fades out or stops at an edge the picture already had, and
in step with its neighbors over the clip; a thing changes hard where the picture had no edge, is the
background moved a step, or changes its neighbors one after another; after Weiss 2001, Matsushita et
al. 2004 and Koppal and Narasimhan 2006; not where a thing goes by: a light doesn't travel); then
what differs from them, followed from frame to frame (after SORT, Bewley et al. 2016: where each
thing should be by its own speed, the piece of about its size there; two passing, one piece where
both should be, each carried on by its speed until they part): one drawing carried along a path at a steady speed (a sprite
stamped where the path puts it; growing or shrinking when it comes nearer or goes away: sizes by
`fit`); changing drawings carried along (a walk, a run, a drifting cloud: an anim of its drawings
stamped along its path, its limbs a rig when parts of it move); things going across one after
another (traffic, a crowd: sprites along a lane, or `scroll()` for a lane at one speed); and in
place, read from the pixels that change there: a cycle of drawings (`anim`), parts moving against a
body that stays (a rig, or a frame per pose), a run of poses played once with its body moving (an
attack, a jump: an action, an anim with a frame per pose, a rig posed by `ik` for many; for an action
or a thing carried, its spacing: the steps frame to frame, speeding up, slowing, holds, a move back
first, past its rest and back, a box squashing and stretching; its smears
told, the frames a long thin shape in colors there a moment only shows in, and their colors, for
`arc()`; a thing carried, the streak behind it cut off its box, for `stamp`'s `smear`), changing all
over without repeating with neighbors changing at odds (fire, water, smoke: `flame()`, `plume()`,
`warp()`), or a thing wandering about its box (a bird circling: going round a loop). Each object is
isolated from the others: the changing
pixels in fragments of pixels that differ in the same frames (a knight riding past, not the crowd
waving behind him), put back together when they touch and change in the same rhythm or in turns (a
bird lighting one side of its loop, then the other) and share colors, or have the same still body
(two arms waving either side of it: a rig; two dancers in step a few pixels apart on one lawn stay
two), or move inside another's closed body (part of it). Each light is a piece too: where it shines from,
how many times brighter at its brightest than at its dimmest, its color (`glow()` in that color, a
lamp in `lighting()`, colors swapped per frame); two pools side by side pulsing to their own rhythms
are two lights. Each piece is cut out of its background in every capture (after GrabCut's idea,
Rother et al. 2004: the background's colors, read round its box, flood in from the box's edge and stop
at its outline; what is left touching what moves is it, its holes filled; in place, in a box grown
round its whole body); a light's capture is the light itself, its color as strong as its change. The
pieces are numbered, things first, then lights; `_study/<name>_pieces.png` has a row for each, it
alone across the clip; `_piece<N>.png` its frames in a strip (a whole cycle when it has one), clear
behind it, to look at or draw over; and `<name>_pieces.json` its kind, drawings, cycle, speed, a
light's source, strength and color, and its box in every frame it shows in (its track,
`[frame, x, y, w, h]`). Videos are read `--seconds` (8) from `--from` at their own
rate up to 30 fps (`--fps`); big frames are brought down as they are read (to 1x when they are pixel
art, else to 640 px). PNG and GIF are read by pxl; JPEG, WebP, BMP and video need ffmpeg on PATH.
An animated WebP (what a saved web page often makes of a GIF) is read frame by frame, each with its
own time; a lossless one's pixels are taken as exact, a lossy one's as a JPEG's.

`compare` checks a silhouette against a reference image or another asset (`other`, or
`other.px.js:name`: a new head against an approved one): for every row, the opaque runs of the
reference (a PNG shrunk by N first; placed at x,y in the asset's coordinates) and of the asset, and how
many px wider the asset is on each side, then a summary. A picture alone gives its own rows' runs and
widths, to draw a figure to. A figure 1 to 3 px too wide per side reads
as heavy or "fat" without anyone being able to say why in a preview; this shows where.

`describe` gives a whole asset as text to read at once, objects first, with what a reader would
otherwise work out by counting characters already worked out (object lists beat raw grids for
models reading layout):

- OBJECTS, in drawing order (later is in front): where each one shows as inclusive ranges of its
  visible pixels (`x 189-207, y 135-163`), its feet (bottom middle), how much of it shows, its main
  colors; what it is in front of and behind (px covered); its three nearest objects with the empty
  px between their visible pixels and the side; its shadow from a `shade:` layer; how it stands out
  after lighting (brightness of its body vs the 2 px around it, 0..9, and the color difference in
  OKLab: under ~10 it reads only by its outline); and, in an animated asset, how much of its own
  drawing changes per frame and how far it shifts.
- MANY: things placed more than 6 times (grass, bulbs) in one line each, with the area they cover.
- Cell maps of `--cell` px (default 8): ON TOP (the object owning most of each cell), COLOR (most
  common key before lighting, `~` for blended colors outside the palette), LIGHT (brightness after
  lighting, 0..9).
- PAINTED: the painting steps grouped by source line (one line of code is one intent: a fence loop
  is `vline/px x104`).
- `--at x,y,w,h`: that region's exact keys, with absolute rulers.
- `--diff`: each describe keeps what it saw in `<out>/_describe/`; with `--diff` the output starts
  with CHANGES since the last one: objects moved (`werewolf: moved +2,+0`), redrawn, added or
  removed; how many pixels changed in the drawing and only in the light; one color turned into
  another over many pixels as one `recolor` line; and the other changed pixels as regions with the
  objects they belong to, largest first. Run it after an edit to see that it touched only what you
  meant.
- `--brief`: one line per object (ranges, feet, the two nearest objects, cover, contrast, motion)
  and the ON TOP map; no color or light maps, no steps. About a third of the size (a 320x180 scene
  ~5.6k characters) and 96% in the same blind test: use it on busy scenes.

A 320x180 lit scene comes to ~17k characters (~5k tokens; a busy 320x240 one ~21k), where the 2x
preview costs a few hundred tokens: look with `shot`, and read this for anything you would
count or measure. In blind tests (readers given only one form, questions on counts, positions,
gaps, depth, contrast and motion) the 2x preview scored 66%, the first text form (sprite boxes
instead of visible pixels, no motion) 77% and this one 100%, on the scene it was built with and on
a held-out one whose questions came before its text.

Any PNG works too: its colors get index keys (most common first). On a clear background (a sheet,
a cutout) each 8-connected patch is a shape, identical or mirrored shapes one entry with a list of
where they are. On an opaque one, REGIONS are the large patches of one color (the background; a
dither counts as one patch) and OBJECTS the rest in 8-connected patches, repeats folded, specks
counted; a map of identical 16x16 tiles is added when the image is built from tiles. An opaque image
of more than 64 colors is read in 32. Things that touch come out as one object, and a lit render
breaks into light bands: for a pxl scene, describe the scene, not its PNG.

`steps` prints how an asset was painted: every top-level op, layer and post-processing step in
order, with its file:line, the pixels it changed and where ("no change" = it painted nothing).
`--at x,y` keeps only the steps that changed that pixel of the final image, with its color after
each: which line painted it wrong. `--sheet` also writes `_preview/<name>_steps.png`, a numbered
thumbnail per step (every k-th of a long build). Anims show frame 0.

Outputs go to `<file dir>/out`: `sprites/<n>.png`, `scenes/<n>.png`, `anims/<n>.png` (a strip; see Animation), `<sheet>.png` + `<sheet>.json`
(TexturePacker hash format: Phaser, Godot importers, ...), `_preview/<n>.png` (upscaled to
~768px, checkerboard behind transparency, pixel grid at scale ≥ 6 with every 8th line darker).

### Output for engines

Beside the art of a sprite, scene, anim or sheet, a build writes two maps laid out in the same
rectangles (the art's JSON serves all three), each with the art's own alpha:

| File | When | Each pixel's channels |
|---|---|---|
| `<n>_n.png` | anything in it has normals (`bump`, `normals()`, a `normals` PNG) | RGB = the way its surface faces × 0.5 + 0.5: R right, G up, B toward the eye (OpenGL's convention, as Godot and Unity read it; flat `#8080ff`) |
| `<n>_e.png` | anything in it gives light (`effect("emit")`, a spell's glow) | R = G = B = how much it glows, 0 to 255 (pxl draws such a pixel as it is, unlit, and blooms it); black where nothing does |

A sheet's JSON (and an anim's own) gives each frame its `boxes` and `data` (`c.setBox`, `c.setData`:
a fighter's hit and hurt boxes, a turnaround's `footprint`) and its `sockets` (`{ "hand": { x, y } }`,
the asset's `sockets` and `c.setSocket`'s, in the frame's px). A sheet with `slots: { jade: swap,
dusk: swap }` (each a swap of keys to colors, `{ R: "#30544b" }`, or a `roleSwap()`) also gives
`meta.palette`, the sheet's colors in the order they first appear, and `meta.slots`, each slot's
colors in that order (a palette swap's lookup: color i becomes the slot's color i), and writes them
as `<sheet>.hex` and `<sheet>.<slot>.hex` (Lospec's, a color a line) beside it, so an engine
recolors the one sheet instead of a sheet a slot.

A heading's sprite `n` or `e` shares the suffix (`car_n.png`, its normal map `car_n_n.png`): a
glob `*_n.png` also matches north sprites. A map that would be another asset's own file (an asset
`x` with normals beside an asset `x_n`) fails the build, naming both.

Godot 4: the art and `_n.png` make a `CanvasTexture` (its `normal_texture`), so `PointLight2D` and
`DirectionalLight2D` light the sprite by it; `_e.png` goes to a `CanvasItem` shader as a texture
uniform that mixes the lit color back to the art's own by its red (and pushes it past 1 for a
`WorldEnvironment` glow to bloom, with HDR 2D on). Unity (URP 2D): `_n.png` is the sprite's `_NormalMap` secondary
texture (in the Sprite Editor; the default Sprite-Lit shader reads it for lights with normal maps on);
`_e.png` another secondary texture (`_EmissionTex`, say) that a Shader Graph of your own adds after
the 2D light, the art's color times its red, which the URP Bloom then picks up.
An asset that places tilemaps also gets `<n>.tmj`, a Tiled map with one tile layer per tilemap
(named after its `layer`) and a tileset image per layer (`<n>.1.png`, ...) holding the distinct tiles
it used, after group picks, flips and swaps. Orthogonal maps redraw exactly; for isometric ones,
check the tile alignment in Tiled. A layer whose tiles differ in size or stand by a pivot (props)
is left out, and the build line says why.

`build --aseprite` also writes each asset as `<n>.aseprite`, for a person to keep editing in Aseprite:
its layers by name, every frame with its duration (anims once each, as in sheets), a tag with the
playback direction, the palette with each key as its color's name, and `slice` / `pivot` as a slice.
What the asset changes on top of its layers (outline, `shade:` / `light:` layers, glow, lighting) goes to
one layer over them, `outline` or `effects`, in the colors it left, so the file shows exactly the built
frames; blended and `hidden` layers come along hidden, `ref` layers as reference layers. Assets with
no layers, or with `mx`, `my`, `flip`, `rot`, `angle` or `crop` (which move the art away from its
layers), come out as one layer, and the build line says why. One way only: pxl never reads the file
back, and the next `--aseprite` build writes over it, so copy it out of `out/` before editing.
(`build` and `serve` without the flag leave it alone.)

`serve` opens a live viewer that rebuilds on save, follows the asset you edited and replays its
painting steps (each top-level op, layer and post-processing step, with its file:line). It also
writes the same outputs as `build`, except a long loop's (frames x width x height past 16 million:
a 1920x1080 scene of more than 8 frames): the page fetches its frames one at a time as it plays them,
each built when asked (a second or two an HD frame), so it plays at that pace; `pxl build --only`
writes it. For anims, "onion" holds the animation on one frame with the
previous frame tinted red and the next tinted blue underneath; `,` and `.` step frames. A file that
exports `.glb` or `.ply` (`export3d`) gets a "3D" link: `/3d` shows them to turn round, a moving
`.glb` playing (three.js from a CDN: the one part of pxl that needs the network).

## Library

```ts
import { loadProject, loadSource, writeOutputs, serve, ascii, preview } from "pxl-pixelart";
const p = loadProject("art.px.js");
const img = p.image("slime");          // Img { w, h, data: Uint32Array of 0xRRGGBBAA }
```

`pxl-pixelart/core` exports the platform-independent engine (no Node APIs).
