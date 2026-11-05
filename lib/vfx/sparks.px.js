// Hit sparks for a fighting game seen from the side (lib/profiles/fighting.px.js), sized for its 110 px fighters by
// the library's fighting study (KOF '98's and 2002's sparks, Garou's and CvS's, measured for numbers only, never their
// pixels): an engine draws one where a hit lands (the hit box's front), over both fighters, through the hitstop. The
// flash is the hit: a burst of rays round a white-hot core, half its size on the first tick and the whole of it on the
// next two (KOF's grow in 2-4), its rays then breaking off and thinning, then sparks from an emitter's burst, streaked
// along their way and cooling as they fly (white, yellow, orange, red), 13 ticks in all (KOF's 10-13 of a tick); its
// glow baked as `aura` bands round the burst (a sheet carries no bloom). spark_l a light hit's, 44 px across (0.4 of a
// fighter's height), 8 rays; spark_h a heavy hit's or a special's, 64 px (0.58), 12 rays and a ring on its third tick;
// spark_block a blocked hit's, 44 px, cold (white and blues), flattened, the guard's edge lit, its sparks thrown back
// the way the blow came (left: flip it for a blow from the right), 10 ticks. For any scene:
// include("<path>/lib/vfx/sparks.px.js", { as: "sparks" }), its palette its own; the pivot is the hit point.
pal({ w: "#fffbea", e: "#ffe27a", o: "#f6a03c", r: "#c9472d", b: "#c6ecff", c: "#66b0ec", n: "#2f5cae" })
ramps("roew", "ncbw")
{
// (a star of n rays round (x, y), its tips R out, each a little its own length, its notches r; flattened by `flat`)
const star = (x, y, R, r, n, rot, flat) => Array.from({ length: 2 * n }, (_, i) => { const a = rot + (Math.PI * i) / n, L = i % 2 ? r : R * (0.82 + (0.18 * ((i * 7) % 5)) / 4)
  return [x + Math.cos(a) * L, y + Math.sin(a) * L * flat] }).flat()
// (a crescent's shape: inside an ellipse rx x ry, outside the same one d px back)
const crescent = (c, cx, cy, rx, ry, d, k) => { for (let y = Math.floor(cy - ry); y <= cy + ry; y++) { const v = (y + 0.5 - cy) / ry; if (Math.abs(v) >= 1) continue
  const half = rx * Math.sqrt(1 - v * v); if (half < 1.5) continue
  for (let x = Math.floor(cx + half - Math.min(d, 2 * half)); x < cx + half; x++) c.px(x, y, k) } }
// a spark R px in radius: `keys` its ramp dark to light, n rays, `flat`, `rot` the first ray's way, `angle` and `spread`
// where its sparks fly, `ring` a shock ring on its third tick, `edge` a shape lit with the burst, `ticks` long
const spark = (name, R, n, keys, { flat = 1, rot = -Math.PI / 2, angle = 0, spread = 180, ring = false, edge, ticks = 13, seed = 3 } = {}) =>
  anim(name, { w: 2 * R + 10, h: 2 * R + 10, pivot: [R + 5, R + 5], frames: ticks, fps: 60, loop: false }, (c) => {
    const x = R + 5, y = R + 5, f = c.frame, E = emitter({ at: [x, y], burst: n + 4, from: 33, life: [110, 190], speed: [R * 5, R * 9], angle, spread, drag: 3, seed })
    const burst = (s, a) => { c.poly(star(x, y, R * s, R * s * 0.3, n, a, flat), keys[1]); c.poly(star(x, y, R * s * 0.72, R * s * 0.2, n, a, flat), keys[2])
      c.poly(star(x, y, R * s * 0.42, R * s * 0.14, n, a, flat), keys[3]); c.circ(x, y, Math.max(1, Math.round(R * s * 0.16)), keys[3]) }
    if (f === 0) burst(0.55, rot)
    else if (f <= 2) { burst(f === 1 ? 0.92 : 1, rot + (f === 2 ? Math.PI / n / 3 : 0)); if (ring && f === 2) c.ellipse(x, y, Math.round(R * 0.95), Math.round(R * 0.95 * flat), keys[2], true) }
    else if (f <= 4) for (let i = 0; i < n; i++) { const a = rot + (2 * Math.PI * i) / n, L = R * (0.82 + (0.18 * ((2 * i * 7) % 5)) / 4), [s0, s1] = f === 3 ? [0.45, 1] : [0.7, 1.05]
      c.line(Math.round(x + Math.cos(a) * L * s0), Math.round(y + Math.sin(a) * L * s0 * flat), Math.round(x + Math.cos(a) * L * s1), Math.round(y + Math.sin(a) * L * s1 * flat), f === 3 ? keys[2] : keys[1], f === 3 ? 2 : 1) }
    if (f === 3) c.circ(x, y, Math.round(R * 0.12), keys[3])
    if (edge && f >= 1 && f <= 3) edge(c, x, y, R)
    if (f >= 2) c.particles(E, [...keys].reverse().join(""), { trail: 40, size: [2, 1] })
    if (f <= 3) c.effect("aura", { color: keys[1] + keys[0], width: 2, fade: 0.45, keep: true }) })
spark("spark_l", 22, 8, "roew")
card("spark_l", { is: "a light hit's spark for a fighting game, 44 px across: a burst of 8 rays round a white-hot core, grown in a tick, held, its rays breaking off, then sparks streaking out and cooling; its glow baked; 13 ticks; no line", cells: { "side/?": "✓" } })
spark("spark_h", 32, 12, "roew", { ring: true, seed: 5 })
card("spark_h", { is: "a heavy hit's or a special's spark for a fighting game, 64 px across: a burst of 12 rays round a white-hot core and a shock ring, its rays breaking off, then sparks streaking out and cooling; its glow baked; 13 ticks; no line", cells: { "side/?": "✓" } })
spark("spark_block", 22, 7, "ncbw", { flat: 0.8, rot: Math.PI * 0.62, angle: 180, spread: 70, ticks: 10, seed: 7, edge: (c, x, y, R) => crescent(c, x - 3, y, 5, R * 0.75, 3, "b") })
card("spark_block", { is: "a blocked hit's spark for a fighting game, 44 px across, cold: a flattened burst of 7 rays, the guard's edge lit, sparks thrown back the way the blow came (left: flip it for a blow from the right); its glow baked; 10 ticks; no line", cells: { "side/?": "✓" } })
}
