// The harbor's crew (lib/characters/crew.px.js), to look at: every head in its five views (a row each,
// Alden's first to hold them against), and the crew standing turned s, sw and w.
include("../../lib/characters/crew.px.js", { palette: true })
scene("crew_heads", { w: 5 * 20 + 4, h: 6 * 18 + 4, bg: "#3c4250" }, ...["tr", ...Object.keys(crew.HAIRS)].flatMap((set, r) => ["s", "sw", "w", "nw", "n"].map((v, k) => stamp(`_${set}_head_${v}`, 12 + k * 20, 10 + r * 18))))
scene("crew_standing", { w: crew.CREW.length * 26 + 6, h: 3 * 44 + 4, bg: "#56606e" }, ...crew.CREW.flatMap(([who], i) => ["s", "sw", "w"].map((d, r) => stamp(`${who}_idle_${d}`, 16 + i * 26, 41 + r * 44))))
