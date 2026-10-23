// Details on a form (phase 6 of the 3D DSL): splats scattered on a field's surface as many small
// things, each a pixel-art brush at a sprite's size (sdf.scatter, drawn by splats()): the reference
// tree's canopy as smooth lobes beside the same canopy with leaf clusters on it, from the side, the top,
// in iso and through the HD-2D camera, swaying (each cluster carried by the tree's bend and fluttering
// out of step); a rock bare beside the same rock with moss tufts where it faces up. The builders say what
// to scatter (make3d.tree({ leaves }), make3d.rock({ moss })): the details are theirs.
include("kit.px.js", { palette: true })


const PLAIN = make3d.tree(), LEAFY = make3d.tree({ leaves: 28 }), LEAVES = sdf.scatter(LEAFY.field, LEAFY.details.leaves)
const PW = 96, PH = 104, CAM = hd2d(PW, PH, 13), GR = ground(CAM.Z), AT = [0, CAM.Z - 2.2 / Math.tan(-PITCH * RAD), 0]
// a panel: the tree in one view, with its leaves or without
const panel = (name, T, leaves, view) => anim(name, { w: PW, h: PH, ...CLOCK }, (c) => {
  if (view === "camera") {
    c.mesh(CAM.view, GR.faces, GMATS, { light: LIGHT })
    c.surface(T.field, { view: CAM.view, at: AT, mats: MATS, light: LIGHT })
    if (leaves) c.splats(leaves, { view: CAM.view, at: AT, mats: MATS, light: LIGHT })
    return
  }
  const at = [PW / 2, view === "top" ? PH / 2 + 4 : PH - 6]
  c.surface(T.field, { view, ppm: 16, at, mats: MATS, light: LIGHT })
  if (leaves) c.splats(leaves, { view, ppm: 16, at, mats: MATS, light: LIGHT })
})
const VIEWS = ["side", "top", "iso", "camera"]
for (const v of VIEWS) { panel(`lobes_${v}`, PLAIN, null, v); panel(`leaves_${v}`, LEAFY, LEAVES, v) }
scene("canopy", { w: 4 * (PW + 2) + 2, h: 2 * (PH + 2) + 10, bg: "k", ...CLOCK, check: { every: 24 } }, (c) => {
  VIEWS.forEach((v, j) => {
    c.text(4 + j * (PW + 2), 2, v, "W")
    c.stamp(`lobes_${v}`, 2 + j * (PW + 2), 10)
    c.stamp(`leaves_${v}`, 2 + j * (PW + 2), 12 + PH)
  })
})

// A rock bare and with moss: patches painted where it faces up, and tufts scattered there (clumps a
// step up or down the moss's ramp).
const BARE = make3d.rock(), MOSSY = make3d.rock({ moss: 0.8 }), MOSS = sdf.scatter(MOSSY.field, MOSSY.details.moss)
const RC = hd2d(112, 80, 30), RG = ground(RC.Z), RAT = [0, RC.Z - 0.4 / Math.tan(-PITCH * RAD), 0]
const rockPanel = (name, R, moss, view) => sprite(name, { w: 112, h: 80 }, (c) => {
  if (view === "camera") { c.mesh(RC.view, RG.faces, GMATS, { light: LIGHT }); c.surface(R.field, { view: RC.view, at: RAT, mats: MATS, light: LIGHT }); if (moss) c.splats(moss, { view: RC.view, at: RAT, mats: MATS, light: LIGHT }); return }
  c.surface(R.field, { view, ppm: 40, at: [56, 70], mats: MATS, light: LIGHT })
  if (moss) c.splats(moss, { view, ppm: 40, at: [56, 70], mats: MATS, light: LIGHT })
})
for (const v of ["side", "iso", "camera"]) { rockPanel(`bare_${v}`, BARE, null, v); rockPanel(`mossy_${v}`, MOSSY, MOSS, v) }
scene("rocks", { w: 3 * 114 + 2, h: 2 * 82 + 2, bg: "k" }, (c) => {
  ["side", "iso", "camera"].forEach((v, j) => { c.stamp(`bare_${v}`, 2 + j * 114, 2); c.stamp(`mossy_${v}`, 2 + j * 114, 84) })
})
