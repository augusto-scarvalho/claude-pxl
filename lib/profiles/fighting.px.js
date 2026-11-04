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
  // the head jumping the whole way in the first and back over half the next (characters §12), in the strike's hitstun
  // (14 frames at 60 fps: 230 ms)
  // The moves (the library's 6b2 study: KOF 2002's Vanessa, May Lee and Whip, KOF '98's King, Athena and Mature, KOF
  // XI's Leona, SVC Chaos's Athena, SF III 3rd Strike's Ibuki, Chun-Li, Elena, Makoto and Ryu, the Alpha games' Cammy
  // and Karin; the ticks from MUGEN conversions' .air files and 3S's frame-by-frame captures, the throws from their
  // .cns; numbers only), in whole 60ths of a second, the ms rounded:
  // - walk_f: her school's step and join in 8 drawings, 5,4,3,4,5,3,4,4 ticks (32: Vanessa's 8 x 4; the extremes held,
  //   the in-betweens quick, as May Lee's 7,5,4,7,7 and Whip's 4,4,4,3,3,3,4,4); 2.75 px a tick (KOF's 2.6-3.3);
  // - walk_b: the same drawings the other way round, 5 ticks each (Vanessa's back is 5 to her forward 4), 2.5 px a tick
  //   (KOF's back walks 0.83-1.03 of the forward's speed);
  // - crouch: 3 drawings, 1,1,2 ticks (Vanessa's; KOF's 4-9 ticks down); crouch_hold: a breath of 8 x 5 ticks (KOF's
  //   and 3S's crouches breathe in 6-12 drawings of 3-7 ticks);
  // - jump: a prejump of 2,3 ticks (Vanessa's), 9 drawings over 37 ticks in the air (KOF's 36-40; Vanessa's 37), a
  //   landing of 2,3 ticks (KOF's 2-6, the prejump's drawings played back);
  // - block: up in 2 ticks (Vanessa's), the guard, the hit's 12 ticks (KOF's guard pause 10-12, 3S's held 12) as 4
  //   drawings of 3 shaken by their steps, 2 drawings of 3 back (3S's recovery), the guard; block_low the same
  states: { idle: { frames: 8, ms: 100 }, strike: { ms: [60, 40, 60, 80, 80, 80, 100], startup: 2, active: 2, recovery: 3 }, hurt: { frames: 2, ms: [100, 130] },
    walk_f: { ms: [83, 67, 50, 67, 83, 50, 67, 67] }, walk_b: { frames: 8, ms: 83 }, crouch: { ms: [17, 17, 33] }, crouch_hold: { frames: 8, ms: 83 },
    jump: { ms: [33, 50, 67, 67, 67, 33, 67, 67, 67, 100, 83, 33, 50], prejump: 2, air: 9, landing: 2 },
    block: { ms: [33, 100, 50, 50, 50, 50, 50, 50, 100], up: 1, stun: 6 }, block_low: { ms: [33, 100, 50, 50, 50, 50, 50, 50, 100], up: 1, stun: 6 } },
  // hurt boxes (3-4) and a hit box; each frame's phase, damage and hitstun, `air` on a jump's frames off the ground and
  // its motion, `step` [dx, dy] px from the frame before (dx the way she faces, dy down): what an engine moves her by
  // as the frame shows (a walk's loop sums by itself, a jump's steps to 0); 3 palette slots, 11 keys swapped (the
  // lab's fighter's 9, and Reva's hair's and sash's light)
  contract: { boxes: ["hurt", "hit"], data: ["phase", "damage", "hitstun", "air", "step"], slots: ["base", "jade", "dusk"] },
  // at most a frame: KOF 13, SF2 and SFA3 15 (characters §14), 16 for the lab's fighter; 18 by the user's pick (the
  // fighting study's detail): a third, light tone on the hair and on the sash, each a color and a slot key
  colors: 18,
  tones: [3, 4],                         // a material
  // KOF 2002's (the study): a line by material, on 41-48% of the edge, black only on hair and shoes; clean bands
  // 2-3 px, no dither, no smear on a light punch; values in OKLab (characters §14). pxl check reads it: no edge pixel
  // lighter than its material's fill inside it, the near-black share said
  ink: "material",
  pose: { idle: { feet: 0.82, weight: 0.51, line: 23 }, punch: { feet: 0.91, weight: 0.64, line: 35 } },   // the study's: feet apart and weight forward in a width, the body's line in degrees
  checks: ["ground"],                    // the feet on one row through a move
})
