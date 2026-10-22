// Made for the model study (docs/model-study.md) by Antigravity, Gemini 4 Argon at high effort, its first run (its draft); its file as it left it.
// Storm Beacon — 160x120 animated pixel-art scene
// A lighthouse on a rocky headland on a stormy night: sweeping lamp beam through slanting rain,
// waves breaking on the rocks below with wind-whipped spray, a keeper in a yellow oilskin on the
// gallery holding a lantern with coat flapping in the gale, and gulls struggling against the wind.

const W = 160, H = 120, HZ = 78
const FRAMES = 24, FPS = 12
const LAMP = [113, 24]

pal({
  k: "#090c16", // deepest abyssal night ink
  // Sky & storm clouds ramp: k -> N -> n -> M -> m
  N: "#11182b", n: "#1b2640", M: "#293858", m: "#415882",
  // Stormy sea, foam & spray ramp: k -> U -> u -> S -> s -> W -> w
  U: "#0d1e2d", u: "#163247", S: "#234b66", s: "#3b6e8c", W: "#78acc6", w: "#dcf2fa",
  // Wet basalt headland & sea rocks ramp: k -> R -> r -> C -> c -> q
  R: "#151824", r: "#23293a", C: "#364056", c: "#52607a", q: "#7e8fa8",
  // Lighthouse masonry & ironwork ramp: k -> D -> d -> B -> b -> p -> P
  D: "#22202c", d: "#383546", B: "#565266", b: "#7e7a8e", p: "#afaab8", P: "#dfd8e4",
  // Red daymark band & slate roof ramp: k -> Z -> z -> A -> a -> e
  Z: "#381622", z: "#5e2230", A: "#8c323e", a: "#bd4a4e", e: "#e0786c",
  // Lamp beam, keeper's yellow oilskin & lantern glow ramp: k -> O -> o -> Y -> y -> L -> l
  O: "#472c14", o: "#7a4e1a", Y: "#b87d20", y: "#eab438", L: "#ffe078", l: "#fff9dc",
})

ramps(
  "kNnMm",
  "kUuSsWw",
  "kRrCcq",
  "kDdBbpP",
  "kZzAae",
  "kOoYyLl",
)

// ============================================================================
// 1. STORM CLOUDS (seamless 24-frame drift to the left with the gale)
// ============================================================================
anim("_storm_clouds", { w: W, h: HZ, frames: FRAMES, fps: FPS }, (c) => {
  // Distant brooding cloud decks that drift slowly left and morph seamlessly over the loop
  c.clouds({
    y: 34, gap: -44, w: 42, h: 16, n: 5, seed: 11,
    keys: "MmN", sizes: [1, 0.85, 1.1, 0.9, 1.05],
  })
  c.clouds({
    y: 52, gap: -36, w: 36, h: 13, n: 6, seed: 23,
    keys: "mnN", empty: [2], sizes: [0.9, 1.05, 1, 0.8, 1.1, 0.95],
  })
  c.clouds({
    y: 66, gap: -28, w: 30, h: 10, n: 6, seed: 37,
    keys: "nNN", empty: [1, 4], sizes: [0.85, 1, 0.9, 1.05, 0.8, 1],
  })
})

// ============================================================================
// 2. KEEPER'S COTTAGE (nestled on the headland shoulder to the left of tower)
// ============================================================================
// Placed at (88, 74): center ~(88, 64), lamp at (113, 24) is to the upper-right (+x, -y).
// Upper-right roof and right gable wall take the warm/bright stone & roof keys.
sprite("cottage", { w: 28, h: 21, pivot: "bottom", height: 3.1 }, (c) => {
  // Chimney on the left-center roof ridge
  c.rect(6, 1, 4, 6, "d")
  c.vline(8, 1, 5, "B")
  c.vline(9, 1, 5, "b")
  c.hline(6, 0, 4, "b")
  c.px(9, 0, "p")

  // Pitched slate roof (y = 4..11): dark Z/z on left slope, lit A/a/e on right slope facing lamp
  c.poly([1, 11, 8, 4, 21, 4, 27, 11], "z")
  c.poly([12, 4, 21, 4, 27, 11, 15, 11], "A")
  c.poly([17, 4, 21, 4, 27, 11, 21, 11], "a")
  // Roof ridge and right eave catching the lamp light from upper-right
  c.hline(8, 4, 6, "A")
  c.hline(14, 4, 7, "a")
  c.hline(18, 4, 3, "e")
  c.line(21, 4, 27, 10, "e")
  // Horizontal slate tile course seams
  c.hline(5, 7, 9, "Z"); c.hline(14, 7, 10, "z")
  c.hline(3, 9, 11, "Z"); c.hline(14, 9, 12, "A")

  // Stone walls (y = 11..20): left wall in shadow (D/d), right wall & upper courses lit (B/b/p)
  c.rect(2, 11, 24, 9, "d")
  c.rect(12, 11, 14, 9, "B")
  c.rect(18, 11, 8, 8, "b")
  c.vline(24, 11, 8, "p")
  c.vline(25, 11, 8, "P")
  c.hline(14, 11, 12, "p")
  // Shadowed left wall edge & dark wet base plinth
  c.rect(2, 11, 4, 9, "D")
  c.rect(2, 18, 16, 3, "D")
  c.rect(18, 19, 8, 2, "d")
  // Offset stone course lines
  c.hline(3, 13, 9, "D"); c.hline(13, 13, 11, "B")
  c.hline(4, 16, 8, "D"); c.hline(14, 16, 10, "B")
  c.px(7, 12, "D"); c.px(16, 12, "d"); c.px(21, 14, "B"); c.px(11, 15, "D")

  // Warm glowing cottage window (x = 9..13, y = 13..16) with stone lintel & sill
  c.hline(8, 12, 7, "b")
  c.rect(9, 13, 5, 4, "O")
  c.rect(10, 13, 3, 3, "y")
  c.px(11, 13, "L"); c.px(12, 13, "l"); c.px(12, 14, "L")
  c.vline(11, 13, 3, "O") // window mullion
  c.hline(8, 17, 7, "B")
  c.hline(10, 17, 5, "y") // warm spill on the sill

  // Small storm porch / buttress on the right joining the tower base
  c.rect(22, 13, 5, 7, "b")
  c.vline(25, 12, 7, "p")
  c.vline(26, 12, 7, "P")
})

// ============================================================================
// 3. THE LIGHTHOUSE TOWER & REVOLVING FRESNEL LAMP
// ============================================================================
// Stamped at (113, 74) with pivot "bottom" -> spans x = 97..129, y = 8..74.
// Lamp center is at sprite (16, 16) = scene (113, 24).
anim("lighthouse", { w: 32, h: 66, pivot: "bottom", height: 9.8 }, (c) => {
  const theta = c.phase * Math.PI // 180-deg turn of bivalve Fresnel lens = full seamless cycle
  const pulse = Math.sin(c.phase * Math.PI * 2)

  // --- A. Tapered Cylindrical Stone Tower (y = 21..65) ---
  for (let y = 21; y < 66; y++) {
    // Smooth taper from half-width 6.5 at top (y=21) to 10 at bottom plinth (y=65)
    const t = (y - 21) / 44
    const hw = y >= 55 ? 10 : Math.round(6.5 + t * 3.0)
    const x0 = 16 - hw, x1 = 16 + hw

    // Is this row in the classic red daymark band (y = 31..43)?
    const isRed = y >= 31 && y <= 43
    const isPlinth = y >= 55

    for (let x = x0; x <= x1; x++) {
      // Normalized horizontal position across cylinder (-1 left edge .. +1 right edge)
      const u = (x - 16) / hw
      // Lighting combines vertical proximity to the lamp gallery (y=21) and cylindrical curve
      let key
      if (isRed) {
        if (u < -0.65) key = "Z"
        else if (u < -0.2) key = "z"
        else if (u < 0.35) key = "A"
        else if (u < 0.78) key = "a"
        else key = y < 35 ? "e" : "a"
      } else if (isPlinth) {
        if (y >= 63 && u < 0.2) key = "R"
        else if (u < -0.5) key = "D"
        else if (u < 0.0) key = "d"
        else if (u < 0.55) key = "B"
        else key = "b"
      } else {
        // Whitewashed granite shaft: brightest near the gallery (y = 21..27)
        const topBoost = y < 25 ? 0.35 : y < 29 ? 0.18 : 0
        const v = u + topBoost
        if (v < -0.55) key = "D"
        else if (v < -0.1) key = "d"
        else if (v < 0.35) key = "B"
        else if (v < 0.78) key = "b"
        else if (v < 1.05) key = "p"
        else key = "P"
      }
      c.px(x, y, key)
    }

    // Horizontal stone masonry courses every 4 rows with staggered vertical joints
    if (y % 4 === 0 && y > 22 && y < 64) {
      const seamKey = isRed ? "z" : "d"
      const shadowKey = isRed ? "Z" : "D"
      for (let x = x0 + 1; x < x1 - 1; x++) {
        if ((x + y) % 3 !== 0) c.px(x, y, x < 15 ? shadowKey : seamKey)
      }
      // Vertical joint ticks on the course above
      const jx1 = 16 - 4 + ((y >> 2) % 2) * 3
      const jx2 = 16 + 2 + ((y >> 2) % 2) * 2
      c.px(jx1, y - 1, shadowKey)
      c.px(jx2, y - 1, seamKey)
    }
  }

  // Weathering: rain streaks under gallery corbels & cornice ledges (scenes.md §3)
  c.vline(11, 22, 4, "d"); c.vline(14, 22, 3, "B"); c.vline(20, 22, 3, "b")
  c.vline(12, 44, 3, "d"); c.vline(19, 44, 3, "B")
  // Batter cornice at top of base plinth (y = 55)
  c.hline(6, 55, 21, "B"); c.hline(14, 55, 13, "b"); c.hline(21, 55, 6, "p")

  // Heavy arched doorway in the base plinth (x = 13..18, y = 57..65)
  c.rect(13, 58, 5, 8, "D")
  c.hline(14, 57, 3, "b") // stone arch lintel
  c.rect(14, 58, 3, 7, "O")
  c.vline(15, 58, 7, "o")
  // Warm fanlight transom window above the door
  c.hline(14, 58, 3, "y"); c.px(15, 58, "L")

  // Narrow stairwell slit window in the red daymark band (x = 16..17, y = 34..38)
  c.rect(15, 34, 3, 5, "Z")
  c.vline(16, 34, 4, "y"); c.px(16, 35, "L"); c.px(16, 36, "L")
  c.hline(15, 39, 3, "a") // lit window sill

  // --- B. Corbelled Gallery Deck & Iron Railing (y = 17..22, x = 2..30) ---
  // Stepped stone corbels supporting the overhanging gallery walkway
  c.hline(6, 22, 21, "d"); c.hline(12, 22, 15, "b"); c.hline(18, 22, 9, "p")
  for (let x = 7; x <= 25; x += 3) {
    c.px(x, 22, x < 16 ? "D" : "B")
    c.px(x, 23, x < 16 ? "D" : "d")
  }
  // Overhanging gallery floor slab (x = 2..30, y = 20..21) - extends left so keeper stands on it
  c.hline(2, 21, 29, "d"); c.hline(10, 21, 21, "B"); c.hline(16, 21, 15, "b")
  c.hline(2, 20, 29, "b"); c.hline(8, 20, 23, "p"); c.hline(12, 20, 17, "P")
  // Gallery iron railing (y = 17..19): top handrail + vertical stanchions
  c.hline(2, 17, 8, "B"); c.hline(22, 17, 9, "b")
  c.px(2, 17, "p"); c.px(30, 17, "P")
  for (const rx of [2, 5, 8, 24, 27, 30]) {
    c.vline(rx, 18, 2, rx < 16 ? "d" : "B")
  }

  // --- C. Lantern Room & Revolving Fresnel Optic (y = 10..19, x = 9..23) ---
  // Iron parapet base of lantern house (y = 18..19)
  c.rect(9, 18, 15, 2, "d")
  c.rect(13, 18, 11, 2, "B")
  c.hline(10, 18, 13, "p")

  // Glazed lantern cage (x = 10..22, y = 11..17)
  c.rect(10, 11, 13, 7, "Y")
  c.rect(11, 11, 11, 7, "y")
  c.rect(12, 12, 9, 5, "L")
  // Revolving Fresnel bullseye lens shifting horizontally as it turns
  const lensDx = Math.round(Math.cos(theta) * 2.4)
  const glare = Math.sin(theta) // +1 when pointing straight at viewer
  c.rect(14 + lensDx, 12, 5, 5, "l")
  c.rect(13, 13, 7, 3, glare > 0.5 ? "l" : "L")
  c.px(16, 14, "l")
  // Concentric brass/prism Fresnel rings
  c.hline(14, 11, 5, "y"); c.hline(14, 17, 5, "Y")
  // Dark structural iron mullions framing the glass panes (drawn over outer edges)
  c.vline(10, 11, 7, "D"); c.vline(22, 11, 7, "B")
  c.vline(13, 11, 7, "o"); c.vline(19, 11, 7, "o")
  // Bright core overrides center mullion when facing us
  if (glare > 0.35) {
    c.rect(14, 13, 5, 3, "l")
  }

  // --- D. Copper Cupola Dome & Lightning Rod (y = 0..10, x = 8..24) ---
  // Overhanging dome cornice with brass gutter
  c.hline(8, 10, 17, "z")
  c.hline(12, 10, 13, "A")
  c.hline(15, 10, 10, "a")
  c.hline(17, 10, 7, "e")
  // Dome tiers (y = 6..9)
  c.hline(10, 9, 13, "z"); c.hline(13, 9, 10, "A"); c.hline(16, 9, 7, "a"); c.px(21, 9, "e")
  c.hline(11, 8, 11, "z"); c.hline(14, 8, 8, "A"); c.hline(16, 8, 6, "a"); c.px(20, 8, "e")
  c.hline(12, 7, 9, "A");  c.hline(15, 7, 6, "a"); c.hline(17, 7, 4, "e")
  c.hline(14, 6, 5, "a");  c.hline(16, 6, 3, "e")
  // Ventilator ball & lightning rod finial (x = 16, y = 0..5)
  c.rect(15, 4, 3, 2, "A"); c.px(16, 4, "e"); c.px(17, 4, "P")
  c.vline(16, 0, 4, "p"); c.px(16, 0, "P")
  // Weathervane Pennant streaming left in the gale (x = 12..15, y = 2)
  c.hline(13, 2, 3, "b")
  c.px(12, 2 + (c.frame % 2), "p")
})

// ============================================================================
// 4. THE KEEPER ON THE GALLERY (yellow oilskin flapping in the wind + lantern)
// ============================================================================
// Stamped at (101, 29) with pivot [9, 13] -> boots stand on gallery deck at y=29,
// spanning x = 92..108, y = 16..29.
// Lamp at (113, 24) is to the keeper's upper-right, and the keeper holds a glowing
// lantern on their right side (x = 12..14), while the oilskin coat flaps left (x = 1..6).
const KEEPER_COATS = [
  // Frame 0: coat streams out high to the left
  [[2, 5, "oYY"], [1, 6, "OoooYY"], [2, 7, "OOooY"], [4, 8, "OOo"]],
  // Frame 1: wave crest runs toward the hem
  [[3, 5, "oY"], [1, 6, "ooYYY"], [1, 7, "OOooYY"], [2, 8, "OOooY"], [5, 9, "Oo"]],
  // Frame 2: coat snaps low in a gust
  [[3, 5, "oY"], [2, 6, "ooYY"], [1, 7, "OooYY"], [1, 8, "OOooY"], [2, 9, "OOo"]],
  // Frame 3: coat billows back up
  [[1, 5, "ooYY"], [1, 6, "OooYY"], [2, 7, "OOooY"], [3, 8, "OOoo"]],
]

anim("keeper", { w: 16, h: 13, pivot: [9, 13], height: 1.7, facing: "right" }, (c) => {
  const f = Math.floor(c.frame / 2) % 4
  const sway = (c.frame % 6 < 3) ? 0 : 1

  // 1. Flapping yellow oilskin coat tails on the left (x = 1..6, y = 5..9)
  for (const [x, y, str] of KEEPER_COATS[f]) {
    c.runs({ [y]: [[x, str]] })
  }

  // 2. Sea boots & oilskin trousers planted on the gallery (y = 9..12, x = 6..10)
  c.px(6, 9, "O"); c.px(7, 9, "o"); c.px(9, 9, "Y"); c.px(10, 9, "y")
  c.px(6, 10, "D"); c.px(7, 10, "d"); c.px(9, 10, "d"); c.px(10, 10, "B")
  c.px(6, 11, "D"); c.px(7, 11, "d"); c.px(9, 11, "B"); c.px(10, 11, "b")
  c.px(5, 12, "k"); c.px(6, 12, "D"); c.px(9, 12, "d"); c.px(10, 12, "B")

  // 3. Oilskin torso & shoulders (x = 6..11, y = 4..8) - lit brightly on right side
  c.runs({
    4: [[6, "oYYyL"]],
    5: [[6, "oYYyL"]],
    6: [[6, "oYYyL"]],
    7: [[6, "oYYyL"]],
    8: [[6, "oYYy"]],
  })

  // 4. Sou'wester yellow rain hat & head (x = 5..11, y = 0..3) - brightest on top-right
  c.runs({
    0: [[7, "yLL"]],
    1: [[6, "YyLLl"]],
    2: [[5, "oYypl"]], // sou'wester tail on left, lit face profile on right
    3: [[6, "oYYyL"]],
  })

  // 5. Right arm reaching forward & holding the glowing storm lantern (x = 11..15, y = 4..9)
  c.px(11, 4, "L"); c.px(12, 4, "l"); c.px(13, 4 + sway, "L")
  // Lantern bail handle & brass cap
  const ly = 5 + sway
  c.px(13, ly, "p")
  c.hline(12, ly + 1, 3, "y")
  // Glowing lantern glass core (brightest keys l/L on right edge)
  c.hline(12, ly + 2, 3, "L"); c.px(13, ly + 2, "l"); c.px(14, ly + 2, "l")
  c.hline(12, ly + 3, 3, "y"); c.px(13, ly + 3, "L"); c.px(14, ly + 3, "l")
  c.hline(12, ly + 4, 3, "Y"); c.px(14, ly + 4, "y")
})

// ============================================================================
// 5. GULLS STRUGGLING AGAINST THE WIND
// ============================================================================
// Facing right into the gale and toward the lighthouse lamp at (113, 24).
// All gulls sit left and below (113, 24), so their upper-right edges (head, forewing)
// catch the bright light (w, L) while their lower-left tails/undersides are in shadow (U, u, S).
const GULL_FRAMES = [
  // Pose 0: wings swept high on the upstroke
  [
    [1, [[7, "wL"]]],
    [2, [[6, "WwL"]]],
    [3, [[5, "sWw"], [9, "wL"]]],
    [4, [[3, "usWWwL"]]],
    [5, [[1, "UusSWw"]]],
  ],
  // Pose 1: wings driving forward mid-stroke against the gust
  [
    [2, [[7, "wL"]]],
    [3, [[4, "sWWwL"]]],
    [4, [[2, "usSWwwL"]]],
    [5, [[1, "UusSWw"]]],
  ],
  // Pose 2: wings arched down hard on the power stroke
  [
    [2, [[8, "wL"]]],
    [3, [[4, "sWWwL"]]],
    [4, [[2, "usSWw"]]],
    [5, [[1, "UusS"], [6, "Sw"]]],
    [6, [[5, "uS"]]],
  ],
  // Pose 3: recovery glide, wings angled back against headwind
  [
    [2, [[7, "WwL"]]],
    [3, [[4, "sWWwL"]]],
    [4, [[2, "usSWw"]]],
    [5, [[1, "UusS"]]],
  ],
]

anim("gull", { w: 13, h: 9, pivot: "center", facing: "right" }, (c) => {
  // 3 full wingbeat cycles per 24-frame loop (8 frames per beat: 2 frames per pose)
  const poseIdx = Math.floor((c.frame % 8) / 2)
  // Struggling motion: pushed back 1px by gust, surging forward 1px on power stroke
  const dx = [0, 0, 1, 1, 0, -1, -1, 0][c.frame % 8]
  const dy = [0, -1, -1, 0, 1, 1, 0, 0][c.frame % 8]
  for (const [y, rowRuns] of GULL_FRAMES[poseIdx]) {
    c.runs({ [y + dy]: rowRuns.map(([x, s]) => [x + dx, s]) })
  }
})

// ============================================================================
// 6. OUTER REEF SEA-STACK ROCK (in the churning surf to the left)
// ============================================================================
// Placed at (30, 112), center ~(30, 102): lamp at (113, 24) is to the upper-right (+x, -y).
// Upper-right rock facets are lit (c, q), lower-left base is dark wet basalt (k, R, r).
sprite("reef_rock", { w: 26, h: 20, pivot: "bottom", height: 2.8 }, (c) => {
  // Main angular basalt silhouette (no pillow shading: distinct planar facets)
  c.poly([1, 19, 3, 12, 7, 8, 12, 4, 17, 2, 21, 5, 24, 12, 25, 19], "r")
  // Deep shadow on the left and lower seaward face
  c.poly([1, 19, 3, 12, 7, 8, 11, 9, 10, 14, 12, 19], "R")
  c.poly([1, 19, 2, 15, 8, 16, 12, 19], "k")
  // Mid slate-granite plane in the center
  c.poly([7, 8, 12, 4, 17, 2, 19, 9, 15, 15, 10, 14], "C")
  // Lit upper-right crag faces turned toward the lighthouse lamp at (113, 24)
  c.poly([12, 4, 17, 2, 21, 5, 23, 10, 18, 11, 14, 7], "c")
  c.poly([15, 3, 17, 2, 21, 5, 22, 8, 18, 7], "q")
  c.line(12, 4, 17, 2, "q")
  c.line(17, 2, 21, 5, "q")
  c.line(21, 5, 23, 9, "c")
  // Wet geological strata crevices & draining whitewater veins
  c.line(6, 11, 14, 9, "R")
  c.line(9, 15, 19, 12, "R")
  c.line(15, 7, 17, 11, "s")
  c.px(16, 6, "W")
})

// ============================================================================
// 7. STORMY SEA, HEADLAND CLIFFS, BREAKING WAVES & SPRAY
// ============================================================================
// Distant mist-veiled headland on the left horizon (unlit backdrop)
const farCoast = [
  poly([0, HZ, 0, 70, 11, 69, 22, 71, 33, 72, 42, 74, 49, HZ], "N"),
  poly([18, 71, 22, 71, 33, 72, 42, 74, 48, HZ, 26, HZ], "n"),
  hline(22, 71, 8, "M"), hline(33, 72, 7, "M"),
  // Sea stack off the far point
  poly([51, HZ, 52, 73, 55, 72, 57, HZ], "n"),
  hline(53, 72, 2, "M"),
  // Distant surf line at foot of far headland
  hline(0, HZ - 1, 58, "S"),
  hline(12, HZ - 1, 10, "s"), hline(34, HZ - 1, 12, "s"), hline(51, HZ - 1, 6, "W"),
]

// Animated rolling sea swells (x = 0..160, y = HZ..120)
anim("_sea_swells", { w: W, h: H - HZ, frames: FRAMES, fps: FPS }, (c) => {
  const phase = c.phase * Math.PI * 2
  // Deep storm-sea base gradient
  c.grad(0, 0, W, H - HZ, "UuSU")
  c.hline(0, 0, W, "S")

  // Rolling swell bands moving rightward toward the headland (seamless over 24 frames)
  const rows = [
    [2, 18, 5, "s"], [5, 16, 6, "s"], [9, 14, 8, "s"],
    [14, 12, 10, "S"], [20, 10, 12, "s"], [27, 9, 14, "s"], [34, 8, 16, "S"],
  ]
  for (const [dy, count, len, col] of rows) {
    const period = 32
    const shift = Math.round(c.phase * period)
    for (let i = -1; i < count; i++) {
      const x0 = ((i * period + dy * 7 + shift) % (W + period)) - 16
      const bob = Math.round(Math.sin(phase + i * 1.1 + dy * 0.2) * 1.2)
      const y = Math.max(1, Math.min(H - HZ - 2, dy + bob))
      // Dark trough under each swell
      c.hline(x0, y + 1, len + 2, dy > 18 ? "k" : "U")
      // Lit wave face and whitecap crest
      c.hline(x0 + 1, y, len, col)
      if ((i + dy) % 2 === 0) {
        c.hline(x0 + 3, y, Math.max(2, len >> 1), "W")
      }
    }
  }
})

// The main rocky headland promontory (x = 48..160, y = 68..120)
sprite("_headland", { w: W, h: H }, (c) => {
  // 1. Main cliff silhouette rising from the surf at x=48 up to the plateau at x=74..156
  const CLIFF = [
    46, 119, 49, 106, 54, 96, 58, 86, 64, 79, 72, 74,
    84, 72, 102, 71, 128, 71, 144, 73, 155, 76, 160, 80,
    160, 120, 46, 120,
  ]
  c.poly(CLIFF, "r")

  // 2. Deep shadow pockets and wet tidal Zone at the foot of the cliff
  c.poly([46, 119, 49, 106, 54, 96, 63, 98, 72, 106, 86, 112, 160, 110, 160, 120], "R")
  c.poly([46, 120, 48, 111, 68, 113, 95, 116, 160, 115, 160, 120], "k")

  // 3. Stepped angular basalt crags & faceted rock planes (lit from lamp at [113, 24])
  // Left seaward bluff (x = 54..88, y = 73..108): faces turned up-right toward [113, 24]
  c.poly([58, 86, 64, 79, 72, 74, 84, 72, 86, 82, 74, 90, 62, 92], "C")
  c.poly([64, 79, 72, 74, 84, 72, 82, 78, 70, 82], "c")
  c.line(64, 79, 72, 74, "q"); c.line(72, 74, 84, 72, "q")

  // Center ridge directly below the cottage & lighthouse (x = 82..130, y = 71..110)
  c.poly([84, 72, 102, 71, 128, 71, 132, 84, 116, 92, 96, 90, 84, 82], "C")
  c.poly([88, 72, 104, 71, 126, 71, 124, 79, 104, 81, 88, 78], "c")
  c.hline(86, 72, 16, "q"); c.hline(102, 71, 25, "q")
  // Lower central crag buttress (x = 72..118, y = 86..112)
  c.poly([72, 90, 92, 85, 112, 86, 118, 98, 98, 106, 76, 102], "C")
  c.poly([78, 89, 92, 85, 110, 86, 106, 92, 84, 94], "c")
  c.line(78, 89, 92, 85, "q"); c.hline(92, 85, 16, "q")

  // Right headland shoulder (x = 126..160, y = 72..110): lamp is at x=113, so upper-left rims face lamp!
  c.poly([128, 71, 144, 73, 155, 76, 152, 92, 136, 96, 126, 84], "C")
  c.poly([128, 71, 142, 73, 140, 81, 128, 80], "c")
  c.line(128, 71, 142, 73, "q")
  c.line(126, 84, 136, 94, "c")

  // 4. Geological fault lines, slanted strata & wet sea-spray runnels
  c.line(55, 95, 76, 88, "R"); c.line(56, 96, 76, 89, "c")
  c.line(62, 104, 94, 95, "R"); c.line(63, 105, 94, 96, "C")
  c.line(86, 82, 118, 80, "r"); c.line(86, 83, 118, 81, "c")
  c.line(102, 98, 138, 92, "R"); c.line(102, 99, 138, 93, "C")
  c.line(132, 83, 156, 88, "R")
  // Streaming white foam veins draining down the dark lower rocks
  c.line(58, 96, 53, 108, "s"); c.px(58, 96, "W")
  c.line(68, 99, 64, 112, "s"); c.px(68, 99, "W")
  c.line(84, 104, 80, 115, "s")
})

// Animated breaking waves & wind-whipped spray on the headland and reef rocks
anim("_waves_spray", { w: W, h: H, frames: FRAMES, fps: FPS }, (c) => {
  const phase = c.phase * Math.PI * 2

  // Helper for a breaking wave + upward spray plume whipped leftward by the gale
  const drawBreaker = (bx, by, scale, cycPhase) => {
    // t in [0, 1) over the wave cycle
    const t = cycPhase - Math.floor(cycPhase)
    const ang = t * Math.PI * 2

    // 1. Surging base foam & boiling whitewater apron around the rocks
    const surgeW = Math.round((16 + 6 * Math.sin(ang)) * scale)
    const surgeY = by - Math.round(3 * Math.sin(ang) * scale)
    c.ellipse(bx, surgeY + 2, surgeW, Math.max(2, Math.round(3 * scale)), "s")
    c.ellipse(bx + 1, surgeY + 1, Math.round(surgeW * 0.8), Math.max(2, Math.round(2 * scale)), "W")
    c.hline(bx - Math.round(surgeW * 0.5), surgeY, Math.round(surgeW * 0.9), "w")

    // 2. Wave wall curling and smashing against the rock face (peaks around t = 0.2..0.55)
    if (t < 0.65) {
      const rise = Math.sin((t / 0.65) * Math.PI)
      const h = Math.round(13 * rise * scale)
      const w = Math.round((10 + 5 * rise) * scale)
      // Aerated wave body
      c.poly([
        bx - w, by + 2,
        bx - Math.round(w * 0.4), by - h,
        bx + Math.round(w * 0.5), by - Math.round(h * 0.85),
        bx + Math.round(w * 0.7), by + 2,
      ], "s")
      // Bright foaming curl on top-right
      c.poly([
        bx - Math.round(w * 0.5), by - Math.round(h * 0.7),
        bx - Math.round(w * 0.2), by - h - 1,
        bx + Math.round(w * 0.5), by - Math.round(h * 0.85),
        bx + Math.round(w * 0.3), by - Math.round(h * 0.4),
      ], "W")
      c.hline(bx - Math.round(w * 0.2), by - h - 1, Math.max(2, Math.round(w * 0.65)), "w")
    }

    // 3. Upward spray ribbons & wind-whipped droplets (t = 0.25..0.95)
    // Following scenes.md §12: pointed joined ribbons first, then breaking into wind-driven arcs/bits
    const sprayT = (t - 0.2) < 0 ? (t - 0.2 + 1) : (t - 0.2)
    if (sprayT < 0.75) {
      const p = sprayT / 0.75 // 0 = impact burst, 1 = settling droplets
      const jets = [
        [-4, 18, -9], [0, 22, -12], [4, 16, -7], [-7, 13, -11], [6, 12, -5],
      ]
      for (let j = 0; j < jets.length; j++) {
        const [ox, maxH, windDx] = jets[j]
        // Trajectory: rises fast, curves left in the wind, falls with gravity at the end
        const lift = Math.sin(p * Math.PI * 0.88) * maxH * scale
        const grav = p * p * 7 * scale
        const sx = Math.round(bx + ox * scale + windDx * p * scale)
        const sy = Math.round(by - lift + grav)
        if (p < 0.42) {
          // Pointed ribbon connected toward the crest
          const tailX = Math.round(bx + ox * scale + windDx * (p * 0.5) * scale)
          const tailY = Math.round(by - lift * 0.55 + grav * 0.4)
          c.line(tailX, tailY, sx, sy, j % 2 === 0 ? "w" : "W")
          c.px(sx, sy - 1, "w")
        } else if (p < 0.68) {
          // Breaking into 2-px clusters & droplets whipped left
          c.hline(sx, sy, 2, j % 2 === 0 ? "w" : "W")
          c.px(sx + 2, sy + 1, "s")
        } else {
          // Lone falling spray specks at the end of their life
          c.px(sx, sy, j % 2 === 0 ? "W" : "s")
        }
      }
    }
  }

  // Primary breaker smashing into the main headland cliff foot (x = 54, y = 104)
  drawBreaker(54, 104, 1.05, c.phase)
  // Secondary surge higher on the cleft rock ledge (x = 64, y = 96), staggered phase
  drawBreaker(64, 96, 0.75, c.phase + 0.33)
  // Breaker crashing over the outer reef sea-stack (x = 28, y = 109), half-cycle offset
  drawBreaker(28, 109, 0.9, c.phase + 0.5)
  // Foreground surf surge along the lower rocks (x = 88..148, y = 113..118)
  drawBreaker(92, 114, 0.65, c.phase + 0.75)

  // Continuous churning foam lace along the cliff base (y = 108..119)
  for (let x = 44; x < 158; x += 4) {
    const wave = Math.sin(phase + x * 0.18)
    const fy = Math.round(112 + (x > 80 ? 3 : 0) + wave * 1.5)
    c.hline(x, fy, 3, wave > 0.2 ? "W" : "s")
    if (wave > 0.55) c.px(x + 1, fy - 1, "w")
  }
})

// ============================================================================
// 8. SWEEPING LAMP BEAM & SLANTING RAIN
// ============================================================================
// Helper: returns how strongly pixel (x, y) is inside the revolving lighthouse beam (0..1)
function beamIntensity(x, y, phase) {
  const [lx, ly] = LAMP
  const dx = x - lx, dy = y - ly
  const dist = Math.hypot(dx, dy)
  if (dist < 2) return 1

  // Bivalve Fresnel optic: two opposing beams rotating 180 deg per loop for a seamless cycle
  const theta = phase * Math.PI
  let best = 0
  for (const a of [theta, theta + Math.PI]) {
    const cx = Math.cos(a) // horizontal projection (-1 left .. +1 right)
    const cz = Math.sin(a) // depth (+1 toward viewer .. -1 away)

    // In a flat side elevation (scenes.md §11), the beam axis stays horizontal (with a tiny 2% sea dip)
    // and shortens & widens as it turns toward the viewer, fading into the rain/haze.
    const sideSign = cx >= 0 ? 1 : -1
    const along = dx * sideSign
    if (along < -3) continue

    // Apparent vertical spread widens as |cx| shrinks (beam turning toward/away from us)
    const absCx = Math.abs(cx)
    const spreadSlope = 0.11 + (1 - absCx) * 0.26
    const centerY = ly + Math.max(0, along) * 0.035
    const halfH = 2.2 + Math.max(0, along) * spreadSlope
    const vertDist = Math.abs(y - centerY)
    if (vertDist > halfH) continue

    // Horizontal reach extends well past canvas edges when pointing sideways, and foreshortens smoothly
    // into a soft rain-diffused glare when turning toward us (never cutting off with a hard edge!)
    const maxReach = 34 + absCx * 135
    const distFactor = Math.max(0, 1 - ( Math.max(0, along) / maxReach ) ** 1.35)
    const vertFactor = 1 - (vertDist / halfH) ** 1.6
    // Brighter when turning toward us (cz > 0) than when sweeping behind the cupola (cz < 0)
    const depthFactor = cz >= 0 ? (0.85 + 0.15 * cz) : (0.55 + 0.3 * (1 + cz))
    const val = distFactor * vertFactor * depthFactor
    if (val > best) best = val
  }
  return best
}

// Layer step 1: steps the underlying sky, clouds, gulls, and rocks up along their own ramps
anim("_beam_relight", { w: W, h: H, frames: FRAMES, fps: FPS }, (c) => {
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const b = beamIntensity(x, y, c.phase)
      if (b > 0.24) c.px(x, y, "k")
    }
  }
})

// Layer step 2: warm golden light cone & glare sweeping through the night air
anim("_beam_cone", { w: W, h: H, frames: FRAMES, fps: FPS }, (c) => {
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const b = beamIntensity(x, y, c.phase)
      if (b <= 0.12) continue
      // Bayer ordered dither at the outer edges so the beam dissolves into the rain without hard banding
      const thresh = bayer(x, y) * 0.18
      const v = b - thresh
      if (v > 0.68) c.px(x, y, "l")
      else if (v > 0.46) c.px(x, y, "L")
      else if (v > 0.26) c.px(x, y, "y")
      else if (v > 0.12) c.px(x, y, "Y")
    }
  }
})

// Slanting rain layer: 1:2 diagonal streaks (-1x per +2y, no L-corners!) that flash bright inside the beam
anim("_slanting_rain", { w: W, h: H, frames: FRAMES, fps: FPS }, (c) => {
  const r = c.rng(42)
  // Wrap period WX=192, WY=144: each frame moves (-8, +16) so 24 frames = (-192, +384) -> exact seamless loop!
  // Wait: 384 is not a multiple of 144; let's use WY=192 so 24 * 16 = 384 = 2 * 192!
  const WX = 192, WY = 192
  for (let i = 0; i < 95; i++) {
    const x0 = Math.floor(r() * WX)
    const y0 = Math.floor(r() * WY)
    const steps = 2 + (i % 3) // 2, 3, or 4 diagonal 1:2 segments (4 to 8 px tall)
    const x = ((x0 - c.frame * 8) % WX + WX) % WX - 16
    const y = ((y0 + c.frame * 16) % WY + WY) % WY - 24

    // Draw clean 1:2 vertical-slant run: each 2px vertical segment steps 1px left (zero L-corners!)
    for (let s = 0; s < steps; s++) {
      const px = x - s
      const py = y + s * 2
      if (px < 0 || px >= W || py < 0 || py + 1 >= H) continue
      const b = beamIntensity(px, py, c.phase)
      // Inside the beam, raindrops flash warm gold/white; outside, cool slate-blue streaks
      let colTop, colBot
      if (b > 0.45) {
        colTop = "L"; colBot = "l"
      } else if (b > 0.18) {
        colTop = "y"; colBot = "w"
      } else if (i % 4 === 0) {
        colTop = "m"; colBot = "W"
      } else {
        colTop = "M"; colBot = "m"
      }
      c.px(px, py, colTop)
      c.px(px, py + 1, colBot)
    }
  }

  // Tiny 1-2 frame rain splash ticks on the gallery, cottage roof, and cliff top
  const splashes = [
    [82, 58], [94, 58], [104, 54], [78, 73], [90, 72], [134, 72], [146, 75], [32, 95],
  ]
  for (let i = 0; i < splashes.length; i++) {
    if ((c.frame + i * 3) % 6 === 0) {
      const [sx, sy] = splashes[i]
      c.px(sx - 1, sy - 1, "W")
      c.px(sx + 1, sy - 1, "w")
    }
  }
})

// ============================================================================
// 9. MAIN SCENE: "storm_beacon"
// ============================================================================
scene("storm_beacon", {
  w: W, h: H, bg: "k",
  // The lighthouse Fresnel lamp at [113, 24] is the scene's primary light source
  world: { scale: 6.5, light: { at: LAMP } },
},
  // 1. Stormy night sky backdrop & drifting cloud banks
  layer("sky", { unlit: true },
    grad(0, 0, W, HZ, "kNnM"),
    stamp("_storm_clouds", 0, 0),
  ),

  // 2. Distant mist-veiled headland on the horizon
  layer("far_coast", { unlit: true }, ...farCoast),
  layer("far_haze", { unlit: true, opacity: 0.35 }, rect(0, HZ - 7, 62, 7, "M")),

  // 3. Rolling storm sea
  layer("sea", { unlit: true }, stamp("_sea_swells", 0, HZ)),

  // 4. Main rocky headland & outer reef sea-stack
  layer("headland",
    stamp("_headland", 0, 0),
    stamp("reef_rock", 30, 112),
  ),

  // 5. Breaking waves and wind-whipped spray plumes on the rocks below
  layer("waves", { unlit: true }, stamp("_waves_spray", 0, 0)),

  // 6. Cottage, Lighthouse Tower, Keeper on the gallery, and Gulls in the wind
  layer("structures",
    stamp("cottage", 88, 74),
    stamp("lighthouse", 113, 74),
    stamp("keeper", 101, 29),
  ),

  // 7. Gulls struggling rightward into the gale (staggered wingbeats)
  layer("gulls",
    stamp("gull", 34, 30, { delay: 0 }),
    stamp("gull", 60, 41, { delay: 3 }),
    stamp("gull", 22, 49, { delay: 6 }),
  ),

  // 8. Warm local light pools from the lighthouse lamp, keeper's lantern, and cottage window
  layer("lamp_spill", { light: true, density: 0.65 },
    ellipse(LAMP[0], LAMP[1], 24, 16, "k"),
    ellipse(104, 26, 10, 8, "k"),
    ellipse(88, 62, 8, 6, "k"),
  ),

  // 9. Sweeping lighthouse beam relighting what it touches + warm volumetric cone
  layer("beam_light", { light: true }, stamp("_beam_relight", 0, 0)),
  layer("beam_cone", { unlit: true, opacity: 0.28 }, stamp("_beam_cone", 0, 0)),

  // 10. Slanting rain sweeping across the scene and flashing through the beam
  layer("rain", { unlit: true }, stamp("_slanting_rain", 0, 0)),

  // 11. Warm atmospheric glow around the Fresnel lamp, keeper's lantern, and windows
  glow("lLy", { where: [95, 12, 34, 24], r: 10, strength: 0.42 }),
  glow("lLy", { where: [80, 52, 42, 22], r: 5, strength: 0.25 }),
)
