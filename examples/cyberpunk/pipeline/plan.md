# Night City at dusk: plan

A 320×180 animated scene: a sprawling, sun-bleached Californian megacity at dusk as its lights come
on. Brutalist megablocks and corporate towers dissolve into dusty yellow haze, an elevated freeway
crosses the frame, and a strip of low shops lines the far side of a street with rooftop billboards,
a holo-ad, a pole sign, palms, wires and vents. Cars pass both ways and people walk on both
sidewalks. The palette is dusty yellow, teal, sodium orange and grimy red, with no pink or cyan.
All the art is original: no real logos, brands or names.

`PXL` = `node <skill dir>/bin/pxl.js`. Read `SKILL.md` and `scenes.md` there before
drawing, and `PXL help "characters 1 4 7 10"` if you draw people.

## 1. Scene, world, timing

- **Canvas** 320×180. Coordinates are scene pixels from the top left. "Row y" is a pixel row.
- **World**: the camera is about 6 m up (a first-floor balcony across the street), looking north.
  The ground is in perspective with the horizon on row **104** and the eye at **6 m**, so a thing
  standing on row y is drawn at `(y − 104) / 6` px per meter. Everything is drawn **flat-on, in
  front elevation**: no roofs seen from above and no 3/4 sides. Depth comes from overlap, from the
  scale at each row, and from haze.

  | Depth band (row it stands on) | px / m | Sizes |
  |---|---|---|
  | far city (≈108) | <1 | silhouettes in haze |
  | freeway footings (124) | 3.3 | car 15×5, deck 14 m up = row 78 |
  | strip facades (136) | 5.3 | storey 18 px, shop floor 24 px, door 6×12 |
  | far sidewalk (feet on 139–141) | 6 | adult 10–11 px tall, kid 7 |
  | far lane (wheels on 151) | 7.8 | sedan 36×11, van 39×16, truck 52×22 |
  | near lane (wheels on 164) | 10 | sedan 46×14, van 50×20, truck 66×28 |
  | near sidewalk (feet on 175–178) | 12 | adult 20–23 px tall, kid 14 |

- **Timing, the same for every moving asset**: `fps: 12`, `frames: 240` (83 ms a frame, a
  19.9 s loop). Write a moving asset as
  `anim(name, { w, h, frames: 240, fps: 12 }, (c) => { ... c.frame ... })`. A static asset may be a
  plain `sprite`.
  - Any cycle inside it (blink, walk cycle, flicker, chase) has a period that divides 240: 2 3 4 5
    6 8 10 12 15 16 20 24 30 40 48 60 80 120 240. An inner anim goes in as
    `c.stamp("_x_walk", x, y, { frame: c.frame % 12 })`.
  - **Anything that travels** returns to its start after 240 frames:
    `x = x0 + v·f`, wrapped over a ring of length `span`, where `v × 240` is a whole multiple of
    `span` and `span` ≥ 320 + its own length + some margin, so the wrap happens off screen. Draw at
    whole pixels (`Math.floor`).
  - Something that lives less than one loop (a puff of steam, a cloud, a walker who comes out of a
    door) is born, lives and dies inside the 240 frames, or straddles the seam whole.
  - No `Math.random`. Use `c.rng(seed)` or a hash of a fixed index, so every build is the same.
  - Check the seam: `PXL shot <file> <asset> --frames 237,238,239,0,1,2`.
- **Cue sheet.** The lights come on in turns, so something new lights up every couple of
  seconds. Whatever switches on must also switch off somewhere in the loop so the loop closes; a
  failing lamp cutting out is fine.

  | Frames | Who | What |
  |---|---|---|
  | 0, 80, 160 | signs_billboard | the ad changes, after a 4-frame scanline glitch (76–79, 156–159, 236–239) |
  | 20–40 | freeway_deck | the lamp at x 138 stutters on (off in frames 0–19) |
  | 30 / 150 | strip_row | B's upstairs window goes off at 30 and back on at 150 |
  | 60–90 | signs_pylon | the cabinet letters flicker on one by one; dark again 228–239 and 0–59 |
  | 100–130 | street_front | the streetlight at x 204 stutters on; it cuts out at 237 (failing ballast) and stays off to 99 |
  | 150–170 | signs_blade | the neon drops out and buzzes back |
  | 180–200 | signs_neons | D's window neon stutters on; it goes off at 20 |
  | 200–215 | signs_holo | the hologram glitches |
  | all loop | towers_skyline | beacons blink, windows go on and off a few at a time |

## 2. Light

- **Key light: the setting sun**, a disc centred at **(28, 46)**, r 9, low in the west at the upper
  left and sinking behind a far megablock that hides its lower part. It is *behind* the scene
  (we look toward it), so the scene is backlit from the upper left: `world.light = [-1, -0.45]`.
- **What the sun still reaches**: only what stands high, above about row 100: the towers, the
  freeway parapet and lamp posts, the strip's rooftops, tanks and antennas, the billboard, the palm
  crowns and the pole sign's top. These get a 1-px warm rim on their **top and left edges** (the
  material's lightest tone, `L` on concrete, `y`/`Y` on what is very near the sun). Faces toward us
  stay in shade.
- **Below about row 100 (the street, ground floors, cars, people)**, everything is in the city's
  shadow. No sun rims and no sun cast shadows. It is lit by:
  - the **sky** from above, teal and cool: up-facing surfaces (sidewalks, awning tops, car roofs and
    hoods, heads and shoulders) are one tone lighter than the faces toward us; undersides (ledges,
    awnings, the deck, car sills) are the darkest.
  - **practical lights coming on**: sodium lamps (`o a A`) on the freeway posts, the streetlights,
    the billboard floods and the pole sign's bulbs; fluorescent shop interiors (`i`) in the liquor
    store and the laundromat; warm interiors (`w`) at the taco window and in apartments; neon (`p P`)
    and holo (`Z z x`). A surface within about 10 px of such a light and facing it is one tone
    lighter. The **scene** adds the halos (`glow`), the lamp pools on the street, the headlight
    beams and the contact shadows. Don't paint those into the parts.
- **Emissive keys are only for things that give light**: `W` sun; `O o a A` sodium bulbs, lit sign
  faces, headlights; `w i` lit windows; `Z z x` holo; `p P` neon and taillights. The scene glows them
  by key, so never use them for an unlit surface (use `u U M J L` for bright paint instead).

## 3. Style (every part)

- **Palette**: the keys of `palette.px.js` only. No hex colors, no new `pal` keys, and no
  `opacity`/`blend`/`lighting()`/`glow` inside parts: the scene does translucency and glow.
- **No outlines** (no `outline`/`selout`/`inline`). Shapes read by value. Where a shape meets
  something of a similar value, close the edge with the material's darkest tone, or `k` at street
  level only.
- **Shading**: 2–4 tones per material, from its ramp. The face toward us is the mid tone,
  up-facing and sun-facing edges are the light tone, undersides, recesses and gaps the dark tone.
  Use hard-edged clusters, no pillow shading, and no anti-aliasing except a pixel where a curve needs
  it.
- **Distance**: the towers use the far ramp `1 2 3 4` plus the sky's haze keys only. The freeway is
  one tone lighter and flatter than the same concrete on the strip. Full contrast (and `k`) belongs
  to the street level.
- **Texture with a cause**: panel seams and expansion joints, grime streaks under sills and AC
  units, rust runs under brackets, splash-back grime at the foot of walls, posters, abstract tags (no
  words), cables, grates. No `noise` filler, except sparse grit on asphalt. Dither only where two
  tones meet in a gradient (sky, haze, falloff), never as texture.
- **Lettering**: invented words only, at most 5 letters, 3×5 px glyphs at most. Prefer glyphs and
  pictograms. No real brand, logo or place name, and no Japanese signage.
- **Density**: at street level something tells a story every 8–10 px.
- **Californian, not Tokyo**: stucco, flat roofs, parking lots, palms, pole signs, wooden utility
  poles with sagging wires, dust, sun-faded paint.

## 4. Rules for part files

1. Start with `include("palette.px.js", { palette: true })`.
2. Define exactly the exported assets listed for your part, with those names, boxes (`w`, `h`),
   pivots and frame counts. Draw only inside the box and leave the rest transparent.
3. **All part files share one scope in the scene.** Every top-level `const`/`let`/`function` name
   must start with your part's name in capitals (`STRIP_ROOFS`, `CROWD_WALK`), and every private
   asset with `_` + your part's name (`_strip_window`, `_crowd_walk_0`). A clash breaks the whole
   scene.
4. Don't stamp other parts' assets (they don't exist while you work). Fit them using this plan's
   numbers. Convert scene coordinates to your box: box x = scene x − stamp x, box y = scene y −
   stamp y (for the pivot-bottom assets, the stamp point is the middle of the box's bottom edge).
5. While working you may add a test scene named `<part>_test` that stamps your asset where the city
   does, over `bg: "h"`. Delete it before you hand over. Before handing over, run `PXL check` on your
   file and look at frames 0, 60, 120, 180 and 239.

## 5. The shared map

Rows, top to bottom: sky 0–111 · towers 12–111 · freeway deck parapet top 78, deck face 78–87,
underside 88–90, footings 123 · strip facades end on 135 · far sidewalk 136–141 · far curb 142–143 ·
road 144–166 (far lane wheels 151, center line 155–156, near lane wheels 164) · near curb 167–168 ·
near sidewalk 169–179.

**The strip (far side of the street).** The base line is row 136 (the first sidewalk row; facades
end on 135). "Roof" is the row of the parapet's top pixel; things standing on a roof are stamped
there with pivot bottom.

| Id | x | Roof | Storeys | Facade | Ground floor | Sign spot (signs_neons draws here; strip leaves a plain dark board `C`/`K`) | Door (dark opening, rows 123–135) |
|---|---|---|---|---|---|---|---|
| A | 0–61 | 58 | 4 | board-formed concrete, brutalist | electronics repair and pawn shop, roll-up grate half open | x 6–34, rows 113–118 | x 42–47 |
| B | 62–117 | 94 | 2 | sun-faded stucco `s u U` | taco counter window x 70–94 (warm `w`), red awning rows 117–120 | x 72–92, rows 106–111 | x 102–107 |
| C | 118–169 | — | — | parking lot | lot asphalt rows 124–135, chain-link fence rows 110–124 at the back, palms, parked car | — | open to the sidewalk |
| D | 170–231 | 110 | 1 | pale stucco, teal trim | liquor and convenience store, glass front x 174–210 (fluorescent `i`) | x 176–206, rows 112–117 | x 216–221 |
| E | 232–285 | 76 | 3 | concrete grid, deep-set windows | laundromat, glass front x 248–272 (fluorescent `i`) | x 248–270, rows 113–118 | x 237–242 |
| F | 286–319 | 92 | 2 | grimy red brick / painted `r m` | cyberware clinic, barred window | x 290–316, rows 112–117 | x 306–311 |

**Fixed points other parts rely on**

- The sun: (28, 46), r 9. The towers' megablock roof covers it from row 50 down. A's antenna mast
  (strip) stands at x 34, rows 40–57, in front of the sun's disc.
- Freeway pillars: centred at x 20, 130 and 240, 14 px wide, with hammerhead caps 24 px wide under
  the deck. Freeway lamp posts at x 10, 74, 138, 202 and 266, heads at rows 60–62. Sign gantry at
  x 288–318.
- Palms (strip) in the lot: trunks at x 122 and 166, standing on row 133, crown tops at rows 42 and 50.
- Pole sign (signs): its pole is at x 144–148 in the lot. The strip keeps its parked car and
  clutter clear of x 140–151.
- Billboard (signs) on B's roof: x 64–115, rows 58–93. Holo (signs) on D's roof: x 179–222, rows
  46–109, with the projector box on the roof around x 194–208. Blade sign (signs) on E: x 274–283,
  rows 80–111. The strip leaves these places as plain roof/wall.
- Streetlights (street): poles at the near curb at x 44 and 204 (bottom row 170), heads at
  (70, 76) and (230, 76). Their pools fall under the heads, on the road and the near sidewalk.
- Utility poles (street): x 112 and 292, standing on row 170, tops at row 30. Service drops run to
  A's roof (x 50, row 60) and F's roof (x 304, row 92).
- Manhole (street ground) at x 262, row 161. Steam rises from it.
- The near sidewalk's curbside props (street) are at x 8–15, 150–155, 176 and 236–243. Standing
  people and the vendor cart (crowd) stay at x 160–196 and 250–284.

## 6. Layer order (cyberpunk_city.px.js)

sky → towers → freeway → haze veil (scene, opacity) → street_ground → strip_row → signs
(billboard, pylon, blade, neons) → signs_holo (opacity 0.85) → contact shadows (shade 2:
traffic_shadow, crowd_shadow) → headlight beams (light, density 0.5) → crowd_far → traffic_cars →
street_steam (opacity 0.45) → street_front → crowd_near → lamp pools (light: soft at density 0.5,
then core) → glow on `W`, `aA`, `zx`, `pP`, `wi`.

The streetlight and utility poles stand at the near curb, farther away than the near walkers, so
the walkers are drawn in front of them.

## 7. The parts

Every asset below: `fps: 12`, `frames: 240` if it moves. "Box" is `w × h`. "At" is where the scene
stamps its pivot. The pivot is the top-left corner unless it says bottom (the middle of the box's
bottom edge).

### 1. sky: `part_sky.px.js`

| Asset | Kind | Box | Pivot | At |
|---|---|---|---|---|
| `sky_bg` | anim | 320×112 | top-left | (0, 0) |

- **Shows**: the dusk sky, fully opaque (it is the backdrop). The zenith is deep teal `N` and it
  goes down through `n v V` into dusty yellow `h H` near the horizon. It is brightest and warmest
  around the sun and toward the left; the right side of the horizon is dustier (`h`). The sun at
  (28, 46), r 9, has a `W` core, a `Y` rim and a wide `y`→`H` halo of dithered rings, about 40 px.
  Three to five long, flat cloud streaks lie in rows 10–60: dark tops (`v V`) and undersides lit from
  the sun's side (`H y`), the light thinning toward the right. Two or three flying cars (AVs) cross
  high, in rows 14–40: 5×2 dark silhouettes with a blinking `p` nav light and an `A` headlight. Put
  the detail high: the towers cover most of the sky below row 50.
- **Moves**: each streak lives one loop. It forms, drifts right 1 px every 24 frames and thins away
  where it started, each at its own moment (`scenes.md`, "Slow motion in a short loop"). AVs cross
  at 3 px/frame on a span of 360 (two passes a loop), or at 2 px/frame on a span of 480 (one pass).
  Nav lights blink 3 frames on, 21 off. The sun doesn't move.
- **Light**: the sun itself.

### 2. towers: `part_towers.px.js`

| Asset | Kind | Box | Pivot | At |
|---|---|---|---|---|
| `towers_skyline` | anim | 320×100 | top-left | (0, 12), covering rows 12–111 |

- **Shows**: the far megacity, backlit, transparent above the skyline. Masses, in scene x:
  - a brutalist megablock under the sun at x 0–70, its roof on row 50 at x 8–62, covering the
    sun's lower part;
  - a twin-slab arcology at x 96–140, tops at rows 30–36;
  - the dominant corporate spire at x 196–222, top at row 14 with a needle to row 12, a stepped
    crown, and a teal holo panel on its face (rows 30–40, an abstract glyph);
  - a wide terraced megabuilding at x 240–320, top at row 40;
  - lower blocks filling between them, so that by about row 80 the skyline is continuous.

  Nearer and taller masses use `1 2`, farther ones `3 4`. All of them dissolve to `4`, then to the
  sky's `h`, from row 96 down to 111 (dithered at the meeting). The tops and left edges have a `H`/`y`
  rim, brighter the nearer the sun. The faces toward us are flat and faintly patterned with floor
  bands, vents and slab joints. Windows are 1-px dots of `w`, `i` and `o` in floor rows, sparse
  (lights coming on). Red beacons `p` sit on the spire, the megablock and the twin slabs.
- **Moves**: beacons blink on a period of 24 (3 frames on), staggered. About a dozen windows switch
  on at seeded frames and a dozen others switch off, so the count stays level and the loop closes.
  The spire's holo panel changes glyph every 120 frames, with a 2-frame glitch.
- **Light**: backlit from the upper left. Rims on the top and left edges, faces in hazy shade.

### 3. freeway: `part_freeway.px.js`

| Asset | Kind | Box | Pivot | At |
|---|---|---|---|---|
| `freeway_deck` | anim | 320×66 | top-left | (0, 58), covering rows 58–123 |

- **Shows**: an elevated concrete freeway across the full width. The parapet's top row is 78 and
  the deck face runs rows 78–87, in board-formed panels with expansion joints about every 40 px,
  with grime streaks from drain spouts. The underside is rows 88–90 (`C K`), with a dark shadow band
  just under it. Brutalist pillars stand at x 20, 130 and 240 (14 px wide, hammerhead caps 24 px
  wide), from the deck down to footings on row 123. Under the deck, between the pillars, it is open
  (transparent), so the far city's haze shows through. At the pillars' feet (rows 110–123) are an
  embankment and life under the freeway, in shade: a fence, a tarp camp, a burnt-out car. Slim
  sodium lamp posts stand on the parapet at x 10, 74, 138, 202 and 266, with arms at rows 60–62 and
  `a/A` heads. A sign gantry over the lanes at x 288–318, rows 60–76, carries a teal board (`t j`)
  with pale pictograms: an invented route shield and an arrow.
- **Traffic on the deck**, visible above the parapet (rows 70–78, the parapet hides the wheels): the
  far lane goes left at 4 px/frame on a span of 480, the near lane goes right at 5 px/frame on a span
  of 600, about four vehicles in each ring. Cars are 15×5, trucks 26×9. `A` headlights at the front,
  `p` taillights at the back, glass catching the sky (`h`).
- **Moves**: the traffic. The lamp at x 138 is off in frames 0–19, stutters on in 20–40 and stays
  on; the others are steady.
- **Light**: the sun from the upper left behind. The parapet's top row and the lamp posts' left
  edges get an `L` rim. The deck face is `e/E` (one tone lighter than the strip's concrete), the
  underside `C/K`. The pillars have an `E` left edge, an `e` face and a `c` right side. Each lamp
  lights the parapet top under it one tone lighter.

### 4. strip: `part_strip.px.js`

| Asset | Kind | Box | Pivot | At |
|---|---|---|---|---|
| `strip_row` | anim | 320×100 | top-left | (0, 40), covering rows 40–139 |

- **Shows**: buildings A–F from the table in section 5, flat-on, at 5.3 px/m. Facades end on row
  135. Props standing against them on the far sidewalk (trash cans, an A-frame menu at the taco
  stand, a vending machine, a bike rack) may reach rows 136–139. It is transparent above the
  rooflines and in the lot above the fence.
  - Upper floors: windows of dark glass reflecting the sky (`T n`, a `v` streak), a few warm `w`, one
    with a teal TV flicker. AC units with drip stains, downpipes, a fire escape on A's left, cables
    between roofs.
  - Rooftops: water tanks, vents, satellite dishes, A's antenna mast at x 34 up to row 40.
  - Ground floors: sign boards left plain at the sign spots, the glass fronts of D and E lit
    fluorescent (`i`) with shelves and washers in `j t`, B's taco window lit warm (`w`) with a cook
    in silhouette, the doors as dark openings, posters, abstract tags and grates.
  - Lot C: asphalt (`G g`) with faded parking lines (`u`), a chain-link fence at the back (rows
    110–124) as a sparse diagonal mesh in `e`, see-through, with razor coil on top. A parked car is
    kept clear of x 140–151. Two tall Washingtonia palms stand there (trunks at x 122 and 166,
    2 px wide, on row 133, crown tops at rows 42 and 50): drooping fronds in `D d 9` with a skirt of
    dead fronds (`b f`).
- **Moves**: one fluorescent tube in D flickers (period 30). A's TV flickers (seeded, period 10). A
  dryer drum in E spins (a 4-frame cycle). An AC fan turns (2 frames). B's upstairs window goes off
  at frame 30 and back on at 150. If nothing moved it could be a sprite, but these small motions are
  wanted.
- **Light**: backlit. Rooftops, parapet tops, tanks, the mast and the palm crowns have a sun rim on
  their top and left edges. Below about row 100 is shade: faces mid tone, ledge and awning undersides
  dark, awning tops one tone lighter (sky). The shop light spills onto what stands just in front of
  the glass (the props one tone lighter). The street part draws the spill on the sidewalk.

### 5. signs: `part_signs.px.js`

| Asset | Kind | Box | Pivot | At | Occupies (scene) |
|---|---|---|---|---|---|
| `signs_billboard` | anim | 52×36 | bottom | (90, 94), on B's roof | x 64–115, rows 58–93 |
| `signs_pylon` | anim | 24×80 | bottom | (146, 132), in the lot | x 134–157, rows 52–131 |
| `signs_blade` | anim | 10×32 | top-left | (274, 80), on E's facade | x 274–283, rows 80–111 |
| `signs_neons` | anim | 320×32 | top-left | (0, 104) | rows 104–135, only at the sign spots |
| `signs_holo` | anim | 44×64 | bottom | (201, 110), on D's roof; the scene sets opacity 0.85 | x 179–222, rows 46–109 |

- **billboard**: a 48×22 video panel (x 66–113, rows 60–81) in a steel frame on scaffold legs with
  cross-bracing down to the roof. Under the panel is a catwalk with two sodium flood lamps on arms
  (`a` heads) lighting it from below. Three original ads, 80 frames each: (1) a bleached grinning face
  in mirror shades under a sun, on teal (a sunscreen ad, ironic); (2) a chunky car with speed lines
  on grimy red; (3) a head in profile with a glowing teal chip, on dusty yellow. Each ad changes after
  a 4-frame scanline glitch (frames 76–79, 156–159, 236–239). The screen is painted in bright
  non-emissive tones (`U Y J M L`), apart from small glints. The sun rims the frame's top and left
  edges (`L`).
- **pylon**: a Californian roadside pole sign gone cyberpunk. A 4-px pole (`c e`) at x 144–148 rises
  from row 131. On top is an arrow-shaped marquee whose sodium bulbs (`o a A`) chase toward its tip
  (period 8, all loop). Below it is a cabinet with an invented 4–5 letter word in neon (`p P`, tubes
  dark `r` when off) over a small teal pictogram panel. The letters are dark in frames 0–59, flicker
  on one by one in 60–90, hold, and go dark again at 228. The sun rims the top and left edges.
- **blade**: a vertical sign box (`K C`) with brackets to the wall on its left, holding 4–5 stacked
  neon glyphs (`p P`). One glyph is dead (`r`) and one buzzes (seeded flicker). The whole sign drops
  out in frames 150–170 and buzzes back.
- **neons**: the shop signs at the sign spots of the table (nothing elsewhere):
  - A: a wrench pictogram and a short invented word in teal (`z x`);
  - B: a chili or taco pictogram in red (`p P`) with warm letters (`a`);
  - D: a bottle pictogram and an "open"-style bar in `p P`, off until it stutters on at 180–200 and
    goes off at 20;
  - E: a shirt or washer pictogram in teal;
  - F: an eye with a circuit, in `z x` (no medical cross).

  Each sign has its own small flicker. The board behind (drawn by strip) stays visible around the
  tubes.
- **holo**: a projector box (`K C`, a lens `x`) on D's roof (box bottom rows), casting a thin beam cone
  and a translucent hologram about 50 px tall: a giant figure in a jacket, bust and shoulders, turning
  slowly (one sway over the 240 frames), drawn in `Z z x` only. Scanlines: every third row is `Z`,
  scrolling up 1 px every 2 frames. It glitches in frames 200–215 (slices shifted 1–3 px, one blank
  frame).
- **Light**: the signs light themselves (emissive keys). The structures (frames, legs, poles,
  brackets) are lit by their own lamps from below and by the sun's rim on their top and left edges
  where they stand above row 100.

### 6. street: `part_street.px.js`

| Asset | Kind | Box | Pivot | At |
|---|---|---|---|---|
| `street_ground` | sprite (or anim) | 320×44 | top-left | (0, 136), covering rows 136–179 |
| `street_front` | anim | 320×150 | top-left | (0, 30), covering rows 30–179 |
| `street_steam` | anim | 40×50 | bottom | (262, 162), the manhole; the scene sets opacity 0.45 |
| `street_pools` | anim | 320×44 | top-left | (0, 136); the scene uses it as a `light` layer |
| `street_pools_soft` | anim | 320×44 | top-left | (0, 136); a `light` layer at density 0.5 |

- **ground**, by scene row:
  - Far sidewalk, rows 136–141: concrete slabs `e/c` with joints about every 16 px, a grime line at
    the wall foot (row 136, `c`) and a storm drain inlet in the curb.
  - Far curb face, rows 142–143: `C`, painted red (`r m`, worn) at x 60–110.
  - Gutter, row 144: `G`.
  - Road, rows 145–166: asphalt `G g` with worn wheel tracks in `l` along each lane (rows about
    148–151 and 160–164), dark oil stains `0` in each lane's middle, cracks and tar patches, a faded
    and broken double yellow line on rows 155–156 (`u`), and the manhole cover at x 262, row 161.
  - Near curb, rows 167–168: an `E` top edge and a `c` face.
  - Near sidewalk, rows 169–179: lighter slabs (`E e`), joints, cracks and a tag.

  The light spilling from the glass fronts falls on the far sidewalk in front of D (x 174–210), E
  (x 248–272) and B's window (x 70–94): the slabs there are one tone lighter, widening a little
  toward the curb.
- **front**, transparent except for:
  - Two sodium streetlights. Their poles stand at the near curb (bottom row 170) at x 44 and 204,
    3 px wide, `C c` with an `e` sky-lit left edge. They rise to row 76, where a curved arm reaches
    right to a cobra-head lamp at (70, 76) and (230, 76): a `C` housing over `a/A` glass.
  - Two wooden utility poles (`B b f`) at x 112 and 292, from row 170 to row 30, with crossarms on
    rows 34 and 42, insulators, and a transformer can on 292. Power lines (`k`/`K`, 1 px) sag across
    the full width between the poles and off both edges, lowest at about row 58. Service drops run to
    (50, 60) and (304, 92).
  - Curbside props standing on rows 169–171: a trash can with a bag at x 8–15, a hydrant (`m M`) at
    x 150–155, a parking meter at x 176, a newspaper box (`t`) at x 236–243.
- **Moves**: the streetlight at x 204 is off in frames 0–99, stutters on (bursts) in 100–130, holds,
  and cuts out at 237. The one at x 44 is steady. The wires may sway 1 px on a period of 120.
- **steam**: puffs rising from the manhole in pale `E L U`, bending right (a light wind from the left)
  and thinning as they climb. Each puff lives under 240 frames, with staggered births so the loop
  closes.
- **pools / pools_soft**: key `k` only. The core pool under each lamp head is an ellipse about 24×6
  on the road below the head, reaching onto the near sidewalk by the pole. The soft ring is an ellipse
  about 50×12. Both follow the x 204 lamp's state: empty when it is off, stuttering with it.
- **Light**: shade plus the cool sky from above. The poles have their sky-lit left edge, and the
  lamp heads light the tops of their arms. Lamp light on the ground comes from the pools only.

### 7. traffic: `part_traffic.px.js`

| Asset | Kind | Box | Pivot | At |
|---|---|---|---|---|
| `traffic_cars` | anim | 320×40 | top-left | (0, 128), covering rows 128–167 |
| `traffic_shadow` | anim | 320×40 | top-left | (0, 128); the scene uses it as a `shade: 2` layer |
| `traffic_beams` | anim | 320×40 | top-left | (0, 128); a `light` layer at density 0.5 |

- **cars**: two lanes, the near lane drawn over the far one.
  - Far lane: drives **left**, wheels' lowest row 151 (box row 23), at 7.8 px/m. Speed 5 px/frame on
    a span of 600, so each vehicle passes twice a loop. Four or five vehicles with uneven gaps.
  - Near lane: drives **right**, wheels' lowest row 164 (box row 36), at 10 px/m. Speed 6 px/frame on
    a span of 720. Five or six vehicles.

  The vehicles are original and chunky, an 80s retro-future look: a wedge sedan, a rusty pickup, a
  delivery van with an abstract corp stripe, a dusty-yellow (`u U`) cab-like sedan, a matte black corp
  car, a box truck (up to 28 px tall in the near lane) and a motorbike with a rider. No real makes or
  logos. Paints come from the teal, red, stucco and concrete ramps and the darks. Each has `A`/`a`
  headlights at the front and `p`/`P` taillights at the back. The glass is sky-reflecting (`h V`)
  in its upper half and dark (`T K`) below. Roofs and hoods are one tone lighter than the sides,
  sills and wheel wells darkest, wheels `k` with a `c` hub, and a 1-px trim line (`L` or `J`). The
  wheels may alternate the hub between 2 frames.
- **shadow**: key `k`. Under every vehicle, a band from wheel to wheel, 2 rows (far lane) or 3 rows
  (near lane), reaching 2 px past the body at each end, its bottom row on the wheels' lowest row. It
  moves exactly with the vehicle.
- **beams**: key `k`. Ahead of every vehicle, the headlight light on the road: a wedge from the
  headlight forward, about 20 px long (far lane) or 28 px (near lane), 2 rows at the lamp widening to
  4 rows at road level, in the rows just above and on the wheels' lowest row. It moves with the
  vehicle.
- **Light**: the sky from above and street shade. The scene's pools and beams brighten the cars as
  they pass under the lamps, so don't paint that in.

### 8. crowd: `part_crowd.px.js`

| Asset | Kind | Box | Pivot | At |
|---|---|---|---|---|
| `crowd_far` | anim | 320×18 | top-left | (0, 124), covering rows 124–141 |
| `crowd_near` | anim | 320×30 | top-left | (0, 150), covering rows 150–179 |
| `crowd_shadow` | anim | 320×56 | top-left | (0, 124); the scene uses it as a `shade: 2` layer |

- **far**: people on the far sidewalk, feet's lowest row on 139, 140 or 141 (varied for depth),
  adults 10–11 px tall. They walk at 0.75 px/frame with a 12-frame walk cycle, so a walker covers at
  most 180 px a loop.
  - Every walker has a trip: they come out of a doorway (A x 42–47, B 102–107, D 216–221, E 237–242,
    F 306–311) or in at a frame edge, walk, and go into another doorway or off an edge. They are
    absent the rest of the loop. Nobody pops up in the open.
  - People standing: two customers at B's taco window (x 72–92), shifting weight and eating; a smoker
    by E's door (x 230–236) with a 1-px ember `o` and a puff; two people talking at the lot mouth
    (x 120–132); a hooded man leaning on F's wall.
  - About 8–10 figures are visible at any time.
- **near**: people on the near sidewalk, feet's lowest row on 175–178, adults 20–23 px.
  - Walkers cross the whole frame both ways at 1.5 px/frame on a ring of 360 (x −20…340), each
    crossing once a loop, with a 12-frame walk cycle (a 9 px stride). About four go each way, spaced
    so no two overlap for long. A kid on a scooter rides at 3 px/frame on a span of 720.
  - The walkers: a corpo in a suit with a briefcase, a nomad in a dusty duster, a punk with a red
    mohawk, a worker in a teal coverall and hard hat, a woman under a pale sun parasol, an old man
    pushing a shopping cart, and a woman with a chrome arm walking a dog.
  - People standing, at x 160–196 and 250–284 only: a street vendor with a cart and a sun umbrella
    (x 166–190); a busker sitting (x 256–268); someone at the curb lit by a phone (`i`, x 276–282).
  - Draw them as grids or parts, one drawing per pose (`PXL help "characters 10"`).
- **shadow**: key `k`. A flat ellipse at each figure's feet, moving with it: far figures 5–6 px wide,
  1–2 rows (on the feet's row and the one below); near figures 9–11 px wide, 2 rows. The cart's
  wheels get one too.
- **Light**: shade and the cool sky. Head tops and shoulders are one tone lighter, faces 2–3 px of
  skin, clothes mid tone, and the side away from the street darkest. Clothes use the palette's ramps
  (teal, red, stucco, concrete, wood/leather) and the hair `B b f K m U`. The scene's lamp pools light
  those passing under them, so don't paint lamp light in.
