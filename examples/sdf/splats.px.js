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

// A mesh in an orthographic view: mesh() takes a camera of one's own as a function from a point in the
// camera's frame (x right, y up, z ahead of an eye far behind) to [col, row, depth]; the faces and the
// light turned into that frame for surface()'s side (20 degrees down), top and iso (30 down, 45 round).
const MESH = sdf.mesh(STILL, { size: 0.1 }), MESH_MATS = { bark: { ramp: "bBiI", smooth: true }, leaf: { ramp: "ZzxcvVJ", smooth: true } }
const orthoMesh = (c, kind, ppm, [ox, oy]) => {
  const p = (kind === "top" ? 90 : kind === "iso" ? 30 : 20) * RAD, y = (kind === "iso" ? 45 : 0) * RAD, cs = Math.cos(y), sn = Math.sin(y)
  const rot = (v) => [v[0] * cs + v[1] * sn, -v[0] * sn + v[1] * cs, v[2]], R = rot([1, 0, 0]), U = rot([0, Math.sin(p), Math.cos(p)]), F = rot([0, Math.cos(p), -Math.sin(p)])
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], frame = (w) => [dot(w, R), dot(w, U), dot(w, F) + 50]
  c.mesh((q) => [ox + q[0] * ppm, oy - q[1] * ppm, q[2]], MESH.faces.map((f) => ({ mat: f.mat, pts: f.pts.map(frame) })), MESH_MATS, { light: frame(LIGHT).map((v, e) => v - (e === 2 ? 50 : 0)) })
}
const GRID = sdf.voxels(STILL, { size: 0.1 })

// each panel: the tree as one thing, in one view; the camera's on the grass
const CAM = hd2d(PW, PH, 13), GR = ground(CAM.Z), AT = [0, CAM.Z - 2.2 / Math.tan(-PITCH * RAD), 0]
const panel = (rep, view) => sprite(`p_${rep}_${view}`, { w: PW, h: PH }, (c) => {
  if (view === "camera") {
    const faces = rep === "mesh" ? [...GR.faces, ...MESH.faces.map((f) => ({ mat: f.mat, pts: f.pts.map((p) => [p[0] + AT[0], p[1] + AT[1], p[2]]) }))] : GR.faces
    c.mesh(CAM.view, faces, { ...GMATS, ...MESH_MATS }, { light: LIGHT })
    if (rep === "surface") c.surface(STILL, { view: CAM.view, at: AT, mats: MATS, light: LIGHT })
    if (rep === "voxels") c.voxels(GRID, { view: CAM.view, at: AT, mats: MATS, light: LIGHT })
    if (rep === "splats") c.splats(TREE_SPLATS, { view: CAM.view, at: AT, mats: MATS, light: LIGHT })
    // (a mesh's and splats' shadow: their field's, laid by surface() drawing nothing else)
    if (rep === "mesh" || rep === "splats") c.surface(STILL, { view: CAM.view, at: AT, mats: MATS, light: LIGHT, hide: true })
    return
  }
  const at = [PW / 2, view === "top" ? PH / 2 + 4 : PH - 6]
  if (rep === "surface") c.surface(STILL, { view, ppm: PPM16, at, mats: MATS, light: LIGHT })
  // (voxels through the same true views as the others here, not on the pixel grid: the same tree compared)
  if (rep === "voxels") c.voxels(GRID, { view: { kind: view, pitch: view === "top" ? 90 : view === "iso" ? 30 : 20, yaw: view === "iso" ? 45 : 0 }, ppm: PPM16, at, mats: MATS, light: LIGHT })
  if (rep === "splats") c.splats(TREE_SPLATS, { view, ppm: PPM16, at, mats: MATS, light: LIGHT })
  if (rep === "mesh") orthoMesh(c, view, PPM16, at)
})
const REPS = ["surface", "voxels", "mesh", "splats"], VIEWS = ["side", "top", "iso", "camera"]
for (const r of REPS) for (const v of VIEWS) panel(r, v)
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
const CL = hd2d(160, 112, 20), CLOUD = cloud(0.8), CLOUD_AT = [0, CL.Z - 2.2 / Math.tan(-PITCH * RAD), 1.6], CG = ground(CL.Z)
scene("cloud_volume", { w: 160, h: 112, bg: "k", ...CLOCK, check: { every: 24 } },
  (c) => c.mesh(CL.view, CG.faces, GMATS, { light: LIGHT }), (c) => c.volume(CLOUD, { view: CL.view, at: CLOUD_AT, light: LIGHT, ...LOOK.cloud }))
scene("cloud_splats", { w: 160, h: 112, bg: "k", ...CLOCK, check: { every: 24 } },
  (c) => c.mesh(CL.view, CG.faces, GMATS, { light: LIGHT }), (c) => c.splats(CLOUD, { spacing: 0.12, view: CL.view, at: CLOUD_AT, light: LIGHT, ramp: LOOK.cloud.ramp }))

// Written by pxl build as .ply in 3D Gaussian Splatting's layout (Y up): the tree's surface, the cloud's inside.
export3d("tree_splats", TREE_SPLATS, { mats: MATS })
export3d("cloud_splats", sdf.splats(cloud(), { spacing: 0.12 }), { mats: { cloud: LOOK.cloud.ramp } })
