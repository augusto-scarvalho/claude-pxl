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
const S0 = hero.SLIM32, GRIP = (S0.sword.grip + 1.2) / (S0.sword.grip + S0.sword.len)
const S = { ...S0, paint: { blade: (t) => (t < 0.06 ? "g" : t < GRIP ? "d" : "w"), edge: "W", guard: "g",
  smear: (kind, u) => (kind === "full" ? (t) => (u + 0.3 * t > 0.75 ? "W" : u + 0.3 * t > 0.35 ? "w" : "v") : kind === "fade" ? (u > 1 ? "W" : (t) => (u + 0.3 * t > 0.9 ? "w" : "v")) : "v") } }

// ---------------------------------------------------------------- the outfit, 4 tones a material
// The hero's (hero.PLAIN) as thick as this body: the tunic N n b c (bloused over the belt a tone darker, its skirt
// pleated every 60 degrees in its darkest), the trousers Q P p q, the boots and the belt D d l e, the skin h z s S
// (its darkest the hair's shade); the far limbs a step darker; `creases` the traveler's, at a bent knee or elbow. The
// tunic's body (`bodyRadius`) dress()'s, sloping into the neck over its top fifth, the trapezius, round a V of skin in
// the neck's shade (no straight collar under the chin: the user): 11 px deep in profile with its line (Chained Echoes'
// Glenn 8-9 at 45 rows), as wide as the 24 px hero's cloth on this body facing us.
const KB = S.body.r.body[1] / dress.r.body[1], ease = (t) => Math.min(1, Math.max(0, t)) ** 2
const bodyRadius = (h, a) => {
  const r = (4 - 0.5 * h * h) * KB * (0.84 + 0.16 * Math.abs(Math.sin(a))), t = ease((h - 0.8) / 0.2)
  return r * (1 - t) + 1.9 * t
}
const OUTFIT = { ...hero.PLAIN, r: S.body.r, creases: true, bodyRadius,
  legs: (far) => ({ tr: far ? "QQPp" : "QPpq", shin: far ? "DDdl" : "Ddle", foot: far ? "DDdl" : "Ddle" }),
  skirt: (h, a, out) => (out ? (Math.abs(Math.sin(a * 3)) < 0.2 ? "NNNn" : "NNnb") : "N"), body: (h, a) => (h < 0.1 ? (Math.abs(a) < 0.35 ? "g" : "Dd") : h < 0.3 ? "NNnb" : Math.cos(a) > 0 && Math.abs(Math.sin(a)) * bodyRadius(h, a) < 5 * (h - 0.62) ? "hzzs" : "Nnbc"),
  sleeve: (far) => (far ? "NNnb" : "Nnbc"), fore: (far) => (far ? "hzzs" : "hzsS"), hand: (far) => (far ? "hzzs" : "hzsS") }

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
const LIT = { soft: 0.3, tones: 4, clean: true }, DIRS = [["down", "s"], ["up", "n"], ["side", "e"]], dressed = dress(OUTFIT)
// a hand: hanging (the elbow bent under 60 degrees) past the wrist, palm to the thigh, along the forearm's line bent
// down at the wrist as far as the forearm swings up out of it (fingers down, knuckles ahead: level ahead it pointed at
// the crotch); else a fist (dress()'s ball), as the sword's hand in the attack
const hands = (j, p, d) => {
  const far = j.depth(j.arms[0].sh) < j.depth(j.arms[1].sh) ? 0 : 1
  j.arms.forEach((A, i) => {
    if (dress.bend(A.sh, A.elbow, A.hand) > 60 || (i && p.slash !== undefined)) return
    const f = A.hand.map((q, e) => q - A.elbow[e]), m = Math.hypot(...f), v = f.map((q, e) => q / m + (e === 2 ? -1.3 : 0)), n = Math.hypot(...v), tip = A.hand.map((q, e) => q + (v[e] / n) * 2.4)
    d[`arm${i}`][2] = j.limb(A.hand, tip, 1.2, 1, OUTFIT.hand(i === far))
  })
  return d
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
const fig = (rn, list, F) => rig3d(rn, { body: S.body, headings: ["s", "e", "n"], pitch: S.pitch, w: F.w, h: F.h, pivot: F.pivot, ink: "k", surface: LIT, soles: S.soles,
  parts: (j, p) => ({ ...hands(j, p, dressed(j, p)), neck: j.limb(j.chest, [j.head[0], j.head[1], j.head[2] - 0.7 * S.body.r.head], 1.6, 1.5, "hzsS") }),
  head: "_hd32", moves: hero.movesOf(list, false, S), draw: (c, j, p) => (throat(c, j), hero.boxes(S)(c, j, p)), genre: "topdown32" })
const rig = fig("_r32", ["idle", "walk", "run"], S.frame)
fig("_ra32", ["attack"], S.attack)
for (const m of ["idle", "walk", "run", "attack"]) for (const [dir, d] of DIRS) {
  const [px, py] = (m === "attack" ? S.attack : S.frame).pivot
  anim(`${m}_${dir}`, { base: `_r${m === "attack" ? "a" : ""}32_${m}_${d}`, pivot: [px, py + S.sole] })
}
sheet("hero32", ["idle_*", "walk_*", "run_*", "attack_*"], { rows: "tag", pad: 1 })
card("walk_down", { is: "the top-down hero at 48 px, the genre's slim body (3.4 heads) in his blue tunic: idle, walk, run and a sword attack facing down, up and to the side", cells: { "topdown/32": "✓" },
  vary: { part: "its moves: idle_, walk_, run_, attack_ down, up and side (flipped for the fourth), on the sheet hero32; its body and moves hero.px.js's SLIM32 (judged as flat blocks first)" } })
Object.assign(hero32, { SLIM: S, OUTFIT, SKULL, HAIR, RETOUCH, rig })
}
