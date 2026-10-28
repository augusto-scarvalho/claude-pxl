// Trees: one way to grow a tree, and species on it, as 3D builders (make3d.momiji, .ginkgo, .kuromatsu,
// .oak, .birch, .willow, .sakura, .cypress, .acacia, .baobab, .palm; a world takes them as
// `make: "oak"`), to take with include("<path>/lib/nature/trees.px.js", { as: "trees" }) (the shrine does:
// examples/shrine/shrine.px.js; examples/nature/trees.px.js shows each in its seasons). A tree in
// meters (x right, y away, z up, its foot at the origin), described as a botanist would:
// - its form: a trunk forking into limbs that fork again (form "fork": a maple, an oak), or a leader
//   running up the middle with branches off it all the way (form "leader": a ginkgo, a pine, a cypress);
// - the trunk: clear up to `fork` of the height, leaning `lean` (radians), kinking `kink` every half meter,
//   turning up `bow` at each kink (a palm's curve: leaning at its foot, upright under its crown), its
//   radius `girth(t)` of `r` from its foot (t 0) to the fork (1) where it swells (a baobab's bottle);
// - the branches: `limbs` off the fork or the leader, `rise` radians over level at each order, `len[0]`
//   of the height long (on a leader by `profile(f)`, f 0 at the fork to 1 at the top), each order after
//   `shrink` of its parent's, forking into `splits` at each order, fanning `spread` radians;
// - the foliage at the twigs' ends: a mass of `clusters` small clusters (radius `cr`) scattered in an
//   ellipsoid `r` across, `flat` of that tall: airy where they are few and apart, a cloud pad where flat;
//   `layered`: at every branch's end, not only the twigs' (a maple's tiers); `hang`: a strand hanging from
//   each cluster, that share of the height long (a willow's curtains, swinging behind the crown);
// - or fronds, not clusters (a palm's, no branches: `limbs` 0): `fronds.n` leaves off the trunk's top, each
//   `len` of the height long and `width` across, flat, the oldest leaving at `rise[0]` radians over level
//   and the youngest at `rise[1]`, bending down `droop` along their length; `fruit`: `n` balls `r` of the
//   height across, of `mat`, hanging under the top (coconuts);
// - its materials: `bark` (`marks`: where `at(p, height)` holds, `mat` instead: a birch's dashes, a
//   palm's rings), and the leaves by season (`leaves[season]`; a list is a choice of `color`; "bare"
//   leaves none, a willow's strands then of `twigs`);
// - its sway: bent by the wind (`wind` m at its top) with the square of the height.
// Each species is a spec: a new one is a dozen numbers. Any view, any heading (turnaround(), draw3d(),
// a world's make). Parameters: height (m), seed, season, color, wind (declared: make3d refuses others,
// and a season the species hasn't), ppm: the px to the meter it is drawn at, its texture then in screen
// px (make3d.px's floors: a cluster at least 10 px across, fewer of them as they grow, pulled in by
// what they grew and never past their mass, so the outline holds; the bumps' grain 2 px; its form in
// meters; not given, the drawing call's). Drawn in trees.mats (ramps of
// colors: no keys of a scene's taken) with trees.look, surface()'s options for foliage lit from the
// side: turnaround("maple", make3d.momiji({ season: "autumn" }), { view: "side", ppm: 20, mats:
// trees.mats, surface: trees.look }). trees.species holds the specs. A species of your own: its spec
// (copy the nearest: a beech the oak, a sugi the cypress) and its materials in trees.mats, then
// make3d.define("beech", (o) => trees.grow(BEECH, o), trees.params(BEECH)).
// ponytail: one material a crown; a maple turning unevenly (its clusters of two tints) when one should.
const trees = {}
// in a block: its names stay its own when a scene includes the file
{
// a species' parameters, for make3d.define: its seasons the ones it has leaves for, and bare
const treeParams = (S) => ({ params: { height: [0.5, 40], season: [...Object.keys(S.leaves), "bare"], color: [0, 9], wind: [-2, 2], ppm: [1, 1000] } })
const growTree = (S0, o = {}) => {
  const { height = S0.height, seed = 1, season = "summer", color = 0, wind = S0.wind, ppm } = o
  const { unit, add, mul } = vec, R = rng(seed), k = height / S0.height, TAU = 2 * Math.PI
  // drawn at ppm: the clusters no smaller than make3d.px.cluster px across (fewer as they grow, the mass as
  // full) but never past the mass they make up (one cluster then fills it: a small tree's crown keeps its
  // size), the bumps' grain no finer than make3d.px.grain px
  const M0 = S0.mass, cr = ppm && M0.cr ? Math.min(M0.r, Math.max(M0.cr, make3d.px.cluster / 2 / ppm / k)) : M0.cr
  const S = ppm ? { ...S0, mass: { ...M0, cr, clusters: M0.clusters && Math.max(1, Math.round(M0.clusters * (M0.cr / cr) ** 2)), grain: Math.max(M0.grain, make3d.px.grain / ppm / k) } } : S0
  const way = (az, el) => [Math.cos(az) * Math.cos(el), Math.sin(az) * Math.cos(el), Math.sin(el)]
  const wood = [], masses = [], tips = []
  // a limb from p along d, len m, thinning from r0 to r1, kinking as it goes: where it ends, its way
  // there, and its joints
  const limb = (p, d, len, r0, r1, kink = S.kink, bow = 0, girth) => {
    const n = Math.max(1, Math.round(len / (0.5 * k))), pts = [p]
    for (let i = 0; i < n; i++) {
      const q = add(p, mul(d, len / n))
      wood.push(sdf.capsule(p, q, girth ? girth(i / n) : r0 + ((r1 - r0) * i) / n, girth ? girth((i + 1) / n) : r0 + ((r1 - r0) * (i + 1)) / n))
      pts.push((p = q))
      d = unit(add(d, [(R() - 0.5) * kink, (R() - 0.5) * kink, (R() - 0.5) * kink * 0.4 + bow]))
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
  const [top, , spine] = limb([0, 0, 0], lean, S.form === "leader" ? height * 0.9 : forkZ / lean[2], S.r * k, S.r * k * (S.form === "leader" ? 0.25 : 0.7), S.kink * 0.6, S.bow ?? 0, S.girth && ((t) => S.r * k * S.girth(t)))
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
  // the foliage: clusters scattered in a mass over each twig's end; under each a strand (`hang`) whose
  // foot the bend leaves under its head, then swings on by itself, late (bare, a thinner one of `twigs`)
  const gust = (lag) => (ck) => 0.45 + 0.55 * Math.sin(TAU * (ck.phase - lag))
  if (season !== "bare" || S.mass.hang) for (const t of tips) {
    const M = S.mass, rr = M.r * k, c = add(t, [0, 0, M.lift * k])
    for (let i = 0; i < M.clusters; i++) {
      let v
      do v = [R() * 2 - 1, R() * 2 - 1, R() * 2 - 1]; while (v[0] ** 2 + v[1] ** 2 + v[2] ** 2 > 1)
      // (a cluster grown to the ppm's floor pulled in by what it gained, so the crown keeps its outline)
      const f = 0.8 + R() * 0.4, cr = M.cr * k * f, gain = (M.cr - S0.mass.cr) * k * f, out = rr - cr * 0.6 - gain, up = rr * M.flat - gain * Math.max(M.flat, 0.55)
      const q = [c[0] + v[0] * (gain ? Math.max(0, out) : out), c[1] + v[1] * (gain ? Math.max(0, out) : out), c[2] + v[2] * Math.max(0, up)]
      if (season !== "bare") masses.push(sdf.ellipsoid([cr, cr, cr * Math.max(M.flat, 0.55)]).at(...q))
      if (!M.hang) continue
      const z = Math.max(0.15 * height, q[2] - M.hang * height * (0.5 + R() * 0.5)), late = gust(0.1 + R() * 0.2), shear = (q[2] ** 2 - z ** 2) / height ** 2
      const th = season === "bare" ? 0.6 : 1, strand = sdf.capsule(q, (ck) => [q[0] + wind * (gust(0)(ck) * shear + (2 * late(ck) * (q[2] - z)) / height), q[1], z], (cr - gain) * 0.32 * th, (cr - gain) * 0.2 * th)
      if (season === "bare") wood.push(strand.mat(S.twigs))
      else masses.push(strand)
    }
  }
  // the fronds: off the trunk's top a golden angle apart, the oldest lowest, each a flat leaf along a
  // spine bending down, widest past its middle (worked out bare too: its top sets the size)
  const tops = []
  if (S.fronds) {
    const F = S.fronds, m = 6
    for (let i = 0; i < F.n; i++) {
      const f = i / Math.max(1, F.n - 1), az = a0 + i * 2.39996 + (R() - 0.5) * 0.3, seg = (F.len * height * (1 - 0.3 * f)) / m
      let el = F.rise[0] + (F.rise[1] - F.rise[0]) * f + (R() - 0.5) * 0.2, p = top
      for (let j = 0; j < m; j++) {
        const w = (F.width * height * Math.sin(Math.PI * (0.12 + (0.8 * (j + 0.5)) / m))) / 2, d = way(az, el), q = add(p, mul(d, seg / 2))
        if (season !== "bare") masses.push(sdf.ellipsoid([seg * 0.65, w, w * 0.2]).rotate((-el * 180) / Math.PI, "y").rotate((az * 180) / Math.PI, "z").at(...q))
        tops.push(q[2] + w * 0.2)
        p = add(p, mul(d, seg))
        el -= (F.droop * (1.3 - 0.6 * f)) / m
      }
    }
  }
  // its fruit hanging round the top under the leaves (a palm's coconuts)
  if (S.fruit && season !== "bare") for (let i = 0, F = S.fruit, r = F.r * height; i < F.n; i++)
    masses.push(sdf.sphere(r * (0.9 + 0.2 * R())).mat(F.mat).at(top[0] + 1.5 * r * Math.cos(a0 + (i * TAU) / F.n), top[1] + 1.5 * r * Math.sin(a0 + (i * TAU) / F.n), top[2] - r * (2.6 + 0.7 * (i % 2))))
  const leaf = season === "bare" ? null : [S.leaves[season]].flat()[color % [S.leaves[season]].flat().length]
  // the crown's face in small bumps, the clusters' own leaves catching the light
  // its bark's marks (`marks.at(p, height)`: a birch's, a palm's rings) in a second material
  const bark = sdf.union(wood, { smooth: 0.06 * k }).mat(S.bark), trunk = S.marks ? bark.paint(S.marks.mat, (p) => S.marks.at(p, height)) : bark, crown = masses.length ? sdf.union(masses, { smooth: 0.08 * k }).noise({ amp: S.mass.bump * k, scale: S.mass.grain * k, seed }).mat(leaf) : null
  // grown, scaled so its top (its leaves', bare or not) stands at `height`
  const crest = Math.max(...tips.map((t) => t[2] + (S.mass.lift + S.mass.r * S.mass.flat) * k), ...tops), fit = height / crest
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
// The English oak grown in the open: a short stout trunk forking low into a few heavy limbs that go out
// wide and crooked, forking twice more: a broad round crown, dense and heavy; russet in autumn.
const OAK = { height: 7, form: "fork", fork: 0.26, r: 0.3, lean: 0.05, kink: 0.55, limbs: 6, rise: [0.75, 0.45, 0.3], len: [0.24], splits: [2, 2], shrink: 0.75, spread: 0.9, taper: 0.65,
  layered: true, mass: { r: 0.9, flat: 0.85, clusters: 4, cr: 0.52, lift: 0.15, bump: 0.06, grain: 0.15 }, wind: 0.08, bark: "bark",
  leaves: { spring: "oak_spring", summer: "oak_summer", autumn: "oak_autumn" } }
// The silver birch: slender, a leader up to the top, branches climbing steeply off it, their twigs
// hanging; a narrow light crown of small clusters with sky through it; gold in autumn.
const BIRCH = { height: 7, form: "leader", fork: 0.25, r: 0.18, lean: 0.06, kink: 0.25, limbs: 14, rise: [0.9, -0.5], len: [0.22], profile: (f) => (0.5 + 0.5 * Math.sin(Math.PI * Math.min(1, 0.15 + f * 0.9))) * (1 - 0.45 * f),
  splits: [2], shrink: 0.6, spread: 0.8, taper: 0.5, crowned: true,
  mass: { r: 0.45, flat: 0.8, clusters: 4, cr: 0.22, lift: -0.05, bump: 0.04, grain: 0.1 }, wind: 0.18, bark: "birch_bark",
  // dark at its foot and out along its branches, short dark dashes across the white trunk
  marks: { mat: "birch_mark", at: (p, h) => p[2] < 0.02 * h * (1 + hash(Math.floor(Math.atan2(p[1], p[0]) * 3), 1)) || Math.hypot(p[0], p[1]) > 0.07 * h || (((p[2] / h) * 16) % 1 < 0.25 && hash(Math.floor((p[2] / h) * 16), Math.floor(Math.atan2(p[1], p[0]) * 2)) < 0.45) },
  leaves: { spring: "birch_spring", summer: "birch_summer", autumn: "birch_gold" } }
// The weeping willow: a short thick trunk forking into limbs that climb and arch out, and from every
// cluster a long strand hanging nearly to the ground: a dome falling in curtains that sway.
const WILLOW = { height: 6, form: "fork", fork: 0.28, r: 0.22, lean: 0.12, kink: 0.5, limbs: 5, rise: [1.1, 0.3, -0.4], len: [0.28], splits: [2, 2], shrink: 0.7, spread: 1.1, taper: 0.65,
  layered: true, mass: { r: 0.55, flat: 0.5, clusters: 3, cr: 0.3, lift: 0.1, bump: 0.02, grain: 0.08, hang: 0.7 }, wind: 0.12, bark: "bark", twigs: "willow_twigs",
  leaves: { spring: "willow_spring", summer: "willow_summer", autumn: "willow_gold" } }
// The coconut palm: one trunk leaning from its foot and curving up, no branches, a crown of long fronds
// arching out and down, the young ones standing up in the middle; evergreen.
const PALM = { height: 6, form: "fork", fork: 0.85, r: 0.16, lean: 0.5, kink: 0.1, bow: 0.08, limbs: 0,
  fronds: { n: 12, len: 0.55, width: 0.08, rise: [-0.2, 0.55], droop: 1.6 }, mass: { bump: 0.015, grain: 0.08 }, wind: 0.12, bark: "palm_bark",
  fruit: { n: 4, r: 0.035, mat: "coconut" }, marks: { mat: "palm_ring", at: (p, h) => ((p[2] / h) * 18 + 0.8 * vnoise((p[2] / h) * 6, 0.5)) % 1 < 0.3 },
  leaves: { spring: "palm_fronds", summer: "palm_fronds", autumn: "palm_fronds", winter: "palm_fronds" } }

// The Japanese cherry (sakura, a Somei-yoshino): a dark trunk ringed with pale lenticels, forking low into
// limbs that spread wide and nearly level: a broad crown, a cloud of pale pink in spring before its
// leaves; red and orange in autumn.
const SAKURA = { height: 5, form: "fork", fork: 0.28, r: 0.17, lean: 0.1, kink: 0.45, limbs: 6, rise: [0.75, 0.4, 0.2], len: [0.26], splits: [2, 2], shrink: 0.7, spread: 1.1, taper: 0.6,
  layered: true, mass: { r: 0.55, flat: 0.6, clusters: 3, cr: 0.28, lift: 0.08, bump: 0.05, grain: 0.1 }, wind: 0.1, bark: "sakura_bark",
  marks: { mat: "sakura_lenticel", at: (p, h) => ((p[2] / h) * 22) % 1 < 0.18 && hash(Math.floor((p[2] / h) * 22), Math.floor(Math.atan2(p[1], p[0]) * 2.5)) < 0.5 },
  leaves: { spring: "sakura_blossom", summer: "sakura_summer", autumn: "sakura_autumn" } }
// The Italian cypress: a leader straight up, short branches pressed close against it from near the
// ground to the top: a dark column, widest low down and closing to a point; evergreen.
const CYPRESS = { height: 8, form: "leader", fork: 0.04, r: 0.16, lean: 0.02, kink: 0.1, limbs: 20, rise: [1.2], len: [0.09], profile: (f) => 0.8 + 0.2 * Math.sin(Math.PI * Math.min(1, f + 0.3)) - 0.6 * f * f,
  splits: [], shrink: 0.5, spread: 0.5, taper: 0.5,
  mass: { r: 0.4, flat: 1.5, clusters: 4, cr: 0.3, lift: 0.1, bump: 0.05, grain: 0.1 }, wind: 0.06, bark: "pine_bark",
  leaves: { spring: "cypress", summer: "cypress", autumn: "cypress", winter: "cypress" } }
// The umbrella thorn acacia of the savanna: a trunk forking low into two or three stems climbing in a V,
// then branching out level: a wide flat crown, thin as a table top; green in the rains, olive when dry.
const ACACIA = { height: 5, form: "fork", fork: 0.22, r: 0.12, lean: 0.08, kink: 0.45, limbs: 3, rise: [1, 0.15, 0.05], len: [0.26], splits: [2, 2], shrink: 0.7, spread: 1.3, taper: 0.6,
  mass: { r: 0.9, flat: 0.2, clusters: 5, cr: 0.42, lift: 0.1, bump: 0.04, grain: 0.1 }, wind: 0.07, bark: "acacia_bark",
  leaves: { summer: "acacia_green", autumn: "acacia_dry" } }
// The African baobab: a bottle of a trunk, swelling low and narrowing up to a crown of short thick limbs
// twisting out like roots; a few small clusters of leaves in the rains, bare the rest of the year.
const BAOBAB = { height: 6, form: "fork", fork: 0.6, r: 0.75, girth: (t) => 1 + 0.2 * Math.sin(Math.PI * t) - 0.45 * t * t, lean: 0.03, kink: 0.7, limbs: 7, rise: [0.35, 0.5], len: [0.28], splits: [2], shrink: 0.6, spread: 1.2, taper: 0.45,
  mass: { r: 0.35, flat: 0.6, clusters: 2, cr: 0.22, lift: 0.05, bump: 0.03, grain: 0.08 }, wind: 0.03, bark: "baobab_bark",
  leaves: { summer: "baobab_leaves" } }

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
  oak_spring: ["#26401c", "#3e6626", "#62902e", "#94b844", "#cadc74"],
  oak_summer: ["#142a1a", "#203e22", "#33582a", "#4e7632", "#7a9a46"],
  oak_autumn: ["#341a12", "#5e2c16", "#88421c", "#ad6428", "#cc8c40"],
  birch_bark: ["#5a5660", "#8e8a90", "#c4c0bc", "#ece8de"],
  birch_mark: ["#1e1a1e", "#3a3236"],
  birch_spring: ["#2e4a1e", "#4e7a2a", "#7eaa3a", "#b6d45e", "#e2ee96"],
  birch_summer: ["#1e3a20", "#36602a", "#5a8a34", "#8cb448", "#c0d870"],
  birch_gold: ["#5a3e0c", "#93680e", "#c99a1a", "#eac43a", "#f8e47c"],
  willow_spring: ["#34461a", "#566e22", "#839a2e", "#b4c64c", "#e0e886"],
  willow_summer: ["#1e3424", "#34543a", "#527648", "#7c9a5e", "#aec48a"],
  willow_gold: ["#4e4214", "#7e6a18", "#ae9424", "#d4bc42", "#f0e07c"],
  willow_twigs: ["#5a3e16", "#8e6624", "#bc9038", "#dcb85a"],
  sakura_bark: ["#1c1216", "#33212a", "#4c3236", "#6a4a46"],
  sakura_lenticel: ["#6e5c58", "#8e7c74"],
  sakura_blossom: ["#7a3a56", "#b45e7e", "#dc8ea6", "#f4bccc", "#fff0f2"],
  sakura_summer: ["#18321e", "#2a4e28", "#426e32", "#64903e", "#98b456"],
  sakura_autumn: ["#46141a", "#7a2420", "#ae4224", "#d4703a", "#eca462"],
  cypress: ["#0c1c18", "#16302a", "#224432", "#365c3a", "#58784a"],
  acacia_bark: ["#2a2220", "#463a34", "#66564a", "#88786a"],
  acacia_green: ["#24301a", "#3e4e22", "#5e7030", "#889640", "#b4ba62"],
  acacia_dry: ["#3e3618", "#62562a", "#8a7c3a", "#b0a252", "#d4c87a"],
  baobab_bark: ["#4a3a3a", "#6e5a54", "#94806e", "#b8a48e", "#d8c8b0"],
  baobab_leaves: ["#1e3a1e", "#345e28", "#548436", "#80a84a"],
  palm_bark: ["#3a2e26", "#5c4a3a", "#7e6a52", "#a08c6c"],
  palm_ring: ["#2a201a", "#40342a"],
  palm_fronds: ["#16321e", "#245028", "#3a7230", "#5e9638", "#94bc4c"],
  coconut: ["#2e2414", "#4e3e1e", "#6e5a2a", "#8e7a3a"],
}
// as a tree is lit (the nature kit's spruce): the light wrapped round it, its edge toward the light a
// step up, no line round it
const TREE_LOOK = { soft: 0.6, rim: 0.85, outline: false }
const SPECIES = { momiji: MOMIJI, ginkgo: GINKGO, kuromatsu: KUROMATSU, oak: OAK, birch: BIRCH, willow: WILLOW, palm: PALM, sakura: SAKURA, cypress: CYPRESS, acacia: ACACIA, baobab: BAOBAB }
for (const [name, S] of Object.entries(SPECIES)) make3d.define(name, (o) => growTree(S, o), treeParams(S))
Object.assign(trees, { mats: TREE_MATS, look: TREE_LOOK, species: SPECIES, grow: growTree, params: treeParams })
}
