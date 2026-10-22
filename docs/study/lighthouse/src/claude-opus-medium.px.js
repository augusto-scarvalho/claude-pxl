// Made for the model study (docs/model-study.md) by Claude Code, Opus 5.5 at medium effort; its file as it left it.
// Gale Light: a lighthouse on a headland in a night storm, 160x120, a 64-frame loop at 12 fps.
// The light comes from the lamp at the top of the tower (LX, LY): two beams 180° apart turn half a
// turn in the loop, so a beam crosses each side once a loop. The beam lights what it passes through
// (sky, cloud, rain, gulls) by stepping it up its ramp; the rocks take their faint light from the
// lamp above-right, so their faces toward the sea stay dark. The keeper's lantern is a second,
// small warm light that lights the keeper's front.
// Wind blows from the left: rain slants right, waves run right into the rocks, spray and the
// keeper's coat go right, the gulls face left into it and barely hold their place.

pal({
  k: "#080a14", n: "#111729", N: "#1b2440", b: "#2a3858", B: "#41557c", c: "#6c84a8",   // night sky -> beam haze
  d: "#0a1520", s: "#132a38", S: "#1f4352", f: "#5f8e9c", F: "#a9cbd2", W: "#e8f4ee",   // sea -> spray
  r: "#0c0c14", R: "#1b1b26", q: "#2e2f3e", Q: "#4a4c5e",                               // rock
  G: "#16261f", v: "#2a4231",                                                           // wind-bent grass
  u: "#2a2f44", t: "#5a6178", T: "#8b92a8",                                             // tower paint
  m: "#3e1824", M: "#6c2a34",                                                           // red bands, roof
  g: "#5e3c14", A: "#a8761a", a: "#e6b42a", h: "#f8dc78",                               // yellow oilskin
  p: "#d89a78", o: "#3a2a1c", L: "#ffb04a",                                             // skin, lantern frame, lantern flame
  Y: "#ffd870", y: "#fff6c8",                                                           // the lamp
})
ramps("knNbBc", "dsSfFW", "rRqQ", "Gv", "utT", "mM", "gAah", "Yy")

const W = 160, H = 120, N = 64, FPS = 12, TAU = Math.PI * 2
const LX = 116, LY = 23            // the lamp: the scene's light
const HZ = 66                      // horizon

// The headland's top edge, left to right (the sea washes the left face).
const EDGE = [[48, 121], [52, 114], [57, 110], [60, 105], [64, 102], [67, 98], [70, 96], [73, 92],
  [77, 90], [82, 87], [88, 85], [96, 84], [130, 84], [138, 83], [148, 85], [161, 84]]
const topY = (x) => {
  for (let i = 1; i < EDGE.length; i++) {
    const [x0, y0] = EDGE[i - 1], [x1, y1] = EDGE[i]
    if (x <= x1) return Math.round(y0 + (y1 - y0) * (x - x0) / (x1 - x0))
  }
  return 121
}

// Beam i at frame f: angle about the tower's axis; x on screen = cos, toward us = sin.
function beams(f) {
  return [0, 1].map((i) => {
    const a = Math.PI * f / N + i * Math.PI + 0.3
    const dx = Math.cos(a), toward = Math.sin(a)
    const len = 150 * Math.pow(Math.abs(dx), 0.6)
    const ex = LX + Math.sign(dx) * len, hw = 2 + 0.12 * len, droop = 0.05 * len
    return {
      toward, len,
      outer: [LX, LY - 1, ex, LY + droop - hw, ex, LY + droop + hw, LX, LY + 2],
      core: [LX, LY, ex, LY + droop - hw * 0.4, ex, LY + droop + hw * 0.4, LX, LY + 1],
    }
  })
}
const inPoly = (p) => (x, y) => {
  let inside = false
  for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2)
    if ((p[i + 1] > y) !== (p[j + 1] > y) && x < (p[j] - p[i]) * (y - p[i + 1]) / (p[j + 1] - p[i + 1]) + p[i]) inside = !inside
  return inside
}
const lightBeams = (c, front) => {
  for (const bm of beams(c.frame)) {
    if ((bm.toward >= 0) !== front || bm.len < 4) continue
    c.light(inPoly(bm.outer), front ? 2 : 1, front ? 1 : 0.5)
    c.light(inPoly(bm.core), front ? 2 : 1)
  }
}
const flash = (f) => Math.max(...beams(f).map((b) => b.toward))   // 1 = a beam looks straight at us

// --- the keeper: yellow oilskin, sou'wester, lantern held out into the wind; the coat tail flaps.
const KEEPER = [`
....aah...
...aaaah..
..aaaaaah.
....pAh...
...aAAh...
..aaAAAh..
.paaAAAhh.
.o.aAAAgh.
.L.aAAAg.h
.o.aAAAg..
...gg.g...`, `
....aah...
...aaaah..
..aaaaaahh
....pAh...
...aAAh...
..aaAAAh..
.paaAAAhhh
.o.aAAAg.h
.L.aAAAg..
.o.aAAAg..
...gg.g...`, `
....aah...
...aaaah..
..aaaaaah.
....pAh...
...aAAh...
..aaAAAh..
.paaAAAh..
.o.aAAAgh.
.L.aAAAgh.
.o.aAAAgh.
...gg.g...`, `
....aah...
...aaaah..
..aaaaaah.
....pAh...
...aAAh...
..aaAAAh..
.paaAAAhh.
.o.aAAAghh
.L.aAAAghh
.o.aAAAg.h
...gg.g...`]
anim("keeper", { w: 10, h: 11, frames: N, fps: FPS, pivot: "bottom", facing: "left", height: 1.8 },
  (c) => c.grid(0, 0, KEEPER[Math.floor(c.frame / 2) % 4]))

// --- gulls: a pale body, dark tips; four wing drawings
const GULL = [`
k.....k
.T...T.
..TTT..`, `
.......
kT...Tk
..TTT..`, `
.......
..TTT..
kT...Tk`, `
.......
kT...Tk
..TTT..`]
anim("gull", { w: 7, h: 3, frames: N, fps: FPS, facing: "left" },
  (c) => c.grid(0, 0, GULL[Math.floor(c.frame / 2) % 4]))

scene("gale_light", { w: W, h: H, bg: "n", world: { light: { at: [LX, LY] } } },

  layer("sky", { unlit: true }, (c) => {
    const cl = seamless((x, y) => fbm(x / 26, y / 9, 4), 128)
    const s = 2 * c.frame
    // the sky pales toward the horizon; storm cloud is darker mass scudding right, its lower edge
    // catching a little of the horizon glow
    for (let y = 0; y < HZ; y++) for (let x = 0; x < W; x++) {
      const sky = 0.4 + 2.2 * (y / HZ) ** 1.6
      const v = cl(x + s, y), dense = Math.max(0, (v - 0.42) * 4.5) * (1.1 - y / HZ * 0.7)
      const rim = Math.max(0, cl(x + s, y - 2) - cl(x + s, y)) * 6
      const t = sky - dense + (dense > 0.2 ? rim : 0) + (bayer(x, y) - 0.5) * 0.4
      c.px(x, y, "knNb"[Math.max(0, Math.min(3, Math.round(t)))])
    }
    lightBeams(c, false)
  }),

  layer("sea", (c) => {
    const f = c.frame
    c.rect(0, HZ, W, H - HZ, "s"); c.rect(0, HZ, W, 6, "d"); c.hline(0, HZ, W, "S")
    // rows of swell running right, nearer rows further apart, taller and faster; each crest a
    // wavy line lit on its face, dark trough behind it, foam where it peaks
    for (let ry = HZ + 2, i = 0; ry < H + 6; i++) {
      const near = (ry - HZ) / (H - HZ), v = near < 0.3 ? 0.5 : near < 0.65 ? 1 : 2
      const P = v === 0.5 ? 32 : 64, A = 0.6 + 2.6 * near, sh = Math.floor(v * f)
      for (let x = 0; x < W; x++) {
        const ph = TAU * (x - sh + 17 * i) / P, cy = ry + Math.round(A * Math.sin(ph))
        const peak = Math.sin(ph) < -0.75
        c.px(x, cy - 1, "d")
        if (Math.sin(ph) < 0.35) c.px(x, cy, peak && near > 0.3 ? "f" : "S")
        if (near > 0.45) c.px(x, cy + 1, peak && near > 0.6 ? "S" : "s")
      }
      ry += Math.round(3 + 7 * near)
    }
    // foam where the sea meets the rock, swelling with each wave that comes in
    for (let y = 92; y < H; y++) {
      const ex = topLeftOf(y), w = 2 + Math.round(1.5 + 1.5 * Math.sin(TAU * (f / 16 + y / 11)))
      for (let x = ex - w; x < ex; x++) if (hash(x * 3 + Math.floor(f / 2), y) > 0.35) c.px(x, y, x > ex - 2 ? "F" : "f")
    }
    // the swell gathering at the rock foot, then foam draining back
    for (let i = 0; i < 50; i++) {
      const x = 20 + hash(i, 3) * 45, y = 100 + hash(i, 4) * 20
      const xx = Math.floor(x + ((f + i * 7) % 32) / 4)
      if (xx < topLeftOf(y)) c.px(xx, Math.floor(y), hash(i, 5) > 0.5 ? "f" : "S")
    }
  }),

  layer("rocks", { solid: true }, (c) => {
    for (let x = 48; x < W; x++) {
      const top = topY(x), slope = topY(x + 2) - topY(x - 2)
      for (let y = top; y < H; y++) {
        // blocks of rock: each pixel belongs to the nearest of a jittered grid of points (cells
        // ~11x7, leaning with the strata); each block has its own face direction, lit by how far it
        // turns up and right toward the lamp; joints between blocks are dark
        const [a, b2, ci, nbAbove] = cellOf(x, y), d = y - top
        let k = hash(ci, 77) > 0.75 ? "q" : hash(ci, 77) > 0.2 || d < 12 ? "R" : "r"
        if (b2 - a < 1.2) k = nbAbove ? "q" : "r"            // a slab's lit top lip, the dark joint under it
        else if (b2 - a < 2.4 && nbAbove && k !== "r") k = k === "q" ? "Q" : "q"
        if (d < 1) k = slope > 0 ? "Q" : "q"
        else if (d < 2) k = slope > 0 ? "q" : "R"
        c.px(x, y, k)
      }
    }
    // offshore boulders, wet tops toward the lamp
    for (const [bx, by, r] of [[38, 115, 5], [28, 119, 4]]) {
      c.ellipse(bx, by, r + 1, r, "R"); c.ellipse(bx + 1, by - 1, r - 1, r - 2, "q"); c.px(bx + 2, by - r + 1, "Q")
    }
    // grass on the plateau, bent right, flicking 1 px with the gusts
    for (let i = 0; i < 26; i++) {
      const x = 84 + Math.floor(hash(i, 9) * 74), y = topY(x) - 1, lean = (c.frame + i * 5) % 8 < 4 ? 1 : 0
      if (x > 106 && x < 127) continue
      c.px(x, y, "v"); c.px(x + lean, y - 1, hash(i, 10) > 0.4 ? "v" : "G"); if (hash(i, 11) > 0.5) c.px(x + 1 + lean, y - 2, "G")
    }
  }),

  layer("tower", { solid: true }, (c) => {
    const f = c.frame, fl = flash(f)
    for (let y = 33; y <= 84; y++) {
      const hw = Math.round(5 + (y - 33) * 2 / 51), band = (y >= 46 && y <= 51) || (y >= 64 && y <= 69)
      for (let x = LX - hw; x <= LX + hw; x++) {
        const side = x - (LX - hw)                                    // lit from above-left by the spill and the lantern side
        c.px(x, y, band ? (side < 3 ? "M" : x >= LX + hw - 1 ? "m" : "M") : side < 2 ? "T" : x >= LX + hw - 2 ? "u" : "t")
      }
      if (band && (y === 46 || y === 64)) for (let x = LX - hw; x <= LX + hw; x++) c.px(x, y, "m")
    }
    // rain runs from the gallery's drip edge and under the window
    for (const [x, y0, n] of [[LX - 4, 33, 7], [LX - 2, 33, 4], [LX + 2, 33, 9], [LX + 4, 33, 5], [LX - 1, 59, 4]])
      for (let y = y0; y < y0 + n; y++) if (hash(x, y) > 0.3) c.px(x, y, c.is(x, y, "T") || c.is(x, y, "t") ? "u" : "m")
    c.rect(LX - 9, 82, 19, 3, "q"); c.hline(LX - 9, 82, 19, "Q")      // plinth
    c.rect(LX - 2, 76, 4, 6, "r"); c.hline(LX - 2, 75, 4, "u")         // door
    c.px(LX - 1, 57, "Y"); c.px(LX - 1, 58, "o")                       // stair window, lit
    // gallery deck (lit on top by the lamp) on brackets, the lantern room's parapet, the glass
    c.rect(LX - 16, 31, 31, 2, "u"); c.hline(LX - 16, 31, 31, "T")
    for (const x of [LX - 13, LX - 9, LX + 8, LX + 12]) c.line(x, 33, x + Math.sign(LX - x) * 2, 35, "u")
    c.rect(LX - 6, 28, 13, 3, "t"); c.hline(LX - 6, 28, 13, "T"); c.vline(LX + 5, 28, 3, "u"); c.vline(LX + 6, 28, 3, "u")
    for (let x = LX - 5; x <= LX + 5; x++) for (let y = 18; y <= 27; y++) {
      const dx = Math.abs(x - LX), dy = Math.abs(y - LY)
      c.px(x, y, dx + dy * 1.5 < 2.5 + 5 * fl * fl ? "y" : "Y")
    }
    const turn = Math.floor(f / 4) % 4                                  // the lens frame turns with the beams
    for (const x of [LX - 5, LX - 2 + (turn % 2), LX + 2 + (turn % 2), LX + 5]) c.vline(x, 18, 10, "u")
    c.hline(LX - 5, 17, 11, "u")
    // roof: a red cap lit from beneath by the lamp's spill, a vent ball on top
    c.poly([LX - 7, 16, LX - 3, 12, LX + 3, 12, LX + 7, 16], "m")
    c.hline(LX - 7, 16, 15, "M"); c.hline(LX - 2, 11, 5, "m"); c.rect(LX - 1, 9, 3, 2, "u"); c.px(LX - 1, 9, "t"); c.px(LX, 8, "u")
  }),

  layer("spray", { unlit: true }, (c) => {
    // breaking waves: four sites round the rock foot, each breaking once a loop, a quarter apart
    const SITES = [[61, 106], [71, 96], [55, 113], [66, 101]]
    SITES.forEach(([sx, sy], si) => {
      const t = ((c.frame - si * 16) % N + N) % N
      if (t < 4) {   // the swell rolls in and stands up against the rock
        const h = 1 + t
        for (let x = sx - 10 + 2 * t; x < sx; x++) for (let y = sy - h; y <= sy; y++) c.px(x, y + Math.floor((sx - x) / 4), y === sy - h ? "f" : "S")
      }
      if (t >= 4 && t < 30) {
        const a = t - 4
        for (let i = 0; i < 70; i++) {     // spray thrown up and carried right by the wind
          const vx = -0.3 + hash(i, si) * 2.6, vy = -1.5 - hash(si, i) ** 0.7 * 4.5, g = 0.3
          const x = Math.round(sx + vx * a + 0.04 * a * a), y = Math.round(sy + vy * a + g * a * a)
          if (y > sy + 3 || a > 12 + hash(i, 7) * 14) continue
          const kk = a < 4 ? "W" : a < 10 ? "F" : "f"
          c.px(x, y, kk)
          if (a < 7 && hash(i, 3) > 0.4) { c.px(x + 1, y, kk); c.px(x, y + 1, "F") }
        }
        if (a < 7) {                       // the wave's body thrown up the face: a white column that swells, then tears
          const r = 1.5 + a * 0.8, cy = sy - 2 - a * 2.2
          for (let y = Math.floor(cy - r * 1.6); y <= sy; y++) for (let x = sx - 3; x <= sx + 5; x++) {
            const inside = ((x - sx - 1 - a * 0.3) / r) ** 2 + ((y - cy) / (r * 1.6)) ** 2 < 1 || (y > cy && Math.abs(x - sx - 1) < 2.5 - (y - cy) * 0.1)
            if (inside && (a < 3 || hash(x * 7 + a, y) > (a - 2) * 0.17)) c.px(x, y, a < 3 && hash(x, y + a) > 0.3 ? "W" : "F")
          }
        }
        if (a >= 6 && a < 22) for (let i = 0; i < 10; i++) {   // foam runs off the rock
          const x = sx - 3 + Math.floor(hash(i, si + 40) * 6), y = sy - 6 + Math.floor(hash(si + 40, i) * 6) + Math.floor((a - 6) / 2)
          if (y <= sy + 2) c.px(x, y, "f")
        }
      }
    })
  }),

  layer("gulls", (c) => {
    for (const [gx, gy, ph, sp] of [[26, 38, 0, 1], [50, 28, 0.35, 2], [10, 50, 0.7, 1]]) {
      const x = Math.round(gx + 4 * Math.sin(TAU * (c.frame / N * sp + ph))), y = Math.round(gy + 1.5 * Math.sin(TAU * (c.frame / 16 + ph)))
      c.stamp("gull", x, y, { frame: (c.frame + Math.round(ph * 8)) % N })
    }
  }),

  layer("rain", (c) => {
    const f = c.frame
    for (let i = 0; i < 70; i++) {          // far rain: short, dim
      const x = Math.floor((hash(i, 1) * 96 + 1.5 * f) % 96) + 96 * (i % 2) - 16, y = Math.floor((hash(i, 2) * 128 + 4 * f) % 128) - 4
      c.line(x, y, x - 1, y - 2, "b")
    }
    for (let i = 0; i < 40; i++) {          // near rain: longer
      const x = Math.floor((hash(i, 5) * 192 + 3 * f) % 192) - 16, y = Math.floor((hash(i, 6) * 128 + 8 * f) % 128) - 4
      c.line(x, y, x - 1, y - 4, "B")
    }
  }),

  (c) => lightBeams(c, true),

  layer("keeper", stamp("keeper", LX - 11, 31)),
  layer("rail", (c) => {
    for (let x = LX - 16; x <= LX + 14; x += 5) c.vline(x, 27, 4, "u")
    c.hline(LX - 16, 27, 31, "t"); c.hline(LX - 16, 29, 31, "u")
  }),

  glow("yY", { r: 7, strength: 0.3, where: [LX - 6, 12, 13, 22] }),
  glow("L", { r: 5, strength: 0.6, bands: 2 }),
)

function cellOf(x, y) {
  let a = 1e9, b = 1e9, ci = 0, cy0 = 0, cy1 = 0
  const sx = 16, sy = 6, tilt = 0.3                       // slabs wide and flat, the strata dipping toward the sea
  const gx = Math.floor(x / sx), gy = Math.floor((y + x * tilt) / sy)
  for (let i = gx - 1; i <= gx + 1; i++) for (let j = gy - 1; j <= gy + 1; j++) {
    const px = (i + hash(i, j)) * sx, py = (j + 0.5 + 0.6 * (hash(j, i) - 0.5)) * sy - px * tilt
    const dd = Math.hypot((x - px) * 0.35, y - py)
    if (dd < a) { b = a; cy1 = cy0; a = dd; ci = i * 131 + j; cy0 = py } else if (dd < b) { b = dd; cy1 = py }
  }
  return [a, b, ci, cy1 < cy0]
}
function topLeftOf(y) { for (let x = 40; x < W; x++) if (topY(x) <= y) return x; return W }
