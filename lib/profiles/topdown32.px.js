// Action top-down at a 32 px grid: the profile as data, taken with
// include("<path>/lib/profiles/topdown32.px.js"). As topdown16 (its camera, the figure's pitch, the curve in
// tiles, the directions and the timing), its density's own: a new density is redrawn, never scaled
// (scenes §19). Its numbers come from references measured for numbers only, named here in words, and from
// pxl's guides (characters §n, scenes §n); "the lab" is the library's first lab.
// The scale curve, [tall, wide] in tiles by category with the character as the anchor: scenes §19.
genre("topdown32", {
  camera: { kind: "topdown", pitch: 45 },   // as topdown16
  pitch: 30,                                // what stands seen from 30, as topdown16
  grid: 32,
  scale: {
    character: [1.5, 1],   // 48 px: LPC's base figures 46-48 px, 1.5 tiles
    bush: [1, 1], rock: [1, 1], boulder: [2, 2], crate: [1, 1], lamp: [2, 0.5], door: [2, 1],   // as topdown16, in tiles
    tree: [2.5, 2.5],      // 80 px, the lab's tree (an oak 80-96); LPC's trees run 1.8-4.6 tiles, 3.7 the median: a chibi world keeps its trees smaller
    pine: [3.5, 2], house: [4.5, 5],
  },
  heads: 2.5,              // the head 40% (LPC's base)
  dirs: ["s", "e", "n", "w"], mirrored: { w: "e" },
  states: { idle: { frames: 6, ms: [200, 200, 400, 200, 200, 400] }, walk: { frames: 4, ms: 210 }, run: { frames: 8, ms: 70, order: "ABCBADED" }, attack: { frames: 6, ms: [100, 50, 50, 50, 100, 50] } },   // as topdown16
  contract: { rows: "tag", pivot: "feet", boxes: ["foot", "hurt", "hit"], frames: { all: [32, 64], attack: [64, 80] } },
  tones: 4,                // a material
  // figures outlined near-black (71-100% of LPC's edge, 91-100% of Eldiran's 32 px figures); trees and props
  // selective, no full line (14-45% of LPC's trees' edge is a line)
  ink: { character: "#1a1620", tree: "selective", prop: "selective" },
  colors: 24,              // at most a figure (LPC's dressed 19-28)
  light: "from above, a touch toward us (flippable)",
  checks: ["height"],
})
