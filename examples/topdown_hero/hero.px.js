// The top-down hero of lib/characters/hero.px.js (idle, walk, run and a sword attack in three
// directions), to look at.
include("../../lib/characters/hero.px.js", { palette: true })

// ---------------------------------------------------------------- test_hero
// The hero on the grass he'll walk on, a short loop: a walk to the right, a swing, the walk back
// flipped (the fourth direction, as the game shows it), a swing to the left. The ground stays quiet
// (tones close in value); the hero carries the contrast. The scene picks his frames by its own
// clock, a 2.48 s loop in 10 ms steps (frames: 248, fps: 100: the walk's 210 and the swing's 50 fall
// on them); stamping his anims as they are would loop the scene over their least common multiple.
sprite("_tuft", "M.M\noMo")
// [the move, ms into it (stamp's t: its own frames' durations), x, flipped]
const heroAt = (t) => t < 840 ? ["walk_side", t, 36 + Math.floor(t / 70), false]
  : t < 1240 ? ["attack_side", t - 840, 48, false]
  : t < 2080 ? ["walk_side", t - 1240, 48 - Math.floor((t - 1240) / 70), true]
  : ["attack_side", t - 2080, 36, true]
scene("test_hero", { w: 96, h: 64, bg: "m", frames: 248, fps: 100, world: { light: [0, -1] } },
  scatter("_tuft", 0, 0, 96, 64, 22, { even: true }),
  layer("shadow", { shade: 1 }, (c) => c.ellipse(heroAt(c.t)[2], 46, 5, 1, "k")),
  layer("hero", (c) => {
    const [name, t, x, flip] = heroAt(c.t)
    c.stamp(name, x, 46, flip ? { t, flip: "x" } : { t })
  }))
