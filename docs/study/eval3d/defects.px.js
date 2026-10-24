// The grove with two defects seeded (comparison 3): the rock pushed into the house, the house raised off the ground.
include("kit.px.js", { palette: true })

const LOOKS = { ...MATS, mist_grey: "90+=", mist_blue: "678", smoke_grey: "90+=" }
const GROVE = world3d({
  seed: 11,
  wind: { from: "right", strength: 0.18 },
  parts: {
    oak: { make: "tree", at: [-2.6, 0.8], params: { leaves: 22 } },
    house: { make: "house", at: [1.3, 1.6, 0.6] },
    smoke: { make: "smoke", attach: ["house", "chimney"] },
    rock: { make: "rock", beside: ["house", "front", -1.2], params: { moss: 0.6 } },
    mist: { make: "mist", at: [0, 3.4] },
  },
})

const W = 320, H = 180, VIEW = hd2d(W, H), Z = VIEW.z, GR = ground(Z)
const grove = (name, world, check = { every: 24 }) => scene(name, { w: W, h: H, bg: "k", ...CLOCK, check },
  (c) => c.mesh(VIEW, GR.faces, GMATS), (c) => c.draw3d(world, { view: VIEW, at: [0, Z - 2.4, 0], mats: LOOKS }))
grove("grove", GROVE)

// What should hold over the loop: the canopy over the trunk as it sways, everything standing on the
// ground, the rock clear of the house, the smoke near the house it rises from.
expect3d("grove", GROVE, [
  { above: ["oak.canopy", "oak.trunk"] }, { on: ["oak.trunk", "ground"] }, { on: ["rock", "ground"] }, { on: ["house", "ground"] },
  { apart: ["rock", "house"] }, { near: ["smoke", "house", 3.5] },
], { frames: 4 })
