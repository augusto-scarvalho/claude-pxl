// A village's edge for a top-down action game at a 16 px grid (topdown16, lib/profiles/topdown16.px.js), 256 x 160
// (16 x 10 tiles): every piece is the library's, drawn for that cell (lib/: the island's ground, shore and pier, a
// cottage, the trees, the village's props, the hero, two villagers, Reva, a slime, a puff of dust, the hearts). The
// ground in regions (the field, a darker grass under the trees, tall grass), a path by corners, a bank along the
// top right (the higher ground's earth front), a hedge, a fence, a bed of flowers, a stump; every standing thing's
// shadow a band right under it (a house's along its foot and down its right side). It moves as the genre's demo:
// the hero walks in from the bottom edge, along the path and up it (the elder turning to him as he passes), turns
// to a pot by the lamp, cuts it (it bursts in a puff of dust) and walks out at the left; the people breathe on
// their idles, the slime hops, the pot comes back in a puff once he has gone; three hearts at the top left, the
// game's display.
include("../lib/characters/hero.px.js", { as: "hero" })
include("../lib/characters/villagers.px.js", { as: "vil" })
include("../lib/characters/reva.px.js", { as: "reva" })
include("../lib/characters/slime.px.js", { as: "slime" })
include("../lib/styles/island.px.js", { palette: true })
include("../lib/nature/island.px.js", { as: "isl" })
include("../lib/architecture/pier.px.js", { as: "pier" })
include("../lib/nature/trees.px.js", { as: "trees" })
include("../lib/nature/kit.px.js", { as: "nk" })
include("../lib/styles/fields.px.js", { as: "fields" })
include("../lib/architecture/houses.px.js", { as: "houses" })
include("../lib/props/village.px.js", { as: "v" })
include("../lib/vfx/dust.px.js", { as: "dust" })
include("../lib/ui/hearts.px.js", { as: "hearts" })
const T = 16
// one char per tile corner: g grass, d the darker grass, p path, w water (a tile takes one set: never two of d, p, w)
const CORNERS = `
  ggggggggggggggggg
  ggggggggggggggggg
  gggggggdddddggggg
  ggggggddddddggggg
  ggggggdddgggggggg
  ggggggggggggggggg
  gggppgggggggggggg
  gggppgggggggggwww
  ggggpppppppggwwww
  gggggggggggggwwww
  ggggggggggggwwwww`.trim().split("\n").map((r) => r.trim())
// tall grass and the field's flowers, by tile [col, row]
const TALL = new Set(["7,9", "8,9", "8,8", "0,9"]), FLOWER = new Set(["9,1", "15,5", "1,5", "11,6"])
const ground = (c) => {
  for (let j = 0; j < 10; j++) for (let i = 0; i < 16; i++) {
    const k = [CORNERS[j][i], CORNERS[j][i + 1], CORNERS[j + 1][i], CORNERS[j + 1][i + 1]]
    const mask = (ch) => k.reduce((m, v, b) => m | (v === ch ? 1 << b : 0), 0)
    const name = mask("w") ? (mask("w") === 15 ? ((i + j) % 4 ? "isl.shore_15" : "isl.sea_glint") : `isl.shore_${mask("w")}`)
      : mask("p") ? `isl.path_${mask("p")}` : mask("d") ? `isl.meadow_${mask("d")}`
      : TALL.has(`${i},${j}`) ? "isl.grass_tall" : FLOWER.has(`${i},${j}`) ? "isl.grass_flower"
      : ["isl.shore_0", "isl.grass_marks", "isl.shore_0", "isl.grass_tuft", "isl.shore_0", "isl.grass_marks"][(i * 7 + j * 3) % 6]
    c.stamp(name, i * T, j * T)
  }
}
// the bank along the top right: the higher ground's earth front, its foot at y 32
const BANK = ["isl.ledge_w", "isl.ledge", "isl.ledge_b", "isl.ledge", "isl.ledge_b", "isl.ledge", "isl.ledge_b", "isl.ledge"]
// what stands, by its foot (its pivot): [asset, x, y, flip]; the hero isn't here: he walks in (the walk below)
const STAND = [
  ["houses._cottage_td16", 48, 77], ["nk._spruce_td16", 112, 70], ["trees._oak_td16", 178, 50], ["trees._momiji_td16", 232, 82],
  ["fields._rock_td16", 186, 102], ["isl.bush", 10, 92], ["isl.bush", 236, 40, "x"], ["isl.bush", 150, 60], ["isl.rock", 156, 148], ["isl.rock", 30, 140, "x"],
  ["v.pot", 20, 104], ["v.chest", 150, 116], ["v.sign", 86, 122], ["v.crate", 98, 90], ["v.barrel", 112, 92], ["v.lamp", 34, 116],
  ["vil.villager_idle_down", 62, 104], ["vil.elder_idle_side", 72, 128, "x"], ["reva.reva_idle_side", 160, 92],
  ["slime.slime_idle", 60, 152],
  // new: a stump, a bed of flowers, a hedge, a fence
  ["isl.stump", 200, 78], ["isl.flower_bed", 96, 160],
  ["isl.hedge_w", 8, 160], ["isl.hedge_e", 24, 160],
  ["v.fence", 168, 132], ["v.fence", 184, 132], ["v.fence_end", 194, 132],
]
const place = (n) => STAND.find(([m]) => m === n).slice(1, 3)

// ---------------------------------------------------------------- the loop
// 12.8 s on a 50 ms clock (the idles' 200 and 400 ms, the cut's 100 and 50 fall on it; the slime's hop is 500 here
// and the puffs' 70 to 110 as near as the clock goes), what the walk needs and the pot's return after it. The hero
// walks a game's pace, 30 px a second: a pose every 100 ms, 1.5 times his planted stride (a planted foot goes back
// 2 px a pose in profile and 1.41 facing up or down: hero.rig's feet on the screen), so 3 px a pose sideways and 2.1
// up or down, the slight slide the school's games accept. Every idle a whole number of times in it: the people's
// 1600 ms 8 times, the slime's 900 ms 12 times and its hop 4. (A scene's GIF stops at 600 frames.)
const L = 12800, MS = 50, WF = 100
// The hero, in from the bottom edge through the tall grass, west along the path (in front of the elder and the
// sign), up it past the villager, west behind the lamp to the pot; he turns to it, cuts it, watches it burst and
// walks on out at the left. Stepped by the walk's frames: he moves as his pose changes, never between.
const walk = route({ px: true, pace: (d) => 1.5 * (d === "n" || d === "s" ? Math.SQRT2 : 2), walk: "walk", idle: "idle" }, [
  [120, 172], [120, 138], [46, 138], { to: [46, 91], name: "up" }, [22, 91],
  { hold: 2, dir: "s" }, { hold: 4, dir: "s", name: "cut", anim: "attack" }, { hold: 4, dir: "s" }, [22, 97], [-8, 97]])
// the game's views: down, up and the side, flipped going west
const VIEW = { s: "down", n: "up", e: "side", w: "side" }
const heroAt = (t) => {
  const r = walk(Math.floor(t / WF))
  if (!r) return null
  const [move, dir] = r.name.split("_")
  return { name: `hero.${move}_${VIEW[dir]}`, at: r.at, move, frame: r.frame % 4, flip: dir === "w" }
}
// the pot: whole until the blade's second active frame meets it (150 ms into the cut), then it cracks and bursts
// (pot_break, a puff of dust as it bursts) and its shards lie there; it comes back as games bring a pot back, in a
// puff of dust, once he has gone (whole from the puff's second frame, its widest; each on the clock)
const CUT = walk.start("cut") * WF, HIT = CUT + 150, BURST = HIT + 100, BACK = (walk.total + 8) * WF, WHOLE = BACK + 100
const potUp = (t) => t < BURST || t >= WHOLE
// the elder turns to him as he passes, a direction every 200 ms (4 frames), the shorter way round (by the front),
// seen from his head (20 px over his feet) so the hero walking by a few px below his feet is in front of him;
// turnToward's way is up the world (+y away), so the picture's y goes in negated
const ELDER = place("vil.elder_idle_side")
const elderFaces = turnToward("e", [ELDER[0], -(ELDER[1] - 20)], (f) => { const h = heroAt(f * MS); return h && [h.at[0], -h.at[1]] }, { rest: "w", every: 4, within: 40 })
// the slime idles and hops: twice after the hero as he turns up the path away from it, twice when the pot bursts,
// each pair at the end of the first idle after its moment
const SLIME = place("slime.slime_idle"), HOPS = [[walk.start("up") * WF, 2], [BURST, 2]], HOP = 500
const slimeAt = (t) => {
  let s = 0
  for (const [at, n] of HOPS) {
    const a = s + Math.ceil((at - s) / 900) * 900
    if (t < a) break
    if (t < a + HOP * n) return ["slime.slime_hop", (t - a) % HOP]
    s = a + HOP * n
  }
  return ["slime.slime_idle", (t - s) % 900]
}
// what moves, stamped by the frame among what stands (sorted by y with it)
const movers = (c) => {
  const t = c.t, h = heroAt(t), flip = (f) => (f ? { flip: "x" } : {})
  if (h) c.stamp(h.name, ...h.at, { ...(h.move === "walk" ? { frame: h.frame } : h.move === "attack" ? { t: Math.min(t - CUT, 399) } : {}), ...flip(h.flip), id: "hero" })
  const e = elderFaces(Math.floor(t / MS)).name.slice(2)
  c.stamp(`vil.elder_idle_${VIEW[e.slice(-1)]}`, ...ELDER, { delay: 1000, ...flip(e.includes("w")), id: "elder" })
  const [sn, st] = slimeAt(t)
  c.stamp(sn, ...SLIME, { t: st, id: "slime" })
  const pot = place("v.pot")
  c.stamp(t >= HIT && t < WHOLE ? "v.pot_break" : "v.pot", ...pot, t >= HIT && t < WHOLE ? { t: Math.min(t - HIT, 579), id: "pot" } : { id: "pot" })
  // a puff as it bursts; two side by side, the pot's width, as it comes back
  if (t >= BURST && t < BURST + 270) c.stamp("dust.dust", pot[0], pot[1] + 1, { t: t - BURST })
  if (t >= BACK && t < BACK + 270) for (const dx of [-4, 4]) c.stamp("dust.dust", pot[0] + dx, pot[1] + 1, { t: t - BACK, ...flip(dx > 0) })
}
const MOVING = ["v.pot", "vil.elder_idle_side", "slime.slime_idle"]
// the people's idles out of step
const IDLE = { "vil.villager_idle_down": 0, "reva.reva_idle_side": 600 }

// topdown16's shadow, as the references make it: a band right under the thing's foot (its drawing's lowest row), no
// offset, its width a share of the thing's (0.72), 2 to 4 rows, one shade step (toward teal on the grass); the hero's
// where he is, the pot's while it stands
const SH = { wide: 0.36, deep: 0.1, most: 2 }
const standing = (t) => STAND.filter(([n]) => n !== "v.pot" || potUp(t)).concat(heroAt(t) ? [["hero.idle_down", ...heroAt(t).at]] : [])
const shadowsOf = (c) => standing(c.t).forEach(([n, x, y]) => {
  if (/fence|hedge|flower_bed/.test(n)) return
  const im = c.asset(n, { frame: 0 }), b = im.bounds(), w = b.w, foot = y + (b.y + b.h - 1) - (im.pivot?.[1] ?? b.y + b.h - 1)
  // a house: a band its whole width along its foot, and a strip down its right side from the eaves (the light from the left)
  if (/cottage/.test(n)) {
    const left = x - (im.pivot?.[0] ?? 0) + b.x
    return (c.rect(left + 1, foot - 3, w + 1, 5, "k"), c.rect(left + w, foot - 25, 2, 27, "k"))
  }
  const rx = Math.max(3, Math.round(w * SH.wide)), ry = Math.max(1, Math.min(SH.most, Math.round(w * SH.deep)))
  c.ellipse(x, foot, rx, ry, "k")
})
scene("village", { w: 16 * T, h: 10 * T, frames: L / MS, fps: 1000 / MS, world: { light: [-0.5, -1] }, check: { every: 12 } },
  layer("ground", ground, ...BANK.map((n, i) => stamp(n, 128 + i * 16, 0))),
  layer("flowers", scatter("isl._tuft", 0, 40, 250, 110, 6, { on: "g", below: true, even: true, seed: 9 })),
  layer("shadows", { shade: 1 }, shadowsOf, rect(220, 110, 12, 44, "k"), rect(0, 159, 32, 1, "k"), rect(160, 130, 38, 4, "k")),
  layer("pier", stamp("pier.pier", 214, 104)),
  layer("props", { sort: "y" }, ...STAND.filter(([n]) => !MOVING.includes(n))
    .map(([n, x, y, f]) => stamp(n, x, y, { ...(f ? { flip: f } : {}), ...(n in IDLE ? { delay: IDLE[n] } : { frame: 0 }) })), movers),
  // the game's display: three hearts, top left
  layer("hud", ...[0, 1, 2].map((i) => stamp("hearts.heart", 4 + 9 * i, 4))))
