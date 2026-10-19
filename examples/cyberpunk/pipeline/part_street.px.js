// Street part (plan.md, part 6): the road and both sidewalks, the near curb's sodium streetlights,
// wooden utility poles with sagging power lines, curbside props, steam from a manhole, and the lamps'
// pools of light for the scene to lay over the street.
// Light: the street lies in the city's shade. The cool sky from above lights what faces up one tone
// lighter (sidewalks, curb tops, the tops of crossarms and lids) and the upper-left edges of poles.
// The two streetlights' heads hang at (70, 76) and (230, 76); the one on the pole at x 204 is off in
// frames 0-99, stutters on in 100-130 and cuts out at 237. Its pool and the steam's warm tint follow it.
// Everything is written in scene coordinates: each asset's layer is offset by where the city stamps it.
include("palette.px.js", { palette: true })

// ---------------------------------------------------------------- shared numbers
const STREET_VX = 160, STREET_HZ = 104                    // ground lines running away from us meet here
// x at row y of a ground line running straight away from us that crosses row y0 at x0
const STREET_PERSP = (x0, y0, y) => Math.round(STREET_VX + (x0 - STREET_VX) * (y - STREET_HZ) / (y0 - STREET_HZ))
const STREET_LAMPS = [[44, 70], [204, 230]]               // [pole x, head x]; heads on rows 74-77
// The lamp at x 204: 0 off, 1 warming (a dull glow), 2 on. A ballast striking: bright flashes, then
// a dull glow that catches. The lamp at x 44 is always on.
const STREET_STUTTER = "2002000022000020201111111111122"
const STREET_LAMP2 = (f) => f < 100 || f >= 237 ? 0 : f <= 130 ? +STREET_STUTTER[f - 100] : 2
const STREET_LAMP_STATE = (i, f) => i === 0 ? 2 : STREET_LAMP2(f)

// ---------------------------------------------------------------- the ground (rows 136-179)
// light from a shop's glass falling on the far sidewalk, widening toward the curb
const STREET_SPILL = (x0, x1, grow) => [x0 - grow, 137, x1 + grow, 137, x1 + 4 + 2 * grow, 143, x0 - 4 - 2 * grow, 143]

sprite("street_ground", { w: 320, h: 44 }, layer("ground", { y: -136 },
  // far sidewalk, in the facades' shade: grime at the wall foot, slab joints running away from us
  rect(0, 136, 320, 6, "e"), hline(0, 136, 320, "c"), dither(0, 137, 320, 1, ".", "c", 0.25),
  (c) => { for (let X = 4; X < 330; X += 11) c.line(STREET_PERSP(X, 141, 137), 137, X, 141, "c") },
  hline(0, 141, 320, "E"),                                                   // the curb's top edge
  // far curb face; red no-stopping paint, flaking; the driveway apron into the lot; a storm drain
  hline(0, 142, 320, "c"), hline(0, 143, 320, "C"),
  hline(60, 142, 51, "m"), hline(60, 143, 51, "r"),
  ...[[66, 142], [67, 142], [79, 143], [88, 142], [97, 142], [98, 143], [104, 142]].map(([x, y]) => px(x, y, y === 142 ? "c" : "C")),
  hline(120, 142, 49, "e"), hline(122, 143, 45, "c"),
  hline(196, 142, 9, "K"), hline(196, 143, 9, "k"), ...[197, 199, 201, 203].map((x) => px(x, 143, "C")),
  // shop light spilling over the slabs and the curb: the taco window, the liquor store, the laundromat
  ...[[70, 94], [174, 210], [248, 272]].map(([x0, x1]) => light(STREET_SPILL(x0, x1, 3), 1, 0.5)),
  ...[[70, 94], [174, 210], [248, 272]].map(([x0, x1]) => light(STREET_SPILL(x0, x1, 0), 1)),
  // gutter, with what the traffic swept into it
  hline(0, 144, 320, "G"),
  ...[[12, "u"], [37, "E"], [83, "m"], [84, "m"], [141, "E"], [229, "u"], [258, "e"], [301, "m"]].map(([x, k]) => px(x, 144, k)),
  px(199, 144, "0"), px(200, 145, "0"), px(199, 145, "0"),                   // the drain's dirty water

  // road: sun-bleached asphalt
  rect(0, 145, 320, 22, "g"),
  rect(286, 145, 24, 5, "G"), hline(286, 145, 24, "0"), hline(286, 149, 24, "0"),   // patches over old trenches
  rect(130, 157, 28, 8, "G"), hline(130, 157, 28, "0"), hline(130, 164, 28, "0"),
  noise(0, 145, 320, 22, "l", 0.02, 3, "g"), noise(0, 145, 320, 22, "G", 0.035, 4, "g"),
  (c) => {
    const r = c.rng(11)
    // wheel tracks polished lighter, in broken streaks (far lane rows 147-151, near lane 159-164)
    for (const [y, share] of [[147, 0.15], [150, 0.3], [151, 0.25], [159, 0.25], [160, 0.3], [163, 0.3], [164, 0.25]])
      for (let x = Math.floor(r() * 8); x < 320;) {
        const len = 2 + Math.floor(r() * 9)
        if (r() < share * 1.6) c.hline(x, y, len, "l")
        x += len + Math.floor(r() * 6)
      }
    // oil dripped between the tracks, in each lane's middle: blotches, darkest at the heart
    for (const [y0, n] of [[149, 8], [162, 10]])
      for (let i = 0; i < n; i++) {
        const x = Math.floor(r() * 320), rx = 2 + Math.floor(r() * 5)
        c.ellipse(x, y0, rx, 0, "G")
        if (rx > 3) { c.hline(x - rx + 2, y0 - 1 + (i % 2) * 2, rx, "G"); c.hline(x - 1, y0, 3, "0") }
      }
    // the double yellow line, worn through in places
    for (const [y, gap] of [[155, 3], [156, 7]])
      for (let x = Math.floor(r() * 4); x < 320;) {
        const len = 4 + Math.floor(r() * 16)
        c.hline(x, y, len, r() < 0.3 ? "s" : "u")
        x += len + 1 + Math.floor(r() * gap)
      }
    // tar snakes: sealed cracks wandering across the lanes
    for (let i = 0; i < 6; i++) {
      let x = 10 + Math.floor(r() * 290), y = 146 + Math.floor(r() * 18)
      const pts = [x, y]
      for (let k = 0; k < 4; k++) {
        x += 3 + Math.floor(r() * 6); y = Math.min(165, Math.max(145, y + (r() < 0.5 ? -2 : 2)))
        pts.push(x, y)
      }
      c.curve(pts, "0")
    }
    // fine cracks along both gutters, where the road edge breaks up first
    for (let i = 0; i < 14; i++) {
      let x = Math.floor(r() * 320), y = i % 2 ? 145 : 165
      for (let k = 0; k < 4; k++) { c.px(x, y, "G"); x += 1 + Math.floor(r() * 2); y += i % 2 ? Math.floor(r() * 2) : -Math.floor(r() * 2) }
    }
  },
  // the manhole the steam comes out of, the asphalt dark and damp around it
  ellipse(262, 161, 9, 2, "G"), ellipse(262, 161, 5, 1, "c"), ellipse(262, 161, 5, 1, "C", true),
  hline(260, 160, 5, "e"), px(259, 161, "K"), px(262, 161, "K"), px(265, 161, "K"),

  // near curb: the gutter's shadow, the curb's rounded edge, its top; red paint by the streetlight
  hline(0, 166, 320, "G"), hline(0, 167, 320, "e"), hline(0, 168, 320, "E"),
  hline(28, 167, 34, "r"), hline(28, 168, 34, "m"), px(35, 168, "E"), px(36, 168, "E"), px(49, 167, "e"), px(57, 168, "E"),
  // near sidewalk: lighter slabs, a joint along the middle and joints running away from us
  rect(0, 169, 320, 11, "E"), dither(0, 169, 320, 1, ".", "e", 0.5),
  hline(0, 174, 320, "e"),
  (c) => { for (let X = 2; X < 340; X += 18) c.line(STREET_PERSP(X, 179, 169), 169, X, 179, "e") },
  // cracks from slab corners, a spill drying by the trash can, a water-meter lid, a tag
  line(84, 175, 88, 177, "e"), line(88, 177, 90, 177, "e"), line(213, 170, 216, 172, "e"), line(301, 176, 303, 179, "e"),
  ellipse(21, 172, 3, 1, "e"), px(25, 173, "e"),
  rect(120, 176, 12, 3, "c"), box(120, 176, 12, 3, "C"), hline(122, 177, 8, "e"),
  curve([268, 178, 270, 176, 273, 178, 276, 176, 278, 177], "m"), line(272, 175, 276, 179, "t"), px(280, 176, "m")))

// ---------------------------------------------------------------- curbside props (pivot on the sidewalk)
// teal city trash can, a bag of trash knotted on top and a cup jammed in; lit from the sky, upper left
sprite("_street_can", { pivot: "bottom" }, `
  ...KK...
  ..KCeK..
  .KCCCCKU
  jJjjjtTT
  jttttttT
  jtTTTTtT
  jttttttT
  jttttttT
  jtTTTTtT
  jttttttT
  jttttttT
  jtTTTTtT
  jttttttT
  KTTTTTTK`)
// fire hydrant, red paint chalky on top
sprite("_street_hydrant", { pivot: "bottom" }, `
  ...M...
  ..MmmR.
  .MmmmrR
  .RrrrrR
  MMmmmrR
  .Mmmmr.
  .Mmmmr.
  .mmmmr.
  RrrrrrR`)
// parking meter with a small teal display
sprite("_street_meter", { pivot: "bottom" }, `
  .ccc.
  cezCC
  ceCCC
  ceeCC
  .CCC.
  ..c..
  ..c..
  ..c..
  ..c..
  ..c..
  ..c..
  ..c..
  ..c..
  .CCC.`)
// newspaper box in sun-faded yellow, its window holding the sky
sprite("_street_newsbox", { pivot: "bottom" }, `
  UUUUUUUs
  UuuuuuuS
  UunnvnuS
  UunTTTuS
  UuTTTTuS
  UuuuuuuS
  UuKKKuuS
  UuuuuuuS
  UssssssS
  .C....C.
  .C....C.
  CC....CC`)
// sneakers thrown over the phone cable, swinging on their laces
sprite("_street_shoes_a", { pivot: [3, 0] }, `
  ...K...
  ..K.K..
  ..K..K.
  .LLr.K.
  .CCC.LLr
  .....CCC`)
sprite("_street_shoes_b", { pivot: [3, 0] }, `
  ...K...
  ...KK..
  ...K.K.
  ..LLrK.
  ..CCCLLr
  .....CCC`)
// cobra-head lamp: housing in shade with a sky-lit top, the glass underneath off, warming, on
sprite("_street_head_off", `
  ...eeeee...
  .eccccccce.
  CCCCCCCCCC.
  .ccCCCCc...`)
sprite("_street_head_dim", { base: "_street_head_off" }, `
  ...........
  ...........
  ...........
  .OOOOOOO...`)
sprite("_street_head_on", { base: "_street_head_off" }, `
  ...........
  ...........
  ...........
  .aAAAAAa...`)

// ---------------------------------------------------------------- what stands at the near curb (rows 30-179)
const STREET_POLES = [112, 292]                            // wooden utility poles, 4 px: x-2 .. x+1
const STREET_SPANS = [-68, 112, 292, 472]                  // the poles off screen too, 180 px apart
const STREET_PINS = [[-11, 32, 16], [12, 32, 16], [-8, 40, 13]]  // [dx, row, sag]: one sag per arm, so they run together

anim("street_front", { w: 320, h: 150, frames: 240, fps: 12 }, layer("front", { y: -30 }, (c) => {
  const f = c.frame
  const sway = (i) => Math.sin(2 * Math.PI * (f / 120 + i * 0.37)) > 0.6 ? 1 : 0   // a breath of wind
  // power lines from pin to pin, a phone cable lower down with a pair of sneakers on it
  STREET_PINS.forEach(([dx, y, sag], i) => {
    for (let s = 0; s < 3; s++) c.wire(STREET_SPANS[s] + dx, y, STREET_SPANS[s + 1] + dx, y, sag + sway(i), "K")
  })
  for (let s = 0; s < 3; s++)
    c.wire(STREET_SPANS[s], 60, STREET_SPANS[s + 1], 60, 22 + sway(6), "k",
      s === 1 ? { hang: f % 48 < 24 ? "_street_shoes_a" : "_street_shoes_b", every: 400, start: 64 } : {})
  // service drops: to A's roof, and from the transformer down to F's roof
  c.wire(104, 40, 50, 60, 3, "K")
  c.wire(300, 53, 304, 92, 1, "K")

  for (const P of STREET_POLES) {
    // the pole: sky-lit left edge, weathered middle, shaded right side
    c.vline(P - 2, 30, 141, "f"); c.rect(P - 1, 30, 2, 141, "b"); c.vline(P + 1, 30, 141, "B")
    c.hline(P - 2, 30, 4, "B")
    // crossarms with braces, glass insulators
    c.hline(P - 13, 34, 27, "f"); c.hline(P - 13, 35, 27, "B")
    c.hline(P - 10, 42, 21, "f"); c.hline(P - 10, 43, 21, "B")
    c.line(P - 9, 36, P - 3, 41, "B"); c.line(P + 8, 36, P + 2, 41, "B")
    for (const [dx, y] of STREET_PINS) { c.px(P + dx, y, "J"); c.px(P + dx, y + 1, "j") }
    c.hline(P - 3, 60, 6, "C")                                              // the phone cable's clamp
    // climbing steps up from above head height
    for (let y = 48, k = 0; y <= 136; y += 8, k++) c.hline(k % 2 ? P + 2 : P - 4, y, 2, "C")
  }
  // pole at x 112: flyers stapled over each other
  c.rect(110, 141, 4, 6, "U"); c.hline(111, 142, 2, "s"); c.hline(110, 144, 3, "s"); c.px(113, 146, "_")
  c.rect(110, 148, 4, 4, "J"); c.hline(110, 149, 3, "t"); c.px(110, 151, "_")
  // pole at x 292: the transformer can, its bushing wired to the crossarm; a no-parking sign
  c.rect(294, 46, 6, 10, "c"); c.vline(294, 46, 10, "e"); c.vline(299, 46, 10, "C"); c.hline(294, 45, 6, "E")
  c.hline(294, 50, 6, "C"); c.px(293, 47, "C"); c.px(293, 54, "C")
  c.px(296, 44, "J"); c.px(296, 43, "j"); c.line(296, 42, 298, 34, "K")
  c.rect(294, 96, 5, 7, "L"); c.box(294, 96, 5, 7, "m"); c.line(295, 101, 297, 97, "m"); c.px(296, 99, "K")
  c.vline(299, 97, 5, "C")

  // sodium streetlights: a tapering steel pole on a flared foot, an arm out to the head
  STREET_LAMPS.forEach(([P, H], i) => {
    c.vline(P - 1, 112, 59, "e"); c.vline(P, 112, 59, "c"); c.vline(P + 1, 112, 59, "C")
    c.vline(P, 82, 30, "e"); c.vline(P + 1, 82, 30, "C")
    c.rect(P - 2, 163, 5, 8, "c"); c.vline(P - 2, 163, 8, "e"); c.vline(P + 2, 163, 8, "C"); c.hline(P - 3, 170, 7, "C")
    c.vline(P + 1, 154, 4, "K")                                             // the access hatch
    c.rect(P - 1, 138, 3, 4, "U"); c.px(P, 139, "s")                        // a sticker
    c.curve([P, 82, P + 1, 78, P + 4, 75, P + 9, 73, P + 15, 73, H - 5, 74], "e")
    c.curve([P + 1, 83, P + 2, 79, P + 5, 76, P + 10, 74, P + 15, 74, H - 5, 75], "C")
    c.stamp(["_street_head_off", "_street_head_dim", "_street_head_on"][STREET_LAMP_STATE(i, f)], H - 5, 74)
  })

  c.stamp("_street_can", 12, 171)
  c.stamp("_street_hydrant", 152, 171)
  c.stamp("_street_meter", 176, 171)
  c.stamp("_street_newsbox", 240, 171)
}))

// ---------------------------------------------------------------- steam from the manhole (rows 112-161)
// [phase, rise period (divides 240), size]: each puff rises, drifts right in the wind and thins away
// A dense column (period 80) of overlapping puffs, and slower wisps (period 120) carried farther right.
const STREET_PUFFS = [...Array(12)].map((_, i) => [i / 12 + ((i * 7) % 5) * 0.012, 80, 0.8 + ((i * 5) % 4) * 0.12])
  .concat([[0.1, 120, 1.1], [0.43, 120, 0.9], [0.77, 120, 1]])

anim("street_steam", { w: 40, h: 50, frames: 240, fps: 12, pivot: "bottom" }, (c) => {
  const f = c.frame, warm = STREET_LAMP2(f) === 2                          // the lamp at x 230 tints it
  const puffs = STREET_PUFFS.map(([ph, per, sz], i) => [(f / per + ph) % 1, sz, i, per]).sort((a, b) => b[0] - a[0])
  for (const [t, sz, i, per] of puffs) {
    const x = Math.round(19 + t * t * (per > 80 ? 18 : 12) + Math.sin(t * 6 + i) * 1.5 * t), y = Math.round(47 - t * 42)
    const grow = t < 0.75 ? 1 + t * 4 : 4 * (1 - (t - 0.75) / 0.25), r = Math.round(grow * sz)
    if (r < 1) continue
    const body = t < 0.8 ? "E" : "e", core = warm ? "U" : "L"
    c.circ(x, y, r, body)
    if (r > 2 && t < 0.35) c.circ(x - 1, y - 1, r - 2, core)
  }
  c.ellipse(20, 48, 5, 1, "E"); c.hline(17, 48, 6, warm ? "U" : "L")       // the low bank over the lid
})

// ---------------------------------------------------------------- lamp pools (rows 136-179), key k
// For the scene's light layers: the core under each head, and a wider soft ring. The x 204 lamp's
// pools come and go with it; while it only glows dully, a small soft ring.
const STREET_POOL = (rx, ry, dim) => (c) => STREET_LAMPS.forEach(([, H], i) => {
  const s = STREET_LAMP_STATE(i, c.frame)
  if (s === 2) c.ellipse(H, 168, rx, ry, "k")
  else if (s === 1 && dim) c.ellipse(H, 168, Math.round(rx * 0.5), Math.round(ry * 0.5), "k")
})
anim("street_pools", { w: 320, h: 44, frames: 240, fps: 12 }, layer("pools", { y: -136 }, STREET_POOL(20, 4, false)))
anim("street_pools_soft", { w: 320, h: 44, frames: 240, fps: 12 }, layer("pools", { y: -136 }, STREET_POOL(38, 8, true)))

// ---------------------------------------------------------------- the part as the city places it
// Stand-ins for the other parts (a sky ramp, the strip as a dark block) only to judge contrast.
scene("test_street", { w: 320, h: 180, bg: "h", world: { horizon: 104, eye: 6, light: [-1, -0.45] } },
  layer("standins", grad(0, 0, 320, 112, "NnvVhH"), rect(0, 94, 320, 42, "c"), rect(0, 58, 62, 36, "c")),
  layer("ground", stamp("street_ground", 0, 136)),
  layer("steam", { opacity: 0.45 }, stamp("street_steam", 262, 162)),
  layer("front", stamp("street_front", 0, 30)),
  layer("pools_soft", { light: true, density: 0.5 }, stamp("street_pools_soft", 0, 136)),
  layer("pools", { light: true }, stamp("street_pools", 0, 136)),
  glow("aA", { r: 6, strength: 0.35 }))
