// A top-down village's props at a 16 px grid (lib/profiles/topdown16.px.js), drawn by hand as the action top-down
// school draws them (A Link to the Past, The Minish Cap; library F5's top-down and environment studies): a clear
// silhouette, edged in each material's own darkest, strong (the clay's, the wood's, the iron's: topdown16's black
// line is the figures' alone), 3 tones a material and a glint, high key, lit from the upper left, seen steeply (a top
// shows more than a front). A pot to lift and break (pot; pot_break: it cracks, bursts, lies in shards), a chest
// (chest, chest_open; chest_opening plays it), a sign to read, a crate, a barrel, a lamp post and a fence (a row of
// 16 px tiles and an end post). For any scene: include("<path>/lib/props/village.px.js", { as: "village" }), its
// palette its own.
pal({
  d: "#2a1836",                                                        // a dark inside: a pot's mouth, an open chest, a crack
  q: "#6e2420", o: "#b4452c", O: "#e8763e", P: "#ffb26a", Q: "#fff0c8", // clay: its line, shade, body, light, a glint
  w: "#5e2c1a", W: "#b8743c", V: "#f0b066",                            // wood: its line and shade, body, light
  G: "#c07a14", g: "#ffd84a",                                          // gold: its shade, its light
  i: "#3e3a58", I: "#8a88a8",                                          // iron: its shade, its light
  L: "#ffd060", l: "#fff8d0",                                          // a lamp's glass, lit from inside
  E: "#5a4048", e: "#a8967a", f: "#d8c8a8", F: "#fff6e2",              // a fence's pale wood: its line, shade, side, lit top
})
ramps("qoOPQ", "wWV", "Gg", "iI", "EefF")
// in a block: its names stay its own when a scene includes the file
{
// ---------------------------------------------------------------- the pot
// 14 x 13 with its edge, seen steeply as the school draws it: its mouth a wide ring in its upper half (the rim lit,
// the inside dark), its shoulder lit on the left with a glint, its belly in shade on the right, its foot.
const POT = `
  ...PPPPPP...
  .PPoddddoPP.
  PPoddddddoPO
  OPPoddddoPPO
  OOPPPPPPPPOO
  OPPOOOOOOOOo
  PQOOOOOOOOoo
  POOOOOOOOooo
  OOOOOOOOoooo
  .OOOOOOoooo.
  ..oooooooo..`
sprite("pot", { outline: "q", pivot: "bottom" }, POT)
card("pot", { is: "a clay pot to lift and break, 14x13: its mouth a wide ring seen from above, a lit shoulder with a glint, its belly in shade", cells: { "topdown/16": "✎" },
  vary: { part: "pot_break: it cracks, bursts, lies in shards" } })
// Broken (3 frames, 20 x 16 with the edge, the pot where pot stands): a crack down from its mouth; burst, its rim
// flying up and its sides out; its shards on the ground.
anim("pot_break", { w: 18, h: 14, outline: "q", pivot: "bottom", loop: false },
  frame({ ms: 80 }, grid(3, 3, POT), grid(9, 8, "d\nd"), grid(10, 10, "d\n.d"), grid(8, 12, "dd")),
  frame({ ms: 100 }, `
  ...PPP.......PP...
  ..PPd.........PP..
  ...O..........O...
  ..................
  .OPP...PPPP...PPO.
  OPPO...OOOO...OOOO
  .OOo...oooo...oOO.
  ..................
  ..oO...OOOO...Oo..
  ..OO...OOOO...OO..
  .......oOOo.......
  ........oo........`),
  frame({ ms: 400 }, `
  ..................
  ..................
  ..................
  ..................
  ..................
  ..................
  ..................
  ..................
  ..................
  ..PP..........OP..
  .OPo...........oO.
  ......oOPPOo......
  .....oo....oo.....
  ..................`))
// ---------------------------------------------------------------- the chest
// 16 x 16 with its edge: a wooden chest, its lid's top lit, gold bands down its corners, a gold lock plate and
// its keyhole; open, the lid back (its underside in shade, its band's edge), the inside dark with a gold glint.
const BOX = `
  GgWWWggggWWWgG
  GgWWWgddgWWWgG
  GgWWWggggWWWgG
  GgWWWWWWWWWWgG
  GgWWWWWWWWWWgG
  GGwwwwwwwwwwGG`
sprite("chest", { w: 14, h: 14, outline: "w", pivot: "bottom" }, grid(0, 2, `
  .GgVVVVVVVVgG.
  GgVVVVVVVVVVgG
  GgVVVVVVVVVVgG
  GgVVVVVVVVVVgG
  GgWWWWWWWWWWgG
  GGwwwwggwwwwGG`), grid(0, 8, BOX))
sprite("chest_open", { w: 14, h: 14, outline: "w", pivot: "bottom" }, grid(0, 0, `
  .GgwwwwwwwwgG.
  GgwwwwwwwwwwgG
  GgwwwwwwwwwwgG
  .GGGGGGGGGGGG.
  GddddgdddddddG
  GddddddddgdddG
  GGWWWWWWWWWWGG
  GgWWWWWWWWWWgG`), grid(0, 8, BOX))
anim("chest_opening", { w: 16, h: 16, pivot: "bottom" }, frame({ ms: 700 }, stamp("chest", 8, 16)), frame({ ms: 900 }, stamp("chest_open", 8, 16)))
card("chest", { is: "a wooden chest, 16x16: its lid lit, gold bands down its corners, a gold lock plate", cells: { "topdown/16": "✎" },
  vary: { part: "chest_open: the lid back, a gold glint inside; chest_opening plays the two" } })
// ---------------------------------------------------------------- the sign
// 16 x 15 with its edge: a board on a post, lit along its top, three lines of writing cut into it, its lower edge
// in shade, the post's side in shade.
sprite("sign", { outline: "w", pivot: "bottom" }, `
  VVVVVVVVVVVVVV
  VWWWWWWWWWWWWW
  VWwwwwwwwwwWWW
  VWWWWWWWWWWWWW
  VWwwwwwwWwwwWW
  VWWWWWWWWWWWWW
  VWwwwwwWWWWWWW
  wwwwwwwwwwwwww
  ......WVw.....
  ......WVw.....
  ......WWw.....
  ......wWw.....`)
card("sign", { is: "a wooden sign, 16x14: a board lit along its top, three lines of writing cut into it, on a post", cells: { "topdown/16": "✎" } })
// ---------------------------------------------------------------- the crate, the barrel, the lamp
// What stands faces us and shows its top, seen steeply (its top more than its front): a crate a tile, 16 x 15 with
// its edge, its lid's three boards from above (lit, a dark gap between them, its front lip in shade), its front's
// boards between a lit post on the left and one in shade on the right.
sprite("crate", { outline: "w", pivot: "bottom" }, `
  VVVVVVVVVVVVVV
  VVVVVVVVVVVVVW
  WWWWWWWWWWWWWW
  VVVVVVVVVVVVVW
  VVVVVVVVVVVVVW
  WWWWWWWWWWWWWW
  VVVVVVVVVVVVVW
  VVVVVVVVVVVVVW
  wwwwwwwwwwwwww
  VWWWWWWWWWWWWw
  VwwwwwwwwwwwWw
  VWWWWWWWWWWWWw
  VWWWWWWWWWWWWw`)
card("crate", { is: "a wooden crate, 16x15 with its edge: its lid's three boards from above, its front's boards between a lit post and one in shade", cells: { "topdown/16": "✎" } })
// A barrel, 14 x 16 with its edge: its lid from above (a flat ellipse, its boards lit, a seam), its staves bulging, lit on
// the left and in shade on the right, three iron hoops (the coherent kit's barrel, in the high key and its strong line).
sprite("barrel", { outline: "w", pivot: "bottom" }, `
  ...WWWWWW...
  .WWVVVVVVWW.
  .WVVVWVVVVW.
  .WVVVWVVVVW.
  .IWWVVVVWWi.
  IIIIIIIIIIii
  VVVWWWWWWwww
  VVWWWWWWWWww
  VVWWWWWWWWww
  IIIIIIIIIIii
  VVWWWWWWWWww
  .VWWWWWWWww.
  .IIIIIIIIii.
  ..wwwwwwww..`)
card("barrel", { is: "a barrel, 14x16 with its edge: its lid from above, its staves lit on the left, three iron hoops", cells: { "topdown/16": "✎" } })
// A lamp post, 10 x 32 with its edge (the genre's lamp, 2 x 0.5 tiles): an iron cap seen a little from above, a
// lantern of warm glass in its frame, a post lit on the left, a foot.
sprite("lamp", { outline: "i", pivot: "bottom" }, `
  ..IIII..
  .IIIIII.
  iiiiiiii
  .iLllLi.
  .iLllLi.
  .iLLLLi.
  .iiiiii.
  ...Ii...
  ...Ii...
  ...Ii...
  ...Ii...
  ...Ii...
  ...Ii...
  ...Ii...
  ...Ii...
  ...Ii...
  ...Ii...
  ...Ii...
  ...Ii...
  ...Ii...
  ...Ii...
  ...Ii...
  ...Ii...
  ...Ii...
  ...Ii...
  ...Ii...
  ...Ii...
  ..IIii..
  .IIiiii.
  .iiiiii.`)
card("lamp", { is: "a lamp post, 10x32 with its edge: an iron cap, a lantern of warm glass, a post, a foot", cells: { "topdown/16": "✎" } })
// ---------------------------------------------------------------- the fence
// A fence of pale wood, a row of 16 x 15 tiles: a post at each tile's left (5 px wide with its line, its rounded top
// lit, lit on its left), two rails to the next post (each a lit top row over its side), the grass between; fence_end
// the last post. Its line its wood's darkest.
sprite("fence", { w: 16, h: 15, pivot: "bottom" }, grid(0, 0, `
  .EEE............
  EFFfE...........
  EFffE...........
  EFfeEEEEEEEEEEEE
  EFfeFFFFFFFFFFFF
  Effeffffffffffff
  EffeEEEEEEEEEEEE
  EFfeE...........
  EFfeEEEEEEEEEEEE
  EFfeFFFFFFFFFFFF
  Effeffffffffffff
  EffeEEEEEEEEEEEE
  EFfeE...........
  EffeE...........
  EEEEE...........`))
sprite("fence_end", { w: 5, h: 15, pivot: "bottom" }, grid(0, 0, `
  .EEE.
  EFFfE
  EFffE
  EFfeE
  EFfeE
  EffeE
  EffeE
  EFfeE
  EFfeE
  EFfeE
  EffeE
  EffeE
  EFfeE
  EffeE
  EEEEE`))
card("fence", { is: "a fence of pale wood, a row of 16x15 tiles: a post with a rounded lit top, two rails to the next; fence_end the last post", cells: { "topdown/16": "✎" },
  vary: { part: "fence, fence_end: any length in 16 px" } })
}
