// Three shrine stages for the fighting profile (lib/profiles/fighting.px.js), as an engine takes a stage (MUGEN's
// stage .def): its layers as sprites, each as wide as its parallax shows it, and its layout as data. Variants:
// - shrine_dusk (A): the approach under a torii at dusk in autumn; the sun low between the torii's posts, lighting
//   everything from behind; the maples and the lanterns in a moss bed behind a cut-stone curb, the leaves in drifts;
// - shrine_noon (B): the hall's courtyard at noon in spring; the cherries in stone planters, cedar hills behind, a
//   blue range in the haze;
// - shrine_night (C): a mountain shrine in snow at night; a massif under the moon, the pines in tree wells, snow
//   heaped at every foot.
// Built the same way (the library's fighting study, 14.0-14.8): a stage 720 px wide (2.25 screens of 320, KOF's
// 2.25-2.4), the camera's left edge from 0 to 400 in it (the round starts at 200, the middle); the sky at a parallax
// of 0.1 and three ranges by terrain() at 0.2, 0.3 and 0.4, each its own light's; the middle planes at 0.55-0.85; the
// floor going by row, 0.75 at its back to 1 at the fighters' line (row 204, 20 px over the screen's bottom), and each
// thing on it at its row's (a layer's parallax by row: what stands on a floor stays on it). The kit is the library's,
// drawn in 3D by turnaround() through the fighting camera (side, pitch 10): lib/architecture/japan.px.js (the torii,
// the hall, the lanterns, the foxes) and lib/nature/trees.px.js (the maples, the cherries, the pines), the trees
// stood on their drawn foot (pivot "foot"), planted in what holds them (a bed, a planter, a tree well), their trunks
// flared, roots, a contact shadow each. The stage behind the fighters keeps them reading at 1x (14.2): L median at
// least 45 and its 10th percentile 30, C at most 7.5 (OKLab), the floor at their feet as light or lighter; no line.
// What moves (14.1, 14.5: small, few and slow, behind the fighters; one loop a stage, each part's dividing it): A the
// lanterns' flames and three maple leaves falling to the bed and the paving (480 ticks); B the clouds going by and petals drifting
// down (440); C the snow falling, near and far, the lanterns' flames and a mist drifting at the massif's foot (480).
// Taken with include("<path>/lib/stages/shrine.px.js", { palette: true, as: "shrine" }) (its palette too: a shadow
// steps its floor along its ramps): shrine.shrine_dusk (the still at the camera's middle, its layout on its data) and
// its layers shrine.shrine_dusk_sky, _r1, _r2, _r3, _floor, ..., on the sheet stage_shrine_dusk (the same for _noon and
// _night); stage.LAYOUT.shrine_dusk the layout; stage.layers(name, { ... }) its layers for a scene whose camera is
// stage.camera(name, x) (examples/fighting/shrine_round.px.js puts the fighters, the miko and the HUD on them).
include("../architecture/japan.px.js", { palette: true, as: "japan" })
include("../nature/trees.px.js", { as: "trees" })
include("../profiles/fighting.px.js")
pal({
  // the dusk sky, top to the horizon; noon's; night's
  a: "#2b2448", b: "#4e3062", c: "#84405e", d: "#c8604e", f: "#ee9a58", h: "#f8cf86",
  j: "#4f86cc", l: "#7aaee6", p: "#acd2f2", t: "#dceefa",
  6: "#0d1124", 7: "#151c38", 8: "#212c52", 9: "#33406c",
  // snow: its shade (blue) to its lit crust; a cloud
  1: "#46557e", 2: "#7182aa", 3: "#a7b6d4", 4: "#d4def0", 5: "#f2f6fc", 0: "#eef2f6",
  // cherry petals: their shade, their light
  "+": "#dc8ea6", "*": "#f4bccc",
  // A's bed at dusk, earth to moss (its last two the moss's tops lit by the sky behind); B's planter earth at noon;
  // C's tree well at night, its earth and needles
  "$": "#2a1f28", "&": "#3d2c35", "%": "#55404a", "=": "#5a5a3e", "~": "#76724a", "^": "#97905c",
  "<": "#5a4436", ">": "#7d644c",
  ":": "#1c1c2c", ";": "#30293a",
})
ramps("abcdfh", "jlpt", "6789", "12345", "$&%=~^", "<>", ":;")
var stage = typeof stage === "object" ? stage : {}
// in a block: its names stay its own when a scene includes the file
{
const FIGHT = genre("fighting"), [W, H] = FIGHT.screen, V = FIGHT.camera, FLOOR = 204, P1 = 90, P2 = 230
// the stage: 720 px, the camera's left edge from 0 to 400 (SCROLL), a plane at parallax d as wide as it is seen
const SCROLL = 400, wOf = (d) => W + Math.round(SCROLL * d), at0 = (d) => Math.round((SCROLL / 2) * d)
// a parallax by row as the engine takes it (a layer's { top, bottom, rows }): top at rows[0] and above, bottom at rows[1] and below
const kOf = ({ top, bottom, rows: [y0, y1] }) => (y) => top + (bottom - top) * Math.min(1, Math.max(0, (y - y0) / (y1 - y0)))
// a plane's parallax at a floor's row, as the layout gives it (4 places)
const kAt = (rows, y) => Math.round(kOf(rows)(y) * 1e4) / 1e4
const FLOOR_ROWS = (back) => ({ top: 0.75, bottom: 1, rows: [back, FLOOR] })
// a hex mixed toward another by k (night and dusk light on the kit's colors)
const mix = (a, b, k) => "#" + [1, 3, 5].map((i) => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - k) + parseInt(b.slice(i, i + 2), 16) * k).toString(16).padStart(2, "0")).join("")
const tint = (mats, to, k) => Object.fromEntries(Object.entries(mats).map(([n, r]) => [n, Array.isArray(r) ? r.map((c) => mix(c, to, k)) : r]))
const MATS = { ...japan.mats, ...trees.mats, snow: ["#3e4a6e", "#6e7ea6", "#a6b6d6", "#d8e2f2", "#f4f8ff"] }
// snow on what faces up
const snowy = (thing, up = 0.55) => ({ ...thing, field: thing.field.paint("snow", (p, n) => n[2] > up) })
// a thing seen by the fighting camera, front on
const side = (name, thing, ppm, o = {}) => turnaround(name, thing, { view: V, ppm, headings: ["s"], mats: MATS, ...o })

// ---------------------------------------------------------------- the floor seen at pitch 10 (picture px)
// Granite slabs in courses (the approach, japan.paving's stone seen low), in perspective round the picture's middle:
// its joints across radiate from a point HZ rows up, the courses growing toward us, 4 rows far to 9 near; each slab
// 30-60 px along a course at the fighters' line, a joint a px of K, the granite's speckle in clusters a step up, a slab
// now and then a step lighter or darker, moss in some joints. paving(top) paints from row `top` down.
const HZ = -140
const bands = (top, h0, h1) => { const b = [top]; while (b.at(-1) < H) { const y = b.at(-1); b.push(y + Math.round(h0 + ((h1 - h0) * (y - top)) / (H - top))) } return b }
const paving = (top, { seed = 1, mossy = 0.25 } = {}) => {
  const B = bands(top, 4, 9)
  // a slab's place along its course, in px at the fighters' line
  const slab = (c, u) => {
    let a = -Math.floor(hash(c, seed, 1) * 60) - 400, j = 0, len = 0
    while (true) { len = Math.round(30 + 30 * hash(c, j, seed + 2)); if (a + len > u) return [j, u - a]; a += len; j++ }
  }
  return (x, y) => {
    let c = 0
    while (B[c + 1] <= y) c++
    const y0 = B[c], k = (FLOOR - HZ) / (y - HZ), u = 160 + (x - 160) * k, [j] = slab(c, u), [j1] = slab(c, 160 + (x - 1 - 160) * k)
    if (y === y0 || j1 !== j) return hash(c * 31 + j, y, seed + 3) < mossy ? (hash(x, y, seed) < 0.4 ? "n" : "M") : "K"
    const tone = hash(c, j, seed + 4), base = tone < 0.1 ? "O" : tone > 0.82 ? "S" : "s"
    return fbm(u / 1.7 + c * 13, y / 1.2, 2) > 0.68 ? { O: "s", s: "S", S: "F" }[base] : base
  }
}
// white gravel raked along the hall's front (its furrows across the picture, a furrow every 3 rows, 2 far off),
// pebbles' shade and lit grains
const gravel = (top, { seed = 2 } = {}) => {
  const B = bands(top, 2, 4)
  return (x, y) => { if (B.includes(y)) return "q"; const r = hash(x, y, seed); return r < 0.05 ? "y" : r > 0.93 ? "Z" : "z" }
}
// snow lying: its crust lit in long soft swells, a trodden way across the fighters' line (bluer, a step down)
const snowfield = ({ seed = 3, way = [196, 212] } = {}) => (x, y) => {
  const s = fbm(x / 22, y / 3 + seed * 11, 3)
  if (y >= way[0] && y <= way[1] && fbm(x / 9, y / 2 + seed * 7, 2) > 0.35) return s > 0.6 ? "3" : "2"
  return s > 0.62 ? "5" : s > 0.38 ? "4" : "3"
}

// ---------------------------------------------------------------- far: the sky and three ranges (14.8)
// Each range a height field in px-meters (a meter a px where it stands, Z0 m off): peaks placed by hand, each a cone
// worn into ribs that run down from its summit, joined in saddles; drawn by terrain() through a level camera whose
// horizon is the range's foot, lit by the stage's one light (its normal against the light, ridges a little lighter
// and gullies darker by the curvature), its tones quantized to the plane's few colors, the lone pixels given to their
// neighbours'. Colors are the planes' own (#hex): no key of the kit's taken.
const Z0 = 280
const smaxH = (a, b, k = 8) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.max(a, b) + h * h * k * 0.25 }
const unit = (v) => { const l = Math.hypot(...v); return v.map((a) => a / l) }
// peaks [x (px from the strip's middle), z (m behind Z0), height, radius, profile]; the crest worn too (a ridged noise
// along it, 22 px across: summits, notches, shoulders), the slopes concave (profile 1.6): a lone smooth cone reads as a drawing
const ridged = (x, y) => 1 - Math.abs(2 * vnoise(x, y) - 1)
const massif = (peaks, { seed = 1, ribs = 9, cut = 0.5, squash = 1.6, wear = 0.22 } = {}) => (x, z) => {
  let h = 0
  for (const [px, pz, ph, r, k = 1.6] of peaks) {
    const dx = x - px, dz = (z - Z0 - pz) * squash, d = Math.hypot(dx, dz) / r
    if (d >= 1) continue
    const a = Math.atan2(dz, dx), rib = ridged((a / Math.PI + 1) * ribs + px * 0.013 + seed * 7.7, d * 2.2 + seed)
    h = smaxH(h, ph * (1 - d) ** k * (1 - cut * (1 - rib) ** 1.5 * Math.min(1, d * 3)))
  }
  return h * (1 - wear * (1 - ridged(x / 22 + seed * 3, z / 22)) ** 2 - 0.5 * wear * (1 - ridged(x / 9 + seed, z / 9 + 5)) ** 2)
}
// a mountain by hand: its summit, a shoulder either side (the one toward `lean` lower and farther out), a spur toward
// us under the summit, its broad foot
const mount = (x, h, r, { z = 20, k = 1.5, lean = 1 } = {}) => [[x, z, h, r * 0.5, k], [x - lean * r * 0.42, z + 14, h * 0.7, r * 0.45, k],
  [x + lean * r * 0.4, z + 8, h * 0.52, r * 0.5, k], [x + lean * r * 0.1, z - 26, h * 0.42, r * 0.3, k], [x, z + 24, h * 0.5, r, 1.1]]
const mounts = (...ms) => ms.flatMap(([x, h, r, o]) => mount(x, h, r, o))
// a far plane at parallax d: `height` seen through a level camera (its horizon the row `foot`), `tone(p)` a color for
// each point (p: x, z, u its height, n its normal [x, z, up], cv the curvature, col, row, sx the column on the screen
// at the start camera); `rim` (backlit: the crest's color where the low sun grazes it, on the slopes facing it, `from`
// -1 the left); drawn down to the row `bottom`; `after(set, at, w)` paints over it (before the cleaning)
const farPlane = (name, d, height, tone, { foot, bottom = H, top = 140, rim, rimNear, from: fromOf = -1, after } = {}) => {
  const w = wOf(d), s0 = at0(d)
  sprite(name, { w, h: H }, (c) => {
    const K = Array(w * H).fill(null), e = 1, k = 4
    c.terrain({ w, horizon: foot, eye: 0.5, focal: Z0, vp: w / 2 }, height, (x, z, u, t, col, row) => {
      if (col < 0 || col >= w || row < 0 || row >= bottom) return null
      const h0 = height(x, z), hx = (height(x + e, z) - height(x - e, z)) / (2 * e), hz = (height(x, z + e) - height(x, z - e)) / (2 * e)
      const cv = (4 * h0 - height(x + k, z) - height(x - k, z) - height(x, z + k) - height(x, z - k)) / 4
      K[row * w + col] = tone({ x, z, u, n: unit([-hx, -hz, 1]), cv, col, row, sx: col - s0 })
      return null
    }, { far: 4000, top })
    const at = (x, y) => (x >= 0 && x < w && y >= 0 && y < H ? K[y * w + x] : null)
    // the crest evened on its slopes: where five columns' tops run one way, each top goes to their mean (a long slope
    // steps in runs that grow or shrink in order, not 1 3 1 2; peaks and notches left); twice
    for (let pass = 0; pass < 2; pass++) {
      const tops = Array.from({ length: w }, (_, x) => { let y = 0; while (y < H && K[y * w + x] === null) y++; return y })
      for (let x = 2; x < w - 2; x++) {
        const t5 = tops.slice(x - 2, x + 3), up = t5.every((v, i) => !i || v <= t5[i - 1]), down = t5.every((v, i) => !i || v >= t5[i - 1])
        if (!(up || down) || tops[x] >= H) continue
        const to = Math.round(t5.reduce((a, b) => a + b) / 5), k0 = K[tops[x] * w + x]
        for (let y = to; y < tops[x]; y++) K[y * w + x] = k0
        for (let y = tops[x]; y < to; y++) K[y * w + x] = null
      }
    }
    if (rim) for (let x = 0; x < w; x++) {
      const from = typeof fromOf === "function" ? fromOf(x - s0) : fromOf
      let y = 0
      while (y < H && at(x, y) === null) y++
      if (y >= H) continue
      const top = (xx) => { let yy = 0; while (yy < H && at(Math.max(0, Math.min(w - 1, xx)), yy) === null) yy++; return yy }
      const slope = from * (top(x - 2) - top(x + 2))   // > 0: the crest falls toward the light here
      if (rimNear && near(x - s0, ...rimNear) < 0.2 && slope <= 2) continue
      if (slope >= 0) { K[y * w + x] = rim; if (slope > 2 && at(x, y + 1) !== null) K[(y + 1) * w + x] = rim }
    }
    if (after) after((x, y, v) => { if (x >= 0 && x < w && y >= 0 && y < H) K[y * w + x] = v }, at, w)
    // lone pixels (none of their four neighbours like them, three or more of them drawn) take the most common
    for (let pass = 0; pass < 2; pass++) for (let y = 0; y < H; y++) for (let x = 0; x < w; x++) {
      const v = at(x, y)
      if (v === null) continue
      const nb = [at(x + 1, y), at(x - 1, y), at(x, y + 1), at(x, y - 1)].filter((q) => q !== null)
      if (nb.length < 3 || nb.includes(v)) continue
      const n = {}; for (const q of nb) n[q] = (n[q] || 0) + 1
      K[y * w + x] = Object.keys(n).sort((a, b) => n[b] - n[a])[0]
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < w; x++) if (K[y * w + x] !== null) c.px(x, y, K[y * w + x])
  })
}
// a tone by thresholds: `keys` dark to light, `cuts` the values between them
const step = (v, keys, cuts) => { let i = 0; while (i < cuts.length && v > cuts[i]) i++; return keys[i] }
const near = (sx, at, r) => Math.exp(-(((sx - at) / r) ** 2))
const wave = (x, parts) => parts.reduce((s, [k, a, ph]) => s + a * Math.sin(x / k + ph), 0)
const lamOf = (p, S) => p.n[0] * S[0] + p.n[1] * S[1] + p.n[2] * S[2] + 0.05 * Math.max(-3, Math.min(3, p.cv))

// ---------------------------------------------------------------- what stands, planted
// Lone pixels out of what is painted here (x0..x1, y0..y1): one none of whose four neighbours shares its key, three or
// more of them painted, takes their most common (two passes); the leaves' and petals' keys kept (a leaf is 2-3 px of
// two tones) and never given; what is off the palette ("?": a tree stamped in) neither changed nor counted
const KEEP = "eRrouUgGY+*"
const tidy = (c, x0, y0, x1, y1) => {
  for (let pass = 0; pass < 2; pass++) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const k = c.key(x, y)
    if (k === "." || k === "?" || KEEP.includes(k)) continue
    const nb = [c.key(x + 1, y), c.key(x - 1, y), c.key(x, y + 1), c.key(x, y - 1)].filter((q) => q !== "." && q !== "?")
    if (nb.length < 3 || nb.includes(k)) continue
    const n = {}
    for (const q of nb) if (!KEEP.includes(q)) n[q] = (n[q] || 0) + 1
    const to = Object.keys(n).sort((a, b) => n[b] - n[a])[0]
    if (to) c.px(x, y, to)
  }
}
const inEll = (S) => (x, y) => S.some(([cx, cy, rx, ry]) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1)
// a stage's floor, a sprite as wide as the stage (720) from row `top`: `paint(x, y)` in the still's px (the camera's
// middle; null: clear), each row moved by its parallax at the middle (`rows`: the layer's, 0.75 at its back to 1 at the
// fighters' line), so the engine moving each row by its own puts the still there; `shadows` [x, y, rx, ry] laid on it
// a shade of 2; the rows over `rows`' back (A's bed and curb) tidied
const floor = (name, top, rows, paint, shadows) => {
  const sh = inEll(shadows), k = kOf(rows), o = (y) => Math.round(200 * k(y)), w = wOf(1)
  sprite(name, { w, h: H - top }, (c) => {
    for (let y = top; y < H; y++) { const oy = o(y); for (let X = 0; X < w; X++) { const v = paint(X - oy, y); if (v) c.px(X, y - top, v) } }
    if (rows.rows[0] > top) tidy(c, 0, 0, w - 1, rows.rows[0] - top - 1)
  }, shade((X, y) => sh(X - o(y + top), y + top), 2))
}
// a plane at parallax d: `items` drawn in the still's px, the still's x round(200 d) in (the camera's middle shows it);
// `after` over the whole sprite (a glow)
const plane = (name, d, items, { sort, after = [] } = {}) => sprite(name, { w: wOf(d), h: H }, layer(name, { x: at0(d), ...(sort ? { sort } : {}) }, ...items), ...after)
// a tree's trunk planted: the tree (its sprite stood on its drawn foot, pivot "foot") stamped, its trunk read `rise`
// rows over its foot and stretched down to a row under it, `flare` px wider each side at the bottom (the foot swells as
// it nears the ground; drawn, the trunk ended in a round tip, a post stood on the floor), and `roots` [side, len]
// running out along the ground from the foot's edge, 2 rows thick near the trunk and 1 beyond, the last quarter a row
// down, into the ground; all in the trunk's own tones, its edge on that side over its middle, so its light stays its
// own. Its pivot the foot: stamped where its trunk meets the ground
const rooted = (name, src, T, { rise = 6, flare = 4, roots = [[-1, 8], [1, 6]], pad = 14 } = {}) => {
  const px = T.pivot[0] + pad, py = T.pivot[1] + 8
  sprite(name, { w: T.w + 2 * pad, h: T.h + 11, pivot: [px, py] }, stamp(src, px, py), (c) => {
    let fy = py + 1
    while (fy > 0 && !c.is(px, fy, "*")) fy--
    const y0 = fy - rise
    let a0 = px, b0 = px
    while (c.is(a0 - 1, y0, "*")) a0--
    while (c.is(b0 + 1, y0, "*")) b0++
    const keys = []
    for (let x = a0; x <= b0; x++) keys.push("#" + (c.get(x, y0) >>> 8).toString(16).padStart(6, "0"))
    const n = keys.length, at = (x, a, b) => keys[Math.min(n - 1, Math.floor(((x - a) / (b - a + 1)) * n))]
    for (let y = y0 + 1; y <= fy + 1; y++) {
      const t = (y - y0) / (fy + 1 - y0), e = Math.round(flare * t * t), a = a0 - e, b = b0 + e
      for (let x = a; x <= b; x++) c.px(x, y, at(x, a, b))
    }
    for (const [s, len] of roots) {
      const x0 = s < 0 ? a0 - flare : b0 + flare
      for (let i = 1; i <= len; i++) {
        const x = x0 + s * i, y = fy + 1 + (i > 0.75 * len ? 1 : 0)
        c.px(x, y, keys[n >> 1])
        if (i <= len / 2) c.px(x, y - 1, keys[s < 0 ? 0 : n - 1])
      }
    }
  })
}
// snow heaped at a foot (C): a mound `w` px either side of x, `hgt` rows high at its middle, standing on row y + 1,
// its top lit (the moon on the right), its left foot a step down
const mound = (x, y, w, hgt = 3) => (c) => {
  for (let xx = x - w; xx <= x + w; xx++) {
    const u = (xx - x) / w, h = Math.round(hgt * Math.sqrt(Math.max(0, 1 - u * u)))
    for (let k = 0; k <= h; k++) c.px(xx, y + 1 - k, k === h ? (u > -0.3 ? "5" : "4") : u < -0.5 ? "3" : "4")
  }
  tidy(c, x - w, y + 1 - hgt, x + w, y + 1)
}
// a lantern's flame in its firebox's window, w x h: a tongue 4 px tall of the kit's lamp keys (I its core, i the
// window's own light round it), 4 drawings of 4 ticks (14.5), its pivot the window's foot
const flameAnim = (name, w, h, seed) => anim(name, { w, h, frames: 4, fps: 15, pivot: [w >> 1, h] }, (c) => c.flame(w >> 1, h, 4, "Ii", { period: 4, wind: 0.2, seed }))

// ================================================================ A. shrine_dusk: the approach at dusk, autumn
// The paved approach (sandō) runs across the picture; along its far side a bed of earth and moss behind a curb of
// long cut stones, the stone lanterns just lit and the red, orange and gold maples standing in it, their crowns closing
// over the top; far off, up a stair between two banks of the same moss, a torii and two small lanterns on a landing,
// the sun setting between the torii's posts (it lights everything from behind: the kit rimmed on its tops, a step down
// on its fronts, the shadows falling toward us); three ranges violet in the haze, paler and warmer toward the sun.
const A_SUN = unit([-0.08, 0.9, 0.2]), A_SUN_X = 162, A_FROM = (sx) => (sx < A_SUN_X ? -1 : 1)
const aRange = (keys, cuts, haze, mist) => (p) => {
  if (p.u < mist(p.x)) return haze
  const lam = p.n[0] * A_SUN[0] + p.n[1] * A_SUN[1] + p.n[2] * A_SUN[2]
  return step(lam + 0.05 * Math.max(-3, Math.min(3, p.cv)) + 0.32 * near(p.sx, A_SUN_X, 70), keys, cuts)
}
sprite("shrine_dusk_sky", { w: wOf(0.1), h: H }, grad(0, 0, wOf(0.1), 150, "abcdfh", "v", 0.5, "lines"), rect(0, 150, wOf(0.1), H - 150, "h"),
  circ(A_SUN_X + 20, 135, 10, "#fbe3b0"), circ(A_SUN_X + 20, 135, 8, "#fff4dc"))
farPlane("shrine_dusk_r1", 0.2, massif(mounts([-160, 30, 90], [-66, 46, 120, { lean: -1 }], [62, 28, 80], [136, 42, 110, { lean: -1 }], [204, 24, 60]), { seed: 2 }),
  aRange(["#c08286", "#d2968c", "#e2aa92"], [0.02, 0.2], "#e8b292", (x) => 5 + wave(x, [[29, 2, 0], [11, 1, 2]])), { foot: 146, bottom: 160, rimNear: [A_SUN_X, 150], rim: "#f8d29c", from: A_FROM })
farPlane("shrine_dusk_r2", 0.3, massif(mounts([-196, 34, 90, { lean: -1 }], [-112, 26, 70], [-22, 16, 60], [74, 30, 90, { lean: -1 }], [168, 38, 110], [232, 22, 50]), { seed: 5 }),
  aRange(["#9c6c80", "#ae7c86", "#c6928c"], [0.0, 0.18], "#d29a8e", (x) => 5 + wave(x, [[23, 2, 1], [9, 1, 0]])), { foot: 156, bottom: 170, rimNear: [A_SUN_X, 150], rim: "#f2bc88", from: A_FROM })
farPlane("shrine_dusk_r3", 0.4, massif(mounts([-214, 46, 120], [-124, 32, 80, { lean: -1 }], [-58, 22, 60], [44, 18, 54, { lean: -1 }], [114, 34, 90], [210, 46, 120, { lean: -1 }]), { seed: 9 }),
  aRange(["#7c5672", "#8e6478", "#a47584"], [-0.1, 0.1], "#c08c8a", (x) => 4 + wave(x, [[19, 2, 2], [7, 1, 1]])), { foot: 167, rimNear: [A_SUN_X, 150], rim: "#e8aa80", from: A_FROM })
const DUSK = [-0.15, 0.9, 0.42], DUSK_MATS = tint(MATS, "#6a3046", 0.12)
side("_dusk_torii", make3d.torii({ height: 3 }), 24, { light: DUSK, mats: DUSK_MATS })
side("_dusk_toro", make3d.toro(), 44, { light: DUSK, mats: DUSK_MATS })
side("_dusk_toro_far", make3d.toro(), 24, { light: DUSK, mats: DUSK_MATS })
const maple = (n, o) => side(n, make3d.momiji({ season: "autumn", ...o }), 36, { light: DUSK, mats: DUSK_MATS, surface: trees.look, pivot: "foot" })
const T_AMR = maple("_dusk_maple_r", { color: 0, height: 3.4, seed: 2 }), T_AMO = maple("_dusk_maple_o", { color: 1, height: 2.8, seed: 5 }), T_AMG = maple("_dusk_maple_g", { color: 2, height: 3.2, seed: 7 })
// The bed: earth and moss in patches (the moss on the tops, lit by the sky behind), its back edge ragged over the far
// haze; the maples' leaves gathered in it, thickest round the trunks and against the curb. The curb: a course of long
// cut stones (30-46 px), its top lit (the sun behind), its face toward us a step down, a joint a px of K; the paving from
// A_TOP. The leaves on the paving only in drifts: against the curb where the wind leaves them (a few, 30-50 px long, up
// to 6 rows out) and at the stair's foot, thickest in its corners; the open paving clear.
const A_TOP = 162, A_BED = 152, A_CURB = 158, A_FLOOR = 149
const aFloor = paving(A_TOP, { seed: 4 })
const aBedEdge = (x) => A_BED - Math.round(2.4 * fbm(x / 6, 3.7, 2))
const A_FEET = [[-24, 156, "eRr"], [48, 154, "ouU"], [348, 157, "gGY"]]
const A_TORO_AT = [30, 290], A_TORO_Y = 156
const aBed = (x, y) => {
  const s = fbm(x / 9, y / 2.2 + 4, 3), lit = fbm(x / 4, y / 1.5 + 9, 2)
  if (y <= aBedEdge(x) + 1) return lit > 0.5 ? "^" : "~"
  return s > 0.52 ? (lit > 0.6 ? "^" : "~") : s > 0.42 ? "=" : lit > 0.55 ? "%" : "&"
}
const aCurb = (x, y) => {
  let a = -440, j = 0, len
  while (true) { len = 30 + Math.floor(16 * hash(j, 5, 11)); if (a + len > x) break; a += len; j++ }
  const r = y - A_CURB
  if (x === a) return r === 0 ? "O" : "K"
  return r === 0 ? "F" : r === 1 ? "S" : r === 2 ? "s" : "O"
}
const drift = (x, c, half) => Math.max(0, 1 - ((x - c) / half) ** 2)
const A_DRIFTS = Array.from({ length: 8 }, (_, k) => [-180 + 110 * k + Math.floor(40 * hash(k, 1, 31)), 15 + Math.floor(10 * hash(k, 2, 31))])
const aLeafDensity = (x, y) => {
  if (y < A_CURB) return 0.3 + 0.35 * Math.max(0, ...A_FEET.map(([fx]) => 1 - Math.abs(x - fx) / 26)) + (y >= A_CURB - 2 ? 0.2 : 0)
  if (y < A_TOP) return y === A_CURB ? 0.12 : 0
  const r = y - A_TOP, curb = Math.max(...A_DRIFTS.map(([c, half]) => drift(x, c, half)))
  const stair = x > 116 && x < 204 ? Math.max(drift(x, 126, 12), drift(x, 194, 12), 0.35) : 0
  const reach = Math.max(2 + 6 * curb, stair ? 2 + 5 * stair : 0)
  return r < reach ? Math.min(0.9, 1.1 * Math.max(curb, stair) * (1 - (r / reach) ** 2)) : 0
}
const aLeafColor = (x, y, t) => {
  const own = A_FEET.reduce((m, f) => (Math.abs(x - f[0]) < Math.abs(x - m[0]) ? f : m))[2]
  return t < 0.6 ? own : t < 0.75 ? "eRr" : t < 0.9 ? "ouU" : "gGY"
}
const aLeaves = japan.leaves(aLeafDensity, aLeafColor, { seed: 5 })
const A_SHADOWS = [...A_FEET.map(([x, y]) => [x + 3, y + 1, 12, 2]), ...A_TORO_AT.map((x) => [x + 2, A_TORO_Y + 2, 9, 2])]
const A_ROWS = FLOOR_ROWS(A_TOP)
floor("shrine_dusk_floor", A_FLOOR, A_ROWS, (x, y) => (y < aBedEdge(x) ? null : aLeaves(x, y) ?? (y < A_CURB ? aBed(x, y) : y < A_TOP ? aCurb(x, y) : aFloor(x, y))), A_SHADOWS)
// the stair and its banks: the banks either side of it in the bed's moss and earth, up to a landing (rows 136-139) as
// wide as the torii and its two small lanterns stand (x 104-216); the stair's lowest step on the curb's rows, its foot
// on the paving: 6 steps narrowing as they go up (away from us), each tread lit, its riser a step down. Its rows go by
// at their own parallax, 0.55 at the landing (the torii's) to 0.75 at its foot (the bed's)
const STAIR = Array.from({ length: 6 }, (_, i) => ({ y: 158 - i * 4, half: 34 - i * 3 })), A_STAIR = { top: 0.55, bottom: 0.75, rows: [139, 161] }
const aBank = (y) => [Math.round(100 + (4 * (158 - y)) / 18), Math.round(220 - (4 * (158 - y)) / 18)]
sprite("_dusk_stair", { w: W, h: H }, (c) => {
  for (let y = 140; y < A_CURB; y++) { const [l, r] = aBank(y); for (let x = l; x <= r; x++) c.px(x, y, aLeaves(x, y) ?? aBed(x, y)) }
  tidy(c, 96, 140, 224, A_CURB - 1)
  for (const { y, half } of STAIR) { c.rect(160 - half, y, 2 * half, 2, "S"); c.rect(160 - half, y + 2, 2 * half, 2, "O"); c.px(160 - half, y, "s"); c.px(160 + half - 1, y + 2, "K") }
  c.rect(104, 136, 112, 3, "s"); c.rect(104, 139, 112, 1, "S")
})
sprite("shrine_dusk_stair", { w: wOf(0.75), h: 26 }, (c) => { const k = kOf(A_STAIR); for (let y = 136; y < 162; y++) c.clip([0, y - 136, wOf(0.75), 1], () => c.stamp("_dusk_stair", Math.round(200 * k(y)), -136)) })
plane("shrine_dusk_torii", 0.55, [stamp("_dusk_torii_s", 160, 139), stamp("_dusk_toro_far_s", 114, 139), stamp("_dusk_toro_far_s", 206, 139)], { after: [glow("iI", { r: 6, strength: 0.4, bands: 2 })] })
rooted("_dusk_maple_r_p", "_dusk_maple_r_s", T_AMR, { roots: [[-1, 9], [1, 7]] })
rooted("_dusk_maple_o_p", "_dusk_maple_o_s", T_AMO, { roots: [[-1, 7], [1, 8]] })
rooted("_dusk_maple_g_p", "_dusk_maple_g_s", T_AMG, { roots: [[-1, 8], [1, 6]] })
const A_MID = kAt(A_ROWS, A_CURB - 1)
plane("shrine_dusk_mid", A_MID, [...A_FEET.map(([x, y], i) => stamp(["_dusk_maple_r_p", "_dusk_maple_o_p", "_dusk_maple_g_p"][i], x, y)), ...A_TORO_AT.map((x) => stamp("_dusk_toro_s", x, A_TORO_Y))],
  { sort: "y", after: [glow("iI", { r: 6, strength: 0.4, bands: 2 })] })

// ================================================================ B. shrine_noon: the hall's courtyard at noon, spring
// The hall of worship (haiden) square behind the fighters, its white walls behind their bodies, its copper roof green
// over their heads; the foxes on their pedestals either side of it, facing each other across the courtyard; a cherry in
// bloom at each end in a low stone planter, its petals on the gravel. The floor: white gravel raked across before the
// hall, then the paving the fighters stand on. Behind: cedar hills (sugi) in clumps, lower blue-green hills, far off a
// blue range in the haze with snow left on its tops; the sun high, ahead and to the left.
const B_SUN = unit([-0.4, -0.55, 0.75])
sprite("shrine_noon_sky", { w: wOf(0.1), h: H }, grad(0, 0, wOf(0.1), 136, "jlpt", "v", 0.5, "lines"), rect(0, 136, wOf(0.1), H - 136, "t"))
farPlane("shrine_noon_r1", 0.2, massif(mounts([-176, 72, 150], [-64, 88, 190, { lean: -1 }], [54, 68, 140], [150, 86, 180, { lean: -1 }], [222, 62, 110]), { seed: 3 }),
  (p) => p.u < 5 + wave(p.x, [[27, 2, 0], [10, 1, 1]]) ? "#c6d8e8" : p.u > 58 + wave(p.x, [[17, 3, 1]]) && p.n[2] > 0.35
    ? step(lamOf(p, B_SUN), ["#c4d4e6", "#e2ecf4"], [0.62]) : step(lamOf(p, B_SUN), ["#8aa4c2", "#9fb6d0", "#b4c8dc"], [0.5, 0.7]), { foot: 124, bottom: 150 })
farPlane("shrine_noon_r2", 0.3, massif([[-200, 30, 56, 130, 1.0], [-90, 40, 62, 150, 1.0], [30, 20, 50, 120, 1.0], [140, 40, 60, 150, 1.0], [226, 20, 48, 100, 1.0]], { seed: 6, ribs: 6, cut: 0.3, wear: 0.12 }),
  (p) => p.u < 4 + wave(p.x, [[23, 2, 1], [8, 1, 0]]) ? "#b4cad6" : step(lamOf(p, B_SUN), ["#7496a0", "#88a8ac", "#9cbab4"], [0.55, 0.75]), { foot: 140, bottom: 158 })
// the cedar wood (its hills 0.65 as tall as at first): its crowns in clumps of three, 8-9 px tall side by side, only the
// middle one's top and left lit, so the light lies in clusters on the clumps' tops; the clumps 15 px apart in rows 10
// apart down the slopes, a third left out (the hill's own tone between them), a row of lit clumps along the ridge; no
// crown's tip a lone lit pixel
const SUGI = [`
..m..
.lmm.
.lmm.
llmmd
lmmmd
lmmdd
mmmdd
mmddd`, `
...m...
..lmm..
..lmmd.
.llmmd.
.lmmmd.
llmmmdd
lmmmddd
mmmmddd
mmmdddd`].map((g) => g.trim().split("\n"))
const sugi = (keys, { seed = 1, gap = 15, rows = 10, skip = 0.33 } = {}) => (set, at, w) => {
  const put = (x0, y0, g, lit) => g.forEach((row, j) => [...row].forEach((k, i) => { if (k !== ".") set(x0 + i - (row.length >> 1), y0 + j - g.length + 1, keys[k === "l" && !lit ? "m" : k]) }))
  const top = (x) => { let y = 0; while (y < H && at(x, y) === null) y++; return y }
  const clump = (x, y, s) => { put(x - 5, y + 2, SUGI[0], false); put(x + 5, y + 2, SUGI[s], false); put(x, y, SUGI[1], true) }
  for (let y = 0; y < H; y += rows) for (let x = (y / rows) % 2 ? 0 : Math.floor(gap / 2); x < w; x += gap) {
    const xx = x + Math.floor(hash(x, y, seed) * 5) - 2, yy = y + Math.floor(hash(x, y, seed + 3) * 3) - 1
    if (yy < top(xx) + 8 || at(xx, yy) === null || at(xx, yy) === keys.haze || hash(xx, yy, seed + 1) < skip) continue
    clump(xx, yy, Math.floor(hash(xx, yy, seed + 2) * 2))
  }
  for (let x = 4; x < w; x += 13) { const t = top(x); if (t < H && at(x, t + 6) !== keys.haze) clump(x, t + 6 + Math.floor(hash(x, 7, seed) * 2), 0) }
}
farPlane("shrine_noon_r3", 0.4, massif([[-236, 0, 48, 150, 0.9], [-136, 30, 50, 170, 0.9], [-24, 0, 35, 120, 0.9], [100, 20, 46, 160, 0.9], [176, 0, 51, 180, 0.9]], { seed: 8, ribs: 6, cut: 0.3, wear: 0.1 }),
  (p) => p.u < 3 + wave(p.x, [[21, 2, 0], [8, 1, 2]]) ? "#9cbab0" : step(lamOf(p, B_SUN), ["#5a7e66", "#6a8e70"], [0.6]),
  { foot: 153, after: sugi({ l: "#8eae7c", m: "#66886a", d: "#4e7060", haze: "#9cbab0" }, { seed: 4 }) })
const NOON = [-0.35, -0.5, 0.85]
const HALL = make3d.haiden({ w: 3.6, d: 2.6 }), FOX_T = make3d.kitsune({ holds: "tama" }), FOX_K = make3d.kitsune({ holds: "key" })
side("_noon_hall", HALL, 36, { light: NOON, draw: japan.hand(HALL) })
turnaround("_noon_fox_tama", FOX_T, { view: V, ppm: 40, headings: ["e"], mats: MATS, light: NOON, surface: { rim: true }, draw: japan.carve(FOX_T) })
turnaround("_noon_fox_key", FOX_K, { view: V, ppm: 40, headings: ["w"], mats: MATS, light: NOON, surface: { rim: true }, draw: japan.carve(FOX_K) })
const cherry = (n, o) => side(n, make3d.sakura({ season: "spring", ...o }), 36, { light: NOON, surface: trees.look, pivot: "foot" })
const T_BSL = cherry("_noon_cherry_l", { height: 4.2, seed: 3 }), T_BSR = cherry("_noon_cherry_r", { height: 3.8, seed: 8 })
// The planters: a low wall of cut stone round a bed of earth and moss, `x` its middle, its foot on the gravel at `y`,
// `hw` half its width. Seen at pitch 10: its front face 9 rows, over it the bed 10 rows deep inside a coping 2 px wide on
// its four sides; stones 14-22 px long in one course; the copings' tops lit (F, the front edge S), the front face a step
// under them (s, its left end S), the joints and the foot O; the bed's moss lit on its tops, its earth between, the
// petals gathered in it, the trunk's shadow back and to the right a step down. The gravel 6 rows narrower than at
// first, and the courses the fighters stand on (from row 196) a step lighter, their slabs a key up their ramp: the
// floor lighter than what is behind them, with a margin (14.2).
const B_TOP = 150, B_PAVE = 176, B_HALL = 156, B_FOX = 164, B_PLANT = 172
const B_TREES = [[-16, 30, "_noon_cherry_l_p"], [338, 30, "_noon_cherry_r_p"]]
const bedPetals = japan.leaves(() => 0.5, () => ".+*", { seed: 12, cell: 3 })
const planter = (x, y, hw, seed) => (c) => {
  const F0 = y - 9, T0 = F0 - 10, L = x - hw, R = x + hw - 1
  for (let yy = T0; yy < y; yy++) for (let xx = L; xx <= R; xx++) {
    let k
    if (yy >= F0) {
      let a = L, j = 0, len
      while (true) { len = 14 + Math.floor(8 * hash(j, seed, 21)); if (a + len > xx) break; a += len; j++ }
      k = yy === y - 1 || (xx === a && xx > L) ? "O" : xx <= L + 1 ? "S" : "s"
    } else if (yy < T0 + 2 || yy >= F0 - 2 || xx < L + 2 || xx > R - 2) {
      k = yy === T0 || xx === L ? "F" : yy >= F0 - 2 ? (yy === F0 - 2 ? "F" : "S") : "S"
    } else {
      const s = fbm(xx / 5, yy / 2 + seed * 3, 2)
      k = bedPetals(xx, yy) ?? (s > 0.55 ? "N" : s > 0.42 ? "n" : s > 0.32 ? ">" : "<")
      if (((xx - x - 5) / 15) ** 2 + ((yy - F0 + 6) / 3) ** 2 <= 1) k = { N: "n", n: "M", ">": "<", "<": "<", "+": "+", "*": "+" }[k]
    }
    c.px(xx, yy, k)
  }
  tidy(c, L, T0, R, y - 1)
}
rooted("_noon_cherry_l_p", "_noon_cherry_l_s", T_BSL, { flare: 3, roots: [[-1, 8], [1, 7]] })
rooted("_noon_cherry_r_p", "_noon_cherry_r_s", T_BSR, { flare: 3, roots: [[-1, 7], [1, 8]] })
const UP1 = { O: "s", s: "S", S: "F" }
const bGravel = gravel(B_TOP), bPave0 = paving(B_PAVE, { seed: 6, mossy: 0.1 }), bPave = (x, y) => { const k = bPave0(x, y); return y >= 196 ? UP1[k] ?? k : k }
// the petals as they lay at first (drifts under the two cherries, x < 60 and x > 260), thinning out over 60 px past the still
const bPetals = japan.leaves((x, y) => 0.05 + (x < 60 || x > 260 ? 0.25 : 0) * (x < 0 ? Math.max(0, 1 + x / 60) : x > 320 ? Math.max(0, 1 - (x - 320) / 60) : 1), () => ".+*", { seed: 8, cell: 4 })
const B_SHADOWS = [...B_TREES.map(([x, hw]) => [x + 5, B_PLANT, hw + 2, 2]), [34 + 3, B_FOX, 17, 2], [286 + 3, B_FOX, 17, 2], [165, B_HALL, 84, 2]]
const B_ROWS = FLOOR_ROWS(B_TOP), bK = (y) => kAt(B_ROWS, y)
floor("shrine_noon_floor", B_TOP, B_ROWS, (x, y) => bPetals(x, y) ?? (y < B_PAVE ? bGravel(x, y) : bPave(x, y)), B_SHADOWS)
plane("shrine_noon_hall", bK(B_HALL), [stamp("_noon_hall_s", 160, B_HALL)])
plane("shrine_noon_foxes", bK(B_FOX), [stamp("_noon_fox_tama_e", 34, B_FOX), stamp("_noon_fox_key_w", 286, B_FOX)])
plane("shrine_noon_cherries", bK(B_PLANT), [...B_TREES.map(([x, hw], i) => planter(x, B_PLANT, hw, i + 1)), ...B_TREES.map(([x, , n]) => stamp(n, x, B_PLANT - 13))])

// ================================================================ C. shrine_night: the mountain shrine in snow, at night
// A small shrine high on a mountain: a torii with snow on its top beams, a black pine each side in a tree well (under a
// crown the snow lies shallow: a hollow of earth and needles, the snow heaped in front over the trunk's foot), two stone
// lanterns lit, the torii's posts and the lanterns sunk into the snow, heaped at their feet; across the valley a massif
// under the moon (up to the right), rock ribs and snowfields lit from the right, the gullies in shade, a mist lying at
// its foot, darker ranges showing over its shoulders, a low snowy ridge in front; the sky dark blue.
const C_SUN = unit([0.6, -0.45, 0.66])
sprite("shrine_night_sky", { w: wOf(0.1), h: H }, grad(0, 0, wOf(0.1), 150, "6789", "v", 0.5, "lines"), rect(0, 150, wOf(0.1), H - 150, "9"),
  circ(218, 32, 9, "5"), circ(215, 30, 3, "4"),
  (c) => { for (let i = 0; i < 30; i++) c.px(Math.floor(hash(i, 3, 5) * wOf(0.1)), Math.floor(hash(i, 4, 5) * 90) + 34, i % 4 ? "9" : "4") })
farPlane("shrine_night_r1", 0.2, massif(mounts([-172, 54, 100, { lean: -1 }], [-74, 62, 110], [26, 46, 80, { lean: -1 }], [118, 60, 110], [204, 50, 80, { lean: -1 }]), { seed: 11 }),
  (p) => step(lamOf(p, C_SUN), ["#26304e", "#303c62", "#43527c"], [0.45, 0.68]), { foot: 124, bottom: 150 })
const cMountain = (p) => {
  if (p.u < 9 + wave(p.x, [[31, 3, 0], [13, 2, 1]])) return "#8494b8"
  const lam = lamOf(p, C_SUN), up = p.n[2], ledge = (((p.u + 7 * fbm(p.x / 10, p.u / 8, 2)) / 11) % 1) < 0.26
  const snow = up > 0.74 || (up > 0.58 && ledge) || p.cv > 1.4, gully = p.cv < -1.1
  if (snow && !gully) return step(lam, ["#7586ae", "#a9b8d6", "#e2eaf6"], [0.3, 0.58])
  return step(lam, ["#323e64", "#4c5c86"], [0.5])
}
farPlane("shrine_night_r2", 0.3, massif([[60, 0, 112, 150, 1.3], [-20, 30, 70, 110], [-100, 20, 62, 110], [-180, 40, 58, 100], [140, 20, 70, 100], [214, 40, 56, 80],
  [20, -40, 40, 60], [110, -30, 36, 60], [-140, -30, 30, 60]], { seed: 13, ribs: 11, cut: 0.55 }), cMountain, { foot: 152, top: 200 })
farPlane("shrine_night_r3", 0.4, massif([[-230, 0, 22, 60], [-170, 10, 16, 50], [-100, 0, 12, 50], [-30, 10, 8, 40], [40, 0, 10, 40], [110, 10, 14, 50],
  [180, 0, 18, 60], [230, 10, 22, 60]], { seed: 17, cut: 0.3 }),
  (p) => p.u < 4 + wave(p.x, [[25, 2, 0], [9, 1, 1]]) ? "#a2b2d2" : step(lamOf(p, C_SUN), ["#8090b6", "#b0bedb", "#d6e0f0"], [0.4, 0.62]), { foot: 164 })
const MOON = [0.55, -0.45, 0.7], NIGHT_MATS = tint(MATS, "#1a2342", 0.38)
side("_night_torii", snowy(make3d.torii({ span: 1.8, height: 2.8 })), 40, { light: MOON, mats: NIGHT_MATS })
side("_night_toro", snowy(make3d.toro({ moss: 0 }), 0.5), 44, { light: MOON, mats: NIGHT_MATS })
const pine = (n, o) => side(n, snowy(make3d.kuromatsu(o), 0.45), 36, { light: MOON, mats: NIGHT_MATS, surface: trees.look, pivot: "foot" })
const T_CPL = pine("_night_pine_l", { height: 4.6, seed: 4 }), T_CPR = pine("_night_pine_r", { height: 4, seed: 9 })
// a tree well: round the trunk a hollow of earth and needles in the moon's shade (rows y-4..y-1, `hw` half wide at its
// bottom), its back rim a row of snow lit on the right (its needles picked at x + 160, where the approved drawing has
// them); drawn before the tree, the snow heaped in front of it after
const hollow = (x, y, hw) => (c) => {
  for (let yy = y - 4; yy < y; yy++) {
    const half = Math.round(hw * Math.sqrt(Math.max(0, 1 - ((yy - y + 1.5) / 2.6) ** 2)))
    for (let xx = x - half; xx <= x + half; xx++) c.px(xx, yy, yy === y - 4 ? (xx >= x ? "5" : "4") : hash(xx + 160, yy, 7) < 0.35 ? ";" : ":")
  }
  tidy(c, x - hw, y - 4, x + hw, y - 1)
}
const C_TOP = 158, C_PINE = 165, C_TORII = 163, C_TORO = 164
const C_TREES = [[10, 17, "_night_pine_l_p"], [312, 16, "_night_pine_r_p"]], C_TORO_AT = [48, 272], C_POSTS = [160 - 37, 160 + 35]
rooted("_night_pine_l_p", "_night_pine_l_s", T_CPL, { flare: 3, roots: [] })
rooted("_night_pine_r_p", "_night_pine_r_s", T_CPR, { flare: 3, roots: [] })
const C_SHADOWS = [...C_TREES.map(([x, hw]) => [x - 9, C_PINE - 1, hw + 2, 3]), ...C_POSTS.map((x) => [x - 6, C_TORII - 1, 9, 2]), ...C_TORO_AT.map((x) => [x - 6, C_TORO - 1, 12, 2])]
const C_ROWS = FLOOR_ROWS(C_TOP), cK = (y) => kAt(C_ROWS, y)
floor("shrine_night_floor", C_TOP, C_ROWS, snowfield(), C_SHADOWS)
plane("shrine_night_pines", cK(C_PINE), [...C_TREES.map(([x, hw]) => hollow(x, C_PINE, hw)), ...C_TREES.map(([x, , n]) => stamp(n, x, C_PINE)), ...C_TREES.map(([x, hw]) => mound(x, C_PINE, hw - 6, 2))])
plane("shrine_night_torii", cK(C_TORII), [stamp("_night_torii_s", 160, C_TORII), ...C_POSTS.map((x) => mound(x, C_TORII, 10, 3))])
plane("shrine_night_lanterns", cK(C_TORO), [...C_TORO_AT.map((x) => stamp("_night_toro_s", x, C_TORO)), ...C_TORO_AT.map((x) => mound(x, C_TORO, 13, 2))],
  { after: [glow("iI", { r: 8, strength: 0.5, bands: 2 })] })

// ================================================================ what moves (14.1, 14.5): small, few, slow
// In ticks of 60 a second, each stage one loop, each part's dividing it; the anims at 15 frames a second (4 ticks a
// drawing), what goes by on its own a tile at a speed in px a tick (an engine's velocity).
const TICK = 1000 / 60, FPS = 15
// the lanterns' flames, flickering in place in their 6 x 6 windows (the plane's glow is round the window as lit)
flameAnim("shrine_dusk_flame", 6, 6, 3)
flameAnim("shrine_night_flame", 6, 6, 5)
// a thing falling (a leaf, a petal), as an engine's action: clear for `wait` ticks, then n drawings of `per` ticks along
// its way (at(i): where it is at drawing i, shape(i) its pixels), lying where it landed (at(n)) for `lie`, clear to the
// end of the loop; w x h, its pivot where it lies
const faller = (name, { w, h, loop, wait, n, lie, per = 4, at, shape }) => anim(name, { w, h, frames: n + 3, ms: [wait, ...Array(n).fill(per), lie, loop - wait - n * per - lie].map((t) => t * TICK), pivot: at(n) }, (c) => {
  const i = c.frame - 1
  if (i < 0 || i > n) return
  const [x, y] = at(i)
  shape(i).forEach((row, j) => [...row].forEach((k, m) => k !== "." && c.px(x + m, y + j, k)))
})
// a leaf falling from a crown to the bed (scenes §5: 2-3 px redrawn through three turns, ~5 px down a 120 ms drawing,
// swaying 3 px each way): 3 px down a drawing (0.75 px a tick), 63 px in 21 drawings, swaying as it goes and drifting
// 4 px with the breeze, then lying where it landed 48 ticks and gone; from tick 32 of a 480-tick loop. Red, orange and
// gold, a maple's each
const LEAF = [["Rr"], ["R", "e"], [".r", "Re"]]
faller("shrine_dusk_leaf_r", { w: 16, h: 72, loop: 480, wait: 32, n: 21, lie: 48, at: (i) => [5 + Math.round(3 * Math.sin(i / 2.2) + (4 * i) / 21), 6 + 3 * i], shape: (i) => (i === 21 ? LEAF[0] : LEAF[i % 3]) })
anim("shrine_dusk_leaf_o", { base: "shrine_dusk_leaf_r", swap: { e: "o", R: "u", r: "U" } })
anim("shrine_dusk_leaf_g", { base: "shrine_dusk_leaf_r", swap: { e: "g", R: "G", r: "Y" } })
// the clouds going by over the noon sky (scenes §8, clouds()): each a slot along in the loop, 110 px in 440 ticks, a px
// every 4; 360 x 66, the sky's strip's width and its top
anim("shrine_noon_clouds", { w: wOf(0.1), h: 66, frames: 110, fps: FPS }, clouds({ y: 64, gap: 110, w: 70, h: 22, seed: 4, keys: "0tp" }))
// a petal drifting down from a cherry to its planter: 1-2 px, turning (a dot, a pair), 2 px down a drawing (0.5 a tick)
// and drifting 16 px with the breeze, swaying 2 px, 92 px in 46 drawings, then lying 40 ticks; from tick 16 of a
// 440-tick loop
const PETAL = [["*+"], ["*"], ["+*"], ["+"]]
faller("shrine_noon_petal", { w: 28, h: 100, loop: 440, wait: 16, n: 46, lie: 40, at: (i) => [4 + Math.round(2 * Math.sin(i / 3) + (16 * i) / 46), 4 + 2 * i], shape: (i) => (i === 46 ? PETAL[3] : PETAL[i % 4]) })
// the snow (6g1's measure): near flakes 2 px falling 1 px a tick, far ones 1 px falling 1 px every 2 ticks; tiles 160 x
// 120 that wrap, an engine's velocity [0, 1] and [0, 0.5] (480 ticks: 4 and 2 heights); 7 near and 14 far a tile, as
// the 6g1 still's 70 over the screen
// (four of them on the tile's edges, so wherever it is tiled over the screen something of it shows)
const flakes = (n, seed, big) => (c) => {
  for (let i = 0; i < n; i++) {
    const x = [, , 0, 160 - (big ? 2 : 1)][i] ?? Math.floor(hash(i, 1, seed) * 158), y = [0, 119][i] ?? Math.floor(hash(i, 2, seed) * 120)
    c.px(x, y, "5"); if (big) c.px(x + 1, y, "4")
  }
}
sprite("shrine_night_snow_near", { w: 160, h: 120, wrap: true }, flakes(7, 21, true))
sprite("shrine_night_snow_far", { w: 160, h: 120, wrap: true }, flakes(14, 22, false))
// a mist drifting along the massif's foot, over its haze: long flat wisps 2-3 rows thick in the haze's light tones, a
// tile 120 x 12 that wraps across, going by at 0.5 px a tick (480 ticks: 2 widths)
sprite("shrine_night_mist", { w: 120, h: 12, wrap: "x" }, (c) => {
  for (const [x0, y0, len, th] of [[4, 5, 34, 2], [30, 8, 46, 3], [70, 3, 28, 2], [92, 7, 40, 2]])
    for (let i = 0; i < len; i++) { const u = i / (len - 1), t = Math.round(th * Math.sin(Math.PI * u)); for (let j = 0; j < t; j++) c.px(x0 + i, y0 + j, j ? "#a2b2d2" : "#b6c4de") }
})

// ================================================================ the layout: how an engine reads a stage
// As MUGEN's stage .def says it, in the stage's own px: the stage `world` [w, h] (720 x 224), the `camera`'s left edge
// from x[0] to x[1] in it (boundleft/boundright: the middle is 200), the round starting at `start`; the `floor`, the
// fighters' line (zoffset); the `players` where they start, p1 facing e, p2 w. `layers` far to near, as drawn: each a
// `sprite` with its top-left `at` [x, y] in its plane when the camera is at 0, moving by `delta` (0 still, 1 with the
// world): on the screen at camera x it is at x - round(camera x * delta); the floor's `delta` by row (MUGEN's xscale):
// { top, bottom, rows: [y0, y1] }, top at row y0 and above, bottom at y1 and below, each row moved by its own; an `anim`
// at each of its points `at` (a list), its own frames' times, `delay` ms into its loop; a `tile` ("x", "xy") going by at
// `velocity` [x, y] px a tick, wrapped over the screen; `front`: drawn over the fighters. The spectator stands on the
// floor at `at`, going by at its row's `delta`, facing `facing`, in the palette slot `slot` (mikoSpectator.SLOTS), its
// shadow an ellipse `shadow` [rx, ry] a px down and right of its feet. The fighters' `shadow` (MUGEN's [Shadow]): the
// floor under each `steps` darker along its ramps (an engine without them: the floor darkened toward `color` by
// `intensity`, what a pixel stepped so loses of its light, the median under them), a flat ellipse `rx` px either side
// of the feet (the profile's scale: a character's base, a heavy's), `yscale` its height against theirs. `loop`: the
// stage's loop in ticks.
const LAYOUT = {}
const far = (n) => [["sky", 0.1], ["r1", 0.2], ["r2", 0.3], ["r3", 0.4]].map(([k, d]) => ({ name: k, sprite: `${n}_${k}`, at: [0, 0], delta: d }))
const anims = (name, anim, d, pts, delays) => ({ name, anim, at: pts.map(([x, y]) => [x + at0(d), y]), delta: d, ...(delays ? { delay: delays.map((t) => Math.round(t * TICK)) } : {}) })
const base = (rows, spectator, shadow, layers, loop) => ({
  screen: [W, H], world: [wOf(1), H], camera: { x: [0, SCROLL], start: SCROLL / 2, jump: { follow: 0.2, up: 16 } }, floor: FLOOR,
  players: { p1: [P1 + SCROLL / 2, FLOOR], p2: [P2 + SCROLL / 2, FLOOR] }, layers,
  spectator: { at: [spectator[0] + Math.round(200 * kAt(rows, spectator[1])), spectator[1]], delta: kAt(rows, spectator[1]), on: rows, facing: "w", slot: spectator[2], shadow: [10, 2] },
  shadow: { steps: 2, ...shadow, rx: { character: 30, heavy: 40 }, yscale: 0.03 }, loop })
// the flames' points: each lantern's window, its flame's foot (the firebox's floor) over the lantern's foot
const FLAME = [0, -44]
LAYOUT.shrine_dusk = base(A_ROWS, [300, 174, "dusk"], { color: "#433e4b", intensity: 0.8 }, [...far("shrine_dusk"),
  { name: "torii", sprite: "shrine_dusk_torii", at: [0, 0], delta: 0.55 }, { name: "floor", sprite: "shrine_dusk_floor", at: [0, A_FLOOR], delta: A_ROWS },
  { name: "stair", sprite: "shrine_dusk_stair", at: [0, 136], delta: A_STAIR }, { name: "mid", sprite: "shrine_dusk_mid", at: [0, 0], delta: A_MID },
  anims("flames", "shrine_dusk_flame", A_MID, A_TORO_AT.map((x) => [x + FLAME[0], A_TORO_Y + FLAME[1]])),
  // (the red and the gold land in the bed, the orange on the paving in the drift at the stair's foot: each at its row's)
  ...[["r", 10, 157, 0], ["o", 126, 165, 340], ["g", 318, 157, 200]].map(([k, x, y, d]) => anims(`leaf_${k}`, `shrine_dusk_leaf_${k}`, kAt(A_ROWS, y), [[x, y]], [d]))], 480)
LAYOUT.shrine_noon = base(B_ROWS, [300, 178, ""], { color: "#6a6470", intensity: 0.65 }, [far("shrine_noon")[0],
  anims("clouds", "shrine_noon_clouds", 0.1, [[-at0(0.1), 0]]), ...far("shrine_noon").slice(1), { name: "floor", sprite: "shrine_noon_floor", at: [0, B_TOP], delta: B_ROWS },
  { name: "hall", sprite: "shrine_noon_hall", at: [0, 0], delta: bK(B_HALL) }, { name: "foxes", sprite: "shrine_noon_foxes", at: [0, 0], delta: bK(B_FOX) },
  { name: "cherries", sprite: "shrine_noon_cherries", at: [0, 0], delta: bK(B_PLANT) },
  anims("petals", "shrine_noon_petal", bK(B_PLANT), [[-10, 158], [4, 159], [330, 158], [352, 159]], [0, 260, 330, 400])], 440)
LAYOUT.shrine_night = base(C_ROWS, [298, 168, "night"], { color: "#46557e", intensity: 0.58 }, [...far("shrine_night").slice(0, 3),
  { name: "mist", sprite: "shrine_night_mist", tile: "x", velocity: [0.5, 0], at: [0, 141], delta: 0.3 }, far("shrine_night")[3],
  { name: "snow_far", sprite: "shrine_night_snow_far", tile: "xy", velocity: [0, 0.5], at: [0, 0], delta: 0.5 }, { name: "floor", sprite: "shrine_night_floor", at: [0, C_TOP], delta: C_ROWS },
  { name: "pines", sprite: "shrine_night_pines", at: [0, 0], delta: cK(C_PINE) }, { name: "torii", sprite: "shrine_night_torii", at: [0, 0], delta: cK(C_TORII) },
  { name: "lanterns", sprite: "shrine_night_lanterns", at: [0, 0], delta: cK(C_TORO) }, anims("flames", "shrine_night_flame", cK(C_TORO), C_TORO_AT.map((x) => [x + FLAME[0], C_TORO + FLAME[1]])),
  { name: "snow_near", sprite: "shrine_night_snow_near", tile: "xy", velocity: [0, 1], at: [0, 0], delta: 1, front: true }], 480)

// ---------------------------------------------------------------- the stage in a scene, as an engine draws it
// stage.camera(name, x): a scene's camera on the stage's world, its left edge at x(frame) (0 to 400), whole px
// stage.layers(name, { ticks, clock, spectator, shadows, fighters }): its layers far to near as layer()s with their
// parallax; `ticks` the scene's loop (its own frames: what moves goes by in those ticks; none, it stands still at tick 0);
// `clock` (c) => ms, the anims' time at a picture instead, for a scene whose clock isn't its frames' (a round's intro
// before its tick 0; the tiles still go by over the scene's frames);
// `spectator` { name, swap } stamped where the layout says (the miko's watch, her slot's swap) with its shadow (`name`
// a function (c) => [name, ms]: the anim she plays now and how far in, a crowd changing anim over time);
// `shadows` [x, y, rx, ry] on the screen laid on the floor (the fighters'; a function (c) => that list: fighters who
// move); `fighters` layers drawn over the spectator, under what is in front
stage.camera = (name, x) => ({ world: LAYOUT[name].world, follow: (f) => [x(f) + W / 2, FLOOR], window: [0, 0], ahead: 0, ease: 1, speed: 1000 })
stage.layers = (name, { ticks, clock, spectator, shadows = [], fighters = [] } = {}) => {
  const L = LAYOUT[name], S = L.spectator, out = []
  const per = (v) => Math.round(v * (ticks ?? 0))
  const tile = (l) => (c) => {
    const n = OWN[l.sprite], w = c.size(n).w
    if (l.tile === "x") return c.scroll(n, l.at[1], -per(l.velocity[0]))
    for (let x = Math.floor(c.view[0] / w) * w; x < c.view[0] + c.view[2]; x += w) c.scroll(n, x, per(l.velocity[1]), { axis: "y" })
  }
  // (the anims at the scene's tick, their delay in, stamped at that time: their frames' times don't set the scene's
  // clock, which is its own; a still's at tick 0)
  const tOf = (c, d = 0) => (clock ? clock(c) : ticks ? (c.frame * ticks * TICK) / c.frames : 0) + d
  // (as an engine, only what shows: a leaf in the air off the screen isn't stamped)
  const shows = (c, im, x, y) => { const b = im.bounds(), [px, py] = im.pivot ?? [0, 0], [vx, vy, vw, vh] = c.view, X = x - px + (b?.x ?? 0), Y = y - py + (b?.y ?? 0); return b && X < vx + vw && X + b.w > vx && Y < vy + vh && Y + b.h > vy }
  const anim1 = (c, n, x, y, t) => { if (shows(c, c.asset(n, { t }), x, y)) c.stamp(n, x, y, { t }) }
  const drawn = (l) => layer(l.name, { parallax: l.delta }, ...(l.anim ? [(c) => l.at.forEach(([x, y], i) => anim1(c, OWN[l.anim], x, y, tOf(c, l.delay?.[i])))] : l.tile ? [tile(l)] : [stamp(OWN[l.sprite], ...l.at)]))
  for (const l of L.layers.filter((q) => !q.front)) {
    out.push(drawn(l))
    if (l.name !== "floor") continue
    if (typeof shadows === "function") out.push(layer("shadows", { shade: L.shadow.steps, parallax: 0 }, (c) => shadows(c).forEach(([x, y, rx, ry]) => c.ellipse(x, y, rx, ry, "K"))))
    else if (shadows.length) out.push(layer("shadows", { shade: L.shadow.steps, parallax: 0 }, ...shadows.map(([x, y, rx, ry]) => ellipse(x, y, rx, ry, "K"))))
    if (spectator) out.push(layer("spectator_shadow", { shade: L.shadow.steps, parallax: S.on }, stamp(OWN._spectator_shadow, ...S.at)))
  }
  if (spectator) out.push(layer("spectator", { parallax: S.on }, (c) => { const [n, t] = typeof spectator.name === "function" ? spectator.name(c) : [spectator.name, tOf(c)]
    c.stamp(n, ...S.at, { flip: "x", t, ...(spectator.swap?.[S.slot] ? { swap: spectator.swap[S.slot] } : {}) }) }))
  return [...out, ...fighters, ...L.layers.filter((q) => q.front).map(drawn)]
}
// the spectator's shadow: a flat ellipse 10 x 2 a px down and right of its feet (its pivot)
sprite("_spectator_shadow", { w: 21, h: 5, pivot: [9, 1] }, ellipse(10, 2, 10, 2, "K"))
// (the names as a scene that includes this file asks for them: under its as)
const OWN = Object.fromEntries(["_spectator_shadow", ...Object.values(LAYOUT).flatMap((L) => L.layers.map((l) => l.sprite ?? l.anim))].map((n) => [n, own(n)]))

// ---------------------------------------------------------------- the stills, the sheets, the cards
// Each stage at the camera's middle where a round starts, its loops at tick 0 (no leaf or petal in the air yet), the
// layout on its data; and its sheet: the still, each layer's sprite, the anims (stage_<name>, a row an anim).
const IS = {
  shrine_dusk: "the approach under a torii at dusk in autumn: the sun low between its posts lighting all from behind, maples and lanterns in a moss bed behind a cut-stone curb, a stair up to the torii, the leaves in drifts; three violet ranges",
  shrine_noon: "the hall's courtyard at noon in spring: the hall square behind the fighters, two foxes on their pedestals, a cherry in a stone planter at each end, white gravel and paving; cedar hills, a blue range in the haze",
  shrine_night: "a mountain shrine in snow at night: a torii and two lanterns sunk in the snow, black pines in tree wells, a massif lit by the moon across the valley, a mist at its foot",
}
for (const name of Object.keys(LAYOUT)) {
  const L = LAYOUT[name], anims0 = L.layers.filter((l) => l.anim).map((l) => l.anim), tiles = L.layers.filter((l) => l.tile).map((l) => l.sprite)
  scene(name, { w: W, h: H, camera: stage.camera(name, () => L.camera.start) }, ...stage.layers(name), (c) => c.setData({ layout: L }))
  sheet(`stage_${name}`, [name, ...L.layers.filter((l) => l.sprite && !l.tile).map((l) => l.sprite), ...tiles, ...new Set(anims0)], { pad: 1, rows: "tag" })
  card(name, { is: `a fighting game's stage for the 320 x 224 screen, 720 px wide: ${IS[name]}; drawn from the library's Japanese kit and trees in 3D through the fighting camera, the far ranges by terrain(); its layers as sprites at their parallax widths, the floor by row, its loops, and its layout as data`,
    cells: { "side/?": "✓" }, vary: { part: `its layers and anims on the sheet stage_${name}; stage.LAYOUT.${name}, on the frame ${name}'s data; stage.layers() draws it in a scene with stage.camera()` } })
}
Object.assign(stage, { LAYOUT })
}
