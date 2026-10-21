// Subpixel motion: moving a part by half a pixel (after ApplefatGOV's How-to-subpixel, r/PixelArt, and
// 2D Will Never Die's: "animate the anti-aliasing"). Halfway, the part stays where it comes from and
// pushes into its own outline: the outline ahead takes its ramp's tone between it and the fill, the
// fill behind the outline it leaves the same; then the part moves the whole pixel. The silhouette
// never changes, so it works on a game sprite over any background, and the tones come from the
// part's own ramps, not from a background. Above, a block moved three ways with
// stamp(..., { sub: [dx, dy] }), [dx, dy] the way it goes: up and down, across, round. Below, the same
// idle twice: on the left the single-pixel bob, the whole body dropping a pixel at once onto legs that
// get a pixel shorter; on the right the same by half pixels, the head first and the chest a frame
// behind it, the feet never moving.
pal({
  a: "#4f5d7a", k: "#191524",
  G: "#8a8ea0", w: "#eef0f4",                               // the block, its ramp toward the outline
  I: "#1f3a33", H: "#244f44", h: "#2f6b5a", j: "#4f9a72",       // the hood and cloak, dark to light (I: the
                                                            // half step's tone between the ink and the hood's edge)
  S: "#a8644e", s: "#e2a07a", z: "#f4c8a0", e: "#2a1c1c",   // skin, eyes
  R: "#5a2a2e", r: "#7a3b3b", q: "#a8584a",                      // the robe
  b: "#3a2a22", B: "#6a4a36",                               // boots
  Y: "#f2c45a",                                             // the clasp
})
// the tones a half step takes are each ramp's own, between its outline and its fill
ramps("kGw", "kIHhj", "kSsz", "kRrq", "kbB")

// the keeper, in parts: what moves (head, chest) apart from what stays (robe, boots)
sprite("_head", { outline: "k" }, `
  ...HHHHH...
  ..HhhhhhH..
  .HhjjhhhhH.
  .HhjhhhhhH.
  Hhhzzzzshh.
  Hhzezzesh.
  HhzzzzzsH.
  .HhsSSsHH..
  ..HHHHHH...`)
sprite("_chest", { outline: "k" }, `
  ...hhhhhh...
  ..hjjhhhhh..
  .hjhhYYhhhH.
  .hhhhhhhhhH.
  hjhhhhhhhhHH
  hhshhhhhhsHH
  hhSHhhhhhSHH
  .HHHHHHHHHH.`)
sprite("_robe", { outline: "k" }, `
  .rqqrrrrrR.
  .rqrrrrrrR.
  rqrrrrrrrRR
  rqrrrrrrrRR
  RRRRRRRRRRR`)
sprite("_boots", { outline: "k" }, `
  .bb...bb.
  bBb..bBbb`)
sprite("_block", { w: 5, h: 5 }, rect(0, 0, 5, 5, "k"), rect(1, 1, 3, 3, "w"))

const F = 12
// the idle by half pixels, a frame each: how far down the head and the chest are, in px (the chest a
// frame behind)
const HEAD = [0, 0.5, 1, 1, 1, 0.5, 0, 0, 0, 0, 0, 0]
const CHEST = [0, 0, 0.5, 1, 1, 1, 0.5, 0, 0, 0, 0, 0]
// the single-pixel bob: the whole body down at once
const BOB = [0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0]

// which way a part goes at a frame: down (1) or up (-1), from its place the frame before
const way = (list, f) => (list[f] < list[(f + F - 1) % F] ? -1 : 1)
const keeper = (c, f, x, y, sub) => {
  const head = sub ? HEAD[f] : BOB[f], chest = sub ? CHEST[f] : BOB[f]
  c.stamp("_boots", x + 2, y + 27)
  c.stamp("_robe", x + 1, y + 21 + (sub ? 0 : chest))
  c.stamp("_chest", x, y + 12 + chest, { sub: sub && [1, way(CHEST, f)] })
  c.stamp("_head", x + 1, y + 2 + head, { sub: sub && [1, way(HEAD, f)] })
}

anim("subpixel", { w: 128, h: 80, frames: F, fps: 9 },
  rect(0, 0, 128, 80, "a"),
  // three motions, a block each, half a pixel at a time; [dx, dy] the way it goes
  (c) => {
    const t = (c.frame / F) * Math.PI * 2, half = (v) => Math.round(v * 2) / 2, s = Math.sin(t) >= 0 ? 1 : -1, co = Math.cos(t) >= 0 ? 1 : -1
    c.stamp("_block", 18, 14 + half(0.5 - 0.5 * Math.cos(t)), { sub: [1, s] })
    c.stamp("_block", 56 + half(0.5 - 0.5 * Math.cos(t)), 14, { sub: [s, 1] })
    c.stamp("_block", 96 + half(0.5 + 0.5 * Math.cos(t)), 14 + half(0.5 + 0.5 * Math.sin(t)), { sub: [-s, co] })
  },
  text(14, 4, "UP", "w"), text(44, 4, "ACROSS", "w"), text(86, 4, "ROUND", "w"),
  // the idle two ways
  (c) => {
    keeper(c, c.frame, 26, 38, false)
    keeper(c, c.frame, 82, 38, true)
  },
  text(20, 72, "1 PX BOB", "w"), text(76, 72, "SUBPIXEL", "w"))
