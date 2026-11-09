// A fighting game's HUD for the fighting profile's 320 x 224 screen (lib/profiles/fighting.px.js), in two styles from
// the shrine: lacquer and gold (the torii's: a black lacquer beam over each bar, its outer end turned up, the bar framed
// in vermilion, the life gold; the timer gold on a lacquer plaque; magatama for the rounds) and paper and ink (the
// shide's and the ema's: each bar a strip of washi edged in sumi, its outer end torn, the life indigo; the timer in ink
// on a paper disc rimmed in cinnabar; red seals for the rounds). Its places are the library's fighting study's (14.3,
// 14.5: the screenpacks' fight.def measured): two bars of 128 x 6 at the top, 12 px from the edges, 36 px apart for the
// timer; the names in the 5x7 under them by their outer ends; two round markers by each name.
// Made as MUGEN's fight.def builds a lifebar, in pieces an engine puts together: the back (the frame and what shows
// empty), the lag (the part just lost, which falls after) and the front (the life), each the whole bar's length; the
// engine crops the front to the life and the lag to what it held, both from the middle end (the bars anchored at the
// middle, draining from the outer end), and draws back, lag, front. P1's pieces as drawn, P2's the same flipped about
// their pivot. The timer: its plate and the digits 0-9, 12 x 16, the 5x7's drawn twice their size by Scale2x and
// mended by hand (DIGITS), lit in their top half and outlined. The round markers, empty and won. Where each piece goes,
// and the lag's timing, as data: fightHud.LAYOUT[style], also on the frame hud_<style> of the sheet fight_hud_<style>
// (its `data`, in the sheet's JSON), that frame the whole HUD drawn at a round's start.
// Taken with include("<path>/lib/ui/fight_hud.px.js", { as: "hud" }): hud.hud_lacquer_bar_back, ..._bar_lag,
// ..._bar_front, ..._timer, ..._digit_0 to _9, ..._round_empty, ..._round_won, hud.hud_lacquer (and hud_paper_*);
// fightHud.draw(c, style, state) draws it in a scene's function ({ life: [p1, p2], lag, time: "60", names, wins }).
include("font5x7.px.js")
var fightHud = {}
// in a block: its names stay its own when a scene includes the file
{
const W = 320, BAR = { w: 128, h: 6, top: 12, edge: 12 }
const X0 = BAR.edge + 1, MID = X0 + BAR.w   // P1's fill's left column; its middle end, the pieces' pivot column
// the digits: the 5x7's drawn twice their size by Scale2x (a 1 px stroke to 2 px, its stair-steps kept single), then
// mended by hand where Scale2x left a blob or a kink: 1's flag, 2's tail, 4's crossbar and its foot, 5's and 7's tops
const DIGITS = {
  0: "..######.. .########. ###....### ##......## ##......## ##......## ##......## ##......## ##......## ##......## ##......## ###....### .########. ..######..",
  1: "....##.... ...###.... ..####.... .##.##.... ....##.... ....##.... ....##.... ....##.... ....##.... ....##.... ....##.... ....##.... ..######.. ..######..",
  2: "..######.. .########. ###....### ##......## ........## .......### ......###. .....###.. ....###... ...###.... ..###..... .###...... ########## ##########",
  3: "########.. #########. .......### ........## ........## .......### ..######.. ..######.. .......### ........## ........## .......### #########. ########..",
  4: "......##.. .....###.. ....####.. ...##.##.. ..##..##.. .##...##.. ##....##.. ##....##.. ########## ########## ......##.. ......##.. ......##.. ......##..",
  5: "########## ########## ##........ ##........ ########.. #########. .......### ........## ........## ........## ##......## ###....### .########. ..######..",
  6: "....####.. ...#####.. ..###..... .###...... ##........ ##........ ########.. #########. ###....### ##......## ##......## ###....### .########. ..######..",
  7: "########## ########## ........## ........## ......###. .....###.. ....###... ...###.... ..###..... ..##...... ..##...... ..##...... ..##...... ..##......",
  8: "..######.. .########. ###....### ##......## ##......## ###....### ..######.. ..######.. ###....### ##......## ##......## ###....### .########. ..######..",
  9: "..######.. .########. ###....### ##......## ##......## ###....### .######### ..######## ........## ........## ......###. .....###.. ..#####... ..####...." }
// each style: the bar's fills [top row, middle rows, bottom row] (full, lost, empty), its frame, the timer's, the
// digits' [lit, shade, ink], the names', the markers'
const STYLES = {
  lacquer: { full: ["#f6dc7c", "#d9ab2e", "#a2741a"], lost: ["#f59a63", "#c3432f", "#8c2a27"], empty: ["#3a3442", "#24202a", "#24202a"], digit: ["#f6dc7c", "#d9ab2e", "#2a1414"],
    frame: "#8c2a27", beam: "#1c1820", beamLit: "#3a3442", rim: "#a2741a", name: { color: "#f2e8d6", shadow: "#1c1418" } },
  paper: { full: ["#5a6ea4", "#34467a", "#24305a"], lost: ["#e05b2d", "#c3432f", "#8c2a27"], empty: ["#f6efdc", "#e8dcc0", "#d4c6a6"], digit: ["#1e1a22", "#3a3442", "#f6efdc"],
    ink: "#1e1a22", paper: "#f6efdc", seal: "#c3432f", ghost: "#8a7e70", rim: ["#8c2a27", "#c3432f"], name: { color: "#1e1a22", slip: { border: "#1e1a22", fill: "#f6efdc", pad: [2, 2] } } } }
// a fill `n` px long ending at column `end` (P1's way: the middle end on the right), its rows by the fill's colors
const fill = (c, end, y, n, col) => { for (let i = 0; i < n; i++) for (let r = 0; r < BAR.h; r++) c.px(end - 1 - i, y + r, col[r === 0 ? 0 : r < BAR.h - 1 ? 1 : 2]) }

for (const [st, S] of Object.entries(STYLES)) {
  // ---------------------------------------------------------------- the bar: back, lag, front (P1's; pivot the middle end)
  // (each piece's pivot: the column just past the fill's middle end, the fill's top row: the layout's bar point)
  if (st === "lacquer") {
    // the back: the vermilion frame, the black lacquer beam 2 px over the bar, 3 px past each end, its outer end turned
    // up 2 px over 7, the bar empty; 134 x 13, the fill's top row 6 down
    sprite(`hud_${st}_bar_back`, { w: BAR.w + 6, h: BAR.h + 7, pivot: [BAR.w + 3, 6] }, (c) => {
      c.rect(2, 5, BAR.w + 2, BAR.h + 2, S.frame); fill(c, BAR.w + 3, 6, BAR.w, S.empty)
      c.rect(0, 2, BAR.w + 6, 2, S.beam); c.rect(0, 2, BAR.w + 6, 1, S.beamLit)
      for (let i = 0; i < 7; i++) { const up = i < 3 ? 2 : i < 5 ? 1 : 0; for (let u = 1; u <= up; u++) c.px(i, 2 - u, S.beam) } })
  } else {
    // the back: the strip of paper a px past the bar all round, edged in ink, its outer end torn (the fibers), the bar
    // empty paper; 132 x 10, the fill's top row 2 down
    sprite(`hud_${st}_bar_back`, { w: BAR.w + 4, h: BAR.h + 4, pivot: [BAR.w + 2, 2] }, (c) => {
      c.rect(0, 0, BAR.w + 4, BAR.h + 4, S.ink); c.rect(1, 1, BAR.w + 2, BAR.h + 2, S.paper); fill(c, BAR.w + 2, 2, BAR.w, S.empty)
      for (let r = 0; r < BAR.h + 4; r += 2) c.px(0, r + (r % 4 ? 1 : 0), S.paper) })
  }
  sprite(`hud_${st}_bar_lag`, { w: BAR.w, h: BAR.h, pivot: [BAR.w, 0] }, (c) => fill(c, BAR.w, 0, BAR.w, S.lost))
  sprite(`hud_${st}_bar_front`, { w: BAR.w, h: BAR.h, pivot: [BAR.w, 0] }, (c) => fill(c, BAR.w, 0, BAR.w, S.full))
  // ---------------------------------------------------------------- the timer: its plate and its digits
  if (st === "lacquer") sprite(`hud_${st}_timer`, { w: 30, h: 25 }, (c) => { c.rect(0, 0, 30, 25, S.rim); c.rect(1, 1, 28, 23, S.beam); c.rect(1, 1, 28, 1, S.beamLit) })
  else sprite(`hud_${st}_timer`, { w: 31, h: 31 }, (c) => { c.circ(15, 15, 15, S.rim[0]); c.circ(15, 15, 14, S.rim[1]); c.circ(15, 15, 12, S.paper) })
  // a digit 12 x 16: the mended glyph, lit in its top half, its ink all round it
  for (const [n, g] of Object.entries(DIGITS)) {
    const rows = g.split(" "), on = (x, y) => rows[y - 1]?.[x - 1] === "#", [hi, lo, ink] = S.digit
    sprite(`hud_${st}_digit_${n}`, { w: 12, h: 16 }, (c) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 12; x++) {
      if (on(x, y)) c.px(x, y, y < 8 ? hi : lo)
      else if ([[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]].some(([a, b]) => on(x + a, y + b))) c.px(x, y, ink) } })
  }
  // ---------------------------------------------------------------- the round markers: empty and won
  if (st === "lacquer") {
    // a magatama, 6 x 7: gold when won, lacquer when not
    const MAGA = ["..ggg.", ".gGGGg", "gGG.Gg", "gGGGGg", ".gGGg.", "..gg..", ".g...."]
    for (const [k, [g, G]] of [["empty", [S.beam, S.beamLit]], ["won", [S.rim, S.full[0]]]]) sprite(`hud_${st}_round_${k}`, { w: 6, h: 7 }, (c) => MAGA.forEach((r, y) => [...r].forEach((v, x) => v !== "." && c.px(x, y, v === "g" ? g : G))))
  } else {
    // a seal, 7 x 7: red with its white mark when won, a pale square when not
    sprite(`hud_${st}_round_empty`, { w: 7, h: 7 }, (c) => { c.rect(0, 0, 7, 7, S.ghost); c.rect(1, 1, 5, 5, S.paper) })
    sprite(`hud_${st}_round_won`, { w: 7, h: 7 }, (c) => { c.rect(0, 0, 7, 7, S.seal); c.rect(2, 2, 3, 3, S.paper); c.px(3, 3, S.seal) })
  }
}

// ---------------------------------------------------------------- where each piece goes on the screen: the layout
// Points on the 320 x 224 screen (x right, y down). bars: each bar's pieces stamped by their pivot on its point, P2's
// flipped (flip: true), the front cropped to life x length px and the lag to what it held, from that point outward;
// the lag waits `lag.wait` ticks after the last hit, then falls `lag.speed` px a tick until it meets the front (14.5).
// timer: the plate's top-left, each digit's top-left (tens, ones). names: the 5x7 (lib/ui/font5x7.px.js) at its point,
// P1's left-aligned from it, P2's right-aligned to it (the point its last column), its color and its shadow (a copy a
// px down and right) or its slip (a rect `pad` px round the text, its border and fill). rounds: each marker's top-left,
// the first nearest the middle, won or empty
const LAYOUT = Object.fromEntries(Object.entries(STYLES).map(([st, S]) => [st, {
  screen: [320, 224],
  bars: { length: BAR.w, p1: { at: [MID, BAR.top], flip: false }, p2: { at: [W - 1 - MID, BAR.top], flip: true }, pieces: ["back", "lag", "front"] },
  lag: { wait: 30, speed: 1 },
  timer: st === "lacquer" ? { plate: [145, 4], digits: [[148, 9], [160, 9]] } : { plate: [145, 2], digits: [[148, 9], [160, 9]] },
  names: { font: "5x7", p1: { at: [X0, BAR.top + BAR.h + (st === "lacquer" ? 3 : 5)], align: "left" }, p2: { at: [W - 1 - X0, BAR.top + BAR.h + (st === "lacquer" ? 3 : 5)], align: "right" }, ...S.name },
  rounds: st === "lacquer" ? { p1: [[MID - 8, 21], [MID - 17, 21]], p2: [[W - MID + 2, 21], [W - MID + 11, 21]] } : { p1: [[MID - 8, 22], [MID - 17, 22]], p2: [[W - MID + 1, 22], [W - MID + 10, 22]] },
}]))

// ---------------------------------------------------------------- the HUD drawn in a scene (as an engine would)
// state: life and lag [p1, p2] 0..1, time two digits, names, wins [p1, p2]
const draw = (c, st, { life = [1, 1], lag = life, time = "60", names = ["P1", "P2"], wins = [0, 0] } = {}) => {
  const L = LAYOUT[st], S = STYLES[st]
  for (const k of [0, 1]) {
    const { at, flip } = L.bars[k ? "p2" : "p1"], dir = flip ? 1 : -1
    c.stamp(`hud_${st}_bar_back`, ...at, flip ? { flip: "x" } : {})
    // (the lag and the front: the piece's own columns from the middle end, as many as they hold)
    for (const [piece, v] of [["lag", lag[k]], ["front", life[k]]]) { const n = Math.round(BAR.w * v), A = c.asset(`hud_${st}_bar_${piece}`), D = A.data
      for (let i = 0; i < n; i++) for (let r = 0; r < BAR.h; r++) { const p = D[r * A.w + BAR.w - 1 - i]; if ((p & 255) >= 128) c.px(at[0] + (flip ? i : -1 - i), at[1] + r, "#" + (p >>> 8).toString(16).padStart(6, "0")) } }
    const N = L.names, nm = N[k ? "p2" : "p1"], tw = names[k].length * 6 - 1, tx = nm.align === "left" ? nm.at[0] : nm.at[0] - tw + 1
    if (N.shadow) c.text(tx + 1, nm.at[1] + 1, names[k], N.shadow, { font: "5x7" })
    if (N.slip) { const [px, py] = N.slip.pad; c.rect(tx - px, nm.at[1] - py, tw + 2 * px, 7 + 2 * py, N.slip.border); c.rect(tx - px + 1, nm.at[1] - py + 1, tw + 2 * px - 2, 7 + 2 * py - 2, N.slip.fill) }
    c.text(tx, nm.at[1], names[k], N.color, { font: "5x7" })
    L.rounds[k ? "p2" : "p1"].forEach(([x, y], i) => c.stamp(`hud_${st}_round_${i < wins[k] ? "won" : "empty"}`, x, y))
  }
  c.stamp(`hud_${st}_timer`, ...L.timer.plate); L.timer.digits.forEach(([x, y], i) => c.stamp(`hud_${st}_digit_${time[i]}`, x, y))
}
// the whole HUD at a round's start, the layout on its frame for an engine
for (const st of Object.keys(STYLES)) {
  sprite(`hud_${st}`, { w: 320, h: 224 }, (c) => { draw(c, st, { names: ["REVA", "HALDOR"] }); c.setData({ layout: LAYOUT[st] }) })
  sheet(`fight_hud_${st}`, [`hud_${st}_bar_*`, `hud_${st}_timer`, `hud_${st}_digit_*`, `hud_${st}_round_*`, `hud_${st}`], { pad: 1 })
}
card("hud_lacquer", { is: "a fighting game's HUD in lacquer and gold for the 320 x 224 screen: two life bars on black lacquer beams with their lag, a gold timer on a lacquer plaque, the names in the 5x7, magatama for the rounds; its pieces apart for an engine (back, lag, front, the timer's plate and digits, the markers) and its layout as data", cells: { "side/?": "✓" },
  vary: { part: "the pieces hud_lacquer_bar_back, _bar_lag, _bar_front, _timer, _digit_0 to _9, _round_empty, _round_won on the sheet fight_hud_lacquer; fightHud.LAYOUT.lacquer, on the frame hud_lacquer's data" } })
card("hud_paper", { is: "a fighting game's HUD in paper and ink for the 320 x 224 screen: two life bars on strips of washi edged in sumi with their lag, the timer in ink on a paper disc rimmed in cinnabar, the names in the 5x7 on paper slips, red seals for the rounds; its pieces apart for an engine and its layout as data", cells: { "side/?": "✓" },
  vary: { part: "the pieces hud_paper_bar_back, _bar_lag, _bar_front, _timer, _digit_0 to _9, _round_empty, _round_won on the sheet fight_hud_paper; fightHud.LAYOUT.paper, on the frame hud_paper's data" } })
Object.assign(fightHud, { STYLES, LAYOUT, DIGITS, draw })
}
