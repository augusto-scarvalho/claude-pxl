// The Turning Light: a lighthouse on a rocky headland on a stormy night.
// One loop = one full turn of the lamp (40 frames at 80 ms). Every moving part is periodic in N:
// the beam angle, the rain (each drop wraps the picture 1x in x and 2x in y), the swell and spray,
// the gulls, the oilskin's flap and the lantern flicker.
pal({
  a: "#070b16", b: "#0c1426", c: "#131e35", d: "#1c2c4a", e: "#2a3d60", f: "#3d5680",   // storm sky
  S: "#0a1b2b", o: "#12304a", O: "#1b4560", V: "#2b6080", U: "#5a93ad",                   // sea
  W: "#eef6f8", w: "#aecddb",                                                             // foam
  r: "#262733", R: "#4c4e5e", Q: "#666879", q: "#7f8193", x: "#a2a4b4",                   // rock
  n: "#6e6d6c", N: "#b5b1a6", M: "#e6e0cf",                                               // tower
  z: "#5a1a1e", Z: "#a8302c",                                                             // red band
  k: "#15171f", K: "#2a2e3a",                                                             // iron
  L: "#fffbe0", y: "#ffd45c",                                                             // lamp glass
  J: "#f4c430", j: "#b8871c", h: "#ffe680",                                               // oilskin
  p: "#e0a77e", u: "#a8694a",                                                             // skin
  D: "#4a5063", B: "#2a2019",                                                             // trousers, boots
  G: "#f4f6fa", g: "#aab3c4",                                                             // gulls
  i: "#6f8ab4", I: "#d6e6ff",                                                             // rain, rain in the beam
  H: "#fff6c4", F: "#ffe89a", E: "#c9b56e",                                               // beam: core, mid, faint
})

const W = 160, H = 120, N = 40, TAU = Math.PI * 2;
const LAMP = [118, 30];                                  // the lamp's middle, inside the lantern room
const CLIFF = [60,104, 66,100, 72,95, 80,90, 92,84, 100,80, 112,78, 124,78, 136,80, 150,79, 160,80];
const BEAM = { r: 150, half: 0.035, grow: 0.0011 };       // reach, half-width at the lamp (rad), widening per px
const beamAngle = (f) => TAU * f / N;

// Is pixel (x, y) in the beam at angle th? Returns 0..1, brightest on the axis near the lamp.
const beamLevel = (x, y, th) => {
  const dx = x + 0.5 - LAMP[0], dy = y + 0.5 - LAMP[1];
  const r = Math.hypot(dx, dy);
  if (r > BEAM.r) return 0;
  const d = Math.atan2(Math.sin(Math.atan2(dy, dx) - th), Math.cos(Math.atan2(dy, dx) - th));
  const e = Math.abs(d) / (BEAM.half + BEAM.grow * r);
  return e >= 1 ? 0 : (1 - r / BEAM.r) * (1 - e * e);
};

// Tower edges at row y: a slight taper from 111..125 at the foot to 113..123 at the gallery.
const towerEdges = (y) => { const t = (79 - y) / 39; return [111 + 2 * t, 125 - 2 * t]; };

const GULLS = [[24, 42, 0.0], [50, 24, 1.7], [64, 58, 3.1]];           // x, y, phase
const GULL_WINGS = [                                                    // 0 up, 1 level, 2 down
  [[0,0],[1,1],[2,1],[3,2],[4,1],[5,1],[6,0]],
  [[0,1],[1,1],[2,1],[3,2],[4,1],[5,1],[6,1]],
  [[0,2],[1,1],[2,1],[3,0],[4,1],[5,1],[6,2]],
];
const WING_AT = [0, 0, 1, 1, 2, 2, 1, 1];                               // wing state by frame % 8

const BREAKS = [[6, 70, 1], [26, 84, 2]];                              // impact frame, x, seed
const cliffY = (x) => {                                                 // the rock's top edge at column x
  for (let i = 0; i < CLIFF.length - 2; i += 2)
    if (x <= CLIFF[i + 2]) return CLIFF[i + 1] + (CLIFF[i + 3] - CLIFF[i + 1]) * (x - CLIFF[i]) / (CLIFF[i + 2] - CLIFF[i]);
  return CLIFF[CLIFF.length - 1];
};

const DROPS = Array.from({ length: 120 }, (_, i) =>
  [Math.floor(hash(i, 1) * W), Math.floor(hash(i, 2) * H), hash(i, 3) < 0.6]);

// The keeper, 10x18, feet on row 38 (the gallery floor is row 39).
const KEEPER = `
....JJ....
...JJJJ...
...JhJJ...
.JJJJJJJJ.
.jjjjjjjj.
...pkpk...
...pppp...
....pp....
..JJJJJJ..
pJJJJJJJ..
.JJJJJJJJ.
.JJJJJJJJ.
.JjJJJJjJ.
.JjJJjJJJ.
.JjJJjJJJ.
..JJJJJJ..
..DD..DD..
..BB..BB..`;

anim("turning_light", { w: W, h: H, frames: N, fps: 12.5 },
  // Sky: storm banks over a dark gradient. Unlit: the lamp doesn't reach this far.
  layer("sky", { unlit: true },
    (c) => {                                          // bands darken upward; each step dithers over two rows
      const keys = ["a", "b", "c", "d"];
      for (let y = 0; y < 79; y++) for (let x = 0; x < W; x++) {
        const s = (y / 78) * 3, i = Math.floor(s), f = Math.min(1, Math.max(0, (s - i - 0.4) * 5));
        c.px(x, y, keys[Math.min(3, i + (f > bayer(x, y) ? 1 : 0))]);
      }
    },
    poly([...Array.from({ length: 41 }, (_, i) => [i * 4, 14 + Math.round(4 * Math.sin(i * 0.45) + 2 * Math.sin(i * 0.2 + 1))]).flat(), 160, 0, 0, 0], "b"),
    poly([...Array.from({ length: 41 }, (_, i) => [i * 4, 30 + Math.round(3 * Math.sin(i * 0.35 + 2))]).flat(),
      ...Array.from({ length: 41 }, (_, i) => [160 - i * 4, 42 + Math.round(3 * Math.sin((40 - i) * 0.3))]).flat()], "c")),

  // Sea: a long swell of crests that slides one wavelength every 20 frames.
  layer("sea", { unlit: true },
    rect(0, 78, W, 42, "O"), rect(0, 78, W, 3, "o"), rect(0, 96, W, 24, "S"),
    (c) => {
      for (let y = 80; y < H; y += 3) for (let x = 0; x < W; x++) {
        const s = Math.sin(TAU * (x / 18 - 2 * c.frame / N) + y * 1.3);
        if (s > 0.9) c.px(x, y, s > 0.985 ? "U" : "V");
      }
    }),

  // Headland: a dark cliff face to the sea, a plateau the tower stands on.
  layer("headland", { solid: true },
    poly([...CLIFF, 160, 120, 60, 120], "R"),
    line(70, 104, 84, 96, "q"), line(80, 110, 92, 104, "r"), line(64, 116, 82, 112, "r"),
    line(92, 84, 100, 80, "x"), line(100, 80, 124, 78, "x"), line(124, 78, 136, 80, "q"), line(136, 80, 160, 80, "q"),
    line(96, 92, 128, 96, "r"), line(120, 104, 150, 100, "r"), line(104, 110, 140, 112, "r"), line(132, 92, 150, 88, "r"),
    poly([130, 110, 136, 104, 144, 105, 149, 111, 140, 116], "Q"), poly([106, 96, 112, 92, 117, 95, 112, 100], "q"),
    poly([62, 110, 68, 105, 74, 108, 70, 116], "q")),

  // Tower: whitewash, two red bands that follow the taper, a gallery and the lantern room.
  layer("tower", { solid: true },
    poly([111, 79, 125, 79, 123, 40, 113, 40], "N"),
    (c) => {
      for (const y0 of [52, 64]) for (let y = y0; y < y0 + 4; y++) {
        const [l, r] = towerEdges(y);
        c.hline(Math.round(l), y, Math.round(r) - Math.round(l), "Z");
      }
    },
    vline(113, 40, 39, "n"), vline(124, 40, 39, "n")),

  layer("gallery",
    rect(92, 39, 40, 2, "K"),                    // the gallery floor
    hline(92, 33, 21, "k"), hline(124, 33, 9, "k"),
    vline(92, 33, 6, "k"), vline(112, 33, 6, "k"), vline(124, 33, 6, "k"), vline(131, 33, 6, "k"),
    rect(113, 23, 11, 15, "y"),                  // lantern glass
    vline(113, 23, 15, "K"), vline(118, 23, 15, "K"), vline(123, 23, 15, "K"), rect(116, 27, 4, 6, "L"),
    poly([112, 23, 124, 23, 120, 18, 116, 18], "K"), hline(116, 17, 5, "k"), vline(118, 14, 3, "k")),

  // The keeper: grid for the body; the coat's hem streams to the right with the wind.
  layer("keeper",
    grid(99, 21, KEEPER),
    (c) => {
      const t = Math.round(2 + 2 * Math.sin(TAU * 2 * c.frame / N));
      c.poly([107, 31, 107 + t, 34, 107 + t, 37, 107, 38], "J");
      c.line(107, 33, 107 + t, 37, "j");
      // Lantern hangs from the left hand: a dark frame, a warm pane, a flame.
      c.rect(96, 31, 4, 5, "k"); c.rect(97, 32, 2, 3, "y");
      c.px(97, 33, c.frame % 4 < 2 ? "L" : "y"); c.px(98, 33, "L");
      c.px(98, 30, "k");
    }),

  // Lamp and the lantern's light, fixed in place: the lantern room, the gallery, the keeper.
  layer("lamp", (c) => {
    c.lamp(LAMP[0], LAMP[1], { r: 70, color: "#ffe2a0", power: 1.15 + 0.05 * Math.sin(TAU * 3 * c.frame / N), z: 6 });
    c.lamp(97, 33, { r: 14, color: "#ffd27a", power: 0.8 + 0.1 * Math.sin(TAU * 2 * c.frame / N), z: 3 });
  }),

  // Gulls: they flap hard and make little ground into the wind: a drift out and back each loop.
  layer("gulls", { unlit: true }, (c) => {
    for (const [x0, y0, ph] of GULLS) {
      const gx = x0 + Math.round(3 * Math.sin(TAU * c.frame / N + ph));
      const gy = y0 + Math.round(Math.sin(TAU * 2 * c.frame / N + ph));
      for (const [dx, dy] of GULL_WINGS[WING_AT[c.frame % 8]]) c.px(gx + dx, gy + dy, "G");
    }
  }),

  lighting({ cell: 2, smooth: true, ambient: 0.3, ambientColor: "#8fa3cf", block: 0.5, emit: "Ly" }),
  glow("L", { r: 10, strength: 0.45 }),
  glow("y", { r: 3, strength: 0.25 }),

  // The beam: a sector from the lamp, its rim dithered; its core is the brightest.
  layer("beam", { unlit: true }, (c) => {
    const th = beamAngle(c.frame);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const v = beamLevel(x, y, th);
      if (v <= 0) continue;
      const t = v + (bayer(x, y) - 0.5) * 0.3;
      if (t > 0.6) c.px(x, y, "H");
      else if (t > 0.4) c.px(x, y, "F");
      else if (t > 0.22) c.px(x, y, "E");
    }
  }),

  // Breaking waves: foam along the cliff foot and spray thrown up at each impact, in front of the beam.
  layer("breakers", { unlit: true }, (c) => {
    for (const [f0, x0, sd] of BREAKS) {
      const t = (c.frame - f0 + N) % N;
      if (t >= 16) continue;
      // Foam runs along the foot of the cliff, spreading and thinning; (x + frame) % 4 keeps the loop.
      for (let x = Math.round(x0 - 8 - t); x <= x0 + 6 + 2 * t; x++)
        if ((x + c.frame) % 4) c.px(x, Math.round(cliffY(x)) + 2, t < 6 ? "W" : "w");
      // Spray: a dithered plume that climbs in 5 frames, leans with the wind and thins out.
      const h = Math.round(24 * Math.min(1, t / 5) * Math.max(0, 1 - Math.max(0, t - 5) / 10));
      const base = Math.round(cliffY(x0)) - 1, lean = Math.round(t * 0.5);
      for (let y = base - h; y < base; y++) {
        const k = (y - (base - h)) / Math.max(1, h);                 // 0 at the top, 1 at the foot
        const half = 2 + 3 * k, mid = x0 + lean * (1 - k);
        for (let x = Math.round(mid - half); x <= Math.round(mid + half); x++)
          if (bayer(x, y) < 0.3 + 0.6 * k) c.px(x, y, k < 0.35 ? "W" : "w");
      }
      // Drops flung out of the plume and falling back into the sea.
      for (let k = 0; k < 8; k++) {
        const vx = (hash(sd, k) * 2 - 0.5) * 1.4;
        const vy = -(3.6 + 1.2 * hash(sd, k + 9));
        const X = Math.round(x0 + vx * t), Y = Math.round(base + vy * t + 0.4 * t * t);
        if (Y <= cliffY(X)) c.px(X, Y, "W");
      }
    }
  }),

  // Rain: each drop is a streak along the wind (4 px right, 6 px down a frame). Drops in the beam are bright.
  layer("rain", { unlit: true }, (c) => {
    const th = beamAngle(c.frame);
    for (const [x0, y0, long] of DROPS) {
      const x = (x0 + 4 * c.frame) % W, y = (y0 + 6 * c.frame) % H;
      const col = beamLevel(x, y, th) > 0 ? "I" : "i";
      if (long) c.line(x - 4, y - 6, x, y, col);
      else c.px(x, y, col);
    }
  }),
)
