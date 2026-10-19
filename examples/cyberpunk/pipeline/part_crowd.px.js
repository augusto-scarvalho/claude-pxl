include("palette.px.js", { palette: true })

// Crowd: the people on both sidewalks (plan.md, part 8). Side views, no outlines. The street is in the
// city's shade: the cool sky from above lights head tops and shoulders a tone lighter, far limbs are
// a tone darker. Lamp pools and contact shadows are the scene's (crowd_shadow is drawn here for it).
// 12 fps, 240 frames. Near walkers go 1.5 px/frame round a 360 px ring (each crosses once a loop, the
// wrap off screen); far walkers go 0.75 px/frame from a doorway or the frame's edge to another.

// ================================================================ shared
// One tone lighter / darker along palette.px.js's ramps.
const CROWD_RAMPS = ["KCceEL", "SsuU", "TtjJ", "RrmM", "0Ggl", "5678", "Dd9", "Bbf"]
const CROWD_step = (k, n) => {
  for (const r of CROWD_RAMPS) { const i = r.indexOf(k); if (i >= 0) return r[Math.max(0, Math.min(r.length - 1, i + n))] }
  return k
}
// A grid of role letters painted at (x, y): column ox lands on x; d = 1 as drawn (facing right), -1 mirrored.
// lit: a torso. Its sky-lit edge (L) is drawn on the back, which faces the bright west when facing right;
// mirrored, the back turns away from it, so the L moves to the front edge, now toward the west.
const CROWD_grid = (c, x, y, d, rows, ox, map, lit) => rows.forEach((row, j) => {
  let r = row
  if (lit && d < 0) {
    const lo = r.search(/[^.]/), hi = r.length - 1 - [...r].reverse().join("").search(/[^.]/)
    if (r[lo] === "L" && r[hi] === "T") r = r.slice(0, lo) + "T" + r.slice(lo + 1, hi) + "L" + r.slice(hi + 1)
  }
  for (let i = 0; i < r.length; i++) { const k = map[r[i]]; if (k) c.px(x + d * (i - ox), y + j, k) }
})
const CROWD_line = (c, a, b, k) => c.line(Math.round(a[0]), Math.round(a[1]), Math.round(b[0]), Math.round(b[1]), k)
// Two bones from a reaching for p; the joint bends toward d (knees forward, elbows back with -d).
const CROWD_joint = (a, p, l1, l2, d) => {
  const dx = p[0] - a[0], dy = p[1] - a[1], dist = Math.max(0.01, Math.min(Math.hypot(dx, dy), l1 + l2 - 0.01))
  const t = Math.atan2(dy, dx) - d * Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist))))
  return [a[0] + l1 * Math.cos(t), a[1] + l1 * Math.sin(t)]
}
// x where a polyline crosses row y
const CROWD_xAt = (pts, y) => {
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1]
    if (a[1] !== b[1] && (y - a[1]) * (y - b[1]) <= 0) return a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1])
  }
  return pts[pts.length - 1][0]
}
// A foot at gait phase u (0..1): planted the first half, sliding back exactly as fast as the body goes
// on (so it stays put on the ground), then swung forward and lifted. Returns [ahead of the hip, lift].
const CROWD_foot = (u, A) => {
  if (u < 0.5) return [A - 4 * A * u, 0]
  const s = (u - 0.5) * 2, e = s * s * (3 - 2 * s)
  return [-A + 2 * A * e, Math.sin(Math.PI * s)]
}
// Role letters -> palette keys for one person: h/H hair, F/f skin, L/T/t top, P/p pants, A/a/Z an
// accessory (hat, tie, mohawk), X/x a detail (collar, scarf, stripe), e eye.
const CROWD_map = (s) => ({
  h: CROWD_step(s.hair, 1), H: s.hair, F: s.skin, f: CROWD_step(s.skin, -1), e: "k",
  L: CROWD_step(s.top, 1), T: s.top, t: CROWD_step(s.top, -1), P: s.pants, p: CROWD_step(s.pants, -1),
  A: s.acc, a: s.acc && CROWD_step(s.acc, 1), Z: s.acc && CROWD_step(s.acc, -1), X: s.detail, x: s.detail && CROWD_step(s.detail, -1),
})
const CROWD_DARK = Object.fromEntries([..."hHFfeLTtPpAaZXx"].map((k) => [k, "K"]))   // just inside a dark doorway
const CROWD_shadow = (c, x, y, hw) => { c.rect(x - hw, y, 2 * hw, 1, "k"); c.rect(x - hw + 1, y + 1, 2 * hw - 2, 1, "k") }

// ================================================================ near sidewalk: 12 px/m, adults 20-23 px
// Heads (crown to neck, 5 rows; taller ones stick up) and torsos (shoulders to hips, 7 rows), as drawn
// facing right; column 3 is the hip line.
const CROWD_HEADS = {
  short: ["..hhh..", ".HHHF..", ".HfFeF.", "..FFf..", "..fF..."],
  hardhat: ["..aaa..", ".AAAAA.", ".HfFeF.", "..FFf..", "..fF..."],
  mohawk: ["..aA...", "..AAa..", "..AAA..", ".fFFF..", ".ffFeF.", "..FFf..", "..fF..."],
  long: ["..hhh..", ".HHHF..", ".HHFeF.", ".HHFf..", ".HHf..."],
  bob: ["..hhh..", ".hHHH..", ".HHFeF.", ".HHFf..", "..fF..."],
  hat: ["..aaa..", "AAAAAAA", ".HffeF.", "..FFf..", "..fF..."],
  old: ["..hh...", ".hFFF..", ".hfFeF.", "..FFf..", "..fF..."],
  curly: [".hhhh..", "HHHHF..", "HHfFeF.", ".HFFf..", "..fF..."],
  cap: ["..aaa..", ".AAAAAA", ".HfFeF.", "..FFf..", "..fF..."],
  beanie: ["..aaa..", ".aAAA..", ".HfFeF.", "..FHH..", "..fF..."],
}
const CROWD_TORSOS = {
  jacket: ["..LLL..", ".LTTT..", ".TTTT..", ".TTTT..", ".TTTT..", ".tTTt..", ".PPPP.."],
  suit: ["..LLX..", ".LTTA..", ".TTTA..", ".TTTA..", ".TTTT..", ".tTTt..", ".PPPP.."],
  coverall: ["..LLL..", ".LTTT..", ".TTTT..", ".XXXX..", ".TTTT..", ".xxxx..", ".TTTT.."],
  duster: ["..XXX..", ".LxTT..", ".TTTT..", ".TTTT..", ".TTTT..", ".TTTT..", ".TTTT.."],
  punk: ["..LXL..", ".LTTT..", ".ATTT..", ".TTTT..", ".TTTT..", ".tTTt..", ".PPPP.."],
  dress: ["..LLL..", ".HTTT..", ".HTTT..", "..TTT..", "..tTT..", ".TTTT..", ".TTTT.."],
  bomber: ["..LLL..", ".LTTT..", ".TTTT..", ".TTTT..", ".tttt..", ".PPPP..", ".PPPP.."],
  hunch: ["...LL..", "..LTTT.", ".TTTTT.", ".TTTT..", ".TTTT..", ".TTTT..", ".tTTt.."],
  hoodie: ["..TTL..", ".TTTT..", ".TTTT..", ".TTTT..", ".TTTT..", ".tTTt..", ".PPPP.."],
}
// A sandy dog trotting, facing right from its tail (column 0); two leg poses.
const CROWD_DOG = [
  ["D.......Dd..", ".D.....DDDDk", ".lllllllDDd.", ".DDDDDDDD...", ".dDDDDDDd...", ".Dd....Dd...", "D..d..D..d.."],
  ["D.......Dd..", ".D.....DDDDk", ".lllllllDDd.", ".DDDDDDDD...", ".dDDDDDDd...", "..Dd....Dd..", "..Dd....Dd.."],
]
const CROWD_DOGMAP = { D: "u", d: "s", l: "U", k: "k" }
// A shopping cart heaped with bags, handle at column 0, row 2.
const CROWD_CART = [
  "......mM....",
  "...uUumMtJ..",
  "eLLLLLLLLLLL",
  ".ecuuueUUece",
  "..euuuecUUc.",
  "..ecucecuce.",
  "...eeeeeeee.",
  "...c......c.",
  "...ccccccccc",
  "..kk.....kk.",
  "..kk.....kk.",
]
const CROWD_CARTMAP = { e: "e", L: "L", c: "c", u: "u", U: "U", m: "m", M: "M", t: "t", J: "J", k: "k" }

// One person at hip column X (world, float) and sole row Y. Walking: u = gait phase, A = half a stride.
// Standing (s.stand): feet planted a step apart.
const CROWD_walker = (c, s, X, Y, u, A, f) => {
  const d = s.dir, x0 = Math.floor(X), m = CROWD_map(s), tall = s.tall || 0, at = (o) => x0 + d * o
  const near = s.stand ? [1, 0] : CROWD_foot(u, A), far = s.stand ? [-1, 0] : CROWD_foot((u + 0.5) % 1, A)
  const bob = !s.stand && Math.abs(u < 0.5 ? near[0] : far[0]) <= A / 3 ? 1 : 0
  const top = Y - 20 - tall - bob, hipY = Y - 9 - tall - bob, shY = Y - 14 - tall - bob, bone = 4.5 + tall / 2
  const leg = ([rel, lift], pants, shoe) => {
    const ax = Math.floor(X + d * rel), ay = Y - 1 - Math.round(lift * 2)
    const hip = [x0, hipY], ank = [ax, ay], knee = CROWD_joint(hip, ank, bone, bone, d)
    for (const o of [0, -d]) {
      CROWD_line(c, [hip[0] + o, hip[1]], [knee[0] + o, knee[1]], pants)
      CROWD_line(c, [knee[0] + o, knee[1]], [ank[0] + o, ank[1]], pants)
    }
    for (const o of [-1, 0, 1]) c.px(ax + d * o, ay + 1, shoe)
    return [hip, knee, ank]
  }
  // an arm swung theta (radians, + = forward): upper arm, forearm (elbow bending as it comes forward), hand
  const arm = (theta, sleeve, fore, hand) => {
    const sh = [x0, shY], el = [sh[0] + d * 3 * Math.sin(theta), sh[1] + 3 * Math.cos(theta)]
    const t2 = theta + Math.max(0, theta) * 0.5 + 0.1
    const hd = [el[0] + d * 3 * Math.sin(t2), el[1] + 3 * Math.cos(t2)]
    CROWD_line(c, sh, el, sleeve); CROWD_line(c, el, hd, fore)
    const h = [Math.round(hd[0]), Math.round(hd[1])]; c.px(h[0], h[1], hand); return h
  }
  // an arm reaching for a point (a handle, a phone): the elbow drops back
  const reach = (p, sleeve, fore, hand) => {
    const sh = [x0, shY], el = CROWD_joint(sh, p, 3, 3.5, -d)
    CROWD_line(c, sh, el, sleeve); CROWD_line(c, el, p, fore); c.px(p[0], p[1], hand)
  }
  const swing = s.stand ? 0 : -(near[0] / A) * 0.45, far2 = CROWD_step(s.top, -2)
  const handle = [at(4), Y - 8]
  // behind the body: the far arm and leg
  if (s.arms === "cart") reach([handle[0] - d, handle[1]], far2, far2, m.f)
  else if (s.arms !== "bag" && s.arms !== "phone") arm(-swing, far2, s.bare ? m.f : far2, m.f)
  const pf = leg(far, m.p, CROWD_step(s.shoes, -1))
  const head = CROWD_HEADS[s.head], bow = s.arms === "phone" && !s.lookUp ? 1 : 0
  CROWD_grid(c, at((s.lean || 0) + bow), top + bow - (head.length - 5), d, head, 3, m)
  CROWD_grid(c, x0, top + 5, d, CROWD_TORSOS[s.body], 3, m, true)
  const pn = leg(near, m.P, s.shoes)
  // a coat or skirt over the thighs, as wide as the legs are apart; its hem flares out behind
  if (s.coat) for (let k = 1; k <= s.coat; k++) {
    const y = hipY + k, xs = [at(-2), at(1)]
    for (const pts of [pn, pf]) { const x = Math.round(CROWD_xAt(pts, y)); xs.push(x, x - d) }
    let lo = Math.min(...xs), hi = Math.max(...xs)
    if (k >= s.coat - 1) { if (d > 0) lo--; else hi++ }
    for (let x = lo; x <= hi; x++) c.px(x, y, k === s.coat ? m.t : m.T)
  }
  // in front: the near arm and what it carries
  if (s.arms === "case") {
    const h = arm(swing * 0.35, m.t, m.t, m.F)
    for (let j = 1; j <= 3; j++) for (let i = -1; i <= 2; i++) c.px(h[0] + d * i, h[1] + j, j === 1 ? "b" : "B")
    c.px(h[0] + d, h[1] + 2, "f")
  } else if (s.arms === "parasol") {
    const hand = [at(2), shY + 3], cx = at(1), cy = top - 2
    reach(hand, m.t, m.F, m.F)
    CROWD_line(c, [hand[0], hand[1] - 1], [cx, cy], "c")
    ;[[2, "L"], [4, "U"], [5, "U"], [6, "u"]].forEach(([hw, k], j) => { for (let i = -hw; i <= hw; i++) c.px(cx + i, cy - 4 + j, k) })
    for (const i of [-6, -3, 3, 6]) c.px(cx + i, cy, "s")
  } else if (s.arms === "dog") {
    const h = arm(0.35 + swing * 0.25, "E", "E", "L")            // her chrome arm holds the leash
    const dx = at(5), collar = [dx + d * 7, Y - 4]
    CROWD_grid(c, dx, Y - 6, d, CROWD_DOG[Math.floor(f / 3) % 2], 0, CROWD_DOGMAP)
    const mid = [(h[0] + collar[0]) / 2, Math.max(h[1], collar[1]) + 1]
    CROWD_line(c, h, mid, "k"); CROWD_line(c, mid, collar, "k")
  } else if (s.arms === "cart") {
    reach(handle, m.t, m.t, m.F)
    CROWD_grid(c, at(5), Y - 10, d, CROWD_CART, 0, CROWD_CARTMAP)
  } else if (s.arms === "bag") {
    for (let j = 0; j < 4; j++) for (let i = 1; i <= 3; i++) c.px(at(i), shY + 1 + j, j === 0 ? "U" : i === 3 ? "s" : "u")
    c.px(at(2), shY, "9"); c.px(at(1), shY - 1, "9"); c.px(at(2), shY - 1, "d"); c.px(at(3), shY, "d")
    reach([at(3), shY + 4], m.t, m.t, m.F)
  } else if (s.arms === "phone") {
    const p = s.lookUp ? [at(2), shY + 5] : [at(2), shY + 2]
    reach(p, m.t, m.t, m.F)
    c.px(p[0] + d, p[1], "i"); c.px(p[0] + d, p[1] - 1, "i")
    if (!s.lookUp) c.px(at(3), top + 3, CROWD_step(s.skin, 2))        // the screen lights his face
  } else arm(swing, m.t, s.bare ? m.F : m.t, m.F)
}

// Who walks the near sidewalk: x = start on the 360 px ring, row = sole row in the box (scene row - 150),
// ph = where in the 12-frame stride they start.
const CROWD_NEAR = [
  // going right
  { dir: 1, x: 10, row: 27, ph: 0, tall: 1, head: "short", body: "suit", hair: "K", skin: "8", top: "C", pants: "C", shoes: "k", acc: "m", detail: "L", arms: "case" },
  { dir: 1, x: 100, row: 26, ph: 7, head: "hardhat", body: "coverall", acc: "U", hair: "B", skin: "6", top: "t", pants: "t", detail: "U", shoes: "B" },
  { dir: 1, x: 190, row: 28, ph: 3, tall: -1, head: "long", body: "dress", hair: "B", skin: "7", top: "m", pants: "7", shoes: "R", bare: true, coat: 4, arms: "parasol" },
  { dir: 1, x: 280, row: 27, ph: 9, head: "bob", body: "bomber", hair: "m", skin: "6", top: "R", pants: "K", shoes: "k", arms: "dog" },
  // going left
  { dir: -1, x: 45, row: 26, ph: 2, head: "hat", body: "duster", acc: "S", hair: "B", skin: "7", top: "s", pants: "b", detail: "m", shoes: "B", coat: 5 },
  { dir: -1, x: 135, row: 28, ph: 8, head: "mohawk", body: "punk", acc: "M", hair: "M", skin: "8", top: "K", pants: "T", detail: "L", shoes: "k" },
  { dir: -1, x: 225, row: 27, ph: 4, lean: 1, head: "old", body: "hunch", hair: "E", skin: "7", top: "b", pants: "C", shoes: "B", arms: "cart" },
  { dir: -1, x: 315, row: 26, ph: 10, head: "curly", body: "jacket", hair: "K", skin: "6", top: "j", pants: "S", shoes: "K", arms: "bag" },
]
// A kid on a kick scooter: 3 px/frame round a 720 px ring, across once a loop; kicks every 16 frames.
const CROWD_KID = { dir: 1, x: 140, row: 25, head: "cap", acc: "M", hair: "B", skin: "7", top: "J", pants: "c", shoes: "L" }
const CROWD_kid = (c, X, Y, f) => {
  const s = CROWD_KID, x0 = Math.floor(X), m = CROWD_map(s), kick = f % 16 < 5
  // the scooter: deck, wheels, stem and bar
  c.rect(x0 - 5, Y - 1, 10, 1, "c"); c.rect(x0 - 5, Y, 2, 1, "k"); c.rect(x0 + 4, Y, 2, 1, "k")
  c.line(x0 + 4, Y - 2, x0 + 3, Y - 11, "e"); c.px(x0 + 2, Y - 11, "k"); c.px(x0 + 4, Y - 11, "k")
  // back foot on the deck, front foot on it too or kicking off the ground
  c.line(x0 - 1, Y - 5, x0 - 2, Y - 3, m.p); c.rect(x0 - 4, Y - 2, 3, 1, CROWD_step(s.shoes, -1))
  CROWD_grid(c, x0, Y - 14, 1, CROWD_HEADS.cap.slice(0, 4), 3, m)
  CROWD_grid(c, x0, Y - 10, 1, ["..LLL..", ".TTTT..", ".TTTT..", ".PPPP..", ".PPPP.."], 3, m)
  if (kick) { c.line(x0, Y - 5, x0 - 2, Y - 1, m.F); c.rect(x0 - 3, Y, 3, 1, s.shoes) }
  else { c.line(x0, Y - 5, x0 + 1, Y - 3, m.F); c.rect(x0, Y - 2, 3, 1, s.shoes) }
  c.line(x0, Y - 9, x0 + 2, Y - 10, m.t); c.px(x0 + 3, Y - 11, m.F)
}
// The fruit vendor's cart under a sun-faded umbrella, a bare bulb on, the vendor behind it serving.
const CROWD_vendor = (c, f) => {
  for (let y = 0; y < 4; y++) {
    const hw = [6, 11, 14, 14][y]
    for (let x = 177 - hw; x <= 177 + hw; x++) {
      if (y === 3 && (x + 1) % 3 === 0) continue                       // scalloped hem
      const red = Math.floor((x - 163) / 4) % 2 === 0
      c.px(x, y, red ? (y === 3 ? "m" : "M") : (y === 3 ? "u" : y === 0 ? "L" : "U"))
    }
  }
  c.rect(168, 4, 1, 10, "c")                                            // the pole
  c.px(189, 4, "k"); c.px(189, 5, "A"); c.px(189, 6, "a")               // the bulb
  // the vendor, facing us, serving out of the case every 60 frames and glancing at whoever comes
  const serve = f % 60 < 14, look = f % 80 >= 60
  const V = { h: "C", H: "K", F: "7", f: "6", e: "k", T: "L", t: "E", X: "m", x: "r" }
  CROWD_grid(c, 179, 4, 1, ["...hhh..", "..hHHHh.", "..HFFFH.", look ? "..eFeFF." : "..FeFeF.", "...FfF..",
    ".tTXFXTt", serve ? "..TXXXTt" : ".tTXXXTt", serve ? "..TXXXTt" : ".tTXXXTt", serve ? "...xXx.F" : ".F.xXx.F"], 0, V)
  if (serve) { c.line(180, 10, 177, 12, "E"); c.px(176, 12, "7") }
  // the cart: sand body, a teal stripe, a fruit pictogram, a glass case of cut fruit, two wheels
  c.rect(168, 14, 21, 1, "U"); c.rect(168, 15, 21, 6, "u"); c.rect(168, 16, 21, 1, "t"); c.rect(168, 21, 21, 1, "s")
  c.rect(188, 15, 1, 6, "s"); c.rect(189, 15, 3, 1, "c")
  c.rect(181, 18, 3, 2, "M"); c.px(184, 18, "9"); c.px(181, 18, "U")
  c.rect(169, 10, 8, 4, "e"); c.rect(170, 11, 6, 2, "J"); c.rect(169, 10, 8, 1, "E")
  ;["M", "U", "9", "M", "m", "U"].forEach((k, i) => c.px(170 + i, 12, k))
  for (const wx of [172, 185]) { c.circ(wx, 23, 2, "k"); c.px(wx, 23, "c") }
}
// A busker on a crate, facing left, strumming (8 s of every 10), the guitar case open for coins.
const CROWD_busker = (c, f) => {
  const x0 = 263, Y = 25, d = -1, at = (o) => x0 + d * o, play = f % 120 < 96
  const nod = play && f % 8 >= 4 ? 1 : 0, strum = play ? Math.floor(f / 2) % 2 : 0
  const m = CROWD_map({ hair: "K", skin: "6", top: "r", pants: "C", acc: "T" })
  // the case on the ground in front of him
  c.rect(at(13), Y - 1, 8, 2, "B"); c.rect(at(12), Y - 1, 6, 1, "T"); c.px(at(10), Y - 1, "U"); c.px(at(8), Y - 1, "U")
  // crate, far arm, body, legs, guitar, hands
  c.rect(at(1), Y - 5, 5, 6, "b"); c.rect(at(1), Y - 5, 5, 1, "f"); c.rect(at(1), Y - 2, 5, 1, "B")
  CROWD_line(c, [x0, Y - 11], [at(5), Y - 10], m.t)
  CROWD_grid(c, x0, Y - 17 + nod, d, CROWD_HEADS.beanie, 3, m)
  CROWD_grid(c, x0, Y - 12, d, ["..LLL..", ".LTTT..", ".TTTT..", ".TTTT..", ".tTTt..", ".PPPP.."], 3, m, true)
  c.rect(Math.min(x0, at(4)), Y - 6, 5, 2, m.P); c.rect(Math.min(at(3), at(4)), Y - 4, 2, 4, m.P)
  c.rect(Math.min(at(3), at(5)), Y, 3, 1, "k")
  c.circ(at(2), Y - 8, 2, "f"); c.rect(Math.min(at(0), at(4)), Y - 7, 5, 1, "b"); c.px(at(2), Y - 8, "k")
  CROWD_line(c, [at(4), Y - 9], [at(8), Y - 12], "b"); c.px(at(9), Y - 13, "B"); c.px(at(8), Y - 13, "B")
  c.px(at(6), Y - 11, m.f)
  CROWD_line(c, [x0, Y - 11], [at(1), Y - 8], m.t); c.px(at(2), Y - 8 + strum, m.F)
}

// Everyone on the near sidewalk at frame f: what to draw, and their contact shadows [x, row, half width].
const CROWD_nearPeople = (f) => {
  const out = CROWD_NEAR.map((s) => {
    const ring = (s.x + 1.5 * f) % 360, X = s.dir > 0 ? ring - 20 : 340 - ring, x0 = Math.floor(X)
    const sh = [[x0, s.row, 5]]
    if (s.arms === "dog") sh.push([x0 + s.dir * 11, s.row, 5])
    if (s.arms === "cart") sh.push([x0 + s.dir * 11, s.row, 6])
    return { row: s.row, sh, draw: (c) => CROWD_walker(c, s, X, s.row, ((f + s.ph) % 12) / 12, 4.5, f) }
  })
  const kx = (CROWD_KID.x + 3 * f) % 720 - 200
  out.push({ row: CROWD_KID.row, sh: [[Math.floor(kx), CROWD_KID.row, 6]], draw: (c) => CROWD_kid(c, kx, CROWD_KID.row, f) })
  out.push({ row: 24, sh: [[178, 25, 11]], draw: (c) => CROWD_vendor(c, f) })
  out.push({ row: 25, sh: [[262, 25, 6]], draw: (c) => CROWD_busker(c, f) })
  const phone = { dir: 1, stand: true, head: "cap", acc: "c", hair: "K", skin: "6", top: "T", pants: "c", shoes: "L", body: "hoodie", arms: "phone", lookUp: f % 80 >= 64 }
  out.push({ row: 25, sh: [[279, 25, 4]], draw: (c) => CROWD_walker(c, phone, 279, 25, 0, 4.5, f) })
  return out.sort((a, b) => a.row - b.row)
}

// ================================================================ far sidewalk: 6 px/m, adults 10-11 px
// Heads (3 rows, hats 4) and torsos (shoulders to hips, 4 rows) facing right; column 2 is the hip line.
const CROWD_FHEADS = {
  short: [".hh..", ".HFF.", "..F.."],
  long: [".hh..", "HHFF.", "H.F.."],
  cap: [".aAA.", ".HFF.", "..F.."],
  hood: [".AA..", "AAff.", ".A..."],
  hat: ["..A..", "AAAAA", ".HFF.", "..F.."],
}
// At this size a side light doesn't read: the sky lights the shoulders from above, the belt is in shade.
const CROWD_FTORSOS = { top: [".LL..", ".TT..", ".tt..", ".PP.."], coat: [".LL..", ".TT..", ".TT..", ".TT.."] }
// One far person at hip column X, sole row Y: walking (u) or standing; dark = still in a doorway.
const CROWD_farWalker = (c, s, X, Y, u, dark, gesture) => {
  const d = s.dir, x0 = Math.floor(X), m = dark ? CROWD_DARK : CROWD_map(s), at = (o) => x0 + d * o
  const near = s.stand ? [0.6, 0] : CROWD_foot(u, 2.25), far = s.stand ? [-0.6, 0] : CROWD_foot((u + 0.5) % 1, 2.25)
  const leg = ([rel, lift], from, pants, shoe) => {
    const ax = Math.floor(X + d * rel), ay = Y - 1 - Math.round(lift)
    CROWD_line(c, [from, Y - 4], [ax, ay], pants); c.px(ax, ay + 1, shoe); c.px(ax + d, ay + 1, shoe)
  }
  const sw = s.stand ? 0 : near[0] / 2.25, far2 = dark ? "K" : CROWD_step(s.top, -2)
  CROWD_line(c, [x0, Y - 7], [at(Math.round(sw)), Y - 4], far2)
  leg(far, at(-1), m.p, dark ? "K" : CROWD_step(s.shoes, -1))
  const head = CROWD_FHEADS[s.head]
  CROWD_grid(c, x0, Y - 10 - (head.length - 3), d, head, 2, m)
  CROWD_grid(c, x0, Y - 7, d, CROWD_FTORSOS[s.body || "top"], 2, m, true)
  leg(near, x0, m.P, dark ? "K" : s.shoes)
  if (s.body === "coat") { c.px(at(-1), Y - 3, m.t); c.px(x0, Y - 3, m.t) }
  if (gesture) { CROWD_line(c, [x0, Y - 7], [at(2), Y - 7], m.t); c.px(at(3), Y - 8, m.F) }
  else { const h = [at(-Math.round(sw)), Y - 4]; CROWD_line(c, [x0, Y - 7], h, m.t); c.px(h[0], h[1], m.F) }
}
// Doorways (centres, plan.md's table) and the frame's edges, where far walkers come and go.
const CROWD_AT = { A: 44, B: 104, D: 218, E: 239, F: 308, W: -6, X: 326 }
// [from, to, start frame, sole row, look]
const CROWD_TRIPS = [
  ["A", "W", 10, 16, { head: "short", hair: "K", skin: "6", top: "r", pants: "C", shoes: "k" }],
  ["W", "A", 150, 15, { head: "long", hair: "b", skin: "8", top: "j", pants: "S", shoes: "K" }],
  ["B", "D", 40, 17, { head: "cap", acc: "t", hair: "K", skin: "6", top: "U", pants: "c", shoes: "L" }],
  ["X", "F", 100, 16, { head: "hood", acc: "C", hair: "K", skin: "6", top: "C", pants: "K", shoes: "k" }],
  ["E", "X", 120, 15, { head: "short", hair: "f", skin: "7", top: "m", pants: "T", shoes: "B" }],
  ["D", "E", 200, 16, { head: "long", hair: "K", skin: "6", top: "M", pants: "K", shoes: "R" }],
  ["F", "E", 180, 17, { head: "hat", acc: "S", hair: "B", skin: "7", top: "s", body: "coat", pants: "b", shoes: "B" }],
  ["X", "D", 60, 15, { head: "short", hair: "E", skin: "8", top: "e", pants: "C", shoes: "k" }],
  ["B", "W", 170, 16, { head: "cap", acc: "M", hair: "K", skin: "6", top: "K", pants: "t", shoes: "L" }],
  ["W", "B", 5, 17, { head: "short", hair: "B", skin: "6", top: "t", pants: "S", shoes: "B" }],
]
// Standing, facing us (front) or the counter (back): 3 px wide grids.
const CROWD_FRONT = ["hhh", "FFF", ".F.", "LTL", "TTT", "TTT", "PPP", "P.P", "P.P", "P.P", "S.S"]
const CROWD_BACK = ["hhh", "HHH", ".f.", "LTL", "TTT", "TTT", "PPP", "P.P", "P.P", "P.P", "S.S"]
const CROWD_HOOD = ["AAA", "AfA", ".A.", "LTL", "TTT", "TTT", "PPP", "P.P", "P.P", "P.P", "S.S"]

const CROWD_farPeople = (f) => {
  const out = CROWD_TRIPS.flatMap(([a, b, t0, row, look]) => {
    const x1 = CROWD_AT[a], x2 = CROWD_AT[b], dur = Math.round(Math.abs(x2 - x1) / 0.75), age = (f - t0 + 240) % 240
    if (age >= dur) return []
    const s = { ...look, dir: Math.sign(x2 - x1) }, X = x1 + s.dir * 0.75 * age
    const dark = ("WX".includes(a) ? false : age < 3) || ("WX".includes(b) ? false : dur - age <= 3)
    return [{ row, sh: [[Math.floor(X), row, 3]], draw: (c) => CROWD_farWalker(c, s, X, row, (age % 12) / 12, dark) }]
  })
  const still = (x, row, grid, map) => ({ row, sh: [[x + 1, row, 3]], draw: (c) => CROWD_grid(c, x, row - 10, 1, grid, 0, map) })
  // two at the taco window, backs to us: one eating, one shifting his weight
  const eat = f % 40 < 12
  out.push({ ...still(76, 16, CROWD_BACK, { h: "f", H: "b", f: "6", L: "U", T: "u", P: "K", S: "k" }),
    draw: (c) => { CROWD_grid(c, 76, 6, 1, CROWD_BACK, 0, { h: "f", H: "b", f: "6", L: "U", T: "u", P: "K", S: "k" }); if (eat) { c.px(79, 9, "u"); c.px(79, 8, "6") } } })
  const shift = f >= 120
  out.push(still(86, 15, shift ? [...CROWD_BACK.slice(0, 7), "PP.", "PP.", "P.P", "S.S"] : CROWD_BACK, { h: "E", H: "e", f: "7", L: "j", T: "t", P: "S", S: "B" }))
  // a smoker leaning by the laundromat door: hand up every 4 s, the ember brighter, then a puff
  const puff = f % 48
  out.push({ row: 15, sh: [[233, 15, 3]], draw: (c) => {
    CROWD_grid(c, 232, 5, 1, CROWD_FRONT, 0, { h: "K", F: "7", L: "c", T: "C", P: "T", S: "k" })
    if (puff < 10) { c.px(234, 7, "7"); c.px(235, 7, puff >= 2 && puff < 8 ? "o" : "M") } else { c.px(235, 9, "M") }
    if (puff >= 12 && puff < 36) { const a = puff - 12; c.px(233 + Math.floor(a / 8), 4 - Math.floor(a / 6), a < 12 ? "L" : "E") }
  } })
  // two talking at the lot's mouth, taking turns with their hands
  const talk = Math.floor(f / 30) % 2
  out.push({ row: 16, sh: [[123, 16, 3]], draw: (c) => CROWD_farWalker(c, { dir: 1, stand: true, head: "long", hair: "m", skin: "7", top: "T", pants: "c", shoes: "k" }, 123, 16, 0, false, talk === 0 && f % 30 < 18) })
  out.push({ row: 15, sh: [[130, 15, 3]], draw: (c) => CROWD_farWalker(c, { dir: -1, stand: true, head: "cap", acc: "R", hair: "K", skin: "6", top: "u", pants: "K", shoes: "L" }, 130, 15, 0, false, talk === 1 && f % 30 < 18) })
  // a hooded man leaning on the clinic's wall, now and then looking down the street
  const glance = f % 80 >= 60
  out.push(still(292, 15, glance ? ["AAA", "AAf", ".A.", ...CROWD_HOOD.slice(3)] : CROWD_HOOD, { A: "C", f: "5", L: "c", T: "C", P: "K", S: "k" }))
  return out.sort((a, b) => a.row - b.row)
}

// ================================================================ the assets
// In the strip's shade the brightest of the sky is the sunset in the west: each far figure's left edge
// takes it a tone lighter (not the ones still in a dark doorway), which also lifts them off the facades.
anim("crowd_far", { w: 320, h: 18, frames: 240, fps: 12 }, (c) => {
  for (const p of CROWD_farPeople(c.frame)) p.draw(c)
  const rim = []
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++)
    if (c.is(x, y, "*") && c.is(x - 1, y, ".") && !c.is(x, y, "K")) rim.push([x, y, CROWD_step(c.key(x, y), 1)])
  for (const [x, y, k] of rim) c.px(x, y, k)
})
anim("crowd_near", { w: 320, h: 30, frames: 240, fps: 12 }, (c) => { for (const p of CROWD_nearPeople(c.frame)) p.draw(c) })
// Contact shadows for the scene's shade layer: far sole rows land on box rows 15-17, near ones on 50-54.
anim("crowd_shadow", { w: 320, h: 56, frames: 240, fps: 12 }, (c) => {
  for (const p of CROWD_farPeople(c.frame)) for (const [x, row, hw] of p.sh) CROWD_shadow(c, x, row, hw)
  for (const p of CROWD_nearPeople(c.frame)) for (const [x, row, hw] of p.sh) CROWD_shadow(c, x, row + 26, hw)
})

// ================================================================ test: the part where the city puts it
// Stand-ins for the strip (facades, doors, lit glass), the sidewalks and the road, in plan.md's rows.
scene("test_crowd", { w: 320, h: 180, bg: "h" },
  rect(0, 60, 320, 76, "c"), rect(118, 60, 52, 64, "h"), rect(118, 124, 52, 12, "g"),
  ...[42, 102, 216, 237, 306].map((x) => rect(x, 123, 6, 13, "K")),
  rect(174, 116, 37, 19, "i"), rect(248, 116, 25, 19, "i"), rect(70, 118, 25, 10, "w"),
  rect(0, 136, 320, 6, "e"), rect(0, 142, 320, 2, "C"), rect(0, 144, 320, 23, "G"), rect(0, 155, 320, 1, "u"),
  rect(0, 167, 320, 1, "E"), rect(0, 168, 320, 1, "c"), rect(0, 169, 320, 11, "E"),
  layer("shadows", { shade: 2 }, stamp("crowd_shadow", 0, 124)),
  stamp("crowd_far", 0, 124),
  stamp("crowd_near", 0, 150))
