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
- [x] **Palette keys in the file** (dogfood): `1a1626 k ink` (a one-character word after the color;
  the name in a `.gpl`), so a shared palette needs no `pal({ k: 0, K: 1, ... })` index mapping.
- [ ] **Asset size inside functions**: `c.size("name")` (found building the iso example).

## Later / niche

- [ ] Layer blend modes and opacity (multiply, screen, ...): leave the palette; `shade`/`light`/
  `glow` cover most uses.
- [ ] Onion skin in the live viewer.
- [ ] Isometric `tilemap` and export to Tiled (`.tmj`) for engines.
- [ ] Bigger fonts, or a bitmap font from a sprite.
