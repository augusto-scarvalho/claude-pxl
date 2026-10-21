# Scenes, environments and buildings

Read this before building a scene, a level, a building or any environment.

Contents: Layout and scale · Ground, paths and tiles · Texture without filler · Trees and big organic
shapes · Water and things that land · Distance (aerial perspective) · True perspective · Slow motion
in a short loop · Closing a loop · Parallax · Shadows and light · Blend modes · Checking a scene

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
- What stands on the ground goes in a `sort: "y"` layer, so the lower (nearer) thing draws in front.
  Give props `pivot: "bottom"` and stamp them at the ground's y. Top-down, something floating or
  hanging sorts at the point on the ground under it (its pivot there), and an L-shaped or tall thing
  is cut into pieces, each sorted on its own base.
- Figures need a few px of air to read. `PXL describe <file> <scene>` gives the gap between objects
  (`nearest: witch 3px left`); two figures at 1 px read as one shape.

## 2. Ground, paths and tiles

- **Paths, roads, shores and patches of ground are laid with tiles**, marked at tile corners with
  `tilemap(..., { corners })` and a terrain tileset (drawn in code, or reduced from a free LPC-style
  one): `examples/topdown.px.js`, `examples/tropical/trail.px.js`. A `curve` or `poly` stroke of dirt
  reads as paint on top of the grass.
- Tiles that repeat get `wrap: true` (or `"x"`/`"y"`): the preview shows them 3×3 (3×1, 1×3), so seams show,
  and drawing past an edge continues on the other side.
- Keep small details that dot an area (pebbles, flowers, tufts) out of tiles: baked in, they repeat
  as a pattern. Lay plain tiles, then `scatter(..., { even: true })` the details over them.
- A tileset (Saint11): draw the master tile, offset it by half (`wrap: true` shows the seams) and fix
  the cross in the middle; draw the edge tiles from the middle tile's edge strips; variants change
  only the middle. A full set: a single tile, tubes, a T for each turn, a cross, inner corners, and a
  wildcard tile.
- Organic texture (leaves, grass, stones, rust): 2–3 tiny brush parts + `scatter` with `on`/`clip`.
  Along an edge (grass on a path's border, moss at a rock's foot): `scatter(..., { on: "g", near:
  "<path keys>", within: 3 })`.

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
| Velvet, fur | a lighter rim where it turns away |
| Fabric | folds parallel where it's pulled tight, radiating from where it bunches |
| Plants | about half the ramp light tones, warm light and cold shadow; detailed borders, a calm inside |

Flat color is fine; a clean wall beats a dotted one. `noise` is for granular materials (gravel,
sand, asphalt, rough stone), sparse. `dither` over a whole area reads as a checkerboard: use it where
two tones meet, between neighbors in a ramp. On faces drawn at an angle (3/4), marks follow the
face's slant. Draw a texture's marks first, then shade them with the form: they fade into the
shadow and are sharpest where the light turns (in the Pixel Joint texture thread, an ice cream lost
half its colors and gained volume so). Detail the borders of a mass (foliage, a rock's rim) and keep
its inside calm. Leaves gather in clumps along bands wrapped round the crown, not spread evenly.

## 4. Trees and big organic shapes

Code drawing fails worst here (lobes read as broccoli, fronds as combs). Start from free art:
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
  down to the sea or the plain at a headland (`examples/perspective/race.px.js`: `range`).

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
  some twinkle, out of step, a 4-frame cycle at 120 ms (a step of shade, or a dot growing to a plus).
- Thin, a cloud is a long pale wisp in a tone close to the sky's (puffs losing their height faster
  than their length, a flat base joining them), not a row of small blobs. A heaped cloud takes its
  light from the top down as it gains body (a white cap thickening row by row, then a gray
  underside); a thin streak can take its lit underside column by column. Examples:
  `examples/sunset/sunset.px.js` (streaks at sunset), `examples/rig/tournament.px.js` (daylight cumulus).

## 9. Closing a loop

- Something crossing the picture: let it cover more than the picture's width (plus its own length) in
  one loop (`x = ((x0 - v·t) mod L) - L/2` from the picture's middle, L = v times the loop's length): it leaves on one side and
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
  its repeat; a wide one (1280 px) costs nothing per frame. Noise on a strip: `seamless()` makes it
  close over the strip's width. `describe` sees a scrolled strip as one object shifting across, not as
  motion: look at the planes with `shot --frames`.
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

- Cast shadows: a `shade: true` layer, with tall things stamped there by `cast: [kx, ky]` (laid flat
  from their base, `silhouette: "k"`): a pixel h px up lands h × (kx, ky) away. One sun, one
  `cast` for everything. `ky` says where the sun is in depth: negative, the shadows fall back (the
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
  light height`, capped at length 1. Keep other lamps out of where a shadow falls: they fill it.
- The ground ramp needs a tone below its darkest for shadows to show after lighting (`"0EGgl"`, then
  `shade: 2`): a shade can't step below a ramp's darkest key, so ground already there under a
  shadow doesn't change.
- Shadows in one `shade` layer are a union: a figure standing in a tree's shadow casts none of its
  own there and looks like it floats. Give what stands a contact shadow in a second `shade` layer,
  its silhouette squashed under its base (`cast: [0.18, 0.12]`, or a flat ellipse at the feet): dark
  where it touches the ground, inside the bigger shadow too.
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
  crossing in one frame is a capsule spanning the gap (`stamp`'s `smear`; a blade's, `arc()`).
- **Shine:** a rest of 0.6–0.8 s, then a sweep in 4 frames: a corner glint, a short slanted band, a
  long band, the far corner (`clip` the item, a slanted `poly`); on a ring a crescent following the
  curve; a gem lights facet by facet until it is all lit 1 frame, then dark at once; ice, flat white
  shards sliding 4 frames, resting ten times as long. A moving glint may be white for 1–2 frames.
- **Hits:** on what doesn't break, a dark ellipse, a white 4-point star, a white disk, then a cyan and
  a yellow crescent, no shrapnel; a shield's edge stays lit ~4 frames after its white flash; armor
  flashes white and a white crescent sweeps across it over 4. A small enemy squashes and flashes
  (`recolor({ "*": "w" })`); frame counts for hits and deaths: `PXL help "characters 12"`.
- **Bullets:** a warm bright core with cool edges, stretched along its way; a fast one moves more than
  its length a frame, its impact shrinking to a third each frame (152, 55, 21, 11, 7 px); slow ones
  blink bright and dark every frame; a hitscan's flash darkens the scene and lights the shooter, the
  impact comes the next frame, debris ~6.
- **Fire:** one wave lives ~10 frames: a thin bright line at the base, swelling, rising wavy, a curled
  tongue that detaches and breaks into 2–3 bits near the top, reddening and gone; slow at the base,
  fastest midway; a new wave every 2–3 frames, 3–4 at once. `flame()` flickers its tongues in place; a
  big close fire wants waves that travel up. A torch's base keeps its volume as its shape changes.
- **Glitch:** a different mix every frame with nearly clean frames between; a noise frame, a blank one
  and a white one 1 frame each; strips shifted a few px, colors bled 1 px to the right.
- **Loops that warn** (hazards): spikes peek out 5 frames (the tell), are up 4 and go back in 3 steps;
  a laser aims a thin line 4 frames and fires 2; a flame jet burns bright 2 and smokes ~6; a saw spins
  as a blurred disc, its art never rotated. A thruster's 5-frame loop at 60 ms: a round burst
  (lighting the ship's rear), a long thin flame, the mass thrown back, wider and darker, smallest.

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
  for the last commit above and the changed pixels in red below.
- `PXL describe <file> <scene>`: every object's visible ranges, gaps, cover, contrast and motion
  (`--brief` for busy scenes); after an edit, `--diff` lists what moved, was redrawn or recolored.
- `PXL check <file>` before handing over: every frame of the loop; its last line says which rules
  ran, and `--readings` shows what the lit-side rule read on each thing when a warning looks wrong.
  Checks and `world` rules cover `scene()`s (and rigs): a picture made as an `anim()` gets none of
  them (only the LOOK lines on a hand-drawn line), so
  for checks make it a scene that stamps its moving parts (as `sunset` and `tournament` do).
- A scene built from separate maps (terrain, props): `throw` in the placement loop when a prop lands
  on the wrong ground; it catches the drift before anyone sees it.
- Before handing over, look as a critic: tiles repeating into a visible grid, props floating or on
  the wrong ground, big flat areas with no detail, dither as texture.
