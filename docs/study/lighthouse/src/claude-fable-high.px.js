// Made for the model study (docs/model-study.md) by Claude Code, Fable 5.1 at high effort; its file as it left it.
// "Gannet Point" — a lighthouse on a rocky headland, stormy night. 160x120, 60 frames at 12 fps (5 s), loops.
// The lamp at (LX, LY) is the light: its beam turns once a loop (sideways at phase 0 and 0.5, straight at
// us at 0.25, away at 0.75); the keeper's lantern is the second, small and warm. Wind from the right:
// rain slants down-left, the coat and hood flap left, scud and waves run left onto the rocks.

pal({
  k: "#06070d",
  0: "#0a0c18", 1: "#121628", 2: "#1f2740", 3: "#334060", 4: "#555a7c", 5: "#8f92aa", 6: "#d4cec6",   // sky, rain, cloud
  s: "#0d1726", S: "#142637", t: "#1e3a50", T: "#2f5670", f: "#5f8398", F: "#c5d8e0", w: "#f4f3ea",   // sea -> foam
  r: "#0b0910", R: "#17141e", q: "#272330", Q: "#3d3848", m: "#5c5570",                               // rock
  a: "#2e3345", A: "#5a6177", b: "#9aa2b6", B: "#e3e6ee",                                             // tower white
  d: "#4f1a24", D: "#8e2b35", e: "#cf4a48",                                                           // red bands
  o: "#d9892b", Y: "#ffd45c", y: "#fff5c2",                                                           // lamp
  h: "#6f5312", H: "#caa11f", j: "#f4d65a",                                                           // oilskin
  n: "#c48f6c",                                                                                       // skin
})
ramps("0123456", "sStTfFw", "rRqQm", "aAbB", "dDe", "oYy", "hHj")

const W = 160, H = 120, FR = 60, FPS = 12
const LX = 44, LY = 13        // the lamp (the beam leaves above the keeper's hat)
const TX = 37                 // the tower base, left edge
const HOR = 76                // horizon
const TAU = Math.PI * 2

// ---------- sky: ragged scud, a strip that wraps, blown left 160 px a loop ----------
sprite("_scud", { w: 160, h: 48, wrap: "x" }, (c) => {
  // a low overcast deck, its base torn into lumps, with smaller rags blown along under it
  c.rect(0, 0, 160, 24, "1")
  for (let i = 0; i < 14; i++) {
    const x = Math.round(i * 11.5 + hash(i, 1) * 6), rx = 5 + Math.round(hash(i, 2) * 7), ry = 2 + Math.round(hash(i, 3) * 4)
    c.ellipse(x, 23 + Math.round(hash(i, 4) * 3), rx, ry, "1")
  }
  const rags = [[6, 36, 22], [52, 40, 16], [90, 34, 28], [134, 42, 20]]
  rags.forEach(([x, y, len], i) => {
    c.ellipse(x + len / 2, y, len / 2, 2, "1")
    c.ellipse(x + Math.round(len * 0.35), y - 2, 4 + Math.round(hash(i, 5) * 3), 2, "1")
    c.ellipse(x + Math.round(len * 0.7), y - 1, 3 + Math.round(hash(i, 6) * 3), 2, "1")
  })
})

// ---------- sea: two swell strips, the near one twice as fast ----------
sprite("_swell_far", { w: 80, h: 16, wrap: "x" }, (c) => {
  for (let i = 0; i < 14; i++) {
    const x = Math.floor(hash(i, 3) * 80), y = 1 + Math.floor(hash(i, 4) * 15), len = 3 + Math.floor(hash(i, 5) * 5)
    c.hline(x, y, len, "t"); c.px(x + len - 1, y, "T")          // crest; its right end lit (the lamp is up-left, the crest faces it)
  }
})
sprite("_swell_near", { w: 160, h: 44, wrap: "x" }, (c) => {
  for (let i = 0; i < 30; i++) {
    const x = Math.floor(hash(i, 6) * 160), y = 2 + Math.floor(hash(i, 7) * 40), len = 5 + Math.floor(hash(i, 8) * 9)
    c.hline(x, y, len, "T"); c.hline(x + 1, y + 1, Math.floor(len / 2), "t")   // crest and its shadowed back
    if (hash(i, 9) > 0.55) c.hline(x + len - 3, y, 2, "f")                      // a tumbling tip
  }
})

// ---------- gull: 4 frames, wings up / level / down / level ----------
anim("gull", { w: 5, h: 5, fps: FPS },                 // the body stays on row 2; only the wings move
  frame(grid(0, 0, "4...4\n.4.4.\n..5..")),
  frame(grid(0, 2, "44544")),
  frame(grid(0, 2, "..5..\n.4.4.\n4...4")),
  frame(grid(0, 2, "44544")))

// ---------- the keeper, facing right into the wind; lantern in the right hand ----------
// ponytail: the flap is a lookup of 4 hem variants over 12 frames (5 cycles a loop), not a cloth sim
const FLAP = [0, 1, 2, 3, 2, 1, 0, 1, 3, 2, 1, 0]
const KEEPER = [
  ".HHj.",
  ".HHjn",
  "..hH.",
  ".hHHHH",
  ".hHHj",
  ".hHH.",
  ".hHHj",
  ".hHH.",
  ".hHH.",
  ".k.k."].join("\n")
function keeper(c, x, y, f) {             // x,y: the left boot, bottom row
  const v = FLAP[f % 12]
  c.grid(x, y - 9, KEEPER)
  if (v >= 1) { c.px(x, y - 2, "h"); c.px(x, y - 3, "H") }                                              // hem lifts left
  if (v >= 2) { c.px(x - 1, y - 2, "h"); c.px(x, y - 4, "H"); c.px(x - 1, y - 3, "H"); c.px(x, y - 9, "H") }    // and the hat's brim
  if (v >= 3) { c.px(x - 2, y - 3, "h"); c.px(x - 1, y - 4, "H"); c.px(x - 1, y - 9, "H"); c.px(x - 1, y - 1, "h") }
  // lantern hung from the hand at (x+5, y-6); swings 1 px with the gusts (6-frame beat, 10 a loop)
  const lx = x + 7 + Math.round(Math.sin(TAU * f / 6 + 1) * 0.9), ly = y - 6
  c.px(lx, ly - 1, "a"); c.px(x + 6, ly - 1, "a")
  c.grid(lx - 1, ly, ".AA.\naYYa\nayya\naYYa\n.aa.")
}

// ---------- spray: a wave bursting at the foot of a rock, u = 0..1 of its cycle ----------
// 0-0.1 the crest piles up, 0.1-0.6 the plume shoots up and the wind carries it left, 0.45-0.9 foam spreads
function spray(c, x, y, u, seed, k) {
  const dash = (xx, yy, col) => { if (hash(seed + xx, yy) > 0.35) c.px(xx, yy, col) }
  if (u < 0.12) { c.hline(x - 3, y - 1, 7, "F"); c.hline(x - 2, y - 2, 4, "F"); return }
  if (u < 0.62) {
    const v = (u - 0.12) / 0.5, top = k * Math.sin(Math.PI * Math.min(1, v * 1.15)) * (1 - 0.2 * v)
    const drift = Math.round(v * v * 9)
    for (let i = -4; i <= 4; i++) {
      const a = hash(seed, i + 10), b = hash(seed, i + 20)
      const hh = Math.round(top * (0.55 + 0.45 * a) * (1 - Math.pow(Math.abs(i) / 5, 1.6)))
      if (hh < 2) continue
      const cx = x + Math.round(i * (1.6 + 1.6 * v)) - drift + (b > 0.5 ? 1 : 0)
      const solid = Math.round(hh * (0.35 + 0.3 * (1 - v)))              // the lower part a solid column, the top broken into drops
      c.vline(cx, y - solid, solid - 1, v < 0.5 ? "w" : "F")
      for (let yy = y - hh; yy < y - solid; yy++) if (hash(seed + i, yy + Math.floor(v * 5)) > 0.45) c.px(cx + (hash(seed + 9, yy + i) > 0.6 ? -1 : 0), yy, v < 0.45 && yy < y - hh * 0.6 ? "w" : "F")
      if (a > 0.3) c.px(cx - 2 - drift, y - hh - 2 - Math.round(v * 3), v < 0.6 ? "F" : "f")   // a drop flung off downwind
      if (b > 0.6 && v > 0.3) c.px(cx - 1, y - hh - 1, "F")
    }
  }
  if (u > 0.45) {
    const v = (u - 0.45) / 0.45, hw = Math.round(4 + 12 * v)
    for (let xx = x - hw - Math.round(v * 3); xx <= x + Math.round(hw * 0.6); xx++) dash(xx, y, v < 0.5 ? "F" : "f")
    for (let xx = x - Math.round(hw * 0.6); xx <= x + Math.round(hw * 0.3); xx++) dash(xx, y + 1, "f")
  }
}

// what each light layer lifts, key by key: the sky and sea two or three steps, the keeper and the ironwork one
const LIFT1 = { 0: "1", 1: "2", 2: "3", 3: "4", 4: "5", 5: "6", s: "S", S: "t", t: "T", T: "f", f: "F", R: "q", q: "Q", Q: "m", a: "A", A: "b", b: "B", h: "H", H: "j", d: "D", D: "e" }
const LIFT2 = { 0: "2", 1: "3", 2: "4", 3: "5", 4: "6", 5: "6", s: "t", S: "T", t: "f", T: "F", f: "F", R: "Q", q: "m", Q: "m", a: "A", A: "b", b: "B", h: "H", H: "j", d: "D", D: "e" }
const LIFT3 = { 0: "3", 1: "4", 2: "5", 3: "6", 4: "6", 5: "6", s: "T", S: "f", t: "f", T: "F", f: "F", R: "Q", q: "m", Q: "m", a: "A", A: "b", b: "B", h: "H", H: "j", d: "D", D: "e" }

function beamdir(c) { const th = TAU * c.phase; return [Math.cos(th), Math.sin(th)] }   // sn > 0: toward us
function beam(c, k) {
  const [cs, sn] = beamdir(c)
  if (Math.abs(cs) < 0.12 || (k < 1 && sn < -0.35)) return      // seen from behind, the beam has no bright core
  const L = 14 + 130 * Math.abs(cs), spread = (4 + 11 * Math.abs(sn)) * k, dir = cs > 0 ? 1 : -1
  const x0 = LX + dir * 7, tx = LX + dir * L, ty = LY + 2
  c.poly([x0, LY - 4 * k, x0, LY + 4 * k, tx, ty + spread, tx, ty - spread], "y")
}
function flare(c, r0, r1) {
  const [, sn] = beamdir(c)
  if (sn <= 0) return
  c.circ(LX, LY, Math.round(r0 + r1 * sn * sn), "y")
}
function seapath(c) {
  const [cs, sn] = beamdir(c)
  if (sn < 0.2) return
  for (let y = HOR + 2; y < H; y += 2) {
    if (hash(y, 99) > sn) continue
    const d = (y - HOR) / (sn * 0.55), cx = Math.round(LX + cs * d), hw = Math.round((y - HOR) / 44 * (3 + 9 * sn))
    for (let x = cx - hw; x <= cx + hw; x++) if (hash(y, Math.floor((x + 160 * c.phase) / 5)) > 0.45) c.px(x, y, "y")
  }
}

// rain: 130 streaks, each 2 px left and 4 px down a frame: twice round the height, once round 120 px of width.
// An anim of 60 frames: stamping it gives the scene its 5 s loop (the gull's 4 divides it).
anim("rain", { w: W, h: H, frames: FR, fps: FPS }, (c) => {
  const f = c.frame
  for (let i = 0; i < 130; i++) {
    const near = hash(i, 1) > 0.78
    const x = (Math.floor(hash(i, 2) * 120) - 2 * f + 120 * FR) % 120
    const y = (Math.floor(hash(i, 3) * 120) + 4 * f) % 120
    for (const xx of [x, x + 120]) if (xx < W) {
      if (near) c.line(xx, y, xx - 2, y + 4, "4"); else c.line(xx, y, xx - 1, y + 2, "3")
    }
  }
})

scene("gannet_point", { w: W, h: H, bg: "1", world: { light: { at: [LX, LY] } } },
  layer("sky", grad(0, 0, W, HOR, "0123"),
    (c) => c.scroll("_scud", 8, 160)),
  layer("sea_far", grad(0, HOR, W, 44, "SSs"),
    (c) => c.scroll("_swell_far", HOR + 1, 80)),
  layer("headland", (c) => {
    const pts = [0, 64, 10, 58, 24, 57, 56, 57, 64, 60, 70, 66, 76, 74, 80, 82, 82, 90, 78, 94, 0, 94]
    c.poly(pts, "q")                                                             // lit tops (the lamp is above)
    c.poly(pts.map((v, i) => (i % 2 ? v + 2 : v)), "R")                            // the body
    c.poly([70, 66, 76, 74, 80, 82, 82, 90, 78, 94, 74, 94, 76, 88, 73, 80, 67, 72], "r")  // the sea face, turned from the lamp
    for (const [x0, y0, x1, y1] of [[14, 60, 20, 70], [30, 60, 26, 72], [60, 60, 58, 76], [66, 66, 62, 84], [28, 80, 24, 94], [48, 82, 44, 94], [40, 64, 42, 78]])
      c.line(x0, y0, x1, y1, "r")                                                 // joints between the blocks
    for (const [x, y] of [[16, 61], [32, 60], [60, 59], [68, 64], [74, 72], [22, 66], [50, 61]]) c.px(x, y, "Q")   // crumbs on the lit rim
    c.hline(TX - 1, 57, 16, "Q")                                                      // the sill the tower stands on
  }),
  layer("sea_near", grad(0, 94, W, 26, "Ss"),
    (c) => c.scroll("_swell_near", HOR + 2, 160)),
  layer("rocks_front", (c) => {
    const pts = [0, 102, 12, 97, 26, 98, 38, 102, 46, 108, 48, 114, 44, 120, 0, 120]
    c.poly(pts, "q"); c.poly(pts.map((v, i) => (i % 2 ? v + 2 : v)), "R")
    c.poly([0, 112, 48, 113, 44, 120, 0, 120], "r")                              // wet foot
    c.line(18, 100, 14, 112, "r"); c.line(36, 104, 32, 114, "r")
    c.px(30, 99, "Q"); c.px(42, 105, "Q")
  }),
  // the tower
  layer("tower", { x: TX - 25 }, (c) => {
    c.poly([25, 58, 39, 58, 37, 27, 27, 27], "A")
    c.vline(25, 27, 32, "a"); c.vline(26, 27, 32, "a")                            // the side turned from the lantern
    c.poly([26, 30, 38, 30, 38, 35, 26, 35], "D"); c.vline(26, 30, 5, "d")         // red bands
    c.poly([26, 46, 39, 46, 39, 51, 26, 51], "D"); c.vline(26, 46, 5, "d")
    c.rect(30, 52, 5, 6, "a"); c.hline(31, 51, 3, "a")                            // the door
    c.rect(21, 24, 23, 1, "A"); c.rect(21, 25, 23, 2, "a"); c.hline(27, 24, 11, "b")   // gallery, its floor lit under the lamp room
    c.hline(21, 19, 23, "a"); for (let x = 21; x <= 43; x += 3) c.vline(x, 19, 5, x >= 27 && x <= 37 ? "A" : "a")   // railing
    c.rect(26, 8, 13, 11, "Y"); c.circ(32, 13, 2, "y"); c.px(32, 10, "y"); c.px(32, 16, "y")   // the lamp room, the lens
    for (const x of [26, 30, 34, 38]) c.vline(x, 8, 11, "a"); c.hline(26, 13, 13, "a")   // glazing bars
    c.poly([24, 8, 40, 8, 37, 4, 27, 4], "a"); c.hline(26, 7, 13, "A"); c.hline(28, 4, 8, "A"); c.vline(32, 1, 3, "A"); c.px(31, 1, "A")   // dome, its underside lit, and the vane
  }),
  layer("keeper", (c) => keeper(c, TX + 15, 24, c.frame)),
  layer("gulls", (c) => {
    const p = c.phase
    const birds = [[102, 30, 0, 0.2], [128, 44, 2, 0.6], [88, 50, 1, 0.9]]
    for (const [x0, y0, d, ph] of birds) {
      const x = x0 + Math.round(3 * Math.sin(TAU * (p + ph))) - Math.round(2 * Math.sin(TAU * (2 * p + ph)))   // thrown about, no headway
      const y = y0 + Math.round(2 * Math.sin(TAU * (2 * p + ph * 2)))
      c.stamp("gull", x, y, { delay: d * 83 })
    }
  }),
  layer("spray", (c) => {
    const f = c.frame
    spray(c, 82, 92, ((f + 6) % 30) / 30, 11, 22)                                  // the headland's sea face, twice a loop
    spray(c, 49, 112, ((f + 21) % 30) / 30, 23, 14)                                 // the near rocks, out of step
    const wash = (f % 15) / 15
    c.hline(84 + Math.round(wash * 3), 90, 5 - Math.round(wash * 2), "f"); c.hline(66, 94, 7, "f")   // wash along the foot
    c.hline(44 + Math.round(wash * 2), 111, 4, "f"); c.hline(38, 114, 5 + Math.round((1 - wash) * 3), "f")
  }),
  // rain: 130 streaks, each 2 px left and 4 px down a frame: twice round the height, once round 120 px of width
  layer("rain", stamp("rain", 0, 0)),
  // the beam: light layers over everything, the rain brightest in it
  layer("beam_out", { light: LIFT2, density: 0.45 }, (c) => beam(c, 1)),
  layer("beam_mid", { light: LIFT2, density: 0.8 }, (c) => beam(c, 0.65)),
  layer("beam_in", { light: LIFT3 }, (c) => beam(c, 0.3)),
  layer("flare_out", { light: LIFT1, density: 0.3 }, (c) => flare(c, 5, 16)),
  layer("flare_in", { light: LIFT1, density: 0.6 }, (c) => flare(c, 2, 8)),
  layer("sea_path", { light: LIFT2, density: 0.6 }, (c) => seapath(c)),
  layer("lantern_light", { light: LIFT1, density: 0.5 }, (c) => c.circ(TX + 22 + Math.round(Math.sin(TAU * c.frame / 6 + 1) * 0.9), 19, 5, "y")),
  glow("yY", { ramp: 1, r: 5, keep: "yYoaAbBhHjnkdDe" }))
