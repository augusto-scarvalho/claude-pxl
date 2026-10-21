// What a picture is made of, measured: the grid of an upscaled drawing, its palette and ramps, the
// pixel-art techniques in it (outlines, dithering, anti-aliasing, where the light comes from), the
// lines of its perspective and where they meet, and in an animation how things move (a cycle, planes
// going by at their own speeds, a scene opening out from the point it moves toward). `pxl study`
// turns these numbers into a report (study.ts); each function here is only a measurement.
import { type Color, TRANSPARENT, channels, oklab, pack } from "./color.ts";
import { Img } from "./image.ts";

const LAB = new Map<Color, [number, number, number]>();
export const lab = (c: Color) => { let v = LAB.get(c); if (!v) { if (LAB.size > 200000) LAB.clear(); v = oklab(c); LAB.set(c, v); } return v; };
// (sqrt, not Math.hypot: hypot guards against overflow these never reach, at several times the cost)
export const dE = (a: Color, b: Color) => { const p = lab(a), q = lab(b), x = p[0] - q[0], y = p[1] - q[1], z = p[2] - q[2]; return Math.sqrt(x * x + y * y + z * z); };
/** OKLCH: lightness 0..1, chroma, hue in degrees (red ~30, yellow ~110, green ~145, cyan ~195, blue ~265, magenta ~330). */
export const lch = (c: Color) => { const [L, a, b] = lab(c); return { L, C: Math.hypot(a, b), h: ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360 }; };
const clear = (c: Color) => (c & 255) < 128;

// ---------------------------------------------------------------- the grid
export interface Grid { sx: number; sy: number; ox: number; oy: number }
/**
 * How big the drawing's pixels are in the image (an upscale), and where its grid starts. Exact copies
 * first: of all the places where the color jumps from one pixel to the next, the share on the lines
 * of each whole-pixel grid; the biggest size whose grid takes nearly all of them. Then blurred or
 * compressed ones (a video of a game, a JPEG, a scale by 2.5): the periods the change between
 * neighbors repeats at (its spectrum), and of those the biggest whose grid still catches nearly as
 * much of the change as the best one does: the drawing's pixel, not a harmonic of it (4 px, where 2
 * would do as well) or a beat (5, where 2.5 takes every line).
 */
export function findGrid(img: Img, size?: number): Grid {
  const big = (a: Color, b: Color) => { if (clear(a) !== clear(b)) return true; const p = channels(a), q = channels(b); return Math.max(Math.abs(p[0] - q[0]), Math.abs(p[1] - q[1]), Math.abs(p[2] - q[2])) > 24; };
  const cols = new Float64Array(img.w), rows = new Float64Array(img.h);
  for (let y = 0; y < img.h; y++) for (let x = 0; x + 1 < img.w; x++) if (big(img.data[y * img.w + x], img.data[y * img.w + x + 1])) cols[x + 1]++;
  for (let y = 0; y + 1 < img.h; y++) for (let x = 0; x < img.w; x++) if (big(img.data[y * img.w + x], img.data[(y + 1) * img.w + x])) rows[y + 1]++;
  const exact = (prof: Float64Array): [number, number] => {
    const total = prof.reduce((s, v) => s + v, 0);
    if (total < 40) return [1, 0];
    for (let s = 16; s >= 2; s--) {
      if (prof.length < s * 8) continue;
      let top = 0, at = 0;
      for (let o = 0; o < s; o++) { let n = 0; for (let b = o; b < prof.length; b += s) n += prof[b]; if (n > top) { top = n; at = o; } }
      if (top / total >= 0.92) return [s, at];
    }
    return [1, 0];
  };
  if (size) {
    // a size given (a blurred copy read at a harmonic of its pixel): the offset whose lines catch the most change
    const off = (prof: Float64Array) => {
      let bo = 0, bv = -1;
      for (let o = 0; o < size; o += 0.25) {
        let v = 0;
        for (let x = 0; x < prof.length; x++) { const ph = (((x - o) % size) + size) % size, d = Math.min(ph, size - ph); if (d < 0.5) v += prof[x] * (0.5 - d); }
        if (v > bv) { bv = v; bo = o; }
      }
      return bo;
    };
    return { sx: size, sy: size, ox: off(cols), oy: off(rows) };
  }
  let [sx, ox] = exact(cols), [sy, oy] = exact(rows);
  if (sx > 1 && sy > 1) return { sx, sy, ox, oy };
  // the change in lightness between neighbors, column by column and row by row
  const L = new Float32Array(img.w * img.h);
  for (let i = 0; i < L.length; i++) L[i] = clear(img.data[i]) ? 0 : lab(img.data[i])[0];
  const pc = new Float64Array(img.w), pr = new Float64Array(img.h);
  for (let y = 0; y < img.h; y++) for (let x = 1; x < img.w; x++) pc[x] += Math.abs(L[y * img.w + x] - L[y * img.w + x - 1]);
  for (let y = 1; y < img.h; y++) for (let x = 0; x < img.w; x++) pr[y] += Math.abs(L[y * img.w + x] - L[(y - 1) * img.w + x]);
  const fuzzy = (prof: Float64Array): [number, number] => {
    const N = prof.length, total = prof.reduce((s, v) => s + v, 0);
    if (total <= 0 || N < 32) return [1, 0];
    const P = (s: number) => { let re = 0, im = 0; for (let x = 0; x < N; x++) { const a = (2 * Math.PI * x) / s; re += prof[x] * Math.cos(a); im += prof[x] * Math.sin(a); } return [Math.hypot(re, im) / total, Math.atan2(im, re)]; };
    const ss: number[] = [], ps: number[][] = [];
    for (let k = 0; k <= 1400; k++) { const s = 2 + k * 0.01; if (N < s * 8) break; ss.push(s); ps.push(P(s)); }
    const share = (s: number, o: number) => { let cap = 0; for (let x = 0; x < N; x++) { const ph = (((x - o) % s) + s) % s; if (Math.min(ph, s - ph) <= 0.5) cap += prof[x]; } return cap / total; };
    const cands: [number, number, number][] = [];
    for (let i = 0; i < ss.length; i++) {
      const v = ps[i][0];
      if (v < 0.25 || (i > 0 && ps[i - 1][0] > v) || (i + 1 < ss.length && ps[i + 1][0] > v)) continue;
      const s = ss[i], o0 = ((((ps[i][1] / (2 * Math.PI)) * s) % s) + s) % s;
      let bo = o0, bs = share(s, o0);
      for (const d of [-0.5, -0.25, 0.25, 0.5]) { const o = (o0 + d + s) % s, v2 = share(s, o); if (v2 > bs) { bs = v2; bo = o; } }
      cands.push([s, bo, bs]);
    }
    if (!cands.length) return [1, 0];
    const top = Math.max(...cands.map((c) => c[2]));
    const pick = cands.filter((c) => c[2] >= 0.85 * top && c[2] >= 0.45).sort((a, b) => b[0] - a[0])[0];
    return pick ? [pick[0], pick[1]] : [1, 0];
  };
  if (sx === 1) [sx, ox] = fuzzy(pc);
  if (sy === 1) [sy, oy] = fuzzy(pr);
  // a grid one way only, or two very different ways, is texture, not pixels
  if (sx === 1 || sy === 1 || Math.abs(sx - sy) > 0.15 * Math.max(sx, sy)) return { sx: 1, sy: 1, ox: 0, oy: 0 };
  return { sx, sy, ox, oy };
}

/**
 * Each cell of the grid to one pixel: its most common color, or the middle of its colors when none is
 * (a blurred or compressed copy). A grid of fractional size (a blurred one) is read in the middle half
 * of each cell, away from the smeared edges.
 */
export function toNative(img: Img, g: Grid): Img {
  const W = Math.floor((img.w - g.ox) / g.sx), H = Math.floor((img.h - g.oy) / g.sy), out = new Img(W, H);
  const whole = Number.isInteger(g.sx) && Number.isInteger(g.sy) && Number.isInteger(g.ox) && Number.isInteger(g.oy);
  const span = (o: number, s: number, i: number): [number, number] => {
    if (whole) return [o + i * s, o + (i + 1) * s - 1];
    const a = o + i * s + (s >= 2.5 ? 0.25 * s : 0), b = o + (i + 1) * s - (s >= 2.5 ? 0.25 * s : 0);
    return [Math.ceil(a - 0.5), Math.max(Math.ceil(a - 0.5), Math.floor(b - 0.5))];
  };
  // a whole grid of small cells (an upscale by 2, 3 or 4): each cell's commonest color counted in place,
  // with no map per cell (the read of a long clip did a map for each of millions of cells)
  if (whole && g.sx * g.sy <= 16) {
    const cell = new Uint32Array(g.sx * g.sy);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let n = 0, gone = 0;
      for (let yy = g.oy + y * g.sy; yy < g.oy + (y + 1) * g.sy; yy++) for (let xx = g.ox + x * g.sx; xx < g.ox + (x + 1) * g.sx; xx++) {
        const c = img.data[yy * img.w + xx];
        if (clear(c)) gone++; else cell[n++] = c;
      }
      if (gone * 2 > gone + n || !n) continue;
      // the commonest, the first of them on a tie (as the map kept them)
      let best = cell[0], top = 0;
      for (let i = 0; i < n; i++) {
        let k = 0;
        for (let j = 0; j < n; j++) if (cell[j] === cell[i]) k++;
        if (k > top) { top = k; best = cell[i]; }
      }
      if (top * 2 < n) {
        const med = (s: number) => { const v: number[] = []; for (let i = 0; i < n; i++) v.push((cell[i] >>> s) & 255); v.sort((a, b) => a - b); return v[v.length >> 1]; };
        best = pack(med(24), med(16), med(8));
      }
      out.data[y * W + x] = best;
    }
    return out;
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const count = new Map<Color, number>(), cs: Color[] = [];
    let gone = 0, n = 0;
    const [x0, x1] = span(g.ox, g.sx, x), [y0, y1] = span(g.oy, g.sy, y);
    for (let yy = y0; yy <= Math.min(y1, img.h - 1); yy++) for (let xx = x0; xx <= Math.min(x1, img.w - 1); xx++) {
      const c = img.data[yy * img.w + xx];
      n++;
      if (clear(c)) { gone++; continue; }
      cs.push(c); count.set(c, (count.get(c) ?? 0) + 1);
    }
    if (!n || gone * 2 > n) continue;
    let top = 0, best = TRANSPARENT;
    for (const [c, k] of count) if (k > top) { top = k; best = c; }
    if (top * 2 < cs.length) {
      const med = (i: number) => { const v = cs.map((c) => channels(c)[i]).sort((a, b) => a - b); return v[v.length >> 1]; };
      best = pack(med(0), med(1), med(2));
    }
    out.data[y * W + x] = best;
  }
  return out;
}

/** Colors closer than `tol` (OKLab) folded into the most common of them: the noise of a compressed or resized copy. */
export function mergeNear(img: Img, tol = 0.03): Img {
  const counts = colorCounts(img);
  if (counts.size > 30000) return img;
  const kept: Color[] = [], map = new Map<Color, Color>();
  for (const [c] of [...counts].sort((a, b) => b[1] - a[1])) {
    const to = kept.find((k) => dE(k, c) < tol);
    if (to === undefined) { kept.push(c); map.set(c, c); } else map.set(c, to);
  }
  const out = img.copy();
  for (let i = 0; i < out.data.length; i++) if (!clear(out.data[i])) out.data[i] = map.get(out.data[i])!;
  return out;
}

export function colorCounts(img: Img): Map<Color, number> {
  const m = new Map<Color, number>();
  for (const c of img.data) if (!clear(c)) m.set(c, (m.get(c) ?? 0) + 1);
  return m;
}

/** Shrink to fit `w` x `h` (or the long side to `long`), each new pixel the average of what it covers. */
export function areaDown(img: Img, w: number, h: number): Img {
  const out = new Img(w, h), fx = img.w / w, fy = img.h / h;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let r = 0, g = 0, b = 0, n = 0, gone = 0;
    for (let yy = Math.floor(y * fy); yy < Math.max(Math.floor(y * fy) + 1, Math.floor((y + 1) * fy)); yy++)
      for (let xx = Math.floor(x * fx); xx < Math.max(Math.floor(x * fx) + 1, Math.floor((x + 1) * fx)); xx++) {
        const c = img.data[yy * img.w + xx];
        if (clear(c)) { gone++; continue; }
        const [cr, cg, cb] = channels(c); r += cr; g += cg; b += cb; n++;
      }
    if (n && n >= gone) out.data[y * w + x] = pack(Math.round(r / n), Math.round(g / n), Math.round(b / n));
  }
  return out;
}

/** The picture in k colors: k-means in OKLab from the most different colors, each color the mean of what it took. */
export function quantize(img: Img, k: number): { img: Img; palette: Color[] } {
  const counts = [...colorCounts(img)];
  if (counts.length <= k) return { img, palette: counts.map(([c]) => c) };
  // starting colors: the most common, then each time the one farthest from those chosen (weighted a little by how common)
  const pts = counts.map(([c, n]) => ({ c, n, p: lab(c) }));
  const centers: number[][] = [pts.reduce((a, b) => (b.n > a.n ? b : a)).p.slice()];
  const d2 = (p: number[], q: number[]) => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2;
  while (centers.length < k) {
    let best = pts[0], far = -1;
    for (const q of pts) { const m = Math.min(...centers.map((c) => d2(q.p, c))) * Math.log(1 + q.n); if (m > far) { far = m; best = q; } }
    centers.push(best.p.slice());
  }
  let near = new Int32Array(pts.length);
  for (let it = 0; it < 12; it++) {
    near = new Int32Array(pts.length);
    pts.forEach((q, i) => { let bi = 0, bd = Infinity; centers.forEach((c, j) => { const d = d2(q.p, c); if (d < bd) { bd = d; bi = j; } }); near[i] = bi; });
    const sum = centers.map(() => [0, 0, 0, 0]);
    pts.forEach((q, i) => { const s = sum[near[i]]; s[0] += q.p[0] * q.n; s[1] += q.p[1] * q.n; s[2] += q.p[2] * q.n; s[3] += q.n; });
    sum.forEach((s, j) => { if (s[3]) centers[j] = [s[0] / s[3], s[1] / s[3], s[2] / s[3]]; });
  }
  // each center's color: the mean of its colors in sRGB
  const rgb = centers.map(() => [0, 0, 0, 0]);
  pts.forEach((q, i) => { const [r, g, b] = channels(q.c), s = rgb[near[i]]; s[0] += r * q.n; s[1] += g * q.n; s[2] += b * q.n; s[3] += q.n; });
  const palette = rgb.filter((s) => s[3]).map((s) => pack(Math.round(s[0] / s[3]), Math.round(s[1] / s[3]), Math.round(s[2] / s[3])));
  const of = new Map<Color, Color>();
  pts.forEach((q, i) => { const s = rgb[near[i]]; of.set(q.c, pack(Math.round(s[0] / s[3]), Math.round(s[1] / s[3]), Math.round(s[2] / s[3]))); });
  const out = img.copy();
  for (let i = 0; i < out.data.length; i++) if (!clear(out.data[i])) out.data[i] = of.get(out.data[i])!;
  return { img: out, palette };
}

// ---------------------------------------------------------------- ramps
export interface Ramp { colors: Color[]; counts: number[]; neutral: boolean }
/**
 * The ramps: colors that sit next to each other in the picture and differ mostly in lightness (shades
 * of one material) joined, each sorted dark to light. Two colors join when they touch often enough and
 * their hues are close (or both are greys).
 */
export function findRamps(img: Img): Ramp[] {
  const counts = colorCounts(img), touch = new Map<string, number>();
  const W = img.w;
  for (let y = 0; y < img.h; y++) for (let x = 0; x < W; x++) {
    const a = img.data[y * W + x];
    if (clear(a)) continue;
    for (const b of [x + 1 < W ? img.data[y * W + x + 1] : TRANSPARENT, y + 1 < img.h ? img.data[(y + 1) * W + x] : TRANSPARENT]) {
      if (clear(b) || a === b) continue;
      const key = a < b ? `${a},${b}` : `${b},${a}`;
      touch.set(key, (touch.get(key) ?? 0) + 1);
    }
  }
  const parent = new Map<Color, Color>([...counts.keys()].map((c) => [c, c]));
  const root = (c: Color): Color => { let r = c; while (parent.get(r) !== r) r = parent.get(r)!; parent.set(c, r); return r; };
  const grey = (c: Color) => lch(c).C < 0.035;
  // a ramp spans no more than ~55° of hue: joining two that would together, a chain of neighbors
  // drifting from greens to yellows to oranges, is two materials, not one
  const hues = new Map<Color, number[]>([...counts.keys()].map((c) => [c, [lch(c).h]]));
  const span = (hs: number[]) => { const v = hs.slice().sort((p, q) => p - q); let gap = 360 - v[v.length - 1] + v[0]; for (let i = 1; i < v.length; i++) gap = Math.max(gap, v[i] - v[i - 1]); return 360 - gap; };
  for (const [key, n] of [...touch].sort((a, b) => b[1] - a[1])) {
    const [a, b] = key.split(",").map(Number), A = lch(a), B = lch(b);
    const dh = Math.min(Math.abs(A.h - B.h), 360 - Math.abs(A.h - B.h));
    const alike = grey(a) && grey(b) ? true : !grey(a) && !grey(b) && dh < 38 && Math.abs(A.L - B.L) > 0.02;
    if (!alike || n < Math.max(3, 0.02 * Math.min(counts.get(a)!, counts.get(b)!))) continue;
    const ra = root(a), rb = root(b);
    if (ra === rb) continue;
    const both = [...hues.get(ra)!, ...hues.get(rb)!];
    if (!grey(a) && span(both) > 55) continue;
    parent.set(ra, rb); hues.set(rb, both);
  }
  const groups = new Map<Color, Color[]>();
  for (const c of counts.keys()) (groups.get(root(c)) ?? groups.set(root(c), []).get(root(c))!).push(c);
  return [...groups.values()].map((cs) => {
    cs.sort((p, q) => lch(p).L - lch(q).L);
    return { colors: cs, counts: cs.map((c) => counts.get(c)!), neutral: cs.every(grey) };
  }).sort((p, q) => q.counts.reduce((s, v) => s + v, 0) - p.counts.reduce((s, v) => s + v, 0));
}

// ---------------------------------------------------------------- pixel-art techniques
export interface Techniques {
  pixels: number;
  /** pixels in 2x2 checkers of two colors, and the most common pairs */
  dither: number; ditherPairs: [Color, Color, number][]; ditherRows: [number, number] | null;
  /** thin dark lines between lighter neighbors on both sides, and how many of them are a dark shade of what they border (selective) or a neutral near-black */
  lines: number; selective: number; black: number;
  /** a sprite's edge against the clear: black, a darker shade of the inside, or none; and the edge pixels lighter than a dark outline inside them (a halo) */
  edge: { black: number; selective: number; none: number; halo: number } | null;
  /** in-between tones on a step between two colors (manual anti-aliasing) */
  aa: number;
  /** pixels whose color none of their four neighbors share, but for a dither's and anti-aliasing's (meant so) */
  orphans: number;
  /** of those, the ones a tone or two off what is round them (noise), not standing out (a star, a glint) */
  specks: [number, number][];
  /** where the lighter tones of each ramp lie: the way toward the light on screen (x right, y down) and how consistently */
  light: { ramp: number; dir: [number, number]; sure: number; n: number }[];
  /** per pixel: 1 in a checker, 2 a thin dark line, 4 an in-between tone, 8 in a banding pair */
  mask: Uint8Array;
  /** a sprite's light read off its rim (Johnson and Farid): the way toward it, and how well lightness follows the outward normal (r²) */
  rim: { dir: [number, number]; r2: number; n: number } | null;
  /** pairs of runs of two colors side by side with the same ends (banding, Pixel Logic / Pixel Fixer), and per 1000 pixels */
  banding: { pairs: number; per1000: number };
  /** a sprite lit as if from the front: lighter the farther in from its edge all round (pillow shading), how strongly */
  pillow: number | null;
}
export function techniques(img: Img, ramps: Ramp[]): Techniques {
  const W = img.w, H = img.h, at = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= H ? TRANSPARENT : img.data[y * W + x]);
  const rampOf = new Map<Color, number>();
  ramps.forEach((r, i) => r.colors.forEach((c) => rampOf.set(c, i)));
  let pixels = 0, lines = 0, selective = 0, black = 0, aa = 0, orphans = 0;
  const inDither = new Uint8Array(W * H), mask = new Uint8Array(W * H), lone = new Uint8Array(W * H), pairs = new Map<string, number>();
  let edge: Techniques["edge"] = null;
  const vec = ramps.map(() => [0, 0, 0]);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = at(x, y);
    if (clear(c)) continue;
    pixels++;
    const L = lch(c).L, nb = [at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)];
    if (nb.every((n) => n !== c)) lone[y * W + x] = 1;
    // a checker: a b / b a
    const b = at(x + 1, y);
    if (!clear(b) && b !== c && at(x + 1, y + 1) === c && at(x, y + 1) === b) {
      for (const i of [y * W + x, y * W + x + 1, (y + 1) * W + x, (y + 1) * W + x + 1]) inDither[i] = 1;
      const key = c < b ? `${c},${b}` : `${b},${c}`;
      pairs.set(key, (pairs.get(key) ?? 0) + 1);
    }
    // a thin dark line: lighter on both sides one way or the other
    for (const [p, q] of [[nb[0], nb[1]], [nb[2], nb[3]]]) {
      if (clear(p) || clear(q)) continue;
      const lp = lch(p).L, lq = lch(q).L;
      if (lp - L > 0.12 && lq - L > 0.12) {
        lines++; mask[y * W + x] |= 2;
        const k = lch(c);
        if (k.C < 0.04 && k.L < 0.3) black++;
        else if (rampOf.get(c) !== undefined && (rampOf.get(c) === rampOf.get(p) || rampOf.get(c) === rampOf.get(q))) selective++;
        break;
      }
    }
    // an in-between tone on a step: between two different neighbors across it, its own color rare around it
    for (const [p, q] of [[nb[0], nb[1]], [nb[2], nb[3]]]) {
      if (clear(p) || clear(q) || p === q || p === c || q === c) continue;
      const A = lab(p), B = lab(q), P = lab(c), ab = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], n2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2;
      if (n2 < 0.15 ** 2) continue;
      const t = ((P[0] - A[0]) * ab[0] + (P[1] - A[1]) * ab[1] + (P[2] - A[2]) * ab[2]) / n2;
      const off = Math.hypot(P[0] - A[0] - t * ab[0], P[1] - A[1] - t * ab[1], P[2] - A[2] - t * ab[2]);
      if (t > 0.2 && t < 0.8 && off < 0.3 * Math.sqrt(n2) && nb.filter((n) => n === c).length <= 1) { aa++; mask[y * W + x] |= 4; break; }
    }
    // the light: within a ramp, each step from a darker tone to a lighter one points toward it
    const r = rampOf.get(c);
    if (r !== undefined) for (const [dx, dy] of [[1, 0], [0, 1]]) {
      const d = at(x + dx, y + dy);
      if (clear(d) || rampOf.get(d) !== r || d === c) continue;
      const s = Math.sign(lch(d).L - L);
      vec[r][0] += s * dx; vec[r][1] += s * dy; vec[r][2]++;
    }
  }
  // a sprite's edge
  let eb = 0, es = 0, en = 0, halo = 0;
  const sprite = img.data.some((c) => clear(c));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = at(x, y);
    if (clear(c)) continue;
    // beyond the picture is clear for a sprite (something with clear pixels), not for an opaque scene
    const out = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].filter(([u, v]) => sprite || (u >= 0 && v >= 0 && u < W && v < H));
    if (!out.some(([u, v]) => clear(at(u, v)))) continue;
    // what is inside it: past the line itself (at an outline's corner the line goes on inward)
    const inner = out.map(([u, v]) => { const n = at(x + (x - u), y + (y - v)); return n === c ? at(x + 2 * (x - u), y + 2 * (y - v)) : n; }).find((n) => !clear(n) && n !== c);
    const k = lch(c);
    // an ink line: dark and nearly grey (pxl's own ink is a deep purple, chroma 0.05)
    if (k.C < 0.08 && k.L < 0.3) eb++;
    else if (inner !== undefined && lch(inner).L - k.L > 0.08) es++;
    else en++;
    // lighter than a dark line just inside it: anti-aliasing toward a background that isn't there
    if (inner !== undefined && lch(inner).L < 0.35 && k.L - lch(inner).L > 0.12) halo++;
  }
  if (sprite && eb + es + en >= 8) edge = { black: eb, selective: es, none: en, halo };
  // the light along a sprite's rim, after Johnson and Farid ("Exposing digital forgeries by detecting
  // inconsistencies in lighting", 2005) and Nillius and Eklundh: on the silhouette the surface turns
  // away from us, its normal in the picture's plane, pointing out; with one distant light, lightness
  // there is ambient + light . normal. A least-squares fit over the rim (two pixels in, past an outline)
  let rim: Techniques["rim"] = null;
  if (sprite) {
    const rows: [number, number, number][] = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (clear(at(x, y))) continue;
      let nx = 0, ny = 0, edgeP = false;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if ((dx || dy) && clear(at(x + dx, y + dy))) { nx += dx; ny += dy; if (Math.abs(dx) + Math.abs(dy) === 1) edgeP = true; }
      if (!edgeP || !(nx || ny)) continue;
      const l = Math.hypot(nx, ny), ux = nx / l, uy = ny / l;
      const c = at(Math.round(x - 2 * ux), Math.round(y - 2 * uy));
      if (clear(c)) continue;
      rows.push([ux, uy, lch(c).L]);
    }
    if (rows.length >= 16) {
      // normal equations for L = a + bx nx + by ny
      const A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], B = [0, 0, 0];
      for (const [ux, uy, L] of rows) { const v = [1, ux, uy]; for (let i = 0; i < 3; i++) { B[i] += v[i] * L; for (let j = 0; j < 3; j++) A[i][j] += v[i] * v[j]; } }
      const sol = solve3(A, B);
      if (sol) {
        const [a, bx, by] = sol, mean = rows.reduce((s, r) => s + r[2], 0) / rows.length;
        let ss = 0, se = 0;
        for (const [ux, uy, L] of rows) { ss += (L - mean) ** 2; se += (L - a - bx * ux - by * uy) ** 2; }
        const m = Math.hypot(bx, by);
        if (m > 1e-6) rim = { dir: [bx / m, by / m], r2: ss > 0 ? 1 - se / ss : 0, n: rows.length };
      }
    }
  }
  // banding (Pixel Logic; Pixel Fixer, TU Delft 2025): two runs of 2+ pixels of different colors side
  // by side whose ends line up, which shows the grid; a run as wide as most of the picture (a band of
  // sky) is left out
  let bandPairs = 0;
  const runs = (horiz: boolean) => {
    const out: Map<number, [number, number, Color][]> = new Map();
    const A = horiz ? H : W, Bn = horiz ? W : H;
    for (let a = 0; a < A; a++) {
      const list: [number, number, Color][] = [];
      let s0 = 0;
      for (let b = 1; b <= Bn; b++) {
        const c0 = horiz ? at(s0, a) : at(a, s0), c = b < Bn ? (horiz ? at(b, a) : at(a, b)) : -1;
        if (c !== c0) { if (b - s0 >= 2 && !clear(c0) && b - s0 < 0.9 * Bn) list.push([s0, b - 1, c0]); s0 = b; }
      }
      out.set(a, list);
    }
    return out;
  };
  for (const horiz of [true, false]) {
    const R = runs(horiz);
    for (const [a, list] of R) {
      const next = R.get(a + 1);
      if (!next) continue;
      const ends = new Map(next.map((r) => [`${r[0]},${r[1]}`, r[2]]));
      // (Pixel Joint's too: the same ends across a row of something else between, and two runs
      // stepping together, both ends a pixel along, a 45° pair of bands)
      const far = new Map((R.get(a + 2) ?? []).map((r) => [`${r[0]},${r[1]}`, r[2]]));
      for (const [s0, s1, c] of list) {
        const d = ends.get(`${s0},${s1}`) ?? (ends.has(`${s0},${s1}`) ? undefined : far.get(`${s0},${s1}`) ?? ends.get(`${s0 + 1},${s1 + 1}`) ?? ends.get(`${s0 - 1},${s1 - 1}`));
        if (d === undefined || d === c) continue;
        bandPairs++;
        for (let b = s0; b <= s1; b++) for (const aa of [a, a + 1]) mask[horiz ? aa * W + b : b * W + aa] |= 8;
      }
    }
  }
  // pillow shading: lightness rising with the distance in from the edge, all the way round
  let pillow: number | null = null;
  if (sprite) {
    const dist = new Int32Array(W * H).fill(-1), q: number[] = [];
    for (let i = 0; i < W * H; i++) if (clear(img.data[i])) { dist[i] = 0; q.push(i); }
    for (let h = 0; h < q.length; h++) { const p = q[h], x = p % W, y = Math.floor(p / W); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy, r = yy * W + xx; if (xx >= 0 && yy >= 0 && xx < W && yy < H && dist[r] < 0) { dist[r] = dist[p] + 1; q.push(r); } } }
    const ds: number[] = [], ls: number[] = [];
    for (let i = 0; i < W * H; i++) {
      if (dist[i] < 2) continue;                                           // past the outline
      const x = i % W, y = Math.floor(i / W), edgeD = Math.min(dist[i], x + 1, y + 1, W - x, H - y);
      ds.push(Math.min(edgeD, 6)); ls.push(lch(img.data[i]).L);
    }
    if (ds.length >= 30) {
      const md = ds.reduce((s, v) => s + v, 0) / ds.length, ml = ls.reduce((s, v) => s + v, 0) / ls.length;
      let c = 0, vd = 0, vl = 0;
      for (let i = 0; i < ds.length; i++) { c += (ds[i] - md) * (ls[i] - ml); vd += (ds[i] - md) ** 2; vl += (ls[i] - ml) ** 2; }
      pillow = vd > 0 && vl > 0 ? c / Math.sqrt(vd * vl) : 0;
    }
  }
  let ditherN = 0, r0 = H, r1 = -1;
  for (let i = 0; i < inDither.length; i++) if (inDither[i]) { ditherN++; mask[i] |= 1; const y = Math.floor(i / W); r0 = Math.min(r0, y); r1 = Math.max(r1, y); }
  const specks: [number, number][] = [];
  for (let i = 0; i < lone.length; i++) if (lone[i] && !(mask[i] & 5)) {
    orphans++;
    // standing out from every neighbor (a star, a glint), or a speck a tone or two off them
    const x = i % W, y = (i - x) / W, near = [at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)].filter((n) => !clear(n));
    if (near.length && Math.min(...near.map((n) => dE(n, img.data[i]))) < 0.2) specks.push([x, y]);
  }
  const ditherPairs = [...pairs].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, n]) => { const [a, b] = k.split(",").map(Number); return [a, b, n] as [Color, Color, number]; });
  const light = vec.map(([vx, vy, n], ramp) => ({ ramp, dir: [n ? vx / n : 0, n ? vy / n : 0] as [number, number], sure: n ? Math.hypot(vx, vy) / n : 0, n }))
    .filter((l) => l.n >= 30).sort((a, b) => b.n - a.n);
  return { pixels, dither: ditherN, ditherPairs, ditherRows: r1 >= 0 ? [r0, r1] : null, lines, selective, black, edge, aa, orphans, specks, light, mask, rim, banding: { pairs: bandPairs, per1000: (1000 * bandPairs) / Math.max(1, pixels) }, pillow };
}

/**
 * What the tutorials (Pedro Medeiros, Saint11) fix in a 1 px line, any color: L-corners, the elbow of three pixels
 * in an L where the line steps or a diagonal doubles (it thickens the line there; where two lines meet, both going
 * on, it's meant); and
 * jaggies, along one stretch of a line (one way of stepping), a run of pixels out of order:
 * runs grow or shrink steadily (1 1 2 3), or alternate n and n+1 on a straight slope, with one turn at most (an S).
 * Lines are the pixels in no 2x2 block of their color, in a piece 8 px long or more (a letter's strokes, an eye,
 * turn where they mean to) darker than what it borders (a band of a middle tone between a light and a dark is
 * shading, not a line); positions at 1x.
 */
export function lineFlaws(img: Img): { line: number; corners: [number, number][]; jaggies: [number, number][] } {
  const W = img.w, H = img.h, at = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= H ? TRANSPARENT : img.data[y * W + x]);
  const same = (x: number, y: number, c: Color) => at(x, y) === c;
  const thin = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = at(x, y);
    if (clear(c)) continue;
    let block = false;
    for (const [ox, oy] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) if (same(x + ox, y + oy, c) && same(x + ox + 1, y + oy, c) && same(x + ox, y + oy + 1, c) && same(x + ox + 1, y + oy + 1, c)) block = true;
    if (!block) thin[y * W + x] = 1;
  }
  const N8 = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
  // pieces of a color's thin pixels, 8-connected: only those of 6 and more are lines
  const piece = new Int32Array(W * H).fill(-1), size: number[] = [];
  for (let i = 0; i < W * H; i++) {
    if (!thin[i] || piece[i] >= 0) continue;
    const c = img.data[i], L = lch(c).L, stack = [i];
    piece[i] = size.length; let n = 0, lift = 0, sides = 0, x0 = W, x1 = 0, y0 = H, y1 = 0;
    while (stack.length) {
      const j = stack.pop()!, x = j % W, y = (j - x) / W; n++;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const d = at(x + dx, y + dy);
        // (against the clear only a dark line is an outline; a light band at the edge is a shape's rim)
        if (d !== c) { lift += clear(d) ? (L < 0.5 ? 0.3 : 0) : lch(d).L - L; sides++; }
      }
      for (const [dx, dy] of N8) {
        const k = (y + dy) * W + x + dx;
        if (same(x + dx, y + dy, c) && thin[k] && piece[k] < 0) { piece[k] = size.length; stack.push(k); }
      }
    }
    size.push(lift >= 0.1 * sides && Math.max(x1 - x0, y1 - y0) >= 7 ? n : 0);
  }
  const isLine = (x: number, y: number, c: Color) => same(x, y, c) && thin[y * W + x] === 1 && size[piece[y * W + x]] >= 8;
  let line = 0;
  const corners: [number, number][] = [], gone = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = at(x, y);
    if (!isLine(x, y, c)) continue;
    line++;
    const l = same(x - 1, y, c), r = same(x + 1, y, c), u = same(x, y - 1, c), d = same(x, y + 1, c);
    if (l === r || u === d) continue;
    const sx = r ? 1 : -1, sy = d ? 1 : -1;
    // one arm is a step: past it the line goes on alongside the other arm, away from it (a corner where two
    // lines meet, both arms going on, is meant); nothing across the corner from the arms; of a staircase of
    // them, every other one (taking one away fixes the next)
    const step = (same(x - sx, y + sy, c) && !same(x, y + 2 * sy, c)) || (same(x + sx, y - sy, c) && !same(x + 2 * sx, y, c));
    // (or a diagonal with a pixel doubled: both arms go on diagonally, away from it)
    const diag = same(x + 2 * sx, y - sy, c) && same(x - sx, y + 2 * sy, c);
    if (!(step || diag) || same(x - sx, y - sy, c)) continue;
    if ((x > 0 && gone[y * W + x - 1]) || (y > 0 && gone[(y - 1) * W + x])) continue;
    gone[y * W + x] = 1; corners.push([x, y]);
  }
  // the lines without their corners traced end to end (a fork ends them), each cut into stretches that step one
  // way, each stretch into runs
  const node = (x: number, y: number, c: Color) => isLine(x, y, c) && !gone[y * W + x];
  const nbrs = (x: number, y: number, c: Color) => N8.map(([dx, dy]) => [x + dx, y + dy] as [number, number]).filter(([u, v]) => node(u, v, c));
  const seen = new Uint8Array(W * H), jaggies: [number, number][] = [];
  const trace = (x0: number, y0: number) => {
    const c = at(x0, y0), pts: [number, number][] = [[x0, y0]];
    seen[y0 * W + x0] = 1;
    for (;;) {
      const [x, y] = pts[pts.length - 1], next = nbrs(x, y, c).filter(([u, v]) => !seen[v * W + u] && nbrs(u, v, c).length <= 2);
      if (next.length !== 1) break;
      seen[next[0][1] * W + next[0][0]] = 1; pts.push(next[0]);
    }
    if (pts.length < 8) return;
    let axis: number[] | null = null, diag: number[] | null = null, run = { n: 1, at: pts[0] }, cur: (typeof run)[] = [];
    const stretches = [cur];
    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i][0] - pts[i - 1][0], dy = pts[i][1] - pts[i - 1][1], slant = dx !== 0 && dy !== 0;
      const fits = slant ? (!diag || (diag[0] === dx && diag[1] === dy)) && (!axis || (axis[0] ? axis[0] === dx : axis[1] === dy))
        : (!axis || (axis[0] === dx && axis[1] === dy)) && (!diag || (dx ? diag[0] === dx : diag[1] === dy));
      if (!fits) { cur.push(run); stretches.push((cur = [])); axis = diag = null; run = { n: 1, at: pts[i - 1] }; }
      if (slant) { diag = [dx, dy]; cur.push(run); run = { n: 1, at: pts[i] }; } else { axis = [dx, dy]; run.n++; }
    }
    cur.push(run);
    for (const s of stretches) {
      // the runs at either end may go on past the cut: only the ones between are judged; equal neighbors are one
      const v = s.slice(1, -1).filter((r, i, a) => !i || r.n !== a[i - 1].n);
      const odd: { r: (typeof run); off: number; within: boolean }[] = [];
      for (let i = 1; i + 1 < v.length; i++) {
        const a = v[i - 1].n, m = v[i].n, b = v[i + 1].n;
        if (!((m < a && m < b) || (m > a && m > b)) || (a === b && Math.abs(m - a) === 1)) continue;
        // a dip or a bump in a trend that goes on the same way after it (1 2 [1] 3 4)
        const within = i >= 2 && i + 2 < v.length && Math.sign(a - v[i - 2].n) === Math.sign(v[i + 2].n - b);
        odd.push({ r: v[i], off: Math.abs(m - (a + b) / 2), within });
      }
      // of the others, the biggest is where an S turns
      odd.sort((p, q) => q.off - p.off).forEach((o, k) => { if (o.within || k > 0) jaggies.push(o.r.at); });
    }
  };
  // from an end, or beside a fork; then what is left, loops
  for (const ends of [true, false]) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = at(x, y);
    if (seen[y * W + x] || !node(x, y, c)) continue;
    const n = nbrs(x, y, c);
    if (n.length <= 2 && (!ends || n.length === 1 || n.some(([u, v]) => nbrs(u, v, c).length > 2))) trace(x, y);
  }
  return { line, corners, jaggies };
}

/** A 3x3 linear system by Cramer's rule; null when singular. */
function solve3(A: number[][], b: number[]): number[] | null {
  const det = (m: number[][]) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const d = det(A);
  if (Math.abs(d) < 1e-12) return null;
  return [0, 1, 2].map((k) => det(A.map((row, i) => row.map((v, j) => (j === k ? b[i] : v)))) / d);
}


/** A transparency checker baked into a picture: two colors in squares of `size`, from `ox`,`oy`. */
export interface Checker { a: Color; b: Color; size: number; ox: number; oy: number }
/** The checker's color at a pixel. */
export const checkerAt = (k: Checker, x: number, y: number): Color => ((Math.floor((x - k.ox) / k.size) + Math.floor((y - k.oy) / k.size)) % 2 === 0 ? k.a : k.b);

/**
 * The checker an editor shows behind what is clear, when it was exported with the picture (a GIF saved
 * from a screen, a sprite posted with Aseprite's backdrop): the two commonest colors, in squares of the
 * commonest length of their runs along rows, where they fall as a checker would have them nearly always
 * and over a quarter of the picture at least.
 */
export function findChecker(img: Img): Checker | null {
  const W = img.w, H = img.h, n = colorCounts(img), top = [...n].filter(([c]) => (c & 255) >= 128).sort((x, y) => y[1] - x[1]);
  if (top.length < 2 || top[0][1] + top[1][1] < 0.25 * W * H || top[1][1] < 0.4 * top[0][1]) return null;
  const A = top[0][0], B = top[1][0], two = (c: Color) => c === A || c === B;
  // the squares' size: the commonest length of a run of one of the two between the other two (rows and columns)
  const runs = new Map<number, number>(), starts: [number, number, Color][] = [];
  for (let y = 0; y < H; y++) {
    let x = 0;
    while (x < W) {
      const c = img.data[y * W + x];
      let e = x;
      while (e < W && img.data[y * W + e] === c) e++;
      if (two(c) && x > 0 && e < W && two(img.data[y * W + x - 1]) && two(img.data[y * W + e])) { runs.set(e - x, (runs.get(e - x) ?? 0) + 1); starts.push([x, y, c]); }
      x = e;
    }
  }
  const size = [...runs].sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!size || size < 2) return null;
  // where the squares start: the commonest start of a run that long, modulo its length
  const off = new Map<number, number>();
  for (const [x, , ] of starts) off.set(x % size, (off.get(x % size) ?? 0) + 1);
  const ox = [...off].sort((a, b) => b[1] - a[1])[0][0];
  let best: Checker | null = null, bestHit = 0;
  for (let oy = 0; oy < size; oy++) for (const [a, b] of [[A, B], [B, A]]) {
    const k = { a, b, size, ox, oy };
    let hit = 0, of = 0;
    for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) { const c = img.data[y * W + x]; if (!two(c)) continue; of++; if (c === checkerAt(k, x, y)) hit++; }
    if (hit / of > bestHit) { bestHit = hit / of; best = k; }
  }
  if (!best || bestHit < 0.95) return null;
  let on = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (img.data[y * W + x] === checkerAt(best, x, y)) on++;
  return on >= 0.25 * W * H ? best : null;
}

/** A reflection: what is above row `axis` mirrored below it (row axis + d is row axis - 1 - d + `gap`), over what was behind it at `alpha`; over a plain floor, its color (`floor`). */
export interface Reflection { axis: number; gap: 0 | 1; alpha: number; share: number; floor?: Color }

/**
 * A floor that shines, still water: below a row, what is above it mirrored, laid over what was behind (the
 * checker; a plain floor, the commonest color below the row; or nothing: then the pixel's own alpha) at
 * one opacity throughout. The row and the opacity where it explains most of what is below (a third of it
 * at least over the checker, three quarters over a plain floor) and most of what is above has its copy.
 */
export function findReflection(frames: Img[], k: Checker | null): Reflection | null {
  const W = frames[0].w, H = frames[0].h, sample = frames.filter((_, i) => i % Math.max(1, Math.floor(frames.length / 12)) === 0);
  const ch = (c: Color) => [(c >>> 24) & 255, (c >>> 16) & 255, (c >>> 8) & 255];
  // the opacity a pixel below takes its mirror at, or -1 when it isn't one
  let floor: Color | undefined, wall: Color | undefined;
  const behind = (x: number, y: number) => (k ? checkerAt(k, x, y) : floor);
  const fit = (below: Color, above: Color, x: number, y: number) => {
    if ((above & 255) < 250) return -1;
    if ((below & 255) < 250) {
      const a = (below & 255) / 255;
      return a > 0.08 && dE(below | 255, above) < 0.06 ? a : -1;
    }
    const under = behind(x, y);
    if (under === undefined || below === under || above === under) return -1;
    const b = ch(below), t = ch(above), g = ch(under), as: number[] = [];
    for (let c = 0; c < 3; c++) if (Math.abs(t[c] - g[c]) >= 24) as.push((b[c] - g[c]) / (t[c] - g[c]));
    if (!as.length) return -1;
    as.sort((p, q) => p - q);
    const a = as[as.length >> 1];
    if (a < 0.1 || a > 0.9) return -1;
    let off = 0;
    for (let c = 0; c < 3; c++) off += Math.abs(b[c] - (g[c] + a * (t[c] - g[c])));
    return off / 3 <= 14 ? a : -1;
  };
  let best: Reflection | null = null, bestN = 0;
  // (a reflection is a band, not the last few rows: a framed picture's bottom edge mirrors nothing)
  for (let axis = Math.floor(H / 4); axis < H - Math.max(3, Math.ceil(H / 10)); axis++) {
    // a plain floor: the color most of what is below the row has (the first frame), a half of it at least
    // (once a row, for both gaps)
    if (!k) {
      const n = new Map<Color, number>();
      let all = 0;
      for (let y = axis; y < H; y++) for (let x = 0; x < W; x++) { const c = sample[0].data[y * W + x]; if ((c & 255) >= 250) { n.set(c, (n.get(c) ?? 0) + 1); all++; } }
      const top = [...n].sort((a, b) => b[1] - a[1])[0];
      floor = top && top[1] >= 0.5 * all ? top[0] : undefined;
      // and the wall behind what stands over it, the same way above the row
      const w = new Map<Color, number>();
      let up = 0;
      for (let y = Math.max(0, 2 * axis - H); y < axis; y++) for (let x = 0; x < W; x++) { const c = sample[0].data[y * W + x]; if ((c & 255) >= 250) { w.set(c, (w.get(c) ?? 0) + 1); up++; } }
      const back = [...w].sort((a, b) => b[1] - a[1])[0];
      wall = back && back[1] >= 0.5 * up ? back[0] : undefined;
    }
    for (const gap of [0, 1] as const) {
    const alphas: number[] = [];
    let below = 0, shown = 0;
    for (const f of sample) for (let y = axis; y < H; y++) {
      const m = 2 * axis - 1 - y + gap;
      if (m < 0) break;
      for (let x = 0; x < W; x++) {
        // (the checker, where it shows, is what's behind: nothing of it)
        const c = f.data[y * W + x], above = f.data[m * W + x], clear = (above & 255) < 20 || above === (k ? checkerAt(k, x, m) : floor) || above === wall;
        if (!clear) shown++;
        if ((c & 255) < 20 || c === behind(x, y)) continue;
        below++;
        const a = clear ? -1 : fit(c, above, x, y);
        if (a >= 0) alphas.push(a);
      }
    }
    // one opacity: what is near the middle one counts (over a near-black floor any darker copy of a
    // pixel fits some opacity); over a plain floor, three quarters at least (its one color is easy to
    // match by chance); and most of what is above has its copy below (a shop over an empty street
    // has none)
    alphas.sort((p, q) => p - q);
    const mid = alphas[alphas.length >> 1], held = alphas.filter((a) => Math.abs(a - mid) <= 0.1).length;
    if (held > bestN && held >= (k ? 0.33 : 0.75) * below && held >= 0.4 * shown && held >= 30) {
      bestN = held;
      best = { axis, gap, alpha: mid, share: held / below, ...(!k && floor !== undefined ? { floor } : {}) };
    }
    }
  }
  return best;
}

/** The picture with its reflection taken away: each pixel below the row that is its mirror over what was behind it, made clear (over a plain floor, the floor again). */
export function clearReflection(img: Img, r: Reflection, k: Checker | null): Img {
  const out = img.copy(), W = img.w, gone = r.floor ?? TRANSPARENT;
  for (let y = r.axis; y < img.h; y++) {
    const m = 2 * r.axis - 1 - y + r.gap;
    if (m < 0) break;
    for (let x = 0; x < W; x++) {
      const c = img.data[y * W + x];
      if ((c & 255) < 20) continue;
      const a = img.data[m * W + x];
      const under = k ? checkerAt(k, x, y) : r.floor;
      if ((a & 255) < 20 && k) { if (dE(c, checkerAt(k, x, y)) < 0.12) out.data[y * W + x] = TRANSPARENT; continue; }
      if ((a & 255) < 250 || (r.floor !== undefined && a === r.floor)) { if ((c & 255) < 250 || (under !== undefined && dE(c, under) < 0.12)) out.data[y * W + x] = gone; continue; }
      const want = under !== undefined && (c & 255) >= 250 ? mix(under, a, r.alpha) : a;
      if (dE(c | 255, want) < 0.08 || ((c & 255) < 250 && dE(c | 255, a) < 0.08)) out.data[y * W + x] = gone;
    }
  }
  return out;
}
const mix = (under: Color, over: Color, a: number) => pack(...([24, 16, 8].map((s) => Math.round(((under >>> s) & 255) * (1 - a) + ((over >>> s) & 255) * a)) as [number, number, number]));

/** The picture with the checker taken for clear: each pixel the checker's own color there made transparent. */
export function clearChecker(img: Img, k: Checker): Img {
  const out = img.copy();
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) if (img.data[y * img.w + x] === checkerAt(k, x, y)) out.data[y * img.w + x] = TRANSPARENT;
  return out;
}

/** The tile size and offset whose cells repeat most, and how much (1 - distinct / cells). */
export function findTiles(img: Img): { size: number; ox: number; oy: number; cells: number; distinct: number } | null {
  let best: { size: number; ox: number; oy: number; cells: number; distinct: number } | null = null;
  for (const size of [8, 16, 32]) {
    if (img.w < size * 4 || img.h < size * 3) continue;
    const step = size >= 32 ? 4 : size >= 16 ? 2 : 1;
    for (let oy = 0; oy < size; oy += step) for (let ox = 0; ox < size; ox += step) {
      const seen = new Set<string>();
      let cells = 0;
      for (let ty = oy; ty + size <= img.h; ty += size) for (let tx = ox; tx + size <= img.w; tx += size) {
        let h = 2166136261, flat = true;
        const c0 = img.data[ty * img.w + tx];
        for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) { const c = img.data[(ty + y) * img.w + tx + x]; if (c !== c0) flat = false; h ^= c; h = Math.imul(h, 16777619); }
        if (flat) continue;                                              // one color: sky, not a tile
        seen.add(String(h >>> 0)); cells++;
      }
      const rep = 1 - seen.size / cells;
      if (cells >= 8 && (!best || rep > 1 - best.distinct / best.cells + 0.02)) best = { size, ox, oy, cells, distinct: seen.size };
    }
  }
  return best && 1 - best.distinct / best.cells >= 0.25 ? best : null;
}

// ---------------------------------------------------------------- lines and where they meet
export interface Segment { x0: number; y0: number; x1: number; y1: number; len: number; a: number; n: [number, number, number] }
/**
 * Straight edges, after LSD (Grompone von Gioi, Jakubowicz, Morel and Randall, "LSD: a Line Segment
 * Detector", IPOL 2012): the level-line angle at every pixel (a 2x2 gradient); seeds taken strongest
 * first; each grows over its eight neighbors whose level-line angle is within 22.5° of the region's;
 * the region's rectangle (its center and main axis by its moments) kept when it is long enough and
 * most of the rectangle (70%) is the region. Unlike a Hough transform it doesn't add up texture into
 * lines, and a faint joint between paving stones is found as well as a strong outline. Pixel art is
 * blurred a little first (`smooth`), so a staircase of pixels reads as the line it draws.
 */
export function findSegments(img: Img, smooth = false): Segment[] {
  const W = img.w, H = img.h;
  let L = new Float32Array(W * H);
  for (let i = 0; i < L.length; i++) L[i] = clear(img.data[i]) ? 0 : lab(img.data[i])[0];
  // a separable blur: [1 4 6 4 1] for pixel art, [1 2 1] otherwise (LSD's Gaussian, roughly)
  const k = smooth ? [1, 4, 6, 4, 1] : [1, 2, 1], hk = k.length >> 1, ks = k.reduce((a, b) => a + b, 0);
  for (const horiz of [true, false]) {
    const o = new Float32Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let v = 0;
      for (let t = -hk; t <= hk; t++) { const xx = horiz ? Math.min(W - 1, Math.max(0, x + t)) : x, yy = horiz ? y : Math.min(H - 1, Math.max(0, y + t)); v += k[t + hk] * L[yy * W + xx]; }
      o[y * W + x] = v / ks;
    }
    L = o;
  }
  // the 2x2 gradient and the level-line angle (along the edge, oriented: the lighter side on one hand)
  const mag = new Float32Array(W * H), ang = new Float32Array(W * H);
  for (let y = 0; y + 1 < H; y++) for (let x = 0; x + 1 < W; x++) {
    const a = L[y * W + x], b = L[y * W + x + 1], c = L[(y + 1) * W + x], d = L[(y + 1) * W + x + 1];
    const gx = (b + d - a - c) / 2, gy = (c + d - a - b) / 2;
    mag[y * W + x] = Math.hypot(gx, gy); ang[y * W + x] = Math.atan2(gx, -gy);
  }
  const rho = 0.02, tau = Math.PI / 8, minLen = Math.max(8, Math.round(0.06 * Math.min(W, H)));
  const order = Array.from({ length: W * H }, (_, i) => i).filter((i) => mag[i] > rho).sort((p, q) => mag[q] - mag[p]);
  const used = new Uint8Array(W * H), segs: Segment[] = [];
  const diff = (a: number, b: number) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return Math.abs(d); };
  for (const seed of order) {
    if (used[seed]) continue;
    const region = [seed];
    used[seed] = 1;
    let sx = Math.cos(ang[seed]), sy = Math.sin(ang[seed]), th = ang[seed];
    for (let r = 0; r < region.length; r++) {
      const p = region[r], x = p % W, y = Math.floor(p / W);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy, q = yy * W + xx;
        if (xx < 0 || yy < 0 || xx >= W - 1 || yy >= H - 1 || used[q] || mag[q] <= rho || diff(ang[q], th) > tau) continue;
        used[q] = 1; region.push(q); sx += Math.cos(ang[q]); sy += Math.sin(ang[q]); th = Math.atan2(sy, sx);
      }
    }
    if (region.length < minLen / 2) continue;
    // the rectangle: center of mass and main axis, weighted by the gradient
    let w = 0, mx = 0, my = 0;
    for (const p of region) { const m = mag[p]; w += m; mx += m * ((p % W) + 1); my += m * (Math.floor(p / W) + 1); }
    mx /= w; my /= w;
    let sxx = 0, syy = 0, sxy = 0;
    for (const p of region) { const m = mag[p], ex = (p % W) + 1 - mx, ey = Math.floor(p / W) + 1 - my; sxx += m * ex * ex; syy += m * ey * ey; sxy += m * ex * ey; }
    let a = 0.5 * Math.atan2(2 * sxy, sxx - syy);
    if (Math.abs(diff(a, th)) > Math.PI / 2) a += Math.PI;                 // the axis the way the edge runs
    const ux = Math.cos(a), uy = Math.sin(a);
    let t0 = Infinity, t1 = -Infinity, w0 = Infinity, w1 = -Infinity;
    for (const p of region) { const ex = (p % W) + 1 - mx, ey = Math.floor(p / W) + 1 - my, t = ex * ux + ey * uy, o = -ex * uy + ey * ux; t0 = Math.min(t0, t); t1 = Math.max(t1, t); w0 = Math.min(w0, o); w1 = Math.max(w1, o); }
    const len = t1 - t0, width = Math.max(1, w1 - w0);
    if (len < minLen || region.length < 0.7 * len * Math.min(width, 3)) continue;
    const x0 = mx + ux * t0, y0 = my + uy * t0, x1 = mx + ux * t1, y1 = my + uy * t1, nx = -uy, ny = ux;
    segs.push({ x0, y0, x1, y1, len, a: ((Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI + 180) % 180, n: [nx, ny, -(nx * mx + ny * my)] });
  }
  return segs.sort((p, q) => q.len - p.len).slice(0, 60);
}

export interface Vanish { x: number; y: number; far: boolean; dir: [number, number]; lines: Segment[]; weight: number; fan: number }
/**
 * Where the lines meet: every crossing of two of them is a candidate, scored by the length of all the
 * lines that point at it (each within 1.5°); the best is refined, its lines taken out, and so on. A
 * point beyond ~30 picture widths is a direction (lines parallel in the picture).
 */
export function findVanishing(segs: Segment[], W: number, H: number): Vanish[] {
  const out: Vanish[] = [];
  let left = segs.slice();
  const fits = (s: Segment, p: number[]) => {
    const mx = (s.x0 + s.x1) / 2, my = (s.y0 + s.y1) / 2, dx = s.x1 - s.x0, dy = s.y1 - s.y0;
    // p homogeneous: the way from the segment's middle to it, against the segment's own
    const vx = p[0] - mx * p[2], vy = p[1] - my * p[2], l = Math.hypot(vx, vy) * Math.hypot(dx, dy);
    if (!l) return false;
    if (Math.abs(vx * dy - vy * dx) / l >= Math.sin((1.5 * Math.PI) / 180)) return false;
    // a point the segment runs through fits it whatever the point: it must lie beyond its ends
    if (Math.abs(p[2]) > 1e-9) { const t = (Math.abs((p[0] / p[2] - mx) * dx + (p[1] / p[2] - my) * dy) / Math.hypot(dx, dy)); if (t < s.len / 2 + 2) return false; }
    return true;
  };
  for (let round = 0; round < 3 && left.length >= 3; round++) {
    let best: number[] | null = null, bw = 0;
    for (let i = 0; i < left.length; i++) for (let j = i + 1; j < left.length; j++) {
      const a = left[i].n, b = left[j].n, p = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
      const da = Math.min(Math.abs(left[i].a - left[j].a), 180 - Math.abs(left[i].a - left[j].a));
      if (da < 2 && Math.abs(p[2]) > 1e-9 && Math.hypot(p[0] / p[2] - W / 2, p[1] / p[2] - H / 2) < 30 * W) continue;
      let w = 0, n = 0;
      for (const s of left) if (fits(s, p)) { w += s.len; n++; }
      if (n >= 3 && w > bw) { bw = w; best = p; }
    }
    if (!best) break;
    const lines = left.filter((s) => fits(s, best!));
    // refine: the point nearest all its lines (least squares on their normals)
    let a11 = 0, a12 = 0, a22 = 0, b1 = 0, b2 = 0;
    for (const s of lines) { const [c, sn, d] = s.n, w = s.len; a11 += w * c * c; a12 += w * c * sn; a22 += w * sn * sn; b1 -= w * c * d; b2 -= w * sn * d; }
    const det = a11 * a22 - a12 * a12;
    let x = 0, y = 0, far = true;
    if (Math.abs(det) > 1e-6 * (a11 + a22) ** 2) { x = (b1 * a22 - b2 * a12) / det; y = (a11 * b2 - a12 * b1) / det; far = Math.hypot(x - W / 2, y - H / 2) > 30 * W; }
    // their mean direction (angles doubled, so 179° and 1° average to 0°) and how far they fan out: lines
    // within a few degrees of each other only meet far off, as parallels do
    let cx2 = 0, sx2 = 0;
    for (const q of lines) { cx2 += q.len * Math.cos((2 * q.a * Math.PI) / 180); sx2 += q.len * Math.sin((2 * q.a * Math.PI) / 180); }
    const mean = ((Math.atan2(sx2, cx2) * 180) / Math.PI / 2 + 180) % 180, th = (mean * Math.PI) / 180;
    const fan = Math.max(...lines.map((q) => { const d = Math.abs(q.a - mean) % 180; return Math.min(d, 180 - d); }));
    if (fan < 4) far = true;
    out.push({ x, y, far, dir: [Math.cos(th), Math.sin(th)], lines, weight: bw, fan });
    left = left.filter((s) => !lines.includes(s));
    // a level point found: the second of a two-point view lies on the same horizon, so look along that
    // row for where the rest of the lines cross it (beyond their ends), the way the first was found
    if (round === 0 && !far && Math.abs(Math.cos(th)) > 0.3) {
      // each line's crossing of the row, give or take what 1.5° of its angle makes there (much, for a
      // shallow line drawn out from far); the point most of their length covers
      const hits: { x: number; e: number; s: Segment }[] = [];
      for (const q of left) {
        const dx = q.x1 - q.x0, dy = q.y1 - q.y0;
        if (Math.abs(dy) < 1e-6 || Math.abs(dx) < 1e-6) continue;
        const t = (y - q.y0) / dy, hx = q.x0 + t * dx;
        if (t > -0.05 && t < 1.05) continue;                              // the row crosses the segment itself
        if (Math.abs(hx - W / 2) > 6 * W) continue;
        const reach = Math.max(Math.abs(t), Math.abs(t - 1)) * q.len, sinA = Math.abs(dy) / q.len;
        hits.push({ x: hx, e: Math.max(3, (reach * Math.tan((1.5 * Math.PI) / 180)) / sinA), s: q });
      }
      let best2: { x: number; ls: Segment[]; w: number } | null = null;
      for (const h of hits) {
        const ls = hits.filter((o) => Math.abs(o.x - h.x) <= o.e).map((o) => o.s), w2 = ls.reduce((a, q) => a + q.len, 0);
        if (ls.length >= 4 && (!best2 || w2 > best2.w)) best2 = { x: h.x, ls, w: w2 };
      }
      if (best2 && best2.w >= 0.2 * bw && Math.abs(best2.x - x) > 0.3 * W) {
        const ls = best2.ls, hx = hits.filter((o) => ls.includes(o.s)).reduce((a, o) => a + o.x * o.s.len, 0) / best2.w;
        out.push({ x: hx, y, far: false, dir: [1, 0], lines: ls, weight: best2.w, fan: 0 });
        left = left.filter((q) => !ls.includes(q));
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------- motion
export interface Flow { x: number; y: number; dx: number; dy: number }
export const lumaOf = (img: Img) => { const L = new Float32Array(img.w * img.h); for (let i = 0; i < L.length; i++) L[i] = clear(img.data[i]) ? 0 : lab(img.data[i])[0]; return L; };
/** Block matching between two frames: for each textured block, the shift (within ±r px) whose match is clearly the best. */
export function blockFlow(a: Float32Array, b: Float32Array, W: number, H: number, B = 8, r = 10, step = 1): Flow[] {
  const out: Flow[] = [];
  for (let by = r; by + B + r <= H; by += B) for (let bx = r; bx + B + r <= W; bx += B) {
    let mean = 0;
    for (let y = 0; y < B; y++) for (let x = 0; x < B; x++) mean += a[(by + y) * W + bx + x];
    mean /= B * B;
    let vari = 0;
    for (let y = 0; y < B; y++) for (let x = 0; x < B; x++) vari += (a[(by + y) * W + bx + x] - mean) ** 2;
    if (vari / (B * B) < 0.0008) continue;
    let best = Infinity, second = Infinity, bdx = 0, bdy = 0, zero = 0;
    for (let dy = -r; dy <= r; dy += step) for (let dx = -r; dx <= r; dx += step) {
      let sad = 0;
      for (let y = 0; y < B && sad < second; y++) for (let x = 0; x < B; x++) sad += Math.abs(a[(by + y) * W + bx + x] - b[(by + y + dy) * W + bx + x + dx]);
      if (!dx && !dy) zero = sad;
      if (sad < best) { if (Math.abs(dx - bdx) + Math.abs(dy - bdy) > 1) second = best; best = sad; bdx = dx; bdy = dy; }
      else if (sad < second && Math.abs(dx - bdx) + Math.abs(dy - bdy) > 1) second = sad;
    }
    if (best > 0.08 * B * B) continue;                                   // nothing there matches
    if ((bdx || bdy) && best > 0.7 * zero) continue;                     // no better than standing still
    if (second < Infinity && best > 0.8 * second) continue;              // ambiguous (a repeating texture)
    out.push({ x: bx + B / 2, y: by + B / 2, dx: bdx, dy: bdy });
  }
  return out;
}

/**
 * The point the motion opens out from (or closes in to): candidates where two vectors' lines cross,
 * each scored by the vectors that point straight away from it (or at it) within ~25°; the best refined
 * by least squares on those. `agree`: their share of the moving vectors (the rest: things turning,
 * planes sliding across, parts moving on their own).
 */
export function focusOfExpansion(fl: Flow[]): { x: number; y: number; agree: number; out: boolean; n: number } | null {
  const mv = fl.filter((f) => f.dx || f.dy);
  if (mv.length < 12) return null;
  const score = (x: number, y: number) => {
    let o = 0, n = 0;
    for (const f of mv) {
      const rx = f.x - x, ry = f.y - y, c = (rx * f.dx + ry * f.dy) / (Math.hypot(rx, ry) * Math.hypot(f.dx, f.dy) || 1);
      if (c > 0.9) o++; else if (c < -0.9) n++;
    }
    return { o, n };
  };
  let bx = 0, by = 0, best = -1;
  let seed = 12345;
  const rnd = () => { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 4294967296; };
  for (let t = 0; t < 300; t++) {
    const a = mv[Math.floor(rnd() * mv.length)], b = mv[Math.floor(rnd() * mv.length)];
    const det = a.dx * b.dy - a.dy * b.dx;
    if (Math.abs(det) < 1e-6) continue;
    const u = ((b.x - a.x) * b.dy - (b.y - a.y) * b.dx) / det, x = a.x + u * a.dx, y = a.y + u * a.dy;
    const { o, n } = score(x, y), m = Math.max(o, n);
    if (m > best) { best = m; bx = x; by = y; }
  }
  if (best < 0) return null;
  // refine on the vectors that agree
  const { o } = score(bx, by), out = o * 2 >= best * 2 && o === best;
  const ins = mv.filter((f) => { const rx = f.x - bx, ry = f.y - by, c = (rx * f.dx + ry * f.dy) / (Math.hypot(rx, ry) * Math.hypot(f.dx, f.dy) || 1); return out ? c > 0.9 : c < -0.9; });
  let a11 = 0, a12 = 0, a22 = 0, b1 = 0, b2 = 0;
  for (const f of ins) {
    const l = Math.hypot(f.dx, f.dy), nx = -f.dy / l, ny = f.dx / l, d = nx * f.x + ny * f.y;
    a11 += nx * nx; a12 += nx * ny; a22 += ny * ny; b1 += nx * d; b2 += ny * d;
  }
  const det = a11 * a22 - a12 * a12;
  if (Math.abs(det) > 1e-6 * (a11 + a22) ** 2) { bx = (b1 * a22 - b2 * a12) / det; by = (a11 * b2 - a12 * b1) / det; }
  const fin = score(bx, by), m = Math.max(fin.o, fin.n);
  return { x: bx, y: by, agree: m / mv.length, out: fin.o >= fin.n, n: m };
}

/** Mean lightness difference of two frames (every other pixel). */
export function frameDiff(a: Float32Array, b: Float32Array): number {
  let s = 0, n = 0;
  for (let i = 0; i < a.length; i += 2) { s += Math.abs(a[i] - b[i]); n++; }
  return s / n;
}

/**
 * For each band of rows, the horizontal shift (whole pixels, from `lo` to `hi`) that best carries frame
 * a onto frame b, how much better than standing still it fits (0 none, 1 perfectly), and whether the
 * band has texture enough to tell. Negative: moving left.
 */
export function bandShifts(a: Float32Array, b: Float32Array, W: number, H: number, band = 8, lo = -16, hi = 16): { y: number; dx: number; gain: number }[] {
  const out: { y: number; dx: number; gain: number }[] = [];
  for (let y0 = 0; y0 + band <= H; y0 += band) {
    let mean = 0;
    for (let y = y0; y < y0 + band; y++) for (let x = 0; x < W; x++) mean += a[y * W + x];
    mean /= band * W;
    let vari = 0;
    for (let y = y0; y < y0 + band; y++) for (let x = 0; x < W; x++) vari += (a[y * W + x] - mean) ** 2;
    if (vari / (band * W) < 0.0005) continue;
    const sad = (s: number) => {
      let t = 0, n = 0;
      for (let y = y0; y < y0 + band; y++) for (let x = Math.max(0, -s); x < Math.min(W, W - s); x++) { t += Math.abs(a[y * W + x] - b[y * W + x + s]); n++; }
      return n > W * band * 0.4 ? t / n : Infinity;
    };
    let best = Infinity, bs = 0;
    for (let s = lo; s <= hi; s++) { const v = sad(s); if (v < best) { best = v; bs = s; } }
    const still = sad(0);
    out.push({ y: y0, dx: bs, gain: still > 0 ? (still - best) / still : 0 });
  }
  return out;
}

/**
 * A photo, painting or render brought down to w x h by superpixels, after Gerstner, Decarlo, Alexa,
 * Finkelstein, Gingold and Nealen, "Pixelated Image Abstraction" (NPAR 2012): one superpixel per output
 * pixel, its center starting on the grid; each source pixel joins the nearest center among the
 * neighboring cells by color and place (SLIC); the centers move to their members and are pulled back
 * toward their neighbors' (a grid, not a jumble), a few times over. An output pixel is its
 * superpixel's mean, so an edge stays an edge instead of the blur a box average makes of it.
 */
export function pixelate(img: Img, w: number, h: number): Img {
  // work on at most four source pixels per output pixel each way
  const src = img.w > w * 4 || img.h > h * 4 ? areaDown(img, Math.min(img.w, w * 4), Math.min(img.h, h * 4)) : img;
  const W = src.w, H = src.h, sx = W / w, sy = H / h, n = w * h;
  const P = new Float32Array(W * H * 3), ok = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) { const c = src.data[i]; if (clear(c)) continue; ok[i] = 1; const [L, a, b] = lab(c); P[3 * i] = L; P[3 * i + 1] = a; P[3 * i + 2] = b; }
  const cx = new Float32Array(n), cy = new Float32Array(n), cl = new Float32Array(n * 3);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const k = j * w + i; cx[k] = (i + 0.5) * sx; cy[k] = (j + 0.5) * sy; const p = Math.min(H - 1, Math.floor(cy[k])) * W + Math.min(W - 1, Math.floor(cx[k])); cl.set(P.subarray(3 * p, 3 * p + 3), 3 * k); }
  const owner = new Int32Array(W * H).fill(-1), m = 0.45, S = Math.max(sx, sy);
  for (let it = 0; it < 6; it++) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const p = y * W + x;
      if (!ok[p]) continue;
      const gi = Math.min(w - 1, Math.floor(x / sx)), gj = Math.min(h - 1, Math.floor(y / sy));
      let best = -1, bd = Infinity;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        const i = gi + di, j = gj + dj;
        if (i < 0 || j < 0 || i >= w || j >= h) continue;
        const k = j * w + i, dl = P[3 * p] - cl[3 * k], da = P[3 * p + 1] - cl[3 * k + 1], db = P[3 * p + 2] - cl[3 * k + 2];
        const d = dl * dl + da * da + db * db + m * m * (((x - cx[k]) ** 2 + (y - cy[k]) ** 2) / (S * S));
        if (d < bd) { bd = d; best = k; }
      }
      owner[p] = best;
    }
    const sum = new Float64Array(n * 6);
    for (let p = 0; p < W * H; p++) { const k = owner[p]; if (k < 0) continue; sum[6 * k] += p % W; sum[6 * k + 1] += Math.floor(p / W); sum[6 * k + 2] += P[3 * p]; sum[6 * k + 3] += P[3 * p + 1]; sum[6 * k + 4] += P[3 * p + 2]; sum[6 * k + 5]++; }
    const nx = new Float32Array(n), ny = new Float32Array(n);
    for (let k = 0; k < n; k++) {
      const c = sum[6 * k + 5];
      if (!c) { nx[k] = cx[k]; ny[k] = cy[k]; continue; }
      nx[k] = sum[6 * k] / c; ny[k] = sum[6 * k + 1] / c;
      cl[3 * k] = sum[6 * k + 2] / c; cl[3 * k + 1] = sum[6 * k + 3] / c; cl[3 * k + 2] = sum[6 * k + 4] / c;
    }
    // pulled back toward the mean of the neighbors' centers (a Laplacian smoothing, as the paper does)
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const k = j * w + i, nb = [[i - 1, j], [i + 1, j], [i, j - 1], [i, j + 1]].filter(([a, b]) => a >= 0 && b >= 0 && a < w && b < h);
      const ax = nb.reduce((s, [a, b]) => s + nx[b * w + a], 0) / nb.length, ay = nb.reduce((s, [a, b]) => s + ny[b * w + a], 0) / nb.length;
      cx[k] = 0.6 * nx[k] + 0.4 * ax; cy[k] = 0.6 * ny[k] + 0.4 * ay;
    }
  }
  // each output pixel: its members' mean in sRGB
  const rgb = new Float64Array(n * 4), out = new Img(w, h);
  for (let p = 0; p < W * H; p++) { const k = owner[p]; if (k < 0) continue; const [r, g, b] = channels(src.data[p]); rgb[4 * k] += r; rgb[4 * k + 1] += g; rgb[4 * k + 2] += b; rgb[4 * k + 3]++; }
  for (let k = 0; k < n; k++) if (rgb[4 * k + 3]) out.data[k] = pack(Math.round(rgb[4 * k] / rgb[4 * k + 3]), Math.round(rgb[4 * k + 1] / rgb[4 * k + 3]), Math.round(rgb[4 * k + 2] / rgb[4 * k + 3]));
  return out;
}
