// Action top-down at a 16 px grid (an action RPG seen from above, a Zelda-like): the profile as data, taken
// with include("<path>/lib/profiles/topdown16.px.js"). What names it (genre: "topdown16") is checked by it;
// pxl lib --genre topdown16 lists the library at its cell; pxl lib draft <entry> --genre topdown16 draws a 3D
// entry in it (at the figure's pitch, its box of tiles, its tones and line). Its numbers come from references
// measured for numbers only, named here in words (their pixels never taken), and from pxl's guides:
// characters §n, scenes §n; "the lab" is the library's first lab (its tree, chibi, fighter and car).
// The scale curve, [tall, wide] in tiles by category with the character as the anchor: scenes §19.
genre("topdown16", {
  camera: { kind: "topdown", pitch: 45 },   // the ground seen from 45 degrees (the lab's chibi; scenes §16)
  pitch: 30,                                // what stands (figures, trees, houses) seen from 30: the lab's chibi showed its face and chest; the drafted trees show their trunks, as Ninja Adventure's do
  grid: 16,
  scale: {
    character: [1.5, 1],   // 24 px: A Link to the Past's hero 22 px (characters §13), the top-down hero 24
    bush: [1, 1],          // Ninja Adventure's bushes, 12-15 px
    rock: [1, 1],          // a tile, as a crate (scenes §16)
    boulder: [2, 2],       // Ninja Adventure's boulders, 30-31 px
    crate: [1, 1],         // scenes §16 (8 px of top over 7 of front); the library's plain crate 14x12
    lamp: [2, 0.5],        // a post over the figure and a head; the library's box lamp 9x32
    door: [2, 1],          // a little over the tallest figure (scenes §1)
    tree: [2.5, 2.5],      // the lab's tree (an oak 2.5-3 tall); Ninja Adventure's trees 2-3 tiles (32x29-32, 48x48)
    pine: [3.5, 2],        // the lab's (a pine 3-4 tall)
    house: [4.5, 5],       // by the door rule; no house measured yet
  },
  heads: 2.5,              // the head 40% of 24 px (characters §1; LPC's base)
  dirs: ["s", "e", "n", "w"], mirrored: { w: "e" },   // the 16-bit way (characters §13); Puny Characters draws all 8, never one the other's mirror: not needed here
  // the hero's, after SLYNYRD (characters §12); run in the order ABCBADED
  states: { idle: { frames: 6, ms: [200, 200, 400, 200, 200, 400] }, walk: { frames: 4, ms: 210 }, run: { frames: 8, ms: 70, order: "ABCBADED" }, attack: { frames: 6, ms: [100, 50, 50, 50, 100, 50] } },
  // a sheet a row a tag, the pivot the feet on a tile's middle; foot and hurt boxes, hit on the attack's active frames; frames [w, h] px
  contract: { rows: "tag", pivot: "feet", boxes: ["foot", "hurt", "hit"], frames: { all: [16, 32], attack: [32, 40] } },
  tones: 3,                // a material, at 16-32 px (the lab's trees)
  ink: "#1a1620",          // a near-black line all round: 89-97% of Puny Characters' edge, 70-86% of Ninja Adventure's trees' (the library's k)
  colors: 15,              // at most a sprite (characters §13; Puny's dressed 15-17)
  light: "from above, a touch toward us (flippable)",
  checks: ["height"],      // the same height over the pivot in 4 directions
})
