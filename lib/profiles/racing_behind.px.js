// Racing seen from behind, Mario Kart's kind (Super Mario Kart, Mario Kart: Super Circuit): the profile as data, taken
// with include("<path>/lib/profiles/racing_behind.px.js"). The floor a flat map seen in perspective (Mode 7: the track
// drawn from above once, the camera flying over it), a backdrop strip on the horizon sliding sideways as the camera
// turns, the racers small characters in open karts drawn from many angles: yours low in the middle, a rival's drawing
// by where it heads against the camera. Its numbers measured on Super Circuit (the GBA) for numbers only, named here in
// words (their pixels never taken): eight gameplay screenshots at the GBA's own 240 x 160, its racers' sheets (eight
// racers, three sizes each) and its course maps (Peach Circuit's start measured against its screenshot), and Super
// Mario Kart's (the SNES) two screenshots to compare; Mario Kart 8's karts (Collada) for the kart's proportions. The
// study: library F5's stage 7a (racing_behind.md). The kart and its driver: lib/vehicles/kart.px.js.
genre("racing_behind", {
  // A level camera over the floor: Super Circuit's floor is a level camera's (each row's scale linear in its distance
  // from the horizon: the road's width on Peach Circuit's start fits w = 4.21 (row - 66.25) within 1.2 px over 33 rows,
  // and the bands' rows the same camera within a row); tilted 3 degrees down about the screen's middle row it draws the
  // same floor. The screen the GBA's 240 x 160; the floor's lines meet on row 66, the floor drawn from row 74 (every
  // screenshot: the backdrop's rows 0-73), so it reaches 114 m ahead (645 of the map's px, 80 of its tiles); the eye
  // 3.32 m up (18.8 map px) and the focal 267 px (48 degrees across), in meters through the kart (its 32 px with its
  // line 1.25 m at 24 px a meter: a map px 0.18 m). Super Mario Kart's half screen holds more floor: its horizon 21
  // rows under the top of a view 104 tall (Super Circuit's 74 of 160).
  camera: { kind: "behind", w: 240, h: 160, horizon: 66, floor: 74, eye: 3.32, focal: 267, pitch: 0 },
  ppm: 24,                 // px a meter where your kart is: a meter 24 px across on its row
  // the racers' own: the angle down from the eye to where your kart meets the road (atan(80 / 267) = 16.6); the sheets'
  // drawings show the kart's top from about 20 (the far tyres 8 rows over the near over a wheelbase of 22 px)
  pitch: 17,
  grid: null,
  // your kart: its middle on column 120, its tyres' lowest row 146 (14 over the screen's bottom), 32 px across with its
  // line and 38 tall (Mario seen from behind; the sheets' back views 32-38 across, 32-45 tall: the heavies' karts
  // wider): 11.1 m ahead of the eye
  kart: { col: 120, row: 146, across: 32, tall: 38 },
  // [tall, wide] m: the kart with its driver over the tyres' width
  scale: { racer: [1.1, 1.25] },
  // A full turn 48 drawings 7.5 degrees apart: the sheets draw 25 from facing us to its back to us (both ends' drawings
  // their own mirrors) and the game flips 23 of them for the other half (no drawing a sheet holds is another's mirror).
  // Steering: your kart from behind keeps the back drawing, the driver's head turned and leaning, 3 steps each way (the
  // other way mirrored); drifting: the kart turned against the camera, one of the turn's drawings, dust at its tyres.
  dirs: { n: 48, step: 7.5, drawn: 25, mirrored: 23, steer: 3 },
  // the rivals: Super Circuit's three drawn sizes (its sheets' cells 64, 32 and 16: the back view 32, 16 and 8 across)
  // scaled between by the GBA as the floor at their row (Yoshi 31 rows tall on row 131, the floor there 0.81 of its
  // scale at 146: 0.82 of his 38); here drawn at their size from 3D (a sprite is never scaled alone: scenes §19)
  rivals: "drawn",
  // where it meets the road, m (make3d.kart's tyres); its sockets; 2 liveries by roles (roleSwap(), mats)
  contract: { footprint: [1.25, 1.36], sockets: ["seat", "wheel", "pedals", "exhaust"], liveries: 2 },
  // 15 colors a drawing (a 16 color palette a racer, one clear), 3-4 a material (Mario's cap three reds and a light);
  // the smaller sizes 9-15
  tones: 3,
  // the line: the sheets' edge is mostly a dark tone of the part it rings (7-47% of it near-black), the tyres near-black;
  // the racer near-black all round (a character: the user's rule gives near-black lines to characters only); the
  // trees and the track's things lined all round in their own darker tones, never near-black (as racing_topdown's)
  ink: { character: "#1a1620", tree: "own", prop: "own" },
  // the track: a map drawn from above, 8 px tiles, 1024 (the SNES courses Super Circuit remade) to 2048 px across (its
  // own: Luigi Circuit); the road 10.5 karts wide (Peach Circuit's start straight 79 map px edge line to edge line, the
  // kart 7.5 by the floor's scale on its row); its edge lines, kerbs (red and white blocks), the start line's checker
  // (8 map px deep, one row on the screen at the grid) and the walls of coloured blocks all flat on the floor; trees
  // and pipes stand as sprites, drawn by size (a tree 64, 32, 16 and 8 px tall)
  road: 10.5,
  map: { tile: 8, px: [1024, 2048] },
  // the backdrop: 74 rows on the screen (0-73) of a strip 256 x 112 that wraps (Luigi Circuit's sheet); the floor's
  // first 15 rows lightened toward it (a haze: Peach Circuit's start). How far it slides for a turn the stills don't
  // say: a strip that wraps once a turn slides 256 px (0.7 a degree), against the floor's 4.7 a degree at the middle
  backdrop: { rows: 74, strip: [256, 112], haze: 15 },
  checks: ["footprint"],   // the drawing down to where its tyres meet the road, at every heading
})
