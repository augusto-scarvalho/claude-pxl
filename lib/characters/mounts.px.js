// A 3D mount and mounted-rider system for HD-2D figures (extending lib/characters/kit.px.js):
// quadruped mounts sculpted in 3D distance fields, animated across 8 compass directions, and paired
// with any kit.character() rider in BOTH composition modes:
//   1. Baked combined 3D (`mounts.mounted(name, riderSpec, mountSpec)`): mount + seated rider rendered
//      in a single 3D surface() pass with continuous outer ink, exact 3D occlusion, shared normals, and
//      combined sockets — ideal for bosses, enemy cavalry, previews, and ground-truth reference.
//   2. Modular 3D depth-clipped layers (`mounts.mount(...)` + `mounts.rider(...)` + optional `front: true`):
//      standalone animated mounts (also usable unmounted/tethered) exporting per-frame `saddle`, `reins`,
//      `head_top`, `center`, and `chest` sockets, paired with seated rider sheets whose occluded limbs and
//      garments are 3D depth-clipped against the mount's barrel/neck volume so any race × class × mount
//      composites cleanly at runtime.
//
// Taken with include("<path>/lib/characters/mounts.px.js", { as: "mounts", palette: true });
//   mounts.mount("bay_horse", { species: "horse", coat: "bay", moves: ["stand", "idle", "walk", "charge"] })
//   mounts.mount("destrier", { species: "warhorse", coat: "black", colors: { caparison: "crimson", trim: "mustard" } })
//   mounts.mount("chestnut_pony", { species: "pony", coat: "chestnut", mane: "flaxen" })
//   mounts.mounted("knight_cav", { outfit: "knight", headwear: "helmet", held: "spear", off: "tallshield" }, { species: "warhorse", coat: "dapple" })
//   mounts.rider("rider_layer", { outfit: "ranger", off: "bow", back: "quiver" }, { species: "horse", align: "saddle" })
//   mounts.export("bay_horse", { species: "horse", coat: "bay" }, { layout: "atlas", dirs: "8", moves: "all", format: "grid" })

include("kit.px.js", { as: "kit", palette: true })
const mounts = {}
{
const K = kit._internal
const T = K.T, TB = K.TB, RAD = Math.PI / 180, UP = [0, 0, 1]
const PITCH_DEG = 20, PITCH = PITCH_DEG * RAD, SP = Math.sin(PITCH), CP = Math.cos(PITCH)
const VIEW = { kind: "side", pitch: PITCH_DEG }
const CAM_DIR = [0, -CP, SP]
const LIGHT = T.FIG.light ?? [0, -0.6, 0.75]
const LIT_SURF = { soft: 0.55 }
const INK = "k"
const HALF = (() => {
  const L = LIGHT, l = Math.hypot(L[0], L[1], L[2]) || 1
  const v = [L[0] / l, L[1] / l - CP, L[2] / l + SP], lv = Math.hypot(v[0], v[1], v[2]) || 1
  return [v[0] / lv, v[1] / lv, v[2] / lv]
})()

// ---------------------------------------------------------------- collision-free mount palette keys
// Dedicated single-character keys (Cyrillic uppercase + Latin Extended-A) with zero overlap against
// kit.px.js, crew.px.js, and traveler.px.js so combined baked renders swap rider & mount independently.
pal({
  А: "#381c12", Е: "#63331e", Ж: "#945231", З: "#bd784d",         // coat (bay default)
  И: "#221410", Й: "#3c231a", К: "#5c392a", Л: "#845741",         // coat2 (points/muzzle/belly/dapple)
  М: "#171110", Н: "#2d211d", О: "#4a3730", П: "#6f554b",         // mane & tail
  Р: "#1c1a1e", С: "#39363d", Т: "#5e5a63",                       // hooves
  У: "#2a160c", Ф: "#4d2a16", Х: "#784624", Ц: "#a46a3c",         // saddle & leather tack
  Ч: "#48141c", Ш: "#74202b", Щ: "#a6323e", Ъ: "#d4585c",         // blanket / caparison primary cloth
  Ы: "#826218", Ь: "#be9428", Э: "#ecd064",                       // blanket / caparison trim
  Ю: "#191d2b", Я: "#394153", Ё: "#68717e", Є: "#a8acad", І: "#f3f1e9", // barding metal (5-tone + glint)
  Ї: "#3e4250", Ґ: "#7a8190", Ā: "#ced3de",                       // buckles, stirrups, bit rings
  ā: "#161214", ă: "#f6f2e8",                                     // eye dark + catchlight (or emit)
  ą: "#f4f2ea", ć: "#c4ccd8", ę: "#9e2c34",                       // fixed unswapped fang/flash white, smear silver, inner mouth crimson
  Đ: "#401e2e", đ: "#6e364c", Ē: "#9e5670", ē: "#cc7e98",         // draught animal coat (unique RGBA, never collides with wagon coat!)
  Ĕ: "#28141e", ĕ: "#462434", Ė: "#68384e", ė: "#90546e",         // draught animal coat2 (unique RGBA!)
})
const MKEYS = {
  coat: "АЕЖЗ", coat2: "ИЙКЛ", mane: "МНОП", hooves: "РСТ",
  saddle: "УФХЦ", blanket: "ЧШЩЪ", trim: "ЫЬЭ", barding: "ЮЯЁЄІ", metal: "ЇҐĀ", eye: "āă",
  dcoat: "ĐđĒē", dcoat2: "ĔĕĖė",
}
const MOUNT_LIGHTER = {
  ...K.LIGHTER,
  ...Object.fromEntries(Object.values(MKEYS).map((r) => (r.length === 5 ? r.slice(0, 4) : r)).flatMap((r) => [...r].slice(0, -1).map((k, i) => [k, r[i + 1]]))),
}

// ---------------------------------------------------------------- coat, mane & material presets
const COATS = {
  bay:      { coat: ["#381c12", "#63331e", "#945231", "#bd784d"], coat2: ["#1d120e", "#342018", "#503226", "#744b38"], mane: "black",    hooves: "dark",  points: "stockings" },
  darkbay:  { coat: ["#25140e", "#442419", "#6a3b28", "#91573d"], coat2: ["#17100e", "#2b1c17", "#442d24", "#644538"], mane: "black",    hooves: "dark",  points: "stockings" },
  chestnut: { coat: ["#451d10", "#76361c", "#ab552c", "#d67c46"], coat2: ["#5a2c18", "#8e4a28", "#c27040", "#e69c68"], mane: "chestnut", hooves: "brown", points: "blaze" },
  sorrel:   { coat: ["#522814", "#8a4822", "#c06e38", "#e69b5e"], coat2: ["#704224", "#a4683a", "#d49660", "#f0c28e"], mane: "flaxen",   hooves: "brown", points: "blaze" },
  black:    { coat: ["#151319", "#282530", "#413d4c", "#625d70"], coat2: ["#110f14", "#201e27", "#363340", "#545062"], mane: "black",    hooves: "dark",  points: "blaze" },
  white:    { coat: ["#6c6e78", "#9ca0ac", "#cdd2dc", "#f0f2f6"], coat2: ["#565964", "#848894", "#b4b9c4", "#dce0e8"], mane: "white",    hooves: "pale",  points: "muzzle" },
  dapple:   { coat: ["#4b4e5a", "#757a88", "#a4aab8", "#d4d8e2"], coat2: ["#2f323c", "#505564", "#7b8192", "#aeb4c4"], mane: "grey",     hooves: "dark",  points: "dapple" },
  palomino: { coat: ["#5c3a16", "#946428", "#c89242", "#ecc06a"], coat2: ["#7a5426", "#b08242", "#dcb06c", "#f4d89e"], mane: "flaxen",   hooves: "pale",  points: "blaze" },
  buckskin: { coat: ["#4e3418", "#825a2c", "#b68648", "#deb26e"], coat2: ["#201712", "#3a291e", "#5a4230", "#82644a"], mane: "black",    hooves: "dark",  points: "stockings" },
  dun:      { coat: ["#4a3824", "#785d40", "#a68662", "#ceae88"], coat2: ["#2c2016", "#4c3826", "#72563c", "#9a7a5a"], mane: "brown",    hooves: "dark",  points: "stockings" },
  roan:     { coat: ["#482624", "#784440", "#a86c66", "#d29890"], coat2: ["#321818", "#562c2a", "#7e4644", "#a86a66"], mane: "chestnut", hooves: "dark",  points: "stockings" },
  piebald:  { coat: ["#1c1a22", "#34313e", "#524e60", "#767286"], coat2: ["#787a84", "#aaacb6", "#d6d8e0", "#f2f3f7"], mane: "black",    hooves: "pale",  points: "pinto" },
  // Phase 2 coats: skeletal bone, war bull hides, clockwork chassis metals, direwolf pelts & wagon timbers
  ivory:      { coat: ["#5e5448", "#948876", "#ccc0aa", "#f2ead8"], coat2: ["#1a1718", "#2d282a", "#4a4345", "#706668"], mane: "ghost",  hooves: "dark",  points: "bone" },
  aged:       { coat: ["#4e3e2c", "#7e684c", "#b29a76", "#dcd0b2"], coat2: ["#1c1612", "#32271e", "#524132", "#786048"], mane: "bone",   hooves: "dark",  points: "bone" },
  ashen:      { coat: ["#3c3c44", "#646470", "#9496a2", "#c6c8d2"], coat2: ["#16161c", "#282832", "#424452", "#666878"], mane: "ghost",  hooves: "dark",  points: "bone" },
  aurochs:    { coat: ["#2c1810", "#502c1c", "#7a462e", "#a46444"], coat2: ["#140d0b", "#261a16", "#3d2b24", "#5c4338"], mane: "black",  hooves: "dark",  points: "shaggy" },
  brindle:    { coat: ["#1e2028", "#343844", "#525868", "#767e90"], coat2: ["#121318", "#22242d", "#373a48", "#565a6c"], mane: "black",  hooves: "dark",  points: "shaggy" },
  ochre:      { coat: ["#4c2c12", "#824e22", "#b87638", "#e0a25c"], coat2: ["#2c180c", "#4e2d16", "#784824", "#a46a3a"], mane: "dark",   hooves: "dark",  points: "shaggy" },
  porcelain:  { coat: ["#5e5244", "#988874", "#cfc0aa", "#efe6d4"], coat2: ["#1c1410", "#34261d", "#543e30", "#7c5f4b"], mane: "brown",  hooves: "dark",  points: "plated" },
  brass:      { coat: ["#34210c", "#6c4818", "#ae7c2e", "#e2b85c"], coat2: ["#181a22", "#2e3240", "#4f5566", "#7c8496"], mane: "black",  hooves: "dark",  points: "plated" },
  steel_auto: { coat: ["#1e2432", "#3e485c", "#6e788a", "#aab2be"], coat2: ["#34210c", "#6c4818", "#ae7c2e", "#e2b85c"], mane: "grey",   hooves: "dark",  points: "plated" },
  copper:     { coat: ["#3c1c12", "#783822", "#b85c3a", "#e48c62"], coat2: ["#1c2026", "#343b44", "#56606c", "#828e9c"], mane: "dark",   hooves: "dark",  points: "plated" },
  timber:     { coat: ["#2d2e36", "#50525e", "#7d808f", "#b0b4c4"], coat2: ["#66605a", "#9c948a", "#d0c8bc", "#f2ece2"], mane: "grey",   hooves: "dark",  points: "wolf" },
  dire_black: { coat: ["#14141a", "#262630", "#40404e", "#626274"], coat2: ["#2a2a32", "#484854", "#707080", "#9ea0b0"], mane: "black",  hooves: "dark",  points: "wolf" },
  winter:     { coat: ["#5e6474", "#8e96a8", "#c2cad8", "#ecf0f6"], coat2: ["#787e8c", "#a8b0be", "#d4dae4", "#f4f6fa"], mane: "white",  hooves: "pale",  points: "wolf" },
  russet:     { coat: ["#381c14", "#663624", "#98563c", "#c87e60"], coat2: ["#604c38", "#947a5e", "#c6ac8c", "#ead6b8"], mane: "brown",  hooves: "dark",  points: "wolf" },
  oak:        { coat: ["#2c180e", "#52301c", "#825030", "#b2764a"], coat2: ["#1c110a", "#342014", "#563622", "#7c5034"], mane: "brown",  hooves: "dark",  points: "timber" },
  pine:       { coat: ["#442812", "#784c24", "#ae783c", "#daa460"], coat2: ["#2a180c", "#4c2e16", "#764a24", "#a26c3c"], mane: "brown",  hooves: "brown", points: "timber" },
  ebony:      { coat: ["#18161c", "#2e2a34", "#4a4452", "#6c6678"], coat2: ["#121016", "#221e28", "#383342", "#565064"], mane: "black",  hooves: "dark",  points: "timber" },
}
const MANES = {
  black:    ["#141114", "#282228", "#433a43", "#645966"],
  dark:     ["#1c120d", "#382218", "#5c3b28", "#84583c"],
  brown:    ["#2e1a10", "#52321e", "#7c4e30", "#a67048"],
  chestnut: ["#3c180e", "#6c2c18", "#9e4828", "#ca6d42"],
  flaxen:   ["#6a522c", "#a0824c", "#d2b476", "#f2dca4"],
  grey:     ["#383a44", "#626674", "#9297a6", "#c4c9d6"],
  white:    ["#747782", "#a4a8b4", "#d2d6e0", "#f2f4f8"],
  ghost:    ["#14384c", "#246e8e", "#4cc0dc", "#b4f4ff"],
  bone:     ["#4e463c", "#7c7060", "#b2a48e", "#e2d8c4"],
}
const HOOVES = {
  dark:  ["#19171c", "#34313a", "#585460"],
  brown: ["#281c14", "#4a3628", "#705642"],
  pale:  ["#544a3c", "#847662", "#b4a48c"],
}
const EYES_MOUNT = {
  dark:     ["#141014", "#f4f0e8"],
  amber:    ["#3a1e0c", "#f8c848"],
  blue:     ["#1a3058", "#d8ecff"],
  red:      ["#581214", "#ff7a68"],
  ghost:    ["#2498c8", "#c8f8ff"],
  spectral: ["#174829", "#5ef482"],
}
// Extra mount cloth & trim ramps (extending kit.RAMPS with curated banner & trim shades)
const MOUNT_CLOTHS = {
  ...kit.RAMPS,
  crimson: ["#3a1218", "#62202a", "#8a323e", "#b84e58"],
  sage:    ["#2b3a32", "#4a5f53", "#6e8677", "#9cb2a3"],
  gold:    ["#7a5418", "#b48228", "#e2b246", "#f8da7c"],
}
// Full 5-tone metallic & horn ramps (avoid falling back to kit.RAMPS's 1-color gold/brass accent arrays!)
const MOUNT_METALS = {
  ...kit.METALS,
  gold:  kit.METALS.gilt,
  brass: ["#2c1c0c", "#64441a", "#a4762e", "#d8b058", "#faf0c4"],
  dark:  ["#121218", "#24242e", "#3d3d4a", "#646476", "#a8a8bc"],
  ivory: ["#42382e", "#766856", "#b2a48e", "#e0d4bc", "#faf4e6"],
  bone:  ["#2e261f", "#5a4d3e", "#8f7e67", "#c9b89b", "#efe4cc"],
}

// ---------------------------------------------------------------- vector helpers
const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const mul3 = (a, s) => [a[0] * s, a[1] * s, a[2] * s]
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const len3 = (a) => Math.hypot(a[0], a[1], a[2])
const unit3 = (a) => { const l = len3(a) || 1; return [a[0] / l, a[1] / l, a[2] / l] }
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
const frameAt = (deg) => { const s = Math.sin(deg * RAD), c = Math.cos(deg * RAD); return { f: [s, c, 0], r: [c, -s, 0] } }
const dim = (k, far) => (far ? k[0] + k.slice(0, -1) : k)
const SHINE = (M, n) => { const s = dot3(n, HALF); return s > 0.9 ? M[4] : s > 0.72 ? M.slice(2, 4) : s > 0.42 ? M.slice(1, 3) : M.slice(0, 2) }
const DIRS8 = ["n", "ne", "e", "se", "s", "sw", "w", "nw"]
const DIR_DEG = Object.fromEntries(DIRS8.map((d, i) => [d, i * 45]))
const DIR_PRESETS = { "4": ["sw", "se", "nw", "ne"], "4card": ["s", "e", "n", "w"], "8": ["s", "sw", "w", "nw", "n", "ne", "e", "se"] }
const dirList = (dirsSpec, who) => {
  if (!dirsSpec) return DIR_PRESETS["8"]
  if (typeof dirsSpec === "string") {
    if (!DIR_PRESETS[dirsSpec]) throw new Error(`${who}: unknown dirs preset '${dirsSpec}' (use "4", "4card", "8" or an array of directions)`)
    return DIR_PRESETS[dirsSpec]
  }
  if (!Array.isArray(dirsSpec) || !dirsSpec.every((d) => DIRS8.includes(d))) throw new Error(`${who}: dirs must be some of ${DIRS8.join(", ")}, got ${JSON.stringify(dirsSpec)}`)
  return dirsSpec
}
const nearness = (q) => q[2] * SP - q[1] * CP
const camDepth = (q) => q[1] * CP - q[2] * SP

// ---------------------------------------------------------------- Phase 1 species catalog
// All dimensions in HD-2D art px (24 ppm, pitch 20 deg), calibrated directly against kit.px.js
// medium (34 px), short (27.5 px), and tall (45 px) humanoids.
const SPECIES = {
  horse: {
    key: "horse", is: "sleek riding horse with leather saddle, saddlecloth, bridle and reins",
    footprint: [1, 2], bodyFit: ["medium", "tall"],
    // torso barrel
    halfLen: 8.2, barrelW: 5.0, barrelH: 5.0, centerZ: 18.2,
    chestAt: [7.8, 18.6], chestR: [4.9, 5.4, 5.2],
    withersAt: [5.0, 22.8], withersR: [3.6, 3.8, 3.2],
    croupAt: [-7.8, 19.6], croupR: [5.1, 5.4, 5.0],
    saddleAt: [-0.8, 22.4], saddleSeat: 22.6,
    // high arched equine neck & sculpted diamond-browed head (6-7px wide at eyes -> 4-5px muzzle in S view!)
    neckBase: [7.6, 20.6], neckMid: [10.8, 27.0], pollAt: [13.4, 32.6],
    neckR: [3.2, 2.35, 1.85],
    muzzleAt: [18.9, 25.3], craniumR: [2.65, 2.32, 2.18], jawR: [2.25, 2.05, 1.9], muzzleR: [1.95, 1.62],
    earBase: [13.0, 1.65, 33.7], earTip: [13.6, 2.38, 37.3], earR: [0.68, 0.22],
    // eyeBox: [baseF, fGain, fHalf, zCenter, zHalf, latMin, latMaxSW]
    eyeBox: [1.58, 1.25, 0.48, -1.52, 0.98, 1.38, 2.38],
    smoothHind: 0.62,
    // mane & tail
    maneLen: 1.15, maneThick: 1.28, forelock: 1.0,
    tailDock: [-11.8, 21.4], tailArch: [-15.2, 19.0], tailMid: [-16.6, 14.0], tailTip: [-16.0, 8.2],
    tailR: [1.3, 1.78, 1.48, 0.48],
    // legs (front: shoulder -> elbow -> carpus -> fetlock -> hoof; hind: hip -> stifle -> hock -> fetlock -> hoof)
    frontX: 7.4, frontW: 2.75, frontShZ: 16.8, frontU: 6.8, frontL: 7.2,
    hindX: -7.5, hindW: 2.95, hindHipZ: 18.8, hindThigh: 6.2, hindGaskin: 6.4, hindCannon: 6.8,
    legR: [2.2, 1.45, 1.05, 0.92], hoofR: 1.28, hoofH: 2.0, feather: 0,
    // default tack
    defaults: { coat: "bay", saddle: true, blanket: true, bridle: true, barding: "none", caparison: "none", bags: false,
      colors: { saddle: "brown", blanket: "navy", trim: "mustard", barding: "steel", metal: "steel", eye: "dark" } },
    rider: { seatLift: 1.3, stirrupFwd: 0.9, stirrupOut: 1.05, stirrupDrop: 6.8, kneeOut: 40 },
    pace: 3.4,
  },
  warhorse: {
    key: "warhorse", is: "heavy armored destrier with steel chanfron, crinet, peytral and heraldic caparison",
    footprint: [1, 2], bodyFit: ["medium", "tall"],
    halfLen: 9.0, barrelW: 5.7, barrelH: 5.5, centerZ: 19.2,
    chestAt: [8.6, 19.8], chestR: [5.6, 6.0, 5.8],
    withersAt: [5.4, 24.4], withersR: [4.2, 4.2, 3.5],
    croupAt: [-8.6, 20.8], croupR: [5.8, 5.9, 5.5],
    saddleAt: [-0.8, 23.8], saddleSeat: 24.0,
    neckBase: [8.4, 22.0], neckMid: [11.9, 28.6], pollAt: [14.4, 34.2],
    neckR: [3.7, 2.75, 2.1],
    muzzleAt: [20.3, 26.5], craniumR: [2.88, 2.52, 2.35], jawR: [2.42, 2.22, 2.08], muzzleR: [2.05, 1.70],
    earBase: [14.0, 1.78, 35.4], earTip: [14.6, 2.52, 39.2], earR: [0.74, 0.24],
    eyeBox: [1.58, 1.85, 0.52, -1.32, 0.98, 1.15, 2.25],
    maneLen: 1.1, maneThick: 1.35, forelock: 0.92,
    tailDock: [-13.0, 22.8], tailArch: [-16.6, 20.0], tailMid: [-18.0, 14.5], tailTip: [-17.2, 8.5],
    tailR: [1.55, 2.08, 1.72, 0.58],
    frontX: 8.1, frontW: 3.15, frontShZ: 17.8, frontU: 7.2, frontL: 7.6,
    hindX: -8.3, hindW: 3.35, hindHipZ: 20.0, hindThigh: 6.6, hindGaskin: 6.8, hindCannon: 7.2,
    legR: [2.55, 1.72, 1.25, 1.12], hoofR: 1.32, hoofH: 2.05, feather: 0,
    defaults: { coat: "dapple", saddle: true, blanket: true, bridle: true, barding: "full", caparison: "full", bags: false,
      colors: { saddle: "black", blanket: "red", trim: "mustard", barding: "steel", metal: "gold", eye: "dark" } },
    rider: { seatLift: 1.5, stirrupFwd: 0.9, stirrupOut: 1.15, stirrupDrop: 7.0, kneeOut: 42 },
    pace: 3.5,
  },
  pony: {
    key: "pony", is: "compact stocky riding pony with shaggy mane, full tail, leather saddle and saddlebags",
    footprint: [1, 2], bodyFit: ["short", "medium"],
    halfLen: 6.5, barrelW: 4.8, barrelH: 4.7, centerZ: 14.0,
    chestAt: [6.1, 14.4], chestR: [4.6, 4.7, 4.7],
    withersAt: [3.8, 17.8], withersR: [3.4, 3.3, 2.6],
    croupAt: [-6.3, 15.0], croupR: [4.9, 4.8, 4.6],
    saddleAt: [-0.6, 17.6], saddleSeat: 17.8,
    neckBase: [5.9, 16.0], neckMid: [8.4, 20.9], pollAt: [10.4, 25.7],
    neckR: [3.0, 2.35, 1.9],
    muzzleAt: [14.8, 19.6], craniumR: [2.58, 2.22, 2.1], jawR: [2.18, 1.96, 1.85], muzzleR: [1.92, 1.58],
    earBase: [10.0, 1.58, 26.8], earTip: [10.5, 2.25, 29.8], earR: [0.66, 0.24],
    eyeBox: [2.25, -0.62, 0.42, -0.78, 0.52, 1.25, 3.20], muzzleFrac: 0.69,
    smoothHind: 0.82,
    maneLen: 1.32, maneThick: 1.48, forelock: 1.05,
    tailDock: [-9.8, 16.4], tailArch: [-12.8, 14.5], tailMid: [-14.0, 10.2], tailTip: [-13.4, 5.4],
    tailR: [1.42, 2.02, 1.72, 0.65],
    frontX: 5.7, frontW: 2.65, frontShZ: 12.6, frontU: 5.0, frontL: 5.4,
    hindX: -5.9, hindW: 2.85, hindHipZ: 14.2, hindThigh: 4.6, hindGaskin: 4.9, hindCannon: 5.2,
    legR: [2.05, 1.42, 1.08, 0.98], hoofR: 1.25, hoofH: 1.8, feather: 0.4,
    defaults: { coat: "chestnut", mane: "flaxen", saddle: true, blanket: true, bridle: true, barding: "none", caparison: "none", bags: true,
      colors: { saddle: "brown", blanket: "green", trim: "mustard", barding: "steel", metal: "brass", eye: "dark" } },
    rider: { seatLift: 0.65, stirrupFwd: 0.85, stirrupOut: 0.95, stirrupDrop: 5.2, kneeOut: 40 },
    pace: 2.7,
  },
  // ---- Phase 2 species: undead steed, heavy war bull, mechanical automaton, direwolf & wooden supply wagon
  bone_steed: {
    key: "bone_steed", archetype: "skeleton",
    is: "undead skeletal horse with exposed 3D ribcage glowing with spectral soul-fire, hollow lumbar spine, equine skull with glowing eye sockets, slender knobby bone limbs and thin bony tail",
    footprint: [1, 2], bodyFit: ["medium", "tall"],
    halfLen: 8.2, barrelW: 4.8, barrelH: 4.7, centerZ: 18.2,
    chestAt: [7.6, 18.8], chestR: [4.5, 4.9, 4.7],
    withersAt: [5.0, 22.6], withersR: [2.8, 3.0, 2.4],
    croupAt: [-7.8, 19.6], croupR: [4.4, 4.5, 4.1],
    saddleAt: [-0.8, 22.0], saddleSeat: 22.4,
    neckBase: [7.6, 20.6], neckMid: [10.6, 27.6], pollAt: [13.2, 33.4],
    neckR: [1.35, 1.15, 0.98],
    muzzleAt: [19.2, 25.8], craniumR: [2.72, 2.30, 2.08], jawR: [2.04, 1.82, 1.65], muzzleR: [1.68, 1.42],
    earBase: [12.8, 1.55, 34.4], earTip: [13.1, 1.95, 37.0], earR: [0.56, 0.22],
    maneLen: 0.9, maneThick: 0.85, forelock: 0.5,
    tailDock: [-11.0, 21.0], tailArch: [-14.4, 18.8], tailMid: [-15.8, 14.0], tailTip: [-15.4, 8.8],
    tailR: [0.50, 0.40, 0.30, 0.20],
    frontX: 7.4, frontW: 2.75, frontShZ: 16.8, frontU: 6.8, frontL: 7.2,
    hindX: -7.5, hindW: 2.95, hindHipZ: 18.8, hindThigh: 6.2, hindGaskin: 6.4, hindCannon: 6.8,
    legR: [1.05, 0.82, 0.68, 0.62], hoofR: 1.18, hoofH: 1.85, feather: 0,
    defaults: { coat: "ivory", mane: "none", saddle: true, blanket: false, bridle: true, barding: "none", caparison: "none", bags: false,
      colors: { saddle: "black", blanket: "plum", trim: "slate", barding: "iron", metal: "iron", eye: "spectral" } },
    rider: { seatLift: 1.2, stirrupFwd: 0.9, stirrupOut: 0.85, stirrupDrop: 6.8, kneeOut: 40 },
    pace: 3.4,
  },
  war_aurochs: {
    key: "war_aurochs", archetype: "bull",
    is: "massive heavily-muscled war bull with towering shoulder hump, shaggy dewlap, sweeping curved horns, brass nose ring and heavy war harness",
    footprint: [2, 2], bodyFit: ["large", "medium", "tall"],
    halfLen: 9.5, barrelW: 6.5, barrelH: 6.2, centerZ: 19.4,
    chestAt: [8.4, 20.2], chestR: [6.5, 6.8, 6.7],
    withersAt: [5.8, 25.8], withersR: [5.4, 5.5, 4.5],
    croupAt: [-8.6, 20.4], croupR: [5.6, 5.7, 5.3],
    saddleAt: [-1.8, 24.0], saddleSeat: 24.4,
    neckBase: [9.0, 21.6], neckMid: [12.4, 24.4], pollAt: [15.4, 26.8],
    neckR: [4.8, 4.1, 3.4],
    muzzleAt: [20.4, 19.6], craniumR: [3.55, 3.05, 2.85], jawR: [3.15, 2.75, 2.45], muzzleR: [2.75, 2.38],
    earBase: [14.4, 3.1, 26.6], earTip: [14.2, 5.5, 26.0], earR: [0.92, 0.42],
    maneLen: 1.35, maneThick: 1.85, forelock: 1.15,
    tailDock: [-13.2, 21.8], tailArch: [-15.8, 19.4], tailMid: [-16.6, 13.8], tailTip: [-16.2, 8.0],
    tailR: [0.82, 0.72, 0.65, 1.38],
    frontX: 8.2, frontW: 3.85, frontShZ: 17.6, frontU: 7.0, frontL: 7.2,
    hindX: -8.3, hindW: 3.55, hindHipZ: 19.4, hindThigh: 6.4, hindGaskin: 6.4, hindCannon: 6.8,
    legR: [2.85, 1.95, 1.48, 1.35], hoofR: 1.62, hoofH: 2.1, feather: 0,
    defaults: { coat: "aurochs", mane: "black", saddle: true, blanket: true, bridle: true, barding: "none", caparison: "none", bags: false,
      colors: { saddle: "brown", blanket: "red", trim: "mustard", barding: "ivory", metal: "gold", eye: "amber" } },
    rider: { seatLift: 1.5, stirrupFwd: 0.6, stirrupOut: 1.35, stirrupDrop: 7.4, kneeOut: 44 },
    pace: 3.1,
  },
  clockwork_strider: {
    key: "clockwork_strider", archetype: "clockwork",
    is: "wide-stanced porcelain-and-brass mechanical tortoise caravan walker with domed fenders, glowing amber optics, splayed gear-jointed pillar legs, cushioned driver chair, front grab-bar, twin side cargo packs & bedrolls, and hanging sage banners",
    footprint: [2, 2], bodyFit: ["medium", "tall", "short"],
    halfLen: 10.2, barrelW: 8.6, barrelH: 5.2, centerZ: 14.8,
    chestAt: [8.4, 15.0], chestR: [8.2, 5.2, 5.0],
    withersAt: [4.6, 18.4], withersR: [7.6, 4.8, 3.6],
    croupAt: [-8.6, 15.0], croupR: [8.2, 5.0, 4.8],
    saddleAt: [0.8, 21.0], saddleSeat: 21.4,
    neckBase: [9.0, 15.0], neckMid: [11.8, 15.2], pollAt: [14.4, 15.4],
    neckR: [3.2, 2.8, 2.5],
    muzzleAt: [18.0, 14.8], craniumR: [3.05, 3.15, 2.75], jawR: [2.65, 2.35, 1.95], muzzleR: [2.35, 1.95],
    earBase: [13.8, 2.5, 15.4], earTip: [13.8, 3.4, 15.4], earR: [0.85, 0.85],
    maneLen: 0, maneThick: 0, forelock: 0,
    tailDock: [-11.0, 13.8], tailArch: [-11.5, 13.4], tailMid: [-11.8, 13.0], tailTip: [-11.8, 12.6],
    tailR: [0.8, 0.6, 0.4, 0.3],
    frontX: 7.2, frontW: 6.4, frontShZ: 13.2, frontU: 5.8, frontL: 6.2,
    hindX: -7.4, hindW: 6.4, hindHipZ: 13.2, hindThigh: 5.6, hindGaskin: 5.6, hindCannon: 5.8,
    legR: [3.25, 2.65, 2.45, 2.65], hoofR: 2.85, hoofH: 2.2, feather: 0,
    defaults: { coat: "porcelain", mane: "brown", saddle: true, blanket: true, bridle: true, barding: "gold", caparison: "none", bags: true,
      colors: { saddle: "brown", blanket: "sage", trim: "gold", barding: "gold", metal: "gold", eye: "amber" } },
    rider: { seatLift: 0.75, stirrupFwd: 3.4, stirrupOut: 2.2, stirrupDrop: 5.2, kneeOut: 14 },
    pace: 2.6,
  },
  wolf: {
    key: "wolf", archetype: "wolf",
    is: "majestic lion-maned riding direwolf with wide shaggy silver-grey ruff, noble wolf head, athletic cream-legged clawed paws, sweeping downward feathered tail, crimson flank banners, rolled bedroll, saddlebags and brass breastplate harness",
    footprint: [1, 2], bodyFit: ["short", "medium"],
    halfLen: 9.0, barrelW: 4.8, barrelH: 4.7, centerZ: 16.4,
    chestAt: [7.6, 17.0], chestR: [5.4, 5.6, 5.2],
    withersAt: [5.2, 20.8], withersR: [4.8, 4.8, 4.0],
    croupAt: [-7.8, 17.2], croupR: [4.6, 5.0, 4.4],
    saddleAt: [-1.0, 20.0], saddleSeat: 20.2,
    neckBase: [7.8, 18.6], neckMid: [11.0, 22.4], pollAt: [13.6, 25.8],
    neckR: [4.4, 3.9, 3.1],
    muzzleAt: [19.8, 24.0], craniumR: [3.30, 3.05, 2.85], jawR: [3.2, 2.35, 2.0], muzzleR: [1.65, 1.22],
    earBase: [12.3, 2.05, 27.4], earTip: [12.7, 2.60, 31.4], earR: [1.22, 0.34],
    maneLen: 1.85, maneThick: 2.35, forelock: 0.85,
    tailDock: [-10.8, 18.0], tailArch: [-14.6, 15.2], tailMid: [-17.4, 9.8], tailTip: [-18.4, 3.8],
    tailR: [2.35, 3.25, 2.85, 1.05],
    frontX: 7.4, frontW: 3.15, frontShZ: 15.0, frontU: 6.2, frontL: 6.6,
    hindX: -7.6, hindW: 3.20, hindHipZ: 16.8, hindThigh: 5.8, hindGaskin: 6.0, hindCannon: 6.2,
    legR: [2.35, 1.60, 1.32, 1.25], hoofR: 1.85, hoofH: 1.50, feather: 0,
    defaults: { coat: "timber", mane: "grey", saddle: true, blanket: true, bridle: true, barding: "none", caparison: "none", bags: true,
      colors: { saddle: "brown", blanket: "crimson", trim: "gold", barding: "gold", metal: "gold", eye: "amber" } },
    rider: { seatLift: 1.0, stirrupFwd: 0.75, stirrupOut: 1.0, stirrupDrop: 5.8, kneeOut: 40 },
    pace: 3.6,
  },
  cart: {
    key: "cart", archetype: "vehicle",
    is: "full-scale wooden spoked-wheel supply wagon with slatted bed, iron tire rims, front driver bench, hitch shafts and optional arched canvas canopy",
    footprint: [2, 3], bodyFit: ["medium", "short", "tall"],
    halfLen: 16.8, barrelW: 10.0, barrelH: 6.4, centerZ: 15.8,
    chestAt: [13.6, 15.8], chestR: [10.0, 3.8, 5.0],
    withersAt: [13.0, 20.8], withersR: [9.2, 3.0, 2.4],
    croupAt: [-15.4, 15.8], croupR: [10.0, 3.8, 5.0],
    saddleAt: [13.4, 17.6], saddleSeat: 18.2,
    neckBase: [16.0, 13.0], neckMid: [21.0, 13.0], pollAt: [26.0, 13.0],
    neckR: [1.0, 1.0, 1.0],
    muzzleAt: [27.0, 13.0], craniumR: [1.0, 1.0, 1.0], jawR: [1.0, 1.0, 1.0], muzzleR: [1.0, 1.0],
    earBase: [16.0, 1.0, 13.0], earTip: [16.0, 1.0, 13.0], earR: [0.5, 0.5],
    maneLen: 0, maneThick: 0, forelock: 0,
    tailDock: [-16.8, 15.0], tailArch: [-16.8, 15.0], tailMid: [-16.8, 15.0], tailTip: [-16.8, 15.0],
    tailR: [0.5, 0.5, 0.5, 0.5],
    frontX: 10.2, frontW: 10.8, frontShZ: 6.4, frontU: 2.0, frontL: 2.0,
    hindX: -9.6, hindW: 11.0, hindHipZ: 8.2, hindThigh: 2.0, hindGaskin: 2.0, hindCannon: 2.0,
    legR: [1.0, 1.0, 1.0, 1.0], hoofR: 1.0, hoofH: 1.0, feather: 0,
    defaults: { coat: "oak", mane: "brown", saddle: true, blanket: true, bridle: true, canopy: true, draught: "horse", barding: "none", caparison: "none", bags: false,
      colors: { saddle: "brown", blanket: "linen", trim: "brown", barding: "iron", metal: "iron", eye: "dark" } },
    rider: { seatLift: 0.75, stirrupFwd: 3.1, stirrupOut: 2.2, stirrupDrop: 5.5, kneeOut: 10 },
    pace: 2.6,
  },
}

// ---------------------------------------------------------------- mount animations (quadruped poses)
// Pose fields:
//   bob: vertical body shift (px), pitch: degrees (+ nose up, - nose down),
//   neckPitch: degrees neck tilts forward (+) / back (-), headNod: degrees head nods down (+) / up (-),
//   earTilt: degrees ears pin back (-) / perk (+), tailLift: px lift, tailSway: px sideways, tailTrail: px backward stream,
//   legs: [FL, FR, HL, HR] each [fwd, lift, kneeHintFwd] (relative to rest stance on the ground),
//   flash, shake, collapsed: 0..1 (downed/dead lying on flank)
const MOUNT_MOVES = {
  stand: {
    frames: 1, ms: [250], loop: true,
    pose: (_, h = 270) => {
      // Stand squarely symmetric in pure front/back (S/N) views so left/right legs, stockings & hooves align evenly,
      // while keeping subtle contrapposto foot stagger in side/diagonal views so all 4 legs separate cleanly!
      const st = Math.abs(Math.sin(h * RAD)) > 0.2 ? 1 : 0
      return { bob: 0, pitch: 0, neckPitch: 0, headNod: 0, earTilt: 0, tailLift: 0, tailSway: 0, tailTrail: 0,
        legs: [[0.4 * st, 0], [-0.4 * st, 0], [-0.3 * st, 0], [0.3 * st, 0]] }
    },
  },
  idle: {
    frames: 4, ms: [480, 460, 480, 460], loop: true,
    pose: (i, h = 270, S = null) => {
      const st = Math.abs(Math.sin(h * RAD)) > 0.2 ? 1 : 0
      const arch = S?.archetype
      if (arch === "clockwork") {
        // Calm rhythmic hydraulic boiler idle: steady carapace breath + subtle brass gear pulse
        return {
          bob: [0, -0.55, -0.35, 0.15][i], pitch: [0, -0.6, -0.3, 0.4][i],
          neckPitch: [0, 1.5, 0.8, -0.8][i], headNod: [0, 1.5, 0.5, -0.5][i],
          headYaw: [0, -3, 0, 3][i], earTilt: 0, tailLift: 0, tailSway: 0, tailTrail: 0,
          legs: [[0, 0], [0, 0], [0, 0], [0, 0]],
        }
      }
      if (arch === "vehicle") {
        // Subtle wooden suspension creak/settle on the wagon axles
        return {
          bob: [0, -0.35, -0.15, 0.15][i], pitch: [0, -0.4, 0, 0.3][i],
          neckPitch: 0, headNod: 0, earTilt: 0, tailLift: 0, tailSway: 0, tailTrail: 0,
          legs: [[0, 0], [0, 0], [0, 0], [0, 0]],
        }
      }
      const b = [0, -0.45, -0.25, 0.2][i]
      return {
        bob: b, pitch: [0, -0.8, -0.4, 0.5][i],
        neckPitch: [0, 3.5, 2.0, -1.5][i], headNod: [0, 4.5, 2.0, -2.0][i],
        earSplit: [[0, 0], [-10, 4], [4, -8], [2, 2]][i],
        tailLift: [0, 0.4, 0.2, 0][i], tailSway: [0, 1.8, 0.5, -1.6][i], tailTrail: [0, 0.4, 0.2, 0][i],
        legs: [[0.4 * st, 0], [-0.4 * st, 0], [-0.3 * st, 0], [0.3 * st, 0]],
      }
    },
  },
  // Unhurried 8-frame idle: horse lifts & paws then shakes head; war bull lowers horns to scrape dirt twice & toss horns!
  paw: {
    frames: 8, ms: [280, 260, 240, 260, 210, 200, 230, 380], loop: false,
    pose: (i, h = 270, S = null) => {
      const st = Math.abs(Math.sin(h * RAD)) > 0.2 ? 1 : 0
      if (S?.archetype === "bull") {
        // Authentic war-bull dirt scrape: lowers horned head menacingly, rakes near front hoof back twice, then tosses curved horns!
        const fL = [
          [2.0, 1.8],     // 0: lifts heavy front hoof forward
          [-2.4, 0.3],    // 1: scrapes dirt backward firmly
          [2.2, 2.0],     // 2: lifts front hoof for second scrape
          [-2.2, 0.3],    // 3: second assertive dirt rake
          [0.5 * st, 0],  // 4: plants hoof solidly and begins horn toss
          [0.4 * st, 0],  // 5: high proud horn toss upward
          [0.4 * st, 0],  // 6: heavy counter-swing
          [0.4 * st, 0],  // 7: settles calmly back to stance
        ][i]
        return {
          bob: [-0.3, -0.6, -0.3, -0.6, 0.2, 0.5, 0.2, 0][i],
          pitch: [-2.2, -3.5, -2.5, -3.6, 1.2, 3.0, 1.0, 0][i],
          neckPitch: [16, 24, 18, 25, 6, -12, -5, 0][i],
          headNod: [8, 12, 8, 12, -4, -14, -6, 0][i],
          headYaw: [0, -5, 4, -5, -10, 12, -6, 0][i],
          earSplit: [[-10, -10], [-16, -14], [-10, -10], [-16, -14], [-6, 8], [10, -10], [4, 4], [0, 0]][i],
          tailLift: [0.8, 1.8, 1.2, 2.2, 1.6, 2.0, 0.8, 0.2][i],
          tailSway: [1.0, -2.6, 1.8, -3.0, 2.4, -2.2, 1.0, 0][i],
          tailTrail: [0.8, 1.8, 1.2, 2.2, 1.4, 1.8, 0.8, 0.2][i],
          legs: [fL, [-0.4 * st, 0], [-0.3 * st, 0], [0.3 * st, 0]],
        }
      }
      const fL = [
        [1.8, 3.4],     // 0: shifts weight and begins raising near front leg
        [3.0, 5.2],     // 1: holds near front hoof up with bent knee
        [5.6, 1.4],     // 2: sweeps hoof forward to paw/scrape the ground
        [0.8, 0.2],     // 3: sets hoof down cleanly
        [0.4 * st, 0],  // 4: begins head shake left
        [0.4 * st, 0],  // 5: swings head calmly right
        [0.4 * st, 0],  // 6: gentle counter-swing left
        [0.4 * st, 0],  // 7: settles back into calm alert stance
      ][i]
      return {
        bob: [0.25, 0.4, -0.3, 0.1, 0.2, 0.25, 0.1, 0][i],
        pitch: [2.0, 3.2, -1.0, 0.8, 1.4, 1.8, 0.6, 0][i],
        neckPitch: [-3, -5, 2, -4, -6, -5, -2, 0][i],
        headNod: [2, 4, 6, -3, -5, 3, -3, 0][i],
        headYaw: [0, 0, 0, -8, -14, 15, -9, 0][i],
        earSplit: [[6, 6], [10, 10], [-4, 6], [-10, 8], [-14, 10], [12, -14], [-8, 8], [4, 4]][i],
        tailLift: [0.4, 0.8, 1.4, 0.9, 1.2, 1.5, 0.8, 0.2][i],
        tailSway: [0.6, 1.2, -2.4, 1.8, -2.6, 2.8, -1.4, 0][i],
        tailTrail: [0.4, 0.8, 1.4, 0.9, 1.2, 1.5, 0.8, 0.2][i],
        legs: [fL, [-0.4 * st, 0], [-0.3 * st, 0], [0.3 * st, 0]],
      }
    },
  },
  // Calm 8-frame head shake, ear flick & tail swish (natural weighty rhythm, not twitchy)
  shake: {
    frames: 8, ms: [280, 210, 190, 190, 210, 240, 280, 380], loop: false,
    pose: (i, h = 270) => {
      const st = Math.abs(Math.sin(h * RAD)) > 0.2 ? 1 : 0
      return {
        bob: [0, -0.2, 0.2, 0.15, -0.1, 0, 0.1, 0][i],
        pitch: [0, -0.8, 1.2, 0.8, -0.3, 0.3, 0, 0][i],
        neckPitch: [2, 5, -4, -3, 2, 1, 0, 0][i],
        headNod: [2, 4, -5, 3, -3, 2, 0, 0][i],
        headYaw: [-5, -14, 16, -14, 10, -5, 0, 0][i],
        earSplit: [[-16, 4], [-12, 14], [14, -16], [-14, 12], [10, -10], [-6, 6], [4, 4], [2, 2]][i],
        tailLift: [0.8, 1.8, 2.4, 2.2, 1.6, 1.0, 0.5, 0.2][i],
        tailSway: [2.2, -3.8, 4.0, -3.4, 2.4, -1.2, 0.4, 0][i],
        tailTrail: [0.9, 2.0, 2.6, 2.2, 1.6, 0.9, 0.4, 0.2][i],
        legs: [[0.4 * st, 0], [-0.4 * st, 0], [-0.3 * st, 0], [0.3 * st, 0]],
      }
    },
  },
  // Peaceful 6-frame ambient ear-twitch & lazy tail-swish loop (works smoothly with or without a rider!)
  swish: {
    frames: 6, ms: [420, 320, 360, 320, 360, 440], loop: true,
    pose: (i, h = 270) => {
      const st = Math.abs(Math.sin(h * RAD)) > 0.2 ? 1 : 0
      return {
        bob: [0, -0.2, -0.1, -0.25, -0.1, 0.1][i],
        pitch: [0, -0.4, 0, -0.4, 0, 0.3][i],
        neckPitch: [0, 2.0, 0.8, 2.4, 1.2, -0.8][i],
        headNod: [0, 2.2, -1.0, 2.0, 0, -1.0][i],
        headYaw: [0, -7, -3, 7, 4, 0][i],
        earSplit: [[6, -18], [-18, 10], [10, 10], [-20, -4], [10, -18], [4, 4]][i],
        tailLift: [0.2, 2.4, 1.0, 2.8, 0.9, 0.2][i],
        tailSway: [0.4, 4.4, 1.8, -4.5, -1.8, 0.4][i],
        tailTrail: [0.3, 2.8, 1.2, 3.2, 1.1, 0.3][i],
        legs: [[0.4 * st, 0], [-0.4 * st, 0], [-0.3 * st, 0], [0.3 * st, 0]],
      }
    },
  },
  // Smooth, unhurried 10-frame grazing cycle (equines & heavy war bulls; calibrated neck pitch per species!)
  graze: {
    frames: 10, ms: [300, 280, 380, 360, 400, 360, 380, 300, 280, 480], loop: true,
    pose: (i, h = 270, S = null) => {
      const st = Math.abs(Math.sin(h * RAD)) > 0.2 ? 1 : 0
      const fl = [[1.5, 0.6], [2.4, 0.2], [2.6, 0], [2.6, 0], [2.6, 0], [2.6, 0], [2.6, 0], [2.0, 0.4], [1.1, 0.5], [0.4 * st, 0]][i]
      const fr = [[-0.6, 0], [-1.1, 0], [-1.3, 0], [-1.3, 0], [-1.3, 0], [-1.3, 0], [-1.3, 0], [-0.9, 0], [-0.6, 0], [-0.4 * st, 0]][i]
      if (S?.archetype === "bull") {
        // War bull's thick low neck reaches grass cleanly right at ground level so broad horns & muzzle crop naturally!
        return {
          bob: [-0.3, -0.7, -1.25, -1.0, -1.35, -1.05, -1.25, -0.7, -0.25, 0][i],
          pitch: [-2.4, -5.2, -8.2, -7.2, -8.6, -7.4, -8.2, -5.0, -2.0, 0.2][i],
          neckPitch: [22, 46, 66, 60, 70, 61, 66, 44, 20, 2][i],
          neckStretch: [0.5, 1.2, 1.9, 1.6, 2.0, 1.7, 1.9, 1.1, 0.4, 0][i],
          headNod: [-10, -22, -32, -26, -34, -27, -32, -20, -9, 1][i],
          headYaw: [0, 0, 0, -6, 6, -4, 4, 0, 0, 0][i],
          earSplit: [[-2, -2], [-6, -4], [-8, -6], [-12, 2], [-4, -10], [2, -8], [-8, -6], [2, -4], [4, 2], [4, 4]][i],
          tailLift: [0.2, 0.4, 0.6, 1.4, 0.8, 1.6, 0.6, 0.4, 0.2, 0.2][i],
          tailSway: [0.4, 1.0, 1.8, -2.8, 2.2, -3.2, 1.4, -0.8, -0.3, 0][i],
          tailTrail: [0.3, 0.5, 0.7, 1.2, 0.7, 1.4, 0.6, 0.4, 0.3, 0.2][i],
          legs: [fl, fr, [-0.4 * st, 0], [0.4 * st, 0]],
        }
      }
      return {
        bob: [-0.15, -0.4, -0.65, -0.5, -0.7, -0.52, -0.65, -0.4, -0.15, 0][i],
        pitch: [-1.5, -3.2, -5.0, -4.4, -5.2, -4.5, -5.0, -3.0, -1.2, 0.3][i],
        neckPitch: [28, 62, 92, 85, 95, 86, 92, 60, 26, 4][i],
        neckStretch: [0.6, 1.4, 2.2, 1.9, 2.3, 2.0, 2.2, 1.3, 0.5, 0][i],
        headNod: [-18, -38, -56, -50, -58, -51, -56, -36, -15, 3][i],
        headYaw: [0, 0, 0, -5, 4, -3, 3, 0, 0, 0][i],
        earSplit: [[-2, -2], [-6, -4], [-8, -6], [-12, 2], [-4, -10], [2, -8], [-8, -6], [2, -4], [6, 2], [6, 6]][i],
        tailLift: [0.2, 0.3, 0.5, 1.0, 0.6, 1.2, 0.5, 0.4, 0.2, 0.2][i],
        tailSway: [0.3, 0.9, 1.6, -2.4, 2.0, -2.8, 1.2, -0.8, -0.3, 0][i],
        tailTrail: [0.3, 0.4, 0.6, 1.0, 0.6, 1.2, 0.6, 0.4, 0.3, 0.2][i],
        legs: [fl, fr, [-0.4 * st, 0], [0.4 * st, 0]],
      }
    },
  },
  // Smooth, unhurried 8-frame drinking cycle (calibrated cleanly for horses, heavy war bulls & lapping direwolves!)
  drink: {
    frames: 8, ms: [320, 300, 460, 500, 460, 320, 300, 540], loop: true,
    pose: (i, h = 270, S = null) => {
      const st = Math.abs(Math.sin(h * RAD)) > 0.2 ? 1 : 0
      const fl = [[1.0, 0], [1.5, 0], [1.7, 0], [1.7, 0], [1.7, 0], [1.3, 0], [0.8, 0], [0.4 * st, 0]][i]
      const fr = [[0.5, 0], [0.9, 0], [1.1, 0], [1.1, 0], [1.1, 0], [0.7, 0], [0.3, 0], [-0.4 * st, 0]][i]
      if (S?.archetype === "bull") {
        return {
          bob: [-0.3, -0.7, -1.2, -1.4, -1.25, -0.7, -0.25, 0.1][i],
          pitch: [-2.0, -4.8, -7.2, -8.0, -7.4, -4.6, -1.8, 0.3][i],
          neckPitch: [22, 46, 66, 70, 68, 44, 20, 0][i],
          neckStretch: [0.6, 1.4, 2.1, 2.4, 2.2, 1.3, 0.5, 0][i],
          headNod: [-12, -26, -38, -42, -40, -24, -10, -1][i],
          headYaw: [0, 0, 0, 0, 0, 0, 0, 0][i],
          earSplit: [[-2, -2], [-6, -4], [-10, -8], [-12, -10], [-8, -12], [2, 2], [4, 4], [6, 6]][i],
          tailLift: [0.2, 0.4, 0.6, 1.0, 0.7, 0.4, 0.2, 0.2][i],
          tailSway: [0.3, 0.9, 1.6, -2.0, 1.5, -0.8, -0.3, 0.2][i],
          tailTrail: [0.3, 0.4, 0.6, 0.9, 0.6, 0.4, 0.3, 0.2][i],
          legs: [fl, fr, [-0.5 * st, 0], [0.3 * st, 0]],
        }
      }
      if (S?.archetype === "wolf") {
        // Direwolf lowers forequarters cleanly and laps calmly right down at water level!
        return {
          bob: [-0.45, -1.1, -1.85, -2.1, -1.85, -1.1, -0.4, 0.1][i],
          pitch: [-2.8, -6.2, -9.2, -9.8, -9.0, -5.8, -2.4, 0.3][i],
          neckPitch: [28, 58, 80, 84, 78, 54, 26, 0][i],
          neckStretch: [0.7, 1.6, 2.4, 2.6, 2.3, 1.5, 0.6, 0][i],
          headNod: [-14, -32, -46, -42, -47, -28, -12, -1][i],
          headYaw: [0, 0, 0, 0, 0, 0, 0, 0][i],
          earSplit: [[-4, -4], [-8, -6], [-12, -10], [-14, -12], [-10, -12], [2, 2], [6, 6], [6, 6]][i],
          tailLift: [0.1, 0.3, 0.5, 0.7, 0.5, 0.3, 0.2, 0.1][i],
          tailSway: [0.3, 0.8, 1.4, -1.6, 1.2, -0.8, -0.3, 0.1][i],
          tailTrail: [0.2, 0.3, 0.5, 0.7, 0.5, 0.3, 0.2, 0.1][i],
          legs: [fl, fr, [-0.5 * st, 0], [0.3 * st, 0]],
        }
      }
      return {
        bob: [-0.15, -0.35, -0.55, -0.7, -0.6, -0.35, -0.15, 0.1][i],
        pitch: [-1.2, -2.8, -4.0, -4.5, -4.2, -2.6, -1.0, 0.4][i],
        neckPitch: [28, 60, 86, 90, 88, 58, 26, 0][i],
        neckStretch: [0.9, 2.0, 3.0, 3.3, 3.1, 1.9, 0.8, 0][i],
        headNod: [-22, -48, -68, -72, -70, -44, -18, -2][i],
        headYaw: [0, 0, 0, 0, 0, 0, 0, 0][i],
        earSplit: [[-2, -2], [-6, -4], [-10, -8], [-12, -10], [-8, -12], [2, 2], [6, 6], [8, 8]][i],
        tailLift: [0.2, 0.3, 0.5, 0.8, 0.6, 0.4, 0.2, 0.2][i],
        tailSway: [0.3, 0.9, 1.6, -1.8, 1.4, -0.8, -0.3, 0.2][i],
        tailTrail: [0.3, 0.4, 0.6, 0.8, 0.6, 0.4, 0.3, 0.2][i],
        legs: [fl, fr, [-0.5 * st, 0], [0.3 * st, 0]],
      }
    },
  },
  // ---- Phase 2 species-tailored ambient idles (direwolf howl/sniff/eat, bone_steed rattle, clockwork scan/vent)
  // Noble 10-frame direwolf howl: brief breath gather -> head & muzzle tilted skyward -> steady dramatic hold -> calm settle
  howl: {
    frames: 10, ms: [280, 260, 280, 420, 440, 420, 360, 280, 260, 440], loop: false,
    pose: (i, h = 270) => {
      const st = Math.abs(Math.sin(h * RAD)) > 0.2 ? 1 : 0
      return {
        bob: [-0.35, 0.25, 0.65, 0.95, 1.10, 0.95, 0.65, 0.25, 0, 0][i],
        pitch: [-2.0, 2.5, 5.5, 7.2, 7.8, 7.0, 5.0, 2.2, 0.4, 0][i],
        neckPitch: [8, -10, -24, -32, -35, -33, -26, -12, -3, 0][i],
        headNod: [6, -12, -26, -34, -38, -35, -26, -12, -3, 0][i],
        headYaw: [0, 0, 0, -2, 2, -2, 0, 0, 0, 0][i],
        earSplit: [[4, 4], [-6, -6], [-16, -16], [-22, -22], [-24, -24], [-22, -22], [-16, -16], [-6, -6], [2, 2], [4, 4]][i],
        tailLift: [0.2, 0.6, 1.2, 1.8, 2.0, 1.8, 1.3, 0.7, 0.3, 0.1][i],
        tailSway: [0, 0.5, 1.0, 1.4, -1.2, 1.0, -0.6, 0.3, 0, 0][i],
        tailTrail: [0.2, 0.6, 1.2, 1.8, 2.0, 1.8, 1.3, 0.7, 0.3, 0.1][i],
        legs: [[0.8 * st, 0], [-0.3 * st, 0], [-0.6 * st, 0], [0.2 * st, 0]],
      }
    },
  },
  // Alert 8-frame direwolf scent-tracking sniff: steps forepaw forward, lowers nose near ground, pans left -> right, lifts
  sniff: {
    frames: 8, ms: [300, 320, 380, 380, 380, 340, 300, 420], loop: true,
    pose: (i, h = 270) => {
      const st = Math.abs(Math.sin(h * RAD)) > 0.2 ? 1 : 0
      const fl = [[1.2, 0.5], [2.2, 0], [2.2, 0], [2.2, 0], [2.2, 0], [1.6, 0.3], [0.8, 0.2], [0.4 * st, 0]][i]
      return {
        bob: [-0.35, -1.0, -1.55, -1.45, -1.55, -0.95, -0.35, 0][i],
        pitch: [-2.4, -6.0, -8.2, -7.6, -8.2, -5.4, -2.0, 0][i],
        neckPitch: [30, 64, 78, 74, 78, 58, 26, 0][i],
        neckStretch: [0.7, 1.6, 2.2, 2.0, 2.2, 1.4, 0.6, 0][i],
        headNod: [-12, -26, -32, -30, -32, -22, -10, 0][i],
        headYaw: [0, -6, -16, 2, 16, 8, 0, 0][i],
        earSplit: [[8, 8], [12, 8], [14, 4], [10, 14], [4, 14], [10, 10], [6, 6], [4, 4]][i],
        tailLift: [0.3, 0.8, 1.4, 1.2, 1.6, 0.9, 0.4, 0.1][i],
        tailSway: [0.4, 1.6, -2.4, 2.2, -2.6, 1.4, -0.5, 0][i],
        tailTrail: [0.3, 0.8, 1.2, 1.0, 1.4, 0.8, 0.4, 0.1][i],
        legs: [fl, [-0.6 * st, 0], [-0.4 * st, 0], [0.4 * st, 0]],
      }
    },
  },
  // Distinct 10-frame carnivore feeding cycle (direwolf crouches low on forelegs to bite, chew & tug meal on the ground!)
  eat: {
    frames: 10, ms: [300, 300, 360, 340, 380, 340, 380, 300, 280, 460], loop: true,
    pose: (i, h = 270) => {
      const st = Math.abs(Math.sin(h * RAD)) > 0.2 ? 1 : 0
      const fl = [[1.4, 0.4], [2.4, 0], [2.6, 0], [2.6, 0], [2.6, 0], [2.6, 0], [2.6, 0], [1.9, 0.3], [1.0, 0.3], [0.4 * st, 0]][i]
      const fr = [[-0.2, 0], [-0.6, 0], [-0.8, 0], [-0.8, 0], [-0.8, 0], [-0.8, 0], [-0.8, 0], [-0.6, 0], [-0.4, 0], [-0.4 * st, 0]][i]
      return {
        bob: [-0.5, -1.4, -2.15, -1.65, -2.25, -1.60, -2.10, -1.35, -0.45, 0][i],
        pitch: [-3.2, -7.2, -10.2, -8.0, -10.5, -7.8, -9.8, -6.6, -2.6, 0.2][i],
        neckPitch: [32, 66, 82, 66, 84, 64, 80, 56, 24, 2][i],
        neckStretch: [0.8, 1.8, 2.4, 1.7, 2.5, 1.6, 2.3, 1.4, 0.5, 0][i],
        headNod: [-14, -28, -36, -22, -38, -20, -34, -22, -9, 0][i],
        headYaw: [0, 0, -4, 7, -6, 6, -3, 0, 0, 0][i],
        earSplit: [[-4, -4], [-10, -8], [-14, -12], [-10, -14], [-16, -10], [-8, -14], [-12, -12], [-4, -4], [4, 4], [4, 4]][i],
        tailLift: [0.2, 0.4, 0.8, 1.1, 0.8, 1.2, 0.7, 0.4, 0.2, 0.1][i],
        tailSway: [0.3, 1.0, -1.8, 2.0, -2.2, 1.8, -1.2, 0.6, -0.2, 0][i],
        tailTrail: [0.2, 0.4, 0.7, 1.0, 0.7, 1.1, 0.6, 0.4, 0.2, 0.1][i],
        legs: [fl, fr, [-0.5 * st, 0], [0.4 * st, 0]],
      }
    },
  },
  // Eerie 8-frame undead bone-rattle: skull & cervical vertebrae shudder/clack side-to-side, spine shivers, bone tail whips!
  rattle: {
    frames: 8, ms: [280, 170, 150, 150, 170, 210, 280, 440], loop: false,
    pose: (i, h = 270) => {
      const st = Math.abs(Math.sin(h * RAD)) > 0.2 ? 1 : 0
      return {
        bob: [0, 0.35, -0.30, 0.30, -0.25, 0.15, 0, 0][i],
        pitch: [0, 2.4, -1.6, 2.0, -1.2, 0.8, 0, 0][i],
        neckPitch: [-4, -10, -6, -11, -5, -3, -1, 0][i],
        headNod: [4, -10, 10, -10, 8, -4, 1, 0][i],
        headYaw: [-6, -18, 18, -15, 13, -7, 2, 0][i],
        earSplit: [[-10, 10], [16, -16], [-18, 18], [14, -14], [-10, 10], [6, -6], [0, 0], [0, 0]][i],
        tailLift: [0.4, 1.8, 2.6, 2.2, 1.6, 0.9, 0.3, 0][i],
        tailSway: [1.5, -4.2, 4.4, -3.8, 2.6, -1.2, 0.4, 0][i],
        tailTrail: [0.6, 2.2, 2.8, 2.4, 1.6, 0.8, 0.3, 0][i],
        legs: [[0.4 * st, 0], [-0.4 * st, 0], [-0.3 * st, 0], [0.3 * st, 0]],
      }
    },
  },
  // Calm 8-frame mechanical optical turret scan: smoothly pans tortoise head & glowing optics left -> hold -> right -> hold -> center!
  scan: {
    frames: 8, ms: [320, 360, 460, 320, 360, 460, 320, 420], loop: true,
    pose: (i) => ({
      bob: [0, -0.35, -0.45, -0.15, -0.35, -0.45, -0.15, 0][i],
      pitch: [0, -0.5, -0.7, 0, -0.5, -0.7, 0, 0][i],
      neckPitch: [0, 2, 3, 0, 2, 3, 0, 0][i],
      headNod: [0, 2, 2, 0, 2, 2, 0, 0][i],
      headYaw: [0, -15, -26, -6, 15, 26, 8, 0][i],
      earTilt: 0, tailLift: 0, tailSway: 0, tailTrail: 0,
      legs: [[0, 0], [0, 0], [0, 0], [0, 0]],
    }),
  },
  // Calm 8-frame mechanical pressure-vent & hydraulic crouch: carapace settles low onto splayed legs, pauses, then pumps back up!
  vent: {
    frames: 8, ms: [300, 320, 380, 480, 420, 320, 300, 440], loop: false,
    pose: (i) => ({
      bob: [-0.3, -1.2, -2.2, -2.5, -2.3, -1.3, -0.4, 0][i],
      pitch: [-0.8, -2.2, -3.6, -4.0, -3.5, -2.0, -0.6, 0][i],
      neckPitch: [2, 6, 11, 13, 11, 6, 2, 0][i],
      headNod: [2, 5, 8, 10, 8, 4, 1, 0][i],
      headYaw: [0, 0, -4, 4, -3, 0, 0, 0][i],
      earTilt: 0, tailLift: 0, tailSway: 0, tailTrail: 0,
      legs: [[0, 0], [0, 0], [0, 0], [0, 0]],
    }),
  },
  // Crisp 6-frame diagonal trot (LF+RH paired, RF+LH paired) — reads clearly at HD-2D scale in all 8 dirs (720 ms cycle)
  walk: {
    frames: 6, ms: [120, 120, 120, 120, 120, 120], loop: true,
    pose: (i) => {
      const ph = (i / 6) * Math.PI * 2
      const leg = (offset) => {
        const s = Math.sin(ph + offset), c = Math.cos(ph + offset)
        // planted backward push half-cycle, lifted forward reach half-cycle
        return [s * 4.4, Math.max(0, c) * 3.1]
      }
      const fl = leg(0), hr = leg(0.22), fr = leg(Math.PI), hl = leg(Math.PI + 0.22)
      const bob = [0.6, 1.3, 0.2, 0.6, 1.3, 0.2][i] - 0.5
      return {
        bob, pitch: [1.5, 2.2, -0.8, 1.5, 2.2, -0.8][i],
        neckPitch: [2, -2, 4, 2, -2, 4][i], headNod: [3, -2, 5, 3, -2, 5][i], earTilt: [2, 0, -2, 2, 0, -2][i],
        tailLift: 1.2 + 0.5 * Math.sin(ph * 2), tailSway: Math.sin(ph) * 1.5, tailTrail: 2.2,
        legs: [fl, fr, hl, hr],
      }
    },
  },
  // Seamless 8-frame periodic harmonic gallop / charge (8 × 90 ms = 720 ms — ZERO teleport across frame 7 -> 0!)
  // Species-tuned stride physics: bounding direwolf gallop, grounded horn-lowering war bull charge, rotary equine gallop & mechanical march!
  charge: {
    frames: 8, ms: [90, 90, 90, 90, 90, 90, 90, 90], loop: true,
    pose: (i, _h = 270, S = null) => {
      const ph = (i / 8) * Math.PI * 2
      const stride = (offset, fwdAmp, liftAmp, bias = 0) => {
        const s = Math.sin(ph + offset), c = Math.cos(ph + offset)
        return [bias + s * fwdAmp, Math.pow(Math.max(0, c), 1.15) * liftAmp]
      }
      const arch = S?.archetype
      if (arch === "clockwork") {
        // Fast heavy hydraulic tortoise march (never floats airborne!)
        const fl = stride(0, 4.4, 2.6), hr = stride(0.3, 4.4, 2.6), fr = stride(Math.PI, 4.4, 2.6), hl = stride(Math.PI + 0.3, 4.4, 2.6)
        return {
          bob: 0.7 * Math.sin(ph * 2) - 0.3, pitch: -2.2 + 1.4 * Math.cos(ph * 2),
          neckPitch: 4 + 2 * Math.sin(ph * 2), headNod: 2, earTilt: 0,
          tailLift: 0, tailSway: 0, tailTrail: 0,
          legs: [fl, fr, hl, hr],
        }
      }
      if (arch === "bull") {
        // Heavy, thunderous, grounded war-bull charge: lowered goring horns, powerful low-lift driving gallop, seamless 7 -> 0 loop!
        const hl = stride(0.0, 4.5, 2.2, -0.3), hr = stride(0.75, 4.5, 2.2, -0.3)
        const fl = stride(2.9, 4.7, 2.5, 0.5),  fr = stride(3.65, 4.7, 2.5, 0.5)
        return {
          bob: 1.05 * Math.sin(ph - 0.65) - 0.25,
          pitch: 3.8 * Math.cos(ph - 0.55) - 1.5,
          neckPitch: 20 + 2.5 * Math.sin(ph),
          headNod: -8 + 2.0 * Math.cos(ph),
          earTilt: -18,
          tailLift: 2.6 + 0.7 * Math.sin(ph),
          tailSway: 0.6 * Math.cos(ph),
          tailTrail: 5.0 + 0.9 * Math.sin(ph),
          legs: [fl, fr, hl, hr],
        }
      }
      if (arch === "wolf") {
        // Sleek athletic direwolf double-suspension bounding gallop: paired fore/hind reach, flexible spine pitch, streaming plush tail, seamless 7 -> 0 loop!
        const hl = stride(0.0, 5.4, 3.0, -0.4), hr = stride(0.50, 5.4, 3.0, -0.4)
        const fl = stride(2.65, 5.6, 3.2, 0.6), fr = stride(3.15, 5.6, 3.2, 0.6)
        return {
          bob: 1.45 * Math.sin(ph - 0.55) + 0.25,
          pitch: 6.2 * Math.cos(ph - 0.50),
          neckPitch: 13 + 3.0 * Math.sin(ph),
          headNod: -2 + 2.0 * Math.cos(ph),
          earTilt: -18,
          tailLift: 3.4 + 0.9 * Math.sin(ph),
          tailSway: 0.5 * Math.cos(ph),
          tailTrail: 5.8 + 1.2 * Math.sin(ph),
          legs: [fl, fr, hl, hr],
        }
      }
      // Smooth 8-frame rotary cavalry gallop for horses, warhorses, ponies & bone_steed (100% seamless loop!)
      const hl = stride(0.0, 5.6, 3.3, -0.5), hr = stride(0.60, 5.6, 3.3, -0.5)
      const fl = stride(2.55, 5.8, 3.6, 0.8), fr = stride(3.15, 5.8, 3.6, 0.8)
      return {
        bob: 1.55 * Math.sin(ph - 0.6) + 0.35,
        pitch: 5.5 * Math.cos(ph - 0.5),
        neckPitch: 10 + 3.0 * Math.sin(ph),
        headNod: 1 + 2.2 * Math.cos(ph),
        earTilt: -18,
        tailLift: 3.4 + 0.8 * Math.sin(ph),
        tailSway: 0.5 * Math.cos(ph),
        tailTrail: 5.8 + 1.2 * Math.sin(ph),
        legs: [fl, fr, hl, hr],
      }
    },
  },
  // Dramatic 6-frame upright 2-legged rear (rise -> soaring -> apex 1 -> apex paw -> plunging descent -> landing)!
  // Pivots cleanly near the hindquarters/hips so all 7 animal & construct mounts stand tall on 2 hind legs;
  // excluded from wheeled `cart` presets (and stays flat/stationary if explicitly requested on a vehicle).
  rear: {
    frames: 6, ms: [110, 120, 170, 160, 110, 130], loop: false,
    pose: (i, _h = 270, S = null) => {
      const arch = S?.archetype
      if (arch === "vehicle") {
        return {
          bob: 0, pitch: 0, neckPitch: 0, headNod: 0, earTilt: 0,
          tailLift: 0, tailSway: 0, tailTrail: 0,
          legs: [[0, 0], [0, 0], [0, 0], [0, 0]],
        }
      }
      const k = [0.42, 0.92, 1.0, 0.96, 0.48, 0.08][i]
      const pivotFwd = (S?.hindX ?? -7.5) * 0.65
      if (arch === "clockwork") {
        const fl = [[-0.8, 5.2], [-1.8, 10.2], [-1.4, 11.4], [-0.4, 12.6], [0.8, 4.8], [0, 0]][i]
        const fr = [[-0.4, 6.0], [-0.8, 11.4], [-0.2, 12.6], [-1.4, 11.0], [1.0, 5.2], [0, 0]][i]
        return {
          bob: -0.6 * k, pitch: 36 * k, pivotFwd, neckPitch: 10 * k, headNod: 10 * k, earTilt: 0,
          tailLift: 0, tailSway: 0, tailTrail: 0,
          legs: [fl, fr, [0, 0], [0, 0]],
        }
      }
      if (arch === "bull") {
        const fl = [[0.2, 5.8], [0.4, 11.8], [0.6, 12.8], [1.8, 14.2], [1.2, 5.4], [0.2, 0]][i]
        const fr = [[1.2, 6.8], [1.8, 13.4], [2.4, 14.6], [0.8, 12.6], [1.6, 5.8], [0.4, 0]][i]
        return {
          bob: -0.4 * k, pitch: 42 * k, pivotFwd, neckPitch: 10 * k, headNod: 18 * k, earTilt: -14 * k,
          tailLift: -2.0 * k, tailSway: [0, 0.8, -0.9, 1.0, -0.4, 0][i], tailTrail: 1.4 * k,
          legs: [fl, fr, [1.2 * k, 0], [-0.4 * k, 0]],
        }
      }
      if (arch === "wolf") {
        const fl = [[0.4, 6.0], [0.8, 12.2], [1.0, 13.4], [2.4, 15.0], [1.4, 5.6], [0.2, 0]][i]
        const fr = [[1.4, 7.0], [2.4, 14.0], [2.8, 15.2], [1.0, 13.2], [1.8, 6.0], [0.4, 0]][i]
        return {
          bob: -0.2 * k, pitch: 46 * k, pivotFwd, neckPitch: 14 * k, headNod: 20 * k, earTilt: -10 * k,
          tailLift: -2.2 * k, tailSway: [0, 1.0, -1.2, 1.2, -0.5, 0][i], tailTrail: 1.6 * k,
          legs: [fl, fr, [1.4 * k, 0], [-0.3 * k, 0]],
        }
      }
      // Equines (horse, warhorse, pony) & bone_steed: towering 45° rear on 2 hind legs with pawing forehooves!
      const fl = [[0.4, 6.2], [0.6, 12.8], [0.8, 14.0], [2.4, 15.8], [1.4, 5.8], [0.2, 0]][i]
      const fr = [[1.4, 7.4], [2.4, 14.6], [2.8, 16.0], [0.8, 13.8], [1.8, 6.2], [0.4, 0]][i]
      return {
        bob: -0.2 * k, pitch: 45 * k, pivotFwd, neckPitch: 12 * k, headNod: 22 * k, earTilt: -14 * k,
        tailLift: -2.2 * k, tailSway: [0, 1.0, -1.2, 1.2, -0.5, 0][i], tailTrail: 1.5 * k,
        legs: [fl, fr, [1.6 * k, 0], [-0.2 * k, 0]],
      }
    },
  },
  // Ferocious 6-frame predator bite (direwolf coils back -> opens jaws wide showing fangs -> explosive forward lunge -> CHOMP snap -> tear -> recover!)
  bite: {
    frames: 6, ms: [105, 105, 85, 115, 125, 125], loop: false,
    pose: (i) => ({
      lunge: [-1.4, -2.0, 3.2, 3.6, 1.4, 0][i],
      bob: [-1.0, -1.5, -1.2, -1.5, -0.6, 0][i],
      pitch: [-4, -7, -9, -6, 2, 0][i],
      neckPitch: [8, 12, 22, 24, 8, 0][i],
      neckStretch: [-0.6, -0.2, 4.4, 4.6, 1.6, 0][i],
      headNod: [-6, -14, -16, 6, 2, 0][i],
      headYaw: [4, 8, -4, -14, 14, 0][i],
      earTilt: [-26, -34, -38, -32, -22, -6][i],
      jawOpen: [0.35, 1.0, 0.95, 0.06, 0.14, 0][i],
      biteImpact: i === 3,
      tailLift: [0.4, 1.4, 2.8, 3.0, 1.8, 0.4][i],
      tailSway: [0.6, 1.4, -1.6, -2.2, 2.0, 0.4][i],
      tailTrail: [1.0, 1.8, 4.4, 4.6, 2.4, 0.8][i],
      legs: [
        [[-0.6, 0], [-1.0, 0.8], [3.6, 1.8], [3.4, 0], [1.6, 0], [0.4, 0]][i],
        [[0.4, 0], [-0.2, 0], [2.2, 0.8], [2.4, 0], [1.0, 0], [-0.2, 0]][i],
        [[-1.0, 0], [-1.4, 0], [-2.0, 0], [-1.8, 0], [-0.8, 0], [0, 0]][i],
        [[-0.4, 0], [-0.8, 0], [-1.2, 0], [-1.0, 0], [-0.4, 0], [0, 0]][i],
      ],
    }),
  },
  // Thunderous 6-frame bull horn gore (dig hooves & drop horns low -> deep coil -> ramming forward lunge -> VIOLENT UPWARD HORN TOSS -> follow-through -> stomp!)
  gore: {
    frames: 6, ms: [120, 125, 90, 115, 130, 135], loop: false,
    pose: (i) => ({
      lunge: [-1.2, -2.0, 3.0, 3.4, 1.6, 0][i],
      bob: [-0.9, -1.8, -1.4, 1.1, 0.5, 0][i],
      pitch: [-5, -10, -7, 11, 6, 0][i],
      neckPitch: [28, 46, 38, -26, -16, 0][i],
      neckStretch: [0.4, 0.8, 3.0, 2.6, 1.2, 0][i],
      headNod: [-10, -14, -10, -24, -14, 0][i],
      headYaw: [-8, -14, -8, 16, 10, 0][i],
      earTilt: [-20, -28, -30, -16, -10, 0][i],
      goreImpact: i === 3,
      tailLift: [0.6, 1.4, 2.4, 3.2, 1.8, 0.2][i],
      tailSway: [-0.8, -1.6, -1.2, 2.4, 1.4, 0][i],
      tailTrail: [1.0, 1.8, 3.6, 4.2, 2.2, 0.4][i],
      legs: [
        [[-0.6, 0], [-1.2, 0], [3.2, 1.2], [2.6, 1.8], [1.2, 0], [0, 0]][i],
        [[0.8, 0.6], [1.2, 0], [2.0, 0], [1.6, 0.4], [0.8, 0], [0, 0]][i],
        [[-0.8, 0], [-1.4, 0], [-1.6, 0], [-1.4, 0], [-0.6, 0], [0, 0]][i],
        [[-0.2, 0], [-0.6, 0], [-0.8, 0], [-0.6, 0], [-0.2, 0], [0, 0]][i],
      ],
    }),
  },
  hurt: {
    frames: 2, ms: [100, 150], loop: false,
    pose: (i) => ({
      bob: i ? -0.4 : -1.1, pitch: i ? 5 : 8, neckPitch: i ? -8 : -14, headNod: i ? -8 : -14,
      earTilt: -26, tailLift: 1.2, tailSway: i ? -1.4 : 1.4, tailTrail: 1.4,
      legs: [[1.6, 0], [0.8, 0.8], [-1.4, 0], [-0.6, 0]],
      flash: i === 0, shake: i === 0 ? -2.2 : 1.0,
    }),
  },
  // Smooth 5-frame collapse transition (stagger -> front knees buckle -> hindquarters drop -> ground thud -> exact `downed` frame 0!)
  // Works on all 8 species (front axle snaps & wheel cants smoothly on `cart`), and can also be played in reverse to stand back up!
  fall: {
    frames: 5, ms: [115, 120, 125, 135, 170], loop: false,
    pose: (i) => ({
      collapsed: [0.08, 0.36, 0.74, 0.96, 1.0][i],
      bob: [-1.4, -1.8, -0.8, -0.7, 0][i],
      pitch: [-6, -15, -7, -2.5, 0][i],
      neckPitch: [12, 26, 32, 34, 24][i],
      headNod: [8, 14, 18, 22, 14][i],
      earTilt: [-24, -28, -26, -26, -22][i],
      tailLift: [-0.6, -1.2, -1.8, -2.2, -2.0][i],
      tailSway: [0.6, -0.8, 0.4, -0.5, -0.4][i],
      tailTrail: [1.0, 1.2, 0.9, 0.7, 0.6][i],
      legs: [
        [[-0.8, 0], [-1.0, 0], [0, 0], [0, 0], [0, 0]][i],
        [[0.6, 0.6], [0.4, 0], [0, 0], [0, 0], [0, 0]][i],
        [[-0.6, 0], [-0.4, 0], [0, 0], [0, 0], [0, 0]][i],
        [[0.4, 0], [0.2, 0], [0, 0], [0, 0], [0, 0]][i],
      ],
      ...(i === 0 ? { shake: -1.2 } : {}),
      ...(i === 4 ? { downed: true } : {}),
    }),
  },
  downed: {
    frames: 2, ms: [320, 320], loop: true,
    pose: (i) => ({
      bob: i ? 0.35 : 0, pitch: 0, neckPitch: 24, headNod: 14, earTilt: -22,
      tailLift: -2, tailSway: i ? 0.6 : -0.4, tailTrail: 0.6,
      legs: [[0, 0], [0, 0], [0, 0], [0, 0]], collapsed: 1, downed: true,
    }),
  },
  dead: {
    frames: 1, ms: [400], loop: false,
    pose: (_i, _h = 270, S = null) => ({
      bob: S?.archetype === "clockwork" ? -1.4 : -0.5,
      pitch: S?.archetype === "clockwork" ? -13 : 0,
      neckPitch: S?.archetype === "clockwork" ? 32 : 42,
      headNod: S?.archetype === "clockwork" ? 24 : 34,
      headYaw: S?.archetype === "clockwork" ? 16 : 0,
      earTilt: -38,
      tailLift: -3.2, tailSway: 0, tailTrail: 0.2,
      legs: [[0, 0], [0, 0], [0, 0], [0, 0]], collapsed: 1, dead: true,
    }),
  },
}

// ---------------------------------------------------------------- quadruped 3D skeleton & ground alignment
const rotPitch = (o, p, f, pitchRad) => {
  if (!pitchRad) return p
  const d = sub3(p, o), df = dot3(d, f), du = d[2]
  const c = Math.cos(pitchRad), s = Math.sin(pitchRad)
  const nf = df * c - du * s, nu = df * s + du * c
  return [o[0] + d[0] + f[0] * (nf - df), o[1] + d[1] + f[1] * (nf - df), o[2] + nu]
}
// Clockwise yaw around world +Z (matching frameAt(heading + yawDeg) and sdf.rotate(-(heading + yawDeg), "z"))
const rotYaw = (o, p, yawRad) => {
  if (!yawRad) return p
  const dx = p[0] - o[0], dy = p[1] - o[1], c = Math.cos(yawRad), s = Math.sin(yawRad)
  return [o[0] + dx * c + dy * s, o[1] - dx * s + dy * c, p[2]]
}

const quadJoints = (S, p, heading, away = 0, wheelAngle = 0, offsetFwd = 0) => {
  const { f, r } = frameAt(heading)
  // Wheeled vehicle skeleton (supply cart / covered wagon): gentle suspension bounce + 4 spoked wheel hubs,
  // plus visibly damaged front axle in `downed` and crashed/wrecked chassis + fallen wheel in `dead`!
  if (S.archetype === "vehicle") {
    const collapsed = clamp(p.collapsed ?? 0, 0, 1), dead = !!p.dead, downed = !!p.downed
    const bob = dead ? -6.2 : downed ? -4.2 : collapsed > 0 ? -4.2 * collapsed + (p.bob ?? 0) * 0.25 : (p.bob ?? 0) * 0.35
    const pitchDeg = dead ? -16 : downed ? -12 : collapsed > 0 ? -12 * collapsed + (p.pitch ?? 0) * 0.12 : (p.pitch ?? 0) * 0.32
    const pitchRad = pitchDeg * RAD
    const bodyFwd = unit3(rotPitch([0, 0, 0], f, f, pitchRad))
    const bodyUp = unit3(rotPitch([0, 0, 0], UP, f, pitchRad))
    const origin = [f[0] * offsetFwd, away + f[1] * offsetFwd, S.centerZ + bob]
    const pivot = [f[0] * offsetFwd, away + f[1] * offsetFwd, S.centerZ - 1.5 + bob]
    const atV = (fwd, right, zAbs) => rotPitch(pivot, [f[0] * (fwd + offsetFwd) + r[0] * right, away + f[1] * (fwd + offsetFwd) + r[1] * right, zAbs + bob], f, pitchRad)
    const chest = atV(S.chestAt[0], 0, S.chestAt[1])
    const withers = atV(S.withersAt[0], 0, S.withersAt[1])
    const croup = atV(S.croupAt[0], 0, S.croupAt[1])
    const saddle = atV(S.saddleAt[0], 0, S.saddleAt[1])
    const saddleSeat = atV(S.saddleAt[0], 0, S.saddleSeat)
    const wheel = (wx, wy, wr, isFront) => {
      const hub = [f[0] * (wx + offsetFwd) + r[0] * wy, away + f[1] * (wx + offsetFwd) + r[1] * wy, wr]
      const hoof = [hub[0], hub[1], 0.45]
      return { sh: hub, knee: hub, fet: hub, hoof, hip: hub, stifle: hub, hock: hub, rWheel: wr, sd: Math.sign(wy), isFront }
    }
    const frontLegs = [-1, 1].map((sd) => wheel(S.frontX, sd * S.frontW, S.frontShZ, true))
    const hindLegs = [-1, 1].map((sd) => wheel(S.hindX, sd * S.hindW, S.hindHipZ, false))
    const farSide = (() => {
      const d = nearness(frontLegs[0].sh) - nearness(frontLegs[1].sh)
      return Math.abs(d) < 0.25 ? -1 : d < 0 ? 0 : 1
    })()
    const hitchTip = atV(S.halfLen + 9.2, 0, 14.5)
    return {
      S, heading, f, r, up: UP, bodyFwd, bodyUp, origin, pivot, pitchRad, pitchDeg, neckPitchDeg: 0, neckStretch: 0,
      headPitchDeg: 0, headYawDeg: 0, headF: f, headR: r, collapsed, downed, dead, wheelAngle,
      chest, withers, croup, saddle, saddleSeat,
      neckBase: hitchTip, neckMid: hitchTip, poll: hitchTip, muzzle: hitchTip, headFwd: f, headUp: UP, eyeUp: UP, eyeFwd: f, ears: [],
      tail: [croup, croup, croup, croup], frontLegs, hindLegs, farSide,
      reinsAt: atV(S.saddleAt[0] + 3.6, 0, S.saddleSeat + 3.0),
      headTop: atV(-2.0, 0, dead ? 24.0 : 35.8),
    }
  }
  const sc = S.halfLen / 8.2 // scale stride cleanly for ponies vs warhorses
  const collapsed = clamp(p.collapsed ?? 0, 0, 1)
  const bob = p.bob ?? 0
  const pitchDeg = p.pitch ?? 0
  const pitchRad = pitchDeg * RAD
  const bodyFwd = unit3(rotPitch([0, 0, 0], f, f, pitchRad))
  const bodyUp = unit3(rotPitch([0, 0, 0], UP, f, pitchRad))
  const pivotFwd = p.pivotFwd ?? 0
  const lunge = (p.lunge ?? 0) * sc + offsetFwd
  const originZ = (1 - collapsed) * S.centerZ + collapsed * (S.barrelH * 0.88) + bob
  const pivotZ = (1 - collapsed) * (pivotFwd ? S.hindHipZ - 2.0 : S.centerZ - 1.5) + collapsed * (S.barrelH * 0.88) + bob
  const origin = [f[0] * lunge, away + f[1] * lunge, originZ]
  const pivot = [f[0] * (pivotFwd + lunge), away + f[1] * (pivotFwd + lunge), pivotZ]
  const atBody = (fwd, right, zAbs) => {
    const zCol = (zAbs - S.centerZ) * 0.82 + S.barrelH * 0.92
    const zRel = (1 - collapsed) * zAbs + collapsed * zCol + bob
    const raw = [f[0] * (fwd + lunge) + r[0] * right, away + f[1] * (fwd + lunge) + r[1] * right, zRel]
    return rotPitch(pivot, raw, f, pitchRad)
  }

  const chest = atBody(S.chestAt[0], 0, S.chestAt[1])
  const withers = atBody(S.withersAt[0], 0, S.withersAt[1])
  const croup = atBody(S.croupAt[0], 0, S.croupAt[1])
  const saddle = atBody(S.saddleAt[0], 0, S.saddleAt[1])
  const saddleSeat = atBody(S.saddleAt[0], 0, S.saddleSeat)

  // Neck + Head chain (supports neckPitch, neckStretch for grazing/drinking, headNod, headYaw & split ears!)
  const neckBase = atBody(S.neckBase[0], 0, S.neckBase[1])
  const neckPitchDeg = p.neckPitch ?? 0
  const headYawDeg = p.headYaw ?? 0
  const np = neckPitchDeg * RAD, hn = (p.headNod ?? 0) * RAD, hy = headYawDeg * RAD
  const nMid0 = atBody(S.neckMid[0], 0, S.neckMid[1])
  const poll0 = atBody(S.pollAt[0], 0, S.pollAt[1])
  const muzzle0 = atBody(S.muzzleAt[0], 0, S.muzzleAt[1])
  // Keep 0.55 subtle arch on small upright pitches (bit-exact stand/walk/charge/rear), and smoothly blend
  // up to 0.90 on deep grazing/drinking neck bends so the cervical spine curves organically with zero kink!
  const midFrac = Math.abs(neckPitchDeg) <= 16 ? 0.55 : 0.55 + 0.35 * clamp((Math.abs(neckPitchDeg) - 16) / 24, 0, 1)
  let neckMid = rotPitch(neckBase, nMid0, f, -np * midFrac)
  let poll = rotPitch(neckBase, poll0, f, -np)
  const nStr = (p.neckStretch ?? 0) * sc
  if (nStr) {
    const nDir = unit3(sub3(poll, neckBase))
    neckMid = add3(neckMid, mul3(nDir, nStr * 0.5))
    poll = add3(poll, mul3(nDir, nStr))
  }
  if (hy) {
    neckMid = rotYaw(neckBase, neckMid, hy * 0.32)
    poll = rotYaw(neckBase, poll, hy * 0.65)
  }
  // Keep head resting cleanly above ground when collapsed or grazing/drinking deeply
  const pollMinZ = (1 - collapsed) * (S.craniumR[2] + 1.2) + collapsed * (S.craniumR[2] + 0.6)
  if (poll[2] < pollMinZ) poll[2] = pollMinZ
  const muzzleOff0 = sub3(rotPitch(poll0, muzzle0, f, -(np + hn)), poll0)
  const muzzle = add3(poll, hy ? rotYaw([0, 0, 0], muzzleOff0, hy) : muzzleOff0)
  const muzMinZ = (1 - collapsed) * (S.muzzleR[1] + 0.55) + collapsed * (S.muzzleR[1] + 0.4)
  if (muzzle[2] < muzMinZ) muzzle[2] = muzMinZ
  const { f: headF, r: headR } = headYawDeg ? frameAt(heading + headYawDeg) : { f, r }
  const headFwd = unit3(sub3(muzzle, poll))
  const headUp = unit3(cross3(headR, headFwd))
  // Rigidly derive (eyeFwd, eyeUp) from (headFwd, headUp) via the exact rest-pose skull angle so
  // eyes & skull stay 100% locked together through EVERY body pitch, neckPitch, headNod, headYaw, graze & gallop!
  const df0 = S.muzzleAt[0] - S.pollAt[0], dz0 = S.muzzleAt[1] - S.pollAt[1], L0 = Math.hypot(df0, dz0) || 1
  const c0 = df0 / L0, s0 = dz0 / L0
  const eyeFwd = unit3(add3(mul3(headFwd, c0), mul3(headUp, -s0)))
  const eyeUp = unit3(add3(mul3(headFwd, s0), mul3(headUp, c0)))
  const headPitchDeg = Math.atan2(dot3(eyeFwd, UP), dot3(eyeFwd, headF)) / RAD
  const earDegs = Array.isArray(p.earSplit) ? p.earSplit : [p.earTilt ?? 0, p.earTilt ?? 0]
  const ears = [-1, 1].map((sd, idx) => {
    const eb = add3(poll, add3(mul3(headUp, S.earBase[2] - S.pollAt[1]), add3(mul3(eyeFwd, S.earBase[0] - S.pollAt[0]), mul3(headR, sd * S.earBase[1]))))
    const tipOff = [S.earTip[0] - S.earBase[0], sd * (S.earTip[1] - S.earBase[1]), S.earTip[2] - S.earBase[2]]
    const et0 = add3(eb, add3(mul3(eyeFwd, tipOff[0]), add3(mul3(headR, tipOff[1]), mul3(eyeUp, tipOff[2]))))
    return { base: eb, tip: rotPitch(eb, et0, headF, earDegs[idx] * RAD) }
  })

  // Tail chain (4 control points with dynamic lift, sway, and trail!)
  const tLift = p.tailLift ?? 0, tSway = p.tailSway ?? 0, tTrail = p.tailTrail ?? 0
  const tailDock = atBody(S.tailDock[0], 0, S.tailDock[1])
  const tailArch = atBody(S.tailArch[0] - tTrail * 0.25, tSway * 0.35, S.tailArch[1] + tLift * 0.45)
  const tailMid = atBody(S.tailMid[0] - tTrail * 0.7, tSway * 0.75, S.tailMid[1] + tLift * 0.85)
  const tailTip = atBody(S.tailTip[0] - tTrail * 1.15, tSway * 1.15, Math.max(1.2, S.tailTip[1] + tLift * 1.35))

  // 4 articulated equine legs: [FL (0, left), FR (1, right), HL (2, left), HR (3, right)]
  // During `fall` (`0 < collapsed < 1`), front knees buckle slightly earlier (`cf`) than hindquarters (`ch`)
  // for authentic quadruped collapse physics, landing bit-exact on `collapsed === 1` (`downed`)!
  const legDefs = p.legs ?? [[0, 0], [0, 0], [0, 0], [0, 0]]
  const cf = collapsed >= 1 ? 1 : collapsed <= 0 ? 0 : clamp(collapsed * 1.28, 0, 1)
  const ch = collapsed >= 1 ? 1 : collapsed <= 0 ? 0 : clamp((collapsed - 0.16) / 0.84, 0, 1)
  const frontLegs = [0, 1].map((sideIdx) => {
    const sd = sideIdx ? 1 : -1, [fwd0, lift0] = legDefs[sideIdx]
    const fwd = fwd0 * sc, lift = lift0 * sc
    const sh = atBody(S.frontX, sd * S.frontW, S.frontShZ)
    const foldF = () => {
      const knee = [sh[0] + f[0] * 3.8 * sc + r[0] * sd * 1.4, sh[1] + f[1] * 3.8 * sc + r[1] * sd * 1.4, 1.5]
      const fet = [sh[0] + f[0] * 0.6 * sc + r[0] * sd * 2.4, sh[1] + f[1] * 0.6 * sc + r[1] * sd * 2.4, 1.2]
      const hoof = [fet[0] - f[0] * 0.8 + r[0] * sd * 0.5, fet[1] - f[1] * 0.8 + r[1] * sd * 0.5, 0.8]
      return { sh, knee, fet, hoof, sd, front: true }
    }
    if (cf >= 1) return foldF()
    const hoofZ = S.hoofH * 0.45 + lift
    let stand
    if (S.archetype === "clockwork") {
      // Wide-stanced splayed mechanical tortoise front pillar leg (angled boldly forward & outward matching 3D model,
      // tucking neatly beneath the raised front fenders when rearing upright on hind legs!)
      const footFwd = S.frontX + offsetFwd + 3.6 + fwd * 0.72 - Math.min(3.8, lift * 0.32), footLat = sd * (S.frontW + 2.0)
      const hoof = [f[0] * footFwd + r[0] * footLat, away + f[1] * footFwd + r[1] * footLat, hoofZ]
      const fet = [hoof[0] - f[0] * 0.85, hoof[1] - f[1] * 0.85, hoofZ + 2.4]
      const knee = lerp3(sh, fet, 0.45)
      knee[0] += f[0] * 1.15 + r[0] * sd * 0.85; knee[1] += f[1] * 1.15 + r[1] * sd * 0.85; knee[2] += 0.5 + lift * 0.35
      stand = { sh, knee, fet, hoof, sd, front: true }
    } else {
      const hoof = [f[0] * (S.frontX + offsetFwd + fwd) + r[0] * (sd * S.frontW), away + f[1] * (S.frontX + offsetFwd + fwd) + r[1] * (sd * S.frontW), hoofZ]
      const fet = [hoof[0] - f[0] * 0.75, hoof[1] - f[1] * 0.75, hoofZ + S.hoofH * 0.78]
      // Equine front knee (carpus) bends forward slightly on reach, backward when tucked/lifted
      const hint = lift > 1.2 || cf > 0 ? add3(mul3(f, 0.85), [0, 0, 0.5]) : add3(mul3(f, 0.15), [0, 0, 0.2])
      const knee = ik3(sh, fet, S.frontU, S.frontL, hint)
      stand = { sh, knee, fet, hoof, sd, front: true }
    }
    if (cf <= 0) return stand
    const fl = foldF()
    return { sh, knee: lerp3(stand.knee, fl.knee, cf), fet: lerp3(stand.fet, fl.fet, cf), hoof: lerp3(stand.hoof, fl.hoof, cf), sd, front: true }
  })

  const hindLegs = [0, 1].map((sideIdx) => {
    const sd = sideIdx ? 1 : -1, [fwd0, lift0] = legDefs[sideIdx + 2]
    const fwd = fwd0 * sc, lift = lift0 * sc
    const hip = atBody(S.hindX, sd * S.hindW, S.hindHipZ)
    const foldH = () => {
      const stifle = [hip[0] + f[0] * 2.5 * sc + r[0] * sd * 1.8, hip[1] + f[1] * 2.5 * sc + r[1] * sd * 1.8, 2.2]
      const hock = [hip[0] - f[0] * 2.2 * sc + r[0] * sd * 2.6, hip[1] - f[1] * 2.2 * sc + r[1] * sd * 2.6, 1.4]
      const fet = [hock[0] + f[0] * 3.0 * sc + r[0] * sd * 0.8, hock[1] + f[1] * 3.0 * sc + r[1] * sd * 0.8, 1.1]
      const hoof = [fet[0] + f[0] * 1.0, fet[1] + f[1] * 1.0, 0.8]
      return { hip, stifle, hock, fet, hoof, sd, front: false }
    }
    if (ch >= 1) return foldH()
    const hoofZ = S.hoofH * 0.45 + lift
    let stand
    if (S.archetype === "clockwork") {
      // Wide-stanced splayed mechanical tortoise hind pillar leg (angled boldly rear & outward matching 3D model!)
      const footFwd = S.hindX + offsetFwd - 3.6 + fwd * 0.72, footLat = sd * (S.hindW + 2.0)
      const hoof = [f[0] * footFwd + r[0] * footLat, away + f[1] * footFwd + r[1] * footLat, hoofZ]
      const fet = [hoof[0] + f[0] * 0.75, hoof[1] + f[1] * 0.75, hoofZ + 2.4]
      const stifle = lerp3(hip, fet, 0.44)
      stifle[0] += -f[0] * 1.0 + r[0] * sd * 0.85; stifle[1] += -f[1] * 1.0 + r[1] * sd * 0.85; stifle[2] += 0.4 + lift * 0.35
      const hock = lerp3(stifle, fet, 0.5)
      stand = { hip, stifle, hock, fet, hoof, sd, front: false }
    } else {
      const hoof = [f[0] * (S.hindX + offsetFwd - 1.0 * sc + fwd) + r[0] * (sd * S.hindW), away + f[1] * (S.hindX + offsetFwd - 1.0 * sc + fwd) + r[1] * (sd * S.hindW), hoofZ]
      const fet = [hoof[0] - f[0] * 0.85, hoof[1] - f[1] * 0.85, hoofZ + S.hoofH * 0.78]
      // Authentic S-curve equine hind leg: hip -> forward muscular stifle -> rear sharp hock -> vertical cannon -> fetlock -> hoof
      const stifle = atBody(S.hindX + 2.1 * sc + fwd * 0.25, sd * (S.hindW + 0.3), S.hindHipZ - S.hindThigh * 0.76 + lift * 0.35)
      const hock = ik3(stifle, fet, S.hindGaskin, S.hindCannon, add3(mul3(f, -1.0), [0, 0, 0.25]))
      stand = { hip, stifle, hock, fet, hoof, sd, front: false }
    }
    if (ch <= 0) return stand
    const fl = foldH()
    return {
      hip, stifle: lerp3(stand.stifle, fl.stifle, ch), hock: lerp3(stand.hock, fl.hock, ch),
      fet: lerp3(stand.fet, fl.fet, ch), hoof: lerp3(stand.hoof, fl.hoof, ch), sd, front: false,
    }
  })

  // Symmetric depth shading: far side legs get 1 ramp step darker when clearly deeper than near side
  const farSide = (() => {
    const d = nearness(frontLegs[0].sh) - nearness(frontLegs[1].sh)
    return Math.abs(d) < 0.25 ? -1 : d < 0 ? 0 : 1
  })()

  return {
    S, heading, f, r, up: UP, bodyFwd, bodyUp, origin, pivot, pitchRad, pitchDeg, neckPitchDeg, neckStretch: nStr, headPitchDeg, headYawDeg, headF, headR, collapsed, downed: !!p.downed, dead: !!p.dead, jawOpen: p.jawOpen ?? 0, wheelAngle,
    chest, withers, croup, saddle, saddleSeat,
    neckBase, neckMid, poll, muzzle, headFwd, headUp, eyeUp, eyeFwd, ears,
    tail: [tailDock, tailArch, tailMid, tailTip],
    frontLegs, hindLegs, farSide,
    reinsAt: add3(neckMid, mul3(UP, 0.5)),
    headTop: add3(poll, [0, 0, Math.max(S.earTip[2] - S.pollAt[1], S.craniumR[2]) + 0.6]),
  }
}

// Compute per-heading ground alignment (away offset along y) so the lowest hoof lands on the exact same ground row in all 8 dirs
const quadSolesCache = new Map()
const quadSolesOf = (S, dirs) => {
  const key = `${S.key}|${dirs.join(",")}`
  if (quadSolesCache.has(key)) return quadSolesCache.get(key)
  const restP = MOUNT_MOVES.stand.pose(0, 270)
  const low = (deg) => {
    const q = quadJoints(S, restP, deg, 0)
    let m = -Infinity
    for (const L of [...q.frontLegs, ...q.hindLegs]) {
      const s = -(L.hoof[1] - S.hoofR) * SP - (L.hoof[2] - S.hoofH * 0.45) * CP
      if (s > m) m = s
    }
    return m
  }
  const ref = low(180)
  const out = new Map(dirs.map((d) => [d, (low(DIR_DEG[d]) - ref) / (SP || 1)]))
  quadSolesCache.set(key, out)
  return out
}

// ---------------------------------------------------------------- 3D sculpted mount SDF builder
// Coat pattern paint function (handles stockings, white facial blaze, dapple spots, pinto patches, subtle underside shade)
const coatPainter = (q, coatPreset, far = false, keys = MKEYS) => {
  const C1 = dim(keys.coat, far), C2 = dim(keys.coat2, far)
  const pts = coatPreset.points, S = q.S
  return (p, n) => {
    if (pts === "dapple") {
      const v = sdf.fbm(p[0] * 0.42, p[1] * 0.42, p[2] * 0.42, 11, 2)
      if (v > 0.61) return C2
    } else if (pts === "pinto") {
      const v = sdf.fbm(p[0] * 0.16, p[1] * 0.16, p[2] * 0.16, 7, 2)
      if (v > 0.52) return C2
    }
    // subtle underside belly darkening
    if (n[2] < -0.55) return C1.slice(0, 2)
    return C1
  }
}

// Build all 3D SDF parts of a mount (plus separate barrel/neck occlusion fields for modular depth-clipping!)
const buildMountParts = (q, spec, coatPreset, keys = MKEYS) => {
  const arch = q.S.archetype
  if (arch === "skeleton") return buildBoneSteedParts(q, spec, coatPreset, keys)
  if (arch === "bull") return buildBullParts(q, spec, coatPreset, keys)
  if (arch === "clockwork") return buildClockworkParts(q, spec, coatPreset, keys)
  if (arch === "wolf") return buildWolfParts(q, spec, coatPreset, keys)
  if (arch === "vehicle") return buildCartParts(q, spec, coatPreset, keys)
  return buildEquineParts(q, spec, coatPreset, keys)
}

const buildEquineParts = (q, spec, coatPreset, keys = MKEYS) => {
  const S = q.S, parts = {}
  const C1 = keys.coat, C2 = keys.coat2, MN = keys.mane, HV = keys.hooves
  const SD = keys.saddle, BL = keys.blanket, TR = keys.trim, BD = keys.barding, MT = keys.metal, EY = keys.eye
  const yaw = -q.heading
  const headYaw = -(q.heading + q.headYawDeg)
  const bodyRot = (fld) => (Math.abs(q.pitchDeg) > 0.2 ? fld.rotate(q.pitchDeg, "x").rotate(yaw, "z") : fld.rotate(yaw, "z"))
  const headRot = (fld) => (Math.abs(q.headPitchDeg) > 0.2 ? fld.rotate(q.headPitchDeg, "x").rotate(headYaw, "z") : fld.rotate(headYaw, "z"))
  const bodyPaint = coatPainter(q, coatPreset, false, keys)

  // 1. Sculpted equine body barrel (smoothly blended chest + ribcage + withers + muscular croup)
  const chestBall = bodyRot(sdf.ellipsoid(S.chestR)).at(q.chest)
  const croupBall = bodyRot(sdf.ellipsoid(S.croupR)).at(q.croup)
  const withersBall = bodyRot(sdf.ellipsoid(S.withersR)).at(q.withers)
  const ribSpan = sdf.capsule(q.croup, q.chest, S.barrelW * 0.96, S.barrelW * 0.92)
  // Slight saddle-back contour (natural dip between withers and croup)
  const bellyFill = sdf.capsule(add3(q.croup, mul3(q.bodyUp, -1.2)), add3(q.chest, mul3(q.bodyUp, -1.1)), S.barrelW * 0.9, S.barrelW * 0.88)
  const barrelField = sdf.union(chestBall, croupBall, withersBall, ribSpan, bellyFill, { smooth: 1.85 })
    .intersect(sdf.plane([0, 0, -1], 0.1))
  parts.mount_body = barrelField.paint(bodyPaint)

  // 2. High arched muscular neck (`mount_neck`, separate part so jaw/face gets crisp dark inner seam against neck & chest!)
  const neckDir = unit3(sub3(q.poll, q.neckBase))
  const neckDorsal = unit3(cross3(q.r, neckDir))
  const deepBend = Math.abs(q.neckPitchDeg) > 16 || Math.abs(q.headYawDeg) > 2 || Math.abs(q.pitchDeg) > 18
  const neckTop = add3(q.poll, add3(mul3(q.eyeFwd, -0.75), mul3(q.eyeUp, -1.0)))
  const neckSeg1 = sdf.capsule(q.neckBase, q.neckMid, S.neckR[0], S.neckR[1])
  const neckSeg2 = sdf.capsule(q.neckMid, neckTop, S.neckR[1], S.neckR[2])
  // Dorsal neck crest arch sweeping gracefully from withers to poll (follows mid-neck when deeply bent so grazing/drinking never kinks!)
  const crestEnd = Math.abs(q.neckPitchDeg) > 16
    ? add3(q.neckMid, mul3(neckDorsal, S.neckR[1] * 0.48))
    : add3(q.poll, add3(mul3(q.eyeFwd, -1.0), mul3(q.eyeUp, -0.4)))
  const crestFill = sdf.capsule(add3(q.withers, mul3(q.bodyFwd, 1.1)), crestEnd, S.neckR[0] * 0.7, Math.abs(q.neckPitchDeg) > 16 ? S.neckR[1] * 0.88 : S.neckR[2] * 0.82)
  const neckField = sdf.union(neckSeg1, neckSeg2, crestFill, { smooth: 0.85 })
  parts.mount_neck = neckField.paint(bodyPaint)

  // 2b. True sculpted 3D equine skull (`mount_head`): diamond forehead wider across the eyes (6-7px in S view!),
  //     rounded cheek jowls, sleek bridge tapering to a soft 4-5px velvety muzzle with nostrils, and clear eyes!
  const muzzleLen = len3(sub3(q.muzzle, q.poll)) || 1
  const cranium = headRot(sdf.ellipsoid(S.craniumR)).at(q.poll)
  // Distinct wide supraorbital brow/temple ridge so forehead forms a true equine diamond in S view!
  const browPos = add3(q.poll, add3(mul3(q.headFwd, 2.0), mul3(q.headUp, 0.28)))
  const browDiamond = headRot(sdf.ellipsoid([S.craniumR[0] * 1.08, 1.95, 1.55])).at(browPos)
  const jawPos = add3(q.poll, add3(mul3(q.headFwd, 1.8), mul3(q.headUp, -1.45)))
  const jowl = headRot(sdf.ellipsoid(S.jawR)).at(jawPos)
  // Anisotropic tapered nasal bridge (broader across in S view, sleek front-to-back in W/SW profile!)
  const bridgeMid = add3(q.poll, add3(mul3(q.headFwd, muzzleLen * 0.56), mul3(q.headUp, 0.14)))
  const bridgeMidVol = headRot(sdf.ellipsoid([S.muzzleR[0] * (S.key === "warhorse" ? 0.96 : 1.06), S.key === "warhorse" ? 1.98 : 2.1, 1.55])).at(bridgeMid)
  const bridgeCap = sdf.capsule(browPos, add3(q.poll, mul3(q.headFwd, muzzleLen * 0.90)), S.muzzleR[0] * 0.86, S.muzzleR[1] * 1.04)
  const muzzleTip = headRot(sdf.ellipsoid([S.muzzleR[1] * 1.18, S.muzzleR[1] * 1.06, S.muzzleR[1] * 0.96])).at(q.muzzle)
  const chinLip = sdf.capsule(jawPos, add3(q.muzzle, mul3(q.headUp, -0.45)), S.muzzleR[0] * 0.62, S.muzzleR[1] * 0.72)
  const skullField = sdf.union(cranium, browDiamond, jowl, bridgeMidVol, bridgeCap, muzzleTip, chinLip, { smooth: 0.68 })

  const hasBridle = spec.bridle !== false
  const hasChanfron = spec.barding === "full" || spec.barding === "chanfron"
  const glowEye = ["ghost", "red", "blue", "amber"].includes(spec.colors?.eye)
  // Anterolateral brow-corner eyes parameterized in rigidly skull-locked (eyeFwd, eyeUp, r) space so
  // eyes stay rock-solid (1x2 on horses/warhorses, crisp on ponies) across ALL 8 dirs AND every animation!
  const [eyeF0, eyeGain, eyeFh, eyeZc, eyeZh, eyeLatMin, eyeLatMaxSW] = S.eyeBox ?? [1.58, 1.25, 0.48, -1.52, 0.98, 1.38, 2.38]
  const frontness = Math.max(0, -q.headF[1]) // 1 in S, 0.707 in SW/SE, 0 in W/E/NW/NE/N (smooth & L/R symmetric!)
  const facingAway = q.headF[1] > 0.2        // NW/NE/N: tighten upper eye corner so rear 3/4 shows a crisp 1x1 eye!
  const animPad = Math.abs(q.headPitchDeg) > 1.0 || Math.abs(q.headYawDeg) > 1.0 ? 0.14 : 0 // prevent 1-px sub-pixel eye dropout during animations!
  const eyeFc = eyeF0 + (frontness > 0.85 && S.key === "pony" ? 0.0 : frontness * eyeGain) + (facingAway ? (S.key === "pony" ? -0.95 : 0.68) : 0)
  const eyeHalf = eyeFh + animPad + (frontness > 0.85 ? 0.72 : facingAway ? 0.15 : 0)
  const eyeZcEff = eyeZc - (hasChanfron ? frontness * 0.42 : (S.key === "pony" && frontness > 0.3 && frontness < 0.85 ? -0.32 : 0))
  const muzFrac = S.muzzleFrac ?? 0.78
  const headPaint = (p, n) => {
    const rel = sub3(p, q.poll), along = dot3(rel, q.headFwd), lat = Math.abs(dot3(rel, q.headR)), upH = dot3(rel, q.headUp)
    const fwdP = dot3(rel, q.eyeFwd), zP = dot3(rel, q.eyeUp)
    // Symmetrical anterolateral brow eyes with smooth foreshortening compensation & grazing-angle cull
    // (eliminates far-eye edge bleed in SW/SE and delivers crisp consistent eyes across all 8 dirs & animations!)
    const minView = frontness > 0.3 && frontness < 0.85 ? 0.42 - animPad * 0.6 : -1
    const eyeZhEff = (S.key === "pony" && frontness > 0.3 && frontness < 0.85 ? eyeZh + 0.38 : eyeZh) + animPad * 0.85
    if (lat >= eyeLatMin - animPad * 0.5 && Math.abs(fwdP - eyeFc) <= eyeHalf && Math.abs(zP - eyeZcEff) <= eyeZhEff && dot3(n, CAM_DIR) >= minView) {
      const sideClip = frontness > 0.3 && frontness < 0.85 && lat > eyeLatMaxSW + animPad
      const awayClip = facingAway && zP > eyeZcEff + (S.key === "warhorse" ? -0.25 : S.key === "horse" ? -0.10 : 0.65)
      const frontClip = hasChanfron && frontness > 0.85 && lat > S.craniumR[0] * 0.90
      if (!sideClip && !awayClip && !frontClip) {
        const df = (fwdP - eyeFc) / eyeHalf, dz = (zP - eyeZcEff) / eyeZhEff
        return glowEye && df * df + dz * dz < 0.35 ? EY[1] : EY[0]
      }
    }
    // Crisp twin dark nostrils on the front-outer sides of the soft velvety muzzle
    if (along >= muzzleLen * 0.82 && along <= muzzleLen * 1.04 && lat >= S.muzzleR[1] * 0.36 && lat <= S.muzzleR[1] * 0.95 && upH >= 0.0 && upH <= 1.55) {
      return EY[0]
    }
    // Dark lower chin/jaw underside for crisp 3D depth under muzzle
    if (upH < -S.muzzleR[1] * 0.62 && along > muzzleLen * 0.32) return C1[0]
    // Subtle lower lateral cheekpiece strap connecting to the bit rings (kept off the cheek below the eye!)
    if (hasBridle && !hasChanfron) {
      if (lat > S.muzzleR[1] * 1.35 && upH < 0.05 && along > 2.8 && along < muzzleLen * 0.72 && Math.abs(upH + 0.08 * along - 0.12) < 0.25) return SD[0]
    }
    // Soft velvety dark muzzle tip
    if (along > muzzleLen * muzFrac) return coatPreset.points === "muzzle" ? C2.slice(0, 2) : C2[0] + C2[1]
    // Sunlit white facial blaze (or bright diamond forehead + center bridge highlight!)
    if (coatPreset.points === "blaze" && along > 0.7 && along < muzzleLen * muzFrac && lat < (along < 3.0 ? 0.85 : 0.56) && upH > 0.15) return "G"
    // Clean sunlit forehead diamond & center bridge ridge (brighter between the eyes so S view pops!)
    const bridgeW = along < 3.2 ? 1.18 : 0.72
    if (along > 0.6 && along < muzzleLen * Math.min(0.76, muzFrac) && lat < bridgeW && upH > 0.18) return C1.slice(2)
    // Gentle cheek plane shading on outer lower muzzle below the eyes
    if (along > muzzleLen * 0.44 && along < muzzleLen * 0.74 && lat > 1.05 && upH < 0.15) return C1.slice(0, 2)
    // Keep black coats from dropping to pitch-black C1[0] directly behind/below the eye so the eye pops cleanly!
    if (coatPreset === COATS.black && !facingAway && frontness < 0.85 && lat > S.craniumR[0] * 0.72 && zP < eyeZcEff + 0.1 && zP > eyeZcEff - eyeZhEff - 1.2 && fwdP < eyeFc + 0.4 && fwdP > eyeFc - eyeHalf - 0.5) return C1[2]
    return bodyPaint(p, n)
  }
  const earFields = q.ears.map((E) => sdf.capsule(E.base, E.tip, S.earR[0], S.earR[1]).paint((p) => {
    const along = dot3(sub3(p, E.base), q.headF)
    return along > 0.18 ? C2.slice(0, 2) : C1
  }))
  parts.mount_head = [skullField.paint(headPaint), ...earFields]

  // 3. Lush dorsal mane running cleanly down the back of the neck (stays strictly BELOW the open V-notch
  //    between the ears and tracks the true dorsal neck normal when grazing/drinking or shaking head!)
  const backNeck = deepBend ? neckDorsal : unit3(add3(mul3(q.f, -0.86), mul3(UP, 0.51)))
  const mOff = (pt, d) => add3(pt, mul3(backNeck, d))
  const m0 = deepBend
    ? add3(q.poll, add3(mul3(neckDorsal, 0.9), mul3(neckDir, -0.35)))
    : add3(q.poll, add3(mul3(q.f, -0.9), [0, 0, -0.15]))
  const m1 = mOff(lerp3(q.poll, q.neckMid, 0.42), S.neckR[2] * 0.92)
  const m2 = mOff(q.neckMid, S.neckR[1] * 0.96)
  const m3 = mOff(lerp3(q.neckMid, q.neckBase, 0.52), S.neckR[0] * 0.84)
  const m4 = add3(q.withers, add3(mul3(q.bodyFwd, 1.0), mul3(q.bodyUp, 1.45)))
  // Compact neat forelock dipping FORWARD onto the upper forehead (never rising upward between the ears!)
  const foreRoot = add3(q.poll, add3(mul3(q.headFwd, 0.45), mul3(q.headUp, 0.92)))
  const foreTip = add3(q.poll, add3(mul3(q.headFwd, 2.15 * S.forelock), mul3(q.headUp, 0.72)))
  const mt = S.maneThick
  const maneCore = sdf.union(
    sdf.capsule(m0, m1, mt * 0.65, mt * 0.96),
    sdf.capsule(m1, m2, mt * 0.96, mt * 1.12),
    sdf.capsule(m2, m3, mt * 1.12, mt * 1.02),
    sdf.capsule(m3, m4, mt * 0.98, mt * 0.55),
    sdf.capsule(foreRoot, foreTip, mt * 0.44, mt * 0.18),
    // Side-cascading locks along mid/lower crest (kept below poll so ears stay clean & distinct!)
    sdf.capsule(add3(m1, mul3(q.r, mt * 0.35)), add3(m2, add3(mul3(q.r, mt * 0.52), [0, 0, -1.2 * S.maneLen])), mt * 0.56, mt * 0.4),
    sdf.capsule(add3(m1, mul3(q.r, -mt * 0.35)), add3(m2, add3(mul3(q.r, -mt * 0.52), [0, 0, -1.2 * S.maneLen])), mt * 0.56, mt * 0.4),
    { smooth: 0.48 },
  )
  const hasCrinet = spec.barding === "full"
  if (!hasCrinet) {
    parts.mount_mane = maneCore.paint((p) => {
      const band = Math.sin((p[0] * q.f[0] + p[1] * q.f[1]) * 1.8 + p[2] * 1.3)
      return band > 0.35 ? MN.slice(1) : band < -0.45 ? MN.slice(0, 2) : MN
    })
  }

  // 4. Sculpted arching tail plume
  const [td, ta, tm, tt] = q.tail, tr = S.tailR
  const tailField = sdf.union(
    sdf.capsule(td, ta, tr[0], tr[1]),
    sdf.capsule(ta, tm, tr[1], tr[2]),
    sdf.capsule(tm, tt, tr[2], tr[3]),
    { smooth: 0.75 },
  ).intersect(sdf.plane([0, 0, -1], 0.1))
  parts.mount_tail = tailField.paint((p, n) => {
    const strand = Math.sin((p[0] * q.r[0] + p[1] * q.r[1]) * 2.5 + p[2] * 0.7)
    // Keep tail plume full & readable against dark barding/caparison (outlineMountForeground adds crisp `k` separation behind it!)
    if (p[2] < tt[2] + 2.0) return MN.slice(0, 3)
    return strand > 0.25 ? MN.slice(2) : strand < -0.55 && n[2] < 0 ? MN.slice(0, 3) : MN.slice(1)
  })

  // 5. Four anatomically sculpted legs (far legs shaded 1 step darker, dark stockings, feathered fetlocks, sloped hooves)
  const lr = S.legR, hasStockings = coatPreset.points === "stockings"
  const pureFront = Math.abs(q.f[0]) < 0.1 && q.f[1] < -0.5 // S view: symmetric leg-local cylinder shading on both front legs & hooves!
  const isPaleHoof = (spec.colors?.hooves ?? coatPreset.hooves) === "pale"
  const hoofShape = (fet, hoof, far, isHind = false) => {
    const hv = dim(HV, far), sk = dim(C1, far)
    const tip = add3(hoof, add3(mul3(q.f, 0.55), [0, 0, -S.hoofH * 0.35]))
    const topLift = pureFront && !isHind ? S.hoofH * 0.32 : S.hoofH * 0.48
    const hoofBox = sdf.capsule(add3(hoof, [0, 0, topLift]), tip, S.hoofR * 0.85, S.hoofR * 1.04)
      .intersect(sdf.plane([0, 0, -1], 0.05))
      .paint((p) => {
        // In front (S) view, use leg-local x (`p[0] - hoof[0]`) so BOTH left and right hooves get
        // 100% symmetric 3D cylinder shading (never skewed by sub-pixel grid alignment)!
        if (pureFront) {
          if (isHind) return hv[1]
          if (p[2] < 0.65) return isPaleHoof ? hv[0] : hv[1]
          return p[0] - hoof[0] < -0.52 ? hv[1] : hv[2]
        }
        return p[2] < 0.45 ? HV[0] : hv
      })
    if (S.feather > 0) {
      const tuft = sdf.capsule(lerp3(fet, hoof, 0.2), add3(hoof, add3(mul3(q.f, -0.35), [0, 0, 0.55])), lr[3] * 1.15, S.hoofR * (1.02 + S.feather * 0.25))
        .mat(hasStockings ? dim(C2, far) : sk)
      return sdf.union(hoofBox, tuft, { smooth: 0.2 })
    }
    return hoofBox
  }
  q.frontLegs.forEach((L, i) => {
    const far = i === q.farSide, lp = coatPainter(q, coatPreset, far, keys), stock = dim(C2, far)
    const legUpper = sdf.capsule(L.sh, L.knee, lr[0], lr[1])
    const legLower = sdf.capsule(L.knee, L.fet, lr[1] * 0.92, lr[2])
    const pastern = sdf.capsule(L.fet, add3(L.hoof, [0, 0, S.hoofH * 0.45]), lr[2] * 0.94, lr[3])
    const legBody = sdf.union(legUpper, legLower, pastern, { smooth: 0.38 }).paint((p, n) => {
      const lx = p[0] - L.hoof[0]
      if (hasStockings && p[2] < L.knee[2] - (pureFront ? 0.35 : 0.5)) {
        if (pureFront) return lx < -0.52 ? stock[1] : stock[2]
        if (!far && n[0] > 0.35 && p[2] < L.fet[2] + 1.8) return stock[1] // keep near rear fetlock distinct from black outline
        return stock
      }
      // In S view, shade only the left column of the lower cylindrical leg (`p[2] < L.knee[2] - 0.2`) identically on both legs!
      if (pureFront && p[2] < L.knee[2] - 0.2) return lx < -0.52 ? C1[1] : C1[2]
      return lp(p, n)
    })
    parts[`mount_fleg${i}`] = [legBody, hoofShape(L.fet, L.hoof, far)]
  })
  const smoothHindBodies = []
  const smoothHindLegs = []
  q.hindLegs.forEach((L, i) => {
    const far = i === q.farSide, lp = coatPainter(q, coatPreset, far, keys), stock = dim(C2, far)
    const thigh = sdf.capsule(L.hip, L.stifle, lr[0] * 1.28, lr[0] * 0.95)
    const gaskin = sdf.capsule(L.stifle, L.hock, lr[0] * 0.92, lr[1] * 0.96)
    const cannon = sdf.capsule(L.hock, L.fet, lr[1] * 0.88, lr[2])
    const pastern = sdf.capsule(L.fet, add3(L.hoof, [0, 0, S.hoofH * 0.45]), lr[2] * 0.94, lr[3])
    const legRaw = sdf.union(thigh, gaskin, cannon, pastern, { smooth: 0.45 })
    if (S.smoothHind && !far) {
      // On compact stocky ponies, blend non-far hindquarters seamlessly into `mount_body` so no
      // inner dark part seam cuts across the plump rump in W/NW views; keep hooves separate!
      smoothHindBodies.push(legRaw)
      smoothHindLegs.push(L)
      parts[`mount_hhoof${i}`] = hoofShape(L.fet, L.hoof, far, true)
    } else {
      const legBody = legRaw.paint((p, n) => {
        if (hasStockings && p[2] < L.hock[2] - 0.4) return stock
        return lp(p, n)
      })
      parts[`mount_hleg${i}`] = [legBody, hoofShape(L.fet, L.hoof, far, true)]
    }
  })
  if (smoothHindBodies.length) {
    const shSmooth = typeof S.smoothHind === "number" ? S.smoothHind : 0.82
    parts.mount_body = sdf.union(barrelField, ...smoothHindBodies, { smooth: shSmooth })
      .intersect(sdf.plane([0, 0, -1], 0.1))
      .paint((p, n) => {
        if (hasStockings) {
          for (const L of smoothHindLegs) {
            if (p[2] < L.hock[2] - 0.4 && Math.hypot(p[0] - L.fet[0], p[1] - L.fet[1]) < 4.5) return C2
          }
        }
        return bodyPaint(p, n)
      })
  }

  // 6. Caparison / Saddlecloth blanket (rigidly pitched with bodyFwd/bodyUp so tack stays locked in walk/charge/rear!)
  const capMode = spec.caparison ?? "none"
  const hasCap = capMode === "full" || capMode === "half"
  const atBodyRel = (pt, df, dr, du) => add3(pt, add3(mul3(q.bodyFwd, df), add3(mul3(q.r, dr), mul3(q.bodyUp, du))))
  if (hasCap) {
    // Full draped heraldic caparison covering withers, croup, chest & flanks cleanly (zero rump/thigh bleed!),
    // while keeping a slight saddle-back hollow under the proud leather war-saddle!
    const capLen = capMode === "full" ? 1.0 : 0.7
    const zBotRel = q.collapsed ? -S.barrelH * 0.8 : -S.barrelH * (0.9 + 0.52 * capLen)
    const zTopRel = S.withersAt[1] - S.centerZ + S.withersR[2] + 1.2
    const capCore = sdf.union(
      bodyRot(sdf.ellipsoid([S.chestR[0] + 0.54, S.chestR[1] + 0.60, S.chestR[2] + 0.58])).at(atBodyRel(q.chest, 0, 0, -0.25)),
      bodyRot(sdf.ellipsoid([S.croupR[0] + 0.58, S.croupR[1] + 0.64, S.croupR[2] + 0.62])).at(atBodyRel(q.croup, 0, 0, -0.22)),
      bodyRot(sdf.ellipsoid([S.withersR[0] + 0.45, S.withersR[1] + 0.50, S.withersR[2] + 0.35])).at(q.withers),
      sdf.capsule(atBodyRel(q.croup, 0, 0, -0.45), atBodyRel(q.chest, 0, 0, -0.45), S.barrelW + 0.48, S.barrelW + 0.48),
      // Lower draped skirt panels hanging cleanly down the flanks (covering hind thighs completely!)
      sdf.capsule(atBodyRel(q.croup, 0, 0, -S.barrelH * 0.92 * capLen), atBodyRel(q.chest, 0, 0, -S.barrelH * 0.92 * capLen), S.barrelW + 0.66, S.barrelW + 0.66),
      { smooth: 1.4 },
    )
      .intersect(sdf.plane(mul3(q.bodyUp, -1), -(dot3(q.origin, q.bodyUp) + zBotRel)))
      .intersect(sdf.plane(q.bodyUp, dot3(q.origin, q.bodyUp) + zTopRel))
      .intersect(sdf.plane([0, 0, -1], 0.4))
    const capField = capCore.paint((p) => {
      const rel = sub3(p, q.origin), df = dot3(rel, q.bodyFwd), du = dot3(rel, q.bodyUp)
      const rim = du < zBotRel + 1.4 || Math.abs(df) > S.halfLen + S.chestR[1] - 1.15
      if (rim) return du < zBotRel + 0.55 ? TR.slice(0, 2) : TR
      // Crisp vertical cloth drape folds + subtle heraldic mid-seam accent
      if (Math.abs(df) < 0.55 && du < -0.5) return TR.slice(0, 2)
      const fold = Math.sin(df * 0.92)
      return fold < -0.52 ? BL.slice(0, 2) : fold > 0.65 && du > -2.0 ? BL.slice(1) : BL
    })
    parts.mount_caparison = capField
  } else if (spec.blanket !== false) {
    // Contoured saddlecloth capsule hugging the ribcage (`S.barrelW + 0.38`) cleanly UNDER the leather
    // saddle (trimmed below `saddle - 1.35` so ZERO cloth clips the seat or bulges in S/N views,
    // while framing the saddle flap evenly with a crisp trim border across SW, W, NW & N!)
    const bBack = -S.halfLen * 0.54, bFront = S.halfLen * 0.34
    const zTopBlanket = dot3(q.saddle, q.bodyUp) - 1.35
    const zBotBlanket = dot3(q.origin, q.bodyUp) - 0.85
    const blanket = sdf.capsule(
      atBodyRel(q.saddle, bBack, 0, -2.75),
      atBodyRel(q.saddle, bFront, 0, -2.75),
      S.barrelW + 0.38,
      S.barrelW + 0.34,
    )
      .intersect(sdf.plane(q.bodyUp, zTopBlanket))
      .intersect(sdf.plane(mul3(q.bodyUp, -1), -zBotBlanket))
      .paint((p) => {
        const df = dot3(sub3(p, q.saddle), q.bodyFwd), du = dot3(p, q.bodyUp)
        if (du < zBotBlanket + 0.85 || df < bBack - 0.35 || df > bFront + 0.35) return TR
        return BL
      })
    parts.mount_blanket = blanket
  }

  // 7. Solid sculpted leather saddle (pommel, cantle, full unbroken seat ABOVE blanket/caparison, snug side
  //    flaps, solid >=1px stirrup straps + stirrup irons, optional compact saddlebags & bedroll!)
  const capLift = hasCap ? 0.92 : 0.25
  if (spec.saddle !== false) {
    const hiBack = spec.barding === "full" ? 1.55 : 1.0
    const capOut = hasCap ? 0.62 : 0.16
    const flankW = S.barrelW + capOut
    const pommel = bodyRot(sdf.ellipsoid([S.barrelW * (hasCap ? 0.74 : 0.56), 1.48, 1.85 * hiBack])).at(atBodyRel(q.saddle, 3.0, 0, 0.72 * hiBack + capLift * 0.62))
    const cantle = bodyRot(sdf.ellipsoid([S.barrelW * (hasCap ? 0.78 : 0.62), 1.68, 2.05 * hiBack])).at(atBodyRel(q.saddle, -3.35, 0, 0.95 * hiBack + capLift * 0.62))
    const seat = bodyRot(sdf.ellipsoid([S.barrelW * (hasCap ? 0.94 : 0.84), 3.6, hasCap ? 1.85 : 1.55])).at(atBodyRel(q.saddle, 0, 0, -0.22 + capLift))
    // Contoured leather saddle flaps hugging the blanket/caparison cleanly (proud on flanks in SW/W/NW, sleek in S/N!)
    const flaps = [-1, 1].map((sd) => bodyRot(sdf.ellipsoid([hasCap ? 0.84 : 0.52, hasCap ? 2.65 : 2.15, hasCap ? 3.15 : 2.55])).at(atBodyRel(q.saddle, 0.1, sd * (flankW - 0.12), -2.65 + capLift * 0.4)))
    // Solid >=1px leather stirrup straps + iron stirrups anchored cleanly on the lower flank (never dangling or blinking!)
    const stirDrop = hasCap ? S.rider.stirrupDrop + 0.4 : S.barrelH * 0.88 + 0.5
    const stirrups = [-1, 1].map((sd) => {
      const top = atBodyRel(q.saddle, 0.5, sd * (flankW + (hasCap ? 0.12 : 0.04)), -1.8 + capLift * 0.4)
      const bot = atBodyRel(q.saddle, 0.6, sd * (flankW + (hasCap ? 0.02 : -0.06)), -stirDrop)
      return [
        sdf.capsule(top, bot, 0.46, 0.46).mat(SD.slice(0, 3)),
        bodyRot(sdf.ellipsoid([0.44, 0.95, 0.85])).at(bot).mat(MT),
      ]
    }).flat()
    const saddleCore = sdf.union(pommel, cantle, seat, ...flaps, { smooth: 0.45 }).paint((p) => {
      const dz = dot3(sub3(p, q.saddle), q.bodyUp) - capLift
      return dz > 0.85 ? SD.slice(1) : dz < -3.0 ? SD.slice(0, 2) : SD
    })
    const saddleParts = [saddleCore, ...stirrups]
    if (spec.bags) {
      // Compact travel bedroll & snugly tucked leather saddlebags behind cantle (cleanly separated from flap & inside S/N silhouette!)
      const rollA = atBodyRel(q.saddle, -4.6, -S.barrelW * 0.56, 0.55)
      const rollB = atBodyRel(q.saddle, -4.6, S.barrelW * 0.56, 0.55)
      saddleParts.push(sdf.capsule(rollA, rollB, 0.90, 0.90).paint((p) => {
        const lat = Math.abs(dot3(sub3(p, q.saddle), q.r))
        return Math.abs(lat - S.barrelW * 0.32) < 0.4 ? SD.slice(0, 2) : BL
      }))
      for (const sd of [-1, 1]) {
        const bag = bodyRot(sdf.ellipsoid([0.78, 1.62, 1.72])).at(atBodyRel(q.saddle, -4.8, sd * (S.barrelW - 0.24), -2.0))
        saddleParts.push(bag.paint((p) => (dot3(sub3(p, q.saddle), q.bodyUp) > -1.35 ? SD.slice(1) : SD.slice(0, 3))))
      }
    }
    parts.mount_saddle = saddleParts
  }

  // 8. Steel barding armor (tight contoured chanfron faceplate leaving ears/eyes/muzzle visible, crinet, peytral)
  const bard = spec.barding ?? "none"
  if (bard === "full" || bard === "chanfron") {
    const metalPaint = (p, n) => SHINE(BD, n)
    // Sleek fitted chanfron hugging forehead & upper nasal bridge (bold gleaming faceplate with clean eyes & nose!)
    const chTop = add3(q.poll, add3(mul3(q.headFwd, 0.3), mul3(q.headUp, 1.42)))
    const chMid = add3(q.poll, add3(mul3(q.headFwd, muzzleLen * 0.46), mul3(q.headUp, 0.92)))
    const chTip = add3(q.poll, add3(mul3(q.headFwd, muzzleLen * 0.74), mul3(q.headUp, 0.56)))
    const boss = add3(q.poll, add3(mul3(q.headFwd, 1.4), mul3(q.headUp, 2.15)))
    const chanfron = sdf.union(
      sdf.capsule(chTop, chMid, 1.28, 1.06),
      sdf.capsule(chMid, chTip, 1.02, 0.62),
      sdf.capsule(chTop, boss, 0.5, 0.2),
      { smooth: 0.3 },
    ).paint((p, n) => {
      const lat = Math.abs(dot3(sub3(p, q.poll), q.headR))
      return lat < 0.28 ? BD.slice(2, 5) : metalPaint(p, n)
    })
    const bardParts = [chanfron]
    if (bard === "full") {
      // Articulated crinet lames overlapping cleanly along the neck crest
      for (let k = 0; k < 5; k++) {
        const t0 = k / 5, t1 = (k + 0.86) / 5
        const a = lerp3(m0, m4, t0), b = lerp3(m0, m4, t1)
        const rPlate = 1.25 + 0.35 * t0
        bardParts.push(sdf.capsule(a, b, rPlate, rPlate * 1.06).paint((p) => {
          const along = dot3(sub3(p, a), unit3(sub3(b, a)))
          return along < 0.45 ? BD.slice(0, 2) : along > len3(sub3(b, a)) - 0.5 ? BD.slice(2, 4) : BD.slice(1, 4)
        }))
      }
      // Contoured steel peytral hugging the warhorse chest smoothly over the caparison (with gold trim rim!)
      const pCenter = atBodyRel(q.chest, 0.55, 0, 0.25)
      const peytral = bodyRot(sdf.ellipsoid([S.chestR[0] + 0.72, S.chestR[1] + 0.72, S.chestR[2] * 0.58])).at(pCenter)
        .intersect(sdf.plane(mul3(q.bodyFwd, -1), -(dot3(q.chest, q.bodyFwd) + 0.2)))
        .paint((p, n) => {
          const dz = dot3(sub3(p, pCenter), q.bodyUp)
          return dz < -S.chestR[2] * 0.40 || dz > S.chestR[2] * 0.40 ? TR : metalPaint(p, n)
        })
      bardParts.push(peytral)
    }
    parts.mount_barding = bardParts
  }

  // 9. Solid bit rings & continuous fixed-length leather reins draping along both sides of the neck and looping
  //    OVER THE TOP of the neck/withers. When the horse lowers its head (graze/drink), an exact arc-length
  //    bisection solver slides the loop forward along the neck spine so the true 3D leather length NEVER stretches!
  if (spec.bridle !== false) {
    const bitPts = [-1, 1].map((sd) => add3(q.poll, add3(mul3(q.headFwd, muzzleLen * 0.78), add3(mul3(q.headR, sd * (S.muzzleR[1] * 0.96)), mul3(q.headUp, -0.42)))))
    const scaleH = S.halfLen / 8.2
    const neckMidLat = Math.max(S.neckR[1], S.neckR[0] * 0.80) + (hasCap ? 0.58 : 0.34)
    const shLat = S.withersR[0] * 0.80 + (hasCap ? 0.72 : 0.26)
    const topLat = S.withersR[0] * (hasCap ? 0.46 : 0.52) + (hasCap ? 0.55 : 0.28)
    // Rest crest anchor nestled cleanly in the groove between the end of the mane/crinet and the saddle pommel
    const crestBase = lerp3(q.withers, q.saddle, 0.22)
    const crestH = S.withersR[2] + (hasCap ? 0.95 : 0.55)
    const rCrest0 = add3(crestBase, mul3(q.bodyUp, crestH))
    const reinSegs = []
    const bitRings = []
    if (q.neckPitchDeg <= 16) {
      for (let idx = 0; idx < 2; idx++) {
        const sd = idx === 0 ? -1 : 1
        const bit = bitPts[idx]
        const rMid = add3(q.neckMid, add3(mul3(q.bodyFwd, 0.25 * scaleH), add3(mul3(q.r, sd * neckMidLat), mul3(q.bodyUp, -1.75 * scaleH))))
        const rSide = add3(lerp3(q.neckBase, crestBase, hasCap ? 0.55 : 0.68), add3(mul3(q.r, sd * shLat), mul3(q.bodyUp, (hasCap ? 2.15 : 2.45) * scaleH)))
        const rTop = add3(crestBase, add3(mul3(q.r, sd * topLat), mul3(q.bodyUp, crestH - 0.52 * scaleH)))
        bitRings.push(sdf.sphere(0.50).at(bit).mat(MT.slice(0, 2)))
        reinSegs.push(
          sdf.capsule(bit, rMid, 0.48, 0.48),
          sdf.capsule(rMid, rSide, 0.48, 0.48),
          sdf.capsule(rSide, rTop, 0.48, 0.48),
          sdf.capsule(rTop, rCrest0, 0.48, 0.48),
        )
      }
    } else {
      // Compute the species' exact rest-pose 3D half-rein length L_rest (in local 2D/3D rest coordinates)
      const restMu = sub3([S.muzzleAt[0], 0, S.muzzleAt[1]], [S.pollAt[0], 0, S.pollAt[1]])
      const restFwd = unit3(restMu), restUp = [restFwd[2], 0, -restFwd[0]]
      const restBit = add3([S.pollAt[0], 0, S.pollAt[1]], add3(mul3(restFwd, len3(restMu) * 0.78), [0, S.muzzleR[1] * 0.96, restUp[2] * -0.42]))
      const restCrestBase = [S.withersAt[0] + (S.saddleAt[0] - S.withersAt[0]) * 0.22, 0, S.withersAt[1] + (S.saddleAt[1] - S.withersAt[1]) * 0.22]
      const restRCrest = [restCrestBase[0], 0, restCrestBase[2] + crestH]
      const restRMid = [S.neckMid[0] + 0.25 * scaleH, neckMidLat, S.neckMid[1] - 1.75 * scaleH]
      const restRSide = [S.neckBase[0] + (restCrestBase[0] - S.neckBase[0]) * (hasCap ? 0.55 : 0.68), shLat, S.neckBase[1] + (restCrestBase[2] - S.neckBase[1]) * (hasCap ? 0.55 : 0.68) + (hasCap ? 2.15 : 2.45) * scaleH]
      const restRTop = [restCrestBase[0], topLat, restCrestBase[2] + crestH - 0.52 * scaleH]
      const L_rest = len3(sub3(restBit, restRMid)) + len3(sub3(restRMid, restRSide)) + len3(sub3(restRSide, restRTop)) + len3(sub3(restRTop, restRCrest))

      // Continuous neck-hugging loop parameterized by slide fraction u in [0, 0.88] along (crestBase -> neckMid -> poll)
      const maneClear = hasCrinet ? 1.15 : S.maneThick * 0.82
      const spineAt = (u) => (u <= 0.5 ? lerp3(crestBase, q.neckMid, u * 2) : lerp3(q.neckMid, q.poll, (u - 0.5) * 2))
      const neckRadAt = (u) => (u <= 0.5 ? (S.withersR[0] * 0.82) + (S.neckR[1] - S.withersR[0] * 0.82) * (u * 2) : S.neckR[1] + (S.neckR[2] - S.neckR[1]) * ((u - 0.5) * 2))
      const upDirAt = (u) => unit3(lerp3(q.bodyUp, neckDorsal, clamp(u * 2.2, 0, 1)))
      const evalLoop = (u, sd, bit) => {
        const anchor = spineAt(u), rN = neckRadAt(u), upD = upDirAt(u)
        const crestD = (1 - clamp(u * 2.5, 0, 1)) * crestH + clamp(u * 2.5, 0, 1) * (rN + maneClear * (1 - 0.2 * u) + (hasCap ? 0.30 : 0.08))
        const rCrest = add3(anchor, mul3(upD, crestD))
        const sideL = rN + (hasCap ? 0.56 : 0.34)
        const upL = rN * 0.68 + (hasCap ? 0.44 : 0.26)
        const rSide = add3(anchor, add3(mul3(q.r, sd * sideL), mul3(upD, rN * 0.14)))
        const rTop = add3(anchor, add3(mul3(q.r, sd * upL), mul3(upD, crestD * 0.78)))
        const midBase = lerp3(bit, rSide, 0.52)
        const midLatNow = Math.abs(dot3(sub3(midBase, anchor), q.r))
        const minMidLat = Math.max(S.muzzleR[1] * 0.96, rN * 0.92) + 0.32
        const rMid = add3(midBase, add3(mul3(q.r, sd * Math.max(0, minMidLat - midLatNow)), mul3(upD, -0.42 * scaleH)))
        const L = len3(sub3(bit, rMid)) + len3(sub3(rMid, rSide)) + len3(sub3(rSide, rTop)) + len3(sub3(rTop, rCrest))
        return { rMid, rSide, rTop, rCrest, L }
      }
      // Bisect u in [0, 0.88] so the average left/right 3D rein strap length matches L_rest identically!
      const lenAt = (u) => 0.5 * (evalLoop(u, -1, bitPts[0]).L + evalLoop(u, 1, bitPts[1]).L)
      let lo = 0, hi = 0.88
      if (lenAt(0) > L_rest) {
        for (let it = 0; it < 14; it++) {
          const mid = 0.5 * (lo + hi)
          if (lenAt(mid) > L_rest) lo = mid; else hi = mid
        }
      } else {
        hi = 0
      }
      const uExact = 0.5 * (lo + hi)
      for (let idx = 0; idx < 2; idx++) {
        const sd = idx === 0 ? -1 : 1
        const bit = bitPts[idx]
        const { rMid, rSide, rTop, rCrest } = evalLoop(uExact, sd, bit)
        bitRings.push(sdf.sphere(0.50).at(bit).mat(MT.slice(0, 2)))
        reinSegs.push(
          sdf.capsule(bit, rMid, 0.48, 0.48),
          sdf.capsule(rMid, rSide, 0.48, 0.48),
          sdf.capsule(rSide, rTop, 0.48, 0.48),
          sdf.capsule(rTop, rCrest, 0.48, 0.48),
        )
      }
    }
    parts.mount_bridle = [
      ...bitRings,
      sdf.union(reinSegs, { smooth: 0.22 }).mat(SD.slice(0, 3)),
    ]
  }

  // Return all mount parts plus dedicated occlusion proxies for modular depth-clipped riders
  const barrelProxy = sdf.union(
    barrelField,
    ...(parts.mount_caparison ? [parts.mount_caparison] : []),
    ...(parts.mount_saddle ? parts.mount_saddle : []),
  )
  const fullProxy = sdf.union(
    barrelProxy,
    neckField,
    skullField,
    ...earFields,
    ...(parts.mount_mane ? [parts.mount_mane] : []),
    ...(parts.mount_barding ? parts.mount_barding : []),
  )
  return { parts, barrelProxy, fullProxy }
}

// ---------------------------------------------------------------- shared Phase 2 tack helper (saddle, blanket & reins)
const buildPhase2Tack = (q, spec, opts = {}) => {
  const S = q.S, parts = {}
  const SD = MKEYS.saddle, BL = MKEYS.blanket, TR = MKEYS.trim, MT = MKEYS.metal
  const yaw = -q.heading
  const bodyRot = (fld) => (Math.abs(q.pitchDeg) > 0.2 ? fld.rotate(q.pitchDeg, "x").rotate(yaw, "z") : fld.rotate(yaw, "z"))
  const atBodyRel = (pt, df, dr, du) => add3(pt, add3(mul3(q.bodyFwd, df), add3(mul3(q.r, dr), mul3(q.bodyUp, du))))
  const { tattered = false, flankAdd = 0.24, blanketAdd = 0.42, seatLift = 0.0, stirrupDrop = S.barrelH * 0.88 + 0.5, reinAnchor = null, reinColor = SD.slice(0, 3), collar = false } = opts

  if (spec.blanket !== false) {
    const bBack = -S.halfLen * 0.46, bFront = S.halfLen * 0.30
    const zTopB = dot3(q.saddle, q.bodyUp) - 1.1 + seatLift
    const zBotB = dot3(q.origin, q.bodyUp) - (tattered ? 1.45 : 0.75)
    let blanket = sdf.capsule(
      atBodyRel(q.saddle, bBack, 0, -2.55 + seatLift * 0.5),
      atBodyRel(q.saddle, bFront, 0, -2.55 + seatLift * 0.5),
      S.barrelW + blanketAdd,
      S.barrelW + blanketAdd - 0.06,
    ).intersect(sdf.plane(q.bodyUp, zTopB))
    if (tattered) {
      // Ragged torn lower hem on undead saddlecloth using low-frequency fbm height modulation
      blanket = blanket.intersect(sdf.plane(mul3(q.bodyUp, -1), -zBotB))
      parts.mount_blanket = blanket.paint((p) => {
        const du = dot3(p, q.bodyUp), df = dot3(sub3(p, q.saddle), q.bodyFwd)
        const tear = sdf.fbm(p[0] * 0.45, p[1] * 0.45, p[2] * 0.45, 7, 2) * 1.9
        if (du < zBotB + 0.65 + tear * 0.45) return TR.slice(0, 2)
        if (df < bBack - 0.25 || df > bFront + 0.25) return TR
        return BL
      })
    } else {
      parts.mount_blanket = blanket.intersect(sdf.plane(mul3(q.bodyUp, -1), -zBotB)).paint((p) => {
        const df = dot3(sub3(p, q.saddle), q.bodyFwd), du = dot3(p, q.bodyUp)
        if (du < zBotB + 0.85 || df < bBack - 0.3 || df > bFront + 0.3) return TR
        return BL
      })
    }
  }

  if (spec.saddle !== false) {
    const flankW = S.barrelW + flankAdd
    const pommel = bodyRot(sdf.ellipsoid([S.barrelW * 0.60, 1.48, 1.88])).at(atBodyRel(q.saddle, 2.85, 0, 0.95 + seatLift))
    const cantle = bodyRot(sdf.ellipsoid([S.barrelW * 0.66, 1.68, 2.08])).at(atBodyRel(q.saddle, -3.2, 0, 1.15 + seatLift))
    const seat = bodyRot(sdf.ellipsoid([S.barrelW * 0.88, 3.45, 1.62])).at(atBodyRel(q.saddle, 0, 0, 0.12 + seatLift))
    const flaps = [-1, 1].map((sd) => bodyRot(sdf.ellipsoid([0.64, 2.20, 2.65])).at(atBodyRel(q.saddle, 0.1, sd * (flankW - 0.10), -2.45 + seatLift * 0.5)))
    const stirrups = [-1, 1].map((sd) => {
      const top = atBodyRel(q.saddle, 0.45, sd * (flankW + 0.08), -1.6 + seatLift * 0.5)
      const bot = atBodyRel(q.saddle, 0.55, sd * (flankW - 0.02), -stirrupDrop)
      return [
        sdf.capsule(top, bot, 0.46, 0.46).mat(SD.slice(0, 3)),
        bodyRot(sdf.ellipsoid([0.44, 0.92, 0.82])).at(bot).mat(MT),
      ]
    }).flat()
    const saddleCore = sdf.union(pommel, cantle, seat, ...flaps, { smooth: 0.45 }).paint((p) => {
      const dz = dot3(sub3(p, q.saddle), q.bodyUp) - seatLift
      return dz > 1.05 ? SD.slice(1) : dz < -2.8 ? SD.slice(0, 2) : SD
    })
    parts.mount_saddle = [saddleCore, ...stirrups]
  }

  if (spec.bridle !== false && reinAnchor) {
    const scaleH = S.halfLen / 8.2
    const neckDir = unit3(sub3(q.poll, q.neckBase))
    const neckDorsal = unit3(cross3(q.r, neckDir))
    const crestBase = lerp3(q.withers, q.saddle, 0.25)
    const crestH = S.withersR[2] + (opts.crestExtra ?? 0.55)
    const rCrest = add3(crestBase, mul3(q.bodyUp, crestH))
    const sideLat = S.withersR[0] * 0.82 + (opts.sideLatExtra ?? 0.35)
    const topLat = S.withersR[0] * 0.52 + 0.28
    const midLat = Math.max(S.neckR[1], S.neckR[0] * 0.80) + (opts.midLatExtra ?? 0.42)
    const reinSegs = [], bitRings = []
    for (let idx = 0; idx < 2; idx++) {
      const sd = idx === 0 ? -1 : 1
      const bit = reinAnchor[idx]
      const rMid = q.neckPitchDeg > 25
        ? add3(q.neckMid, add3(mul3(neckDorsal, -1.2 * scaleH), mul3(q.r, sd * midLat)))
        : add3(q.neckMid, add3(mul3(q.bodyFwd, 0.2 * scaleH), add3(mul3(q.r, sd * midLat), mul3(q.bodyUp, -1.3 * scaleH))))
      const rSide = add3(lerp3(q.neckBase, crestBase, 0.65), add3(mul3(q.r, sd * sideLat), mul3(q.bodyUp, 2.0 * scaleH)))
      const rTop = add3(crestBase, add3(mul3(q.r, sd * topLat), mul3(q.bodyUp, crestH - 0.5 * scaleH)))
      if (!collar) bitRings.push(sdf.sphere(0.48).at(bit).mat(MT.slice(0, 2)))
      reinSegs.push(
        sdf.capsule(bit, rMid, 0.46, 0.46),
        sdf.capsule(rMid, rSide, 0.46, 0.46),
        sdf.capsule(rSide, rTop, 0.46, 0.46),
        sdf.capsule(rTop, rCrest, 0.46, 0.46),
      )
    }
    if (collar) {
      // Studded leather collar hugging the neck base (wolf / war bull)
      const cA = add3(q.neckBase, add3(mul3(q.r, -S.neckR[0] * 0.85), mul3(q.bodyUp, 0.4)))
      const cB = add3(q.neckBase, add3(mul3(q.r, S.neckR[0] * 0.85), mul3(q.bodyUp, 0.4)))
      const cTop = add3(q.neckBase, mul3(neckDorsal, S.neckR[0] + 0.55))
      const cBot = add3(q.neckBase, mul3(neckDorsal, -(S.neckR[0] + 0.45)))
      reinSegs.push(
        sdf.capsule(cA, cTop, 0.56, 0.56), sdf.capsule(cTop, cB, 0.56, 0.56),
        sdf.capsule(cA, cBot, 0.56, 0.56), sdf.capsule(cBot, cB, 0.56, 0.56),
      )
    }
    parts.mount_bridle = [...bitRings, sdf.union(reinSegs, { smooth: 0.2 }).mat(reinColor)]
  }
  return parts
}

// ---------------------------------------------------------------- Phase 2A: Undead Skeletal Horse (`bone_steed`)
// Matches kit.px.js bareSkeleton() craft: crisp ivory bone ribs separated by pitch-black `"k"` intercostal gaps
// over a dark hollow cavity, open transparent lumbar waist under a segmented vertebral spine, slender dumbbell
// bone limbs with prominent knobby condyle joints, thin vertebral bone tail, and sculpted equine skull!
const buildBoneSteedParts = (q, spec, _cp, keys = MKEYS) => {
  const S = q.S, parts = {}
  const C1 = keys.coat, C2 = keys.coat2, MN = keys.mane, HV = keys.hooves, SD = keys.saddle, MT = keys.metal, EY = keys.eye
  const yaw = -q.heading, headYaw = -(q.heading + q.headYawDeg)
  const bodyRot = (fld) => (Math.abs(q.pitchDeg) > 0.2 ? fld.rotate(q.pitchDeg, "x").rotate(yaw, "z") : fld.rotate(yaw, "z"))
  const headRot = (fld) => (Math.abs(q.headPitchDeg) > 0.2 ? fld.rotate(q.headPitchDeg, "x").rotate(headYaw, "z") : fld.rotate(headYaw, "z"))
  const atBodyRel = (pt, df, dr, du) => add3(pt, add3(mul3(q.bodyFwd, df), add3(mul3(q.r, dr), mul3(q.bodyUp, du))))

  // 1. Segmented vertebral spine + bareSkeleton-style 3D ribcage (ivory ribs + crisp `"k"` inter-rib shadows!)
  //    + open hollow lumbar waist + sculpted bony pelvis & shoulder blades
  const spStart = atBodyRel(q.croup, -1.6, 0, 2.3), spEnd = atBodyRel(q.chest, 1.4, 0, 2.8)
  const spineCore = sdf.capsule(spStart, spEnd, 1.12, 1.18).paint((p) => {
    const along = dot3(sub3(p, spStart), q.bodyFwd)
    return Math.floor(along * 0.72) % 2 ? C1 : C1.slice(0, 2)
  })
  const dorsalSpines = []
  for (let k = 0; k < 8; k++) {
    const pt = lerp3(atBodyRel(q.croup, -1.0, 0, 2.4), atBodyRel(q.chest, 0.5, 0, 3.0), k / 7)
    const crest = k >= 5 ? 1.75 : 1.05
    dorsalSpines.push(sdf.capsule(pt, add3(pt, mul3(q.bodyUp, crest)), 0.55, 0.36).mat(C1))
  }
  // Sculpted 3D ribcage shell positioned forward over the chest/thorax (leaving a genuine EMPTY HOLLOW WAIST
  // behind df = -2.8 so background shows right underneath the exposed lumbar spine!)
  const ribCenter = atBodyRel(q.origin, 2.9, 0, 0.1)
  const ribRx = S.barrelW * 0.98, ribRy = 6.0, ribRz = S.barrelH * 0.92
  const ribCage = bodyRot(sdf.ellipsoid([ribRx, ribRy, ribRz])).at(ribCenter).paint((p, n) => {
    const rel = sub3(p, ribCenter), df = dot3(rel, q.bodyFwd), lat = Math.abs(dot3(rel, q.r)), du = dot3(rel, q.bodyUp)
    // Solid dorsal spine strip & ventral sternum keel stay ivory bone
    if (lat < 1.15 && du > 2.2) return C1
    if (lat < 1.25 && du < -2.6) return C1.slice(0, 3)
    // Open dark hollow underside & rear opening of the thoracic cage
    if (du < -2.8 && df < -1.0) return INK
    // Crisp bareSkeleton-style alternating 3D rib bars & pitch-black `"k"` intercostal gaps,
    // with necromantic spectral soul-fire (`EY[1]` emitting!) pulsing inside the hollow chest cavity!
    const wave = Math.sin((df + du * 0.22) * 2.55)
    if (wave < -0.12) {
      if (!q.dead && wave < -0.52 && Math.abs(df + 0.3) < 3.2 && du > -1.7 && du < 1.5 && lat > 2.2) return EY[1]
      return INK
    }
    return wave > 0.45 ? C1 : C1.slice(0, 3)
  })
  const scapulae = [-1, 1].map((sd) => sdf.capsule(atBodyRel(q.withers, 0.8, sd * 1.8, -0.2), atBodyRel(q.chest, 0.8, sd * 3.6, -1.8), 1.15, 0.88).mat(C1))
  // Sculpted bony pelvis bowl with crisp dark socket underside & knobby hip-wing crests
  const pelvis = sdf.union(
    bodyRot(sdf.ellipsoid([S.croupR[0] * 0.82, 2.35, 2.15])).at(atBodyRel(q.croup, -0.5, 0, 0.8)),
    ...[-1, 1].map((sd) => sdf.sphere(1.42).at(atBodyRel(q.croup, 0.0, sd * 2.95, -1.25))),
    { smooth: 0.28 },
  ).paint((p) => {
    const rel = sub3(p, q.croup), du = dot3(rel, q.bodyUp), lat = Math.abs(dot3(rel, q.r))
    if (du < -1.1 && lat < 1.6) return INK
    return du > 1.2 ? C1 : C1.slice(0, 3)
  })
  const barrelField = sdf.union(spineCore, ...dorsalSpines, ribCage, ...scapulae, pelvis)
  parts.mount_body = barrelField

  // 2. Slender articulated cervical vertebrae column (segmented ivory drums with crisp dark inter-vertebra rings!)
  const neckDir = unit3(sub3(q.poll, q.neckBase))
  const neckDorsal = unit3(cross3(q.r, neckDir))
  const neckTop = add3(q.poll, add3(mul3(q.eyeFwd, -0.75), mul3(q.eyeUp, -1.0)))
  const neckSegs = [
    sdf.capsule(q.neckBase, q.neckMid, S.neckR[0] * 0.82, S.neckR[1] * 0.82),
    sdf.capsule(q.neckMid, neckTop, S.neckR[1] * 0.82, S.neckR[2] * 0.82),
  ]
  for (let k = 0; k < 6; k++) {
    const t = k / 5
    const pt = t <= 0.5 ? lerp3(q.neckBase, q.neckMid, t * 2) : lerp3(q.neckMid, neckTop, (t - 0.5) * 2)
    const rV = S.neckR[0] * (1 - t) + S.neckR[2] * t
    neckSegs.push(sdf.sphere(rV * 1.14).at(pt), sdf.capsule(pt, add3(pt, mul3(neckDorsal, rV * 1.35)), 0.56, 0.34))
  }
  const neckField = sdf.union(neckSegs, { smooth: 0.14 }).paint((p) => {
    const along = dot3(sub3(p, q.neckBase), neckDir)
    const phase = Math.sin(along * 2.85)
    return phase < -0.45 ? INK : phase < 0.05 ? C1.slice(0, 2) : C1
  })
  parts.mount_neck = neckField

  // 3. Sculpted 3D equine skull: crisp hollowed `"k"` eye orbits + glowing spectral eye orbs + open jaw diastema!
  const muzzleLen = len3(sub3(q.muzzle, q.poll)) || 1
  const cranium = headRot(sdf.ellipsoid(S.craniumR)).at(q.poll)
  const browPos = add3(q.poll, add3(mul3(q.headFwd, 2.0), mul3(q.headUp, 0.35)))
  const browRidge = headRot(sdf.ellipsoid([S.craniumR[0] * 1.12, 1.80, 1.40])).at(browPos)
  const jawPos = add3(q.poll, add3(mul3(q.headFwd, 1.7), mul3(q.headUp, -1.78)))
  const cheekBone = headRot(sdf.ellipsoid([S.jawR[0] * 1.04, 1.65, 1.25])).at(add3(q.poll, add3(mul3(q.headFwd, 2.3), mul3(q.headUp, -0.72))))
  const upperBridge = sdf.capsule(browPos, add3(q.poll, add3(mul3(q.headFwd, muzzleLen * 0.94), mul3(q.headUp, 0.38))), 1.62, 1.18)
  const teethCap = headRot(sdf.ellipsoid([1.48, 1.28, 1.22])).at(add3(q.muzzle, mul3(q.headUp, 0.02)))
  const mandible = sdf.capsule(jawPos, add3(q.muzzle, mul3(q.headUp, -0.82)), 1.18, 0.86)
  // Dark hollow gap recessed cleanly between upper nasal bridge & lower jawbone (iconic diastema!)
  const jawHollow = sdf.capsule(add3(jawPos, mul3(q.headUp, 0.58)), add3(q.poll, add3(mul3(q.headFwd, muzzleLen * 0.74), mul3(q.headUp, -0.28))), 0.86, 0.68).mat(INK)
  const skullSolid = sdf.union(cranium, browRidge, cheekBone, upperBridge, teethCap, mandible, { smooth: 0.36 })
  const frontness = Math.max(0, -q.headF[1])
  const skullField = sdf.union(
    jawHollow,
    skullSolid.paint((p, n) => {
      const rel = sub3(p, q.poll), along = dot3(rel, q.headFwd), lat = Math.abs(dot3(rel, q.headR)), upH = dot3(rel, q.headUp)
      const fwdP = dot3(rel, q.eyeFwd), zP = dot3(rel, q.eyeUp)
      // Pitch-black `"k"` hollowed orbital sockets with bright glowing spectral pinpoint (`EY[1]` emits light!)
      const fc = 1.65 + frontness * 1.15, zc = -1.35, minLat = frontness > 0.65 ? 0.92 : 1.25
      if (lat >= minLat && Math.abs(fwdP - fc) <= 1.15 + frontness * 0.38 && Math.abs(zP - zc) <= 1.08 && dot3(n, CAM_DIR) > 0.05) {
        const d2 = ((fwdP - fc) / (0.68 + frontness * 0.22)) ** 2 + ((zP - zc) / 0.66) ** 2
        if (!q.dead && d2 < 1.0 && dot3(n, CAM_DIR) > 0.18) return EY[1]
        return INK
      }
      // Pitch-black nasal cavity opening on upper snout
      if (along >= muzzleLen * 0.72 && along <= muzzleLen * 0.96 && lat <= 0.92 && upH >= 0.32) return INK
      // Crisp dark tooth-gap line + pale bone incisors at muzzle tip
      if (along > muzzleLen * 0.85 && Math.abs(upH + 0.12) < 0.28) return INK
      // Cheekbone zygomatic shadow crease
      if (along > 2.4 && along < muzzleLen * 0.68 && upH < -0.55 && upH > -1.05 && lat > 1.05) return C1.slice(0, 2)
      return C1
    }),
  )
  // Crisp pointed bony equine ears perched cleanly atop the cranium (matching curated skeletal steed reference!)
  const earFields = q.ears.map((E) => sdf.capsule(E.base, E.tip, S.earR[0], S.earR[1]).paint((p) => (dot3(sub3(p, E.base), q.headF) > 0.25 ? INK : C1)))
  parts.mount_head = [skullField, ...earFields]

  // Optional ethereal spectral mane wisps ONLY when explicitly requested (`mane: "ghost"` etc.)
  if (spec.mane && spec.mane !== "none") {
    const m1 = add3(lerp3(q.poll, q.neckMid, 0.35), mul3(neckDorsal, S.neckR[2] * 1.4))
    const m2 = add3(q.neckMid, mul3(neckDorsal, S.neckR[1] * 1.5))
    const m3 = add3(lerp3(q.neckMid, q.neckBase, 0.55), mul3(neckDorsal, S.neckR[0] * 1.4))
    parts.mount_mane = sdf.union(
      sdf.capsule(m1, m2, 0.65, 0.82),
      sdf.capsule(m2, m3, 0.82, 0.55),
      { smooth: 0.35 },
    ).mat(MN.slice(1))
  }

  // 4. Thin delicate articulated vertebral bone tail (slender knobby caudal bones tapering to a bony tip!)
  const [td, ta, tm, tt] = q.tail, tr = S.tailR
  const tailSegs = [
    sdf.capsule(td, ta, tr[0], tr[1]),
    sdf.capsule(ta, tm, tr[1], tr[2]),
    sdf.capsule(tm, tt, tr[2], tr[3]),
  ]
  for (let k = 1; k <= 5; k++) {
    const t = k / 6
    const pt = t < 0.33 ? lerp3(td, ta, t * 3) : t < 0.67 ? lerp3(ta, tm, (t - 0.33) * 3) : lerp3(tm, tt, (t - 0.67) * 3)
    tailSegs.push(sdf.sphere((0.50 - 0.18 * t)).at(pt))
  }
  parts.mount_tail = sdf.union(tailSegs, { smooth: 0.08 })
    .intersect(sdf.plane([0, 0, -1], 0.1))
    .paint((p) => (Math.floor(p[2] * 1.05) % 2 ? C1 : C1.slice(0, 2)))

  // 5. Slender dumbbell bone legs (`bareSkeleton`-style thin shafts + pronounced knobby bone condyle joints!)
  const lr = S.legR
  const boneHoof = (hoof, far) => sdf.capsule(add3(hoof, [0, 0, S.hoofH * 0.45]), add3(hoof, add3(mul3(q.f, 0.5), [0, 0, -S.hoofH * 0.35])), S.hoofR * 0.78, S.hoofR * 0.96)
    .intersect(sdf.plane([0, 0, -1], 0.05)).mat(dim(HV, far))
  const boneLimbPaint = (col, joints, glowJoints = []) => (p) => {
    if (!q.dead) for (const gj of glowJoints) if (len3(sub3(p, gj)) < 0.85) return EY[1] // subtle necromantic soul-spark at knee/hock joint!
    for (const jt of joints) if (len3(sub3(p, jt)) < 1.38) return col
    return col.slice(0, 3)
  }
  q.frontLegs.forEach((L, i) => {
    const far = i === q.farSide, col = dim(C1, far)
    const body = sdf.union(
      sdf.sphere(lr[0] * 1.38).at(L.sh),
      sdf.capsule(L.sh, L.knee, lr[0] * 0.72, lr[1] * 0.74),
      sdf.sphere(lr[1] * 1.48).at(L.knee),
      sdf.capsule(L.knee, L.fet, lr[1] * 0.72, lr[2] * 0.76),
      sdf.sphere(lr[2] * 1.48).at(L.fet),
      sdf.capsule(L.fet, add3(L.hoof, [0, 0, S.hoofH * 0.45]), lr[2] * 0.74, lr[3] * 0.84),
      { smooth: 0.08 },
    ).paint(boneLimbPaint(col, [L.sh, L.knee, L.fet], far ? [] : [L.knee]))
    parts[`mount_fleg${i}`] = [body, boneHoof(L.hoof, far)]
  })
  q.hindLegs.forEach((L, i) => {
    const far = i === q.farSide, col = dim(C1, far)
    const body = sdf.union(
      sdf.sphere(lr[0] * 1.42).at(L.hip),
      sdf.capsule(L.hip, L.stifle, lr[0] * 0.78, lr[1] * 0.78),
      sdf.sphere(lr[1] * 1.46).at(L.stifle),
      sdf.capsule(L.stifle, L.hock, lr[1] * 0.76, lr[2] * 0.78),
      sdf.sphere(lr[2] * 1.52).at(L.hock),
      sdf.capsule(L.hock, L.fet, lr[2] * 0.74, lr[2] * 0.72),
      sdf.sphere(lr[2] * 1.44).at(L.fet),
      sdf.capsule(L.fet, add3(L.hoof, [0, 0, S.hoofH * 0.45]), lr[2] * 0.74, lr[3] * 0.84),
      { smooth: 0.08 },
    ).paint(boneLimbPaint(col, [L.hip, L.stifle, L.hock, L.fet], far ? [] : [L.hock]))
    parts[`mount_hleg${i}`] = [body, boneHoof(L.hoof, far)]
  })

  // 6. Compact minimal dark war-saddle perched atop the spine (leaves the entire 3D ribcage & hollow lumbar waist visible!)
  if (spec.saddle !== false) {
    const pommel = bodyRot(sdf.ellipsoid([S.barrelW * 0.56, 1.35, 1.75])).at(atBodyRel(q.saddle, 2.5, 0, 1.15))
    const cantle = bodyRot(sdf.ellipsoid([S.barrelW * 0.62, 1.55, 1.95])).at(atBodyRel(q.saddle, -2.9, 0, 1.35))
    const seat = bodyRot(sdf.ellipsoid([S.barrelW * 0.72, 3.05, 1.25])).at(atBodyRel(q.saddle, -0.2, 0, 0.45))
    const stirrups = [-1, 1].map((sd) => {
      const top = atBodyRel(q.saddle, 0.35, sd * (S.barrelW * 0.76), -0.4)
      const bot = atBodyRel(q.saddle, 0.45, sd * (S.barrelW + 0.05), -(S.barrelH * 0.88 + 0.5))
      return [
        sdf.capsule(top, bot, 0.42, 0.42).mat(SD.slice(0, 3)),
        bodyRot(sdf.ellipsoid([0.42, 0.88, 0.78])).at(bot).mat(MT),
      ]
    }).flat()
    const sadCore = sdf.union(pommel, cantle, seat, { smooth: 0.35 }).paint((p) => (dot3(sub3(p, q.saddle), q.bodyUp) > 1.1 ? SD.slice(1) : SD))
    parts.mount_saddle = [sadCore, ...stirrups]
  }
  if (spec.blanket === true) {
    Object.assign(parts, buildPhase2Tack(q, { ...spec, saddle: false, bridle: false }, { tattered: true, blanketAdd: 0.36 }))
  }
  if (spec.bridle !== false) {
    const bitPts = [-1, 1].map((sd) => add3(q.poll, add3(mul3(q.headFwd, muzzleLen * 0.78), add3(mul3(q.headR, sd * (S.muzzleR[1] * 0.96)), mul3(q.headUp, -0.45)))))
    Object.assign(parts, buildPhase2Tack(q, { ...spec, saddle: false, blanket: false }, { reinAnchor: bitPts, crestExtra: 0.35, midLatExtra: 0.38 }))
  }

  const barrelProxy = sdf.union(barrelField, ...(parts.mount_saddle ? parts.mount_saddle : []))
  const fullProxy = sdf.union(barrelProxy, neckField, skullField, ...earFields)
  return { parts, barrelProxy, fullProxy }
}

// ---------------------------------------------------------------- Phase 2B: Massive Horned War Bull (`war_aurochs`)
const buildBullParts = (q, spec, _cp, keys = MKEYS) => {
  const S = q.S, parts = {}
  const C1 = keys.coat, C2 = keys.coat2, MN = keys.mane, HV = keys.hooves, SD = keys.saddle, BD = keys.barding, MT = keys.metal, EY = keys.eye
  const yaw = -q.heading, headYaw = -(q.heading + q.headYawDeg)
  const bodyRot = (fld) => (Math.abs(q.pitchDeg) > 0.2 ? fld.rotate(q.pitchDeg, "x").rotate(yaw, "z") : fld.rotate(yaw, "z"))
  const headRot = (fld) => (Math.abs(q.headPitchDeg) > 0.2 ? fld.rotate(q.headPitchDeg, "x").rotate(headYaw, "z") : fld.rotate(headYaw, "z"))
  const atBodyRel = (pt, df, dr, du) => add3(pt, add3(mul3(q.bodyFwd, df), add3(mul3(q.r, dr), mul3(q.bodyUp, du))))

  // 1. Massive muscular bull barrel with towering shoulder hump & hanging brisket dewlap
  const chestBall = bodyRot(sdf.ellipsoid(S.chestR)).at(q.chest)
  const humpBall = bodyRot(sdf.ellipsoid(S.withersR)).at(q.withers)
  const croupBall = bodyRot(sdf.ellipsoid(S.croupR)).at(q.croup)
  const ribSpan = sdf.capsule(q.croup, q.chest, S.barrelW * 0.92, S.barrelW * 1.02)
  const bellyFill = sdf.capsule(add3(q.croup, mul3(q.bodyUp, -1.2)), add3(q.chest, mul3(q.bodyUp, -1.8)), S.barrelW * 0.86, S.barrelW * 0.96)
  // Heavy hanging brisket/throat dewlap fold (iconic bull silhouette!)
  const dewlap = sdf.capsule(atBodyRel(q.chest, 3.6, 0, -4.4), atBodyRel(q.neckMid, 0.5, 0, -3.4), 2.55, 1.85)
  const barrelField = sdf.union(chestBall, humpBall, croupBall, ribSpan, bellyFill, dewlap, { smooth: 1.95 })
    .intersect(sdf.plane([0, 0, -1], 0.1))
  const bullPaint = (p, n) => {
    const rel = sub3(p, q.origin), df = dot3(rel, q.bodyFwd), du = dot3(rel, q.bodyUp)
    // Shaggy darker fur across towering front hump, chest & lower brisket
    if (df > 2.4 && (du > 1.8 || du < -2.6)) return C2
    if (n[2] < -0.55) return C1.slice(0, 2)
    return C1
  }
  parts.mount_body = barrelField.paint(bullPaint)

  // 2. Short thick low-carried bull neck + shaggy shoulder mane
  const neckDir = unit3(sub3(q.poll, q.neckBase))
  const neckDorsal = unit3(cross3(q.r, neckDir))
  const neckTop = add3(q.poll, add3(mul3(q.eyeFwd, -1.2), mul3(q.eyeUp, -0.8)))
  const neckField = sdf.union(
    sdf.capsule(q.neckBase, q.neckMid, S.neckR[0], S.neckR[1]),
    sdf.capsule(q.neckMid, neckTop, S.neckR[1], S.neckR[2]),
    sdf.capsule(atBodyRel(q.withers, 1.2, 0, 1.2), add3(q.poll, mul3(neckDorsal, 1.4)), S.neckR[0] * 0.85, S.neckR[2] * 0.82),
    { smooth: 1.0 },
  ).paint((p) => (dot3(sub3(p, q.origin), q.bodyUp) > 1.0 ? C2 : bullPaint(p, [0, 0, 1])))
  parts.mount_neck = neckField

  // Shaggy hump & crest ruff
  const mA = add3(q.poll, mul3(neckDorsal, S.neckR[2] * 0.72))
  const mB = add3(q.neckMid, mul3(neckDorsal, S.neckR[1] * 0.82))
  const mC = atBodyRel(q.withers, 0.2, 0, S.withersR[2] * 0.78)
  parts.mount_mane = sdf.union(
    sdf.capsule(mA, mB, 1.9, 2.35),
    sdf.capsule(mB, mC, 2.35, 2.15),
    ...[-1, 1].map((sd) => sdf.capsule(add3(mB, mul3(q.r, sd * 1.4)), add3(q.chest, add3(mul3(q.r, sd * 3.8), mul3(q.bodyUp, 2.2))), 1.55, 1.25)),
    { smooth: 0.65 },
  ).paint((p) => (Math.sin(p[2] * 1.7 + p[0] * 1.1) > 0.2 ? MN.slice(1) : MN))

  // 3. Broad heavy bovine head + horizontal lateral ears + sweeping curved HORNS + gleaming brass NOSE RING!
  const muzzleLen = len3(sub3(q.muzzle, q.poll)) || 1
  const cranium = headRot(sdf.ellipsoid(S.craniumR)).at(q.poll)
  const browBoss = headRot(sdf.ellipsoid([S.craniumR[0] * 1.12, 2.1, 1.85])).at(add3(q.poll, add3(mul3(q.headFwd, 1.6), mul3(q.headUp, 0.45))))
  const jawVol = headRot(sdf.ellipsoid(S.jawR)).at(add3(q.poll, add3(mul3(q.headFwd, 1.8), mul3(q.headUp, -1.55))))
  const bridge = sdf.capsule(add3(q.poll, mul3(q.headFwd, 1.2)), add3(q.poll, mul3(q.headFwd, muzzleLen * 0.88)), S.muzzleR[0] * 0.96, S.muzzleR[1] * 1.06)
  const bluntMuzzle = headRot(sdf.ellipsoid([S.muzzleR[1] * 1.22, S.muzzleR[1] * 0.95, S.muzzleR[1] * 0.95])).at(q.muzzle)
  const frontness = Math.max(0, -q.headF[1])
  const skullField = sdf.union(cranium, browBoss, jawVol, bridge, bluntMuzzle, { smooth: 0.72 }).paint((p, n) => {
    const rel = sub3(p, q.poll), along = dot3(rel, q.headFwd), lat = Math.abs(dot3(rel, q.headR)), upH = dot3(rel, q.headUp)
    const fwdP = dot3(rel, q.eyeFwd), zP = dot3(rel, q.eyeUp)
    // Fierce deep-set bull eyes under the heavy brow ridge
    const fc = 1.9 + frontness * 1.25, zc = -1.35
    if (lat >= 1.95 && Math.abs(fwdP - fc) <= 0.85 + frontness * 0.45 && Math.abs(zP - zc) <= 0.92 && dot3(n, CAM_DIR) > 0.2) {
      return Math.abs(fwdP - fc) < 0.45 && Math.abs(zP - zc) < 0.45 ? EY[1] : EY[0]
    }
    // Wide wet nostrils on blunt bovine muzzle
    if (along >= muzzleLen * 0.80 && lat >= 0.85 && lat <= 2.1 && upH >= -0.25 && upH <= 1.35) return EY[0]
    if (along > muzzleLen * 0.72) return C2.slice(0, 3)
    // Shaggy dark curly forehead poll tuft between horns
    if (along < 2.6 && upH > 0.4) return MN.slice(0, 3)
    return C1
  })
  // Horizontal outward-flaring cow/bull ears tucked neatly below the horn roots
  const earFields = [-1, 1].map((sd) => {
    const eb = add3(q.poll, add3(mul3(q.headR, sd * 2.75), add3(mul3(q.eyeFwd, -0.5), mul3(q.eyeUp, -0.35))))
    const et = add3(q.poll, add3(mul3(q.headR, sd * 5.2), add3(mul3(q.eyeFwd, -0.3), mul3(q.eyeUp, -0.85))))
    return sdf.capsule(eb, et, 0.92, 0.44).mat(C1)
  })
  parts.mount_head = [skullField, ...earFields]

  // Massive sweeping curved ivory HORNS + gleaming brass NOSE RING + riveted war-harness chest strap (`mount_barding`)
  const horns = [-1, 1].map((sd) => {
    const h0 = add3(q.poll, add3(mul3(q.headR, sd * 2.2), add3(mul3(q.eyeFwd, 0.2), mul3(q.eyeUp, 1.55))))
    const h1 = add3(q.poll, add3(mul3(q.headR, sd * 5.6), add3(mul3(q.eyeFwd, 1.5), mul3(q.eyeUp, 2.25))))
    const h2 = add3(q.poll, add3(mul3(q.headR, sd * 7.6), add3(mul3(q.eyeFwd, 3.8), mul3(q.eyeUp, 4.4))))
    const h3 = add3(q.poll, add3(mul3(q.headR, sd * 6.9), add3(mul3(q.eyeFwd, 5.4), mul3(q.eyeUp, 6.8))))
    return sdf.union(
      sdf.capsule(h0, h1, 1.55, 1.24),
      sdf.capsule(h1, h2, 1.24, 0.92),
      sdf.capsule(h2, h3, 0.92, 0.50),
      { smooth: 0.45 },
    ).paint((p) => {
      const distTip = len3(sub3(p, h3))
      if (distTip < 2.2) return BD.slice(0, 2) // dark horn tips
      const ring = Math.sin(len3(sub3(p, h0)) * 2.0)
      return ring < -0.45 ? BD.slice(1, 3) : BD.slice(1, 4)
    })
  })
  // Gleaming brass nose ring hanging beneath the broad nostrils
  const noseRingAt = add3(q.muzzle, add3(mul3(q.headFwd, 0.65), mul3(q.headUp, -1.25)))
  const noseRing = sdf.torus(1.25, 0.46).rotate(90, "x").rotate(headYaw, "z").at(noseRingAt).mat(MT)
  // Heavy riveted leather war-breastband wrapping the broad chest with central brass medallion boss
  const harnessCenter = atBodyRel(q.chest, 1.0, 0, -0.4)
  const chestStrap = bodyRot(sdf.ellipsoid([S.chestR[0] + 0.55, S.chestR[1] + 0.55, 1.65])).at(harnessCenter)
    .intersect(sdf.plane(mul3(q.bodyFwd, -1), -(dot3(q.chest, q.bodyFwd) - 0.5)))
    .paint((p) => (Math.abs(dot3(sub3(p, harnessCenter), q.r)) < 1.35 ? MT : SD.slice(0, 3)))
  parts.mount_barding = [...horns, noseRing, chestStrap]

  // 4. Slender ropy bull tail ending in a bold dark brush tuft
  const [td, ta, tm, tt] = q.tail, tr = S.tailR
  parts.mount_tail = sdf.union(
    sdf.capsule(td, ta, tr[0], tr[1]).mat(C1),
    sdf.capsule(ta, tm, tr[1], tr[2]).mat(C1),
    sdf.capsule(tm, tt, tr[2], 0.55).mat(C1),
    sdf.capsule(lerp3(tm, tt, 0.45), add3(tt, [0, 0, -1.6]), 1.32, 0.62).mat(MN),
    { smooth: 0.25 },
  ).intersect(sdf.plane([0, 0, -1], 0.1))

  // 5. Massive muscular pillar legs + sturdy cloven hooves
  const lr = S.legR
  const bullHoof = (hoof, far) => sdf.capsule(add3(hoof, [0, 0, S.hoofH * 0.48]), add3(hoof, add3(mul3(q.f, 0.55), [0, 0, -S.hoofH * 0.35])), S.hoofR * 0.88, S.hoofR * 1.06)
    .intersect(sdf.plane([0, 0, -1], 0.05)).mat(dim(HV, far))
  q.frontLegs.forEach((L, i) => {
    const far = i === q.farSide, col = dim(C1, far)
    const body = sdf.union(
      sdf.capsule(L.sh, L.knee, lr[0], lr[1]),
      sdf.capsule(L.knee, L.fet, lr[1] * 0.94, lr[2]),
      sdf.capsule(L.fet, add3(L.hoof, [0, 0, S.hoofH * 0.45]), lr[2] * 0.94, lr[3]),
      { smooth: 0.42 },
    ).mat(col)
    parts[`mount_fleg${i}`] = [body, bullHoof(L.hoof, far)]
  })
  q.hindLegs.forEach((L, i) => {
    const far = i === q.farSide, col = dim(C1, far)
    const body = sdf.union(
      sdf.capsule(L.hip, L.stifle, lr[0] * 1.18, lr[0] * 0.92),
      sdf.capsule(L.stifle, L.hock, lr[0] * 0.88, lr[1] * 0.94),
      sdf.capsule(L.hock, L.fet, lr[1] * 0.88, lr[2]),
      sdf.capsule(L.fet, add3(L.hoof, [0, 0, S.hoofH * 0.45]), lr[2] * 0.94, lr[3]),
      { smooth: 0.45 },
    ).mat(col)
    parts[`mount_hleg${i}`] = [body, bullHoof(L.hoof, far)]
  })

  // 6. Heavy war saddle lifted proudly above the broad bull ribcage + reins from nose ring back over the hump
  const reinPts = [-1, 1].map((sd) => add3(noseRingAt, mul3(q.headR, sd * 1.1)))
  Object.assign(parts, buildPhase2Tack(q, spec, { flankAdd: 0.88, blanketAdd: 0.98, seatLift: 0.82, stirrupDrop: S.barrelH * 0.86 + 0.6, crestExtra: 0.45, midLatExtra: 0.60, reinAnchor: reinPts }))

  const barrelProxy = sdf.union(barrelField, ...(parts.mount_saddle ? parts.mount_saddle : []))
  const fullProxy = sdf.union(barrelProxy, neckField, skullField, ...earFields, parts.mount_mane, ...horns)
  return { parts, barrelProxy, fullProxy }
}

// ---------------------------------------------------------------- Phase 2C: Armored Mechanical Caravan Walker (`clockwork_strider`)
// Porcelain-and-brass mechanical tortoise caravan strider: domed shoulder/hip fenders, horizontal ringed neck,
// beaked helmet head with glowing amber optics & brass ear-dials, splayed gear-jointed pillar legs with ivory greaves
// & 3-toed bronze feet, cushioned sage driver chair + front brass grab-bar, rear cargo chest, bedroll & flank banners!
const buildClockworkParts = (q, spec, _cp, keys = MKEYS) => {
  const S = q.S, parts = {}
  const C1 = keys.coat, C2 = keys.coat2, HV = keys.hooves, SD = keys.saddle, BL = keys.blanket, TR = keys.trim, BD = keys.barding, MT = keys.metal, EY = keys.eye
  const yaw = -q.heading, headYaw = -(q.heading + q.headYawDeg)
  const bodyRot = (fld) => (Math.abs(q.pitchDeg) > 0.2 ? fld.rotate(q.pitchDeg, "x").rotate(yaw, "z") : fld.rotate(yaw, "z"))
  const headRot = (fld) => (Math.abs(q.headPitchDeg) > 0.2 ? fld.rotate(q.headPitchDeg, "x").rotate(headYaw, "z") : fld.rotate(headYaw, "z"))
  const atBodyRel = (pt, df, dr, du) => add3(pt, add3(mul3(q.bodyFwd, df), add3(mul3(q.r, dr), mul3(q.bodyUp, du))))

  // 1. Dark riveted bronze mechanical hull + domed porcelain carapace front arch + 4 huge ivory-and-gold leg fenders + top deck!
  const underHull = sdf.union(
    bodyRot(sdf.ellipsoid([S.barrelW * 0.94, S.halfLen * 0.92, S.barrelH * 0.92])).at(atBodyRel(q.origin, 0, 0, -0.4)),
    bodyRot(sdf.ellipsoid([S.chestR[0] * 0.96, 5.4, 5.1])).at(atBodyRel(q.chest, -0.4, 0, 0.2)),
    bodyRot(sdf.ellipsoid([S.croupR[0] * 0.94, 5.2, 4.9])).at(atBodyRel(q.croup, 0.4, 0, 0.2)),
    { smooth: 1.0 },
  ).paint((p) => {
    const df = dot3(sub3(p, q.origin), q.bodyFwd), du = dot3(sub3(p, q.origin), q.bodyUp)
    if (Math.abs(((df + 20) % 2.8) - 1.4) < 0.22 || Math.abs(((du + 20) % 2.4) - 1.2) < 0.18) return C2.slice(0, 2)
    return C2
  })
  // Curved front ivory carapace dome plate rimmed with burnished gold trim
  const frontCarapace = bodyRot(sdf.ellipsoid([S.barrelW * 0.96, 5.2, 4.9])).at(atBodyRel(q.origin, 6.2, 0, 1.8))
    .intersect(sdf.plane(mul3(q.bodyUp, -1), -(dot3(q.origin, q.bodyUp) - 0.6)))
    .paint((p, n) => {
      const rel = sub3(p, atBodyRel(q.origin, 6.2, 0, 1.8))
      const df = dot3(rel, q.bodyFwd), du = dot3(rel, q.bodyUp)
      if (df > 3.6 || df < -3.6 || du < -1.7) return SHINE(BD, n)
      return C1
    })
  // Four prominent domed ivory-ceramic shoulder & hip fender arches rimmed in gold cupping the 4 pillar legs!
  const fenders = []
  for (const [fx, fw] of [[S.frontX - 0.4, S.frontW + 0.5], [S.hindX + 0.4, S.hindW + 0.5]]) {
    for (const sd of [-1, 1]) {
      const fc = atBodyRel(q.origin, fx, sd * fw, -0.4)
      const fDome = bodyRot(sdf.ellipsoid([3.2, 5.0, 4.5])).at(fc)
        .intersect(sdf.plane(mul3(q.bodyUp, -1), -(dot3(fc, q.bodyUp) - 0.4)))
        .paint((p, n) => {
          const du = dot3(sub3(p, fc), q.bodyUp)
          if (du < 0.45) return SHINE(BD, n) // gleaming gold fender arch rim!
          return C1
        })
      fenders.push(fDome)
    }
  }
  // Flat brass-rimmed top caravan deck carrying driver chair & rear cargo chest
  const topDeck = bodyRot(sdf.box([S.barrelW * 0.86, S.halfLen * 0.88, 1.15], 0.35)).at(atBodyRel(q.origin, -0.8, 0, 4.9)).paint((p, n) => {
    const rel = sub3(p, atBodyRel(q.origin, -0.8, 0, 4.9)), lat = Math.abs(dot3(rel, q.r)), df = Math.abs(dot3(rel, q.bodyFwd))
    if (lat > S.barrelW * 0.68 || df > S.halfLen * 0.72) return SHINE(BD, n)
    return C2.slice(1, 4)
  })
  const barrelField = sdf.union(underHull, frontCarapace, ...fenders, topDeck)
  parts.mount_body = [underHull, frontCarapace, ...fenders, topDeck]

  // 2. Segmented horizontal armored tortoise neck (dark bronze bellows wrapped in ivory-and-gold neck rings!)
  const neckCore = sdf.capsule(q.neckBase, q.poll, S.neckR[0] * 0.86, S.neckR[2] * 0.86).mat(C2)
  const neckRing1 = bodyRot(sdf.ellipsoid([S.neckR[0] * 1.12, 1.55, S.neckR[0] * 1.12])).at(lerp3(q.neckBase, q.poll, 0.26)).paint((p, n) => SHINE(BD, n))
  const neckRing2 = bodyRot(sdf.ellipsoid([S.neckR[1] * 1.14, 1.65, S.neckR[1] * 1.14])).at(lerp3(q.neckBase, q.poll, 0.56)).paint((p, n) => {
    const df = Math.abs(dot3(sub3(p, lerp3(q.neckBase, q.poll, 0.56)), q.bodyFwd))
    return df > 0.95 ? SHINE(BD, n) : C1
  })
  const neckField = sdf.union(neckCore, neckRing1, neckRing2)
  parts.mount_neck = [neckCore, neckRing1, neckRing2]

  // 3. Beaked porcelain-and-brass mechanical tortoise head + glowing amber circular eyes + circular brass ear-dials!
  const headCenter = lerp3(q.poll, q.muzzle, 0.35)
  const cranium = headRot(sdf.ellipsoid([3.05, 3.35, 2.75])).at(headCenter)
  const beakTip = headRot(sdf.ellipsoid([2.25, 2.15, 1.75])).at(add3(q.muzzle, mul3(q.headUp, -0.35)))
  const lowerBeak = headRot(sdf.ellipsoid([1.95, 2.15, 1.25])).at(add3(headCenter, add3(mul3(q.eyeFwd, 1.15), mul3(q.eyeUp, -1.65))))
  const eyeCenters = [-1, 1].map((sd) => add3(headCenter, add3(mul3(q.eyeFwd, 1.85), add3(mul3(q.headR, sd * 2.05), mul3(q.eyeUp, -0.05)))))
  const earDials = [-1, 1].map((sd) => {
    const dc = add3(headCenter, add3(mul3(q.eyeFwd, -0.65), add3(mul3(q.headR, sd * 3.05), mul3(q.eyeUp, 0.05))))
    return sdf.torus(1.05, 0.45).rotate(90, "y").rotate(headYaw, "z").at(dc).paint((p, n) => SHINE(BD, n))
  })
  const skullField = sdf.union(cranium, beakTip, lowerBeak, { smooth: 0.38 }).paint((p, n) => {
    const rel = sub3(p, headCenter), zP = dot3(rel, q.eyeUp), fwdP = dot3(rel, q.eyeFwd), lat = Math.abs(dot3(rel, q.headR))
    // Bright glowing amber-gold circular optical eyes (`EY[1]` emits light; extinguished dark lens when dead/disabled!)
    for (const ec of eyeCenters) {
      const ed = len3(sub3(p, ec))
      if (ed < 1.38 && dot3(n, CAM_DIR) > 0.06) return !q.dead && ed < 0.88 ? EY[1] : INK
    }
    // Lower articulated bronze jaw & beak crease
    if (zP < -1.15) return C2
    if (fwdP > 1.0 && Math.abs(zP + 1.05) < 0.28) return INK
    // Burnished gold brow helmet trim band across forehead & crown emblem accent
    if (Math.abs(zP - 0.92) < 0.28 && fwdP > -0.5) return SHINE(BD, n)
    if (lat < 0.48 && zP > 1.35 && fwdP > 0.2) return SHINE(BD, n)
    return C1
  })
  parts.mount_head = [skullField, ...earDials]

  // 4. Four massive armored pillar legs: dark bronze thighs, rotating circular brass knee joints, ivory-and-gold shin greaves & splayed 3-toed feet!
  const lr = S.legR, gearAng = q.wheelAngle ?? 0
  const buildTortoiseLeg = (top, mid, fet, hoof, sd, far, isFront) => {
    const br = dim(C2, far), iv = dim(C1, far), gd = dim(BD, far), hv = dim(HV, far)
    const upper = sdf.capsule(top, mid, lr[0] * 0.92, lr[1] * 0.92).mat(br)
    // Prominent circular brass knee-hub dial on outer face of leg
    const hubAt = add3(mid, mul3(q.r, sd * (lr[1] * 0.72)))
    const kneeGear = sdf.union(
      sdf.torus(1.35, 0.45).rotate(90, "y").rotate(yaw, "z").at(hubAt),
      sdf.sphere(0.82).at(hubAt),
    ).paint((p, n) => SHINE(gd, n))
    // Curved ivory-ceramic shin greave plate rimmed with burnished gold wrapping the lower leg
    const shinCore = sdf.capsule(mid, fet, lr[1] * 0.88, lr[2] * 0.96).paint((p, n) => {
      const t = clamp((mid[2] - p[2]) / Math.max(1, mid[2] - fet[2]), 0, 1)
      const rel = sub3(p, lerp3(mid, fet, t))
      const outSide = dot3(rel, q.r) * sd + dot3(rel, q.f) * (isFront ? 0.85 : 0.45)
      if (t > 0.14 && t < 0.86 && outSide > -0.25) {
        if (t < 0.26 || t > 0.76) return SHINE(gd, n) // gold top & bottom greave trim!
        return iv
      }
      return br
    })
    // Massive splayed 3-toed dark bronze & gold-capped mechanical tortoise foot planted flat on the ground!
    const anklePad = sdf.capsule(fet, add3(hoof, [0, 0, 0.4]), lr[2] * 1.05, lr[3] * 1.05).intersect(sdf.plane([0, 0, -1], 0.05)).mat(br)
    const fDir = isFront ? q.f : mul3(q.f, 0.6)
    const toes = [-1, 0, 1].map((ti) => {
      const toeDir = unit3(add3(mul3(fDir, 0.85), mul3(q.r, ti * 0.65 + sd * 0.25)))
      const toePos = add3(hoof, add3(mul3(toeDir, 1.85), [0, 0, 0.35]))
      return bodyRot(sdf.box([1.05, 1.25, 1.05], 0.30)).at(toePos)
        .intersect(sdf.plane([0, 0, -1], 0.05))
        .paint((p, n) => (p[2] > 1.15 ? SHINE(gd, n) : hv))
    })
    return [upper, kneeGear, shinCore, anklePad, ...toes]
  }
  q.frontLegs.forEach((L, i) => { parts[`mount_fleg${i}`] = buildTortoiseLeg(L.sh, L.knee, L.fet, L.hoof, L.sd, i === q.farSide, true) })
  q.hindLegs.forEach((L, i) => { parts[`mount_hleg${i}`] = buildTortoiseLeg(L.hip, L.stifle, L.fet, L.hoof, L.sd, i === q.farSide, false) })

  // 5. Caravan Top Superstructure: elevated sage-green cushioned armchair + front brass grab-bar handle!
  if (spec.saddle !== false) {
    const seatBase = bodyRot(sdf.box([4.2, 3.2, 1.15], 0.35)).at(atBodyRel(q.saddle, 0, 0, -0.35)).paint((p, n) => (p[2] > q.saddle[2] + 0.15 ? BL : SHINE(BD, n)))
    const seatBack = bodyRot(sdf.box([4.0, 0.88, 3.6], 0.42)).at(atBodyRel(q.saddle, -2.9, 0, 2.75)).paint((p, n) => {
      const rel = sub3(p, atBodyRel(q.saddle, -2.9, 0, 2.75)), lat = Math.abs(dot3(rel, q.r)), du = dot3(rel, q.bodyUp)
      if (lat > 3.1 || du > 2.75) return SHINE(BD, n) // curved gold backrest frame!
      if (lat < 0.48 && Math.abs(du) < 1.8) return TR // gold leaf emblem on chair back!
      return BL
    })
    // Front U-shaped brass grab-bar handle in front of driver seat
    const gL0 = atBodyRel(q.origin, 6.2, -2.4, 5.4), gL1 = atBodyRel(q.origin, 6.2, -2.4, 9.2)
    const gR0 = atBodyRel(q.origin, 6.2, 2.4, 5.4), gR1 = atBodyRel(q.origin, 6.2, 2.4, 9.2)
    const grabBar = sdf.union(
      sdf.capsule(gL0, gL1, 0.56, 0.56),
      sdf.capsule(gR0, gR1, 0.56, 0.56),
      sdf.capsule(gL1, gR1, 0.62, 0.62),
      { smooth: 0.2 },
    ).paint((p, n) => (Math.abs(dot3(sub3(p, gL1), q.r) - 2.4) < 1.2 && dot3(sub3(p, q.origin), q.bodyUp) > 8.6 ? SD : SHINE(BD, n)))
    parts.mount_saddle = [seatBase, seatBack, grabBar]
  }

  // 6. Twin symmetrical brass-bound wooden side cargo chests + snug rolled bedrolls flanking the driver chair
  //    (matches the exact 3D caravan deck layout of Montaria Mecânica com Carga.glb in S, SW, W, NW, N!)
  if (spec.bags !== false) {
    const bagParts = []
    for (const sd of [-1, 1]) {
      const chestAt = atBodyRel(q.origin, -3.2, sd * 6.0, 6.8)
      bagParts.push(bodyRot(sdf.box([2.2, 4.4, 1.85], 0.24)).at(chestAt).paint((p, n) => {
        const rel = sub3(p, chestAt), lat = Math.abs(dot3(rel, q.r)), df = Math.abs(dot3(rel, q.bodyFwd)), du = dot3(rel, q.bodyUp)
        if (lat > 1.55 || df > 3.55 || Math.abs(du) > 1.35 || (df < 0.65 && Math.abs(du) < 0.7)) return SHINE(BD, n)
        return SD
      }))
      // Snug rolled cream canvas bedroll strapped along the top of each side chest (stays cleanly BELOW backrest top!)
      const rA = atBodyRel(q.origin, -6.2, sd * 6.0, 9.3), rB = atBodyRel(q.origin, -0.4, sd * 6.0, 9.3)
      bagParts.push(sdf.capsule(rA, rB, 1.32, 1.32).paint((p) => {
        const df = dot3(sub3(p, atBodyRel(q.origin, -3.3, sd * 6.0, 9.3)), q.bodyFwd)
        if (Math.abs(Math.abs(df) - 1.5) < 0.42) return SD.slice(0, 3) // twin leather straps!
        return C1
      }))
    }
    // Low rear brass-bound storage box across the tail of the deck behind the chair backrest
    const rearChestAt = atBodyRel(q.origin, -7.8, 0, 6.9)
    bagParts.push(bodyRot(sdf.box([5.4, 1.9, 1.9], 0.24)).at(rearChestAt).paint((p, n) => {
      const rel = sub3(p, rearChestAt), lat = Math.abs(dot3(rel, q.r)), du = dot3(rel, q.bodyUp)
      if (lat > 4.4 || Math.abs(du) > 1.35 || lat < 0.65) return SHINE(BD, n)
      return SD
    }))
    parts.mount_bags = bagParts
  }

  // 7. Pointed sage-green heraldic caravan banners with gold trim & leaf stripe draping down both flanks & rear!
  if (spec.blanket !== false) {
    const bannerPaint = (center, widthAxis, halfW, topU, botU) => (p) => {
      const rel = sub3(p, center), w = Math.abs(dot3(rel, widthAxis)), du = dot3(rel, q.bodyUp)
      if (w > halfW - 0.82 || du < botU + 0.85) return TR // gold banner border!
      if (w < 0.58 && du > botU + 1.8 && du < topU - 1.2) return TR // gold leaf emblem stripe!
      return BL
    }
    const sideBanners = [-1, 1].map((sd) => {
      const bc = atBodyRel(q.origin, -0.2, sd * (S.barrelW + 0.35), 0.2)
      return bodyRot(sdf.box([0.55, 3.1, 4.6], 0.18)).at(bc).paint(bannerPaint(bc, q.bodyFwd, 3.1, 4.6, -4.6))
    })
    const rearBc = atBodyRel(q.origin, -(S.halfLen + 0.1), 0, 0.2)
    const rearBanner = bodyRot(sdf.box([2.8, 0.55, 4.4], 0.18)).at(rearBc).paint(bannerPaint(rearBc, q.r, 2.8, 4.4, -4.4))
    parts.mount_blanket = [...sideBanners, rearBanner]
  }

  const barrelProxy = sdf.union(barrelField, ...(parts.mount_saddle ?? []), ...(parts.mount_bags ?? []))
  const fullProxy = sdf.union(barrelProxy, neckField, skullField)
  return { parts, barrelProxy, fullProxy }
}

// ---------------------------------------------------------------- Phase 2D: Curated Lion-Maned Riding Direwolf (`wolf`)
// Faithful to curated direwolf reference: proud high-held wolf head, massive layered silver-grey & cream shaggy mane,
// tall white-legged athletic limbs with broad clawed paws, huge sweeping downward feathered tail, brown leather saddle,
// pointed crimson-and-gold flank banners, rolled cream bedroll, leather saddlebags & ornate brass breastplate harness!
const buildWolfParts = (q, spec, _cp, keys = MKEYS) => {
  const S = q.S, parts = {}
  const C1 = keys.coat, C2 = keys.coat2, MN = keys.mane, HV = keys.hooves, SD = keys.saddle, BL = keys.blanket, TR = keys.trim, MT = keys.metal, BD = keys.barding, EY = keys.eye
  const yaw = -q.heading, headYaw = -(q.heading + q.headYawDeg)
  const bodyRot = (fld) => (Math.abs(q.pitchDeg) > 0.2 ? fld.rotate(q.pitchDeg, "x").rotate(yaw, "z") : fld.rotate(yaw, "z"))
  const headRot = (fld) => (Math.abs(q.headPitchDeg) > 0.2 ? fld.rotate(q.headPitchDeg, "x").rotate(headYaw, "z") : fld.rotate(headYaw, "z"))
  const atBodyRel = (pt, df, dr, du) => add3(pt, add3(mul3(q.bodyFwd, df), add3(mul3(q.r, dr), mul3(q.bodyUp, du))))
  const furPaint = (p, n) => {
    const rel = sub3(p, q.origin), df = dot3(rel, q.bodyFwd), du = dot3(rel, q.bodyUp)
    // Bright warm cream-white chest, lower belly & inner flanks contrasting with rich wolf-grey dorsal coat!
    if (n[2] < -0.22) return C2
    if (df > 5.4 && du < 0.8) return C2
    if (du < -1.8) return C2
    return C1
  }

  // 1. Powerful athletic direwolf body: deep proud chest tapering to lean tucked waist & strong muscular haunches
  const chestBall = bodyRot(sdf.ellipsoid(S.chestR)).at(q.chest)
  const withersBall = bodyRot(sdf.ellipsoid(S.withersR)).at(q.withers)
  const croupBall = bodyRot(sdf.ellipsoid(S.croupR)).at(q.croup)
  const ribSpan = sdf.capsule(atBodyRel(q.croup, 0, 0, 0.55), atBodyRel(q.chest, 0, 0, -0.35), S.barrelW * 0.82, S.barrelW * 0.98)
  const barrelField = sdf.union(chestBall, withersBall, croupBall, ribSpan, { smooth: 1.75 }).intersect(sdf.plane([0, 0, -1], 0.1))
  parts.mount_body = barrelField.paint(furPaint)

  // 2. Proud lion-maned wolf neck: wide layered silver-grey dorsal & cheek ruff smoothly anchored into the withers
  //    so lowering the head to eat/drink/sniff bends continuously without splitting or clipping saddle/harness!
  const neckDir = unit3(sub3(q.poll, q.neckBase))
  const neckDorsal = unit3(cross3(q.r, neckDir))
  const downFrac = clamp((q.neckPitchDeg - 15) / 55, 0, 1)
  const neckTop = add3(q.poll, add3(mul3(q.eyeFwd, -0.8), mul3(q.eyeUp, -0.6)))
  const rTop = add3(q.poll, add3(mul3(neckDorsal, 2.1 - 0.5 * downFrac), mul3(neckDir, -0.9)))
  const rMid = add3(lerp3(q.neckMid, q.neckBase, 0.25 * downFrac), mul3(neckDorsal, 2.6 - 0.8 * downFrac))
  const rBack = atBodyRel(q.withers, 0.6 + 1.0 * downFrac, 0, 2.2 - 0.9 * downFrac)
  // Layered wolf chest mane tucked cleanly behind the leather V-breastplate harness even when neck lowers deeply!
  const throatAnchor = add3(lerp3(q.neckMid, q.neckBase, 0.28 + 0.58 * downFrac), mul3(neckDorsal, -1.4))
  const frontMane1 = sdf.capsule(throatAnchor, atBodyRel(q.chest, 2.1 - 0.5 * downFrac, 0, 1.0), 2.1 - 0.55 * downFrac, 2.35 - 0.45 * downFrac)
  const frontMane2 = sdf.capsule(atBodyRel(q.chest, 2.1 - 0.5 * downFrac, 0, 1.0), atBodyRel(q.chest, 1.9, 0, -2.5), 2.25 - 0.35 * downFrac, 1.65)
  const sideRuffs = [-1, 1].flatMap((sd) => [
    sdf.capsule(add3(lerp3(q.poll, q.neckMid, 0.45 + 0.40 * downFrac), add3(mul3(q.r, sd * (1.9 - 0.35 * downFrac)), mul3(neckDorsal, 0.2))), atBodyRel(q.chest, 1.0, sd * (4.3 - 0.75 * downFrac), 1.7 - 0.7 * downFrac), 2.05 - 0.35 * downFrac, 1.45),
    sdf.capsule(add3(lerp3(q.neckMid, q.neckBase, 0.35 * downFrac), add3(mul3(q.r, sd * (2.3 - 0.45 * downFrac)), mul3(neckDorsal, -0.4))), atBodyRel(q.chest, 1.7, sd * (4.0 - 0.65 * downFrac), -1.1), 1.90 - 0.35 * downFrac, 1.30),
    sdf.capsule(add3(q.neckBase, add3(mul3(q.r, sd * 1.9), mul3(q.bodyUp, -1.8))), atBodyRel(q.chest, 2.1, sd * 3.1, -3.6), 1.55, 1.05),
  ])
  const neckField = sdf.union(
    sdf.capsule(q.neckBase, q.neckMid, S.neckR[0] * (0.90 - 0.10 * downFrac), S.neckR[1] * (0.90 - 0.08 * downFrac)),
    sdf.capsule(q.neckMid, neckTop, S.neckR[1] * (0.90 - 0.08 * downFrac), S.neckR[2] * 0.94),
    sdf.capsule(rTop, rMid, 2.05, 2.55 - 0.45 * downFrac),
    sdf.capsule(rMid, rBack, 2.45 - 0.45 * downFrac, 1.70),
    sdf.capsule(rBack, q.neckBase, 1.80, S.neckR[0] * 0.80),
    frontMane1, frontMane2, ...sideRuffs,
    { smooth: 0.65 },
  ).paint((p, n) => {
    const rel = sub3(p, q.neckBase), fwdN = dot3(rel, q.bodyFwd), upN = dot3(rel, q.bodyUp), latN = Math.abs(dot3(rel, q.r))
    const tuft = Math.sin(p[0] * 1.4 + p[1] * 1.4 + p[2] * 1.6)
    // Rich layered silver-grey wolf mane with subtle pale-cream center throat fluff (NOT a solid white bib!)
    if (fwdN > 2.0 && upN > 0.2 && upN < 5.2 && latN < 2.1) return tuft > 0.15 ? C2 : MN.slice(1)
    if (n[2] < -0.35) return C2
    return tuft > 0.25 ? MN.slice(1) : C1
  })
  // Fuse torso + shaggy neck/mane seamlessly into one continuous fur volume so lowering the head NEVER exposes a hard part-cut across the withers!
  parts.mount_body = sdf.union(barrelField.paint(furPaint), neckField, { smooth: 0.48 })

  // 3. Noble high-held direwolf head: rounded wolf cranium with crisp brow stop, proud slightly-tapered muzzle,
  //    bright cream cheeks & lower jaw, sleek dark-grey bridge, compact black nose tip, fierce amber eyes & tall ears!
  //    When `q.jawOpen > 0.04` (during `bite`), upper snout lifts, lower jaw swings wide open, exposing dark gape, crimson tongue & sharp white fangs!
  const muzzleLen = len3(sub3(q.muzzle, q.poll)) || 1
  const jo = q.jawOpen ?? 0
  const cranium = headRot(sdf.ellipsoid(S.craniumR)).at(q.poll)
  // Fluffy layered cream cheek ruffs framing the wolf's face cleanly in S, SW, and W!
  const cheekRuffs = [-1, 1].map((sd) => sdf.capsule(
    add3(q.poll, add3(mul3(q.headR, sd * 2.05), add3(mul3(q.eyeFwd, 0.25), mul3(q.eyeUp, -0.85)))),
    add3(q.poll, add3(mul3(q.headR, sd * 3.85), add3(mul3(q.eyeFwd, -1.45), mul3(q.eyeUp, -1.95)))),
    1.75, 1.15,
  ))
  const snoutStart = add3(q.poll, add3(mul3(q.eyeFwd, 2.15), mul3(q.eyeUp, -0.92 + jo * 0.25)))
  const snoutEnd = add3(q.poll, add3(mul3(q.eyeFwd, muzzleLen * 0.94), mul3(q.eyeUp, -1.18 + jo * 1.15)))
  const muzzleBridge = sdf.capsule(snoutStart, snoutEnd, S.muzzleR[0], S.muzzleR[1])
  const muzzleTip = headRot(sdf.box([1.35, 1.38, 0.96], 0.42)).at(lerp3(snoutStart, snoutEnd, 0.78))
  const jawStart = add3(q.poll, add3(mul3(q.eyeFwd, 1.65), mul3(q.eyeUp, -1.85 - jo * 0.25)))
  const jawEnd = add3(q.poll, add3(mul3(q.eyeFwd, muzzleLen * (0.84 - jo * 0.10)), mul3(q.eyeUp, -1.92 - jo * 2.70)))
  const lowerJaw = sdf.capsule(jawStart, jawEnd, S.muzzleR[0] * (jo > 0.04 ? 0.68 : 0.78), S.muzzleR[1] * (jo > 0.04 ? 0.62 : 0.72))
  const skullDome = sdf.union(cranium, ...cheekRuffs, { smooth: 0.58 })
  const muzzleUnit = jo > 0.04
    ? sdf.union(sdf.union(muzzleBridge, muzzleTip, { smooth: 0.24 }), lowerJaw, { smooth: 0.06 })
    : sdf.union(muzzleBridge, muzzleTip, lowerJaw, { smooth: 0.28 })
  const eyeCenters = [-1, 1].map((sd) => add3(q.poll, add3(mul3(q.eyeFwd, 2.48), add3(mul3(q.headR, sd * 1.72), mul3(q.eyeUp, 0.55)))))
  const noseTipPos = add3(snoutEnd, add3(mul3(q.eyeFwd, 0.75), mul3(q.eyeUp, 0.18)))
  const sideView = Math.abs(q.headF[1]) < 0.85
  const skullField = sdf.union(skullDome, muzzleUnit, { smooth: 0.22 }).paint((p, n) => {
    const rel = sub3(p, q.poll), fwdP = dot3(rel, q.eyeFwd), lat = Math.abs(dot3(rel, q.headR)), zP = dot3(rel, q.eyeUp)
    // Fierce golden-amber wolf eyes tucked cleanly beneath dark angled wolf brows (closed dark slit when dead!)
    for (const ec of eyeCenters) {
      const ep = sub3(p, ec), ed = len3(ep)
      if (ed < 1.15 && dot3(n, CAM_DIR) > 0.10) {
        if (q.dead) return Math.abs(dot3(ep, q.eyeUp)) < 0.35 ? INK : C1
        if (dot3(ep, q.eyeUp) > 0.38) return INK
        return ed < 0.78 ? EY[1] : INK
      }
    }
    // Crisp compact BLACK wolf nose tip (`INK`) at very upper-front of muzzle
    const nr = sub3(p, noseTipPos)
    const nf = dot3(nr, q.eyeFwd), nl = Math.abs(dot3(nr, q.headR)), nz = dot3(nr, q.eyeUp)
    if ((nf / 1.25) ** 2 + (nl / 1.25) ** 2 + (nz / 0.78) ** 2 < 1.0 && nz >= -0.62) return INK
    // Clean subtle dark mouth-line along side of lower jaw (when jaws closed in SW/W profile views)
    if (jo <= 0.04 && sideView && fwdP >= 2.8 && fwdP <= muzzleLen * 0.86 && Math.abs(zP + 1.82) < 0.22 && lat >= 0.85) return INK
    // Iconic curated direwolf white-face counter-shading (`direwolf - frente.png`!):
    // rich wolf-grey forehead + sleek upper nasal bridge all the way to the black nose (`C1`),
    // bright warm cream-white cheeks, whisker pads & lower jaw (`C2`)!
    if (zP < -1.32 && fwdP > 1.25) return C2.slice(1)
    if (zP < -0.58 && lat > 1.85) return C2.slice(1)
    return C1
  })
  // Articulated gaping mouth interior (dark maw, crimson tongue & gleaming white fangs!) visible whenever jaw opens!
  const mawParts = []
  if (jo > 0.12) {
    const mawBack = add3(q.poll, add3(mul3(q.eyeFwd, 2.65), mul3(q.eyeUp, -1.65 - jo * 0.55)))
    const mawFront = lerp3(snoutEnd, jawEnd, 0.52)
    mawParts.push(sdf.capsule(mawBack, lerp3(mawBack, mawFront, 0.65), 1.35 * jo, 1.05 * jo).mat(INK))
    mawParts.push(sdf.capsule(add3(jawStart, mul3(q.eyeUp, 0.55)), add3(lerp3(jawStart, jawEnd, 0.72), mul3(q.eyeUp, 0.52)), 0.78, 0.62).mat("ę"))
    for (const sd of [-1, 1]) {
      const ufBase = add3(lerp3(snoutStart, snoutEnd, 0.78), add3(mul3(q.headR, sd * 0.88), mul3(q.eyeUp, -0.55)))
      const ufTip = add3(ufBase, add3(mul3(q.eyeFwd, 0.18), mul3(q.eyeUp, -1.35 * Math.min(1, jo * 1.15))))
      const lfBase = add3(lerp3(jawStart, jawEnd, 0.76), add3(mul3(q.headR, sd * 0.78), mul3(q.eyeUp, 0.45)))
      const lfTip = add3(lfBase, add3(mul3(q.eyeFwd, 0.15), mul3(q.eyeUp, 1.05 * Math.min(1, jo * 1.15))))
      mawParts.push(sdf.capsule(ufBase, ufTip, 0.44, 0.22).mat("ą"), sdf.capsule(lfBase, lfTip, 0.36, 0.18).mat("ą"))
    }
  }
  const earFields = q.ears.map((E) => sdf.capsule(E.base, E.tip, S.earR[0], S.earR[1]).paint((p) => {
    const along = dot3(sub3(p, E.base), q.headF)
    return along > 0.24 ? C2.slice(1, 4) : C1
  }))
  parts.mount_head = [skullField, ...mawParts, ...earFields]

  // 4. Huge plush silver-grey feathered wolf tail sweeping majestically DOWNWARD behind the hind legs (`direwolf.glb`!)
  const [td, ta, tm, tt] = q.tail, tr = S.tailR
  parts.mount_tail = sdf.union(
    sdf.capsule(td, ta, tr[0], tr[1]),
    sdf.capsule(ta, tm, tr[1], tr[2]),
    sdf.capsule(tm, tt, tr[2], tr[3]),
    { smooth: 0.95 },
  ).intersect(sdf.plane([0, 0, -1], 0.1)).paint((p, n) => {
    const distTip = len3(sub3(p, tt))
    const tuft = Math.sin(p[2] * 1.45 + p[0] * 0.8)
    // Lush layered silver-grey wolf tail feathers with pale cream underside & tip (`direwolf.glb`!)
    if (distTip < 4.5 || n[2] < -0.32) return tuft > 0.25 ? C2.slice(1) : C2
    return tuft > 0.30 ? MN.slice(1) : C1
  })

  // 5. Tall athletic white-legged direwolf limbs ending in BIG broad clawed wolf paws (`direwolf - frente.png`!)
  const lr = S.legR
  const wolfPaw = (hoof, far) => {
    const pawTip = add3(hoof, add3(mul3(q.f, 2.05), [0, 0, -0.10]))
    const pad = sdf.union(
      sdf.capsule(add3(hoof, [0, 0, 0.72]), pawTip, S.hoofR * 0.92, S.hoofR * 0.82),
      bodyRot(sdf.ellipsoid([S.hoofR * 1.08, S.hoofR * 1.22, 0.95])).at(add3(hoof, add3(mul3(q.f, 1.15), [0, 0, 0.45]))),
      { smooth: 0.3 },
    ).intersect(sdf.plane([0, 0, -1], 0.05))
    return pad.paint((p) => (len3(sub3(p, pawTip)) < 1.15 && p[2] < 1.15 ? dim(HV, far).slice(0, 2) : dim(C2, far)))
  }
  const wolfLimbPaint = (far) => (p) => (p[2] < 11.2 ? dim(C2, far) : dim(C1, far))
  q.frontLegs.forEach((L, i) => {
    const far = i === q.farSide
    const body = sdf.union(
      sdf.capsule(L.sh, L.knee, lr[0], lr[1]),
      sdf.capsule(L.knee, L.fet, lr[1] * 0.92, lr[2]),
      sdf.capsule(L.fet, add3(L.hoof, [0, 0, 0.85]), lr[2] * 0.96, lr[3]),
      { smooth: 0.45 },
    ).paint(wolfLimbPaint(far))
    parts[`mount_fleg${i}`] = [body, wolfPaw(L.hoof, far)]
  })
  q.hindLegs.forEach((L, i) => {
    const far = i === q.farSide
    const body = sdf.union(
      sdf.capsule(L.hip, L.stifle, lr[0] * 1.25, lr[0] * 0.96),
      sdf.capsule(L.stifle, L.hock, lr[0] * 0.88, lr[1] * 0.94),
      sdf.capsule(L.hock, L.fet, lr[1] * 0.88, lr[2]),
      sdf.capsule(L.fet, add3(L.hoof, [0, 0, 0.85]), lr[2] * 0.96, lr[3]),
      { smooth: 0.50 },
    ).paint(wolfLimbPaint(far))
    parts[`mount_hleg${i}`] = [body, wolfPaw(L.hoof, far)]
  })

  // 6. Curated Direwolf Scout Tack: high leather saddle, prominent crimson pointed flank banners with gold leaf trim,
  //    rolled cream bedroll behind cantle, twin leather saddlebags, & bold brass-ringed leather chest breastplate!
  if (spec.blanket !== false) {
    // Pointed crimson/burgundy heraldic flank banners draping clearly below the saddle flaps (`direwolf - frente.png`!)
    const banners = [-1, 1].map((sd) => {
      const bc = atBodyRel(q.saddle, -0.3, sd * (S.barrelW + 0.56), -4.1)
      return bodyRot(sdf.box([0.55, 2.85, 4.35], 0.16)).at(bc).paint((p) => {
        const rel = sub3(p, bc), df = Math.abs(dot3(rel, q.bodyFwd)), du = dot3(rel, q.bodyUp)
        if (df > 2.15 || du < -3.55) return TR // gold border trim!
        if (df < 0.52 && du > -2.7 && du < 2.2) return TR // central gold leaf stripe!
        return BL
      })
    })
    parts.mount_blanket = banners
  }
  if (spec.saddle !== false) {
    const flankW = S.barrelW + 0.35
    const pommel = bodyRot(sdf.ellipsoid([S.barrelW * 0.64, 1.50, 2.25])).at(atBodyRel(q.saddle, 2.70, 0, 1.55))
    const cantle = bodyRot(sdf.ellipsoid([S.barrelW * 0.68, 1.75, 2.35])).at(atBodyRel(q.saddle, -3.3, 0, 1.55))
    const seat = bodyRot(sdf.ellipsoid([S.barrelW * 0.88, 3.55, 1.72])).at(atBodyRel(q.saddle, 0, 0, 0.45))
    const flaps = [-1, 1].map((sd) => bodyRot(sdf.ellipsoid([0.62, 2.0, 2.0])).at(atBodyRel(q.saddle, 0.1, sd * flankW, -1.45)))
    const sadCore = sdf.union(pommel, cantle, seat, ...flaps, { smooth: 0.45 }).paint((p) => {
      const dz = dot3(sub3(p, q.saddle), q.bodyUp)
      return dz > 1.35 ? SD.slice(1) : dz < -2.4 ? SD.slice(0, 2) : SD
    })
    parts.mount_saddle = [sadCore]
  }
  if (spec.bags !== false) {
    // Rolled cream canvas bedroll strapped horizontally across the croup right behind the cantle (`direwolf - costas.png`!)
    const rollC = atBodyRel(q.saddle, -5.8, 0, 1.45)
    const bedroll = sdf.capsule(add3(rollC, mul3(q.r, -3.2)), add3(rollC, mul3(q.r, 3.2)), 1.52, 1.52).paint((p) => {
      const lat = Math.abs(dot3(sub3(p, rollC), q.r))
      if (Math.abs(lat - 1.65) < 0.45) return SD.slice(0, 3) // dark leather buckle straps!
      return C2
    })
    // Twin leather saddlebags with gold buckle clasps tucked behind the crimson flank banners
    const pouches = [-1, 1].map((sd) => {
      const pc = atBodyRel(q.saddle, -4.8, sd * (S.barrelW + 0.58), -1.65)
      return bodyRot(sdf.box([1.15, 1.85, 1.75], 0.35)).at(pc).paint((p, n) => {
        const rel = sub3(p, pc)
        if (Math.abs(dot3(rel, q.bodyFwd)) < 0.48 && Math.abs(dot3(rel, q.bodyUp)) < 0.48) return SHINE(BD, n)
        return SD
      })
    })
    parts.mount_bags = [bedroll, ...pouches]
  }
  if (spec.bridle !== false) {
    // Bold leather breastplate harness sitting PROUDLY OUTSIDE the chest mane even during deep eat/drink/sniff poses!
    // Sweeping brown leather chest straps, big brass shoulder rings & ornate V-shaped brass chest medallion + hanging tassel!
    const chestMed = atBodyRel(q.chest, 6.05, 0, -0.75 - 0.55 * downFrac)
    const harnessParts = []
    for (const sd of [-1, 1]) {
      const ringAt = atBodyRel(q.chest, 1.0, sd * (S.chestR[0] + 0.72), 1.85 - 0.35 * downFrac)
      const strapMid = atBodyRel(q.chest, 4.75, sd * 3.85, 0.55 - 0.45 * downFrac)
      const sadLink = atBodyRel(q.saddle, 2.45, sd * (S.barrelW + 0.35), 0.55)
      const sadMid = atBodyRel(q.saddle, 4.8, sd * (S.barrelW + 0.78), 1.15 - 0.2 * downFrac)
      const girthBot = atBodyRel(q.saddle, 1.2, sd * (S.barrelW + 0.42), -3.8)
      harnessParts.push(
        sdf.capsule(sadLink, sadMid, 0.70, 0.70).mat(SD),
        sdf.capsule(sadMid, ringAt, 0.70, 0.70).mat(SD),
        sdf.capsule(ringAt, girthBot, 0.64, 0.64).mat(SD.slice(0, 3)),
        sdf.capsule(ringAt, strapMid, 0.80, 0.80).mat(SD),
        sdf.capsule(strapMid, chestMed, 0.84, 0.84).mat(SD),
        sdf.torus(1.24, 0.44).rotate(90, "y").rotate(yaw, "z").at(ringAt).paint((p, n) => SHINE(BD, n)),
      )
    }
    const medallion = bodyRot(sdf.box([2.45, 0.98, 2.05], 0.35)).at(chestMed).paint((p, n) => {
      const rel = sub3(p, chestMed), lat = Math.abs(dot3(rel, q.r)), du = Math.abs(dot3(rel, q.bodyUp))
      if (lat > 1.7 || du > 1.35 || lat < 0.45) return SHINE(BD, n)
      return SD.slice(0, 3)
    })
    const tassel = sdf.capsule(add3(chestMed, add3(mul3(q.bodyFwd, -0.2), mul3(q.bodyUp, -1.4))), add3(chestMed, add3(mul3(q.bodyFwd, -0.4), mul3(q.bodyUp, -4.6))), 0.78, 0.56).mat(SD)
    parts.mount_bridle = [...harnessParts, medallion, tassel]
  }

  const barrelProxy = sdf.union(barrelField, ...(parts.mount_saddle ?? []), ...(parts.mount_bags ?? []))
  const fullProxy = sdf.union(barrelProxy, neckField, skullField, ...earFields)
  return { parts, barrelProxy, fullProxy }
}

// ---------------------------------------------------------------- Phase 2E: Full-Scale Wooden Spoked-Wheel Wagon (`cart`)
const buildCartParts = (q, spec) => {
  const S = q.S, parts = {}
  const C1 = MKEYS.coat, C2 = MKEYS.coat2, SD = MKEYS.saddle, BL = MKEYS.blanket, TR = MKEYS.trim, BD = MKEYS.barding, MT = MKEYS.metal
  const yaw = -q.heading
  const bodyRot = (fld) => (Math.abs(q.pitchDeg) > 0.2 ? fld.rotate(q.pitchDeg, "x").rotate(yaw, "z") : fld.rotate(yaw, "z"))
  const atBodyRel = (pt, df, dr, du) => add3(pt, add3(mul3(q.bodyFwd, df), add3(mul3(q.r, dr), mul3(q.bodyUp, du))))
  const hasCanopy = spec.canopy !== false

  const plankPaint = (p) => {
    const du = dot3(sub3(p, q.origin), q.bodyUp), df = dot3(sub3(p, q.origin), q.bodyFwd)
    if (Math.abs(((du + 20) % 2.4) - 1.2) < 0.22) return C2.slice(0, 2) // horizontal timber plank seam
    if (Math.abs(df) > S.halfLen - 1.1) return C2.slice(1, 4) // corner timber framing
    return C1
  }

  // 1. Full-scale slatted wooden wagon bed, upright side stakes, axles, front driver bench & iron brackets
  const bedFloor = bodyRot(sdf.box([S.barrelW, S.halfLen, 1.55], 0.28)).at(atBodyRel(q.origin, 0, 0, -2.4))
  const leftWall = bodyRot(sdf.box([0.95, S.halfLen, 4.1], 0.22)).at(atBodyRel(q.origin, 0, -S.barrelW + 0.6, 1.8))
  const rightWall = bodyRot(sdf.box([0.95, S.halfLen, 4.1], 0.22)).at(atBodyRel(q.origin, 0, S.barrelW - 0.6, 1.8))
  const backWall = bodyRot(sdf.box([S.barrelW, 0.95, 4.2], 0.22)).at(atBodyRel(q.origin, -S.halfLen + 0.6, 0, 1.85))
  const frontDash = bodyRot(sdf.box([S.barrelW * 0.94, 0.88, 3.4], 0.22)).at(atBodyRel(q.origin, S.halfLen - 0.5, 0, 1.2))
  // Vertical corner & mid side timber stakes
  const posts = []
  for (const df of [-S.halfLen + 0.8, -5.0, 4.8, S.halfLen - 0.8]) {
    for (const sd of [-1, 1]) {
      posts.push(sdf.capsule(atBodyRel(q.origin, df, sd * (S.barrelW - 0.25), -3.6), atBodyRel(q.origin, df, sd * (S.barrelW - 0.25), 5.8), 0.76, 0.72))
    }
  }
  // Heavy undercarriage timber axles connecting left & right wheel hubs
  const fAxle = sdf.capsule(q.frontLegs[0].sh, q.frontLegs[1].sh, 1.05, 1.05).mat(C2.slice(0, 3))
  const hAxle = sdf.capsule(q.hindLegs[0].sh, q.hindLegs[1].sh, 1.15, 1.15).mat(C2.slice(0, 3))
  const bedSolid = sdf.union(bedFloor, leftWall, rightWall, backWall, frontDash, ...posts, { smooth: 0.14 }).paint(plankPaint)
  // Raised wooden driver bench across the front of the wagon (`q.saddle`)
  const bench = bodyRot(sdf.box([S.barrelW * 0.92, 2.1, 1.05], 0.28)).at(atBodyRel(q.saddle, 0, 0, -0.35)).mat(SD)
  const benchBack = bodyRot(sdf.box([S.barrelW * 0.90, 0.75, 2.35], 0.22)).at(atBodyRel(q.saddle, -1.9, 0, 1.35)).mat(SD.slice(0, 3))
  parts.mount_body = [bedSolid, fAxle, hAxle, bench, benchBack]

  // 2. Four full-sized rotating 3D spoked wooden wheels (rear 16.4 px dia, front 12.8 px dia!) with iron tire rims & hubs!
  //    In `downed`, one front wheel cants askew off its snapped axle; in `dead`, it lies fallen flat beside the wrecked wagon!
  const buildWheel = (L, idx, far) => {
    const wr = L.rWheel
    const isBroken = L.isFront && (q.farSide === -1 ? idx === 1 : !far)
    if (q.dead && isBroken) {
      // Fallen broken front wheel lying flat on the ground beside the crashed wagon!
      const flatHub = [L.sh[0] + q.f[0] * 1.4 + q.r[0] * L.sd * 2.2, L.sh[1] + q.f[1] * 1.4 + q.r[1] * L.sd * 2.2, 1.0]
      const rim = sdf.torus(wr - 0.62, 0.78).at(flatHub).intersect(sdf.plane([0, 0, -1], 0.05)).paint((p) => (len3(sub3(p, flatHub)) > wr - 0.45 ? MT.slice(0, 2) : C1))
      const hubCap = sdf.sphere(1.35).at(flatHub).mat(MT)
      const spokes = []
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + 0.35
        const tip = [flatHub[0] + Math.cos(a) * (wr - 0.85), flatHub[1] + Math.sin(a) * (wr - 0.85), flatHub[2]]
        spokes.push(sdf.capsule(flatHub, tip, 0.50, 0.46))
      }
      return [rim, hubCap, sdf.union(spokes).mat(C2.slice(1, 4))]
    }
    const dmg = q.downed ? 1 : (q.collapsed ?? 0)
    const cantDeg = dmg > 0.05 && isBroken ? 28 * dmg * L.sd : 0
    const cantRad = cantDeg * RAD
    const hub = cantDeg ? add3(L.sh, add3(mul3(q.r, L.sd * 1.3 * dmg), [0, 0, -0.7 * dmg])) : L.sh
    const rim = sdf.torus(wr - 0.62, 0.78).rotate(90 + cantDeg, "y").rotate(yaw, "z").at(hub).intersect(sdf.plane([0, 0, -1], 0.05)).paint((p) => {
      const dist = len3(sub3(p, hub))
      return dist > wr - 0.45 ? dim(MT.slice(0, 2), far) : dim(C1, far) // dark iron tire over wooden felloe!
    })
    const hubAxis = cantDeg ? add3(mul3(q.r, Math.cos(cantRad)), mul3(UP, -Math.sin(cantRad))) : q.r
    const wheelUp = cantDeg ? add3(mul3(UP, Math.cos(cantRad)), mul3(q.r, Math.sin(cantRad))) : UP
    const hubCap = sdf.capsule(add3(hub, mul3(hubAxis, -1.25)), add3(hub, mul3(hubAxis, 1.25)), 1.45, 1.45).mat(dim(MT, far))
    const spokes = []
    for (let k = 0; k < 6; k++) {
      // Negative angle rolls the top spoke FORWARD (+q.f) and ground spoke BACKWARD (-q.f) as the wagon advances!
      const a = -(q.wheelAngle ?? 0) + (k / 6) * Math.PI * 2
      const tip = add3(hub, add3(mul3(q.f, Math.cos(a) * (wr - 0.85)), mul3(wheelUp, Math.sin(a) * (wr - 0.85))))
      spokes.push(sdf.capsule(hub, tip, 0.54, 0.50))
    }
    return [rim, hubCap, sdf.union(spokes).mat(dim(C2.slice(1, 4), far))]
  }
  q.frontLegs.forEach((L, i) => { parts[`mount_fleg${i}`] = buildWheel(L, i, i === q.farSide) })
  q.hindLegs.forEach((L, i) => { parts[`mount_hleg${i}`] = buildWheel(L, i, i === q.farSide) })

  // 3. Tall vaulted arched canvas wagon canopy (starts cleanly behind driver bench/hat at fFront = 5.2; collapses/tears in `dead`!)
  if (hasCanopy) {
    const fBack = -S.halfLen + 0.4, fFront = 5.2, spanHalf = (fFront - fBack) * 0.5, fMid = (fBack + fFront) * 0.5
    if (q.dead) {
      // Destroyed wagon: broken canopy hoops & crumpled sagging linen canvas draped unevenly across the crashed bed!
      const slump1 = bodyRot(sdf.ellipsoid([S.barrelW * 0.92, spanHalf * 0.72, 4.6])).at(atBodyRel(q.origin, fMid - 2.2, 0.8, 6.2))
      const slump2 = bodyRot(sdf.ellipsoid([S.barrelW * 0.78, spanHalf * 0.52, 3.4])).at(atBodyRel(q.origin, fMid + 3.2, -1.2, 5.0))
      const brokenHoop = sdf.capsule(atBodyRel(q.origin, -11.0, -S.barrelW + 1.0, 5.0), atBodyRel(q.origin, -8.5, 4.0, 12.2), 0.75, 0.65).mat(TR)
      const tornCanvas = sdf.union(slump1, slump2, { smooth: 1.4 }).paint((p) => {
        const df = dot3(sub3(p, q.origin), q.bodyFwd)
        return Math.sin(df * 0.8 + p[2] * 0.5) < -0.35 ? BL.slice(0, 2) : BL.slice(0, 3)
      })
      parts.mount_caparison = [tornCanvas, brokenHoop]
    } else {
      const springU = 11.4 - 1.8 * (q.downed ? 1 : (q.collapsed ?? 0)), archR = S.barrelW + 0.25
      const cStart = atBodyRel(q.origin, fBack, 0, springU)
      const cEnd = atBodyRel(q.origin, fFront, 0, springU)
      const outerSkirt = bodyRot(sdf.box([archR, spanHalf, 3.2], 0.25)).at(atBodyRel(q.origin, fMid, 0, springU - 3.2))
      const outerArch = sdf.union(
        sdf.capsule(cStart, cEnd, archR, archR).intersect(sdf.plane(mul3(q.bodyUp, -1), -(dot3(q.origin, q.bodyUp) + springU - 0.4))),
        outerSkirt,
        { smooth: 0.25 },
      )
        .intersect(sdf.plane(mul3(q.bodyUp, -1), -(dot3(q.origin, q.bodyUp) + 5.1)))
        .intersect(sdf.plane(q.bodyFwd, dot3(q.origin, q.bodyFwd) + fFront))
        .intersect(sdf.plane(mul3(q.bodyFwd, -1), -(dot3(q.origin, q.bodyFwd) + fBack)))
      const innerHollow = sdf.union(
        sdf.capsule(atBodyRel(q.origin, fBack - 2.5, 0, springU), atBodyRel(q.origin, fFront + 2.5, 0, springU), archR - 1.35, archR - 1.35),
        bodyRot(sdf.box([archR - 1.35, spanHalf + 2.5, 3.6], 0.2)).at(atBodyRel(q.origin, fMid, 0, springU - 3.4)),
      ).intersect(sdf.plane(mul3(q.bodyUp, -1), -(dot3(q.origin, q.bodyUp) + 4.9)))
      const darkInterior = bodyRot(sdf.box([S.barrelW - 1.7, spanHalf - 1.2, 8.2], 0.4)).at(atBodyRel(q.origin, fMid, 0, springU + 0.8)).mat(C2[0])
      const canopyShell = outerArch.subtract(innerHollow).paint((p) => {
        const df = dot3(sub3(p, q.origin), q.bodyFwd)
        // 4 crisp curved wooden canopy hoops (front & back entrance arches + 2 mid ribs) & vertical linen shading
        for (const hx of [fBack + 0.55, -9.2, -2.0, fFront - 0.55]) if (Math.abs(df - hx) < 0.62) return TR
        const fold = Math.sin(df * 0.65)
        return fold < -0.45 ? BL.slice(0, 3) : BL
      })
      parts.mount_caparison = [darkInterior, canopyShell]
    }
  } else {
    // Open flatbed supply wagon loaded with full-sized wooden supply crates, burlap sack & iron-banded barrels!
    // In `dead`, cargo tumbles askew across the crashed bed & one barrel topples sideways!
    const crate1 = bodyRot(sdf.box([4.5, 4.8, 4.2], 0.3)).at(atBodyRel(q.origin, q.dead ? -7.4 : -9.2, -3.0, q.dead ? 2.8 : 3.5)).paint(plankPaint)
    const crate2 = bodyRot(sdf.box([3.9, 4.2, 3.4], 0.3)).at(atBodyRel(q.origin, -8.4, 3.6, 3.0)).paint(plankPaint)
    const sack = bodyRot(sdf.ellipsoid([3.4, 3.2, 2.5])).at(atBodyRel(q.origin, q.dead ? -4.8 : -8.8, q.dead ? -0.8 : -2.2, q.dead ? 5.2 : 8.8)).mat(BL)
    const barrel1 = q.dead
      ? sdf.capsule(atBodyRel(q.origin, -2.2, -5.2, 2.2), atBodyRel(q.origin, 3.6, -1.6, 4.2), 3.1, 3.1).paint((p) => {
          const df = dot3(sub3(p, q.origin), q.bodyFwd)
          return Math.abs(df + 0.6) < 0.48 || Math.abs(df - 2.0) < 0.48 ? MT.slice(0, 2) : SD
        })
      : sdf.capsule(atBodyRel(q.origin, -0.6, -3.2, 0.8), atBodyRel(q.origin, -0.6, -3.2, 8.0), 3.3, 3.3).paint((p) => {
          const dz = dot3(sub3(p, q.origin), q.bodyUp)
          return Math.abs(dz - 2.4) < 0.45 || Math.abs(dz - 6.2) < 0.45 ? MT.slice(0, 2) : SD
        })
    const barrel2 = sdf.capsule(atBodyRel(q.origin, 1.0, 3.4, 0.8), atBodyRel(q.origin, 1.0, 3.4, 7.2), 3.0, 3.0).paint((p) => {
      const dz = dot3(sub3(p, q.origin), q.bodyUp)
      return Math.abs(dz - 2.2) < 0.42 || Math.abs(dz - 5.6) < 0.42 ? MT.slice(0, 2) : SD.slice(0, 3)
    })
    parts.mount_blanket = [crate1, crate2, sack, barrel1, barrel2]
  }

  // 4. Draft animal hitched between twin wooden shafts + leather draft collar & long driving reins back to driver bench!
  const dq = q.draughtQ, dm = spec.draughtSpec
  let draughtProxy = null
  if (dq && dm) {
    const DS = dq.S
    const dKeys = { ...MKEYS, coat: MKEYS.dcoat, coat2: MKEYS.dcoat2 }
    const { parts: dParts, fullProxy: dFull } = buildMountParts(dq, dm, dm.coatPreset, dKeys)
    for (const [k, v] of Object.entries(dParts)) parts[k.replace(/^mount_/, "draught_")] = v
    draughtProxy = dFull

    if (spec.bridle !== false) {
      const shaftLat = Math.min(S.barrelW - 1.2, DS.barrelW + 1.05)
      const hitchParts = []
      const shEnds = [-1, 1].map((sd) => add3(dq.chest, add3(mul3(dq.bodyFwd, -0.2), add3(mul3(dq.r, sd * (DS.barrelW + 0.85)), mul3(dq.bodyUp, -0.4)))))
      const shRoots = [-1, 1].map((sd) => atBodyRel(q.origin, S.halfLen - 1.0, sd * shaftLat, -2.6))
      const yokeA = lerp3(shRoots[0], shEnds[0], 0.28), yokeB = lerp3(shRoots[1], shEnds[1], 0.28)
      hitchParts.push(
        sdf.capsule(shRoots[0], shEnds[0], 0.72, 0.64).mat(C2.slice(1, 4)),
        sdf.capsule(shRoots[1], shEnds[1], 0.72, 0.64).mat(C2.slice(1, 4)),
        sdf.capsule(yokeA, yokeB, 0.66, 0.66).mat(C2.slice(1, 4)),
      )
      // Leather draft breast-collar & dorsal harness pad anchoring the wooden shafts to the animal's shoulders
      const breastMid = add3(dq.chest, add3(mul3(dq.bodyFwd, DS.chestR[1] * 0.88 + 0.55), mul3(dq.bodyUp, -0.45)))
      const collarTop = add3(dq.withers, mul3(dq.bodyUp, DS.withersR[2] * 0.72 + 0.45))
      const harnessSegs = [
        sdf.capsule(shEnds[0], breastMid, 0.70, 0.76),
        sdf.capsule(shEnds[1], breastMid, 0.70, 0.76),
        sdf.capsule(shEnds[0], collarTop, 0.58, 0.58),
        sdf.capsule(shEnds[1], collarTop, 0.58, 0.58),
      ]
      // Continuous solid-pixel leather driving reins (0.60 px radius) routed strictly OUTSIDE the animal's flank
      // (bit -> outer shoulder guide -> outer croup guide -> open-air curve straight into driver's hands or dash rail!)
      // so reins NEVER loop awkwardly over a bull's hump and NEVER clip through the animal's back or croup!
      const reinHoldL = q.hasDriver ? atBodyRel(q.saddle, 3.6, -2.0, 4.4) : atBodyRel(q.origin, S.halfLen - 0.5, -2.8, 4.2)
      const reinHoldR = q.hasDriver ? atBodyRel(q.saddle, 3.6, 2.0, 4.4) : atBodyRel(q.origin, S.halfLen - 0.5, 2.8, 4.2)
      const muzLen = len3(sub3(dq.muzzle, dq.poll)) || 1
      const flankClear = Math.max(DS.barrelW, DS.chestR[0], DS.croupR[0]) + 0.95
      const sideH = Math.min(dq.chest[2] + 2.8, dq.withers[2] - 0.4)
      const reinSegs = [-1, 1].flatMap((sd, idx) => {
        const bit = add3(dq.poll, add3(mul3(dq.headFwd, muzLen * 0.74), add3(mul3(dq.headR, sd * (DS.muzzleR[1] * 1.02)), mul3(dq.headUp, -0.35))))
        const rearAnchor = idx === 0 ? reinHoldL : reinHoldR
        const shGuide = [dq.chest[0] + dq.r[0] * sd * flankClear, dq.chest[1] + dq.r[1] * sd * flankClear, sideH]
        const hipGuide = [dq.croup[0] + dq.r[0] * sd * flankClear, dq.croup[1] + dq.r[1] * sd * flankClear, sideH * 0.55 + rearAnchor[2] * 0.45]
        const gapMid = lerp3(hipGuide, rearAnchor, 0.52)
        gapMid[2] -= 0.75
        return [
          sdf.capsule(bit, shGuide, 0.58, 0.60),
          sdf.capsule(shGuide, hipGuide, 0.60, 0.60),
          sdf.capsule(hipGuide, gapMid, 0.60, 0.60),
          sdf.capsule(gapMid, rearAnchor, 0.60, 0.60),
        ]
      })
      if (!q.hasDriver) reinSegs.push(sdf.capsule(reinHoldL, reinHoldR, 0.58, 0.58))
      parts.mount_bridle = [
        ...hitchParts,
        sdf.union(...harnessSegs, { smooth: 0.2 }).mat(SD.slice(0, 3)),
        sdf.union(...reinSegs, { smooth: 0.2 }).mat(SD.slice(0, 2)),
      ]
    }
  } else if (spec.bridle !== false) {
    // Unhitched parked wagon (`draught: "none"`): twin wooden hitch shafts extending forward with whippletree crossbar
    const shafts = [-1, 1].map((sd) => sdf.capsule(
      atBodyRel(q.origin, S.halfLen - 0.8, sd * 4.4, -2.6),
      atBodyRel(q.origin, S.halfLen + 9.2, sd * 4.0, -1.6),
      0.68, 0.62,
    ))
    const yoke = sdf.capsule(
      atBodyRel(q.origin, S.halfLen + 4.2, -4.5, -2.2),
      atBodyRel(q.origin, S.halfLen + 4.2, 4.5, -2.2),
      0.64, 0.64,
    )
    parts.mount_bridle = sdf.union(...shafts, yoke, { smooth: 0.14 }).mat(C2.slice(1, 4))
  }

  const barrelProxy = sdf.union(bedSolid, bench, benchBack, ...(parts.mount_caparison ?? []))
  const fullProxy = sdf.union(barrelProxy, ...(parts.mount_bridle ? [parts.mount_bridle] : []), ...(draughtProxy ? [draughtProxy] : []))
  return { parts, barrelProxy, fullProxy }
}

// ---------------------------------------------------------------- convert named parts dict to one Sdf field
const partsToField = (spec, groundClip = true) => {
  const all = []
  for (const [name, v] of Object.entries(spec)) {
    const list = (Array.isArray(v) ? v : [v]).filter((q) => q && typeof q === "object" && !("decal" in q) && !("scatter" in q)).map((q) => {
      if (q.dist && typeof q.dist === "function") return q
      const P = q.paint
      if (typeof P === "string") return q.field.mat(P)
      if (typeof P !== "function") return q.field
      return q.field.paint((p, n) => { const [h, a, out] = q.at(p); return P(h, a, dot3(n, out) >= 0) })
    })
    if (list.length) all.push(sdf.union(list).part(name))
  }
  const u = sdf.union(all)
  return groundClip ? u.intersect(sdf.plane([0, 0, -1], 0.2)) : u
}

// ---------------------------------------------------------------- bipedal rider skeleton on a mount saddle
// Builds a kit-compatible Joints object positioned directly at `saddlePos` so kit.worn(), kit.fightDraw(),
// and kit.baseDraw() work verbatim on horseback with zero duplicated garment/weapon code!
const SWEEP_A = Array.from({ length: 24 }, (_, k) => (k / 24) * 2 * Math.PI - Math.PI)
const mountedRiderJoints = (Bspec, p, heading, saddlePos, screenFn) => {
  const B = Bspec.body ? { ...Bspec.body, r: K.rOf(Bspec) } : { ...Bspec, r: { ...K.rOf({ body: Bspec }), ...(Bspec.r ?? {}) } }
  const turn = p.turn ?? 0, twist = p.twist ?? 0, hdeg = p.head ?? 0
  const { f, r } = frameAt(heading + turn), sh = frameAt(heading + turn + twist), hd = { ...frameAt(heading + turn + twist + hdeg), heading: heading + turn + twist + hdeg }
  const lean = (p.lean ?? 0) * RAD, tilt = (p.tilt ?? 0) * RAD, down = p.down ?? 0, rise = p.rise ?? 0
  const local = (o, fr, a, b, c) => [o[0] + fr.f[0] * a + fr.r[0] * b, o[1] + fr.f[1] * a + fr.r[1] * b, o[2] + c]
  const spine = unit3(add3(add3(mul3(UP, Math.cos(lean)), mul3(sh.f, Math.sin(lean))), mul3(sh.r, Math.sin(tilt))))
  // Pelvis sits at saddlePos (minus any subtle rider bounce `down`), everything built directly in world space!
  const pelvis = [saddlePos[0], saddlePos[1], saddlePos[2] - down]
  const chest = add3(pelvis, mul3(spine, B.torso + rise))
  const head = add3(chest, mul3(spine, B.neck))
  // Base ground-relative z for rider legs (so `L.ankle[2] - B.ankle` works cleanly inside kit.foot!)
  const baseZ = pelvis[2] - (B.hip - down)
  const feet = p.feet ?? [[0, -B.hips], [0, B.hips]], lift = p.lift ?? [0, 0], toes = p.toes ?? [0, 0]
  const k = B.r.foot[1] / 2.3, back = B.r.foot[1] - 1.1 * k, ahead = 1.1 * k + B.r.foot[1], bd = (1.1 * k + ahead) / 2
  const legs = [0, 1].map((i) => {
    const hip = local(pelvis, { f, r }, 0, i ? B.hips : -B.hips, 0)
    const fh = heading + turn + (i ? toes[1] : -toes[0]), ff = frameAt(fh).f
    const ankle = local([pelvis[0], pelvis[1], baseZ + B.ankle + lift[i]], { f, r }, feet[i][0], feet[i][1], 0)
    const hint = add3(ff, [0, 0, 0.25])
    const knee = ik3(hip, ankle, B.thigh, B.shin, hint)
    const sole = (d) => [ankle[0] + ff[0] * d, ankle[1] + ff[1] * d, ankle[2] - B.ankle]
    return { hip, ankle, knee, foot: add3(ankle, mul3(ff, 1.1 * k)), heel: sole(-back), ball: sole(bd), toe: sole(ahead), heading: fh }
  })
  const eh = p.elbow ?? [-0.4, 0.5, -1], g = p.grip
  const grip = g && [local([pelvis[0], pelvis[1], baseZ], sh, ...g.from), local([pelvis[0], pelvis[1], baseZ], sh, ...g.to)]
  const reach = B.upper + B.fore, hands = p.hands ?? [[0, -B.r.arm[0], -reach], [0, B.r.arm[0], -reach]]
  const arms = [0, 1].map((i) => {
    const s = local(chest, sh, B.shoulders[0], i ? B.shoulders[1] : -B.shoulders[1], B.shoulders[2])
    const hand = grip ? add3(grip[0], mul3(sub3(grip[1], grip[0]), g.at[i])) : local(s, sh, hands[i][0], hands[i][1], hands[i][2])
    return { sh: s, hand, elbow: ik3(s, hand, B.upper, B.fore, local([0, 0, 0], sh, eh[0], i ? eh[1] : -eh[1], eh[2])) }
  })
  const round = (q) => Math.atan2(dot3(q, r), dot3(q, f))
  return {
    heading, f, r, up: UP, spine, pelvis, chest, head, sh, hd, legs, arms, ...(grip ? { grip } : {}),
    screen: screenFn, depth: nearness,
    limb: (a, b, r0, r1 = r0, paint) => {
      const d = sub3(b, a), dd = dot3(d, d) || 1e-12
      return { field: sdf.capsule(a, b, r0, r1), paint, at: (q) => { const t = clamp(dot3(sub3(q, a), d) / dd, 0, 1); const out = sub3(q, add3(a, mul3(d, t))); return [t, round(out), out] } }
    },
    ball: (c, rr, paint) => {
      const R = typeof rr === "number" ? [rr, rr, rr] : rr
      return { field: sdf.ellipsoid(R).rotate(-(heading + turn), "z").at(c), paint, at: (q) => { const o = sub3(q, c); return [clamp((o[2] + R[2]) / (2 * R[2]), 0, 1), round(o), o] } }
    },
    sweep: (base, z0, z1, radius, so = {}) => {
      const { keep, shift, shell = 0, paint } = so
      const H = z1 - z0, invH = 1 / H, fx = f[0], fy = f[1], rx = r[0], ry = r[1], bx = base[0], by = base[1]
      let R = 0, x0 = 0, x1 = 0, y0 = 0, y1 = 0
      for (let i = 0; i <= 8; i++) {
        const h = i * 0.125, s = shift?.(h)
        if (s) { if (s[0] < x0) x0 = s[0]; if (s[0] > x1) x1 = s[0]; if (s[1] < y0) y0 = s[1]; if (s[1] > y1) y1 = s[1] }
        for (let k = 0; k < 24; k++) { const r2 = radius(h, SWEEP_A[k]); if (r2 > R) R = r2 }
      }
      const pad = R * 1.25 + shell + 0.5
      // Divide distance by 1.5 (matching rig3d.ts sweep Lipschitz bound) for artifact-free sphere tracing
      const dist = (x, y, z) => {
        let h = (z - z0) * invH
        if (h < 0) h = 0; else if (h > 1) h = 1
        const s = shift ? shift(h) : undefined, vx = x - bx - (s ? s[0] : 0), vy = y - by - (s ? s[1] : 0)
        const a = Math.atan2(vx * rx + vy * ry, vx * fx + vy * fy), rr = Math.hypot(vx, vy), Rr = radius(h, a)
        const side = shell ? Math.abs(rr - Rr) - shell : rr - Rr, cap = z0 - z > z - z1 ? z0 - z : z - z1
        const ms = side > 0 ? side : 0, mc = cap > 0 ? cap : 0
        const v = (side > cap ? (side < 0 ? side : 0) : (cap < 0 ? cap : 0)) + (ms === 0 ? mc : mc === 0 ? ms : Math.hypot(ms, mc))
        return (keep && !keep(h, a) ? (v > 0.3 ? v : 0.3) : v) / 1.5
      }
      const field = sdf.field(dist, [bx + x0 - pad, by + y0 - pad, z0 - 0.5], [bx + x1 + pad, by + y1 + pad, z1 + 0.5])
      return { field, paint, at: (q) => { const h = clamp((q[2] - z0) * invH, 0, 1), s = shift?.(h) ?? [0, 0], o = [q[0] - bx - s[0], q[1] - by - s[1], 0]; return [h, round(o), o] } }
    },
    decal: () => ({ decal: {} }),
    scatter: () => ({ scatter: {} }),
  }
}

// ---------------------------------------------------------------- mounted rider pose adapter
// Transforms any rider move (stand, idle, walk, charge, slash, thrust, shoot, cast, hurt) into a
// natural seated/straddling posture fitted cleanly to the mount's barrel width and rider body size.
const MOUNT_TO_RIDER_MOVE = {
  mount_stand: "stand", mount_idle: "idle", mount_paw: "paw", mount_shake: "shake", mount_swish: "swish",
  mount_graze: "graze", mount_drink: "drink", mount_howl: "howl", mount_sniff: "sniff", mount_eat: "eat",
  mount_rattle: "rattle", mount_scan: "scan", mount_vent: "vent",
  mount_walk: "walk", mount_charge: "charge", mount_rear: "rear", mount_rear_strike: "rear_strike",
  mount_bite: "bite", mount_gore: "gore", mount_fall: "fall",
  mount_slash: "slash", mount_thrust: "thrust", mount_shoot: "shoot", mount_cast: "cast", mount_hurt: "hurt",
}
const RIDER_TO_MOUNT_MOVE = {
  stand: "stand", idle: "idle", paw: "paw", shake: "shake", swish: "swish",
  graze: "graze", drink: "drink", howl: "howl", sniff: "sniff", eat: "eat",
  rattle: "rattle", scan: "scan", vent: "vent",
  walk: "walk", charge: "charge",
  slash: "stand", thrust: "stand", shoot: "stand", cast: "stand", hurt: "hurt",
  rear: "rear", rear_strike: "rear", bite: "bite", gore: "gore", fall: "fall",
}
const RIDER_MOVES = ["stand", "idle", "paw", "shake", "swish", "graze", "drink", "howl", "sniff", "eat", "rattle", "scan", "vent", "walk", "charge", "rear", "rear_strike", "bite", "gore", "fall", "slash", "thrust", "shoot", "cast", "hurt"]
// Species-tailored ambient move presets (no food/drink on undead bone_steed, mechanical clockwork_strider, or wheeled cart!)
const ambientMovesFor = (S) => {
  const arch = S?.archetype
  if (arch === "wolf") return ["idle", "howl", "sniff", "shake", "eat", "drink"]
  if (arch === "skeleton") return ["idle", "paw", "rattle", "swish"]
  if (arch === "clockwork") return ["idle", "scan", "vent"]
  if (arch === "vehicle") return ["stand", "idle"]
  return ["idle", "paw", "shake", "swish", "graze", "drink"]
}
// Species signature beast attacks (direwolf bite, war bull horn gore) automatically included in "combat" & "all"!
const beastAttacksFor = (S) => {
  const arch = S?.archetype
  if (arch === "wolf") return ["bite"]
  if (arch === "bull") return ["gore"]
  return []
}
const resolveMovesSpec = (movesSpec, S, mode = "mount", who = "mounts") => {
  if (!movesSpec) return ["stand"]
  if (Array.isArray(movesSpec)) return movesSpec
  if (movesSpec === "basic") return ["idle", "walk"]
  if (movesSpec === "ambient") return ambientMovesFor(S)
  // Wheeled wagons/carts are non-combat convoy vehicles (no charge, rear, or combat attacks!)
  if (S?.archetype === "vehicle") {
    if (movesSpec === "combat" || movesSpec === "all") {
      return mode === "mount" ? ["stand", "idle", "walk", "hurt", "fall", "downed", "dead"] : ["stand", "idle", "walk", "hurt"]
    }
    throw new Error(`${who}: moves must be "basic", "ambient", "combat", "all" or a move list, got ${JSON.stringify(movesSpec)}`)
  }
  const beast = beastAttacksFor(S)
  if (movesSpec === "combat") return mode === "mount" ? ["idle", "walk", "charge", ...beast, "hurt", "fall", "downed", "dead"] : ["idle", "walk", "charge", ...beast, "hurt"]
  if (movesSpec === "all") {
    const amb = ambientMovesFor(S).filter((m) => m !== "stand")
    return mode === "mount"
      ? ["stand", ...amb, "walk", "charge", "rear", ...beast, "hurt", "fall", "downed", "dead"]
      : ["stand", ...amb, "walk", "charge", "rear", ...beast, "hurt"]
  }
  throw new Error(`${who}: moves must be "basic", "ambient", "combat", "all" or a move list, got ${JSON.stringify(movesSpec)}`)
}

// Build a seated/straddling pose on horseback (or legs-forward bench seat for wheeled vehicles!)
const seatedLegsFor = (B, S) => {
  const b = B.body, legTotal = b.thigh + b.shin, r = S.rider
  if (S.archetype === "vehicle" || S.archetype === "clockwork") {
    const out = Math.max(b.hips + 0.35, Math.min(r.stirrupOut, b.hips + 1.2))
    const fwd = r.stirrupFwd * Math.min(1.15, legTotal / (TB.thigh + TB.shin))
    const maxDrop = Math.sqrt(Math.max(1.5, (legTotal * 0.92) ** 2 - (out - b.hips) ** 2 - fwd * fwd))
    const drop = Math.min(r.stirrupDrop * (0.55 + 0.45 * (legTotal / (TB.thigh + TB.shin))), maxDrop)
    const lift = Math.max(0.5, b.hip - b.ankle - drop)
    return { feet: [[fwd, -out], [fwd, out]], lift: [lift, lift], toes: [r.kneeOut, r.kneeOut] }
  }
  // Stirrup clearance just outside the mount barrel, clamped comfortably inside rider's leg reach!
  const out = Math.max(b.hips + 1.2, Math.min(S.barrelW + r.stirrupOut, b.hips + legTotal * 0.62))
  const fwd = r.stirrupFwd * Math.min(1.25, legTotal / (TB.thigh + TB.shin))
  const maxDrop = Math.sqrt(Math.max(1.5, (legTotal * 0.92) ** 2 - (out - b.hips) ** 2 - fwd * fwd))
  const drop = Math.min(r.stirrupDrop * (0.55 + 0.45 * (legTotal / (TB.thigh + TB.shin))), maxDrop)
  const lift = Math.max(0.5, b.hip - b.ankle - drop)
  return { feet: [[fwd, -out], [fwd, out]], lift: [lift, lift], toes: [r.kneeOut, r.kneeOut] }
}

const buildMountedMove = (moveName, B, W, S, staffMode, headV) => {
  const m = MOUNT_TO_RIDER_MOVE[moveName] ?? moveName
  const mountMoveKey = RIDER_TO_MOUNT_MOVE[m] ?? "stand"
  const MM = MOUNT_MOVES[mountMoveKey]
  const legs = seatedLegsFor(B, S)
  const mountedMeta = { barrelW: S.barrelW, species: S.key }
  const b = B.body, A = (b.upper + b.fore) / (TB.upper + TB.fore)
  const reinsHand = [4.0 * A, 0.8 * A, -3.6 * A] // off-hand holding reins forward toward the withers!
  const hasOff = !!W.off, hasMain = !!W.held
  const mainKind = K.kindOf(W.held)

  // Combat moves: reuse kit's full collision-solved fighting choreography for upper body & weapons,
  // while keeping the lower body firmly seated in the stirrups!
  if (["slash", "thrust", "shoot", "cast", "hurt"].includes(m)) {
    const why = K.fightWhy(m, W)
    if (why) throw new Error(`mounts: rider move '${moveName}': ${why}`)
    const model = K.modelOf(W, B, headV)
    const F = K.lagMove(K.fitMove(K.fightMove(m, W, staffMode === "two", true), B, model), m, B)
    const frames = m === "hurt" ? 2 : F.frames
    const ms = m === "hurt" ? MM.ms : F.ms
    return {
      frames, ms, mountMove: mountMoveKey, loop: false, fight: true, FM: F,
      pose: (i, h) => {
        const q = F.pose(i, h)
        const hands = q.hands.map((v) => v.slice())
        if (!hasOff && !q.grip && m !== "shoot") hands[0] = reinsHand
        // Keep rider hips/legs squarely aligned with the horse barrel (`turn = 0`) while folding
        // any stance turn into the upper-body waist twist so legs never rotate into the horse's neck!
        const turn0 = q.turn ?? 0
        return {
          ...q, ...legs, turn: 0, twist: (q.twist ?? 0) + turn0, down: 0, mounted: mountedMeta,
          trail: Math.max(q.trail ?? 0.5, 1.3),
          hands,
        }
      },
    }
  }

  // Locomotion & idle moves (stand, idle, walk, charge, rear) synced frame-for-frame with the mount!
  const grip = K.gripMove(K.STAND.stand, W)
  const fittedStand = K.fitMove(grip, B)
  const poseAt = (i, h) => {
    const mp = MM.pose(i, h, S)
    const base = fittedStand.pose(0, h)
    const hands = base.hands.map((v) => v.slice())
    if (S.archetype === "vehicle") {
      // Wagon driver holds twin driving reins forward toward the draft team!
      if (!hasOff && !base.grip) hands[0] = [4.0 * A, -1.4 * A, -3.2 * A]
      if (!hasMain && !base.grip) hands[1] = [4.0 * A, 1.4 * A, -3.2 * A]
    } else if (!hasOff && !base.grip) {
      hands[0] = reinsHand
    }
    let hold
    let lean = 3
    let trail = 1.25
    let sway = (mp.tailSway ?? 0) * 0.15

    // Default mounted holds so upright/resting weapons (spear, magestaff, axe) stay cleanly proportioned in the saddle
    const restHold = () => {
      const hObj = {}
      if (hasOff && K.kindOf(W.off) === "shield") hObj[0] = { face: [0.85, 0.42, 0.08] }
      if (mainKind === "spear") { hands[1] = [1.8 * A, 2.8 * A, -4.4 * A]; hObj[1] = { aim: [0.28, 0.1, 0.95], at: 0.36 } }
      else if (mainKind === "magestaff") { hands[1] = [2.0 * A, 2.5 * A, -4.2 * A]; hObj[1] = { aim: [0.18, 0.12, 0.97] } }
      else if (mainKind === "axe") { hands[1] = [1.6 * A, 3.0 * A, -3.6 * A]; hObj[1] = { aim: [0.22, 0.25, 0.94] } }
      return Object.keys(hObj).length ? hObj : undefined
    }

    if (["idle", "paw", "shake", "swish", "graze", "drink", "howl", "sniff", "eat", "rattle", "scan", "vent"].includes(m)) {
      lean = 2 + (mp.pitch ?? 0) * 0.35
      trail = 1.3
      hold = restHold()
    } else if (m === "walk") {
      lean = 7 + (mp.pitch ?? 0) * 0.45
      trail = 2.0
      hold = restHold()
    } else if (m === "charge") {
      lean = 19 + (mp.pitch ?? 0) * 0.35
      trail = 4.6
      // Cavalry charge weapon posture: couched lance/spear tucked low beside neck, sword/axe raised for sweep, shield braced forward!
      if (mainKind === "spear") {
        hands[1] = [2.4 * A, 3.0 * A, -4.8 * A]
        hold = { ...(hasOff && K.kindOf(W.off) === "shield" ? { 0: { face: [0.92, 0.28, 0.08] } } : {}), 1: { aim: [1, -0.05, 0.01], at: 0.32 } }
        if (hasOff && K.kindOf(W.off) === "shield") hands[0] = [3.6 * A, -2.0 * A, -3.2 * A]
      } else if (mainKind === "blade" || mainKind === "mace" || mainKind === "axe") {
        hands[1] = [-1.4 * A, 3.8 * A, 1.8 * A]
        hold = { ...(hasOff && K.kindOf(W.off) === "shield" ? { 0: { face: [0.92, 0.28, 0.08] } } : {}), 1: { aim: [-0.25, 0.35, 0.9] } }
        if (hasOff && K.kindOf(W.off) === "shield") hands[0] = [3.6 * A, -2.0 * A, -3.0 * A]
      } else {
        hold = restHold()
        if (hasMain && !base.grip) hands[1] = [hands[1][0] + 1.4 * A, hands[1][1] + 0.6 * A, hands[1][2] + 1.0 * A]
      }
      if (!hasOff && !base.grip) hands[0] = [4.6 * A, 0.5 * A, -2.8 * A]
    } else if (m === "rear") {
      // Synced 6-frame rearing seat: rider leans forward into the rising neck to stay balanced upright in gravity,
      // hoists weapon/shield heroically at apex (frames 2-3), and drives forward cleanly on the descent (frame 4)!
      lean = [8, 14, 16, 18, 22, 6][i]
      trail = [1.8, 2.8, 3.2, 3.2, 3.8, 1.8][i]
      if (!hasOff && !base.grip) hands[0] = [4.0 * A, 0.6 * A, -2.4 * A]
      const shHold = hasOff && K.kindOf(W.off) === "shield" ? { 0: { face: [0.88, 0.36, 0.14] } } : {}
      if (hasOff && K.kindOf(W.off) === "shield") hands[0] = [3.2 * A, -2.2 * A, -2.2 * A]
      if (mainKind === "spear") {
        hands[1] = [[1.4, 3.0, -3.2], [0.2, 3.4, -0.4], [-0.4, 3.6, 1.4], [-0.6, 3.6, 1.2], [2.4, 2.8, -3.4], [1.8, 2.8, -4.2]][i].map((v) => v * A)
        const aims = [[0.35, 0.12, 0.93], [0.48, 0.10, 0.87], [0.58, 0.08, 0.81], [0.72, 0.05, 0.69], [0.85, 0.02, 0.18], [0.32, 0.10, 0.94]][i]
        hold = { ...shHold, 1: { aim: aims, at: 0.34 } }
      } else if (mainKind === "blade" || mainKind === "axe" || mainKind === "mace") {
        hands[1] = [[0.8, 3.2, -1.0], [-0.4, 3.6, 1.8], [-0.8, 3.6, 2.8], [-0.6, 3.6, 2.6], [2.0, 2.8, -1.6], [1.2, 3.0, -2.6]][i].map((v) => v * A)
        const aims = [[0.20, 0.22, 0.95], [0.05, 0.22, 0.97], [-0.15, 0.20, 0.97], [-0.05, 0.20, 0.98], [0.65, 0.10, 0.75], [0.25, 0.22, 0.94]][i]
        hold = { ...shHold, 1: { aim: aims } }
      } else {
        hold = restHold()
      }
    } else if (m === "rear_strike") {
      // Dramatic 6-frame rearing-plunge strike synced 1:1 with `mount_rear`:
      // frames 0-3 mount rises onto 2 hind legs while rider winds lance/blade high;
      // frame 4 mount plunges down as rider drives a full downward lance thrust / overhead cleave;
      // frame 5 landing follow-through!
      lean = [6, 10, 12, 16, 28, 14][i]
      const twist = mainKind === "spear" ? [12, 22, 30, 32, -12, -6][i] : [16, 28, 38, 42, -26, -12][i]
      trail = [2.0, 3.0, 3.4, 3.6, 5.2, 2.4][i]
      if (!hasOff && !base.grip) hands[0] = [4.2 * A, 0.5 * A, -2.2 * A]
      const shHold = hasOff && K.kindOf(W.off) === "shield" ? { 0: { face: [0.92, 0.28, 0.12] } } : {}
      if (hasOff && K.kindOf(W.off) === "shield") hands[0] = [3.4 * A, -2.2 * A, -2.0 * A]
      if (mainKind === "spear") {
        hands[1] = [[0.6, 3.2, -1.6], [-1.4, 3.6, 1.4], [-2.2, 3.8, 2.8], [-2.4, 3.6, 2.6], [5.8, 1.8, -3.2], [3.2, 2.4, -4.0]][i].map((v) => v * A)
        const aims = [[0.45, 0.10, 0.88], [0.65, 0.05, 0.76], [0.84, -0.04, 0.54], [0.92, -0.02, -0.36], [0.95, 0.06, -0.28], [0.92, 0.02, -0.14]][i]
        const ats = [0.36, 0.34, 0.30, 0.30, 0.16, 0.28][i]
        hold = { ...shHold, 1: { aim: aims, at: ats } }
      } else if (mainKind === "blade" || mainKind === "axe" || mainKind === "mace") {
        hands[1] = [[0.2, 3.4, 0.2], [-1.4, 3.6, 3.0], [-2.2, 3.4, 4.2], [-1.6, 3.4, 4.0], [5.2, 1.0, -3.6], [3.0, 2.0, -4.2]][i].map((v) => v * A)
        const aims = [[0.15, 0.22, 0.96], [-0.25, 0.18, 0.95], [-0.55, 0.15, 0.82], [-0.20, 0.15, 0.96], [0.88, -0.10, -0.44], [0.84, -0.06, -0.25]][i]
        hold = { ...shHold, 1: { aim: aims } }
        if (W.held?.hands === 2) hands[0] = [hands[1][0] - 0.6 * A, hands[1][1] - 1.6 * A, hands[1][2] - 1.4 * A]
      } else {
        hands[1] = [[1.0, 3.0, -1.4], [-0.6, 3.2, 1.8], [-1.0, 3.2, 3.0], [-0.8, 3.2, 2.8], [4.6, 1.4, -2.6], [2.4, 2.2, -3.4]][i].map((v) => v * A)
        hold = { ...shHold, ...(hasMain ? { 1: { aim: [[0.2, 0.1, 0.97], [0.1, 0.1, 0.99], [-0.1, 0.1, 0.99], [0.2, 0.05, 0.97], [0.90, -0.08, -0.40], [0.65, 0.05, 0.45]][i] } } : {}) }
      }
      return {
        ...base, ...legs, down: 0, lean, twist, trail, sway, hands, mounted: mountedMeta,
        ...(hold ? { hold } : {}),
        lag: [i === 4 ? 4.2 : 1.4, sway * 0.4, -(mp.bob ?? 0) * 0.35],
      }
    } else if (m === "bite" || m === "gore") {
      // Rider braces tightly in the saddle and leans dynamically with the beast's biting lunge or upward horn gore!
      lean = m === "bite" ? [4, 2, 22, 24, 14, 4][i] : [6, 8, 22, 10, 6, 4][i]
      trail = [1.4, 1.8, 4.2, 4.4, 2.4, 1.4][i]
      if (!hasOff && !base.grip) hands[0] = [4.4 * A, 0.5 * A, -2.6 * A]
      hold = restHold()
    } else if (m === "fall") {
      // Rider braces forward as mount buckles & drops to the ground!
      lean = [8, 20, 14, 10, 6][i]
      trail = [1.6, 2.4, 2.0, 1.4, 1.0][i]
      if (!hasOff && !base.grip) hands[0] = [4.4 * A, 0.5 * A, -2.6 * A]
      hold = restHold()
    } else {
      // stand: crisp ready seat
      hold = restHold()
    }

    return {
      ...base, ...legs, down: 0, lean, trail, sway, hands, mounted: mountedMeta,
      ...(hold ? { hold } : {}),
      lag: [m === "charge" ? 3.2 : m === "walk" ? 1.6 : 0.01, sway * 0.4, -(mp.bob ?? 0) * 0.35],
    }
  }
  // Plunge-strike steel motion smear on frame 4 of `rear_strike` (right as mount & weapon slam downward!)
  const customDraw = m === "rear_strike" && hasMain ? (c, rj) => {
    if (c.frame !== 4 || !rj.rod) return
    const hPos = rj.arms?.[1]?.hand
    if (!hPos) return
    const ST = "ζηθλμ" // rider's weapon steel ramp (swapped cleanly with R.swap!)
    const sf = rj.f, sr = rj.r
    if (mainKind === "spear") {
      const a = add3(hPos, add3(mul3(sf, 8.0), [0, 0, -2.4]))
      const b = add3(hPos, add3(mul3(sf, 23.0), [0, 0, -6.8]))
      rj.rod(a, b, (t) => (t > 0.72 ? ST[4] : t > 0.38 ? ST[3] : ST[2]))
      rj.rod(add3(a, [0, 0, 1.0]), add3(b, [0, 0, 1.0]), (t) => (t > 0.55 ? ST[4] : "."))
    } else if (mainKind === "blade" || mainKind === "axe" || mainKind === "mace") {
      const p0 = add3(hPos, add3(mul3(sf, -1.5), add3(mul3(sr, 2.2), [0, 0, 11.5])))
      const p1 = add3(hPos, add3(mul3(sf, 9.5), add3(mul3(sr, 1.0), [0, 0, 5.0])))
      const p2 = add3(hPos, add3(mul3(sf, 13.5), add3(mul3(sr, -0.8), [0, 0, -4.5])))
      rj.rod(p0, p1, (t) => (t > 0.30 ? ST[2] : "."))
      rj.rod(p1, p2, (t) => (t > 0.65 ? ST[4] : t > 0.25 ? ST[3] : ST[2]))
    }
  } : null
  return { frames: MM.frames, ms: MM.ms, mountMove: mountMoveKey, loop: MM.loop, fight: m === "rear_strike", draw: customDraw, pose: poseAt }
}

// ---------------------------------------------------------------- color resolution & swaps
const resolveRamp = (val, table, fallback) => {
  if (Array.isArray(val)) return val
  if (typeof val === "string") return table[val] ?? kit.RAMPS[val] ?? kit.METALS[val] ?? fallback
  return fallback
}
const fillMountSpec = (spec = {}) => {
  const spName = spec.species ?? "horse"
  const S = SPECIES[spName]
  if (!S) throw new Error(`mounts: no species '${spName}' (${Object.keys(SPECIES).join(", ")})`)
  const merged = { ...S.defaults, ...spec, species: spName, colors: { ...S.defaults.colors, ...(spec.colors ?? {}) } }
  const coatName = merged.coat ?? merged.colors.coat ?? S.defaults.coat ?? "bay"
  const coatPreset = COATS[coatName]
  if (!coatPreset) throw new Error(`mounts: no coat '${coatName}' (${Object.keys(COATS).join(", ")})`)
  let draughtSpec = null
  if (S.archetype === "vehicle") {
    const rawD = merged.draught
    if (rawD !== false && rawD !== "none" && rawD !== null) {
      const dObj = typeof rawD === "string" ? { species: rawD } : (rawD && typeof rawD === "object" ? rawD : { species: "horse" })
      const dSp = dObj.species ?? "horse"
      if (dSp === "cart" || SPECIES[dSp]?.archetype === "vehicle") throw new Error(`mounts: cart draught cannot be another vehicle ('${dSp}')`)
      draughtSpec = fillMountSpec({ ...dObj, species: dSp, saddle: false, blanket: false, bags: false, barding: "none", caparison: "none", bridle: false })
    }
  }
  return { ...merged, S, coat: coatName, coatPreset, draughtSpec }
}
const mountSwapFor = (spec = {}, extraColors = {}) => {
  const m = fillMountSpec(spec), C = { ...m.colors, ...extraColors }, cp = m.coatPreset
  const swap = {}
  const apply = (keys, arr) => { if (!arr) return; for (let i = 0; i < keys.length; i++) swap[keys[i]] = arr[Math.min(i, arr.length - 1)] }
  const coatRamp = C.coat && COATS[C.coat] ? COATS[C.coat].coat : resolveRamp(C.coat, {}, cp.coat)
  const coat2Ramp = C.coat2 ? resolveRamp(C.coat2, {}, cp.coat2) : (C.coat && COATS[C.coat] ? COATS[C.coat].coat2 : cp.coat2)
  const dm = m.draughtSpec
  const dcp = dm?.coatPreset
  const dCoatRamp = C.draughtCoat && COATS[C.draughtCoat] ? COATS[C.draughtCoat].coat : (dcp ? resolveRamp(C.draughtCoat, {}, dcp.coat) : null)
  const dCoat2Ramp = C.draughtCoat && COATS[C.draughtCoat] ? COATS[C.draughtCoat].coat2 : (dcp ? dcp.coat2 : null)
  const maneSrc = dm ?? m
  const maneName = (dm ? dm.mane ?? dcp.mane : m.mane) ?? C.mane ?? (C.coat && COATS[C.coat] ? COATS[C.coat].mane : cp.mane)
  const maneRamp = resolveRamp(C.mane ?? maneName, MANES, MANES.black)
  const hoofRamp = resolveRamp(C.hooves ?? (dm ? dcp.hooves : cp.hooves), HOOVES, HOOVES.dark)
  const saddleRamp = resolveRamp(C.saddle, MOUNT_CLOTHS, kit.RAMPS.brown)
  const blanketRamp = resolveRamp(C.caparison ?? C.blanket, MOUNT_CLOTHS, kit.RAMPS.navy)
  const trimRamp = resolveRamp(C.trim, MOUNT_CLOTHS, kit.RAMPS.mustard)
  const bardSrc = dm && (dm.S.archetype === "bull" || dm.S.archetype === "clockwork") ? dm.colors.barding : C.barding
  const bardRamp = resolveRamp(extraColors.barding ?? bardSrc, MOUNT_METALS, MOUNT_METALS.steel)
  const metalRamp = resolveRamp(C.metal, MOUNT_METALS, MOUNT_METALS.steel)
  const eyeRamp = resolveRamp(extraColors.eye ?? (dm ? dm.colors.eye : C.eye), EYES_MOUNT, EYES_MOUNT.dark)

  apply(MKEYS.coat, coatRamp)
  apply(MKEYS.coat2, coat2Ramp)
  if (dCoatRamp) apply(MKEYS.dcoat, dCoatRamp)
  if (dCoat2Ramp) apply(MKEYS.dcoat2, dCoat2Ramp)
  apply(MKEYS.mane, maneRamp)
  apply(MKEYS.hooves, hoofRamp)
  apply(MKEYS.saddle, saddleRamp)
  apply(MKEYS.blanket, blanketRamp)
  apply(MKEYS.trim, trimRamp)
  apply(MKEYS.barding, bardRamp)
  apply(MKEYS.metal, metalRamp.length >= 4 ? metalRamp.slice(1, 4) : metalRamp)
  apply(MKEYS.eye, eyeRamp)
  return swap
}
const slotSwap = (spec = {}, extraColors = {}) => {
  const from = mountSwapFor(spec), to = mountSwapFor(spec, extraColors), out = {}
  for (const k of Object.keys(to)) if (from[k] && from[k] !== to[k]) out[from[k]] = to[k]
  return out
}

// ---------------------------------------------------------------- shared canvas drawing helpers
// Crisp dark ink separation around foreground mount parts (`mount_head` / `mount_barding` in front of
// neck/chest/rider, AND `mount_tail` in front of caparison/rump/legs in N/NW views!) — always drawn ON
// the background pixel behind the foreground part so the head & tail never lose a single pixel of width!
const outlineMountHead = (c, inkKey = INK, softRuff = false) => {
  const { w: W, h: H, data, depth: Z, parts } = c.img
  if (!Z || !parts) return
  const headIdx = parts.names.indexOf("mount_head")
  const bardIdx = parts.names.indexOf("mount_barding")
  const tailIdx = parts.names.indexOf("mount_tail")
  const dHeadIdx = parts.names.indexOf("draught_head")
  const dBardIdx = parts.names.indexOf("draught_barding")
  const dTailIdx = parts.names.indexOf("draught_tail")
  const neckIdx = softRuff ? parts.names.indexOf("mount_neck") : -1
  const maneIdx = softRuff ? parts.names.indexOf("mount_mane") : -1
  const bodyIdx = softRuff ? parts.names.indexOf("mount_body") : -1
  if (headIdx < 0 && tailIdx < 0 && dHeadIdx < 0 && dTailIdx < 0) return
  const isFace = (id) => id === headIdx || id === bardIdx || (dHeadIdx >= 0 && id === dHeadIdx) || (dBardIdx >= 0 && id === dBardIdx)
  const isTail = (id) => (tailIdx >= 0 && id === tailIdx) || (dTailIdx >= 0 && id === dTailIdx)
  const isRuff = (id) => softRuff && (id === neckIdx || id === maneIdx || id === bodyIdx)
  const ink = c.color(inkKey), toInk = []
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x, pid = parts.ids[i]
    if (pid < 0) continue
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ni = (y + dy) * W + (x + dx), npid = parts.ids[ni]
      if (!isFace(pid) && !isRuff(pid) && isFace(npid) && Z[ni] < Z[i] - (softRuff ? 3.5 : 1.8)) { toInk.push(i); break }
      if (!isTail(pid) && isTail(npid) && Z[ni] < Z[i] + 0.25) { toInk.push(i); break }
    }
  }
  for (const i of toInk) data[i] = ink
}

// Build mount joints (and synced hitched draft-animal joints for wheeled `cart` teams!)
const DRAUGHT_SYNC_MOVES = new Set(["walk", "idle", "hurt", "fall", "downed", "dead"])
const makeMountJoints = (m, mv, fi, nf, deg, aw, wheelAt, hasDriver = false) => {
  const S = m.S, M = MOUNT_MOVES[mv] ?? MOUNT_MOVES.stand
  const p = M.pose(fi % M.frames, deg, S)
  const cartShift = m.draughtSpec ? -16.0 : 0
  const q = quadJoints(S, p, deg, aw, wheelAt(mv, fi % M.frames, nf), cartShift)
  q.hasDriver = hasDriver
  if (m.draughtSpec) {
    const DS = m.draughtSpec.S
    const dmv = DRAUGHT_SYNC_MOVES.has(mv) ? mv : "stand"
    const DM = MOUNT_MOVES[dmv]
    const dp = DM.pose(fi % DM.frames, deg, DS)
    const draughtFwd = cartShift + S.halfLen + DS.halfLen + 16.5
    q.draughtQ = quadJoints(DS, dp, deg, aw, wheelAt(dmv, fi % DM.frames, DM.frames), draughtFwd)
    q.draughtP = dp
  }
  return { p, q }
}

// Outer silhouette ink ring (optionally respecting a pre-existing occluder depth buffer so clipped
// modular rider edges never draw ink on top of the horse's neck/head!)
const drawRing = (c, inkKey = INK, occlDepth = null) => {
  const { w: W, h: H, data, depth: Z } = c.img
  const on = (x, y) => x >= 0 && y >= 0 && x < W && y < H && (data[y * W + x] & 255) >= 128
  const out = []
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (on(x, y)) continue
    let bestZ = Infinity
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy
      if (!on(nx, ny)) continue
      const nz = Z ? Z[ny * W + nx] : 0
      if (nz < bestZ) bestZ = nz
    }
    if (bestZ === Infinity) continue
    // If an occluder sits IN FRONT of the rider at this ink pixel, do not draw rider ink over it!
    if (occlDepth && occlDepth[y * W + x] < bestZ - 0.15) continue
    out.push(x, y)
  }
  for (let i = 0; i < out.length; i += 2) c.px(out[i] - c.ox, out[i + 1] - c.oy, inkKey)
}

// 3D depth-aware rod helper (matches rig3d's j.rod for smears, arrow streaks, cast glow!)
const makeRod = (c, screenFn, headRef) => {
  const Z = c.img.depth, data = c.img.data, own = new Map()
  const zAt = (x, y, i) => {
    if (own.has(i)) return own.get(i)
    if (headRef?.at(x, y)) return headRef.z
    if (Z && Number.isFinite(Z[i])) return Z[i]
    if ((data[i] & 255) < 128 || !Z) return Infinity
    let m = Infinity
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const k = c.index(x + dx, y + dy); if (k >= 0 && Z[k] < m) m = Z[k] }
    return m
  }
  return (a, b, key) => {
    const [x0, y0] = screenFn(a), [x1, y1] = screenFn(b), n = Math.max(1, Math.ceil(2 * Math.hypot(x1 - x0, y1 - y0)))
    let last = -1
    for (let s = 0; s <= n; s++) {
      const t = s / n, q = [0, 1, 2].map((e) => a[e] + (b[e] - a[e]) * t), [x, y] = screenFn(q).map(Math.round), i = c.index(x, y)
      if (i < 0 || i === last) continue
      last = i
      const z = camDepth(q), k = typeof key === "function" ? key(t) : key
      if (z > zAt(x, y, i) || typeof k !== "string" || k === ".") continue
      c.px(x, y, k)
      own.set(i, z)
    }
  }
}

// Mount-level 3D impact effects (direwolf fang-snap crunch crescent on `bite` frame 3; twin upward horn-toss arcs on `gore` frame 3!)
const drawMountEffect = (c, q, p, screenFn) => {
  if (!p.biteImpact && !p.goreImpact) return
  const rod = makeRod(c, screenFn, null)
  if (p.biteImpact) {
    // Razor-sharp vertical twin-jaw CHOMP flash right in front of the wolf's snapping muzzle!
    const snap = add3(q.muzzle, add3(mul3(q.f, 3.6), [0, 0, -0.6]))
    const u0 = add3(snap, add3(mul3(q.f, -2.2), [0, 0, 5.2]))
    const u1 = add3(snap, add3(mul3(q.f, 1.0), [0, 0, 2.4]))
    const mid = add3(snap, add3(mul3(q.f, 1.8), [0, 0, 0]))
    const d1 = add3(snap, add3(mul3(q.f, 1.0), [0, 0, -2.4]))
    const d0 = add3(snap, add3(mul3(q.f, -2.2), [0, 0, -5.0]))
    rod(u0, u1, (t) => (t > 0.25 ? "ć" : "."))
    rod(u1, mid, "ą")
    rod(d0, d1, (t) => (t > 0.25 ? "ć" : "."))
    rod(d1, mid, "ą")
    // Crisp gleaming central impact spark where upper & lower fangs snap together
    rod(add3(mid, mul3(q.f, -1.6)), add3(mid, mul3(q.f, 2.2)), (t) => (t > 0.35 ? "ą" : "ć"))
  }
  if (p.goreImpact) {
    // Sweeping twin upward horn-toss motion arcs curving boldly OUT IN FRONT of the bull's head from low gore up to skyward horn tips!
    for (const sd of [-1, 1]) {
      const tip = add3(q.poll, add3(mul3(q.headR, sd * 6.9), add3(mul3(q.eyeFwd, 5.8), mul3(q.eyeUp, 7.0))))
      const hi = add3(tip, add3(mul3(q.f, 7.2), [0, 0, -2.2]))
      const mid = add3(tip, add3(mul3(q.f, 9.8), [0, 0, -8.5]))
      const low = add3(tip, add3(mul3(q.f, 6.4), [0, 0, -14.8]))
      rod(low, mid, (t) => (t > 0.22 ? "ć" : "."))
      rod(mid, hi, (t) => (t > 0.42 ? "ą" : "ć"))
      rod(hi, tip, "ą")
    }
  }
}

// Stamp rider's hand-painted 2D views() head with 3D `over` occlusion + optional occluder depth clipping!
const stampRiderHead = (c, headName, j, screenFn, overParts, occlDepth = null) => {
  const img = c.asset(headName, { heading: j.hd.heading })
  const [hx, hy] = screenFn(j.head).map(Math.round), [ax, ay] = img.pivot ?? [0, 0], x0 = hx - Math.floor(ax), y0 = hy - Math.floor(ay)
  const ids = c.img.parts?.ids.slice(), was = c.img.data.slice(), W = c.img.w
  const headZ = camDepth(j.head)
  c.stamp(headName, hx, hy, { heading: j.hd.heading })
  // Chin shadow line where head meets neck/body
  for (let x = 0; x < img.w; x++) {
    let r = img.h - 1
    while (r >= 0 && (img.data[r * img.w + x] & 255) < 128) r--
    if (r >= 0 && c.get(x0 + x, y0 + r + 1)) c.px(x0 + x, y0 + r + 1, "D")
  }
  // Clip head pixels behind an occluder (e.g. horse ears/barding passing in front of chin in S view!)
  if (occlDepth) {
    const data = c.img.data
    for (let i = 0; i < data.length; i++) if (data[i] !== was[i] && occlDepth[i] < headZ - 0.5) data[i] = was[i]
  }
  // Keep nearer 3D parts (`over`: weapons, wings, mount head/neck/barding/mane, plus per-pixel canopy/cargo occlusion!) cleanly over the stamped head
  if (ids && overParts?.length && c.img.parts && c.img.depth) {
    const { data } = c.img, Z = c.img.depth, names = c.img.parts.names, at = new Map(), kept = new Set()
    const perPixelOver = new Set(["mount_caparison", "mount_bags"])
    for (let i = 0; i < data.length; i++) {
      if (ids[i] >= 0 && data[i] !== was[i] && overParts.includes(names[ids[i]])) {
        if (perPixelOver.has(names[ids[i]])) continue
        const a = at.get(ids[i]) ?? [0, 0]; a[0] += Z[i]; a[1]++; at.set(ids[i], a)
      }
    }
    const near = new Set([...at].filter(([, [s, n]]) => s / n < headZ).map(([k]) => k))
    const line = c.color(INK)
    for (let i = 0; i < data.length; i++) {
      if (data[i] === was[i] || ids[i] < 0) continue
      const nm = names[ids[i]]
      if (near.has(ids[i]) || (perPixelOver.has(nm) && overParts.includes(nm) && Z[i] < headZ - 0.5)) {
        kept.add(i); data[i] = was[i]
      }
    }
    for (const i of kept) for (const d of [1, -1, W, -W]) if (!kept.has(i + d) && data[i + d] !== was[i + d]) data[i + d] = line
  }
  return { at: (x, y) => x >= x0 && y >= y0 && x < x0 + img.w && y < y0 + img.h && (img.data[(y - y0) * img.w + x - x0] & 255) >= 128, z: headZ }
}

// Compute tight bounding cell [w, h, pivot] over all frames & headings for a set of 3D boxes
const computeCell = (samples, pad = 2) => {
  let x0 = 0, x1 = 0, y0 = 0, y1 = 0
  for (const [lo, hi] of samples) {
    for (let c = 0; c < 8; c++) {
      const q = [c & 1 ? hi[0] : lo[0], c & 2 ? hi[1] : lo[1], c & 4 ? hi[2] : lo[2]]
      const sx = q[0], sy = -q[1] * SP - q[2] * CP
      if (sx < x0) x0 = sx; if (sx > x1) x1 = sx
      if (sy < y0) y0 = sy; if (sy > y1) y1 = sy
    }
  }
  const L = Math.ceil(-x0) + pad, Top = Math.ceil(-y0) + pad
  return { w: L + Math.ceil(x1) + pad + 1, h: Top + Math.ceil(y1) + pad + 1, pivot: [L, Top] }
}

// Prepare a kit rider spec (reusing kit's exact validation, head baking, worn parts, and swap!)
const prepareRider = (who, riderSpec, moves) => {
  const s = K.fillOf(riderSpec), B = K.body(s.body), H = K.partOf("head", s.head), W = K.wearing(s)
  const why = K.check(W, H) ?? K.staffWhy(s, W)
  if (why) throw new Error(`${who}: ${why}`)
  if (W.hip && !W.belt) W.belt = K.PIECES.belt
  for (const k of K.BEASTLY) W[k] = K.partOf(k, s[k])
  const onHead = [W.ears, W.horns, W.hair, W.beard].filter(Boolean), hw = W.headwear
  const things = K.THING_SLOTS.filter((k) => W[k]), fc = W.face?.approved || W.face?.own ? undefined : W.face
  const digi = !!(s.digi || B.digi), bony = s.bony ?? (H.key === "skull"), line = s.line ?? "dark"
  const reach = Math.max(H.reach, ...onHead.map((P) => P.reach ?? 0), hw?.reach ?? 0)
  const hd = K.headOf(H, onHead, hw, fc)
  const moving = moves.some((m) => !["stand", "mount_stand", "idle", "mount_idle"].includes(m))
  const walks = moving && W.hair?.hang
  const stillParts = walks ? onHead.map((P) => (P.hang ? { ...P, key: `${P.key}~still`, field: P.still } : P)) : onHead
  const still = walks && K.headOf(H, stillParts, hw, fc)
  const exprNeeded = new Set()
  if (!hw?.closed) for (const m of moves) {
    const bm = MOUNT_TO_RIDER_MOVE[m] ?? m, ex = K.FT[bm]?.expr
    if (typeof ex === "string") exprNeeded.add(ex)
    else if (Array.isArray(ex)) for (const e of ex) if (e) exprNeeded.add(e)
  }
  const exprHeads = {}, exprStill = {}
  for (const ex of exprNeeded) {
    exprHeads[ex] = K.headOf(H, onHead, hw, fc, ex)
    if (walks) exprStill[ex] = K.headOf(H, stillParts, hw, fc, ex)
  }
  const pickHead = (pose) => {
    const ex = pose.expr, mov = walks && pose.lag?.[0]
    if (ex && exprHeads[ex]) return mov ? exprStill[ex] : exprHeads[ex]
    return mov ? still : hd
  }
  const headTopZ = Math.min(reach, Math.max(5.8, H.reach * 0.72, hw?.reach ? hw.reach * 0.75 : 0))
  const wornFn = K.worn(B, W, digi, H.skin, bony)
  const over = [...(things.length ? [...K.THING_SLOTS, ...(W.back?.split ? ["wingL", "wingR"] : [])] : []), ...(walks ? ["hangtail", "hangtail-1", "hangtail1"] : [])]
  const headV = K.headVol(H, onHead, hw)
  return { s, B, H, W, reach, pickHead, headTopZ, wornFn, over, things, line, headV, swap: K.swapFor(s) }
}

// ---------------------------------------------------------------- 1. Standalone Mount (`mounts.mount`)
const mountCache = new Map()
const mount = (name, spec = {}) => {
  const m = fillMountSpec(spec), S = m.S
  const dirs = dirList(spec.dirs, `mounts.mount '${name}'`)
  const moves = resolveMovesSpec(spec.moves, S, "mount", `mounts.mount '${name}'`)
  for (const mv of moves) if (!MOUNT_MOVES[mv]) throw new Error(`mounts.mount '${name}': no move '${mv}' (${Object.keys(MOUNT_MOVES).join(", ")})`)
  const line = spec.line ?? "dark"
  const frontSplit = !!spec.front
  const geomKey = JSON.stringify([S.key, m.coatPreset.points, m.mane !== "none", m.saddle !== false, m.blanket !== false, m.bridle !== false, m.canopy !== false, m.draughtSpec?.species ?? null, m.draughtSpec?.coatPreset?.points ?? null, m.barding, m.caparison, !!m.bags, line, frontSplit, moves, dirs])

  if (!mountCache.has(geomKey)) {
    const fn = `_mnt${mountCache.size}`, soles = quadSolesOf(S, dirs)
    const wheelAt = (mv, f, nf) => (mv === "walk" || mv === "charge" ? (f / Math.max(1, nf)) * (Math.PI / 3) : (S.archetype === "clockwork" && (mv === "idle" || mv === "scan" || mv === "vent") ? (f / Math.max(1, nf)) * (Math.PI / 6) : 0))
    const boxSamples = []
    for (const mv of moves) {
      const M = MOUNT_MOVES[mv]
      for (const d of dirs) {
        const deg = DIR_DEG[d], aw = soles.get(d) ?? 0
        for (let i = 0; i < M.frames; i++) {
          const { q } = makeMountJoints(m, mv, i, M.frames, deg, aw, wheelAt)
          const { parts } = buildMountParts(q, m, m.coatPreset)
          boxSamples.push(partsToField(parts, true).bounds())
        }
      }
    }
    const cell = computeCell(boxSamples, 2)
    const [px, py] = cell.pivot, at = [px + 0.5, py + 0.5]
    const screenFn = (q) => [px + q[0], py - q[1] * SP - q[2] * CP]
    const mats = { ...T.FIG.mats, ...K.EMIT_MATS, ...Object.fromEntries(Object.values(MKEYS).map((r) => [r, r])), [MKEYS.eye[1]]: { ramp: MKEYS.eye[1], emit: 0.9 } }
    const builtNames = [], frontNames = []

    for (const mv of moves) {
      const M = MOUNT_MOVES[mv], fam = `${fn}_${mv}`, frontFam = `${fn}_front_${mv}`
      const twinOf = dirs.map((d) => {
        const deg = DIR_DEG[d]
        return deg > 0 && deg < 180 ? dirs.findIndex((o) => Math.abs(DIR_DEG[o] - (360 - deg)) < 1e-9) : -1
      })
      const makePaint = (d, isFront) => (c) => {
        const deg = DIR_DEG[d], aw = soles.get(d) ?? 0
        const { p, q } = makeMountJoints(m, mv, c.frame, M.frames, deg, aw, wheelAt)
        const { parts } = buildMountParts(q, m, m.coatPreset)
        const activeParts = isFront
          ? Object.fromEntries(Object.entries(parts).filter(([k]) => ["mount_neck", "mount_head", "mount_mane", "mount_barding", "mount_bridle", "draught_head", "draught_neck", "draught_mane", "draught_body"].includes(k)))
          : parts
        const field = partsToField(activeParts, true)
        c.surface(field, { view: VIEW, ppm: 1, at, mats, light: LIGHT, outline: false, rim: false, inner: line === "ink" ? INK : "dark", shadows: false, ao: 0, ...LIT_SURF })
        if (isFront) {
          // Keep ONLY foreground neck/head/barding pixels strictly in front of the saddle plane
          // (never covering the rider's near leg over the mount's flank/caparison!)
          const sadZ = camDepth(q.saddleSeat) - 0.5
          const { data, depth: Z, norm, emit, parts: pt } = c.img
          for (let i = 0; i < data.length; i++) {
            if (!Z || Z[i] >= sadZ) { data[i] = 0; if (norm) { norm[i * 3] = 0; norm[i * 3 + 1] = 0; norm[i * 3 + 2] = 0 } if (emit) emit[i] = 0; if (pt) pt.ids[i] = -1 }
          }
        }
        if (!isFront) outlineMountHead(c, INK, S.archetype === "wolf" && Math.abs(Math.sin(deg * RAD)) < 0.25)
        drawRing(c, INK)
        if (!isFront) drawMountEffect(c, q, p, screenFn)
        if (p.flash) c.recolor(MOUNT_LIGHTER)
        const sk = p.shake ? screenFn(add3(q.origin, mul3(q.f, p.shake))).map((v, e) => Math.round(v - screenFn(q.origin)[e])) : [0, 0]
        if (sk[0] || sk[1]) c.shake(...sk)
        const put = (sn, pt) => c.setSocket(sn, ...screenFn(pt).map((v, e) => Math.round(v) + sk[e]))
        put("saddle", q.saddleSeat)
        put("reins", q.reinsAt)
        put("head_top", q.headTop)
        put("center", q.origin)
        put("chest", add3(q.chest, mul3(q.f, S.chestR[1] * 0.85)))
        const info = { ...(p.flash ? { flash: true } : {}), ...(p.downed ? { downed: true } : {}), ...(p.dead ? { dead: true } : {}) }
        if (Object.keys(info).length) c.setData(info)
      }
      dirs.forEach((d, idx) => {
        const an = `${fam}_${d}`, tw = twinOf[idx]
        if (tw < 0) anim(an, { w: cell.w, h: cell.h, pivot: cell.pivot }, ...M.ms.map((ms) => frame({ ms }, makePaint(d, false))))
        else anim(an, { base: `${fam}_${dirs[tw]}`, flip: "x" })
        builtNames.push(an)
        if (frontSplit) {
          const fan = `${frontFam}_${d}`
          if (tw < 0) anim(fan, { w: cell.w, h: cell.h, pivot: cell.pivot }, ...M.ms.map((ms) => frame({ ms }, makePaint(d, true))))
          else anim(fan, { base: `${frontFam}_${dirs[tw]}`, flip: "x" })
          frontNames.push(fan)
        }
      })
    }
    mountCache.set(geomKey, { fn: own(fn), cell, builtNames, frontNames })
  }

  const { fn, cell, builtNames, frontNames } = mountCache.get(geomKey), pre = fn.length, swap = mountSwapFor(spec)
  const names = builtNames.map((n) => { const out = name + n.slice(pre); anim(out, { base: n, swap }); return out })
  const fronts = frontNames.map((n) => { const out = name + n.slice(pre); anim(out, { base: n, swap }); return out })
  group(name, names)
  if (fronts.length) group(`${name}_front`, fronts)
  return { ...m, names, ...(fronts.length ? { fronts } : {}), cell, meta: { species: S.key, saddleHeight: S.saddleSeat, barrelRadius: S.barrelW, footprint: S.footprint, bodyFit: S.bodyFit } }
}

// ---------------------------------------------------------------- 2. Combined Baked 3D (`mounts.mounted`)
// Renders mount + seated rider inside ONE unified 3D surface() pass: exact occlusion, continuous ink,
// shared lighting & normals, and combined mount + rider sockets.
const mountedCache = new Map()
const mounted = (name, riderSpec = {}, mountSpec = {}) => {
  const m = fillMountSpec(mountSpec), S = m.S
  const dirs = dirList(mountSpec.dirs ?? riderSpec.dirs, `mounts.mounted '${name}'`)
  const moves = resolveMovesSpec(mountSpec.moves ?? riderSpec.moves, S, "mounted", `mounts.mounted '${name}'`)
  const R = prepareRider(`mounts.mounted '${name}'`, riderSpec, moves)
  const line = mountSpec.line ?? R.line ?? "dark"
  const builtMoves = Object.fromEntries(moves.map((mv) => [mv, buildMountedMove(mv, R.B, R.W, S, R.s.staff, R.headV)]))
  const asymmetric = R.things.length > 0 || Object.values(builtMoves).some((M) => M.fight)

  const geomKey = JSON.stringify([
    "baked", S.key, m.coatPreset.points, m.mane !== "none", m.saddle !== false, m.blanket !== false, m.bridle !== false, m.canopy !== false, m.draughtSpec?.species ?? null, m.draughtSpec?.coatPreset?.points ?? null, m.barding, m.caparison, !!m.bags,
    R.B.name, R.s.head, R.s.hair, R.s.beard, R.s.headwear, R.s.face, R.s.ears, R.s.horns,
    K.WEAR.map((k) => R.W[k]?.key), K.BEASTLY.map((k) => R.W[k]?.key), R.things.map((k) => `${k}:${R.W[k].key}`),
    line, moves, dirs,
  ])

  if (!mountedCache.has(geomKey)) {
    const fn = `_mb${mountedCache.size}`, soles = quadSolesOf(S, dirs)
    const wheelAt = (mv, f, nf) => (mv === "walk" || mv === "charge" ? (f / Math.max(1, nf)) * (Math.PI / 3) : 0)
    const boxSamples = []
    for (const mv of moves) {
      const BM = builtMoves[mv], MM = MOUNT_MOVES[BM.mountMove]
      for (const d of dirs) {
        const deg = DIR_DEG[d], aw = soles.get(d) ?? 0
        for (let i = 0; i < BM.frames; i++) {
          const { q } = makeMountJoints(m, BM.mountMove, i, MM.frames, deg, aw, wheelAt, true)
          const rp = BM.pose(i, deg), seat = add3(q.saddleSeat, [0, 0, S.rider.seatLift])
          const rj = mountedRiderJoints(R.B.body, rp, deg, seat, () => [0, 0])
          const { parts: mParts } = buildMountParts(q, m, m.coatPreset)
          const rParts = R.wornFn(rj, rp)
          boxSamples.push(partsToField({ ...mParts, ...rParts }, true).bounds())
          boxSamples.push(sdf.sphere(R.reach).at(rj.head).bounds())
        }
      }
    }
    const cell = computeCell(boxSamples, 2)
    const [px, py] = cell.pivot, at = [px + 0.5, py + 0.5]
    const screenFn = (q) => [px + q[0], py - q[1] * SP - q[2] * CP]
    const mats = { ...T.FIG.mats, ...K.EMIT_MATS, ...Object.fromEntries(Object.values(MKEYS).map((r) => [r, r])), [MKEYS.eye[1]]: { ramp: MKEYS.eye[1], emit: 0.9 } }
    const overAll = [...R.over, "mount_neck", "mount_head", "mount_mane", "mount_barding", "mount_bridle", "mount_caparison", "mount_bags", "draught_head", "draught_neck", "draught_mane", "draught_barding", "draught_body"]
    const builtNames = []

    for (const mv of moves) {
      const BM = builtMoves[mv], MM = MOUNT_MOVES[BM.mountMove], fam = `${fn}_${mv}`
      const twinOf = dirs.map((d) => {
        if (asymmetric) return -1
        const deg = DIR_DEG[d]
        return deg > 0 && deg < 180 ? dirs.findIndex((o) => Math.abs(DIR_DEG[o] - (360 - deg)) < 1e-9) : -1
      })
      const fDraw = BM.draw ?? (BM.fight && BM.FM ? K.fightDraw(R.B, R.W, BM.FM) : null)
      const bDraw = K.baseDraw(R.B, R.headTopZ)
      const makePaint = (d) => (c) => {
        const deg = DIR_DEG[d], aw = soles.get(d) ?? 0
        const { p: mp, q } = makeMountJoints(m, BM.mountMove, c.frame, MM.frames, deg, aw, wheelAt, true)
        const rp = BM.pose(c.frame, deg), seat = add3(q.saddleSeat, [0, 0, S.rider.seatLift])
        const rj = mountedRiderJoints(R.B.body, rp, deg, seat, screenFn)
        const { parts: mParts } = buildMountParts(q, m, m.coatPreset)
        const rParts = R.wornFn(rj, rp)
        const field = partsToField({ ...mParts, ...rParts }, true)
        c.surface(field, { view: VIEW, ppm: 1, at, mats, light: LIGHT, outline: false, rim: false, inner: line === "ink" ? INK : "dark", shadows: false, ao: 0, ...LIT_SURF })
        outlineMountHead(c, INK, S.archetype === "wolf" && Math.abs(Math.sin(deg * RAD)) < 0.25)
        drawRing(c, INK)
        const headName = R.pickHead(rp)
        const hdRef = stampRiderHead(c, headName, rj, screenFn, overAll)
        rj.rod = makeRod(c, screenFn, hdRef)
        drawMountEffect(c, q, mp, screenFn)
        if (fDraw) fDraw(c, rj, rp)
        bDraw(c, rj, rp)
        if (mp.flash && !rp.flash) c.recolor(MOUNT_LIGHTER)
        const put = (sn, pt) => { if (!c.img.sockets?.[sn]) c.setSocket(sn, ...screenFn(pt).map(Math.round)) }
        put("saddle", q.saddleSeat)
        put("reins", q.reinsAt)
        put("chest", add3(q.chest, mul3(q.f, S.chestR[1] * 0.85)))
      }
      dirs.forEach((d, idx) => {
        const an = `${fam}_${d}`, tw = twinOf[idx]
        if (tw < 0) anim(an, { w: cell.w, h: cell.h, pivot: cell.pivot }, ...BM.ms.map((ms) => frame({ ms }, makePaint(d))))
        else anim(an, { base: `${fam}_${dirs[tw]}`, flip: "x" })
        builtNames.push(an)
      })
    }
    mountedCache.set(geomKey, { fn: own(fn), cell, builtNames })
  }

  const { fn, cell, builtNames } = mountedCache.get(geomKey), pre = fn.length
  const swap = { ...R.swap, ...mountSwapFor(mountSpec) }
  const names = builtNames.map((n) => { const out = name + n.slice(pre); anim(out, { base: n, swap }); return out })
  group(name, names)
  return { name, names, cell, rider: R.s, mount: m }
}

// ---------------------------------------------------------------- 3. Modular 3D Depth-Clipped Rider (`mounts.rider`)
// Renders ONLY the seated rider, depth-tested against the mount's 3D barrel (clip: "barrel") or full
// barrel+neck+head volume (clip: "mount", default) before outlining, so compositing `[mount, rider]`
// (or `[mount, rider, mount_front]`) at runtime matches the baked 3D render cleanly!
// `align: "saddle"` (default): sets img.pivot to the saddle point (snaps to mount.sockets.saddle!).
// `align: "ground"`: shares the mount's ground pivot (draw both at the same world position!).
const riderCache = new Map()
const rider = (name, riderSpec = {}, mountSpec = {}) => {
  const m = fillMountSpec(mountSpec), S = m.S
  const dirs = dirList(mountSpec.dirs ?? riderSpec.dirs, `mounts.rider '${name}'`)
  const moves = resolveMovesSpec(mountSpec.moves ?? riderSpec.moves, S, "rider", `mounts.rider '${name}'`)
  const clipMode = mountSpec.clip ?? "mount"
  if (!["mount", "barrel", "none"].includes(clipMode)) throw new Error(`mounts.rider '${name}': clip must be "mount", "barrel" or "none", got ${JSON.stringify(clipMode)}`)
  const align = mountSpec.align ?? "saddle"
  if (!["saddle", "ground"].includes(align)) throw new Error(`mounts.rider '${name}': align must be "saddle" or "ground", got ${JSON.stringify(align)}`)

  const R = prepareRider(`mounts.rider '${name}'`, riderSpec, moves)
  const line = mountSpec.line ?? R.line ?? "dark"
  const builtMoves = Object.fromEntries(moves.map((mv) => [mv, buildMountedMove(mv, R.B, R.W, S, R.s.staff, R.headV)]))
  const asymmetric = R.things.length > 0 || Object.values(builtMoves).some((M) => M.fight)

  const geomKey = JSON.stringify([
    "rider", S.key, clipMode, align, m.canopy !== false, m.draughtSpec?.species ?? null, m.barding, m.caparison,
    R.B.name, R.s.head, R.s.hair, R.s.beard, R.s.headwear, R.s.face, R.s.ears, R.s.horns,
    K.WEAR.map((k) => R.W[k]?.key), K.BEASTLY.map((k) => R.W[k]?.key), R.things.map((k) => `${k}:${R.W[k].key}`),
    line, moves, dirs,
  ])

  if (!riderCache.has(geomKey)) {
    const fn = `_mr${riderCache.size}`, soles = quadSolesOf(S, dirs)
    const wheelAt = () => 0
    const boxSamples = []
    for (const mv of moves) {
      const BM = builtMoves[mv], MM = MOUNT_MOVES[BM.mountMove]
      for (const d of dirs) {
        const deg = DIR_DEG[d], aw = soles.get(d) ?? 0
        for (let i = 0; i < BM.frames; i++) {
          const { q } = makeMountJoints(m, BM.mountMove, i, MM.frames, deg, aw, wheelAt, true)
          const rp = BM.pose(i, deg), seat = add3(q.saddleSeat, [0, 0, S.rider.seatLift])
          // In `align: "saddle"`, anchor coordinates relative to `q.saddleSeat` so every frame's saddle sits on `cell.pivot`!
          const shift = align === "saddle" ? mul3(q.saddleSeat, -1) : [0, 0, 0]
          const rj = mountedRiderJoints(R.B.body, rp, deg, add3(seat, shift), () => [0, 0])
          boxSamples.push(partsToField(R.wornFn(rj, rp), false).bounds())
          boxSamples.push(sdf.sphere(R.reach).at(rj.head).bounds())
        }
      }
    }
    const cell = computeCell(boxSamples, 2)
    const [px, py] = cell.pivot, at = [px + 0.5, py + 0.5]
    const screenFn = (q) => [px + q[0], py - q[1] * SP - q[2] * CP]
    const mats = { ...T.FIG.mats, ...K.EMIT_MATS }
    const builtNames = []

    for (const mv of moves) {
      const BM = builtMoves[mv], MM = MOUNT_MOVES[BM.mountMove], fam = `${fn}_${mv}`
      const twinOf = dirs.map((d) => {
        if (asymmetric) return -1
        const deg = DIR_DEG[d]
        return deg > 0 && deg < 180 ? dirs.findIndex((o) => Math.abs(DIR_DEG[o] - (360 - deg)) < 1e-9) : -1
      })
      const fDraw = BM.draw ?? (BM.fight && BM.FM ? K.fightDraw(R.B, R.W, BM.FM) : null)
      const bDraw = K.baseDraw(R.B, R.headTopZ)
      const makePaint = (d) => (c) => {
        const deg = DIR_DEG[d], aw = soles.get(d) ?? 0
        const { q } = makeMountJoints(m, BM.mountMove, c.frame, MM.frames, deg, aw, wheelAt)
        const rp = BM.pose(c.frame, deg)
        const shift = align === "saddle" ? mul3(q.saddleSeat, -1) : [0, 0, 0]
        const seat = add3(add3(q.saddleSeat, [0, 0, S.rider.seatLift]), shift)
        const rj = mountedRiderJoints(R.B.body, rp, deg, seat, screenFn)

        // Step A: Pre-populate c.img.depth from the 3D mount occlusion volume, dilate by 1 px so the mount's
        //         outer black silhouette outline is NEVER painted over by the rider behind it, then clear pixels!
        let occlDepth = null
        if (clipMode !== "none") {
          const { barrelProxy, fullProxy } = buildMountParts(q, m, m.coatPreset)
          const proxy = (clipMode === "barrel" ? barrelProxy : fullProxy).at(shift).mat("k")
          c.surface(proxy, { view: VIEW, ppm: 1, at, mats: { k: "k" }, light: LIGHT, outline: false, rim: false, inner: false, shadows: false, ao: 0 })
          if (c.img.depth) {
            const W = c.img.w, H = c.img.h, raw = c.img.depth.slice(), dil = raw.slice()
            for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
              const i = y * W + x
              if (Number.isFinite(raw[i])) continue
              let best = Infinity
              for (const d of [1, -1, W, -W]) { const z = raw[i + d]; if (z < best) best = z }
              if (best < Infinity) dil[i] = best
            }
            c.img.depth.set(dil)
            occlDepth = dil
          }
          c.img.data.fill(0)
          if (c.img.norm) c.img.norm.fill(0)
          if (c.img.emit) c.img.emit.fill(0)
          if (c.img.parts) c.img.parts.ids.fill(-1)
        }

        // Step B: Render rider SDF against the mount depth buffer (auto-clips far leg, far coat, chest behind neck!)
        const rField = partsToField(R.wornFn(rj, rp), false)
        c.surface(rField, { view: VIEW, ppm: 1, at, mats, light: LIGHT, outline: false, rim: false, inner: line === "ink" ? INK : "dark", shadows: false, ao: 0, ...LIT_SURF })

        // Step C: Depth-aware outer ink ring (skips ink pixels occluded behind horse neck/head!)
        drawRing(c, INK, occlDepth)

        // Step D: Stamp 2D head with depth clipping + rider `over` parts, then draw hooks & sockets
        const headName = R.pickHead(rp)
        const hdRef = stampRiderHead(c, headName, rj, screenFn, R.over, occlDepth)
        rj.rod = makeRod(c, screenFn, hdRef)
        if (fDraw) fDraw(c, rj, rp)
        bDraw(c, rj, rp)
        c.setSocket("saddle", ...screenFn(add3(q.saddleSeat, shift)).map(Math.round))
      }
      dirs.forEach((d, idx) => {
        const an = `${fam}_${d}`, tw = twinOf[idx]
        if (tw < 0) anim(an, { w: cell.w, h: cell.h, pivot: cell.pivot }, ...BM.ms.map((ms) => frame({ ms }, makePaint(d))))
        else anim(an, { base: `${fam}_${dirs[tw]}`, flip: "x" })
        builtNames.push(an)
      })
    }
    riderCache.set(geomKey, { fn: own(fn), cell, builtNames })
  }

  const { fn, cell, builtNames } = riderCache.get(geomKey), pre = fn.length
  const names = builtNames.map((n) => { const out = name + n.slice(pre); anim(out, { base: n, swap: R.swap }); return out })
  group(name, names)
  return { name, names, cell, align, clip: clipMode, rider: R.s, mount: m }
}

// ---------------------------------------------------------------- 4. Engine-Agnostic Sheet Exporter (`mounts.export`)
const exportMount = (name, spec = {}, opts = {}) => {
  const allowed = ["layout", "dirs", "moves", "aliases", "cell", "pivot", "pad", "extrude", "format", "scale", "slots", "keepAnims", "meta", "rider", "mode", "front", "clip", "align"]
  for (const k of Object.keys(opts)) if (!allowed.includes(k)) throw new Error(`mounts.export '${name}': unknown option '${k}' (allowed: ${allowed.join(", ")})`)
  const layout = opts.layout ?? "atlas"
  if (!["atlas", "per-dir", "strips"].includes(layout)) throw new Error(`mounts.export '${name}': layout must be "atlas", "per-dir" or "strips", got ${JSON.stringify(layout)}`)
  const mode = opts.mode ?? (opts.rider ? "mounted" : "mount")
  if (!["mount", "mounted", "rider"].includes(mode)) throw new Error(`mounts.export '${name}': mode must be "mount", "mounted" or "rider", got ${JSON.stringify(mode)}`)
  const dirs = dirList(opts.dirs ?? spec.dirs ?? "4", `mounts.export '${name}'`)
  const m0 = fillMountSpec(spec)
  const movesSpec = opts.moves ?? spec.moves ?? "basic"
  const moves = resolveMovesSpec(movesSpec, m0.S, mode, `mounts.export '${name}'`)

  const animPrefix = opts.keepAnims ? name : `_${name}`
  const mSpec = { ...spec, dirs, moves, ...(opts.front ? { front: true } : {}), ...(opts.clip ? { clip: opts.clip } : {}), ...(opts.align ? { align: opts.align } : {}) }
  const built = mode === "mount" ? mount(animPrefix, mSpec) : mode === "mounted" ? mounted(animPrefix, opts.rider ?? {}, mSpec) : rider(animPrefix, opts.rider ?? {}, mSpec)
  const S = (built.S ?? built.mount.S)
  const mAlias = opts.aliases?.moves ?? {}, dAlias = opts.aliases?.dirs ?? {}, sAlias = opts.aliases?.sockets ?? {}
  const moveLabel = (mv) => mAlias[mv] ?? mv, dirLabel = (d) => dAlias[d] ?? d
  const moveInfo = Object.fromEntries(moves.map((mv) => {
    const label = moveLabel(mv), bm = MOUNT_TO_RIDER_MOVE[mv] ?? mv, MM = MOUNT_MOVES[RIDER_TO_MOUNT_MOVE[bm] ?? bm] ?? MOUNT_MOVES.stand
    return [label, {
      ...(label !== mv ? { source: mv } : {}),
      frames: MM.frames, ms: MM.ms, loop: MM.loop,
      ...(bm === "walk" ? { pace: S.pace } : {}),
      ...(bm === "charge" ? { pace: +(S.pace * 1.85).toFixed(2) } : {}),
    }]
  }))
  const baseSockets = (mode === "rider" ? ["saddle", "head_top", "center", "main", "off"] : mode === "mounted" ? ["saddle", "reins", "chest", "head_top", "center", "main", "off"] : ["saddle", "reins", "head_top", "center", "chest"]).map((k) => sAlias[k] ?? k)
  const mountMeta = { species: S.key, saddleHeight: S.saddleSeat, barrelRadius: S.barrelW, footprint: S.footprint, bodyFit: S.bodyFit, mode }
  const commonOpts = {
    cell: opts.cell ?? "auto",
    pivot: opts.pivot ?? (mode === "rider" && (opts.align ?? "saddle") === "saddle" ? "center" : "bottom"),
    ...(opts.pad !== undefined ? { pad: opts.pad } : {}),
    ...(opts.extrude !== undefined ? { extrude: opts.extrude } : {}),
    ...(opts.format !== undefined ? { format: opts.format } : {}),
    ...(opts.scale !== undefined ? { scale: opts.scale } : {}),
    ...(opts.slots !== undefined ? { slots: opts.slots } : {}),
    ...(Object.keys(sAlias).length ? { sockets: sAlias } : {}),
  }
  const sheets = []
  const packSet = (sheetBase, srcPrefix, extraMeta = {}) => {
    if (layout === "atlas") {
      const entries = [], names = {}
      for (const d of dirs) for (const mv of moves) { const src = `${srcPrefix}_${mv}_${d}`; entries.push(src); names[src] = `${moveLabel(mv)}_${dirLabel(d)}` }
      sheet(sheetBase, entries, { ...commonOpts, rows: "tag", names, meta: { mount: mountMeta, layout, dirs: dirs.map(dirLabel), moves: moveInfo, sockets: baseSockets, ...extraMeta, ...(opts.meta ?? {}) } })
      sheets.push(sheetBase)
    } else if (layout === "per-dir") {
      for (const d of dirs) {
        const dl = dirLabel(d), sName = `${sheetBase}_${dl}`, entries = [], names = {}
        for (const mv of moves) { const src = `${srcPrefix}_${mv}_${d}`; entries.push(src); names[src] = moveLabel(mv) }
        sheet(sName, entries, { ...commonOpts, rows: "tag", names, meta: { mount: mountMeta, layout, dir: dl, moves: moveInfo, sockets: baseSockets, ...extraMeta, ...(opts.meta ?? {}) } })
        sheets.push(sName)
      }
    } else {
      for (const d of dirs) for (const mv of moves) {
        const dl = dirLabel(d), ml = moveLabel(mv), sName = `${sheetBase}_${ml}_${dl}`, src = `${srcPrefix}_${mv}_${d}`
        sheet(sName, [src], { ...commonOpts, cols: moveInfo[ml].frames, names: { [src]: ml }, meta: { mount: mountMeta, layout, dir: dl, move: ml, ...moveInfo[ml], sockets: baseSockets, ...extraMeta, ...(opts.meta ?? {}) } })
        sheets.push(sName)
      }
    }
  }
  packSet(name, animPrefix)
  if (mode === "mount" && opts.front) packSet(`${name}_front`, `${animPrefix}_front`, { layer: "front" })
  return { name, sheets, dirs: dirs.map(dirLabel), moves: moves.map(moveLabel), cell: built.cell, meta: mountMeta }
}

Object.assign(mounts, {
  mount, mounted, rider, swap: slotSwap, export: exportMount,
  SPECIES, COATS, MANES, HOOVES, METALS: MOUNT_METALS, EYES: EYES_MOUNT, MOVES: MOUNT_MOVES, RIDER_MOVES, KEYS: MKEYS,
})
}
