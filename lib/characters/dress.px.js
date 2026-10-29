// What a figure wears on a rig3d() skeleton, part by part: dress(outfit) gives rig3d()'s `parts`. The traveler's
// painter (traveler.px.js, traveler.dress) in a file of its own, so a figure dressed by it doesn't build the
// traveler's figures (the top-down hero, hero.px.js; the hd2d crew and the miko take it through the traveler). It
// makes no assets, and its names are functions, declared again harmlessly when a scene includes it twice (by the
// traveler and by the hero). Taken with include("<path>/lib/characters/dress.px.js").
// An outfit (ramps dark to light): the legs' trousers down to `cuff` of the shin and what shows under them (boots,
// or bare skin), the feet; drapes swept round the body from a height down a length (a cloak behind, a
// coat open at the front, a long skirt), trailing as he walks by `trail`; the shirt's skirt at the
// hips and its body (a key or ramp by height and angle: stripes, a vest, the belt), carried along the
// spine as he leans, kneels or bows (`spine: false`: round an upright through the hips); drapes over it
// (an apron); the sleeves to the elbow, the forearms, the hands. `creases: true`: a pair of accents only
// where a joint bends, the traveler's own (parts3m): past 60 degrees at the knee (a step, a kneel; not the idle's
// breath) the hollow behind it in the trousers' darkest and the kneecap in their lightest, past 45 at the
// elbow its inside in the sleeve's darkest and the forearm's top in its lightest; `{ deep, lit }`: those
// two keys instead, to see where they land.
// The outfit painted on the figure (parts for rig3d): the far limbs a step darker; each drape a cloth
// hung from its top (the chest's, or the hips' with base "pelvis"), trailing behind as he walks, more
// toward the hem, and swinging aside a little after the legs.
function dress(o) {
  const bend = dress.bend
  return (j, p) => {
    const C = o.creases, deep = (r) => C.deep ?? r[0], lit = (r) => C.lit ?? r.at(-1)
    const farLeg = j.depth(j.legs[0].hip) < j.depth(j.legs[1].hip) ? 0 : 1, farArm = j.depth(j.arms[0].sh) < j.depth(j.arms[1].sh) ? 0 : 1
    const waist = j.pelvis[2] + 1.4, hips = [j.pelvis[0], j.pelvis[1], 0], top = j.chest[2] + 0.5, lean = j.chest.map((v, e) => v - j.pelvis[e])
    // (spine: each height of the shirt's body carried along the spine, pelvis to chest)
    const along = (h) => { const t = (waist + h * (top - waist) - j.pelvis[2]) / lean[2]; return [lean[0] * t, lean[1] * t] }
    const drape = (D) => {
      const top = D.top(j), trail = (h) => { const down = 1 - h; return [0, 1].map((e) => j.f[e] * -(0.3 + 1.1 * p.trail) * down * D.trail + j.r[e] * 0.9 * p.sway * down ** 1.5 * D.trail) }
      return j.sweep(D.base === "pelvis" ? hips : [j.chest[0], j.chest[1], 0], top - D.len, top, D.radius, { keep: D.keep, shift: trail, shell: 0.4, paint: typeof D.out === "function" ? D.out : (h, a, out) => (out ? D.out : D.in) })
    }
    return {
      ...Object.fromEntries(j.legs.map((L, i) => {
        const g = o.legs(i === farLeg), shin = (h) => (h < o.cuff ? g.tr : g.shin), bent = C && bend(L.hip, L.knee, L.ankle) > 60
        return [`leg${i}`, [j.limb(L.hip, L.knee, 1.6, 1.5, bent ? (h, a) => (h < 0.75 ? g.tr : Math.abs(a) > 2.2 ? deep(g.tr) : Math.abs(a) < 0.8 && h > 0.85 ? lit(g.tr) : g.tr) : g.tr),
          j.limb(L.knee, L.ankle, 1.5, 1.4, bent ? (h, a) => (h < 0.15 && Math.abs(a) > 2.2 ? deep(g.tr) : h < 0.14 && Math.abs(a) < 0.8 ? lit(g.tr) : shin(h)) : shin), j.ball(L.foot, [1.6, 2.3, 1.1], g.foot)]]
      })),
      ...Object.fromEntries(o.drapes.map((D, k) => [k ? "drape" + k : "cloak", drape(D)])),
      // (the belt a pixel and more, so a pixel's middle falls on it)
      tunic: [j.sweep(hips, waist - 2.4, waist, (h) => 3.6 + 0.6 * (1 - h), { paint: o.skirt }), j.sweep(hips, waist, top, (h, a) => (4 - 0.5 * h * h) * (0.84 + 0.16 * Math.abs(Math.sin(a))), { ...(o.spine !== false ? { shift: along } : {}), paint: (h, a, out) => o.body(h < 0.14 ? 0 : h, a, out) })],
      ...Object.fromEntries(o.over.map((D, k) => ["over" + k, drape(D)])),
      ...Object.fromEntries(j.arms.map((A, i) => {
        const far = i === farArm, s = o.sleeve(far), f = o.fore(far), bent = C && bend(A.sh, A.elbow, A.hand) > 45
        return [`arm${i}`, [j.limb(A.sh, A.elbow, 1.1, 1, bent ? (h, a) => (h > 0.8 && Math.abs(a) < 1.2 ? deep(s) : s) : s),
          j.limb(A.elbow, A.hand, 1, 0.9, bent ? (h, a) => (h < 0.15 && Math.abs(a) < 0.9 ? lit(f) : f) : f), j.ball(A.hand, 1, o.hand(far))]]
      })),
    }
  }
}
// how far a joint bends, in degrees (0 straight)
dress.bend = (a, b, c) => { const u = b.map((v, e) => v - a[e]), w = c.map((v, e) => v - b[e]), d = (x, y) => x[0] * y[0] + x[1] * y[1] + x[2] * y[2]; return (Math.acos(Math.min(1, d(u, w) / Math.sqrt(d(u, u) * d(w, w)))) * 180) / Math.PI }
