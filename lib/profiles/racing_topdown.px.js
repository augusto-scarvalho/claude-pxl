// Racing seen from above (Micro Machines' kind): the profile as data, taken with
// include("<path>/lib/profiles/racing_topdown.px.js"). Its numbers come from the library's first lab ("the
// lab": its car turned to 16 rotations); no top-down racer is measured yet: the grid, a lane's width and the
// rotation count wait on one. The scale curve, [tall, wide] in tiles by category: scenes §19.
genre("racing_topdown", {
  camera: { kind: "topdown", pitch: 62 },   // the lab's car
  grid: 16,
  scale: {
    car: [1.75, 0.75],     // 28 px along (the lab), across by its footprint's 1.85 of 4.3 m
    tree: [2.5, 2.5], bush: [1, 1],   // as topdown16
  },
  lane: 1.5,               // car widths, a guess until a racer is measured
  dirs: 16,                // rotations: it reads at all 16 (the lab)
  // its footprint, the rotations one family; route() heading to rotation
  contract: { footprint: true, family: "rotations", route: "heading" },
  tones: 3,
  ink: "#1a1620",          // a line all round (the lab)
  decal: { at: ["n", "e", "s", "w"] },   // the roof's number only square on, or none (the lab)
  // the footprint, not the lowest row: at 62 degrees 6-7 of 16 headings have the bumper lowest (the lab)
  checks: ["footprint"],
})
