// "The Keeper's Watch": lighthouse on a headland, storm night. One light: the lamp at (LX, LY),
// its beam sweeping round; everything it touches steps up a tone. 32-frame loop.
pal({
  k: "#07070f", n: "#0e1224", N: "#18203a", s: "#26304e", S: "#3a4668", // night sky / cloud ramp
  b: "#0b1a26", B: "#14303e", v: "#1f4a58", V: "#3b7380",                // sea
  f: "#8fb4bc", F: "#d8ecee",                                              // foam / spray
  r: "#141218", R: "#25222c", q: "#3a3542", Q: "#5a5262",                 // rock
  w: "#8a8a96", W: "#c8c4c0", c: "#7a2630", C: "#b23a3a",                 // tower white / red bands
  y: "#c89a1c", Y: "#f2cc3a", o: "#6a4a10",                               // oilskin
  l: "#fff4c0", L: "#ffe27a", a: "#a89a6a", A: "#d8c88a",                 // lamp, beam, lit rain
})
ramps("knNsS", "bBvVfF", "rRqQ", "wW", "cC", "oyY", "aAl")

const W = 160, H = 120, T = 32, LX = 58, LY = 27
const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5; return s - Math.floor(s) }
const ridge = (x) => 78 + Math.round(6 * Math.sin(x * 0.07) + 3 * Math.sin(x * 0.23 + 1) + (x > 100 ? (x - 100) ** 1.5 * 0.25 : 0))

anim("storm", { w: W, h: H, frames: T, fps: 11 }, (c) => {
  const p = c.phase, th = p * Math.PI * 2
  const dx = Math.cos(th), front = Math.sin(th)       // beam: horizontal reach, toward the viewer
  const inBeam = (x, y) => {
    const ex = x - LX, ey = y - LY
    if (Math.abs(dx) < 0.08 || Math.sign(ex) !== Math.sign(dx)) return 0
    const len = Math.abs(ex), spread = 3 + len * (0.12 + 0.25 * Math.abs(front))
    if (Math.abs(ey + len * 0.04) > spread || len > 170 * Math.abs(dx)) return 0
    return Math.abs(ey) < spread * 0.45 ? 2 : 1
  }
  // sky: banded cloud, drifting one loop = 16 px
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const u = x + p * 16, cl = Math.sin(u * 0.025 + y * 0.32) + 0.6 * Math.sin(u * 0.06 - y * 0.15 + 2)
    let i = (y + 8 * hash(x, y) < 22) ? 1 : 2
    if (cl > 0.8) i++
    const bm = inBeam(x, y); i += bm
    if (bm === 2 && (x + y) % 2) { c.px(x, y, "a"); continue }
    c.px(x, y, "knNsS"[Math.min(i, 4)])
  }
  // sea: swells moving toward the rocks, a loop's worth
  for (let y = 74; y < H; y++) for (let x = 0; x < W; x++) {
    const w = Math.sin(x * 0.18 - th * 2 + y * 0.9) + Math.sin(x * 0.07 + th + y * 0.4)
    let k = w > 1.3 ? "v" : w > 0 ? "B" : "b"
    if (w > 1.75 && hash(x, y) > 0.4) k = "f"
    if (inBeam(x, y)) k = { b: "B", B: "v", v: "V", f: "F" }[k]
    c.px(x, y, k)
  }
  // headland
  for (let x = 0; x < W; x++) {
    const top = x < 104 ? ridge(x) - Math.round(Math.max(0, 40 - x) * 0.0) : ridge(x)
    if (top >= H) break
    for (let y = top; y < H; y++) {
      const d = y - top, crack = (y + Math.floor(x / 3)) % 7 === 0
      let k = d < 2 ? "Q" : d < 6 ? "q" : crack ? "r" : "R"
      if (x > 108 && d > 2) k = "r"
      if (inBeam(x, y)) k = { r: "R", R: "q", q: "Q", Q: "Q" }[k]
      c.px(x, y, k)
    }
  }
  // tower: tapers from 14 px at the foot (y 74) to 8 px at the gallery (y 36)
  for (let y = 36; y < ridge(LX) + 2; y++) {
    const half = Math.round(4 + (y - 36) * 0.08), band = Math.floor((y - 36) / 8) % 2
    for (let x = LX - half; x <= LX + half; x++) {
      const lit = x < LX - half + 2 ? 0 : 1       // lamp's spill hits the near face; left rim dark
      c.px(x, y, band ? (lit ? "C" : "c") : (lit ? "W" : "w"))
    }
  }
  c.px(LX - 1, 50, "k"); c.px(LX - 1, 51, "k"); c.px(LX + 1, 64, "k"); c.px(LX + 1, 65, "k")
  // gallery rail + lantern room + cap
  for (let x = LX - 8; x <= LX + 8; x++) { c.px(x, 35, "r"); c.px(x, 32, "R") }
  for (let x = LX - 8; x <= LX + 8; x += 4) { c.px(x, 33, "R"); c.px(x, 34, "R") }
  for (let y = 24; y < 32; y++) for (let x = LX - 4; x <= LX + 4; x++) c.px(x, y, (x === LX - 4 || x === LX + 4 || (x - LX) % 3 === 0 && y % 2) ? "r" : "L")
  for (let y = 20; y < 24; y++) for (let x = LX - 5 + (y - 20); x <= LX + 5 - (y - 20); x++) c.px(x, y, "r")
  c.px(LX, 19, "R"); c.px(LX, 18, "R")
  // the lamp: brightest pixel, flares when facing us
  const fl = front > 0.7 ? 3 : front > 0.2 ? 2 : 1
  for (let y = -fl; y <= fl; y++) for (let x = -fl; x <= fl; x++) if (Math.abs(x) + Math.abs(y) <= fl) c.px(LX + x, LY + y, Math.abs(x) + Math.abs(y) < fl ? "l" : "L")
  // beam core
  for (let y = 0; y < 74; y++) for (let x = 0; x < W; x++) if (inBeam(x, y) === 2 && hash(x, y + c.frame) > 0.55 && c.is(x, y, "s")) c.px(x, y, "a")
  // keeper on the gallery, right of the lamp room, lantern held out; coat flaps on 4 frames
  const kx = LX + 6, fr = c.frame % 4
  const body = [[0, -9, "Y"], [0, -8, "Y"], [-1, -8, "y"], [-1, -7, "y"], [0, -7, "Y"], [-1, -6, "y"], [0, -6, "Y"], [1, -6, "Y"],
    [-1, -5, "y"], [0, -5, "Y"], [1, -5, "y"], [-1, -4, "o"], [0, -4, "y"], [-1, -3, "o"], [0, -3, "o"], [1, -10, "y"], [0, -10, "y"]]
  for (const [x, y, k] of body) c.px(kx + x, 35 + y, k)
  const flap = [[[2, -5], [2, -4]], [[2, -5], [3, -4], [2, -4]], [[2, -5], [3, -5], [4, -4]], [[2, -5], [3, -4]]][fr]
  for (const [x, y] of flap) c.px(kx + x, 35 + y, "y")
  c.px(kx + 1, 31 - 3, "Y"); c.px(kx + 2, 28, "y"); c.px(kx + 3, 29, "R"); c.px(kx + 3, 30, fr < 2 ? "l" : "L")
  // rain: slanting 2:1 down-left, 4 px per frame so the loop closes
  for (let i = 0; i < 140; i++) {
    const x0 = Math.floor(hash(i, 1) * (W + 60)), y0 = Math.floor(hash(i, 2) * H)
    const yy = (y0 + c.frame * 8) % H, xx = ((x0 - c.frame * 4) % (W + 60) + W + 60) % (W + 60) - 30
    for (let j = 0; j < 3; j++) {
      const x = xx - Math.floor(j / 2), y = yy - j
      if (x < 0 || x >= W || y < 0) continue
      const k = inBeam(x, y) ? (j ? "A" : "l") : "S"
      if (!(x >= LX - 5 && x <= LX + 5 && y > 18 && y < 36)) c.px(x, y, k)
    }
  }
  // waves breaking on the foot of the cliff: two bursts out of step, spray rising and falling
  for (const [bx, off] of [[104, 0], [118, 0.5], [90, 0.25]]) {
    const q = (p + off) % 1, hgt = Math.sin(q * Math.PI) * 18
    for (let i = 0; i < 26; i++) {
      const a = hash(i, bx), sx = bx + Math.round((a - 0.5) * 16 * (0.4 + q)), sy = 82 - Math.round(hgt * hash(i, bx + 7))
      if (q < 0.85 && sy < H) { c.px(sx, sy, q < 0.5 ? "F" : "f"); if (q < 0.4) c.px(sx, sy + 1, "f") }
    }
    for (let x = bx - 10; x < bx + 10; x++) if (hash(x, Math.floor(q * 8)) > 0.4) c.px(x, 84 + Math.round(q * 2), "F")
  }
  // gulls: pushed back by the wind, beating hard, out of step
  for (const [gx, gy, ph] of [[120, 30, 0], [138, 44, 0.33], [100, 16, 0.66]]) {
    const q = (p + ph) % 1, x = gx - Math.round(Math.sin(q * Math.PI * 2) * 4), y = gy + Math.round(Math.sin(q * Math.PI * 4) * 2)
    const up = (c.frame + Math.round(ph * 8)) % 4 < 2, lit = inBeam(x, y) ? "F" : "w"
    c.px(x, y, lit); c.px(x + 1, y, lit)
    if (up) { c.px(x - 1, y - 1, lit); c.px(x - 2, y - 2, lit); c.px(x + 2, y - 1, lit); c.px(x + 3, y - 2, lit) }
    else { c.px(x - 1, y + 1, lit); c.px(x - 2, y + 1, lit); c.px(x + 2, y + 1, lit); c.px(x + 3, y + 1, lit) }
  }
})
