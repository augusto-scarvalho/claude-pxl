// Glow cave: a dark cavern lit only by pulsing fungus, glowworm threads and drifting lightbugs.
// The rock is normal-mapped (domed cobbles on the back wall, bevelled rock, lumps), so the moving
// bugs rake light across the relief.
pal({
  k: "#07060c", K: "#2a2538", r: "#4a4262", R: "#6e6488", q: "#a294c4",   // rock at "daylight" brightness: lighting supplies the dark
  c: "#3fd8c8", C: "#b4fff2", e: "#1c7f8c",                               // cyan fungus
  m: "#e05ad0", M: "#ffb0f4", E: "#8a2a8a",                               // magenta fungus
  f: "#9aa6c2", F: "#6a7390",                                             // stems
  y: "#9ccf3a", Y: "#f4ffb0",                                             // lightbugs
  s: "#4a5878", b: "#8fd0ff", w: "#8aa0c0",                               // silk, glowworm bead, water
})

const W = 192, H = 108, FRAMES = 24, TAU = Math.PI * 2;

// Rock outlines as polylines, so props can sit exactly on them.
const ceil = [0, 12, 12, 16, 30, 10, 48, 18, 70, 12, 90, 22, 110, 14, 128, 20, 150, 12, 170, 18, 192, 14];
const floor = [0, 84, 18, 80, 40, 86, 64, 82, 84, 88, 110, 84, 132, 90, 150, 82, 172, 78, 192, 82];
const ceilY = profile(ceil), floorY = profile(floor);
// what the fungi stand on: the floor, and the right ledge's top (the scene's world.ground: stamp(name, x,
// "ground") stands one there, and pxl check reads the feet of what has a height against it)
const stands = [...floor.slice(0, 14), 146, 84, 150, 66, 156, 62, 186, 62, 192, 63];

// ------------------------------------------------------------------ rock parts (normal-mapped)
// the cave kit: stones and lumps by its builders, in this file's keys; mushroom caps (cave._cap_big,
// cave._cap_mid, cave._cap_tiny) and a shelf fungus (cave._bracket), in this cave's colors
include("../lib/nature/cave.px.js", { as: "cave" });
for (const [i, rx, ry] of [[1, 3, 2], [2, 4, 3], [3, 5, 3], [4, 6, 4]]) cave.stone("_stone" + i, rx, ry);
for (const [i, rx, ry] of [[1, 4, 2], [2, 6, 3], [3, 3, 2]]) cave.lump("_lump" + i, rx, ry);

// ------------------------------------------------------------------ fungus
// Clusters pulse: the lamp breathes and the bright spots fade at the dim end of the cycle.
const clusters = {
  a: [["cave._cap_big", 4, 1], ["cave._cap_mid", 0, 3], ["cave._cap_tiny", 11, 5], 7, 2],
  b: [["cave._cap_mid", 0, 3], ["cave._cap_tiny", 5, 5], ["cave._cap_mid", 8, 2], 10, 3],
};
for (const [id, [p1, p2, p3, lx, ly]] of Object.entries(clusters))
  for (const [tint, swap, light] of [["c", {}, "#5cf0e0"], ["m", { c: "m", C: "M", e: "E" }, "#ff7ae8"]])
    anim(`fungus_${id}_${tint}`, { w: 14, h: 8, frames: FRAMES, fps: 8, pivot: [7, 7], height: 0.1 },
      ...[p1, p2, p3].map(([n, x, y]) => stamp(n, x, y, { swap })),
      (c) => {
        const k = Math.sin(c.phase * TAU);
        if (k < -0.4) c.recolor(tint === "c" ? { C: "c" } : { M: "m" });
        c.lamp(lx, ly, { r: 30 + 4 * k, color: light, power: 0.85 + 0.2 * k, z: 6 });
      })

// ------------------------------------------------------------------ the cave
const stalactites = [[56, 14, 4], [76, 22, 5], [100, 10, 3], [120, 16, 4], [138, 9, 3], [182, 12, 4]];
const stalagmites = [[70, 10, 4], [118, 7, 3], [10, 8, 3]];
const fungi = [["fungus_a_c", 44], ["fungus_b_c", 90], ["fungus_a_m", 124], ["fungus_b_m", 60]];
// Glowworm colonies: thread [x, length]s plus one lamp each.
const glowworms = [
  [[50, 6], [54, 11], [61, 7], [65, 4]],
  [[98, 8], [104, 13], [108, 6], [113, 11]],
  [[131, 7], [135, 12], [140, 5]],
  [[160, 6], [165, 10], [171, 5], [176, 8]],
];
// Lightbugs: closed Lissajous loops (integer frequencies), so the animation repeats seamlessly.
const bugs = [
  [70, 50, 18, 8, 1, 2, 0.0], [110, 44, 22, 10, 1, 1, 0.3], [150, 40, 12, 9, 2, 1, 0.6],
  [40, 56, 10, 12, 1, 2, 0.5], [88, 64, 16, 6, 2, 1, 0.8], [168, 50, 10, 6, 1, 1, 0.15],
];
const bugAt = ([cx, cy, ax, ay, fx, fy, p], t) =>
  [Math.round(cx + ax * Math.sin((fx * t + p) * TAU)), Math.round(cy + ay * Math.sin((fy * t + p * 2) * TAU) + 1.5 * Math.sin((3 * t + p) * TAU))];

anim("cave", { w: W, h: H, frames: FRAMES, fps: 8, world: { ground: stands } },
  // Back wall: domed cobbles, invisible in the dark, picked out by passing lights.
  layer("backwall", { wall: true }, rect(0, 0, W, H, "K"),
    scatter("_stone*", -6, -6, W + 12, H + 12, 260, { rflip: "xy", rswap: [{}, {}, { r: "R" }], even: true, seed: 4 })),

  layer("rock", { solid: true },
    poly([0, 0, ...ceil, W, 0], "R"),
    poly([0, H, ...floor, W, H], "R"),
    poly([146, 84, 150, 66, 156, 62, 186, 62, 192, 63, 192, 84], "R"),                // right ledge
    poly([22, 12, 38, 12, 34, 40, 32, 56, 36, 82, 20, 82, 25, 56, 24, 40], "R"),      // column
    ...stalactites.map(([x, len, w]) => poly([x - w, ceilY(x) - 2, x + w, ceilY(x) - 2, x, ceilY(x) + len], "R")),
    ...stalagmites.map(([x, len, w]) => poly([x - w, floorY(x) + 2, x + w, floorY(x) + 2, x, floorY(x) - len], "R")),
    // Upward-facing edges get a lighter lip so the floor reads where props stand on it.
    (c) => { for (let y = 1; y < H; y++) for (let x = 0; x < W; x++) if (c.is(x, y, "R") && c.is(x, y - 1, ".")) c.px(x, y, "q"); },
    bump("bevel", { w: 3 }),
    scatter("_lump*", 0, 0, W, H, 70, { on: "R", clip: true, rflip: "xy", even: true, seed: 2 })),

  layer("life",
    ...fungi.map(([n, x]) => stamp(n, x + 7, "ground", { rdelay: true })),
    stamp("fungus_a_c", 169, "ground", { rdelay: true }), stamp("fungus_b_m", 181, "ground", { rdelay: true, flip: "x" }),
    (c) => {
      // Glowworm threads: silk from the ceiling, a glowing bead at the end; one lamp per colony.
      for (const colony of glowworms) {
        for (const [x, len] of colony) {
          const top = ceilY(x);
          c.vline(x, top, len, "s");
          c.px(x, top + len, (c.frame + x) % 7 === 0 ? "C" : "b");   // beads twinkle in turn
        }
        const mx = Math.round(colony.reduce((a, [x]) => a + x, 0) / colony.length);
        c.lamp(mx, ceilY(mx) + 9, { r: 28, color: "#7ab8ff", power: 0.65, z: 10 });
      }
      // Bracket fungus on the column, with a soft cyan lamp.
      c.stamp("cave._bracket", 33, 44); c.stamp("cave._bracket", 32, 61);
      c.lamp(36, 52, { r: 24, color: "#5cf0e0", power: 0.6 + 0.15 * Math.sin(c.phase * TAU * 2), z: 5 });

      // A drop falls from the long stalactite and splashes.
      const tip = ceilY(76) + 22, ground = floorY(76) - 1, f = c.frame;
      const y = tip + 1 + Math.round(0.35 * f * f);
      if (y < ground) c.vline(76, y, f > 3 ? 2 : 1, "w");
      else if (y < ground + 14) c.grid(74, ground - 1, f % 2 ? "w...w" : ".w.w.");
    }),

  // Lightbugs with a fading trail, each carrying a small lamp that flickers.
  (c) => {
    bugs.forEach((b, i) => {
      const [x, y] = bugAt(b, c.phase), [px, py] = bugAt(b, c.phase - 1 / FRAMES);
      if (px !== x || py !== y) c.px(px, py, "y");
      c.px(x, y, "Y");
      const flick = 0.75 + 0.25 * Math.sin((5 * c.phase + i * 0.37) * TAU);
      c.lamp(x, y, { r: 14, color: "#e4ffb0", power: flick, z: 4 });
    });
  },

  lighting({ cell: 2, smooth: true, ambient: 0.08, ambientColor: "#6050a0", block: 0.45, emit: "cCemMEyYb" }),
  glow("cCmM", { r: 6, strength: 0.35 }),
  glow("Y", { r: 4, strength: 0.6 }),
  glow("b", { r: 3, strength: 0.4 }))
