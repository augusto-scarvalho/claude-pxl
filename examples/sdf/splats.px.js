// Procedural Gaussian splats (phase 5 of the 3D DSL, experimental): the reference tree's surface laid
// as flat discs along it (sdf.splats), drawn by splats(), a CPU rasterizer to pixel art (each splat's
// ellipse through the camera, the nearest first, its opacity gathered; the light snapped to the ramps in
// clusters, thin edges dithered, the solid contour outlined away from the light). Beside its surface,
// its voxels and its mesh, from the side, the top, in iso and through the HD-2D camera: the same tree
// four ways, four views. A cloud's inside as round splats. Written as 3DGS .ply files for Spark and the
// other viewers.
include("kit.px.js", { palette: true })

const STILL = tree({ wind: 0 }), PPM16 = 16
// the tree's splats: discs 0.05 m apart on its surface, 0.03 m across their plane (a std dev)
const TREE_SPLATS = sdf.splats(STILL, { spacing: 0.05, size: 0.03 })
const PW = 96, PH = 104

// each panel: the tree as one thing drawn one way (draw3d's as: its surface, voxels of 0.1 m, a mesh of
// 0.1 m, splats 0.05 m apart), in one view; the camera's on the grass, the mesh's and the splats' shadow
// their field's
const CAM = hd2d(PW, PH, 13), GR = ground(CAM.z), AT = CAM.aim(2.2)
// (the mesh through the camera in the ground's own mesh(), so the grass in front of the trunk's foot is
// outlined against it as it was: draw3d's mesh comes after the ground, over its depth)
const MESH = sdf.mesh(STILL, { size: 0.1 }).faces.map((f) => ({ mat: f.mat, pts: f.pts.map((p) => [p[0] + AT[0], p[1] + AT[1], p[2]]) }))
const panelOf = (rep, view) => sprite(`p_${rep}_${view}`, { w: PW, h: PH }, (c) => {
  const o = { as: rep, size: 0.1, spacing: 0.05 }
  if (view === "camera" && rep === "mesh") { c.mesh(CAM, [...GR.faces, ...MESH], { ...GMATS, bark: { ramp: "bBiI", smooth: true }, leaf: { ramp: "ZzxcvVJ", smooth: true } }); c.surface(STILL, { view: CAM, at: AT, hide: true }); return }
  if (view === "camera") { c.mesh(CAM, GR.faces, GMATS); c.draw3d(STILL, { ...o, view: CAM, at: AT }); return }
  // (voxels through the same true views as the others here, not on the pixel grid: the same tree compared)
  const turn = rep === "voxels" ? { pitch: view === "top" ? 90 : view === "iso" ? 30 : 20, yaw: view === "iso" ? 45 : 0 } : {}
  c.draw3d(STILL, { ...o, view: { kind: view, ...turn, origin: [PW / 2, view === "top" ? PH / 2 + 4 : PH - 6] }, ppm: PPM16 })
})
const REPS = ["surface", "voxels", "mesh", "splats"], VIEWS = ["side", "top", "iso", "camera"]
for (const r of REPS) for (const v of VIEWS) panelOf(r, v)
// the sheet: a row a representation, a column a view
scene("tree_four_ways", { w: 34 + VIEWS.length * (PW + 2), h: 10 + REPS.length * (PH + 2), bg: "k" }, (c) => {
  VIEWS.forEach((v, j) => c.text(36 + j * (PW + 2), 2, v, "W"))
  REPS.forEach((r, i) => {
    c.text(2, 12 + i * (PH + 2) + PH / 2, r.slice(0, 6), "W")
    VIEWS.forEach((v, j) => c.stamp(`p_${r}_${v}`, 34 + j * (PW + 2), 10 + i * (PH + 2)))
  })
})

// A cloud's inside as round splats, beside the same cloud ray-marched by volume(): blobs 0.12 m apart,
// as opaque as it is dense, lit as the light gets in; drifting and boiling on the clock (made again each
// frame from the density).
const CL = hd2d(160, 112, 20), CLOUD = cloud(0.8), CLOUD_AT = CL.aim(2.2, 1.6), CG = ground(CL.z)
scene("cloud_volume", { w: 160, h: 112, bg: "k", ...CLOCK, check: { every: 24 } },
  (c) => c.mesh(CL, CG.faces, GMATS), (c) => c.volume(CLOUD, { view: CL, at: CLOUD_AT, ...LOOK.cloud }))
scene("cloud_splats", { w: 160, h: 112, bg: "k", ...CLOCK, check: { every: 24 } },
  (c) => c.mesh(CL, CG.faces, GMATS), (c) => c.splats(CLOUD, { spacing: 0.12, view: CL, at: CLOUD_AT, ramp: LOOK.cloud.ramp }))

// Written by pxl build as .ply in 3D Gaussian Splatting's layout (Y up): the tree's surface, the cloud's inside.
export3d("tree_splats", TREE_SPLATS)
export3d("cloud_splats", sdf.splats(cloud(), { spacing: 0.12 }), { mats: { cloud: LOOK.cloud.ramp } })
