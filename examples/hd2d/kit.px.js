// HD-2D kit: what the hd2d scenes share (plaza.px.js, graveyard.px.js), taken with
// include("kit.px.js", { palette: true }): a palette, textures 16x16 tiling at 16 texels to the meter
// for mesh() materials, props drawn to stand in a mesh() as sprites, and two helpers: a camera high up
// through a long lens, and blocks in meters.
pal({ k: "#1a1620" })
shades("1234", "#8d8070")   // cobbles: the gaps, the stones, their lit edges
shades("5678", "#857467")   // the wall's stone and its mortar
pal({ Q: "#375f34", q: "#4a7438", w: "#567e3c", e: "#6a9145", r: "#86a855" })   // grass: steps close together,
ramps("Qqwer")                                                                    // a quiet ground
shades("asdf", "#8a5a36")   // planks, trunks
shades("ZzxcvVJ", "#2f6a45", { hue: 40, sat: 0.25 })   // pine needles: a deep blue-green to a yellow one
shades("ghjl", "#4f8a3a", { hue: 30, sat: 0.2 })   // bushes
pal({ y: "#fff3c4", Y: "#ffd27a" })   // a lamp's glass: brighter than anything lit, for the bloom

// Cobbles: rows of stones 3 px tall over a 1 px gap, each row's stones of its own widths (16 in all,
// so it tiles), their corners softened, lit on their upper left edges, a stone in five a shade off.
sprite("_cobble", { w: 16, h: 16 }, (c) => {
  ;[[5, 5, 6], [6, 5, 5], [4, 6, 6], [5, 6, 5]].forEach((ws, r) => {
    let x = (r * 3) % 16
    ws.forEach((w, s) => {
      const tone = Math.floor(hash(r, s) * 5) === 0 ? "2" : "3"
      for (let i = 0; i < w; i++) for (let j = 0; j < 4; j++) {
        const X = (x + i) % 16, Y = r * 4 + j
        // the gaps, the stone's lower right corner rounded into them, its upper left edges lit
        const gap = j === 3 || i === w - 1 || (i === w - 2 && j === 2)
        c.px(X, Y, gap ? "1" : i === 0 && j === 0 ? tone : j === 0 || i === 0 ? "4" : tone)
      }
      x += w
    })
  })
})
// Ashlar: blocks 7x3 over 1 px of mortar, every other course moved half a block.
sprite("_wall", { w: 16, h: 16 }, (c) => {
  for (let Y = 0; Y < 16; Y++) for (let X = 0; X < 16; X++) {
    const r = Y >> 2, x = (X + (r % 2) * 4) % 8, j = Y % 4
    c.px(X, Y, j === 3 || x === 7 ? "6" : j === 0 ? "8" : j === 2 ? "5" : Math.floor(hash(r, (X + (r % 2) * 4) >> 3) * 4) ? "7" : "6")
  }
})
// Grass as CrossCode and Chrono Trigger draw it, for a floor laid a texel to a pixel (camera.floor): the
// ground all blades, in clumps, no bare base between them; a blade two or three pixels, upright, leaning
// out of its clump, a tone above the ground at its tip and a pixel a tone below under it (its shadow);
// the ground a tone lighter or darker in broad patches (fbm made seamless over the tile, 64x48, so it
// tiles). Few bright tips: from up here they read as dots.
sprite("_grass", { w: 64, h: 48 }, (c) => {
  const r = rng(11), K = "Qqwer", W = 64, H = 48, wx = (v) => ((v % W) + W) % W, wy = (v) => ((v % H) + H) % H
  const patch = seamless((x, y) => fbm(x / 15, y / 12, 3), W, H)
  const tone = (x, y) => (patch(wx(x), wy(y)) + (bayer(wx(x), wy(y)) - 0.5) * 0.1 < 0.48 ? 1 : 2)
  const at = (x, y, k) => c.px(wx(x), wy(y), k)
  for (let Y = 0; Y < H; Y++) for (let X = 0; X < W; X++) c.px(X, Y, K[tone(X, Y)])
  for (let k = 0; k < 190; k++) {
    const cx = Math.floor(r() * W), cy = Math.floor(r() * H), n = 3 + Math.floor(r() * 3)
    for (let b = 0; b < n; b++) {
      const lean = b - (n - 1) / 2, x = cx + Math.round(lean), y = cy + Math.round(r()), t = tone(x, y), len = 2 + (r() < 0.6 ? 1 : 0)
      at(x, y + len, K[t - 1])
      for (let i = 0; i < len; i++) at(x + Math.round((lean * (len - 1 - i)) / 3), y + i, K[Math.min(4, t + 1 + (i === 0 && r() < 0.03 ? 1 : 0))])
    }
  }
})
// Planks running across, a dark seam under each, nail heads at the ends.
sprite("_planks", { w: 16, h: 16 }, (c) => {
  for (let Y = 0; Y < 16; Y++) for (let X = 0; X < 16; X++)
    c.px(X, Y, Y % 4 === 3 ? "a" : (X === 1 || X === 14) && Y % 4 === 1 ? "a" : Y % 4 === 0 ? "f" : "d")
})
// A pine, 2.7 m, built as the games' trees are (study reads them: clusters of 2-3 px, lit on the upper
// left, an outline in lobes, little deep shadow): six tiers of boughs, the lower drawn first so each
// hangs over the one below and its hem stands out past it; a hem in festoons, a bough every 5 px,
// the outer ones drooping; a tier's top lit where it faces the sun (upper left), dark toward its hem
// and on the far side, in the shadow of the tier above; needles in strands running down and out.
// Seven tones from a deep blue-green to a yellow one, the darkest drawing the hems. Its normals from
// its drawing.
sprite("_pine", { w: 38, h: 68, pivot: "bottom" }, (c) => {
  const cx = 19, T = 6, KEYS = "ZzxcvVJ"
  const tier = (t) => { const top = 1 + Math.round(t * 9), bot = top + 13; return { top, bot, half: 4 + t * 2.7 } }
  for (let t = T - 1; t >= 0; t--) {
    const { top, bot, half } = tier(t), above = t ? tier(t - 1) : null
    for (let x = Math.floor(cx - half - 2); x <= Math.ceil(cx + half + 2); x++) {
      const d = x + 0.5 - cx, side = d / half
      // the hem at this column: festoons between boughs, the outer boughs lower
      const hem = bot - Math.round(2 * Math.abs(Math.sin((Math.PI * (d + t * 1.7)) / 5))) + Math.round(2.5 * side * side)
      for (let y = top; y <= hem; y++) {
        const f = (y - top) / Math.max(1, bot - top), hw = half * (0.3 + 0.7 * Math.pow(Math.min(1, f), 0.75))
        if (Math.abs(d) > hw + (y >= hem - 1 ? 1 : 0)) continue
        const v = (y - top) / Math.max(1, hem - top)
        let L = 0.78 - 0.34 * side - 0.62 * v
        if (above && y <= above.bot + 2 && Math.abs(d) <= above.half + 1) L -= 0.3   // under the tier above
        // strands of needles, down and out
        if ((((y - Math.abs(Math.round(d)) * (d < 0 ? 1 : 1)) % 3) + 3) % 3 === 0) L += 0.12
        if (y === hem || (side > 0.55 && Math.abs(d) > hw - 1)) L = Math.min(L, 0.08)   // the hem and the shaded edge drawn dark
        c.px(x, y, KEYS[Math.max(0, Math.min(6, Math.round(L * 6)))])
      }
    }
  }
  // the trunk under the lowest tier, its roots spreading on the ground
  for (let y = 60; y < 68; y++) for (let x = 17; x <= 20; x++) c.px(x, y, x === 17 ? "f" : x === 20 ? "a" : y < 62 ? "a" : "s")
  for (const [x, y] of [[15, 67], [16, 66], [21, 66], [22, 67], [14, 67]]) c.px(x, y, "s")
}, bump("hybrid"))
// A bush of lobes, the front ones lower and drawn last; each lobe lit on its upper left and dark
// toward its lower right, so the mass reads as clusters and not one blob.
sprite("_bush", { w: 16, h: 10, pivot: "bottom", outline: "k", selout: true }, (c) => {
  for (const [x, y, r] of [[10, 4, 3.6], [5, 4.5, 3.4], [8, 6, 3.8], [3.5, 6.5, 2.6], [12.5, 6.5, 2.6]]) {
    for (let Y = 0; Y < 10; Y++) for (let X = 0; X < 16; X++) {
      const dx = X + 0.5 - x, dy = (Y + 0.5 - y) * 1.15, d = Math.hypot(dx, dy)
      if (d > r) continue
      const L = 0.45 - 0.45 * (dx + dy) / r - 0.25 * (d / r) ** 4
      c.px(X, Y, "ghjl"[Math.max(0, Math.min(3, Math.round(L * 3)))])
    }
  }
}, bump("hybrid"))
// A lamp: a pole of dark iron, a lantern of glass on top under a cap.
sprite("_lamp", { w: 7, h: 30, pivot: "bottom" }, rect(3, 8, 1, 22, "k"), rect(1, 28, 5, 2, "k"),
  rect(1, 1, 5, 1, "k"), rect(1, 2, 5, 5, "Y"), rect(2, 3, 3, 3, "y"), rect(0, 7, 7, 1, "k"))

// A camera high up through a long lens: tilted `pitch` degrees, `fov` across, `ppm` px to the meter
// where it looks (the picture's middle, on the ground `z` m ahead, `dist` m from the eye along its
// axis: where post() focuses by default); view(k) for a picture k times as big.
const hd2dCamera = ({ w, h, pitch, fov, ppm }) => {
  const rad = Math.PI / 180, focal = w / 2 / Math.tan((fov / 2) * rad), dist = focal / ppm
  // texels to lay textures a texel to a pixel where it looks: on the floor (foreshortened down) and on walls
  const floor = [1 / ppm, 1 / (ppm * Math.sin(-pitch * rad))], wall = [1 / ppm, 1 / (ppm * Math.cos(-pitch * rad))]
  return { dist, floor, wall, z: dist * Math.cos(-pitch * rad), view: (k = 1) => ({ w: w * k, fov, pitch, eye: dist * Math.sin(-pitch * rad), horizon: (h / 2 + focal * Math.tan(pitch * rad)) * k }) }
}
// A block into model m, from (x0, z0) to (x1, z1), u0 to u1 m up: its top of one material, its sides of another.
const hd2dBlock = (m, top, side, x0, z0, x1, z1, u0, u1) => {
  m.face(top, [x0, z0, u1], [x1, z0, u1], [x1, z1, u1], [x0, z1, u1])
  for (const [a, b] of [[[x0, z0], [x1, z0]], [[x0, z1], [x1, z1]], [[x0, z0], [x0, z1]], [[x1, z0], [x1, z1]]])
    m.face(side, [...a, u0], [...b, u0], [...b, u1], [...a, u1])
}
