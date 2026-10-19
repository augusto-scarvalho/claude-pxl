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
const RAD = Math.PI / 180
const at = (x, z, u = 0) => P.ground(x, z, u).map(Math.round)

// ================================================================ the land
// A volcano on a massif, as most are (Fuego stands on one, Acatenango beside it): old worn mountain,
// broad, its foot 0.6 km off, shouldering up to about a kilometer; out of it the young cone, steep,
// 1.8 km high; a lower peak beside it to the right with a saddle between, a spur running out to the
// left; ridges and ravines cut into all of it, gullies down the cone; a crater at the top whose lip
// is breached on the side toward us, where the lava pours out. The plain around rolls a little.
const VX = 380, VZ = 2400, VH = 1850, VR = 1150, CR = 120, RIM = VH * (1 - CR / VR) ** 1.5
const BREACH = Math.atan2(-VZ, -VX)
// the older mountains under and beside the cone: [x, z, height, radius across, radius along, turn, profile]
const MASSIF = [[VX + 150, VZ + 350, 1000, 2500, 1800, 0.15, 1.25], [VX + 1350, VZ + 450, 1330, 950, 800, 0.4, 1.5], [VX - 1150, VZ - 120, 620, 1200, 650, -0.35, 1.4]]
const MASSIF_ = MASSIF.map(([x, z, h, ra, rb, turn, k]) => [x, z, h, ra, rb, Math.cos(turn), Math.sin(turn), k])
// two heights joined smoothly where they meet (a saddle, not a crease); where either is nothing, the other
const smax = (a, b, k = 160) => { if (a <= 0 || b <= 0) return Math.max(a, b); const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.max(a, b) + h * h * k * 0.25 }
// the mountains alone, smooth: cheap, what the march steps by (the full land is never more than 4 m above it)
function bulk(x, z) {
  const r = Math.hypot(x - VX, z - VZ)
  let h = 0
  if (r < VR) {
    h = r < CR ? RIM - 110 * (1 - (r / CR) ** 2) : VH * (1 - r / VR) ** 1.5
    if (r < CR * 1.35) {
      let da = Math.atan2(z - VZ, x - VX) - BREACH
      da = Math.abs(Math.atan2(Math.sin(da), Math.cos(da)))
      h -= 95 * Math.max(0, 1 - da / 0.42) * Math.min(1, Math.max(0, (CR * 1.35 - r) / (CR * 0.7)))
    }
  }
  for (const [mx, mz, mh, ra, rb, ct, st, k] of MASSIF_) {
    const dx = x - mx, dz = z - mz, u = (dx * ct + dz * st) / ra, v = (-dx * st + dz * ct) / rb, e = Math.hypot(u, v)
    if (e < 1) h = smax(h, mh * (1 - e) ** k)
  }
  return h
}
function height(x, z) {
  const dx = x - VX, dz = z - VZ, r = Math.hypot(dx, dz)
  const plain = 1.6 * (vnoise(x / 50, z / 50) - 0.5) + 5 * (vnoise(x / 380 + 7, z / 380) - 0.5) * Math.min(1, z / 300)
  const b = bulk(x, z)
  if (b <= 0) return plain
  // gullies down the cone; ridges and ravines over the older mountain, running out from the summit
  const ang = Math.atan2(dz, dx), s = Math.max(0, 1 - r / VR), gully = 1 - 0.07 * Math.abs(Math.sin(ang * 11 + vnoise(r / 250, ang * 2) * 3)) * s
  const ridge = 1 - Math.abs(2 * vnoise(ang * 6 + 3, r / 380) - 1), ridge2 = 1 - Math.abs(2 * vnoise(x / 260 + 11, z / 260) - 1)
  const worn = 1 - (0.2 * (1 - ridge) ** 2 + 0.1 * (1 - ridge2) ** 2) * Math.min(1, Math.max(0, (r - CR * 2) / 500))
  return plain + b * gully * worn
}
// the sun at four in the afternoon: low in the west-southwest, ahead and to the left
const SUN_AZ = -30 * RAD, SUN_EL = 21 * RAD
const SUN = [Math.sin(SUN_AZ) * Math.cos(SUN_EL), Math.cos(SUN_AZ) * Math.cos(SUN_EL), Math.sin(SUN_EL)]
const dither = (col, row) => bayer(col, row) - 0.5

// Lava as it runs on real volcanoes (Semeru, Fuego, Fagradalsfjall, and the USGS on aa flows): a
// channel narrow near the vent, widening downslope; hot (yellow, 1100 C) where it leaves, cooling to
// orange and red as it goes and crusting dark, the glow left in the channel's middle and in the
// cracks. Each flow goes down the steepest way, into the gullies, wandering a little, and stops
// where its lava runs out. Three: the main one out of the breach in the crater's lip, thin, zigzagging
// down a ravine and spreading into a glowing lobe halfway down (Semeru); braided channels out of a
// vent on the left flank, splitting and joining (Fagradalsfjall); and an older flow, crusted black,
// glowing only in its cracks, that has reached the plain and set it alight. Kept as points in
// meters with how hot they are; the ones the mountain hides from us are dropped.
function flow(seed, x, z, { len, wob, hot, cold }) {
  const r = rng(seed), pts = []
  let run = 0
  for (let k = 0; k < 400 && run < len; k++) {
    const e = 4, gx = (height(x + e, z) - height(x - e, z)) / (2 * e), gz = (height(x, z + e) - height(x, z - e)) / (2 * e), g = Math.hypot(gx, gz) || 1
    const out = bulk(x, z) < 25, step = out ? 8 : 14, w = (r() - 0.5) * wob * (out ? 2 : 1), dx = -gx / g, dz = -gz / g
    x += (dx * Math.cos(w) - dz * Math.sin(w)) * step; z += (dz * Math.cos(w) + dx * Math.sin(w)) * step; run += step
    pts.push({ p: [x, z, height(x, z) + 2], heat: hot + (cold - hot) * (run / len), run })
  }
  return pts
}
const lip = (a, f = 1.02) => [VX + Math.cos(BREACH + a) * CR * f, VZ + Math.sin(BREACH + a) * CR * f]
const FLOWS = [
  { kind: "main", strands: [flow(31, ...lip(0), { len: 820, wob: 1.1, hot: 1, cold: 0.45 })] },
  { kind: "braid", strands: [0, 1, 2].map((k) => flow(40 + k, VX + Math.cos(BREACH - 0.62) * 430, VZ + Math.sin(BREACH - 0.62) * 430, { len: 900, wob: 1.4, hot: 0.8, cold: 0.42 })) },
  { kind: "old", strands: [flow(52, ...lip(0.38, 1.1), { len: 3400, wob: 0.7, hot: 0.3, cold: 0.22 })] },
]
// is a point in sight, or behind the land? march toward it and see where the ray lands
function seen([x, z, u]) {
  const d = Math.hypot(x, z, u - P.eye), dir = [x / d, z / d, (u - P.eye) / d]
  for (let t = 20; t < d - 15; t += Math.max(4, t * 0.01)) if (P.eye + dir[2] * t < height(dir[0] * t, dir[1] * t)) return false
  return true
}
for (const F of FLOWS) for (const S of F.strands) S.splice(0, S.length, ...S.filter((q) => seen(q.p)))

// ================================================================ the land
function shadeLand(col, row, [x, z, u, t]) {
  const e = 2, hx = (height(x + e, z) - height(x - e, z)) / (2 * e), hz = (height(x, z + e) - height(x, z - e)) / (2 * e)
  const n = [-hx, -hz, 1], l = Math.hypot(...n), sun = Math.max(0, (n[0] * SUN[0] + n[1] * SUN[1] + n[2] * SUN[2]) / l)
  const r = Math.hypot(x - VX, z - VZ)
  if (bulk(x, z) > 20) {
    // rock: the faces turned to the sun take its dim orange light, the rest in soot-shade; ridges catch
    // what light there is, ravines hold the dark; scree in streaks down the slope
    const k = 30, curv = (4 * height(x, z) - height(x + k, z) - height(x - k, z) - height(x, z + k) - height(x, z - k)) / 4
    const streak = fbm(Math.atan2(z - VZ, x - VX) * 40, r / 120, 3), v = sun * 1.05 + Math.max(-0.35, Math.min(0.35, curv / 14)) + (streak - 0.5) * 0.4 + dither(col, row) * 0.12
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
// sun thins, then thickens again (what it's made of is kept per pixel; only how thin changes)
const SOOT = new Map()
function sky(col, row, breath = 0, a = 0) {
  const [dx, dz, du] = P.ray(col, row), az = Math.atan2(dx, dz), el = Math.asin(du)
  const toSun = Math.acos(Math.max(-1, Math.min(1, dx * SUN[0] + dz * SUN[1] + du * SUN[2])))
  const key = row * W + col
  if (!SOOT.has(key)) { const d0 = soot(az, el); SOOT.set(key, [d0, d0 - soot(az - 0.03, el + 0.025), d0 - soot(az, el - 0.03)]) }
  const [d0, lit, belly] = SOOT.get(key), d = d0 - a * 0.2 * (0.5 - 0.5 * Math.cos(breath * Math.PI * 2)), thin = Math.max(0, 1 - toSun / 0.42) ** 1.6
  if (toSun < 0.022 && d < 0.62) return "I"
  if (toSun < 0.036 && d < 0.6) return "J"
  const shaft = toSun < 0.9 && d < 0.52 && vnoise(Math.atan2(el - SUN_EL, az - SUN_AZ) * 11, 2) > 0.6 ? (1 - toSun / 0.9) * 0.22 : 0
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
      const ox = x + 0.5 - cx, oy = y + 0.5 - cy, ang = Math.atan2(oy, ox), edge = R * (0.86 + 0.22 * vnoise(ang * 2.5 + b.k * 7, b.k))
      const dd = Math.hypot(ox, oy)
      if (dd > edge) continue
      // lit by the sun on its upper left, its belly red with the fire below, more the lower it is
      const lit = (-ox * 0.6 - oy * 0.8) / edge, rim = dd / edge, v = lit * 0.7 + rim * 0.25 + (vnoise(x / 5 + b.k, y / 5) - 0.5) * 0.4 + dither(x, y) * 0.15
      const belly = oy / edge + (1 - b.s / 1800) * 0.9 + dither(x, y) * 0.2
      if (belly > 0.75 && lit < 0.3) c.px(x, y, belly > 1.35 ? "H" : belly > 1.0 ? "G" : "Q")
      else c.px(x, y, v > 0.62 ? "E" : v > 0.3 ? "D" : v > 0.0 ? "C" : "B")
    }
  }
}

// ================================================================ lava
// Heat to color (USGS: yellow ~1100 C, orange ~900, red ~700; solid crust black), and the rock beside
// a flow red with its light (drawn once, under it).
const HEAT = (h) => (h > 0.9 ? "X" : h > 0.72 ? "W" : h > 0.56 ? "V" : h > 0.42 ? "U" : h > 0.3 ? "T" : h > 0.2 ? "S" : "R")
function lavaGlow(c) {
  for (const F of FLOWS) for (const S of F.strands) for (let k = 1; k < S.length; k++) {
    if (F.kind === "old" && hash(k, 3) > 0.3) continue
    const [ax, ay] = P.ground(...S[k - 1].p), [bx, by] = P.ground(...S[k].p)
    c.line(Math.round(ax), Math.round(ay), Math.round(bx), Math.round(by), "Q", 3)
  }
}
// Each frame: the channel, its middle hot and its edges a step cooler, pulses of fresher lava
// running down it; the old flow's crust black with glowing cracks; where the main flow stops, its lobe
// glowing, flickering. The cooled lobes and the scree below them gray.
function lava(c, frame) {
  const t = frame / FRAMES
  for (const [fi, F] of FLOWS.entries()) for (const [si, S] of F.strands.entries()) {
    for (let k = 1; k < S.length; k++) {
      const q = S[k], [ax, ay] = P.ground(...S[k - 1].p), [bx, by] = P.ground(...q.p), sc = P.scale(q.p[1], q.p[0], q.p[2])
      const pulse = (((q.run / 400 - t * 2 - si * 0.3 - fi * 0.17) % 1) + 1) % 1, hotter = pulse < 0.12 ? 0.18 : 0
      if (F.kind === "old") {
        const crack = hash(k * 7 + si, Math.floor(t * 6 + k * 0.37)) < 0.18
        c.line(Math.round(ax), Math.round(ay), Math.round(bx), Math.round(by), crack ? "T" : "R", Math.max(1, Math.round(16 * sc)))
        continue
      }
      const w = Math.max(1, Math.round((6 + q.run * 0.012) * sc)), heat = q.heat + hotter
      if (w > 1) c.line(Math.round(ax), Math.round(ay), Math.round(bx), Math.round(by), HEAT(heat - 0.22), w)
      c.line(Math.round(ax), Math.round(ay), Math.round(bx), Math.round(by), HEAT(heat), 1)
    }
    if (F.kind === "main" && S.length > 3) {
      // the lobe: a fan of lava spreading where the flow stops, hot in the middle, crusting at its rim
      const end = S[S.length - 1], [ex, ey] = P.ground(...end.p), [px, py] = P.ground(...S[S.length - 4].p), R = Math.max(2, 26 * P.scale(end.p[1], end.p[0], end.p[2]))
      const ux = (ex - px) / (Math.hypot(ex - px, ey - py) || 1), uy = (ey - py) / (Math.hypot(ex - px, ey - py) || 1)
      for (let y = -Math.ceil(R * 1.6); y <= Math.ceil(R * 1.6); y++) for (let x = -Math.ceil(R * 1.6); x <= Math.ceil(R * 1.6); x++) {
        const along = x * ux + y * uy, across = -x * uy + y * ux, d = Math.hypot(along / (R * 1.5), across / R) + (hash(x + frame * 3, y) - 0.5) * 0.3
        if (d < 1 && along > -R * 0.4) c.px(Math.round(ex) + x, Math.round(ey) + y, d < 0.3 ? "V" : d < 0.6 ? "U" : d < 0.82 ? "T" : "S")
      }
    }
    if (F.kind === "old" && S.length) {
      const end = S[S.length - 1], [ex, ey] = P.ground(...end.p)
      for (let x = -4; x <= 4; x++) c.px(Math.round(ex) + x, Math.round(ey), Math.abs(x) < 2 ? "V" : "T")
    }
  }
}
// Steam and smoke off the lava (Semeru's flow smokes all the way down): puffs rising from the main
// flow, its lobe and where the old flow meets the plain, red underneath from the lava, gray above,
// growing and thinning as they rise and drift right with the wind; each lives a loop.
const STEAM = (() => {
  const out = [], main = FLOWS[0].strands[0], old = FLOWS[2].strands[0]
  for (let i = 0; i < 8; i++) { const q = main[Math.floor(main.length * (0.3 + i * 0.09))]; if (q) out.push({ p: q.p, ph: (i * 0.37) % 1, big: 1 }) }
  for (const k of [0, 1, 2]) { const q = main[main.length - 1]; if (q) out.push({ p: q.p, ph: k / 3 + 0.1, big: 1.6 }) }
  for (const k of [0, 1]) { const q = old[old.length - 1]; if (q) out.push({ p: q.p, ph: k / 2 + 0.25, big: 1.3 }) }
  return out
})()
function steam(c, frame) {
  for (const [i, S] of STEAM.entries()) {
    const life = (frame / FRAMES + S.ph) % 1, [bx, by] = P.ground(...S.p), sc = P.scale(S.p[1], S.p[0], S.p[2])
    const x = bx + life * 110 * sc, y = by - life * 200 * sc - 1, R = (1.5 + life * 5) * S.big
    for (let yy = Math.floor(y - R); yy <= Math.ceil(y + R); yy++) for (let xx = Math.floor(x - R); xx <= Math.ceil(x + R); xx++) {
      const oy = (yy + 0.5 - y) / R, d = Math.hypot((xx + 0.5 - x) / R, oy) + (vnoise(xx / 2 + i * 7, yy / 2) - 0.5) * 0.4
      if (d > 1 || (life > 0.55 && (xx + yy) & 1) || (life > 0.85 && hash(xx, yy) < 0.5)) continue
      c.px(xx, yy, oy > 0.25 && life < 0.5 ? "G" : d < 0.55 ? "D" : "C")
    }
  }
}
// What the eruption throws out: bombs falling on the upper cone glow where they land and cool, white
// to red to gone; rockfalls of hot debris slide down the gullies on the right, glowing (Fuego).
const EJECTA = Array.from({ length: 46 }, (_, i) => { const r = rng(3000 + i), a = BREACH + (r() - 0.5) * 2.4, d = CR * 1.2 + r() ** 1.5 * 380; return { x: VX + Math.cos(a) * d, z: VZ + Math.sin(a) * d, ph: r(), period: [20, 30, 60][i % 3] } }).filter((q) => seen([q.x, q.z, height(q.x, q.z) + 2]))
const FALLS = [0.55, 0.85, 1.1].map((a, i) => flow(70 + i, ...lip(a, 1.15), { len: 520, wob: 0.6, hot: 0.8, cold: 0.4 }).filter((q) => seen(q.p)))
function ejecta(c, frame) {
  for (const q of EJECTA) {
    const age = (((frame / q.period + q.ph) % 1) + 1) % 1
    if (age > 0.7) continue
    c.px(...at(q.x, q.z, height(q.x, q.z) + 2), age < 0.08 ? "X" : age < 0.2 ? "W" : age < 0.35 ? "V" : age < 0.5 ? "U" : "T")
  }
  for (const [i, S] of FALLS.entries()) {
    if (S.length < 6) continue
    const head = Math.floor((((frame / 30 + i * 0.37) % 1) * S.length))
    for (let k = Math.max(0, head - 5); k <= head && k < S.length; k++) c.px(...at(...S[k].p), k === head ? "W" : k > head - 3 ? "V" : "T")
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
      const furrow = Math.abs(vnoise(across * 5 + 9, q.u * 0.7) - 0.5) < 0.07, v = -across * 0.85 + dither(x, y) * 0.25
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
      if (ox * ox + oy * oy > 1 + 0.35 * (vnoise(x * 0.9 + q.v * 50, y * 0.9) - 0.5)) continue
      c.px(x, y, q.burning ? (oy > 0.45 ? "T" : oy > 0.1 ? "S" : "h") : oy < -0.4 ? "g" : "f")
    }
  }
}
// flames: pxl's flame(), white-hot at the root to red at the tip, leaning right with the wind
const flame = (c, x, y, size, frame, seed) => c.flame(x, y, size, "XWVUT", { frame, seed })
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
  // the land ray-marched through the camera (bulk() a cheap bound it never rises 4 m above), the sky
  // where a pixel sees none; which pixels are sky is kept for what passes behind the mountain
  c.terrain(P, height, (x, z, u, t, col, row) => shadeLand(col, row, [x, z, u, t]),
    { far: 9000, top: VH, bound: bulk, margin: 4, sky: (col, row) => { SKY[row * W + col] = 1; return sky(col, row) } })
  impact(c)
  lavaGlow(c)
  plume(c)
  smoke(c)
  scrub(c)
  litter(c)
  firelight(c)
})

// ================================================================ shapes
const addv = (a, b) => a.map((v, k) => v + b[k]), mul = (a, s) => a.map((v) => v * s)
const unit = (v) => { const l = Math.hypot(...v) || 1; return v.map((c) => c / l) }
// A limb as a cone from a to b (radius ra to rb, in meters): pxl's capsule() where the camera puts it,
// lit from above (the sun, and behind, the fires: a hot rim along the top). `ramp`: shade, hide, lit, rim.
function paintCone(c, [a, ra, b, rb], ramp) {
  const [ax, ay] = P.ground(...a), [bx, by] = P.ground(...b)
  c.capsule(ax, ay, ra * P.scale(a[1], a[0], a[2]), bx, by, rb * P.scale(b[1], b[0], b[2]), ramp, { light: [0, -1] })
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
        // the lower jaw, hinged behind and dropped open; between the jaws, open air (what's behind shows
        // through), but for the corner of the mouth, dark, and the tongue lying in the lower jaw; teeth
        // in both jaws
        const J = B.jaw, rot = (l, dn) => [J.at[0] + l * Math.cos(J.gape) - dn * Math.sin(J.gape), J.at[1] - l * Math.sin(J.gape) - dn * Math.cos(J.gape)]
        const P2 = (p) => at(...w3(p[0], -0.05, p[1] + du(p[0])))
        c.poly([...P2(J.at), ...P2([J.at[0] + 0.32, along2(B.bot, J.at[0] + 0.32)]), ...P2(rot(0.32, 0))], "0")
        c.line(...P2(rot(0.05, -0.05)), ...P2(rot(J.len * 0.62, -0.07)), "x", Math.max(1, Math.round(0.1 * P.scale(z, x))))
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
    const up = iy - y, axis = ix + up * 0.35, half = 5 + up * 0.22, off = (x + 0.5 - axis) / half, edge = 1 + 0.35 * (vnoise(y / 6, 3) - 0.5) + 0.25 * (vnoise(y / 3, x / 9) - 0.5)
    if (up > 0 && Math.abs(off) < edge) { c.px(x, y, up < 14 ? (Math.abs(off) < 0.5 ? "V" : "H") : off < -0.6 * edge ? "D" : vnoise(x / 4, y / 4) > 0.55 ? "C" : "B"); continue }
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
    const rise = (P.horizon + 4 - y) / 90, wisp = vnoise(x / 34 - y / 9, y / 7) * (1 - rise) - rise * 0.25 + vnoise(x / 11, y / 5) * 0.25
    if (wisp < 0.5) continue
    if (wisp < 0.58 && (x + y) & 1) continue
    c.px(x, y, y > P.horizon - 12 && wisp > 0.62 ? "G" : wisp > 0.7 ? "C" : "B")
  }
}

// ================================================================ soot round the sun
// The soot over the sun breathes: through the loop it thins until the sun shows whole, and thickens
// over it again (fading into the still sky at the edge of the part that moves).
// And soot clouds the volcano's hot air pushes away from it: each gathers out of the haze near the
// mountain, drifts slowly left, away from it, and thins into wisps until it's gone, while others
// gather; black at their cores, ragged, pouches hanging from their bellies (mammatus, a storm sky's),
// their edges lit where the sun is close behind them. A cloud's life is the loop, so it closes. They go
// behind the mountain and the trees (only the sky's pixels take them), and as they pass the sun they
// cover it now partly, now hardly, and its light dims with it, on the soot and on the mountain.
const SUN_AT = P.toward(SUN)
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
    // the density into a buffer, each puff only over its own box
    const X0 = Math.floor(cx - 60), Y0 = Math.floor(cy - 28), BW = 104, BH = 60, buf = new Float32Array(BW * BH).fill(-1)
    for (const [px, py, rx, ry] of C.puffs) {
      const ex = cx + px * grow, ey = cy + py, ax = rx * grow, ay = ry * grow
      for (let y = Math.max(Y0, Math.floor(ey - ay)); y <= Math.min(Y0 + BH - 1, Math.ceil(ey + ay)); y++) for (let x = Math.max(X0, Math.floor(ex - ax)); x <= Math.min(X0 + BW - 1, Math.ceil(ex + ax)); x++) {
        const v = 1 - Math.hypot((x - ex) / ax, (y - ey) / ay) - (1 - m) * 0.6, i = (y - Y0) * BW + (x - X0)
        if (v > buf[i]) buf[i] = v
      }
    }
    const at2 = (x, y) => { const i = Math.round(x) - X0, j = Math.round(y) - Y0; return i < 0 || j < 0 || i >= BW || j >= BH ? -1 : buf[j * BW + i] }
    for (let y = Y0; y < Y0 + BH; y++) for (let x = X0; x < X0 + BW; x++) {
      if (x < 0 || x >= W || y < 0 || y >= H || !SKY[y * W + x]) continue
      const d = buf[(y - Y0) * BW + (x - X0)]
      if (d < -0.15 || d + (vnoise(x / 6 + k * 9, y / 4) - 0.5) * 0.22 <= 0) continue
      if (m < 0.55 && d < 0.12 && (x + y) & 1) continue                                    // thinning: wisps, half there
      const [ux, uy, far] = toSun(x, y), rim = m > 0.5 && d > 0.03 && d < 0.22 && d - at2(x + ux * 3, y + uy * 3) > 0.12
      const under = d < 0.3 && d - at2(x, y + 2) > 0.12
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


// ================================================================ the ground's wreckage
// The fire front has passed over the ground near us and left it strewn: trees snapped and thrown down,
// one end splintered, the other a torn-up root plate, still burning along their tops and glowing in
// the cracks of their charcoal; snags left standing, broken off in spikes of pale wood, charred; volcanic
// bombs and boulders, the freshest still red-hot and cracked; branches and embers everywhere.
const LOGS = [
  { x: 0.5, z: 13.5, a: -0.18, len: 9, r: 0.42, seed: 1, fire: true, breaks: [0.12] },
  { x: -7.5, z: 25, a: -0.5, len: 6.5, r: 0.32, seed: 2, fire: true },
  { x: 17, z: 39, a: 2.6, len: 8, r: 0.38, seed: 3, fire: false, breaks: [-0.1] },
  { x: -19, z: 47, a: 0.9, len: 5, r: 0.28, seed: 4, fire: true },
]
const SNAGS = [{ x: -3.2, z: 16, h: 4.2, r: 0.42, seed: 5, fire: true }, { x: 19, z: 28, h: 6.5, r: 0.5, seed: 6, fire: true }, { x: -15, z: 36, h: 3, r: 0.35, seed: 7, fire: false }, { x: 6, z: 54, h: 5, r: 0.4, seed: 8, fire: true }]
const ROCKS = (() => {
  const r = rng(5000), out = []
  for (let i = 0; i < 34; i++) { const z = 7 + r() ** 1.3 * 58, x = (r() - 0.5) * z * 1.7, hot = r() < 0.3; out.push({ x, z, s: hot ? 0.14 + r() * 0.2 : 0.16 + r() * 0.42, hot, seed: i }) }
  return out
})()
// A fallen tree: the trunk lying in pieces where it broke as it fell, each a little crooked and
// knotted (short lengths, the radius swelling and narrowing), charcoal round (shaded as a log lying in
// the light from the fires behind), cracks glowing across it, broken branches sticking up; splintered
// ends at each break and at the top; a torn-up root plate at the foot.
function log(c, L, frame) {
  const ca = Math.cos(L.a), sa = Math.sin(L.a), r = rng(L.seed * 17), breaks = L.breaks ?? []
  const pt = (f, piece) => { const side = 0.35 * Math.sin(f * 4 + L.seed) + piece * 0.3, x = L.x + ca * L.len * f - sa * side, z = L.z + sa * L.len * f + ca * side; return [x, z, height(x, z) + L.r * 0.9 - piece * 0.05] }
  const rad = (f) => L.r * (1 - 0.2 * (f + 0.5)) * (1 + 0.14 * (vnoise(f * 7 + L.seed, 3) - 0.5) * 2)
  // the root plate: a torn-up disc of roots and earth, standing on edge
  const A = pt(-0.5, 0), [ax, ay] = P.ground(...A), rp = L.r * 2.6 * P.scale(A[1], A[0], A[2])
  for (let y = -Math.ceil(rp); y <= Math.ceil(rp); y++) for (let x = -Math.ceil(rp * 0.45); x <= Math.ceil(rp * 0.45); x++) {
    const d = Math.hypot(x / 0.45, y) / rp + (vnoise(x * 0.8 + L.seed, y * 0.8) - 0.5) * 0.5
    if (d < 1 && y < rp * 0.6) c.px(Math.round(ax) + x, Math.round(ay) + y, d > 0.8 ? "c" : hash(x, y) < 0.2 ? "h" : "i")
  }
  // spikes of pale torn wood at an end, pointing `dir` (+1 toward the top, -1 back)
  const splinters = (f, piece, dir) => {
    const p = pt(f, piece), q = pt(f + dir * 0.02, piece), [px, py] = P.ground(...p), [qx, qy] = P.ground(...q), l = Math.hypot(qx - px, qy - py) || 1, sc = P.scale(p[1], p[0], p[2])
    for (let k = 0; k < 5; k++) {
      const off = (k / 4 - 0.5) * rad(f) * 1.6 * sc, long = (0.25 + r() * 0.6) * sc
      c.line(Math.round(px), Math.round(py + off), Math.round(px + ((qx - px) / l) * long), Math.round(py + off * 0.6 + ((qy - py) / l) * long), k % 2 ? "k" : "j")
    }
  }
  const cuts = [-0.5, ...breaks.flatMap((b) => [b - 0.03, b + 0.03]), 0.5]
  for (let piece = 0; piece < cuts.length / 2; piece++) {
    const f0 = cuts[piece * 2], f1 = cuts[piece * 2 + 1], n = Math.max(2, Math.ceil(((f1 - f0) * L.len) / 0.8))
    for (let k = 0; k < n; k++) { const a = f0 + ((f1 - f0) * k) / n, b = f0 + ((f1 - f0) * (k + 1)) / n; paintCone(c, [pt(a, piece), rad(a), pt(b, piece), rad(b)], "hijl") }
    const m = Math.ceil(((f1 - f0) * L.len) / 0.35)
    for (let i = 1; i < m; i++) {
      const f = f0 + ((f1 - f0) * i) / m, p = pt(f, piece), [px, py] = P.ground(...p), sc = P.scale(p[1], p[0], p[2]), h = Math.max(1, Math.round(rad(f) * sc))
      // the charcoal's cracks across the log, glowing (flickering) where it still burns
      if (r() < 0.55) { const glow = L.fire && hash(i + piece * 50, Math.floor(frame / 3) + L.seed) < 0.75; c.line(Math.round(px), Math.round(py) - h + 1, Math.round(px + 0.5), Math.round(py), glow ? (r() < 0.4 ? "U" : "T") : "h") }
      if (r() < 0.12) c.line(Math.round(px), Math.round(py) - h, Math.round(px + (r() - 0.3) * sc * 0.4), Math.round(py - h - sc * (0.3 + r() * 0.5)), "h", Math.max(1, Math.round(sc * 0.08)))
      if (L.fire && i % 2 === 0 && hash(i + piece * 50, L.seed + 31) < 0.6) flame(c, px, py - rad(f) * sc, Math.max(2, sc * (0.25 + 0.3 * hash(L.seed, i + piece * 50))), frame, L.seed * 300 + i + piece * 50)
    }
    if (piece > 0) splinters(f0, piece, -1)
    splinters(f1, piece, 1)
  }
}
// a snag: a trunk left standing, snapped off in spikes of pale wood
function snag(c, S, frame) {
  const g = height(S.x, S.z), r = rng(S.seed * 23)
  column(c, [S.x, S.z, g - 0.3], [S.x, S.z, g + S.h], S.r, S.r * 0.85, S.fire)
  for (let k = 0; k < 4; k++) {
    const a = (k / 3 - 0.5) * 1.6, base = [S.x + Math.sin(a) * S.r * 0.8, S.z - Math.cos(a) * S.r * 0.3, g + S.h], tip = [base[0] + (r() - 0.5) * 0.2, base[1], base[2] + 0.3 + r() * 1.1]
    const [x0, y0] = P.ground(...base), [x1, y1] = P.ground(...tip), w = Math.max(1, Math.round(S.r * 0.5 * P.scale(S.z, S.x)))
    for (let i = 0; i <= Math.ceil(Math.abs(y1 - y0)); i++) { const f = i / Math.max(1, Math.abs(y1 - y0)), half = Math.round((w * (1 - f)) / 1.5); c.line(Math.round(x0 + (x1 - x0) * f) - half, Math.round(y0 + (y1 - y0) * f), Math.round(x0 + (x1 - x0) * f) + half, Math.round(y0 + (y1 - y0) * f), k % 2 ? "k" : "j") }
  }
  if (!S.fire) return
  for (let u = 0.2; u < S.h; u += 0.4) {
    if (hash(Math.round(u * 10), S.seed) > 0.55) continue
    const p = [S.x + S.r * 0.7, S.z, g + u], [px, py] = P.ground(...p), sc = P.scale(p[1], p[0], p[2])
    flame(c, px, py, Math.max(2, sc * (0.2 + 0.35 * hash(S.seed, Math.round(u * 10)))), frame, S.seed * 500 + Math.round(u * 10))
  }
}
// a boulder or a volcanic bomb: an angular lump sitting on the ground, its facets lit on top and dark
// below, a shadow where it meets the ground; a fresh bomb black-crusted, red-hot in its cracks
function rock(c, R) {
  const g = height(R.x, R.z), [cx, cy] = P.ground(R.x, R.z, g), rad = Math.max(1, R.s * P.scale(R.z, R.x)), r = rng(R.seed * 41 + 7)
  const n = 6, pts = Array.from({ length: n }, (_, i) => { const a = Math.PI + (i / (n - 1)) * Math.PI, k = 0.7 + r() * 0.45; return [cx + Math.cos(a) * rad * 1.25 * k, cy + Math.sin(a) * rad * k] })
  c.line(Math.round(cx - rad * 1.3), Math.round(cy), Math.round(cx + rad * 1.5), Math.round(cy), "a")
  c.poly([...pts.flat(), Math.round(cx + rad * 1.2), Math.round(cy)].map(Math.round), R.hot ? "R" : "b")
  // the upper facets: from the top points toward the middle, lit
  for (let i = 1; i < n - 1; i++) c.poly([pts[i - 1], pts[i], [cx, cy - rad * 0.2]].flat().map(Math.round), R.hot ? (i === 2 ? "S" : "R") : i < 3 ? "d" : "c")
  if (R.hot) { c.line(Math.round(cx - rad * 0.6), Math.round(cy - rad * 0.3), Math.round(cx + rad * 0.4), Math.round(cy - rad * 0.6), "U"); c.px(Math.round(cx), Math.round(cy - rad * 0.4), "V") }
}
// the light of what burns near us, pooled on the ground round it, warm, fading out (dithered)
function firelight(c) {
  const pools = [...LOGS.filter((L) => L.fire).map((L) => [L.x, L.z, L.len * 0.55]), ...SNAGS.filter((S) => S.fire).map((S) => [S.x, S.z, 3]), ...NEAR.map((q) => [q.x, q.z, 1.6])]
  for (const [x, z, R] of pools) {
    const [cx, cy] = P.ground(x, z, height(x, z)), sc = P.scale(z, x), rx = R * sc, ry = R * sc * 0.32
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let xx = Math.floor(cx - rx); xx <= Math.ceil(cx + rx); xx++) {
      if (!"abcde".includes(c.key(xx, y))) continue
      const d = Math.hypot((xx - cx) / rx, (y - cy) / ry) + dither(xx, y) * 0.35
      if (d < 0.45) c.px(xx, y, "G"); else if (d < 0.8) c.px(xx, y, "Q")
    }
  }
}
// small things on the ground: broken branches, embers, a few still glowing (in the still picture)
function litter(c) {
  const r = rng(6100)
  for (let i = 0; i < 90; i++) {
    const z = 6 + r() ** 1.5 * 60, x = (r() - 0.5) * z * 1.7, g = height(x, z), sc = P.scale(z, x), [px, py] = P.ground(x, z, g)
    if (r() < 0.55) { const a = r() * Math.PI, len = (0.4 + r() * 1.2) * sc; c.line(Math.round(px), Math.round(py), Math.round(px + Math.cos(a) * len), Math.round(py + Math.sin(a) * len * 0.25), r() < 0.25 ? "T" : "h") }
    else c.px(Math.round(px), Math.round(py), r() < 0.5 ? "T" : "S")
  }
}

// each tree's still parts on a sprite of their own, cropped to what they draw
for (const [i, T] of TREES.entries()) sprite("_tree" + i, { w: W, h: H, crop: true, pivot: [0, 0] }, (c) => paintTree(c, T))
anim("extinction", { w: W, h: H, frames: FRAMES, fps: FPS }, stamp("_bg", 0, 0), (c) => {
  meteors(c, c.frame); breathe(c, c.frame); sootClouds(c, c.frame); lava(c, c.frame); steam(c, c.frame); ejecta(c, c.frame); crater(c, c.frame); frontFire(c, c.frame)
  const wreck = [...LOGS.map((L) => ({ d: Math.hypot(L.x, L.z), draw: (c) => log(c, L, c.frame) })), ...SNAGS.map((S) => ({ d: Math.hypot(S.x, S.z), draw: (c) => snag(c, S, c.frame) })),
    ...ROCKS.map((R) => ({ d: Math.hypot(R.x, R.z), draw: (c) => rock(c, R) }))]
  const all = [...TREES.map((T, i) => ({ d: T.d, tree: i })), ...runners(c.frame), ...flyers(c.frame), ...wreck].sort((m, n) => n.d - m.d)
  for (const m of all) {
    if (m.tree !== undefined) { c.stamp("_tree" + m.tree, 0, 0); treeFire(c, TREES[m.tree], c.frame); continue }
    if (m.sprite) { c.stamp(m.sprite, m.x, m.y); continue }
    m.draw(c)
  }
  nearFire(c, c.frame)
  fronds(c, c.frame)
  sparks(c, c.frame)
})
