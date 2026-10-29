// Houses: a village cottage as a 3D builder in meters (x right, y away, z up, its front -y), for any scene:
// include("<path>/lib/architecture/houses.px.js", { as: "houses" }). make3d.cottage: walls on a stone plinth,
// framed in timber, a pitched roof with eaves, a door, windows, a chimney; drawn by turnaround() or draw3d() in
// houses.MATS, its materials by role (wall, timber, roof and its courses, door, glass, stone): another roof
// is mats: { ...houses.MATS, ...houses.ROOFS.slate }. Sized to a top-down game's grid at 16 px a meter (a tile a
// meter): the door 1 m wide and 2.3 m tall, so seen from 30 degrees it is a tile wide and two tall (topdown16's
// door box, a little over its 24 px figure: scenes §1, §16).
const houses = {}
// in a block: its names stay its own when a scene includes the file
{
// ---------------------------------------------------------------- the materials, by role (dark to light)
const MATS = {
  wall: ["#6e5a52", "#a8907a", "#d9c5a3", "#f2e6c8"],     // plaster
  timber: ["#2a1a17", "#4b2f24", "#6f4a33", "#8f6545"],   // the frame, the sills, the lintel
  roof: ["#4a1a22", "#7d2a2a", "#b24534", "#d9704a"],     // clay tiles
  courses: ["#4a1a22", "#4a1a22", "#7d2a2a", "#b24534"],  // their lower edges, a step darker
  door: ["#3a2418", "#5c3a24", "#875a34", "#a87a48"],
  glass: ["#1a2440", "#2c4a6e", "#5a8ab0", "#a8d0e8"],
  stone: ["#3a3640", "#5e5866", "#878090", "#b2aab4"],    // the plinth, the step, the chimney
}
// other roofs, the tiles and their courses: mats: { ...houses.MATS, ...houses.ROOFS.slate }
const roofOf = (r) => ({ roof: r, courses: [r[0], r[0], r[1], r[2]] })
const ROOFS = { clay: roofOf(MATS.roof), slate: roofOf(["#1e2433", "#33405a", "#52627e", "#7a8aa6"]), thatch: roofOf(["#4a3418", "#7a5a28", "#a88438", "#d2b45a"]) }
// from above, a little to the left and toward us: the front lit, the roof's slope toward us brighter than the walls
const LIGHT = [-0.5, -0.45, 0.75]

// A cottage: `width` and `depth` m (the walls'), `storeys` 1 to 3 of 2.7 m on a 0.15 m plinth, the roof's `pitch`
// in degrees (its ridge along the width, the eaves front and back), its `eaves` m past the walls all round; the
// door at `door` along the front (-1 the left end, 0 the middle, 1 the right), `windows` a storey across the
// front (those that fit; on the ground floor beside the door), the chimney on the front slope at the `chimney` end (or none).
// The roof's tiles in courses 0.3 m apart down the slope (4 px at 16 px a meter, seen from 30 degrees), each
// course's lower edge a step darker. Sockets: `door` (the threshold, where a figure stands to go in), `chimney`
// (its top, for smoke), `top` (the ridge).
make3d.define("cottage", ({ width = 4.2, depth = 2.8, storeys = 1, pitch = 32, eaves = 0.3, door = 0, windows = 2, chimney = "right" } = {}) => {
  const W = width, D = depth, S = Math.round(storeys), E = eaves, R = (pitch * Math.PI) / 180, T = Math.tan(R), C = Math.cos(R), Sn = Math.sin(R)
  const PL = 0.15, ST = 2.7, top = PL + S * ST, front = -D / 2, ridge = top + (D / 2) * T, t = 0.16
  // under the two slopes meeting over the middle at height z
  const under = (z) => sdf.intersect(sdf.plane([0, -Sn, C], z * C), sdf.plane([0, Sn, C], z * C))
  // the openings in the front wall: [x, z of the middle, w, h]
  const dx = door * (W / 2 - 0.9), holes = [[dx, PL + 1.15, 1, 2.3]]
  for (let s = 0; s < S; s++) {
    // a storey's windows evenly across it, the ground floor's in the slots the door leaves
    const n = Math.round(windows), slots = s ? n : n + 1, xs = Array.from({ length: slots }, (_, i) => -W / 2 + ((i + 0.5) * W) / slots)
    const skip = s ? -1 : xs.reduce((b, x, i) => (Math.abs(x - dx) < Math.abs(xs[b] - dx) ? i : b), 0)
    xs.forEach((x, i) => { if (i !== skip && (s || Math.abs(x - dx) > 1.1)) holes.push([x, PL + s * ST + 1.45, 0.75, 0.85]) })
  }
  const cut = (w, h, x, z) => sdf.box([w, 0.3, h]).at(x, front, z)
  // the walls and the gables under the roof, the openings cut 0.15 m into them
  const walls = sdf.box([W, D, ridge]).at(0, 0, ridge / 2).intersect(under(ridge)).subtract(...holes.map(([x, z, w, h]) => cut(w, h, x, z))).mat("wall")
  // the frame: corner posts, a beam at each storey's top all round, the door's lintel and jambs, the windows'
  // sills and crosses
  const ring = (z) => sdf.box([W + 0.06, D + 0.06, 0.16]).subtract(sdf.box([W - 0.3, D - 0.3, 1])).at(0, 0, z)
  const timber = sdf.union(
    ...[-1, 1].flatMap((sx) => [-1, 1].map((sy) => sdf.box([0.2, 0.2, top - PL]).at((sx * W) / 2, (sy * D) / 2, PL + (top - PL) / 2))),
    ...Array.from({ length: S }, (_, s) => ring(PL + (s + 1) * ST - 0.08)),
    sdf.box([1.3, 0.1, 0.16]).at(dx, front - 0.03, PL + 2.38), ...[-1, 1].map((s) => sdf.box([0.12, 0.1, 2.3]).at(dx + s * 0.56, front - 0.03, PL + 1.15)),
    ...holes.slice(1).flatMap(([x, z, w, h]) => [sdf.box([w + 0.16, 0.16, 0.08]).at(x, front - 0.05, z - h / 2 - 0.04), sdf.box([0.06, 0.06, h]).at(x, front + 0.03, z), sdf.box([w, 0.06, 0.06]).at(x, front + 0.03, z)])).mat("timber")
  const doorLeaf = sdf.box([0.96, 0.06, 2.28]).at(dx, front + 0.12, PL + 1.15).mat("door")
  const glass = holes.length > 1 ? sdf.union(...holes.slice(1).map(([x, z, w, h]) => sdf.box([w, 0.04, h]).at(x, front + 0.1, z))).mat("glass") : undefined
  // the roof: a shell t thick over the slopes, past the walls by the eaves, the tiles' courses down it; a ridge
  const shell = under(ridge + t / C).subtract(under(ridge)).intersect(sdf.box([W + 2 * E, D + 2 * E, ridge + t / C]).at(0, 0, (ridge + t / C) / 2))
  const roof = sdf.union(shell.paint((q) => ((Math.abs(q[1]) / C / 0.3) % 1 > 0.76 ? "courses" : "roof")), sdf.box([W + 2 * E, 0.24, 0.12]).at(0, 0, ridge + t / C).mat("courses"))
  // the plinth, the step before the door, the chimney through the front slope with its cap
  const cx = chimney === "left" ? -W / 2 + 0.7 : W / 2 - 0.7, cy = -Math.min(0.8, D / 4), cz = ridge + t / C + cy * T + 0.75
  const stone = sdf.union(sdf.box([W + 0.12, D + 0.12, PL]).at(0, 0, PL / 2), sdf.box([1.3, 0.36, 0.1]).at(dx, front - 0.12, 0.05),
    ...(chimney === "none" ? [] : [sdf.box([0.5, 0.5, cz - top]).at(cx, cy, (cz + top) / 2), sdf.box([0.64, 0.64, 0.12]).at(cx, cy, cz)])).mat("stone")
  const parts = Object.fromEntries(Object.entries({ walls, timber, door: doorLeaf, windows: glass, roof, stone }).filter(([, f]) => f))
  return { field: sdf.union(...Object.entries(parts).map(([n, f]) => f.part(n))), parts,
    sockets: { door: [dx, front - 0.5, 0], top: [0, 0, ridge + t / C + 0.06], ...(chimney === "none" ? {} : { chimney: [cx, cy, cz + 0.06] }) } }
}, { params: { width: [3, 10], depth: [2.5, 8], storeys: [1, 3], pitch: [20, 60], eaves: [0, 0.8], door: [-1, 1], windows: [0, 4], chimney: ["right", "left", "none"] } })
card("make3d.cottage", { is: "a village cottage: plaster walls framed in timber on a stone plinth, a pitched tile roof with eaves, a door, windows, a chimney", cells: { "topdown/16": "◐" },
  tiles: [4.5, 5], category: "house", draw: { mats: MATS, light: LIGHT }, vary: { color: "its roles: wall, timber, roof and courses, door, glass, stone (mats: { ...houses.MATS, ...houses.ROOFS.slate })" } })
Object.assign(houses, { MATS, ROOFS, LIGHT })
}
