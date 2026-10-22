// Craft: how a drawn thing is built, read off its pixels (a tree's crown, a bush, a rock, a house), for
// study to put next to its sizes and colors and for an agent to hold its own drawing against: the
// clusters it is painted in (patches of one color), where its lights and darks sit inside it, how
// bumpy its outline is, the tones it takes and where their hue turns from dark to light, how much of
// its inside is deep shadow, and which way its strokes run. What a reader of the games' trees takes
// in by eye (leaves in clusters of a few pixels lit on their upper left, an outline in lobes, shadows
// gone blue and lights gone yellow) put in numbers.
import { type Color } from "./color.ts";
import type { Img } from "./image.ts";
import { lch } from "./vision.ts";

export interface Craft {
  w: number; h: number; px: number; tones: number;
  /** the median and the 90th percentile of its one-color patches' sizes (4-connected), in px; its single pixels' share */
  cluster: number; cluster90: number; singles: number;
  /** where its lightest and darkest fifths sit from its middle, as a share of its half size ([-1, 1], y down) */
  light: [number, number]; dark: [number, number];
  /** turns of its outline per 10 px of it (lobes and tufts: many; a cut shape: few) */
  bumps: number;
  /** the hue from its darkest tone to its lightest: degrees turned, and toward what */
  shift: number; warm: boolean | null;
  /** the share of its inside (off the edge) in its two darkest tones */
  deep: number;
  /** of neighbors of one color, the share across, down and on the diagonals */
  strokes: [number, number, number];
}

/** The craft of the thing whose pixels `inside(x, y)` picks in `img`, within its box. */
export function craft(img: Img, x0: number, y0: number, x1: number, y1: number, inside: (c: Color) => boolean): Craft | null {
  const w = x1 - x0 + 1, h = y1 - y0 + 1, at = (x: number, y: number) => (x < x0 || y < y0 || x > x1 || y > y1 ? 0 : img.data[y * img.w + x]);
  const on = (x: number, y: number) => { const c = at(x, y); return c !== 0 && inside(c); };
  const pts: [number, number, number][] = [], tones = new Map<Color, number>();
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (on(x, y)) { const c = at(x, y), L = lch(c).L; pts.push([x, y, L]); tones.set(c, L); }
  if (pts.length < 40) return null;
  // patches of one color
  const seen = new Uint8Array(w * h), sizes: number[] = [], st: [number, number][] = [];
  for (const [sx, sy] of pts) {
    if (seen[(sy - y0) * w + sx - x0]) continue;
    const c = at(sx, sy);
    let n = 0;
    seen[(sy - y0) * w + sx - x0] = 1; st.push([sx, sy]);
    while (st.length) {
      const [x, y] = st.pop()!;
      n++;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const X = x + dx, Y = y + dy;
        if (X < x0 || Y < y0 || X > x1 || Y > y1 || seen[(Y - y0) * w + X - x0] || at(X, Y) !== c || !on(X, Y)) continue;
        seen[(Y - y0) * w + X - x0] = 1; st.push([X, Y]);
      }
    }
    sizes.push(n);
  }
  sizes.sort((a, b) => a - b);
  // lights and darks: the centroids of the lightest and darkest fifths, from the middle of all
  const byL = [...pts].sort((a, b) => a[2] - b[2]), k = Math.max(1, Math.floor(pts.length / 5));
  const mid = (s: typeof pts) => [s.reduce((t, p) => t + p[0], 0) / s.length, s.reduce((t, p) => t + p[1], 0) / s.length];
  const [mx, my] = mid(pts), rel = (s: typeof pts): [number, number] => { const [x, y] = mid(s); return [(x - mx) / (w / 2), (y - my) / (h / 2)]; };
  // the outline: per row its two ends, per column its two; a turn where the end's step changes sign
  let turns = 0, edge = 0;
  const ends = (n: number, get: (i: number) => [number, number] | null) => {
    let prevL: number | null = null, prevR: number | null = null, dl = 0, dr = 0;
    for (let i = 0; i < n; i++) {
      const e = get(i);
      if (!e) continue;
      edge += 2;
      if (prevL !== null) { const a = Math.sign(e[0] - prevL); if (a && dl && a !== dl) turns++; if (a) dl = a; }
      if (prevR !== null) { const b = Math.sign(e[1] - prevR); if (b && dr && b !== dr) turns++; if (b) dr = b; }
      prevL = e[0]; prevR = e[1];
    }
  };
  const rowEnds = (y: number): [number, number] | null => { let l = -1, r = -1; for (let x = x0; x <= x1; x++) if (on(x, y)) { if (l < 0) l = x; r = x; } return l < 0 ? null : [l, r]; };
  const colEnds = (x: number): [number, number] | null => { let t = -1, b = -1; for (let y = y0; y <= y1; y++) if (on(x, y)) { if (t < 0) t = y; b = y; } return t < 0 ? null : [t, b]; };
  ends(h, (i) => rowEnds(y0 + i)); ends(w, (i) => colEnds(x0 + i));
  // the ramp: the darkest tone's hue against the lightest's (both coloured enough to have one)
  const ts = [...tones].sort((a, b) => a[1] - b[1]), chroma = ts.filter(([c]) => lch(c).C > 0.03);
  let shift = 0, warm: boolean | null = null;
  if (chroma.length >= 2) {
    const d = lch(chroma[0][0]).h, l = lch(chroma[chroma.length - 1][0]).h;
    shift = Math.abs(((l - d + 540) % 360) - 180);
    // toward yellow (about 110 in OKLCH) or away from it
    const toYellow = (hh: number) => Math.abs(((hh - 110 + 540) % 360) - 180);
    warm = shift >= 8 ? toYellow(l) < toYellow(d) : null;
  }
  // the inside's deep shadow: off the edge, in the two darkest tones
  const darkest = new Set(ts.slice(0, 2).map(([c]) => c));
  let innerN = 0, deepN = 0, hor = 0, ver = 0, dia = 0;
  for (const [x, y] of pts) {
    const c = at(x, y);
    if (on(x - 1, y) && on(x + 1, y) && on(x, y - 1) && on(x, y + 1)) { innerN++; if (darkest.has(c)) deepN++; }
    if (at(x + 1, y) === c && on(x + 1, y)) hor++;
    if (at(x, y + 1) === c && on(x, y + 1)) ver++;
    if ((at(x + 1, y + 1) === c && on(x + 1, y + 1)) || (at(x - 1, y + 1) === c && on(x - 1, y + 1))) dia++;
  }
  const s = hor + ver + dia || 1;
  return {
    w, h, px: pts.length, tones: tones.size, cluster: sizes[sizes.length >> 1], cluster90: sizes[Math.floor(sizes.length * 0.9)], singles: sizes.filter((v) => v === 1).length / sizes.length,
    light: rel(byL.slice(-k)), dark: rel(byL.slice(0, k)), bumps: (10 * turns) / Math.max(1, edge), shift, warm,
    deep: innerN ? deepN / innerN : 0, strokes: [hor / s, ver / s, dia / s],
  };
}

const way = ([x, y]: [number, number]) => {
  if (Math.hypot(x, y) < 0.08) return "in the middle";
  const a = (Math.atan2(-y, x) * 180) / Math.PI, names = ["right", "upper right", "top", "upper left", "left", "lower left", "bottom", "lower right"];
  return `${names[Math.round((((a % 360) + 360) % 360) / 45) % 8]} (${Math.round(Math.hypot(x, y) * 100)}% out)`;
};

/** One line of what a thing's craft is. */
export function craftLine(c: Craft): string {
  const [hh, vv, dd] = c.strokes, run = vv > hh * 1.3 && vv > dd ? "down (blades, streaks)" : hh > vv * 1.3 && hh > dd ? "across (strata, planks)" : dd > Math.max(hh, vv) ? "on the diagonals (leaves, needles)" : "every way (clusters)";
  return `${c.w}x${c.h}, ${c.tones} tones: painted in patches of ${c.cluster} px (90% under ${c.cluster90}; ${Math.round(c.singles * 100)}% single pixels); lights at its ${way(c.light)}, darks at its ${way(c.dark)}; outline turns ${c.bumps.toFixed(1)} times in 10 px; ${Math.round(c.deep * 100)}% of its inside deep shadow; strokes run ${run}${c.warm === null ? "" : `; its hue turns ${Math.round(c.shift)}° from dark to light, ${c.warm ? "warmer (shadows cool, lights toward yellow)" : "cooler"}`}.`;
}
