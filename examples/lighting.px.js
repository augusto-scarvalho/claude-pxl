// Lighting demo: a snowy two-floor cabin at night. Torches, a chandelier and a lamppost carry
// their own lamps; solid layers block light, wall layers stop the sky light from coming in.
pal({
  k: "#0e0b16", n: "#3b2f5c", N: "#6b5a8e", s: "#e8eef7", S: "#a9b8d0",
  d: "#5a3a2a", D: "#3a2418", t: "#6d6a78", T: "#4a4756",
  w: "#7a4e32", W: "#5c3a26", b: "#3d2617", l: "#c9a46b", r: "#8c2f2f",
  g: "#5d7fa8", y: "#ffd36b", Y: "#ff8a2a", G: "#e0f4ff",
})
include("../lib/props/lamps.px.js")   // the torch and the lamppost, taken in these colors

sprite("_plank", `
  wwwwwwwW
  wwwwwwwW
  wwwwwwwW
  WWWWWWWW`)

sprite("torch", { base: "_torch", swap: roleSwap(lamps.ROLES._torch, { light: "Yy", handle: "b" }) })

// Written as the left half; mirroring also mirrors the candle's lamp.
sprite("chandelier", { mx: "c" }, `
  ....b
  ....b
  y...b
  b...b
  bbbbb`, lamp(0, 2, { r: 40, color: "#ffc070" }))

sprite("lamppost", { base: "_lamp_tiny", swap: roleSwap(lamps.ROLES._lamp_tiny, { frame: "b", light: "G" }) })

sprite("table", `
  llllllll
  .b....b.
  .b....b.`)

const attic = [68, 46, 112, 24, 156, 46];

scene("cabin", { w: 200, h: 130, bg: "n", layers: true },
  layer("sky", { unlit: true }, grad(0, 0, 200, 100, "nN"), noise(0, 0, 200, 100, "s", 0.012, 5)),

  layer("cave", { wall: true }, ellipse(30, 120, 15, 7, "D")),
  layer("ground", { solid: true },
    poly([0, 110, 30, 104, 56, 95, 200, 95, 200, 130, 0, 130], "s"),
    poly([0, 112, 30, 106, 56, 97, 200, 97, 200, 130, 0, 130], "d"),
    noise(0, 100, 200, 30, "tD", 0.08, 3, "d"),
    ellipse(30, 120, 14, 6, "_")),

  layer("backwall", { wall: true },
    pattern("_plank", 65, 49, 94, 47),
    clip(attic, pattern("_plank", 68, 24, 88, 22, { swap: { w: "W", W: "b" } })),
    rect(80, 54, 10, 10, "g"), box(80, 54, 10, 10, "b"), hline(80, 58, 10, "b"),
    rect(110, 76, 10, 12, "g"), box(110, 76, 10, 12, "b"), vline(114, 76, 12, "b")),

  layer("frame", { solid: true },
    poly([52, 48, 112, 15, 172, 48], "s"),
    poly([56, 48, 112, 18, 168, 48], "b"),
    poly(attic, "_"),
    rect(60, 46, 104, 3, "b"),
    rect(62, 69, 100, 3, "b"), rect(140, 69, 8, 3, "_"),     // upper floor, hole for the ladder
    rect(62, 46, 3, 50, "b"), rect(159, 46, 3, 50, "b"),
    rect(62, 80, 3, 16, "_"),                                 // front door
    rect(159, 54, 3, 8, "_"),                                 // open upstairs window
    rect(62, 96, 100, 3, "t"), noise(62, 96, 100, 3, "T", 0.3, 9)),

  layer("props",
    (c) => { c.vline(141, 69, 27, "l"); c.vline(146, 69, 27, "l"); for (let y = 71; y < 96; y += 4) c.hline(141, y, 6, "l"); },
    stamp("torch", 70, 82), stamp("torch", 152, 82), stamp("torch", 26, 116),
    stamp("chandelier", 96, 49),
    stamp("table", 92, 63), stamp("table", 118, 93),
    rect(124, 64, 12, 5, "r"), rect(124, 63, 3, 2, "s"),     // bed
    stamp("lamppost", 36, 84)),

  lighting({ cell: 4, sky: 0.9, skyColor: "#d8ccf0", skyReach: 20, ambient: 0.03, emit: "yYG" }))
