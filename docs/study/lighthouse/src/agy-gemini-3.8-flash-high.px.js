// Made for the model study (docs/model-study.md) by Antigravity, Gemini 3.8 Flash at high effort; its file as it left it.
// tempest_light.px.js — A lighthouse on a rocky headland on a stormy night.
// 160x120 animated pixel-art scene.
// Loop: 24 frames at 8 fps (3.0s seamless loop).

// Palette:
// Sky & clouds: k s S u U v
// Sea & foam:   d o O m M q Q w
// Basalt rock:  b r R e E
// White tower:  t T g G h H
// Red bands:    j J x X
// Ironwork:     i I
// Copper dome:  c C
// Oilskin:      y Y z Z
// Keeper skin:  f p
// Light:        l L W

pal({
  // Sky & dark storm atmosphere
  k: "#0c101d", // darkest storm sky / shadows
  s: "#161e33", // deep slate navy
  S: "#24304e", // dark storm cloud body
  u: "#38496e", // mid storm cloud
  U: "#506692", // cloud crest / vapor billow
  v: "#7892bd", // stormy scud / highlight edge

  // Ocean, waves & churning foam
  d: "#07101c", // deep ocean trough
  o: "#0e1f36", // ocean body
  O: "#193454", // swelling wave surge
  m: "#284e75", // translucent wave face
  M: "#417594", // churning foam base
  q: "#6eaab8", // aerated froth
  Q: "#aee0db", // bright wave crest
  w: "#f2fbfb", // pure white foam & spray droplets

  // Rocky headland (wet coastal basalt)
  b: "#090a10", // deepest rock cleft
  r: "#141724", // dark wet basalt
  R: "#22283d", // mid wet stone
  e: "#353e5b", // rock facet
  E: "#54638a", // wet rock highlight

  // Lighthouse white masonry (dark to light: t < T < g < G < h < H)
  t: "#1a2030", // shadow edge / mortar
  T: "#2d3750", // shadowed stone
  g: "#4c5b7c", // mid stone
  G: "#7b8fae", // light weathered stone
  h: "#b8c7db", // bright stone
  H: "#eaf0f8", // highlight stone / white paint

  // Lighthouse red masonry bands
  j: "#280e15", // deep red shadow
  J: "#541924", // dark red band
  x: "#8e2734", // mid vermilion red
  X: "#c63d4a", // bright red highlight

  // Ironwork & cupola dome
  i: "#0f1420", // black iron railing & lantern frame
  I: "#242f44", // iron highlight
  c: "#26444c", // dark verdigris copper dome
  C: "#436e78", // verdigris highlight

  // Keeper's yellow oilskin
  y: "#483408", // oilskin deep shadow
  Y: "#8c660f", // oilskin fold
  z: "#d99e16", // slicker yellow
  Z: "#fed638", // wet yellow highlight

  // Keeper flesh / leather
  f: "#2a201c", // boots / hat brim shadow
  p: "#7c5540", // weathered face / hands

  // Lamp & lantern light
  l: "#f39c12", // warm amber spill
  L: "#ffcf44", // radiant gold light
  W: "#fffde8", // incandescent white core
})

ramps(
  "ksSuUv",
  "doOmMqQw",
  "brReE",
  "tTgGhH",
  "jJxX",
  "iI",
  "cC",
  "yYzZ",
  "lLW"
)

const W = 160
const H = 120
const FRAMES = 24
const FPS = 8

// Lighthouse lamp coordinates (where the light comes from):
// Situated in the lantern room at the top of the tower.
const LAMP_X = 122
const LAMP_Y = 21

// ----------------------------------------------------------------
// 1. GULLS: Struggling against the storm gale
// ----------------------------------------------------------------
// Gull 1: mid-size gull struggling into the headwind
// Wing cycle: 6 frames (repeats 4 times in 24 frames)
anim("_gull1", { w: 11, h: 9, frames: 6, fps: FPS, pivot: [5, 4] }, (c) => {
  if (c.frame === 0) {
    c.grid(0, 0, `
      v.........v
      .v...u...v.
      ..v.uuu.v..
      ...vuwuv...
      ....www....
      .....w.....
    `)
  } else if (c.frame === 1) {
    c.grid(0, 1, `
      .v.......v.
      ..v..u..v..
      ...vuwuv...
      ....www....
      .....w.....
    `)
  } else if (c.frame === 2) {
    c.grid(0, 3, `
      ...vuwuv...
      vvvwwwwwvvv
      ....www....
      .....w.....
    `)
  } else if (c.frame === 3) {
    c.grid(0, 4, `
      ....www....
      ..vwwwwwv..
      .v..uuu..v.
      v....w....v
    `)
  } else if (c.frame === 4) {
    c.grid(0, 3, `
      ...vuwuv...
      ..vwwwwwv..
      .v...w...v.
    `)
  } else {
    c.grid(0, 1, `
      .v.......v.
      ..v.uuu.v..
      ...vuwuv...
      ....www....
      .....w.....
    `)
  }
})

// Gull 2: smaller, high in the sky
// 8-frame cycle (repeats 3 times in 24 frames)
anim("_gull2", { w: 7, h: 6, frames: 8, fps: FPS, pivot: [3, 3] }, (c) => {
  const f = c.frame % 4
  if (f === 0) {
    c.grid(0, 0, `
      v...v
      .vuv.
      ..w..
    `)
  } else if (f === 1) {
    c.grid(0, 1, `
      .vuv.
      vvwwv
      ..w..
    `)
  } else if (f === 2) {
    c.grid(0, 2, `
      ..w..
      .vuuv.
      v...v
    `)
  } else {
    c.grid(0, 1, `
      vvwwv
      ..w..
    `)
  }
})

// Gull 3: low over the breakers
// 6-frame cycle
anim("_gull3", { w: 8, h: 5, frames: 6, fps: FPS, pivot: [4, 2] }, (c) => {
  const f = c.frame % 3
  if (f === 0) {
    c.grid(0, 0, `
      v....v
      .vuuv.
      ..ww..
    `)
  } else if (f === 1) {
    c.grid(0, 1, `
      vvwwvv
      ..ww..
    `)
  } else {
    c.grid(0, 2, `
      ..ww..
      .vuuv.
      v....v
    `)
  }
})

// ----------------------------------------------------------------
// 2. KEEPER: Stands on gallery holding lantern, coat flapping
// ----------------------------------------------------------------
// 6-frame cycle (repeats 4 times in 24 frames)
// Gallery floor is at row 28, keeper stands at x=113.
// Right side catches light from tower lamp at (122, 21),
// left hand holds a storm lantern at (109, 23) casting warm W/L.
anim("_keeper", { w: 18, h: 14, frames: 6, fps: FPS, pivot: [5, 13], facing: "left" }, (c) => {
  const f = c.frame

  // Lantern position: subtle sway in the gale
  const lx = (f === 1 || f === 4) ? 0 : (f === 2) ? 1 : 0
  const ly = (f === 2 || f === 3) ? 5 : 4

  // Storm lantern: iron cap, glass pane with bright flame, base
  c.px(lx + 1, ly, "I")
  c.px(lx, ly + 1, "i")
  c.px(lx + 1, ly + 1, "W") // brilliant flame
  c.px(lx + 2, ly + 1, "L")
  c.px(lx, ly + 2, "i")
  c.px(lx + 1, ly + 2, "l")
  c.px(lx + 1, ly + 3, "i")

  // Arm holding lantern out over the iron railing:
  c.px(3, 4, "z")
  c.px(2, 4, "Z")
  c.px(1, 4, "p") // weathered hand gripping handle

  // Sou'wester hat: sloping brim forward, neck flap behind:
  c.px(4, 0, "Y")
  c.px(5, 0, "z")
  c.px(6, 0, "Z")
  c.px(3, 1, "Y")
  c.px(4, 1, "z")
  c.px(5, 1, "z")
  c.px(6, 1, "Z")
  c.px(7, 1, "Z") // right edge lit by lamp
  c.px(2, 2, "f") // brim front shadow
  c.px(3, 2, "z")
  c.px(4, 2, "z")
  c.px(5, 2, "Y")
  c.px(6, 2, "y")
  c.px(7, 2, "Z") // neck flap lit by lamp

  // Face in profile:
  c.px(3, 3, "p") // cheek
  c.px(4, 3, "f") // eye shadow
  c.px(3, 4, "h") // beard caught by lantern light

  // Yellow oilskin torso:
  c.rect(4, 3, 3, 5, "z")
  c.px(4, 3, "Z") // chest lit by lantern
  c.px(4, 4, "Z")
  c.px(5, 5, "Y")
  c.px(6, 3, "Z") // shoulder lit by tower lamp
  c.px(6, 4, "Z")

  // Animated flapping coat tails whipping to the right:
  if (f === 0) {
    c.rect(4, 8, 3, 3, "z")
    c.px(7, 7, "z"); c.px(8, 7, "Z"); c.px(9, 6, "Z"); c.px(10, 6, "Y")
    c.px(7, 8, "Y"); c.px(8, 8, "y"); c.px(9, 7, "y")
    c.px(7, 9, "z"); c.px(8, 9, "Y")
  } else if (f === 1) {
    c.rect(4, 8, 3, 3, "z")
    c.px(7, 6, "z"); c.px(8, 5, "z"); c.px(9, 5, "z"); c.px(10, 5, "Z")
    c.px(7, 7, "z"); c.px(8, 6, "Y"); c.px(9, 6, "y"); c.px(10, 6, "Z")
    c.px(7, 8, "Y"); c.px(8, 8, "y")
  } else if (f === 2) {
    c.rect(4, 8, 3, 3, "z")
    c.px(7, 6, "z"); c.px(8, 6, "Z"); c.px(9, 5, "Z"); c.px(10, 5, "Z")
    c.px(7, 7, "Y"); c.px(8, 7, "z"); c.px(9, 6, "y"); c.px(10, 6, "y")
    c.px(7, 8, "z"); c.px(8, 8, "Y"); c.px(9, 8, "y")
  } else if (f === 3) {
    c.rect(4, 8, 3, 3, "z")
    c.px(7, 7, "z"); c.px(8, 7, "Z"); c.px(9, 7, "Z")
    c.px(7, 8, "z"); c.px(8, 8, "z"); c.px(9, 8, "z"); c.px(10, 7, "Y")
    c.px(7, 9, "Y"); c.px(8, 9, "y"); c.px(9, 9, "y")
  } else if (f === 4) {
    c.rect(4, 8, 3, 3, "z")
    c.px(7, 8, "z"); c.px(8, 8, "Z"); c.px(9, 8, "Z")
    c.px(7, 9, "z"); c.px(8, 9, "z"); c.px(9, 9, "z"); c.px(10, 8, "y")
    c.px(7, 10, "Y"); c.px(8, 10, "y")
  } else {
    c.rect(4, 8, 3, 3, "z")
    c.px(7, 7, "z"); c.px(8, 6, "Z"); c.px(9, 6, "Z"); c.px(10, 5, "Z")
    c.px(7, 8, "z"); c.px(8, 7, "Y"); c.px(9, 7, "y")
    c.px(7, 9, "Y"); c.px(8, 8, "y")
  }

  // Seaman's boots planted on gallery deck:
  c.px(4, 11, "f"); c.px(4, 12, "f"); c.px(4, 13, "i")
  c.px(6, 11, "f"); c.px(6, 12, "f"); c.px(6, 13, "i")
})

// ----------------------------------------------------------------
// 3. LIGHTHOUSE TOWER & LANTERN ROOM SPRITE
// ----------------------------------------------------------------
sprite("lighthouse_tower", { w: 32, h: 60, pivot: [16, 59] }, (c) => {
  // Center is at x=16

  // A. Stone foundation plinth (rows 54 to 59):
  c.rect(5, 54, 22, 6, "T")
  c.rect(6, 54, 20, 5, "g")
  c.hline(6, 54, 20, "G")
  c.vline(5, 54, 6, "t")
  c.vline(26, 54, 6, "t")
  c.px(11, 56, "t"); c.px(17, 56, "t"); c.px(22, 56, "t")
  c.px(8, 58, "t"); c.px(14, 58, "t"); c.px(20, 58, "t")

  // B. Red Band 1 (rows 44 to 53):
  for (let y = 44; y < 54; y++) {
    const inset = Math.floor((54 - y) * 0.1)
    const x0 = 6 + inset, w = 20 - 2 * inset
    c.hline(x0, y, w, "x")
    c.px(x0, y, "j")
    c.px(x0 + 1, y, "J")
    c.px(x0 + 2, y, "x")
    c.hline(x0 + 3, y, 4, "X")
    c.px(x0 + w - 1, y, "J")
  }

  // C. White Band 1 (rows 35 to 43):
  for (let y = 35; y < 44; y++) {
    const inset = Math.floor((54 - y) * 0.15)
    const x0 = 6 + inset, w = 20 - 2 * inset
    c.hline(x0, y, w, "G")
    c.px(x0, y, "t")
    c.px(x0 + 1, y, "T")
    c.hline(x0 + 2, y, 5, "H")
    c.px(x0 + w - 1, y, "T")
  }
  // Arched window glowing warm amber:
  c.rect(14, 38, 3, 5, "t")
  c.px(15, 37, "t")
  c.rect(15, 38, 2, 4, "l")
  c.px(15, 39, "L")
  c.px(15, 40, "W")

  // D. Red Band 2 (rows 27 to 34):
  for (let y = 27; y < 35; y++) {
    const x0 = 7, w = 18
    c.hline(x0, y, w, "x")
    c.px(x0, y, "j")
    c.px(x0 + 1, y, "J")
    c.hline(x0 + 2, y, 4, "X")
    c.px(x0 + w - 1, y, "J")
  }

  // E. White Band 2 & Corbelled Cornice (rows 19 to 26):
  for (let y = 22; y < 27; y++) {
    c.hline(7, y, 18, "G")
    c.px(7, y, "t"); c.px(8, y, "T")
    c.hline(9, y, 5, "H")
    c.px(24, y, "T")
  }
  // Corbel brackets flaring outward:
  c.hline(5, 21, 22, "g")
  c.hline(6, 21, 6, "H")
  c.hline(4, 20, 24, "G")
  c.hline(5, 20, 6, "H")
  c.hline(3, 19, 26, "h")
  c.hline(4, 19, 8, "H")
  for (let bx = 5; bx <= 25; bx += 4) {
    c.px(bx, 20, "T")
    c.px(bx, 21, "t")
  }

  // F. Gallery Walkway & Railing (rows 14 to 18):
  c.hline(3, 18, 26, "i")
  c.hline(4, 18, 24, "I")
  c.hline(3, 14, 26, "i")
  c.hline(4, 14, 24, "I")
  c.hline(3, 16, 26, "i")
  for (let rx = 3; rx <= 28; rx += 4) {
    c.vline(rx, 14, 5, "i")
    c.px(rx, 15, "I")
  }

  // G. Lantern Room (rows 5 to 17):
  c.rect(8, 16, 16, 2, "i")
  c.hline(9, 16, 14, "I")
  c.rect(9, 6, 14, 10, "k")
  // Fresnel lens apparatus:
  c.rect(14, 8, 4, 6, "l")
  c.rect(15, 9, 2, 4, "L")
  c.px(16, 10, "W")
  c.vline(8, 6, 10, "i")
  c.vline(12, 6, 10, "i"); c.px(12, 7, "I")
  c.vline(16, 6, 10, "i"); c.px(16, 7, "I")
  c.vline(20, 6, 10, "i"); c.px(20, 7, "I")
  c.vline(23, 6, 10, "i")

  // H. Copper Dome / Cupola (rows 0 to 6):
  c.hline(7, 5, 18, "c")
  c.hline(8, 4, 16, "c")
  c.hline(9, 3, 14, "c")
  c.hline(11, 2, 10, "c")
  c.hline(13, 1, 6, "c")
  c.hline(9, 4, 5, "C")
  c.hline(11, 3, 4, "C")
  c.hline(12, 2, 3, "C")
  c.vline(16, 1, 5, "i")
  c.px(11, 3, "i"); c.px(20, 3, "i")
  c.rect(15, 0, 2, 2, "i")
  c.px(15, 0, "I")
  c.px(16, -1, "i")
  c.px(16, -2, "i") // lightning rod spire
})

// ----------------------------------------------------------------
// 4. ANIMATED WAVES & SURF BREAKING ON ROCKS
// ----------------------------------------------------------------
// Dynamic ocean breaker crashing against the coastal reef:
// - Frame 0..6: Swell rises, wave curl steepens and moves toward reef
// - Frame 7..11: IMPACT! Massive hydraulic explosion of boiling white foam
// - Frame 12..17: Towering spray plume (34px tall) caught by wind and blown rightward
// - Frame 18..23: Cascading waterfalls down the rock shelves and receding lacy foam
anim("_breaker", { w: 104, h: 48, frames: FRAMES, fps: FPS }, (c) => {
  const f = c.frame

  // Skerries / sea rocks inside the surf zone (x=46..76, y=28..47):
  // Rock 1 (outer jagged reef):
  c.poly([46, 46, 50, 34, 55, 33, 60, 37, 62, 46], "r")
  c.line(50, 34, 55, 33, "e")
  c.line(55, 33, 60, 37, "b")
  // Rock 2 (inner shelf):
  c.poly([64, 46, 68, 28, 74, 27, 80, 32, 84, 46], "r")
  c.line(68, 28, 74, 27, "e")
  c.line(74, 27, 80, 32, "b")

  // 1. INCOMING SWELL WITH ASYMMETRIC CURL (Frames 0 to 9):
  if (f <= 9) {
    const peakX = Math.round(10 + f * 5.6) // moves from 10 to 60
    const peakH = Math.round(4 + f * 2.3) // height rises from 4 to 25

    for (let x = 0; x < 74; x++) {
      let h = 0
      if (x < peakX) {
        // Back of wave: gentle slope rising from trough
        const t = (x - (peakX - 28)) / 28
        if (t > 0) h = Math.round(peakH * (t ** 1.8))
      } else {
        // Front face of wave: steep concave cliff of water curling forward!
        const t = (x - peakX) / 14
        if (t < 1.0) h = Math.round(peakH * (1.0 - t ** 0.7))
      }

      if (h > 1) {
        const yTop = 38 - h
        c.vline(x, yTop, h + 8, "O")
        c.vline(x, yTop + 2, h + 6, "o")

        // Translucent aqua face:
        if (x >= peakX - 4 && x <= peakX + 4) {
          c.px(x, yTop, "m")
          c.px(x, yTop - 1, "q")
        }

        // Overhanging curl lip tipping forward into white water:
        if (f >= 4 && x >= peakX - 2 && x <= peakX + 6) {
          c.px(x + 1, yTop - 1, "w")
          c.px(x + 2, yTop - 1, "Q")
        }
      }
    }
  }

  // 2. IMPACT & MASSIVE ORGANIC SPRAY ERUPTION (Frames 7 to 18):
  if (f >= 6 && f <= 19) {
    const age = (f - 6) / 13 // 0.0 to 1.0
    const plumeH = Math.round(34 * Math.sin(age * Math.PI))
    const windBlow = Math.round(age * 24) // blown hard rightward by storm gale!

    // A. Boiling impact foam at base:
    // Overlapping solid white billow puffs that fuse into one foaming body:
    const basePuffs = [
      [56, 36, 5], [62, 34, 6], [68, 35, 6], [74, 37, 5]
    ]
    for (const [px, py, pr] of basePuffs) {
      c.circ(px + Math.round(windBlow * 0.2), py, pr, "w")
    }
    // Subtle underside shading on base foam:
    for (const [px, py, pr] of basePuffs) {
      c.hline(px + Math.round(windBlow * 0.2) - pr + 1, py + pr - 1, pr * 2 - 2, "Q")
    }

    // B. Sweeping wind-blown eruption plume (smooth aerodynamic curve):
    if (plumeH > 4) {
      const steps = 8
      for (let s = 1; s <= steps; s++) {
        const t = s / steps
        // Parabolic trajectory under wind drag:
        const colX = 58 + Math.round(windBlow * (t ** 1.6))
        const colY = 36 - Math.round(plumeH * t * 0.85)
        const radius = Math.max(2, Math.round(5.5 * (1.05 - t * 0.4)))
        c.circ(colX, colY, radius, "w")
        if (s > 2) c.px(colX - radius + 1, colY + 1, "Q")
      }
    }

    // C. Billowing spray crest (wind-blown foam head):
    if (plumeH > 6) {
      const billowOffsets = [
        [0, 0, 4],
        [4, -1, 5],
        [8, -1, 4],
        [13, 1, 3]
      ]
      const headX = 58 + windBlow
      const headY = 36 - Math.round(plumeH * 0.88)
      for (const [dx, dy, r] of billowOffsets) {
        c.circ(headX + dx, headY + dy, r, "w")
        c.px(headX + dx, headY + dy + r, "Q")
      }

      // Wind-shredded aerosol droplets flying rightward:
      for (let j = 0; j < 36; j++) {
        const r2 = c.rng(j * 73 + f * 29)
        const fx = 60 + Math.round(r2() * 30) + windBlow
        const fy = 30 - Math.round(r2() * plumeH * 0.95)
        if (fx >= 0 && fx < 104 && fy >= 0 && fy < 48) {
          c.px(fx, fy, (r2() > 0.35) ? "w" : "Q")
          if (r2() > 0.65) c.px(fx + 1, fy, "q")
        }
      }
    }
  }

  // 3. CASCADING WATERFALLS DOWN ROCK SHELVES (Frames 12 to 23):
  if (f >= 11) {
    const fade = (24 - f) / 13
    // Water cascading down basalt steps:
    const cascades = [
      [52, 30, 8],
      [58, 28, 11],
      [66, 26, 14],
      [74, 28, 12],
      [82, 32, 8]
    ]
    for (const [cx, cy, clen] of cascades) {
      const r = c.rng(cx * 17 + f * 7)
      if (r() < fade) {
        c.vline(cx, cy, clen, "w")
        c.vline(cx + 1, cy + 1, clen - 2, "Q")
        c.px(cx, cy + clen, "q")
        c.px(cx + 1, cy + clen + 1, "M")
      }
    }
    // Churning foam pool on rocks:
    for (let rx = 50; rx < 86; rx += 4) {
      const r = c.rng(rx * 23 + f * 11)
      if (r() < fade) {
        c.hline(rx, 38 + Math.round(r() * 3), 3, "w")
        c.px(rx + 1, 39 + Math.round(r() * 3), "Q")
      }
    }
  }

  // 4. CHURNING BASE SURF LACE & BACKWASH:
  for (let x = 36; x < 90; x += 3) {
    const r = c.rng(x * 11 + f * 3)
    const sy = 40 + Math.round(Math.sin((f / 24) * Math.PI * 2 + x * 0.22) * 2)
    c.hline(x, sy, 3, (r() > 0.35) ? "q" : "M")
    if (r() > 0.55) c.px(x + 1, sy - 1, "w")
  }
})

// ----------------------------------------------------------------
// 5. THE SCENE: tempest_light
// ----------------------------------------------------------------
scene("tempest_light", {
  w: W,
  h: H,
  bg: "k",
  // The lamp is the light: say where it comes from:
  // Originates from the lighthouse lantern room at (122, 21).
  world: { light: { at: [LAMP_X, LAMP_Y] } }
},

  // ------------------------------------------------------------
  // LAYER 1: SKY & STORM CLOUDS
  // ------------------------------------------------------------
  layer("sky",
    // Atmospheric dark storm gradient:
    grad(0, 0, W, 70, "ksSuU", "v", 0.4),

    // Churning squall clouds drifting in the storm gale:
    (c) => {
      for (let cy = 4; cy < 62; cy += 9) {
        const drift = Math.round(c.phase * 22)
        for (let cx = -24; cx < W + 24; cx += 26) {
          const x = (cx + drift) % (W + 48) - 24
          const r = c.rng(cx * 17 + cy * 11)
          const ew = 22 + Math.round(r() * 18)
          const eh = 6 + Math.round(r() * 6)
          c.ellipse(x, cy, ew, eh, (r() > 0.45) ? "S" : "u")
          c.hline(x - (ew >> 2), cy - (eh >> 2), ew >> 1, "U")
          if (r() > 0.7) c.px(x, cy - (eh >> 2) - 1, "v")
        }
      }
    }
  ),

  // ------------------------------------------------------------
  // LAYER 2: OPEN SEA & SWELLS
  // ------------------------------------------------------------
  layer("ocean",
    // Base ocean gradient:
    grad(0, 66, 110, 54, "doOmM", "v", 0.45),
    hline(0, 66, 110, "o"), // horizon

    (c) => {
      // Realistic undulating ocean swells with perspective foreshortening:
      for (let row = 68; row < 120; row += 3) {
        const depth = (row - 66) / 54 // 0.0 near horizon, 1.0 near foreground
        const waveSpeed = 0.8 + depth * 1.5
        const waveShift = Math.round((c.phase * 24 * waveSpeed) % 40)
        const wavePeriod = 16 + Math.round(depth * 18)

        for (let wx = -20 + waveShift; wx < 100; wx += wavePeriod) {
          const r = c.rng(wx * 23 + row * 17)
          const crestLen = 8 + Math.round(depth * 12)
          const yOff = Math.round(Math.sin((wx / wavePeriod) * Math.PI) * (1 + depth * 1.5))
          const curY = row + yOff
          if (curY >= 67 && curY < 120) {
            const col = (depth > 0.6) ? (r() > 0.4 ? "q" : "M") : (r() > 0.5 ? "M" : "m")
            c.hline(wx, curY, crestLen, col)
            if (r() > 0.6) c.px(wx + (crestLen >> 1), curY - 1, (depth > 0.5) ? "Q" : "q")
          }
        }
      }

      // Foreground heavy surge rolling in from bottom-left:
      const fgPhase = (c.phase + 0.5) % 1.0
      const fgX = Math.round(fgPhase * 55)
      for (let dx = -18; dx < 22; dx++) {
        const x = fgX + dx
        if (x >= 0 && x < 65) {
          const cy = 113 - Math.round(4 * Math.cos((dx / 22) * (Math.PI / 2)))
          c.hline(x, cy, 1, "q")
          c.px(x, cy - 1, (Math.abs(dx) < 3) ? "w" : "Q")
        }
      }
    }
  ),

  // ------------------------------------------------------------
  // LAYER 3: RUGGED ROCKY HEADLAND & BASALT CLIFF
  // ------------------------------------------------------------
  layer("headland",
    // Promontory geometry with stepped crags:
    poly([
      104, 66,
      120, 65,
      142, 65,
      160, 66,
      160, 120,
      46, 120,
      48, 114,
      56, 112,
      62, 106,
      68, 106,
      72, 98,
      80, 97,
      86, 88,
      94, 87,
      98, 76,
      104, 76,
      104, 66
    ], "R"),

    (c) => {
      // Natural wet rock tones:
      c.poly([
        46, 120, 48, 114, 56, 112, 62, 106, 68, 106,
        72, 98, 80, 97, 86, 88, 94, 87, 98, 76, 104, 76, 104, 66,
        96, 72, 90, 82, 82, 94, 74, 102, 64, 110, 52, 118
      ], "r")

      // Basalt column joints and stepped horizontal ledges:
      const ledges = [
        [104, 66, 14, "e"],
        [98, 76, 16, "e"],
        [94, 87, 18, "e"],
        [80, 97, 22, "e"],
        [68, 106, 26, "e"],
        [56, 112, 30, "e"],
        [48, 115, 34, "b"]
      ]
      for (const [lx, ly, len, col] of ledges) {
        c.hline(lx, ly, len, col)
        c.hline(lx + 1, ly + 1, len - 2, "R")
        c.hline(lx, ly + 2, len, "b")
      }

      // Vertical basalt fractures:
      c.line(104, 66, 101, 76, "b")
      c.line(98, 76, 95, 87, "b")
      c.line(94, 87, 91, 97, "b")
      c.line(86, 88, 82, 104, "b")
      c.line(80, 97, 76, 110, "b")
      c.line(72, 98, 68, 114, "b")

      // Column fractures across the cliff mass:
      c.line(114, 67, 112, 82, "b"); c.line(112, 82, 110, 98, "b")
      c.line(126, 67, 124, 86, "b"); c.line(124, 86, 122, 104, "b")
      c.line(138, 67, 136, 88, "b"); c.line(136, 88, 134, 112, "b")
      c.line(148, 67, 146, 92, "b")

      // Staggered stepped ledges with wet stone gleams:
      const shelves = [
        [106, 78, 12], [122, 80, 14], [140, 79, 16],
        [100, 90, 14], [118, 92, 12], [134, 91, 18],
        [90, 102, 16], [110, 103, 14], [128, 104, 16],
        [78, 114, 20], [102, 115, 22], [128, 114, 24]
      ]
      for (const [sx, sy, slen] of shelves) {
        c.hline(sx, sy, slen, "b")
        c.hline(sx + 1, sy - 1, slen - 2, "e")
        c.px(sx + 2, sy - 1, "E")
      }

      // Wet rock glints on top surfaces:
      c.px(100, 75, "E"); c.px(101, 75, "E")
      c.px(96, 86, "E"); c.px(97, 86, "E")
      c.px(82, 96, "E"); c.px(83, 96, "E")
      c.px(70, 105, "E"); c.px(71, 105, "E")
      c.px(58, 111, "E")
      c.px(118, 77, "E"); c.px(130, 89, "E"); c.px(142, 101, "E")

      // Plateau ground under lighthouse:
      c.rect(106, 65, 54, 2, "r")
      c.hline(104, 65, 56, "R")
      c.hline(108, 65, 24, "e")
    }
  ),

  // ------------------------------------------------------------
  // LAYER 4: BREAKING WAVES & SPRAY ANIMATION
  // ------------------------------------------------------------
  // Positioned directly against the reef at (44..95, 74..120)
  layer("surf", { unlit: true },
    stamp("_breaker", 44, 74)
  ),

  // ------------------------------------------------------------
  // LAYER 5: LIGHTHOUSE TOWER & KEEPER
  // ------------------------------------------------------------
  layer("lighthouse",
    // Tower sits on plateau at x=122, base ground at y=66:
    stamp("lighthouse_tower", LAMP_X, 66),

    // Keeper stands on the gallery deck at y=28, x=113:
    stamp("_keeper", 113, 28)
  ),

  // ------------------------------------------------------------
  // LAYER 6: STRUGGLING GULLS
  // ------------------------------------------------------------
  layer("gulls",
    (c) => {
      const k = c.phase * Math.PI * 2
      // Gull 1: mid-sky, struggling forward against headwind gusts:
      const g1x = Math.round(48 + 4 * Math.sin(k) - 2 * Math.cos(2 * k))
      const g1y = Math.round(38 + 2.5 * Math.sin(2 * k))
      c.stamp("_gull1", g1x, g1y)

      // Gull 2: high in the storm sky near the sweeping beam:
      const g2x = Math.round(82 + 5 * Math.sin(k + 1.5))
      const g2y = Math.round(18 + 2 * Math.cos(k + 0.8))
      c.stamp("_gull2", g2x, g2y)

      // Gull 3: low skimming over the breakers:
      const g3x = Math.round(26 + 3 * Math.sin(k * 2))
      const g3y = Math.round(76 + 2 * Math.sin(k))
      c.stamp("_gull3", g3x, g3y)
    }
  ),

  // ------------------------------------------------------------
  // LAYER 7: THE SWEEPING LAMP BEAM (Volumetric 360-degree sweep)
  // ------------------------------------------------------------
  // The lamp beam rotates 360 degrees over 24 frames.
  // Origin: LAMP_X, LAMP_Y (122, 21).
  layer("lamp_beam_cone", { opacity: 0.35, blend: "screen" },
    (c) => {
      const f = c.frame
      const alpha = (f / 24) * Math.PI * 2
      const cosA = Math.cos(alpha)
      const sinA = Math.sin(alpha)

      // Quadrant 1: Beam sweeps out to the West (left edge, frames 22..4)
      if (cosA > 0.25) {
        const targetY = LAMP_Y + Math.round(LAMP_X * (0.35 * sinA + 0.05))
        const spread = Math.round(22 + 6 * cosA)
        const yTop = Math.max(-20, targetY - spread)
        const yBot = Math.min(H + 20, targetY + spread)

        c.poly([
          LAMP_X, LAMP_Y,
          0, yTop,
          0, yBot
        ], "L")

        const spreadCore = Math.round(spread * 0.45)
        c.poly([
          LAMP_X, LAMP_Y,
          0, targetY - spreadCore,
          0, targetY + spreadCore
        ], "W")
      }
      // Quadrant 2: Beam sweeps South toward camera and across the surf (frames 5..9)
      else if (sinA > 0.4) {
        const baseTargetX = LAMP_X - Math.round((H - LAMP_Y) * (cosA / Math.max(0.2, sinA)))
        const spreadX = 26

        c.poly([
          LAMP_X, LAMP_Y,
          Math.max(-20, baseTargetX - spreadX), H,
          Math.min(W + 20, baseTargetX + spreadX), H
        ], "L")

        c.poly([
          LAMP_X, LAMP_Y,
          Math.max(-20, baseTargetX - 12), H,
          Math.min(W + 20, baseTargetX + 12), H
        ], "W")
      }
      // Quadrant 3: Beam sweeps East into the cliff headland (frames 10..13)
      else if (cosA < -0.3 && sinA < 0.2 && sinA > -0.6) {
        const targetY = LAMP_Y - Math.round((W - LAMP_X) * 0.2)
        const spread = 20
        c.poly([
          LAMP_X, LAMP_Y,
          W, targetY - spread,
          W, targetY + spread
        ], "L")
      }
    }
  ),

  // Retouching the lamp core and lens flare directly:
  layer("lamp_flare",
    (c) => {
      const f = c.frame
      const alpha = (f / 24) * Math.PI * 2
      const sinA = Math.sin(alpha)

      // Radiant lens flash when beam sweeps toward camera (sinA > 0.7, around frames 6-7):
      if (sinA > 0.7) {
        const flareR = Math.round(3 + (sinA - 0.7) * 12)
        c.ring(LAMP_X, LAMP_Y, flareR, "l")
        c.ring(LAMP_X, LAMP_Y, Math.round(flareR * 0.6), "L")
        c.circ(LAMP_X, LAMP_Y, 2, "W")
        c.hline(LAMP_X - flareR * 2, LAMP_Y, flareR * 4, "W")
        c.vline(LAMP_X, LAMP_Y - flareR, flareR * 2, "L")
      } else {
        c.circ(LAMP_X, LAMP_Y, 1, "W")
        c.px(LAMP_X + 1, LAMP_Y, "L")
        c.px(LAMP_X - 1, LAMP_Y, "L")
      }
    }
  ),

  // ------------------------------------------------------------
  // LAYER 8: SLANTING RAIN
  // ------------------------------------------------------------
  // Gales drive rain from left to right at ~65 degrees slant.
  // 6-frame loop (repeats 4 times in 24 frames -> seamless).
  // Raindrops inside the lamp beam blaze into bright white/gold!
  layer("rain",
    (c) => {
      const f = c.frame
      const alpha = (f / 24) * Math.PI * 2
      const cosA = Math.cos(alpha)
      const sinA = Math.sin(alpha)
      const beamActiveLeft = (cosA > 0.25)
      const beamTargetY = LAMP_Y + Math.round(LAMP_X * (0.35 * sinA + 0.05))

      const RAIN_COUNT = 140
      for (let i = 0; i < RAIN_COUNT; i++) {
        const r1 = hash(i, 113)
        const r2 = hash(i, 239)
        const x0 = Math.floor(r1 * W)
        const y0 = Math.floor(r2 * H)
        const speed = 1 + (i % 2)

        const t = ((f % 6) + r1 * 6) / 6
        const curX = Math.round(x0 + t * 9 * speed) % W
        const curY = Math.round(y0 + t * 20 * speed) % H

        let insideBeam = false
        if (beamActiveLeft && curX < LAMP_X) {
          const beamYAtCurX = LAMP_Y + (curX - LAMP_X) * ((beamTargetY - LAMP_Y) / (-LAMP_X))
          const distToBeam = Math.abs(curY - beamYAtCurX)
          const beamWidthAtCurX = 10 + (LAMP_X - curX) * 0.24
          if (distToBeam < beamWidthAtCurX) {
            insideBeam = true
          }
        }

        const col = insideBeam ? ((i % 3 === 0) ? "W" : "L") : ((i % 4 === 0) ? "v" : "u")
        c.line(curX, curY, curX + 1, curY + 3, col)
      }
    }
  ),

  // ------------------------------------------------------------
  // LAYER 9: RETOUCH & ATMOSPHERIC HALOS
  // ------------------------------------------------------------
  glow("WLl", { where: [110, 10, 26, 26], r: 6, strength: 0.35 }),
  glow("WLl", { where: [106, 20, 12, 14], r: 4, strength: 0.3 })
)
