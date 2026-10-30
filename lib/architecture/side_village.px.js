// A village of old houses for a platformer at a 16 px grid (lib/profiles/platformer16.px.js), seen from the side,
// drawn to the numbers of Order of Ecclesia's Wygol village and a dusk village's pan (library F5's village study,
// numbers only; never their pixels). The houses are a 3D builder in meters, make3d.old_house (a stone ground floor, a
// half-timbered storey on joist ends, a steep tile roof, a gable or its slope to us, in staggered courses, a chimney),
// drawn side on 10 degrees down and finished by hand over it in the kit's view: the painted door (door_house: 22 x 38
// inside its frame, 1.2 the 32 px figure), windows (window: glazing 10 x 14 in a cross; window_lit, the same lit at
// dusk and at night) and shutters set into the openings the model cuts (the leaf or the frame set back, the jamb lit
// on the right, the lintel's shade, a sill), each storey's windows in the middle of their bays, the ground floor's
// balanced against the door; then the 2D houses' rules (each material's darkest at the house's edge, stains where
// water runs, the chimney's pots). Three of them (house_a, house_b, house_c, 4-5 figures tall); the same three drawn
// by hand of modules as their alternatives (house_a_2d, house_b_2d, house_c_2d: floor_stone, storey_timber, gable or
// roof_eaves, chimney and the shared door and windows; village.house({ ... }) builds another), a village wall
// (wall_village: rubble under a cap, a strip that wraps), and the dusk's backdrop in two planes: the town behind
// (town_far: one flat violet a building, lit windows of 1 x 2; town_near: brighter, their fronts lit warm by the low
// sun, their sides violet), strips that wrap. No line: each material's darkest at its edges (the timber and the
// roofs' feet the darkest things on a front). The light by the time of day as the ground's (lib/nature/side.px.js):
// village.DUSK and village.NIGHT map each day color to its new one (a layer's `swap`); the glass of window_lit lights
// up at dusk and at night, a window's stays dark. For any scene: include("<path>/lib/architecture/side_village.px.js",
// { as: "village" }), its palette its own; make3d.old_house({ ... }) builds another house of the street.
const village = {}
// in a block: its names stay its own when a scene includes the file
{
const DAY = {
  j: "#2e2a2c", g: "#5e5852", G: "#7e766c", H: "#a29888",               // stone: the joints, shade, body, lit
  e: "#2a1c1c", w: "#4e3430", W: "#6e4a3e",                             // timber: dark to lit
  q: "#8e8676", p: "#b8b0a0", P: "#d6d0c2", m: "#7c7c62",               // plaster: shade, body, lit; its stains
  r: "#3a1e1e", R: "#6e3a30", t: "#9a5442", T: "#c07a5a",               // roof tiles: a row's foot, shade, body, lit rim
  y: "#2c2e3c", Y: "#363a4c", z: "#26283a", Z: "#323648",               // glass: lit at dusk (y, Y), always dark (z, Z)
  D: "#4e2e22", E: "#74462e", F: "#9a643e", i: "#22202a", I: "#4a4856", // a door's planks; iron
  n: "#2a3c34", N: "#3e5a4a", O: "#5a7c64",                             // shutters, painted
  k: "#1a2e1c", K: "#2e4a2a", l: "#4e6e34",                             // ivy
}
pal(DAY)
ramps("jgGH", "ewW", "qpP", "rRtT", "DEF", "iI", "nNO", "kKl")
// the dusk (warm where the low sun falls, violet where it doesn't; the near houses darker than the town behind:
// lit V 50-66, shade V 20-35) and the night (cool, V 5-45; the lit glass a warm light)
const TIME = {
  dusk: {
    j: "#1e1426", g: "#3e2838", G: "#5c3a42", H: "#8a5450", e: "#1a1020", w: "#34202c", W: "#523038",
    q: "#663e4a", p: "#7e4a48", P: "#925a4e", m: "#563c48", r: "#1c1228", R: "#2e1c36", t: "#46284a", T: "#6e3c50",
    y: "#ffd27a", Y: "#f6a85a", z: "#1e1830", Z: "#2a2240", D: "#2c1a28", E: "#4a2a34", F: "#6a3c3c", i: "#120c18", I: "#2c2232",
    n: "#1e1c30", N: "#2e2a3e", O: "#46404e", k: "#141424", K: "#22283a", l: "#3a3e3e",
  },
  night: {
    j: "#0c0e18", g: "#1e2234", G: "#2c3248", H: "#424c68", e: "#0a0a12", w: "#161828", W: "#22263a",
    q: "#262c42", p: "#363e58", P: "#4c5674", m: "#22283a", r: "#0a0a14", R: "#141626", t: "#1e2236", T: "#2e3450",
    y: "#ffcc70", Y: "#e8944a", z: "#10121e", Z: "#181c2c", D: "#141420", E: "#1e1e2e", F: "#2a2a3e", i: "#08080e", I: "#1a1a26",
    n: "#10161e", N: "#18222c", O: "#24323a", k: "#08100e", K: "#10201c", l: "#1c3030",
  },
}
const swapOf = (m) => Object.fromEntries(Object.entries(m).map(([k, v]) => [DAY[k], v]))
const DUSK = swapOf(TIME.dusk), NIGHT = swapOf(TIME.night)
// ---------------------------------------------------------------- stone
// Courses of `ch` rows and a joint row; stones 6-14 long, staggered by the course; each lit along its top (its last
// 2 px the body: the light from the upper left), its last row and right column the shade, a fleck of shade now and
// then (not a checker), the joints the darkest. `wrap`: the course closes on itself over w (a strip). `rubble`:
// courses of 4-6 rows, stones 5-12.
const stones = (c, x0, y0, w, h, seed, { rubble = false, wrap = false } = {}) => {
  for (let y = y0, row = 0; y < y0 + h; row++) {
    const ch = rubble ? 4 + Math.floor(hash(row, seed, 1) * 3) : 5, xs = -Math.floor(hash(row, seed, 2) * 8)
    const end = wrap ? xs + w : w
    for (let x = xs, s = 0; x < end; s++) {
      const sw = Math.min(end - x - (wrap ? 1 : 0), (rubble ? 5 : 6) + Math.floor(hash(s, row, seed + 3) * (rubble ? 8 : 9)))
      for (let v = 0; v <= ch; v++) for (let u = 0; u <= sw; u++) {
        const px = x + u, py = y + v, X = wrap ? (px + w) % w : px
        if ((!wrap && (px < 0 || px >= w)) || py >= y0 + h) continue
        const k = v === ch || u === sw ? "j" : v === 0 ? (u < sw - 2 ? "H" : "G") : v === ch - 1 || u === sw - 1 ? "g" : hash(px, py, seed + 4) < 0.1 ? "g" : "G"
        c.px(x0 + X, py, k)
      }
      x += sw + 1
    }
    y += ch + 1
  }
}
// ---------------------------------------------------------------- windows, shutters, the door
// A window 14 x 18: a frame 2 px (timber, or stone in a stone wall), glazing 10 x 12 in a cross of the frame's dark
// (its upper panes a step lighter: the sky in them by day, the lamp's light low at night), a sill 16 wide, 2 rows,
// lit on top. `lit`: the glass that lights up at dusk (y, Y), else the glass that stays dark (z, Z).
const window_ = (c, x, y, lit, stone = false) => {
  const [a, b, d] = stone ? ["H", "G", "j"] : ["W", "w", "e"], [hi, lo] = lit ? ["Y", "y"] : ["Z", "z"]
  for (let v = 0; v < 16; v++) for (let u = 0; u < 14; u++) {
    const edge = u === 0 || u === 13 || v === 0, frame = u < 2 || u > 11 || v < 2 || v > 13
    c.px(x + u, y + v, edge ? d : frame ? (v < 2 || u < 2 ? a : b) : u === 7 || v === 7 ? d : v < 7 ? hi : lo)
  }
  c.rect(x - 1, y + 16, 16, 1, stone ? "H" : "W"); c.rect(x - 1, y + 17, 16, 1, stone ? "j" : "e")
}
// shutters, open, 5 x 16 either side of a window: boards 2 px, a dark edge, a brace across
const shutter = (c, x, y) => { for (let v = 0; v < 16; v++) for (let u = 0; u < 5; u++) c.px(x + u, y + v, u === 0 || u === 4 || v === 0 || v === 15 ? "n" : u === 2 ? "N" : v === 4 + u || v === 11 - u ? "n" : "O") }
// The door, 26 x 42 with its frame: a leaf 22 x 39 under a round head, planks 4 px (a lit streak, the body, its
// grain, a dark seam), two iron straps lit on their top with a bolt of light, a ring; its frame stone voussoirs 2 px
// round the head and jambs, lit on the left; the reveal's shadow a row under the head and a column on its right.
const door_ = (c, x, y) => {
  const inside = (u, v, r) => (v >= 13 ? Math.abs(u - 12.5) <= r : (u - 12.5) ** 2 + (v - 13) ** 2 <= r * r)
  for (let v = 0; v < 42; v++) for (let u = 0; u < 26; u++) {
    if (!inside(u, v, 13)) continue
    if (!inside(u, v, 11)) {   // the frame: stones, the joints radial on the head, every 8 rows on the jambs
      const ang = Math.atan2(v - 13, u - 12.5), joint = v < 13 ? Math.abs(((ang + Math.PI) * 7) / Math.PI % 1 - 0.5) > 0.42 : (v - 13) % 8 === 7
      c.px(x + u, y + v, !inside(u - 1, v, 13) || !inside(u + 1, v, 13) || !inside(u, v - 1, 13) ? "j" : joint ? "j" : u < 13 ? "H" : "G")
      continue
    }
    const p = (u - 2) % 4, strap = v === 12 || v === 13 || v === 31 || v === 32
    c.px(x + u, y + v, !inside(u, v - 1, 11) || !inside(u + 1, v, 11) ? "e" : strap ? (v === 12 || v === 31 ? "I" : "i") : p === 0 ? "D" : p === 1 ? "F" : hash(u, v >> 1, 9) < 0.25 ? "D" : "E")
  }
  for (const v of [12, 31]) for (const u of [5, 13, 20]) c.px(x + u, y + v, "H")
  c.rect(x + 17, y + 22, 3, 1, "i"); c.px(x + 17, y + 23, "i"); c.px(x + 19, y + 23, "i"); c.rect(x + 17, y + 24, 3, 1, "i")
}
// ---------------------------------------------------------------- the modules the houses stamp
sprite("door_house", { w: 26, h: 42, pivot: "bottom" }, (c) => door_(c, 0, 0))
sprite("window", { w: 16, h: 18, pivot: "bottom" }, (c) => window_(c, 1, 0, false))
sprite("window_lit", { w: 16, h: 18, pivot: "bottom" }, (c) => window_(c, 1, 0, true))
sprite("shutters", { w: 26, h: 18, pivot: "bottom" }, (c) => { window_(c, 6, 0, false); shutter(c, 0, 0); shutter(c, 21, 0) })
card("door_house", { is: "a house's door the 32 px hero fits, 26 x 42: planks under a round head, two iron straps, a ring, a frame of stone voussoirs", cells: { "side/16": "✎" } })
card("window", { is: "a window 16 x 18: glazing 10 x 12 in a cross, a frame, a sill; dark at every time (window_lit lights up at dusk and night)", cells: { "side/16": "✎" } })
card("shutters", { is: "a window between two painted shutters, open, 26 x 18", cells: { "side/16": "✎" } })
// ---------------------------------------------------------------- the houses, in 3D and by hand over it
// make3d.old_house: x right, y away from us, z up, its front -y. A stone ground floor 3.2 m tall (ashlar courses, a
// plinth), `storeys` half-timbered storeys of 2.5 m over it jutting `jetty` m on joist ends (posts and plates proud of
// the plaster, a head rail and a sill rail across each window's bay, braces in the bays without one), a steep tile
// roof, `roof` "gable" (its gable to us: plaster, a king post, a collar, a window) or "eaves" (its slope to us, hipped
// at its ends), at `pitch` degrees, past the walls by 0.3 m, its tiles in courses with their joints staggered by half
// a tile (`tile` m wide, `tileCourse` m down the slope); a stone chimney at `chimney` (-1 the left, 1 the right) through it (or
// `chimneys: "no"`), its cap and two pots. Its openings are the painted modules' (door_house, window) cut 0.25 m into
// the wall: on the stone floor the door (`door` < 0 first, > 0 last) and `ground` windows (`shutters` beside them)
// with equal gaps between them; on each storey `windows` windows, each in the middle of a bay between two posts; the
// first `lit` windows' glass the one that lights up at dusk. Sockets: `door` (its threshold), `top` (the ridge's
// middle), `pots` (the chimney's cap).
const frac = (v) => v - Math.floor(v)
const COS10 = Math.cos(Math.PI / 18)
// the painted modules' size in meters at the kit's view (16 px a meter across; 10 degrees down, a px up 1 / (16 cos 10) m)
const OPEN = { door: [26 / 16, 42 / (16 * COS10)], window: [1, 16 / (16 * COS10)] }
// where the openings go: { holes: [x, z (foot), w, h, storey, kind], posts (x), bays (with a window) }, the posts and
// the ground floor's openings on whole px across
const layout = ({ width = 4, storeys = 1, jetty = 0.15, roof = "gable", pitch = 56, door = -1, ground = 1, windows = 2, shutters = "no" } = {}) => {
  const W = width, S = Math.round(storeys), J = S ? jetty : 0, Wt = W + 2 * J, FH = 3.2, SH = 2.5, top = FH + S * SH
  const px = (m) => Math.round(m * 16) / 16, [dw, dh] = OPEN.door, [ww, wh] = OPEN.window, sw = shutters === "yes" ? 6 / 16 : 0
  const row = Array.from({ length: Math.round(ground) }, () => ["window", ww + 2 * sw])
  row.splice(door < 0 ? 0 : door > 0 ? row.length : Math.ceil(row.length / 2), 0, ["door", dw])
  const gap = (W - row.reduce((t, [, w]) => t + w, 0)) / (row.length + 1), holes = []
  let x = -W / 2 + gap
  for (const [kind, w] of row) { const cx = px(x + w / 2); holes.push(kind === "door" ? [cx, 0.22, dw, dh, 0, "door"] : [cx, 1.1, ww, wh, 0, "window"]); x += w + gap }
  const np = Math.max(2, Math.round(Wt / 1.6) + 1), posts = Array.from({ length: np }, (_, i) => px(-Wt / 2 + 0.1 + (i * (Wt - 0.2)) / (np - 1)))
  const n = Math.min(np - 1, Math.round(windows)), bays = Array.from({ length: n }, (_, i) => Math.round(((i + 0.5) * (np - 1)) / n - 0.5))
  for (let s = 1; s <= S; s++) for (const b of bays) holes.push([(posts[b] + posts[b + 1]) / 2, FH + (s - 1) * SH + 0.75, ww, wh, s, "window"])
  const ridge = top + (roof === "gable" ? Wt / 2 : 2 + J) * Math.tan((pitch * Math.PI) / 180)
  if (roof === "gable" && ridge - top > 1.9) holes.push([0, top + 0.35, ww, wh, S + 1, "window"])
  return { holes, posts, bays, W, S, J, Wt, FH, SH, top }
}
make3d.define("old_house", ({ width = 4, depth = 4, storeys = 1, jetty = 0.15, roof = "gable", pitch = 56, chimneys = "yes", chimney = 1, door = -1, ground = 1, windows = 2, shutters = "no", lit = 1, course = 0.38, tile = 0.3125, tileCourse = 0.28 } = {}) => {
  const { holes, posts, bays, W, S, J, Wt, FH, SH, top } = layout({ width, storeys, jetty, roof, pitch, door, ground, windows, shutters })
  const D = roof === "gable" ? depth : 4, Dt = D + 2 * J, E = 0.3, t = 0.2, front = -D / 2, sfront = -Dt / 2
  const R = (pitch * Math.PI) / 180, Sn = Math.sin(R), C = Math.cos(R), T = Math.tan(R), faceOf = (s) => (s ? sfront : front)
  const roundHead = (w, h, y0, y1) => sdf.union(sdf.box([w, y1 - y0, h - w / 2]).at(0, (y0 + y1) / 2, (h - w / 2) / 2), sdf.cylinder(w / 2, y1 - y0).at(0, 0, -(y1 - y0) / 2).rotate(90, "x").at(0, (y0 + y1) / 2, h - w / 2))
  const opening = ([x, z, w, h, s, kind], y0, y1) => (kind === "door" ? roundHead(w, h, y0, y1).at(x, 0, z) : sdf.box([w, y1 - y0, h]).at(x, (y0 + y1) / 2, z + h / 2))
  // the stone floor and its plinth, the openings cut 0.25 into it
  let stone = sdf.union(sdf.box([W, D, FH]).at(0, 0, FH / 2), sdf.box([W + 0.14, D + 0.14, 0.22]).at(0, 0, 0.11))
    .subtract(...holes.filter((h) => !h[4]).map((h) => opening(h, front - 0.2, front + 0.25)))
  // the storeys: plaster, the frame proud of it (plates, posts, a head rail and a sill rail across each window's bay,
  // a brace in each bay without one), joist ends under the jetty
  const plaster = [], timber = [], y = sfront - 0.04, nb = posts.length - 1
  for (let s = 0; s < S; s++) {
    const z0 = FH + s * SH
    plaster.push(sdf.box([Wt, Dt, SH]).at(0, 0, z0 + SH / 2))
    timber.push(sdf.box([Wt + 0.04, 0.12, 0.2]).at(0, y, z0 + 0.1), sdf.box([Wt + 0.04, 0.12, 0.2]).at(0, y, z0 + SH - 0.1))
    posts.forEach((px) => timber.push(sdf.box([0.1875, 0.12, SH]).at(px, y, z0 + SH / 2)))
    for (let i = 0; i < nb; i++) {
      const a = posts[i] + 0.09, b = posts[i + 1] - 0.09, mid = (a + b) / 2
      if (bays.includes(i)) { const zw = z0 + 0.75, wh = OPEN.window[1]; timber.push(sdf.box([b - a, 0.12, 0.16]).at(mid, y, zw + wh + 0.08), sdf.box([b - a, 0.12, 0.12]).at(mid, y, zw - 0.2)); continue }
      const len = Math.hypot(b - a, SH - 0.4), ang = (Math.atan2(SH - 0.4, b - a) * 180) / Math.PI * (mid < 0 ? 1 : -1)
      timber.push(sdf.box([len, 0.1, 0.16]).rotate(ang, "y").at(mid, y, z0 + SH / 2))
    }
  }
  if (S && J > 0) for (let x = -W / 2 + 0.2; x < W / 2; x += 0.45) timber.push(sdf.box([0.15, J + 0.05, 0.15]).at(x, front - J / 2, FH - 0.08))
  let walls = plaster.length ? sdf.union(...plaster).subtract(...holes.filter((h) => h[4] && h[4] <= S).map((h) => opening(h, sfront - 0.2, sfront + 0.18))) : undefined
  // the roof over the top storey (or the stone floor): a shell t thick past the walls by E; a gable: two slopes
  // meeting over the middle along y; eaves: two along x, hipped at the ends
  const half = roof === "gable" ? Wt / 2 : Dt / 2, ridge = top + half * T, hip = Math.max(0, Wt / 2 - half)
  const under = roof === "gable" ? (z) => sdf.intersect(sdf.plane([-Sn, 0, C], z * C), sdf.plane([Sn, 0, C], z * C))
    : (z) => sdf.intersect(sdf.plane([0, -Sn, C], z * C), sdf.plane([0, Sn, C], z * C), sdf.plane([Sn, 0, C], z * C + Sn * hip), sdf.plane([-Sn, 0, C], z * C + Sn * hip))
  const shell = under(ridge + t / C).subtract(under(ridge)).intersect(sdf.box([Wt + 2 * E, Dt + 2 * E, ridge + 1]).at(0, 0, (ridge + 1) / 2)).intersect(sdf.plane([0, 0, -1], -top + 0.05))
  // the tiles: courses `tileCourse` m down the slope, tiles `tile` m across staggered by half a tile each course; each
  // course's foot and each joint between two tiles 1/16 m (a px), the dark of the next course's shadow; its top lit
  const TW = tile, TC = tileCourse
  const tiles = shell.paint((p, nrm) => {
    const along = Math.abs(nrm[0]) > Math.abs(nrm[1]) ? p[1] : p[0], down = (ridge - p[2]) / Sn, row = Math.floor(down / TC), fd = frac(down / TC)
    if (fd > 1 - 0.0625 / TC) return "tile_foot"
    // the joints in a tile's lower part (its sides round off under the course above); none on a gable's slopes, seen
    // edge on: their joints would fall closer than a px
    if (!(roof === "gable" && Math.abs(nrm[1]) < 0.5) && fd > 0.3 && frac((along + (row % 2) * TW / 2) / TW) < 0.0625 / TW) return "tile_foot"
    return fd < 0.08 / TC ? "tile_lit" : "tile"
  })
  // the gable to us: plaster in the triangle, a collar, the king post over its window to the ridge
  const gableWall = roof === "gable" ? sdf.box([Wt, Dt, ridge - top]).at(0, 0, (top + ridge) / 2).intersect(under(ridge)).intersect(sdf.plane([0, 0, -1], -top)) : undefined
  if (gableWall) {
    const gw = holes.find((h) => h[4] === S + 1)
    walls = walls ? walls.union(gableWall) : gableWall
    timber.push(sdf.box([Wt * 0.7, 0.12, 0.16]).at(0, sfront - 0.04, top + 0.18))
    if (gw) { timber.push(sdf.box([0.18, 0.12, ridge - gw[1] - gw[3] - 0.1]).at(0, sfront - 0.04, (ridge + gw[1] + gw[3]) / 2)); walls = walls.subtract(opening(gw, sfront - 0.2, sfront + 0.18)) }
    else timber.push(sdf.box([0.18, 0.12, ridge - top - 0.3]).at(0, sfront - 0.04, (top + ridge) / 2 - 0.15))
  }
  // the windows: glass set back, a sill (the painted window goes over them in the kit's view); shutters
  const win = holes.filter((h) => h[5] === "window"), glass = [], dark = [], frames = [], shut = []
  win.forEach(([x, z, w, h, s], i) => {
    const f = faceOf(s), g = sdf.box([w, 0.04, h]).at(x, f + 0.18, z + h / 2);
    (i < lit ? glass : dark).push(g)
    frames.push(sdf.box([w + 0.12, 0.16, 0.08]).at(x, f - 0.04, z - 0.04))
    if (!s && shutters === "yes") for (const sx of [-1, 1]) shut.push(sdf.box([0.31, 0.05, h]).at(x + sx * (w / 2 + 0.19), f - 0.03, z + h / 2))
  })
  // the door's leaf of planks, set back, two straps of iron
  const [xd, zd, dw, dh] = holes.find((h) => h[5] === "door")
  const leaf = roundHead(dw - 0.25, dh - 0.12, front + 0.16, front + 0.24).at(xd, 0, zd).paint((p) => (frac((p[0] - xd) / 0.25) < 0.26 ? "door_seam" : "door"))
  const straps = sdf.union(sdf.box([dw, 0.04, 0.08]).at(xd, front + 0.14, 0.8), sdf.box([dw, 0.04, 0.08]).at(xd, front + 0.14, 1.9)).mat("iron")
  // the chimney through the roof, past the ridge, its cap and pots
  const cx = chimney * (Wt / 2 - 0.7), cy = roof === "gable" ? 0.6 : -Dt / 4, cz = ridge + (roof === "gable" ? 0.3 : 0.8)
  const chim = chimneys === "yes" ? sdf.union(sdf.box([0.6, 0.6, cz - top]).at(cx, cy, (cz + top) / 2), sdf.box([0.76, 0.76, 0.14]).at(cx, cy, cz), sdf.cylinder(0.1, 0.32).at(cx - 0.14, cy, cz + 0.07), sdf.cylinder(0.1, 0.26).at(cx + 0.14, cy, cz + 0.07)) : undefined
  // the stone's courses (blocks 0.6-0.9 long, staggered by the course) on the floor and the chimney
  const ashlar = (p, nrm) => {
    if (nrm[2] > 0.7) return "stone"
    const u = Math.abs(nrm[0]) > 0.7 ? p[1] : p[0], row = Math.floor(p[2] / course), bl = 0.6 + hash(row, 3, 9) * 0.3
    return frac(p[2] / course) < 0.065 / course || frac((u + row * 0.37) / bl) < 0.065 / bl ? "joint" : "stone"
  }
  stone = (chim ? stone.union(chim) : stone).paint(ashlar)
  const parts = Object.fromEntries(Object.entries({ stone, walls: walls?.mat("plaster"), timber: sdf.union(...timber, ...frames).mat("timber"),
    roof: tiles, glass: glass.length ? sdf.union(...glass).mat("glass") : undefined, dark: dark.length ? sdf.union(...dark).mat("glass_dark") : undefined,
    shutters: shut.length ? sdf.union(...shut).paint((p) => (frac(p[0] / 0.12) < 0.25 ? "shutter_seam" : "shutter")) : undefined, door: leaf, straps }).filter(([, f]) => f))
  return { field: sdf.union(...Object.entries(parts).map(([k, f]) => f.part(k))), parts, sockets: { door: [xd, front - 0.5, 0], top: [0, 0, ridge], ...(chim ? { pots: [cx, cy, cz] } : {}) } }
}, { params: { width: [3, 10], depth: [3, 8], storeys: [0, 2], jetty: [0, 0.6], roof: ["gable", "eaves"], pitch: [40, 65], chimneys: ["yes", "no"], chimney: [-1, 1], door: [-1, 1], ground: [0, 3], windows: [0, 4], shutters: ["no", "yes"], lit: [0, 6], course: [0.25, 0.6], tile: [0.2, 0.6], tileCourse: [0.15, 0.5] } })
// the look in the village's keys: 3 tones a material, the stone's joints, the tiles' joints the darkest; the low sun
// from the left and a little in front
const MATS = { stone: "gGH", joint: "jj", plaster: "qpP", timber: "ewW", tile: "RtT", tile_lit: "tTT", tile_foot: "rr", door: "DEF", door_seam: "DD", iron: "iI", glass: "yY", glass_dark: "zZ", shutter: "nNO", shutter_seam: "nn" }
// the same in hex for the card's draw: `pxl lib draft` turns a builder in a file of its own, whose palette is not this one
const MATS_HEX = Object.fromEntries(Object.entries(MATS).map(([m, ks]) => [m, [...ks].map((k) => DAY[k])]))
const LIGHT = [-0.85, -0.25, 0.5]
// The openings by hand in the kit's view, the painted modules set into the holes the model cuts (Wygol's doors and
// windows, numbers only): the leaf or the frame set back, the jamb on the right (the side the low sun and the view
// show) 2 px of the wall's lit stone or timber, the lintel's shade across the top of the leaf or the frame (2 rows,
// a step down; the first the darkest on a door), the left jamb's shade down its left column; a sill under each window
// 2 px wider than its opening, lit on top; a stone lintel over each window of the stone floor (the door's voussoirs
// its own), a timber head rail over a storey's (the model's); the painted shutters beside them; the chimney's pots.
const STEP = { H: "G", G: "g", g: "j", W: "w", w: "e", F: "E", E: "D", D: "e", I: "i", Y: "y", Z: "z", P: "p", p: "q" }
const openings = (params) => (c, v) => {
  const L = layout(params), front = -(params.roof === "eaves" ? 4 : params.depth ?? 4) / 2, sfront = front - L.J
  const k = (x, y) => c.key(x, y), down = (x, y) => { const s = STEP[k(x, y)]; if (s) c.px(x, y, s) }
  let nwin = 0
  for (const [x, z, w, h, s, kind] of L.holes) {
    const [X0, Y0] = v.screen([x - w / 2, s ? sfront : front, z + h]), X = Math.round(X0), Y = Math.round(Y0)
    if (kind === "door") {
      door_(c, X, Y)
      // the arch's shade over the leaf: its first two rows under the head, the first the darkest
      for (let u = 2; u < 22; u++) for (let vv = 0, n = 0; vv < 42 && n < 2; vv++) if ("DEFIi".includes(k(X + u, Y + vv))) { c.px(X + u, Y + vv, n ? STEP[k(X + u, Y + vv)] ?? "e" : "e"); n++ }
      for (let vv = 13; vv < 41; vv++) { c.px(X + 21, Y + vv, "e"); c.px(X + 22, Y + vv, "H"); c.px(X + 23, Y + vv, "H"); down(X + 2, Y + vv) }
      continue
    }
    const st = !s, lit = nwin++ < (params.lit ?? 1)
    window_(c, X, Y, lit, st)
    for (let u = 0; u < 14; u++) { down(X + u, Y); down(X + u, Y + 1) }
    for (let vv = 2; vv < 16; vv++) down(X, Y + vv)
    c.rect(X + 14, Y, 2, 16, st ? "H" : "W")
    c.rect(X - 1, Y + 16, 18, 1, st ? "H" : "W"); c.rect(X - 1, Y + 17, 18, 1, st ? "j" : "e")
    if (st) { c.rect(X - 2, Y - 3, 20, 1, "H"); c.rect(X - 2, Y - 2, 20, 1, "G"); c.rect(X - 2, Y - 1, 20, 1, "j"); c.rect(X - 3, Y - 3, 1, 2, "j"); c.rect(X + 18, Y - 3, 1, 2, "j") }
    if (st && params.shutters === "yes") { shutter(c, X - 6, Y); shutter(c, X + 17, Y) }
  }
  const pots = params.chimneys === "no" ? undefined : make3d.old_house(params).sockets.pots
  if (pots) for (const dx of [-0.14, 0.14]) { const [px, py] = v.screen([pots[0] + dx, pots[1] - 0.12, pots[2] + (dx > 0 ? 0.3 : 0.36)]).map(Math.round); c.rect(px - 1, py, 2, 3, "t"); c.px(px - 1, py, "T"); c.px(px, py + 2, "R") }
}
// a draft: side on, 10 degrees down, the courses 6 px, the tiles' courses 4 px on an eaves roof (0.25 / sin(pitch + 10)
// m down the slope), the openings by hand over it
const draft = (name, params) => {
  const p = { course: 0.38, tile: 0.3125, tileCourse: 0.25 / Math.sin(((params.pitch + 10) * Math.PI) / 180), ...params }
  return turnaround(name, make3d.old_house(p), { view: { kind: "side", pitch: 10 }, ppm: 16, headings: ["s"], mats: MATS, light: LIGHT, pad: 0, surface: { outline: false, tones: 3, soft: 0.2 }, draw: openings(p) })
}
// The hand pass over a draft, the 2D houses' rules: each material's darkest at the house's edge (no line); the stone's
// blocks lit along their top and left edges; the plaster calm, stained where water runs (down from under a beam and
// down beside a post, 2-6 rows, now and then); the timbers' grain in dashes; the foot a step darker where it meets
// the ground
const EDGE = { H: "j", G: "j", g: "j", P: "q", p: "q", W: "e", w: "e", T: "r", t: "r", R: "r" }
const hand = (foot) => (c) => {
  const k = (x, y) => (x < 0 || y < 0 || x >= c.w || y >= c.h ? "." : c.key(x, y)), set = []
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    const here = k(x, y)
    if (here === ".") continue
    if (EDGE[here] && (k(x - 1, y) === "." || k(x + 1, y) === ".")) { set.push([x, y, EDGE[here]]); continue }
    if (here === "G" && (k(x, y - 1) === "j" || k(x - 1, y) === "j") && k(x, y + 1) !== "j") set.push([x, y, "H"])
    if ("pPq".includes(here) && "ewW".includes(k(x, y - 1)) && hash(x, y, 21) < 0.14) for (let i = 0, n = 2 + Math.floor(hash(x, y, 22) * 5); i < n && "pPq".includes(k(x, y + i)); i++) set.push([x, y + i, i === n - 1 && n > 3 ? "q" : "m"])
    if ("pPq".includes(here) && "ewW".includes(k(x - 1, y)) && "ewW".includes(k(x - 1, y - 3)) && hash(x, y >> 3, 24) < 0.06) for (let i = 0; i < 4 && "pPq".includes(k(x, y + i)); i++) set.push([x, y + i, "m"])
    if (here === "W" && hash(x >> 1, y, 23) < 0.18) set.push([x, y, "w"])
  }
  for (const [x, y, to] of set) c.px(x, y, to)
  for (let y = foot - 1; y <= foot; y++) for (let x = 0; x < c.w; x++) { const s = { H: "G", G: "g", g: "j" }[k(x, y)]; if (s) c.px(x, y, s) }
}
// the three houses of the kit: a gable front 4 m wide with a timber storey (house_a), its slope to us 6 m wide
// (house_b), a stone cottage (house_c)
const HOUSES = {
  house_a: { width: 4, storeys: 1, roof: "gable", pitch: 50, chimney: 1, door: -1, ground: 1, windows: 1, lit: 2 },
  house_b: { width: 6, storeys: 1, roof: "eaves", pitch: 50, chimney: 0.7, door: -1, ground: 1, windows: 3, shutters: "yes", lit: 2 },
  house_c: { width: 4.5, storeys: 0, roof: "eaves", pitch: 50, chimney: -0.7, door: 1, ground: 1, shutters: "yes", lit: 1 },
}
for (const [n, params] of Object.entries(HOUSES)) { const d = draft(`_${n}_3d`, params); sprite(n, { w: d.w, h: d.h, pivot: d.pivot }, stamp(`_${n}_3d_s`, d.pivot[0], d.pivot[1]), hand(d.pivot[1])) }
card("house_a", { is: "an old house, a gable front, drawn in 3D and by hand over it: a stone ground floor with a round-headed plank door and a lit window set in their openings, a half-timbered storey on joist ends with a window in its middle bay, plaster stained under the beams, a steep gable of tiles in courses with their joints, a chimney and its pots", cells: { "side/16": ["✎", "house_a"] } })
card("house_b", { is: "an old house with its roof's slope toward us, drawn in 3D and by hand over it: a stone ground floor (a door, a lit window between painted shutters), a half-timbered storey with three windows each in the middle of its bay and a braced one, tiles in staggered courses, a chimney", cells: { "side/16": ["✎", "house_b"] } })
card("house_c", { is: "a stone cottage under its roof's slope, drawn in 3D and by hand over it: a plank door and a lit window between shutters set in their openings, tiles in staggered courses, a chimney", cells: { "side/16": ["✎", "house_c"] } })
card("make3d.old_house", { is: "an old village house in meters: a stone ground floor, half-timbered storeys on a jetty, a steep tile roof (a gable or eaves) in staggered courses, a chimney, the painted door and windows' openings; any heading or camera", cells: { "side/16": ["✎", "house_a"], "iso/16": "◐", "topdown/16": "◐" },
  tiles: [6, 9], draw: { mats: MATS_HEX, light: LIGHT }, vary: { part: "make3d.old_house({ width, storeys, roof, pitch, door, ground, windows, shutters, chimney, lit }): another house of the street" } })
// ---------------------------------------------------------------- the 2D houses, the hand-drawn alternatives
// house_a_2d, house_b_2d and house_c_2d: the 3D houses' alternatives, drawn by hand of modules, so a
// street can vary without the model: the same door, window and shutters as the 3D ones, their own stone floor,
// timber storey, gable or eaves roof and chimney; village.house({ ... }) builds another of them.
// the stone ground floor, w x 48: courses, a plinth of 2 rows at its foot lit on top, its edges the joints' dark
const floorStone = (c, x0, y0, w, seed) => {
  stones(c, x0, y0, w, 46, seed)
  c.rect(x0, y0 + 46, w, 1, "H"); c.rect(x0, y0 + 47, w, 1, "g")
  c.rect(x0, y0, 1, 48, "j"); c.rect(x0 + w - 1, y0, 1, 48, "j")
}
// plaster: a calm surface, its body p, a grain of single pixels a step up or down (1 in 14); stains of the moss's
// grey-green only where water runs: down from under a beam (the eaves drip) and down beside a timber, 2-9 rows
const plasterAt = (x, y) => { const r = hash(x, y, 15); return r < 0.04 ? "P" : r < 0.07 ? "q" : "p" }
const streak = (c, x, y, n) => { for (let i = 0; i < n; i++) c.px(x, y + i, i === n - 1 && n > 3 ? "q" : "m") }
// the half-timbered storey, w x h: plaster under a shade row from its top plate, stains down beside its posts and
// now and then from under the plate, a splash above its sill; a top plate and a sill beam 3 rows (lit, body, dark)
// with dashes of grain, posts 3 px (lit on the left) at `posts`, braces 3 px at 45 degrees in the panels `braces`
// names ([from post, to post, "/" or "\\"])
const storeyTimber = (c, x0, y0, w, h, posts, braces = []) => {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) c.px(x, y, y === y0 + 3 ? "q" : plasterAt(x, y))
  for (const px of posts) for (const [dx, s] of [[3, 1], [-1, 2]]) if (px + dx >= 0 && px + dx < w && hash(px, s, 16) < 0.7) streak(c, x0 + px + dx, y0 + 4, 3 + Math.floor(hash(px, s, 17) * 7))
  for (let x = x0 + 4; x < x0 + w - 4; x++) if (hash(x, 7, 11) < 0.06) streak(c, x, y0 + 4, 2 + Math.floor(hash(x, 8, 11) * 4))
  for (let x = x0 + 3; x < x0 + w - 3; x++) if (hash(x, 9, 11) < 0.2) c.px(x, y0 + h - 4, "m")
  for (const [a, b, d] of braces) {
    const xa = x0 + posts[a] + 3, xb = x0 + posts[b], n = xb - xa
    for (let i = 0; i < n; i++) {
      const y = d === "/" ? y0 + h - 4 - Math.round((i * (h - 7)) / n) : y0 + 3 + Math.round((i * (h - 7)) / n)
      for (let t = 0; t < 3; t++) c.px(xa + i, y + t - 1, t === 0 ? "W" : t === 1 ? "w" : "e")
    }
  }
  for (const [y, k] of [[0, "W"], [1, "w"], [2, "e"], [h - 3, "W"], [h - 2, "w"], [h - 1, "e"]]) for (let x = x0; x < x0 + w; x++) c.px(x, y0 + y, k === "W" && hash(x >> 1, y, 12) < 0.2 ? "w" : k === "w" && hash(x >> 1, y, 13) < 0.15 ? "e" : k)
  for (const px of posts) for (let y = y0 + 3; y < y0 + h - 3; y++) { c.px(x0 + px, y, "W"); c.px(x0 + px + 1, y, hash(y >> 1, px, 14) < 0.2 ? "e" : "w"); c.px(x0 + px + 2, y, "e") }
}
// the joist ends under a jetty, every 6 px (2 x 2, lit on top), and the shade they cast on the stone, 2 rows
const jetty = (c, x0, y0, w) => {
  c.recolor({ H: "G", G: "g", g: "j" }, [x0 + 2, y0, w - 4, 3])
  for (let x = x0 + 3; x < x0 + w - 3; x += 6) { c.px(x, y0, "W"); c.px(x + 1, y0, "W"); c.px(x, y0 + 1, "e"); c.px(x + 1, y0 + 1, "e") }
}
// a row of round tiles: tiles 6 wide, 4 rows, staggered by 3 a row; each lit along its top (T), its body t, a step
// darker to its right (R), its foot a dark crescent (r), the gap between two the darkest
const tileAt = (x, y, row) => {
  const u = (x + (row % 2) * 3 + 60) % 6, v = y
  return u === 0 ? "r" : v === 0 ? (u < 4 ? "T" : "t") : v === 3 ? (u === 1 || u === 5 ? "r" : "R") : u > 3 ? "R" : "t"
}
// the roof's slope seen from the front, w x h: rows of tiles from its eave (a row lower, overhanging) up to the
// ridge (2 rows of ridge tiles), its ends slanting in at 3 in 2 (a hip), the outermost pixel the darkest
const roofEaves = (c, x0, y0, w, h) => {
  for (let y = 0; y < h; y++) {
    const inset = Math.round(((h - 1 - y) * 2) / 3), row = Math.floor((h - 1 - y) / 4)
    for (let x = inset; x < w - inset; x++) {
      const k = y < 2 ? (y === 0 ? "t" : "R") : x === inset || x === w - inset - 1 ? "r" : tileAt(x, (h - 1 - y) % 4 === 3 ? 0 : 3 - ((h - 1 - y) % 4), row)
      c.px(x0 + x, y0 + y, k)
    }
  }
  c.rect(x0, y0 + h, w, 1, "r")
}
// a gable front over a storey w wide: the gable's wall (plaster, a king post, two struts, a small window high up)
// under a verge of round tiles 5 px wide on both slopes, at 3 in 2, running 4 px past the walls; its apex at
// [cx, y0]. Its height: (w / 2 + 4) * 1.5.
const gable = (c, cx, y0, w, lit) => {
  const half = w / 2 + 4, h = Math.round(half * 1.5)
  for (let y = 0; y < h; y++) {
    const hw = (y * 2) / 3, edgeL = Math.round(cx - hw), edgeR = Math.round(cx + hw)
    // the wall inside the verge
    for (let x = edgeL + 3; x <= edgeR - 3; x++) if (y > 3 && Math.abs(x - cx) < w / 2) c.px(x, y0 + y, plasterAt(x, y))
    // the verge: 5 px of tiles along each slope, a tile every 4 rows down it
    for (let i = 0; i < 5; i++) {
      const tv = y % 4, kl = i === 0 ? "r" : tv === 3 ? (i === 4 ? "e" : "r") : i === 4 ? "e" : tv === 0 ? "T" : i < 3 ? "t" : "R"
      const kr = i === 0 ? "r" : tv === 3 ? (i === 4 ? "e" : "r") : i === 4 ? "e" : tv === 0 ? "t" : "R"
      c.px(edgeL + i - 2, y0 + y, kl); c.px(edgeR - i + 2, y0 + y, kr)
    }
  }
  const base = y0 + h
  for (let y = y0 + 6; y < base; y++) { c.px(cx - 1, y, "W"); c.px(cx, y, "w"); c.px(cx + 1, y, "e") }   // the king post
  streak(c, cx + 2, y0 + 12, 7); streak(c, cx - 2, y0 + 16, 4)
  for (const s of [-1, 1]) for (let i = 0; i < Math.round(w / 4); i++) { const x = cx + s * (2 + i), y = base - 4 - Math.round(i * 0.9); c.px(x, y, "W"); c.px(x, y + 1, "e") }
  window_(c, cx - 7, y0 + Math.round(h * 0.42) - 4, lit)
  for (let x = cx - Math.ceil(w / 2); x < cx + Math.ceil(w / 2); x++) { c.px(x, base - 2, "W"); c.px(x, base - 1, "e") }
}
// a chimney 10 wide from the roof at [x, yRoof] up `up` rows: stone in courses of 4, a cap 12 wide 2 rows, two pots
// of the roof's clay; the shade it casts on the roof, 3 px to its right
const chimney = (c, x, yRoof, up) => {
  c.recolor({ T: "t", t: "R", R: "r" }, [x + 10, yRoof - 2, 3, 12])
  for (let y = yRoof - up; y < yRoof + 2; y++) for (let u = 0; u < 10; u++) {
    const v = (y - (yRoof - up)) % 4, s = Math.floor((y - (yRoof - up)) / 4)
    c.px(x + u, y, u === 0 || u === 9 || v === 3 || (u + s * 3) % 7 === 0 ? (u === 0 ? "g" : "j") : v === 0 ? "H" : "G")
  }
  c.rect(x - 1, yRoof - up - 2, 12, 1, "H"); c.rect(x - 1, yRoof - up - 1, 12, 1, "j")
  for (const px of [2, 6]) { c.rect(x + px, yRoof - up - 5, 2, 3, "t"); c.px(x + px, yRoof - up - 5, "T"); c.px(x + px + 1, yRoof - up - 3, "R") }
}
// ---------------------------------------------------------------- a house of the modules
// house({ w, roof, storey, door, windows, up, shutters, chimney, braces, seed }): w the stone floor's width; roof
// "gable" or "eaves"; storey: the timber storey's posts (x from its left edge; none: a cottage); door: its x on the
// floor; windows: [x, lit] on the floor, `shutters` beside them; up: [x, lit] on the storey; chimney: its x on the
// roof (or none). Gives { w, h, draw }: the sprite's size (the roof 4 px past the walls each side) and its drawing,
// the pivot its foot.
const house = ({ w, roof = "gable", storey, door = 6, windows = [], up = [], shutters = false, chimney: ch, braces = [], seed = 1, gableLit = false }) => {
  const OV = 4, J = storey ? 2 : 0, sw = w + 2 * J, W = sw + 2 * OV, SH = storey ? 40 : 0
  const RH = roof === "gable" ? Math.round((sw / 2 + 4) * 1.5) : 30, TOP = ch !== undefined && roof !== "gable" ? 16 : 0
  const H = TOP + RH + SH + 48
  return { w: W, h: H, draw: (c) => {
    const xf = OV + J, yf = H - 48, ys = yf - SH, yr = ys - RH
    floorStone(c, xf, yf, w, seed)
    c.rect(xf + door, yf + 46, 26, 2, "H"); c.rect(xf + door - 1, yf + 47, 28, 1, "g")   // the step
    door_(c, xf + door, yf + 4)
    for (const [x, lit] of windows) { window_(c, xf + x, yf + 12, lit, true); if (shutters) { shutter(c, xf + x - 6, yf + 12); shutter(c, xf + x + 15, yf + 12) } }
    if (storey) {
      storeyTimber(c, OV, ys, sw, SH, storey, braces)
      for (const [x, lit] of up) window_(c, OV + x, ys + 11, lit)
      jetty(c, xf, yf, w)
    }
    if (roof === "gable") gable(c, W / 2, yr, sw, gableLit)
    else roofEaves(c, 0, yr, W, RH)
    if (ch !== undefined) {
      const yRoof = roof === "gable" ? yr + Math.round(Math.abs(ch + 5 - W / 2) * 1.5) : yr + 8
      chimney(c, ch, yRoof, roof === "gable" ? yRoof - yr - 6 : 22)
    }
  } }
}
const add = (name, spec) => { const h = house(spec); sprite(name, { w: h.w, h: h.h, pivot: "bottom" }, h.draw) }
// house_a_2d: a gable front, 64 wide: the door, a lit window on the stone; two windows in the storey (one lit), a brace
// each side; a lit window in the gable; a chimney on its right slope. 76 x 145.
add("house_a_2d", { w: 64, roof: "gable", storey: [0, 21, 44, 65], door: 6, windows: [[42, true]], up: [[5, false], [52, true]], braces: [[1, 2, "/"]], chimney: 56, seed: 1, gableLit: true })
card("house_a_2d", { is: "the hand-drawn alternative of the 3D house_a: an old house, a gable front, 76 x 145: a stone ground floor with a round-headed plank door and a lit window, a half-timbered storey over it on joist ends, plaster stained under the beams, a steep gable of round tiles, a chimney", cells: { "side/16": "✎" }, vary: { part: "village.house({ w, roof, storey, door, windows, up, shutters, chimney }): the modules in another order" } })
// house_b_2d: the roof's slope toward us, 96 wide: the door, a window with shutters; three windows above, a braced
// panel; a chimney through the roof. 108 x 134.
add("house_b_2d", { w: 96, roof: "eaves", storey: [0, 24, 48, 73, 97], door: 8, windows: [[60, true]], shutters: true, up: [[5, true], [53, false], [78, true]], braces: [[1, 2, "/"], [1, 2, "\\"]], chimney: 78, seed: 2 })
card("house_b_2d", { is: "the hand-drawn alternative of the 3D house_b: an old house with its roof's slope toward us, 108 x 134: a stone ground floor (a door, a lit window between painted shutters), a half-timbered storey with three windows and a braced panel, rows of round tiles, a chimney", cells: { "side/16": "✎" } })
// house_c_2d: a cottage of stone under its roof's slope, 72 wide: the door, a window lit and one dark; a chimney on
// its left. 80 x 94.
add("house_c_2d", { w: 72, roof: "eaves", door: 40, windows: [[8, true]], shutters: true, chimney: 14, seed: 3 })
card("house_c_2d", { is: "the hand-drawn alternative of the 3D house_c: a stone cottage under its roof's slope, 80 x 94: a plank door, a lit window between shutters, a chimney", cells: { "side/16": "✎" } })
// the modules alone, for a sheet and for building by hand
sprite("floor_stone", { w: 64, h: 48, pivot: "bottom" }, (c) => floorStone(c, 0, 0, 64, 4))
sprite("storey_timber", { w: 68, h: 40, pivot: "bottom" }, (c) => storeyTimber(c, 0, 0, 68, 40, [0, 21, 44, 65], [[0, 1, "\\"], [2, 3, "/"]]))
sprite("gable", { w: 76, h: 57, pivot: "bottom" }, (c) => gable(c, 38, 0, 68, false))
sprite("roof_eaves", { w: 104, h: 31, pivot: "bottom" }, (c) => roofEaves(c, 0, 0, 104, 30))
sprite("chimney", { w: 12, h: 26, pivot: "bottom" }, (c) => chimney(c, 1, 24, 19))
card("floor_stone", { is: "the houses' stone ground floor, 64 x 48: ashlar courses of 5 rows, stones 6-14 long lit on their tops, a plinth", cells: { "side/16": "✎" } })
card("storey_timber", { is: "a half-timbered storey, 68 x 40: posts and plates 3 px with grain, braces, plaster in 3 tones stained under the beams", cells: { "side/16": "✎" } })
card("gable", { is: "a gable front, 76 x 57: a verge of round tiles at 3 in 2 over a plaster wall, a king post and struts, a small window", cells: { "side/16": "✎" } })
card("roof_eaves", { is: "a roof's slope seen from the front, 104 x 31: rows of round tiles staggered, each lit on its top, hipped ends, a ridge", cells: { "side/16": "✎" } })
card("chimney", { is: "a stone chimney 12 x 26: courses of 4, a cap, two clay pots", cells: { "side/16": "✎" } })

// ---------------------------------------------------------------- the village wall
// wall_village, 32 x 24, wraps across: rubble in courses of 4-6 rows under a cap of 3 rows (lit on top, its own
// joints every 10-14 px, its foot the dark), ivy hanging from the cap in two places (leaves 2-3 px, the lit on their
// tops, strands 3-12 rows long)
sprite("wall_village", { w: 32, h: 24, wrap: "x", pivot: "bottom" }, (c) => {
  stones(c, 0, 3, 32, 21, 5, { rubble: true, wrap: true })
  for (let x = 0; x < 32; x++) { const jt = x % 13 === 4; c.px(x, 0, jt ? "G" : "H"); c.px(x, 1, jt ? "j" : "G"); c.px(x, 2, "j") }
  for (const [x0, len] of [[3, 12], [6, 7], [9, 4], [21, 9], [24, 5]]) for (let y = 1; y < 1 + len; y++) {
    const x = x0 + (Math.floor(y / 3) % 2)
    c.px(x, y, y % 3 === 0 ? "l" : "K"); if (y % 3 === 1) { c.px(x - 1, y, "k"); c.px(x + 1, y, "K") }
  }
})
card("wall_village", { is: "a village wall of rubble under a cap of stone, 32 x 24, wraps across; ivy hanging from it", cells: { "side/16": "✎" } })

// ---------------------------------------------------------------- the dusk's backdrop: the town behind
// Two planes, the value ladder of a dusk village's pan (numbers only): the sky's light V 75-85 over all; the nearer
// town lit by the low sun brighter than the street's houses (its faces V 60-75, warm, against their V 50-57), its
// sides violet (V 30); the far town darker than both, a flat violet (V 25), one value a building. A medieval
// village: low, houses of one or two storeys under steep roofs with their chimneys, one church and its spire, a mill;
// only a handful of windows lit (a few in the near plane, one or two in the far).
// town_far, 256 x 96, wraps: the far roofs in silhouette, each mass a pixel lighter down its left edge (toward the
// low sun), the church's spire and the mill's sails over them.
// town_near, 256 x 96, wraps: nearer houses 24-40 wide, their fronts lit warm (their left edge the lightest), their
// right sides violet, steep roofs dark with a warm rim on the ridge and the lit slope, chimneys, four windows lit.
// Its own colors (a dusk's).
pal({
  1: "#1c1430", 2: "#2c2044", 3: "#3e2c58", 4: "#e8a050",
  5: "#3e2a52", 6: "#a05048", 7: "#c46a52", 8: "#ffd27a", 9: "#2a1c36",
})
// a house of the skyline at x, w wide, its wall's top at `top`, a roof `roof` tall (a gable: its apex in the middle)
const roofed = (c, x, w, top, roof, H, k) => {
  for (let u = 0; u < w; u++) {
    const ridge = top - Math.max(0, roof - Math.round((Math.abs(u + 0.5 - w / 2) * roof) / (w / 2)))
    for (let y = ridge; y < H; y++) c.px(x + u, y, k(u, y, y < top, y === ridge))
  }
}
const skyFar = (c, W, H) => {
  const k = (u) => (u === 0 ? "3" : "2")
  for (let x = 0, b = 0; x < W; b++) {
    const w = Math.min(W - x, 16 + Math.floor(hash(b, 3, 1) * 14)), top = Math.floor(H * 0.66 + hash(b, 3, 2) * H * 0.12)
    roofed(c, x, w, top, Math.floor(w * 0.55), H, k)
    if (hash(b, 3, 5) < 0.6) { const cx = x + 3 + Math.floor(hash(b, 3, 6) * (w - 7)); c.rect(cx, top - Math.floor(w * 0.3) - 3, 2, 6, "2") }
    x += w
  }
  // the church: a nave's roof, its tower and spire; the mill: a tower on a rise, its four sails
  roofed(c, 150, 30, 56, 14, H, k); for (let y = 30; y < 60; y++) for (let u = 0; u < 9; u++) c.px(170 + u, y, u === 0 ? "3" : "2"); roofed(c, 170, 9, 30, 20, 31, k); c.px(174, 8, "3"); c.px(174, 9, "3")
  c.rect(172, 40, 1, 2, "4")
  for (let y = 46; y < H; y++) { const hw = 4 + Math.floor((y - 46) / 8); for (let u = -hw; u < hw; u++) c.px(60 + u, y, u === -hw ? "3" : "2") }
  roofed(c, 55, 10, 46, 5, 47, k)
  for (let i = -9; i <= 9; i++) { c.px(60 + i, 44 + i, "2"); c.px(60 + i, 44 - i, "2") }
  c.rect(110, 72, 1, 2, "4")
}
const skyNear = (c, W, H) => {
  for (let x = 0, b = 0; x < W; b++) {
    const w = Math.min(W - x, 24 + Math.floor(hash(b, 8, 1) * 17)), top = Math.floor(H * 0.68 + hash(b, 8, 2) * H * 0.1), roof = Math.floor(w * 0.5), side = Math.floor(w * 0.72)
    roofed(c, x, w, top, roof, H, (u, y, isRoof, ridge) => isRoof ? (ridge || (u < w / 2 && y - (top - roof) < 2) ? "6" : "9") : u >= side ? "5" : u === 0 ? "7" : "6")
    if (hash(b, 8, 5) < 0.7) { const cx = x + side - 4; c.rect(cx, top - Math.floor(roof * 0.5) - 4, 3, 9, "9"); c.rect(cx, top - Math.floor(roof * 0.5) - 4, 1, 9, "6") }
    // its windows: dark, but one in a few lit
    for (let wy = top + 6; wy < H - 6; wy += 10) for (let wx = x + 4; wx < x + side - 4; wx += 9) c.rect(wx, wy, 2, 2, hash(wx, wy, 9) < 0.12 ? "8" : "5")
    c.rect(x, top, w, 1, "9")
    x += w + Math.floor(hash(b, 8, 9) * 10)
  }
}
sprite("town_far", { w: 256, h: 96, wrap: "x" }, (c) => skyFar(c, 256, 96))
sprite("town_near", { w: 256, h: 96, wrap: "x" }, (c) => skyNear(c, 256, 96))
card("town_far", { is: "the dusk's far village in silhouettes, 256 x 96, wraps: low roofs with chimneys, one flat violet, a church and its spire, a mill and its sails, their left edges a step lighter, two windows lit", cells: { "side/16": "✎" } })
card("town_near", { is: "the dusk's nearer village, 256 x 96, wraps: low houses with their fronts lit warm by the low sun, their sides violet, dark roofs with a warm rim, chimneys, a few windows lit", cells: { "side/16": "✎" } })
Object.assign(village, { house, stones, layout, DUSK, NIGHT, TIME, MATS, LIGHT })
}
