# pxl reference

Contents: Palette · Assets (items, sprite/scene options, layer options) · Ops (shapes, texture and
tone, placing assets, terrain tilesets) · Lighting · Glow · Animation · CLI · Library.
To look up one name instead of reading this file: `pxl help <name>`.

Art files are plain JavaScript (or TypeScript) evaluated with the DSL as globals. Nothing draws
at definition time: `sprite`, `scene`, ... record definitions; everything renders at build time,
so assets may reference each other in any order.

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
| `pal({ k: "#1b1630", g: 11, h: "k" })` | Add/override single-char keys: hex, palette index, or copy of another key. `. _ # space` are reserved. |
| `ramps("kDdu", "kTtq")` | Light ramps, dark → light. `shade` steps a color left, `light` steps right. When a key is in several ramps, the first ramp that goes on from it wins: where two branch from it, `pxl check` warns when a step goes through it; `pxl steps --at x,y` names the ramps a step went along. |
| `shades("HGgl", "#5aa040", { hue = 20, at })` | Define the keys (dark → light) as shades of one base color and add them as a ramp. The base sits exactly at key `at` (default the middle); darker shades turn toward blue-violet and lighter ones toward yellow, up to `hue` degrees at the ends (hue shifting; `hue: 0` for lightness only). One call per material. |

Every asset keeps the palette that was active where it was defined, so files with different
palettes can be included and stamped together.

## Assets

```js
sprite(name, opts?, ...items)
scene(name, { w, h, bg?, ... }, ...items)
layer(name, layerOpts?, ...items)      // only as an item of a sprite or scene (layers don't nest)
plate(relightOpts?, ...items)          // the items drawn and lit on their own, then laid down: anywhere
group(name, ["a", "b", "rock_*", ...])  // random pick per placement; repeat a name to weight it
sheet(name, ["slime*", "heart", groupName], { cols?, pad?, extrude? })  // extrude: repeat edge pixels n px out
include("other.px.js")                  // path relative to the current file; included files share one scope: a const of one is seen by the other (name what they share, like a cue frame; each name declared once)
directions("ship", 16, { from, outline?, symmetric?, draw?, rotate?, pivot? })  // ship_0..ship_15 + group "ship"; see rotation.md
font(name, "glyph_sprite", { chars: "ABC...", w, h, cols? })  // bitmap font: glyphs in w x h cells, in chars order; trimmed to their ink (proportional)
include("palette.px.js", { palette: true })  // also take its use()/pal()/ramps() from here on
rig(name, { w, h, facing, slots: { torso: { at, size }, arm: { at, size, side: "r" } }, parts?, guide? }, ...retouch)  // skeleton first: characters.md §11
figure(h, heads?)                       // a standing figure's landmark rows: chin, shoulders, chest, waist, crotch, knees, ankles, sole; shoulderW
ik(a, b, [x, y], bend?)                 // two bones from (0, 0) reaching for the point: [joint, end]; bend 1 (default) bends toward increasing angle (y down: an arm's elbow below, a leg's knee behind), -1 the other way
has(name)                               // is there an asset or a group of that name yet (a generated part made once)
```

A rig is a sprite: each slot is a joint `at`, a box `size` (the part's size, outline included), the
point of the part on the joint (`pivot`, default its top middle), its body side (`side: "l" | "r"`)
and `z`; the part is the asset `<rig>_<slot>` (or `part`), a labelled stand-in box until it exists
(`parts: false`: stand-ins only). The far side's parts go behind the middle (-100), the near side's
in front (+100), plus `z`. `guide` (default true) shows the drawn parts' slot boxes and the joints in
previews. Items after the options are a retouch layer on top. `PXL describe` prints a RIG section.
`light: [x, y]`: the light the parts are drawn under; each part's lit side is checked against it.
`far: n`: the far side's parts n steps darker along the ramps. `turn: "name_l"`: also the same rig
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

An included file's `use`/`pal`/`ramps` apply to its own assets only; your palette is the same
after the `include` as before it. Pass `{ palette: true }` to share one palette file across art
files.

Names starting with `_` are **parts**: usable everywhere but not exported, and not matched by
sheet globs.

### Items (run in order)

- **Grid string**: one char per pixel, drawn at 0,0. Rows are trimmed, blank edge rows dropped,
  short rows padded. `.`/space keep, `_` erases. Use template literals for multi-line grids.
  For figures wider than ~20 px, `runs()` (below) avoids counting dots.
- **Op**: `rect(...)`, `stamp(...)`, ... (below).
- **Function**: `(c) => { ... }` gets the canvas; call ops as methods (`c.rect(...)`), plus
  `c.w`, `c.h`, `c.is(x, y, "ab")` (pixel is one of these keys; `"*"` opaque, `"."` transparent),
  `c.key(x, y)`, `c.get(x, y)` (packed color), `c.rng(seed)` (deterministic, follows reseed),
  `c.size(name)` (`{ w, h }` of an asset as it would be placed, for layouts).
- **Layer**: drawn on its own image, then blended in at its place in the list.

### Sprite / scene options

| Option | Meaning |
|---|---|
| `w, h` | Canvas size. Sprites infer it from grid strings (including grids inside layers) when omitted; scenes require it. |
| `base: "name"` | Start from a copy of another asset (variant). Overlay coordinates are the base's final coordinates (outline included). |
| `bg` | Scene background color. |
| `mx: true` | Mirror the left half onto the right after all items. Inferred width doubles (write half a row). `mx: "c"`: odd width, shared center column. `my` likewise vertically. |
| `swap: { g: "r" }` | Recolor after drawing. |
| `flip: "x" \| "y" \| "xy"`, `rot: 90 \| 180 \| 270` | Transform. |
| `angle: deg`, `rotate: "auto" \| "rotsprite" \| "shear" \| "nearest"` | Any angle, clockwise, after `flip`/`rot` and before `outline` (the outline is drawn around the turned shape). `auto`: quarter turns exact, under 12° a shear (a lean that keeps every pixel), else RotSprite. No new colors. See [rotation.md](rotation.md) for which angles hold up. |
| `outline: "k"` | 1px outline around opaque pixels; **grows the canvas 1px on every side**. `outline8` also fills diagonals. |
| `inline: "k"` | 1px line over the sprite's own edge pixels (Aseprite's inside outline): the canvas keeps its size. |
| `inline: { color: "k", keep: "Kk12" }` | The same, but edge pixels in the `keep` keys stay as they are: closes only the gaps of an outline that is already there, such as the one left after shrinking an image (`shrink`), selective colors included. |
| `selout: true \| n` | With `outline`/`outline8`/`inline`: each line pixel takes the sprite color it touches, `n` steps darker along the ramps (`true` = 2), so the line softens next to light colors; colors without a ramp keep the line color. Needs `ramps`. |
| `crop: true` | Trim to opaque bounds. |
| `layers: true` | Also export each layer as `out/<sprites\|scenes>/<name>/<layer>.png`. |
| `png: "file.png"` | Start from a PNG (path relative to the art file), like `base` starts from another asset: every option and item then works on it. In an `anim` with `frames: n`, frame k is the k-th of n equal slices of the image (a strip). The live viewer rebuilds when the file changes. Any PNG except interlaced ones. |
| `area: [x, y, w, h]` | With `png`: only this part of the image (one sprite out of a sheet). |
| `palettize: true` | With `png`: snap every color to the nearest keyed palette color, so `ascii`, `swap` and `recolor` see keys. |
| `shrink: n` | With `png`: shrink by a whole factor, after `area`. Each n×n block becomes its most common opaque color (ties: the first, scanning the block column by column), or transparent when fewer than half of its pixels are opaque. Keeps silhouettes and the curves of shapes far better than sampling one pixel per block: the start for a smaller version of finished art (then redraw what it breaks; see characters.md). |
| `slice: n \| [left, top, right, bottom]` | 9-slice margins of the final image (outline included) for `panel()`; flips and rotations turn them; sheets export them as Aseprite `meta.slices` (bounds + center). |
| `wrap: true \| "x" \| "y"` | Seamless tile (Aseprite's tiled mode): drawing, stamps, fills and reads past those edges continue on the opposite side, and the preview lays the tile out 3×3 (3×1, 1×3) so seams show. For tiles that repeat themselves; random variants placed side by side don't line up across edges. |
| `pivot: "bottom" \| "center" \| [x, y]` | The point `stamp`, `scatter` and wire hangs put on the given position. `"bottom"` is the middle of the final image's bottom edge, so `stamp("tree", x, groundY)` stands it on row `groundY` whatever its size. `[x, y]` is in drawing coordinates (pixel corners) and moves with flip, rot, outline and crop, here and in placements. A `base` variant starts with its base's pivot. Sheets export it as a normalized `pivot` (0.5, 1 = bottom center). |
| `register: "m" \| { key, x }` | Register every frame by a marked point (the pelvis): the drawing moves sideways so the pixel of key `m` lands on `x` (default the middle); y is left alone, so the bob stays. Never by the bounding box: an arm reaching out moves it. The marker is a key used for nothing else, best drawn per frame in a `ref: true` layer (`layer("marks", { ref: true }, frame(px(12, 20, "m")), ...)`); drawn in the art, it is erased once found. A frame without it is an error. |
| `twin: "name_l"` | Also the asset facing the other way under that name: the same items drawn mirrored before they are lit, so `relight` lights it from where the light really is (a `flip` carries the light across); pivot, sockets and `facing` mirrored. Art functions see `c.mirrored` (for choices a mirror doesn't make, such as which edge of a hand-lit blade is the lit one). `text`, `bump` and `normals` refuse to run in a twin. |
| `facing: "right" \| "left" \| "front" \| "back"` | Which way it faces as drawn ("front": toward us). Flips and turns carry it, and `PXL describe` says for each placement where it faces, which way its top points (upright, lying, upside down, leaning), which of its sides is toward us, and when it is a mirror image (a flip moves a sword to the other hand). Lettering is tracked even without `facing`: a mirrored sign gets a warning that it reads backwards. In a rig, a part whose `facing` differs from the rig's is called out. It is a label: pxl does not read the pixels to check it. |
| `height: meters` | Its real height. In a scene with `world`, describe says how tall it should be where it stands, and how far off the drawing is. It measures the drawing's box, top to bottom: a thing seen at an angle (a tent, a cart, a log) has its far end higher on screen, which the box counts too, so judge its near end yourself (describe says so when a wide thing comes out too tall). |
| `world: { horizon, eye }` or `{ scale }` | Scene: the world's scale. Ground in perspective: the horizon's row and the eye's height in meters (a thing standing on row y is (y − horizon) / eye px per meter, as in `perspective()`); flat side view: `scale` px per meter. Used by describe with `height`. `light: [x, y]` (where the light comes from): describe reads each object's lit side off its rim and warns when it disagrees (a flipped copy is lit from the other side). `light: { at: [x, y] }`: a point light in the scene (a fire, a lamp): each object is checked against the way from its middle to that point, and the one it sits in isn't checked. `ground: y` (flat views): what has a `height` is checked for floating or sinking; with or without it, a thing whose feet aren't where it was stamped (its pivot below its sole) is called out. |
| `sockets: { name: [x, y], ... }` | Named points in drawing coordinates (pixel corners) that other stamps attach to: `stamp("arm_3", 0, 0, { at: "body.shoulder" })` puts the arm's pivot on the body's `shoulder` socket, wherever and however the body was placed. They move with flip, rot, angle, outline and crop, like the pivot. For characters built from parts (characters.md §10). |

Post-processing order: mirror → swap → flip → rot → outline → crop.

### Layer options

| Option | Meaning |
|---|---|
| `x, y` | Offset of every op in the layer. |
| `sort: "y" \| "z"` | Draw the layer's `stamp`s and `scatter` picks sorted instead of in call order: `"y"` by the point they stand on (top-down scenes: what stands lower, nearer the viewer, covers what stands higher), `"z"` by their `z` option (default 0). Ties keep call order. Other ops in the layer draw at once, before the sorted stamps. |
| `hidden: true` | Skip when compositing (still exported with `layers: true`). |
| `outline: false` | The asset's `outline` / `outline8` / `inline` isn't drawn around this layer's pixels (1 px ropes, pegs, smears stay 1 px), through mirror, flip, rot and angle. Its pixels stay where they are in the drawing order. |
| `ref: true \| 0..1` | Reference / guide layer: previews and the live viewer show it over the art (`true`: full color, so small marks stay visible; a number: that strength over drawn pixels, to see the art through a mannequin or a shrunk original); the exported PNG, sheets, `layers: true` and stamps of the asset leave it out. For drawing over a pose skeleton (`pose`), a mannequin or a shrunk original. It stays in drawing coordinates: an `outline`'s growth is followed, but mirror, flip, rot, angle and crop are refused. |
| `shade: true \| n \| { m: "M" }` | Blend layer: not drawn. Wherever it is opaque, what's below steps darker along the ramps (`n` steps, or the given map). |
| `light: ...` | Same, lighter. Cast shadows, light spills, glows. |
| `density: 0..1` | Ordered-dither the layer (soft edges). Stack a low-density big shape and a full small one for falloff. |
| `blend: "multiply" \| "screen" \| "add" \| "overlay"` | Color math with the pixels below, like an image editor's layer modes: `multiply` darkens (night, a tinted shadow), `screen`/`add` lighten (light, fire), `overlay` tints with contrast (color grading). **The results are new colors, off the palette.** Only opaque pixels below are touched. |
| `opacity: 0..1` | Real translucency (glass, water, fog) instead of `density`'s dither; with `blend`, how much of the blend shows. New colors too; over empty pixels the layer keeps that alpha. |
| `palettize: true` | With `blend`/`opacity`: snap each result to the nearest keyed palette color. Works only when the palette has those tones; otherwise distinct colors collapse into one and shading is lost. For darkening inside the palette, use `shade`. |

## Ops

`?` marks optional arguments.

### Shapes
| Op | Notes |
|---|---|
| `px(x, y, c)` | |
| `rect(x, y, w, h, c)` · `box(x, y, w, h, c)` | filled · 1px border |
| `line(x0, y0, x1, y1, c, width?)` | width > 1 = round brush (tubes, poles, thick strokes) |
| `curve([x0, y0, x1, y1, ...], c, { width?, closed? })` | smooth curve **through** the points (Catmull-Rom, no hidden control points): tails, vines, hair, cables, handles. 1px wide it is pixel-perfect (no doubled L-corners); `width` > 1 = round brush; `closed: true` loops back to the first point (then `fill` inside). For linework; a small closed shape such as a leaf reads better drawn pixel by pixel in a grid |
| `hline(x, y, len, c)` · `vline(x, y, len, c)` | |
| `circ(cx, cy, r, c)` · `ring(cx, cy, r, c)` | pixel-art circles; ring is a clean 1px border |
| `ellipse(cx, cy, rx, ry, c, ring?)` | |
| `arc(cx, cy, r, from, to, c, { inner?, taper? })` | part of a ring, from angle `from` to `to` (degrees, clockwise from pointing right; the sweep goes from one to the other, either way round): 1 px wide, or down to radius `inner` (0: a filled sector). `taper: true` grows its width from nothing at `from` to `inner` at `to`: a blade's smear, thickening toward the blade. Halos, rainbows, partial rings |
| `poly([x0, y0, x1, y1, ...], c)` | filled; vertices on pixel corners (`[0,0, 4,0, 4,4, 0,4]` = `rect(0,0,4,4)`) |
| `fill(x, y, c)` | 4-connected flood fill |
| `wire(x0, y0, x1, y1, sag, c, { hang?, every = 6, start?, ...placement })` | sagging cable; `hang` stamps an asset/group under it every `every` px (string lights) |
| `text(x, y, "str", c, { scale = 1, gap = 1, lead = 1, align: "l"\|"c"\|"r", shadow?, font? })` | built-in 3×5 font: A-Z 0-9 and common punctuation, `\n` for lines; `font` uses a `font()` instead (`examples/fonts/font5x7.px.js` is a ready 5×7 one to `include`). The 3×5 is for numbers and short labels: O and 0, S and 5 are the same glyph, and 21 pairs differ by one pixel (C/E, H/K, K/X, I/1, G/6...). A reader sorts them out from the word, but not on a busy, lit sign: words that must read take the 5×7, or `scale: 2` |

### Texture and tone
| Op | Notes |
|---|---|
| `dither(x, y, w, h, c1, c2, density = 0.5)` | Bayer 4×4; c2 covers `density` |
| `grad(x, y, w, h, "abc", dir = "v", soft = 0.5)` | bands with dithered seams; `"h"` horizontal; `"r"` radial, from the center out to the ellipse that fits the box (end on `"."` to leave the corners alone: suns, halos, vignettes); soft 0 = hard bands (crisp rings) |
| `noise(x, y, w, h, "ab", density = 0.1, seed = 1, on?)` | deterministic speckle; `on: "g"` only touches those keys (`"*"` any opaque) |
| `shade(where?, steps = 1, density = 1)` · `light(...)` | step colors along ramps inside a region |
| `rampmap(ramp, { where?, hue? })` | gradient map onto a ramp, kept in the palette: the distinct colors in the region, sorted dark to light by brightness, take the ramp's keys in that order, spread from its darkest to its lightest. Tones never merge while there are no more colors than keys (`palettize` snaps each color to its nearest key, and two can land on one). `hue: [from, to]` (degrees, wrapping past 360) takes only colors of that hue: the greens and the browns of an import go to their own ramps, `rampmap("Ggl", { hue: [70, 170] }), rampmap("bco", { hue: [10, 50] })` |
| `relight(where?, { light?, reach?, strength?, ramps?, glint? })` | volume for flat art (a reduced import whose tones merged, a shape filled in one color): each pixel steps along its ramp by where it sits in the shape. An edge facing the light (empty space on that side, up to `reach` px away, default 1) gets lighter, one facing away darker. `glint: 1.5`: pixels at least that exposed (open above and toward the light) take their ramp's lightest key, so glints follow the light instead of being placed by hand. `light` is the direction it comes from, default `[-0.5, -1]` (top-left, mostly from above): a top edge +1, left +0.5, bottom -1, right -0.5, rounded, times `strength`. `ramps` defaults to the palette's. Then `shade` the occluded core (the heart of a crown) and low hanging parts by region |
| `recolor({ a: "b" }, where?, density = 1)` | swap colors inside a region; `"*"` takes every other opaque color (`frame(recolor({ "*": "w" }))`: a hit-flash frame) |

**Regions** (`where`, `clip`): `undefined` = everywhere, `[cx, cy, r]` circle, `[x, y, w, h]`
rect, `[x0, y0, x1, y1, x2, y2, ...]` polygon, or `(x, y) => boolean`.

### Placing assets
| Op | Notes |
|---|---|
| `stamp(name, x, y, opts?)` | puts the asset's `pivot` on (x, y); without one, its top-left corner |
| `tile(name, x, y, cols, rows, opts?)` | grid of copies (each cell picks separately for groups) |
| `pattern(name, x, y, w, h, opts?)` | fill an area with copies; edges cut to fit |
| `panel(name, x, y, w, h, opts?)` | 9-slice: an asset with `slice` margins drawn at w×h. Corners stay as drawn; edges and center **repeat** (never stretch), so keep the center a flat fill or a seamless pattern. UI frames, buttons, dialog boxes |
| `tilemap("gg\nd.", { map: { g: "grass", d: "dirt" }, size?, w?, h?, x?, y?, ...placement })` | character map; `.` empty. `corners: "#"` (or `true`: any char but `.`): the map marks tile **corners** instead, one more row and column than tiles, and each tile is picked by its corner mask, 1 top-left + 2 top-right + 4 bottom-left + 8 bottom-right: `map: { 15: "dirt_full", ... }`, or a name prefix, `map: "dirt_"` for `dirt_1` … `dirt_15` (mask 0 stays empty unless `dirt_0` exists); the way to lay paths, shores and patches with a terrain tileset (see Terrain tilesets below). `iso: true` with the floor diamond's `w`, `h` (e.g. 32×16): cells on an isometric grid, columns down-right and rows down-left, drawn back to front; a tile's top-left sits on its diamond's top-left, and a tile with a `pivot` stands on the diamond's center (props). One level; stacked heights take a loop (`examples/isometric.px.js`) |
| `scatter(name, x, y, w, h, count, { on?, near?, within?, clip?, below?, even?, ...placement })` | brush: `count` picks centered (or pivoted) at random points; `near: "aAo", within: 3` = the center must also be within that many px (default 2) of those keys: grass along a path's edges, moss at the foot of rocks, foam along a shore; `on` = center must land on these keys (`.` = an empty pixel: around a shape, not on it); `clip` = paint only onto them; `below` = masks read the composite under this layer (a layer starts empty, so an `on` that places nothing is an error); `even` = one pick per cell of a grid sized to `count`, at a random spot in the cell: stones, pebbles and flowers spread evenly over the whole area, without the clumps and holes of pure random |
| `warp((x, y) => [dx, dy], where?)` | move pixels by whole-pixel offsets without redrawing them: breathing, hair and tails swaying, a body sheared onto a slope. The function gives the offset at a pixel's **new** place (or nothing: it stays) and the pixel takes the color found that far behind it, so no hole opens and no color is made up; offsets are rounded; `where` limits it to a region. It moves what's on the canvas so far: in an anim built from a `sort` layer, put it as an item after that layer |
| `chain(anchors, { links?, length?, gravity?, drag?, rest?, stiff?, follow?, step?, max?, move?, steps?, loops? })` | not an op: hair, tails, scarves and ropes that follow with lag. `follow: 1.6` follows the way Celeste's hair does: each frame a point covers 1/`follow` of the way to its place (the point before plus `step`, e.g. `[0.4, 2]`: a little behind and below) and never trails more than `max` from it; no inertia, so it trails and settles without bouncing (best for hair). Without `follow` it's physical: `anchors[f]` is where the chain is fixed in frame f; each of `links` points (default 5) stays `length` px (2) from the one before, with inertia (`drag`, 0.8 kept per step), weight (`gravity`, [0, 0.5]) and a shape it turns back toward (`rest` direction, [0, 1], by `stiff`, 0.15). `move` is the character's travel per frame in the world (walking left: `[-1, 0]`), so the chain trails behind. It's simulated over the loop until the motion repeats (`loops`, 24), so the anim loops without a jump, and returns per frame `[anchor, p1, ..., pN]` (floats). Draw discs along it in a layer under the body: `layer("hair", (c) => HAIR[c.frame].forEach(([x, y], i) => c.circ(Math.round(x), Math.round(y), R[i], "h")))` |
| `motion("walk.json", { dir?, scale?, at? })` | not an op: called at the top of the art file, it reads a motion guide (`examples/motion/`: CC0 walk and run cycles, 8 directions × 8 frames) and returns one direction (`dir`: `N NE E SE S SW W NW`) as `{ ms, frames, depth, contact }`. `frames[i]` maps joint names to whole-pixel `[x, y]`, scaled by `scale` with the floor point moved to `at`; `depth[i]` says which joint is nearer the viewer; `contact[i]` is [left, right] foot down. Draw a frame with `pose()`, and use the numbers to place parts (examples/tropical/girl.px.js: a 32 px girl walking) |
| `clip(region, ...items)` | run items with drawing restricted to the region (half domes, roof slopes, masked textures) |
| `plate(relightOpts?, ...items)` | the items drawn on a plate of their own, lit there with `relight` (which then reads only the plate's edges), and laid down: a pauldron over its lames, a mass of stone, a crag, each taking the rim light and the shade on its own edges. Unlike a layer it goes anywhere, in a layer or another plate too; in a function: `c.plate(() => { ... }, opts)` |
| `runs({ y: [[x, "chars"], ...], ... })` | pixels as runs at absolute x, row by row: `runs({ 30: [[19, "3H3"], [23, "deeR"]] })`. Same keys as a grid (`.` keeps, `_` erases), but each run starts where it says, so nothing is counted: for hand-drawn figures and patches over a shrunk or base image |
| `pose("pose.json" \| joints, { x?, y?, scale?, color?, joint?, min?, bones?, sides? })` | a pose skeleton as a guide: bones as lines (`color`, default `"R"`), joints as dots (`joint`, default `"Y"`; `false` for none); `sides: true` colors the limbs by side (left arm magenta, right arm green, left leg orange, right leg cyan), so a limb that swaps sides between frames shows. Reads a pose detector's output (a `{ name: [x, y, score?] }` map, or OpenPose JSON in COCO-18 or BODY_25), placed at `(x * scale + x, y * scale + y)`; joints scoring under `min` are skipped. Names: `head`, `nose`, `neck`, `l_`/`r_` + `eye ear shoulder elbow wrist hip knee ankle big_toe heel`, `mid_hip`. In an anim, draw a motion guide's current frame: `layer("guide", { ref: true }, (c) => c.pose(walk.frames[c.frame], { sides: true }))`. Usually inside a `ref: true` layer. The detector runs outside pxl (e.g. rtmlib's DWPose on the image upscaled) |

Any `name` may be a sprite, scene, group, or glob (`"tree_*"`). Placement options, for `stamp`,
`tile`, `pattern`, `panel`, `scatter` and wire hangs (anims add `frame`, `delay`, `rdelay`; see
Animation):

| Option | Effect |
|---|---|
| `flip: "x"\|"y"\|"xy"`, `rot: 90\|180\|270` | mirror or turn this copy |
| `swap: { g: "r" }` | recolor this copy |
| `fit: px` | of a group or glob, the member whose drawing is nearest that height (the smaller on a tie): one thing drawn at several sizes, picked by how big it is where it stands. `stamp("walker_*", x, y, { fit: P.scale(z) * 1.75, frame })`: a figure far down a road takes the sprite drawn for its size instead of a scaled one |
| `rflip: "x"\|"y"\|"xy"` | random flips, per copy |
| `rswap: [{ g: "r" }, {}]` | a random recolor per copy (`{}` = none) |
| `seed`, `reseed: true \| n` | `reseed` rebuilds the placed asset with its own random choices; `true` derives them from the position, so `tile("house", 0, 0, 4, 1, { reseed: true })` gives four different houses from one definition |
| `silhouette: "w"` | every opaque pixel in that color: hit flashes, and cast shadows when placed in a `shade: true` layer |
| `at: "id.socket"`, `id` | attach to a socket of a stamp placed earlier in the same asset, any layer: x, y become an offset from it; `id` names a placement (default: its asset name) |
| `z` | its order in a `sort: "z"` layer |
| `cast: [kx, ky]` | the asset laid flat on the ground as its shadow: a pixel h px above its base lands h × (kx, ky) from where it stands, e.g. `[0.6, 0.2]` for light from the top left. The base is the pivot's row, so give tall props `pivot: "bottom"`; it applies after `flip`, so a mirrored tree still throws its shadow the same way. In a `shade` layer: `stamp("palm", x, y, { cast: [0.6, 0.2] })` |
| `castBase: "column"` | with `cast`: each column stands on its own lowest pixel instead of the pivot's row, for a base that isn't level (a tent seen at an angle, its hem higher at the back: from the pivot's row, what hangs below it would cast toward the sun) |

Randomness is seeded from the placement position + `seed`, so builds are reproducible and moving
one placement doesn't reshuffle the others. Change `seed` to reroll.

### Perspective

| Op | Notes |
|---|---|
| `perspective({ w, horizon, eye, fov?, focal?, vp?, yaw?, pitch? })` | not an op: a pinhole camera over flat ground, in meters. `eye` m above the ground, the horizon on row `horizon`, `fov` degrees across the `w` px picture (default 90) or the `focal` length in px, looking at column `vp` (default the middle), turned `yaw` degrees right of the world's z axis (default 0), tilted `pitch` degrees up, down if negative (default 0). Returns `ground(x, z, up?)`: where a point x m across, z m ahead and `up` m above the ground lands on screen (floats); `at(col, row)`: the ground point `[x, z]` seen through a pixel (null at the horizon and above); `scale(z, x?, up?)`: px per meter there; `vanish(angle?)`: the column where ground lines heading that many degrees right of z meet (0: the z lines, 90: the x lines); `vertical()`: `[col, row]` where uprights meet (null when level). With yaw 0, everything running straight ahead meets at `vp`: one-point perspective; turned, the world's x and z lines meet at two points: two-point; tilted up, the horizon sits lower (the camera looks `focal·tan(pitch)` px above it) and uprights lean in toward a third point above the picture: three-point (a worm's-eye view; tilted down, a bird's-eye one, meeting below). Level, the same model as `world: { horizon, eye }` |
| `plane(view, (x, z) => key, where?)` | flat ground in perspective: the function gives the color of the ground point seen through each pixel under the horizon (`.` or nothing leaves it); `view` is a `perspective()` or its options (`w` defaults to the canvas's). Stripes in x run to the vanishing point, stripes in z space out toward the eye. A thin line sampled per pixel breaks into dots far away: keep it at least ~0.6 px wide there (`Math.max(width, z / P.focal * 0.6)`), or draw it as a `line` between two `ground()` points |

Things standing on the ground are placed at `ground(x, z)` and sized by `scale(z)`. A walker going away
holds its scale for a whole step and changes it only at the next contact, when the pose changes anyway
(no size flicker mid-step), with the planted foot where it landed; under ~15 px, a figure drawn by code
at its exact size turns into a blob, so draw the small sizes by hand (`walker_14`, `walker_12` ...
`walker_5`) and pick with `fit` (`examples/perspective/road.px.js`).

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

Draw the 16 pieces yourself, one function over the mask (`examples/topdown.px.js` for a shore,
`examples/tropical/trail.px.js` for dirt with a ragged edge that frays into the grass), or take
them from a tileset. Check its license first: with a share-alike one (CC-BY-SA, GPL) everything
built with it has to be shared under that license too, so prefer CC0 / CC-BY, or draw your own
after its look. In an LPC-style terrain (32px tiles), the 3×3 ring of outer corners and edges
holds masks `8 12 4` / `10 · 5` / `2 3 1`, read row by row (its center is often empty: take full
tiles, mask 15, from the fill variants), and the 2×2 block around a hole holds the inner corners
`7 11` / `13 14`. Masks 6 and 9 (two opposite corners)
are usually missing: stamp the two outer corners over each other. LPC inner corners are cut deeper
than the edges, so they leave a 2–3 px step where they meet; building them from two edges instead
draws the edges' dark rims across the terrain. `shrink: 2` takes 32px tiles to 16px.

## Lighting

`lamp(x, y, { r, color, power })`, `lighting({ cell, sky, ambient, emit, ... })`, and the layer flags
`solid`, `wall`, `unlit`: see [lighting.md](lighting.md). The same file covers normal maps:
`bump("dome"|"bevel"|"luma", { w, depth, on, where })` and the numpad grid `normals(x, y, grid)`.

## Glow

`glow(keys, { where, r = 6, strength = 0.5, color, bands, ramp, keep })` goes directly in a sprite or
scene body (like `lighting`) and works on everything drawn before it: every pixel whose color is
one of `keys` spills a halo onto the opaque pixels within `r`, falling off with distance. The
glowing pixels themselves are left as they are, and transparent pixels stay empty.

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
(Aseprite's `frameTags[].direction`); GIFs, previews and scenes play it.

```js
anim("candle", { outline: "k", fps: 5 }, `
  .l.
  lLl
  xxx`,
  frame(), frame(grid(0, 0, "l_.\n_Ll")), frame(grid(0, 0, "._l\nlL_")))   // "_" erases
anim("frog", { base: "frog_idle" }, frame({ ms: 2200 }), frame({ ms: 200 }, grid(1, 1, "ff")))
```

**Procedural**: without `frame()` items, `frames: n` sets the count and functions draw from
`c.frame` (0..n-1), `c.frames` and `c.phase` (`frame / frames`, 0..<1). Use `phase` with `sin`
for loops that wrap seamlessly:

```js
anim("fire", { w: 22, h: 23, frames: 6, fps: 10 }, (c) => {
  const k = c.phase * Math.PI * 2
  c.poly([2, 21, 10, 21 - Math.round(16 + Math.sin(k) * 2), 19, 21], "h")
})
```

**Placing anims animates the placer.** A sprite or scene that stamps (tiles, scatters, ...) an anim,
directly or through other assets, is animated too: it loops over the least common multiple of
what it contains (capped at 60s), sampled at their common step. Keep durations on a shared grid
(e.g. multiples of 100ms) so loops stay short. Its own functions (in it, its layers, frames, clips)
run on that loop: `c.frame` (0..n-1 in steps of the common step), `c.frames`, `c.phase`, and `c.t`,
the time in ms. A sun's aura can pulse in the scene itself, over the sky it reads. Placement options:

| Option | Meaning |
|---|---|
| `frame: n` | Freeze on frame n (the placer doesn't animate from it). |
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
node <pxl>/bin/pxl.js shot <file> <name> [<name> | <other.px.js>:<name> | <image.png> ...] [--frames a,b,c] [--at x,y,w,h ...] [--scale N] [--vs <git rev | file>] [--diff] [--out DIR]
node <pxl>/bin/pxl.js shot <image.png> [<image.png> ...] [--at x,y,w,h ...] [--scale N] [--out DIR]
node <pxl>/bin/pxl.js check <file> [name...] [--frame N] [--readings]
node <pxl>/bin/pxl.js help [name | "<guide> <numbers or words of a heading>"] [--all]
node <pxl>/bin/pxl.js build <file> [--out DIR] [--only a,b] [--scale N] [--no-preview] [--aseprite] [--list] [--every N]
node <pxl>/bin/pxl.js serve <file> [--port 4321] [--out DIR | --no-out] [--no-preview]
node <pxl>/bin/pxl.js ascii <file> <name> [--frame N]
node <pxl>/bin/pxl.js list  <file>
node <pxl>/bin/pxl.js steps <file> <name> [--at x,y] [--sheet] [--out DIR]
node <pxl>/bin/pxl.js describe <file> <name> [--cell N] [--at x,y,w,h] [--frame N] [--diff] [--brief] [--out DIR | --no-out]     (or describe <image.png>)
node <pxl>/bin/pxl.js compare <file> <name> <ref.png> [--shrink N] [--offset x,y]
node <pxl>/bin/pxl.js blind <file> <name...> [--out DIR]   |   blind <file> --check answers.json
```

`shot` is the look while iterating: the asset built at those frames (side by side, cropped to the
region, enlarged to about 600k px), what changed since the last shot of the same frames and region
(pixels, and the box around them in the asset's coordinates; for one asset and one region), and the
warnings `check` finds on it at those frames. Several names make a row each, one under the other
(`other.px.js:name` takes another file's, and a PNG from anywhere is a row too), and several `--at`
a column each: two versions of a scene, one scene from two agents, three details of a big one.
Give PNGs at 1× (`out/scenes/x.png`, not an enlarged `_shot`): rows are enlarged together, so a big
one leaves no room for the rest. `check --readings`
also lists what the lit-side rule read on every placement, warning or not, with a tally.
`check` runs them on every scene and rig of a file at every frame. A `build` of a
whole file with more than 12 assets prints how many of each kind it wrote; `--list` or `--only`
print a line each (a smaller file prints them anyway).
A preview GIF past 4 MB says so; `--every N` keeps one frame in N in the previews (the GIFs in
`out/` keep every frame).
`list` maps a file: each top-level statement that defines assets, its line range, the comment
above it and the assets it defines (a loop's or a helper's many on one line). `help` prints the
rows that define a name in full and one line for each other place that mentions it (`--all`: in
full); a guide's name with numbers or words of a heading prints those sections.

`compare` checks a silhouette against a reference image: for every row, the opaque runs of the
reference (shrunk by N first, placed at x,y in the asset's coordinates) and of the asset, and how
many px wider the asset is on each side, then a summary. A figure 1 to 3 px too wide per side reads
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
counted; a map of identical 16x16 tiles is added when the image is built from tiles. An image of
more than 64 colors is read in 32. Things that touch come out as one object, and a lit render
breaks into light bands: for a pxl scene, describe the scene, not its PNG.

`steps` prints how an asset was painted: every top-level op, layer and post-processing step in
order, with its file:line, the pixels it changed and where ("no change" = it painted nothing).
`--at x,y` keeps only the steps that changed that pixel of the final image, with its color after
each: which line painted it wrong. `--sheet` also writes `_preview/<name>_steps.png`, a numbered
thumbnail per step (every k-th of a long build). Anims show frame 0.

Outputs go to `<file dir>/out`: `sprites/<n>.png`, `scenes/<n>.png`, `<sheet>.png` + `<sheet>.json`
(TexturePacker hash format: Phaser, Godot importers, ...), `_preview/<n>.png` (upscaled to
~768px, checkerboard behind transparency, pixel grid at scale ≥ 6 with every 8th line darker).
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
writes the same outputs as `build`. For anims, "onion" holds the animation on one frame with the
previous frame tinted red and the next tinted blue underneath; `,` and `.` step frames.

## Library

```ts
import { loadProject, loadSource, writeOutputs, serve, ascii, preview } from "pxl-pixelart";
const p = loadProject("art.px.js");
const img = p.image("slime");          // Img { w, h, data: Uint32Array of 0xRRGGBBAA }
```

`pxl-pixelart/core` exports the platform-independent engine (no Node APIs).
