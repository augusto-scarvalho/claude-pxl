// The monsters at the party, front view, about 28 px tall (chibi: the head is ~40% of the
// height). Dances loop in 4 frames at 8 fps, so every dancer lines up with the scene's 2 s loop.

// ---------------------------------------------------------------- skeleton
// Skull, ribs and pelvis are one drawing; the limbs are bones drawn between joints, one pose a frame.
sprite("_skel_top", { mx: "c" }, `
  ...bbb
  .bbbbb
  bbbbbb
  bBkkbb
  bBkkbb
  bbbbbk
  .Bbbbb
  ..bkbk
  ...Bbb
  .....b
  ..bbbb
  ..b..b
  ..bbbb
  ...b.b
  ...bbb
  .....b
  ...bbb
  ..bB.B`)
// joints per frame: [bob, [elbowL, handL, elbowR, handR], [kneeL, footL, kneeR, footR]]
const SKEL = [
  [0, [[2, 9], [1, 3], [16, 13], [17, 17]], [[8, 23], [7, 28], [12, 23], [13, 28]]],
  [1, [[3, 13], [2, 9], [17, 13], [18, 9]], [[6, 24], [7, 28], [14, 24], [13, 28]]],
  [0, [[4, 13], [3, 17], [18, 9], [19, 3]], [[8, 23], [7, 28], [12, 23], [13, 28]]],
  [1, [[3, 13], [2, 9], [17, 13], [18, 9]], [[6, 24], [7, 28], [14, 24], [13, 28]]],
]
anim("skeleton", { w: 21, h: 30, frames: 4, fps: 8, outline: "k", pivot: "bottom" }, (c) => {
  const [bob, [eL, hL, eR, hR], [kL, fL, kR, fR]] = SKEL[c.frame]
  const bone = (a, b) => c.line(a[0], a[1], b[0], b[1], "b")
  bone([8, 18 + bob], kL); bone(kL, fL); bone([12, 18 + bob], kR); bone(kR, fR)
  c.hline(fL[0] - 1, fL[1], 2, "B"); c.hline(fR[0], fR[1], 2, "B")
  c.stamp("_skel_top", 5, bob)
  bone([7, 10 + bob], eL); bone(eL, hL); bone([13, 10 + bob], eR); bone(eR, hR)
  for (const h of [hL, hR]) c.px(h[0], h[1], "B")
})

// ---------------------------------------------------------------- vampire
// Slicked hair with a widow's peak, red eyes, fangs, a red vest; the cape hangs from his shoulders
// to his hands, so raising the arms opens it like bat wings and shows the red lining.
sprite("_vamp", { mx: "c" }, `
  ...KKK
  .KKKKK
  KKKKKK
  KKKKKK
  KKfffK
  Kfffff
  Kf88ff
  fffffF
  Ffffff
  .FFfbk
  ..FFFF
  ..KKbR
  ..Krbb
  ..Krrb
  ..Krrr
  ..KKrr
  ..KKKK
  ..KKKK
  ...KK.
  ...KK.
  ...KK.
  ...KK.
  ...KK.
  ...KK.
  ..kkk.`)
// per frame: bob, left hand [x, y] (the right mirrors it), how open the wing is (notch depth)
const VAMP = [[0, [6, 18], 0], [1, [3, 14], 0.5], [0, [0, 9], 1], [1, [3, 14], 0.5]]
const VW = 27, VC = 13
anim("vampire", { w: VW, h: 29, frames: 4, fps: 8, outline: "k", pivot: "bottom" }, (c) => {
  const [bob, [hx, hy], open] = VAMP[c.frame], m = (x) => 2 * VC - x, hem = 26
  const sL = [VC - 3, 11 + bob], A = [hx, hy + bob], B = [VC - 5, hem]
  // the cape's free edge, hand to hem: a bat wing, three points hanging down with notches between
  const at = (t, dx, dy) => [Math.round(A[0] + (B[0] - A[0]) * t + dx * open), Math.round(A[1] + (B[1] - A[1]) * t + dy * open)]
  const half = [sL, A, at(0.2, 2, -1), at(1 / 3, -1, 1), at(0.53, 2, -1), at(2 / 3, -1, 1), at(0.86, 2, -1), B, [VC - 2, hem - 2], [VC, hem]]
  const mirror = ([x, y]) => [m(x), y]
  c.poly([...half, ...half.slice(0, -1).reverse().map(mirror)].flat(), "r")
  for (const pts of [half, half.map(mirror)])
    for (let i = 1; i < pts.length - 1; i++) c.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], "2")
  // high collar standing up behind the head
  for (const f of [(p) => p, mirror]) {
    const pts = [[VC - 3, 12 + bob], [VC - 8, 4 + bob], [VC - 6, 11 + bob]].map(f)
    c.poly(pts.flat(), "r"); c.line(...pts[0], ...pts[1], "2"); c.line(...pts[1], ...pts[2], "2")
  }
  c.rect(VC - 2, 18 + bob, 5, hem - 18 - bob, "R")          // the lining in the body's shadow, between the legs
  c.stamp("_vamp", VC - 5, bob)
  for (const f of [(p) => p, mirror]) {
    const [sx, sy] = f(sL), [ex, ey] = f(A)
    c.line(sx, sy, ex, ey, "K", 2)
    c.px(ex, ey, "f")
  }
})

// ---------------------------------------------------------------- shared: thick limbs
// An arm or leg as a 2 px line through its joints, with a 2x2 hand or foot at the end.
const limb = (c, pts, color, end) => {
  for (let i = 1; i < pts.length; i++) c.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], color, 2)
  if (end) c.rect(pts.at(-1)[0] - 1, pts.at(-1)[1] - 1, 2, 2, end)
}

// ---------------------------------------------------------------- mummy
// Wrapped in bands (light, shaded and warm rows, the shaded ones stepping like a spiral), eyes
// glowing in a dark slit. Dances the Egyptian: forearms at right angles, one up and one down,
// the head sliding side to side; a loose bandage swings from one wrist.
sprite("_mummy", { mx: "c" }, `
  ...777
  .7bbbb
  .bBBbb
  bbbbBB
  bkykkk
  bbbbbb
  BBbbbb
  .bbBBb
  ..bbbb
  ...7bb
  ..bbbb
  ..BBbb
  ..bbBB
  ..7bbb
  ..BBbb
  ..bbBB
  ..bbbb
  ..bB..
  ..bb..
  ..Bb..
  ..bb..
  ..bB..
  .bbb..`)
// per frame: bob, head slide, [elbowL, handL], [elbowR, handR]
const MUMMY = [
  [0, -1, [[1, 12], [1, 7]], [[19, 12], [19, 17]]],
  [1, 0, [[3, 12], [1, 12]], [[17, 12], [19, 12]]],
  [0, 1, [[1, 12], [1, 17]], [[19, 12], [19, 7]]],
  [1, 0, [[3, 12], [1, 12]], [[17, 12], [19, 12]]],
]
anim("mummy", { w: 21, h: 26, frames: 4, fps: 8, outline: "k", pivot: "bottom" }, (c) => {
  const [bob, slide, armL, armR] = MUMMY[c.frame]
  c.stamp("_mummy", 5, 2 + bob)
  c.warp((x, y) => y <= 10 + bob && [slide, 0])
  for (const [sh, [e, h]] of [[[7, 12 + bob], armL], [[13, 12 + bob], armR]]) {
    const E = [e[0], e[1] + bob], Hd = [h[0], h[1] + bob]
    limb(c, [sh, E, Hd], "b", "b")
    c.px(E[0], E[1], "B"); c.px(Math.round((E[0] + Hd[0]) / 2), Math.round((E[1] + Hd[1]) / 2), "7")
  }
  // a loose bandage hangs from the left hand and swings
  const [lx, ly] = [armL[1][0], armL[1][1] + bob]
  c.line(lx - 1, ly + 1, lx - 1 - (c.frame % 2), ly + 4, "7")
})

// ---------------------------------------------------------------- ghost
// A sheet ghost floating: it bobs, its hem ripples (each column of the hem lifts in turn), and
// its little arms wave. Pale and glowing: it carries a faint cold light.
sprite("_ghost", { mx: "c" }, `
  .....iii
  ...iiiii
  ..iiiiii
  .iiiiiii
  .iiiiiii
  iiikkiii
  iiikkiii
  iiikkiii
  iiiiiiii
  Iiiiiikk
  Iiiiiikk
  Iiiiiiii
  IIiiiiii
  IIiiiiii
  6IIiiiii
  6IIIiiii
  6IIIiiii
  .6I.IIi.`)
const GHOST_BOB = [0, -1, -2, -1]
anim("ghost", { w: 21, h: 24, frames: 4, fps: 8, outline: "6", pivot: "bottom" }, (c) => {
  const b = GHOST_BOB[c.frame] + 2
  c.stamp("_ghost", 3, b)
  c.warp((x, y) => y >= 15 + b && [0, -Math.round(Math.sin((x / 15 + c.frame / 4) * Math.PI * 2))])
  // arms: stubs that wave, one up while the other is down
  const up = c.frame % 2 ? 0 : (c.frame === 0 ? 1 : -1)
  c.grid(1, 10 + b - up, "ii\nIi")
  c.grid(18, 10 + b + up, "ii\niI")
  c.lamp(10, 10 + b, { r: 18, color: "#a8d0ff", power: 0.5 })
})

// ---------------------------------------------------------------- zombie
// Torn blue shirt with skin through the holes, one eye bulging, stitches on the forehead. Dances
// Thriller: claws up to one side while the body leans that way, then to the other.
sprite("_zombie", `
  ....4..4.4...
  ..44K44K444..
  .44444444444.
  .zz4zzzzz4zz.
  .zz3k3zzzzzz.
  .zbbzzzzbbbz.
  .zbkzzzzbkbz.
  .zZzzzZzzzzz.
  .Zzkkkkkkzzz.
  ..Zzbkbkzzz..
  ...ZZzzzZZ...
  .....zzz.....
  ..CCCzzzCC...
  ..CCCCzCCCC..
  ..CLCCCCCLC..
  ..CCzzCCCCC..
  ..CCzZCCLCC..
  ..LCCCCCC.L..
  ..DDDDDDDD...
  ..DDqDDqDD...
  ...DD..DD....
  ...DD..DD....
  ...DD..Dq....
  ..zzz..zzz...`)
// per frame: bob, lean (top shifts), [elbowL, handL], [elbowR, handR]
const ZOMBIE = [
  [0, -1, [[1, 11], [1, 6]], [[16, 13], [17, 10]]],
  [1, 0, [[1, 13], [0, 9]], [[17, 13], [18, 9]]],
  [0, 1, [[2, 13], [1, 10]], [[17, 11], [17, 6]]],
  [1, 0, [[1, 13], [0, 9]], [[17, 13], [18, 9]]],
]
anim("zombie", { w: 19, h: 26, frames: 4, fps: 8, outline: "k", pivot: "bottom" }, (c) => {
  const [bob, lean, armL, armR] = ZOMBIE[c.frame]
  c.stamp("_zombie", 3, 2 + bob)
  c.warp((x, y) => y <= 19 + bob && [y <= 12 + bob ? lean : 0, 0])
  for (const [sh, [e, h]] of [[[5, 15 + bob], armL], [[13, 15 + bob], armR]]) {
    const E = [e[0], e[1] + bob], Hd = [h[0], h[1] + bob]
    limb(c, [sh, E, Hd], "z", "z")
    c.line(sh[0], sh[1], Math.round((sh[0] + E[0]) / 2), Math.round((sh[1] + E[1]) / 2), "C", 2)   // torn sleeve
    c.px(Hd[0] - 1, Hd[1] - 2, "Z"); c.px(Hd[0] + 1, Hd[1] - 2, "Z")                               // claws
  }
})

// ---------------------------------------------------------------- witch and her cauldron
// In profile, facing her cauldron: crooked hat, long nose, green skin, hair down her back. She
// stirs with a long ladle (her hand goes round), the brew bubbles, a fire burns under the pot.
sprite("_witch", `
  ..K.............
  ..KK............
  ...KK...........
  ....KK..........
  ....KKK.........
  ....KKKK........
  ...KKKKKK.......
  ...KUUUBUK......
  KKKKKKKKKKKKK...
  ..22zzzzzz......
  ..22zzzkzz......
  .222zzzzzzZZZ...
  .222zzzzzzz.Z...
  .222Zzzzkkz.....
  2222.ZZzzz......
  222..UUUU.......
  22..UUUUUU......
  2..UUUUUUU......
  ...UUUUUU2......
  ...2UUUUU2......
  ..22UUUUU2......
  ..2UUUUUUU2.....
  .22UUUUUUU2.....
  .2UUUUUUUUU2....
  22UUUUUUUUUU2...
  2UUUUUUUUUUU2...
  ...kk...kk......
  ..kkk...kkkk....`)
const STIR = [[15, 15], [17, 16], [16, 17], [14, 16]]
const BUBBLES = [[[21, 18], [29, 18]], [[23, 18], [31, 18]], [[27, 18], [22, 18]], [[30, 18], [25, 18]]]
const witchArm = (c) => { const [hx, hy] = STIR[c.frame]; c.line(8, 23, hx, hy, "U", 2); c.rect(hx, hy - 1, 2, 2, "z") }
// the witch alone, same frames and place: what her shadow is cast from (the pot doesn't shadow its own fire)
anim("witch_body", { w: 36, h: 34, frames: 4, fps: 8, outline: "k", pivot: [18, 34] }, (c) => { c.stamp("_witch", 0, 6); witchArm(c) })
anim("witch", { w: 36, h: 34, frames: 4, fps: 8, outline: "k", pivot: [18, 34] }, (c) => {
  const f = c.frame
  // the pot on short legs: round black belly, moonlit rim, the brew on top
  c.ellipse(26, 24, 9, 5, "K"); c.ellipse(27, 23, 7, 3, "T"); c.ellipse(25, 24, 8, 4, "K")
  c.vline(19, 28, 4, "K"); c.vline(33, 28, 4, "K")
  c.ellipse(26, 18, 8, 1, "P"); c.hline(20, 18, 13, "p")
  for (const [bx, by] of BUBBLES[f]) c.px(bx, by, "e")
  c.px(25 + (f % 2), 15 - f, "p"); c.px(28, 12 - (f + 2) % 4, "P")       // green steam rising
  // the fire between the legs: logs and flames that change shape
  c.rect(21, 32, 11, 2, "W"); c.line(22, 33, 30, 32, "x")
  c.grid(21, 29, f % 2 ? ".a..o..a..\noAao.oaAo.\n.oaAoaAao." : "..o..a..o.\n.oaAo.oao.\noaAaoaAaoo")
  // the witch, her arm up over the rim, the ladle going down into the brew behind the rim
  c.stamp("_witch", 0, 6)
  const [hx, hy] = STIR[f]
  const t = (18 - (hy - 4)) / 9
  c.line(hx - 2, hy - 4, Math.round(hx - 2 + 10 * t), 18, "w")      // ends where it goes into the brew
  c.rect(17, 19, 19, 2, "T"); c.hline(17, 19, 19, "S")
  witchArm(c)
  c.lamp(26, 17, { r: 40, color: "#80ff70", power: 0.95 + 0.1 * (f % 2) })
  c.lamp(26, 31, { r: 16, color: "#ff9a40", power: 0.7 })
})

// ---------------------------------------------------------------- Frankenstein's monster, DJ
// Flat-topped head with a jagged fringe, a stitched scar, bolts in the neck, purple headphones.
// He stands behind his booth (a coffin laid on two stone blocks, two decks and a mixer on top):
// nods on the beat, scratches with one hand and throws the other up.
sprite("_frank", { mx: "c" }, `
  ..UUUU
  .U.KKK
  .UKKKK
  UUKKKK
  UUzKzK
  UUz3k3
  UUZZZZ
  .zzkzz
  .zzzzZ
  .zzkkk
  .zzzzz
  ..ZZZZ
  B3.zzz
  TTTTTT
  TTTTTK
  TTTTTK
  TTTTKK`)
// per frame: bob, left hand x on the record, right [elbow, hand]
const DJ = [[0, 11, [[31, 10], [33, 4]]], [1, 14, [[31, 10], [33, 4]]], [0, 11, [[30, 14], [32, 16]]], [1, 14, [[30, 14], [32, 16]]]]
anim("dj", { w: 48, h: 36, frames: 4, fps: 8, outline: "k", pivot: "bottom" }, (c) => {
  const [bob, lx, [re, rh]] = DJ[c.frame]
  c.rect(19, 18, 9, 4, "T")                                   // his middle, behind the booth
  c.stamp("_frank", 18, 2 + bob)
  // the booth: a coffin lying with its lid to us (wide at the shoulders, tapering to the feet),
  // a brass cross and handles, on two stone blocks
  c.rect(6, 29, 7, 7, "t"); c.hline(6, 29, 7, "S"); c.rect(35, 29, 7, 7, "t"); c.hline(35, 29, 7, "S")
  c.poly([3, 22, 33, 20, 46, 21, 46, 29, 33, 31, 3, 29], "W")
  c.line(3, 21, 33, 19, "w"); c.line(33, 19, 46, 20, "w"); c.line(4, 22, 33, 20, "d")
  c.vline(38, 22, 6, "B"); c.hline(36, 24, 5, "B")
  for (const x of [10, 22]) c.hline(x, 26, 2, "B")
  // decks and mixer on the lid; the mixer's lights blink with the beat
  c.rect(7, 17, 12, 2, "S"); c.hline(7, 18, 12, "t"); c.rect(29, 17, 12, 2, "S"); c.hline(29, 18, 12, "t"); c.rect(21, 17, 6, 2, "t")
  c.ellipse(13, 17, 4, 1, "k"); c.px(13, 17, "r"); c.ellipse(35, 17, 4, 1, "k"); c.px(35, 17, "u")
  c.px(22, 17, c.frame % 2 ? "p" : "P"); c.px(24, 17, c.frame % 2 ? "U" : "u"); c.px(26, 17, "o")
  // arms: the left scratches the record, the right goes up and comes down to the deck
  limb(c, [[19, 15 + bob], [lx + 1, 14 + bob], [lx, 16]], "T", "z")
  limb(c, [[27, 15 + bob], re, rh], "T", "z")
  c.lamp(24, 12, { r: 40, color: "#c070ff", power: 0.9 })
})

// Speakers: coffins standing up, a woofer and a tweeter; the cones kick on the beat (120 BPM).
anim("speaker", { w: 12, h: 22, frames: 4, fps: 8, outline: "k", pivot: "bottom" }, (c) => {
  c.poly([3, 0, 9, 0, 12, 6, 9, 22, 3, 22, 0, 6], "W"); c.vline(9, 1, 20, "w")
  const kick = c.frame === 0
  c.circ(6, 6, 2, "K"); c.px(6, 6, "T")
  c.circ(6, 14, kick ? 4 : 3, "K"); c.circ(6, 14, kick ? 2 : 1, "T"); c.px(6, 14, kick ? "S" : "t")
})

// ---------------------------------------------------------------- werewolf
// Standing on the crypt's cornice in profile, howling at the moon. Proportions from the LPC
// werewolf's side view (opengameart.org/node/107531 by Redshrike, William.Thompsonj and AntumDeluge,
// CC-BY-SA 3.0: a reference for proportions only, no pixels taken): the
// head a third of the height, a wedge with a long thick muzzle and ears laid back, a thick ruff
// for a neck, a barrel chest, a heavy arm hanging forward with big claws, a wolf leg (knee
// forward, hock back) and a bushy tail from the base of the back. Warm fur in four tones. Three
// beats of howling, one of breath with the muzzle level and shut (2 s). Drawn from shapes; a
// hand-grid redraw came out pot-bellied, and moving the far arm to show behind the back made the
// body read as facing the other way from the head.
const WOLF = (howl) => (c) => {
  // far arm and far leg, in shadow, behind everything
  c.line(8, 15, 7, 23, "1", 3); c.rect(6, 23, 3, 2, "1")
  c.line(10, 25, 9, 30, "1", 3); c.hline(8, 31, 4, "1")
  // tail: from the base of the back, just above the trousers, thick at the root, curving down
  // behind him to a lighter tip
  c.curve([8, 20, 4, 22, 2, 25, 1, 29], "1", { width: 3 })
  c.line(7, 19, 3, 21, "h"); c.px(1, 30, "X"); c.px(0, 29, "Y")
  // torso: a barrel chest pushed forward, the back hunched
  c.ellipse(12, 18, 6, 6, "h")
  c.poly([6, 14, 10, 10, 16, 11, 18, 16, 17, 22, 8, 22], "h")
  c.poly([14, 13, 18, 16, 17, 21, 14, 19], "X")              // pale chest
  // torn trousers and the near leg (thigh forward, shin back, a big foot)
  c.rect(8, 21, 10, 4, "U"); c.px(9, 25, "U"); c.px(12, 25, "U"); c.px(16, 25, "U"); c.hline(8, 24, 10, "2")
  c.line(14, 25, 15, 28, "h", 3); c.line(15, 28, 14, 30, "h", 2); c.rect(13, 30, 5, 2, "h"); c.px(18, 31, "X")
  // the head: skull, laid-back ears, the muzzle as a wedge
  const up = howl ? 1 : 0
  c.ellipse(11, 9, 4, 4, "h")
  c.poly([9, 7, 6, 0, 11, 5], "1"); c.poly([11, 6, 10, 0, 14, 6], "h")    // ears
  if (howl) {
    c.poly([11, 9, 13, 4, 20, 0, 22, 1, 17, 7, 14, 10], "h")                // upper jaw, up at the moon
    c.poly([14, 11, 19, 7, 23, 5, 22, 8, 16, 13], "h")                      // lower jaw, dropped open
    c.poly([16, 9, 21, 3, 22, 5, 17, 10], "R")                              // the open mouth
    // teeth on both edges of the mouth, every other pixel, the lower row parallel to the upper
    c.px(20, 4, "b"); c.px(18, 6, "b"); c.px(20, 6, "b"); c.px(18, 8, "b")
    c.px(22, 0, "k")                                                        // nose
    c.line(13, 4, 19, 0, "X")                                               // moonlit top of the muzzle
  } else {
    c.poly([11, 8, 13, 5, 21, 6, 22, 8, 15, 11], "h")                       // muzzle level, mouth shut
    c.line(15, 10, 21, 8, "1"); c.px(22, 7, "k")
    c.line(13, 5, 20, 6, "X")
  }
  c.px(12, 7 - up, "y")                                                     // eye under the brow
  // a thick ruff where the neck would be: tufts down the back of the head into the shoulders
  c.poly([6, 10, 9, 12, 13, 13, 10, 16, 6, 15, 7, 13], "h")
  c.px(6, 11, "1"); c.px(5, 13, "1"); c.px(6, 15, "1")
  // near arm: heavy, hanging forward, clawed hand at the hip
  c.line(13, 13, 16, 18, "h", 3); c.line(16, 18, 18, 22, "h", 3)
  c.rect(17, 22, 3, 2, "h"); c.px(17, 24, "b"); c.px(19, 24, "b"); c.px(20, 23, "b")
  c.line(14, 13, 17, 18, "1")                                               // the arm's inner edge, apart from the chest
  // fur in shadow down the back and under the belly
  c.line(7, 15, 7, 20, "1"); c.line(9, 21, 15, 21, "1")
}
sprite("_wolf_howl", { w: 24, h: 32, outline: "k", pivot: "bottom" }, WOLF(true))
sprite("_wolf_rest", { w: 24, h: 32, outline: "k", pivot: "bottom" }, WOLF(false))
anim("werewolf", { w: 26, h: 34, frames: 4, fps: 2, pivot: "bottom" }, (c) => {
  c.stamp(c.frame === 3 ? "_wolf_rest" : "_wolf_howl", 13, 34)
  // moonlight on the fur that faces the moon (to his right), only on the outer edge: the outline
  // beside it has open sky past it, not more of him
  const rim = []
  for (let y = 0; y < 34; y++) for (let x = 0; x < 24; x++)
    if (c.is(x, y, "h") && c.is(x + 1, y, "k") && c.is(x + 2, y, ".")) rim.push([x, y])
  for (const [x, y] of rim) c.px(x, y, "X")
})
