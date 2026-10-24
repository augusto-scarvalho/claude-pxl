// HD-2D: a little plaza in a pine wood, seen as Octopath Traveler and Triangle Strategy see theirs,
// from high up through a long lens (45 degrees down, 30 across), modelled in meters as boxes whose
// faces are tiled with pixel-art textures, 16 texels to the meter; the hero from topdown_hero, the
// pines, bushes and lamps stand in it as flat sprites turned to the camera. One mesh() draws them all
// with a depth per pixel, so the low wall hides the legs of the hero walking behind it and not his
// head, the crate half hides another, and each stands on a contact shadow. Light in the world: a
// late sun with its shadows (the wall's, the people's, the pines'), a cool sky, two lamps (LIGHT).
// `plaza` is the art at its own size, the one checked (check builds it unlit); `plaza_hd` the same
// four times as big (a size of it), with what the camera does to it: post().
include("../topdown_hero/hero.px.js")
include("kit.px.js", { palette: true })   // the palette, the textures, the pines, bushes and lamps

const MATS = { cobble: { tex: "_cobble" }, wall: { tex: "_wall" }, grass: { tex: "_grass" }, wood: { tex: "_planks" } }

// The camera: 24 px to the meter where it looks (the hero, a chibi 24 px tall, stands 1 m), the
// middle of the picture on the ground Z m ahead.
const W = 480, H = 270, CAM = perspective({ w: W, h: H, pitch: -45, fov: 30, ppm: 24 }), Z = CAM.z, DIST = CAM.dist
const M = model(), block = (...a) => hd2dBlock(M, ...a)
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
// `plaza_hd`: the same at four times the size (1920x1080), each pixel of art 4x4, and what the camera
// does to it (post(), in the art's pixels, at that size only): the band of depth where the people
// stand sharp and the rest blurred, from a camera this high up the look of a model (DIST is the depth
// at the picture's middle, where post() focuses); the far grass hazed; a bloom on what is bright;
// darker corners.
scene("plaza", { w: W, h: H, bg: "q", ...CLOCK, sizes: { plaza_hd: 4 } }, (c) => c.mesh(CAM, M.faces, MATS, { sprites: people(c.frame), ...LIGHT }),
  post({ blur: 8, sharp: 1, soft: 4, fog: { color: "#c8d4dc", from: DIST + 4, to: DIST + 20, max: 0.5 }, bloom: { strength: 0.9, r: 10 }, vignette: 0.35 }))
