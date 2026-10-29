// Action top-down at a 16 px grid (an action RPG seen from above, a Zelda-like): the profile as data, taken
// with include("<path>/lib/profiles/topdown16.px.js"). What names it (genre: "topdown16") is checked by it;
// pxl lib --genre topdown16 lists the library at its cell; pxl lib draft <entry> --genre topdown16 draws a 3D
// entry in it (seen from its `stand`, its box of tiles, its tones and line). Its numbers come from references
// measured for numbers only, named here in words (their pixels never taken), and from pxl's guides:
// characters §n, scenes §n; "the lab" is the library's first lab (its tree, chibi, fighter and car).
// The scale curve, [tall, wide] in tiles by category with the character as the anchor: scenes §19.
genre("topdown16", {
  camera: { kind: "topdown", pitch: 45 },   // the ground seen from 45 degrees (the lab's chibi; scenes §16)
  pitch: 45,                                // the figures seen from 45 too, as The Minish Cap's and A Link to the Past's heroes are (library F5's top-down study)
  stand: 30,                                // what else stands (trees, houses) seen from 30: at 45 a tree hides its trunk under its crown (F5's gate 0b), at 30 it shows, as Ninja Adventure's do;
                                            // what lies flat (the ground, a rug, a pier's deck) seen from above, its edges' faces from the front

  grid: 16,
  scale: {
    character: [1.5, 1],   // 24 px and its line: A Link to the Past's hero 21-22 px, The Minish Cap's 25 (library F5's top-down study; characters §13)
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
  // a chibi's body, the torso twice the legs: 2.1 heads in 3D, so seen from 45 the head is 14 rows of the sprite's 26
  // (its line round them), 54%, 1.85 heads; The Minish Cap's hero 1.6 heads (64%), A Link to the Past's 1.75 (57%),
  // Secret of Mana's 2.1 (48%) (library F5's top-down study)
  heads: 2.1,
  dirs: ["s", "e", "n", "w"], mirrored: { w: "e" },   // the 16-bit way (characters §13); Puny Characters draws all 8, never one the other's mirror: not needed here
  // the hero's, after SLYNYRD (characters §12); run in the order ABCBADED
  states: { idle: { frames: 6, ms: [200, 200, 400, 200, 200, 400] }, walk: { frames: 4, ms: 210 }, run: { frames: 8, ms: 70, order: "ABCBADED" }, attack: { frames: 6, ms: [100, 50, 50, 50, 100, 50] } },
  // a sheet a row a tag, the pivot the feet on a tile's middle; foot and hurt boxes, hit on the attack's active frames; frames [w, h] px
  // (18 wide: the hero's profile, its head 16 px deep with the hair, leans a pixel ahead walking and two running)
  contract: { rows: "tag", pivot: "feet", boxes: ["foot", "hurt", "hit"], frames: { all: [18, 32], attack: [32, 40] } },
  tones: 3,                // a material, at 16-32 px (the lab's trees), the steps between them strong; the grass one ramp the trees and bushes share
  // the line by kind (the user's call, library F5's coherent kit): the figures (the hero, the people, creatures) a near-black
  // line all round (89-97% of Puny Characters' edge; The Minish Cap's hero black on half of it, his own darks on the rest);
  // what else stands (trees, houses, rocks, bushes, props) none in black: its edge in its own material's darkest tone
  // (selout), strong (V 20-45, as The Minish Cap's scenery's), or none where its tones carry the shape; the ground
  // (grass, path, shore, water) and effects (dust) none
  ink: { character: "#1a1620", rest: "selout", ground: "none", effect: "none" },
  colors: 15,              // at most a sprite (characters §13; Puny's dressed 15-17)
  // one light for all: from the upper left, a touch toward us (the fronts we see lit); a figure lit from above, flat
  // side to side, so the game flips it
  light: "from the top left, a touch toward us",
  // one shadow for all that stands, as the school makes it (The Minish Cap: a band right under a thing, a tree's 70%
  // of its crown, 2-6 rows, no offset; library F5's environment study): a flat ellipse on the ground round its foot
  // (its drawing's lowest row), one shade step (a shade layer's 1: on the island's grass, toward teal), its radii a
  // share of the thing's width (wide; deep, at most `most` px), under its middle; a building's a band its whole width
  // along its foot and a strip down its right side from its eaves (as the school's houses); no cast silhouettes beside it
  shadow: { shape: "ellipse", shade: 1, wide: 0.36, deep: 0.1, most: 2, right: 0 },
  checks: ["height"],      // the same height over the pivot in 4 directions
})
