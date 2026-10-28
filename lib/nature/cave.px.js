// Cave kit: what lies on a cave's rock and grows out of it: stones and lumps for a rock face,
// normal-mapped so moving lights rake across them (cave.stone(name, rx, ry), cave.lump(name, rx, ry):
// an ellipse rx by ry px out from its middle, domed by bump(); sprites of the scene that calls them, in
// its keys: r a stone, K its outline; R a lump, r its outline), mushroom caps to stamp in clusters
// (_cap_big, _cap_mid, _cap_tiny) and a shelf fungus growing out of a rock face (_bracket), in the glow
// cave's colors (examples/cave.px.js): c a cap, C its light, e its gills; f and F the stem. For a cave
// scene: include("<path>/lib/nature/cave.px.js", { as: "cave" }) (examples/cave.px.js,
// examples/grotto.px.js, which takes the caps in its own stems' colors by base and swap).
pal({ c: "#3fd8c8", C: "#b4fff2", e: "#1c7f8c", f: "#9aa6c2", F: "#6a7390" })
const cave = {}
// in a block: its names stay its own when a scene includes the file
{
cave.stone = (name, rx, ry) => sprite(name, { w: 2 * rx + 1, h: 2 * ry + 1, outline: "K" }, ellipse(rx, ry, rx, ry, "r"), bump("dome"))
cave.lump = (name, rx, ry) => sprite(name, { w: 2 * rx + 1, h: 2 * ry + 1, outline: "r" }, ellipse(rx, ry, rx, ry, "R"), bump("dome", { depth: 0.8 }))
sprite("_cap_big", { mx: "c" }, "..cC\n.cCC\ncCcC\neeee\n...f\n...F\n...f")
sprite("_cap_mid", { mx: "c" }, ".cC\ncCC\neee\n..f\n..F")
sprite("_cap_tiny", ".C.\nccc\n.f.")
card("_cap_big", { is: "a glowing mushroom cap on its stem, cyan, its gills under it, to stamp in clusters", cells: { "side/?": "✓" }, vary: { shape: "_cap_big, _cap_mid, _cap_tiny" } })
// the shelf fungus, pointing right
sprite("_bracket", "cCc.\ncccC\n.eee")
card("_bracket", { is: "a shelf fungus growing out of a rock face, pointing right, glowing cyan", cells: { "side/?": "✓" } })
}
