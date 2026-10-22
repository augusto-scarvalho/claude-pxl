// HD-2D, first step: a little plaza seen as Octopath Traveler and Triangle Strategy see theirs, from
// high up through a long lens (45 degrees down, 30 across), modelled in meters as boxes whose faces
// are tiled with pixel-art textures, 16 texels to the meter, and the hero from topdown_hero standing
// in it as flat sprites turned to the camera. One mesh() draws them all with a depth per pixel, so the
// low wall hides the legs of the hero walking behind it and not his head, the crate half hides
// another, and each stands on a contact shadow. The sun is mesh()'s own, from the upper left behind
// us: tops as the textures are drawn, faces toward us a step darker, faces to the right two.
include("../topdown_hero/hero.px.js")

pal({ k: "#1a1620" })
shades("1234", "#8d8070")   // cobbles: the gaps, the stones, their lit edges
shades("5678", "#857467")   // the wall's stone and its mortar
shades("qwer", "#5e8a3e")   // grass
shades("asdf", "#8a5a36")   // the crate's planks

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
// Grass: the base tone, blades two pixels tall lighter above darker, scattered by a hash.
sprite("_grass", { w: 16, h: 16 }, (c) => {
  for (let Y = 0; Y < 16; Y++) for (let X = 0; X < 16; X++) {
    const h = hash(X, Y) % 9
    c.px(X, Y, h === 0 ? "r" : h === 1 ? "q" : h < 4 ? "e" : "w")
  }
})
// Planks running across, a dark seam under each, nail heads at the ends.
sprite("_planks", { w: 16, h: 16 }, (c) => {
  for (let Y = 0; Y < 16; Y++) for (let X = 0; X < 16; X++)
    c.px(X, Y, Y % 4 === 3 ? "a" : (X === 1 || X === 14) && Y % 4 === 1 ? "a" : Y % 4 === 0 ? "f" : "d")
})
const MATS = { cobble: { tex: "_cobble" }, wall: { tex: "_wall" }, grass: { tex: "_grass" }, wood: { tex: "_planks" } }

// The camera: 24 px to the meter where it looks (the hero, a chibi 24 px tall, stands 1 m), the middle of the
// picture on the ground Z m ahead.
const W = 480, H = 270, PITCH = -45, FOV = 30, RAD = Math.PI / 180
const FOCAL = W / 2 / Math.tan((FOV / 2) * RAD), DIST = FOCAL / 24, Z = DIST * Math.cos(-PITCH * RAD)
const VIEW = { w: W, fov: FOV, pitch: PITCH, eye: DIST * Math.sin(-PITCH * RAD), horizon: H / 2 + FOCAL * Math.tan(PITCH * RAD) }

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
// this high up a wall hides only what is near it), 2 m right
// and back, a step a frame; the others stand: in front of the wall, half behind the crate, and on
// the grass below the step.
const walker = (f) => {
  const back = f >= 8, x = -2.5 + 0.25 * (back ? 16 - f : f)
  return { name: "walk_side", at: [x, Z + 2.25, UP], frame: f % 4, ...(back ? { flip: "x" } : {}) }
}
scene("plaza", { w: W, h: H, bg: "q", frames: 16, fps: 1000 / 210 }, (c) => c.mesh(VIEW, M.faces, MATS, {
  sprites: [
    walker(c.frame),
    { name: "idle_down", at: [-1.2, Z, UP], frame: 0 },
    { name: "idle_down", at: [2.8, Z - 0.4, UP], frame: 0 },
    { name: "idle_side", at: [3, Z - 5.2], frame: 0, flip: "x" },
  ],
}))
