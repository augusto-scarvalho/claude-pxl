// A walker for a platformer at a 16 px grid (lib/profiles/platformer16.px.js): a beetle 22 x 15, a little under half
// the 32 px hero (Mega Man X's small enemies are 14-16 px, its walkers 29-35), drawn by hand: a domed shell in
// segments lit on its top (a glint), a head with a big yellow eye and feelers, three legs a side; its walk 4 frames at
// 120 ms (a tripod gait: the front and back legs, then the middle; the body up a pixel as they pass). Its line the
// genre's for characters, near-black all round (Mega Man X's enemies: 73-100% of their edge), so it reads against
// the ground as the hero does. Facing e, as every sheet in the genre (the game flips it). For any scene:
// include("<path>/lib/characters/beetle.px.js", { as: "beetle" }), its palette its own.
pal({
  k: "#1a1620",                                          // the line (platformer16's ink for characters)
  D: "#5e1638", S: "#a82c56", s: "#e2606c", g: "#ffc8b4", // the shell: dark, body, lit, the glint
  h: "#3e3a5a", H: "#6e6a94", y: "#ffe060",               // head and legs, their light; the eye
})
ramps("DSsg", "hH")
// in a block: its names stay its own when a scene includes the file
{
// a frame: the body up `bob` px, each leg [x at the body, x of the foot] (back to front), the near legs lighter
const shell = (c, bob) => {
  for (let x = 2; x <= 16; x++) {
    const top = Math.round(9 - 7 * Math.sqrt(Math.max(0, 1 - ((x - 9) / 7.6) ** 2))) - bob
    for (let y = top; y <= 9 - bob; y++) {
      const r = y - top
      c.px(x, y, r === 0 ? "s" : r === 1 && x > 4 && x < 13 ? "s" : y >= 8 - bob ? "D" : (x - 1) % 4 === 0 && r > 1 ? "D" : "S")
    }
  }
  c.px(7, 3 - bob, "g"); c.px(8, 3 - bob, "g"); c.px(6, 4 - bob, "g")
  // the head: a block in front of the shell, its eye, a feeler, the jaw
  c.rect(16, 5 - bob, 4, 5, "h"); c.rect(16, 5 - bob, 4, 1, "H"); c.px(20, 7 - bob, "h"); c.px(20, 8 - bob, "h")
  c.px(18, 6 - bob, "y"); c.px(18, 7 - bob, "y"); c.px(19, 6 - bob, "k"); c.px(19, 7 - bob, "y")
  c.line(18, 4 - bob, 20, 2 - bob, "H"); c.px(21, 9 - bob, "H")
}
const legs = (c, bob, L) => L.forEach(([x0, x1], i) => { c.line(x0, 10 - bob, Math.round((x0 + x1) / 2), 11, i % 2 ? "H" : "h"); c.line(Math.round((x0 + x1) / 2), 11, x1, 13, i % 2 ? "H" : "h") })
const STEPS = [
  [[5, 2], [10, 12], [14, 17]],
  [[5, 4], [10, 10], [14, 15]],
  [[5, 7], [10, 8], [14, 13]],
  [[5, 4], [10, 10], [14, 15]],
]
anim("beetle_walk", { w: 22, h: 14, pivot: "bottom", outline: "k" }, ...STEPS.map((L, i) => frame({ ms: 120 }, (c) => { const bob = i % 2; legs(c, bob, L); shell(c, bob) })))
card("beetle_walk", { is: "a beetle that walks, 24 x 16 with its line: a domed shell in segments lit on its top, a head with a yellow eye and a feeler, three legs a side in a tripod gait; 4 frames at 120 ms, facing e, near-black all round", cells: { "side/16": "✓" } })
}
