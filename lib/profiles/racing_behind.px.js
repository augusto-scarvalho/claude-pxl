// Racing seen from behind (pseudo-3D, Out Run's kind): the profile as data, taken with
// include("<path>/lib/profiles/racing_behind.px.js"). Its numbers come from the library's first lab ("the
// lab": its car) and examples/perspective/race.px.js (pxl's own race); no racer from behind is measured yet:
// the size ladder and the frame count wait on one. No tile grid and no meters on screen: sizes in px across.
genre("racing_behind", {
  camera: { kind: "behind", pitch: { up: 1, flat: 6, down: 13 } },   // the lab's: a rival about 0.6 as high as wide, a low eye (the race's 0.53)
  grid: null,
  scale: { car: [38, 64] },            // px, at its nearest: 64 across (the lab), 0.6 of that high
  sizes: [64, 32, 16],                 // the car drawn at, px across (the lab)
  rivals: [64, 48, 34, 24, 16, 10, 6], // px across, picked by fit (the race)
  // steering -2..2, 11 degrees a step, on a road going up, flat and down: 15 drawings a size (the lab)
  dirs: { steer: [-2, -1, 0, 1, 2], step: 11, road: ["up", "flat", "down"] },
  // where it meets the road, m; sockets; 2 liveries by roles (roleSwap(), mats)
  contract: { footprint: [4.3, 1.85], sockets: ["exhaust", "tow"], liveries: 2 },
  tones: { 64: 4, 32: 3, 16: 3 },      // by px across (the lab)
  ink: { color: "#1a1620", from: 24 }, // a line all round from 24 px across, none at 16 (the lab; the race's rivals)
  decal: { from: 64 },                 // the number only at 64 px
  checks: ["footprint"],               // the drawing down to where its wheels meet the road, at every heading
})
