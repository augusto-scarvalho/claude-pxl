// A village's edge by the water for a top-down action game at a 32 px grid (topdown32, lib/profiles/topdown32.px.js),
// 512 x 288 (16 x 9 tiles: the 16 px demo's 16 columns at this density, a row less for 16:9): every piece is the
// library's, drawn for that cell (lib/: the island's ground and shore at 32, the cottage, the oak, the momiji and the
// spruce, the boulder, the village's props at 32, the slim hero, the villager and the elder, the slime, a puff of dust,
// the hearts).
// The ground in regions (the field, a lighter grass round the chest, a darker one in the corner), a path by corners
// from the cottage's door to a road across the scene (in from the left edge, down off the bottom edge by the shore), a
// patch of tall grass; every standing thing on land (a crown may hang over the shore, a foot may not) and none in the
// hero's way (the scene's expect), its shadow by the genre's rule (an ellipse under its foot; a house's a band along
// its foot and a strip down its right side). It moves as the genre's demo: the hero walks in from the bottom edge, up
// the road and west along it (the elder turning to him as he passes), stops over a pot by the lamp, cuts it (it cracks
// and bursts in a puff of dust, its shards left) and walks out at the left; the people breathe on their idles, the
// slime hops, the pot comes back in two puffs once he has gone; a gust crosses the scene from the west every 2.8 s
// (the trees' crowns, the bushes, the tufts and the tall grass swaying by effect("sway"), whole pixels moved); three
// hearts at the top left, the game's display.
include("../lib/characters/hero32.px.js", { as: "hero" })
include("../lib/characters/villagers32.px.js", { as: "vil" })
include("../lib/characters/slime.px.js", { as: "slime" })
include("../lib/styles/island.px.js", { palette: true })
include("../lib/nature/island32.px.js", { as: "isl" })
include("../lib/nature/trees.px.js", { as: "trees" })
include("../lib/nature/kit.px.js", { as: "nk" })
include("../lib/styles/fields.px.js", { as: "fields" })
include("../lib/architecture/houses.px.js", { as: "houses" })
include("../lib/props/village32.px.js", { as: "v" })
include("../lib/vfx/dust.px.js", { as: "dust" })
include("../lib/ui/hearts.px.js", { as: "hearts" })
const T = 32
// one char per tile corner (17 x 10): g grass, L the lighter grass, D the darker, p path, w water (a tile takes one of
// p and w); the road's middle on row 6 (y 192), the door's corner over it (5, 5), its leg down at column 11 (x 352)
const CORNERS = `
  ggggggggggggggggg
  ggggggggggggggggg
  gggggggggggLLgggg
  gggggggggggLLLggw
  ggggggggggggLggww
  gggggpggggggggwww
  ppppppppppppggwww
  gDgggggggggpgwwww
  DDDggggggggpggwww
  DDgggggggggpgwwww`.trim().split("\n").map((r) => r.trim())
// (a lighter or darker grass region's corner beside a corner of the shore or the path dropped: the tiles round it would
// be drawn as shore or path, which knows nothing of the region, and cut it square along their seams)
const AROUND = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]
const CLEAN = CORNERS.map((r, j) => [...r].map((ch, i) => ("LD".includes(ch) && AROUND.some(([u, v]) => "wp".includes(CORNERS[j + v]?.[i + u] ?? "")) ? "g" : ch)).join(""))
const ground = (c) => {
  for (let j = 0; j < 9; j++) for (let i = 0; i < 16; i++) {
    const k = [CLEAN[j][i], CLEAN[j][i + 1], CLEAN[j + 1][i], CLEAN[j + 1][i + 1]]
    const mask = (ch) => k.reduce((m, v, b) => m | (v === ch ? 1 << b : 0), 0)
    c.stamp(mask("w") ? `isl.shore32_${mask("w")}` : mask("p") ? `isl.path32_${mask("p")}` : mask("L") ? `isl.grasslight32_${mask("L")}` : mask("D") ? `isl.grassdark32_${mask("D")}` : "isl.path32_0", i * T, j * T)
  }
}
// what stands, by its foot (its pivot): [id, asset, x, y]
const STAND = [
  ["house", "houses._cottage_td32", 160, 172], ["spruce", "nk._spruce_td32", 36, 176], ["oak", "trees._oak_td32", 300, 116], ["momiji", "trees._momiji_td32", 428, 138],
  ["boulder", "fields._rock_td32", 236, 268], ["rock", "isl.rock", 388, 262], ["bush_1", "isl.bush", 186, 284], ["bush_2", "isl.bush", 14, 266], ["bush_3", "isl.bush", 402, 58],
  ["barrel", "v.barrel", 254, 174], ["crate", "v.crate", 280, 166], ["lamp", "v.lamp", 50, 231], ["pot", "v.pot", 72, 230], ["sign", "v.sign", 300, 242], ["chest", "v.chest", 372, 120],
  ["villager", "vil.villager32_idle_down", 318, 170], ["elder", "vil.elder32_idle_side", 112, 180],
  ["slime", "slime.slime32_idle", 136, 270],
  ["tuft_1", "isl.tuft_big", 330, 282], ["tuft_2", "isl._tuft", 352, 98], ["tuft_3", "isl._tuft", 166, 246], ["tuft_4", "isl._tuft", 476, 30],
  ["flower_1", "isl._flower_r", 96, 258], ["flower_2", "isl._flower_w", 106, 264], ["flower_3", "isl._flower_b", 115, 257],
  ["flower_4", "isl._flower_w", 340, 136], ["flower_5", "isl._flower_r", 350, 142],
]
// the tall grass: a patch by its corner set (its corners), each tile's pivot on its square's middle
const TALL = new Set(["13,0", "14,0", "15,0", "16,0", "14,1", "15,1", "16,1"]), isT = (i, j) => TALL.has(`${i},${j}`)
for (let j = 0; j < 9; j++) for (let i = 0; i < 16; i++) {
  const m = [isT(i, j), isT(i + 1, j), isT(i, j + 1), isT(i + 1, j + 1)].reduce((s, t, b) => s | (t ? 1 << b : 0), 0)
  if (m) STAND.push([`tall_${i}_${j}`, m === 15 ? "isl.tallgrass" : `isl.tallgrass_${m}_${(i + j) % 2}`, i * T + 16, j * T + 16])
}

// ---------------------------------------------------------------- the loop
// 11.2 s on a 50 ms clock (224 frames): the route, the pot's return after it, and every idle a whole number of times
// in it: the people's 1600 ms 7 times, the slime's 900 ms idle 8 times and its hop (460 ms, held to 500 on the clock)
// 8 times. The hero walks a game's pace: a pose every 100 ms (the genre's 105 on the clock), 1.5 times his planted
// foot sideways (it goes back 3.75 px a pose in profile: 5.6 px a pose); up or down the 45 degree ground's share of
// that (0.71: 4 px a pose; seen from 15 degrees his feet hardly move up or down the picture, so they slide there).
// Stepped by the walk's poses: he moves as his pose changes, never between.
const L = 11200, MS = 50, WF = 100
// The hero, in from the bottom edge (wholly under it at the loop's start, so nothing pops in) up the road's leg,
// west along the road past the villager and the elder, to the pot; he turns to it, cuts it, watches it burst and
// walks on out at the left, behind the lamp.
const walk = route({ px: true, pace: (d) => (d === "n" || d === "s" ? 4 : 5.6), walk: "walk", idle: "idle" }, [
  [352, 336], { to: [352, 202], name: "up" }, { to: [72, 202], name: "west" },
  { hold: 1, dir: "s", name: "turn" }, { hold: 7, dir: "s", name: "cut", anim: "attack" }, { hold: 2, dir: "s", name: "watch" }, { to: [-12, 202], name: "out" }])
// the game's views: down, up and the side, flipped going west
const VIEW = { s: "down", n: "up", e: "side", w: "side" }
const heroAt = (t) => {
  const p = Math.floor(t / WF), r = walk(p)
  if (!r) return null
  const [move, dir] = r.name.split("_")
  return { name: `hero.${move}_${VIEW[dir]}`, at: r.at, move, frame: p % 8, flip: dir === "w" }
}
// the pot: whole until the blade's strike meets it (200 ms into the cut, the attack's third frame), then it cracks
// and bursts (pot_break, a puff of dust as it bursts) and its shards lie there; it comes back as games bring a pot
// back, in two puffs of dust side by side, once he has gone (whole from the puffs' second frame, their widest)
const CUT = walk.start("cut") * WF, HIT = CUT + 200, BURST = HIT + 80, BACK = (walk.start("out") + walk.step("out").n) * WF, WHOLE = BACK + 100
const potUp = (t) => t < BURST || t >= WHOLE
const place = (id) => STAND.find(([m]) => m === id).slice(2, 4)
// the elder turns to him as he passes, a direction every 200 ms (4 frames), the shorter way round (by the front),
// seen from his head (40 px over his feet) so the hero walking by below his feet is in front of him; turnToward's way
// is up the world (+y away), so the picture's y goes in negated
const ELDER = place("elder")
const elderFaces = turnToward("e", [ELDER[0], -(ELDER[1] - 40)], (f) => { const h = heroAt(f * MS); return h && [h.at[0], -h.at[1]] }, { rest: "e", every: 4, within: 96 })
// the slime idles and hops: twice as the hero turns onto the road, twice as he passes above it, four times when the
// pot bursts, each run of hops at the end of the first idle after its moment (8 idles and 8 hops: the loop)
const SLIME = place("slime"), IDLE = 900, HOP = 500
const HOPS = [[walk.start("west") * WF, 2], [(walk.start("west") + (352 - SLIME[0]) / 5.6) * WF, 2], [BURST, 4]]
const slimeAt = (t) => {
  let s = 0
  for (const [at, n] of HOPS) {
    const a = s + Math.ceil((at - s) / IDLE) * IDLE
    if (t < a) break
    if (t < a + HOP * n) return ["slime.slime32_hop", (t - a) % HOP]
    s = a + HOP * n
  }
  return ["slime.slime32_idle", (t - s) % IDLE]
}
// what moves, stamped by the frame among what stands (sorted by y with it); the hero drawn over the pot while his
// blade comes down on it (till it bursts: its pieces fly at us), under the lamp a row nearer us
const POT = place("pot")
const movers = (c) => {
  const t = c.t, h = heroAt(t), flip = (f) => (f ? { flip: "x" } : {})
  if (h) {
    const hero = (k = c) => k.stamp(h.name, ...h.at, { ...(h.move === "walk" ? { frame: h.frame } : h.move === "attack" ? { t: Math.min(t - CUT, 629) } : { frame: 0 }), ...flip(h.flip), id: "hero" })
    t >= CUT && t < BURST ? c.y(POT[1] + 0.5, hero) : hero()
  }
  const e = elderFaces(Math.floor(t / MS)).name.slice(2)
  c.stamp(`vil.elder32_idle_${VIEW[e.slice(-1)]}`, ...ELDER, { t: (t + 1000) % 1600, ...flip(e.includes("w")), id: "elder" })
  const [sn, st] = slimeAt(t)
  c.stamp(sn, ...SLIME, { t: st, id: "slime" })
  const broken = t >= HIT && t < WHOLE
  c.stamp(broken ? "v.pot_break" : "v.pot", ...POT, broken ? { t: Math.min(t - HIT, 579), id: "pot" } : { id: "pot" })
  // a puff as it bursts; two side by side, the pot's width, as it comes back
  if (t >= BURST && t < BURST + 270) c.stamp("dust.dust32", POT[0], POT[1] + 1, { t: t - BURST })
  if (t >= BACK && t < BACK + 270) for (const dx of [-6, 6]) c.stamp("dust.dust32", POT[0] + dx, POT[1] + 1, { t: t - BACK, ...flip(dx > 0) })
}
const MOVING = ["pot", "elder", "slime"]
// the people's idles out of step (the elder's 1000 ms on, in movers)
const DELAY = { villager: 600 }

// ---------------------------------------------------------------- the wind
// A gust every 2.8 s (56 frames, 4 in the loop) from the west: what it reaches sways a little later the farther east
// it stands (5 ms a px: it crosses the scene in 2.6 s; a stamp's `delay` puts its anim that far ahead, so the west's
// the most). The trees bend as lib/nature/trees.px.js's 3D trees do in their `wind` (each row by the square of its
// height over the trunk), shaped as a gust: up to its peak in a fifth of the cycle, then back past rest and settling;
// whole pixels moved (the hand's pixels kept, nothing redrawn), the drawing itself between gusts. The oak and the momiji
// 4 px at the crown's top, its outline moved whole by its height (its edges as clean as at rest), the clumps inside a
// little behind it and the lit ones swinging more than the shaded; the spruce stiffer, its top and its boughs' tips 2 px.
// The bushes and the tufts by effect("sway"), a pixel; the tall grass 3 px twice a gust, so waves cross the patch.
const GUST = 56, LAG = 5
const gust = (t) => (t < 0.2 ? Math.sin((Math.PI * t) / 0.4) ** 2 : Math.exp(-4 * (t - 0.2)) * Math.cos(2 * Math.PI * 2.2 * (t - 0.2)))
// [canvas w, h, pivot x, y, room left, right]: what a sway would push past its canvas's edges, copied onto a wider one
const CANVAS = { "trees._oak_td32": [101, 140, 54, 111, 3, 6], "trees._momiji_td32": [87, 110, 42, 85, 3, 6], "isl.bush": [33, 38, 16, 29, 0, 4], "isl.tallgrass": [35, 52, 16, 33, 0, 4] }
const lum = (k) => (0.2126 * (k >>> 24) + 0.7152 * ((k >>> 16) & 255) + 0.0722 * ((k >>> 8) & 255)) / 255
const NEAR = [[-1, 0], [1, 0], [0, -1], [0, 1], [-2, 0], [2, 0], [0, -2], [0, 2]]
// a tree bent by the gust, frame by frame: each row's pixels carried `amount` px at the top by the square (`power`) of
// its height over `still` rows; inside the outline (2 px in) the clumps `lag` of the cycle behind, a lit one its whole
// share and the darkest `tone` less (an inside pixel only ever taking an inside one, so the outline is never doubled
// in); `tips`: the boughs' ends by their distance from the trunk as well as the top by its height
const bent = (src, { amount, still, power = 2, tone = 0, lag = 0, tips = 0 }) => (c) => {
  const im = c.asset(src), [px, py] = im.pivot, W = im.w, H = im.h, top = py - 1 - still
  const at = (x, y) => (x >= 0 && x < W ? im.get(x, y) : 0), h = (y) => Math.min(1, Math.max(0, (py - 1 - y - still) / top)) ** power
  let lo = 1, hi = 0, R = 1
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (at(x, y)) (lo = Math.min(lo, lum(at(x, y)))), (hi = Math.max(hi, lum(at(x, y)))), (R = Math.max(R, Math.abs(x - px)))
  const inside = (x, y) => !!at(x, y) && NEAR.every(([u, v]) => at(x + u, y + v))
  const out = amount * gust(c.phase), inn = amount * gust((c.phase - lag + 1) % 1)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = at(x, y), share = h(y) + (tips && y < py - still ? tips * (Math.abs(x - px) / R) ** 3 : 0), o = Math.round(share * out)
    const n = tone && inside(x, y) ? Math.round(share * inn * (1 - tone + (tone * (lum(k) - lo)) / (hi - lo))) : o
    const s = n !== o && inside(x - n, y) ? at(x - n, y) : at(x - o, y)
    if (s !== k) c.px(x, y, s ? "#" + s.toString(16).padStart(8, "0") : "_")
  }
}
// the sways: a tree bent by the gust, or effect("sway")'s options
const WIND = {
  "trees._oak_td32": { bent: { amount: 4, still: 18, tone: 0.5, lag: 0.05 } }, "trees._momiji_td32": { bent: { amount: 4, still: 14, tone: 0.5, lag: 0.05 } },
  "nk._spruce_td32": { bent: { amount: 2, still: 20, power: 2.5, tips: 0.8 } },
  "isl.bush": { amount: 1, power: 1.5, still: 2, vary: 0.1 }, "isl._tuft": { amount: 1, power: 1, vary: 0.1 }, "isl.tuft_big": { amount: 1.5, power: 1, vary: 0.1 },
}
for (const [, n] of STAND) if (/tallgrass/.test(n)) WIND[n] = { amount: 3, power: 1, cycles: 2, vary: 0 }
const windy = (n) => `_wind_${n.replace(/\W/g, "_")}`
for (const [n, o] of Object.entries(WIND)) {
  const key = n.replace(/\W/g, "_"), cv = CANVAS[n]
  const src = cv ? (sprite(`_room_${key}`, { w: cv[0] + cv[4] + cv[5], h: cv[1], pivot: [cv[2] + cv[4], cv[3]] }, stamp(n, cv[2] + cv[4], cv[3])), `_room_${key}`) : n
  anim(windy(n), { base: src, frames: GUST, fps: 1000 / MS }, o.bent ? bent(src, o.bent) : effect("sway", o))
}

// topdown32's shadow (lib/profiles/topdown32.px.js, its `shadow`): a flat ellipse right under a thing's foot (its
// drawing's lowest row), no offset, its radii 0.36 and 0.1 of its width (at most 4 rows deep), one shade step; a
// house's a band its whole width along its foot, 10 rows deep, and a strip 4 px wide down its right side from its
// eaves. What lies flat (a tuft, a flower, the tall grass) none; the hero's where he is (as he stands, whatever his
// move), the pot's while it stands.
const SH = { wide: 0.36, deep: 0.1, most: 4, band: 10, strip: 4 }
const FLAT = /tuft|flower|tallgrass/
const standing = (t) => STAND.filter(([id, n]) => !FLAT.test(n) && (id !== "pot" || potUp(t))).concat(heroAt(t) ? [["hero", "hero.idle_down", ...heroAt(t).at]] : [])
const shadowsOf = (c) => standing(c.t).forEach(([, n, x, y]) => {
  const im = c.asset(n, { frame: 0 }), b = im.bounds(), [px, py] = im.pivot ?? [0, b.y + b.h - 1], foot = y + (b.y + b.h - 1) - py, left = x - px + b.x
  // a house's from its drawing's own edge: the band down from each column's lowest pixel (the plinth, the porch's
  // floor, the step) to its bottom, the strip from right under the eaves (the lowest row reaching its right edge) down,
  // in from each row's last pixel (the wall's corner post) out to its outer edge, so no ground shows between the house
  // and its shadow
  if (/cottage/.test(n)) {
    const at = (u, v) => v >= b.y && v < b.y + b.h && im.get(u, v), sx = x - px, sy = y - py, outer = left + b.w + SH.strip
    for (let u = b.x + 2; u < b.x + b.w + 2; u++) {
      let v = b.y + b.h - 1
      while (v >= b.y && !at(u, v)) v--
      const top = Math.max(v < b.y ? 0 : sy + v + 1, foot - SH.band)
      c.rect(sx + u, top, 1, foot + 4 - top, "k")
    }
    let eave = b.y + b.h - 1
    while (eave > b.y && !at(b.x + b.w - 1, eave)) eave--
    for (let r = sy + eave + 1; r <= foot + 1; r++) {
      let u = b.x + b.w - 1
      while (u >= b.x && !at(u, r - sy)) u--
      const x0 = u < b.x ? left + b.w : sx + u + 1
      c.rect(x0, r, outer - x0, 1, "k")
    }
    return
  }
  c.ellipse(left + b.w / 2 - 0.5, foot, Math.max(3, Math.round(b.w * SH.wide)), Math.max(1, Math.min(SH.most, Math.round(b.w * SH.deep))), "k")
})
// The ground rules, held by pxl check at every frame. What stands holds to land: the ground under a point is its
// nearest corner's (the corner sets draw each corner's terrain round it), and water holds nothing; no pixel of a prop
// or a figure on water, a tree's none in the 6 rows over its foot within 12 px of its trunk (a crown may hang over the
// shore, a foot may not). Nothing stands in the hero's way: no foot (a thing's 4 lowest rows) in the lane his feet
// walk, up the road's leg from the bottom edge and west along it out at the left. Then the relations the scene is made
// of: the barrel and the crate by the cottage's right corner, the lamp beside the pot and the pot just under the lane
// (while it is whole), the hero over it as he cuts it (on the road beside it, not on it).
const wet = (x, y) => CORNERS[Math.round(y / T)]?.[Math.round(x / T)] === "w"
const LANE = [[0, 194, 364, 14], [340, 194, 24, 94]], inLane = (x, y) => LANE.some(([a, b, w, h]) => x >= a && x < a + w && y >= b && y < b + h)
const WHOLE_UNTIL = [0, Math.ceil(HIT / MS) - 1]
const RULES = [
  ...STAND.filter(([, n]) => !FLAT.test(n)).map(([id, n, x, y]) => ({ inside: [id, /_td32/.test(n) && !/cottage|rock_td/.test(n) ? (px, py) => py < y - 6 || Math.abs(px - x) > 12 || !wet(px, py) : (px, py) => !wet(px, py)] })),
  ...STAND.filter(([, n]) => !FLAT.test(n)).map(([id, , , y]) => ({ inside: [id, (px, py) => py < y - 3 || !inLane(px, py)] })),
  { inside: ["hero", (px, py) => !wet(px, py)], frames: [0, walk.total * 2 - 1] },
  { beside: ["barrel", "house", { gap: [0, 4], side: "right" }] }, { beside: ["crate", "barrel", { side: "right" }] },
  { beside: ["lamp", "pot", { gap: [2, 8], side: "left" }], frames: WHOLE_UNTIL }, { beside: ["pot", LANE[0], { gap: [0, 4], side: "below" }], frames: WHOLE_UNTIL },
  { beside: ["hero", "pot", { gap: [2, 8], side: "above" }], frames: [walk.start("turn") * 2, walk.start("cut") * 2 - 1] },
]
scene("village32", { w: 16 * T, h: 9 * T, frames: L / MS, fps: 1000 / MS, world: { light: [-0.5, -1] }, expect: RULES },
  layer("ground", ground),
  layer("shadows", { shade: 1 }, shadowsOf),
  layer("props", { sort: "y" }, ...STAND.filter(([id]) => !MOVING.includes(id))
    .map(([id, n, x, y]) => (WIND[n] ? stamp(windy(n), x, y, { id, delay: Math.round((16 * T - x) * LAG) }) : stamp(n, x, y, { id, ...(id in DELAY ? { delay: DELAY[id] } : { frame: 0 }) }))), movers),
  // the game's display: three hearts, top left
  layer("hud", ...[0, 1, 2].map((i) => stamp("hearts.heart32", 6 + 16 * i, 6))))
