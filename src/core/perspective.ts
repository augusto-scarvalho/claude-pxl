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
import { PxError } from "./errors.ts";

export interface View {
  /** The picture's width in px (the field of view spans it). */
  w: number;
  /** The horizon's row and the eye's height above the ground in meters. */
  horizon: number;
  eye: number;
  /** Field of view across the picture, in degrees (default 90), or the focal length in px instead. */
  fov?: number;
  focal?: number;
  /** The column the camera looks at (default the middle). */
  vp?: number;
  /** Degrees the camera is turned right of the world's z axis (default 0). */
  yaw?: number;
  /** Degrees the camera is tilted up, down if negative (default 0): three-point perspective. */
  pitch?: number;
}

export interface Perspective extends Required<Omit<View, "fov">> {
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
}

export function perspective(v: View): Perspective {
  const num = (k: keyof View) => v[k] === undefined || Number.isFinite(v[k]);
  if (!(v && Number.isFinite(v.w) && v.w > 0 && Number.isFinite(v.horizon) && v.eye > 0 && num("fov") && num("focal") && num("vp") && num("yaw") && num("pitch")))
    throw new PxError(`perspective: { w, horizon, eye } (width in px, the horizon's row, the eye's height in m), and fov (degrees) or focal (px), vp (the column looked at), yaw (degrees turned right), pitch (degrees tilted up); got ${JSON.stringify(v)}`);
  if (v.fov !== undefined && !(v.fov > 0 && v.fov < 180)) throw new PxError(`perspective: fov is the field of view across the picture, between 0 and 180 degrees, got ${v.fov}`);
  if (v.pitch !== undefined && !(Math.abs(v.pitch) < 90)) throw new PxError(`perspective: pitch is how far the camera tilts up (down if negative), between -90 and 90 degrees, got ${v.pitch}`);
  const focal = v.focal ?? v.w / 2 / Math.tan(((v.fov ?? 90) * Math.PI) / 360), vp = v.vp ?? v.w / 2, yaw = v.yaw ?? 0, pitch = v.pitch ?? 0, { horizon, eye, w } = v;
  const cos = Math.cos((yaw * Math.PI) / 180), sin = Math.sin((yaw * Math.PI) / 180);
  const cp = Math.cos((pitch * Math.PI) / 180), sp = Math.sin((pitch * Math.PI) / 180), cy = horizon - focal * (sp / cp);
  // a point into the camera's frame: across, up, and depth along the camera's axis
  const cam = (x: number, z: number, up: number) => {
    const h = x * sin + z * cos, du = up - eye;
    return [x * cos - z * sin, du * cp - h * sp, h * cp + du * sp];
  };
  return {
    w, horizon, eye, focal, vp, yaw, pitch,
    ground: (x, z, up = 0) => { const [xc, yc, zc] = cam(x, z, up); return [vp + (focal * xc) / zc, cy - (focal * yc) / zc]; },
    at: (col, row) => {
      if (row + 0.5 <= horizon) return null;
      // the ray through the pixel, level and down parts; it meets the ground eye m below
      const a = (col + 0.5 - vp) / focal, b = (cy - row - 0.5) / focal, h = cp - b * sp, t = eye / -(sp + b * cp), xc = a * t, zc = h * t;
      return [xc * cos + zc * sin, zc * cos - xc * sin];
    },
    scale: (z, x = 0, up = 0) => focal / cam(x, z, up)[2],
    vanish: (angle = 0) => vp + (focal * Math.tan(((angle - yaw) * Math.PI) / 180)) / cp,
    vertical: () => (pitch ? [vp, cy - (focal * cp) / sp] : null),
  };
}
