// A tournament: two knights meet on foot in the lists, the blue one (the rig, facing right) and the
// red one (the same rig turned, its colors swapped), each with the shield on its left arm and the
// sword in its right hand. Behind them the lists' palisade, the grandstand under a striped canopy
// with the crowd on its tiers, the pavilions with their pennants, a castle on the hill. Daylight
// from the top right, as the knights are lit. The ground is seen in perspective: the horizon at
// y 104 and the eye 1.6 m up make 40 px to the meter where the knights stand (y 168), so their
// 1.8 m is 72 px, and everything with a height is checked against it by pxl describe.
include("knight.px.js", { palette: true })
pal({
  A: "#3a6ea8", B: "#5b92c8", C: "#8cbbe2", D: "#c6e2f2",                 // sky, top down
  E: "#f4f8fb", F: "#c4d4e4",                                              // clouds
  G: "#7d9cb4", H: "#5e8098", I: "#4a6a64",                               // far hills, haze
  i: "#2c5a32", g: "#3e7a3a", h: "#5e9a48", l: "#8cbc5a",                 // grass
  S: "#5e6470", s: "#8a909c", U: "#c4c8d0",                               // castle stone
  f: "#8a6a3e", b: "#a8844e", a: "#c8a46a", d: "#e2c88e",                 // sand
  W: "#c08a50",                                                            // wood, sunlit
  n: "#1e4a2a", N: "#2e7a3e", m: "#56aa5a",                               // green cloth
  y: "#b88a1e", Z: "#f2d24a",                                              // yellow cloth
  c: "#e8e2d4", v: "#b8b0a0",                                              // white cloth
  j: "#e2aa7c", J: "#b47a52", z: "#3a2418",                               // skin, hair
})
ramps("ABCD", "FE", "IHG", "ighl", "SsU", "fbad", "tTLW", "nNm", "yZ", "vc", "Jj")

const W = 320, H = 180, HZ = 104, EYE = 1.6, LIGHT = [0.6, -1]
const ppm = (y) => (y - HZ) / EYE                       // px per meter on the ground at row y
const FEET = 168                                        // where the knights stand

// ---------------------------------------------------------------- sky and the far land
const sky = [
  grad(0, 0, W, HZ, "ABCD"),
  ...[[40, 18, 30, 4], [70, 22, 22, 3], [196, 12, 34, 4], [230, 16, 20, 3], [120, 40, 26, 3]].flatMap(([x, y, rx, ry]) =>
    [ellipse(x, y, rx, ry, "E"), ellipse(x + 4, y + 2, rx - 6, ry - 1, "F"), hline(x - rx + 4, y + ry, 2 * rx - 8, "F")]),
]
const hills = [
  poly([0, 98, 40, 92, 90, 95, 150, 90, 210, 94, 250, 86, 290, 84, 320, 90, 320, HZ, 0, HZ], "G"),
  poly([0, 101, 60, 98, 130, 100, 200, 97, 260, 99, 320, 96, 320, HZ, 0, HZ], "H"),
]
// a castle on the far hill to the right: a curtain wall between two towers, the keep behind, its
// pennants; lit from the right
sprite("castle", { w: 52, h: 34, pivot: "bottom" },
  rect(14, 10, 14, 24, "S"), rect(16, 4, 10, 30, "S"),                                  // keep
  rect(4, 14, 44, 20, "s"), rect(0, 8, 10, 26, "s"), rect(42, 6, 10, 28, "s"),          // wall, towers
  ...[0, 3, 6].map((x) => rect(x, 6, 2, 2, "s")), ...[42, 45, 48].map((x) => rect(x, 4, 2, 2, "s")),
  ...[16, 19, 22].map((x) => rect(x, 2, 2, 2, "S")),
  vline(9, 8, 26, "U"), vline(51, 6, 28, "U"), vline(47, 14, 20, "U"),                  // lit sides
  rect(22, 24, 6, 10, "S"), ellipse(25, 24, 3, 2, "S"),                                 // gate
  ...[[5, 18], [46, 16], [20, 12], [30, 20]].map(([x, y]) => rect(x, y, 1, 2, "S")),    // windows
  vline(46, 0, 5, "S"), poly([47, 0, 51, 1, 47, 2], "R"))                               // the banner
const far = [...hills, stamp("castle", 274, 99)]

// ---------------------------------------------------------------- the field
const field = [
  grad(0, HZ, W, 28, "hg"),
  grad(0, 132, W, H - 132, "ad"),
]

// ---------------------------------------------------------------- the grandstand
// Tiers of benches under a canopy striped blue and white, the lord's box in the middle under a
// banner, posts of sunlit wood. At y 122 a meter is 11 px: the stand is 3.6 m to the canopy.
const STAND_W = 150, STAND_H = 46
sprite("grandstand", { w: STAND_W, h: STAND_H, pivot: "bottom", outline: "k", height: 4.1 },
  // the tiers: three benches stepping back and up, their fronts in shade (the light is behind and above)
  ...[0, 1, 2].map((i) => rect(4, 30 - i * 7, STAND_W - 8, 7, "T")),
  ...[0, 1, 2].map((i) => hline(4, 30 - i * 7, STAND_W - 8, "W")),
  rect(4, 37, STAND_W - 8, 9, "t"),                                                    // under the tiers
  // posts and the canopy
  ...[4, 40, 75, 110, STAND_W - 6].map((x) => rect(x, 6, 2, 40, "L")),
  ...[...Array(15).keys()].map((i) => rect(2 + i * 10, 0, 10, 6, i % 2 ? "c" : "e")),
  hline(2, 6, STAND_W - 4, "q"),
  ...[...Array(15).keys()].map((i) => poly([2 + i * 10, 6, 12 + i * 10, 6, 7 + i * 10, 9], i % 2 ? "v" : "w")),   // scalloped edge
  // the lord's box: a red cloth over its rail
  rect(64, 24, 22, 6, "r"), hline(64, 24, 22, "R"))// the crowd: small figures on the benches, a head and shoulders above the bench in front; they
// cheer in turn (an arm up)
const CROWD = ["w", "r", "N", "y", "c", "T", "e", "R", "m", "Z"]
anim("fan", { w: 5, h: 8, frames: 4, fps: 4, pivot: "bottom" }, (c) => {
  c.rect(1, 3, 3, 5, "w"); c.rect(1, 0, 3, 3, "j"); c.hline(1, 0, 3, "z"); c.px(1, 1, "z")
  if (c.frame === 1) { c.vline(4, 0, 4, "w"); c.px(4, 0, "j") }
  if (c.frame === 3) { c.vline(0, 0, 4, "w"); c.px(0, 0, "j") }
})
const crowd = []
for (let t = 0; t < 3; t++) for (let x = 8; x < STAND_W - 8; x += 6) {
  if (t === 0 && x > 60 && x < 90) continue                                             // the lord's box
  const k = (x * 7 + t * 3) % CROWD.length
  const hair = ["z", "T", "L", "y", "c", "w", "r"][(x * 3 + t) % 7]                     // hair, a hood or a hat
  crowd.push(stamp("fan", x, 31 - t * 7, { swap: { w: CROWD[k], j: k % 3 ? "j" : "J", z: hair }, rdelay: true, seed: x + t * 100 }))
}
// heraldic banners hanging from the canopy's edge in front of the crowd: the blue knight's and the
// red knight's, each with a gold cross
const BANNERS = [[20, "w", "e"], [56, "r", "R"], [92, "w", "e"], [128, "r", "R"]].flatMap(([x, c, l]) => [
  poly([x, 9, x + 8, 9, x + 8, 20, x + 4, 23, x, 20], c), vline(x + 7, 9, 12, l), hline(x, 9, 9, "k"),
  rect(x + 3, 11, 2, 8, "Z"), rect(x + 1, 13, 6, 2, "Z")])
sprite("stand_full", { w: STAND_W, h: STAND_H, pivot: "bottom", height: 4.1 }, stamp("grandstand", STAND_W / 2, STAND_H), ...crowd, ...BANNERS)
// a herald's trumpeter in a red and gold tabard, the trumpet raised toward the lists with its banner
// hanging; 1.7 m, so 18 px where the stand stands
sprite("trumpeter", { w: 12, h: 18, pivot: [4, 18], outline: "k", facing: "right", height: 1.7, sockets: { front: [12, 2] } },
  rect(2, 2, 4, 4, "j"), rect(2, 1, 4, 2, "Z"), px(5, 3, "z"),                         // face, cap
  rect(1, 6, 6, 7, "r"), rect(1, 6, 3, 7, "y"), hline(1, 12, 6, "Z"),                 // tabard, quartered
  rect(2, 13, 2, 5, "q"), rect(5, 13, 2, 5, "q"),                                      // legs
  line(6, 4, 11, 1, "Z"), px(11, 0, "Z"), px(11, 2, "Z"),                              // the trumpet
  poly([7, 4, 10, 3, 10, 7, 8, 8], "r"), px(8, 5, "Z"))                                // its banner

// ---------------------------------------------------------------- pavilions
// round tents striped in a knight's colors, a pennant on the pole, flapping in the breeze from the
// left; lit from the right
anim("pennant_t", { w: 10, h: 5, frames: 8, fps: 8 }, (c) => {
  const k = c.phase * Math.PI * 2
  for (let x = 0; x < 9; x++) { const dy = Math.round(Math.sin(k - x * 0.7) * (x / 8)); c.vline(x, 1 + dy, Math.max(1, 3 - Math.floor(x / 3)), x > 5 ? "Z" : "y") }
})
const pavilion = (name, a, b) => sprite(name, { w: 34, h: 44, pivot: "bottom", outline: "k", height: 4.2 },
  ...[...Array(6).keys()].map((i) => clip([2, 14, 32, 14, 33, 43, 1, 43], rect(1 + i * 6, 14, 6, 30, i % 2 ? b : a))),
  ...[...Array(6).keys()].map((i) => clip([17, 2, 33, 15, 1, 15], poly([17, 2, 4 + i * 5, 15, 9 + i * 5, 15], i % 2 ? b : a))),
  poly([12, 43, 17, 22, 22, 43], "t"),                                                  // the door, open
  vline(17, 0, 3, "L"), relight([1, 2, 33, 42], { light: LIGHT, reach: 2 }))
pavilion("pavilion_blue", "w", "c")
pavilion("pavilion_red", "r", "c")
sprite("pavilion_set", { w: 34, h: 50, pivot: "bottom", height: 4.5 }, stamp("pavilion_blue", 17, 50), stamp("pennant_t", 17, 2, { rdelay: true }))

// ---------------------------------------------------------------- the lists' palisade
// a rail of planks on posts, painted, between the field and the sand where the knights fight
// 0.9 m high on row 132, so 16 px; its wood paled toward the sand's tones by the distance
sprite("palisade", { w: 14, h: 16, wrap: "x" },
  rect(0, 3, 14, 4, "a"), rect(0, 9, 14, 4, "a"), hline(0, 6, 14, "b"), hline(0, 12, 14, "b"),
  hline(0, 3, 14, "d"), hline(0, 9, 14, "d"), rect(5, 0, 2, 16, "b"), vline(6, 0, 16, "a"), rect(5, 0, 2, 1, "d"))

// ---------------------------------------------------------------- the marshal
// the tournament's marshal, between the two and a little behind, facing us: a red chaperon, a
// tabard quartered in both knights' colors, his right hand (our left) holding the white baton up;
// when it drops, they fight. 1.65 m on row 140 is 37 px
sprite("marshal", { w: 15, h: 37, pivot: [7, 37], outline: "k", selout: true, facing: "front", height: 1.65 },
  vline(1, 0, 8, "c"), rect(1, 7, 2, 2, "j"), rect(1, 9, 2, 8, "c"),                   // baton, hand, raised sleeve
  ellipse(7, 12, 3, 3, "j"), px(6, 12, "z"), px(8, 12, "z"), hline(6, 14, 3, "J"),     // face
  ellipse(7, 9, 4, 2, "r"), hline(3, 10, 9, "R"),                                       // chaperon
  rect(6, 15, 3, 1, "J"),                                                               // neck
  rect(3, 16, 4, 13, "w"), rect(8, 16, 4, 13, "r"), vline(7, 16, 13, "Z"), hline(3, 28, 9, "Z"),   // tabard
  rect(12, 17, 2, 8, "c"), rect(12, 25, 2, 2, "j"),                                     // the other arm, down
  rect(4, 29, 3, 6, "q"), rect(8, 29, 3, 6, "q"), rect(3, 35, 4, 2, "t"), rect(8, 35, 4, 2, "t"),   // hose, shoes
  relight([3, 7, 11, 22], { light: LIGHT, reach: 1 }))

// ---------------------------------------------------------------- the two knights
// the red one: the same turned rig, its surcoat and shield field red, its cape blue
const RED = { q: "x", w: "r", e: "R", x: "q", r: "w", R: "e" }
const KNIGHTS = [["knight", 112, {}], ["knight_l", 210, { swap: RED }]]
// their shadows: the sun high at the top right lays them short, to the left and toward us
const knights = KNIGHTS.map(([n, x, o]) => stamp(n, x, FEET, o))
const shadows = [...KNIGHTS.map(([n, x, o]) => stamp(n, x, FEET, { ...o, cast: [-0.45, 0.1], silhouette: "k" })),
  stamp("marshal", 160, 140, { cast: [-0.45, 0.1], silhouette: "k" })]
// the sand: trampled darker along the palisade's foot, scuffed where the knights have been
// shifting their feet, a few straws blown in
const sand = [
  hline(0, 133, W, "b"), ...[...Array(40).keys()].map((i) => px((i * 83) % W, 134 + (i % 2), "b")),
  ...[[96, 166, 6], [104, 169, 5], [124, 167, 4], [196, 168, 5], [216, 166, 6], [224, 170, 4], [160, 172, 7], [150, 163, 3]].map(([x, y, n]) => hline(x, y, n, "b")),
  ...[[92, 165], [130, 170], [204, 171], [230, 165], [168, 175]].map(([x, y]) => px(x, y, "d")),
  ...[[40, 160, 4, -1], [270, 172, 5, 1], [150, 156, 3, 1], [60, 176, 4, 1]].map(([x, y, n, d]) => line(x, y, x + n, y + d, "Z")),
]

scene("tournament", { w: W, h: H, bg: "A", world: { horizon: HZ, eye: EYE, light: LIGHT } },
  layer("sky", ...sky),
  layer("far", ...far),
  layer("field", ...field, ...sand),
  layer("stands", { sort: "y" }, stamp("stand_full", 92, 122), stamp("trumpeter", 14, 122), stamp("trumpeter", 184, 122, { flip: "x" }),
    stamp("pavilion_set", 214, 121), stamp("pavilion_set", 258, 121, { swap: { w: "r" } }), stamp("pavilion_set", 300, 121)),
  layer("lists", tile("palisade", 0, 117, 23, 1)),
  layer("shadows", { shade: true }, ...shadows,
    ...[["stand_full", 92], ["pavilion_set", 214], ["pavilion_set", 258], ["pavilion_set", 300]].map(([n, x]) =>
      stamp(n, x, n === "stand_full" ? 122 : 121, { cast: [-0.45, 0.1], silhouette: "k" }))),
  layer("knights", { sort: "y" }, stamp("marshal", 160, 140), ...knights))
