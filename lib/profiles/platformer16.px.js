// A platformer at a 16 px grid, seen from the side: the profile as data, taken with
// include("<path>/lib/profiles/platformer16.px.js"). Its numbers come from references measured for numbers only,
// named here in words (their pixels never taken): Mega Man X (SNES) and the Zero and ZX games (GBA, DS),
// Castlevania: Symphony of the Night (PS1) and Dawn of Sorrow (DS), and Celeste (PC) (library F5's platformer
// study); and from pxl's guides (characters §n, scenes §n) where the references say nothing.
// The scale curve, [tall, wide] in tiles by category with the character as the anchor: scenes §19.
genre("platformer16", {
  camera: { kind: "side", pitch: 0 },
  grid: 16,
  scale: {
    // 32 px and its line, 2 tiles: Mega Man X's hero 28 x 32 (2.5 heads), the Zero and ZX heroes 39-44 (2.4-2.75
    // tiles), Castlevania's 43-47 (2.7-2.9), Celeste's 2 of its 8 px tiles; none of them 1.5 tiles
    character: [2, 1],
    lamp: [2.5, 0.5], crate: [1, 1],   // the lamp 1.3x the figure, the crate a tile (scenes §19's ratios)
    tree: [4, 3],          // 2x the figure (scenes §19); Mega Man X2's set-piece tree is 11 tiles (5.5x)
    coin: [0.5, 0.5],
  },
  moves: { stair: 0.5 },   // tiles: a stair 8 px a step (scenes §15; the maps show steps up of 1 tile)
  // The jump as physics, one set of numbers: a rise of 48 px (3 tiles, 1.5 heroes) at a gravity of 600 px/s². The rise
  // is the level's: the hero's feet over a 46 px hay cart from the street, a 2-tile step with room (the demo's blocks,
  // library F5). The gravity the blocks' (600 px/s², seen in the demo): 0.4 s to the top and 0.8 s on the flat, near
  // Celeste's 0.36 s (its source's gravity 900 px/s², a 105 px/s jump held 0.2 s, half gravity under 40 px/s: 28 px,
  // 3.5 of its 8 px tiles); the study measured Mega Man X's and Castlevania's drawings, not their physics. At the
  // scene's fps: route({ px: "side", gravity: 600 / fps², rise: 48 }) (20 fps: 1.5 px a frame², off the ground at 12 px
  // a frame, rising 11, 10, 8, 7, 5, 4, 2, 1).
  jump: { rise: 48, gravity: 600 },
  heads: 2.5,              // Mega Man X's hero: the head 13 rows of 32 with its line
  dirs: ["e", "w"], mirrored: { w: "e" },   // every sheet draws one facing: the game flips it
  // the references' timing where they have it (Celeste's frames; the sheets' drawing counts), else characters §12:
  // idle 4 drawings (Mega Man X's, Richter's and Soma's 4; Celeste's held 100-400 ms); run a 0.6 s cycle (Celeste's
  // 12 at 50 ms; Mega Man X's 10 drawings, Richter's 8), 2 px of bob (X, Soma, Celeste). The jump in four, what the
  // references' jumps share (Mega Man X's 7 drawings, Zero 3's 13, ZX Advent's Ashe's 14, Richter's 8, Soma's 19,
  // Madeline's GIFs; library F5's jump study), `loop` the frames a game repeats while rising or falling: jump 4, the
  // anticipation (a crouch: the GBA and DS games' 93-97%; X and Richter start on the stretch), the take-off, the
  // rise stretched twice (103-118%, a knee up: X's 2 drawings, Zero's and Ashe's 6, held while rising), at 60, 60,
  // 80, 80 (Madeline's jump 100 ms a frame, characters §12's 60); apex 2 at 100, the tuck held 200 ms (the
  // references' 1-3 drawings, Soma's 8, Richter's ball at 72%; characters §12's apex held 1-3 frames); fall 3, the
  // turn (Zero's, Ashe's, Richter's untuck: 2) then the fall twice (the legs reaching down, 92-102%), at 80, 100,
  // 100 (Madeline's fall 60 ms into her fallSlow and fallFast, 2 at 100 looped); land 3 at 60, the pre-landing reach
  // (X's, Ashe's) then X's two (the knee up, the crouch 2 px low; the references' landing crouch 89-98%); the jump's
  // way up and down `jump`'s physics above (a side route picks these four by its speed up). Hurt 3 (Richter's: thrown back, on a
  // knee, up) and the hit flash, the knee held twice as long (no sheet gives its timing: the platformer hero's
  // blocks, approved by the user, library F5). The walk characters §12's game walk (SLYNYRD's 8 at 140, final boss
  // blues' 8 at 100-150; Symphony of the Night's Alucard walks in 16 drawings, Mega Man X and Zero don't walk):
  // contact, down, passing, reach a step, upright, a stride of 7 px against the run's 11, the free foot 1.8 px up
  // against 4.5, a bob of 1 px against 2, the arms hanging loose. The dash Mega Man X's: a start drawing (crouched,
  // 97% of his height), a held one long and low (81% of his height, 1.36x his width; the back leg trailing, the
  // front knee bent), the start again to stop; its timing characters §12's dash (a squash, travel, a brake low, up)
  // at the run's pace: the push-off, the launch, the held pose twice (`loop`: while the dash lasts), the brake,
  // rising; dust at the back heel on the launch and on each held loop, kicked ahead at the brake; the held pose
  // ghosted behind him
  states: {
    idle: { frames: 4, ms: [400, 200, 400, 200] },
    walk: { frames: 8, ms: 125 },
    run: { frames: 8, ms: 75 },
    // the run that speeds up: run to 55 px/s (2.75 px a drawing at 50 ms), then sprint at twice the stride (5.5 px a
    // drawing, 100 ms down to 50 at 110 px/s; Mega Man X's ~50 px a cycle, Richter's ~58: library F5's measure), a
    // drawing's time 1000 x its px / the speed so the soles stay planted; 2 of its 8 drawings `air` (Richter's 2)
    sprint: { frames: 8, ms: 75 },
    dash: { frames: 6, ms: [60, 60, 90, 90, 80, 120], loop: [2, 3] },
    jump: { frames: 4, ms: [60, 60, 80, 80], loop: [2, 3] },
    apex: { frames: 2, ms: 100 },
    fall: { frames: 3, ms: [80, 100, 100], loop: [1, 2] },
    land: { frames: 3, ms: 60 },
    hurt: { frames: 3, ms: [120, 240, 120], flash: true },
    // the ladder from the back, hand over hand, 4 px up a drawing (40 px/s; Mega Man X climbs in 4 from the back),
    // every frame `air`; enter his back, the drawing he turns to before a door that faces us
    climb: { frames: 4, ms: 100 },
    enter: { frames: 1, ms: 100 },
  },
  // a sheet a row a tag, the pivot the feet; the player's hurt box a small one at its middle (scenes §15); data:
  // air on the frames off the ground, loop on those to repeat, the dash's dust (where a puff goes) and ghost (where
  // its afterimages go); frames [w, h] px: 32 wide for the run's contact (X's 32), 48 tall for the rise (44),
  // the dash 40 wide for its held pose (27 px long at 32 tall: X's 38 at 32)
  contract: { rows: "tag", pivot: "feet", boxes: ["hurt"], data: ["air", "loop", "dust", "ghost"], frames: { all: [32, 48], dash: [40, 48] } },
  tones: 3,                // a material (the SNES Zero's red and grey on V 38/63/88; Richter's blue), the hero's main color 4-5 (X's blue 5)
  colors: 15,              // at most a sprite: X 14, Zero 13-15, Richter 13, Soma 15, Celeste 9
  // the line by kind: the figures a near-black line all round and near-black inner lines (Mega Man X's hero 78% of
  // his edge and two thirds of his inner lines, the SNES Zero 85%, Dawn of Sorrow's Soma 96%, Celeste 72-81%; the
  // GBA/DS Mega Man games and Symphony of the Night's Richter draw the material's dark instead: a style to swap);
  // what else stands (props, walls) its material's darkest; the ground none (its lip's dark band is its edge);
  // effects none (the Zero saber's crescent: greens and a white leading rim)
  ink: { character: "#1a1620", rest: "selout", ground: "none", effect: "none" },
  light: "from above, flat side to side",   // every figure measured; the game flips it
  // the ground (Mega Man X2's and X3's, Symphony of the Night's floors): busy inside (5 tones, V 22-88: the figure
  // stands over it, never in front of it), its top its lightest pixels (a grass lip's tips V 82-97, a snow lip's
  // 2 px of V 97, a marble slab's top rows), a lip 14-20 rows over a dark band of 3-6 rows; the planes behind at
  // least 20 V from the walkable tops (lighter outdoors: Blizzard Buffalo's +19; darker indoors: the Marble
  // Gallery's rooms 45 under its floor), their saturation free (the SNES sky S76 over a ground of S18-44)
  ground: { top: "lightest", lip: [14, 20], band: [3, 6] }, backdrop: { apart: 20 },
  checks: ["ground"],      // the feet on one row through a move (a frame whose data says air, a jump's or a fall's, left out)
})
