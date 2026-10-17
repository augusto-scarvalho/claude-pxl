// Hair, tails, scarves and ropes that follow a moving anchor with lag (Celeste-style hair): a chain
// of points fixed at an anchor, each following the one before. Two ways to follow:
// - default, physical: inertia, weight and a rest shape the links turn back toward (they swing);
// - `follow`, as Celeste does it: each point moves a fraction of the way to where it should sit
//   (the point before plus a fixed `step`) and never drifts more than `max` from it; no inertia,
//   so it trails behind and settles without bouncing.
// Simulated over an anim's loop until the motion repeats, so the loop is seamless.
import { PxError } from "./errors.ts";

export interface ChainOpts {
  /** Points after the anchor (default 5). */
  links?: number;
  /** Distance between points, px (default 2). */
  length?: number;
  /** Pull per frame on every point, [x, y] px (default [0, 0.5]: down). */
  gravity?: [number, number];
  /** How much speed a point keeps per step, 0..1 (default 0.8; lower = heavier, calmer). */
  drag?: number;
  /** The direction the chain rests in when nothing moves, [x, y] (default [0, 1]: hanging down). */
  rest?: [number, number];
  /** How strongly each link turns back toward `rest`, 0..1 per step (default 0.15; stiffer hair). */
  stiff?: number;
  /**
   * Celeste-style following: each frame a point covers 1/follow of the way to its place (1.5 in
   * Celeste Classic; higher = lazier). Uses `step` and `max`, not gravity / drag / stiff.
   */
  follow?: number;
  /** With follow: where a point sits from the one before at rest, [x, y] (default rest * length). */
  step?: [number, number];
  /** With follow: the farthest a point may trail from the one before (default 1.5 * length). */
  max?: number;
  /** The character's travel per frame in the world, [x, y]: walking left makes the chain trail right. */
  move?: [number, number];
  /** Simulation steps per frame (default 4). */
  steps?: number;
  /** Loops simulated before the one returned (default 24). */
  loops?: number;
}

type P = [number, number];

/**
 * Points of a chain for each frame of a loop: frames[f] = [anchor, p1, ..., pN] (floats, in the
 * anchors' coordinates). `anchors[f]` is where the chain is fixed in frame f.
 */
export function chain(anchors: P[], opts: ChainOpts = {}): P[][] {
  if (!Array.isArray(anchors) || !anchors.length || !anchors.every((a) => Array.isArray(a) && a.length === 2 && a.every(Number.isFinite)))
    throw new PxError("chain(anchors, opts): anchors must be one [x, y] per frame");
  const n = Math.max(1, Math.floor(opts.links ?? 5)), len = opts.length ?? 2, steps = Math.max(1, Math.floor(opts.steps ?? 4));
  const [gx, gy] = opts.gravity ?? [0, 0.5], drag = opts.drag ?? 0.8, stiff = opts.stiff ?? 0.15, [mx, my] = opts.move ?? [0, 0];
  const [rx0, ry0] = opts.rest ?? [0, 1], rl = Math.hypot(rx0, ry0) || 1, rx = rx0 / rl, ry = ry0 / rl;
  const loops = Math.max(1, Math.floor(opts.loops ?? 24)), F = anchors.length;
  const follow = opts.follow, [sx, sy] = opts.step ?? [rx * len, ry * len], max = opts.max ?? len * 1.5;
  if (![len, drag, stiff, gx, gy, mx, my, sx, sy, max].every(Number.isFinite) || len <= 0) throw new PxError(`chain: options must be numbers, length > 0, got ${JSON.stringify(opts)}`);
  if (follow !== undefined && !(follow >= 1)) throw new PxError(`chain: follow must be 1 or more (1.5 is Celeste's), got ${follow}`);
  // world position of the anchor at time t (frames, fractional): the sprite's anchor plus the travel
  const at = (t: number): P => {
    const f = Math.floor(t), u = t - f, a = anchors[((f % F) + F) % F], b = anchors[(((f + 1) % F) + F) % F];
    return [a[0] + (b[0] - a[0]) * u + mx * t, a[1] + (b[1] - a[1]) * u + my * t];
  };
  const a0 = at(0);
  let pts: P[] = Array.from({ length: n + 1 }, (_, i) => [a0[0] + rx * len * i, a0[1] + ry * len * i]);
  let prev: P[] = pts.map((p) => [...p] as P);
  const out: P[][] = [];
  const g = [gx / (steps * steps), gy / (steps * steps)];
  // follow: a frame's 1/follow of the way, spread over the steps
  const rate = follow === undefined ? 0 : 1 - Math.pow(1 - 1 / follow, 1 / steps);
  for (let loop = 0; loop <= loops; loop++)
    for (let f = 0; f < F; f++) {
      const t0 = loop * F + f;
      if (loop === loops) out.push(pts.map(([x, y]) => [x - mx * t0, y - my * t0] as P));
      for (let s = 1; s <= steps; s++) {
        const a = at(t0 + s / steps);
        if (follow !== undefined) {
          const next: P[] = [a];
          for (let i = 1; i <= n; i++) {
            const [px, py] = next[i - 1], tx = px + sx, ty = py + sy;
            let x = pts[i][0] + (tx - pts[i][0]) * rate, y = pts[i][1] + (ty - pts[i][1]) * rate;
            const d = Math.hypot(x - px, y - py);
            if (d > max) { x = px + ((x - px) / d) * max; y = py + ((y - py) / d) * max; }
            next.push([x, y]);
          }
          pts = next;
          continue;
        }
        const next: P[] = pts.map(([x, y], i) => (i === 0 ? a : [x + (x - prev[i][0]) * drag + g[0], y + (y - prev[i][1]) * drag + g[1]]));
        prev = pts;
        // keep each link its length, then let it turn a little toward its rest direction
        for (let i = 1; i <= n; i++) {
          const [px, py] = next[i - 1];
          let dx = next[i][0] - px, dy = next[i][1] - py;
          const d = Math.hypot(dx, dy) || 1;
          dx /= d; dy /= d;
          dx += (rx - dx) * stiff; dy += (ry - dy) * stiff;
          const k = Math.hypot(dx, dy) || 1;
          next[i] = [px + (dx / k) * len, py + (dy / k) * len];
        }
        pts = next;
      }
    }
  return out;
}
