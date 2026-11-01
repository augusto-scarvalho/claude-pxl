// Hearts for a top-down action game's life meter at a 16 px grid (lib/profiles/topdown16.px.js), 8 x 8, drawn by
// hand: full, half and empty, the genre's near-black line round each, a red in 3 tones lit on its upper left
// lobe; empty, the line round a dark inside. A platformer at 16 (platformer16) takes them as they are: Dawn of
// Sorrow's small heart is 7 x 7 in a near-black red line, lit on its upper left lobe. For any scene:
// include("<path>/lib/ui/hearts.px.js", { as: "hearts" }), its palette its own.
pal({ k: "#1a1620", r: "#9a1e2e", R: "#e03c3c", p: "#ffb4a8", e: "#4a3a48" })
ramps("rRp")
sprite("heart", `
  .kk..kk.
  kppkkRRk
  kpRRRRRk
  kRRRRRRk
  kRRRRRrk
  .kRRRrk.
  ..kRrk..
  ...kk...`)
sprite("heart_half", `
  .kk..kk.
  kppkkeek
  kpRReeek
  kRRReeek
  kRRReeek
  .kRReek.
  ..kRek..
  ...kk...`)
sprite("heart_empty", `
  .kk..kk.
  keekkeek
  keeeeeek
  keeeeeek
  keeeeeek
  .keeeek.
  ..keek..
  ...kk...`)
group("hearts", ["heart", "heart_half", "heart_empty"])
card("hearts", { is: "life hearts, 8x8: full (red in 3 tones, lit on its left lobe), half (its left red, its right empty), empty (the line round a dark inside)", cells: { "topdown/16": "✓", "side/16": "✓" } })
// The same hearts at a 32 px grid (lib/profiles/topdown32.px.js), 14 x 13, redrawn by hand: A Link to the Past's
// heart is 14 x 13 at its 16 px grid (its life meter's half that), so at 32 the meter's heart is the 16's 8 x 8
// redrawn at about twice its size; the near-black line round each, its red in 4 tones (its lit lobe a step lighter, a
// glint), empty the line round a dark inside; half, its left red. heart32, heart32_half, heart32_empty.
pal({ L: "#ff7a68" })
{
const FULL = `
  ..kkk....kkk..
  .kpLRk..kRRRk.
  kppLRRkkRRRRRk
  kpLRRRRRRRRRRk
  kLRRRRRRRRRRrk
  kRRRRRRRRRRRrk
  kRRRRRRRRRRrrk
  .kRRRRRRRRRrk.
  ..kRRRRRRRrk..
  ...kRRRRRrk...
  ....kRRRrk....
  .....kRrk.....
  ......kk......`
// its inside from column `from` on taken empty
const empty = (from) => FULL.split("\n").map((r) => [...r].map((k, x) => (x - 2 >= from && "pLRr".includes(k) ? "e" : k)).join("")).join("\n")
sprite("heart32", FULL)
sprite("heart32_half", empty(7))
sprite("heart32_empty", empty(0))
group("hearts32", ["heart32", "heart32_half", "heart32_empty"])
card("hearts32", { is: "life hearts at 32, 14x13: full (red in 4 tones, lit on its left lobe, a glint), half (its left red), empty (the line round a dark inside)", cells: { "topdown/32": "✎" } })
}
