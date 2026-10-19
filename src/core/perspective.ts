// Perspective: a level pinhole camera over flat ground, in meters. The eye stands `eye` m above the
// ground and looks along the horizon, turned `yaw` degrees to the right of the world's forward (z)
// axis; the horizon is on row `horizon`, the camera looks at column `vp`. A ground point lands on
// (vp + f·xc/zc, horizon + f·eye/zc), where (xc, zc) is the point turned into the camera's frame and f,
// the focal length in px, comes from the field of view across the picture. Every set of parallel
// ground lines meets on the horizon: with yaw 0 the road's lines meet at vp (one-point perspective);
// turned, the world's x and z lines meet at two columns (two-point), see vanish(). It is the same
// model as a scene's world { horizon, eye }, which sets px per meter by row, with the sideways half added.
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
}

export interface Perspective extends Required<Omit<View, "fov">> {
  /** Where a point x m across, z m ahead and up m above the ground lands on screen (not rounded). */
  ground(x: number, z: number, up?: number): [number, number];
  /** The ground point [x, z] seen through a pixel's center; null at the horizon and above. */
  at(col: number, row: number): [number, number] | null;
  /** px per meter at a point z m ahead (and x m across, which matters once turned). */
  scale(z: number, x?: number): number;
  /** The column where ground lines heading `angle` degrees right of z meet (0: z lines, 90: x lines). */
  vanish(angle?: number): number;
}

export function perspective(v: View): Perspective {
  const num = (k: keyof View) => v[k] === undefined || Number.isFinite(v[k]);
  if (!(v && Number.isFinite(v.w) && v.w > 0 && Number.isFinite(v.horizon) && v.eye > 0 && num("fov") && num("focal") && num("vp") && num("yaw")))
    throw new PxError(`perspective: { w, horizon, eye } (width in px, the horizon's row, the eye's height in m), and fov (degrees) or focal (px), vp (the column looked at), yaw (degrees turned right); got ${JSON.stringify(v)}`);
  if (v.fov !== undefined && !(v.fov > 0 && v.fov < 180)) throw new PxError(`perspective: fov is the field of view across the picture, between 0 and 180 degrees, got ${v.fov}`);
  const focal = v.focal ?? v.w / 2 / Math.tan(((v.fov ?? 90) * Math.PI) / 360), vp = v.vp ?? v.w / 2, yaw = v.yaw ?? 0, { horizon, eye, w } = v;
  const cos = Math.cos((yaw * Math.PI) / 180), sin = Math.sin((yaw * Math.PI) / 180);
  const ahead = (x: number, z: number) => x * sin + z * cos; // depth along the camera's axis
  return {
    w, horizon, eye, focal, vp, yaw,
    ground: (x, z, up = 0) => { const zc = ahead(x, z); return [vp + (focal * (x * cos - z * sin)) / zc, horizon + (focal * (eye - up)) / zc]; },
    at: (col, row) => {
      if (row + 0.5 <= horizon) return null;
      const zc = (focal * eye) / (row + 0.5 - horizon), xc = ((col + 0.5 - vp) * zc) / focal;
      return [xc * cos + zc * sin, zc * cos - xc * sin];
    },
    scale: (z, x = 0) => focal / ahead(x, z),
    vanish: (angle = 0) => vp + focal * Math.tan(((angle - yaw) * Math.PI) / 180),
  };
}
