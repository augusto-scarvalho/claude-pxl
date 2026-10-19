// Towers: the far megacity at dusk, backlit by the sun setting at the upper left (28, 46). Brutalist
// megablocks and corporate towers in three depths, near "1", mid "2", far "3". Below row 70 the
// dusty haze thickens toward their feet and lifts them a tone every 9 rows until they dissolve into
// the sky's "h". Their tops and left edges catch the sun: a 1 px rim, brighter near it. Lit windows
// come and go, red beacons blink, the spire's holo panel changes glyph. Coordinates below are scene
// coordinates; the box is 320x100, stamped at (0, 12).
include("palette.px.js", { palette: true })

const TOWERS_W = 320, TOWERS_H = 100, TOWERS_Y0 = 12    // the box, and the scene row of its top
const TOWERS_TONES = "1234h"                           // body tone by depth + haze steps
const TOWERS_BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16)
const TOWERS_rng = (seed) => () => {                   // mulberry32: the same city every build
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

// Buildings, far to near (later ones stand in front). m: masses [x0, x1 (exclusive), top, bottom =
// 112]; thin: masts and needles [x, top, bottom], dark, never rimmed. style: the face's pattern.
// win: lit window keys; dens: how often a window slot starts a lit run; roof: rooftop units to add.
const TOWERS_B = [
  // ghosts: the farthest supertalls, pale in the haze
  { plane: 2, style: "plain", m: [[60, 98, 40], [66, 90, 35], [72, 82, 31]], win: "O", dens: 0.04 },
  { plane: 2, style: "plain", m: [[146, 158, 26], [148, 156, 22]], thin: [[152, 15, 22]], win: "O", dens: 0.05 },
  { plane: 2, style: "plain", m: [[298, 312, 30], [301, 309, 26]], thin: [[305, 20, 26]], win: "O", dens: 0.05 },
  // the far city's skyline, continuous behind everything
  ...(() => {
    const r = TOWERS_rng(7), out = []
    for (let x = -6; x < 326;) {
      const w = 6 + Math.floor(r() * 14), top = 62 + Math.floor(r() * 14)
      out.push({ plane: 2, style: "plain", m: [[x, x + w, top]], win: "Oo", dens: 0.1, roof: 1 + Math.floor(r() * 2) })
      x += w - 2 - Math.floor(r() * 3)
    }
    return out
  })(),
  // mid blocks between the big ones
  { plane: 1, style: "slab", m: [[0, 14, 42], [3, 10, 39]], win: "wO", dens: 0.08 },
  { plane: 1, style: "slab", m: [[56, 76, 54]], win: "wO", dens: 0.08, roof: 2 },
  { plane: 1, style: "slab", m: [[84, 100, 51]], win: "wO", dens: 0.08, roof: 2 },
  { plane: 1, style: "slab", m: [[136, 152, 57]], win: "wO", dens: 0.08, roof: 2 },
  { plane: 1, style: "slab", m: [[182, 198, 52], [191, 195, 47]], thin: [[186, 44, 52]], win: "wO", dens: 0.08 },
  // a wedge-topped block: its roof slopes down to the right, a step every 2 px
  { plane: 1, style: "slab", m: [[222, 226, 50], ...Array.from({ length: 9 }, (_, n) => [226 + 2 * n, 228 + 2 * n, 44 + n])], ptop: 44, win: "wO", dens: 0.08 },
  // the brutalist megablock the sun sinks behind: roof on row 50, plant and masts against the disc
  { plane: 0, style: "slab", win: "wo", dens: 0.1, m: [[0, 8, 56], [8, 62, 50], [62, 70, 54],
    [13, 22, 47], [30, 37, 48], [53, 60, 46]], thin: [[46, 35, 50], [57, 41, 46], [18, 43, 47]] },
  // a slender residential tower
  { plane: 0, style: "slab", win: "wo", dens: 0.1, m: [[72, 85, 44], [74, 83, 41]], thin: [[78, 34, 41]] },
  // the twin-slab arcology, its skybridges
  { plane: 0, style: "slab", win: "woi", dens: 0.09, m: [[96, 114, 30], [99, 110, 27], [98, 112, 23, 24]], thin: [[104, 19, 23], [98, 24, 27], [111, 24, 27]] },
  { plane: 0, style: "slab", win: "woi", dens: 0.09, m: [[121, 139, 36], [124, 135, 33], [114, 121, 48, 52], [114, 121, 62, 65]],
    thin: [[130, 29, 33]], roof: 1 },
  // a hammerhead block: a wide cantilevered head on a narrow shaft
  { plane: 0, style: "slab", win: "iw", dens: 0.1, m: [[162, 178, 58], [152, 188, 46, 58]], roof: 3 },
  // the corporate spire
  { plane: 0, style: "fins", win: "i", dens: 0.07, m: [[196, 223, 60], [199, 220, 30], [202, 217, 22], [205, 214, 17]],
    thin: [[209, 13, 17], [210, 13, 17]] },
  // the terraced megabuilding, a gate through its upper tier
  { plane: 0, style: "terrace", win: "wwo", dens: 0.12, m: [[240, 320, 58], [248, 314, 50], [258, 302, 44], [266, 292, 40],
    [271, 278, 37]], thin: [[286, 31, 40]], gate: [272, 284, 46, 54] },
]
// The spire's holo panel: 13x9 glyphs drawn from (203, 31).
const TOWERS_PANEL = [203, 31]
const TOWERS_GLYPHS = [`
  ......x......
  .....zzz.....
  ....zz.zz....
  ...zz...zz...
  ..zz..x..zz..
  .zzzzzzzzzzz.
  .............
  ..zzzzzzzzz..
  .............`, `
  ....zzzzz....
  ..zz.....zz..
  .z...zzz...z.
  z...zxxxz...z
  .z...zzz...z.
  ..zz.....zz..
  ....zzzzz....
  ......z......
  ....zzzzz....`].map((g) => g.split("\n").map((s) => s.trim()).filter(Boolean))
// Red beacons [x, y, phase]: spire needle, megablock mast, the twin slabs' masts.
const TOWERS_BEACONS = [[209, 12, 0], [210, 12, 0], [46, 34, 8], [104, 18, 15], [130, 28, 4]]

// Raster the masses (owner, mass top and left per pixel), then key every pixel.
const TOWERS_GRID = (() => {
  const N = TOWERS_W * TOWERS_H, own = new Int16Array(N).fill(-1), mtop = new Int16Array(N), mx0 = new Int16Array(N)
  const thin = new Uint8Array(N), idx = (x, y) => (y - TOWERS_Y0) * TOWERS_W + x
  const at = (x, y) => (x < 0 || x >= TOWERS_W || y < TOWERS_Y0 || y >= TOWERS_Y0 + TOWERS_H ? -1 : own[idx(x, y)])
  const fill = (i, x0, x1, top, bottom, isThin) => {
    for (let y = Math.max(top, TOWERS_Y0); y < bottom; y++) for (let x = Math.max(0, x0); x < Math.min(TOWERS_W, x1); x++) {
      const k = idx(x, y)
      own[k] = i; mtop[k] = top; mx0[k] = x0; thin[k] = isThin ? 1 : 0
    }
  }
  const r = TOWERS_rng(5)
  TOWERS_B.forEach((b, i) => {
    for (const [x0, x1, top, bottom = 112] of b.m) fill(i, x0, x1, top, bottom, false)
    // rooftop plant on the highest mass: boxes of 2-5 px catching the sun on their tops
    if (b.roof) {
      const [x0, x1, top] = b.m.reduce((a, m) => (m[2] < a[2] ? m : a))
      for (let n = 0; n < b.roof; n++) {
        const w = 2 + Math.floor(r() * 4), h = 1 + Math.floor(r() * 3), x = x0 + 1 + Math.floor(r() * Math.max(1, x1 - x0 - w - 2))
        fill(i, x, x + w, top - h, top, false)
      }
    }
    if (b.gate) { const [x0, x1, t, bt] = b.gate; for (let y = t; y < bt; y++) for (let x = x0; x < x1; x++) own[idx(x, y)] = -1 }
    for (const [x, top, bottom] of b.thin || []) fill(i, x, x + 1, top, bottom, true)
  })
  const haze = (y) => Math.max(0, (y - 70) / 9)
  const tone = (t, x, y) => {
    let i = Math.floor(t)
    const f = t - i
    if (f > 0.6 && (f - 0.6) / 0.4 > TOWERS_BAYER[(y & 3) * 4 + (x & 3)]) i++
    return TOWERS_TONES[Math.min(4, i)]
  }
  // the sun's rim: brighter near the sun and on nearer towers; left edges a step below tops
  const rim = (plane, x, y, side) => {
    const d = Math.hypot(x - 28, y - 46)
    const lv = (d < 26 ? 3 : d < 70 ? 2 : d < 170 ? 1 : 0) - plane - side
    return lv >= 3 ? "Y" : lv === 2 ? "y" : lv === 1 ? "H" : "h"
  }
  // the face's pattern, a tone lighter where it catches the haze: spandrels of floor groups and
  // piers (slabs), the spire's fins and sky-lobby bands, balcony slabs (terraces). Gone in the haze.
  const pattern = (b, k, x, y) => {
    if (haze(y) > 0.3) return 0
    const ly = y - (b.ptop ?? mtop[k]), lx = x - mx0[k]
    if (b.style === "slab") return ly % 6 === 5 || (lx % 10 === 0 && lx > 0) ? 1 : 0
    if (b.style === "fins") return (y < 62 && (x - 196) % 3 === 0) || y === 46 || y === 54 ? 1 : 0
    if (b.style === "terrace") return ly % 4 === 3 && lx % 12 !== 6 ? 1 : 0
    return 0
  }
  const winRow = (b, k, x, y) => {
    const ly = y - mtop[k]
    if (b.style === "slab") return ly % 3 === 1 && ly > 1
    if (b.style === "fins") return y % 2 === 0 && (x - 196) % 3 !== 0 && y !== 46 && y !== 54
    if (b.style === "terrace") return ly % 4 === 1
    return ly % 3 === 1 && ly > 1
  }
  const keys = new Array(N).fill("."), body = new Uint8Array(N)
  for (let y = TOWERS_Y0; y < TOWERS_Y0 + TOWERS_H; y++) for (let x = 0; x < TOWERS_W; x++) {
    const i = at(x, y)
    if (i < 0) continue
    const b = TOWERS_B[i], k = idx(x, y), h = haze(y), p = thin[k] ? 0 : pattern(b, k, x, y)
    let key = tone(b.plane + h + p, x, y)
    if (!thin[k] && h < 1.5) {
      const up = at(x, y - 1), left = at(x - 1, y)
      if (up < i && at(x, y + 1) === i) key = rim(b.plane, x, y, 0)
      else if (left < i && at(x + 1, y) === i && at(x + 2, y) === i) key = rim(b.plane, x, y, 1)
      else if (!p && left === i && at(x + 1, y) === i && up === i) body[k] = 1
    }
    keys[k] = key
  }
  // the spire's face is lit a tone lighter around its holo panel
  for (let y = 27; y < 44; y++) for (let x = 197; x < 222; x++) {
    const d = Math.hypot((x - 209) / 11, (y - 35) / 7.5), k = idx(x, y)
    if (own[k] >= 0 && TOWERS_B[own[k]].style === "fins" && /[12]/.test(keys[k]) && (d < 0.75 || (d < 1 && (1 - d) / 0.25 > TOWERS_BAYER[(y & 3) * 4 + (x & 3)]))) {
      keys[k] = keys[k] === "1" ? "2" : "3"; body[k] = 0
    }
  }
  // lit windows in runs of 1-3 along the floors; most stay lit, some come on or go off in the loop
  const flip = []
  for (let y = TOWERS_Y0; y < TOWERS_Y0 + TOWERS_H; y++) for (let x = 0; x < TOWERS_W; x++) {
    const k = idx(x, y), i = own[k]
    if (!body[k] || haze(y) > 0.45) continue
    const b = TOWERS_B[i]
    if (!winRow(b, k, x, y) || r() > b.dens) continue
    const key = haze(y) >= 0.3 ? "O" : b.win[Math.floor(r() * b.win.length)]
    const run = b.style === "fins" ? 1 : 1 + Math.floor(r() * 3), px = []
    for (let n = 0; n < run && body[idx(x + n, y)] && own[idx(x + n, y)] === i; n++) { px.push(x + n); body[idx(x + n, y)] = 0 }
    if (r() < 0.18) flip.push({ px, y, key, on: Math.floor(r() * 240), len: 60 + Math.floor(r() * 120) })
    else for (const wx of px) keys[idx(wx, y)] = key
  }
  return { keys, flip }
})()

sprite("_towers_static", { w: TOWERS_W, h: TOWERS_H }, (c) => {
  for (let y = 0; y < TOWERS_H; y++) for (let x = 0; x < TOWERS_W; x++) {
    const k = TOWERS_GRID.keys[y * TOWERS_W + x]
    if (k !== ".") c.px(x, y, k)
  }
})

anim("towers_skyline", { w: TOWERS_W, h: TOWERS_H, frames: 240, fps: 12 },
  stamp("_towers_static", 0, 0),
  (c) => {
    const f = c.frame
    // windows lit for their own stretch of the loop; fluorescent ones blink as they come on
    for (const { px, y, key, on, len } of TOWERS_GRID.flip) {
      const a = (f - on + 240) % 240
      if (a < len && !(key === "i" && (a === 1 || a === 3))) for (const x of px) c.px(x, y - TOWERS_Y0, key)
    }
    for (const [x, y, ph] of TOWERS_BEACONS) if ((f + ph) % 24 < 3) c.px(x, y - TOWERS_Y0, "p")
    // the holo panel: glyph A, then glyph B, each ending in a 2-frame glitch
    const glitch = f % 120 >= 118
    TOWERS_GLYPHS[f < 120 ? 0 : 1].forEach((row, gy) => {
      const dx = glitch ? ((gy * 5 + f) % 3) - 1 : 0
      for (let gx = 0; gx < row.length; gx++)
        if (row[gx] !== ".") c.px(TOWERS_PANEL[0] + gx + dx, TOWERS_PANEL[1] + gy - TOWERS_Y0, glitch && gy % 3 === 1 ? "Z" : row[gx])
    })
  })

// The part as the city places it, over a stand-in sky (the real one is sky_bg). Its ref layer marks
// what stands in front in the city: the strip's roofs, the billboard, the freeway deck, the gantry.
scene("test_towers", { w: 320, h: 180, bg: "h", world: { light: [-1, -0.45] } },
  layer("sky", grad(0, 0, 320, 112, "NnvVhH"), grad(-22, -4, 100, 100, "YyH.", "r"), circ(28, 46, 9, "Y"), circ(28, 46, 7, "W")),
  layer("towers", stamp("towers_skyline", 0, 12)),
  layer("cover", { ref: 0.55 }, rect(0, 58, 62, 82, "K"), rect(34, 40, 1, 18, "K"), rect(62, 94, 56, 46, "K"),
    rect(64, 58, 52, 36, "C"), rect(170, 110, 62, 30, "K"), rect(232, 76, 54, 64, "K"), rect(286, 92, 34, 48, "K"),
    rect(0, 78, 320, 13, "c"), rect(288, 60, 31, 17, "t")))
