// HD-2D: a clearing in the pine wood at dusk, where the traveler casts a fireball at a scarecrow. Every
// shader of the fork in one scene, on its clock (5 s, 100 frames of 50 ms): the pines, the dead tree,
// the bushes and the grass swaying in one wind (effect "sway": their feet still, a gust rolling across,
// no two tufts in step); the traveler gathering fire at his hand, an aura hugging his pose (effect
// "aura", a sprite blended "add"); the ball (effect "energy" and "distort") lighting the ground as it
// flies, hidden behind a ruined wall on its way (its depth in mesh()), a trail of it behind; the
// impact's flash, sparks (emitter) and smoke (smoke(), blended "alpha"); the scarecrow catching fire
// where it was hit and burning away (the dissolve's look "burn" on that copy alone, fx: flames rising
// from the burning front, the char and the embers behind them, ash), its shadow with it, the flames'
// flicker lighting the ground and the wall, a column of smoke over it; then it comes back (the neutral look). `clearing` is the art at its own size, the
// one checked; `clearing_md` three times as big (960x540) through post(): the depth in focus, Three's bloom, a dusk
// grade from dusk.cube, a light grain.
include("kit.px.js", { palette: true })
include("traveler.px.js")
// the scarecrow's straw (S W X), burlap (H F), wood (P R) and hat (C 9), keys of its own (the kit's ramps
// use 1-8); the fire's tones
pal({ "S": "#f0d880", "W": "#c8a050", "X": "#8a6830", "H": "#b89a72", "F": "#7a6048", "P": "#8a6a4a", "R": "#4a3428", "C": "#5a4a3a", "9": "#33281f", "0": "#2a1a14" })

// ---------------------------------------------------------------- the things in it
// A scarecrow: a pole and its crossbar, a burlap head with a stitched face under a straw hat, a sack
// for a body tied with rope, straw out of its sleeves and from under the sack. Room above it for the ash.
sprite("_scarecrow", { w: 28, h: 60, pivot: [14, 60], outline: "k" }, (c) => {
  const Y = 12
  c.rect(13, Y + 22, 2, 26, "P"); c.vline(14, Y + 22, 26, "R")
  c.rect(3, Y + 23, 22, 2, "P"); c.hline(3, Y + 24, 22, "R")
  for (const x0 of [4, 17]) { c.rect(x0, Y + 21, 7, 5, "H"); c.hline(x0, Y + 25, 7, "F") }
  for (const [x, y, k] of [[2, 22, "S"], [1, 23, "W"], [2, 24, "S"], [1, 25, "X"], [25, 22, "S"], [26, 23, "W"], [25, 24, "S"], [26, 25, "X"]]) c.px(x, Y + y, k)
  c.rect(9, Y + 20, 10, 14, "H"); c.rect(16, Y + 20, 3, 14, "F"); c.hline(9, Y + 27, 10, "X")
  for (let x = 9; x <= 18; x++) c.px(x, Y + 34 + ((x * 7) % 3 === 0 ? 1 : 0), (x * 5) % 3 ? "W" : "S")
  c.circ(14, Y + 15, 5, "H"); c.rect(16, Y + 12, 3, 7, "F")
  for (const [x, y] of [[12, 14], [16, 14], [12, 17], [13, 18], [14, 17], [15, 18], [16, 17]]) c.px(x, Y + y, "0")
  c.rect(7, Y + 10, 15, 2, "C"); c.rect(10, Y + 5, 9, 5, "C"); c.hline(10, Y + 8, 9, "9"); c.hline(7, Y + 11, 15, "9")
  for (const [x, y] of [[8, 12], [9, 13], [19, 12], [20, 13]]) c.px(x, Y + y, "W")
}, bump("hybrid"))
// the fire: a ball of it in three sizes, its noise churning, its edge rippling
for (const [n, r] of [["_fire_s", 2], ["_fire_m", 3], ["_fire", 4]])
  anim(n, { w: 2 * r + 5, h: 2 * r + 5, pivot: "center", frames: 10, fps: 20 }, circ(r + 2, r + 2, r, "Y"),
    effect("energy", { keys: ["#7a1c10", "#d8401c", "#ff9a30", "#fff0b0"], scale: 1.6, speed: 2 }), effect("distort", { amount: 1, scale: 2, speed: 2, axis: "x" }))
sprite("_spark", { w: 1, h: 1 }, px(0, 0, "Y"))
anim("_burst_smoke", { w: 48, h: 40, pivot: "bottom", frames: 26, fps: 20 }, smoke(24, 34, ["#d0c4b8", "#988c82", "#625852"], { shape: "puff", spread: 14, size: [4, 10], count: 12, seed: 4 }))
// the smoke of the fire, a column rising and leaning with the wind, lit warm from below
anim("_fire_smoke", { w: 44, h: 80, pivot: "bottom", frames: 50, fps: 20 }, smoke(20, 76, ["#b8aca2", "#7e746e", "#4e4846"], { shape: "column", path: [0, 0, 2, -24, 8, -50, 14, -70], size: [3, 10], count: 18, seed: 6, light: [-0.4, 0.8] }))
// the aura round him while he casts, from each frame of the pose (it hugs it)
anim("tr_cast_aura_e", { base: "tr_cast_e" }, effect("aura", { width: 3, color: ["#fff0b0", "#ff9a30", "#d8401c"], fade: 0.5, flicker: 0.6, scale: 3.5, speed: 2 }))
// the wood and the grass in one wind, out of step (environment §2, §3)
const WIND = { frames: 50, fps: 20 }                       // 2.5 s a sway: twice in the scene's 5 s
const SWAY = { _pine: { amount: 2, still: 6 }, _deadtree: { amount: 1.5, still: 12, power: 2.5 }, _bush: { amount: 1, power: 1.5 },
  _tuft_a: { amount: 1.5, power: 1, cycles: 2, vary: 0.5 }, _tuft_b: { amount: 1, power: 1, cycles: 2, vary: 0.5 }, _tuft_c: { amount: 2, power: 1, cycles: 2, vary: 0.5 } }
for (const [n, o] of Object.entries(SWAY)) anim(`${n}_wind`, { base: n, ...WIND }, effect("sway", o))

// ---------------------------------------------------------------- the place
// The camera of the graveyard: 24 px to the meter, high up through a long lens. The traveler stands on
// the left facing right; a ruined wall 1.4 m high runs across in front of the way to the scarecrow, so
// from up here it hides the ball as it passes behind (a wall hides only what is near it: the ball goes
// 0.5 m behind it, below its top less that much of the tilt).
const W = 320, H = 180, CAM = hd2dCamera({ w: W, h: H, pitch: -38, fov: 30, ppm: 24 }), Z = CAM.z, DIST = CAM.dist
const M = model(), block = (...a) => hd2dBlock(M, ...a)
M.face("grass", [-30, Z - 20, 0], [30, Z - 20, 0], [30, Z + 30, 0], [-30, Z + 30, 0])
M.face("path", [-3, Z - 9, 0.01], [-1.9, Z - 9, 0.01], [-1.9, Z - 0.1, 0.01], [-3, Z - 0.1, 0.01])
block("wall", "wall", -1.1, Z - 0.65, 1.3, Z - 0.4, 0, 1.7)
block("wall", "wall", 1.3, Z - 0.65, 1.8, Z - 0.4, 0, 0.7)
const MATS = { grass: { tex: "_grass", texel: CAM.floor }, path: { tex: "_flags", texel: CAM.floor }, wall: { tex: "_wall" } }
const HERO = [-2.4, Z - 0.25], CROW = [2.5, Z - 0.15]
// the wood round the clearing, and the grass, placed once
const R = rng(11), WOOD = []
for (const [n, x, z] of [["_pine", -5.6, Z + 2.6], ["_pine", -2.9, Z + 3.8], ["_pine", 0.4, Z + 4.4], ["_pine", 3.6, Z + 3.4], ["_pine", 6.2, Z + 1.8], ["_deadtree", -5.4, Z - 0.6], ["_bush", -4.0, Z + 1.4], ["_bush", 4.4, Z + 0.9], ["_bush", 5.2, Z - 2.4], ["_bush", -5.6, Z - 3.2], ["_rock", 3.4, Z - 2.8], ["_rock_small", -0.4, Z - 2.6]])
  WOOD.push(n.startsWith("_rock") ? { name: n, at: [x, z] } : { name: `${n}_wind`, at: [x, z], reseed: true })
for (let k = 0; WOOD.length < 70; k++) {
  const x = -6.8 + R() * 13.6, z = Z - 5 + R() * 8
  if ((Math.abs(x - HERO[0]) < 0.6 && Math.abs(z - HERO[1]) < 0.4) || (x > -1.3 && x < 2 && z > Z - 0.8 && z < Z - 0.2) || (Math.abs(x - CROW[0]) < 0.5 && Math.abs(z - CROW[1]) < 0.4) || (x > -3.1 && x < -1.8 && z < Z)) continue
  WOOD.push({ name: `${["_tuft_a", "_tuft_b", "_tuft_c"][k % 3]}_wind`, at: [x, z], reseed: true, delay: Math.round(x * 120), shadow: 0 })
}

// ---------------------------------------------------------------- the spell, on the scene's clock
// charge while he winds up (his pose's frames 0-5), the cast at its thrust (6-7), the ball's flight,
// the impact, the scarecrow burning, then coming back; the rest of the 4 s, quiet
const SPELL = ability({ charge: 600, cast: 200, travel: 600, impact: 200, burn: 2300, reform: 600 }, { start: 200 })
const sparks = emitter({ at: [0, 0], burst: 18, from: SPELL.start("impact"), life: [300, 800], speed: [1.2, 3], angle: -90, spread: 75, gravity: [0, 6], drag: 1.2, seed: 9 })
const DUSK = { light: [-0.8, 0.45, 0.35], sun: { color: "#ffb478", strength: 1.25 }, sky: { color: "#6a72b8", strength: 0.45 } }
const people = (c, K) => {
  const t = c.t, p = SPELL(t), view = CAM.view(K), pose = SPELL.frame(t, [["charge", 0, 12, 100]], { before: -1, after: -1 })
  const hero = pose >= 0 ? { name: "tr_cast_e", at: HERO, frame: pose } : { name: "tr_idle_e", at: HERO }
  const S = [...WOOD, hero]
  const hand = pose >= 0 ? c.meshSocket(view, hero, "hand", K) : null, from = c.meshSocket(view, { name: "tr_cast_e", at: HERO, frame: 6 }, "hand", K)
  const to = [CROW[0], CROW[1], 1.05], fly = (tt) => SPELL.along(from, to, tt, { ease: "in" })
  if (pose >= 0 && pose <= 7) S.push({ name: "tr_cast_aura_e", at: [HERO[0], HERO[1] - 0.01], frame: pose, blend: "add", opacity: pose <= 5 ? 0.2 + 0.07 * pose : 0.6, light: false })
  if (p.name === "charge" && !p.before) S.push({ name: p.k < 0.35 ? "_fire_s" : p.k < 0.7 ? "_fire_m" : "_fire", at: hand, blend: "add", light: { r: 2, strength: 2 * p.k } })
  if (p.name === "cast") S.push({ name: "_fire", at: hand, blend: "add", light: { r: 2.5, strength: 3 } })
  if (p.name === "travel") {
    for (const [dt, n, o] of [[150, "_fire_s", 0.35], [100, "_fire_s", 0.6], [50, "_fire_m", 0.8]])
      if (t - dt >= SPELL.start("travel")) S.push({ name: n, at: fly(t - dt), blend: "add", opacity: o, light: false })
    S.push({ name: "_fire", at: fly(t), blend: "add", light: { r: 2.5, strength: 3 } })
  }
  // the scarecrow: catching fire where it was hit, burning away, then back, the neutral way
  const burn = t < SPELL.start("reform") ? SPELL.span(t, "impact", ["impact", 2400]) : 1 - SPELL.span(t, "reform")
  const look = t >= SPELL.start("reform") ? { look: "neutral" } : { look: "burn", pattern: "out", at: [14, 30], ragged: 0.5, scale: 4 }
  S.push({ name: "_scarecrow", at: CROW, ...(burn > 0 ? { fx: ["dissolve", { ...look, progress: burn, seed: 3, ...(t < SPELL.start("reform") ? { flames: { height: 10, density: 0.35 } } : {}) }], light: { r: 3, strength: 2.5 } } : {}) })
  // its smoke, from the fire taking to its last wisps
  const fire = SPELL.fade(t, ["impact", 150], "reform", { in: 0.15, out: 0.35 })
  if (fire > 0) S.push({ name: "_fire_smoke", at: [CROW[0] + 0.05, CROW[1] + 0.06, 0.9], blend: "alpha", opacity: fire * 0.85, shadow: 0 })
  if (p.name === "impact") S.push({ name: "_fire", at: to, blend: "add", fx: ["dissolve", { pattern: "out", progress: p.k, look: "magic", glow: 1 }], light: { r: 3.5, strength: 4 * (1 - p.k) + 1 } })
  if (t >= SPELL.start("impact") && t < SPELL.start("impact") + 1300) {
    S.push({ name: "_burst_smoke", at: [CROW[0], CROW[1] + 0.05], frame: SPELL.since(t, "impact", 50, 26), blend: "alpha" })
    for (const q of sparks(t)) S.push({ name: "_spark", at: [CROW[0] + q.x, CROW[1] - 0.05, 1.05 - q.y], blend: "add", light: false })
  }
  return S
}
const CLOCK = { frames: 100, fps: 20 }
scene("clearing", { w: W, h: H, bg: "q", ...CLOCK, check: { every: 8 } }, (c) => c.mesh(CAM.view(1), M.faces, MATS, { sprites: people(c, 1), ...DUSK }))
// three times as big, through the camera: the actors' band of depth sharp, the wood behind soft, Three's
// bloom on the fire, the dusk grade, a light grain in blocks of the art's pixel (the same in every frame:
// a grain that changes each frame changes every pixel, and the GIF went from 1.1 MB to 13); the wall in blocks
const K = 3
scene("clearing_md", { w: W * K, h: H * K, bg: "q", ...CLOCK, check: false },
  (c) => c.mesh(CAM.view(K), M.faces, { ...MATS, grass: { tex: "_grass", texel: CAM.floor.map((v) => v / K) }, path: { tex: "_flags", texel: CAM.floor.map((v) => v / K) }, wall: { tex: "_wall", block: K } }, { sprites: people(c, K), pixel: K, ...DUSK }),
  post({ blur: 6 * K, focus: [(W * K) / 2, H * K * 0.55], sharp: 3, soft: [3, 8], bloom: { levels: 5, strength: 0.5, above: 0.9 }, lut: { cube: "dusk.cube", amount: 0.6 }, grain: { amount: 0.035, animated: false }, pixel: K, vignette: 0.3 }))
