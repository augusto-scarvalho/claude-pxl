// A scene as data (phase 6 of the 3D DSL): world3d's named parts, each made by a builder with semantic
// parameters and a seed of its own, placed by relations (beside the house, attached to its chimney), sharing
// a wind; a ground mist as a band behind them; drawn by draw3d(), each pixel knowing its part (pxl steps world.px.js grove --at x,y says
// "part: oak.canopy"). Then the plan's edit, "a denser canopy, twistier branches, wind from the left, a
// bluish ground mist": world.edit() changes those parameters and nothing else; world.changed() says what
// moved (the oak's canopy, branches and leaves, the smoke and the mist with the wind), and the trunk, the
// house and the rock stay byte for byte as they were. expect3d's rules hold over the loop (pxl check).
include("kit.px.js", { palette: true })

const LOOKS = { ...MATS, mist_grey: "90+=", mist_blue: "678", smoke_grey: "90+=" }
const GROVE = world3d({
  seed: 11,
  wind: { from: "right", strength: 0.18 },
  parts: {
    oak: { make: "tree", at: [-2.6, 0.8], params: { leaves: 22 } },
    house: { make: "house", at: [1.3, 1.6] },
    smoke: { make: "smoke", attach: ["house", "chimney"] },
    rock: { make: "rock", beside: ["house", "front", 0.4], params: { moss: 0.6 } },
    mist: { make: "mist", at: [0, 3.4] },
  },
})
const EDITED = GROVE.edit({ "oak.canopy": 1.6, "oak.leaves": 34, "oak.twist": 0.8, "wind.from": "left", "mist.color": "blue" })

const W = 320, H = 180, VIEW = hd2d(W, H), Z = VIEW.z, GR = ground(Z)
// the edited grove's frames aren't checked (its expects are): a frame through this camera takes a second
const grove = (name, world, check = { every: 24 }) => scene(name, { w: W, h: H, bg: "k", ...CLOCK, check },
  (c) => c.mesh(VIEW, GR.faces, GMATS), (c) => c.draw3d(world, { view: VIEW, at: [0, Z - 2.4, 0], mats: LOOKS }))
grove("grove", GROVE)
grove("grove_edited", EDITED, false)

// What should hold over the loop: the canopy over the trunk as it sways, everything standing on the
// ground, the rock clear of the house, the smoke near the house it rises from.
expect3d("grove", GROVE, [
  { above: ["oak.canopy", "oak.trunk"] }, { on: ["oak.trunk", "ground"] }, { on: ["rock", "ground"] }, { on: ["house", "ground"] },
  { apart: ["rock", "house"] }, { near: ["smoke", "house", 3.5] },
], { frames: 4 })
expect3d("grove_edited", EDITED, [{ above: ["oak.canopy", "oak.trunk"] }, { apart: ["rock", "house"] }], { frames: 4 })
