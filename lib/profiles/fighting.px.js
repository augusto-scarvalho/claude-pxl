// A fighting game, seen from the side, the fighters big on a screen of the Neo Geo's size: the profile as
// data, taken with include("<path>/lib/profiles/fighting.px.js"). Its numbers come from pxl's guides
// (characters §12, §14, scenes §18), the library's first lab ("the lab": its fighter) and its fighting study
// (KOF 2002 measured for numbers only, never its pixels). No tile grid: the scale is in px.
genre("fighting", {
  camera: { kind: "side", pitch: 10 },   // the lab's fighter (scenes §18)
  grid: null,
  scale: { character: [110, 80] },       // px: standing 110, in her stance 101-103 (the study); the games' 86-127 (characters §14)
  screen: [320, 224],                    // KOF 2002's Neo Geo: 110 px is half its height (Goro's 127 is 57%)
  heads: 6.5,                            // to the rig; 5.7 as painted (the games' 5.4-6.3, characters §14)
  dirs: ["e", "w"], mirrored: { w: "e" },   // lit from above and toward us, so a flip holds (the lab)
  // idle 8 x 100; a strike 7 frames: startup 2, active 2, recovery 3 (the lab; characters §12); hurt 2 drawings,
  // the head jumping the whole way in the first and back over half the next (characters §12)
  states: { idle: { frames: 8, ms: 100 }, strike: { ms: [60, 40, 60, 80, 80, 80, 100], startup: 2, active: 2, recovery: 3 }, hurt: { frames: 2 } },
  // hurt boxes (3-4) and a hit box; each frame's phase, damage and hitstun; 3 palette slots, 9 keys swapped (the lab's fighter)
  contract: { boxes: ["hurt", "hit"], data: ["phase", "damage", "hitstun"], slots: ["base", "jade", "dusk"] },
  colors: 16,                            // at most a frame: KOF 13, SF2 and SFA3 15 (characters §14)
  tones: [3, 4],                         // a material
  // KOF 2002's (the study): a line by material, on 41-48% of the edge, black only on hair and shoes; clean bands
  // 2-3 px, no dither, no smear on a light punch; values in OKLab (characters §14)
  ink: "material",
  pose: { idle: { feet: 0.82, weight: 0.51, line: 23 }, punch: { feet: 0.91, weight: 0.64, line: 35 } },   // the study's: feet apart and weight forward in a width, the body's line in degrees
  checks: ["ground"],                    // the feet on one row through a move
})
