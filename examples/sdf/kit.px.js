// The fields kit: the palette, the materials and the light (lib/styles/fields.px.js), an HD-2D camera,
// the ground, the builders of examples/sdf (a tree, a rock, a mushroom house, a crystal: make3d's, the
// library of builders with semantic parameters, their fields here), each a distance field in meters, and
// the densities (lib/vfx/volumes.px.js).
// Taken with include("kit.px.js", { palette: true }) by fields.px.js (as pixel art) and grids.px.js
// (as voxels and meshes).
include("../../lib/styles/fields.px.js", { palette: true, as: "fields" })   // the palette, MATS and the light (look3d)
const { MATS, LIGHT } = fields

const CLOCK = { frames: 24, fps: 1000 / 150 }, TAU = 2 * Math.PI

// An HD-2D camera, as the hd2d examples' (perspective()'s): 40 degrees down through a long lens (30
// across), 24 px to the meter where it looks (`ppm` another scale), the middle of a w x h picture on the
// ground z m ahead; its aim(h) stands a thing so its point h m up is there.
const PITCH = -40, PPM = 24
const hd2d = (w, h, ppm = PPM) => perspective({ w, h, pitch: PITCH, fov: 30, ppm })
const GMATS = { grass: { ramp: "qQsS" }, path: { ramp: "tTu" }, wall: { ramp: "DtTuU" } }
const ground = (Z) => { const g = model(); g.face("grass", [-12, Z - 8, 0], [12, Z - 8, 0], [12, Z + 12, 0], [-12, Z + 12, 0]); return g }

// The reference tree, the one the 3D DSL is measured by (to be made the same as voxels, a mesh and
// splats): a broadleaf. A trunk 0.2 m round at the foot flaring into two roots, narrowing to 0.13 m at
// the fork 1.6 m up; there `limbs` limbs (3) part all round it and climb at 45-60 degrees, each kinking
// once (`twist`: how far its second half turns away), 1.1-1.4 m long, tapering to 0.05 m; kept apart
// where they leave the fork (limbs crossing there read as a tangle). The crown: a lobe at each limb's
// end, one over the fork and one between each two tips, melted together (0.15 m) and pushed in and out
// by seeded noise (0.14 m in bumps 0.45 m across), so the lobes read as clumps: 2.8 m wide, 2.5 m deep,
// from 2.3 m up to 4.2 m (wider than tall by half), the trunk and the limbs' feet showing under it.
// Bark and leaves, lit from the upper left. The wind (`wind`: m at the top, 0.2) bends it as a way
// bends (the trunk with the square of the height), coming and going over the loop, each lobe
// fluttering out of step twice as fast. Seen from the side (20 degrees down), the top, iso (30 down, 45
// round) at 16 px to the meter, and through an HD-2D camera at 24. Measured by: its silhouette and
// proportions the same in every view and every representation (the crown's width over its height, the
// trunk's share under it), 4 to 7 tones a material in clusters, the outline only on the side away from
// the light, its foot on the ground and its shadow touching it, the same seed the same tree, and its
// parameters (height, limbs, twist, lobe, wind, seed) the handles a local edit turns.
const tree = (o = {}) => make3d.tree(o).field

// A boulder: a squat ellipsoid cut flat by planes all round (rocks read as a few big planes, each one
// tone), their edges softened, a lumpy noise over it, the part under the ground cut away; stone, and
// moss where it faces up.
const rock = (o = {}) => make3d.rock(o).field
// A mushroom house: a stem widening to its foot, a door sunk into it (its frame, a knob) and a round
// window lit from inside, under a cap a dome flattened and cut below, red with cream spots, a chimney
// through it.
const house = (o = {}) => make3d.house(o).field

// A crystal cluster: three hexagonal prisms with pointed tips (each the inside of six planes round it,
// six leaning in over its tip), leaning apart from a rock at their foot; glinting where the light
// mirrors toward the eye. It turns once round over the loop.
const crystal = (o = {}) => make3d.crystal(o).field.rotate((c) => 360 * c.phase)

// Densities for volume() and splats: a cloud, a mist, smoke and a magic orb, and how each is drawn (LOOK):
// lib/vfx/volumes.px.js.
include("../../lib/vfx/volumes.px.js", { palette: true, as: "volumes" })
const { cloud, mist, orb, LOOK } = volumes, smokeField = volumes.smoke
