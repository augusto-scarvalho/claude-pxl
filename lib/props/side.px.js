// Props and a pickup for a platformer at a 16 px grid (lib/profiles/platformer16.px.js), seen from the side, drawn
// by hand at the 32 px figure's scale (library F5's platformer kit study, numbers only): a crate (a tile), a lamp
// post (42 px with its line, the genre's 2.5 tiles: its glass the brightest), each lined in its material's darkest
// (selout), and a coin (16 x 16, 6 frames at 80 ms, its width 16, 14, 8, 2, 8, 14: a spin; the metal's own dark for
// its line, a pale bevel and one white glint on top, as Dawn of Sorrow's coins; coin_small at 8 x 8). For any scene:
// include("<path>/lib/props/side.px.js", { as: "props" }), its palette its own.
pal({
  e: "#3a2420", w: "#6b4430", W: "#9c6a40", L: "#d09a5c", t: "#f0cc8c",   // wood (lib/architecture/side.px.js's)
  i: "#2e2c3a", I: "#5a5870", j: "#8c8aa4",                                // iron
  g: "#f0a83c", G: "#ffe08a", H: "#fff8e0",                                // the lamp's glass: its edge, light, the flame's heart
  o: "#8a4a14", y: "#e89a24", Y: "#ffd23e", P: "#fff2a8", Q: "#ffffff",    // gold: line, dark, body, pale, glint
})
ramps("ewWLt", "iIj", "oyYPQ")
// in a block: its names stay its own when a scene includes the file
{
// ---------------------------------------------------------------- the crate
// 16 x 16, a tile: a frame of boards 2 px round a panel, a brace from foot to corner, its top board lit, nails at
// the corners, the wood's darkest round it.
sprite("crate", { w: 16, h: 16, pivot: "bottom" }, (c) => {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const rim = x === 0 || x === 15 || y === 0 || y === 15, frame = x < 3 || x > 12 || y < 3 || y > 12
    const brace = Math.abs(x - 2 - (12 - y)) < 1.5 && !frame
    c.px(x, y, rim ? "e" : y === 1 ? "t" : frame ? (y < 3 ? "L" : x < 3 ? "W" : x > 12 ? "w" : "W") : brace ? (x - 2 - (12 - y) < 0 ? "L" : "W") : (x + 1) % 4 === 0 ? "e" : "w")
  }
  for (const [x, y] of [[2, 2], [13, 2], [2, 13], [13, 13]]) c.px(x, y, "e")
})
card("crate", { is: "a crate, a tile: a frame of boards round a dark panel of planks, a brace across, its top board lit, the wood's darkest round it", cells: { "side/16": "✓" } })

// ---------------------------------------------------------------- the lamp
// 40 tall and 42 with its line (2.5 tiles, 1.3x the figure), 12 wide at its head: an iron post 2 px on a foot, a
// lantern of bars round a warm glass (the flame's heart the brightest pixel of a scene), its cap lit on top; the
// iron's darkest round it.
sprite("lamp", { w: 10, h: 40, pivot: "bottom", outline: "i" }, (c) => {
  c.rect(4, 12, 2, 25, "I"); c.rect(4, 12, 1, 25, "j"); c.rect(2, 37, 6, 3, "I"); c.rect(2, 37, 6, 1, "j"); c.rect(1, 39, 8, 1, "i")
  c.rect(1, 2, 8, 2, "I"); c.rect(2, 1, 6, 1, "j"); c.rect(4, 0, 2, 1, "I")             // the cap
  c.rect(2, 4, 6, 7, "G"); c.rect(3, 5, 4, 5, "H"); c.rect(2, 9, 6, 2, "g")              // the glass, warm
  for (const x of [1, 8]) c.rect(x, 4, 1, 7, "i"); c.rect(1, 11, 8, 1, "i"); c.rect(3, 12, 4, 1, "I")
  c.px(4, 6, "Q")
})
card("lamp", { is: "a lamp post 42 tall: an iron post on a foot, a lantern of bars round a warm glass, its cap lit, the iron's darkest round it", cells: { "side/16": "✓" } })

// ---------------------------------------------------------------- the coin
// 16 x 16, 6 frames at 80 ms: its face's width 16, 14, 8, 2, 8, 14 (a spin, the steps biggest near edge-on;
// characters §12's): a rim the gold's dark on its lower right and its body elsewhere, a bevel inside it pale on the
// upper left, the face its body with a ring struck in it, a white glint high on the left; edge-on, a bar lit on its
// left.
anim("coin", { w: 16, h: 16, pivot: "bottom" }, ...[16, 14, 8, 2, 8, 14].map((wd) => frame({ ms: 80 }, (c) => {
  const S = 16, cx = 8, rx = wd / 2, ry = 8, x0 = (S - wd) / 2
  const inside = (x, y) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - ry) / ry) ** 2 <= 1.05
  const out = (x, y, n) => [[n, 0], [-n, 0], [0, n], [0, -n]].some(([i, j]) => !inside(x + i, y + j))
  for (let y = 0; y < S; y++) for (let x = x0; x < x0 + wd; x++) {
    if (!inside(x, y)) continue
    const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - ry) / ry, low = dx + dy > 0.2, d = Math.hypot(dx, dy)
    if (wd === 2) { c.px(x, y, y === 0 || y === S - 1 ? "o" : x < cx ? "P" : "y"); continue }
    c.px(x, y, out(x, y, 1) ? (low ? "o" : "y") : out(x, y, 2) ? (low ? "y" : "P") : Math.abs(d - 0.5) < 0.09 ? "y" : dx + dy < -0.9 ? "P" : "Y")
  }
  if (wd >= 4) { const gx = Math.round(cx - rx * 0.45), gy = Math.round(ry * 0.45); c.px(gx, gy, "Q"); if (wd > 8) c.px(gx, gy + 1, "P") }
})))
// coin_small: the first coin, 8 x 8 (width 8, 6, 4, 2, 4, 6), for a smaller pickup or a counter: the rim the gold's
// dark, the face its body, a pale arc on its upper left and a white glint, its lower right the dark.
anim("coin_small", { w: 8, h: 8, pivot: "bottom" }, ...[8, 6, 4, 2, 4, 6].map((wd) => frame({ ms: 80 }, (c) => {
  const x0 = (8 - wd) / 2, rx = wd / 2, cx = 4
  for (let y = 0; y < 8; y++) for (let x = x0; x < x0 + wd; x++) {
    const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - 4) / 4
    if (dx * dx + dy * dy > 1.15) continue
    const rim = (Math.abs(dx) + 0.55 / rx) ** 2 + (dy + (dy > 0 ? 0.28 : -0.28)) ** 2 > 1.05 || wd === 2
    c.px(x, y, wd === 2 ? (x === 3 ? "Y" : "y") : rim ? (dx + dy > 0.5 ? "o" : "y") : dx + dy < -0.6 ? "P" : dx + dy > 0.7 ? "y" : "Y")
  }
  if (wd >= 4) c.px(cx - (wd >= 6 ? 2 : 1), 2, "Q")
})))
card("coin", { is: "a gold coin 16 x 16 that spins, 6 frames at 80 ms (its width 16, 14, 8, 2, 8, 14): a rim dark on its lower right, a pale bevel, a ring struck in its face, a white glint", cells: { "side/16": "✓" } })
card("coin_small", { is: "the coin at 8 x 8, 6 frames at 80 ms (its width 8, 6, 4, 2, 4, 6): its rim the gold's dark, a pale arc and a white glint on its upper left", cells: { "side/16": "✓" } })
}
