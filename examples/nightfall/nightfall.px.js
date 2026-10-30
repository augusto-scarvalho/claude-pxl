// Nightfall: the platformer16 demo (lib/profiles/platformer16.px.js), every piece from lib/. One level 1384 x 240
// (86.5 x 15 tiles) seen through a 320 x 176 camera that follows the hero: obstacles by day (a slope, a ladder to
// the planks, a crate, a spike pit, a pool), a village at dusk (barrels, a hay cart, the inn), a castle at night (a
// tower, a spike pit under a gargoyle, the gate), and inside its walls the keep's door, where the level ends. The
// hero runs, speeds up into a sprint on the flats (the run to 55 px/s, then the sprint to 110: each drawing's time
// 1000 x its px / the speed, so the soles stay planted), dashes (its ghosts and dust), jumps by the genre's physics
// (a 48 px rise at 600 px/s²: route({ px: "side" })), climbs, lands on the props' walkable tops (their sockets) and
// at the keep walks to the door, turns his back and the dark takes him; the camera rises to the moon and the loop
// closes through black. The light changes by where the camera is: each layer drawn in its kit's day colors, its
// swap the kit's DUSK and NIGHT mixed by the camera's x (the town behind, drawn at dusk, by its day and night maps;
// the castle far off, drawn at night, by its dusk); only the skies come in by an ordered dither off the same x. The
// planes behind are places along their own x: the town comes in from the right as he nears the cliff and the castle
// far off as he leaves the village, and the hills fall before the town to lie low at night. The gate is a door:
// a pass through black, the courtyard drawn on the same stretch after it. Beetles patrol, bats fly round the
// castle, the coins go as he touches them, the windows and lanterns light up as it gets dark.
// The world with the camera's box each second: pxl shot nightfall.px.js nightfall --world --every 20.
include("../../lib/characters/hero_side.px.js", { as: "hs" })
include("../../lib/characters/bat.px.js", { as: "bat" })
include("../../lib/characters/beetle.px.js", { as: "beetle" })
include("../../lib/nature/side.px.js", { as: "side" })
include("../../lib/architecture/side.px.js", { as: "built" })
include("../../lib/props/side.px.js", { as: "props" })
include("../../lib/architecture/side_village.px.js", { as: "village" })
include("../../lib/props/side_village.px.js", { as: "vprops" })
include("../../lib/architecture/side_castle.px.js", { as: "castle" })
include("../../lib/vfx/dust.px.js", { as: "dust" })
include("../../lib/ui/hearts.px.js", { as: "hearts" })
pal({ k: "#14121c" })
const T = 16, W = 1384, H = 240, VIEW = [320, 176], FPS = 20

// ---------------------------------------------------------------- the ground
// A tile a column, [from, to, its top row, "/" a slope up, or the room it is in]: the gaps between are the day's spike
// pit, the pool and, outside the walls ("out"), the castle's spike pit; inside ("in", after the gate's door) the
// courtyard's floor is whole. Rows of 16 px: 10 is y 160 (the day's ground), 13 the street (208), 14 the castle's (224).
const COLS = [[0, 2, 12], [2, 4, 11, "/"], [4, 8, 11], [10, 13, 10], [16, 23, 10], [23, 60, 13], [60, 68, 14], [68, 70, 14, "in"], [70, 87, 14]]
const colAt = (i, room) => COLS.find(([a, b, , r]) => i >= a && i < b && (r === undefined || r === "/" || r === room))
const MAP = (room) => Array.from({ length: 15 }, (_, j) => Array.from({ length: 87 }, (_, i) => {
  const c = colAt(i, room)
  return !c || j < c[2] ? "." : j === c[2] && c[3] === "/" ? "/" : "#"
}).join("")).join("\n")
// What he stands on, as the stamp's y (the row under his soles): the grass's top + 1 (his soles in its tips, as the
// stills stand him), up the slope 1 px every 2 (the kit's slope tiles); the castle's stone steps and terrace on their
// top rows, from their sockets; the props' tops from theirs (below)
const STREET_STEP = [960, 13 * T], COURT_STEP = [1214, 13 * T], TERRACE = 1230
const SD = sockets("castle.steps_down"), SU = sockets("castle.steps_up")
const step = ([x0, y0], S, x) => y0 + (x < x0 + (S.top_r[0] - S.top_l[0]) / 2 ? S.top_l : S.top_r)[1]
const ground = (room) => (x) => {
  if (x >= 32 && x < 64) return 193 - Math.floor((x - 31) / 2)
  if (x >= STREET_STEP[0] && x < STREET_STEP[0] + T) return step(STREET_STEP, SD, x)
  if (room === "in" && x >= COURT_STEP[0] && x < TERRACE) return step(COURT_STEP, SU, x)
  if (room === "in" && x >= TERRACE) return COURT_STEP[1]
  const c = colAt(Math.floor(x / T), room)
  return c ? c[2] * T + 1 : H
}

// ---------------------------------------------------------------- what stands
const G = 13 * T + 1, G2 = 14 * T + 1          // the street's and the castle's foot: a pixel into the grass, as the stills
const BARREL = [472, G], STACK = [506, G], CART = [557, G], BARREL2 = [880, G], CRATE = [121, 11 * T + 1]
const on = (at, S) => [at[0] + S[0], at[1] + S[1]]   // a socket where the prop stands
const B1 = on(BARREL, sockets("vprops.barrel").top), B2 = on(STACK, sockets("vprops.barrel_stack").top)
const HAY = sockets("vprops.hay_cart"), HAY_L = on(CART, HAY.top_l), HAY_R = on(CART, HAY.top_r)
const TOWER = 1040, GATE = 1184, KEEP = [1304, COURT_STEP[1] - 8]   // the keep's pivot is its footprint's middle: its front 8 px lower

// ---------------------------------------------------------------- the hero's way
// platformer16's jump at 20 fps: a 48 px rise at 600 px/s² (1.5 px a frame²). His speeds in px a frame: the run 55
// px/s, the sprint up to 110, the dash 120, the walk 17.5 (its 8 drawings at 100 ms); a run's drawing is 2.75 px of the
// way, a sprint's 5.5 (their soles' travel), so each drawing lasts 1000 x its px / the speed and the soles stay planted
const RISE = 48, GRAV = 600 / FPS ** 2, RUN = 2.75, SPRINT = 5.5, DASH = 6, WALK = 0.875
const STRIDE = { run: 2.75, sprint: 5.5 }
// a drawing at t frames into a move whose drawings last ms each (50 ms a frame), looping from `from`
const timed = (ms, from = 0) => { const at = ms.flatMap((m, i) => Array(Math.max(1, Math.round(m / 50))).fill(i)), n = at.length - at.indexOf(from)
  return (t) => at[t < at.length ? t : at.length - n + ((t - at.length) % n)] }
const IDLE = timed([400, 200, 400, 200]), WALKF = timed(Array(8).fill(100))
const look = (anim, frame) => ({ anim: `hs.${anim}`, flip: true, frame: (f, t) => frame(t) })
const AIR = { jump: look("jump", timed([50, 50, 100, 100], 2)), apex: look("apex", timed([100, 100])), fall: look("fall", timed([100, 100, 100], 1)), land: look("land", timed([50, 50, 50])) }
// The legs, written as they go: x where he is, the run's drawing carried from leg to leg (ph)
let X = 24, ph = 0
const LEGS = [[X, 193], { hold: 6, name: "start", anim: look("idle", IDLE) }]
// along the ground at v px a frame (or straight to [x, y]: the planks, the hay), its drawing by the way gone
const go = (x, v = RUN, y, anim = v > RUN ? "sprint" : "run") => {
  const n = Math.max(1, Math.ceil(Math.abs(x - X) / v)), k = Math.abs(x - X) / n / STRIDE[anim], p0 = ph
  LEGS.push({ to: y === undefined ? x : [x, y], pace: v, anim: look(anim, (t) => (((Math.floor(p0 + (t + 1) * k)) % 8) + 8) % 8) })
  ph += n * k; X = x
}
// picking up speed on a flat: from v0 to v1 evenly over the way to x, a leg a frame, the run's drawings past v0 the
// sprint's once it is past the run's 55 px/s
const speedUp = (x, v0, v1) => {
  const N = Math.round((2 * (x - X)) / (v0 + v1)), vs = Array.from({ length: N }, (_, i) => v0 + ((v1 - v0) * (i + 0.5)) / N), s = (x - X) / vs.reduce((a, b) => a + b)
  for (const v of vs) go(X + v * s, 99, undefined, v * s > RUN ? "sprint" : "run")
}
// a dash: the push-off, the launch, the held pose (its two drawings, 100 ms each) until the brake and the rise
const dashAt = (n) => (t) => (t < 2 ? t : t >= n - 2 ? 4 + t - (n - 2) : 2 + (((t - 2) >> 1) & 1))
const dash = (x) => { const n = Math.ceil((x - X) / DASH); LEGS.push({ to: x, pace: DASH, anim: look("dash", dashAt(n)) }); X = x; ph = 0 }
const jump = (to, name) => { LEGS.push({ jump: to, name }); X = to[0]; ph = -3 }
const drop = (to) => { LEGS.push({ drop: to }); X = to[0]; ph = -3 }
// a landing he jumps on from: the land's last two drawings held, so his soles rest on it a moment (3 frames, as when
// he runs on) before the next jump
const settle = () => LEGS.push({ hold: 2, anim: look("land", (t) => 1 + t) })

speedUp(40, 1, RUN); go(88)                                               // from a stand, picking up speed: up the slope
LEGS.push({ climb: [88, 128], pace: 2.05, name: "ladder", anim: look("climb", (t) => (1 + (t >> 1)) % 4) })
go(108, RUN, 128)                                                         // along the planks
drop([124, CRATE[1] - T]); settle()                                       // onto the crate (a tile tall)
jump([168, 161], "pit")                                                   // over the spike pit, through coins
go(186); dash(198); jump([294, 161], "pool")                              // a dash jump over the pool and the beetle
go(306); speedUp(356, RUN, SPRINT); go(367, SPRINT)                       // picking up speed to the cliff
drop([412, G])                                                            // off it, far into the village (dusk)
go(434); jump(B1); settle(); jump(B2); settle(); jump(HAY_L)              // a barrel, the stack, the hay cart
go(HAY_R[0], RUN, HAY_R[1]); jump([619, G])                               // along the hay and down by the well
go(690); dash(810); go(846); jump([894, G])                               // under the inn's sign, over a barrel
dash(958); go(990)                                                        // out of the village, down the step (night)
dash(1050); go(1080); jump([1126, G2], "pit2")                            // under the tower, over the pit
go(1136); speedUp(1170, RUN, SPRINT); go(GATE, SPRINT); LEGS.at(-1).name = "gate"   // into the gate's passage: a door
ph = 0; go(1290)                                                          // across the courtyard, up its steps
LEGS.push({ to: 1304, pace: WALK, anim: look("walk", WALKF) }, { hold: 2, anim: look("idle", IDLE) })   // to the keep's door
const ROUTE = route({ px: "side", pace: RUN, ground: (x) => ground(x < GATE ? "out" : "in")(x), gravity: GRAV, rise: RISE, air: AIR }, LEGS)
const END = ROUTE.total, LADDER = ROUTE.step("ladder"), GATE_F = ROUTE.step("gate").start + ROUTE.step("gate").n - 1
// the hero at frame f: the route's, on the ladder his soles on its rungs (4 px a drawing, 2 frames each: a rung's top
// under them on drawings 0 and 2, 4 px over on 1 and 3)
const PATH = Array.from({ length: END }, (_, f) => {
  const r = ROUTE(f), t = f - LADDER.start
  if (t >= 0 && t < LADDER.n) r.at = [r.at[0], Math.max(128, 175 - 4 * (t >> 1))]
  return r
})
const heroAt = (f) => PATH[Math.min(f, END - 1)]
// The end, at the keep's door (the door's 4 drawings at 100 ms): he stands, the door opens, he turns his back (enter),
// steps into the dark (his colors a step darker, then the dark's, then gone) and the door closes; the camera eases up
// the keep to its spire and the moon, and the picture fades to black, opening on the day again
const DOOR = [0, 0, 0, 1, 2, 3, 3, 3, 3, 3, 3, 3, 2, 1, 0, 0, 0, 0].flatMap((d) => [d, d])
const GOES = ["idle", "idle", "idle", "idle", "idle", "idle", "enter", "enter", "dim", "dark"].flatMap((m) => [m, m])
const DIM = { "#1a1620": "#0a0810", "#a8644f": "#4a2c28", "#de9f76": "#6a4838", "#f6cfa5": "#7a5a48", "#4e2519": "#24120e", "#7f3f25": "#3a1c14", "#b5653a": "#52301e", "#d68b52": "#624028",
  "#31508e": "#162440", "#4c7fd0": "#22385e", "#7db4ec": "#38506c", "#3e3852": "#1c1a26", "#5f5878": "#2a2836", "#f2c64e": "#6a5826", "#eef5fb": "#6a6e74" }
const UP = END + DOOR.length - 6, FADE = 10, FRAMES = UP + 30 + FADE
const doorAt = (f) => DOOR[f - END] ?? 0
// the camera follows his feet (its platform snap waits while he is off the ground); at the end its target eases 150 px
// up the keep (on the ground's rule, so the picture rises to the world's top)
const camFollow = (f) => { const r = heroAt(f), t = Math.min(1, Math.max(0, (f - UP) / 20)); return f < UP ? r : [r.at[0], Math.round(r.at[1] - 150 * t * t * (3 - 2 * t)), true] }
const room = (f) => (f < GATE_F ? "out" : "in")
const GROUNDS = { out: side.ground(MAP("out")), in: side.ground(MAP("in")) }
// black over the first and last frames (the loop's close) and round the gate's door (the room changes in the black)
const fadeAt = (f) => Math.max(0, 1 - f / FADE, (f - (FRAMES - FADE)) / FADE, 1 - Math.abs(f - GATE_F) / 7)

// ---------------------------------------------------------------- the light: day, dusk, night by the camera's x
// Day to dusk over [300, 460] of the camera's middle, dusk to night over [870, 1020], eased: each layer's swap its
// kit's maps, mixed by an ordered dither (if he stood still, the light would hold)
const ZONES = [[300, 460], [870, 1020]]
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
const lightOf = (c) => { const x = c.camera[0] + VIEW[0] / 2; return { dusk: smooth(...ZONES[0], x), night: smooth(...ZONES[1], x) } }
const mix = (c) => { const L = lightOf(c); return L.night > 0 ? 1 + L.night : L.dusk }
const times = (dusk, night, day = {}) => ({ swap: [day, dusk, night], mix })
// each kit's own maps; the lamp's glass dark by day (props.UNLIT), lit as it gets dark; the town behind drawn at dusk
// (its day and night village.TOWN_DAY and TOWN_NIGHT), the castle far off at night (its dusk castle.FAR_DUSK)
const SIDE = times(side.DUSK, side.NIGHT), VILL = times(village.DUSK, village.NIGHT), VPROPS = times(vprops.DUSK, vprops.NIGHT)
const CASTLE = times(castle.DUSK, castle.NIGHT), BUILT = times(built.DUSK, built.NIGHT), PROPS = times(props.DUSK, props.NIGHT, props.UNLIT)
const TOWN = times({}, village.TOWN_NIGHT, village.TOWN_DAY), FAR = times(castle.FAR_DUSK, {}, castle.FAR_DUSK)
// a strip that wraps (w x h), its x0 at x0, laid across what its layer shows, or over [a, b) of it
const strip = (c, name, y, [w, h], x0 = 0, a = -Infinity, b = Infinity) => {
  const [vx, vy, vw, vh] = c.view, l = Math.max(a, vx), r = Math.min(b, vx + vw + 1), x = x0 + Math.floor((l - x0) / w) * w
  if (r > l) c.clip([l, vy, r - l, vh], () => c.pattern(name, x, y, r - x, h))
}
// The planes behind as places, each along its own x (a layer x L is on the picture from the camera's x (L - 320) / its
// parallax to L / its parallax), so what comes in comes in from the picture's edge; the light only turns their colors.
// The far plane (0.3): open sky, then the far town (town_far's [92, 203), from a house's side to a house's side, its
// church: 372-483, in at the camera's x 173, as he nears the cliff), and behind its last house the castle far off
// (castle_far from 463, its crag's foot hidden there: its castle in at the camera's x 677, toward the castle), the
// town's mass down to the world's foot. The near plane (0.5): the hills all along, falling 38 px over [330, 440] to
// the night's height (110 to 148); in front of them the town's nearer houses (town_near's [64, 199), four houses: 420-555,
// in at the camera's x 200), the hills falling before the first and lying low behind the last.
const FAR_TOWN = [372, 483], CASTLE_FAR = 463, NEAR_TOWN = [420, 555], FALL = [330, 440]
const hillsY = (x) => 110 + Math.round(38 * smooth(...FALL, x))
// what a swap can't bring (the skies): kept on the pixels whose ordered-dither threshold is in [a, b), so the next
// one comes in where the last one goes
const keep = (c, a, b) => { const [x, y, w, h] = c.view; if (a > 0) c.dither(x, y, w, h, ".", "_", a); if (b < 1) c.dither(x, y, w, h, "_", ".", b) }
const sky = (name, a, b, more) => layer(name, { parallax: [0.1, 1] }, (c) => {
  const L = lightOf(c), lo = a(L), hi = b(L)
  if (hi > lo) { strip(c, `side.${name}`, 0, [160, H]); more?.(c); keep(c, lo, hi) }
})

// ---------------------------------------------------------------- life
// beetles patrolling by day (the walk's 4 at 120 ms, 10 px/s), bats round the castle, coins on the planks and along
// the two jumps' arcs, each gone once he touches it
const patrol = (x0, x1, v, phase) => (f) => { const L = x1 - x0, d = (f * v + phase) % (2 * L); return d < L ? [x0 + d, 1] : [x1 - (d - L), -1] }
const BEETLES = [[patrol(66, 112, 0.5, 29), 177], [patrol(256, 352, 0.5, 132), 161]]
const BATS = [[1010, 120, 40, 18, 0], [1090, 96, 56, 14, 1.7], [1180, 140, 36, 22, 3.1], [1260, 110, 48, 16, 0.9]]
const batAt = ([x0, y0, ax, ay, ph], f) => [Math.round(x0 + ax * Math.sin((f / 40) * 2 * Math.PI + ph)), Math.round(y0 + ay * Math.sin((f / 20) * 2 * Math.PI + ph))]
const onArc = (name, shares) => { const j = ROUTE.step(name); return shares.map((s) => { const [x, y] = heroAt(j.start + Math.round(s * j.n)).at; return [x, y - 12] }) }
const COINS = [[82, 127], [102, 127], ...onArc("pit", [0.3, 0.5, 0.7]), ...onArc("pool", [0.35, 0.5, 0.65])]
const GONE = COINS.map(([cx, cy]) => { const i = PATH.findIndex(({ at: [x, y] }) => Math.abs(x - cx) < 15 && y - 30 < cy && y > cy - 16); return i < 0 ? Infinity : i })
// The dust: a puff where a dash's frame puts one (the back heel at the launch and at each held loop, kicked ahead at
// the brake), a landing's where he touches down (and at the start: he has just landed); each plays out where it fell
const once = (ms) => (t) => { let e = t * 50; for (let i = 0; i < ms.length; i++) if ((e -= ms[i]) < 0) return i; return -1 }
const PUFFS = [[0, "dust.dust_land", 24, 193, once([60, 70, 90, 110])]]
PATH.forEach((r, f) => {
  const was = PATH[f - 1]
  if (r.name === "hs.land" && r.frame === 0) PUFFS.push([f, "dust.dust_land", r.at[0], r.at[1], once([60, 70, 90, 110])])
  if (r.name === "hs.dash" && [1, 2, 4].includes(r.frame) && !(was?.name === r.name && was.frame === r.frame))
    PUFFS.push([f, "hs.dash_dust", r.at[0] + (r.frame === 4 ? 8 : -8), r.at[1], once([70, 90, 110]), r.frame === 4])
})
const ghost = (k) => (c) => { const r = c.frame < END && heroAt(c.frame); if (r?.name === "hs.dash" && (r.frame === 2 || r.frame === 3)) c.stamp("hs.dash_ghost", r.at[0] - k, r.at[1]) }

// ---------------------------------------------------------------- the scene
// Back to front: the sky as the air, the clouds, the far plane, the near one, the keep behind the walls, then the
// playfield (what stands behind the ground's lip, its feet in the grass; the ground; what is built on it), the life,
// the hero, the hearts, the fade. Each plane's y the still's plus 64 x its parallax (the camera rests at the world's foot)
scene("nightfall", { w: VIEW[0], h: VIEW[1], bg: "k", frames: FRAMES, fps: FPS, camera: { world: [W, H], follow: camFollow, rest: [0.5, 0.62] } },
  sky("sky_day", (L) => L.dusk, () => 1), sky("sky_dusk", (L) => L.night, (L) => L.dusk), sky("sky_night", () => 0, (L) => L.night, (c) => c.stamp("side.moon", 130, 70)),
  layer("clouds", { parallax: 0.2, ...SIDE }, (c) => { strip(c, "side.clouds_far", 16, [160, 16]); strip(c, "side.clouds", 23, [192, 40], -20) }),
  // the far plane: the castle far off, the far town before it; the near one: the hills (by runs of columns at one
  // height, each its flat band under it), the nearer houses before them
  layer("castle_far", { parallax: 0.3, ...FAR }, (c) => strip(c, "castle.castle_far", 55, [256, 128], CASTLE_FAR, CASTLE_FAR)),
  layer("town_far", { parallax: 0.3, ...TOWN }, (c) => { strip(c, "village.town_far", 59, [256, 96], FAR_TOWN[0] - 92, ...FAR_TOWN); c.rect(FAR_TOWN[0], 155, FAR_TOWN[1] - FAR_TOWN[0], H, "#2c2044") }),
  layer("hills", { parallax: 0.5, ...SIDE }, (c) => {
    const [vx, , vw] = c.view
    for (let a = vx, b; a <= vx + vw; a = b) {
      const y = hillsY(a); for (b = a + 1; b <= vx + vw && hillsY(b) === y; b++);
      strip(c, "side.hills", y, [160, 48], -40, a, b); c.rect(a, y + 48, b - a, H, "#6aa898")
    }
  }),
  layer("town_near", { parallax: 0.5, ...TOWN }, (c) => strip(c, "village.town_near", 84, [256, 96], NEAR_TOWN[0] - 64, ...NEAR_TOWN)),
  layer("keep_behind", { parallax: 0.75, ...times(castle.DUSK, castle.NIGHT_BEHIND) }, (c) => { if (room(c.frame) === "out") c.stamp("castle.keep_behind", 894, 208) }),
  // the gargoyles on the walks, behind the parapets' breasts (65 and 76 px over the wall's and the gate's foot)
  layer("gargoyles", CASTLE, (c) => { if (room(c.frame) === "out") { c.stamp("castle.gargoyle_side", 1104, G2 - 65); c.stamp("castle.gargoyle_front", GATE + 8, G2 - 76) } }),
  // the castle from outside; past the gate's door the courtyard: the curtain and the gate from inside, the keep
  layer("castle", CASTLE, (c) => {
    if (room(c.frame) === "out") {
      for (const x of [976, 1104, 1136, 1248, 1280, 1312, 1344, 1376]) c.stamp("castle.curtain", x, G2)
      c.stamp("castle.tower", TOWER, G2); c.stamp("castle.gate", GATE, G2)
      for (const x of [GATE - 24, GATE + 24]) c.stamp("castle.banner", x, G2 - 74)
    } else {
      for (const x of [976, 1008, 1040]) c.stamp("castle.curtain_in", x, G2)
      c.stamp("castle.stairs_in", 1096, G2); c.stamp("castle.gate_in", GATE, G2)
      c.stamp("castle.keep", ...KEEP, { id: "keep" }); c.stamp("castle.keep_door", 0, 0, { at: "keep.door", frame: doorAt(c.frame) })
    }
  }),
  layer("village", VILL, ...[388, 420, 452].map((x) => stamp("village.wall_village", x, G)), stamp("village.house_c", 446, G), stamp("village.house_a", 720, G), stamp("village.house_b", 860, G)),
  layer("vprops", VPROPS, stamp("vprops.well", 640, G), stamp("vprops.sign", 758, G - 41), stamp("vprops.lantern_post", 768, G), stamp("vprops.lantern_post", 932, G),
    stamp("vprops.barrel", ...BARREL), stamp("vprops.barrel_stack", ...STACK), stamp("vprops.hay_cart", ...CART), stamp("vprops.barrel", ...BARREL2)),
  layer("nature", SIDE, stamp("side.bush_small", 9, 193), stamp("side.bush", 70, 177), stamp("side.pine", 182, 161), stamp("side.bush_small", 204, 161, { flip: "x" }), stamp("side.oak", 330, 161)),
  layer("props", PROPS, stamp("props.crate", ...CRATE), stamp("props.lamp", 266, 161)),
  // the pool between the banks (their faces in front of it), its surface 4 px under them, deep to the bottom
  layer("water", SIDE, ...[12, 13, 14, 15, 16].flatMap((i) => [(c) => c.stamp("side.water_top", i * T, 164, { frame: Math.floor((c.frame * 50) / 150) % 4 }), ...[180, 196, 212, 228].map((y, j) => (c) => c.stamp(j ? "side.water_deep" : "side.water", i * T, y, { frame: Math.floor((c.frame * 50) / 150) % 4 }))])),
  layer("ground", SIDE, (c) => GROUNDS[room(c.frame)](c)),
  layer("built", BUILT, stamp("built.plat_l", 64, 128), stamp("built.plat", 80, 128), stamp("built.plat_r", 96, 128), ...[128, 144, 160].map((y) => stamp("built.ladder", 80, y)),
    pattern("built.spikes", 128, 224, 2 * T, T), (c) => { if (room(c.frame) === "out") c.pattern("built.spikes", 1088, 224, 2 * T, T) }),
  layer("steps", CASTLE, stamp("castle.steps_down", ...STREET_STEP), (c) => { if (room(c.frame) === "in") { c.stamp("castle.steps_up", ...COURT_STEP); for (let x = TERRACE; x < W; x += T) c.stamp("castle.terrace", x, COURT_STEP[1]) } }),
  layer("coins", (c) => COINS.forEach(([x, y], i) => { if (c.frame < GONE[i]) c.stamp("props.coin", x, y, { frame: (Math.floor((c.frame * 50) / 80) + i) % 6 }) })),
  layer("life", (c) => {
    for (const [walk, y] of BEETLES) { const [x, dir] = walk(c.frame); c.stamp("beetle.beetle_walk", Math.round(x), y, { frame: Math.floor((c.frame * 50) / 120) % 4, ...(dir < 0 ? { flip: "x" } : {}) }) }
    BATS.forEach((b, i) => c.stamp("bat.bat_fly", ...batAt(b, c.frame), { frame: (Math.floor((c.frame * 50) / 90) + i) % 4 }))
  }),
  layer("dust", (c) => { for (const [f0, name, x, y, at, flip] of PUFFS) { const i = at(c.frame - f0); if (c.frame >= f0 && i >= 0) c.stamp(name, x, y, { frame: i, ...(flip ? { flip: "x" } : {}) }) } }),
  layer("ghost_far", { density: 0.25 }, ghost(20)), layer("ghost_near", { density: 0.5 }, ghost(10)),
  layer("hero", (c) => {
    const f = c.frame
    if (f < END) { const r = heroAt(f); c.stamp(r.name, ...r.at, { frame: r.frame, ...(r.flip ? { flip: r.flip } : {}) }); return }
    const m = GOES[f - END], [x, y] = heroAt(f).at
    if (m) c.stamp(m === "idle" ? "hs.idle" : "hs.enter", x, y, m === "dim" ? { swap: DIM } : m === "dark" ? { silhouette: "#1a1a26" } : { frame: m === "idle" ? IDLE(f - END) : 0 })
  }),
  layer("hud", { parallax: 0 }, stamp("hearts.heart", 6, 6), stamp("hearts.heart", 16, 6), stamp("hearts.heart_empty", 26, 6)),
  layer("fade", { parallax: 0 }, (c) => { const k = fadeAt(c.frame); if (k > 0) c.dither(0, 0, VIEW[0], VIEW[1], ".", "k", Math.min(1, k)) }))
