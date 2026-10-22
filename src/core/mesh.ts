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
import { type Color, LIN, TRANSPARENT, fromLinear } from "./color.ts";
import { PxError } from "./errors.ts";
import type { Img } from "./image.ts";
import { type Perspective, type View, perspective } from "./perspective.ts";
import { type Lit, SunMap, shine } from "./sunlight.ts";
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
  /**
   * a texel's size in m (default 1/16: a 16 px tile to the meter); two, across and down, to lay the
   * texture one texel to a pixel on a floor or wall the camera foreshortens (a floor seen from 38 degrees
   * up: [1 / ppm, 1 / (ppm * sin 38)]), so it reads drawn on the screen and not squashed
   */
  texel?: number | [number, number];
  /**
   * where the texture starts: "world" (default) tiles it from the world's origin, so neighbouring faces
   * carry on one another's; "face" starts it at each face's own top left (a gravestone's whole drawing
   * on its face, a fence's top along the rail). Its clear pixels are holes: nothing there, no shadow.
   */
  anchor?: "world" | "face";
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
  /**
   * Light in the world (a perspective view, textured faces and sprites; see sunlight.ts): the sun's
   * color (`light` is the way to it), or { color, strength }. With it, colors leave the palette.
   */
  sun?: string | { color: string; strength?: number };
  /** the light everywhere, from the sky (default a third of the sun's, a little blue) */
  sky?: string | { color: string; strength?: number };
  /** point lights: where, their color, how far they reach in m (default 4), how strong (default 1) */
  lamps?: { at: V3; color: string; r?: number; strength?: number }[];
  /** keys that give light instead of taking it (a lamp's glass, a window at night): drawn as they are */
  emit?: string;
  /** the sun's shadows (default true with a sun) */
  shadows?: boolean;
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
  /** the light, its colors resolved (with `sun`) */
  lit?: Lit;
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
      const t = M.texel;
      if (!(t === undefined || (typeof t === "number" && t > 0) || (Array.isArray(t) && t.length === 2 && t[0] > 0 && t[1] > 0)))
        throw new PxError(`mesh: material '${name}' has texel ${JSON.stringify(t)}: a texel's size in m, above 0 (1/16: a 16 px tile to the meter), or two, across and down`);
      ramps[name] = M.ramp ? [...M.ramp] : [];
      continue;
    }
    if (!M || !(typeof M.ramp === "string" || Array.isArray(M.ramp)) || M.ramp.length === 0) throw new PxError(`mesh: material '${name}' needs a ramp of keys, dark to light (e.g. { ramp: "0-=~^" }), or a tex (an asset to tile its faces with)`);
    ramps[name] = [...M.ramp];
  }
  // per pixel: the nearest face's depth and index, and the point of it seen there (textures, shadows)
  const n = W * H, depth = new Float32Array(n).fill(1e9), who = new Int32Array(n).fill(-1), pos = new Float32Array(n * 3);
  const normals: V3[] = [], lights: number[] = [];
  // which coordinate is up, and which runs away from the camera: [x, z, up] through perspective(), [x, y up, z ahead]
  // otherwise; per textured face, the coordinates its texture runs across and down (a floor across and
  // away, a wall across and down), where it starts, and whether it has holes
  const UP = cam.up[2] ? 2 : 1, AHEAD = UP === 2 ? 1 : 2;
  const texOf: ({ T: Img; su: number; sv: number; ua: number; va: number; u0: number; v0: number; holes: boolean } | undefined)[] = [];
  const holed = new Map<Img, boolean>();
  const texel = (t: NonNullable<(typeof texOf)[number]>, X: number, Y: number, Z: number) => {
    const P = [X, Y, Z], u = (P[t.ua] - t.u0) * t.su + 1e-6, v = (-P[t.va] - t.v0) * t.sv + 1e-6;
    return mod(Math.floor(v), t.T.h) * t.T.w + mod(Math.floor(u), t.T.w);
  };
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
    if (M.tex !== undefined) {
      const T = world!.tex[F.mat], a = [0, 1, 2].reduce((m, e) => (Math.abs(N[e]) > Math.abs(N[m]) ? e : m), 0);
      const [ua, va] = a === UP ? [0, AHEAD] : [a === 0 ? AHEAD : 0, UP], face = M.anchor === "face";
      if (M.anchor !== undefined && M.anchor !== "face" && M.anchor !== "world") throw new PxError(`mesh: material '${F.mat}' has anchor ${JSON.stringify(M.anchor)}: "world" (tiled from the world's origin) or "face" (from each face's top left)`);
      if (!holed.has(T)) holed.set(T, T.data.some((c) => (c & 255) < 128));
      const [tu, tv] = Array.isArray(M.texel) ? M.texel : [M.texel ?? 1 / 16, M.texel ?? 1 / 16];
      texOf[k] = { T, su: 1 / tu, sv: 1 / tv, ua, va, u0: face ? Math.min(...F.pts.map((p) => p[ua])) : 0, v0: face ? Math.min(...F.pts.map((p) => -p[va])) : 0, holes: holed.get(T)! };
    }
    const tk = texOf[k];
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
        // the point seen, interpolated in perspective; through a hole in its texture, not this face
        const X = (w0 * Az[0] + w1 * Bz[0] + w2 * Dz[0]) * z, Y = (w0 * Az[1] + w1 * Bz[1] + w2 * Dz[1]) * z, Z = (w0 * Az[2] + w1 * Bz[2] + w2 * Dz[2]) * z;
        if (tk?.holes && (tk.T.data[texel(tk, X, Y, Z)] & 255) < 128) continue;
        depth[i] = z; who[i] = k;
        pos[i * 3] = X; pos[i * 3 + 1] = Y; pos[i * 3 + 2] = Z;
      }
    }
  });
  // the light in the world: what the sun sees, every face and every sprite turned to it, over what
  // the camera sees (a point in four of the picture's, and the sprites' feet)
  const L = world?.lit, K = opts.pixel ?? 1;
  if (L) L.dir = sunDir;
  if (!(Number.isInteger(K) && K >= 1)) throw new PxError(`mesh: pixel is how many px a sprite's pixel takes, a whole number from 1, got ${K}`);
  if ((L || world?.sprites.length) && !cam.P) throw new PxError(`mesh: ${L ? "a sun" : "sprites"} need a perspective view ({ w, horizon, eye, ... }), not a camera function`);
  const feet = (world?.sprites ?? []).map((s) => cam.project(s.at)), perM = feet.map((f) => cam.P!.focal / f[2]);
  let sunMap: SunMap | undefined;
  if (L?.shadows) {
    const seen = (visit: (x: number, y: number, z: number) => void) => {
      for (let i = 0; i < n; i += 4) if (who[i] >= 0) visit(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
      for (const s of world!.sprites) visit(...s.at);
    };
    // 1024 cells across what is seen (2048 for a picture that big): a few cm on a diorama, so a shadow
    // starts at the foot of what throws it
    sunMap = new SunMap(L.dir, seen, Math.min(2048, Math.max(1024, Math.max(W, H) / 2)));
    faces.forEach((F, k) => {
      const tk = texOf[k];
      for (let t = 1; t + 1 < F.pts.length; t++) {
        const [A, B, D] = [F.pts[0], F.pts[t], F.pts[t + 1]];
        // (a texture's holes let the sun through)
        sunMap!.tri(A, B, D, k, tk?.holes ? (w0, w1, w2) => (tk.T.data[texel(tk, w0 * A[0] + w1 * B[0] + w2 * D[0], w0 * A[1] + w1 * B[1] + w2 * D[1], w0 * A[2] + w1 * B[2] + w2 * D[2])] & 255) >= 128 : undefined);
      }
    });
    const yaw = (cam.P!.yaw * Math.PI) / 180, right: V3 = [Math.cos(yaw), -Math.sin(yaw), 0];
    world!.sprites.forEach((s, k) => sunMap!.sprite(s.img, s.at, K / perM[k], -2 - k, right));
  }
  // each face's texture stepped once by its light (the faces of a material in one light share it)
  const lits = new Map<string, Uint32Array>(), litOf: Uint32Array[] = [];
  const litTex = (k: number, T: Img) => {
    if (litOf[k]) return litOf[k];
    const n = Math.round((lights[k] - 0.75) * 5), key = faces[k].mat + "|" + n;
    let t = lits.get(key);
    if (!t) lits.set(key, (t = T.data.map((col) => (col === TRANSPARENT ? col : world!.step(col, n)))));
    return (litOf[k] = t);
  };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, k = who[i];
    if (k < 0) continue;
    const F = faces[k], M = mats[F.mat], r = ramps[F.mat], N = normals[k];
    if (M.tex !== undefined && M.edge === undefined) {
      // a floor reads the texture across and away, a wall across and down; light steps each texel along its ramp
      const tk = texOf[k]!, lit = L ? tk.T.data : litTex(k, tk.T);
      let col = lit[texel(tk, pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2])];
      if (col === TRANSPARENT) continue;
      if (L) {
        const px = pos[i * 3], py = pos[i * 3 + 1], pz = pos[i * 3 + 2], facing = dot(N, L.dir);
        col = shine(col, N, px, py, pz, L, facing > 0 && (!sunMap || sunMap.sees(px, py, pz, k, facing)), 0);
      }
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
  const placed: { name: string; x: number; y: number; img: Img }[] = [];
  // contact shadows: what each sprite stands on, two steps darker in the middle and one out to the
  // radius (the darkest where two overlap)
  const shade = new Uint8Array(n);
  world.sprites.forEach((s, k) => {
    const [fx, fz, fu] = s.at, R = s.shadow ?? (s.img.w * K) / 2.5 / perM[k];
    if (!(R > 0)) return;
    const box = [[fx - R, fz - R], [fx + R, fz - R], [fx - R, fz + R], [fx + R, fz + R]].map(([x, z]) => cam.project([x, z, fu]));
    const xa = Math.max(0, Math.floor(Math.min(...box.map((b) => b[0]))) - x0), xb = Math.min(W - 1, Math.ceil(Math.max(...box.map((b) => b[0]))) - x0);
    const ya = Math.max(0, Math.floor(Math.min(...box.map((b) => b[1]))) - y0), yb = Math.min(H - 1, Math.ceil(Math.max(...box.map((b) => b[1]))) - y0);
    for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++) {
      const i = y * W + x, r = Math.hypot(pos[i * 3] - fx, pos[i * 3 + 1] - fz);
      if (who[i] >= 0 && Math.abs(pos[i * 3 + 2] - fu) < 0.05 && r <= R) shade[i] = Math.max(shade[i], r <= 0.6 * R ? 2 : 1);
    }
  });
  // (in the world's light, a share of the light taken away instead of ramp steps)
  for (let i = 0; i < n; i++) {
    if (!shade[i]) continue;
    const x = (i % W) + x0, y = Math.floor(i / W) + y0, col = c.get(x, y), f = shade[i] === 2 ? 0.55 : 0.75;
    c.plot(x, y, L ? fromLinear(LIN[col >>> 24] * f, LIN[(col >>> 16) & 255] * f, LIN[(col >>> 8) & 255] * f, col) : world.step(col, -shade[i]));
  }
  // a sprite's right, the world's up, and its face (toward the camera, level): its normal map turned into the world
  const yaw = (cam.P!.yaw * Math.PI) / 180, right: V3 = [Math.cos(yaw), -Math.sin(yaw), 0], front: V3 = [-Math.sin(yaw), -Math.cos(yaw), 0];
  // the sprites: upright at their feet, a pixel to K x K px, each row as deep as that height above the
  // feet; a pixel less than half opaque is cut (it neither shows nor hides what's behind)
  world.sprites.forEach((s, k) => {
    const { img } = s, [px, py] = img.pivot ?? [img.w / 2, img.h], m = K / perM[k];
    const X0 = Math.round(feet[k][0] - px * K), Y0 = Math.round(feet[k][1] - py * K);
    // in the world's light, each of its pixels lit the first time it shows: where it stands on the
    // sprite's plane, which way it faces (0: not lit yet; a lit color is never 0, its alpha isn't)
    const lit = L ? new Uint32Array(img.data.length) : undefined, nm = img.norm;
    const colorAt = (q: number, i: number, j: number) => {
      if (!lit) return img.data[q];
      if (lit[q]) return lit[q];
      const col = img.data[q], a = (i + 0.5 - px) * m, X = s.at[0] + right[0] * a, Y = s.at[1] + right[1] * a, U = s.at[2] + (py - j - 0.5) * m;
      const has = nm && nm[q * 3 + 2] > 0, nx = has ? nm![q * 3] / 127 : 0, ny = has ? nm![q * 3 + 1] / 127 : 0, nz = has ? nm![q * 3 + 2] / 127 : 1;
      const N = unit([nx * right[0] + nz * front[0], nx * right[1] + nz * front[1], -ny]), facing = dot(N, L!.dir);
      return (lit[q] = shine(col, N, X, Y, U, L!, facing > -0.5 && (!sunMap || sunMap.sees(X, Y, U, -2 - k, Math.max(0.2, facing))), 0.5));
    };
    for (let j = 0; j < img.h * K; j++) {
      const yi = Y0 + j - y0;
      if (yi < 0 || yi >= H) continue;
      // a hair nearer than the feet, so a figure against a wall stays in front of it
      const d = cam.project([s.at[0], s.at[1], s.at[2] + (py * K - j - 0.5) / perM[k]])[2] - 0.02, row = Math.floor(j / K) * img.w;
      for (let i = 0; i < img.w * K; i++) {
        const si = Math.floor(i / K), col = img.data[row + si], xi = X0 + i - x0, q = yi * W + xi;
        if ((col & 255) < 128 || xi < 0 || xi >= W || d >= depth[q]) continue;
        depth[q] = d;
        who[q] = -2;
        c.plot(X0 + i, Y0 + j, colorAt(row + si, si, Math.floor(j / K)));
      }
    }
    placed.push({ name: s.name, x: X0, y: Y0, img: K > 1 ? img.scale(K) : img });
  });
  keep();
  return placed;
}
