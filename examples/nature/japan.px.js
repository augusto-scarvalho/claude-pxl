// Japan: a Shinto shrine's things and its ground, for any scene: include("japan.px.js", { palette: true }).
// The things are 3D builders in meters (x right, y away, z up, their front -y): make3d.torii, haiden,
// toro (a stone lantern), chozubachi (the basin to wash at), ema (the rack of prayer plaques), kitsune (a
// fox on its plinth). They are drawn by turnaround() in japan.mats (ramps of colors, so they never take a
// scene's keys; but the lanterns' lamp in this file's i and I, so a scene's glow("iI") lights them), and
// what hangs off them is drawn by hand: japan.hand(thing) as turnaround's draw hangs the paper streamers
// (shide) at its "shide" sockets. The shrine is made of it: examples/shrine/shrine.px.js.
// The ground is painted by the pixel in this file's keys (its palette, so a shade layer steps them):
// japan.paving() the approach paved in ishidatami, raked() white gravel raked along it and in rings round
// things, stones() stepping stones, moss() moss in patches, leaves() fallen leaves where the wind leaves
// them; ground(...) lays them, the first that paints a pixel winning.
pal({
  x: "#6f687a", y: "#a29a98", z: "#cdc3b0", Z: "#eae0ca", q: "#bbb2a6",   // white gravel: in shade (violet) to the lit ridge; a furrow
  K: "#433e4b", O: "#6a6470", s: "#8f878f", S: "#aea4a0", F: "#d4c7b2", // granite paving: a joint to a lit edge
  m: "#25371f", M: "#3c5729", n: "#5f7f39", N: "#8b9d47",                 // moss
  e: "#5c161b", R: "#a6291f", r: "#e05b2d",                               // fallen maple leaves: red
  o: "#7c3413", u: "#c8691d", U: "#f2a443",                               // orange
  g: "#84630f", G: "#cfa01f", Y: "#f5d95a",                               // gold (a ginkgo's)
  P: "#bdb6a8", W: "#faf6ea",                                             // paper
  E: "#1a1418",                                                           // a carved eye
  i: "#f2b450", I: "#ffeab0",                                             // lamplight
})
ramps("xyzZ", "xq", "KOsSF", "mMnN", "eRr", "ouU", "gGY", "PW", "iI")
const japan = {}
// in a block: its names stay its own when a scene includes the file
{

// ---------------------------------------------------------------- the materials
const JAPAN_MATS = {
  stone: ["#2b2733", "#46414f", "#655f6b", "#89818a", "#aea4a2", "#d3c6b4"],
  moss: ["#25361f", "#3b5528", "#5c7a34", "#8a9a44"],
  vermilion: ["#4d1820", "#8c2a27", "#c3432f", "#e46a3e", "#f59a63"],
  lacquer: ["#131117", "#24202a", "#3a3442", "#585060"],
  gold: ["#5a3a0c", "#a2741a", "#d9ab2e", "#f6dc7c"],
  copper: ["#1c3436", "#2c5250", "#457868", "#6fa48a", "#a8cfa8"],
  seam: ["#122626", "#1c3436", "#2c5250", "#457868", "#6fa48a"],
  wood: ["#2a1a17", "#4b2f24", "#6f4a33", "#986e4c", "#c29a6a"],
  plaster: ["#5e5866", "#9e96a0", "#d4cabe", "#f2e8d6"],
  straw: ["#5a4220", "#8a6a32", "#b8984e", "#dcc07a", "#f2e2aa"],
  rope: ["#3a2a14", "#5e4622", "#86683a", "#a88a52"],
  paper: ["#9e9a94", "#dcd8cc", "#faf6ea"],
  water: ["#172a36", "#2a5260", "#4f8a94", "#9ccccc"],
  bamboo: ["#2a3a1e", "#4a6a2e", "#7a9a44", "#b0c470"],
  plaque: ["#6a4a2a", "#a07a4a", "#d0b07a", "#eedcb0"],
  bib: ["#5a1622", "#9a2a2a", "#d2402e", "#ee7448"],
  lamp: "iI",
}
// a field's faces turned up mossed in patches (amount 0..1)
const mossy = (f, amount = 0.3, seed = 7) => f.paint("moss", (p, n) => n[2] > 0.6 && sdf.fbm(p[0] * 6, p[1] * 6, p[2] * 6, seed, 2) > 0.62 - 0.3 * amount)
// a hexagonal prism, `r` from its middle to a side, `h` tall, standing on the origin
const hex = (r, h) => sdf.intersect(...[0, 60, 120].map((a) => sdf.box([2 * r, 4 * r, h]).rotate(a, "z"))).at(0, 0, h / 2)
// a beam along x, `len` long, `h` tall and `d` deep, its ends turned up `lift` m (a torii's top)
const beam = (len, h, d, lift) => sdf.box([h, d, len]).bend((2 * lift) / (len / 2) ** 2).rotate(-90, "y")

// ---------------------------------------------------------------- the things
// A torii (myōjin): two pillars leaning in a little, black sleeves at their feet, the tie beam through
// them (its ends past them), the strut and the plaque (black, a gold rim) between it and the vermilion
// beam under the black top, the top's ends turned up. `span` m between the pillars, `height` m.
make3d.define("torii", ({ span = 2.3, height = 2.75 } = {}) => {
  const k = height / 2.75, P = span / 2
  const pillar = (s) => sdf.union(sdf.cone(0.15 * k, 2.5 * k, 0.12 * k).mat("vermilion"), sdf.cylinder(0.175 * k, 0.3 * k).mat("lacquer")).rotate(-s * 1.4, "y").at(s * P, 0, 0)
  const field = sdf.union(pillar(-1), pillar(1),
    sdf.box([span + 0.7 * k, 0.13 * k, 0.2 * k]).at(0, 0, 2.02 * k).mat("vermilion"),
    sdf.box([0.14 * k, 0.12 * k, 0.32 * k]).at(0, 0, 2.27 * k).mat("vermilion"),
    sdf.box([0.28 * k, 0.06 * k, 0.32 * k]).at(0, -0.09 * k, 2.27 * k).paint((p) => (Math.abs(p[0]) > 0.09 * k || Math.abs(p[2] - 2.27 * k) > 0.12 * k ? "gold" : "lacquer")),
    beam(span + 1.1 * k, 0.12 * k, 0.24 * k, 0.07 * k).at(0, 0, 2.5 * k).mat("vermilion"),
    beam(span + 1.5 * k, 0.2 * k, 0.32 * k, 0.15 * k).at(0, 0, 2.66 * k).mat("lacquer"))
  return { field, sockets: { top: [0, 0, 2.8 * k] } }
}, { params: { span: [1, 6], height: [1.5, 8] } })

// A hall of worship (haiden): a stone base and two steps, a wooden floor, white walls framed in vermilion
// posts and beams, lattice doors in the middle bay, the brackets dark under the eaves; a copper roof
// hipped, its slopes sagging and its corners turned up, a dark ridge; before the doors the offering box
// (its top slatted), the shimenawa (a straw rope, twisted, thickest in the middle, hung low enough
// before the posts that a camera 20 degrees down sees it under the eaves; its "shide" sockets where the
// paper hangs), the bell before it and its rope striped red and white. `w` and `d` m: the walls'.
make3d.define("haiden", ({ w = 3.6, d = 2.6 } = {}) => {
  const B = d + 0.9, W = w + 1.8, D = d + 1.6, zE = 2.0, zR = 2.95, front = -d / 2
  // the roof: a shell 0.16 m thick under a surface falling from the ridge (steep, then easing) and, past
  // 62% of its width, to the ends (the hips); its corners lifted
  const roof = sdf.field((x, y, z) => {
    const s = Math.min(1, Math.abs(x) / (W / 2)), t = Math.min(1, Math.abs(y) / (D / 2)), hip = Math.max(0, (s - 0.62) / 0.38)
    const fall = (q) => 1.5 * q - 0.5 * q * q, top = zR - (zR - zE) * Math.max(fall(t), fall(hip)) + 0.24 * s ** 4 * Math.max(t, hip) ** 2
    return Math.max(0.42 * Math.max(z - top, top - 0.16 - z), Math.abs(x) - W / 2, Math.abs(y) - D / 2)
  }, [-W / 2 - 0.1, -D / 2 - 0.1, zE - 0.4], [W / 2 + 0.1, D / 2 + 0.1, zR + 0.3])
  const posts = [-w / 2, -0.6, 0.6, w / 2].flatMap((x) => [front, -front].map((y) => sdf.cylinder(0.1, 1.42).at(x, y, 0.55)))
  // the shimenawa hangs from x -1.3 to 1.3, 1.6 m up at its ends, sagging 0.16 m, 0.08 m thick there and 0.15 in the middle
  const ropeAt = (x) => { const q = x / 1.3; return [x, front - 0.18, 1.6 - 0.16 * (1 - q * q), 0.08 + 0.07 * (1 - q * q)] }
  const rope = sdf.union(Array.from({ length: 12 }, (_, i) => { const a = ropeAt(-1.3 + (2.6 * i) / 12), b = ropeAt(-1.3 + (2.6 * (i + 1)) / 12); return sdf.capsule(a.slice(0, 3), b.slice(0, 3), a[3], b[3]) }))
    .paint((p) => ((((p[0] * 6 - p[2] * 9) % 1) + 1) % 1 < 0.4 ? "rope" : "straw"))
  const field = sdf.union(
    sdf.box([w + 1.0, B, 0.45]).at(0, 0, 0.225).mat("stone"),
    sdf.box([1.5, 0.3, 0.3]).at(0, -B / 2 - 0.15, 0.15).mat("stone"), sdf.box([1.5, 0.3, 0.15]).at(0, -B / 2 - 0.45, 0.075).mat("stone"),
    sdf.box([w + 0.6, d + 0.5, 0.1]).at(0, 0, 0.5).mat("wood"),
    sdf.box([w, d, 1.3]).at(0, 0, 1.2).mat("plaster"),
    sdf.box([1.2, 0.06, 1.15]).at(0, front - 0.02, 1.15).paint((p) => (Math.floor((p[0] + 10) * 10) % 2 ? "wood" : "lacquer")),
    sdf.union(posts).mat("vermilion"),
    ...[0.62, 1.8].map((z) => sdf.box([w + 0.2, 0.14, 0.14]).at(0, front - 0.03, z).mat("vermilion")),
    ...[-1, 1].map((s) => sdf.box([0.14, d, 0.14]).at((s * w) / 2, 0, 1.8).mat("vermilion")),
    sdf.box([w + 0.3, d + 0.3, 0.18]).at(0, 0, 1.94).mat("wood"),
    // the copper in sheets 0.3 m wide, a seam down the slope between each two
    roof.paint((p) => ((((p[0] + 10) % 0.3) + 0.3) % 0.3 < 0.05 ? "seam" : "copper")),
    sdf.box([W * 0.62, 0.26, 0.2]).at(0, 0, zR + 0.04).mat("lacquer"), ...[-1, 1].map((s) => sdf.box([0.22, 0.32, 0.34]).at((s * W * 0.62) / 2, 0, zR + 0.08).mat("lacquer")),
    sdf.box([1.0, 0.5, 0.5]).at(0, front - 0.45, 0.8).paint((p, n) => (n[2] > 0.7 && Math.floor((p[1] + 10) * 25) % 2 ? "lacquer" : "wood")),
    rope,
    sdf.sphere(0.1).at(0, front - 0.55, 1.5).mat("gold"),
    sdf.capsule([0, front - 0.56, 1.42], [0, front - 0.62, 1.1], 0.04).paint((p) => (Math.floor(p[2] * 12) % 2 ? "vermilion" : "paper")))
  const shide = Object.fromEntries([-1.0, -0.35, 0.35, 1.0].map((x, i) => { const [, y, z, r] = ropeAt(x); return [`shide${i}`, [x, y - r, z - r]] }))
  return { field, sockets: { top: [0, 0, zR], ...shide } }
}, { params: { w: [2, 8], d: [1.5, 6] } })

// A stone lantern (tōrō, the kasuga kind): a hexagonal foot, a round post with a band, a hexagonal
// platform, the firebox with its window (dark: a lamp to light), the roof and its finial; moss on what
// faces up.
make3d.define("toro", ({ height = 1.6, moss = 0.4 } = {}) => {
  const k = height / 1.6
  const field = mossy(sdf.union(hex(0.24, 0.13), sdf.cylinder(0.08, 0.72).at(0, 0, 0.13), sdf.cylinder(0.1, 0.05).at(0, 0, 0.46), hex(0.22, 0.11).at(0, 0, 0.85),
    hex(0.16, 0.3).at(0, 0, 0.96).subtract(sdf.box([0.17, 0.5, 0.18]).at(0, 0, 1.11)), hex(0.3, 0.05).at(0, 0, 1.26), sdf.cone(0.31, 0.17).at(0, 0, 1.31),
    sdf.sphere(0.055).at(0, 0, 1.52), sdf.cone(0.04, 0.07).at(0, 0, 1.55)).mat("stone"), moss).union(sdf.cylinder(0.09, 0.2).at(0, 0, 1.0).mat("lamp")).scale(k)
  return { field, sockets: { light: [0, 0, 1.12 * k] } }
}, { params: { height: [0.6, 4], moss: [0, 1] } })

// The basin to wash at (chōzubachi): a rough-hewn stone hollowed, water in it, a bamboo spout from a post
// behind, two bamboo ladles laid across it.
make3d.define("chozubachi", ({ moss = 0.3 } = {}) => {
  const ladle = (x, y) => sdf.union(sdf.capsule([x - 0.42, y, 0.5], [x + 0.18, y + 0.02, 0.53], 0.018), sdf.cylinder(0.05, 0.07).at(x + 0.24, y + 0.02, 0.48)).mat("bamboo")
  const field = sdf.union(
    mossy(sdf.box([1.0, 0.62, 0.48], { round: 0.05 }).noise({ amp: 0.015, scale: 0.12, seed: 4 }).subtract(sdf.box([0.78, 0.4, 0.3]).at(0, 0, 0.24)).at(0, 0, 0.24).mat("stone"), moss),
    sdf.box([0.8, 0.42, 0.02]).at(0, 0, 0.42).mat("water"),
    sdf.cylinder(0.035, 0.66).at(0.28, 0.5, 0).mat("bamboo"), sdf.capsule([0.28, 0.5, 0.64], [0.12, 0.14, 0.58], 0.03).mat("bamboo"),
    ladle(-0.05, -0.08), ladle(0.02, 0.06))
  return { field, sockets: { spout: [0.12, 0.14, 0.56] } }
}, { params: { moss: [0, 1] } })

// The rack of prayer plaques (ema): two posts, two bars, a little roof, the plaques hung close on the
// bars, each turned a little its own way.
make3d.define("ema", ({ seed = 5 } = {}) => {
  const r = rng(seed)
  const plaques = [0.86, 1.21].flatMap((z) => [-0.5, -0.3, -0.1, 0.1, 0.3, 0.5].map((x) => sdf.box([0.17, 0.025, 0.12]).rotate((r() - 0.5) * 30, "y").at(x + (r() - 0.5) * 0.04, -0.06, z - 0.08 - r() * 0.02)))
  const field = sdf.union(...[-0.68, 0.68].map((x) => sdf.cylinder(0.05, 1.5).at(x, 0, 0)), ...[0.9, 1.25].map((z) => sdf.box([1.45, 0.06, 0.06]).at(0, 0, z)),
    beam(1.8, 0.07, 0.5, 0.04).at(0, 0, 1.56), sdf.box([1.5, 0.12, 0.1]).at(0, 0, 1.5)).mat("wood")
    .union(sdf.union(plaques).mat("plaque"))
  return { field }
}, { params: { seed: [0, 999] } })

// A fox (kitsune) on its pedestal, as the pairs at Inari shrines sit: up on its haunches, the chest high,
// the front legs straight, tall pointed ears, a narrow snout; its tail big and bushy, raised up behind
// its back and curling forward at the tip (what says fox from any side); a red bib (yodarekake) tied at
// its throat; one holding the jewel (tama) under a forepaw, the other a key in its mouth (`holds`), as a
// pair differs. The pedestal in layers (a slab, a step, the die, its cap and a top), moss on what faces
// up. Its eyes and the line of its mouth are "eye" and "mouth" sockets, carved by hand over each view:
// japan.carve(fox) as turnaround's draw. `size`: the fox bigger than life (1.45).
make3d.define("kitsune", ({ size = 1.45, moss = 0.15, holds = "tama" } = {}) => {
  // (its parameters checked here: make3d.define's params take ranges of numbers only, and holds is a word)
  if (!(size >= 0.5 && size <= 3) || !(moss >= 0 && moss <= 1)) throw new Error(`make3d.kitsune: size is 0.5 to 3, moss 0 to 1, got ${size}, ${moss}`)
  if (!["tama", "key"].includes(holds)) throw new Error(`make3d.kitsune: holds is "tama" (a jewel under a forepaw) or "key" (in its mouth), got ${JSON.stringify(holds)}`)
  const Z0 = 0.63, at = (p) => [p[0] * size, p[1] * size, p[2] * size + Z0]
  const pedestal = sdf.union(sdf.box([0.8, 0.8, 0.1], { round: 0.015 }).at(0, 0, 0.05), sdf.box([0.72, 0.72, 0.08], { round: 0.015 }).at(0, 0, 0.14),
    sdf.box([0.58, 0.58, 0.32], { round: 0.02 }).at(0, 0, 0.34), sdf.box([0.68, 0.68, 0.07], { round: 0.015 }).at(0, 0, 0.535), sdf.box([0.62, 0.62, 0.06], { round: 0.015 }).at(0, 0, 0.6))
  // the tail from under the haunches up behind the back, thickest halfway, rising past the head on one
  // side (the pair's on the outer sides: the jewel's on its right, the key's on its left), its tip
  // curling forward
  const t = holds === "tama" ? 1 : -1
  const tail = sdf.union(sdf.capsule([0, 0.18, 0.08], [t * 0.04, 0.3, 0.26], 0.05, 0.1), sdf.capsule([t * 0.04, 0.3, 0.26], [t * 0.09, 0.28, 0.54], 0.1, 0.095),
    sdf.capsule([t * 0.09, 0.28, 0.54], [t * 0.08, 0.17, 0.76], 0.095, 0.04), { smooth: 0.04 })
  const paw = holds === "tama" ? [0.065, -0.15, 0.13] : [0.06, -0.11, 0.02]
  const fox = sdf.union([
    sdf.ellipsoid([0.17, 0.19, 0.13]).at(0, 0.08, 0.12), ...[-1, 1].map((x) => sdf.ellipsoid([0.07, 0.15, 0.09]).at(x * 0.13, 0.02, 0.08)),
    sdf.ellipsoid([0.135, 0.125, 0.24]).at(0, -0.02, 0.3),
    sdf.capsule([-0.06, -0.11, 0.02], [-0.06, -0.07, 0.3], 0.033), sdf.capsule(paw, [0.06, -0.07, 0.3], 0.033),
    sdf.capsule([0, -0.04, 0.44], [0, -0.06, 0.56], 0.065), sdf.sphere(0.095).at(0, -0.07, 0.6),
    sdf.capsule([0, -0.14, 0.59], [0, -0.28, 0.555], 0.042, 0.02),
    ...[-1, 1].map((x) => sdf.cone(0.04, 0.16).rotate(x * 12, "y").at(x * 0.055, -0.05, 0.66)),
    tail,
  ], { smooth: 0.025 })
  const bib = sdf.union(sdf.ellipsoid([0.11, 0.035, 0.09]).rotate(-20, "x").at(0, -0.12, 0.44), sdf.torus(0.07, 0.014).rotate(-15, "x").at(0, -0.05, 0.5))
  const held = holds === "tama" ? sdf.union(sdf.sphere(0.065).at(0.065, -0.15, 0.065), sdf.cone(0.03, 0.07).at(0.065, -0.15, 0.11))
    : sdf.union(sdf.capsule([-0.11, -0.2, 0.56], [0.09, -0.2, 0.56], 0.016), sdf.torus(0.035, 0.012).rotate(90, "y").at(0.125, -0.2, 0.56))
  const field = mossy(pedestal.union(fox.scale(size).at(0, 0, Z0)).mat("stone"), moss)
    .union(bib.scale(size).at(0, 0, Z0).mat("bib"), held.scale(size).at(0, 0, Z0).mat("gold"))
  return { field, sockets: { eye0: at([-0.05, -0.145, 0.63]), eye1: at([0.05, -0.145, 0.63]), mouth0: at([-0.03, -0.24, 0.545]), mouth1: at([0.03, -0.24, 0.545]), head: at([0, -0.07, 0.6]) } }
})
// turnaround's draw for a thing with "eye" and "mouth" sockets: each a carved pixel, near black (E),
// where it faces us (nearer us than the head's middle)
const carve = (thing) => (c, v) => {
  const S = thing.sockets ?? {}, mid = S.head ? v.depth(S.head) : -Infinity
  for (const [n, p] of Object.entries(S)) if (/^(eye|mouth)/.test(n) && v.depth(p) > mid) { const [x, y] = v.screen(p); c.px(Math.round(x), Math.round(y), "E") }
}

// the paper streamers (shide): a strip folded down in a zigzag, hung by its top middle
sprite("_shide", { pivot: [1, 0] }, `
  PW.
  .WW
  WW.
  .WP
  .P.`)
// turnaround's draw for a thing with "shide" sockets: the streamers hung there
const hand = (thing) => (c, v) => { for (const [n, p] of Object.entries(thing.sockets ?? {})) if (n.startsWith("shide")) { const [x, y] = v.screen(p); c.stamp("_shide", Math.round(x), Math.round(y)) } }

// ---------------------------------------------------------------- the ground (picture px, keys above)
// The approach (sandō) paved as temple paths are (read on photographs): long granite slabs laid across
// the walk (their long side across it), two or three to a course, in a running bond of lengths of their
// own; a speckled granite, a few tones in clusters (a slab now and then a step lighter, seldom darker),
// each slab's edge toward the sun (the west) lit, moss
// in some joints; a curb of narrow cut stones along each side, long ones; outside it a strip of small
// rounded pebbles, then the gravel. It runs along `points` (a lane, pxl's lane()), `width` px wide, its
// corners rounded `round` px so its courses fan round a bend without a seam; `landings` [x, y, w, h,
// along] are wide platforms of bigger slabs before a gate or a hall, walked along "x" or "y" (the lane
// runs into them). paving() gives { paint, dist }: paint(x, y) its key or nothing; dist(x, y) how far a
// pixel lies outside the pebbles (negative inside), the gravel's to rake along.
const paving = ({ points, width = 28, round = 26, landings = [], course = 7, curb = 3, pebbles = 4, mossy = 0.3, seed = 1 }) => {
  const L = lane(points, { round }), half = width / 2
  const len = (c, j, k) => (k < 0 ? 9 : 12) + Math.floor(hash(c * 7 + j, k + 3, seed) * (k < 0 ? 6 : 8))
  // a pixel: along the lane and to its side, how far outside the paving, the landing it lies in (-1: the lane)
  const at = (x, y) => {
    const [s, u] = L(x, y)
    // (squared off at its ends)
    let d = Math.max(Math.abs(u) - half, -s, s - L.total), k = -1
    landings.forEach(([x0, y0, w, h], i) => {
      const dx = Math.max(x0 - x, x - (x0 + w - 1)), dy = Math.max(y0 - y, y - (y0 + h - 1)), e = dx > 0 || dy > 0 ? Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) : Math.max(dx, dy)
      if (e <= 0 && k < 0) k = i
      d = Math.min(d, e)
    })
    return { s, u, d, k }
  }
  // the stone a pixel lies in (a number of its own), or nothing outside the paving
  const stone = (x, y) => {
    const { s, u, d, k } = at(x, y)
    if (d > 0) return null
    if (d > -curb) {
      // the curb, its stones about 18 px long along the edge: the lane's by how far along, a landing's by its side
      if (k < 0) return { curb: true, id: 1e6 + (u > 0 ? 5e5 : 0) + Math.floor((s + hash(u > 0 ? 1 : 0, 9, seed) * 18) / 18) }
      const [x0, y0, w, h] = landings[k], side = [x - x0, x0 + w - 1 - x, y - y0, y0 + h - 1 - y], e = side.indexOf(Math.min(...side)), t = e < 2 ? y : x
      return { curb: true, id: 2e6 + k * 1e4 + e * 1e3 + Math.floor((t + hash(k, e, seed) * 18) / 18) }
    }
    // slabs across the walk: a course a step along it, its slabs' joints across it at lengths of their own
    const [x0, y0, , , along] = k < 0 ? [] : landings[k], deep = k < 0 ? course : course + 2
    const v = k < 0 ? s : along === "y" ? y - y0 : x - x0, w = k < 0 ? u + half : along === "y" ? x - x0 : y - y0, c = Math.floor(v / deep)
    let a = -Math.floor(hash(c, k + 3, seed + 1) * 12), j = 0
    while (a + len(c, j, k) <= w) a += len(c, j++, k)
    return { id: 3e6 + (k + 1) * 1e5 + c * 64 + j }
  }
  const STEP = { K: "O", O: "s", s: "S", S: "F", F: "F" }
  // small rounded pebbles, one in each 3 px square: lit at the top left, darker at the bottom right, shade between
  const pebble = (x, y) => {
    for (const [oi, oj] of [[0, 0], [-1, 0], [0, -1], [-1, -1]]) {
      const i = Math.floor(x / 3) + oi, j = Math.floor(y / 3) + oj, X = i * 3 + Math.floor(hash(i, j, seed + 7) * 2), Y = j * 3 + Math.floor(hash(i, j, seed + 8) * 2)
      if (x >= X && x <= X + 1 && y >= Y && y <= Y + 1) return x === X && y === Y ? "Z" : x === X + 1 && y === Y + 1 ? "S" : "z"
    }
    return "y"
  }
  const paint = (x, y) => {
    const C = stone(x, y)
    if (!C) return at(x, y).d <= pebbles ? pebble(x, y) : null
    // a joint where the stone left of it or above it is another, unless that pixel is the joint already
    // (a sliver of a stone a pixel wide: one joint, not two side by side)
    const W = stone(x - 1, y), N = stone(x, y - 1), WW = stone(x - 2, y), NN = stone(x, y - 2)
    if ((W && W.id !== C.id && !(WW && WW.id !== W.id)) || (N && N.id !== C.id && !(NN && NN.id !== N.id))) return hash(x >> 2, y >> 2, seed + 5) < mossy ? (hash(x, y, seed + 6) < 0.3 ? "n" : "M") : "K"
    // its tone: a slab now and then a step darker or lighter, the curb a step lighter; the granite's
    // speckle in clusters a step up; the edge toward the sun a step up
    const t0 = hash(C.id, seed, 11), t = C.curb ? "S" : t0 < 0.04 ? "O" : t0 > 0.86 ? "S" : "s"
    const fleck = fbm(x / 1.6 + (C.id % 97), y / 1.6, 2) > 0.66
    return !W || fleck ? STEP[t] : t
  }
  return { paint, dist: (x, y) => at(x, y).d - pebbles }
}
// White gravel (shirakawa-suna) raked: a furrow every `period` px along what dist(x, y) measures (the
// paving's), and in rings round each of `rings` [x, y, r] (a lantern's foot, the basin's) out to r px.
const raked = (dist, rings = [], { period = 4 } = {}) => (x, y) => {
  let d = Infinity
  for (const [cx, cy, r] of rings) { const e = Math.hypot(x - cx, y - cy); if (e < r) d = Math.min(d, e) }
  if (d === Infinity) d = dist(x, y)
  return Math.floor(d) % period === 0 ? "q" : "z"
}
// Moss in patches: `spots` [x, y, rx, ry], ragged by noise, in clumps: dark between them, light on top.
const moss = (spots, { seed = 2 } = {}) => (x, y) => {
  let t = -1
  for (const [cx, cy, rx, ry] of spots) t = Math.max(t, 1 - Math.hypot((x - cx) / rx, (y - cy) / ry))
  if (t + (fbm(x / 7 + seed, y / 7, 2) - 0.5) * 0.9 <= 0) return null
  const v = fbm(x / 2.5 + seed * 3, y / 2.5, 2)
  return v < 0.36 ? "m" : v < 0.6 ? "M" : v < 0.76 ? "n" : "N"
}
// Stepping stones (tobi-ishi): [x, y, rx, ry] flat granite set in the gravel, their rims a little
// ragged, the edge toward the sun lit, the far one dark, a pixel of their shade on the gravel beyond.
const stones = (list) => (x, y) => {
  for (const [cx, cy, rx, ry] of list) {
    const r = (X, Y) => Math.hypot((X - cx) / rx, (Y - cy) / ry) - (hash(Math.round(Math.atan2(Y - cy, X - cx) * 2), cx, cy) - 0.5) * 0.2
    if (r(x, y) <= 1) return r(x - 1, y) > 1 || r(x, y + 1) > 1 ? "F" : r(x + 1, y) > 1 || r(x, y - 1) > 1 ? "O" : "s"
    if (r(x - 1, y + 1) <= 1 && r(x, y) <= 1.4) return "y"
  }
  return null
}
// Fallen leaves: one in each `cell`-px square where the hash falls under density(x, y) (0..1: where the
// wind leaves them), 2 or 3 px of a shape, in the ramp color(x, y, t) picks ("eRr", "ouU", "gGY"): the
// lit pixel its light, the rest its middle.
const LEAF_SHAPES = [[[0, 0, 1], [1, 0, 0]], [[0, 0, 1], [1, 0, 0], [0, 1, 0]], [[0, 0, 0], [1, 1, 1]], [[1, 0, 1], [0, 1, 0]], [[0, 0, 1], [0, 1, 0]]]
const leaves = (density, color, { seed = 3, cell = 3 } = {}) => (x, y) => {
  const ci = Math.floor(x / cell), cj = Math.floor(y / cell)
  for (const [oi, oj] of [[0, 0], [-1, 0], [0, -1], [-1, -1]]) {
    const i = ci + oi, j = cj + oj, X = i * cell + Math.floor(hash(i, j, seed) * cell), Y = j * cell + Math.floor(hash(j, i, seed + 1) * cell)
    if (hash(i, j, seed + 2) >= density(X, Y)) continue
    const p = LEAF_SHAPES[Math.floor(hash(i, j, seed + 3) * LEAF_SHAPES.length)].find(([a, b]) => X + a === x && Y + b === y)
    if (p) return color(X, Y, hash(i, j, seed + 4))[p[2] ? 2 : 1]
  }
  return null
}
// the ground: what the first of them paints at a pixel
const ground = (...fs) => (x, y) => { for (const f of fs) { const k = f(x, y); if (k) return k } return null }
Object.assign(japan, { mats: JAPAN_MATS, hand, carve, paving, raked, moss, stones, leaves, ground })
}
