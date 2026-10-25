// Fields in 3D drawn as pixel art: a tree, a rock, a mushroom house and a crystal built as distance
// fields (sdf.*: primitives in meters joined, moved, bent and painted), each drawn by surface() from
// the side (3/4), from the top and in isometric 2:1, and all of them standing in a mesh() diorama seen
// through an HD-2D camera, at their depth, their shadows on the ground. Parameters read the clock: the
// tree sways in the wind, the crystal turns, the rock and the house turn on a turntable. The tree is
// the reference the 3D DSL is measured by: its spec is at tree() in kit.px.js.
include("kit.px.js", { palette: true })   // the palette, the camera, the ground, tree(), rock(), house(), crystal()

// A field in the four views: from the side, the top and in iso as sprites (anims on the clock, sized to
// it), and `<name>_camera`, a scene of it standing on the grass through the HD-2D camera, its shadow on
// the ground. `turn`: on a turntable, once round over the loop.
const fourViews = (name, field, { ppm = 16, turn = false, stage = [128, 112] } = {}) => {
  const f = turn ? field.rotate((c) => 360 * c.phase) : field
  for (const v of ["side", "top", "iso"]) {
    const S = sdf.size(f, { view: v, ppm, frames: CLOCK.frames })
    anim(`${name}_${v}`, { w: S.w, h: S.h, pivot: S.pivot, ...CLOCK }, surface(f, { view: v, ppm, at: S.pivot, light: "view" }))
  }
  // (its middle where the camera looks: its foot nearer by what its half height rises on the picture)
  const C = hd2d(...stage), G = ground(C.z), [lo, hi] = field.bounds(), at = C.aim((lo[2] + hi[2]) / 2)
  scene(`${name}_camera`, { w: stage[0], h: stage[1], bg: "k", ...CLOCK, check: { every: 24 } },
    (c) => c.mesh(C, G.faces, GMATS), (c) => c.surface(f, { view: C, at }))
}
fourViews("tree", tree(), { stage: [144, 176] })
fourViews("rock", rock(), { ppm: 32, turn: true, stage: [96, 72] })
fourViews("house", house(), { turn: true, stage: [112, 112] })
fourViews("crystal", crystal(), { ppm: 32, stage: [80, 80] })

// The four standing in a diorama: mesh() draws the ground, a flagstone path and a low wall seen
// through an HD-2D camera (40 degrees down, a long lens, 24 px to the meter where it looks); then each
// field is drawn through the same camera where it stands, a ray to a pixel, behind what mesh() drew
// nearer the eye (the wall hides the rock's foot), its shadow marched to the light and laid on the
// ground, the wall and the others.
const W = 320, H = 180, VIEW = hd2d(W, H), Z = VIEW.z, G = ground(Z)
for (let i = 0; i < 6; i++) G.box("path", [0.55 + (i % 2) * 0.15, Z - 3.6 + i * 0.62, 0], [1.2 + (i % 2) * 0.15, Z - 3.1 + i * 0.62, 0.04])
G.box("wall", [1.5, Z - 2.05, 0], [4.3, Z - 1.75, 0.45])
const THINGS = [[tree(), [-2.7, Z - 0.6, 0]], [house(), [0.9, Z + 0.4, 0]], [rock(), [2.8, Z - 1.4, 0]], [crystal(), [-0.9, Z - 2.3, 0]]]
// `diorama_hd` three times as big (960x540), each pixel of art 3 x 3 px: the faces in blocks, a ray to each
// block; and what the camera does to it (post()): the band where the things stand sharp, the rest blurred.
scene("diorama", { w: W, h: H, bg: "k", ...CLOCK, check: { every: 24 }, sizes: { diorama_hd: 3 } },
  (c) => c.mesh(VIEW, G.faces, GMATS),
  (c) => { for (const [f, at] of THINGS) c.surface(f, { view: VIEW, at }) },
  post({ blur: 4, sharp: 2.5, soft: 4, bloom: { strength: 0.5 } }))

// The tree as a sprite: drawn from the camera's pitch at its px to the meter, standing among mesh()'s
// faces as the pines do (upright, turned to the camera, a depth per row), its normals lit by the sun,
// its shadow the sun's (a billboard's); beside it the same tree drawn through the camera by surface().
const CARD = sdf.size(tree(), { view: { kind: "side", pitch: -PITCH }, ppm: PPM, frames: CLOCK.frames })
anim("tree_card", { w: CARD.w, h: CARD.h, pivot: CARD.pivot, ...CLOCK }, surface(tree(), { view: { kind: "side", pitch: -PITCH }, ppm: PPM, at: CARD.pivot, light: "view" }))
// (the sun lights textured faces: grass laid a texel to a pixel, a tone darker in ragged blobs)
sprite("_grass", { w: 32, h: 32 }, (c) => { for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) c.px(x, y, fbm(x / 6, y / 4) > 0.55 ? "Q" : "s") })
const SUN = { sun: { color: "#ffe2b0", strength: 1.25 }, sky: { color: "#8aa2d0", strength: 0.45 } }
scene("two_trees", { w: W, h: H, bg: "k", ...CLOCK, check: { every: 24 } },
  (c) => c.mesh(VIEW, G.faces, { ...GMATS, grass: { tex: "_grass", texel: "screen" } }, { ...SUN, sprites: [{ name: "tree_card", at: [-2.2, Z - 0.6] }] }),
  (c) => c.surface(tree(), { view: VIEW, at: [1.6, Z - 0.6, 0] }))
