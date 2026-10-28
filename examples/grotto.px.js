// Living grotto: a big cavern with a pool and a waterfall, overgrown with glowing moss, ferns,
// hanging vines, bellflowers, mushrooms of four species and crystals. Lightbugs, moths, a snail
// and glowing fish move through it, spores drift up, and the pool reflects it all. Everything
// is lit by the life in it. Rock, cobbles and crystals are normal-mapped, so moving lights rake
// across them.
pal({
  k: "#07060c", K: "#2a2538", r: "#4a4262", R: "#6e6488", q: "#a294c4",   // rock ("daylight" albedo)
  c: "#3fd8c8", C: "#b4fff2", e: "#1c7f8c",                               // cyan fungus
  m: "#e05ad0", M: "#ffb0f4", E: "#8a2a8a",                               // magenta fungus
  t: "#38e0a0", T: "#c0ffe0", n: "#1a8a5a",                               // glow moss / green fungus
  u: "#5aa0ff", U: "#d8ecff", j: "#2a5aa0",                               // lantern mushrooms
  f: "#b4bcd4", F: "#7a84a4",                                             // stems
  g: "#4f8a50", G: "#7ab868", l: "#3a7a5a", L: "#62a878", v: "#5a8a52",   // grass, ferns, vines
  o: "#ffb050", O: "#fff0b8",                                             // berries, fish
  z: "#a070ff", Z: "#e8d8ff",                                             // bellflowers
  x: "#8a6ad0", X: "#e0d4ff",                                             // crystals
  y: "#9ccf3a", Y: "#f4ffb0",                                             // lightbugs
  p: "#d8ccf0", P: "#6a5a8a",                                             // moths
  a: "#ff9a3a", A: "#ffe0a0", h: "#a89a88",                               // snail
  w: "#4a7aa8", W: "#a8d8ff",                                             // water
  s: "#a8fff0", i: "#6a7898", b: "#8fd0ff",                               // spores, silk, glowworm beads
})

const W = 320, H = 180, FRAMES = 32, FPS = 8, TAU = Math.PI * 2;
const loop = { frames: FRAMES, fps: FPS };
const wave = (c, n = 1, off = 0) => Math.sin((c.phase * n + off) * TAU);   // seamless over the loop

// ------------------------------------------------------------------ terrain outlines
const ceil = [0, 20, 20, 28, 44, 18, 70, 30, 96, 22, 120, 36, 146, 24, 170, 32, 196, 20, 222, 30, 250, 22, 276, 34, 300, 24, 320, 30];
const floor = [0, 118, 24, 114, 52, 120, 76, 116, 100, 128, 112, 146, 120, 162, 136, 172, 180, 175, 200, 168, 214, 146, 228, 130, 246, 122, 268, 126, 290, 116, 320, 112];
const ledgeTop = [236, 74, 300, 70, 320, 72], ledgeUnder = [244, 84, 270, 90, 300, 86, 320, 84];
const POOL = 150;                                                    // water surface row
const ceilY = profile(ceil), ground = profile(floor), ledge = profile(ledgeTop), underLedge = profile(ledgeUnder);
const inPool = (x, y) => y >= POOL && y < ground(x) && x > 100 && x < 220;

// ------------------------------------------------------------------ rock parts (normal-mapped)
// the cave kit: stones and lumps by its builders, in this file's keys; mushroom caps and a shelf fungus
// (cave._bracket) in the glow cave's colors, the caps taken with our stems' (a swap on another file's
// base: its f and F to ours)
include("../lib/nature/cave.px.js", { as: "cave" });
[[3, 2], [4, 3], [5, 3], [6, 4], [7, 4], [4, 2]].forEach(([rx, ry], i) => cave.stone("_stone" + i, rx, ry));
[[4, 2], [6, 3], [3, 2], [8, 3]].forEach(([rx, ry], i) => cave.lump("_lump" + i, rx, ry));
for (const n of ["_cap_big", "_cap_mid", "_cap_tiny"]) sprite(n, { base: "cave." + n, swap: { f: "f", F: "F" } });

// Crystal shards: hand-painted facets (left face 4, front 5, right face 6, tip 8).
const shard = (h) => [".X.", ...Array(h - 1).fill("xXx")].join("\n");
const shardN = (h) => [".8.", "7" + "8" + "9", ...Array(h - 2).fill("456")].join("\n");
for (const h of [5, 8, 11]) sprite("_shard" + h, shard(h), normals(0, 0, shardN(h)));
sprite("crystals", { w: 12, h: 12 },
  stamp("_shard5", 0, 7), stamp("_shard11", 3, 1), stamp("_shard8", 6, 4), stamp("_shard5", 9, 7),
  lamp(5, 6, { r: 34, color: "#b090ff", power: 0.55, z: 8 }))

// ------------------------------------------------------------------ vegetation parts
sprite("_moss0", ".t.\ntTt"); sprite("_moss1", "t.tt\nTttT"); sprite("_moss2", "..t..\nttTtt");
sprite("_tuft0", "g..g\n.gG."); sprite("_tuft1", ".G.\ngGg"); sprite("_tuft2", "g.G.g\n.ggg.");

// The cave kit's mushroom caps, in clusters of three colours.
const tints = { c: [{}, "#5cf0e0"], m: [{ c: "m", C: "M", e: "E" }, "#ff7ae8"], t: [{ c: "t", C: "T", e: "n" }, "#60ffb0"] };
const shapes = {
  a: [["_cap_big", 4, 1], ["_cap_mid", 0, 3], ["_cap_tiny", 11, 5], 7, 2],
  b: [["_cap_mid", 0, 3], ["_cap_tiny", 5, 5], ["_cap_mid", 8, 2], 10, 3],
};
for (const [id, [p1, p2, p3, lx, ly]] of Object.entries(shapes))
  for (const [tint, [swap, light]] of Object.entries(tints))
    anim(`fungus_${id}_${tint}`, { w: 14, h: 8, ...loop, pivot: [7, 7], height: 0.1 },
      ...[p1, p2, p3].map(([n, x, y]) => stamp(n, x, y, { swap })),
      (c) => {
        const k = wave(c);
        if (k < -0.4) c.recolor({ C: "c", M: "m", T: "t" });            // spots fade at the dim end
        c.lamp(lx, ly, { r: 30 + 4 * k, color: light, power: 0.85 + 0.2 * k, z: 6 });
      });

// Tall lantern mushrooms: the stem bends a little, the cap breathes.
for (const h of [12, 16, 22])
  anim("lantern" + h, { w: 9, h, ...loop, pivot: [4, h - 1], height: h / 40 }, (c) => {
    const s = Math.round(wave(c) * 1.2), k = wave(c, 1, 0.3);
    c.line(4, h - 1, 4 + s, 4, "f");
    c.vline(4, h - 3, 3, "F");
    c.grid(1 + s, 0, "..uUu..\n.uUuuu.\nuuuUuuu\njjjjjjj");
    if (k > 0.5) c.recolor({ u: "U" }, [1 + s, 0, 7, 2]);
    c.lamp(4 + s, 2, { r: 42 + 6 * k, color: "#7ab0ff", power: 0.85 + 0.15 * k, z: 8 });
  });

// Ferns sway; the further up the frond, the more it moves.
anim("fern", { w: 11, h: 10, ...loop, pivot: [5, 9], height: 0.3 }, (c) => {
  const sway = wave(c) * 1.6;
  for (let i = 0; i <= 8; i++) {
    const y = 9 - i, x = 5 + Math.round(sway * (i / 8) ** 2);
    c.px(x, y, "l");
    if (i >= 2 && i % 2 === 0)
      for (let k = 1; k <= Math.max(1, 4 - i / 3); k++) {
        c.px(x - k, y - Math.floor(k / 2), k === 1 ? "l" : "L");
        c.px(x + k, y - Math.floor(k / 2), k === 1 ? "l" : "L");
      }
  }
});

// Bellflowers: a curled stem with a glowing bell that slowly pulses.
anim("bell", { w: 6, h: 9, ...loop, pivot: [2, 8], height: 0.2 }, (c) => {
  c.vline(1, 2, 7, "l"); c.px(2, 1, "l"); c.px(3, 1, "l"); c.px(0, 6, "L"); c.px(2, 5, "L");
  c.grid(3, 2, wave(c, 2) > 0 ? "ZZz\nz.z" : "zZz\nz.z");
});

// Hanging vines: swing more toward the tip; berries glow, the last one carries a lamp.
for (const len of [14, 20, 26, 34])
  anim("vine" + len, { w: 9, h: len + 2, ...loop }, (c) => {
    let x = 4;
    for (let y = 0; y <= len; y++) {
      x = 4 + Math.round(Math.sin(c.phase * TAU + y * 0.22) * 2 * (y / len));
      c.px(x, y, "v");
      if (y % 3 === 1) c.px(x + (y % 6 === 1 ? 1 : -1), y, y % 12 === 7 ? "t" : "L");
      if (y > 4 && y % 9 === 5) c.px(x - 1, y, "o");
    }
    c.grid(x - 1, len, "oOo\n.o.");
    c.lamp(x, len + 1, { r: 24, color: "#ffb060", power: 0.6 + 0.1 * wave(c, 2), z: 6 });
  });

// The centrepiece: a giant lantern mushroom. Thick curved stem, a wide spotted cap that sways
// slowly, glowing gills and a big soft lamp.
anim("giant", { w: 35, h: 56, ...loop, pivot: [17, 55], height: 1.4 }, (c) => {
  const s = wave(c) * 1.5, k = wave(c, 1, 0.25);
  for (let y = 10; y < 56; y++) {
    const t = (56 - y) / 46, x = Math.round(17 + s * t * t + 3 * Math.sin(t * 2.2));
    const fw = y > 49 ? 2 + Math.floor((y - 49) / 2) : 0;                // flared foot
    c.hline(x - 2 - fw, y, 5 + 2 * fw, "f"); c.hline(x + 1 + fw, y, 2, "F");
    if (y % 7 === 3) c.px(x - 1, y, "F");                                 // stem fibres
  }
  const cx = Math.round(17 + s + 3 * Math.sin(2.2));
  c.ellipse(cx, 8, 16, 7, "u"); c.rect(0, 9, 35, 7, "_");
  c.hline(cx - 15, 9, 31, "j"); c.hline(cx - 13, 10, 27, "j");
  for (const [dx, dy] of [[-9, 4], [-3, 2], [4, 3], [10, 5], [-6, 7], [7, 7], [0, 6]]) c.px(cx + dx, dy, "U");
  if (k > 0.3) c.recolor({ u: "U" }, [cx - 6, 1, 12, 3]);
  for (let i = 0; i < 4; i++) {                                         // glowing drips under the cap
    const d = Math.round(((c.phase * 2 + i * 0.25) % 1) * 14);
    if (d < 12) c.px(cx - 12 + i * 8, 11 + d, d < 6 ? "U" : "u");
  }
  c.lamp(cx, 9, { r: 86 + 8 * k, color: "#86bcff", power: 1 + 0.12 * k, z: 14 });
});

// Snail with a glowing shell.
sprite("_snail", { pivot: [3, 3], height: 0.03 }, "..aa...\n.aAAa.h\n.aAaa.h\nhhhhhhh");

// ------------------------------------------------------------------ placement lists
const fungi = [["fungus_a_c", 30], ["fungus_b_m", 50], ["fungus_a_t", 92], ["fungus_b_c", 222], ["fungus_a_m", 262], ["fungus_b_t", 304]];
const lanterns = [[8, 16], [240, 22], [292, 12]];
const ferns = [14, 40, 58, 100, 216, 232, 254, 274, 296, 312];
const ledgeFerns = [258, 288, 306];
const bells = [22, 46, 82, 236, 284];
const vines = [[36, 26], [108, 34], [160, 20], [182, 26]];
const ledgeVines = [[256, 20], [284, 26], [302, 14]];
const glowworms = [[[56, 6], [60, 11], [66, 7]], [[128, 8], [133, 13], [138, 6], [142, 10]], [[222, 6], [226, 12], [231, 5]]];
const bugs = Array.from({ length: 11 }, (_, i) => {
  const r = rng(40 + i);
  return [24 + i * 26 + r() * 10, 48 + r() * 56, 10 + r() * 24, 6 + r() * 12, 1 + Math.floor(r() * 2), 1 + Math.floor(r() * 2), r()];
});
const bugAt = ([cx, cy, ax, ay, fx, fy, p], t) =>
  [Math.round(cx + ax * Math.sin((fx * t + p) * TAU)), Math.round(cy + ay * Math.sin((fy * t + p * 2) * TAU) + 1.5 * Math.sin((3 * t + p) * TAU))];
const fishAt = (i, t) => [Math.round(156 + 40 * Math.sin((t + i * 0.5) * TAU)), Math.round(162 + 3 * Math.sin((2 * t + i * 0.3) * TAU))];
const sporeSources = [[37, 112], [57, 114], [99, 121], [229, 125], [269, 120], [311, 107]];

// ------------------------------------------------------------------ the grotto
// what stands on the floor (world.ground: stamp(name, x, "ground") stands one there), the ledge's top
// and the island's (pxl check reads the feet of what has a height against the nearest)
const island = [140, 152, 147, 145, 158, 144, 166, 147, 172, 154];
anim("grotto", { w: W, h: H, ...loop, world: { ground: [floor, ledgeTop, island] } },
  layer("backwall", { wall: true }, rect(0, 0, W, H, "K"),
    scatter("_stone*", -8, -8, W + 16, H + 16, 620, { rflip: "xy", rswap: [{}, {}, { r: "R" }], even: true, seed: 7 })),

  layer("water", rect(100, POOL, 120, 30, "w")),

  layer("rock", { solid: true },
    poly([0, 0, ...ceil, W, 0], "R"),
    poly([0, H, ...floor, W, H], "R"),
    poly([236, 74, 300, 70, 320, 72, 320, 84, 300, 86, 270, 90, 244, 84], "R"),                   // overhang
    poly([66, 26, 90, 24, 84, 60, 80, 90, 86, 118, 64, 118, 70, 90, 72, 60], "R"),                 // column
    poly([136, 176, 140, 152, 147, 145, 158, 144, 166, 147, 172, 154, 176, 176], "R"),            // island
    ...[[44, 12, 4], [96, 16, 5], [120, 26, 5], [150, 12, 3], [170, 18, 4], [250, 14, 4], [276, 20, 5]]
      .map(([x, len, w]) => poly([x - w, ceilY(x) - 2, x + w, ceilY(x) - 2, x, ceilY(x) + len], "R")),
    ...[[18, 10, 4], [108, 9, 3], [248, 8, 3], [282, 6, 3]]
      .map(([x, len, w]) => poly([x - w, ground(x) + 2, x + w, ground(x) + 2, x, ground(x) - len], "R")),
    poly([200, ceilY(204) - 1, 207, ceilY(204) - 1, 205, ceilY(204) + 4, 202, ceilY(204) + 4], "_"),  // waterfall crack
    (c) => { for (let y = 1; y < H; y++) for (let x = 0; x < W; x++) if (c.is(x, y, "R") && c.is(x, y - 1, ".")) c.px(x, y, "q"); },
    bump("bevel", { w: 3 }),
    scatter("_lump*", 0, 0, W, H, 220, { on: "R", clip: true, rflip: "xy", even: true, seed: 3 })),

  // Moss and grass carpet every upward-facing rock lip.
  layer("flora",
    scatter("_moss*", 0, 0, W, POOL, 300, { on: "q", below: true, rflip: "x", even: true, seed: 5 }),
    scatter("_tuft*", 0, 0, W, POOL, 160, { on: "q", below: true, rflip: "x", even: true, seed: 6 })),

  layer("life",
    ...ferns.map((x) => stamp("fern", x, "ground", { rdelay: true, rflip: "x" })),
    ...ledgeFerns.map((x) => stamp("fern", x, ledge(x), { rdelay: true, rflip: "x" })),
    ...bells.map((x) => stamp("bell", x, "ground", { rdelay: true, rflip: "x" })),
    ...lanterns.map(([x, h]) => stamp("lantern" + h, x, "ground", { rdelay: true })),
    stamp("lantern12", 266, ledge(266), { rdelay: true }),
    ...fungi.map(([n, x]) => stamp(n, x, "ground", { rdelay: true })),
    stamp("fungus_b_c", 287, ledge(287), { rdelay: true }),
    stamp("giant", 157, 144, { rdelay: true }),
    stamp("fern", 165, 145, { rdelay: true }), stamp("bell", 148, 145, { rdelay: true }),
    stamp("crystals", 222, ground(228) - 11),
    stamp("crystals", 144, ceilY(150) - 1, { flip: "y" }),
    ...vines.map(([x, len]) => stamp("vine" + len, x - 4, ceilY(x) - 1, { rdelay: true })),
    ...ledgeVines.map(([x, len]) => stamp("vine" + len, x - 4, underLedge(x) - 1, { rdelay: true })),
    stamp("cave._bracket", 80, 64), stamp("cave._bracket", 79, 84), stamp("cave._bracket", 81, 100),
    (c) => {
      c.lamp(84, 84, { r: 26, color: "#5cf0e0", power: 0.6 + 0.15 * wave(c, 2), z: 5 });

      // Glowworm colonies: silk threads, beads that twinkle in turn, one lamp per colony.
      for (const colony of glowworms) {
        for (const [x, len] of colony) {
          const top = ceilY(x);
          c.vline(x, top, len, "i");
          c.px(x, top + len, (c.frame + x) % 7 === 0 ? "C" : "b");
        }
        const mx = Math.round(colony.reduce((a, [x]) => a + x, 0) / colony.length);
        c.lamp(mx, ceilY(mx) + 9, { r: 30, color: "#7ab8ff", power: 0.6, z: 10 });
      }

      // Waterfall from the crack into the pool: falling streaks, foam and spreading ripples.
      const top = ceilY(204) + 4;
      for (let y = top; y < POOL; y++)
        for (let x = 202; x <= 206; x++) {
          // Vertical streaks per column, each with its own offset, scrolling down 6 px a frame.
          const k = (((y - c.frame * 6 + [0, 15, 27, 9, 33][x - 202]) % 16) + 16) % 16, edge = x === 202 || x === 206;
          c.px(x, y, k < 3 && !edge ? "W" : edge && k > 9 ? "." : "w");
        }
      c.grid(199, POOL - 2, c.frame % 2 ? ".W.w.W.w.\nWwWWWWwWW" : "W.w.W.w.W\nwWWwWWWwW");
      for (let k = 0; k < 3; k++) {
        const r = (c.frame * 2 + k * 11) % 32 + 5;
        if (r < 30) for (const sx of [204 - r, 204 + r]) if (inPool(sx, POOL)) c.px(sx, POOL, "W");
      }

      // Glowing lily pads drift on the pool.
      for (const [x0, a, o] of [[122, 4, 0], [186, 5, 0.4], [198, 3, 0.7]]) {
        const x = Math.round(x0 + a * Math.sin((c.phase + o) * TAU));
        c.grid(x, POOL - 1, ".tTt.\nlttTtl");
      }

      // The snail crawls back and forth along the left terrace.
      const sx = Math.round(4 + 14 * (0.5 - 0.5 * Math.cos(c.phase * TAU))), left = Math.sin(c.phase * TAU) < 0;
      c.stamp("_snail", sx + 3, "ground", left ? {} : { flip: "x" });
      c.lamp(sx + 3, ground(sx + 3) - 3, { r: 16, color: "#ffb060", power: 0.45, z: 4 });

      // Fish light the pool from below the surface (drawn after the reflection).
      for (let i = 0; i < 2; i++) {
        const [fx, fy] = fishAt(i, c.phase);
        c.lamp(fx, fy, { r: 20, color: "#ffc070", power: 0.5, z: 3 });
      }
    }),

  // Moths circle the big lantern, wings beating every frame.
  (c) => {
    for (let i = 0; i < 2; i++) {
      const t = c.phase * (i ? -1 : 1) + i * 0.4;
      const x = Math.round(240 + 11 * Math.cos(t * TAU * 2) + 2 * Math.sin(t * TAU * 5));
      const y = Math.round(104 + 6 * Math.sin(t * TAU * 2) + 2 * Math.cos(t * TAU * 3));
      c.grid(x - 1, y - 1, (c.frame + i) % 2 ? "p.p\n.P." : "...\npPp");
    }
    // Lightbugs with fading trails and flickering lamps.
    bugs.forEach((b, i) => {
      const [x, y] = bugAt(b, c.phase), [px, py] = bugAt(b, c.phase - 1 / FRAMES);
      if (px !== x || py !== y) c.px(px, py, "y");
      c.px(x, y, "Y");
      c.lamp(x, y, { r: 14, color: "#d8ff90", power: 0.5 + 0.2 * Math.sin((5 * c.phase + i * 0.37) * TAU), z: 4 });
    });
    // Spores drift up from the fungus and fade out.
    sporeSources.forEach(([ox, oy], s) => {
      for (let k = 0; k < 4; k++) {
        const r = rng(s * 10 + k), t = (c.phase + r()) % 1;
        if (t > 0.85) continue;
        const x = Math.round(ox + (r() - 0.5) * 8 + 4 * Math.sin((t * 2 + r()) * TAU) + 6 * t), y = Math.round(oy - 4 - t * 46);
        c.px(x, y, t < 0.6 ? "s" : "t");
      }
    });
  },

  lighting({ cell: 2, smooth: true, ambient: 0.06, ambientColor: "#5048a0", block: 0.45, emit: "cCemMEtTnuUjoOzZyYaAsb" }),

  // Reflection: the lit cave above, mirrored into the pool with a gentle wobble.
  (c) => {
    const hex = (v) => "#" + (v >>> 0).toString(16).padStart(8, "0");
    const mix = (a, b, t) => {
      const ch = (v, s) => (v >>> s) & 255, m = (s) => Math.round(ch(a, s) * (1 - t) + ch(b, s) * t);
      return ((m(24) << 24) | (m(16) << 16) | (m(8) << 8) | 255) >>> 0;
    };
    for (let y = POOL + 1; y < H; y++)
      for (let x = 101; x < 220; x++) {
        if (!inPool(x, y)) continue;
        const d = y - POOL, sx = x + Math.round(Math.sin(y * 0.7 + c.phase * TAU * 2) * (d > 2 ? 1 : 0));
        c.px(x, y, hex(mix(c.get(x, y), c.get(sx, POOL - d), Math.max(0.25, 0.7 - d * 0.02))));
      }
    // Glints run along the surface.
    for (let x = 101; x < 220; x++)
      if (inPool(x, POOL + 1) && (x * 7 + c.frame * 3) % 13 < 2) c.px(x, POOL, hex(mix(c.get(x, POOL), 0xa8d8ffff, 0.5)));
    for (let i = 0; i < 2; i++) {
      const [fx, fy] = fishAt(i, c.phase), dir = Math.cos((c.phase + i * 0.5) * TAU) > 0 ? 1 : -1;
      c.px(fx, fy, "O"); c.px(fx - dir, fy, "o"); c.px(fx - 2 * dir, fy + (c.frame % 2 ? 1 : -1), "o");
    }
  },

  glow("cCmMtTuU", { r: 7, strength: 0.32 }),
  glow("zZoO", { r: 5, strength: 0.4 }),
  glow("Ys", { r: 4, strength: 0.5 }),
  glow("bA", { r: 3, strength: 0.4 }))
