// A dialogue box as HD-2D games draw theirs (Triangle Strategy above all), for bubble(): parchment, its
// corners cut; a warm beige with faint fibers running across it, darker toward its edges as old paper
// is, a light line just inside its thin brown outline (a 9-slice); a short tail down to the speaker (its
// top rows the box's bottom edge, opened where it joins); the speaker's name over a rule that starts at
// a small diamond, its end lighter; the words in the 5x7 letters (include font5x7.px.js beside it), a
// dark sepia; a blue-grey mark in its lower right corner that more is coming, bobbing a pixel and
// blinking off as a game's prompt does (10 frames). In pixels finer than the art's (3 of the picture's
// to the art's 4), as a game's interface is. Taken with include("<path>/lib/ui/dialog.px.js", { as:
// "dialog" }) by the hd2d graveyard and harbor: c.bubble(x, y, name, lines, { ...dialog.PARCHMENT, side,
// t }) (its sprites by own(): under the include's as).
const dialog = {}
// in a block: its names stay its own when a scene includes the file
{
const PARCH = (i, j, d) => (d === 1 ? "#6e5a43" : d === 2 ? "#f4ecda" : hash(i >> 3, j) < 0.12 || hash(i >> 1, j * 7) < 0.06 ? (d <= 4 ? "#d8c6a2" : "#e3d5b8") : d <= 4 ? "#dfcfae" : "#ebdfc4")
// how far in from the edge (1 the outline), up to 5
const depthIn = (inside, i, j) => { let d = 1; while (d < 5 && [[d, 0], [-d, 0], [0, d], [0, -d]].every(([dx, dy]) => inside(i + dx, j + dy))) d++; return d }
sprite("_parchment", { w: 68, h: 40, slice: 10 }, (c) => {
  const inside = (i, j) => i >= 0 && j >= 0 && i < 68 && j < 40 && i + j >= 5 && 67 - i + j >= 5 && i + 39 - j >= 5 && 67 - i + 39 - j >= 5
  for (let j = 0; j < 40; j++) for (let i = 0; i < 68; i++) if (inside(i, j)) c.px(i, j, PARCH(i, j, depthIn(inside, i, j)))
})
sprite("_parchment_tail", { w: 19, h: 19 }, (c) => {
  const tip = new Set()
  for (let r = 1; r <= 9; r++) { const half = 4 * (1 - r / 9); for (let i = Math.round(9 - half); i <= Math.round(9 + half); i++) tip.add(`${i},${9 + r}`) }
  const box = (i, j) => j <= 9, inside = (i, j) => box(i, j) || tip.has(`${i},${j}`)
  for (let j = 0; j < 19; j++) for (let i = 0; i < 19; i++) {
    if (!inside(i, j)) continue
    const d = depthIn(inside, i, j)
    if (j > 9 || d !== depthIn(box, i, j)) c.px(i, j, PARCH(i, j, d))
  }
})
sprite("_parchment_rule", { w: 24, h: 3, slice: [3, 0, 20, 0] }, (c) => {
  c.px(0, 1, "#8c7457"); c.rect(1, 0, 1, 3, "#8c7457"); c.px(2, 1, "#8c7457"); c.px(3, 1, "#8c7457"); c.rect(4, 1, 20, 1, "#b9a483")
})
anim("_parchment_more", { w: 7, h: 6, frames: 10 }, (c) => {
  const D = "#4f6382", L = "#9db0cc", y = c.frame >= 4 && c.frame < 8 ? 1 : 0
  if (c.frame < 8) { c.rect(0, y, 7, 1, D); c.px(1, y + 1, D); c.px(5, y + 1, D); c.rect(2, y + 1, 3, 1, L); c.px(2, y + 2, D); c.px(4, y + 2, D); c.px(3, y + 2, L); c.px(3, y + 3, D) }
  c.rect(0, 5, 7, 1, D)
})
card("_parchment", { is: "an HD-2D dialogue box: parchment with its corners cut, faint fibers, darker toward its edges, a tail, the name's rule, a blinking more mark", cells: { "hd2d/24ppm": "✓" },
  vary: { part: "its pieces: _parchment (a 9-slice), _parchment_tail, _parchment_rule, _parchment_more; bubble() takes dialog.PARCHMENT" } })
dialog.PARCHMENT = { panel: own("_parchment"), tail: own("_parchment_tail"), rule: own("_parchment_rule"), more: own("_parchment_more"), font: "5x7", color: ["#4a3a2c", "#3a2f27"], unit: 0.75 }
}
