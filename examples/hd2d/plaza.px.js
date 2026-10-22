// HD-2D: a little plaza in a pine wood, seen as Octopath Traveler and Triangle Strategy see theirs,
// from high up through a long lens (45 degrees down, 30 across), modelled in meters as boxes whose
// faces are tiled with pixel-art textures, 16 texels to the meter; the hero from topdown_hero, the
// pines, bushes and lamps stand in it as flat sprites turned to the camera. One mesh() draws them all
// with a depth per pixel, so the low wall hides the legs of the hero walking behind it and not his
// head, the crate half hides another, and each stands on a contact shadow. Light in the world: a
// late sun with its shadows (the wall's, the people's, the pines'), a cool sky, two lamps (LIGHT).
// `plaza` is the art at its own size, the one checked (check builds it unlit); `plaza_hd` the same
// four times as big, with what the camera does to it: post().
include("../topdown_hero/hero.px.js")

pal({ k: "#1a1620" })
shades("1234", "#8d8070")   // cobbles: the gaps, the stones, their lit edges
shades("5678", "#857467")   // the wall's stone and its mortar
shades("qwer", "#5e8a3e")   // grass
shades("asdf", "#8a5a36")   // the crate's planks, the trunks
shades("zxcv", "#2f6a45")   // pine needles
shades("ghjl", "#4f8a3a")   // bushes
pal({ y: "#fff3c4", Y: "#ffd27a" })   // the lamps' glass: brighter than anything lit, for the bloom

// Textures, 16x16, tiling. Cobbles: rows of stones 3 px tall over a 1 px gap, each row's stones of
// its own widths (16 in all, so it tiles), their corners softened, lit on their upper left edges, a
// stone in five a shade off.
const COURSES = [[5, 5, 6], [6, 5, 5], [4, 6, 6], [5, 6, 5]]
sprite("_cobble", { w: 16, h: 16 }, (c) => {
  COURSES.forEach((ws, r) => {
    let x = (r * 3) % 16
    ws.forEach((w, s) => {
      const tone = hash(r, s) % 5 === 0 ? "2" : "3"
      for (let i = 0; i < w; i++) for (let j = 0; j < 4; j++) {
        const X = (x + i) % 16, Y = r * 4 + j
        // the gaps, the stone's lower right corner rounded into them, its upper left edges lit
        const gap = j === 3 || i === w - 1 || (i === w - 2 && j === 2)
        c.px(X, Y, gap ? "1" : i === 0 && j === 0 ? tone : j === 0 || i === 0 ? "4" : tone)
      }
      x += w
    })
  })
})
// Ashlar: blocks 7x3 over 1 px of mortar, every other course moved half a block.
sprite("_wall", { w: 16, h: 16 }, (c) => {
  for (let Y = 0; Y < 16; Y++) for (let X = 0; X < 16; X++) {
    const r = Y >> 2, x = (X + (r % 2) * 4) % 8, j = Y % 4
    c.px(X, Y, j === 3 || x === 7 ? "6" : j === 0 ? "8" : j === 2 ? "5" : hash(r, (X + (r % 2) * 4) >> 3) % 4 ? "7" : "6")
  }
})
// Grass: the base tone; blades, a lit pixel over a dark one, scattered (seeded, so no row of the
// tile comes out darker than another: seen from this high each row of the screen reads one row of it);
// a rare bright tip.
sprite("_grass", { w: 16, h: 16 }, (c) => {
  const r = rng(11)
  for (let Y = 0; Y < 16; Y++) for (let X = 0; X < 16; X++) c.px(X, Y, "w")
  for (let k = 0; k < 44; k++) {
    const X = Math.floor(r() * 16), Y = Math.floor(r() * 16)
    c.px(X, Y, r() < 0.2 ? "r" : "e"); c.px(X, (Y + 1) % 16, "q")
  }
})
// A pine, 2.5 m: six tiers of needles, each wider than the one above, lit on the left, dark under
// the tier above and on the right, their lower edges ragged; a trunk under them.
sprite("_pine", { w: 29, h: 60, pivot: "bottom" }, (c) => {
  const r = rng(3)
  for (let t = 0; t < 6; t++) {
    const top = t * 8, bot = top + 12, half = 4 + 2 * t
    for (let y = top; y < bot; y++) {
      const hw = Math.round(((y - top + 1) / (bot - top)) * half) + (y >= bot - 2 && r() < 0.5 ? 1 : 0)
      for (let x = 14 - hw; x <= 14 + hw; x++) {
        if (y === bot - 1 && r() < 0.35) continue
        const side = (x - 14) / Math.max(1, hw)
        c.px(x, y, y < top + 2 && t ? "z" : side < -0.4 ? "c" : side < 0.3 ? "x" : "z")
      }
    }
  }
  for (let y = 52; y < 60; y++) for (let x = 13; x <= 15; x++) c.px(x, y, x === 13 ? "d" : "s")
}, bump("hybrid"))
sprite("_bush", { w: 13, h: 8, pivot: "bottom", outline: "k" }, ellipse(6, 4, 5, 3, "h"), ellipse(5, 3, 3, 2, "j"), px(4, 2, "l"), hline(2, 7, 9, "g"), bump("hybrid"))
// A lamp: a pole of dark iron, a lantern of glass on top under a cap.
sprite("_lamp", { w: 7, h: 30, pivot: "bottom" }, rect(3, 8, 1, 22, "k"), rect(1, 28, 5, 2, "k"),
  rect(1, 1, 5, 1, "k"), rect(1, 2, 5, 5, "Y"), rect(2, 3, 3, 3, "y"), rect(0, 7, 7, 1, "k"))
// Planks running across, a dark seam under each, nail heads at the ends.
sprite("_planks", { w: 16, h: 16 }, (c) => {
  for (let Y = 0; Y < 16; Y++) for (let X = 0; X < 16; X++)
    c.px(X, Y, Y % 4 === 3 ? "a" : (X === 1 || X === 14) && Y % 4 === 1 ? "a" : Y % 4 === 0 ? "f" : "d")
})
const MATS = { cobble: { tex: "_cobble" }, wall: { tex: "_wall" }, grass: { tex: "_grass" }, wood: { tex: "_planks" } }

// The camera: 24 px to the meter where it looks (the hero, a chibi 24 px tall, stands 1 m), the
// middle of the picture on the ground Z m ahead; k times the px for a picture k times as big.
const W = 480, H = 270, PITCH = -45, FOV = 30, RAD = Math.PI / 180
const FOCAL = W / 2 / Math.tan((FOV / 2) * RAD), DIST = FOCAL / 24, Z = DIST * Math.cos(-PITCH * RAD)
const view = (k) => ({ w: W * k, fov: FOV, pitch: PITCH, eye: DIST * Math.sin(-PITCH * RAD), horizon: (H / 2 + FOCAL * Math.tan(PITCH * RAD)) * k })

// A block from (x0, z0) to (x1, z1), u0 to u1 m up: its top of one material, its sides of another.
const M = model()
const block = (top, side, x0, z0, x1, z1, u0, u1) => {
  M.face(top, [x0, z0, u1], [x1, z0, u1], [x1, z1, u1], [x0, z1, u1])
  for (const [a, b] of [[[x0, z0], [x1, z0]], [[x0, z1], [x1, z1]], [[x0, z0], [x0, z1]], [[x1, z0], [x1, z1]]])
    M.face(side, [...a, u0], [...b, u0], [...b, u1], [...a, u1])
}
M.face("grass", [-30, Z - 20, 0], [30, Z - 20, 0], [30, Z + 30, 0], [-30, Z + 30, 0])
const UP = 0.3                                                  // the plaza: a paved step up from the grass
block("cobble", "wall", -6, Z - 4, 6, Z + 5, 0, UP)
block("wall", "wall", -4, Z + 1.5, 4, Z + 2, UP, UP + 0.7)      // a low wall across it, 0.7 m
block("cobble", "wall", -4.6, Z + 1.4, -4, Z + 2.1, UP, UP + 1.1)  // its pillars
block("cobble", "wall", 4, Z + 1.4, 4.6, Z + 2.1, UP, UP + 1.1)
block("wood", "wood", 2.4, Z - 1.6, 3.2, Z - 0.8, UP, UP + 0.6) // a crate

// The scene's clock: 16 frames of 210 ms, the walk's. One hero walks close behind the wall (from
// this high up a wall hides only what is near it), 2 m right and back, a step a frame; the others
// stand: in front of the wall, half behind the crate, and on the grass below the step.
const walker = (f) => {
  const back = f >= 8, x = -2.5 + 0.25 * (back ? 16 - f : f)
  return { name: "walk_side", at: [x, Z + 2.25, UP], frame: f % 4, ...(back ? { flip: "x" } : {}) }
}
const people = (f) => [
  ...around,
  walker(f),
  { name: "idle_down", at: [-1.2, Z, UP], frame: 0 },
  { name: "idle_down", at: [2.8, Z - 0.4, UP], frame: 0 },
  { name: "idle_side", at: [3, Z - 5.2], frame: 0, flip: "x" },
]
// The wood round the plaza, the bushes along its edge, a lamp at each front corner: placed once.
const R = rng(5), around = []
for (let k = 0; k < 90; k++) {
  const x = -14 + R() * 28, z = Z - 10 + R() * 26
  if (Math.abs(x) < 8 && z > Z - 6 && z < Z + 7) continue   // not on the plaza or its edge
  around.push({ name: "_pine", at: [x, z] })
}
for (let x = -5.5; x <= 5.5; x += 1.6) around.push({ name: "_bush", at: [x + R() * 0.4, Z - 4.4] })
around.push({ name: "_lamp", at: [-5.6, Z - 3.6, UP] }, { name: "_lamp", at: [5.6, Z - 3.6, UP] })
const CLOCK = { frames: 16, fps: 1000 / 210 }
// Late afternoon: a warm sun low on the left and a little behind the plaza, so the shadows of the
// wall, the pines and the people fall toward us; a cool sky in the shade; the lamps lit, their
// glass giving light, not taking it. The pines and bushes take it through their normal maps.
const LIGHT = {
  light: [-0.75, 0.45, 0.5], sun: { color: "#ffd49a", strength: 1.35 }, sky: { color: "#8aa2d0", strength: 0.42 }, emit: "yY",
  lamps: [-5.6, 5.6].map((x) => ({ at: [x, Z - 3.6, UP + 1.15], color: "#ffbe6a", r: 3.5, strength: 1.6 })),
}
scene("plaza", { w: W, h: H, bg: "q", ...CLOCK }, (c) => c.mesh(view(1), M.faces, MATS, { sprites: people(c.frame), ...LIGHT }))

// The same at four times the size (1920x1080), each pixel of art 4x4, and what the camera does to
// it: the band of depth where the people stand sharp and the rest blurred, from a camera this high
// up the look of a model (DIST is the depth at the picture's middle, where post() focuses); the far
// grass hazed; a bloom on what is bright; darker corners. Checked at its own size, above.
scene("plaza_hd", { w: W * 4, h: H * 4, bg: "q", ...CLOCK, check: false },
  (c) => c.mesh(view(4), M.faces, MATS, { sprites: people(c.frame), pixel: 4, ...LIGHT }),
  post({ blur: 32, sharp: 1, soft: 4, fog: { color: "#c8d4dc", from: DIST + 4, to: DIST + 20, max: 0.5 }, bloom: { strength: 0.9, r: 40 }, vignette: 0.35 }))
