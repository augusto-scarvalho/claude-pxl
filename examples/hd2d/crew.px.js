// The harbor's crew (harbor.px.js): the traveler's skeleton and moves (traveler.px.js, its `travelerRig`)
// dressed in outfits of their own, under heads drawn by hand in the five views the traveler's are
// (front, front 3/4, profile, back 3/4, back; the right-hand ones mirrored), each a person at a glance:
// a sailor in a bandana with a short ponytail, a bald dockhand with a beard, one in a flat cap, a
// woman with long hair in a braid, an older man with grey hair tied back. The faces keep the
// traveler's approved rows (characters §5); the hair and what covers it change. Recolors of these
// (base + swap) make the rest of the crew.
include("traveler.px.js", { palette: true })   // its palette and ramps, so the painter's keys mean the same here
pal({
  // the crew's cloth: red (a bandana, a bodice), tweed (a cap, a shirt), navy (a coat, stripes), white
  // linen, brown canvas (trousers), olive (a vest), plum (a skirt)
  m: "#6e1c22", r: "#a8323a", t: "#d0604c", a: "#3a332e", b: "#5c544b", f: "#857a6c",
  Q: "#1a2440", A: "#2b3d66", B: "#46619a", x: "#a9a49a", y: "#d6d2c6", Z: "#f2efe6",
  i: "#5a4630", o: "#7e6646", u: "#a08660", O: "#384530", U: "#55663e", V: "#76875a",
  I: "#2e2638", K: "#4c3e5e", M: "#6e5c84",
})
ramps("kmrt", "kabf", "kQAB", "kxyZ", "kiou", "kOUV", "kIKM")

// ---------------------------------------------------------------- the heads, by hand
// Five haircuts, each seen from the five sides, on the traveler's face. The bandana: a flat crown of
// red cloth over the brow, lit in a broad stroke at its upper left, knotted at the back, its tails and
// a short ponytail hanging at the nape. The bald head: a low dome of skin lit at the crown, a horseshoe
// of short hair round the back, a full beard from the cheekbones down. The flat cap: a puffed crown
// wider than the head, its brim over the brow, its shadow on the forehead. The braid: long hair parted
// in the middle, falling past the jaw, one braid of plaits over the shoulder (from behind, down the
// back). Grey hair tied back: pulled tight over the skull from a high forehead (the temples and the
// ear bare), lit in strokes running back toward a small knot low at the back, a short tail hanging
// down from it behind the neck. Each skull
// kept within a pixel of Alden's in the same view, row by row (his hair is a pixel or two over his
// skull): the bald one narrower than his hair, not longer; in profile the back of the skull rounding
// off 2-3 px behind the ear and curving down into the nape, widest at the eyes; a cap or bandana on
// the skull, over the brow by a pixel; a ponytail, braid or queue hanging down behind the neck, not
// out.
const HEADSETS = {
  sa: {
    s: ["....mmrrrmm....", "..mmrttrrrrmm..", ".mrttrrrrrrrrm.", ".mrrrrrrrrrrmm.", ".JmmmmmmmmmmmJ.", "JhhjSShhjSSjhhJ", "JjjSkkSSSkkSjjJ", ".JjSGESSSEGSjJ.", ".JjsSSSLSSSsjJ.", "..jJsSSzSSsJj..", ".....JsssJ....."],
    sw: [".....mmrrm......", "...mmrttrrmm....", "..mrttrrrrrrm...", "..mrrrrrrrrrrmm.", ".jmmmmmmmmmmmrrm", ".jjSSSSSShjhjmrm", "..hSkSSkkjhjjJm.", "..jSESSEGjsjhjJ.", "..JSSLLeSjzjjJ..", "...JSSzSsjjJjJ..", "....JsssjJ......"],
    w: [".......mm......", ".....mmrttm....", "...mmrttrrrm...", "..mrrrrrrrrrm..", ".mmmmmmmmmmrrm.", "jhSSShhjhhhmrmJ", ".SkkSSsjhhjjmJ.", ".SEGSSzjjhjjmJ.", "SLSSSsjjjjjjjJ.", ".zSSsJjjjJjhJ..", "..JzsJ.JJ.JhJ..", "..........Jh...", "...........J..."],
    nw: [".....mmrrm......", "...mmrttrrmm....", "..mrttrrrrrrm...", "..mrrrrrrrrrrm..", ".jmmmmmmmrrmmmjJ", ".JjhhhhhmrmhhjjJ", ".Jsjhhjhmjmhhjj.", ".JzjjhjjhJjjjj..", "..JzjjjjhjjjJ...", "..JzJjjJhjJjJ...", "...JJ.zJjJz....."],
    n: ["....mmrrrmm....", "..mmrttrrrrmm..", ".mrrtrrrrrrrrm.", ".mrrrrrrrrrrrm.", ".JmmmmmrmmmmmJ.", "JhjhhhmrmhhhjjJ", "JjjhhjmJmhhhjjJ", ".sJjhhjhjhhjJs.", ".zJjjjjhjjjjJz.", "...JjjJhJjjJ...", ".....zJhJz....."],
  },
  bd: {
    s: ["...............", ".....zzzzz.....", "...zzSLLSSzz...", "..zSSLLSSSSSz..", "..zSSSSSSSSSz..", ".zhSSSSSSSSShz.", ".shSkkSSSkkShs.", ".zjSGESSSEGSjz.", "..jhSSSLSSShj..", "..jhhhhzhhhhj..", "..JhhhhhhhhhJ..", "...JjhhhhhjJ...", ".....JjjjJ....."],
    sw: ["................", "......zzzzz.....", "....zzSLLSSzz...", "...zSSLLSSSSSz..", "..zSSSSSSSSSSz..", "..zSSSSSSSSShz..", "..SSkSSkkSShsz..", "..SSESSEGShhsz..", "..jhSLLhShhhJ...", "...jhhzhhhhJ....", "...JhhhhhhJ.....", "....JjhhjJ......", "......JJ........"],
    w: ["...............", "....zzzzz......", "...zSSLLSz.....", "..zSSLLSSSz....", ".zSSSSSSSSSz...", ".zSSSSSSSSSz...", ".SkkSSSzsshJ...", ".SEGSSSzzhhJ...", "SLSShhhhhhJ....", ".hhhhhhhhJ.....", "..jhhhhhJ......", "...JjhhJ......."],
    nw: ["................", ".....zzzzz......", "....zSSLLSz.....", "...zSSLLSSSz....", "..zSSSSSSSSSz...", "..zSSSSSSSSSz...", "..sSSSSSSSSSz...", "..zjHhhhhhhhz...", "..zjhhhhhhhz....", "...zjhhhhhz.....", "....zsssss......"],
    n: ["...............", ".....zzzzz.....", "...zzSLLSSzz...", "..zSSLLSSSSSz..", "..zSSSSSSSSSz..", ".zsSSSSSSSSSsz.", ".zsSSSSSSSSSsz.", "..zHhhhhhhhHz..", "..zhhhhhhhhhz..", "...zjjhhhjjz...", ".....zsssz....."],
  },
  fc: {
    s: ["....abbbbba....", "..abffbbbbbba..", ".abffbbbbbbbba.", ".abbbbbbbbbbba.", ".JaaaaaaaaaaaJ.", "JhjsssssssssjhJ", "JjjSkkSSSkkSjjJ", ".JjSGESSSEGSjJ.", ".JjsSSSLSSSsjJ.", "..jJsSSzSSsJj..", ".....JsssJ....."],
    sw: [".....aabbbba....", "....abffbbbbba..", "...abffbbbbbbba.", "..abbbbbbbbbbbaJ", "aaaaaaaaaaabbaJ.", ".jjsssssshjhjjhJ", "..hSkSSkkjhjjjJ.", "..jSESSEGjsjhjJ.", "..JSSLLeSjzjjJ..", "...JSSzSsjjJjJ..", "....JsssjJ......"],
    w: ["......abba.....", "....abffbbba...", "...abffbbbbba..", "..abbbbbbbbbba.", "aaaaaaaabbbbbaJ", ".zsSShhjhhhjhhJ", ".SkkSSsjhhjjjJ.", ".SEGSSzjjhjjjJ.", "SLSSSsjjjjjjjJ.", ".zSSsJjjjJjjJ..", "..JzsJ.JJ.JJ..."],
    nw: ["......abbbba....", "....abffbbbba...", "...abfbbbbbbba..", "..abbbbbbbbbbba.", ".JaaabbbbbbbbaaJ", ".JjhhhhhhhhhhjjJ", ".Jsjhhjhhhjhhjj.", ".Jzjjhjjjhjjjj..", "..JzjjjjhjjjJ...", "..JzJjjJjjJjJ...", "...JJ.zJjJz....."],
    n: ["....abbbbba....", "..abffbbbbbba..", ".abbfbbbbbbbba.", ".abbbbbbbbbbba.", ".JaaaaaaaaaaaJ.", "JhjhhhhhhhhhjjJ", "JjjhhjhhhjhhjjJ", ".sJjhhjjjhhjJs.", ".zJjjjjhjjjjJz.", "...JjjJjJjjJ...", ".....zJjJz....."],
  },
  br: {
    s: ["....jhh.hhj....", "...jhHYhYHhj...", "..jhHYhjhYHhj..", ".jhHHhhjhhHHhj.", ".jhhhhjjjhhhhj.", "JhhjSSSSSSSjhhJ", "JhjSkkSSSkkSjhJ", "JhjSGESSSEGSjhJ", "JhjsSSSLSSSsjhJ", ".hjJsSSzSSsJjh.", ".hj..JsssJ..jh.", ".jh.........Jj.", ".hj............", ".jh............", "..J............"],
    sw: ["......jhh.hhj...", "....jhHYhjYHhj..", "...jhHYhjjhYHhj.", "..jhHHhhjhhHHhjJ", ".jhhhjjhjjhhhhjJ", ".jjSSSSSShjhhjhJ", ".jhSkSSkkjhjjhjJ", ".jjSESSEGjsjhjhJ", ".jJSSLLeSjzjjhJ.", ".h.JSSzSsjjjhJ..", ".jh.JsssjJ.JhJ..", "..hj............", "..jh............", "...J............"],
    w: ["......jhhj.....", "....jhHYYhj....", "...jhHYHhhhj...", "..jhHHhhhhhhj..", ".jhhhhjhhhjhhj.", "jhSSShhjhhhjhhJ", ".SkkSSsjhhjjjhJ", ".SEGSSzjjhjjjhJ", "SLSSSsjjjjjjjhJ", ".zSSsJjjjjjjhJ.", "..JzsJ.Jjjjhj..", ".........Jhj...", ".........jhJ...", ".........hj....", ".........J....."],
    nw: [".....jhh.hhj....", "....jhHYjHYhj...", "...jhHYhjhYHhj..", "..jhHHhhjhhHHhj.", ".jhhhhjhjjhhhhjJ", ".JjhhhhhjjhhhjjJ", ".Jsjhhhhjhhhhjj.", ".Jzjjhhhjhhhjj..", "..JjjhhjhjhjJ...", "..JjjjhjhjjjJ...", "...Jjj.hjjJ.....", ".......jh.......", ".......hj.......", ".......J........"],
    n: [".....jhh.hj....", "...jhHYhjYHhj..", "..jhHYhjjhYHhj.", ".jhHHhhjhhhHHj.", ".jhhhhjjjhhhhj.", "JhjhhhhjhhhhjhJ", "JhjhhhhjhhhhjhJ", ".JjjhhhjhhhjjJ.", ".JjjjhhjhhjjjJ.", "..JjjjhjhjjjJ..", "...JJjjhjjJJ...", "......jhj......", "......hjh......", "......jhj......", ".......J......."],
  },
  og: {
    s: [".....jjjjj.....", "...jhHYhYHhj...", "..jhHYhhhYHhj..", ".jhhSSSSSSShhj.", ".zSSSSSSSSSSSz.", ".zSSSSSSSSSSSz.", ".sSSkkSSSkkSSs.", ".zSSGESSSEGSSz.", "..zsSSSLSSSsz..", "...zsSSzSSsz...", ".....JsssJ....."],
    sw: [".......jjjjj....", ".....jhHYYHhhj..", "....jhHhhYYHhhj.", "...zSSShhHYhhhj.", "..zSSSSSShhjhhj.", "..zSSSSSSshhjjJ.", "..zSkSSkksShjjJ.", "..zSESSEGsshhJJ.", "..JSSLLeSszhjJJ.", "...JSSzSsjjJ.hJ.", "....JsssjJ...hJ.", ".............hJ.", ".............J.."],
    w: ["...............", ".....jhhhj.....", "...jhYYHHhj....", "..SShhYYHhhj...", ".SSSSShHhhhj...", ".SSSSSShhjhhJ..", ".SkkSSsSsjhjJ..", ".SEGSSzszjjJhJ.", "SLSSSsszjjJhhJ.", ".zSSsJjjjJ.hJ..", "..JzsJ.JjJ.hJ..", "...........hJ..", "...........J..."],
    nw: [".....jjjjjj.....", "....jhhHYYHhj...", "...jhHhhhYYHhj..", "..jhhHhhhhhHhhj.", ".jjhhhhhhhhhhhjJ", ".JjhhhhhhhhhhjjJ", ".Jsjhhhhhhhhhjj.", ".JzjjhhhhJJhjj..", "..JzjjjjjJJjJ...", "...JzjjjjhjJ....", "....zJjjJhJ.....", ".........hJ.....", ".........J......"],
    n: ["....jjjjjj.....", "...jhhHYHhhj...", "..jhHHhhhHHhj..", ".jhhhhhhhhhhhj.", ".jhhhhhhhhhhhj.", "JjhhhhhhhhhhhjJ", "JjjhhhhhhhhhjjJ", ".sJjjhhJJhhjJs.", ".zJjjjjJJjjjJz.", "...JjjjhjjjJ...", ".....zJhJz.....", ".......hJ......", ".......J......."],
  },
}
const VIEWS = ["s", "sw", "w", "nw", "n"], ANCHOR = { s: [7, 5], sw: [8, 5], w: [5, 5], nw: [8, 5], n: [7, 5] }   // the traveler's
// each a views() set on the traveler's anchors, its rows held to his (pxl check)
for (const [set, heads] of Object.entries(HEADSETS)) views(`_${set}_head`, heads, { anchor: ANCHOR, like: "_tr_head" })

// ---------------------------------------------------------------- the outfits
// What each wears, over the same skeleton (the traveler's TRAVELER for what isn't said): no cloak for
// the workers. A sailor's shirt in navy and white stripes 2 px wide, its sleeves pushed up, canvas
// trousers rolled to the shin, bare feet; a dockhand's olive vest open over a white shirt, the sleeves
// rolled, boots; a docker's leather apron from the chest to the knees over a twill shirt; a captain's
// long navy coat open in front over a white shirt, gold buttons down its edges, white breeches in high
// boots; the companion's red bodice laced over a white chemise, puffed sleeves, a long plum skirt.
const R = travelerRig, BASE = { ...R.TRAVELER, drapes: [], over: [] }
const two = (near, far) => (isFar) => (isFar ? far : near)
const legs = (tr, shin) => (isFar) => ({ tr: isFar ? tr[1] : tr[0], shin: isFar ? shin[1] : shin[0], foot: isFar ? shin[1] : shin[0] })
const CANVAS = ["iou", "iio"], NAVY = ["QAB", "QQA"], LINEN = ["xyZ", "xxy"], BOOTS = ["Ddl", "DDd"], SKIN = ["zsS", "zzs"]
const hips = (ramp) => (h, a, out) => (out ? ramp : ramp[0])
const sides = (a) => 0.84 + 0.16 * Math.abs(Math.sin(a))              // the body a little deeper at the sides
const OUTFITS = {
  stripes: { ...BASE, legs: legs(CANVAS, SKIN), cuff: 0.4, skirt: hips("iou"), sleeve: two(...NAVY), fore: two(...SKIN),
    body: (h, a, out) => (!out ? "x" : h < 0.08 ? "Ddl" : Math.floor(h * 5) % 2 ? "QAB" : "xyZ") },
  vest: { ...BASE, legs: legs(CANVAS, BOOTS), skirt: hips("iou"), sleeve: two(...LINEN), fore: two(...SKIN),
    body: (h, a) => (h < 0.1 ? "Ddl" : Math.abs(a) < 0.55 && h > 0.15 ? "xyZ" : "OUV") },
  apron: { ...BASE, legs: legs(NAVY, BOOTS), skirt: hips("QAB"), sleeve: two("abf", "aab"), fore: two(...SKIN),
    body: (h, a) => (h < 0.1 ? "Ddl" : "abf"),
    over: [{ top: (j) => j.chest[1] - 0.8, len: 11.5, out: "Ddl", in: "D", trail: 0.15, keep: (h, a) => Math.abs(a) < 0.95,
      radius: (h, a) => (h > 0.32 ? 3.7 : 3.7 + (1.4 * (0.32 - h)) / 0.32) * sides(a) + 0.4 }] },
  coat: { ...BASE, legs: legs(LINEN, BOOTS), cuff: 0.15, skirt: hips("xyZ"), sleeve: two(...NAVY), fore: two(...NAVY),
    body: (h, a) => (h < 0.1 ? "Ddl" : "xyZ"),
    drapes: [{ top: (j) => j.chest[1] + 0.6, len: 14.5, trail: 0.35, keep: (h, a) => Math.abs(a) > 0.32,
      out: (h, a, out) => (!out ? "Q" : h > 0.4 && Math.abs(Math.abs(a) - 0.4) < 0.1 && Math.floor(h * 14) % 2 ? "g" : "QAB"),
      radius: (h, a) => (h > 0.37 ? 3.6 : 3.6 + (1.3 * (0.37 - h)) / 0.37) * sides(a) + 0.45 }] },
  dress: { ...BASE, legs: legs(["IKM", "IIK"], BOOTS), cuff: 0.3, skirt: hips("IKM"), sleeve: two(...LINEN), fore: two(...SKIN),
    body: (h, a) => (h > 0.6 && Math.abs(a) < 0.4 ? "xyZ" : Math.abs(a) < 0.08 ? "m" : "mrt"),
    drapes: [{ base: "pelvis", top: (j) => j.pelvis[1] + 1.4, len: 12.4, out: "IKM", in: "I", trail: 0.3, radius: (h) => 3.7 + 1.7 * (1 - h) }] },
}

// ---------------------------------------------------------------- the crew
// [name, head, outfit, swap]: hair recolored (dark, black, auburn, ginger, grey), and the cloth for
// those who wear an outfit someone else does (a blue bandana and red stripes; a grey cap, a brown vest;
// an officer's coat in dark red).
const DARK = { Y: "#6a5040", H: "#4e3a2e", h: "#3a2a22", j: "#261a14", J: "#140d09" }
const BLACK = { Y: "#4a4040", H: "#383030", h: "#2a2424", j: "#1c1818", J: "#100c0c" }
const GINGER = { Y: "#e09050", H: "#c0703a", h: "#9a5228", j: "#6a3418", J: "#3a1a0c" }
const AUBURN = { Y: "#d8743a", H: "#b05a2a", h: "#8a4020", j: "#5a2614", J: "#2e120a" }
const GREY = { Y: "#d0ccc4", H: "#b0aca4", h: "#8f8a84", j: "#625e5c", J: "#383536" }
const CREW = [
  ["cap", "og", "coat", GREY],
  ["sai", "sa", "stripes", DARK],
  ["sab", "sa", "stripes", { ...BLACK, m: "#1e3a5e", r: "#2f5f8f", t: "#5a8cbf", Q: "#5a1418", A: "#8e2a2e", B: "#b84a4a" }],
  ["dkb", "bd", "vest", BLACK],
  ["dkg", "bd", "vest", { ...GINGER, O: "#4b2e1e", U: "#6e4528", V: "#8e6038" }],
  ["car", "fc", "apron", {}],
  ["crn", "fc", "vest", { ...DARK, a: "#2e3034", b: "#4c5056", f: "#70767c" }],
  ["cmp", "br", "dress", AUBURN],
  ["off", "og", "coat", { ...DARK, Q: "#3a0e12", A: "#6e1c22", B: "#9a3038" }],
]
for (const [who, set, outfit, swap] of CREW) for (const move of ["idle", "walk"]) for (const [d, yaw] of Object.entries(R.DIRS)) {
  const M = R.MOVES[move], o = OUTFITS[outfit]
  anim(`${who}_${move}_${d}`, { w: R.W, h: R.H, pivot: [R.OX, R.OY], swap },
    (c) => R.figure(c, `_${set}`, M.f(c.frame, yaw), yaw, o), ...Array.from({ length: M.frames }, () => frame({ ms: M.ms })), bump("hybrid"))
}

// To look at: every head in its five views (a row each, Alden's first to hold them against), and the
// crew standing turned s, sw and w.
scene("crew_heads", { w: 5 * 20 + 4, h: 6 * 18 + 4, bg: "#3c4250" }, ...["tr", ...Object.keys(HEADSETS)].flatMap((set, r) => VIEWS.map((v, k) => stamp(`_${set}_head_${v}`, 3 + k * 20 + ANCHOR[v][0], 3 + r * 18 + ANCHOR[v][1]))))
scene("crew_standing", { w: CREW.length * 26 + 6, h: 3 * 44 + 4, bg: "#56606e" }, ...CREW.flatMap(([who], i) => ["s", "sw", "w"].map((d, r) => stamp(`${who}_idle_${d}`, 16 + i * 26, 41 + r * 44))))

// ---------------------------------------------------------------- carrying a crate
// The dockhand carries a crate held low in front (chosen from blocks, characters §4): against the belly
// at the waist, the arms down along the body with the forearms bent forward, a hand at each side of its
// lower half; the head and shoulders free; leaning back 3 degrees for the weight; a stride 0.7 of the
// walk's (the scene moves him at 0.7 of the pace). Held up under the chin with the arms forward at
// shoulder height, the blocks read as a sleepwalker; on a shoulder, beside an 11 px head, half the
// crate covered the face.
const shorter = (w, k) => ({ ...w, feet: w.feet.map(([a, b]) => [a * k, b]), lift: w.lift.map((l) => l * k) })
const LOW = { at: [3.4, 0, -5], hands: [[2.5, -0.4, -5.5], [2.5, 0.4, -5.5]], lean: -3 }
const MOVESLOW = { carry: [R.MOVES.walk, (i, yaw) => shorter(R.MOVES.walk.f(i, yaw), 0.7)], carryidle: [R.MOVES.idle, (i) => R.MOVES.idle.f(i)] }
// The crate, painted into the figure's depth as its parts are (his hands hold its sides, the outline
// runs round it): a cube 9 px a side, boards 3 px with a dark seam across its sides and along its lid.
const crateProp = (best, j, fr, surface) => {
  const c0 = R.local(j.chest, fr, LOW.at), h = 4.5, axes = [fr.f, fr.r, [0, 1, 0]]
  for (let a = 0; a < 3; a++) for (const sg of [-1, 1]) {
    const n = axes[a].map((v) => v * sg), [e1, e2] = axes.filter((_, k) => k !== a)
    for (let s = -h; s <= h; s += 0.25) for (let u = -h; u <= h; u += 0.25)
      surface(best, [0, 1, 2].map((k) => c0[k] + n[k] * h + e1[k] * s + e2[k] * u), n, (u + h) % 3 < 0.6 ? "DDd" : "dlu", "crate")
  }
}
for (const [move, [M, pose]] of Object.entries(MOVESLOW)) for (const [d, yaw] of Object.entries(R.DIRS)) {
  const o = { ...OUTFITS.apron, prop: crateProp }
  anim(`car_${move}_${d}`, { w: R.W, h: R.H, pivot: [R.OX, R.OY] }, (c) => R.figure(c, "_fc", { ...pose(c.frame, yaw), lean: LOW.lean, hands: LOW.hands }, yaw, o),
    ...Array.from({ length: M.frames }, () => frame({ ms: M.ms })), bump("hybrid"))
}
// The same in blocks (bk_carrylow_<dir>), as it was judged: the crate a brown block in front of the
// chest or behind it by its depth.
for (const [d, yaw] of Object.entries(R.DIRS)) anim(`bk_carrylow_${d}`, { w: R.W, h: R.H, pivot: [R.OX, R.OY] }, (c) => {
  const p = { ...shorter(R.MOVES.walk.f(c.frame, yaw), 0.7), lean: LOW.lean, hands: LOW.hands }, j = R.bones(p, yaw), m = R.local(j.chest, j.fr, LOW.at), [x, y] = R.scr(m).map(Math.round)
  const box = () => { c.rect(x - 5, y - 5, 11, 11, "#2a1c12"); c.rect(x - 4, y - 4, 9, 9, "#a0703e"); c.rect(x - 4, y - 4, 9, 2, "#c99a62") }
  const front = R.depth(m) > R.depth(j.chest) - 1
  if (!front) box()
  R.blocks(c, p, yaw)
  if (front) box()
}, ...Array.from({ length: 8 }, () => frame({ ms: 110 })))
