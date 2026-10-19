// Freeway: an elevated concrete freeway across the whole frame, seen from the street at dusk. Backlit
// by the low sun at the upper left: the parapet's top and the lamp posts' left edges catch it, the
// deck face is in shade, the underside darkest. Brutalist hammerhead pillars, and under the deck a camp
// around a barrel fire. Traffic streams both ways above the parapet; the sodium lamps have just come on,
// the one at x 138 still warming up. Box 320x66, stamped at (0, 58): box row = scene row - 58.
include("palette.px.js", { palette: true })

const FREEWAY_TOP = 20                                   // parapet's top row (scene 78)
const FREEWAY_PILLARS = [20, 130, 240]                   // pillar centres
const FREEWAY_POSTS = [10, 74, 138, 202, 266]            // lamp posts: the post's left column; the glass is at x + 3..5
const FREEWAY_LATE = 138                                 // the lamp still warming up
// that lamp, frames 20..40: 0 off, 1 dim red glow, 2 orange, 3 full sodium. Off before 20, on after 40.
const FREEWAY_STUTTER = "100110100012022123233"
const FREEWAY_LAMP = (x, f) => x !== FREEWAY_LATE ? 3 : f < 20 ? 0 : f <= 40 ? +FREEWAY_STUTTER[f - 20] : 3
const FREEWAY_GLASS = ["cec", "OOO", "oao", "aAa"]
// traffic, [vehicle, start]: the near lane drives right at 5 px/frame on a ring of 600, the far lane
// left at 4 px/frame on a ring of 480 (both come round twice a loop, wrapping off screen)
const FREEWAY_NEAR = [["truck", 0], ["teal", 70], ["coupe", 150], ["van", 260], ["bus", 360], ["red", 470]]
const FREEWAY_FAR = [["pickup", 0], ["red", 90], ["van", 200], ["teal", 290], ["truck", 370]]
const FREEWAY_FIRE = [151, 60]                           // the barrel fire under the deck (flames' middle)

// ---------------------------------------------------------------- vehicles (the parapet hides their wheels)
// Drawn facing right, front at the right: headlights A, taillights p. Lit by the sky from above (roofs
// lightest); the glass reflects the haze.
sprite("_freeway_teal", `
  ....jJJJJj.....
  ...jhhVhthhhj..
  jjjjjjjjjjjjjjj
  pttttttttttttaA
  TkkTTTTTTTTkkTT`)
sprite("_freeway_red", `
  ...MMMMMMM.....
  ...RhhhRhhhR...
  mmmmmmmmmmmmmmm
  prrrrrrrrrrrraA
  RkkRRRRRRRRkkRR`)
sprite("_freeway_coupe", `
  .....ceeec.....
  ...cKhhhhhKc...
  ccccccccccccccc
  pCCCCCCCCCCCCaA`)
sprite("_freeway_pickup", `
  ..........mMMm..
  .tjtt.....hhhm..
  mmmmmmmmmmmmmmmm
  prrrrrrrrrrrrraA
  RkkRRRRRRRRkkRRR`)
sprite("_freeway_van", `
  UUUUUUUUUUUUU....
  uhhshhshhshhshh..
  uhhshhshhshhshhh.
  uuuuuuuuuuuuuuuuU
  pummmmmmmmmmmmmaA
  skksssssssssskkss`)
// box truck: amber clearance lights on the box's top corners, a corp stripe with an abstract mark
sprite("_freeway_truck", `
  oLLLLLLLLLLLLLLLLo........
  eEEEEEEEEEEEEEEEEc........
  eEEEEEEEEEEEEEEEEc.jjjj...
  eEEmmmmmmmmmmmmEEc.thhhj..
  eEEmURmmmmmmmmmEEc.thhhhj.
  eEEEEEEEEEEEEEEEEc.tttttjj
  eEEEEEEEEEEEEEEEEcctttttta
  pccccccccccccccccccttttttA
  ckkkccccccccccckkkcTkkkTTT`)
// coach: the cabin lights are on, a few passengers against them
sprite("_freeway_bus", `
  UUUUUUUUUUUUUUUUUUUUUUUUUUUU..
  uwwswwswKswwswwswwsKwswwsuhhu.
  uwwswwswKswwswwswwsKwswwsuhhhu
  tttttttttttttttttttttttttttttt
  uuuuuuuuuuuuuuuuuuuuuuuuuuuuaA
  puuuuuuuuuuuuuuuuuuuuuuuuuuuuu
  skkksssssssssssssssssskkksssss`)
// the far lane's, facing left (top-lit only, so a mirror keeps the light right)
for (const n of ["teal", "red", "pickup", "van", "truck"]) sprite(`_freeway_${n}_l`, { base: `_freeway_${n}`, flip: "x" })

// ---------------------------------------------------------------- under the deck
sprite("_freeway_pallets", `
  bfbfbfb
  B.B.B.B
  bfbfbfb
  B.B.B.B`)
// a tarp lean-to against the pillar, its open end dark
sprite("_freeway_tarp", `
  tj........
  ttj.......
  Tttj......
  TTttj.....
  TKTtttj...
  TKKTtttj..
  TKKKTttttj`)
sprite("_freeway_barrel", `
  mMm
  rmr
  RrR
  rrr`)
// someone warming their hands, lit from the fire on their left
sprite("_freeway_warmer", `
  .K.
  mK.
  mKK
  mKK
  KK.
  K.K`)
sprite("_freeway_wreck", `
  ....RrrrrR.....
  ...RKKKRKKKR...
  RrrrrrrssrrrrrR
  RrKKRRRRRRRRrRR
  .kKk.....kKk...`)
// abstract tags sprayed on the deck face (no letters)
sprite("_freeway_tag", `
  ..RRRRR...RRR..
  .RUUUUURRRUUUR.
  RUUuUUUUUUuUUUR
  RUUUUURRUUUUUR.
  .RRRRR..RRRRR..`)
sprite("_freeway_tag2", `
  ..TTT...
  .T...T.T
  T..TT.T.
  .TT.....`)
sprite("_freeway_tag3", `
  .RR.R
  RMMRM
  RMRMR
  .R.R.`)

// ---------------------------------------------------------------- the gantry sign facing the street
// an invented route shield and an arrow to the on-ramp, on a teal board with a pale border
sprite("_freeway_shield", `
  JJJJJJJJJ
  JtttttttJ
  JtJJtJJtJ
  JttJtJtJJ
  .JtJtJJJ.
  ..JtttJ..
  ...JJJ...`)
sprite("_freeway_arrow", `
  JJJJ....
  JJJ.....
  J.JJ....
  J..JJ...
  ....JJ..
  .....JJ.
  ......JJ`)

// ---------------------------------------------------------------- everything that stands still
sprite("_freeway_static", { w: 320, h: 66 },
  // ground under the freeway, in the deck's shade: lighter where it runs out from under it (the top row)
  (c) => {
    for (let x = 0; x < 320; x++) {
      const top = 57 + Math.round(Math.sin(x / 19) + Math.sin(x / 7.3 + 1) * 0.6)
      c.px(x, top, "s"); c.rect(x, top + 1, 1, 64 - top, "S")
      c.px(x, 63, x % 2 ? "S" : "K"); c.rect(x, 64, 1, 2, "K")
    }
    const r = c.rng(5)
    for (let i = 0; i < 40; i++) {                                         // dry weeds along the top
      const x = Math.floor(r() * 320), top = 57 + Math.round(Math.sin(x / 19) + Math.sin(x / 7.3 + 1) * 0.6)
      c.px(x, top - 1, "D"); if (r() < 0.5) c.px(x + 1, top - 2, "d")
    }
  },
  // pillars: hammerhead caps under the soffit, columns, footings; sky side (left) lightest
  (c) => {
    for (const X of FREEWAY_PILLARS) {
      for (const [y, hw] of [[33, 12], [34, 12], [35, 12], [36, 11], [37, 10], [38, 9], [39, 8]]) {
        c.rect(X - hw, y, hw * 2, 1, "e"); c.rect(X + hw - 4, y, 3, 1, "c")
        c.px(X - hw, y, y > 35 ? "C" : "E"); c.px(X + hw - 1, y, "C")
      }
      c.rect(X - 12, 33, 24, 1, "c")                                        // shadow where the cap meets the soffit
      c.rect(X - 7, 40, 14, 22, "e"); c.rect(X - 7, 40, 1, 22, "E")
      c.rect(X + 3, 40, 3, 22, "c"); c.rect(X + 6, 40, 1, 22, "C")
      c.rect(X - 6, 40, 9, 2, "c")                                          // under the cap
      for (const y of [45, 50, 55]) c.px(X - 4, y, "c"), c.px(X, y, "c")    // form-tie holes
      c.rect(X - 9, 62, 18, 4, "c"); c.rect(X - 9, 62, 17, 1, "e"); c.px(X - 9, 62, "E"); c.rect(X + 8, 62, 1, 4, "C")
    }
    // the middle pillar (seen through the lot): a drainpipe from the deck, its rust run, tags at hand height
    c.rect(135, 34, 1, 28, "C"); for (const y of [38, 46, 54]) c.px(134, y, "c")
    c.rect(134, 56, 1, 6, "s"); c.px(133, 59, "s")
  },
  stamp("_freeway_tag2", 124, 50), stamp("_freeway_tag3", 131, 54),
  stamp("_freeway_pallets", 114, 61), stamp("_freeway_tarp", 137, 57), stamp("_freeway_barrel", 150, 61),
  stamp("_freeway_warmer", 154, 58), stamp("_freeway_wreck", 157, 59),
  // the deck: sunlit parapet top, coping, its shadow line, the girder face, drip edge, soffit
  rect(0, 20, 320, 1, "L"), rect(0, 21, 320, 1, "E"), rect(0, 22, 320, 1, "c"), rect(0, 23, 320, 6, "e"),
  rect(0, 29, 320, 1, "c"), rect(0, 30, 320, 2, "C"), rect(0, 32, 320, 1, "K"),
  // repaired panels, newer and paler
  rect(186, 23, 22, 6, "E"), rect(186, 28, 22, 1, "e"), rect(22, 23, 14, 6, "E"),
  // expansion joints every 40 px
  (c) => { for (let x = 18; x < 320; x += 40) c.rect(x, 21, 1, 9, "c") },
  // drain spouts under the coping, grime run down from each; pipe stubs under the soffit
  (c) => {
    for (const [x, len, k] of [[38, 4, "c"], [84, 5, "c"], [126, 3, "s"], [172, 5, "c"], [214, 4, "c"], [258, 5, "s"], [302, 3, "c"]]) {
      c.rect(x, 23, 2, 1, "C"); c.rect(x, 24, 1, len, k); if (len > 3) c.rect(x + 1, 24, 1, len - 2, "c")
      c.rect(x + 1, 33, 1, 2, "C")
    }
  },
  stamp("_freeway_tag", 142, 23),
  // the gantry: posts on the parapet, a catwalk with two sign lights (the scene's glow), the board, an exit tab
  rect(292, 15, 2, 5, "E"), rect(293, 15, 1, 5, "C"), rect(313, 15, 1, 5, "E"), rect(314, 15, 1, 5, "C"),
  rect(288, 15, 31, 1, "c"), rect(288, 16, 31, 1, "C"), px(296, 14, "o"), px(310, 14, "o"),
  rect(289, 4, 29, 11, "J"), rect(290, 5, 27, 9, "t"), rect(289, 4, 29, 1, "L"), rect(290, 13, 27, 1, "T"),
  stamp("_freeway_shield", 293, 6), stamp("_freeway_arrow", 305, 6),
  rect(307, 2, 10, 1, "U"), rect(307, 3, 10, 1, "u"), px(309, 3, "S"), px(310, 3, "S"), px(312, 3, "S"), px(314, 3, "S"))

// lamp posts on the parapet: a plinth, a 2 px post (sunlit left edge), a cobra head over the road.
// Drawn over the lamps' light, which falls past them.
sprite("_freeway_posts", { w: 320, h: 22 }, (c) => {
  for (const P of FREEWAY_POSTS) {
    c.rect(P - 1, 19, 4, 1, "c"); c.px(P - 1, 19, "E"); c.px(P + 2, 19, "C")
    c.rect(P, 3, 1, 16, "E"); c.rect(P + 1, 3, 1, 16, "C"); c.rect(P, 3, 1, 3, "L")
    c.rect(P, 2, 6, 1, "L"); c.rect(P + 2, 3, 5, 1, "C")
    c.grid(P + 3, 4, FREEWAY_LAMP(P, 0) ? "aAa" : FREEWAY_GLASS[0])
  }
})

// ---------------------------------------------------------------- the part
anim("freeway_deck", { w: 320, h: 66, frames: 240, fps: 12 },
  // traffic: the far lane first, a row lower (farther, so less of it shows over the parapet)
  (c) => {
    for (const [n, x0] of FREEWAY_FAR) {
      const name = `_freeway_${n}_l`
      c.stamp(name, 380 - ((x0 + 4 * c.frame) % 480), FREEWAY_TOP + 1 - c.size(name).h)
    }
    for (const [n, x0] of FREEWAY_NEAR) {
      const name = `_freeway_${n}`
      c.stamp(name, ((x0 + 5 * c.frame) % 600) - 60, FREEWAY_TOP - c.size(name).h)
    }
  },
  stamp("_freeway_static", 0, 0),
  // sodium light falling from each head onto the cars and the parapet's coping
  layer("lamps_soft", { light: true, density: 0.5 }, (c) => {
    for (const P of FREEWAY_POSTS) if (FREEWAY_LAMP(P, c.frame) >= 2) c.poly([P + 2, 5, P + 6, 5, P + 12, 21, P - 4, 21], "k")
  }),
  layer("lamps", { light: true }, (c) => {
    for (const P of FREEWAY_POSTS) if (FREEWAY_LAMP(P, c.frame) === 3) c.poly([P + 3, 5, P + 5, 5, P + 8, 21, P, 21], "k")
  }),
  // the barrel fire lights the camp around it, flickering
  layer("firelight", { light: true }, (c) => {
    const [x, y] = FREEWAY_FIRE
    c.ellipse(x, y + 1, 5 + (c.frame * 7 % 3 === 0 ? 1 : 0), 3, "k")
  }),
  stamp("_freeway_posts", 0, 0),
  // the late lamp's glass, the flames and their sparks
  (c) => {
    c.grid(FREEWAY_LATE + 3, 4, FREEWAY_GLASS[FREEWAY_LAMP(FREEWAY_LATE, c.frame)])
    const f = c.frame, k = (f * 7 + (f >> 2) * 3) % 4
    c.grid(150, 57, [".o.\noAo\naAa\naaa", "o..\n.ao\naAa\naaa", "...\n.o.\noAa\naaa", "..o\noa.\naAa\naaa"][k])
    for (let s = 0; s < 3; s++) {                                         // a spark every 80 frames, three in flight at times
      const age = (f + s * 27) % 80
      if (age < 14) c.px(151 + (age >> 2), 56 - (age >> 1), age < 8 ? "a" : "O")
    }
  })

// how the city places it, over a stand-in sky and the same haze veil; the ref layer sketches the strip's
// roofs (plan, section 5) so it shows what stays visible
scene("test_freeway", { w: 320, h: 180, bg: "h", world: { horizon: 104, eye: 6, light: [-1, -0.45] } },
  grad(0, 0, 320, 112, "NnvVhH"),
  stamp("freeway_deck", 0, 58),
  layer("haze", { opacity: 0.3 }, rect(0, 98, 320, 26, "h")),
  layer("strip", { ref: 0.5 }, rect(0, 58, 62, 82, "K"), rect(62, 94, 56, 46, "K"), rect(118, 124, 52, 16, "K"),
    rect(170, 110, 62, 30, "K"), rect(232, 76, 54, 64, "K"), rect(286, 92, 34, 48, "K")),
  glow("aA", { r: 6, strength: 0.35 }), glow("pP", { r: 4, strength: 0.35 }), glow("wi", { r: 2, strength: 0.15 }))
