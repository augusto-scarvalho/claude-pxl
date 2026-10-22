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
  L: "#fde6c6", S: "#f0c79e", s: "#d2966f", z: "#9c5b45",         // skin, its lightest only on the cheek and the nose
  B: "#e3a383",                                                   // a blush, smiling
  Y: "#c9934f", h: "#7d4a2a", j: "#4a2716", J: "#24110b",         // chestnut hair
  E: "#1f2f55", e: "#3a6aa2", G: "#f4f0e6",                       // the iris (navy at its top), the eye's white
  C: "#77a068", c: "#4c7652", n: "#30503d", N: "#1c2e27",         // a green travel cloak
  W: "#d8c69e", w: "#a68f6c", v: "#6f5c4a",                       // linen
  p: "#66637a", P: "#423f53", R: "#2e2b3c",                       // trousers
  l: "#83542f", d: "#4b2e1e", D: "#2e1a10",                       // boots
})
ramps("kzsSL", "kJjhY", "kNncC", "kvwW", "kRPp", "kDdl")

// The heads, 16 px wide. Facing SW, a face as Octopath's and Triangle Strategy's at this size
// (characters §5): 6 px of it on the leading side, low in the head, the fringe's lit tips over all
// but 3 px of forehead and a row of skin over the lids; no brows (the lid's dark row is one); the near
// eye on the head's middle, a dark lid 2 px wide over a navy iris with the white behind it (toward
// the ear: the gaze to the lower left) and a lighter iris under, the far eye a pixel of lid and of
// navy by the face's edge, 2 px of skin between them; no nose line, the skin's lightest tone under
// the gap instead; a 1 px mouth in the skin's shadow; the turned cheek a step darker toward the ear;
// a chin row in the mid skin, so the jaw parts from the collar; the lock framing the face lit, not a
// second black line. The eyes are the face's only black, and where its darkest and lightest meet.
// Blinking, the lids drop over the irises for a frame.
sprite("_tr_head_sw", `
  .....JY.YJ......
  ...JjYjJYjYJ.J..
  ..JYjhYjhjYjJjJ.
  .JhYjYhjYjhjjjJ.
  .JYjhjjYjjhjjYjJ
  .JjYhjYjjYjhjjjJ
  .JjhYjhjYjjhjJjJ
  .JjhSjhSSjjhjjJ.
  .jjSSSSSSjhjjYjJ
  ..hSkSSkkjhjjjJ.
  ..jSESSEGjsjjJ..
  ..JSSLLeSjzjJ...
  ...JSSzSsjjJ....
  ....JsssjJ......`)
sprite("_tr_head_sw_blink", { base: "_tr_head_sw" }, grid(0, 9, `
  ..hSSSSSSjhjjjJ.
  ..jSkSSkkjsjjJ..
  ..JSSLLSSjzjJ...`))
// Expressions, the lids and the mouth moved (characters §5): a smile (the cheek up over the lower iris,
// a blush, the mouth 2 px), calm (the lids lowered), surprised (the lids up a row, a black mouth),
// angry (the near lid's inner end lower). For a scene that needs them; the graveyard keeps him neutral.
sprite("_tr_head_sw_smile", { base: "_tr_head_sw" }, grid(0, 9, `
  ..hSkSSkkjhjjjJ.
  ..jSESSEGjsjjJ..
  ..JSSLLSBjzjJ...
  ...JSzzSBjjJ....
  ....JsssjJ......`))
sprite("_tr_head_sw_calm", { base: "_tr_head_sw" }, grid(0, 9, `
  ..hSSSSSSjhjjjJ.
  ..jSkSSkkjsjjJ..
  ..JSELLeGjzjJ...`))
sprite("_tr_head_sw_surprised", { base: "_tr_head_sw" }, grid(0, 8, `
  .jjSkSSkkjhjjYjJ
  ..hSSSSSSjhjjjJ.
  ..jSESSEGjsjjJ..
  ..JSeLLeSjzjJ...
  ...JSSkSsjjJ....`))
sprite("_tr_head_sw_angry", { base: "_tr_head_sw" }, grid(0, 9, `
  ..hSkSSSkjhjjjJ.
  ..jSESkkGjsjjJ..
  ..JSSLLeSjzjJ...
  ...JSzzSsjjJ....`))
// Facing NW all hair, lit only at the crown, darkest at the nape, the ear and a sliver of jaw on the left.
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

// Where the 3D head was in each frame, [top row, middle column] (reduce.mts prints it). The idle plays
// its 4 frames twice at 250 ms, a blink of 130 ms between the last two (once every 2 s); the walk its 8
// at 110.
const HEAD = {
  sw_idle: [[0, 8], [0, 8], [0, 8], [0, 8]], sw_walk: [[0, 7], [0, 7], [0, 8], [0, 8], [1, 8], [0, 8], [0, 8], [0, 7]],
  nw_idle: [[0, 8], [1, 8], [0, 8], [1, 8]], nw_walk: [[1, 8], [1, 8], [0, 7], [0, 7], [1, 7], [1, 7], [0, 8], [0, 8]],
}
// The mourner: grey hair, a shawl of dark violet, grey linen.
const MOURNER = {
  Y: "#bdb8ae", h: "#8f8a84", j: "#625e5c", J: "#383536",
  C: "#7a6c8c", c: "#56496a", n: "#3a3150", N: "#231d33", W: "#a8a196", w: "#7f786f", v: "#58534e",
}
for (const h of ["sw", "sw_blink", "nw"]) sprite(`_mo_head_${h}`, { base: `_tr_head_${h}`, swap: MOURNER })
for (const [key, at] of Object.entries(HEAD)) {
  const [v, move] = key.split("_")
  at.forEach((_, i) => {
    sprite(`_tr_${key}_${i}`, { png: `traveler/${key}_${i}.png`, palettize: true })
    sprite(`_mo_${key}_${i}`, { base: `_tr_${key}_${i}`, swap: MOURNER })
  })
  const idle = move === "idle", seq = idle ? [0, 1, 2, 3, 0, 1, 2, 2, 3] : at.map((_, i) => i), blink = idle && v === "sw" ? 7 : -1
  for (const who of ["tr", "mo"])
    anim(`${who}_${move}_${v}`, { w: 18, h: 34, pivot: [9, 34], outline: "k" },
      (c) => {
        const i = seq[c.frame], [top, mid] = at[i]
        c.stamp(`_${who}_${key}_${i}`, 0, 0); c.stamp(`_${who}_head_${v}${c.frame === blink ? "_blink" : ""}`, mid - 8, top)
      },
      ...seq.map((_, f) => frame({ ms: f === blink ? 130 : idle ? 250 : 110 })), bump("hybrid"))
}
sheet("traveler", ["tr_*", "mo_*"], { rows: "tag", pad: 1 })
