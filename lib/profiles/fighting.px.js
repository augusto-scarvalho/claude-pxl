// A fighting game, seen from the side, the fighters big on a screen of the Neo Geo's size: the profile as
// data, taken with include("<path>/lib/profiles/fighting.px.js"). Its numbers come from pxl's guides
// (characters §12, §14, scenes §18), the library's first lab ("the lab": its fighter) and its fighting study
// (KOF 2002 measured for numbers only, never its pixels). No tile grid: the scale is in px.
genre("fighting", {
  camera: { kind: "side", pitch: 10 },   // the lab's fighter (scenes §18)
  grid: null,
  // px, [standing, wide]: a character standing 110, in her stance 101-103 (the study), 80 between her feet; the games'
  // 86-127 (characters §14). A heavy (a grappler: lib/characters/haldor_fighter.px.js) standing 140, in his guard 124
  // (1.2 of hers: his knees bent as big men stand, its 13.10), 99 across his boots on the floor, the rear one's outer
  // edge to the front toe (his guard low and wide, the rear foot turned to the camera with its knee: its 13.12 and
  // 13.13; 90 from toe joint to toe joint): the fighting study's heavies (its section 13.1: in KOF 1.00-1.25 the women's
  // guard, Goro 123, Chang 131, Maxima 118 of the 224 screen; in SF 1.1-1.6; their feet 0.45-0.72 of their guard, toe
  // to toe 0.54-0.98 in 13.12, his 0.8 with a foot 0.2 of his height)
  scale: { character: [110, 80], heavy: [140, 99] },
  screen: [320, 224],                    // KOF 2002's Neo Geo: 110 px is half its height (Goro's 127 is 57%)
  heads: 6.5,                            // to the rig; 5.7 as painted (the games' 5.4-6.3, characters §14)
  dirs: ["e", "w"], mirrored: { w: "e" },   // lit from above and toward us, so a flip holds (the lab)
  // idle 8 x 100; strike_old (the first cross) 7 frames: startup 2, active 2, recovery 3 (the lab; characters §12); hurt 2 drawings,
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
  // The normals (the same study's section 9, from the conversions' .air hit boxes and .cns hit data), startup /
  // active / recovery in ticks, timed for their impact (its section 10: the 2D games' strikes drawing by drawing, the
  // snap a cut, the blow held, the way back slower, the light short and the heavy long):
  // - jab: 3 / 3 / 2,3,4 (KOF's far light punches 4-6 / 2-3 / 5-9, 15 ticks; a light hardly winds up: 2-6 ticks);
  // - kick_l: 3,3 / 3 / 3,3,4 (KOF's far light kicks 6-9 / 3-4 / 9-12, about 21);
  // - kick_h: 3,4,1 / 3 / 3,4,4,4,3 (KOF '98's King's far heavy kick 9 / 2 / 22, 33; the heavy kicks 8-15 / 2-5 / 13-30;
  //   the smear a tick: Garou draws its blows a tick long);
  // - crouch_kick: 3 / 3 / 2,3,4 (KOF's crouching light kicks 3-6 / 2-4 / 5-8, 14);
  // - jump_kick: 3,4 / 6 / 3,4,6 (KOF's jumping heavy kicks 7-9 / 5-7 / 4-13), the last held till she lands;
  // - strike: 4,2 / 3,4 / 4,5,5 (the far heavy punches of KOF and Garou 4-13 / 1-5 / 17-22: King's 4 / 3 / 17), the cross
  //   redone (the first kept as strike_old)
  // The reactions (the same study's section 11: the conversions' hit actions 5000-5120 and their .cns, MUGEN's common
  // states, 3S's captures), in ticks:
  // - hurt_low, crouch_hurt: 2,5,7 (14, the hitstun): the first drawing held through the hitstop, most of the way, the
  //   farthest after it (KOF's 1 tick then 4-8), back over half (KOF's 10-17 after the pause);
  // - knockdown: 4 (the hit) / 4,8,10 in the air (KOF's blowbacks 26-30 ticks, 18-45 px up, 97-140 px back) / 4 on the
  //   floor (MUGEN's hit-ground 2-6, frozen) / 7,8 the bounce (MUGEN's 15-21) / 3,6 settling (friction 0.85 a tick);
  // - down: 4 x 10, a breath (KOF's lie 38-40 ticks: King, Leona, Mai; MUGEN's default 60);
  // - get_up: 5,4,6,4,2,4 (25: Vanessa's 24, KOF's 19-30), the push held and the rise quick, untouchable throughout
  //   (MUGEN's: hit by nothing, then 6 ticks unthrown)
  // The specials (the same study's section 12: the conversions' Projectile, Helper, NotHitBy, VelSet and HitDef, KOF
  // '98's and CvS's King, Athena '98, Mai 2002 UM, the CvS Chun-Li and Cammy, Garou's Hotaru; 3S's captures), in ticks:
  // - wave (a projectile from both palms): 4,8 / 4 / 8,6,6,5: born on the throw at tick 12 (the conversions' 9-18,
  //   median 12), the push held 12 and the way back 29 (KOF's 27-39, median ~31);
  // - rise_kick (a rising anti-air): 3,2 / 2,2,2 / 3,3,5,5,3,3: untouchable 5 (the conversions' NotHitBy, 4-6), the
  //   blow at tick 5 (their 2-9), the climb hitting 6 (their 8-20), 22 in the air (their 25-50) and 6 landing (5-12)
  states: { idle: { frames: 8, ms: 100 }, strike: { ms: [67, 33, 50, 67, 67, 83, 83], startup: 2, active: 2, recovery: 3 }, hurt: { frames: 2, ms: [100, 130] },
    walk_f: { ms: [83, 67, 50, 67, 83, 50, 67, 67] }, walk_b: { frames: 8, ms: 83 }, crouch: { ms: [17, 17, 33] }, crouch_hold: { frames: 8, ms: 83 },
    jump: { ms: [33, 50, 67, 67, 67, 33, 67, 67, 67, 100, 83, 33, 50], prejump: 2, air: 9, landing: 2 },
    block: { ms: [33, 100, 50, 50, 50, 50, 50, 50, 100], up: 1, stun: 6 }, block_low: { ms: [33, 100, 50, 50, 50, 50, 50, 50, 100], up: 1, stun: 6 },
    jab: { ms: [50, 50, 33, 50, 67], startup: 1, active: 1, recovery: 3 }, kick_l: { ms: [50, 50, 50, 50, 50, 67], startup: 2, active: 1, recovery: 3 },
    kick_h: { ms: [50, 67, 17, 50, 50, 67, 67, 67, 50], startup: 3, active: 1, recovery: 5 }, crouch_kick: { ms: [50, 50, 33, 50, 67], startup: 1, active: 1, recovery: 3 },
    jump_kick: { ms: [50, 67, 100, 50, 67, 100], startup: 2, active: 1, recovery: 3 }, strike_old: { ms: [60, 40, 60, 80, 80, 80, 100], startup: 2, active: 2, recovery: 3 },
    hurt_low: { ms: [33, 83, 117] }, crouch_hurt: { ms: [33, 83, 117] }, knockdown: { ms: [67, 67, 133, 167, 67, 117, 133, 50, 100] },
    down: { frames: 4, ms: 167 }, get_up: { ms: [83, 67, 100, 67, 33, 67] },
    wave: { ms: [67, 133, 67, 133, 100, 100, 83], startup: 2, active: 1, recovery: 4 }, rise_kick: { ms: [50, 33, 33, 33, 33, 50, 50, 83, 83, 50, 50], startup: 2, active: 3, recovery: 6 } },
  // hurt boxes (3-4) and a hit box; each frame's phase, damage and hitstun, `air` on a jump's frames off the ground and
  // its motion, `step` [dx, dy] px from the frame before (dx the way she faces, dy down): what an engine moves her by
  // as the frame shows (a walk's loop sums by itself, a jump's steps to 0); 3 palette slots, 11 keys swapped (the
  // lab's fighter's 9, and Reva's hair's and sash's light). On a strike's active frames what the engine does on contact
  // (the 6b2 study's section 10.3, from the conversions' HitDefs: KOF '98, 2002, XI, Garou, the Alpha games; GGST's
  // attack levels): `hitstop` ms both freeze (light 167, KOF's 7-12 ticks, median 10, the Alpha's 9, GGST's 11-12;
  // heavy 200, KOF's 11-13, median 12, the Alpha's 13, GGST's 14-15), and `pushback` px the one hit slides back (light
  // 30, KOF's 25-36 at their stand friction of 0.85 a tick; heavy 48, KOF's 32-66; a jumping heavy 34, KOF's 32-36).
  // The rest is the engine's own, not in the data: during the hitstop the one hit shakes, a px each way each tick (MUGEN
  // shakes the defender through its pause); the screen never shakes on a normal (no conversion's normal does: only
  // throws, specials and supers); the spark at the hit box's front, light ~0.4 of her height wide (44 px), heavy ~0.6
  // (64 px), 10-13 drawings of a tick (KOF's), over the hitstop
  // `invuln` on a frame nothing hits (the get-up: MUGEN's common state 5120 makes its fighter unhittable through it, and
  // unthrowable 6 ticks after: the engine's); a lying frame has no hurt box (the conversions keep one only for attacks
  // that hit a fighter on the floor)
  // `spawn` { name, at: [dx, dy], speed } on the frame that throws a projectile: its anims (<name>_start, <name>_fly
  // looped, <name>_end on a hit or a block), where its pivot starts (px from the thrower's pivot, dx the way she faces,
  // dy down) and its px a tick (the 6b2 study's section 12.1: the conversions' Projectile and Helper, born over the
  // hands 0.30-0.70 of the height ahead and 0.51-0.65 up, 3.3-7 px a tick; the thrower never freezes on its hit, the
  // engine drops it 50-65 px past the screen's edge); `knockdown` on a hit that knocks down (the HitDef's fall = 1: the
  // anti-airs', section 12.2), the one hit into its knockdown, and the screen shaking 10-15 ticks (the engine's: on a
  // special, never on a normal)
  // A throw (the library's study, 13.5 and 13.18: the conversions' TargetBind, ChangeAnim2 and EnvShake): the thrower's
  // grab is a hit box on a frame with a `bind`, and every frame he holds the one thrown says `bind` { anim, frame, at:
  // [dx, dy], facing, over }: which of the thrown one's drawings (her thrown_<pose> anims, each turned to the `roll` its
  // own frame's data says), where its pivot (her pelvis) is, px from his pivot (dx the way he faces, dy down), facing
  // 1 his way or -1 toward him, over: drawn over him; the first frame without one lets her go (`release` names the
  // anim she falls into); `shake` the ticks the screen shakes from that frame (the slam's: the engine's, as on a
  // special); the one thrown says `roll` on each of her thrown frames
  contract: { boxes: ["hurt", "hit"], data: ["phase", "damage", "hitstun", "hitstop", "pushback", "air", "step", "invuln", "spawn", "knockdown", "bind", "release", "shake", "roll"], slots: ["base", "jade", "dusk"] },
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
