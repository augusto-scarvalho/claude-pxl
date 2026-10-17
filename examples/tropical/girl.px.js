// The forest's girl as an Indigenous Brazilian girl: the Auto Tactics 32px SD girl's head, face and
// proportions (from a 32px SD girl drawn for Auto Tactics), with long straight black hair and a straight fringe,
// brown skin, red urucum dots on the cheeks, a bead necklace (miçangas), a red woven top, a buriti
// fibre skirt, a jenipapo band painted round the calves, red armbands and bare feet. 3/4 left.
// The arms hang apart from the body (a gap the outline turns into a line) and the waist is no wider
// than the chest, or the top, skirt and arms read as one round belly. The hair in front ends at the
// chin, so the near shoulder shows and the arm doesn't come out of the hair.
pal({
  k: "#0c090b",                                                     // outline
  1: "#0a0810", h: "#1a1620", j: "#343046", J: "#56506e",           // hair: black with a blue sheen
  f: "#c88f60", t: "#a86b44", s: "#965a38", S: "#6f4128",           // skin, light to shadow
  z: "#000000", 3: "#1c120e", H: "#3a2418", Y: "#ffffff",           // eyes
  R: "#c43a2a", r: "#e2683a", D: "#7c2219",                         // urucum red
  n: "#16161e",                                                     // jenipapo
  y: "#efe6cf", e: "#eab53a", u: "#3a78d0",                         // beads
  B: "#d8b46a", b: "#b08a45", O: "#7d5c2c",                         // buriti fibre
})
// Standing: the same parts the walk moves (below), at rest: her long hair hanging behind her, her
// head and body, both arms hanging and both feet planted.
sprite("girl_pose", { w: 30, h: 26, outline: "k" },
  layer("hair", stamp("hair_long", 16, 4)),
  layer("parts", { sort: "z" },
    stamp("girl_top", 15, 26, { z: 2 }),
    stamp("leg_r", 0, 0, { at: "girl_top.leg_r", z: 1 }), stamp("leg_l", 0, 0, { at: "girl_top.leg_l", z: 0 }),
    stamp("arm_r_0", 0, 0, { at: "girl_top.arm_r", z: 3 }), stamp("arm_l_0", 0, 0, { at: "girl_top.arm_l", z: 1.5 })))

// ---------------------------------------------------------------- walking
// She walks toward the bottom left (SW; flipped for SE), 8 frames, built from parts on sockets and
// driven by the CC0 walk guide in ../motion/walk.json: the guide says which foot is planted, how far
// each foot is ahead or behind, where the hands swing and when the body rises; the parts are drawn by
// hand at her size. The guide shows in the previews (a ref layer), limbs colored by side.
// Head, torso and skirt: the standing girl without her legs and arms. Her long hair hangs behind
// her (a part of its own, drawn under everything), so her far arm shows in front of it.
// Sockets mark where those attach; the pivot is between her feet on the ground.
const TOP = `
  ...........1hhhhhhhh1.........
  .........1hhjjjhhhhhh1........
  ........1hjJJjhhhhhhhh1.......
  ........1hjjhhhhhhhhhh1.......
  ........1hhhhhhhhhhhhh1.......
  ........1hhhhhhhhhhhhh1.......
  ........1h1sssssssssSh1.......
  ........1h1fzzffzzftSh1.......
  ........1h1f3Yff3YftSh1.......
  .........1hfH3ffH3ftSh1.......
  .........1hfRffffRftSh1.......
  .........1hfffSffftShh1.......
  .........1h1tfffftShhh1.......
  ..............Stt..hhh1.......
  ..........fttytttytthh1.......
  ...........ttReuttS...........
  ...........rRRRRRDD...........
  ...........RnRnRnDD...........
  ............OOOOOOO...........
  ............bBbBbBbO..........
  ...........bBbBbBbBO..........
  ...........b.Bb.bB.O..........`
sprite("girl_top", { w: 30, h: 22, pivot: [15, 26], sockets: { arm_r: [9, 15], arm_l: [19, 15], leg_r: [11, 21], leg_l: [16, 21] } }, TOP)

// Legs, planted (the foot pointing the way she walks) and lifted (the foot drawn up). Their top row
// hides under the skirt, so a leg stepping down a pixel doesn't open a gap.
sprite("leg_r", ".ftS\n.ftS\n.nnn\n.ftS\nfttS")
sprite("leg_r_up", ".ftS\n.ftS\n.nnn\nfttS")
sprite("leg_l", "ttS\nttS\nnnn\nttS\nttS")
sprite("leg_l_up", "ttS\nttS\nnnn\nttS")
// The near arm hanging, swung forward a little, and swung forward (it hangs from the shoulder corner).
sprite("arm_r_0", { pivot: [0, 0] }, "RD\nft\nft\ntS\nft")
sprite("arm_r_1", { pivot: [1, 0] }, ".RD\n.ft\nft.\ntS.\nf..")
sprite("arm_r_2", { pivot: [2, 0] }, "..RD\n.ft.\nft..\ntS..")
// The far arm, in shadow: hanging, swung back (the hand past her back) and swung forward (the
// hand behind her body, so it hides). It swings against the near arm.
sprite("arm_l_0", "RD\ntS\ntS\ntS\ntS")
sprite("arm_l_back", "RD.\ntS.\n.tS\n.tS\n.tS")
sprite("arm_l_fwd", { pivot: [1, 0] }, ".RD\n.tS\ntS.\ntS.\ntS.")
// Her long hair, behind her: from the top of her head down her back to the waist, cut straight at
// the bottom. Her head, body and arms are in front of it, so what shows is the part past her back.
sprite("hair_long", `
  hhhhhh1
  hhhhhh1
  hhhhhh1
  hhhhhh1
  hhhhhh1
  hhhhhh1
  hhhhhh1
  hhhhhh1
  hhhhhh1
  .hhhhh1
  .hhhhh1
  .hhhhh1
  .hhhhh1
  .hhhhh1
  .hhhhh1
  .111111`)

{
  // What the guide gives, per frame. Ankles and wrists are measured from the hip and the shoulder,
  // in guide pixels; at her size a guide pixel is about a tenth of hers.
  const G = motion("../motion/walk.json", { dir: "SW" })
  const SMALL = motion("../motion/walk.json", { dir: "SW", scale: 0.2, at: [15, 26] })   // the guide at her size
  const rel = (f, a, b) => [G.frames[f][a][0] - G.frames[f][b][0], G.frames[f][a][1] - G.frames[f][b][1]]
  const STEP = 0.05, DEPTH = 0.07, SWING = 0.12
  const lowest = Math.max(...G.frames.map((f) => f.mid_hip[1]))
  // in a 3/4 view the foot ahead is also lower on screen and the one behind higher
  const meanY = (a) => G.frames.reduce((t, _, i) => t + rel(i, a, "mid_hip")[1], 0) / G.frames.length
  // At 32 px legs that cross read as a tangle: the far leg stops a pixel short of the near one.
  const PLAN = G.frames.map((_, i) => ({
    bob: lowest - G.frames[i].mid_hip[1] > 1.5 ? 1 : 0,                       // up in the passing frames
    legR: Math.round(rel(i, "r_ankle", "mid_hip")[0] * STEP), upR: !G.contact[i][1],
    legRy: Math.round((rel(i, "r_ankle", "mid_hip")[1] - meanY("r_ankle")) * DEPTH),
    legL: Math.round(rel(i, "l_ankle", "mid_hip")[0] * STEP), upL: !G.contact[i][0],
    legLy: Math.round((rel(i, "l_ankle", "mid_hip")[1] - meanY("l_ankle")) * DEPTH),
    rFront: G.depth[i].r_ankle >= G.depth[i].l_ankle,                        // which leg is nearer
    arm: Math.min(2, Math.round(-rel(i, "r_wrist", "r_shoulder")[0] * SWING)),        // near arm: 0 down .. 2 forward
    hand: Math.round(rel(i, "l_wrist", "l_shoulder")[0] * SWING),           // far arm: > 0 back, < 0 forward
  }))

  for (const p of PLAN) p.legL = Math.max(p.legL, p.legR - 1)

  // The long hair swings like a pendulum hung from the top of her head: each row moves sideways in
  // proportion to how far it is below the crown, so the top barely moves and the hem a pixel each
  // way, once a stride, a frame behind her step. Drawn first, so her head and body cover it.
  const SWAY = [0, 1, 1, 1, 0, -1, -1, -1]
  const swingHair = (c) => {
    const bob = PLAN[c.frame].bob, crown = -bob, len = 20
    c.stamp("hair_long", 16, 4 - bob)
    c.warp((x, y) => [Math.round((SWAY[c.frame] * 1.4 * Math.max(0, y - crown)) / len), 0])
  }

  anim("girl_walk", { w: 30, h: 28, frames: 8, fps: 6, outline: "k", pivot: [15, 26] },
    layer("hair", swingHair),
    layer("parts", { sort: "z" }, (c) => {
      const p = PLAN[c.frame]
      c.stamp("girl_top", 15, 26 - p.bob, { z: 2 })
      c.stamp(p.upR ? "leg_r_up" : "leg_r", p.legR, p.legRy, { at: "girl_top.leg_r", z: p.rFront ? 1 : 0 })
      c.stamp(p.upL ? "leg_l_up" : "leg_l", p.legL, p.legLy, { at: "girl_top.leg_l", z: p.rFront ? 0 : 1 })
      c.stamp(`arm_r_${Math.max(0, p.arm)}`, 0, 0, { at: "girl_top.arm_r", z: 3 })
      c.stamp(p.hand > 0 ? "arm_l_back" : p.hand < 0 ? "arm_l_fwd" : "arm_l_0", 0, 0, { at: "girl_top.arm_l", z: 1.5 })
    }),
    layer("guide", { ref: 0.6 }, (c) => c.pose(SMALL.frames[c.frame], { sides: true, joint: false })))
  anim("girl_walk_se", { base: "girl_walk", flip: "x" })
}
