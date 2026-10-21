# pxl lighting (Terraria-style)

Contents: Setup in three parts · lamp() · lighting() options · Layer flags · Normal maps · Glow on
top of the light · Tips

Light spreads over a grid of cells from lamps and the sky. Open cells cost a fixed amount (so a
lamp's `r` is its reach). Solid cells keep only a fraction of the light that enters, so bright
light seeps deeper into blocks than dim light. Rooms fill with light, wall and ground edges fade
out over a few cells, and deep ground stays black. The result multiplies the image's RGB, so lit
art leaves the palette by design.

## Setup in three parts

```js
sprite("torch", `
  .y.
  yYy
  .Y.
  .b.`, lamp(1, 1, { r: 44, color: "#ffb35c" }))        // the lamp travels with every stamp

scene("cabin", { w: 200, h: 130, bg: "n" },
  layer("sky", { unlit: true }, grad(0, 0, 200, 100, "nN")),  // backdrop: never lit
  layer("ground", { solid: true }, ...),                       // blocks light
  layer("backwall", { wall: true }, ...),                      // light passes; sky light doesn't start here (it can spread in)
  layer("frame", { solid: true }, ...),                        // floors, roof, outer walls
  layer("props", stamp("torch", 70, 82), ...),
  lighting({ cell: 4, sky: 0.9, skyColor: "#d8ccf0", ambient: 0.03, emit: "yY" }),
  layer("ui", ...))                                            // after lighting() = not lit
```

Full demo: `examples/lighting.px.js`.

## lamp(x, y, { r = 32, color = "#fff", power = 1, z = 8 })

A light source. It's an op, so it goes anywhere: in a sprite body (torches, chandeliers, lanterns,
lava), in a layer, or in a function as `c.lamp(...)`. Lamps travel with their image through
`stamp`, `tile`, `pattern`, `tilemap`, `scatter`, wire `hang`, `base`, flips and quarter turns (`rot`; any other `angle` drops them, see rotation.md). `mx`/`my`
mirroring copies them too, so a symmetric chandelier needs one lamp. `r` is the reach in pixels
through open space at power 1 (it scales with `power`). `power` is the starting intensity: above 1 it overexposes near the source and
pushes further into blocks. `z` is the lamp's height above the picture, used only by normal maps:
low (2–6) rakes across the relief, high (20+) lights it head-on.

## lighting({ ... }) options

Goes directly in a sprite or scene body (not inside a layer) and lights everything drawn before it.
It uses every lamp placed so far and consumes them, so a lit asset stamped elsewhere isn't lit
twice.

| Option | Default | Meaning |
|---|---|---|
| `cell` | 4 | Light-grid cell size in px. Bigger = blockier (Terraria look); 1 = per pixel. |
| `smooth` | false | Interpolate between cells instead of hard steps. |
| `block` | 0.4 | Fraction of light lost per 8px of solid (0..1), independent of `cell`. Solids never pass more light than open space. Lower = light seeps deeper into blocks. |
| `sky` | 0 | Sky light level (0..1+, also how deep it seeps into the ground), seeded in cells open to the sky (top of each column down to the first solid or wall cell). |
| `skyColor` | white | |
| `skyReach` | 24 | How far sky light spreads from open cells, in px (into doorways, ground edges). |
| `ambient` | 0 | Minimum light everywhere, 0..1. Keep it low (0.02–0.08) for Terraria-black darkness. |
| `ambientColor` | white | |
| `emit` | — | Keys that ignore lighting: flames, glowing windows, lava (`"yYG"`). |
| `shape` | `"round"` | `"diamond"` spreads to 4 neighbours only (diamond-shaped pools). |
| `relief` | 1 | How strongly normal maps shape the light; 0 ignores them. |
| `skyDir` | `[0, -1]` | Where the sky light comes from, for normal maps, on screen like `light` elsewhere (`[0, -1]` above, `[-1, -1]` the upper left). |

Overlapping lights combine by max per channel, so they don't blow out.

## Layer flags

| Flag | Effect |
|---|---|
| `solid: true` | Opaque pixels block light (a cell is solid when half or more of its pixels are). |
| `wall: true` | Back walls: light passes through, but sky light doesn't start there. Without one, rooms open at the sides fill with sky light. |
| `unlit: true` | Pixels this layer leaves visible are drawn as-is (sky, distant backdrop). Layers drawn on top of it are still lit. |

## Normal maps (relief)

Pixels can carry a surface direction. `lighting()` then brightens the sides that face each light
and darkens the sides that face away, so bricks, domes and bevels catch the light as it moves.
Flat or unmapped pixels light exactly as before. Normals travel with the pixels through stamps,
flips, quarter turns and mirroring (any other `angle` drops them). A layer drawn on top without normals clears them where it covers.

```js
sprite("bricks", { w: 32, h: 24 }, pattern("_brick", 0, 0, 32, 24),
  bump("bevel", { on: "b", w: 1 }))                        // each 3px brick bevelled; mortar is the edge
sprite("slime", ..., bump("dome", { depth: 1.5 }))          // the blob bulges like a pillow
sprite("rock", ..., bump("luma", { depth: 2 }))             // the existing shading becomes relief
sprite("crate", `...`, normals(0, 0, `
  7888889
  4555556
  1222223`))                                                // hand-painted, numpad directions
```

`bump(shape = "dome", { w, depth = 1, on = "*", where })` works on the current sprite or layer's
opaque pixels:

| Shape | Height comes from |
|---|---|
| `"dome"` | Each connected blob bulges, steep at the rim and flat at the top (barrels, slimes, fruit). |
| `"bevel"` | Edges slope over `w` px (default 2), with a flat top (bricks, panels, buttons, tiles). Keep `w` under half the shape's smallest side: a 3px-tall brick needs `w: 1`, or it has no flat top and reads as a hole under a near lamp. |
| `"luma"` | Brightness: lighter pixels are higher. Good for art that's already shaded. |

`on` limits it to some keys, and the other keys act as edges, so `on: "b"` bevels every brick
separately. The image border counts as an edge too. `depth` sets the steepness.

`normals(x, y, grid)` paints directions with the numpad: `8` faces up, `2` down, `4` left, `6`
right, `7 9 1 3` the diagonals, `5` straight at the viewer. `q w e / a s d / z x c` are the same
directions with a gentler tilt. `0` clears a normal and `.` skips.

`pxl build` also writes `<name>_n.png` for every sprite or scene that has normals. It uses the
usual engine encoding (RGB = normal × 0.5 + 0.5, green pointing up, flat = `#8080ff`), so Godot,
Unity and similar engines can light the sprite with it. The viewer shows a **normal map** frame
before the light map.

Full demo: `examples/normals.px.js` (`relief` animates a lantern swinging past; `lit` and `flat`
compare the same lamp with and without relief).

## Glow on top of the light

Lighting darkens; it doesn't make things shine. Add `glow()` after `lighting()` for halos around
flames, potions, moons and eyes (see reference.md, "Glow"). Glowing pixels are found by their
palette key even though lighting changed their colors, so you don't need them in `emit` (though
`emit` keeps them at full brightness):

```js
lighting({ cell: 2, smooth: true, ambient: 0.4, emit: "zQ" }),
glow("zgG", { r: 7, strength: 0.3 }),                      // potion
glow("lLah", { where: [155, 66, 26, 22], r: 14, keep: "WuK" }),  // just the fire; its logs keep their shapes
glow("L", { r: 5, strength: 0.7 })                          // candle flames
```

The halo lifts everything in reach, what the glowing thing is made of too: the logs and stones
under a fire turn to one tan blob. `keep: "WuK"` leaves those keys as drawn (give them keys of their
own, or whatever shares them near the fire stays unlit too).

## Tips

- Look at the result with `PXL shot`, and at the light alone in describe's LIGHT map (brightness
  per cell after lighting). The live viewer's painting steps also show a **light map** frame right
  before the lit result.
- Lamps don't tell `pxl check` where the light comes from; `world.light` does. For a scene lit by a
  fire or a lamp, give the scene `world: { light: { at: [x, y] } }` at that lamp, and each object's
  lit side is checked against the way from it to there (`check` says "not run: lit side" without it).
- Doors, windows and holes in floors are just gaps in the `solid` layer. Light flows through them.
- Too dark? Raise the lamp's `r` before `power`. Light reaching too far into the ground? Raise `block`
  (0.5–0.6). Want more Terraria-style glow through dirt? Lower it (0.25–0.3).
- Smaller `cell` for small sprites and close-ups, 4–8 for scenes.
- Three lights on a sprite (Saint11): a warm key that makes the bright side, a hard terminator and the
  specular; a weak fill on the other side lifting the shadow one step; a rim, only a 1 px line in a
  cool color on the far edge (a `relight` of its own, or a lamp of another color behind). Light from
  below reads as horror; a cone of light needs dust in it and a bright core; put a dark background
  behind the lit side. In the dark, let the darks merge into one background color, keep a strong
  rim, and find each shadow's edge with lines from the light tangent to the thing.
- A flame's flicker stays in its own few pixels, not on the wall it lights; a quiet room's loop can
  run 5 s and more.
