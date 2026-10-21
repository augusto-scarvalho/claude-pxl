# Rotating sprites

Turning pixel art by an arbitrary angle always costs something: pixels get dropped or doubled,
1-pixel details vanish, dithering turns into stripes. pxl spends that cost only where it has to.

## The short version

1. **Exact first.** Quarter turns (`rot: 90`, `angle: 90`), flips, and, for a sprite that is
   symmetric about its pointing direction, the mirror across a diagonal (it turns θ into 90° − θ)
   lose nothing. `directions()` uses them for every direction it can.
2. **Rotate the body, outline after.** Turn the sprite without its outline and give the outline to
   the turned variant: `sprite("arrow_30", { base: "_arrow", angle: 30, outline: "k" })`. A turned
   outline comes out 1px in places and 2px in others; a fresh one is even.
3. **A thing spinning on its upright** needs only half a turn drawn: the frames from 180° on are the
   first half flipped (`flip: "x"`); block the turn out with `model()`/`mesh()` in a `ref: true` layer.
4. **Shapes, not surfaces.** No rotation keeps a checker dither a checker, and texture or
   highlight pixels move unpredictably. Turn the flat shape, then add dither, texture and
   highlights to the turned variant.
5. **Mind the angle** (table below). Small angles are the worst for resampling: `auto` shears them
   into a lean instead.
6. **Draw what matters by hand.** Small sprites (under ~12px), faces and 1px features rarely
   survive a resample. For a direction set, draw the in-between poses yourself and pass them as
   `draw: { 22.5: "_ship_22" }`: every direction derived from them inherits the hand quality.

## API

```js
sprite("ship_30", { base: "_ship_body", angle: 30, outline: "k" })       // any angle, clockwise
sprite("tree_sway", { base: "tree", angle: 6 })                           // small: a sheared lean
sprite("x", { base: "_b", angle: 22.5, rotate: "nearest" })              // force a method

// 16 directions from one pose pointing up (index i = i * 360/16 degrees clockwise), as sprites
// ship_0 .. ship_15 plus a group "ship". With symmetric: true only 22.5 and 45 are resampled;
// 67.5 is 22.5 mirrored across the diagonal, and everything else is a quarter turn of those.
directions("ship", 16, { from: "_ship_body", outline: "k", symmetric: true, pivot: "center",
  draw: { 22.5: "_ship_22" } })   // optional hand-drawn poses, finished (outline included)
```

`angle` runs after `flip`/`rot` and before `outline`, so the outline is drawn around the turned
shape. The canvas grows to hold the turned image; a `pivot` turns with it. Lamps and normal maps
don't survive an arbitrary angle.

## Methods

| `rotate:` | What it does | Wins at |
|---|---|---|
| `"auto"` (default) | quarter turns exact; under 12° off a quarter turn `shear`; otherwise `rotsprite` | everything, unless you know better |
| `"rotsprite"` | Xenowhirl's RotSprite: magnify 8× with Scale2x three times, then sample the turned big image back at 1× (offset chosen to keep samples off edges) | 15°–45°: holds shapes and thin lines best, outlines stay connected |
| `"shear"` | Paeth's three shears: whole rows and columns shift, so every pixel survives, none doubled | small angles (a lean, a sway); dither keeps its pixel count. Large angles warp the shape into stairs |
| `"nearest"` | plain nearest-neighbour sampling | rarely: drops and doubles pixels, breaks thin lines; here for comparison |

None of them invents colors: the palette stays the palette.

## Angles

| Angle (off a quarter turn) | Result | Why |
|---|---|---|
| 0 / 90 / 180 / 270, flips | exact | pixels only move |
| θ and 90° − θ on a symmetric sprite | exact (one from the other) | a diagonal mirror |
| 45° | good | edges become 1:1 diagonals, the cleanest slope after straight |
| 26.57° / 63.43° (2:1), 18.43° / 71.57° (3:1) | good for straight edges | edges become the regular 2:1 / 3:1 stairs pixel artists draw by hand |
| 22.5° / 67.5° | fine from ~12px up | irregular 2-3 pixel steps; the usual 16-direction set |
| 30° / 60° | fine from ~12px up | irregular steps |
| under ~12° | worst to resample | each edge gets one lone step that reads as crooked, not turned (a 5px line turned 10° shifts by a single pixel); `auto` shears instead |

Rules of thumb: 4 directions are free (quarter turns), 8 cost one rotation (45°, or none with a
hand-drawn diagonal), 16 cost two for a symmetric sprite (22.5° and 45°). Rotate dithered or
textured art only as a flat shape. For a wobble or a sway of a few degrees, shear or redraw a
frame; for a tumble (falling, spinning), RotSprite at 8 or 16 steps reads fine.

## What the comparison showed

Sword, ship, slime and a dithered crate at 5°, 10°, 15°, 22.5°, 26.57°, 30° and 45° with each
method: RotSprite kept the sword's hilt and the ship's wings whole where nearest broke them off;
shear kept every pixel but stair-warped the ship at 45°; at 5°-10° both resamplers left a stray
step on the slime while the shear read as a lean; every method turned the crate's checker dither
into stripes; outlining after the turn gave even 1px outlines where turned outlines thickened.

Then on finished sprites from the examples (the knight's sword, head, shield and arm, the palm, the
fan palm and the girl) at 15°, 30°, 45° and 60°: RotSprite kept blades, crossguards, the shield's
rim and cross, the palm's trunk and fronds and the girl's outline whole at every angle; nearest at
30° broke the blade into steps and the girl's outline into gaps. What RotSprite does lose is a
lone pixel against its neighbours (one of the girl's eyes at 60°): the turned image is sampled
back at 1×, so a 1px feature can fall between samples whatever magnifier ran first. Draw that pose
instead, or turn by a quarter and mirror.

## Sources

- RotSprite (Xenowhirl) and Scale2x/EPX: Wikipedia, "Pixel-art scaling algorithms";
  Sonic Retro, "RotSprite". Aseprite's rotation is RotSprite.
- Three-shear rotation: A. W. Paeth, "A Fast Algorithm for General Raster Rotation", Graphics
  Interface 1986.
- cleanEdge (torcado) and MMPX (McGuire & Gagiu, JCGT 2021): newer edge-aware magnifiers; MMPX
  could replace Scale2x inside RotSprite. Not implemented: on the real sprites above RotSprite held,
  and what it lost (1px features) is lost in the sampling back, not in the magnifying.
- Pixel-art practice: slopes of 2:1 and 3:1 for clean edges; draw 3 poses of a symmetric sprite and
  mirror the rest (Spectrum Computing forums).
