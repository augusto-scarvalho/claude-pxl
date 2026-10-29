// What is built into a platformer's level at a 16 px grid (lib/profiles/platformer16.px.js), seen from the side,
// drawn by hand to the numbers of Mega Man X2's and X3's stages and Symphony of the Night's maps (library F5's
// platformer kit study, numbers only): one-way platforms of planks (plat_l, plat, plat_r: 8 rows, a lit top row,
// the last row the wood's darkest, no line), a ladder (16 wide, a rung every 8 rows), spikes (two a tile, 11 rows
// over their bed, a cool steel lit on the left against a near-black: a hazard reads dark-lined), and a door the 32 px
// hero fits (32 x 48, 1.5x his height: an arch of stone round planks bound in iron). Each in its material's darkest
// (selout), the spikes in near-black. For any scene: include("<path>/lib/architecture/side.px.js", { as: "built" }),
// its palette its own; the ground they go with is lib/nature/side.px.js.
pal({
  e: "#3a2420", w: "#6b4430", W: "#9c6a40", L: "#d09a5c", t: "#f0cc8c",   // wood, dark to its lit top
  k: "#14121c", 1: "#3a4058", 2: "#6a7896", 3: "#aab8d2", 4: "#eef4ff",   // steel: the line, dark to the glint
  a: "#2a1a26", d: "#4a3036", h: "#6e4c40", l: "#957056", p: "#bb9370", u: "#e0c29a",   // stone (the ground's)
  i: "#2e2c3a", I: "#5a5870",                                              // iron
})
ramps("ewWLt", "k1234", "adhlpu")
// in a block: its names stay its own when a scene includes the file
{
// ---------------------------------------------------------------- one-way platforms
// A plank 8 rows at the tile's top (the surface the tile's top): its top row lit, 2 rows of the light, the body with
// grain in dashes, a seam at the tile's edge, the shade and the darkest under; the ends cut square, their edge the
// darkest, the end grain a ring a step lighter.
const plank = (x, y) => (y === 0 ? "t" : y < 3 ? (hash(x, y, 3) < 0.2 ? "W" : "L") : y < 6 ? (x === 15 ? "w" : hash(x >> 1, y, 5) < 0.25 ? "w" : "W") : y < 7 ? "w" : "e")
const platform = (end) => (c) => {
  for (let y = 0; y < 8; y++) for (let x = 0; x < 16; x++) {
    const s = end === "l" ? x : end === "r" ? 15 - x : 9
    if (s === 0 && (y === 0 || y === 7)) continue
    c.px(x, y, s === 0 ? "e" : s === 1 && y > 1 && y < 6 ? "L" : s === 1 && y > 0 ? "w" : plank(x, y))
  }
}
sprite("plat_l", { w: 16, h: 16 }, platform("l"))
sprite("plat", { w: 16, h: 16 }, platform(""))
sprite("plat_r", { w: 16, h: 16 }, platform("r"))
card("plat", { is: "a one-way platform of planks, 8 rows at the tile's top: a lit top row, grain in dashes, the darkest under; plat_l and plat_r its ends, cut square", cells: { "side/16": "✓" } })

// ---------------------------------------------------------------- the ladder
// 16 wide: two rails 3 px (lit in the middle, the darkest outside), a rung every 8 rows (lit top, body, shade)
sprite("ladder", { w: 16, h: 16 }, (c) => {
  for (let y = 0; y < 16; y++) for (const [x, k] of [[2, "e"], [3, "L"], [4, "w"], [11, "w"], [12, "L"], [13, "e"]]) c.px(x, y, k)
  for (const y of [3, 11]) for (let x = 5; x < 11; x++) { c.px(x, y, "t"); c.px(x, y + 1, "W"); c.px(x, y + 2, "e") }
})
card("ladder", { is: "a ladder 16 wide: two rails lit in their middle, a rung every 8 rows, lit on its top", cells: { "side/16": "✓" } })

// ---------------------------------------------------------------- spikes
// Two a tile, 11 rows tall, 7 wide at their foot, their tips at row 2; each lit on its left, a glint near its tip,
// its right in shade, the near-black round each; their bed 3 rows under them.
sprite("spikes", { w: 16, h: 16 }, (c) => {
  for (const cx of [4, 12]) for (let y = 2; y < 13; y++) {
    const hw = Math.floor((y - 2) / 3.4)
    for (let dx = -hw - 1; dx <= hw + 1; dx++) c.px(cx + dx, y, Math.abs(dx) === hw + 1 ? "k" : dx < 0 ? "3" : dx === 0 ? (y < 6 ? "4" : "2") : "1")
  }
  c.px(4, 1, "k"); c.px(12, 1, "k")
  c.rect(0, 13, 16, 1, "k"); c.rect(0, 14, 16, 2, "1"); for (const x of [2, 7, 10, 14]) c.px(x, 15, "k")
})
card("spikes", { is: "spikes, two a tile: 11 rows of steel lit on the left, a glint near each tip, a near-black line round them, on a bed", cells: { "side/16": "✓" } })

// ---------------------------------------------------------------- the door
// 32 x 48 (3 tiles, 1.5x the figure: Mega Man X's boss shutters 48 tall): a round arch of stone blocks 4 px thick,
// each block lit on its top, round a door of vertical planks 5 px wide in two tones, bound by two iron bands with
// rivets, an iron ring; the arch's outer edge the stone's darkest. The opening 24 wide, 40 tall.
sprite("door", { w: 32, h: 48, pivot: "bottom" }, (c) => {
  const inArch = (x, y, r) => (y >= 16 ? Math.abs(x - 15.5) <= r : (x - 15.5) ** 2 + (y - 16) ** 2 <= r * r)
  for (let y = 0; y < 48; y++) for (let x = 0; x < 32; x++) {
    if (!inArch(x, y, 16)) continue
    if (inArch(x, y, 12)) {   // the door
      const plank = Math.floor((x - 4) / 5), seam = (x - 4) % 5 === 4, band = y === 19 || y === 20 || y === 37 || y === 38
      c.px(x, y, band ? (y === 19 || y === 37 ? "I" : "i") : seam ? "e" : !inArch(x, y - 1, 12) ? "e" : plank % 2 ? "w" : hash(x, y >> 2, 2) < 0.2 ? "w" : "W")
      if (band && (x - 4) % 5 === 2 && (y === 19 || y === 37)) c.px(x, y, "3")
    } else {   // the arch's stone: blocks 4 deep, their joints radial, each lit on its top (the one toward the light)
      const edge = !inArch(x - 1, y, 16) || !inArch(x + 1, y, 16) || !inArch(x, y - 1, 16)
      const ang = y >= 16 ? 99 : Math.atan2(y - 16, x - 15.5), joint = y >= 16 ? (y - 16) % 8 === 7 : Math.round(((ang + Math.PI) / Math.PI) * 9 * 2) % 2 === 0 && Math.abs(((ang + Math.PI) / Math.PI) * 9 - Math.round(((ang + Math.PI) / Math.PI) * 9)) < 0.08
      c.px(x, y, edge ? "a" : joint ? "d" : (y >= 16 ? (y - 16) % 8 === 0 : !inArch(x, y - 1, 15)) ? "u" : hash(x, y, 4) < 0.2 ? "h" : "l")
    }
  }
  c.rect(19, 27, 3, 1, "i"); c.px(18, 28, "i"); c.px(22, 28, "i"); c.px(18, 29, "i"); c.px(22, 29, "i"); c.rect(19, 30, 3, 1, "i"); c.px(19, 28, "I")
  c.rect(4, 47, 24, 1, "d")
})
card("door", { is: "a door the 32 px hero fits, 32 x 48: a round arch of stone blocks lit on their tops round planks bound by two iron bands, an iron ring", cells: { "side/16": "✓" } })
}
