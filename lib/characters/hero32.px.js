// The top-down hero at 48 px, for an action RPG seen from above at a 32 px grid (topdown32), on the genre's default
// body: slim, as Children of Morta's and Chained Echoes' figures are (library F5 4b-4f, measured for numbers only), seen
// from 15 degrees as they are (on the genre's 45 degree ground), 48 rows over the ground with his line, 3.4 heads, the
// head 14 rows. The same person as the 24 px hero (hero.px.js): his
// brown hair, his blue tunic, the belt with the gold buckle, dark trousers, brown boots and his sword, on hero.SLIM32's
// body and moves at the genre's timings (idle, walk, run and the sword attack facing down, up and to the side; the
// game flips the side for the fourth direction). Drawn as the 24 px hero is: a rig3d() skeleton dressed by dress()
// (hero.PLAIN at the genre's 4 tones a material: the cloth bloused a tone darker over the belt, the skirt's pleats, a
// crease where a knee or an elbow bends), the head a skull and a short hair of his own baked per view by views() and
// finished by hand, a near-black line all round, lit from above and a touch toward us; 18 colors (the genre's 24 at
// most), the far limbs a step darker. The sword and its crescent by hero.px.js's slash hook in this file's keys.
// The same hero on the genre's other body, the chibi (hero.G32, 2.4 heads, seen from 45 degrees; library F5 4h), in
// the same palette, outfit and sword: chibi_<move>_<direction>, the sheet hero32_chibi.
// Taken with include("<path>/lib/characters/hero32.px.js", { as: "hero32" }).
include("hero.px.js", { as: "hero", palette: true })
include("../profiles/topdown32.px.js")
// the fourth tones: the tunic's darkest, the trousers' darkest and lightest; keys of their own on the hero's colors: the
// leather's light (the hair's), the steel's shade (the tunic's)
pal({ N: "#25386b", Q: "#2b2740", q: "#7c7596", e: "#d68b52", v: "#4c7fd0" })
var hero32 = {}
// in a block: its names stay its own when a scene includes the file
{
// ---------------------------------------------------------------- the cell, and the sword's paint
// The slim's numbers (hero.SLIM32) with the sword painted: the blade's flat the steel's light (w) and its edge on
// the side it cuts toward a tone lighter (W), as the games show a level blade from above (a flat of 2-3 px and a
// light edge: Children of Morta, Chained Echoes); the grip the leather (d) behind a gold guard (g), a gold pommel. The
// crescent in the blade's light, in bands along it as Final Fantasy Resonance's (lightest at the blade, darkest at
// the tail; its outer edge, the tip's path, a step lighter than its inner): on the strike W, w and v; then a value
// darker, what it swept since still W; then broken in v.
const painted = (G) => { const GRIP = (G.sword.grip + 1.2) / (G.sword.grip + G.sword.len); return { ...G, paint: { blade: (t) => (t < 0.06 ? "g" : t < GRIP ? "d" : "w"), edge: "W", guard: "g",
  smear: (kind, u) => (kind === "full" ? (t) => (u + 0.3 * t > 0.75 ? "W" : u + 0.3 * t > 0.35 ? "w" : "v") : kind === "fade" ? (u > 1 ? "W" : (t) => (u + 0.3 * t > 0.9 ? "w" : "v")) : "v") } } }
const S = painted(hero.SLIM32)

// ---------------------------------------------------------------- the outfit, 4 tones a material
// The hero's (hero.PLAIN) as thick as this body: the tunic N n b c (bloused over the belt a tone darker, its skirt
// pleated every 60 degrees in its darkest), the trousers Q P p q, the boots and the belt D d l e, the skin h z s S
// (its darkest the hair's shade); the far limbs a step darker; `creases` the traveler's, at a bent knee or elbow. The
// tunic's body (`bodyRadius`) dress()'s, sloping into the neck over its top fifth, the trapezius, round a V of skin in
// the neck's shade (no straight collar under the chin: the user): 11 px deep in profile with its line (Chained Echoes'
// Glenn 8-9 at 45 rows), as wide as the 24 px hero's cloth on this body facing us.
// (an outfit for a body G: the slim's, and the chibi's below)
const ease = (t) => Math.min(1, Math.max(0, t)) ** 2
const outfit = (G) => {
  const KB = G.body.r.body[1] / dress.r.body[1]
  const bodyRadius = (h, a) => {
    const r = (4 - 0.5 * h * h) * KB * (0.84 + 0.16 * Math.abs(Math.sin(a))), t = ease((h - 0.8) / 0.2)
    return r * (1 - t) + 1.9 * t
  }
  return { ...hero.PLAIN, r: G.body.r, creases: true, bodyRadius,
    legs: (far) => ({ tr: far ? "QQPp" : "QPpq", shin: far ? "DDdl" : "Ddle", foot: far ? "DDdl" : "Ddle" }),
    skirt: (h, a, out) => (out ? (Math.abs(Math.sin(a * 3)) < 0.2 ? "NNNn" : "NNnb") : "N"), body: (h, a) => (h < 0.1 ? (Math.abs(a) < 0.35 ? "g" : "Dd") : h < 0.3 ? "NNnb" : Math.cos(a) > 0 && Math.abs(Math.sin(a)) * bodyRadius(h, a) < 5 * (h - 0.62) ? "hzzs" : "Nnbc"),
    sleeve: (far) => (far ? "NNnb" : "Nnbc"), fore: (far) => (far ? "hzzs" : "hzsS"), hand: (far) => (far ? "hzzs" : "hzsS") }
}
const OUTFIT = outfit(S)

// ---------------------------------------------------------------- the head: a skull and his short hair, painted by hand
// Modeled in the head's frame (x his right, y ahead, z up) for a head of radius 5, scaled to his 6.5. Grown up from the
// 24 px hero's: the skull narrower and longer with a chin, the hair a cap a row closer, the fringe of three locks.
// Baked once per view (s, sw, w, nw, n from 15 degrees, the body's; the east ones the west's) into a square whose
// middle is the head's, then painted by hand row by row over it (RETOUCH: each row the column it starts at and its
// keys on a grid of 31 whose middle (15, 15) is the head's; what a row doesn't give erased: the render is the draft).
// Seen from 15 degrees the crown shows little and the face its height: the head 14 rows (7 to 20), the hair 8 over
// the eyes, the face 6 from the lashes to the chin (Chained Echoes' 6-8, Final Fantasy Resonance's 6), the eyes a
// row under the head's middle. What a face holds at 14 rows:
// - facing us the eyes 2 x 2, a lash row of the line over the white outside and the pupil in (Chained Echoes' lash
//   over its iris), 3 px of skin between; the nose a pixel of the skin's lightest, the mouth one of its shade under
//   it; the face 11 px wide between the hair's sides; the chin rounded, its line the skin's shade over the neck;
// - in profile the eye 2 x 2 (the lash, the pupil and the white behind it), the nose a pixel of light out of the
//   line, the ear a pixel of skin before the hair, the jaw;
// - the hair's dark gaps (j) fanning from the crown down to the fringe's dark edge over the eyes, its light (L) on
//   top, its shade (h) at the sides; from behind the gaps run to the nape's rounded edge, the neck under it.
const SKULL = sdf.ellipsoid([3.9, 4.3, 4.7]).union(sdf.ellipsoid([2.5, 2.4, 2.4]).at(0, 1.7, -2.6), { smooth: 1.4 }).mat("hzsS")
const HAIR = sdf.ellipsoid([4.35, 4.6, 3.9]).at(0, -0.5, 1.5).union(sdf.ellipsoid([3.4, 2.2, 2.6]).at(0, -2.9, -1.2), { smooth: 0.9 })
  .subtract(sdf.ellipsoid([4.2, 4.3, 4.2]).at(0, 3.7, -0.9), sdf.capsule([-1.3, 4, 4], [-1.1, -1.4, 5], 0.35), { smooth: 0.35 })
  .union(sdf.capsule([-2.2, 3.0, 3.6], [-2.4, 4.1, 2.6], 0.65, 0.35), sdf.capsule([0.3, 3.3, 3.9], [0.6, 4.3, 2.8], 0.65, 0.35), sdf.capsule([2.3, 2.9, 3.6], [2.6, 4.0, 2.6], 0.65, 0.35), { smooth: 0.45 })
  .noise({ amp: 0.25, scale: 1.2, seed: 4 }).mat("jhYL")
const R31 = (G) => Array.from({ length: 31 }, (_, y) => (G[y] ? "_".repeat(G[y][0]) + G[y][1] + "_".repeat(31 - G[y][0] - G[y][1].length) : "_".repeat(31))).join("\n")
const RETOUCH = {
  s: R31({
    7: [13, "kkkkk"],
    8: [11, "kkLLLLLkk"],
    9: [10, "khLLLjLLLYk"],
    10: [9, "khYLLjYLLLYhk"],
    11: [9, "khYYjYYLLYYhk"],
    12: [9, "khYjYYYjYYYhk"],
    13: [9, "khjYYhjYYYjhk"],
    14: [9, "kjhjhjjhjhjjk"],
    15: [9, "khskkssskkshk"],
    16: [9, "kzsWkssskWszk"],
    17: [9, "kzssssSsssszk"],
    18: [10, "ksssszssssk"],
    19: [11, "kzssssszk"],
    20: [13, "zzzzz"],
  }),
  w: R31({
    7: [12, "kkkkk"],
    8: [10, "kkhLLLYkk"],
    9: [9, "khLLLjLLYhk"],
    10: [9, "kYLLjYLLYYhk"],
    11: [9, "kYYjYYLLjYYhk"],
    12: [9, "kYjYYYjYYYjhhk"],
    13: [9, "khjjYjYYjYYhhk"],
    14: [9, "ksjjjhYYjYYhhk"],
    15: [9, "kskksssshYjYhk"],
    16: [9, "kskWssszshjhhk"],
    17: [9, "Ssssssszshjhk"],
    18: [9, "ksssssszhjhk"],
    19: [9, "kzsssszhhk"],
    20: [10, "kzzzzk"],
  }),
  sw: R31({
    7: [14, "kkkkk"],
    8: [12, "kkhLLLLk"],
    9: [11, "khLLjLLLYk"],
    10: [10, "khYLLjLLLYhk"],
    11: [9, "khYYjYYjLYYYhk"],
    12: [8, "khYjYYYjYYYjYhk"],
    13: [9, "khjjYhjYYjYYhk"],
    14: [9, "kjjhjjhjYjYYhk"],
    15: [9, "kskksskhhYjYhk"],
    16: [9, "kskWsskszsYjk"],
    17: [9, "ksssSzssszhk"],
    18: [9, "kssssssszk"],
    19: [10, "kssszsssk"],
    20: [12, "zzzzz"],
  }),
  nw: R31({
    8: [11, "kkkhLLkkk"],
    9: [10, "khYLjLLYYk"],
    10: [9, "khYLjYLYYYhk"],
    11: [8, "khYjYYYjYYYjYhk"],
    12: [9, "khjYYYjYYYjYhk"],
    13: [9, "khjYYhjYYYjYhk"],
    14: [9, "khjYhhjYYhjhhk"],
    15: [9, "khhjhhjhYhjhhk"],
    16: [9, "kzhjhhjhhjhhhk"],
    17: [10, "zshjhhjhhjhhk"],
    18: [10, "kzshhjhhjhhhk"],
    19: [10, "kzzhjhhjhhk"],
    20: [11, "zzkjhhjhk"],
  }),
  n: R31({
    7: [14, "kkk"],
    8: [11, "kkhLLLhkk"],
    9: [10, "khYLLjLLYhk"],
    10: [9, "khYLjYYjLYYhk"],
    11: [9, "khYjYYYjYYjhk"],
    12: [9, "khjYYYjYYYjhk"],
    13: [9, "khjYYhjYYhjhk"],
    14: [9, "khjYhhjhYhjhk"],
    15: [9, "khjhhjhhjhjhk"],
    16: [9, "kshjhhjhhjhsk"],
    17: [9, "kzhjhhjhhjhzk"],
    18: [10, "khjhhjhhjhk"],
    19: [11, "kkjhjhjkk"],
  }),
}
views("_hd32", sdf.union(SKULL, HAIR).scale(S.body.r.head / 5), { pitch: S.pitch, ink: "k", jaw: ["z", "hzsS"], surface: { soft: 0.55, tones: 4 }, anchor: [15, 15], retouch: RETOUCH })

// ---------------------------------------------------------------- the hero at 48 px
// The figure lit harder than the 24 px hero (soft 0.3: a tone more across the body), a neck under the head; the
// walking moves in the genre's 32 x 64 frames, the attack in 96 x 96; the boxes and the attack's data as the 24 px
// hero's (foot and hurt every frame, hit on the strike and the hold). For the game: <move>_<down, up, side> (idle,
// walk, run, attack), standing on the row under the soles; the sheet hero32, a move and a direction a row.
const LIT = { soft: 0.3, tones: 4, clean: true }, DIRS = [["down", "s"], ["up", "n"], ["side", "e"]]
// a hand: hanging (the elbow bent under 60 degrees) past the wrist, palm to the thigh, along the forearm's line bent
// down at the wrist as far as the forearm swings up out of it (fingers down, knuckles ahead: level ahead it pointed at
// the crotch), `len` px from the wrist, `r` round at the wrist and the fingers; else a fist (dress()'s ball), as the
// sword's hand in the attack; `far` the far arm's (-1 none). hangs(A, p, i): the way a hanging hand points, else none
const hangs = (A, p, i) => {
  if (dress.bend(A.sh, A.elbow, A.hand) > 60 || (i && p.slash !== undefined)) return
  const f = A.hand.map((q, e) => q - A.elbow[e]), m = Math.hypot(...f), v = f.map((q, e) => q / m + (e === 2 ? -1.3 : 0)), n = Math.hypot(...v)
  return v.map((q) => q / n)
}
const hands = (j, p, d, [len, r0, r1] = [2.4, 1.2, 1], far = j.depth(j.arms[0].sh) < j.depth(j.arms[1].sh) ? 0 : 1) => {
  j.arms.forEach((A, i) => {
    const v = hangs(A, p, i)
    if (v) d[`arm${i}`][2] = j.limb(A.hand, A.hand.map((q, e) => q + v[e] * len), r0, r1, OUTFIT.hand(i === far))
  })
  return d
}
// the thumb (`hand` [len, r0]): a pixel of the skin's darkest where it parts from the fingers, on a hanging hand's
// front a little inward, if that side faces us and the hand's skin is there (LPC's base's hands: the thumb's split)
const thumbs = (c, j, p, [len, r0]) => {
  const skin = ["z", "s", "S"].map((q) => c.color(q))
  j.arms.forEach((A, i) => {
    const v = hangs(A, p, i)
    if (!v) return
    const Q = A.hand.map((q, e) => q + v[e] * 0.6 * len), P = Q.map((q, e) => q + ((j.f[e] ?? 0) * 0.7 - (j.r[e] ?? 0) * (i ? 0.25 : -0.25)) * r0)
    if (j.depth(P) < j.depth(Q) - 0.6) return
    const [x, y] = j.screen(P).map(Math.round)
    if (skin.includes(c.get(x, y))) c.px(x, y, "h")
  })
}
// the throat: a lone pixel of rig3d's line where the neck meets the tunic, left at the V's point facing us and in the
// collar's middle from behind (a hole at 1x), taken into the neck's shade between skin, else into the tunic beside it
const throat = (c, j) => {
  const [x0, y0] = j.screen(j.chest).map(Math.round), K = c.color("k"), skin = ["h", "z", "s", "S"].map((q) => c.color(q))
  for (let y = y0 - 2; y <= y0 + 2; y++) for (let x = x0 - 1; x <= x0 + 1; x++) {
    const n = [c.get(x - 1, y), c.get(x + 1, y), c.get(x, y - 1), c.get(x, y + 1)]
    if (c.get(x, y) === K && !n.includes(K)) skin.includes(n[0]) && skin.includes(n[1]) ? c.px(x, y, "z") : c.plot(x, y, n[0])
  }
}
// a body's figure: G its cell (painted), its anims `at`<move>_<dir> from the rigs _r<id> and _ra<id> (the attack's),
// `head` its views, `wear` its outfit, `hand` hands()'s (`thumb`: its thumb), `neck` its radii, `cap` how far down the
// upper arm the sleeve starts (a share of it); `even`: unless a shoulder is that many px behind the other, neither arm
// nor leg is the far one (dress() takes the nearer by a hair facing us: a forearm or a whole leg a step darker on the lit
// side); `inner` rig3d's
// (the line where one part meets another: the near-black unless given)
const figure = ({ G, at = "", id, head, wear, hand, neck = [1.6, 1.5], even = 0, thumb, cap = 0, inner }) => {
  const dressed = dress(wear), level = dress({ ...wear, sleeve: () => wear.sleeve(false), fore: () => wear.fore(false), hand: () => wear.hand(false), legs: () => wear.legs(false) })
  const fig = (rn, list, F) => rig3d(rn, { body: G.body, headings: ["s", "e", "n"], pitch: G.pitch, w: F.w, h: F.h, pivot: F.pivot, ink: "k", inner, surface: LIT, soles: G.soles,
    parts: (j, p) => {
      const J = cap ? { ...j, arms: j.arms.map((A) => ({ ...A, sh: A.sh.map((q, e) => q + (A.elbow[e] - q) * cap) })) } : j
      return { ...(Math.abs(j.depth(j.arms[0].sh) - j.depth(j.arms[1].sh)) < even ? hands(J, p, level(J, p), hand, -1) : hands(J, p, dressed(J, p), hand)), neck: j.limb(j.chest, [j.head[0], j.head[1], j.head[2] - 0.7 * G.body.r.head], ...neck, "hzsS") }
    },
    head, moves: hero.movesOf(list, false, G), draw: (c, j, p) => (throat(c, j), thumb && thumbs(c, j, p, hand), hero.boxes(G)(c, j, p)), genre: "topdown32" })
  const rig = fig(`_r${id}`, ["idle", "walk", "run"], G.frame)
  fig(`_ra${id}`, ["attack"], G.attack)
  for (const m of ["idle", "walk", "run", "attack"]) for (const [dir, d] of DIRS) {
    const [px, py] = (m === "attack" ? G.attack : G.frame).pivot
    anim(`${at}${m}_${dir}`, { base: `_r${m === "attack" ? "a" : ""}${id}_${m}_${d}`, pivot: [px, py + G.sole] })
  }
  return rig
}
const rig = figure({ G: S, id: "32", head: "_hd32", wear: OUTFIT })
sheet("hero32", ["idle_*", "walk_*", "run_*", "attack_*"], { rows: "tag", pad: 1 })
card("walk_down", { is: "the top-down hero at 48 px, the genre's slim body (3.4 heads) in his blue tunic: idle, walk, run and a sword attack facing down, up and to the side", cells: { "topdown/32": "✓" },
  vary: { part: "its moves: idle_, walk_, run_, attack_ down, up and side (flipped for the fourth), on the sheet hero32; its body and moves hero.px.js's SLIM32 (judged as flat blocks first)" } })

// ---------------------------------------------------------------- the chibi at 48 px
// The same hero on the genre's other body, hero.G32 (2.4 heads, seen from 45 degrees as topdown16's hero): the slim's
// palette, outfit (4 tones a material) and sword paint (its blade 24 px), as wide as the blocks (27 px facing us; 22 in
// profile, the blocks' 24 with their face's bump), 18 colors. The arm one piece hanging from a sloping shoulder (the
// user on 4h's first paint: the shoulders domed over the arms, the sleeves puffed): the sleeve starts 0.35 of the upper
// arm under the shoulder joint (`cap`: its top 2.2 px lower, inside the tunic's shoulder, so no line crosses the
// shoulder and the arm's line against the torso starts under it, as LPC's base draws it), its hem a tone lighter
// (nbbc: Nnbc left a dark blob there); facing us neither arm is the far one (`even`); the hands 4 px as the forearm,
// with the thumb's split. Its shoulders (hero.G32, 4i) inside the tunic's side, the arms hung out past it. Its lines inside one shape, not blocks (4j; the user: the legs'
// blocks showed where they joined the hips): where one part meets another the darkest tone of the part behind (rig3d's
// inner: "dark": the arm's edge on the tunic in the tunic's, the far leg behind the near in the trousers'), the near-black
// only round him, as the games draw a figure (measured on LPC, Eldiran, Chrono Trigger, the Minish Cap for numbers only:
// no black at a joint or under a hem). Its trousers one garment from the belt to the boots (4j; the user: the legs'
// blocks beside the skirt, the hips and the legs two colors, the hips wide and the seat out behind): the shirt tucked
// in at the belt, no skirt (dress()'s trousers, trousersOf: the belt on the trousers, the seat as wide as the shirt there
// and halved into the two legs, each thigh begun 1.7 px in and melted into it), so nothing parts a thigh from the hips
// and the near leg over the far keeps its line; facing us 13 px of shirt over the belt, 15 at the belt and the hips, 17
// at the knees (Eldiran's villager 10, 12, 14); in profile the seat inside the back's line, the thigh's front 1-2 px
// behind the belly; facing us and away both legs in the near leg's tones (`even`: on a tie one was the far one, a step
// darker to the boot).
// The head: the 24 px hero's round skull and short hair at a radius of 9.5, a fringe of five locks, baked per view (s,
// sw, w, nw, n from 45 degrees) and painted by hand over it (CRETOUCH, on R31's grid: the render the draft). From 45
// degrees the crown is the biggest area: the head 20 rows (5 to 24), 14 of them hair to the fringe's edge, lit on the
// crown (L), its shade (h) at the sides and the nape. What its face holds (LPC's base and the SNES heroes, measured for
// numbers only: library F5 4g):
// - facing us the eyes 3 x 3, a lash row of the line over the white outside and a 2 x 2 pupil (the line's dark over
//   the tunic's blue), 3 px apart, their top 70% down the head; the nose a pixel of the skin's lightest, no mouth (no
//   reference draws one); 13 px of skin between the sideburns, the chin's line in the skin's shade; the fringe five
//   locks of 3 px, their tips over the forehead's shade;
// - in profile the eye 2 x 3 (the lash, the pupil ahead of the white), the nose a pixel of light in the line's column,
//   the ear a smudge of skin under the side hair;
// - a tuft over his left temple breaking the round line (Chrono Trigger's lesson: the silhouette says who); from
//   behind the gaps (j) curving from a whorl to the nape.
// Its moves G32's, nudged for the paint: the hanging arms' elbows bend ahead or back, never out (the idle's and the
// walk's bowed 1.6 to 2.5 px out of the line from the shoulder to the hand, a puffed sleeve facing us: the user), the
// hands a third of a px further out (`out` 2.1 for 1.8: so straight, the arms stand 27 px across as the blocks');
// facing n the run's head doesn't rise over the pelvis in the air (stamped by its rounded middle, it stood a row over
// the other views there, 20.1 rows down the frame against 20.7 facing s).
const M = hero.G32.moves, nudge = (move, g) => ({ ...move, f: (i, hd) => g(move.f(i, hd), hd) })
const C = painted({ ...hero.G32, out: 2.1, moves: { ...M, idle: nudge(M.idle, (p) => ({ ...p, elbow: [-0.4, 0, -1] })), walk: nudge(M.walk, (p) => ({ ...p, elbow: [-1, 0, -0.5] })),
  run: nudge(M.run, (p, hd) => (hd === 0 && p.rise > 0 ? { ...p, rise: 0 } : p)) } })
const CSKULL = sdf.ellipsoid([4.2, 4.4, 4.4]).mat("hzsS")
const CHAIR = sdf.ellipsoid([4.6, 4.7, 4.1]).at(0, -0.3, 0.6).union(sdf.ellipsoid([3.6, 2.4, 2.8]).at(0, -3, -1.4), { smooth: 0.9 })
  .subtract(sdf.ellipsoid([4.2, 4.3, 4.3]).at(0, 3.6, -1.5), sdf.capsule([-1.4, 4, 4], [-1.2, -1.4, 5], 0.35), { smooth: 0.35 })
  .union(...[-2.8, -1.4, 0, 1.4, 2.8].map((x) => sdf.capsule([x, 3.1, 3.4], [x * 1.08 + 0.2, 4.4, 2.1], 0.6, 0.3)), { smooth: 0.4 })
  .noise({ amp: 0.25, scale: 1.2, seed: 4 }).mat("jhYL")
const CRETOUCH = {
  s: R31({
    5: [12, "kkkkkkk___k"],
    6: [10, "kkYLLLLYYkkkLk"],
    7: [8, "kkLLLLLLLLLLLYYhk"],
    8: [7, "khLLLLLLLLLLLLhYhk"],
    9: [6, "khLLLLLLLLLLLLLYYhk"],
    10: [6, "khYLLLLLLLLjLLYYYhk"],
    11: [5, "khYYLLjLLjLLjYLYYYYhk"],
    12: [5, "khYYLYjYLjYLjYLjYYYhk"],
    13: [5, "khYLYYjYYjYYjLYjLYYhk"],
    14: [5, "khYYYjhYYjhYjhYYjhYhk"],
    15: [5, "khYYYjhYjhYYjhYYjhYhk"],
    16: [5, "khYYjhYYjhYYjhYYjhYhk"],
    17: [5, "khYhjYYhjYYhjYYhjYhhk"],
    18: [5, "khhhzzhzzzhzzzhzzhhhk"],
    19: [5, "khhhsskkkssskkksshhhk"],
    20: [6, "khhssWkkssskkWsshhk"],
    21: [6, "kzsssWbbsssbbWssszk"],
    22: [7, "kzssssssSsssssszk"],
    23: [8, "kzssssssssssszk"],
    24: [10, "kzzzzzzzzzk"],
  }),
  sw: R31({
    5: [12, "kkkkkkk___k"],
    6: [10, "kkYLLLLYYkkkLk"],
    7: [8, "kkLLLLLLLLLLLYYhk"],
    8: [7, "khLLLLLLLLLLLLhYhk"],
    9: [6, "khLLLLLLLLLLLLLYYhk"],
    10: [6, "khYLLLLLLLLjLLYYYhk"],
    11: [5, "khYLjLLjLLjLYjYYYYYhk"],
    12: [5, "khYYjYLjYLjYYjYYjYYhk"],
    13: [5, "khYjhYjhYYjhYjhYjhYhk"],
    14: [5, "khYjhYjhYjhYYjhYYjhhk"],
    15: [5, "khjhYjhYYjhYYYjhYjhhk"],
    16: [5, "khjhYjhYjhYYYYjhYjhhk"],
    17: [5, "khjYhjYhjYhhYYjhYjhhk"],
    18: [5, "khzzhzzhzzhhjhhjhhjhk"],
    19: [5, "kzskksskkkszhhjhhjhhk"],
    20: [5, "kssWksskkWsszhjhhjhhk"],
    21: [5, "kzsWbssbbWssszhhjhhk"],
    22: [6, "kzssSssssszzhhhhhk"],
    23: [7, "kzssssssskhhhhhk"],
    24: [9, "kzzzzzkkkkkk"],
  }),
  w: R31({
    5: [11, "kkkkkkkkkkkk"],
    6: [9, "kkLLLLLLLLLLLkk"],
    7: [7, "kkLLLLLLLLLLLLLYhk"],
    8: [6, "kYYLLLLLLLLLLLjhYhk"],
    9: [6, "kYYLLLLLLLLLLjLLjYhk"],
    10: [5, "kYYYLLLLLLLLjLhjjhjYhk"],
    11: [5, "kYYYLLLLLLjLhLjhjYjYhk"],
    12: [5, "kYYYLLLLjLhLLjhYjYhjhk"],
    13: [5, "kYYYYYjYhYYYjhYjhYYjhk"],
    14: [5, "kYYYYjhYYYYjhYYjYYYjhk"],
    15: [5, "kYYYjhYYYYjhYYjhYYYjhk"],
    16: [5, "kYYjhYYYYjhYYYjYYYjhhk"],
    17: [5, "khjhjhjYjhYYYjhYYYjYhk"],
    18: [5, "kjzjzzjhjYYjYjYYjYhYhk"],
    19: [5, "kzskksszhYYjYhYYjYYYhk"],
    20: [5, "ksskWsszzhjhhhhjhhhhk"],
    21: [5, "SssbWssszhjhhhhjhhhhk"],
    22: [6, "ksssssszshhhhhhhhhk"],
    23: [7, "kzssszzhhhhhhhhhk"],
    24: [9, "kzzzzk_kkkkkk"],
  }),
  nw: R31({
    5: [8, "k___kkkkkkk"],
    6: [7, "kLkkkYYLLLLYkk"],
    7: [6, "khYLLLLLLLLLLLLkk"],
    8: [6, "khYLLLLLLLLLLLLLhk"],
    9: [6, "khYYLLLLLLLjhjLLhk"],
    10: [6, "khYYYLLLLLjjLhjLYhk"],
    11: [5, "khYYYYYLLjLhjLjhjYhk"],
    12: [5, "khYYYYYYjhYjhYjYhjYhk"],
    13: [5, "khYYYYYjhYYjYYhjYhjhk"],
    14: [5, "khYYYYjhYYjhYYYjYYjhk"],
    15: [5, "khYYYYjYYYjYYYYjYYhjk"],
    16: [5, "khYYYjhYYjhYYYjhYYYjk"],
    17: [5, "khYYYjYYYjYYYYjYYYYhk"],
    18: [5, "kzjhYjYYjhYYYjhYYYYhk"],
    19: [5, "kszhYhYhjYYYhjYYYhhhk"],
    20: [5, "kszhYYhjhYYhYhYYhhhk"],
    21: [6, "kzhhhhhhhhhhhhhhhk"],
    22: [7, "kzhhjhhhjhhhjhhk"],
    23: [9, "kkhhhjhhhjhkk"],
    24: [11, "kkkkkkkkkk"],
  }),
  n: R31({
    5: [8, "k___kkkkkkk"],
    6: [7, "kLkkkYYLLLLYkk"],
    7: [6, "khLLLLLLLLLLLLLkk"],
    8: [6, "khLLLLLLLLLLLLLLhk"],
    9: [6, "khYLLLLLLjhjLLLLYhk"],
    10: [6, "khYYLLLLjjLhjLLYYhk"],
    11: [5, "khYYYYLjLhjLjhjYYYYhk"],
    12: [5, "khYYYYjhYjhYjYhjYYYhk"],
    13: [5, "khYYYjhYYjYYhjYhjYYhk"],
    14: [5, "khYYjhYYjhYYYjYYjYYhk"],
    15: [5, "khYjhYYYjYYYYjYYhjYhk"],
    16: [5, "khYjYYYjhYYYjhYYYjYhk"],
    17: [5, "khYjYYYjYYYYjYYYYjYhk"],
    18: [5, "khYjYYjhYYYjhYYYjhYhk"],
    19: [6, "khhYYjhYYYjhYYYhhhk"],
    20: [6, "khhYjhYYYjhYYYYhhhk"],
    21: [7, "khhhhhhhhhhhhhhhk"],
    22: [8, "kkhhhjhhhhjhhkk"],
    23: [10, "kkhhhhhhhhkk"],
    24: [12, "kkkkkkkk"],
  }),
}
views("_hdc32", sdf.union(CSKULL, CHAIR).scale(C.body.r.head / 5), { pitch: C.pitch, ink: "k", jaw: ["z", "hzsS"], surface: { soft: 0.55, tones: 4 }, anchor: [15, 15], retouch: CRETOUCH })
// (the chibi's outfit for a body G, and its figure's options: a lab paints another cell of it with them)
// the trousers one garment (dress()'s trousers) for a body G in an outfit W: the belt on them, a hair over the shirt
// (within the shirt's own belt, its bottom 0.14); the seat at its sides as wide as the shirt at the belt, ahead from
// the thigh's front easing into the belly, behind rounding SEAT px past the back's line at most (half the median of ten
// 3D chibi models, 0.9 (4i): the user found the round behind too much); each thigh begun as far in as keeps the hips
// within the shirt, melted into the seat
const SEAT = 0.5
const trousersOf = (G, W) => {
  const r = G.body.r.leg[0], side = W.bodyRadius(0, Math.PI / 2), back = W.bodyRadius(0, Math.PI), foot = 1.4 + 0.6 * r, ease = (h) => 1 - (1 - h) ** 4
  // (the seat's round behind: as much as reaches SEAT past the back at its fullest)
  const bump = Math.min(...Array.from({ length: 19 }, (_, k) => (back + SEAT - r - (back - r) * ease((k + 1) / 20)) / Math.sin((Math.PI * (k + 1)) / 20)))
  return { in: Math.max(0, G.body.hips + r - side + 0.3), smooth: 1, belt: 0.12 * (G.body.torso - 0.9), seat: (z, a) => {
    if (z >= 0) return W.bodyRadius(0, a) + 0.05
    const c = Math.cos(a), h = 1 + z / foot, u = ease(h)
    return ((side - 0.3) * (1 - c * c) + r * c * c) * (1 - u) + (W.bodyRadius(0, a) + 0.05) * u + (c < 0 ? bump * Math.sin(Math.PI * h) * c * c : 0)
  } }
}
const chibiWear = (G) => { const W = outfit(G); return { ...W, sleeve: (far) => (far ? "NNnb" : "nbbc"), trousers: trousersOf(G, W) } }
const CFIG = { head: "_hdc32", hand: [3.6, 1.8, 1.7], neck: [2.4, 2.2], even: 4, thumb: true, cap: 0.35, inner: "dark" }
const crig = figure({ ...CFIG, G: C, at: "chibi_", id: "c32", wear: chibiWear(C) })
sheet("hero32_chibi", ["chibi_idle_*", "chibi_walk_*", "chibi_run_*", "chibi_attack_*"], { rows: "tag", pad: 1 })
card("chibi_walk_down", { is: "the top-down hero at 48 px on the genre's chibi body (2.4 heads, seen from 45 degrees) in his blue shirt tucked into one-piece trousers: idle, walk, run and a sword attack facing down, up and to the side", cells: { "topdown/32": "✓" },
  vary: { part: "its moves: chibi_idle_, chibi_walk_, chibi_run_, chibi_attack_ down, up and side (flipped for the fourth), on the sheet hero32_chibi; its body and moves hero.px.js's G32 (judged as flat blocks first)" } })
Object.assign(hero32, { SLIM: S, OUTFIT, SKULL, HAIR, RETOUCH, rig, CHIBI: C, crig, figure, chibiWear, trousersOf, CFIG })
}
