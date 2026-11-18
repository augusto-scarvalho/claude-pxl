// A character kit for the HD-2D figures (the traveler's family: lib/characters/traveler.px.js, dress.px.js, crew.px.js):
// people made on the fly from parts on mannequins. A character is a short spec that picks a part for each slot; the
// body is numbers (the traveler's own, a dwarf, a tall one, a beast-headed one with a tail); what it wears is worn: a
// bare mannequin (the body in plain underclothes) and over it each garment a layer of its own, a little thicker than
// what it lies on, its edges showing (a collar, a cuff, a hem, a waistband); the pieces mix by rule (each its slot, its
// layer, what it needs and what it excludes, its own colors). Its head modeled (a skull, the hair, a beard) and baked
// once per view, a face painted over it by hand (the approved one unless the spec names another) with what each part
// paints there. New art is a draft (✎).
// Taken with include("<path>/lib/characters/kit.px.js", { as: "kit", palette: true });
// examples/hd2d/character_kit.px.js shows people made from specs alone.
//   kit.character("sai", { hair: "bandana", torso: "stripes", legs: "rolled", feet: "bare", colors: { hair: "dark" } })
//   kit.character("bruni", { body: "short", hair: "ring", beard: "full", torso: "shirt", over: "vest", legs: "canvas",
//     feet: "boots", belt: "belt", colors: { over: "rust", legs: "slate", skin: "tan", hair: "ginger" } })
//   kit.character("hulda", { body: "short", hair: "braid", headwear: "kettle", torso: "smock", legs: "skirt", feet: "boots",
//     colors: { helm: "bronze", torso: "teal" } })
//   kit.character("edric", { hair: "short", torso: "shirt", legs: "trousers", feet: "boots", held: "sword", off: "roundshield",
//     hip: "scabbard", back: "quiver", colors: { face: "teal", fit: "iron" } })
//   kit.character("wenna", { face: "freckled_f", hair: "twotails", torso: "chemise", over: "bodice", legs: "skirt", feet: "shoes",
//     colors: { hair: "auburn", eyes: "green" } })
//   kit.random("someone", 7)
// Each makes <name>_stand_<dir> in the profile's 8 directions (the idle's first frame; `moves: ["idle", "walk"]` the
// traveler's moves instead, fitted to the body) and a group <name>, and gives back its spec with the figure's cell
// ({ w, h, pivot }). kit.parts is the catalog, kit.check(spec) the reason a spec doesn't fit (or nothing), kit.body(preset |
// numbers) a mannequin, kit.blocks(name, body) its flat blocks (bk_<name>_<move>_<dir>), kit.head(name, spec) a head alone in
// its colors (<name>_<dir>), kit.HATS the headwear (each its rules: what of the hair it covers, what it does to the face,
// the heads it fits, its layer, its materials), kit.FACES the faces (each its views painted by hand; kit.EYES the eyes'
// colors), kit.THINGS what a hand holds and the hip and the back carry (each its slots, the hands it takes, its grip, its
// size by the body, what it excludes, its materials), kit.thing(name, key) one alone as it is held.
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
  // what of the headwear lies on the body: a hood's cowl, the hood down, a coif's skirt (over the collar and the mane)
  if (W.headwear?.body) Object.assign(P, HWBODY[W.headwear.body](F))
  // what of the hair and the beard falls past the head: down the back, down the chest
  for (const s of ["hair", "beard"]) if (W[s]?.body) Object.assign(P, W[s].body(F, B))
  // what it holds and carries, on what it wears
  if (THING_SLOTS.some((s) => W[s])) Object.assign(P, carried(F, W, B, P))
  return P
}
// (z's share of the way from a to b, 0 to 1)
const share = (z, a, b) => Math.max(0, Math.min(1, (z - a) / (b - a)))
const HWBODY = {
  // the hood's cowl: from round the neck, where the hood closes under the chin, out over the shoulders and the cloak,
  // its hem in shade, two folds a side
  cowl: (F) => ({ cowl: F.wrap(F.top - 1.8, F.top + 1.2, (z) => 5.6 - 4.6 * share(z, F.top - 1.8, F.top + 1.2),
    { paint: (h, a, out) => (!out ? HK[0] : h < 0.14 ? HK.slice(0, 2) : Math.abs(Math.abs(a) - 1.1) < 0.1 || Math.abs(Math.abs(a) - 2.2) < 0.1 ? HK.slice(0, 3) : HK) }) }),
  // the hood down: a collar of its cloth round the neck, its rolled edge lit, and behind it the hood's bag on the upper
  // back, its mouth dark where it opens upward
  down: (F) => ({ hooddown: F.wrap(F.top - 3.6, F.top + 1.1, (z, a) => 3.6 + (Math.abs(a) > 1.9 ? 2.6 * Math.sin(Math.PI * share(z, F.top - 3.6, F.top + 1.1)) : 0),
    { keep: (h, a) => h > 0.55 || Math.abs(a) > 2.05, paint: (h, a, out) => (!out ? HK[0] : h > 0.9 ? (Math.abs(a) > 2.2 ? HK.slice(0, 2) : HK.slice(1)) : h < 0.08 ? HK.slice(0, 2) : HK) }) }),
  // a coif's skirt: from under its round the neck out over the collar to the shoulders, a seam at its hem
  skirt: (F) => ({ coifskirt: F.wrap(F.top - 2.4, F.top + 1.3, (z) => 5.2 - 4 * share(z, F.top - 2.4, F.top + 1.3), { paint: (h, a, out) => (!out ? HK[0] : h < 0.14 ? HK.slice(0, 2) : HK) }) }),
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
  // what the hands hold and the back carries: a two-handed thing leaves the other hand empty; a thing's own exclusions
  for (const s of THING_SLOTS) {
    const P = W[s], o = s === "held" ? "off" : "held"
    if (!P) continue
    if (P.hands === 2 && W[o]) return `the ${s} '${P.key}' takes both hands (${P.why2}): the ${o} hand can't hold the '${W[o].key}' too; leave it empty (${o}: "none")`
    for (const q of P.excl ?? []) if (worn.some((w) => w.key === q)) return `the ${s} '${P.key}' can't be carried with the ${(HATS[q] ?? PARTS[q] ?? THINGS[q]).slot} '${q}': ${P.why}; leave one out`
  }
  for (const P of [W.face, W.hair, W.beard, W.headwear].filter(Boolean)) if (P.fits && !P.fits.head.includes(H.key)) return `the ${P.slot} '${P.key}' fits the head ${P.fits.head.join(", ")}, not '${H.key}'${P.slot === "headwear" ? `: ${P.wolfWhy}; on the ${H.key}'s: ${Object.values(HATS).filter((q) => q.fits.head.includes(H.key)).map((q) => q.key).join(", ")}` : `: ${WHY_HEAD[P.slot]}`}`
  // the headwear and the hair: a hair with its hat welded on takes no other; a bun, a tail or a braid the piece can't take
  const P = W.headwear, hair = W.hair
  if (P && hair?.covers?.includes("headwear")) return `the hair '${hair.key}' has its hat on it (the crew's, welded): wear the hair 'short' (or another) under the headwear '${P.key}'`
  if (P && W.beard?.wide && P.jaw) return `the headwear '${P.key}' closes round the face over the jaw: the beard '${W.beard.key}' would lie under its edge; beards that go with it: ${Object.values(HAIRPARTS).filter((q) => q.slot === "beard" && !q.wide).map((q) => q.key).join(", ")}`
  if (P && hair?.tie && !P.lets.includes(hair.tie)) return `the headwear '${P.key}' covers ${P.covers}: a ${{ hightail: "high tail", tails: "pair of tails" }[hair.tie] ?? hair.tie} can't go under it (${WHY_TIE[hair.tie] ?? P.whyNot}); hairs that go under it: ${Object.values(HAIRPARTS).filter((q) => q.slot === "hair" && q.fits.head.includes(H.key) && !q.covers && (!q.tie || P.lets.includes(q.tie))).map((q) => q.key).join(", ")}`
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
// what a hair has that stands out from the head (a hat lets it out behind, or under it, or not): a bun, a tail, a braid;
// and how far it stands off the skull at the brow's height (px), where a ring sits on it
Object.assign(HAIRPARTS.bun, { tie: "bun", bulk: 0.5 }); Object.assign(HAIRPARTS.braid, { tie: "braid", bulk: 0.6 }); Object.assign(HAIRPARTS.tied, { tie: "tail", bulk: 0.4 })
Object.assign(HAIRPARTS.tousled, { bulk: 0.8 }); Object.assign(HAIRPARTS.ring, { bulk: 0 })
// the crew's short hair alone (worn under its flat cap: the cap's brow and brim its own, the side locks the hair's)
HAIRPARTS.short = { slot: "hair", key: "short", is: "the crew's short hair, close on the skull (the one under its flat cap)", field: C.SHORT, paint: delta(C.FACES.fc, C.ANCHORS.fc, (y) => y >= 1), reach: 6.5, bulk: 0.5, fits: { head: ["human"] }, materials: HAIR }

// ---------------------------------------------------------------- the face
// A face is a part of its own (the `face` slot), so any face goes with any hair, beard and headwear that fits: its eyes
// (the lids `k` over the white `G` and the iris `E`, its lighter under `e`; an eye color is the iris's own two tones,
// `colors.eyes`), its brows, nose (the skin's lightest), mouth and marks, painted by hand per view over the bake in the
// family's technique (cut from the approved hand faces), a grid a view about the head's middle: s, sw and w (the east
// views their mirrors, as the head's; turned away, nw and n, no face shows). Its rows: the brows' 0, the lids 1, the eyes
// 2, the nose 3, the mouth 4, the chin 5; a grid's first row is -1, the forehead's (a heavy brow, a scar, a line). The
// approved face is the first; a spec that names none wears it as it always was, the hairs' and beards' paint over it as
// it was. Another face's pixels show where the approved one's do, and past them only on the skin the bake shows (a ray
// through the pixel meets the skull before the hair or the beard); its eyes always (no hair or beard paints over an eye:
// nothing over the eyes), its brows and marks over what a hair paints there in skin. Brows are in the hair's keys: they
// go grey with it. What differs in a woman's face in the family (lashes at the lids' outer ends, a fuller lower lip, a
// narrower chin) is a cut of each face (`<face>_f`), the face's choice, not the body's.
const FA = { s: [7, 1], sw: [8, 1], w: [6, 1] }, EYE = "EeG", SKINK = "zsSL"
const faceOf = (views, anchor = FA) => ({ views, anchor })
// the eye's cells of a face: its iris, its white, and its lids (the `k` of the lids' and the eyes' rows)
const eyeCells = (F) => new Set([...F].filter(([p, k]) => EYE.includes(k) || (k === "k" && +p.split(",")[1] >= 1 && +p.split(",")[1] <= 2)).map(([p]) => p))
const FACES = {
  plain: { is: "the approved hand face (the traveler's, the mourner's): the lids dark over the white and the iris, the nose the skin's lightest, a mouth", approved: true, ...faceOf(T.FACE, FACE_A) },
  // young and soft: the iris two rows tall (big eyes), no line under them, a small mouth, round cheeks a step lit
  young: { is: "young and soft: big eyes (the iris two rows), the cheeks round and lit, a small mouth", ...faceOf({
    s: `
      ...............
      ....SS...SS....
      ...SkkSSSkkS...
      ...SGESSSEGS...
      ...SGeSLSeGS...
      ....SSSzSSS....`,
    sw: `
      ................
      ...SSSSSS.......
      ...SkSSkk.......
      ....ESSEG.s.....
      ....eLLeG.z.....
      .....SzSS.......`,
    w: `
      .................
      ...SSS...........
      ..SkkSSs.........
      ..SEGSSzs........
      kSLeGSss.........
      ...SSSs..........
      ....zss..........` }) },
  // stern: heavy brows low over the lids, their inner ends down (the hair's dark), a crease between them, the lids
  // heavy over a narrow white, a set mouth three px wide, the nose's shade under it
  stern: { is: "stern: heavy brows low over the eyes, a crease between them, a set mouth", ...faceOf({
    s: `
      ...j.......j...
      ....jj.z.jj....
      ...SkkSSSkkS...
      ...SzESSSEzS...
      ...sSSSLSSSs...
      ....sSzzzSs....`,
    sw: `
      ...j.....j......
      ....jj.jj.......
      ...SkSSkk.......
      ....ESSEz.s.....
      ....SLLzS.z.....
      .....zzSs.......`,
    w: `
      ....j............
      ..jjSS...........
      ..SkkSSs.........
      ..SEzSSzs........
      kSLSSSss.........
      ..zzSss..........
      ....zss..........` }) },
  // old: brows gone pale (the hair's light, grey with it), the lids heavy, a line at each eye's outer corner, the cheeks
  // fallen under the eyes, a line from the nose to each corner of a thin mouth
  old: { is: "old: pale brows, lines at the eyes' corners and from the nose to the mouth, a thin mouth", ...faceOf({
    s: `
      ...............
      ....HH...HH....
      ...SkkSSSkkS...
      ...zGESSSEGz...
      ...ssSSLSSss...
      ....zSSzSSz....`,
    sw: `
      ................
      ...HHSSHH.......
      ...SkSSkk.......
      ....ESSEGz.s....
      ....sLLss.z.....
      .....zzSz.......`,
    w: `
      .................
      ..HHS............
      ..SkkSSs.........
      ..SEGzSzs........
      kSLszSss.........
      ..zSSss..........
      ...zzss..........` }) },
  // scarred: a scar down through the brow and on under the eye (the eye whole between): its tissue the skin's lightest, a
  // line of its dark along it
  scarred: { is: "scarred: a pale scar through the brow and on down the cheek under the eye", ...faceOf({
    s: `
      .....zL........
      ...zL....SS....
      ...SkkSSSkkS...
      ...SGESSSEGS...
      ...szLSLSSSs...
      ...zLSSzSSs....`,
    sw: `
      ........zL......
      ...SSSSzL.......
      ...SkSSkk.......
      ....ESSEG.s.....
      ....SLLezL......
      .....SzSz.......`,
    w: `
      ....zL...........
      ...zL............
      ..SkkSSs.........
      ..SEGSSzs........
      kSLSzLss.........
      ...SzSs..........
      ....zss..........` }) },
  // freckled: a scatter of the skin's dark over the nose's bridge and the cheeks under the eyes
  freckled: { is: "freckled: freckles over the nose and the cheeks", ...faceOf({
    s: `
      ...............
      ....SS...SS....
      ...SkkSSSkkS...
      ...SGESSSEGS...
      ...szsSLSszs...
      ....sSszsSs....`,
    sw: `
      ................
      ...SSSSSS.......
      ...SkSSkk.......
      ....ESSEG.s.....
      ....zLseszz.....
      .....SzSs.......`,
    w: `
      .................
      ...SSS...........
      ..SkkSSs.........
      ..SEGSSzs........
      kSLszsss.........
      ...SsSs..........
      ....zss..........` }) },
}
// a woman's cut of a face, by view: a lash at each lid's outer end, the lower lip a step lit under the mouth, the chin a
// px narrower (its corners in the jaw's dark)
const FEM = {
  s: `
    ...............
    ...k.......k...
    ...............
    ...............
    ...............
    ....D.....D....
    .......L.......`,
  sw: `
    ................
    .........k......
    ................
    ................
    ................
    ................
    ......L.........`,
  w: `
    .................
    ..k..............
    .................
    .................
    .................
    .................
    ...L.............`,
}
// (a face's grid with another's cells over it, at the same anchor)
const over = (a, b) => { const A = rowsOf(a), B = rowsOf(b); return Array.from({ length: Math.max(A.length, B.length) }, (_, y) => Array.from({ length: Math.max(A[0].length, B[0].length) }, (_, x) => (B[y]?.[x] && B[y][x] !== "." ? B[y][x] : A[y]?.[x] ?? ".")).join("")).join("\n") }
for (const k of Object.keys(FACES)) if (!FACES[k].approved) FACES[`${k}_f`] = { is: `${FACES[k].is}; a woman's cut: lashes, the lower lip, a narrower chin`, ...faceOf(Object.fromEntries(Object.entries(FACES[k].views).map(([v, g]) => [v, over(g, FEM[v])]))) }
for (const [k, P] of Object.entries(FACES)) Object.assign(P, { key: k, slot: "face", fits: { head: ["human"] }, materials: { skin: "zsSL", eyes: "Ee", brows: "JjhHY" } })
// why a human face, hair or beard has no place on the wolf's head
const WHY_HEAD = { face: "a face is painted over its own head's eyes, nose and mouth: the human faces on the human skull, the wolf's on its muzzle", hair: "a hair is modeled on the human skull: the wolf's ears stand where it lies, its fur is its hair",
  beard: "a beard grows on a human jaw: the wolf's muzzle and ruff are where it would hang" }
// the eyes' colors: the iris's dark and its lighter under, and the wolf's (one bright tone); unsaid, the approved blue
const EYES = {
  blue: ["#1f2f55", "#3a6aa2", "#8ab8e8"], brown: ["#2e1a12", "#6a3e22", "#c07a34"], green: ["#173a26", "#3a7a4a", "#8ccf6a"],
  grey: ["#2c3238", "#66727c", "#b4c0c8"], amber: ["#4a2a0c", "#a8681c", "#e0a038"],
}

// the new hairs' and beards' paint over the approved face: its cells (but the eyes) where a ray meets the part before the
// skull left to the bake, and the hand's marks over that (a mouth in a beard, a lock); a part with its own grids keeps them.
// A beard's from the nose's row down (`from` its first row), never the nose
const coverOf = (P) => P.painted ?? (P.painted = Object.fromEntries(Object.keys(T.FACE).map((v) => {
  const A = cells(T.FACE[v], FACE_A[v]), eye = eyeCells(A), m = new Map(), from = P.slot === "beard" ? P.from ?? 3 : -9
  for (const [p, k] of A) { const [x, y] = p.split(",").map(Number); if (eye.has(p) || y < from || (P.slot === "beard" && k === "L")) continue; if (rayOf(v, x, y, T.SKULL, P.field).on === "hat") m.set(p, ",") }
  for (const [p, k] of P.marks?.[v] ? cells(P.marks[v], FA[v]) : []) m.set(p, k)
  return [v, m]
})))
const paintIn = (P, v) => (P.cover ? coverOf(P)[v] : P.paint?.[v]) ?? []
// a strand's paint for long hair: a parting from the brow back over the crown, the locks down the back a darker strand
// between (the crew's braid's)
const STRANDS = (q) => (Math.abs(q[0]) < 0.45 && q[1] > -3.5 && q[2] > 2.5 ? "Jjh" : q[1] < -1 && ((((Math.atan2(q[0], -q[1]) * 5) / Math.PI) % 1) + 1) % 1 < 0.2 ? "Jjh" : "JjhH")
const FACECUT = sdf.ellipsoid([4, 4.8, 4.6]).at(0, 4.2, -1.4)
// (the solid above a hairline: z over k px a px ahead less c, so the hair's edge runs from the brow down past the ears
// to the nape)
const hairline = (k, c) => sdf.plane(unit([0, k, -1]), c / Math.hypot(k, 1))
// (a point in the head's frame on the figure: px ahead, to its right and up from the head's middle)
const atHead = (j, f, s, u) => [0, 1, 2].map((e) => j.head[e] + j.hd.f[e] * f + j.hd.r[e] * s + (e === 2 ? u : 0))
// (a strand's dark down a drape of hair, by its angle round the body)
const FALL = (h, a, out) => (!out ? "J" : h < 0.06 ? "Jj" : (((a * 6) / Math.PI) % 1 + 1) % 1 < 0.22 ? "Jjh" : "JjhH")
// the new hairs, each modeled on the skull's way (fields in the head's frame), its cut and fall its own; `tie` what
// stands out of it (a hat lets it out or refuses it), `bulk` how far it stands off the skull at the brow; what falls past
// the head (down the back) a part of the figure (`body`), behind the trunk where the trunk is nearer
const DRAWN = sdf.ellipsoid([5, 5.45, 5.4]).at(0, -0.4, 0.6).subtract(sdf.ellipsoid([4.4, 4.6, 4.7]).at(0, 4.4, -1.4), sdf.plane([0, -0.55, 0.83], -1.6), { smooth: 0.4 })
// (drawn back: lines from the brow to where it is tied)
const COMBED = (to) => (q) => (Math.abs(((Math.atan2(q[0], q[1] - to[1]) * 4) / Math.PI) % 1) < 0.16 ? "Jjh" : "JjhH")
// spiky hair's points, each a cone (a capsule to a 0.2 px tip) rooted deep in the mass, by its tip, its radius at the
// root and where it grows from: the crown's and the sides' stand off the head (their root on the line from the tip to a
// point ahead of the head's middle: up and back on the crown, out and back past the ears), the tops' longest (3 px past
// the mass); the back's lie along it from the whorl behind the crown, fanning down and out to the nape like shingles; the
// fringe's three from the hairline down and forward over the brow, their tips on the row over the lids
const SPIKE = (from, k, r) => ([t, s = r]) => sdf.capsule(t.map((v, e) => from[e] + (v - from[e]) * k), t, s, 0.22)
const SPIKES = [
  ...[[[-2.6, 0.9, 8.4]], [[2.7, 0.2, 8.2]], [[-0.3, -2.6, 8.5], 1.95], [[-5.3, -2.4, 6.9], 1.6], [[5.3, -2.4, 6.9], 1.6], [[-6.3, -3.4, 1.6], 1.4], [[6.3, -3.4, 1.6], 1.4]].map(SPIKE([0, 0.6, 0.4], 0.32, 1.75)),
  ...[[[0.3, -7.2, 4.6]], [[-5.3, -6.7, 2]], [[5.3, -6.7, 2]], [[-3, -7.9, -1.3]], [[3, -7.9, -1.3]], [[-6.2, -4.8, -2.4], 1.35], [[6.2, -4.8, -2.4], 1.35], [[-1.6, -5.4, -4.4], 1.3], [[1.6, -5.4, -4.4], 1.3]].map(SPIKE([0, -1.6, 3.8], 0.3, 1.6)),
  ...[[[-2.3, 2.9, 4.6], [-2.9, 5.1, 2.1]], [[0.5, 3.2, 4.8], [0.7, 5.5, 2.2]], [[2.9, 2.6, 4.4], [3.5, 4.8, 2.2]]].map(([a, b]) => sdf.capsule(a, b, 1.15, 0.12))]
// (a spike's paint: the mass between them the ramp's dark three, a spike the light four (its highlight only on the top
// third), a valley where two meet the darkest two)
const SPIKE_PAINT = (q) => {
  let a = 9, b = 9
  for (const S of SPIKES) { const d = S.dist(q); if (d < a) { b = a; a = d } else if (d < b) b = d }
  return a > 0.35 ? "Jjh" : b - a < 0.4 ? "Jj" : q[2] > 2 ? "jhHY" : "JjhH"
}
Object.assign(HAIRPARTS, {
  cropped: { slot: "hair", is: "cropped close: a shadow of hair on the skull, its line clean at the brow, the temples and the nape", bulk: 0.15, reach: 6.5, cover: true,
    field: sdf.ellipsoid([4.85, 5.25, 5.5]).at(0, -0.15, 0.1).intersect(hairline(0.6, 2.2)).noise({ amp: 0.12, scale: 1.4, seed: 35 })
      .paint((q) => ((Math.floor(q[0] * 1.6) + Math.floor(q[1] * 1.6) + Math.floor(q[2] * 1.6)) % 2 ? "Jjh" : "jhH")) },
  spiky: { slot: "hair", is: "short and spiky: points standing up and back off the crown, out and back past the ears, down at the nape, three over the brow", bulk: 0.9, reach: 9.5, cover: true,
    field: sdf.union(sdf.ellipsoid([4.95, 5.35, 5.4]).at(0, -0.3, 0.3).intersect(hairline(0.55, 2)).subtract(sdf.ellipsoid([4.25, 4.6, 4.4]).at(0, 4.5, -1.2), { smooth: 0.3 }),
      ...SPIKES, { smooth: 0.3 }).paint(SPIKE_PAINT) },
  sidepart: { slot: "hair", is: "short with a side part: parted over the right eye, the fringe swept across the brow to the left", bulk: 0.6, reach: 7, cover: true,
    field: sdf.union(sdf.ellipsoid([5.15, 5.5, 5.4]).at(0, -0.3, 0.4).intersect(hairline(0.5, 2.4)), sdf.capsule([-1.4, 3.8, 4.2], [3.3, 4.1, 2.2], 1.25, 0.85), { smooth: 0.8 })
      .subtract(sdf.capsule([-1.9, 4.8, 4.6], [-2.1, -2.4, 5.6], 0.42)).noise({ amp: 0.3, scale: 1.1, seed: 37 })
      .paint((q) => (q[0] < -1.3 && q[0] > -2.6 && q[2] > 3.6 ? "Jjh" : q[2] > 2 && q[1] > 2 && Math.floor((q[0] + 2) * 0.9) % 2 ? "jhH" : "JjhH")) },
  bob: { slot: "hair", is: "a bob: to the jaw all round, cut straight, a straight fringe to the brow", closes: true, bulk: 1, reach: 7.5, cover: true,
    field: sdf.ellipsoid([5.5, 5.85, 5.4]).at(0, -0.4, 0.3).intersect(sdf.plane([0, 0, -1], 4.6)).subtract(sdf.ellipsoid([4.25, 4.8, 3.7]).at(0, 4.6, -2.6), { smooth: 0.3 })
      .noise({ amp: 0.2, scale: 1.2, seed: 38 }).paint((q) => (Math.abs(((Math.atan2(q[0], q[1]) * 5) / Math.PI) % 1) < 0.14 && q[2] < 2 ? "Jjh" : "JjhH")) },
  loose: { slot: "hair", is: "long and loose to the shoulders: parted in the middle, falling past the jaw at the sides and down the back in locks", closes: true, bulk: 0.7, reach: 10.5, cover: true,
    field: sdf.ellipsoid([5.2, 5.6, 5.2]).at(0, -0.5, 0.9).union(sdf.ellipsoid([4.9, 3.3, 4.6]).at(0, -2.5, -2.6), ...[-1, 1].map((s) => sdf.capsule([s * 4.4, 1.2, 1.4], [s * 4.8, -0.2, -6.6], 1.25, 1.35)), { smooth: 1 })
      .subtract(FACECUT, { smooth: 0.4 }).noise({ amp: 0.45, scale: 1.1, seed: 31 }).paint(STRANDS) },
  longback: { slot: "hair", is: "long and straight down the back: parted in the middle, behind the ears, falling straight to the shoulder blades", bulk: 0.7, reach: 9, cover: true,
    field: sdf.ellipsoid([5.2, 5.6, 5.2]).at(0, -0.5, 0.9).union(sdf.ellipsoid([4.7, 3, 4.4]).at(0, -2.8, -2.6), ...[-1, 1].map((s) => sdf.capsule([s * 4.3, -1, 1], [s * 4.1, -2.2, -5.6], 1.1, 1.2)), { smooth: 1 })
      .subtract(FACECUT, { smooth: 0.4 }).noise({ amp: 0.35, scale: 1.1, seed: 39 }).paint(STRANDS),
    body: (F) => ({ hairback: F.wrap(F.top - 6.5, F.top + 1.4, 4.7, { keep: (h, a) => Math.abs(a) > 2.2, paint: FALL }) }) },
  ponytail: { slot: "hair", is: "a high ponytail: drawn back smooth from the brow, tied high at the back of the crown, the tail falling to the nape", tie: "hightail", bulk: 0.4, reach: 10, cover: true,
    field: sdf.union(DRAWN.noise({ amp: 0.25, scale: 1.3, seed: 32 }).paint(COMBED([0, -5.4, 3.4])),
      sdf.ellipsoid([1.15, 0.9, 1.15]).at(0, -5.5, 3.5).mat("Jj").part("tie"),
      sdf.capsule([0, -6.1, 3.6], [0, -8.1, 1.2], 1.2, 1.65).union(sdf.capsule([0, -8.1, 1.2], [0, -7.4, -4.2], 1.65, 0.5), { smooth: 0.8 }).noise({ amp: 0.2, scale: 1.2, seed: 33 }).mat("JjhHY").part("tail")) },
  twotails: { slot: "hair", is: "two tails: parted in the middle, drawn to each side, tied behind the ears, the tails hanging past the jaw", tie: "tails", bulk: 0.4, reach: 10, cover: true,
    field: sdf.union(DRAWN.noise({ amp: 0.25, scale: 1.3, seed: 40 }).paint((q) => (Math.abs(q[0]) < 0.45 && q[2] > 2.5 ? "Jjh" : "JjhH")),
      ...[-1, 1].flatMap((s) => [sdf.ellipsoid([1, 1.05, 1.05]).at(s * 4.6, -2.6, -1.2).mat("Jj").part(`tie${s}`),
        sdf.capsule([s * 5, -2.9, -1.8], [s * 5.6, -3.2, -6.6], 1.35, 0.55).noise({ amp: 0.2, scale: 1.2, seed: 41 }).mat("JjhH").part(`tail${s}`)])) },
  curls: { slot: "hair", is: "big curls: a mass of round curls standing off the head to the jaw, the brow clear", closes: true, bulk: 1.4, reach: 9, cover: true,
    field: sdf.union(sdf.ellipsoid([5.3, 5.6, 5.3]).at(0, -0.6, 0.8), ...[...Array(34).keys()].map((i) => {
      // (the curls on a shell round the head, a golden-angle spiral, none over the face)
      const t = (i + 0.5) / 34, el = Math.asin(1 - 1.62 * t), az = i * 2.39996, q = [Math.cos(el) * Math.sin(az) * 5.6, -0.6 + Math.cos(el) * Math.cos(az) * 5.9, 0.6 + Math.sin(el) * 5.4]
      return q[1] > 1.6 && q[2] < 3.4 ? sdf.sphere(0.1).at(0, -20, 0) : sdf.sphere(1.75).at(...q)
    })).subtract(sdf.ellipsoid([4.2, 4.8, 4.6]).at(0, 4.4, -1.6), { smooth: 0.3 }).mat("JjhHY") },
  crest: { slot: "hair", is: "a crest: the sides shaved, a ridge of hair standing from the brow over the crown to the nape", tie: "crest", bald: true, bulk: 0, reach: 9.5, cover: true,
    field: sdf.union(sdf.ellipsoid([1.35, 5.8, 3.4]).at(0, -0.6, 5), sdf.capsule([0, -4.4, 2.6], [0, -5.4, -2.4], 1.3, 0.9), ...[2.6, 0.4, -1.8, -3.8].map((y, i) => sdf.capsule([0, y, 5.4 - Math.abs(y + 0.6) * 0.3], [0, y - 0.8, 7.3 - Math.abs(y + 0.6) * 0.45], 0.9, 0.3)), { smooth: 0.6 })
      .noise({ amp: 0.15, scale: 1.2, seed: 42 }).mat("JjhHY") },
  topknot: { slot: "hair", is: "a topknot: drawn back smooth from the brow and tied in a knot on the crown", tie: "topknot", bulk: 0.4, reach: 9.5, cover: true,
    field: sdf.union(DRAWN.noise({ amp: 0.25, scale: 1.3, seed: 43 }).paint(COMBED([0, -1.2, 6])),
      sdf.ellipsoid([1.4, 1.3, 0.6]).at(0, -1.1, 5.5).mat("Jj").part("band"), sdf.ellipsoid([1.8, 1.7, 1.5]).at(0, -1.2, 6.8).noise({ amp: 0.15, scale: 1, seed: 44 }).mat("JjhHY").part("knot")) },
  lowtie: { slot: "hair", is: "long, tied low at the nape: drawn back over the ears, the tail falling down the back", tie: "tail", bulk: 0.4, reach: 8.5, cover: true,
    field: sdf.union(DRAWN.noise({ amp: 0.25, scale: 1.3, seed: 45 }).paint(COMBED([0, -5.4, -2.4])), sdf.ellipsoid([1.2, 1, 1.1]).at(0, -5.4, -2.2).mat("Jj").part("tie"),
      sdf.capsule([0, -5.9, -2.8], [0, -6.3, -6.2], 1.2, 1.15).mat("JjhH").part("tail")),
    body: (F) => ({ hairtail: F.j.limb(atHead(F.j, -6.2, 0, -5.6), [F.j.chest[0] - F.j.f[0] * 5.2, F.j.chest[1] - F.j.f[1] * 5.2, F.top - 7], 1.15, 0.6, (h) => (h > 0.92 ? "Jjh" : "JjhH")) }) },
  receding: { slot: "hair", is: "receding: short, the hairline gone back from the temples, thin over the brow", bulk: 0.4, reach: 6.5, cover: true,
    field: sdf.ellipsoid([5, 5.35, 5.35]).at(0, -0.3, 0.3).intersect(hairline(0.6, 1)).subtract(...[-1, 1].map((s) => sdf.ellipsoid([1.9, 2.4, 2.4]).at(s * 2.3, 3.6, 3.4)), { smooth: 0.5 })
      .noise({ amp: 0.3, scale: 1.1, seed: 46 }).mat("JjhH") },
  // ---- beards: each in the head's frame, its size the head's (on the dwarf's head as on any: a beard is a head's, not a
  // body's, so on him it is as big as on a man and reads bigger); what hangs past the chin down the chest a part of the
  // figure (`body`), its length the body's (to the chest, to the belt); the face's cells it covers left to the bake (from
  // the nose's row down; the eyes and the nose never) and the mouth painted in it by hand; `wide` a beard over the jaw's
  // sides (a coif or a headscarf closing round the face takes none of those)
  stubble: { slot: "beard", is: "stubble: a few days' growth, the jaw and the chin and the upper lip a shadow of the hair's dark over the skin", bulk: 0, reach: 6.5, cover: true,
    field: sdf.ellipsoid([4.75, 5.15, 5.45]).intersect(sdf.plane([0, 0, 1], -1.9), sdf.plane([0, -1, 0], 0.6)).paint((q) => (q[2] < -4.4 || (Math.floor(q[0] * 1.7) + Math.floor(q[2] * 1.7)) % 2 ? "jh" : "zs")),
    marks: { s: `
      ...............
      ...............
      ...............
      ...............
      ...............
      ......jzj......`, sw: `
      ................
      ................
      ................
      ................
      ................
      .....jz.........`, w: `
      .................
      .................
      .................
      .................
      .................
      ..jz.............` } },
  mustache: { slot: "beard", is: "a mustache: over the upper lip, its ends drooping past the mouth's corners", bulk: 0, reach: 6.5, cover: true,
    field: sdf.union(sdf.capsule([-0.2, 4.95, -2.3], [-1.7, 4.6, -2.9], 0.6, 0.42), sdf.capsule([0.2, 4.95, -2.3], [1.7, 4.6, -2.9], 0.6, 0.42)).mat("JjhH"),
    marks: { s: `
      ...............
      ...............
      ...............
      ...............
      ...............
      .....jhhhj.....
      ....j..z..j....`, sw: `
      ................
      ................
      ................
      ................
      ................
      ....jhhhj.......
      .....j.z.j......`, w: `
      .................
      .................
      .................
      .................
      .................
      .jhh.............
      .j..z............` } },
  goatee: { slot: "beard", is: "a mustache and a goatee: the mustache over the lip, a pointed tuft on the chin under the mouth", bulk: 0, reach: 7.5, cover: true,
    field: sdf.union(sdf.capsule([-0.2, 4.95, -2.3], [-1.7, 4.6, -2.9], 0.6, 0.42), sdf.capsule([0.2, 4.95, -2.3], [1.7, 4.6, -2.9], 0.6, 0.42), sdf.capsule([0, 4.3, -4.2], [0, 3.7, -6.4], 1, 0.4)).mat("JjhH"),
    marks: { s: `
      ...............
      ...............
      ...............
      ...............
      ...............
      .....jhhhj.....
      ....j.jzj.j....
      ......jhj......`, sw: `
      ................
      ................
      ................
      ................
      ................
      ....jhhhj.......
      .....jjzj.......
      ......jhj.......`, w: `
      .................
      .................
      .................
      .................
      .................
      .jhh.............
      .j..z............
      .jh..............` } },
  boxed: { slot: "beard", is: "a short boxed beard: from the cheekbones down, trimmed square at the jaw, the mouth showing in it", closes: true, wide: true, bulk: 0, reach: 7, cover: true,
    field: sdf.ellipsoid([4.7, 4.5, 3.4]).at(0, 1.3, -3.3).intersect(sdf.plane([0, 0, 1], -1.6), sdf.plane([0, -1, 0], 0.4), sdf.plane([0, 0, -1], 6.3))
      .union(sdf.capsule([-1.6, 4.7, -2.5], [1.6, 4.7, -2.5], 0.6), { smooth: 0.5 }).noise({ amp: 0.2, scale: 0.9, seed: 34 }).mat("JjhH"),
    marks: { s: `
      ...............
      ...............
      ...............
      ...............
      ...............
      ......hzh......`, sw: `
      ................
      ................
      ................
      ................
      ................
      .....hz.........`, w: `
      .................
      .................
      .................
      .................
      .................
      ...zh............` } },
  long: { slot: "beard", is: "a long beard: the full beard grown down over the chest in a wedge", closes: true, wide: true, bulk: 0, reach: 9, cover: true,
    field: sdf.union(C.BEARD, sdf.capsule([0, 2.5, -5.6], [0, 1.9, -7.6], 1.9, 0.8).noise({ amp: 0.2, scale: 0.9, seed: 48 }).mat("JjhH")), marks: { s: `
      ...............
      ...............
      ...............
      ...............
      ...............
      ......jzj......`, sw: `
      ................
      ................
      ................
      ................
      ................
      .....jz.........`, w: `
      .................
      .................
      .................
      .................
      .................
      ...zj............` },
    body: (F) => ({ beardfront: F.j.limb(atHead(F.j, 2.4, 0, -5.4), [0, 1].map((e) => F.j.chest[e] + F.j.f[e] * (F.trunk(F.top - 5.2, 0, 3) + 1)).concat(F.top - 5.2), 2.5, 0.9, (h, a) => (h > 0.9 ? "Jjh" : Math.abs(((a * 5) / Math.PI) % 1) < 0.2 ? "Jjh" : "JjhH")) }) },
  dwarf: { slot: "beard", is: "a dwarf's beard: full from the cheekbones, parted under the chin into two braids to the belt, a metal ring at each end", closes: true, wide: true, bulk: 0, reach: 9, cover: true,
    field: sdf.union(C.BEARD, ...[-1, 1].map((s) => sdf.capsule([s * 1.3, 2.6, -5.4], [s * 1.5, 2.1, -7.6], 1, 0.75).mat("JjhH").part(`plait${s}`))), marks: { s: `
      ...............
      ...............
      ...............
      ...............
      ...............
      .....jjzjj.....`, sw: `
      ................
      ................
      ................
      ................
      ................
      ....jjz.........`, w: `
      .................
      .................
      .................
      .................
      .................
      ..jzj............` },
    // (the braids from under the chin to the belt, each a plait a band of its dark a px, its ring in the belt's metal)
    body: (F) => Object.fromEntries([-1, 1].map((s) => [`braid${s}`, F.j.limb(atHead(F.j, 2.6, s * 1.5, -5.6), [0, 1].map((e) => F.j.pelvis[e] + F.j.f[e] * (F.trunk(F.waist + 1.2, 0, 4) + 0.9) + F.j.r[e] * s * 1.3).concat(F.waist + 1.2), 1.1, 0.8,
      (h) => (h > 0.88 ? KEYS.metal : Math.floor(h * 9) % 2 ? "Jjh" : "JjhH"))])) },
  sideburns: { slot: "beard", is: "sideburns: down the cheeks in front of the ears to the jaw's corners, the chin bare", wide: true, bulk: 0, reach: 6.5, cover: true, from: 1,
    field: sdf.union(...[-1, 1].map((s) => sdf.capsule([s * 4.35, 0.4, 0.4], [s * 4.15, 1.9, -3.4], 1, 0.85))).noise({ amp: 0.15, scale: 1, seed: 47 }).mat("JjhH") },
})
for (const k of ["cropped", "spiky", "sidepart", "bob", "loose", "longback", "ponytail", "twotails", "curls", "crest", "topknot", "lowtie", "receding", "stubble", "mustache", "goatee", "boxed", "long", "dwarf", "sideburns"]) Object.assign(HAIRPARTS[k], { key: k, fits: { head: ["human"] }, materials: HAIR })
Object.assign(HAIRPARTS.full, { wide: true })

// ---------------------------------------------------------------- headwear
// A hat, a hood or a helmet is a field in the head's frame (as the hair is), baked with the head per view, and says by
// rule what it does to what is under it:
// - the hair: it `cuts` the hair above its rim (what would poke through its crown), so any hair goes under it and shows
//   where it lets it (under a cap's rim and at the nape; a hood's fringe through its opening; a helm's: none, `hides`);
//   a bun, a tail or a braid it can't take (`lets` names those it can: out behind, or under it) is refused with the reason;
// - the face: the approved face, the hair's and the beard's paint are painted only where the head shows in front of the
//   piece (a ray through each pixel: the piece nearer, its pixel is left to the bake), so a hood or a cheek-piece covers
//   what it is in front of; a nasal is painted down the nose's own column (the hand face's nose sits a column off the
//   skull's front in a diagonal, where a modeled bar fell on the eye); where the face meets the piece a step darker (`shade` rows under a brim, the
//   sides too for one that frames the face: a hood's shadow round it); a closed helm's openings dark; a metal piece's
//   one glint where the light mirrors to the eye; no piece but a closed helm may hide both eyes (checked as it is baked);
// - the heads: made on the human head; on the wolf's where `wolf` gives its shape there (cloth gives way to the ears, a
//   ring sits under them, a dome made on its cranium with the ears through; nothing closes over the muzzle);
// - the body: a hood's cowl or a coif's skirt is a part of the figure too (`body`), over the collar and the cloak;
// - its colors: `hat` (cloth, straw, leather), `band` (a band, a lining, a gem), `helm` (metal: four tones and a glint).
// Metal at this size (the kit's first): a ramp from a blue-black to a cool light (the shadows cool, the lights a little
// warm), wider than cloth's, so it reads hard against grey cloth's narrow warm one; the glint a single pixel where the
// light (above and toward us) mirrors to the eye, on a dome a quarter of its radius over its middle, the same pixel in
// every view as it turns; under a rim its darkest, and the brow under it a step darker.
// (a swap recolors by color: these keys' own colors are none another key has, so a hat's swap moves nothing else)
pal({ 1: "#6a2e6e", 2: "#8e3e94", 3: "#b252b8", 4: "#d670dc", 5: "#1e5a52", 6: "#2e8476", 7: "#4eb09c", 8: "#fbfbf2" })
Object.assign(KEYS, { hat: "1234", band: "567", helm: "12348" })
const HK = KEYS.hat, HB = KEYS.band
const METALS = {
  steel: ["#1a1e2c", "#3a4254", "#69727f", "#a9adae", "#f4f2ea"], iron: ["#17161c", "#2e2d34", "#4f4e54", "#7f7c7a", "#d8d2c4"],
  bronze: ["#2a160e", "#5a3618", "#93622a", "#cc9a4a", "#f8e8b8"], gilt: ["#3a2408", "#7a5414", "#bc8e26", "#ecc85a", "#fff6d0"],
  silver: ["#2a2c3a", "#5a5f72", "#9a9fb0", "#d6dae2", "#ffffff"],
}
// the solid above a rim through z0 at the head's middle, rising `rise` px a px ahead (front up, nape down)
const above = (z0, rise = 0) => { const n = unit([0, rise, -1]); return sdf.plane(n, -z0 * -n[2]) }
// metal by its tones: the body of it its four, its edge band the lighter three
const METAL = KEYS.helm.slice(0, 4), METAL_LIT = METAL.slice(1)
// a hood, a headscarf or a coif's shell: grown round the head, its opening for the face, its lining where it is cut
// (`edge`: a band round the opening, a binding)
const shellOf = (r, at, open, oat, bottom, paint, edge) => {
  const O = sdf.ellipsoid(open).at(...oat), e = (q) => ((q[0] / open[0]) ** 2 + ((q[1] - oat[1]) / open[1]) ** 2 + ((q[2] - oat[2]) / open[2]) ** 2)
  return sdf.ellipsoid(r).at(...at).subtract(O).intersect(above(bottom)).paint((q, n) => (e(q) < (edge ? 1.08 : 1.25) ? HK.slice(0, 2) : edge && e(q) < 1.55 ? edge : paint ? paint(q, n) : HK))
}
// the hair a shell keeps: what is inside it, and under its lower edge what comes out (a braid's plaits)
const keepIn = (r, at, bottom) => sdf.union(sdf.ellipsoid(r).at(...at), sdf.plane([0, 0, 1], bottom + 1.5))
const HOOD = { r: [5.9, 6.4, 6.4], at: [0, -1.4, 0.6], open: [5.6, 5, 5], oat: [0, 5.2, -1.5] }
// a hood's cloth: its folds down the sides from the crown, a step darker
const FOLDS = (q) => (Math.abs(Math.abs(Math.atan2(q[0], q[1])) - 1.95) < 0.13 && q[2] < 4 ? HK.slice(0, 3) : HK)
// metal by how it faces: the top lit, a dark band where it turns from the sky (the horizon it mirrors), the lower turn
// lighter again (the ground's light): a hard surface's bands, not cloth's soft roll
const METAL_BY = (q, n) => (n[2] > 0.74 ? METAL.slice(2) : n[2] > 0.34 ? METAL.slice(1, 3) : n[2] > -0.05 ? METAL.slice(0, 2) : METAL.slice(1, 3))
const DOME = (r, at, z0, rise = 0) => sdf.ellipsoid(r).at(...at).intersect(above(z0, rise))
const HATS = {
  flatcap: { material: "cloth", colors: { hat: "tweed" }, covers: "the crown: the hair under its rim and at the nape", lets: ["bun", "tail", "braid"], face: "its brim's shade on the brow (the crew's)", reach: 7.5,
    is: "the crew's flat cap: a puffed crown wider than the head, a short brim over the brow",
    human: () => ({ field: sdf.union(C.HATS.fc[0].mat(HK.slice(1)), C.HATS.fc[1].mat(HK.slice(1))), cut: above(4.6) }),
    paint: delta(C.FACES.fc, C.ANCHORS.fc, (y) => y < 1), shade: 0 },
  bandana: { material: "cloth", colors: { hat: "red" }, covers: "the crown to a rolled hem above the ears, knotted at the back", lets: ["bun", "tail", "braid"], face: "none", reach: 9,
    is: "the crew's bandana: a cloth cap flat on the crown, its hem rolled, knotted at the back, two tails",
    human: () => ({ field: sdf.union(C.HATS.sa.cloth.paint((q) => (q[2] - 0.04 * q[1] < 2.5 ? HK[1] : HK.slice(1))).part("cloth"), C.HATS.sa.knot.mat(HK.slice(1)).part("knot")), cut: above(1.7, -0.04) }),
    wolf: () => ({ field: sdf.union(C.HATS.sa.cloth.scale(0.82).at(0, -1.2, 0.6).paint((q) => (q[2] < 2.1 ? HK[1] : HK.slice(1))).part("cloth"), C.HATS.sa.knot.scale(0.82).at(0, -1.2, 0.6).mat(HK.slice(1)).part("knot")) }), shade: 0 },
  headscarf: { material: "cloth", colors: { hat: "plum", band: "mustard" }, covers: "all of the hair but a fringe at the brow, the ears too, tied at the nape", lets: ["tail", "braid"], face: "its edge's shade round the face", reach: 9, closes: true,
    is: "a headscarf over the hair and the ears to the jaw, a border along its edge across the brow, tied at the nape, its point and ends hanging",
    human: () => ({ field: sdf.union(shellOf([5.35, 5.85, 5.55], [0, -1, 0.3], [5, 4.9, 4.8], [0, 4.9, -2.2], -4, undefined, HB),
      sdf.union(sdf.ellipsoid([1.3, 1.1, 1.1]).at(0, -6.1, -2.6), sdf.capsule([-0.3, -6.2, -3], [-1.1, -6.5, -6], 0.9, 0.5), sdf.capsule([0.4, -6.2, -3], [1.2, -6.3, -5.6], 0.8, 0.45)).mat(HK.slice(1)).part("knot"),
      sdf.cone(2.8, 4.4, 0).rotate(180, "x").scale([1, 0.3, 1]).rotate(-14, "x").at(0, -6.4, -1.2).mat(HK).part("flap")),
      keep: keepIn([4.9, 5.4, 5.1], [0, -1, 0.3], -4) }),
    shade: 1, frames: true },
  straw: { material: "straw", colors: { hat: "straw", band: "red" }, covers: "the crown: the hair under its brim all round", lets: ["bun", "tail", "braid"], face: "the wide brim's shade on the brow and the eyes' row", reach: 9.5,
    is: "a wide-brimmed straw hat, a round crown, a cloth band",
    human: () => ({ field: STRAW(0, 0, 1), cut: above(3) }), wolf: () => ({ field: STRAW(-1, 1.9, 0.75, 0.6) }), shade: 2 },
  pointed: { material: "cloth", colors: { hat: "navy", band: "mustard" }, covers: "the crown: the hair under its brim all round", lets: ["bun", "tail", "braid"], face: "its brim's shade on the brow", reach: 15,
    is: "a tall pointed hat, its tip bent back, a brim, a band",
    human: () => ({ field: sdf.union(sdf.cone(4.9, 10.5, 0).bend(0.035).rotate(-90, "z").at(0, -0.3, 3.2).mat(HK), sdf.cylinder(7.2, 0.45).scale([1, 1.05, 1]).at(0, -0.2, 3).paint((q) => (Math.hypot(q[0], q[1] + 0.2) > 6.6 ? HK.slice(1) : HK)).part("brim"),
      sdf.cylinder(5.05, 0.8).at(0, -0.3, 3.3).mat(HB)), cut: above(3.2) }), shade: 1 },
  hood: { material: "cloth", colors: { hat: "green" }, covers: "all of the hair but a fringe at the brow, through its opening", lets: ["tail", "braid"], face: "its shadow round the face", reach: 9.5, closes: true,
    is: "a hood up: the cloth over the head to a point behind, an opening for the face, its cowl on the shoulders",
    human: () => ({ field: sdf.union(shellOf(HOOD.r, HOOD.at, HOOD.open, HOOD.oat, -6, FOLDS), sdf.capsule([0, -5, 5.2], [0, -10.6, 5.4], 2, 0.5).paint(FOLDS), { smooth: 1 }),
      keep: keepIn(HOOD.r.map((v) => v - 0.45), HOOD.at, -6) }),
    // (on the wolf: its own head's shape grown by the cloth, the cranium, the ruff and the ears under it shaping it into
    // two points, the opening long for the muzzle and wide for the eyes)
    wolf: () => {
      const O = [4.6, 6.6, 4.2], oat = [0, 4.4, -0.3], e = (q) => (q[0] / O[0]) ** 2 + ((q[1] - oat[1]) / O[1]) ** 2 + ((q[2] - oat[2]) / O[2]) ** 2
      const ear = (s) => sdf.cone(2.9, 5, 0.5).rotate(-12, "x").rotate(s * 18, "y").at(s * 2.6, -1.8, 2.9)
      return { field: sdf.union(sdf.ellipsoid([4.5, 4.8, 4.6]).at(0, -1.4, 1), sdf.ellipsoid([5.7, 3.6, 3.7]).at(0, -2.4, -1.6), ear(-1), ear(1), { smooth: 1.2 })
        .subtract(sdf.ellipsoid(O).at(...oat)).intersect(above(-5.2)).paint((q) => (e(q) < 1.25 ? HK.slice(0, 2) : FOLDS(q))) }
    },
    shade: 1, frames: true, body: "cowl", withCloak: true },
  hooddown: { material: "cloth", colors: { hat: "green" }, covers: "nothing: it lies on the shoulders", lets: ["bun", "tail", "braid"], face: "none", reach: 0,
    is: "the same hood down: a cowl round the neck, the hood's bag lying on the upper back",
    human: () => ({}), wolf: () => ({}), body: "down", withCloak: true },
  coif: { material: "leather", colors: { hat: "brown", band: "linen" }, covers: "all of the hair, the ears and the neck: its opening the face's", lets: ["tail"], face: "its edge's shade round the face", reach: 8, closes: true,
    is: "a leather coif close over the head, the ears and the neck, its opening bound, a seam over the crown, its skirt on the shoulders",
    human: () => ({ field: shellOf([5.2, 5.6, 5.8], [0, -0.6, 0.1], [4.8, 5, 4.6], [0, 5, -1.9], -6.4, (q) => (Math.abs(q[0]) < 0.45 && q[2] > 0 ? HK.slice(0, 2) : HK), HB), hides: true }),
    shade: 1, frames: true, body: "skirt" },
  helmet: { material: "metal", colors: { helm: "steel" }, covers: "the crown: the hair under its rim at the nape and the sides", lets: ["tail", "braid"], face: "the dark under its rim on the brow", reach: 7.5,
    is: "an open round helmet: a dome to a rim over the brow, lower at the nape",
    human: () => ({ field: HELMET(), cut: above(1, 0.27) }),
    // (on the wolf: a dome made on its cranium, its ears through it, its rim over the brow and the ruff)
    wolf: () => ({ field: HELMET([4.6, 5, 4.4], [0, -1.4, 1.2], 2.1, 0.25) }), shade: 1 },
  nasal: { material: "metal", colors: { helm: "iron" }, covers: "the crown: the hair under its rim at the nape and the sides", lets: ["tail", "braid"], face: "the nasal over the nose, the dark under the rim", reach: 8.5,
    is: "a pointed helmet with a nasal: a tall dome, a rim, a bar down over the nose",
    // (the nasal painted over the face by rule: down the nose's column, from the brow to its tip)
    human: () => ({ field: HELMET([5.6, 6, 6.4], [0, -0.3, 0.7]), cut: above(1, 0.27) }), shade: 1, nasal: true },
  kettle: { material: "metal", colors: { helm: "steel" }, covers: "the crown: the hair under its brim all round", lets: ["bun", "tail", "braid"], face: "the brim's shade on the brow and the eyes' row", reach: 9,
    is: "a kettle hat: a round dome, a wide brim sloping down all round",
    human: () => ({ field: sdf.union(DOME([5.5, 5.9, 4.6], [0, -0.3, 1.8], 2.3).paint(METAL_BY), sdf.cone(8, 1.5, 5.5).subtract(sdf.cone(8, 1.5, 5.5).at(0, 0, -0.55)).scale([1, 1.06, 1]).at(0, -0.3, 1.1).paint((q) => (Math.hypot(q[0], q[1] + 0.3) > 7.2 ? METAL_LIT : METAL)).part("brim")), cut: above(2.3) }), shade: 2 },
  greathelm: { material: "metal", colors: { helm: "steel" }, covers: "all of it: a closed helm", lets: ["tail"], face: "all of it closed: the eye-slit and the breaths dark", reach: 7.5, closes: true, closed: true,
    is: "a great helm: a flat-topped drum closing over the head and the face, an eye-slit, a cross down its front",
    // (its openings, the eye-slit and three breaths on the right cheek, `dark`: what a ray meets in them is painted dark)
    human: () => {
      const dark = sdf.union(sdf.box([6.8, 4, 1.1]).at(0, 5, 0.7), ...[0, 1, 2].map((i) => sdf.capsule([1.4 + 1 * i, 3.6, -2.6], [1.4 + 1 * i, 7, -2.6], 0.48)))
      return { field: sdf.cylinder(5.3, 11).union(sdf.ellipsoid([5.3, 5.3, 1]).at(0, 0, 11)).scale([1, 1.08, 1]).at(0, -0.2, -5.7).subtract(dark)
        // (the cross down its front and the band over the slit a step lit; its top the light's)
        .paint((q, n) => (n[2] > 0.6 ? METAL.slice(2) : q[1] > 2 && (Math.abs(q[0]) < 0.6 && q[2] < 0 || q[2] > 1.2 && q[2] < 2.2) ? METAL.slice(2) : METAL)), dark, hides: "all" }
    }, shade: 0 },
  circlet: { material: "metal", colors: { helm: "gilt", band: "red" }, covers: "nothing: a ring on the hair at the brow", bare: true, lets: ["bun", "tail", "braid"], face: "none", reach: 6.5,
    is: "a circlet: a thin metal ring round the brow, a stone at its front",
    human: (hair) => ({ field: CIRCLET(4.6 * Math.sqrt(1 - (2.4 / 5.3) ** 2) + (hair?.bulk ?? 0) + 0.3, 0, 2.4) }),
    // (on the wolf: round its cranium under the ears, over the brow)
    wolf: () => ({ field: CIRCLET(3.9, -1.2, 2.2) }), shade: 0 },
}
// the dome of a helmet to its rim (z0 at the middle, rising `rise` a px ahead), the rim a band round it, a step out
function HELMET(r = [5.6, 6, 5], at = [0, -0.3, 1.3], z0 = 1, rise = 0.27) {
  const rim = sdf.ellipsoid([r[0] + 0.35, r[1] + 0.35, r[2] + 0.35]).at(...at).intersect(above(z0, rise)).subtract(above(z0 + 0.9, rise))
  return sdf.union(sdf.ellipsoid(r).at(...at).intersect(above(z0, rise)).paint(METAL_BY), rim.mat(METAL_LIT).part("rim"))
}
function STRAW(dy, dz, k, kz = k) {
  const at = (f) => f.scale([k, k, kz]).at(0, dy - 0.3 * k, dz)
  return sdf.union(at(sdf.cylinder(4.7, 3.3).at(0, 0, 3).union(sdf.ellipsoid([4.7, 4.7, 1.1]).at(0, 0, 6.3), { smooth: 0.8 }).scale([1, 1.05, 1])).paint((q) => (Math.floor(q[2] * 1.1) % 2 ? HK.slice(1) : HK)),
    at(sdf.cylinder(4.85, 0.9).scale([1, 1.05, 1]).at(0, 0, 3.05)).mat(HB),
    at(sdf.cylinder(8.6, 0.45).scale([1, 1.05, 1]).at(0, 0, 2.8)).paint((q) => (Math.hypot(q[0], q[1]) > 7.9 * k ? HK.slice(1) : Math.floor(Math.hypot(q[0], q[1]) / 1.4) % 2 ? HK : HK.slice(0, 3))).part("brim"))
}
function CIRCLET(R, dy, z) {
  return sdf.union(sdf.torus(R, 0.38).scale([1, 1.07, 1]).at(0, dy - 0.3, z).mat(METAL_LIT), sdf.sphere(0.6).at(0, dy - 0.3 + R * 1.07 + 0.15, z).mat(HB).part("stone"))
}
// why a bun, a tail or a braid can't go under one (its `lets`), and why one has no shape on the wolf's head
const WHY = {
  headscarf: ["it ties at the nape, where a bun sits", "it ties close round a human jaw: the wolf's muzzle and ruff stand out of it"],
  hood: ["its cloth closes over the back of the head, where a bun sits"],
  coif: ["it closes close round the head and the neck: a bun or a braid has no way out", "it fits close round a human face and neck: the muzzle and the ruff don't go in it"],
  helmet: ["its rigid dome comes down over the back of the head, where a bun sits"],
  nasal: ["its rigid dome comes down over the back of the head, where a bun sits", "its nasal lies down a human nose: on the wolf it would stand off the muzzle's bridge"],
  greathelm: ["it closes over the whole head to the collar: a bun or a braid has no way out", "it closes over a human face: the wolf's muzzle doesn't go in it"],
  flatcap: [, "its puffed crown lies flat where the wolf's ears stand"], pointed: [, "its narrow cone stands where the wolf's ears do"],
  kettle: [, "a rigid dome made on the human skull: the ears don't go through it (the open helmet is made for the wolf)"],
}
// the new hairs' ties under each piece (a high tail out under a brim's or a cap's back, two tails under a rim at the
// sides; a topknot or a crest only where nothing sits on the crown), and the pieces closing round the jaw (`jaw`: a beard
// over the jaw's sides refused, a mustache, a goatee or stubble in its opening); a great helm hides any beard, a nasal
// helm's rim leaves it below
for (const [k, more] of Object.entries({ flatcap: ["tails", "hightail"], bandana: ["tails", "hightail"], straw: ["tails", "hightail"], pointed: ["tails", "hightail"],
  hooddown: ["tails", "hightail", "topknot", "crest"], helmet: ["tails"], nasal: ["tails"], kettle: ["tails"], circlet: ["tails", "hightail", "topknot", "crest"] })) HATS[k].lets.push(...more)
Object.assign(HATS.coif, { jaw: true }); Object.assign(HATS.headscarf, { jaw: true })
const WHY_TIE = { hightail: "a high tail ties on the back of the crown, under it", tails: "two tails tie at the sides behind the ears, where it closes", topknot: "a topknot stands on the crown, where it sits", crest: "a crest stands along the crown, where it sits" }
for (const [k, P] of Object.entries(HATS)) Object.assign(P, { key: k, slot: "headwear", fits: { head: ["human", ...(P.wolf ? ["wolf"] : [])] }, whyNot: WHY[k]?.[0], wolfWhy: WHY[k]?.[1],
  layer: P.body === "cowl" ? "its cowl over the collar, the mane and a cloak (it belongs to the cloak: in its colors when one is worn)" : P.body === "down" ? "on the shoulders over the collar, the mane and a cloak (in the cloak's colors when one is worn)" : P.body === "skirt" ? "its skirt over the collar and a coat's, under a cloak" : "on the head" })
// what a head shows of the piece and of itself: is a ray through a view's pixel (x, y from the head's middle) on the
// piece, and how the piece there faces (its normal, in the view)
const COMPASS_I = { s: 8, sw: 10, w: 12, nw: 14, n: 0 }, PITCH = (20 * Math.PI) / 180
const rayOf = (v, x, y, head, hat) => {
  const t = (COMPASS_I[v] * 22.5 * Math.PI) / 180, c = Math.cos(t), s = Math.sin(t), U = [0, Math.sin(PITCH), Math.cos(PITCH)], F = [0, Math.cos(PITCH), -Math.sin(PITCH)]
  const toHead = (p) => [p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2]]
  const o = [0, 1, 2].map((e) => (e === 0 ? x : 0) - y * U[e] - 30 * F[e]), d = toHead(F)
  let at = toHead(o), go = 0
  for (let i = 0; i < 160 && go < 60; i++) {
    const a = head.dist(at), b = hat.dist(at), m = Math.min(a, b)
    if (m < 0.02) {
      if (b > a) return { on: "head", q: at }
      const g = (e) => { const q = at.slice(); q[e] += 0.01; return (hat.dist(q) - b) / 0.01 }, n = unit([g(0), g(1), g(2)])
      // (back into the view: the normal's way toward the eye and up)
      return { on: "hat", q: at, n: [n[0] * c + n[1] * s, -n[0] * s + n[1] * c, n[2]] }
    }
    const step = Math.max(m, 0.02) * 0.9
    at = at.map((v, e) => v + d[e] * step); go += step
  }
  return { on: "none" }
}
// the skin's ramp a step darker (the eyes, the lids and the line as they are)
const DARKER = { L: "S", S: "s", s: "z", z: "z", Y: "H", H: "h", h: "j", j: "J" }
// the light's mirror to the eye (above and toward us: views()' light, the camera 20 degrees down)
const HALF = unit([0, -0.6 / Math.hypot(0.6, 0.75) - Math.cos(PITCH), 0.75 / Math.hypot(0.6, 0.75) + Math.sin(PITCH)])
// the head's paint: the face's grid, each part's over it, as one grid a view about its anchor; with headwear only
// where the head shows in front of it, its own paint and its rules over that
const paintOf = (H, parts, hw, face, hair) => {
  const retouch = {}, anchor = {}
  for (const v of Object.keys(H.face)) {
    const F = face ? cells(face.views[v] ?? "", face.anchor[v] ?? [0, 0]) : cells(H.face[v], H.anchor[v]), m = new Map(F)
    if (face) {
      // (a face not the approved one: past where the approved one paints, only on the skin the bake shows; its eyes, and
      // its marks under a hair's skin, its own)
      const A = cells(H.face[v], H.anchor[v]), eye = eyeCells(F)
      if (hair) for (const p of F.keys()) if (!A.has(p) && !eye.has(p)) { const [x, y] = p.split(",").map(Number); if (rayOf(v, x, y, H.skull, hair).on === "hat") m.delete(p) }
      for (const P of parts) for (const [p, k] of paintIn(P, v)) { const f = F.get(p); if (eye.has(p) || (f && !SKINK.includes(f) && SKINK.includes(k))) continue; k === "," ? m.delete(p) : m.set(p, k) }
    } else { const eye = eyeCells(F); for (const P of parts) for (const [p, k] of paintIn(P, v)) if (!eye.has(p)) k === "," ? m.delete(p) : m.set(p, k) }
    if (hw?.field) {
      const look = new Map(), on = (x, y) => { const p = `${x},${y}`; if (!look.has(p)) look.set(p, rayOf(v, x, y, hw.head, hw.field)); return look.get(p) }
      const eyes = (q) => [...q.values()].filter((k) => "EeGq".includes(k)).length, before = eyes(m)
      for (const p of [...m.keys()]) { const [x, y] = p.split(",").map(Number); if (on(x, y).on === "hat") m.delete(p) }
      for (const [p, k] of hw.P.paint?.[v] ?? []) k === "," ? m.delete(p) : m.set(p, k)
      // (where the face meets the piece: under a brim `shade` rows, beside one that frames the face, a step darker)
      for (const [p, k] of [...m]) {
        const [x, y] = p.split(",").map(Number)
        if (DARKER[k] && hw.P.paint?.[v]?.has(p) !== true && ([...Array(hw.P.shade).keys()].some((i) => on(x, y - 1 - i).on === "hat") || (hw.P.frames && (on(x - 1, y).on === "hat" || on(x + 1, y).on === "hat")))) m.set(p, DARKER[k])
      }
      // (a nasal: down the nose's column (the skin's lightest, the nose's alone in the approved faces; its front one in a
      // diagonal or in profile) from the brow to the nose's tip, lit above and a step down below)
      if (hw.P.nasal) {
        const L = [...m].filter(([, k]) => k === "L").map(([p]) => p.split(",").map(Number))
        if (L.length) { const x = Math.min(...L.map((q) => q[0])), y1 = Math.max(...L.map((q) => q[1])); for (let y = 0; y <= y1; y++) m.set(`${x},${y}`, y < 2 ? KEYS.helm[3] : KEYS.helm[2]) }
      }
      // (a closed helm: where a ray meets it in its openings, or goes through them to the head, dark)
      if (hw.dark) for (let y = -7; y <= 7; y++) for (let x = -8; x <= 8; x++) { const r = on(x, y); if (r.q && hw.dark.dist(r.q) < 0.15) m.set(`${x},${y}`, "k") }
      // (a metal piece: its one glint, the pixel facing most where the light mirrors to the eye)
      if (hw.P.material === "metal") {
        let best, bd = 0.9
        for (let y = -10; y <= 4; y++) for (let x = -7; x <= 7; x++) { const r = on(x, y); if (r.on === "hat") { const d = dot3(r.n, HALF); if (d > bd) { bd = d; best = `${x},${y}` } } }
        if (best && !m.has(best)) m.set(best, KEYS.helm[4])
      }
      if (v === "s" && before && !eyes(m) && !hw.P.closed) throw new Error(`kit: the headwear '${hw.P.key}' hides both eyes on the head '${H.key}', and it isn't a closed helm`)
    }
    if (!m.size) continue
    const at = [...m.keys()].map((p) => p.split(",").map(Number)), x0 = Math.min(...at.map((q) => q[0])), x1 = Math.max(...at.map((q) => q[0])), y0 = Math.min(...at.map((q) => q[1])), y1 = Math.max(...at.map((q) => q[1]))
    retouch[v] = Array.from({ length: y1 - y0 + 1 }, (_, y) => Array.from({ length: x1 - x0 + 1 }, (_, x) => m.get(`${x + x0},${y + y0}`) ?? ".").join("")).join("\n")
    anchor[v] = [-x0, -y0]
  }
  return { retouch, anchor }
}
// a head once per set of parts (its colors are the character's swap): views() as the traveler's, the parts' fields on the skull
const headsMade = new Map()
const headOf = (H, parts, P, face) => {
  // (the headwear on this head: its shape there; one with none, the hood down, leaves the head as it is; the approved
  // face the head's own, as it always was)
  const S = P && P[H.key](parts.find((q) => q.slot === "hair")), fc = face?.approved || face?.own ? undefined : face
  const key = JSON.stringify([H.key, parts.map((P) => P.key), ...(S?.field ? [P.key] : []), ...(fc ? [fc.key] : [])])
  if (!headsMade.has(key)) {
    const name = `_kh${headsMade.size}`
    // (the hair cut above its rim or hidden, the rest under it)
    const on = S?.field ? parts.filter((q) => !(S.hides && (q.slot === "hair" || (S.hides === "all" && q.slot === "beard")))).map((q) => (q.slot !== "hair" ? q : S.cut ? { ...q, field: q.field.subtract(S.cut) } : S.keep ? { ...q, field: q.field.intersect(S.keep) } : q)) : parts
    const onSkull = on.length > 1 ? sdf.union(...on.map((q) => q.field)) : on[0]?.field, under = on.length ? sdf.union(H.skull, onSkull) : H.skull
    const { retouch, anchor } = paintOf(H, on, S?.field ? { P, field: S.field, head: under, dark: S.dark } : undefined, fc, onSkull)
    // (what is on the skull one field, the skull's other child: as the crew's bald head and its beard were made)
    views(name, S?.field ? sdf.union(under, S.field) : under, { ...T.HEAD, ...H.views, retouch, anchor,
      ...(on.some((q) => q.closes) || H.closes || (S?.field && P.closes) ? {} : { jowl: 2 }), ...(on.some((q) => q.bald) && !(S?.field && !P.bare) ? { crown: 3 } : {}) })
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
// a hat's: the cloths and straw (its weave the light ones, a warm yellow, its shadows brown)
const HAT_RAMPS = { ...RAMPS, straw: ["#4a3418", "#8a6a2c", "#c4a052", "#ead48a"] }
const SKINS = {
  fair: ["#9c5b45", "#d2966f", "#f0c79e", "#fde6c6"], tan: ["#7e4a30", "#b47650", "#d8a274", "#f0caa0"], brown: ["#5a3220", "#86553a", "#ad7a54", "#cc9e74"],
  deep: ["#3a2016", "#5c3626", "#7e523a", "#9e7050"],
}
// the hair's: the traveler's chestnut, the crew's (dark, black, ginger, auburn, grey), blond
// and white (its lights a warm cream, its shadows a cool lilac: not the crew's warm grey, not the white cloth's flat warm
// greys) and ash (a sage grey-blond, its shadows green-grey: no cloth's beige or tweed); each hair's five tones none a
// cloth's, the coif's or a hat's (a hat is told from hair by its edge, its band and its smooth roll; hair by its strands,
// its parting and its five tones)
const HAIRS = { chestnut: {}, ...C.HAIR_COLORS, blond: { Y: "#f2dc94", H: "#d8b862", h: "#ae8a3e", j: "#785a26", J: "#463214" },
  white: { Y: "#f4efe2", H: "#d2ccd2", h: "#a29cae", j: "#6c6680", J: "#3a364a" }, ash: { Y: "#c2c0a6", H: "#9c9a82", h: "#73725e", j: "#4a4a3e", J: "#26271f" } }
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
  for (const P of worn) for (const [s, c] of Object.entries(P.colors ?? {})) put(KEYS[s], tones(colors[s] ?? c, TABLES[s] ?? RAMPS, s))
  if (hat && colors.hat !== undefined) put(hat, tones(colors.hat, RAMPS, "hat"))
  if (colors.fur !== undefined) Object.assign(swap, FURS[colors.fur] ?? (() => { throw new Error(`kit: no fur '${colors.fur}' (${Object.keys(FURS).join(", ")})`) })())
  if (colors.skin !== undefined) put("zsSL", tones(colors.skin, SKINS, "skin"))
  if (colors.hair !== undefined) {
    const h = Array.isArray(colors.hair) ? Object.fromEntries([..."JjhHY"].map((k, i) => [k, colors.hair[i]])) : HAIRS[colors.hair]
    if (!h) throw new Error(`kit: no hair color '${colors.hair}' (${Object.keys(HAIRS).join(", ")})`)
    Object.assign(swap, h)
  }
  // (the eyes: the iris's two tones, the wolf's its bright one)
  if (colors.eyes !== undefined) { const e = tones(colors.eyes, EYES, "eye"); Object.assign(swap, { E: e[0], e: e[1], q: e[2] }) }
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
// The wolf's faces in the face slot: its own (above), one with a scar (a pale weal through the fur over the near eye's brow
// and on down the cheek under it, the eye whole between), and an old one (its mask, the muzzle and the brows gone grey: the
// fur's mask keys mixed toward a cool grey and lightened, by color, so it greys on any fur); its eyes take `colors.eyes`
// (one bright tone). The human faces, hairs and beards are refused on it with the reason (WHY_HEAD).
const SCAR_RUNS = { s: { "-3": [[4, "L"]], "-2": [[3, "L"]], 0: [[4, "z"]], 1: [[4, "z"]] }, sw: { "-5": [[3, "L"]], "-4": [[2, "L"]], "-3": [[1, "L"]], 0: [[1, "z"]], 1: [[2, "z"]] },
  w: { "-4": [[-1, "L"]], "-3": [[-2, "L"]], 0: [[-1, "L"]], 1: [[0, "z"]] } }
const runsOver = (a, b = {}) => Object.fromEntries([...new Set([...Object.keys(a), ...Object.keys(b)])].map((y) => [y, [...(a[y] ?? []), ...(b[y] ?? [])]]))
Object.assign(FACES, {
  wolf: { is: "the wolf's own face (its approved draft)", own: true, views: HEADS.wolf.face, anchor: HEADS.wolf.anchor },
  wolfscar: { is: "the wolf's face with a scar through the near brow and down the cheek, the eye whole", ...(() => { const g = Object.fromEntries(Object.entries(WOLF_RUNS).map(([v, r]) => [v, gridOf(runsOver(r, SCAR_RUNS[v]))]))
    return { views: Object.fromEntries(Object.entries(g).map(([v, f]) => [v, f.grid])), anchor: Object.fromEntries(Object.entries(g).map(([v, f]) => [v, f.anchor])) } })() },
  wolfold: { is: "the wolf's face grown old: the muzzle, the mask and the brows gone grey", own: true, grey: true, views: HEADS.wolf.face, anchor: HEADS.wolf.anchor },
})
for (const k of ["wolf", "wolfscar", "wolfold"]) Object.assign(FACES[k], { key: k, slot: "face", fits: { head: ["wolf"] }, materials: { fur: "JjhHY zsSL", eyes: "q" } })
// (a color mixed toward a cool grey of its own lightness and lifted: the old wolf's mask)
const greyed = (c) => { const n = parseInt(c.slice(1), 16), v = [n >> 16, (n >> 8) & 255, n & 255], l = (v[0] * 0.3 + v[1] * 0.59 + v[2] * 0.11) * 1.12 + 14, g = [l * 0.96, l * 0.98, l * 1.04]
  return "#" + v.map((x, i) => Math.round(Math.min(255, x * 0.3 + g[i] * 0.7)).toString(16).padStart(2, "0")).join("") }
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

// ---------------------------------------------------------------- what a hand holds, what the hip and the back carry
// A thing is a part of the figure as a garment is: modeled in 3D on the joints of the pose (the fist, the forearm, the
// belt, the back), so surface() draws each pixel of it in front of the body or behind it by its depth, in every view, as
// it does a sleeve; no table says what is drawn over what. (The head is stamped over the body by hand: rig3d's `over`
// keeps a thing over it where the thing is nearer, a spear's head past the cheek, a pack's top over the nape.) Each says:
// - its slots: `held` the main hand (the right), `off` the other, `hip` hung from the belt, `back` on the back; a thing a
//   slot, so a quiver and a pack, both on the back, are one or the other;
// - the `hands` it takes: a two-handed thing (a quarterstaff, the woodcutter's axe, a bow: one hand holds it, the other
//   draws or works it) leaves the other hand empty; what else it excludes (`excl`) and why;
// - its grip standing (GRIPS): the arm's pose by rule for its kind of grip, given to the skeleton (fitMove scales it to
//   the body as it does the idle's), and the thing made on the fist (the fist's middle on its grip: the shaft through
//   it), on the forearm (a shield) or hung from it (a lantern); a staff's and a spear's foot on the ground, an axe's head;
// - its size by its bearer's body (`size`): a tool made for his hand and reach, by his arm (the shoulder to the fist), his
//   hand's height over the ground, his height or his trunk (measure());
// - its materials, each its own colors: `wood`, `steel` (a blade's, a head's: the helms' metals), `fit` (its fittings: a
//   guard, a pommel, a rim, ferrules), `gear` (leather), `face` (a shield's), `pack` (canvas), `gem`, `fletch`;
// - the bodies it fits: every one (a wolf's paws close on a shaft as hands do), by these rules and no code for a body.
// The hip's things hang from the belt (a spec with none: the thing brings its own), just outside what is worn there, found
// by going out from the hips until the clothes end (onTop()); the back's lie on what is outermost there (over a cloak,
// a hood's cowl, the mane), their straps over the shoulders. The sword's scabbard holds the sword unless a hand holds it
// (one rule: the sword in the hand, the scabbard empty, its mouth dark). Metal as the helmets' (its four tones and a
// glint; a blade's one light along its edge), wood its grain a tone along it, leather two tones and a dark band.
pal({ β: "#301e14", γ: "#5c3c24", δ: "#8c6038", ε: "#ba8c54", ζ: "#1c202e", η: "#3c4456", θ: "#6b7481", λ: "#abafb0", μ: "#f6f4ec",
  ξ: "#5c381a", π: "#95642c", σ: "#ce9c4c", φ: "#301c12", ψ: "#4d3020", ω: "#865631", ς: "#aa7646", Γ: "#4c1418", Δ: "#701e24", Θ: "#aa343c", Λ: "#d2624e",
  Ξ: "#3c2e20", Π: "#5c4832", Σ: "#806848", Φ: "#a28862", Ψ: "#203c8c", Ω: "#4282e2", 9: "#aae2ff", 0: "#aaa69e", "§": "#eeeae0",
  "¤": "#ca882c", "¶": "#f8d476", "£": "#fff6ca", "¥": "#eae4ce" })
Object.assign(KEYS, { wood: "βγδε", steel: "ζηθλμ", fit: "ξπσ", gear: "φψως", face: "ΓΔΘΛ", pack: "ΞΠΣΦ", gem: "ΨΩ9", fletch: "0§" })
const WOOD = KEYS.wood, STEEL = KEYS.steel.slice(0, 4), FIT = KEYS.fit, GEAR = KEYS.gear, FACE = KEYS.face, PACK = KEYS.pack, GLOW = "¤¶", FLAME = "£", STRING = "¥"
// a thing's colors by material: the woods (dark to light), the gems, the fittings (a metal's four tones but the glint)
const WOODS = { ash: ["#301e14", "#5c3c24", "#8c6038", "#ba8c54"], oak: ["#24160e", "#46301c", "#6e4c2c", "#97703f"], pale: ["#3e2c1c", "#6e5234", "#a07e52", "#ccb07c"], ebony: ["#141012", "#2a2026", "#43363a", "#66565a"] }
const GEMS = { azure: ["#203c8c", "#4282e2", "#aae2ff"], ember: ["#7a2010", "#e25c20", "#ffd47c"], verdant: ["#165030", "#40ae5c", "#baf0a2"], amethyst: ["#4a1e72", "#9a4ee0", "#e6c4ff"] }
const FITS = Object.fromEntries(Object.entries(METALS).map(([k, v]) => [k, v.slice(0, 4)]))
// each color slot's table of ramps (the others' RAMPS); the leathers' the hats' (RAMPS and the straw: a boot, a belt or an
// apron takes any color a hat does)
const TABLES = { helm: METALS, hat: HAT_RAMPS, steel: METALS, fit: FITS, wood: WOODS, gem: GEMS, gear: HAT_RAMPS, feet: HAT_RAMPS, belt: HAT_RAMPS, apron: HAT_RAMPS }
const cross = (u, v) => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]
const UP = [0, 0, 1]
// metal by how it faces (the helmets' bands): the top lit, a dark band turning from the sky, the lower turn lighter again
const STEEL_BY = (q, n) => (n[2] > 0.74 ? STEEL.slice(2) : n[2] > 0.34 ? STEEL.slice(1, 3) : n[2] > -0.05 ? STEEL.slice(0, 2) : STEEL.slice(1, 3))
// a thing's own frame: o its origin, U along it, E across it (its edges' way), N its face's (U x E); at(t, s, w) a point
// in it, tsw(q) a point's place in it
const frame = (o, U, E) => {
  U = unit(U); E = unit(E.map((v, e) => v - U[e] * dot3(E, U)))
  const N = cross(U, E)
  return { o, U, E, N, at: (t, s = 0, w = 0) => o.map((v, e) => v + U[e] * t + E[e] * s + N[e] * w), tsw: (q) => { const r = q.map((v, e) => v - o[e]); return [dot3(r, U), dot3(r, E), dot3(r, N)] } }
}
// a field in a thing's frame, d(t, s, w) inside its box [t0, t1], [s0, s1], [w0, w1], painted by (t, s, w, n)
const inFrame = (fr, [t0, t1], [s0, s1], [w0, w1], d, paint) => {
  const pts = [t0, t1].flatMap((t) => [s0, s1].flatMap((s) => [w0, w1].map((w) => fr.at(t, s, w))))
  return sdf.field((x, y, z) => d(...fr.tsw([x, y, z])), [0, 1, 2].map((e) => Math.min(...pts.map((q) => q[e])) - 0.5), [0, 1, 2].map((e) => Math.max(...pts.map((q) => q[e])) + 0.5))
    .paint((q, n) => paint(...fr.tsw(q), n))
}
// the signed distance to a polygon of [t, s] (inside below 0)
const inPoly = (P, u, v) => {
  let d = Infinity, inside = false
  for (let i = 0, k = P.length - 1; i < P.length; k = i++) {
    const [a0, a1] = P[k], [b0, b1] = P[i], e0 = b0 - a0, e1 = b1 - a1, w0 = u - a0, w1 = v - a1, h = Math.max(0, Math.min(1, (w0 * e0 + w1 * e1) / (e0 * e0 + e1 * e1)))
    d = Math.min(d, Math.hypot(w0 - e0 * h, w1 - e1 * h))
    if ((a1 > v) !== (b1 > v) && u < (e0 * (v - a1)) / e1 + a0) inside = !inside
  }
  return inside ? -d : d
}
// a flat thing cut to an outline in its frame, th px either side of its plane (`bow`: its face bowed out that far at
// its middle across)
const slab = (fr, poly, th, paint, bow = 0) => {
  const ts = poly.map((q) => q[0]), ss = poly.map((q) => q[1]), w = Math.max(...ss.map(Math.abs)) || 1
  return inFrame(fr, [Math.min(...ts), Math.max(...ts)], [Math.min(...ss), Math.max(...ss)], [-th, th + bow], (t, s, q) => Math.max(inPoly(poly, t, s), Math.abs(q - bow * (1 - (s / w) ** 2)) - th), paint)
}
const rod = (fr, t0, t1, r0, r1, paint) => sdf.capsule(fr.at(t0), fr.at(t1), r0, r1).paint((q, n) => paint(...fr.tsw(q), n))
// The body's measures a thing's size follows: the arm (the shoulder to the fist), the hand's height over the ground at
// rest, the height, the trunk and the thigh, the hand's and the chest's thickness
const measure = (B) => {
  const b = B.body, R = rOf(B), arm = b.upper + b.fore
  return { arm, hz: b.hip + b.torso + b.shoulders[2] - 0.97 * arm, h: b.h ?? b.hip + b.torso + b.neck + R.head, torso: b.torso, thigh: b.thigh, hand: R.hand, chest: R.body[1] }
}
// The arm's pose by the kind of grip, standing (the hand from the shoulder [forward, out, up], the medium body's px, as
// the idle's [0, 1, -7]): a blade or a mace low at the side, the point down and a little forward; an axe resting its head
// on the ground by the foot, the hand on its haft's end; a staff or a spear upright, the forearm forward, its foot on the
// ground beside the foot; a bow by its grip a little before the body, upright; a shield on the forearm, out at the side
// it guards; a lantern hung from the fist held out before the body
const GRIPS = { low: [0.9, 1.4, -6.4], rest: [1.8, 2.2, -5.8], upright: [2.4, 1.6, -4.4], bow: [2.2, 1.5, -5.6], shield: [1.4, 2.3, -5.4], hang: [3.4, 1.3, -4.4] }
const gripMove = (M, W) => {
  const g = [W.off?.grip, W.held?.grip]
  if (!g[0] && !g[1]) return M
  return { ...M, pose: (i, h) => { const p = M.pose(i, h); return { ...p, hands: p.hands.map((q, k) => (g[k] ? [GRIPS[g[k]][0], (k ? 1 : -1) * GRIPS[g[k]][1], GRIPS[g[k]][2]] : q)) } } }
}
// the fist's middle (the hand's mitten, on from the wrist along the forearm), where a grip passes through it
const fistOf = (F, A) => { const d = unit(A.hand.map((v, e) => v - A.elbow[e])); return A.hand.map((v, e) => v + d[e] * 0.7 * F.R.hand) }
// a way in the body's frame: forward, out (to the side the arm is on), up
const toward = (j, fw, out, u, sd) => unit([0, 1, 2].map((e) => j.f[e] * fw + j.r[e] * out * sd + UP[e] * u))
// the point on the spine at a height; the point just outside what the figure wears from `from` out along `way` (its
// trunk, its clothes, a cloak), the parts `skip` names left out (the arms, a tail): where a thing hung on it lies
const spineAt = (j, z) => { const t = (z - j.pelvis[2]) / (j.chest[2] - j.pelvis[2]); return [j.pelvis[0] + (j.chest[0] - j.pelvis[0]) * t, j.pelvis[1] + (j.chest[1] - j.pelvis[1]) * t, z] }
const onTop = (P, from, way, skip) => {
  const all = sdf.union(...Object.entries(P).filter(([k]) => !skip.test(k)).flatMap(([, v]) => (Array.isArray(v) ? v : [v]).map((q) => q.field ?? q)).filter((q) => typeof q?.dist === "function"))
  let t = 0
  for (let d = all.dist(from); d < 0.2 && t < 14; d = all.dist(from.map((v, e) => v + way[e] * t))) t += Math.max(0.15, -d * 0.6)
  return from.map((v, e) => v + way[e] * t)
}
const SKIP = { hip: /^(arm|sleeve|coatarm|cloak|tail)/, back: /^(arm|sleeve|coatarm|tail)/ }
// a strap over the outermost garment round the trunk (a cloak's at its sides and back, where it covers), where keep(a,
// z) says (a band across the chest from a shoulder, two over the shoulders)
const strap = (F, W, keep) => {
  const n0 = 0.7 + Math.max(1, W.over ? 2.5 : 0, W.apron ? 3.5 : 0, W.mane ? 3 : 0), z0 = F.waist - 1.2, z1 = F.top + 0.3
  return F.wrap(z0, z1, (z, a) => (W.cloak && Math.abs(a) > 1.3 ? Math.max(n0, 4.7) : n0), { keep: (h, a) => keep(a, z0 + h * (z1 - z0)), paint: (h, a, out) => (out ? GEAR.slice(1) : GEAR[0]) })
}
// a blade: the grip through the fist along U, the pommel over it, the guard across, the blade to its point (its edge
// toward E lit: a blade's one light)
const blade = (fr, h, L, bw, guard, tip) => {
  const t0 = 1.1 * h + 0.25, tp = -(1.1 * h + 0.45)
  return [rod(fr, tp, t0, 0.42, 0.42, () => GEAR.slice(0, 3)), sdf.sphere(0.6).at(fr.at(tp - 0.35)).mat(FIT), sdf.capsule(fr.at(t0, -guard), fr.at(t0, guard), 0.45).mat(FIT),
    slab(fr, [[t0, -bw], [t0 + L - tip * bw, -bw], [t0 + L, 0], [t0 + L - tip * bw, bw], [t0, bw]], 0.3, (t, s) => (s > bw - 0.55 ? STEEL[3] : STEEL.slice(0, 3)))]
}
// the body's measures to each thing's (px): the sword's blade 1.45 arms, never so long it reaches the ground held low
const swordLen = (M) => Math.min(1.45 * M.arm, (M.hz - 1.4) / 0.92 - 1.4 * M.hand)
const LOW = (X) => frame(X.G, toward(X.j, 0.42, 0.1, -1, X.sd), X.j.f)
// (upright: through the fist, leaning out at the top as a hand at rest holds it, its foot on the ground a little in from
// the fist: a spear held in the near hand crosses the cheek in a front diagonal, not the middle of the face)
const UPRIGHT = (X, E) => { const U = toward(X.j, -0.05, 0.12, 1, X.sd), k = X.G[2] / U[2]; return frame(X.G.map((v, e) => v - U[e] * k), U, E) }
// a shaft upright from the ground through the fist: its paint by t (the height), ferrules at its ends when `ends`
const shaft = (fr, L, r, ends) => rod(fr, 0, L, r, r, (t) => (ends && (t < 1 || t > L - 1) ? FIT : Math.floor(t / 2.6) % 3 === 1 ? WOOD.slice(0, 3) : WOOD))
const THINGS = {
  // ---- blades
  sword: { slots: ["held", "off"], hands: 1, grip: "low", colors: { steel: "steel", fit: "bronze", gear: "brown" }, materials: "steel, its fittings, a leather grip",
    size: "the blade 1.45 times the arm (the shoulder to the fist), short enough to clear the ground held low",
    is: "an arming sword: a straight double-edged blade to a point, a cross guard, a leather grip, a round pommel",
    make: (X) => blade(LOW(X), X.M.hand, swordLen(X.M), 0.7 + 0.15 * X.M.hand, 1.5 * X.M.hand + 0.4, 1.6) },
  shortblade: { slots: ["held", "off"], hands: 1, grip: "low", colors: { steel: "steel", fit: "iron", gear: "black" }, materials: "steel, its fittings, a leather grip",
    size: "the blade 0.8 times the arm", is: "a short sword or a long knife: a broad blade to a point, a short guard",
    make: (X) => blade(LOW(X), X.M.hand, 0.8 * X.M.arm, 0.75 + 0.12 * X.M.hand, 0.9 * X.M.hand + 0.2, 1.9) },
  // ---- hafted
  axe: { slots: ["held"], hands: 2, grip: "rest", colors: { steel: "iron", wood: "ash" }, materials: "an iron head, a wooden haft",
    size: "the haft as long as the hand is high over the ground (its head rests there); the head by the hand", why2: "a woodcutter's axe swings in both hands",
    is: "a woodcutter's axe: a long haft, a wedge of a head, its bit flaring to a curved edge, a flat poll behind; resting its head on the ground by the foot",
    make: (X) => {
      const { M, G } = X, fr = frame(G, toward(X.j, 0.2, 0.25, -1, X.sd), toward(X.j, 1, 0.6, 0, X.sd)), k = 0.85 + 0.3 * M.hand, te = (G[2] - 0.2) / -fr.U[2], c = te - 1.1 * k
      const BIT = [[c - 0.7 * k, 0.4], [c - 2.5 * k, 3.4 * k], [c + 1.3 * k, 3.5 * k], [c + 0.5 * k, 0.4]], POLL = [[c - 1.1 * k, -0.4], [c - 1 * k, -1.5 * k], [c + 0.5 * k, -1.5 * k], [c + 0.5 * k, -0.4]]
      return [rod(fr, -1.2 * M.hand, c + 0.6, 0.45 + 0.1 * M.hand, 0.5 + 0.1 * M.hand, (t) => (Math.floor(t / 2.6) % 3 === 1 ? WOOD.slice(0, 3) : WOOD)),
        slab(fr, BIT, 0.45, (t, s) => (s > 2.7 * k ? STEEL[3] : STEEL.slice(0, 3))), slab(fr, POLL, 0.55, () => STEEL.slice(0, 2))]
    } },
  mace: { slots: ["held", "off"], hands: 1, grip: "low", colors: { steel: "iron", wood: "oak", fit: "iron" }, materials: "an iron head, a wooden haft, an iron cap",
    size: "the haft 1.15 times the arm; the head by the hand", is: "a flanged mace: a short haft, a round iron head with four flanges",
    make: (X) => {
      const { M } = X, fr = LOW(X), L = 1.15 * M.arm, hr = 0.85 + 0.3 * M.hand, fr2 = frame(fr.o, fr.U, fr.N)
      const flange = (f) => slab(f, [[L - 1.5 * hr, 0], [L - 0.2 * hr, 1.55 * hr], [L + 0.9 * hr, 0], [L - 0.2 * hr, -1.55 * hr]], 0.3, (t, s, w, n) => STEEL_BY(0, n))
      return [rod(fr, -1.2 * M.hand, L, 0.45, 0.5, (t) => (t < -0.7 * M.hand ? FIT : WOOD)), sdf.sphere(hr).at(fr.at(L)).paint(STEEL_BY), flange(fr), flange(fr2)]
    } },
  spear: { slots: ["held"], hands: 1, grip: "upright", colors: { steel: "steel", wood: "ash", fit: "iron" }, materials: "a steel head, a wooden shaft, an iron butt",
    size: "1.25 times its bearer's height (the dwarf's 34 px, the tall one's 56), the shaft as thick as the hand closes on", is: "a spear: a leaf-shaped head on a socket, a long shaft, its butt on the ground",
    make: (X) => {
      const { M, j } = X, L = 1.25 * M.h, hl = 2.6 + 0.6 * M.hand, hw = 0.85 + 0.15 * M.hand, fr = UPRIGHT(X, j.r.map((v, e) => v + j.f[e] * 0.6))
      return [rod(fr, 0, L - hl, 0.42 + 0.15 * M.hand, 0.42 + 0.15 * M.hand, (t) => (t < 0.9 || t > L - hl - 0.9 ? FIT : Math.floor(t / 2.6) % 3 === 1 ? WOOD.slice(0, 3) : WOOD)),
        slab(fr, [[L - hl, -0.4], [L - hl * 0.6, -hw], [L, 0], [L - hl * 0.6, hw], [L - hl, 0.4]], 0.3, (t, s) => (s > 0.2 ? STEEL[3] : STEEL.slice(0, 3)))]
    } },
  quarterstaff: { slots: ["held"], hands: 2, grip: "upright", colors: { wood: "oak", fit: "iron" }, materials: "a wooden staff, iron ferrules", why2: "a quarterstaff is fought with in both hands",
    size: "1.06 times its bearer's height: a little over his head", is: "a quarterstaff: a plain pole shod with iron at both ends, its foot on the ground",
    make: (X) => [shaft(UPRIGHT(X, X.j.r), 1.06 * X.M.h, 0.5 + 0.15 * X.M.hand, true)] },
  magestaff: { slots: ["held"], hands: 1, grip: "upright", colors: { wood: "ebony", gem: "azure" }, materials: "a gnarled wooden staff, a gem in its head",
    size: "1.08 times its bearer's height, the gem by the hand", is: "a mage's staff: a gnarled shaft, its head two prongs closing on a gem",
    make: (X) => {
      const { M } = X, fr = UPRIGHT(X, X.j.r), L = 1.08 * M.h, g = 0.85 + 0.25 * M.hand, r = 0.5 + 0.15 * M.hand
      const knots = [0, 0.3, 0.55, 0.8, 1].map((t, i) => fr.at(t * L, i % 2 ? 0.3 : -0.2)), prong = (s) => [fr.at(L - 0.4, s * 0.3), fr.at(L + 0.6 * g, s * 1.45 * g), fr.at(L + 2.1 * g, s * 0.45 * g)]
      const W3 = (t) => (Math.floor(t / 2.1) % 3 === 1 ? WOOD.slice(0, 2) : WOOD.slice(0, 3))
      return [...knots.slice(1).map((q, i) => sdf.capsule(knots[i], q, r, r * 0.95).paint((p) => W3(fr.tsw(p)[0]))),
        ...[-1, 1].flatMap((s) => { const p = prong(s); return [sdf.capsule(p[0], p[1], r * 0.85, r * 0.7), sdf.capsule(p[1], p[2], r * 0.7, 0.3)].map((f) => f.mat(WOOD.slice(0, 3))) }),
        sdf.sphere(g).at(fr.at(L + 1.1 * g)).paint((q, n) => (n[2] > 0.5 && n[1] < 0 ? KEYS.gem[2] : KEYS.gem))]
    } },
  // ---- shooting
  bow: { slots: ["off"], hands: 2, grip: "bow", colors: { wood: "ash", gear: "brown" }, materials: "a wooden bow, a leather grip, a string", why2: "the main hand draws the string",
    whySlot: "a bow is held in the off hand, the main hand draws", size: "1.75 times the hand's height over the ground: held at the side by its grip, its tips clear the ground (the dwarf's a short bow, the tall one's a long bow)",
    is: "a bow: two limbs from a leather-wrapped grip, curving back to recurved tips, the string straight between them",
    make: (X) => {
      const { M, j } = X, half = 0.875 * M.hz, br = 0.2 * half, fr = frame(X.G, unit([j.f[0] * 0.08, j.f[1] * 0.08, 1]), toward(j, 1, -0.9, 0, X.sd))
      const at = (u) => { const a = Math.abs(u); return fr.at(u * half, br * (1 - u * u) - br + (a > 0.8 ? 0.8 * (a - 0.8) / 0.2 : 0)) }
      const us = [-1, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1], r = (u) => 0.62 - 0.27 * Math.abs(u) + 0.08 * M.hand
      const limb = (t) => (Math.abs(t) < 1.1 * M.hand ? GEAR.slice(0, 3) : Math.abs(t) > 0.9 * half ? WOOD.slice(0, 2) : WOOD)
      return [...us.slice(1).map((u, i) => sdf.capsule(at(us[i]), at(u), r(us[i]), r(u)).paint((q) => limb(fr.tsw(q)[0]))), sdf.capsule(at(-1), at(1), 0.28).mat(STRING)]
    } },
  quiver: { slots: ["back"], colors: { gear: "brown", wood: "pale", fletch: "white" }, materials: "a leather quiver, arrows' shafts and fletching", strap: true,
    size: "0.95 of the trunk long, its mouth over the main hand's shoulder", is: "a quiver slung across the back, its mouth over the right shoulder, arrows' fletching standing out of it, its strap across the chest",
    make: (X) => {
      const { M, j, F } = X, rq = 0.95 + 0.3 * M.hand, Lq = 0.95 * M.torso, back = j.f.map((v) => -v), z = F.top - 0.55 * M.torso
      const on = onTop(X.P, spineAt(j, z), back, SKIP.back), fr = frame(on.map((v, e) => v + back[e] * (rq + 0.2)), [j.r[0] * 0.45, j.r[1] * 0.45, 1], back), m = Lq / 2
      const arrows = [[-0.45, -0.35], [0.4, -0.45], [0, 0.4], [0.6, 0.35]].flatMap(([s, w], i) => { const t = m + 1.1 + 0.3 * (i % 2)
        return [sdf.capsule(fr.at(m - 1, s, w), fr.at(t + 1.4, s, w), 0.28).mat(WOOD.slice(1)), sdf.capsule(fr.at(t + 0.3, s, w), fr.at(t + 1.7, s * 1.25, w * 1.25), 0.5, 0.42).mat(KEYS.fletch)] })
      return [rod(fr, -m, m, rq, rq * 1.08, (t) => (t > m - 0.9 || t < -m + 0.8 ? GEAR.slice(0, 2) : GEAR.slice(0, 3))), ...arrows]
    },
    // (its strap from the right shoulder across the chest to the left hip, and round the back)
    strap: (F) => (a, z) => Math.abs(z - (F.top + F.waist) / 2 - ((F.top - F.waist) / 2) * Math.sin(a)) < 0.55 },
  // ---- shields
  roundshield: { slots: ["off"], hands: 1, grip: "shield", colors: { face: "red", fit: "iron", wood: "ash" }, materials: "a painted wooden face, an iron rim and boss",
    size: "across 1.1 times the trunk: it covers the side from the shoulder to the hip", is: "a round shield on the forearm: a face a little domed in its color, an iron rim and a boss, the wood of its back",
    make: (X) => {
      const { M, j, A, F } = X, Nf = toward(j, 0.55, 0.85, 0, X.sd), R = 0.55 * M.torso + 0.5, Uf = unit(UP.map((v, e) => v - Nf[e] * Nf[2]))
      const fr = frame(lerp(A.elbow, A.hand, 0.45).map((v, e) => v + Nf[e] * (F.R.arm[1] + 0.8)), Uf, cross(Nf, Uf)), dome = (t, s) => 0.7 * (1 - Math.min(1, (t * t + s * s) / (R * R)))
      const face = inFrame(fr, [-R, R], [-R, R], [-0.5, 1.3], (t, s, w) => Math.max(Math.hypot(t, s) - R, Math.abs(w - dome(t, s)) - 0.45),
        (t, s, w) => { const r = Math.hypot(t, s); return w < dome(t, s) - 0.3 ? WOOD.slice(0, 3) : r > R - 0.9 ? FIT : r > R - 2.1 && r < R - 1.6 ? FACE.slice(0, 3) : FACE })
      return [face, sdf.sphere(1 + 0.15 * M.hand).at(fr.at(0, 0, 1.1)).paint(STEEL_BY)]
    } },
  tallshield: { slots: ["off"], hands: 1, grip: "shield", colors: { face: "navy", fit: "steel", wood: "ash" }, materials: "a painted wooden face, a steel rim",
    size: "0.8 times the trunk and thigh tall (the shoulder to the knee), 0.62 of that wide", is: "a tall shield on the forearm: a flat top, straight sides curving to a point, bowed across, a pale down its face, a steel rim",
    make: (X) => {
      const { M, j, A, F } = X, Nf = toward(j, 0.5, 0.87, 0, X.sd), H = 0.8 * (M.torso + M.thigh), w = 0.31 * H, Uf = unit(UP.map((v, e) => v - Nf[e] * Nf[2]))
      const fr = frame(lerp(A.elbow, A.hand, 0.5).map((v, e) => v + Nf[e] * (F.R.arm[1] + 0.8)), Uf, cross(Nf, Uf))
      const P = [[0.42 * H, -w], [0.42 * H, w], [0.05 * H, w], [-0.2 * H, 0.82 * w], [-0.4 * H, 0.45 * w], [-0.58 * H, 0], [-0.4 * H, -0.45 * w], [-0.2 * H, -0.82 * w], [0.05 * H, -w]]
      return [slab(fr, P, 0.45, (t, s, q) => (q < 0.9 * (1 - (s / w) ** 2) - 0.3 ? WOOD.slice(0, 3) : inPoly(P, t, s) > -0.85 ? FIT : Math.abs(s) < 0.16 * w ? FACE.slice(2) : FACE.slice(0, 3)), 0.9)]
    } },
  // ---- carried
  pack: { slots: ["back"], colors: { pack: "canvas", gear: "brown", fit: "iron" }, materials: "a canvas pack, a rolled blanket, leather straps", strap: true, excl: ["hooddown"],
    why: "the hood down lies on the upper back where the pack sits", size: "1.55 times the chest's half-width across, 0.62 of the trunk tall",
    is: "a backpack on the upper back: a canvas bag with a flap and a buckle, a blanket rolled across its top, its straps over the shoulders",
    make: (X) => {
      const { M, j, F } = X, S = [1.55 * M.chest, 0.75 * M.chest, 0.62 * M.torso], back = j.f.map((v) => -v), z = F.top - 0.42 * M.torso
      const on = onTop(X.P, spineAt(j, z), back, SKIP.back), c = on.map((v, e) => v + back[e] * (S[1] / 2 + 0.05)), yaw = (-Math.atan2(j.f[0], j.f[1]) * 180) / Math.PI
      // (local: x across, y ahead (toward the back's surface), z up: the flap over its top half, its edge lit over a dark row)
      const bag = sdf.box(S, { round: 0.7 }).paint((q) => (q[2] > S[2] * 0.08 ? (q[2] < S[2] * 0.08 + 0.55 ? PACK[0] : Math.abs(q[0]) < 0.45 && q[2] < S[2] * 0.2 ? FIT.slice(1) : PACK.slice(1)) : PACK.slice(0, 3)))
      const roll = sdf.capsule([-S[0] / 2 + 0.3, 0, 0], [S[0] / 2 - 0.3, 0, 0], 1.05 + 0.15 * M.hand).paint((q) => (Math.abs(Math.abs(q[0]) - S[0] * 0.28) < 0.35 ? GEAR.slice(0, 3) : PACK.slice(0, 3))).at(0, -0.15, S[2] / 2 + 0.75)
      return [sdf.union(bag, roll).rotate(yaw, "z").at(c)]
    },
    // (the straps from the pack's top over the shoulders down the front to the armpits)
    strap: (F, M) => (a, z) => Math.abs(Math.abs(a) - 0.62) < 0.17 && z > F.top - 0.48 * M.torso },
  pouch: { slots: ["hip"], colors: { gear: "brown", fit: "bronze" }, materials: "leather, a toggle", size: "by the hand: 2.6 hands wide",
    is: "a belt pouch on the right hip, to the front: a leather bag, its flap over its top with a dark row under its edge, a toggle",
    make: (X) => {
      const { M, j, F } = X, a = 0.6, way = unit([0, 1].map((e) => j.f[e] * Math.cos(a) + j.r[e] * Math.sin(a)).concat(0)), S = [2.6 * M.hand + 0.6, 1.4 * M.hand + 0.4, 2.4 * M.hand + 0.8]
      const on = onTop(X.P, [j.pelvis[0], j.pelvis[1], F.waist - 0.9], way, SKIP.hip), yaw = (-Math.atan2(way[0], way[1]) * 180) / Math.PI
      return [sdf.box(S, { round: 0.5 }).paint((q) => (q[2] > S[2] * 0.05 ? (q[2] < S[2] * 0.05 + 0.5 ? GEAR[0] : Math.abs(q[0]) < 0.4 && q[2] < S[2] * 0.2 ? FIT.slice(1) : GEAR.slice(1)) : GEAR.slice(0, 3)))
        .rotate(yaw, "z").at(on.map((v, e) => v + way[e] * (S[1] / 2 - 0.1) - UP[e] * (S[2] / 2 - 0.9)))]
    } },
  scabbard: { slots: ["hip"], colors: { gear: "brown", fit: "bronze", steel: "steel" }, materials: "a leather scabbard, a locket and a chape, the sword's hilt",
    size: "the sword's blade (by its bearer's arm) and a little more", is: "the sword's scabbard on the left hip, hung back from the belt: the sword's hilt standing out of it forward, or its mouth dark when a hand holds the sword",
    make: (X) => {
      const { M, j, F, W } = X, a = -1.3, way = unit([0, 1].map((e) => j.f[e] * Math.cos(a) + j.r[e] * Math.sin(a)).concat(0)), L = swordLen(M) + 0.6, bw = 0.95 + 0.15 * M.hand
      const on = onTop(X.P, [j.pelvis[0], j.pelvis[1], F.waist - 0.3], way, SKIP.hip), fr = frame(on.map((v, e) => v + way[e] * 0.55), [-j.f[0] * 0.55 + way[0] * 0.15, -j.f[1] * 0.55 + way[1] * 0.15, -1], j.f)
      const drawn = [W.held, W.off].some((q) => q?.key === "sword")
      const sheath = slab(fr, [[0, -bw], [L - 1.4, -bw * 0.8], [L, 0], [L - 1.4, bw * 0.8], [0, bw]], 0.5, (t, s, w, n) => (drawn && t < 0.3 && dot3(n, fr.U) < -0.5 ? STEEL[0] : t < 1 || t > L - 1.2 ? FIT : GEAR.slice(0, 3)))
      if (drawn) return [sheath]
      const h = M.hand, g = frame(fr.at(-0.35), fr.U.map((v) => -v), fr.E)
      return [sheath, sdf.capsule(g.at(0, -1.5 * h - 0.4), g.at(0, 1.5 * h + 0.4), 0.45).mat(FIT), rod(g, 0, 2.1 * h + 0.2, 0.42, 0.42, () => GEAR.slice(0, 3)), sdf.sphere(0.6).at(g.at(2.1 * h + 0.75)).mat(FIT)]
    } },
  lantern: { slots: ["held", "off"], hands: 1, grip: "hang", colors: { fit: "iron" }, materials: "an iron frame, glass lit from within", size: "by the hand: 3.4 hands tall",
    is: "a lantern hung from the fist by its ring: a round glass lit from within, the flame's light a band across its middle, two bars of its iron frame, a cap and a plate",
    make: (X) => {
      // (round: its glass one lit pane all round, the flame's light a band across its middle, two bars of the frame down
      // it, a cap over it and a plate under it; the ring through the fist)
      const { M, j, G } = X, r = 1.1 * M.hand + 0.5, h = 3.4 * M.hand + 1.4, top = G[2] - 1.2, z0 = top - 0.9 - h, head = Math.atan2(j.f[0], j.f[1])
      const glass = sdf.capsule([G[0], G[1], z0 + r], [G[0], G[1], z0 + h - r], r).paint((q) => {
        const a = Math.atan2(q[0] - G[0], q[1] - G[1]) - head, bar = [0.8, -2.35].some((b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) < 0.28)
        return bar ? FIT.slice(0, 2) : Math.abs(q[2] - z0 - h / 2) < 0.6 ? FLAME : GLOW })
      return [sdf.capsule(G, [G[0], G[1], top], 0.3).mat(FIT), sdf.cone(r + 0.5, 1.1, 0.35).mat(FIT).at(G[0], G[1], top - 1), sdf.cylinder(r + 0.35, 0.5).mat(FIT).at(G[0], G[1], z0), glass]
    } },
}
for (const [k, P] of Object.entries(THINGS)) Object.assign(P, { key: k, slot: P.slots[0], hands: P.hands ?? 0, fits: { body: Object.keys(BODIES) } })
const THING_SLOTS = ["held", "off", "hip", "back"]
// what kit.random gives a hand and a back: a few kinds of people's (a swordsman, an archer, a spearman, a woodcutter, one
// with a staff, a traveler), not the slots each drawn alone (a lantern, a mace and a quiver)
const LOADOUTS = [{ held: "sword", off: "roundshield", hip: "scabbard" }, { held: "sword", hip: "scabbard" }, { held: "sword", off: "tallshield", hip: "scabbard" }, { off: "bow", back: "quiver", hip: "pouch" },
  { held: "spear", off: "tallshield" }, { held: "spear", back: "pack" }, { held: "axe", hip: "pouch" }, { held: "mace", off: "roundshield" }, { held: "quarterstaff", back: "pack" },
  { held: "magestaff", hip: "pouch" }, { held: "magestaff", off: "lantern" }, { back: "pack", off: "lantern", hip: "pouch" }, { held: "shortblade", hip: "pouch" }, { held: "shortblade", off: "lantern" }]
// what it holds and carries, made on the joints after what it wears, which the hip's and the back's lie on
const carried = (F, W, B, P) => {
  const { j } = F, M = measure(B), out = {}
  for (const s of THING_SLOTS) {
    const T = W[s]
    if (!T) continue
    const i = s === "off" ? 0 : 1, X = { j, F, W, B, M, P, s, sd: i ? 1 : -1, A: j.arms[i], G: fistOf(F, j.arms[i]) }
    out[s] = T.make(X)
    if (T.strap) out[`strap_${s}`] = strap(F, W, T.strap(F, M))
  }
  return out
}

// ---------------------------------------------------------------- the catalog and the slots
// Every slot a spec names, in the order a figure is put together; the empty ones are named for the parts to come
// (ears, horns and a muzzle on a human skull: the wolf's head carries its own; gloves are a piece still to make in the
// arms' slot). The skin is a color.
const SLOTS = ["body", "skin", "head", "face", "ears", "horns", "muzzle", "hair", "beard", "headwear", "torso", "over", "legs", "feet", "arms", "belt", "apron", "cloak", "held", "off", "hip", "back", "tail", "mane", "hands"]
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
  ...HEADS, ...FACES, ...PARTS, ...Object.fromEntries(Object.entries(BEAST).flatMap(([s, T]) => Object.entries(T).map(([k, t]) => [`${k}_${s}`, t]))),
  // (the flat cap and the bandana as headwear beside the crew's hairs that have them welded on)
  ...Object.fromEntries(Object.entries(HATS).map(([k, P]) => [PARTS[k] ? `${k}_headwear` : k, P])),
  ...THINGS,
  ...Object.fromEntries(Object.entries(OUTFITS).map(([k, o]) => [`${k}_outfit`, { slot: "outfit", is: `a whole outfit: ${Object.values(o).join(", ") || "the bare mannequin"}`, set: o }])),
}

// ---------------------------------------------------------------- a character from a spec
// spec: { body, head, face, hair, beard, headwear, outfit, torso, over, legs, feet, arms, belt, apron, cloak, held, off, hip,
// back, tail, colors: { torso, trim, over, legs, feet, belt, apron, cloak, hat, band, helm, metal, wood, steel, fit, gear,
// face, pack, gem, fletch, skin, hair, fur, eyes }, seed, moves, dirs }: each slot a part's name ("none"
// leaves it empty), a whole outfit the pieces it doesn't name; with `seed` what it doesn't say is drawn (kit.random's),
// else the defaults (his body, his head and hair, his outfit's pieces; his cloak and belt only by name). `dirs` some of
// the 8 directions (the four diagonals: ["sw", "nw"], the others their mirrors; carrying a thing, each one drawn and
// named: ["sw", "se", "nw", "ne"]). A spec that doesn't fit is refused with the reason. The figure is made once per
// body, head, pieces and things; the colors a swap. Things share their colors by material (a spec's `fit` the guard's,
// the scabbard's and the shield's rim's), the main hand's thing's own where the spec says none.
const figures = new Map()
const MOVES = T.MOVES, STAND = { stand: { frames: 1, ms: 250, pose: MOVES.idle.pose } }
const partOf = (slot, name) => {
  if (name === undefined || name === "none") return undefined
  const thing = THING_SLOTS.includes(slot), P = slot === "head" ? HEADS[name] : slot === "face" ? FACES[name] : slot === "headwear" ? HATS[name] : BEAST[slot] ? BEAST[slot][name] : thing ? THINGS[name] : PARTS[name]
  if (thing && P && !P.slots.includes(slot)) throw new Error(`kit: the ${slot} slot doesn't take the '${name}': it goes in the ${P.slots.join(" or the ")}${P.whySlot ? ` (${P.whySlot})` : ""}`)
  if (!P || (!thing && P.slot !== slot)) throw new Error(`kit: no ${slot} '${name}' (${(thing ? Object.values(THINGS).filter((q) => q.slots.includes(slot)) : Object.values(parts).filter((q) => q.slot === slot && q.key)).map((q) => q.key).join(", ") || "none yet"})`)
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
  for (const k of ["ears", "horns", "muzzle"]) if (s[k] !== undefined && s[k] !== "none") throw new Error(`kit: the ${k} slot has no parts yet`)
  const W = Object.fromEntries([...WEAR, "face", "hair", "beard", "headwear", ...THING_SLOTS].map((k) => [k, partOf(k, s[k])]))
  return W
}
const character = (name, spec = {}) => {
  const s = fillOf(spec), B = body(s.body), H = partOf("head", s.head), W = wearing(s), why = check(W, H)
  if (why) throw new Error(`kit.character '${name}': ${why}`)
  const onHead = [W.hair, W.beard].filter(Boolean), moves = s.moves ? Object.fromEntries(s.moves.map((m) => [m, MOVES[m]])) : STAND
  // (a thing on the hip brings its own belt where none is worn)
  if (W.hip && !W.belt) W.belt = PIECES.belt
  const pieces = WEAR.map((k) => W[k]).filter(Boolean), hw = W.headwear, things = THING_SLOTS.filter((k) => W[k])
  for (const k of BEASTLY) W[k] = partOf(k, s[k])
  const fc = W.face?.approved || W.face?.own ? undefined : W.face
  const key = JSON.stringify([B.name, H.key, onHead.map((P) => P.key), pieces.map((P) => P.key), BEASTLY.map((k) => W[k]?.key), Object.keys(moves), s.dirs, ...(hw ? [hw.key] : []), ...(things.length ? [things.map((k) => `${k}:${W[k].key}`)] : []), ...(fc ? [fc.key] : [])])
  if (!figures.has(key)) {
    // (the cell: rig3d's, every part's box at every frame and heading; the head's reach the stand-in for the head stamped
    // by hand, so a bun, a braid, a muzzle or a hat's brim is inside it. What the hands hold and the back carries kept
    // over the head where it is nearer, its arms posed by their grips; and every view drawn, none the mirror of another:
    // a sword in the right hand stays in the right hand)
    const fn = `_kf${figures.size}`, reach = Math.max(H.reach, ...onHead.map((P) => P.reach ?? 0), hw?.reach ?? 0)
    figures.set(key, { fn: own(fn), R: rig3d(fn, { ...T.FIG, w: undefined, h: undefined, pivot: undefined, body: { ...B.body, r: { ...rOf(B), head: reach } }, head: headOf(H, onHead, hw, fc),
      parts: worn(B, W), ...(things.length ? { over: THING_SLOTS, mirror: false } : {}),
      moves: Object.fromEntries(Object.entries(moves).map(([m, M]) => [m, { ...fitMove(gripMove(M, W), B), ...(s.dirs ? { dirs: s.dirs } : {}) }])) }) })
  }
  // (a hood belongs to the cloak worn with it: its colors unless the spec gives the hat's)
  const colors = hw?.withCloak && W.cloak && s.colors?.hat === undefined ? { ...s.colors, hat: s.colors?.cloak ?? W.cloak.colors.cloak } : s.colors
  const { R, fn } = figures.get(key), pre = fn.length, swap = swapOf(H.fur ? { fur: H.fur, ...colors } : colors, [...pieces, ...(hw ? [hw] : []), ...things.map((k) => W[k]).reverse()], W.hair?.hat)
  if (W.face?.grey) for (const k of "zsSL") swap[k] = greyed(swap[k])
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
    const b = pick(Object.keys(BODIES)), head = BODIES[b].head ?? "human", of = (slot) => Object.values(PARTS).filter((P) => P.slot === slot && P !== HAIRPARTS.short && (!P.fits || P.fits.head.includes(head))).map((P) => P.key)
    const whole = r() < 0.4, set = OUTFITS[pick(Object.keys(OUTFITS).filter((k) => k !== "bare"))], maybe = (slot, k) => (r() < k ? pick(of(slot)) : "none")
    // (a face of the head's, the approved one a time in four; a beard a time in three, on a man's cut)
    const faces = Object.values(FACES).filter((P) => P.fits.head.includes(head)).map((P) => P.key), face = r() < 0.25 ? faces[0] : pick(faces)
    const s = { body: b, head, face, hair: of("hair").length ? pick(of("hair")) : "none", beard: head === "human" && !face.endsWith("_f") && r() < 0.33 ? pick(of("beard")) : "none",
      ...(whole ? set : { torso: pick(of("torso")), over: maybe("over", 0.5), legs: pick(of("legs")), feet: pick(of("feet")), arms: pick(of("arms")), belt: maybe("belt", 0.4), apron: maybe("apron", 0.2) }),
      cloak: r() < 0.25 ? "travel" : "none",
      colors: { torso: pick(["white", "linen", "tweed", ...cloth]), trim: pick(cloth), over: pick(cloth), legs: pick(cloth), feet: pick(leather), belt: pick(leather), apron: pick(leather), cloak: pick(cloth), hat: pick(cloth), metal: pick(metal),
        ...(head === "wolf" ? { fur: pick(Object.keys(FURS)) } : { skin: pick(["fair", "tan", "brown", "deep"]), hair: pick(Object.keys(HAIRS)) }), eyes: pick(Object.keys(EYES)) } }
    const W = wearing(fillOf(s))
    if (check(W, HEADS[head])) continue
    // (headwear on two heads in five, of the pieces that fit the head and the hair: drawn last, so a seed's other parts
    // are what they were before there was headwear; short hair under it a time in three where the hair is the crew's
    // welded cap or bandana)
    if (r() < 0.4) {
      const hair = W.hair?.covers ? (r() < 0.34 ? HAIRPARTS.short : HAIRPARTS.tousled) : W.hair, fit = Object.values(HATS).filter((P) => !check({ ...W, hair, headwear: P }, HEADS[head]))
      if (fit.length) { const P = pick(fit); Object.assign(s, { hair: hair?.key ?? "none", headwear: P.key }); Object.assign(s.colors, { hat: P.material === "straw" ? "straw" : P.material === "leather" ? pick(leather) : s.colors.hat, helm: pick(Object.keys(METALS)), band: pick(cloth) }) }
    }
    // (what the hands hold and the back carries, a time in two, drawn after the rest for the same reason: a loadout, its
    // things dropped, the back's first, until it fits what is worn)
    if (r() < 0.5) {
      const L = { ...pick(LOADOUTS) }, W2 = wearing(fillOf(s))
      for (const k of ["back", "hip", "off", "held"]) { if (!check({ ...W2, ...Object.fromEntries(THING_SLOTS.map((q) => [q, L[q] && THINGS[L[q]]])) }, HEADS[head])) break; delete L[k] }
      Object.assign(s, L)
      Object.assign(s.colors, { wood: pick(Object.keys(WOODS)), steel: pick(["steel", "iron", "steel", "silver"]), fit: pick(Object.keys(FITS)), gear: pick(leather), face: pick(cloth), pack: pick(["canvas", "linen", "tweed", "olive", "brown"]), gem: pick(Object.keys(GEMS)) })
    }
    return s
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

// a head alone in its colors, its views as a character's: <name>_<dir> in the 8 directions (its head, hair, beard,
// headwear and colors from a spec)
const head = (name, spec = {}) => {
  const s = fillOf(spec), H = partOf("head", s.head), W = wearing(s), why = check(W, H)
  if (why) throw new Error(`kit.head '${name}': ${why}`)
  const h = headOf(H, [W.hair, W.beard].filter(Boolean), W.headwear, W.face), swap = swapOf(H.fur ? { fur: H.fur, ...s.colors } : s.colors, W.headwear ? [W.headwear] : [], W.hair?.hat)
  if (W.face?.grey) for (const k of "zsSL") swap[k] = greyed(swap[k])
  for (const d of ["n", "ne", "e", "se", "s", "sw", "w", "nw"]) sprite(`${name}_${d}`, { base: `${h}_${d}`, swap })
  return name
}
// a thing alone, held or carried where a body (the medium one unless `body`) holds or carries it, the body not drawn:
// <name>_stand_<dir> (in `slot`, its first unless said; its colors `colors`)
let thingsMade = 0
const thing = (name, key, o = {}) => {
  const B = body(o.body ?? "medium"), P = THINGS[key], s = o.slot ?? P?.slot, W = { [s]: partOf(s, key) }
  // (a material named, so the ramps its paints name are taken as they come: with none, surface() gives a name found as
  // the field is traced the palette's first ramp)
  const fn = `_kt${thingsMade++}`, R = rig3d(fn, { ...T.FIG, w: undefined, h: undefined, pivot: undefined, body: { ...B.body, r: rOf(B) }, mirror: false, mats: { [WOOD]: WOOD },
    parts: (j) => { const F = frameOf(j, B), out = carried(F, W, B, bare(F)); return Object.fromEntries(Object.entries(out).filter(([k]) => !k.startsWith("strap"))) },
    moves: { stand: { ...fitMove(gripMove(STAND.stand, W), B), ...(o.dirs ? { dirs: o.dirs } : {}) } } })
  const pre = own(fn).length, swap = swapOf(o.colors, [P])
  for (const n of R.names) anim(name + n.slice(pre), { base: n, swap })
  return name
}
Object.assign(kit, { character, random, randomSpec, head, thing, check: (spec) => { const s = fillOf(spec); return check(wearing(s), partOf("head", s.head)) }, body, blocks, parts, SLOTS, OUTFITS, KEYS, RAMPS, SKINS, HAIRS, FURS, HEADS, FACES, EYES, HATS, METALS, BEAST, THINGS, GRIPS, WOODS, GEMS,
  fit: { drape: fitDrape, move: fitMove }, BODIES })

// ---------------------------------------------------------------- the library's entries
// each body as flat blocks (bk_<body>_stand_<dir>), and as the bare mannequin (mannequin_<body>_stand_<dir>): drafts
for (const b of Object.keys(BODIES)) {
  blocks(b, b)
  character(`mannequin_${b}`, { body: b, outfit: "bare", hair: "none" })
  card(`mannequin_${b}`, { is: `the kit's mannequin, ${BODIES[b].is}, bare (a draft)`, cells: { "hd2d/24ppm": "✎" },
    vary: { part: "kit.character(name, spec): a body, head, face, hair, beard, headwear, torso, over, legs, feet, arms, belt, apron, cloak, held, off, hip, back, colors by slot (kit.parts); kit.random(name, seed); its blocks bk_" + b + "_stand_<dir>" } })
}
}
