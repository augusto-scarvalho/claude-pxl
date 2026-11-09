// The miko as a fighting game's spectator (lib/profiles/fighting.px.js): the library's shrine maiden (miko.px.js, an
// HD-2D doll of 34 px and 3 heads) made again at the fighters' proportions, to stand on a stage's middle plane and watch
// the fight, as the games' crowds do (the library's fighting study, 14.6). 64 px standing (the plane's scale: her feet
// 28 px over the fighters' line, as Garou's crowd stands at the back of its floor, 0.55-0.65 of a fighter; the shrine
// kit drawn there at 36-44 px a meter), 6.5 heads as the fighters are. Her design is the library miko's: the white
// kosode, its collar crossed, its wide sleeves hanging from the forearms; the red hakama from high on the waist to the
// ankles, pleated and flaring; white tabi; black hair with straight bangs, side locks past the jaw, tied low at the nape
// with a white paper ribbon. Made as Reva and Haldor are: on her rig (rig3d(), one heading, the fighting camera's pitch)
// painted with what fighter.px.js shares (the toon, the line by material, the cleanup), her head modeled and turned by
// pxl to the angle she faces the fight from (3/4, 45 degrees from us), mended by hand, and stamped between her body and
// her near arm; her body and clothes as the games' models that dress like her build theirs (the study's 14.7: her
// chest, waist and hips under the kosode, the hakama a bell from her waist with its pleats in relief, the sleeves a tube
// on the arm and a bag under the forearm, the hands out of the cuffs, her tail down her back). Facing e (the fight to
// her right, in front of her); the game flips her for w. Her moves, timed as the crowds' are (14.6): watch (a
// breath, 4 drawings in 1733 ms, the stage's loop), cheer (her arms thrown up, 4 drawings of 133 ms, what a stage
// plays when the crowd reacts) and sweep (a bamboo broom, the library miko's stroke at her size, 8 drawings of
// 117 ms). Drawn like the stage, not the fighters, so she doesn't draw the eye from them (14.6: the crowds' line none
// or their material's dark): her line her materials' own, the hair's and the hakama's a step over their darkest,
// never black; the stage's light in a slot per stage (noon the base, dusk, night), as the shrine kit is tinted on the
// stages. No boxes, no frame data: she doesn't fight.
// Taken with include("<path>/lib/characters/miko_spectator.px.js", { as: "miko_spectator" }): miko_spectator.watch,
// .cheer, .sweep; mikoSpectator.SLOTS a slot's swap (stamp(..., { swap: mikoSpectator.SLOTS.night })).
include("../profiles/fighting.px.js")
include("fighter.px.js")
var mikoSpectator = {}
// in a block: its names stay its own when a scene includes the file
{
// her colors at noon (stage B's light, the base): skin, hair (blue-violet in its light, the library miko's), the white
// silk (its shade a cool lavender), the hakama's red (a fifth greyer than a fighter's would be: the biggest part of her,
// so she stays behind them, 14.6), the eye; each ramp from its own line, none black
const BASE = {
  S: "#8a5444", s: "#c08466", z: "#e6b08e", Z: "#fad8bc",
  K: "#2a2434", H: "#3c344a", h: "#524a68", J: "#736c8e",
  V: "#78748f", v: "#aaa6be", W: "#d6d2de", w: "#efece8",
  d: "#60232b", R: "#983940", r: "#bd524b", q: "#d87e69",
  E: "#2c2a46",
  t: "#4e4c22", n: "#4a3018" }   // the broom: its bamboo and its twigs (the library miko's darks)
pal(BASE)
ramps("SszZ", "KHhJ", "VvWw", "dRrq")
// a slot per stage: the stage's light mixed into every color as the shrine kit is tinted there (the 6g1 concepts:
// dusk 12% toward a warm violet, night 38% toward a deep blue)
const mix = (a, b, k) => "#" + [1, 3, 5].map((i) => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - k) + parseInt(b.slice(i, i + 2), 16) * k).toString(16).padStart(2, "0")).join("")
const tinted = (to, k) => Object.fromEntries(Object.entries(BASE).map(([key, hex]) => [key, mix(hex, to, k)]))
const SLOTS = { dusk: tinted("#6a3046", 0.12), night: tinted("#1a2342", 0.38) }
const F = genre("fighting"), PITCH = F.camera.pitch
const { RAD, add, sub, mul, dot, len, unit, clamp, smooth, pinholes } = fighter

// ---------------------------------------------------------------- the poses, in her px (rig3d's pose fields)
// 64 px and 6.5 heads (figure()'s), her legs a little longer than its (the hip at 0.52 of her height, as the fighters'
// women); her shoulders a head apart and her neck long enough to show (14.7: 0.99 heads, 0.46 heads from the chin to
// them, the adult model); standing as a miko stands, upright, the feet close, the hands together before her at the
// hakama's ties (the left over the right). Facing the fight: her hips and shoulders turned 55 degrees from us toward it
// (at 30 her tail hid behind her and her sleeves hung as a slab across her front), her head 45
const BODY = { h: 64, heads: 6.5, hip: 33, torso: 19, neck: 7, thigh: 17, shin: 14, shoulders: [0, 5, -1.2] }
const STANCE = { turn: -55, twist: 0, lean: 0, down: 0.8, look: 135, feet: [[0.4, -2.4], [-0.4, 2.4]], toes: [12, 12], hands: [[6.8, 4.6, -12.2], [6, -4.4, -12.7]], elbow: [-0.4, 0.6, -1] }
const posed = (o) => { const q = { ...STANCE, ...o }, h = 180 + q.turn; return { ...q, head: q.look - (h + q.twist) } }
// watch: a breath (14.6: the crowds breathe in 2-3 drawings over 100-330 ticks, a few px changing): the chest up the
// spine and the shoulders with it, the hands a frame late; held in and held out, passing quickly
const BREATH = [0, 0.5, 1, 0.5], WATCH_MS = [667, 200, 667, 200]
const watch = (i) => { const b = BREATH[i], l = BREATH[(i + 3) % 4]; return posed({ rise: 1.2 * b, hands: STANCE.hands.map(([e, a, u]) => [e, a, u + 0.8 * l]) }) }
// cheer: her arms thrown up (14.6: Garou's crowd and KOF '98's, 3-6 drawings of 8-10 ticks), the hands open, pumping
// twice as her knees bounce, her head up to the fight
const CHEER = [
  { down: 2, hands: [[2, -8, 14], [3, 8, 14.5]] },
  { down: 0.8, rise: 1, hands: [[3, -4, 19.5], [4, 4, 19]] },
  { down: 2, hands: [[3, -7.5, 12.5], [4, 8.5, 13]] },
  { down: 1.2, rise: 0.5, hands: [[3, -5, 18.5], [4, 3, 19.5]] },
], CHEER_MS = [133, 133, 133, 133]
const cheer = (i) => posed({ elbow: [0.3, 1, 1], ...CHEER[i], look: 140, open: true })
// sweep: the library miko's (miko.px.js, approved as blocks) at her size (its px x 64/34): a bamboo broom (takebōki) in
// both hands, the left on top at her middle, the right lower on the handle, its head on the ground ahead of her, swept
// from her right to her left in a flat arc (3 drawings, the flick), held, then carried back a little off the ground
// (4 drawings); her shoulders turn with the stroke, her hips half as much; the left foot ahead, the knees a little bent,
// the body leaning over the broom; turned nearer us than to watch, so the stroke runs across the stage (the sixth
// drawing a little further back than the library's, 0.7: at 0.75 the handle left a sliver of the stage between it and
// her hakama). 8 drawings of 117 ms (7 ticks: the library's 110 in whole ticks)
const STROKE = [0, 0.45, 0.85, 1, 1, 0.7, 0.4, 0.12], OFF = [0, 0, 0, 0, 1.2, 1.8, 1.4, 0.5], LEAN = 14, K = 64 / 34, SWEEP_MS = STROKE.map(() => 117)
const sweep = (i) => { const s = STROKE[i], down = K * (0.8 + 0.3 * Math.sin(Math.PI * s)), cf = BODY.torso * Math.sin(LEAN * RAD), cz = BODY.hip - down + BODY.torso * Math.cos(LEAN * RAD)
  const top = [cf + 2.5 * K, -0.8 * K, cz - 4.5 * K], head = [K * (12 + 1.5 * Math.sin(Math.PI * s)), K * (6 - 12 * s), K * OFF[i]]
  const q = posed({ feet: [[1.4 * K, -2.5 * K], [-0.9 * K, 2.5 * K]], toes: [8, 8], down, lean: LEAN, turn: -15 + 5 * (1 - 2 * s), twist: 8 * (1 - 2 * s), look: 150,
    grip: { from: top, to: head, at: [0, (2.8 * K) / (top[2] - head[2])] }, stroke: s }); delete q.hands; return q }
// the broom by hand after her (the library miko's): the handle from above the top hand through the lower one, a stick a
// px wide in the bamboo's dark, its nodes darker (all of it edge: so her line by material holds); the head a fan of seven
// twigs from a third of the way up to the ground; drawn where it is nearer us than her chest or on nothing, never over
// her hands
const drawBroom = (c, j) => { const [H0, G] = j.grip, up = sub(H0, G), across = unit([up[1], -up[0], 0]), chest = j.depth(j.chest), hands = [H0, j.arms[1].hand].map((q) => j.screen(q).map(Math.round))
  const put = (q, key, handle) => { const [x, y] = j.screen(q).map(Math.round)
    if (handle && hands.some(([hx, hy]) => Math.abs(hx - x) + Math.abs(hy - y) <= 1)) return
    if (j.depth(q) > chest - 1 || !c.get(x, y)) c.px(x, y, key) }
  for (let k = -3; k <= 3; k++) for (let t = 0; t <= 1; t += 0.03) put(add(add(G, mul(up, 0.36 * (1 - t))), mul(across, k * 1.3 * K * t)), "n")
  for (let t = 0.34; t <= 1.15; t += 0.015) put(add(G, mul(up, t)), Math.round(t * 50) % 7 === 0 ? "n" : "t", true) }
const MOVES = { watch: { pose: watch, ms: WATCH_MS }, cheer: { pose: cheer, ms: CHEER_MS }, sweep: { pose: sweep, ms: SWEEP_MS, draw: drawBroom } }
const W = 64, H = 80, PIV = [24, 77]

// ---------------------------------------------------------------- the tones (fighter.toonOf: Xrd's threshold)
// Her materials, each [its line, its fills dark to light, the cuts]: skin, hair, silk (the kosode, the tabi, the
// ribbon), the hakama's red; the hair's and the red's line their middle dark, not their darkest (her edge against the
// stage a step softer than the fighters', measured on the three stages: 12-22 L against their 26-63)
const TONE = { skin: ["S", "SszZ", [0.08, 0.4, 0.74]], hair: ["H", "HhJ", [0.45, 0.85]], silk: ["V", "vWw", [0.3, 0.68]], red: ["R", "dRrq", [0.1, 0.42, 0.82]] }
const toon = fighter.toonOf(TONE, "d")
const T = (m, b = 0, deep = 0) => toon(m, b, deep)

// ---------------------------------------------------------------- her parts, each painted in its own coordinates
// Built as the models that dress like her build theirs (14.7: the Let's Go channeler's and Erika's hakama, the Arceus
// Cogita's adult body, Age of Calamity's Impa's tail), in her px
const parts = (j, p = {}) => {
  const out = {}, hips = [j.pelvis[0], j.pelvis[1], 0], top = j.chest[2] - 0.4
  const lean = sub(j.chest, j.pelvis), along = (z) => { const t = (z - j.pelvis[2]) / lean[2]; return [lean[0] * t, lean[1] * t] }
  const twist = Math.atan2(dot(j.sh.f, j.r), dot(j.sh.f, j.f))
  // a section's radius at the angle a from her front: an oval `w` to each side, `f` ahead and `b` behind
  const oval = (a, w, f, b) => 1 / Math.hypot(Math.cos(a) / (Math.cos(a) > 0 ? f : b), Math.sin(a) / w)
  // the hakama: tied at her waist, 0.4 of the way from the hips to the shoulders (the models' 0.43-0.62, 14.7: at half
  // her kosode read short over a tall skirt), to just over the ankles; it flares over the hips and then less and less to
  // the hem (a bell: 5.3, 6.6, 9.1 and 10 px to the side at its top, the hips, the knees and the hem, narrower than the
  // models' at 8 and 11.5: at their width she read as a tent at 64 px), a little less deep than wide; 12 pleats round it
  // in relief, each a fold sloping in from its edge toward the sides and the back (and out again over a third of it: a
  // field's distance has no steps), deepest at the hem (16% of the radius there, 6% at the top: they open toward the
  // hem); the fold under each edge a step darker, the side away a step darker; its ties (himo) round the top, knotted at
  // her front
  const hz1 = j.pelvis[2] + 0.4 * lean[2], hz0 = j.legs[0].ankle[2] + 1.5, PLEATS = 12
  const saw = (a) => { let u = (Math.abs(a) * PLEATS) / (2 * Math.PI); u -= Math.floor(u); return u < 0.7 ? u / 0.7 : (1 - u) / 0.3 }
  const hW = (h) => 10 - 4.7 * h ** 1.6, deep = (h) => 0.06 + 0.1 * (1 - h)
  const hR = (h, a) => oval(a, hW(h), 0.85 * hW(h), 0.85 * hW(h)) * (1 - deep(h) * saw(a))
  const hk = j.sweep(hips, hz0, hz1, hR, { shift: (h) => along(hz0 + h * (hz1 - hz0)) })
  out.hakama = hk.field.paint((q, n) => { const [h, a] = hk.at(q), s = saw(a)
    return T("red", (s > 0.82 ? 0.45 : 0) + (Math.abs(a) > 2.2 ? 0.12 : 0) + (h > 0.9 && h < 0.94 ? 0.2 : 0), h > 0.96 ? 0.2 : 0) })
  const bow = add(add(hips, mul(j.f, 0.85 * hW(1) + 0.5)), [0, 0, hz1 - 1.6]), bowAt = (s) => add(bow, mul(j.r, s))
  out.himo = sdf.capsule(bowAt(-1.8), bowAt(1.8), 0.8, 0.8).union(sdf.ellipsoid([0.9, 0.7, 1]).at(...bow), { smooth: 0.4 }).paint((q, n) => "d" + (n[2] > 0.3 ? "q" : "r").repeat(24))
  // the kosode, the body under it: from under the hakama's top to the shoulders along her spine; her chest its widest
  // and deepest (5 px to the side, its front 4.4 px ahead at the bust), narrowing 10% to the hakama's ties (4.3; its
  // front 3.3), as the adult model's bodice (14.7); its collar crossed left over right, from each side of her neck to
  // where they cross at her chest, the left one going on down to her right side: two bands a step darker, her skin
  // between them above (the V to half a head under her chin)
  const kz0 = hz1 - 3, kH = top - kz0, bandH = 3 / kH
  const kW = (h) => 4.3 + 0.7 * smooth(bandH, 0.6, h) + 0.2 * smooth(0.6, 1, h)
  const kF = (h) => 3.3 + 1.1 * Math.max(0, 1 - ((h - 0.62) / 0.3) ** 2) + 0.4 * smooth(0.7, 1, h), kB = (h) => 3.4 + 0.3 * smooth(0.4, 1, h)
  const ko = j.sweep(hips, kz0, top, (h, a) => oval(a, kW(h), kF(h), kB(h)), { shift: (h) => along(kz0 + h * kH) })
  const lapL = (h) => -0.5 + (0.5 * (1 - h)) / 0.35, lapR = (h) => 0.5 - (0.5 * (1 - h)) / 0.35
  out.kosode = ko.field.paint((q, n) => { const [h, a0] = ko.at(q), a = a0 - twist * h
    if (h > 0.65 && a > lapL(h) + 0.16 && a < lapR(h) - 0.16) return T("skin", 0.25)
    const collar = Math.abs(a - lapL(h)) < 0.17 || (h > 0.65 && Math.abs(a - lapR(h)) < 0.17)
    return T("silk", (collar ? 0.3 : 0) + (Math.abs(a) > 2.1 ? 0.12 : 0)) })
  // the neck, in the jaw's shadow
  out.neck = sdf.capsule(sub(j.chest, [0, 0, 1.5]), add(j.head, [0, 0, -2.6]), 1.9, 1.7).paint(() => T("skin", 0.3))
  // the hair's tail: tied low at the nape (the paper ribbon), it hangs down her back from the back of her head, off her
  // back by its own thickness, to a head and a half under her chin, narrowing (the Impa's, 14.7)
  const back = unit(mul(j.sh.f, -1)), nape = add(add(j.head, mul(back, 3.6)), [0, 0, -3.6]), spine = (z) => add(add(hips, [...along(z), 0]), [0, 0, z])
  const tEnd = add(spine(j.head[2] - 4.9 - 15), mul(back, kB(1) + 1.3)), tMid = add(spine(j.head[2] - 11), mul(back, kB(1) + 1.6))
  out.tail = sdf.union(sdf.capsule(nape, tMid, 1.7, 1.5), sdf.capsule(tMid, tEnd, 1.5, 0.9), { smooth: 0.6 }).paint(() => T("hair", 0.1))
  out.ribbon = sdf.ellipsoid([1.9, 0.7, 1.2]).rotate(-(Math.atan2(back[0], -back[1]) * 180) / Math.PI, "z").at(...add(nape, mul(back, 1))).union(sdf.capsule(add(nape, add(mul(back, 1.2), [0, 0, -0.6])), add(nape, add(mul(back, 1.5), [0, 0, -3])), 0.6, 0.6), { smooth: 0.3 }).paint(() => T("silk", 0))
  // the tabi under the hakama's hem: a foot from heel to toe along its heading, white
  out.tabi = j.legs.map((L) => sdf.capsule(add(L.heel, [0, 0, 1]), add(L.toe, [0, 0, 0.9]), 1.3, 1.1).union(sdf.capsule(L.ankle, add(L.heel, [0, 0, 1.2]), 1.3, 1.3), { smooth: 0.6 }).paint(() => T("silk", 0.06)))
  // the arms, as the models build a kosode's sleeve (14.7): a tube close round the arm to the wrist, so the arm's line
  // reads; its bag from the elbow, hanging under the forearm (straight down: its weight), 0.75 of the forearm deep and
  // thin, its lower corner at the cuff rounded, a fold where it leaves the arm; the cuff open at the wrist and the whole
  // hand out of it. An arm raised: the sleeve slides down to the elbow and gathers there, the bag hanging from round the
  // elbow (from higher on the arm, the near one fell over her chin), the forearm bare
  j.arms.forEach((A, i) => {
    const far = j.depth(A.sh) < j.depth(j.arms[1 - i].sh) ? 0.14 : 0, ud = sub(A.elbow, A.sh), fd = sub(A.hand, A.elbow), up = clamp(fd[2] / len(fd))
    const ct = 1 - 0.85 * up, cuff = add(A.elbow, mul(fd, ct)), rs = 1.8 + 0.6 * up
    const tube = sdf.union(sdf.capsule(A.sh, A.elbow, 1.9, rs), sdf.capsule(A.elbow, cuff, rs, 2 + 0.3 * up), { smooth: 0.6 })
    const h0 = up > 0.5 ? add(A.sh, mul(ud, 0.7)) : add(A.elbow, mul(fd, 0.1)), h1 = up > 0.5 ? A.elbow : cuff, D = 5.2 * (1 - 0.15 * up)
    const bag = sdf.union(...[0, 0.33, 0.67, 1].map((t) => { const a = add(h0, mul(sub(h1, h0), t)); return sdf.capsule(a, add(a, [0, 0, -D * (0.45 + 0.55 * t)]), 1, 1.1) }), { smooth: 1 })
    const bare = sdf.capsule(cuff, A.hand, 1.5, 1.25), d = unit(fd)
    // the hand: together before her a hand's length (4 px) on from the wrist, flat, its fingers down and in; raised,
    // open, the palm to the fight, the fingers together up from it, the thumb out toward us
    const hand = p.open ? sdf.ellipsoid([1.4, 0.8, 2.2]).at(...add(A.hand, mul(d, 1.6))).union(sdf.capsule(add(A.hand, mul(d, 0.6)), add(add(A.hand, mul(d, 1.4)), mul(j.f, 1.5)), 0.6, 0.5), { smooth: 0.3 })
      : sdf.capsule(add(A.hand, mul(d, 0.3)), add(add(A.hand, mul(d, 3)), [0, 0, -1.4]), 1.45, 1.15)
    const onTube = (q) => fighter.capD(q, [A.sh, A.elbow, 1.9, rs]) < 0.9 || fighter.capD(q, [A.elbow, cuff, rs, 2.2]) < 0.9
    out[`arm${i}`] = [sdf.union(tube, bag, { smooth: 0.6 }).paint((q, n) => T("silk", far + (onTube(q) ? 0 : q[2] < h0[2] - 1.2 && q[2] > h0[2] - 2.6 ? 0.3 : 0.16))),
      sdf.union(bare, hand, { smooth: 0.5 }).paint((q, n) => T("skin", far))]
  })
  return out
}

// ---------------------------------------------------------------- her body in 3D, in two
// all of her but the near arm (cleaned), then the near arm alone; her head between
const LINES = "SHVR"
const tidy = (c) => fighter.clean(c, LINES)
const LOOK = { body: BODY, headings: ["s"], pitch: PITCH, w: W, h: H, pivot: PIV, surface: fighter.SURFACE, moves: Object.fromEntries(Object.entries(MOVES).map(([m, M]) => [m, { frames: M.ms.length, ms: M.ms, pose: M.pose, ...(M.draw ? { draw: M.draw } : {}) }])) }
const RIG = rig3d("_ms_body", { ...LOOK, parts: (j, p) => { const P = parts(j, p); delete P[fighter.nearArm(j)]; return P }, draw: tidy })
// (the broom drawn with her body only: the near arm over it)
rig3d("_ms_arm", { ...LOOK, moves: Object.fromEntries(Object.entries(LOOK.moves).map(([m, { draw, ...M }]) => [m, M])), parts: (j, p) => { const A = fighter.nearArm(j); return { [A]: parts(j, p)[A] } }, draw: tidy })

// ---------------------------------------------------------------- her head, drawn at 3/4 toward the fight
// Turned 45 degrees from us (her look), as the fighters' heads are drawn at their angle, both ways as the stage's
// notes ask: by hand ("") and turned by pxl and mended ("_t": angle can't turn a drawing round the vertical, so her
// head modeled, the skull, the hair with a little volume over it, the bangs cut straight at the brows, the side locks
// past the jaw, the mass drawn back to the nape, drawn at se by views() at the fighting camera and light, then mended:
// the hair's light a band, the eyes under the bangs, the nose, the mouth, the jaw). HEAD picks which her frames stamp.
// 9.8 px from the crown to the chin (6.5 heads of her 64) and a pixel of hair over it, 13 across; the eyes on its
// middle row, the face 6 px down to the chin and 7 across, the side lock in front of the ear to under the jaw; the
// hair narrowing behind to the nape, where her tail and its ribbon (in 3D, her body's) go on; its pivot the head's middle
sprite("_ms_head", { pivot: [6, 6] }, `
  ....KKKKK....
  ..KKhJJJhKK..
  .KhhJJJJhhhK.
  KHhhhhJhhhhhK
  KHhhhhhhhhhhK
  KHHhhhhhhhhhK
  KHHhhKEEzzEZK
  KHHhhKzzzzzZS
  KHHhhKszzzzS.
  .KHHhKSszsS..
  .KHHhK.SsS...
  ..KHhK..S....
  ...KHK.......
  ....K........`)
sprite("_ms_head_t", { pivot: [6, 6] }, `
  ...KKKKKK....
  ..KJJJJJJKK..
  .KhJJJJJJhhK.
  .KhhhJJJhhhhK
  .KhhhhhhhhhhK
  .KHhhhhhhhhK.
  .KHhhhhzzZhK.
  KHhhhhEEzEhK.
  KHhhhhzzzzZS.
  KHhhhKszzzS..
  .KHhhKSzzsS..
  ..KHhK.SSS...
  ...KHHK......
  ....KK.......`)
const HEAD = "_t"   // the turned one: its face reads rounder, both eyes showing (the user's pick)

// ---------------------------------------------------------------- the moves, facing e: the body, the head, the near arm
for (const [m, M] of Object.entries(MOVES)) anim(m, { w: W, h: H, pivot: PIV, genre: "fighting", category: "character" }, (c) => { const i = c.frame, p = M.pose(i)
  c.stamp(`_ms_body_${m}_s`, ...PIV, { frame: i })
  c.stamp(`_ms_head${HEAD}`, ...RIG.screen(RIG.joints(p, 180).head).map(Math.round))
  c.stamp(`_ms_arm_${m}_s`, ...PIV, { frame: i })
  pinholes(c) }, ...M.ms.map((ms) => frame({ ms })))
sheet("miko_spectator", Object.keys(MOVES), { rows: "tag", pad: 2, slots: SLOTS })
card("watch", { is: "the miko as a fighting game's spectator, 64 px standing at the fighters' proportions (6.5 heads), side on at the fighting camera, in 3D on her rig with her head modeled, turned by pxl and mended by hand: a white kosode, its wide sleeves hanging, a red hakama, white tabi, black hair tied back with a paper ribbon; watch (a breath), cheer (arms up) and sweep (a bamboo broom) facing e", cells: { "side/?": "✓" },
  vary: { color: "a palette slot per stage on the sheet miko_spectator (base noon, dusk, night: the stage's light in her colors): mikoSpectator.SLOTS", part: "her moves watch, cheer and sweep facing e (the game flips her for w), on the sheet miko_spectator, a row a move" } })
Object.assign(mikoSpectator, { SLOTS, MOVES, rig: RIG })
}
