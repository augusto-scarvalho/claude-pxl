// Decals (phase 6 of the 3D DSL): hand-drawn pixel art pinned to a field's surface, crisp in any camera.
// The mushroom house with a door, a window lit from inside and a sign drawn by hand (pinned: a texel to a
// pixel, square to the picture, clipped by the house's own outline and depth). A snow spirit whose face
// is drawn three ways, front, three quarters and profile (as the traveler's heads are), the view picked
// by how far its face turns from the eye and mirrored for the other side, blinking, turning on a
// turntable in the four cameras. A rune glowing on the crystal (unlit). An emblem wrapped round a barrel
// (its texels laid on the curve, foreshortening as it turns).
include("kit.px.js", { palette: true })

// the house's door, window and sign, drawn by hand
sprite("door", { pivot: "center" }, `
  .dddd.
  deXXed
  deXXed
  deXXed
  deXXfd
  deXXed
  deXXed
  dddddd`)
sprite("window", { pivot: "center" }, `
  .ddd.
  dFdFd
  ddddd
  dFdFd
  .ddd.`)
sprite("sign", { pivot: "center" }, `
  eeeeeeeee
  eXdXdXdXe
  eXXdXdXXe
  eeeeeeeee`)
const HOUSE = world3d({ parts: { house: { make: "house", params: { door: "door", window: "window", sign: "sign" } } } })
const view4 = (name, W, w, h, ppm, cam) => {
  for (const v of ["side", "top", "iso"]) anim(`${name}_${v}`, { w, h, ...CLOCK }, draw3d(W, { view: { kind: v, origin: [w / 2, v === "top" ? h / 2 : h - 4] }, ppm, mats: MATS, light: LIGHT }))
  const C = hd2d(w, h, cam), G = ground(C.Z), at = [0, C.Z - 1.1 / Math.tan(-PITCH * RAD), 0]
  scene(`${name}_camera`, { w, h, bg: "k", ...CLOCK, check: { every: 24 } }, (c) => c.mesh(C.view, G.faces, GMATS, { light: LIGHT }),
    (c) => c.draw3d(W, { view: C.view, at, mats: MATS, light: LIGHT }))
}
view4("house", HOUSE, 96, 96, 28, 15)

// A snow spirit: three snowballs, a red scarf, twig arms; its face drawn by hand in three views, the eyes
// shut for two frames in twelve. On a turntable, once round over the loop.
const face = (name, rows) => anim(name, { w: rows[0].length, h: rows.length, pivot: "center", ...CLOCK }, (c) => c.grid(0, 0, rows.map((r, i) => (i < 2 && c.frame % 12 >= 10 ? (i === 0 ? r.replace(/d/g, ".") : r) : r)).join("\n")))
face("face_front", ["dd...dd", "dd...dd", ".......", "...OO..", "d.....d", ".ddddd."])
face("face_three", ["..dd..dd", "..dd..dd", "........", "......OO", "...d...d", "....ddd."])
face("face_side", ["....dd..", "....dd..", "........", "......OO", ".....d..", "....dd.."])
const spirit = sdf.union(sdf.sphere(0.7).at(0, 0, 0.65), sdf.sphere(0.5).at(0, 0, 1.65), sdf.sphere(0.38).at(0, 0, 2.38), { smooth: 0.12 }).mat("stem")
  .union(sdf.torus(0.36, 0.08).at(0, 0, 2.05).mat("cap"), sdf.capsule([0.45, 0, 1.75], [1.05, 0.1, 2.15], 0.04, 0.02).mat("bark"), sdf.capsule([-0.45, 0, 1.75], [-1.0, -0.05, 2.05], 0.04, 0.02).mat("bark"))
  .rotate((c) => 360 * c.phase)
const FACE = { on: spirit, point: [0, -0.38, 2.5], views: { three: "face_three", profile: "face_side" } }
const spiritView = (name, w, h, view, ppm, at) => anim(name, { w, h, ...CLOCK }, surface(spirit, { view, ppm, at, mats: MATS, light: LIGHT }), decal("face_front", { ...FACE, view, ppm, at, light: LIGHT }))
for (const v of ["side", "top", "iso"]) spiritView(`spirit_${v}`, 80, 96, v, 24, [40, v === "top" ? 50 : 90])
{
  const C = hd2d(96, 112, 22), G = ground(C.Z), at = [0, C.Z - 1.3 / Math.tan(-PITCH * RAD), 0]
  scene("spirit_camera", { w: 96, h: 112, bg: "k", ...CLOCK, check: { every: 24 } }, (c) => c.mesh(C.view, G.faces, GMATS, { light: LIGHT }),
    (c) => c.surface(spirit, { view: C.view, at, mats: MATS, light: LIGHT }), (c) => c.decal("face_front", { ...FACE, view: C.view, at, light: LIGHT }))
}

// A rune glowing on the crystal (unlit, marked as giving light), turning with it.
sprite("rune", { pivot: "center" }, `
  ..F..
  .F.F.
  ..f..
  .FfF.
  ..f..
  .F.F.
  F...F`)
const CR = make3d.crystal({ rune: "rune" }), CRF = CR.field.rotate((c) => 360 * c.phase), RUNE = { on: CRF, point: CR.decals.rune.point, lit: false }
for (const v of ["side", "iso"]) anim(`rune_${v}`, { w: 64, h: 72, ...CLOCK }, surface(CRF, { view: v, ppm: 32, at: [32, 66], mats: MATS, light: LIGHT }), decal("rune", { ...RUNE, view: v, ppm: 32, at: [32, 66] }))

// An emblem wrapped round a barrel: a gold sun, its texels laid on the staves' curve, 0.6 m across.
sprite("sun", { pivot: "center" }, `
  .....O.....
  ..O..O..O..
  ...O.F.O...
  ....FfF....
  OOFFfffFFOO
  ....FfF....
  ...O.F.O...
  ..O..O..O..
  .....O.....`)
const barrel = sdf.cylinder(0.45, 1.1).union(sdf.torus(0.46, 0.035).at(0, 0, 0.15), sdf.torus(0.46, 0.035).at(0, 0, 0.95), { smooth: 0.02 }).mat("door").rotate((c) => 360 * c.phase)
for (const v of ["side", "iso"]) anim(`barrel_${v}`, { w: 72, h: 80, ...CLOCK }, surface(barrel, { view: v, ppm: 40, at: [36, 72], mats: MATS, light: LIGHT }),
  decal("sun", { on: barrel, point: [0, -0.45, 0.55], mode: "wrap", size: 0.6, view: v, ppm: 40, at: [36, 72], light: LIGHT }))
