// The fighting package's demo: a round about to start on each of the library's three shrine stages
// (lib/stages/shrine.px.js), drawn as an engine draws a stage from its layout: each layer a sprite moving with the
// camera by its parallax (the floor by row, 0.75 at its back to 1 at the fighters' line; the spectator on it at her
// row's), what goes by on its own at its velocity, the anims on their own clocks. On each stage for 4 s (240 ticks):
// the camera panning from the stage's left end to its right end and back at a fighting game's pace (held 20 ticks at
// each end, eased across 400 px in 100), so the planes' parallax shows; the stage's loops playing (the lanterns'
// flames and a maple leaf falling at dusk; the clouds and the cherries' petals at noon; the snow, the flames and the
// mist at night); Reva and Haldor in their idles where a round starts (lib/characters/reva_fighter.px.js,
// haldor_fighter.px.js), each on the stage's shadow (its layout's: the floor two steps down its ramps under a flat
// ellipse as wide as their base); the miko watching from the back of the floor in the stage's palette slot
// (lib/characters/miko_spectator.px.js); the HUD (lib/ui/fight_hud.px.js), lacquer at dusk and at night, paper at
// noon. A scene a stage (round_dusk, round_noon, round_night) and shrine_round the three in turn (the gallery's).
include("../../lib/stages/shrine.px.js", { palette: true, as: "shrine" })
include("../../lib/characters/reva_fighter.px.js", { as: "reva_fighter" })
include("../../lib/characters/haldor_fighter.px.js", { as: "haldor_fighter" })
include("../../lib/characters/miko_spectator.px.js", { as: "miko_spectator" })
include("../../lib/ui/fight_hud.px.js", { as: "hud" })

const TICKS = 240, FPS = 15, FRAMES = TICKS / 4, [W, H] = genre("fighting").screen
// the camera's left edge (0 the stage's left end, 400 its right): held 5 drawings at each end, eased across in 25
const ease = (u) => 0.5 - 0.5 * Math.cos(Math.PI * u)
const pan = (f) => (f < 5 ? 0 : f < 30 ? Math.round(400 * ease((f - 5) / 25)) : f < 35 ? 400 : Math.round(400 - 400 * ease((f - 35) / 25)))
const ROUNDS = { round_dusk: ["shrine_dusk", "lacquer"], round_noon: ["shrine_noon", "paper"], round_night: ["shrine_night", "lacquer"] }
for (const [name, [st, hud]] of Object.entries(ROUNDS)) {
  const L = stage.LAYOUT[st], [p1, p2] = [L.players.p1[0] - L.camera.start, L.players.p2[0] - L.camera.start], R = L.shadow.rx
  scene(name, { w: W, h: H, frames: FRAMES, fps: FPS, camera: stage.camera(st, pan), check: { every: 4 } },
    ...stage.layers(st, {
      ticks: TICKS, spectator: { name: "miko_spectator.watch", swap: mikoSpectator.SLOTS },
      // the fighters stand where a round starts on the screen, the stage going by under them
      shadows: [[p1 + 2, L.floor + 1, R.character, 3], [p2 - 2, L.floor + 1, R.heavy, 3]],
      // (stamped at the scene's time: their 100 ms frames don't make its clock, which is the stage's 4-tick drawing)
      fighters: [layer("fighters", { parallax: 0 }, (c) => { c.stamp("reva_fighter.idle", p1, L.floor, { id: "reva", t: c.t }); c.stamp("haldor_fighter.idle", p2, L.floor, { flip: "x", id: "haldor", t: c.t }) })],
    }),
    layer("hud", { parallax: 0 }, stamp(`hud.hud_${hud}`, 0, 0)))
}
scene("shrine_round", { w: W, h: H, frames: 3 * FRAMES, fps: FPS, check: { every: 20 } }, (c) => c.stamp(Object.keys(ROUNDS)[Math.floor(c.frame / FRAMES)], 0, 0, { t: ((c.frame % FRAMES) * 1000) / FPS }))
