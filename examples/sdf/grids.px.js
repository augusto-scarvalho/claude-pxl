// The reference tree made other things (phase 3 of the 3D DSL): voxels sampled from its field, drawn
// as pixel-art cubes (iso and top on the pixel grid, a tone to each face, the outline on the shaded
// side), and a mesh by surface nets, its faces drawn by mesh(); both written out for other tools
// (.vox for MagicaVoxel, .obj and .glb, Y up). A cell's size is the voxels' own, in meters (one number
// or [x, y, z]: flat slabs), and the cube's size on the picture apart from it (px, or the view's px to
// the meter): the same tree coarse and fine at one scale, things of different cells in one world, each
// at its depth. In a diorama the tree three ways side by side, swaying: its surface, its voxels and its
// mesh, each with its shadow.
include("kit.px.js", { palette: true })

// One world scale (16 px to the meter in iso: a meter along x is 16 px right and 8 down): cells of
// 0.25 m are cubes 8 px wide, of 0.125 m 4 px, of 0.0625 m 2 px; flat slabs of 0.125 x 0.125 x 0.0625 m
// 4 px wide and 1 px tall at the side. Still (no wind), each sized to its grid.
const STILL = tree({ wind: 0 }), K16 = 16
const SIZES = [["coarse", 0.25], ["medium", 0.125], ["fine", 0.0625], ["slabs", [0.125, 0.125, 0.0625]]]
for (const [name, size] of SIZES) {
  const G = sdf.voxels(STILL, { size })
  for (const v of ["iso", "top"]) {
    const S = sdf.size(G, { view: v, ppm: K16 })
    sprite(`vox_${name}_${v}`, { w: S.w, h: S.h, pivot: S.pivot }, voxels(G, { view: v, ppm: K16, at: S.pivot, light: "view" }))
  }
}
// side by side, iso above and top below, on one ground line
scene("voxel_sizes", { w: 4 * 100 + 10, h: 250, bg: "k" }, (c) => {
  SIZES.forEach(([name], i) => {
    c.stamp(`vox_${name}_iso`, 55 + i * 100, 130)
    c.stamp(`vox_${name}_top`, 55 + i * 100, 240)
    c.text(10 + i * 100, 4, name, "y")
    c.text(10 + i * 100, 11, typeof SIZES[i][1] === "number" ? `${SIZES[i][1]} m` : `${SIZES[i][1].join("x")}`, "W")
  })
})

// Things of different cells in one world: a coarse tree, a medium house behind it, a fine crystal in
// front, each placed in meters in the view's world (its origin where [0, 0, 0] lands), so each cube is
// in front of or behind the others' as it stands; the same px to the meter for all.
const WORLD = { kind: "iso", origin: [150, 150] }
scene("voxel_world", { w: 300, h: 210, bg: "k" }, (c) => {
  c.voxels(sdf.voxels(house(), { size: 0.125 }), { view: WORLD, ppm: K16, at: [-2.6, 1.4, 0], light: "view" })
  c.voxels(sdf.voxels(STILL, { size: 0.25 }), { view: WORLD, ppm: K16, at: [0, 0, 0], light: "view" })
  c.voxels(sdf.voxels(crystal(), { size: 1 / 32 }), { view: WORLD, ppm: K16, at: [0.2, -1.1, 0], light: "view" })
})

// The diorama: the HD-2D camera on the grass; on the left the tree as its surface, in the middle as
// voxels of 0.15 m made again each frame as it sways (seen through the camera, a ray stepping cell to
// cell), on the right as a mesh of 0.15 m (surface nets) whose faces mesh() draws with the ground,
// smooth (no creases between them), its shadow laid by its field. Each casts its shadow on what is drawn.
const W = 320, H = 180, VIEW = hd2d(W, H), Z = VIEW.z, GR = ground(Z), SWAY = tree()
const MESH_MATS = { ...GMATS, bark: { ramp: "bBiI", smooth: true }, leaf: { ramp: "ZzxcvVJ", smooth: true } }
const AT = [[-3.4, Z, 0], [0, Z, 0], [3.4, Z, 0]]
const moved = (faces, [x, y, z]) => faces.map((f) => ({ mat: f.mat, pts: f.pts.map((p) => [p[0] + x, p[1] + y, p[2] + z]) }))
scene("tree_three_ways", { w: W, h: H, bg: "k", ...CLOCK, check: { every: 24 } }, (c) => {
  c.mesh(VIEW, [...GR.faces, ...moved(sdf.mesh(SWAY, { size: 0.15, clock: c }).faces, AT[2])], MESH_MATS)
  c.surface(SWAY, { view: VIEW, at: AT[2], hide: true })
  c.surface(SWAY, { view: VIEW, at: AT[0] })
  c.voxels(SWAY, { size: 0.15, view: VIEW, at: AT[1] })
})

// Written by pxl build: the still tree as voxels (MagicaVoxel, and its blocks as a .glb) and as a
// mesh (.obj with its .mtl, .glb), each material's color a light middle tone of its ramp.
export3d("tree_voxels", sdf.voxels(STILL, { size: 0.1 }), { as: ["vox", "glb"] })
export3d("tree_mesh", sdf.mesh(STILL, { size: 0.1 }))
