// Snow or rain in the air a perspective() camera looks through. The drops live in meters, in a box of air laid again
// and again in every direction round the eye (each drop placed by the seed), and are seen through the view without its
// bend (the air does not follow the road): a near one bigger and streaked by how it moves on the picture over a frame,
// a mid one a px, past `veil` m fewer and in the far key. They move by their fall, a wind over the ground and the
// camera's travel along its way, all in the world: turned into the camera by its heading, so a turn swings them across
// with the far things and slants the wind. Over the loop each axis of the world comes round a whole number of boxes:
// the box is stretched to the nearest length the motion holds a whole number of times (a motion under a quarter of a box
// is taken back to none), and the op gives back what it used. Where mesh() left a depth, a drop farther than what is
// drawn at its pixel is not drawn.
import { type Color, TRANSPARENT } from "./color.ts";
import { PxError } from "./errors.ts";
import { type View, perspective } from "./perspective.ts";
import { colorList, hash } from "./util.ts";

export interface WeatherOpts {
  /** "snow" (slow, swaying, short streaks) or "rain" (fast, long thin streaks): the defaults of the rest */
  kind?: "snow" | "rain";
  /** two or three keys, near to far: a near drop's, a mid one's (the near's with two), the veil's */
  keys: string | string[];
  /** drops a cubic meter (snow 0.12, rain 0.08) */
  density?: number;
  /** m across a drop (snow 0.05, rain 0.02): px where it is, so the near ones larger */
  size?: number;
  /** m/s it falls (snow 1.2, rain 7) */
  fall?: number;
  /** m/s the air goes over the ground, [across, along] the world at heading 0 (default [0, 0]) */
  wind?: [number, number];
  /** m/s the camera goes forward along its way (default 0) */
  speed?: number;
  /** radians the camera is turned right (road()'s heading), or a function of the frame giving it (a turning camera) */
  heading?: number | ((frame: number) => number);
  /** the box of air, [across, along, up] m (snow [8, 8, 4], rain [8, 8, 8]): stretched so the loop closes */
  box?: [number, number, number];
  /** m from the eye along its view, the nearest drawn (0.8) and the farthest (snow 50, rain 40); past veil (far / 2) fewer */
  near?: number;
  far?: number;
  veil?: number;
  /** px a streak is at most (snow 3, rain 10) */
  streak?: number;
  seed?: number;
  frame?: number;
}

/** What weather() used: the box, how many boxes each axis went round in the loop, the fall and wind after that, the drops drawn and hidden. */
export interface WeatherUsed { box: [number, number, number]; boxes: [number, number, number]; fall: number; wind: [number, number]; drawn: number; hidden: number }

/** What weather draws on: canvas coords, its clip respected; `depth` mesh()'s, by image pixel. */
export interface WeatherCanvas {
  frame: number;
  frames: number;
  t: number;
  loop: number;
  k: number;
  ox: number;
  oy: number;
  img: { w: number; h: number; depth?: Float32Array };
  color(k: unknown): Color | null;
  index(x: number, y: number): number;
  plot(x: number, y: number, c: Color): boolean;
}

const KINDS = {
  snow: { density: 0.12, size: 0.05, fall: 1.2, box: [8, 8, 4], far: 50, streak: 3, sway: 0.3 },
  rain: { density: 0.08, size: 0.02, fall: 7, box: [8, 8, 8], far: 40, streak: 10, sway: 0 },
};
export const WEATHER_OPTS = ["kind", "keys", "density", "size", "fall", "wind", "speed", "heading", "box", "near", "far", "veil", "streak", "seed", "frame"];

/** Each axis's motion over the loop E in whole boxes near B0 long: [boxes, the box, the motion added to close (none unless it was under a quarter box)]. */
const fit = (E: number, B0: number): [number, number, number] => {
  let n = Math.round(E / B0);
  if (!n && Math.abs(E) >= B0 / 4) n = Math.sign(E);
  return n ? [n, E / n, 0] : [0, B0, -E];
};

export function drawWeather(c: WeatherCanvas, view: View, o: WeatherOpts): WeatherUsed {
  if (!view || typeof view !== "object" || !("horizon" in view)) throw new PxError(`weather: view is a perspective() camera (mesh()'s: { w, horizon, eye, ... }), got ${JSON.stringify(view)}`);
  const kind = o?.kind ?? "snow", K = KINDS[kind as keyof typeof KINDS];
  if (!K) throw new PxError(`weather: kind is "snow" or "rain", got ${JSON.stringify(o.kind)}`);
  const keys = colorList(o.keys ?? "").map((k) => c.color(k));
  if (!(keys.length === 2 || keys.length === 3) || keys.some((k) => k === null || k === TRANSPARENT)) throw new PxError(`weather: keys are two or three, near to far ("xWv": a near drop's, a mid one's, the veil's), got ${JSON.stringify(o.keys)}`);
  const { density = K.density, size = K.size, fall = K.fall, wind = [0, 0], speed = 0, box = K.box as [number, number, number], near = 0.8, far = K.far, streak = K.streak, seed = 1 } = o, veil = o.veil ?? far / 2;
  const num = (v: unknown, lo = 0) => typeof v === "number" && Number.isFinite(v) && v >= lo;
  if (!(num(density) && num(size) && num(fall) && Number.isFinite(speed) && num(near, 0.05) && far > near && num(veil) && num(streak, 1) && Array.isArray(wind) && wind.length === 2 && wind.every(Number.isFinite)
    && Array.isArray(box) && box.length === 3 && box.every((v) => num(v, 0.5)) && (o.heading === undefined || typeof o.heading === "function" || Number.isFinite(o.heading))))
    throw new PxError(`weather: options out of range, got ${JSON.stringify(o)} (density drops a m³, size m, fall m/s, all 0 or more; wind [across, along] m/s; speed m/s; heading radians or (frame) => radians; box [across, along, up] m, each from 0.5; near from 0.05 below far, m; streak px from 1)`);
  // in the art's pixel, without the bend: a picture k times as big draws each of its px k x k
  const k = c.k || 1, P = perspective({ ...view, w: view.w ?? c.img.w / k, bend: 0, bendFrom: undefined });
  const D = c.img.depth, head = typeof o.heading === "function" ? o.heading : () => (o.heading as number | undefined) ?? 0;
  // the clock: on a loop, the motion summed frame by frame (the heading may turn) and each axis closed in whole boxes; else plain motion by the time
  const F = c.frames, T = c.loop / 1000, looped = F > 1 && T > 0, f = looped ? ((((o.frame ?? c.frame) % F) + F) % F) : o.frame ?? c.frame, dt = looped ? T / F : 1 / 16;
  const vel = (g: number) => { const h = head(g); return [wind[0] - speed * Math.sin(h), wind[1] - speed * Math.cos(h)]; };
  let at: (g: number) => [number, number, number], B = box as [number, number, number], boxes: [number, number, number] = [0, 0, 0], add = [0, 0, 0];
  if (looped) {
    const sx = [0], sz = [0];
    for (let g = 0; g < F; g++) { const [vx, vz] = vel(g); sx.push(sx[g] + vx * dt); sz.push(sz[g] + vz * dt); }
    const fx = fit(sx[F], box[0]), fz = fit(sz[F], box[1]), fy = fit(-fall * T, box[2]);
    B = [fx[1], fz[1], fy[1]]; boxes = [fx[0], fz[0], fy[0]]; add = [fx[2], fz[2], fy[2]];
    at = (g) => [sx[g] + (add[0] * g) / F, sz[g] + (add[1] * g) / F, (-fall * T + add[2]) * (g / F)];
  } else {
    const t = c.t / 1000, [vx, vz] = vel(f);
    at = (g) => [vx * (t + (g - f) * dt), vz * (t + (g - f) * dt), -fall * (t + (g - f) * dt)];
  }
  const g0 = looped && f === 0 ? F : f, now = at(g0), was = at(g0 - 1), h1 = head(g0), phase = looped ? f / F : c.t / 1000;
  // as high as the picture's top row looks at `far` m; as far round the eye as its corners do
  const r = P.ray(P.vp, -c.oy / k), top = P.eye + far * Math.max(0.2, r[2] / Math.hypot(r[0], r[1]));
  const [Bx, Bz, By] = B, n = Math.round(density * Bx * Bz * By), R = (far * Math.hypot(Math.max(P.vp + c.ox / k, (c.img.w - c.ox) / k - P.vp), Math.max(P.horizon + c.oy / k, (c.img.h - c.oy) / k - P.horizon), P.focal)) / P.focal;
  const yaw = (P.yaw * Math.PI) / 180, cp = Math.cos((P.pitch * Math.PI) / 180), sp = Math.sin((P.pitch * Math.PI) / 180), lo = Math.min(-P.eye * sp, (top - P.eye) * sp), hi = Math.max(-P.eye * sp, (top - P.eye) * sp);
  const turn = (x: number, z: number, h: number): [number, number] => [x * Math.cos(h) - z * Math.sin(h), x * Math.sin(h) + z * Math.cos(h)];
  const X0 = -c.ox / k - streak, X1 = (c.img.w - c.ox) / k + streak, Y0 = -c.oy / k - streak, Y1 = (c.img.h - c.oy) / k + streak, wrap = (v: number, m: number) => (m ? ((v % m) + m) % m : v);
  const put = (x: number, y: number, col: Color, zc: number) => {
    const X = Math.floor(x), Y = Math.floor(y);
    for (let j = 0; j < k; j++) for (let i = 0; i < k; i++) {
      const p = c.index(X * k + i, Y * k + j);
      if (p >= 0 && !(D && D[p] < zc)) c.plot(X * k + i, Y * k + j, col);
    }
  };
  const used: WeatherUsed = { box: B.map((v) => +v.toFixed(3)) as [number, number, number], boxes, fall: +(fall - add[2] / (T || 1)).toFixed(3), wind: [+(wind[0] + add[0] / (T || 1)).toFixed(3), +(wind[1] + add[1] / (T || 1)).toFixed(3)], drawn: 0, hidden: 0 };
  const u = (a: number, b: number, s: number) => hash(a, b, s) / 4294967296;
  for (let d = 0; d < n; d++) {
    // the drop's place in its box now and a frame ago (a snowflake swaying a whole number of times a loop)
    const sw = K.sway ? K.sway * (0.5 + u(d, 4, seed)) : 0, cyc = looped ? Math.max(1, Math.round((T / 2.5) * (0.7 + 0.6 * u(d, 5, seed)))) : (0.7 + 0.6 * u(d, 5, seed)) / 2.5;
    const swayAt = (p: number) => sw * Math.sin(2 * Math.PI * (cyc * p + u(d, 6, seed)));
    const qx = Bx * u(d, 1, seed) + now[0] + swayAt(phase), qz = Bz * u(d, 2, seed) + now[1], qy = By * u(d, 3, seed) + now[2];
    const mx = qx - (now[0] - was[0]) - (swayAt(phase) - swayAt(phase - (looped ? 1 / F : dt))), mz = qz - (now[1] - was[1]), my = qy - (now[2] - was[2]);
    const cx = Math.floor(qx / Bx), cz = Math.floor(qz / Bz), cy = Math.floor(qy / By), x0 = qx - cx * Bx, z0 = qz - cz * Bz, y0 = qy - cy * By;
    const big = 0.7 + 0.6 * u(d, 7, seed);
    for (let i = Math.floor(-R / Bx); i <= Math.ceil(R / Bx); i++) for (let j = Math.floor(-R / Bz); j <= Math.ceil(R / Bz); j++) {
      const ax = x0 + i * Bx, az = z0 + j * Bz;
      if (ax * ax + az * az > R * R) continue;
      // a column of copies wholly behind the eye, past far or off the picture's sides at every height: none of it
      const [xc, zw] = turn(ax, az, h1), fw = xc * Math.sin(yaw) + zw * Math.cos(yaw), side = xc * Math.cos(yaw) - zw * Math.sin(yaw), zmax = Math.min(far, fw * cp + hi);
      if (zmax < near || fw * cp + lo > far || P.vp + (P.focal * side) / zmax > X1 || P.vp + (P.focal * side) / zmax < X0) continue;
      for (let m = 0; m * By + y0 < top; m++) {
        const ay = y0 + m * By, s = P.scale(zw, xc, ay), zc = P.focal / s;
        if (!(s > 0) || zc < near || zc > far) continue;
        // past the veil fewer, each kept or not by its own cell (round the loop's boxes, so the seam holds)
        if (zc > veil && u(d * 7919 + wrap(cx - i, boxes[0]), wrap(cz - j, boxes[1]) * 131 + wrap(cy - m, boxes[2]), seed + 11) > (veil / zc) ** 2) continue;
        const [x1, y1] = P.ground(xc, zw, ay);
        if (x1 < X0 || x1 > X1 || y1 < Y0 || y1 > Y1) continue;
        // where it was a frame ago, the same drop moved back (the camera's turn left out: nothing else blurs as it pans): its streak, `streak` px at most
        const [px, pz] = turn(ax - qx + mx, az - qz + mz, h1), pu = ay - qy + my, ps = P.scale(pz, px, pu);
        let [x2, y2] = ps > 0 && P.focal / ps > 0.05 ? P.ground(px, pz, pu) : [x1, y1];
        const L = Math.hypot(x2 - x1, y2 - y1), cut = L > streak ? streak / L : 1, rad = (size * big * s) / 2;
        x2 = x1 + (x2 - x1) * cut; y2 = y1 + (y2 - y1) * cut;
        const p = c.index(Math.floor(x1) * k, Math.floor(y1) * k);
        if (D && p >= 0 && D[p] < zc) { used.hidden++; continue; }
        used.drawn++;
        // near (a px across or more): the near key, a streak from where it was to where it is, as wide as the drop (1 to 3 px);
        // farther a px in the mid key, past the veil in the far one, a raindrop still its streak, a snowflake a dot
        const col = (rad >= 0.5 ? keys[0] : zc > veil ? keys[keys.length - 1] : keys[keys.length === 3 ? 1 : 0])!, w = Math.max(1, Math.min(3, Math.round(2 * rad)));
        const steps = rad >= 0.5 || kind === "rain" ? Math.ceil(Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1))) : 0;
        for (let q = 0; q <= steps; q++) {
          const x = x1 + ((x2 - x1) * q) / (steps || 1), y = y1 + ((y2 - y1) * q) / (steps || 1);
          put(x, y, col, zc);
          if (w > 1) { put(x + 1, y, col, zc); put(x, y + 1, col, zc); }
          if (w > 2) { put(x - 1, y, col, zc); put(x, y - 1, col, zc); }
        }
      }
    }
  }
  return used;
}
