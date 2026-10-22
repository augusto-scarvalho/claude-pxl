// Meshes: things modelled in meters as flat faces (what the race's cockpit built for itself) and drawn
// through a camera with a depth per pixel, so a dash wrapped round the driver or a wheel's rim in front
// of its own spokes come out in the right order, which sorting whole shapes (solids) can't do. Each
// face takes a tone along its material's ramp by how it lies to the light; a line is drawn where a
// surface ends in front of another (or of nothing), a crease where two faces of one material meet at
// an angle, and the top edge of a surface comes out a step lighter, as an edge catching the light.
// A material can instead lay a sprite's pixels on its faces, so many m to a texel (pixel-art stone on
// walls and floors, HD-2D's dioramas), each pixel stepped along its ramp by the face's light; and
// sprites can stand among the faces, upright and turned to the camera, in the same depth, so a wall
// hides a figure's legs and not its head. Each sprite gets a contact shadow on what it stands on.
import { type Color, TRANSPARENT } from "./color.ts";
import { PxError } from "./errors.ts";
import type { Img } from "./image.ts";
import { type Perspective, type View, perspective } from "./perspective.ts";
import { bayer } from "./util.ts";

export type V3 = [number, number, number];
export interface Face { mat: string; pts: V3[] }
export interface Material {
  /** tones dark to light ("0-=~^" or an array of keys); a textured material needs none */
  ramp?: string | string[];
  /** the outline's key where the surface ends (default the ramp's darkest; a textured one has none unless given) */
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
  /** an asset whose pixels tile the faces, lying on the floor or standing on a wall by which way the face looks */
  tex?: string;
  /** a texel's size in m (default 1/16: a 16 px tile to the meter) */
  texel?: number;
}
export interface MeshSprite {
  /** an asset's name (an animation plays on the scene's clock) */
  name: string;
  /** where its pivot (its feet) stands, in m: [x, z] on the ground, or [x, z, up] */
  at: [number, number] | V3;
  flip?: "x";
  frame?: number;
  /** the contact shadow's radius in m, 0 for none (default: a third of the sprite's width) */
  shadow?: number;
}
export interface MeshOpts {
  /** the way toward the light, in the points' frame, or a function giving a face's light (0 dark, 1 lit) */
  light?: V3 | ((normal: V3, middle: V3, face: Face) => number);
  /** sprites standing among the faces (a perspective view only) */
  sprites?: MeshSprite[];
  /** px to a sprite's pixel (default 1): 4 draws them four times as big, for a picture four times as big (HD) */
  pixel?: number;
}
export interface MeshCanvas {
  img: { w: number; h: number; depth?: Float32Array };
  ox: number;
  oy: number;
  px(x: number, y: number, c: string): void;
  plot(x: number, y: number, c: Color): boolean;
  get(x: number, y: number): Color;
  /** the image's pixels, to write straight into when nothing (a clip, a mirror, a wrap) stands between */
  raw?: Uint32Array;
}
/** What the canvas looked up for drawMesh: the textures by material, the sprites' images, a color stepped along its ramp. */
export interface MeshWorld {
  tex: Record<string, Img>;
  sprites: { name: string; img: Img; at: V3; shadow?: number }[];
  step(c: Color, n: number): Color;
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
const mod = (a: number, n: number) => ((a % n) + n) % n;
/** Nearer than this (m along the camera's axis) is cut off: a face reaching behind the eye is drawn up to it. */
const NEAR = 0.05;

/**
 * The camera as a function from a point to [col, row, depth], where its eye is, which way is up and
 * where the light comes from by default (from the upper left, behind the eye). Through perspective(),
 * points are the world's [x, z, up], as solid's; a function of one's own takes points in the camera's
 * frame, [x right, y up, z ahead] from the eye.
 */
function camera(view: unknown, w: number): { project: Project; eye: V3; up: V3; light: V3; P?: Perspective } {
  if (typeof view === "function") return { project: view as Project, eye: [0, 0, 0], up: [0, 1, 0], light: [-0.5, 0.7, -0.5] };
  const P: Perspective = perspective({ ...(view as View), w: (view as View).w ?? w });
  return { project: ([x, z, u]) => [...P.ground(x, z, u), P.focal / P.scale(z, x, u)], eye: [0, 0, P.eye], up: [0, 0, 1], light: [-0.5, -0.5, 0.7], P };
}

/** The part of a face in front of the near plane (depth is linear in the points, so cut where it crosses). */
function clipNear(pts: V3[], P: [number, number, number][], project: Project): [V3[], [number, number, number][]] {
  const out: V3[] = [];
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length, a = pts[i], b = pts[j], da = P[i][2], db = P[j][2];
    if (da >= NEAR) out.push(a);
    if ((da >= NEAR) !== (db >= NEAR)) { const t = (NEAR - da) / (db - da); out.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]), a[2] + t * (b[2] - a[2])]); }
  }
  return [out, out.map(project)];
}

/** Draw the faces, then the sprites among them; gives where each sprite landed (canvas coords), for describe. */
export function drawMesh(c: MeshCanvas, view: unknown, faces: Face[], mats: Record<string, Material>, opts: MeshOpts = {}, world?: MeshWorld): { name: string; x: number; y: number; img: Img }[] {
  const W = c.img.w, H = c.img.h, x0 = -c.ox, y0 = -c.oy, cam = camera(view, W), eye = cam.eye;
  const sunDir = unit(Array.isArray(opts.light) ? (opts.light as V3) : cam.light);
  const lightOf = typeof opts.light === "function" ? opts.light : (n: V3) => 0.3 + 0.6 * Math.max(0, dot(n, sunDir));
  const ramps: Record<string, string[]> = {};
  for (const [name, M] of Object.entries(mats)) {
    if (M?.tex !== undefined) {
      if (!(M.texel === undefined || M.texel > 0)) throw new PxError(`mesh: material '${name}' has texel ${M.texel}: a texel's size in m, above 0 (1/16: a 16 px tile to the meter)`);
      ramps[name] = M.ramp ? [...M.ramp] : [];
      continue;
    }
    if (!M || !(typeof M.ramp === "string" || Array.isArray(M.ramp)) || M.ramp.length === 0) throw new PxError(`mesh: material '${name}' needs a ramp of keys, dark to light (e.g. { ramp: "0-=~^" }), or a tex (an asset to tile its faces with)`);
    ramps[name] = [...M.ramp];
  }
  // per pixel: the nearest face's depth and index, and the point of it seen there (textures, shadows)
  const n = W * H, depth = new Float32Array(n).fill(1e9), who = new Int32Array(n).fill(-1), pos = new Float32Array(n * 3);
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
    let pts = F.pts, P = pts.map(cam.project);
    if (P.some((p) => p[2] < NEAR)) [pts, P] = clipNear(pts, P, cam.project);
    for (let t = 1; t + 1 < P.length; t++) {
      const [a, b, d] = [P[0], P[t], P[t + 1]], [A, B, D] = [pts[0], pts[t], pts[t + 1]];
      const Az = A.map((v) => v / a[2]), Bz = B.map((v) => v / b[2]), Dz = D.map((v) => v / d[2]);
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
        if (z >= depth[i]) continue;
        depth[i] = z; who[i] = k;
        // the point seen, interpolated in perspective
        pos[i * 3] = (w0 * Az[0] + w1 * Bz[0] + w2 * Dz[0]) * z;
        pos[i * 3 + 1] = (w0 * Az[1] + w1 * Bz[1] + w2 * Dz[1]) * z;
        pos[i * 3 + 2] = (w0 * Az[2] + w1 * Bz[2] + w2 * Dz[2]) * z;
      }
    }
  });
  // which coordinate is up, and which runs away from the camera: [x, z, up] through perspective(), [x, y up, z ahead]
  // otherwise; per face, the coordinates a texture runs across and down: a floor across and away, a wall across and down
  const UP = cam.up[2] ? 2 : 1, AHEAD = UP === 2 ? 1 : 2;
  // each face's texture stepped once by its light (the faces of a material in one light share it)
  const lits = new Map<string, Uint32Array>(), litOf: Uint32Array[] = [];
  const litTex = (k: number, T: Img) => {
    if (litOf[k]) return litOf[k];
    const n = Math.round((lights[k] - 0.75) * 5), key = faces[k].mat + "|" + n;
    let t = lits.get(key);
    if (!t) lits.set(key, (t = T.data.map((col) => (col === TRANSPARENT ? col : world!.step(col, n)))));
    return (litOf[k] = t);
  };
  const uv = normals.map((N) => {
    const a = [0, 1, 2].reduce((m, e) => (Math.abs(N[e]) > Math.abs(N[m]) ? e : m), 0);
    return a === UP ? [0, AHEAD] : [a === 0 ? AHEAD : 0, UP];
  });
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, k = who[i];
    if (k < 0) continue;
    const F = faces[k], M = mats[F.mat], r = ramps[F.mat], N = normals[k];
    if (M.tex !== undefined && M.edge === undefined) {
      // a floor reads the texture across and away, a wall across and down; light steps each texel along its ramp
      const T = world!.tex[F.mat], s = 1 / (M.texel ?? 1 / 16), [ua, va] = uv[k], lit = litTex(k, T);
      const col = lit[mod(Math.floor(-pos[i * 3 + va] * s), T.h) * T.w + mod(Math.floor(pos[i * 3 + ua] * s), T.w)];
      if (col === TRANSPARENT) continue;
      if (c.raw) c.raw[i] = col;
      else c.plot(x + x0, y + y0, col);
      continue;
    }
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
    if (M.tex !== undefined) {
      if (line) c.px(x + x0, y + y0, line);
      continue;
    }
    const lv = Math.max(0, Math.min(r.length - 1, Math.floor(lights[k] * r.length + (bayer(x + x0, y + y0) - 0.5) * (M.dither ?? 0))));
    // the top edge of a surface, just under its outline, catches the light: a step lighter
    const up1 = y > 0 ? who[i - W] : -1, up2 = y > 1 ? who[i - 2 * W] : -1;
    const rim = !line && up1 === k && (up2 < 0 || (up2 !== k && depth[i - 2 * W] > depth[i] * 1.06)) && dot(N, cam.up) > -0.3;
    const tx = M.texture && !line && !rim ? Math.round(M.texture(x + x0, y + y0)) : 0;
    c.px(x + x0, y + y0, line ?? (rim ? M.top ?? r[Math.min(r.length - 1, lv + 1)] : r[Math.max(0, Math.min(r.length - 1, lv + tx))]));
  }
  const keep = () => {
    // the depth stays on the image for post(); a second mesh() keeps the nearer of the two
    const d = (c.img.depth ??= new Float32Array(n).fill(Infinity));
    for (let i = 0; i < n; i++) if (who[i] !== -1 && depth[i] < d[i]) d[i] = depth[i];
  };
  if (!world?.sprites.length) { keep(); return []; }
  if (!cam.P) throw new PxError("mesh: sprites stand in a perspective view ({ w, horizon, eye, ... }), not a camera function");
  const focal = cam.P.focal, K = opts.pixel ?? 1, placed: { name: string; x: number; y: number; img: Img }[] = [];
  if (!(Number.isInteger(K) && K >= 1)) throw new PxError(`mesh: pixel is how many px a sprite's pixel takes, a whole number from 1, got ${K}`);
  // contact shadows: what each sprite stands on, two steps darker in the middle and one out to the
  // radius (the darkest where two overlap)
  const shade = new Uint8Array(n);
  const feet = world.sprites.map((s) => cam.project(s.at));
  world.sprites.forEach((s, k) => {
    const [fx, fz, fu] = s.at, R = s.shadow ?? (s.img.w * K) / 2.5 / (focal / feet[k][2]);
    if (!(R > 0)) return;
    const box = [[fx - R, fz - R], [fx + R, fz - R], [fx - R, fz + R], [fx + R, fz + R]].map(([x, z]) => cam.project([x, z, fu]));
    const xa = Math.max(0, Math.floor(Math.min(...box.map((b) => b[0]))) - x0), xb = Math.min(W - 1, Math.ceil(Math.max(...box.map((b) => b[0]))) - x0);
    const ya = Math.max(0, Math.floor(Math.min(...box.map((b) => b[1]))) - y0), yb = Math.min(H - 1, Math.ceil(Math.max(...box.map((b) => b[1]))) - y0);
    for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++) {
      const i = y * W + x, r = Math.hypot(pos[i * 3] - fx, pos[i * 3 + 1] - fz);
      if (who[i] >= 0 && Math.abs(pos[i * 3 + 2] - fu) < 0.05 && r <= R) shade[i] = Math.max(shade[i], r <= 0.6 * R ? 2 : 1);
    }
  });
  for (let i = 0; i < n; i++) if (shade[i]) { const x = (i % W) + x0, y = Math.floor(i / W) + y0; c.plot(x, y, world.step(c.get(x, y), -shade[i])); }
  // the sprites: upright at their feet, a pixel to K x K px, each row as deep as that height above the
  // feet; a pixel less than half opaque is cut (it neither shows nor hides what's behind)
  world.sprites.forEach((s, k) => {
    const { img } = s, [px, py] = img.pivot ?? [img.w / 2, img.h], perM = focal / feet[k][2];
    const X0 = Math.round(feet[k][0] - px * K), Y0 = Math.round(feet[k][1] - py * K);
    for (let j = 0; j < img.h * K; j++) {
      const yi = Y0 + j - y0;
      if (yi < 0 || yi >= H) continue;
      // a hair nearer than the feet, so a figure against a wall stays in front of it
      const d = cam.project([s.at[0], s.at[1], s.at[2] + (py * K - j - 0.5) / perM])[2] - 0.02, row = Math.floor(j / K) * img.w;
      for (let i = 0; i < img.w * K; i++) {
        const col = img.data[row + Math.floor(i / K)], xi = X0 + i - x0, q = yi * W + xi;
        if ((col & 255) < 128 || xi < 0 || xi >= W || d >= depth[q]) continue;
        depth[q] = d;
        who[q] = -2;
        c.plot(X0 + i, Y0 + j, col);
      }
    }
    placed.push({ name: s.name, x: X0, y: Y0, img: K > 1 ? img.scale(K) : img });
  });
  keep();
  return placed;
}
