// The spell kit's variants and views. `variant` picks another way of an element (an iceberg rising,
// a boulder falling, a quake, a wave...), `form` its shape and complexity (size, count, facets,
// jaggedness, debris, how long it stays); `view` sees the same spell from the side (3/4), from above,
// in isometric 2:1 or through a perspective() camera, the spell happening in a world (x and y on the
// ground, z up). Big solids are volumes, seen through the view and lit, falling with a slow turn,
// cracking and breaking up. Three sheets on a 5 s loop at 20 fps, every cast at tier 3 from 200 ms:
// `ice_earth` the ice and earth variants, `variants` a row for each other element, `views` four spells
// seen four ways. The caster is the traveler casting, the spell leaving from his hand in every view.
include("hd2d/traveler.px.js")
pal({ k: "#0e0c16", n: "#1c1a2c", m: "#2a2840", g: "#3a4a3a", h: "#2c382e", d: "#232c24", s: "#6a6a72", t: "#4a4a54", u: "#34343c",
  c: "#3a4a8a", C: "#28346a", f: "#d8b090", w: "#e8e4d8", x: "#8a8aa0" })

const CW = 112, CH = 80, GY = 62, CLOCK = { frames: 100, fps: 20 }

// the places, one for each view: dusk, a standing stone for the target
sprite("_side", { w: CW, h: CH }, (c) => {
  c.rect(0, 0, CW, 22, "k"); c.rect(0, 22, CW, 18, "n"); c.rect(0, 40, CW, GY - 40, "m")
  c.dither(0, 20, CW, 4, "k", "n", 0.5); c.dither(0, 38, CW, 4, "n", "m", 0.5)
  c.rect(0, GY, CW, CH - GY, "g"); c.hline(0, GY, CW, "h"); c.dither(0, GY + 6, CW, CH - GY - 6, "g", "d", 0.4)
  c.rect(72, GY - 18, 10, 18, "t"); c.rect(72, GY - 18, 3, 18, "s"); c.rect(79, GY - 18, 3, 18, "u"); c.hline(72, GY - 18, 10, "s")
})
// from above: the ground all over, the stone's top and its shadow
sprite("_top", { w: CW, h: CH }, (c) => {
  c.rect(0, 0, CW, CH, "g"); c.dither(0, 0, CW, CH, "g", "d", 0.35)
  c.rect(76, 37, 10, 8, "d"); c.rect(73, 34, 10, 8, "t"); c.rect(73, 34, 10, 2, "s"); c.rect(73, 34, 2, 8, "s")
})
// isometric: a diamond of ground on the dusk, the stone standing on it
sprite("_iso", { w: CW, h: CH }, (c) => {
  c.rect(0, 0, CW, CH, "k"); c.rect(0, 0, CW, 14, "n")
  c.poly([56, 22, 112, 50, 56, 78, 0, 50], "g"); c.poly([0, 50, 56, 78, 56, 80, 0, 52], "d"); c.poly([56, 78, 112, 50, 112, 52, 56, 80], "h")
  c.poly([73, 34, 79, 31, 85, 34, 85, 48, 79, 51, 73, 48], "t"); c.poly([73, 34, 79, 37, 79, 51, 73, 48], "s"); c.poly([73, 34, 79, 31, 85, 34, 79, 37], "x")
})
// through a perspective() camera tilted down 30 degrees, as an HD-2D diorama is seen: 24 px a meter
// in the middle, the ground going back darker
const CAM = { w: CW, fov: 40, pitch: -30, eye: 3.2, horizon: CH / 2 - (CW / 2 / Math.tan((20 * Math.PI) / 180)) * Math.tan((30 * Math.PI) / 180) }
sprite("_persp", { w: CW, h: CH }, (c) => {
  const P = perspective(CAM), at = (x, z, up) => P.ground(x, z, up).map(Math.round)
  c.rect(0, 0, CW, CH, "g"); c.dither(0, 0, CW, 20, "d", "g", 0.5); c.dither(0, 50, CW, 30, "g", "h", 0.25)
  const [sx, sy] = at(0.95, 5.55, 0), [tx, ty] = at(0.95, 5.55, 0.8)
  c.rect(sx - 4, ty, 9, sy - ty, "t"); c.rect(sx - 4, ty, 2, sy - ty, "s"); c.rect(sx + 3, ty, 2, sy - ty, "u")
})

// the traveler's cast (hd2d/traveler.px.js, 13 poses of 100 ms) timed to the spell: the wind-up as it
// starts charging, held while the energy gathers, the thrust as it is cast, held while it flies (his
// hand, where the spell starts, a socket that moves with the pose), back and at rest after it hits
const CAST = [["charge", 0, 1, 100], ["charge", 2, 4], ["cast", 5], ["travel", 6], ["impact", 7, 12, 100]]
// each view, where the caster stands (his feet, on the picture) and where the target is in its world
const VIEWS = {
  side: { view: { kind: "side", origin: [0, GY] }, feet: [14, GY + 1], to: [77, 0, 10] },
  top: { view: { kind: "top", origin: [56, 40] }, feet: [20, 50], to: [22, -2, 6] },
  iso: { view: { kind: "iso", origin: [56, 50] }, feet: [26, 51], to: [11, -12, 11] },
  persp: { view: CAM, feet: perspective(CAM).ground(-1.4, 5.55, 0).map(Math.round), to: [0.95, 5.55, 0.42] },
}
const cell = (name, el, variant, where = "side", form) => {
  const v = VIEWS[where], S = spell(el, 3, { view: v.view, from: "hero.hand", to: v.to, variant, form, start: 200, seed: 5 })
  anim(name, { w: CW, h: CH, ...CLOCK }, stamp(`_${where}`, 0, 0),
    (c) => c.stamp("tr_cast_e", v.feet[0], v.feet[1], { frame: S.ability.frame(c.t, CAST, { before: 12 }), id: "hero" }), cast(S), lighting({ ambient: 0.55 }))
}
// a sheet of cells in rows, each labelled
const spellSheet = (name, rows, title = (r, i) => r[i][1]) => {
  const cols = Math.max(...rows.map((r) => r.length)), GAP = 4
  for (const row of rows) for (const [n, el, v, w, f] of row) cell(n, el, v, w, f)
  scene(name, { w: 4 + cols * (CW + GAP), h: 4 + rows.length * (CH + GAP), bg: "k", ...CLOCK, check: { every: 10 } }, (c) => {
    rows.forEach((row, r) => row.forEach(([n, el, v, w], i) => {
      const x = 4 + i * (CW + GAP), y = 4 + r * (CH + GAP)
      c.stamp(n, x, y)
      c.text(x + 3, y + 3, `${el} ${v}${w && w !== "side" ? " / " + w : ""}`, "w")
    }))
  }, post({ bloom: { levels: 4, strength: 0.6, above: 0.85 } }))
}

spellSheet("ice_earth", [
  ["spikes", "iceberg", "glacier", "blizzard", "nova"].map((v) => [`ice_${v}`, "ice", v]),
  ["spikes", "spire", "boulder", "quake", "slide"].map((v) => [`earth_${v}`, "earth", v]),
])
spellSheet("variants", [
  ["pillar", "ball", "meteor", "wave"].map((v) => [`fire_${v}`, "fire", v]),
  ["bolt", "sky", "chain"].map((v) => [`lightning_${v}`, "lightning", v]),
  ["geyser", "wave"].map((v) => [`water_${v}`, "water", v]),
  ["tornado", "blades"].map((v) => [`wind_${v}`, "wind", v]),
  ["beam", "rain"].map((v) => [`light_${v}`, "light", v]),
  ["void", "grasp"].map((v) => [`dark_${v}`, "dark", v]),
  ["sparkles", "leaves"].map((v) => [`heal_${v}`, "heal", v]),
])
spellSheet("views", [["ice", "iceberg"], ["earth", "boulder"], ["fire", "meteor"], ["lightning", "sky"]].map(([el, v]) =>
  ["side", "top", "iso", "persp"].map((w) => [`${v}_${w}`, el, v, w])))
