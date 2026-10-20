// An animation taken apart into its objects, each isolated from the others, followed from frame to frame
// (its box in each frame) and read for what it is, so it can be built again from the right pieces:
// the backdrop that never changes; planes going by (the bands study reads); things carried along a path
// (one drawing, or changing drawings: a walk); things going across one after another (traffic); things
// animated in place (a cycle of drawings); things whose parts move against a still body (a rig);
// effects that change all over without repeating (fire, water, smoke); lights that pulse.
//
// In the spirit of layered motion (Wang and Adelson, "Representing moving images with layers", 1994):
// the background is each pixel's commonest color over the clip, a plane's expected pixel the one its
// own step carries from the frame before, and what differs from them is the objects. A thing that goes
// somewhere is followed piece by piece (the piece in the next frame of about its size a plausible step
// on); the rest is isolated where it changes: fragments that touch, put back together into one object
// when they are near each other, change in the same rhythm and share colors (one dancer's arm and leg,
// not two dancers side by side).
import type { Color } from "./color.ts";
import { Img } from "./image.ts";
import { dE, lab } from "./vision.ts";

export interface Band { y0: number; y1: number; v: number }
export type Kind = "carried" | "walk" | "stream" | "anim" | "rig" | "effect" | "light";
export interface Piece {
  kind: Kind;
  /** where it is: its box over the clip (x, y, w, h) */
  box: [number, number, number, number];
  /** how many frames it shows in, the distinct drawings of it, the frames after which they repeat (0: none) */
  frames: number; poses: number; cycle: number;
  /** carried: px a frame, and how much bigger it gets from first to last (perspective) */
  speed?: [number, number]; grow?: number;
  /** the separate parts of it that move (more than one: limbs against a body, a rig) */
  parts?: number;
  /** carried round a loop (circling, swinging) rather than one way */
  round?: boolean;
  /** its box in each frame it shows in: [frame, x, y, w, h] */
  track: [number, number, number, number, number][];
  /** it alone, cut out of a few frames across the clip (a thing carried: only its own pixels) */
  cuts: Img[];
}

type Blob = { x0: number; y0: number; x1: number; y1: number; n: number; cx: number; cy: number; pix: number[] };
type Comp = Blob & { t: number; id: number };

export function decompose(frames: Img[], bands: Band[], tol = 0.05, flows: { x: number; y: number; dx: number; dy: number }[] = []): { pieces: Piece[]; still: number; frames: number } {
  const N = Math.min(frames.length, 400), F = frames.slice(0, N), W = F[0].w, H = F[0].h, WH = W * H;
  const rowV = new Float32Array(H);
  for (const b of bands) for (let y = Math.max(0, b.y0); y < Math.min(H, b.y1); y++) rowV[y] = b.v;
  const differ = (a: Color, b: Color) => a !== b && ((a & 255) < 128 !== (b & 255) < 128 || dE(a, b) > tol);
  // the background: each pixel's commonest color over frames spread across the clip
  const S = Array.from({ length: Math.min(N, 48) }, (_, i) => Math.floor((i * N) / Math.min(N, 48)));
  const bg = new Uint32Array(WH), vals = new Uint32Array(S.length);
  for (let p = 0; p < WH; p++) {
    S.forEach((t, i) => (vals[i] = F[t].data[p]));
    vals.sort();
    let best = vals[0], run = 0, cur = 1;
    for (let i = 1; i <= vals.length; i++) { if (i < vals.length && vals[i] === vals[i - 1]) cur++; else { if (cur > run) { run = cur; best = vals[i - 1]; } cur = 1; } }
    bg[p] = best;
  }
  // a plane's step each frame: the whole number of pixels that carries its rows best (a speed of 1.67
  // px/frame goes by in steps of 1 and 2)
  const stepOf = (t: number, b: Band) => {
    let best = 0, bd = Infinity;
    for (const d of new Set([Math.floor(b.v), Math.ceil(b.v), Math.floor(b.v) - 1, Math.ceil(b.v) + 1])) {
      let n = 0;
      for (let y = Math.max(0, b.y0); y < Math.min(H, b.y1); y += 2) for (let x = Math.max(0, d); x < Math.min(W, W + d); x += 2) if (F[t].data[y * W + x] !== F[t - 1].data[y * W + x - d]) n++;
      if (n < bd) { bd = n; best = d; }
    }
    return best;
  };
  // what differs: from the background in still rows; from the frame before carried by its step in a plane's
  const fg = F.map((f, t) => {
    const m = new Uint8Array(WH), steps = t ? bands.map((b) => stepOf(t, b)) : [];
    for (let y = 0; y < H; y++) {
      const v = rowV[y];
      if (!v) { for (let x = 0; x < W; x++) if (differ(f.data[y * W + x], bg[y * W + x])) m[y * W + x] = 1; continue; }
      if (!t) continue;
      const d = steps[bands.findIndex((b) => y >= b.y0 && y < b.y1)] ?? Math.round(v);
      for (let x = Math.max(0, d); x < Math.min(W, W + d); x++) if (differ(f.data[y * W + x], F[t - 1].data[y * W + x - d])) m[y * W + x] = 1;
    }
    return m;
  });
  const pieces: Piece[] = [];
  // ---------------------------------------------------------------- things that go somewhere
  // each frame's pieces of difference, followed: the piece in the frame before of about the same size
  // (two things merging or one splitting starts over) a plausible step away
  const comps: Comp[][] = fg.map((m, t) => label(m, W, H, 2).filter((c) => c.n >= 4).map((c) => ({ ...c, t, id: -1 })));
  let next = 0;
  const tracks = new Map<number, Comp[]>();
  for (let t = 0; t < N; t++) for (const c of comps[t]) {
    let link: Comp | null = null, best = 0;
    if (t) for (const p of comps[t - 1]) {
      if (c.n > 2.5 * p.n || p.n > 2.5 * c.n) continue;
      const ov = Math.max(0, Math.min(c.x1, p.x1) - Math.max(c.x0, p.x0) + 1) * Math.max(0, Math.min(c.y1, p.y1) - Math.max(c.y0, p.y0) + 1);
      const near = Math.hypot(c.cx - p.cx, c.cy - p.cy) <= Math.max(6, 0.75 * Math.max(c.x1 - c.x0, c.y1 - c.y0));
      const score = near ? ov + 0.5 : 0;
      if (score > best && tracks.get(p.id)!.at(-1)!.t !== t) { best = score; link = p; }
    }
    c.id = link ? link.id : next++;
    (tracks.get(c.id) ?? tracks.set(c.id, []).get(c.id)!).push(c);
  }
  const inPlace = new Uint16Array(WH);
  for (const tr of tracks.values()) {
    const size = median(tr.map((c) => Math.max(c.x1 - c.x0 + 1, c.y1 - c.y0 + 1)));
    const dx = tr.at(-1)!.cx - tr[0].cx, dy = tr.at(-1)!.cy - tr[0].cy, travel = Math.hypot(dx, dy);
    let path = 0;
    for (let i = 1; i < tr.length; i++) path += Math.hypot(tr[i].cx - tr[i - 1].cx, tr[i].cy - tr[i - 1].cy);
    const span = tr.at(-1)!.t - tr[0].t || 1, vx = dx / span, vy = dy / span, sp = Math.hypot(vx, vy);
    let steady = 0;
    for (let i = 1; i < tr.length; i++) {
      const g = tr[i].t - tr[i - 1].t || 1, sx = (tr[i].cx - tr[i - 1].cx) / g, sy = (tr[i].cy - tr[i - 1].cy) / g;
      if (Math.hypot(sx - vx, sy - vy) <= Math.max(1.5, 0.75 * sp)) steady++;
    }
    if (tr.length >= 6 && travel >= Math.max(8, 0.8 * size) && travel >= 0.6 * path && sp <= Math.max(2, 0.5 * size) && steady >= 0.7 * (tr.length - 1)) {
      // carried along: one drawing, or changing drawings (the thing cut out by its difference, bottom-centered)
      const cut = tr.map((c) => cutout(F[c.t], fg[c.t], c, W));
      const { poses, cycle } = posesOf(cut, differ);
      const first = median(tr.slice(0, 3).map((c) => c.y1 - c.y0 + 1)), last = median(tr.slice(-3).map((c) => c.y1 - c.y0 + 1));
      const x0 = Math.min(...tr.map((c) => c.x0)), y0 = Math.min(...tr.map((c) => c.y0)), x1 = Math.max(...tr.map((c) => c.x1)), y1 = Math.max(...tr.map((c) => c.y1));
      pieces.push({
        kind: poses >= 3 ? "walk" : "carried", box: [x0, y0, x1 - x0 + 1, y1 - y0 + 1], frames: tr.length, poses, cycle, speed: [vx, vy], grow: last / first,
        track: tr.map((c) => [c.t, c.x0, c.y0, c.x1 - c.x0 + 1, c.y1 - c.y0 + 1]), cuts: spread(tr, 8).map((c) => toImg(cutout(F[c.t], fg[c.t], c, W))),
      });
    } else for (const c of tr) for (const p of c.pix) inPlace[p]++;
  }
  // ---------------------------------------------------------------- things in place, each isolated
  const busy = new Uint8Array(WH);
  for (let p = 0; p < WH; p++) if (inPlace[p] >= Math.max(2, 0.05 * N)) busy[p] = 1;
  const frags = label(busy, W, H, 1).filter((c) => c.n >= 4);
  // each fragment's rhythm (how much of it differs in each frame) and its colors (to 4 bits a channel)
  const rhythm = frags.map((f) => F.map((_, t) => { let s = 0; for (const p of f.pix) s += fg[t][p]; return s / f.n; }));
  const S8 = S.filter((_, i) => i % Math.max(1, Math.floor(S.length / 8)) === 0);
  const colors = frags.map((f) => { const m = new Map<number, number>(); for (const t of S8) for (const p of f.pix) { const c = F[t].data[p] >>> 12; m.set(c, (m.get(c) ?? 0) + 1); } return new Set([...m].sort((a, b) => b[1] - a[1]).slice(0, 6).map((e) => e[0])); });
  const parent = frags.map((_, i) => i), root = (i: number): number => (parent[i] === i ? i : (parent[i] = root(parent[i])));
  for (let i = 0; i < frags.length; i++) for (let j = i + 1; j < frags.length; j++) {
    const a = frags[i], b = frags[j];
    const gap = Math.max(0, Math.max(a.x0, b.x0) - Math.min(a.x1, b.x1) - 1, Math.max(a.y0, b.y0) - Math.min(a.y1, b.y1) - 1);
    if (gap > 4) continue;
    const shared = [...colors[i]].filter((c) => colors[j].has(c)).length / new Set([...colors[i], ...colors[j]]).size;
    if (corr(rhythm[i], rhythm[j]) >= 0.5 && shared >= 0.25) parent[root(i)] = root(j);
  }
  const groups = new Map<number, Blob[]>();
  frags.forEach((f, i) => (groups.get(root(i)) ?? groups.set(root(i), []).get(root(i))!).push(f));
  for (const parts of groups.values()) {
    const pix = parts.flatMap((f) => f.pix), mine = new Uint8Array(WH);
    for (const p of pix) mine[p] = 1;
    const x0 = Math.min(...parts.map((f) => f.x0)), y0 = Math.min(...parts.map((f) => f.y0)), x1 = Math.max(...parts.map((f) => f.x1)), y1 = Math.max(...parts.map((f) => f.y1));
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1, box = { x0, y0, x1, y1 };
    if (pix.length < 6) continue;
    const patches = F.map((f) => crop(f, box, W));
    const { poses, cycle } = posesOf(patches, differ);
    // its box in each frame: where what is its own differs
    const track: [number, number, number, number, number][] = [], mids: [number, number, number][] = [], sizes: number[] = [];
    for (let t = 0; t < N; t++) {
      let sx = 0, sy = 0, n = 0, fx0 = W, fy0 = H, fx1 = 0, fy1 = 0;
      for (const p of pix) if (fg[t][p]) { const x = p % W, y = Math.floor(p / W); sx += x; sy += y; n++; fx0 = Math.min(fx0, x); fy0 = Math.min(fy0, y); fx1 = Math.max(fx1, x); fy1 = Math.max(fy1, y); }
      if (!n) continue;
      track.push([t, fx0, fy0, fx1 - fx0 + 1, fy1 - fy0 + 1]);
      if (n >= 4) { mids.push([t, sx / n, sy / n]); sizes.push(Math.max(fx1 - fx0, fy1 - fy0) + 1); }
    }
    // what changes from frame to frame in it; whether neighbors change the same way (a light brightening
    // shades everything round it alike; water or fire changes pixel by pixel), and in lightness only
    let same = 0, pairs = 0, lightOnly = 0, changed = 0;
    for (let t = 1; t < N; t++) {
      const dir = new Int8Array(bw * bh);
      for (let i = 0; i < bw * bh; i++) {
        const x = x0 + (i % bw), y = y0 + Math.floor(i / bw);
        if (!mine[y * W + x]) continue;
        const a = patches[t - 1][i], b = patches[t][i];
        if (!differ(a, b) || (a & 255) < 128 || (b & 255) < 128) continue;
        const A = lab(a), B = lab(b);
        dir[i] = B[0] > A[0] ? 1 : -1;
        changed++;
        if (Math.hypot(B[1] - A[1], B[2] - A[2]) < 0.6 * Math.abs(B[0] - A[0]) + 0.01) lightOnly++;
      }
      for (let i = 0; i < bw * bh; i++) if (dir[i]) for (const j of [i + 1, i + bw]) if (j < bw * bh && dir[j] && (j !== i + 1 || (i + 1) % bw)) { pairs++; if (dir[i] === dir[j]) same++; }
    }
    const coherent = pairs ? same / pairs : 0, tone = changed ? lightOnly / changed : 0, share = pix.length / (bw * bh);
    // a thing carried along in pieces (legs and body apart, so no one piece was followed): the longest
    // stretch in which the middle of what changes goes steadily one way, straight (not the arc a turning
    // thing traces: half a turn is 0.64 of its path)
    const own = median(sizes);
    let along: [number, number] | null = null, longest = 0;
    for (let a = 0; a < mids.length; a++) {
      let path = 0;
      for (let b = a + 1; b < mids.length; b++) {
        path += Math.hypot(mids[b][1] - mids[b - 1][1], mids[b][2] - mids[b - 1][2]);
        const ddx = mids[b][1] - mids[a][1], ddy = mids[b][2] - mids[a][2], net = Math.hypot(ddx, ddy), span = mids[b][0] - mids[a][0];
        if (b - a >= 6 && span > longest && net >= Math.max(8, 0.3 * own) && net >= 0.8 * path && net >= 0.2 * span) { longest = span; along = [ddx / span, ddy / span]; }
      }
    }
    // round a loop (birds circling, a swing): a long way gone, back where it started, no jump (a jump is
    // the next one starting over)
    let total = 0, jump = 0;
    for (let k = 1; k < mids.length; k++) { const st = Math.hypot(mids[k][1] - mids[k - 1][1], mids[k][2] - mids[k - 1][2]); total += st; jump = Math.max(jump, st); }
    const back = mids.length > 6 ? Math.hypot(mids.at(-1)![1] - mids[0][1], mids.at(-1)![2] - mids[0][2]) : Infinity;
    const round = !!along && total >= 2 * Math.max(bw, bh) && back < 0.5 * Math.max(bw, bh) && jump < Math.max(4, 0.5 * own);
    // things going across one after another (traffic, a crowd): most of the flow in it moves, sideways
    const inside = flows.filter((f) => f.x >= x0 && f.x <= x1 && f.y >= y0 && f.y <= y1), mv = inside.filter((f) => f.dx || f.dy);
    const across = mv.filter((f) => Math.abs(f.dx) > 2 * Math.abs(f.dy)).length;
    const stream = !along && mv.length >= 6 && mv.length >= 0.3 * inside.length && across >= 0.7 * mv.length;
    const kind: Kind = along ? (poses >= 3 ? "walk" : "carried")
      : stream ? "stream"
      : coherent >= 0.85 && tone >= 0.6 ? "light"
      : !cycle && poses >= 0.5 * N && coherent < 0.8 ? "effect"
      : parts.length >= 2 && share < 0.6 ? "rig" : "anim";
    // cut out: in place, its whole box; going somewhere, each frame's own box (a margin round it)
    const cuts = along
      ? spread(track, 8).map(([t, x, y, w, h]) => { const m = 2, b = { x0: Math.max(0, x - m), y0: Math.max(0, y - m), x1: Math.min(W - 1, x + w - 1 + m), y1: Math.min(H - 1, y + h - 1 + m) }; return toImg({ w: b.x1 - b.x0 + 1, h: b.y1 - b.y0 + 1, px: crop(F[t], b, W) }); })
      : spread(track.map((e) => e[0]), 8).map((t) => toImg({ w: bw, h: bh, px: patches[t] }));
    pieces.push({ kind, box: [x0, y0, bw, bh], frames: track.length, poses, cycle, parts: parts.length, ...(along ? { speed: along } : {}), ...(round ? { round } : {}), track, cuts });
  }
  let still = 0;
  for (let p = 0; p < WH; p++) { let any = false; for (let t = 0; t < N && !any; t++) if (fg[t][p]) any = true; if (!any && !rowV[Math.floor(p / W)]) still++; }
  // one thing found twice (two tracks of it, or a region left over from it): the one followed longest
  const iou = (a: number[], b: number[]) => { const w = Math.max(0, Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0])), h = Math.max(0, Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1])); return (w * h) / (a[2] * a[3] + b[2] * b[3] - w * h); };
  pieces.sort((a, b) => Number(b.grow !== undefined) - Number(a.grow !== undefined) || b.frames - a.frames);
  for (let i = pieces.length - 1; i >= 0; i--) if (pieces.slice(0, i).some((q) => iou(q.box, pieces[i].box) > 0.6)) pieces.splice(i, 1);
  pieces.sort((a, b) => b.box[2] * b.box[3] - a.box[2] * a.box[3]);
  return { pieces, still: still / WH, frames: N };
}

const median = (v: number[]) => { const q = v.slice().sort((a, b) => a - b); return q[q.length >> 1] ?? 0; };
const corr = (a: number[], b: number[]) => {
  const n = a.length, ma = a.reduce((s, v) => s + v, 0) / n, mb = b.reduce((s, v) => s + v, 0) / n;
  let c = 0, va = 0, vb = 0;
  for (let i = 0; i < n; i++) { c += (a[i] - ma) * (b[i] - mb); va += (a[i] - ma) ** 2; vb += (b[i] - mb) ** 2; }
  return va && vb ? c / Math.sqrt(va * vb) : va === vb ? 1 : 0;
};
/** k items spread evenly over a list. */
function spread<T>(list: T[], k: number): T[] {
  if (list.length <= k) return list;
  return Array.from({ length: k }, (_, i) => list[Math.floor((i * (list.length - 1)) / (k - 1))]);
}

/** Pieces of a mask: pixels within `r` of each other joined; each piece's box, count, middle and pixels. */
function label(m: Uint8Array, W: number, H: number, r: number): Blob[] {
  const seen = new Uint8Array(W * H), out: Blob[] = [];
  for (let i = 0; i < W * H; i++) {
    if (!m[i] || seen[i]) continue;
    let x0 = W, y0 = H, x1 = 0, y1 = 0, sx = 0, sy = 0;
    const st = [i], pix: number[] = [];
    seen[i] = 1;
    while (st.length) {
      const p = st.pop()!, x = p % W, y = Math.floor(p / W);
      pix.push(p); sx += x; sy += y; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        const xx = x + dx, yy = y + dy, q = yy * W + xx;
        if (xx >= 0 && yy >= 0 && xx < W && yy < H && m[q] && !seen[q]) { seen[q] = 1; st.push(q); }
      }
    }
    out.push({ x0, y0, x1, y1, n: pix.length, cx: sx / pix.length, cy: sy / pix.length, pix });
  }
  return out;
}

const crop = (f: Img, b: { x0: number; y0: number; x1: number; y1: number }, W: number) => {
  const out: Color[] = [];
  for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) out.push(f.data[y * W + x]);
  return out;
};
const toImg = (c: { w: number; h: number; px: Color[] }) => new Img(c.w, c.h, Uint32Array.from(c.px));

/** A carried thing cut out by its difference, in a box of its own size, bottom-centered when compared. */
function cutout(f: Img, m: Uint8Array, c: Blob, W: number): { w: number; h: number; px: Color[] } {
  const w = c.x1 - c.x0 + 1, h = c.y1 - c.y0 + 1, px: Color[] = [];
  for (let y = c.y0; y <= c.y1; y++) for (let x = c.x0; x <= c.x1; x++) px.push(m[y * W + x] ? f.data[y * W + x] : 0);
  return { w, h, px };
}

/**
 * The distinct drawings in a sequence (each frame matched to one seen before when fewer than 3% of
 * its pixels differ) and the shortest number of frames after which the sequence repeats (0: it doesn't).
 */
function posesOf(seq: (Color[] | { w: number; h: number; px: Color[] })[], differ: (a: Color, b: Color) => boolean): { poses: number; cycle: number } {
  const frac = (a: Color[] | { w: number; h: number; px: Color[] }, b: Color[] | { w: number; h: number; px: Color[] }) => {
    if (Array.isArray(a) && Array.isArray(b)) { let d = 0; for (let i = 0; i < a.length; i++) if (differ(a[i], b[i])) d++; return d / Math.max(1, a.length); }
    const A = a as { w: number; h: number; px: Color[] }, B = b as { w: number; h: number; px: Color[] };
    // bottom-centered: compare where both are, count the rest as different
    const w = Math.max(A.w, B.w), h = Math.max(A.h, B.h);
    let d = 0, n = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const ax = x - Math.floor((w - A.w) / 2), ay = y - (h - A.h), bx = x - Math.floor((w - B.w) / 2), by = y - (h - B.h);
      const ca = ax >= 0 && ay >= 0 && ax < A.w && ay < A.h ? A.px[ay * A.w + ax] : 0, cb = bx >= 0 && by >= 0 && bx < B.w && by < B.h ? B.px[by * B.w + bx] : 0;
      if (!ca && !cb) continue;
      n++;
      if (!ca || !cb || differ(ca, cb)) d++;
    }
    return d / Math.max(1, n);
  };
  const reps: typeof seq = [];
  for (const s of seq) if (!reps.some((r) => frac(r, s) < 0.03)) { reps.push(s); if (reps.length > 64) break; }
  let cycle = 0;
  const step = seq.length > 1 ? seq.slice(1).reduce((a, s, i) => a + frac(seq[i], s), 0) / (seq.length - 1) : 0;
  for (let p = 2; p <= Math.floor(seq.length / 2) && step > 0.01; p++) {
    let s = 0, c = 0;
    for (let i = 0; i + p < seq.length && c < 24; i++) { s += frac(seq[i], seq[i + p]); c++; }
    if (c && s / c < 0.3 * step) { cycle = p; break; }
  }
  return { poses: reps.length, cycle };
}
