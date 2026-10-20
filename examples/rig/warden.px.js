// A forest warden's axe combo, 42 px tall, facing right in 3/4: idle, a wind-up, a level slash with
// its smear, a high wind-up held, a chop from above into the ground with sparks and dust, and back to
// idle. The head and the tunic are drawn by hand (small organic shapes); legs and arms come from their
// joints every frame (ik, painted round by capsule), the axe drawn at any angle from the hand, so a pose
// is a row of numbers. On the floor, its reflection: the same frames flipped at a quarter's opacity.
pal({
  k: "#120e17",
  S: "#8a4b3a", s: "#c9805e", z: "#eab38c",                  // skin
  R: "#4a1f1c", r: "#8a3a24", q: "#c0602e",                  // auburn hair
  D: "#1c3326", G: "#2f5a3a", g: "#4f8a4a", h: "#86b85c",    // tunic
  F: "#4a3b30", f: "#7a6450", e: "#b09a7a",                  // fur mantle
  B: "#3b2516", b: "#6b4426", n: "#9a6a3a",                  // leather
  T: "#2a2b3d", t: "#4a4c66",                                // trousers
  O: "#2b1a14", o: "#5a3828",                                // boots
  1: "#3c4250", 2: "#6d7688", 3: "#a9b3c2", 4: "#eef3f8",    // steel
  W: "#4a2c17", w: "#8a5a30",                                // the haft
  y: "#fff4d8", Y: "#f0c46a",                                // the smear: a warm white, a gold edge
  x: "#fffbe8", d: "#8a7d70", p: "#5c534c",                  // sparks, dust
  a: "#2a2733", A: "#3a3644",                                // the floor
})
ramps("kSsz", "kRrq", "kDGgh", "kFfe", "kBbn", "kTt", "kOo", "k1234", "kWw")

// the head, turned to the right: the hair over the crown and the back, the face toward us, one eye
sprite("_warden_head", { facing: "right" }, `
  ...RRRr..
  ..RrrqqR.
  .RrrqqrrR
  .RrRssszr
  .RRsszzzs
  .RRsSzkzs
  ..RsszzzS
  ...SsszS.
  ....SSS..`)

// the tunic under the fur mantle, its belt, the skirt flaring a pixel; the near arm is drawn apart
sprite("_warden_torso", { facing: "right" }, `
  ...ffeee...
  ..fffeeeef.
  .FfffffeefF
  .DGGggghhG.
  .DGGgghhhG.
  .DGGgghhgG.
  .DDGGgggGD.
  ..DGGgggD..
  ..BBbbnnB..
  ..DGGggGD..
  .DDGGgggGD.
  .DGGggggGD.
  DDGGGgggGGD`)

const SOLE = 72, X0 = 40, LIGHT = [0.6, -1]                 // the sole's row, the pelvis's x at rest; light from the upper front
const HIP = 19, SHOULDER = 32, HEAD = 41                    // heights over the sole
const THIGH = 9, SHIN = 9, UPPER = 7, FORE = 7, HAFT = 13   // bone lengths
const rad = (d) => (d * Math.PI) / 180

// the poses, one a frame: x and bob move the pelvis, lean the shoulders; feet [behind, in front] in px
// from the pelvis; hand from the near shoulder; axe the haft's angle (degrees clockwise from pointing
// right); off the far hand; smear [from, to] round the shoulder (the blade's last stretch), its width
const IDLE = { x: 0, bob: 0, lean: 0, feet: [-4, 5], hand: [3, 10], axe: 95, off: [-2, 10] }
const POSES = [
  { ...IDLE },
  { ...IDLE },
  { ...IDLE, bob: 1 },
  { ...IDLE, bob: 1 },
  { ...IDLE, bob: 1, lean: -1, feet: [-6, 6], hand: [-4, -6], axe: -150, off: [4, 4] },
  { ...IDLE, bob: 2, lean: -2, feet: [-6, 6], hand: [-6, -8], axe: -170, off: [6, 2] },
  { x: 3, bob: 3, lean: 3, feet: [-8, 9], hand: [12, 2], axe: 40, off: [-5, 6], smear: [-60, 40, 6] },
  { x: 3, bob: 3, lean: 3, feet: [-8, 9], hand: [10, 8], axe: 80, off: [-5, 7], smear: [10, 75, 3] },
  { x: 2, bob: 2, lean: 1, feet: [-7, 8], hand: [6, 7], axe: 100, off: [-3, 8] },
  { x: 1, bob: 1, lean: -1, feet: [-6, 6], hand: [0, -12], axe: -120, off: [4, 0] },
  { x: 0, bob: 0, lean: -2, feet: [-6, 6], hand: [-2, -14], axe: -160, off: [6, -2] },
  { x: 0, bob: 0, lean: -2, feet: [-6, 6], hand: [-2, -14], axe: -165, off: [6, -2] },
  { x: 4, bob: 4, lean: 4, feet: [-9, 10], hand: [13, 6], axe: 70, off: [-5, 5], smear: [-40, 60, 7] },
  { x: 4, bob: 4, lean: 4, feet: [-9, 10], hand: [13, 7], axe: 75, off: [-5, 5], smear: [30, 70, 2], spark: 1 },
  { x: 4, bob: 4, lean: 4, feet: [-9, 10], hand: [13, 7], axe: 75, off: [-5, 6], spark: 2 },
  { x: 3, bob: 3, lean: 2, feet: [-8, 9], hand: [10, 4], axe: 60, off: [-4, 7] },
  { x: 1, bob: 1, lean: 0, feet: [-5, 6], hand: [5, 8], axe: 95, off: [-2, 9] },
  { ...IDLE },
]

// the cape's hem lags the shoulders: how far they moved since the frame before, back the other way
POSES.forEach((p, i) => { const q = POSES[(i + POSES.length - 1) % POSES.length]; p.trail = Math.max(-1, Math.min(4, (p.x + p.lean - q.x - q.lean) * 0.8)) })

// where the pose puts the joints
const joints = (p) => {
  const hx = X0 + p.x, hy = SOLE - HIP + p.bob, sx = hx + p.lean + 1, sy = SOLE - SHOULDER + p.bob
  const hand = [sx + p.hand[0], sy + p.hand[1]], b = [Math.cos(rad(p.axe)), Math.sin(rad(p.axe))]
  return { hx, hy, sx, sy, hand, b, head: [hand[0] + b[0] * 12, hand[1] + b[1] * 12] }
}
const leg = (c, hx, hy, footX, near) => {
  const [k, a] = ik(THIGH, SHIN, [footX, SOLE - 2 - hy], -1)
  const K = [hx + k[0], hy + k[1]], A = [hx + a[0], hy + a[1]]
  c.capsule(hx, hy, 1.7, K[0], K[1], 1.4, near ? "Tt" : "TT", { light: LIGHT })
  c.capsule(K[0], K[1], 1.4, A[0], A[1], 1.3, near ? "Oo" : "OO", { light: LIGHT })
  c.poly([A[0] - 1, A[1] - 1, A[0] + 2, A[1] - 1, A[0] + 3, SOLE, A[0] - 1, SOLE].map(Math.round), near ? "o" : "O")   // the boot's foot
}
const arm = (c, sx, sy, hand, near) => {
  const [e, w] = ik(UPPER, FORE, [hand[0] - sx, hand[1] - sy], 1)
  const E = [sx + e[0], sy + e[1]], H = [sx + w[0], sy + w[1]]
  c.capsule(sx, sy, 1.6, E[0], E[1], 1.4, near ? "Ggh" : "DG", { light: LIGHT })        // the sleeve
  c.capsule(E[0], E[1], 1.5, H[0], H[1], 1.2, near ? "Bbn" : "Bb", { light: LIGHT })   // the bracer
  c.ellipse(Math.round(H[0]), Math.round(H[1]), 1, 1, near ? "s" : "S")                 // the fist
}
// the axe from the hand along b: the haft, and a bearded head on its leading side (+n: a clockwise swing)
const axe = (c, hand, b) => {
  const n = [-b[1], b[0]], at = (t, s) => [Math.round(hand[0] + t * b[0] + s * n[0]), Math.round(hand[1] + t * b[1] + s * n[1])]
  c.line(...at(-3, 0), ...at(HAFT, 0), "W", 2)
  c.line(...at(-2, 0), ...at(HAFT - 1, 0), "w")
  c.poly([...at(8.5, 0.5), ...at(13.5, 0.5), ...at(15, 3.5), ...at(14.5, 7), ...at(11, 6), ...at(9.5, 3.5)], "2")
  c.line(...at(15, 3.5), ...at(14.5, 7), "4"); c.line(...at(14.5, 7), ...at(11, 6), "3")   // the edge, bright
  c.line(...at(9, 1), ...at(13, 1), "1")                                                     // the cheek by the haft, dark
  c.poly([...at(10, -0.5), ...at(12.5, -0.5), ...at(11, -3)], "1")                           // the back spike
}
// a short fur cape from the shoulders, its hem trailing behind by `trail` px (the body's last move)
const cape = (c, sx, sy, trail) => {
  c.poly([sx - 3, sy, sx, sy, sx, sy + 12, sx - 3 - trail, sy + 13, sx - 4 - trail, sy + 5].map(Math.round), "F")
  c.line(sx - 3, sy + 1, Math.round(sx - 4 - trail), sy + 5, "f")
}

anim("warden_combo", { w: 96, h: 76, frames: POSES.length, fps: 11, pivot: [X0, SOLE + 1], outline: "k", facing: "right" },
  layer("body", (c) => {
    const p = POSES[c.frame], j = joints(p)
    arm(c, j.sx - 3, j.sy + 2, [j.sx - 3 + p.off[0], j.sy + 2 + p.off[1]], false)    // the far arm, behind
    leg(c, j.hx - 2, j.hy, p.feet[0] + 2, false)
    cape(c, j.sx, j.sy, p.trail ?? 0)
    c.stamp("_warden_torso", j.sx - 6, j.sy - 1)
    leg(c, j.hx + 1, j.hy, p.feet[1] - 1, true)
    // the near arm and the axe: in front, unless drawn back past the shoulder (then behind the head)
    const back = p.hand[0] < 0, near = () => { axe(c, j.hand, j.b); arm(c, j.sx + 2, j.sy + 2, j.hand, true) }
    if (back) near()
    c.stamp("_warden_head", j.sx - 5, SOLE - HEAD + p.bob)
    if (!back) near()
  }),
  // what the blade swept, round the shoulder: a crescent thick at the blade, thin at its tail
  layer("smear", { outline: false, unlit: true }, (c) => {
    const p = POSES[c.frame], j = joints(p)
    if (p.smear) {
      const [from, to, w] = p.smear, r = Math.hypot(j.head[0] - j.sx, j.head[1] - j.sy) + 2
      c.arc(j.sx, j.sy, r, from, to, "y", { inner: r - w, taper: true })
      c.arc(j.sx, j.sy, r + 1, from + (to - from) * 0.4, to, "Y")
    }
    if (p.spark) {
      const [gx, gy] = [Math.round(j.head[0]), SOLE]
      for (const [dx, dy] of [[-4, -3], [3, -5], [6, -2], [-1, -6], [8, -4]]) c.px(gx + dx * p.spark, gy + dy * p.spark - (p.spark - 1) * 2, p.spark === 1 ? "x" : "Y")
      c.ellipse(gx, gy - 1, 3 + p.spark * 2, 1 + p.spark, p.spark === 1 ? "d" : "p")
    }
  }))

// on a polished stone floor: the combo and, under it, its reflection at a quarter's opacity
scene("warden_floor", { w: 96, h: 120, bg: "a" },
  rect(0, 77, 96, 43, "A"),
  layer("reflection", { opacity: 0.25 }, stamp("warden_combo", X0, 77, { flip: "y" })),
  layer("warden", stamp("warden_combo", X0, 77)))
