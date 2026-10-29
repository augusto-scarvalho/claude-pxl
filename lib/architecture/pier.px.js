// A pier seen from above, from examples/topdown.px.js's island (which includes it), in the island style
// (lib/styles/island.px.js): 16 px across, 40 long. For any scene: include("<path>/lib/architecture/pier.px.js",
// { as: "pier" }), its palette its own.
include("../styles/island.px.js", { palette: true })
// What lies flat is seen from above and what stands from the front (topdown16): the deck, a floor over the water, from
// above, its boards across, each lit, its edge toward us a shade, a dark gap under it; its
// far end the land's. Where it stands off the water it shows a front: its near end 3 px thick, two posts under it
// down to the water, and a post at both sides every 12 px, its top a step over the deck, its front down to the water.
// The wood's 3 tones, edged in its darkest (x), no black line.
sprite("pier", { w: 16, h: 46 }, (c) => {
  for (let y = 0; y < 40; y += 4) { c.hline(2, y, 12, "w"); c.hline(2, y + 1, 12, "w"); c.hline(2, y + 2, 12, "W"); c.hline(2, y + 3, 12, "x") }
  c.rect(2, 40, 12, 2, "W"); c.hline(2, 42, 12, "x"); c.rect(3, 43, 2, 2, "W"); c.rect(11, 43, 2, 2, "W"); c.hline(3, 45, 2, "x"); c.hline(11, 45, 2, "x")
  for (let y = 5; y < 40; y += 12) for (const x of [0, 14]) { c.rect(x, y, 2, 1, "w"); c.rect(x, y + 1, 2, 3, "W"); c.rect(x, y + 4, 2, 1, "x") }
})
card("pier", { is: "a pier, 16x46: its deck from above (boards across, each lit, a dark gap under it), its near end from the front (3 px thick, two posts down to the water), a post at both sides every 12 px; edged in the wood's darkest", cells: { "topdown/16": "✓" } })
