// Part "strip" (plan.md §5, §7.4): the far side of the street, buildings A–F flat-on at 5.3 px/m.
// One asset, strip_row (320x100, stamped at 0,40, 240 frames at 12 fps). Everything is drawn in
// scene coordinates: each layer is offset by STRIP_DY, so the plan's x and rows go in as written.
// Light: the sun sets behind the scene at the upper left. Only what stands against the sky above
// row ~100 (parapet tops, rooftop gear, E's left edge, the palm crowns) catches it, as a rim on its
// top and left edges; the faces toward us and everything lower are in shade, lit by the sky from
// above (up-facing surfaces one tone lighter) and by the shops (fluorescent i, warm w).
include("palette.px.js", { palette: true })

const STRIP_DY = -40

// a fixed pseudo-random number in 0..1 for an index (same every build)
const STRIP_H = (n) => {
  n = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b); n ^= n >>> 13; n = Math.imul(n, 0xc2b2ae35)
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296
}

// ---------------------------------------------------------------- windows
// Glass inside an opening, by what is behind it: d dark glass reflecting the dusk (teal, the
// sky's band higher up, a glint); w a lit room (warm, a curtain, someone or something on the sill);
// i a fluorescent office behind blinds; b blinds half down over dark glass; t a dark room (the TV
// that lights it is drawn per frame).
const STRIP_PANE = (c, x, y, w, h, kind, s = 0) => {
  if (kind === "w") {
    c.rect(x, y, w, h, "w")
    const left = s % 2 === 0
    if (w >= 5) { c.rect(left ? x : x + w - 2, y, 2, h, "u"); c.vline(left ? x : x + w - 1, y, h, "s") }
    const m = x + (left ? 3 : 1)
    if (w < 6) return
    if (s % 3 === 0) { c.rect(m + 1, y + h - 5, 2, 2, "S"); c.rect(m, y + h - 3, 4, 3, "S") }       // someone at the window
    else if (s % 3 === 1) { c.rect(m, y + h - 2, 3, 2, "d"); c.px(m + 1, y + h - 3, "d"); c.px(m + 2, y + h - 4, "d") } // a plant
    else { c.hline(x, y + h - 3, w, "s"); c.px(m, y + h - 4, "m"); c.px(m + 1, y + h - 4, "t"); c.px(m + 3, y + h - 5, "s") } // a shelf
  } else if (kind === "i") {
    c.rect(x, y, w, h, "i")
    for (let r = y + 1; r < y + h - 2; r += 2) c.hline(x, r, w, "J")
    c.rect(x, y + h - 2, w, 2, "t")
  } else if (kind === "b") {
    STRIP_PANE(c, x, y, w, h, "d", s)
    const half = Math.floor(h / 2)
    for (let r = y; r < y + half; r++) c.hline(x, r, w, (r - y) % 2 ? "C" : "e")
  } else {
    c.rect(x, y, w, h, "T")
    if (kind === "t") return
    c.rect(x, y, w, Math.max(1, Math.floor(h / 3)), "n")
    const g = 1 + (s % 3)
    for (let i = 0; i < 4; i++) if (x + w - 1 - g - i >= x) c.px(x + w - 1 - g - i, y + i + 1, "v")
  }
}

// A window set deep in the concrete: the reveal's top in shadow (the light comes from the sky above),
// its left side in shade, the sill catching the sky; water running off the sill's ends streaks the
// wall under them.
const STRIP_WIN = (c, x, y, w, h, kind, s, top = 1) => {
  c.rect(x, y, w, top, "K")
  c.vline(x, y + top, h - top, "C")
  STRIP_PANE(c, x + 1, y + top, w - 1, h - top, kind, s)
  c.hline(x - 1, y + h, w + 2, "e")
  c.shade([x - 1, y + h + 1, 1, 3]); c.shade([x + w, y + h + 1, 1, 2]); c.shade([x + w, y + h + 3, 1, 2], 1, 0.5)
}

// a dark doorway (where the far walkers come and go): frame, opening, deepest at the top
const STRIP_DOOR = (c, x, frame) => {
  c.rect(x - 1, 122, 8, 14, frame); c.rect(x, 123, 6, 13, "K"); c.hline(x, 123, 6, "k")
}

// a sign spot (plan §5): a plain dark board for signs_neons to light, framed
const STRIP_BOARD = (c, x0, x1, y0, y1, frame) => {
  c.rect(x0 - 1, y0, x1 - x0 + 3, y1 - y0 + 2, frame); c.rect(x0, y0, x1 - x0 + 1, y1 - y0 + 1, "K")
}

// ---------------------------------------------------------------- the sun's rim
// Pixels against the sky take the sun's rim: on their top edge the material's lightest tone (gold
// right by the sun), on their left edge one tone lighter. One pass, so a rim never creeps inward.
const STRIP_RIM_TOP = { K: "L", C: "L", c: "L", e: "L", E: "L", D: "9", d: "9", B: "f", b: "f", s: "U", u: "U", r: "M", m: "M", T: "J", t: "J" }
const STRIP_RIM_LEFT = { K: "C", C: "c", c: "E", e: "E", E: "L", D: "d", d: "9", B: "b", b: "f", s: "u", u: "U", r: "m", m: "M", T: "t", t: "j" }
const STRIP_RIM = (c, x0, y0, x1, y1, gold = () => false, keys) => {
  const hits = []
  for (let y = y0; y <= y1; y++) for (let x = Math.max(1, x0); x <= x1; x++) {
    if (c.is(x, y, ".")) continue
    const k = c.key(x, y)
    if (keys && !keys.includes(k)) continue
    if (c.is(x, y - 1, ".") && STRIP_RIM_TOP[k]) hits.push([x, y, gold(x, y) ? "y" : STRIP_RIM_TOP[k]])
    else if (c.is(x - 1, y, ".") && STRIP_RIM_LEFT[k]) hits.push([x, y, STRIP_RIM_LEFT[k]])
  }
  for (const [x, y, k] of hits) c.px(x, y, k)
}

// ---------------------------------------------------------------- A: brutalist block, 4 storeys
const STRIP_A_WX = [3, 16, 29, 42]
const STRIP_A_KINDS = [["w", "d", "b", "t"], ["w", "d", "w", "d"], ["d", "b", "w", "i"]]
const STRIP_A = (c) => {
  c.rect(0, 58, 62, 78, "c")
  c.vline(61, 59, 35, "C")                                                  // the corner above B, away from the light
  // coping: its top in the last sun, its lip's underside dark (above eye level)
  c.hline(0, 58, 62, "L"); c.hline(0, 59, 62, "E"); c.hline(0, 60, 62, "e"); c.hline(0, 61, 62, "C")
  // floor ledges: above eye level they show their dark undersides; the canopy over the shop its top
  for (const r of [74, 92]) { c.hline(0, r, 62, "e"); c.hline(0, r + 1, 62, "e"); c.hline(0, r + 2, 62, "C") }
  c.hline(0, 110, 62, "E"); c.hline(0, 111, 62, "e"); c.hline(0, 112, 62, "K")
  // form-tie holes of the board-formed concrete, in rows between the ledges
  for (const y of [65, 69, 83, 87, 101, 105]) for (let x = 2; x < 61; x += 4) if (c.is(x, y, "c")) c.px(x, y, "C")
  ;[63, 81, 99].forEach((y, f) => {
    STRIP_A_WX.forEach((x, i) => STRIP_WIN(c, x, y, 8, 9, STRIP_A_KINDS[f][i], f * 4 + i))
    STRIP_WIN(c, 54, y, 4, 9, f === 1 ? "i" : "d", 7 + f)                   // the stairwell's slot
  })
  // a window unit in the dark F2 window; its drip runs down the wall below
  c.rect(44, 86, 5, 4, "e"); c.hline(44, 86, 5, "E"); c.vline(45, 87, 3, "C"); c.vline(47, 87, 3, "C")
  c.shade([46, 91, 1, 6]); c.shade([46, 97, 1, 2], 1, 0.5)
  // the service drop lands on the coping at (50, 60); the conduit takes it down to the meter
  c.hline(49, 60, 3, "K"); c.px(50, 59, "E"); c.vline(51, 61, 53, "K")
  for (const y of [70, 84, 102]) c.hline(50, y, 3, "K")
  c.rect(49, 114, 5, 6, "C"); c.rect(50, 115, 3, 4, "e"); c.px(51, 116, "K")
  // fire escape, black iron, in front of the left windows: a landing under each floor's windows,
  // stairs between them, the drop ladder folded up under the lowest; rust runs under the brackets
  for (const r of [73, 91, 109]) {
    c.hline(0, r - 4, 15, "C"); for (let x = 0; x < 15; x += 3) c.vline(x, r - 3, 3, "K")
    c.vline(14, r - 3, 3, "K"); c.hline(0, r, 15, "K")
    c.px(13, r + 1, "K"); c.px(14, r + 1, "K"); c.vline(14, r + 2, 2, "r"); c.px(14, r + 4, "R")
  }
  c.line(13, 74, 3, 90, "K"); c.line(13, 70, 3, 86, "C")
  c.line(2, 92, 12, 108, "K"); c.line(2, 88, 12, 104, "C")
  c.vline(1, 110, 8, "K"); c.vline(4, 110, 8, "K"); for (let y = 111; y < 118; y += 2) c.hline(2, y, 2, "K")
  // ---- the shop: electronics repair and pawn
  STRIP_BOARD(c, 6, 34, 113, 118, "C")
  c.rect(2, 120, 35, 16, "C")                                               // window frame
  c.hline(3, 120, 33, "e"); c.hline(3, 121, 33, "c")                        // the grate's housing
  for (let r = 122; r < 127; r++) c.hline(3, r, 33, r % 2 ? "C" : "e")      // corrugated slats, half down
  c.hline(3, 127, 33, "K")
  c.rect(3, 128, 33, 6, "w")                                                // the lit shop under it
  c.hline(3, 131, 33, "S")
  for (const [x, k] of [[5, "i"], [10, "j"], [27, "i"], [31, "J"]]) { c.rect(x, 128, 4, 3, "K"); c.rect(x + 1, 129, 2, 1, k) }  // TVs for sale
  c.rect(15, 132, 4, 2, "s"); c.rect(24, 132, 3, 2, "S"); c.rect(32, 132, 3, 2, "s")
  c.line(22, 128, 25, 130, "B"); c.rect(24, 130, 2, 1, "b")                 // a guitar on the wall
  c.rect(19, 128, 2, 2, "6"); c.rect(18, 130, 4, 4, "S")                    // the owner
  c.grid(8, 122, `
    ..MMM..M....
    .M...MMM.MM.
    M..MM..M...M
    .MM....MMMM.`)                                                          // a tag across the slats
  STRIP_DOOR(c, 42, "C")
  c.grid(38, 124, `
    J..J
    .JJ.
    J.J.`)
  // posters layered on the wall by the door, the old one's corner peeling
  c.rect(54, 121, 7, 9, "U"); c.rect(55, 122, 5, 4, "m"); c.hline(55, 127, 4, "T"); c.px(60, 121, "e")
  c.rect(56, 125, 5, 6, "J"); c.rect(57, 127, 3, 2, "T"); c.hline(57, 130, 3, "t")
  c.rect(58, 114, 3, 2, "K"); c.px(57, 115, "E")                            // a camera over the door
  // ---- rooftop, against the sun's halo: a dish, the HVAC, a vent, the mast, a tank on legs
  c.grid(6, 49, `
    ..CCC.....
    .CCCCC....
    CCCCCCC...
    .CCCCCCK..
    ..CCCCK.K.
    ....K...K.
    ....K..KK.
    ...KKK....
    ..KKKKK...`)
  c.rect(18, 51, 13, 7, "C"); c.rect(19, 52, 3, 5, "K"); c.px(20, 53, "c"); c.px(20, 55, "c")
  c.rect(22, 52, 5, 5, "K"); c.px(24, 54, "C")                              // the fan (it turns per frame)
  c.rect(27, 52, 3, 5, "c"); for (let y = 52; y < 57; y += 2) c.hline(27, y, 3, "C")
  c.rect(37, 51, 3, 1, "K"); c.rect(38, 52, 2, 6, "C")                      // vent stack
  c.rect(42, 44, 13, 9, "C"); c.hline(42, 46, 13, "K"); c.hline(42, 50, 13, "K")
  c.hline(47, 41, 3, "C"); c.hline(45, 42, 7, "C"); c.hline(43, 43, 11, "C")
  // the crate of old electronics and the trash can on the sidewalk
  c.rect(22, 134, 8, 5, "b"); c.hline(22, 134, 8, "f"); c.hline(22, 136, 8, "B"); c.vline(25, 135, 4, "B")
  c.rect(23, 130, 6, 4, "C"); c.hline(23, 130, 6, "e"); c.rect(24, 131, 3, 2, "T"); c.px(25, 131, "v")
  c.rect(53, 131, 5, 8, "e"); c.hline(53, 131, 5, "E"); c.hline(53, 132, 5, "c"); c.vline(54, 133, 5, "c"); c.vline(56, 133, 5, "c"); c.vline(57, 132, 7, "c")
}

// thin ironwork, too thin to catch a rim: the mast in front of the sun's disc with its guy wires and
// a beacon on top, the tank's legs
const STRIP_MAST = (c) => {
  c.vline(34, 41, 17, "K"); c.px(34, 40, "R")
  c.hline(32, 42, 5, "K"); c.hline(33, 46, 3, "K"); c.hline(33, 51, 3, "K")
  c.line(34, 44, 29, 57, "C"); c.line(34, 44, 40, 57, "C")
  // the tank's legs, cross brace and ladder
  c.rect(43, 53, 1, 5, "K"); c.rect(48, 53, 1, 5, "K"); c.rect(53, 53, 1, 5, "K"); c.line(43, 54, 53, 57, "K")
  c.vline(55, 45, 13, "K")
}

// ---------------------------------------------------------------- B: taco stand, sun-faded stucco
const STRIP_B = (c) => {
  c.rect(62, 94, 56, 42, "u")
  c.hline(62, 94, 56, "U"); c.hline(62, 95, 56, "s")                        // coping in the last sun, its lip
  c.vline(117, 96, 40, "s")                                                 // the corner by the lot
  // upstairs: a louvre, a barred window, the window that goes dark and comes back (frames 30-149)
  c.rect(64, 99, 6, 5, "S"); c.hline(64, 100, 6, "s"); c.hline(64, 102, 6, "s")
  c.rect(77, 97, 10, 7, "S"); STRIP_PANE(c, 78, 98, 8, 5, "d", 1); for (let x = 79; x < 86; x += 2) c.vline(x, 98, 5, "S")
  c.rect(98, 97, 13, 11, "S"); c.hline(97, 108, 15, "U")
  c.rect(99, 98, 11, 9, "w"); c.rect(99, 98, 2, 9, "u"); c.rect(108, 98, 2, 9, "u"); c.vline(104, 98, 9, "s")
  c.rect(106, 102, 2, 2, "S"); c.rect(105, 104, 3, 3, "S")
  c.shade([97, 109, 1, 3]); c.px(96, 112, "s"); c.px(95, 113, "s")         // a crack from the sill's corner
  STRIP_BOARD(c, 72, 92, 106, 111, "S")
  // a belt of old red paint, flaking
  for (let x = 62; x < 117; x++) { const k = STRIP_H(x * 7 + 3); c.px(x, 114, k < 0.15 ? "u" : "m"); c.px(x, 115, k < 0.25 ? "u" : "r") }
  // the striped awning: its top seen from above (sky-lit), the valance, the scalloped hem
  for (let x = 68; x <= 96; x++) {
    const red = ((x - 68) >> 2) % 2 === 0
    c.px(x, 117, red ? "M" : "U"); c.px(x, 118, red ? "M" : "U"); c.px(x, 119, red ? "m" : "u"); c.px(x, 120, red ? "m" : "u")
  }
  // the counter window: menu inside, the hood, the cook at the griddle, steam
  c.rect(69, 121, 27, 10, "S"); c.rect(70, 122, 25, 8, "w")
  c.rect(71, 122, 10, 3, "K"); for (let x = 72; x < 80; x += 2) { c.px(x, 123, "U"); c.px(x + 1, 124, "a") }
  c.hline(72, 126, 9, "s"); for (const [x, k] of [[72, "m"], [74, "t"], [75, "U"], [77, "m"], [79, "j"]]) c.vline(x, 124, 2, k)
  c.rect(84, 122, 10, 2, "e"); c.hline(84, 122, 10, "E")
  c.rect(87, 124, 2, 1, "U"); c.rect(87, 125, 2, 1, "6"); c.rect(86, 126, 4, 4, "S"); c.vline(88, 126, 3, "e")
  c.px(92, 124, "U"); c.px(93, 123, "U"); c.px(91, 125, "U")
  for (let x = 68; x <= 96; x++) if ((x - 68) % 4 === 1 || (x - 68) % 4 === 2) c.px(x, 121, ((x - 68) >> 2) % 2 === 0 ? "r" : "s")
  c.hline(68, 130, 29, "E"); c.hline(68, 131, 29, "e")                      // the steel counter
  c.vline(73, 128, 2, "m"); c.vline(74, 128, 2, "U"); c.rect(77, 129, 2, 1, "e")
  c.hline(68, 132, 29, "S")
  for (let y = 133; y < 136; y++) for (let x = 68; x <= 96; x++) c.px(x, y, ((x >> 1) + (y >> 1)) % 2 ? "t" : "j")  // tiles
  // chalk menu on the left, the side door, a box and a tag on the right
  c.rect(62, 120, 6, 10, "S"); c.rect(63, 121, 4, 8, "K")
  for (const y of [122, 124, 126]) c.hline(63, y, 3, "U"); c.px(65, 127, "m")
  STRIP_DOOR(c, 102, "S")
  c.rect(110, 115, 4, 5, "e"); c.hline(110, 115, 4, "E"); c.px(111, 117, "C"); c.vline(112, 120, 10, "s"); c.px(113, 130, "C")
  c.grid(109, 124, `
    .J..JJ.
    J.JJ..J
    ..J....`)
  // the A-frame menu on the sidewalk, its top caught by the window's light
  c.grid(96, 132, `
    .fff.
    .KUK.
    .KKK.
    bKUKb
    bKKKb
    b...b
    B...B`)
}

// ---------------------------------------------------------------- C: the parking lot
const STRIP_C = (c) => {
  // fence at the back of the lot: chain-link (see-through), posts, rails, razor coil on top
  for (let y = 114; y <= 122; y++) for (let x = 118; x <= 169; x++)
    if (((x + y) % 4 === 0 || (x - y + 400) % 4 === 0) && !(x >= 158 && x <= 163 && y >= 118)) c.px(x, y, "e")
  c.px(158, 118, "E"); c.px(163, 118, "E"); c.px(157, 119, "e"); c.px(164, 120, "e")   // the hole someone cut, curled back
  c.hline(118, 113, 52, "e"); c.hline(118, 123, 40, "c"); c.hline(164, 123, 6, "c")
  for (const x of [118, 130, 142, 155, 168]) { c.vline(x, 112, 12, "e"); c.px(x, 111, "E") }
  for (let x = 118; x <= 169; x++) { if (x % 4 === 2) { c.px(x, 110, "E"); c.px(x, 112, "e") } else if (x % 2) c.px(x, 111, "e") }
  c.rect(134, 115, 6, 4, "U"); c.line(135, 118, 138, 115, "m"); c.px(134, 115, "u")   // a no-entry plate wired on
  // the lot's asphalt, the stall lines running away toward the vanishing point, oil, cracks, weeds
  c.rect(118, 124, 52, 12, "g")
  for (const x0 of [121, 133, 155, 167]) for (let y = 124; y <= 135; y++) {
    const x = Math.round(x0 + (144 - x0) * (135 - y) / 31)
    if (STRIP_H(x * 131 + y) > 0.3) c.px(x, y, "u")
  }
  c.ellipse(146, 130, 3, 1, "G"); c.ellipse(160, 127, 2, 1, "G"); c.px(127, 126, "G")
  c.line(128, 135, 131, 131, "G"); c.px(132, 130, "G"); c.px(128, 134, "d"); c.px(129, 135, "9")
  for (let x = 118; x <= 169; x++) { const h = STRIP_H(x * 17 + 5); if (h < 0.3) c.px(x, 124, "d"); if (h < 0.12) c.px(x, 123, "9") }
  // an old sedan, sun-faded red, parked nose to the street: glass catching the sky, its top dusty
  c.grid(119, 125, `
    .....mmmmmmmmm.......
    ....mThhTmThhhTm.....
    .MMMMMMMMMMMMMMMMMM..
    mmmmmmmmmmmmmmmmmmmmE
    Rmmmmmmmmmmmmmmmmmmme
    errkkkrrrrrrrrkkkrree
    ...kck........kck....`)
  // a dumpster by the fence, lid propped on a bag, rust under the hinges, a tag
  c.grid(152, 119, `
    eeeeeeeeeeee
    CCCCCCCCCCCC
    kkKKKfkkkkkk
    tttttttttttt
    TTTTTTTTTTTT
    TrTTTTTTTTrT
    TrTMMTJJTTrT
    TTTMTTJTTTTT
    TTTTMMTTTTTT
    TTTTTTTTTTTT
    TTTTTTTTTTTT
    TTTTTTTTTTTT
    .k........k.`)
}

// a palm trunk, 2 px, leaning `lean` px over its height, a flared foot, leaf scars every 3 rows
const STRIP_TRUNK = (c, x0, y0, y1, lean) => {
  for (let y = y1; y <= y0; y++) {
    const t = (y0 - y) / (y0 - y1), x = x0 + Math.round(lean * t * t)
    c.px(x, y, y % 4 ? "b" : "B"); c.px(x + 1, y, "B")
  }
  c.px(x0 - 1, y0, "B"); c.px(x0 - 1, y0 - 1, "b"); c.px(x0 + 2, y0, "B")
}
// the skirt of dead fronds hanging under the crown, hugging the trunk
const STRIP_SKIRT = (c, xc, y) => c.grid(xc - 5, y, `
  .bBbBbBbB.
  ..BbfBbBb.
  ..bBbBfB..
  ...BbBbB..
  ...bBfB...
  ....BbB...
  ....bBb...
  .....b....`)
// the crown, a fan palm's round head with leaf tips all round, drooping lower down
const STRIP_CROWN = [
  "........9.9.9........",
  "....9.9.d9d9d.9.9....",
  "...d.d9ddddddd9d.d...",
  ".9.ddddddddddddddd.9.",
  "..ddddddddddddddddd..",
  "9ddddddddDDDddddddd9.",
  ".ddddddDDDDDDDdddddd.",
  "dddddDDDDDDDDDDDddddd",
  "d.dDDDDDDDDDDDDDDDd.d",
  "d.DD.DDDDDDDDDDD.DD.d",
  "..D..D.DDDDDDD.D..D..",
  "..D....D.DDD.D....D..",
  ".......D.....D.......",
]
// [base x, base row, crown top row, lean, mirrored, gust lag in frames]
const STRIP_PALMS = [[122, 133, 42, 3, false, 0], [166, 133, 50, -2, true, 5]]

// ---------------------------------------------------------------- D: liquor and convenience store
const STRIP_D_GOODS = ["M", "U", "m", "J", "u", "r", "9", "U"]
const STRIP_D = (c) => {
  c.rect(170, 110, 62, 26, "U")
  c.hline(170, 110, 62, "J"); c.hline(170, 111, 62, "t")                    // teal coping, its top lit by the sky
  c.vline(170, 112, 24, "u")
  STRIP_BOARD(c, 176, 206, 112, 117, "u")
  c.hline(170, 119, 62, "t")
  // the glass front: fluorescent, shelves, the cashier, a cooler, posters taped inside
  c.rect(174, 120, 37, 13, "t")
  for (const [x0, x1] of [[175, 185], [187, 197], [199, 209]]) {
    c.rect(x0, 121, x1 - x0 + 1, 12, "i"); c.hline(x0, 121, x1 - x0 + 1, "J"); c.hline(x0 + 2, 121, x1 - x0 - 3, "i")
  }
  for (const r of [124, 127, 130]) {
    c.hline(176, r + 1, 9, "t")
    for (let x = 176; x <= 184; x++) if (STRIP_H(x * 3 + r) < 0.7) c.px(x, r, STRIP_D_GOODS[Math.floor(STRIP_H(x + r * 11) * 8)])
  }
  c.vline(176, 122, 11, "j"); c.vline(184, 122, 11, "j")
  for (const r of [125, 128, 131]) {
    c.hline(199, r, 11, "J")
    for (let x = 199; x <= 209; x++) if (STRIP_H(x * 5 + r) < 0.6) c.px(x, r - 1, STRIP_D_GOODS[Math.floor(STRIP_H(x * 2 + r) * 8)])
  }
  c.vline(203, 122, 11, "j"); c.vline(207, 122, 11, "j")
  for (let x = 194; x <= 197; x++) for (const y of [122, 123]) if ((x + y) % 2) c.px(x, y, y === 122 ? "U" : "M")
  c.rect(191, 125, 4, 3, "t"); c.vline(194, 125, 3, "T"); c.rect(192, 123, 2, 2, "7"); c.hline(192, 122, 2, "K")
  c.hline(187, 128, 11, "J"); c.rect(187, 129, 11, 4, "t"); c.rect(189, 126, 2, 2, "T")
  c.rect(177, 122, 5, 6, "U"); c.rect(178, 123, 3, 2, "m"); c.hline(178, 126, 3, "T")
  c.rect(203, 123, 5, 6, "M"); c.rect(204, 124, 3, 3, "U")
  c.rect(170, 133, 46, 3, "t"); c.hline(170, 135, 46, "T")
  c.vline(215, 120, 2, "u")
  STRIP_DOOR(c, 216, "t")
  // a payphone on the wall, the ice chest on the sidewalk
  c.hline(224, 115, 6, "e"); c.rect(225, 116, 4, 7, "C"); c.rect(226, 117, 2, 2, "T"); c.vline(224, 117, 4, "K"); c.px(226, 120, "e")
  c.grid(223, 127, `
    LLLLLLLL
    EEEEEEEE
    EJJJJJJE
    EJtJJtJE
    EJJttJJE
    EJtJJtJE
    EJJJJJJE
    EEEEEEEE
    EeeeeeeE
    EeeeeeeE
    EeeeeeeE
    CCCCCCCC`)
  // rooftop, clear of the holo projector (x 179-222): a vent, an AC unit
  c.rect(172, 105, 4, 1, "K"); c.rect(173, 106, 2, 4, "C")
  c.rect(223, 103, 8, 7, "e"); c.hline(223, 103, 8, "E"); for (const x of [224, 226, 228]) c.vline(x, 105, 3, "C"); c.hline(223, 109, 8, "c")
}

// ---------------------------------------------------------------- E: concrete grid, laundromat
const STRIP_E_BAYS = [234, 244, 254, 264]
const STRIP_E_KINDS = [["d", "w", "i", "d"], ["b", "d", "d", "w"]]
const STRIP_MACHINE = (c, x, y) => {                                        // a washer or dryer, round door
  c.rect(x, y, 5, 6, "E"); c.hline(x, y, 5, "L")
  c.rect(x + 1, y + 1, 3, 3, "T"); c.px(x + 2, y + 2, "j"); for (const [dx, dy] of [[1, 1], [3, 1], [1, 3], [3, 3]]) c.px(x + dx, y + dy, "e")
  c.hline(x, y + 5, 5, "e")
}
const STRIP_E = (c) => {
  c.rect(232, 76, 54, 60, "c")
  c.hline(232, 76, 54, "L"); c.hline(232, 77, 54, "e"); c.hline(232, 78, 54, "C")
  c.vline(285, 79, 13, "C")
  STRIP_E_BAYS.forEach((x, i) => { STRIP_WIN(c, x, 80, 8, 10, STRIP_E_KINDS[0][i], 20 + i, 2); STRIP_WIN(c, x, 97, 8, 10, STRIP_E_KINDS[1][i], 30 + i, 2) })
  c.hline(232, 92, 54, "e"); c.hline(232, 93, 54, "e"); c.hline(232, 94, 54, "K")
  c.hline(232, 110, 54, "E"); c.hline(232, 111, 54, "e"); c.hline(232, 112, 54, "C")
  // a window unit in a bay, its drip down the slab
  c.rect(256, 103, 6, 4, "e"); c.hline(256, 103, 6, "E"); c.vline(258, 104, 3, "C"); c.vline(260, 104, 3, "C")
  c.shade([259, 108, 1, 4]); c.shade([259, 112, 1, 2], 1, 0.5)
  // the downpipe at the right edge, its brackets; the blade sign's wall (x 274-283) stays plain
  c.vline(284, 79, 57, "C"); for (const y of [84, 96, 108, 120]) { c.hline(284, y, 2, "K"); c.px(285, y + 1, "R") }
  // rooftop: the stair house, a dish, antennas, an exhaust fan
  c.rect(236, 64, 17, 12, "c"); c.hline(236, 64, 17, "e"); c.hline(236, 65, 17, "C")
  c.rect(240, 69, 4, 7, "K"); c.hline(247, 68, 4, "C"); c.hline(247, 70, 4, "C")
  c.grid(257, 67, `
    ...CCC...
    ..CCCCC..
    .CCCCCCC.
    ..CCCCCK.
    ...CCK...
    ....K....
    ....K....
    ...KKK...
    ..KKKKK..`)
  c.vline(270, 58, 18, "K"); c.hline(268, 61, 5, "K"); c.hline(269, 65, 3, "K")
  c.vline(276, 64, 12, "K"); c.hline(275, 66, 3, "K")
  c.rect(278, 71, 5, 2, "C"); c.rect(279, 73, 3, 3, "C")
  // ---- the laundromat
  STRIP_BOARD(c, 248, 270, 113, 118, "C")
  c.rect(248, 120, 25, 14, "C")
  c.rect(249, 121, 11, 13, "i"); c.rect(261, 121, 11, 13, "i")
  for (const x of [249, 255, 261, 267]) { STRIP_MACHINE(c, x, 121); STRIP_MACHINE(c, x, 128) }
  c.hline(249, 127, 11, "J"); c.hline(261, 127, 11, "J")
  c.rect(248, 134, 25, 2, "C")
  STRIP_DOOR(c, 237, "C")
  // the caged lamp over the door, the wall it lights
  c.light([236, 117, 243, 117, 247, 124, 232, 124])
  c.grid(238, 119, `
    KaaK
    .KK.`)
  c.rect(233, 126, 3, 4, "e"); c.hline(233, 126, 3, "E"); c.vline(234, 130, 6, "C")
  // posters by the vending machine
  c.rect(274, 114, 6, 8, "U"); c.rect(275, 115, 4, 3, "t"); c.hline(275, 119, 3, "m")
  c.rect(277, 118, 6, 6, "m"); c.rect(278, 119, 4, 2, "U"); c.px(282, 123, "c")
  c.grid(275, 127, `
    jjjjjjj
    tTTTTTt
    tiiiiJt
    timUiJt
    tiiiiJt
    tiUmiJt
    tiiiiTt
    tTTTTTt
    tKKKKTt
    tTTTTTt
    tTTTTTt
    TTTTTTT`)
}

// ---------------------------------------------------------------- F: the clinic, painted brick
const STRIP_BRICK = (c, x, y, w, h, s) => {                                 // where the paint flaked off
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const X = x + i, Y = y + j
    const edge = Math.min(i, j, w - 1 - i, h - 1 - j)
    if (edge === 0 && STRIP_H(X * 13 + Y + s) < 0.5) continue
    c.px(X, Y, Y % 2 === 0 ? "R" : ((X + (Y % 4 === 1 ? 0 : 2)) % 4 === 0 ? "R" : "m"))
  }
}
const STRIP_F = (c) => {
  c.rect(286, 92, 34, 44, "r")
  c.hline(286, 92, 34, "M"); c.hline(286, 93, 34, "m"); c.hline(286, 94, 34, "R")
  c.px(304, 91, "E"); c.px(304, 92, "K")                                    // the service drop lands here
  c.vline(305, 93, 13, "K"); c.rect(303, 106, 5, 5, "C"); c.rect(304, 107, 3, 3, "e"); c.px(305, 108, "K")
  // upstairs: the clinic's barred window lit behind blinds; a dark one with a window unit
  c.rect(289, 97, 13, 11, "R"); STRIP_PANE(c, 290, 98, 11, 9, "i", 0)
  for (const x of [291, 294, 297, 300]) c.vline(x, 98, 9, "K")
  c.hline(288, 108, 15, "m")
  c.rect(308, 97, 9, 11, "R"); STRIP_PANE(c, 309, 98, 7, 9, "d", 2); c.hline(307, 108, 11, "m")
  c.rect(310, 104, 5, 3, "e"); c.hline(310, 104, 5, "E"); c.vline(312, 105, 2, "C")
  c.shade([312, 109, 1, 3])
  STRIP_BRICK(c, 314, 120, 6, 9, 1); STRIP_BRICK(c, 316, 97, 4, 6, 2); STRIP_BRICK(c, 286, 99, 3, 5, 3)
  // ---- the clinic
  STRIP_BOARD(c, 290, 316, 112, 117, "R")
  c.rect(288, 119, 16, 13, "R"); c.rect(289, 120, 14, 11, "i")             // frosted, lit inside
  for (const x of [290, 293, 296, 299, 302]) c.vline(x, 120, 11, "K"); c.hline(289, 125, 14, "K"); c.px(292, 128, "M")
  STRIP_DOOR(c, 306, "R")
  c.rect(313, 119, 2, 2, "K"); c.px(312, 120, "E")                          // camera
  c.rect(313, 125, 2, 3, "t"); c.px(313, 126, "z")                          // intercom
  // the clinic's bin by the door, lid shut, a red sticker
  c.grid(313, 129, `
    .JJJJJ.
    TtttttT
    .ttttt.
    .ttMtt.
    .ttttt.
    .ttttt.
    .ttttt.
    .TTTTT.
    .k...k.`)
}

// ---------------------------------------------------------------- the static strip
sprite("_strip_base", { w: 320, h: 100 }, layer("strip", { y: STRIP_DY },
  STRIP_A, STRIP_B, STRIP_C, STRIP_D, STRIP_E, STRIP_F,
  (c) => {
    // splash-back grime at the foot of the walls (not the lot)
    for (let x = 0; x < 320; x++) {
      if (x >= 118 && x < 170) continue
      const h = 2 + (STRIP_H(x * 3 + 1) < 0.45) + (STRIP_H(x * 5 + 2) < 0.15)
      c.shade([x, 136 - h, 1, h])
    }
    for (const p of STRIP_PALMS) {
      const [x0, y0, top, lean] = p, xc = x0 + lean
      STRIP_TRUNK(c, x0, y0, top + 12, lean); STRIP_SKIRT(c, xc, top + 10)
      c.rect(x0 - 4, 132, 8, 4, "c"); c.hline(x0 - 4, 132, 8, "e")          // the planter's curb
    }
    STRIP_RIM(c, 0, 40, 319, 99, (x, y) => x > 8 && x < 48 && y < 58)
    STRIP_MAST(c)
    // cables between the roofs
    c.wire(117, 97, 170, 111, 6, "K"); c.wire(285, 79, 296, 93, 3, "K")
  }))

// ---------------------------------------------------------------- the moving strip
const STRIP_TV = [2, 2, 1, 2, 0, 2, 1, 1, 2, 0]                             // the TV's light, a 10-frame flicker
const STRIP_TUBE_OFF = new Set([3, 4, 11, 19, 20, 21, 26])                  // D's failing tube, a 30-frame stutter
const STRIP_GUST = (f, lag) => Math.sin(2 * Math.PI * (f - lag) / 80) > 0.2 ? 1 : 0   // wind from the left, every 80 frames

anim("strip_row", { w: 320, h: 100, frames: 240, fps: 12 },
  layer("strip", { y: STRIP_DY }, stamp("_strip_base", 0, 40), (c) => {
    const f = c.frame
    if (f % 24 < 4) c.px(34, 40, "p")                                       // the mast's beacon
    // the HVAC fan turning
    for (const [x, y] of f % 2 ? [[23, 53], [25, 55], [23, 55], [25, 53]] : [[24, 53], [24, 55], [23, 54], [25, 54]]) c.px(x, y, "e")
    // A's TV: someone watching in the dark, the room flickering with it
    c.rect(43, 64, 7, 8, ["t", "j", "J"][STRIP_TV[f % 10]]); c.rect(45, 68, 2, 2, "K"); c.rect(44, 70, 4, 2, "K")
    // D's failing tube
    if (STRIP_TUBE_OFF.has(f % 30)) { c.hline(189, 121, 7, "J"); c.recolor({ i: "J" }, [187, 122, 11, 3]) }
    // the spinning dryer: clothes going round its door
    const arms = [[257, 122], [258, 123], [257, 124], [256, 123]]
    c.px(...arms[f % 4], "m"); c.px(...arms[(f + 2) % 4], "U"); c.px(257, 123, "j")
    // the cook flipping at the griddle
    if (f % 8 < 4) { c.px(90, 126, "S"); c.px(91, 125, "e") } else { c.px(90, 127, "S"); c.px(91, 127, "e") }
    // B's upstairs window: dark from frame 30, lit again at 150
    if (f >= 30 && f < 150) {
      c.rect(99, 98, 11, 9, "T"); c.rect(99, 98, 11, 3, "n"); c.rect(99, 98, 2, 9, "C"); c.rect(108, 98, 2, 9, "C")
      c.vline(104, 98, 9, "S"); c.px(102, 99, "v"); c.px(101, 100, "v")
    }
    // the palm crowns, their tips combed right in the gusts, lit on their top and left edges
    for (const p of STRIP_PALMS) {
      const [x0, , top, lean] = p, xc = x0 + lean, g = STRIP_GUST(f, p[5])
      STRIP_CROWN.forEach((row, j) => {
        const r = p[4] ? [...row].reverse().join("") : row
        for (let i = 0; i < r.length; i++) {
          if (r[i] === ".") continue
          const dx = g && j >= 3 && Math.abs(i - 10) >= 7 ? 1 : 0
          c.px(xc - 10 + i + dx, top + j, r[i])
        }
      })
      STRIP_RIM(c, xc - 12, top, xc + 12, top + 13, undefined, "Dd")
    }
  }))

// ---------------------------------------------------------------- test scene
// strip_row where the city stamps it, over stand-ins for the sky, the sidewalk and the road
scene("test_strip", { w: 320, h: 180, bg: "h", world: { horizon: 104, eye: 6, light: [-1, -0.45] } },
  grad(0, 0, 320, 112, "NnvVhH"),
  rect(0, 136, 320, 6, "e"), rect(0, 142, 320, 2, "C"), rect(0, 144, 320, 36, "G"),
  stamp("strip_row", 0, 40))
