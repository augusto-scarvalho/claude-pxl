// The spell kit's sheet: the nine elements (rows) at their three tiers (columns: fire, fira, firaga),
// each a whole cast from one call, spell(element, tier, { from, to, ground }), drawn by cast() on the
// clock: a 4 s loop of 80 frames, every cast starting at 200 ms. Tier 1 a small ball; tier 2 bigger,
// longer, brighter, with a shockwave on the ground; tier 3 a centerpiece filling the picture, a flash
// and a mark left on the ground. Each cell at dusk: what the spell draws gives light (no lighting
// darkens it) and its lamps light the ground round it (lighting()); the sheet blooms by how much each
// pixel gives (post()). How to design an element of your own: scenes.md, "Designing an element".
pal({ k: "#0e0c16", n: "#1c1a2c", m: "#2a2840", g: "#3a4a3a", h: "#2c382e", d: "#232c24", s: "#6a6a72", t: "#4a4a54", u: "#34343c",
  c: "#3a4a8a", C: "#28346a", f: "#d8b090", w: "#e8e4d8", x: "#8a8aa0" })

const CW = 112, CH = 80, GY = 62, CLOCK = { frames: 80, fps: 20 }
const ELEMENTS = ["fire", "ice", "lightning", "water", "earth", "wind", "light", "dark", "heal"]

// a cell's place: the dusk sky in bands, the ground, the caster on the left (a hooded figure, his hand
// out) and a standing stone on the right for the target
sprite("_place", { w: CW, h: CH }, (c) => {
  c.rect(0, 0, CW, 22, "k"); c.rect(0, 22, CW, 18, "n"); c.rect(0, 40, CW, GY - 40, "m")
  c.dither(0, 20, CW, 4, "k", "n", 0.5); c.dither(0, 38, CW, 4, "n", "m", 0.5)
  c.rect(0, GY, CW, CH - GY, "g"); c.hline(0, GY, CW, "h"); c.dither(0, GY + 6, CW, CH - GY - 6, "g", "d", 0.4)
  // the caster: hood, cloak, the near arm out toward the target
  c.rect(12, GY - 14, 6, 14, "c"); c.rect(16, GY - 14, 2, 14, "C"); c.rect(13, GY - 18, 4, 4, "c"); c.px(16, GY - 16, "f")
  c.hline(18, GY - 11, 3, "c"); c.px(21, GY - 11, "f")
  // the stone: a standing block, lit on its left
  c.rect(84, GY - 18, 10, 18, "t"); c.rect(84, GY - 18, 3, 18, "s"); c.rect(91, GY - 18, 3, 18, "u"); c.hline(84, GY - 18, 10, "s")
})

for (const el of ELEMENTS)
  for (const tier of [1, 2, 3])
    anim(`${el}_${tier}`, { w: CW, h: CH, ...CLOCK },
      stamp("_place", 0, 0),
      cast(spell(el, tier, { from: [23, GY - 11], to: [89, GY - 10], ground: GY + 2, start: 200, seed: tier * 7 })),
      lighting({ ambient: 0.55 }))

const GAP = 4, TOP = 12, LEFT = 4
scene("spells", { w: LEFT + 3 * (CW + GAP), h: TOP + ELEMENTS.length * (CH + GAP), bg: "k", ...CLOCK, check: { every: 8 } },
  (c) => {
    ["tier 1", "tier 2", "tier 3"].forEach((n, i) => c.text(LEFT + i * (CW + GAP) + 2, 3, n, "x"))
    ELEMENTS.forEach((el, r) => [1, 2, 3].forEach((tier, i) => {
      const x = LEFT + i * (CW + GAP), y = TOP + r * (CH + GAP)
      c.stamp(`${el}_${tier}`, x, y)
      c.text(x + 3, y + 3, el, "w")
    }))
  },
  post({ bloom: { levels: 4, strength: 0.6, above: 0.85 } }))
