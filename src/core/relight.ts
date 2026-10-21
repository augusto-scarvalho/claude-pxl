// The light in an animation apart from what moves in it: a lamp pulsing, a fire flickering on the walls,
// a whole cave dimming. A change of light multiplies every color under it alike, so where only the light
// changed, each frame's ratio to the background (channel by channel, in linear light) is smooth over the
// picture whatever the materials under it (after Weiss, "Deriving intrinsic images from image
// sequences", 2001, and Matsushita, Nishino, Ikeuchi and Sakauchi, "Illumination normalization with
// time-dependent intrinsic images for video surveillance", 2004). A thing that comes in is told from a
// light by where its change stops: hard, where the background has no edge (a ghost on a flat sky); a
// light fades out, or stops at an edge the background already had (a window lit).
//
// What study gets: the pixels each frame whose change is the light's alone, and each frame with them put
// back as the background has them (things are looked for in those, apart from the light round them).
import { type Color, pack } from "./color.ts";
import { Img } from "./image.ts";

const LIN = new Map<Color, [number, number, number]>();
/** Each channel's linear light, logged (a little added, so black divides). */
const logLin = (c: Color) => {
  let v = LIN.get(c);
  if (!v) {
    const f = (u: number) => { u /= 255; return Math.log((u <= 0.04045 ? u / 12.92 : ((u + 0.055) / 1.055) ** 2.4) + 0.01); };
    v = [f((c >>> 24) & 255), f((c >>> 16) & 255), f((c >>> 8) & 255)];
    if (LIN.size > 200000) LIN.clear();
    LIN.set(c, v);
  }
  return v;
};
const fromLog = (l: ArrayLike<number>) => {
  const g = (u: number) => { u = Math.max(0, Math.exp(u) - 0.01); return Math.max(0, Math.min(255, Math.round(255 * (u <= 0.0031308 ? 12.92 * u : 1.055 * u ** (1 / 2.4) - 0.055)))); };
  return pack(g(l[0]), g(l[1]), g(l[2]));
};

export interface Relight {
  /** per frame, the pixels whose change is the light's alone */
  relit: Uint8Array[];
  /** per frame, the frame with what only the light changed put back as the background has it */
  flat: Img[];
  /** whether the light changes anywhere */
  any: boolean;
  /** per frame, the pixels it relit and the change at each, channel by channel (log, linear light): 3 a pixel */
  lit: { p: Int32Array; r: Float32Array }[];
  /** each light, the pixels it relights often (in 5% of the frames, at least two), told apart by changing in step */
  lamps: number[][];
}

/** A light's color from its change (log ratios, channel by channel): its brightest channel at full. */
export const lightColor = (r: number[]) => { const top = Math.max(...r); return fromLog(r.map((v) => v - top + Math.log(1.01))); };

/**
 * The light's changes over a clip, against its background (each pixel's commonest color). `still`
 * says which rows hold still (planes going by are compared frame to frame, not here); `skip`, each frame's
 * pixels where something goes by (followed as it goes: a light doesn't travel); `differ` is when
 * two colors count as different. A pixel's change is like the light's when it is within `tol` (log) of
 * most of its changed neighbors'; a run of such pixels is a light unless more than a third of the edge where
 * its change stops is a step of more than `hard` (log) and twice the background's own step there, or nearly all of it is the
 * background moved a step (a thing moving a pixel or two), or it is under 8 px, or its pixels change out
 * of step with their neighbors over the clip (a thing going by).
 */
export function relight(F: Img[], bg: Uint32Array, still: (y: number) => boolean, differ: (a: Color, b: Color) => boolean, skip?: Uint8Array[], tol = 0.3, hard = 0.9): Relight {
  const W = F[0].w, H = F[0].h, WH = W * H;
  const relit: Uint8Array[] = [], flat: Img[] = [], lit: { p: Int32Array; r: Float32Array }[] = [];
  let any = false;
  // each pixel's change over the clip (the mean of its channels, frames spread across it), and how far
  // it goes in step with its neighbors': pixels lit by one lamp brighten and dim together whatever their
  // distance from it; a dark limb going by over a dark floor changes its neighbors one after another
  // (after Koppal and Narasimhan, "Clustering appearance for scene analysis", 2006)
  const T = Array.from({ length: Math.min(F.length, 48) }, (_, i) => Math.floor((i * F.length) / Math.min(F.length, 48)));
  const curve = new Float32Array(WH * T.length), moves = new Uint8Array(WH);
  T.forEach((t, k) => { const f = F[t]; for (let p = 0; p < WH; p++) if (still(Math.floor(p / W)) && (bg[p] & 255) >= 128 && (f.data[p] & 255) >= 128 && f.data[p] !== bg[p] && differ(f.data[p], bg[p])) { const a = logLin(f.data[p]), b = logLin(bg[p]); curve[p * T.length + k] = (a[0] - b[0] + a[1] - b[1] + a[2] - b[2]) / 3; moves[p] = 1; } });
  // (each pixel's mean and spread worked out once, and each pair once: the same sums, in the same order)
  const n = T.length, mean = new Float64Array(WH), vari = new Float64Array(WH);
  for (let p = 0; p < WH; p++) {
    if (!moves[p]) continue;
    let m = 0, v = 0;
    for (let k = 0; k < n; k++) m += curve[p * n + k];
    m /= n;
    for (let k = 0; k < n; k++) { const x = curve[p * n + k] - m; v += x * x; }
    mean[p] = m; vari[p] = v;
  }
  const corr = (p: number, q: number) => {
    const a = p * n, b = q * n, ma = mean[p], mb = mean[q], va = vari[p], vb = vari[q];
    let c = 0;
    for (let k = 0; k < n; k++) c += (curve[a + k] - ma) * (curve[b + k] - mb);
    return va && vb ? c / Math.sqrt(va * vb) : va === vb ? 1 : 0;
  };
  // a pair's correlation is the same either way: kept by direction (0..7 round the pixel) for its other end
  const pair = new Float64Array(WH * 8).fill(NaN);
  const together = new Float32Array(WH);
  for (let p = 0; p < WH; p++) {
    if (!moves[p]) continue;
    const x = p % W, y = Math.floor(p / W);
    let s = 0, m = 0, d = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const xx = x + dx, yy = y + dy, q = yy * W + xx, k = d++;
      if (xx < 0 || yy < 0 || xx >= W || yy >= H || !moves[q]) continue;
      let r = pair[p * 8 + k];
      if (Number.isNaN(r)) { r = corr(p, q); pair[q * 8 + (7 - k)] = r; }
      s += r; m++;
    }
    together[p] = m ? s / m : 0;
  }
  for (const [t, f] of F.entries()) {
    const ok = (p: number) => still(Math.floor(p / W)) && (bg[p] & 255) >= 128 && (f.data[p] & 255) >= 128;
    const lr = new Float32Array(WH * 3), changed = new Uint8Array(WH);
    for (let p = 0; p < WH; p++) {
      if (!ok(p) || f.data[p] === bg[p] || !differ(f.data[p], bg[p])) continue;
      changed[p] = 1;
      const a = logLin(f.data[p]), b = logLin(bg[p]);
      for (let c = 0; c < 3; c++) lr[3 * p + c] = a[c] - b[c];
    }
    // a change like most of its neighbors' (a light falls off smoothly however steeply; a thing's
    // texture changes pixel to pixel)
    const like = new Uint8Array(WH);
    for (let p = 0; p < WH; p++) {
      if (!changed[p]) continue;
      const x = p % W, y = Math.floor(p / W);
      let n = 0, same = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy, q = yy * W + xx;
        if ((!dx && !dy) || xx < 0 || yy < 0 || xx >= W || yy >= H || !changed[q]) continue;
        n++;
        if (Math.max(Math.abs(lr[3 * p] - lr[3 * q]), Math.abs(lr[3 * p + 1] - lr[3 * q + 1]), Math.abs(lr[3 * p + 2] - lr[3 * q + 2])) < tol) same++;
      }
      if (n && same >= n / 2 && !skip?.[t][p]) like[p] = 1;
    }
    // runs of them (diagonals join: a glow dithered), each a light unless its change stops hard on a flat background
    const mine = new Uint8Array(WH), seen = new Uint8Array(WH);
    for (let i = 0; i < WH; i++) {
      if (!like[i] || seen[i]) continue;
      const run = [i];
      seen[i] = 1;
      for (let k = 0; k < run.length; k++) {
        const p = run[k], x = p % W, y = Math.floor(p / W);
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy, q = yy * W + xx; if (xx >= 0 && yy >= 0 && xx < W && yy < H && like[q] && !seen[q]) { seen[q] = 1; run.push(q); } }
      }
      let edge = 0, steep = 0, inStep = 0;
      for (const p of run) {
        inStep += together[p];
        const x = p % W, y = Math.floor(p / W);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const xx = x + dx, yy = y + dy, q = yy * W + xx;
          if (xx < 0 || yy < 0 || xx >= W || yy >= H || changed[q] || !ok(q)) continue;
          edge++;
          // a step far bigger than the background's own there (a silhouette on a dithered sky; not a
          // window lit up to its frame)
          const jump = Math.max(Math.abs(lr[3 * p]), Math.abs(lr[3 * p + 1]), Math.abs(lr[3 * p + 2])), a = logLin(bg[p]), b = logLin(bg[q]);
          if (jump > hard && jump > 2 * Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]))) steep++;
        }
      }
      // a thing moved a pixel or two (a ghost bobbing: its shading shifts as softly as a light): nearly
      // all the run is the background as it was a step away, the same step all over (a light on a
      // dithered ground matches up to 85% by chance); and a run of a few pixels can't be told from a
      // thing's shading changing
      let moved = 0;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        if (!dx && !dy) continue;
        let n = 0;
        for (const p of run) { const x = p % W + dx, y = Math.floor(p / W) + dy; if (x >= 0 && y >= 0 && x < W && y < H && !differ(f.data[p], bg[y * W + x])) n++; }
        moved = Math.max(moved, n);
      }
      if (edge && steep <= edge / 3 && run.length >= 8 && moved < 0.9 * run.length && inStep >= 0.5 * run.length) for (const p of run) mine[p] = 1;
    }
    // the frame without the light's changes: what it relit back to the background (what it lights on a
    // thing stays: the light on a thing can't be told from round it, a dancer under a mirror ball's spots;
    // dividing it out made things' colors worse against pxl's own scenes, scripts/calibrate.ts)
    const out = f.copy(), ps: number[] = [];
    for (let p = 0; p < WH; p++) if (mine[p]) { out.data[p] = bg[p]; ps.push(p); }
    if (ps.length) any = true;
    const r = new Float32Array(3 * ps.length);
    ps.forEach((p, i) => { for (let c = 0; c < 3; c++) r[3 * i + c] = lr[3 * p + c]; });
    relit.push(mine); flat.push(out); lit.push({ p: Int32Array.from(ps), r });
  }
  // the lights: pixels relit often, joined to neighbors that change in step with them (two pools side by
  // side pulsing to their own rhythms are two lights)
  const count = new Uint16Array(WH), up = new Int32Array(WH).map((_, i) => i), top = (i: number): number => (up[i] === i ? i : (up[i] = top(up[i])));
  for (const m of relit) for (let p = 0; p < WH; p++) count[p] += m[p];
  const often = (p: number) => count[p] >= Math.max(2, 0.05 * F.length);
  for (let p = 0; p < WH; p++) {
    if (!often(p)) continue;
    const x = p % W, y = Math.floor(p / W);
    for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [-1, 1]]) { const xx = x + dx, yy = y + dy, q = yy * W + xx; if (xx >= 0 && xx < W && yy < H && often(q) && corr(p, q) >= 0.7) up[top(p)] = top(q); }
  }
  const byRoot = new Map<number, number[]>();
  for (let p = 0; p < WH; p++) if (often(p)) (byRoot.get(top(p)) ?? byRoot.set(top(p), []).get(top(p))!).push(p);
  return { relit, flat, any, lit, lamps: [...byRoot.values()] };
}
