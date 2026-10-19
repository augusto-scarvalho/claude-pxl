// "Sodium Hour": a sun-bleached Californian megacity at dusk, the moment its lights come on.
// Flat side view across a street: the sidewalk at our feet, four lanes of traffic, a row of low
// stucco and concrete shops, an elevated freeway behind them, then the towers and megabuildings
// fading into the dust haze, the farthest barely darker than the sky.
// Light: the sun, low in the west (left of frame), sinking into the haze over the far city. Its last
// rays come in nearly level from the left: they gild the tops and west edges of what stands tall and
// a glass tower throws the sun back at us; everything below about the freeway's height is already
// in the city's shadow, lit by what is switching on: sodium street lamps, shop signs, windows,
// billboard floods and headlights.
// 320x180, loops in 36 s (360 frames at 10 fps). What crosses the frame travels a 360 px strip.
pal({
  k: "#141819",                                                              // ink
  A: "#4e5a54", B: "#6b6c58", C: "#8a7e5c", D: "#a68e5e", E: "#bb9c62",      // sky, top down
  F: "#cdaa68", G: "#dcb872", H: "#e8c886", I: "#f2dca4", J: "#fbf0cc",
  a: "#8a7c5a", b: "#9a8a5e", c: "#ab9762", d: "#bca468",                    // far towers in the haze
  1: "#212b2b", 2: "#2e3d3a", 3: "#40504a", 4: "#56645a", 5: "#717a68",      // concrete in shadow
  6: "#a08a5e", 7: "#c2a26a", 8: "#ddbd7e", 9: "#f0d89e",                    // concrete in the last sun
  g: "#1d3133", h: "#2a4443", i: "#3c5d56", j: "#668670",                    // tinted glass
  K: "#4e3c2e", L: "#6c5640", M: "#8c7252", N: "#ab9064",                    // stucco
  r: "#3a1c1a", s: "#5c2822", x: "#843a2a", y: "#a85438",                    // grimy red paint
  O: "#b0501e", P: "#da7228", Q: "#f09a3a", R: "#ffc464", W: "#fff0c2",      // sodium light
  t: "#2a7266", u: "#45a08a", v: "#8ccfb2",                                  // teal neon, holo
  n: "#c43a28", m: "#ff6e46",                                                // red neon
  p: "#c6d4a4",                                                              // fluorescent window
  e: "#252321", f: "#34302c", z: "#48423a",                                  // asphalt
  q: "#4c3828", w: "#6a4a2e",                                                // asphalt under a sodium lamp
  Z: "#5e5648", Y: "#7c715c", o: "#866848", l: "#a6804e",                    // sidewalk, lit
  S: "#d09a74", T: "#9a6846", U: "#5c3c2a",                                  // skin
  V: "#d4cbb0",                                                              // off-white cloth, paper
})
ramps("ABCDEFGHIJ", "abcd", "k12345", "6789", "ghij", "KLMN", "rsxy", "OPQRW", "tuv", "nm", "efz", "qw", "ZY", "ol", "UTS")

include("../fonts/font5x7.px.js")   // a 5x7 font for the billboard

const W = 320, H = 180, FPS = 10, L = 360, P = 360
const SX = 40, SY = 76            // the sun
const HB = 86                     // freeway barrier top
const NB = 152                    // foot of the street-front buildings

// ordered dither: banded tones with dithered seams. v runs over the ramp's indices.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
const bayer = (x, y) => (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16
const tone = (ramp, v, x, y, sharp = 3) => {
  const i = Math.floor(v), f = Math.min(1, Math.max(0, (v - i - 0.5) * sharp + 0.5))
  return ramp[Math.min(ramp.length - 1, Math.max(0, i + (f > bayer(x, y) ? 1 : 0)))]
}
const hash = (a, b = 0) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296 }

// ================================================================ sky
// Dusty slate overhead, thickening to pale dust toward the horizon, brightest around the sun. The
// glow spreads wide along the horizon: the haze scatters it sideways.
const SKY = "ABCDEFGHIJ"
const skyV = (x, y) => {
  const base = 8.2 * Math.pow(Math.min(1, y / 128), 0.8)
  const d = Math.hypot((x - SX) / 2.6, (y - SY) * 1.1)
  return Math.min(9, base + 3.4 * Math.exp(-d / 20))
}
sprite("_sky", { w: W, h: 132 }, (c) => {
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) c.px(x, y, tone(SKY, skyV(x, y), x, y))
  c.circ(SX, SY, 8, "J")
})

// ================================================================ far city, in the haze
// [x, w, top, kind]: b block, s stepped crown, n needle mast, t twin prongs, p pyramid, c chamfer
function tower(c, [x, w, top, kind = "b"], body, rim, base, lit, litP) {
  const r = c.rng(x * 31 + top)
  const mid = x + (w >> 1)
  if (kind === "s") { c.rect(x, top + 6, w, base - top - 6, body); c.rect(x + 2, top + 3, w - 4, 3, body); c.rect(x + 4, top, w - 8, 3, body) }
  else if (kind === "t") {
    const pw = Math.max(3, Math.round(w * 0.38))
    c.rect(x, top + 10, w, base - top - 10, body); c.rect(x, top, pw, 10, body); c.rect(x + w - pw, top + 3, pw, 7, body)
  } else if (kind === "p") { c.rect(x, top + 8, w, base - top - 8, body); for (let i = 0; i < 4; i++) c.rect(x + 2 + i * 2, top + 6 - i * 2, w - 4 - i * 4, 2, body) }
  else if (kind === "c") { c.rect(x, top + 4, w, base - top - 4, body); c.poly([x, top + 4, x + 4, top, x + w, top, x + w, top + 4], body) }
  else { c.rect(x, top, w, base - top, body); if (w > 8) c.rect(x + 2 + Math.floor(r() * (w - 8)), top - 2, 4, 2, body) }
  if (kind === "n") c.vline(mid, top - 12, 12, body)
  if (rim) for (let y = top; y < base; y++) if (c.is(x, y, body)) c.px(x, y, rim)
  if (lit) for (let y = top + 3; y < base; y += 3) for (let xx = x + 2; xx < x + w - 1; xx += 3)
    if (c.is(xx, y, body) && r() < litP) c.px(xx, y, lit)
}
// the farthest: broad low masses, only a shade darker than the horizon
const FAR2 = [[0, 30, 92], [26, 28, 82, "s"], [52, 22, 90], [70, 40, 84, "c"], [106, 30, 78, "p"], [132, 26, 88], [152, 44, 82, "s"],
  [192, 30, 76], [218, 40, 88, "c"], [254, 30, 80], [280, 40, 90, "s"]]
// the far city: towers, a few with masts and crowns. Around the sun (x 28..52) they stay low, so it sets
// behind them; behind the megabuilding one giant rises above everything, its twin prongs in the dust
const FAR1 = [[0, 12, 62, "n"], [10, 16, 80], [54, 9, 52, "n"], [62, 18, 68, "s"], [78, 14, 60], [112, 14, 42, "t"],
  [124, 20, 58, "c"], [140, 12, 48, "n"], [210, 22, 6, "t"], [232, 12, 40], [254, 10, 32, "n"], [300, 20, 28, "s"]]
sprite("_far2", { w: W, h: 132 }, (c) => FAR2.forEach((t) => tower(c, t, "d", null, 132, "R", 0.02)))
sprite("_far1", { w: W, h: 132 }, (c) => FAR1.forEach((t) => tower(c, t, "b", "c", 132, "Q", 0.035)))

// ================================================================ mid city
const SUNLINE = 66               // the city's shadow: below this row the sun no longer reaches
// a west face, lit while above the shadow line, its light fading down through the dust
const westFace = (c, x, w, top, base, shadow = "4") => {
  for (let y = top; y < base; y++) for (let i = 0; i < w; i++) {
    const v = 3.2 - Math.max(0, (y - 14) / 22) + (i === 0 ? 0.4 : 0)       // 9 high up, 6 near the line
    c.px(x + i, y, y < SUNLINE - 2 || (y < SUNLINE + 2 && bayer(x + i, y) < (SUNLINE + 2 - y) / 4) ? tone("6789", Math.max(0, v), x + i, y) : shadow)
  }
}
const winGrid = (c, x, y, cols, rows, dx, dy, ww, wh, dark, litKeys, p, seed) => {
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const hsh = hash(seed + i, j), k = hsh < p ? litKeys[Math.floor(hash(seed + j, i) * litKeys.length)] : dark
    c.rect(x + i * dx, y + j * dy, ww, wh, k)
  }
}

// the glass tower: three tiers and a crown of fins, a mast with a beacon. Its west face takes the
// sun; the sun's reflection runs down the glass by that edge.
const CORP = { x: 80, w: 31, top: 30 }
function corpTower(c) {
  const { x, w, top } = CORP
  const tiers = [[x, w, top], [x + 4, w - 8, top - 6], [x + 7, w - 14, top - 12]]
  for (const [tx, tw, tt] of tiers) {
    for (let y = tt; y < 132; y++) for (let xx = tx; xx < tx + tw; xx++) c.px(xx, y, (y - tt) % 4 === 3 ? "g" : "h")
    westFace(c, tx, 2, tt, 132, "i")
    c.hline(tx + 2, tt, tw - 2, "8"); c.vline(tx + tw - 1, tt + 1, 131 - tt, "g")
  }
  for (let fx = x + 9; fx < x + w - 9; fx += 2) c.vline(fx, top - 20, 8 + ((fx >> 1) % 2) * 2, fx === x + 9 ? "8" : "i")
  c.vline(x + 15, top - 30, 11, "3"); c.px(x + 15, top - 30, "4")
  // the sun's reflection: a streak down the glass, sharpest high up
  for (let y = top + 1; y < 120; y++) {
    if ((y - top) % 4 === 3) continue
    const s = y < 72 ? "j" : "i"
    c.px(x + 5, y, s); if (y < 96) c.px(x + 6, y, y < 60 ? "j" : "i"); if (y < 56 && bayer(x + 4, y) < 0.5) c.px(x + 4, y, "i")
  }
  // offices: more of them lit lower down, where the evening has come already
  for (let y = top + 1; y < 128; y += 4) for (let xx = x + 9; xx < x + w - 2; xx += 3) {
    const pr = y > SUNLINE ? 0.16 : 0.05
    if (hash(xx, y) < pr) c.hline(xx, y, 2, hash(y, xx) < 0.7 ? "p" : "R")
  }
  // the crown emblem, an invented mark: a ring around a diamond, sodium-lit
  c.ring(x + 15, top - 2, 3, "Q"); c.px(x + 15, top - 2, "R")
}

// the mid-rise behind the holo-ad, in the glass tower's shadow: a water tank, an aerial
function midRise(c) {
  c.rect(112, 54, 34, 78, "3"); c.hline(112, 54, 34, "4")
  winGrid(c, 114, 58, 8, 14, 4, 5, 2, 3, "2", "RQp", 0.18, 11)
  c.rect(119, 45, 9, 6, "2"); c.hline(119, 47, 9, "1"); c.hline(119, 45, 9, "3"); c.vline(120, 51, 3, "1"); c.vline(126, 51, 3, "1")
  c.vline(140, 38, 16, "1"); c.hline(138, 42, 5, "1"); c.hline(139, 46, 3, "1")
  c.rect(132, 50, 6, 4, "2"); c.hline(132, 50, 6, "4")
}

// the megabuilding: three service cores and, between them, slabs of floors stacked like shelves,
// each floor a lip, a band of concrete, a shadow and a strip of windows; grime runs down from the lips
const MEGA = { cores: [[146, 12, 30], [194, 12, 24], [242, 12, 32]], slabs: [[158, 36, 40], [206, 36, 44]] }
const SCREEN = [162, 47, 28, 18]
function megaBlock(c) {
  const r = c.rng(5)
  for (const [sx, sw, st] of MEGA.slabs) {
    for (let y = st; y < 132; y++) {
      const f = (y - st) % 6
      c.hline(sx, y, sw, f === 0 ? "4" : f < 3 ? "3" : f === 3 ? "1" : "2")
      if (f >= 4) for (let xx = sx + 1; xx < sx + sw - 1; xx += 4) {
        const fl = Math.floor((y - st) / 6), hh = hash(xx, fl * 7)
        c.hline(xx, y, 3, hh < (y > SUNLINE ? 0.22 : 0.08) ? (hash(fl, xx) < 0.6 ? "Q" : hash(fl, xx) < 0.8 ? "R" : "p") : "g")
      }
    }
    // grime from the lips, where the condensate runs off
    for (let k = 0; k < sw * 1.2; k++) {
      const xx = sx + Math.floor(r() * sw), fl = Math.floor(r() * 15), yy = st + fl * 6 + 1
      c.vline(xx, yy, 1 + Math.floor(r() * 2), "2")
    }
  }
  for (const [cx, cw, ct] of MEGA.cores) {
    c.rect(cx, ct, cw, 132 - ct, "3")
    c.hline(cx, ct, cw, "8")
    // slits up the core, a few lit
    for (let y = ct + 4; y < 128; y += 7) for (let xx = cx + 3; xx < cx + cw - 2; xx += 3)
      c.vline(xx, y, 4, hash(xx, y) < 0.12 ? "Q" : "1")
    // vents near the top: grilles
    for (let i = 0; i < 3; i++) c.hline(cx + 2, ct + 1 + i, cw - 4, i % 2 ? "2" : "1")
    const slabTop = cx === 146 ? 132 : MEGA.slabs.find(([sx]) => sx + 36 === cx)?.[2] ?? 132
    westFace(c, cx, 2, ct + 1, slabTop)
    c.vline(cx + cw - 1, ct + 1, 131 - ct, "2")
  }
  c.rect(SCREEN[0] - 1, SCREEN[1] - 1, SCREEN[2] + 2, SCREEN[3] + 2, "k")
  // a crane on the middle core: lattice mast, jib, counterweight, hook
  const mx = 198
  for (let y = 6; y < 24; y++) { c.px(mx, y, "1"); c.px(mx + 2, y, "1"); if (y % 2) c.px(mx + 1, y, "2") }
  c.hline(182, 6, 48, "1"); for (let xx = 184; xx < 230; xx += 2) c.px(xx, 7, "1")
  c.rect(184, 7, 6, 3, "2"); c.line(mx + 1, 1, 186, 6, "1"); c.line(mx + 1, 1, 228, 6, "1")
  c.vline(222, 8, 9, "2"); c.rect(221, 17, 3, 2, "1")
}

// the slender tower: chamfered crown, two teal light strips up its edges
function rightTower(c) {
  const x = 262, w = 36, top = 16
  c.poly([x, top + 6, x + 6, top, x + w - 6, top, x + w, top + 6, x + w, 132, x, 132], "i")
  for (let y = top + 9; y < 132; y += 4) c.hline(x, y, w, "h")
  for (let y = top + 4; y < 132; y++) for (let xx = x + 4; xx < x + w - 4; xx += 3) if ((y - top) % 4 === 2 && hash(xx, y) < 0.1) c.hline(xx, y, 2, "p")
  westFace(c, x, 2, top + 6, 132, "h")
  c.line(x, top + 6, x + 6, top, "8"); c.hline(x + 6, top, w - 12, "8")
  c.vline(x + 4, top + 6, 126 - top, "t"); c.vline(x + w - 5, top + 6, 126 - top, "t")
  c.vline(x + 18, top - 12, 12, "3")
}

sprite("_mid", { w: W, h: 132 }, (c) => {
  // the low block beside the sun, black against the glare
  c.rect(56, 72, 24, 60, "3"); c.hline(56, 72, 24, "4")
  winGrid(c, 58, 76, 5, 11, 4, 5, 2, 2, "2", "RQ", 0.2, 3)
  c.rect(60, 68, 6, 4, "2"); c.vline(74, 62, 10, "1")
  c.rect(298, 36, 22, 96, "4"); winGrid(c, 300, 40, 5, 18, 4, 5, 2, 3, "3", "RQp", 0.15, 9)
  c.rect(254, 60, 8, 72, "3")
  midRise(c)
  corpTower(c)
  megaBlock(c)
  rightTower(c)
})


// ================================================================ the elevated freeway
// in the city's shadow already: a barrier wall and the deck's face on round-headed piers, sodium
// lamps on the barrier, a sign gantry. Cars run behind the barrier, only their roofs and lights show.
const PIERS = [16, 92, 156, 236, 300]
const HLAMPS = [10, 50, 90, 170, 210, 250, 290]
sprite("_hwy", { w: W, h: NB }, (c) => {
  for (const px of PIERS) {
    c.rect(px, 97, 8, NB - 97, "3"); c.vline(px, 97, NB - 97, "4"); c.vline(px + 7, 97, NB - 97, "2")
    c.rect(px - 3, 97, 14, 3, "3"); c.hline(px - 3, 99, 14, "2"); c.hline(px - 2, 100, 12, "1")
    for (let y = 104; y < NB; y += 9) c.hline(px + 1, y, 6, "2")              // the joints of its precast rings
  }
  c.hline(0, HB, W, "5"); c.rect(0, HB + 1, W, 2, "4")                       // barrier
  c.hline(0, HB + 3, W, "2"); c.rect(0, HB + 4, W, 6, "3"); c.hline(0, HB + 10, W, "2"); c.hline(0, HB + 11, W, "1")
  for (let x = 30; x < W; x += 64) c.vline(x, HB + 3, 9, "2")                // expansion joints
  for (let x = 0; x < W; x += 8) c.px(x + 3, HB + 2, "3")                    // drain holes along the barrier
  // stains bleeding from the drain holes down the deck face
  for (let x = 3; x < W; x += 8) if (hash(x, 3) < 0.4) c.vline(x, HB + 4, 2 + Math.floor(hash(x, 4) * 4), "2")
  for (const lx of HLAMPS) { c.vline(lx, HB - 13, 13, "2"); c.hline(lx, HB - 13, 4, "2"); c.hline(lx + 2, HB - 12, 3, "1"); c.px(lx + 3, HB - 11, "R") }
  // the gantry over the lanes, a sign for the next exit
  c.vline(119, 66, HB - 66, "2"); c.vline(151, 66, HB - 66, "2"); c.hline(117, 66, 37, "1")
  c.rect(121, 68, 29, 11, "t"); c.box(121, 68, 29, 11, "2"); c.hline(122, 69, 27, "u")
  c.text(124, 71, "EXIT", "v"); c.line(141, 75, 145, 71, "v"); c.hline(143, 71, 3, "v"); c.vline(145, 71, 3, "v")
})

// ================================================================ the street-front: five buildings
// In the city's shadow: lit only by the sky above and by their own windows and signs. Grime gathers
// where water runs (under sills and AC units, down from roofs) and splashes back up from the sidewalk.
const grimeBase = (c, x, w, key) => { for (let xx = x; xx < x + w; xx++) { c.px(xx, NB - 1, key); if (bayer(xx, NB - 2) < 0.5) c.px(xx, NB - 2, key); if (bayer(xx, NB - 3) < 0.15) c.px(xx, NB - 3, key) } }
const drip = (c, x, y, len, key) => { c.vline(x, y, len, key); if (len > 3) c.vline(x + 1, y, len - 2, key) }
const acUnit = (c, x, y, side = "5") => { c.rect(x, y, 6, 4, side); c.hline(x, y, 6, "V"); c.px(x + 1, y + 1, "4"); c.px(x + 3, y + 1, "4"); c.px(x + 1, y + 2, "4"); c.px(x + 3, y + 2, "4"); c.hline(x, y + 4, 6, "1") }

// 1. the taco stand: a stucco box, a striped awning over a hot kitchen window, a pole sign
function tacoStand(c) {
  c.rect(0, 124, 64, NB - 124, "L"); c.hline(0, 124, 64, "N"); c.hline(0, 125, 64, "M"); c.hline(0, 126, 64, "K")
  c.rect(3, 133, 36, 14, "Q"); c.rect(3, 133, 36, 3, "R"); c.box(2, 132, 38, 16, "K")
  c.rect(6, 136, 10, 6, "k"); for (let y = 137; y < 141; y += 2) c.hline(7, y, 8, "V")       // the menu board
  c.rect(21, 137, 3, 3, "U"); c.rect(20, 140, 5, 6, "V"); c.hline(20, 140, 5, "N")        // the cook, at the plancha
  c.rect(28, 141, 9, 2, "5"); c.px(30, 140, "V"); c.px(33, 139, "V"); c.px(31, 138, "V")   // and its steam
  c.hline(3, 146, 36, "N")                                                                // the counter
  for (let x = 1; x < 42; x++) { const k = Math.floor((x - 1) / 3) % 2 ? "V" : "x"; c.vline(x, 128, 3, k); if ((x - 1) % 3 !== 2) c.px(x, 131, k) }
  c.hline(1, 127, 41, "s")
  c.rect(44, 133, 8, 19, "Q"); c.box(43, 132, 10, 20, "K"); c.vline(51, 134, 16, "R")       // the door, open
  acUnit(c, 8, 119); c.rect(30, 116, 3, 8, "4"); c.rect(29, 115, 5, 2, "3")
  grimeBase(c, 0, 64, "K"); drip(c, 12, 127, 2, "K")
  // the pole sign: a box of bulbs on a steel pole
  c.rect(54, 110, 2, NB - 110, "2"); c.rect(40, 98, 25, 13, "r"); c.box(40, 98, 25, 13, "s")
  c.text(43, 102, "TACOS", "R")
}

// 2. two storeys of stucco: flats over a liquor store
function liquor(c) {
  c.rect(64, 108, 64, NB - 108, "K"); c.hline(64, 108, 64, "N"); c.hline(64, 109, 64, "M"); c.hline(64, 110, 64, "U")
  const win = (x, glass) => { c.rect(x, 115, 10, 11, glass); c.box(x - 1, 114, 12, 13, "U"); c.hline(x - 1, 127, 12, "M") }
  win(70, "Q"); for (let y = 116; y < 126; y += 2) c.hline(70, y, 10, "R")                    // lit, blinds down
  win(92, "h")
  win(112, "g"); c.rect(112, 115, 10, 3, "h")
  acUnit(c, 114, 120); drip(c, 117, 128, 6, "U"); drip(c, 75, 128, 3, "U"); drip(c, 96, 128, 4, "U")
  c.rect(64, 129, 64, 3, "L"); c.hline(64, 129, 64, "M"); c.hline(64, 131, 64, "U")
  // the storefront: shelves of bottles behind posters
  c.rect(67, 135, 36, 13, "p"); c.box(66, 134, 38, 15, "K")
  for (let y = 137; y < 147; y += 3) { c.hline(67, y + 1, 36, "5"); for (let x = 68; x < 102; x += 2) c.px(x, y, ["x", "R", "u", "s", "Q", "V"][Math.floor(hash(x, y) * 6)]) }
  c.rect(70, 139, 7, 9, "Q"); c.rect(71, 140, 5, 3, "n"); c.hline(71, 144, 5, "k"); c.hline(71, 146, 3, "k")    // a poster: fight night
  c.rect(92, 136, 8, 6, "V"); c.hline(93, 137, 6, "x"); c.hline(93, 139, 4, "k")                               // a sale sign
  c.rect(107, 134, 9, 18, "p"); c.box(106, 133, 11, 19, "K"); c.vline(114, 140, 3, "5")
  c.vline(126, 111, NB - 111, "L"); c.hline(125, 149, 3, "L")                                                     // downspout
  grimeBase(c, 64, 64, "U")
}

// 3. the lot: a chain-link fence, palms, a warehouse behind, the freeway pier between
// a fan palm, the city's own: a spiky ball of stiff fan leaves, under it the skirt of dead fronds
// nobody trimmed. High enough, its west spikes catch the sun.
sprite("_palmhead", `
  ......1..1.....
  ..1...1..1..1..
  ...1..1.1..1...
  1...1.1.1.1...1
  .11..11111..11.
  ...111111111...
  .1111112111111.
  1..111222111..1
  ..11112221111..
  .1..1111111..1.
  ...1.KUUUK.1...
  ....KUUUUUK....
  ....UUUUUUU....
  .....UUUUU.....
  ......UUU......`)
sprite("_palmhead_lit", { base: "_palmhead" }, runs({ 0: [[6, "7"]], 1: [[2, "7"]], 2: [[3, "7"]], 3: [[0, "7"], [4, "7"]], 4: [[1, "77"]], 5: [[3, "7"]], 6: [[1, "77"]], 7: [[0, "7"]] }))
function palm(c, x, y0, top, lean) {
  // the trunk: a slim curve, ringed, its west edge catching what sun reaches that high
  for (let y = y0; y >= top; y--) {
    const t = (y0 - y) / (y0 - top), px = Math.round(x + lean * t * t)
    c.px(px, y, y < SUNLINE + 4 ? "7" : (y % 3) ? "L" : "K"); c.px(px + 1, y, "K")
  }
  c.stamp(top < SUNLINE ? "_palmhead_lit" : "_palmhead", x + lean - 7, top - 7)
}
function lot(c) {
  c.rect(128, 116, 56, NB - 116, "4"); c.hline(128, 116, 56, "5")
  for (let x = 129; x < 184; x += 3) c.vline(x, 117, 20, "3")                      // ribbed metal
  c.rect(136, 124, 22, 14, "5"); for (let y = 125; y < 138; y += 2) c.hline(136, y, 22, "4")   // roll door
  c.rect(163, 120, 16, 10, "2"); c.ring(171, 128, 5, "O"); c.hline(165, 128, 13, "O"); c.hline(166, 126, 11, "s")  // a faded painted sun
  c.rect(128, 138, 56, NB - 138, "f")
  // a sedan parked inside, nose to the fence
  c.rect(156, 142, 22, 6, "2"); c.rect(160, 139, 12, 3, "2"); c.rect(161, 140, 4, 2, "h"); c.rect(166, 140, 5, 2, "h")
  c.rect(157, 148, 4, 2, "1"); c.rect(172, 148, 4, 2, "1")
  palm(c, 166, NB - 2, 48, 3); palm(c, 179, NB - 2, 60, -2)
  // a sodium lamp over the lot
  c.vline(131, 108, NB - 108, "2"); c.hline(131, 108, 5, "1"); c.px(134, 109, "R")
  // the fence: posts, a top rail, chain-link diamonds
  for (let y = 139; y < NB; y++) for (let x = 128; x < 184; x++) if ((x + y) % 4 === 0 || (x - y + 400) % 4 === 0) if (bayer(x, y) < 0.6) c.px(x, y, "5")
  c.hline(128, 138, 56, "Y"); for (let x = 130; x < 184; x += 13) c.vline(x, 138, NB - 138, "Y")
}

// 4. the clinic: board-formed concrete, a ribbon window, a canopy, a billboard on the roof
function clinic(c) {
  c.rect(184, 104, 62, NB - 104, "3"); c.hline(184, 104, 62, "5")
  for (let y = 108; y < NB; y += 4) for (let x = 184; x < 246; x++) if (hash(x >> 3, y) < 0.7 && x % 8) c.px(x, y, "2")   // board marks
  c.hline(186, 111, 58, "1"); c.rect(186, 112, 58, 8, "g")
  for (let x = 186; x < 244; x += 6) { c.vline(x, 112, 8, "2"); if (hash(x, 1) < 0.5) c.rect(x + 1, 113, 5, 7, hash(x, 2) < 0.5 ? "p" : "j") }
  c.hline(186, 120, 58, "4")
  c.rect(184, 125, 62, 6, "4"); c.hline(184, 125, 62, "5"); c.hline(184, 131, 62, "1"); c.text(192, 126, "CLINIC", "v")
  c.rect(198, 134, 18, 18, "p"); c.box(197, 133, 20, 19, "2"); c.vline(206, 134, 18, "2"); c.hline(198, 140, 18, "j")
  c.rect(186, 136, 9, 10, "g"); c.rect(186, 136, 9, 2, "j"); c.rect(220, 136, 10, 10, "g"); c.rect(220, 136, 10, 2, "j")
  c.rect(233, 134, 12, 8, "t"); c.text(234, 136, "24H", "v")
  grimeBase(c, 184, 62, "2"); drip(c, 190, 121, 3, "2"); drip(c, 236, 121, 4, "2")
  // on the roof: the billboard's legs and catwalk, a duct, an AC unit
  for (const lx of [194, 216, 238]) { c.vline(lx, 96, 8, "1"); c.line(lx - 3, 103, lx, 97, "1") }
  c.hline(188, 96, 56, "1"); c.hline(188, 95, 56, "2")
  for (const fx of [200, 216, 232]) { c.vline(fx, 96, 2, "1"); c.hline(fx - 1, 95, 3, "1"); c.px(fx, 94, "W") }   // the floods, aimed up at the board
  c.rect(186, 98, 6, 6, "4"); c.hline(185, 97, 8, "3")
  acUnit(c, 224, 100)
}

// 5. the hotel: four storeys of red-painted concrete, a fire escape, a rooftop sign
const HOTEL_WIN = [254, 272, 290, 308]
const HOTEL_FLOORS = [70, 90, 110]
function hotel(c) {
  c.rect(246, 62, 74, NB - 62, "s"); c.rect(246, 62, 74, 4, "x"); c.hline(246, 62, 74, "8"); c.hline(246, 66, 74, "r")
  for (const fy of HOTEL_FLOORS) { c.hline(246, fy - 3, 74, "r"); c.hline(246, fy - 2, 74, "x") }
  c.hline(246, 127, 74, "r"); c.hline(246, 128, 74, "x")
  for (const fy of HOTEL_FLOORS) for (const wx of HOTEL_WIN) {
    c.rect(wx, fy, 9, 12, "g"); c.box(wx - 1, fy - 1, 11, 14, "r"); c.hline(wx - 1, fy + 13, 11, "x")
    const h = hash(wx, fy)
    if (h < 0.35) { c.rect(wx, fy, 9, 12, "Q"); c.rect(wx, fy, 9, 3, "R"); c.rect(wx, fy, 3, 12, "s"); c.rect(wx + 7, fy, 2, 12, "s") }  // lit, curtains half drawn
    else if (h < 0.5) c.rect(wx, fy + 4, 9, 8, "h")
    drip(c, wx + 4, fy + 14, 2 + Math.floor(hash(fy, wx) * 4), "s")
  }
  acUnit(c, 255, 78); drip(c, 257, 83, 5, "s"); acUnit(c, 309, 98); drip(c, 312, 103, 4, "s"); acUnit(c, 291, 118)
  // the west face over the clinic's roof: lit above the city's shadow
  for (let y = 62; y < 104; y++) for (let i = 0; i < 2; i++) c.px(246 + i, y, y < SUNLINE ? (i ? "8" : "9") : y < SUNLINE + 3 && bayer(246 + i, y) < 0.5 ? "y" : "s")
  // the fire escape: landings, rails, stairs between them
  for (const fy of HOTEL_FLOORS) {
    const ly = fy + 15
    c.hline(266, ly, 38, "k"); c.hline(266, ly - 4, 38, "1")
    for (let x = 266; x < 304; x += 3) c.vline(x, ly - 3, 3, "1")
  }
  c.line(270, 104, 286, 89, "k"); c.line(300, 124, 284, 109, "k"); c.vline(268, 125, 8, "1"); c.hline(267, 129, 3, "1")
  // the vertical sign
  c.rect(248, 68, 9, 36, "r"); c.box(248, 68, 9, 36, "k")
  "ROOMS".split("").forEach((ch, i) => c.text(251, 70 + i * 6, ch, "s"))
  // the ground floor: a bar, a glass-block window, a shutter half up
  c.rect(252, 134, 8, 18, "Q"); c.box(251, 133, 10, 19, "r")
  for (let y = 134; y < 146; y += 3) for (let x = 264; x < 290; x += 3) c.rect(x, y, 2, 2, hash(x, y) < 0.3 ? "j" : "i")
  c.box(263, 133, 28, 14, "r")
  c.rect(296, 136, 22, 8, "4"); for (let y = 137; y < 144; y += 2) c.hline(296, y, 22, "3"); c.rect(296, 144, 22, 8, "Q"); c.hline(296, 144, 22, "R"); c.box(295, 135, 24, 17, "r")
  c.text(300, 130, "BAR", "s")
  grimeBase(c, 246, 74, "s")
  // the rooftop sign: steel frame, letters of bulbs (drawn unlit here)
  c.hline(254, 58, 44, "1"); for (let x = 256; x < 298; x += 10) c.vline(x, 44, 18, "1"); c.line(256, 58, 266, 46, "1"); c.line(286, 58, 296, 46, "1")
  "HOTEL".split("").forEach((ch, i) => c.text(257 + i * 8, 46, ch, "s", { scale: 2 }))
  c.vline(314, 42, 20, "1"); c.hline(312, 46, 5, "1")
}

sprite("_near", { w: W, h: NB }, (c) => { palm(c, 64, 123, 60, -4); tacoStand(c); liquor(c); lot(c); clinic(c); hotel(c) })

// the billboard on the clinic's roof: an ad for cyberware, invented: a profile with a line of light
// where the eyes were, "NEW YOU". Lit from below by three floods.
sprite("_billboard", { w: 52, h: 28 }, rect(0, 0, 52, 28, "8"), ...[10, 26, 42].map((x) => ellipse(x, 27, 7, 4, "9")), box(0, 0, 52, 28, "1"), box(1, 1, 50, 26, "6"),
  runs({
    4: [[8, "rrrrr"]], 5: [[6, "rrrrrrrr"]], 6: [[5, "rrrrrrrrrr"]], 7: [[4, "rrrrrrrrrrr"]], 8: [[4, "rrrrrrrrrrr"]],
    9: [[3, "rrrrrrrrrrrr"]], 10: [[3, "rrrrrrrruuuuu"]], 11: [[3, "rrrrrrrrrrrrr"]], 12: [[3, "rrrrrrrrrrrrrr"]],
    13: [[3, "rrrrrrrrrrrr"]], 14: [[4, "rrrrrrrrrrr"]], 15: [[4, "rrrrrrrrrrrr"]], 16: [[4, "rrrrrrrrrr"]],
    17: [[5, "rrrrrrrrr"]], 18: [[6, "rrrrrr"]], 19: [[7, "rrrr"]], 20: [[7, "rrrr"]], 21: [[4, "rrrrrrrrr"]],
    22: [[2, "rrrrrrrrrrrrr"]], 23: [[2, "rrrrrrrrrrrrrr"]], 24: [[2, "rrrrrrrrrrrrrr"]], 25: [[2, "rrrrrrrrrrrrrr"]], 26: [[2, "rrrrrrrrrrrrrr"]] }),
  px(16, 10, "v"),
  text(25, 4, "NEW", "k", { font: "5x7" }), text(25, 12, "YOU", "r", { font: "5x7" }), text(22, 21, "UPGRADE", "s"))

// ================================================================ the street
// far sidewalk, curb, two lanes, the near curb and our sidewalk. Asphalt is the one granular thing
// here, so it gets a sparse speckle; the concrete gets its saw-cut joints.
const STREET_Y = NB
sprite("_street", { w: W, h: H - NB }, (c) => {
  c.rect(0, 0, W, 5, "Z"); c.hline(0, 0, W, "f")
  for (let x = 6; x < W; x += 16) c.vline(x, 1, 4, "z")
  c.hline(0, 5, W, "Y"); c.hline(0, 6, W, "z"); c.hline(0, 7, W, "e")
  c.rect(0, 8, W, 11, "f")
  c.noise(0, 8, W, 11, "ez", 0.06, 4)
  for (let x = 0; x < W; x++) { if (bayer(x, 11) < 0.35) c.px(x, 11, "e"); if (bayer(x, 17) < 0.35) c.px(x, 17, "e") }   // worn tracks
  for (let x = 4; x < W; x += 20) c.hline(x, 13, 9, "6")                                                                // the centre line, faded
  c.ellipse(214, 16, 4, 1, "e"); c.hline(212, 16, 5, "z")                                                               // a manhole
  c.hline(98, 6, 7, "e"); c.hline(250, 6, 7, "e")                                                                       // storm drains
  c.hline(0, 19, W, "e"); c.hline(0, 20, W, "Y"); c.rect(0, 21, W, 7, "Z")
  for (let x = 10; x < W; x += 16) c.vline(x, 21, 7, "z")
})

// ================================================================ in front: poles, wires, street furniture
const POLE_X = 111
function utilityPole(c) {
  for (let y = 26; y < 175; y++) { c.px(POLE_X, y, y < SUNLINE ? "7" : "L"); c.px(POLE_X + 1, y, "K"); c.px(POLE_X + 2, y, y % 7 ? "K" : "U") }
  c.hline(99, 32, 27, "K"); c.hline(99, 33, 27, "U"); c.hline(103, 42, 19, "K"); c.hline(103, 43, 19, "U")
  c.line(POLE_X, 38, 104, 33, "U"); c.line(POLE_X + 2, 38, 120, 33, "U")
  for (const ix of [100, 107, 118, 125]) c.px(ix, 31, "V")
  for (const ix of [104, 120]) c.px(ix, 41, "V")
  c.rect(114, 50, 5, 9, "4"); c.vline(114, 50, 9, "5"); c.hline(114, 52, 5, "3"); c.hline(114, 56, 5, "3"); c.px(116, 49, "V")
  c.line(POLE_X + 2, 98, 124, 93, "2"); c.hline(124, 93, 8, "2"); c.rect(128, 92, 7, 2, "1"); c.hline(129, 94, 5, "R")
  for (let y = 120; y < 150; y += 5) c.hline(POLE_X - 1, y, 1, "1")                       // staples where flyers were
  c.rect(POLE_X - 1, 134, 4, 6, "V"); c.hline(POLE_X - 1, 136, 4, "x")                    // a flyer
}
function streetLamp(c, x, toward, top) {
  c.vline(x, top, 175 - top, "2"); c.vline(x + 1, top, 175 - top, "1"); c.rect(x - 1, 170, 4, 5, "2")
  const hx = x + toward * 12
  c.line(x, top, hx, top - 3, "2"); c.rect(Math.min(hx, hx + toward * 6), top - 4, 7, 2, "1"); c.hline(Math.min(hx, hx + toward * 6) + 1, top - 2, 5, "R")
}
function wires(c) {
  // power lines along the street, off to the next poles out of frame; a cable drops to the hotel
  for (const [x, y, sagL, sagR] of [[100, 31, 7, 9], [125, 31, 8, 10], [104, 41, 9, 12]]) {
    c.wire(x, y, -8, y - 4, sagL, "1"); c.wire(x, y, 328, y - 2, sagR, "1")
  }
  c.wire(POLE_X + 2, 60, 246, 80, 8, "1")
}
function furniture(c) {
  // the bus shelter, its ad box lit from inside
  c.hline(36, 158, 32, "1"); c.hline(36, 159, 32, "2"); c.vline(37, 160, 16, "2"); c.vline(66, 160, 16, "2")
  c.rect(52, 161, 13, 14, "R"); c.box(51, 160, 15, 16, "1"); c.rect(54, 163, 9, 5, "y"); c.circ(58, 165, 2, "W"); c.text(53, 169, "SUN", "x")
  c.hline(39, 171, 11, "3"); c.vline(40, 172, 4, "1"); c.vline(48, 172, 4, "1")
  // a hydrant, two newspaper boxes, a bin
  c.rect(149, 171, 4, 5, "x"); c.hline(148, 172, 6, "x"); c.rect(150, 170, 2, 1, "y"); c.hline(149, 171, 4, "y")
  c.rect(186, 168, 6, 8, "t"); c.hline(186, 168, 6, "u"); c.rect(187, 170, 4, 2, "V")
  c.rect(193, 169, 6, 7, "s"); c.hline(193, 169, 6, "x"); c.rect(194, 171, 4, 2, "V")
  c.rect(268, 168, 7, 8, "3"); c.hline(267, 168, 9, "4"); c.vline(268, 169, 7, "4")
}
sprite("_fore", { w: W, h: H }, (c) => {
  wires(c); utilityPole(c); streetLamp(c, 24, 1, 100); streetLamp(c, 238, -1, 98); furniture(c)
})


// ================================================================ what moves
// The scene's clock: 360 frames. Everything below is a function of the frame f; whatever loops
// sooner divides 360.
anim("_clock", { w: 1, h: 1, frames: L, fps: FPS }, () => {})
const wrapX = (x0, v, f) => ((x0 + v * f) % P + P) % P - 30          // a strip 360 wide, from x -30 to 330: off screen at the jump

// ---------------------------------------------------------------- the sky: smog and an AV
// Smog lies in long thin streaks, darker than the sky over the city and lit from below near the sun.
// They drift east on the evening wind; each lives one loop (forms, drifts, thins away where it began).
const SMOG = [[10, 20, 120], [150, 12, 140], [60, 34, 110], [210, 30, 90], [0, 50, 70], [120, 46, 100], [250, 56, 60]]
function smog(c) {
  const f = c.frame
  SMOG.forEach(([x0, y, len], k) => {
    const age = ((f / L) - k / SMOG.length + 1) % 1
    const env = Math.min(1, 1.6 * Math.sin(age * Math.PI))
    const x = x0 - 6 + Math.floor(12 * age)
    const n = Math.round(len * env)
    if (n < 4) return
    const xs = x + ((len - n) >> 1)
    for (let i = 0; i < n; i++) {
      const xx = xs + i, t = i / n, thick = Math.sin(t * Math.PI) * env
      const sky = SKY.indexOf(c.key(xx, y))
      if (sky < 0) continue
      const near = Math.abs(xx - SX) < 70 && y > 40
      c.px(xx, y, SKY[Math.max(0, sky - 1)])
      if (thick > 0.55) c.px(xx, y - 1, SKY[Math.max(0, SKY.indexOf(c.key(xx, y - 1)) - 1)] ?? "A")
      if (near && thick > 0.3) c.px(xx, y + 1, SKY[Math.min(9, sky + 1)])
    }
  })
}
// an aerial vehicle crossing far off, westward, once a loop: nav lights blinking
function av(c) {
  const f = c.frame, x = 340 - f, y = 40 + (Math.floor(f / 30) % 2)
  c.rect(x, y, 7, 2, "2"); c.hline(x + 2, y - 1, 3, "2"); c.hline(x - 1, y + 2, 2, "1"); c.hline(x + 6, y + 2, 2, "1")
  if (f % 12 < 2) c.px(x + 3, y + 2, "m")
  c.px(x, y + 1, "W")
}

// ---------------------------------------------------------------- the towers come on
const BEACONS = [[95, 0, 0], [199, 0, 7], [280, 4, 13], [58, 40, 4], [146, 36, 10], [259, 20, 16]]
function beacons(c) { for (const [x, y, d] of BEACONS) if ((c.frame + d) % 20 < 3) { c.px(x, y, "m"); if ((c.frame + d) % 20 === 1) { c.px(x - 1, y, "n"); c.px(x + 1, y, "n") } } }
// windows switching on (and a few off) at their own moments: [x, y, w, key, on, off]
const SWITCH = []
for (let i = 0; i < 46; i++) {
  const slab = MEGA.slabs[i % 2], fl = 2 + Math.floor(hash(i, 1) * 12), col = Math.floor(hash(i, 2) * 8)
  const on = Math.floor(hash(i, 3) * L), dur = 120 + Math.floor(hash(i, 4) * 200)
  SWITCH.push([slab[0] + 1 + col * 4, slab[2] + fl * 6 + 4, 3, hash(i, 5) < 0.6 ? "Q" : "R", on, (on + dur) % L])
}
for (let i = 0; i < 16; i++) SWITCH.push([CORP.x + 9 + Math.floor(hash(i, 7) * 6) * 3, CORP.top + 1 + Math.floor(4 + hash(i, 8) * 20) * 4, 2, "p", Math.floor(hash(i, 9) * L), Math.floor(hash(i, 10) * L)])
const isOn = (on, off, f) => on < off ? f >= on && f < off : f >= on || f < off
function windowsOn(c) {
  for (const [x, y, w, k, on, off] of SWITCH) {
    if (!isOn(on, off, c.frame)) continue
    // a fluorescent tube stutters before it holds
    const since = (c.frame - on + L) % L
    if (k === "p" && since < 6 && since % 2) continue
    c.hline(x, y, w, k); if (k !== "p") c.hline(x, y + 1, w, k)
  }
}

// the megabuilding's screen: three invented ads, 12 s each, a glitch between them
function screen(c) {
  const [x, y, w, h] = SCREEN, f = c.frame, ad = Math.floor(f / 120), t = f % 120
  if (ad === 0) {          // a resort under a big sun: "the coast is open"
    c.rect(x, y, w, h, "P"); c.rect(x, y, w, 6, "Q")
    c.circ(x + 14, y + 10, 6, "R"); c.circ(x + 14, y + 10, 4, "W")
    c.rect(x, y + 11, w, 7, "t"); for (let i = 0; i < 4; i++) c.hline(x + ((i * 7 + Math.floor(t / 4)) % w), y + 12 + i, 4, "u")
    c.hline(x, y + 11, w, "R")
  } else if (ad === 1) {   // a can of something red, glyphs in no known script
    c.rect(x, y, w, h, "s"); c.rect(x + 4, y + 3, 6, 12, "n"); c.hline(x + 4, y + 3, 6, "m"); c.vline(x + 5, y + 4, 10, "m"); c.rect(x + 5, y + 7, 4, 3, "R")
    const g = ["k.k.k", "kkk.k", ".k.kk", "kk.kk"]
    for (let i = 0; i < 3; i++) for (let j = 0; j < 5; j++) if (g[(i + Math.floor(t / 30)) % 4][j] === "k") c.rect(x + 13 + j * 3, y + 4 + i * 4, 2, 3, "R")
  } else {                 // a face, a visor of light sweeping across it
    c.rect(x, y, w, h, "h"); c.circ(x + 14, y + 9, 7, "1"); c.rect(x + 11, y + 15, 7, 3, "1")
    c.hline(x + 7, y + 8, 15, "u"); c.px(x + 7 + (Math.floor(t / 3) % 15), y + 8, "v"); c.hline(x + 9, y + 9, 11, "t")
  }
  if (t < 2 || t > 117) for (let yy = y; yy < y + h; yy += 2) c.hline(x + (t % 2 ? 3 : -3), yy, w, yy % 4 ? "u" : "n")
  c.box(x - 1, y - 1, w + 2, h + 2, "k")
}

// the holo-ad over the mid-rise: a projected emblem, a ring and a blade turning in the air above its
// projector, scan lines crawling up, a stutter now and then
const HOLO = [132, 30]
function holo(c) {
  const f = c.frame, [cx, cy] = HOLO, a = (f % 60) / 60 * Math.PI * 2
  if (f % 90 > 86) return
  const rx = Math.max(1, Math.round(11 * Math.abs(Math.cos(a)))), shift = f % 90 > 82 ? 2 : 0
  c.ellipse(cx + shift, cy, rx, 11, "u", true); c.ellipse(cx + shift, cy, Math.max(1, rx - 2), 9, "t", true)
  const dx = Math.round(6 * Math.sin(a)), ex = Math.round(6 * Math.cos(a))          // a diamond turning inside the ring
  for (const [x0, x1] of [[0, dx], [0, ex]]) if (x1 !== 0 || x0) { c.line(cx, cy - 7, cx + x1, cy, "v"); c.line(cx + x1, cy, cx, cy + 7, "v") }
  c.px(cx, cy, "v")
  for (let y = cy - 12; y <= cy + 12; y++) if ((y + Math.floor(f / 2)) % 5 === 0) for (let x = cx - 12; x <= cx + 12; x++) if (c.is(x, y, "tu")) c.px(x, y, "v")
  // the projector's beam fanning up from the roof
  for (let y = cy + 13; y < 50; y++) { const s = Math.round((50 - y) * 0.5); if (y % 2) { c.px(cx - s, y, "t"); c.px(cx + s, y, "t") } }
}

// a holo banner hung in the air beside the slender tower: invented glyphs climbing it, the
// projector skipping a beat every 7 s
const BANNER = [303, 8, 13, 32]
function holoBanner(c) {
  const [x, y, w, h] = BANNER, f = c.frame
  if (f % 72 > 69) return
  c.vline(x, y, h, "t"); c.vline(x + w - 1, y, h, "t"); c.hline(x + 1, y, w - 2, "u"); c.hline(x + 1, y + h - 1, w - 2, "u")
  const sc = Math.floor(f / 4) % 6, base = Math.floor(f / 24)
  for (let r = 0; r < 7; r++) for (let g = 0; g < 2; g++) {
    const id = ((r + base) % 15) * 2 + g, gy = y + 2 + r * 6 - sc
    for (let i = 0; i < 12; i++) {
      const px = x + 2 + g * 5 + (i % 3), py = gy + Math.floor(i / 3)
      if (hash(id, i) < 0.55 && py > y && py < y + h - 1) c.px(px, py, g ? "u" : "v")
    }
  }
}

// ---------------------------------------------------------------- freeway traffic
// small, distant: roofs over the barrier, headlights ahead, taillights behind. [kind, x0, swap]
sprite("_hcar", `
  ...xxxxx....
  ..xgggigx...
  yyyyyyyyyyy.
  xxxxxxxxxxxx`)
sprite("_hvan", `
  .xxxxxxxxx...
  .xgggxgggxx..
  yyyyyyyyyyyy.
  xxxxxxxxxxxxx`)
sprite("_htruck", `
  yyyyyyyyyyyyyyyyyy.......
  xxxxxxxxxxxxxxxxxx.xxxx..
  xxxxxxxxxxxxxxxxxx.xggix.
  xxxxxxxxxxxxxxxxxx.yyyyyy
  sssssssssssssssssskxxxxxx`)
const HWY_E = [["_hcar", 0, {}], ["_htruck", 70, { x: "V", y: "9", s: "N" }], ["_hcar", 150, { x: "4", y: "5", s: "3" }], ["_hvan", 230, { x: "M", y: "N", s: "L" }], ["_hcar", 300, { x: "7", y: "8", s: "6" }]]
const HWY_W = [["_hcar", 40, { x: "2", y: "3", s: "1" }], ["_hvan", 160, { x: "i", y: "j", s: "h" }], ["_hcar", 260, { x: "N", y: "9", s: "M" }]]
function hwyTraffic(c) {
  const f = c.frame
  for (const [n, x0, swap] of HWY_W) {        // the far lane, westbound
    const x = wrapX(x0, -4, f), { w, h } = c.size(n)
    c.stamp(n, x, HB + 1 - h, { swap, flip: "x" }); c.px(x, HB - 1, "W"); c.px(x + w - 1, HB - 1, "n")
  }
  for (const [n, x0, swap] of HWY_E) {        // the near lane, eastbound
    const x = wrapX(x0, 5, f), { w, h } = c.size(n)
    c.stamp(n, x, HB + 2 - h, { swap }); c.px(x + w - 1, HB, "W"); c.px(x, HB, "n")
  }
}

// ---------------------------------------------------------------- street traffic
// facing east (right). Body x (base), y (top light), s (underside); glass g with a glint i.
sprite("_sedan", `
  ........xxxxxxxxx.........
  .......xgggixgggix........
  ......xggggixggggix.......
  ..yyyyyyyyyyyyyyyyyyyyy...
  .nxxxxxxxxxxxxxxxxxxxxxxxW
  .xxxxxxxxxxxxxxxxxxxxxxxxx
  .sssskkksssssssssskkkssss.
  ....k444k........k444k....
  .....kkk..........kkk.....`)
sprite("_coupe", `
  .........xxxxxx.........
  .......xxggggigx........
  ..yyyyyyyyyyyyyyyyyyy...
  nxxxxxxxxxxxxxxxxxxxxxxW
  xsssxxxxxxxxxxxxxxxsssxx
  .k44k.............k44k..
  ..kk...............kk...`)
sprite("_van", `
  ....yyyyyyyyyyyyyyyyyy......
  ...xxxxxxxxxxxxxxxxxxxxx....
  ...xgggixgggixgggixggggx....
  ...xggggxggggxggggxgggggx...
  ...xxxxxxxxxxxxxxxxxxxxxxx..
  .nxxxxxxxxxxxxxxxxxxxxxxxxxW
  .xxxxxxxxxxxxxxxxxxxxxxxxxxx
  .xxxxxxxxxxxxxxxxxxxxxxxxxxx
  .ssskkksssssssssssssskkksss.
  ...k444k............k444k...
  ....kkk..............kkk....`)
sprite("_pickup", `
  ..............xxxxxx......
  .............xggggix......
  .............xgggggix.....
  .yyyyyyyyyyyyyyyyyyyyyyyy.
  nxxxxxxxxxxxxxxxxxxxxxxxxW
  xxxxxxxxxxxxxxxxxxxxxxxxxx
  ssskkksssssssssssssskkksss
  ..k444k............k444k..
  ...kkk..............kkk...`)
// [sprite, x0, swap]: the near lane runs east at 5 px a frame, the far lane west at 4
const RED = {}, TEAL = { s: "g", x: "h", y: "i", g: "1" }, SAND = { s: "6", x: "7", y: "8" }, BLACK = { s: "k", x: "1", y: "3" }
const BEIGE = { s: "L", x: "M", y: "N" }, GREY = { s: "3", x: "4", y: "5" }
const STREET_E = [["_sedan", 0, RED], ["_van", 120, BEIGE], ["_coupe", 250, SAND]]
const STREET_W = [["_pickup", 30, TEAL], ["_sedan", 150, BLACK], ["_coupe", 260, GREY]]
const LANE_W = 164, LANE_E = 170                       // rows the wheels stand on
const streetCars = (c, lane) => {
  const f = c.frame, list = lane === "E" ? STREET_E : STREET_W, v = lane === "E" ? 5 : -4, ground = lane === "E" ? LANE_E : LANE_W
  for (const [n, x0, swap] of list) {
    const x = wrapX(x0, v, f), { w, h } = c.size(n)
    c.stamp(n, x, ground + 1 - h, { swap, flip: v < 0 ? "x" : undefined })
  }
}
// the road under each car darkens, and the headlights lay a short pool ahead
const carShadows = (c) => {
  for (const [lane, list, v, ground] of [["W", STREET_W, -4, LANE_W], ["E", STREET_E, 5, LANE_E]])
    for (const [n, x0] of list) { const x = wrapX(x0, v, c.frame), { w } = c.size(n); c.rect(x + 2, ground, w - 4, 1, "k") }
}
const headBeams = (c) => {
  for (const [list, v, ground] of [[STREET_W, -4, LANE_W], [STREET_E, 5, LANE_E]])
    for (const [n, x0] of list) {
      const x = wrapX(x0, v, c.frame), { w } = c.size(n), fx = v > 0 ? x + w : x
      const d = v > 0 ? 1 : -1
      c.poly([fx, ground - 2, fx + d * 22, ground - 1, fx + d * 22, ground + 1, fx, ground + 1], "k")
    }
}

// ---------------------------------------------------------------- people
// ~11 px tall, procedurally posed so the planted foot stays put while the body moves 1 px a frame:
// an 8-frame stride, each foot planted 5 frames and swinging 3, lifted mid-swing; the body rises a
// pixel as the legs pass; the near arm swings against the near leg. s: 1 walks east, -1 west.
const STEP = [2, 1, 0, -1, -2, -1, 0, 1]
function person(c, x, y, ph, k, s) {
  const a = STEP[ph], b = -a
  const bob = ph === 2 || ph === 6 ? 1 : 0
  const top = y - 10 - bob - (k.tall ?? 0)
  const shoulder = top + 3, hip = y - 4 - bob
  // far side first: the far hand when it swings clear, a bag on the back hip, the far leg
  if (Math.abs(a) === 2) c.px(x + s * a, shoulder + 2, k.skin)
  if (k.bag) { c.rect(x - s * 2, hip - 2, 1, 3, k.bag); c.px(x - s, shoulder, k.bag) }
  c.line(x, hip + 1, x + s * b, y - (ph === 2 ? 1 : 0), k.legsD); c.px(x + s * b, y - (ph === 2 ? 1 : 0), k.shoes)
  // torso and pelvis
  c.rect(x - 1, shoulder, 3, hip - shoulder, k.top); c.hline(x - 1, hip, 3, k.coat ? k.top : k.legs)
  if (k.coat) c.hline(x - 1, hip + 1, 3, k.top)
  c.vline(x - s, shoulder, hip - shoulder, k.topD)                // the back, away from the street light
  // near leg
  c.line(x, hip + 1, x + s * a, y - (ph === 6 ? 1 : 0), k.legs); c.px(x + s * a, y - (ph === 6 ? 1 : 0), k.shoes)
  // head: hair at the back and on top, the face forward
  const hx = s > 0 ? x : x - 1, back = s > 0 ? hx : hx + 1
  c.rect(hx, top, 2, 3, k.skin); c.hline(hx, top, 2, k.hair); c.px(back, top + 1, k.hair)
  if (k.long) { c.px(back, top + 2, k.hair); c.px(back - s, top + 2, k.hair); c.px(back - s, top + 3, k.hair) }
  if (k.hat) { c.hline(s > 0 ? hx : hx - 1, top, 3, k.hat); c.hline(hx, top - 1, 2, k.hat) }
  // near arm: a sleeve from the shoulder to a hand swung against the near leg
  if (k.phone) { c.px(x + s, shoulder + 1, k.topD); c.px(x + s, shoulder, k.skin); c.px(x + s * 2, shoulder - 1, "v") }
  else { c.line(x, shoulder, x + s * -a, shoulder + 2, k.arm ?? k.topD); c.px(x + s * -a, shoulder + 2, k.skin) }
}
const LOOKS = {
  courier: { skin: "T", hair: "k", top: "Q", topD: "O", legs: "2", legsD: "1", shoes: "k", bag: "t" },
  suit: { skin: "S", hair: "U", top: "1", topD: "k", legs: "1", legsD: "k", shoes: "k", coat: true },
  punk: { skin: "S", hair: "u", top: "s", topD: "r", legs: "1", legsD: "k", shoes: "V", arm: "u" },
  nurse: { skin: "U", hair: "k", top: "j", topD: "i", legs: "i", legsD: "h", shoes: "V", long: true },
  tourist: { skin: "S", hair: "7", top: "V", topD: "N", legs: "L", legsD: "K", shoes: "K", hat: "7", bag: "x" },
  local: { skin: "T", hair: "k", top: "x", topD: "s", legs: "h", legsD: "g", shoes: "k", phone: true },
  worker: { skin: "U", hair: "k", top: "7", topD: "6", legs: "h", legsD: "g", shoes: "K", hat: "Q" },
  student: { skin: "T", hair: "U", top: "t", topD: "h", legs: "2", legsD: "1", shoes: "V", long: true, bag: "Q" },
  elder: { skin: "S", hair: "V", top: "M", topD: "L", legs: "K", legsD: "U", shoes: "k", coat: true },
}
// [look, x0, dir, feet row]. Walkers wrap over the same 360 px strip as the cars, at 1 px a frame.
const WALK_NEAR = [["courier", 20, 1, 177], ["suit", 140, 1, 177], ["tourist", 250, 1, 177], ["punk", 80, -1, 179], ["elder", 210, -1, 179], ["student", 320, -1, 179]]
const WALK_FAR = [["nurse", 60, 1, 154], ["worker", 190, 1, 154], ["local", 110, -1, 156], ["suit", 280, -1, 156]]
function walkers(c, list) {
  for (const [look, x0, s, y] of [...list].sort((p, q) => p[3] - q[3])) {
    const x = wrapX(x0, s, c.frame)
    person(c, x, y, ((c.frame + x0) % 8 + 8) % 8, LOOKS[look], s)
  }
}
// those who stay: a customer at the taco window, someone waiting for the bus on their phone,
// a smoker outside the bar
function idlersFar(c) {
  const f = c.frame
  person(c, 30, 155, 2, LOOKS.worker, 1)
  person(c, 292, 155, 2, { ...LOOKS.punk, arm: undefined, top: "1", topD: "k" }, -1)
  const puff = f % 40                                     // the cigarette glows on the draw, smoke climbs
  if (puff < 3) c.px(290, 147, "R")
  for (let p = 0; p < 3; p++) { const t = (puff + p * 13) % 40; if (t > 4 && t < 34) c.px(290 + Math.floor(t / 9), 146 - Math.floor(t / 3), t < 18 ? "5" : "4") }
}
function idlersNear(c) { person(c, 44, 177, 2, { ...LOOKS.local, top: "4", topD: "3" }, -1) }

// ---------------------------------------------------------------- signs
function signs(c) {
  const f = c.frame
  // TACOS: bulbs chasing round the box
  let i = 0
  for (const [x, y] of [...Array.from({ length: 12 }, (_, k) => [41 + k * 2, 99]), ...Array.from({ length: 5 }, (_, k) => [63, 100 + k * 2]),
    ...Array.from({ length: 12 }, (_, k) => [63 - k * 2, 109]), ...Array.from({ length: 5 }, (_, k) => [41, 108 - k * 2])])
    c.px(x, y, (i++ + Math.floor(f / 2)) % 3 ? "R" : "O")
  // LIQUOR: red neon over the store; it trips out near the end of the loop and stutters back
  const liq = !(f > 330 && f < 352 && (f % 5 < 3 || f < 340))
  c.rect(72, 127, 27, 7, "k"); c.text(74, 128, "LIQUOR", liq ? "m" : "s")
  if (liq) c.text(74, 128, "LIQUOR".replace(/./g, (ch, j) => j === 3 && f % 47 < 2 ? " " : ch), "m")
  // ROOMS: letters lit one by one down the blade, all held, two blinks, and again (6 s)
  const r = f % 60
  "ROOMS".split("").forEach((ch, j) => { const on = r < 30 ? r >= j * 5 : r < 44 || (r >= 48 && r < 52) || r >= 56; c.text(251, 70 + j * 6, ch, on ? "m" : "s") })
  // HOTEL: bulbs; the E has a bad socket. At 30 s the sign trips and relights letter by letter.
  "HOTEL".split("").forEach((ch, j) => {
    let on = f < 300 || f >= 318 + j * 7
    if (j === 3 && (f % 23 < 2 || f % 31 === 5)) on = false
    if (on) c.text(257 + j * 8, 46, ch, "R", { scale: 2 })
  })
  // the lamp over the lot has a failing ballast
  if (f % 37 < 2 || f % 53 === 7 || f % 53 === 9) c.px(134, 109, "1")
  // BAR, the CLINIC canopy and its 24H box are steady
  c.text(300, 130, "BAR", "m")
}

// ---------------------------------------------------------------- steam
// from the taco stand's flue, the clinic's duct and the manhole: puffs rising, leaning east on the wind
const VENTS = [[31, 114, 0], [189, 96, 13], [214, 166, 27]]
function steam(c) {
  for (const [vx, vy, d] of VENTS) for (let p = 0; p < 4; p++) {
    const t = ((c.frame + d + p * 10) % 40) / 40
    const x = Math.round(vx + t * 6 + Math.sin((t + p) * 5) * 1), y = Math.round(vy - t * 14), r = t < 0.3 ? 1 : 2
    if (t < 0.85) c.circ(x, y, r, t < 0.5 ? "V" : "5")
  }
}

// ================================================================ the scene
// lamp lenses over the street, and the pools they lay on it
const LAMPS = [[39, 98], [131, 94], [223, 96]]
const SODIUM1 = { f: "q", e: "f", z: "w", Z: "o", Y: "l", 6: "7" }
const SODIUM2 = { f: "q", q: "w", e: "q", z: "w", Z: "o", o: "l", Y: "l", 6: "8", 7: "8" }
const SPILLS = [[0, 52], [244, 76]]                       // warm shop light on the far sidewalk: [x, w]
scene("sodium_hour", { w: W, h: H, bg: "A", world: { light: [-1, -0.2] } },
  layer("sky", stamp("_clock", -4, -4), stamp("_sky", 0, 0), smog, av),
  layer("far2", stamp("_far2", 0, 0)),
  layer("far1", stamp("_far1", 0, 0)),
  layer("veil far", { opacity: 0.4 }, stamp("_far1", 0, 0, { silhouette: "H" })),
  layer("mid", stamp("_mid", 0, 0), windowsOn, screen, beacons),
  layer("veil mid", { opacity: 0.25 }, stamp("_mid", 0, 0, { silhouette: "G" })),
  layer("haze low", { opacity: 0.3 }, rect(0, 96, W, 36, "H")),
  layer("holo", { opacity: 0.8 }, holo, holoBanner),
  layer("freeway traffic", hwyTraffic),
  layer("freeway", stamp("_hwy", 0, 0)),
  layer("near", stamp("_near", 0, 0), stamp("_billboard", 190, 67), signs),
  layer("street", stamp("_street", 0, NB)),
  layer("pools wide", { light: SODIUM1 }, ...LAMPS.map(([x]) => ellipse(x, 166, 30, 11, "k")), ...SPILLS.map(([x, w]) => rect(x, NB, w, 5, "k"))),
  layer("pools edge", { light: SODIUM1, density: 0.5 }, ...LAMPS.map(([x]) => ellipse(x, 166, 33, 12, "k"))),
  layer("pools", { light: SODIUM2 }, ...LAMPS.map(([x]) => ellipse(x, 166, 17, 6, "k")), ...SPILLS.map(([x, w]) => rect(x + 4, NB, w - 8, 2, "k"))),
  layer("fluorescent spill", { light: { Z: "5", Y: "5" } }, rect(66, NB, 50, 4, "k"), rect(196, NB, 22, 4, "k")),
  layer("headlights", { light: { f: "z", e: "f", q: "w", 6: "8" } }, headBeams),
  layer("under cars", { shade: true }, carShadows),
  layer("far sidewalk", (c) => walkers(c, WALK_FAR), idlersFar),
  layer("westbound", (c) => streetCars(c, "W")),
  layer("eastbound", (c) => streetCars(c, "E")),
  layer("lamp cones", { opacity: 0.14 }, ...LAMPS.map(([x, y]) => poly([x - 3, y + 1, x + 3, y + 1, x + 22, 172, x - 22, 172], "R"))),
  layer("fore", stamp("_fore", 0, 0)),
  layer("near sidewalk", idlersNear, (c) => walkers(c, WALK_NEAR)),
  layer("steam", { opacity: 0.5 }, steam),
  glow("QRW", { r: 4, strength: 0.3 }),
  glow("nm", { r: 4, strength: 0.45 }),
  glow("uv", { r: 4, strength: 0.3 }),
  glow("J", { where: [SX - 9, SY - 9, 18, 18], r: 18, strength: 0.25 }),
)
