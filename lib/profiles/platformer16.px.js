// A platformer at a 16 px grid, seen from the side: the profile as data, taken with
// include("<path>/lib/profiles/platformer16.px.js"). Its numbers come from pxl's guides (characters §n,
// scenes §n) and the library's first lab ("the lab"); no platformer sheet is measured yet: the figure's
// height and the line wait on one.
// The scale curve, [tall, wide] in tiles by category with the character as the anchor: scenes §19.
genre("platformer16", {
  camera: { kind: "side", pitch: 0 },
  grid: 16,
  scale: {
    character: [1.5, 1],   // 24 px: figures 1x1 to 2x2 tiles, 22-27 px tall in a 16x32 frame (scenes §15); the top-down hero's rig
    lamp: [2, 0.5], crate: [1, 1], tree: [2.5, 2.5],   // as topdown16
    coin: [0.5, 0.5],
  },
  moves: { jump: 2, stair: 0.5 },   // tiles: a jump 2, a stair 8 px a step (scenes §15)
  heads: 2.5,
  dirs: ["e", "w"], mirrored: { w: "e" },
  // characters §12: run 3 drawings a step (passing, push-off, contact); a jump an up pose and a down pose, rising
  // 6, 5, 3, 2, 1 px a frame, the apex held 2, falling 2-6 px a frame at 60 ms; a landing crouch, the head 1 px
  // low; hurt 2 and the hit flash
  states: { idle: { frames: 2, ms: 300 }, run: { frames: 6, ms: 100 }, jump: { rise: [6, 5, 3, 2, 1], apex: 2, fall: [2, 6], ms: 60 }, land: { frames: 1 }, hurt: { frames: 2, flash: true } },
  // a sheet a row a tag, the pivot the feet; the player's hurt box a small one at its middle (scenes §15); data: { air } on a jump's frames
  contract: { rows: "tag", pivot: "feet", boxes: ["hurt"], data: ["air"] },
  tones: 3,
  ink: "#1a1620",          // a near-black line all round, as topdown16 (no platformer measured yet)
  // the ground's tones at most 0.05 apart in lightness, the brightest 1 px line on every top a figure stands on,
  // the planes behind -20 saturation, -15 contrast, +15 lightness (scenes §15)
  ground: { apart: 0.05 }, backdrop: { saturation: -20, contrast: -15, lightness: 15 },
  checks: ["ground"],      // the feet on one row through a move (a jump's air frames: skipped once the check reads data.air)
})
