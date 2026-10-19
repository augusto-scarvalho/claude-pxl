// True perspective. "road": a road to the horizon at sunset in one-point perspective, and someone
// walking away along it, getting smaller step by step. "plaza": the same camera turned 40 degrees,
// two-point perspective. Everything on the ground is placed in meters (x across, z ahead) and
// projected by perspective(); plane() draws the ground pixel by pixel from where each pixel looks.
pal({
  N: "#1b1f4a", n: "#2e2a66", v: "#5b3a7a", m: "#a3466e", O: "#e0704a", o: "#f2a050", y: "#ffd27a", w: "#fff3c4",
  h: "#c98a6a", H: "#e6b089",
  d: "#17141f", D: "#2a2130", e: "#4a3440", E: "#6e4a50",
  a: "#221e28", A: "#3a3040", b: "#6a4c58", B: "#9a6a66",
  l: "#c9b796", L: "#8a6e6a",
  k: "#120f1c", K: "#2e2438", j: "#5c4250",
  S: "#140f1d", T: "#3a2c40", U: "#6c4c56",
  r: "#f2a45c", R: "#ffd890",
})
ramps("NnvmOoyw")

const W = 320, H = 180
// the eye 1.6 m above the road, the horizon on row 72, a 150 px focal length (about 94 degrees across)
const P = perspective({ w: W, horizon: 72, eye: 1.6, focal: 150 })
const at = (x, z, up = 0) => P.ground(x, z, up).map(Math.round)     // a point in meters, on screen
// aerial perspective: the farther, the closer to the haze, one key per band of depth
const band = (z, edges) => { let i = 0; while (i < edges.length && z >= edges[i]) i++; return i }
const FAR = [10, 30, 90]
const ROAD = "aAbB", FIELD = [["d", "D"], ["D", "e"], ["e", "E"], ["E", "h"]], PAINT = "llLL", POST = "kKjh"
const ROAD_HALF = 3.6, PAINT_W = 0.12

sprite("_road_bg", { w: W, h: H },
  // the sky: a gradient to the sun, which sits on the vanishing point
  grad(0, 0, W, P.horizon + 1, "NnvmOoy", "v"),
  circ(P.vp, P.horizon - 2, 10, "w"),
  glow("w", { r: 70, ramp: 3 }),
  // the ground: dashes and edge lines along the road, crop rows beside it, all hazier with depth.
  // A line stays at least ~0.6 px wide however far, so it thins into the distance without breaking up.
  plane(P, (x, z) => {
    if (z > 400) return "h"
    const b = band(z, FAR), ax = Math.abs(x), paint = Math.max(PAINT_W, (z / P.focal) * 0.6)
    if (ax < ROAD_HALF) return (ax < paint && z % 12 < 3.5) || Math.abs(ax - ROAD_HALF + 0.3) < paint ? PAINT[b] : ROAD[b]
    return ax < ROAD_HALF + 1 ? FIELD[b][0] : FIELD[b][Math.floor(ax / 1.4) % 2]
  }),
  // far trees along the horizon, in haze
  (c) => {
    const r = c.rng(7)
    let top = 2
    for (let x = 0; x < W; x++) {
      if (r() < 0.25) top = Math.max(0, Math.min(5, top + (r() < 0.5 ? -1 : 1)))
      if (Math.abs(x - P.vp) >= 9) c.vline(x, P.horizon - top, top + 1, "j")   // a gap where the road and the sun are
    }
  },
  // a fence on the left: a post every 3.5 m, 1.1 m tall, two rails
  (c) => {
    const X = -5.4, posts = []
    for (let z = 2.5; z < 260; z += 3.5) posts.push(z)
    posts.forEach((z, i) => {
      const k = POST[band(z, FAR)], [x, y] = at(X, z), top = at(X, z, 1.1)[1], w = Math.max(1, Math.round(0.12 * P.scale(z)))
      c.rect(x - (w >> 1), top, w, Math.max(1, y - top), k)
      const n = posts[i + 1]
      if (n) for (const up of [1.0, 0.55]) c.line(...at(X, z, up), ...at(X, n, up), k)
    })
  },
  // power poles on the right: 9 m tall every 28 m, two wires sagging between them
  (c) => {
    const X = 6.2, poles = []
    for (let z = 5; z < 600; z += 28) poles.push(z)
    poles.forEach((z, i) => {
      const k = POST[band(z, FAR)], [x, y] = at(X, z), top = at(X, z, 9)[1], w = Math.max(1, Math.round(0.25 * P.scale(z)))
      c.rect(x - (w >> 1), top, w, y - top, k)
      const [ax, ay] = at(X - 0.9, z, 8.4)
      c.hline(ax, ay, Math.max(1, Math.round(1.8 * P.scale(z))), k)
      const n = poles[i + 1]
      if (!n) return
      for (const dx of [-0.8, 0.8]) {
        let prev
        for (let s = 0; s <= 1.0001; s += 1 / 24) {
          const zz = z + (n - z) * s, p = at(X + dx, zz, 8.4 - 1.6 * s * (1 - s))
          if (prev) c.line(...prev, ...p, POST[band(zz, FAR)])
          prev = p
        }
      }
    })
  })

// The walker: 1.75 m, 0.8 m a step, four poses a step (contact, down, passing, up) at 10 fps: 2 m/s.
// Walked the way pixel art walks: the scale is held for the whole step and changes only at the next
// contact, when the pose changes anyway, and the planted foot stays where it landed: no sliding, no
// size flickering a pixel at a time mid-step. Near, it is drawn by code at its exact size; under 15 px
// a figure drawn that way turns into a blob, so it takes the hand-drawn sprite nearest its height
// (stamp's `fit`), flipped every other step to swap the legs.
const FPS = 10, PER_STEP = 4, STEPS = 62, FRAMES = PER_STEP * STEPS, Z0 = 0.6, STRIDE = 0.8, LANE = 0.9, BIG = 15
// dark against the glow all the way (at 50 m the haze is nothing yet); in the last 12 m the figure
// and its shadow dissolve into the light, a 4x4 ordered dither taking more of it each step
const BODY = "ST", BODY_FAR = [24], FADE = [38, 50]
const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5], bayer = (x, y) => (B4[(y & 3) * 4 + (x & 3)] + 0.5) / 16
// the sun is low ahead of them: their shadow runs back toward us, ~25 m long
const TALL = 1.75, SHADOW = TALL / Math.tan((4 * Math.PI) / 180), DARKER = { a: "k", A: "a", b: "A", B: "b", l: "L", L: "A" }

// Small sizes, seen from behind, the four poses side by side: contact (the back arm hangs lower),
// down (the body a pixel lower), passing (the swinging foot lifted), up (it reaches ahead, the
// other arm back). The rim is the sun catching the head and shoulders.
const MICRO = {
  14: `
    .rSr. ..... .rSr. .rSr.
    .SSS. .rSr. .SSS. .SSS.
    rSSSr .SSS. rSSSr rSSSr
    SSSSS rSSSr SSSSS SSSSS
    SSSSS SSSSS SSSSS SSSSS
    SSSSS SSSSS SSSSS SSSSS
    SSSS. SSSSS .SSS. .SSSS
    .SSS. SSSS. .SSS. .SSS.
    .S.S. .SSS. .S.S. .S.S.
    .S.S. .S.S. .S.S. .S.S.
    .S.S. .S.S. .S.S. .S.S.
    .S.S. .S.S. .S.S. .S.S.
    .S.S. .S.S. .S... .S.S.
    .S.S. .S.S. .S... .S...`,
  12: `
    .rSr. ..... .rSr. .rSr.
    .SSS. .rSr. .SSS. .SSS.
    rSSSr .SSS. rSSSr rSSSr
    SSSSS rSSSr SSSSS SSSSS
    SSSSS SSSSS SSSSS SSSSS
    SSSS. SSSSS .SSS. .SSSS
    .SSS. SSSS. .SSS. .SSS.
    .S.S. .SSS. .S.S. .S.S.
    .S.S. .S.S. .S.S. .S.S.
    .S.S. .S.S. .S.S. .S.S.
    .S.S. .S.S. .S... .S.S.
    .S.S. .S.S. .S... .S...`,
  10: `
    .S. ... .S. .S.
    .S. .S. .S. .S.
    SSS .S. SSS SSS
    SSS SSS SSS SSS
    SSS SSS SSS SSS
    .S. SSS .S. .S.
    S.S .S. S.S S.S
    S.S S.S S.S S.S
    S.S S.S S.. S.S
    S.S S.S S.. S..`,
  9: `
    .S. ... .S. .S.
    SSS .S. SSS SSS
    SSS SSS SSS SSS
    SSS SSS SSS SSS
    .S. SSS .S. .S.
    S.S .S. S.S S.S
    S.S S.S S.S S.S
    S.S S.S S.. S.S
    S.S S.S S.. S..`,
  8: `
    .S. ... .S. .S.
    SSS .S. SSS SSS
    SSS SSS SSS SSS
    SSS SSS SSS SSS
    .S. SSS .S. .S.
    S.S .S. S.S S.S
    S.S S.S S.S S.S
    S.S S.S S.. S.S`,
  7: `
    .S. ... .S. .S.
    SSS .S. SSS SSS
    SSS SSS SSS SSS
    .S. SSS .S. .S.
    S.S .S. S.S S.S
    S.S S.S S.S S.S
    S.S S.S S.. S.S`,
  6: `
    .S. ... .S. .S.
    SSS .S. SSS SSS
    SSS SSS SSS SSS
    .S. SSS .S. .S.
    S.S .S. S.S S.S
    S.S S.S S.. S.S`,
  5: `
    .S. ... .S. .S.
    SSS .S. SSS SSS
    SSS SSS SSS SSS
    S.S SSS S.S S.S
    S.S S.S S.. S.S`,
}
for (const [h, strip] of Object.entries(MICRO)) {
  const w = strip.trim().indexOf(" ")
  anim("walker_" + h, { w, h: +h, frames: PER_STEP, fps: FPS, pivot: "bottom" }, (c) => c.grid(-c.frame * (w + 1), 0, strip))
}

// per pose of the drawn walker, in meters from the planted foot (d forward, up above the ground):
// where the other foot is, how high the hips ride, and how far the hips are ahead of the planted foot
const POSES = [
  { foot: [-0.8, 0], hips: [-0.4, 0.92] },       // contact: the back foot still down behind
  { foot: [-0.55, 0.12], hips: [-0.25, 0.89] },  // down: its heel up behind, the body lowest
  { foot: [-0.1, 0.15], hips: [0, 0.94] },       // passing: it swings by, the body over the planted foot
  { foot: [0.4, 0.07], hips: [0.2, 0.92] },      // up: it reaches ahead
]

function walker(c, frame) {
  const k = Math.floor(frame / PER_STEP), pose = frame % PER_STEP, side = k % 2 ? 1 : -1
  const zk = Z0 + k * STRIDE, zh = zk + STRIDE / 2                // where this foot landed; the body's depth, held
  const key = BODY[band(zk, BODY_FAR)], s = P.scale(zh)            // px per meter, held for the step
  const fade = Math.min(1, Math.max(0, (zk - FADE[0]) / (FADE[1] - FADE[0])))
  if (fade >= 1) return
  c.clip(fade > 0 ? (x, y) => bayer(x, y) >= fade : undefined, () => {
    shadow(c, zk)
    if (s * TALL >= BIG) draw(c, frame, POSES[pose], side, zk, zh, key, s)
    else c.stamp("walker_*", ...at(LANE, zk), { fit: s * TALL, frame: pose, ...(side > 0 && { flip: "x" }), ...(key !== "S" && { swap: { S: key } }) })
  })
}

// the shadow on the road: from the planted foot back toward the eye, a body's width tapering to a head's
function shadow(c, zk) {
  for (let row = at(LANE, zk)[1]; row < H; row++) {
    const zz = P.at(0, row)[1]
    if (zz > zk || zz < zk - SHADOW) continue
    const half = 0.22 - (0.12 * (zk - zz)) / SHADOW
    for (let col = Math.floor(P.ground(LANE - half, zz)[0]); col <= Math.ceil(P.ground(LANE + half, zz)[0]); col++) {
      const d = DARKER[c.key(col, row)]
      if (d && Math.abs(P.at(col, row)[0] - LANE) <= half) c.px(col, row, d)
    }
  }
}

function draw(c, frame, pose, side, zk, zh, key, s) {
  // a point d m ahead of the planted foot and up m above the ground, x m to its side, on screen
  const [ax, ay] = P.ground(LANE + side * 0.11, zk)
  const pt = (x, d, up) => [Math.round(ax + x * s), Math.round(ay - (P.focal * P.eye * d) / (zh * zh) - up * s)]
  const T = (m) => Math.max(1, Math.round(m * s))                  // a thickness in meters, in px
  const [hd, hu] = pose.hips, cx = -side * 0.11                      // the body's middle, across
  const hipL = pt(cx - 0.09, hd, hu), hipR = pt(cx + 0.09, hd, hu)
  const planted = pt(0, 0, 0), swing = pt(-side * 0.22, pose.foot[0], pose.foot[1])
  const hipP = side < 0 ? hipL : hipR, hipS = side < 0 ? hipR : hipL
  // legs: the planted one straight, the swinging one bent at the knee, forward and up
  const kneeS = pt(-side * 0.2, (hd + pose.foot[0]) / 2 + 0.12, (hu + pose.foot[1]) / 2 + 0.05)
  c.line(hipS[0], hipS[1], kneeS[0], kneeS[1], key, T(0.14))
  c.line(kneeS[0], kneeS[1], swing[0], swing[1], key, T(0.12))
  c.line(hipP[0], hipP[1], planted[0], planted[1], key, T(0.14))
  if (s * TALL >= 24) {
    c.rect(planted[0] - T(0.07), planted[1] - T(0.05) + 1, T(0.14) + 1, T(0.05), key)
    c.rect(swing[0] - T(0.07), swing[1] - T(0.05) + 1, T(0.14) + 1, T(0.05), pose.foot[1] > 0.05 ? "U" : key)
  }
  // a back: sloping shoulders from the neck, the chest, narrower at the waist; arms swinging against the legs
  const bob = hu - 0.92, sh = 1.45 + bob
  const sL = pt(cx - 0.2, hd, sh), sR = pt(cx + 0.2, hd, sh), wL = pt(cx - 0.14, hd, hu + 0.05), wR = pt(cx + 0.14, hd, hu + 0.05)
  const nL = pt(cx - 0.07, hd, sh + 0.07), nR = pt(cx + 0.07, hd, sh + 0.07), cL = pt(cx - 0.18, hd, sh - 0.28), cR = pt(cx + 0.18, hd, sh - 0.28)
  c.poly([nL[0], nL[1], nR[0], nR[1], sR[0], sR[1], cR[0], cR[1], wR[0], wR[1], wL[0], wL[1], cL[0], cL[1], sL[0], sL[1]], key)
  const swingArm = [0, 1, 0, -1][frame % PER_STEP]                    // the planted side's arm goes back on contact
  for (const [arm, sp, sgn] of [[-1, sL, side < 0 ? 1 : -1], [1, sR, side < 0 ? -1 : 1]]) {
    const hand = pt(cx + arm * 0.24, hd + sgn * swingArm * -0.2, 0.82 + bob + (sgn * swingArm < 0 ? 0.04 : 0))
    c.line(sp[0], sp[1] + T(0.04), hand[0], hand[1], key, T(0.09))
  }
  // neck and head: hair, from behind
  const neck = pt(cx, hd, sh + 0.03), head = pt(cx, hd, 1.63 + bob)
  c.rect(neck[0] - T(0.04), head[1], T(0.08), Math.max(1, neck[1] - head[1] + 1), key)
  c.ellipse(head[0], head[1], T(0.1), T(0.12), key)
  // backlit: the sun ahead wraps a warm rim round the head, the shoulders and the tops of the arms
  if (key !== "S") return
  const body = (x, y) => x >= 0 && y >= 0 && x < W && y < H && "ST".includes(c.key(x, y))
  const top = head[1] - T(0.13) - 1, chest = Math.max(cL[1], cR[1]), rim = []
  for (let y = top; y < chest; y++)
    for (let x = Math.min(sL[0], wL[0]) - T(0.4); x <= Math.max(sR[0], wR[0]) + T(0.4); x++)
      if (body(x, y) && (!body(x, y - 1) || !body(x - 1, y) || !body(x + 1, y))) rim.push([x, y])
  for (const [x, y] of rim) c.px(x, y, y < sL[1] ? "R" : "r")
}

anim("road", { w: W, h: H, frames: FRAMES, fps: FPS }, stamp("_road_bg", 0, 0), (c) => walker(c, c.frame))

// Two-point perspective: the camera turned 40 degrees to the right (yaw). The square, its flagstones
// and the blocks on it are laid on the world's x and z axes, so every level edge runs to one of two
// vanishing points on the horizon: Q.vanish(0) for the edges along z, Q.vanish(90) for those along x.
// Verticals stay vertical (the camera is level). The joints are drawn as lines, not per pixel by
// plane(): a line stays one clean pixel wide however far it runs.
const Q = perspective({ w: W, horizon: 84, eye: 1.6, fov: 90, yaw: 40 })
const SQUARE = [-24, -6, 36, 54], STONE = 3                    // x0, z0, x1, z1 in meters; 3 m flagstones
// [x0, z0, x1, z1, height]: a tower with its corner toward us, a low hall, a kiosk
const BLOCKS = [[10, 20, 22, 32, 12], [-8, 34, 2, 44, 5], [15, 5, 17.5, 7.5, 2.6]]
const q = (x, z, up = 0) => Q.ground(x, z, up).map(Math.round)
// a level segment on screen, cut where it would pass behind the eye
function seg(c, x0, z0, x1, z1, up, key) {
  const zc = (x, z) => x * Math.sin((Q.yaw * Math.PI) / 180) + z * Math.cos((Q.yaw * Math.PI) / 180), a = zc(x0, z0), b = zc(x1, z1), near = 0.5
  if (a < near && b < near) return
  const t = (near - a) / (b - a)
  if (a < near) [x0, z0] = [x0 + (x1 - x0) * t, z0 + (z1 - z0) * t]
  else if (b < near) [x1, z1] = [x0 + (x1 - x0) * t, z0 + (z1 - z0) * t]
  c.line(...q(x0, z0, up), ...q(x1, z1, up), key)
}

function block(c, [x0, z0, x1, z1, tall]) {
  // a face from corner a to corner b, with a 3 m grid on it: floors run to a vanishing point, posts stay upright
  const face = (a, b, key) => {
    c.poly([...q(...a), ...q(...b), ...q(...b, tall), ...q(...a, tall)], key)
    for (let up = 3; up < tall; up += 3) seg(c, ...a, ...b, up, "d")
    const len = Math.hypot(b[0] - a[0], b[1] - a[1])
    for (let s = 3; s < len; s += 3) {
      const t = s / len, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t
      c.line(...q(x, z), ...q(x, z, tall), "d")
    }
  }
  // the faces turned toward the eye: the front (-z) and the side the eye is on
  if (x0 > 0) face([x0, z1], [x0, z0], "D")
  if (x1 < 0) face([x1, z0], [x1, z1], "D")
  face([x0, z0], [x1, z0], "e")
  for (const x of [x0, x1]) c.line(...q(x, z0), ...q(x, z0, tall), "E")   // the front corners catch the light
}

scene("plaza", { w: W, h: H },
  grad(0, 0, W, Q.horizon + 1, "NnvmOoy", "v"),
  circ(Q.vanish(0) + 60, Q.horizon - 3, 8, "w"),
  glow("w", { r: 60, ramp: 3 }),
  // the square, and beyond it open ground hazing toward the horizon
  plane(Q, (x, z) => {
    const [x0, z0, x1, z1] = SQUARE
    if (x >= x0 && x <= x1 && z >= z0 && z <= z1) return "A"
    return "DeEh"[band(Math.hypot(x, z), [80, 160, 300])]
  }),
  (c) => {
    const [x0, z0, x1, z1] = SQUARE
    for (let x = x0 + STONE / 2; x < x1; x += STONE) seg(c, x, z0, x, z1, 0, "a")   // joints along z
    for (let z = z0 + STONE / 2; z < z1; z += STONE) seg(c, x0, z, x1, z, 0, "a")   // and along x
  },
  // far to near, so nearer blocks cover farther ones
  (c) => BLOCKS.slice().sort((a, b) => Math.hypot(b[0], b[1]) - Math.hypot(a[0], a[1])).forEach((b) => block(c, b)))
