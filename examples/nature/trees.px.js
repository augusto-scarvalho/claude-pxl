// Trees: one way to grow a tree, and species on it, as 3D builders (make3d.momiji, make3d.ginkgo,
// make3d.kuromatsu; a world takes them as `make: "momiji"`), to include (the shrine does:
// examples/shrine/shrine.px.js; the scene `trees` below shows each in its seasons). A tree in meters
// (x right, y away, z up, its foot at the origin), described as a botanist would:
// - its form: a trunk forking into limbs that fork again (form "fork": a maple, an oak), or a leader
//   running up the middle with branches off it all the way (form "leader": a ginkgo, a pine, a cypress);
// - the trunk: clear up to `fork` of the height, leaning `lean` (radians), kinking `kink` every half meter;
// - the branches: `limbs` off the fork or the leader, `rise` radians over level at each order, `len[0]`
//   of the height long (on a leader by `profile(f)`, f 0 at the fork to 1 at the top), each order after
//   `shrink` of its parent's, forking into `splits` at each order, fanning `spread` radians;
// - the foliage at the twigs' ends: a mass of `clusters` small clusters (radius `cr`) scattered in an
//   ellipsoid `r` across, `flat` of that tall: airy where they are few and apart, a cloud pad where flat;
//   `layered`: at every branch's end, not only the twigs' (a maple's tiers);
// - its materials: `bark`, and the leaves by season (`leaves[season]`; a list is a choice of `color`;
//   "bare" leaves none);
// - its sway: bent by the wind (`wind` m at its top) with the square of the height.
// Each species is a spec: a new one is a dozen numbers. Any view, any heading (turnaround(), draw3d(),
// a world's make). Parameters: height (m), seed, season, color, wind. Drawn in trees.mats (ramps of
// colors: no keys of a scene's taken) with trees.look, surface()'s options for foliage lit from the
// side: turnaround("maple", make3d.momiji({ season: "autumn" }), { view: "side", ppm: 20, mats:
// trees.mats, surface: trees.look }). trees.species holds the specs. A species of your own: its spec
// (copy the nearest: an oak a fork, a cypress a leader) and its materials in trees.mats, then
// make3d.define("oak", (o) => trees.grow("oak", OAK, o)).
// ponytail: one material a crown; a maple turning unevenly (its clusters of two tints) when one should.
const trees = {}
// in a block: its names stay its own when a scene includes the file
{
const TREE_OPTS = ["height", "seed", "season", "color", "wind"]
const growTree = (who, S, o = {}) => {
  const bad = Object.keys(o).filter((k) => !TREE_OPTS.includes(k))
  if (bad.length) throw new Error(`make3d.${who}: no parameter ${bad.join(", ")} (it has ${TREE_OPTS.join(", ")})`)
  const { height = S.height, seed = 1, season = "summer", color = 0, wind = S.wind } = o
  if (season !== "bare" && !(season in S.leaves)) throw new Error(`make3d.${who}: season is ${[...Object.keys(S.leaves), "bare"].join(", ")}, got ${JSON.stringify(season)}`)
  const { unit, add, mul } = vec, R = rng(seed), k = height / S.height, TAU = 2 * Math.PI
  const way = (az, el) => [Math.cos(az) * Math.cos(el), Math.sin(az) * Math.cos(el), Math.sin(el)]
  const wood = [], masses = [], tips = []
  // a limb from p along d, len m, thinning from r0 to r1, kinking as it goes: where it ends, its way
  // there, and its joints
  const limb = (p, d, len, r0, r1, kink = S.kink) => {
    const n = Math.max(1, Math.round(len / (0.5 * k))), pts = [p]
    for (let i = 0; i < n; i++) {
      const q = add(p, mul(d, len / n))
      wood.push(sdf.capsule(p, q, r0 + ((r1 - r0) * i) / n, r0 + ((r1 - r0) * (i + 1)) / n))
      pts.push((p = q))
      d = unit(add(d, [(R() - 0.5) * kink, (R() - 0.5) * kink, (R() - 0.5) * kink * 0.4]))
    }
    return [p, d, pts]
  }
  // a branch of order `lvl`: its limb, then its splits fanning out from its way, or foliage at its end
  const branch = (p, az, len, r, lvl) => {
    const [q, d] = limb(p, way(az, S.rise[Math.min(lvl, S.rise.length - 1)] + (R() - 0.5) * 0.2), len, r, r * S.taper)
    const n = S.splits[lvl] ?? 0
    if (!n || S.layered) tips.push(q)
    if (!n) return
    const az1 = Math.atan2(d[1], d[0])
    for (let i = 0; i < n; i++) branch(q, az1 + S.spread * (n > 1 ? i / (n - 1) - 0.5 : 0) + (R() - 0.5) * 0.3, len * S.shrink, r * S.taper, lvl + 1)
  }
  const a0 = R() * TAU, lean = way(a0, Math.PI / 2 - S.lean), forkZ = S.fork * height
  const [top, , spine] = limb([0, 0, 0], lean, S.form === "leader" ? height * 0.9 : forkZ / lean[2], S.r * k, S.r * k * (S.form === "leader" ? 0.25 : 0.7), S.kink * 0.6)
  if (S.form === "leader") {
    // the branches up the leader from the fork, a golden angle apart, longest where the profile says;
    // each starts on the leader's joint nearest its height
    for (let i = 0; i < S.limbs; i++) {
      const f = (i + 0.5) / S.limbs, z = forkZ + (top[2] - forkZ) * f * 0.95
      const p = spine.reduce((a, b) => (Math.abs(b[2] - z) < Math.abs(a[2] - z) ? b : a))
      branch(p, a0 + i * 2.39996, S.len[0] * height * S.profile(f), S.r * k * 0.45 * (1 - 0.5 * f), 0)
    }
    if (S.crowned) tips.push(top)
  } else for (let i = 0; i < S.limbs; i++) branch(top, a0 + (i * TAU) / S.limbs + (R() - 0.5) * 0.5, S.len[0] * height, S.r * k * 0.6, 0)
  // the foliage: clusters scattered in a mass over each twig's end
  if (season !== "bare") for (const t of tips) {
    const M = S.mass, rr = M.r * k, c = add(t, [0, 0, M.lift * k])
    for (let i = 0; i < M.clusters; i++) {
      let v
      do v = [R() * 2 - 1, R() * 2 - 1, R() * 2 - 1]; while (v[0] ** 2 + v[1] ** 2 + v[2] ** 2 > 1)
      const cr = M.cr * k * (0.8 + R() * 0.4)
      masses.push(sdf.ellipsoid([cr, cr, cr * Math.max(M.flat, 0.55)]).at(c[0] + v[0] * (rr - cr * 0.6), c[1] + v[1] * (rr - cr * 0.6), c[2] + v[2] * rr * M.flat))
    }
  }
  const leaf = season === "bare" ? null : [S.leaves[season]].flat()[color % [S.leaves[season]].flat().length]
  // the crown's face in small bumps, the clusters' own leaves catching the light
  const trunk = sdf.union(wood, { smooth: 0.06 * k }).mat(S.bark), crown = masses.length ? sdf.union(masses, { smooth: 0.08 * k }).noise({ amp: S.mass.bump * k, scale: S.mass.grain * k, seed }).mat(leaf) : null
  // grown, scaled so its top (its leaves', bare or not) stands at `height`
  const crest = Math.max(...tips.map((t) => t[2] + (S.mass.lift + S.mass.r * S.mass.flat) * k)), fit = height / crest
  const bend = (c) => (2 * wind * (0.45 + 0.55 * Math.sin(TAU * c.phase))) / (height * height)
  return { field: (crown ? trunk.part("trunk").union(crown.part("crown")) : trunk.part("trunk")).scale(fit).bend(bend), windy: true,
    parts: crown ? { trunk: trunk.scale(fit), crown: crown.scale(fit) } : { trunk: trunk.scale(fit) }, sockets: { top: [0, 0, height] } }
}

// ---------------------------------------------------------------- the species
// The Japanese maple (Acer palmatum, momiji): a short trunk forking low (under half a meter) into four
// limbs that climb and then spread almost level, the crown wider than tall and coming down near the
// ground, in layers of small airy clusters with sky between; red, orange or gold in autumn.
const MOMIJI = { height: 3.4, form: "fork", fork: 0.12, r: 0.13, lean: 0.12, kink: 0.35, limbs: 4, rise: [0.9, 0.3], len: [0.32], splits: [2], shrink: 0.75, spread: 0.9, taper: 0.6,
  layered: true, mass: { r: 0.55, flat: 0.4, clusters: 4, cr: 0.28, lift: 0.08, bump: 0.05, grain: 0.12 }, wind: 0.1, bark: "bark",
  leaves: { spring: "momiji_spring", summer: "momiji_summer", autumn: ["momiji_red", "momiji_orange", "momiji_gold"] } }
// The ginkgo: a straight trunk and a leader to the top, branches climbing steeply off it all the way up,
// longest low down: an upright oval crown of clumps; gold all over in autumn, before it drops them all.
const GINKGO = { height: 6, form: "leader", fork: 0.2, r: 0.2, lean: 0.03, kink: 0.15, limbs: 10, rise: [0.8, 0.55], len: [0.28], profile: (f) => 0.45 + 0.55 * Math.sin(Math.PI * Math.min(1, 0.25 + f * 0.85)),
  splits: [2], shrink: 0.5, spread: 0.9, taper: 0.5, crowned: true,
  mass: { r: 0.7, flat: 0.75, clusters: 4, cr: 0.38, lift: 0.05, bump: 0.06, grain: 0.16 }, wind: 0.14, bark: "bark",
  leaves: { spring: "ginkgo_spring", summer: "ginkgo_summer", autumn: "ginkgo_gold" } }
// The Japanese black pine pruned as a garden tree (kuromatsu, niwaki): a trunk leaning and twisting, a
// few long limbs out almost level, each ending in a flat cloud pad of needles, a pad on top; evergreen.
const KUROMATSU = { height: 3.2, form: "leader", fork: 0.3, r: 0.14, lean: 0.28, kink: 0.7, limbs: 6, rise: [0.08, 0.15], len: [0.4], profile: (f) => 1 - 0.65 * f,
  splits: [2], shrink: 0.4, spread: 0.9, taper: 0.5, crowned: true,
  mass: { r: 0.62, flat: 0.28, clusters: 4, cr: 0.34, lift: 0.1, bump: 0.04, grain: 0.08 }, wind: 0.05, bark: "pine_bark",
  leaves: { spring: "pine_needles", summer: "pine_needles", autumn: "pine_needles", winter: "pine_needles" } }

// their materials, dark to light, hue-shifted (shadows to violet and green, lights to yellow)
const TREE_MATS = {
  bark: ["#231a20", "#3d3036", "#5e4c4a", "#82705f", "#a89480"],
  pine_bark: ["#2a1a1a", "#4a2c26", "#70463a", "#966650"],
  pine_needles: ["#10201c", "#1c3628", "#2c5034", "#4a6e3a", "#7a8e48"],
  momiji_red: ["#3e0e16", "#74161c", "#ac2420", "#d8422a", "#f27a3e"],
  momiji_orange: ["#5a200e", "#9a3e12", "#d0661c", "#ee9634", "#fac462"],
  momiji_gold: ["#5a3a0a", "#966810", "#cc9a1c", "#ecc63a", "#faea8a"],
  momiji_spring: ["#24401e", "#3e6a2a", "#68983a", "#a2c454", "#d8e888"],
  momiji_summer: ["#14301e", "#24502a", "#3e7432", "#68983e", "#a4c05a"],
  ginkgo_gold: ["#56400c", "#8e6c10", "#c89c18", "#ecc832", "#fbee86"],
  ginkgo_spring: ["#2c4a1c", "#4a7a2a", "#7aae3e", "#bede6a"],
  ginkgo_summer: ["#1c3a1c", "#2e5e26", "#4c8a34", "#82b44a"],
}
// as a tree is lit (the nature kit's spruce): the light wrapped round it, its edge toward the light a
// step up, no line round it
const TREE_LOOK = { soft: 0.6, rim: 0.85, outline: false }
const SPECIES = { momiji: MOMIJI, ginkgo: GINKGO, kuromatsu: KUROMATSU }
for (const [name, S] of Object.entries(SPECIES)) make3d.define(name, (o) => growTree(name, S, o))
Object.assign(trees, { mats: TREE_MATS, look: TREE_LOOK, species: SPECIES, grow: growTree })
}

// ---------------------------------------------------------------- the species, to look at
// Each in its seasons, at 20 px to the meter, lit from the upper left in front: the momiji in its three
// autumn colors, in spring, summer and bare; the ginkgo in autumn, summer and bare; the black pine; the
// red momiji turned a quarter (they are 3D: any heading).
{
const LOOK = { view: "side", ppm: 20, mats: trees.mats, surface: trees.look, light: [-0.6, -0.5, 0.65] }
const ROW = [
  ["momiji_red", make3d.momiji({ season: "autumn", color: 0, height: 2.6, seed: 2 })], ["momiji_orange", make3d.momiji({ season: "autumn", color: 1, height: 2.6, seed: 5 })],
  ["momiji_gold", make3d.momiji({ season: "autumn", color: 2, height: 2.6, seed: 8 })], ["momiji_spring", make3d.momiji({ season: "spring", height: 2.6, seed: 2 })],
  ["momiji_summer", make3d.momiji({ season: "summer", height: 2.6, seed: 2 })], ["momiji_bare", make3d.momiji({ season: "bare", height: 2.6, seed: 2 })],
  ["ginkgo_autumn", make3d.ginkgo({ season: "autumn", height: 4.5, seed: 3 })], ["ginkgo_summer", make3d.ginkgo({ season: "summer", height: 4.5, seed: 3 })],
  ["ginkgo_bare", make3d.ginkgo({ season: "bare", height: 4.5, seed: 3 })], ["kuromatsu", make3d.kuromatsu({ height: 2.6, seed: 4 })],
]
for (const [n, t] of ROW) turnaround(`_trees_${n}`, t, { ...LOOK, headings: ["s"] })
turnaround("_trees_turned", ROW[0][1], { ...LOOK, headings: ["e"] })
scene("trees", { w: 11 * 80, h: 104, bg: "#cdc3b0" }, ...[...ROW.map(([n]) => `_trees_${n}_s`), "_trees_turned_e"].map((n, i) => stamp(n, 40 + i * 80, 100)))
}
