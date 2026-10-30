// A bat for a platformer at a 16 px grid (lib/profiles/platformer16.px.js), seen from the side and a little from
// below, flying: 16 x 10 with its line, a third of the 32 px hero's height (Castlevania's bats 16 x 8 to 16 x 12),
// drawn by hand: a round body and head, two pointed ears, red eyes, wings of membrane on fingers, scalloped along
// their trailing edge; 4 frames at 90 ms (the wings up, level, down, level), the body bobbing a pixel against the
// beat. Its line the genre's for characters, near-black all round (as the beetle's), so it reads against a night
// sky. Symmetric (`mx`). For any scene: include("<path>/lib/characters/bat.px.js", { as: "bat" }), its palette its
// own.
pal({
  k: "#1a1620",                                 // the line (platformer16's ink for characters)
  D: "#3a2440", S: "#5e3a5e", s: "#8a5a7a",     // the membrane's dark, the body, its lit
  r: "#ff4a4a",                                 // the eyes
})
ramps("DSs")
// in a block: its names stay its own when a scene includes the file
{
// a frame, the left half (8 columns; the body at 6-7): the wing's tip row at its outer end, the body's bob
const wing = (tip, bob) => (c) => {
  for (let x = 0; x < 6; x++) {
    const t = x / 6, top = Math.round(tip + (3 + bob - tip) * t), thick = 1 + Math.round(3 * t) - (x === 2 || x === 4 ? 1 : 0)
    for (let y = top; y < top + thick; y++) c.px(x, y, y === top ? "S" : "D")
  }
  c.rect(6, 3 + bob, 2, 4, "S"); c.px(7, 3 + bob, "s"); c.px(6, 2 + bob, "S"); c.px(6, 4 + bob, "r"); c.px(7, 6 + bob, "D")
}
anim("bat_fly", { w: 16, h: 10, mx: true, outline: "k" }, ...[[0, 1], [3, 0], [7, 0], [3, 1]].map(([tip, bob]) => frame({ ms: 90 }, wing(tip + 1, bob + 1))))
card("bat_fly", { is: "a bat flying, 18 x 12 with its line: a round body, pointed ears, red eyes, wings scalloped along their trailing edge; 4 frames at 90 ms (up, level, down, level), near-black all round", cells: { "side/16": "✎" } })
}
