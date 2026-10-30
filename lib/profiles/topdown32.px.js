// Action top-down at a 32 px grid: the profile as data, taken with
// include("<path>/lib/profiles/topdown32.px.js"). As topdown16 (its camera, the figure's pitch, the curve in
// tiles, the directions and the timing), its density's own: a new density is redrawn, never scaled
// (scenes §19). Its numbers come from references measured for numbers only, named here in words, and from
// pxl's guides (characters §n, scenes §n); "the lab" is the library's first lab.
// The scale curve, [tall, wide] in tiles by category with the character as the anchor: scenes §19.
genre("topdown32", {
  camera: { kind: "topdown", pitch: 45 },   // as topdown16
  pitch: 45,                                // the figures seen from 45 too, as topdown16's (The Minish Cap's and A Link to the Past's heroes)
  stand: 30,                                // what else stands (trees, houses) seen from 30, as topdown16
  grid: 32,
  scale: {
    character: [1.5, 1],   // 48 px: LPC's base figures 46-48 px, 1.5 tiles
    bush: [1, 1], rock: [1, 1], boulder: [2, 2], crate: [1, 1], lamp: [2, 0.5], door: [2, 1],   // as topdown16, in tiles
    tree: [2.5, 2.5],      // 80 px, the lab's tree (an oak 80-96); LPC's trees run 1.8-4.6 tiles, 3.7 the median: a chibi world keeps its trees smaller
    pine: [3.5, 2], house: [4.5, 5],
  },
  // Two families of body at 48 px, by their proportions whatever the camera (library F5 4b): the slim the default
  // (Chained Echoes' heads 33-40% of the height, Children of Morta's 23-28%, the traveler's 32%; lib/characters/hero.px.js
  // SLIM32), the chibi the other (LPC's base 40-45%, Secret of Mana's and Chrono Trigger's heroes 43-48%; G32). Head
  // and legs as shares of the height on the sprite, `wide` facing us and in profile in px
  heads: 3.4,
  body: { default: "slim", slim: { heads: 3.4, head: 0.29, legs: 0.37, wide: [19, 17] }, chibi: { heads: 2.4, head: 0.42, legs: 0.29, wide: [27, 24] } },
  dirs: ["s", "e", "n", "w"], mirrored: { w: "e" },
  // the games' moves at 48 px (library F5 4c-4d): a walk in 8 (contact, down, passing, up: Children of Morta's 8 at
  // 90-100 ms) over topdown16's 0.84 s; a run of 8 poses, one in the air; the sword in 8: 2 to wind up, the strike in
  // one (the arc a crescent), the hit held, 4 to fade and recover (Children of Morta 4+1+4 at 90, Dead Cells 7+2+3)
  states: { idle: { frames: 6, ms: [200, 200, 400, 200, 200, 400] }, walk: { frames: 8, ms: 105 }, run: { frames: 8, ms: 70 }, attack: { frames: 8, ms: [90, 110, 50, 100, 70, 70, 70, 70] } },
  // the sword 0.6 of the height wants the attack's 96 px; the chibi's head leaning ahead running, 38
  contract: { rows: "tag", pivot: "feet", boxes: ["foot", "hurt", "hit"], frames: { all: [38, 64], attack: [96, 96] } },
  tones: 4,                // a material
  // figures outlined near-black (71-100% of LPC's edge, 91-100% of Eldiran's 32 px figures); trees and props
  // selective, no full line (14-45% of LPC's trees' edge is a line)
  ink: { character: "#1a1620", tree: "selective", prop: "selective" },
  colors: 24,              // at most a figure (LPC's dressed 19-28)
  light: "from above, a touch toward us (flippable)",
  checks: ["height"],
})
