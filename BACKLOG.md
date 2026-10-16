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
- [ ] **Palette files**: `use("file.hex" | ".gpl" | ".pal")`, relative to the art file (Lospec
  downloads). (Both editors load palettes.)
- [ ] **Import PNG** as an asset (`image("hero.png")`), with a palettize step to the active
  palette. Needs a PNG decoder (pxl only writes PNGs today).
- [ ] **Silhouette / flash**: a placement option that paints every opaque pixel one color
  (hit-flash frames, drop shadows, silhouettes). (Pixelorama Drop Shadow.)
- [ ] **Ping-pong**: `anim(..., { dir: "pingpong" | "reverse" })`, exported as the tag direction.
  (Aseprite tag directions.)

## Next

- [ ] **Curves**: `curve(...)` (bezier) with pixel-perfect strokes, no doubled corners. (Aseprite
  curve tool + pixel-perfect mode.)
- [ ] **Radial gradient** with dithering. (Gradient tool, both editors.)
- [ ] **Free rotation** with RotSprite or cleanEdge. (Aseprite RotSprite; Pixelorama cleanEdge.)
- [ ] **Inside outline and selout** (outline takes the dark shade of the color it touches).
  (Aseprite Outline command.)
- [ ] **Hue-shifted ramp generator**: `ramp("#5aa040", 5)` builds shades that shift hue. (Aseprite
  Shading ink, Pixelorama shading with hue shift.)
- [ ] **Sheet extrude / padding** against texture bleeding in engines. (Aseprite export options.)
- [ ] **9-slice** for UI panels and buttons. (Aseprite 9-patch slices.)
- [ ] **Asset size inside functions**: `c.size("name")` (found building the iso example).

## Later / niche

- [ ] Layer blend modes and opacity (multiply, screen, ...): leave the palette; `shade`/`light`/
  `glow` cover most uses.
- [ ] Onion skin in the live viewer.
- [ ] Isometric `tilemap` and export to Tiled (`.tmj`) for engines.
- [ ] Bigger fonts, or a bitmap font from a sprite.
