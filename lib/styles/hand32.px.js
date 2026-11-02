// The hand pass's common steps for a 3D draft at topdown32 (lib/profiles/topdown32.px.js: form and light from 3D,
// the final pixels by hand), for the library's 32 px entries. Functions only (no assets), declared again harmlessly
// when two included files take it: include("<path>/lib/styles/hand32.px.js").
// (A draft drawn k times over is brought down by shrink: { by: k }, its edges treated by the engine.)

// unline32(c, keys): an old line taken off the edge, so a sprite's ink lines it all round a px outside, one geometry
// every side: each edge pixel in `keys` (keys or "#hex": the line a 3D draft drew on its shadow side) takes the
// colour of the first pixel inside it not in them (across from the clear; at a corner whose line runs both ways,
// diagonally in)
function unline32(c, keys) {
  const old = new Set([...keys].map((k) => c.color(k))), on = (x, y) => x >= 0 && y >= 0 && x < c.w && y < c.h && !!c.get(x, y), to = []
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    if (!on(x, y) || !old.has(c.get(x, y))) continue
    const open = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([u, v]) => !on(x + u, y + v)), out = open.reduce((s, [u, v]) => [s[0] + u, s[1] + v], [0, 0])
    for (const [u, v] of [...open.map(([u, v]) => [-u, -v]), [-Math.sign(out[0]), -Math.sign(out[1])]]) {
      let i = 1
      while ((u || v) && on(x + i * u, y + i * v) && old.has(c.get(x + i * u, y + i * v))) i++
      if ((u || v) && on(x + i * u, y + i * v)) { to.push([x, y, c.get(x + i * u, y + i * v)]); break }
    }
  }
  for (const [x, y, k] of to) c.plot(x, y, k)
}

// even32(c): the silhouette's lone steps evened: a pixel sticking out a row or a column alone (clear on both sides
// across it and on one side along it) cut, a one-pixel notch (clear, three of its four neighbours drawn) filled with
// its neighbours' commonest color; a curve's peak that only grazes a pixel cut back
function even32(c) {
  const on = (x, y) => x >= 0 && y >= 0 && x < c.w && y < c.h && !!c.get(x, y), cut = [], fill = []
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    const u = on(x, y - 1), d = on(x, y + 1), l = on(x - 1, y), r = on(x + 1, y)
    if (on(x, y) && ((!u && !d && (!l || !r)) || (!l && !r && (!u || !d)))) cut.push([x, y])
    if (!on(x, y) && u + d + l + r >= 3) {
      const n = [[0, -1], [0, 1], [-1, 0], [1, 0]].filter(([a, b]) => on(x + a, y + b)).map(([a, b]) => c.get(x + a, y + b))
      fill.push([x, y, n.sort((a, b) => n.filter((q) => q === b).length - n.filter((q) => q === a).length)[0]])
    }
  }
  for (const [x, y] of cut) c.px(x, y, "_")
  for (const [x, y, v] of fill) c.plot(x, y, v)
  // (a slit 2-3 px long between two lobes filled as it closes: the fills again, twice)
  for (let k = 0; k < 2; k++) for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    if (on(x, y) || on(x, y - 1) + on(x, y + 1) + on(x - 1, y) + on(x + 1, y) < 3) continue
    const n = [[0, -1], [0, 1], [-1, 0], [1, 0]].filter(([a, b]) => on(x + a, y + b)).map(([a, b]) => c.get(x + a, y + b))
    c.plot(x, y, n.sort((a, b) => n.filter((q) => q === b).length - n.filter((q) => q === a).length)[0])
  }
  // a curve's outermost run shorter than each run beside it (a bulge's peak just grazing a pixel's middle:
  // 8 4 6 down a side, where the runs grow to the peak) cut back, along both sides of each row and each column
  for (const across of [false, true]) for (const end of [0, 1]) {
    const n = across ? c.w : c.h, edge = []
    for (let i = 0; i < n; i++) {
      const xs = [...Array(across ? c.h : c.w).keys()].filter((j) => (across ? on(i, j) : on(j, i)))
      edge.push(xs.length ? (end ? xs.at(-1) : -xs[0]) : null)
    }
    const runs = []
    for (let i = 0; i < n; i++) if (edge[i] !== null) { const r = runs.at(-1); if (r && r.v === edge[i] && r.to === i - 1) r.to = i; else runs.push({ v: edge[i], from: i, to: i }) }
    runs.forEach((r, k) => {
      const a = runs[k - 1], b = runs[k + 1], len = (q) => q.to - q.from + 1
      if (a && b && a.to === r.from - 1 && b.from === r.to + 1 && r.v === a.v + 1 && r.v === b.v + 1 && len(r) < Math.min(len(a), len(b)))
        for (let i = r.from; i <= r.to; i++) { const j = end ? r.v : -r.v; c.px(across ? i : j, across ? j : i, "_") }
    })
  }
}
