// Subpixel motion: moving a part by half a pixel. Its edge takes the tone between its color and what it
// moves over, then the part moves the whole pixel (after ApplefatGOV's How-to-subpixel, r/PixelArt).
// Above, a block moved four ways with stamp(..., { sub: true }): up and down, across, round, and
// growing (two halves moving apart). Below, the same idle twice: on the left the single-pixel bob,
// the whole body dropping a pixel at once onto legs that get a pixel shorter; on the right the same by
// half pixels, the head first and the chest a frame behind it, the feet never moving.
const hex = (c) => "#" + c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const mix = (a, b) => hex(rgb(a).map((v, i) => (v + rgb(b)[i]) / 2))   // the tone between two
const BG = "#4f5d7a", K = "#191524", CLOAK = "#2f6b5a", ROBE = "#7a3b3b", BLOCK = "#eef0f4"
pal({
  a: BG, k: K, w: BLOCK,
  H: "#244f44", h: CLOAK, j: "#4f9a72",                     // the hood and cloak, dark to light
  S: "#a8644e", s: "#e2a07a", z: "#f4c8a0", e: "#2a1c1c",   // skin, eyes
  R: "#5a2a2e", r: ROBE, q: "#a8584a",                      // the robe
  b: "#3a2a22", B: "#6a4a36",                               // boots
  Y: "#f2c45a",                                             // the clasp
  // the in-between tones the edges take, half a pixel along: each part's outline and colors over what
  // they move across
  1: mix(K, BG), 2: mix(K, CLOAK), 3: mix(K, ROBE), 4: mix(BLOCK, BG), 5: mix(CLOAK, BG), 6: mix(ROBE, CLOAK),
})
ramps("kHhj", "kSsz", "kRrq", "kbB")

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
sprite("_block", { w: 3, h: 3 }, rect(0, 0, 3, 3, "w"))
sprite("_half", { w: 2, h: 3 }, rect(0, 0, 2, 3, "w"))

const F = 12
// the idle by half pixels, a frame each: how far down the head and the chest are, in px (the chest a
// frame behind)
const HEAD = [0, 0.5, 1, 1, 1, 0.5, 0, 0, 0, 0, 0, 0]
const CHEST = [0, 0, 0.5, 1, 1, 1, 0.5, 0, 0, 0, 0, 0]
// the single-pixel bob: the whole body down at once
const BOB = [0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0]

const keeper = (c, x, y, head, chest, sub) => {
  c.stamp("_boots", x + 2, y + 27)
  c.stamp("_robe", x + 1, y + 21 + (sub ? 0 : chest))
  c.stamp("_chest", x, y + 12 + chest, { sub })
  c.stamp("_head", x + 1, y + 2 + head, { sub })
}

anim("subpixel", { w: 128, h: 80, frames: F, fps: 9 },
  rect(0, 0, 128, 80, "a"),
  // the four motions, a block each
  (c) => {
    const t = (c.frame / F) * Math.PI * 2, half = (v) => Math.round(v * 2) / 2
    c.stamp("_block", 12, 14 + half(0.5 - 0.5 * Math.cos(t)), { sub: true })
    c.stamp("_block", 38 + half(0.5 - 0.5 * Math.cos(t)), 14, { sub: true })
    c.stamp("_block", 64 + half(0.5 + 0.5 * Math.cos(t)), 14 + half(0.5 + 0.5 * Math.sin(t)), { sub: true })
    const g = half(0.5 - 0.5 * Math.cos(t))
    c.stamp("_half", 89 - g, 14, { sub: true }); c.stamp("_half", 91 + g, 14, { sub: true })
  },
  text(8, 4, "UP", "w"), text(30, 4, "ACROSS", "w"), text(58, 4, "ROUND", "w"), text(84, 4, "GROW", "w"),
  // the idle two ways
  (c) => {
    keeper(c, 26, 38, BOB[c.frame], BOB[c.frame], false)
    keeper(c, 82, 38, HEAD[c.frame], CHEST[c.frame], true)
  },
  text(20, 72, "1 PX BOB", "w"), text(76, 72, "SUBPIXEL", "w"))
