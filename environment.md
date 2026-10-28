# pxl environment: the ground and what grows and lies on it

How 16-bit games draw grass, trees, bushes, rocks, walls, paths and the small things on them, as
rules you can draw from and numbers you can check against. Taken from SLYNYRD's Pixelblog (posts 2,
3, 6, 11, 13, 15, 20, 21, 43, 44, 45, 51), Saint11's tutorials (clusters, shading, vegetation, rock,
ruins, city), final boss blues (Tiling Tiles, Form and Light), So You Want To Be A Pixel Artist
(ch. 1-6), the OpenGameArt / Les Forges course (ch. 3, 4, 7, 8), Pixel Joint's tutorials and the
Pixelation knowledge repository, and from `pxl study` on the sheets of Chrono Trigger, CrossCode,
Terranigma, Final Fantasy Tactics Advance, Tactics Ogre, A Link to the Past and Sword of Mana.

Each piece here is in the nature kit, `examples/nature/kit.px.js`: include it
(`include("<path>/nature/kit.px.js", { palette: true })`) and use its sprites, or call its builders
for more of a kind (§10). `examples/hd2d/graveyard.px.js` puts it all in a scene.

## 1. Learning from a game's sheet

Before drawing a kind of thing you haven't drawn, read how a game draws it. `pxl study sheet.png`
takes a sheet apart and, under OBJECTS, says how its biggest things are built (one OBJECT for a
single sprite on clear); study your own drawing the same way (a sprite written at 1x as a PNG) and
compare. What each number means:

- **tones**: colors in it. **patches**: the size of its one-color areas (median, and 90% under);
  **single pixels**: the share of patches one pixel big. Far above the games' share reads as noise.
- **lights at / darks at**: where its lightest and darkest fifths sit from its middle (the light's
  side; a dark outline pulls the darks to the middle).
- **outline turns in 10 px**: lobes and tufts make many, a cut shape few.
- **deep shadow**: the share of its inside in its two darkest tones.
- **strokes**: which way neighbours of one color run (diagonals: leaves, needles; down: blades,
  streaks; across: strata, planks).
- **hue turns**: from its darkest tone to its lightest, and whether warmer (shadows cool, lights
  toward yellow).

What the games' foliage measured (trees, crowns, bushes):

| Game | Tones | Patches (90% under) | Single px | Deep shadow | Hue turn |
|---|---|---|---|---|---|
| CrossCode trees (60x89) | 8-27 | 1-2 (7-15) | 40-60% | 6-15% | 19-142°, warm |
| Chrono Trigger forests | 11-48 | 1-2 (5-14) | 41-61% | 1-31% | 23-173°, warm |
| Terranigma conifers | 7-16 | 1 (6-8) | 51-56% | 43-51% | 102°, warm |
| FFTA towns and trees | 16-23 | 1-2 (6-10) | 47-52% | 4-7% | 131°, warm |
| Tactics Ogre (painted) | 55-66 | 1 (3) | 74-76% | 3-4% | 33-47°, warm |

So a 16-bit tree or bush: 8-20 tones, patches of 1-2 px with 90% under 6-15, 40-60% single pixels,
5-15% deep shadow (up to half in a dark conifer wood), strokes on the diagonals, the hue turning
warm from shade to light by tens of degrees. The kit's pine reads 10 tones, 52% single, 5% deep,
171° warm. A whole map, or sprites touching, gives no OBJECTS: crop one thing to a PNG with clear
round it.

## 2. Ground and grass

- The ground is felt, not looked at: lower contrast than the characters and props on it (final boss
  blues, So You Want ch. 6, OpenGameArt ch. 8).
- 3-5 tones, about 18 apart in lightness (0-255); the base 40-70% of the tile; the darks turning
  blue (hue 180-210), the light yellow (hue 65). SLYNYRD's lush grass: base hue 84 at 60%
  brightness, two lights 9 and 16 brighter, the darks hue 135 then 209.
- Mostly bare base, a tone darker in broad blobs 10-30 px with ragged edges.
- Clumps, not noise: fans of 3-5 blades, 5-7 px wide and 3-5 tall, tips a tone up (one clump in
  four with a lit tip), a short shadow of 2 px a tone down at their foot, away from the light (a whole
  row of the darkest tone under a clump reads from afar as a dark dash, not a shadow); between them
  small marks of 2-3 px a tone down.
  No two clumps touching (corners may). Single pixels only as glints.
- Density varies: flat ground, then slender strokes (1x2, 1x3), then lush clumps, set by a broad
  field; busy next to busy tires the eye, so leave quiet areas.
- A tile of 16-32 px (64x48 in the kit, for less repetition): draw what wraps its edges first, let
  clusters cross them, lay it out as a map and remove lines of aligned bright dots. Four variants
  and decals (flowers, tall grass, dirt) beat one tile.
- Far off: near grass has blades, the middle plane 1-2 px clusters, the far plane none; farther is
  lighter, less saturated, its hue nearer the sky's. Under trees: darker and browner, so the open
  ground where the player is draws the eye.
- Tufts in the wind: grass sways twice in the trees' loop (`cycles: 2`), power 1 (blades bend from
  the root), 1-2 px at the top, `vary: 0.5`; one wind for the field, a gust rolling across it as a
  `delay` of 10 ms a px of x (120 ms a m in a `mesh()`), so neighbours move together and the far side
  later. Someone walking through: the tufts within 9 px of the feet pushed away from them, 3 px at
  the feet down to none, standing back up as they pass (`PXL help effect`, sway).
- Tiles laid in a map, details scattered over them, corner tilesets: scenes §2.
- On a floor seen at an angle (`mesh()`, `plane()`), lay the texture a texel to a pixel where the
  camera looks (`texel: "screen"` in `mesh()`; `[1 / ppm, 1 / (ppm * sin pitch)]` by hand): at a fixed
  texel the camera squashes it and upright blades come out lying down.

## 3. Trees

- The silhouette reads without color; detail on its borders, the inside left as rest; one leaf mark
  repeated, no orphan pixels (Saint11).
- A crown of leaf bundles about 26 px round, 4-5 colors each, in three variants a ramp step apart,
  layered by the light: a dark crescent on the shadow side, a lighter disc on the lit side; no even
  bands. About 5 greens, half of them light, from a warm light to a cold shadow; in SLYNYRD's ramp
  the middle tones keep one brightness and the hue does the shading (81, 117, 170, 207, 244, 261).
  Clumps part by a jump from light to dark, not by an outline. Build: silhouette, big clumps, the
  shadows under them, lights, leaves last.
- A conifer: tiers overhanging the one below by 2-3 px (5-6 notches a side); a tier's hem in points
  of needles 2-3 px deep every 3-4 px; 2 rows in the shadow of the tier above, then a few lit on the
  sun's side; the far side indigo (hue 230-260); fronds as strips 2 px thick running down and out. A
  frond: a 1 px spine 20-30° down with needle strokes every 2 px (SLYNYRD).
- A conifer built in 3D on fields (`make3d.spruce`, §10; the graveyard's wood), drawn by `surface()`
  from a billboard's 20 degrees: a cone for the trunk; per tier a core round it and 6-12 ellipsoid
  clumps reaching out and drooping, each turned to its branch, more
  toward the top; a spire of three narrowing ellipsoids. What it took: tiers spaced so the dark
  under each shows (overlapping them by 1.7 made one round bush); the clumps no wider than the
  circle shares them out (a wide minimum made the top tiers flat caps, a pagoda); darkening in
  toward the trunk scaled by the tier's size (the small top tiers went black); the sun's rim only
  where the contour is open both ways toward it (`rim: 0.85`) and needle strokes only on the sun's
  side (`strokes`; on every clump they read as noise at the HD size), the hems in points (`hem: 2`),
  no self-shadow and no outline (a sun behind left it dark and ringed); the normals the surfaces
  have, so the scene's sun lights it as it is (a hand ray tracer drew it first: the same look at
  1.4 times the cost a frame, built once a loop, in 40 lines instead of 100). Wind: the trunk bending with the square of the height, the gust coming and
  going over the loop (16 frames at 220 ms, two sways in the graveyard's 7 s) (a clump's tip
  fluttering twice as fast, under a pixel, flickered in its tones on fields: `flutter` 0); each tree's frame offset by where it stands, the gust reaching one side
  first.
- Trees of a species, built in 3D (`examples/nature/trees.px.js`): one way to grow a tree and a
  spec per species, a `make3d` builder each: the shrine's momiji, ginkgo and black pine (kuromatsu);
  the oak, birch, weeping willow, sakura, Italian cypress, umbrella acacia, baobab and coconut palm.
  The spec: its form (a trunk forking, a maple's or an oak's; a leader up the middle, a ginkgo's, a
  birch's, a cypress's), the trunk's fork, lean and kinks, its curve (`bow`: a palm's) and swelling
  (`girth(t)`: a baobab's bottle), the branches by order (how many, how steep, how long), the
  foliage at the twigs' ends in airy clusters or flat pads (`layered`: a maple's tiers), strands
  hanging from them (`hang`: a willow's curtains, swinging late behind the crown; golden `twigs`
  bare) or fronds instead (`fronds`; `fruit`: coconuts), a second bark where a function of the point
  says (`marks`: a birch's dashes, a palm's rings, a cherry's lenticels). `season` picks the leaves:
  spring, summer, autumn and bare (a sakura's spring is its blossom); the acacia's summer (the
  rains) and autumn (dry), the baobab's summer and bare; the evergreens the same all year. `color`
  picks one of an autumn's, `height` is its top, `wind` m its sway (negative: to the west). A new
  species: the nearest spec copied (a beech the oak's, a sugi the cypress's), its leaves in
  `trees.mats`, then `make3d.define("beech", (o) => trees.grow(BEECH, o), trees.params(BEECH))` (its
  parameters declared: a season it has no leaves for refused); judge it as flat blocks first (a tone
  a material), from the side, turned, from above and far, then paint it.
  Cost, a 50-60 px tree at 20 px to the meter: 0.2-0.5 s (baobab, palm, momiji, birch, cypress),
  1-1.4 s the dense ones (sakura, acacia, ginkgo, oak, willow), a willow swaying 1.1 s a frame. `pxl
  check` builds every sprite of a file: the 46 trees of the contact sheet as sprites took the file's
  check from 7 to 32 s; drawn in place in a `check: false` scene (the grove and the row checked,
  every species in them), 10 s. What it took: forked high, a maple's crown read as an acacia's
  table, its trunk a lollipop's stick; forked under half a meter, its limbs rising 50 degrees then
  near level, it came down in tiers; small bumps on the clusters (`bump`, `grain`) gave the leaves'
  texture under the light; a crown wider than the scene allowed hid the path behind it (`height`
  sets the top, the width follows). An oak's long limbs split its crown into lobes (shorter, steeper
  ones: one heavy dome); a willow came out a box until its outer twigs drooped (`rise` -0.4 at the
  third order), and its curtain closed with strands as thick as the clusters (a third as thick: the
  trunk shows); a birch's white twigs vanished against a light ground (marked dark out from the
  trunk); coconuts hid in the fronds until hung lower; a tree lit from one side is never flipped.
- One tree at every density (the library lab, a tree 2.5 tiles tall on a 16 to 128 px grid): its form
  relative to it (tiers, clusters, width over height), its texture in screen px. A builder takes the
  `ppm` it is drawn at from the drawing call (`turnaround()`, `draw3d()`, `surface()`; or give it,
  `make3d.oak({ ppm })`, the species, `make3d.tree`, the kit's `make3d.spruce`): it holds `make3d.px`'s
  floors, a cluster 10 px across or more (never past the mass it makes up: a small birch or a cypress
  keeps its outline), grain 2 px, marks 4 px apart, an edge 2 px. The tones are the genre's:
  `genre(name, { tones: 3 })` at 16-32 px, or `surface: { tones: 3 }`.
  Specks (the share of pixels in runs of one tone 1-2 px big) at a 16 px grid: the oak 3.8% as built,
  1.7% with its ppm, 1.3% with 3 tones as well; the spruce 21%, 6%. At 128 px nothing set in meters
  reads as leaves: `foliage()` over the crown, hand-drawn tufts in steps from the tones under them,
  their gaps and sizes varied (`vary`); freeze the 3D render first (`frozen`) and the brush iterates
  in a second instead of a minute and a half.
- A trunk darker than the crown, planted: seen from above, cut at the ground (SLYNYRD); seen from
  the side or at an angle, its foot flared 2-3 px with a root or two. Bark in 1 px stripes, widest
  apart in the middle; a knot. Laying top-down crowns from one clump, importing trees: scenes §4.
- A dead tree: limbs that kink every 4-6 px and split in one to three, tapering 5, 3, 2, 1 px, the
  last no longer than 5 px; the lightest tone only on the upper left of the trunk and big limbs.
  Built in 3D (`deadTreeLimbs`, made a field of tapering rods by `make3d.snag`, §10), its splits kept apart: from the
  trunk one each way across the picture at angles of their own (and now and then one on up); from a
  limb one carrying on its way and one bending further out, never back over the trunk (limbs coming
  toward us, going off behind the trunk or bending back read as a tangle at the fork); three levels
  of them, not four (in 3D the fourth's twigs overlap into a bush); bark on the trunk only; the lit
  edge the whole side toward the sun, not the corners of its steps (dots).
- Flat trees in the wind (`effect("sway")`, `PXL help effect`), each an anim made from the sprite,
  16 frames of 125 ms: the kit's 68 px pine 2 px at the top with its 6 rows of trunk still, the dead
  tree 1.5 px, power 2.5, 12 rows still (its limbs only), a bush 1 px, power 1.5. A flutter whose
  ripple turns fast up the rows (0.9 radian a row) tore the tiers into a comb; at 0.3 a row, 1 px
  of it keeps them whole. Placed with `reseed: true`, no two in step; the foot never moves. What
  doesn't sway by its height (a vine's hanging tips, a flag's free edge) is painted: `mask`, an
  asset of the same size, its white going the whole way and its black and clear staying.
- Variety: 2-3 heights and a color swap or two (a far one hazier); symmetric trees may repeat in
  staggered rows, asymmetric ones are focal points, used once. Don't mirror a tree lit from one side.
- Backlit (the sun behind): the fronts lose detail and contrast, and a 1 px rim of the lightest tone
  runs along the contour on the sun's side.

## 4. Bushes

Lobes of leaf clusters (2x2, or 3 px in an L) on a fill of their dark; the back lobes a step darker;
each lobe darker on its shadow side; 4-5 tones from teal to yellow-green; in shade, the light tone a
pixel or two a lobe. The outline a shade of what it touches (`outline` + `selout`), never black.
Two or three shapes, set in groups of 2-3 at uneven gaps.

## 5. Rocks

- Flat planes, one tone each; only a flat top is bright, the sides switch to darker at once; no
  gradients, no concentric bands (a rock shaded by its normal reads as a bun).
- The lightest tone a 1 px rim (about 2% of it); the darkest only as lines: the undercut, the shaded
  side. A ledge: a 1-2 px light band over a 1 px dark undercut.
- 6-7 tones, the hue moving 20-40° a step and the brightness 9-13, saturation 10-30: SLYNYRD's 28 px
  rock runs from hue 79 at full brightness to hue 270 at 52%. It shares the ground's hues.
- Edges in 90° and 45° steps, small jagged corners; a crack of 1 px; grass blades over its foot.
- Small ones blocked in with color; big ones from an outline cut into planes, the outline then
  dropped.

## 6. Walls, cliffs and steps

- Bricks with 1 px of mortar dividing a 16 px tile: 15, 7, 3 or 1 wide; or courses and blocks of
  their own sizes. The mortar a step under the stone: 33% of a face in dark mortar reads as a grid.
- A block's lip lit along 50-80% of its top from its left, some none; a corner chipped off one block
  in four, a pit in one in three, one branching crack in 32 px; the joint solid along the bottom,
  broken toward the middle; a few blocks pushed in or out.
- Darker toward the ground, moss climbing from the foot; old stone lower in contrast, rounded,
  overgrown. Grass of the top hanging over the head; the steps' risers without it.
- The wall's top much brighter than its face, the face's bricks shorter than the top's. Every tile
  used a lot gets a variant (a crack, a stained block). Cliffs: strata or blocks lit on top, dark
  undersides.
- A raised plot in a diorama (a hill, a terrace: `examples/hd2d/graveyard.px.js`) is not a box. Its
  outline a rectangle with rounded corners (about a quarter of its short side), the edges wandering a
  few cm in and out (smooth noise), straight only where steps meet it; the wall a face for each piece
  of the outline, so each turn takes the light its own way, its texture anchored to the world
  (`anchor: "world"`) so it runs on round the turns. Small light clumps of grass spill over the top
  edge at uneven gaps (a dark, unbroken band reads as a hedge of its own); a boulder breaks a corner,
  against the wall where it turns: drawn as the rocks of §5 (a flat foot, grass over it; one with a
  round bottom, a moss cap and an outline all round read as a cushion floating, out of the scene),
  and placed where there is ground (rounding the corners left the old corner points in the air).

## 7. Paths and floors

Wooden decks, piers and planked hulls at the sprites' scale: scenes §7 (the harbor).

Cobbles of 6-9 px (SLYNYRD) or 10-16 x 6-8 (final boss blues), 4 tones; the gap 1 px of a darker
shade of the ground's hue; one dash of 2-4 px lit on each stone's lit edge, not a lit outline.
Flagstones of mixed sizes, moss in no more than a third of the joints. Low contrast.

A temple's approach (ishidatami), read on photographs: long slabs laid across the walk in a running
bond of lengths of their own, a speckled granite in a few tones, moss in some joints; a curb of long
cut stones, a strip of rounded pebbles, then gravel or moss; a landing of wider slabs before a gate
or a hall; a bend paved without a seam, the slabs fanning round it. Three straight runs butting into
each other read as parts joined, not a path: lay it along a `lane()` (`japan.paving()` in
`examples/nature/japan.px.js`, the shrine's: `examples/shrine/shrine.px.js`).

## 8. Small things

- Tufts: fans on a tapering base, asymmetric, three sizes, set in twos to fours at the feet of
  things (stones, posts, a wall's foot).
- Flowers: one color to a clump, blooms of 2-3 px, or SLYNYRD's 5x5 (petals round a 1 px center of
  a contrasting color), 3x3 pluses and 2 px buds, in groups of 3-6 within about 12 px, a shadow pixel
  under each.
- Props standing on the ground (a headstone, a post, a sign) are sprites at the scene's scale, not
  textured boxes: the top in the sun, the front toward us in the shade when the sun is behind, a
  1 px rim on the top's front edge; cuts with their upper wall dark and their floor lit; wear with a
  cause (pockmarks, lichen in clusters of 2-3 px, moss in lumps from the foot, a chipped corner, a
  crack, a lean); the darkest tone only down the shaded side.
- Fences: the picket faces toward us in the shade, light only on the point and the top 3 px, rails
  darker behind; one picket in seven short, leaning or missing. In a diorama, built of boxes turned
  along each straight run of the ground's outline (depth, a shadow from its foot): pickets about 11 cm
  every 25 cm with a pointed head, a post with a cap only where a run is long (its ends, its middle
  past 2.4 m; a post at every point of a curve reads as a palisade), rails behind, on the inside.
  Its pieces sized in whole pixels of the sprites (a picket 3, a post 4, a rail 2) and drawn in
  blocks of that pixel (`block: 4` on its materials in an HD picture), a tone of weathered wood to
  each face by its light, the grain in dashes a step darker, the outline only under it and on the
  shaded side. Drawn at the HD picture's own pixel instead (a texture of 96 to the meter), it read
  as a 3D render among pixel-art sprites, not as pixel art; a texture of the sprites' size on faces
  in perspective striped the pickets (its texels and the blocks don't line up).

- Leaves on the wind (the graveyard): 3x3 px tumbling in four frames (face on, turning, edge on,
  turned the other way), two colors; each crosses once a loop (about 5 m/s, coming in and leaving
  past the picture's edges), above what stands there, rising and falling a whole number of times a
  loop so it closes, its shadow running on the ground below.

## 9. Light, depth and placement

- Lights toward yellow, shadows toward blue or violet, never black. Outlines only a little darker
  than what they border, round things, never round the ground.
- Top-down with the light from above (SLYNYRD): the top face the second lightest tone, the rim
  facing the light the lightest (1 px), the face toward the viewer the second darkest, the corner
  away from the light the darkest.
- Cast shadows: short (a tile at most), one flat cool tone, the same length and way for everything;
  a low sun's long shadows run together into stripes.
- Near: more saturation, contrast and detail; far: fewer, colder, lighter.
- The detail goes where the player is (the focus); round it, quieter.
- Repetition: variants, color swaps, groups at uneven gaps.
- Dithering only at the tapering edge of a cluster, not as a field; single pixels only as glints.

## 10. The kit

`examples/nature/kit.px.js`, its light from the upper left, its textures tiling, a texel to a pixel:

| Builder / sprite | Makes |
|---|---|
| `grassTile(name, { lush, seed })` | a 64x48 grass tile (§2): `_grass` lush, `_turf` the wood's quieter floor |
| `pine(name, h, seed)` | a conifer h px tall (§3): `_pine` 68, `_pine_m` 60, `_pine_s` 52, `_pine_far` hazed |
| `make3d.snag({ h, seed, sway })` | the dead tree built as limbs in 3D on fields, swaying a little (§3), drawn by `surface()` from 20 degrees up: `_snag` |
| `make3d.spruce({ h, seed, sway })`, `spruce(name, h, seed)` | the same conifer built in 3D on fields and swaying in the wind (§3), drawn by `surface()` from 20 degrees up (`hem`, `strokes`, `rim: 0.85`): `_spruce` 68, `_spruce_m` 60, `_spruce_s` 52, `_spruce_far` hazed; a scene picks each one's `frame` |
| `bush(name, w, lobes, seed)` | a bush of lobes `[x, y, r, back]` (§4): `_bush`, `_bush_b`, `_bush_c` |
| `rampart(name, overhang)` | a 48x29 stone wall face (§6): `_rampart` with grass over its head, `_riser` without |
| `_flags` | 48x48 flagstones (§7) |
| `_rock`, `_rock_small` | rocks in planes (§5) |
| `_tuft_a/b/c`, `_flowers_w/p` | tufts and flowers (§8) |
| `_deadtree` | a dead tree, 4 m (§3) |

`pxl build examples/nature/kit.px.js` writes them all on one sheet, `nature.png`.
