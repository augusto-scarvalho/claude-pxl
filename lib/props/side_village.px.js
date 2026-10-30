// A village's props for a platformer at a 16 px grid (lib/profiles/platformer16.px.js), seen from the side, drawn by
// hand at the 32 px figure's scale to a dusk village's numbers (library F5's village study, numbers only): a well (36
// x 44, 1.4 the figure: a stone ring, two posts, a little roof, a winch, its bucket), a hay cart (64 x 46: a bed of
// planks on two wheels 20 across, hay heaped in straw strokes under a rope), barrels (14 x 18, hoops of iron), a
// hanging sign (an inn's mug on a board under a scrolled iron bracket, stuck out from a wall to its left), a lantern
// post (12 x 48: a post, an arm, a lantern lit warm, the brightest thing of a dusk street). Each its material's
// darkest at its edge (selout), 3 tones a material and its lit edge. The light by the time of day as the ground's:
// vprops.DUSK and vprops.NIGHT map each day color to its new one (a layer's `swap`); the lantern's glass stays lit. For
// any scene: include("<path>/lib/props/side_village.px.js", { as: "vprops" }), its palette its own.
const vprops = {}
// in a block: its names stay its own when a scene includes the file
{
const DAY = {
  e: "#3a2420", w: "#6b4430", W: "#9c6a40", L: "#d09a5c",   // wood (lib/props/side.px.js's)
  j: "#2e2a2c", g: "#5e5852", G: "#7e766c", H: "#a29888",   // stone (the village's)
  i: "#2e2c3a", I: "#5a5870", J: "#8c8aa4",                 // iron
  a: "#6e5420", A: "#a88430", b: "#d8b850", B: "#f0dc88",   // hay: its shade, body, lit, tips
  r: "#8a7050", R: "#5a4630",                               // rope
  y: "#f0a83c", Y: "#ffe08a", Z: "#fff8e0",                 // the lantern's glass, lit from inside
  n: "#22382e", N: "#3a5a46", u: "#b07c28", U: "#f0c050",   // the sign's paint, its gold
}
pal(DAY)
ramps("ewWL", "jgGH", "iIJ", "aAbB", "RR", "yYZ", "nN", "uU")
const TIME = {
  dusk: { e: "#1e1220", w: "#3e2430", W: "#6e3e3c", L: "#b06a50", j: "#1e1426", g: "#3e2838", G: "#5c3a42", H: "#8a5450",
    i: "#120c18", I: "#2c2232", J: "#4e3a4a", a: "#3e2830", A: "#6e4436", b: "#a8664a", B: "#d89060", r: "#6a4444", R: "#3a2430",
    n: "#1a1a2c", N: "#2e2e40", u: "#8a5a3a", U: "#c88a50" },
  night: { e: "#0a0a12", w: "#181a28", W: "#262a3e", L: "#384060", j: "#0c0e18", g: "#1e2234", G: "#2c3248", H: "#424c68",
    i: "#08080e", I: "#1a1a26", J: "#2c2e40", a: "#1a1e2a", A: "#2a3040", b: "#3e4658", B: "#5a6680", r: "#2a2e40", R: "#181a28",
    n: "#0c1218", N: "#162028", u: "#3a3a3a", U: "#5a5a50" },
}
const swapOf = (m) => Object.fromEntries(Object.entries(m).map(([k, v]) => [DAY[k], v]))
const DUSK = swapOf(TIME.dusk), NIGHT = swapOf(TIME.night)
// a vertical stretch of wood w wide: lit on its left, its right the dark, grain dashes in it
const post = (c, x, y, w, h) => { for (let v = 0; v < h; v++) for (let u = 0; u < w; u++) c.px(x + u, y + v, u === w - 1 ? "e" : u === 0 ? "W" : hash(u, (y + v) >> 1, x) < 0.2 ? "e" : "w") }
// ---------------------------------------------------------------- the well
// 36 x 44: a ring of stone 32 wide, 15 tall (courses of 5, its stones' joints closer to its ends: a cylinder; lit on
// its left third, shade on its right), a rim of 2 rows lit on top; two posts 3 px up 24 rows; a gable of planks 36
// wide over them; a winch (a log 3 px, its end lit) between the posts, a rope down to a bucket 6 x 5.
sprite("well", { w: 36, h: 44, pivot: "bottom" }, (c) => {
  for (let y = 29; y < 44; y++) for (let x = 2; x < 34; x++) {
    const t = (x - 2) / 31, a = Math.acos(1 - 2 * t), col = Math.floor(a * 3.2 + ((y - 29) % 10 < 5 ? 0 : 0.5)), v = (y - 29) % 5
    const jt = v === 4 || Math.abs(a * 3.2 + ((y - 29) % 10 < 5 ? 0 : 0.5) - col) < 0.12
    c.px(x, y, x === 2 || x === 33 ? "j" : jt ? "j" : v === 0 ? (t < 0.6 ? "H" : "G") : t < 0.3 ? "G" : t < 0.7 ? (hash(x, y) < 0.15 ? "g" : "G") : "g")
  }
  c.rect(1, 27, 34, 1, "H"); c.rect(1, 28, 34, 1, "g"); c.px(1, 28, "j"); c.px(34, 28, "j")
  post(c, 4, 6, 3, 21); post(c, 29, 6, 3, 21)
  for (let y = 0; y < 8; y++) { const hw = 3 + y * 2; for (let x = 18 - hw; x < 18 + hw; x++) c.px(x, y + 1, y === 7 ? "e" : Math.abs(x - 18) >= hw - 1 ? "e" : (x + y) % 5 === 0 ? "w" : y < 3 ? "L" : "W") }
  c.rect(7, 12, 22, 3, "w"); c.rect(7, 12, 22, 1, "W"); c.rect(7, 14, 22, 1, "e")                       // the winch
  c.px(32, 12, "I"); c.px(33, 13, "I"); c.px(33, 14, "i"); c.px(34, 15, "i")                           // its crank
  for (let y = 15; y < 21; y++) c.px(17, y, y % 2 ? "r" : "R")
  c.rect(15, 21, 6, 5, "w"); c.rect(15, 21, 6, 1, "W"); c.rect(15, 23, 6, 1, "i"); c.rect(15, 25, 6, 1, "e"); c.px(15, 22, "W"); c.px(20, 22, "e")
})
card("well", { is: "a village well side on, 36 x 44: a ring of stone lit on its left, two posts, a little roof of planks, a winch and its rope down to a bucket", cells: { "side/16": "✎" } })
// ---------------------------------------------------------------- the hay cart
// 64 x 46: two wheels 20 across (a rim of 2 px, its lit arc on the upper left, 8 spokes, an iron hub), a bed of three
// planks 54 wide on them (lit top, dark under), slats along its side; the hay heaped over it, 50 wide and 20 tall,
// in strokes of straw 2-4 px slanting (the lit on its upper left, its tips paler, the shade low and to the right),
// a rope across it; the shafts down to its left, resting on a block of wood.
sprite("hay_cart", { w: 64, h: 46, pivot: "bottom" }, (c) => {
  // the hay
  for (let y = 4; y < 26; y++) for (let x = 9; x < 61; x++) {
    const dx = (x - 35) / 26, dy = (y - 25) / 21
    if (dx * dx + dy * dy > 1 + (hash(x, 3, 4) - 0.5) * 0.12) continue
    const s = dx * 0.5 + (1 + dy) * 0.6 - 0.4, stroke = (x + Math.floor(y / 2)) % 4, r = hash(x >> 1, y, 5)
    const edge = (((x + 1 - 35) / 26) ** 2 + dy * dy > 1) || (dx * dx + ((y - 1 - 25) / 21) ** 2 > 1)
    c.px(x, y, edge ? (s > 0.3 ? "a" : "A") : stroke === 0 ? (s > 0.2 ? "a" : "A") : s < -0.15 ? (r < 0.3 ? "B" : "b") : s < 0.3 ? (r < 0.2 ? "b" : "A") : "a")
  }
  for (let x = 12; x < 59; x++) { const y = Math.round(10 + ((x - 35) / 23) ** 2 * 14); c.px(x, y, "R"); c.px(x, y - 1, "r") }   // the rope
  // the bed and its slats
  c.rect(8, 25, 54, 8, "w"); c.rect(8, 25, 54, 1, "L"); c.rect(8, 26, 54, 1, "W"); c.rect(8, 32, 54, 1, "e"); c.rect(8, 29, 54, 1, "e")
  for (let x = 10; x < 62; x += 8) c.rect(x, 25, 1, 8, "e")
  c.rect(8, 25, 1, 8, "e"); c.rect(61, 25, 1, 8, "e")
  // the shafts and their block
  c.line(0, 38, 9, 29, "w"); c.line(1, 38, 10, 29, "e"); c.rect(0, 39, 6, 6, "e"); c.rect(1, 39, 4, 5, "w"); c.rect(1, 39, 4, 1, "W")
  // the wheels
  for (const cx of [20, 50]) {
    const cy = 35
    for (let y = cy - 10; y <= cy + 10; y++) for (let x = cx - 10; x <= cx + 10; x++) {
      const d = Math.hypot(x - cx, y - cy), a = Math.atan2(y - cy, x - cx)
      if (d > 10.4) continue
      if (d > 8.4) c.px(x, y, d > 9.6 ? "e" : a < -0.6 && a > -2.6 ? "W" : "w")
      else if (d < 2.4) c.px(x, y, d < 1.2 ? "J" : "i")
      else if (Math.abs(((a + Math.PI) * 4) / Math.PI % 1 - 0.5) > 0.42 - 0.6 / d) c.px(x, y, a < 0 ? "W" : "w")
    }
  }
})
card("hay_cart", { is: "a hay cart side on, 64 x 46: hay heaped in straw strokes under a rope, a bed of planks on two wheels with spokes and iron hubs, its shafts on a block", cells: { "side/16": "✎" } })
// ---------------------------------------------------------------- barrels
// 14 x 18: staves 2-3 px, bulging 1 px at the middle, two hoops of iron; set apart from a wall behind it by value: a
// lit rim along its top, its first stave lit down its left (the light), its hoops lit on the left, the shade on its
// right third and a dark band at its foot (its contact shadow)
sprite("barrel", { w: 14, h: 18, pivot: "bottom" }, (c) => {
  for (let y = 0; y < 18; y++) {
    const bulge = y > 3 && y < 14 ? 1 : 0, x0 = 1 - bulge, x1 = 12 + bulge
    for (let x = x0; x <= x1; x++) {
      const t = (x - x0) / (x1 - x0), hoop = y === 3 || y === 4 || y === 13 || y === 14
      c.px(x, y, x === x0 || x === x1 || y === 17 ? "e" : y === 0 ? (t < 0.7 ? "L" : "W") : y === 1 ? "e" : y === 16 ? "e" : hoop ? (y === 3 || y === 13 ? (t < 0.5 ? "J" : "I") : "i") : x === x0 + 1 ? "L" : (x - x0) % 3 === 0 ? "e" : t < 0.4 ? "W" : t < 0.75 ? "w" : (hash(x, y) < 0.3 ? "e" : "w"))
    }
  }
})
card("barrel", { is: "a barrel, 14 x 18: staves lit on the left, a lit rim along its top, bulging at the middle, two hoops of iron, a dark foot", cells: { "side/16": "✎" } })
// ---------------------------------------------------------------- the hanging sign
// 24 x 24, its left edge on a wall (pivot its upper left): an iron bracket 22 out (a bar lit on top, a scroll under
// it curling back to the wall), two short chains, a board 14 x 11 painted green in a frame of wood, an inn's mug
// on it in gold
sprite("sign", { w: 24, h: 24, pivot: [0, 0] }, (c) => {
  c.rect(0, 1, 23, 2, "i"); c.rect(0, 1, 23, 1, "I"); c.rect(0, 0, 2, 9, "i")
  for (const [x, y] of [[3, 4], [4, 5], [5, 6], [6, 6], [7, 5], [8, 4], [7, 3]]) c.px(x, y, "i")   // the scroll
  for (const x of [8, 19]) for (let y = 3; y < 8; y++) c.px(x, y, y % 2 ? "I" : "i")
  c.rect(6, 8, 16, 13, "e"); c.rect(7, 9, 14, 11, "n"); c.rect(7, 9, 14, 1, "W"); c.rect(7, 9, 1, 11, "W"); c.rect(8, 10, 12, 9, "N")
  c.rect(11, 12, 5, 6, "u"); c.rect(11, 12, 4, 1, "U"); c.rect(11, 12, 1, 6, "U"); c.rect(16, 13, 2, 1, "u"); c.rect(17, 14, 1, 2, "u"); c.rect(16, 16, 2, 1, "u")   // the mug
  c.rect(11, 11, 5, 1, "B")   // its froth
})
card("sign", { is: "an inn's hanging sign, 24 x 24: a board painted green with a gold mug, on two chains from a scrolled iron bracket; its pivot the upper left, against a wall", cells: { "side/16": "✎" } })
// ---------------------------------------------------------------- the lantern post
// 14 x 48 (1.5 the figure): a post 3 px on a foot of stone, an iron arm 9 px out at its top with a curl, a lantern
// 7 x 10 hanging from it (a cap, bars of iron round a warm glass, the flame's heart the brightest pixel: lit at every
// time of day), its line the iron's darkest
sprite("lantern_post", { w: 14, h: 48, pivot: "bottom" }, (c) => {
  post(c, 2, 4, 3, 40); c.rect(0, 44, 7, 4, "g"); c.rect(0, 44, 7, 1, "H"); c.rect(0, 47, 7, 1, "j")
  c.rect(1, 2, 12, 2, "i"); c.rect(1, 2, 12, 1, "I"); c.px(12, 4, "i"); for (const [x, y] of [[5, 4], [6, 5], [7, 5]]) c.px(x, y, "i")
  c.px(10, 4, "i"); c.rect(8, 5, 5, 2, "i"); c.rect(8, 5, 5, 1, "I")
  c.rect(7, 7, 7, 8, "i"); c.rect(8, 7, 5, 7, "y"); c.rect(9, 8, 3, 5, "Y"); c.px(10, 10, "Z"); c.px(10, 9, "Z")
  c.rect(8, 14, 5, 1, "i"); c.rect(9, 15, 3, 1, "i")
})
card("lantern_post", { is: "a lantern post, 14 x 48: a wooden post on a stone foot, an iron arm with a curl, a lantern lit warm hanging from it", cells: { "side/16": "✎" } })
Object.assign(vprops, { DUSK, NIGHT, TIME })
}
