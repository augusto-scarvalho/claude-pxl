// Haldor the smith, fighting's heavy (lib/profiles/fighting.px.js): an original big grappler seen from the side, 140 px
// standing and 126-130 in his guard, Reva's opponent (reva_fighter.px.js) in the same school (the library's study of the
// heavies, section 13 of its fighting study, measured for numbers only, never their pixels): bald, a braided black
// beard, a tan leather apron hung from his waist to above his knees (its bib up to his chest) over charcoal trousers,
// leather gauntlets over his forearms and hands, heavy boots; bare shoulders and arms; 7.8 heads, his head the size of
// hers on a body 1.27 times her height, the neck hidden under the trapezius. His body built as the heavies' 3D models
// are (13.9: a barrel trunk as deep at the belly as at the chest, the trapezius up to the jaw, deltoids 3.6 heads
// across, thick arms and thighs), turned to the camera as the games turn a heavy, his guard and idle as big men stand
// and breathe (13.10). Made as she is: in 3D on his rig (rig3d(), one heading), painted as Guilty Gear Xrd paints a
// model for its one camera (each material a ramp cut where its terminator falls, his muscle by design as the heavies
// are painted: the shadow the biggest share of the skin, a cut, a small light on top of each mass, a crease only where
// masses part, a line between parts only at a real depth break, none on the skin's lit side), a cleanup by rule over
// each frame; his hands modeled on his rig (fingers bent at their knuckles, an opposed thumb: the pose's `fingers`
// give each its shape), his head drawn by hand near profile and stamped at its joint, between the body and the near arm
// (section 13.11: the heavies' heads, hands and feet). 18 colors; a line by material, black on the beard and the boots
// (the genre's ink). His guard a grappler's low and wide (13.12: the 2D grapplers' guards by kind): the thighs spread
// over bent knees, the weight between the feet, the lead foot in profile at her, the rear foot turned to the camera
// with its knee (the boots' soles flat on one row), the trunk near upright; both hands open claws ready to grab (13.13:
// the lead at his chin a forearm ahead of his chest, the near one before his belly, the palms down and away from us,
// the backs of the hands to the camera, the fingers spread and curled at her). Idle (8 x 150 ms: the shoulders up 6 px
// over knees that give 1, the head sinking into them, the hands two drawings late, up, out and closing a little) facing
// e, the game flips him for w. Each frame's hurt boxes (head, body, legs) from his joints and its data { phase }; 3 palette
// slots (base, ash, moss: 12 keys swapped) on the sheet haldor_fighter.
// Taken with include("<path>/lib/characters/haldor_fighter.px.js", { as: "haldor_fighter" }): haldor_fighter.idle;
// haldorFighter.SLOTS a slot's swap (stamp(..., { swap: haldorFighter.SLOTS.ash })); haldorFighter.HAND the hands' shapes.
// What he shares with Reva (the vectors, the toon, the shadows by design, the cleanup, the boxes) is in fighter.px.js;
// his body, stance, tones, parts and head are his.
include("../profiles/fighting.px.js")
include("fighter.px.js")
// the values from the heavies' paint (the study's 13.8, OKLab): the skin five tones as KOF 2002's bare-chested heavy
// (line 0.34 and redder, 0.48, 0.59, 0.71, a light 0.83), the beard a near-black mass, its strands lighter (0.25, 0.43), the apron a tan
// leather (0.34 line, 0.48, 0.61, 0.75), the gauntlets and the boots one dark leather (0.23, 0.33, 0.50), the
// trousers a charcoal cloth (0.25, 0.34, 0.48). 18 colors, every ramp from the ink
pal({ k: "#1a1418", S: "#5c2622", s: "#8e4430", m: "#b5653f", z: "#d98d62", Z: "#f2b88c", H: "#2a201d", h: "#5e4a3c",
  A: "#4e301d", a: "#7e5230", c: "#ab7543", l: "#d6a36b", E: "#24191a", e: "#43302a", g: "#7a5843", N: "#202228", n: "#363940", i: "#5a5e68" })
ramps("kSsmzZ", "kHh", "kAacl", "kEeg", "kNni")
var haldorFighter = {}
// in a block: its names stay its own when a scene includes the file
{
const { RAD, add, sub, mul, dot, len, unit, clamp, smooth, hipsFloor, capD, shadowed, nearOf, band, bone, aimed, nearArm, pinholes, SURFACE } = fighter
// his slots, a swap each of the roles' keys: the beard (H h), the apron (A a c l), the gauntlets and the boots (E e g),
// the trousers (N n i); his skin kept. Each apart from Reva in all three of hers (her tops red, green, purple; her
// trousers navy, dark brown, maroon, always dark): ash an old smith's (a grey beard, a black apron, pale stone
// trousers, oxblood leather), moss (a dark beard, an olive apron, slate-blue trousers, black leather)
const F = genre("fighting"), SLOTS = {
  ash: { H: "#5d5a58", h: "#9a9590", A: "#141416", a: "#2c2d31", c: "#45474d", l: "#6c7079", E: "#2e1416", e: "#552529", g: "#7f3a3c", N: "#5b5852", n: "#8c877d", i: "#bdb6a8" },
  moss: { H: "#2b2017", h: "#523d2a", A: "#2f3115", a: "#4f5424", c: "#737a37", l: "#9da454", E: "#141516", e: "#2b2c2f", g: "#4b4d52", N: "#1d2533", n: "#33415a", i: "#5a6c8c" } }

// ---------------------------------------------------------------- his body and his guard, in px (rig3d's pose fields)
// Built from the heavies' 3D models (the study's 13.9: Bison, Smash's and Tears of the Kingdom's Ganondorf, set against
// Ryu and Ken), in his heads (18 px): 7.8 heads, 140 px standing (the profile's heavy), the hip joint 0.48 of him; the
// shoulders' joints 40 apart (2.2 heads: the heavies' 1.9-2.3), long thick arms, the hand as big as the head; the foot
// 26 px heel to toe with its boot (13.11: SF6's heavies' 0.18-0.22 of the height), the ankle 7 px over the sole (a
// quarter of the foot, as theirs)
const BODY = { h: F.scale.heavy[0], heads: 7.8, hip: 67, thigh: 33, shin: 28, ankle: 7, torso: 47, upper: 25, fore: 23, shoulders: [0, 20, -1], r: { foot: [5.5, 13, 4.5] } }
// His guard, a grappler's low and wide (the study's 13.12, the 2D grapplers' guards by kind: never a symmetric A, never
// two upright shins under spread thighs; each foot's heading its knee's), on the screen: the hips 0.47 of the way from
// the rear ankle to the front one (the low kind's 0.46-0.51), the lead (far) thigh 45 degrees ahead and its shin 17
// (theirs 30-57 and 0-29), the knee bent 28, the foot in profile at her (heading 100); the rear (near) thigh 33 degrees
// back and its shin 26 (theirs 21-53 and -8 to 9), the knee bent 31 (24 as he breathes in), its foot turned to the
// camera with its knee as the low grapplers turn theirs (13.13: heading 190, the toes 10 degrees back from us, the knee
// 203; Reva's 168), its boot read from the front by its round toe box lit on top over a sole line; the soles flat on
// the pivot's row (the feet on the floor's axes, [across, toward her; away from us], the rear one 10 px farther than
// the hips); 68 px between the ankles (0.55 of his 124 px guard, theirs 0.35-0.73) and 90 from toe to toe (the rear
// toe ahead of its heel, turned to us); the trunk leaning 6 degrees. Turned to the camera as the games turn a heavy to
// show his breadth (13.9: the heavies' trunk 25-30 degrees from facing us
// reads 0.4 of the guard across the shoulders, the 2D heavies' 0.35-0.5): the hips 45 degrees from profile, the chest
// 20 more; his head is drawn near profile, on her, whatever the chest does. The hands as a grappler holds them, ready to
// grab (13.13: the 2D grapplers' claws), on the floor's axes ([ahead, away, up] px from each shoulder): the lead (far)
// hand at his chin (0.87 of his guard, theirs 0.83-0.91), the near one before his belly (0.68, theirs 0.61-0.72), both a
// forearm ahead of the body, the elbows bent and carried out from it (the near arm is drawn over the head, and stays
// clear of the face). `fingers` each hand's shape as numbers ([curl, roll, bend], arm by arm as `hands`): HAND's curl,
// degrees its fingers bend at their knuckles (open, the claw, half closed, a grip; the more open, the wider they fan);
// the hand rolled round the forearm, degrees (0 its palm toward her or down and its edge to the camera, above 0 its back
// turned to us); bent at the wrist, degrees (below 0 its fingers toward its palm). Both an open claw, the back to us as
// the 2D grapplers draw theirs, the palm down and away (never to us: a palm to us reads "stop"), the fingers at her
const HAND = { open: 0, claw: 35, half: 55, grip: 90 }
const STANCE = { turn: -45, twist: 20, lean: 6, down: 10, rise: 0, breath: 0, feet: [[36, 0], [-32, 10]], way: [100, 190], hands: [[28, 4, 4], [32, -2, -16]], elbow: [0.2, 1, -1],
  fingers: [[HAND.claw, 65, -30], [HAND.claw, 60, -10]] }
// (a pose's hands turned from the floor's axes into the shoulders' frame; its feet from the floor into the hips')
const posed = (o) => { const q = { ...STANCE, ...o }, h = 180 + q.turn, t = (h + q.twist) * RAD
  return { ...q, head: 130 - (h + q.twist), feet: q.feet.map((f) => hipsFloor(f, q.turn)), toes: [h - q.way[0], q.way[1] - h],
    hands: q.hands.map(([e, a, u]) => [e * Math.sin(t) + a * Math.cos(t), e * Math.cos(t) - a * Math.sin(t), u]) } }
// the idle (13.10 and 13.12: a heavy's breath is in his shoulders, his knees and his hands, the feet planted; the 2D
// grapplers' shoulders 4-8% of their height, the head less as it sinks into the risen trapezius, the knees 1-3 px,
// the hands 2-7 px and a drawing or two late): 8 drawings of 9 ticks, the chest and the shoulders up the spine 5 px
// over knees that straighten 1 px as he breathes in (6 px in all, 4.8% of his guard), the trapezius and the chest
// swelling with it, the head sinking 1.5 px into the risen shoulders (4.5 px in all), the hands two drawings late, up
// 3 px more and out, their claws closing 12 degrees and opening again (13.13: the grapplers' claws flex with the breath)
const BREATH = [0, 0.3, 0.7, 1, 1, 0.75, 0.4, 0.1], LAG = 2
const idle = (i) => { const b = BREATH[i], l = BREATH[(i + 8 - LAG) % 8]
  return posed({ phase: "idle", breath: b, rise: 5 * b, down: STANCE.down - b, hands: STANCE.hands.map(([e, a, u]) => [e + 1.5 * l, a, u + 3 * l]),
    fingers: STANCE.fingers.map(([c, r, w]) => [c + 12 * l, r, w]) }) }
const MOVES = { idle: { pose: idle, ms: BREATH.map(() => 150) } }
const W = 150, H = 150, PIV = [50, 146], PITCH = F.camera.pitch

// ---------------------------------------------------------------- the tones (fighter.toonOf: Xrd's threshold)
// His materials, each [its line, its fills dark to light, the cuts between them]: skin S s m z Z (S its crease tone,
// only a crease reaches it; the shadow s the widest band and the light Z the narrowest, as 13.8 found the heavies'),
// apron A a c l, gauntlets E e g, boots E e g (black line), trousers N n i, the soles a; the beard is the head's (by hand)
const TONE = { skin: ["S", "SsmzZ", [0.08, 0.52, 0.68, 0.91]], apron: ["A", "acl", [0.42, 0.84]], glove: ["E", "Eeg", [0.25, 0.55]],
  boot: ["k", "Eeg", [0.3, 0.78]], tr: ["N", "Nni", [0.4, 0.86]], sole: ["k", "a", []], strap: ["A", "a", []] }
const toon = fighter.toonOf(TONE, "S")
// a material with its bias: the place's own, a shadow cast on it, a crease (deep), a light (shine, below 0)
const T = (m, base, cast = 0, occ = 0, shine = 0) => toon(m, base + cast + shine, occ)
// (each mass of skin lit on its top and in shadow under it, as the heavies' muscle is painted: what faces down a step darker)
const U = (n) => (n[2] < -0.15 ? 0.22 : 0)
// a table of [h, value] read at h (linear between its rows)
const lerp = (rows, h) => { let k = 1; while (k < rows.length - 1 && h > rows[k][0]) k++
  const [h0, v0] = rows[k - 1], [h1, v1] = rows[k]; return v0 + (v1 - v0) * clamp((h - h0) / (h1 - h0)) }
// The trunk's section from the seat (h 0, 2 px under the pelvis) to over the shoulders' line (h 1), half its width and
// its depth ahead and behind of the spine, px (13.9's heavies at his size: the chest 40 across and 27 deep, the lats the
// widest at its foot, the waist 29 across and 24 deep, a barrel whose belly comes as far forward as the chest; the
// pecs a mass ahead of it; a man's trunk 0.85 of this across and 0.8 as deep)
const SIDE = [[0, 15.5], [0.25, 14.5], [0.45, 15.5], [0.62, 18.5], [0.75, 20], [0.88, 20], [1, 18]]
const FRONT = [[0, 12], [0.25, 13], [0.45, 14], [0.62, 13.5], [0.75, 14.5], [0.88, 13.5], [1, 11]]
const BACK = [[0, 12.5], [0.25, 11], [0.45, 11.5], [0.62, 12.5], [0.75, 13], [0.88, 13], [1, 11]]

// ---------------------------------------------------------------- his parts, each painted in its own coordinates
// the hand modeled as the heavies' are built (the study's 13.11), in its own frame from the wrist (y along the hand, x
// across with the thumb at +x, z out of its back): 18 px from the wrist to the middle finger's tip (the heavies' 1.07-1.24
// heads), the palm 0.48 of it and 0.7 across, four fingers from a knuckle line across it (the middle 0.52 of the hand,
// the index 0.45, the ring 0.47, the little 0.33), each in three bones bent at its knuckles toward the palm by `curl`
// degrees (the middle knuckle the most) and fanned apart, the more the more open (a claw 1.5 times a grip's 28 degrees,
// as the 2D heavies spread theirs), 2 px thick so a px parts them; the thumb from the palm's side by the wrist, out and
// forward, opposed (its tip 0.8 of the hand from the wrist); in the gauntlet's leather
const handOf = (fb, curl, side = 1) => {
  const finger = (x, ln, fan) => { x *= side; fan *= side; const segs = [0.45, 0.3, 0.25].map((s) => s * ln), bend = [0.6, 1, 0.7].map((s) => s * curl * RAD)
    let p = [x, 8.2, 0.4], a = 0; const caps = []
    segs.forEach((s, k) => { a += bend[k]; const q = add(p, [s * Math.sin(fan * RAD) * Math.cos(a), s * Math.cos(fan * RAD) * Math.cos(a), -s * Math.sin(a)]); caps.push(sdf.capsule(p, q, 0.98 - 0.06 * k, 0.9 - 0.06 * k)); p = q })
    return sdf.union(...caps, { smooth: 0.3 }) }
  const spread = 1.8 - (0.8 * Math.min(curl, 90)) / 90
  const fingers = [[4.8, 8.1, 14], [1.6, 9.4, 5], [-1.6, 8.5, -5], [-4.8, 6, -14]].map(([x, ln, fan]) => finger(x, ln, fan * spread))
  const t0 = [5 * side, 1.6, -1.2], t1 = add(t0, mul(unit([0.6 * side, 0.7, -0.45]), 5.4)), t2 = add(t1, mul(unit([0.15 * side, 0.9, -0.5 - curl / 120]), 4.4))
  const thumb = sdf.union(sdf.capsule(t0, t1, 1.7, 1.4), sdf.capsule(t1, t2, 1.35, 1.1), { smooth: 0.4 })
  return sdf.union(sdf.box([12, 8.6, 4.6], { round: 2 }).at(0, 4.6, 0), ...fingers, thumb, { smooth: 0.7 })
    .paint((q, n) => T("glove", fb + 0.22 + (n[2] < -0.4 ? 0.3 : 0), 0, 0, n[2] > 0.3 ? -0.45 : 0)).part("hand") }

// the figure below the head, part by part, for a frame's joints
const parts = (j, p = {}) => {
  const out = {}, twist = Math.atan2(dot(j.sh.f, j.r), dot(j.sh.f, j.f)), near = j.depth(j.legs[1].hip) > j.depth(j.legs[0].hip) ? 1 : 0, na = nearArm(j) === "arm1" ? 1 : 0, b = p.breath ?? 0
  const armB = j.arms.map((A) => [[A.sh, A.elbow, 8.4, 7.2], [A.elbow, A.hand, 7.6, 6.4], [A.hand, A.hand, 8, 8]])
  const legB = j.legs.map((L) => [[L.hip, L.knee, 12.5, 10.5], [L.knee, L.ankle, 10.5, 9]])
  // the trunk: a barrel swept up his spine (SIDE, FRONT, BACK), the chest swelling 1 px on a breath; its angle round
  // turned from the hips' way at its foot to the shoulders' at its top; the pecs a mass ahead, a crescent of shadow
  // under them, a crease only at its deepest, short, by the middle (13.8: a crease only where masses part deep: under
  // the pec, the armpit; the muscle by tone, each mass lit on top and in shadow under it); the belly in two columns of
  // blocks under them, each a step darker under its lit top; the side the camera sees a mid tone, the back in shadow;
  // the armpit a short crease where each upper arm leaves the trunk
  const z0 = j.pelvis[2] - 2, top = j.chest[2] + 4, lean = sub(j.chest, j.pelvis), hips = [j.pelvis[0], j.pelvis[1], 0]
  const along = (h) => { const t = (z0 + h * (top - z0) - j.pelvis[2]) / lean[2]; return [lean[0] * Math.max(0, t), lean[1] * Math.max(0, t)] }
  const ahead = (h, a) => a - twist * smooth(0.25, 0.8, h)
  const R = (h, a) => { const c = Math.cos(ahead(h, a)), s = Math.sin(ahead(h, a)), side = lerp(SIDE, h), ax = c >= 0 ? lerp(FRONT, h) + b * 0.8 * smooth(0.5, 0.75, h) : lerp(BACK, h)
    return 1 / Math.sqrt((c * c) / (ax * ax) + (s * s) / (side * side)) + 2.6 * Math.exp(-(((h - 0.8) / 0.1) ** 2)) * Math.max(0, Math.abs(c) > 0.25 ? c : 0) ** 2 }
  const PEC = 0.7
  const trunk = j.sweep(hips, z0, top, R, { shift: along }), lerp3 = (a, c, t) => add(a, mul(sub(c, a), t))
  const pits = j.arms.map((A) => [lerp3(A.sh, A.elbow, 0.2), lerp3(A.sh, A.elbow, 0.45), 8.2, 7.9])
  const torso = trunk.field.paint((q, n) => { const [h, a] = trunk.at(q), c = ahead(h, a), ac = Math.abs(c)
    const pec = ac < 1.2 && h > PEC - 0.05 && h < PEC + 0.02, abs = ac < 0.6 && h > 0.3 && h < PEC - 0.07 && (ac < 0.06 || band(h * 52, 5, 4.4, 0.6)), side = ac > 0.95 && ac < 2.1
    return T("skin", U(n) + (ac > 2.4 ? 0.18 : 0) + (h < PEC ? 0.08 : 0) + (pec ? 0.4 : 0) + (abs ? 0.3 : 0), 0.4 * shadowed(q, armB.flat()), (pec && ac > 0.12 && ac < 0.45 ? 0.5 : 0) + 0.45 * nearOf(q, pits, 2),
      (h > PEC + 0.08 && h < 0.92 && ac < 1 && n[2] > 0.15 ? -0.3 : 0) + (side ? -0.15 : 0)) })
  // the trapezius (13.9: the heavies' rises half-way out to their chin, 10-13 px over the shoulders' joints, the neck
  // hidden in it): a wedge from round the head's foot out to each shoulder, swelling 1 px with the breath; lit on its
  // top, the back of it in shadow; one mass with the trunk (one part: no line between them)
  const neck = add(j.chest, [0, 0, 7]), back = mul(j.sh.f, -2)
  const traps = sdf.union(sdf.ellipsoid([8, 7, 8 + b]).at(...add(neck, add(back, [0, 0, -1]))), ...j.arms.map((A) => sdf.capsule(add(neck, back), add(A.sh, [0, 0, 3.5]), 6.4 + 0.6 * b, 5.6)), { smooth: 2.5 })
    .paint((q, n) => T("skin", U(n) + 0.1, 0.4 * shadowed(q, armB.flat()), 0, n[2] > 0.55 ? -0.3 : 0))
  out.torso = sdf.union(torso, traps, { smooth: 1 })
  // the apron: leather from his waist over his thighs to above his knees (a skirt that follows each thigh's front, the
  // near one leading, so the stance reads under it), with its bib over the barrel to under the pecs; a shell 1.4 px
  // thick; the bib's top edge lit, its sides turning away into shadow; on each thigh two folds down from the waist
  // (a groove a step darker, a lit ridge beside it), its hem a step darker; the arms' and the near thigh's shadows; a
  // strap from each corner of the bib up round his neck, the ties round his waist
  const waist = z0 + 0.25 * (top - z0), bib = z0 + (PEC - 0.04) * (top - z0), hw = 0.25
  const BIB = j.sweep(hips, waist - 2, bib, (h, a) => R(hw + h * (PEC - 0.04 - hw), a) + 1.2, { keep: (h, a) => Math.abs(ahead(0.5, a)) < 0.9 - 0.15 * h, shell: 0.7, shift: (h) => along(hw + h * (PEC - 0.04 - hw)) })
  // (the skirt a curtain hung from the waist to above the knees, flaring a px as it falls, the thighs pushing it out
  // where they come forward; its hem level)
  const hemZ = Math.max(...j.legs.map((L) => L.knee[2])) + 7
  const SEAT = j.sweep(hips, hemZ, waist, (h, a) => R(hw, a) + 1.4 + (1 - h) * 1.2, { keep: (h, a) => Math.abs(ahead(hw, a)) < 1 - 0.1 * h, shell: 0.7, shift: () => along(hw) })
  const thighs = j.legs.map((L) => { const u = unit(sub(L.knee, L.hip)), f = unit(sub(j.f, mul(u, dot(j.f, u))))
    return sdf.capsule(L.hip, L.knee, 14.4, 11.4).subtract(sdf.capsule(L.hip, L.knee, 13, 10)).intersect(sdf.plane(mul(f, -1), -dot(f, L.hip) + 3), sdf.plane([0, 0, -1], -hemZ)) })
  const skirt = sdf.union(SEAT.field, ...thighs, { smooth: 1.6 }), hem = (q) => q[2] - hemZ
  out.apron = sdf.union(BIB.field, skirt, { smooth: 1 }).paint((q, n) => { const lg = j.legs.map((L) => capD(q, [L.hip, L.knee, 14.4, 11.4]) < 1.2), on = lg[1 - near] ? 1 - near : lg[near] ? near : -1
    const v = sub(q, j.pelvis), ang = Math.atan2(dot(v, j.r), dot(v, j.f)), drop = clamp((waist - q[2]) / (waist - hemZ)), at = (f) => f * (1 + 0.3 * drop), w = 0.035 + 0.06 * drop
    const groove = q[2] < waist - 2 && [-0.6, -0.1, 0.45].some((f) => Math.abs(ang - at(f)) < w), ridge = q[2] < waist - 4 && [-0.6, -0.1, 0.45].some((f) => Math.abs(ang - at(f) + w + 0.05) < 0.045)
    const far = on >= 0 && on !== near ? 0.1 : 0, edge = hem(q) < 1.4 ? 0.3 : 0, turn = Math.abs(ahead(hw, ang)) > 0.8 ? 0.22 : 0
    const shade = 0.4 * shadowed(q, armB.flat()) + 0.3 * shadowed(q, [legB[near][0]], 8)
    return T("apron", far + edge + turn + (groove ? 0.4 : 0), shade, 0, (q[2] > bib - 1.6 && n[2] > -0.2) || ridge ? -0.32 : 0) })
  const corner = (s) => add([j.pelvis[0], j.pelvis[1], bib], add(along(PEC - 0.04).concat(0), add(mul(j.sh.r, 10 * s), mul(j.sh.f, 13))))
  out.straps = j.arms.map((A, i) => { const s = i ? 1 : -1; return sdf.capsule(corner(s), add(neck, mul(j.sh.r, 6 * s)), 1.1).paint(() => T("strap", 0)) })
  out.ties = j.sweep(hips, waist - 1.2, waist + 1.2, (h, a) => R(hw, a) + 1, { keep: (h, a) => Math.abs(ahead(hw, a)) > 1.15, shift: () => along(hw) }).field.paint(() => T("strap", 0))
  // the trousers: each leg a thick thigh and calf (13.9: the heavies' 20-25 px round) and a shin, the seat round his hips, into
  // the boots below the knee; the side away and the inner thigh in shadow, the apron's hem's shadow under it, the near
  // leg's on the far; two long folds down each, a lit ridge beside each
  const legs = j.legs.map((L, i) => { const far = i !== near, lb = far ? 0.08 : 0, inner = mul(j.r, i ? -1 : 1), bootTop = add(L.ankle, mul(unit(sub(L.knee, L.ankle)), 15))
    const sh = (q) => (hem(q) > -4 && hem(q) < 0 ? 0.3 : 0) + (far ? 0.3 * shadowed(q, legB[near], 10) : 0)
    const paint = (t, a, q) => T("tr", lb + (Math.abs(a) > 2.2 ? 0.22 : a > 1 ? 0.14 : 0) + (band(a * 7 + t * 2, 6.3, 1.2, 0.45) ? 0.4 : band(a * 7 + t * 2, 6.3, 2.1, 0.4) ? -0.3 : 0), sh(q))
    const seat = far ? [sdf.ellipsoid([14, 13, 11]).at(j.pelvis[0], j.pelvis[1], j.pelvis[2] - 3).paint((q) => T("tr", 0.1, sh(q), nearOf(q, legB[near], 3) * 0.45))] : []
    return sdf.union(bone(L.hip, L.knee, 12.5, 10.5, j.f, inner, paint), bone(L.knee, bootTop, 10.5, 8.2, j.f, inner, paint), ...seat, { smooth: 2 }).intersect(sdf.plane([0, 0, 1], waist)) })
  out.legFar = legs[1 - near]; out.legNear = legs[near]
  // the boots, as the heavies' are built (the study's 13.11: the foot 0.18-0.22 of the height with its boot, the ankle a
  // quarter of the foot over the sole and from the heel; over the sole the heel's counter 0.35 of the foot, the instep
  // 0.38, the ball 0.27, the toe box 0.2, the tip 0.15, round; the sole flat, a band of its own value): a foot 26 px from
  // heel to toe on the rig's sole, built along its heading (a heel block, the instep, a low round toe box over a slab as
  // wide as the foot, so the sole's near edge, its lowest row, is straight), its sole 1.5 px (the heel's 2) in the
  // sole's tone flat on the floor, the toe rising off it, the toe cap and the instep's top lit; the toe box round and
  // as wide as the ball (0.52 of the foot, the heavies' 0.48-0.55), wider than the ankle, so a boot turned to the
  // camera still reads as one (13.13: a round toe lit on top over a sole line, as the low grapplers' front feet are
  // drawn); a shaft round the shin from the ankle (narrower than the foot) to 15 px up, a little wider than the trouser
  // it takes in, two straps round it (a groove, its top lit) and its rim lit; black-lined, mostly dark
  out.boots = j.legs.map((L, i) => { const fb = i !== near ? 0.08 : 0, up = unit(sub(L.knee, L.ankle)), at = (z) => add(L.ankle, mul(up, z))
    const f = [Math.sin(L.heading * RAD), Math.cos(L.heading * RAD), 0], o = [L.ankle[0], L.ankle[1], L.ball[2]], ahead = (q) => dot(sub(q, o), f)
    const shaft = sdf.capsule(at(0), at(15), 6.2, 8.6).paint((q, n) => { const z = dot(sub(q, L.ankle), up)
      return T("boot", fb + (z > 13.6 || band(z, 6, 3.4, 0.5) ? -0.4 : band(z, 6, 2.6, 0.45) ? 0.35 : 0), 0, 0, n[2] > 0.5 ? -0.3 : 0) })
    const foot = aimed(sdf.union(sdf.ellipsoid([5.4, 4.6, 5]).at(0, -2.4, 4.6), sdf.capsule([0, -1.5, 6.5], [0, 10, 3.2], 6, 5.2), sdf.ellipsoid([7, 6.8, 4.4]).at(0, 12.8, 3.8), sdf.box([13.6, 18, 3.2], { round: 1.6 }).at(0, 2.2, 0), { smooth: 1.6 })
      .intersect(sdf.plane([0, 0, -1], 0)), f, o).paint((q, n) => { const h = q[2] - o[2], y = ahead(q)
        if (h < 1.5 || (h < 2.2 && y < -2.5)) return T("sole", fb)
        return T("boot", fb + 0.1, 0, 0, n[2] > 0.55 && y > -1 ? -0.45 : 0) })
    return sdf.union(shaft, foot, { smooth: 1.2 }) })
  // the arms (13.9: the heavies' deltoids 3.4-3.9 heads across, the upper arm 15-18 px round, the forearm 11-16): the
  // deltoid a ball over the shoulder (a light on its top), parted from the biceps by a short crease on its outside; the
  // biceps a mass ahead (its top lit, its underside in shadow), the elbow's fold; the forearm bare to its middle, then
  // the gauntlet: a flared cuff, its leather over the rest of the forearm to the wrist, two straps round it; the hand
  // modeled at the wrist, shaped by the pose's `fingers` (its curl, its roll round the forearm, its bend at the wrist)
  j.arms.forEach((A, i) => {
    const far = i !== na, fb = far ? 0.12 : 0, inner = mul(j.sh.r, i ? -1 : 1), fd = sub(A.hand, A.elbow)
    const ud = unit(sub(A.elbow, A.sh)), out_ = mul(j.sh.r, i ? 1 : -1)
    const delt = sdf.ellipsoid([10, 10, 9.4]).at(...add(add(A.sh, mul(ud, 2.6)), add(mul(out_, 2.4), [0, 0, 1.6]))).paint((q, n) => T("skin", U(n) + fb + (n[2] < -0.3 ? 0.12 : 0), 0, 0, n[2] > 0.5 ? -0.3 : 0))
    const upper = bone(A.sh, A.elbow, 8.4, 7.2, j.sh.f, inner, (t, a, q, n) => T("skin", U(n) + fb + (Math.abs(a) > 2.1 ? 0.14 : 0), 0, (t > 0.42 && t < 0.54 && a < -0.6 && a > -1.5 ? 0.42 : 0) + (t > 0.85 && a > 0.3 ? 0.42 : 0), n[2] > 0.55 && t > 0.5 && t < 0.85 ? -0.25 : 0))
    const bic = sdf.ellipsoid([6.6, 7.6, 6.2]).at(...add(add(A.sh, mul(ud, 15)), mul(j.sh.f, 2))).paint((q, n) => T("skin", U(n) + fb, 0, 0, n[2] > 0.55 ? -0.25 : 0))
    const cuff = 0.4, fore = bone(A.elbow, add(A.hand, mul(unit(fd), -4.5)), 7.6, 6.2, j.sh.f, inner, (t, a, q, n, L) => t < cuff ? T("skin", U(n) + fb + (Math.abs(a) > 2 ? 0.14 : 0), 0, t < 0.14 && a > 0.3 ? 0.42 : 0, n[2] > 0.6 ? -0.2 : 0)
      : T("glove", fb + 0.22 + (n[2] < -0.4 ? 0.3 : 0) + (band(t * L, 5, 3.6, 0.55) ? 0.4 : 0), 0, 0, n[2] > 0.3 ? -0.45 : 0))
    const flare = sdf.capsule(add(A.elbow, mul(fd, cuff - 0.02)), add(A.elbow, mul(fd, cuff + 0.1)), 8.6, 8).paint((q, n) => T("glove", fb + 0.22, 0, 0, n[2] > 0.2 ? -0.45 : 0))
    const [curl, palm, bend = 0] = (p.fingers ?? STANCE.fingers)[i], wrist = add(A.hand, mul(unit(fd), -4.5)), cocked = unit(add(unit(fd), [0, 0, 0.22]))
    out[`arm${i}`] = sdf.union(upper, delt, bic, fore, flare, aimed(handOf(fb, curl, i ? -1 : 1).rotate(bend, "x").rotate(palm, "y"), cocked, wrist), { smooth: 1 })
  })
  return out
}

// ---------------------------------------------------------------- the cleanup, by rules, over each rendered frame
// - fighter.clean's corners and lone speckles on his lines' darks (k S A E N), on each render;
// - over the frame as composed (each pixel's part carried by the stamps), the skin's line where 13.8 puts none:
//   "one mass": where the trunk and an arm meet over the shoulder (the deltoid's top on the trapezius: within 14 px of
//   the joint, no lower than it), the line between them takes the arm's fill beside it; a line between parts stays only
//   at a real depth break (the chest before the far arm, the near arm before the pec and the belly);
//   "lit side": the skin's outer line where the skin inside it is lit takes that light tone (the line on bare skin only
//   on its shadow side, as selout: a fifth of the heavies' edge); the head, drawn by hand, keeps its own
const LINES = "kSAEN", tidy = (c) => fighter.clean(c, LINES)
const mend = (c, j, head) => { const { w, h } = c.img, D = c.img.data, P = c.img.parts
  if (!P) return
  const S = c.color("S"), fill = new Set([..."smzZ"].map((k) => c.color(k))), lit = new Set([..."mzZ"].map((k) => c.color(k)))
  const part = (i) => (P.ids[i] >= 0 ? P.names[P.ids[i]].split(".")[0] : ""), clear = (i) => (D[i] & 255) < 128
  // (the head, drawn by hand, keeps its own: [x0, y0, x1, y1] where it was stamped)
  const own = (i) => { const x = i % w, y = (i - x) / w; return part(i) || !(x >= head[0] && x < head[2] && y >= head[1] && y < head[3]) }
  const sh = j.arms.map((A) => RIG.screen(A.sh)), pass = (rule) => { const set = []
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x, nb = [i - 1, i + 1, i - w, i + w]
      if (D[i] === S && own(i)) { const v = rule(i, x, y, nb); if (v !== undefined) set.push([i, v]) } }
    for (const [i, v] of set) D[i] = v }
  // one mass: over the shoulder, between the trunk's part and an arm's, the arm's fill
  pass((i, x, y, nb) => { const skin = nb.filter((k) => fill.has(D[k]) && part(k))
    if (nb.some(clear) || !sh.some(([sx, sy]) => Math.hypot(x - sx, y - sy) < 14 && y < sy + 2) || new Set(skin.map(part)).size < 2) return
    return D[skin.find((k) => part(k).startsWith("arm")) ?? skin[0]] })
  // the lit side: on the edge, the light tone inside it; then what that leaves of the line, a speck (3 px at most)
  // with nothing darker than a light tone beside it, the same
  pass((i, x, y, nb) => (nb.some(clear) ? D[nb.find((k) => lit.has(D[k]) && own(k))] : undefined))
  const seen = new Uint8Array(w * h)
  for (let i0 = w; i0 < w * (h - 1); i0++) { if (seen[i0] || D[i0] !== S || !own(i0)) continue
    const blob = [i0], around = new Set(); seen[i0] = 1
    for (let q = 0; q < blob.length; q++) { const i = blob[q]
      for (const k of [i - 1, i + 1, i - w, i + w, i - w - 1, i - w + 1, i + w - 1, i + w + 1]) if (D[k] === S) { if (!seen[k]) { seen[k] = 1; blob.push(k) } } else if ([i - 1, i + 1, i - w, i + w].includes(k)) around.add(k) }
    const o = [...around], l = o.find((k) => lit.has(D[k]) && own(k))
    if (blob.length <= 3 && l !== undefined && o.every((k) => clear(k) || lit.has(D[k]))) for (const i of blob) D[i] = D[l] } }

// ---------------------------------------------------------------- his body in 3D, in two
// Each sole on the floor; the head drawn by hand, so the body is drawn in two: all of it but the near arm (cleaned),
// then the near arm alone (and his flat blocks, _hf_bk_<move>_s); the head between
const LOOK = { body: BODY, headings: ["s"], pitch: PITCH, w: W, h: H, pivot: PIV, surface: SURFACE,
  moves: Object.fromEntries(Object.entries(MOVES).map(([m, M]) => [m, { frames: M.ms.length, ms: M.ms, pose: M.pose }])) }
const RIG = rig3d("_hf_body", { ...LOOK, parts: (j, p) => { const P = parts(j, p); delete P[nearArm(j)]; return P }, draw: tidy })
rig3d("_hf_arm", { ...LOOK, blocks: "_hf_bk", parts: (j, p) => { const A = nearArm(j); return { [A]: parts(j, p)[A] } }, draw: tidy })

// ---------------------------------------------------------------- his head, drawn by hand near profile
// Turned 20 degrees from profile, on her, as KOF's heavies draw theirs (10-35), so its features read as a profile
// (the study's 13.11, SF6's heavies drawn at his camera): the size of Reva's (18 px crown to chin), 16 px across at the
// eye (theirs 15-17 at that size whatever the turn), the ear 0.63 of the way back (theirs at 20 degrees 0.58-0.66), the
// face upright over the neck (the brow, the nose, the moustache and the beard's front on one line, 6 degrees off the
// vertical). Bald: the dome in its mid tones, a 4 x 3 light on its top front, its back third a step darker and lined.
// The brow a dark bar 2 px tall straight over the eye, a px out of the profile; the eye a lash and a px of light; the
// nose a step out, its underside dark. The beard as a beard sits on a jaw: from the sideburn by the ear down the jaw,
// its top edge falling 45 degrees from the ear to the moustache (Zangief's 41) so the cheek shows over it, the
// moustache under the nose, a px of lower lip under it, the mass under the chin into its braid (two leather ties)
const HEAD = `
  .....SSSSSS......
  ...SSmzZZzzSS....
  ..SmmzZZZZzzzS...
  .SsmmzzZZzzzzzS..
  .SsmmmzzzzzzzzzS.
  SssmmmzzzzzzzzzS.
  SssmmmmzzzzzHHHHk
  SssmmmmmzzzHHHHk.
  SsssmSSmHzzzkkZS.
  SsssSmmSHzzzZzzzS
  SsssSmsSHhzzzzzzz
  .SsssSSHHHhzzzsSS
  .SsssHHhHHHhhhhHk
  .SssskHHHhHHHHzS.
  ..SsskHHHHhHHHHk.
  ..SssskHhHHHhHHk.
  ...SsskHHhHHHhk..
  ....kkkHHHhHHHk..
  ......kHHHHhHk...
  .......kHhHHk....
  .......kcccck....
  ........khHk.....
  ........kHhk.....
  ........kcck.....
  ........khHk.....
  .........kk......`
sprite("_hf_head", { pivot: [8, 8] }, HEAD)
// no neck: stamped with the jaw on the trapezius and the face ahead of the shoulders, as the heavies' heads sit (13.11:
// the chin 0.36-0.46 heads over the shoulders' joints, the eye 0.5-0.66 heads ahead of them): its middle 4 px ahead of
// the head's joint and 2 up, the chin 7.6 px over the shoulders' joints, the eye 8.5 ahead of the spine
const HEAD_AT = [4, -2]

// ---------------------------------------------------------------- what each frame says to an engine
// hurt boxes round the head, the body (chest, pelvis, elbows: 1.5 of her width, as the heavies' are) and the legs,
// from the joints the body is drawn on; the phase
const boxOf = (pts, m) => fighter.boxOf(pts, m, W, H)
const boxes = (c, p) => { const j = RIG.joints(p, 180), S = (q) => RIG.screen(q)
  c.setBox("hurt", ...boxOf([add(S(j.head), HEAD_AT)], 9))
  c.setBox("hurt", ...boxOf([S(j.chest), S(j.pelvis), ...j.arms.map((A) => S(A.elbow))], 5))
  c.setBox("hurt", ...boxOf([S(j.pelvis), ...j.legs.flatMap((L) => [S(L.knee), S(L.foot)])], 4))
  c.setData({ phase: p.phase }) }

// ---------------------------------------------------------------- the moves, facing e: the body, the head, the near arm
const ON = { w: W, h: H, pivot: PIV, genre: "fighting", category: "heavy" }
for (const [m, M] of Object.entries(MOVES))
  anim(m, ON, (c) => { const i = c.frame, p = M.pose(i), j = RIG.joints(p, 180), [x, y] = RIG.screen(j.head).map(Math.round)
    c.stamp(`_hf_body_${m}_s`, ...PIV, { frame: i })
    const hx = x + HEAD_AT[0], hy = y + HEAD_AT[1] + Math.round(1.5 * (p.breath ?? 0))
    c.stamp("_hf_head", hx, hy)
    c.stamp(`_hf_arm_${m}_s`, ...PIV, { frame: i })
    mend(c, j, [hx - 8, hy - 8, hx + 9, hy + 18]); pinholes(c); boxes(c, p) }, ...M.ms.map((ms) => frame({ ms })))
sheet("haldor_fighter", Object.keys(MOVES), { rows: "tag", pad: 2, slots: SLOTS })
card("idle", { is: "Haldor the smith, a heavy grappler 140 px standing (126-130 in his guard), side view in KOF 2002's school, Reva's opponent, in 3D on his rig with his head drawn by hand and his hands modeled (their shape a pose's fingers): bald, a braided black beard, a tan leather apron to above his knees over charcoal trousers, leather gauntlets, heavy boots; a grappler's low, wide guard, the rear foot turned to the camera with its knee, the hands open claws ready to grab (the palms down, the backs to the camera); idle facing e, hurt boxes and frame data from his joints", cells: { "side/?": "✓" }, category: "heavy",
  vary: { color: "3 palette slots on the sheet haldor_fighter (base, ash, moss: beard, apron, gauntlets and boots, trousers): haldorFighter.SLOTS", part: "his moves: idle facing e (the game flips him for w), on the sheet haldor_fighter; its blocks _hf_bk_idle_s" } })
Object.assign(haldorFighter, { SLOTS, MOVES, HAND, rig: RIG })
}
