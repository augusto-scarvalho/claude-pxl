// Meshes: things modelled in meters as flat faces (what the race's cockpit built for itself) and drawn
// through a camera with a depth per pixel, so a dash wrapped round the driver or a wheel's rim in front
// of its own spokes come out in the right order, which sorting whole shapes (solids) can't do. Each
// face takes a tone along its material's ramp by how it lies to the light; a line is drawn where a
// surface ends in front of another (or of nothing), a crease where two faces of one material meet at
// an angle, and the top edge of a surface comes out a step lighter, as an edge catching the light.
import { PxError } from "./errors.ts";
import { type Perspective, type View, perspective } from "./perspective.ts";
import { bayer } from "./util.ts";

export type V3 = [number, number, number];
export interface Face { mat: string; pts: V3[] }
export interface Material {
  /** tones dark to light ("0-=~^" or an array of keys) */
  ramp: string | string[];
  /** the outline's key where the surface ends (default the ramp's darkest) */
  edge?: string;
  /** the lit top edge's key (default a step up the ramp) */
  top?: string;
  /** a round surface: no crease between its faces */
  smooth?: boolean;
  /** added to every face's light */
  bias?: number;
  /** how much the tone is dithered between steps (0: none) */
  dither?: number;
  /** steps up or down the ramp at a pixel (a weave, a grain), away from lines and rims */
  texture?: (x: number, y: number) => number;
}
export interface MeshOpts {
  /** the way toward the light, in the points' frame, or a function giving a face's light (0 dark, 1 lit) */
  light?: V3 | ((normal: V3, middle: V3, face: Face) => number);
}
export interface MeshCanvas {
  img: { w: number; h: number };
  ox: number;
  oy: number;
  px(x: number, y: number, c: string): void;
}
type Project = (p: V3) => [number, number, number];

/** A model to fill: faces of 3 or more corners, strips, lofts, boxes, each with its material's name. */
export function model() {
  const faces: Face[] = [];
  const face = (mat: string, ...pts: V3[]) => { faces.push({ mat, pts }); return faces.length - 1; };
  // a strip between two lines of points: quads between neighbours
  const strip = (mat: string, a: V3[], b: V3[]) => { for (let i = 0; i + 1 < a.length; i++) face(mat, a[i], a[i + 1], b[i + 1], b[i]); };
  // sections, each a line of points: strips between neighbouring sections
  const loft = (mat: string, secs: V3[][]) => { for (let j = 0; j + 1 < secs.length; j++) strip(mat, secs[j], secs[j + 1]); };
  const box = (mat: string, [x0, y0, z0]: V3, [x1, y1, z1]: V3) => {
    const p = (i: number, j: number, k: number): V3 => [i ? x1 : x0, j ? y1 : y0, k ? z1 : z0];
    face(mat, p(0, 1, 0), p(1, 1, 0), p(1, 1, 1), p(0, 1, 1)); face(mat, p(0, 0, 0), p(1, 0, 0), p(1, 1, 0), p(0, 1, 0));
    face(mat, p(0, 0, 0), p(0, 1, 0), p(0, 1, 1), p(0, 0, 1)); face(mat, p(1, 0, 0), p(1, 0, 1), p(1, 1, 1), p(1, 1, 0));
    face(mat, p(0, 0, 0), p(0, 0, 1), p(1, 0, 1), p(1, 0, 0)); face(mat, p(0, 0, 1), p(0, 1, 1), p(1, 1, 1), p(1, 0, 1));
  };
  return { faces, face, strip, loft, box };
}

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = (a: V3): V3 => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

/**
 * The camera as a function from a point to [col, row, depth], where its eye is, which way is up and
 * where the light comes from by default (from the upper left, behind the eye). Through perspective(),
 * points are the world's [x, z, up], as solid's; a function of one's own takes points in the camera's
 * frame, [x right, y up, z ahead] from the eye.
 */
function camera(view: unknown, w: number): { project: Project; eye: V3; up: V3; light: V3 } {
  if (typeof view === "function") return { project: view as Project, eye: [0, 0, 0], up: [0, 1, 0], light: [-0.5, 0.7, -0.5] };
  const P: Perspective = perspective({ ...(view as View), w: (view as View).w ?? w });
  return { project: ([x, z, u]) => [...P.ground(x, z, u), P.focal / P.scale(z, x, u)], eye: [0, 0, P.eye], up: [0, 0, 1], light: [-0.5, -0.5, 0.7] };
}

export function drawMesh(c: MeshCanvas, view: unknown, faces: Face[], mats: Record<string, Material>, opts: MeshOpts = {}): void {
  const W = c.img.w, H = c.img.h, x0 = -c.ox, y0 = -c.oy, cam = camera(view, W), eye = cam.eye;
  const sunDir = unit(Array.isArray(opts.light) ? (opts.light as V3) : cam.light);
  const lightOf = typeof opts.light === "function" ? opts.light : (n: V3) => 0.3 + 0.6 * Math.max(0, dot(n, sunDir));
  const ramps: Record<string, string[]> = {};
  for (const [name, M] of Object.entries(mats)) {
    if (!M || !(typeof M.ramp === "string" || Array.isArray(M.ramp)) || M.ramp.length === 0) throw new PxError(`mesh: material '${name}' needs a ramp of keys, dark to light (e.g. { ramp: "0-=~^" })`);
    ramps[name] = [...M.ramp];
  }
  const n = W * H, depth = new Float32Array(n).fill(1e9), who = new Int32Array(n).fill(-1);
  const normals: V3[] = [], lights: number[] = [];
  faces.forEach((F, k) => {
    if (!F || !Array.isArray(F.pts) || F.pts.length < 3) throw new PxError(`mesh: face ${k} needs a material and 3 or more corners, { mat, pts: [[x, y, z], ...] } (model().face(mat, ...points))`);
    const M = mats[F.mat];
    if (!M) throw new PxError(`mesh: face ${k} is of material '${F.mat}', which mats doesn't have (it has: ${Object.keys(mats).join(", ")})`);
    const N = unit(cross(sub(F.pts[1], F.pts[0]), sub(F.pts[2], F.pts[0])));
    const L = F.pts.length, mid = F.pts.reduce<V3>((s, p) => [s[0] + p[0] / L, s[1] + p[1] / L, s[2] + p[2] / L], [0, 0, 0]);
    // the side we see: the one toward the eye
    const toward = dot(sub(mid, eye), N) > 0 ? -1 : 1;
    normals[k] = N.map((v) => v * toward) as V3;
    lights[k] = lightOf(normals[k], mid, F) + (M.bias ?? 0);
    const P = F.pts.map(cam.project);
    if (P.some((p) => p[2] < 0.05)) return;
    for (let t = 1; t + 1 < P.length; t++) {
      const [a, b, d] = [P[0], P[t], P[t + 1]];
      const area = (b[0] - a[0]) * (d[1] - a[1]) - (b[1] - a[1]) * (d[0] - a[0]);
      if (Math.abs(area) < 1e-6) continue;
      const xa = Math.max(x0, Math.floor(Math.min(a[0], b[0], d[0]))), xb = Math.min(x0 + W - 1, Math.ceil(Math.max(a[0], b[0], d[0])));
      const ya = Math.max(y0, Math.floor(Math.min(a[1], b[1], d[1]))), yb = Math.min(y0 + H - 1, Math.ceil(Math.max(a[1], b[1], d[1])));
      for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++) {
        const px = x + 0.5, py = y + 0.5;
        const w1 = ((d[0] - a[0]) * (py - a[1]) - (d[1] - a[1]) * (px - a[0])) / -area, w2 = ((b[0] - a[0]) * (py - a[1]) - (b[1] - a[1]) * (px - a[0])) / area;
        const w0 = 1 - w1 - w2;
        if (w0 < -1e-4 || w1 < -1e-4 || w2 < -1e-4) continue;
        const z = 1 / (w0 / a[2] + w1 / b[2] + w2 / d[2]), i = (y - y0) * W + (x - x0);
        if (z < depth[i]) { depth[i] = z; who[i] = k; }
      }
    }
  });
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, k = who[i];
    if (k < 0) continue;
    const F = faces[k], M = mats[F.mat], r = ramps[F.mat], N = normals[k];
    // an outline where this surface is in front of another or of nothing; a crease where faces meet
    let line: string | null = null;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
      const j = yy * W + xx, k2 = who[j];
      if (k2 === k) continue;
      if (k2 < 0 || depth[j] > depth[i] * 1.06) { line = M.edge ?? r[0]; break; }
      const F2 = faces[k2];
      if (F2.mat !== F.mat && depth[j] >= depth[i]) line = line ?? M.edge ?? r[0];
      else if (F2.mat === F.mat && !M.smooth && dot(N, normals[k2]) < 0.82 && depth[j] >= depth[i]) line = line ?? r[0];
    }
    const lv = Math.max(0, Math.min(r.length - 1, Math.floor(lights[k] * r.length + (bayer(x + x0, y + y0) - 0.5) * (M.dither ?? 0))));
    // the top edge of a surface, just under its outline, catches the light: a step lighter
    const up1 = y > 0 ? who[i - W] : -1, up2 = y > 1 ? who[i - 2 * W] : -1;
    const rim = !line && up1 === k && (up2 < 0 || (up2 !== k && depth[i - 2 * W] > depth[i] * 1.06)) && dot(N, cam.up) > -0.3;
    const tx = M.texture && !line && !rim ? Math.round(M.texture(x + x0, y + y0)) : 0;
    c.px(x + x0, y + y0, line ?? (rim ? M.top ?? r[Math.min(r.length - 1, lv + 1)] : r[Math.max(0, Math.min(r.length - 1, lv + tx))]));
  }
}
