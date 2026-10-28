// Cave kit: what lies on a cave's rock and grows out of it, drawn in the includer's keys (no palette of
// its own): stones and lumps for a rock face, normal-mapped so moving lights rake across them
// (cave.stone(name, rx, ry), cave.lump(name, rx, ry): an ellipse rx by ry px out from its middle, domed
// by bump()), mushroom caps to stamp in clusters (_cap_big, _cap_mid, _cap_tiny) and a shelf fungus
// growing out of a rock face (_bracket). Its keys: r a stone, K its outline; R a lump, r its outline; c
// a cap, C its light, e its gills; f and F the stem. In a cave scene, after its palette:
// include("<path>/lib/nature/cave.px.js") (examples/cave.px.js, examples/grotto.px.js).
const cave = {}
// in a block: its names stay its own when a scene includes the file
{
cave.stone = (name, rx, ry) => sprite(name, { w: 2 * rx + 1, h: 2 * ry + 1, outline: "K" }, ellipse(rx, ry, rx, ry, "r"), bump("dome"))
cave.lump = (name, rx, ry) => sprite(name, { w: 2 * rx + 1, h: 2 * ry + 1, outline: "r" }, ellipse(rx, ry, rx, ry, "R"), bump("dome", { depth: 0.8 }))
sprite("_cap_big", { mx: "c" }, "..cC\n.cCC\ncCcC\neeee\n...f\n...F\n...f")
sprite("_cap_mid", { mx: "c" }, ".cC\ncCC\neee\n..f\n..F")
sprite("_cap_tiny", ".C.\nccc\n.f.")
// the shelf fungus, pointing right
sprite("_bracket", "cCc.\ncccC\n.eee")
}
