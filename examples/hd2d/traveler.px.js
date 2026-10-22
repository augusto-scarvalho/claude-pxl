// An HD-2D traveler, turned to the lower left (SW) and the upper left (NW) as tactics and HD-2D figures
// stand (characters §6 "Turned to a diagonal"; the other two diagonals flipped), idle and walking. The
// body is pre-rendered, the head drawn by hand (characters §3 "A 3D reference"): Quaternius' mannequin
// and its Idle_Loop and Walk_Loop (Universal Animation Library, CC0) made chibi by scaling its bones,
// a hair cap and a cloak riding them, seen nearly level (20 degrees down) and turned 25 degrees off
// the diagonal; rendered twice a frame (regions in flat colors, the light alone) by
// traveler/make_bases.py in Blender, brought down 4x by traveler/reduce.mts: each pixel the region
// most of its block shows, a tone of that region's ramp by how lit it is (cel shading), the 3D head
// cleared and where it was printed (HEAD below). The head over it is a drawing (Alfyn's and Cyrus'
// construction: the face the lightest thing, framed by dark locks, the hair tufts lit 1-2 px). The
// mourner is the same frames recolored.
pal({
  k: "#1c1418",                                                   // outline
  S: "#f0c79e", s: "#d2966f", z: "#9c5b45",                       // skin
  Y: "#c9934f", h: "#7d4a2a", j: "#4a2716", J: "#24110b",         // chestnut hair
  e: "#3a6aa2", G: "#f4f0e6",                                     // the iris, a glint
  C: "#77a068", c: "#4c7652", n: "#30503d", N: "#1c2e27",         // a green travel cloak
  W: "#d8c69e", w: "#a68f6c", v: "#6f5c4a",                       // linen
  p: "#66637a", P: "#423f53", R: "#2e2b3c",                       // trousers
  l: "#83542f", d: "#4b2e1e", D: "#2e1a10",                       // boots
})
ramps("kzsS", "kJjhY", "kNncC", "kvwW", "kRPp", "kDdl")

// The heads, 16 px wide: facing SW the face on the leading side (8 px, the lightest thing on him),
// a lock framing it, the back of the head on the right down to the ear; the near eye a dark stroke
// with a glint, the far one a stroke by the face's edge, brows, a small smile. Facing NW all hair,
// lit only at the crown, darkest at the nape, the ear and a sliver of jaw on the left.
sprite("_tr_head_sw", `
  .....JY.YJ......
  ...JjYjJYjYJ.J..
  ..JYjhYjhjYjJjJ.
  .JhYjYhjYjhjjjJ.
  .JYjhjjYjjhjjYjJ
  .JjYhjYjjYjhjjjJ
  .JjhjSjjSjjhjJjJ
  .JjSSSSSSjjhjjJ.
  .jjSjjSSjjhjjYjJ
  ..JSkGSSkjhjjjJ.
  ..JSkSSSkjsjjJ..
  ..JSSSSSSjzjJ...
  ...JSzzSsjjJ....
  ....JSSszJ......`)
sprite("_tr_head_nw", `
  .....JY.YJ......
  ...JjYjJYjYJ.J..
  ..JYjYYjhYjjJjJ.
  .JhYYhYjYhjjjjJ.
  .JYjYhjYjhjjjjjJ
  .JjYhjhjjhjjjjjJ
  .JjhjjhjjjjhjjjJ
  .JhjjhjjjhjjjjJ.
  .Jsjjhjjjjhjjjj.
  .Jzjjjjjjjjjjj..
  ..JzJjjJjjJjjJ..
  ..JzJJjJJjJJjJ..
  ...JJ.JJ.JJ.J...`)

// Where the 3D head was in each frame, [top row, middle column] (reduce.mts prints it), and how long
// each frame holds: the idle's 4 at 250 ms, the walk's 8 at 110.
const HEAD = {
  sw_idle: [[0, 7], [0, 7], [0, 7], [0, 7]], sw_walk: [[0, 8], [1, 7], [0, 8], [0, 8], [1, 8], [0, 8], [0, 7], [0, 7]],
  nw_idle: [[0, 8], [1, 9], [0, 8], [1, 9]], nw_walk: [[1, 8], [0, 7], [0, 7], [0, 7], [1, 8], [0, 8], [0, 8], [0, 8]],
}
// The mourner: grey hair, a shawl of dark violet, grey linen.
const MOURNER = {
  Y: "#bdb8ae", h: "#8f8a84", j: "#625e5c", J: "#383536",
  C: "#7a6c8c", c: "#56496a", n: "#3a3150", N: "#231d33", W: "#a8a196", w: "#7f786f", v: "#58534e",
}
for (const v of ["sw", "nw"]) sprite(`_mo_head_${v}`, { base: `_tr_head_${v}`, swap: MOURNER })
for (const [key, at] of Object.entries(HEAD)) {
  const [v, move] = key.split("_")
  at.forEach((_, i) => {
    sprite(`_tr_${key}_${i}`, { png: `traveler/${key}_${i}.png`, palettize: true })
    sprite(`_mo_${key}_${i}`, { base: `_tr_${key}_${i}`, swap: MOURNER })
  })
  for (const who of ["tr", "mo"])
    anim(`${who}_${move}_${v}`, { w: 18, h: 34, pivot: [9, 34], outline: "k" },
      (c) => { const [top, mid] = at[c.frame]; c.stamp(`_${who}_${key}_${c.frame}`, 0, 0); c.stamp(`_${who}_head_${v}`, mid - 8, top) },
      ...at.map(() => frame({ ms: move === "idle" ? 250 : 110 })), bump("hybrid"))
}
sheet("traveler", ["tr_*", "mo_*"], { rows: "tag", pad: 1 })
