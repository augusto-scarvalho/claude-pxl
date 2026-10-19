// Sky at dusk over the city: deep teal overhead down to dusty yellow haze, the sun setting at the upper
// left (the far megablocks hide its lower part), long flat cloud streaks lit from underneath on the
// sun's side, and a few flying cars crossing high. 320x112, fully opaque, stamped at 0,0, so box
// coordinates are scene coordinates. The towers cover most of it below row 50: the detail is high.
include("palette.px.js", { palette: true })

const SKY_W = 320, SKY_H = 112
const SKY_SUN = [28, 46, 9]                                         // centre and radius
const SKY_RAMP = "NnvVhHyYW"
const SKY_BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
const SKY_SOFT = 0.4                                                // the last 40% of each band dithers into the next
// tone by row, as a place along SKY_RAMP: zenith teal, sage at row 40, haze from row 56
const SKY_ROWS = [[0, 0.2], [12, 1], [26, 2], [40, 3], [56, 4], [74, 5], [SKY_H, 5.3]]
const SKY_SMOOTH = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t) }
const SKY_TONE = (x, y) => {
  let i = 0
  while (SKY_ROWS[i + 1][0] < y) i++
  const [y0, s0] = SKY_ROWS[i], [y1, s1] = SKY_ROWS[i + 1]
  let s = s0 + (s1 - s0) * (y - y0) / (y1 - y0)
  // the glow round the sun, spread along the horizon: a bright corona and a wide warm haze
  const d = Math.hypot(x - SKY_SUN[0], (y - SKY_SUN[1]) * 1.1)
  s += 2.2 * Math.exp(-(d - SKY_SUN[2]) / 8) + 1.2 * Math.exp(-d / 30)
  // warmer toward the sun's side low down, dustier at the right of the horizon
  s += 0.6 * (1 - x / SKY_W) * SKY_SMOOTH(20, 80, y) - 0.5 * (x / SKY_W) * SKY_SMOOTH(60, SKY_H, y)
  return s
}
const SKY_PICK = (x, y, s) => {
  const i = Math.floor(s), f = s - i, t = (SKY_BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16
  return SKY_RAMP[Math.max(0, Math.min(8, f > 1 - SKY_SOFT && t < (f - 1 + SKY_SOFT) / SKY_SOFT ? i + 1 : i))]
}

// the still part, built once: the gradient and the sun (white core, pale rim)
sprite("_sky_base", { w: SKY_W, h: SKY_H }, (c) => {
  for (let y = 0; y < SKY_H; y++) for (let x = 0; x < SKY_W; x++) c.px(x, y, SKY_PICK(x, y, SKY_TONE(x, y)))
  const [sx, sy, sr] = SKY_SUN
  for (let y = sy - sr - 1; y <= sy + sr + 1; y++) for (let x = sx - sr - 1; x <= sx + sr + 1; x++) {
    const d = Math.hypot(x - sx, y - sy)
    if (d < sr - 1.4) c.px(x, y, "W")
    else if (d < sr + 0.5) c.px(x, y, "Y")
  }
})

// Cloud streaks: [x0, y, length, body]. Each lives one loop out of step with the others: it forms out
// of a thin wisp, drifts right 1 px every 24 frames (10 px a loop) and thins away where it started.
// The body is close to the sky around it; the underside catches the sun from below, the light reaching
// along it from the sun's side as the cloud gains body, brightest near the sun, thinning to the right.
// The low one across the sun is a dusky bar, backlit: no lit underside.
const SKY_STREAKS = [[150, 11, 120, "v", 1], [24, 21, 100, "V", 1], [196, 29, 112, "n", 1], [74, 38, 104, "v", 1], [-14, 44, 92, "h", 0]]
const SKY_UNDER = (x) => (x < 90 ? 3 : x < 170 ? 2 : 1)            // ramp steps above the body
// Flying cars: [row, direction, px per frame, span, start, size]. v x 240 is a whole multiple of the span.
const SKY_AVS = [[18, 1, 2, 480, 60, 6], [27, -1, 2, 480, 300, 6], [33, 1, 3, 360, 200, 4]]

anim("sky_bg", { w: SKY_W, h: SKY_H, frames: 240, fps: 12 }, stamp("_sky_base", 0, 0), (c) => {
  const r = c.rng(7)
  SKY_STREAKS.forEach(([x0, y, len, body, lit], k) => {
    const age = (c.phase - ((k * 3) % 5) / 5 + 1) % 1
    const env = Math.min(1, 1.5 * Math.sin(age * Math.PI))
    const x = x0 - 5 + Math.floor(10 * age)
    const n = 3 + Math.floor(r() * 3)
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n
      const cx = Math.round(x + len * t + (r() - 0.5) * 10)
      const rx = Math.round(len * (0.16 + r() * 0.14) * env)
      const ry = Math.max(1, Math.round((0.6 + Math.sin(t * Math.PI) * (lit ? 1.6 : 0.5)) * env))
      const cy = y + Math.round((r() - 0.5) * 3)
      if (rx > 1) c.ellipse(cx, cy, rx, ry, body)
    }
    // thin tails trailing off both ends
    const t0 = 8 + Math.floor(r() * 10), t1 = 12 + Math.floor(r() * 10)
    c.hline(x - t0, y + 1, Math.round(16 * env), body); c.hline(x + len - 6, y + 2, Math.round(t1 * env), body)
    const bi = SKY_RAMP.indexOf(body)
    for (let px = x - 24; lit && px < x + len + 28; px++) {
      const order = (px - x + 24) / (len + 52)                           // how far the light has to reach, 0..1
      if (order > (env - 0.2) / 0.6) continue
      const up = SKY_UNDER(px)
      for (let py = y + 5; py >= y - 4; py--)
        if (c.is(px, py, body)) {
          c.px(px, py, SKY_RAMP[Math.min(7, bi + up)])
          if (up > 1 && order < (env - 0.6) / 0.4 && c.is(px, py - 1, body) && c.is(px, py - 2, body)) c.px(px, py - 1, SKY_RAMP[bi + 1])
          break
        }
    }
  })
  // flying cars, dark against the sky: a cabin over the hull, a headlight at the nose, a red nav light
  // on the tail that blinks 3 frames in 24, a thruster glowing under the bigger ones
  SKY_AVS.forEach(([y, dir, v, span, x0, len], i) => {
    const p = (x0 + v * c.frame) % span
    const x = dir > 0 ? p - 10 : SKY_W + 10 - p - len
    const nose = dir > 0 ? x + len - 1 : x, tail = dir > 0 ? x : x + len - 1
    const blink = (c.frame + i * 9) % 24 < 3
    c.hline(x, y + 1, len, "K")
    if (len > 4) {
      c.hline(dir > 0 ? x + 2 : x + len - 4, y, 2, "K")
      c.px(dir > 0 ? x + 1 : x + len - 2, y + 2, "O")
    }
    c.px(nose, y + 1, "A")
    c.px(tail, y, blink ? "p" : "K")
  })
})

scene("test_sky", { w: 320, h: 180, bg: "h" }, stamp("sky_bg", 0, 0))
