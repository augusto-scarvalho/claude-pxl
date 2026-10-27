// Perspective: a pinhole camera over flat ground, in meters. The eye stands `eye` m above the ground
// and looks along the horizon, turned `yaw` degrees to the right of the world's forward (z) axis, and
// tilted `pitch` degrees up (down if negative); the horizon is on row `horizon`, the camera looks at
// column `vp`. A point lands on (vp + f·xc/zc, cy − f·yc/zc), where (xc, yc, zc) is the point turned
// into the camera's frame, f, the focal length in px, comes from the field of view across the
// picture, and cy, the row the camera looks at, is the horizon's row moved up f·tan(pitch). Every set
// of parallel ground lines meets on the horizon: with yaw 0 the road's lines meet at vp (one-point
// perspective); turned, the world's x and z lines meet at two columns (two-point), see vanish().
// Tilted, uprights stop being upright on screen and meet too, at a third point straight above (or
// below) vp: three-point, see vertical(). Level, it is the same model as a scene's
// world { horizon, eye }, which sets px per meter by row, with the sideways half added.
// With a `bend`, the ground is a way that curves: its z lines bend to the right (left if negative),
// a point z m along it sitting bend·z²/2 m to the side, so ground(), at() and scale() take and give
// places on the way, and everything drawn through the camera follows the bend (plane, solids,
// shadows, mesh, terrain). Directions (toward, ray, vanish) don't bend: the far things stay put.
import { PxError } from "./errors.ts";

export interface View {
  /** The picture's width in px (the field of view spans it). */
  w: number;
  /** The horizon's row and the eye's height above the ground in meters. */
  horizon: number;
  eye: number;
  /**
   * A camera looking down at the picture's middle instead: `h` the picture's height (for `horizon`),
   * and `ppm` px to the meter where it looks (for `eye`; or give `eye`): HD-2D's camera.
   */
  h?: number;
  ppm?: number;
  /** Field of view across the picture, in degrees (default 90), or the focal length in px instead. */
  fov?: number;
  focal?: number;
  /** The column the camera looks at (default the middle). */
  vp?: number;
  /** Degrees the camera is turned right of the world's z axis (default 0). */
  yaw?: number;
  /** Degrees the camera is tilted up, down if negative (default 0): three-point perspective. */
  pitch?: number;
  /** The way's curvature (1/m): a point z m along sits bend·z²/2 m to the right (left if negative); default 0. */
  bend?: number;
}

export interface Perspective extends Required<Omit<View, "fov" | "h" | "ppm">> {
  /** its field of view, when given one (a picture k times as big keeps it) */
  fov?: number;
  /** the picture's height, when given one ({ w, h, pitch, ppm }): a scene's size is { w: cam.w, h: cam.h } */
  h?: number;
  /**
   * Looking down: the ground z m ahead where it looks, `dist` m from the eye along its axis (where
   * post() focuses), and the texels that lay a texture a texel to a pixel there, on a floor and on a wall.
   */
  z?: number;
  dist?: number;
  floor?: [number, number];
  wall?: [number, number];
  /** Looking down: where to stand a thing, [x, z, up], so its point `mid` m up is where the camera looks (`up`: lifted that much). */
  aim(mid: number, up?: number): [number, number, number];
  /** Where a point x m across, z m ahead and up m above the ground lands on screen (not rounded). */
  ground(x: number, z: number, up?: number): [number, number];
  /** The ground point [x, z] seen through a pixel's center; null at the horizon and above. */
  at(col: number, row: number): [number, number] | null;
  /** px per meter at a point z m ahead (and x m across, which matters once turned; up m high, once tilted). */
  scale(z: number, x?: number, up?: number): number;
  /** The column where ground lines heading `angle` degrees right of z meet (0: z lines, 90: x lines). */
  vanish(angle?: number): number;
  /** Where uprights meet, [col, row]: above the picture tilted up, below tilted down; null when level. */
  vertical(): [number, number] | null;
  /** The way a pixel's middle looks, as a unit [x, z, up] in the world (sky by direction, marching a ray). */
  ray(col: number, row: number): [number, number, number];
  /** Where a direction [x, z, up] lands on screen, [col, row]: the sun, or where lines going that way meet; null behind the eye. */
  toward(dir: [number, number, number]): [number, number] | null;
}

export function perspective(v: View): Perspective {
  const rad = Math.PI / 180;
  // looking down at the picture's middle: the horizon from the picture's height, the eye from px to
  // the meter there (`dist` m from it along the axis)
  let dist: number | undefined, ppm: number | undefined;
  if (v && v.horizon === undefined && v.h !== undefined) {
    const p = v.pitch ?? 0, f = v.focal ?? v.w / 2 / Math.tan(((v.fov ?? 90) / 2) * rad);
    if (!(Number.isFinite(v.h) && p < 0 && f > 0 && (v.ppm === undefined ? v.eye > 0 : v.ppm > 0 && v.eye === undefined)))
      throw new PxError(`perspective: a camera looking at the picture's middle is { w, h, pitch, fov, ppm }: the picture's size, degrees tilted down (below 0), across, and px to the meter where it looks (or eye, its height in m, instead of ppm); got ${JSON.stringify(v)}`);
    ppm = v.ppm;
    dist = ppm !== undefined ? f / ppm : v.eye / Math.sin(-p * rad);
    v = { ...v, horizon: v.h / 2 + f * Math.tan(p * rad), eye: ppm !== undefined ? dist * Math.sin(-p * rad) : v.eye };
  }
  const num = (k: keyof View) => v[k] === undefined || Number.isFinite(v[k]);
  if (!(v && Number.isFinite(v.w) && v.w > 0 && Number.isFinite(v.horizon) && v.eye > 0 && num("fov") && num("focal") && num("vp") && num("yaw") && num("pitch") && num("bend")))
    throw new PxError(`perspective: { w, horizon, eye } (width in px, the horizon's row, the eye's height in m; or { w, h, pitch, ppm }, looking down at the picture's middle), and fov (degrees) or focal (px), vp (the column looked at), yaw (degrees turned right), pitch (degrees tilted up), bend (the way's curvature, 1/m); got ${JSON.stringify(v)}`);
  if (v.fov !== undefined && !(v.fov > 0 && v.fov < 180)) throw new PxError(`perspective: fov is the field of view across the picture, between 0 and 180 degrees, got ${v.fov}`);
  if (v.pitch !== undefined && !(Math.abs(v.pitch) < 90)) throw new PxError(`perspective: pitch is how far the camera tilts up (down if negative), between -90 and 90 degrees, got ${v.pitch}`);
  const focal = v.focal ?? v.w / 2 / Math.tan(((v.fov ?? 90) * Math.PI) / 360), vp = v.vp ?? v.w / 2, yaw = v.yaw ?? 0, pitch = v.pitch ?? 0, bend = v.bend ?? 0, { horizon, eye, w } = v;
  const cos = Math.cos((yaw * Math.PI) / 180), sin = Math.sin((yaw * Math.PI) / 180);
  const cp = Math.cos((pitch * Math.PI) / 180), sp = Math.sin((pitch * Math.PI) / 180), cy = horizon - focal * (sp / cp);
  // a point into the camera's frame: across, up, and depth along the camera's axis (a place on a
  // bending way first moved to where the bend puts it)
  const cam = (x: number, z: number, up: number) => {
    if (bend) x = x + (bend * z * z) / 2;
    const h = x * sin + z * cos, du = up - eye;
    return [x * cos - z * sin, du * cp - h * sp, h * cp + du * sp];
  };
  // looking down: where it looks, and the texels a texel to a pixel there (on a floor, on a wall)
  const down = -pitch * rad, d = dist ?? eye / Math.sin(down), k = ppm ?? focal / d, z = d * Math.cos(down);
  const look = pitch < 0 ? { z, dist: d, floor: [1 / k, 1 / (k * Math.sin(down))] as [number, number], wall: [1 / k, 1 / (k * Math.cos(down))] as [number, number] } : {};
  return {
    w, horizon, eye, focal, vp, yaw, pitch, bend, ...(v.fov !== undefined && v.focal === undefined ? { fov: v.fov } : {}), ...(v.h !== undefined ? { h: v.h } : {}), ...look,
    aim: (mid, up = 0) => {
      if (!(pitch < 0) || !Number.isFinite(mid) || !Number.isFinite(up)) throw new PxError(`perspective: aim(mid, up) is for a camera looking down (pitch below 0), mid and up in m, got ${JSON.stringify([mid, up])} with pitch ${pitch}`);
      const a = z - mid / Math.tan(down);
      return [yaw ? a * sin : 0, yaw ? a * cos : a, up];
    },
    ground: (x, z, up = 0) => { const [xc, yc, zc] = cam(x, z, up); return [vp + (focal * xc) / zc, cy - (focal * yc) / zc]; },
    at: (col, row) => {
      if (row + 0.5 <= horizon) return null;
      // the ray through the pixel, level and down parts; it meets the ground eye m below
      const a = (col + 0.5 - vp) / focal, b = (cy - row - 0.5) / focal, h = cp - b * sp, t = eye / -(sp + b * cp), xc = a * t, zc = h * t;
      const gx = xc * cos + zc * sin, gz = zc * cos - xc * sin;
      return [bend ? gx - (bend * gz * gz) / 2 : gx, gz];
    },
    scale: (z, x = 0, up = 0) => focal / cam(x, z, up)[2],
    vanish: (angle = 0) => vp + (focal * Math.tan(((angle - yaw) * Math.PI) / 180)) / cp,
    vertical: () => (pitch ? [vp, cy - (focal * cp) / sp] : null),
    ray: (col, row) => {
      const a = (col + 0.5 - vp) / focal, b = (cy - row - 0.5) / focal, h = cp - b * sp, u = sp + b * cp, l = Math.hypot(a, h, u);
      return [(a * cos + h * sin) / l, (h * cos - a * sin) / l, u / l];
    },
    toward: ([x, z, up]) => {
      const h = x * sin + z * cos, zc = h * cp + up * sp;
      return zc > 1e-12 ? [vp + (focal * (x * cos - z * sin)) / zc, cy - (focal * (up * cp - h * sp)) / zc] : null;
    },
  };
}

/** The same camera for a picture k times as big (a scene's `pixel: k`): its px k times; one given its fov keeps it, the focal length following the width. */
export function scaled<T>(view: T, k: number): T {
  const v = view as unknown as Partial<Perspective>;
  if (k === 1 || !v || typeof v !== "object" || !("horizon" in v)) return view;
  return { ...v, horizon: v.horizon! * k, ...(v.w !== undefined ? { w: v.w * k } : {}), ...(v.h !== undefined ? { h: v.h * k } : {}), ...(v.vp !== undefined ? { vp: v.vp * k } : {}), ...(v.focal !== undefined ? { focal: v.fov !== undefined ? undefined : v.focal * k } : {}) } as T;
}
