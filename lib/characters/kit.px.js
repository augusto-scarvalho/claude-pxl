// A character kit for the HD-2D figures (the traveler's family: lib/characters/traveler.px.js, dress.px.js, crew.px.js):
// people made on the fly from parts on mannequins. A character is a short spec that picks a part for each slot; the
// body is numbers (the traveler's own, a dwarf, a tall one, a beast-headed one with a tail); what it wears is worn: a
// bare mannequin (the body in plain underclothes) and over it each garment a layer of its own, a little thicker than
// what it lies on, its edges showing (a collar, a cuff, a hem, a waistband); the pieces mix by rule (each its slot, its
// layer, what it needs and what it excludes, its own colors). Its head modeled (a skull, the hair, a beard) and baked
// once per view, the approved hand face painted over it with what each part paints there. New art is a draft (✎).
// Taken with include("<path>/lib/characters/kit.px.js", { as: "kit", palette: true });
// examples/hd2d/character_kit.px.js shows people made from specs alone.
//   kit.character("sai", { hair: "bandana", torso: "stripes", legs: "rolled", feet: "bare", colors: { hair: "dark" } })
//   kit.character("bruni", { body: "short", hair: "ring", beard: "full", torso: "shirt", over: "vest", legs: "canvas",
//     feet: "boots", belt: "belt", colors: { over: "rust", legs: "slate", skin: "tan", hair: "ginger" } })
//   kit.random("someone", 7)
// Each makes <name>_stand_<dir> in the profile's 8 directions (the idle's first frame; `moves: ["idle", "walk"]` the
// traveler's moves instead, fitted to the body) and a group <name>, and gives back its spec with the figure's cell
// ({ w, h, pivot }). kit.parts is the catalog, kit.check(spec) the reason a spec doesn't fit (or nothing), kit.body(preset |
// numbers) a mannequin, kit.blocks(name, body) its flat blocks (bk_<name>_<move>_<dir>).
include("crew.px.js", { as: "crew", palette: true })   // the crew's parts, and through it the traveler's and dress()
const kit = {}
// in a block: its names stay its own when a scene includes the file
{
const T = traveler, C = crew, TB = T.FIG.body

// ---------------------------------------------------------------- the bodies (mannequins)
// The body as rig3d()'s numbers (px over the sole, `PXL help rig3d`): hip, torso, neck (to the head's middle), thigh,
// shin, upper, fore, ankle (hip is thigh + shin + ankle), hips (half the hip joints' width), shoulders [forward, half
// their width, down], r its thickness (legs and arms [root, joint, end], the body [hips, chest], a hand, a foot [across,
// half its length, up]); `deep` how deep the chest is ahead for its width (his 0.84: flatter ahead than at the sides),
// `ease` the arms' reach as a share of their length (under 1: the elbows soft). The head is the same on every human
// body (the traveler's skull, 11 rows), so a hair or a beard fits them all; a body's height is said in his heads.
const R0 = { ...dress.r, head: figure(34, 3).head / 2 }
const BODIES = {
  medium: { is: "the traveler's body, number for number: 34 px, 3 heads, a little barrel", body: TB },
  // 27.5 px under a head as big as his (2.4 heads): the shoulders out past the head (14 px with the arms to its 11), the
  // chest a barrel as deep as it is wide, short thick limbs (the legs 0.63 his, as thick 1.4), big hands and feet
  short: { is: "a dwarf: 27.5 px under a head as big as his, shoulders wider than the head, a deep barrel of a chest, short thick limbs, big hands and feet",
    body: { h: 27.5, heads: 2.4, hip: 7.5, torso: 8.2, neck: 6.1, thigh: 3.6, shin: 2.9, upper: 3.1, fore: 2.7, ankle: 1, hips: 2.5, shoulders: [0.4, 5.5, -1.3],
      r: { leg: [2.25, 2.05, 1.9], arm: [1.65, 1.5, 1.4], body: [5, 5.8], hand: 1.45, foot: [1.95, 2.8, 1.3] } }, deep: 0.98 },
  // 45 px, 4 heads: the legs 1.7 his, the arms 1.6, the torso 1.3, as thick as his or a little more; the elbows soft
  tall: { is: "tall: 45 px, 4 heads, long limbs, at ease",
    body: { h: 45, heads: 4, hip: 19, torso: 13, neck: 7.4, thigh: 9, shin: 8.6, upper: 5.4, fore: 5, ankle: 1.4, hips: 2.1, shoulders: [0.5, 4.7, -1.2],
      r: { leg: [1.75, 1.5, 1.3], arm: [1.15, 1.05, 0.9], body: [3.6, 4.1], hand: 1.05, foot: [1.4, 2.6, 1.15] } }, ease: 0.985 },
  // his body, a wolf's head on it, the neck's mane, a tail from the base of the spine, paws for hands, its bare skin the fur
  beast: { is: "beast-headed: his body under a wolf's head, a mane where the neck meets the shoulders, a tail from the base of the spine, paws for hands",
    // (`lean`: degrees its spine leans forward over what a move asks: a wolf carries its head ahead of its shoulders;
    // upright as he stands, the long muzzle left the skull sitting back over the spine)
    body: TB, head: "wolf", tail: "wolf", mane: "wolf", hands: "wolf", skin: "jhH", lean: 5 },
}
// a body by its preset or its numbers
const body = (b) => {
  if (typeof b === "string") { if (!BODIES[b]) throw new Error(`kit.body: no body '${b}' (${Object.keys(BODIES).join(", ")})`); return { name: b, ...BODIES[b] } }
  return { name: JSON.stringify(b), is: "a body by numbers", body: { ...b, r: { ...R0, ...b.r } } }
}
const rOf = (B) => ({ ...R0, ...B.body.r })

// ---------------------------------------------------------------- fitted to the body by rule
// What the family wrote for his body in px, read as shares of the body it goes on:
// - a drape (a cloak, a coat's tails, a skirt, an apron): its top where the body's own is (top(j) reads the joints), its
//   hem at the same share between the same two landmarks (the sole, the ankle, the knee, the hip, the chest) as on his,
//   its radius by the body's width at its base (the chest's, or the hips' for one hung from the pelvis), and never
//   inside what it is worn over (worn below);
// - a pose (the moves): the feet's steps by the legs' length, their stance by the hips' width, the hands' reach by the
//   arms' length, each hand clear of the hips (against its side, not in it) and reaching `ease` of the arm.
const marks = (b) => [0, b.ankle, b.ankle + b.shin, b.hip, b.hip + b.torso]
const rest = (b) => ({ chest: [0, 0, b.hip + b.torso], pelvis: [0, 0, b.hip] })
const fitDrape = (D, B) => {
  const b = B.body, m0 = marks(TB), m1 = marks(b), top0 = D.top(rest(TB)), hem = top0 - D.len
  let i = 0
  while (i < 3 && hem > m0[i + 1]) i++
  const t = (hem - m0[i]) / (m0[i + 1] - m0[i]), span = (m, top) => top - (m[i] + t * (m[i + 1] - m[i]))
  const k = D.base === "pelvis" ? 0 : 1, kw = rOf(B).body[k] / dress.r.body[k]
  return { ...D, len: D.len * (span(m1, D.top(rest(b))) / span(m0, top0)), radius: (h, a) => D.radius(h, a) * kw }
}
const fitMove = (M, B) => {
  const b = B.body, R = rOf(B), L = (b.thigh + b.shin) / (TB.thigh + TB.shin), W = b.hips / TB.hips, A = (b.upper + b.fore) / (TB.upper + TB.fore)
  const reach = (b.upper + b.fore) * (B.ease ?? 2), clear = R.body[0] + 0.6 * R.hand - b.shoulders[1]
  const hand = (q, k) => {
    let [f, r, u] = q.map((v) => v * A)
    // (out from the shoulder, toward the side the arm is on: k 0 the left)
    const out = k ? r : -r
    if (u < -2 && out < clear) r = k ? clear : -clear
    const d = Math.hypot(f, r, u)
    if (d > reach) u = -Math.sqrt(Math.max(0, reach * reach - f * f - r * r))
    return [f, r, u]
  }
  return { ...M, pose: (i, h) => {
    const p = M.pose(i, h)
    return { ...p, feet: p.feet.map(([f, r]) => [f * L, r * W]), lift: p.lift.map((v) => v * L), down: (p.down ?? 0) * L, hands: p.hands.map(hand), ...(B.lean ? { lean: (p.lean ?? 0) + B.lean } : {}) }
  } }
}

// ---------------------------------------------------------------- worn: the bare mannequin and garments over it
// Every garment lies over what is under it, `layer` times T0 px out from the bare body (the trunk's own radius at that
// height and angle, the limbs' own): the shirt and the trousers 1, a trousers' waistband over a tucked shirt or a
// shirt's hem hanging over the trousers 2, a vest or a bodice 2.5, a coat 2.5 (its sleeves over the shirt's), a belt 3
// (under a coat 2.25), an apron 3.5, a cloak 4. Each is a part of its own, so the figure's line runs round it and on
// what lies behind its edge (rig3d's ink): its collar, cuff, hem and waistband read as edges, the silhouette steps
// where it is thicker. Where two meet, the rule draws the waist once: a shirt that hangs is the outer at the hips (the
// trousers stop under it), a tucked one goes under the trousers' waistband (or a skirt's). The far side a step darker.
const T0 = 0.5, TL = 0.35   // a layer's thickness round the trunk, round a limb (px)
const dim = (k, far) => (far ? k[0] + k.slice(0, -1) : k)
const SKIN = "zsS", UNDER = "vwW"
// each slot's own keys, so each piece takes its own colors (the swap): a red vest over a blue shirt over brown trousers
const KEYS = { torso: "xyZ", trim: "QAB", over: "OUV", legs: "iou", feet: "Ddl", belt: "RPp", apron: "IKM", cloak: "NncC", metal: "g" }
const dot3 = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2]
const lerp = (a, b, t) => a.map((v, e) => v + (b[e] - v) * t)
const unit = (v) => { const l = Math.hypot(...v) || 1; return v.map((x) => x / l) }
// a frame's shared measures: the waist, the crotch, the chest's top, the trunk's radius by height and angle (the hips'
// under the waist, the chest's over it) grown by n layers, its sweeps carried along the spine as he leans
const frameOf = (j, B) => {
  // (the bare limbs a layer under the family's: trousers and sleeves, one layer, are his size)
  const R0b = rOf(B), R = { ...R0b, leg: R0b.leg.map((v) => v - TL), arm: R0b.arm.map((v) => v - 0.25) }, kb = R.body.map((v, i) => v / dress.r.body[i]), deep = B.deep ?? 0.84
  const waist = j.pelvis[2] + 1.4, top = j.chest[2] + 0.5, crotch = waist - 1.4 - 0.6 * R.leg[0], lean = j.chest.map((v, e) => v - j.pelvis[e])
  const side = (a) => deep + (1 - deep) * Math.abs(Math.sin(a))
  // (the bare trunk a layer under the family's tunic: a shirt, one layer, is his size)
  const trunk = (z, a, n) => (z < waist ? (3.5 + 0.3 * Math.max(0, (z - crotch) / (waist - crotch))) * kb[0] : (4 - 0.5 * Math.min(1, (z - waist) / (top - waist)) ** 2) * kb[1]) * side(a) + (n - 1) * T0
  const shift = (z) => { if (z <= j.pelvis[2] || !lean[2]) return [0, 0]; const t = (z - j.pelvis[2]) / lean[2]; return [lean[0] * t, lean[1] * t] }
  const hips = [j.pelvis[0], j.pelvis[1], 0]
  // a sweep round the trunk from z0 to z1, n layers out (n a number or (z, a) => one)
  const wrap = (z0, z1, n, o = {}) => j.sweep(hips, z0, z1, (h, a) => { const z = z0 + h * (z1 - z0); return trunk(z, a, typeof n === "function" ? n(z, a) : n) }, { shift: (h) => shift(z0 + h * (z1 - z0)), ...o })
  const farLeg = j.depth(j.legs[0].hip) < j.depth(j.legs[1].hip) ? 0 : 1, farArm = j.depth(j.arms[0].sh) < j.depth(j.arms[1].sh) ? 0 : 1
  return { j, R, kb, waist, top, crotch, trunk, wrap, hips, farLeg, farArm, skin: B.skin ?? SKIN }
}
// a painted piece as a field (for the halves melted into the thighs)
const fieldOf = (q) => typeof q.paint === "string" ? q.field.mat(q.paint) : typeof q.paint !== "function" ? q.field
  : q.field.paint((p, n) => { const [h, a, out] = q.at(p); return q.paint(h, a, dot3(n, out) >= 0) })
// a sweep round the hips halved through the pelvis, each half melted into its leg's pieces (no line where a thigh meets
// the hips: one shape from the waist down), each leg a part of its own (the near leg's line over the far)
const halved = (F, seat, legs, name) => {
  const { j } = F, d = dot3(j.pelvis, j.r)
  return Object.fromEntries(legs.map((ps, i) => [`${name}${i}`, sdf.union(sdf.union(fieldOf(seat(i)).intersect(i ? sdf.plane(j.r.map((v) => -v), -d) : sdf.plane(j.r, d)), fieldOf(ps[0]), { smooth: 0.6 }), ...ps.slice(1).map(fieldOf))]))
}
// a foot (bare, or a shoe's grown by g px): from its heel just behind the shin to its toe ahead, as wide as the ankle
const foot = (F, L, g, paint) => {
  const r = F.R.leg[2], [, half, up] = F.R.foot, d = unit([L.toe[0] - L.heel[0], L.toe[1] - L.heel[1], 0]), ahead = half - 0.8 * r
  return F.j.ball([L.ankle[0] + d[0] * ahead, L.ankle[1] + d[1] * ahead, up + g * 0.5], [r * 1.05 + g, half + g, up + g * 0.5], paint)
}
// a hand: a mitten at the end of the forearm, on from the wrist along it, a little wider than the wrist, not a ball on it
const hand = (F, A, paint) => {
  const d = unit(A.hand.map((v, e) => v - A.elbow[e])), at = (l) => A.hand.map((v, e) => v + d[e] * l)
  return F.j.limb(at(-0.3), at(1.7 * F.R.hand), F.R.hand * 0.95, F.R.hand, paint)
}
// the bare mannequin: skin, short drawers and a sleeveless undershirt in undyed linen, the neck
const bare = (F) => {
  const { j, R } = F
  const legs = j.legs.map((L, i) => { const far = i === F.farLeg, s = dim(F.skin, far), u = dim(UNDER, far)
    return [j.limb(L.hip, L.knee, R.leg[0], R.leg[1], (h) => (h < 0.3 ? u : s)), j.limb(L.knee, L.ankle, R.leg[1], R.leg[2], s), foot(F, L, 0, s)] })
  return {
    ...halved(F, (i) => F.wrap(F.crotch, F.waist, 0, { paint: dim(UNDER, i === F.farLeg) }), legs, "leg"),
    body: F.wrap(F.waist, F.top, 0, { paint: (h, a) => (h < 0.62 || (h < 0.86 && Math.abs(Math.abs(a) - 1.57) > 0.6) ? UNDER : F.skin) }),
    ...Object.fromEntries(j.arms.map((A, i) => { const s = dim(F.skin, i === F.farArm); return [`arm${i}`, [j.limb(A.sh, A.elbow, R.arm[0], R.arm[1], s), j.limb(A.elbow, A.hand, R.arm[1], R.arm[2], s), hand(F, A, s)]] })),
    neck: j.limb(j.chest, [j.head[0], j.head[1], j.head[2] - 3], 1.6 * Math.sqrt(F.kb[1]), 1.5 * Math.sqrt(F.kb[1]), "zs"),
  }
}
// a sleeve over an arm, n layers out, from the shoulder to `to` along the arm (1 the elbow, 2 the wrist), its cuff a band
// a little thicker at its end (`roll`: rolled up, a thick roll lit on top)
const sleeve = (F, A, n, to, K, far, roll) => {
  const { j, R } = F, k = dim(K, far), t = n * TL, end = to <= 1 ? lerp(A.sh, A.elbow, to) : lerp(A.elbow, A.hand, to - 1)
  const rEnd = to <= 1 ? R.arm[0] + (R.arm[1] - R.arm[0]) * to : R.arm[1] + (R.arm[2] - R.arm[1]) * (to - 1)
  const cuff = (h) => (h > 0.86 ? (roll ? k.slice(1) : k[0] + k[1]) : k)
  // (the inside of the elbow a crease in the darkest)
  const up = j.limb(A.sh, to <= 1 ? end : A.elbow, R.arm[0] + t, (to <= 1 ? rEnd : R.arm[1]) + t, to <= 1 ? cuff : (h, a) => (h > 0.82 && Math.abs(a) < 1 ? k[0] : k))
  const parts = [up, ...(to > 1 ? [j.limb(A.elbow, end, R.arm[1] + t, rEnd + t + 0.1, k)] : [])]
  // (the cuff a band at its end, a step out and lit; rolled up, a thick roll)
  parts.push(j.limb(to > 1 ? lerp(A.elbow, end, 0.76) : lerp(A.sh, end, 0.78), end, rEnd + t + (roll ? 0.35 : 0.2), rEnd + t + (roll ? 0.4 : 0.26), k.slice(1)))
  return parts
}
// the torso's sleeves by the arms slot: to the wrist, rolled up to the elbow, or the piece's own (short, puffed)
const sleeves = (F, P, W, name = "sleeve", n = 1, K = KEYS.torso) => {
  if (P.sleeves === "none") return {}
  const how = P.sleeves === "puffed" ? "puffed" : W.arms?.key === "rolledup" ? "rolled" : "long"
  return Object.fromEntries(F.j.arms.map((A, i) => {
    const far = i === F.farArm
    if (how === "puffed") return [`${name}${i}`, [F.j.limb(A.sh, lerp(A.sh, A.elbow, 0.62), F.R.arm[0] + 0.8, F.R.arm[0] + 0.55, (h) => (h > 0.8 ? dim(K, far)[0] + dim(K, far)[1] : dim(K, far)))]]
    return [`${name}${i}`, sleeve(F, A, n, how === "rolled" ? 0.95 : 1.88, K, far, how === "rolled")]
  }))
}
// the collar: a band round the shirt's top a step out from it, open at the throat (the shirt's own V under it)
const collar = (F, K, n = 1) => F.wrap(F.top - 1.2, F.top + 0.35, n + 0.7, { keep: (h, a) => Math.abs(a) > 0.42, paint: (h, a, out) => (out ? K.slice(1) : K[0]) })
// a shirt's body (tucked: from under the waistband up; hanging: down over the trousers' top to the hips, flared), its
// folds where it is gathered at the waist, its paint by height (z px over the waist) and angle
const shirtBody = (F, P, W, paint) => {
  const hangs = P.hangs, z0 = hangs ? F.waist - 2.8 : F.waist - 0.7, H = F.top + 0.2 - z0
  // (hanging: flared over the trousers' top; tucked: bloused a little over the waistband)
  const n = hangs ? (z) => (z < F.waist ? 2 + 1.1 * (F.waist - z) / (F.waist - z0) : 1) : (z) => 1 + 0.6 * Math.max(0, Math.min(1, 1 - (z - F.waist) / 1.6))
  return F.wrap(z0, F.top + 0.2, n, { keep: (h, a) => !(Math.abs(a) < 0.3 && z0 + h * H > F.top - 1.6), paint: (h, a, out) => {
    const z = z0 + h * H - F.waist
    if (!out) return KEYS.torso[0]
    // (gathered: two folds a side from the waist, a step darker; a hem's last row in shade under its flare)
    if (hangs && h < 0.08) return KEYS.torso.slice(0, 2)
    if (z > -0.6 && z < 1.4 && Math.abs(Math.abs(a) - 0.8) < 0.12) return KEYS.torso.slice(0, 2)
    return paint(z, a)
  } })
}
const DRAPE = { legs: () => ({ tr: "k", shin: "k", foot: "k" }), cuff: 0, skirt: "k", body: () => "k", sleeve: () => "k", fore: () => "k", hand: () => "k", over: [], drapes: [] }
// a drape of the family's (dress()'s: hung from its top, trailing as he walks), fitted to the body, never inside the trunk
// grown by n layers, painted in its own keys; a skirt's and a coat's pushed by the legs (`push`), so a step tents the
// cloth over the bare leg rather than through it
const drape = (F, p, D, n, name) => {
  const top = D.top(F.j)
  const d = { ...D, radius: (h, a) => Math.max(D.radius(h, a), F.trunk(top - D.len + h * D.len, a, n)) }
  const made = dress({ ...DRAPE, ...(D.over ? { over: [d] } : { drapes: [d] }) })(F.j, p)
  return { [name]: D.over ? made.over0 : made.cloak }
}
const PIECES = {
  // ---- the torso (layer 1): shirts, each its own colors (`torso`, a second `trim`), its sleeves by the arms slot
  tunic: { slot: "torso", hangs: true, sleeves: "long", colors: { torso: "linen" }, is: "the traveler's linen tunic: it hangs over the trousers to the hips, flared, its hem in shade",
    draw: (F, p, W) => ({ shirt: [shirtBody(F, PIECES.tunic, W, () => KEYS.torso), collar(F, KEYS.torso)], ...sleeves(F, PIECES.tunic, W) }) },
  stripes: { slot: "torso", sleeves: "long", colors: { torso: "white", trim: "navy" }, is: "a sailor's shirt in stripes 2 px wide, tucked in",
    draw: (F, p, W) => ({ shirt: [shirtBody(F, PIECES.stripes, W, (z) => (Math.floor(z / 2) % 2 ? KEYS.trim : KEYS.torso)), collar(F, KEYS.trim)], ...sleeves(F, PIECES.stripes, W, "sleeve", 1, KEYS.trim) }) },
  shirt: { slot: "torso", sleeves: "long", colors: { torso: "white" }, is: "a linen shirt, tucked in, a collar open at the throat",
    draw: (F, p, W) => ({ shirt: [shirtBody(F, PIECES.shirt, W, () => KEYS.torso), collar(F, KEYS.torso)], ...sleeves(F, PIECES.shirt, W) }) },
  smock: { slot: "torso", hangs: true, sleeves: "long", colors: { torso: "tweed" }, is: "a worker's smock: it hangs to the hips, plain",
    draw: (F, p, W) => ({ shirt: [shirtBody(F, PIECES.smock, W, () => KEYS.torso), collar(F, KEYS.torso)], ...sleeves(F, PIECES.smock, W) }) },
  chemise: { slot: "torso", sleeves: "puffed", colors: { torso: "white" }, is: "a chemise, tucked in, short puffed sleeves",
    draw: (F, p, W) => ({ shirt: [shirtBody(F, PIECES.chemise, W, () => KEYS.torso), collar(F, KEYS.torso)], ...sleeves(F, PIECES.chemise, W) }) },
  // ---- over the torso (`over`): a vest, a bodice, a coat
  vest: { slot: "over", needs: { torso: "any" }, colors: { over: "olive" }, is: "a vest open over a shirt to the waist, its edges lit",
    draw: (F) => ({ vest: F.wrap(F.waist - 1, F.top + 0.1, 2.5, { keep: (h, a) => Math.abs(a) > 0.42, paint: (h, a, out) => (!out ? KEYS.over[0] : h < 0.07 ? KEYS.over.slice(0, 2) : Math.abs(a) < 0.62 ? KEYS.over.slice(1) : KEYS.over) }) }) },
  bodice: { slot: "over", needs: { torso: ["chemise", "shirt"] }, colors: { over: "red" }, is: "a bodice laced over a chemise or a shirt, from the hips to under the arms",
    draw: (F) => ({ bodice: F.wrap(F.waist - 1.2, F.waist + 0.72 * (F.top - F.waist), 2.5, { paint: (h, a, out) => (!out ? KEYS.over[0] : Math.abs(a) < 0.1 ? KEYS.over[0] : h > 0.9 || h < 0.08 ? KEYS.over.slice(0, 2) : KEYS.over) }) }) },
  coat: { slot: "over", sleeves: "long", colors: { over: "navy", metal: "gold" }, is: "a long coat open in front over a shirt or bare, buttons down its edges, cuffs turned back",
    // (the crew's coat's tails, its shoulders over the trunk; its sleeves over a shirt's)
    draw: (F, p, W, B) => ({ ...drape(F, p, { ...fitDrape(C.OUTFITS.coat.drapes[0], B), push: 0.3, out: (h, a, out) => (!out ? KEYS.over[0] : h < 0.05 ? KEYS.over.slice(0, 2) : h > 0.4 && Math.abs(Math.abs(a) - 0.4) < 0.1 && Math.floor(h * 14) % 2 ? KEYS.metal : Math.abs(a) < 0.5 ? KEYS.over.slice(1) : KEYS.over) }, 2.5, "coat"),
      ...Object.fromEntries(F.j.arms.map((A, i) => [`coatarm${i}`, sleeve(F, A, W.torso ? 2 : 1, 1.85, KEYS.over, i === F.farArm, false)])) }) },
  // ---- the legs (layer 1): trousers to a cuff, a skirt; their own colors (`legs`)
  trousers: { slot: "legs", cuff: 0.95, colors: { legs: "slate" }, is: "trousers to the ankle (into boots where they reach)" },
  canvas: { slot: "legs", cuff: 0.95, colors: { legs: "canvas" }, is: "canvas trousers to the ankle" },
  rolled: { slot: "legs", cuff: 0.45, roll: true, colors: { legs: "canvas" }, is: "canvas trousers rolled to the shin" },
  breeches: { slot: "legs", cuff: 0.22, colors: { legs: "white" }, is: "breeches to under the knee" },
  skirt: { slot: "legs", colors: { legs: "plum" }, is: "a long skirt from the waist, a shirt tucked into it",
    draw: (F, p, W, B) => drape(F, p, { ...fitDrape(C.OUTFITS.dress.drapes[0], B), push: 0.3, out: (h, a, out) => (!out ? KEYS.legs[0] : h > 0.93 ? KEYS.legs.slice(0, 2) : h < 0.04 ? KEYS.legs[0] + KEYS.legs[1] : Math.abs(Math.abs(a) - 0.9) < 0.1 && h < 0.8 ? KEYS.legs.slice(0, 2) : KEYS.legs) }, 2, "skirt") },
  // ---- the feet: what is worn over the bare foot (layer 2 over the trousers' cuff)
  boots: { slot: "feet", shaft: 0.5, colors: { feet: "brown" }, is: "boots to mid-shin, the shaft wider at its top, its cuff turned down, a dark sole" },
  highboots: { slot: "feet", shaft: 0.92, colors: { feet: "black" }, is: "high boots to under the knee" },
  shoes: { slot: "feet", shaft: 0.12, colors: { feet: "brown" }, is: "low shoes" },
  bare: { slot: "feet", is: "bare feet" },
  // ---- the arms: how the torso's sleeves are worn
  sleeves: { slot: "arms", is: "the sleeves down to the wrist" },
  rolledup: { slot: "arms", is: "the sleeves rolled up over the elbow, the forearms bare" },
  // ---- over the waist, the drapes
  belt: { slot: "belt", needs: { either: ["torso", "legs"] }, colors: { belt: "brown", metal: "gold" }, is: "a leather belt with a buckle, over the shirt and the trousers, under a coat",
    draw: (F, p, W) => ({ belt: F.wrap(F.waist - 0.75, F.waist + 0.65, W.over?.key === "coat" ? 2.25 : 3, { paint: (h, a, out) => (!out ? KEYS.belt[0] : Math.abs(a) < 0.3 ? KEYS.metal : h > 0.7 ? KEYS.belt.slice(1) : KEYS.belt) }) }) },
  apron: { slot: "apron", needs: { torso: "any" }, excludes: ["coat"], why: "an apron ties over a shirt's front, where a coat's open front would hang over its bib", colors: { apron: "brown" },
    is: "a leather apron from the chest to the knees over a torso piece",
    draw: (F, p, W, B) => drape(F, p, { ...fitDrape(C.OUTFITS.apron.over[0], B), over: true, out: (h, a, out) => (!out ? KEYS.apron[0] : h < 0.05 ? KEYS.apron.slice(0, 2) : KEYS.apron) }, 3.5, "apron") },
  travel: { slot: "cloak", colors: { cloak: "green" }, is: "the traveler's travel cloak from the shoulders to mid-thigh, open in front",
    draw: (F, p, W, B) => drape(F, p, { ...fitDrape(T.TRAVELER.drapes[0], B), out: T.PAINT.cloak }, 4, "cloak") },
}
// trousers by rule: each leg to its cuff (a hem in shade; rolled, a roll lit on top), the seat up to the waist, the
// waistband over a tucked shirt (under one that hangs); the knee's crease when it bends past 60 degrees (a step)
const trousersOf = (F, P, W) => {
  const { j, R } = F, K = KEYS.legs, hangs = W.torso?.hangs, z1 = F.waist + (hangs ? 0 : 0.6)
  const legs = j.legs.map((L, i) => {
    const far = i === F.farLeg, k = dim(K, far), t = TL, bent = dress.bend(L.hip, L.knee, L.ankle) > 60, end = lerp(L.knee, L.ankle, P.cuff), rEnd = R.leg[1] + (R.leg[2] - R.leg[1]) * P.cuff
    const hem = (h) => (h > 0.9 ? (P.roll ? k.slice(1) : k.slice(0, 2)) : k)
    return [j.limb(L.hip, L.knee, R.leg[0] + t, R.leg[1] + t, bent ? (h, a) => (h > 0.75 && Math.abs(a) > 2.2 ? k[0] : k) : k), j.limb(L.knee, end, R.leg[1] + t, rEnd + t + (P.cuff > 0.5 ? 0.15 : 0), hem),
      ...(P.roll ? [j.limb(lerp(L.knee, end, 0.82), end, rEnd + t + 0.4, rEnd + t + 0.45, k.slice(1))] : [])]
  })
  // (the seat: under the waist the trousers', over it the waistband a layer out, its top a step lit)
  const seat = (i) => F.wrap(F.crotch, z1, (z) => (z > F.waist - 0.7 && !hangs ? 2 : 1), { paint: (h) => { const z = F.crotch + h * (z1 - F.crotch); return z > F.waist - 0.7 && !hangs ? (z > F.waist + 0.2 ? K.slice(1) : K.slice(0, 2)) : dim(K, i === F.farLeg) } })
  return halved(F, seat, legs, "tleg")
}
// what the feet wear: a shaft up the shin (as wide as the leg and a layer more, wider at its top, its cuff turned down a
// step lighter) and the foot a layer over the bare one, from the heel behind the shin to the toe ahead, its sole dark
const shoesOf = (F, P) => {
  const { j, R } = F, K = KEYS.feet
  return Object.fromEntries(j.legs.map((L, i) => {
    const k = dim(K, i === F.farLeg), top = lerp(L.ankle, L.knee, P.shaft), rTop = R.leg[2] + (R.leg[1] - R.leg[2]) * P.shaft, t = 2 * TL
    return sdf.union(fieldOf(j.limb(L.ankle, top, R.leg[2] + t, rTop + t + 0.3 * P.shaft, (h) => (h > 0.85 && P.shaft > 0.3 ? k.slice(1) : k))),
      fieldOf(foot(F, L, TL * 1.2, (h) => (h < 0.3 ? K[0] : k))))
  }).map((f, i) => [`boot${i}`, f]))
}
// each piece its name and its layer (the table above: what it lies over)
for (const [k, P] of Object.entries(PIECES)) Object.assign(P, { key: k, layer: { torso: 1, over: 2.5, legs: 1, feet: 2, belt: 3, apron: 3.5, cloak: 4, arms: 1 }[P.slot] })
// the parts a body and its pieces make (rig3d's), by rule
const worn = (B, W) => (j, p) => {
  const F = frameOf(j, B), P = bare(F)
  for (const s of ["torso", "over", "legs", "feet", "belt", "apron", "cloak"]) {
    const Q = W[s]
    if (!Q) continue
    Object.assign(P, Q.draw ? Q.draw(F, p, W, B) : s === "legs" ? trousersOf(F, Q, W) : s === "feet" && Q.shaft ? shoesOf(F, Q) : {})
  }
  // a beast's own: the mane and the tail parts of their own, paws in the bare hands' place
  for (const s of BEASTLY) if (W[s]) Object.assign(P, W[s].draw(F, B, P))
  return P
}

// ---------------------------------------------------------------- what fits with what
// Each piece's slot (one piece a slot), its layer (above), what it needs (`needs`: a slot worn, or one of some pieces in
// it; `either`: one of those slots worn) and what it excludes (pieces it can't be worn with): the reason a spec doesn't
// fit, and what would. A hair or a beard fits the heads it names.
const check = (W, H) => {
  const worn = Object.values(W).filter(Boolean)
  for (const P of worn) {
    for (const [s, list] of Object.entries(P.needs ?? {})) {
      if (s === "either") { if (!list.some((q) => W[q])) return `the ${P.slot} '${P.key}' needs a ${list.join(" or a ")} piece to hold to`; continue }
      if (!W[s]) return `the ${P.slot} '${P.key}' goes over a ${s} piece and none is worn (${s}: ${list === "any" ? Object.values(PIECES).filter((q) => q.slot === s).map((q) => q.key).join(", ") : list.join(", ")})`
      if (list !== "any" && !list.includes(W[s].key)) return `the ${P.slot} '${P.key}' goes over ${list.map((q) => `a ${q}`).join(" or ")}, not over the ${s} '${W[s].key}' (${s}: ${list.join(", ")})`
    }
    for (const q of P.excludes ?? []) if (worn.some((o) => o.key === q)) return `the ${P.slot} '${P.key}' can't be worn with the ${PIECES[q].slot} '${q}': ${P.why}; leave one out`
  }
  for (const P of [W.hair, W.beard].filter(Boolean)) if (P.fits && !P.fits.head.includes(H.key)) return `the ${P.slot} '${P.key}' fits the head ${P.fits.head.join(", ")}, not '${H.key}'`
}

// ---------------------------------------------------------------- the head
// A head is a skull with its face (the approved hand faces, traveler.FACE, cut over the render: views()), and on it
// the hair, a beard, what covers them, each a field in the head's frame with what it paints over the face where it
// lies (a side lock down the cheek, a bald brow, the chin under a beard): its own grid's pixels where they differ from
// the face's, "," where it leaves the render. Each part says what it covers (a hat welded to its hair covers the
// headwear's slot), whether it closes the cheek (a beard, long hair: no jowl, views()') and a bald crown (its shine);
// `reach` how far it comes out from the head's middle (px: the figure's cell holds it).
const rowsOf = (g) => g.replace(/\r/g, "").split("\n").map((r) => r.trim()).filter(Boolean)
const cells = (g, [ax, ay]) => new Map(rowsOf(g).flatMap((r, y) => [...r].map((k, x) => [`${x - ax},${y - ay}`, k])).filter(([, k]) => k !== "."))
const FACE_A = T.HEAD.anchor
const delta = (grids, anchor = FACE_A, keep = () => true) => Object.fromEntries(Object.keys(T.FACE).map((v) => {
  const A = cells(grids[v], anchor[v]), F = cells(T.FACE[v], FACE_A[v]), m = new Map()
  for (const [p, k] of A) if (F.get(p) !== k) m.set(p, k)
  for (const [p] of F) if (!A.has(p)) m.set(p, ",")
  return [v, new Map([...m].filter(([p]) => keep(+p.split(",")[1])))]
}))
const bd = (keep) => delta(C.FACES.bd, FACE_A, keep)
const HEADS = {
  human: { slot: "head", is: "the traveler's skull, the approved hand face painted over it", skull: T.SKULL, face: T.FACE, anchor: FACE_A, reach: 6.5, materials: { skin: "zsSL" } },
}
const HAIR = { hair: "JjhHY" }
const HAIRPARTS = {
  tousled: { slot: "hair", is: "the traveler's: a parting, locks of fringe, side locks to the jaw", field: T.HAIR, paint: delta(T.FACE_TR), reach: 7 },
  bun: { slot: "hair", is: "the mourner's: drawn back smooth over the ears into a bun", field: sdf.union(T.MO.HAIR, T.MO.BUN), paint: delta(T.MO.FACE), reach: 9 },
  bandana: { slot: "hair", is: "a bandana knotted at the back over a short ponytail", covers: ["headwear"], field: C.HAIRS.sa, paint: delta(C.FACES.sa), hat: "mrt", reach: 9 },
  flatcap: { slot: "hair", is: "short hair under a flat cap", covers: ["headwear"], field: C.HAIRS.fc, paint: delta(C.FACES.fc, C.ANCHORS.fc), hat: "abf", reach: 7.5 },
  braid: { slot: "hair", is: "long hair parted in the middle, a braid over the right shoulder", closes: true, field: C.HAIRS.br, paint: delta(C.FACES.br), reach: 10.5 },
  tied: { slot: "hair", is: "grey hair pulled back from a high forehead, tied in a short tail", field: C.HAIRS.og, paint: delta(C.FACES.og, C.ANCHORS.og), reach: 8.5 },
  // the bald head's ring and its beard apart (its paint parted at the row under the nose)
  ring: { slot: "hair", is: "bald, a band of short hair round the back below the crown", bald: true, field: C.RING, paint: bd((y) => y < 3), reach: 6.5 },
  full: { slot: "beard", is: "a full beard from the cheekbones down, hanging past the chin", closes: true, field: C.BEARD, paint: bd((y) => y >= 3), reach: 7.5 },
}
for (const [k, P] of Object.entries(HAIRPARTS)) Object.assign(P, { key: k, fits: { head: ["human"] }, materials: P.hat ? { ...HAIR, hat: P.hat } : HAIR })
// the head's paint: the face's grid, each part's over it, as one grid a view about its anchor
const paintOf = (H, parts) => {
  const retouch = {}, anchor = {}
  for (const v of Object.keys(H.face)) {
    const m = cells(H.face[v], H.anchor[v])
    for (const P of parts) for (const [p, k] of P.paint?.[v] ?? []) k === "," ? m.delete(p) : m.set(p, k)
    if (!m.size) continue
    const at = [...m.keys()].map((p) => p.split(",").map(Number)), x0 = Math.min(...at.map((q) => q[0])), x1 = Math.max(...at.map((q) => q[0])), y0 = Math.min(...at.map((q) => q[1])), y1 = Math.max(...at.map((q) => q[1]))
    retouch[v] = Array.from({ length: y1 - y0 + 1 }, (_, y) => Array.from({ length: x1 - x0 + 1 }, (_, x) => m.get(`${x + x0},${y + y0}`) ?? ".").join("")).join("\n")
    anchor[v] = [-x0, -y0]
  }
  return { retouch, anchor }
}
// a head once per set of parts (its colors are the character's swap): views() as the traveler's, the parts' fields on the skull
const headsMade = new Map()
const headOf = (H, parts) => {
  const key = JSON.stringify([H.key, parts.map((P) => P.key)])
  if (!headsMade.has(key)) {
    const name = `_kh${headsMade.size}`, { retouch, anchor } = paintOf(H, parts)
    // (what is on the skull one field, the skull's other child: as the crew's bald head and its beard were made)
    views(name, parts.length ? sdf.union(H.skull, parts.length > 1 ? sdf.union(...parts.map((P) => P.field)) : parts[0].field) : H.skull, { ...T.HEAD, ...H.views, retouch, anchor,
      ...(parts.some((P) => P.closes) || H.closes ? {} : { jowl: 2 }), ...(parts.some((P) => P.bald) ? { crown: 3 } : {}) })
    headsMade.set(key, own(name))
  }
  return headsMade.get(key)
}

// ---------------------------------------------------------------- the colors
// A spec's colors name a ramp for each slot a piece paints (torso, trim, over, legs, feet, belt, apron, cloak, hat, metal),
// or give it, dark to light, as "#hex" strings: the slot's keys take its lightest tones (three keys the ramp's last
// three). Unsaid, a piece's own (its `colors`). The hair's five keys and the skin's four take a ramp of their own length.
const RAMPS = {
  green: ["#1c2e27", "#30503d", "#4c7652", "#77a068"], navy: ["#121a30", "#1a2440", "#2b3d66", "#46619a"], red: ["#4a1216", "#6e1c22", "#a8323a", "#d0604c"],
  olive: ["#283020", "#384530", "#55663e", "#76875a"], plum: ["#1e1826", "#2e2638", "#4c3e5e", "#6e5c84"], tweed: ["#24201c", "#3a332e", "#5c544b", "#857a6c"],
  canvas: ["#3a2c1e", "#5a4630", "#7e6646", "#a08660"], linen: ["#4a3c30", "#6f5c4a", "#a68f6c", "#d8c69e"], white: ["#7a766e", "#a9a49a", "#d6d2c6", "#f2efe6"],
  slate: ["#1e1c28", "#2e2b3c", "#423f53", "#66637a"], rust: ["#3e1c10", "#6e3218", "#a0522a", "#cc7e46"], teal: ["#10282a", "#1c4442", "#2c6a62", "#53998a"],
  mustard: ["#3e3010", "#6e5a1c", "#a48a2c", "#d4ba56"], brown: ["#2e1a10", "#4b2e1e", "#83542f", "#a87444"], black: ["#141012", "#2a2224", "#423a3c", "#6a5e5e"],
  gold: ["#f0cc62"], silver: ["#d4d8e0"], brass: ["#c09048"], iron: ["#8a8e98"],
}
const SKINS = {
  fair: ["#9c5b45", "#d2966f", "#f0c79e", "#fde6c6"], tan: ["#7e4a30", "#b47650", "#d8a274", "#f0caa0"], brown: ["#5a3220", "#86553a", "#ad7a54", "#cc9e74"],
  deep: ["#3a2016", "#5c3626", "#7e523a", "#9e7050"],
}
// the hair's: the traveler's chestnut, the crew's (dark, black, ginger, auburn, grey), blond
const HAIRS = { chestnut: {}, ...C.HAIR_COLORS, blond: { Y: "#f2dc94", H: "#d8b862", h: "#ae8a3e", j: "#785a26", J: "#463214" } }
// A beast's fur (`colors.fur`): the fur's five keys (the hair's) and the mask's four (the skin's), each fur its own ramps,
// hue-shifted (the shadows cool, the lights warm); a black fur's lights a cool sheen well over the line, so they, not its
// darks, carry its form; its mask a dim grey
const FURS = {
  grey: { J: "#1a1820", j: "#2e2c36", h: "#4a4750", H: "#6e6a6c", Y: "#97918a", z: "#6e665e", s: "#9a9082", S: "#c8bea9", L: "#e8e0cc" },
  black: { J: "#0e0c12", j: "#1c1a22", h: "#2c2a36", H: "#46465a", Y: "#6e7088", z: "#3a3640", s: "#5a5460", S: "#7e7884", L: "#a29ca4" },
  red: { J: "#22120f", j: "#3e2018", h: "#64341f", H: "#8c5430", Y: "#b07c4c", z: "#7e6450", s: "#ac927a", S: "#d4c0a2", L: "#efe2c8" },
}
const tones = (c, table, what) => (Array.isArray(c) ? c : table[c] ?? (() => { throw new Error(`kit: no ${what} color '${c}' (${Object.keys(table).join(", ")})`) })())
const swapOf = (colors = {}, worn, hat) => {
  const swap = {}, put = (keys, c) => [...keys].forEach((k, i) => (swap[k] = c[Math.max(0, c.length - keys.length + i)]))
  for (const P of worn) for (const [s, c] of Object.entries(P.colors ?? {})) put(KEYS[s], tones(colors[s] ?? c, RAMPS, s))
  if (hat && colors.hat !== undefined) put(hat, tones(colors.hat, RAMPS, "hat"))
  if (colors.fur !== undefined) Object.assign(swap, FURS[colors.fur] ?? (() => { throw new Error(`kit: no fur '${colors.fur}' (${Object.keys(FURS).join(", ")})`) })())
  if (colors.skin !== undefined) put("zsSL", tones(colors.skin, SKINS, "skin"))
  if (colors.hair !== undefined) {
    const h = Array.isArray(colors.hair) ? Object.fromEntries([..."JjhHY"].map((k, i) => [k, colors.hair[i]])) : HAIRS[colors.hair]
    if (!h) throw new Error(`kit: no hair color '${colors.hair}' (${Object.keys(HAIRS).join(", ")})`)
    Object.assign(swap, h)
  }
  return swap
}

// ---------------------------------------------------------------- the beast: a wolf's head and a tail
// The wolf's head modeled on the skull's way (the head's frame: x its right, y ahead, z up, px), from what carries "wolf"
// at 11 px: a wedge, not the human ball with ears. The cranium low and long; the ruff behind the cheeks wider than the
// crown and lower, so the head widens under the eyes into the neck's mane; the muzzle as long as the skull behind the
// stop, its bridge sloping on from the brow to a square nose, so it stands out to one side in a diagonal and its tip
// still shows past the cheek turned away; two short ears, as wide at the base as they are tall, set wide on the crown's
// corners and tilted out (long ones upright on a round head read as a rabbit from behind). The fur in the hair's ramp,
// the mask (the muzzle's sides and underside, the cheeks, the throat) in the skin's (the wolf's skin a pale fur), the nose
// dark. Three candidates were baked as silhouettes first; this one (the muzzle as long as the skull, the ruff wide, the
// ears as wide as tall) read as a wolf from every diagonal. Baked per view and its face painted over by hand (WOLF_FACE).
// an ear: a flat triangle (a cone pressed thin front to back), its inside (facing ahead) dark, its back the fur's
const wolfEar = (s, i) => sdf.cone(2.1, 4.2, 0.3).intersect(sdf.box([5.2, 1.6, 10.4])).rotate(-12, "x").rotate(s * 18, "y").at(s * 2.6, -1.8, 3.4)
  .paint((q, n) => (n[1] > 0.4 ? "Jj" : "jhH")).part(`ear${i}`)
const WOLF = sdf.union(
  // the cranium, the ruff wider and lower behind the cheeks (a tuft out and back at each), the cheeks and throat pale
  sdf.union(sdf.ellipsoid([3.7, 4, 3.9]).at(0, -1.2, 1), sdf.ellipsoid([5, 2.8, 3]).at(0, -2.2, -1.5), ...[-1, 1].map((s) => sdf.capsule([s * 3.6, -1.6, -1.6], [s * 4.9, -3.4, -3.2], 1.3, 0.5)), { smooth: 1.2 })
    .noise({ amp: 0.25, scale: 1.1, seed: 21 }).paint((q) => (q[2] < -1 && q[1] > 0.3 ? "zsSL" : "jhHY")),
  // the muzzle from the stop out 5.6 px and down, its jaw under it; the bridge and the top the fur's, its sides and
  // underside pale, the nose dark at its tip (the muzzle's own tip: as a part of its own its line doubled the muzzle's)
  sdf.capsule([0, 1, 0.6], [0, 6.6, -0.7], 2.5, 1.25).union(sdf.ellipsoid([1.6, 2.24, 0.9]).at(0, 3.24, -1.5), { smooth: 0.6 })
    .paint((q) => (q[1] > 6.5 && q[2] > -1.4 ? "kJj" : q[2] < 0 ? "zsSL" : "jhHY")).part("muzzle"),
  ...[-1, 1].map(wolfEar))
// Its face painted over the bake by hand, view by view, as runs: { row: [[x, keys], ...] }, the row and x px from the head's
// middle (its anchor), "_" erasing the bake's pixel (the runs are the painted view's difference from the bake). A wolf's
// eyes sit on the front-sides of its skull over the muzzle's root, slanting up toward the ears: in a front diagonal (sw)
// the near eye whole (its front corner dark at -1,-1, the amber at 0,-1, the lid's dark a row up at its back end +1,-2,
// a pale brow over it, the mask's pale under it), the far one hidden behind the bridge (both shown alike read as a face
// seen from the front); turned away (nw) the near eye a sliver (-3,-1) at the muzzle's root past the cheek, the far one
// hidden. Facing us both, either side of the bridge, each with its lid out and up; in profile one, over the root. The
// muzzle seen from its side: the bridge in the fur's lights, the nose dark at its tip (sw -6,+2..+3), the mouth a line of
// the mask's darkest back along its underside to under the eye; the mask on the muzzle's sides, under the eyes and the
// throat, the cheek behind it the fur's (a pale band across the whole head read frontal); the ears' insides a pale
// stroke; the ruff in strokes of the fur down its fall; from behind the crown lit and the ears' outer edges dark, a
// saddle of the fur's dark down the nape. Each its own colors (the fur the hair's keys, the mask the skin's: FURS).
const WOLF_RUNS = {
  s: { "-6": [[-3, "S"], [3, "S"]], "-5": [[-3, "s"], [3, "s"]], "-2": [[-4, "J"], [-1, "hjh"], [4, "J"]], "-1": [[-3, "qJ"], [2, "Jq"]], 0: [[-4, "Sh"], [3, "hS"]], 1: [[-5, "SSs"], [-1, "H"], [1, "H"], [3, "sSS"]], 2: [[-5, "sSsSJJJSsSS"]], 3: [[-4, "sSszJzsSs"]], 4: [[0, "z"], [3, "kk"]] },
  sw: { "-6": [[-1, "h"], [3, "J"]], "-5": [[2, "JS"]], "-4": [[2, "JS"]], "-3": [[-2, "hH"], [2, "HJ"]], "-2": [[-2, "hHLJ"], [3, "J"]], "-1": [[-3, "hHJqS"], [4, "H"]], 0: [[-4, "hHHSSS"], [3, "Y"]], 1: [[-5, "hHSLLS"], [3, "h"]], 2: [[-5, "SLL"], [0, "S"], [2, "HhY"]], 3: [[-5, "zzzs"], [0, "z"], [2, "Sh"], [5, "hh"]], 4: [[1, "ssss"]] },
  w: { "-8": [[1, "_"]], "-7": [[0, "_"], [2, "_"]], "-5": [[0, "H"], [2, "k"], [4, "_"]], "-4": [[0, "H"], [2, "jHk_"]], "-3": [[0, "H"], [2, "jh"]], "-2": [[-3, "hLJH"], [3, "j"]], "-1": [[-3, "Jq"]], 0: [[-7, "h"], [-3, "SS"]], 1: [[-7, "zL"], [-2, "SS"]], 2: [[-7, "zzzssz"], [2, "h"]], 3: [[0, "SS"], [3, "h"]], 4: [[0, "sS"], [4, "h"]] },
  nw: { "-4": [[-4, "kh"]], "-3": [[-4, "Hh"]], "-2": [[-5, "Y"], [-3, "J"]], "-1": [[-5, "Jhq"]], 0: [[-4, "zShh"]], 1: [[-4, "Ss"], [1, "h"]], 2: [[2, "h"], [5, "h"]], 3: [[-3, "S"], [0, "hh"]], 4: [[-1, "hh"]] },
  n: { "-6": [[-4, "h"], [4, "h"]], "-5": [[-4, "h"], [4, "h"]], "-4": [[-4, "h"], [4, "h"]], 1: [[0, "h"]], 2: [[-5, "Y"], [-1, "hhh"], [5, "Y"]], 3: [[-4, "Y"], [-2, "hhhhh"], [4, "Y"]], 4: [[-2, "h"], [0, "hhh"]] },
}
// (as views() takes them: a grid a view and its anchor)
const gridOf = (runs) => {
  const at = Object.entries(runs).flatMap(([y, rs]) => rs.flatMap(([x, ks]) => [...ks].map((k, i) => [x + i, +y, k]))), x0 = Math.min(...at.map((q) => q[0])), y0 = Math.min(...at.map((q) => q[1]))
  const w = Math.max(...at.map((q) => q[0])) - x0 + 1, h = Math.max(...at.map((q) => q[1])) - y0 + 1, g = Array.from({ length: h }, () => Array(w).fill("."))
  for (const [x, y, k] of at) g[y - y0][x - x0] = k
  return { grid: g.map((r) => r.join("")).join("\n"), anchor: [-x0, -y0] }
}
const WOLF_FACE = Object.fromEntries(Object.entries(WOLF_RUNS).map(([v, r]) => [v, gridOf(r)]))
pal({ q: "#e0a038" })   // the wolf's eye, amber
HEADS.wolf = { slot: "head", is: "a wolf's head: a wedge, the muzzle as long as the skull, short wide-set ears, the ruff wider than the crown (a draft, its face painted by hand)", skull: WOLF,
  face: Object.fromEntries(Object.entries(WOLF_FACE).map(([v, f]) => [v, f.grid])), anchor: Object.fromEntries(Object.entries(WOLF_FACE).map(([v, f]) => [v, f.anchor])),
  // (its throat's pale fur as wide as the body under it: the line under it the ink's, a brown one there left the outline open)
  views: { jaw: ["k", "zsSL"] }, closes: true, reach: 10.5, fur: "grey", materials: { fur: "JjhHY zsSL" } }
// What makes the body under it a wolf-person with no new skeleton, each a part with its slot and what it covers (a body
// names its own; a spec can leave one out with "none"); all in the fur's keys. The legs stay the family's: a wolf's hind
// legs (the hock high, the foot long, walking on its toes) are a skeleton of their own, rig3d's legs given a third bone.
const BEAST = {
  // the tail: out behind the hips from the base of the spine and down, bushy in its middle, its tip lit. Under a drape (a
  // coat's tails, a skirt, a cloak) its root is covered and it comes out through the back below the hem's top, as through
  // a slit: it hangs low enough (its tip at the knee) to show under a cloak to mid-thigh
  tail: { wolf: { slot: "tail", is: "a wolf's tail: out from the base of the spine and down to the knee, bushy, its tip lighter; under a coat, a skirt or a cloak its root covered",
    draw: (F, B) => {
      const { j } = F, k = rOf(B).body[0] / dress.r.body[0], back = (o, d, u) => [o[0] - j.f[0] * d, o[1] - j.f[1] * d, o[2] + u]
      const a = back(j.pelvis, 2.6 * k, 0.4), b = back(a, 2.4, -2), c = back(b, 1.6, -4.4)
      return { tail: [j.limb(a, b, 1 * k, 1.8 * k, "jhH"), j.limb(b, c, 1.8 * k, 0.9, (h) => (h > 0.7 ? "hHY" : "jhH"))] }
    } } },
  // the mane: the neck's fur in a collar where it meets the shoulders, over a shirt's collar and a coat's, under the head's
  // ruff; a dark row under its edge where it lies on the cloth, strokes down its fall
  mane: { wolf: { slot: "mane", is: "a wolf's mane: the neck's fur spread over the shoulders, over the collar of what it wears", covers: ["the collar"],
    draw: (F) => ({ mane: F.wrap(F.top - 0.5, F.top + 1.4, (z) => (z < F.top ? 3 : 3 - 2.2 * (z - F.top) / 1.4),
      { paint: (h, a, out) => (!out ? "j" : h < 0.2 ? "jh" : Math.abs(Math.sin(a * 4)) < 0.25 ? "jhH" : "hHY") }) }) } },
  // paws in the hands' place: a mitten of fur a little bigger than the hand, its end (the pads, the claws) a step darker
  hands: { wolf: { slot: "hands", is: "a wolf's paws in the hands' place, furred, the pads and claws darker", covers: ["the bare hands"],
    draw: (F, B, P) => {
      const { j, R } = F
      j.arms.forEach((A, i) => {
        const far = i === F.farArm, d = unit(A.hand.map((v, e) => v - A.elbow[e])), at = (l) => A.hand.map((v, e) => v + d[e] * l)
        P[`arm${i}`][2] = j.limb(at(-0.3), at(1.8 * R.hand), R.hand * 1.05, R.hand * 1.15, (h) => (h > 0.75 ? (far ? "jj" : "jh") : dim("hHY", far)))
      })
      return {}
    } } },
}
const BEASTLY = Object.keys(BEAST)

// ---------------------------------------------------------------- the catalog and the slots
// Every slot a spec names, in the order a figure is put together; the empty ones are named for the parts to come
// (ears, horns and a muzzle on a human skull: the wolf's head carries its own; headwear on its own, what a hand holds
// and what the back carries; gloves are a piece still to make in the arms' slot). The skin is a color.
const SLOTS = ["body", "skin", "head", "ears", "horns", "muzzle", "hair", "beard", "headwear", "torso", "over", "legs", "feet", "arms", "belt", "apron", "cloak", "held", "back", "tail", "mane", "hands"]
const WEAR = ["torso", "over", "legs", "feet", "arms", "belt", "apron", "cloak"]
for (const [k, P] of Object.entries(HEADS)) P.key = k
for (const T of Object.values(BEAST)) for (const [k, P] of Object.entries(T)) P.key = k
const PARTS = { ...PIECES, ...HAIRPARTS }
// whole outfits, each a set of pieces (a spec's `outfit`; a slot it also names wins)
const OUTFITS = {
  traveler: { torso: "tunic", legs: "trousers", feet: "boots", arms: "sleeves", belt: "belt", cloak: "travel" },
  stripes: { torso: "stripes", legs: "rolled", feet: "bare", arms: "rolledup" },
  vest: { torso: "shirt", over: "vest", legs: "canvas", feet: "boots", arms: "rolledup" },
  apron: { torso: "smock", legs: "canvas", feet: "boots", arms: "rolledup", apron: "apron" },
  coat: { torso: "shirt", over: "coat", legs: "breeches", feet: "highboots", arms: "sleeves" },
  dress: { torso: "chemise", over: "bodice", legs: "skirt", feet: "shoes" },
  bare: {},
}
const parts = {
  ...Object.fromEntries(Object.entries(BODIES).map(([k, b]) => [k, { slot: "body", is: b.is }])),
  ...HEADS, ...PARTS, ...Object.fromEntries(Object.entries(BEAST).flatMap(([s, T]) => Object.entries(T).map(([k, t]) => [`${k}_${s}`, t]))),
  ...Object.fromEntries(Object.entries(OUTFITS).map(([k, o]) => [`${k}_outfit`, { slot: "outfit", is: `a whole outfit: ${Object.values(o).join(", ") || "the bare mannequin"}`, set: o }])),
}

// ---------------------------------------------------------------- a character from a spec
// spec: { body, head, hair, beard, outfit, torso, over, legs, feet, arms, belt, apron, cloak, tail, colors: { torso, trim,
// over, legs, feet, belt, apron, cloak, hat, metal, skin, hair }, seed, moves, dirs }: each slot a part's name ("none"
// leaves it empty), a whole outfit the pieces it doesn't name; with `seed` what it doesn't say is drawn (kit.random's),
// else the defaults (his body, his head and hair, his outfit's pieces; his cloak and belt only by name). `dirs` some of
// the 8 directions (the four diagonals: ["sw", "nw"], the others their mirrors). A spec that doesn't fit is refused
// with the reason. The figure is made once per body, head and pieces; the colors a swap.
const figures = new Map()
const MOVES = T.MOVES, STAND = { stand: { frames: 1, ms: 250, pose: MOVES.idle.pose } }
const partOf = (slot, name) => {
  if (name === undefined || name === "none") return undefined
  const P = slot === "head" ? HEADS[name] : BEAST[slot] ? BEAST[slot][name] : PARTS[name]
  if (!P || P.slot !== slot) throw new Error(`kit: no ${slot} '${name}' (${Object.values(parts).filter((q) => q.slot === slot && q.key).map((q) => q.key).join(", ") || "none yet"})`)
  return P
}
const fillOf = (spec) => {
  const B = body(spec.body ?? "medium"), s = { ...(spec.seed !== undefined ? randomSpec(spec.seed) : {}), ...spec }
  // (no outfit named: the traveler's pieces where the spec names none, but not his cloak and belt)
  const head = s.head ?? B.head ?? "human", set = s.outfit === undefined ? { ...OUTFITS.traveler, cloak: undefined, belt: undefined } : OUTFITS[s.outfit]
  if (!set) throw new Error(`kit: no outfit '${s.outfit}' (${Object.keys(OUTFITS).join(", ")})`)
  return { ...s, body: s.body ?? "medium", head, hair: s.hair ?? (head === "human" ? "tousled" : "none"), ...Object.fromEntries(BEASTLY.map((k) => [k, s[k] ?? B[k]])), ...Object.fromEntries(WEAR.map((k) => [k, s[k] ?? set[k]])) }
}
// what a spec wears, by slot (or the reason it can't)
const wearing = (s) => {
  for (const k of ["ears", "horns", "muzzle", "headwear", "held", "back"]) if (s[k] !== undefined && s[k] !== "none") throw new Error(`kit: the ${k} slot has no parts yet`)
  const W = Object.fromEntries([...WEAR, "hair", "beard"].map((k) => [k, partOf(k, s[k])]))
  return W
}
const character = (name, spec = {}) => {
  const s = fillOf(spec), B = body(s.body), H = partOf("head", s.head), W = wearing(s), why = check(W, H)
  if (why) throw new Error(`kit.character '${name}': ${why}`)
  const onHead = [W.hair, W.beard].filter(Boolean), moves = s.moves ? Object.fromEntries(s.moves.map((m) => [m, MOVES[m]])) : STAND
  const pieces = WEAR.map((k) => W[k]).filter(Boolean)
  for (const k of BEASTLY) W[k] = partOf(k, s[k])
  const key = JSON.stringify([B.name, H.key, onHead.map((P) => P.key), pieces.map((P) => P.key), BEASTLY.map((k) => W[k]?.key), Object.keys(moves), s.dirs])
  if (!figures.has(key)) {
    // (the cell: rig3d's, every part's box at every frame and heading; the head's reach the stand-in for the head stamped
    // by hand, so a bun, a braid or a muzzle is inside it)
    const fn = `_kf${figures.size}`, reach = Math.max(H.reach, ...onHead.map((P) => P.reach ?? 0))
    figures.set(key, { fn: own(fn), R: rig3d(fn, { ...T.FIG, w: undefined, h: undefined, pivot: undefined, body: { ...B.body, r: { ...rOf(B), head: reach } }, head: headOf(H, onHead),
      parts: worn(B, W),
      moves: Object.fromEntries(Object.entries(moves).map(([m, M]) => [m, { ...fitMove(M, B), ...(s.dirs ? { dirs: s.dirs } : {}) }])) }) })
  }
  const { R, fn } = figures.get(key), pre = fn.length, swap = swapOf(H.fur ? { fur: H.fur, ...s.colors } : s.colors, pieces, W.hair?.hat)
  const names = R.names.map((n) => { anim(name + n.slice(pre), { base: n, swap }); return name + n.slice(pre) })
  group(name, names)
  return { ...s, cell: { w: R.w, h: R.h, pivot: R.pivot } }
}

// ---------------------------------------------------------------- on the fly
// a spec drawn from a seed (hash()'s, the same every time): a body, its head, a hair that fits it (and a beard, one in
// three), a whole outfit or its pieces mixed (half of them), a cloak one in four, a color for each slot; drawn again
// (the next numbers of the same seed) until it fits, so it never makes what character() refuses
const randomSpec = (seed) => {
  let n = 0
  const r = () => hash(n++, 29, seed), pick = (list) => list[Math.floor(r() * list.length)]
  const cloth = Object.keys(RAMPS).filter((k) => RAMPS[k].length === 4), leather = ["brown", "black", "rust", "tweed"], metal = ["gold", "silver", "brass", "iron"]
  for (;;) {
    const b = pick(Object.keys(BODIES)), head = BODIES[b].head ?? "human", of = (slot) => Object.values(PARTS).filter((P) => P.slot === slot && (!P.fits || P.fits.head.includes(head))).map((P) => P.key)
    const whole = r() < 0.4, set = OUTFITS[pick(Object.keys(OUTFITS).filter((k) => k !== "bare"))], maybe = (slot, k) => (r() < k ? pick(of(slot)) : "none")
    const s = { body: b, head, hair: of("hair").length ? pick(of("hair")) : "none", beard: head === "human" && r() < 0.33 ? "full" : "none",
      ...(whole ? set : { torso: pick(of("torso")), over: maybe("over", 0.5), legs: pick(of("legs")), feet: pick(of("feet")), arms: pick(of("arms")), belt: maybe("belt", 0.4), apron: maybe("apron", 0.2) }),
      cloak: r() < 0.25 ? "travel" : "none",
      colors: { torso: pick(["white", "linen", "tweed", ...cloth]), trim: pick(cloth), over: pick(cloth), legs: pick(cloth), feet: pick(leather), belt: pick(leather), apron: pick(leather), cloak: pick(cloth), hat: pick(cloth), metal: pick(metal),
        ...(head === "wolf" ? { fur: pick(Object.keys(FURS)) } : { skin: pick(["fair", "tan", "brown", "deep"]), hair: pick(Object.keys(HAIRS)) }) } }
    if (!check(wearing(fillOf(s)), HEADS[head])) return s
  }
}
const random = (name, seed, o = {}) => character(name, { ...randomSpec(seed), ...o })

// ---------------------------------------------------------------- the blocks
// A body as flat blocks (rig3d's: the head yellow with its face red, the body orange, the right limbs light and the left
// dark), its stance the idle's first frame fitted to it: bk_<name>_stand_<dir>; a beast's muzzle, ears and tail drawn
// over them as rods in the figure's depth (the head's yellow, the face's red, the body's orange)
const blocks = (name, b) => {
  const B = body(b), BK = { head: "#f2cd3a", face: "#d8402e", body: "#e7763a" }
  const draw = (c, j) => {
    const rod = (a, z, k, w = 0.5) => { for (const o of [-w, 0, w]) for (const u of [-w, 0, w]) j.rod(a.map((v, e) => v + j.r[e] * o + (e === 2 ? u : 0)), z.map((v, e) => v + j.r[e] * o + (e === 2 ? u : 0)), k) }
    const at = (o, f, s, u) => [o[0] + j.hd.f[0] * f + j.hd.r[0] * s, o[1] + j.hd.f[1] * f + j.hd.r[1] * s, o[2] + u]
    if (B.head === "wolf") { rod(at(j.head, 1.5, 0, 0.2), at(j.head, 6.6, 0, -0.7), BK.face, 1.2); for (const s of [-2.6, 2.6]) rod(at(j.head, -1.8, s, 3.4), at(j.head, -2.6, s * 1.5, 7.4), BK.head, 0.8) }
    if (B.tail) { const back = (o, d, u) => [o[0] - j.f[0] * d, o[1] - j.f[1] * d, o[2] + u], a = back(j.pelvis, 2.6, 0.4), m = back(a, 2.4, -2); rod(a, m, BK.body, 1); rod(m, back(m, 1.6, -4.4), BK.body, 1) }
  }
  // (the cell rig3d's, but for the wolf's rods past the head's ball)
  rig3d(`_kb_${name}`, { body: B.body, ...(B.head === "wolf" ? { w: 30, h: 42, pivot: [15, 40] } : {}), blocks: `bk_${name}`, moves: { stand: { ...fitMove(STAND.stand, B), draw } } })
}

Object.assign(kit, { character, random, randomSpec, check: (spec) => { const s = fillOf(spec); return check(wearing(s), partOf("head", s.head)) }, body, blocks, parts, SLOTS, OUTFITS, KEYS, RAMPS, SKINS, HAIRS, FURS, HEADS, BEAST,
  fit: { drape: fitDrape, move: fitMove }, BODIES })

// ---------------------------------------------------------------- the library's entries
// each body as flat blocks (bk_<body>_stand_<dir>), and as the bare mannequin (mannequin_<body>_stand_<dir>): drafts
for (const b of Object.keys(BODIES)) {
  blocks(b, b)
  character(`mannequin_${b}`, { body: b, outfit: "bare", hair: "none" })
  card(`mannequin_${b}`, { is: `the kit's mannequin, ${BODIES[b].is}, bare (a draft)`, cells: { "hd2d/24ppm": "✎" },
    vary: { part: "kit.character(name, spec): a body, head, hair, beard, torso, over, legs, feet, arms, belt, apron, cloak, colors by slot (kit.parts); kit.random(name, seed); its blocks bk_" + b + "_stand_<dir>" } })
}
}
