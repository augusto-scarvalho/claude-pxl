// Smoke as SLYNYRD and Saint11 draw it: round billows in clusters, lit on top and darker beneath, in
// two or three tones and two or three opacities (thick where it is young, thin where it goes), never a
// smooth fade. One shape at a moment of the loop: a column rising and widening along a path, a puff
// bursting out, a bank drifting, a ring spreading. Over clear pixels it keeps its opacities (smoke
// for mesh()'s blend: "alpha"); over what is drawn it lays its tones in an ordered dither, in the palette.
import { type Color, TRANSPARENT } from "./color.ts";
import { PxError } from "./errors.ts";
import { bayer, colorList, hash, rng, vnoise } from "./util.ts";

export interface SmokeOpts {
  /** "column" (default), "puff", "bank" or "ring" */
  shape?: "column" | "puff" | "bank" | "ring";
  /** how many billows (default 16 for a column, 12 a puff, 8 a bank, 14 a ring) */
  count?: number;
  /** a billow's radius in px when it starts and when it ends (its width over its life; default [3, 8]) */
  size?: [number, number];
  /** how much billows differ in size (0..1, default 0.3) */
  vary?: number;
  /** a column: px it rises over its life (default 36), or the way it goes: `path` [x0, y0, x1, y1, ...] from (x, y) */
  rise?: number;
  path?: number[];
  /** px it drifts over its life ([x, y], a number for x); a bank: px it drifts a loop */
  wind?: number | [number, number];
  /** a puff or a ring: px its billows go out (default 16); a bank: px long (`length`, default 48) */
  spread?: number;
  length?: number;
  /** a puff or a ring: how tall for its width (default 0.8 a puff, 0.4 a ring: on the ground) */
  flat?: number;
  /** px each billow wanders (default 2), and how ragged its edge is (0..1, default 0.35) */
  turbulence?: number;
  rough?: number;
  /** the share of its life at the end over which it thins out and breaks up (default 0.35) */
  thin?: number;
  /** the share of the loop a billow lives (default 1) */
  life?: number;
  /** its three opacities, thin to thick (default [0.4, 0.62, 0.85]) */
  alpha?: [number, number, number];
  /** the way to the light on the picture (default the upper left, [-0.6, -0.8]) */
  light?: [number, number];
  /** px to a pixel of the art (an HD picture: 4) */
  pixel?: number;
  seed?: number;
  frame?: number;
  /**
   * a perspective() camera and where in its world the smoke stands ([x, z, up] in m): its lengths
   * (size, rise, path, wind, spread, length, turbulence) in meters there, those not given px there; each
   * billow on the upright plane through `at` across the view, as near as it is (x and y then px added)
   */
  view?: unknown;
  at?: number[];
}

/** What smoke draws on: canvas coords, its clip and twin respected. */
export interface SmokeCanvas {
  frame: number;
  frames: number;
  color(k: unknown): Color | null;
  get(x: number, y: number): Color;
  plot(x: number, y: number, c: Color): boolean;
}

const KEYS = ["shape", "count", "size", "vary", "rise", "path", "wind", "spread", "length", "flat", "turbulence", "rough", "thin", "life", "alpha", "light", "pixel", "seed", "frame", "view", "at"];
/** A camera smoke is seen through: where a world point [x, z, up] lands, px a meter there, its yaw (degrees). */
export interface SmokeCamera { ground(x: number, z: number, u: number): [number, number]; scale(z: number, x: number, u: number): number; yaw?: number }
/** Lengths in meters at `at` to px there (the given ones only), and a billow's offset back into the world, seen through the camera. */
export function inMeters(cam: SmokeCamera, at: number[], what: string) {
  if (!(Array.isArray(at) && at.length === 3 && at.every(Number.isFinite))) throw new PxError(`${what}: with a view, at is where it stands in its world, [x, z, up] in m, got ${JSON.stringify(at)}`);
  const k = cam.scale(at[1], at[0], at[2]), a = ((cam.yaw ?? 0) * Math.PI) / 180, rx = Math.cos(a), rz = -Math.sin(a);
  // (dx, dy) px from where it stands, y down: on the upright plane across the view; where it lands, how much bigger than there
  const place = (dx: number, dy: number): [number, number, number] => {
    const w = [at[0] + (rx * dx) / k, at[1] + (rz * dx) / k, at[2] - dy / k], [x, y] = cam.ground(w[0], w[1], w[2]);
    return [x, y, cam.scale(w[1], w[0], w[2]) / k];
  };
  return { k, place };
}
export const SMOKE_OPTS = KEYS;

interface Billow { x: number; y: number; r: number; level: number; erode: number; id: number }

/** Where along a path of points (from 0, 0) a share s of its length lies. */
function along(pts: number[], s: number): [number, number] {
  const seg: number[] = [];
  let total = 0;
  for (let i = 2; i < pts.length; i += 2) { const d = Math.hypot(pts[i] - pts[i - 2], pts[i + 1] - pts[i - 1]); seg.push(d); total += d; }
  let goal = Math.max(0, Math.min(1, s)) * total;
  for (let k = 0; k < seg.length; k++) {
    if (goal <= seg[k] || k === seg.length - 1) { const t = seg[k] ? Math.min(1, goal / seg[k]) : 0; return [pts[2 * k] + (pts[2 * k + 2] - pts[2 * k]) * t, pts[2 * k + 1] + (pts[2 * k + 3] - pts[2 * k + 1]) * t]; }
    goal -= seg[k];
  }
  return [pts[0], pts[1]];
}

export function drawSmoke(c: SmokeCanvas, x0: number, y0: number, keys: string | string[], o: SmokeOpts = {}, cam?: SmokeCamera): void {
  // through a camera: the lengths given in meters, px where it stands
  const M = cam ? inMeters(cam, o.at as number[], "smoke") : undefined;
  if (M) {
    const m = (v: number) => (v * M.k) / (o.pixel ?? 1), mm = (v: unknown) => (Array.isArray(v) ? v.map(m) : typeof v === "number" ? m(v) : v);
    o = { ...o, ...Object.fromEntries((["size", "rise", "path", "wind", "spread", "length", "turbulence"] as const).filter((n) => o[n] !== undefined).map((n) => [n, mm(o[n])])) };
  }
  const shape = o.shape ?? "column";
  if (!["column", "puff", "bank", "ring"].includes(shape)) throw new PxError(`smoke: shape is "column", "puff", "bank" or "ring", got ${JSON.stringify(o.shape)}`);
  const ks = colorList(keys).map((k) => c.color(k));
  if (ks.length !== 3 || ks.some((k) => k === null || k === TRANSPARENT)) throw new PxError(`smoke: keys are three: lit, middle, shaded ("wmd"), got ${JSON.stringify(keys)}`);
  const N = o.count ?? { column: 16, puff: 12, bank: 8, ring: 14 }[shape], [s0, s1] = o.size ?? [3, 8], vary = o.vary ?? 0.3, turb = o.turbulence ?? 2, rough = o.rough ?? 0.35;
  const thin = o.thin ?? 0.35, life = o.life ?? 1, alpha = o.alpha ?? [0.4, 0.62, 0.85], [lx, ly] = o.light ?? [-0.6, -0.8], K = o.pixel ?? 1;
  const num = (v: unknown, lo: number) => typeof v === "number" && Number.isFinite(v) && v >= lo;
  if (!(Number.isInteger(N) && N >= 1 && N <= 200) || !num(s0, 0.5) || !num(s1, 0.5) || !num(vary, 0) || !num(turb, 0) || !num(rough, 0) || !(thin >= 0 && thin <= 1) || !(life > 0 && life <= 1) || !(Number.isInteger(K) && K >= 1)
    || !(Array.isArray(alpha) && alpha.length === 3 && alpha.every((a) => a >= 0 && a <= 1)) || (o.path !== undefined && !(Array.isArray(o.path) && o.path.length >= 4 && o.path.length % 2 === 0 && o.path.every(Number.isFinite))))
    throw new PxError(`smoke: options out of range, got ${JSON.stringify(o)} (count 1..200, size [r0, r1] from 0.5, vary/turbulence/rough from 0, thin 0..1, life above 0 to 1, alpha three of 0..1, path [x0, y0, x1, y1, ...], pixel a whole number)`);
  const [wx, wy] = typeof o.wind === "number" ? [o.wind, 0] : o.wind ?? [0, 0], seed = o.seed ?? 1;
  const t = c.frames > 1 ? ((((o.frame ?? c.frame) % c.frames) + c.frames) % c.frames) / c.frames : 0;
  const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
  const ease = (a: number) => 1 - (1 - a) ** 2;
  // a billow's opacity by its age: thick, then thinner, then thin as it goes (in steps, not a fade)
  const level = (age: number) => (age < (1 - thin) * 0.5 ? 2 : age < 1 - thin ? 1 : 0);
  const erode = (age: number) => (thin > 0 ? Math.max(0, (age - (1 - thin)) / thin) : 0);
  const billows: Billow[] = [];
  for (let k = 0; k < N; k++) {
    const r = rng(hash(k, seed, 4271)), big = 1 + vary * (2 * r() - 1), jit = r(), ang = r() * Math.PI * 2, far = 0.6 + 0.4 * r();
    const wander = (age: number): [number, number] => [turb * (2 * vnoise(k * 3.1 + age * 2.5, seed) - 1), turb * (2 * vnoise(seed + 9.7, k * 3.1 + age * 2.5) - 1)];
    if (shape === "column") {
      const age = ((((t - k / N) % 1) + 1) % 1) / life;
      if (age >= 1) continue;
      const [px, py] = o.path ? along(o.path, ease(age)) : [0, -(o.rise ?? 36) * ease(age)], [ux, uy] = wander(age);
      billows.push({ x: px + wx * age + ux * age, y: py + wy * age + uy * age, r: lerp(s0, s1, age) * big, level: level(age), erode: erode(age), id: k });
    } else if (shape === "puff" || shape === "ring") {
      const age = t / life;
      if (age >= 1) continue;
      const flat = o.flat ?? (shape === "ring" ? 0.4 : 0.8), spread = o.spread ?? 16, [ux, uy] = wander(age);
      const th = shape === "ring" ? (2 * Math.PI * (k + 0.3 * jit)) / N + age * 0.6 : ang, d = spread * ease(age) * (shape === "ring" ? 1 : far);
      billows.push({ x: Math.cos(th) * d + wx * age + ux, y: Math.sin(th) * d * flat + wy * age + uy - (shape === "puff" ? spread * 0.25 * age : 0), r: lerp(s0, shape === "ring" ? s1 * 0.6 : s1, age) * big, level: level(age), erode: erode(age), id: k });
    } else {
      // a bank: billows along it, drifting (whole spacings a loop, so it closes), thin at both ends
      const L = o.length ?? 48, step = L / N, drift = Math.round(wx / step) * step, u = ((((k + 0.5) * step + drift * t) % L) + L) % L, ends = Math.min(u, L - u) / (L / 2);
      const [ux, uy] = wander(t * 2 + jit), swell = 0.5 + 0.5 * Math.sin(2 * Math.PI * (t + jit));
      billows.push({ x: u - L / 2 + ux, y: (jit - 0.5) * s1 * 0.8 + uy, r: lerp(s0, s1, swell) * big * (0.6 + 0.4 * Math.min(1, ends * 2)), level: ends > 0.45 ? 2 : ends > 0.2 ? 1 : 0, erode: ends < 0.2 ? 0.5 - ends * 2.5 : 0, id: k });
    }
  }
  if (!billows.length) return;
  // seen through the camera: each billow where it is in the world, as big as it is there
  if (M) for (const b of billows) { const [x, y, s] = M.place(b.x * K, b.y * K); b.x = x / K; b.y = y / K; b.r *= s; }
  // the art's pixels it covers: in each the billow it is deepest inside, lit by which way that one faces there
  const ll = Math.hypot(lx, ly, 0.7) || 1, Lx = lx / ll, Ly = ly / ll, Lz = 0.7 / ll;
  let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
  for (const b of billows) { bx0 = Math.min(bx0, b.x - b.r * 1.4); by0 = Math.min(by0, b.y - b.r * 1.4); bx1 = Math.max(bx1, b.x + b.r * 1.4); by1 = Math.max(by1, b.y + b.r * 1.4); }
  const X0 = x0 / K, Y0 = y0 / K;
  for (let ay = Math.floor(Y0 + by0); ay <= Math.ceil(Y0 + by1); ay++)
    for (let ax = Math.floor(X0 + bx0); ax <= Math.ceil(X0 + bx1); ax++) {
      let best: Billow | undefined, depth = 0, dx = 0, dy = 0;
      for (const b of billows) {
        const ex = (ax + 0.5 - X0 - b.x) / b.r, ey = (ay + 0.5 - Y0 - b.y) / b.r, rag = rough * (vnoise((ax + b.id * 7.3) * 0.45, ay * 0.45 + seed) - 0.5);
        const q = 1 - Math.hypot(ex, ey) + rag - b.erode * (0.4 + 0.6 * vnoise(ax * 0.7 + b.id, ay * 0.7));
        if (q > depth) { depth = q; best = b; dx = ex; dy = ey; }
      }
      if (!best) continue;
      const nz = Math.sqrt(Math.max(0, 1 - dx * dx - dy * dy)), l = dx * Lx + dy * Ly + nz * Lz;
      const key = ks[l > 0.55 ? 0 : l > 0.15 && dy < 0.45 ? 1 : 2]!, lv = Math.max(0, best.level - (depth < 0.12 ? 1 : 0)), a = alpha[lv];
      for (let j = 0; j < K; j++)
        for (let i = 0; i < K; i++) {
          const px = ax * K + i, py = ay * K + j, under = c.get(px, py);
          // over clear its opacity; over what is drawn, its tone, the thin ones in an ordered dither of their opacity
          if (under === TRANSPARENT) c.plot(px, py, ((key & ~255) | Math.round(a * 255)) >>> 0);
          else if (a >= 0.8 || bayer(ax, ay) < a) c.plot(px, py, key);
        }
    }
}
