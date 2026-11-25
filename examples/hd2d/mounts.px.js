// The 3D mount and mounted-rider system (lib/characters/mounts.px.js): all eight HD-2D mount species
// (horse, warhorse, pony, bone_steed, war_aurochs, clockwork_strider, wolf, covered & open cart) across
// compass views, baked 3D mounted riders, modular depth-clipped `[mount, rider]` composition, and key
// animations (walk, seamless 8-frame charge, upright 2-legged rear, mounted rear_strike, direwolf bite,
// war-bull horn gore, and 5-frame collapse fall -> downed -> dead).
include("../../lib/characters/mounts.px.js", { as: "mounts", palette: true })

const DIAG = ["sw", "se", "nw", "ne"]

// 1. Standalone lineup of all eight species (plus open flatbed cart) across the four tactical diagonals
const LINEUP = [
  ["horse",  { species: "horse",             coat: "bay",       dirs: DIAG }],
  ["war",    { species: "warhorse",          coat: "dapple",    dirs: DIAG }],
  ["pony",   { species: "pony",              coat: "chestnut",  dirs: DIAG }],
  ["bone",   { species: "bone_steed",        coat: "ivory",     dirs: DIAG }],
  ["bull",   { species: "war_aurochs",       coat: "aurochs",   dirs: DIAG }],
  ["clock",  { species: "clockwork_strider", coat: "porcelain", dirs: DIAG }],
  ["wolf",   { species: "wolf",              coat: "timber",    dirs: DIAG }],
  ["wagon",  { species: "cart",              coat: "oak",       dirs: DIAG, canopy: true,  draught: "horse" }],
  ["cart",   { species: "cart",              coat: "pine",      dirs: DIAG, canopy: false, draught: "war_aurochs" }],
]
for (const [name, spec] of LINEUP) mounts.mount(`m_${name}`, spec)

// 2. Baked 3D mounted riders paired with species-fitting characters & equipment
const CAVALRY = [
  ["lancer", { body: "tall", outfit: "knight", cloak: "travel", held: "spear", off: "tallshield", colors: { plate: "steel", apron: "red", cloak: "red" } },
    { species: "warhorse", coat: "dapple", dirs: ["sw", "w"], moves: ["stand", "rear_strike"] }],
  ["death",  { head: "skull", face: "skullglow", body: "medium", outfit: "knight", cloak: "travel", held: "sword", off: "roundshield", colors: { bone: "ivory", eyes: "green", apron: "plum", cloak: "plum", plate: "iron" } },
    { species: "bone_steed", coat: "ivory", dirs: ["sw", "w"], moves: ["stand"] }],
  ["bullr",  { body: "large", head: "bull", outfit: "barbarian", held: "axe", colors: { skin: "brown", horns: "ivory", torso: "red" } },
    { species: "war_aurochs", coat: "aurochs", dirs: ["sw", "w"], moves: ["stand", "gore"] }],
  ["mech",   { head: "automaton", outfit: "knight", held: "spear", off: "tallshield", colors: { chassis: "bronze", visor: "ember", plate: "bronze", apron: "green" } },
    { species: "clockwork_strider", coat: "porcelain", dirs: ["sw", "w"], moves: ["stand"] }],
  ["scout",  { body: "short", outfit: "ranger", hair: "tousled", off: "bow", back: "quiver", colors: { cloak: "rust", hair: "black", skin: "olive" } },
    { species: "wolf", coat: "timber", dirs: ["sw", "w"], moves: ["stand", "bite"] }],
  ["driver", { outfit: "peasant", headwear: "straw", colors: { torso: "linen", legs: "brown" } },
    { species: "cart", coat: "oak", dirs: ["sw", "w"], moves: ["stand"], canopy: true, draught: "horse" }],
]
for (const [name, rSpec, mSpec] of CAVALRY) mounts.mounted(`cav_${name}`, rSpec, mSpec)

// 3. Modular depth-clipped rider layer (snapped to the mount's saddle socket at runtime)
mounts.rider("mod_scout", { body: "short", outfit: "ranger", hair: "tousled", off: "bow", back: "quiver" }, {
  species: "horse", dirs: ["sw"], moves: ["stand"], clip: "mount", align: "saddle",
})

// Scene 1: Standalone mount roster (7 riding mounts in rows 1-2 + hitched covered & open carts cleanly spaced on row 3)
scene("mounts_roster", { w: 824, h: 274, bg: "#646873" },
  ...LINEUP.slice(0, 4).flatMap(([name], i) => DIAG.map((d, k) => stamp(`m_${name}_stand_${d}`, 36 + i * 202 + k * 44, 74))),
  ...LINEUP.slice(4, 7).flatMap(([name], i) => DIAG.map((d, k) => stamp(`m_${name}_stand_${d}`, 58 + i * 260 + k * 54, 158))),
  ...DIAG.map((d, k) => stamp(`m_wagon_stand_${d}`, 60 + k * 96, 248)),
  ...DIAG.map((d, k) => stamp(`m_cart_stand_${d}`,  468 + k * 96, 248)),
  text(8, 264, "SEVEN RIDING MOUNTS + HORSE-DRAWN WAGON & OX-DRAWN OPEN CART (SW SE NW NE)", "k"),
)

// Scene 2: Mounted cavalry & horse-drawn wagon showcase (baked 3D riders)
scene("mounts_cavalry", { w: 528, h: 178, bg: "#646873" },
  ...CAVALRY.flatMap(([name], i) => {
    const x = 42 + i * 74 + (name === "driver" ? 30 : 0)
    return [
      stamp(`cav_${name}_stand_sw`, x, 78),
      stamp(`cav_${name}_stand_w`,  x, 154),
    ]
  }),
  text(8, 168, "BAKED 3D MOUNTED CAVALRY & HORSE-DRAWN WAGON (SW TOP, W BOTTOM)", "k"),
)

// Scene 3: Mounted combat actions (rearing lancer plunge, direwolf bite, war-aurochs horn gore)
scene("mounts_actions", { w: 486, h: 248, bg: "#646873" },
  ...Array.from({ length: 6 }, (_, f) => stamp("cav_lancer_rear_strike_w", 46 + f * 78, 78, { frame: f })),
  ...Array.from({ length: 6 }, (_, f) => stamp("cav_scout_bite_w",         46 + f * 78, 154, { frame: f })),
  ...Array.from({ length: 6 }, (_, f) => stamp("cav_bullr_gore_w",         46 + f * 78, 232, { frame: f })),
  text(8, 239, "REAR_STRIKE (WARHORSE), BITE (WOLF), GORE (WAR AUROCHS)", "k"),
)
