# Scenes, environments and buildings

Read this before building a scene, a level, a building or any environment.

Contents: Layout and scale · Ground, paths and tiles · Texture without filler · Trees and big organic
shapes · Water and things that land · Distance (aerial perspective) · True perspective · Slow motion
in a short loop · Closing a loop · Shadows and light · Blend modes · Checking a scene

## Layout and scale

- **Size buildings from the characters.** A door is a little taller than the tallest figure that
  could walk through it (figures of 26–34 px: a 34 px door). A crypt whose door was shorter than its
  monsters turned a werewolf on its roof into a giant.
- Flat side views and top-down maps have no perspective: things do not shrink with distance.
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
  Give props `pivot: "bottom"` and stamp them at the ground's y.
- Figures need a few px of air to read. `PXL describe <file> <scene>` gives the gap between objects
  (`nearest: witch 3px left`); two figures at 1 px read as one shape.

## Ground, paths and tiles

- **Paths, roads, shores and patches of ground are laid with tiles**, marked at tile corners with
  `tilemap(..., { corners })` and a terrain tileset (drawn in code, or reduced from a free LPC-style
  one): `examples/topdown.px.js`, `examples/tropical/trail.px.js`. A `curve` or `poly` stroke of dirt
  reads as paint on top of the grass.
- Tiles that repeat get `wrap: true` (or `"x"`/`"y"`): the preview shows them 3×3, so seams show,
  and drawing past an edge continues on the other side.
- Keep small details that dot an area (pebbles, flowers, tufts) out of tiles: baked in, they repeat
  as a pattern. Lay plain tiles, then `scatter(..., { even: true })` the details over them.
- Organic texture (leaves, grass, stones, rust): 2–3 tiny brush parts + `scatter` with `on`/`clip`.
  Along an edge (grass on a path's border, moss at a rock's foot): `scatter(..., { on: "g", near:
  "<path keys>", within: 3 })`.

## Texture without filler

Don't sprinkle `noise` over walls, floors or plaster to make them "less flat": it reads as random
dots. Every mark needs a cause you could name, where that cause would put it:

- built structure: siding and plank lines, brick or stone courses with offset joints, tile seams;
- weathering: rain streaks under ledges and sills, splash-back grime fading up from the ground,
  rust runs under brackets, paint flaking along the boards, moss creeping up from steps;
- clutter that tells the story: posters, pipes, vents, cracks from a corner.

Flat color is fine; a clean wall beats a dotted one. `noise` is for granular materials (gravel,
sand, asphalt, rough stone), sparse. `dither` over a whole area reads as a checkerboard: use it where
two tones meet. On faces drawn at an angle (3/4), marks follow the face's slant.

## Trees and big organic shapes

Code drawing fails worst here (lobes read as broccoli, fronds as combs). Start from free art:
CC0 or CC-BY, credited in the file; share-alike (CC-BY-SA) puts its license on everything built with
it, so ask the user first. `sprite("palm", { png: "palm.png", shrink: 2 })`, then fix it:
`rampmap` when tones merged, `relight` when it came out flat (`examples/tropical/trees.px.js`;
characters.md §3 has the steps).

## Water and things that land

A waterfall that ends in a strip of foam over still water looks pasted on: spread churning foam to
the sides and forward, send rings out, and let a wake ride the current downstream. A figure walks
on the ground, not over it: tufts at the edges of paths and at the foot of trees and rocks.

## Distance (aerial perspective)

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

## True perspective (vanishing points)

- A road, rails, a corridor, a square seen from the ground: lay everything in meters and project it
  with `perspective()` (reference: Perspective). The ground is a `plane()`: each pixel gets the color
  of the ground point it sees, so stripes and rows run to the vanishing point by themselves. Long thin
  lines (joints, rails, wires) draw better as `line`s between two `ground()` points than per pixel.
- Things on the ground stand at `ground(x, z)`, sized by `scale(z)`; poles, posts and fences are a
  loop over z. A figure walking into the distance changes size only at each step's contact, and under
  ~15 px takes a hand-drawn sprite for its size (`fit`): drawn by code that small, it is a blob.
- Props on the ground (plants, stakes, rocks, benches): build each once as parts in meters with the
  `solid` global, sticks (trunk, arm, twig, post), blobs (crown, boulder), boxes, cones, and use the
  same parts twice: `solids()` projects and draws them, `shadows()` sweeps them onto the ground away
  from the sun, so the shadow has the thing's shape and stays right as it recedes. Near ones on a plate with `relight` for the rim; far ones in the haze
  color; under a few px, a simple tuft.
- Two-point: turn the camera (`yaw`). Whatever is laid on the world's x and z axes then runs to
  `vanish(0)` and `vanish(90)`, often both off the picture; verticals stay vertical. A box's faces:
  each is lit or in shade by which way it faces the sun. People walking in such a scene: pose a body
  in meters (feet, knees by two-bone IK, arms against the legs) and project it, rather than drawing
  sprites per direction (`examples/perspective/park.px.js`).
- Three-point: tilt the camera (`pitch`). Looking up (a worm's-eye view), the horizon drops low in the
  picture and every upright leans in toward `vertical()` above it: trunks, poles, a tower; looking
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

## Slow motion in a short loop (clouds, mist, drifting things)

- Scrolling a strip that wraps makes the loop as long as its width over the speed: slow clouds
  then need half a minute or more. Instead give each cloud a life of one loop: it forms, drifts in
  one piece (a whole pixel at even intervals: `Math.floor(drift * age)`, with `drift` a divisor of
  the loop), and thins away where it started; start each at its own moment so only one or two are
  forming or fading at a time. Make the loop a multiple of the scene's other loops.
- Thin, a cloud is a long pale wisp in a tone close to the sky's (puffs losing their height faster
  than their length, a flat base joining them), not a row of small blobs. A heaped cloud takes its
  light from the top down as it gains body (a white cap thickening row by row, then a gray
  underside); a thin streak can take its lit underside column by column. Examples:
  `examples/sunset/sunset.px.js` (streaks at sunset), `examples/rig/tournament.px.js` (daylight cumulus).

## Closing a loop

- Something crossing the picture: let it cover more than the picture's width (plus its own length) in
  one loop (`x = ((x0 - v·t) mod L) - L/2`, L = v times the loop's length): it leaves on one side and
  comes back on the other while it can't be seen. Or end its way behind something (a hedge, a cart, a
  trunk) and start it behind something else.
- Particles (embers, ash, rain): each goes round the picture a whole number of times in the loop.
- A lane of clouds: each moves one slot along in the loop while turning into the next one's shape;
  or each lives one loop (forms, drifts, thins away) as above; soot or mist that comes and goes:
  thin it by `0.5 - 0.5·cos(2π·t)`, fading to nothing at the edge of the part that moves.
- Gaits: a stride a whole number of frames, and the loop a multiple of every stride in it.

## Shadows and light

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

## Blend modes leave the palette

A layer with `blend: "multiply" | "screen" | "add" | "overlay"` or `opacity` does color math with
what is below: one deep-blue `rect` at `{ blend: "multiply", opacity: 0.7 }` turns a scene to night.
But every pixel it touches becomes a color nobody picked, and palette swaps in an engine stop
finding them. Try the palette-safe tools first (`shade:`/`light:` layers, `density`, `glow`,
`lighting()`); use blend modes for whole-scene grading or true translucency, and tell the user.
`palettize: true` snaps results back only when the palette already has those tones.

## Checking a scene

- `PXL shot <file> <scene>`: the look, with what changed since the last shot and the warnings on
  it; `--at x,y,w,h` again and again for details side by side, `--frames` for moments of the loop,
  another version as a second name (`old.px.js:scene`) for a before and after.
- `PXL describe <file> <scene>`: every object's visible ranges, gaps, cover, contrast and motion
  (`--brief` for busy scenes); after an edit, `--diff` lists what moved, was redrawn or recolored.
- `PXL check <file>` before handing over: every frame of the loop; its last line says which rules
  ran, and `--readings` shows what the lit-side rule read on each thing when a warning looks wrong.
- A scene built from separate maps (terrain, props): `throw` in the placement loop when a prop lands
  on the wrong ground; it catches the drift before anyone sees it.
- Before handing over, look as a critic: tiles repeating into a visible grid, props floating or on
  the wrong ground, big flat areas with no detail, dither as texture.
