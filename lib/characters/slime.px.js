// A slime, the top-down action game's first enemy, at a 16 px grid (lib/profiles/topdown16.px.js), 16 x 16 with
// the genre's near-black line, drawn by hand: a green dome in 3 tones lit on its upper left, a glint, two eyes as
// the school draws them (a white beside a dark pupil: library F5's top-down study). It breathes (slime_idle: at
// rest, then squashed a pixel lower and wider) and hops (slime_hop: crouched, stretched up off the ground, round
// at the top, stretched coming down; the next crouch is its landing). Lit from above: the game flips it. For any
// scene: include("<path>/lib/characters/slime.px.js", { as: "slime" }), its palette its own.
pal({ k: "#1a1620", s: "#2f7a46", S: "#4fb05a", l: "#9be07a", w: "#f4fff0" })
ramps("sSl")
// in a block: its names stay its own when a scene includes the file
{
const REST = `
  ..............
  ..............
  ..............
  ..............
  .....SSSS.....
  ...SSllSSSS...
  ..SSlwlSSSSS..
  ..SllSSSSSSS..
  .SSSwkSSwkSSS.
  .SSSkkSSkkSSS.
  .SSSSSSSSSSSS.
  .sSSSSSSSSSSs.
  .ssSSSSSSSSss.
  ..ssssssssss..`
const SQUASH = `
  ..............
  ..............
  ..............
  ..............
  ..............
  .....SSSS.....
  ...SSllSSSS...
  ..SSlwlSSSSS..
  .SSllSSSSSSSS.
  SSSSwkSSwkSSSS
  SSSSkkSSkkSSSS
  sSSSSSSSSSSSSs
  ssSSSSSSSSSSss
  .ssssssssssss.`
const STRETCH = `
  ......SS......
  .....SllS.....
  ....SlwlSS....
  ....SllSSS....
  ...SSSSSSSS...
  ...SwkSSwkS...
  ...SkkSSkkS...
  ...SSSSSSSS...
  ...sSSSSSSs...
  ...ssSSSSss...
  ....ssssss....`
const PEAK = `
  .....SSSS.....
  ...SSllSSSS...
  ..SSlwlSSSSS..
  ..SllSSSSSSS..
  .SSSwkSSwkSSS.
  .SSSkkSSkkSSS.
  .SSSSSSSSSSSS.
  .sSSSSSSSSSSs.
  ..ssssssssss..`
const SLIME = { w: 14, h: 14, outline: "k", pivot: "bottom" }
anim("slime_idle", SLIME, frame({ ms: 500 }, REST), frame({ ms: 400 }, SQUASH))
anim("slime_hop", SLIME, frame({ ms: 120 }, SQUASH), frame({ ms: 90 }, grid(0, 1, STRETCH)), frame({ ms: 160 }, grid(0, 0, PEAK)), frame({ ms: 90 }, grid(0, 3, STRETCH)))
card("slime_idle", { is: "a green slime, 16x16: a dome lit on its upper left, a glint, two eyes; it breathes (rest, squashed)", cells: { "topdown/16": "✓" },
  vary: { part: "slime_hop: crouched, stretched up, round at the top, stretched down; color: base and swap (s S l the green, dark to light)" } })
}
// The same slime at a 32 px grid (lib/profiles/topdown32.px.js), drafted in 3D and finished by hand (topdown32: form
// and light from 3D, the final pixels by hand), built from the Dragon Quest slime's model (the Caraslime: widest at
// 0.39 of its height, its underside curling in, its foot its darkest, a soft tip; its eyes big and high, a black round
// pupil, a smile: library F5 4n, numbers only) and MapleStory's slimes (the light through the jelly gathered low, a rim
// on its shadow side, a big glint upper left): a jelly body whose middle stands 0.7 of its height-radius up (widest at
// 0.41 of its height, the ground cutting it where it is 0.71 of its width), drawn up into a soft tip leaning away from
// the light, seen from the figures' 45 degrees at 32 px a meter, drawn three times over and brought down by shrink's
// edge treatment; each pose the same volume (squashed 1.12 times wider and 1.25 lower, stretched 1.12 narrower and 1.25
// taller). By hand: the draft's light averaged over a disc 2 px round and laid in clean bands (its form's light, the
// terminator a band, not a speckle), a band a step lighter low across its middle (the light through the jelly), a rim
// on its shadow side, its foot its darkest (it sits in its own shade); a crescent glint along its upper left curve and a
// dot under it; two eyes high on its front, each a white round in its dark rim, a black pupil low and inward with a
// catchlight; a smile; two bubbles seen through it; the genre's near-black line round it; its contact shadow the
// scene's (topdown32's shadow). It breathes (slime32_idle: at rest, then squashed) and hops (slime32_hop: crouched,
// stretched up 5 px off the ground, round 8 px up, stretched coming down; the next crouch is its landing), at the 16's
// timings.
pal({ m: "#3c9450", L: "#72c867" })
{
const JELLY = { mats: { jelly: "smSl" }, light: [-0.5, -0.45, 0.75], surface: { tones: 4, outline: false }, view: { kind: "side", pitch: 45 }, ppm: 96, headings: ["s"] }
// (in the air, round: no ground to sit on)
const blob = ([rx, ry, rz], round) => {
  const z = round ? rz : rz * 0.7
  return sdf.union(sdf.ellipsoid([rx, ry, rz]).at(0, 0, z), sdf.cone(0.13, 0.3, 0.01).rotate(-18, "y").at(0.03, 0, z + rz * 0.6), { smooth: 0.05 }).intersect(sdf.plane([0, 0, -1], 0)).mat("jelly")
}
const BANDS = ["k", "s", "m", "S", "L", "l", "w"], LUM = { s: 0, m: 1, S: 2, l: 3 }
const EYE = [".kk.", "kwwk", "kwwk", "kwkk", ".kk."]
const pass = (c) => {
  const on = (x, y) => x >= 0 && y >= 0 && x < c.w && y < c.h && !!c.get(x, y), row = (y) => { const xs = []; for (let x = 0; x < c.w; x++) if (on(x, y)) xs.push(x); return xs }
  let x0 = c.w, x1 = -1, y0 = c.h, y1 = -1
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) if (on(x, y)) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y) }
  const w = x1 - x0 + 1, h = y1 - y0 + 1, cx = (x0 + x1 + 1) / 2, T = []
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    if (!on(x, y)) { T.push(-1); continue }
    let s = 0, n = 0
    for (let v = -2; v <= 2; v++) for (let u = -2; u <= 2; u++) if (u * u + v * v <= 5 && on(x + u, y + v)) { s += LUM[c.key(x + u, y + v)] ?? 1; n++ }
    T.push(s / n)
  }
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (!on(x, y)) continue
    const t = T[y * c.w + x], f = (y - y0) / h, xs = row(y), edgeR = x >= xs.at(-1) - 1, edgeL = x <= xs[0]
    let b = t < 0.9 ? 1 : t < 1.6 ? 2 : t < 2.2 ? 3 : 4
    if (f > 0.7 && f < 0.88 && Math.abs(x + 0.5 - cx) < w * 0.3) b = Math.min(4, b + 1)
    if (edgeR && f > 0.45 && f < 0.85) b = Math.max(b, 2)
    if (y >= y1 - 1 && !(f > 0 && edgeL)) b = Math.min(b, y === y1 ? 1 : 2)
    c.px(x, y, BANDS[b])
  }
  const gx = x0 + Math.round(w * 0.16), gy = y0 + Math.round(h * 0.14)
  ;["..lwl", ".lw..", "lw...", "l...."].forEach((r, j) => [...r].forEach((k, i) => { if (k !== "." && on(gx + i, gy + j)) c.px(gx + i, gy + j, k) }))
  if (on(gx + 1, gy + 6)) c.px(gx + 1, gy + 6, "l")
  const eyeY = y0 + Math.round(h * 0.3)
  for (const [ex, flip] of [[Math.round(cx - 6), false], [Math.round(cx + 2), true]]) EYE.forEach((r, j) => [...(flip ? [...r].reverse().join("") : r)].forEach((k, i) => { if (k !== ".") c.px(ex + i, eyeY + j, k) }))
  for (const [u, v] of [[0, 0], [1, 1], [2, 1], [3, 0]]) c.px(Math.round(cx - 2) + u, eyeY + 6 + v, "k")
  for (const [u, v] of [[0.7, 0.66], [0.3, 0.8]]) { const x = x0 + Math.round(w * u), y = y0 + Math.round(h * v); if (on(x, y) && on(x, y + 1)) { c.px(x, y, "l"); c.px(x, y + 1, "m") } }
}
for (const [n, r] of Object.entries({ rest: [0.36, 0.31, 0.335], squash: [0.405, 0.345, 0.268], stretch: [0.322, 0.275, 0.42], peak: [0.35, 0.31, 0.33] })) {
  turnaround(`_slime32_${n}_live`, blob(r, n === "peak"), JELLY)
  sprite(`_slime32_${n}_draft3`, { png: `frozen/slime32_${n}.png`, frozen: `_slime32_${n}_live_s` })
  sprite(`_slime32_${n}`, { base: `_slime32_${n}_draft3`, shrink: { by: 3, cover: 0.5 } }, pass)
}
// (each pose its lowest row on the ground row, lifted `lift` px in the air, its middle on the frame's)
const SLIME32 = { w: 30, h: 32, outline: "k", pivot: "bottom" }, at = (n, lift = 0) => (c) => {
  const im = c.asset(`_slime32_${n}`), bb = im.bounds(), [px, py] = im.pivot
  c.stamp(`_slime32_${n}`, 15 - Math.round(bb.x + bb.w / 2 - px), 31 - lift - (bb.y + bb.h - 1 - py))
}
anim("slime32_idle", SLIME32, frame({ ms: 500 }, at("rest")), frame({ ms: 400 }, at("squash")))
anim("slime32_hop", SLIME32, frame({ ms: 120 }, at("squash")), frame({ ms: 90 }, at("stretch", 5)), frame({ ms: 160 }, at("peak", 8)), frame({ ms: 90 }, at("stretch")))
card("slime32_idle", { is: "a green slime at 32, drafted in 3D and finished by hand from the Dragon Quest and MapleStory slimes: a jelly body widest low with a soft tip, its light in clean bands (lit upper left, a glow low through it, a rim on its shadow side, its foot darkest), a crescent glint, big eyes high with black pupils and catchlights, a smile, bubbles seen through it, its line; it breathes (rest, squashed)", cells: { "topdown/32": "✎" },
  vary: { part: "slime32_hop: crouched, stretched up, round at the top, stretched down" } })
}
