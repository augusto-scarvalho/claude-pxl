// Three-point perspective: the end of the Cretaceous, four in the afternoon. The camera stands low
// (1.2 m) at the foot of an erupting volcano and tilts up 18 degrees to take it in: the horizon drops
// near the bottom, ground lines still meet on it, and uprights lean in toward a third point high above
// the picture (P.vertical()). The volcano is a heightfield, the picture of it ray-marched pixel by
// pixel through the same camera. The big meteor has struck behind it; smaller ones keep falling. The
// soot hides the sun but for a gap. A tyrannosaur and a herd of gallimimus run left from the
// mountain in front of the burning scrub, pterosaurs flee overhead, the araucarias burn, and the wind
// blows it all, flames, smoke, embers and ash, to the right. 6 s, seamless.
pal({
  // the sky: soot, near black to the ash lit by the sun; the glow of the fires on its underside
  A: "#140e10", B: "#22171a", C: "#33231f", D: "#4b3329", E: "#6c4a36", F: "#9a6a48", G: "#7a2c1c", H: "#b0452a",
  // the sun through the soot: its disk, its halo, the light it throws
  I: "#fff0c0", J: "#ffc878", K: "#d88a50",
  // the volcano's rock: shade, mid, sunlit, lava-lit
  L: "#151216", M: "#231d22", N: "#3a2f33", O: "#5c4740", Q: "#6e2e20",
  // lava: crust to white heat
  R: "#3d0d08", S: "#7a1a0c", T: "#c0320e", U: "#ec6a1c", V: "#ffa832", W: "#ffe27a", X: "#fff8dc",
  // the plain: scorched earth, ash, burnt grass, the last green
  a: "#1e1715", b: "#2e231e", c: "#45362c", d: "#6b5f57", e: "#4f3f22", f: "#2d3820", g: "#46552c",
  // bark: charred, dark, mid, in the sun, lit by its own fire
  h: "#160f0d", i: "#2c1e18", j: "#4a3426", k: "#7a5236", l: "#b0502a",
  // a tyrannosaur: shade, hide, lit, the fire's rim; gallimimus: shade, hide, lit; pteranodons: dark, mid, lit from below; a crest
  m: "#2e2219", n: "#55402c", o: "#8a6040", p: "#c47038", r: "#4a4236", s: "#7a6e5c", t: "#b0a088", u: "#2e2222", v: "#6a4634", w: "#b86a3c", x: "#a03a26",
  // an eye
  0: "#0b0707", 1: "#e8d8b0",
})

const W = 320, H = 180, FPS = 10, FRAMES = 60
const P = perspective({ w: W, horizon: 150, eye: 1.2, fov: 80, pitch: 18 })
const RAD = Math.PI / 180, cp = Math.cos(P.pitch * RAD), sp = Math.sin(P.pitch * RAD), CY = P.horizon - P.focal * (sp / cp)
const hash = (i, j) => { let k = Math.imul(i, 374761393) + Math.imul(j, 668265263); k = Math.imul(k ^ (k >>> 13), 1274126177); return ((k ^ (k >>> 16)) >>> 0) / 4294967296 }
const noise = (x, y) => {
  const i = Math.floor(x), j = Math.floor(y), u = x - i, v = y - j, su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v)
  const a = hash(i, j), b = hash(i + 1, j), c = hash(i, j + 1), d = hash(i + 1, j + 1)
  return a + (b - a) * su + (c - a) * sv + (a - b - c + d) * su * sv
}
const fbm = (x, y, n = 4) => { let s = 0, a = 0.5, f = 1; for (let i = 0; i < n; i++) { s += a * noise(x * f, y * f); a *= 0.5; f *= 2.03 } return s / (1 - 0.5 ** n) }
// the ray through a pixel's middle, in the world: [across, ahead, up]
const ray = (col, row) => { const a = (col + 0.5 - P.vp) / P.focal, b = (CY - row - 0.5) / P.focal, l = Math.hypot(a, 1, b); return [a / l, (cp - b * sp) / l, (sp + b * cp) / l] }
const at = (x, z, u = 0) => P.ground(x, z, u).map(Math.round)

// ================================================================ the land
// A stratovolcano 1.8 km high, its foot 0.6 km off: steep near the top, spreading at the base, cut by
// gullies running down its sides; a crater at the top. The plain around it rolls a little.
const VX = 380, VZ = 2400, VH = 1850, VR = 1900, CR = 150, RIM = VH * (1 - CR / VR) ** 1.9
// the mountain alone, smooth: cheap, what the march steps by (the full land is never more than 4 m above it)
function bulk(x, z) {
  const r = Math.hypot(x - VX, z - VZ)
  if (r >= VR) return 0
  return r < CR ? RIM - 130 * (1 - (r / CR) ** 2) : VH * (1 - r / VR) ** 1.9
}
function height(x, z) {
  const dx = x - VX, dz = z - VZ, r = Math.hypot(dx, dz)
  const plain = 1.6 * (noise(x / 50, z / 50) - 0.5) + 5 * (noise(x / 380 + 7, z / 380) - 0.5) * Math.min(1, z / 300)
  if (r >= VR) return plain
  const ang = Math.atan2(dz, dx), s = 1 - r / VR, gully = 1 - 0.06 * Math.abs(Math.sin(ang * 9 + noise(r / 300, ang * 2) * 3)) * s
  return plain + bulk(x, z) * gully
}
// walk a pixel's ray out from `t0` until it goes under the land: [x, z, u, t], or null (the sky). In a
// column each row up lands no nearer than the one below, so the march starts where that one landed.
function march(col, row, t0) {
  const [dx, dz, du] = ray(col, row)
  let t = t0, prev = t0
  for (let i = 0; i < 1500 && t < 9000; i++) {
    const x = dx * t, z = dz * t, u = P.eye + du * t
    if (du > 0 && u > VH + 10) return null
    // far off, a step needn't be finer than what a pixel covers there
    let d = u - bulk(x, z) - 4
    if (d < 0) d = u - height(x, z)
    if (d < 0) {
      let lo = prev, hi = t
      for (let k = 0; k < 8; k++) { const m = (lo + hi) / 2; if (P.eye + du * m < height(dx * m, dz * m)) hi = m; else lo = m }
      return [dx * hi, dz * hi, P.eye + du * hi, hi]
    }
    prev = t
    t += Math.min(t * 0.03, Math.max(d * 0.6, t * 0.004, 0.05))
  }
  return null
}
// the sun at four in the afternoon: low in the west-southwest, ahead and to the left
const SUN_AZ = -30 * RAD, SUN_EL = 21 * RAD
const SUN = [Math.sin(SUN_AZ) * Math.cos(SUN_EL), Math.cos(SUN_AZ) * Math.cos(SUN_EL), Math.sin(SUN_EL)]
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.47)
const dither = (col, row) => BAYER[(row & 3) * 4 + (col & 3)]

// Lava running down from the crater's lip: each river starts on the lip facing us and goes down the
// steepest way, into the gullies, a little this way and that, slowing out on the plain into a lobe.
// Kept as points in meters; the ones the mountain hides from us are dropped.
const RIVERS = [-0.55, -0.3, -0.08, 0.2, 0.42].map((a, i) => {
  const r = rng(31 + i), face = Math.atan2(-VZ, -VX) + a, pts = []
  let x = VX + Math.cos(face) * CR * 1.02, z = VZ + Math.sin(face) * CR * 1.02
  for (let k = 0; k < 160; k++) {
    const e = 4, gx = (height(x + e, z) - height(x - e, z)) / (2 * e), gz = (height(x, z + e) - height(x, z - e)) / (2 * e), g = Math.hypot(gx, gz) || 1
    const out = Math.hypot(x - VX, z - VZ) > VR * 0.93, step = out ? 8 : 24, wob = (r() - 0.5) * (out ? 1.4 : 0.5)
    const dx = -gx / g, dz = -gz / g
    x += (dx * Math.cos(wob) - dz * Math.sin(wob)) * step; z += (dz * Math.cos(wob) + dx * Math.sin(wob)) * step
    pts.push([x, z, height(x, z) + 2])
    if (out && r() < 0.14) break
  }
  return pts
})
// is a point in sight, or behind the land? march toward it and see where the ray lands
function seen([x, z, u]) {
  const d = Math.hypot(x, z, u - P.eye), dir = [x / d, z / d, (u - P.eye) / d]
  for (let t = 20; t < d - 15; t += Math.max(4, t * 0.01)) if (P.eye + dir[2] * t < height(dir[0] * t, dir[1] * t)) return false
  return true
}
for (const R of RIVERS) R.splice(0, R.length, ...R.filter(seen))

// ================================================================ the land
function shadeLand(col, row, [x, z, u, t]) {
  const e = 2, hx = (height(x + e, z) - height(x - e, z)) / (2 * e), hz = (height(x, z + e) - height(x, z - e)) / (2 * e)
  const n = [-hx, -hz, 1], l = Math.hypot(...n), sun = Math.max(0, (n[0] * SUN[0] + n[1] * SUN[1] + n[2] * SUN[2]) / l)
  const r = Math.hypot(x - VX, z - VZ)
  if (r < VR * 0.97) {
    // rock: the faces turned to the sun take its dim orange light, the rest in soot-shade; scree in streaks down the slope
    const streak = fbm(Math.atan2(z - VZ, x - VX) * 40, r / 120, 3), v = sun * 1.05 + (streak - 0.5) * 0.45 + dither(col, row) * 0.12
    if (r < CR * 1.15) return v > 0.4 ? "Q" : "M"
    return v > 0.78 ? "K" : v > 0.58 ? "O" : v > 0.36 ? "N" : v > 0.14 ? "M" : "L"
  }
  // the plain: scorched earth, ash drifts, burnt grass; far off, the last green. The fire front ahead
  // lights it red, the more the nearer the flames, so the ground runs from dark at our feet to glowing
  const n2 = fbm(x / 9, z / 9, 3), v = sun * 0.8 + (n2 - 0.5) * 0.6 + dither(col, row) * 0.1
  if (t > 280) return n2 > 0.55 ? "g" : "f"
  const fire = Math.max(0, 1 - Math.abs(z - 95) / 70) + (n2 - 0.5) * 0.3 + dither(col, row) * 0.3
  if (fire > 0.9) return n2 > 0.5 ? "T" : "G"
  if (fire > 0.6) return n2 > 0.62 ? "Q" : "G"
  if (fire > 0.35) return n2 > 0.55 ? "Q" : "b"
  return n2 > 0.68 ? "d" : n2 < 0.3 ? "e" : v > 0.62 ? "c" : v > 0.38 ? "b" : "a"
}

// ================================================================ the sky
// Soot: a density over the sky's directions, billowing (one noise bending another); lit on the side
// toward the sun, thinning around it; underneath, low in the sky, the fires' red on the billows'
// bellies; shafts of sun fanning out through the thinner places.
const soot = (az, el) => { const x = az * 4.2, y = el * 6.5, w1 = fbm(x + 3, y, 3), w2 = fbm(x, y + 5, 3); return fbm(x + w1 * 1.7, y * 1.25 + w2 * 1.7, 4) }
// `breath` (0 to 1 round the loop) and `a` (how much, 0 at the edge of what breathes): the soot over the
// sun drifts a little and thins, then thickens again
function sky(col, row, breath = 0, a = 0) {
  const [dx, dz, du] = ray(col, row), az = Math.atan2(dx, dz), el = Math.asin(du)
  const toSun = Math.acos(Math.max(-1, Math.min(1, dx * SUN[0] + dz * SUN[1] + du * SUN[2])))
  const b = breath * Math.PI * 2, sootAt = (u, v) => soot(u + a * 0.04 * Math.cos(b), v + a * 0.025 * Math.sin(b)) - a * 0.16 * (0.5 - 0.5 * Math.cos(b))
  const d = sootAt(az, el), thin = Math.max(0, 1 - toSun / 0.42) ** 1.6
  if (toSun < 0.022 && d < 0.62) return "I"
  if (toSun < 0.036 && d < 0.6) return "J"
  const lit = d - sootAt(az - 0.03, el + 0.025), belly = d - sootAt(az, el - 0.03)
  const shaft = toSun < 0.9 && d < 0.52 && noise(Math.atan2(el - SUN_EL, az - SUN_AZ) * 11, 2) > 0.6 ? (1 - toSun / 0.9) * 0.22 : 0
  let v = 0.42 - el * 0.9 - (d - 0.5) * 1.8 + thin * 0.8 + (lit < -0.015 ? 0.18 : lit > 0.02 ? -0.1 : 0) + shaft + dither(col, row) * 0.12
  if (el < 0.3 && belly > 0.012 && d > 0.45) { const g = (0.3 - el) / 0.3 + (belly - 0.012) * 6 + dither(col, row) * 0.3; if (g > 0.6) return g > 1.0 ? "H" : "G" }
  if (v > 1.0 && thin > 0.2) return "K"
  return v > 0.86 ? "F" : v > 0.68 ? "E" : v > 0.5 ? "D" : v > 0.32 ? "C" : v > 0.14 ? "B" : "A"
}

// ================================================================ the plume
// The ash column above the crater: billows in 3D, rising and spreading, bent over to the right by the
// strong wind, so it streams away across the sky; each lit on its upper left by the sun, dark below,
// the lowest red from the fire in the crater. Drawn top first, so lower billows stand in front.
const PLUME = (() => {
  const r = rng(77), out = []
  for (let i = 0; i < 70; i++) {
    const s = (i / 70) ** 1.3 * 5000, a = r() * Math.PI * 2, rad = 170 + s * 0.32, off = rad * 0.5 * r()
    out.push({ p: [VX + 0.5 * s + 0.00012 * s * s + Math.cos(a) * off, VZ + Math.sin(a) * off * 0.5, RIM - 40 + s * 0.62 + Math.sin(a) * off * 0.5], rad: rad * (0.55 + r() * 0.45), s, k: i })
  }
  return out.sort((m, n) => n.s - m.s)
})()
function plume(c) {
  for (const b of PLUME) {
    const [cx, cy] = P.ground(...b.p), R = b.rad * P.scale(b.p[1], b.p[0], b.p[2])
    if (cy + R < 0 || cy - R > H) continue
    for (let y = Math.floor(cy - R - 2); y <= Math.ceil(cy + R + 2); y++) for (let x = Math.floor(cx - R - 2); x <= Math.ceil(cx + R + 2); x++) {
      if (x < 0 || x >= W || y < 0 || y >= H) continue
      const ox = x + 0.5 - cx, oy = y + 0.5 - cy, ang = Math.atan2(oy, ox), edge = R * (0.86 + 0.22 * noise(ang * 2.5 + b.k * 7, b.k))
      const dd = Math.hypot(ox, oy)
      if (dd > edge) continue
      // lit by the sun on its upper left, its belly red with the fire below, more the lower it is
      const lit = (-ox * 0.6 - oy * 0.8) / edge, rim = dd / edge, v = lit * 0.7 + rim * 0.25 + (noise(x / 5 + b.k, y / 5) - 0.5) * 0.4 + dither(x, y) * 0.15
      const belly = oy / edge + (1 - b.s / 1800) * 0.9 + dither(x, y) * 0.2
      if (belly > 0.75 && lit < 0.3) c.px(x, y, belly > 1.35 ? "H" : belly > 1.0 ? "G" : "Q")
      else c.px(x, y, v > 0.62 ? "E" : v > 0.3 ? "D" : v > 0.0 ? "C" : "B")
    }
  }
}

// ================================================================ lava
// The rivers: hot in the middle, cooling to crust at the edges, the rock beside them red from them;
// a pulse of fresh lava running down each, so they flow.
function lava(c, frame) {
  for (const [i, R] of RIVERS.entries()) for (let k = 1; k < R.length; k++) {
    const [ax, ay] = P.ground(...R[k - 1]), [bx, by] = P.ground(...R[k]), wide = Math.max(1, (k / R.length < 0.8 ? 12 : 20) * P.scale(R[k][1], R[k][0], R[k][2]))
    const flow = ((k / R.length - frame / FRAMES - i * 0.23) % 1 + 1) % 1, hot = flow < 0.08 ? "W" : flow < 0.2 ? "V" : "U"
    c.line(Math.round(ax), Math.round(ay), Math.round(bx), Math.round(by), wide > 2.2 ? "T" : hot, Math.round(wide))
    if (wide > 2.2) c.line(Math.round(ax), Math.round(ay), Math.round(bx), Math.round(by), hot, Math.max(1, Math.round(wide * 0.45)))
  }
}
// the crater: a glow on its lip, the lava fountaining out of it, bombs flung up and falling back
function crater(c, frame) {
  const [cx, cy] = P.ground(VX, VZ, RIM), sc = P.scale(VZ, VX, RIM)
  for (let i = 0; i < 40; i++) {
    const r = rng(500 + i), period = [20, 30, 15][i % 3], ph = ((frame / period + r()) % 1), a = (r() - 0.5) * 1.5, v = 110 + r() * 150
    // up and out, then down: a parabola in meters, from the crater's middle, drawn with a short trail
    const spot = (p) => { const tt = p * 2.2 * (v / 120); return [cx + Math.sin(a) * v * tt * sc, cy - (v * tt - 0.5 * 9.8 * 9 * tt * tt) * sc] }
    const [px, py] = spot(ph), [qx, qy] = spot(Math.max(0, ph - 0.06))
    if (py > cy + 25) continue
    c.line(Math.round(qx), Math.round(qy), Math.round(px), Math.round(py), "U")
    c.px(Math.round(px), Math.round(py), ph < 0.35 ? "X" : ph < 0.65 ? "W" : "V")
  }
  for (let i = -3; i <= 3; i++) c.px(Math.round(cx + i), Math.round(cy), Math.abs(i) < 2 ? "W" : "V")
}


// ================================================================ the trees
// Paraná pines (Araucaria, already old in the Cretaceous): a straight trunk bare up to the crown, then
// whorls of branches curving up at their ends like a candelabra, the needles in tufts at the ends, so
// the crown is a flat-topped dish. Upright in the world, so on screen they lean in toward the third
// vanishing point above. They burn: the crown and the bark on the windward side catch, the flames
// leaning right with the wind; what has burnt is black.
function araucaria(x, z, { tall = 34, seed = 1, burn = 0.7 } = {}) {
  const r = rng(seed), g = height(x, z), r0 = tall * 0.024, branches = [], tufts = []
  for (let u = tall * 0.64, w = 0; u < tall - 1; u += 1.7, w++) {
    const n = 5, len = (tall - u) * 0.42 + 2.2, rot = r() * 6.28
    for (let i = 0; i < n; i++) {
      const a = rot + (i / n) * Math.PI * 2 + (r() - 0.5) * 0.5, ca = Math.cos(a), sa = Math.sin(a)
      const base = [x, z, g + u], mid = [x + ca * len * 0.62, z + sa * len * 0.62, g + u + len * 0.1], tip = [x + ca * len, z + sa * len, g + u + len * 0.5]
      branches.push([base, mid, tip])
      for (const [f, s] of [[1, 1.25], [0.82, 0.9]]) tufts.push({ p: [x + ca * len * f, z + sa * len * f, g + u + len * (0.5 * f * f + 0.1) + 0.5], rad: s * (0.9 + r() * 0.4), burning: r() < burn, v: r() })
    }
  }
  return { x, z, d: Math.hypot(x, z), g, tall, r0, branches, tufts, burn, seed }
}
const TREES = [
  araucaria(-10.5, 13, { tall: 38, seed: 3, burn: 1 }),
  araucaria(30, 55, { tall: 34, seed: 5, burn: 0.85 }),
  araucaria(-26, 78, { tall: 30, seed: 9, burn: 0.55 }),
  araucaria(8, 130, { tall: 27, seed: 11, burn: 0.3 }),
]
// A trunk from `a` to `b` (radius r0 to r1), shaded like a cylinder lit from the left (the sun). Where
// it burns (`burning`), the bark is charred, its furrows glowing, the right side lit by the flames.
// Each row it crosses: the axis found between two samples, so the edges run smooth.
function column(c, a, b, r0, r1, burning) {
  const at3 = (t) => a.map((v, k) => v + (b[k] - v) * t), [, ya] = P.ground(...a), [, yb] = P.ground(...b), n = Math.ceil(Math.abs(ya - yb) * 2) + 2
  const S = Array.from({ length: n + 1 }, (_, i) => { const p = at3(i / n); return { s: P.ground(...p), h: (r0 + (r1 - r0) * (i / n)) * P.scale(p[1], p[0], p[2]), t: i / n, u: p[2] } })
  for (let y = Math.max(0, Math.floor(Math.min(ya, yb))); y <= Math.min(H - 1, Math.ceil(Math.max(ya, yb))); y++) {
    let q = S[0]
    for (const s of S) if (Math.abs(s.s[1] - y - 0.5) < Math.abs(q.s[1] - y - 0.5)) q = s
    for (let x = Math.floor(q.s[0] - q.h - 1); x <= Math.ceil(q.s[0] + q.h + 1); x++) {
      const across = (x + 0.5 - q.s[0]) / Math.max(0.5, q.h)
      if (Math.abs(across) > 1 || x < 0 || x >= W) continue
      // bark in vertical plates, furrows between them
      const furrow = Math.abs(noise(across * 5 + 9, q.u * 0.7) - 0.5) < 0.07, v = -across * 0.85 + dither(x, y) * 0.25
      if (burning) c.px(x, y, furrow ? (across > -0.2 ? "U" : "T") : across > 0.55 ? "l" : v > 0.45 ? "j" : v > -0.2 ? "i" : "h")
      else c.px(x, y, furrow ? "h" : v > 0.55 ? "k" : v > 0.05 ? "j" : v > -0.45 ? "i" : "h")
    }
  }
}
// the tree's still parts: trunk, branches, tufts (green, or black where burnt, a red edge where burning)
function paintTree(c, T) {
  column(c, [T.x, T.z, T.g - 0.5], [T.x, T.z, T.g + T.tall], T.r0, T.r0 * 0.4, T.burn > 0.5)
  for (const [b, m, t] of T.branches) {
    const w = Math.max(1, Math.round(0.16 * P.scale(m[1], m[0], m[2])))
    c.line(...at(...b), ...at(...m), "h", w); c.line(...at(...m), ...at(...t), "h", Math.max(1, w - 1))
  }
  for (const q of [...T.tufts].sort((m, n) => Math.hypot(n.p[0], n.p[1]) - Math.hypot(m.p[0], m.p[1]))) {
    const [cx, cy] = P.ground(...q.p), R = Math.max(0.8, q.rad * P.scale(q.p[1], q.p[0], q.p[2]))
    for (let y = Math.floor(cy - R * 0.6); y <= Math.ceil(cy + R * 0.6); y++) for (let x = Math.floor(cx - R); x <= Math.ceil(cx + R); x++) {
      const ox = (x + 0.5 - cx) / R, oy = (y + 0.5 - cy) / (R * 0.6)
      if (ox * ox + oy * oy > 1 + 0.35 * (noise(x * 0.9 + q.v * 50, y * 0.9) - 0.5)) continue
      c.px(x, y, q.burning ? (oy > 0.45 ? "T" : oy > 0.1 ? "S" : "h") : oy < -0.4 ? "g" : "f")
    }
  }
}
// flames: tongues rising from what burns, flickering, leaning right with the wind, white-hot at the
// root to red at the tip; smoke over them streams away right
function flame(c, cx, cy, size, frame, seed) {
  const r = rng(seed), n = Math.max(1, Math.round(size * 0.5))
  for (let i = 0; i < n; i++) {
    const ph = (frame / 6 + r()) % 1, h = size * (0.7 + 0.6 * Math.sin((ph + i * 0.3) * Math.PI * 2) ** 2) * (0.6 + r() * 0.6)
    const x0 = cx + (r() - 0.5) * size * 0.8, w = Math.max(1, size * 0.22)
    for (let k = 0; k < h; k++) {
      const f = k / h, x = Math.round(x0 + f * f * h * 0.55 + Math.sin(f * 4 + ph * 6.28) * 0.6), y = Math.round(cy - k), ww = Math.max(0, Math.round(w * (1 - f)))
      const key = f < 0.2 ? "X" : f < 0.45 ? "W" : f < 0.75 ? "V" : "U"
      for (let j = -ww; j <= ww; j++) c.px(x + j, y, Math.abs(j) === ww && ww > 0 ? (f < 0.5 ? "V" : "T") : key)
    }
  }
}
function treeFire(c, T, frame) {
  for (const [i, q] of T.tufts.entries()) {
    if (!q.burning || i % 2) continue
    const [cx, cy] = P.ground(...q.p), s = q.rad * P.scale(q.p[1], q.p[0], q.p[2])
    flame(c, cx, cy - s * 0.4, Math.max(2, s * 0.95), frame, T.seed * 100 + i)
  }
  // the windward side of a burning trunk: a sheet of flame licking up it
  if (T.burn > 0.9) for (let i = 0; i < 70; i++) {
    const r = rng(T.seed * 31 + i), u = r() ** 1.3 * T.tall, side = 0.35 + r() * 0.55, p = [T.x + T.r0 * side * (1 - (0.6 * u) / T.tall), T.z, T.g + u], [cx, cy] = P.ground(...p), s = P.scale(p[1], p[0], p[2])
    if (cy < -12 || cy > H + 4) continue
    flame(c, cx, cy, Math.max(2, s * (0.15 + 0.5 * r() ** 2)), frame, T.seed * 1000 + i)
  }
}

const SKY = new Uint8Array(W * H)
sprite("_bg", { w: W, h: H }, (c) => {
  for (let col = 0; col < W; col++) {
    let t = 0.5, open = false
    for (let row = H - 1; row >= 0; row--) {
      const hit = open ? null : march(col, row, t)
      if (hit) { t = hit[3] * 0.98; c.px(col, row, shadeLand(col, row, hit)) }
      else if (row >= P.horizon) c.px(col, row, "f")
      else { open = true; SKY[row * W + col] = 1; c.px(col, row, sky(col, row)) }
    }
  }
  impact(c)
  plume(c)
  smoke(c)
  scrub(c)
})

// ================================================================ shapes
const addv = (a, b) => a.map((v, k) => v + b[k]), mul = (a, s) => a.map((v) => v * s)
const unit = (v) => { const l = Math.hypot(...v) || 1; return v.map((c) => c / l) }
// A limb as a cone from a to b (radius ra to rb, in meters) painted round: every pixel in it shaded by
// where it sits across it on screen, its upper side lit (the sun, and behind, the fires: a hot rim
// along the top), its underside in shade. `ramp`: shade, hide, lit, rim.
function paintCone(c, [a, ra, b, rb], ramp) {
  const [ax, ay] = P.ground(...a), [bx, by] = P.ground(...b), sa = ra * P.scale(a[1], a[0], a[2]), sb = rb * P.scale(b[1], b[0], b[2])
  const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1, L = Math.sqrt(L2)
  let nx = -dy / L, ny = dx / L
  if (ny > 0) { nx = -nx; ny = -ny }
  const m = Math.max(sa, sb) + 1
  for (let y = Math.floor(Math.min(ay, by) - m); y <= Math.ceil(Math.max(ay, by) + m); y++) for (let x = Math.floor(Math.min(ax, bx) - m); x <= Math.ceil(Math.max(ax, bx) + m); x++) {
    const px = x + 0.5 - ax, py = y + 0.5 - ay, t = Math.max(0, Math.min(1, (px * dx + py * dy) / L2)), R = sa + (sb - sa) * t
    const ox = px - dx * t, oy = py - dy * t
    if (Math.hypot(ox, oy) > R + 0.2) continue
    const across = (ox * nx + oy * ny) / Math.max(0.6, R)
    c.px(x, y, ramp[across > 0.78 ? 3 : across > 0.3 ? 2 : across > -0.4 ? 1 : 0])
  }
}

// ================================================================ the dinosaurs
// A biped in profile, in meters, as palaeoartists draw them side on (the tyrannosaur after
// steveoc86's profile on Wikimedia Commons): its top and bottom lines from the tail's tip to the
// snout, f m ahead of the hip joint, u m above it, smoothed. The tyrannosaur: the tail as deep as the
// hips where it leaves them, thinning slowly to its tip; a deep body, the belly hanging between the
// legs; a short thick neck in an S, as deep as the head; the head big and boxy, deepest behind the
// eyes, the snout deep and blunt, the jaw line straight; the lower jaw its own piece, hinged and
// dropped open. Legs posed by a run worked out in 3D like the park's people (each toe on an oval,
// the knee by two-bone IK, bent forward as a bird's is), the big thigh merging into the body.
const TREX = {
  hip: 2.9, thigh: 1.4, shin: 1.3, foot: 0.8, reach: 1.25, lift: 0.55, bob: 0.1, side: 0.5, thighR: 0.72, shinR: 0.38, footR: 0.17,
  upper: [[-6.7, 0.1], [-5.2, 0.32], [-3.4, 0.55], [-1.6, 0.8], [0, 0.95], [1.3, 0.88], [2.3, 0.78], [2.95, 0.98], [3.4, 1.35], [3.8, 1.55], [4.3, 1.55], [4.8, 1.4], [5.25, 1.14], [5.42, 0.95]],
  lower: [[-6.7, 0.05], [-5.2, 0.04], [-3.4, -0.06], [-1.6, -0.3], [-0.5, -0.65], [0.6, -0.95], [1.6, -0.95], [2.35, -0.6], [2.9, -0.15], [3.45, 0.35], [3.75, 0.62], [4.3, 0.68], [5.42, 0.74]],
  jaw: { at: [3.72, 0.62], len: 1.55, back: 0.38, front: 0.2, gape: 0.4 }, eye: [4.25, 1.3], nostril: [5.22, 1.02], arm: [2.25, -0.4],
  teeth: [4.0, 4.35, 4.7, 5.05, 5.3], nod: 0.05,
}
const GALLI = {
  hip: 1.45, thigh: 0.62, shin: 0.75, foot: 0.55, reach: 0.95, lift: 0.4, bob: 0.06, side: 0.2, thighR: 0.24, shinR: 0.08, footR: 0.05,
  upper: [[-3.1, 0.05], [-2, 0.16], [-0.9, 0.3], [0, 0.4], [0.7, 0.36], [1.05, 0.42], [1.45, 0.8], [1.8, 1.18], [2.0, 1.32], [2.22, 1.32], [2.55, 1.18]],
  lower: [[-3.1, 0.0], [-2, -0.01], [-0.9, -0.12], [0, -0.32], [0.6, -0.4], [1.0, -0.2], [1.3, 0.3], [1.65, 0.84], [1.9, 1.12], [2.2, 1.15], [2.55, 1.15]],
  eye: [2.08, 1.26], arm: [0.85, -0.2], nod: 0.04,
}
// a line through points, smoothed (Catmull-Rom), then read as u at any f
function smooth(pts) {
  const ext = [pts[0], ...pts, pts[pts.length - 1]], out = []
  for (let i = 1; i < ext.length - 2; i++) for (let k = 0; k < 8; k++) {
    const t = k / 8, [p0, p1, p2, p3] = [ext[i - 1], ext[i], ext[i + 1], ext[i + 2]]
    out.push([0, 1].map((j) => 0.5 * (2 * p1[j] + (p2[j] - p0[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t * t + (3 * p1[j] - p0[j] - 3 * p2[j] + p3[j]) * t * t * t)))
  }
  out.push(pts[pts.length - 1])
  return out
}
function along2(line, f) {
  if (f <= line[0][0]) return line[0][1]
  for (let i = 1; i < line.length; i++) if (f <= line[i][0]) { const [a, b] = [line[i - 1], line[i]], t = (f - a[0]) / (b[0] - a[0] || 1); return a[1] + (b[1] - a[1]) * t }
  return line[line.length - 1][1]
}
for (const B of [TREX, GALLI]) { B.top = smooth(B.upper); B.bot = smooth(B.lower) }
// Paint a body between its lines, in thin slices across it: each pixel shaded by how far down its
// slice it is: a hot rim along the top (the fires behind), lit, hide, the underside in shade, the
// belly's very edge catching the glow off the burning ground; darker bands across the back.
function paintBody(c, B, w3, du, ramp, from, to) {
  for (let f = from; f <= to; f += 0.035) {
    const [tx, ty] = P.ground(...w3(f, 0, along2(B.top, f) + du(f))), [bx, by] = P.ground(...w3(f, 0, along2(B.bot, f) + du(f))), n = Math.max(1, Math.ceil(Math.hypot(bx - tx, by - ty)))
    for (let i = 0; i <= n; i++) {
      const q = i / n
      let k = q < 0.1 ? 3 : q < 0.36 ? 2 : q < 0.76 ? 1 : q < 0.93 ? 0 : 1
      if (q > 0.08 && q < 0.5 && (((f / 0.55) % 1) + 1) % 1 < 0.3) k = Math.max(0, k - 1)
      c.px(Math.round(tx + (bx - tx) * q), Math.round(ty + (by - ty) * q), ramp[k])
    }
  }
}
function runner(B, { x, z, phase, ramp }) {
  const g = height(x, z), th = phase * Math.PI * 2, hipU = B.hip + B.bob * Math.cos(2 * th)
  const w3 = (f, r, u) => [x - f, z + r, g + hipU + u]                                    // running left: forward is -x, the near side -z
  // the tail swings up and down a little with the stride, the head nods
  const du = (f) => (f < -2 ? 0.12 * Math.sin(th * 2 + f * 0.6) * ((-2 - f) / 4.7) : 0) + (f > 2.6 ? B.nod * Math.sin(th * 2) * (f - 2.6) : 0)
  const legs = [-1, 1].map((sd) => {
    const t = th + (sd > 0 ? Math.PI : 0), toeF = B.reach * Math.cos(t), lift = B.lift * Math.max(0, -Math.sin(t))
    const ankle = [toeF - B.foot * 0.45, lift + B.foot * 0.8], dx = ankle[0], dz = ankle[1] - hipU, d = Math.min(Math.hypot(dx, dz), B.thigh + B.shin - 0.01)
    const ka = Math.atan2(dz, dx) + Math.acos((B.thigh ** 2 + d * d - B.shin ** 2) / (2 * B.thigh * d))
    const at3 = (f, u) => [x - f, z + sd * B.side, g + u]
    return { sd, hip: at3(0, hipU), knee: at3(Math.cos(ka) * B.thigh, hipU + Math.sin(ka) * B.thigh), ankle: at3(ankle[0], ankle[1]), toe: at3(toeF + B.foot * 0.3, lift + 0.02) }
  })
  const far = ramp[0] + ramp.slice(0, 3)
  // the thigh in the body's own tone, only its underside in shade, so it reads as muscle under the
  // hide and its top sinks into the body (no hot rim across the hip); the shin thick at the calf
  const leg = (L, rp) => {
    const flat = rp[0] + rp[1] + rp[1] + rp[1]
    paintCone(c_, [L.knee, B.shinR, L.ankle, B.shinR * 0.45], rp)
    paintCone(c_, [L.hip, B.thighR, L.knee, B.thighR * 0.42], flat)
    paintCone(c_, [L.ankle, B.footR, L.toe, B.footR * 0.7], rp)
  }
  let c_
  return {
    d: Math.hypot(x, z),
    draw(c) {
      c_ = c
      leg(legs[1], far)
      if (B.arm) c.line(...at(...w3(B.arm[0], 0.4, B.arm[1])), ...at(...w3(B.arm[0] + 0.35, 0.4, B.arm[1] - 0.3)), far[1])
      paintBody(c, B, w3, du, ramp, B.upper[0][0], B.upper[B.upper.length - 1][0])
      if (B.jaw) {
        // the lower jaw, hinged behind and dropped open; the mouth red inside; teeth in both jaws
        const J = B.jaw, rot = (l, dn) => [J.at[0] + l * Math.cos(J.gape) - dn * Math.sin(J.gape), J.at[1] - l * Math.sin(J.gape) - dn * Math.cos(J.gape)]
        const P2 = (p) => at(...w3(p[0], -0.05, p[1] + du(p[0])))
        c.poly([...P2(J.at), ...P2([B.lower[B.lower.length - 1][0] - 0.05, B.lower[B.lower.length - 1][1]]), ...P2(rot(J.len, 0))], "x")
        for (let l = 0; l <= J.len; l += 0.03) {
          const top = rot(l, 0), bot = rot(l, J.back + (J.front - J.back) * (l / J.len)), [tx, ty] = P2(top), [bx, by] = P2(bot), n = Math.max(1, Math.ceil(Math.hypot(bx - tx, by - ty)))
          for (let i = 0; i <= n; i++) c.px(Math.round(tx + (bx - tx) * (i / n)), Math.round(ty + (by - ty) * (i / n)), ramp[i / n < 0.5 ? 1 : 0])
        }
        for (const f of B.teeth) { c.px(...P2([f, along2(B.bot, f) - 0.1]), "1"); const l = f - J.at[0] - 0.15; if (l > 0 && l < J.len) c.px(...P2(rot(l, -0.08)), "1") }
      }
      leg(legs[0], ramp)
      if (B.arm) {
        const s = w3(B.arm[0], -0.45, B.arm[1]), e = w3(B.arm[0] + 0.3, -0.5, B.arm[1] - 0.32), h = w3(B.arm[0] + 0.55, -0.5, B.arm[1] - 0.25)
        c.line(...at(...s), ...at(...e), ramp[2], Math.max(1, Math.round(0.14 * P.scale(z, x)))); c.line(...at(...e), ...at(...h), ramp[1])
      }
      // the eye catching the fire under a dark brow; the nostril
      const E = at(...w3(B.eye[0], -0.3, B.eye[1] + du(B.eye[0])))
      c.px(E[0], E[1], "W"); c.px(E[0] - 1, E[1] - 1, ramp[0]); c.px(E[0], E[1] - 1, ramp[0]); c.px(E[0] + 1, E[1] - 1, ramp[0])
      if (B.nostril) c.px(...at(...w3(B.nostril[0], -0.2, B.nostril[1] + du(B.nostril[0]))), ramp[0])
    },
  }
}
const RAMP = { trex: "mnop", galli: "rstp" }
// Who runs where, a loop of 6 s: each runs left at its own speed and, gone off the left (or behind
// the near trunk), comes back in on the right; the loop's length in meters is what each covers in it,
// longer than the width it's seen across, so the coming back is never in sight.
const RUNNERS = [
  { B: TREX, ramp: RAMP.trex, z: 21, x0: 10, v: 13, cycle: 6 },
  ...[[36, 10, 0], [41, 24, 2], [34, 40, 1], [45, 52, 3], [38, 66, 2], [43, 80, 0]].map(([z, x0, off]) => ({ B: GALLI, ramp: RAMP.galli, z, x0, v: 17.5, cycle: 4, off })),
]
function runners(frame) {
  const t = frame / FPS
  return RUNNERS.map((R) => {
    const L = R.v * (FRAMES / FPS), x = ((((R.x0 - R.v * t) % L) + L) % L) - (L / 2) * 0.95
    return runner(R.B, { x, z: R.z, phase: ((frame + (R.off ?? 0)) % R.cycle) / R.cycle, ramp: R.ramp })
  })
}
// Pterosaurs the size of a Quetzalcoatlus (11 m across), seen from below and ahead: drawn by hand,
// wings up, level and down, in two sizes, their undersides lit by the fires; placed and sized by the
// camera along their way
sprite("_pt_up", { pivot: [13, 4] }, `
..v.....................v..
..vv...................vv..
...vw.......x.........wv...
...vww.....vxv.......wwv...
....vww....vuv......wwv....
....vwww..wvuvw...wwwv.....
.....vwwwwwvuvwwwwwwv......
......vvvwwvuvwwvvv........
..........v.u.v............
............u..............`)
sprite("_pt_mid", { pivot: [13, 4] }, `
............x..............
...........vxv.............
...........vuv.............
vvwww.....wvuvw.....wwwvv..
.vvwwwwwwwwvuvwwwwwwwwvv...
...vvvwwwwwvuvwwwwwvvv.....
.......vvvv.u.vvvv.........
............u..............`)
sprite("_pt_down", { pivot: [13, 4] }, `
............x..............
...........vxv.............
...........vuv.............
.........wwvuvww...........
......wwwwwvuvwwwww........
....vwwwwvvvuvvvwwwwv......
...vwwwvv...u...vvwwwv.....
..vwwv......u......vwwv....
.vwv................vwv....
.vv..................vv....`)
sprite("_pts_up", { pivot: [6, 3] }, `
.v.........v.
.vw...x...wv.
..vw.vuv.wv..
...vwwuwwv...
.....vuv.....
......u......`)
sprite("_pts_mid", { pivot: [6, 3] }, `
......x......
.....vuv.....
vvwwwvuvwwwvv
.vvvwwuwwvvv.
.....v.v.....
......u......`)
sprite("_pts_down", { pivot: [6, 3] }, `
......x......
.....vuv.....
...wwwuwww...
..vwvvuvvwv..
.vwv..u..vwv.
.v.........v.`)
// the pterosaurs flee the mountain toward us and to the left: small in the smoke at first, growing as
// they come, wings spread slantwise across the picture and their undersides lit by the fires below,
// until they pass over and out of the top
const FLY = unit([-0.72, -0.68, 0.05])
const FLYERS = [[85, 120, 40, 0], [60, 140, 52, 0.34], [110, 105, 34, 0.67]].map(([x, z, u, ph], k) => ({ S: [x, z, u], ph, k }))
function flyers(frame) {
  return FLYERS.map((F) => {
    const p = addv(F.S, mul(FLY, ((frame / FRAMES + F.ph) % 1) * 130))
    const [x, y] = at(...p), span = 11 * P.scale(p[1], p[0], p[2]), beat = ["up", "mid", "down", "mid"][Math.floor(((frame + F.k * 3) % 8) / 2)]
    return { d: Math.hypot(p[0], p[1]), sprite: span > 17 ? "_pt_" + beat : "_pts_" + beat, x, y }
  })
}


// ================================================================ the fire front
// Between the runners and the mountain the scrub, the cycads and the young pines are alight: black
// against their own flames, which lean right with the wind; smoke streams off to the right.
const FRONT = (() => {
  const r = rng(61), out = []
  for (let i = 0; i < 110; i++) out.push({ x: -170 + r() * 360, z: 85 + r() * 120, s: 1.4 + r() * 3.2, kind: r() < 0.35 ? "pine" : r() < 0.5 ? "cycad" : "bush", seed: i })
  return out.sort((m, n) => Math.hypot(n.x, n.z) - Math.hypot(m.x, m.z))
})()
function scrub(c) {
  for (const q of FRONT) {
    const g = height(q.x, q.z), [bx, by] = P.ground(q.x, q.z, g), sc = P.scale(q.z, q.x, g), h = q.s * sc, w = h * (q.kind === "pine" ? 0.35 : 0.6)
    for (let y = Math.floor(by - h); y <= Math.ceil(by); y++) {
      const f = (by - y) / h, half = q.kind === "pine" ? w * (1 - f) : q.kind === "cycad" ? w * (f > 0.55 ? 1.1 - f * 0.4 : 0.15) : w * Math.sqrt(Math.max(0, 1 - (2 * f - 1) ** 2))
      for (let x = Math.floor(bx - half); x <= Math.ceil(bx + half); x++) c.px(x, y, hash(x, y) < 0.15 ? "S" : "h")
    }
  }
}
function fronds(c, frame) {
  const r = rng(2200)
  for (let i = 0; i < 9; i++) {
    const bx = 262 + r() * 50, by = H + 2, a = -Math.PI / 2 + (r() - 0.6) * 1.6, len = 18 + r() * 22, bend = (r() - 0.3) * 0.03, lit = r() < 0.6
    let x = bx, y = by, ang = a
    for (let k = 0; k < len; k++) {
      ang += bend; x += Math.cos(ang); y += Math.sin(ang)
      c.px(Math.round(x), Math.round(y), "h")
      if (k % 3 === 0 && k > 3) for (const sd of [-1, 1]) {
        const lx = x + Math.cos(ang + sd * 1.1) * (3 - k / len * 2), ly = y + Math.sin(ang + sd * 1.1) * (3 - k / len * 2)
        c.line(Math.round(x), Math.round(y), Math.round(lx), Math.round(ly), k > len * 0.75 && lit ? "S" : "h")
      }
    }
    if (lit) flame(c, x, y, 4 + r() * 3, frame, 2300 + i)
  }
}
const NEAR = Array.from({ length: 12 }, (_, i) => { const r = rng(1700 + i); return { x: -14 + r() * 40, z: 6 + r() * 11, s: 0.4 + r() * 0.5, seed: 1800 + i } }).filter((q) => Math.abs(q.x / q.z) < 0.85)
function nearFire(c, frame) {
  for (const q of NEAR) {
    const [bx, by] = P.ground(q.x, q.z, height(q.x, q.z)), sc = P.scale(q.z, q.x)
    for (let i = -2; i <= 2; i++) c.px(Math.round(bx + i * q.s * sc * 0.4), Math.round(by), "h")
    flame(c, bx, by, Math.max(2, q.s * sc), frame, q.seed)
  }
}
function frontFire(c, frame) {
  for (const q of FRONT) {
    const g = height(q.x, q.z), [bx, by] = P.ground(q.x, q.z, g), sc = P.scale(q.z, q.x, g)
    flame(c, bx, by - q.s * sc * 0.5, Math.max(2, q.s * sc * 1.1), frame, 7000 + q.seed)
  }
}


// ================================================================ meteors
// The big one has struck already, far off to the right, behind the mountain: the sky there glows and
// the dust it threw up climbs in a column. Smaller ones keep coming down, all the same way (so their
// trails, parallel, run toward one point in the sky), each burning white at its head, its trail
// cooling to red and to smoke, striking far off with a flash.
const IMPACT = [9500, 15000]
function impact(c) {
  const [ix, iy] = P.ground(...IMPACT, 0)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = c.key(x, y)
    if (!"ABCDEFGHK".includes(k)) continue
    // the dust column: rising from the strike, leaning right with the wind, widening, ragged at its edges
    const up = iy - y, axis = ix + up * 0.35, half = 5 + up * 0.22, off = (x + 0.5 - axis) / half, edge = 1 + 0.35 * (noise(y / 6, 3) - 0.5) + 0.25 * (noise(y / 3, x / 9) - 0.5)
    if (up > 0 && Math.abs(off) < edge) { c.px(x, y, up < 14 ? (Math.abs(off) < 0.5 ? "V" : "H") : off < -0.6 * edge ? "D" : noise(x / 4, y / 4) > 0.55 ? "C" : "B"); continue }
    // the glow on the soot round it, strongest low and near, in dithered bands
    const d = Math.hypot((x - ix) / 150, (y - iy) / 95) + dither(x, y) * 0.12
    if (d < 0.32) c.px(x, y, d < 0.16 ? "W" : "V")
    else if (d < 0.6) c.px(x, y, "H")
    else if (d < 0.95 && k !== "A") c.px(x, y, "G")
  }
}
const DROP = unit([-0.42, 0.25, -0.87])
const METEORS = [[-2600, 9000, 0, 26], [1800, 12000, 17, 30], [-6000, 14000, 33, 24], [4200, 8000, 44, 28]].map(([x, z, start, dur]) => ({ B: [x, z, 0], start, dur }))
function meteors(c, frame) {
  for (const M of METEORS) {
    const p = (((frame - M.start) % FRAMES) + FRAMES) % FRAMES / M.dur
    if (p > 1.4) continue
    const head = addv(M.B, mul(DROP, -9000 * (1 - Math.min(1, p))))
    if (p <= 1) {
      // the trail: from the head back up the way it came, white to yellow to red to smoke
      const n = 60
      for (let i = n; i >= 0; i--) {
        const q = addv(head, mul(DROP, -i * 40)), [x, y] = P.ground(...q), f = i / n, w = f < 0.12 ? 1 : f < 0.35 ? 0.5 : 0
        const key = f < 0.08 ? "X" : f < 0.18 ? "W" : f < 0.32 ? "V" : f < 0.5 ? "U" : f < 0.66 ? "T" : f < 0.82 ? "D" : "C"
        if (f > 0.82 && (i & 1)) continue
        for (let d = -Math.ceil(w); d <= Math.ceil(w); d++) c.px(Math.round(x) + d, Math.round(y), Math.abs(d) > w ? "U" : key)
      }
      const [hx, hy] = P.ground(...head)
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const d = Math.hypot(dx, dy); if (d <= 2.2) c.px(Math.round(hx) + dx, Math.round(hy) + dy, d < 1 ? "X" : d < 1.6 ? "W" : "V") }
    } else {
      // the strike: a flash on the horizon, swelling and dying
      const [x, y] = P.ground(...M.B), r = (p - 1) * 12, k = p < 1.15 ? "X" : p < 1.28 ? "W" : "U"
      for (let dy = -Math.ceil(r); dy <= 0; dy++) for (let dx = -Math.ceil(r * 1.6); dx <= Math.ceil(r * 1.6); dx++)
        if ((dx / 1.6) ** 2 + dy * dy <= r * r) c.px(Math.round(x) + dx, Math.round(y) + dy, Math.hypot(dx / 1.6, dy) < r * 0.5 ? k : "V")
    }
  }
}

// ================================================================ wind: embers, ash, smoke
// Embers lifted off the fires and ash flakes, all driven right by the wind; each goes round the
// picture a whole number of times in the loop, so it closes.
const SPARKS = Array.from({ length: 70 }, (_, i) => { const r = rng(900 + i); return { x: r() * W, y: 40 + r() * 135, laps: 1 + Math.floor(r() * 3), rise: r() * 40, ember: i < 32, ph: r() } })
function sparks(c, frame) {
  const t = frame / FRAMES
  for (const s of SPARKS) {
    const x = (s.x + t * s.laps * W) % W, y = s.y - (s.ember ? s.rise : -s.rise * 0.3) * Math.sin(t * Math.PI * 2 + s.ph * 6.28) - (s.ember ? 6 : 0) * Math.sin(t * Math.PI * 4 + s.ph * 9)
    c.px(Math.round(x), Math.round(y), s.ember ? ((frame + Math.round(s.ph * 10)) % 4 < 2 ? "W" : "V") : "d")
  }
}
// smoke off the fire front, rising and streaming away right in long wisps, thinning (dithered) at its
// edges, its underside red from the fires
function smoke(c) {
  for (let y = 60; y < P.horizon + 4; y++) for (let x = 0; x < W; x++) {
    const k = c.key(x, y)
    if (!"ABCDEFGHKLMNOQ".includes(k)) continue
    const rise = (P.horizon + 4 - y) / 90, wisp = noise(x / 34 - y / 9, y / 7) * (1 - rise) - rise * 0.25 + noise(x / 11, y / 5) * 0.25
    if (wisp < 0.5) continue
    if (wisp < 0.58 && (x + y) & 1) continue
    c.px(x, y, y > P.horizon - 12 && wisp > 0.62 ? "G" : wisp > 0.7 ? "C" : "B")
  }
}

// ================================================================ soot round the sun
// The soot over the sun breathes: through the loop it drifts a little, thins until the sun shows
// whole, and thickens over it again (fading into the still sky at the edge of the part that moves).
// And soot clouds the volcano's hot air pushes away from it: each gathers out of the haze near the
// mountain, drifts slowly left, away from it, and thins into wisps until it's gone, while others
// gather; black at their cores, ragged, pouches hanging from their bellies (mammatus, a storm sky's),
// their edges lit where the sun is close behind them. A cloud's life is the loop, so it closes. They go
// behind the mountain and the trees (only the sky's pixels take them), and as they pass the sun they
// cover it now partly, now hardly, and its light dims with it, on the soot and on the mountain.
const SUN_AT = (() => { const zc = SUN[1] * cp + SUN[2] * sp, yc = SUN[2] * cp - SUN[1] * sp; return [P.vp + (P.focal * SUN[0]) / zc, CY - (P.focal * yc) / zc] })()
const BREATHE = 46
function breathe(c, frame) {
  for (let y = Math.floor(SUN_AT[1] - BREATHE); y <= SUN_AT[1] + BREATHE; y++) for (let x = Math.floor(SUN_AT[0] - BREATHE); x <= SUN_AT[0] + BREATHE; x++) {
    const r = Math.hypot(x - SUN_AT[0], y - SUN_AT[1]) / BREATHE
    if (r >= 1 || x < 0 || y < 0 || !SKY[y * W + x]) continue
    c.px(x, y, sky(x, y, frame / FRAMES, (1 - r) ** 1.5))
  }
}
const CLOUDS = Array.from({ length: 6 }, (_, i) => {
  const r = rng(4100 + i), dy = [-10, -3, -14, 0, -7, -12][i]
  return { ph: i / 6, x0: 112 + r() * 60, dy, puffs: [...Array.from({ length: 6 }, () => [(r() - 0.5) * 34, dy - 2 + (r() - 0.5) * 7, 7 + r() * 7, 4.5 + r() * 3.5]),
    ...Array.from({ length: 4 }, (_, k) => [-12 + k * 8 + (r() - 0.5) * 4, dy + 5 + r() * 3, 2.6 + r() * 1.4, 2.4 + r() * 1.2]),
    ...Array.from({ length: 2 }, () => [-20 - r() * 12, dy + (r() - 0.5) * 5, 10 + r() * 7, 1.5 + r() * 1.1])] }
})
function sootClouds(c, frame) {
  const t = frame / FRAMES, toSun = (x, y) => { const dx = SUN_AT[0] - x, dy = SUN_AT[1] - y, l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l, l] }
  let covered = 0, disk = 0
  for (const [k, C] of CLOUDS.entries()) {
    // its life: gathering, drifting away from the mountain, thinning out
    const life = (t + C.ph) % 1, m = Math.sin(Math.PI * life), grow = 0.8 + 0.45 * life, cx = C.x0 - life * 55, cy = SUN_AT[1]
    const dens = (x, y) => { let v = 0; for (const [px, py, rx, ry] of C.puffs) v = Math.max(v, 1 - Math.hypot((x - cx - px * grow) / (rx * grow), (y - cy - py) / (ry * grow))); return v - (1 - m) * 0.6 }
    for (let y = Math.floor(cy - 28); y <= Math.ceil(cy + 28); y++) for (let x = Math.floor(cx - 60); x <= Math.ceil(cx + 40); x++) {
      if (x < 0 || x >= W || y < 0 || y >= H || !SKY[y * W + x]) continue
      const d = dens(x, y)
      if (d + (noise(x / 6 + k * 9, y / 4) - 0.5) * 0.22 <= 0) continue
      if (m < 0.55 && d < 0.12 && (x + y) & 1) continue                                    // thinning: wisps, half there
      const [ux, uy, far] = toSun(x, y), rim = m > 0.5 && d > 0.03 && d < 0.22 && d - dens(x + ux * 3, y + uy * 3) > 0.12
      const under = d < 0.3 && d - dens(x, y + 2) > 0.12
      c.px(x, y, rim && far < 30 ? "J" : rim && far < 70 ? "F" : rim ? "D" : under ? "C" : d > 0.4 && m > 0.6 ? "A" : d > 0.12 ? "B" : "C")
    }
  }
  // how much of the sun's disk is behind them; the light dims as much
  for (let y = -4; y <= 4; y++) for (let x = -4; x <= 4; x++) if (x * x + y * y <= 16) { disk++; if (!"IJ".includes(c.key(Math.round(SUN_AT[0]) + x, Math.round(SUN_AT[1]) + y))) covered++ }
  // two steps: half hidden, the brightest soot round it and the sunlit rock a step down; nearly all
  // hidden, the glow round it a step further
  const dim = covered / disk
  if (dim < 0.45) return
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = c.key(x, y), r = Math.hypot(x - SUN_AT[0], y - SUN_AT[1])
    if (SKY[y * W + x]) { if (r < 95 && "KF".includes(k)) c.px(x, y, { K: "F", F: "E" }[k]); else if (dim > 0.8 && r < 60 && k === "E") c.px(x, y, "D") }
    else if (k === "K") c.px(x, y, "O")
  }
}

// each tree's still parts on a sprite of their own, cropped to what they draw
for (const [i, T] of TREES.entries()) sprite("_tree" + i, { w: W, h: H, crop: true, pivot: [0, 0] }, (c) => paintTree(c, T))
anim("extinction", { w: W, h: H, frames: FRAMES, fps: FPS }, stamp("_bg", 0, 0), (c) => {
  meteors(c, c.frame); breathe(c, c.frame); sootClouds(c, c.frame); lava(c, c.frame); crater(c, c.frame); frontFire(c, c.frame)
  const all = [...TREES.map((T, i) => ({ d: T.d, tree: i })), ...runners(c.frame), ...flyers(c.frame)].sort((m, n) => n.d - m.d)
  for (const m of all) {
    if (m.tree !== undefined) { c.stamp("_tree" + m.tree, 0, 0); treeFire(c, TREES[m.tree], c.frame); continue }
    if (m.sprite) { c.stamp(m.sprite, m.x, m.y); continue }
    m.draw(c)
  }
  nearFire(c, c.frame)
  fronds(c, c.frame)
  sparks(c, c.frame)
})
