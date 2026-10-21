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
// on); the rest is isolated where it changes: fragments of pixels that differ in the same frames (a
// knight riding past, not the crowd waving behind him), put back together into one object when they are
// near each other, change in the same rhythm and share colors (one dancer's arm and leg, not two
// dancers side by side), or have the same still body.
import { type Color, channels, pack } from "./color.ts";
import { Img } from "./image.ts";
import { dE, lab } from "./vision.ts";
import { type Relight, lightColor, relight } from "./relight.ts";

export interface Band { y0: number; y1: number; v: number }
export type Kind = "carried" | "walk" | "stream" | "anim" | "rig" | "action" | "effect" | "light";
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
  /** moving by part of a pixel: most of what changes in it goes between a color and an in-between tone */
  sub?: boolean;
  /** its box in each frame it shows in: [frame, x, y, w, h] */
  track: [number, number, number, number, number][];
  /** it alone, its background taken away, in a few frames across the clip; and where each is: [frame, x, y] */
  cuts: Img[]; cutsAt: [number, number, number][];
  /** it alone in a row of frames: one whole cycle when it has one, else frames across the clip */
  strip: Img; stripFrames: number;
  /** the share of its box that is it, not background (mean over the captures) */
  fill: number;
  /** a light: about where it shines from, how many times brighter at its brightest than at its dimmest, its color */
  source?: [number, number]; strength?: number; tint?: Color;
  /** smears: the frames a shape swept by something fast shows in (its colors there for a moment only) */
  smears?: { frames: number[]; colors: Color[] };
}

type Blob = { x0: number; y0: number; x1: number; y1: number; n: number; cx: number; cy: number; pix: number[] };
// (smear: the colors of a smear cut off it, stamp's)
type Comp = Blob & { t: number; id: number; smear?: Color[] };

export function decompose(frames: Img[], bands: Band[], tol = 0.05, flows: { x: number; y: number; dx: number; dy: number }[] = [], subClip = false): { pieces: Piece[]; still: number; frames: number; relit: boolean; light: Relight } {
  const N = Math.min(frames.length, 400), F0 = frames.slice(0, N), W = F0[0].w, H = F0[0].h, WH = W * H;
  const rowV = new Float32Array(H);
  for (const b of bands) for (let y = Math.max(0, b.y0); y < Math.min(H, b.y1); y++) rowV[y] = b.v;
  const differ = (a: Color, b: Color) => a !== b && ((a & 255) < 128 !== (b & 255) < 128 || dE(a, b) > tol);
  // the background: each pixel's commonest color over frames spread across the clip
  const S = Array.from({ length: Math.min(N, 48) }, (_, i) => Math.floor((i * N) / Math.min(N, 48)));
  const bg = new Uint32Array(WH), votes = new Uint8Array(WH), vals = new Uint32Array(S.length);
  for (let p = 0; p < WH; p++) {
    S.forEach((t, i) => (vals[i] = F0[t].data[p]));
    vals.sort();
    let best = vals[0], run = 0, cur = 1;
    for (let i = 1; i <= vals.length; i++) { if (i < vals.length && vals[i] === vals[i - 1]) cur++; else { if (cur > run) { run = cur; best = vals[i - 1]; } cur = 1; } }
    bg[p] = best; votes[p] = run;
  }
  // a plane's step each frame: the whole number of pixels that carries its rows best (a speed of 1.67
  // px/frame goes by in steps of 1 and 2)
  const stepOf = (F: Img[], t: number, b: Band) => {
    let best = 0, bd = Infinity;
    for (const d of new Set([Math.floor(b.v), Math.ceil(b.v), Math.floor(b.v) - 1, Math.ceil(b.v) + 1])) {
      let n = 0;
      for (let y = Math.max(0, b.y0); y < Math.min(H, b.y1); y += 2) for (let x = Math.max(0, d); x < Math.min(W, W + d); x += 2) if (F[t].data[y * W + x] !== F[t - 1].data[y * W + x - d]) n++;
      if (n < bd) { bd = n; best = d; }
    }
    return best;
  };
  // what differs: from the background in still rows; from the frame before carried by its step in a plane's
  const fgOf = (F: Img[]) => F.map((f, t) => {
    const m = new Uint8Array(WH), steps = t ? bands.map((b) => stepOf(F, t, b)) : [];
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
  // a thing at rest most of the clip is the background there, and once it has gone the place it left
  // reads as a thing (a lamp going off): a piece whose background is what another piece of that frame
  // shows is that place, and the ground it shows the background. (On a flat ground the other piece's
  // background is this one's ground too: the place left is the one whose background won by fewer frames;
  // and it was left whole, the other a size of it away: not the edges a thing shifted by a pixel leaves.)
  let fg0 = fgOf(F0), left = 0;
  const mean = (c: Blob) => c.pix.reduce((s, p) => s + votes[p], 0) / c.n;
  fg0.forEach((m, t) => {
    const cs = label(m, W, H, 2).filter((c) => c.n >= 8 && c.x1 - c.x0 >= 2 && c.y1 - c.y0 >= 2 && !rowV[c.y0]), f = F0[t].data;
    for (const c of cs) for (const d of cs) {
      if (d === c || d.n > 1.5 * c.n || c.n > 1.5 * d.n || mean(c) >= mean(d) || Math.hypot(d.cx - c.cx, d.cy - c.cy) < Math.max(c.x1 - c.x0, c.y1 - c.y0) + 1) continue;
      const ox = d.x0 - c.x0, oy = d.y0 - c.y0;
      let hit = 0;
      for (const p of c.pix) { const x = p % W + ox, y = Math.floor(p / W) + oy; if (x >= 0 && y >= 0 && x < W && y < H && !differ(bg[p], f[y * W + x])) hit++; }
      if (hit < 0.9 * c.n) continue;
      // (the other on ground that is nearly always there, and the ground shown here the same whenever
      // the place isn't the background: not two of a crowd always going by)
      let same = 0, gone = 0;
      for (const p of c.pix) { gone += S.length - votes[p]; for (const s of S) if (F0[s].data[p] === f[p]) same++; }
      if (mean(d) < 0.7 * S.length || same < 0.9 * gone) continue;
      for (const p of c.pix) bg[p] = f[p];
      left++;
      break;
    }
  });
  if (left) fg0 = fgOf(F0);
  // ---------------------------------------------------------------- things that go somewhere
  // first, in the frames as they are (a light doesn't travel: a cloud drifting changes as softly as one,
  // and would be taken for it): each frame's pieces of difference, followed (after SORT, Bewley et al.
  // 2016, its prediction a steady speed): where each followed thing should be now, carried on by its
  // speed, matched to the piece of about its size that overlaps that most or is nearest; one with none
  // (hidden behind another, or one with it as they pass) carried on by its speed for up to 8 frames
  const comps: Comp[][] = fg0.map((m, t) => label(m, W, H, 2).filter((c) => c.n >= 4).map((c) => ({ ...c, t, id: -1 })));
  type Follow = { comps: Comp[]; vx: number; vy: number; lost: number };
  const live: Follow[] = [], ended: Follow[] = [];
  // a thing smeared (stamp's smear, a streak behind it on its fastest frames): the piece where it went
  // is it and its smear, bigger than it; its drawing found in that piece, the same colors on 85% of its
  // pixels at least, is it, and the rest of the piece (the smear) is left out of its box
  const cutOut = (f: Follow, c: Comp, t: number): Comp | null => {
    const l = f.comps.at(-1)!, lw = l.x1 - l.x0, lh = l.y1 - l.y0, was = F0[l.t].data, now = F0[t].data;
    if (c.n < 1.5 * l.n || c.x1 - c.x0 < lw || c.y1 - c.y0 < lh || (c.x1 - c.x0 + 1) * (c.y1 - c.y0 + 1) > 16 * (lw + 1) * (lh + 1)) return null;
    let best: { miss: number; ox: number; oy: number } | null = null;
    for (let oy = c.y0 - l.y0; oy <= c.y1 - l.y1; oy++) for (let ox = c.x0 - l.x0; ox <= c.x1 - l.x1; ox++) {
      if (Math.hypot(ox, oy) > Math.max(12, 4 * Math.max(lw, lh)) || ox * f.vx + oy * f.vy < 0) continue;
      let miss = 0;
      for (const p of l.pix) if (was[p] !== now[p + oy * W + ox] && ++miss > 0.15 * l.n) break;
      if (miss <= 0.15 * l.n && (!best || miss < best.miss)) best = { miss, ox, oy };
    }
    if (!best) return null;
    const { ox, oy } = best, s: Comp = { x0: l.x0 + ox, y0: l.y0 + oy, x1: l.x1 + ox, y1: l.y1 + oy, n: l.n, cx: l.cx + ox, cy: l.cy + oy, pix: l.pix.map((p) => p + oy * W + ox), t, id: -1 };
    // (a smear is behind it, on the way it came, a step of half its size at least: not another thing
    // it met)
    const at = new Set(s.pix), rest = c.pix.filter((p) => !at.has(p)), sx0 = Math.min(l.x0, s.x0), sx1 = Math.max(l.x1, s.x1), sy0 = Math.min(l.y0, s.y0), sy1 = Math.max(l.y1, s.y1);
    const behind = rest.filter((p) => { const x = p % W, y = Math.floor(p / W); return x >= sx0 && x <= sx1 && y >= sy0 && y <= sy1; }).length;
    if (Math.hypot(ox, oy) < 0.5 * Math.max(lw, lh) || behind < 0.8 * rest.length) return null;
    const tally = new Map<Color, number>();
    for (const p of rest) tally.set(now[p], (tally.get(now[p]) ?? 0) + 1);
    s.smear = [...tally].filter(([, k]) => k >= 0.2 * rest.length).sort((a, b) => b[1] - a[1]).map(([k]) => k);
    return s;
  };
  for (let t = 0; t < N; t++) {
    const cs = comps[t], pairs: [number, number, number, number][] = [];
    live.forEach((f, i) => {
      // (a track just begun has no speed yet to predict by: its next step may be a stride of a few of
      // its sizes, a ball crossing, a leap from rest)
      const l = f.comps.at(-1)!, g = t - l.t, w = l.x1 - l.x0 + 1, h = l.y1 - l.y0 + 1, x = l.x0 + f.vx * g, y = l.y0 + f.vy * g, reach = Math.max(6, (f.comps.length === 1 ? 2.5 : 0.75) * Math.max(w, h));
      cs.forEach((c, j) => {
        if (c.n > 2.5 * l.n || l.n > 2.5 * c.n) return;
        const ow = Math.max(0, Math.min(x + w, c.x1 + 1) - Math.max(x, c.x0)), oh = Math.max(0, Math.min(y + h, c.y1 + 1) - Math.max(y, c.y0));
        const d = Math.hypot(c.cx - l.cx - f.vx * g, c.cy - l.cy - f.vy * g), o = (ow * oh) / (w * h + (c.x1 - c.x0 + 1) * (c.y1 - c.y0 + 1) - ow * oh);
        if (o > 0 || d <= reach) pairs.push([o + 0.5 * (1 - Math.min(1, d / reach)), i, j, o]);
      });
    });
    // two passing, one piece where both should be, bigger than either: neither takes it, both go on
    const both = new Set<number>();
    cs.forEach((c, j) => { const over = pairs.filter((q) => q[2] === j && q[3] > 0 && c.n >= 1.4 * live[q[1]].comps.at(-1)!.n); if (over.length >= 2) both.add(j); });
    const tookF = new Set<number>(), tookC = new Set<number>(both);
    for (const [, i, j] of pairs.sort((a, b) => b[0] - a[0])) {
      if (tookF.has(i) || tookC.has(j)) continue;
      tookF.add(i); tookC.add(j);
      // (smeared, it is its drawing in the piece, not the piece)
      const f = live[i], l = f.comps.at(-1)!, g = t - l.t, c = (f.comps.length >= 2 && cutOut(f, cs[j], t)) || cs[j], sx = (c.cx - l.cx) / g, sy = (c.cy - l.cy) / g;
      // its speed from pieces of its size (not from one it shares a moment with another)
      if (c.n <= 1.5 * l.n && l.n <= 1.5 * c.n) [f.vx, f.vy] = f.comps.length > 1 ? [(f.vx + sx) / 2, (f.vy + sy) / 2] : [sx, sy];
      f.comps.push(c); f.lost = 0;
    }
    // a second chance for a thing that changed speed (a leap, a dash, a brake): a track left without a
    // match takes the one piece left over near it, of about its size, when each is the other's only
    // choice (in a crowd there are several and nothing is joined)
    const leftC = cs.map((_, j) => j).filter((j) => !tookC.has(j)), leftF = live.map((_, i) => i).filter((i) => !tookF.has(i) && live[i].lost === 0);
    // (going on the way it went, and not where things come in and leave: a picture's edge)
    const near = (i: number, j: number) => {
      const f = live[i], l = f.comps.at(-1)!, c = cs[j], size = Math.max(l.x1 - l.x0 + 1, l.y1 - l.y0 + 1);
      // (one barely moving, a tenth of its size a frame, a crouch before a leap, has no way to keep)
      const ahead = Math.hypot(f.vx, f.vy) < Math.max(1, 0.1 * size) || (c.cx - l.cx) * f.vx + (c.cy - l.cy) * f.vy >= 0, inside = c.x0 > 0 && c.y0 > 0 && c.x1 < W - 1 && c.y1 < H - 1;
      return ahead && inside && c.n <= 2 * l.n && l.n <= 2 * c.n && Math.hypot(c.cx - l.cx, c.cy - l.cy) <= Math.max(12, 4 * size);
    };
    for (const i of leftF) {
      const js = leftC.filter((j) => near(i, j));
      if (js.length !== 1 || leftF.filter((k) => near(k, js[0])).length !== 1) continue;
      const f = live[i], l = f.comps.at(-1)!, c = cs[js[0]], g = t - l.t;
      [f.vx, f.vy] = [(c.cx - l.cx) / g, (c.cy - l.cy) / g];
      f.comps.push(c); f.lost = 0; tookF.add(i); tookC.add(js[0]);
    }
    // the smeared one left without a match: its drawing in a piece left over
    for (const i of live.map((_, i) => i).filter((i) => !tookF.has(i) && live[i].lost === 0)) {
      const f = live[i], l = f.comps.at(-1)!;
      for (const j of cs.map((_, j) => j).filter((j) => !tookC.has(j))) {
        const c = cutOut(f, cs[j], t);
        if (!c) continue;
        [f.vx, f.vy] = [(c.cx - l.cx) / (t - l.t), (c.cy - l.cy) / (t - l.t)];
        f.comps.push(c); f.lost = 0; tookF.add(i); tookC.add(j);
        break;
      }
    }
    for (let i = live.length - 1; i >= 0; i--) if (!tookF.has(i) && ++live[i].lost > 8) ended.push(...live.splice(i, 1));
    cs.forEach((c, j) => { if (!tookC.has(j)) live.push({ comps: [c], vx: 0, vy: 0, lost: 0 }); });
  }
  const tracks = new Map([...ended, ...live].map((f, i) => { for (const c of f.comps) c.id = i; return [i, f.comps] as const; }));
  // swung about a point rather than carried (an axe on an arm, a flag on its pole): one pixel in it, or
  // beside it, in every frame
  const swung = (sets: number[][]) => {
    const hits = new Uint16Array(WH);
    sets.forEach((pix, k) => { for (const p of pix) { const x = p % W, y = Math.floor(p / W); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy, q = yy * W + xx; if (xx >= 0 && yy >= 0 && xx < W && yy < H && hits[q] === k) hits[q] = k + 1; } } });
    return sets.length > 0 && hits.some((v) => v === sets.length);
  };
  const going = F0.map(() => new Uint8Array(WH));
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
    // (faster than half its size a frame only when it keeps one speed nearly all the way, a ball crossing;
    // or when it goes one way all along, its speed changing, a dash: speeding up, a leap, braking; a
    // little back before it sets off or once it has arrived, a crouch before the leap, a settling, or
    // under half a pixel on the way, its drawing changing, isn't going back, when it is found in every
    // frame of its way)
    let back = 0, gone = 0;
    const whole = tr.length === tr.at(-1)!.t - tr[0].t + 1;
    for (let i = 1; i < tr.length; i++) {
      const s = ((tr[i].cx - tr[i - 1].cx) * dx + (tr[i].cy - tr[i - 1].cy) * dy) / (travel || 1);
      if (whole ? s < -0.5 && ((gone > 0.1 * travel && gone < 0.9 * travel) || s < -0.15 * travel) : s < 0) back++;
      gone += s;
    }
    // (up and down on the way, a ball bouncing as it goes, but never back)
    const oneWay = back === 0 && path <= 1.3 * travel;
    // (six frames at least, or all of a short clip: a GIF keeps a hold as one frame)
    if ((tr.length >= 6 || (tr.length === N && N >= 4)) && travel >= Math.max(8, 0.8 * size) && travel >= 0.6 * path && (sp <= Math.max(2, 0.5 * size) || steady >= 0.9 * (tr.length - 1) || oneWay) && (steady >= 0.7 * (tr.length - 1) || oneWay) && !swung(tr.map((c) => c.pix))) {
      // carried along: one drawing, or changing drawings (the thing cut out by its difference, bottom-centered)
      const cut = tr.map((c) => cutout(F0[c.t], fg0[c.t], c, W));
      const { poses, cycle } = posesOf(cut, differ);
      const first = median(tr.slice(0, 3).map((c) => c.y1 - c.y0 + 1)), last = median(tr.slice(-3).map((c) => c.y1 - c.y0 + 1));
      const x0 = Math.min(...tr.map((c) => c.x0)), y0 = Math.min(...tr.map((c) => c.y0)), x1 = Math.max(...tr.map((c) => c.x1)), y1 = Math.max(...tr.map((c) => c.y1));
      pieces.push({
        kind: poses >= 3 ? "walk" : "carried", box: [x0, y0, x1 - x0 + 1, y1 - y0 + 1], frames: tr.length, poses, cycle, speed: [vx, vy], grow: last / first, ...(tr.some((c) => c.smear) ? { smears: { frames: tr.filter((c) => c.smear).map((c) => c.t), colors: [...new Set(tr.flatMap((c) => c.smear ?? []))] } } : {}),
        track: tr.map((c) => [c.t, c.x0, c.y0, c.x1 - c.x0 + 1, c.y1 - c.y0 + 1]), ...captures(cycle >= 2 && tr.length >= cycle ? tr.slice(0, cycle) : spread(tr, 8), spread(tr, 8), (c) => ({ t: c.t, b: c, keep: carriedCut(fg0[c.t], c, W) }), F0),
      });
      // where it is each frame, a pixel wider
      for (const c of tr) for (const p of c.pix) { const x = p % W, y = Math.floor(p / W); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < W && yy < H) going[c.t][yy * W + xx] = 1; } }
    }
  }
  // then the light's changes, told apart where nothing goes by and taken away: what differs after is
  // things, not the light falling round them
  const light = relight(F0, bg, (y) => !rowV[y], differ, going), F = light.any ? light.flat : F0, fg = light.any ? fgOf(F) : fg0;
  // what's left differing where nothing goes by, in pieces of a few pixels at least
  const inPlace = new Uint16Array(WH);
  fg.forEach((m, t) => {
    const rest = m.map((v, p) => v & (1 - going[t][p]));
    for (const c of label(rest, W, H, 2)) if (c.n >= 4) for (const p of c.pix) inPlace[p]++;
  });
  // ---------------------------------------------------------------- things in place, each isolated
  const busy = new Uint8Array(WH);
  for (let p = 0; p < WH; p++) if (inPlace[p] >= Math.max(2, 0.05 * N)) busy[p] = 1;
  const frags = inStep(busy, fg, W, H).filter((c) => c.n >= 4);
  // each fragment's rhythm (how much of it differs in each frame) and its colors over the clip, each with
  // its share (counted by share, the ghost's white in its top against the sky and in its body against
  // the ground weighs more than the few colors of what is behind each)
  const rhythm = frags.map((f) => F.map((_, t) => { let s = 0; for (const p of f.pix) s += fg[t][p]; return s / f.n; }));
  const S8 = S.filter((_, i) => i % Math.max(1, Math.floor(S.length / 8)) === 0);
  const colors = frags.map((f) => { const m = new Map<number, number>(); let n = 0; for (const t of S8) for (const p of f.pix) { const c = F[t].data[p] >>> 12; m.set(c, (m.get(c) ?? 0) + 1); n++; } for (const [c, k] of m) m.set(c, k / Math.max(1, n)); return m; });
  // the share of their pixels in the colors both show
  const alike = (a: Map<number, number>, b: Map<number, number>) => { let s = 0; for (const [c, k] of a) s += Math.min(k, b.get(c) ?? 0); return s; };
  const parent = frags.map((_, i) => i), root = (i: number): number => (parent[i] === i ? i : (parent[i] = root(parent[i])));
  for (let i = 0; i < frags.length; i++) for (let j = i + 1; j < frags.length; j++) {
    const a = frags[i], b = frags[j];
    const gap = Math.max(0, Math.max(a.x0, b.x0) - Math.min(a.x1, b.x1) - 1, Math.max(a.y0, b.y0) - Math.min(a.y1, b.y1) - 1);
    if (gap > 1) continue;
    const shared = alike(colors[i], colors[j]);
    if (shared < 0.25) continue;
    // touching, in the same rhythm, or in turns: together steadier than either alone (a bird going round
    // lights one side of its loop, then the other; an arm up, then down). Farther apart, only by the same
    // body (two dancers in step a few pixels apart on one lawn are two)
    if (corr(rhythm[i], rhythm[j]) >= 0.5 || cv(rhythm[i].map((v, t) => v * a.n + rhythm[j][t] * b.n)) <= 0.6 * Math.min(cv(rhythm[i]), cv(rhythm[j]))) parent[root(i)] = root(j);
  }
  const groups = new Map<number, Blob[]>();
  frags.forEach((f, i) => (groups.get(root(i)) ?? groups.set(root(i), []).get(root(i))!).push(f));
  const roomy = (x: number, y: number, w: number, h: number, m: number): Box => ({ x0: Math.max(0, x - m), y0: Math.max(0, y - m), x1: Math.min(W - 1, x + w - 1 + m), y1: Math.min(H - 1, y + h - 1 + m) });
  const frame = S[S.length >> 1];
  // what of a group stays still round what moves (a body between its arms): its matte on a frame from the
  // middle of the clip, in a box grown while what it keeps reaches the box's edge, up to three times its
  // size; one that never closes, or closes far bigger than what moves (the flood couldn't tell the ground
  // from it), stays in its first box
  const bodyOf = (parts: Blob[]) => {
    const mine = new Uint8Array(WH);
    for (const f of parts) for (const p of f.pix) mine[p] = 1;
    const x0 = Math.min(...parts.map((f) => f.x0)), y0 = Math.min(...parts.map((f) => f.y0)), bw = Math.max(...parts.map((f) => f.x1)) - x0 + 1, bh = Math.max(...parts.map((f) => f.y1)) - y0 + 1;
    let m = Math.max(3, Math.round(0.2 * Math.max(bw, bh))), b = roomy(x0, y0, bw, bh, m), keep: Uint8Array = new Uint8Array(0), first: [Box, Uint8Array] | null = null, closed = false;
    for (;;) {
      b = roomy(x0, y0, bw, bh, m);
      const model = colorsOf(F, fg, S8.map((t) => [t, b]), mine, W, tol), w = b.x1 - b.x0 + 1, h = b.y1 - b.y0 + 1;
      keep = matte(F[frame], fg[frame], b, mine, model, W, tol, "all").keep;
      first ??= [b, keep];
      let edge = false;
      // (the picture's edge too: what runs out of the picture with the ground hasn't closed)
      for (let i = 0; i < w * h && !edge; i++) { const x = i % w, y = Math.floor(i / w); if (keep[i] && !mine[(b.y0 + y) * W + b.x0 + x] && (x === 0 || y === 0 || x === w - 1 || y === h - 1)) edge = true; }
      // closed round one thing: its still body up to ten times what moves of it (a ghost bobbing moves
      // only at its edges); one far bigger is the ground round several things the flood couldn't tell
      // from them
      const kept = keep.reduce((a, v) => a + v, 0), moving = parts.reduce((a, f) => a + f.n, 0);
      if (!edge && kept <= 10 * moving) { closed = true; break; }
      if (m >= Math.max(bw, bh) || kept > 10 * moving) { [b, keep] = first; break; }
      m = Math.min(2 * m, Math.max(bw, bh));
    }
    const px: number[] = [], w = b.x1 - b.x0 + 1;
    keep.forEach((v, i) => v && px.push((b.y0 + Math.floor(i / w)) * W + b.x0 + (i % w)));
    return { mine, b, px, closed };
  };
  // groups with the same body are one thing (two arms waving either side of it: a rig); the same, not
  // overlapping (a few pixels between two dancers would join them); and one that moves inside another's
  // closed body is part of it (a ghost's top bobbing over a gravestone)
  const gs = [...groups.values()].filter((parts) => parts.reduce((a, f) => a + f.n, 0) >= 6), bodies = gs.map(bodyOf);
  const up = gs.map((_, i) => i), top = (i: number): number => (up[i] === i ? i : (up[i] = top(up[i])));
  for (let i = 0; i < gs.length; i++) for (let j = i + 1; j < gs.length; j++) {
    const a = bodies[i], b = bodies[j];
    if (a.b.x0 > b.b.x1 || b.b.x0 > a.b.x1 || a.b.y0 > b.b.y1 || b.b.y0 > a.b.y1) continue;
    const inA = new Set(a.px), both = b.px.filter((p) => inA.has(p)).length;
    const within = (g: Blob[], body: Set<number>) => { const px = g.flatMap((f) => f.pix); return px.filter((p) => body.has(p)).length >= 0.7 * px.length; };
    if (both >= 0.5 * (a.px.length + b.px.length - both) || (b.closed && within(gs[i], new Set(b.px))) || (a.closed && within(gs[j], inA))) up[top(i)] = top(j);
  }
  const things = new Map<number, Blob[]>();
  gs.forEach((parts, i) => (things.get(top(i)) ?? things.set(top(i), []).get(top(i))!).push(...parts));
  for (const parts of things.values()) {
    const body = bodyOf(parts), pix = parts.flatMap((f) => f.pix), mine = body.mine;
    const x0 = Math.min(...parts.map((f) => f.x0)), y0 = Math.min(...parts.map((f) => f.y0)), x1 = Math.max(...parts.map((f) => f.x1)), y1 = Math.max(...parts.map((f) => f.y1));
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1, box = { x0, y0, x1, y1 };
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
    // its edges moving by part of a pixel, in a clip that moves so (subpixelClip): much of what changes
    // in it goes between a color and the in-between tone of it and its neighbor, not with a whole-pixel
    // move (an idle, a stance's sway or a breath; less than a pixel of motion, so no attack, no fire)
    // (in such a clip a part pushing into its outline measures 0.1, its single-pixel bob 0.01)
    const small = subClip && partialOf(F, pix, W, H) >= 0.06;
    // how much of what differs is the background a step away, the best step each frame: a thing moving a
    // pixel or two (a ghost bobbing brightens and darkens at its edges all at once too), not a light
    let shifted = 0, differs = 0;
    for (const t of S8) {
      const px = pix.filter((p) => fg[t][p]);
      let best = 0;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        if (!dx && !dy) continue;
        let n = 0;
        for (const p of px) { const x = p % W + dx, y = Math.floor(p / W) + dy; if (x >= 0 && y >= 0 && x < W && y < H && !differ(F[t].data[p], bg[y * W + x])) n++; }
        best = Math.max(best, n);
      }
      shifted += best; differs += px.length;
    }
    const moves = differs > 0 && shifted >= 0.6 * differs;
    // a thing carried along in pieces (legs and body apart, so no one piece was followed): the longest
    // stretch in which the middle of what changes goes steadily one way, straight (not the arc a turning
    // thing traces: half a turn is 0.64 of its path), most of its own size at least (a swing's smear
    // moves the middle of what changes a way, the body stays)
    const own = median(sizes);
    let along: [number, number] | null = null, longest = 0, stretch = [0, 0];
    for (let a = 0; a < mids.length; a++) {
      let path = 0;
      for (let b = a + 1; b < mids.length; b++) {
        path += Math.hypot(mids[b][1] - mids[b - 1][1], mids[b][2] - mids[b - 1][2]);
        const ddx = mids[b][1] - mids[a][1], ddy = mids[b][2] - mids[a][2], net = Math.hypot(ddx, ddy), span = mids[b][0] - mids[a][0];
        if (b - a >= 6 && span > longest && net >= Math.max(8, 0.8 * own) && net >= 0.8 * path && net >= 0.2 * span) { longest = span; along = [ddx / span, ddy / span]; stretch = [mids[a][0], mids[b][0]]; }
      }
    }
    // (a stretch that keeps a point, swung round it, goes nowhere)
    if (along && swung(track.filter((e) => e[0] >= stretch[0] && e[0] <= stretch[1]).map((e) => pix.filter((p) => fg[e[0]][p])))) along = null;
    // round a loop (birds circling, a swing): a long way gone, back where it started, no jump (a jump is
    // the next one starting over)
    let total = 0, jump = 0;
    for (let k = 1; k < mids.length; k++) { const st = Math.hypot(mids[k][1] - mids[k - 1][1], mids[k][2] - mids[k - 1][2]); total += st; jump = Math.max(jump, st); }
    const back = mids.length > 6 ? Math.hypot(mids.at(-1)![1] - mids[0][1], mids.at(-1)![2] - mids[0][2]) : Infinity;
    // wandering about its box (a bird circling): small in it in every frame, a long way gone; all of it
    // moves, so what differs in a frame is all of it there is
    const about = !along && track.length >= 6 && median(track.map((e) => e[3] * e[4])) <= 0.3 * bw * bh && total >= 2 * Math.max(bw, bh);
    const round = (!!along || about) && total >= 2 * Math.max(bw, bh) && back < 0.5 * Math.max(bw, bh) && jump < Math.max(4, 0.5 * own);
    // things going across one after another (traffic, a crowd): most of the flow in it moves, sideways
    const inside = flows.filter((f) => f.x >= x0 && f.x <= x1 && f.y >= y0 && f.y <= y1), mv = inside.filter((f) => f.dx || f.dy);
    // (one way: an axe swung goes both ways)
    const right = mv.filter((f) => f.dx > 2 * Math.abs(f.dy)).length, left = mv.filter((f) => -f.dx > 2 * Math.abs(f.dy)).length;
    const stream = !along && mv.length >= 6 && mv.length >= 0.3 * inside.length && Math.max(right, left) >= 0.7 * mv.length;
    // a run of poses played once (an attack, a jump): many drawings, none coming back, and a body that
    // moves (its blocks found again a step on, or turning about a joint it keeps), more than a pixel,
    // not changing all over like fire
    const action = !along && !cycle && !small && poses >= 0.5 * N && ((inside.length >= 4 && mv.length >= 0.4 * inside.length) || swung(track.map((e) => pix.filter((p) => fg[e[0]][p]))));
    // played once and gone, flashing near-white early (Saint11's explosion: dark, white, blast, fading):
    // an effect, not an attack, however much it moves
    const area = F.map((_, t) => pix.filter((p) => fg[t][p]).length), shown = area.map((a, t) => (a >= 4 ? t : -1)).filter((t) => t >= 0);
    const born = shown[0] ?? 0, gone = shown.at(-1) ?? 0, peak = area.indexOf(Math.max(...area));
    const whiteAt = (t: number) => { const px = pix.filter((p) => fg[t][p]); return px.length > 0 && px.filter((p) => lab(F[t].data[p])[0] > 0.9).length >= 0.3 * px.length; };
    const once = shown.length >= 3 && gone < N - 1 && area[gone] <= 0.5 * area[peak] && [born, born + 1, born + 2].some((t) => t < N && whiteAt(t));
    const kind: Kind = along || round ? (poses >= 3 ? "walk" : "carried")
      : stream ? "stream"
      : coherent >= 0.85 && tone >= 0.6 && !moves ? "light"
      : once ? "effect"
      : action ? "action"
      : !cycle && !small && poses >= 0.5 * N && coherent < 0.8 ? "effect"
      : parts.length >= 2 && share < 0.6 ? "rig" : "anim";
    // its captures, the background taken away: in place, its body's box (room for what of it stays
    // still); going somewhere, each frame's own box
    const boxAt = (e: [number, number, number, number, number]) => (along ? roomy(e[1], e[2], e[3], e[4], 3) : body.b);
    const model = colorsOf(F, fg, (along ? spread(track, 8) : S8.map((t) => [t])).map((e) => [e[0], boxAt(along ? (e as typeof track[0]) : track[0])]), mine, W, tol);
    // the matte's rule decided once for the piece, on a frame from the middle of the clip, so its frames agree
    const mid = track[track.length >> 1], mode = matte(F[mid[0]], fg[mid[0]], boxAt(mid), mine, model, W, tol).mode;
    const own1 = (t: number) => { const m = new Uint8Array(WH); for (const p of pix) m[p] = fg[t][p]; return m; };
    const capture = (e: [number, number, number, number, number]): Cut => (about ? { t: e[0], b: box, keep: carriedCut(own1(e[0]), box, W) } : { t: e[0], b: boxAt(e), keep: matte(F[e[0]], fg[e[0]], boxAt(e), mine, model, W, tol, mode).keep });
    const steps = track.filter((e, i) => i === 0 || e[0] === track[i - 1][0] + 1);
    pieces.push({
      kind, box: along || about || kind === "action" || once || !body.px.length ? [x0, y0, bw, bh] : bboxOf(body.px, W), frames: track.length, poses, cycle, parts: parts.length, ...(along ? { speed: along } : {}), ...(round ? { round } : {}), ...(small ? { sub: true } : {}), track,
      ...(kind === "action" || kind === "walk" ? smearsOf(F, roomy(x0, y0, bw, bh, 2), W, fg) : {}),
      ...captures(cycle >= 2 && steps.length >= cycle ? steps.slice(0, cycle) : spread(track, 8), spread(track, 8), capture, F0),
    });
  }
  // ---------------------------------------------------------------- lights
  // where the light alone changes, often enough, in step: each one light; where it shines from (where its
  // change goes farthest from dimmest to brightest), how much, in what color
  if (light.any) {
    for (const px of light.lamps.filter((l) => l.length >= 12)) {
      const reg = { ...bboxBlob(px, W), n: px.length, pix: px };
      const slot = new Map(reg.pix.map((p, i) => [p, i] as const)), hi = new Float32Array(reg.n), lo = new Float32Array(reg.n);
      const track: [number, number, number, number, number][] = [], level: number[] = [], mean: number[][] = [];
      light.lit.forEach(({ p: ps, r }, t) => {
        let n = 0, x0 = W, y0 = H, x1 = 0, y1 = 0;
        const sum = [0, 0, 0];
        ps.forEach((p, k) => {
          const i = slot.get(p);
          if (i === undefined) return;
          const v = (r[3 * k] + r[3 * k + 1] + r[3 * k + 2]) / 3, x = p % W, y = Math.floor(p / W);
          hi[i] = Math.max(hi[i], v); lo[i] = Math.min(lo[i], v);
          for (let c = 0; c < 3; c++) sum[c] += r[3 * k + c];
          n++; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
        });
        mean.push(sum.map((v) => v / Math.max(1, n)));
        level.push(n ? (sum[0] + sum[1] + sum[2]) / (3 * n) : 0);
        if (n) track.push([t, x0, y0, x1 - x0 + 1, y1 - y0 + 1]);
      });
      if (track.length < 2) continue;
      const range = reg.pix.map((p, i) => [p, hi[i] - lo[i]] as const).sort((a, b) => b[1] - a[1]).slice(0, Math.max(1, Math.round(reg.n / 10)));
      const source: [number, number] = [Math.round(range.reduce((a, e) => a + (e[0] % W), 0) / range.length), Math.round(range.reduce((a, e) => a + Math.floor(e[0] / W), 0) / range.length)];
      const strongest = level.reduce((b, v, t) => (Math.abs(v) > Math.abs(level[b]) ? t : b), 0);
      const box = { x0: reg.x0, y0: reg.y0, x1: reg.x1, y1: reg.y1 }, bw = reg.x1 - reg.x0 + 1, bh = reg.y1 - reg.y0 + 1;
      const { poses, cycle } = posesOf(F0.map((f) => crop(f, box, W)), differ);
      const cut = (e: [number, number, number, number, number]): Cut => { const keep = new Uint8Array(bw * bh); for (let i = 0; i < bw * bh; i++) keep[i] = light.relit[e[0]][(reg.y0 + Math.floor(i / bw)) * W + reg.x0 + (i % bw)]; return { t: e[0], b: box, keep }; };
      const steps = track.filter((e, i) => i === 0 || e[0] === track[i - 1][0] + 1);
      // what it captures is the light itself: its color, as strong as its change (what a glow() paints)
      const glow: Img[] = [];
      for (const [t] of [...spread(track, 8), ...steps.slice(0, Math.max(1, cycle))]) {
        if (glow[t]) continue;
        const g = (glow[t] = new Img(W, H)), { p: ps, r } = light.lit[t];
        ps.forEach((p, k) => { const v = [r[3 * k], r[3 * k + 1], r[3 * k + 2]], s = Math.max(0.2, Math.min(1, Math.abs(v[0] + v[1] + v[2]) / 3.6)), [cr, cg, cb] = channels(lightColor(v)); g.data[p] = pack(Math.round(cr * s), Math.round(cg * s), Math.round(cb * s)); });
      }
      pieces.push({
        kind: "light", box: [reg.x0, reg.y0, bw, bh], frames: track.length, poses, cycle, track, source,
        strength: Math.exp(Math.max(...level, 0) - Math.min(...level, 0)), tint: lightColor(mean[strongest]),
        ...captures(cycle >= 2 && steps.length >= cycle ? steps.slice(0, cycle) : spread(track, 8), spread(track, 8), cut, glow),
      });
    }
  }
  let still = 0;
  for (let p = 0; p < WH; p++) { let any = false; for (let t = 0; t < N && !any; t++) if (fg[t][p]) any = true; if (!any && !rowV[Math.floor(p / W)]) still++; }
  // one thing found twice (two tracks of it, or a region left over from it): the one followed longest
  const iou = (a: number[], b: number[]) => { const w = Math.max(0, Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0])), h = Math.max(0, Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1])); return (w * h) / (a[2] * a[3] + b[2] * b[3] - w * h); };
  // (two going somewhere: in the same place in the frames both show in, not two crossing the same stretch)
  const twice = (a: Piece, b: Piece) => {
    if (!a.speed || !b.speed) return iou(a.box, b.box) > 0.6;
    const at = new Map(a.track.map((e) => [e[0], e.slice(1)]));
    let s = 0, n = 0;
    for (const e of b.track) { const o = at.get(e[0]); if (o) { s += iou(o, e.slice(1)); n++; } }
    return n >= 0.5 * Math.min(a.track.length, b.track.length) && s / n > 0.5;
  };
  pieces.sort((a, b) => Number(b.grow !== undefined) - Number(a.grow !== undefined) || b.frames - a.frames);
  for (let i = pieces.length - 1; i >= 0; i--) if (pieces.slice(0, i).some((q) => twice(q, pieces[i]))) pieces.splice(i, 1);
  // things first, then lights; the bigger first
  pieces.sort((a, b) => Number(a.kind === "light") - Number(b.kind === "light") || b.box[2] * b.box[3] - a.box[2] * a.box[3]);
  return { pieces, still: still / WH, frames: N, relit: light.any, light };
}

const bboxBlob = (px: number[], W: number) => { const [x0, y0, w, h] = bboxOf(px, W); return { x0, y0, x1: x0 + w - 1, y1: y0 + h - 1 }; };
const iouBox = (a: number[], b: number[]) => { const w = Math.max(0, Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0])), h = Math.max(0, Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1])); return (w * h) / (a[2] * a[3] + b[2] * b[3] - w * h || 1); };

/**
 * A thing's smears (the shape a blade or a limb sweeps, drawn on the frames it moves fastest): colors
 * it shows a lot of on a few frames only (12 px at least, eight times their usual, on half the frames at
 * most), and the frames they show in as a long thin piece (2.5 times as long as it is wide, or filling a
 * third of its box at most).
 */
export function smearsOf(F: Img[], b: Box, W: number, fg?: Uint8Array[]): { smears?: { frames: number[]; colors: Color[] } } {
  const byColor = smearsByColor(F, b, W);
  return byColor.smears || !fg ? byColor : smearsByShape(F, b, W, fg);
}

/**
 * A smear in the body's own colors (a blade's white swept, Saint11's cards): pixels there in three
 * frames at most of the clip, in thin pieces (a crescent, a streak) of a dozen pixels and more.
 */
function smearsByShape(F: Img[], b: Box, W: number, fg: Uint8Array[]): { smears?: { frames: number[]; colors: Color[] } } {
  const N = F.length, H = F[0].h, seen = new Uint8Array(W * H);
  for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) { let k = 0; for (let t = 0; t < N; t++) k += fg[t][y * W + x]; seen[y * W + x] = k; }
  const frames: number[] = [], colors = new Map<Color, number>();
  for (let t = 0; t < N; t++) {
    const m = new Uint8Array(W * H);
    for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) { const p = y * W + x; if (fg[t][p] && seen[p] <= 3) m[p] = 1; }
    const thin = label(m, W, H, 1).filter((c) => { const cw = c.x1 - c.x0 + 1, ch = c.y1 - c.y0 + 1; return c.n >= 12 && (Math.max(cw, ch) >= 2.5 * Math.min(cw, ch) || c.n <= 0.35 * cw * ch); });
    if (!thin.length) continue;
    frames.push(t);
    for (const c of thin) for (const p of c.pix) colors.set(F[t].data[p], (colors.get(F[t].data[p]) ?? 0) + 1);
  }
  return frames.length && frames.length <= Math.max(3, 0.3 * N) ? { smears: { frames, colors: [...colors].sort((x, y) => y[1] - x[1]).slice(0, 4).map(([c]) => c) } } : {};
}

function smearsByColor(F: Img[], b: Box, W: number): { smears?: { frames: number[]; colors: Color[] } } {
  const N = F.length, per = new Map<Color, number[]>();
  F.forEach((f, t) => { for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) { const c = f.data[y * W + x]; if ((c & 255) < 128) continue; const n = per.get(c) ?? per.set(c, new Array(N).fill(0)).get(c)!; n[t]++; } });
  const colors = [...per].filter(([, n]) => { const q = n.slice().sort((a, b) => a - b), peak = q[N - 1], usual = q[N >> 1]; return peak >= 12 && peak >= 8 * Math.max(1, usual) && n.filter((v) => v >= 0.5 * peak).length <= 0.5 * N; }).map(([c]) => c);
  if (!colors.length) return {};
  // a frame's smear: a piece of those colors long and thin (a crescent); a smear's colors are mostly in
  // such pieces (the back of a cloak turned shows for a few frames too, but whole)
  const thinIn = (set: Set<Color>, t: number) => {
    const f = F[t], m = new Uint8Array(W * f.h);
    for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) if (set.has(f.data[y * W + x])) m[y * W + x] = 1;
    return label(m, W, f.h, 1).filter((c) => { const cw = c.x1 - c.x0 + 1, ch = c.y1 - c.y0 + 1; return c.n >= 12 && (Math.max(cw, ch) >= 2.5 * Math.min(cw, ch) || c.n <= 0.35 * cw * ch); });
  };
  const thin = new Map<Color, number>(), all = new Map<Color, number>(), set0 = new Set(colors);
  for (let t = 0; t < N; t++) {
    for (const c of thinIn(set0, t)) for (const p of c.pix) thin.set(F[t].data[p], (thin.get(F[t].data[p]) ?? 0) + 1);
    for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) { const c = F[t].data[y * W + x]; if (set0.has(c)) all.set(c, (all.get(c) ?? 0) + 1); }
  }
  const smear = colors.filter((c) => (thin.get(c) ?? 0) >= 0.5 * (all.get(c) ?? 1)).sort((x, y) => (thin.get(y) ?? 0) - (thin.get(x) ?? 0));
  if (!smear.length) return {};
  const set = new Set(smear), frames = F.map((_, t) => t).filter((t) => thinIn(set, t).length > 0);
  return frames.length && frames.length <= 0.6 * N ? { smears: { frames, colors: smear.slice(0, 4) } } : {};
}

const bboxOf = (px: number[], W: number): [number, number, number, number] => {
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  for (const p of px) { const x = p % W, y = Math.floor(p / W); x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return [x0, y0, x1 - x0 + 1, y1 - y0 + 1];
};
/** How much a series varies against its mean (0: steady). */
const cv = (v: number[]) => { const m = v.reduce((a, x) => a + x, 0) / v.length; return m ? Math.sqrt(v.reduce((a, x) => a + (x - m) ** 2, 0) / v.length) / m : 0; };
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

/**
 * Pieces of a mask by common fate: neighbors joined when they differ in the same frames (the phi
 * coefficient of the two over the clip at least 0.2). A knight riding past lights the pixels on his way
 * one after another, each with the next; the crowd waving behind him changes to its own beat, so one
 * patch of change holds both apart.
 */
function inStep(m: Uint8Array, fg: Uint8Array[], W: number, H: number): Blob[] {
  const N = fg.length, idx = new Int32Array(W * H).fill(-1), at: number[] = [];
  for (let p = 0; p < W * H; p++) if (m[p]) { idx[p] = at.length; at.push(p); }
  const series = new Uint8Array(at.length * N), ones = new Int32Array(at.length);
  at.forEach((p, i) => { for (let t = 0; t < N; t++) if (fg[t][p]) { series[i * N + t] = 1; ones[i]++; } });
  const phi = (i: number, j: number) => {
    let both = 0;
    for (let t = 0; t < N; t++) both += series[i * N + t] & series[j * N + t];
    const a = ones[i], b = ones[j], d = Math.sqrt(a * (N - a) * b * (N - b));
    return d ? (N * both - a * b) / d : a === b ? 1 : 0;
  };
  const up = at.map((_, i) => i), top = (i: number): number => (up[i] === i ? i : (up[i] = top(up[i])));
  at.forEach((p, i) => {
    const x = p % W, y = Math.floor(p / W);
    for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [-1, 1]]) { const xx = x + dx, yy = y + dy, j = xx >= 0 && xx < W && yy < H ? idx[yy * W + xx] : -1; if (j >= 0 && phi(i, j) >= 0.2) up[top(i)] = top(j); }
  });
  const by = new Map<number, number[]>();
  at.forEach((p, i) => (by.get(top(i)) ?? by.set(top(i), []).get(top(i))!).push(p));
  return [...by.values()].map((pix) => {
    let x0 = W, y0 = H, x1 = 0, y1 = 0, sx = 0, sy = 0;
    for (const p of pix) { const x = p % W, y = Math.floor(p / W); sx += x; sy += y; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    return { x0, y0, x1, y1, n: pix.length, cx: sx / pix.length, cy: sy / pix.length, pix };
  });
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

type Box = { x0: number; y0: number; x1: number; y1: number };
/** One capture: the frame, the box, which pixels of the box are the piece. */
type Cut = { t: number; b: Box; keep: Uint8Array };
const paint = (src: Img[], c: Cut) => {
  const w = c.b.x1 - c.b.x0 + 1, h = c.b.y1 - c.b.y0 + 1, img = new Img(w, h), f = src[c.t];
  for (let i = 0; i < w * h; i++) if (c.keep[i]) img.data[i] = f.data[(c.b.y0 + Math.floor(i / w)) * f.w + c.b.x0 + (i % w)];
  return img;
};
const row = (frames: Img[]) => {
  const w = Math.max(...frames.map((f) => f.w)), h = Math.max(...frames.map((f) => f.h)), strip = new Img(w * frames.length, h);
  frames.forEach((f, i) => strip.blit(f, i * w + Math.floor((w - f.w) / 2), h - f.h));
  return strip;
};
/** A piece's captures (a few across the clip) and its strip (a cycle, or those), each frame its own matte. */
function captures<T>(stripAt: T[], cutAt: T[], cut: (at: T) => Cut, seen: Img[]): { cuts: Img[]; cutsAt: [number, number, number][]; strip: Img; stripFrames: number; fill: number } {
  const masks = cutAt.map(cut), cuts = masks.map((c) => paint(seen, c)), frames = stripAt.map(cut);
  const fill = cuts.reduce((a, c) => a + c.data.filter((v) => (v & 255) >= 128).length / Math.max(1, c.w * c.h), 0) / Math.max(1, cuts.length);
  return { cuts, cutsAt: masks.map((c) => [c.t, c.b.x0, c.b.y0]), strip: row(frames.map((c) => paint(seen, c))), stripFrames: frames.length, fill };
}

/**
 * The colors of a piece's background and its own, over frames across the clip: what the ring round its
 * box (that frame's) shows, and what its moving pixels show when they differ from the background (not the grass they
 * show between a dancer's steps). A color is the background's when the ring shows more of it (as a
 * share) than the piece does. Exact colors for drawn art; for a smeared copy, 4 bits a channel.
 */
function colorsOf(F: Img[], fg: Uint8Array[], at: [number, Box][], mine: Uint8Array, W: number, tol: number): Set<number> {
  const key = (c: Color) => (tol > 0.05 ? c >>> 12 : c >>> 8), ring = new Map<number, number>(), own = new Map<number, number>();
  let nr = 0, no = 0;
  for (const [t, b] of at) for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) {
    const c = F[t].data[y * W + x];
    if ((c & 255) < 128) continue;
    if (x === b.x0 || y === b.y0 || x === b.x1 || y === b.y1) { ring.set(key(c), (ring.get(key(c)) ?? 0) + 1); nr++; }
    if (mine[y * W + x] && fg[t][y * W + x]) { own.set(key(c), (own.get(key(c)) ?? 0) + 1); no++; }
  }
  const bg = new Set<number>();
  for (const [k, n] of ring) if (n / Math.max(1, nr) > (own.get(k) ?? 0) / Math.max(1, no)) bg.add(k);
  return bg;
}

/**
 * One capture of a piece with its background taken away, after GrabCut's idea (Rother, Kolmogorov and
 * Blake, "GrabCut", 2004) kept simple for drawn art: the background floods in from the box's edge
 * through the background's colors (an outline stops it); what it doesn't reach is the piece, kept where
 * it touches the piece's moving pixels and no farther from them than a quarter of its size (what of it
 * stays still sits by what moves: a body between its swinging arms; a lawn the color of a zombie stays
 * out), its holes filled. When that takes nearly all the box or almost none of it, what of it moves in
 * that frame, a pixel wider.
 */
function matte(f: Img, now: Uint8Array, b: Box, mine: Uint8Array, bg: Set<number>, W: number, tol: number, mode?: "all" | "near"): { keep: Uint8Array; mode: "all" | "near" } {
  const w = b.x1 - b.x0 + 1, h = b.y1 - b.y0 + 1, n = w * h;
  const key = (c: Color) => (tol > 0.05 ? c >>> 12 : c >>> 8), at = (i: number) => f.data[(b.y0 + Math.floor(i / w)) * W + b.x0 + (i % w)];
  const isBg = (i: number) => { const c = at(i); return (c & 255) < 128 || bg.has(key(c)); };
  const flood = (pass: (i: number) => boolean) => {
    const seen = new Uint8Array(n), st: number[] = [];
    for (let i = 0; i < n; i++) { const x = i % w, y = Math.floor(i / w); if ((x === 0 || y === 0 || x === w - 1 || y === h - 1) && pass(i)) { seen[i] = 1; st.push(i); } }
    while (st.length) { const i = st.pop()!, x = i % w, y = Math.floor(i / w); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy, j = yy * w + xx; if (xx >= 0 && yy >= 0 && xx < w && yy < h && !seen[j] && pass(j)) { seen[j] = 1; st.push(j); } } }
    return seen;
  };
  const back = flood(isBg), keep = new Uint8Array(n);
  // how far each pixel is from the piece's moving pixels
  const far = new Int32Array(n).fill(-1), q: number[] = [];
  let mx0 = w, mx1 = 0, my0 = h, my1 = 0;
  for (let i = 0; i < n; i++) { const x = i % w, y = Math.floor(i / w); if (mine[(b.y0 + y) * W + b.x0 + x]) { far[i] = 0; q.push(i); mx0 = Math.min(mx0, x); mx1 = Math.max(mx1, x); my0 = Math.min(my0, y); my1 = Math.max(my1, y); } }
  const reach = Math.max(3, Math.round(0.25 * Math.min(mx1 - mx0 + 1, my1 - my0 + 1)));
  for (let k = 0; k < q.length; k++) { const i = q[k], x = i % w, y = Math.floor(i / w); if (far[i] >= reach) continue; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy, j = yy * w + xx; if (xx >= 0 && yy >= 0 && xx < w && yy < h && far[j] < 0) { far[j] = far[i] + 1; q.push(j); } } }
  // the parts not reached that touch the piece's own moving pixels; near them only when the flood left
  // far more than moves (a background the flood couldn't tell from the piece), else all of them (a ghost
  // drifting whole moves only at its edges)
  const parts = (near: boolean) => {
    const k = new Uint8Array(n), seen = new Uint8Array(n);
    let count = 0;
    for (let i = 0; i < n; i++) {
      if (back[i] || seen[i] || (near && far[i] < 0)) continue;
      const comp = [i], st = [i];
      seen[i] = 1;
      let touches = false;
      while (st.length) {
        const p = st.pop()!, x = p % w, y = Math.floor(p / w);
        if (far[p] === 0) touches = true;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy, j = yy * w + xx; if (xx >= 0 && yy >= 0 && xx < w && yy < h && !back[j] && !seen[j] && (!near || far[j] >= 0)) { seen[j] = 1; st.push(j); comp.push(j); } }
      }
      if (touches) for (const p of comp) { k[p] = 1; count++; }
    }
    return { k, count };
  };
  const moving = far.filter((v) => v === 0).length, all = parts(false);
  const chosen = mode ?? (all.count <= 3 * Math.max(1, moving) ? "all" : "near");
  keep.set(chosen === "all" ? all.k : parts(true).k);
  // its holes filled: what the outside can't reach without crossing it
  const out = flood((i) => !keep[i]);
  let kept = 0;
  for (let i = 0; i < n; i++) if (!out[i]) { keep[i] = 1; kept++; }
  if (kept > 0.92 * n || kept < 0.02 * n) for (let i = 0; i < n; i++) {
    const x = i % w, y = Math.floor(i / w);
    let near = false;
    for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = b.x0 + x + dx, yy = b.y0 + y + dy; if (xx >= 0 && yy >= 0 && xx < W && yy * W + xx < mine.length && mine[yy * W + xx] && now[yy * W + xx]) { near = true; break; } }
    keep[i] = near ? 1 : 0;
  }
  return { keep, mode: chosen };
}

/** A carried thing's capture: its difference, with the holes in it filled (its own colors that matched what was behind it). */
function carriedCut(m: Uint8Array, c: Box, W: number): Uint8Array {
  const w = c.x1 - c.x0 + 1, h = c.y1 - c.y0 + 1, n = w * h, inMask = (i: number) => m[(c.y0 + Math.floor(i / w)) * W + c.x0 + (i % w)] === 1;
  const out = new Uint8Array(n), st: number[] = [];
  for (let i = 0; i < n; i++) { const x = i % w, y = Math.floor(i / w); if ((x === 0 || y === 0 || x === w - 1 || y === h - 1) && !inMask(i)) { out[i] = 1; st.push(i); } }
  while (st.length) { const i = st.pop()!, x = i % w, y = Math.floor(i / w); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy, j = yy * w + xx; if (xx >= 0 && yy >= 0 && xx < w && yy < h && !out[j] && !inMask(j)) { out[j] = 1; st.push(j); } } }
  return out.map((v) => 1 - v);
}

const crop = (f: Img, b: { x0: number; y0: number; x1: number; y1: number }, W: number) => {
  const out: Color[] = [];
  for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) out.push(f.data[y * W + x]);
  return out;
};

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
  // (past `stop` it stops counting: whether two are the same drawing is settled by then)
  const frac = (a: Color[] | { w: number; h: number; px: Color[] }, b: Color[] | { w: number; h: number; px: Color[] }, stop = Infinity) => {
    if (Array.isArray(a) && Array.isArray(b)) { const most = stop * a.length; let d = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i] && differ(a[i], b[i]) && ++d > most) break; return d / Math.max(1, a.length); }
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
  for (const s of seq) if (!reps.some((r) => frac(r, s, 0.03) < 0.03)) { reps.push(s); if (reps.length > 64) break; }
  let cycle = 0;
  const step = seq.length > 1 ? seq.slice(1).reduce((a, s, i) => a + frac(seq[i], s), 0) / (seq.length - 1) : 0;
  for (let p = 2; p <= Math.floor(seq.length / 2) && step > 0.01; p++) {
    // (a period is out once its sum passes what its comparisons may add up to)
    const most = 0.3 * step * Math.min(24, seq.length - p);
    let s = 0, c = 0;
    for (let i = 0; i + p < seq.length && c < 24 && s < most; i++) { s += frac(seq[i], seq[i + p], most - s); c++; }
    if (c && s < most && s / c < 0.3 * step) { cycle = p; break; }
  }
  return { poses: reps.length, cycle };
}

// the share of what changes in these pixels that goes between a color and the in-between tone of it and
// a neighbor of another color across it: an edge's cover changing (subpixel motion)
function partialOf(F: Img[], pix: number[], W: number, H: number): number {
  const shifted = (a: Img, b: Img, x: number, y: number) => {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const px = x - dx, py = y - dy, nx = x + dx, ny = y + dy;
      if (px < 0 || py < 0 || nx < 0 || ny < 0 || px >= W || nx >= W || py >= H || ny >= H) continue;
      if (b.data[y * W + x] === a.data[py * W + px] && b.data[ny * W + nx] === a.data[y * W + x]) return true;
    }
    return false;
  };
  const clear = (c: number) => (c & 255) < 128;
  const ends = (f: Img, p: number): [number, number] | null => {
    const x = p % W, y = Math.floor(p / W), c = f.data[p];
    if (clear(c)) return null;
    for (const [dx, dy] of [[1, 0], [0, 1]]) {
      if (x < dx || y < dy || x + dx >= W || y + dy >= H) continue;
      const a = f.data[p - dx - dy * W], b = f.data[p + dx + dy * W];
      if (clear(a) || clear(b) || a === b || a === c || b === c) continue;
      const A = lab(a), B = lab(b), P = lab(c), ab = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], n2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2;
      if (n2 < 0.15 ** 2) continue;
      const t = ((P[0] - A[0]) * ab[0] + (P[1] - A[1]) * ab[1] + (P[2] - A[2]) * ab[2]) / n2;
      if (t > 0.2 && t < 0.8 && Math.hypot(P[0] - A[0] - t * ab[0], P[1] - A[1] - t * ab[1], P[2] - A[2] - t * ab[2]) < 0.3 * Math.sqrt(n2)) return [a, b];
    }
    return null;
  };
  // or gone part of the way from its color toward a neighbor's, one of them dark (an outline pushed
  // into, a fill darkening toward it)
  // (it alone: the neighbor it goes toward and the one across as they were)
  const toward = (f: Img, g: Img, p: number, from: number) => {
    const x = p % W, y = Math.floor(p / W), c = f.data[p];
    if (clear(c) || clear(from)) return false;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (x - dx < 0 || y - dy < 0 || x + dx < 0 || y + dy < 0 || x + dx >= W || y + dy >= H || x - dx >= W || y - dy >= H) continue;
      const q = f.data[p + dx + dy * W], o = p - dx - dy * W;
      if (clear(q) || q === c || q === from || Math.min(lab(from)[0], lab(q)[0]) > 0.3 || g.data[p + dx + dy * W] !== q || g.data[o] !== f.data[o]) continue;
      const A = lab(from), B = lab(q), P = lab(c), ab = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], n2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2;
      if (n2 < 0.15 ** 2) continue;
      const t = ((P[0] - A[0]) * ab[0] + (P[1] - A[1]) * ab[1] + (P[2] - A[2]) * ab[2]) / n2;
      if (t > 0.2 && t < 0.8 && Math.hypot(P[0] - A[0] - t * ab[0], P[1] - A[1] - t * ab[1], P[2] - A[2] - t * ab[2]) < 0.3 * Math.sqrt(n2)) return true;
    }
    return false;
  };
  let changed = 0, partial = 0;
  for (let t = 1; t < F.length; t++) for (const p of pix) {
    const a = F[t - 1].data[p], b = F[t].data[p];
    if (a === b) continue;
    changed++;
    // (not where the picture moved a whole pixel round it: a ramp's middle tone carried along)
    if (shifted(F[t - 1], F[t], p % W, Math.floor(p / W))) continue;
    const ea = ends(F[t - 1], p), eb = ends(F[t], p);
    if ((eb && (a === eb[0] || a === eb[1])) || (ea && (b === ea[0] || b === ea[1])) || toward(F[t], F[t - 1], p, a) || toward(F[t - 1], F[t], p, b)) partial++;
  }
  return changed ? partial / changed : 0;
}
