// Cemetery props: headstones, a mausoleum, a dead tree, the iron fence, jack-o'-lanterns.
// Moonlight comes from the upper right, so stone is lit on its top and right, dark on the left.

// ---------------------------------------------------------------- headstones (pivot on the ground)
sprite("tomb_round", { outline: "k", pivot: "bottom" }, `
  ..sssss..
  .tSSSSss.
  tSSSSSSSs
  tSSStSSSs
  tSStttSSs
  tSSStSSSs
  tSSStSSSs
  tSSSSSSSs
  tSSSSSSSs
  tSSSSSSSs
  TtttttttT`)

sprite("tomb_cross", { outline: "k", pivot: "bottom" }, `
  ...sss...
  ...tSs...
  ssstSssss
  tSSSSSSSs
  TTttSsttT
  ...tSs...
  ...tSs...
  ...tSs...
  ...tSs...
  ..tSSSs..
  .TtttttT.`)

sprite("tomb_slab", { outline: "k", pivot: "bottom" }, `
  ssssssss
  tSSSSSSs
  tSttttSs
  tSSSSSSs
  tStttSSs
  tSSSSSSs
  tSSSSSSs
  TtttttTT`)

sprite("tomb_obelisk", { outline: "k", pivot: "bottom" }, `
  ..s..
  .tSs.
  .tSs.
  .tSs.
  .tSs.
  .tSs.
  .tSs.
  .tSs.
  .tSs.
  .tSs.
  .tSs.
  tSSSs
  TtttT`)

// leaning copies: the ground settled under them
sprite("tomb_round_lean", { base: "tomb_round" }, warp((x, y) => [Math.floor((12 - y) / 4) - 2, 0]))
// not flipped: a flip would light it from the left, away from the moon (describe caught it)
sprite("tomb_slab_lean", { base: "tomb_slab" }, warp((x, y) => [2 - Math.floor((9 - y) / 3), 0]))
group("tombs", ["tomb_round", "tomb_round", "tomb_cross", "tomb_slab", "tomb_round_lean", "tomb_slab_lean", "tomb_obelisk"])

// ---------------------------------------------------------------- mausoleum
// A Greek-front crypt sized to the monsters: its door is taller than any of them. Two steps, two
// fluted columns each side of a door left ajar, a cornice, a pediment with the name plate. The
// door glows: the party started inside. Weathering with a cause: rain streaks under the cornice,
// a crack down from it, moss creeping up from the steps.
const CW = 84, CH = 78, CM = CW / 2
const column = (x) => [rect(x - 1, 31, 8, 2, "s"), rect(x, 33, 6, CH - 42, "s"), vline(x, 33, CH - 42, "t"),
  vline(x + 2, 34, CH - 44, "S"), vline(x + 4, 34, CH - 44, "S"), rect(x - 1, CH - 9, 8, 3, "S"), hline(x - 1, CH - 9, 8, "s")]
sprite("crypt", { w: CW, h: CH, outline: "k", pivot: "bottom" },
  // body, pediment with a recessed face, the finial
  rect(9, 30, CW - 18, CH - 36, "S"),
  poly([3, 28, CM, 8, CW - 3, 28], "S"), poly([8, 27, CM, 12, CW - 8, 27], "t"),
  rect(CM - 2, 3, 4, 6, "S"), px(CM, 2, "s"), vline(CM + 1, 3, 6, "s"),
  // name plate in the pediment
  rect(CM - 10, 18, 20, 7, "S"), hline(CM - 10, 18, 20, "s"), text(CM, 19, "R.I.P.", "t", { align: "c" }),
  // cornice: lit top, shadow under it
  rect(3, 27, CW - 6, 4, "s"), hline(3, 30, CW - 6, "t"), hline(3, 27, CW - 6, "s"),
  // columns: lit right edge, dark left, two flutes
  ...[12, 22, CW - 28, CW - 18].flatMap(column),
  // the door: a dark arch, two wooden leaves, the right one ajar with warm light in the gap
  rect(CM - 11, 41, 22, CH - 47, "T"), ellipse(CM, 41, 11, 6, "T"),
  rect(CM - 10, 42, 20, CH - 48, "x"), ellipse(CM, 42, 10, 5, "x"),
  rect(CM - 9, 43, 9, CH - 50, "W"), vline(CM - 5, 44, CH - 52, "x"),
  rect(CM + 1, 43, 4, CH - 50, "a"), vline(CM + 2, 44, CH - 52, "A"),
  rect(CM + 5, 43, 4, CH - 50, "W"), vline(CM + 5, 43, CH - 50, "x"),
  // steps
  rect(2, CH - 6, CW - 4, 3, "S"), hline(2, CH - 6, CW - 4, "s"), rect(0, CH - 3, CW, 3, "t"), hline(0, CH - 3, CW, "S"),
  // weathering
  ...[[10, 6], [30, 4], [CW - 33, 5], [CW - 11, 7]].map(([x, n]) => dither(x, 31, 1, n, "S", "t", 0.6)),
  line(CW - 13, 31, CW - 15, 38, "T"), line(CW - 15, 38, CW - 13, 44, "T"),
  // moss: on the stone only, thick on the steps and thinning up the walls and columns
  noise(2, CH - 6, CW - 4, 3, "G", 0.3, 4, "sS"), noise(9, CH - 11, CW - 18, 5, "G", 0.12, 5, "sSt"), noise(9, CH - 16, CW - 18, 5, "G", 0.04, 6, "sSt"),
  lamp(CM + 3, CH - 4, { r: 36, color: "#ffb060", power: 1 }))

// ---------------------------------------------------------------- dead tree
// A silhouette against the moon: limbs from a seeded walk that drifts back upward, thinning to
// 1 px twigs; a limb splits now and then, more often the thinner it gets.
const TREE_W = 140, TREE_H = 150, TREE_X = 100
// roots from the trunk's foot, [dx, dy] from where the trunk meets the ground: one along the ground to
// each side, snaking over a stone, one reaching toward us on each side (lower: the ground is seen a
// little from above), one behind. Thick at the trunk, tapering, the tips sunk into the grass.
const ROOTS = [[[-6, -8], [-9, -3], [-13, -1], [-16, -2], [-21, 0]], [[-3, -4], [-5, 0], [-7, 2], [-10, 3]],
  [[6, -8], [9, -4], [13, -2], [17, -2], [23, 0]], [[3, -3], [5, 1], [8, 3]], [[1, -7], [4, -5], [8, -5]]]
sprite("tree_dead", { w: TREE_W, h: TREE_H + 4, outline: "k", pivot: [TREE_X, TREE_H] }, (c) => {
  const r = c.rng(5)
  const limb = (x, y, ang, n, w, depth) => {
    for (let i = 0; i < n; i++) {
      ang += (r() - 0.5) * 0.6 + (-Math.PI / 2 - ang) * 0.05
      const nx = x + Math.cos(ang) * 3, ny = y + Math.sin(ang) * 3
      c.line(Math.round(x), Math.round(y), Math.round(nx), Math.round(ny), "x", Math.max(1, Math.round(w)))
      x = nx; y = ny; w = Math.max(1, w - 0.3)
      if (depth < 5 && i > 0 && r() < 0.18 + depth * 0.07)
        limb(x, y, ang + (r() < 0.5 ? -1 : 1) * (0.5 + r() * 0.6), Math.max(2, Math.round(n * 0.55)), w * 0.75, depth + 1)
    }
  }
  // the trunk, widening toward the ground in a curve (the buttress), then the roots: one curve per
  // width, each shorter than the last, so a root thins from 3 px at the trunk to 1 at the tip
  c.poly([TREE_X - 4, TREE_H - 44, TREE_X + 4, TREE_H - 44, TREE_X + 5, TREE_H - 14, TREE_X + 7, TREE_H - 6, TREE_X + 10, TREE_H - 1,
    TREE_X + 10, TREE_H, TREE_X - 10, TREE_H, TREE_X - 10, TREE_H - 1, TREE_X - 7, TREE_H - 6, TREE_X - 5, TREE_H - 14], "x")
  for (const root of ROOTS) {
    const pts = root.flatMap(([dx, dy]) => [TREE_X + dx, TREE_H + dy])
    for (let w = 1; w <= 3; w++) {
      const n = pts.length - 2 * (w - 1)
      if (n >= 4) c.curve(pts.slice(0, n), "x", { width: w })
    }
  }
  limb(TREE_X - 2, TREE_H - 42, -Math.PI / 2 - 0.55, 22, 5, 1)   // the long limb over the moon
  limb(TREE_X + 1, TREE_H - 44, -Math.PI / 2 + 0.05, 18, 5, 1)
  limb(TREE_X + 3, TREE_H - 38, -0.55, 12, 4, 1)
  limb(TREE_X - 3, TREE_H - 30, -Math.PI + 0.35, 9, 3, 2)
  c.vline(TREE_X + 3, TREE_H - 40, 36, "W")                       // moonlit side of the trunk
  // the moon from above catches the roots' tops and the knuckles where they leave the trunk
  const tops = []
  for (let y = TREE_H - 10; y < TREE_H + 4; y++) for (let x = TREE_X - 28; x < TREE_X + 30; x++)
    if (c.is(x, y, "x") && c.is(x, y - 1, ".") && x !== TREE_X - 4) tops.push([x, y])
  for (const [x, y] of tops) c.px(x, y, "W")
})

// ---------------------------------------------------------------- iron fence
const fence = (x0, x1, y) => (c) => {
  for (let x = x0; x < x1; x += 4) { c.vline(x, y + 1, 11, "K"); c.px(x, y, "k") }
  c.hline(x0 - 1, y + 3, x1 - x0, "K"); c.hline(x0 - 1, y + 9, x1 - x0, "K")
}

// ---------------------------------------------------------------- grass
sprite("_tuft1", { pivot: "bottom" }, ".g.g\ngGgG")
sprite("_tuft2", { pivot: "bottom" }, "g..g.\n.g.gl\nGgGgG")
sprite("_tuft3", { pivot: "bottom" }, "..l\ng.g\nGgG")

// ---------------------------------------------------------------- jack-o'-lanterns
// Carved faces lit from inside: the flame flickers (the lamp breathes, the bright core comes and
// goes), out of step from one pumpkin to the next with rdelay.
const JACK = `
  ......cc...
  ..OooOoO...
  .OoooOooOo.
  OooaoOoaooO
  OoaaoOoaaoO
  OoooooooooO
  OoaAaaaAaoO
  .OoaoaoaoO.
  ..OOOOOOO..`
const FLICKER = [1, 0.8, 1.15, 0.9]
anim("jack", { frames: 4, fps: 8, outline: "k", pivot: "bottom" }, JACK,
  (c) => {
    if (c.frame === 1) c.recolor({ A: "a" })
    c.lamp(5, 5, { r: 22, color: "#ff9a40", power: FLICKER[c.frame] })
  })
anim("jack_small", { frames: 4, fps: 8, outline: "k", pivot: "bottom" }, `
  ...c...
  .OoOoO.
  OaoOoaO
  OoooooO
  OaAaAaO
  .OOOOO.`,
  (c) => {
    if (c.frame === 2) c.recolor({ A: "a" })
    c.lamp(3, 3, { r: 16, color: "#ff9a40", power: FLICKER[(c.frame + 2) % 4] })
  })

// ---------------------------------------------------------------- string lights
// Bulbs hang from a wire: a dark socket and a colored glass drop, each with a small lamp.
const BULBS = [["o", "O", "#ffa040"], ["u", "U", "#d080ff"], ["p", "P", "#90ff70"], ["a", "o", "#ffe070"]]
BULBS.forEach(([lit, dark, light], i) =>
  sprite(`bulb_${i}`, { pivot: [1, 0] }, `.k.\n${lit}${lit}${dark}\n.${dark}.`, lamp(1, 1, { r: 12, color: light, power: 0.7 })))
group("bulbs", BULBS.map((_, i) => `bulb_${i}`))

// ---------------------------------------------------------------- bats
// Five bats loop around the moon on closed paths (whole turns in the 2 s loop), flapping.
const BAT_UP = "k.....k\nkk.k.kk\n.kk8kk.\n...k..."
const BAT_DOWN = ".......\n..k8k..\nkkkkkkk\nk..k..k"
const BATS = [[250, 40, 46, 14, 1, 2, 0], [230, 28, 30, 10, 1, 1, 0.3], [200, 50, 60, 18, 1, 2, 0.55], [270, 60, 26, 12, 2, 1, 0.8], [160, 30, 40, 8, 1, 1, 0.15]]
anim("bats", { w: 320, h: 100, frames: 16, fps: 8 }, (c) => {
  BATS.forEach(([cx, cy, ax, ay, fx, fy, p], i) => {
    const t = (c.frame / 16 + p) * Math.PI * 2
    c.grid(Math.round(cx + ax * Math.cos(fx * t)) - 3, Math.round(cy + ay * Math.sin(fy * t)) - 2, (c.frame + i) % 2 ? BAT_UP : BAT_DOWN)
  })
})

// ---------------------------------------------------------------- music notes
// Notes rise from a speaker, wobbling, and vanish at the top; three in flight, in party colors.
const NOTE = ".11\n.1.\n.1.\n11.\n11."
anim("notes", { w: 24, h: 40, frames: 16, fps: 8 }, (c) => {
  for (let i = 0; i < 3; i++) {
    const k = (c.frame / 16 + i / 3) % 1, y = Math.round(36 - k * 36)
    const x = Math.round(10 + 6 * Math.sin((k * 2 + i * 0.3) * Math.PI * 2))
    c.grid(x, y - 4, NOTE.replaceAll("1", "upo"[i]))
  }
})

// ---------------------------------------------------------------- disco ball
// A mirror ball hanging from the string lights over the dance floor: its facets twinkle as it
// turns and it lights the floor; the spots it throws are drawn over the lit scene (see party).
anim("disco", { w: 9, h: 14, frames: 4, fps: 8, outline: "k", pivot: [4, 0] }, (c) => {
  c.vline(4, 0, 5, "K")
  c.circ(4, 9, 4, "S")
  for (let y = 5; y <= 13; y++) for (let x = 0; x <= 8; x++)
    if (c.is(x, y, "S") && (x + y + c.frame) % 3 === 0) c.px(x, y, (x + c.frame) % 2 ? "i" : "s")
  c.px(2 + (c.frame % 3), 7, "i")
  c.lamp(4, 9, { r: 100, color: "#fff4e8", power: 0.95 })
})

// ---------------------------------------------------------------- foreground headstones
// Big and close, cut by the bottom of the frame: they frame the party. One stone, two carvings (a
// mirrored copy would read its epitaph backwards and turn its moonlit side away from the moon).
const tombBig = (...carving) => [
  rect(0, 8, 18, 18, "S"), ellipse(8, 8, 8, 8, "S"), rect(0, 8, 1, 18, "t"), ellipse(8, 8, 8, 8, "t", true),
  clip([9, 0, 9, 26], ellipse(8, 8, 8, 8, "s", true)), vline(17, 8, 18, "s"), vline(0, 8, 18, "t"),
  ...carving, dither(0, 21, 18, 5, "S", "G", 0.3)]
sprite("tomb_big", { w: 18, h: 26, outline: "k", pivot: "bottom" }, ...tombBig(
  text(9, 9, "RIP", "t", { align: "c" }), hline(4, 16, 10, "t"), hline(5, 18, 8, "t"),
  line(13, 3, 11, 7, "T"), line(11, 7, 12, 10, "T")))
sprite("tomb_big_2", { w: 18, h: 26, outline: "k", pivot: "bottom" }, ...tombBig(
  vline(8, 4, 10, "t"), hline(5, 7, 7, "t"), hline(4, 16, 10, "t"), hline(5, 18, 8, "t"),
  line(4, 5, 6, 9, "T"), line(6, 9, 5, 12, "T")))
sprite("cross_big", { outline: "k", pivot: "bottom" }, `
  ....sss....
  ....tSs....
  ....tSs....
  sssstSsssss
  tSSSSSSSSSs
  TTTTtSsTTTT
  ....tSs....
  ....tSs....
  ....tSs....
  ....tSs....
  ....tSs....
  ....tGs....
  ...tGSGs...
  ..TGtGGGT..`)
