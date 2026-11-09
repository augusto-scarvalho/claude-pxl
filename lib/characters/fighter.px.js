// What the fighting package's fighters share (reva_fighter.px.js, haldor_fighter.px.js): each is made the same way, a
// figure on rig3d() at one heading painted as Guilty Gear Xrd paints a model for its one camera, its head drawn by hand,
// so the machinery that is the same for both lives here and what is a fighter's own (the stance, the tones, the parts,
// the poses, the heads) stays in the fighter's file. It makes no assets: its names are under `fighter.`, declared again
// harmlessly when a scene includes two fighters (each includes this file). Taken with
// include("<path>/lib/characters/fighter.px.js"):
// - vectors: add, sub, mul, dot, len, unit, cross, clamp, smooth; RAD;
// - hipsFloor([across, away], turn): a foot between the hips' frame at `turn` and the floor, the one map both ways;
//   lie({ hips, turn, lift, out, back, fall, point }): the legs of a figure lying on its back (rig3d's roll), from its hips;
// - toonOf(TONE, crease): a fighter's toon(m, bias, deep) over its materials (TONE[m]: [line, keys, cuts]), each a ramp of
//   24 steps cut where its terminator falls (Xrd's threshold); `crease` the key of a darkest fill only a crease reaches;
// - LIGHT (rig3d's), capD, shadowed, nearOf: the shadows parts cast on each other and the creases, drawn by design;
//   band(v, period, at, w): a step in a periodic pattern;
// - bone(a, b, r0, r1, front, side, paint): a capsule painted along and round it; aimed(field, d, p);
// - nearArm(j): the arm nearer us ("arm0" or "arm1"); smear(j, J1, limb, r): a striking limb's smear along its arc;
// - SURFACE: rig3d's surface options for a line by material;
// - clean(c, lines): the cleanup by rules over a rendered frame (an L-corner of a line's dark, a lone speckle);
//   pinholes(c): a hole of 6 px or less filled from its neighbours;
// - boxOf(points, margin, w, h): a box round screen points, in a w x h frame;
// - fxOf(fx, j, S, pivot): a pose's `fx` { name, at } as its frame's data says it, `at: "middle"` the body's middle on the floor.
var fighter = {}
{
const RAD = Math.PI / 180
// ---------------------------------------------------------------- vectors
const add = (a, b) => a.map((v, e) => v + b[e]), sub = (a, b) => a.map((v, e) => v - b[e]), mul = (a, s) => a.map((v) => v * s)
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], len = (a) => Math.hypot(...a), unit = (a) => mul(a, 1 / (len(a) || 1))
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t) }
// a foot between the hips' frame at `turn` ([forward, right]) and the floor ([across, away]), the one map both ways
const hipsFloor = ([a, b], turn) => { const t = (180 + turn) * RAD; return [a * Math.sin(t) + b * Math.cos(t), a * Math.cos(t) - b * Math.sin(t)] }
// lying (posed upright, then turned flat by rig3d's roll), the legs as they rest, from the hips (each hip joint `hips` px
// from the pelvis, as the rig puts it): each ankle `out` px past its hip and `back` px behind the hips' plane (the heels
// on the floor, under the hip joints), the knees a little bent (`lift` short of the leg's length), the feet slack and
// fallen out `fall` degrees each side of the hips' heading (the pose's `turn`), pointed `point`
const lie = ({ hips, turn, lift, out = 2, back = 3, fall = 20, point = 15 }) => ({ lift: [lift, lift], point: [point, point],
  feet: [-1, 1].map((s) => hipsFloor([-back, s * (hips + out)], turn)), way: [180 + turn - fall, 180 + turn + fall] })

// ---------------------------------------------------------------- the tones: where each falls, by design (Xrd's threshold)
// surface() lights each pixel 0..1 from its normal and takes that share up its material's ramp. A material is a ramp of
// 24 steps over that light, each the tone whose cut it has reached, so its terminator falls where a cut says; a part,
// or a place on it, moves the cuts by a bias (above 0 more shadow), as Xrd moves a vertex's threshold. The ramp's first
// key is its line (surface's ink: true), its next its darkest (the inner line, the deepest crease). Where a material's
// darkest fill is its crease tone (`crease`, more fills than cuts), only a crease reaches it: the shadows and the
// terminator's bias move its first cut 0.1 at most, `deep` the rest
const toonOf = (TONE, creaseKey) => (m, bias = 0, deep = 0) => { const [line, keys, cuts] = TONE[m], q = (v) => Math.round(v * 20) / 20, crease = keys.length > cuts.length && keys[0] === creaseKey
  const at = cuts.map((c, k) => c + q(k === 0 && crease ? Math.min(bias, 0.1) + deep : bias + deep)); let s = line
  for (let i = 0; i < 24; i++) { let k = 0; while (k < at.length && i / 23 >= at[k]) k++; s += keys[k] } return s }
// The shadows parts cast on each other and the creases, drawn by design rather than by surface(): its own shadows,
// lit by a light from above toward us, throw a near arm's 8 px down the torso (a long dark smear in a guard), and its
// creases are sampled a fifth of a unit out, a meter's scale: nothing at a figure's px. So a part asks of the bones
// near it: does the way to the light cross one within a few px (a shadow close under it, as drawn), is it within a px
// or two of one (a crease); `light` another way to it (a figure turned by roll, built upright: the light in its frame)
const LIGHT = unit([0, -0.6, 0.75])   // rig3d's light, from above toward us
const capD = (p, [a, b, r0, r1]) => { const d = sub(b, a), t = clamp(dot(sub(p, a), d) / (dot(d, d) || 1)); return len(sub(p, add(a, mul(d, t)))) - (r0 + (r1 - r0) * t) }
const shadowed = (p, bones, reach = 6, light = LIGHT) => { for (let s = 1.2; s <= reach; s += 0.8) { const q = add(p, mul(light, s)); if (bones.some((B) => capD(q, B) < 0)) return 1 } return 0 }
const nearOf = (p, bones, d) => Math.max(0, ...bones.map((B) => 1 - clamp(capD(p, B) / d)))
// a step in a periodic pattern: |((v mod period) - at)| < w
const band = (v, period, at, w) => Math.abs((((v % period) + period) % period) - at) < w

// ---------------------------------------------------------------- parts, each painted in its own coordinates
// a capsule from a to b painted by (t along it 0..1, its angle round it from `front` toward `side`, the point, the
// normal, its length)
const bone = (a, b, r0, r1, front, side, paint) => { const d = sub(b, a), L = len(d) || 1, u = mul(d, 1 / L), f0 = unit(sub(front, mul(u, dot(front, u)))), s0 = unit(sub(side, add(mul(u, dot(side, u)), mul(f0, dot(side, f0)))))
  return sdf.capsule(a, b, r0, r1).paint((p, n) => { const q = sub(p, a), o = sub(q, mul(u, dot(q, u))); return paint(clamp(dot(q, u) / L), Math.atan2(dot(o, s0), dot(o, f0)), p, n, L) }) }
// a field built along +y (ahead) and z up, turned to point along d (no roll: its x stays level) and set at p
const aimed = (f, d, p) => f.rotate((Math.asin(clamp(d[2] / (len(d) || 1), -1, 1)) * 180) / Math.PI, "x").rotate((-Math.atan2(d[0], d[1]) * 180) / Math.PI, "z").at(...p)
const nearArm = (j) => (j.depth(j.arms[1].sh) > j.depth(j.arms[0].sh) ? "arm1" : "arm0")
// a smear (the games' smear frame: KOF 2002's Vanessa's cross, the arm a dark wedge past the fist; the fighting study's
// 10.2): the striking limb (`limb` arm0, arm1, leg0 or leg1) stretched along its arc round its root from its end in the
// joints j to where the joints J1 of the drawing after put it, a wedge tapering from `r` px (the end's own width) to a
// point; the fighter paints it (its limb's shadow tone)
const smear = (j, J1, limb, r) => { const leg = limb.startsWith("leg"), k = +limb.slice(3)
  const root = leg ? j.legs[k].hip : j.arms[k].sh, a = sub(leg ? j.legs[k].ankle : j.arms[k].hand, root), b = sub(leg ? J1.legs[k].ankle : J1.arms[k].hand, root)
  const la = len(a), lb = len(b), N = 8, at = (t) => add(root, mul(unit(add(mul(a, (1 - t) / la), mul(b, t / lb))), la + (lb - la) * t)), w = (t) => r * (1 - 0.85 * t)
  return sdf.union(...Array.from({ length: N }, (_, q) => sdf.capsule(at(q / N), at((q + 1) / N), w(q / N), w((q + 1) / N))), { smooth: 1 }) }
// a line by material: each part's line its ramp's first key, the line where a part lies in front of another the darkest
// of the one behind, the light wrapped a little round the form, no shadows or creases of surface()'s own (drawn by design)
const SURFACE = { ink: true, outline: false, inner: "dark", soft: 0.3, shadows: false, ao: 0 }

// ---------------------------------------------------------------- the cleanup, by rules, over each rendered frame
// - "corners": a pixel of a line's dark (the keys `lines`) where its line turns an L (one neighbour across, one up or
//   down, of its colour, a step or a doubled diagonal going on past them, nothing of it behind the corner): it takes what
//   is behind the corner (the clear, or the fill), the line left diagonal (pxl's lineFlaws' L-corner, every other one);
// - "lone": a pixel none of its eight neighbours its colour, three or four of its four one colour of its own ramp,
//   takes that colour (a speckle where a fold falls between two pixels)
const clean = (c, lines) => { const { w, h } = c.img, D = c.img.data, at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : D[y * w + x]), clear = (v) => (v & 255) < 128
  const dark = new Set([...lines].map((k) => c.color(k))), same = (x, y, v) => at(x, y) === v
  const thin = (x, y, v) => ![[-1, -1], [0, -1], [-1, 0], [0, 0]].some(([u, q]) => same(x + u, y + q, v) && same(x + u + 1, y + q, v) && same(x + u, y + q + 1, v) && same(x + u + 1, y + q + 1, v))
  const gone = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = at(x, y)
    if (clear(v) || !dark.has(v) || !thin(x, y, v)) continue
    const l = same(x - 1, y, v), r = same(x + 1, y, v), u = same(x, y - 1, v), d = same(x, y + 1, v)
    if (l === r || u === d) continue
    const sx = r ? 1 : -1, sy = d ? 1 : -1
    const step = (same(x - sx, y + sy, v) && !same(x, y + 2 * sy, v)) || (same(x + sx, y - sy, v) && !same(x + 2 * sx, y, v)), diag = same(x + 2 * sx, y - sy, v) && same(x - sx, y + 2 * sy, v)
    if (!(step || diag) || same(x - sx, y - sy, v) || same(x + sx, y + sy, v) || gone[y * w + x - 1] || (y > 0 && gone[(y - 1) * w + x])) continue
    gone[y * w + x] = 1; D[y * w + x] = at(x - sx, y - sy) }
  const rampOf = (col) => c.pal.ramps.findIndex((r) => [...r].some((k) => c.color(k) === col)), set = []
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = at(x, y); if (clear(v)) continue
    const nb = [at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)]
    if (nb.some(clear) || [at(x - 1, y - 1), at(x + 1, y - 1), at(x - 1, y + 1), at(x + 1, y + 1), ...nb].includes(v)) continue
    const best = nb.find((u) => nb.filter((q) => q === u).length >= 3)
    if (best !== undefined && rampOf(best) === rampOf(v)) set.push([x, y, best]) }
  for (const [x, y, v] of set) D[y * w + x] = v }
// pinholes: a hole in the drawn frame of 6 px or less (clear, out of reach of the frame's edge, 4-connected) takes, a
// pixel at a time, the colour most of its 4 neighbours have: where the cleanup's corners cut one inside a line, where a
// drawn head meets the body
const pinholes = (c) => { const { w, h } = c.img, D = c.img.data, clear = (i) => (D[i] & 255) < 128, seen = new Uint8Array(w * h), st = []
  for (let x = 0; x < w; x++) st.push(x, (h - 1) * w + x)
  for (let y = 0; y < h; y++) st.push(y * w, y * w + w - 1)
  while (st.length) { const i = st.pop(), x = i % w; if (seen[i] || !clear(i)) continue
    seen[i] = 1; if (x > 0) st.push(i - 1); if (x < w - 1) st.push(i + 1); if (i >= w) st.push(i - w); if (i < w * (h - 1)) st.push(i + w) }
  for (let i = 0; i < w * h; i++) { if (seen[i] || !clear(i)) continue
    const hole = [], q = [i]; seen[i] = 1
    while (q.length) { const j = q.pop(); hole.push(j); for (const k of [j - 1, j + 1, j - w, j + w]) if (!seen[k] && clear(k)) { seen[k] = 1; q.push(k) } }
    if (hole.length > 6) continue
    while (hole.some(clear)) for (const j of hole) { const nb = [j - w, j - 1, j + 1, j + w].filter((k) => !clear(k)).map((k) => D[k]), n = (v) => nb.filter((u) => u === v).length
      if (nb.length) D[j] = nb.reduce((a, b) => (n(b) > n(a) ? b : a)) } } }

// ---------------------------------------------------------------- what each frame says to an engine
// a box round points on the screen, `m` px out, kept in the w x h frame
const boxOf = (pts, m, W, H) => { const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]), x0 = Math.max(0, Math.min(...xs) - m), y0 = Math.max(0, Math.min(...ys) - m)
  return [x0, y0, Math.min(W, Math.max(...xs) + m) - x0, Math.min(H, Math.max(...ys) + m) - y0] }

// the effect a frame raises from the floor (the profile's `fx`): its anim and where its pivot goes, px from the
// fighter's pivot; "middle" the body's middle along the floor (lying, halfway from its head to its farthest foot: where
// a knockdown's dust rises), from the joints S puts on the frame
const fxOf = ({ name, at = [0, 0] }, j, S, pivot) => { if (at !== "middle") return { name, at }
  const xs = [j.head, j.chest, j.pelvis, ...j.legs.flatMap((L) => [L.knee, L.ankle, L.toe, L.heel])].map((q) => S(q)[0])
  return { name, at: [Math.round((Math.min(...xs) + Math.max(...xs)) / 2 - pivot[0]), 0] } }

Object.assign(fighter, { RAD, add, sub, mul, dot, len, unit, cross, clamp, smooth, hipsFloor, lie, toonOf, LIGHT, capD, shadowed, nearOf, band, bone, aimed, nearArm, smear, SURFACE, clean, pinholes, boxOf, fxOf })
}
