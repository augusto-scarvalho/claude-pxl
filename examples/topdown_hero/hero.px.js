// A top-down RPG hero: idle, walk, run and a sword attack facing down, up and to the side; the game
// flips the side view for the fourth direction. A chibi 24 px tall in a 16x32 frame (the head 10 of
// the 24 rows, 42%; final boss blues' base and SLYNYRD's top-down figures), the attacks in 32x40
// frames with the feet on the same pivot. Built as characters.md §10 says: a dummy in flat parts
// first (`_dummy_*`: the head yellow, the torso orange, the right limbs light and the left dark; in
// profile the right ones are the near ones), animated through every move (`_dummy_idle`, ...), then
// the costume painted over each dummy part (`base` + `swap`), so every move is written once
// (`figure`, `swing`) and drawn twice. Lit from straight above, a touch toward us, as a sprite the
// game flips must be: its mirror keeps the light where it was.
pal({
  k: "#1b1422",                                           // outline and eyes
  S: "#f6cfa5", s: "#de9f76", z: "#a8644f",               // skin
  Y: "#d88a47", h: "#a3542f", j: "#682f25",               // auburn hair
  c: "#7db4ec", b: "#4c7fd0", n: "#31508e",               // blue tunic
  p: "#665d82", P: "#453e5c",                             // trousers
  L: "#b07744", l: "#7a4a2c", d: "#4b2b22",               // leather: belt, boots
  g: "#f2c64e",                                           // gold: buckle, guard
  W: "#eef5fb", w: "#a6bad0",                             // steel, and the smears
  M: "#6aa04f", m: "#619749", o: "#578c43", O: "#43703a", // grass, close in value; its shade
  1: "#f2cd3a", 2: "#e7763a", 3: "#98e2ec", 4: "#2b6b91", 5: "#b9b9c6",   // the dummy
})
ramps("kzsS", "kjhY", "knbc", "kPp", "kdlL", "kg", "kwW", "OomM")

// ---------------------------------------------------------------- the dummy, in flat parts
// Body box 14x30 (16x32 with the outline). Guide rows, shared by the views: the top of the head 7,
// the shoulders 14 (seen from above they rise into the head's rows, above the chin), the chin 15,
// the crotch 22, the ankles 26, the soles 28. Row 29 stays clear for a foot stepping toward us.
const ROWS = { top: 7, shoulders: 14, chin: 15, crotch: 22, ankles: 26, soles: 28 }
sprite("_dummy_head_d", { mx: true }, `
  ...111
  .11111
  111111
  111111
  111111
  111111
  111111
  .11111
  ..1111`)
sprite("_dummy_head_u", { base: "_dummy_head_d" })     // the back starts as the front's silhouette
sprite("_dummy_head_s", `
  ..111111..
  .11111111.
  1111111111
  1111111111
  1111111111
  1111111111
  1111111111
  .111111111
  ..1111111.`)
sprite("_dummy_torso_d", { mx: true }, ".222\n2222\n2222\n2222\n2222\n2222\n2222\n2222\n.222")
sprite("_dummy_torso_u", { base: "_dummy_torso_d" })
sprite("_dummy_torso_s", ".2222.\n222222\n222222\n222222\n222222\n222222\n222222\n222222\n.2222.")
// Limbs, one drawing per pose. Facing down or up one arm and one leg serve both sides, moved up and
// down a pixel: a foot stepping toward us comes down the screen. In profile: standing (0), a foot or
// a hand 1 and 2 px forward (f1, f2) and back (b1, b2), each pivoted on its top row's first pixel,
// the shoulder or the hip; the far limbs are the same drawings a step darker. Leg tops hide under
// the hem, so the body can rise a pixel without opening a gap.
const LIMBS = {
  arm_d: ".33\n.33\n.33\n.33\n.33\n33.\n33.\n33.",
  leg_d: "333\n333\n333\n333\n333\n333\n333\n333\n333",
  arm_s0: "33\n33\n33\n33\n33\n33\n33",
  arm_sf1: "33.\n33.\n33.\n.33\n.33\n.33",
  arm_sf2: "33..\n33..\n.33.\n..33\n..33",
  arm_sb1: ".33\n.33\n.33\n33.\n33.\n33.",
  arm_sb2: "..33\n..33\n.33.\n33..\n33..",
  leg_s0: "333.\n333.\n333.\n333.\n333.\n333.\n333.\n3333\n3333",
  leg_sf1: "333..\n333..\n333..\n333..\n.333.\n.333.\n.333.\n.3333\n.3333",
  leg_sf2: "333...\n333...\n333...\n.333..\n.333..\n..333.\n..3333\n..3333",
  leg_sb1: ".333\n.333\n.333\n.333\n333.\n333.\n3333\n.333",
  leg_sb2: "..333\n..333\n..333\n.333.\n333..\n333..\n33...",
}
for (const [n, g] of Object.entries(LIMBS)) sprite(`_dummy_${n}`, n.includes("_s") ? { pivot: [g.indexOf("3"), 0] } : {}, g)

// ---------------------------------------------------------------- the costume, over the dummy
// Each part starts as its dummy (`base`), the dummy's flat color swapped for the material's middle
// tone; what is painted on top is the rest. Hair and tunic are lit on top, darker under the forms.
sprite("_head_d", { base: "_dummy_head_d", mx: true, swap: { 1: "h" } }, `
  ......
  ...YYY
  ..YY..
  ......
  ....j.
  .jSSSS
  jjSSkS
  .jSSkS
  ..zsss`)
sprite("_head_u", { base: "_dummy_head_u", mx: true, swap: { 1: "h" } }, `
  ......
  ...YYY
  ..YY..
  ......
  ......
  ......
  j.....
  .j....
  ..jjjj`)
sprite("_head_s", { base: "_dummy_head_s", swap: { 1: "h" } }, `
  ..........
  ...YYYY...
  ..YY..YY..
  ..........
  ........j.
  .....jSSSS
  j...zSSSkS
  .j..zSSSkS
  ..jjzssss.`)
sprite("_torso_d", { base: "_dummy_torso_d", mx: true, swap: { 2: "b" } }, `
  ....
  ....
  nnnz
  n.cc
  n...
  lLLg
  n...
  n...
  .nnn`)
sprite("_torso_u", { base: "_dummy_torso_u", mx: true, swap: { 2: "b" } }, `
  ....
  ....
  nnnn
  ....
  ....
  lLLL
  n...
  n...
  .nnn`)
sprite("_torso_s", { base: "_dummy_torso_s", swap: { 2: "b" } }, `
  ......
  ......
  nnnnzz
  .....c
  ......
  lLLLLg
  n.....
  n.....
  .nnnn.`)
// Limbs: bands of rows over the dummy's color. Arms: the sleeve lit on the shoulder (in profile all
// of it, so the near arm parts from the tunic behind it), its cuff, then bare forearms. Legs: the
// trousers dark under the hem, then the boot, its toe lit.
const ARM = (h, side) => side ? [[0, 3, "c"], [3, 1, "n"]] : [[0, 1, "c"], [1, 2, "b"], [3, 1, "n"]]
const LEG = (h) => [[3, 1, "P"], [h - 3, 2, "l"], [h - 1, 1, "L"]]
for (const n of Object.keys(LIMBS)) {
  const arm = n.startsWith("arm")
  sprite(`_${n}`, { base: `_dummy_${n}`, swap: { 3: arm ? "s" : "p" } },
    (c) => { for (const [y, rows, k] of (arm ? ARM : LEG)(c.h, n.includes("_s"))) c.recolor({ 3: k }, [0, y, c.w, rows]) })
}
const FAR = { p: "P", P: "d", l: "d", L: "l", c: "b", b: "n", s: "z", S: "s" }   // a far limb: a step darker

// ---------------------------------------------------------------- the moves
// Five drawings per direction (SLYNYRD): A passing, B and D a step on either foot, C and E the full
// strides only the run uses. [right, left] limbs: front and back views move them up and down by
// these pixels (forward is toward the bottom of the screen facing down, toward the top facing up);
// in profile they pick the drawings. The arm on the side of the leg going forward swings back.
const POSE = {
  A: { ly: [0, 0], ay: [0, 0], legs: ["0", "0"], arms: ["0", "0"] },
  B: { ly: [1, -1], ay: [-1, 1], legs: ["f1", "b1"], arms: ["b1", "f1"] },
  C: { ly: [1, -2], ay: [-2, 1], legs: ["f2", "b2"], arms: ["b2", "f2"] },
  D: { ly: [-1, 1], ay: [1, -1], legs: ["b1", "f1"], arms: ["f1", "b1"] },
  E: { ly: [-2, 1], ay: [1, -2], legs: ["b2", "f2"], arms: ["f2", "b2"] },
}
// The sword (characters §12, a melee with weight): a wind-up held 100 ms, three smears of 50 (an
// angular crescent, a narrower one, a thin hook), the follow-through a pixel further with no smear
// (100), the recovery (50). The first smear already reaches the target. Per frame: the blade's
// angle (degrees clockwise from pointing right), where its smear starts and how wide it gets, the
// upper body's lean, the hand's distance from the swing's center. Facing down or up the swing is
// level, a circle on the ground seen from above (squashed by k): in front of him facing down, past
// his head and behind him facing up. In profile it is an overhead cut in the near hand, so the
// flipped side swings it left-handed: the mirror moves the sword to the other hand (nothing else he
// wears is one-sided, so nothing else gives the flip away).
const SWING = {
  d: { o: [7, 20], k: 0.75, sh: [2, 16], behind: [true], keys: [[225, , , [0, -1]], [90, 210, 7], [45, 130, 4], [15, 60, 2], [5, , , [0, 1]], [60, , , [0, 0], 4]] },
  u: { o: [7, 12], k: 0.75, sh: [12, 16], behind: [true, true, true, true, true, true], keys: [[30, , , [0, 1]], [-90, -10, 7], [-135, -60, 4], [-165, -120, 2], [-175, , , [0, -1]], [150, , , [0, 0], 4]] },
  s: { o: [7, 16], k: 1, sh: [7, 16], behind: [], keys: [[230, , , [-1, 0]], [360, 250, 7], [395, 330, 4], [420, 380, 2], [425, , , [1, 0]], [440, , , [0, 0], 4]] },
}
const MOVES = {
  // top-down idle: the head down 0, 1, 2 px, the arms a frame behind it, the extremes held
  idle: { ms: [200, 200, 400, 200, 200, 400], f: (i) => ({ ...POSE.A, up: [0, 0], hy: [1, 1, 2, 1, 1, 0][i], ay: Array(2).fill([0, 1, 1, 1, 0, 0][i]) }) },
  // walk A B A D at 210 ms and run A B C B A D E D at 70: the bob a triangle of whole pixels
  walk: { ms: [210, 210, 210, 210], f: (i) => ({ ...POSE["ABAD"[i]], up: [0, [0, 1, 0, 1][i]], hy: 0 }) },
  run: { ms: Array(8).fill(70), f: (i) => ({ ...POSE["ABCBADED"[i]], up: [0, [1, 0, -1, 0, 1, 0, -1, 0][i]], hy: 0 }) },
  attack: { ms: [100, 50, 50, 50, 100, 50], f: (i, d) => ({ ...POSE.A, up: SWING[d].keys[i][3] ?? [0, 0], hy: 0, armed: true }) },
}

// One frame of the figure, its body box at (ox, oy). The upper body (head, torso, arms) moves by
// f.up, the head f.hy more and the arms f.ay; the legs stay on the ground.
function figure(c, set, d, f, ox, oy) {
  const dummy = set === "_dummy_", left = dummy ? { 3: "4" } : null, far = dummy ? { 3: "4" } : FAR
  const ux = ox + f.up[0], uy = oy + f.up[1]
  const put = (n, x, y, o = {}) => c.stamp(set + n, x, y, o)
  if (d === "s") {
    put("arm_s" + f.arms[1], ux + 6, uy + 15 + f.ay[1], { swap: far })
    put("leg_s" + f.legs[1], ox + 5, oy + 20, { swap: far })
    put("leg_s" + f.legs[0], ox + 7, oy + 20)
    put("torso_s", ux + 4, uy + 14)
    if (!f.armed) put("arm_s" + f.arms[0], ux + 6, uy + 15 + f.ay[0])
    put("head_s", ux + 2, uy + 7 + f.hy)
    return
  }
  // facing down his right limbs are on the left of the screen; facing up, on the right
  const sgn = d === "d" ? 1 : -1, screen = (side) => (d === "d" ? side : 1 - side)
  for (const side of [0, 1]) put("leg_d", ox + [3, 8][screen(side)], oy + 20 + sgn * f.ly[side], side && left ? { swap: left } : {})
  put("torso_" + d, ux + 3, uy + 14)
  for (const side of [0, 1]) {
    if (side === 0 && f.armed) continue
    const o = {}
    if (screen(side)) o.flip = "x"
    if (side && left) o.swap = left
    put("arm_d", ux + [0, 11][screen(side)], uy + 14 + sgn * f.ay[side], o)
  }
  put("head_" + d, ux + 1, uy + 7 + f.hy)
}

// The sword arm, the blade or the smear of frame i (`part`: "arm", "blade", "smear").
function swing(c, set, d, i, ox, oy, part) {
  const S = SWING[d], [a, from, wide, lean = [0, 0], hand = 5] = S.keys[i], tip = 14, R = Math.PI / 180
  const cx = ox + S.o[0] + lean[0], cy = oy + S.o[1] + lean[1], dummy = set === "_dummy_"
  const at = (r, t = a) => [cx + r * Math.cos(t * R), cy + r * S.k * Math.sin(t * R)]
  const px = (r, t) => at(r, t).map(Math.round)
  if (part === "smear") {
    if (from === undefined) return
    // an angular crescent: its outer edge on the tip's path in 3 straight runs, its inner edge
    // closing in from nothing where it starts to `wide` px at the blade
    const out = [], inn = []
    for (let k = 0; k <= 3; k++) {
      const t = from + ((a - from) * k) / 3
      out.push(...px(tip + 0.5, t))
      inn.unshift(px(tip + 0.5 - Math.max(0.6, (wide * k) / 3), t))
    }
    c.poly([...out, ...inn.flat()], wide > 2 ? "W" : "w")
  } else if (part === "blade") {
    const [gx, gy] = at(hand + 1), u = [Math.cos(a * R), Math.sin(a * R)]
    c.line(...px(hand + 2), ...px(tip), dummy ? "5" : "w")
    if (!dummy) c.line(...px(tip - 3), ...px(tip), "W")
    c.line(Math.round(gx - u[1]), Math.round(gy + u[0]), Math.round(gx + u[1]), Math.round(gy - u[0]), dummy ? "5" : "g")
  } else {
    const sx = ox + S.sh[0] + lean[0], sy = oy + S.sh[1] + lean[1], [hx, hy] = px(hand)
    c.capsule(sx, sy, 0.7, hx, hy, 0.6, dummy ? "3" : "zsS", { light: [0, -1] })
    if (!dummy) c.capsule(sx, sy, 1, (2 * sx + hx) / 3, (2 * sy + hy) / 3, 0.8, "nbc", { light: [0, -1] })
  }
}

// The layers of one or more figures (`at`: [direction, x, y] each), back to front: what is behind
// the body, the body, what is in front. The blade goes behind or in front frame by frame, the sword
// arm in front but facing up; the hand over the hilt. Smears take no outline.
function layers(set, move, at) {
  const M = MOVES[move], atk = move === "attack"
  const each = (fn) => (c) => at.forEach(([d, x, y]) => fn(c, d, x, y))
  const gear = (back, parts) => each((c, d, x, y) => {
    for (const part of atk ? parts : []) if ((part === "arm" ? d === "u" : !!SWING[d].behind[c.frame]) === back) swing(c, set, d, c.frame, x, y, part)
  })
  return [
    layer("smear_back", { outline: false }, gear(true, ["smear"])),
    layer("sword_back", gear(true, ["blade", "arm"])),
    layer("body", each((c, d, x, y) => figure(c, set, d, M.f(c.frame, d), x, y))),
    layer("smear", { outline: false }, gear(false, ["smear"])),
    layer("sword", gear(false, ["blade", "arm"])),
  ]
}
const BOX = { w: 14, h: 30, pivot: [7, 30] }, BIG = { w: 30, h: 38, pivot: [15, 34] }   // feet on the pivot
const DIRS = [["down", "d"], ["up", "u"], ["side", "s"]]
for (const move of Object.keys(MOVES)) {
  const atk = move === "attack", [ox, oy] = atk ? [8, 4] : [0, 0], slot = atk ? 32 : 16
  const frames = MOVES[move].ms.map((ms) => frame({ ms }))
  for (const [dir, d] of DIRS) anim(`${move}_${dir}`, { ...(atk ? BIG : BOX), outline: "k" }, ...layers("_", move, [[d, ox, oy]]), ...frames)
  // the dummy of the move: the three directions side by side on the guide rows
  anim(`_dummy_${move}`, { w: 3 * slot - 2, h: atk ? 38 : 30, outline: "k" },
    ...layers("_dummy_", move, DIRS.map(([, d], k) => [d, k * slot + ox, oy])),
    layer("guides", { ref: 0.5 }, ...Object.values(ROWS).map((y) => hline(0, y + oy, 3 * slot - 2, "#ff3d8b"))),
    ...frames)
}

// The four views at rest on their guide rows, the dummy under the costume; the fourth view is the
// side flipped, as the game shows it.
sprite("views", { w: 64, h: 64 },
  ...DIRS.map(([dir], k) => stamp(`idle_${dir}`, 16 * k + 8, 31, { frame: 5 })),
  stamp("idle_side", 56, 31, { frame: 5, flip: "x" }),
  stamp("_dummy_idle", 0, 32, { frame: 5 }), stamp("_dummy_idle", 48, 32, { frame: 5, flip: "x" }),
  layer("guides", { ref: 0.5 }, ...Object.values(ROWS).flatMap((y) => [hline(0, y + 1, 64, "#ff3d8b"), hline(0, y + 33, 64, "#ff3d8b")])))

// For the game: every move and direction, tagged idle_down, walk_up, run_side, attack_down, ...
sheet("hero", ["idle_*", "walk_*", "run_*", "attack_*"], { rows: "tag", pad: 1 })   // a move and a direction a row

// ---------------------------------------------------------------- test_hero
// The hero on the grass he'll walk on, a short loop: a walk to the right, a swing, the walk back
// flipped (the fourth direction, as the game shows it), a swing to the left. The ground stays quiet
// (tones close in value); the hero carries the contrast. The scene picks his frames by its own
// clock, a 2.48 s loop in 10 ms steps (frames: 248, fps: 100: the walk's 210 and the swing's 50 fall
// on them); stamping his anims as they are would loop the scene over their least common multiple.
sprite("_tuft", "M.M\noMo")
const frameAt = (ms, t) => { let i = 0; while (t >= ms[i]) t -= ms[i++]; return i }
const hero = (t) => t < 840 ? ["walk_side", frameAt(MOVES.walk.ms, t), 36 + Math.floor(t / 70), false]
  : t < 1240 ? ["attack_side", frameAt(MOVES.attack.ms, t - 840), 48, false]
  : t < 2080 ? ["walk_side", frameAt(MOVES.walk.ms, t - 1240), 48 - Math.floor((t - 1240) / 70), true]
  : ["attack_side", frameAt(MOVES.attack.ms, t - 2080), 36, true]
scene("test_hero", { w: 96, h: 64, bg: "m", frames: 248, fps: 100, world: { light: [0, -1] } },
  scatter("_tuft", 0, 0, 96, 64, 22, { even: true }),
  layer("shadow", { shade: 1 }, (c) => c.ellipse(hero(c.t)[2], 46, 5, 1, "k")),
  layer("hero", (c) => {
    const [name, frame, x, flip] = hero(c.t)
    c.stamp(name, x, 46, flip ? { frame, flip: "x" } : { frame })
  }))
