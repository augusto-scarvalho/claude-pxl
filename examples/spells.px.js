// The spell kit's sheet: the nine elements (rows) at their three tiers (columns: fire, fira, firaga),
// each a whole cast from one call, spell(element, tier, { from, to, ground }), drawn by cast() on the
// clock: a 4 s loop of 80 frames, every cast starting at 200 ms. Tier 1 a small ball; tier 2 bigger,
// longer, brighter, with a shockwave on the ground; tier 3 a centerpiece filling the picture, a flash
// and a mark left on the ground. Each cell at dusk: what the spell draws gives light (no lighting
// darkens it) and its lamps light the ground round it (lighting()); the sheet blooms by how much each
// pixel gives (post()). How to design an element of your own: scenes.md, "Designing an element".
// The caster is the traveler casting; the spell leaves from his hand.
include("hd2d/traveler.px.js")
pal({ k: "#0e0c16", n: "#1c1a2c", m: "#2a2840", g: "#3a4a3a", h: "#2c382e", d: "#232c24", s: "#6a6a72", t: "#4a4a54", u: "#34343c",
  c: "#3a4a8a", C: "#28346a", f: "#d8b090", w: "#e8e4d8", x: "#8a8aa0" })

const CW = 112, CH = 80, GY = 62, CLOCK = { frames: 80, fps: 20 }
const ELEMENTS = ["fire", "ice", "lightning", "water", "earth", "wind", "light", "dark", "heal"]

// a cell's place: the dusk sky in bands, the ground, a standing stone on the right for the target
sprite("_place", { w: CW, h: CH }, (c) => {
  c.rect(0, 0, CW, 22, "k"); c.rect(0, 22, CW, 18, "n"); c.rect(0, 40, CW, GY - 40, "m")
  c.dither(0, 20, CW, 4, "k", "n", 0.5); c.dither(0, 38, CW, 4, "n", "m", 0.5)
  c.rect(0, GY, CW, CH - GY, "g"); c.hline(0, GY, CW, "h"); c.dither(0, GY + 6, CW, CH - GY - 6, "g", "d", 0.4)
  // the stone: a standing block, lit on its left
  c.rect(84, GY - 18, 10, 18, "t"); c.rect(84, GY - 18, 3, 18, "s"); c.rect(91, GY - 18, 3, 18, "u"); c.hline(84, GY - 18, 10, "s")
})

// the traveler's cast (hd2d/traveler.px.js, 13 poses of 100 ms) timed to the spell: the wind-up as it
// starts charging, held while the energy gathers, the thrust as it is cast, held while it flies (his
// hand, where the spell starts, a socket that moves with the pose), back and at rest after it hits
const castPose = (t, s) => {
  const a = s.ability, ch = a.start("charge"), ca = a.start("cast"), tr = a.start("travel"), im = a.start("impact")
  if (t < ch) return 12
  if (t < ch + 200) return Math.floor((t - ch) / 100)
  if (t < ca) return 2 + Math.min(2, Math.floor(((t - ch - 200) * 3) / (ca - ch - 200)))
  return t < tr ? 5 : t < im ? 6 : Math.min(12, 7 + Math.floor((t - im) / 100))
}
for (const el of ELEMENTS)
  for (const tier of [1, 2, 3]) {
    const S = spell(el, tier, { from: "hero.hand", to: [89, GY - 10], ground: GY + 2, start: 200, seed: tier * 7 })
    anim(`${el}_${tier}`, { w: CW, h: CH, ...CLOCK },
      stamp("_place", 0, 0), (c) => c.stamp("tr_cast_e", 14, GY + 1, { frame: castPose(c.t, S), id: "hero" }), cast(S), lighting({ ambient: 0.55 }))
  }

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
