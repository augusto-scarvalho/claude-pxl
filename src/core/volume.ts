// A density (sdf.ts: a shape eaten by flowing noise) drawn as pixel art: a cloud, mist, smoke, a glowing
// orb. Sampled once a frame on a grid over its box, with the light that reaches each point through it
// (its own shadow: what is deeper toward the light is darker); then a ray through each cell of the
// picture (a pixel, or a K x K block) gathers how much it holds back and how lit what it holds back is,
// and what glows (emission). On the picture: the tone along its ramp in clusters, and where it is thin
// an ordered dither between it and what is behind (the palette kept), or laid over by its alpha
// (`blend: "alpha"`). In mesh()'s depth through the same camera: what is nearer hides it, it lies over
// what is behind and hides nothing (it writes no depth); its shadow on what is drawn (`cast`), and what
// glows lights what is round it (`emit.glow`, m).
import { type Color, LIN, TRANSPARENT, fromLinear } from "./color.ts";
import { PxError } from "./errors.ts";
import { Density, type V3, article, compileDensity } from "./sdf.ts";
import { type SurfaceCanvas, type SurfaceView, clockOf, corners, partIndex, slab, viewOf } from "./surface.ts";
import { bayer } from "./util.ts";

export interface VolumeOpts {
  view?: SurfaceView;
  ppm?: number;
  at?: number[];
  /** its tones, dark to light (default the palette's first ramp) */
  ramp?: string | string[];
  /** the way toward the light, [x, y, z] (default the upper left, toward the viewer) */
  light?: number[];
  /** how much light a meter of it at full density holds back (default 3: a thick cloud; mist 0.6) */
  thickness?: number;
  /** the light everywhere in it, 0..1 (default 0.35): its shade */
  ambient?: number;
  /** the grid it is sampled on, m (default its box's longest side / 40) */
  cell?: number;
  /** what glows: its tones dark to light, how strong (default 1), and how far it lights what is round it, m (glow, default 0) */
  emit?: { ramp: string | string[]; strength?: number; glow?: number };
  /** where it is thin: "dither" (default: ordered, in the palette) or "alpha" (laid over, colors leave the palette) */
  blend?: "dither" | "alpha";
  /** through a camera: px to a ray, in blocks (an HD picture's sprite pixel) */
  pixel?: number;
  /** through a camera: its shadow on what is drawn, the share of light it takes where it is thick (default 0: none) */
  cast?: number;
  /** the name of the part it is (pxl steps --at) */
  part?: string;
}
/** Light in a cloud scatters on forward, reaching deeper than a ray sees through it: the share of its thickness the light's way takes. */
const SCATTER = 0.4;
export const VOLUME_OPTS = ["view", "ppm", "at", "ramp", "light", "thickness", "ambient", "cell", "emit", "blend", "pixel", "cast", "part"];

/** Draw a density on the canvas (see the top of this file). */
export function drawVolume(c: SurfaceCanvas, density: unknown, o: VolumeOpts = {}): void {
  const who = "volume";
  if (!(density instanceof Density)) throw new PxError(`volume(density, opts) draws a density (sdf.density(field, { edge, noise, flow, ... }))${density && typeof density === "object" && "kind" in density ? `, not ${article((density as { kind: string }).kind)}` : ""}`);
  const persp = !!o.view && typeof o.view === "object" && "horizon" in o.view;
  const K = o.pixel ?? 1, thick = o.thickness ?? 3, amb = o.ambient ?? 0.35, castK = o.cast ?? 0, blend = o.blend ?? "dither";
  if (!(Number.isInteger(K) && K >= 1)) throw new PxError(`${who}: pixel is px to a ray, a whole number from 1, got ${JSON.stringify(o.pixel)}`);
  if (!(thick > 0) || !(amb >= 0 && amb <= 1) || !(castK >= 0 && castK <= 1) || (blend !== "dither" && blend !== "alpha"))
    throw new PxError(`${who}: thickness above 0, ambient and cast 0..1, blend "dither" or "alpha", got ${JSON.stringify([o.thickness, o.ambient, o.cast, o.blend])}`);
  const origin = !persp && o.view && typeof o.view === "object" ? (o.view as { origin?: unknown }).origin : undefined;
  if (o.at !== undefined && !(Array.isArray(o.at) && (o.at.length === 3 || (!persp && o.at.length === 2)) && o.at.every(Number.isFinite)))
    throw new PxError(`${who}: at is ${persp ? "where it stands, [x, z, up] m" : "where its origin lands, [x, y] px, or [x, y, z] m in the view's world"}, got ${JSON.stringify(o.at)}`);
  const colors = (spec: unknown, what: string): Color[] => {
    const keys = typeof spec === "string" ? [...spec] : spec;
    if (!Array.isArray(keys) || !keys.length) throw new PxError(`${who}: ${what} is a ramp of keys dark to light ("abcd"), got ${JSON.stringify(spec)}`);
    return keys.map((k) => { const col = c.color(k); if (col === null || col === TRANSPARENT) throw new PxError(`${who}: ${what}: '${k}' is not a color`); return col; });
  };
  const ramp = colors(o.ramp ?? c.pal.ramps[0], "ramp");
  const E = o.emit, eramp = E ? colors(E.ramp, "emit's ramp") : undefined, strength = E?.strength ?? 1, glowR = E?.glow ?? 0;
  if (E && (!(strength >= 0) || !(glowR >= 0))) throw new PxError(`${who}: emit is { ramp, strength (from 0), glow (m, from 0) }, got ${JSON.stringify(E)}`);

  // the grid: points over its box, the density at each; what glows, its middle
  const Dn = compileDensity(density, clockOf(c)), lo = Dn.lo, hi = Dn.hi;
  if (![...lo, ...hi].every(Number.isFinite)) throw new PxError(`${who}: the density's shape goes on without end (a plane): intersect it with something that ends`);
  const ext = [0, 1, 2].map((e) => Math.max(1e-6, hi[e] - lo[e])), cell = o.cell ?? Math.max(...ext) / 40;
  if (!(cell > 0)) throw new PxError(`${who}: cell is the grid's step in m, above 0, got ${JSON.stringify(o.cell)}`);
  const n = ext.map((x) => Math.max(2, Math.min(128, Math.ceil(x / cell) + 1))), st = ext.map((x, e) => x / (n[e] - 1)), NX = n[0], NXY = n[0] * n[1];
  const rho = new Float32Array(n[0] * n[1] * n[2]), ctr = [0, 0, 0];
  let mass = 0;
  for (let k = 0, q = 0; k < n[2]; k++) for (let j = 0; j < n[1]; j++) for (let i = 0; i < n[0]; i++, q++) {
    const x = lo[0] + i * st[0], y = lo[1] + j * st[1], z = lo[2] + k * st[2], r = Dn.rho(x, y, z);
    rho[q] = r;
    if (r > 0) { mass += r; ctr[0] += r * x; ctr[1] += r * y; ctr[2] += r * z; }
  }
  if (mass > 0) for (let e = 0; e < 3; e++) ctr[e] /= mass;
  // a grid's value at a point, between its corners
  const at = (g: Float32Array, x: number, y: number, z: number): number => {
    const fx = (x - lo[0]) / st[0], fy = (y - lo[1]) / st[1], fz = (z - lo[2]) / st[2];
    if (fx < 0 || fy < 0 || fz < 0 || fx > n[0] - 1 || fy > n[1] - 1 || fz > n[2] - 1) return 0;
    const i = Math.min(n[0] - 2, Math.floor(fx)), j = Math.min(n[1] - 2, Math.floor(fy)), k = Math.min(n[2] - 2, Math.floor(fz)), u = fx - i, v = fy - j, w = fz - k, q = k * NXY + j * NX + i;
    const a = g[q] + (g[q + 1] - g[q]) * u, b = g[q + NX] + (g[q + NX + 1] - g[q + NX]) * u, cc = g[q + NXY] + (g[q + NXY + 1] - g[q + NXY]) * u, d = g[q + NXY + NX] + (g[q + NXY + NX + 1] - g[q + NXY + NX]) * u;
    const ab = a + (b - a) * v, cd = cc + (d - cc) * v;
    return ab + (cd - ab) * w;
  };

  const cam = viewOf(c, o as never, lo, hi, undefined, who, persp, K, origin), { W, H, x0, y0, ray, axisDepth, toScreen, L } = cam;
  // the light reaching each point with matter round it: what it passes through on its way to the light
  const lit = new Float32Array(rho.length).fill(1), sl = Math.min(...st);
  const shut = (x: number, y: number, z: number): number => {
    let s = 0;
    for (let t = sl; ; t += sl) {
      const px = x + L[0] * t, py = y + L[1] * t, pz = z + L[2] * t;
      if (px < lo[0] || py < lo[1] || pz < lo[2] || px > hi[0] || py > hi[1] || pz > hi[2]) break;
      s += at(rho, px, py, pz);
    }
    return s * sl;
  };
  for (let k = 0, q = 0; k < n[2]; k++) for (let j = 0; j < n[1]; j++) for (let i = 0; i < n[0]; i++, q++)
    if (rho[q] > 0 || (i && rho[q - 1] > 0) || (j && rho[q - NX] > 0) || (k && rho[q - NXY] > 0)) lit[q] = Math.exp(-SCATTER * thick * shut(lo[0] + i * st[0], lo[1] + j * st[1], lo[2] + k * st[2]));

  // the cells of the picture its box covers
  const pts = corners(lo, hi).map(toScreen);
  let bx0 = x0, bx1 = x0 + W, by0 = y0, by1 = y0 + H;
  if (pts.every((p) => p)) {
    bx0 = Math.max(bx0, Math.floor(Math.min(...pts.map((p) => p![0]))) - 1); bx1 = Math.min(bx1, Math.ceil(Math.max(...pts.map((p) => p![0]))) + 1);
    by0 = Math.max(by0, Math.floor(Math.min(...pts.map((p) => p![1]))) - 1); by1 = Math.min(by1, Math.ceil(Math.max(...pts.map((p) => p![1]))) + 1);
  }
  const gx0 = Math.floor(bx0 / K), gy0 = Math.floor(by0 / K), GW = Math.ceil(bx1 / K) - gx0, GH = Math.ceil(by1 / K) - gy0;
  if (GW <= 0 || GH <= 0) return;
  const N = GW * GH, alpha = new Float32Array(N), tone = new Int8Array(N), glow = new Float32Array(N), vis = c.img.depth, dt = sl * 0.5;
  for (let gy = 0; gy < GH; gy++)
    for (let gx = 0; gx < GW; gx++) {
      const cx = (gx0 + gx) * K + K / 2, cy = (gy0 + gy) * K + K / 2, r = ray(cx, cy);
      if (!r) continue;
      const s = slab(r.o, r.d, lo, hi);
      if (!s) continue;
      let t0 = Math.max(s[0], persp ? 0.05 : -Infinity), t1 = s[1];
      if (t1 <= t0) continue;
      // what is drawn nearer the eye hides what is behind it: march up to it
      if (vis) {
        const q = c.index(cx - K / 2, cy - K / 2), a0 = axisDepth([r.o[0] + r.d[0] * t0, r.o[1] + r.d[1] * t0, r.o[2] + r.d[2] * t0]), a1 = axisDepth([r.o[0] + r.d[0] * t1, r.o[1] + r.d[1] * t1, r.o[2] + r.d[2] * t1]);
        if (q >= 0 && Number.isFinite(vis[q]) && a1 > a0) t1 = Math.min(t1, t0 + ((vis[q] - a0) / (a1 - a0)) * (t1 - t0));
        if (t1 <= t0) continue;
      }
      let T = 1, B = 0, G = 0;
      for (let t = t0 + dt * 0.5; t < t1; t += dt) {
        const x = r.o[0] + r.d[0] * t, y = r.o[1] + r.d[1] * t, z = r.o[2] + r.d[2] * t, m = at(rho, x, y, z);
        if (m <= 0.002) continue;
        const a = 1 - Math.exp(-thick * m * dt), w = T * a;
        B += w * (amb + (1 - amb) * at(lit, x, y, z));
        if (eramp) G += w * m * strength;
        T -= w;
        if (T < 0.02) break;
      }
      const i = gy * GW + gx, A = 1 - T;
      if (A < 0.02) continue;
      alpha[i] = A;
      tone[i] = Math.max(0, Math.min(ramp.length - 1, Math.round((B / A) * (ramp.length - 1))));
      glow[i] = G / A;
    }
  // tones in clusters, as surface()'s: a lone tone takes the one most of its neighbours have
  const was = tone.slice();
  for (let gy = 1; gy < GH - 1; gy++)
    for (let gx = 1; gx < GW - 1; gx++) {
      const i = gy * GW + gx;
      if (!alpha[i]) continue;
      const nb = [i - 1, i + 1, i - GW, i + GW].filter((j) => alpha[j]).map((j) => was[j]);
      if (nb.length < 3 || nb.includes(was[i])) continue;
      const best = nb.find((v) => nb.filter((u) => u === v).length >= 3) ?? (nb.length === 4 && nb.filter((u) => u === nb[0]).length === 2 ? nb[0] : undefined);
      if (best !== undefined) tone[i] = best;
    }
  // on the picture: thin, a dither between it and what is behind (or its alpha over it); what glows in its own tones, marked as giving light
  const drawn = new Uint8Array(N), pk = o.part !== undefined ? partIndex(c.img, o.part) : -1;
  for (let gy = 0; gy < GH; gy++)
    for (let gx = 0; gx < GW; gx++) {
      const i = gy * GW + gx, A = alpha[i];
      if (!A) continue;
      if (blend === "dither" && A <= 0.2 + 0.6 * bayer(gx0 + gx, gy0 + gy)) continue;
      const e = glow[i], hot = eramp && e > 0.15, col = hot ? eramp[Math.min(eramp.length - 1, Math.round(Math.min(1, e) * (eramp.length - 1)))] : ramp[tone[i]];
      drawn[i] = 1;
      for (let y = 0; y < K; y++)
        for (let x = 0; x < K; x++) {
          const px = (gx0 + gx) * K + x, py = (gy0 + gy) * K + y, j = c.index(px, py);
          if (j < 0) continue;
          if (blend === "alpha") {
            const u = c.img.data[j], k = Math.min(1, A);
            if (u === TRANSPARENT) { c.plot(px, py, ((col & ~255) | Math.round(k * 255)) >>> 0); continue; }
            c.plot(px, py, fromLinear(LIN[u >>> 24] + (LIN[col >>> 24] - LIN[u >>> 24]) * k, LIN[(u >>> 16) & 255] + (LIN[(col >>> 16) & 255] - LIN[(u >>> 16) & 255]) * k, LIN[(u >>> 8) & 255] + (LIN[(col >>> 8) & 255] - LIN[(u >>> 8) & 255]) * k, u));
          } else c.plot(px, py, col);
          if (pk >= 0) c.img.parts!.ids[j] = pk;
          if (hot) (c.img.emit ??= new Uint8Array(W * H))[j] = Math.round(255 * Math.min(1, e));
        }
    }

  // through a camera: its shadow on what is drawn, and the light of what glows on what is round it,
  // each block of what has a depth put back in the world
  if (!persp || !vis || (castK <= 0 && !(eramp && glowR > 0 && mass > 0))) return;
  const P = cam.P!, eye = cam.eye, F = cam.F, up = c.pal.stepMap(1), down = c.pal.stepMap(-1);
  const step = (col: Color, k: number, toward: Color | null) => {
    const m = k > 0 ? up : down, s = m.get(col);
    if (s !== undefined && s !== col) return s;
    // (off the palette: darker, or the glow's color added, in linear light)
    const f = k > 0 ? 0.35 : -0.4, tc = toward ?? col;
    return fromLinear(LIN[col >>> 24] + (k > 0 ? LIN[tc >>> 24] * f : LIN[col >>> 24] * f), LIN[(col >>> 16) & 255] + (k > 0 ? LIN[(tc >>> 16) & 255] * f : LIN[(col >>> 16) & 255] * f), LIN[(col >>> 8) & 255] + (k > 0 ? LIN[(tc >>> 8) & 255] * f : LIN[(col >>> 8) & 255] * f), col);
  };
  // where: round the box (its shadow carried away from the light to its foot, or the glow's reach)
  const R = eramp && glowR > 0 ? glowR : 0, foot = lo[2] - R;
  const reach: V3[] = corners([lo[0] - R, lo[1] - R, lo[2] - R], [hi[0] + R, hi[1] + R, hi[2] + R]).flatMap((p) => { const s = castK > 0 && L[2] > 0.05 ? (p[2] - foot) / L[2] : 0; return [p, [p[0] - L[0] * s, p[1] - L[1] * s, foot] as V3]; });
  const sp = reach.map(cam.toScreen);
  if (!sp.every((p) => p)) return;
  const sx0 = Math.max(x0, Math.floor(Math.min(...sp.map((p) => p![0]))) - K), sx1 = Math.min(x0 + W, Math.ceil(Math.max(...sp.map((p) => p![0]))) + K);
  const sy0 = Math.max(y0, Math.floor(Math.min(...sp.map((p) => p![1]))) - K), sy1 = Math.min(y0 + H, Math.ceil(Math.max(...sp.map((p) => p![1]))) + K);
  const glowCol = eramp ? eramp[eramp.length - 1] : null;
  for (let by = Math.floor(sy0 / K); by * K < sy1; by++)
    for (let bx = Math.floor(sx0 / K); bx * K < sx1; bx++) {
      const cx = bx * K + K / 2, cy = by * K + K / 2, q = c.index(cx - K / 2, cy - K / 2);
      if (q < 0 || !Number.isFinite(vis[q])) continue;
      const g = bx - gx0, gyy = by - gy0;
      if (g >= 0 && gyy >= 0 && g < GW && gyy < GH && drawn[gyy * GW + g]) continue;
      const dir = P.ray(cx - 0.5, cy - 0.5), t = vis[q] / (dir[0] * F[0] + dir[1] * F[1] + dir[2] * F[2]), p: V3 = [eye[0] + dir[0] * t, eye[1] + dir[1] * t, eye[2] + dir[2] * t];
      let k = 0;
      if (castK > 0) {
        const s = slab(p, L, lo, hi);
        if (s && s[1] > 0.02) {
          let sum = 0;
          for (let tt = Math.max(0.02, s[0]); tt < s[1]; tt += sl) sum += at(rho, p[0] + L[0] * tt, p[1] + L[1] * tt, p[2] + L[2] * tt);
          if ((1 - Math.exp(-thick * sum * sl)) * castK * 2 > bayer(bx, by)) k = -1;
        }
      }
      if (R > 0) {
        const dd = Math.hypot(p[0] - ctr[0], p[1] - ctr[1], p[2] - ctr[2]);
        if (dd < R) k += Math.floor(strength * (1 - dd / R) ** 2 * 2.5 + bayer(bx, by) * 0.999);
      }
      if (!k) continue;
      for (let y = 0; y < K; y++)
        for (let x = 0; x < K; x++) {
          const j = c.index(bx * K + x, by * K + y);
          if (j < 0 || Math.abs(vis[j] - vis[q]) >= 0.5) continue;
          let col = c.img.data[j];
          for (let s = 0; s < Math.abs(k); s++) col = step(col, Math.sign(k), glowCol);
          c.img.data[j] = col;
        }
    }
}
