// Decals: hand-drawn pixel art (a face, eyes, a rune, an emblem, a sign, windows and a door) pinned to a
// field's surface, so it goes where the form goes, in any camera, and stays crisp. The anchor: a point
// on the field (in its own frame: carried by its moves, then put back on the surface), an up, a size.
// `pin` (small details): drawn square to the picture at the anchor's point, a texel to a pixel (or to
// a K x K block), clipped by the surface (only where the picture shows that surface there: hidden behind
// what is nearer, cut at its silhouette, gone when the anchor turns away), its tones stepped along the
// palette's ramps by the light there, or unlit (a glowing rune). `wrap` (big emblems, bands): its texels
// laid on the surface along its tangents, each a little quad put back on the surface and filled where
// it lands, so it follows the curve and the foreshortening with no holes. Views, as the traveler's
// heads: a grid for the front, three quarters and the profile (drawn looking to the picture's right,
// mirrored for the left), picked by the angle between the anchor's normal and the eye. An anim decal
// plays on the clock (a blink).
import type { Color } from "./color.ts";
import { PxError } from "./errors.ts";
import type { Img } from "./image.ts";
import { peel } from "./scatter.ts";
import { STILL, Sdf, type V3, compile } from "./sdf.ts";
import { type SurfaceCanvas, type SurfaceView, clockOf, partIndex, viewOf } from "./surface.ts";

export interface DecalOpts {
  /** the field it lies on */
  on?: unknown;
  /** where, [x, y, z] in the field's own frame (put back on its surface) */
  point?: number[];
  /** its up on the surface, [x, y, z] (default the world's up) */
  up?: number[];
  /** "pin" (default: square to the picture, a texel to a pixel) or "wrap" (laid on the surface) */
  mode?: "pin" | "wrap";
  /** m across: wrap's width (default a texel to 1/16 m); pin's, texels grown by a whole number to it */
  size?: number;
  /** other views' assets: three quarters and the profile, drawn looking to the picture's right */
  views?: { three?: string; profile?: string };
  /** pin: how far (m) what is drawn under a texel may lie in front of or behind its point and still take it (default its own width: a lock of hair a little nearer, a surface seen edge on) */
  depth?: number;
  /** its tones stepped by the light there (default true); false: drawn as it is, glowing */
  lit?: boolean;
  view?: SurfaceView; ppm?: number; at?: number[]; pixel?: number; light?: number[];
  /** the name of the part it is (pxl steps --at; default "decal <name>") */
  part?: string;
  /** none of it where the surface under it turns edge on to the eye (an eye's pixel on the silhouette of a face turned away), and lit, never darkened into a ramp's darkest (the outline's ink) */
  clean?: boolean;
}
export const DECAL_OPTS = ["on", "point", "up", "mode", "size", "views", "depth", "lit", "view", "ppm", "at", "pixel", "light", "part", "clean"];
/** clean: how far toward the eye the surface under a texel must face (the normal's share along the view) */
const EDGE = 0.3;
interface DecalCanvas extends SurfaceCanvas { asset(name: string): Img }

const dot = (a: readonly number[], b: readonly number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = (v: readonly number[]): V3 => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/** Draw a decal on the canvas (see the top of this file), after the surface it lies on. */
export function drawDecal(c: DecalCanvas, name: string, o: DecalOpts = {}): void {
  const who = `decal '${name}'`;
  if (!(o.on instanceof Sdf)) throw new PxError(`${who}: on is the distance field it lies on (drawn by surface() before it)`);
  if (!(Array.isArray(o.point) && o.point.length === 3 && o.point.every(Number.isFinite))) throw new PxError(`${who}: point is where it lies, [x, y, z] in the field's own frame, got ${JSON.stringify(o.point)}`);
  const mode = o.mode ?? "pin", K = o.pixel ?? c.k ?? 1, lit = o.lit !== false;
  if (mode !== "pin" && mode !== "wrap") throw new PxError(`${who}: mode is "pin" or "wrap", got ${JSON.stringify(o.mode)}`);
  if (o.size !== undefined && !(o.size > 0)) throw new PxError(`${who}: size is m across, above 0, got ${JSON.stringify(o.size)}`);
  if (o.depth !== undefined && !(o.depth > 0)) throw new PxError(`${who}: depth is m in front of or behind its point it may be laid on, above 0, got ${JSON.stringify(o.depth)}`);
  const persp = !!o.view && typeof o.view === "object" && "horizon" in o.view, origin = !persp && o.view && typeof o.view === "object" ? (o.view as { origin?: unknown }).origin : undefined;
  const clock = clockOf(c), C = compile(o.on, clock), d = C.d;
  // the anchor: a point of the field as it stands at rest, carried by its moves to this moment, put back
  // on its surface; its normal there
  const { carry, back } = peel(o.on);
  let p = carry(clock)(back(STILL)(o.point as V3));
  const h = 0.005, grad = (q: V3): V3 => {
    const a = d(q[0] + h, q[1] - h, q[2] - h), b = d(q[0] - h, q[1] - h, q[2] + h), cc = d(q[0] - h, q[1] + h, q[2] - h), e = d(q[0] + h, q[1] + h, q[2] + h);
    return unit([a - b - cc + e, -a - b + cc + e, -a + b - cc + e]);
  };
  const onto = (q: V3): V3 => { for (let it = 0; it < 3; it++) { const v = d(q[0], q[1], q[2]), g = grad(q); q = [q[0] - g[0] * v, q[1] - g[1] * v, q[2] - g[2] * v]; } return q; };
  p = onto(p);
  const n = grad(p), cam = viewOf(c, o as never, C.lo, C.hi, undefined, who, persp, K, origin), { W, H, toScreen, axisDepth, R, F, L } = cam;
  const toEye = (q: V3): V3 => (persp ? unit([cam.eye[0] - q[0], cam.eye[1] - q[1], cam.eye[2] - q[2]]) : [-F[0], -F[1], -F[2]]);
  const facing = dot(n, toEye(p));
  if (facing < 0.08) return;
  // which view: by how far the normal turns from the eye; the left side mirrored
  const ang = (Math.acos(Math.min(1, facing)) * 180) / Math.PI, right = dot(n, R) >= 0;
  const vname = ang < 25 || !o.views ? name : ang < 65 ? o.views.three ?? name : o.views.profile ?? o.views.three ?? name;
  let img = c.asset(vname);
  if (vname !== name && !right) img = img.flip("x");
  const vis = c.img.depth, steps = [c.pal.stepMap(-1), c.pal.stepMap(1)];
  const light = (q: V3, nn: V3) => 0.1 + 0.65 * Math.max(0, dot(nn, L)) + 0.2 * (0.5 + 0.5 * nn[2]);
  const tone = (col: Color, lv: number) => {
    if (!lit) return col;
    let k = Math.max(-2, Math.min(2, Math.round((lv - 0.62) * 4)));
    // (clean: never down into a ramp's darkest, the outline's ink: a mouth in shadow stays a mouth)
    while (k) { const s = steps[k < 0 ? 0 : 1].get(col); if (s === undefined || s === col || (o.clean && k < 0 && !steps[0].has(s))) break; col = s; k -= Math.sign(k); }
    return col;
  };
  if (o.clean !== undefined && typeof o.clean !== "boolean") throw new PxError(`${who}: clean is true or false, got ${JSON.stringify(o.clean)}`);
  const pk = partIndex(c.img, o.part ?? `decal ${name}`), emit = !lit, nrm = o.clean ? c.img.normals() : undefined;
  const put = (x: number, y: number, col: Color, z: number, tol: number) => {
    const q = c.index(x, y);
    if (q < 0 || !vis || !(Math.abs(vis[q] - z) < tol)) return;
    // (the normal surface() wrote there, its z toward the eye)
    if (nrm && nrm[q * 3 + 2] < EDGE * 127) return;
    if (!c.plot(x, y, col)) return;
    c.img.parts!.ids[q] = pk;
    if (emit) (c.img.emit ??= new Uint8Array(W * H))[q] = 255;
  };
  const [pvx, pvy] = img.pivot ?? [img.w / 2, img.h / 2];
  if (mode === "pin") {
    const s0 = toScreen(p);
    if (!s0) return;
    // a texel to a pixel (or block), or grown by a whole number to its size in m there
    const sx = toScreen([p[0] + R[0] * 0.1, p[1] + R[1] * 0.1, p[2] + R[2] * 0.1]), ppm = sx ? Math.hypot(sx[0] - s0[0], sx[1] - s0[1]) / 0.1 : 1;
    const s = o.size ? Math.max(1, Math.round((o.size * ppm) / img.w)) : K, z = axisDepth(p), tol = o.depth ?? Math.max(0.12, (img.w * s) / ppm), lv = light(p, n);
    const X0 = Math.round(s0[0] - pvx * s), Y0 = Math.round(s0[1] - pvy * s);
    for (let j = 0; j < img.h; j++)
      for (let i = 0; i < img.w; i++) {
        const col = img.data[j * img.w + i];
        if ((col & 255) < 128) continue;
        const t = tone(col, lv);
        for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) put(X0 + i * s + x, Y0 + j * s + y, t, z, tol);
      }
    return;
  }
  // wrap: the texels on the surface along its tangents (B up it, T across), each corner put back on it
  const up = unit(o.up ?? [0, 0, 1]), B0 = unit([up[0] - n[0] * dot(up, n), up[1] - n[1] * dot(up, n), up[2] - n[2] * dot(up, n)]), T = cross(B0, n);
  const ts = (o.size ?? img.w / 16) / img.w, cw = img.w + 1, corner: (V3 | null)[] = [], scr: ([number, number] | null)[] = [], cn: V3[] = [];
  for (let j = 0; j <= img.h; j++)
    for (let i = 0; i <= img.w; i++) {
      const u = (i - pvx) * ts, v = (pvy - j) * ts, q = onto([p[0] + T[0] * u + B0[0] * v, p[1] + T[1] * u + B0[1] * v, p[2] + T[2] * u + B0[2] * v]);
      corner.push(q); cn.push(grad(q)); scr.push(toScreen(q));
    }
  for (let j = 0; j < img.h; j++)
    for (let i = 0; i < img.w; i++) {
      const col = img.data[j * img.w + i];
      if ((col & 255) < 128) continue;
      const ks = [j * cw + i, j * cw + i + 1, (j + 1) * cw + i + 1, (j + 1) * cw + i], P = ks.map((k) => scr[k]);
      if (P.some((q) => !q)) continue;
      const mid = [0, 1, 2].map((e) => ks.reduce((t, k) => t + corner[k]![e], 0) / 4) as V3, nm = unit([0, 1, 2].map((e) => ks.reduce((t, k) => t + cn[k][e], 0)));
      if (dot(nm, toEye(mid)) < 0.05) continue;
      const t = tone(col, light(mid, nm)), z = axisDepth(mid);
      // the quad's pixels: those whose middle falls in it (two triangles), at least the one its middle is on
      const xs = P.map((q) => q![0]), ys = P.map((q) => q![1]);
      let any = false;
      const inTri = (x: number, y: number, a: number[], b: number[], cc: number[]) => {
        const d1 = (x - b[0]) * (a[1] - b[1]) - (a[0] - b[0]) * (y - b[1]), d2 = (x - cc[0]) * (b[1] - cc[1]) - (b[0] - cc[0]) * (y - cc[1]), d3 = (x - a[0]) * (cc[1] - a[1]) - (cc[0] - a[0]) * (y - a[1]);
        return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
      };
      for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++)
        for (let x = Math.floor(Math.min(...xs)); x <= Math.ceil(Math.max(...xs)); x++)
          if (inTri(x + 0.5, y + 0.5, P[0]!, P[1]!, P[2]!) || inTri(x + 0.5, y + 0.5, P[0]!, P[2]!, P[3]!)) { put(x, y, t, z, 0.15); any = true; }
      if (!any) { const cx = xs.reduce((a, b) => a + b) / 4, cy = ys.reduce((a, b) => a + b) / 4; put(Math.floor(cx), Math.floor(cy), t, z, 0.15); }
    }
}
