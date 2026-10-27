# Scenes, environments and buildings

Read this before building a scene, a level, a building or any environment.

Contents: Layout and scale · Ground, paths and tiles · Texture without filler · Trees and big organic
shapes · Water and things that land · Distance (aerial perspective) · True perspective · Slow motion
in a short loop · Closing a loop · Parallax · Shadows and light · Blend modes · Checking a scene ·
A game's screen · A game's projections · 3D as code

A reference scene (a screenshot, a photo of the place, a GIF or a video of a game): `PXL study` gives
its horizon and vanishing points, its planes and their speeds, its palette and its light, the
pieces that move (each cut out, with its track and what to build it with), and for a photo a small
translation in few colors to draw over. `PXL shot ref.gif` puts a clip's frames on one sheet to
look at (`--frames 0-11` for some).

## 1. Layout and scale

- **Size buildings from the characters.** A door is a little taller than the tallest figure that
  could walk through it (figures of 26–34 px: a 34 px door). A crypt whose door was shorter than its
  monsters turned a werewolf on its roof into a giant.
- Flat side views and top-down maps have no perspective: things do not shrink with distance.
  Top-down, two buildings' fake-perspective walls side by side splay into a V; square vertical
  footers at their base corners straighten the outline. A thing's collider is its footprint (an
  ellipse at its feet), not what overhangs.
- **Give things a real size, and the scene a world.** `height: 1.8` (meters) on an asset, and on the
  scene `world: { horizon, eye }` (ground in perspective: a thing standing on row y is
  (y − horizon) / eye px per meter) or `world: { scale }` (flat: px per meter). `PXL describe` then
  says how tall each thing should be where it stands: `1.8 m tall is 41 px where it stands (y 134);
  drawn 46 px, 12% too tall`. It measures the drawing's box: a wide thing seen at an angle (a tent,
  a cart) has its far end higher on screen, so judge its near end.
- **Say which way things face.** `facing: "right"` on an asset, and describe says for each placement
  where it faces, which of its sides is toward us, whether it lies or stands upside down, and when a
  flip made it a mirror image (a sword in the other hand; a sign's lettering backwards).
- **Say where the light comes from, and where the ground is.** `world: { light: [0.6, -1], ground:
  84 }`: describe reads each object's lit side off its rim and warns when a flipped copy is lit from
  the wrong side, and calls out what has a `height` but floats or sinks (also a pivot left below the
  sole: `stamp(x, groundY)` then stands it above the ground). Lit by a fire or a lamp in the
  scene, give its place instead, `light: { at: [x, y] }` (the flames' middle): each object is then
  checked against the way from it to the fire, so what stands on either side of it can be right.
  Without `light`, the lamps `lighting()` lights by and a `mesh()`'s light are read (`light: false`: none).
- What stands on the ground goes in a `sort: "y"` layer, so the lower (nearer) thing draws in front.
  Give props `pivot: "bottom"` and stamp them at the ground's y. Top-down, something floating or
  hanging sorts at the point on the ground under it (its pivot there), and an L-shaped or tall thing
  is cut into pieces, each sorted on its own base.
- Figures need a few px of air to read. `PXL describe <file> <scene>` gives the gap between objects
  (`nearest: witch 3px left`); two figures at 1 px read as one shape.
- **Place what belongs to something by its relation to it**, so it follows when that moves: `stamp("pot",
  { beside: ["campfire", "left", 4] })` (its box 4 px off), `{ on: "cairn" }` (on its top), `{ along:
  [WAY, 87, 21] }` (87 px along a path or `lane()`, 21 px to its right), `{ apart: ["tree", 2] }`
  (kept out of its box); x, y stay for the rest, or as an offset. The lanterns, the basin and the torii
  along the approach in `shrine/shrine.px.js`, the pennant on the sunset's cairn; `PXL help beside`.

## 2. Ground, paths and tiles

- **Paths, roads, shores and patches of ground are laid with tiles**, marked at tile corners with
  `tilemap(..., { corners })` and a terrain tileset (drawn in code by `corners()`, or reduced from a
  free LPC-style one): `examples/topdown.px.js`, `examples/tropical/trail.px.js`. A `curve` or `poly` stroke of dirt
  reads as paint on top of the grass.
- Tiles that repeat get `wrap: true` (or `"x"`/`"y"`): the preview shows them 3×3 (3×1, 1×3), so seams show,
  and drawing past an edge continues on the other side.
- A side view's ground that isn't one row (a cave's floor, a ledge, a ceiling for what hangs from it):
  a polyline, `const floor = profile([0, 118, 24, 114, ...])`, `floor(x)` its row under x; drawn as a
  `poly`, props stood on it; `world: { ground: [...] }` checks the feet of what has a height against it
  (`[floor, ledge, ...]`: a ledge or an island over its own span) and `stamp(name, x, "ground")` stands
  one on the floor (`examples/grotto.px.js`, `examples/cave.px.js`).
- A paved path that bends (a temple's approach, a road, a river's banks), not tiles: `lane(points, {
  round })` gives each pixel `[s, u]`, how far along it and to its side, so slabs laid in courses at
  steps of `s` fan round the bend with no seam, its curbs at `|u|`, gravel raked along it at the same
  distance; wide landings (before a gate, a hall) as rectangles it runs into. Temple paths, read on
  photographs: long slabs across the walk in a running bond, moss in the joints, a curb of long cut
  stones, then a strip of rounded pebbles (`japan.paving()` in `examples/nature/japan.px.js`; the
  shrine's approach, `examples/shrine/shrine.px.js`).
- Keep small details that dot an area (pebbles, flowers, tufts) out of tiles: baked in, they repeat
  as a pattern. Lay plain tiles, then `scatter(..., { even: true })` the details over them.
- A tileset (Saint11): draw the master tile, offset it by half (`wrap: true` shows the seams) and fix
  the cross in the middle; draw the edge tiles from the middle tile's edge strips; variants change
  only the middle. A full set: a single tile, tubes, a T for each turn, a cross, inner corners, and a
  wildcard tile.
- **A tileset someone lays out in an editor** (Tiled, an engine) can't be scattered over afterwards:
  the details go in the tiles, as variants (plain, sparse, medium and dense grass, flowers; SLYNYRD's
  16 px grass: a flat base, about 9 light hooks of 2–3 px, a few mid dashes, dark 1×2 strokes). In
  each: no spot that draws the eye (it repeats as a grid), clusters crossing the edges, a few key
  clusters repeated but never touching edge to edge, little contrast; never a busy texture beside
  another busy one. Mirror a tile for the other sides only under a light from straight above.
- Each terrain is a corner tileset of its own over a base, clear where the base shows (a
  `tilemap(..., { corners })` per terrain), not a tile for each pair of terrains: draw the patch whole,
  3×3 tiles, and cut the edge tiles from it, the inner corners from a hole in it. Each terrain gets
  its own marks: dirt recolored from the grass tile reads as painted grass.
- Organic texture (leaves, grass, stones, rust): 2–3 tiny brush parts + `scatter` with `on`/`clip`.
  Along an edge (grass on a path's border, moss at a rock's foot): `scatter(..., { on: "g", near:
  "<path keys>", within: 3 })`.
- How to draw the grass, the cobbles and flagstones, a wall's stones, with the games' numbers:
  environment §2, §6, §7 (`pxl help "environment 2"`), and `examples/nature/kit.px.js` to include.

## 3. Texture without filler

Don't sprinkle `noise` over walls, floors or plaster to make them "less flat": it reads as random
dots. Every mark needs a cause you could name, where that cause would put it:

- built structure: siding and plank lines, brick or stone courses with offset joints, tile seams;
- weathering: rain streaks under ledges and sills, splash-back grime fading up from the ground,
  rust runs under brackets, paint flaking along the boards, moss creeping up from steps;
- clutter that tells the story: posters, pipes, vents, cracks from a corner.

Build a material in order (Saint11's cards): planks go flat, board lines, staggered joints, a lit
bevel on top and a dark lower edge, grain, then the darkest accents at the joints and nails; rock goes
silhouette, the base shadow, softer layered shadows, highlights, a cool back light, then crumbs; a bush
a dark base, separate light areas, dense shadow, the lumps broken apart, a far layer tinted toward the
sky, specular points, a few blades. A ruin is checked as a black silhouette: its outline itself must
look broken, not just carry cracks; repeat a prop at different levels of damage.

| Material | How it takes light (Saint11, Pixel Joint) |
|---|---|
| Matte (stone, cloth, wood) | no shine spot; wood and rock never pillow-shaded |
| Plastic, varnish, wet | one small sharp highlight (white allowed) |
| Metal, chrome | extreme contrast, the horizon or the sky reflected in it; lights colder and less saturated, darks warmer (`shades` with a negative `hue`) |
| Gems | a long ramp (about 7 tones), facets flat, a lighter bounce inside the shadow |
| Velvet, fur | a lighter rim where it turns away; fur in locks, its highlights short strokes along the lie, strands of the lit tone hanging into the shadow |
| Glass, a drop | a big highlight and a second, smaller and dimmer one inside, low on the opposite side |
| Copper, brass | a white highlight; the darks turn olive |
| Steel | black to white, tinted (blue), never a neutral grey |
| Clay, granite | clay in clusters of 2×2, 4–5 tones; granite's pits as tiny dark and light pairs |
| Fabric | folds parallel where it's pulled tight, radiating from where it bunches |
| Plants | about half the ramp light tones, warm light and cold shadow; detailed borders, a calm inside |

Flat color is fine; a clean wall beats a dotted one. `noise` is for granular materials (gravel,
sand, asphalt, rough stone), sparse. `dither` over a whole area reads as a checkerboard: use it where
two tones meet, between neighbors in a ramp: a 50% checker first, then 25%, then a few lone pixels,
never more dithered than solid; the smaller the art, the less. Where 2–4 colors are all there are
(NES, Game Boy), dither is the texture. A patch reads lighter, higher or nearer by having more of its
light tone, not another tone; the darkest is an accent of a few percent, inside the darks (without
it dirt goes flat and merges with the grass). Brick and stone go in groups at the corners, ledges
and openings, the rest of the wall plain and no outline round each brick; on a rough wall a few
bricks take a lit top or a dark lower edge (with 1 px of mortar, bricks that tile 16 px are 15, 7, 3
or 1 px). Bands of shading that line up show the grid: characters §7. On faces drawn at an angle (3/4), marks follow the
face's slant. Draw a texture's marks first, then shade them with the form: they fade into the
shadow and are sharpest where the light turns (in the Pixel Joint texture thread, an ice cream lost
half its colors and gained volume so). Detail the borders of a mass (foliage, a rock's rim) and keep
its inside calm. Leaves gather in clumps along bands wrapped round the crown, not spread evenly.

## 4. Trees and big organic shapes

Code drawing fails worst here, at a side view's size (lobes read as broccoli, fronds as combs). Start from free art:
CC0 or CC-BY, credited in the file; share-alike (CC-BY-SA) puts its license on everything built with
it, so ask the user first. `sprite("palm", { png: "palm.png", shrink: 2 })`, then fix it:
`rampmap` when tones merged, `relight` when it came out flat (`examples/tropical/trees.px.js`;
characters.md §3 has the steps).

When the trees must take the scene's light and palette, vary by the dozen and shrink with distance
(a roadside going by), draw them in code, but only after studying how such art is built (open
it, don't import it):
- A crown is a dark mass heaped with clumps, the upper ones first: each clump dark under, mid in
  its body, lit on its cap toward the sun, a few bright leaves on it; deep shade between clumps;
  the outline lumpy; the sun's warm rim only where a clump's edge shows against the sky.
- A trunk flares at its foot, twists and splits into branches that go up into the crown.
- A palm's trunk is ringed unevenly (even rings read as a ladder); its fronds are broad and droop,
  lit on top, dark under, their lower edge cut by the leaflets.
- Tall grass is thin blades that curve and lean, dark with their sunward edge lit toward the tip;
  straight upright stalks read as cacti.
(`examples/perspective/race.px.js`: `leafClump`, `tree`, `palmCrown`, `palmTrunk`, `tallGrass`.)

**Top-down**, a crown is one clump stamped 8–12 times (SLYNYRD), which code does well: a round clump
of 16–24 px drawn from one leaf shape and shaded as a sphere (`shade()` a crescent away from the
light, `light()` a disc toward it), variants a ramp step darker and lighter (`base` + `swap`), heaped
dark ones low and away from the light, light ones on top toward it. A crown that won't come clean is
a bad clump. Ball trees in staggered, overlapping rows make a forest. Plant the trunk (cut at the
ground, no roots spreading), tint its ramp toward the foliage's, shade it under the crown, and judge
the tree on its ground tile. Conifers, bushes, dead trees and rocks, with the games' numbers:
environment §3-5; the kit's `pine`, `bush`.

## 5. Water and things that land

A waterfall that ends in a strip of foam over still water looks pasted on: spread churning foam to
the sides and forward, send rings out, and let a wake ride the current downstream. A figure walks
on the ground, not over it: tufts at the edges of paths and at the foot of trees and rocks.

- **A water surface** is two layers (Saint11, an 8-frame loop at 100 ms): on top a net of highlights
  round cells that grow and shrink but never move more than 1 px; under it a layer sliding at one
  speed. Bubbles rise wobbling a pixel, grow, flatten at the surface and pop into a small splash.
- **A thick drip** bulges wide, then taller and thinner over ~6 frames, hangs ~5 creeping a pixel or
  two, falls 10, 22, 41 px a frame as a streak and splats over 5; the thicker, the longer it hangs.
- **A falling leaf** is 2–3 px redrawn every frame through three turns, ~5 px down per 120 ms frame,
  swaying 3 px each way; on water, a ring grows 2 frames, then breaks into dashes and dots over 3.
- **Waves** (SLYNYRD): a chain of ovals, round for short deep waves, wide for shallow ones, the
  crests sharper than the troughs; a strip that wraps going by 2 px a frame, ~24 px a wave over 12
  frames (`scroll()`), what floats riding the crest under it.
- **A waterfall's** water: 1 px bands 6 px apart going down 1 px a frame (6 frames at 100 ms),
  straight and pale at the lip, sagging into a U and darker as they fall, breaking up at the foot,
  drops popping at a wide base in time with them. A river: dots growing into 3–5 short dashes along
  the current and shrinking back, 4 frames at 200 ms, off the grid.
- **Still water** takes the colors of what stands over it (its reflection `flip: "y"`, darker and
  cooler, rippled a pixel or two) and darkens in bands with depth that follow the shore; it must
  read in grey alone. Top-down, a pond at rest is two drawings (the second the first turned or
  flipped) at 500 ms with a 50% mix of them for 300 between (`density` keeps the palette); a hard cut
  suits 8-bit. Wet sand is one flat tone with a 1 px lighter line at its edge; a quay's courses
  darken toward the water, which overlaps the lowest one.
- **Water in an HD-2D diorama** (`examples/hd2d/harbor.px.js`): a floor texture laid a texel to a
  pixel, 8 frames at 100 ms. Under, troughs that swell and ebb (two smooth fields crossfading, so it
  closes); over it, the upper rims of small cells flattened by the view (about 16 x 8 px, scattered: a
  regular net of them read as a honeycomb) as crescents thickening and thinning in place, broken where
  the swell is low; on some crests the sun's glints, white `emit` keys, so `post()` blooms them and
  blurs the far ones into bokeh; the far water (toward the sun) takes most of the glints, the near a
  fifth. A reflection: the ship's faces mirrored under the water, seen through the calm between the
  ripples (a strip of water whose trough texels are clear), lit by the sky only; foam a strip of dashes
  and glints along the waterline.

## 6. Distance (aerial perspective)

- The air between the viewer and far things lowers their contrast and cools them toward the
  horizon's sky, more at their foot, where it is denser. Lay a veil of the horizon color over the
  far things only: their silhouettes (`stamp(n, x, y, { silhouette: "D" })`, the hills' polygons
  in that color) in a layer with `opacity` 0.4–0.5, so the sky and its clouds stay as they are. At
  0.3 the haze is there but doesn't read: dark windows and saturated flags still look near. Then a
  band of the same color down to the horizon at `opacity` ~0.3: the sky there is that color already,
  so only the land shows it, and the far things' feet fade more than their tops. Then a mist lying
  low at the foot of the far hills (flat ellipses, `opacity` 0.4–0.5) that half hides what stands
  there. `PXL describe` shows it worked: the far things' contrast against what is around them drops.
  To check a translucent layer reaches something, build the scene with its opacity at 0 and compare
  the pixels (what it doesn't change, it doesn't reach); a region it seems to miss may just be
  hidden by what is in front. Opacity makes new colors outside the palette: say so.
- Detail far things before veiling them (a hill with woods, fields and a road reads as a place; a
  flat shape stays flat under any haze), and keep them visible: a castle hidden behind the
  foreground's tents is wasted; open a gap in the foreground for it.
- Farther planes also take less saturation and fewer colors (Saint11: a sky in 2, the far
  background in 3), the near props the most saturated and contrasted. Indoors too: a muted room, a
  saturated thing in it.
- Ranges in palette steps rather than a veil: each farther range lighter and nearer the sky's color,
  with less detail (the far one plain in the haze, the near one dark with the forest's crowns on
  it). A range whose strip ends sharp reads as a cutout: let each run out of the picture, or come
  down to the sea or the plain at a headland (`examples/perspective/race.px.js`: `range`). A range is
  its silhouette in one mid value, ridges branching down from each peak, each lit on one side and
  dark on the other, the snow last: 4 tones.
- Texture shrinks with distance (SLYNYRD's landscapes): near grass in 1 px streaks several px tall,
  the next plane in 1–2 px clusters, then none, each plane's marks in the next one's tones; the
  ground's bands taller toward us (4, 6, 11, 61 px). Only the nearest plane takes the darkest tone; a
  farther copy of a building drops its darkest tone and its highlight.
- Far things turn toward the color of the light behind them (a forest lit from its far edge warms
  into the distance). In space or a dungeon the far planes go darker, toward black.
- A sky's bands meet by whole rows of the next tone at shrinking gaps (a band, rows 2 apart, then
  1), not by a checker: `grad(x, y, w, h, "abc", "v", 0.5, "lines")`.

## 7. True perspective (vanishing points)

- A road, rails, a corridor, a square seen from the ground: lay everything in meters and project it
  with `perspective()` (reference: Perspective). The ground is a `plane()`: each pixel gets the color
  of the ground point it sees, so stripes and rows run to the vanishing point by themselves. Long thin
  lines (joints, rails, wires) draw better as `line`s between two `ground()` points than per pixel.
- A road that bends: `perspective({ ..., bend })`, its curvature in 1/m (a point z m ahead sits
  bend·z²/2 to the side). Lay everything in meters along the road and across it as if it were
  straight; the camera bends it, the ground, the things on it and their shadows alike. A bend that
  changes as you go is a new camera each frame, and the heading turns with it: the far things
  (the sun, the ranges) slide across by `focal · heading` px (`examples/perspective/race.px.js`).
- Things on the ground stand at `ground(x, z)`, sized by `scale(z, x)` (and `up` when tilted); poles, posts and fences are a
  loop over z. A figure walking into the distance changes size only at each step's contact, and under
  ~15 px takes a hand-drawn sprite for its size (`fit`): drawn by code that small, it is a blob.
  A vehicle overtaken: far, its hand-drawn sprite from behind picked by size; near and off to one
  side, where its flank shows, draw the whole of it in perspective (side, top, back) instead. A side
  glued onto the sprite from behind reads as two pictures. Pillars and wing end plates in the body's
  color: a black frame reads as a hole through the car.
- Props on the ground (plants, stakes, rocks, benches): build each once as parts in meters with the
  `solid` global, sticks (trunk, arm, twig, post), blobs (crown, boulder), boxes, cones, and use the
  same parts twice: `solids()` projects and draws them, `shadows()` sweeps them onto the ground away
  from the sun, so the shadow has the thing's shape and stays right as it recedes. Near ones on a plate with `relight` for the rim; far ones in the haze
  color; under a few px, a simple tuft.
- Something you are inside of or that wraps round itself (a car's dash round the driver, a wheel's
  rim in front of its own spokes, a ship's bridge, a room): `solids()` sorts whole shapes, so it
  draws those in the wrong order. Model it as flat faces in meters with `model()` (faces, strips
  between two lines of points, lofts through sections, boxes, each of a material) and draw it with
  `mesh()`: a depth per pixel, each face toned along its material's ramp by how it lies to the light,
  outlined where a surface ends in front of another. A dozen sections per surface is plenty; paint
  the small parts (dials, vents, buttons, stitching) over it by hand where the camera puts them
  (`examples/perspective/cockpit.px.js`).
- A diorama (HD-2D, as Octopath Traveler and Triangle Strategy): a camera high up through a long lens
  (`pitch` -30 to -50, `fov` 20 to 35), the ground, steps and walls as `model()` boxes whose
  materials are textures (`{ tex: "_cobble" }`, 16 px tiles to the meter), and the characters as
  `sprites` of the same `mesh()` call, upright in the one depth: a wall hides the legs of who walks
  close behind it. From that high a wall hides only what is near it. Pick the camera by px to the
  meter where it looks, so a texel and a sprite's pixel come out the same size:
  `perspective({ w, h, pitch, fov, ppm })` (its `z`, `dist`, `floor`, `wall`, `aim()`). The look is
  the camera's: `sizes: { plaza_hd: 4 }` on the scene draws it four times as big with `post()` (only
  there, in the art's px), a band of depth in focus and the rest blurred, haze far off, a bloom,
  darker corners; the small one is what's checked. And light in
  the world on `mesh()`: a warm `sun` low and a little behind (its shadows fall toward us), a cool
  `sky`, `lamps` with `emit` on their glass, `bump("hybrid")` on the sprites so they take it
  (`examples/hd2d/plaza.px.js`). Without a sun, `shadows: true` still grounds blocks in a palette-lit
  diorama: what stands between a ramp face and `light` puts it a step down its ramp. Lay the floor's
  texture a texel to a pixel where the camera looks
  (`texel: "screen"`, the camera's `floor` or `wall` by the face): at a 16-to-the-meter texel the
  camera squashes it, and blades drawn upright come out lying down. What stands on the ground and is smaller than a person (a
  headstone, a rock) is a sprite drawn at the scene's scale, its top in the sun and its front in the
  shade when the sun is behind; drawn as a textured box it comes out blurred into the stone round it
  (`examples/hd2d/graveyard.px.js`). A box drawn in meters at the HD picture's own pixel (a fence)
  reads as a 3D render among the sprites: at the sizes its ramp materials go in blocks of a sprite's
  pixel by themselves, a tone each, the outline only on the shaded side (`block: k` on a textured one).
- Feet on the model in a diorama: `mesh(..., { stand: true })` sets every sprite whose `at` has no up
  on the face looking up under it (the plaza's step, the hill's top, the pier; `stand: ["deck"]` on those
  materials alone, when a roof or an awning is over the people), instead of heights by hand. `pxl check`
  then warns where a sprite's feet are more than 0.15 m off the face under them: a tuft past the hill's
  round corner in the air. What flies or hangs says `air: true` (gulls, leaves, a lantern on a rope).
- Hiding a thing behind a wall in a diorama: from a camera tilted `pitch` down, a wall `h` m tall
  hides what is `d` m behind it only below `h - d * tan(pitch)`: at 38 degrees a 1.4 m wall didn't
  hide a ball 0.4 m behind it at 1.2 m; at 1.7 m and 0.2 m behind it does. Its light still shows on the
  wall's top as it passes. Frame the action on the picture's middle row (the camera's `z`): at
  480x270 the clearing's actors sat in the top third over empty grass; 320x180, three times as big
  (`pixel: 3`), put them in the middle at the same scale.
- A GIF of a scene with `post()`'s grain: a grain that changes each frame changes every pixel, and the
  clearing's 100 frames went from 2.5 MB to 13; `grain: { animated: false }` keeps the texture.
- Light, holes and see-through things in a diorama (`mesh()`). What gives light is a sprite with
  `effect("emit")` on it (a lantern's glass, a crystal, embers): its pixels are drawn as they are,
  whatever the sun, a lamp at their middle lights what is round it (`light: { r, strength }` on the
  sprite: 3 m, 1 by default; a crystal a hand high needed strength 5 to show on dark grass, its light
  coming in low), and `post()`'s bloom takes it however dark the scene. Something dissolving (a
  figure teleported, a wall crumbling under a spell) is cut, not faded: a sprite with the dissolve
  effect, a face with `dissolve` on its material: its holes show what is behind and let the sun
  through, its shadow has them too. Smoke, an aura, energy: `blend` on the sprite, `"alpha"` laid
  over what is behind by its alpha (lit like the rest), `"add"` or `"screen"` for light; drawn after
  everything solid, the farthest first, hidden by what stands in front of it, hiding nothing. The
  policy: a blended sprite throws no shadow, sun or contact (smoke and light don't; what should is
  drawn solid; thick smoke a faint one, `veil: 0.3`), and doesn't light anything unless it has `emit`
  on it (two lanterns on one sprite: `light: { each: true }`, a lamp for each). Draw smoke in 2-3 alpha levels
  in clusters, as its tones would be (50%, 70%, 85%), not as a smooth fade.
- Matching a reference's camera (the harbor, after an Octopath Traveler II screenshot): measure it.
  The tilt from foreshortening: a floor's plank width across against along (the sine of the pitch), a
  crate's top against its front (the tangent), a deck's depth against its length; three readings gave
  17-26 degrees, taken as 22 (`pxl study` read the same picture as a camera tilted up). The lens from a
  receding edge's slant toward the vanishing point (30 degrees fitted). The scale in figure heights:
  the frame 20 figures wide, the hull 12.5, its rail 2.3 over the water; then the px to the meter that
  gives the same framing round 34 px figures (17, not the graveyard's 24), every texel at 1/ppm. Past
  the frame's top the water is out of the picture (here 27 m behind the ship): a far landmark is a
  miniature placed nearer, hazed.
- A ship in a diorama: the hull lofted through ~30 sections (pointed bow, square stern, wider at the
  middle than at the waterline, drawn in at the rail), the castles prisms on its top's plan, the rails
  faces with clear texels (balusters, a balustrade), lanterns as sprites; it bobs as one (a roll of 0.5
  degrees and a heave of 5 cm over 4.8 s, its sails, lines and people aboard with it). Sails sewn of
  panels, each piece one of four tones by the light the sun behind sends through it (the belly facing
  us warm off-white, its turned edges a cool grey), a seam a step darker every 0.6 m, a bolt rope, reef
  points, a patch; toned by the light on their front alone, backlit sails came out one flat grey.
  Furled, a lumpy roll lashed every 0.6 m. Yards braced 45 degrees show a sail's face; square to the
  camera they hang edge on, slivers.
- Wood at the sprites' scale: a deck laid whole on its face (`anchor: "face"`, one texture the size of
  the pier, so it doesn't repeat and wear can follow where feet go), each plank its own tone of four,
  the grain in broken runs of 5-6 px a step darker (single speckles read as noise), a knot in one plank
  in nine, nail heads over the joists, joints staggered; the board ends along its front as end grain; a
  hull's strakes over a line of tar, algae climbing from the waterline in streaks; a rowboat clinker,
  a shadow line under each strake's lip.
- A story in a diorama (the graveyard's visit): `route()` walks its legs and holds by name, each leg
  facing its way, at the walk's own pace by its way (`pace: (dir) => ...`, from `gait()`'s `pace` over
  the walk's frames at the scene's px to the meter; slower or faster, the feet slide), the feet on its
  `ground` (each step, a path) or the mesh's `stand`; time what hangs on a hold by `start("talk")`,
  never by summing frames. In a flat scene (a top-down map), `route({ px: true, pace: travelerFigure.pace })`:
  points on the picture, up it is `n`, `R(f).at` the px to `c.stamp` it at from a function in the
  layer a shade layer is `of`, so its shadow comes with it. `turnToward()` turns the other figure to whoever speaks, a direction every
  two frames. Stand a figure beside what it looks at, not in front of it: from above and in front its
  body hides a headstone it faces, and kneeling a step too close its head meets the stone. Clear what
  stands in its way (`near()`: no tree within a meter of its walk). Start the loop with the figure
  just past the picture's edge, the wait that rounds it off after it has gone: a GIF that opens on
  seconds of nothing loses whoever is watching. A thing laid down (a rose at the grave) appears where
  the hand reaches the ground, out of the stone's shadow. Dialogue by `bubble()`, as HD-2D games draw
  it (Triangle Strategy), its look your sprites: parchment with cut corners, fibers, darker toward its
  edges, a light line inside a thin brown outline (a 9-slice), the name over a rule from a small
  diamond, the words in a 5x7 font, a short tail to the speaker, a mark that more is coming, bobbing a
  pixel and blinking off as a game's prompt waiting for a button does (an anim): `examples/hd2d/dialog.px.js`,
  to include, its `PARCHMENT` the options; drawn after `post()`,
  so it stays sharp, in pixels finer than the art's (`unit: 0.75`). A loop that long checked one frame in 24: `check: { every: 24 }` (no rule runs on it but the frames building: fewer keep the tests fast).
- The ground and what grows and lies on it (grass, trees, bushes, rocks, walls, paths, tufts,
  flowers), as 16-bit games draw them: the environment guide (`pxl help "environment"`, by section)
  and its kit, `examples/nature/kit.px.js`, to include.
- Two-point: turn the camera (`yaw`). Whatever is laid on the world's x and z axes then runs to
  `vanish(0)` and `vanish(90)`, often both off the picture; verticals stay vertical. A box's faces:
  each is lit or in shade by which way it faces the sun. People walking in such a scene: pose a body
  in meters (feet, knees by two-bone IK, arms against the legs) and project it, rather than drawing
  sprites per direction (`examples/perspective/park.px.js`).
- Three-point: tilt the camera (`pitch`). Looking up (a worm's-eye view), put the horizon low in the
  picture yourself (`horizon` near the bottom: pitch keeps it on that row and looks above it), and
  every upright leans in toward `vertical()` above it: trunks, poles, a tower; looking
  down, they spread toward a point below. A moderate tilt (15-20°) shows it without warping
  everything; the uprights near the picture's edges show it most, so put tall things there.
- Mountains, hills, a volcano: `terrain()` with a height in meters, ray-marched through the same
  camera, so its silhouette, its ravines and what stands on it all agree. Build the shape as an
  old range first and the peak on it (a lone smooth cone reads as a drawing, not a mountain), then
  cut ridges and ravines that only lower it (`bound` stays a true upper bound). Things on it stand at
  `ground(x, z, height(x, z))`; flows go down the steepest way, step by step.
- Anything far off sits on a direction, not a point: the sun at `toward(sunDir)`, a sky colored by
  `ray(col, row)` (its height above the horizon and its angle from the sun). Things moving the same
  way (meteors, birds in a flock) run along parallel lines, which meet at `toward(theirDirection)`.
- Creatures in perspective: the big ones near (a tyrannosaur, a horse) as a profile in meters, their
  top and bottom lines from tail to snout, projected and painted in slices across, the jaw its own
  hinged piece, legs posed in 3D and painted round with `capsule`; round tubes and cones read as a fish with legs, and a head built
  as a cone tapering to a point is a fish's. Between open jaws is air: what's behind shows through. The
  small ones (pigeons, a flock overhead) drawn by hand in a few poses and sizes, placed and picked
  by the camera: at 10-20 px a 3D body is a few lumps, and wings seen from below in 3D go edge-on.
- Fire on what burns (trees, logs, grass): `flame()` at points along it, sized by `scale` there, all
  leaning the same way with one wind, each with its own `seed`; the light it throws is a warm key on
  the near faces, not a glow over everything (`examples/perspective/extinction.px.js`).

## 8. Slow motion in a short loop (clouds, mist, drifting things)

- Scrolling a strip that wraps makes the loop as long as its width over the speed: slow clouds
  then need half a minute or more. Instead give each cloud a life of one loop: it forms, drifts in
  one piece (a whole pixel at even intervals: `Math.floor(drift * age)`, `drift` px a loop and a
  divisor of its frames, `age` the cloud's phase 0-1; `clouds()` does this), and thins away where it started; start each at its own moment so only one or two are
  forming or fading at a time. Make the loop a multiple of the scene's other loops.
- Parts of one scene loop at their own lengths, each a divisor of the loop (4, 8, 16 frames: the
  GIF stays short), and start at different frames (`delay`, `rdelay`): loops that all restart
  together show the seam. A flag waves as a `warp` whose phase is the frame over 5: the crest runs
  pole to tip, its fold shadow riding just behind it, the swing growing toward the tip. Stars: only
  some twinkle, out of step, a 4-frame cycle at 120 ms (a step of shade, or a dot growing to a plus),
  or rarely, 3, 5, 7, 5, 3 px at 50 ms then 1.6–2 s at rest; a shooting star 6 frames at 50 ms, ~6 px
  a frame, growing to 15 px and shrinking.
- **Wind** (SLYNYRD): a flag's crests 12 px apart going 2 px a frame (a 6-frame loop), the waves
  growing toward the free end, in 2 tones; its strength is the pose and the frames (drooping 8, half
  raised 6, straight out 4). A tree's clumps of leaves each on their own, moving up-right 1, down 1,
  left 1, one after another, one wave a loop at 200 ms a drawing; rustling, each leaf in 2–4 places,
  a dip handed to the next leaf downwind a frame later. A gust's swirl: a 1 px line over 10 frames
  at 80 ms (dot, dash, longer dash, a curve, a loop, a hook, dash, dot, ~25 px). Dust kicked up: one
  flat color from the ground, a teardrop leaning downwind, a comma, bits, dots, 16 frames at 80 ms.
- Thin, a cloud is a long pale wisp in a tone close to the sky's (puffs losing their height faster
  than their length, a flat base joining them), not a row of small blobs. A heaped cloud takes its
  light from the top down as it gains body (a white cap thickening row by row, then a gray
  underside); a thin streak can take its lit underside column by column. Examples:
  `examples/sunset/sunset.px.js` (streaks at sunset), `examples/rig/tournament.px.js` (daylight cumulus).

## 9. Closing a loop

- Something crossing the picture: let it cover more than the picture's width (plus its own length) in
  one loop (`c.cross(x0, { span: L, per: -L, from: -L / 2 })` from the picture's middle, L = v times the loop's length; `c.moved(per)` for how far a plane has gone): it leaves on one side and
  comes back on the other while it can't be seen. Or end its way behind something (a hedge, a cart, a
  trunk) and start it behind something else.
- Particles (embers, ash, rain): each goes round the picture a whole number of times in the loop.
- Anything picked by where it is along a way that goes by (`hash(p)` of a crown, a patch, a stone):
  take `p` modulo the distance gone in the loop, or the first frame picks other ones than the last.
  Every flutter (`sin(f · k)`) a whole number of cycles in the loop: `sin(2π · f / frames · n)`.
- A speed that changes in the loop (a burst, a stop at a light): write the speed as a profile in
  time (steady, eased up, held, eased down; a half-cosine ramp has an integral in closed form) and
  move everything by its integral, the distance gone. Set the steady speed so that integral over the
  loop is the loop's distance and the loop still closes. What is keyed to the way (things along it,
  a rival's place, a backfire as a gap closes) reads the distance, not the time; far things move
  only as the heading turns, so they don't speed up (`examples/perspective/race.px.js`:
  `travelled()`).
- A lane of clouds: each moves one slot along in the loop while turning into the next one's shape
  (`clouds()`, with `empty` slots for a sky where they form and thin away); smoke and steam rising
  from a point: `plume()`; soot or mist that comes and goes:
  thin it by `0.5 - 0.5·cos(2π·t)`, fading to nothing at the edge of the part that moves.
- Gaits: a stride a whole number of frames, and the loop a multiple of every stride in it.

## 10. Parallax (planes going by at their own speeds)

- Each plane is a sprite drawn once as a strip with `wrap: "x"`, going by with
  `scroll(name, y, per)` (in an anim, or a scene that stamps one: in a still scene it stands still): `per` px a loop, the nearer the more, each a whole number of the strip's
  widths so the last frame runs into the first. A strip at least as wide as the picture doesn't show
  its repeat; a wide one (1536 px) costs nothing per frame. Noise on a strip: `seamless()` makes it
  close over the strip's width. `describe` sees a scrolled strip as one object shifting across, not as
  motion: look at the planes with `shot --frames`.
- **Every plane goes a whole number of px a frame** (1, 2, 3, 4, 6, 8...), the same step every
  frame: 1.67 px a frame steps 2, 2, 1 and the plane judders. Slower than 1 px a frame, 1 px every 2
  (or 3, 4) frames. So `per` = px a frame × the loop's frames, and each strip is as wide as a
  number that divides its `per`: a loop of 96 or 192 frames, with many divisors, gives the most
  speeds (the train: 192 frames, strips of 384, 768 and 1536 px at 2, 4 and 8 px a frame, the grass
  at 10). A plane far off goes 1 px a frame, or slower; anything inside a plane that moves on its own
  (a car's wheels) loops in a divisor of the loop. `pxl check` warns at a plane that doesn't, with
  an even `per`; `pxl study` says which planes of a clip go unevenly.
- The loop's length comes from the slowest plane that must go round once. Anything slower (a ridge on
  the horizon, which should hardly move): drift it a little over the loop (the train's ridge: 32 px in 12 s) while crossfading its
  outline into itself one step on, as the cloud slots do.
- What the camera follows stands still: its wheels turn a whole number of times a loop (about the
  distance gone by over their circumference), and its smoke or dust is left behind at the speed of
  the ground beside it, keeping a little of its own at first: `plume()` with `wind` the ground's
  speed backward in px a frame (`-per / frames` of the plane beside it) and an `inertia`.
- Seen from inside something moving (a car's cockpit, a train's window): draw the world through the
  camera, then the inside as a sprite whose glass is left empty (`mesh()` for a cockpit modelled in
  meters). Each mirror is another camera looking back, in a small anim stamped where its glass is:
  what is behind at its distance behind, x mirrored so left stays left, and a slice of the car itself
  along the glass's inner edge in a side mirror (`examples/perspective/race.px.js`). The far things
  move only as the heading turns (`focal · heading` px), the nearer ridge a little more. Speed
  lines fanning from the vanishing point over a scene drawn as it looks read as rain: show a burst
  of speed by the motion itself, and by the gauges.
- Mist or haze at the foot of each far plane keeps them apart; the plane nearest the eye goes by too
  fast for detail: streaks along the motion (`examples/parallax/train.px.js`).

## 11. Shadows and light

- Cast shadows: a `shade: true` layer `of` the layer things stand in, `cast: [kx, ky]` (each laid
  flat from its base, silhouetted): a pixel h px up lands h × (kx, ky) away. One sun, one `cast` for
  everything; a stamp's own `shadow` (`false`: none). What a function in that layer stamps casts too
  (a `route()`'s walker, an anim stamped by the frame). Props drawn in 3D under `look3d()`'s light
  on a map seen from above: write the sun once there, and take it everywhere, `world: { scale,
  view: "top", light: "sun" }` (the lit side read off it) and `cast: "sun"` (h px up lands
  h × [−x / z, y / z] away); the nature kit's `spruce()` takes it as `light`. The shade layer goes where the shadow is drawn:
  under what stands, or lower in the list (a firelight, a bridge between). `ky` says where the sun is in depth: negative, the shadows fall back (the
  sun in front of us: the fronts we see are lit), positive, toward us (backlit).
  In true perspective, things built of `solid` shapes cast with `shadows()` instead: each shape
  swept away from the sun in meters, so the shadow foreshortens with the ground.
- Effects that give light or take none (sparks, smears, glows, flames drawn as shapes) go on a layer
  with `unlit: true`: describe doesn't read a lit side off them (a white smear with a gray rim
  reads as a thing lit from that side).
- A shadow is drawn on the ground before what stands in front of it: for things behind a fence or a
  wall, give their shadows their own shade layer between the ground and those things, or the shadow
  darkens the fence. Their shadows are mostly hidden there, as they should be; a sun low enough (a
  more negative `ky`) lays them back onto ground that shows. On a dithered ground (grass) one step
  of shade is lost in the dither: `shade: 2`.
- From a point light near the ground (a lamp, a fire, a mirror ball), each shadow points away from
  the light and is longer the lower and nearer the light: `[kx, ky] = (base − light's ground point) /
  light height`, capped at length 1: `cast: { from: [x, y, h] }` on the stamp. A sun low on the
  horizon at (x, y) fans them out from it: `{ from: [x, y], len }`. Keep other lamps out of where a
  shadow falls: they fill it.
- The ground ramp needs a tone below its darkest for shadows to show after lighting (`"0EGgl"`, then
  `shade: 2`): a shade can't step below a ramp's darkest key, so ground already there under a
  shadow doesn't change.
- Shadows in one `shade` layer are a union: a figure standing in a tree's shadow casts none of its
  own there and looks like it floats. Give what stands a contact shadow in a second `shade` layer,
  its silhouette squashed under its base (a second shade layer `of` the same, `cast: [0.18, 0.12]`,
  `except` the tall ones; or a flat ellipse at the feet): dark where it touches the ground, inside the
  bigger shadow too.
- A base that isn't level (a tent seen at an angle, its hem higher at the back; a crate on a slope)
  casts from each column's own lowest pixel: `castBase: "column"`. From the pivot's row, what hangs
  below it would cast toward the sun.
- **A key belongs to one ramp.** In two ramps, `shade` can step it along the wrong one: a grass
  shadow turned into glowing potion green. Where ramps branch at a key (two go on from it to
  different keys), `pxl check` warns when a step goes through it. Where one ramp ends at a key and
  another goes on from it (a deliberate shadow ramp under a grass ramp looks the same as a potion ramp
  by mistake), nothing can tell: `pxl steps <file> <scene> --at x,y` on a pixel that came out wrong
  names the ramps each shade step went along (`G→E along "EGgl", E→p along "PpE"`).
- Night scenes: `lighting()` with a cold ambient and lamps on the props (lighting.md). Then check the
  figures in `PXL describe`: `stands out: brightness 1 vs 1 around` means as dark as the ground,
  read only by the outline. Give them light (a lamp, a mirror ball), a rim on the side facing the
  moon, or an `emit` key.
- A beam (a lighthouse's, a searchlight's, headlights) is drawn in the picture's own projection: in a
  scene drawn flat on, it sweeps across the picture, shortening and widening as it turns toward us;
  swung out on a diagonal it brings a perspective nothing else in the picture has. It runs out of
  the picture or fades into the haze or the rain, never ending in mid-air or short of the edge.
- The weather sets a cast shadow's edge: under a clear sky crisp and dark, in haze or overcast soft
  and faint, in space long and razor sharp.
- Flat art gets its volume back with `relight()`.

## 12. One-shot effects (explosions, sparks, hits)

From Saint11's effect cards, read frame by frame (80 ms frames unless said); each one an `anim`
played once, stamped where it happens. An effect often outlives the pose that made it, and one thing
happens after another, never all at once.

- **Explosion:** a dark disc 1 frame (the flash's size and place), a white disc 1, a sharp blast 1,
  fire with sparks 1, the fire breaking into rings 2–3 as smoke appears (a dark cool purple, not
  grey), the smoke breaking into scattered pixels over 4–5, then an empty hold (~600 ms). The flash
  may hold 3 frames with light lines; against a wall the blast hugs wall and floor; in a chain each
  starts a frame after the last, at another size. A puff of smoke is at its largest the frame after
  the flash, splits into 4–5 that hollow (round, a crescent, dots) as they drift up, ~10 frames.
  Seen from above in a shooter (SLYNYRD, 60 ms frames): circles thinning into rings blocked in a
  `ref: true` layer (`ring()`), then blobs over them, white 27 px, cream with an orange rim 36, yellow
  with cracks 43, a grey shockwave ring 46, orange blobs, brown, warm grey smoke rising; the ship hit
  flashing cream on alternate frames first.
- **Magic:** light: a dark disc, a white one as big with a colored rim, hollowing into two crescents,
  then tongues, bits, sparks drifting 600 ms and more; round shapes, no smoke; drawn on threes (210 ms
  a drawing). Dark: black 1 frame, white 1, bolts with blank frames between, then a splat in a
  complementary color and smoke fading in spirals over ~10.
- **Electricity:** a charge of 2 frames (a small arc, a glow at the source), a contrast frame, the
  bolt 3 frames, each a new shape (thick cyan with a burst at the source, thin white, thin cyan),
  then its pieces curl round the electrodes 4–5 frames and fade; sparks last 3.
- **Particles and debris** start pointed and joined, spread into ribbons 2–3 frames, break into bits
  that fall with gravity, and are lone pixels only at the end (~8 frames); a jet starts as a straight
  cone, bends, then falls. A falling drop: a dot, a streak from where it was to where it is, a dot
  where it lands.
- **Breaking:** the impact frame shows the thing still whole, with flash rays; most pieces are gone in
  2–3 frames and one is followed to rest: a steady sideways speed in the air, rising steps shrinking
  to the top and falling ones growing, one small bounce, then sliding 3, 2, 1, 0 px. Heavy pieces arc
  and bounce, light ones zig-zag, fast ones go straight. It falls in 1 frame; dust and sparks run 4+.
- **Smears** (motion blur): 2 frames, the first full and light, the second thinner and darker or in
  another hue (a yellow crescent, then a magenta one), then a 1-frame sliver; a wedge, a crescent, a
  line along the edge, ghost copies. A dashing body leaves a dark trail back to where it was; a ball
  crossing in one frame is a capsule spanning the gap (`stamp`'s `smear`; a blade's, `trail()` of its
  edge, the band it swept, or `arc()`).
- **Smoke** (`smoke()`, `PXL help smoke`): billows in clusters lit on top and shaded beneath, three
  opacities, never a smooth fade; a column of 16-18 billows growing from 4 to 10 px in radius (12
  smaller ones read as beads on a string, not a column); a puff of 12 bursting 14 px; a bank of 7-8
  churning, thin at the ends; a ring of 14 spreading flat on the ground. On a dark ground give the
  shaded key a mid grey: a dark one reads as a gap and the puff splits in two bands. In a diorama or
  a perspective scene, `smoke()` and `plume()` take its camera: `{ view, at: [x, z, up] }`, the sizes
  in meters, each billow as far as it is.
- **Auras** (`effect("aura")`): 3-4 px round a 26 px figure in three keys, the lightest next to it,
  flicker 0.6 on cells of 3.5 px (at 2 px the edge turned to speckle).
- **What eats a thing** (the dissolve's `look`): a burn browns and blackens a band ahead of its
  orange edge, the edge going red then grey as it goes, ash rising; acid greens and greys the
  material ahead of a green edge, drips falling; frost pales it blue behind a white crystal edge;
  magic is gold with sparkles. Without a theme, `neutral`: a thin ring of the thing's own lightest
  tone, half clear. Give the edge's keys over the progress for a color that changes as it goes.
- **A spell in a scene** (`examples/hd2d/clearing.px.js`): a `spell()` of the kit in the file's own
  fire (`ball`, `trail: { ghosts }`, `impact: { anim }`), from the hand of the caster's `mesh()` sprite
  (`id: "hero"`), its burn on the target `fx: S.hit(c.t, ...)`; its phases (charge 600 ms,
  cast 200, flight 600, impact 200, the target burning 2300, back 600, in 5 s); every loop in it a
  divisor of the scene's (20 fps: the idle's 1000 ms, the fire's 500, the wind's 2500 into 5000: at
  12.5 fps with the 250 ms idle the loops met only after 60 s). The ball a 4 px disc of
  `effect("energy")` in 4 fire tones (scale 1.6: at 4 its noise was one band) with a 1 px `distort`;
  its trail three of it at 50 ms steps back, fainter; its light the spell's lamps (`reach: 120, power: 3.75`: 2.5 m, 3). The aura 3
  px in 3 tones, flicker 0.6 on 3.5 px cells, at 0.2-0.6 opacity (at 0.85 it hid the figure). A
  target catching fire: the burn spreading from where it was hit over 2.4 s, flames 10 px from a third
  of the front, a smoke column of 18 billows growing 3 to 10 px fading in over the first 15% and out
  over the last 35%, the target's light `{ r: 3, strength: 2.5 }` flickering with its flames.
- **A spell kit** (`spell()`, `examples/spells.px.js`): one call a whole cast, `cast(spell("ice", 2,
  { from, to, ground }))`, the nine elements at three tiers on a 4 s loop at 20 fps (the third tier
  lasts 3.3 s). How each is made, and how to make one: "Designing an element", below; its variants
  and views (`examples/spell_variants.px.js`): "Variants and views", below that.
- **Shader effects** (`effect()`, `PXL help effect`): a teleport or a death as a dissolve over 1 s
  (12 frames), holes in blobs about a quarter of the figure wide and 2 rings, the first white-yellow;
  a hit's poison or frost as a `tint` of 0.3-0.5 then `dither` back to the palette; a ghost or heat
  shimmer as `distort` of 1 px, `scale` 4 and more (at 3 the outline breaks into loose pixels).
- **Shine:** a rest of 0.6–0.8 s, then a sweep in 4 frames: a corner glint, a short slanted band, a
  long band, the far corner (`clip` the item, a slanted `poly`); on a ring a crescent following the
  curve; a gem lights facet by facet until it is all lit 1 frame, then dark at once; ice, flat white
  shards sliding 4 frames, resting ten times as long. A moving glint may be white for 1–2 frames.
- **Hits:** on what doesn't break, a dark ellipse, a white 4-point star, a white disk, then a cyan and
  a yellow crescent, no shrapnel; a shield's edge stays lit ~4 frames after its white flash; armor
  flashes white and a white crescent sweeps across it over 4. A small enemy squashes and flashes
  (`recolor({ "*": "w" })`); frame counts for hits and deaths: `PXL help "characters 12"`. Without a
  new color: the enemy hit takes the player's palette for ~160 ms (`base` + `swap`), or a red tint
  alternating with its inverse. A heavy blow shakes the whole picture 1 px on its impact frame.
- **Bullets:** a warm bright core with cool edges, stretched along its way; a fast one moves more than
  its length a frame, its impact shrinking to a third each frame (152, 55, 21, 11, 7 px); slow ones
  blink bright and dark every frame; a hitscan's flash darkens the scene and lights the shooter, the
  impact comes the next frame, debris ~6. An enemy's shots: bright, in its own color, with an outline
  nothing else has (white, or bright inside and dark outside), in a hue the scene doesn't use,
  pulsing or spinning over 2–4 frames at 50 ms; a flare as they leave is the tell.
- **Fire:** one wave lives ~10 frames: a thin bright line at the base, swelling, rising wavy, a curled
  tongue that detaches and breaks into 2–3 bits near the top, reddening and gone; slow at the base,
  fastest midway; a new wave every 2–3 frames, 3–4 at once. `flame()` flickers its tongues in place; a
  big close fire wants waves that travel up. A torch's base keeps its volume as its shape changes. A
  small fire: 6 drawings at 100 ms, its white core changing every 50.
- **Glitch:** a different mix every frame with nearly clean frames between; a noise frame, a blank one
  and a white one 1 frame each; strips shifted a few px, colors bled 1 px to the right.
- **Loops that warn** (hazards): spikes peek out 5 frames (the tell), are up 4 and go back in 3 steps;
  a laser aims a thin line 4 frames and fires 2; a flame jet burns bright 2 and smokes ~6; a saw spins
  as a blurred disc, its art never rotated. A thruster's 5-frame loop at 60 ms: a round burst
  (lighting the ship's rear), a long thin flame, the mass thrown back, wider and darker, smallest.

### Designing an element

An element of `spell()` is a recipe (`ELEMENTS` in `src/core/spells.ts`); a new one is an object
given in place of the name, best started from the nearest one with `like`, then its own over it:

```js
const POISON = { like: "water", keys: ["#f0ffc0", "#b0e040", "#609020", "#2a4010"],
  particles: { rate: 30, life: [300, 600], speed: [2, 8], angle: -90, spread: 40, gravity: [0, -15], keys: ["#b0e040", "#609020"] },
  impact: { shape: "splash", smoke: ["#a0c060", "#6a8a40", "#3a5020"] }, big: "sphere", mark: ["#609020", "#2a4010"] }
anim("poison_3", { w: 112, h: 80, frames: 80, fps: 20 }, stamp("_place", 0, 0),
  cast(spell(POISON, 3, { from: [23, 51], to: [89, 52], ground: 64 })), lighting({ ambient: 0.55 }))
```

Decide five things, in this order:

1. **Its ramp** (`keys`): 4 tones, the core first. The core is near white with the element's hue in
   it (fire `#fff4c0`, ice `#ffffff`, heal `#ffffff`); then the color it is known by; then a deeper
   one; the last the darkest, its rim, what shows it against the sky. Shift the hue as it darkens
   (fire yellow, orange, red, brown-red; ice white, cyan, blue, navy), never the same hue darker. A
   dark element turns it round: a pale violet core in a near-black ball, and its flash is black
   (`flash: "#000000"`). Its light (`light`) is the second key unless said (earth's is a warm dust,
   dark's its violet: a black lamp lights nothing).
2. **Its noise** (`ball: { r, scale, speed }`): the radius at tier 1 (2-3 px), the noise's cell in px
   and how fast it churns. Small cells churning fast read as flame or air (fire 1.6 and 2, wind 1.2
   and 4); big slow ones as matter (ice 2.4 and 1, earth 3 and 0.3: a rock barely turns). `ball:
   false` and `bolt: true` for something that is there at once (lightning: kinks every 7 px, 6 px
   either way, a fork at three kinks in ten in the second key; a new bolt every 50 ms).
3. **How its particles behave** (`particles`, an `emitter()`'s options, `keys` young to old): what
   the element does in the air. Fire rises (`angle: -90`, `gravity: [0, -40]`); ice and water drop
   (`gravity` 30 and 120: ice crystals hang, water falls); earth crumbles, few of them (15 a second,
   gravity 80); wind streams back fast (20-40 px/s at 180 degrees, spread 20); lightning crackles
   (life 80-200 ms, all ways); light and dark drift all round (spread 180), heal floats up slowly.
   The rate is per second at tier 1, times the tier's `count`.
4. **How it moves** (`motion: { arc, ease, wave }`, `trail`): heavy things are lobbed high (`arc`
   16 for earth, 14 for water, `ease: "linear"`); a thrown fireball speeds up (`"in"`, `arc` 4); a
   beam of light slows into its target (`"out"`); something alive weaves (`wave`: wind 4 px, dark 2).
   The trail is the ball's width at its head, 160 ms long, or as given (wind's: 260 ms, 3 px to 1).
5. **What it does to what it hits** (`impact.shape`, `big`, `mark`): the impact's shape is what it
   does: `burst` (fire), `shards` (ice), `rays` (light, lightning), `splash` (water), `debris`
   (earth), `swirl` (wind), `implode` (dark: it draws in), `sparkle` (heal: it rises), `ring`; its
   smoke, if any, three keys lit to shaded (steam is pale, dust warm, dark's a violet grey). The
   third tier's centerpiece: `pillar` (a column wider at its foot, its edges licking up: fire, a
   geyser of water), `bolts` (from the top of the picture), `spikes` (ice, rock), `tornado` (wind),
   `sphere` (dark), `beam` (light: straight, its core white), `helix` (heal: two strands winding up,
   sparks riding them); its mark on the ground two keys, the rim first (scorched, frosted, wet, a
   crater; wind leaves none).

Any piece can be the file's own art instead, drawn as it is (never scaled; `examples/hd2d/clearing.px.js`):
`ball: ["_fire_s", "_fire_m", "_fire"]` (anims grown through the charge, `trail: { ghosts: 3 }` copies of
it behind), `impact: { anim }`, `big: { anim }` (a list: one a tier), `matter: { tones }` in its ramp.
`blend: "add"` (or `"screen"`) lays those pieces on what is drawn as light, by their alpha: a glow's
dark rim vanishes into what is under it.

What the tiers do (`TIERS`), each factor an option of `spell()` to change:

| Tier | Size | Particles | Time | Light (reach, power) | Glow | Shake | Drama |
|---|---|---|---|---|---|---|---|
| 1 (fire) | 1 | 1 | 1 | 28 px, 0.9 | 0.4 | 0 | the impact's shape |
| 2 (fira) | 1.5 | 2 | 1.25 | 44 px, 1.2 | 0.7 | 1 px | and a shockwave on the ground |
| 3 (firaga) | 2 | 3 | 1.6 | 72 px, 1.5 | 1 | 2 px | and the centerpiece, a flash, a mark; the impact 1.6 times as long |

The phases at tier 1: charge 400 ms, cast 120, travel 450, impact 250, dissipate 700 (`timing`;
a bolt's travel 160 and not drawn out by the tier). Found while tuning the sheet: a pillar whose whole
column wavered on one noise read as a bolt (a zigzag); edges that lick on their own, wider at the
foot, read as fire and water. Two bolts 3 px wide side by side read as a hose: one 3 px, the others
1 px, with forks. A helix of dots 3 px apart read as dust: unbroken strands. A flash is a tint of 0.35
over 100 ms; with the impact's light at power 2 the picture stayed white three frames (1.5 now).
What a spell draws gives light (`lighting()` leaves it bright in a dusk at ambient 0.55) and its
lamps light the ground round it, so put a `lighting()` item after `cast()`.

### Variants and views

`variant` is another way of the same element and `form` its shape; `view` sees one world from the
side, from above, in isometric or through a camera (`examples/spell_variants.px.js`: the ice and earth
variants, a row for each other element, four spells four ways, all at tier 3 on a 5 s loop).

What the games do with their big spells, as I remember them (described, never copied; the numbers
are the ones tuned here, not measured off their footage):

- **The solid outweighs the target.** Golden Sun drops a glacier or a stone spire bigger than the
  enemies onto them and its Quake Sphere heaves the ground under them; Final Fantasy's Blizzaga
  grows a cluster of crystals round the target and shatters it; Chrono Trigger shuts the target in a
  block of ice that breaks. Here a solid at tier 3 is 1.5 to 2.5 times the target's height (an
  iceberg 11 px of the spell, a boulder 9, a glacier 10, a spire 8, times the tier's size and `form.size`).
- **It arrives fast, holds, cracks, breaks.** A boulder or a glacier falls in 520 ms of the spell's
  time (speeding up, a slow turn of 2.2 radians a second), lands in 220; an iceberg or a spire rises
  in 380 (times the tier's time); it holds `stay` ms (700 to 900), cracks spreading from where it hit
  or from its top over the last 60% of that, then breaks into `debris` pieces (20 to 26) flying out
  at about 70 px a second, falling, lying, gone in 900 ms. Glints fly off ice as it breaks.
- **One after another, never at once.** Pokémon's Rock Slide drops several rocks in turn; here a
  slide's rocks start 110 ms apart, tumble 420 ms and roll 3 px; a chain of lightning jumps 110 ms
  apart; wind's blades leave 90 ms apart and arrive together.
- **The ground answers.** Quake: the picture shaken 3 px for 700 ms while fissures run out 34 px
  (times the size) over 600 ms and rocks thrust up where they pass (Stone Edge's sharp stones round
  the target); a falling boulder or meteor cracks the ground 18 px (times the size) round where it
  lands; frost and scorch stay a while.
- **A falling thing's shadow comes first**, wide and faint, closing on where it lands and darkening
  as it nears; from above (Octopath's high camera, any top-down game) it is off toward the light's
  far side and closes on the rock as it comes down.
- **Light and bloom sell it** (Octopath's HD-2D): what a spell draws gives light and blooms; the
  solids don't: they are matter, lit by the scene and by the spell's lamps.

The spell leaves from the caster's hand: `from: "hero.hand"`, the socket of the figure stamped
before it with `{ id: "hero" }` (the traveler's `tr_cast_e` sets it in every pose), lifted into the
view's world (from the side as deep as the target; from above, in iso and through a camera, `hand`
up, 22 px of the spell by default: a 34 px figure's hand at its thrust, about 1 m). It is read in
each frame, so time the pose to the spell by its phases, `S.ability.frame(c.t, steps)`
(`PXL help abilities`): the wind-up as it starts charging, held while the energy gathers, the thrust
as it is cast, held while it flies, back once it hits. What is born in the ground (an iceberg, a
spire, a quake, a nova) doesn't run there from
the caster's feet: the hand lets it go and the ground glows and stirs at the target until it comes up.

How the views see it: side, x across, y toward us squashed to 0.35, z straight up; top, x and y as
they are, a height foreshortened (half the size at the view's `height`, 240 px up), so a falling rock
grows as it comes down and a pillar is a disc from above; iso 2:1, heights straight up, rings and
marks on the ground iso ellipses; a perspective() camera, meters, the spell's px where it lands.
Rings, marks, shadows and fissures are laid on the ground and seen through the view; columns
(pillars, spikes, waves) stand up in it, discs from above; solids are drawn by the volume method
seen from the view's angle (20 degrees down from the side, 30 in iso turned 45, straight down from
above, the camera's pitch). Found while tuning: a smoke puff drawn over a solid hid it as a glowing
ball (smoke goes first, the solid stands in it); pieces a third of the solid's size read as a second
solid falling apart, an eighth as shards; a frost mark as wide as the iceberg drowned it (0.6 of it,
dithered); a wave of columns in a dither read as a wall (flames: tongues of their own heights, each
narrowing up; water: a steep face, the crest curling over the front 5 px).

## 13. Blend modes leave the palette

A layer with `blend: "multiply" | "screen" | "add" | "overlay"` or `opacity` does color math with
what is below: one deep-blue `rect` at `{ blend: "multiply", opacity: 0.7 }` turns a scene to night.
But every pixel it touches becomes a color nobody picked, and palette swaps in an engine stop
finding them. Try the palette-safe tools first (`shade:`/`light:` layers, `density`, `glow`,
`lighting()`); use blend modes for whole-scene grading or true translucency, and tell the user.
`palettize: true` snaps results back only when the palette already has those tones.

## 14. Checking a scene

- `PXL shot <file> <scene>`: the look, with what changed since the last shot and the warnings on
  it; `--at x,y,w,h` again and again for details side by side, `--frames` for moments of the loop,
  another version as a second name (`old.px.js:scene`) for a before and after, or `--vs HEAD --diff`
  for the last commit above and the changed pixels in red below. Several of the file's own side by
  side, labelled (variants, tiers, views): a scene of `cells(rows, { head, side })`.
- `PXL describe <file> <scene>`: every object's visible ranges, gaps, cover, contrast and motion
  (`--brief` for busy scenes); after an edit, `--diff` lists what moved, was redrawn or recolored.
  Give what you will edit an `id` (a stamp's, `c.as`'s, a `mesh()` sprite's): describe, `--diff` and
  `steps --at` name it by that (else "lantern #2", which another lantern stamped before it renumbers),
  and its random picks follow the id, so moving it keeps its look.
- A small change to what is placed, without reading the file: `PXL inspect <file> <scene>` lists what
  an edit can name (by id) with its box and the operations it takes (`--find stone lantern`: only
  those whose id, asset or the comment above their call or their asset's definition has the words,
  the most first); `--id x` gives one in full (its values and where the file writes each: its call, a
  table it reads, or code; its relation, rules, parts, colors; the siblings a `swap` can turn it to,
  `vendor_n`'s `vendor_s` with its `facing`), `--json` for a program.
  `PXL edit <file> <scene> '{ "op": "move", "target": "toro_e", "by": [-3, 0] }'` writes it where the
  number lives (the table's `[87, 21]`, the stamp's own options; a stamp its relation alone places
  gets x, y in its call, an offset from there), all the edits given or none, then prints
  `describe --diff` by id, the pixels it changed by id, and `check`. It is guarded: an edit changes
  its targets and what is placed by relation to them; anything else changing (a ring in the ground
  drawn from the same table, a thing that reads the same number) refuses it, saying what, and
  `--allow a,b` lets those. An edit that changes nothing in the drawing says so; one that never will
  (a flip of a front or back view drawn symmetric, `z` in a layer sorted by y) is refused, saying
  why. `--dry` prints the source lines it would change (- now, + after) and what would change, and
  writes nothing. Ops: `move`, `set` (an option, a part's parameter), `recolor` (`swap`), `flip` (a
  `turnaround()` sprite is turned to its mirror heading instead, added to its `headings` if new, so
  its lit side stays the sun's), `frame` (or `t`), `relation` (on, beside, along, apart, at; a world3d
  part's around, attach), `swap` (another asset; a part's builder), `as` (a part drawn as
  voxels...), `add`; `scope: "asset"` writes the asset's own options, for every copy.
  `{ "op": "add", "target": "lantern_3", "like": "lantern_1", "beside": ["tea_stall", "left", 2] }`
  stamps a new thing (`target` its new id; `asset`, or `like` an id: its asset and options, and its
  x, y when it is placed the same way) by `beside`, `on` or `at` another stamp, written as a line
  after that one's call, so in its layer; it may change only the new one (its light aside). It
  refuses an id in use, a relation to the ground, a path or a world3d part, and a thing code places.
  What code computes (a stamp a function makes, a number worked out, one call placing several
  things) is refused, saying where it is: change that by hand.
- `PXL check <file>` before handing over: every frame of the loop; its last line says which rules
  ran, and `--readings` shows what the lit-side rule read on each thing when a warning looks wrong.
  Checks and `world` rules cover `scene()`s (and rigs), and an `anim()` given a `world`: what its
  functions paint is seen when they name it, `c.as("bench", (c) => { ... }, { height })`
  (`examples/perspective/park.px.js`); `check: { every: 24 }` on a long one.
- What the layout must keep, said once on the scene so `PXL check` holds it at every frame it checks:
  `expect: [{ beside: ["pot", "campfire", { gap: [2, 6], side: "left" }] }, { before: ["bedroll", "tent"] }]`
  (also `apart`, `inside`, `onGround`; over a loop, `while` and a rule's `frames`), a placement named
  by its stamp's `id` or its asset placed once. A rule broken by an edit: `PXL check --fix` moves the
  placement back by the fewest px (its relation's gap, or s along a path, before its x, y), written
  where its number is (`PXL help expect`; the sunset's camp,
  the island in `topdown.px.js`, the shrine's lanterns and miko).
- A scene built from separate maps (terrain, props): `throw` in the placement loop when a prop lands
  on the wrong ground; it catches the drift before anyone sees it.
- Before handing over, look as a critic: tiles repeating into a visible grid, props floating or on
  the wrong ground, big flat areas with no detail, dither as texture.

## 15. A game's screen

Where a player must find their character and what can hurt it, the picture serves that first
(SLYNYRD, final boss blues, So You Want To Be A Pixel Artist?):

- The ground figures walk on stays quiet: its tones close in value (a floor that works: 0.05 apart in
  lightness; one that hid the hero: 0.15), its own palette in the characters' hues, so the figures
  carry the most contrast, and the near-black outline, the backdrop none. `PXL describe` gives each
  figure's contrast against what is round it; `PXL shot ... --grey` shows the values alone.
- The planes behind the playfield are paler, less saturated and less contrasted than it (about −20
  saturation, −15 contrast, +15 lightness); every top a figure can stand on has the brightest 1 px
  line on screen, and the solid layer is more saturated than the backdrop. An RPG's backdrop can stay
  rich.
- Hit boxes: the player's a small circle at its middle, never past its pixels; a pickup's bigger.
- Sizes in tiles: a screen of 320×180, 480×270 or 640×360 (1080p a whole multiple), tiles of 8 or
  16 px, figures 1×1, 1×2 or 2×2 tiles (22–27 px tall in a 16×32 frame), moves sized to the grid (a
  jump 2 tiles, stairs 8 px a step). Items idle by kind (`PXL help "characters 12"`); an engine flips
  sprites, so they are lit from straight above (characters §11).

## 16. A game's projections (top-down 3/4, side 3/4, isometric)

Pick one and keep everything in it (a 45° oblique bridge among isometric blocks clashed):

- **Top-down 3/4** (RPGs): what is level is seen from straight above at its true shape (a barrel's lid
  a circle, floor tiles square), what stands faces us flat, at full height or a little less (a crate
  is 8 px of top over 7 of front in a 16 px tile); nothing shrinks. A house: its facade as seen from
  the front, the side walls cut to about half their height, the roof's slopes at their front view's
  45°, its planes seen from above. The footprint stays on the grid and only the top overhangs (more
  breaks the draw order). A room shows the back wall's face, two tiles tall; the side and front walls
  only as a top edge, black beyond. Props and figures drawn in 3D (`turnaround()`'s `"side"` view,
  `rig3d()`) stand in it as they are: `world: { scale, view: "top", light: "sun" }`, one `look3d()`
  sun, `cast: "sun"` shadows, a walker by `route({ px: true })` (§11, the story bullet in §7).
- **Side 3/4** (a corner toward us): the gable end about half its width, the 45° roof kept, the
  overhang even. **Oblique** (cabinet): x and y flat, every depth edge at one slope (1:1 or 2:1), the
  same in every tile.
- **Isometric**: 2:1 lines (26.57°, not 30°: two across, one down); a level circle a 2:1 ellipse
  (32×16), an upright one sheared along the slope; a cylinder two such ellipses joined by uprights;
  foliage ovals about 3:2 in any projection. Outline every part on its own, hidden lines too, then
  fill; a cube's vertex run is 4 px without an outline, 3 with one; a lit 1 px lip along its top's
  near edges; a subtle outline breaking into dots along the 2:1 edges (`examples/isometric.px.js`,
  `tilemap(..., { iso })`).
- Light each face one tone, from one light at a top corner: the edge toward the light a 1 px strip a
  tone lighter, the edge turning away and the row where a face meets the ground a 1 px strip of the
  darkest tone, between two walls an optional 1 px strip of the mid tone (`plate()` per face, or
  `relight` with `reach: 1`). Shadows short and pointing nowhere in particular, on a layer of their
  own, a tile long at most.

## 17. 3D as code (fields, voxels, volumes, splats, decals)

A thing that turns, sways or is seen from several cameras can be described once in meters with `sdf`
and drawn as pixel art (`PXL help sdf`; `examples/sdf/`). A billboard tree drawn so (the nature kit's
`_spruce` and `_snag`, `make3d.spruce` and `make3d.snag`): a material's `hem` and `strokes`, a back light's `rim: 0.85`. What held, from building them:

- **Four kinds, never one.** A distance (`sdf.*`) for solid forms, drawn by `surface()`, `voxels()`
  or `mesh()`; a density (`sdf.density`) for air (mist, smoke, cloud), drawn by `volume()`; an
  appearance (`.mat()`, `.paint()`) for what each part is made of; an occupancy for voxels. A cloud as
  a distance has a hard edge; a rock as a density has none.
- **Splats for detail, not form.** A whole tree laid as splats read as soft blobs beside the same tree
  drawn by `surface()`. Keep the form a field and scatter the small things on it (`sdf.scatter`):
  leaves 20 to 40 to a square meter, each under about 4 px drawn as a brush (a 2x2 clump, a leaf, a
  blade), never in the ramp's darkest tone and with no outline of its own (outlined, they read as dark
  speckle). Moss and snow only where the form faces up (`up` 0.66 hugs a painted patch; at 0.55 tufts
  landed on bare stone and read as noise).
- **Decals or a sprite per view.** A face of 11 rows or less on a sprite figure: draw it per view by
  hand (`characters 5 6`). On a 3D form: a decal, drawn once per view it needs (front under 25
  degrees from the eye, three quarters under 65, profile beyond, mirrored for the other side), so it
  stays a texel to a pixel in any camera. Put it where the camera sees it: through a camera 40 degrees
  down, a mushroom cap with a 1.3 m rim hid everything on its 0.6 m stem above about 0.85 m (the
  sign and the window were moved down to the door). Something glowing needs a hue apart from what it
  lies on (a white rune on a pale crystal vanished; gold reads).
- **Voxels: the cell is a choice of look.** On the iso pixel grid at 16 px to the meter a 0.25 m cell
  is a cube 8 px wide, 0.125 m 4 px, 0.0625 m 2 px; things of different cells can share a world. A
  limb thinner than a cell is kept as a line of cells by `fill` 0.5, else it vanishes. A big block
  scene reads flat a tone a face: `ao: 1` darkens each face toward the cubes beside it. A field drawn
  with `view: { kind: "iso", grid: true }` lines up with voxels on one canvas; a side-view game's
  voxels go on the grid with `{ kind: "side", grid: true }`. A grid past 256 a side goes out as several
  MagicaVoxel models in place.
- **Volumes: a core, a dithered rim.** A volume thin all through is a field of dots (the grove's
  first mist, a ring of checkerboard round the house). Give it a core that hides what is behind
  (`thickness` 3 or more for a ground mist, `edge` about 0.9 m) so its middle reads as two or three
  tones in clusters and only its rim dithers. A ground mist is a low band (12 m by 2.2 m, 1 m tall)
  behind or round the things, not a disc under one of them. Volumes write no depth: draw them after
  the solids, the farthest first.
- **A scene as data, edited by name.** `world3d` parts made by builders with parameters that mean
  something, a seed each: "a denser canopy, twistier branches, wind from the left" is an `edit` of
  `oak.canopy`, `oak.twist`, `wind.from`, and the house and the rock stay byte for byte. A row or a
  fence is parts `along` a path (one a post, `s` stepping); `apart: ["house", 0.3]` keeps a rock clear
  of the house by placing it. Give values in the builder's range (`PXL help make3d`: a tree's
  `twist` is 0 to 1.5 radians; an agent once gave 70). `expect3d` rules (the canopy above the trunk, the rock clear of the house, the orb reaching
  its mark by a time, one thing before another) run in `pxl check`; a rule that fails over a place
  or a gap: `pxl check --fix` finds the one number and writes it (no model, two seconds); `pxl steps
  <file> <scene> --at x,y` says which part painted a pixel, through stamps too. In the evaluation
  (docs/evaluation-3d.md) a rewrite and a local edit kept the approved parts alike, the rewrite at
  half again the cost; the builders made a shorter file than primitives but bent the request to what
  their parameters say (a crystal's rock had no moss until `crystal({ moss })`): when none says what
  you need, make your own,
  `make3d.define("spirit", (params) => ({ field, decals }), { params: { size: [0.3, 2], holds: ["lamp", "none"] } })`
  (a number's range, a word's list), and it is a part like the others (relations, edits, rules,
  `--fix` within its ranges); a part's own `mats` and, air, `look: { ramp }` instead of a remap of draw3d's mats.
- **One stage for every 3D op.** The kit says the light and the materials once, `look3d({ light,
  mats })`, and the calls stop repeating them; the HD-2D camera is `perspective({ w, h, pitch, fov,
  ppm })`, and `at: CAM.aim(h)` stands a thing so its point h m up (its middle) is where the camera
  looks. A scene's `sizes` draws its fields, voxels and volumes k times as big too, a ray to a block.
- **One thing, any representation.** `draw3d(thing, { as: "voxels" })` draws a field, a built thing or a
  world as its surface, voxels, splats or a mesh, the splats' and the mesh's shadow the field's, the
  mesh where `at` puts it; a world's part its own way, `world.edit({ "oak.as": "voxels" })`, the rest as
  it was (`examples/sdf/splats.px.js`).
- **A turnaround: a 3D thing as a game's sprites.** `turnaround("house", make3d.house(), { view: "iso",
  n: 4 })` draws it from each heading, the camera and the light going round it (so every sprite is lit
  from the same side), one size, the pivot at its foot, named by the compass: `house_ne`, `house_se`,
  ... (4 in iso: its diagonals; 8; 16: `n, nne, ne, ene, ...`). Stamp them in any scene; through the
  HD-2D camera, among `mesh()`'s faces. `surface: { soft: 0.6, rim: 0.85, outline: false }` gives it
  surface()'s look (a tree's); `draw: (c, v) => ...` draws by hand over each heading where `v.screen(p)`
  puts a point: what hangs off it (paper streamers under a rope), which a decal, cut at its surface, can't. Something symmetric lit from above or in front mirrors its west
  for its east, as a game flips it (`examples/sdf/turnaround.px.js`): a sprite the game flips is lit
  from straight above.
- **Out to other tools.** `export3d` writes `.vox`, `.obj`, `.glb` and `.ply`; something that moves,
  as a function of the clock with `frames`, goes out as one `.glb` that plays (and a file a moment for
  the others). `pxl serve` shows the `.glb` and `.ply` to turn round at `/3d`. `mesh()` draws a mesh
  in `surface()`'s side, top and iso views too.
- **Into a diorama.** Things drawn in 3D stand among `mesh()`'s sprites when drawn after it through the
  same camera with `light: "mesh"`: its sun and sky on their tones (as on the sprites), the walls'
  and figures' shadows falling on them, their own shadows the sun's share, at its depth, in its
  sizes' pixel (`hd2d/graveyard.px.js`'s `graveyard_3d`, beside the scene it was made from). There, at 480x270, a frame went from 0.5 s to 1.65 s: a dead tree of 105
  tapering rods 1 s (bunched half a meter across, half again as fast; `ao: 0, shadows: false` looked
  the same), a ground mist 0.35 s, a gate swinging on its hinges 0.1 s; checked one frame in 88
  (with the tree's distance compiled in runs V8 optimizes, the frame now takes 0.7 s).
  A thin mist under half a meter (`thickness` 0.5, its top rolling with `noise` 0.7 over a 0.1 m layer,
  so the ground shows in its gaps) reads as a veil laid over by `blend: "alpha"`; dithered that thin it
  was speckle. Something that belongs to a ramp material of the mesh (a gate in its fence) keeps that
  material's tones and its own `light`: `mesh()` doesn't tint a ramp's faces with the sun.
- **Cost.** A 320x180 HD-2D frame with a leafy tree, smoke and mist takes 0.6 to 1.3 s on the CPU:
  check one frame in 24 (`check: { every: 24 }`) and keep the loop short.
