// A camera that follows: a level four screens long seen through a 320x176 window. The scene's `camera`
// makes the picture a window onto a world of its own size; things are drawn and stamped where they are in
// the world, and each frame the window moves to follow the hero: a box running a route() that jumps up the
// steps, drops off a ledge and climbs high at the end. The camera keeps him in a box round the rest point,
// looks ahead the way he runs, moves up or down only when he lands on another height (not while he jumps),
// stops at the world's edges, and eases with a speed limit. Behind, two backdrop planes move a fifth and half
// as much as the world (layers' `parallax`). The sky is the air's own layer, not the screen's: a gradient as
// tall as the world, darker the higher, moving with the world's height (so climbing goes up into its darker
// part, as a game's sky does) and a tenth as fast across (so its dither goes by with the land, not standing
// on the glass). The hearts stay on the screen (parallax 0). The loop closes by a fade to black at the end of
// the level and in from black at its start (scenes §9).
use("pico8")
pal({
  k: 0, s: 1, S: 12, n: 6,      // ink, sky (top, horizon), mist
  f: 13, F: 5,                  // far mountains, their shade
  h: 3, H: 11,                  // near hills, their tops
  g: 11, G: 3, d: 4, D: 5,      // grass lip, its shade, earth, deep earth
  r: 8, R: 2, w: 7, y: 10,      // the hero, his shade, his eye; the end flag
})

const W = 320, H = 176, WORLD = [1280, 320], FPS = 20
// the walkable tops, [x0, x1, y]: steps up, a drop, steps up and a climb to the end
const FLOORS = [[0, 300, 280], [300, 460, 256], [460, 700, 232], [700, 900, 280], [900, 1050, 248], [1050, 1140, 216], [1140, 1210, 176], [1210, 1280, 136]]
const GROUND = FLOORS.flatMap(([x0, x1, y]) => [x0, y, x1 - 1, y])
// the hero's way at 5 px a frame (100 px a second): along each floor, each change of height a leg of its own
// (named j1..j7), up the steps by a jump, off the ledge by a drop
const run = route({ px: true, pace: 5, walk: { anim: "hero", flip: true } }, [
  [24, 280], [262, 280], { to: [326, 256], name: "j1" }, [424, 256], { to: [488, 232], name: "j2" }, [690, 232],
  { to: [740, 280], name: "j3" }, [868, 280], { to: [924, 248], name: "j4" }, [1012, 248], { to: [1072, 216], name: "j5" },
  [1112, 216], { to: [1160, 176], name: "j6" }, [1184, 176], { to: [1230, 136], name: "j7" }, [1250, 136]])
// a jump's rise over the leg's straight line, px, sampled by how far through the leg he is (at most 20): up a step of
// 24 px he stays in the camera's window (64 px tall) and the picture holds still in y until he lands; up the 32 px
// ones his top leaves it, and the picture rises a few px there (as Sonic's does in the air)
const ARC = [0, 6, 11, 15, 18, 19, 20, 19, 18, 15, 11, 6, 0]
const JUMPS = ["j1", "j2", "j3", "j4", "j5", "j6", "j7"].map((n) => run.step(n))
const END = run.total, FADE = 12, FRAMES = END + 2 * FADE
// the hero's feet at frame f, and whether he stands on something; held at the end while the picture fades
const hero = (f) => {
  const r = run(Math.min(f, END - 1)), j = JUMPS.find((s) => f >= s.start && f < s.start + s.n)
  if (!j) return [r.at[0], r.at[1], true]
  const k = (f - j.start) / j.n
  return [r.at[0], r.at[1] - ARC[Math.round(k * (ARC.length - 1))], false]
}

sprite("hero", { w: 10, h: 16, pivot: "bottom", facing: "right" }, rect(0, 0, 10, 16, "k"), rect(1, 1, 8, 14, "r"), rect(1, 10, 8, 5, "R"), px(7, 3, "w"))
sprite("flag", { w: 12, h: 24, pivot: [1, 24] }, vline(0, 0, 24, "k"), rect(1, 1, 10, 7, "y"))
// the backdrops, strips that wrap: far mountains and near hills, each tall enough to reach the picture's foot
sprite("_far", { w: 320, h: 120, wrap: "x" }, (c) => {
  for (const [x, top, half] of [[40, 20, 70], [150, 0, 90], [260, 30, 60]]) c.poly([x - half, 70, x, top, x + half, 70], "f")
  c.rect(0, 70, 320, 50, "f")
  c.poly([150, 0, 170, 22, 130, 22], "F")
})
sprite("_near", { w: 256, h: 120, wrap: "x" }, (c) => {
  for (let x = 0; x < 256; x++) { const top = Math.round(30 + 10 * Math.sin((x / 256) * 2 * Math.PI * 2) + 6 * Math.sin((x / 256) * 2 * Math.PI * 5)); c.vline(x, top, 120 - top, "h"); c.px(x, top, "H") }
})
// the air, as tall as the world: darker the higher (its top what a climb reaches), a strip that wraps across
sprite("_sky", { w: W, h: WORLD[1], wrap: "x" }, grad(0, 0, W, WORLD[1], "ssSSn"))
sprite("heart", `
  .rr.rr.
  rrrrrrr
  rrrrrrr
  .rrrrr.
  ..rrr..
  ...r...`)

// The fade: black dithered in over the last frames and out over the first, the picture's own pixels left between
const fade = (f) => Math.max(0, 1 - f / FADE, (f - (FRAMES - FADE)) / FADE)
scene("camera", { w: W, h: H, bg: "S", frames: FRAMES, fps: FPS, world: { ground: GROUND },
  camera: { world: WORLD, follow: hero },
  expect: [{ onGround: ["hero"], frames: [0, JUMPS[0].start - 1] }] },
  layer("sky", { parallax: [0.1, 1] }, scroll("_sky", 0, 0)),
  layer("far", { parallax: 0.2 }, scroll("_far", 40, 0)),
  layer("near", { parallax: 0.5 }, scroll("_near", 90, 0)),
  layer("level", ...FLOORS.map(([x0, x1, y]) => (c) => { c.rect(x0, y, x1 - x0, WORLD[1] - y, "d"); c.rect(x0, y + 12, x1 - x0, WORLD[1] - y - 12, "D"); c.rect(x0, y, x1 - x0, 3, "g"); c.hline(x0, y + 3, x1 - x0, "G") }),
    stamp("flag", 1262, 136)),
  layer("hero", (c) => { const [x, y] = hero(c.frame); c.stamp("hero", x, y, { id: "hero" }) }),
  layer("hud", { parallax: 0 }, ...[0, 1, 2].map((i) => stamp("heart", 6 + 9 * i, 6)),
    // how far along the level he is
    rect(W - 66, 6, 60, 4, "k"), (c) => c.rect(W - 65, 7, Math.round((58 * hero(c.frame)[0]) / WORLD[0]), 2, "w")),
  layer("fade", { parallax: 0 }, (c) => { const k = fade(c.frame); if (k > 0) c.dither(0, 0, W, H, ".", "k", k) }))
