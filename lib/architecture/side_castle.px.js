// A haunted castle in Dracula's style for a platformer at a 16 px grid (lib/profiles/platformer16.px.js), seen from
// the side, drawn by hand to the numbers of Symphony of the Night's maps (Castle Keep, Clock Tower), the Long
// Library's tiles and Dawn of Sorrow's drawbridge (library F5's castle study, numbers only; never their pixels): a
// curtain wall with its crenellations (curtain: blocks 16 x 8 staggered, each lit along its top and left edge, an
// arrow slit, a string course on corbels under merlons 10 wide and crenels 6, a strip that wraps), a round tower
// (tower: its blocks curving round it, lit on its left third, machicolations, a parapet, a cone of slates and a
// pennant), a gatehouse with a pointed arch and its portcullis half raised (gate, 2 figures tall: iron bars 2 px
// every 6), gothic windows (window_gothic, a lancet: window_gothic_lit lights up at dusk and night), the keep the
// walls guard (make3d.keep; keep, and keep_behind for a layer of its own), gargoyles on their blocks for the
// wall-walk behind the parapet (gargoyle_front, gargoyle_side), a banner with a gold charge and a swallowtail foot, and the night's backdrop: the
// castle on its crag, a tree line and mist at its foot, a few lit windows (castle_far, a strip that wraps). No line: the stone's
// darkest at its edges, the joints near-black at night. Drawn in daylight colors; castle.NIGHT (and castle.DUSK) map
// each to its time's (a layer's `swap`; castle.NIGHT_BEHIND a step darker for a plane further back): at night the
// stone a blue-grey V 10-55 under its moonlit tops, the lit glass warm. For any scene:
// include("<path>/lib/architecture/side_castle.px.js", { as: "castle" }), its palette its own.
const castle = {}
// in a block: its names stay its own when a scene includes the file
{
const DAY = {
  j: "#1e1c24", g: "#464a58", G: "#62677a", H: "#868c9e", h: "#a8aec0",   // stone: joints, shade, body, lit, its lit edges
  r: "#1e1e2c", R: "#2e3044", t: "#424862", T: "#5a627e",                 // slates
  y: "#2c2e3c", Y: "#363a4c", z: "#26283a", Z: "#323648",                 // glass: lit at dusk and night (y, Y); dark (z, Z)
  i: "#18161e", I: "#36343e", J: "#5a5868",                               // iron
  a: "#0e0c14",                                                           // the dark inside a passage
  m: "#3e4a36", M: "#5a6a46",                                             // moss
  n: "#4a1020", N: "#7a1c2c", O: "#a8303a", u: "#a87820", U: "#e0b040",   // the banners' cloth, their gold
}
pal(DAY)
ramps("jgGHh", "rRtT", "iIJ", "nNO", "uU", "mM")
const TIME = {
  dusk: { j: "#1a1222", g: "#3a2638", G: "#56364a", H: "#7a4a54", h: "#a86a5c", r: "#160e1e", R: "#24182e", t: "#36223e", T: "#583248",
    y: "#ffd27a", Y: "#f6a85a", z: "#1e1830", Z: "#2a2240", i: "#100a14", I: "#2a1e2c", J: "#4a3442", a: "#0c0812",
    n: "#3a0e1e", N: "#5e1828", O: "#8a2a34", u: "#8a5a28", U: "#c88a40", m: "#2a2a2e", M: "#3e3a3a" },
  night: { j: "#0a0c16", g: "#1c2234", G: "#283048", H: "#3a4462", h: "#56638a", r: "#08080e", R: "#10121e", t: "#1a1e30", T: "#283050",
    y: "#ffcc70", Y: "#e8944a", z: "#0c0e18", Z: "#141828", i: "#060608", I: "#14141c", J: "#262836", a: "#04040a",
    n: "#1e0810", N: "#3a1220", O: "#561c2a", u: "#4a3c20", U: "#7a6430", m: "#141e1e", M: "#1e2c2a" },
}
const swapOf = (m) => Object.fromEntries(Object.entries(m).map(([k, v]) => [DAY[k], v]))
const DUSK = swapOf(TIME.dusk), NIGHT = swapOf(TIME.night)
// the night a plane further back (the keep behind the curtain): its stone and slates a step darker, the glass as lit
const STEP = { h: "H", H: "G", G: "g", g: "j", T: "t", t: "R", R: "r" }
const NIGHT_BEHIND = swapOf(Object.fromEntries(Object.keys(TIME.night).map((k) => [k, TIME.night[STEP[k] ?? k]])))
// ---------------------------------------------------------------- windows
// A lancet 12 x 26: a pointed head (two arcs of radius 9 from the far sides), a frame of voussoirs 2 px (lit on its
// left, the joints radial), glazing 8 wide in a came down its middle and across every 6 rows, its upper panes a
// step lighter; a sill 14 wide, 2 rows, lit on top. `lit`: the glass that lights up at dusk and night.
const lancet = (c, x, y, lit) => {
  const [hi, lo] = lit ? ["Y", "y"] : ["Z", "z"]
  const inside = (u, v, inset) => { const cx0 = inset, cx1 = 11 - inset, R = 9 - inset; if (v >= 9) return u >= inset && u <= 11 - inset; return (u - (cx1 + inset - 2 + 0.5)) ** 2 + (v - 9) ** 2 <= (R + 1.5) ** 2 && (u - (cx0 - inset + 2 - 0.5)) ** 2 + (v - 9) ** 2 <= (R + 1.5) ** 2 && u >= cx0 && u <= cx1 }
  for (let v = 0; v < 24; v++) for (let u = 0; u < 12; u++) {
    if (!inside(u, v, 0)) continue
    if (!inside(u, v, 2)) { c.px(x + u, y + v, !inside(u - 1, v, 0) || !inside(u + 1, v, 0) || !inside(u, v - 1, 0) ? "j" : (v + (u < 6 ? 0 : 3)) % 5 === 4 ? "j" : u < 6 ? "h" : "G"); continue }
    c.px(x + u, y + v, u === 5 || u === 6 ? (u === 5 ? "j" : "i") : (v - 3) % 6 === 5 ? "j" : v < 12 ? hi : lo)
  }
  c.rect(x - 1, y + 24, 14, 1, "h"); c.rect(x - 1, y + 25, 14, 1, "j")
}
sprite("window_gothic", { w: 14, h: 26, pivot: "bottom" }, (c) => lancet(c, 1, 0, false))
sprite("window_gothic_lit", { w: 14, h: 26, pivot: "bottom" }, (c) => lancet(c, 1, 0, true))
card("window_gothic", { is: "a gothic lancet, 14 x 26: a pointed head of voussoirs, glazing in cames, a sill; dark at every time (window_gothic_lit lights up warm at dusk and night)", cells: { "side/16": "✎" } })
// ---------------------------------------------------------------- the castle in 3D
// make3d.castle: a castle's front in meters (x right, y away from us, z up; its front -y), drawn from any heading
// and camera (turnaround(), draw3d()), so the same model gives this kit's side view and another genre's cell. A
// curtain wall `length` m long, `height` m to its walkway and `thick` m deep, on a plinth stepping out, a string
// course under a parapet whose merlons are `merlon` m wide and `crenel` m apart (real ones: the walkway behind them);
// `towers` round towers (one in the middle, two or more evenly to the ends), `radius` m, `towerHeight` m to their
// parapet, battered at the foot, machicolations under a crenellated parapet, a cone of slates `roof` m tall and a
// pennant, `windows` lancets up their front (the highest one's glass lit at night); a `gatehouse` (or "no") at `gate`
// (-1 the left end, 1 the right) jutting 0.6 m, its pointed arch `gateWidth` m wide in a rebate, the portcullis
// set back in it and half raised, the passage dark behind. The stone in courses that follow the form, painted by
// where a point is on it: courses `course` m (the merlons' half), blocks 1 m on a flat face (one in eight a step
// darker, one in ten lighter), 0.9 m round a tower (so
// they narrow toward its edges as it turns away), quoins at the gatehouse's corners, voussoirs round its arch.
// Sockets: `gate` (the threshold), `top` (the first tower's finial).
const JOINT = 0.065
const frac = (v) => v - Math.floor(v)
// a joint where u (along) and v (up) fall on a course's or a block's edge: courses ch tall, blocks bl long, staggered
const jointAt = (u, v, ch = 0.5, bl = 1) => { const row = Math.floor(v / ch); return frac(v / ch) < JOINT / ch || frac((u + (row % 2) * bl * 0.5) / bl) < JOINT / bl }
// a block's stone: most the plain one, one in eight a step darker, one in ten a step lighter (stones of their own)
const stoneOf = (u, v, ch = 0.5, bl = 1) => { const row = Math.floor(v / ch), h = hash(Math.floor((u + (row % 2) * bl * 0.5) / bl), row, 77); return h < 0.12 ? "stone_d" : h > 0.9 ? "stone_l" : "stone" }
// a pointed arch's opening, w wide, springing at hs, its two arcs of radius R, through y0..y1
const archPrism = (w, hs, R, y0, y1) => {
  const d = y1 - y0, arc = (cx) => sdf.cylinder(R, d).at(0, 0, -d / 2).rotate(90, "x").at(cx, (y0 + y1) / 2, hs)
  return sdf.union(sdf.box([w, d, hs]).at(0, (y0 + y1) / 2, hs / 2), sdf.intersect(arc(w / 2 - R), arc(R - w / 2), sdf.box([w, d, R]).at(0, (y0 + y1) / 2, hs + R / 2)))
}
make3d.define("castle", ({ length = 12, height = 4.5, thick = 1.4, merlon = 0.6, crenel = 0.4, towers = 2, radius = 1.5, towerHeight = 6, roof = 2.6, windows = 2, course = 0.5, gatehouse = "yes", gate = 0, gateWidth = 2.3 } = {}) => {
  const L = length, H = height, T = thick, CH = course, PH = 1.05, P = merlon + crenel, n = Math.round(towers), r = radius, Ht = towerHeight
  const txs = n === 1 ? [0] : Array.from({ length: n }, (_, i) => -L / 2 + (i * L) / Math.max(1, n - 1))
  const gx = gatehouse === "no" ? undefined : gate * Math.max(0, L / 2 - 2.5)
  // the curtain: its body, the plinth, the string course, the parapet and its crenels (the merlons centred on whole
  // meters of x, so a piece of it cut on whole meters wraps)
  const crenels = (z0, y) => sdf.box([crenel, 1, PH]).repeat([P, 0, 0], Math.ceil(L / P / 2) + 2).at(0.5, y, z0 + 0.5 + PH / 2)
  const curtain = sdf.union(sdf.box([L, T, H]).at(0, T / 2, H / 2), sdf.box([L, T + 0.3, 0.6]).at(0, T / 2, 0.3), sdf.box([L, 0.12, 0.14]).at(0, 0, H - 0.07),
    sdf.box([L, 0.4, PH]).at(0, 0.2, H + PH / 2).subtract(crenels(H, 0.2)))
  const tower = (x) => {
    const ring = sdf.cylinder(r + 0.22, PH + 0.35).at(x, 0, Ht - 0.35).subtract(sdf.cylinder(r - 0.1, PH + 1).at(x, 0, Ht))
    const steps = Math.max(3, Math.round((Math.PI * (r + 0.22)) / P))
    const cuts = sdf.union(...Array.from({ length: steps }, (_, k) => sdf.box([crenel, 2 * r + 2, PH]).rotate((180 * (k + 0.5)) / steps, "z").at(x, 0, Ht + 0.5 + PH / 2)))
    return sdf.union(sdf.cylinder(r, Ht).at(x, 0, 0), sdf.cone(r + 0.28, 1.1, r).at(x, 0, 0), ring.subtract(cuts))
  }
  const nw = Math.round(windows), wins = txs.flatMap((x) => Array.from({ length: nw }, (_, i) => [x, 1.6 + i * 2.1, i === nw - 1]))
  const winCut = (x, z) => archPrism(0.5, 0.85, 0.42, -r - 0.5, -r + 0.22).at(x, 0, z)
  // the gatehouse: a block jutting 0.6, higher than the wall, a plinth, a parapet; the arch through it, a rebate round
  // it 0.25 deep, the portcullis 0.45 back, the passage's far end dark
  const GW = 4, GH = H + 0.8, aw = gateWidth, hs = 2.2, R = aw * 0.8
  const house = gx === undefined ? undefined : sdf.union(sdf.box([GW, T + 0.6, GH]).at(gx, (T - 0.6) / 2, GH / 2), sdf.box([GW + 0.3, T + 0.9, 0.6]).at(gx, (T - 0.6) / 2, 0.3),
    sdf.box([GW, 0.4, PH]).at(gx, -0.4, GH + PH / 2).subtract(crenels(GH, -0.4)), sdf.box([GW + 0.08, 0.12, 0.14]).at(gx, -0.62, GH - 0.07))
    .subtract(archPrism(aw, hs, R, -1, T + 1).at(gx, 0, 0), archPrism(aw + 0.5, hs, R + 0.25, -1, -0.35).at(gx, 0, 0))
  let stone = sdf.union(curtain, ...txs.map(tower), ...(house ? [house] : []))
  if (wins.length) stone = stone.subtract(...wins.map(([x, z]) => winCut(x, z)))
  // the courses, by where a point is: round a tower by its arc, on a face by its x (or y on a side), the merlons'
  // smaller, quoins at the gatehouse's corners, voussoirs round its arch
  const joints = (p, nrm) => {
    const [x, y, z] = p
    if (nrm[2] > 0.7) return "stone"
    const t = txs.find((tx) => Math.hypot(x - tx, y) < r + 0.45 && z < Ht + PH + 0.1)
    if (t !== undefined) { const u = Math.atan2(x - t, -y) * Math.hypot(x - t, y), ch = z > Ht ? CH * 0.7 : CH; return jointAt(u, z, ch, 0.9) ? "joint" : stoneOf(u, z, ch, 0.9) }
    const top = gx !== undefined && Math.abs(x - gx) <= GW / 2 + 0.2 ? GH : H, ch = z > top + 0.5 ? CH * 0.55 : CH, u = Math.abs(nrm[0]) > 0.7 ? y : x
    if (gx !== undefined && Math.abs(nrm[1]) > 0.7 && y < -0.3) {
      const dx = x - gx, c = GW / 2 - Math.abs(dx)
      // voussoirs: in the ring round the arch, joints along the radius from the arc's centre
      if (z > hs - 0.1 && c > 0.2) {
        const ax = dx > 0 ? -(R - aw / 2) : R - aw / 2, rr = Math.hypot(dx - ax, z - hs), ang = Math.atan2(z - hs, Math.abs(dx - ax))
        if (rr < R + 0.6 && rr > R - 0.3) return frac((ang * 180) / Math.PI / 11) < 0.09 || Math.abs(rr - (R + 0.55)) < JOINT ? "joint" : "stone"
      }
      // quoins: long and short blocks in turn up the corners
      if (c < 0.9 && c > -0.1) { const row = Math.floor(z / ch); return frac(z / ch) < JOINT / ch || Math.abs(c - (row % 2 ? 0.45 : 0.8)) < JOINT / 2 ? "joint" : "stone" }
    }
    return jointAt(u, z, ch) ? "joint" : stoneOf(u, z, ch)
  }
  stone = stone.paint(joints)
  const roofs = txs.length ? sdf.union(...txs.map((x) => sdf.cone(r + 0.32, roof, 0).at(x, 0, Ht + 0.4))).paint((p) => (frac(p[2] / 0.22) < 0.24 ? "slate_joint" : "slate")) : undefined
  const finials = txs.length ? sdf.union(...txs.map((x) => sdf.cylinder(0.04, 0.8).at(x, 0, Ht + 0.3 + roof))).mat("iron") : undefined
  const pennants = txs.length ? sdf.union(...txs.map((x) => sdf.box([0.5, 0.03, 0.26]).at(x + 0.29, 0, Ht + roof + 0.95))).mat("cloth") : undefined
  const portcullis = gx === undefined ? undefined : sdf.intersect(archPrism(aw - 0.04, hs, R - 0.02, -0.35, -0.2).at(gx, 0, 0), sdf.box([aw, 1, 5]).at(gx, -0.27, 1.25 + 2.5),
    sdf.union(sdf.box([0.09, 0.15, 6]).repeat([0.37, 0, 0], 4).at(gx + 0.02, -0.27, 3), sdf.box([aw + 1, 0.15, 0.09]).repeat([0, 0, 0.5], 6).at(gx, -0.27, 1.55 + 1.5))).mat("iron")
  const glass = wins.length ? sdf.union(...wins.map(([x, z, lit]) => archPrism(0.5, 0.85, 0.42, -r + 0.05, -r + 0.12).at(x, 0, z).mat(lit ? "glass" : "dark"))) : undefined
  const dark = gx === undefined ? undefined : sdf.box([aw + 0.4, 0.1, 4.5]).at(gx, T - 0.1, 2.25).mat("dark")
  const parts = Object.fromEntries(Object.entries({ stone, roofs, finials, pennants, portcullis, glass, dark }).filter(([, f]) => f))
  return { field: sdf.union(...Object.entries(parts).map(([k, f]) => f.part(k))), parts,
    sockets: { ...(gx === undefined ? {} : { gate: [gx, -0.8, 0] }), top: [txs[0] ?? 0, 0, Ht + 0.3 + roof + 0.8] } }
}, { params: { length: [4, 60], height: [3, 9], thick: [0.8, 2.5], merlon: [0.3, 1], crenel: [0.2, 0.8], towers: [0, 8], radius: [0.8, 3], towerHeight: [4, 16], roof: [0, 6], windows: [0, 4], course: [0.3, 1], gatehouse: ["yes", "no"], gate: [-1, 1], gateWidth: [1.5, 3.5] } })
// make3d.keep: the castle's main building, the tower-house its curtain and gate guard (x right, y away from us, z up;
// its middle at the origin, its front -y). A block `width` x `depth` m, `height` m to its walkway, on a plinth;
// buttresses between its `bays`; `storeys` rows of tall lancets on every face (`bays` across the front and back,
// one fewer up each side), some lit (`lit` of them, 0..1, by a seeded draw); a doorway the hero fits at the foot of
// the front's middle bay (a pointed arch in a rebate, dark inside); a parapet on a corbel table, crenellated; a round
// bartizan corbelled out at each corner under a needle spire `spire` m tall; a steep hipped roof of slates at `pitch`
// degrees inside the walkway, a flèche on its ridge. The stone in courses as the castle's. Sockets: `door` (its
// threshold), `top` (the flèche's tip).
make3d.define("keep", ({ width = 8, depth = 5, height = 7, storeys = 2, bays = 3, merlon = 0.6, crenel = 0.4, turret = 0.8, spire = 2.2, pitch = 60, lit = 0.4, course = 0.5 } = {}) => {
  const W = width, D = depth, H = height, CH = course, PH = 1.05, P = merlon + crenel, r = turret, OV = 0.3, fy = -D / 2, nb = Math.round(bays), ns = Math.round(storeys)
  const big = Math.max(W, D) + 4, sh = (H - 1.4) / ns, mid = (nb - 1) / 2
  // the lancets [x or y along the face, z of the foot, face]: 0.7 wide, 2.05 tall; the door's bay skips the lowest
  const along = (n, L) => Array.from({ length: n }, (_, i) => -L / 2 + ((i + 0.5) * L) / n)
  const wins = []
  for (let s = 0; s < ns; s++) {
    const z = 1.4 + s * sh + Math.max(0.15, (sh - 2.05) / 2)
    along(nb, W).forEach((x, i) => { if (s || i !== mid) wins.push([x, z, "front"]); wins.push([x, z, "back"]) })
    along(Math.max(1, nb - 1), D).forEach((y) => { wins.push([y, z, "left"]); wins.push([y, z, "right"]) })
  }
  // a cut (or a pane) through a face: the arch's prism d deep at depth `inset` into the wall
  const onFace = (f, [u, z, face], inset) => face === "front" ? f.at(u, fy + inset, z) : face === "back" ? f.rotate(180).at(u, D / 2 - inset, z) : face === "left" ? f.rotate(-90).at(-W / 2 + inset, u, z) : f.rotate(90).at(W / 2 - inset, u, z)
  const lancet = (y0, y1) => archPrism(0.7, 1.5, 0.56, y0, y1)
  // the body, its plinth, string courses at each storey, buttresses between the bays (front and back, the sides)
  const bx = along(nb - 1, W - W / nb).map((x) => x), by = along(Math.max(1, nb - 2), D - D / Math.max(1, nb - 1))
  let stone = sdf.union(sdf.box([W, D, H]).at(0, 0, H / 2), sdf.box([W + 0.5, D + 0.5, 0.9]).at(0, 0, 0.45),
    ...Array.from({ length: ns - 1 }, (_, s) => sdf.box([W + 0.16, D + 0.16, 0.14]).at(0, 0, 1.4 + (s + 1) * sh)),
    ...(nb > 1 ? bx.map((x) => sdf.box([0.5, D + 0.6, H - 0.9]).at(x, 0, (H - 0.9) / 2)) : []),
    ...(nb > 2 ? by.map((y) => sdf.box([W + 0.6, 0.5, H - 0.9]).at(0, y, (H - 0.9) / 2)) : []))
  // the parapet over its corbels, crenellated on every face
  const ring = (w, d, z0, h) => sdf.box([w, d, h]).at(0, 0, z0 + h / 2).subtract(sdf.box([w - 0.8, d - 0.8, h + 1]).at(0, 0, z0 + h / 2))
  const corbels = sdf.union(sdf.box([0.22, big, 0.45]).repeat([0.5, 0, 0], Math.ceil(big)), sdf.box([big, 0.22, 0.45]).repeat([0, 0.5, 0], Math.ceil(big))).at(0, 0, H - 0.22)
    .intersect(sdf.box([W + 2 * OV, D + 2 * OV, 0.45]).at(0, 0, H - 0.22))
  const crenels = sdf.union(sdf.box([crenel, big, PH]).repeat([P, 0, 0], Math.ceil(big / P)).at(0.5, 0, 0), sdf.box([big, crenel, PH]).repeat([0, P, 0], Math.ceil(big / P)).at(0, 0.5, 0)).at(0, 0, H + 0.5 + PH / 2)
  stone = stone.union(corbels, ring(W + 2 * OV, D + 2 * OV, H, PH).subtract(crenels))
  // the bartizans: round, corbelled out at the corners, their own parapet a band; a needle spire each
  const corners = [-1, 1].flatMap((sx) => [-1, 1].map((sy) => [sx * W / 2, sy * D / 2]))
  stone = stone.union(...corners.map(([x, y]) => sdf.union(sdf.cone(r * 0.45, 0.8, r).at(x, y, H - 1.8), sdf.cylinder(r, PH + 1.3).at(x, y, H - 1), sdf.cylinder(r + 0.1, 0.18).at(x, y, H + PH + 0.12))))
  // the doorway: a pointed arch 1.4 wide in a rebate, dark inside
  const door = [0, 0, "front"]
  stone = stone.subtract(...wins.map((w) => onFace(lancet(-0.5, 0.5), w, 0)), onFace(archPrism(1.4, 1.9, 1.1, -0.6, 0.6), door, 0), onFace(archPrism(1.9, 1.9, 1.35, -0.6, 0.12), door, 0))
  // the courses, by where a point is: round a bartizan by its arc, on a face by its x (or y on a side)
  const joints = (p, nrm) => {
    const [x, y, z] = p
    if (nrm[2] > 0.7) return "stone"
    const t = corners.find(([cx, cy]) => Math.hypot(x - cx, y - cy) < r + 0.15 && z > H - 2.4)
    if (t) { const u = Math.atan2(x - t[0], -(y - t[1])) * r; return jointAt(u, z, CH * 0.7, 0.8) ? "joint" : stoneOf(u, z, CH * 0.7, 0.8) }
    const ch = z > H ? CH * 0.55 : CH, u = Math.abs(nrm[0]) > 0.7 ? y : x
    return jointAt(u, z, ch) ? "joint" : stoneOf(u, z, ch)
  }
  stone = stone.paint(joints)
  // the roof inside the walkway: four slopes (hipped), slates in courses with their joints staggered; the flèche
  const R = (pitch * Math.PI) / 180, Sn = Math.sin(R), C = Math.cos(R), Wr = W - 1.2, Dr = D - 1.2, base = H + 0.2, ridge = base + (Dr / 2) * Math.tan(R), hip = Math.max(0, (Wr - Dr) / 2)
  const roofField = sdf.intersect(sdf.plane([0, -Sn, C], ridge * C), sdf.plane([0, Sn, C], ridge * C), sdf.plane([Sn, 0, C], ridge * C + Sn * hip), sdf.plane([-Sn, 0, C], ridge * C + Sn * hip), sdf.box([Wr, Dr, ridge - base]).at(0, 0, (ridge + base) / 2))
  const slates = (p, nrm) => { const u = Math.abs(nrm[0]) > Math.abs(nrm[1]) ? p[1] : p[0], row = Math.floor(p[2] / 0.22); return frac(p[2] / 0.22) < 0.24 || frac((u + (row % 2) * 0.17) / 0.34) < 0.18 ? "slate_joint" : "slate" }
  const roofs = sdf.union(roofField, ...corners.map(([x, y]) => sdf.cone(r + 0.12, spire, 0).at(x, y, H + PH + 0.2)), sdf.cone(0.4, 1.9, 0).at(0, 0, ridge - 0.3)).paint(slates)
  const finials = sdf.union(...corners.map(([x, y]) => sdf.cylinder(0.04, 0.6).at(x, y, H + PH + 0.1 + spire)), sdf.cylinder(0.04, 0.6).at(0, 0, ridge + 1.5)).mat("iron")
  const glass = sdf.union(...wins.map((w, i) => onFace(lancet(-0.03, 0.03), w, 0.3).mat(hash(i, 7, 48) < lit ? "glass" : "dark")))
  const dark = onFace(sdf.box([1.4, 0.1, 2.6]).at(0, 0, 1.3), door, 0.55).mat("dark")
  const parts = { stone, roofs, finials, glass, dark }
  return { field: sdf.union(...Object.entries(parts).map(([k, f]) => f.part(k))), parts, sockets: { door: [0, fy - 0.3, 0], top: [0, 0, ridge + 2.1] } }
}, { params: { width: [4, 20], depth: [4, 16], height: [4, 20], storeys: [1, 6], bays: [1, 6], merlon: [0.3, 1], crenel: [0.2, 0.8], turret: [0.5, 1.6], spire: [0, 6], pitch: [40, 70], lit: [0, 1], course: [0.3, 1] } })
// the castle's look: the stone in 3 tones and its joints, slates and their courses, glass that lights up at night,
// iron, the dark of a passage, the pennants' cloth; the moon (or the sun) from the upper left and a little in front
const MATS = { stone: "gGH", stone_d: "jgG", stone_l: "GHh", joint: "jj", slate: "RtT", slate_joint: "rr", glass: "yY", dark: "aa", iron: "iIJ", cloth: "nNO" }
// the same in hex for the cards' draw: `pxl lib draft` turns a builder in a file of its own, whose palette is not this one
const MATS_HEX = Object.fromEntries(Object.entries(MATS).map(([m, ks]) => [m, [...ks].map((k) => DAY[k])]))
const LIGHT = [-0.55, -0.45, 0.7], VIEW = { kind: "side", pitch: 10 }
// a draft for the side kit: 10 degrees down, the courses 0.5 m / cos 10 so each is 8 px on the picture
const draft = (name, params, build = make3d.castle, ppm = 16) => turnaround(name, build({ course: 0.5 / Math.cos(Math.PI / 18), ...params }), { view: VIEW, ppm, headings: ["s"], mats: MATS, light: LIGHT, pad: 0, surface: { outline: false, tones: 3, soft: 0.2 } })
// the side kit's pieces, each a draft of the model (side on, 10 degrees down: the merlons' and the walkway's tops
// show as a lit row) and a hand pass over it. The drafts stay live (_curtain_3d_s, _tower_3d_s, _gate_3d_s).
const CURTAIN = draft("_curtain_3d", { length: 4, height: 4, towers: 0, gatehouse: "no" })
const TOWER = draft("_tower_3d", { length: 6, height: 4, towers: 1, towerHeight: 5.2, roof: 2.2, windows: 2, gatehouse: "no" })
const GATE = draft("_gate_3d", { length: 6, height: 4, towers: 0, gate: 0 })
const KEEP = draft("_keep_3d", {}, make3d.keep), KEEP_B = draft("_keep_behind_3d", {}, make3d.keep, 12)
// The hand pass, over a draft: each block's top and left edge a step lighter where the light falls on it (Symphony
// of the Night's blocks: lit along their top and left), the lancets' glass in cames, the foot a step darker where the mass meets the ground (2
// rows, a third row dithered), then the weather, each mark with its cause: `streaks` [x, y, n] a damp run down under
// a ledge (a step darker, n rows, its foot a step darker again), `moss` [x0, x1] along the plinth's top (the moss's
// two greens on the lit and the shaded side), `cracks` [x, y] a block split by a crack (the joint's dark in a
// zigzag of 4, its lit lip under it).
const UP = { g: "G", G: "H", H: "h" }, DOWN = { h: "H", H: "G", G: "g", g: "j" }
const hand = ({ streaks = [], moss = [], cracks = [], foot }) => (c) => {
  const k = (x, y) => (x < 0 || y < 0 || x >= c.w || y >= c.h ? "." : c.key(x, y)), set = []
  for (let y = 1; y < c.h; y++) for (let x = 1; x < c.w; x++) {
    const here = k(x, y)
    if ((here === "G" || here === "H") && (k(x, y - 1) === "j" || k(x - 1, y) === "j") && k(x, y + 1) !== "j") set.push([x, y, UP[here]])
  }
  for (const [x, y, to] of set) c.px(x, y, to)
  // the lancets' glass in cames: down its middle and across every 4 rows (the iron's light, a teal-dark at night)
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    const glass = (xx) => k(xx, y) === "y" || k(xx, y) === "Y"
    if (!glass(x) || glass(x - 1)) continue
    let x1 = x; while (glass(x1 + 1)) x1++
    if (x1 - x >= 3) { c.px((x + x1) >> 1, y, "I"); if (y % 4 === 0) for (let u = x; u <= x1; u++) c.px(u, y, "I") }
  }
  if (foot !== undefined) for (let y = foot - 2; y <= foot; y++) for (let x = 0; x < c.w; x++) { const here = k(x, y); if (DOWN[here] && (y > foot - 2 || (x + y) % 2 === 0)) c.px(x, y, DOWN[here]) }
  for (const [x, y0, n] of streaks) for (let y = y0; y < y0 + n; y++) { const here = k(x, y); if (DOWN[here] && here !== "g") c.px(x, y, y === y0 + n - 1 ? DOWN[DOWN[here]] ?? "j" : DOWN[here]) }
  for (const [x0, x1, y] of moss) for (let x = x0; x < x1; x++) if (hash(x, y, 61) < 0.55) { c.px(x, y, hash(x, y, 62) < 0.5 ? "m" : "M"); if (hash(x, y, 63) < 0.3) c.px(x, y - 1, "m") }
  for (const [x, y] of cracks) for (const [dx, dy] of [[0, 0], [1, 1], [2, 1], [3, 2]]) { c.px(x + dx, y + dy, "j"); if (k(x + dx, y + dy + 1) !== "j") c.px(x + dx, y + dy + 1, "H") }
}
// curtain, 32 wide (2 m of the draft, cut on whole meters: it wraps), 4 m to its walkway: damp streaks under the
// string course, moss on the plinth, a cracked block
const FOOT = (d) => d.pivot[1]
sprite("curtain", { w: 32, h: CURTAIN.h, wrap: "x", pivot: [16, FOOT(CURTAIN)] }, stamp("_curtain_3d_s", 16, FOOT(CURTAIN)),
  hand({ foot: FOOT(CURTAIN), streaks: [[5, FOOT(CURTAIN) - 62, 9], [21, FOOT(CURTAIN) - 62, 6]], moss: [[0, 32, FOOT(CURTAIN) - 9]], cracks: [[24, FOOT(CURTAIN) - 34]] }))
card("curtain", { is: "a castle's curtain wall, 32 wide (wraps across), drawn in 3D and by hand over it: courses of blocks lit on their top and left edges, a plinth, a string course, real merlons over the walkway, damp under the string course, moss at the foot, a cracked block", cells: { "side/16": ["✎", "curtain"] } })
// tower: a round tower in 1.5 m of wall each side (its shadow on the wall to its right), its courses narrowing
// round it, a lancet lit high, one dark low, a cone of slates; damp under its machicolations, moss on its batter
sprite("tower", { w: TOWER.w, h: TOWER.h, pivot: TOWER.pivot }, stamp("_tower_3d_s", TOWER.pivot[0], FOOT(TOWER)),
  hand({ foot: FOOT(TOWER), streaks: [[TOWER.pivot[0] - 14, FOOT(TOWER) - 84, 10], [TOWER.pivot[0] + 6, FOOT(TOWER) - 84, 7], [8, FOOT(TOWER) - 62, 8]], moss: [[TOWER.pivot[0] - 26, TOWER.pivot[0] + 26, FOOT(TOWER) - 15]], cracks: [[TOWER.pivot[0] - 18, FOOT(TOWER) - 40]] }))
card("tower", { is: "a castle's round tower in its wall, drawn in 3D and by hand over it: courses narrowing round it, battered at the foot, machicolations under crenellations, a lit lancet high, a cone of slates and a pennant, its shadow on the wall beside it", cells: { "side/16": ["✎", "tower"] } })
// gate: the gatehouse jutting from 1 m of wall each side: quoins at its corners, voussoirs round its arch, the
// portcullis set back half raised, the passage dark; damp under its string course, moss either side of the arch
sprite("gate", { w: GATE.w, h: GATE.h, pivot: GATE.pivot }, stamp("_gate_3d_s", GATE.pivot[0], FOOT(GATE)),
  hand({ foot: FOOT(GATE), streaks: [[GATE.pivot[0] - 26, FOOT(GATE) - 74, 8], [GATE.pivot[0] + 22, FOOT(GATE) - 74, 11]], moss: [[GATE.pivot[0] - 34, GATE.pivot[0] - 20, FOOT(GATE) - 9], [GATE.pivot[0] + 20, GATE.pivot[0] + 34, FOOT(GATE) - 9]], cracks: [[GATE.pivot[0] + 24, FOOT(GATE) - 30]] }))
card("gate", { is: "a castle's gatehouse in its wall, drawn in 3D and by hand over it: quoins, a pointed arch of voussoirs in a rebate, the portcullis set back half raised, the dark passage, crenellations", cells: { "side/16": ["✎", "gate"] } })
// keep: the tower-house at the playfield's scale (16 px a meter), for the screens inside the curtain where the hero
// walks to its door; keep_behind: the same at 12 px a meter, for a layer of its own behind the curtain at 0.75 the
// playfield's speed (a plane at 3/4 the speed is 4/3 as far off, so 3/4 as big; castle.NIGHT_BEHIND a step darker):
// the curtain hides its lower half. The hand pass as the curtain's: lit block edges, cames in the lit lancets, damp
// down from the corbel table, moss on the plinth, a crack.
const keepHand = (d, ppm) => {
  const y = (z) => Math.round(FOOT(d) - z * ppm * Math.cos(Math.PI / 18)), x = (m) => d.pivot[0] + Math.round(m * ppm)
  return hand({ foot: FOOT(d), streaks: [[x(-2), y(6.55), 8], [x(0.7), y(6.55), 5], [x(3.2), y(6.55), 10], [x(-3.3), y(3.6), 6]], moss: [[x(-4.2), x(4.2), y(0.9)]], cracks: [[x(1.8), y(2.6)]] })
}
sprite("keep", { w: KEEP.w, h: KEEP.h, pivot: KEEP.pivot }, stamp("_keep_3d_s", KEEP.pivot[0], FOOT(KEEP)), keepHand(KEEP, 16))
sprite("keep_behind", { w: KEEP_B.w, h: KEEP_B.h, pivot: KEEP_B.pivot }, stamp("_keep_behind_3d_s", KEEP_B.pivot[0], FOOT(KEEP_B)), keepHand(KEEP_B, 12))
card("keep", { is: "the castle's keep, the tower-house its curtain guards, drawn in 3D and by hand over it: three storeys of lancets (some lit), buttresses, a parapet on a corbel table, round bartizans under needle spires, a steep hipped roof of slates and its flèche, a doorway the hero fits", cells: { "side/16": ["✎", "keep"] } })
card("keep_behind", { is: "the keep at 12 px a meter, for a layer of its own behind the curtain at 0.75 the playfield's speed, its foot hidden by the curtain (castle.NIGHT_BEHIND: a step darker than the wall before it)", cells: { "side/16": ["✎", "keep_behind"] } })
card("make3d.keep", { is: "a castle's keep in meters: a tower-house on a plinth, buttressed bays, rows of lancets on every face, a crenellated parapet on corbels, bartizans with needle spires, a steep hipped roof with a flèche, a doorway; the stone in courses that follow the form", cells: { "side/16": ["✎", "keep"], "iso/16": "◐", "topdown/16": "◐" },
  tiles: [6, 9], draw: { mats: MATS_HEX, light: LIGHT } })
card("make3d.castle", { is: "a castle's front in meters: a curtain wall on a plinth under real crenellations, round towers battered at the foot with machicolations, cones of slates and lancets, a gatehouse with a pointed arch in a rebate and its portcullis set back, the stone in courses that follow the form", cells: { "side/16": ["✎", "curtain"], "iso/16": "◐", "topdown/16": "◐" },
  tiles: [9, 12], draw: { mats: MATS_HEX, light: LIGHT }, vary: { color: "its roles: stone and joint, slate and slate_joint, glass, dark, iron, cloth; castle.NIGHT and castle.DUSK by a layer's swap" } })
// ---------------------------------------------------------------- ornament
// Two gargoyles, drawn by hand as pixel grids over a 3D block-out (capsules and ellipsoids, thin plates for the wings,
// drawn front and side under the moon), to the numbers of four gargoyle references (numbers only): the crouch 2.5
// heads tall, the wings rising a head over it, the arms 1.8 heads straight down, the claws a third of a head over the
// block's edge. 40 px tall with their stone: a statue a little bigger than life (1.75 m crouched), its head 12 px
// wide, its eyes 2 px (y, Y: dark stone by day, glowing at dusk and night). Lit from above, its upper edges the
// stone's lit edge, its own darkest (j) where it turns away. Their block is the parapet's breast (0.5 m, 8 px): on a
// wall-walk, stamp one in a layer between what stands behind the wall and the wall, its pivot 7 px under the crenels'
// sill (the curtain's foot - 65, the gate's - 76): the breast hides its block and feet, the merlons stand before its
// lower body, and it shows above them and through the crenels.
// gargoyle_front, 40 x 42 (mx): on its block, the wings up in a V behind the shoulders (their tips over the head, a
// finger bone down each membrane, the foot scalloped), the head with its horns and pointed ears, the brow low over
// the eyes, the jaws open on four fangs, the arms straight down between the high knees to the claws over the block's
// edge, the hind feet on it; its pivot the block's foot.
sprite("gargoyle_front", { mx: true, pivot: [20, 41] }, `
  ....h...............
  ....hH..............
  ...hgH..............
  ...hgGH.............
  ...hgGgH............
  ...hgGgH.....h......
  ...hggGgH....hH.....
  ..hggGggH.....hH....
  ..hgggGggH.....hH...
  ..hgggGgggH....hhhhh
  ..hggggGgghh..hHHHHH
  ..hggggGgggHHGHHjHHH
  ..hgggggGggHGgHGHjjH
  .hgggggGgggHjGGgYyjH
  .hgggggGggghhHGgggHH
  .hggggGggghHHGgGgHgg
  .hgggggGghHHGGgjhaaa
  .hggggGggHHGGgjjaaaa
  .hgggggGgHGGggjgahaa
  .hggggGgggGGgjjgGGGG
  hgggggGgggHGGgjhHHHg
  hgggghhhhgHGGgjHGGGg
  hggghHHHHGjHGGgGGGgj
  hgghHHGGGGgHGGggggjg
  hggHHGGGGgghGGgjgGGg
  hggHGGGGggjjHGGgjGGG
  jggGGGGgggjjHGGgjgGG
  ..j.jgGGgj.jHGGgjgGg
  ....jGGgj..jHGGgjGGg
  ....jHGgj..jHGGgjgGg
  ....jHGgj..jHGGgjggj
  ...jhHGgj.jhHGGGgjgj
  ..jhHGGgGj.hHGGGGgjj
  ..jHgHgHgj.hGhGhGgjj
  ....jhhhhhhhHhHhHhhh
  ....jHHHHHHHGHGHGHHH
  ....jGGGGGGGgGgGgGGG
  ....jGgGGGGGjGjGjGGG
  ....jGGGGgGGGGGGGGGG
  ....jgGGGGGGGGgGGGGG
  ....jggggggggggggggg
  ....jjjjjjjjjjjjjjjj`)
// gargoyle_side, 40 x 42: in profile on its block, looking right (flip it to look left), crouched to the profile
// reference's numbers: 4.4 heads from the wing's tip to the toes, the back falling at 40 degrees from the shoulders'
// hump to the rump, the arm 2.8 heads straight down, the thigh 1.2 heads down to the knee and the shin 1.4 back along
// the ground, the near wing's wrist 1.35 heads over the skull. Each mass its own shape, a lit rim where it faces the
// moon and a dark edge where it turns away (blocked out in 3D first, then drawn by hand). The near wing raised
// behind the shoulders (its leading bone lit up to the wrist, two finger bones fanning back from it with the
// membrane's fold dark beside each, the trailing edge in scallops between their tips, its longest finger down to
// the block), the far wing a dark sliver beyond its bone; the head a third bigger than the reference's, thrust
// forward on a thick neck (a horn and the far one, the pointed ear back, the brow over a glowing eye, the jaws open
// on their fangs, the lower jaw dropped); the shoulder's hump, the ribs, the chest under the neck; the deltoid round
// over the arm, the arm straight down to the hand flat on the block, its claws over the edge, the far arm beyond; the
// haunch, the shin folded back along the block to the hock, the foot down from it. Its upper half (head, shoulders,
// wing, arm) is what shows over a parapet.
sprite("gargoyle_side", { pivot: [19, 41] }, `
  .....................h..................
  .................hhhHh..................
  ...............hhgggh....G..............
  .............hhggggGh...jg..............
  ............hgggggGjh..jg........h......
  ..........hhggggggGhG.jjg........h..g...
  .........hgggggggGjhGjjg..h.....hG..g...
  ........hggggggggGjhGjjg..hH....hG.gj...
  .......hggggggggGjhG.jg....hg...HGh.....
  .......hgggggggGjghG.jg....hGg.hhhHh....
  ......hggggggggGjghGhHHHHH..hGhHHHHHh...
  .....hggggggggGjghhHGGGGGGGHhGHHGGHHHhh.
  .....hgggggggGGjhHHGGGGGGGGGhGGGGGGjjjHh
  ....HggggggggGjghHGgggghHHGGHGGGGGgYyGHH
  ....HgggggggGjghGGGGjjhHGGggHGGgGGGgGGGg
  ....HggggggGGjgHGGGGGgHGGGjjGGgjgGGGggjj
  ...HgggggggGGjgGGGGGggGGGgjHGgj.hahahah.
  ...HggggggGGjggjgGggggghHGjGgjaaaaaaa...
  ...HggggggGGjghhgggggghGGgGGgjhahaha....
  ..HggggggGGjhhHGGjjjjjHGGgjgjgHGHGGj....
  ..HgggggGjGhHHHGGGGg..HGGjjjjjgggggj....
  ..HgggggGjhHHHGGGGGgj.HGgjggj...........
  ..HggggGj.hGGGGGGGggj.hHGjggj...........
  ..HggggG..HGGGGGhHGgjhHGGjggj...........
  .HggggGj..GGGGGGHGGgjHGGgjggj...........
  .HggggG...GGGGGgGGGGg.GGGjGgj...........
  .HgggGj....ggggggggGGGgjGj.jj...........
  .HggjG.....jgggggggggGgjGj.jj...........
  .Hgj.g..hhHjjjjjjjjggGgjGj.gj...........
  .Hgj....hHGHHHHHHHHGGgjGGGjgj...........
  .Hj.....HGGGGGgGGGggjj..HGgjgj..........
  .Hj.....HGgjjjjjjjjjjj..HGGjgj..........
  .H......HGGhH..ggGGgj...hHGGGGgjgj......
  .H......jgGgGjh.jgjgjj..jGgGgGgGjhj.....
  .g..jhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh.....
  ....jHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH.....
  ....jGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG.....
  ....jGgGGGGGGGGGGGGGGGGGGGGGGGGGGGG.....
  ....jGGGGgGGGGGGGGGGGGGGGGGGGgGGGGG.....
  ....jgGGGGGGGGGGGGGGGGGGGGGGGGGGGgG.....
  ....jgggggggggggggggggggggggggggggg.....
  ....jjjjjjjjjjjjjjjjjjjjjjjjjjjjjjj.....`)
card("gargoyle_front", { is: "a gargoyle from the front on its block, 40 x 42, drawn by hand over a 3D block-out: wings up in a V, horns and ears, eyes that glow at night, open jaws, arms down between the knees, claws over the block's edge; on a wall-walk behind the parapet, its pivot 7 px under the crenels' sill in a layer behind the wall", cells: { "side/16": "✎" } })
card("gargoyle_side", { is: "a gargoyle in profile on its block, 40 x 42, drawn by hand over a 3D block-out: the near wing raised behind with its finger bones and scalloped membrane, the far one beyond, the head thrust forward (horns, a pointed ear, a glowing eye, open jaws), the deltoid, the arm straight down to its claws, the chest, the haunch with the hind leg folded under; on a wall-walk behind the parapet, its pivot 7 px under the crenels' sill in a layer behind the wall", cells: { "side/16": "✎" } })
// a banner, 14 x 36: an iron rod with its knobs, the cloth 10 wide hanging in three folds (lit, body, the dark in the
// folds), a gold border at its top, a gold charge (a cross flory) in its middle, its foot cut in a swallowtail
sprite("banner", { w: 14, h: 36, pivot: [7, 0] }, (c) => {
  c.rect(0, 0, 14, 2, "i"); c.rect(0, 0, 14, 1, "J"); c.px(0, 2, "i"); c.px(13, 2, "i")
  for (let y = 2; y < 36; y++) for (let x = 2; x < 12; x++) {
    const notch = y > 29 && Math.abs(x - 6.5) < y - 29.5 - 0.5 * 0
    if (notch || (y > 30 && Math.abs(x - 6.5) < (y - 30) * 0.9)) continue
    const f = (x - 2) % 4
    c.px(x, y, x === 2 || x === 11 ? "n" : y < 4 ? (y === 2 ? "U" : "u") : f === 0 ? "n" : f === 1 ? "O" : "N")
  }
  for (const [x, y] of [[6, 10], [7, 10], [6, 11], [7, 11], [4, 13], [5, 13], [6, 13], [7, 13], [8, 13], [9, 13], [6, 12], [7, 12], [6, 14], [7, 14], [6, 15], [7, 15], [6, 16], [7, 16], [5, 9], [8, 9], [3, 12], [10, 12], [5, 17], [8, 17]]) c.px(x, y, x === 6 || y === 13 ? "U" : "u")
})
card("banner", { is: "a castle's banner, 14 x 36: red cloth in folds from an iron rod, a gold border and a gold cross, its foot a swallowtail; its pivot the rod's middle", cells: { "side/16": "✎" } })
// ---------------------------------------------------------------- the night's backdrop
// castle_far, 256 x 128, wraps: the castle on its crag far off, then the land and the mist at its foot, the farther
// the lighter (numbers only: Symphony of the Night's far range one mid value in 3 tones, its ridges lit on one side;
// Ecclesia's far land lighter at the horizon, V +10-15; a dusk town's far planes V +8-12 at their foot, toward the
// sky's hue). The castle (V 25, its left edges moonlit V 36, its turned faces V 18) on a crag (a profile): a
// plateau under the walls, the keep on its summit, cliffs falling to rolling land at the strip's sides; spurs down
// it, each crest's left face to the moon (V 25, its rim V 36) and its right face turned away (V 18), more of it lit
// on the left flank; two broken ledges lit on top, dark under. A tree line of pines (6-13 tall, tiered, the moon's
// side a pixel lighter) on the lower slopes and the land, against a first mist; clumps of taller pines nearer, their
// feet in the mist lying lowest. The mist lifts each tone a step along 2 3 4 8 by an ordered dither (bayer: the air
// is its cause), its top rolling, so the near hills (V 20-27) stand dark against it (V 36-45). Windows lit 1 x 2 in
// a few rows; a hamlet's three lights at the right foot. Its own colors (a night's).
pal({ 2: "#141a2e", 3: "#1c2440", 4: "#2e3a5c", 5: "#e8a050", 6: "#ffd27a", 8: "#3a4c74" })
const FAR = [   // [kind, x, w, top]: walls first, then the keep, then the towers before it
  ["wall", 64, 128, 52], ["wall", 150, 40, 48], ["keep", 100, 32, 20],
  ["tower", 60, 12, 42], ["tower", 86, 9, 38], ["tower", 136, 12, 36], ["tower", 160, 8, 40], ["tower", 182, 12, 44],
]
// the crag's top: a plateau under the walls, the keep on its summit, cliffs down to the land at the sides
const CRAG = profile([0, 90, 10, 88, 20, 89, 28, 86, 36, 83, 42, 79, 48, 77, 54, 74, 60, 72, 84, 70, 102, 67, 116, 64,
  134, 64, 150, 66, 170, 69, 190, 71, 198, 74, 206, 78, 214, 81, 222, 85, 232, 87, 244, 89, 256, 90])
// its spurs, one every ~14 px: a crest from the top down, out to its side a little (down-left on the left flank,
// down-right on the right), stepping a pixel aside every 4 rows, each running out after 10-40 rows
const SPURS = Array.from({ length: 16 }, (_, i) => {
  const x0 = 20 + i * 14 + Math.floor(hash(i, 1, 74) * 8)
  return { i, x0, s: ((x0 - 124) / 124) * 0.45 + (hash(i, 2, 74) - 0.5) * 0.2, d0: hash(i, 3, 74) < 0.35 ? 8 : 0, L: 10 + Math.floor(hash(i, 4, 74) * 30) }
})
const crests = (y) => SPURS.flatMap(({ i, x0, s, d0, L }) => {
  const d = y - CRAG(x0) - d0
  if (d <= 0 || d > L) return []
  const xc = x0 + d * s + Math.round((hash(i, Math.floor(d / 4), 75) - 0.5) * 2.5)
  return [xc - 256, xc, xc + 256]
}).sort((a, b) => a - b)
// ledges: two terraces following the top, 9 and 18 rows under it, broken
const ledge = (x, y) => { const d = y - CRAG(x); return (d === 9 || d === 18) && hash(Math.floor(x / 11), d, 76) < 0.55 }
// mist: each tone lifted along 2 3 4 8, a step every `every` rows down from `from` (its top rolling, at most `most`
// steps), by an ordered dither
const TONES = "2348"
const roll = (x) => 2.5 * Math.sin((x / 256) * 6 * Math.PI) + 1.5 * Math.sin((x / 256) * 14 * Math.PI + 1)
const lift = (c, from, every, most) => { for (let y = from - 4; y < 128; y++) for (let x = 0; x < 256; x++) {
  const i = TONES.indexOf(c.key(x, y)), n = Math.min(most, Math.floor((y - from - roll(x)) / every + bayer(x, y)))
  if (i >= 0 && n > 0) c.px(x, y, TONES[Math.min(3, i + n)])
} }
// a pine, its foot's middle at x, foot: tiered (its sides stepping in every third row), the moon's side a pixel lighter
const pine = (c, x, foot, h) => { for (let r = 0; r < h; r++) {
  const hw = Math.floor(r * 0.42) - (r % 3 === 0 && r > 2 ? 1 : 0)
  for (let u = -hw; u <= hw; u++) c.px((x + u + 256) % 256, foot - h + r, u === -hw ? "3" : "2")
} }
sprite("castle_far", { w: 256, h: 128, wrap: "x" }, (c) => {
  // the rock: between two spurs' crests, the face right of the left one turned away (2), the face left of the right
  // one to the moon (3, its rim along the crest 4); more of it lit on the left flank; the top lit where it rises
  for (let y = 0; y < 128; y++) {
    const cr = crests(y)
    for (let x = 0; x < 256; x++) {
      if (y < CRAG(x)) continue
      const b = cr.findIndex((xc) => xc > x), xB = b < 0 ? x + 99 : cr[b], xA = b > 0 ? cr[b - 1] : x - 99
      const t = (x - xA) / (xB - xA)
      c.px(x, y, y === CRAG(x) || ledge(x, y) ? (x < 124 || CRAG(x - 1) >= CRAG(x) ? "4" : "3") : ledge(x, y - 1) ? "2"
        : t < (x < 124 ? 0.25 : 0.7) ? "2" : xB - x < 1.5 ? "4" : "3")
    }
  }
  for (const [kind, x0, w, top] of FAR) {
    const mid = x0 + Math.floor(w / 2), sill = Math.min(...Array.from({ length: w }, (_, u) => CRAG(x0 + u)))
    for (let u = 0; u < w; u++) {
      const merlon = (kind === "wall" || kind === "keep") && u % 4 >= 2 ? 2 : 0
      // lit by the moon on its left: the moonlit edge, the face; a tower turns away into its shade over its right
      // two fifths, the keep shows its right side in shade, a wall stays one face
      const shade = kind === "tower" ? u >= w * 0.6 : kind === "keep" ? u >= w * 0.72 : false
      for (let y = top - merlon; y <= CRAG(x0 + u); y++) c.px(x0 + u, y, u === 0 ? "4" : shade ? "2" : "3")
    }
    // a tower's cone and its spire, symmetric
    if (kind === "tower") {
      const rh = Math.round(w * 1.6), y0 = top - rh
      for (let v = 0; v < rh; v++) { const hw = Math.round(((v + 1) / rh) * (w / 2 + 1)); for (let u = -hw; u < hw; u++) c.px(mid + u, y0 + v, u === -hw ? "4" : u >= hw * 0.2 ? "2" : "3") }
      c.px(mid - 1, y0 - 1, "3"); c.px(mid - 1, y0 - 2, "4"); c.px(mid - 1, y0 - 3, "4")
    }
    // the keep tops them all (make3d.keep's outline): a hipped roof (its ridge 8 wide) and the flèche on it, a
    // bartizan out over each top corner under a needle spire
    if (kind === "keep") {
      const rh = 12, y0 = top - 1 - rh
      for (let v = 0; v < rh; v++) { const hw = 4 + Math.round(((v + 1) / rh) * (w / 2 - 7)); for (let u = -hw; u < hw; u++) c.px(mid + u, y0 + v, u === -hw ? "4" : u >= hw * 0.2 ? "2" : "3") }
      for (let y = y0 - 7; y < y0; y++) c.px(mid - 1, y, y < y0 - 5 ? "4" : "3")
      for (const bx of [x0 - 2, x0 + w - 4]) {
        for (let u = 0; u < 6; u++) for (let y = top - 4; y < top + 6 - Math.abs(u - 2.5); y++) c.px(bx + u, y, u === 0 ? "4" : u >= 4 ? "2" : "3")
        for (let v = 0; v < 10; v++) { const hw = Math.max(1, Math.round(((v + 1) / 10) * 3)); for (let u = -hw; u < hw; u++) c.px(bx + 3 + u, top - 14 + v, u === -hw ? "4" : u >= 0 ? "2" : "3") }
      }
    }
    // windows in rows: every 7 rows down, every 4 across, some lit
    for (let y = top + 5; y < sill - 5; y += 7) for (let x = x0 + 2; x < x0 + w - 2; x += 4) if (hash(x, y, 33) < (kind === "wall" ? 0.12 : 0.35)) c.rect(x, y, 1, 2, hash(x, y, 34) < 0.5 ? "6" : "5")
  }
  // a first mist at the crag's foot, then the tree line against it: pines on the lower slopes and the land (not on
  // the plateau), every 2-4 px, 6-13 tall, the moon's side a pixel lighter; a hamlet's three lights among them; then
  // clumps of taller pines (9-16) nearer, at the near hills' foot, their tops out of the mist lying lowest
  lift(c, 82, 5, 1)
  for (let x = 0, i = 0; x < 256; x += 2 + Math.floor(hash(i, 1, 72) * 3), i++) {
    if (CRAG(x) >= 78) pine(c, x, CRAG(x) + 1 + Math.floor(hash(i, 3, 72) * 6), 6 + Math.floor(hash(i, 2, 72) * 8))
  }
  for (const [x, y] of [[224, 93], [229, 95], [236, 94]]) c.px(x, y, "5")
  for (let k = 0; k < 7; k++) for (let j = 0, n = 3 + Math.floor(hash(k, 1, 77) * 4); j < n; j++) {
    pine(c, Math.floor(k * 37 + hash(k, 2, 77) * 12) + j * 4 + Math.floor(hash(k, j, 78) * 2), 106 + Math.floor(hash(k, j, 79) * 4), 9 + Math.floor(hash(k, j, 80) * 8))
  }
  lift(c, 94, 4, 2)
})
card("castle_far", { is: "the night's backdrop: the castle on its crag far off, 256 x 128, wraps: its keep the highest (a hipped roof, a flèche, bartizans under needle spires), round towers under cones and spires, curtain walls, the left edge of each mass moonlit, windows lit in rows; the crag in buttresses and ledges lit on the moon's side, falling to rolling land; a tree line of pines; mist lying low, lighter the lower, by an ordered dither", cells: { "side/16": "✎" } })
Object.assign(castle, { DUSK, NIGHT, NIGHT_BEHIND, TIME, MATS, LIGHT })
}
