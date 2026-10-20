// What a picture is made of, measured: the grid of an upscaled drawing, its palette and ramps, the
// pixel-art techniques in it (outlines, dithering, anti-aliasing, where the light comes from), the
// lines of its perspective and where they meet, and in an animation how things move (a cycle, planes
// going by at their own speeds, a scene opening out from the point it moves toward). `pxl study`
// turns these numbers into a report (study.ts); each function here is only a measurement.
import { type Color, TRANSPARENT, channels, oklab, pack } from "./color.ts";
import { Img } from "./image.ts";

const LAB = new Map<Color, [number, number, number]>();
export const lab = (c: Color) => { let v = LAB.get(c); if (!v) { if (LAB.size > 200000) LAB.clear(); v = oklab(c); LAB.set(c, v); } return v; };
export const dE = (a: Color, b: Color) => { const p = lab(a), q = lab(b); return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); };
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
export function findGrid(img: Img): Grid {
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
  /** a sprite's edge against the clear: black, a darker shade of the inside, or none */
  edge: { black: number; selective: number; none: number } | null;
  /** in-between tones on a step between two colors (manual anti-aliasing) */
  aa: number;
  /** pixels whose color none of their four neighbors share */
  orphans: number;
  /** where the lighter tones of each ramp lie: the way toward the light on screen (x right, y down) and how consistently */
  light: { ramp: number; dir: [number, number]; sure: number; n: number }[];
  /** per pixel: 1 in a checker, 2 a thin dark line, 4 an in-between tone */
  mask: Uint8Array;
}
export function techniques(img: Img, ramps: Ramp[]): Techniques {
  const W = img.w, H = img.h, at = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= H ? TRANSPARENT : img.data[y * W + x]);
  const rampOf = new Map<Color, number>();
  ramps.forEach((r, i) => r.colors.forEach((c) => rampOf.set(c, i)));
  let pixels = 0, lines = 0, selective = 0, black = 0, aa = 0, orphans = 0;
  const inDither = new Uint8Array(W * H), mask = new Uint8Array(W * H), pairs = new Map<string, number>();
  let edge: Techniques["edge"] = null;
  const vec = ramps.map(() => [0, 0, 0]);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = at(x, y);
    if (clear(c)) continue;
    pixels++;
    const L = lch(c).L, nb = [at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)];
    if (nb.every((n) => n !== c)) orphans++;
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
  let eb = 0, es = 0, en = 0;
  const sprite = img.data.some((c) => clear(c));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = at(x, y);
    if (clear(c)) continue;
    // beyond the picture is clear for a sprite (something with clear pixels), not for an opaque scene
    const out = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].filter(([u, v]) => sprite || (u >= 0 && v >= 0 && u < W && v < H));
    if (!out.some(([u, v]) => clear(at(u, v)))) continue;
    const inner = out.map(([u, v]) => at(x + (x - u), y + (y - v))).find((n) => !clear(n));
    const k = lch(c);
    if (k.C < 0.04 && k.L < 0.3) eb++;
    else if (inner !== undefined && lch(inner).L - k.L > 0.08) es++;
    else en++;
  }
  if (sprite && eb + es + en >= 8) edge = { black: eb, selective: es, none: en };
  let ditherN = 0, r0 = H, r1 = -1;
  for (let i = 0; i < inDither.length; i++) if (inDither[i]) { ditherN++; mask[i] |= 1; const y = Math.floor(i / W); r0 = Math.min(r0, y); r1 = Math.max(r1, y); }
  const ditherPairs = [...pairs].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, n]) => { const [a, b] = k.split(",").map(Number); return [a, b, n] as [Color, Color, number]; });
  const light = vec.map(([vx, vy, n], ramp) => ({ ramp, dir: [n ? vx / n : 0, n ? vy / n : 0] as [number, number], sure: n ? Math.hypot(vx, vy) / n : 0, n }))
    .filter((l) => l.n >= 30).sort((a, b) => b.n - a.n);
  return { pixels, dither: ditherN, ditherPairs, ditherRows: r1 >= 0 ? [r0, r1] : null, lines, selective, black, edge, aa, orphans, light, mask };
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
/** Straight edges: Sobel on lightness, a Hough transform voting near each edge's own direction, each peak kept as the longest run of edge pixels along it. */
export function findSegments(img: Img): Segment[] {
  const W = img.w, H = img.h, L = new Float32Array(W * H);
  for (let i = 0; i < L.length; i++) L[i] = clear(img.data[i]) ? 0 : lab(img.data[i])[0];
  const mag = new Float32Array(W * H), ang = new Float32Array(W * H);
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const p = (dx: number, dy: number) => L[(y + dy) * W + x + dx];
    const gx = p(1, -1) + 2 * p(1, 0) + p(1, 1) - p(-1, -1) - 2 * p(-1, 0) - p(-1, 1);
    const gy = p(-1, 1) + 2 * p(0, 1) + p(1, 1) - p(-1, -1) - 2 * p(0, -1) - p(1, -1);
    mag[y * W + x] = Math.hypot(gx, gy); ang[y * W + x] = Math.atan2(gy, gx);
  }
  const sorted = Float32Array.from(mag).sort(), thr = Math.max(0.12, sorted[Math.floor(sorted.length * 0.85)]);
  const edges: number[] = [];
  for (let i = 0; i < mag.length; i++) if (mag[i] > thr) edges.push(i);
  const diag = Math.ceil(Math.hypot(W, H)), R = 2 * diag + 1, acc = new Int32Array(180 * R);
  for (const i of edges) {
    const x = i % W, y = Math.floor(i / W), t0 = Math.round(((ang[i] * 180) / Math.PI + 360) % 180);
    for (let dt = -6; dt <= 6; dt++) {
      const t = (t0 + dt + 180) % 180, th = (t * Math.PI) / 180, r = Math.round(x * Math.cos(th) + y * Math.sin(th)) + diag;
      acc[t * R + r]++;
    }
  }
  const minLen = Math.max(8, Math.round(0.1 * Math.min(W, H)));
  const peaks: [number, number, number][] = [];
  for (let t = 0; t < 180; t++) for (let r = 0; r < R; r++) {
    const v = acc[t * R + r];
    if (v < minLen) continue;
    let top = true;
    for (let dt = -3; dt <= 3 && top; dt++) for (let dr = -3; dr <= 3; dr++) {
      const tt = (t + dt + 180) % 180, rr = r + (t + dt < 0 || t + dt >= 180 ? -(r - diag) * 2 + dr : dr);
      if ((dt || dr) && rr >= 0 && rr < R && acc[tt * R + rr] > v) { top = false; break; }
    }
    if (top) peaks.push([v, t, r - diag]);
  }
  peaks.sort((a, b) => b[0] - a[0]);
  const segs: Segment[] = [];
  for (const [, t, r] of peaks.slice(0, 60)) {
    const th = (t * Math.PI) / 180, c = Math.cos(th), s = Math.sin(th), along: number[] = [];
    for (const i of edges) {
      const x = i % W, y = Math.floor(i / W);
      if (Math.abs(x * c + y * s - r) > 1.2) continue;
      const da = Math.abs((((ang[i] * 180) / Math.PI - t) % 180 + 180) % 180);
      if (Math.min(da, 180 - da) > 18) continue;
      along.push(-x * s + y * c);
    }
    along.sort((a, b) => a - b);
    let bs = 0, be = -1, s0 = 0;
    for (let k = 1; k <= along.length; k++) if (k === along.length || along[k] - along[k - 1] > 3) { if (along[k - 1] - along[s0] > (be >= 0 ? along[be] - along[bs] : -1)) { bs = s0; be = k - 1; } s0 = k; }
    if (be < 0 || along[be] - along[bs] < minLen) continue;
    const p0 = [r * c - along[bs] * s, r * s + along[bs] * c], p1 = [r * c - along[be] * s, r * s + along[be] * c];
    const a = ((Math.atan2(p1[1] - p0[1], p1[0] - p0[0]) * 180) / Math.PI + 180) % 180;
    if (segs.some((q) => Math.min(Math.abs(q.a - a), 180 - Math.abs(q.a - a)) < 2 && Math.abs(q.n[0] * (p0[0] + p1[0]) / 2 + q.n[1] * (p0[1] + p1[1]) / 2 + q.n[2]) < 3)) continue;
    segs.push({ x0: p0[0], y0: p0[1], x1: p1[0], y1: p1[1], len: along[be] - along[bs], a, n: [c, s, -r] });
  }
  return segs.sort((p, q) => q.len - p.len).slice(0, 40);
}

export interface Vanish { x: number; y: number; far: boolean; dir: [number, number]; lines: Segment[]; weight: number }
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
    return Math.abs(vx * dy - vy * dx) / l < Math.sin((1.5 * Math.PI) / 180);
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
    out.push({ x, y, far, dir: [Math.cos(th), Math.sin(th)], lines, weight: bw });
    left = left.filter((s) => !lines.includes(s));
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
