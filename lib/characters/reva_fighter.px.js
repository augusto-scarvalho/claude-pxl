// Reva the fighter, fighting's body (lib/profiles/fighting.px.js): an original woman fighter seen from the side, 110 px
// standing and 101-103 in her stance, in KOF 2002's school (the library's fighting study, measured for numbers only,
// never its pixels): a dark violet bob under a gold headband whose two tails trail behind, a red crop top over a bare
// midriff, a gold sash, loose navy trousers bound at the ankle over slippers, bare arms, the forearms and fists wrapped;
// long legs, a short torso. The chibi Reva (reva.px.js) is the same woman at topdown16.
// Made in 3D on her rig (rig3d(), one heading) with her head drawn by hand: the body painted by surface() as Guilty
// Gear Xrd paints a model for its one camera (each material a ramp cut where its terminator should fall, the shadows
// and creases drawn by design, the trousers' folds placed from the side the camera sees), a cleanup by rule over each
// frame; the head drawn at 3/4 (the guard's, a shout's, the hurt's) and stamped between the body and the near arm, her
// guard's fist before her face. 18 colors; a line by material (each part's own darkest), black on the hair and the
// shoes (the genre's ink). Idle (8 x 100 ms), strike (a rear cross: startup 2, active 2, recovery 3 at
// 60/40/60/80/80/80/100) and hurt (thrown back, then back over half of it) facing e, the game flips her for w; the
// feet on one row through every move (the genre's ground). Each frame's hurt boxes (head, body, legs, the punching arm
// while it is out) and hit box (round the fist on the active frames), from her joints, and its data { phase, damage,
// hitstun }; 3 palette slots (base, jade, dusk: 11 keys swapped) on the sheet reva_fighter for an engine to recolor.
// Taken with include("<path>/lib/characters/reva_fighter.px.js", { as: "reva_fighter" }): reva_fighter.idle, .strike,
// .hurt; revaFighter.SLOTS a slot's swap (stamp(..., { swap: revaFighter.SLOTS.jade })).
include("../profiles/fighting.px.js")
// the values set from the references' lightness (OKLab), hue and chroma her own: skin line 0.37, shadow band 0.52,
// plane 0.73, lit 0.89; the trousers a dark cloth (0.25, 0.42, folds' ridges 0.66); the top a red (0.42, 0.60); the sash
// a gold (0.58, 0.80) (characters §14). 18 colors, every ramp from the ink: skin, hair, top, trousers (the shoes too),
// sash, wraps; the hair and the sash a third, light tone (0.57 and 0.92: the fighting study's shares, the hair its own
// material in every model, the sash her third-biggest after the trousers and the skin)
pal({ k: "#1a1220", S: "#652c23", s: "#9c5135", z: "#db956d", Z: "#ffd0ab", H: "#362b4f", h: "#534370", J: "#7d6aa8", R: "#783345", r: "#cc525b", N: "#191f3d", n: "#3e4a76", m: "#7d90c6", Y: "#a16e3c", y: "#f0b053", u: "#ffe39a", W: "#8f8478", w: "#e1d7c0" })
ramps("kSszZ", "kHhJ", "kRr", "kNnm", "kYyu", "kWw")
var revaFighter = {}
// in a block: its names stay its own when a scene includes the file
{
// her slots, a swap each of the roles' keys: hair (H h J), top (R r), trousers and shoes (N n m), sash (Y y u); skin and
// wraps kept. Each light a step up in OKLab as far as the base's, in its slot's hue; dusk's pale hair has no room above
// its h, so its h steps down and its old h is the light
const F = genre("fighting"), SLOTS = {
  jade: { R: "#30544b", r: "#4b9176", N: "#27211d", n: "#574c44", m: "#998a7c", Y: "#914741", y: "#d96650", u: "#ef9c73", H: "#44231a", h: "#8b4e3a", J: "#c4735d" },
  dusk: { R: "#40366c", r: "#6659b6", N: "#371d1d", n: "#764242", m: "#c77f78", Y: "#426d75", y: "#58afaf", u: "#a3d0c6", H: "#dccbab", h: "#ede0c4", J: "#fff4dc" } }
const RAD = Math.PI / 180

// ---------------------------------------------------------------- the poses, in her px (rig3d's pose fields)
// Measured on the references' idles and light punches (characters §14): feet 0.82 of her height apart, the weight 0.51
// toward the front foot, the line of action 23 degrees (the genre's pose), leaning 10, the knees bent 11. Her legs long
// and her torso short (the fighting study's models: the hip joint at 0.53 of her height, the women's 0.57, the men's
// 0.52): the hip 58 px over the sole, the thigh 28, the shin 27, the torso 32; the head and her height kept. A lean tips
// the shorter torso as far forward as rig3d's 37 px one went, so the head, the shoulders and the fists stay where the
// poses put them (the strike's reach too). Her foot as long as her shoe, 21 px heel to toe (the models' 23).
// Opened to the camera as the 3D games stand their fighters (their models and in-game stances, characters §14): the
// hips 40 degrees from profile, the chest 60, the head 40, turned to her opponent whatever the shoulders do; the front
// foot 20 open, the rear one turned 78 out (rig3d's toes, its knee over it), its leg nearly straight and its heel flat
// in the guard. On the strike's drive the rear heel rises on its ball, 1.7 px a step, the foot pivoting forward 10
// degrees a step. The near fist under her chin in the guard and kept off the face the drawn head turns to us.
const BODY = { h: 110, heads: 6.5, shoulders: [0, 11.5, -1], hip: 58, thigh: 28, shin: 27, torso: 32, r: { foot: [3.1, 10.5, 3.1] } }
// a foot between the hips' frame at `turn` ([forward, right]) and the floor ([across, away]), the one map both ways: the
// feet planted where they were measured (as the hips turned -70 faced, the strike's as its own), whatever a frame's
// hips do; the rear foot 7.5 px farther back than measured, the leg straighter
const hipsFloor = ([a, b], turn) => { const t = (180 + turn) * RAD; return [a * Math.sin(t) + b * Math.cos(t), a * Math.cos(t) - b * Math.sin(t)] }
const STANCE = { turn: -50, twist: 20, lean: 10, down: 11, feet: [hipsFloor([27, -5], -70), hipsFloor([-34.5, 6], -70)], drive: 0, hands: [[14, 2, 6], [20, -9, -1]] }
const tipped = (lean) => Math.asin(Math.sin((lean * Math.PI) / 180) * 37 / BODY.torso) * 180 / Math.PI
const posed = (o) => { const q = { ...STANCE, ...o }, h = 180 + q.turn
  return { ...q, lean: tipped(q.lean), head: 130 - (h + q.twist), feet: q.feet.map((f) => hipsFloor(f, q.turn)), toes: [h - 110, 168 - 10 * q.drive - h], heel: [0, q.drive * 1.7] } }
// The sash's ends swing a step behind her hips: `sway` [forward, up] px at their tips (in the idle, up as the body
// sinks, down as it rises; on the cross, left behind as the hips drive and swung through on the way back; on the hurt,
// flung forward as she is thrown back).
// the idle: the knees bouncing the body 3 px (the extremes held), the fists a frame late
const BOB = [0, 0.5, 1.5, 2.5, 3, 3, 2, 1]
const idle = (i) => posed({ phase: "idle", down: STANCE.down + BOB[i], hands: STANCE.hands.map((h) => [h[0], h[1], h[2] - BOB[(i + 7) % 8] * 0.6]),
  sway: [0, (BOB[i] - BOB[(i + 7) % 8]) * 0.9] })
// the cross: coil, pull, two frames at full reach (the front foot slid, the rear heel up, the weight forward, the guard
// hand in front of the face, her shout), then back the way it came; feet 0.91, weight 0.64, line 35 degrees
const AT_REACH = [hipsFloor([26, -5], -78), hipsFloor([-41.5, 6], -78)]
const STRIKE = [
  { phase: "startup", twist: 30, down: 12, hands: [[14, 3, 7], [9, -3, 2]], sway: [0.4, 0] },
  { phase: "startup", turn: -54, twist: -6, lean: 14, down: 12, drive: 1, hands: [[11, 0, 7], [21, -4, 5]], sway: [-1.2, 0.4] },
  { phase: "active", turn: -58, twist: -48, lean: 20, down: 13, feet: AT_REACH, drive: 3, hands: [[22, -1, 7], [35, -5, -1]], face: "shout", sway: [-3, 1.2] },
  { phase: "active", turn: -58, twist: -50, lean: 21, down: 13, feet: AT_REACH, drive: 3, hands: [[22, -1, 7], [35.5, -5, -1]], face: "shout", sway: [-2.2, 0.8] },
  { phase: "recovery", turn: -56, twist: -26, lean: 16, down: 12.5, feet: [hipsFloor([26, -5], -76), hipsFloor([-40.5, 6], -76)], drive: 2, hands: [[19, 0, 7], [25, -4, 1]], face: "shout", sway: [-0.4, 0] },
  { phase: "recovery", turn: -52, twist: 6, lean: 12, down: 11.5, hands: [[12, 1, 6], [13, -4, -1]], sway: [1.2, 0] },
  { phase: "recovery", down: 11.5, hands: [[14, 2, 5], [20, -9, -1]], sway: [0.4, 0] },
]
const strike = (i) => posed(STRIKE[i])
// hurt: thrown back from the hips, the head the whole way in the first drawing and back over half of it in the next;
// the guard opened, the fists flung back; the feet planted
const HURT = [
  { phase: "hurt", turn: -46, twist: 16, lean: -16, down: 10, hands: [[16, -2, -10], [2, 6, -22]], face: "hurt", sway: [2.6, 1.2] },
  { phase: "hurt", turn: -48, twist: 19, lean: -3, down: 12.5, hands: [[16, 0, -2], [8, 2, -16]], face: "hurt", sway: [1.2, 0.4] },
]
const hurt = (i) => posed(HURT[i])
const MOVES = { idle: { pose: idle, ms: BOB.map(() => F.states.idle.ms) }, strike: { pose: strike, ms: F.states.strike.ms }, hurt: { pose: hurt, ms: F.states.hurt.ms } }
const W = 130, H = 118, PIV = [52, 114], PITCH = F.camera.pitch, TAN = Math.tan((PITCH * Math.PI) / 180)

// ---------------------------------------------------------------- vectors
const add = (a, b) => a.map((v, e) => v + b[e]), sub = (a, b) => a.map((v, e) => v - b[e]), mul = (a, s) => a.map((v) => v * s)
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], len = (a) => Math.hypot(...a), unit = (a) => mul(a, 1 / (len(a) || 1))
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t) }

// ---------------------------------------------------------------- the tones: where each falls, by design (Xrd's threshold)
// surface() lights each pixel 0..1 from its normal and takes that share up its material's ramp. A material here is a
// ramp of 24 steps over that light, each the tone whose cut it has reached, so its terminator falls where a cut
// says; a part, or a place on it, moves the cuts by a bias (above 0 more shadow), as Xrd moves a vertex's threshold.
// The ramp's first key is its line (surface's ink: true), its next its darkest (the inner line, the deepest crease).
// Skin S s z Z, hair H h J (its line black), top S R r, trousers N n m, shoes N n m (black line), sash Y y u, wraps W w.
const TONE = {
  skin: ["S", "SszZ", [0.08, 0.4, 0.74]], hair: ["k", "HhJ", [0.4, 0.84]], top: ["S", "SRr", [0.08, 0.44]],
  fist: ["W", "SszZ", [0.08, 0.4, 0.74]], tr: ["N", "Nnm", [0.42, 0.88]], shoe: ["k", "Nnm", [0.36, 0.8]], sash: ["Y", "Yyu", [0.4, 0.8]], wrap: ["W", "Ww", [0.4]],
  sole: ["k", "W", []] }
// (where a material's darkest fill is its crease tone, S under the skin and the top, only a crease reaches it: the
// shadows and the terminator's bias move its first cut 0.1 at most, `deep` the rest)
const toon = (m, bias = 0, deep = 0) => { const [line, keys, cuts] = TONE[m], q = (v) => Math.round(v * 20) / 20, crease = keys.length > cuts.length && keys[0] === "S"
  const at = cuts.map((c, k) => c + q(k === 0 && crease ? Math.min(bias, 0.1) + deep : bias + deep)); let s = line
  for (let i = 0; i < 24; i++) { let k = 0; while (k < at.length && i / 23 >= at[k]) k++; s += keys[k] } return s }
// a material with its bias: the place's own, a shadow cast on it, a crease (deep), a light (shine, below 0)
const T = (m, base, cast = 0, occ = 0, shine = 0) => toon(m, base + cast + shine, occ)
// The shadows parts cast on each other and the creases, drawn by design rather than by surface(): its own shadows,
// lit by a light from above toward us, throw the near arm's 8 px down the torso (a long dark smear in a guard), and its
// creases are sampled a fifth of a unit out, a meter's scale: nothing at a figure's px. So a part asks of the bones
// near it: does the way to the light cross one within a few px (a shadow close under it, as drawn), is it within a px
// or two of one (a crease)
const LIGHT = unit([0, -0.6, 0.75])   // rig3d's light, from above toward us
const capD = (p, [a, b, r0, r1]) => { const d = sub(b, a), t = clamp(dot(sub(p, a), d) / (dot(d, d) || 1)); return len(sub(p, add(a, mul(d, t)))) - (r0 + (r1 - r0) * t) }
const shadowed = (p, bones, reach = 6) => { for (let s = 1.2; s <= reach; s += 0.8) { const q = add(p, mul(LIGHT, s)); if (bones.some((B) => capD(q, B) < 0)) return 1 } return 0 }
const nearOf = (p, bones, d) => Math.max(0, ...bones.map((B) => 1 - clamp(capD(p, B) / d)))
// a step in a periodic pattern: |((v mod period) - at)| < w
const band = (v, period, at, w) => Math.abs((((v % period) + period) % period) - at) < w

// ---------------------------------------------------------------- her parts, each painted in its own coordinates
// a capsule from a to b painted by (t along it 0..1, its angle round it from `front` toward `side`, the point, the
// normal, its length)
const bone = (a, b, r0, r1, front, side, paint) => { const d = sub(b, a), L = len(d) || 1, u = mul(d, 1 / L), f0 = unit(sub(front, mul(u, dot(front, u)))), s0 = unit(sub(side, add(mul(u, dot(side, u)), mul(f0, dot(side, f0)))))
  return sdf.capsule(a, b, r0, r1).paint((p, n) => { const q = sub(p, a), o = sub(q, mul(u, dot(q, u))); return paint(clamp(dot(q, u) / L), Math.atan2(dot(o, s0), dot(o, f0)), p, n, L) }) }
// a field built along +y (ahead) and z up, turned to point along d (no roll: its x stays level) and set at p
const aimed = (f, d, p) => f.rotate((Math.asin(clamp(d[2] / (len(d) || 1), -1, 1)) * 180) / Math.PI, "x").rotate((-Math.atan2(d[0], d[1]) * 180) / Math.PI, "z").at(...p)
// the fist in its own frame (y ahead, z up, x across, toward us), upright as she draws it whatever the forearm does
// (only a little of its slope kept): the wrapped hand a rounded block; its knuckles bare, three bumps along its top
// (shaped for the side view, as Xrd shapes a model for its camera: from the side a fist's knuckle row runs away from
// us), a light on each, lined in the wraps' dark as she draws them; the fingers' creases across its front; the thumb
// across its side toward us, lined as a piece of its own; the wraps' bands round the back of the hand
const FIST = (fb) => sdf.union(
  sdf.union(sdf.box([6.6, 7.6, 8.2], { round: 2.5 }).at(0, 0.2, -0.4), ...[-1.4, 0.9, 3.1].map((y) => sdf.sphere(1.45).at(0, y, 3.3)), { smooth: 0.6 })
    // (the knuckles' dents between the bumps; the fingers' two creases across the front; one band at the wrist)
    .paint((p, n) => p[2] > 2.6 && p[1] > -2.6 ? T("fist", fb - 0.04 + (band(p[1] + 9, 2.3, 1.82, 0.35) ? 0.45 : 0), 0, 0, n[2] > 0.6 ? -0.24 : 0)
      : p[1] > 2.4 ? T("wrap", fb + (band(p[2] + 9, 2.1, 1.5, 0.4) ? 0.5 : 0))
        : T("wrap", fb + (p[1] < -2.4 && p[1] > -3.4 ? 0.5 : 0))).part("hand"),
  sdf.capsule([2.9, -1.4, -3.3], [3.1, 3.2, -1.3], 1.3, 1.1).paint(() => T("wrap", fb + 0.08)).part("thumb"))
const fistWay = (fd, f) => { const h = Math.hypot(fd[0], fd[1]) / (len(fd) || 1); return h < 0.35 ? [f[0], f[1], 0] : [fd[0], fd[1], 0.3 * fd[2]] }

// the figure below the head, part by part, for a frame's joints
const parts = (j, p = {}) => {
  const near = j.depth(j.legs[1].hip) > j.depth(j.legs[0].hip) ? 1 : 0, nearArm = j.depth(j.arms[1].sh) > j.depth(j.arms[0].sh) ? 1 : 0
  const out = {}, UP = [0, 0, 1], twist = Math.atan2(dot(j.sh.f, j.r), dot(j.sh.f, j.f))
  // the bones that throw shadows and make creases (with their radii)
  const armB = j.arms.map((A) => [[A.sh, A.elbow, 4.7, 3.6], [A.elbow, A.hand, 3.8, 3.3], [A.hand, A.hand, 4.8, 4.8]])
  const legB = j.legs.map((L) => [[L.hip, L.knee, 7.2, 5.8], [L.knee, L.ankle, 5.8, 4.6]])
  // the torso: the bare waist, the ribs, the bust ahead (the way the shoulders face), swept along her spine
  const waist = j.pelvis[2] + 1.4, top = j.chest[2] + 0.5, lean = sub(j.chest, j.pelvis), hips = [j.pelvis[0], j.pelvis[1], 0], HEM = 0.4
  const along = (h) => { const t = (waist + h * (top - waist) - j.pelvis[2]) / lean[2]; return [lean[0] * t, lean[1] * t] }
  const ahead = (h, a) => a - twist * smooth(0.2, 0.8, h)
  // an hourglass, not a drum: narrowest at the waist, the ribcage widening to under the bust, the bust ahead, and above
  // it the chest rounding in to the shoulders' root; a V from the armpits down to the waist (a drum's straight sides
  // and flat top read as a crate)
  const R = (h, a) => { const b = ahead(h, a), wide = 6 + 3.6 * smooth(0.1, 0.74, h) - 1.6 * smooth(0.8, 1, h)
    return wide * (0.78 + 0.22 * Math.abs(Math.sin(b))) + 4.2 * Math.exp(-(((h - 0.68) / 0.13) ** 2)) * Math.max(0, Math.cos(b)) ** 2 }
  const swept = (z0, z1, rad, shift, paint) => { const P = j.sweep(hips, z0, z1, rad, { shift }); return P.field.paint((q, n) => { const [h, a] = P.at(q); return paint(h, a, q, n) }) }
  // (the midriff: the line down the belly; the top's shadow a px or two under its hem, the arms' on it; the creases at
  // the sash; its heights from the waist, as the top's)
  const z0 = waist - 3, wh = (h) => (z0 + h * (top - z0) - waist) / (top - waist)
  out.torso = swept(z0, top, (h, a) => R(wh(h), a), (h) => along(wh(h)), (h0, a, q) => { const h = wh(h0)
    return T("skin", Math.abs(ahead(h, a)) < 0.13 && h > 0.06 && h < HEM - 0.05 ? 0.32 : 0, (h > HEM - 0.07 && h < HEM + 0.1 ? 0.45 : 0) + 0.4 * shadowed(q, armB.flat()), h < 0.05 ? 0.25 : 0) })
  // the crop top over the chest, its hem a px off the skin, just under the ribs (the waist bare): under the bust a
  // crescent of shadow, the side away in shadow (not the lower half: a band across read as a crate's lid); the arms'
  // shadows, the armpits' creases; a light on the bust's top
  const NECK = 0.9, tH = (h) => HEM + (NECK - HEM) * h
  out.top = swept(waist + HEM * (top - waist), waist + NECK * (top - waist), (h, a) => R(tH(h), a) + 0.9, (h) => along(tH(h)), (h, a, q) => { const b = ahead(tH(h), a)
    return T("top", (Math.abs(b) < 0.9 && tH(h) > 0.5 && tH(h) < 0.58 ? 0.3 : 0) + (Math.abs(b) > 2 ? 0.16 : 0), 0.4 * shadowed(q, armB.flat()), 0.5 * nearOf(q, armB.map((B) => B[0]), 2.2), Math.abs(tH(h) - 0.74) < 0.08 && Math.abs(b) < 0.9 ? -0.2 : 0) })
  // its straps from the neckline over the shoulders' tops, lying on the skin where it is lit, so they read (on the slope
  // by the neck they stood in the air behind it, and in its shadow they were lost); each by its arm's side, the near one
  // drawn with the near arm, over its shoulder; no line of their own (tidy's "straps")
  for (const i of [0, 1]) { const o = add(j.chest, mul(j.sh.r, i ? 8 : -8)), crest = add(o, [0, 0, 2.3]), at = (fw) => add(o, add(mul(j.sh.f, fw), [0, 0, -3]))
    out[`strap${i}`] = sdf.capsule(at(5.5), crest, 1).union(sdf.capsule(crest, at(-5.5), 1)).paint(() => T("top", 0.04)) }
  // the sash wound round the hips over the trousers' top, 5 px, lower at her front than at her back (it sits on the
  // hip bones): its upper edge in the light, its lower in shadow, creases pulled toward the knot. The knot at the front
  // of her hips toward us, its top in the light; two ends hanging from it, the longer near us, tapering, a light ridge
  // down each, swung by the pose's sway (their middles half as far)
  const kn = (fw, rt, z) => add(add(hips, add(mul(j.f, fw + 1.4), mul(j.r, rt))), [0, 0, waist + z]), kA = Math.atan2(4, 11)
  const mid = (a) => waist + 0.9 - 0.4 * Math.cos(a), sz0 = waist - 2.6, sz1 = waist + 4.4
  const band5 = j.sweep(hips, sz0, sz1, (h, a) => 10.4 - 0.6 * Math.abs(Math.sin(a)) + 0.3 * h, { keep: (h, a) => Math.abs(sz0 + h * (sz1 - sz0) - mid(a)) < 2.5 })
  out.sash = band5.field.paint((q, n) => { const a = band5.at(q)[1], u = (q[2] - mid(a)) / 2.5, d = Math.atan2(Math.sin(a - kA), Math.cos(a - kA))
    const crease = Math.abs(d) > 0.35 && Math.abs(d) < 1.1 && band(u * 2.5 + Math.abs(d) * 5, 4.2, 2.1, 0.6)
    return T("sash", 0.04 + (crease ? 0.36 : 0), 0, u < -0.55 ? 0.25 : 0, u > 0.5 && n[2] > -0.1 ? -0.3 : 0) })
  const sway = p.sway ?? [0, 0], swung = (q, k) => add(q, add(mul(j.f, sway[0] * k), [0, 0, sway[1] * k]))
  const end = (a, b, r0, r1) => { const m = swung(mul(add(a, b), 0.5), 0.45), rm = (r0 + r1) / 2, paint = (t) => (t2, ang) => T("sash", t + t2 / 2 > 0.85 ? 0.28 : 0.04, 0, 0, Math.abs(ang - 0.6) < 0.5 ? -0.25 : 0)
    return sdf.union(bone(a, m, r0, rm, j.f, j.r, paint(0)), bone(m, swung(b, 1), rm, r1, j.f, j.r, paint(0.5)), { smooth: 0.6 }) }
  out.knot = [sdf.ellipsoid([2.8, 2.1, 2.4]).at(...kn(9.9, 3.9, 0.2)).paint((q, n) => T("sash", n[2] < -0.4 ? 0.3 : 0.04, 0, 0, n[2] > 0.3 ? -0.3 : 0)),
    end(kn(10.2, 4.8, -1.4), kn(11.2, 6, -12.2), 1.9, 1.1), end(kn(9.8, 3, -1.2), kn(10.6, 1.8, -8.7), 1.6, 1)]
  // the neck, in the jaw's shadow
  out.neck = sdf.capsule(sub(j.chest, [0, 0, 2]), add(j.head, [0, 0, -4]), 3.1, 2.8).paint((q) => T("skin", 0.04, q[2] > j.head[2] - 6.2 ? 0.36 : 0))
  // the trousers: loose, the seat round her hips, each leg a thigh and a shin, the cuff gathered over the shoe and
  // bound at the ankle; painted along and round each bone: the terminator down the back and the inner thigh, the
  // calf; the folds; the sash's shadow under it, the near leg's on the far one. The hem gathered over the ankle's
  // wrap, its edge level 7.2 px over the ankle (10.2 over the sole), no wider than the shoe and a px each side: the
  // shoe below it whole
  // (the point on the shin z px over the ankle: the shin's own line, the rig's ankle where the foot puts it)
  const shinAt = (L, z) => { const d = unit(sub(L.knee, L.ankle)); return add(L.ankle, mul(d, z / d[2])) }
  const legs = j.legs.map((L, i) => {
    const far = i !== near, inner = mul(j.r, i ? -1 : 1), cuffAt = shinAt(L, 8), lb = far ? 0.06 : 0
    const sashSh = (q) => (q[2] > waist - 6.2 ? 0.38 : 0), legSh = (q) => (far ? 0.32 * shadowed(q, legB[near], 9) : 0)
    // the folds as loose cloth makes them, not streaks along the bone: each a spindle on the cloth unwrapped (t along
    // the bone, a round it from the front toward the inner side, in px by the leg's radius), pointed at both ends and
    // widest in its middle, running from where the cloth is pulled: its groove a step darker (two behind the knee, the
    // deepest), a lit ridge along one side. The thigh: two drag folds from the crotch, high on the inner side, round to
    // the front over the knee; a bent knee: short folds bunched across its back, the cloth taut and lit over its front;
    // the shin: three pipe folds fanning up from the cuff, where the cloth is gathered.
    const bend = Math.acos(clamp(dot(unit(sub(L.knee, L.hip)), unit(sub(L.ankle, L.knee))), -1, 1)) / RAD
    const spindle = (t, a, len, R, [t0, a0, t1, a1, w, deep = 0.42, side = 1]) => { const x = t * len, y = a * R, x0 = t0 * len, y0 = a0 * R, dx = t1 * len - x0, dy = a1 * R - y0
      const L2 = dx * dx + dy * dy, s = ((x - x0) * dx + (y - y0) * dy) / L2; if (s <= 0 || s >= 1) return 0
      const d = (side * ((x - x0) * dy - (y - y0) * dx)) / Math.sqrt(L2), half = 2 * w * s * (1 - s)
      return Math.abs(d) < half ? deep : d >= half && d < half + 1 ? -0.3 : 0 }
    const folds = (t, a, len, R, list) => { for (const F of list) for (const a2 of [a, a + 2 * Math.PI, a - 2 * Math.PI]) { const v = spindle(t, a2, len, R, F); if (v) return v } return 0 }
    // (each fold's `a` from the side of the bone that faces the camera, the knee's from the inside of its bend: as Xrd
    // shapes a model for its one camera, so the folds fall where they are seen whichever way the leg is turned)
    const roundOf = (a, b, d) => { const u = unit(sub(b, a)), f0 = unit(sub(j.f, mul(u, dot(j.f, u)))), s0 = unit(sub(inner, add(mul(u, dot(inner, u)), mul(f0, dot(inner, f0))))); return Math.atan2(dot(d, s0), dot(d, f0)) }
    const CAM = [0, -1, TAN], bendIn = sub(mul(add(L.hip, L.ankle), 0.5), L.knee), bunched = bend > 20
    const v1 = roundOf(L.hip, L.knee, CAM), b1 = roundOf(L.hip, L.knee, bendIn), v2 = roundOf(L.knee, cuffAt, CAM), b2 = roundOf(L.knee, cuffAt, bendIn)
    const THIGH = [[0.05, 1.3, 0.75, -0.6, 2.8], [0.32, 1.4, 0.95, -0.1, 2.2]], SHIN = [[0.3, -1.1, 0.97, -0.4, 2.6], [0.25, 0.1, 0.97, 0.15, 2.4], [0.35, 1.2, 0.97, 0.6, 2.6]]
    const KNEE1 = [[0.84, -1, 0.9, 1, 1.8, 0.6, -1], [0.72, -0.8, 0.77, 0.8, 1.5, 0.42, -1]], KNEE2 = [[0.06, -1, 0.1, 1, 1.8, 0.6, -1]]
    const taut = (on) => (on && bunched ? -0.15 : 0), off = (a, r) => Math.abs(Math.atan2(Math.sin(a - r), Math.cos(a - r)))
    const thigh = bone(L.hip, L.knee, 7.4, 5.9, j.f, inner, (t, a, q, n, len) => T("tr", lb + (Math.abs(a) > 2.25 ? 0.22 : a > 1 && a < 2.25 ? 0.14 : 0)
      + ((bunched && folds(t, a - b1, len, 6.6, KNEE1)) || folds(t, a - v1, len, 6.6, THIGH) || taut(t > 0.82 && off(a, b1 + Math.PI) < 0.9)), sashSh(q) + legSh(q)))
    const shin = bone(L.knee, cuffAt, 5.9, 4.9, j.f, inner, (t, a, q, n, len) => T("tr", lb + (Math.abs(a) > 2.25 ? 0.2 : Math.abs(a) > 1.6 && t < 0.5 ? 0.12 : 0)
      + ((bunched && folds(t, a - b2, len, 5.4, KNEE2)) || folds(t, a - v2, len, 5.4, SHIN) || taut(t < 0.18 && off(a, b2 + Math.PI) < 0.9)), legSh(q)))
    // the hem: the trousers gathered into a ring over the wrap, a fold round it
    const hem = sdf.ellipsoid([4, 4.2, 1.7]).at(...shinAt(L, 8.4))
      .paint((q) => T("tr", lb + (band(Math.atan2(q[1] - L.ankle[1], q[0] - L.ankle[0]) * 4 + 9, 2.4, 0.6, 0.5) ? 0.3 : -0.08), legSh(q), 0.2))
    const seat = far ? [sdf.ellipsoid([9.2, 9.6, 8.2]).at(j.pelvis[0], j.pelvis[1], waist - 5.6).paint((q) => T("tr", 0.1, sashSh(q), nearOf(q, legB[near], 3) * 0.45))] : []
    return sdf.union(thigh, shin, hem, ...seat, { smooth: 1.6 }).intersect(sdf.plane([0, 0, 1], waist - 1.4), sdf.plane([0, 0, -1], -(L.ankle[2] + 7.2)))
  })
  out.legFar = legs[1 - near]; out.legNear = legs[near]
  // the ankles' wraps between the hem and the shoe: bands round the ankle, 3.1 px out (the shoe's width), along the
  // shin from the instep's root (1.6 px over the ankle) up under the hem
  out.wraps = j.legs.map((L, i) => { const lb = i !== near ? 0.14 : 0
    return sdf.capsule(shinAt(L, 1.6), shinAt(L, 7.4), 3, 3.2).paint((q) => T("wrap", lb + (band(q[2] - L.ankle[2] + 12, 1.9, 0.9, 0.4) ? 0.5 : 0))) })
  // the shoes: slippers 21 px on the rig's sole, from its heel to its toe along the foot's heading; a heel block at the
  // back, the instep falling from the ankle's root (5.4 px) to a low round toe box (2.3 px over the sole); a sole of its
  // own value (the wraps' W), a line of 1.2 px (thicker, the rear foot turned to us showed its heel's sole as a block);
  // the shoe a step darker, its light a ridge along the instep's top, a hit on the toe cap. A lifted heel bends the shoe
  // at the ball as the rig's foot bends: the toe box flat on the floor, what is behind the ball turned up with the heel
  // (a point t of the way heel to toe and h up off the sole: behind the ball on the heel's slope, past it on the floor)
  out.shoes = j.legs.map((L, i) => {
    const f = [Math.sin(L.heading * RAD), Math.cos(L.heading * RAD), 0], rb = unit(sub(L.heel, L.ball)), uR = cross(rb, unit(cross(f, UP)))
    const lb = len(sub(L.heel, L.ball)), lf = len(sub(L.toe, L.ball)), tb = lb / (lb + lf)
    const at = (t, h) => t < tb ? add(add(L.heel, mul(rb, -t * (lb + lf))), mul(uR, h)) : add(add(L.ball, mul(f, t * (lb + lf) - lb)), [0, 0, h])
    const turned = (e, t, h) => e.rotate(-L.heading, "z").at(...at(t, h))
    return sdf.union(turned(sdf.ellipsoid([2.9, 3.2, 3.1]), 0.15, 3), sdf.capsule(at(0.33, 4), at(0.7, 2.5), 2.6, 2.2), turned(sdf.ellipsoid([2.7, 3.3, 2.1]), 0.85, 2.1), { smooth: 1.3 })
      .intersect(sdf.plane(mul(uR, -1), -dot(L.ball, uR)), sdf.plane([0, 0, -1], -L.ball[2])).paint((q, n) => {
        const t = clamp(dot(sub(q, L.ball), f) / (lb + lf) + tb), up = t < tb ? uR : UP, h = Math.min(dot(sub(q, L.ball), uR), q[2] - L.ball[2]), fb = i !== near ? 0.08 : 0
        if (h < 1.2) return T("sole", fb)
        if (t > 0.8 && dot(n, up) > 0.55) return "shoeHit"
        return T("shoe", fb + 0.22, 0, 0, t > 0.3 && t < 0.85 && dot(n, up) > 0.78 ? -0.5 : 0) })
  })
  // the arms: the upper arm with its deltoid (a light on its top), the back of it in shadow, the elbow's fold; the
  // forearm bare to the wraps, their bands round it a little aslant; the fist
  j.arms.forEach((A, i) => {
    const far = i !== nearArm, fb = far ? 0.14 : 0, fd = sub(A.hand, A.elbow), inner = mul(j.sh.r, i ? -1 : 1), torsoB = [[j.pelvis, j.chest, 8, 10]]
    const upper = sdf.union(bone(A.sh, A.elbow, 4.7, 3.6, j.sh.f, inner, (t, a, q) => T("skin", fb + (Math.abs(a) > 2.1 ? 0.14 : 0), 0, (t > 0.82 && a > 0.3 ? 0.42 : 0) + 0.45 * nearOf(q, torsoB, 2.2))),
      sdf.ellipsoid([4.9, 5.4, 4.6]).at(...add(A.sh, add(mul(unit(sub(A.elbow, A.sh)), 2.4), [0, 0, 0.4]))).paint((q, n) => T("skin", fb, 0, 0, n[2] > 0.55 ? -0.18 : 0)), { smooth: 1.4 })
    const fore = bone(A.elbow, add(A.hand, mul(unit(fd), -3)), 3.8, 3.3, j.sh.f, inner, (t, a, q, n, len) => t < 0.56 ? T("skin", fb, 0, t < 0.16 && a > 0.3 ? 0.42 : 0)
      : T("wrap", fb + (band(t * len + a * 0.7, 3.2, 1.6, 0.42) ? 0.5 : 0)))
    out[`arm${i}`] = sdf.union(upper, fore, aimed(FIST(fb), fistWay(fd, j.sh.f), A.hand), { smooth: 0.8 })
  })
  return out
}
const nearArm = (j) => (j.depth(j.arms[1].sh) > j.depth(j.arms[0].sh) ? "arm1" : "arm0")

// ---------------------------------------------------------------- the cleanup, by rules, over each rendered frame
// - "corners": a pixel of a line's dark (k S N Y W H) where its line turns an L (one neighbour across, one up or down,
//   of its colour, a step or a doubled diagonal going on past them, nothing of it behind the corner): it takes what is
//   behind the corner (the clear, or the fill), the line left diagonal (pxl's lineFlaws' L-corner, every other one);
// - "lone": a pixel none of its eight neighbours its colour, three or four of its four one colour of its own ramp,
//   takes that colour (a speckle where a fold falls between two pixels);
// - "straps": no line round a strap (its parts strap0, strap1; lined both sides, a strap read as a dungarees'): a pixel
//   of a line beside one, not on the outline, takes the colour across from it (the line it puts on the skin and the top
//   round it, nearer); one of its own (where they are nearer) the colour of its unlined neighbour. The near strap is
//   drawn with the body and again with the near arm, over its shoulder: there its edges off the arm are cut, the body's
//   (unlined) showing under them.
const LINES = "kSNYWH"
const tidy = (c) => { const { w, h } = c.img, D = c.img.data, at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : D[y * w + x]), clear = (v) => (v & 255) < 128
  const dark = new Set([...LINES].map((k) => c.color(k))), same = (x, y, v) => at(x, y) === v
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
  for (const [x, y, v] of set) D[y * w + x] = v
  unstrap(c) }
const unstrap = (c) => { const P = c.img.parts, { w, h } = c.img, D = c.img.data
  if (!P) return
  const strap = (x, y) => /^strap/.test(P.names[P.ids[y * w + x]] ?? ""), dark = new Set([...LINES].map((k) => c.color(k))), set = []
  const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]], fill = (v) => (v & 255) >= 128 && !dark.has(v)
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const v = D[y * w + x]
    if (!dark.has(v) || N4.some(([dx, dy]) => (D[(y + dy) * w + x + dx] & 255) < 128)) continue
    const own = strap(x, y), to = N4.find(([dx, dy]) => own ? strap(x + dx, y + dy) && fill(D[(y + dy) * w + x + dx])
      : strap(x + dx, y + dy) && fill(D[(y - dy) * w + x - dx]) && !strap(x - dx, y - dy))
    if (to) set.push([x, y, own ? D[(y + to[1]) * w + x + to[0]] : D[(y - to[1]) * w + x - to[0]]]) }
  for (const [x, y, v] of set) D[y * w + x] = v }
const strapOnArm = (c) => { unstrap(c); const P = c.img.parts, { w, h } = c.img, D = c.img.data, cut = []
  if (!P) return
  const name = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? "" : P.names[P.ids[y * w + x]] ?? ""), strap = (x, y) => /^strap/.test(name(x, y))
  const off = (x, y) => x < 0 || y < 0 || x >= w || y >= h || (D[y * w + x] & 255) < 128
  // its edge off the arm, and the ring of line round it there (the arm's own pixels kept)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { if (off(x, y)) continue
    if (strap(x, y) ? off(x + 1, y) || off(x - 1, y) || off(x, y + 1) || off(x, y - 1)
      : !/^arm/.test(name(x, y)) && [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]].some(([dx, dy]) => strap(x + dx, y + dy))) cut.push(y * w + x) }
  for (const i of cut) D[i] = 0 }

// ---------------------------------------------------------------- her body in 3D, in two
// Each sole on the floor (seen 10 degrees down, a foot nearer us lands lower, as in the 3D games). Her guard holds the
// near fist before her face, and the head is drawn by hand, so the body is drawn in two: all of it but the near arm
// (cleaned), then the near arm alone (and her flat blocks, _rf_bk_<move>_s, to judge a move by); the head between
const LOOK = { body: BODY, headings: ["s"], pitch: PITCH, w: W, h: H, pivot: PIV,
  moves: Object.fromEntries(Object.entries(MOVES).map(([m, M]) => [m, { frames: M.ms.length, ms: M.ms, pose: M.pose }])),
  mats: { shoeHit: { ramp: toon("shoe", -0.3), shine: 0.9 } }, surface: { ink: true, outline: false, inner: "dark", soft: 0.3, shadows: false, ao: 0 } }
const strapOf = (j) => nearArm(j).replace("arm", "strap")
const RIG = rig3d("_rf_body", { ...LOOK, parts: (j, p) => { const P = parts(j, p); delete P[nearArm(j)]; return P }, draw: tidy })
rig3d("_rf_arm", { ...LOOK, blocks: "_rf_bk", parts: (j) => { const P = parts(j); return { [nearArm(j)]: P[nearArm(j)], [strapOf(j)]: P[strapOf(j)] } }, draw: strapOnArm })

// ---------------------------------------------------------------- her head, drawn by hand at 3/4
// Turned 40 degrees from profile, as her stance holds it, drawn as the fighting sprites draw a face this small: mostly
// light skin, the profile in its own dark (s); the eye a lash over a px of white at its outer corner and a violet iris
// toward the nose, a glint in it; no far eye (behind the nose's bridge at this turn); the nose a px; the mouth a px of
// s and one of R; the fringe over the brows, a row of skin under it; the band in an arc, lowest where it is nearest
// us, its shadow on the hair under it; the bob's side behind the cheekbone; a chin as far forward as the lips, its
// underside a line apart from the neck, the jaw rising. The shout (the strike's reach): the brow down, the eye
// narrowed, the mouth open; the hurt: the eye shut, the mouth open wide, tipped back. The bob as the fighting sprites
// draw hair this small: one mass in its mid tone, its dark only along the back, under the band and under the cut (strand
// lines all over it read as noise, a dark lower half as a helmet); a ring of light below the band, its edges toothed as
// strands; one parting, at the ends. The band's two tails drawn apart (_rf_band_*), hung from its knot behind the head
// and swung by the pose.

// ---------------------------------------------------------------- what each frame says to an engine
// hurt boxes round the head, the body (chest, pelvis, elbows) and the legs, and the punching arm while it is out (a
// counter-hit); the hit box round the fist on the active frames; the phase, and on a hit its damage and hitstun (60 fps
// frames: the hurt's two drawings, 230 ms), the hurt's frames the hitstun they play out. From the joints the body is
// drawn on, so they can't drift off the art.
const HITSTUN = 14
const boxOf = (pts, m) => { const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]), x0 = Math.min(...xs) - m, y0 = Math.min(...ys) - m; return [x0, y0, Math.max(...xs) + m - x0, Math.max(...ys) + m - y0] }
const boxes = (c, p) => { const j = RIG.joints(p, 180), S = (q) => RIG.screen(q)
  c.setBox("hurt", ...boxOf([S(j.head)], 9))
  c.setBox("hurt", ...boxOf([S(j.chest), S(j.pelvis), ...j.arms.map((A) => S(A.elbow))], 5))
  c.setBox("hurt", ...boxOf([S(j.pelvis), ...j.legs.flatMap((L) => [S(L.knee), S(L.foot)])], 4))
  if (p.phase !== "idle" && p.twist < 0) c.setBox("hurt", ...boxOf([S(j.arms[1].elbow), S(j.arms[1].hand)], 3))
  if (p.phase === "active") c.setBox("hit", ...boxOf([S(j.arms[1].hand)], 5))
  c.setData(p.phase === "active" ? { phase: "active", damage: 8, hitstun: HITSTUN } : p.phase === "hurt" ? { phase: "hurt", hitstun: HITSTUN } : { phase: p.phase }) }

// ---------------------------------------------------------------- the moves, facing e: the body, the head, the near arm
const ON = { w: W, h: H, pivot: PIV, genre: "fighting", category: "character" }
// the band's tails behind the head, by the pose's sway: streaming back on the cross's drive, flung on the hurt, lifted
// as the body sinks and hanging as it rises (the idle), else at rest
const tailsOf = (p) => { const [f, u] = p.sway ?? [0, 0]; return f < -1 ? "back" : f > 2 ? "fling" : u > 0.3 ? "up" : u < -0.3 ? "down" : "rest" }
sprite("_rf_head", { pivot: [15, 10] }, `
  ..........kkkkkk..........
  ........kkhJJJJhkk........
  ......khhJJJhhhhhhk.......
  ..yuuuuhJJhhhhhHhhhk......
  .Yyyyyyuuuuhhhhhhhhhhk....
  .....kHyyyyuuuuuuuuuuuk...
  .....khHHHHyyyyyyyyyyyY...
  ....khhhhhhhhhhhhhhhhhk...
  ...kHhJhhJJhhJhZZhZZhZs...
  ...kHhJJJJJJJhzZZZZZZZs...
  ...kHhJJhhJhJhzkkkksZZs...
  ...kHhhhhhhhhhzkwHHZZZs...
  ...kHhhhhhhhhHzZzhJZZZZs..
  ...kHhhhhhhhhHzZZZZZZzs...
  ....kHhhhHhhhhHzZZZZZZs...
  .....kHhhHHhhhhHzZZZsRs...
  ......kHHkHHhhHszZZZZZs...
  .......kk.kkHSssSzZZZZs...
  .............SsssSSSSs....
  ............SsssszsS......
  .........SssssszzsS.......
  .........SssssszzsS.......`)
sprite("_rf_head_shout", { pivot: [15, 10] }, `
  ..........kkkkkk..........
  ........kkhJJJJhkk........
  ......khhJJJhhhhhhk.......
  ..yuuuuhJJhhhhhHhhhk......
  .Yyyyyyuuuuhhhhhhhhhhk....
  .....kHyyyyuuuuuuuuuuuk...
  .....khHHHHyyyyyyyyyyyY...
  ....khhhhhhhhhhhhhhhhhk...
  ...kHhJhhJJhhJhZZhZZhZs...
  ...kHhJJJJJJJhzZzsSZZZs...
  ...kHhJJhhJhJhzkkkksZZs...
  ...kHhhhhhhhhhzsZHHZZZs...
  ...kHhhhhhhhhHzZzzzZZZZs..
  ...kHhhhhhhhhHzZZZZZZzs...
  ....kHhhhHhhhhHzZZZZZZs...
  .....kHhhHHhhhhHzZZskks...
  ......kHHkHHhhHszZZzRZs...
  .......kk.kkHSssSzZZZZs...
  .............SsssSSSSs....
  ............SsssszsS......
  .........SssssszzsS.......
  .........SssssszzsS.......`)
sprite("_rf_head_hurt", { pivot: [17, 10] }, `
  ..........kkkkkk..............
  ........kkhJJJJhkk............
  ......khhJJJhhhhhhk...........
  ...yuuuuhJJhhhhhHhhhk.........
  ..Yyyyyyuuuuhhhhhhhhhhk.......
  ......kHyyyyuuuuuuuuuuuk......
  ......khHHHHyyyyyyyyyyyY......
  .....khhhhhhhhhhhhhhhhhk......
  .....kHhJhhJJhhJhZZhZZhZs.....
  .....kHhJJJJJJJhzZZZsZZZs.....
  .....kHhJJhhJhJhzZZZZZZZs.....
  .....kHhhhhhhhhhzsSSsZZZs.....
  .....kHhhhhhhhhHzZZZZZZZZs....
  ......kHhhhhhhhhHzZZZZZZzs....
  .......kHhhhHhhhhHzZZZZsss....
  ........kHhhHHhhhhHzZZskkks...
  .........kHHkHHhhHszZZzkkZs...
  ..........kk.kkHSssSzZZZZs....
  .................SsssSSSSs....
  ................SsssszsS......
  .............SssssszzsS.......
  .............SssssszzsS.......`)
sprite("_rf_band_rest", { pivot: [3, 0] }, `
  ..yY.
  .y.Y.
  u..Y.
  y..Y.
  ..Y..`)
sprite("_rf_band_up", { pivot: [3, 0] }, `
  ..yY.
  uy.Y.
  y..Y.
  ...Y.
  .....`)
sprite("_rf_band_down", { pivot: [3, 0] }, `
  ..yY.
  .y.Y.
  .y.Y.
  u..Y.
  y..Y.`)
sprite("_rf_band_back", { pivot: [3, 0] }, `
  uyyY.
  y.YY.
  .Y...
  .....`)
sprite("_rf_band_fling", { pivot: [3, 0] }, `
  u....
  yy...
  .yyY.
  ...Y.`)
for (const [m, M] of Object.entries(MOVES)) anim(m, ON, (c) => { const i = c.frame, p = M.pose(i), hd = RIG.screen(RIG.joints(p, 180).head)
  const x = Math.round(hd[0]), y = Math.round(hd[1]), knot = p.face === "hurt" ? [-13, -5] : [-12, -5]
  c.stamp(`_rf_body_${m}_s`, ...PIV, { frame: i }); c.stamp(`_rf_band_${tailsOf(p)}`, x + knot[0], y + knot[1])
  c.stamp(p.face ? `_rf_head_${p.face}` : "_rf_head", x, y)
  c.stamp(`_rf_arm_${m}_s`, ...PIV, { frame: i }); boxes(c, p) }, ...M.ms.map((ms) => frame({ ms })))
sheet("reva_fighter", ["idle", "strike", "hurt"], { rows: "tag", pad: 2, slots: SLOTS })
card("idle", { is: "Reva the fighter, 110 px standing, side view in KOF 2002's school, in 3D on her rig with her head drawn by hand: a violet bob under a gold headband, a red crop top, a gold sash, navy trousers bound at the ankle over slippers, wrapped fists; idle, strike (a rear cross) and hurt facing e, hurt and hit boxes and frame data from her joints", cells: { "side/?": "✓" },
  vary: { color: "3 palette slots on the sheet reva_fighter (base, jade, dusk: hair, top, trousers, sash): revaFighter.SLOTS", part: "her moves: idle, strike, hurt facing e (the game flips her for w), on the sheet reva_fighter, a row a move; their blocks _rf_bk_<move>_s" } })
Object.assign(revaFighter, { SLOTS, MOVES, rig: RIG })
}
