// Night City at dusk: a sun-bleached Californian megacity as its lights come on. Brutalist blocks and
// corporate towers in dusty haze, an elevated freeway, a strip of shops with billboards and a holo-ad,
// traffic and people on the street. The sun sets behind the towers at the upper left; the street is in
// shade, lit by the teal sky and the sodium lamps coming on. 320x180, 12 fps, 240 frames (20 s loop).
// Each part is drawn in its own file (plan.md); this file only places them and lights them.
// Off the palette on purpose: the haze veil, the holo and the steam are translucent, and lighting()
// and glow() multiply and spill color.
include("palette.px.js", { palette: true })
include("part_sky.px.js")
include("part_towers.px.js")
include("part_freeway.px.js")
include("part_strip.px.js")
include("part_signs.px.js")
include("part_street.px.js")
include("part_traffic.px.js")
include("part_crowd.px.js")

// The lights, in scene coordinates: [x, y, reach, color, power]. Each one that comes on during the
// loop asks its part's own cue, so the light on the walls follows the bulb.
const CITY_SODIUM = "#ffb45a", CITY_TUBE = "#d6f0dc", CITY_WARM = "#f0c878", CITY_TEAL = "#5fd0b4", CITY_NEON = "#ff5a3c"
const CITY_LIGHTS = (f) => [
  // the low sun, behind the haze: what stands near it takes its glare, the far street doesn't
  [28, 46, 230, "#ffe2a8", 1],
  // sodium streetlights (the x 204 one is warming up, or out): cobra heads throw their light down, so
  // a little round the head and most of it on the road below, reaching the far sidewalk's shopfronts
  ...STREET_LAMPS.flatMap(([, H], i) => {
    const s = STREET_LAMP_STATE(i, f)
    return [[H, 79, 14, CITY_SODIUM, [0, 0.4, 1][s]], [H, 160, 52, CITY_SODIUM, [0, 0.35, 1.1][s]]]
  }),
  // freeway lamps on the parapet
  ...FREEWAY_POSTS.map((P) => [P + 4, 66, 20, CITY_SODIUM, [0, 0.3, 0.6, 0.9][FREEWAY_LAMP(P, f)]]),
  // the billboard's floods, the pole sign's bulbs and letters
  [76, 81, 26, CITY_SODIUM, 0.8], [102, 81, 26, CITY_SODIUM, 0.8],
  [146, 60, 24, CITY_SODIUM, 0.7], [147, 73, 22, CITY_NEON, SIGNS_PARK_ON(f, 3) ? 0.6 : 0],
  // shop interiors spilling out over the far sidewalk
  [22, 128, 24, CITY_WARM, 0.7], [82, 126, 30, CITY_WARM, 0.9], [192, 126, 38, CITY_TUBE, 0.9],
  [260, 126, 34, CITY_TUBE, 0.9], [300, 126, 20, CITY_TEAL, 0.6],
  // neon and holo
  [279, 96, 20, CITY_NEON, f >= 150 && f <= 170 ? 0 : 0.6], [191, 116, 18, CITY_NEON, SIGNS_OPEN_ON(f) ? 0.6 : 0],
  [201, 78, 40, CITY_TEAL, 0.6],
  // the barrel fire under the freeway
  [151, 118, 14, "#ff9040", 0.8],
].filter((l) => l[4] > 0)

scene("cyberpunk_city", { w: 320, h: 180, bg: "h", world: { horizon: 104, eye: 6, light: [-1, -0.45] } },
  layer("sky", { unlit: true }, stamp("sky_bg", 0, 0)),
  layer("towers", { unlit: true }, stamp("towers_skyline", 0, 12)),
  layer("freeway", stamp("freeway_deck", 0, 58)),
  // dust lying low over the freeway's feet
  layer("haze", { opacity: 0.3, unlit: true }, rect(0, 98, 320, 26, "h")),
  layer("ground", stamp("street_ground", 0, 136)),
  layer("strip", stamp("strip_row", 0, 40)),
  layer("signs", stamp("signs_billboard", 90, 94), stamp("signs_pylon", 146, 132), stamp("signs_blade", 274, 80),
    stamp("signs_neons", 0, 104)),
  layer("holo", { opacity: 0.85, unlit: true }, stamp("signs_holo", 201, 110)),
  // contact shadows and headlight light land on the ground before anything stands on it
  layer("shadows", { shade: 2 }, stamp("traffic_shadow", 0, 128), stamp("crowd_shadow", 0, 124)),
  layer("beams", { light: true, density: 0.5 }, stamp("traffic_beams", 0, 128)),
  layer("far", stamp("crowd_far", 0, 124)),
  layer("cars", stamp("traffic_cars", 0, 128)),
  layer("steam", { opacity: 0.45 }, stamp("street_steam", 262, 162)),
  layer("front", stamp("street_front", 0, 30)),
  layer("near", stamp("crowd_near", 0, 150)),
  // the sodium lamps' pools light the ground and whoever passes through them
  layer("pools_soft", { light: true, density: 0.5 }, stamp("street_pools_soft", 0, 136)),
  layer("pools", { light: true }, stamp("street_pools", 0, 136)),
  (c) => CITY_LIGHTS(c.frame).forEach(([x, y, r, color, power]) => c.lamp(x, y, { r, color, power })),
  lighting({ cell: 2, smooth: true, ambient: 0.82, ambientColor: "#c4d6cc", emit: "WOoaAwiZzxpP" }),
  glow("W", { r: 16, strength: 0.3 }),
  glow("aA", { r: 6, strength: 0.35 }),
  glow("zx", { r: 5, strength: 0.3 }),
  glow("pP", { r: 4, strength: 0.35, keep: "K" }),            // the boards behind the tubes stay black: the letters read
  glow("wi", { r: 2, strength: 0.15 }))
