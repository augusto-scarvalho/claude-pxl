// Details on a form (phase 6 of the 3D DSL): splats scattered on a field's surface as many small
// things, each a pixel-art brush at a sprite's size (sdf.scatter, drawn by splats()): the reference
// tree's canopy as smooth lobes beside the same canopy with leaf clusters on it, from the side, the top,
// in iso and through the HD-2D camera, swaying (each cluster carried by the tree's bend and fluttering
// out of step); a rock bare beside the same rock with moss tufts where it faces up. The builders say what
// to scatter (make3d.tree({ leaves }), make3d.rock({ moss })): the details are theirs.
include("kit.px.js", { palette: true })


const PLAIN = make3d.tree(), LEAFY = make3d.tree({ leaves: 28 }), LEAVES = sdf.scatter(LEAFY.field, LEAFY.details.leaves)
const PW = 96, PH = 104, CAM = hd2d(PW, PH, 13), GR = ground(CAM.z), AT = CAM.aim(2.2)
// a panel: the tree in one view, with its leaves or without
const panelOf = (name, T, leaves, view) => anim(name, { w: PW, h: PH, ...CLOCK }, (c) => {
  if (view === "camera") {
    c.mesh(CAM, GR.faces, GMATS)
    c.surface(T.field, { view: CAM, at: AT })
    if (leaves) c.splats(leaves, { view: CAM, at: AT })
    return
  }
  const at = [PW / 2, view === "top" ? PH / 2 + 4 : PH - 6]
  c.surface(T.field, { view, ppm: 16, at })
  if (leaves) c.splats(leaves, { view, ppm: 16, at })
})
const VIEWS = ["side", "top", "iso", "camera"]
for (const v of VIEWS) { panelOf(`lobes_${v}`, PLAIN, null, v); panelOf(`leaves_${v}`, LEAFY, LEAVES, v) }
scene("canopy", { w: 4 * (PW + 2) + 2, h: 2 * (PH + 2) + 10, bg: "k", ...CLOCK, check: { every: 24 } },
  cells([VIEWS.map((v) => `lobes_${v}`), VIEWS.map((v) => `leaves_${v}`)], { at: [2, 10], key: "W", head: { names: VIEWS } }))

// A rock bare and with moss: patches painted where it faces up, and tufts scattered there (clumps a
// step up or down the moss's ramp).
const BARE = make3d.rock(), MOSSY = make3d.rock({ moss: 0.8 }), MOSS = sdf.scatter(MOSSY.field, MOSSY.details.moss)
const RC = hd2d(112, 80, 30), RG = ground(RC.z), RAT = RC.aim(0.4)
const rockPanel = (name, R, moss, view) => sprite(name, { w: 112, h: 80 }, (c) => {
  if (view === "camera") { c.mesh(RC, RG.faces, GMATS); c.surface(R.field, { view: RC, at: RAT }); if (moss) c.splats(moss, { view: RC, at: RAT }); return }
  c.surface(R.field, { view, ppm: 40, at: [56, 70] })
  if (moss) c.splats(moss, { view, ppm: 40, at: [56, 70] })
})
for (const v of ["side", "iso", "camera"]) { rockPanel(`bare_${v}`, BARE, null, v); rockPanel(`mossy_${v}`, MOSSY, MOSS, v) }
scene("rocks", { w: 3 * 114 + 2, h: 2 * 82 + 2, bg: "k" }, cells(["bare", "mossy"].map((r) => ["side", "iso", "camera"].map((v) => `${r}_${v}`)), { at: [2, 2] }))
