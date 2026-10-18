// Halloween night in the cemetery: a full moon over the hills, a mausoleum with the party spilling
// out of its door, a dead tree hung with string lights, jack-o'-lanterns, a witch's cauldron, a
// skeleton DJ on a coffin, and monsters dancing between the graves. Side view, 320x180.
use("palette.hex")
include("props.px.js", { palette: true })
include("monsters.px.js")
ramps("kTtSs", "0EGgl", "qDd", "xWw", "9OoaA", "Ppe", "2Uu", "3Bb", "4Zz", "5Rr", "Ff", "6Ii", "Y1hX", "LC")

const W = 320, H = 180, GROUND = 124

// who dances where: [anim, x, y (feet), shadow half-width]
const DANCERS = [["skeleton", 150, 168, 6], ["vampire", 198, 166, 9], ["mummy", 236, 160, 7], ["zombie", 126, 176, 7], ["ghost", 266, 146, 6]]
// A light near the ground: [x, y] of the ground under it and its height. What stands near it is laid
// on the ground away from it (cast): a pixel h above the base lands h * (offset / height) away,
// at most its own height (a light lower than the thing would stretch it without end).
const DISCO = [214, 150, 50], FIRE = [104, 153, 14]
const castFrom = ([lx, ly, lh], n, x, y, o = {}) => {
  let kx = (x - lx) / lh, ky = (y - ly) / lh
  const len = Math.hypot(kx, ky)
  if (len > 1) { kx /= len; ky /= len }
  return stamp(n, x, y, { ...o, cast: [kx, ky], silhouette: "k" })
}
const JACKS = [["jack", 12, GROUND + 1], ["jack_small", 76, GROUND - 2], ["jack_small", 126, GROUND - 7], ["jack", 58, 176],
  ["jack", 288, 170], ["jack_small", 176, 176], ["jack", 34, 178]]

// ---------------------------------------------------------------- sky
const STARS = [[14, 10], [38, 30], [62, 8], [90, 22], [118, 6], [140, 34], [168, 14], [196, 28], [214, 8], [300, 18], [306, 62], [180, 50], [20, 56], [74, 46], [128, 60]]
const sky = [
  grad(0, 0, W, GROUND, "nNvVH"),
  ...STARS.map(([x, y], i) => px(x, y, i % 3 ? "M" : "m")),
  // the moon: crater patches toward the shadowed lower left, a soft halo
  grad(220, 8, 64, 64, "H.", "r"),
  circ(252, 40, 19, "m"),
  clip([252, 40, 19], circ(244, 47, 6, "M"), circ(258, 30, 4, "M"), circ(262, 50, 3, "M"), px(243, 45, "Q"), px(246, 48, "Q"), px(257, 29, "Q")),
  // a thin cloud across the moon
  poly([200, 52, 230, 47, 262, 50, 300, 46, 304, 49, 268, 54, 236, 52, 204, 55], "v"),
]

// far hills with a crooked house on the crest, two windows lit
const hills = [
  poly([0, 106, 40, 96, 80, 92, 120, 98, 160, 104, 200, 100, 240, 94, 280, 98, 320, 92, 320, GROUND, 0, GROUND], "j"),
  // sits on the crest (y 95 there); the roof sags and the chimney leans
  rect(96, 82, 18, 16, "J"), poly([93, 83, 104, 71, 117, 82], "J"), poly([108, 75, 111, 72, 113, 76, 110, 78], "J"),
  rect(99, 85, 2, 2, "a"), px(107, 88, "a"), px(107, 89, "o"),
  poly([0, 116, 60, 108, 130, 112, 200, 110, 260, 114, 320, 108, 320, GROUND, 0, GROUND], "J"),
]

scene("party", { w: W, h: H, bg: "n", world: { light: [0.6, -1] } },
  layer("sky", { unlit: true }, ...sky),
  layer("hills", { unlit: true }, ...hills),
  layer("ground",
    rect(0, GROUND, W, H - GROUND, "G"),
    grad(0, GROUND, W, 30, "EG"),
    scatter("_tuft*", 0, GROUND + 6, W, H - GROUND - 6, 140, { on: "G", even: true, rflip: "x", seed: 3 })),
  layer("back", fence(84, 290, GROUND - 12),
    stamp("crypt", 44, GROUND + 4),
    ...[[96, 0], [112, 1], [126, 2], [196, 3], [214, 4], [232, 5], [258, 6]].map(([x, s]) => stamp("tombs", x, GROUND + 4, { seed: s }))),
  layer("tree", stamp("tree_dead", 296, GROUND + 30)),
  layer("lights",
    wire(44, 52, 252, 70, 26, "k", { hang: "bulbs", every: 8 }),
    wire(252, 70, 320, 84, 6, "k", { hang: "bulbs", every: 8, seed: 2 }),
    stamp("bats", 0, 0), stamp("disco", 214, 91)),
  // grounding: a soft shadow under everyone standing on the grass
  layer("shadows", { shade: true }, ...DANCERS.map(([, x, y, w]) => ellipse(x, y, w, 2, "k")), ellipse(160, 142, 22, 2, "k")),
  // cast shadows from the strong lights near the ground: the mirror ball over the floor throws the
  // dancers' and the booth's away from it, the cauldron's fire throws the witch's long to the left
  layer("cast", { shade: 2 },
    ...DANCERS.filter(([n]) => n !== "ghost").map(([n, x, y]) => castFrom(DISCO, n, x, y)),
    castFrom(DISCO, "dj", 160, 142), castFrom(DISCO, "speaker", 130, 142), castFrom(DISCO, "speaker", 190, 142, { flip: "x" }),
    castFrom(FIRE, "witch_body", 96, 156),
    // the tree's, from the moon (high, behind, to the right): it comes toward us and a little left,
    // most of the crown's falling below the frame
    stamp("tree_dead", 296, GROUND + 30, { cast: [-0.12, 0.3], silhouette: "k" })),
  // low mist lying on the grass, behind the dancers' legs: banks of puffs drifting right
  layer("mist", { opacity: 0.18 }, (c) => {
    const r = c.rng(9)
    for (const [x0, y] of [[10, 142], [150, 146], [250, 141], [70, 166], [220, 170]])
      for (let i = 0; i < 5; i++) {
        const dx = Math.round((r() - 0.5) * 50), dy = Math.round((r() - 0.5) * 6), rx = 8 + Math.round(r() * 12)
        const x = (x0 + dx + Math.round(c.t / 2000 * 40)) % (W + 140) - 70
        c.ellipse(x, y + dy, rx, 2 + Math.round(r() * 2), "I")
      }
  }),
  layer("party", { sort: "y" },
    stamp("werewolf", 15, 76),
    stamp("tomb_big", 12, 188), stamp("cross_big", 306, 186), stamp("tomb_big_2", 248, 192),
    stamp("speaker", 130, 142), stamp("speaker", 190, 142, { flip: "x" }), stamp("dj", 160, 142),
    stamp("notes", 118, 112, { rdelay: true }), stamp("notes", 178, 112),
    stamp("witch", 96, 156),
    ...DANCERS.map(([n, x, y]) => stamp(n, x, y)),
    ...JACKS.map(([n, x, y], i) => stamp(n, x, y, { rdelay: true, seed: i }))),
  lighting({ cell: 2, smooth: true, ambient: 0.54, ambientColor: "#9a9ad8", emit: "aAmMQyopue8eiI6" }),
  glow("aA", { r: 5, strength: 0.4 }), glow("ou", { r: 3, strength: 0.3, where: [0, 60, 320, 40] }),
  glow("i", { r: 4, strength: 0.25 }), glow("pe", { r: 5, strength: 0.35, where: [70, 110, 60, 50] }),
  // the mirror ball's spots sweep over the floor and whoever is dancing there
  (c) => {
    for (let i = 0; i < 14; i++) {
      const a = (i / 14 + c.t / 2000) * Math.PI * 2, r = 30 + (i * 37) % 60
      const x = Math.round(214 + Math.cos(a) * r * 1.6), y = Math.round(160 + Math.sin(a) * r * 0.28)
      if (y > GROUND + 8) c.px(x, y, i % 3 ? "i" : "u")
    }
  })
