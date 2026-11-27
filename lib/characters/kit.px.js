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
//   kit.character("aldric", { outfit: "knight", face: "stern", hair: "short", headwear: "helmet", held: "sword", off: "tallshield",
//     colors: { apron: "plum", device: "mustard", plate: "steel" } })
//   kit.character("brann", { body: "short", torso: "gambeson", over: "breastplate", belt: "faulds", shins: "greaves", feet: "boots",
//     legs: "trousers", colors: { plate: "bronze", shins: "bronze" } })   // pieces of the knight's on a dwarf, no tabard
//   kit.random("someone", 7)
// Armor and the classes' outfits are pieces in the same slots (and three more: mail, shoulders, shins; gauntlets in the
// hands' slot): kit.OUTFITS names ten generic classes (knight, manatarms, ranger, rogue, mage, cleric, monk, barbarian,
// noble, peasant), each a set of pieces any of which mixes into another spec.
// Each makes <name>_stand_<dir> in the profile's 8 directions (the idle's first frame; `moves: ["idle", "walk"]` the
// traveler's moves instead, fitted to the body, everything worn and carried following by the skeleton: the idle's first
// frame is the stand; kit.pace(spec, dir) the walk's pace, px a frame) and a group <name>, and gives back its spec with the figure's cell
// ({ w, h, pivot }). kit.parts is the catalog, kit.check(spec) the reason a spec doesn't fit (or nothing), kit.body(preset |
// numbers) a mannequin, kit.blocks(name, body) its flat blocks (bk_<name>_<move>_<dir>), kit.head(name, spec) a head alone in
// its colors (<name>_<dir>), kit.HATS the headwear (each its rules: what of the hair it covers, what it does to the face,
// the heads it fits, its layer, its materials), kit.FACES the faces (each its views painted by hand; kit.EYES the eyes'
// colors), kit.THINGS what a hand holds and the hip and the back carry (each its slots, the hands it takes, its grip, its
// size by the body, what it excludes, its materials), kit.thing(name, key) one alone as it is held.
// The fighting moves (a draft), asked by name as the others are and chosen by what the hands hold: `ready`, `slash`,
// `thrust`, `shoot`, `conjure`, `cast`, `block`, `dodge`, `hurt`, `weak`, `downed`, `dead` (kit.FIGHT their frames and ms, a slash's `heavy` with an
// axe or a mace; a mage's staff in one hand or both, the spec's `staff: "one" | "two"`; one
// that doesn't fit what is held is refused with the reason, kit.check says it too), each in the 8 directions, all eight
// drawn. Each frame sets the anchors a game reads (its sockets, in the frame's px, in the sheet's JSON): `head_top`, `center`,
// `main` and `off` the fists on every move, plus `tip` the held thing's point or head (an arrow's nock), `hit` on the strike's frame, `shield` its middle,
// `cast` the light; kit.fit.fight(move, spec) a move as fitted to the spec's body (its poses, and `flaws(i, heading)`:
// what a human couldn't do left in a frame). Every fighting frame is kept clear by a collision model of the worn figure
// (the trunk as worn, the head with its hair and headwear, the legs, the arms, what the hands hold), within a human's
// reach, before anything is drawn (solve(), below).
//   kit.character("bors", { outfit: "knight", held: "sword", off: "roundshield", moves: ["ready", "slash", "block", "dodge", "hurt", "downed", "dead"] })
//   kit.export("bors", { outfit: "knight", held: "sword", off: "roundshield" }, { layout: "atlas", dirs: "4", moves: "combat", format: "grid" })
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
      r: { leg: [2.25, 2.05, 1.9], arm: [1.65, 1.5, 1.4], body: [4.6, 5.7], hand: 1.45, foot: [1.95, 2.8, 1.3] } }, deep: 0.96, layerScale: 0.78,
    // (fighting, the short body's own way: its hips drop deeper as a share of its leg (half of it at the strike) and its
    // feet stand wider; its arms are short on a deep chest, so the whole trunk leans and turns into the blow (`lean`,
    // `twist`: the swing round the stance's own), the striking arm goes out straight (`reach`), and a wind-up rises lower
    // and wider (`windup`: px down, px out) so nothing crosses the big head)
    fight: { crouch: 1.8, stance: 1.25, lean: 1.5, twist: 1.5, reach: true, windup: [1.2, 1.6] } },
  // 45 px, 4 heads: the legs 1.7 his, the arms 1.6, the torso 1.3, fuller heroic limb taper; the elbows soft
  tall: { is: "tall: 45 px, 4 heads, long limbs, at ease",
    body: { h: 45, heads: 4, hip: 19, torso: 13, neck: 7.4, thigh: 9, shin: 8.6, upper: 5.4, fore: 5, ankle: 1.4, hips: 2.1, shoulders: [0.25, 4.62, -0.92],
      r: { leg: [2.15, 1.75, 1.4], arm: [1.35, 1.22, 1.08], body: [3.9, 4.28], hand: 1.15, foot: [1.5, 2.7, 1.2] } }, ease: 0.996, armOut: 0.50 },
  // 41.5 px, 3.1 heads: hulking, broad-shouldered, massively muscled powerhouse with wide power stance and thick pillar legs
  large: { is: "large and heavily muscled: 41.5 px, massive barrel chest, thick arms, wide-stanced muscular thighs and low heavy neck",
    body: { h: 41.5, heads: 3.1, hip: 15.8, torso: 12.6, neck: 5.4, thigh: 7.4, shin: 7.0, ankle: 1.4, upper: 5.5, fore: 5.0, hips: 3.35, shoulders: [1.0, 6.9, -1.2],
      r: { leg: [3.35, 2.75, 2.15], arm: [2.45, 2.2, 2.0], body: [4.8, 6.7], hand: 1.85, foot: [2.3, 3.1, 1.55] } }, deep: 0.96, layerScale: 0.82, ease: 0.98, lean: 6 },
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
const asPure = (data, fn) => { try { return pure(data, fn) } catch { return fn } }
const fitDrape = (D, B) => {
  const b = B.body, m0 = marks(TB), m1 = marks(b), top0 = D.top(rest(TB)), hem = top0 - D.len
  let i = 0
  while (i < 3 && hem > m0[i + 1]) i++
  const t = (hem - m0[i]) / (m0[i + 1] - m0[i]), span = (m, top) => top - (m[i] + t * (m[i + 1] - m[i]))
  const k = D.base === "pelvis" ? 0 : 1, kw = rOf(B).body[k] / dress.r.body[k]
  return { ...D, len: D.len * (span(m1, D.top(rest(b))) / span(m0, top0)), radius: asPure({ rad: D.radius, kw }, (h, a) => rad(h, a) * kw) }
}
// (a body's own way to fight (its `fight`): the trunk leaning further into the blow, the shoulders swinging further round
// the stance's twist (an archer's not: his shoulders keep to the aim), the striking hand out straight on the strike and
// the follow-through, a wind-up's hand lower and wider; the medium's poses read in its proportions)
const bodyFight = (p, fc, b) => {
  // (the lean grown, but never past 30 degrees where the move's own was under it: a big head pitched further reads as a fall)
  const ln = p.lean ?? 0, bow = p.hold?.[0]?.way, q = { ...p, hands: p.hands.slice(), ...(fc.lean ? { lean: Math.sign(ln) * Math.min(Math.abs(ln) * fc.lean, Math.max(Math.abs(ln), 30)) } : {}), ...(fc.twist && !bow ? { twist: 20 + ((p.twist ?? 0) - 20) * fc.twist } : {}) }
  q.head = (p.head ?? 0) - ((q.twist ?? 0) - (p.twist ?? 0))
  const m = q.hands[1]
  // (its arms too short to cut across a deep chest: the strike and the follow-through kept out on the weapon's side)
  if (fc.reach && (p.strike || p.smear) && !p.grip && p.hold?.[1]?.aim) { const out = [m[0], Math.max(m[1], 0) + 1.5, m[2]], l = Math.hypot(...out) || 1; q.hands[1] = out.map((v) => (v * (TB.upper + TB.fore) * 0.98) / l) }
  if (fc.windup && p.windup && !p.grip) q.hands[1] = [m[0], m[1] + fc.windup[1], m[2] - fc.windup[0]]
  return q
}
const fitMove = (M, B, model) => {
  const b = B.body, R = rOf(B), L = (b.thigh + b.shin) / (TB.thigh + TB.shin), W = b.hips / TB.hips, A = (b.upper + b.fore) / (TB.upper + TB.fore)
  const reach = (b.upper + b.fore) * (B.ease ?? 2), clear = R.body[0] + 0.6 * R.hand - b.shoulders[1], rw = B.armOut ?? Math.min(A, R.body[1] / dress.r.body[1])
  const hand = (q, k, p) => {
    let [f, r, u] = [q[0] * A, q[1] * (p.free ? A : rw), q[2] * A]
    // (out from the shoulder, toward the side the arm is on: k 0 the left; a fighting pose's (`free`) kept clear by the
    // collision model instead: solve(), below)
    const out = k ? r : -r
    if (!p.free && u < -2 && out < clear) r = k ? clear : -clear
    const d = Math.hypot(f, r, u)
    if (d > reach) u = -Math.sqrt(Math.max(0, reach * reach - f * f - r * r))
    return [f, r, u]
  }
  // (both hands on one line, a thing carried in both: its ends [forward, right, up] from under the pelvis, forward and
  // across by the arms, up by the height to the shoulders)
  // (and carried with the body: down by its bob, forward by its lean over the hips)
  const U = (b.hip + b.torso) / (TB.hip + TB.torso), solved = new Map()
  const fit = (i, h) => {
    const p0 = M.pose(i, h), fc = (p0.free && !p0.fallen && !p0.kneel && B.fight) || {}, p = fc.lean || fc.twist ? bodyFight(p0, fc, b) : p0
    // (fallen: pelvis lowered so the rolled torso rests on the ground, legs extended down via negative lift so after roll they lie stretched flat along the ground)
    const rawDn = p.fallen ? b.hip - Math.max(b.ankle + 1.2, R.body[0] + 0.7) : (p.down ?? 0) * L * (fc.crouch ?? 1)
    const dn = p.fallen ? rawDn : Math.min(rawDn, Math.max(0, b.hip - b.ankle - 1.2))
    const ln = Math.tan((((p.lean ?? 0) + (p.fallen ? 0 : B.lean ?? 0)) * Math.PI) / 180)
    const end = ([f, r, u]) => [f * A + Math.max(0, u * U - dn - b.hip) * ln, r * W, u * U - dn]
    const lift = p.fallen ? [-dn + 1.1 * L, -dn + 0.45 * L] : p.lift.map((v) => v * L)
    const feet = p.fallen ? [[0.6 * L, -b.hips * 1.05], [-0.4 * L, b.hips * 1.1]] : p.feet.map(([f, r]) => [f * L, r * W * (fc.stance ?? 1)])
    const fk = R.foot[1] / dress.r.foot[1], heel = p.heel && !p.fallen ? p.heel.map((v) => v * fk) : undefined
    const q = { ...p, feet, lift, ...(heel ? { heel } : {}), down: dn, hands: p.hands.map((q, k) => hand(q, k, p)), ...(B.lean && !p.fallen ? { lean: (p.lean ?? 0) + B.lean } : {}),
      ...(p.swing ? { swing: p.swing.map((q) => q.map((v) => v * A)) } : {}), ...(p.grip ? { grip: { ...p.grip, from: end(p.grip.from), to: end(p.grip.to) } } : {}) }
    return q
  }
  // (a fighting pose kept clear of the body as worn, within a human's limits, by the collision model (solve, with the
  // fighting moves); once a frame and heading. `raw` the pose as fitted, before)
  return { ...M, pose: (i, h) => {
    const q = fit(i, h), key = M.fight ? `${i},${q.turn ?? 0},${q.twist ?? 0}` : `${i},${h}`
    if (!q.free || q.fallen || !model) return q
    if (!solved.has(key)) solved.set(key, solve(q, model))
    return solved.get(key)
  }, ...(model ? { raw: fit } : {}) }
}
// the trunk as worn, px from the spine ahead and at the side over the belly and the chest (the bare chest's, its layers'
// out to the outermost; a breastplate's swell ahead and a tabard over it; a cloak at the sides): what a fighting fist
// keeps out of
const wornR = (W, B) => {
  const kb = rOf(B).body[1] / dress.r.body[1], n = (s) => (W[s] ? (typeof W[s].n === "function" ? W[s].n(W) : W[s].n ?? W[s].layer) : 0), ns = Math.max(1, n("torso"), n("mail"), n("over"), W.cloak ? Math.max(4, outerOf(W) + 0.5) : 0)
  const nf = Math.max(1, n("torso"), n("mail"), n("over"), n("apron"), /^breastplate/.test(W.over?.key ?? "") ? 6.3 + (W.apron ? 1.9 : 0) : 0)
  return { f: 4 * kb * (B.deep ?? 0.84) + T0 * (nf - 1), s: 4 * kb + T0 * (ns - 1) }
}
// In motion, what hangs follows a frame behind (characters §10: the head leads, then the arms, then the hair): its loose
// end is where its root was a frame before, by `give` (its share of that): back by the way the body went in a frame (the
// walk's pace, his gait()'s, over the legs' length), up by the bob since then (the body going down leaves it up), across
// by the family's sway (the cloak's: already a frame behind). A move's pose carries it as `lag` [back, across, up] px;
// the stand and the idle's first frame carry none, so they are what they were.
const DIRS8 = ["n", "ne", "e", "se", "s", "sw", "w", "nw"]
const paceOf = (B, dir) => T.pace(dir) * (B.body.thigh + B.body.shin) / (TB.thigh + TB.shin)
// (a fighting move's: back by how far the chest went forward with the lean, across by the shoulders' twist, never quite
// none, so the hair's tails hang from the head in every frame of it)
const lagMove = (M, m, B) => ({ ...M, pose: (i, h) => {
  const p = M.pose(i, h), q = M.pose((i + M.frames - 1) % M.frames, h)
  const lag = M.fight ? [0.15 * (p.lean - q.lean) || 0.01, -0.04 * ((p.twist ?? 0) - (q.twist ?? 0)), (p.down ?? 0) - (q.down ?? 0)]
    : [m === "walk" ? paceOf(B, DIRS8[Math.round(h / 45) % 8]) : m === "run" ? paceOf(B, DIRS8[Math.round(h / 45) % 8]) * 1.55 : 0, m === "walk" || m === "run" ? p.sway ?? 0 : 0, (p.down ?? 0) - (q.down ?? 0)]
  return lag.some((v) => v) ? { ...p, lag } : p
} })
// a point on a hanging thing `give` of the way to following (its root's own share 0, its end's 1): where it hangs now
const hung = (F, q, give) => (F.lag ? q.map((v, e) => v + give * (-F.j.f[e] * F.lag[0] + F.j.r[e] * 0.7 * F.lag[1] + (e === 2 ? F.lag[2] : 0))) : q)

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
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
const unit = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l] }
// a frame's shared measures: the waist, the crotch, the chest's top, the trunk's radius by height and angle (the hips'
// under the waist, the chest's over it) grown by n layers, its sweeps carried along the spine as he leans
const KEEP_COLLAR = pure({}, (h, a) => Math.abs(a) > 0.42)
const KEEP_JERKIN = pure({}, (h, a) => !(Math.abs(a) < 0.28 && h > 0.88))
const KEEP_MAIL = pure({}, (h, a) => !(Math.abs(a) < 0.35 && h > 0.93))
const KEEP_PLATE = pure({}, (h, a) => !(h > 0.9 && Math.abs(a) < 0.5))
const KEEP_RIM = pure({}, (h, a) => !(Math.abs(a) < 0.5))
const KEEP_ROBE = pure({}, (h, a) => !(Math.abs(a) < 0.3 && h > 0.86))
const frameOf = (j, B, digi = false, skin, bony = false) => {
  // (the bare limbs a layer under the family's: trousers and sleeves, one layer, are his size)
  const R0b = rOf(B), R = { ...R0b, leg: R0b.leg.map((v) => v - TL), arm: R0b.arm.map((v) => v - 0.25) }, kb = R.body.map((v, i) => v / dress.r.body[i]), deep = B.deep ?? 0.84
  const t0 = T0 * (B.layerScale ?? 1)
  const waist = j.pelvis[2] + 1.4, top = j.chest[2] + 0.5, crotch = waist - 1.4 - 0.6 * R.leg[0], lean = [j.chest[0] - j.pelvis[0], j.chest[1] - j.pelvis[1], j.chest[2] - j.pelvis[2]]
  // (the bare trunk a layer under the family's tunic: a shirt, one layer, is his size; continuous across the waist and tapered cleanly front/back into the thighs at the crotch)
  const trunk = pure({ waist, crotch, top, kb0: kb[0], kb1: kb[1], deep, t0 }, (z, a, n) => {
    const w0 = 3.9 * kb0, w1 = 4 * kb1, wTop = 3.72 * kb1
    let r
    if (z < waist) {
      const t = Math.max(0, (z - crotch) / (waist - crotch)), fb = Math.cos(a) ** 2
      r = (3.72 + 0.18 * t) * kb0 * (1 - 0.06 * (1 - t) * fb)
    } else {
      const t = Math.min(1, (z - waist) / (top - waist)), s = Math.min(1, t / 0.35)
      r = w0 + (w1 - w0) * s * s * (3 - 2 * s) - (w1 - wTop) * t * t
    }
    return r * (deep + (1 - deep) * Math.abs(Math.sin(a))) + (n - 1) * t0
  })
  const pZ = j.pelvis[2], lx = lean[2] ? lean[0] / lean[2] : 0, ly = lean[2] ? lean[1] / lean[2] : 0, hasLean = !!(lx || ly)
  const shift = (z) => { if (!hasLean || z <= pZ) return [0, 0]; const t = z - pZ; return [lx * t, ly * t] }
  const shiftFn = (z0, z1) => pure({ z0, dz: z1 - z0, pZ, lx, ly }, (h) => { const z = z0 + h * dz; return z <= pZ ? [0, 0] : [lx * (z - pZ), ly * (z - pZ)] })
  const hips = [j.pelvis[0], j.pelvis[1], 0]
  // a sweep round the trunk from z0 to z1, n layers out (number or (z, a) => number)
  const wrap = (z0, z1, n, o = {}) => {
    const dz = z1 - z0
    const rad = typeof n === "function" ? asPure({ z0, dz, n, trunk }, (h, a) => { const z = z0 + h * dz; return trunk(z, a, n(z, a)) }) : pure({ z0, dz, n, trunk }, (h, a) => trunk(z0 + h * dz, a, n))
    if (!hasLean || z1 <= pZ || o.shift !== undefined) return j.sweep(hips, z0, z1, rad, o)
    return j.sweep(hips, z0, z1, rad, { shift: shiftFn(z0, z1), ...o })
  }
  const farOf = (a, b) => { const d = j.depth(a) - j.depth(b); return Math.abs(d) < 0.25 ? -1 : d < 0 ? 0 : 1 }
  const farLeg = farOf(j.legs[0].hip, j.legs[1].hip), farArm = farOf(j.arms[0].sh, j.arms[1].sh)
  // (the radius of the rigid or swelling pieces worn round the trunk so far, at a height and an angle (0: none): what a
  // tabard or the faulds hang over, never inside)
  const shells = [], shell = (z, a) => { let m = 0; for (const f of shells) m = Math.max(m, f(z, a)); return m }
  return { j, R, kb, waist, top, crotch, ankle: B.body.ankle, t0, deep, digi: !!(digi || B.digi), bony: !!bony, trunk, wrap, hips, farLeg, farArm, skin: skin ?? B.skin ?? SKIN, shells, shell, shiftAt: shift, shiftFn, hasLean, pZ, lx, ly }
}
// digitigrade / unguligrade hind-leg joint helper: massive forward muscular thigh/stifle, solid rear hock, sturdy forward-angled cannon bone
const digiJoints = (F, L) => {
  const sc = Math.hypot(L.hip[0] - L.ankle[0], L.hip[1] - L.ankle[1], L.hip[2] - L.ankle[2]) / (TB.thigh + TB.shin)
  const ff = unit([L.toe[0] - L.heel[0], L.toe[1] - L.heel[1], 0])
  const sd = dot3([L.hip[0] - F.j.pelvis[0], L.hip[1] - F.j.pelvis[1], 0], F.j.r) >= 0 ? 1 : -1
  const k0 = lerp(L.hip, L.knee, 0.56), h0 = lerp(L.knee, L.ankle, 0.18)
  const stifle = [k0[0] + ff[0] * 2.35 * sc + F.j.r[0] * sd * 0.42 * sc, k0[1] + ff[1] * 2.35 * sc + F.j.r[1] * sd * 0.42 * sc, k0[2] + 0.35 * sc]
  const hock = [h0[0] - ff[0] * 2.2 * sc + F.j.r[0] * sd * 0.16 * sc, h0[1] - ff[1] * 2.2 * sc + F.j.r[1] * sd * 0.16 * sc, Math.max(L.ankle[2] + 2.2 * sc, h0[2] + 0.3 * sc)]
  const fetlock = lerp(hock, L.ankle, 0.78)
  return { stifle, hock, fetlock, ff, sc }
}
// a painted piece as a field (for the halves melted into the thighs)
const fieldOf = (q) => typeof q.paint === "string" ? q.field.mat(q.paint) : typeof q.paint !== "function" ? q.field
  : q.field.paint((p, n) => { const [h, a, out] = q.at(p); return q.paint(h, a, dot3(n, out) >= 0) })
// a sweep round the hips halved through the pelvis, each half melted into its leg's pieces (no line where a thigh meets
// the hips: one shape from the waist down), each leg a part of its own (the near leg's line over the far)
const halved = (F, seat, legs, name) => {
  const { j } = F, d = dot3(j.pelvis, j.r)
  return Object.fromEntries(legs.map((ps, i) => [`${name}${i}`, sdf.union(sdf.union(fieldOf(seat(i)).intersect(i ? sdf.plane(j.r.map((v) => -v), -d) : sdf.plane(j.r, d)), fieldOf(ps[0]), { smooth: 0.9 }), ...ps.slice(1).map(fieldOf))]))
}
// a foot (bare, or a shoe's grown by g px): from its heel just behind the shin to its toe ahead, as wide as the ankle
const foot = (F, L, g, paint) => {
  const r = F.R.leg[2], [, half0, up] = F.R.foot, half = F.digi ? half0 * 0.72 : half0, d = unit([L.toe[0] - L.heel[0], L.toe[1] - L.heel[1], 0]), ahead = half - (F.digi ? 0.55 : 0.8) * r
  const dz = F.mounted ? L.ankle[2] - F.ankle : 0
  return F.j.ball([L.ankle[0] + d[0] * ahead, L.ankle[1] + d[1] * ahead, up + g * 0.5 + dz], [r * (F.digi ? 1.0 : 1.05) + g, half + g, up + g * 0.5], paint)
}
// a hand: a mitten at the end of the forearm, on from the wrist along it, a little wider than the wrist, not a ball on it
const hand = (F, A, paint) => {
  const d = unit(A.hand.map((v, e) => v - A.elbow[e])), at = (l) => A.hand.map((v, e) => v + d[e] * l)
  return F.j.limb(at(-0.3), at(1.7 * F.R.hand), F.R.hand * 0.95, F.R.hand, paint)
}
// skeletal bare anatomy: sculpted 3D ribcage over a dark hollow core, exposed vertebral spine, bony pelvis, and thin knobby-jointed limbs
const bareSkeleton = (F, W) => {
  const { j, R } = F, hoofed = W?.feet?.key === "hooves", B = "zsSL", Bdim = "zsS"
  const ribZ0 = F.waist + 1.55, ribZ1 = F.top - 0.15, pelZ1 = F.waist - 0.7
  const rScale = Math.sqrt(F.kb[1])
  // segmented vertebral spine from pelvis through the narrow hollow waist up into the neck
  const spBot = [j.pelvis[0] - j.f[0] * 0.55, j.pelvis[1] - j.f[1] * 0.55, F.crotch + 0.6]
  const spTop = [j.head[0], j.head[1], j.head[2] - 3.0]
  const spine = j.limb(spBot, spTop, 1.15 * rScale, 0.92 * rScale, (h) => (Math.floor(h * 13) % 2 ? B : "zs"))
  // dark hollow chest core + sculpted 3D horizontal ribcage bars with central sternum and collarbones
  const ribShift = F.shiftFn(ribZ0, ribZ1)
  const ribCore = j.sweep(F.hips, ribZ0 + 0.25, ribZ1 - 0.2, pure({ ribZ0, dz: ribZ1 - ribZ0, trunk: F.trunk }, (h, a) => trunk(ribZ0 + h * dz, a, 0) * 0.72),
    { shift: ribShift, paint: () => "k" })
  const ribs = j.sweep(F.hips, ribZ0, ribZ1, pure({ ribZ0, dz: ribZ1 - ribZ0, trunk: F.trunk }, (h, a) => {
    const z = ribZ0 + h * dz, arch = h < 0.34 && Math.abs(a) < 0.55 ? 0 : 1
    const band = Math.sin(h * Math.PI * 6.5) > -0.25 || Math.abs(a) < 0.22 || Math.abs(a) > 2.7 ? 1 : 0.86
    return trunk(z, a, 0.2) * (0.88 + 0.08 * Math.sin(h * Math.PI)) * band * arch
  }), {
    shift: ribShift,
    keep: pure({}, (h, a) => !(h < 0.36 && Math.abs(a) < 0.58)),
    paint: (h, a, out) => {
      if (!out) return "k"
      if (Math.abs(a) < 0.2 && h > 0.34) return B
      if (Math.abs(a) > 2.75) return Math.floor(h * 7) % 2 ? B : "zs"
      return Math.sin(h * Math.PI * 6.5) > -0.1 ? B : "k"
    },
  })
  const clavicles = j.arms.map((A) => j.limb([j.chest[0] + j.f[0] * 1.4, j.chest[1] + j.f[1] * 1.4, ribZ1 - 0.2], [A.sh[0], A.sh[1], A.sh[2] + 0.2], 0.78 * rScale, 0.72 * rScale, B))
  // sculpted bony pelvis bowl
  const pelvis = j.sweep(F.hips, F.crotch, pelZ1, pure({ z0: F.crotch, dz: pelZ1 - F.crotch, trunk: F.trunk }, (h, a) => trunk(z0 + h * dz, a, 0) * (0.72 + 0.16 * h)),
    { shift: F.shiftFn(F.crotch, pelZ1), paint: (h, a, out) => (!out ? "k" : h > 0.65 || Math.abs(a) < 0.35 ? B : h < 0.28 && Math.abs(a) < 0.9 ? "k" : "zsS") })
  // slender knobby-jointed bony legs (also supports digi: true undead beasts!)
  const legs = j.legs.map((L, i) => {
    const far = i === F.farLeg, s = far ? Bdim : B
    const r0 = Math.max(0.82, R.leg[0] * 0.54), r1 = Math.max(0.74, R.leg[1] * 0.52), r2 = Math.max(0.68, R.leg[2] * 0.54)
    const dz = F.mounted ? L.ankle[2] - F.ankle : 0
    const bFoot = hoofed ? [] : [j.ball([L.ankle[0] + unit([L.toe[0] - L.heel[0], L.toe[1] - L.heel[1], 0])[0] * 1.0, L.ankle[1] + unit([L.toe[0] - L.heel[0], L.toe[1] - L.heel[1], 0])[1] * 1.0, R.foot[2] * 0.68 + dz], [r2 * 1.15, R.foot[1] * (F.digi ? 0.65 : 0.82), R.foot[2] * 0.65], s)]
    if (F.digi) {
      const { stifle, hock } = digiJoints(F, L)
      return [j.limb(L.hip, stifle, r0 * 1.1, r1, s), j.ball(stifle, [r1 * 1.35, r1 * 1.35, r1 * 1.3], s),
        j.limb(stifle, hock, r1, r2, s), j.ball(hock, [r2 * 1.35, r2 * 1.45, r2 * 1.35], s),
        j.limb(hock, L.ankle, r2, r2, s), ...bFoot]
    }
    return [j.limb(L.hip, L.knee, r0, r1, s), j.ball(L.knee, [r1 * 1.38, r1 * 1.38, r1 * 1.3], s),
      j.limb(L.knee, L.ankle, r1, r2, s), j.ball(L.ankle, [r2 * 1.25, r2 * 1.25, r2 * 1.15], s), ...bFoot]
  })
  // slender knobby-jointed bony arms & skeletal claw hands
  const arms = Object.fromEntries(j.arms.map((A, i) => {
    const far = i === F.farArm, s = far ? Bdim : B
    const r0 = Math.max(0.72, R.arm[0] * 0.64), r1 = Math.max(0.66, R.arm[1] * 0.62), r2 = Math.max(0.62, R.arm[2] * 0.62)
    const d = unit(A.hand.map((v, e) => v - A.elbow[e])), at = (l) => A.hand.map((v, e) => v + d[e] * l)
    const claw = j.limb(at(-0.2), at(1.65 * R.hand), r2 * 1.12, r2 * 1.22, (h) => (h > 0.62 ? (far ? "zs" : "zsS") : s))
    return [`arm${i}`, [j.ball(A.sh, [r0 * 1.35, r0 * 1.35, r0 * 1.3], s), j.limb(A.sh, A.elbow, r0, r1, s),
      j.ball(A.elbow, [r1 * 1.35, r1 * 1.35, r1 * 1.28], s), j.limb(A.elbow, A.hand, r1, r2, s), claw]]
  }))
  return {
    ...Object.fromEntries(legs.map((ps, i) => [`leg${i}`, ps])),
    body: [spine, ribCore, ribs, ...clavicles, pelvis],
    ...arms,
    neck: j.limb(j.chest, spTop, 0.95 * rScale, 0.85 * rScale, (h) => (Math.floor(h * 5) % 2 ? B : "zs")),
  }
}
// the bare mannequin: skin, short drawers and a sleeveless undershirt in undyed linen, the neck (or sculpted 3D bones when F.bony)
const bare = (F, W) => {
  if (F.bony) return bareSkeleton(F, W)
  const { j, R } = F, hoofed = W?.feet?.key === "hooves" || W?.feet?.key === "paws"
  const legs = j.legs.map((L, i) => { const far = i === F.farLeg, s = dim(F.skin, far), u = dim(UNDER, far)
    if (F.digi) {
      const { stifle, hock } = digiJoints(F, L), rH = R.leg[2] * 0.92
      return [j.limb(L.hip, stifle, R.leg[0] * 1.24, R.leg[1] * 1.08, (h) => (h < 0.28 ? u : s)),
        j.limb(stifle, hock, R.leg[1] * 1.06, rH, s),
        j.ball(hock, [rH * 0.98, rH * 1.15, rH * 1.04], s),
        j.limb(hock, L.ankle, rH * 0.98, R.leg[2] * 0.9, s),
        ...(hoofed ? [] : [foot(F, L, 0, s)])]
    }
    return [j.limb(L.hip, L.knee, R.leg[0], R.leg[1], (h) => (h < 0.3 ? u : s)), j.limb(L.knee, L.ankle, R.leg[1], R.leg[2], s), ...(hoofed ? [] : [foot(F, L, 0, s)])] })
  return {
    ...halved(F, (i) => F.wrap(F.crotch - 0.5, F.waist, 0, { paint: dim(UNDER, i === F.farLeg) }), legs, "leg"),
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
const collar = (F, K, n = 1) => F.wrap(F.top - 1.2, F.top + 0.35, n + 0.7, { keep: KEEP_COLLAR, paint: (h, a, out) => (out ? K.slice(1) : K[0]) })
// a shirt's body (tucked: from under the waistband up; hanging: down over the trousers' top to the hips, flared), its
// folds where it is gathered at the waist, its paint by height (z px over the waist) and angle
const shirtBody = (F, P, W, paint) => {
  const hangs = !!(P.hangs && W.legs?.key !== "skirt"), z0 = hangs ? F.waist - 2.8 : F.waist - 0.7, H = F.top + 0.2 - z0
  // (hanging: flared over the trousers' top; tucked: softly bloused over the waistband without creating a hip ledge)
  const n = hangs ? pure({ waist: F.waist, z0 }, (z) => (z < waist ? 2 + (1.1 * (waist - z)) / (waist - z0) : 1))
    : pure({ waist: F.waist }, (z) => 1 + 0.32 * Math.max(0, Math.min(1, 1 - (z - waist) / 1.8)))
  return F.wrap(z0, F.top + 0.2, n, { keep: pure({ z0, H, top: F.top }, (h, a) => !(Math.abs(a) < 0.3 && z0 + h * H > top - 1.6)), paint: (h, a, out) => {
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
// (walking, a pushed drape stretched across the stride: `hull`)
// An outer drape is built over what it covers (`cover`: the parts made before it): along its own rays (its axis, its
// trail, each height and angle where there is cloth) the outermost of them, marched in from outside, and its radius kept
// `gap` px past it, so no layer under it shows through it (a belt, faulds, pauldrons, a fur mantle under a cloak; the
// cloak under a hood's cowl; the arms under a mantle). A table a pose (COVER_H heights, COVER_A angles, kept per pose and
// heading), each bump a step wider round it; where nothing reaches its radius it is as it was. `arms`: the arms counted
// too ("back": only past where a cloak opens in front, where it hangs over an arm; true: all round).
const COVER_H = 12, COVER_A = 20, ARMS = /^(arm|sleeve|coatarm|mailarm|bracer)/, NOT = /^(leg|tleg|boot|greave|neck|hair|beard|braid|strap|held|off|hip|back|tail)/
const drapeOver = (F, P, name, ray, radius, keep, arms, gap = 0.6) => {
  const key = `${name}|${F.j.heading}|${JSON.stringify(F.pose)}`
  if (F.cache?.has(key)) return F.cache.get(key)
  const fields = (re, yes) => Object.entries(P).filter(([k]) => !NOT.test(k) && re.test(k) === yes).flatMap(([, v]) => (Array.isArray(v) ? v : [v]).map((q) => q.field ?? q)).filter((q) => typeof q?.dist === "function")
  const core = fields(ARMS, false), arm = arms ? fields(ARMS, true) : [], U = core.length ? sdf.union(...core) : undefined, UA = arm.length ? sdf.union(...arm) : undefined
  // (a fine table, marched in from far out (a fight's lean, twist and step, a walk's swing carry what is under the cloth
  // out past it): NH heights, NA angles, from `far` px past the radius)
  const NH = 1.5 * COVER_H, NA = 1.5 * COVER_A, far = 5
  const tab = Array.from({ length: NH + 1 }, (_, i) => Array.from({ length: NA }, (_, k) => {
    const h = i / NH, a = -Math.PI + (2 * Math.PI * k) / NA
    if (keep && !keep(h, a)) return 0
    const [o, dv, z] = ray(h, a), r0 = radius(h, a), A = UA && (arms === true || Math.abs(a) > 1.45) ? UA : undefined
    const dist = (t) => { const q = [o[0] + dv[0] * t, o[1] + dv[1] * t, z]; return Math.min(U ? U.dist(q) : 9, A ? A.dist(q) : 9) }
    // (nothing within half the segment's length of its middle: nothing on it, one look)
    if (dist(r0 + far / 2 - gap / 2) > far / 2 + 1 + gap / 2) return 0
    for (let t = r0 + far, n = 0; n < 30 + 10 * (far - 3) && t > r0 - gap; n++) { const d = dist(t); if (d < 0.05) return Math.max(0, t + gap - r0); t -= Math.max(d, 0.1) }
    return 0
  }))
  // (each bump a step wider: a sample's own or 0.7 of its neighbours' round it and up and down it, so a thin band (a belt)
  // between two heights is still under the cloth)
  const wide = tab.map((row, i) => row.map((v, k) => Math.max(v, 0.7 * row[(k + 1) % NA], 0.7 * row[(k + NA - 1) % NA], 0.7 * (tab[i - 1]?.[k] ?? 0), 0.7 * (tab[i + 1]?.[k] ?? 0))))
  const flat = wide.flat()
  const out = flat.some((v) => v) ? pure({ flat, NH, NA }, (h, a) => {
    const y = Math.max(0, Math.min(NH, h * NH)), i = Math.min(NH - 1, Math.floor(y)), fy = y - i
    const x = ((((a + Math.PI) / (2 * Math.PI)) * NA) % NA + NA) % NA, k = Math.floor(x) % NA, fx = x - Math.floor(x), k1 = (k + 1) % NA
    const r0 = i * NA, r1 = (i + 1) * NA
    return (flat[r0 + k] * (1 - fx) + flat[r0 + k1] * fx) * (1 - fy) + (flat[r1 + k] * (1 - fx) + flat[r1 + k1] * fx) * fy
  }) : undefined
  F.cache?.set(key, out)
  return out
}
// a wrap's rays (round the hips' upright carried along the spine, z0 to z1): [origin, way, z]
const wrapRay = (F, z0, z1) => (h, a) => { const z = z0 + h * (z1 - z0), s = F.shiftAt(z), c = Math.cos(a), n = Math.sin(a); return [[F.hips[0] + s[0], F.hips[1] + s[1]], [F.j.f[0] * c + F.j.r[0] * n, F.j.f[1] * c + F.j.r[1] * n], z] }
// (how far past the legs a skirt's cloth is pushed: in a fighting stance and its steps, wider and longer than a walk's, a
// little more, so a shin close under the cloth never shows through it)
const PUSH = (F) => (F.pose?.free ? 1.4 : 0.3)
const drape = (F, p, D, n, name, cover) => {
  // (a fighting frame's `flare`: the hem thrown a little wider on the fast frames, settling after)
  const top = D.top(F.j), fl = 1.5 * (p.flare ?? 0)
  const r0 = asPure({ rad: D.radius, trunk: F.trunk, top, len: D.len, n, fl }, (h, a) => Math.max(rad(h, a), trunk(top - len + h * len, a, n)) + fl * (1 - h))
  // (built over what it covers: its rays dress()'s, round its base carried by its trail)
  const base = D.base === "pelvis" ? F.hips : [F.j.chest[0], F.j.chest[1]], { j } = F
  const more = cover && drapeOver(F, cover.P, name, (h, a) => { const down = 1 - h, c = Math.cos(a), sn = Math.sin(a), t = [0, 1].map((e) => j.f[e] * -(0.3 + 1.1 * p.trail) * down * D.trail + j.r[e] * 0.9 * p.sway * down ** 1.5 * D.trail)
    return [[base[0] + t[0], base[1] + t[1]], [j.f[0] * c + j.r[0] * sn, j.f[1] * c + j.r[1] * sn], top - D.len + h * D.len] }, r0, D.keep, cover.arms)
  const d = { ...D, radius: more ? asPure({ r0, more }, (h, a) => r0(h, a) + more(h, a)) : r0, ...(F.lag?.[0] && D.push !== undefined ? { hull: true } : {}) }
  const made = dress({ ...DRAPE, ...(D.over ? { over: [d] } : { drapes: [d] }) })(F.j, p)
  return { [name]: D.over ? made.over0 : made.cloak }
}
// a piece over the torso lifted a layer over a mail shirt worn under it (the vest, the bodice, the coat)
const lift = (W) => (W.mail ? 1 : 0)
// a jerkin: leather from the hips to the shoulders, sleeveless, laced down the front (a dark line, the laces' crossings lit),
// its panels joined by seams (a dark line, its stitches a step lit) or set with studs in rows (`studs`), its hem a step out
// (its cut: fitted to what lies under it — 2.5 over shirt/bare, 2.7 over gambeson, 3.5 over mail — with trimmed sleeveless
// armholes so arms and sleeves read clearly from both front and back)
const jerkinN = (W) => Math.max(2.5, (W.torso?.n ?? 0) + 0.5, W.mail ? 3.5 : 0)
const jerkinShape = (F, W, o) => {
  const z0 = F.waist - 2.3, n = jerkinN(W)
  return F.wrap(z0, F.top + 0.2, pure({ n, waist: F.waist, z0, top: F.top }, (z, a) => {
    const base = z < waist ? n + (0.35 * (waist - z)) / (waist - z0) : n
    return base - 0.25 * Math.abs(Math.sin(a)) * Math.max(0, Math.min(1, (z - waist + 1.2) / (top - waist + 1.2)))
  }), { keep: KEEP_JERKIN, ...o })
}
const jerkin = (F, W, studs) => {
  const K = KEYS.over, z0 = F.waist - 2.3, H = F.top + 0.2 - z0
  return { jerkin: jerkinShape(F, W, { paint: (h, a, out) => {
    const z = z0 + h * H, b = Math.abs(a)
    if (!out) return K[0]
    if (h < 0.08) return K.slice(0, 2)
    if (b < 0.09) return (z * 1.3) % 1 < 0.45 ? K.slice(1) : K[0]
    // (studs: rows 1.9 px apart, every other row staggered half a stud)
    if (studs) { const row = Math.floor((z + 9) / 1.9), c = (((b + (row % 2) * 0.28) % 0.56) + 0.56) % 0.56; return Math.abs(((z + 9) % 1.9) - 0.95) < 0.42 && Math.abs(c - 0.28) < 0.12 && b > 0.3 ? KEYS.metal : K }
    return Math.abs(b - 1.25) < 0.08 || Math.abs(b - 2.35) < 0.08 ? ((z * 1.4) % 1 < 0.5 ? K.slice(0, 2) : K[0]) : h > 0.86 ? K.slice(1) : K
  } }) }
}
// a wrap painted with its normal and its side: paint(h, a, n, out)
const withNO = (q, paint) => q.field.paint((p, n) => { const [h, a, o] = q.at(p); return paint(h, a, n, dot3(n, o) >= 0) })
// the studded jerkin's alternative (studded2): the jerkin's cut in leather first. Six panels (two ahead of the lacing, two at the flanks, two behind
// the back seam) each a little convex, so each takes its own sheen: a band of the leather's lightest where the panel
// faces the light, its edges a step down into the seam, and across the chest where it swells; the seams a dark line
// with their stitches a step lit beside it; the armholes and the neck a rolled edge (lit, the shade under it); the hem a
// step out, a stitched row over it. The studs few and placed: two down each seam ahead, three down each seam behind,
// two on each shoulder, each one px of the metal with the leather's darkest under it (raised, not printed)
const STUDDED = { seams: [0.95, 1.7, 2.35, Math.PI], studs: [[0.95, [0.32, 0.56]], [2.35, [0.3, 0.52, 0.74]], [1.3, [0.8]], [1.9, [0.8]]] }
const studded2 = (F, W) => {
  const K = KEYS.over, z0 = F.waist - 2.3, H = F.top + 0.2 - z0, edges = [0, ...STUDDED.seams], n0 = jerkinN(W)
  const q = jerkinShape(F, W, {})
  return { jerkin: withNO(q, (h, a, n, out) => {
    const z = z0 + h * H, b = Math.abs(a), r = F.trunk(z, a, n0)
    if (!out) return K[0]
    // (a stud: its own px lit, the one under it the leather's darkest)
    for (const [sa, hs] of STUDDED.studs) for (const hz of hs) {
      const dx = Math.abs(b - sa) * r, dz = z - (z0 + hz * H)
      if (dx < 0.5 && Math.abs(dz) < 0.5) return KEYS.metal
      if (dx < 0.6 && dz < -0.5 && dz > -1.5) return K[0]
    }
    if (h < 0.07) return K[0]
    if (h < 0.15) return (z * 1.4) % 1 < 0.5 ? K[2] : K[1]
    if (b < 0.09) return (z * 1.3) % 1 < 0.45 ? K.slice(1) : K[0]
    // (the armholes and the neck: a rolled edge, its lit row over a row of shade)
    if (h > 0.93) return dot3(n, HALF) > 0.5 ? K[2] : K[1]
    if (h > 0.87) return K[0]
    const i = edges.findIndex((e, k) => b >= e && b < (edges[k + 1] ?? 9)), e0 = edges[i], e1 = edges[i + 1] ?? Math.PI
    const d0 = (b - e0) * r, d1 = (e1 - b) * r
    if ((i > 0 && d0 < 0.45) || d1 < 0.45) return K[0]
    if (i > 0 && d0 < 0.95) return (z * 1.4) % 1 < 0.5 ? K[2] : K[1]
    // (each panel convex: its middle turned a little more to the light than its edges)
    // (and the sheen a band across the chest, where it swells and tips up to the light)
    const mid = (b - (e0 + e1) / 2) / ((e1 - e0) / 2), s = dot3(n, HALF) - 0.3 * mid * mid + (h > 0.6 && h < 0.8 ? 0.25 : 0)
    return s > 0.7 ? K[2] : s > 0.25 ? K[1] : K[0]
  }) }
}
// bracers or vambraces on the forearms: a band over the sleeve's lower half, its rims a step lit (leather: two straps
// across it; steel: by how it faces, a cop over the elbow)
const forearms = (F, steel) => {
  const K = KEYS.arms, { j } = F
  return Object.fromEntries(j.arms.map((A, i) => {
    const far = i === F.farArm, k = dim(K.slice(steel ? 0 : 1, steel ? 4 : 5), far), a0 = lerp(A.elbow, A.hand, steel ? 0.12 : 0.28), a1 = lerp(A.elbow, A.hand, 0.88)
    const band = withN(j.limb(a0, a1, F.R.arm[1] + 3.2 * TL, F.R.arm[2] + 3.2 * TL), (h, a, n) => (h < 0.12 || h > 0.88 ? k.slice(2, 4) : steel ? SHINE(k, n) : Math.abs(h - 0.38) < 0.08 || Math.abs(h - 0.68) < 0.08 ? k.slice(0, 2) : k))
    return [`bracer${i}`, steel ? [band, withN(j.ball(A.elbow, F.R.arm[1] + 3.4 * TL), (h, a, n) => SHINE(k, n))] : [band]]
  }))
}
// gauntlets or gloves in the hands' place: the fingers a block on from the wrist (a lit band at the knuckles, the tips a
// step dark), a cuff flared back over the wrist, its rim lit; over a paw, the paw's size (the hand slot's own)
const gloves = (F, P, steel) => {
  const K = KEYS.hands, { j, R } = F
  j.arms.forEach((A, i) => {
    const far = i === F.farArm, k = dim(K.slice(steel ? 0 : 1, steel ? 4 : 5), far), d = unit(A.hand.map((v, e) => v - A.elbow[e])), at = (l) => A.hand.map((v, e) => v + d[e] * l)
    const g = steel ? 0.25 : 0.1, fingers = withN(j.limb(at(-0.2), at(1.85 * R.hand), R.hand * 1.08 + g, R.hand * 1.1 + g), (h, a, n) => (h > 0.8 ? k.slice(0, 2) : steel && Math.abs(h - 0.5) < 0.12 ? k.slice(2, 4) : steel ? SHINE(k, n) : k))
    const cuff = withN(j.limb(at(-1.7), at(0.1), R.arm[2] + (steel ? 1.2 : 0.75), R.hand * 1.05 + g), (h, a, n) => (h < 0.22 ? k.slice(2, 4) : steel ? SHINE(k, n) : k.slice(0, 3)))
    P[`arm${i}`] = [P[`arm${i}`][0], P[`arm${i}`][1], fingers, cuff]
  })
  return {}
}
// a tabard's or vestments' panels: hung from the shoulders front and back, open at the sides, fitted to the body, over the
// breastplate's swell and the faulds (F.shell), their device in its own color: a cross, a band across the chest, a stole
const PANELS = { cross: { len: 15, w: 1.02, flare: 1.15 }, band: { len: 15, w: 1.02, flare: 1.15 }, stole: { len: 16.0, w: 0.84, flare: 1.0 } }
const panels = (F, p, W, B, P) => {
  const o = PANELS[P.device], K = KEYS.apron, V = KEYS.device
  const D0 = fitDrape({ top: (j) => j.chest[2] + 0.4, len: o.len, trail: F.mounted ? 0.65 : 0.15,
    keep: F.mounted ? pure({ w: o.w }, (h, a) => (Math.abs(a) < w && h > 0.36) || Math.abs(a) > Math.PI - w) : pure({ w: o.w }, (h, a) => Math.abs(a) < w || Math.abs(a) > Math.PI - w),
    radius: pure({ flare: o.flare }, (h, a) => 3.7 * (0.84 + 0.16 * Math.abs(Math.sin(a))) + 0.5 + flare * (1 - h)) }, B)
  // keep the hem cleanly above the feet/boots on compact bodies (e.g. short cleric vestments never drag on the ground)
  const D = { ...D0, len: Math.min(D0.len, D0.top(rest(B.body)) - (B.body.ankle + 2.15)) }
  const top = D.top(F.j), dev = (h, a) => {
    const b = Math.abs(a) < Math.PI / 2 ? Math.abs(a) : Math.PI - Math.abs(a)
    if (P.device === "cross") return (b < 0.16 && h > 0.3 && h < 0.92) || (Math.abs(h - 0.7) < 0.05 && b < 0.62)
    if (P.device === "band") return Math.abs(h - 0.74) < 0.08
    return Math.abs(b - 0.42) < 0.12 && h > 0.12 && Math.abs(a) < Math.PI / 2
  }
  // (over the shells worn under it, as they are before it adds its own)
  const under = F.shells.slice()
  const panelRad = asPure({ rad: D.radius, under, top, len: D.len }, (h, a) => {
    const z = top - len + h * len
    let m = 0
    for (let i = 0; i < under.length; i++) { const v = under[i](z, a); if (v > m) m = v }
    return Math.max(rad(h, a), m + 0.45)
  })
  const d = { ...D, over: true, radius: panelRad,
    out: (h, a, out) => (!out ? K[0] : h < 0.05 ? K.slice(0, 2) : P.device === "stole" && h < 0.1 ? V.slice(0, 2) : dev(h, a) ? (h < 0.07 ? V.slice(0, 2) : V) : Math.abs(Math.abs(a) - 0.5) < 0.07 && h < 0.7 ? K.slice(0, 2) : K) }
  const n = Math.max(P.n, outerOf(W) + 0.4), z0 = top - D.len
  // (its shell the cloth's outer face: the radius and the cloth's thickness. In a fight the panel hangs from the chest
  // carried by the lean, its trail and its flare, off the spine's line the belt wraps round: its shell where it hangs,
  // so the belt cinches it in every frame)
  const { j } = F, fl = 1.5 * (p.flare ?? 0)
  F.shells.push(asPure({ z0, top, len: D.len, keep: D.keep, panelRad, trunk: F.trunk, n, free: !!F.pose?.free, fl,
    cx: j.chest[0], cy: j.chest[1], fx: j.f[0], fy: j.f[1], rx: j.r[0], ry: j.r[1], hx: F.hips[0], hy: F.hips[1],
    pTrail: p.trail ?? 0, pSway: p.sway ?? 0, dTrail: D.trail, hasLean: F.hasLean, pZ: F.pZ, lx: F.lx, ly: F.ly }, (z, a) => {
    if (z < z0 || z > top || !keep(0, a)) return 0
    const r = Math.max(panelRad((z - z0) / len, a), trunk(z, a, n)) + 0.5
    if (!free) return r
    const down = 1 - (z - z0) / len, sx = hasLean && z > pZ ? lx * (z - pZ) : 0, sy = hasLean && z > pZ ? ly * (z - pZ) : 0
    const ox = cx + fx * -(0.3 + 1.1 * pTrail) * down * dTrail + rx * 0.9 * pSway * down ** 1.5 * dTrail - hx - sx
    const oy = cy + fy * -(0.3 + 1.1 * pTrail) * down * dTrail + ry * 0.9 * pSway * down ** 1.5 * dTrail - hy - sy
    const c = Math.cos(a), s = Math.sin(a)
    return r + fl * (z0 + len - z) / len + Math.max(0, ox * (fx * c + rx * s) + oy * (fy * c + ry * s))
  }))
  return drape(F, p, d, n, P.key)
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
  harness: { slot: "torso", n: 1.2, colors: { torso: "brown", metal: "brass" }, is: "crossed leather battle-straps over a bare or furred muscular chest with a central buckle",
    draw: (F) => {
      const K = KEYS.torso, s = F.skin, z0 = F.waist - 0.4, z1 = F.top + 0.1
      const bareChest = F.wrap(z0, z1, 0.25, { paint: () => s })
      const straps = F.wrap(z0, z1, 1.35, {
        keep: pure({}, (h, a) => {
          const b = Math.abs(a) < Math.PI / 2 ? a : a > 0 ? Math.PI - a : -Math.PI - a
          const d1 = Math.abs(b - (h - 0.5) * 1.55), d2 = Math.abs(b + (h - 0.5) * 1.55)
          return d1 < 0.22 || d2 < 0.22 || h < 0.12
        }),
        paint: (h, a, out) => {
          if (!out) return K[0]
          const b = Math.abs(a) < Math.PI / 2 ? a : a > 0 ? Math.PI - a : -Math.PI - a
          if (Math.abs(b) < 0.22 && Math.abs(h - 0.5) < 0.14 && Math.abs(a) < Math.PI / 2) return KEYS.metal
          return h < 0.12 ? K.slice(0, 2) : K
        },
      })
      return F.bony ? { shirt: straps } : { body: bareChest, shirt: straps }
    } },
  // ---- over the torso (`over`): a vest, a bodice, a coat
  vest: { slot: "over", needs: { torso: "any" }, colors: { over: "olive" }, is: "a vest open over a shirt to the waist, its edges lit",
    draw: (F, p, W) => ({ vest: F.wrap(F.waist - 1, F.top + 0.1, 2.5 + lift(W), { keep: KEEP_COLLAR, paint: (h, a, out) => (!out ? KEYS.over[0] : h < 0.07 ? KEYS.over.slice(0, 2) : Math.abs(a) < 0.62 ? KEYS.over.slice(1) : KEYS.over) }) }) },
  bodice: { slot: "over", needs: { torso: ["chemise", "shirt"] }, colors: { over: "red" }, is: "a bodice laced over a chemise or a shirt, from the hips to under the arms",
    draw: (F, p, W) => ({ bodice: F.wrap(F.waist - 1.2, F.waist + 0.72 * (F.top - F.waist), 2.5 + lift(W), { paint: (h, a, out) => (!out ? KEYS.over[0] : Math.abs(a) < 0.1 ? KEYS.over[0] : h > 0.9 || h < 0.08 ? KEYS.over.slice(0, 2) : KEYS.over) }) }) },
  coat: { slot: "over", sleeves: "long", colors: { over: "navy", metal: "gold" }, is: "a long coat open in front over a shirt or bare, buttons down its edges, cuffs turned back",
    // (the crew's coat's tails, tailored flare & shell-compensated thickness so sleeves, shoulders and lapel read cleanly on both tall and medium bodies)
    draw: (F, p, W, B) => {
      const D = fitDrape({ ...C.OUTFITS.coat.drapes[0], trail: F.mounted ? 0.65 : 0.22,
        keep: F.mounted ? pure({}, (h, a) => Math.abs(a) > (h < 0.48 ? 0.68 : 0.28)) : pure({}, (h, a) => Math.abs(a) > 0.28),
        radius: pure({}, (h, a) => (h > 0.37 ? 3.6 : 3.6 + (0.82 * (0.37 - h)) / 0.37) * (0.84 + 0.16 * Math.abs(Math.sin(a))) + 0.45) }, B)
      const nArm = (W.torso ? 2 : 1) + 1.2 * lift(W), t = nArm * TL
      const farSide = (a) => (F.farArm === 1 ? a > 0 : F.farArm === 0 ? a < 0 : false)
      return { ...drape(F, p, { ...D, push: F.mounted ? 0.9 : PUSH(F), out: (h, a, out) => (!out ? KEYS.over[0] : h < 0.05 ? KEYS.over.slice(0, 2) : h > 0.38 && Math.abs(Math.abs(a) - 0.38) < (farSide(a) ? 0.06 : 0.1) && Math.floor(h * 14) % 2 ? KEYS.metal : Math.abs(a) < 0.46 ? (farSide(a) ? dim(KEYS.over, true) : KEYS.over.slice(1)) : KEYS.over) }, 2.12 + lift(W), "coat"),
        ...Object.fromEntries(F.j.arms.map((A, i) => {
          const far = i === F.farArm, k = dim(KEYS.over, far), sh = [A.sh[0], A.sh[1], A.sh[2] - 0.25], end = lerp(A.elbow, A.hand, 0.85)
          const r0 = F.R.arm[0] + t + 0.16, r1 = F.R.arm[1] + t + 0.06, r2 = F.R.arm[1] + (F.R.arm[2] - F.R.arm[1]) * 0.85 + t
          const seam = (a, lim = -0.505) => { const s = (i ? -1 : 1) * Math.sin(a); return s > lim || (s > -0.52 && Math.cos(a) < -0.85) }
          return [`coatarm${i}`, [
            F.j.limb(sh, A.elbow, r0, r1, (h, a) => (seam(a) || (h > 0.82 && Math.abs(a) < 1) ? k[0] : k)),
            F.j.limb(A.elbow, end, r1, r2 + 0.1, (h, a) => (seam(a) ? k[0] : k)),
            F.j.limb(lerp(A.elbow, end, 0.76), end, r2 + 0.2, r2 + 0.26, (h, a) => (seam(a, -0.38) ? k[0] : k.slice(1))),
          ]]
        })) }
    } },
  // ---- the legs (layer 1): trousers to a cuff, a skirt; their own colors (`legs`)
  trousers: { slot: "legs", cuff: 0.95, colors: { legs: "slate" }, is: "trousers to the ankle (into boots where they reach)" },
  canvas: { slot: "legs", cuff: 0.95, colors: { legs: "canvas" }, is: "canvas trousers to the ankle" },
  rolled: { slot: "legs", cuff: 0.45, roll: true, colors: { legs: "canvas" }, is: "canvas trousers rolled to the shin" },
  breeches: { slot: "legs", cuff: 0.22, colors: { legs: "white" }, is: "breeches to under the knee" },
  skirt: { slot: "legs", colors: { legs: "plum" }, is: "a long skirt from the waist, a shirt tucked into it",
    draw: (F, p, W, B) => {
      const D0 = fitDrape(C.OUTFITS.dress.drapes[0], B)
      const D = F.mounted ? { ...D0, len: D0.len * 0.72, trail: 0.55, keep: pure({}, (h, a) => h > 0.62 || (Math.abs(a) > 0.58 && Math.abs(a) < 2.65)) } : D0
      return drape(F, p, { ...D, push: F.mounted ? 0.95 : PUSH(F), out: (h, a, out) => (!out ? KEYS.legs[0] : h > 0.93 ? KEYS.legs.slice(0, 2) : h < 0.04 ? KEYS.legs[0] + KEYS.legs[1] : Math.abs(Math.abs(a) - 0.9) < 0.1 && h < 0.8 ? KEYS.legs.slice(0, 2) : KEYS.legs) }, 2, "skirt")
    } },
  // ---- the feet: what is worn over the bare foot (layer 2 over the trousers' cuff)
  boots: { slot: "feet", shaft: 0.5, colors: { feet: "brown" }, is: "boots to mid-shin, the shaft wider at its top, its cuff turned down, a dark sole" },
  highboots: { slot: "feet", shaft: 0.92, colors: { feet: "black" }, is: "high boots to under the knee" },
  shoes: { slot: "feet", shaft: 0.12, colors: { feet: "brown" }, is: "low shoes" },
  hooves: { slot: "feet", colors: { feet: "black" }, is: "cloven unguligrade hooves with a shaggy fetlock cuff above the ankle (for minotaurs, satyrs and hoofed builds)",
    draw: (F) => {
      const { j, R } = F, K = KEYS.feet
      return Object.fromEntries(j.legs.map((L, i) => {
        const far = i === F.farLeg, k = dim(K, far), sk = dim(F.skin, far)
        const d = unit([L.toe[0] - L.heel[0], L.toe[1] - L.heel[1], 0]), side = [-d[1], d[0], 0]
        const dj = F.digi ? digiJoints(F, L) : undefined
        const lo = dj ? dj.hock : L.knee, fetTop = dj ? lerp(lo, L.ankle, 0.58) : lerp(lo, L.ankle, 0.70)
        const dz = F.mounted ? L.ankle[2] - F.ankle : 0
        const rC = R.leg[2] * (F.digi ? 0.92 : 0.98), rBase = R.leg[2] * (F.digi ? 1.24 : 1.22), hHoof = Math.max(2.1, L.ankle[2] - dz + R.foot[2] * 0.95)
        // shaggy fetlock fur flaring over the top of the heavy hoof
        const fetlock = j.limb(fetTop, [L.ankle[0], L.ankle[1], Math.max(1.0, hHoof * 0.55) + dz], rC * 1.06, rBase * 1.08, (h) => (h > 0.72 ? sk[0] + sk.slice(0, -1) : sk))
        // heavy forward-sloped cloven hoof aligned to leg facing in all 8 directions, flat grounded sole at z = dz
        const hx = L.ankle[0] + d[0] * (rBase * 0.52), hy = L.ankle[1] + d[1] * (rBase * 0.52)
        const hoof = sdf.capsule([L.ankle[0], L.ankle[1], hHoof * 0.85 + dz], [hx, hy, 0.25 + dz], rBase * 0.84, rBase * 1.08)
          .intersect(sdf.plane([0, 0, -1], -dz))
          .paint((q, n) => {
            const rx = q[0] - L.ankle[0], ry = q[1] - L.ankle[1], fwd = rx * d[0] + ry * d[1], lat = rx * side[0] + ry * side[1]
            if (q[2] < 0.4 + dz) return K[0]
            if (fwd > rBase * 0.5 && Math.abs(lat) < 0.26) return K[0]
            return fwd > 0 && n[2] > 0.1 ? k.slice(1) : k
          })
        return [`boot${i}`, sdf.union(fieldOf(fetlock), hoof)]
      }))
    } },
  paws: { slot: "feet", colors: { feet: "black" }, is: "clawed beast paws with shaggy ankle fur and dark claws (for wolves, werewolves, catfolk and beast builds)",
    draw: (F) => {
      const { j, R } = F, K = KEYS.feet
      return Object.fromEntries(j.legs.map((L, i) => {
        const far = i === F.farLeg, sk = dim(F.skin, far), cl = dim(K, far)
        const d = unit([L.toe[0] - L.heel[0], L.toe[1] - L.heel[1], 0]), side = [-d[1], d[0], 0]
        const dj = F.digi ? digiJoints(F, L) : undefined
        const lo = dj ? dj.hock : L.knee, cuffTop = dj ? lerp(lo, L.ankle, 0.56) : lerp(lo, L.ankle, 0.7)
        const dz = F.mounted ? L.ankle[2] - F.ankle : 0
        const rC = R.leg[2] * (F.digi ? 0.92 : 0.98), rPaw = R.leg[2] * 1.18, len = F.R.foot[1] * (F.digi ? 0.88 : 0.96), up = F.R.foot[2] * 0.95
        const cuff = j.limb(cuffTop, [L.ankle[0], L.ankle[1], up * 0.75 + dz], rC * 1.04, rPaw * 0.98, (h) => (h > 0.72 ? sk[0] + sk.slice(0, -1) : sk))
        const px = L.ankle[0] + d[0] * (len * 0.52), py = L.ankle[1] + d[1] * (len * 0.52)
        const pad = sdf.capsule([L.ankle[0], L.ankle[1], up * 0.72 + dz], [px, py, up * 0.52 + dz], rPaw * 0.88, rPaw * 1.02)
          .intersect(sdf.plane([0, 0, -1], -dz)).paint((q) => (q[2] < 0.38 + dz ? K[0] : sk))
        // three distinct forward claws at the toe tips
        const claws = [-0.72, 0, 0.72].map((o) => {
          const sx = px + d[0] * (rPaw * 0.58) + side[0] * (o * rPaw * 0.95), sy = py + d[1] * (rPaw * 0.58) + side[1] * (o * rPaw * 0.95)
          return sdf.capsule([sx, sy, up * 0.52 + dz], [sx + d[0] * (0.95 + (o === 0 ? 0.25 : 0)), sy + d[1] * (0.95 + (o === 0 ? 0.25 : 0)), 0.12 + dz], 0.34, 0.14).mat(cl)
        })
        return [`boot${i}`, sdf.union(fieldOf(cuff), pad, ...claws)]
      }))
    } },
  bare: { slot: "feet", is: "bare feet" },
  // ---- the arms: how the torso's sleeves are worn
  sleeves: { slot: "arms", is: "the sleeves down to the wrist" },
  rolledup: { slot: "arms", is: "the sleeves rolled up over the elbow, the forearms bare" },
  // ---- over the waist, the drapes
  belt: { slot: "belt", needs: { either: ["torso", "legs"] }, colors: { belt: "brown", metal: "gold" }, is: "a leather belt with a buckle, over the shirt and the trousers, under a coat",
    draw: (F, p, W) => ({ belt: F.wrap(F.waist - 0.75, F.waist + 0.65, F.shells.length ? overShell(F, Math.max(3, outerOf(W) + 0.5)) : Math.max(W.over?.key === "coat" ? 2.25 + lift(W) : 3, outerOf(W) + 0.5), { paint: (h, a, out) => (!out ? KEYS.belt[0] : Math.abs(a) < 0.3 ? KEYS.metal : h > 0.7 ? KEYS.belt.slice(1) : KEYS.belt) }) }) },
  apron: { slot: "apron", needs: { torso: "any" }, excludes: ["coat"], why: "an apron ties over a shirt's front, where a coat's open front would hang over its bib", colors: { apron: "brown" },
    is: "a leather apron from the chest to the knees over a torso piece, with a waist tie and vertical pleats",
    draw: (F, p, W, B) => drape(F, p, { ...fitDrape(C.OUTFITS.apron.over[0], B), over: true, out: (h, a, out) => (!out ? KEYS.apron[0] : h < 0.05 || Math.abs(h - 0.62) < 0.05 ? KEYS.apron.slice(0, 2) : h > 0.92 ? KEYS.apron.slice(1) : h < 0.58 && Math.abs(Math.abs(a) - 0.36) < 0.08 ? KEYS.apron.slice(0, 2) : KEYS.apron) }, 3.5, "apron") },
  travel: { slot: "cloak", colors: { cloak: "green", metal: "gold" }, is: "the traveler's travel cloak from the shoulders to mid-thigh, open in front, folded at the back with a throat clasp",
    draw: (F, p, W, B, P) => {
      const D = fitDrape(T.TRAVELER.drapes[0], B), K = KEYS.cloak
      const paint = (h, a, out) => (!out ? K[0] : h > 0.92 && Math.abs(Math.abs(a) - 1.38) < 0.22 ? KEYS.metal : h < 0.06 ? K.slice(0, 2) : Math.abs(a) > 1.75 && (Math.abs(Math.abs(a) - 2.15) < 0.11 || Math.abs(Math.abs(a) - 2.78) < 0.1) && h < 0.88 ? K.slice(0, 3) : T.PAINT.cloak(h, a, out))
      return drape(F, p, { ...D, out: paint, keep: parting(F, D, 1.35) }, Math.max(4, outerOf(W) + 0.5), "cloak", P && { P, arms: true })
    } },
  // (a short cape: from the shoulders to above the elbows, open in front, fuller over the shoulders; it trails and sways as
  // the cloak does, over the arms where they rise under it)
  capelet: { slot: "cloak", colors: { cloak: "red" }, is: "a short cape on the shoulders, to above the elbows, open in front: it ends above where the arms swing",
    draw: (F, p, W, B, P) => { const D = fitDrape(CAPELET, B); return drape(F, p, { ...D, out: T.PAINT.cloak, keep: parting(F, D, 1) }, Math.max(4, outerOf(W) + 0.5), "cloak", P && { P, arms: true }) } },
}
const CAPELET = { top: (j) => j.chest[2] + 0.6, len: 5.2, trail: 0.5, keep: pure({}, (h, a) => Math.abs(a) > 1), radius: pure({}, (h, a) => 4.6 + 1.2 * (1 - h) + 0.15 * Math.sin(a * 7) * (1 - h)) }
// (a cloak parts where an arm comes out through its opening: on each side its edge moved past the arm's
// elbow, wrist and fist that lie at its heights within 60 degrees behind that edge, the cloth open round them; an arm
// farther back stays under it, the cloth pushed out over it (its march counts the arms))
const parting = (F, D, edge) => {
  const { j } = F, top = D.top(j), z0 = top - D.len, lim = [edge, edge]
  for (const A of j.arms) for (const q of [A.elbow, A.hand, fistOf(F, A)]) {
    if (q[2] < z0 - 1 || q[2] > top + 1.5) continue
    const dx = q[0] - j.chest[0], dy = q[1] - j.chest[1], a = Math.atan2(dx * j.r[0] + dy * j.r[1], dx * j.f[0] + dy * j.f[1])
    if (Math.abs(a) > edge - 0.3 && Math.abs(a) < edge + 1.05) lim[a > 0 ? 1 : 0] = Math.max(lim[a > 0 ? 1 : 0], Math.abs(a) + 0.4)
  }
  return asPure({ keep: D.keep, l0: lim[0], l1: lim[1] }, (h, a) => keep(h, a) && Math.abs(a) > (a > 0 ? l1 : l0))
}
// trousers by rule: each leg to its cuff (a hem in shade; rolled, a roll lit on top), the seat up to the waist, the
// waistband over a tucked shirt (under one that hangs); the knee's crease when it bends past 60 degrees (a step)
const trousersOf = (F, P, W) => {
  const { j, R } = F, K = KEYS.legs, hangs = W.torso?.hangs, z1 = F.waist + (hangs ? 0 : 0.6)
  const legs = j.legs.map((L, i) => {
    const far = i === F.farLeg, k = dim(K, far), t = TL, bent = dress.bend(L.hip, L.knee, L.ankle) > 60
    const hem = (h) => (h > 0.9 ? (P.roll ? k.slice(1) : k.slice(0, 2)) : k)
    if (F.digi) {
      const { stifle, hock } = digiJoints(F, L), end = lerp(stifle, hock, Math.min(0.95, P.cuff * 1.05)), rEnd = R.leg[1] * 1.06 + (R.leg[2] * 0.92 - R.leg[1] * 1.06) * Math.min(0.95, P.cuff * 1.05)
      return [j.limb(L.hip, stifle, R.leg[0] * 1.24 + t, R.leg[1] * 1.08 + t, k), j.limb(stifle, end, R.leg[1] * 1.06 + t, rEnd + t, hem),
        ...(P.roll ? [j.limb(lerp(stifle, end, 0.78), end, rEnd + t + 0.35, rEnd + t + 0.4, k.slice(1))] : [])]
    }
    const end = lerp(L.knee, L.ankle, P.cuff), rEnd = R.leg[1] + (R.leg[2] - R.leg[1]) * P.cuff
    return [j.limb(L.hip, L.knee, R.leg[0] + t, R.leg[1] + t, bent ? (h, a) => (h > 0.75 && Math.abs(a) > 2.2 ? k[0] : k) : k), j.limb(L.knee, end, R.leg[1] + t, rEnd + t + (P.cuff > 0.5 ? 0.15 : 0), hem),
      ...(P.roll ? [j.limb(lerp(L.knee, end, 0.82), end, rEnd + t + 0.4, rEnd + t + 0.45, k.slice(1))] : [])]
  })
  // (the seat: under the waist the trousers', tapering smoothly into the waistband over a tucked shirt so the hip never dents)
  const seatRad = pure({ hangs: !!hangs, waist: F.waist }, (z) => (hangs ? 1 : 1 + 0.72 * Math.max(0, Math.min(1, (z - (waist - 1.9)) / 1.2))))
  const seat = (i) => F.wrap(F.crotch, z1, seatRad, {
    paint: (h) => { const z = F.crotch + h * (z1 - F.crotch); return z > F.waist - 0.7 && !hangs ? (z > F.waist + 0.2 ? K.slice(1) : K.slice(0, 2)) : dim(K, i === F.farLeg) } })
  return halved(F, seat, legs, "tleg")
}
// what the feet wear: a shaft up the shin (as wide as the leg and a layer more, wider at its top, its cuff turned down a
// step lighter) and the foot a layer over the bare one, from the heel behind the shin to the toe ahead, its sole dark
const shoesOf = (F, P, W) => {
  const { j, R } = F, K = KEYS.feet, under = !!W?.shins
  return Object.fromEntries(j.legs.map((L, i) => {
    const k = dim(K, i === F.farLeg), t = (under ? 0.5 : 2) * TL, g = under ? TL * 0.5 : TL * 1.2
    if (F.digi) {
      const { hock } = digiJoints(F, L), top = lerp(L.ankle, hock, Math.min(0.88, P.shaft * 0.9 + 0.12)), rTop = R.leg[2] * 0.92
      return sdf.union(fieldOf(j.limb(L.ankle, top, R.leg[2] * 0.92 + t * 0.85, rTop + t * 0.85 + (under ? 0 : 0.14 * P.shaft), (h) => (h > 0.82 && P.shaft > 0.3 ? k.slice(1) : k))),
        fieldOf(foot(F, L, under ? TL * 0.5 : TL * 1.0, (h) => (h < 0.3 ? K[0] : k))))
    }
    const top = lerp(L.ankle, L.knee, P.shaft), rTop = R.leg[2] + (R.leg[1] - R.leg[2]) * P.shaft
    return sdf.union(fieldOf(j.limb(L.ankle, top, R.leg[2] + t, rTop + t + (under ? 0 : 0.3 * P.shaft), (h) => (h > 0.85 && P.shaft > 0.3 ? k.slice(1) : k))),
      fieldOf(foot(F, L, g, (h) => (h < 0.3 ? K[0] : k))))
  }).map((f, i) => [`boot${i}`, f]))
}
// ---------------------------------------------------------------- armor, and the classes' garments
// Armor is worn as the clothes are: each piece a layer over what it lies on, `n` layers out from the bare body (T0 px a
// layer round the trunk, TL round a limb), with its own edge (a hem, a cuff, a rim a step out and lit) and the shade under
// it. The stack, inside out: a padded gambeson in the shirt's place (2.2), a mail shirt over it (3), a leather jerkin
// (3.4) or a breastplate (3.9) over the mail, the faulds at the waist over the breastplate's hem (4.3), a tabard or a
// cleric's vestments over all of it (4.2 to 4.6); a belt or a sash over whatever is outermost at the waist; a cloak over
// all. Three slots are new, each because no slot sat where its piece lies: `mail` (between the shirt or the padded coat
// and what goes over: a breastplate, a jerkin, a coat), `shoulders` (pauldrons and a fur mantle stand on the shoulder,
// over the torso's pieces and the sleeves, under a cloak), `shins` (greaves and their sabatons go over the boots, which
// keep the feet's slot). The forearms' (bracers, vambraces) take the `arms` slot (it said how the sleeves are worn: over
// a sleeve, the sleeve is worn down), the hands' (gauntlets, gloves) the `hands` slot the wolf's paws are in. Metal is
// painted by the headwear's note: a ramp from a blue-black to a cool light, bands by how it faces (its top lit, a dark
// band where it turns from the sky, lighter again facing down), the one light on a breastplate's ridge, the dark under a
// rim; mail a texture of rows (its rings) in the metal's tones; leather two tones and a dark seam; each its own colors.
pal({ б: "#1b1f2d", в: "#3b4355", г: "#6a7380", д: "#aaaeaf",
  ж: "#191d2b", з: "#394153", и: "#68717e", й: "#a8acad", к: "#f3f1e9", л: "#181c2a", м: "#384052", н: "#67707d", п: "#a7abac", р: "#f2f0e8",
  с: "#171b29", т: "#373f51", у: "#666f7c", ф: "#a6aaab", х: "#f1efe7", ц: "#161a28", ч: "#363e50", ш: "#656e7b", щ: "#a5a9aa", ъ: "#f0eee6",
  ы: "#151927", ь: "#353d4f", э: "#646d7a", ю: "#a4a8a9", я: "#efede5", Б: "#b8962f", Г: "#dcbc4f", Д: "#f6e49b" })
Object.assign(KEYS, { mail: "бвгд", plate: "жзийк", shoulders: "лмнпр", arms: "стуфх", hands: "цчшщъ", shins: "ыьэюя", device: "БГД" })
// metal by how it faces (n the normal in the sprite: x across, y away, z up), its keys K (four tones and a glint): where it
// mirrors the light to the eye (HALF, the headwear's) its two lightest, turning from it a step down each band, the flank
// turned away its two darkest: a polished thing's hard bands, not cloth's soft roll
const SHINE = (K, n) => { const s = dot3(n, HALF); return s > 0.88 ? K.slice(2, 4) : s > 0.62 ? K.slice(1, 4) : s > 0.3 ? K.slice(1, 3) : K.slice(0, 2) }
// a piece painted with its normal: paint(h, a, n)
const withN = (q, paint) => q.field.paint((p, n) => { const [h, a] = q.at(p); return paint(h, a, n) })
// the outermost layer the new pieces put round the trunk (a belt, a cloak, a strap, the mane lie over it; 0: none)
const outerOf = (W) => Math.max(0, ...["torso", "mail", "over", "apron"].map((s) => (typeof W[s]?.n === "function" ? W[s].n(W) : W[s]?.n ?? 0)))
// the layers a band round the trunk at (z, a) needs to lie over what is worn there (F.shell), n0 at least
const overShell = (F, n0) => asPure({ n0, shells: F.shells.slice(), trunk: F.trunk, T0 }, (z, a) => {
  let m = 0
  for (let i = 0; i < shells.length; i++) { const v = shells[i](z, a); if (v > m) m = v }
  return Math.max(n0, 1 + (m + 0.4 - trunk(z, a, 1)) / T0)
})
// a point round the trunk at the height z, the angle a (0 ahead), r px out from the hips' upright
const roundAt = (F, z, a, r) => { const { j } = F, c = Math.cos(a), s = Math.sin(a); return [F.hips[0] + (j.f[0] * c + j.r[0] * s) * r, F.hips[1] + (j.f[1] * c + j.r[1] * s) * r, z] }
// a robe: its body from the waist up (a collar of trim), its skirt from the waist to over the feet (pushed by the legs:
// it tents over a knee), wide sleeves to the wrist, their cuffs and the hem in the trim; `len` its hem's share of the way
// from the waist to the ground, `trim` false: one cloth
const robe = (F, p, W, B, P) => {
  const K = KEYS.torso, R = P.trim ? KEYS.trim : K, body = F.wrap(F.waist - 0.7, F.top + 0.2, P.n, { keep: KEEP_ROBE,
    paint: (h, a, out) => (!out ? K[0] : P.trim && Math.abs(a) < 0.14 ? R : h < 0.12 ? K.slice(0, 2) : K) })
  // (its hem `len` of the way from the waist down to the sole, on every body; as wide as the hips grow it; gentle walk push & vertical folds)
  const D = { base: "pelvis", top: (j) => j.pelvis[2] + 1.4, len: (B.body.hip + 1.4) * P.len * (F.mounted ? 0.72 : 1), trail: F.mounted ? 0.55 : 0.3,
    ...(F.mounted ? { keep: pure({}, (h, a) => h > 0.62 || (Math.abs(a) > 0.58 && Math.abs(a) < 2.65)) } : {}),
    radius: pure({ flare: P.flare, kb0: F.kb[0] }, (h) => (3.75 + flare * (1 - h)) * kb0) }
  const skirt = drape(F, p, { ...D, push: F.mounted ? 0.95 : F.pose?.free ? 1.2 : 0.15, out: (h, a, out) => (!out ? K[0] : h < 0.06 ? R.slice(0, 2) : P.trim && h < 0.13 ? R : P.trim && Math.abs(a) < 0.12 ? R : (Math.abs(Math.abs(a) - 1) < 0.08 || Math.abs(Math.abs(a) - 2.15) < 0.08) && h < 0.85 ? K.slice(0, 2) : K) }, P.n + 0.3, "robeskirt")
  const arms = Object.fromEntries(F.j.arms.map((A, i) => {
    const far = i === F.farArm, k = dim(K, far), r = dim(R, far), end = lerp(A.elbow, A.hand, P.cuff), t = 2 * TL
    return [`sleeve${i}`, [F.j.limb(A.sh, A.elbow, F.R.arm[0] + t, F.R.arm[1] + t + 0.2, k), F.j.limb(A.elbow, end, F.R.arm[1] + t + 0.2, F.R.arm[2] + t + P.bell, (h, a, out) => (!out ? k[0] : h > 0.82 ? r : k))]]
  }))
  return { shirt: [body, collar(F, R, P.n)], ...skirt, ...arms }
}
Object.assign(PIECES, {
  // ---- padded: in the shirt's place, over the undershirt
  gambeson: { slot: "torso", n: 2.2, hangs: true, excludes: ["rolledup"], why: "a padded coat's quilted sleeves are too thick to roll up", colors: { torso: "linen" },
    is: "a quilted gambeson to the hips: its quilting in rows a seam apart, a standing collar, closed down the front, its hem flared and in shade, quilted sleeves to the wrist",
    draw: (F) => {
      const K = KEYS.torso, z0 = F.waist - 3.4, H = F.top + 0.3 - z0
      // (the quilting: a seam every 1.7 px up the body in the darkest, the channel between it lit by the light's roll)
      const body = F.wrap(z0, F.top + 0.3, pure({ waist: F.waist, z0 }, (z) => (z < waist ? 2.2 + (0.9 * (waist - z)) / (waist - z0) : 2.2)), { paint: (h, a, out) => {
        const z = z0 + h * H - F.waist
        return !out ? K[0] : h < 0.07 ? K.slice(0, 2) : Math.abs(a) < 0.1 ? K[0] : ((z + 9) % 1.7) < 0.5 ? K[0] : K } })
      const arms = Object.fromEntries(F.j.arms.map((A, i) => {
        const k = dim(K, i === F.farArm), t = 2 * TL, q = (h) => ((h * 4.2) % 1 < 0.22 ? k.slice(0, 2) : k)
        return [`sleeve${i}`, [F.j.limb(A.sh, A.elbow, F.R.arm[0] + t, F.R.arm[1] + t, q), F.j.limb(A.elbow, lerp(A.elbow, A.hand, 0.86), F.R.arm[1] + t, F.R.arm[2] + t, q),
          F.j.limb(lerp(A.elbow, A.hand, 0.68), lerp(A.elbow, A.hand, 0.86), F.R.arm[2] + t + 0.25, F.R.arm[2] + t + 0.3, k.slice(1))]]
      }))
      return { shirt: [body, F.wrap(F.top - 0.7, F.top + 1.1, 3.1, { paint: (h, a, out) => (!out ? K[0] : h > 0.7 ? K.slice(1) : K) })], ...arms }
    } },
  // ---- mail: over the padded coat or a shirt, under what goes over
  mail: { slot: "mail", n: 3, excludes: ["robe", "habit"], why: "a robe's skirt falls wide from the waist where the mail's hem lies: the mail goes under a cleric's vestments instead",
    colors: { mail: "iron" }, is: "a mail shirt to mid-thigh with short sleeves: its rings a texture of rows in the metal's tones, its hem and the sleeves' edges a lit band",
    draw: (F) => {
      const K = KEYS.mail, L = F.j.legs[0], z0 = L.hip[2] + 0.42 * (L.knee[2] - L.hip[2]), H = F.top - z0
      // (rows of rings a px apart: a lit row, then a row broken every other px (the rings' links, a step dark), staggered;
      // the hem's last row lit, a step out)
      const ring = (z, a) => (Math.floor(z * 1.05) % 2 ? K.slice(1, 4) : Math.floor(a * 4.4 + 9) % 2 ? K.slice(1, 3) : K.slice(0, 2))
      const body = F.wrap(z0, F.top, pure({ waist: F.waist, z0 }, (z) => (z < waist ? 3 + (0.7 * (waist - z)) / (waist - z0) : 3)), { keep: KEEP_MAIL,
        paint: (h, a, out) => (!out ? K[0] : h < 0.06 ? K.slice(2, 4) : ring(z0 + h * H, a)) })
      const arms = Object.fromEntries(F.j.arms.map((A, i) => {
        const far = i === F.farArm, end = lerp(A.sh, A.elbow, 0.78), t = 2.8 * TL
        return [`mailarm${i}`, [F.j.limb(A.sh, end, F.R.arm[0] + t, F.R.arm[0] + t + 0.15, (h, a) => (h > 0.8 ? (far ? K.slice(1, 3) : K.slice(2, 4)) : far ? K.slice(0, 2) : ring(h * 5, a)))]]
      }))
      return { mail: body, ...arms }
    } },
  // ---- plate: a breastplate over the mail (or a padded coat, a shirt), its ridge down the middle and the one light on it
  breastplate: { slot: "over", n: 3.9, needs: { either: ["torso", "mail"] }, colors: { plate: "steel" },
    is: "a steel breastplate and its backplate: a ridge down the middle catching the one light, swelling over the chest, a rolled rim at the neck and the arms, its hem a step out at the waist",
    draw: (F) => {
      const K = KEYS.plate, z0 = F.waist - 0.6, z1 = F.top - 0.1, H = z1 - z0
      // (the swell ahead, most at two thirds up, in layers, and its two halves meeting in a ridge down the middle: planes
      // that face two ways, so one is a band lighter; the ridge |a| < 0.12 lit, its glint at the swell's top)
      const nOf = pure({ z0, H }, (z, a) => 3.9 + (1.1 * Math.max(0, Math.cos(a)) ** 2 + 1.3 * Math.max(0, 1 - Math.abs(a) / 0.95)) * Math.sin(Math.PI * Math.min(1, ((z - z0) / H) * 1.2)))
      const q = F.wrap(z0, z1, nOf, { keep: KEEP_PLATE })
      F.shells.push(pure({ z0, z1, trunk: F.trunk, nOf }, (z, a) => (z < z0 || z > z1 ? 0 : trunk(z, a, nOf(z, a)))))
      // (its hem a rolled edge, lit; the armholes' edges lit; the backplate turned from the light: a lit band over the
      // shoulder blades, the horizon's dark band under it, lighter again at the small of the back)
      const plate = withN(q, (h, a, n) => (Math.abs(a) < 0.12 && h > 0.18 ? (Math.abs(h - 0.66) < 0.07 ? K[4] : K.slice(2, 4)) : h < 0.09 ? K.slice(2, 4) : h > 0.74 && Math.abs(Math.abs(a) - 1.57) < 0.3 ? K.slice(2, 4)
        : Math.abs(a) > 2.1 ? (h > 0.72 ? K.slice(2, 4) : h > 0.45 ? K.slice(0, 2) : K.slice(1, 3)) : SHINE(K, n)))
      // (the rims: at the neck a roll a step out and lit, at the waist the hem's)
      const rim = F.wrap(z1 - 0.7, z1 + 0.15, 4.6, { keep: KEEP_RIM, paint: (h, a, out) => (!out ? K[0] : K.slice(2, 4)) })
      return { plate: [plate, rim] }
    } },
  pauldrons: { slot: "shoulders", needs: { either: ["torso", "mail", "over"] }, on: "hang from", colors: { shoulders: "steel" },
    is: "pauldrons: a steel dome on each shoulder over two lames down the upper arm, each lame's top edge lit and the shade under it",
    draw: (F) => {
      const K = KEYS.shoulders, { j } = F
      return Object.fromEntries(j.arms.map((A, i) => {
        const far = i === F.farArm, k = dim(K.slice(0, 4), far), o = unit([A.sh[0] - j.chest[0], A.sh[1] - j.chest[1], 0]), r0 = F.R.arm[0] + 2.8 * TL
        const c = [A.sh[0] + o[0] * 0.7, A.sh[1] + o[1] * 0.7, A.sh[2] + 0.6]
        // (the dome standing off the shoulder past the arm: its top facing the sky lit, its rim a lit band round its lower
        // edge, the rest by how it faces; the lames' tops lit, the shade under each)
        const dome = withN(j.ball(c, [r0 + 1.2, r0 + 1.35, 1.9]), (h, a, n) => (h < 0.2 ? k.slice(2, 4) : n[2] > 0.6 ? k.slice(2, 4) : SHINE(k, n)))
        const lames = [0, 1].map((m) => withN(j.limb(lerp(A.sh, A.elbow, 0.12 + 0.2 * m), lerp(A.sh, A.elbow, 0.3 + 0.2 * m), r0 + 0.95 - 0.25 * m, r0 + 0.75 - 0.25 * m), (h, a, n) => (h < 0.3 ? k.slice(2, 4) : h > 0.8 ? k.slice(0, 2) : SHINE(k, n))))
        return [`pauldron${i}`, [dome, ...lames]]
      }))
    } },
  // ---- the alternatives to the mail, the breastplate and the pauldrons (each in its original's slot, by its rules)
  mail2: { slot: "mail", n: 3, excludes: ["robe", "habit"], why: "a robe's skirt falls wide from the waist where the mail's hem lies: the mail goes under a cleric's vestments instead",
    colors: { mail: "iron" }, is: "a mail shirt, the alternative (the mail's rings a texture of dots, these in rows): to mid-thigh with short sleeves, rows of rings round the body in the metal's tones, lit where the body turns to the light, dark in its folds at the waist and the armpits; it hangs straight from the waist, its hem and the sleeves' ends ragged",
    draw: (F) => {
      const K = KEYS.mail, L = F.j.legs[0], z0 = L.hip[2] + 0.42 * (L.knee[2] - L.hip[2]), H = F.top - z0
      // (it hangs cleanly over the hips with a gentle skirt flare so it never juts out like spikes past an open-sided tabard)
      const nOf = pure({ waist: F.waist, z0 }, (z, a) => (z < waist ? 3 + 0.45 * (waist - z) / (waist - z0) : 3))
      F.shells.push(pure({ z0, hi: F.waist - 0.8, trunk: F.trunk, nOf }, (z, a) => (z < z0 || z > hi ? 0 : trunk(z, a, nOf(z, a)))))
      // (a row of rings every 2.1 px up the body, round it as the body turns: its upper half the rings' tops, broken where
      // two rings meet (every 2.2 px round, each row staggered half a ring), its lower half the shade under them; the tone by
      // how it faces the light (HALF), less `fold` in a fold)
      const ring = (z, s, u) => {
        const row = Math.floor((z + 99) / 2.1), top = (z + 99) % 2.1 > 1.05, c = (((u / 2.2 + (row % 2) * 0.5) % 1) + 1) % 1
        if (!top || Math.abs(c - 0.5) > 0.36) return s > 0.5 ? K[1] : K[0]
        return s > 0.88 ? K[3] : s > 0.45 ? K[2] : K[1]
      }
      // (the folds: across the flanks at the waist where it gathers, under the arms, and three creases down each side where it
      // hangs from the waist)
      const fold = (z, b) => (Math.abs(z - F.waist) < 0.9 && b > 0.8 && b < 2.3 ? 0.4 : z > F.top - 2.6 && Math.abs(b - 1.57) < 0.5 ? 0.45
        : z < F.waist - 1 && [0.5, 1.3, 2.2].some((c) => Math.abs(b - c) < 0.1) ? 0.35 : 0)
      // (clean hem silhouette with alternating lit/shaded bottom ring row, no jagged teeth poking past a tabard)
      const body = withNO(F.wrap(z0, F.top, nOf, { keep: KEEP_MAIL }), (h, a, n, out) => {
        const z = z0 + h * H, b = Math.abs(a), s = dot3(n, HALF) - fold(z, b)
        if (!out) return K[0]
        if (h < 0.06) return Math.floor((a + 9) * 2.3) % 2 ? (s > 0.4 ? K[2] : K[1]) : K[0]
        return ring(z, s, a * F.trunk(z, a, 3))
      })
      // (the sleeves to above the elbow: rows of rings round the arm, the far one a step darker, the armpit side in shade;
      // their ends ragged: the last row's rings alternately lit and in shade)
      const arms = Object.fromEntries(F.j.arms.map((A, i) => {
        const far = i === F.farArm, end = lerp(A.sh, A.elbow, 0.78), t = 2.8 * TL, len = Math.hypot(...end.map((v, e) => v - A.sh[e]))
        return [`mailarm${i}`, [withN(F.j.limb(A.sh, end, F.R.arm[0] + t, F.R.arm[0] + t + 0.25), (h, a, n) => {
          const s = dot3(n, HALF) - (far ? 0.35 : 0) - (n[2] < -0.3 ? 0.3 : 0)
          if (h > 0.86) return Math.floor((a + 9) * 2.2) % 2 ? (s > 0.4 ? K[2] : K[1]) : K[0]
          return ring((1 - h) * len, s, a * (F.R.arm[0] + t))
        })]]
      }))
      return { mail: body, ...arms }
    } },
  breastplate2: { slot: "over", n: 3.9, needs: { either: ["torso", "mail"] }, colors: { plate: "steel" },
    is: "a steel breastplate, the alternative (the breastplate a smooth swell, this one planes and rims): its backplate with it, a shell standing off the chest: a ridge down the middle with the light on one side of it, a rolled edge at the neck and the armholes, its lower edge flared off the belly with the dark under it, strapped at the flanks",
    draw: (F, p, W) => {
      const K = KEYS.plate, { j } = F, z0 = F.waist - 0.6, z1 = F.top - 0.1, H = z1 - z0, under = ["pauldrons", "pauldrons2"].includes(W.shoulders?.key)
      // (the swell ahead, most at two thirds up, in layers, and its two halves meeting in a ridge down the middle; its lower
      // edge flared a layer out off the belly)
      const nOf = pure({ z0, H }, (z, a) => 3.9 + (1.1 * Math.max(0, Math.cos(a)) ** 2 + 1.3 * Math.max(0, 1 - Math.abs(a) / 0.95)) * Math.sin(Math.PI * Math.min(1, ((z - z0) / H) * 1.2)) + 1.1 * Math.max(0, 1 - (z - z0) / 1.1))
      const q = F.wrap(z0, z1, nOf, { keep: KEEP_PLATE })
      F.shells.push(pure({ z0, z1, trunk: F.trunk, nOf }, (z, a) => (z < z0 || z > z1 ? 0 : trunk(z, a, nOf(z, a)))))
      // (the front's two halves are planes turned off the ridge, each tipped up over the swell and down under it: the half
      // turned to the light its two lightest, the other a band darker; painted by those planes, not the round body's normal)
      const plane = (h, a) => { const sd = Math.sign(a) || 1, tilt = h > 0.6 ? 0.5 : h < 0.32 ? -0.55 : 0; return unit([0, 1, 2].map((e) => j.f[e] * 0.82 + j.r[e] * sd * 0.6 + (e === 2 ? tilt : 0))) }
      const tone = (s) => (s > 0.93 ? K[3] : s > 0.7 ? K[2] : s > 0.35 ? K[1] : K[0])
      const plate = withNO(q, (h, a, n, out) => {
        const z = z0 + h * H, b = Math.abs(a)
        if (!out) return K[0]
        // (the lower edge: a roll lit on top, the plate tucked in over it in shade)
        if (z - z0 < 0.6) return b < 1.9 ? K[3] : K[2]
        if (z - z0 < 1.3) return K[0]
        // (the neck's rolled edge round the opening ahead, the armholes' over the shoulders, each a lit row over a dark one)
        if (h > 0.83 && b < 0.62) return K[3]
        if (h > 0.84 && Math.abs(b - 1.57) < 0.42) return K[3]
        if (h > 0.76 && Math.abs(b - 1.57) < 0.42) return K[0]
        // (the shade the pauldrons cast where they lie over it)
        if (under && h > 0.74 && b > 1.2 && b < 1.9) return K[1]
        // (the straps at the flanks joining the two plates: a dark band, its buckle lit)
        if (Math.abs(b - 1.57) < 0.13 && h > 0.3 && h < 0.6) return Math.abs(h - 0.45) < 0.06 ? K[2] : K[0]
        // (the ridge: a lit line, the one light where the swell turns to it)
        if (b < 0.14 && h > 0.18) return Math.abs(h - 0.66) < 0.07 ? K[4] : K[3]
        if (b < 1.25) return tone(dot3(plane(h, a), HALF))
        // (the backplate turned from the light: a lit band over the shoulder blades, the horizon's dark band under it,
        // lighter again at the small of the back)
        if (b > 2.1) return h > 0.72 ? K[2] : h > 0.55 ? K[1] : K[2]
        return tone(dot3(n, HALF) - 0.15)
      })
      // (the rims: at the neck a roll a step out and lit, behind and at the sides)
      const rim = F.wrap(z1 - 0.7, z1 + 0.15, 4.6, { keep: KEEP_RIM, paint: (h, a, out) => (!out ? K[0] : K.slice(2, 4)) })
      return { plate: [plate, rim] }
    } },
  pauldrons2: { slot: "shoulders", needs: { either: ["torso", "mail", "over"] }, on: "hang from", colors: { shoulders: "steel" },
    is: "pauldrons, the alternative (the pauldrons a dome at the shoulder, these set up on the plate's corner): plates of their own, a shell over each shoulder standing a step off the body, its rolled rim lit with the shade under it, two lames under it down the upper arm each flared out over the next, the dark where they lie over a breastplate",
    draw: (F) => {
      const K = KEYS.shoulders, { j } = F
      return Object.fromEntries(j.arms.map((A, i) => {
        const far = i === F.farArm, k = dim(K, far), o = unit([A.sh[0] - j.chest[0], A.sh[1] - j.chest[1], 0]), r0 = F.R.arm[0] + 2.8 * TL
        const c = [A.sh[0] + o[0] * 1, A.sh[1] + o[1] * 1, A.sh[2] + 1.1]
        // (by how it faces: the one light where it mirrors the light to the eye, its top the sky's two lightest, the band
        // turning from the sky dark, facing down the darkest)
        const tone = (n) => { const s = dot3(n, HALF); return s > 0.93 ? k[4] : s > 0.7 || n[2] > 0.5 ? k[3] : n[2] < -0.3 ? k[1] : s > 0.3 ? k[2] : k[1] }
        // (the shell: wider than it is tall, over the shoulder's cap, its lower edge a rolled rim: lit, its last row dark)
        const dome = withN(j.ball(c, [r0 + 1.1, r0 + 1.25, 1.55]), (h, a, n) => (h < 0.12 ? k[0] : h < 0.27 ? k[3] : tone(n)))
        // (the lames: each a band flared toward its foot, its top lit, its foot in shade, the next under it)
        const lames = [0, 1].map((m) => withN(j.limb(lerp(A.sh, A.elbow, 0.3 + 0.22 * m), lerp(A.sh, A.elbow, 0.5 + 0.22 * m), r0 + 0.45 - 0.15 * m, r0 + 0.9 - 0.15 * m),
          (h, a, n) => (h < 0.35 ? k[3] : h > 0.78 ? k[0] : tone(n))))
        return [`pauldron${i}`, [dome, ...lames]]
      }))
    } },
  // ---- the classes' garments
  robe: { slot: "torso", n: 1.4, hangs: true, trim: true, len: 0.97, flare: 2.4, cuff: 0.82, bell: 1.5, excludes: ["skirt", "rolledup"], why: "a robe is its own skirt and its wide sleeves fall to the wrist",
    colors: { torso: "navy", trim: "mustard" }, is: "a mage's robe: closed to the neck, its skirt from the waist to over the feet, wide sleeves belled at the wrist, a border at the collar, the hem, the cuffs and down the front",
    draw: (F, p, W, B) => robe(F, p, W, B, PIECES.robe) },
  sash: { slot: "belt", needs: { either: ["torso", "legs"] }, colors: { belt: "red" }, is: "a cloth sash wound twice round the waist, knotted at the side, its two ends hanging",
    draw: (F, p, W) => {
      const K = KEYS.belt, n = Math.max(3, outerOf(W) + 0.5), r = Math.max(F.trunk(F.waist, -1.15, n), F.shell(F.waist, -1.15) + 0.4) + 0.3, k = roundAt(F, F.waist - 0.2, -1.15, r)
      const tail = (dz, s) => F.j.limb(k, hung(F, [k[0] + F.j.r[0] * s, k[1] + F.j.r[1] * s, k[2] - dz], 0.8), 0.75, 0.55, (h) => (h > 0.85 ? K.slice(0, 2) : K))
      return { sash: [F.wrap(F.waist - 1, F.waist + 0.9, F.shells.length ? overShell(F, n) : n, { paint: (h, a, out) => (!out ? K[0] : Math.abs(h - 0.48) < 0.08 ? K.slice(0, 2) : h > 0.75 ? K.slice(1) : K) }), F.j.ball(k, [1, 0.9, 0.9], K.slice(1)), tail(3.6, -0.5), tail(2.8, 0.4)] }
    } },
  // ---- leather: a jerkin over a shirt, the mail or bare (sleeveless), its panels stitched or studded; bracers
  jerkin: { slot: "over", n: jerkinN, colors: { over: "brown" }, is: "a leather jerkin to the hips, sleeveless: laced down the front, its panels joined by stitched seams, its hem a step out and in shade",
    draw: (F, p, W) => jerkin(F, W, false) },
  studded: { slot: "over", n: jerkinN, colors: { over: "black", metal: "iron" }, is: "a studded leather jerkin: dark leather to the hips, sleeveless, rows of iron studs, laced down the front",
    draw: (F, p, W) => jerkin(F, W, true) },
  studded2: { slot: "over", n: jerkinN, colors: { over: "black", metal: "iron" }, is: "a studded leather jerkin, the alternative: leather first, six stitched panels each with its sheen and a band of it across the chest, rolled edges, a few iron studs placed down the seams and on the shoulders, not rows over the whole",
    draw: (F, p, W) => studded2(F, W) },
  bracers: { slot: "arms", colors: { arms: "brown" }, is: "leather bracers on the forearms over the sleeves' cuffs, two straps each, their edges a step lit",
    draw: (F) => forearms(F, false) },
  vambraces: { slot: "arms", colors: { arms: "steel" }, is: "vambraces: steel tubes on the forearms, a cop over each elbow, their rims lit",
    draw: (F) => forearms(F, true) },
  // ---- the hands (the slot the wolf's paws are in: a gauntlet goes on a paw as on a hand, the paw's size); drawn with the
  // beast's parts, over the arms (draw(F, B, P))
  gauntlets: { slot: "hands", colors: { hands: "steel" }, is: "gauntlets: a block of plated fingers, its knuckles a lit band, a flared cuff over the wrist, its rim lit",
    draw: (F, B, P) => gloves(F, P, true) },
  gloves: { slot: "hands", colors: { hands: "black" }, is: "leather gloves: the fingers a block, a cuff over the wrist a step out",
    draw: (F, B, P) => gloves(F, P, false) },
  // ---- the shins: greaves and their sabatons over the boots
  greaves: { slot: "shins", needs: { feet: ["boots", "highboots", "shoes"] }, excludes: ["robe", "habit", "skirt"], why: "a long hem falls over the shins and the feet where the greaves and the sabatons stand",
    colors: { shins: "steel" }, is: "greaves over the boots from under the knee to the ankle, a cop over the knee, sabatons over the feet in lames from the toe back to the heel (a foot, not a T)",
    draw: (F) => {
      const K = KEYS.shins, { j, R } = F
      return Object.fromEntries(j.legs.map((L, i) => {
        const k = dim(K.slice(0, 4), i === F.farLeg), d = unit([L.toe[0] - L.heel[0], L.toe[1] - L.heel[1], 0])
        const dj = F.digi ? digiJoints(F, L) : undefined, lo = dj ? dj.hock : L.knee, r0 = dj ? R.leg[2] * 0.9 : R.leg[1], top = lerp(lo, L.ankle, 0.08)
        // (the shin: sleek plate fitted cleanly over the boot so shins stay proportional to thighs; the cop: knee/hock dome)
        const shin = withN(j.limb(top, lerp(lo, L.ankle, 0.98), r0 + 0.78, R.leg[2] + 0.72), (h, a, n) => (h < 0.12 || h > 0.9 ? k.slice(2, 4) : SHINE(k, n)))
        const copAt = dj ? dj.stifle : L.knee
        const cop = withN(j.ball([copAt[0] + j.f[0] * 0.35, copAt[1] + j.f[1] * 0.35, copAt[2]], [R.leg[1] + 0.8, R.leg[1] + 0.78, 1.18]), (h, a, n) => (h < 0.22 ? k.slice(0, 2) : SHINE(k, n)))
        // (the sabaton: the boot's foot grown a layer, in lames across it from the toe back: each lame's front edge lit)
        const sab = foot(F, L, TL * 1.9, k), sq = sab.field.paint((q, n) => { const t = (q[0] - L.ankle[0]) * d[0] + (q[1] - L.ankle[1]) * d[1]
          return q[2] < L.ankle[2] - R.foot[2] * 0.2 + 0.25 ? k[0] : ((t + 9) % 1.1) < 0.35 ? k.slice(2, 4) : SHINE(k, n) })
        return [`greave${i}`, [shin, cop, sq]]
      }))
    } },
  faulds: { slot: "belt", needs: { over: ["breastplate", "breastplate2"] }, colors: { plate: "steel" }, is: "faulds: two lames of plate hung from the breastplate's waist over the hips (its own steel), each lame's top edge lit, the shade under it",
    draw: (F, p, W) => {
      const K = KEYS.plate, z0 = F.waist - 3.1, z1 = F.waist + 0.3, n = pure({ z0, z1, share }, (z) => 4.4 + 1.3 * share(z1 - z, 0, z1 - z0))
      const q = F.wrap(z0, z1, n), f = withN(q, (h, a, nn) => { const t = (((1 - h) * (z1 - z0)) % 1.7) / 1.7; return t < 0.28 ? K.slice(2, 4) : t > 0.82 ? K.slice(0, 2) : SHINE(K, nn) })
      F.shells.push(pure({ z0, z1, trunk: F.trunk, n }, (z, a) => (z < z0 || z > z1 ? 0 : trunk(z, a, n(z)))))
      return { faulds: f }
    } },
  // ---- cloth over armor: a tabard (a cross, or a band across the chest), a cleric's vestments
  tabard: { slot: "apron", needs: { either: ["mail", "over:breastplate", "over:breastplate2"] }, on: "go over", n: 4.3, device: "cross", colors: { apron: "green", device: "mustard" },
    is: "a tabard over mail or plate: two panels hung from the shoulders to the knee, front and back, open at the sides, its hem in shade, a cross on it in a second color",
    draw: (F, p, W, B) => panels(F, p, W, B, PIECES.tabard) },
  tabardband: { slot: "apron", needs: { either: ["mail", "over:breastplate", "over:breastplate2"] }, on: "go over", n: 4.3, device: "band", colors: { apron: "teal", device: "white" },
    is: "a tabard over mail or plate, two panels to the knee, a band across the chest in a second color",
    draw: (F, p, W, B) => panels(F, p, W, B, PIECES.tabardband) },
  vestments: { slot: "apron", needs: { either: ["torso", "mail"] }, on: "go over", n: 4.2, device: "stole", colors: { apron: "white", device: "mustard" },
    is: "a cleric's vestments: a long open-sided cloth to the shin over the torso or the mail, a stole down its front in two bands, its hem bordered",
    draw: (F, p, W, B) => panels(F, p, W, B, PIECES.vestments) },
  // ---- the classes' cloth: a monk's habit, a fur mantle
  habit: { slot: "torso", n: 1.3, hangs: true, trim: false, len: 0.88, flare: 1.5, cuff: 0.6, bell: 1.1, excludes: ["skirt", "rolledup"], why: "a habit is its own skirt and its sleeves are wide",
    colors: { torso: "canvas" }, is: "a monk's habit: a plain robe closed to the neck, to the ankles, its sleeves wide to mid-forearm",
    draw: (F, p, W, B) => robe(F, p, W, B, PIECES.habit) },
  furs: { slot: "shoulders", beast: false, whyBeast: "its own mane spreads over the shoulders where a mantle lies", colors: { shoulders: "fur" },
    is: "a fur mantle over the shoulders and the upper arms, its hem ragged in tufts, the fur's strokes down its fall",
    // (built over what it covers: the torso's pieces and the upper arms)
    draw: (F, p, W, B, P) => {
      const K = KEYS.shoulders, z0 = F.top - 3.4, z1 = F.top + 1.4, m = Math.max(0, outerOf(W) - 2.5)
      return { furs: F.wrap(z0, z1, coverWrap(F, P, "furs", z0, z1, pure({ m, z0, z1, share }, (z) => 6.2 + m - (4.6 + m) * share(z, z0, z1) ** 1.4), true), { keep: pure({}, (h, a) => h > 0.13 || Math.sin(a * 11 + 1) > -0.1),
        paint: (h, a, out) => (!out ? K[1] : h < 0.2 ? K.slice(1, 3) : Math.abs(Math.sin(a * 7)) < 0.28 ? K.slice(1, 4) : h > 0.75 ? K.slice(3, 5) : K.slice(2, 5)) }) }
    } },
})
// each piece its name and its layer (the table above: what it lies over)
for (const [k, P] of Object.entries(PIECES)) Object.assign(P, { key: k, layer: { torso: 1, mail: 2, over: 2.5, legs: 1, feet: 2, shins: 2.5, belt: 3, apron: 3.5, shoulders: 3.6, cloak: 4, arms: 1, hands: 2 }[P.slot] })
// the parts a body and its pieces make (rig3d's), by rule
const worn = (B, W, digi = false, skin, bony = false) => { const cache = new Map(); return (j, p) => {
  const F = Object.assign(frameOf(j, B, digi, skin, bony), { pose: p, mounted: p?.mounted, cache }), P = bare(F, W)
  if (p.lag) F.lag = p.lag
  // (a tabard or vestments before the belt, which goes over them: their shell is made when they are)
  for (const s of W.apron?.n ? ["torso", "mail", "over", "legs", "feet", "shins", "arms", "apron", "belt", "shoulders", "cloak"] : ["torso", "mail", "over", "legs", "feet", "shins", "arms", "belt", "apron", "shoulders", "cloak"]) {
    const Q = W[s]
    if (!Q) continue
    Object.assign(P, Q.draw ? Q.draw(F, p, W, B, P) : s === "legs" ? trousersOf(F, Q, W) : s === "feet" && Q.shaft ? shoesOf(F, Q, W) : {})
  }
  // a beast's own: the mane and the tail parts of their own, paws in the bare hands' place
  for (const s of BEASTLY) if (W[s]) Object.assign(P, W[s].draw(F, B, P, W))
  // what of the headwear lies on the body: a hood's cowl, the hood down, a coif's skirt (over the collar and the mane)
  if (W.headwear?.body) Object.assign(P, HWBODY[W.headwear.body](F, P))
  // what of the hair and the beard falls past the head: down the back, down the chest
  for (const s of ["hair", "beard"]) if (W[s]?.body) Object.assign(P, W[s].body(F, B))
  // (walking, what hangs from a tie: the head baked without it)
  if (F.lag?.[0] && W.hair?.hang) Object.assign(P, W.hair.hang(F))
  // what it holds and carries, on what it wears
  if (THING_SLOTS.some((s) => W[s])) Object.assign(P, carried(F, W, B, P, p))
  return P
} }
// a wrap's layers (z => n, or (z, a) => n) built over what it covers (drapeOver, in px: T0 a layer), or as they were where
// nothing reaches it
const coverWrap = (F, P, name, z0, z1, n, arms) => {
  if (!P) return n
  const r0 = (h, a) => { const z = z0 + h * (z1 - z0); return F.trunk(z, a, n(z, a)) }, more = drapeOver(F, P, name, wrapRay(F, z0, z1), r0, undefined, arms)
  return more ? asPure({ n, more, z0, dz: z1 - z0, T0 }, (z, a) => n(z, a) + more((z - z0) / dz, a) / T0) : n
}
// (z's share of the way from a to b, 0 to 1)
const share = pure({}, (z, a, b) => Math.max(0, Math.min(1, (z - a) / (b - a))))
const HWBODY = {
  // the hood's cowl: from round the neck, where the hood closes under the chin, out over the shoulders and the cloak,
  // its hem in shade, two folds a side
  // (built over what it covers: the cloak, the mane, the collar)
  cowl: (F, P) => { const z0 = F.top - 1.8, z1 = F.top + 1.2; return { cowl: F.wrap(z0, z1, coverWrap(F, P, "cowl", z0, z1, pure({ z0, z1, share }, (z) => 5.6 - 4.6 * share(z, z0, z1)), true),
    { paint: (h, a, out) => (!out ? HK[0] : h < 0.14 ? HK.slice(0, 2) : Math.abs(Math.abs(a) - 1.1) < 0.1 || Math.abs(Math.abs(a) - 2.2) < 0.1 ? HK.slice(0, 3) : HK) }) } },
  // the hood down: a collar of its cloth round the neck, its rolled edge lit, and behind it the hood's bag on the upper
  // back, its mouth dark where it opens upward
  down: (F) => { const z0 = F.top - 3.6, z1 = F.top + 1.1; return { hooddown: F.wrap(z0, z1, pure({ z0, z1, share }, (z, a) => 3.6 + (Math.abs(a) > 1.9 ? 2.6 * Math.sin(Math.PI * share(z, z0, z1)) : 0)),
    { keep: pure({}, (h, a) => h > 0.55 || Math.abs(a) > 2.05), paint: (h, a, out) => (!out ? HK[0] : h > 0.9 ? (Math.abs(a) > 2.2 ? HK.slice(0, 2) : HK.slice(1)) : h < 0.08 ? HK.slice(0, 2) : HK) }) } },
  // a coif's skirt: from under its round the neck out over the collar to the shoulders, a seam at its hem
  skirt: (F) => { const z0 = F.top - 2.4, z1 = F.top + 1.3; return { coifskirt: F.wrap(z0, z1, pure({ z0, z1, share }, (z) => 5.2 - 4 * share(z, z0, z1)), { paint: (h, a, out) => (!out ? HK[0] : h < 0.14 ? HK.slice(0, 2) : HK) }) } },
}

// ---------------------------------------------------------------- what fits with what
// Each piece's slot (one piece a slot), its layer (above), what it needs (`needs`: a slot worn, or one of some pieces in
// it; `either`: one of those slots worn) and what it excludes (pieces it can't be worn with): the reason a spec doesn't
// fit, and what would. A hair or a beard fits the heads it names.
// (a word with its article)
const an = (w) => (/^[aeiou]/.test(w) ? "an " : "a ") + w
const check = (W, H) => {
  const worn = Object.values(W).filter(Boolean)
  for (const P of worn) {
    for (const [s, list] of Object.entries(P.needs ?? {})) {
      // (either: one of those slots worn, or "slot:piece" that piece in it)
      if (s === "either") { if (!list.some((q) => (q.includes(":") ? W[q.split(":")[0]]?.key === q.split(":")[1] : W[q]))) return `the ${P.slot} '${P.key}' needs ${list.map((q) => an(q.split(":").pop())).join(" or ")} piece to ${P.on ?? "hold to"}`; continue }
      if (!W[s]) return `the ${P.slot} '${P.key}' goes over ${an(s)} piece and none is worn (${s}: ${list === "any" ? Object.values(PIECES).filter((q) => q.slot === s).map((q) => q.key).join(", ") : list.join(", ")})`
      if (list !== "any" && !list.includes(W[s].key)) return `the ${P.slot} '${P.key}' goes over ${list.map(an).join(" or ")}, not over the ${s} '${W[s].key}' (${s}: ${list.join(", ")})`
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
  for (const P of worn) if (P.beast === false && (W.mane || H.key === "wolf" || H.key === "werewolf")) return `the ${P.slot} '${P.key}' doesn't go on the ${H.key}-headed body: ${P.whyBeast}`
  for (const P of [W.face, W.hair, W.beard, W.ears, W.horns, W.headwear].filter(Boolean)) if (P.fits && !P.fits.head.includes(H.key)) return `the ${P.slot} '${P.key}' fits the head ${P.fits.head.join(", ")}, not '${H.key}'${P.slot === "headwear" ? `: ${P.wolfWhy ?? "shaped for another skull"}; on the ${H.key}'s: ${Object.values(HATS).filter((q) => q.fits.head.includes(H.key)).map((q) => q.key).join(", ") || "none"}` : `: ${WHY_HEAD[P.slot] ?? "shaped for another skull"}`}`
  // the headwear and the hair / ears / horns: a hair with its hat welded on takes no other; a bun, a tail, a braid, crown ears or tall horns the piece can't take
  const P = W.headwear, hair = W.hair
  if (P && hair?.covers?.includes("headwear")) return `the hair '${hair.key}' has its hat on it (the crew's, welded): wear the hair 'short' (or another) under the headwear '${P.key}'`
  if (P && W.beard?.wide && P.jaw) return `the headwear '${P.key}' closes round the face over the jaw: the beard '${W.beard.key}' would lie under its edge; beards that go with it: ${Object.values(HAIRPARTS).filter((q) => q.slot === "beard" && !q.wide).map((q) => q.key).join(", ")}`
  if (P && hair?.tie && !P.lets.includes(hair.tie)) return `the headwear '${P.key}' covers ${P.covers}: a ${{ hightail: "high tail", tails: "pair of tails" }[hair.tie] ?? hair.tie} can't go under it (${WHY_TIE[hair.tie] ?? P.whyNot}); hairs that go under it: ${Object.values(HAIRPARTS).filter((q) => q.slot === "hair" && q.fits.head.includes(H.key) && !q.covers && (!q.tie || P.lets.includes(q.tie))).map((q) => q.key).join(", ")}`
  if (P && W.ears?.crown && !P.bare && !P.closed && P.key !== "hooddown") return `the headwear '${P.key}' sits on the crown where '${W.ears.key}' ears stand; wear circlet, hooddown, or no headwear`
  if (P && W.horns && !P.bare && P.key !== "bandana" && P.key !== "hooddown") return `the headwear '${P.key}' covers the brow/crown where '${W.horns.key}' horns grow; wear circlet, bandana, hooddown, or no headwear`
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
// why a human face, hair, beard, ears or horns has no place on another skull
const WHY_HEAD = { face: "a face is painted over its own head's eyes, nose and mouth", hair: "hair is modeled on the human skull",
  beard: "a beard grows on a human jaw", ears: "these ears are modeled on the human skull's temples and crown", horns: "these horns are modeled on horned skulls" }
// dynamic combat facial expression overlays on human faces (at FA anchor: brow row 0, lids 1, eyes 2, nose 3, mouth 4)
const EXPR = {
  grit: {
    s: `
      ...............
      ....j..z..j....
      ...SkkSSSkkS...
      ...SzESSSEzS...
      ...............
      .....zLzLz.....`,
    sw: `
      ................
      ...j..j.j.......
      ...SkSSkk.......
      ....ESSEz.......
      ................
      .....zLz........`,
    w: `
      .................
      ..jj.............
      ..Skk............
      ..SEz............
      .................
      ..zLz............`,
  },
  wince: {
    s: `
      ...............
      ....z.....z....
      ...SzkSSSkzS...
      ...SkkSSSkkS...
      ...SSS.L.SSS...
      .....zkzkz.....`,
    sw: `
      ................
      ...z....z.......
      ...SzSSkz.......
      ....kkSkk.......
      ....SLLSS.......
      .....zkz........`,
    w: `
      .................
      ..zz.............
      ..Szk............
      ..Skk............
      ..SLSS...........
      ..zkz............`,
  },
  dead: {
    s: `
      ...............
      ...............
      ...SssSSSssS...
      ...SkkSSSkkS...
      ...SSS.L.SSS...
      .....zzzzz.....`,
    sw: `
      ................
      ................
      ...SsSSss.......
      ....kkSkk.......
      ....SLLSS.......
      .....zzz........`,
    w: `
      .................
      .................
      ..Sss............
      ..Skk............
      ..SLSS...........
      ..zzz............`,
  },
}
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
const STRANDS = pure({}, (q) => (Math.abs(q[0]) < 0.45 && q[1] > -3.5 && q[2] > 2.5 ? "Jjh" : q[1] < -1 && ((((Math.atan2(q[0], -q[1]) * 5) / Math.PI) % 1) + 1) % 1 < 0.2 ? "Jjh" : "JjhH"))
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
const SPIKE_PAINT = pure({ SPIKES }, (q) => {
  let a = 9, b = 9
  for (const S of SPIKES) { const d = S.dist(q); if (d < a) { b = a; a = d } else if (d < b) b = d }
  return a > 0.35 ? "Jjh" : b - a < 0.4 ? "Jj" : q[2] > 2 ? "jhHY" : "JjhH"
})
// (a high tail's and two tails' pieces: what hangs from the tie a piece of its own, so in a walk the head is baked without
// it and it hangs from the head as a part of the figure, a frame behind (`still`, `hang`); standing, baked with the head)
const PONY = [DRAWN.noise({ amp: 0.25, scale: 1.3, seed: 32 }).paint(COMBED([0, -5.4, 3.4])), sdf.ellipsoid([1.15, 0.9, 1.15]).at(0, -5.5, 3.5).mat("Jj").part("tie")]
const PONYTAIL = sdf.capsule([0, -6.1, 3.6], [0, -8.1, 1.2], 1.2, 1.65).union(sdf.capsule([0, -8.1, 1.2], [0, -7.4, -4.2], 1.65, 0.5), { smooth: 0.8 }).noise({ amp: 0.2, scale: 1.2, seed: 33 }).mat("JjhHY").part("tail")
const TWO = [DRAWN.noise({ amp: 0.25, scale: 1.3, seed: 40 }).paint((q) => (Math.abs(q[0]) < 0.45 && q[2] > 2.5 ? "Jjh" : "JjhH")), (s) => sdf.ellipsoid([1, 1.05, 1.05]).at(s * 4.6, -2.6, -1.2).mat("Jj").part(`tie${s}`),
  (s) => sdf.capsule([s * 5, -2.9, -1.8], [s * 5.6, -3.2, -6.6], 1.35, 0.55).noise({ amp: 0.2, scale: 1.2, seed: 41 }).mat("JjhH").part(`tail${s}`)]
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
    body: (F) => ({ hairback: F.wrap(F.top - 6.5, F.top + 1.4, 4.7, { keep: pure({}, (h, a) => Math.abs(a) > 2.2), paint: FALL,
      // (in motion its hem a frame behind, its top on the head)
      ...(F.lag ? { shift: pure({ z0: F.top - 6.5, hasLean: F.hasLean, pZ: F.pZ, lx: F.lx, ly: F.ly,
        qx: -F.j.f[0] * F.lag[0] + F.j.r[0] * 0.7 * F.lag[1], qy: -F.j.f[1] * F.lag[0] + F.j.r[1] * 0.7 * F.lag[1] }, (h) => {
        const z = z0 + h * 7.9, sx = hasLean && z > pZ ? lx * (z - pZ) : 0, sy = hasLean && z > pZ ? ly * (z - pZ) : 0
        return [sx + (1 - h) * qx, sy + (1 - h) * qy]
      }) } : {}) }) }) },
  ponytail: { slot: "hair", is: "a high ponytail: drawn back smooth from the brow, tied high at the back of the crown, the tail falling to the nape", tie: "hightail", bulk: 0.4, reach: 10, cover: true,
    field: sdf.union(...PONY, PONYTAIL), still: sdf.union(...PONY),
    hang: (F) => { const { j } = F, m = hung(F, atHead(j, -8.1, 0, 1.2), 0.45)
      return { hangtail: [j.limb(atHead(j, -6.1, 0, 3.6), m, 1.2, 1.65, "JjhHY"), j.limb(m, hung(F, atHead(j, -7.4, 0, -4.2), 1), 1.65, 0.5, "JjhHY")] } } },
  twotails: { slot: "hair", is: "two tails: parted in the middle, drawn to each side, tied behind the ears, the tails hanging past the jaw", tie: "tails", bulk: 0.4, reach: 10, cover: true,
    field: sdf.union(TWO[0], ...[-1, 1].flatMap((s) => [TWO[1](s), TWO[2](s)])), still: sdf.union(TWO[0], ...[-1, 1].map(TWO[1])),
    hang: (F) => Object.fromEntries([-1, 1].map((s) => [`hangtail${s}`, F.j.limb(atHead(F.j, -2.9, s * 5, -1.8), hung(F, atHead(F.j, -3.2, s * 5.6, -6.6), 1), 1.35, 0.55, "JjhH")])) },
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
    body: (F) => ({ hairtail: F.j.limb(atHead(F.j, -6.2, 0, -5.6), hung(F, [F.j.chest[0] - F.j.f[0] * 5.2, F.j.chest[1] - F.j.f[1] * 5.2, F.top - 7], 1), 1.15, 0.6, (h) => (h > 0.92 ? "Jjh" : "JjhH")) }) },
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
    body: (F) => ({ beardfront: F.j.limb(atHead(F.j, 2.4, 0, -5.4), hung(F, [0, 1].map((e) => F.j.chest[e] + F.j.f[e] * (F.trunk(F.top - 5.2, 0, 3) + 1)).concat(F.top - 5.2), 0.5), 2.5, 0.9, (h, a) => (h > 0.9 ? "Jjh" : Math.abs(((a * 5) / Math.PI) % 1) < 0.2 ? "Jjh" : "JjhH")) }) },
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
    body: (F) => Object.fromEntries([-1, 1].map((s) => [`braid${s}`, F.j.limb(atHead(F.j, 2.6, s * 1.5, -5.6), hung(F, [0, 1].map((e) => F.j.pelvis[e] + F.j.f[e] * (F.trunk(F.waist + 1.2, 0, 4) + 0.9) + F.j.r[e] * s * 1.3).concat(F.waist + 1.2), 0.7), 1.1, 0.8,
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
const FOLDS = pure({ HK }, (q) => (Math.abs(Math.abs(Math.atan2(q[0], q[1])) - 1.95) < 0.13 && q[2] < 4 ? HK.slice(0, 3) : HK))
// metal by how it faces: the top lit, a dark band where it turns from the sky (the horizon it mirrors), the lower turn
// lighter again (the ground's light): a hard surface's bands, not cloth's soft roll
const METAL_BY = pure({ METAL }, (q, n) => (n[2] > 0.74 ? METAL.slice(2) : n[2] > 0.34 ? METAL.slice(1, 3) : n[2] > -0.05 ? METAL.slice(0, 2) : METAL.slice(1, 3)))
const DOME = (r, at, z0, rise = 0) => sdf.ellipsoid(r).at(...at).intersect(above(z0, rise))
const HATS = {
  flatcap: { material: "cloth", colors: { hat: "tweed" }, covers: "the crown: the hair under its rim and at the nape", lets: ["bun", "tail", "braid"], face: "its brim's shade on the brow (the crew's)", reach: 7.5,
    is: "the crew's flat cap: a puffed crown wider than the head, a short brim over the brow",
    human: () => ({ field: sdf.union(C.HATS.fc[0].mat(HK.slice(1)), C.HATS.fc[1].mat(HK.slice(1))), cut: above(4.6) }),
    paint: delta(C.FACES.fc, C.ANCHORS.fc, (y) => y < 1), shade: 0 },
  bandana: { material: "cloth", colors: { hat: "red" }, covers: "the crown to a rolled hem above the ears, knotted at the back", lets: ["bun", "tail", "braid"], face: "none", reach: 9,
    is: "the crew's bandana: a cloth cap flat on the crown, its hem rolled, knotted at the back, two tails",
    human: () => ({ field: sdf.union(C.HATS.sa.cloth.paint((q) => (q[2] - 0.04 * q[1] < 2.5 ? HK[1] : HK.slice(1))).part("cloth"), C.HATS.sa.knot.mat(HK.slice(1)).part("knot")), cut: above(1.7, -0.04) }),
    wolf: () => ({ field: sdf.union(C.HATS.sa.cloth.scale(0.82).at(0, -1.2, 0.6).paint((q) => (q[2] < 2.1 ? HK[1] : HK.slice(1))).part("cloth"), C.HATS.sa.knot.scale(0.82).at(0, -1.2, 0.6).mat(HK.slice(1)).part("knot")) }),
    bear: () => ({ field: sdf.union(C.HATS.sa.cloth.scale(0.98).at(0, -0.75, 1.25).paint(pure({ HK }, (q) => (q[2] < 2.75 ? HK[1] : HK.slice(1)))).part("cloth"), C.HATS.sa.knot.scale(0.98).at(0, -0.75, 1.25).mat(HK.slice(1)).part("knot")) }), shade: 0 },
  headscarf: { material: "cloth", colors: { hat: "plum", band: "mustard" }, covers: "all of the hair but a fringe at the brow, the ears too, tied at the nape", lets: ["tail", "braid"], face: "its edge's shade round the face", reach: 9, closes: true,
    is: "a headscarf over the hair and the ears to the jaw, a border along its edge across the brow, tied at the nape, its point and ends hanging",
    human: () => ({ field: sdf.union(shellOf([5.35, 5.85, 5.55], [0, -1, 0.3], [5, 4.9, 4.8], [0, 4.9, -2.2], -4, undefined, HB),
      sdf.union(sdf.ellipsoid([1.3, 1.1, 1.1]).at(0, -6.1, -2.6), sdf.capsule([-0.3, -6.2, -3], [-1.1, -6.5, -6], 0.9, 0.5), sdf.capsule([0.4, -6.2, -3], [1.2, -6.3, -5.6], 0.8, 0.45)).mat(HK.slice(1)).part("knot"),
      sdf.cone(2.8, 4.4, 0).rotate(180, "x").scale([1, 0.3, 1]).rotate(-14, "x").at(0, -6.4, -1.2).mat(HK).part("flap")),
      keep: keepIn([4.9, 5.4, 5.1], [0, -1, 0.3], -4) }),
    shade: 1, frames: true },
  straw: { material: "straw", colors: { hat: "straw", band: "red" }, covers: "the crown: the hair under its brim all round", lets: ["bun", "tail", "braid"], face: "the wide brim's shade on the brow and the eyes' row", reach: 9.5,
    is: "a wide-brimmed straw hat, a round crown, a cloth band",
    human: () => ({ field: STRAW(0, 0, 1), cut: above(3) }), wolf: () => ({ field: STRAW(-1, 1.9, 0.75, 0.6) }),
    bear: () => ({ field: STRAW(-0.5, 4.15, 1.04, 0.74) }), shade: 2 },
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
    // (on the bear/panda: pointed medieval cowl hood with a crisp projecting rim, deep shadowed inner face-opening and separate "hood" part so cloth always reads cleanly apart from fur and ears)
    bear: (_hair, H) => {
      const O = [4.55, 6.6, 4.35], oat = [0, 4.75, -0.45], b = H?.key === "panda" ? "s" : "h"
      return { field: sdf.union(
        sdf.ellipsoid([4.65, 5.45, 5.3]).at(0, -0.65, 1.45),
        sdf.cone(4.4, 4.2, 0.7).scale([0.9, 1.12, 1]).at(0, -0.8, 3.95),
        sdf.ellipsoid([5.85, 4.45, 3.9]).at(0, -1.55, -1.65),
        sdf.capsule([0, -0.3, 6.45], [0, -7.0, 4.3], 2.0, 0.7),
        // subtle forward cowl brim framing the face opening cleanly
        sdf.torus(4.15, 0.7).rotate(90, "x").scale([1.05, 0.85, 1.04]).at(0, 2.4, 0.35),
        { smooth: 0.95 }
      ).subtract(sdf.ellipsoid(O).at(...oat)).intersect(above(-5.3)).paint(pure({ O, oat, HK, FOLDS }, (q, n) => {
        const ee = (q[0] / O[0]) ** 2 + ((q[1] - oat[1]) / O[1]) ** 2 + ((q[2] - oat[2]) / O[2]) ** 2
        // inner lining facing into the opening stays deeply shadowed; outer forward brim rim catches light
        if (ee < 1.28) return HK[0]
        if (q[1] > 1.85 && ee < 1.62 && n[1] > 0.2) return HK.slice(2)
        return FOLDS(q)
      })).part("hood"),
      // keep shaded forehead fur clean between the eyes in S view so the hood-to-skull seam never bridges the eyes in black ink
      paint: { s: new Map([["-1,-1", b], ["0,-1", b], ["1,-1", b]]) } }
    },
    shade: 1, frames: true, body: "cowl", withCloak: true },
  hooddown: { material: "cloth", colors: { hat: "green" }, covers: "nothing: it lies on the shoulders", lets: ["bun", "tail", "braid"], face: "none", reach: 0,
    is: "the same hood down: a cowl round the neck, the hood's bag lying on the upper back",
    human: () => ({}), wolf: () => ({}), bear: () => ({}), body: "down", withCloak: true },
  coif: { material: "leather", colors: { hat: "brown", band: "linen" }, covers: "all of the hair, the ears and the neck: its opening the face's", lets: ["tail"], face: "its edge's shade round the face", reach: 8, closes: true,
    is: "a leather coif close over the head, the ears and the neck, its opening bound, a seam over the crown, its skirt on the shoulders",
    human: () => ({ field: shellOf([5.2, 5.6, 5.8], [0, -0.6, 0.1], [4.8, 5, 4.6], [0, 5, -1.9], -6.4, (q) => (Math.abs(q[0]) < 0.45 && q[2] > 0 ? HK.slice(0, 2) : HK), HB), hides: true }),
    shade: 1, frames: true, body: "skirt" },
  helmet: { material: "metal", colors: { helm: "steel" }, covers: "the crown: the hair under its rim at the nape and the sides", lets: ["tail", "braid"], face: "the dark under its rim on the brow", reach: 7.5,
    is: "an open round helmet: a dome to a rim over the brow, lower at the nape",
    human: () => ({ field: HELMET(), cut: above(1, 0.27) }),
    // (on the skull: rim sits high above the deep eye orbits so brow, sockets, cheekbones and jaw stay unmistakable)
    skull: () => ({ field: HELMET([5.5, 5.8, 4.6], [0, -0.35, 2.35], 2.25, 0.25) }),
    // (on the wolf: a dome made on its cranium, its ears through it, its rim over the brow and the ruff)
    wolf: () => ({ field: HELMET([4.6, 5, 4.4], [0, -1.4, 1.2], 2.1, 0.25) }),
    // (on the bear/panda: sturdy open dome over the rounded ursine cranium, round ears standing clear at the sides)
    bear: () => ({ field: HELMET([5.1, 5.2, 4.7], [0, -0.35, 1.85], 2.85, 0.22) }), shade: 1 },
  nasal: { material: "metal", colors: { helm: "iron" }, covers: "the crown: the hair under its rim at the nape and the sides", lets: ["tail", "braid"], face: "the nasal over the nose, the dark under the rim", reach: 8.5,
    is: "a pointed helmet with a nasal: a tall dome, a rim, a bar down over the nose",
    // (the nasal painted over the face by rule: down the nose's column, from the brow to its tip)
    human: () => ({ field: HELMET([5.6, 6, 6.4], [0, -0.3, 0.7]), cut: above(1, 0.27) }), shade: 1, nasal: true },
  kettle: { material: "metal", colors: { helm: "steel" }, covers: "the crown: the hair under its brim all round", lets: ["bun", "tail", "braid"], face: "the brim's shade on the brow and the eyes' row", reach: 9,
    is: "a kettle hat: a round dome, a wide brim sloping down all round",
    human: () => ({ field: sdf.union(DOME([5.5, 5.9, 4.6], [0, -0.3, 1.8], 2.3).paint(METAL_BY), sdf.cone(8, 1.5, 5.5).subtract(sdf.cone(8, 1.5, 5.5).at(0, 0, -0.55)).scale([1, 1.06, 1]).at(0, -0.3, 1.1).paint((q) => (Math.hypot(q[0], q[1] + 0.3) > 7.2 ? METAL_LIT : METAL)).part("brim")), cut: above(2.3) }), shade: 2 },
  greathelm: { material: "metal", colors: { helm: "steel" }, covers: "all of it: a closed helm", lets: ["tail"], face: "all of it closed: the eye-slit and the breaths dark", reach: 7.5, closes: true, closed: true,
    is: "a great helm: a tapered flat-topped medieval pot-helm closing over the head and face, a raised reinforcing front cross, dark eye-slit and cheek breaths",
    // (its openings, the eye-slit and symmetrical breaths on both cheeks, `dark`: what a ray meets in them is painted dark)
    human: () => {
      const dark = sdf.union(
        sdf.box([7.2, 4, 1.05]).at(0, 5, 0.75),
        ...[-1, 1].flatMap((sd) => [0, 1, 2].map((i) => sdf.capsule([sd * (1.35 + 0.95 * i), 3.6, -2.5], [sd * (1.35 + 0.95 * i), 7, -2.5], 0.44))),
      )
      // tapered drum (wider at jaw, gently narrower at crown) with beveled dome top + raised central cross & brow reinforcement
      const shell = sdf.cone(5.45, 10.6, 4.75).union(sdf.ellipsoid([4.75, 4.75, 1.15]).at(0, 0, 10.55), { smooth: 0.45 }).scale([1, 1.08, 1]).at(0, -0.2, -5.6)
      const crossBand = sdf.union(sdf.capsule([0, 5.15, -4.8], [0, 5.05, 4.4], 0.48), sdf.capsule([-4.2, 4.2, 1.85], [4.2, 4.2, 1.85], 0.45))
      return { field: sdf.union(shell, crossBand, { smooth: 0.25 }).subtract(dark)
        .paint(pure({ METAL, HELM4: KEYS.helm[4] }, (q, n) => {
          if (n[2] > 0.65) return METAL.slice(2)
          if (q[1] > 2.2 && (Math.abs(q[0]) < 0.55 || (q[2] > 1.35 && q[2] < 2.3))) return Math.abs(q[0]) < 0.28 && q[2] > 1.2 && q[2] < 2.8 ? HELM4 : METAL.slice(2)
          return Math.abs(q[0] - 2.1) < 0.65 && q[1] > 1 ? METAL.slice(2) : n[2] > 0.2 ? METAL.slice(1, 3) : METAL
        })), dark, hides: "all" }
    }, shade: 0 },
  circlet: { material: "metal", colors: { helm: "gilt", band: "red" }, covers: "nothing: a ring on the hair at the brow", bare: true, lets: ["bun", "tail", "braid"], face: "none", reach: 6.5,
    is: "a circlet: a thin metal ring round the brow, a stone at its front",
    human: (hair) => ({ field: CIRCLET(4.6 * Math.sqrt(1 - (2.4 / 5.3) ** 2) + (hair?.bulk ?? 0) + 0.3, 0, 2.4) }),
    // (on the wolf/rabbit: round its cranium under the ears, over the brow)
    wolf: () => ({ field: CIRCLET(3.9, -1.2, 2.2) }),
    rabbit: () => ({ field: CIRCLET(4.1, -0.5, 2.1) }),
    bear: () => ({ field: CIRCLET(4.95, -0.55, 2.45) }), shade: 0 },
}
// the dome of a helmet to its rim (z0 at the middle, rising `rise` a px ahead), with a subtle central crest ridge and beveled rim
function HELMET(r = [5.6, 6, 5], at = [0, -0.3, 1.3], z0 = 1, rise = 0.27) {
  const rim = sdf.ellipsoid([r[0] + 0.35, r[1] + 0.35, r[2] + 0.35]).at(...at).intersect(above(z0, rise)).subtract(above(z0 + 0.9, rise))
  const ridge = sdf.ellipsoid([0.55, r[1] + 0.28, r[2] + 0.32]).at(...at).intersect(above(z0 + 1.1, rise)).mat(METAL_LIT).part("ridge")
  return sdf.union(sdf.ellipsoid(r).at(...at).intersect(above(z0, rise)).paint(METAL_BY), ridge, rim.mat(METAL_LIT).part("rim"))
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
for (const [k, P] of Object.entries(HATS)) Object.assign(P, { key: k, slot: "headwear", fits: { head: ["human", "skull", ...(P.wolf ? ["wolf"] : []), ...(P.rabbit ? ["rabbit"] : []), ...(P.bear ? ["bear", "panda"] : []), ...(k === "hooddown" ? ["reptile", "frog", "automaton", "rabbit", "bull", "werewolf"] : [])] }, whyNot: WHY[k]?.[0], wolfWhy: WHY[k]?.[1],
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
const paintOf = (H, parts, hw, face, hair, expr) => {
  const retouch = {}, anchor = {}
  const exprMap = expr && (H.expr?.[expr] ?? (H.key === "human" ? EXPR[expr] : undefined))
  const viewsOf = [...new Set([...Object.keys(H.face), ...parts.flatMap((P) => Object.keys(P.paint ?? {}))])]
  for (const v of viewsOf) {
    const F = H.face[v] ? (face ? cells(face.views[v] ?? "", face.anchor[v] ?? [0, 0]) : cells(H.face[v], H.anchor[v])) : new Map(), m = new Map(F)
    if (face) {
      // (a face not the approved one: past where the approved one paints, only on the skin the bake shows; its eyes, and
      // its marks under a hair's skin, its own)
      const A = H.face[v] ? cells(H.face[v], H.anchor[v]) : new Map(), eye = eyeCells(F)
      if (hair) for (const p of F.keys()) if (!A.has(p) && !eye.has(p)) { const [x, y] = p.split(",").map(Number); if (rayOf(v, x, y, H.skull, hair).on === "hat") m.delete(p) }
      for (const P of parts) for (const [p, k] of paintIn(P, v)) { const f = F.get(p); if (eye.has(p) || (f && !SKINK.includes(f) && SKINK.includes(k))) continue; k === "," ? m.delete(p) : m.set(p, k) }
    } else { const eye = eyeCells(F); for (const P of parts) for (const [p, k] of paintIn(P, v)) if (!eye.has(p)) k === "," ? m.delete(p) : m.set(p, k) }
    // dynamic combat expression overlay (grit, wince, dead): painted over face pixels, never over closed helms
    if (exprMap && exprMap[v] && !hw?.P?.closed) {
      const eg = typeof exprMap[v] === "string" ? cells(exprMap[v], FA[v]) : cells(exprMap[v].grid, exprMap[v].anchor)
      for (const [p, k] of eg) k === "," ? m.delete(p) : m.set(p, k)
    }
    if (hw?.field) {
      const look = new Map(), on = (x, y) => { const p = `${x},${y}`; if (!look.has(p)) look.set(p, rayOf(v, x, y, hw.head, hw.field)); return look.get(p) }
      const eyes = (q) => [...q.values()].filter((k) => "EeGq".includes(k)).length, before = eyes(m)
      for (const p of [...m.keys()]) { const [x, y] = p.split(",").map(Number); if (on(x, y).on === "hat") m.delete(p) }
      for (const [p, k] of hw.P.paint?.[v] ?? []) k === "," ? m.delete(p) : m.set(p, k)
      for (const [p, k] of hw.paint?.[v] ?? []) k === "," ? m.delete(p) : m.set(p, k)
      // (where the face meets the piece: under a brim `shade` rows, beside one that frames the face, a step darker)
      for (const [p, k] of [...m]) {
        const [x, y] = p.split(",").map(Number)
        if (DARKER[k] && hw.P.paint?.[v]?.has(p) !== true && hw.paint?.[v]?.has(p) !== true && ([...Array(hw.P.shade).keys()].some((i) => on(x, y - 1 - i).on === "hat") || (hw.P.frames && (on(x - 1, y).on === "hat" || on(x + 1, y).on === "hat")))) m.set(p, DARKER[k])
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
      if (v === "s" && before && !eyes(m) && !hw.P.closed && !expr) throw new Error(`kit: the headwear '${hw.P.key}' hides both eyes on the head '${H.key}', and it isn't a closed helm`)
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
// (the head's fields as worn: the headwear on this head, its shape there (one with none, the hood down, leaves the head
// as it is); the hair cut above its rim or hidden, closed helms also hiding ears)
const headWorn = (H, parts, P) => {
  const fn = P && (P[H.key] ?? (H.key === "skull" ? P.human : H.key === "panda" ? P.bear : undefined))
  const S = fn?.(parts.find((q) => q.slot === "hair"), H)
  const shown = S?.field ? parts.filter((q) => !(S.hides && (q.slot === "hair" || (S.hides === "all" && (q.slot === "beard" || q.slot === "ears"))))) : parts
  const cuts = [...(S?.field && S.cut ? [S.cut] : []), ...shown.flatMap((q) => (q.hairCut ? [q.hairCut] : []))]
  const cut = cuts.length > 1 ? sdf.union(...cuts) : cuts[0]
  const on = shown.map((q) => {
    let f = q.byHead?.[H.key] ?? q.field
    if (q.slot === "hair") { if (S?.field && S.keep) f = f.intersect(S.keep); if (cut) f = f.subtract(cut) }
    return f === q.field ? q : { ...q, field: f }
  })
  const onSkull = on.length > 1 ? sdf.union(...on.map((q) => q.field)) : on[0]?.field, under = on.length ? sdf.union(H.skull, onSkull) : H.skull
  return { S, on, onSkull, under, field: S?.field ? sdf.union(under, S.field) : under, key: JSON.stringify([H.key, parts.map((P) => P.key), ...(S?.field ? [P.key] : [])]) }
}
const headOf = (H, parts, P, face, expr) => {
  // (the approved face the head's own, as it always was)
  const fc = face?.approved || face?.own ? undefined : face, { S, on, onSkull, under, field } = headWorn(H, parts, P)
  const ex = S?.field && P?.closed ? undefined : expr
  const key = JSON.stringify([H.key, parts.map((P) => P.key), ...(S?.field ? [P.key] : []), ...(fc ? [fc.key] : []), ...(ex ? [`expr:${ex}`] : [])])
  if (!headsMade.has(key)) {
    const name = `_kh${headsMade.size}`
    const { retouch, anchor } = paintOf(H, on, S?.field ? { P, field: S.field, head: under, dark: S.dark, paint: S.paint } : undefined, fc, onSkull, ex)
    // (what is on the skull one field, the skull's other child: as the crew's bald head and its beard were made)
    const vmats = H.emitMats ? { ...T.HEAD.mats, ...H.emitMats } : undefined
    views(name, field, { ...T.HEAD, ...H.views, ...(vmats ? { mats: vmats } : {}), retouch, anchor,
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
  // fantasy skin tones (tieflings, fey, goblins, orcs, drow, elementals)
  crimson: ["#54161e", "#882430", "#be3e48", "#e67474"], rose: ["#6e2c3e", "#a84a62", "#d87a90", "#f4b0be"],
  violet: ["#36224a", "#5c3e78", "#8a66aa", "#bc9cd8"], azure: ["#1e365e", "#365e94", "#5c90cc", "#9cc6f0"],
  dusk: ["#262436", "#423e58", "#686284", "#9690b2"], ashen: ["#5a5c66", "#888a96", "#babcc6", "#e4e6ee"],
  olive: ["#2d4224", "#4d703c", "#74a058", "#a4cc82"], emerald: ["#1a4234", "#2e6e54", "#4ea078", "#84cea4"],
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
// new race/accessory palette ramps (unique RGB values so swaps stay isolated): horns, wings, glowing visor optics
pal({ α: "#2e261f", κ: "#5a4d3e", ν: "#8f7e67", ρ: "#c9b89b", τ: "#585c6c", χ: "#8b90a2", ϑ: "#c3c7d7", ϖ: "#eef0f9", "☆": "#1b5c79", "✦": "#3ec2e9", "✧": "#b8f4fe" })
Object.assign(KEYS, { horns: "ακνρ", wings: "τχϑϖ", visor: "☆✦✧" })
const HORN_RAMPS = { ...RAMPS, bone: ["#2e261f", "#5a4d3e", "#8f7e67", "#c9b89b"], ivory: ["#52493f", "#8a7e6e", "#c4b8a4", "#ede6d6"],
  obsidian: ["#12101a", "#262336", "#44405c", "#747094"], amber: ["#46240c", "#864616", "#c67828", "#f2b858"], crimson: ["#3a0e14", "#6e1c26", "#a83440", "#dc6a64"],
  gold: ["#3e280c", "#7a5418", "#bc8e28", "#ecc85c"], silver: ["#4a4e5a", "#787e8e", "#aeb4c2", "#e2e6f0"], violet: ["#2a183c", "#503070", "#7e54a4", "#b488d8"],
  emerald: ["#143226", "#245c44", "#3e8c66", "#72c094"], rose: ["#582032", "#8e3a54", "#c4627e", "#ea9ab0"] }
const WING_RAMPS = { ...RAMPS, white: ["#585c6c", "#8b90a2", "#c3c7d7", "#eef0f9"], obsidian: ["#12101a", "#262234", "#403a54", "#686082"],
  plum: ["#361c46", "#5e3474", "#8c56a4", "#be84d4"],
  gold: ["#462e0e", "#865c1c", "#c89634", "#f4d476"], crimson: ["#3c1016", "#6e1e26", "#a83640", "#dc6c66"], azure: ["#162c54", "#28508c", "#4c84c8", "#90c4f4"],
  silver: ["#4a4e5a", "#787e8e", "#aeb4c2", "#e2e6f0"], violet: ["#2a183c", "#503070", "#7e54a4", "#b488d8"],
  emerald: ["#143226", "#245c44", "#3e8c66", "#72c094"], rose: ["#582032", "#8e3a54", "#c4627e", "#ea9ab0"] }
const SCALES = {
  frog: { J: "#122c10", j: "#22541a", h: "#3b8624", H: "#68bc38", Y: "#a4e25c", z: "#7a6842", s: "#b09c66", S: "#e2d49a", L: "#faf4d2" },
  emerald: { J: "#12261c", j: "#204630", h: "#346e48", H: "#529a5e", Y: "#82c47c", z: "#546e44", s: "#809e62", S: "#b2cc88", L: "#dcf0b4" },
  crimson: { J: "#280e14", j: "#4e1820", h: "#822830", H: "#b84444", Y: "#e27868", z: "#744432", s: "#a86c4c", S: "#d49c74", L: "#f2cca4" },
  cobalt: { J: "#101a32", j: "#1c325e", h: "#2c5492", H: "#4a80c4", Y: "#82b4ea", z: "#4c5c78", s: "#768aa8", S: "#a8bcd6", L: "#d6e4f4" },
  gold: { J: "#2c1e0c", j: "#543a14", h: "#8a6220", H: "#c49434", Y: "#ecc868", z: "#786030", s: "#aa8e50", S: "#d8be7c", L: "#f6e4b2" },
  obsidian: { J: "#100e18", j: "#201e30", h: "#36344e", H: "#565476", Y: "#8282a8", z: "#3a384a", s: "#5a586e", S: "#84829a", L: "#b4b2c8" },
  jade: { J: "#102626", j: "#1c4846", h: "#2c746c", H: "#4ca494", Y: "#84d2be", z: "#4a6c64", s: "#769c92", S: "#a8ccc0", L: "#d6eee4" },
}
const BONES = {
  ivory: { z: "#5e5448", s: "#948876", S: "#ccc0aa", L: "#f2ead8", J: "#2e2824", j: "#4a423a", h: "#746a5e", H: "#a69c8c", Y: "#dcd2be" },
  aged: { z: "#4e3e2c", s: "#7e684c", S: "#b29a76", L: "#dcd0b2", J: "#261e16", j: "#403224", h: "#66523a", H: "#967e5e", Y: "#c8b28e" },
  ashen: { z: "#3c3c44", s: "#646470", S: "#9496a2", L: "#c6c8d2", J: "#1c1c22", j: "#30303a", h: "#50505e", H: "#7c7e8c", Y: "#aeb0bc" },
  obsidian: { z: "#221e2c", s: "#3c364c", S: "#625a78", L: "#948cb0", J: "#100e16", j: "#1e1a28", h: "#342e44", H: "#544c6a", Y: "#82789c" },
}
const CHASSIS = Object.fromEntries(Object.entries(METALS).map(([k, v]) => [k, { J: v[0], j: v[1], h: v[2], H: v[3], Y: v[4], z: v[0], s: v[1], S: v[2], L: v[3] }]))
// ---- modular fantasy ears & horns (modeled in the head's frame, baked with views())
const HORN_PAINT = pure({ H: KEYS.horns }, (q) => (Math.floor((Math.hypot(q[0], q[1], q[2]) * 1.4)) % 2 ? H.slice(0, 3) : H))
const POINTED_EAR = sdf.union(...[-1, 1].map((s) => sdf.union(
  sdf.capsule([s * 3.8, -0.25, -0.25], [s * 6.0, -1.8, 1.15], 1.24, 0.86),
  sdf.capsule([s * 6.0, -1.8, 1.15], [s * 8.0, -3.5, 3.05], 0.84, 0.35), { smooth: 0.45 })
  .paint(pure({}, (q, n) => (n[1] > 0.46 && Math.abs(q[0]) < 6.8 ? "zs" : "zsSL"))).part(`ear${s}`)))
const EARS = {
  pointed: { slot: "ears", is: "sculpted pointed elf/fey ears sweeping out, back and upward past the hair from the temples", reach: 10.5, fits: { head: ["human"] }, materials: { skin: "zsSL" },
    field: POINTED_EAR },
  cat: { slot: "ears", is: "sculpted 3D cupped triangular feline ears perched on the crown corners with outward yaw, pinched base and warm inner pinna", crown: true, reach: 10.6, fits: { head: ["human"] }, materials: HAIR,
    // symmetric 3D pinch groove at the outer ear-to-head junction trims asymmetric hair locks so every hairstyle pinches cleanly in S/N
    hairCut: sdf.union(...[-1, 1].map((s) => sdf.capsule([s * 5.4, 1.2, 3.85], [s * 5.4, -2.0, 3.85], 1.0))),
    // pure 3D feline ear shell: slim cupped triangular shell centered on the crown with high-centered ellipsoid base pinch,
    // shallow inward-centered pinna hollow (L tip + warm S hollow) framed by a 1px outer fur border, and soft root shading
    field: sdf.union(...[-1, 1].map((s) => {
      const outer = sdf.cone(2.84, 4.72, 0.14).at(0, 0, 0.55).intersect(sdf.ellipsoid([2.94, 1.3, 5.3]).at(0, -0.08, 3.95))
      const cx0 = s * -0.34, cx1 = s * -0.5
      const cup = sdf.capsule([cx0, 2.12, 1.14], [cx1, 1.08, 3.65], 2.02, 0.5)
      return outer.subtract(cup).paint(pure({ s, cx0, cx1 }, (q) => {
        const dx = cx1 - cx0, dy = -1.04, dz = 2.51, l2 = dx * dx + dy * dy + dz * dz
        const t = Math.max(0, Math.min(1, ((q[0] - cx0) * dx + (q[1] - 2.12) * dy + (q[2] - 1.14) * dz) / l2))
        const qx = q[0] - (cx0 + dx * t), effX = s * qx < 0 ? qx * (0.8 + 0.2 * t) : qx
        const dc = Math.hypot(effX, q[1] - (2.12 + dy * t), q[2] - (1.14 + dz * t)) - (2.02 - 1.52 * t)
        if (dc < 0.24 && q[1] > 0.02 && q[2] > 1.12 && q[2] < 4.02) return q[2] > 3.45 ? "L" : "S"
        if (q[2] < 1.85 && s * q[0] > 1.35) return "Jjh"
        if (q[2] < 1.32 && q[1] > -0.25) return "JjhH"
        return "JjhHY"
      })).rotate(2, "x").rotate(s * -30, "z").rotate(s * 11, "y").at(s * 2.76, -0.02, 4.82)
    })) },
  rabbit: { slot: "ears", is: "tall sculpted leaf-shaped rabbit ears rising high from the crown in a V-splay with warm inner hollows", crown: true, reach: 13.0, fits: { head: ["human"] }, materials: HAIR,
    field: sdf.union(...[-1, 1].map((s) => {
      const blade = sdf.union(
        sdf.capsule([0, 0, 0], [0, -0.1, 2.0], 0.95, 1.32),
        sdf.ellipsoid([1.64, 0.95, 3.68]).at(0, -0.22, 4.35), { smooth: 0.65 }
      ).subtract(sdf.ellipsoid([1.04, 0.9, 2.72]).at(0, 0.74, 4.15))
      return blade.paint(pure({}, (q, n) => (n[1] > 0.28 && q[1] > -0.28 && q[2] > 0.95 && q[2] < 6.45 && Math.abs(q[0]) < 1.18 ? (q[2] < 2.1 ? "zsS" : "sSL") : "JjhHY")))
        .rotate(-13, "x").rotate(s * 16, "y").at(s * 1.95, -0.45, 4.65).part("ears")
    })) },
  goblin: { slot: "ears", is: "sculpted pointed goblin ears sweeping out, back and upward past the hair from the temples", reach: 10.5, fits: { head: ["human"] }, materials: { skin: "zsSL" },
    field: POINTED_EAR },
}
const HORNS = {
  curved: { slot: "horns", is: "swept-back curved demon/tiefling horns rising from the brow temples", reach: 10.5, colors: { horns: "obsidian" }, fits: { head: ["human", "wolf", "rabbit", "reptile", "skull", "bull"] }, materials: { horns: KEYS.horns },
    field: sdf.union(...[-1, 1].map((s) => sdf.union(
      sdf.capsule([s * 2.4, 2.3, 3.5], [s * 4.0, 0.4, 6.2], 1.15, 0.82),
      sdf.capsule([s * 4.0, 0.4, 6.2], [s * 3.5, -3.1, 8.5], 0.82, 0.25), { smooth: 0.5 }).paint(HORN_PAINT).part(`horn${s}`))),
    // on reptile/bull heads: anchored cleanly to the beast brow/rear crown
    byHead: {
      reptile: sdf.union(...[-1, 1].map((s) => sdf.union(
        sdf.capsule([s * 2.3, -1.4, 3.3], [s * 3.8, -3.6, 5.7], 1.1, 0.78),
        sdf.capsule([s * 3.8, -3.6, 5.7], [s * 3.4, -6.5, 7.6], 0.78, 0.25), { smooth: 0.5 }).paint(HORN_PAINT).part(`horn${s}`))),
      bull: sdf.union(...[-1, 1].map((s) => sdf.union(
        sdf.capsule([s * 3.7, 0.8, 4.1], [s * 6.5, -1.4, 7.6], 1.75, 1.15),
        sdf.capsule([s * 6.5, -1.4, 7.6], [s * 5.6, -5.2, 10.6], 1.12, 0.34), { smooth: 0.55 }).paint(HORN_PAINT).part(`horn${s}`))),
    } },
  ram: { slot: "horns", is: "coiled spiral ram horns curling around the temples", reach: 8.5, colors: { horns: "bone" }, fits: { head: ["human", "wolf", "rabbit", "reptile", "skull", "bull"] }, materials: { horns: KEYS.horns },
    field: sdf.union(...[-1, 1].map((s) => sdf.union(
      sdf.capsule([s * 2.6, 1.4, 3.2], [s * 5.4, -0.5, 3.5], 1.2, 1.0),
      sdf.capsule([s * 5.4, -0.5, 3.5], [s * 5.9, -2.0, 0.2], 1.0, 0.8),
      sdf.capsule([s * 5.9, -2.0, 0.2], [s * 4.8, 0.9, -1.4], 0.78, 0.32), { smooth: 0.5 }).paint(HORN_PAINT).part(`horn${s}`))),
    byHead: {
      reptile: sdf.union(...[-1, 1].map((s) => sdf.union(
        sdf.capsule([s * 2.5, -1.2, 3.0], [s * 5.2, -3.1, 3.2], 1.15, 0.95),
        sdf.capsule([s * 5.2, -3.1, 3.2], [s * 5.6, -4.4, 0.0], 0.95, 0.75),
        sdf.capsule([s * 5.6, -4.4, 0.0], [s * 4.5, -1.8, -1.4], 0.72, 0.32), { smooth: 0.5 }).paint(HORN_PAINT).part(`horn${s}`))),
      bull: sdf.union(...[-1, 1].map((s) => sdf.union(
        sdf.capsule([s * 3.7, 0.7, 3.9], [s * 7.4, -1.5, 4.3], 1.65, 1.3),
        sdf.capsule([s * 7.4, -1.5, 4.3], [s * 7.9, -3.1, 0.0], 1.3, 1.0),
        sdf.capsule([s * 7.9, -3.1, 0.0], [s * 6.4, 0.5, -2.0], 0.98, 0.38), { smooth: 0.55 }).paint(HORN_PAINT).part(`horn${s}`))),
    } },
  bull: { slot: "horns", is: "sturdy wide-swept upward-curving bull/minotaur horns", reach: 15.5, colors: { horns: "ivory" }, fits: { head: ["human", "wolf", "rabbit", "reptile", "skull", "bull"] }, materials: { horns: KEYS.horns },
    field: sdf.union(...[-1, 1].map((s) => sdf.union(
      sdf.capsule([s * 3.0, 1.0, 3.2], [s * 6.5, 1.3, 3.8], 1.35, 0.92),
      sdf.capsule([s * 6.5, 1.3, 3.8], [s * 7.5, 2.4, 7.5], 0.9, 0.25), { smooth: 0.5 }).paint(HORN_PAINT).part(`horn${s}`))),
    byHead: {
      reptile: sdf.union(...[-1, 1].map((s) => sdf.union(
        sdf.capsule([s * 2.8, -1.4, 3.0], [s * 6.2, -1.8, 3.8], 1.25, 0.88),
        sdf.capsule([s * 6.2, -1.8, 3.8], [s * 7.0, -1.2, 7.3], 0.86, 0.25), { smooth: 0.5 }).paint(HORN_PAINT).part(`horn${s}`))),
      bull: sdf.union(...[-1, 1].map((s) => sdf.union(
        sdf.capsule([s * 3.8, 0.8, 4.0], [s * 8.4, 2.0, 4.9], 1.9, 1.25),
        sdf.capsule([s * 8.4, 2.0, 4.9], [s * 9.3, 4.3, 9.6], 1.22, 0.35), { smooth: 0.6 }).paint(HORN_PAINT).part(`horn${s}`))),
    } },
  antlers: { slot: "horns", is: "branching stag/jackalope antlers rising from the crown", reach: 12.5, colors: { horns: "bone" }, fits: { head: ["human", "wolf", "rabbit", "reptile", "skull", "bull"] }, materials: { horns: KEYS.horns },
    field: sdf.union(...[-1, 1].map((s) => sdf.union(
      sdf.capsule([s * 1.7, 0.6, 4.3], [s * 4.1, 0.0, 8.3], 0.75, 0.52),
      sdf.capsule([s * 4.1, 0.0, 8.3], [s * 5.3, -0.3, 11.2], 0.5, 0.2),
      sdf.capsule([s * 3.0, 0.3, 6.4], [s * 2.4, 2.6, 8.7], 0.45, 0.18),
      sdf.capsule([s * 4.4, -0.1, 8.9], [s * 6.4, 1.2, 10.6], 0.42, 0.18), { smooth: 0.35 }).paint(HORN_PAINT).part(`horn${s}`))),
    // on rabbit heads: smaller, forward-swept jackalope antlers rooted high on the brow; on reptile heads: swept back from rear crown
    byHead: {
      rabbit: sdf.union(...[-1, 1].map((s) => sdf.union(
        sdf.capsule([s * 1.5, 1.5, 4.35], [s * 2.9, 2.5, 6.7], 0.54, 0.38),
        sdf.capsule([s * 2.9, 2.5, 6.7], [s * 3.9, 2.9, 8.4], 0.36, 0.16),
        sdf.capsule([s * 2.3, 2.1, 5.7], [s * 2.0, 3.9, 7.1], 0.3, 0.14),
        sdf.capsule([s * 3.2, 2.6, 7.3], [s * 4.6, 2.3, 8.1], 0.28, 0.14), { smooth: 0.25 }).paint(HORN_PAINT).part(`horn${s}`))),
      reptile: sdf.union(...[-1, 1].map((s) => sdf.union(
        sdf.capsule([s * 1.8, -1.6, 3.8], [s * 4.0, -3.2, 7.6], 0.72, 0.48),
        sdf.capsule([s * 4.0, -3.2, 7.6], [s * 5.0, -4.0, 10.4], 0.46, 0.2),
        sdf.capsule([s * 2.9, -2.4, 5.8], [s * 2.5, -0.4, 8.0], 0.42, 0.18),
        sdf.capsule([s * 4.3, -3.4, 8.3], [s * 6.2, -2.2, 9.9], 0.38, 0.18), { smooth: 0.35 }).paint(HORN_PAINT).part(`horn${s}`))),
    } },
}
for (const [k, P] of Object.entries(EARS)) P.key = k
for (const [k, P] of Object.entries(HORNS)) P.key = k
const FURS = {
  grey: { J: "#1a1820", j: "#2e2c36", h: "#4a4750", H: "#6e6a6c", Y: "#97918a", z: "#6e665e", s: "#9a9082", S: "#c8bea9", L: "#e8e0cc" },
  // lifted black fur sheen & muzzle mask so facial features read crisply at 34px while staying obsidian-black
  black: { J: "#100e16", j: "#201e2a", h: "#343242", H: "#54566e", Y: "#7e829c", z: "#46424e", s: "#6a6472", S: "#928c98", L: "#b8b2bc" },
  red: { J: "#22120f", j: "#3e2018", h: "#64341f", H: "#8c5430", Y: "#b07c4c", z: "#7e6450", s: "#ac927a", S: "#d4c0a2", L: "#efe2c8" },
  cream: { J: "#3a2e26", j: "#645244", h: "#967e68", H: "#c4ae94", Y: "#e4d4be", z: "#8e7e72", s: "#bcaca0", S: "#e0d4ca", L: "#f6efe8" },
  white: { J: "#424452", j: "#6e7284", h: "#a2a6b6", H: "#d4d8e4", Y: "#f4f6fc", z: "#8c7278", s: "#be9ea4", S: "#e6cad0", L: "#fae8ec" },
  brown: { J: "#24160e", j: "#462c1c", h: "#744c30", H: "#a4744e", Y: "#cca27a", z: "#7a6250", s: "#aa907a", S: "#d4bea8", L: "#f0e2d2" },
  // ursine coats: deep chocolate grizzly with warm honey-cream muzzle, snow-cream polar bear (no pink cast), and giant panda (charcoal limbs/ears/patches + snow-white face)
  grizzly: { J: "#1a110c", j: "#342217", h: "#543927", H: "#7a583d", Y: "#a27d5c", z: "#786048", s: "#a68b6b", S: "#d2ba96", L: "#eee0c4" },
  polar: { J: "#464246", j: "#726e6e", h: "#a29d96", H: "#d0cac0", Y: "#f4efe6", z: "#7e766e", s: "#aea69a", S: "#dad2c6", L: "#f7f3ea" },
  panda: { J: "#121016", j: "#22202a", h: "#363442", H: "#565466", Y: "#7c7a8e", z: "#7c7872", s: "#b0aca4", S: "#dad6cc", L: "#f6f4ec" },
}
const tones = (c, table, what) => (Array.isArray(c) ? c : table[c] ?? (() => { throw new Error(`kit: no ${what} color '${c}' (${Object.keys(table).join(", ")})`) })())
const swapOf = (colors = {}, worn, hat) => {
  const swap = {}, put = (keys, c) => [...keys].forEach((k, i) => (swap[k] = c[Math.max(0, c.length - keys.length + i)]))
  for (const P of worn) for (const [s, c] of Object.entries(P.colors ?? {})) put(KEYS[s], tones(colors[s] ?? c, TABLES[s] ?? RAMPS, s))
  if (hat && colors.hat !== undefined) put(hat, tones(colors.hat, RAMPS, "hat"))
  if (colors.fur !== undefined) Object.assign(swap, FURS[colors.fur] ?? (() => { throw new Error(`kit: no fur '${colors.fur}' (${Object.keys(FURS).join(", ")})`) })())
  if (colors.scales !== undefined) Object.assign(swap, SCALES[colors.scales] ?? (() => { throw new Error(`kit: no scales '${colors.scales}' (${Object.keys(SCALES).join(", ")})`) })())
  if (colors.bones !== undefined) Object.assign(swap, BONES[colors.bones] ?? (() => { throw new Error(`kit: no bones '${colors.bones}' (${Object.keys(BONES).join(", ")})`) })())
  if (colors.chassis !== undefined) Object.assign(swap, CHASSIS[colors.chassis] ?? (() => { throw new Error(`kit: no chassis '${colors.chassis}' (${Object.keys(CHASSIS).join(", ")})`) })())
  if (colors.visor !== undefined) put(KEYS.visor, tones(colors.visor, GEMS, "visor"))
  if (colors.skin !== undefined) {
    put("zsSL", tones(colors.skin, SKINS, "skin"))
    // soften eye sclera on darker & saturated skin tones so eyes look natural instead of stark white
    if (["brown", "crimson", "violet", "azure"].includes(colors.skin)) swap.G = "#ded5c0"
    else if (["deep", "dusk"].includes(colors.skin)) swap.G = "#ccc2ae"
  }
  if (colors.hair !== undefined) {
    const h = Array.isArray(colors.hair) ? Object.fromEntries([..."JjhHY"].map((k, i) => [k, colors.hair[i]])) : HAIRS[colors.hair]
    if (!h) throw new Error(`kit: no hair color '${colors.hair}' (${Object.keys(HAIRS).join(", ")})`)
    Object.assign(swap, h)
  }
  // (the eyes: the iris's two tones, the beast's bright one, and optional skull glow)
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
// an ear: sharp pointed lupine triangle (shared "ears" part so near/far ears never pinch into a bobble in W profile)
const wolfEar = (s) => sdf.cone(2.25, 4.75, 0.4).intersect(sdf.box([5.4, 1.85, 11.4])).rotate(-11, "x").rotate(s * 14, "y").at(s * 2.35, -1.7, 3.3)
  .paint((q, n) => (n[1] > 0.38 ? "zs" : "jhH")).part("ears")
const WOLF = sdf.union(
  // sculpted lupine cranium + heavy flared shaggy cheek ruff tufts sweeping out and back
  sdf.union(sdf.ellipsoid([3.85, 4.15, 4.0]).at(0, -1.2, 1.0), sdf.ellipsoid([5.25, 3.0, 3.1]).at(0, -2.1, -1.45),
    ...[-1, 1].map((s) => sdf.capsule([s * 3.7, -1.4, -1.3], [s * 5.4, -3.5, -3.0], 1.45, 0.55)),
    ...[-1, 1].map((s) => sdf.capsule([s * 3.3, -1.8, 0.2], [s * 4.9, -3.6, -0.7], 1.25, 0.45)), { smooth: 1.15 })
    .noise({ amp: 0.25, scale: 1.1, seed: 21 }).paint((q) => (q[2] < -0.95 && q[1] > 0.2 ? "zsSL" : "jhHY")),
  // deeper, stronger, square-ended wolf muzzle & solid lower jaw (true lupine snout, not pointy fox)
  sdf.capsule([0, 0.9, 0.65], [0, 5.95, -0.45], 2.65, 1.6).union(sdf.ellipsoid([1.85, 2.55, 1.2]).at(0, 3.0, -1.65), { smooth: 0.6 })
    .paint((q) => (q[1] > 5.8 && q[2] > -1.35 ? "kJj" : q[2] < -0.15 ? "zsSL" : "jhHY")).part("muzzle"),
  ...[-1, 1].map(wolfEar))
// Wolf face retouch: fierce dark-browed slanted amber eyes (crisp in S, SW/SE, W, NW), clean black nose, lupine mask & sharp pointed ears
const WOLF_RUNS = {
  s: { "-6": [[-3, "s"], [3, "s"]], "-5": [[-3, "S"], [3, "S"]], "-2": [[-4, "JJ"], [-1, "hjh"], [3, "JJ"]], "-1": [[-3, "qk"], [2, "kq"]], 0: [[-4, "Sh"], [3, "hS"]], 1: [[-5, "SSs"], [-1, "H"], [1, "H"], [3, "sSS"]], 2: [[-5, "sSsSkkksSS"]], 3: [[-4, "sSszkzsSs"]], 4: [[0, "z"], [3, "kk"]] },
  sw: { "-5": [[2, "JS"]], "-4": [[2, "JS"]], "-3": [[-2, "hH"], [2, "HJ"]], "-2": [[-3, "JJ"], [-1, "HL"], [0, "JJ"], [3, "J"]], "-1": [[-3, "q"], [-2, "hH"], [-1, "k"], [0, "qS"], [4, "H"]], 0: [[-4, "hHHSSS"], [3, "Y"]], 1: [[-5, "kHSLLS"], [3, "h"]], 2: [[-6, "kSLL"], [0, "S"], [2, "HhY"]], 3: [[-5, "zzzs"], [0, "z"], [2, "Sh"], [5, "hh"]], 4: [[1, "ssss"]] },
  w: { "-2": [[-3, "hJJH"], [3, "j"]], "-1": [[-3, "kq"]], 0: [[-7, "k"], [-3, "SS"]], 1: [[-7, "kL"], [-2, "SS"]], 2: [[-6, "zzzssz"], [2, "h"]], 3: [[0, "SS"], [3, "h"]], 4: [[0, "sS"], [4, "h"]] },
  nw: { "-2": [[-5, "Y"], [-3, "J"]], "-1": [[-5, "Jkq"]], 0: [[-4, "zShh"]], 1: [[-4, "Ss"], [1, "h"]], 2: [[2, "h"], [5, "h"]], 3: [[-3, "S"], [0, "hh"]], 4: [[-1, "hh"]] },
  n: { 1: [[0, "h"]], 2: [[-5, "Y"], [-1, "hhh"], [5, "Y"]], 3: [[-4, "Y"], [-2, "hhhhh"], [4, "Y"]], 4: [[-2, "h"], [0, "hhh"]] },
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
// wolf combat expressions (over WOLF_RUNS)
const WOLF_EXPR = Object.fromEntries(Object.entries({
  grit: { s: { "-2": [[-4, "J"], [-3, "J"], [3, "J"], [4, "J"]], 3: [[-2, "L"], [2, "L"]] }, sw: { "-2": [[-1, "J"], [0, "J"]], 3: [[-4, "L"], [-2, "L"]] }, w: { "-2": [[-3, "J"], [-2, "J"]], 2: [[-6, "L"], [-4, "L"]] } },
  wince: { s: { "-1": [[-3, "JJ"], [2, "JJ"]], 3: [[-2, "z"], [2, "z"]] }, sw: { "-1": [[-1, "JJ"]], 3: [[-4, "z"]] }, w: { "-1": [[-3, "JJ"]] } },
  dead: { s: { "-1": [[-3, "kk"], [2, "kk"]] }, sw: { "-1": [[-1, "kk"]] }, w: { "-1": [[-3, "kk"]] } },
}).map(([k, rs]) => [k, Object.fromEntries(Object.entries(rs).map(([v, r]) => [v, gridOf(r)]))]))
HEADS.wolf = { slot: "head", is: "a wolf's head: a wedge, the muzzle as long as the skull, short wide-set ears, the ruff wider than the crown (a draft, its face painted by hand)", skull: WOLF,
  face: Object.fromEntries(Object.entries(WOLF_FACE).map(([v, f]) => [v, f.grid])), anchor: Object.fromEntries(Object.entries(WOLF_FACE).map(([v, f]) => [v, f.anchor])),
  // (its throat's pale fur as wide as the body under it: the line under it the ink's, a brown one there left the outline open)
  views: { jaw: ["k", "zsSL"] }, expr: WOLF_EXPR, closes: true, reach: 10.5, fur: "grey", skin: "jhH", materials: { fur: "JjhHY zsSL" } }
// ---- additional modular fantasy heads: reptile (lizardfolk/dragonborn), frog, skull (undead), rabbit (hare/jackalope), automaton (construct)
const REPTILE = sdf.union(
  sdf.ellipsoid([3.9, 4.3, 3.8]).at(0, -1.0, 0.7).union(
    sdf.capsule([0, 0.8, 0.2], [0, 6.2, -0.8], 2.55, 1.55),
    sdf.ellipsoid([2.1, 2.5, 1.1]).at(0, 2.8, -1.9), { smooth: 0.7 }
  ).paint(pure({}, (q) => (q[2] < -1.1 ? "zsSL" : q[2] < -0.2 && q[1] > 0.5 ? "JjhH" : "jhHY"))),
  // three bold dorsal crest spines (tip radius >= 0.46 so every view renders them cleanly) + high swept temple spines
  sdf.capsule([0, -0.3, 3.6], [0, -1.5, 6.9], 1.15, 0.48).mat("zsSL").part("crest0"),
  sdf.capsule([0, -2.5, 2.9], [0, -4.6, 5.5], 1.08, 0.48).mat("zsSL").part("crest1"),
  sdf.capsule([0, -4.1, 0.8], [0, -6.7, 2.4], 1.0, 0.46).mat("zsSL").part("crest2"),
  ...[-1, 1].map((s) => sdf.capsule([s * 2.7, -2.5, 2.4], [s * 4.4, -5.0, 3.9], 0.9, 0.44).mat("zsSL").part(`spine${s}`))
)
const REPTILE_RUNS = {
  s: { "-2": [[-4, "J"], [-3, "q"], [3, "q"], [4, "J"]], "-1": [[-4, "q"], [-3, "k"], [3, "k"], [4, "q"]], 1: [[-1, "J"], [1, "J"]], 2: [[-3, "zzzzzzz"]], 3: [[-2, "sSSs"]] },
  sw: { "-2": [[-4, "J"], [-3, "HH"], [0, "Jq"]], "-1": [[-4, "q"], [-3, "hH"], [-1, "J"], [0, "kq"], [2, "H"]], 0: [[-5, "J"], [-3, "H"]], 2: [[-5, "zzzzz"]], 3: [[-4, "sSSs"]] },
  w: { "-2": [[-2, "Jq"]], "-1": [[-2, "kq"]], 0: [[-6, "J"]], 2: [[-6, "zzzzzz"]], 3: [[-5, "sSSs"]] },
  nw: { "-2": [[-4, "J"]], "-1": [[-4, "q"]] },
  n: { "-3": [[0, "L"]], "-1": [[0, "S"]], 1: [[0, "S"]] },
}
const REPTILE_FACE = Object.fromEntries(Object.entries(REPTILE_RUNS).map(([v, r]) => [v, gridOf(r)]))
const REPTILE_EXPR = Object.fromEntries(Object.entries({
  grit: { s: { "-2": [[-4, "JJ"], [3, "JJ"]], 2: [[-2, "LzLzL"]] }, sw: { "-2": [[-4, "J"], [0, "JJ"]], 2: [[-5, "zLzLz"]] }, w: { "-2": [[-2, "JJ"]], 2: [[-6, "zLzLz"]] } },
  wince: { s: { "-2": [[-4, "JJ"], [3, "JJ"]], "-1": [[-4, "kk"], [3, "kk"]] }, sw: { "-2": [[-4, "J"], [0, "JJ"]], "-1": [[-4, "k"], [0, "kk"]] }, w: { "-2": [[-2, "JJ"]], "-1": [[-2, "kk"]] } },
  dead: { s: { "-2": [[-4, "JJ"], [3, "JJ"]], "-1": [[-4, "kk"], [3, "kk"]] }, sw: { "-2": [[-4, "J"], [0, "JJ"]], "-1": [[-4, "k"], [0, "kk"]] }, w: { "-2": [[-2, "JJ"]], "-1": [[-2, "kk"]] } },
}).map(([k, rs]) => [k, Object.fromEntries(Object.entries(rs).map(([v, r]) => [v, gridOf(r)]))]))
HEADS.reptile = { slot: "head", is: "a reptilian head: elongated snout, bold dorsal crest and temple spines, high-contrast reptilian eyes and pale throat", skull: REPTILE,
  face: Object.fromEntries(Object.entries(REPTILE_FACE).map(([v, f]) => [v, f.grid])), anchor: Object.fromEntries(Object.entries(REPTILE_FACE).map(([v, f]) => [v, f.anchor])),
  views: { jaw: ["k", "zsSL"] }, expr: REPTILE_EXPR, closes: true, reach: 10.5, scales: "emerald", skin: "jhH", materials: { scales: "JjhHY zsSL", eyes: "q" } }

const FROG = sdf.union(
  sdf.union(
    sdf.ellipsoid([4.5, 4.0, 3.2]).at(0, -1.0, 0.1),
    sdf.ellipsoid([4.6, 4.3, 2.0]).at(0, 2.45, -0.25),
    sdf.ellipsoid([3.85, 3.45, 1.8]).at(0, 1.65, -2.05),
    // tall twin amphibian eye domes perched high on the crown with a clear V-valley between them
    ...[-1, 1].map((s) => sdf.ellipsoid([1.95, 2.05, 2.4]).at(s * 2.75, 0.85, 2.95)),
    { smooth: 0.35 }
  ).paint(pure({}, (q) => (q[2] < -1.15 && q[1] > -1.0 ? "zsSL" : "jhHY"))),
  // protruding 3D eyeballs nestled into the forward-outer faces of the twin domes
  ...[-1, 1].map((s) => sdf.sphere(1.38).at(s * 2.8, 1.9, 2.9).paint(pure({}, (q) => (q[2] > 3.75 ? "jhHY" : "q"))).part(`eye${s}`))
)
const FROG_RUNS = {
  s: { "-4": [[-4, "Hq"], [3, "qH"]], "-3": [[-4, "qk"], [-2, "H"], [2, "H"], [3, "kq"]], "-2": [[-3, "HHHYHHH"]], "-1": [[-3, "HHHHHHH"]], 0: [[-4, "HHHHHHHHH"]], 1: [[-4, "zzzzzzzzz"]], 2: [[-3, "sSSSSSs"]], 3: [[-2, "sLLLs"]] },
  // SW/SE: BOTH pupils sit on the front-left side (kq) so both eyes look forward together; keep top-dome ink outline intact above both eyes
  sw: { "-5": [[-3, "H"]], "-4": [[-4, "kq"], [-2, "H"], [0, "kqH"]], "-3": [[-4, "q"], [-2, "HY"], [0, "kqH"]], "-2": [[-4, "HHYH"], [0, "HHH"]], "-1": [[-5, "HHHYHHH"]], 0: [[-5, "HHHHHHH"]], 1: [[-5, "zzzzzz"]], 2: [[-4, "sSSSSs"]], 3: [[-3, "sLLs"]] },
  w: { "-5": [[-1, "HH"]], "-4": [[-2, "kqH"]], "-3": [[-2, "kqH"]], "-2": [[-3, "HHHH"]], "-1": [[-5, "HHYHH"]], 0: [[-6, "HHHHH"]], 1: [[-6, "zzzzzz"]], 2: [[-5, "sSSSS"]], 3: [[-4, "sLLs"]] },
  nw: { "-4": [[-4, "kq"]], "-3": [[-4, "q"]], "-1": [[0, "HY"]], 0: [[0, "HH"]] },
  n: { "-5": [[-3, "HY"], [2, "YH"]], "-2": [[-1, "HYH"]], "-1": [[-1, "YYY"]], 0: [[-1, "HYH"]], 1: [[-1, "HHH"]] },
}
const FROG_FACE = Object.fromEntries(Object.entries(FROG_RUNS).map(([v, r]) => [v, gridOf(r)]))
const FROG_EXPR = Object.fromEntries(Object.entries({
  grit: { s: { "-4": [[-4, "JJJ"], [2, "JJJ"]], 1: [[-4, "kkkkkkkkk"]] }, sw: { "-4": [[-4, "JJ"], [0, "JJJ"]] }, w: { "-4": [[-3, "JJJ"]] } },
  wince: { s: { "-3": [[-4, "kkk"], [2, "kkk"]] }, sw: { "-4": [[-4, "kk"]], "-3": [[0, "kkk"]] }, w: { "-3": [[-3, "kkk"]] } },
  dead: { s: { "-3": [[-4, "kkk"], [2, "kkk"]] }, sw: { "-4": [[-4, "kk"]], "-3": [[0, "kkk"]] }, w: { "-3": [[-3, "kkk"]] } },
}).map(([k, rs]) => [k, Object.fromEntries(Object.entries(rs).map(([v, r]) => [v, gridOf(r)]))]))
HEADS.frog = { slot: "head", is: "an amphibian frog head: tall twin perched eye domes with a deep center valley, projecting rounded snout, wide mouth and warm cream throat", skull: FROG,
  face: Object.fromEntries(Object.entries(FROG_FACE).map(([v, f]) => [v, f.grid])), anchor: Object.fromEntries(Object.entries(FROG_FACE).map(([v, f]) => [v, f.anchor])),
  views: { jaw: ["k", "zsSL"] }, expr: FROG_EXPR, closes: true, reach: 9.5, scales: "frog", skin: "jhH", materials: { scales: "JjhHY zsSL", eyes: "q" } }

const SKULL_HEAD = sdf.union(
  // bulbous smooth cranium dome + flared zygomatic cheekbones + narrow pinched bony jaw (iconic skull silhouette)
  sdf.ellipsoid([4.65, 5.0, 4.7]).at(0, -0.35, 1.35),
  sdf.ellipsoid([4.45, 2.75, 1.55]).at(0, 1.45, -1.2),
  sdf.box([3.7, 3.6, 3.2], { round: 1.05 }).at(0, 1.85, -3.15), { smooth: 0.65 }
).subtract(
  // gentle side cheek hollows narrowing the lower jaw silhouette cleanly without carving vertical front grooves
  ...[-1, 1].map((s) => sdf.sphere(1.25).at(s * 3.85, 0.7, -2.9)),
  ...[-1, 1].map((s) => sdf.ellipsoid([1.45, 1.55, 1.35]).at(s * 2.05, 4.15, 0.15)),
  sdf.capsule([0, 4.55, -0.95], [0, 4.55, -2.05], 0.55)
).paint(pure({}, (q) => (q[1] > 2.6 && Math.abs(q[2] - 0.15) < 1.05 && Math.abs(Math.abs(q[0]) - 2.05) < 1.05 ? "k" : q[2] < -2.3 && Math.abs(q[0]) > 1.65 ? "zs" : "zsSL")))
// default skull: pure pitch-black hollow eye orbits, bright sculpted cheekbones & nasal bridge, dark nasal hollow, crisp grinning ivory teeth
const SKULL_RUNS = {
  s: { "-1": [[-3, "kk"], [0, "L"], [2, "kk"]], 0: [[-3, "kk"], [0, "S"], [2, "kk"]], 1: [[-3, "sLS"], [0, "k"], [1, "SLs"]], 2: [[-3, "sSLSLSs"]], 3: [[-2, "LkLkL"]], 4: [[-1, "sSs"]] },
  sw: { "-1": [[-4, "k"], [-3, "S"], [-2, "LS"], [0, "kk"]], 0: [[-4, "k"], [-3, "S"], [-2, "SL"], [0, "kk"]], 1: [[-4, "s"], [-3, "k"], [-2, "SL"], [0, "LSs"]], 2: [[-4, "SLSLS"]], 3: [[-4, "LkLk"]], 4: [[-3, "zSs"]] },
  w: { "-1": [[-3, "kk"]], 0: [[-3, "kk"]], 1: [[-4, "k"], [-3, "SLs"]], 2: [[-4, "SLSL"]], 3: [[-4, "LkLk"]], 4: [[-3, "zSs"]] },
  nw: { "-1": [[-4, "k"]], 0: [[-4, "k"]] },
  n: { 3: [[-1, "z"], [1, "z"]] },
}
const SKULL_GLOW_RUNS = {
  s: { ...SKULL_RUNS.s, 0: [[-3, "kq"], [0, "S"], [2, "qk"]] },
  sw: { ...SKULL_RUNS.sw, 0: [[-4, "q"], [-3, "S"], [-2, "SL"], [0, "qk"]] },
  w: { ...SKULL_RUNS.w, 0: [[-3, "qk"]] },
  nw: { "-1": [[-4, "k"]], 0: [[-4, "q"]] },
  n: SKULL_RUNS.n,
}
const SKULL_FACE = Object.fromEntries(Object.entries(SKULL_RUNS).map(([v, r]) => [v, gridOf(r)]))
const SKULL_GLOW_FACE = Object.fromEntries(Object.entries(SKULL_GLOW_RUNS).map(([v, r]) => [v, gridOf(r)]))
const SKULL_EXPR = Object.fromEntries(Object.entries({
  grit: { s: { 0: [[-3, "kq"], [2, "qk"]], 3: [[-2, "LkLkL"]] }, sw: { 0: [[-4, "q"], [0, "qk"]] }, w: { 0: [[-3, "qk"]] } },
  wince: { s: { 0: [[-3, "kk"], [2, "kk"]] }, sw: { 0: [[-4, "k"], [0, "kk"]] }, w: { 0: [[-3, "kk"]] } },
  dead: { s: { 0: [[-3, "kk"], [2, "kk"]] }, sw: { 0: [[-4, "k"], [0, "kk"]] }, w: { 0: [[-3, "kk"]] } },
}).map(([k, rs]) => [k, Object.fromEntries(Object.entries(rs).map(([v, r]) => [v, gridOf(r)]))]))
HEADS.skull = { slot: "head", is: "an undead skull: bulbous bone cranium, flared cheekbones, narrow pinched jaw, deep pitch-black hollow eye orbits, nasal cavity and grinning teeth", skull: SKULL_HEAD,
  face: Object.fromEntries(Object.entries(SKULL_FACE).map(([v, f]) => [v, f.grid])), anchor: Object.fromEntries(Object.entries(SKULL_FACE).map(([v, f]) => [v, f.anchor])),
  views: { jaw: ["k", "zsSL"] }, expr: SKULL_EXPR, closes: true, reach: 7.5, bones: "ivory", skin: "zsS", materials: { bones: "zsSL JjhHY" } }

// anthropomorphic rabbit/hare head (tall V-splayed ears swept back, leaving front brow clear for compact jackalope antlers!)
const RABBIT_EAR = (s) => sdf.union(
  sdf.capsule([s * 1.9, -1.7, 3.8], [s * 3.1, -2.7, 8.0], 1.25, 1.18),
  sdf.capsule([s * 3.1, -2.7, 8.0], [s * 3.6, -3.5, 11.4], 1.1, 0.78),
  { smooth: 0.5 }
).paint(pure({}, (q, n) => (n[1] > 0.3 && q[2] > 4.6 ? "zsS" : "jhHY"))).part("ears")
const RABBIT = sdf.union(
  sdf.union(
    sdf.ellipsoid([3.95, 4.15, 4.0]).at(0, -0.55, 0.7),
    sdf.ellipsoid([4.65, 3.25, 2.65]).at(0, 0.45, -1.35),
    sdf.ellipsoid([2.25, 2.6, 1.75]).at(0, 3.55, -0.95),
    sdf.ellipsoid([1.55, 1.8, 1.05]).at(0, 2.9, -2.2),
    { smooth: 0.85 }
  ).paint(pure({}, (q) => (q[1] > 5.75 && Math.abs(q[0]) < 0.9 && q[2] > -1.3 && q[2] < -0.2 ? "kJj" : (q[2] < -0.7 && q[1] > 0.8) || (q[1] > 3.2 && q[2] < 0.3) ? "zsSL" : "jhHY"))),
  ...[-1, 1].map(RABBIT_EAR)
)
const RABBIT_RUNS = {
  s: { "-1": [[-3, "k"], [3, "k"]], 0: [[-3, "e"], [3, "e"]], 1: [[-1, "LJL"]], 2: [[-1, "zSz"]] },
  sw: { "-1": [[-2, "k"]], 0: [[-5, "L"], [-2, "e"]], 1: [[-5, "JSL"]], 2: [[-4, "zS"]] },
  w: { "-1": [[-3, "k"]], 0: [[-6, "S"], [-3, "e"]], 1: [[-6, "JSL"]], 2: [[-5, "zS"]] },
  nw: { "-1": [[-4, "k"]] },
  n: { 2: [[-2, "h"], [2, "h"]] },
}
const RABBIT_FACE = Object.fromEntries(Object.entries(RABBIT_RUNS).map(([v, r]) => [v, gridOf(r)]))
const RABBIT_EXPR = Object.fromEntries(Object.entries({
  grit: { s: { "-2": [[-3, "J"], [3, "J"]], "-1": [[-3, "k"], [3, "k"]] }, sw: { "-2": [[-2, "J"]], "-1": [[-2, "k"]] }, w: { "-2": [[-3, "J"]], "-1": [[-3, "k"]] } },
  wince: { s: { "-1": [[-3, "H"], [3, "H"]], 0: [[-3, "k"], [3, "k"]] }, sw: { "-1": [[-2, "H"]], 0: [[-2, "k"]] }, w: { "-1": [[-3, "H"]], 0: [[-3, "k"]] } },
  dead: { s: { "-1": [[-3, "H"], [3, "H"]], 0: [[-3, "k"], [3, "k"]] }, sw: { "-1": [[-2, "H"]], 0: [[-2, "k"]] }, w: { "-1": [[-3, "H"]], 0: [[-3, "k"]] } },
}).map(([k, rs]) => [k, Object.fromEntries(Object.entries(rs).map(([v, r]) => [v, gridOf(r)]))]))
HEADS.rabbit = { slot: "head", is: "a lagomorph rabbit/hare head: fluffy round cheeks, short soft muzzle with pale mask, high-contrast eyes, tall V-splayed ears compatible with horns (jackalope)", skull: RABBIT,
  face: Object.fromEntries(Object.entries(RABBIT_FACE).map(([v, f]) => [v, f.grid])), anchor: Object.fromEntries(Object.entries(RABBIT_FACE).map(([v, f]) => [v, f.anchor])),
  views: { jaw: ["k", "zsSL"] }, expr: RABBIT_EXPR, closes: true, reach: 13.5, fur: "cream", skin: "jhH", materials: { fur: "JjhHY zsSL", eyes: "Ee" } }

// bovine bull/minotaur head: large heavy sloped brow, broad long square dark muzzle, shaggy jaw ruff, wide outward bovine ears (defaults to bull horns)
const bullEar = (s) => sdf.capsule([s * 4.5, -1.2, 1.9], [s * 8.4, -2.0, 0.9], 1.45, 0.65)
  .paint(pure({}, (q, n) => (n[1] > 0.35 ? "Jj" : "jhH"))).part(`ear${s}`)
const BULL = sdf.union(
  sdf.union(
    sdf.ellipsoid([5.4, 5.6, 5.1]).at(0, -1.3, 1.1),
    sdf.ellipsoid([5.6, 3.4, 2.5]).at(0, 1.8, 2.8),
    sdf.ellipsoid([6.2, 4.1, 4.0]).at(0, -2.2, -1.6),
    sdf.box([5.9, 6.6, 4.6], { round: 1.7 }).rotate(16, "x").at(0, 4.4, -1.45),
    { smooth: 0.9 }
  ).paint(pure({}, (q) => (q[1] > 6.5 && q[2] > -3.1 ? "kJj" : q[2] < -2.9 && q[1] > 0.6 ? "Jjh" : q[2] > 2.2 && Math.abs(q[0]) < 2.6 ? "hHY" : "jhHY"))),
  ...[-1, 1].map(bullEar)
)
const BULL_RUNS = {
  s: { "-2": [[-5, "JJJ"], [3, "JJJ"]], "-1": [[-5, "Jkq"], [3, "qkJ"]], 2: [[-3, "JJJJJJJ"]], 3: [[-3, "JkJJJkJ"]], 4: [[-2, "JzzzJ"]] },
  sw: { "-2": [[-5, "J"], [-3, "HHH"], [0, "JJJ"]], "-1": [[-5, "q"], [-3, "hHH"], [0, "kqJ"]], 2: [[-6, "JJJJ"]], 3: [[-6, "kJkJJ"]], 4: [[-5, "zzzz"]] },
  w: { "-2": [[-3, "JJJ"]], "-1": [[-3, "kqJ"]], 2: [[-7, "JJJ"]], 3: [[-7, "kJJJ"]], 4: [[-6, "zzzz"]] },
  nw: { "-2": [[-5, "J"]], "-1": [[-5, "q"]] },
  n: { "-1": [[0, "Y"]] },
}
const BULL_FACE = Object.fromEntries(Object.entries(BULL_RUNS).map(([v, r]) => [v, gridOf(r)]))
const BULL_EXPR = Object.fromEntries(Object.entries({
  grit: { s: { "-2": [[-5, "kkk"], [3, "kkk"]] }, sw: { "-2": [[-5, "k"], [0, "kkk"]] }, w: { "-2": [[-3, "kkk"]] } },
  wince: { s: { "-1": [[-5, "kkk"], [3, "kkk"]] }, sw: { "-1": [[-5, "k"], [0, "kkk"]] }, w: { "-1": [[-3, "kkk"]] } },
  dead: { s: { "-1": [[-5, "kkk"], [3, "kkk"]] }, sw: { "-1": [[-5, "k"], [0, "kkk"]] }, w: { "-1": [[-3, "kkk"]] } },
}).map(([k, rs]) => [k, Object.fromEntries(Object.entries(rs).map(([v, r]) => [v, gridOf(r)]))]))
HEADS.bull = { slot: "head", is: "a large bovine bull/minotaur head: heavy sloped brow, broad long dark muzzle, wide outward ears, fierce deep-set eyes and default bull horns", skull: BULL,
  face: Object.fromEntries(Object.entries(BULL_FACE).map(([v, f]) => [v, f.grid])), anchor: Object.fromEntries(Object.entries(BULL_FACE).map(([v, f]) => [v, f.anchor])),
  views: { jaw: ["k", "JjhHY"] }, expr: BULL_EXPR, closes: true, reach: 15.5, horns: "bull", fur: "brown", skin: "jhH", materials: { fur: "JjhHY zsSL", eyes: "q" } }

// fierce hulking werewolf head (~1.22x wolf scale, sized for large/muscular builds): wild shaggy cheek & crown ruff, heavy brow, broad snarling snout with fang glint, tall pointed ears
const wwEar = (s) => sdf.cone(2.55, 5.4, 0.44).intersect(sdf.box([6.2, 2.2, 13.0])).rotate(-12, "x").rotate(s * 14, "y").at(s * 2.85, -2.0, 3.95)
  .paint(pure({}, (q, n) => (n[1] > 0.38 ? "zs" : "jhH"))).part("ears")
const WEREWOLF = sdf.union(
  sdf.union(
    sdf.ellipsoid([4.6, 4.9, 4.6]).at(0, -1.35, 1.15),
    sdf.ellipsoid([4.7, 2.6, 1.9]).at(0, 1.5, 2.35),
    sdf.ellipsoid([6.2, 3.7, 3.8]).at(0, -2.5, -1.6),
    ...[-1, 1].map((s) => sdf.capsule([s * 4.4, -1.6, -1.5], [s * 6.7, -4.2, -3.5], 1.75, 0.55)),
    ...[-1, 1].map((s) => sdf.capsule([s * 3.9, -2.1, 0.6], [s * 6.1, -4.4, -0.6], 1.5, 0.48)),
    sdf.capsule([0, -1.8, 3.4], [0, -5.2, 5.2], 1.65, 0.55),
    { smooth: 1.2 }
  ).noise({ amp: 0.3, scale: 1.15, seed: 37 }).paint(pure({}, (q) => (q[2] < -1.15 && q[1] > 0.2 ? "zsSL" : "jhHY"))),
  sdf.capsule([0, 1.0, 0.65], [0, 7.2, -0.65], 3.15, 1.95).union(sdf.ellipsoid([2.25, 3.1, 1.45]).at(0, 3.6, -2.05), { smooth: 0.7 })
    .paint(pure({}, (q) => (q[1] > 7.0 && q[2] > -1.75 ? "kJj" : q[2] < -0.25 ? "zsSL" : "jhHY"))).part("muzzle"),
  ...[-1, 1].map(wwEar)
)
const WEREWOLF_RUNS = {
  s: { "-2": [[-5, "JJJ"], [-1, "hjh"], [3, "JJJ"]], "-1": [[-4, "qk"], [3, "kq"]], 1: [[-5, "SS"], [-1, "H"], [1, "H"], [4, "SS"]], 2: [[-3, "sSkkkSs"]], 3: [[-4, "sSLzkzLSs"]], 4: [[-2, "szzzs"]] },
  sw: { "-2": [[-4, "JJ"], [-2, "HL"], [0, "JJJ"]], "-1": [[-4, "q"], [-2, "hH"], [0, "kqS"]], 1: [[-6, "kHSLL"]], 2: [[-7, "kkSLL"]], 3: [[-6, "zzLzs"], [0, "z"]], 4: [[-4, "zsss"]] },
  w: { "-2": [[-3, "JJJ"]], "-1": [[-3, "kq"]], 1: [[-8, "kL"]], 2: [[-8, "kkSL"]], 3: [[-6, "zLzs"]] },
  nw: { "-2": [[-5, "J"]], "-1": [[-5, "kq"]] },
  n: { "-1": [[0, "H"]], 2: [[-1, "hhh"]], 3: [[-2, "hhhhh"]] },
}
const WEREWOLF_FACE = Object.fromEntries(Object.entries(WEREWOLF_RUNS).map(([v, r]) => [v, gridOf(r)]))
const WEREWOLF_EXPR = Object.fromEntries(Object.entries({
  grit: { s: { "-2": [[-5, "kkk"], [3, "kkk"]], 3: [[-3, "L"], [3, "L"]] }, sw: { "-2": [[-4, "k"], [0, "kkk"]], 3: [[-5, "L"], [-3, "L"]] }, w: { "-2": [[-3, "kkk"]], 3: [[-6, "L"], [-4, "L"]] } },
  wince: { s: { "-1": [[-4, "kk"], [3, "kk"]] }, sw: { "-1": [[-4, "k"], [0, "kk"]] }, w: { "-1": [[-3, "kk"]] } },
  dead: { s: { "-1": [[-4, "kk"], [3, "kk"]] }, sw: { "-1": [[-4, "k"], [0, "kk"]] }, w: { "-1": [[-3, "kk"]] } },
}).map(([k, rs]) => [k, Object.fromEntries(Object.entries(rs).map(([v, r]) => [v, gridOf(r)]))]))
HEADS.werewolf = { slot: "head", is: "a large fierce werewolf head: sweeping shaggy cheek and crown ruff, heavy brow, broad snarling snout with fangs and tall pointed ears", skull: WEREWOLF,
  face: Object.fromEntries(Object.entries(WEREWOLF_FACE).map(([v, f]) => [v, f.grid])), anchor: Object.fromEntries(Object.entries(WEREWOLF_FACE).map(([v, f]) => [v, f.anchor])),
  views: { jaw: ["k", "zsSL"] }, expr: WEREWOLF_EXPR, closes: true, reach: 13.5, fur: "grey", skin: "jhH", materials: { fur: "JjhHY zsSL", eyes: "q" } }

// ursine bearfolk / bearkin head (sized for large/powerful builds): full rounded spherical cranium with a clear upright
// forehead and crisp bridge "stop", horizontal boxy bear snout projecting forward below the eyes with a flat dark leather
// nose tip, compact rounded cheek ruffs, and clearly separated high round cup-shaped bear ears on the rear crown corners.
// Shared geometry drives both `bear` (grizzly/brown/black/polar/spectacled) and `panda` (snow-white dome + black ears/eye-patches/collar).
const bearEarGeom = (s) => sdf.ellipsoid([1.85, 1.35, 1.85])
  .subtract(sdf.ellipsoid([1.0, 1.15, 1.0]).at(0, 0.85, -0.05))
  .rotate(-6, "x").rotate(s * -14, "z").rotate(s * 16, "y").at(s * 3.9, -1.35, 5.1)
const bearSkull = (panda = false) => sdf.union(
  // rounded cranium + upright forehead + compact rounded cheeks/nape + horizontal boxy snout with crisp stop below brow
  sdf.union(
    sdf.union(
      sdf.ellipsoid([4.6, 4.75, 4.3]).at(0, -0.15, 1.05),
      sdf.ellipsoid([5.15, 3.65, 3.05]).at(0, -0.75, -1.35),
      sdf.ellipsoid([4.85, 3.7, 3.3]).at(0, -1.8, -1.1),
      { smooth: 0.85 }
    ).noise({ amp: 0.14, scale: 1.3, seed: 53 }),
    sdf.union(
      sdf.box([3.75, 4.35, 2.55], { round: 0.85 }).at(0, 4.35, -1.1),
      sdf.ellipsoid([2.0, 2.3, 1.2]).at(0, 3.65, -2.25),
      { smooth: 0.4 }
    ),
    { smooth: 0.42 }
  ),
  bearEarGeom(-1),
  bearEarGeom(1),
  { smooth: 0.12 }
).paint(pure({ panda }, (q, n) => {
  // high rounded bear ears region (clearly separated on upper-outer rear crown corners)
  const inEar = q[2] > 3.55 && Math.abs(q[0]) > 2.2 && q[1] < 0.2
  if (inEar) {
    const cup = Math.hypot(Math.abs(q[0]) - 3.85, q[2] - 5.05) < 1.15 && n[1] > 0.25
    return cup ? (panda ? "kJ" : "Jj") : panda ? "JjhH" : "jhHY"
  }
  // broad blunt dark leather bear nose pad on the upper-front snout tip
  if (q[1] > 5.8 && Math.abs(q[0]) < 1.45 && q[2] > -1.25 && q[2] < 0.35) return "kJj"
  if (panda) {
    // crisp slanted oval charcoal eye patches with clean white bridge to the nose + dark lower collar transition
    const ex = (Math.abs(q[0]) - 2.35) / 1.2, ez = (q[2] - (0.85 - 0.18 * (Math.abs(q[0]) - 2.35))) / 1.0
    if (q[1] > 2.0 && ex * ex + ez * ez < 1.0) return "kJj"
    if (q[2] < -3.2) return "Jjh"
    return "zsSL"
  }
  // warm pale muzzle mask wrapping smoothly over the horizontal bear snout and chin
  if ((q[1] > 2.7 && q[2] < 0.55 && Math.abs(q[0]) < 2.55) || (q[1] > 1.6 && q[2] < -1.6 && Math.abs(q[0]) < 2.75)) return "zsSL"
  return "jhHY"
}))
const BEAR = bearSkull(false)
const PANDA = bearSkull(true)
// Hand-retouched ursine faces over baked 3D views (S, SW, W, NW, N):
// Solid dark brow (JJ) above forward-gazing eyes (pupil k toward nose, amber iris q behind); nose sits on the upper snout tip in W profile.
const BEAR_RUNS = {
  s: { "-2": [[-3, "JJ"], [2, "JJ"]], "-1": [[-3, "qk"], [2, "kq"]], 0: [[-2, "sSSSs"]], 1: [[-2, "SkkkS"]], 2: [[-2, "ssksS"]], 3: [[-2, "szzzs"]] },
  sw: { "-2": [[-4, "JJ"], [0, "JJ"]], "-1": [[-4, "kq"], [0, "kq"]], 0: [[-5, "kzs"]], 1: [[-6, "kkSL"]], 2: [[-5, "kkksS"]], 3: [[-4, "kzzs"]] },
  w: { "-2": [[-3, "JJ"]], "-1": [[-3, "kq"]], 0: [[-7, "kkS"]], 1: [[-7, "kSLS"]], 2: [[-7, "ksss"]], 3: [[-6, "kzzs"]] },
  nw: { "-2": [[-5, "J"]] },
  n: { 2: [[-2, "hhh"]] },
}
// Clean pale diagonal battle scar slashing across brow and cheek without dark black borders (eye stays intact)
const BEAR_SCAR_RUNS = {
  s: { "-4": [[2, "L"]], "-3": [[3, "L"]], 0: [[3, "S"]], 1: [[4, "S"]], 2: [[4, "s"]] },
  sw: { "-4": [[1, "L"]], "-3": [[1, "L"]], 0: [[1, "S"]], 1: [[2, "S"]], 2: [[2, "s"]] },
  w: { "-4": [[-2, "L"]], "-3": [[-2, "L"]], 0: [[-1, "S"]], 1: [[0, "s"]] },
}
const PANDA_RUNS = {
  s: { "-2": [[-4, "JJJ"], [2, "JJJ"]], "-1": [[-4, "Jsk"], [2, "ksJ"]], 0: [[-4, "JJ"], [-2, "sLLSs"], [3, "JJ"]], 1: [[-2, "SkkkS"]], 2: [[-2, "ssksS"]], 3: [[-2, "szzzs"]] },
  sw: { "-2": [[-4, "JJ"], [0, "JJJ"]], "-1": [[-4, "zJ"], [0, "ksJ"]], 0: [[-5, "kksSS"], [0, "JJ"]], 1: [[-6, "kkSLSS"]], 2: [[-5, "kkksS"]], 3: [[-4, "kzzs"]] },
  w: { "-2": [[-4, "SJJJ"]], "-1": [[-3, "ksJ"]], 0: [[-7, "kkSLJ"], [-2, "J"]], 1: [[-7, "kSLSJ"]], 2: [[-7, "ksss"]], 3: [[-6, "kzzs"]] },
  nw: { "-2": [[-5, "JJ"]] },
  n: { 2: [[-2, "sss"]] },
}
const BEAR_FACE = Object.fromEntries(Object.entries(BEAR_RUNS).map(([v, r]) => [v, gridOf(r)]))
const PANDA_FACE = Object.fromEntries(Object.entries(PANDA_RUNS).map(([v, r]) => [v, gridOf(r)]))
const BEAR_EXPR = Object.fromEntries(Object.entries({
  grit: { s: { "-2": [[-3, "kk"], [2, "kk"]], 2: [[-2, "kLkLk"]] }, sw: { "-2": [[-4, "kk"], [0, "kk"]], 2: [[-5, "kLkL"]] }, w: { "-2": [[-3, "kk"]], 2: [[-6, "kLk"]] } },
  // wince/dead replace the dark brow (row -2) with furred upper eyelids (Hh/HH) above a crisp 1px closed eye slit (kk), avoiding a 2x2 solid black eye socket
  wince: { s: { "-2": [[-3, "Hh"], [2, "hH"]], "-1": [[-3, "kk"], [2, "kk"]], 2: [[-2, "skzks"]] }, sw: { "-2": [[-4, "Hh"], [0, "hH"]], "-1": [[-4, "kk"], [0, "kk"]], 2: [[-5, "kkzkS"]] }, w: { "-2": [[-3, "hH"]], "-1": [[-3, "kk"]], 2: [[-7, "kkzs"]] } },
  dead: { s: { "-2": [[-3, "HH"], [2, "HH"]], "-1": [[-3, "kk"], [2, "kk"]] }, sw: { "-2": [[-4, "HH"], [0, "HH"]], "-1": [[-4, "kk"], [0, "kk"]] }, w: { "-2": [[-3, "HH"]], "-1": [[-3, "kk"]] } },
}).map(([k, rs]) => [k, Object.fromEntries(Object.entries(rs).map(([v, r]) => [v, gridOf(r)]))]))
const PANDA_EXPR = Object.fromEntries(Object.entries({
  grit: { s: { 2: [[-2, "kLkLk"]] }, sw: { 2: [[-5, "kLkL"]] }, w: { 2: [[-6, "kLk"]] } },
  wince: { s: { "-1": [[-3, "Hk"], [2, "kH"]], 2: [[-2, "skzks"]] }, sw: { "-1": [[-4, "hJ"], [0, "kHJ"]], 2: [[-5, "kkzkS"]] }, w: { "-1": [[-3, "kHJ"]], 2: [[-7, "kkzs"]] } },
  dead: { s: { "-1": [[-3, "hk"], [2, "kh"]] }, sw: { "-1": [[-4, "hJ"], [0, "khJ"]] }, w: { "-1": [[-3, "khJ"]] } },
}).map(([k, rs]) => [k, Object.fromEntries(Object.entries(rs).map(([v, r]) => [v, gridOf(r)]))]))
HEADS.bear = { slot: "head", is: "a broad ursine bearkin/bearfolk head: rounded dome cranium, plush cheek ruff, high rounded cup ears, blunt boxy snout with pale muzzle mask and wide dark nose", skull: BEAR,
  face: Object.fromEntries(Object.entries(BEAR_FACE).map(([v, f]) => [v, f.grid])), anchor: Object.fromEntries(Object.entries(BEAR_FACE).map(([v, f]) => [v, f.anchor])),
  views: { jaw: ["k", "zsSL"] }, expr: BEAR_EXPR, closes: true, reach: 13.0, fur: "grizzly", skin: "jhH", materials: { fur: "JjhHY zsSL", eyes: "q" } }
HEADS.panda = { slot: "head", is: "a panda bearfolk head: snow-white rounded dome and muzzle, charcoal-black rounded cup ears, slanted dark eye patches and dark collar fur", skull: PANDA,
  face: Object.fromEntries(Object.entries(PANDA_FACE).map(([v, f]) => [v, f.grid])), anchor: Object.fromEntries(Object.entries(PANDA_FACE).map(([v, f]) => [v, f.anchor])),
  views: { jaw: ["k", "zsSL"] }, expr: PANDA_EXPR, closes: true, reach: 13.0, fur: "panda", skin: "jhH", materials: { fur: "JjhHY zsSL", eyes: "q" } }

const AUTO_HEAD = sdf.union(
  sdf.box([7.8, 8.6, 9.4], { round: 1.9 }).at(0, -0.1, 0.2).paint(pure({}, (q, n) => (n[2] > 0.6 ? "jhHY" : Math.abs(q[0]) < 0.55 && q[2] > 2.0 ? "hHY" : Math.abs(q[2] + 2.4) < 0.4 ? "Jj" : "JjhH"))),
  sdf.capsule([0, -2.5, 4.9], [0, 3.2, 4.9], 0.8, 0.65).mat("hHY").part("crest"),
  ...[-1, 1].map((s) => sdf.cylinder(1.3, 1.0).rotate(90, "y").at(s * 4.2, -0.3, 0.2).mat("Jjh").part(`bolt${s}`)),
  sdf.box([5.6, 1.4, 1.35], { round: 0.3 }).at(0, 4.0, 0.5).mat(KEYS.visor).part("visor")
)
const AUTO_RUNS = {
  s: { "-1": [[-3, "☆✦✧✧✦☆"]], 0: [[-3, "☆✦✦✦✦☆"]], 2: [[-2, "JjJjJ"]] },
  sw: { "-1": [[-4, "☆✦✧✦☆"]], 0: [[-4, "☆✦✦✦☆"]], 2: [[-3, "JjJj"]] },
  w: { "-1": [[-4, "☆✦✧"]], 0: [[-4, "☆✦✦"]], 2: [[-4, "JjJ"]] },
  nw: { "-1": [[-4, "☆✦"]] },
  n: { "-2": [[0, "Y"]], 2: [[-2, "J"], [2, "J"]] },
}
const AUTO_FACE = Object.fromEntries(Object.entries(AUTO_RUNS).map(([v, r]) => [v, gridOf(r)]))
const AUTO_EXPR = Object.fromEntries(Object.entries({
  grit: { s: { "-1": [[-3, "✦✧✧✧✧✦"]], 0: [[-3, "✦✧✧✧✧✦"]] }, sw: { "-1": [[-4, "✦✧✧✧✦"]], 0: [[-4, "✦✧✧✧✦"]] }, w: { "-1": [[-4, "✦✧✧"]], 0: [[-4, "✦✧✧"]] } },
  wince: { s: { "-1": [[-3, "☆✦☆☆✦☆"]], 0: [[-3, "☆☆☆☆☆☆"]] }, sw: { "-1": [[-4, "☆✦☆✦☆"]], 0: [[-4, "☆☆☆☆☆"]] }, w: { "-1": [[-4, "☆✦☆"]] } },
  dead: { s: { "-1": [[-3, "kkkkkk"]], 0: [[-3, "kkkkkk"]] }, sw: { "-1": [[-4, "kkkkk"]], 0: [[-4, "kkkkk"]] }, w: { "-1": [[-4, "kkk"]], 0: [[-4, "kkk"]] } },
}).map(([k, rs]) => [k, Object.fromEntries(Object.entries(rs).map(([v, r]) => [v, gridOf(r)]))]))
HEADS.automaton = { slot: "head", is: "a riveted automaton construct head: armored beveled plates, crest fin, ear-bolts and glowing visor optics", skull: AUTO_HEAD,
  face: Object.fromEntries(Object.entries(AUTO_FACE).map(([v, f]) => [v, f.grid])), anchor: Object.fromEntries(Object.entries(AUTO_FACE).map(([v, f]) => [v, f.anchor])),
  views: { jaw: ["k", "JjhHY"] }, emitMats: { [KEYS.visor]: { ramp: KEYS.visor, emit: 0.85 } }, expr: AUTO_EXPR, closes: true, reach: 7.5, chassis: "steel", skin: "jhH", materials: { chassis: "JjhHY", visor: KEYS.visor } }
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
for (const k of ["reptile", "frog", "skull", "rabbit", "bull", "werewolf", "bear", "panda", "automaton"]) {
  FACES[k] = { key: k, slot: "face", own: true, is: `the ${k}'s own face`, views: HEADS[k].face, anchor: HEADS[k].anchor, fits: { head: [k] }, materials: HEADS[k].materials }
}
FACES.bearscar = { key: "bearscar", slot: "face", is: "the bear's face with a diagonal battle scar across the brow and cheek, the eye whole",
  ...(() => { const g = Object.fromEntries(Object.entries(BEAR_RUNS).map(([v, r]) => [v, gridOf(runsOver(r, BEAR_SCAR_RUNS[v]))]))
    return { views: Object.fromEntries(Object.entries(g).map(([v, f]) => [v, f.grid])), anchor: Object.fromEntries(Object.entries(g).map(([v, f]) => [v, f.anchor])) } })(),
  fits: { head: ["bear"] }, materials: HEADS.bear.materials }
FACES.skullglow = { key: "skullglow", slot: "face", is: "the skull's face with glowing undead pinpoints inside the dark eye sockets (colored by colors.eyes)",
  views: Object.fromEntries(Object.entries(SKULL_GLOW_FACE).map(([v, f]) => [v, f.grid])), anchor: Object.fromEntries(Object.entries(SKULL_GLOW_FACE).map(([v, f]) => [v, f.anchor])),
  fits: { head: ["skull"] }, materials: { ...HEADS.skull.materials, eyes: "q" } }
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
  tail: {
    wolf: { slot: "tail", is: "a lush bushy wolf tail swelling through its mid-plume and tapering symmetrically to a fine calligraphy-brush pale tip",
      draw: (F, B) => {
        const { j } = F, k = rOf(B).body[0] / dress.r.body[0], back = (o, d, u) => [o[0] - j.f[0] * d, o[1] - j.f[1] * d, o[2] + u]
        // smooth arched centerline with symmetric top & bottom calligraphy-brush (fude) taper in every view including W/E profile
        const a = back(j.pelvis, 2.2 * k, 0.2), b0 = back(a, 2.6 * k, -1.7 * k), b = hung(F, b0, 0.35)
        const c0 = back(b0, 2.4 * k, -0.7 * k), c = hung(F, c0, 0.65)
        const d0 = back(c0, 2.1 * k, 0.2 * k), d = hung(F, d0, 0.88)
        const tip = hung(F, back(d0, 1.85 * k, 0.45 * k), 1)
        const plume = sdf.union(
          sdf.capsule(a, b, 1.05 * k, 1.95 * k),
          sdf.capsule(b, c, 1.95 * k, 1.85 * k),
          sdf.capsule(c, d, 1.85 * k, 1.05 * k), { smooth: 0.45 }
        ).noise({ amp: 0.12, scale: 1.5, seed: 29 })
        const brushTip = sdf.capsule(d, tip, 1.05 * k, 0.20)
        const body = sdf.union(plume, brushTip, { smooth: 0.22 }).paint((q, n) => {
          const distTip = Math.hypot(q[0] - tip[0], q[1] - tip[1], q[2] - tip[2])
          return distTip < 3.6 * k ? "zsSL" : n[2] > 0.35 ? "hHY" : "jhH"
        })
        return { tail: [body] }
      } },
    cat: { slot: "tail", is: "a sleek slender feline tail sweeping back in a graceful S-curve with a full rounded upward-hooked tip",
      draw: (F, B) => {
        const { j } = F, k = rOf(B).body[0] / dress.r.body[0]
        // in straight back view (N, j.f[1] ~ 1), curl clearly out past the hip so the feline S-hook silhouettes cleanly instead of a 1px vertical strip
        const bv = Math.max(0, (j.f[1] - 0.85) / 0.15)
        const back = (o, d, u, s = 0) => [o[0] - j.f[0] * d + j.r[0] * (s * bv), o[1] - j.f[1] * d + j.r[1] * (s * bv), o[2] + u]
        const a = back(j.pelvis, 2.0 * k, 0.2), b0 = back(a, 3.0 * k, -1.75 * k, 2.1 * k), b = hung(F, b0, 0.35)
        const c0 = back(b0, 3.2 * k, -0.2 * k, 3.1 * k), c = hung(F, c0, 0.65)
        const d0 = back(c0, 2.0 * k, 2.85 * k, 1.45 * k), d = hung(F, d0, 0.88)
        const tip = hung(F, back(d0, -0.85 * k, 2.55 * k, -1.1 * k), 1)
        const body = sdf.union(
          sdf.capsule(a, b, 0.84 * k, 0.8 * k),
          sdf.capsule(b, c, 0.8 * k, 0.8 * k),
          sdf.capsule(c, d, 0.8 * k, 0.78 * k),
          sdf.capsule(d, tip, 0.78 * k, 0.7 * k), { smooth: 0.42 }
        ).paint((q, n) => (n[2] > 0.28 ? "hHY" : "jhH"))
        return { tail: [body] }
      } },
    rabbit: { slot: "tail", is: "a plump multi-tufted fluffy rabbit cottontail bobbing proudly at the base of the spine",
      draw: (F, B, P, W) => {
        const { j } = F, k = rOf(B).body[0] / dress.r.body[0], at = hung(F, [j.pelvis[0] - j.f[0] * (4.1 * k), j.pelvis[1] - j.f[1] * (4.1 * k), j.pelvis[2] + 0.55], 0.6)
        const off = (d, s, u) => [at[0] - j.f[0] * d + j.r[0] * s, at[1] - j.f[1] * d + j.r[1] * s, at[2] + u]
        // on human-headed bunny folk, match hair/ear fur tones so skin tone doesn't tint the cottontail; on beast heads, use pale mask fur
        const hi = W?.hair ? "hHY" : "sSL", lo = W?.hair ? "jhH" : "zsS"
        const puff = sdf.union(
          sdf.ellipsoid([1.95 * k, 2.1 * k, 2.0 * k]).at(at),
          sdf.sphere(1.25 * k).at(off(0.65 * k, 0, 0.85 * k)),
          sdf.sphere(1.15 * k).at(off(0.45 * k, -0.85 * k, -0.25 * k)),
          sdf.sphere(1.15 * k).at(off(0.45 * k, 0.85 * k, -0.25 * k)), { smooth: 0.55 }
        ).noise({ amp: 0.14, scale: 1.8, seed: 13 }).paint((q, n) => (n[2] < -0.25 ? lo : hi))
        return { tail: [puff] }
      } },
    reptile: { slot: "tail", is: "a heavy muscular scaled lizard/dragon tail with pale belly scales and dorsal ridge scutes tapering to a whip point",
      draw: (F, B) => {
        const { j } = F, k = rOf(B).body[0] / dress.r.body[0], back = (o, d, u) => [o[0] - j.f[0] * d, o[1] - j.f[1] * d, o[2] + u]
        const a = back(j.pelvis, 1.6 * k, 0.2), b0 = back(a, 3.2 * k, -2.5 * k), b = hung(F, b0, 0.3)
        const c0 = back(b0, 3.3 * k, -2.1 * k), c = hung(F, c0, 0.6)
        const d0 = back(c0, 2.9 * k, 0.0), d = hung(F, d0, 0.85)
        const tip = hung(F, back(d0, 2.1 * k, 1.45 * k), 1)
        const main = sdf.union(
          sdf.capsule(a, b, 2.12 * k, 1.55 * k),
          sdf.capsule(b, c, 1.55 * k, 1.02 * k),
          sdf.capsule(c, d, 1.02 * k, 0.58 * k),
          sdf.capsule(d, tip, 0.58 * k, 0.32), { smooth: 0.5 }
        ).paint((q, n) => (n[2] < -0.25 ? "zsSL" : n[2] > 0.45 ? "hHY" : "jhH"))
        // graduated dorsal ridge scutes hugging the upper tail spine (echoing the reptile head crest)
        const sp = (p0, p1, t, r0, len) => {
          const base = lerp(p0, p1, t)
          return sdf.capsule(base, [base[0] - j.f[0] * (len * 0.75), base[1] - j.f[1] * (len * 0.75), base[2] + len], r0, 0.38).mat("zsSL")
        }
        const spines = [sp(a, b, 0.58, 0.72 * k, 1.45 * k), sp(b, c, 0.5, 0.58 * k, 1.18 * k), sp(c, d, 0.4, 0.46 * k, 0.92 * k)]
        return { tail: [main, ...spines] }
      } },
    bull: { slot: "tail", is: "a slender bovine tail sweeping out in a soft S-flick behind the upper thighs to a pointed dark fur brush tuft",
      draw: (F, B) => {
        const { j } = F, k = rOf(B).body[0] / dress.r.body[0]
        // in straight back view (N), flick sideways past the right hip at mid-thigh height (never hanging straight down like a third leg)
        const bv = Math.max(0, (j.f[1] - 0.85) / 0.15)
        const back = (o, d, u, s = 0) => [o[0] - j.f[0] * d + j.r[0] * (s * bv), o[1] - j.f[1] * d + j.r[1] * (s * bv), o[2] + u]
        const a = back(j.pelvis, 2.1 * k, 0.35), b0 = back(a, 2.6 * k, -1.6 * k, 1.8 * k), b = hung(F, b0, 0.35)
        const c0 = back(b0, 2.4 * k, -1.2 * k, 2.5 * k), c = hung(F, c0, 0.68)
        const d0 = back(c0, 1.7 * k, 0.55 * k, 1.5 * k), d = hung(F, d0, 0.9)
        const tip = hung(F, back(d0, 1.65 * k, 0.95 * k, 1.15 * k), 1)
        const cord = sdf.union(
          sdf.capsule(a, b, 0.52 * k, 0.40 * k),
          sdf.capsule(b, c, 0.40 * k, 0.35 * k),
          sdf.capsule(c, d, 0.35 * k, 0.34 * k), { smooth: 0.3 }
        ).mat("jhHY")
        // compact pointed teardrop brush tuft (like a small dark calligraphy tip, never a bulky hoof-like club)
        const tuft = sdf.union(
          sdf.capsule(c, d, 0.36 * k, 0.96 * k),
          sdf.capsule(d, tip, 0.96 * k, 0.22), { smooth: 0.24 }
        ).paint((q, n) => (n[2] > 0.45 ? "jhH" : "Jjh"))
        return { tail: [cord, tuft] }
      } },
    devil: { slot: "tail", is: "a fine delicate demon/tiefling whip tail sweeping past robes and below batwings to a crisp barbed spade tip",
      draw: (F, B) => {
        const { j } = F, k = rOf(B).body[0] / dress.r.body[0]
        const bv = Math.max(0, (j.f[1] - 0.85) / 0.15)
        const back = (o, d, u, s = 0) => [o[0] - j.f[0] * d + j.r[0] * (s * bv), o[1] - j.f[1] * d + j.r[1] * (s * bv), o[2] + u]
        const a = back(j.pelvis, 2.0 * k, 0.0), b0 = back(a, 3.5 * k, -2.6 * k, 1.5 * k), b = hung(F, b0, 0.35)
        const c0 = back(b0, 3.5 * k, -0.5 * k, 2.3 * k), c = hung(F, c0, 0.68)
        const d0 = back(c0, 2.3 * k, 1.7 * k, 1.3 * k), d = hung(F, d0, 0.9)
        const tip = hung(F, back(d0, 1.35 * k, 1.4 * k, 0.7 * k), 1)
        const whip = sdf.union(
          sdf.capsule(a, b, 0.46 * k, 0.38 * k),
          sdf.capsule(b, c, 0.38 * k, 0.35 * k),
          sdf.capsule(c, d, 0.35 * k, 0.33 * k),
          sdf.capsule(d, tip, 0.33 * k, 0.3 * k), { smooth: 0.24 }
        ).mat("zsSL")
        // sleek delicate 3D crossed barbed spade arrowhead matched to the fine whip cord
        const U = unit([tip[0] - d[0], tip[1] - d[1], tip[2] - d[2]])
        const fr1 = frame(tip, U, unit([j.r[0] * 0.7 + UP[0] * 0.7, j.r[1] * 0.7 + UP[1] * 0.7, 0.7]))
        const fr2 = frame(tip, U, fr1.N)
        const sc = 0.7 + 0.18 * k
        const SPADE = [[-1.0 * sc, -1.55 * sc], [0.15 * sc, -1.15 * sc], [2.6 * sc, 0], [0.15 * sc, 1.15 * sc], [-1.0 * sc, 1.55 * sc], [-0.1 * sc, 0]]
        const spadePaint = (t, s) => (Math.abs(s) < 0.45 * sc && t > -0.1 * sc ? "zsSL" : "zsS")
        const spade = sdf.union(slab(fr1, SPADE, 0.32 * sc, spadePaint), slab(fr2, SPADE, 0.32 * sc, spadePaint), { smooth: 0.18 })
        return { tail: [whip, spade] }
      } },
    bear: { slot: "tail", is: "a short, round, stubby tufted bear bobtail perched low at the base of the spine in the bear's fur",
      draw: (F, B) => {
        const { j } = F, k = rOf(B).body[0] / dress.r.body[0]
        const at = hung(F, [j.pelvis[0] - j.f[0] * (4.2 * k), j.pelvis[1] - j.f[1] * (4.2 * k), j.pelvis[2] - 0.1], 0.45)
        const off = (d, s, u) => [at[0] - j.f[0] * d + j.r[0] * s, at[1] - j.f[1] * d + j.r[1] * s, at[2] + u]
        const stub = sdf.union(
          sdf.ellipsoid([1.45 * k, 1.55 * k, 1.45 * k]).at(at),
          sdf.sphere(0.95 * k).at(off(0.45 * k, 0, -0.35 * k)),
          sdf.sphere(0.85 * k).at(off(0.35 * k, 0, 0.4 * k)),
          { smooth: 0.45 }
        ).noise({ amp: 0.12, scale: 1.8, seed: 47 }).paint(pure({}, (q, n) => (n[2] > 0.35 ? "hHY" : "jhH")))
        return { tail: [stub] }
      } },
  },
  // the mane: the neck's fur in a collar where it meets the shoulders, over a shirt's collar and a coat's, under the head's
  // ruff; a dark row under its edge where it lies on the cloth, strokes down its fall
  mane: {
    wolf: { slot: "mane", is: "a wolf's shaggy neck and shoulder mane draping over the collar and upper back", covers: ["the collar"],
      // (over armor: a layer over the outermost the new pieces put round the trunk)
      draw: (F, B, P, W) => {
        const m = Math.max(3.2, outerOf(W) + 0.5), z0 = F.top - 1.35, z1 = F.top + 1.85
        return { mane: F.wrap(z0, z1, pure({ m, z0, z1, share }, (z, a) => {
          const t = share(z, z0, z1), backTuft = Math.abs(a) > 1.65 ? 1.15 * Math.sin(Math.PI * t) : 0
          return (t < 0.45 ? m : m - (m - 0.9) * ((t - 0.45) / 0.55)) + backTuft
        }), { keep: pure({}, (h, a) => h > 0.14 || Math.sin(a * 10 + 0.4) > -0.18), paint: (h, a, out) => (!out ? "j" : h < 0.2 ? "Jj" : Math.abs(Math.sin(a * 5)) < 0.28 ? "jhH" : "hHY") }) }
      } },
    bull: { slot: "mane", is: "a thick shaggy bovine shoulder/neck mane and humped upper back traps", covers: ["the collar"],
      draw: (F, B, P, W) => {
        const m = Math.max(3.6, outerOf(W) + 0.65), z0 = F.top - 2.0, z1 = F.top + 3.0
        return { mane: F.wrap(z0, z1, pure({ m, z0, z1, share }, (z, a) => {
          const t = share(z, z0, z1), hump = Math.abs(a) > 1.45 ? 2.5 * Math.sin(Math.PI * t) : 0
          return (t < 0.45 ? m : m - (m - 1.4) * ((t - 0.45) / 0.55)) + hump
        }), { keep: pure({}, (h, a) => h > 0.14 || Math.sin(a * 9 + 0.5) > -0.15), paint: (h, a, out) => (!out ? "J" : h < 0.2 ? "Jj" : Math.abs(Math.sin(a * 5)) < 0.28 ? "Jjh" : "jhH") }) }
      } },
    bear: { slot: "mane", is: "a compact, tidy ursine neck fur collar blending the bear head cleanly into the garment neckline without overwhelming the chest", covers: ["the collar"],
      draw: (F, B, P, W) => {
        const m = Math.max(1.85, outerOf(W) + 0.18), z0 = F.top - 0.9, z1 = F.top + 1.8
        return { mane: F.wrap(z0, z1, pure({ m, z0, z1, share }, (z, a) => {
          const t = share(z, z0, z1), neckFull = (Math.abs(a) > 1.4 ? 0.35 : 0.18) * Math.sin(Math.PI * t)
          return (t < 0.45 ? m : m - (m - 1.1) * ((t - 0.45) / 0.55)) + neckFull
        }), { keep: pure({}, (h, a) => h > 0.14 || Math.sin(a * 11 + 0.3) > -0.1), paint: pure({}, (h, a, out) => (!out ? "j" : h < 0.2 ? "Jj" : Math.abs(Math.sin(a * 6)) < 0.24 ? "Jjh" : "jhHY")) }) }
      } },
  },
  // clawed paws in the hands' place: shaggy furry wrist cuff, broad clawed paw, darker claw tips
  hands: {
    wolf: { slot: "hands", is: "a wolf's clawed paws in the hands' place, furred with shaggy cuffs and dark claws", covers: ["the bare hands"],
      draw: (F, B, P) => {
        const { j, R } = F
        j.arms.forEach((A, i) => {
          const far = i === F.farArm, d = unit(A.hand.map((v, e) => v - A.elbow[e])), at = (l) => A.hand.map((v, e) => v + d[e] * l)
          const cuff = j.limb(at(-1.3), at(0.1), R.arm[2] * 1.18, R.hand * 1.05, dim("jhH", far))
          const paw = j.limb(at(-0.2), at(1.95 * R.hand), R.hand * 1.12, R.hand * 1.24, (h) => (h > 0.72 ? (far ? "kJ" : "Jj") : dim("hHY", far)))
          P[`arm${i}`][2] = sdf.union(fieldOf(cuff), fieldOf(paw))
        })
        return {}
      } },
    bear: { slot: "hands", is: "broad, chunky clawed ursine paws with plush furry forearm cuffs and sturdy dark claws", covers: ["the bare hands"],
      draw: (F, B, P) => {
        const { j, R } = F
        j.arms.forEach((A, i) => {
          const far = i === F.farArm, d = unit(A.hand.map((v, e) => v - A.elbow[e])), at = (l) => A.hand.map((v, e) => v + d[e] * l)
          const cuff = j.limb(at(-1.6), at(0.15), R.arm[2] * 1.26, R.hand * 1.2, dim("jhH", far))
          const paw = j.limb(at(-0.15), at(2.05 * R.hand), R.hand * 1.28, R.hand * 1.38, (h) => (h > 0.74 ? (far ? "kJ" : "Jj") : dim("jhHY", far)))
          P[`arm${i}`][2] = sdf.union(fieldOf(cuff), fieldOf(paw))
        })
        return {}
      } },
  },
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
const TABLES = { helm: METALS, hat: HAT_RAMPS, steel: METALS, fit: FITS, wood: WOODS, gem: GEMS, gear: HAT_RAMPS, feet: HAT_RAMPS, belt: HAT_RAMPS, apron: HAT_RAMPS, horns: HORN_RAMPS, wings: WING_RAMPS, visor: GEMS }
// the armor's: a metal, a leather or a cloth (a 4-tone ramp on five keys takes its darkest twice), a fur
const ARMORS = { ...HAT_RAMPS, ...METALS, fur: ["#2a1e16", "#4e3a28", "#7a6044", "#a88a64"], greyfur: ["#26242a", "#48454c", "#757070", "#a49c94"], whitefur: ["#4a4650", "#7c7884", "#b4b0b4", "#e2ddd6"] }
for (const s of ["mail", "plate", "shoulders", "arms", "hands", "shins"]) TABLES[s] = ARMORS
const cross = (u, v) => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]
const UP = [0, 0, 1]
// metal by how it faces (the helmets' bands): the top lit, a dark band turning from the sky, the lower turn lighter again
const STEEL_BY = pure({ STEEL }, (q, n) => (n[2] > 0.74 ? STEEL.slice(2) : n[2] > 0.34 ? STEEL.slice(1, 3) : n[2] > -0.05 ? STEEL.slice(0, 2) : STEEL.slice(1, 3)))
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
  const dist = asPure({ ox: fr.o[0], oy: fr.o[1], oz: fr.o[2], Ux: fr.U[0], Uy: fr.U[1], Uz: fr.U[2], Ex: fr.E[0], Ey: fr.E[1], Ez: fr.E[2], Nx: fr.N[0], Ny: fr.N[1], Nz: fr.N[2], d }, (x, y, z) => {
    const rx = x - ox, ry = y - oy, rz = z - oz
    return d(rx * Ux + ry * Uy + rz * Uz, rx * Ex + ry * Ey + rz * Ez, rx * Nx + ry * Ny + rz * Nz)
  })
  return sdf.field(dist, [0, 1, 2].map((e) => Math.min(...pts.map((q) => q[e])) - 0.5), [0, 1, 2].map((e) => Math.max(...pts.map((q) => q[e])) + 0.5))
    .paint((q, n) => paint(...fr.tsw(q), n))
}
// the signed distance to a polygon of [t, s] (inside below 0)
const inPoly = pure({}, (P, u, v) => {
  let d = Infinity, inside = false
  for (let i = 0, k = P.length - 1; i < P.length; k = i++) {
    const a0 = P[k][0], a1 = P[k][1], b0 = P[i][0], b1 = P[i][1], e0 = b0 - a0, e1 = b1 - a1, w0 = u - a0, w1 = v - a1, h = Math.max(0, Math.min(1, (w0 * e0 + w1 * e1) / (e0 * e0 + e1 * e1)))
    d = Math.min(d, Math.hypot(w0 - e0 * h, w1 - e1 * h))
    if ((a1 > v) !== (b1 > v) && u < (e0 * (v - a1)) / e1 + a0) inside = !inside
  }
  return inside ? -d : d
})
// a flat thing cut to an outline in its frame, th px either side of its plane (`bow`: its face bowed out that far at
// its middle across)
const slab = (fr, poly, th, paint, bow = 0) => {
  const ts = poly.map((q) => q[0]), ss = poly.map((q) => q[1]), w = Math.max(...ss.map(Math.abs)) || 1
  return inFrame(fr, [Math.min(...ts), Math.max(...ts)], [Math.min(...ss), Math.max(...ss)], [Math.min(-th, bow - th), Math.max(th, bow + th)], pure({ poly, th, bow, w, inPoly }, (t, s, q) => Math.max(inPoly(poly, t, s), Math.abs(q - bow * (1 - (s / w) ** 2)) - th)), paint)
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
// In motion (a walk), each grip keeps a share of the arm's swing (the hand's way from its rest, the idle's [0, ±1, -7]),
// given to the thing as `swing`: a blade or a mace low at the side swings with the arm, its point with the forearm; a
// staff or a spear goes as a walking staff, the hand forward with it, its foot stepping with the foot across from the
// hand (on the ground as it is planted, lifted and swung through as it steps); a bow by its grip a little; a shield on
// the forearm hardly (it guards); a lantern swings from the fist, its body a frame behind it. A thing held in both hands
// (`carry`: the woodcutter's axe off its rest) is carried on one line in both (rig3d's grip), its ends by the body.
// The fighting moves (below: fightMove) put each hand where their frame says, the thing on it by the frame's `hold`, and
// set the anchors a game reads in their `draw`, as the traveler's cast sets its "hand".
const SWING = { low: 0.4, upright: 0.55, bow: 0.4, shield: 0.25, hang: 0.6, rest: 0 }
const REST = [[0, -1, -7], [0, 1, -7]]
const gripMove = (M, W) => {
  const g = [W.off?.grip, W.held?.grip]
  if (!g[0] && !g[1]) return M
  const carry = [W.off?.carry, W.held?.carry].find(Boolean)
  return { ...M, pose: (i, h) => {
    const p = M.pose(i, h), at = (k) => [GRIPS[g[k]][0], (k ? 1 : -1) * GRIPS[g[k]][1], GRIPS[g[k]][2]], d = p.hands.map((q, k) => q.map((v, e) => v - REST[k][e]))
    // (still: the grips as they stand)
    if (!d.some((q) => q.some((v) => v))) return { ...p, hands: p.hands.map((q, k) => (g[k] ? at(k) : q)) }
    // (a walking staff's hand follows its foot half the way: the shaft leans half as much, its foot still planted)
    const swing = d.map((q, k) => q.map((v, e) => v * (g[k] ? SWING[g[k]] : 1) + (g[k] === "upright" && e === 0 ? 0.5 * p.feet[1 - k][0] : 0)))
    return { ...p, swing, hands: p.hands.map((q, k) => (g[k] ? at(k).map((v, e) => v + swing[k][e]) : q)), ...(carry ? { grip: carry } : {}) }
  } }
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
const SKIP = { hip: /^(arm|sleeve|coatarm|mailarm|pauldron|cloak|tail)/, back: /^(arm|sleeve|coatarm|mailarm|tail)/ }
// a strap over the outermost garment round the trunk (a cloak's at its sides and back, where it covers), where keep(a,
// z) says (a band across the chest from a shoulder, two over the shoulders)
const strap = (F, W, keep) => {
  const n0 = 0.7 + Math.max(1, W.over ? (typeof W.over.n === "function" ? W.over.n(W) : W.over.n ?? 2.5 + lift(W)) : 0, W.apron ? W.apron.n ?? 3.5 : 0, W.mane ? 3 : 0, outerOf(W)), z0 = F.waist - 1.2, z1 = F.top + 0.3
  return F.wrap(z0, z1, pure({ hasCloak: !!W.cloak, n0 }, (z, a) => (hasCloak && Math.abs(a) > 1.3 ? Math.max(n0, 4.7) : n0)), { keep: asPure({ keep, z0, dz: z1 - z0 }, (h, a) => keep(a, z0 + h * dz)), paint: (h, a, out) => (out ? GEAR.slice(1) : GEAR[0]) })
}
// a blade: the grip through the fist along U, the pommel over it, the guard across, the blade to its point (its edge
// toward E lit: a blade's one light)
const blade = (fr, h, L, bw, guard, tip, X) => {
  const t0 = 1.1 * h + 0.25, tp = -(1.1 * h + 0.45)
  // (its anchors for a fighting move's draw: the point, the hit point two thirds out, the steel's span from the fist)
  if (X) Object.assign(X, { tip: fr.at(t0 + L), hit: fr.at(t0 + 0.7 * L), U: fr.U, span: [t0 + 0.4 * L, t0 + L] })
  return [rod(fr, tp, t0, 0.42, 0.42, () => GEAR.slice(0, 3)), sdf.sphere(0.6).at(fr.at(tp - 0.35)).mat(FIT), sdf.capsule(fr.at(t0, -guard), fr.at(t0, guard), 0.45).mat(FIT),
    slab(fr, [[t0, -bw], [t0 + L - tip * bw, -bw], [t0 + L, 0], [t0 + L - tip * bw, bw], [t0, bw]], 0.3, (t, s) => (s > bw - 0.55 ? STEEL[3] : STEEL.slice(0, 3)))]
}
// the body's measures to each thing's (px): the sword's blade 1.45 arms (about 0.3 of its bearer's height on every body:
// a dwarf's a real sword for him, not shortened to clear the ground: its low hold tilts it forward instead)
const swordLen = (M) => 1.45 * M.arm
// The sword, drawn to read as one at 8-15 px of blade in a 34 px figure's hand. What carries it there: the cross of the
// guard and the blade (the guard a bar a px thick standing out two px and more past the blade on both sides, in the
// fittings' warm metal against the steel's cool); the pommel a knob past the fist, the grip between them dark, wrapped a
// band a px; the blade straight, two px wide at the guard, narrowing toward its point, its edge's light along one side and
// its flat's tone beside it (flat to the eye a lit plate; edge on a thin bright line). No fuller: it needs a px of flat
// between two edges, three px, and three px is a cleaver at this length. Its frame (frame()): t from the fist's middle
// toward the point, s across to its edges, w through its flat.
// (the hilt: the guard at t0, the grip from tp to it, the pommel past tp; its parts each its own tones: the fittings' metal
// lit on top, the leather's wrap its dark and its mid tone by turns)
const hilt = (fr, h, t0, tp) => {
  const gl = 1.25 * h + 1, wrap = (t) => (Math.floor((t - tp) * 1.3) % 2 ? GEAR.slice(0, 2) : GEAR.slice(1, 3))
  return [sdf.capsule(fr.at(t0, -gl), fr.at(t0, gl), 0.6).mat(FIT), ...[-1, 1].map((s) => sdf.sphere(0.66).at(fr.at(t0 - 0.12, s * gl)).mat(FIT)),
    rod(fr, tp, t0, 0.5, 0.45, wrap), sdf.sphere(0.82).at(fr.at(tp - 0.6)).mat(FIT)]
}
// (the blade: bw its half-width at the guard, narrowing to 0.75 of it where the point begins, the point three times that
// long; a lens across, thin at its edges. Its tones in bands along it, each its own (a tone stepped by the light across a
// lens two px wide breaks into speckle, and so do three bands in two px): its half toward E the edge's light (the edge
// that leads a swing; forward, held low), the other half the flat's mid tone (not its dark: a dark flat is a dark bar);
// an edge seen end on its light; its glint two px of the edge's light a third of the way out, placed by rule, not by the
// light's mirror: on a flat edge that would be all of it or none)
const swordBlade = (fr, t0, L, bw) => {
  const b1 = 0.75 * bw, tp = t0 + L - 3 * b1, half = (t) => (t < tp ? bw + ((b1 - bw) * (t - t0)) / (tp - t0) : (b1 * (t0 + L - t)) / (t0 + L - tp))
  const P = [[t0, -bw], [tp, -b1], [t0 + L, 0], [tp, b1], [t0, bw]]
  return inFrame(fr, [t0, t0 + L], [-bw, bw], [-0.4, 0.4], pure({ P, bw, inPoly }, (t, s, w) => Math.max(inPoly(P, t, s), Math.abs(w) - 0.36 * (1 - 0.5 * (s / bw) ** 2))), (t, s, w, n) => {
    const e = half(t)
    const lit = Math.abs(dot3(n, fr.E)) > 0.6 || s > Math.max(-0.1, e - 1)
    return lit && Math.abs(t - t0 - 0.3 * L) < 0.8 ? KEYS.steel[4] : lit ? STEEL[3] : STEEL[2]
  })
}
// (low: point down and a little forward; swung, its point turned with the forearm, the hand's way forward over the arm;
// a thing whose point would reach the ground from the hand (`reach`, its point's way from the fist) tilted further
// forward until it clears it by a px and a half)
const LOW = (X, reach) => {
  const fw = X.sw ? Math.tan(Math.atan(0.42) + (0.5 * X.sw[0]) / X.M.arm) : 0.42, least = reach ? Math.acos(Math.min(1, Math.max(0, (X.G[2] - 1.4) / reach))) : 0
  return frame(X.G, toward(X.j, least > Math.atan(fw) ? Math.tan(least) : fw, 0.1, -1, X.sd), X.j.f)
}
// (upright: through the fist, leaning out at the top as a hand at rest holds it, its foot on the ground a little in from
// the fist: a spear held in the near hand crosses the cheek in a front diagonal, not the middle of the face; walking, its
// foot where the foot across from the hand is, forward and up, and the shaft from there through the fist)
const UPRIGHT = (X, E) => {
  const U = toward(X.j, -0.05, 0.12, 1, X.sd), k = X.G[2] / U[2], foot = X.G.map((v, e) => v - U[e] * k)
  if (!X.step) return frame(foot, U, E)
  const at = foot.map((v, e) => v + X.j.f[e] * X.step[0] + (e === 2 ? X.step[1] : 0))
  return frame(at, unit(X.G.map((v, e) => v - at[e])), E)
}
// In a fighting move (FIGHT, below) the pose says how each hand holds its thing (`hold`): a blade's, a mace's, a staff's or
// a spear's way from the fist (`aim` [forward, out, up] in the shoulders' frame, out to the hand's side; a spear held at
// `at` of its length from its butt), a shield's face, a bow's draw and its arrow; a two-handed thing on rig3d's grip,
// its haft through both fists. Without one, each is held as it stands and walks.
// (an axe's bit: toward where the blow goes, the mark the figure faces (`f`, the head's way): at it while held, raised and
// recovered; down on it, a little ahead, while it strikes and is held in the cut. Square to the haft it turns with the
// haft and never flips: the chop keeps its haft from pointing at the mark or the ground)
const blowWay = (f, blow) => (blow === "down" ? [f[0] * 0.15, f[1] * 0.15, -1] : f)
const wayOf = (j, [fw, out, u], sd) => unit([0, 1, 2].map((e) => j.sh.f[e] * fw + j.sh.r[e] * out * sd + UP[e] * u))
// (its edge: in a swing, along the way it travels (across its `plane`, the ways it swings between); else forward, or up
// when it points forward)
const AIMED = (X) => {
  const U = wayOf(X.j, X.hold.aim, X.sd), P = X.hold.plane?.map((a) => wayOf(X.j, a, X.sd))
  return frame(X.G, U, P ? cross(cross(P[0], P[1]), U) : Math.abs(dot3(U, X.j.sh.f)) > 0.8 ? UP : X.j.sh.f)
}
// (a shield clearance offset along its face normal N from forearm center c: clears elbow, wrist, sleeve/bell/bracer,
// gauntlet cuff and full extended hand tip in stand, walk and combat poses on every body — preventing hand/sleeve clipping)
const onArm = (X, N, c) => {
  const { F, A, W } = X, d = unit(A.hand.map((v, e) => v - A.elbow[e]))
  const handTip = A.hand.map((v, e) => v + d[e] * (W.hands ? 1.85 : 1.7) * F.R.hand)
  const armR = F.R.arm[1] + Math.max(W.arms ? 3.4 * TL : 2 * TL, W.torso?.bell ?? 0)
  const handR = F.R.hand * (W.hands ? 1.15 : 1.0) + (W.hands ? 0.3 : 0)
  const proj = (q, r) => dot3(q.map((v, e) => v - c[e]), N) + r
  return Math.max(F.R.arm[1] + 0.85, proj(A.elbow, armR), proj(A.hand, Math.max(armR, handR)), proj(handTip, handR)) + 0.55
}
// (a thing on the grip's line: from the off fist to the main one, its origin `back` px behind the off fist)
const ALONG = (X, back, E) => { const f0 = fistOf(X.F, X.j.arms[0]), U = unit(fistOf(X.F, X.j.arms[1]).map((v, e) => v - f0[e])); return frame(f0.map((v, e) => v - U[e] * back), U, E) }
// a shaft upright from the ground through the fist: its paint by t (the height), ferrules at its ends when `ends`
const shaft = (fr, L, r, ends) => rod(fr, 0, L, r, r, (t) => (ends && (t < 1 || t > L - 1) ? FIT : Math.floor(t / 2.6) % 3 === 1 ? WOOD.slice(0, 3) : WOOD))
const THINGS = {
  // ---- blades
  sword: { slots: ["held", "off"], hands: 1, grip: "low", colors: { steel: "steel", fit: "bronze", gear: "brown" }, materials: "steel, its fittings, a leather grip",
    size: "the blade 1.45 times the arm (the shoulder to the fist), about 0.3 of its bearer's height on every body; held low it tilts forward as far as it must to clear the ground",
    is: "an arming sword: a straight double-edged blade tapering to a point, a cross guard, a wrapped leather grip, a round pommel",
    // (its anchors as the blade's were: the point, the hit point, the steel's span from the fist)
    make: (X) => {
      const h = X.M.hand, t0 = 1.1 * h + 0.25, L = swordLen(X.M), fr = X.hold ? AIMED(X) : LOW(X, t0 + L)
      Object.assign(X, { tip: fr.at(t0 + L), hit: fr.at(t0 + 0.7 * L), U: fr.U, span: [t0 + 0.4 * L, t0 + L] })
      return [...hilt(fr, h, t0 + 0.45, -(1.1 * h + 0.45)), swordBlade(fr, t0, L, 0.85 + 0.2 * h)]
    } },
  shortblade: { slots: ["held", "off"], hands: 1, grip: "low", colors: { steel: "steel", fit: "iron", gear: "black" }, materials: "steel, its fittings, a leather grip",
    size: "the blade 0.8 times the arm", is: "a short sword or a long knife: a broad blade to a point, a short guard",
    make: (X) => blade(X.hold ? AIMED(X) : LOW(X), X.M.hand, 0.8 * X.M.arm, 0.75 + 0.12 * X.M.hand, 0.9 * X.M.hand + 0.2, 1.9, X) },
  // ---- hafted
  axe: { slots: ["held"], hands: 2, grip: "rest", colors: { steel: "iron", wood: "ash" }, materials: "an iron head, a wooden haft",
    size: "the haft as long as the hand is high over the ground (its head rests there); the head by the hand", why2: "a woodcutter's axe swings in both hands",
    is: "a woodcutter's axe: a long haft, a wedge of a head, its bit flaring to a curved edge, a flat poll behind; resting its head on the ground by the foot",
    // (walking, off its rest: carried in both hands up across the body, the haft from low at the left hip to the right
    // shoulder's front, the head past the main hand, its bit forward)
    carry: { from: [5.6, -2.8, 13.2], to: [5.2, 3, 20.8], at: [0.1, 0.72] },
    make: (X) => {
      const { M, G } = X, g = X.j.grip, k = 0.85 + 0.3 * M.hand
      let fr, c
      // (fighting: on the grip's line through both fists, its butt just past the off fist, its head where it rests; its bit
      // toward where the blow goes (blowWay): at the mark, down on it as it strikes)
      // (swung in the main hand alone (a body that can't grip it before its trunk): along that hand's aim)
      if (X.hold?.aim) { c = M.hz - 0.5 - 0.6 * M.hand; const U = wayOf(X.j, X.hold.aim, X.sd); fr = frame(X.G.map((v, e) => v - U[e] * 0.6 * M.hand), U, blowWay(X.j.hd.f, X.hold.blow)) }
      else if (X.hold) { c = M.hz - 0.5 - 0.6 * M.hand; fr = ALONG(X, 0.6 * M.hand, blowWay(X.j.hd.f, X.hold.blow)) }
      // (carried: the haft through both fists, its butt and head where the carry's line puts them past them)
      else if (g) {
        const [a0, a1] = THINGS.axe.carry.at, f0 = fistOf(X.F, X.j.arms[0]), f1 = fistOf(X.F, X.j.arms[1]), d = f1.map((v, e) => v - f0[e]), n = Math.hypot(...d) / (a1 - a0)
        fr = frame(f0.map((v, e) => v - (d[e] * a0) / (a1 - a0)), d, X.j.f); c = n + 1.2 * k
      }
      else { fr = frame(G, toward(X.j, 0.2, 0.25, -1, X.sd), toward(X.j, 1, 0.6, 0, X.sd)); const te = (G[2] - 0.2) / -fr.U[2]; c = te - 1.1 * k }
      const tg = fr.tsw(G)[0]
      Object.assign(X, { tip: fr.at(c - 0.6 * k, 3.45 * k), hit: fr.at(c - 0.6 * k, 3.45 * k), U: fr.U, span: [c - 2.5 * k - tg, c + 1.3 * k - tg] })
      const BIT = [[c - 0.7 * k, 0.4], [c - 2.5 * k, 3.4 * k], [c + 1.3 * k, 3.5 * k], [c + 0.5 * k, 0.4]], POLL = [[c - 1.1 * k, -0.4], [c - 1 * k, -1.5 * k], [c + 0.5 * k, -1.5 * k], [c + 0.5 * k, -0.4]]
      return [rod(fr, -(X.hold ? 0.6 : 1.2) * M.hand, c + 0.6, 0.45 + 0.1 * M.hand, 0.5 + 0.1 * M.hand, (t) => (Math.floor(t / 2.6) % 3 === 1 ? WOOD.slice(0, 3) : WOOD)),
        slab(fr, BIT, 0.45, (t, s) => (s > 2.7 * k ? STEEL[3] : STEEL.slice(0, 3))), slab(fr, POLL, 0.55, () => STEEL.slice(0, 2))]
    } },
  mace: { slots: ["held", "off"], hands: 1, grip: "low", colors: { steel: "iron", wood: "oak", fit: "iron" }, materials: "an iron head, a wooden haft, an iron cap",
    size: "the haft 1.15 times the arm; the head by the hand", is: "a flanged mace: a short haft, a round iron head with four flanges",
    make: (X) => {
      const { M } = X, fr = X.hold ? AIMED(X) : LOW(X), L = 1.15 * M.arm, hr = 0.85 + 0.3 * M.hand, fr2 = frame(fr.o, fr.U, fr.N)
      Object.assign(X, { tip: fr.at(L), hit: fr.at(L), U: fr.U, span: [L - 1.5 * hr, L + hr] })
      const flange = (f) => slab(f, [[L - 1.5 * hr, 0], [L - 0.2 * hr, 1.55 * hr], [L + 0.9 * hr, 0], [L - 0.2 * hr, -1.55 * hr]], 0.3, (t, s, w, n) => STEEL_BY(0, n))
      return [rod(fr, -1.2 * M.hand, L, 0.45, 0.5, (t) => (t < -0.7 * M.hand ? FIT : WOOD)), sdf.sphere(hr).at(fr.at(L)).paint(STEEL_BY), flange(fr), flange(fr2)]
    } },
  spear: { slots: ["held"], hands: 1, grip: "upright", colors: { steel: "steel", wood: "ash", fit: "iron", fletch: "red" }, materials: "a beveled steel leaf blade, an iron socket collar, a cloth tassel, a wooden shaft",
    size: "1.25 times its bearer's height (the dwarf's 34 px, the tall one's 56), the shaft as thick as the hand closes on", is: "a spear: a broad beveled leaf blade with a central spine, an iron collar and cloth tassel, a long shaft",
    make: (X) => {
      const { M, j } = X, L = 1.25 * M.h, hl = 4.1 + 0.75 * M.hand, hw = 1.2 + 0.18 * M.hand, rs = 0.42 + 0.15 * M.hand
      // (fighting: levelled through the fist, held `at` of its length from the butt)
      const fr = X.hold ? (() => { const U = wayOf(j, X.hold.aim, X.sd); return frame(X.G.map((v, e) => v - U[e] * X.hold.at * L), U, j.sh.r) })() : UPRIGHT(X, j.r.map((v, e) => v + j.f[e] * 0.6))
      Object.assign(X, { tip: fr.at(L), hit: fr.at(L - 0.45 * hl) })
      const collar = rod(fr, L - hl - 1.15, L - hl + 0.25, rs + 0.22, rs + 0.14, () => FIT)
      const t0 = fr.at(L - hl - 0.9, 0.35), t1 = hung(X.F, [t0[0] - j.f[0] * 0.8 + fr.E[0] * 0.6, t0[1] - j.f[1] * 0.8 + fr.E[1] * 0.6, t0[2] - 2.3], 0.9)
      const tassel = sdf.capsule(t0, t1, 0.45, 0.22).mat(KEYS.fletch)
      return [rod(fr, 0, L - hl - 0.9, rs, rs, (t) => (t < 0.95 ? FIT : Math.floor(t / 2.6) % 3 === 1 ? WOOD.slice(0, 3) : WOOD)), collar, tassel,
        slab(fr, [[L - hl, -0.45], [L - hl * 0.62, -hw], [L, 0], [L - hl * 0.62, hw], [L - hl, 0.45]], 0.34,
          (t, s) => (Math.abs(s) < 0.24 && t > L - hl * 0.78 && t < L - 0.4 ? KEYS.steel[4] : s > 0.1 ? STEEL[3] : STEEL[2]))]
    } },
  quarterstaff: { slots: ["held"], hands: 2, grip: "upright", colors: { wood: "oak", fit: "iron" }, materials: "a wooden staff, iron ferrules", why2: "a quarterstaff is fought with in both hands",
    size: "1.06 times its bearer's height: a little over his head", is: "a quarterstaff: a plain pole shod with iron at both ends, its foot on the ground",
    make: (X) => {
      const L = 1.06 * X.M.h, fr = X.hold ? ALONG(X, (L - Math.hypot(...fistOf(X.F, X.j.arms[1]).map((v, e) => v - fistOf(X.F, X.j.arms[0])[e]))) / 2, X.j.sh.r) : UPRIGHT(X, X.j.r)
      X.tip = fr.at(L)
      return [shaft(fr, L, 0.5 + 0.15 * X.M.hand, true)]
    } },
  magestaff: { slots: ["held"], hands: 1, grip: "upright", colors: { wood: "ebony", fit: "gilt", gem: "azure" }, materials: "a gnarled wooden staff, gilt collar, sculpted crescent finial cradling a glowing gem",
    size: "1.08 times its bearer's height, the gem by the hand", is: "a mage's staff: a gnarled shaft, gilt ferrule and crescent prongs cradling a luminous gem",
    make: (X) => {
      const { M } = X, L = 1.08 * M.h, g = 1.08 + 0.26 * M.hand, r = 0.52 + 0.15 * M.hand
      // (fighting: through the fist along its aim, the fist where it is standing, 0.38 of the way up; in both hands,
      // through both fists, the upper one 0.45 of the way up)
      const both = X.hold?.grip && unit(fistOf(X.F, X.j.arms[1]).map((v, e) => v - fistOf(X.F, X.j.arms[0])[e]))
      const fr = both ? frame(X.G.map((v, e) => v - both[e] * 0.45 * L), both, X.j.sh.r) : X.hold ? (() => { const U = wayOf(X.j, X.hold.aim, X.sd); return frame(X.G.map((v, e) => v - U[e] * 0.38 * L), U, X.j.sh.r) })() : UPRIGHT(X, X.j.r)
      X.tip = X.light = fr.at(L + 1.05 * g)
      const knots = [0, 0.3, 0.55, 0.8, 0.98].map((t, i) => fr.at(t * L, i % 2 ? 0.3 : -0.22))
      const prong = (s) => [fr.at(L - 0.5, s * 0.35), fr.at(L + 0.55 * g, s * 1.55 * g), fr.at(L + 1.95 * g, s * 0.72 * g)]
      const W3 = (t) => (Math.floor(t / 2.1) % 3 === 1 ? WOOD.slice(0, 2) : WOOD)
      return [...knots.slice(1).map((q, i) => sdf.capsule(knots[i], q, r, r * 0.96).paint((p) => W3(fr.tsw(p)[0]))),
        rod(fr, L - 1.5, L - 0.2, r + 0.22, r + 0.28, () => FIT),
        ...[-1, 1].flatMap((s) => { const p = prong(s); return [sdf.capsule(p[0], p[1], r * 0.85, r * 0.68), sdf.capsule(p[1], p[2], r * 0.68, 0.3)].map((f) => f.mat(FIT)) }),
        sdf.sphere(g).at(fr.at(L + 1.05 * g)).paint((q, n) => (n[2] > 0.35 && n[1] < 0.2 ? KEYS.gem[2] : KEYS.gem))]
    } },
  // ---- shooting
  bow: { slots: ["off"], hands: 2, grip: "bow", colors: { wood: "ash", gear: "brown" }, materials: "a wooden bow, a leather grip, a string", why2: "the main hand draws the string",
    whySlot: "a bow is held in the off hand, the main hand draws", size: "1.75 times the hand's height over the ground: held at the side by its grip, its tips clear the ground (the dwarf's a short bow, the tall one's a long bow)",
    is: "a bow: two recurved limbs from a leather-wrapped grip, the string straight between them",
    make: (X) => {
      const { M, j } = X, half = 0.875 * M.hz, H = X.hold
      // (fighting: its face across the arrow's way (from the drawing fist through the bow's grip, or `way`), its limbs
      // bent further as it is drawn, the string to the drawing fist while an arrow is nocked, bowed forward the frame it
      // is loosed; the arrow on the string or in the drawing hand)
      const N = H && fistOf(X.F, j.arms[1]), E = H && (H.arrow === "nock" ? unit(X.G.map((v, e) => v - N[e])) : wayOf(j, H.way, 1)), U0 = H && wayOf(j, H.aim, 1)
      const br = 0.22 * half * (1 + 0.5 * (H?.draw ?? 0)), fr = H ? frame(X.G, unit(U0.map((v, e) => v - E[e] * dot3(U0, E))), E) : frame(X.G, unit([j.f[0] * 0.08, j.f[1] * 0.08, 1]), toward(j, 1, -0.9, 0, X.sd))
      const at = (u) => { const a = Math.abs(u); return fr.at(u * half, br * (1 - u * u) - br + (a > 0.78 ? 0.9 * (a - 0.78) / 0.22 : 0)) }
      const us = [-1, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1], r = (u) => 0.72 - 0.29 * Math.abs(u) + 0.09 * M.hand
      const limb = (t) => (Math.abs(t) < 1.15 * M.hand ? GEAR.slice(0, 3) : Math.abs(t) > 0.88 * half ? WOOD.slice(0, 2) : WOOD)
      const limbs = us.slice(1).map((u, i) => sdf.capsule(at(us[i]), at(u), r(us[i]), r(u)).paint((q) => limb(fr.tsw(q)[0])))
      if (!H) return [...limbs, sdf.capsule(at(-1), at(1), 0.28).mat(STRING)]
      const La = 1.2 * M.arm + 0.6, mid = H.snap ? fr.at(0, -br + 2) : H.arrow === "nock" ? N : undefined
      const string = mid ? [sdf.capsule(at(-1), mid, 0.28), sdf.capsule(mid, at(1), 0.28)].map((f) => f.mat(STRING)) : [sdf.capsule(at(-1), at(1), 0.28).mat(STRING)]
      // (an arrow from its nock along its way: the shaft, the fletching by the nock, a bright steel head)
      const arrow = (n, w) => [sdf.capsule(n.map((v, e) => v - w[e] * 0.4), n.map((v, e) => v + w[e] * (La - 1)), 0.28).mat(WOOD.slice(1)),
        sdf.capsule(n.map((v, e) => v + w[e] * 0.2), n.map((v, e) => v + w[e] * 1.9), 0.55, 0.44).mat(KEYS.fletch), sdf.capsule(n.map((v, e) => v + w[e] * (La - 1.4)), n.map((v, e) => v + w[e] * La), 0.68, 0.16).mat(STEEL.slice(2))]
      const Wa = H.arrow === "hand" && wayOf(j, [-0.25, 0.2, 1], 1), nock = H.arrow === "hand" ? N.map((v, e) => v - Wa[e] * 1.4) : N
      Object.assign(X, { way: E }, H.arrow ? { tip: nock, hit: H.arrow === "nock" ? N.map((v, e) => v + E[e] * La) : undefined } : { hit: X.G.map((v, e) => v + E[e] * 1.5) })
      return [...limbs, ...string, ...(H.arrow === "nock" ? arrow(N, E) : H.arrow === "hand" ? arrow(nock, Wa) : [])]
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
    strap: (F) => pure({ mid: (F.top + F.waist) / 2, half: (F.top - F.waist) / 2 }, (a, z) => Math.abs(z - mid - half * Math.sin(a)) < 0.55) },
  // ---- shields
  roundshield: { slots: ["off"], hands: 1, grip: "shield", colors: { face: "red", fit: "iron", wood: "ash" }, materials: "a painted wooden face with bold quartered heraldry, an iron rim and gleaming boss",
    size: "across 1.1 times the trunk: it covers the side from the shoulder to the hip", is: "a round shield on the forearm: a domed painted face with bold contrast ring, an iron rim and gleaming boss",
    make: (X) => {
      const { M, j, A, F } = X, Nf = X.hold?.face ? wayOf(j, X.hold.face, X.sd) : toward(j, 0.55, 0.85, 0, X.sd), R = 0.55 * M.torso + 0.5, Uf = unit(UP.map((v, e) => v - Nf[e] * Nf[2]))
      const c = lerp(A.elbow, A.hand, 0.45), fr = frame(c.map((v, e) => v + Nf[e] * onArm(X, Nf, c)), Uf, cross(Nf, Uf)), dome = pure({ R }, (t, s) => 0.78 * (1 - Math.min(1, (t * t + s * s) / (R * R))))
      const face = inFrame(fr, [-R, R], [-R, R], [-0.5, 1.35], pure({ R, dome }, (t, s, w) => Math.max(Math.hypot(t, s) - R, Math.abs(w - dome(t, s)) - 0.45)),
        (t, s, w) => { const r = Math.hypot(t, s); return w < dome(t, s) - 0.3 ? WOOD.slice(0, 3) : r > R - 1.05 ? FIT : r > R - 1.55 ? FACE[0] : (t * s > 0 ? FACE.slice(1) : FACE.slice(0, 3)) })
      Object.assign(X, { mid: fr.at(0, 0, 1.2), rim: [fr.at(R, 0), fr.at(-R, 0), fr.at(0, R), fr.at(0, -R)] })
      return [face, sdf.sphere(1.22 + 0.15 * M.hand).at(fr.at(0, 0, 1.15)).paint((q, n) => (n[2] > 0.65 && n[1] < 0 ? KEYS.steel[4] : STEEL_BY(q, n)))]
    } },
  tallshield: { slots: ["off"], hands: 1, grip: "shield", colors: { face: "navy", fit: "steel", wood: "ash" }, materials: "a painted wooden face with bright heraldic cross, a beveled steel rim",
    size: "0.8 times the trunk and thigh tall (the shoulder to the knee), 0.62 of that wide", is: "a tall heater shield on the forearm: bowed across, bright heraldic cross on the face, a steel rim",
    make: (X) => {
      const { M, j, A, F } = X, Nf = X.hold?.face ? wayOf(j, X.hold.face, X.sd) : toward(j, 0.5, 0.87, 0, X.sd), H = 0.8 * (M.torso + M.thigh), w = 0.31 * H, Uf = unit(UP.map((v, e) => v - Nf[e] * Nf[2]))
      const c = lerp(A.elbow, A.hand, 0.5), fr = frame(c.map((v, e) => v + Nf[e] * onArm(X, Nf, c)), Uf, cross(Nf, Uf))
      Object.assign(X, { mid: fr.at(0, 0, 0.95), rim: [fr.at(0.42 * H, 0), fr.at(-0.58 * H, 0), fr.at(0, w), fr.at(0, -w)] })
      const P = [[0.42 * H, -w], [0.42 * H, w], [0.05 * H, w], [-0.2 * H, 0.82 * w], [-0.4 * H, 0.45 * w], [-0.58 * H, 0], [-0.4 * H, -0.45 * w], [-0.2 * H, -0.82 * w], [0.05 * H, -w]]
      return [slab(fr, P, 0.46, (t, s, q) => {
        if (q < 0.9 * (1 - (s / w) ** 2) - 0.3) return WOOD.slice(0, 3)
        if (inPoly(P, t, s) > -0.95) return FIT
        const cross = Math.abs(s) < 0.17 * w || Math.abs(t - 0.12 * H) < 0.08 * H
        const edge = Math.abs(s) < 0.24 * w || Math.abs(t - 0.12 * H) < 0.13 * H
        return cross ? FACE[3] : edge ? FACE[0] : FACE.slice(0, 3)
      }, 0.9)]
    } },
  // ---- modular fantasy wings (back slot: follow spine lean and subtle breath/lag flutter)
  // Both wing types use ~14 deg backward sweep (out 0.97, back 0.24) + gentle backward camber so both near
  // and far wings stay broad, clean, and well-separated from the head across all 8 views (especially SW/SE/NW/NE).
  wings: { slots: ["back"], split: true, colors: { wings: "white" }, materials: "layered avian feathers", excl: ["hooddown"],
    why: "the hood down lies on the upper back where the wings attach", size: "spanning 2.1 times the trunk width, a single sleek arched pair sweeping cleanly from above the shoulders down past the hips",
    is: "sleek single-pair avian/angel wings: slender high-arched crescent silhouette flowing seamlessly into 4 tapered downward-sweeping flight feathers",
    make: (X) => {
      const { M, j, F } = X, sc = 0.48 + 0.52 * (M.torso / TB.torso), back = j.f.map((v) => -v), K = KEYS.wings
      const rootZ = F.top - 0.20 * M.torso, on = onTop(X.P, spineAt(j, rootZ), back, SKIP.back)
      const lag = hung(F, [0, 0, 0], 0.45)
      // Sleek single-pair seraph/eagle crescent [out, up]: slender arched shoulder sweeping smoothly down to a long
      // pointed outermost primary tip, with 3 clearly opened stepped feather notches along the trailing inner edge.
      const MAX_U = 12.8
      const POLY = [
        [0.0, 0.2], [2.2, 5.2], [4.8, 9.2], [7.8, 8.8], [10.6, 5.6], [12.4, 0.4], [12.6, -5.0],
        // Primary 1 (longest sleek crescent outer feather tip)
        [11.4, -10.2], [9.7, -4.8],
        // Primary 2 (stepped tapered flight feather with open V-notch)
        [8.3, -8.8], [6.7, -4.0],
        // Secondary 3 (stepped inner flight feather)
        [5.3, -6.8], [3.8, -2.8],
        // Inner tertial tucking smoothly into the upper-mid back
        [2.4, -4.2], [0.5, -1.6],
      ].map(([u, v]) => [u * sc, v * sc])
      const ts = POLY.map((q) => q[0]), ss = POLY.map((q) => q[1]), tMax = MAX_U * sc
      const out = {}
      for (const sd of [-1, 1]) {
        const o = [on[0] + j.r[0] * sd * 1.15 * sc + back[0] * 0.55 * sc + lag[0] * 0.16, on[1] + j.r[1] * sd * 1.15 * sc + back[1] * 0.55 * sc + lag[1] * 0.16, on[2] + lag[2] * 0.12]
        const U = unit([j.r[0] * sd * 0.97 + back[0] * 0.24 + lag[0] * 0.03, j.r[1] * sd * 0.97 + back[1] * 0.24 + lag[1] * 0.03, lag[2] * 0.02])
        const fr = frame(o, U, UP), bowDir = dot3(fr.N, back) >= 0 ? 1 : -1, bend = 1.15 * sc * bowDir
        const dz = pure({ bend, tMax }, (t) => bend * Math.pow(Math.max(0, Math.min(1, t / tMax)), 1.5))
        const atW = (u, v) => fr.at(u * sc, v * sc, dz(u * sc))
        const th = 0.34 * sc
        // Single sleek feathered crescent: smooth sunlit upper arch flowing into longitudinal feather-vane shading (no horizontal split)
        const blade = inFrame(fr, [Math.min(...ts), Math.max(...ts)], [Math.min(...ss), Math.max(...ss)],
          [Math.min(-th, bend - th), Math.max(th, bend + th)],
          pure({ POLY, dz, th, inPoly }, (t, s, q) => Math.max(inPoly(POLY, t, s), Math.abs(q - dz(t)) - th)),
          (t, s) => {
            const u = t / sc, v = s / sc
            // longitudinal feather vane lines aligned with the 3 trailing-edge notches (u ≈ 3.8, 6.7, 9.7)
            const seam = v < 2.5 && (Math.abs(u - (9.6 + (v + 4.8) * 0.16)) < 0.36
              || Math.abs(u - (6.7 + (v + 4.0) * 0.18)) < 0.36
              || Math.abs(u - (3.8 + (v + 2.8) * 0.18)) < 0.34)
            if (v > 5.4 && u < 9.8) return K.slice(2)
            if (seam) return K.slice(0, 2)
            if (v > 1.8) return K.slice(1)
            if (v < -5.2) return K.slice(0, 3)
            return K
          })
        // Slender leading-edge wing bone blended seamlessly along the upper crescent rim
        const p0 = atW(0.4, 0.6), p1 = atW(4.8, 8.8), p2 = atW(9.8, 6.2), p3 = atW(12.2, 0.2)
        const ridge = sdf.union(
          sdf.capsule(p0, p1, 0.54 * sc, 0.52 * sc),
          sdf.capsule(p1, p2, 0.50 * sc, 0.38 * sc),
          sdf.capsule(p2, p3, 0.36 * sc, 0.20 * sc),
          { smooth: 0.30 * sc },
        ).mat(K.slice(1))
        out[sd < 0 ? "wingL" : "wingR"] = sdf.union(blade, ridge, { smooth: 0.22 * sc })
      }
      return out
    } },
  batwings: { slots: ["back"], split: true, colors: { wings: "plum", horns: "obsidian" }, materials: "taut leathery wing membrane stretched between clawed bony finger struts", excl: ["hooddown"],
    why: "the hood down lies on the upper back where the wings attach", size: "spanning 2.6 times the trunk width with towering clawed carpal peaks and deep concave scalloped membrane bays",
    is: "sculpted demon/bat wings: high arched bony leading arm with hooked thumb claw, curved radial finger ribs sitting proud on thin concave-scalloped leathery webbing",
    make: (X) => {
      const { M, j, F } = X, sc = 0.48 + 0.52 * (M.torso / TB.torso), back = j.f.map((v) => -v), K = KEYS.wings, B = KEYS.horns
      const rootZ = F.top - 0.20 * M.torso, on = onTop(X.P, spineAt(j, rootZ), back, SKIP.back)
      const lag = hung(F, [0, 0, 0], 0.45)
      // Deep concave-scalloped demon/bat membrane polygon [out, up] with 3 vaulted lower bays
      const MAX_U = 15.2
      const MEM = [
        [0.4, 0.2], [2.7, 4.9], [5.4, 9.4], [9.0, 8.2], [12.4, 6.4], [14.2, 1.7], [15.0, -3.5],
        // Deep concave bay 1 (T1 -> T2)
        [13.8, -1.1], [12.4, -0.4], [11.2, -2.3], [10.2, -6.5],
        // Deep concave bay 2 (T2 -> T3)
        [9.0, -2.9], [7.8, -1.5], [6.7, -2.4], [5.8, -5.2],
        // Deep concave bay 3 (T3 -> hip anchor)
        [4.5, -2.1], [3.3, -1.3], [2.0, -1.8], [0.8, -3.0],
      ].map(([u, v]) => [u * sc, v * sc])
      const ts = MEM.map((q) => q[0]), ss = MEM.map((q) => q[1]), tMax = MAX_U * sc
      const out = {}
      for (const sd of [-1, 1]) {
        const o = [on[0] + j.r[0] * sd * 1.2 * sc + back[0] * 0.55 * sc + lag[0] * 0.16, on[1] + j.r[1] * sd * 1.2 * sc + back[1] * 0.55 * sc + lag[1] * 0.16, on[2] + lag[2] * 0.12]
        const U = unit([j.r[0] * sd * 0.97 + back[0] * 0.24 + lag[0] * 0.03, j.r[1] * sd * 0.97 + back[1] * 0.24 + lag[1] * 0.03, lag[2] * 0.02])
        const fr = frame(o, U, UP), bowDir = dot3(fr.N, back) >= 0 ? 1 : -1, bend = 1.25 * sc * bowDir
        const dz = pure({ bend, tMax }, (t) => bend * Math.pow(Math.max(0, Math.min(1, t / tMax)), 1.5))
        const atW = (u, v, dn = 0) => fr.at(u * sc, v * sc, dz(u * sc) + dn * sc * bowDir)
        const th = 0.30 * sc
        const web = inFrame(fr, [Math.min(...ts), Math.max(...ts)], [Math.min(...ss), Math.max(...ss)],
          [Math.min(-th, bend - th), Math.max(th, bend + th)],
          pure({ MEM, dz, th, inPoly }, (t, s, q) => Math.max(inPoly(MEM, t, s), Math.abs(q - dz(t)) - th)),
          (t, s) => {
            const u = t / sc, v = s / sc, edge = inPoly(MEM, t, s)
            if (edge > -0.95 * sc && v < 1.2) return K.slice(0, 2)
            if (v > 2.2 && v < 7.2 && u > 3.2 && u < 12.6) return K.slice(2)
            return v > -1.0 ? K.slice(1) : K.slice(0, 3)
          })
        // Sculpted bony leading arm, hooked thumb claw, and curved 2-segment radial finger struts riding proud on BOTH faces
        const a = atW(0.4, 0.2), b = atW(5.4, 9.4), c = atW(12.4, 6.4)
        const claw = atW(4.6, 12.0, -0.35)
        const m1 = atW(14.0, 1.6), t1 = atW(15.3, -4.0)
        const m2 = atW(8.1, 1.6), t2 = atW(10.3, -6.9)
        const m3 = atW(5.6, 2.0), t3 = atW(5.8, -5.5)
        const bones = sdf.union(
          sdf.capsule(a, b, 0.84 * sc, 0.68 * sc),
          sdf.capsule(b, claw, 0.54 * sc, 0.14 * sc),
          sdf.capsule(b, c, 0.66 * sc, 0.46 * sc),
          sdf.capsule(c, m1, 0.46 * sc, 0.34 * sc),
          sdf.capsule(m1, t1, 0.34 * sc, 0.16 * sc),
          sdf.capsule(b, m2, 0.52 * sc, 0.42 * sc),
          sdf.capsule(m2, t2, 0.42 * sc, 0.18 * sc),
          sdf.capsule(b, m3, 0.50 * sc, 0.40 * sc),
          sdf.capsule(m3, t3, 0.40 * sc, 0.18 * sc),
          { smooth: 0.22 * sc },
        ).paint((q) => (fr.tsw(q)[1] > 7.4 * sc ? B : B.slice(0, 3)))
        out[sd < 0 ? "wingL" : "wingR"] = sdf.union(web, bones)
      }
      return out
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
    strap: (F, M) => pure({ zMin: F.top - 0.48 * M.torso }, (a, z) => Math.abs(Math.abs(a) - 0.62) < 0.17 && z > zMin) },
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
      const { M, j, F, W } = X, a = -1.3, way = unit([0, 1].map((e) => j.f[e] * Math.cos(a) + j.r[e] * Math.sin(a)).concat(0)), L = swordLen(M) + 0.6, bw = 1.2 + 0.2 * M.hand
      const on = onTop(X.P, [j.pelvis[0], j.pelvis[1], F.waist - 0.3], way, SKIP.hip), fr = frame(on.map((v, e) => v + way[e] * 0.55), [-j.f[0] * 0.55 + way[0] * 0.15, -j.f[1] * 0.55 + way[1] * 0.15, -1], j.f)
      const drawn = [W.held, W.off].some((q) => q?.key === "sword")
      // (the sheath the sword's: leather narrowing as its blade does, its throat a locket of the fittings' metal
      // with a dark row under it, its tip a chape; the sword's hilt standing out of its mouth, the guard on the locket)
      const sheath = slab(fr, [[0, -bw], [L - 2, -bw * 0.72], [L - 0.5, -0.45], [L, 0], [L - 0.5, 0.45], [L - 2, bw * 0.72], [0, bw]], 0.5,
        (t, s, w, n) => (drawn && t < 0.3 && dot3(n, fr.U) < -0.5 ? STEEL[0] : t < 1.1 || t > L - 1.8 ? FIT : t < 1.6 ? GEAR[0] : GEAR.slice(0, 3)))
      if (drawn) return [sheath]
      const h = M.hand, t0 = -0.6
      return [sheath, ...hilt(fr, h, t0, t0 - 2.2 * h - 1.15)]
    } },
  lantern: { slots: ["held", "off"], hands: 1, grip: "hang", colors: { fit: "iron" }, materials: "an iron frame, glass lit from within", size: "by the hand: 3.4 hands tall",
    is: "a lantern hung from the fist by its ring: a round glass lit from within, the flame's light a band across its middle, two bars of its iron frame, a cap and a plate",
    make: (X) => {
      // (round: its glass one lit pane all round, the flame's light a band across its middle, two bars of the frame down
      // it, a cap over it and a plate under it; the ring through the fist)
      // (swinging: its body a frame behind the fist, the ring from the fist to its cap)
      const { M, j, G: G0 } = X, r = 1.1 * M.hand + 0.5, h = 3.4 * M.hand + 1.4, top = G0[2] - 1.2, z0 = top - 0.9 - h, head = Math.atan2(j.f[0], j.f[1]), sw = hung(X.F, [0, 0, 0], 0.8), G = [G0[0] + sw[0], G0[1] + sw[1], G0[2]]
      const glass = sdf.capsule([G[0], G[1], z0 + r], [G[0], G[1], z0 + h - r], r).paint((q) => {
        const a = Math.atan2(q[0] - G[0], q[1] - G[1]) - head, bar = [0.8, -2.35].some((b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) < 0.28)
        return bar ? FIT.slice(0, 2) : Math.abs(q[2] - z0 - h / 2) < 0.6 ? FLAME : GLOW })
      return [sdf.capsule(G0, [G[0], G[1], top], 0.3).mat(FIT), sdf.cone(r + 0.5, 1.1, 0.35).mat(FIT).at(G[0], G[1], top - 1), sdf.cylinder(r + 0.35, 0.5).mat(FIT).at(G[0], G[1], z0), glass]
    } },
}
for (const [k, P] of Object.entries(THINGS)) Object.assign(P, { key: k, slot: P.slots[0], hands: P.hands ?? 0, fits: { body: Object.keys(BODIES) } })
const THING_SLOTS = ["held", "off", "hip", "back"]
// what kit.random gives a hand and a back: a few kinds of people's (a swordsman, an archer, a spearman, a woodcutter, one
// with a staff, a traveler), not the slots each drawn alone (a lantern, a mace and a quiver)
const LOADOUTS = [{ held: "sword", off: "roundshield", hip: "scabbard" }, { held: "sword", hip: "scabbard" }, { held: "sword", off: "tallshield", hip: "scabbard" }, { off: "bow", back: "quiver", hip: "pouch" },
  { held: "spear", off: "tallshield" }, { held: "spear", back: "pack" }, { held: "axe", hip: "pouch" }, { held: "mace", off: "roundshield" }, { held: "quarterstaff", back: "pack" },
  { held: "magestaff", hip: "pouch" }, { held: "magestaff", off: "lantern" }, { back: "pack", off: "lantern", hip: "pouch" }, { held: "shortblade", hip: "pouch" }, { held: "shortblade", off: "lantern" }]
// (a fighting weapon on our side of the trunk, its fist or its point under what the trunk wears in the picture (the
// clearance can't keep a fist out of a deep breastplate and a tabard every frame): it, its forearm and its fist drawn
// over the trunk's pieces anyway, as the paper dolls stack an arm's group over every worn piece where it is in front:
// moved toward us along the view, so the picture keeps them where they are. Beyond the trunk it stays under the body,
// and nothing goes over the head)
const toUs = (j, n) => { const o = j.depth([0, 0, 0]), V = [0, 1, 2].map((e) => j.depth([0, 1, 2].map((k) => (k === e ? 1 : 0))) - o); return V.map((v) => (v * n) / dot3(V, V)) }
const overBody = (F, W, B, G, tip = G, k = 1, pts) => {
  const { j } = F, w = wornR(W, B), hs = j.screen(j.head)
  // (over where it is on our side of the trunk (nearer us than the spine at its height), whichever arm holds it; under
  // where it is beyond it: a cut across the front seen from behind passes behind the body)
  const c = pts?.[0] ?? G
  if (j.depth(c) <= j.depth(spineAt(j, c[2]))) return undefined
  // (a shield: by its rim, wherever it lies; a weapon: by its fist and its point, its fist inside the body's width)
  const at = pts ?? [G, tip], n = j.depth(j.chest) + Math.max(w.f, w.s) + 1.5 - Math.min(...at.map((q) => j.depth(q))), inside = pts || Math.abs(j.screen(G)[0] - j.screen(j.chest)[0]) < w.s + F.R.hand
  if (n <= 0 || !inside || G[2] > j.arms[k].sh[2] || (pts ?? [0.5, 0.75, 1].map((t) => lerp(G, tip, t))).some((q) => Math.hypot(...j.screen(q).map((v, e) => v - hs[e])) < F.R.head + 1)) return undefined
  return toUs(j, n)
}
// what it holds and carries, made on the joints after what it wears, which the hip's and the back's lie on
const carried = (F, W, B, P, p = {}) => {
  const { j } = F, M = measure(B), out = {}
  for (const s of THING_SLOTS) {
    const T = W[s]
    if (!T) continue
    // (in motion: the hand's swing, and the foot across from it [forward, up], which a walking staff's foot keeps to)
    const i = s === "off" ? 0 : 1, X = { j, F, W, B, M, P, s, sd: i ? 1 : -1, A: j.arms[i], G: fistOf(F, j.arms[i]),
      ...(p.swing ? { sw: p.swing[i], step: [p.feet[1 - i][0], p.lift[1 - i]] } : {}), ...(p.hold?.[i] ? { hold: p.hold[i] } : {}) }
    const made = T.make(X)
    if (T.split) Object.assign(out, made)
    else out[s] = made
    // (fighting: a near weapon under the trunk's pieces drawn over them, its forearm and its fist with it)
    // (and a near shield over them, its forearm and its fist with it, the forearm still behind its face)
    const sh = p.free && (s === "held" ? overBody(F, W, B, X.G, X.tip) : s === "off" && X.rim && overBody(F, W, B, X.G, X.G, 0, [X.mid, ...X.rim]))
    if (sh) {
      out[s] = out[s].map((f) => f.at(sh))
      const re = new RegExp(`^(arm|sleeve|coatarm|mailarm|bracer)${i}$`)
      for (const k of Object.keys(P)) if (re.test(k)) P[k] = [P[k]].flat().map((q, n) => (n || k.startsWith("bracer") ? (q.field ? fieldOf(q) : q).at(sh) : q))
    }
    if (T.strap) out[`strap_${s}`] = strap(F, W, T.strap(F, M))
  }
  return out
}

// ---------------------------------------------------------------- fighting: a ready stance, strikes, a shot, a cast, a block, hurt
// Nine moves a spec asks for by name (`moves: ["ready", "slash"]`), in the eight directions, fitted to the body as the
// walk is (fitMove), chosen by what the hands hold: each hand's part of a frame by its thing's kind (a blade, a mace, an
// axe or a quarterstaff in both hands, a spear, a mage's staff, a shield, a bow, a lantern, the empty hand), the body's
// (the bob, the lean, the shoulders' twist, a step, a shake) by the move. A move that doesn't fit what is held is refused
// with the reason (FIGHT_NEEDS). In every frame each thing is made on its fist by the frame's `hold` (a blade's way, a
// shield's face, a bow's draw and its arrow), so it rides the hand; what hangs follows a frame behind (`lag`).
// Posed to read at 34 px:
// - the weapon and its arm seen: posed out of the body first (the wind-up's fist raised over the weapon shoulder, the
//   strike's ahead through the middle line at the mark, the follow-through's low and across on the other side: a cut
//   crosses the body, never circles out on one side); the arms and what the hands hold kept clear of the body as worn,
//   within a human's reach, by the collision model (solve(), below: every frame, every move, every body and outfit);
//   where a near weapon still lies under what the trunk wears, it and its forearm drawn over it (overBody), the far arm
//   under the body, the head over all; nothing through cloth: a cloak parts where an arm comes out through its opening and
//   is pushed out over an arm farther back (as the hood's cowl and the fur mantle are), its hem flaring on the fast frames;
// - the facing kept: the stance bladed (the off foot forward, the hips TURN toward the off side, the weapon shoulder back
//   by the twist) and every twist within 30 degrees of it, the head on the mark (its own turn undoing the hips' and the
//   shoulders'); the reach from the arm, the pitch, the hips' drop and the front foot's step, the off hand thrown against
//   the swing;
// - the weight in holds, the speed in flashes (characters §12): a wind-up held (longer for an axe or a mace), the strike
//   one frame and its smear (behind the figure), the follow-through, held or recovering: 0.5 to 0.8 s a strike;
// - an archer's hips BOW_TURN off the mark and his shoulders along it as he shoots, the bow arm straight and level at the
//   mark, the bow outside the body, the arrow at the chin, the full draw held; loosed in two flashes, a streak ahead and the
//   string hand flung back; facing us or away, the mark a diagonal off (an arrow end on is a dot);
// - a shield on the near side over what the trunk wears, out along its face past the forearm and what it wears (the arm
//   never through its face); an axe's bit leading its swing (down on a chop);
// - a mage's staff in one hand (the other open toward the mark) or both (`staff: "two"`), `conjure` the spell being cast
//   (a loop a game holds: braced, the staff or the hands raised, the light pulsing) before `cast` lets it go;
// - states one drawing each, held as long as a game wants: a block and a hurt one held pose shaken whole (`shake`, px
//   along the facing, back first; a hurt's extreme on its second frame, the rear foot back), weak crouched low; the
//   cast's gathering two drawings of its light in turn, then flung to full reach and held there;
// - the short body by rule (fitMove): its hips dropping deeper and its feet wider in a fight (its `fight`).
// The numbers are the medium body's px, a hand [forward, out, up] from its shoulder (out to the hand's side), a way
// [forward, out, up]. A frame says `strike` (its hit point a socket), `smear` (the swing's path drawn behind the steel, 1
// or a thinner 0.5), `flash` (hurt: every color a step lighter in its ramp), `glow` (the cast's light, its size), `streak`
// (the shot's arrow ahead of the bow), `shake`.
const kindOf = (T) => (!T ? "none" : T.grip === "shield" ? "shield" : T.key === "sword" || T.key === "shortblade" ? "blade" : T.key)
const STANCE = [[1.8, -2.4], [-1.4, 2.4]], ARCHER = [[0.8, -2.6], [-0.8, 2.6]], TURN = -10, BOW_TURN = 40, SH = TB.shoulders
// each move's frames: ms; the body's down, lean, twist (the shoulders against the hips; an archer's `bow`, his own),
// trail and sway (the cloak's), front and frontLift (the front foot's step); the frames that strike, smear, flash, glow,
// streak or shake; a hurt's flinch (the hands thrown back and up, its share)
const FT = {
  ready: { ms: [200, 200, 200, 200], down: [1.5, 2, 2.5, 2], lean: 4, twist: 20, trail: [0.2, 0.25, 0.3, 0.25] },
  slash: { ms: [80, 180, 70, 70, 160, 120], heavy: [60, 280, 70, 70, 130, 100], down: [2, 1.4, 2.6, 3, 3.6, 2.4], lean: [4, -2, 16, 18, 20, 8], twist: [20, 25, 0, -10, -10, 14],
    front: [0, 0, 4, 4, 4, 2], frontLift: [0, 0, 0, 0, 0, 0.6], trail: [0.25, 0.15, 0.6, 1, 0.8, 0.45], sway: [0, 0.25, -0.2, -0.6, -0.5, -0.2], flare: [0, 0, 0.7, 1, 0.5, 0.2], strike: 2, smear: { 2: 1, 3: 0.5 },
    expr: [undefined, "grit", "grit", "grit", "grit", undefined],
    // (an axe's overhead chop: the shoulders coiled and the back arched as it is raised (its head beside and behind the
    // head), square to the mark and the body pitched over it as it comes down)
    chop: { down: [2, 1.2, 2.6, 3, 3.6, 2.4], lean: [4, -8, 12, 16, 18, 8], twist: [12, 30, 6, 2, 2, 12], front: [0, 0, 3.5, 3.5, 3.5, 2] } },
  thrust: { ms: [80, 180, 60, 200, 120], down: [2, 1.4, 2.6, 3.8, 2.4], lean: [4, -3, 15, 28, 8], twist: [20, 28, 10, -5, 12],
    front: [0, 0, 3, 5, 2], frontLift: [0, 0, 0.8, 0, 0.5], trail: [0.25, 0.15, 0.5, 1, 0.5], flare: [0, 0, 0.6, 0.8, 0.3], strike: 3, expr: [undefined, "grit", "grit", "grit", undefined] },
  shoot: { ms: [150, 120, 400, 50, 50, 230, 120], down: [1.6, 1.4, 1.2, 1.2, 1.2, 1.3, 1.5], lean: [2, 1, 0, -1, -1, 0, 2], bow: [20, 40, 50, 50, 50, 50, 25],
    trail: [0.2, 0.2, 0.2, 0.1, 0.1, 0.15, 0.25], sway: [0, 0, 0, 0.2, 0.15, 0.1, 0], strike: 3, streak: { 3: [1.5, 11], 4: [7, 14] },
    expr: [undefined, "grit", "grit", "grit", "grit", undefined, undefined] },
  // (conjure: the spell being cast, a loop a game holds: braced, the staff or the hands raised, the light pulsing)
  conjure: { ms: [120, 120, 120, 120, 120, 120], down: 2.2, lean: 2, twist: 14, wide: 1.2, trail: [0.25, 0.3, 0.35, 0.3, 0.25, 0.2], glow: [1.2, 1.7, 2.3, 2.5, 2, 1.5],
    rise: [0, 0.5, 0.9, 0.6, 0.1, -0.3], tilt: [0, 2, 3, 1.5, -1.5, -2.5], expr: "grit" },
  cast: { ms: [60, 80, 80, 70, 160, 150], down: [1.8, 1.6, 1.6, 2.4, 2.4, 1.8], lean: [4, -4, -4, 14, 14, 6], twist: [20, 28, 28, -6, -6, 12],
    front: [0, 0, 0, 3, 3, 1], trail: [0.25, 0.15, 0.15, 0.7, 0.5, 0.3], glow: [0.6, 1, 1.5, 1.9, 1, 0], strike: 3, expr: [undefined, "grit", "grit", "grit", "grit", undefined] },
  // (animated block: raise -> high braced guard -> heavy impact recoil + shield spark -> bounce -> settle -> counter-brace -> return)
  block: { ms: [90, 240, 60, 60, 60, 190, 120], down: [2, 2.6, 3.4, 2.9, 2.7, 2.5, 2.1], lean: [4, 12, 5, 8, 10, 13, 6], twist: [20, 34, 42, 37, 35, 32, 22],
    back: [0, 0, -1.2, -0.8, -0.4, 0, 0], trail: [0.25, 0.4, -0.1, 0.25, 0.35, 0.45, 0.3], shake: [0, 0, -2.5, 1.5, -0.8, 0, 0],
    spark: { 2: 1, 3: 0.55 }, expr: [undefined, "grit", "wince", "grit", "grit", "grit", undefined] },
  // (dodge: quick low evade sidestep/lean back, recovering into guard; works with any loadout)
  dodge: { ms: [70, 110, 120, 100], down: [3.0, 3.9, 2.9, 2.0], lean: [10, -12, -4, 4], twist: [26, 36, 28, 20],
    front: [-0.8, -1.8, -0.8, 0], back: [-1.0, -2.4, -1.1, 0], trail: [0.45, 0.95, 0.55, 0.25], sway: [0.25, 0.75, 0.35, 0], flare: [0.3, 0.85, 0.4, 0],
    evade: [0, 1, 1, 0], expr: ["grit", "grit", "grit", undefined] },
  hurt: { ms: [80, 120, 50, 50, 150, 120, 120], down: [2.2, 1.4, 1.4, 1.4, 1.4, 1.6, 1.9], lean: [10, -10, -10, -10, -10, -2, 2], twist: [16, 8, 8, 8, 8, 14, 18],
    back: [0, -1.5, -1.5, -1.5, -1.5, -0.8, 0], trail: [0.4, -0.5, -0.3, 0, 0.2, 0.4, 0.3], shake: [0, -2.5, 1.5, -1, 0, 0, 0], flash: 0, flinch: [0.4, 1, 1, 1, 1, 0.4, 0],
    // (the impact squashed: the flash frame a px and a half shorter and its feet wider, sprung back the next)
    squash: [1.5, 0, 0, 0, 0, 0, 0], expr: "wince" },
  // (weak: a loop held as long as a game wants: crouched low, the weapon's point down, the chest heaving with laboured breath)
  weak: { ms: [260, 220, 260, 220, 240], down: 3, lean: 14, twist: 10, trail: 0.3, droop: 1, rise: [0, 0.8, 1.6, 0.8, 0], tremble: [0, 0.4, 0, -0.35, 0.1], sag: [0, 0.3, 0.6, 0.5, 0.2], expr: "wince" },
  // (downed: kneeling/collapsed stunned breathing loop close to the ground, distinct from standing weak)
  downed: { ms: [280, 260, 280, 260], down: 5.8, lean: [30, 32, 34, 32], twist: 8, wide: 1.25, trail: 0.2, droop: 1, kneel: true,
    rise: [0, 0.7, 1.1, 0.5], sag: [0.4, 0.6, 0.8, 0.6], expr: "wince" },
  // (dead: 1-frame fallen flat pose rolled onto the ground with legs stretched out, grounded cleanly on every body)
  dead: { ms: [400], down: 4.5, lean: 4, twist: 6, trail: 0.1, droop: 1, fallen: true, roll: 86, nod: 22, point: [25, 35], expr: "dead" },
}
// each hand's frames by its kind: [hand, aim (a shield's face)]; the empty hand's its hand alone. Ready: the blade low at
// the side and out, its point forward and a little up; a spear levelled at the hip; a staff upright beside; the shield
// before the body; the empty hand low and forward
const READY = { blade: [[-1.6, 3.4, -5.2], [0.25, 0.55, 0.8]], spear: [[0.4, 3.2, -5.2], [1, -0.12, 0.08]], magestaff: [[1.6, 2.4, -4.6], [0.3, 0.12, 0.95]],
  shield: [[3.4, -2.6, -3.4], [0.9, 0.3, 0.1]], none: [[1.2, 1.8, -5.6]] }
const rep = (n, q) => Array.from({ length: n }, () => q)
// (in both hands, rig3d's grip: the off hand and the main one [forward, right, up] from under the pelvis, the thing on the
// line through them)
const BOTH = { axe: true, quarterstaff: true }
// (a chop's wind-up raised before the face: the haft upright through both fists before the chin, its head over the brow)
const AXE_RAISED = [[4.8, 1, 21.5], [5.04, 1.45, 24.44]]
// (a chop in the main hand alone, where both fists can't meet before the trunk: [hand, aim] a frame, the rests at the side
// (frames 0 and 5) as it stands: raised beside the weapon shoulder, the haft up and back; down ahead on the weapon side,
// the haft forward and down; held in the cut, near level)
const AXE_ONE = [undefined, [[-0.4, 2.6, 3.2], [-0.3, 0.2, 0.93]], [[4.6, 1.2, -1.2], [0.9, 0.05, -0.4]], [[4.4, 1.6, -2.6], [0.95, 0.05, -0.2]], [[4.2, 1.8, -3], [0.95, 0.05, -0.25]]]
const READY2 = { staff: [[3.6, -1.8, 15], [4.2, 2.6, 17]], axe: [[4, -1.6, 14.6], [4.6, 2.2, 16.6]], quarterstaff: [[3.4, -2.4, 13.8], [4.1, 3.4, 16.7]] }
const HANDS = {
  slash: {
    // (a cut that crosses the body's middle line at the mark: raised over the weapon shoulder, the blade up and back; down
    // in front through the middle, the blade at the mark; low and across on the other side; back up on its own side)
    main: { blade: [READY.blade, [[-0.6, 2.2, 3.6], [-0.35, 0.25, 0.9]], [[4.6, -1.4, -1.6], [0.75, -0.3, -0.6]], [[4, -3.8, -3.4], [0.45, -0.6, -0.65]], [[2.6, -4.8, -3.6], [0.25, -0.75, -0.6]], [[0.6, 3.6, -3.4], [0.6, 0.35, 0.7]]],
      // (an axe's overhead chop: both fists raised before the chin, the haft up and back past the head on the weapon side,
      // its head high and a little behind (the collision model keeps the haft and the head of it clear of the head as
      // worn); down in front through the middle at the mark, the bit leading; then held in the cut, lower, the haft near
      // level and the bit still down on the mark)
      axe: [READY2.axe, [[4.6, 1.6, 21.6], [3.25, 3.1, 23.82]], [[4.6, 0.8, 19.4], [7.51, 1.1, 18.8]], [[4.8, 0.8, 17.6], [7.71, 1.25, 17]], [[4.6, 0.8, 16.8], [7.51, 1.25, 16.2]], [[4.1, -1.4, 15], [4.5, 2.4, 17.4]]] },
    off: { shield: [READY.shield, [[4.2, -2, -2.4], [0.95, 0.15, 0.15]], [[1.6, 1.4, -4], [0.7, 0.7, 0.05]], [[0.8, 2.2, -4.2], [0.55, 0.83, 0]], [[-0.8, 2.8, -3.8], [0.4, 0.9, 0.05]], [[2, -0.6, -3.8], [0.85, 0.5, 0.05]]],
      none: [READY.none, [[4, -0.8, -2.2]], [[1.6, 1.6, -4.4]], [[0, 2.4, -4]], [[-3.2, 2.2, -1.6]], [[0.8, 2, -5]]] },
  },
  thrust: {
    main: { spear: [READY.spear, [[-2.2, 4.2, -4.4], [1, -0.12, 0.1]], [[2.2, 2.6, -3.6], [1, -0.12, 0.05]], [[5.6, 1.4, -2.2], [1, -0.15, 0]], [[1.8, 3, -4.8], [1, -0.12, 0.06]]],
      blade: [READY.blade, [[-2.4, 3.2, -3.6], [1, 0, 0.15]], [[2.2, 2.8, -2.6], [1, -0.05, 0.05]], [[5.6, 1.6, -1.8], [1, -0.12, 0]], [[1.4, 3.4, -4.2], [0.8, 0.25, 0.5]]] },
    off: { shield: [READY.shield, [[4.2, -2, -2.6], [0.95, 0.15, 0.15]], [[2.8, -0.6, -3.4], [0.9, 0.4, 0.1]], [[0.4, 2.2, -4], [0.55, 0.83, 0]], [[2.6, -1.6, -3.6], [0.9, 0.35, 0.1]]],
      none: [READY.none, [[4, -0.8, -2.2]], [[2.4, 0.8, -3.6]], [[-2.6, 2.6, -2.4]], [[0.8, 2, -5]]] },
  },
  // (the cast: the staff raised, drawn up and back while its light gathers (two drawings of the light, held as long as a
  // game wants), flung to full reach at the mark as it goes and held there, back; the open hand the same, the other
  // hand forward as it gathers and flung back as it goes)
  cast: { main: { magestaff: [[[2.6, 2.2, -2.4], [0.35, 0.15, 0.92]], ...rep(2, [[1.2, 2.6, -0.4], [0.1, 0.15, 0.98]]), ...rep(2, [[4, 1.8, -0.6], [0.5, 0.1, 0.86]]), [[2.2, 2.2, -3.6], [0.25, 0.12, 0.96]]],
    none: [[[2.8, 2, -2.6]], ...rep(2, [[-0.6, 3, 0.8]]), ...rep(2, [[5.6, 1.2, -0.4]]), [[2.4, 2, -4]]] },
    off: { none: [READY.none, ...rep(2, [[3.4, -0.6, -2.6]]), ...rep(2, [[4.2, -0.4, -1.4]]), [[0.8, 2, -5]]] },
    // (in both hands: raised, drawn up, thrust at the mark, back: the off fist's place and the main's from under the pelvis)
    two: [[[3.8, -1, 15.4], [4.4, 1, 19]], ...rep(2, [[3.2, -0.4, 17.6], [3.2, 1.8, 21.6]]), ...rep(2, [[4.4, -0.8, 17.6], [5.6, 0.8, 19.4]]), [[3.6, -1.8, 15], [4.2, 2.6, 17]]] },
  // (conjure: the staff raised upright beside the head, the other hand open toward the mark; the open hands both
  // forward, the light between them; in both hands, the staff upright beside the head)
  conjure: { main: { magestaff: [0, 0.5, 1, 0.8, 0.3, 0].map((b) => [[1.8, 3.1, 1.2 + b], [0.2, 0.22, 0.96]]), none: [0, 0.4, 0.8, 0.5, 0.1, -0.2].map((b) => [[4.2, 0.6, -1.2 + b]]) },
    off: { none: [[[4, -0.4, -1.4]], [[4.4, -1, -0.6]], [[4.2, -1.8, 0.2]], [[3.6, -1.7, -0.2]], [[3.3, -0.9, -1]], [[3.7, -0.2, -1.6]]] },
    two: [0, 0.5, 1, 0.8, 0.3, 0].map((b) => [[3.6, -0.4, 17.4 + b], [3.6, 1.8, 21.4 + b]]) },
  // (animated block: raise -> brace -> recoil impact -> bounce -> settle -> counter-guard -> return)
  block: { main: {
      blade: [READY.blade, [[0.6, 3.6, -4.4], [0.4, 0.3, 0.86]], [[-0.4, 4.1, -4.0], [0.25, 0.35, 0.9]], [[0.3, 3.8, -4.3], [0.35, 0.32, 0.88]], [[0.5, 3.7, -4.4], [0.38, 0.3, 0.87]], [[0.8, 3.4, -4.2], [0.45, 0.28, 0.85]], [[-0.8, 3.6, -5], [0.75, 0.25, 0.6]]],
      spear: [READY.spear, [[-0.6, 3, -4.2], [1, -0.1, 0.12]], [[-1.5, 3.4, -3.8], [0.95, -0.15, 0.2]], [[-0.9, 3.2, -4.0], [0.98, -0.12, 0.16]], [[-0.7, 3.1, -4.1], [1, -0.1, 0.14]], [[-0.3, 2.9, -4.2], [1, -0.1, 0.1]], [[0, 3.1, -4.8], [1, -0.12, 0.1]]],
    },
    off: { shield: [READY.shield, [[4.1, -3.4, -2.1], [0.95, -0.15, 0.15]], [[3.0, -3.6, -1.6], [0.92, -0.22, 0.25]], [[3.7, -3.5, -1.9], [0.94, -0.18, 0.18]], [[3.9, -3.4, -2.0], [0.95, -0.15, 0.15]], [[4.3, -3.2, -2.3], [0.96, -0.1, 0.12]], [[3.4, -2.2, -3.2], [0.9, 0.25, 0.1]]] } },
}
// an archer's: the bow's grip and the drawing fist as points from the chest, [toward the mark, right, up], turned into
// the shoulders' frame (S degrees off the mark: his hips' turn and his shoulders' twist); the bow's aim (along its limbs)
// and the arrow's way (the frames without one) the same
const bowAt = (S, [bp, np, o = {}]) => {
  const t = (S * Math.PI) / 180, to = ([a, b, u]) => [a * Math.cos(t) + b * Math.sin(t), -a * Math.sin(t) + b * Math.cos(t), u], b = to(bp), n = to(np)
  return [{ hand: [b[0] - SH[0], -(b[1] + SH[1]), b[2] - SH[2]], aim: to(o.aim ?? [0.08, -0.12, 1]), way: to(o.way ?? [1, 0, 0]), draw: o.draw ?? 0, arrow: o.arrow, snap: o.snap },
    { hand: [n[0] - SH[0], n[1] - SH[1], n[2] - SH[2]] }]
}
const BOW_READY = [[4.4, -0.8, -4.0], [2.2, 0.9, -2.6], { aim: [0.45, -0.3, 0.85], arrow: "nock" }]
// (raised, drawn, drawn full and held (the bow arm straight at the mark, the drawing fist at the jaw's side, ahead of its
// own shoulder, where it shows past the head from behind), loosed in two
// flashes (the string snapped, then straight, the hand flung back past the ear), after (the bow still up), lowered with
// the next arrow on the string)
const SHOT = [[[6, -0.6, -2], [2, 0.8, -0.8], { aim: [0.3, -0.25, 0.92], arrow: "nock" }], [[8, 0, 0.6], [1, 1.2, 1.2], { aim: [0.12, -0.15, 1], draw: 0.5, arrow: "nock" }],
  [[10, 0.4, 1.4], [-0.6, 1.6, 1.6], { aim: [0.05, -0.1, 1], draw: 1, arrow: "nock" }], [[10, 0.4, 1.4], [-2.4, 2.2, 2.2], { aim: [0.05, -0.1, 1], snap: true }],
  [[10, 0.4, 1.4], [-3, 2.2, 1.8], { aim: [0.05, -0.1, 1] }], [[9.6, 0.4, 1.2], [-2.8, 2.4, 1.4], { aim: [0.05, -0.1, 1] }], [[6.4, -0.2, -1.2], [2, 0.8, -0.4], { aim: [0.3, -0.25, 0.92], arrow: "nock" }]]
// which moves fit what is held, and the reason one doesn't
const FIGHT_NEEDS = {
  ready: () => undefined, dodge: () => undefined, hurt: () => undefined, weak: () => undefined, downed: () => undefined, dead: () => undefined,
  slash: (K) => (["blade", "mace", "axe"].includes(K[1]) ? undefined : "a slash swings a blade, an axe or a mace in the main hand (held: sword, shortblade, axe, mace)"),
  thrust: (K, W) => (K[1] === "spear" || W.held?.key === "shortblade" ? undefined : "a thrust drives a spear or a short blade (held: spear, shortblade)"),
  shoot: (K) => (K[0] === "bow" ? undefined : "shooting takes a bow in the off hand (off: bow)"),
  cast: (K) => (K[1] === "magestaff" || K[1] === "none" ? undefined : "a cast is made with a mage's staff or the open main hand (held: magestaff, or none)"),
  conjure: (K) => (K[1] === "magestaff" || K[1] === "none" ? undefined : "a spell is conjured with a mage's staff or the open hands (held: magestaff, or none)"),
  block: (K) => (K[0] === "shield" ? undefined : "a block takes a shield on the off arm (off: roundshield, tallshield)"),
}
const FRAMES = Object.fromEntries(Object.entries(FT).map(([m, T]) => [m, T.ms.length])), MS = Object.fromEntries(Object.entries(FT).map(([m, T]) => [m, T.ms]))
// each hand's hold in frame i of move m (k 0 the off hand, 1 the main), K the kinds, S the shoulders' turn off the mark:
// { hand, aim | face, ... } or a grip
const holdOf = (m, i, k, K, S, two, raised) => {
  if (m === "weak" || m === "downed" || m === "dead") return droop(holdOf("ready", 0, k, K, S, two))
  if (K[0] === "bow") return bowAt(S, m === "shoot" ? SHOT[i] : BOW_READY)[k]
  const kind = K[k]
  // (a mage's staff in both hands: on rig3d's grip, the off fist low on it, the main above)
  if (two && k) { const [a, b] = HANDS[m]?.two?.[i] ?? READY2.staff; return { grip: { from: a, to: b, at: [0, 1] } } }
  // (an axe's chop: its bit down on the mark from the strike through the cut held)
  if (BOTH[kind]) { const q = HANDS[m]?.main?.[kind], [a, b] = raised ? AXE_RAISED : q?.[i] ?? READY2[kind]
    return { grip: { from: a, to: b, at: [0, 1] }, ...(m === "slash" && kind === "axe" && i >= 2 && i <= 4 ? { blow: "down" } : {}) } }
  if (kind === "lantern") return { hand: GRIPS.hang }
  const kk = kind === "mace" ? "blade" : kind, [hand, aim] = HANDS[m]?.[k ? "main" : "off"]?.[kk]?.[i] ?? READY[kk] ?? READY.none
  if (kind === "shield") return { hand, face: aim }
  // (a blade's edge along its swing: across the plane of the wind-up's way and the strike's)
  return aim ? { hand, aim, ...(kind === "spear" ? { at: 0.4 } : {}), ...(m === "slash" && i > 0 && k ? { plane: [HANDS.slash.main.blade[1][1], HANDS.slash.main.blade[2][1]] } : {}) } : { hand }
}
// (weak: a hold drooped, the hand lower and nearer, a point or a face tipped down; a thing in both hands lower)
const droop = (h) => h.grip ? { ...h, grip: { ...h.grip, from: h.grip.from.map((v, e) => v - (e === 2 ? 2 : 0)), to: h.grip.to.map((v, e) => v - (e === 2 ? 3 : 0)) } }
  : { ...h, ...(h.hand ? { hand: [h.hand[0] * 0.6, h.hand[1], h.hand[2] - 1.2] } : {}), ...(h.aim ? { aim: [h.aim[0] * 0.5, h.aim[1] * 0.6, -0.85] } : {}), ...(h.face ? { face: [h.face[0], h.face[1], -0.35] } : {}) }
const fightWhy = (m, W) => { const why = FIGHT_NEEDS[m]([kindOf(W.off), kindOf(W.held)], W); return why && `the move '${m}' doesn't fit what is held: ${why}` }
// (a spec's `staff`: "one" (the default) or "two", a mage's staff fought with in both hands, the off hand empty)
const staffWhy = (s, W) => (s.staff === undefined || s.staff === "one" ? undefined : s.staff !== "two" ? `staff is "one" or "two" (the hands on a mage's staff), got ${JSON.stringify(s.staff)}`
  : W.held?.key !== "magestaff" ? `staff: "two" holds a mage's staff in both hands (held: magestaff)` : W.off ? `staff: "two" takes both hands: the off hand can't hold the '${W.off.key}' too (off: "none")` : undefined)
// (a body whose two fists can't meet before its trunk as worn (a dwarf's short arms on its deep chest, any body in plate
// and a tabard): a two-handed thing rests in the main hand by its side, as it stands, the off hand free, whenever it isn't
// swung or cast; both hands only on the raise and the blow)
const frontGrip = (B, W) => { const b = B.body, R = rOf(B), reach = b.upper + b.fore + 0.7 * R.hand; return b.shoulders[0] + Math.sqrt(Math.max(0, reach ** 2 - b.shoulders[1] ** 2)) >= wornR(W, B).f + R.hand + 0.3 }
const fightMove = (m, W, two, side) => {
  const K = [kindOf(W.off), kindOf(W.held)], T = K[1] === "axe" && FT[m].chop ? { ...FT[m], ...FT[m].chop } : FT[m], bow = K[0] === "bow", at = (v, i) => (Array.isArray(v) ? v[i] : v ?? 0)
  return { frames: T.ms.length, ms: T.heavy && K[1] !== "blade" ? T.heavy : T.ms, fight: true, pose: (i, h = 90) => {
    // (an archer stands side on, his hips BOW_TURN off the mark, his shoulders along it as he shoots; facing us or away,
    // the mark a diagonal off (an arrow seen end on is a dot))
    const off = bow && m === "shoot" && Math.abs(((h % 180) + 180) % 180 - 90) > 67.5 ? -45 : 0
    // (a chop's wind-up seen from the side or with the weapon's side away: raised straight up before the face, the shoulders
    // nearly square, where the side's would cross the face or hide behind the head)
    const raised = m === "slash" && K[1] === "axe" && i === 1 && !(Math.abs(Math.cos((h * Math.PI) / 180)) > 0.5 && Math.sin((h * Math.PI) / 180) > -0.01)
    const turn = (bow ? BOW_TURN : TURN) + off, twist = bow ? (T.bow ? T.bow[i] : at(T.twist, i) - 20) : raised ? 12 : at(T.twist, i), S = turn - off + twist
    const swung = (m === "slash" || m === "cast") && i >= 1 && i <= 4, rest = side && !swung && (BOTH[K[1]] || two)
    // (where both fists can't meet before the trunk: the chop swung in the main hand alone, the off hand thrown with it; a
    // staff cast in one hand)
    const one = side && m === "slash" && K[1] === "axe" && swung
    const H = [0, 1].map((k) => (one ? (k ? { hand: AXE_ONE[i][0], aim: AXE_ONE[i][1], ...(i >= 2 ? { blow: "down" } : {}) } : holdOf(m, i, 0, K, S, false)) : rest && (BOTH[K[1]] || m !== "conjure") ? (k ? { hand: GRIPS.rest } : { hand: READY.none[0] }) : holdOf(m, i, k, K, S, two && !side, raised && !side))), grip = H.find((h) => h.grip)?.grip, fl = at(T.flinch, i)
    // (hurt: the hands up before the body, a guard, the holds kept)
    const tr = at(T.tremble, i), sg = at(T.sag, i), fling = (q, k = 1) => [q[0] + 0.5 * fl + (k ? 0.5 * tr : 0), q[1], q[2] + 1.2 * fl + (k ? tr : -sg)]
    const sq = at(T.squash, i), ex = Array.isArray(T.expr) ? T.expr[i] : T.expr
    return { feet: (bow ? ARCHER : STANCE).map(([f, r], k) => [f + at(k ? T.back : T.front, i), r * (T.wide ?? 1) * (1 + 0.15 * sq)]), lift: [at(T.frontLift, i), 0], down: at(T.down, i) + sq, lean: at(T.lean, i),
      turn, twist, head: off - turn - twist, trail: at(T.trail, i), sway: at(T.sway, i), ...(at(T.flare, i) ? { flare: at(T.flare, i) } : {}), free: true,
      ...(at(T.rise, i) ? { rise: at(T.rise, i) } : {}), ...(at(T.tilt, i) ? { tilt: at(T.tilt, i) } : {}),
      ...(T.kneel ? { kneel: true } : {}), ...(T.fallen ? { fallen: true, roll: T.roll, nod: T.nod, point: T.point } : {}),
      ...(at(T.evade, i) ? { evade: true } : {}), ...(ex ? { expr: ex } : {}),
      ...((m === "slash" || m === "thrust") && i === 1 || m === "cast" && (i === 1 || i === 2) ? { windup: true } : {}),
      ...(m === "shoot" && i >= 1 && i <= 5 ? { elbow: [-1, 0.6, 0] } : m === "slash" && i === 1 ? { elbow: K[1] === "axe" ? [0.2, 0.6, -1] : [-0.3, 1, -0.4] } : {}),
      hands: H.map((h, k) => { const q = fling(h.hand ?? REST[k], k); return [q[0], (k ? 1 : -1) * q[1], q[2]] }),
      hold: H.map((h) => (h.aim || h.face || h.grip ? h : undefined)), ...(grip ? { grip: { ...grip, from: fling(grip.from), to: fling(grip.to) } } : {}),
      ...(T.strike === i ? { strike: true } : {}), ...(T.smear?.[i] ? { smear: T.smear[i] } : {}), ...(T.spark?.[i] ? { spark: T.spark[i] } : {}),
      ...(T.flash === i ? { flash: true } : {}), ...(at(T.glow, i) ? { glow: at(T.glow, i) } : {}),
      ...(T.streak?.[i] ? { streak: T.streak[i] } : {}), ...(at(T.shake, i) ? { shake: at(T.shake, i) } : {}) }
  } }
}
// ---------------------------------------------------------------- fighting: what collides, within a human's limits
// A cheap 3D model of the worn figure and of what it holds, in the shoulders' frame ([forward, right, up] px from under
// the pelvis, as a grip's ends: the same in every heading): the trunk as worn (an ellipse round the spine, wornR's radii
// ahead and at the side, from under the hips to the shoulders' top), the head with its hair and headwear (its own fields,
// measured once as a radius by way from its middle), the legs (a capsule a bone), each arm (two capsules and the fist, a
// ball) and each held thing as its parts (a haft, a blade, a shaft: segments; an axe's head across its haft; a shield's
// disc). solve() keeps them apart before anything is drawn: per frame, after the move's pose, what goes in is put out
// (the fist moved out along the way out, the arm never past its reach, the elbow bent out where it would sink in, the
// thing turned about its grip; a two-handed haft through both fists a fixed spacing apart, the pair moved and turned as
// one), and flaws() says what a human could not do that is left (kit.fit.fight's `flaws`). Depth stays the 3D's.
const ad3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sb3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], sc3 = (a, k) => [a[0] * k, a[1] * k, a[2] * k]
// the joints a fighting pose puts where, as rig3d puts them (its spine, shoulders, ik3 elbows, knees), and each fist
const bonesOf = (p, b, R) => {
  const rd = Math.PI / 180, ln = (p.lean ?? 0) * rd, tl = (p.tilt ?? 0) * rd, tw = (p.twist ?? 0) * rd, g = p.grip, eh = p.elbow ?? [-0.4, 0.5, -1]
  const spine = unit([Math.sin(ln), Math.sin(tl), Math.cos(ln)]), pelvis = [0, 0, b.hip - (p.down ?? 0)], chest = ad3(pelvis, sc3(spine, b.torso + (p.rise ?? 0)))
  const hf = [Math.cos(tw), -Math.sin(tw), 0], hr = [Math.sin(tw), Math.cos(tw), 0]
  const arms = [0, 1].map((i) => {
    const sd = i ? 1 : -1, sh = ad3(chest, [b.shoulders[0], sd * b.shoulders[1], b.shoulders[2]]), hand = g ? lerp(g.from, g.to, g.at[i]) : ad3(sh, p.hands[i])
    const elbow = ik3(sh, hand, b.upper, b.fore, [eh[0], sd * eh[1], eh[2]])
    return { sh, elbow, hand, fist: ad3(hand, sc3(unit(sb3(hand, elbow)), 0.7 * R.hand)) }
  })
  const legs = [0, 1].map((i) => { const hip = ad3(pelvis, sc3(hr, (i ? 1 : -1) * b.hips)), ankle = ad3([0, 0, b.ankle + (p.lift?.[i] ?? 0)], ad3(sc3(hf, p.feet[i][0]), sc3(hr, p.feet[i][1])))
    return { hip, knee: ik3(hip, ankle, b.thigh, b.shin, ad3(hf, [0, 0, 0.3])), ankle } })
  return { spine, pelvis, chest, head: ad3(chest, sc3(spine, b.neck)), arms, legs }
}
// (the head as worn: its fields' outer surface by way from its middle, x its right, y ahead, z up; marched in from 16 px)
const EL = [-75, -45, -15, 15, 45, 75], AZ = 12, radials = new Map()
const radialOf = (key, field) => {
  if (radials.has(key)) return radials.get(key)
  const rd = Math.PI / 180, tab = EL.map((el) => Array.from({ length: AZ }, (_, k) => {
    const e = el * rd, a = (2 * Math.PI * k) / AZ, d = [Math.cos(e) * Math.sin(a), Math.cos(e) * Math.cos(a), Math.sin(e)]
    let t = 16
    for (let n = 0; n < 80 && t > 0; n++) { const s = field.dist(sc3(d, t)); if (s < 0.05) break; t -= Math.max(s, 0.1) }
    return Math.max(0, t)
  }))
  const r = (q) => {
    const l = Math.hypot(...q) || 1e-6, y = Math.max(0, Math.min(EL.length - 1.001, (Math.asin(q[2] / l) / rd - EL[0]) / 30)), x = (((Math.atan2(q[0], q[1]) / (2 * Math.PI)) * AZ) % AZ + AZ) % AZ
    const i = Math.floor(y), k = Math.floor(x) % AZ, fy = y - i, fx = x - Math.floor(x), row = (n) => tab[n][k] * (1 - fx) + tab[n][(k + 1) % AZ] * fx
    return row(i) * (1 - fy) + row(i + 1) * fy
  }
  radials.set(key, r)
  return r
}
// the model of a spec: the body, the trunk as worn, the head's radius by way, each hand's thing
const modelOf = (W, B, head) => ({ b: B.body, R: rOf(B), m: measure(B), trunk: wornR(W, B), head, T: [W.off, W.held], legR: rOf(B).leg.map((v) => v + 0.2) })
// (how far a ball at q of radius r is inside each volume, and the way out: { d, n } or nothing)
const inTrunk = (S, M, q, r) => {
  const top = S.chest[2] + 0.6, bot = S.pelvis[2] - 1.6
  if (q[2] > top + r || q[2] < bot - r) return undefined
  // (the hips' narrower under the waist)
  const c = ad3(S.pelvis, sc3(S.spine, (q[2] - S.pelvis[2]) / S.spine[2])), df = q[0] - c[0], dr = q[1] - c[1], w = q[2] < S.pelvis[2] + 1.4 ? M.R.body[0] / M.R.body[1] : 1
  const e = Math.hypot(df / (w * M.trunk.f + r), dr / (w * M.trunk.s + r))
  if (e >= 1) return undefined
  const k = 1 / Math.max(e, 0.05) - 1, side = { d: Math.hypot(df, dr) * k, n: unit([df || 0.01, dr, 0]) }, up = top + r - q[2]
  return up < side.d ? { d: up, n: [0, 0, 1] } : side
}
const inHead = (S, M, q, r, p) => {
  const o = sb3(q, S.head), l = Math.hypot(...o), h = ((p.head ?? 0) * Math.PI) / 180, c = Math.cos(h), s = Math.sin(h)
  const R = M.head([-o[0] * s + o[1] * c, o[0] * c + o[1] * s, o[2]]) + r
  return l < R ? { d: R - l, n: unit(l ? o : [1, 0, 0]) } : undefined
}
const inLegs = (S, M, q, r) => {
  let w
  const qx = q[0], qy = q[1], qz = q[2]
  for (const L of S.legs) for (let k = 0; k < 2; k++) {
    const a = k ? L.knee : L.hip, b = k ? L.ankle : L.knee
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2]
    const t = Math.max(0, Math.min(1, ((qx - a[0]) * dx + (qy - a[1]) * dy + (qz - a[2]) * dz) / (dx * dx + dy * dy + dz * dz || 1)))
    const ox = qx - (a[0] + dx * t), oy = qy - (a[1] + dy * t), oz = qz - (a[2] + dz * t)
    const l = Math.hypot(ox, oy, oz), R = M.legR[k] + r
    if (l < R && (!w || R - l > w.d)) w = { d: R - l, n: l ? [ox / l, oy / l, oz / l] : [1, 0, 0] }
  }
  return w
}
const deepest = (...hits) => hits.filter(Boolean).reduce((a, h) => (!a || h.d > a.d ? h : a), undefined)
// (a way [forward, out, up], out to the hand's side, in the shoulders' frame, and back)
const wayIn = ([f, o, u], sd) => unit([f, o * sd, u]), wayOut = ([f, r, u], sd) => [f, r * sd, u]
// (a blade's edge: across its swing's plane, toward the way it goes; else ahead; an axe's, blowWay's)
const edgeOf = (h, U, sd = 1) => {
  const P = h.plane?.map((d) => wayIn(d, sd)), E = P ? cross(cross(P[0], P[1]), U) : Math.abs(U[0]) > 0.8 ? UP : [1, 0, 0]
  return unit(sb3(E, sc3(U, dot3(E, U))))
}
// (an axe from its butt's fist along U: its haft, its head's bit toward the blow, its poll)
const axeSegs = (at, U, m, q, h) => {
  const kk = 0.85 + 0.3 * m.hand, c = m.hz - 0.5 - 1.2 * m.hand, hd = ((q.head ?? 0) * Math.PI) / 180, E0 = blowWay([Math.cos(hd), Math.sin(hd), 0], h.blow), E = unit(sb3(E0, sc3(U, dot3(E0, U))))
  return [["haft", at(-1.2 * m.hand), at(c + 0.6), 0.55], ["axe head", at(c - 0.6 * kk), ad3(at(c - 0.6 * kk), sc3(E, 3 * kk)), 1.4], ["poll", at(c - 0.3 * kk), ad3(at(c - 0.3 * kk), sc3(E, -1.4 * kk)), 0.8]]
}
// each hand's thing as segments [a, b, radius] and named parts, as its make() lays it on the fists (the medium's numbers
// by the body's measures)
const segsOf = (S, M, q, k) => {
  const T = M.T[k], h = q.hold?.[k], { m } = M
  if (!T || !h) return []
  const F = S.arms[k].fist
  if (h.grip) {
    if (!k) return []
    const O = S.arms[0].fist, U = unit(sb3(S.arms[1].fist, O)), at = (t) => ad3(O, sc3(U, t))
    if (T.key === "axe") return axeSegs(at, U, m, q, h)
    if (T.key === "quarterstaff") { const L = 1.06 * m.h, o = (L - Math.hypot(...sb3(S.arms[1].fist, O))) / 2; return [["staff", at(-o), at(L - o), 0.6]] }
    const L = 1.08 * m.h, G = S.arms[1].fist
    return [["staff", ad3(G, sc3(U, -0.45 * L)), ad3(G, sc3(U, 0.55 * L + 2)), 0.6]]
  }
  if (h.face) {
    // (a shield's disc: its middle out along its face from the forearm, its rim)
    const Nf = wayIn(h.face, k ? 1 : -1), A = S.arms[k], c = ad3(lerp(A.elbow, A.hand, 0.45), sc3(Nf, M.R.arm[1] + 1.6)), Rr = T.key === "tallshield" ? 0.31 * 0.8 * (m.torso + m.thigh) : 0.55 * m.torso + 0.5
    const Uf = unit(sb3(UP, sc3(Nf, Nf[2]))), Ef = cross(Nf, Uf)
    return [["shield", ad3(c, sc3(Uf, Rr)), sb3(c, sc3(Uf, Rr)), 0.5], ["shield", ad3(c, sc3(Ef, Rr)), sb3(c, sc3(Ef, Rr)), 0.5]]
  }
  if (!h.aim) return []
  const U = wayIn(h.aim, k ? 1 : -1), at = (t) => ad3(F, sc3(U, t))
  if (T.key === "axe") return axeSegs(at, U, m, q, h)
  if (T.key === "spear") { const L = 1.25 * m.h; return [["spear", at(-(h.at ?? 0.4) * L), at((1 - (h.at ?? 0.4)) * L), 0.6]] }
  if (T.key === "magestaff") { const L = 1.08 * m.h; return [["staff", at(-0.38 * L), at(0.62 * L + 2), 0.6]] }
  if (T.key === "mace") return [["mace", at(1.2 * m.hand), at(1.15 * m.arm), 0.9 + 0.3 * m.hand]]
  // (a bow: its limbs along its aim through the grip)
  if (T.key === "bow") { const half = 0.875 * m.hz; return [["bow", at(-half), at(half), 0.5]] }
  const t0 = 1.1 * m.hand + 0.25
  return [["blade", at(t0), at(t0 + (T.key === "sword" ? swordLen(m) : 0.8 * m.arm)), 0.5]]
}
// (the deepest a segment goes into the trunk, the head or the legs, sampled every half px: { d, n, x (the point), name })
const segHit = (S, M, q, [name, a, b, r], legs = true) => {
  let w
  const n = Math.max(2, Math.ceil(2 * Math.hypot(...sb3(b, a))))
  for (let i = 0; i <= n; i++) {
    const x = lerp(a, b, i / n), h = deepest(inTrunk(S, M, x, r), inHead(S, M, x, r, q), legs && inLegs(S, M, x, r))
    if (h && (!w || h.d > w.d)) w = { ...h, x, name }
  }
  return w
}
// (an arm: its fist, a ball, and its forearm's line ahead of the elbow, which hangs against the trunk's side)
const armHit = (S, M, q, A) => deepest(inTrunk(S, M, A.fist, M.R.hand), inHead(S, M, A.fist, M.R.hand, q), ...[0.5, 0.8].map((t) => inTrunk(S, M, lerp(A.elbow, A.hand, t), 0)))
const reachOf = (M) => M.b.upper + M.b.fore - 0.05
// solve: a fighting pose kept clear, within a human's limits (fitMove's last step)
const solve = (p0, M) => {
  const p = { ...p0, hands: p0.hands.map((h) => h.slice()), hold: p0.hold?.map((h) => h && { ...h }) }, { b, R } = M, reach = reachOf(M)
  if (p.grip && p.hold?.[1]?.grip) {
    // (both hands on one haft: the off fist O and the haft's way U, the main fist a fixed spacing up it; the pair moved
    // out of what it is in, turned about its middle where the thing goes in past them, kept within both arms' reach)
    const sp = M.T[1]?.key === "axe" ? 2.4 * R.hand + 0.6 : Math.hypot(...sb3(p.grip.to, p.grip.from))
    let O = p.grip.from, U = unit(sb3(p.grip.to, O))
    const fists = () => [O, ad3(O, sc3(U, sp))]
    // (the grip's ends, the wrists, put so the fists are where they are: a fist sits on along its forearm from its wrist)
    const gripOf = () => {
      const S0 = bonesOf({ ...p, grip: { from: O, to: fists()[1], at: [0, 1] } }, b, R), eh = p.elbow ?? [-0.4, 0.5, -1]
      const w = fists().map((F, i) => { let h = sb3(F, sc3(unit(sb3(F, S0.arms[i].sh)), 0.7 * R.hand)); for (let n = 0; n < 3; n++) h = sb3(F, sc3(unit(sb3(h, ik3(S0.arms[i].sh, h, b.upper, b.fore, [eh[0], (i ? 1 : -1) * eh[1], eh[2]]))), 0.7 * R.hand)); return h })
      return { from: w[0], to: w[1], at: [0, 1] }
    }
    for (let n = 0; n < 10; n++) {
      const S = bonesOf({ ...p, grip: gripOf() }, b, R)
      // (the thing: turned about the fists' middle away from where it goes deepest; near the fists, the pair moved)
      const hit = deepest(...segsOf(S, M, p, 1).map((s) => segHit(S, M, p, s)))
      if (hit && hit.d > 0.15) {
        const G = ad3(O, sc3(U, sp / 2)), lever = dot3(sb3(hit.x, G), U)
        // (past the main fist, or well behind the off one (a staff's foot): turned; at the fists or just past them (a haft's
        // butt), moved)
        if (lever > sp / 2 + 1 || lever < -sp / 2 - 3) { U = unit(ad3(U, sc3(hit.n, (1.15 * hit.d) / lever))); O = sb3(G, sc3(U, sp / 2)) }
        else O = ad3(O, sc3(hit.n, hit.d))
      }
      // (the fists out of the trunk and the head, never behind the back)
      for (const f of fists()) { const h = deepest(inTrunk(S, M, f, R.hand), inHead(S, M, f, R.hand, p)); if (h) O = ad3(O, sc3(h.n, h.d)) }
      for (const f of fists()) { const c = ad3(S.pelvis, sc3(S.spine, (f[2] - S.pelvis[2]) / S.spine[2])), back = c[0] - 0.5 - f[0]; if (back > 0 && Math.abs(f[1] - c[1]) < M.trunk.s + R.hand) O = ad3(O, [back, 0, 0]) }
      // (within reach: the pair drawn in toward a shoulder it is past)
      fists().forEach((f, i) => { const d = sb3(f, S.arms[i].sh), e = Math.hypot(...d) - (reach + 0.7 * R.hand); if (e > 0) O = sb3(O, sc3(unit(d), e)) })
    }
    p.grip = gripOf()
    return p
  }
  for (const k of [0, 1]) {
    const h = p.hold?.[k], sd = k ? 1 : -1
    if (h?.grip) continue
    for (let n = 0; n < 8; n++) {
      const S = bonesOf(p, b, R), A = S.arms[k]
      // (the fist and the forearm out of the trunk and the head: the hand moved out)
      const hit = armHit(S, M, p, A)
      if (hit) p.hands[k] = ad3(p.hands[k], sc3(hit.n, hit.d + 0.05))
      // (the thing turned about the fist away from where it goes deepest; a shield's disc or a bow, the hand moved out)
      const seg = deepest(...segsOf(S, M, p, k).map((s) => segHit(S, M, p, s, !h?.face)))
      if (seg && seg.d > 0.15) {
        if (h.face || M.T[k]?.key === "bow") p.hands[k] = ad3(p.hands[k], sc3(seg.n, seg.d))
        // (a part past the fist turned one way, a part behind it (a spear's butt, a staff's foot) the other; at the fist, moved)
        else { const t = dot3(sb3(seg.x, A.fist), wayIn(h.aim, sd)); if (Math.abs(t) > 1.5) h.aim = wayOut(unit(ad3(wayIn(h.aim, sd), sc3(seg.n, (1.15 * seg.d) / t))), sd); else p.hands[k] = ad3(p.hands[k], sc3(seg.n, seg.d)) }
      }
      // (never past the arm's reach)
      const l = Math.hypot(...p.hands[k])
      if (l > reach) p.hands[k] = sc3(p.hands[k], reach / l)
    }
  }
  // (the elbows bent out, not into the trunk)
  const S = bonesOf(p, b, R)
  if (S.arms.some((A) => inTrunk(S, M, A.elbow, M.R.arm[1]))) for (const e of [[-0.3, 1, -0.7], [0, 1, -0.2]]) { const q = { ...p, elbow: e }, T = bonesOf(q, b, R); if (!T.arms.some((A) => inTrunk(T, M, A.elbow, M.R.arm[1]))) return q }
  return p
}
// what a human could not do, left in a solved frame: a list of words (each with its depth in px); `swing` the head of the
// thing's way the frame before and after (its edge must lead), `strike` the hit's way at the mark
const flaws = (p, M, o = {}) => {
  const { b, R } = M, S = bonesOf(p, b, R), out = [], f1 = (v) => Math.round(v * 10) / 10
  S.arms.forEach((A, k) => {
    const h = armHit(S, M, p, A), w = k ? "main" : "off"
    if (h && h.d > 0.3) out.push(`${w} arm in the ${h.n[2] === 1 ? "trunk's top" : inHead(S, M, A.fist, R.hand, p) ? "head" : "trunk"} ${f1(h.d)}`)
    if (Math.hypot(...sb3(A.hand, A.sh)) > b.upper + b.fore + 0.05) out.push(`${w} arm stretched ${f1(Math.hypot(...sb3(A.hand, A.sh)) - b.upper - b.fore)}`)
    for (const s of segsOf(S, M, p, k)) { const x = segHit(S, M, p, s, s[0] !== "shield"); if (x && x.d > 0.3) out.push(`${x.name} in the ${inHead(S, M, x.x, s[3], p) ? "head" : inLegs(S, M, x.x, s[3]) ? "legs" : "trunk"} ${f1(x.d)}`) }
  })
  if (p.grip) {
    for (const A of S.arms) { const c = ad3(S.pelvis, sc3(S.spine, (A.fist[2] - S.pelvis[2]) / S.spine[2])); if (A.fist[0] < c[0] - 0.5 && Math.abs(A.fist[1] - c[1]) < M.trunk.s + R.hand) out.push("a fist behind the back") }
    if (o.chop) for (const A of S.arms) if (A.elbow[2] > A.sh[2] + 1) out.push(`an elbow above its shoulder ${f1(A.elbow[2] - A.sh[2])}`)
  }
  if (o.edge && o.swing && dot3(o.edge, o.swing) < 0) out.push("the edge trailing its swing")
  if (o.strike && o.strike < 0) out.push("the strike away from the mark")
  if (o.away) out.push("the bit away from the mark")
  if (o.flip) out.push("the bit flipped from the frame before")
  return out
}
// (the head of a frame's thing (an axe's bit's middle, a blade's point) and its edge, turned from its shoulders' frame into
// the heading's (the hips' turn and the shoulders' twist), for the swing's way across frames)
const headOfThing = (p, M) => {
  const S = bonesOf(p, M.b, M.R), s = segsOf(S, M, p, 1), h = p.hold?.[1], t = (((p.turn ?? 0) + (p.twist ?? 0)) * Math.PI) / 180, c = Math.cos(t), sn = Math.sin(t), rot = (v) => [v[0] * c - v[1] * sn, v[0] * sn + v[1] * c, v[2]]
  if (!s.length || !h || h.face) return undefined
  const [, a, e] = s[1] ?? s[0], U = unit(sb3(s[0][2], s[0][1]))
  return { at: rot(s[1] ? lerp(a, e, 0.6) : e), edge: rot(s[1] ? unit(sb3(e, a)) : edgeOf(h, U)), haft: rot(U) }
}
// (how far a thing turned about its haft from one frame to the next, beyond what the haft's own swing carries: the edge
// before, swung by the turn that takes the haft before to the haft now, against the edge now; degrees)
const twistOf = (b, c) => {
  const k0 = cross(b.haft, c.haft), sn = Math.hypot(...k0), cs = dot3(b.haft, c.haft), k = sn > 1e-6 ? sc3(k0, 1 / sn) : [0, 0, 0]
  const v = ad3(ad3(sc3(b.edge, cs), sc3(cross(k, b.edge), sn)), sc3(k, dot3(k, b.edge) * (1 - cs))), w = unit(sb3(v, sc3(c.haft, dot3(v, c.haft))))
  return (Math.acos(Math.max(-1, Math.min(1, dot3(w, c.edge)))) * 180) / Math.PI
}
const headVol = (H, parts, P) => { const { key, field } = headWorn(H, parts, P); return radialOf(key, field) }
// (a frame's flaws in its move: a chop's elbows, a swing's edge against its way (the frames from the wind-up past the
// strike), the strike at the mark (the figure's facing, its head's: an archer's a diagonal off))
const frameFlaws = (F, model, m, i, h, pose = F.pose) => {
  const p = pose(i, h), edged = model.T[1]?.key === "axe" || kindOf(model.T[1]) === "blade", o = { chop: m === "slash" && model.T[1]?.key === "axe" }
  if (m === "slash" && edged && i >= 1 && i <= 3) {
    // (the way it goes: the wind-up's to the strike, the strike's through it, the follow-through's from it)
    const [a, c, e] = [i === 1 ? 1 : i - 1, i, i === 3 ? 3 : i + 1].map((n) => headOfThing(pose(n, h), model))
    if (a && c && e) Object.assign(o, { edge: c.edge, swing: sb3(e.at, a.at) })
  }
  const off = (((p.turn ?? 0) + (p.twist ?? 0) + (p.head ?? 0)) * Math.PI) / 180, mk = [Math.cos(off), Math.sin(off), 0]
  if (p.strike) { const c = headOfThing(p, model); if (c) o.strike = dot3(c.at, mk) - model.trunk.f }
  // (an axe's bit: at the mark or down on it, never away from it, and never flipped from the frame before (the loop round))
  if (model.T[1]?.key === "axe") {
    const c = headOfThing(p, model), b = headOfThing(pose((i + F.frames - 1) % F.frames, h), model)
    if (c && dot3(c.edge, mk) < -0.35) o.away = true
    if (c && b && twistOf(b, c) > 90) o.flip = true
  }
  return flaws(p, model, o)
}
// kit.fit.fight(move, spec): the move as fitted to the spec's body and kept clear (its poses), `raw` its poses before the
// collision model, `flaws(i, heading)` what a human couldn't do left in a frame (raw: in the pose before)
const fitFight = (m, spec) => {
  const s = fillOf(spec), W = wearing(s), B = body(s.body), why = fightWhy(m, W) ?? staffWhy(s, W)
  if (why) throw new Error(`kit.fit.fight: ${why}`)
  const model = modelOf(W, B, headVol(partOf("head", s.head), [W.hair, W.beard].filter(Boolean), W.headwear)), F = lagMove(fitMove(fightMove(m, W, s.staff === "two", !frontGrip(B, W)), B, model), m, B)
  return { frames: F.frames, ms: F.ms, pose: F.pose, raw: F.raw, model, flaws: (i, h, raw) => frameFlaws(F, model, m, i, h, raw ? F.raw : F.pose), thing: (i, h) => headOfThing(F.pose(i, h), model) }
}
// every key a step lighter in its ramp (the ink kept): hurt's flash
// (a metal's four tones, its glint left to the glint: the flash a step, not white)
const LIGHTER = Object.fromEntries([...Object.values(KEYS).map((r) => (r.length === 5 ? r.slice(0, 4) : r)), SKIN + "L", UNDER, "JjhHY"].flatMap((r) => [...r].slice(0, -1).map((k, i) => [k, r[i + 1]])))
// What a fighting frame draws after the figure: the swing's smear behind the steel (from the frame before's blade to
// this one's, in the figure's depth, the steel's own light at its lead and its mid tone at its tail), the shot's streak,
// the cast's light, the flash, the shake; and the anchors a game reads (c.setSocket, in the frame's px, shaken with it):
// `main` and `off` the fists, `tip` the held thing's point or head (a blade's point, a spear's head, a staff's head, an
// arrow's nock), `hit` on the strike's frame (the blade's, the axe's bit, the mace's head, the spear's head, the loosed
// arrow's head, the cast's light), `shield` its middle, `cast` the light while there is one.
const fightDraw = (B, W, FM) => (c, j, p) => {
  const F = frameOf(j, B), M = measure(B)
  // (shaken: the whole figure thrown that far along its facing, its anchors with it)
  const o = j.screen(j.pelvis), sk = p.shake ? j.screen(j.pelvis.map((v, e) => v + j.hd.f[e] * p.shake)).map((v, e) => Math.round(v - o[e])) : [0, 0]
  const put = (n, q) => q && c.setSocket(n, ...j.screen(q).map((v, e) => Math.round(v) + sk[e]))
  const X = [0, 1].map((i) => { const s = i ? "held" : "off", T = W[s]; if (!T) return undefined
    const x = { j, F, W, B, M, s, sd: i ? 1 : -1, A: j.arms[i], G: fistOf(F, j.arms[i]), ...(p.hold?.[i] ? { hold: p.hold[i] } : {}) }
    T.make(x)
    return x })
  // (the swing: the blade's way and its fist the frame before, read off that frame's pose in this frame's shoulders)
  const x = X[1]
  if (p.smear && x?.span) {
    const q = FM.pose((c.frame + FM.frames - 1) % FM.frames, j.heading), A = j.arms[1], tw = ((j.heading + (q.turn ?? 0) + (q.twist ?? 0)) * Math.PI) / 180
    const sf = [Math.sin(tw), Math.cos(tw), 0], sr = [Math.cos(tw), -Math.sin(tw), 0], loc = (v) => [0, 1, 2].map((e) => sf[e] * v[0] + sr[e] * v[1] + UP[e] * v[2])
    let G0, U0
    if (q.grip) { const a = loc(q.grip.from), b = loc(q.grip.to); U0 = unit(b.map((v, e) => v - a[e])); G0 = a.map((v, e) => v + (b[e] - v) * q.grip.at[1]) }
    else { const h = loc(q.hands[1]); G0 = A.sh.map((v, e) => v + h[e]); U0 = unit(loc(q.hold[1].aim)) }
    // (a crescent round the shoulder, from where the steel was to where it is: thin at its tail, the steel's whole span at
    // the blade; a second frame's only its last part, thinner)
    let k0 = 1
    const n = 28, [d0, d1] = x.span, S = A.sh, arc = (d, t) => {
      const v0 = G0.map((v, e) => v + U0[e] * d - S[e]), v1 = x.G.map((v, e) => v + x.U[e] * d - S[e]), w = unit(lerp(unit(v0), unit(v1), t)), l = Math.hypot(...v0) + (Math.hypot(...v1) - Math.hypot(...v0)) * t
      return S.map((v, e) => v + w[e] * l * k0)
    }
    // (its bulge kept a px inside the cell: the crescent drawn smaller round the shoulder where it would pass the edge)
    const s0 = j.screen(S), lim = [c.img.w, c.img.h]
    let fit = 1
    for (let k = 2; k < n; k++) for (const d of [d0, d1]) j.screen(arc(d, k / n)).forEach((q, e) => { const o = q - s0[e], room = o < 0 ? s0[e] - 1 : lim[e] - 2 - s0[e]; if (Math.abs(o) > room) fit = Math.min(fit, room / Math.abs(o)) })
    k0 = fit
    // (behind the figure where they overlap: drawn far behind, only where nothing of it is; bright 3-tone leading edge)
    const back = toUs(j, -60), mv = (a, b) => [a, b].map((q) => q.map((v, e) => v + back[e]))
    for (let k = p.smear < 1 ? 17 : 2; k < n; k++) {
      const t = k / n
      j.rod(...mv(arc(d1 - (d1 - d0) * t * (p.smear < 1 ? 0.5 : 1), t), arc(d1, t)), (s) => (t > 0.68 && s > 0.6 ? KEYS.steel[4] : t > 0.42 && s > 0.42 ? STEEL[3] : STEEL[2]))
    }
  }
  // (mark newly painted pixels as self-emitting in c.img.emit, for cast/conjure/block sparks)
  const markEmit = (before, level = 220) => {
    const d = c.img.data, em = (c.img.emit ??= new Uint8Array(c.img.w * c.img.h))
    for (let i = 0; i < d.length; i++) if (d[i] !== before[i] && d[i] !== 0) em[i] = Math.max(em[i], level)
  }
  // (the loosed arrow: a crisp bright streak ahead of the bow along its way, its head the glint)
  const streak = p.streak && X[0]?.way && p.streak.map((d) => X[0].G.map((v, e) => v + X[0].way[e] * d))
  if (streak) j.rod(...streak, (t) => (t > 0.85 ? KEYS.steel[4] : t > 0.5 ? STEEL[3] : STEEL[2]))
  // (shield block impact spark: crisp star burst over the shield face on impact frames)
  if (p.spark && X[0]?.mid) {
    const before = c.img.data.slice(), r = 3.2 * p.spark, o = X[0].mid.map((q, e) => q + [0, -Math.cos(PITCH), Math.sin(PITCH)][e] * 5)
    for (const [v, s] of [[[1, 0, 0], 1], [[0, 0, 1], 1], [[0.7, 0, 0.7], 0.72], [[0.7, 0, -0.7], 0.72]])
      j.rod(o.map((q, e) => q - v[e] * r * s), o.map((q, e) => q + v[e] * r * s), (t) => (Math.abs(t - 0.5) < 0.32 ? KEYS.steel[4] : GLOW[1]))
    j.rod(o, o, KEYS.steel[4])
    markEmit(before, 240)
  }
  // (the cast's light: a glowing star + core of the gem's tones at the staff's head or before the palm, clamped inside canvas, emitting)
  const light = p.glow && (W.held?.key === "magestaff" ? X[1]?.light : fistOf(F, j.arms[1]).map((v, e) => v + j.sh.f[e] * 1.2))
  if (light) {
    // (drawn 4 px nearer us than its point, where the picture puts it: over the staff's head and the hand that holds it)
    const before = c.img.data.slice(), G3 = KEYS.gem, o = light.map((q, e) => q + [0, -Math.cos(PITCH), Math.sin(PITCH)][e] * 4)
    const sp = j.screen(o), lim = Math.max(0.5, Math.min(sp[0] - 1, c.img.w - 2 - sp[0], sp[1] - 1, c.img.h - 2 - sp[1]))
    const r = Math.min(1.15 + p.glow, lim)
    for (const [v, s] of [[[1, 0, 0], 1], [[0, 0, 1], 1], [[0.7, 0, 0.7], 0.62], [[0.7, 0, -0.7], 0.62]]) j.rod(o.map((q, e) => q - v[e] * r * s), o.map((q, e) => q + v[e] * r * s), (t) => (Math.abs(t - 0.5) < 0.25 ? G3[2] : G3[1]))
    j.rod(o, o, G3[2])
    markEmit(before, 225)
  }
  put("main", fistOf(F, j.arms[1])); put("off", fistOf(F, j.arms[0]))
  put("tip", X[1]?.tip ?? X[0]?.tip)
  if (p.strike) put("hit", light || streak?.[1] || X[1]?.hit || X[0]?.hit)
  if (X[0]?.mid) put("shield", X[0].mid)
  if (light) put("cast", light)
  const info = { ...(p.strike ? { strike: true } : {}), ...(p.flash ? { flash: true } : {}), ...(p.spark ? { blockImpact: true } : {}), ...(p.evade ? { evade: true } : {}), ...(p.kneel ? { downed: true } : {}), ...(p.fallen ? { dead: true } : {}) }
  if (Object.keys(info).length) c.setData(info)
  if (p.flash) c.recolor(LIGHTER)
  if (sk[0] || sk[1]) c.shake(...sk)
}
// universal per-frame socket hook run on EVERY move (including stand, idle, walk, and all combat moves):
// guarantees `head_top`, `center`, `main`, and `off` sockets on every exported frame
const baseDraw = (B, headTopZ) => (c, j, p) => {
  const F = frameOf(j, B), o = j.screen(j.pelvis), sk = p.shake ? j.screen(j.pelvis.map((v, e) => v + j.hd.f[e] * p.shake)).map((v, e) => Math.round(v - o[e])) : [0, 0]
  const put = (n, q) => { if (q && !c.img.sockets?.[n]) c.setSocket(n, ...j.screen(q).map((v, e) => Math.round(v) + sk[e])) }
  const top = j.head.map((v, e) => v + (e === 2 ? headTopZ : 0))
  put("head_top", top)
  put("center", lerp(j.pelvis, j.chest, 0.55))
  put("main", fistOf(F, j.arms[1]))
  put("off", fistOf(F, j.arms[0]))
}

// ---------------------------------------------------------------- the catalog and the slots
// Every slot a spec names, in the order a figure is put together; the empty ones are named for the parts to come
// (ears, horns and a muzzle on a human skull: the wolf's head carries its own; gloves are a piece still to make in the
// arms' slot). The skin is a color.
const SLOTS = ["body", "skin", "head", "face", "ears", "horns", "muzzle", "hair", "beard", "headwear", "torso", "mail", "over", "legs", "feet", "shins", "arms", "hands", "belt", "apron", "shoulders", "cloak", "held", "off", "hip", "back", "tail", "mane"]
const WEAR = ["torso", "over", "legs", "feet", "arms", "belt", "apron", "cloak", "mail", "shoulders", "shins"]
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
  // the classes': generic fantasy outfits, each a set of the pieces above (any of its pieces mixes into another)
  knight: { torso: "gambeson", mail: "mail", over: "breastplate", shoulders: "pauldrons", arms: "vambraces", hands: "gauntlets", belt: "belt", apron: "tabard", legs: "trousers", feet: "boots", shins: "greaves" },
  manatarms: { torso: "gambeson", mail: "mail", legs: "trousers", feet: "boots", belt: "belt", hands: "gloves" },
  ranger: { torso: "shirt", over: "jerkin", arms: "bracers", legs: "breeches", feet: "highboots", belt: "belt", cloak: "travel" },
  rogue: { torso: "shirt", over: "studded", hands: "gloves", legs: "trousers", feet: "highboots", belt: "sash" },
  mage: { torso: "robe", legs: "trousers", feet: "shoes", belt: "sash" },
  cleric: { torso: "gambeson", mail: "mail", apron: "vestments", legs: "trousers", feet: "boots", belt: "belt" },
  monk: { torso: "habit", legs: "trousers", feet: "bare", belt: "sash" },
  barbarian: { over: "jerkin", shoulders: "furs", arms: "bracers", legs: "canvas", feet: "boots", belt: "belt" },
  noble: { torso: "shirt", over: "coat", legs: "breeches", feet: "highboots", belt: "sash" },
  peasant: { torso: "tunic", legs: "rolled", feet: "bare", arms: "rolledup", belt: "sash" },
}
const parts = {
  ...Object.fromEntries(Object.entries(BODIES).map(([k, b]) => [k, { slot: "body", is: b.is }])),
  ...HEADS, ...FACES, ...EARS, ...HORNS, ...PARTS, ...Object.fromEntries(Object.entries(BEAST).flatMap(([s, T]) => Object.entries(T).map(([k, t]) => [`${k}_${s}`, t]))),
  // (the flat cap and the bandana as headwear beside the crew's hairs that have them welded on)
  ...Object.fromEntries(Object.entries(HATS).map(([k, P]) => [PARTS[k] ? `${k}_headwear` : k, P])),
  ...THINGS,
  ...Object.fromEntries(Object.entries(OUTFITS).map(([k, o]) => [`${k}_outfit`, { slot: "outfit", is: `a whole outfit: ${Object.values(o).join(", ") || "the bare mannequin"}`, set: o }])),
}

// ---------------------------------------------------------------- a character from a spec
// spec: { body, digi, line, head, face, ears, horns, hair, beard, headwear, outfit, torso, over, legs, feet, arms, belt, apron, cloak, held, off, hip,
// back, tail, colors: { torso, trim, over, legs, feet, belt, apron, cloak, hat, band, helm, metal, wood, steel, fit, gear,
// face, pack, gem, fletch, horns, wings, visor, skin, hair, fur, scales, bones, chassis, eyes }, seed, moves, dirs }: each slot a part's name ("none"
// leaves it empty), a whole outfit the pieces it doesn't name; with `seed` what it doesn't say is drawn (kit.random's),
// else the defaults (his body, his head and hair, his outfit's pieces; his cloak and belt only by name). `digi: true`
// sculpts 3-segment digitigrade hind legs on any body; `line: "dark" | "ink"` picks internal part-seam lines (default
// "dark" for cleaner armor/garment readability, outer silhouette always ink).
const figures = new Map()
// Full 3D 8-frame walk cycle across all 8 headings: real forward/back leg stride even in front/back (S/N) views,
// alternating knee lift, natural trailing heel push-off, smooth opposite arm swing, shoulder counter-twist (head counter-locked forward),
// and subtle lateral weight shift over each planted stance leg.
const KIT_WALK = {
  frames: 8, ms: 110,
  pose: (i, h) => {
    const t = i / 8, ph = 2 * Math.PI * t, sn = Math.sin(ph), cs = Math.cos(ph)
    const a = Math.abs(Math.sin((h * Math.PI) / 180)), front = a < 0.1, prof = a > 0.9
    const S = front ? 3.8 : prof ? 4.4 : 3.9, U = front ? 3.4 : prof ? 2.6 : 2.3
    const down = (front ? [0, 0.85, 1.65, 0.85, 0, 0.85, 1.65, 0.85] : prof ? [0, 0.9, 1.8, 0.9, 0, 0.9, 1.8, 0.9] : [0, 0.7, 1.4, 0.7, 0, 0.7, 1.4, 0.7])[i]
    const fwd = (k) => { const u = (((t + (k ? 0.5 : 0) - 0.25) % 1) + 1) % 1; return u < 0.5 ? S * (1 - 4 * u) : -S * Math.cos(2 * Math.PI * (u - 0.5)) }
    const f = [fwd(0), fwd(1)], lift = [U * Math.max(0, cs), U * Math.max(0, -cs)]
    const feet = [[f[0], -TB.hips], [f[1], TB.hips]]
    const heel = [0, 1].map((k) => (lift[k] < 0.05 && f[k] < -0.5 ? (front ? 2.1 : prof ? 2.5 : 2.05) * Math.min(1, -f[k] / S) : 0))
    const point = [0, 1].map((k) => (lift[k] > 0.3 ? (f[k] < 0 ? 20 : -8) : null))
    const hands = [0, 1].map((k) => {
      const s = k ? sn : -sn, sd = k ? 1 : -1
      const fw = s > 0 ? (front ? 3.8 : 4.0) * s : 3.2 * s
      // pendulum shoulder arc: hands rise gently at both forward and back swing peaks (stays within upper+fore reach on every body)
      const up = s > 0 ? (front ? 2.2 : 1.7) * s : (front ? 1.1 : 0.9) * -s
      const side = front ? sd * (1 - 0.45 * s) : sd * (0.8 - 0.6 * a)
      return [fw, side, -6.3 + up]
    })
    const twist = -(front ? 11 : prof ? 7 : 9) * sn, tilt = (front ? 2.8 : 1.4) * cs
    return { feet, lift, heel, point, down, lean: front ? 3.5 : 4, twist, head: -twist, tilt,
      elbow: [-1, 0.5, -0.5],
      trail: front ? 0.55 : 1 + 0.3 * Math.abs(Math.sin(ph - 0.8)),
      sway: front ? Math.sin(ph) : Math.sin(ph - 0.8) * (1 - a), hands }
  },
}
// Energetic 8-frame sprint/run cycle across all 8 headings (inspired by 3D mocap run.json + classic RPG run sheets):
// strong forward lean, crouched impact absorption + toe push-off + airborne flight phase (air: true), high trailing heel kick,
// bent pumping runner's arms, pronounced shoulder counter-twist (head counter-locked forward), and strong cloak/hair trail.
const RUN_F = [2.2, -3.2, -5.2, -4.4, -3.0, 1.8, 5.0, 4.2]
const RUN_U = [0, 0, 2.6, 4.4, 4.6, 4.0, 2.8, 1.0]
const RUN_HEEL = [0, 2.2, 0, 0, 0, 0, 0, 0]
const RUN_PT = [null, null, 45, 48, 42, 18, -6, -12]
const RUN_DN = [2.5, 1.3, -0.8, 0.3, 2.5, 1.3, -0.8, 0.3]
const RUN_AIR = [false, false, true, true, false, false, true, true]
const KIT_RUN = {
  frames: 8, ms: 75,
  pose: (i, h) => {
    const j = (i + 4) % 8, a = Math.abs(Math.sin((h * Math.PI) / 180)), front = a < 0.1, prof = a > 0.9
    const sc = front ? 0.88 : prof ? 1.0 : 0.94
    const feet = [[RUN_F[i] * sc, -TB.hips], [RUN_F[j] * sc, TB.hips]]
    const lift = [RUN_U[i], RUN_U[j]], heel = [RUN_HEEL[i], RUN_HEEL[j]], point = [RUN_PT[i], RUN_PT[j]]
    const ph = (2 * Math.PI * (i + 1)) / 8, sn = Math.sin(ph), cs = Math.cos(ph)
    const hands = [0, 1].map((k) => {
      const s = k ? cs : -cs, sd = k ? 1 : -1
      const fw = s > 0 ? 4.0 * s : 3.6 * s
      const side = front ? sd * (1.2 - 0.55 * s) : sd * (0.9 - 0.5 * a)
      const up = -3.6 + (s > 0 ? 1.2 * s : 0.7 * -s)
      return [fw, side, up]
    })
    const twist = -(front ? 15 : prof ? 11 : 13) * cs, tilt = -(front ? 3.5 : 1.8) * sn
    return { feet, lift, heel, point, down: RUN_DN[i], air: RUN_AIR[i], lean: front ? 14 : 18, twist, head: -twist, tilt,
      elbow: [-1, 0.55, -0.35],
      trail: front ? 1.2 : 1.65 + 0.35 * Math.abs(sn),
      sway: front ? 1.15 * cs : 1.15 * cs * (1 - a), hands }
  },
}
const STAND = { stand: { frames: 1, ms: 250, pose: T.MOVES.idle.pose } }, MOVES = { stand: STAND.stand, ...T.MOVES, walk: KIT_WALK, run: KIT_RUN }
const EMIT_MATS = { [KEYS.gem]: { ramp: KEYS.gem, emit: 0.78 }, [GLOW]: { ramp: GLOW, emit: 0.72 }, [FLAME]: { ramp: FLAME, emit: 1 }, [KEYS.visor]: { ramp: KEYS.visor, emit: 0.85 } }
const partOf = (slot, name) => {
  if (name === undefined || name === "none") return undefined
  const thing = THING_SLOTS.includes(slot)
  const P = slot === "head" ? HEADS[name] : slot === "face" ? FACES[name] : slot === "ears" ? EARS[name] : slot === "horns" ? HORNS[name] : slot === "headwear" ? HATS[name] : BEAST[slot] ? BEAST[slot][name] ?? PARTS[name] : thing ? THINGS[name] : PARTS[name]
  if (thing && P && !P.slots.includes(slot)) throw new Error(`kit: the ${slot} slot doesn't take the '${name}': it goes in the ${P.slots.join(" or the ")}${P.whySlot ? ` (${P.whySlot})` : ""}`)
  if (!P || (!thing && P.slot !== slot)) throw new Error(`kit: no ${slot} '${name}' (${(thing ? Object.values(THINGS).filter((q) => q.slots.includes(slot)) : Object.values(parts).filter((q) => q.slot === slot && q.key)).map((q) => q.key).join(", ") || "none yet"})`)
  return P
}
const fillOf = (spec) => {
  const B = body(spec.body ?? "medium"), s = { ...(spec.seed !== undefined ? randomSpec(spec.seed) : {}), ...spec }
  // (no outfit named: the traveler's pieces where the spec names none, but not his cloak and belt)
  const head = s.head ?? B.head ?? "human", H = HEADS[head], set = s.outfit === undefined ? { ...OUTFITS.traveler, cloak: undefined, belt: undefined } : OUTFITS[s.outfit]
  if (!set) throw new Error(`kit: no outfit '${s.outfit}' (${Object.keys(OUTFITS).join(", ")})`)
  return { ...s, body: s.body ?? "medium", head, hair: s.hair ?? (head === "human" ? "tousled" : "none"), ...(s.horns === undefined && H?.horns ? { horns: H.horns } : {}), ...Object.fromEntries(BEASTLY.map((k) => [k, s[k] ?? set[k] ?? B[k]])), ...Object.fromEntries(WEAR.map((k) => [k, s[k] ?? set[k]])) }
}
// what a spec wears, by slot (or the reason it can't)
const wearing = (s) => {
  if (s.muzzle !== undefined && s.muzzle !== "none") throw new Error("kit: the muzzle slot has no parts yet")
  const W = Object.fromEntries([...WEAR, ...BEASTLY, "face", "ears", "horns", "hair", "beard", "headwear", ...THING_SLOTS].map((k) => [k, partOf(k, s[k])]))
  return W
}
// default head color overrides (fur/scales/bones/chassis) merged under spec colors
const headDefaults = (H) => ({ ...(H.fur ? { fur: H.fur } : {}), ...(H.scales ? { scales: H.scales } : {}), ...(H.bones ? { bones: H.bones } : {}), ...(H.chassis ? { chassis: H.chassis } : {}) })
// compute a full color-swap map for a spec (keys -> hex, used internally by character())
const swapFor = (spec = {}, extraColors = {}) => {
  const s = fillOf(spec), H = partOf("head", s.head), W = wearing(s)
  if (W.hip && !W.belt) W.belt = PIECES.belt
  for (const k of BEASTLY) W[k] = partOf(k, s[k])
  const pieces = WEAR.map((k) => W[k]).filter(Boolean), hw = W.headwear, things = THING_SLOTS.filter((k) => W[k])
  const merged = { ...s.colors, ...extraColors }
  const colors = hw?.withCloak && W.cloak && merged.hat === undefined ? { ...merged, hat: merged.cloak ?? W.cloak.colors.cloak } : merged
  const swap = swapOf({ ...headDefaults(H), ...colors }, [...pieces, ...(W.hands?.colors ? [W.hands] : []), ...(W.horns?.colors ? [W.horns] : []), ...(hw ? [hw] : []), ...things.map((k) => W[k]).reverse()], W.hair?.hat)
  if (W.face?.grey) for (const k of "zsSL") swap[k] = greyed(swap[k])
  return swap
}
// public kit.swap(spec, overrides): maps the rendered character's colors (#hex -> #hex) for sheet() / kit.export() palette slots
const slotSwap = (spec = {}, extraColors = {}) => {
  const from = swapFor(spec), to = swapFor(spec, extraColors), out = {}
  for (const k of Object.keys(to)) if (from[k] && from[k] !== to[k]) out[from[k]] = to[k]
  return out
}
const character = (name, spec = {}) => {
  const s = fillOf(spec), B = body(s.body), H = partOf("head", s.head), W = wearing(s), why = check(W, H) ?? staffWhy(s, W)
  if (why) throw new Error(`kit.character '${name}': ${why}`)
  if (s.line !== undefined && s.line !== "dark" && s.line !== "ink") throw new Error(`kit.character '${name}': line must be "dark" or "ink", got ${JSON.stringify(s.line)}`)
  // (the family's moves, or the fighting ones by what the hands hold)
  for (const m of s.moves ?? []) { const no = !FRAMES[m] && !MOVES[m] ? `no move '${m}' (${[...Object.keys(MOVES).filter((k) => !FRAMES[k]), ...Object.keys(FRAMES)].join(", ")})` : FRAMES[m] && fightWhy(m, W); if (no) throw new Error(`kit.character '${name}': ${no}`) }
  const onHead = [W.ears, W.horns, W.hair, W.beard].filter(Boolean), moves = s.moves ? Object.fromEntries(s.moves.map((m) => [m, FRAMES[m] ? fightMove(m, W, s.staff === "two", !frontGrip(B, W)) : MOVES[m]])) : STAND, fights = s.moves?.some((m) => FRAMES[m])
  // (a thing on the hip brings its own belt where none is worn)
  if (W.hip && !W.belt) W.belt = PIECES.belt
  const pieces = WEAR.map((k) => W[k]).filter(Boolean), hw = W.headwear, things = THING_SLOTS.filter((k) => W[k])
  for (const k of BEASTLY) W[k] = partOf(k, s[k])
  const fc = W.face?.approved || W.face?.own ? undefined : W.face
  const digi = !!(s.digi || B.digi), bony = s.bony ?? (H.key === "skull"), line = s.line ?? "dark"
  const key = JSON.stringify([B.name, digi ? "digi" : "", bony ? "bony" : "", line, H.key, onHead.map((P) => P.key), pieces.map((P) => P.key), BEASTLY.map((k) => W[k]?.key), Object.keys(moves), s.dirs, ...(hw ? [hw.key] : []), ...(things.length ? [things.map((k) => `${k}:${W[k].key}`)] : []), ...(fc ? [fc.key] : []), ...(s.staff ? [`staff:${s.staff}`] : [])])
  if (!figures.has(key)) {
    // (the cell: rig3d's, every part's box at every frame and heading; the head's reach the stand-in for the head stamped
    // by hand, so a bun, a braid, a muzzle, ears, horns or a hat's brim is inside it.)
    const fn = `_kf${figures.size}`, reach = Math.max(H.reach, ...onHead.map((P) => P.reach ?? 0), hw?.reach ?? 0), hd = headOf(H, onHead, hw, fc)
    const walks = (s.moves?.includes("walk") || s.moves?.includes("run") || fights) && W.hair?.hang
    const stillParts = walks ? onHead.map((P) => (P.hang ? { ...P, key: `${P.key}~still`, field: P.still } : P)) : onHead
    const still = walks && headOf(H, stillParts, hw, fc)
    // dynamic combat expressions: only bake expression variants actually used by requested moves (and skipped on closed helms)
    const exprNeeded = new Set()
    if (!hw?.closed) for (const m of Object.keys(moves)) {
      const ex = FT[m]?.expr
      if (typeof ex === "string") exprNeeded.add(ex)
      else if (Array.isArray(ex)) for (const e of ex) if (e) exprNeeded.add(e)
    }
    const exprHeads = {}, exprStill = {}
    for (const ex of exprNeeded) {
      exprHeads[ex] = headOf(H, onHead, hw, fc, ex)
      if (walks) exprStill[ex] = headOf(H, stillParts, hw, fc, ex)
    }
    const pickHead = (walks || exprNeeded.size)
      ? (pose) => {
          const ex = pose.expr, mov = walks && pose.lag?.[0]
          if (ex && exprHeads[ex]) return mov ? exprStill[ex] : exprHeads[ex]
          return mov ? still : hd
        }
      : hd
    const over = [...(things.length ? [...THING_SLOTS, ...(W.back?.split ? ["wingL", "wingR"] : [])] : []), ...(walks ? ["hangtail", "hangtail-1", "hangtail1"] : [])]
    const headTopZ = Math.min(reach, Math.max(5.8, H.reach * 0.72, hw?.reach ? hw.reach * 0.75 : 0))
    figures.set(key, { fn: own(fn), R: rig3d(fn, { ...T.FIG, inner: line === "ink" ? "k" : "dark", mats: { ...T.FIG.mats, ...EMIT_MATS },
      w: undefined, h: undefined, pivot: undefined, body: { ...B.body, r: { ...rOf(B), head: reach } }, head: pickHead,
      parts: worn(B, W, digi, H.skin, bony), draw: baseDraw(B, headTopZ), ...(over.length ? { over } : {}), ...(things.length || fights ? { mirror: false } : {}),
      moves: Object.fromEntries(Object.entries(moves).map(([m, M]) => {
        // (a fighting move: its own hands and holds, fitted to the body, its draw the smear, the light and the anchors)
        if (M.fight) { const F = lagMove(fitMove(M, B, modelOf(W, B, headVol(H, onHead, hw))), m, B); return [m, { frames: F.frames, ms: F.ms, pose: F.pose, draw: fightDraw(B, W, F), ...(s.dirs ? { dirs: s.dirs } : {}) }] }
        return [m, { ...(s.moves && m !== "stand" ? lagMove(fitMove(gripMove(M, W), B), m, B) : fitMove(gripMove(M, W), B)), ...(s.dirs ? { dirs: s.dirs } : {}) }]
      })) }) })
  }
  const { R, fn } = figures.get(key), pre = fn.length, swap = swapFor(s)
  const names = R.names.map((n) => { anim(name + n.slice(pre), { base: n, swap }); return name + n.slice(pre) })
  group(name, names)
  return { ...s, names, cell: { get w() { return R.w }, get h() { return R.h }, get pivot() { return R.pivot } } }
}

// ---------------------------------------------------------------- on the fly
// a spec drawn from a seed (hash()'s, the same every time): a body, its head, a hair that fits it (and a beard, one in
// three), a whole outfit (the classes' among them) or its pieces mixed (half of them; mail a time in five, a shoulders',
// a shins' or a hands' piece about one in seven), a cloak one in four, a color for each slot; drawn again
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
      ...(whole ? set : { torso: pick(of("torso")), over: maybe("over", 0.5), legs: pick(of("legs")), feet: pick(of("feet")), arms: pick(of("arms")), belt: maybe("belt", 0.4), apron: maybe("apron", 0.2),
        mail: maybe("mail", 0.2), shoulders: maybe("shoulders", 0.15), shins: maybe("shins", 0.15), ...(r() < 0.15 ? { hands: pick(of("hands")) } : {}) }),
      cloak: r() < 0.25 ? "travel" : "none",
      colors: { torso: pick(["white", "linen", "tweed", ...cloth]), trim: pick(cloth), over: pick(cloth), legs: pick(cloth), feet: pick(leather), belt: pick(leather), apron: pick(leather), cloak: pick(cloth), hat: pick(cloth), metal: pick(metal),
        ...(head === "wolf" ? { fur: pick(Object.keys(FURS)) } : { skin: pick(["fair", "tan", "brown", "deep"]), hair: pick(Object.keys(HAIRS)) }), eyes: pick(Object.keys(EYES)) } }
    // (the armor's colors: one metal for the plate, a leather for bracers and gloves, a fur for a mantle)
    const m = pick(Object.keys(METALS)), lea = pick(leather)
    Object.assign(s.colors, { mail: pick(["iron", "steel"]), plate: m, shoulders: s.shoulders === "furs" ? pick(["fur", "greyfur", "whitefur"]) : m, arms: s.arms === "bracers" ? lea : m,
      hands: s.hands === "gloves" ? lea : m, shins: m, device: pick(["white", "mustard", ...cloth]) })
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
  const h = headOf(H, [W.ears, W.horns, W.hair, W.beard].filter(Boolean), W.headwear, W.face), swap = swapOf({ ...headDefaults(H), ...s.colors }, [...(W.horns?.colors ? [W.horns] : []), ...(W.headwear ? [W.headwear] : [])], W.hair?.hat)
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
  const fn = `_kt${thingsMade++}`, R = rig3d(fn, { ...T.FIG, w: undefined, h: undefined, pivot: undefined, body: { ...B.body, r: rOf(B) }, mirror: false, mats: { [WOOD]: WOOD, ...EMIT_MATS },
    parts: (j) => { const F = frameOf(j, B), out = carried(F, W, B, bare(F)); return Object.fromEntries(Object.entries(out).filter(([k]) => !k.startsWith("strap"))) },
    moves: { stand: { ...fitMove(gripMove(STAND.stand, W), B), ...(o.dirs ? { dirs: o.dirs } : {}) } } })
  const pre = own(fn).length, swap = swapOf(o.colors, [P])
  for (const n of R.names) anim(name + n.slice(pre), { base: n, swap })
  return name
}
// ---------------------------------------------------------------- generic character sheet exporter
// kit.export(name, spec, opts?): engine-agnostic character packager supporting atlas, per-dir, or strips layouts,
// direction & move presets, alias renaming, uniform cell + bottom pivot alignment, hash/array/grid manifests,
// upscale, palette slots, and structured metadata (moves, timings, loops, walk pace, sockets).
const DIR_PRESETS = { "4": ["sw", "se", "nw", "ne"], "4card": ["s", "e", "n", "w"], "8": ["s", "sw", "w", "nw", "n", "ne", "e", "se"] }
const LOOP_MOVES = new Set(["stand", "idle", "walk", "run", "ready", "conjure", "weak", "downed"])
const exportChar = (name, spec = {}, opts = {}) => {
  const allowed = ["layout", "dirs", "moves", "aliases", "cell", "pivot", "pad", "extrude", "format", "scale", "slots", "keepAnims", "meta"]
  for (const k of Object.keys(opts)) if (!allowed.includes(k)) throw new Error(`kit.export '${name}': unknown option '${k}' (allowed: ${allowed.join(", ")})`)
  const layout = opts.layout ?? "atlas"
  if (!["atlas", "per-dir", "strips"].includes(layout)) throw new Error(`kit.export '${name}': layout must be "atlas", "per-dir" or "strips", got ${JSON.stringify(layout)}`)
  const dirsSpec = opts.dirs ?? spec.dirs ?? "4"
  const dirs = typeof dirsSpec === "string" ? (DIR_PRESETS[dirsSpec] ?? (() => { throw new Error(`kit.export '${name}': unknown dirs preset '${dirsSpec}' (use "4", "4card", "8" or an array of directions)`) })()) : dirsSpec
  const sFilled = fillOf(spec), W = wearing(sFilled)
  const compatFight = (list) => list.filter((m) => !fightWhy(m, W))
  const movesSpec = opts.moves ?? spec.moves ?? "basic"
  const moves = Array.isArray(movesSpec) ? movesSpec
    : movesSpec === "basic" ? ["idle", "walk"]
    : movesSpec === "combat" ? ["idle", "walk", ...compatFight(["ready", "slash", "thrust", "shoot", "conjure", "cast", "block", "dodge", "hurt", "weak", "downed", "dead"])]
    : movesSpec === "all" ? ["stand", "idle", "walk", "run", ...compatFight(Object.keys(FRAMES))]
    : (() => { throw new Error(`kit.export '${name}': moves must be "basic", "combat", "all" or a move list, got ${JSON.stringify(movesSpec)}`) })()
  const animPrefix = opts.keepAnims ? name : `_${name}`
  const built = character(animPrefix, { ...spec, dirs, moves })
  const mAlias = opts.aliases?.moves ?? {}, dAlias = opts.aliases?.dirs ?? {}, sAlias = opts.aliases?.sockets ?? {}
  const moveLabel = (m) => mAlias[m] ?? m, dirLabel = (d) => dAlias[d] ?? d
  const moveInfo = Object.fromEntries(moves.map((m) => {
    const label = moveLabel(m), F = FT[m]
    const ms = F ? (F.heavy && kindOf(W.held) !== "blade" ? F.heavy : F.ms) : m === "stand" ? [250] : Array(MOVES[m].frames).fill(MOVES[m].ms)
    return [label, {
      ...(label !== m ? { source: m } : {}),
      frames: ms.length,
      ms,
      loop: LOOP_MOVES.has(m),
      ...(F?.strike !== undefined ? { strikeFrame: F.strike } : {}),
      ...(m === "walk" || m === "run" ? { pace: Object.fromEntries(dirs.map((d) => [dirLabel(d), +(pace(sFilled, d) * (m === "run" ? 1.55 : 1)).toFixed(3)])) } : {}),
    }]
  }))
  const baseSockets = ["head_top", "center", "main", "off", ...(moves.some((m) => FRAMES[m]) ? ["tip", "hit", "shield", "cast"] : [])].map((k) => sAlias[k] ?? k)
  const commonOpts = {
    cell: opts.cell ?? "auto",
    pivot: opts.pivot ?? "bottom",
    ...(opts.pad !== undefined ? { pad: opts.pad } : {}),
    ...(opts.extrude !== undefined ? { extrude: opts.extrude } : {}),
    ...(opts.format !== undefined ? { format: opts.format } : {}),
    ...(opts.scale !== undefined ? { scale: opts.scale } : {}),
    ...(opts.slots !== undefined ? { slots: opts.slots } : {}),
    ...(Object.keys(sAlias).length ? { sockets: sAlias } : {}),
  }
  const sheets = []
  if (layout === "atlas") {
    const entries = [], names = {}
    for (const d of dirs) for (const m of moves) {
      const src = `${animPrefix}_${m}_${d}`
      entries.push(src)
      names[src] = `${moveLabel(m)}_${dirLabel(d)}`
    }
    sheet(name, entries, { ...commonOpts, rows: "tag", names, meta: { character: name, layout, dirs: dirs.map(dirLabel), moves: moveInfo, sockets: baseSockets, ...(opts.meta ?? {}) } })
    sheets.push(name)
  } else if (layout === "per-dir") {
    for (const d of dirs) {
      const dl = dirLabel(d), sName = `${name}_${dl}`, entries = [], names = {}
      for (const m of moves) {
        const src = `${animPrefix}_${m}_${d}`
        entries.push(src)
        names[src] = moveLabel(m)
      }
      sheet(sName, entries, { ...commonOpts, rows: "tag", names, meta: { character: name, layout, dir: dl, moves: moveInfo, sockets: baseSockets, ...(opts.meta ?? {}) } })
      sheets.push(sName)
    }
  } else {
    for (const d of dirs) for (const m of moves) {
      const dl = dirLabel(d), ml = moveLabel(m), sName = `${name}_${ml}_${dl}`, src = `${animPrefix}_${m}_${d}`
      const nFrames = moveInfo[ml].frames
      sheet(sName, [src], { ...commonOpts, cols: nFrames, names: { [src]: ml }, meta: { character: name, layout, dir: dl, move: ml, ...moveInfo[ml], sockets: baseSockets, ...(opts.meta ?? {}) } })
      sheets.push(sName)
    }
  }
  return { name, sheets, dirs: dirs.map(dirLabel), moves: moves.map(moveLabel), cell: built.cell, spec: built }
}
// (a character's walk's pace by the compass, px a frame: moved that fast, its planted foot stays put; by its body)
const pace = (spec, dir) => paceOf(body(typeof spec === "string" ? spec : spec?.body ?? "medium"), dir)
Object.assign(kit, { character, random, randomSpec, head, thing, pace, swap: slotSwap, export: exportChar,
  check: (spec) => { const s = fillOf(spec), W = wearing(s); return check(W, partOf("head", s.head)) ?? staffWhy(s, W) ?? (s.moves ?? []).map((m) => FRAMES[m] && fightWhy(m, W)).find(Boolean) },
  body, blocks, parts, SLOTS, OUTFITS, KEYS, RAMPS, SKINS, HAIRS, FURS, SCALES, BONES, CHASSIS, HORN_RAMPS, WING_RAMPS, HEADS, FACES, EARS, HORNS, EYES, HATS, METALS, BEAST, THINGS, GRIPS, WOODS, GEMS,
  fit: { drape: fitDrape, move: fitMove, fight: fitFight },
  FIGHT: Object.fromEntries(Object.keys(FRAMES).map((m) => [m, { frames: FRAMES[m], ms: MS[m], ...(FT[m].heavy ? { heavy: FT[m].heavy } : {}) }])), BODIES,
  _internal: { fillOf, wearing, check, staffWhy, partOf, body, rOf, worn, headOf, swapFor, swapOf, frameOf, fitMove, lagMove, gripMove, fightMove, fightWhy, modelOf, headVol, fightDraw, baseDraw, EMIT_MATS, T, TB, THING_SLOTS, BEASTLY, WEAR, FT, FRAMES, MS, MOVES, STAND, kindOf, LIGHTER, PIECES, HEADS, DIR_PRESETS, LOOP_MOVES } })

// ---------------------------------------------------------------- the library's entries
// each body as flat blocks (bk_<body>_stand_<dir>), and as the bare mannequin (mannequin_<body>_stand_<dir>): drafts
for (const b of Object.keys(BODIES)) {
  blocks(b, b)
  character(`mannequin_${b}`, { body: b, outfit: "bare", hair: "none" })
  card(`mannequin_${b}`, { is: `the kit's mannequin, ${BODIES[b].is}, bare (a draft)`, cells: { "hd2d/24ppm": "✎" },
    vary: { part: "kit.character(name, spec): a body, digi, line, head, face, ears, horns, hair, beard, headwear, torso, over, legs, feet, arms, belt, apron, cloak, held, off, hip, back, colors by slot (kit.parts); kit.random(name, seed); kit.export(name, spec, opts); kit.swap(spec, colors); its blocks bk_" + b + "_stand_<dir>" } })
}
}
