// HD-2D: a harbor in the afternoon, a galleon moored along a pier, as Octopath Traveler II lays one
// out. Measured on the reference (figure heights, rows, plank and crate foreshortening): a camera 22
// degrees down through a 30-degree lens, the ship's near side square to it, 17 px to the meter so the
// frame holds what the reference's does round 34 px figures; everything laid a texel to a sprite's
// pixel. The galleon bobbing at the pier, the pier on two levels, the water, rowboats, the crane,
// cargo, mooring lines, gulls, a lighthouse, the awning, the crew at work (lib/characters/crew.px.js),
// and Alden's passage aboard, with a talk in parchment dialogue boxes. `harbor` is the art at its own
// size, the one checked; `harbor_md` the same twice as big through post(); `harbor_clip` its middle, for
// the gallery.
include("../../lib/characters/crew.px.js", { as: "crew" })   // the traveler, the mourner and the crew (it includes the traveler)
include("../../lib/profiles/hd2d.px.js")   // its lamps (lib/props/lamps.px.js): the ship's lanterns
include("../../lib/props/crates.px.js", { as: "crates" })    // the crates' faces and the barrels
include("../../lib/ui/font5x7.px.js")
include("../../lib/ui/dialog.px.js", { as: "dialog" })     // the dialogue boxes

pal({
  k: "#1d1410",                                                   // outline, the deepest gaps
  // water: the deep, the troughs, the body, the lit ripples, the crests, the sun's glints (they give light)
  a: "#0d2236", b: "#163a58", c: "#215579", d: "#3b7ea5", e: "#9ad0e2", f: "#fff7de",
  // the hull's pale planks: seam, shade, plank, lit edge; wet and green near the waterline
  g: "#5a4632", h: "#9a8262", i: "#c4ad86", j: "#e4d4ae", G: "#2f3428", H: "#5e6048",
  // dark wood: the pier, rails, masts, pilings
  l: "#2e1e14", m: "#4f3320", n: "#74502f", o: "#9c7244", O: "#c49c64",
  // the red band and its gold
  p: "#3f0c10", q: "#741820", r: "#a52a32", s: "#b8892e", t: "#f0d077",
  // white: balusters, lanterns
  u: "#7d776c", v: "#bdb6a6", w: "#f2ecdd",
  // canvas
  x: "#7e7564", y: "#d3c8ad", z: "#e9dfc6",
  // far off in the haze
  A: "#7f97a6", B: "#b6c7cf",
  // burlap, golden; the lighthouse's rock
  C: "#7a5a30", D: "#b08a4a", E: "#d8b874", L: "#3c3a42", N: "#625e62", P: "#958e86",
  // wood between its tones (each plank its own); the hull's darker strakes; the canvas from its cool
  // hollow to its sunlit belly
  F: "#66432a", T: "#876039", V: "#ae9774", I: "#6c7480", J: "#a3a6a4",
})
ramps("abcdef", "GgHhVij", "klmFnToO", "pqr", "st", "uvw", "IJyz", "AB", "CDE", "LNP")

// The camera: 17 px to the meter where it looks (the reference's frame, its figures 34 px instead of
// 24), 22 degrees down, 30 across. Z: the ground (the water) in the picture's middle; every z below is
// from there, every x from the middle, u up from the water.
const W = 480, H = 270, PPM = 17, CAM = perspective({ w: W, h: H, pitch: -22, fov: 30, ppm: PPM }), Z = CAM.z, DIST = CAM.dist
const M = model()
const LOWER = 0.6, UPPER = 1.6                                      // the pier's two decks above the water
const MS = 100, LOOP = 96, SAILF = 16                                           // the clock: the water's 8 frames twice, the sails' one sway

// ---------------------------------------------------------------- textures, a texel to a sprite's pixel
// laid with texel "screen": CAM.floor on floors (a texel 1/17 m across, 0.157 m away) and CAM.wall on walls
// (0.063 m down), the hull's and the boats' too (their faces turning past 45 degrees take the other); the
// deck across keeps the floor's by hand (on its steep faces the wall's made a dark band); the red band and
// the rails 0.06 m, so their 20 rows are the castle's 1.2 m exactly.
const BANDT = [1 / PPM, 0.06]
// The hull's planks: strakes 4 px over a line of tar, each strake its own shade, the grain in broken
// lines along it (runs of 5 px a step darker), butt joints staggered strake to strake with a pair of
// treenails either side; the top a dark cap rail, a dark wale under it; at the waterline the wood wet,
// dark and green, the algae climbing higher in streaks here and there. World-laid: a row is the same
// height on the hull all along (50 rows: the waterline at row 0).
const hullTex = (name, marks) => sprite(name, { w: 40, h: 50 }, (c) => {
  for (let Y = 0; Y < 50; Y++) for (let X = 0; X < 40; X++) {
    const u = Y < 10 ? -(Y + 0.5) * CAM.wall[1] : (50 - Y - 0.5) * CAM.wall[1], s = Math.floor(Y / 5), r = Y % 5
    const base = hash(s, 21) < 0.3 ? "V" : "i", dark = base === "V" ? "h" : "V", jx = (X - Math.floor(hash(s, 3) * 40) + 80) % 20
    let k = r === 4 ? "k" : jx === 0 && r < 4 ? "k" : r === 0 ? "j" : (jx === 2 || jx === 18) && (r === 1 || r === 3) ? "g" : hash(Math.floor((X + hash(s, 22) * 5) / 5), Y) < 0.22 ? dark : base
    if (marks && (u < 0.32 + 0.22 * hash(X >> 2, 31) || (u < 0.7 && hash(X, 33) < 0.12))) k = { j: "H", i: "H", V: "G", h: "G", g: "G", k: "k" }[k]
    if (marks && u > 1.85 && u < 2.08) k = u > 2.02 ? "o" : hash(X >> 2, 35) < 0.3 ? "l" : "m"
    if (marks && u > 2.27) k = u > 2.34 ? "O" : "n"
    c.px(X, Y, k)
  }
})
hullTex("_hull", true)
hullTex("_planks_pale", false)
// A gun port: its frame lit at the top and left, the dark inside, the lid's lower edge over it.
sprite("_port", { w: 9, h: 7 }, (c) => {
  for (let Y = 0; Y < 7; Y++) for (let X = 0; X < 9; X++)
    c.px(X, Y, Y === 0 ? "m" : X === 0 || Y === 1 ? "o" : X === 8 || Y === 6 ? "l" : X === 1 || X === 7 || Y === 5 ? "n" : Y === 2 ? "l" : "k")
})
// The red band of the castles: a dark cap, a lit molding, a gold line; the red field with a gold
// ornament every 24 px (1.4 m), its shadow a darker red under and right of it; a gold line, a molding.
const ORN = ["....t....", "...tst...", "..t.s.t..", ".ts.s.st.", "tst.s.tst", ".ts.s.st.", "..tssst..", "....s....", "...sss...", "..s.s.s.."]
sprite("_band", { w: 24, h: 20 }, (c) => {
  const orn = (X, Y) => ORN[Y - 5]?.[X - 8] ?? "."
  for (let Y = 0; Y < 20; Y++) for (let X = 0; X < 24; X++) {
    const o = orn(X, Y)
    const k = ["l", "o", "n", "s"][Y] ?? (Y >= 16 ? ["s", "q", "n", "l"][Y - 16] : o !== "." ? o : orn(X - 1, Y - 1) !== "." ? "q" : "r")
    c.px(X, Y, k)
  }
})
// White balusters, turned (a bulge at a third and two thirds), under a cap rail, over a foot rail;
// between them clear (the deck shows through). 12 rows, 0.72 m.
sprite("_bal", { w: 4, h: 12 }, (c) => {
  for (let Y = 0; Y < 12; Y++) for (let X = 0; X < 4; X++) {
    const k = Y === 0 ? "w" : Y === 1 ? "v" : Y === 2 ? "u" : Y >= 10 ? (Y === 10 ? "v" : "u") : Y === 4 || Y === 8 ? "uvwv"[X] : X === 1 ? "w" : X === 2 ? "v" : "."
    if (k !== ".") c.px(X, Y, k)
  }
})
// The dark balustrade of the castles' tops: square posts every 5 px under a cap rail.
sprite("_rail", { w: 5, h: 13 }, (c) => {
  for (let Y = 0; Y < 13; Y++) for (let X = 0; X < 5; X++) {
    const k = Y === 0 ? "O" : Y === 1 ? "n" : Y === 2 ? "m" : Y >= 11 ? (Y === 11 ? "n" : "l") : X === 0 ? "o" : X === 1 ? "m" : "."
    if (k !== ".") c.px(X, Y, k)
  }
})
const TONES = ["F", "n", "T", "n", "F", "T", "o", "n"], DARKER = { F: "m", n: "F", T: "n", o: "T" }, LIGHTER = { F: "n", n: "T", T: "o", o: "O" }
// The lower pier's deck, laid on it whole (anchored to its face, a texel to a sprite's pixel): boards
// running out from the quay (up the picture), 5 px and a dark gap, each its own tone; the grain in
// long broken lines a step darker, a knot here and there (a dark eye in a lighter ring), butt joints
// where boards meet, nail heads in pairs over the joists every 1.6 m; worn pale where feet go (the
// way from the ramp to the gangway, the carrier's beat), each board's edge rounded lighter there.
const DECKW = 294, DECKH = 27
const wornLower = (x, z) => Math.max(Math.exp(-(((z + 6.9) / 0.9) ** 2)) * (x < 2.5 ? 1 : Math.exp(-(((x - 2.5) / 1.2) ** 2))), x > 3.6 && x < 9 ? Math.exp(-(((z + 8.25) / 0.5) ** 2)) : 0)
sprite("_deck_lower", { w: DECKW, h: DECKH }, (c) => {
  for (let X = 0; X < DECKW; X++) for (let Y = 0; Y < DECKH; Y++) {
    const b = Math.floor(X / 6), i = X % 6, x = PX0 + (X + 0.5) / PPM, z = -5.15 - (Y + 0.5) * CAM.floor[1]
    const base = TONES[Math.floor(hash(b, 1) * 8)], wear = wornLower(x, z) * (0.6 + 0.4 * hash(b, Y >> 2)), ky = Math.floor(hash(b, 9) * DECKH)
    let k = base
    if (i === 5) k = hash(b, Y) < 0.35 ? "k" : "l"
    else if ((Y - Math.floor(hash(b, 5) * 40) + 40) % 20 === 0) k = "l"
    else if (i === 0) k = wear > 0.35 ? "O" : LIGHTER[base]
    else if (i === 4) k = DARKER[base]
    else {
      if (i === 1 + Math.floor(hash(b, 2) * 3) && hash(b * 7, Math.floor((Y + hash(b, 3) * 5) / 5)) < 0.55) k = DARKER[base]
      if (wear > 0.5 && hash(X, Y >> 1) < wear - 0.3) k = LIGHTER[base]
      if (hash(b, 8) < 0.11 && (Y === ky || Y === ky + 1)) k = i === 2 ? "m" : LIGHTER[base]
      if (Y % 10 === 4 && (i === 1 || i === 3)) k = "l"
    }
    c.px(X, Y, k)
  }
})
// The board ends along its front, laid from the same left end: end grain, lit on top, a ring's dark
// heart, the gap black.
sprite("_ends", { w: DECKW, h: 3 }, (c) => {
  for (let X = 0; X < DECKW; X++) for (let Y = 0; Y < 3; Y++) {
    const b = Math.floor(X / 6), i = X % 6
    c.px(X, Y, i === 5 ? "k" : Y === 0 ? "O" : Y === 2 ? "n" : i === 2 || (i === 1 && hash(b, 4) < 0.5) ? "n" : hash(b, 1) < 0.5 ? "o" : "T")
  }
})
// Boards running across (along x): a lit edge row, a board row, a dark gap row (0.47 m a board,
// foreshortened), each its own tone; the grain in runs of 6 px a step darker, a knot now and then,
// joints staggered, a nail over each joist (1.5 m); `worn(x, z)` pale where feet go. The upper level's
// laid on it whole (anchored, 121 x 96: x from -14.5, z back from -3); the ship's decks tiled.
const boardsAcross = (name, w, h, at, worn) => sprite(name, { w, h }, (c) => {
  for (let X = 0; X < w; X++) for (let Y = 0; Y < h; Y++) {
    const b = Math.floor(Y / 3), r = Y % 3, base = TONES[Math.floor(hash(b, 11) * 8)], joint = (X - Math.floor(hash(b, 12) * 40) + 80) % 40 === 0
    const wear = worn ? worn(...at(X, Y)) * (0.6 + 0.4 * hash(X >> 2, b)) : 0
    let k = r === 2 ? (hash(X >> 1, b) < 0.3 ? "k" : "l") : joint ? "l" : r === 0 ? (wear > 0.35 ? "O" : LIGHTER[base]) : base
    if (r === 1 && !joint) {
      if (hash(Math.floor((X + hash(b, 13) * 6) / 6), b * 3 + 1) < 0.35) k = DARKER[base]
      if (hash(X >> 1, b * 5) < 0.025) k = "m"
      if (wear > 0.5 && hash(X, b) < wear - 0.3) k = LIGHTER[base]
      if (X % 25 === 3) k = "l"
    }
    c.px(X, Y, k)
  }
})
boardsAcross("_deck_upper", 121, 96, (X, Y) => [-14.5 + (X + 0.5) / PPM, -3.0 - (Y + 0.5) * CAM.floor[1]],
  (x, z) => Math.max(Math.exp(-(((x + 10.4) / 0.8) ** 2)), Math.exp(-((Math.hypot(x + 8.6, z + 5.4) / 1.0) ** 2))))
boardsAcross("_deck_x", 48, 24, () => [0, 0])
// The ramp's boards, across the way it runs (it goes down toward us and to the right, 45 degrees on
// the ground): a board 0.33 m, 3 rows down and 8 columns across the texture; two tones, a lit edge, a
// grain line down its middle in broken dashes.
sprite("_deck_d", { w: 48, h: 24 }, (c) => {
  for (let Y = 0; Y < 24; Y++) for (let X = 0; X < 48; X++) {
    const q = (3 * X + 8 * Y) % 24, b = Math.floor((3 * X + 8 * Y) / 24), base = b % 2 ? "n" : "T"
    c.px(X, Y, q >= 21 ? "l" : q < 3 ? "O" : q > 11 && q < 15 && hash(Math.floor((8 * X - 3 * Y + 400) / 24), b % 2) < 0.5 ? DARKER[base] : base)
  }
})
// Lanterns as on the reference's stern and bow: a gold finial, a red roof, white panels with dark
// windows between red corner posts, a red foot; lit from behind on the right.
sprite("_lantern", { base: "_lantern_ship", swap: roleSwap(lamps.ROLES._lantern_ship, { line: "k", trim: "st", frame: "qr", panel: "uw", glass: "lm" }) })

// The rowboats' planks, clinker-built: each strake 4 px, its top lit, its lower lip lapping over the
// next one down and a dark line of shadow under that lip, each strake its own tone, grain in broken
// runs; dark and green where the water wets them (world-laid: the wet stays at the water as it bobs).
sprite("_boatwood", { w: 32, h: 40 }, (c) => {
  for (let Y = 0; Y < 40; Y++) for (let X = 0; X < 32; X++) {
    const u = Y < 10 ? -(Y + 0.5) * CAM.wall[1] : (40 - Y - 0.5) * CAM.wall[1], s = Math.floor(Y / 4), r = Y % 4, base = hash(s, 41) < 0.4 ? "F" : "n"
    let k = r === 3 ? "l" : r === 0 ? LIGHTER[base] : hash(Math.floor((X + hash(s, 42) * 5) / 5), Y) < 0.25 ? DARKER[base] : base
    if (u < 0.12) k = { l: "k", n: "H", T: "H", F: "G", m: "G" }[k] ?? "G"
    c.px(X, Y, k)
  }
})
// Crates: boards 3 px across over dark seams, each its own tone, grain in runs, nail heads at their
// ends, a lighter brace on the diagonal; their edges outlined (the material's edge); the lid's boards.
const WOOD = { wood: "lmFnToO" }
sprite("_crate", { base: "crates._crate_face", swap: roleSwap(crates.ROLES._crate_face, WOOD) })
sprite("_cratetop", { base: "crates._crate_lid", swap: roleSwap(crates.ROLES._crate_lid, WOOD) })
// A barrel at the scene's scale (0.65 x 0.9 m): staves 3 px, bulging at its middle, two pairs of dark
// hoops, its lid seen from above; lit on the right, where the sun is.
sprite("_barrel", { base: "crates._barrel_small", swap: roleSwap(crates.ROLES._barrel_small, { line: "k", ...WOOD }) })
// Sacks of grain in golden burlap: one standing, tied at the neck, one lying; lit on the right.
sprite("_sack", { pivot: "bottom", outline: "k" }, "....ll....\n...lDl....\n....CD....\n..CDDDE...\n.CDDDDEE..\nCCDDDDDEE.\nCDDDDDDEE.\nCCDDDDDDE.\n.CCDDDDE..\n..CCCCC...", bump("hybrid"))
sprite("_sack_l", { pivot: "bottom", outline: "k" }, "...CDDDDE....\n.CDDDDDDDEE..\nCDDDDDDDDDEEl\nCCDDDDDDDDEll\n.CCCDDDDDEE..\n...CCCCCC....", bump("hybrid"))
// A seagull, 11 px across, its wings up, level and down: it flaps through them and glides level.
const GULL = {
  up: ["k.......k..", ".u.....u...", "..v...v....", "...vwv.....", "..wwwwwt...", "...ww......", "..........."],
  mid: ["...........", "...........", "...........", "kuvvwwvvuk.", "..wwwwwt...", "...ww......", "..........."],
  down: ["...........", "...........", "...........", "...wwww....", "..vwwwwt...", ".v.ww.v....", "k......k..."],
}
anim("_gull", { w: 11, h: 7, frames: 4, fps: 10, pivot: "center" }, ...["up", "mid", "down", "mid"].map((k) => frame({}, GULL[k].join("\n"))))
anim("_gull_l", { base: "_gull", flip: "x" })
// The lighthouse's tower: white, a red band every 1.5 m (world-laid: the bands level all round).
sprite("_tower", { w: 4, h: 24 }, (c) => { for (let Y = 0; Y < 24; Y++) c.rect(0, Y, 4, 1, Y < 7 ? "r" : Y === 7 ? "v" : "w") })
// The awning's canvas: red and white stripes 1.1 m wide, a darker line at each seam; its valance
// along the front hanging in scallops, two to a stripe, clear between them.
sprite("_awning", { w: 38, h: 8 }, (c) => { for (let Y = 0; Y < 8; Y++) for (let X = 0; X < 38; X++) c.px(X, Y, X % 19 === 0 ? (X ? "v" : "q") : X < 19 ? "r" : "w") })
sprite("_valance", { w: 38, h: 6 }, (c) => {
  for (let Y = 0; Y < 6; Y++) for (let X = 0; X < 38; X++) {
    const q = ((X % 9.5) / 9.5) * 2 - 1
    if (Y <= 1 + 4 * Math.sqrt(Math.max(0, 1 - q * q))) c.px(X, Y, Y === 0 ? (X < 19 ? "q" : "v") : X < 19 ? "r" : "w")
  }
})

// The water, two layers after Saint11's (scenes §5), an 8-frame loop: under, troughs that swell and
// ebb (two smooth fields crossfading, so the loop closes); over it, lit ripples: the upper rim of each
// of many small cells flattened by the view (about 16 x 8 px, scattered), a crescent thickening and
// thinning on the cell's own beat, never moving more than a pixel, broken where the swell is low; its
// top the crest, and on some crests the sun's glints, white, giving light (they bloom in post() and
// blur into bokeh far off), on for a few frames. The far water (toward the sun) takes nearly every
// glint, the near one a fifth; a foam of dashes and glints along the hull.
const WN = 8, WW = 128, WH = 48, GX = 8, GY = 6
const CELLS = []
for (let gy = 0; gy < GY; gy++) for (let gx = 0; gx < GX; gx++) CELLS.push([(gx + hash(gx, gy)) * (WW / GX), (gy + hash(gx + 7, gy)) * (WH / GY), hash(gx, gy + 9) * 6.28])
// the nearest cell's distance, its point and phase, and the second distance (on the tile, wrapping):
// the same in every frame and every water, so worked out once a pixel
const NEAR2 = []
const near2 = (X, Y) => NEAR2[Y * WW + X] ??= (() => {
  let a = [1e9, 0, 0, 0], d2 = 1e9
  for (const [px, py, ph] of CELLS) for (const ox of [-WW, 0, WW]) for (const oy of [-WH, 0, WH]) {
    const d = Math.hypot(X - px - ox, (Y - py - oy) * 2.3)
    if (d < a[0]) { d2 = a[0]; a = [d, px + ox, py + oy, ph] } else if (d < d2) d2 = d
  }
  return [...a, d2]
})()
const SWELL = [seamless((x, y) => vnoise(x / 12, y / 4), WW, WH), seamless((x, y) => vnoise(x / 12 + 40, y / 4 + 13), WW, WH)]
const water = (name, f, glints, big, holes) => sprite(name, { w: WW, h: WH }, (c) => {
  const t = (2 * Math.PI * f) / WN, mix = (1 - Math.cos(t)) / 2
  for (let Y = 0; Y < WH; Y++) for (let X = 0; X < WW; X++) {
    const [d1, px, py, ph, d2] = near2(X, Y), beat = Math.sin(t + ph), th = 1.2 + 0.7 * beat, up = (py - Y) * 2.3
    const v = SWELL[0](X, Y) * (1 - mix) + SWELL[1](X, Y) * mix + (bayer(X, Y) - 0.5) * 0.1
    let k = v < 0.3 ? "a" : v < 0.45 ? "b" : "c"
    if (d2 - d1 < th && up > 0.5 && v > 0.33) {
      const crest = up > d1 * 0.8
      k = crest ? (beat > 0.45 && Math.abs(X - px) < (big ? 3 : 1.5) && hash(Math.round(px), Math.round(py)) < glints ? "f" : "e") : "d"
    }
    if (!holes || k === "d" || k === "e" || k === "f") c.px(X, Y, k)
  }
})
for (let f = 0; f < WN; f++) {
  water(`_water_${f}`, f, 0.2); water(`_waterfar_${f}`, f, 1, true); water(`_waterrefl_${f}`, f, 0.2, false, true)
  sprite(`_foam_${f}`, { w: 64, h: 2 }, (c) => { for (let Y = 0; Y < 2; Y++) for (let X = 0; X < 64; X++) c.px(X, Y, hash(X >> 1, f * 7 + Y) < 0.3 ? "f" : hash(X >> 2, f + 3) < 0.6 ? "e" : "d") })
}

const MATS = {
  hull: { tex: "_hull", texel: "screen" }, pale: { tex: "_planks_pale", texel: "screen" }, port: { tex: "_port", anchor: "face", texel: "screen" },
  band: { tex: "_band", texel: BANDT }, bal: { tex: "_bal", anchor: "face", texel: BANDT }, rail: { tex: "_rail", anchor: "face", texel: BANDT },
  deck: { tex: "_deck_lower", anchor: "face", texel: "screen" }, deckup: { tex: "_deck_upper", anchor: "face", texel: "screen" }, deckx: { tex: "_deck_x", texel: CAM.floor }, ramp: { tex: "_deck_d", texel: "screen" }, ends: { tex: "_ends", anchor: "face", texel: "screen" },
  wood: { ramp: "lmno" }, pile: { ramp: "lmnoO", smooth: true }, wet: { ramp: "kGH", smooth: true }, mast: { ramp: "lmnoO", smooth: true }, rope: { ramp: "kl", bias: -0.2 },
  canvas: { ramp: "IJyz", smooth: true, bias: 0.1 }, canvas0: { ramp: "I", edge: "x", smooth: true }, canvas1: { ramp: "J", edge: "x", smooth: true }, canvas2: { ramp: "y", edge: "x", smooth: true }, canvas3: { ramp: "z", edge: "I", smooth: true, bias: 0 }, boltrope: { ramp: "xI", smooth: true }, red: { ramp: "pqr" }, white: { ramp: "uvw" }, haze: { ramp: "AB" },
  crate: { tex: "_crate", anchor: "face", texel: "screen", edge: "l" }, cratetop: { tex: "_cratetop", anchor: "face", texel: "screen", edge: "l" },
  boat: { tex: "_boatwood", texel: "screen" }, boatin: { ramp: "lmn", smooth: true }, boatrim: { ramp: "noO" },
  beam: { ramp: "lmnoO", texture: (x, y) => (hash(x, y >> 2) < 0.15 ? -1 : 0) }, tower: { tex: "_tower", texel: "screen" }, glass: { ramp: "de" }, rock: { ramp: "LNP" },
  awning: { tex: "_awning", texel: "screen" }, valance: { tex: "_valance", texel: [1 / PPM, 0.05] },
}
// the materials for frame f, in blocks of K px for a picture K times as big (pixel art among its faces)
const mats = (f, K = 1) => {
  const w = Math.floor((f * MS) / 100) % WN
  const all = { ...MATS, water: { tex: `_water_${w}`, texel: "screen" }, waterfar: { tex: `_waterfar_${w}`, texel: "screen" }, waterrefl: { tex: `_waterrefl_${w}`, texel: "screen" }, foam: { tex: `_foam_${w}`, texel: "screen" } }
  for (const [k, m] of Object.entries(MATS)) all[k + "_r"] = { ...m, bias: (m.bias ?? 0) - 0.08 }   // the reflection's
  return K === 1 ? all : Object.fromEntries(Object.entries(all).map(([k, m]) => [k, { ...m, block: K }]))
}

// ---------------------------------------------------------------- building helpers (z from Z)
// a polygon [[x, z], ...] raised from u0 to u1: its top of one material, its sides of another
const prism = (top, side, pts, u0, u1, m = M) => m.prism(top, side, pts.map(([x, z]) => [x, Z + z]), u0, u1)
const prismBox = (mat, x0, z0, x1, z1, u0, u1, top = mat, m = M) => prism(top, mat, [[x0, z0], [x1, z0], [x1, z1], [x0, z1]], u0, u1, m)
// a post of n sides (round when its material is smooth)
const pole = (mat, x, z, r, u0, u1, n = 6) => prism(mat, mat, Array.from({ length: n }, (_, i) => [x + r * Math.cos((2 * Math.PI * i) / n + 0.3), z + r * Math.sin((2 * Math.PI * i) / n + 0.3)]), u0, u1)
// a slab whose top is four corners [x, z, u] (a ramp, the gangway), t thick
const slab = (top, side, pts, t = 0.15) => {
  const P = pts.map(([x, z, u]) => [x, Z + z, u]), B = P.map(([x, z, u]) => [x, z, u - t])
  M.face(top, ...P)
  for (let i = 0; i < 4; i++) M.face(side, P[i], P[(i + 1) % 4], B[(i + 1) % 4], B[i])
}
// a square stick from a to b ([x, z, u]), r half its width: a spar, a rope
const stick = (mat, a, b, r = 0.05, m = M) => m.stick(mat, [a[0], Z + a[1], a[2]], [b[0], Z + b[1], b[2]], r)

// ---------------------------------------------------------------- the water
// in front of the galleon the water is holed between its ripples (`_waterrefl`), and under it the
// galleon's reflection (below); round that, the water whole
const RX0 = -9.6, RX1 = 12, RZ0 = -8, RZ1 = 0
for (const [x0, z0, x1, z1] of [[-80, -30, RX0, 3.5], [RX1, -30, 80, 3.5], [RX0, -30, RX1, RZ0], [RX0, RZ1, RX1, 3.5]]) M.face("water", [x0, Z + z0, 0], [x1, Z + z0, 0], [x1, Z + z1, 0], [x0, Z + z1, 0])
M.face("waterrefl", [RX0, Z + RZ0, 0], [RX1, Z + RZ0, 0], [RX1, Z + RZ1, 0], [RX0, Z + RZ1, 0])
M.face("waterfar", [-80, Z + 3.5, 0], [80, Z + 3.5, 0], [80, Z + 90, 0], [-80, Z + 90, 0])

// ---------------------------------------------------------------- the galleon
const SHIP0 = M.faces.length
// The hull lofted through sections: pointed at the bow (the beam growing as a quarter circle over the
// first third), square at the stern, in section wider at the middle than at the waterline and drawn
// in again at the rail (tumblehome). Its near side 2.7 m behind the pier's back... 2.45 m of water.
const ZC = -0.2, B0 = 2.5, XB = -9.0, XS = 9.4, DECK = 2.4
const beam = (x) => {
  const t = (x - XB) / (XS - XB)
  return t < 0.32 ? B0 * Math.sqrt(Math.max(0, 1 - (1 - t / 0.32) ** 2)) : t > 0.8 ? B0 * (1 - 0.12 * ((t - 0.8) / 0.2) ** 2) : B0
}
const FLARE = [[DECK, 0.93], [1.8, 0.98], [0.9, 1], [0, 0.86], [-0.7, 0.55]]           // [u, share of the beam], top down
const flare = (u) => { for (let i = 0; i + 1 < FLARE.length; i++) { const [ua, a] = FLARE[i], [ub, b] = FLARE[i + 1]; if (u >= ub) return b + ((a - b) * (u - ub)) / (ua - ub) } return FLARE.at(-1)[1] }
const hullZ = (x, u, s = -1) => ZC + s * beam(x) * flare(u)                         // the near side (s -1) or the far (1)
const XSEC = Array.from({ length: 30 }, (_, k) => XB + (XS - XB) * (k / 29) ** 1.4)
const UU = FLARE.map(([u]) => u)
const section = (x) => [...UU.map((u) => [x, Z + hullZ(x, u, 1), u]), ...[...UU].reverse().map((u) => [x, Z + hullZ(x, u), u])]
M.loft("hull", XSEC.map(section))
M.face("hull", ...section(XS))                                                      // the transom
M.face("deckx", ...XSEC.map((x) => [x, Z + hullZ(x, DECK), DECK]), ...[...XSEC].reverse().map((x) => [x, Z + hullZ(x, DECK, 1), DECK]))
// gun ports on the near side, a little proud of it
for (const x of [-4.6, -2.6, 3.0, 5.0, 7.2]) { const z = hullZ(x, 1.05) - 0.03; M.face("port", [x - 0.27, Z + z, 1.27], [x + 0.27, Z + z, 1.27], [x + 0.27, Z + z, 0.83], [x - 0.27, Z + z, 0.83]) }
// the plan of the hull's top from x0 to x1, inset a little (castles stand on it)
const plan = (x0, x1, n = 8) => { const xs = Array.from({ length: n + 1 }, (_, i) => x0 + ((x1 - x0) * i) / n); return [...xs.map((x) => [x, hullZ(x, DECK) + 0.02]), ...xs.reverse().map((x) => [x, hullZ(x, DECK, 1) - 0.02])] }
// a rail of material mat along the near (s -1) or far (1) edge of the top, from x0 to x1, u0 to u1
const railAlong = (mat, x0, x1, u0, u1, s = -1, n = 6) => {
  for (let i = 0; i < n; i++) {
    const xa = x0 + ((x1 - x0) * i) / n, xb = x0 + ((x1 - x0) * (i + 1)) / n, za = Z + hullZ(xa, DECK, s) - s * 0.03, zb = Z + hullZ(xb, DECK, s) - s * 0.03
    M.face(mat, [xa, za, u1], [xb, zb, u1], [xb, zb, u0], [xa, za, u0])
  }
}
const railAcross = (mat, x, u0, u1) => M.face(mat, [x, Z + hullZ(x, DECK), u1], [x, Z + hullZ(x, DECK, 1), u1], [x, Z + hullZ(x, DECK, 1), u0], [x, Z + hullZ(x, DECK), u0])
// the forecastle and the stern castle a deck (1.2 m) higher, their sides the red band; the poop over
// the stern another 0.9 m, of pale planks; dark balustrades round the tops, white balusters along
// the waist either side of the gangway and along the poop's middle
const TOPC = DECK + 1.2, POOP = TOPC + 0.9
prism("deckx", "band", plan(XB + 0.05, -3.2), DECK, TOPC)
prism("deckx", "band", plan(3.9, XS - 0.02), DECK, TOPC)
prism("deckx", "pale", plan(5.5, XS - 0.02), TOPC, POOP)
for (const [x0, x1] of [[-3.2, -1.1], [1.8, 3.9]]) railAlong("bal", x0, x1, DECK, DECK + 0.72, -1, 3)
railAlong("rail", -8.4, -3.2, TOPC, TOPC + 0.78)
railAlong("rail", -7.6, -3.2, TOPC, TOPC + 0.78, 1)
railAcross("rail", -3.2, TOPC, TOPC + 0.78)
railAlong("rail", 3.9, 5.5, TOPC, TOPC + 0.78, -1, 2)
railAlong("rail", 3.9, 5.5, TOPC, TOPC + 0.78, 1, 2)
railAcross("rail", 3.9, TOPC, TOPC + 0.78)
railAlong("rail", 5.5, 6.5, POOP, POOP + 0.78, -1, 1); railAlong("bal", 6.5, 8.4, POOP, POOP + 0.72, -1, 2); railAlong("rail", 8.4, XS - 0.05, POOP, POOP + 0.78, -1, 1)
railAlong("rail", 5.5, XS - 0.05, POOP, POOP + 0.78, 1, 3)
railAcross("rail", 5.5, POOP, POOP + 0.78)
// the gangway: boards across it, from the pier's back edge up to the waist, with a rope rail each side
slab("deckx", "wood", [[-1.0, -5.3, LOWER], [1.6, -5.3, LOWER], [1.6, hullZ(1.6, DECK), DECK], [-1.0, hullZ(-1.0, DECK), DECK]])
for (const x of [-0.95, 1.55]) { stick("wood", [x, -5.25, LOWER], [x, -5.25, LOWER + 0.9], 0.05); stick("rope", [x, -5.25, LOWER + 0.85], [x, hullZ(x, DECK) - 0.05, DECK + 0.85], 0.025) }
// three masts going up out of the picture, a yard across each (seen end on), the bowsprit and its stay;
// on the near side of each mast the shrouds, four ropes from the rail to the masthead, and their
// ratlines every 0.42 m, the ladder the crew climbs
const MASTS = [[-2.7, 9.4, DECK], [1.35, 9.8, DECK], [6.9, 7.2, POOP]], BRACE = [0.71, 0.71]   // the yards braced round 45 degrees
for (const [xm, yard, foot] of MASTS) {
  pole("mast", xm, ZC - 0.2, 0.2, foot - 0.1, 22, 8)
  stick("mast", [xm - 0.3 - BRACE[0] * 2.7, ZC - BRACE[1] * 2.7, yard], [xm - 0.3 + BRACE[0] * 2.7, ZC + BRACE[1] * 2.7, yard], 0.08)
  const head = [xm, ZC - 0.45, 13.6], feet = [-1.0, -0.33, 0.33, 1.0].map((dx) => [xm + dx, hullZ(xm + dx, DECK) - 0.14, foot + 0.25])
  for (const p of feet) stick("rope", p, head, 0.035)
  for (let u = foot + 0.67; u < 13.2; u += 0.42) {
    const at = (p) => { const k = (u - p[2]) / (head[2] - p[2]); return [p[0] + (head[0] - p[0]) * k, p[1] + (head[1] - p[1]) * k, u] }
    stick("rope", at(feet[0]), at(feet[3]), 0.025)
  }
}
stick("mast", [-8.6, ZC, 2.6], [-12.7, ZC, 5.1], 0.12)
stick("rope", [-2.7, ZC - 0.45, 13.6], [-12.5, ZC, 5.0], 0.03)
// The sails, sewn of canvas: panels 0.6 m wide with a seam a step darker between each two, a bolt
// rope round the edges, a row of reef points a fifth of the way down, a patch or two a step darker.
// Each piece one of four tones by the light the sun behind sends through it, the most where it faces
// us square (the full belly warm off-white), less as the cloth turns away (its hollows and edges a
// cool grey): pixel art, a tone per piece in clusters, no gradient.
// The fore and main sails set, full, bellied out toward us and the right deepest two thirds down,
// moved by the wind a frame at a time (one sway in 16), a ripple running down them; the jib on its
// stay, taut, billowing toward us; the mizzen's sail furled on its yard, rolled, lashed with ties.
const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], norm3 = (a) => a.map((e) => e / Math.hypot(...a))
const SUNV = norm3([0.35, 0.75, 0.6]), TOEYE = [0, -0.93, 0.37]           // the way to the sun, and toward the camera
const sailcloth = (S, pt, panels, rows, patches = []) => {
  const E = 0.012, SEAM = 0.016, as = [0, E], bs = [0, 0.03]
  for (let k = 0; k < panels; k++) { const a1 = E + ((1 - 2 * E) * (k + 1)) / panels; if (k < panels - 1) as.push(a1 - SEAM, a1); else as.push(1 - E, 1) }
  for (let r = 1; r < rows; r++) bs.push(0.03 + (0.94 * r) / rows)
  bs.push(0.97, 1)
  for (let i = 0; i + 1 < as.length; i++) for (let r = 0; r + 1 < bs.length; r++) {
    const [a0, a1, b0, b1] = [as[i], as[i + 1], bs[r], bs[r + 1]], edge = i === 0 || i === as.length - 2 || r === 0 || r === bs.length - 2
    const seam = !edge && a1 - a0 < SEAM * 1.5, panel = Math.floor(((a0 + a1) / 2) * panels), row = Math.floor(((b0 + b1) / 2) * rows)
    const q = [pt(a0, b0), pt(a1, b0), pt(a1, b1), pt(a0, b1)], u = sub3(q[1], q[0]), v = sub3(q[3], q[0])
    let n = norm3([u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]])
    if (dot3(n, TOEYE) < 0) n = n.map((e) => -e)
    const tone = Math.max(0, Math.min(3, Math.floor((0.15 + 0.95 * Math.max(0, -dot3(n, SUNV))) * 4))) - (edge ? 2 : seam || patches.some(([pp, qq]) => pp === panel && qq === row) ? 1 : 0)
    S.face(edge ? "boltrope" : `canvas${Math.max(0, tone)}`, ...q)
  }
}
// reef points: short ties hanging in a row across the sail, a little proud of it (out: that way, in m)
const reefs = (S, pt, panels, out) => {
  for (let k = 0; k < panels; k++) {
    const a = (k + 0.5) / panels, o = (q) => [q[0] + out[0], q[1] + out[1], q[2]]
    S.face("rope", o(pt(a - 0.008, 0.2)), o(pt(a + 0.008, 0.2)), o(pt(a + 0.008, 0.27)), o(pt(a - 0.008, 0.27)))
  }
}
const SAILS = Array.from({ length: SAILF }, (_, f) => {
  const S = model(), ph = (2 * Math.PI * f) / SAILF
  MASTS.slice(0, 2).forEach(([xm, yard], m) => {
    const h = yard - 4.6
    const pt = (a, b) => {
      const s = (a - 0.5) * 5.0 * (1 - 0.1 * b), full = Math.sin(Math.PI * a) * Math.sin(Math.PI * b * 0.7)
      const out = full * (1.15 + 0.2 * Math.sin(ph - 2.4 * b + 3 * a)) + 0.04 * b * Math.sin(2 * Math.PI * (4.5 * a + 0.1 * Math.sin(ph + b * 2)))
      return [xm - 0.3 + BRACE[0] * s + BRACE[1] * out, Z + ZC + BRACE[1] * s - BRACE[0] * out, yard - b * h * (1 - 0.12 * Math.sin(Math.PI * a))]
    }
    sailcloth(S, pt, 8, 10, m ? [[2, 6], [5, 3]] : [[6, 7]])
    reefs(S, pt, 8, [BRACE[1] * 0.06, -BRACE[0] * 0.06])
  })
  const tack = [-12.4, ZC - 0.1, 5.0], clew = [-6.3, ZC - 1.6, 3.9], head = [-3.0, ZC - 0.4, 12.4]
  const jib = (a, b) => {
    const p = [0, 1, 2].map((e) => tack[e] + (clew[e] - tack[e]) * a), q = [0, 1, 2].map((e) => p[e] + (head[e] - p[e]) * b * 0.97)
    return [q[0], Z + q[1] - 1.4 * Math.sin(Math.PI * a) * Math.sin(Math.PI * Math.min(1, b * 1.1)) * (1 + 0.12 * Math.sin(ph + 3 * a + 2 * b)), q[2]]
  }
  sailcloth(S, jib, 7, 12, [[3, 4]])
  return S.faces
})
// the mizzen's sail furled on its yard: a roll of canvas, lumpy, sagging a little between its ends,
// lashed every 0.6 m with a tie
{
  const [xm, yard] = MASTS[2], L = 4.6, along = (t) => [xm - 0.3 + BRACE[0] * (t - 0.5) * L, Z + ZC + BRACE[1] * (t - 0.5) * L, yard - 0.2 - 0.08 * Math.sin(Math.PI * t)]
  const ringAt = (t, extra) => {
    const c0 = along(t), r = 0.13 + 0.07 * Math.sin(Math.PI * t) + 0.03 * Math.sin(t * 23) + extra
    return Array.from({ length: 9 }, (_, k) => { const th = (k / 8) * 2 * Math.PI; return [c0[0] + BRACE[1] * r * Math.cos(th), c0[1] - BRACE[0] * r * Math.cos(th), c0[2] + r * Math.sin(th)] })
  }
  M.loft("canvas", Array.from({ length: 17 }, (_, i) => ringAt(i / 16, 0)))
  for (let k = 1; k < 8; k++) M.loft("rope", [ringAt(k / 8 - 0.006, 0.015), ringAt(k / 8 + 0.006, 0.015)])
}
// lanterns, red and white: at the bow, and four along the stern with a fifth hung lower (air: they hang)
const LANTERNS = [[-6.2, 1.25], [6.2, 0.8], [7.06, 1.7], [7.76, 1.7], [8.46, 1.7], [9.35, 1.3]].map(([x, u]) => ({ name: "_lantern", at: [x, Z + hullZ(x, 1.8) - 0.35, u], shadow: 0, air: true }))
// The galleon bobs at the pier, so its faces are taken out and drawn per frame (faces(f)), with its
// reflection: the same faces mirrored under the water, seen through the calm between the ripples in
// front of it, lit by the sky only (the water over it takes the sun), a touch darker.
const SHIPF = M.faces.splice(SHIP0)
// foam along the waterline where the hull meets the water
for (let k = 0; k + 1 < XSEC.length; k++) {
  const [xa, xb] = [XSEC[k], XSEC[k + 1]], za = Z + hullZ(xa, 0), zb = Z + hullZ(xb, 0)
  M.face("foam", [xa, za, 0.02], [xb, zb, 0.02], [xb, zb - 0.16, 0.02], [xa, za - 0.16, 0.02])
}

// ---------------------------------------------------------------- the pier
// The lower pier along the ship, 4 m deep, its boards running out from the quay (its left end on a
// board's edge), the board ends along its front over a dark stringer; pilings every 1.5 m, round, dark
// and green where the water wets them; bollards along the front.
const PX0 = -120 / PPM, PX1 = 10.2
prism("deck", "ends", [[PX0, -9.3], [PX1, -9.3], [PX1, -5.15], [PX0, -5.15]], LOWER - 0.15, LOWER)
prismBox("wood", PX0, -9.32, PX1, -9.1, LOWER - 0.42, LOWER - 0.15)
for (let x = PX0 + 0.3; x < PX1; x += 1.5) for (const z of [-9.18, -5.3]) { pole("wet", x, z, 0.14, -0.6, 0.28); pole("pile", x, z, 0.14, 0.28, LOWER - 0.15) }
for (let x = PX0 + 0.45; x < PX1; x += 3) pole("pile", x, -9.18, 0.15, LOWER, LOWER + 0.62)
const HAWSERS = [[-6.3, -5.2], [8.8, 8.0]]   // the galleon's lines: from x on the ship to a bollard at x on the pier
for (const x of HAWSERS.map(([, b]) => b)) pole("pile", x, -5.33, 0.15, LOWER, LOWER + 0.5)      // bollards for the ship's lines
// The upper level, a meter higher: a walkway down the left from out of the picture to a platform by
// the ship's bow, where the crane stands, its boards across; the platform's corner cut on the
// diagonal where the ramp goes down from it, toward us and to the right, onto the lower pier.
const UPPLAN = [[-14.5, -18], [-9.2, -18], [-9.2, -6.2], [-7.4, -4.4], [-7.4, -3.0], [-14.5, -3.0]]
prism("deckup", "wood", UPPLAN, UPPER - 0.2, UPPER)
for (let z = -17.4; z < -6; z += 1.5) { pole("wet", -9.32, z, 0.15, -0.6, 0.28); pole("pile", -9.32, z, 0.15, 0.28, UPPER - 0.2) }
for (const [x, z] of [[-8.6, -5.6], [-7.55, -4.55], [-7.55, -3.15]]) { pole("wet", x, z, 0.15, -0.6, 0.28); pole("pile", x, z, 0.15, 0.28, UPPER - 0.2) }
slab("ramp", "wood", [[-9.0, -6.0, UPPER], [-7.8, -4.8, UPPER], [-5.82, -6.78, LOWER + 0.02], [-7.02, -7.98, LOWER + 0.02]])
for (const [x, z] of [[-6.75, -7.35], [-6.0, -6.6]]) { pole("wet", x, z, 0.12, -0.6, 0.28); pole("pile", x, z, 0.12, 0.28, 0.9) }

// ---------------------------------------------------------------- the crane
// The cargo crane on the upper level, as the reference's: a square post braced at its foot, a jib
// out over the water toward the ship, a strut under it; a winch drum on two cheeks at the post's
// foot, its crank; the rope from the drum to the jib's end, and from there down to a crate that
// swings a little (crane(f)).
const CR = [-11.8, -4.6], JIBX = -8.5, JIBU = 6.9
prismBox("beam", CR[0] - 0.2, CR[1] - 0.2, CR[0] + 0.2, CR[1] + 0.2, UPPER, JIBU + 0.4)
prismBox("beam", -12.7, CR[1] - 0.14, JIBX, CR[1] + 0.14, JIBU, JIBU + 0.28)
stick("beam", [CR[0] + 0.15, CR[1], 4.6], [-9.7, CR[1], JIBU], 0.1)
for (const [dx, dz] of [[-1.1, 0], [1.1, 0], [0, -1.1]]) stick("beam", [CR[0] + dx, CR[1] + dz, UPPER], [CR[0] + dx * 0.14, CR[1] + dz * 0.14, 3.0], 0.09)
const DRUM = [CR[0] + 0.75, UPPER + 0.62], drumRing = (z, r) => Array.from({ length: 9 }, (_, i) => [DRUM[0] + r * Math.cos((i * Math.PI) / 4), Z + z, DRUM[1] + r * Math.sin((i * Math.PI) / 4)])
M.loft("beam", [drumRing(CR[1] - 0.45, 0.28), drumRing(CR[1] + 0.45, 0.28)])
M.face("beam", ...drumRing(CR[1] - 0.45, 0.28).slice(0, 8))
for (const z of [CR[1] - 0.55, CR[1] + 0.45]) prismBox("beam", DRUM[0] - 0.12, z, DRUM[0] + 0.12, z + 0.1, UPPER, DRUM[1] + 0.12)
stick("beam", [DRUM[0], CR[1] - 0.6, DRUM[1]], [DRUM[0] + 0.3, CR[1] - 0.6, DRUM[1] - 0.35], 0.04)
stick("rope", [DRUM[0], CR[1], DRUM[1] + 0.28], [JIBX + 0.15, CR[1], JIBU], 0.03)
const crane = (D, f) => {
  const a = 0.09 * Math.sin((2 * Math.PI * f) / 32), tip = [JIBX + 0.15, CR[1], JIBU], hook = [tip[0] + 2.3 * Math.sin(a), CR[1], JIBU - 2.3 * Math.cos(a)]
  stick("rope", tip, hook, 0.03, D)
  prismBox("crate", hook[0] - 0.38, hook[1] - 0.38, hook[0] + 0.38, hook[1] + 0.38, hook[2] - 1.08, hook[2] - 0.32, "cratetop", D)
  for (const dx of [-0.34, 0.34]) stick("rope", hook, [hook[0] + dx, hook[1] - 0.36, hook[2] - 0.32], 0.02, D)
}

// ---------------------------------------------------------------- cargo
// Crates (boxes of planks, outlined), barrels and sacks (sprites at the scene's scale) on the pier and
// the upper level, clear of the ways people walk.
const crate = (x, z, s, u = LOWER) => prismBox("crate", x - s / 2, z - s / 2, x + s / 2, z + s / 2, u, u + s, "cratetop")
for (const [x, z, s, u] of [[-6.4, -8.5, 0.9], [-5.3, -8.6, 0.8], [-4.6, -5.9, 0.8], [-4.55, -5.9, 0.65, LOWER + 0.8], [6.8, -5.8, 1.0], [6.8, -5.8, 0.85, LOWER + 1.0], [8.8, -6.0, 1.1], [-12.6, -4.0, 0.8, UPPER]]) crate(x, z, s, u)
const PROPS = [["_barrel", 3.4, -5.6], ["_barrel", 3.95, -5.45], ["_barrel", 9.7, -7.2], ["_sack", 5.0, -5.55], ["_sack_l", 4.4, -5.75], ["_sack_l", -4.4, -8.65],
  ["_barrel", -11.0, -3.6, UPPER], ["_sack", -12.0, -7.2, UPPER], ["_sack_l", -13.0, -8.6, UPPER]].map(([name, x, z, u = LOWER]) => ({ name, at: [x, Z + z, u], shadow: 0.25 }))

// ---------------------------------------------------------------- the rowboats
// Rowboats built as the galleon is: sections across, round-bilged, pointed at both ends, the sheer
// rising to them; clinker planks outside, the inside darker, its floor just above the water (or the
// water plane would flood it), a lit gunwale, two thwarts. In their own meters (s along, t across, u
// up), set where they float and bobbing on the scene's clock (boats(f)): a heave and a roll about
// their length, each on its own beat.
const lbox = (B, side, top, s0, t0, s1, t1, u0, u1) => B.prism(top, side, [[s0, t0], [s1, t0], [s1, t1], [s0, t1]], u0, u1)
const rowboat = (len, wid, stuff = () => {}) => {
  const B = model(), L = len / 2, deep = 0.15, floor = 0.06
  const half = (s) => (wid / 2) * Math.max(0, 1 - Math.abs(s / L) ** 2.2) ** 0.6, sheer = (s) => 0.42 + 0.22 * (s / L) ** 2
  const S = Array.from({ length: 13 }, (_, i) => -L + (len * i) / 12)
  const hullRing = (s, k, bottom) => Array.from({ length: 7 }, (_, j) => { const a = (Math.PI * j) / 6; return [s, -half(s) * k * Math.cos(a), sheer(s) - (sheer(s) - bottom) * Math.sin(a) ** 0.7] })
  B.loft("boat", S.map((s) => hullRing(s, 1, -deep)))
  B.loft("boatin", S.map((s) => hullRing(s, 0.86, floor)))
  for (const j of [0, 6]) B.strip("boatrim", S.map((s) => hullRing(s, 1, -deep)[j]), S.map((s) => hullRing(s, 0.86, floor)[j]))
  for (const s of [-0.3 * L, 0.32 * L]) lbox(B, "boatrim", "boatrim", s - 0.12, -half(s) * 0.86, s + 0.12, half(s) * 0.86, sheer(s) - 0.2, sheer(s) - 0.14)
  stuff(B, { L, half, sheer, floor })
  return B.faces
}
const oars = (B, { L }) => { for (const t of [-0.2, 0.2]) { B.face("boatrim", [-L * 0.75, t - 0.04, 0.3], [L * 0.6, t - 0.04, 0.3], [L * 0.6, t + 0.04, 0.3], [-L * 0.75, t + 0.04, 0.3]) } }
const cargoCrates = (B, { floor }) => { for (const [s, t, k] of [[-1.6, 0.1, 0.85], [-0.6, -0.25, 0.8], [0.6, 0.2, 0.85], [0.6, 0.2, 0.7]]) { const u0 = floor + (k === 0.7 ? 0.85 : 0); lbox(B, "crate", "cratetop", s - k / 2, t - k / 2, s + k / 2, t + k / 2, u0, u0 + k) } }
const BOATS = [
  { at: [-5.0, -10.9], dir: [0.6, 0.8], ph: 0, faces: rowboat(3.8, 1.4, oars) },
  { at: [-0.5, -11.3], dir: [-0.45, 0.89], ph: 2.1, faces: rowboat(4.0, 1.5), cargo: [["_barrel", 0.55, 0.05], ["_sack", -0.55, -0.2], ["_sack_l", -0.95, 0.22]] },
  { at: [8.0, -10.85], dir: [1, 0], ph: 4.2, faces: rowboat(7.2, 2.4, cargoCrates) },
].map((b) => ({ ...b, faces: b.faces.map((F) => ({ mat: F.mat, pts: F.pts.map(([s, t, u]) => [b.at[0] + b.dir[0] * s - b.dir[1] * t, Z + b.at[1] + b.dir[1] * s + b.dir[0] * t, u]) })) }))
// faces (or a point) turned th about the axis through c along d (a unit vector), then lifted dh
const turnPt = model.turnPoint, turn = model.turn
const boatPose = (b, f) => ({ c: [b.at[0], Z + b.at[1], 0], d: [b.dir[0], b.dir[1], 0], th: 0.035 * Math.sin((2 * Math.PI * f) / 32 + b.ph), dh: 0.035 * Math.sin((2 * Math.PI * f) / 32 + b.ph + 1.3) })
const boats = (f) => BOATS.flatMap((b) => { const P = boatPose(b, f); return turn(b.faces, P.c, P.d, P.th, P.dh) })
const boatPt = (b, f, [s, t, u]) => { const P = boatPose(b, f); return turnPt([b.at[0] + b.dir[0] * s - b.dir[1] * t, Z + b.at[1] + b.dir[1] * s + b.dir[0] * t, u], P.c, P.d, P.th, P.dh) }
const boatCargo = (f) => BOATS.flatMap((b) => (b.cargo ?? []).map(([name, s, t]) => ({ name, at: boatPt(b, f, [s, t, 0.06]), shadow: 0 })))

// ---------------------------------------------------------------- lines
// Mooring lines sagging between their ends (catenary enough): the galleon's from its bow and stern to
// bollards on the pier's back edge, the rowboats' from their bows to the bollards along the front.
const sagLine = (D, a, b, sag, n = 8) => {
  const pt = (t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - Z, a[2] + (b[2] - a[2]) * t - sag * 4 * t * (1 - t)]
  for (let i = 0; i < n; i++) stick("rope", pt(i / n), pt((i + 1) / n), 0.03, D)
}
const lines = (D, f) => {
  const { th, dh } = shipPose(f)
  for (const [xs, xb] of HAWSERS) sagLine(D, turnPt([xs, Z + hullZ(xs, 2.0) - 0.05, 2.0], SHIPC, [1, 0, 0], th, dh), [xb, Z - 5.33, LOWER + 0.45], 0.45, 10)
  for (const [k, xb] of [[0, -3.61], [1, -0.61], [2, 8.39]]) {
    const b = BOATS[k], L = [3.8, 4.0, 7.2][k] / 2
    sagLine(D, boatPt(b, f, [L - 0.1, 0, 0.6]), [xb, Z - 9.18, LOWER + 0.55], 0.15, 5)
  }
}

// ---------------------------------------------------------------- near and far
// The awning of a stall near the eye, red and white canvas sloping toward us, its scalloped valance
// along the front, on a pole behind and two posts in front.
M.face("awning", [-8.6, Z - 16.4, 2.4], [4.8, Z - 16.4, 2.4], [4.8, Z - 20, 1.8], [-8.6, Z - 20, 1.8])
M.face("valance", [-8.6, Z - 20.01, 1.8], [4.8, Z - 20.01, 1.8], [4.8, Z - 20.01, 1.5], [-8.6, Z - 20.01, 1.5])
stick("wood", [-8.8, -16.4, 2.4], [5.0, -16.4, 2.4], 0.12)
for (const x of [-8.5, 4.7]) pole("wood", x, -20.1, 0.08, -1, 1.8)
// The lighthouse, a miniature on its islet: a tapering round tower, white with red bands, a gallery,
// its lantern of glass under a red cap; the rock in lumps.
const LH = [14.0, 16.3]
const lump = (cx, cz, r, n, u1, seed) => prism("rock", "rock", Array.from({ length: n }, (_, i) => { const a = (2 * Math.PI * i) / n, rr = r * (0.8 + 0.4 * hash(i, seed)); return [cx + rr * Math.cos(a), cz + 0.7 * rr * Math.sin(a)] }), -0.3, u1)
lump(LH[0], LH[1], 2.0, 9, 0.7, 61); lump(LH[0] - 1.8, LH[1] - 0.7, 1.0, 7, 0.35, 62); lump(LH[0] + 1.9, LH[1] - 0.4, 0.8, 6, 0.25, 63)
M.loft("tower", Array.from({ length: 6 }, (_, j) => Array.from({ length: 11 }, (_, i) => { const r = 0.62 - j * 0.04, a = (2 * Math.PI * i) / 10; return [LH[0] + r * Math.cos(a), Z + LH[1] + r * Math.sin(a), 0.7 + j * 0.7] })))
pole("wood", LH[0], LH[1], 0.55, 4.2, 4.32, 10)
pole("glass", LH[0], LH[1], 0.32, 4.32, 4.8, 8)
M.loft("red", [Array.from({ length: 9 }, (_, i) => [LH[0] + 0.42 * Math.cos((i * Math.PI) / 4), Z + LH[1] + 0.42 * Math.sin((i * Math.PI) / 4), 4.8]), Array.from({ length: 9 }, () => [LH[0], Z + LH[1], 5.2])])
prism("haze", "haze", [[-26, 16], [-12, 16], [-13, 22], [-26, 22]], -0.3, 1.2)

// ---------------------------------------------------------------- people
// The ship's bob: a slow roll about its keel and a heave, one in 48 frames (4.8 s); its lines' ends on
// the pier.
const SHIPC = [0, Z + ZC, 0]
const shipPose = (f) => ({ th: 0.008 * Math.sin((2 * Math.PI * f) / 48), dh: 0.05 * Math.sin((2 * Math.PI * f) / 48 + 1.3) })
// The crew at work (lib/characters/crew.px.js): Alden with Edith and the braided companion left of the gangway
// (his passage below), the grey-haired captain in his long coat at its foot; a sailor in a
// bandana and a bearded dockhand talking in the middle of the pier, turned to each other; the docker
// in the flat cap and apron carrying a crate held low in front between the stack and the big boat,
// there and back, 2.6 m, at his shortened stride's own pace (0.7 of the walk's across, at the pier's px
// to the meter, nearer us than where the camera looks: no sliding), a breath and a turn at each end; a ginger
// dockhand at the stack, one in a grey cap at the crane's winch; on the ship, a sailor at the waist's
// rail and an officer on the poop, riding its bob; the lanterns.
const idle = (f) => Math.floor(f / 3) % 4
const PACE = (dir) => traveler.pace(dir) / PPM
const carrier = (f) => {
  const z = Z - 8.25, STEP = (0.7 * traveler.pace("e")) / CAM.scale(z), LEG = Math.round(2.6 / STEP), T = LOOP / 2 - LEG, x0 = 4.2, x1 = x0 + LEG * STEP, t = f % LOOP
  const [x, dir, walking] = t < LEG ? [x0 + t * STEP, "e", true] : t < LEG + T ? [x1, "e", false] : t < 2 * LEG + T ? [x1 - (t - LEG - T) * STEP, "w", true] : [x0, "w", false]
  return [{ name: `crew.car_${walking ? "carry" : "carryidle"}_${dir}`, at: [x, z], frame: walking ? f % 8 : idle(f) }]
}
const ONSHIP = [...LANTERNS, { name: "crew.sab_idle_s", at: [2.8, Z + hullZ(2.8, DECK) + 0.45, DECK] }, { name: "crew.off_idle_sw", at: [7.7, Z + hullZ(7.7, DECK) + 0.9, POOP] }]
const onShip = (f) => { const { th, dh } = shipPose(f); return ONSHIP.map((p) => ({ ...p, at: turnPt(p.at, SHIPC, [1, 0, 0], th, dh), frame: idle(f) })) }
// Seagulls crossing on the wind, each once a loop at its own height and depth, gliding and now and
// then flapping (8 frames of flaps in 24), rising and falling a little; one low over the boats the
// other way.
const GULLS = [[-6, 12, 3.0, 1, 0], [10, 4, 5.2, 1, 11], [-14, -12.5, 5.6, -1, 17]]
const gulls = (f) => GULLS.map(([x0, z, u, way, o], i) => {
  const s = (f % LOOP) / LOOP, t = (f + o) % 24
  return { name: way > 0 ? "_gull" : "_gull_l", at: [-22 + ((((x0 + 22 + way * 44 * s) % 44) + 44) % 44), Z + z, u + 0.35 * Math.sin(4 * Math.PI * s + i)], frame: t < 8 ? t % 4 : 1, shadow: 0, air: true }
})
// ---------------------------------------------------------------- the story
// Alden's passage, on the scene's clock (100 ms a frame), as in the graveyard: he comes in from the
// left along the upper walkway, in view within a second, goes down the ramp and along the pier to the
// captain at the gangway, stands beside him and asks; the captain turns to him (a direction every two
// frames) and answers; he goes up the gangway, onto the deck and through the stern castle's door, out
// of sight; the wait that rounds the loop comes after he has gone. Each leg walked in one of the 8
// directions at the walk's own pace by its way (no sliding), his feet at the height of what is
// under them: the walkway, the ramp, the pier, the gangway and the deck riding the ship's bob.
const feetAt = (x, z) => {
  const s = ((x + 8.4) * 0.7071 - (z + 5.4) * 0.7071) / 2.8, across = (x + 8.4) * 0.7071 + (z + 5.4) * 0.7071
  if (x > -1.0 && x < 1.6 && z > -5.3) return z >= hullZ(x, DECK) ? DECK : LOWER + ((DECK - LOWER) * (z + 5.3)) / (hullZ(x, DECK) + 5.3)
  if (z > -2.7 && x > -3.2 && x < 4.6) return DECK
  if (s >= 0 && s <= 1 && Math.abs(across) < 0.85) return UPPER + (LOWER + 0.02 - UPPER) * s
  return x <= -9.2 || (x <= -7.4 && z >= x + 3.0 - 1e-6) ? UPPER : LOWER
}
const onBoard = (x, z) => z > Z - 5.3 && x > -1.0 && x < 4.6   // z in the world's
const visit = route({ pace: PACE, origin: [0, Z], ground: (x, z) => feetAt(x, z - Z), climb: true, walk: "crew.tr_walk", idle: { anim: "crew.tr_idle", frame: idle }, loop: LOOP }, [
  [-11.6, -8.6], [-8.4, -5.4],                     // in from the left along the walkway, to the ramp's head
  [-6.42, -7.38],                                  // down the ramp
  [-1.0, -7.38],                                   // along the pier
  [0.0, -6.38],                                    // beside the captain, facing him
  { hold: 72, name: "talk", dir: "e" },
  { to: [0.0, -5.3], name: "gangway" },            // to the gangway
  [0.0, -2.6],                                     // up it
  { to: [0.0, -1.9], name: "deck" },
  [4.4, -1.9],                                     // across the deck and in at the stern castle's door
])
const FRAMES = visit.frames, TALK = visit.start("talk"), TALKED = visit.start("gangway")
// where Alden is at frame f (null: gone), riding the ship's bob when aboard
const alden = (f) => {
  const a = visit(f)
  if (a && onBoard(a.at[0], a.at[1])) { const { th, dh } = shipPose(f); a.at = turnPt(a.at, SHIPC, [1, 0, 0], th, dh) }
  return a
}
// the captain at the gangway's foot: watching the pier, turning to Alden when he asks, then after him
// as he goes up, and back when he has gone; a direction every two frames
const CAPTAIN = [1.15, -6.3], GONE = visit.total
const CAPTURNS = [[0, "sw"], [TALK + 2, "w"], [TALKED + 6, "nw"], [TALKED + 8, "n"], [GONE + 8, "nw"], [GONE + 10, "w"], [GONE + 12, "sw"]]
const captain = (f) => ({ name: `crew.cap_idle_${CAPTURNS.filter(([k]) => k <= f).at(-1)[1]}`, at: [CAPTAIN[0], Z + CAPTAIN[1], LOWER], frame: idle(f) })
// Edith and the companion by the gangway, watching him: each turns toward him a direction every two
// frames while he is near, and back to the pier when he has gone
const watchers = [["mo", -3.2, -5.75], ["cmp", -2.3, -5.6]].map(([who, x, z]) => turnToward(`crew.${who}_idle`, [x, Z + z], alden, { within: 6.5, frame: idle }))
// the two talking in the middle of the pier: now one, now the other turns his head toward us and back
const talkers = (f) => [
  { name: `crew.sai_idle_${f % 64 >= 10 && f % 64 < 26 ? "se" : "e"}`, at: [2.55, Z - 7.9], frame: idle(f) },
  { name: `crew.dkb_idle_${f % 64 >= 40 && f % 64 < 56 ? "sw" : "w"}`, at: [3.4, Z - 7.75], frame: (idle(f) + 2) % 4 },
]
const SAYS = [
  [3, 25, "Alden", ["Is this the ship", "to Port Winds?"], () => visit.step("talk").a, -1],
  [28, 50, "Captain", ["Aye. We sail", "with the tide."], () => CAPTAIN, 1],
  [53, 70, "Alden", ["Then I'm aboard."], () => visit.step("talk").a, -1],
].map(([t0, t1, name, lines, who, side]) => [t0, t1, name, lines, () => { const [x, z] = who(); return [x, Z + z, LOWER] }, side])
// The dialogue boxes, over the speaker's head and off to one side (side: 1 right, -1 left): bubble()
// in dialog.px.js's parchment
const say = (c, [x, z, u], name, lines, side, t) => {
  const [hx, hy] = CAM.ground(x, z, u + 2.1)
  c.bubble(hx, hy - 1.5, name, lines, { ...dialog.PARCHMENT, side, t })
}
const talk = (c, f = c.frame) => {
  const t = f - TALK
  for (const [t0, t1, name, lines, who, side] of SAYS) if (t >= t0 && t < t1) say(c, who(), name, lines, side, t - t0)
}
const people = (f) => [
  ...[alden(f)].filter(Boolean), captain(f), ...watchers.map((w) => w(f)), ...talkers(f),
  { name: "crew.dkg_idle_ne", at: [5.7, Z - 6.7], frame: (idle(f) + 1) % 4 },
  { name: "crew.crn_idle_e", at: [-11.25, Z - 5.3], frame: idle(f) },
  ...carrier(f), ...onShip(f), ...gulls(f), ...PROPS, ...boatCargo(f),
]
// Afternoon (SUNV, the sails' light, is the same way): the sun behind on the right, high and warm (the water glitters toward us, the shadows
// fall toward us and to the left), the shade a cool sky blue strong enough that the hull's near side,
// turned from the sun, still reads pale.
const LIGHT = { light: [0.35, 0.75, 0.6], sun: { color: "#ffe0b0", strength: 1.3 }, sky: { color: "#b8c8e0", strength: 0.7 }, emit: "f" }
const CLOCK = { frames: FRAMES, fps: 1000 / MS }
// what moves, per frame: the galleon (and its sails) on its bob with its reflection, the boats, the
// crane's load, the lines
const faces = (f) => {
  const { th, dh } = shipPose(f), ship = turn([...SHIPF, ...SAILS[f % SAILF]], SHIPC, [1, 0, 0], th, dh), D = model()
  crane(D, f); lines(D, f)
  return [...M.faces, ...ship, ...ship.map((F) => ({ mat: F.mat + "_r", pts: F.pts.map(([x, z, u]) => [x, z, -u]) })), ...boats(f), ...D.faces]
}
// The scene, its clock starting `from` a frame of the story; through the camera at its sizes (post(), in
// the art's pixels): the pier and the boats sharp, the awning near us and the far water blurred (its glints
// into bokeh), a light haze far off, a bloom; every face in blocks of a sprite's pixel (c.k px).
const camera = (name, o, from = 0) => scene(name, { w: W, h: H, bg: "b", fps: 1000 / MS, ...o },
  (c) => c.mesh(CAM, faces(c.frame + from), mats(c.frame + from, c.k), { sprites: people(c.frame + from), stand: true, ...LIGHT }),
  post({ blur: 9, focus: [W / 2, H * 0.64], sharp: 5.5, soft: [4, 10], fog: { color: "#8fb8d6", from: DIST + 20, to: DIST + 60, max: 0.25 }, bloom: { strength: 1.0, r: 12, above: 0.86 }, vignette: 0.3 }),
  (c) => talk(c, c.frame + from))
// `harbor` checked one frame in 24 (the lit side, the feet on the model: stand: true sets the people on
// the pier on it; the gulls fly, the lanterns hang), the tests kept fast. `harbor_md` twice as
// big (960x540).
camera("harbor", { frames: FRAMES, check: { every: 24 }, sizes: { harbor_md: 2 } })
// The gallery's excerpt (`harbor_clip`, 960x540): the story's middle at the full frame rate, from
// Alden's last steps to the captain through the talk to the head of the gangway (the whole loop's GIF,
// 38 s of water moving everywhere, would run to 28 MB).
const CLIP0 = TALK - 12
camera("harbor_clip", { w: W * 2, h: H * 2, pixel: 2, frames: visit.start("deck") - CLIP0, check: false }, CLIP0)
