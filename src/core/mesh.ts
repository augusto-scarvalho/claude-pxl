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
import { projection } from "./surface.ts";
import { type Lamp, type Lit, SunMap, shine } from "./sunlight.ts";
import { PATTERNS, SCAN, noise, toward } from "./effects.ts";
import { hash } from "./util.ts";
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
   * up: [1 / ppm, 1 / (ppm * sin 38)]), so it reads drawn on the screen and not squashed; "screen": those
   * two of a perspective() camera looking down (its floor or its wall, by the face), in the art's pixel
   */
  texel?: number | [number, number] | "screen";
  /**
   * where the texture starts: "world" (default) tiles it from the world's origin, so neighbouring faces
   * carry on one another's; "face" starts it at each face's own top left (a gravestone's whole drawing
   * on its face, a fence's top along the rail). Its clear pixels are holes: nothing there, no shadow.
   */
  anchor?: "world" | "face";
  /**
   * px to one of its pixels: its faces drawn in blocks of block x block px, each block one point of the
   * face (its middle): its light, its tone. Pixel art among HD faces, the size of a sprite's pixel drawn
   * at pixel: 4 (a fence, a crate in an HD diorama). Its outline a block thick, and only under it and on
   * the side away from the light (a selective outline): a board 3 blocks wide stays lit edge, board,
   * shade, where an outline all round would leave one block of it
   */
  block?: number;
  /**
   * its faces eaten by holes as the dissolve effect eats a sprite: noise in blobs `scale` m wide
   * (default 0.25), `progress` the share gone (0..1), a band of the `edge` key `width` of the noise wide
   * round the holes (it gives light: drawn as it is). What the holes leave shows what is behind them
   * and lets the sun through: the face's shadow has the same holes
   */
  dissolve?: { progress: number; scale?: number; seed?: number; edge?: unknown; width?: number; pattern?: string; ragged?: number; at?: V3; mask?: string; look?: string; char?: unknown; glow?: number };
}
export interface MeshSprite {
  /** an asset's name (an animation plays on the scene's clock) */
  name: string;
  /** where its pivot (its feet) stands, in m: [x, z] on the ground, or [x, z, up]; or a function of the time (ms on the clock) giving it, none where it is not */
  at: [number, number] | V3 | ((t: number) => [number, number] | V3 | null | undefined);
  /** a name for its sockets: a spell's `from: "hero.hand"`, a stamp's `at` */
  id?: string;
  /** copies of it at past moments (`at` a function of the time): [n, ms apart, fade]: blended (as it is, else "alpha"), each fainter by fade, no light, no shadow */
  ghosts?: [number, number, number];
  /** of a family named by the compass (a turnaround, rig3d's moves), the one nearest this heading, as a stamp's */
  heading?: number | [number, number];
  flip?: "x";
  frame?: number;
  /** an animation's own time in its loop and random choices, as a stamp's (a tree swaying out of step) */
  delay?: number;
  rdelay?: boolean;
  seed?: number;
  reseed?: boolean | number;
  /** effects on this sprite alone, as a stamp's `fx` */
  fx?: unknown;
  /** the contact shadow's radius in m, 0 for none (default: a third of the sprite's width; none for a blended one) */
  shadow?: number;
  /**
   * smoke, an aura, energy: its pixels laid over what is behind them by their alpha (times `opacity`)
   * instead of cut at half: "alpha" (over, lit by the world's light), "add" or "screen" (light, drawn
   * as it is). Drawn after everything solid, the farthest first; what stands in front still hides it;
   * it hides nothing and casts no shadow
   */
  blend?: "alpha" | "add" | "screen";
  opacity?: number;
  /** a blended "alpha" sprite's faint shadow: the share of the sun its pixels hold back, by their alpha (times `opacity`; 0.3 a thin smoke; default 0, none) */
  veil?: number;
  /** its feet on the model: on the highest face looking up under [x, z] (true), or on those materials' (its up from them) */
  stand?: boolean | string[];
  /** it flies (a gull, a leaf, a spell): check doesn't ask its feet to be on the model */
  air?: boolean;
  /**
   * the light its emitting pixels (effect("emit")) give round it, a lamp at their middle: how far (m,
   * default 3), how strong (default 1); `each`: a lamp for each part that glows apart from the others
   * (two lanterns on a beam), the strength shared by their pixels; false for none
   */
  light?: false | { r?: number; strength?: number; each?: boolean };
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
  /** the sun's shadows (default true); without a sun, the light's (not a light function's, unless true): a ramp face a step down where something stands between it and the light */
  shadows?: boolean;
  /** an orthographic view (surface()'s): px to the meter (default 16) */
  ppm?: number;
  /** the sprites whose `at` has no up stand on the model: on the highest face looking up under them (true), or on those materials' */
  stand?: boolean | string[];
  /** an orthographic view: where the points' [0, 0, 0] lands, [x, y] px (default the middle of the bottom edge, or the view's origin) */
  at?: number[];
  /** drawn into the depth what is drawn already left (a second mesh, draw3d's): hidden behind what is nearer, outlined against it as against another material */
  over?: boolean;
}
export interface MeshCanvas {
  img: { w: number; h: number; depth?: Float32Array; emit?: Uint8Array };
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
  /** a dissolving material's mask (pattern "mask"), by material */
  masks?: Record<string, Img>;
  /** a dissolving material's look, its keys resolved: the edge's keys over the progress (or the neutral ring's tone), its char, its glow */
  looks?: Record<string, { over?: Color[][]; neutral?: Color; char?: { width: number; tones: Color[]; amount: number; desat: number }; glow: number }>;
  sprites: { name: string; img: Img; at: V3; shadow?: number; blend?: MeshSprite["blend"]; opacity?: number; veil?: number; light?: MeshSprite["light"]; air?: boolean }[];
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
  // a polygon [[x, z], ...] raised from u0 to u1, its top of one material and its sides of another (a
  // block on the ground, a deck, a post of n sides): no bottom
  const prism = (top: string, side: string, pts: number[][], u0: number, u1: number) => {
    if (!Array.isArray(pts) || pts.length < 3 || !pts.every((p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite)) || !Number.isFinite(u0) || !Number.isFinite(u1))
      throw new PxError(`model: prism(top, side, [[x, z], ...] (3 or more), u0, u1), got ${JSON.stringify([pts, u0, u1])?.slice(0, 120)}`);
    face(top, ...pts.map(([x, z]): V3 => [x, z, u1]));
    pts.forEach(([x, z], i) => { const [x2, z2] = pts[(i + 1) % pts.length]; face(side, [x, z, u0], [x2, z2, u0], [x2, z2, u1], [x, z, u1]); });
  };
  // a square stick from a to b, r half its width (a spar, a rope, a rail)
  const stick = (mat: string, a: V3, b: V3, r = 0.05) => {
    const D = unit(sub(b, a)), e1 = unit(cross(D, Math.abs(D[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0])), e2 = cross(D, e1);
    const at = (p: V3, s: number, t: number): V3 => [p[0] + (e1[0] * s + e2[0] * t) * r, p[1] + (e1[1] * s + e2[1] * t) * r, p[2] + (e1[2] * s + e2[2] * t) * r];
    const sq = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    sq.forEach(([s, t], i) => { const [s2, t2] = sq[(i + 1) % 4]; face(mat, at(a, s, t), at(a, s2, t2), at(b, s2, t2), at(b, s, t)); });
  };
  return { faces, face, strip, loft, box, prism, stick };
}
/** A point turned th radians about the axis through c along the unit way d, then lifted (up) by lift: a hull rolling, its riders with it. */
export function turnPoint([x, z, u]: V3, c: V3, d: V3, th: number, lift = 0): V3 {
  const v = [x - c[0], z - c[1], u - c[2]], cs = Math.cos(th), sn = Math.sin(th), k = d[0] * v[0] + d[1] * v[1] + d[2] * v[2];
  const cr = [d[1] * v[2] - d[2] * v[1], d[2] * v[0] - d[0] * v[2], d[0] * v[1] - d[1] * v[0]];
  return [0, 1, 2].map((e) => c[e] + v[e] * cs + cr[e] * sn + d[e] * k * (1 - cs) + (e === 2 ? lift : 0)) as V3;
}
/** Faces turned so (turnPoint each corner): a ship on its bob, a boat. */
export const turnFaces = (faces: Face[], c: V3, d: V3, th: number, lift = 0): Face[] => faces.map((F) => ({ mat: F.mat, pts: F.pts.map((q) => turnPoint(q, c, d, th, lift)) }));

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = (a: V3): V3 => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
/** A face's normal from its first corners that turn: three in a line (a plan starting midway along a straight edge) give none. */
export const faceNormal = (p: V3[]): V3 => {
  for (let i = 1; i + 1 < p.length; i++) {
    const a = sub(p[i], p[0]), b = sub(p[i + 1], p[0]), n = cross(a, b);
    if (dot(n, n) > 1e-12 * dot(a, a) * dot(b, b)) return unit(n);
  }
  return unit(cross(sub(p[1], p[0]), sub(p[2], p[0])));
};
const mod = (a: number, n: number) => ((a % n) + n) % n;
/** Nearer than this (m along the camera's axis) is cut off: a face reaching behind the eye is drawn up to it. */
const NEAR = 0.05;

/** An orthographic view's depth goes on from this far, so the rasterizer's division by depth stays affine; taken off again in the depth it leaves. */
const ORTHO = 1000;
/**
 * The camera as a function from a point to [col, row, depth], where its eye is, which way is up and
 * where the light comes from by default (from the upper left, behind the eye). Through perspective(),
 * points are the world's [x, z, up], as solid's; through an orthographic view as surface()'s ("side",
 * "top", "iso", { kind, yaw, pitch, origin, grid }), the world's [x, y ahead, z up] at `ppm` px to the
 * meter, its origin at `at` px; a function of one's own takes points in the camera's frame, [x right,
 * y up, z ahead] from the eye.
 */
function camera(view: unknown, c: MeshCanvas, o: MeshOpts): { project: Project; eye: V3; up: V3; light: V3; P?: Perspective; right?: V3; near: number; off: number } {
  if (typeof view === "function") return { project: view as Project, eye: [0, 0, 0], up: [0, 1, 0], light: [-0.5, 0.7, -0.5], near: NEAR, off: 0 };
  if (typeof view === "string" || (view && typeof view === "object" && !("horizon" in view))) {
    const pr = projection(view as never, o.ppm, undefined, undefined, "mesh"), { a, b, D, R, U, F } = pr;
    const origin = typeof view === "object" ? (view as { origin?: number[] }).origin : undefined, [ax, ay] = o.at ?? origin ?? [c.img.w / 2 - c.ox, c.img.h - c.oy];
    if (!(Number.isFinite(ax) && Number.isFinite(ay))) throw new PxError(`mesh: at is where the points' [0, 0, 0] lands, [x, y] px, got ${JSON.stringify(o.at)}`);
    const L = [-0.55 * R[0] + 0.55 * U[0] - 0.6 * F[0], -0.55 * R[1] + 0.55 * U[1] - 0.6 * F[1], -0.55 * R[2] + 0.55 * U[2] - 0.6 * F[2]] as V3;
    return { project: (q) => [ax + dot(q, a), ay + dot(q, b), dot(q, D) + ORTHO], eye: [-D[0] * 1e6, -D[1] * 1e6, -D[2] * 1e6], up: [0, 0, 1], light: L, right: R, near: -Infinity, off: ORTHO };
  }
  if (o.ppm !== undefined || o.at !== undefined) throw new PxError("mesh: ppm and at are for an orthographic view (\"side\", \"top\", \"iso\" or { kind, ... }); through a perspective() view the points stand where they are");
  const P: Perspective = perspective({ ...(view as View), w: (view as View).w ?? c.img.w });
  return { project: ([x, z, u]) => [...P.ground(x, z, u), P.focal / P.scale(z, x, u)], eye: [0, 0, P.eye], up: [0, 0, 1], light: [-0.5, -0.5, 0.7], P, near: NEAR, off: 0 };
}

/** The part of a face in front of the near plane (depth is linear in the points, so cut where it crosses). */
function clipNear(pts: V3[], P: [number, number, number][], project: Project, NEAR: number): [V3[], [number, number, number][]] {
  const out: V3[] = [];
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length, a = pts[i], b = pts[j], da = P[i][2], db = P[j][2];
    if (da >= NEAR) out.push(a);
    if ((da >= NEAR) !== (db >= NEAR)) { const t = (NEAR - da) / (db - da); out.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]), a[2] + t * (b[2] - a[2])]); }
  }
  return [out, out.map(project)];
}

/** Draw the faces, then the sprites among them; gives where each sprite landed (canvas coords), for describe. */
/**
 * What stands on a model ([x, z, up] points): the faces looking up (less than 60 degrees from level)
 * under a point [x, z], each its height there and its material.
 */
export function groundOf(faces: Face[]): (x: number, z: number) => { u: number; mat: string }[] {
  const T: number[] = [], M: string[] = [];
  for (const F of faces) {
    const p = F?.pts;
    if (!p || p.length < 3) continue;
    if (Math.abs(faceNormal(p)[2]) < 0.5) continue;
    for (let t = 1; t + 1 < p.length; t++) { T.push(...p[0], ...p[t], ...p[t + 1]); M.push(F.mat); }
  }
  return (x, z) => {
    const out: { u: number; mat: string }[] = [];
    for (let i = 0, k = 0; i < T.length; i += 9, k++) {
      const ax = T[i], az = T[i + 1], bx = T[i + 3] - ax, bz = T[i + 4] - az, cx = T[i + 6] - ax, cz = T[i + 7] - az, d = bx * cz - bz * cx;
      if (Math.abs(d) < 1e-12) continue;
      const v = ((x - ax) * cz - (z - az) * cx) / d, w = (bx * (z - az) - bz * (x - ax)) / d;
      if (v >= -1e-9 && w >= -1e-9 && v + w <= 1 + 1e-9) out.push({ u: T[i + 2] + v * (T[i + 5] - T[i + 2]) + w * (T[i + 8] - T[i + 2]), mat: M[k] });
    }
    return out;
  };
}

export function drawMesh(c: MeshCanvas, view: unknown, faces: Face[], mats: Record<string, Material>, opts: MeshOpts = {}, world?: MeshWorld): { name: string; x: number; y: number; img: Img; light?: [number, number]; at?: V3; air?: boolean; k?: number }[] {
  const W = c.img.w, H = c.img.h, x0 = -c.ox, y0 = -c.oy, cam = camera(view, c, opts), eye = cam.eye;
  const sunDir = unit(Array.isArray(opts.light) ? (opts.light as V3) : cam.light);
  const lightOf = typeof opts.light === "function" ? opts.light : (n: V3) => 0.3 + 0.6 * Math.max(0, dot(n, sunDir));
  const ramps: Record<string, string[]> = {};
  // a texel's size across and down; "screen": a texel to a pixel where the camera looks, on a floor or a wall by the face
  const look = (view && typeof view === "object" && "floor" in view ? view : cam.P) as { floor?: [number, number]; wall?: [number, number] } | undefined;
  const texelOf = (M: Material, floor: boolean): [number, number] => M.texel === "screen" ? (floor ? look!.floor! : look!.wall!) : Array.isArray(M.texel) ? M.texel : [M.texel ?? 1 / 16, M.texel ?? 1 / 16];
  for (const [name, M] of Object.entries(mats)) {
    if (M?.block !== undefined && !(Number.isInteger(M.block) && M.block >= 1)) throw new PxError(`mesh: material '${name}' has block ${JSON.stringify(M.block)}: how many px to one of its pixels, a whole number from 1`);
    if (M?.tex !== undefined) {
      const t = M.texel;
      if (!(t === undefined || (typeof t === "number" && t > 0) || (Array.isArray(t) && t.length === 2 && t[0] > 0 && t[1] > 0) || (t === "screen" && look?.floor)))
        throw new PxError(`mesh: material '${name}' has texel ${JSON.stringify(t)}: a texel's size in m, above 0 (1/16: a 16 px tile to the meter), or two, across and down, or "screen" (through a perspective() camera looking down)`);
      ramps[name] = M.ramp ? [...M.ramp] : [];
      continue;
    }
    if (!M || !(typeof M.ramp === "string" || Array.isArray(M.ramp)) || M.ramp.length === 0) throw new PxError(`mesh: material '${name}' needs a ramp of keys, dark to light (e.g. { ramp: "0-=~^" }), or a tex (an asset to tile its faces with)`);
    ramps[name] = [...M.ramp];
  }
  // per pixel: the nearest face's depth and index, and the point of it seen there (textures, shadows)
  const n = W * H, depth = new Float32Array(n).fill(1e9), who = new Int32Array(n).fill(-1), pos = new Float32Array(n * 3);
  // over a depth already drawn: each pixel there as near as what is there, of none of these faces (-2)
  const had = opts.over ? c.img.depth : undefined;
  if (had) for (let i = 0; i < n; i++) if (had[i] < Infinity) { depth[i] = had[i] + cam.off; who[i] = -2; }
  const normals: V3[] = [], lights: number[] = [];
  // which coordinate is up, and which runs away from the camera: [x, z, up] through perspective(), [x, y up, z ahead]
  // otherwise; per textured face, the coordinates its texture runs across and down (a floor across and
  // away, a wall across and down), where it starts, and whether it has holes
  const UP = cam.up[2] ? 2 : 1, AHEAD = UP === 2 ? 1 : 2;
  // which way on the picture is away from the light (a block material's outline is on that side)
  const camRight: V3 = cam.P ? [Math.cos((cam.P.yaw * Math.PI) / 180), -Math.sin((cam.P.yaw * Math.PI) / 180), 0] : cam.right ?? [1, 0, 0], away = dot(sunDir, camRight) < 0 ? 1 : -1;
  const texOf: ({ T: Img; su: number; sv: number; ua: number; va: number; u0: number; v0: number; holes: boolean } | undefined)[] = [];
  const holed = new Map<Img, boolean>();
  const texel = (t: NonNullable<(typeof texOf)[number]>, X: number, Y: number, Z: number) => {
    const P = [X, Y, Z], u = (P[t.ua] - t.u0) * t.su + 1e-6, v = (-P[t.va] - t.v0) * t.sv + 1e-6;
    return mod(Math.floor(v), t.T.h) * t.T.w + mod(Math.floor(u), t.T.w);
  };
  // a dissolving material's coverage at a point of its face, read across the face's two other axes
  // (on the texture's texels when it has one): 0 there, 1 a hole, 2 the burning edge
  const holes = new Map<string, (X: number, Y: number, Z: number, N: V3) => number>();
  for (const [name, M] of Object.entries(mats)) {
    const D = M?.dissolve;
    if (!D) continue;
    const { progress, scale = 0.25, seed = 0, width = 0.06, pattern = "noise", ragged = 0.25 } = D;
    if (!(typeof progress === "number" && progress >= 0 && progress <= 1) || !(scale > 0) || !Number.isInteger(seed) || !(width >= 0 && width <= 1) || !PATTERNS.includes(pattern) || !(ragged >= 0 && ragged <= 1)
      || (D.at !== undefined && !(Array.isArray(D.at) && D.at.length === 3 && D.at.every(Number.isFinite))) || (pattern === "mask" && !world?.masks?.[name]))
      throw new PxError(`mesh: material '${name}' has dissolve ${JSON.stringify(D)}: { progress (0..1), scale (m, above 0), seed (whole), edge (a key), width (0..1), pattern (${PATTERNS.join(", ")}), ragged (0..1), at ([x, z, up]), mask (an asset, for pattern "mask") }`);
    const lk = world?.looks?.[name], ch = lk?.char, w = lk?.over || lk?.neutral ? width : 0, cw = ch ? 0.03 * ch.width : 0, f = noise(seed), thr = -w + progress * (1 + w);
    const TF = texelOf(M, true), TW = texelOf(M, false), snap = M.tex !== undefined;
    // the extent of its faces, for the sweeps, the radial order and the mask
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    for (const F of faces) if (F?.mat === name) for (const p of F.pts) for (let e = 0; e < 3; e++) { lo[e] = Math.min(lo[e], p[e]); hi[e] = Math.max(hi[e], p[e]); }
    const span = (e: number, v: number) => (v - lo[e]) / Math.max(1e-9, hi[e] - lo[e]), ctr = D.at ?? [0, 1, 2].map((e) => (lo[e] + hi[e]) / 2);
    const far = Math.max(1e-9, ...[0, 1, 2, 3, 4, 5, 6, 7].map((c) => Math.hypot(...[0, 1, 2].map((e) => ((c >> e) & 1 ? hi[e] : lo[e]) - ctr[e]))));
    const mask = world?.masks?.[name];
    holes.set(name, (X, Y, Z, N) => {
      if (progress <= 0) return 0;
      const P = [X, Y, Z], a = [0, 1, 2].reduce((m, e) => (Math.abs(N[e]) > Math.abs(N[m]) ? e : m), 0), [ua, va] = a === 0 ? [1, 2] : a === 1 ? [0, 2] : [0, 1], [tu, tv] = a === UP ? TF : TW;
      const u = snap ? (Math.floor(P[ua] / tu) + 0.5) * tu : P[ua], v = snap ? (Math.floor(P[va] / tv) + 0.5) * tv : P[va], nz = f(u / scale, v / scale);
      // (on its texels, as the noise is: snapped where it has a texture)
      const Q = [X, Y, Z];
      if (snap) { Q[ua] = u; Q[va] = v; }
      const rag = (pos: number) => Math.min(0.9999, Math.max(0, pos * (1 - ragged) + ragged * nz)), up = span(UP, Q[UP]), across = span(a === 0 ? AHEAD : 0, Q[a === 0 ? AHEAD : 0]);
      const o = pattern === "top" ? rag(1 - up) : pattern === "bottom" ? rag(up) : pattern === "left" ? rag(across) : pattern === "right" ? rag(1 - across)
        : pattern === "out" || pattern === "in" ? rag(Math.abs((pattern === "in" ? 1 : 0) - Math.hypot(Q[0] - ctr[0], Q[1] - ctr[1], Q[2] - ctr[2]) / far))
        : pattern === "scatter" ? hash(Math.floor(u / (snap ? tu : scale / 4)), Math.floor(v / (snap ? tv : scale / 4)), seed + a * 7919) / 4294967296
        : pattern === "scan" ? (SCAN[((Math.floor(Q[UP] / (snap ? tv : scale / 4)) % 4) + 4) % 4] + Math.min(0.9999, 1 - up)) / 4
        : pattern === "mask" ? (() => { const c = mask!.get(Math.floor(across * mask!.w), Math.floor((1 - up) * mask!.h)); return c === TRANSPARENT ? 0.9999 : Math.min(0.9999, (0.2126 * (c >>> 24) + 0.7152 * ((c >>> 16) & 255) + 0.0722 * ((c >>> 8) & 255)) / 255); })()
        : nz;
      // a hole; the edge (2 and up: 2 + its band's place, 0..1); the char ahead of it (-t, its strength)
      return o < thr ? 1 : o < thr + w ? 2 + (o - thr) / w : o < thr + w + cw ? -(1 - (o - thr - w) / cw) : 0;
    });
  }
  const burn = holes.size ? new Float32Array(W * H) : undefined;
  faces.forEach((F, k) => {
    if (!F || !Array.isArray(F.pts) || F.pts.length < 3) throw new PxError(`mesh: face ${k} needs a material and 3 or more corners, { mat, pts: [[x, y, z], ...] } (model().face(mat, ...points))`);
    const M = mats[F.mat];
    if (!M) throw new PxError(`mesh: face ${k} is of material '${F.mat}', which mats doesn't have (it has: ${Object.keys(mats).join(", ")})`);
    const N = faceNormal(F.pts);
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
      const [tu, tv] = texelOf(M, a === UP);
      texOf[k] = { T, su: 1 / tu, sv: 1 / tv, ua, va, u0: face ? Math.min(...F.pts.map((p) => p[ua])) : 0, v0: face ? Math.min(...F.pts.map((p) => -p[va])) : 0, holes: holed.get(T)! };
    }
    const tk = texOf[k], Bk = M.block ?? 1, hk = holes.get(F.mat);
    let pts = F.pts, P = pts.map(cam.project);
    if (P.some((p) => p[2] < cam.near)) [pts, P] = clipNear(pts, P, cam.project, cam.near);
    for (let t = 1; t + 1 < P.length; t++) {
      const [a, b, d] = [P[0], P[t], P[t + 1]], [A, B, D] = [pts[0], pts[t], pts[t + 1]];
      const Az = A.map((v) => v / a[2]), Bz = B.map((v) => v / b[2]), Dz = D.map((v) => v / d[2]);
      const area = (b[0] - a[0]) * (d[1] - a[1]) - (b[1] - a[1]) * (d[0] - a[0]);
      if (Math.abs(area) < 1e-6) continue;
      // (in blocks: every pixel of a block whose middle the face covers)
      const lo = (v: number) => Math.floor(Math.floor(v) / Bk) * Bk, hi = (v: number) => Math.ceil((Math.ceil(v) + 1) / Bk) * Bk - 1;
      const xa = Math.max(x0, lo(Math.min(a[0], b[0], d[0]))), xb = Math.min(x0 + W - 1, hi(Math.max(a[0], b[0], d[0])));
      const ya = Math.max(y0, lo(Math.min(a[1], b[1], d[1]))), yb = Math.min(y0 + H - 1, hi(Math.max(a[1], b[1], d[1])));
      for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++) {
        const px = Bk > 1 ? Math.floor(x / Bk) * Bk + Bk / 2 : x + 0.5, py = Bk > 1 ? Math.floor(y / Bk) * Bk + Bk / 2 : y + 0.5;
        const w1 = ((d[0] - a[0]) * (py - a[1]) - (d[1] - a[1]) * (px - a[0])) / -area, w2 = ((b[0] - a[0]) * (py - a[1]) - (b[1] - a[1]) * (px - a[0])) / area;
        const w0 = 1 - w1 - w2;
        if (w0 < -1e-4 || w1 < -1e-4 || w2 < -1e-4) continue;
        const z = 1 / (w0 / a[2] + w1 / b[2] + w2 / d[2]), i = (y - y0) * W + (x - x0);
        if (z >= depth[i]) continue;
        // the point seen, interpolated in perspective; through a hole in its texture, not this face
        const X = (w0 * Az[0] + w1 * Bz[0] + w2 * Dz[0]) * z, Y = (w0 * Az[1] + w1 * Bz[1] + w2 * Dz[1]) * z, Z = (w0 * Az[2] + w1 * Bz[2] + w2 * Dz[2]) * z;
        if (tk?.holes && (tk.T.data[texel(tk, X, Y, Z)] & 255) < 128) continue;
        const hole = hk ? hk(X, Y, Z, N) : 0;
        if (hole === 1) continue;
        if (burn) burn[i] = hole;
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
  if ((L || world?.sprites.length) && !cam.P) throw new PxError(`mesh: ${L ? "a sun" : "sprites"} need a perspective view ({ w, horizon, eye, ... }), not ${cam.off ? "an orthographic one" : "a camera function"}`);
  const feet = (world?.sprites ?? []).map((s) => cam.project(s.at)), perM = feet.map((f) => cam.P!.focal / f[2]);
  // a sprite's right, the world's up, and its face (toward the camera, level)
  const yaw = cam.P ? (cam.P.yaw * Math.PI) / 180 : 0, right: V3 = [Math.cos(yaw), -Math.sin(yaw), 0], front: V3 = [-Math.sin(yaw), -Math.cos(yaw), 0];
  // what gives light (effect("emit")) lights what is round it: a lamp at the middle of each sprite's
  // emitting pixels (or of each part of them apart from the rest), in their color, as strong as they shine
  if (L && world) {
    const glows: Lamp[] = [];
    world.sprites.forEach((s, k) => {
      const e = s.img.emit, img = s.img;
      if (!e || s.light === false) return;
      const o = s.light ?? {}, R = o.r ?? 3, S = o.strength ?? 1;
      if (!(R > 0) || !(S >= 0)) throw new PxError(`mesh: sprite '${s.name}' has light ${JSON.stringify(s.light)}: false, or { r (m, above 0), strength (0 up), each }`);
      const on = (q: number) => e[q] > 0 && (img.data[q] & 255) !== 0;
      // each part: the glowing pixels touching (8 ways), found by a flood; else all of them as one
      const part = new Int32Array(e.length).fill(-1);
      let parts = 0;
      for (let q0 = 0; q0 < e.length; q0++) {
        if (!on(q0) || part[q0] >= 0) continue;
        if (!o.each) { part[q0] = 0; parts = 1; continue; }
        const id = parts++, todo = [q0];
        part[q0] = id;
        while (todo.length) {
          const q = todo.pop()!, x = q % img.w, y = (q - x) / img.w;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const X = x + dx, Y = y + dy, j = Y * img.w + X;
            if (X >= 0 && Y >= 0 && X < img.w && Y < img.h && part[j] < 0 && on(j)) { part[j] = id; todo.push(j); }
          }
        }
      }
      if (!parts) return;
      const acc = Array.from({ length: parts }, () => [0, 0, 0, 0, 0, 0]);
      let n0 = 0;
      for (let q = 0; q < e.length; q++) {
        if (part[q] < 0) continue;
        const c = img.data[q], wq = e[q] / 255, A = acc[part[q]];
        n0++; A[0] += wq; A[1] += wq * (q % img.w); A[2] += wq * Math.floor(q / img.w);
        A[3] += wq * LIN[c >>> 24]; A[4] += wq * LIN[(c >>> 16) & 255]; A[5] += wq * LIN[(c >>> 8) & 255];
      }
      const [px, py] = img.pivot ?? [img.w / 2, img.h], m = K / perM[k], k2 = S / n0;
      for (const [t, si, sj, r, g, b] of acc) {
        const a = (si / t + 0.5 - px) * m;
        glows.push({ at: [s.at[0] + right[0] * a, s.at[1] + right[1] * a, s.at[2] + (py - sj / t - 0.5) * m], rgb: [r * k2, g * k2, b * k2], r: R });
      }
    });
    if (glows.length) L.lamps = [...L.lamps, ...glows];
  }
  let sunMap: SunMap | undefined;
  // (without a sun, cast from `light`: not from a light function, which has no way it comes from)
  if (L ? L.shadows : opts.shadows ?? typeof opts.light !== "function") {
    const seen = (visit: (x: number, y: number, z: number) => void) => {
      for (let i = 0; i < n; i += 4) if (who[i] >= 0) visit(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
      for (const s of world?.sprites ?? []) visit(...s.at);
    };
    // 1024 cells across what is seen (2048 for a picture that big): a few cm on a diorama, so a shadow
    // starts at the foot of what throws it
    sunMap = new SunMap(sunDir, seen, Math.min(2048, Math.max(1024, Math.max(W, H) / 2)));
    if (L) L.map = sunMap;
    faces.forEach((F, k) => {
      const tk = texOf[k];
      for (let t = 1; t + 1 < F.pts.length; t++) {
        const [A, B, D] = [F.pts[0], F.pts[t], F.pts[t + 1]];
        // (a texture's holes let the sun through, and so do a dissolve's)
        const hl = holes.get(F.mat), Nk = normals[k];
        const keep = tk?.holes || hl ? (w0: number, w1: number, w2: number) => {
          const X = w0 * A[0] + w1 * B[0] + w2 * D[0], Y = w0 * A[1] + w1 * B[1] + w2 * D[1], Z = w0 * A[2] + w1 * B[2] + w2 * D[2];
          return !(tk?.holes && (tk.T.data[texel(tk, X, Y, Z)] & 255) < 128) && !(hl && hl(X, Y, Z, Nk) === 1);
        } : undefined;
        sunMap!.tri(A, B, D, k, keep);
      }
    });
    // (a blended sprite, smoke or light, throws none)
    world?.sprites.forEach((s, k) => {
      if (!s.blend) sunMap!.sprite(s.img, s.at, K / perM[k], -2 - k, right);
      else if (s.veil) sunMap!.sprite(s.img, s.at, K / perM[k], -2 - k, right, s.veil * (s.opacity ?? 1));
    });
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
    const F = faces[k], M = mats[F.mat], r = ramps[F.mat], N = normals[k], B = M.block ?? 1, bx = Math.floor((x + x0) / B), by = Math.floor((y + y0) / B);
    // a dissolving face's edge in its keys of the moment, drawn as it is (the neutral one and the char after)
    const lk = burn?.[i] && burn[i] >= 2 ? world?.looks?.[F.mat] : undefined;
    if (lk?.over) {
      const keys = lk.over[Math.min(lk.over.length - 1, Math.floor(M.dissolve!.progress * lk.over.length))];
      c.plot(x + x0, y + y0, keys[Math.min(keys.length - 1, Math.floor((burn![i] - 2) * keys.length))]);
      if (lk.glow) (c.img.emit ??= new Uint8Array(n))[i] = Math.round(255 * lk.glow);
      continue;
    }
    // a floor reads the texture across and away, a wall across and down; light steps each texel along its ramp
    const texCol = () => {
      const tk = texOf[k]!, lit = L ? tk.T.data : litTex(k, tk.T);
      let col = lit[texel(tk, pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2])];
      if (col !== TRANSPARENT && L) {
        const px = pos[i * 3], py = pos[i * 3 + 1], pz = pos[i * 3 + 2], facing = dot(N, L.dir);
        col = shine(col, N, px, py, pz, L, facing > 0 && (!sunMap || sunMap.sun(px, py, pz, k, facing)), 0);
      }
      return col;
    };
    if (M.tex !== undefined && M.edge === undefined) {
      const col = texCol();
      if (col === TRANSPARENT) continue;
      if (c.raw) c.raw[i] = col;
      else c.plot(x + x0, y + y0, col);
      continue;
    }
    // an outline where this surface is in front of another or of nothing; a crease where faces meet
    let line: string | null = null;
    for (const [dx, dy] of B > 1 ? [[away * B, 0], [0, B]] : [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
      const j = yy * W + xx, k2 = who[j];
      if (k2 === k) continue;
      if (k2 === -1 || depth[j] > depth[i] * 1.06) { line = M.edge ?? r[0]; break; }
      const same = k2 >= 0 && faces[k2].mat === F.mat;
      if (!same && depth[j] >= depth[i]) line = line ?? M.edge ?? r[0];
      else if (same && !M.smooth && dot(N, normals[k2]) < 0.82 && depth[j] >= depth[i]) line = line ?? r[0];
    }
    if (M.tex !== undefined) {
      // its outline, and inside it the texture
      if (line) c.px(x + x0, y + y0, line);
      else { const col = texCol(); if (col !== TRANSPARENT) c.plot(x + x0, y + y0, col); }
      continue;
    }
    let lv = Math.max(0, Math.min(r.length - 1, Math.floor(lights[k] * r.length + (bayer(bx, by) - 0.5) * (M.dither ?? 0))));
    // without a sun: a step down the ramp where something stands between it and the light
    // (never into its darkest, the line's tone: no dark specks inside a form)
    if (sunMap && !L) { const f = dot(N, sunDir); if (f > 0 && lv > 1 && !sunMap.sees(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2], k, f)) lv--; }
    // the top edge of a surface, just under its outline, catches the light: a step lighter
    const up1 = y >= B ? who[i - B * W] : -1, up2 = y >= 2 * B ? who[i - 2 * B * W] : -1;
    const rim = !line && up1 === k && (up2 === -1 || (up2 !== k && depth[i - 2 * B * W] > depth[i] * 1.06)) && dot(N, cam.up) > -0.3;
    const tx = M.texture && !line && !rim ? Math.round(M.texture(B > 1 ? bx : x + x0, B > 1 ? by : y + y0)) : 0;
    c.px(x + x0, y + y0, line ?? (rim ? M.top ?? r[Math.min(r.length - 1, lv + 1)] : r[Math.max(0, Math.min(r.length - 1, lv + tx))]));
  }
  // the char ahead of a dissolving face's edge, and the neutral ring: over what the face drew
  if (burn)
    for (let i = 0; i < n; i++) {
      const b = burn[i], k = who[i];
      if (!b || k < 0 || b === 1) continue;
      const lk = world?.looks?.[faces[k].mat], x = (i % W) + x0, y = Math.floor(i / W) + y0, col = c.get(x, y);
      if (!lk || col === TRANSPARENT) continue;
      if (b >= 2 && lk.neutral !== undefined) c.plot(x, y, toward(col, lk.neutral, 0.5 * (1 - Math.max(0, (mats[faces[k].mat].dissolve!.progress - 0.85) / 0.15))));
      else if (b < 0 && lk.char) c.plot(x, y, toward(col, lk.char.tones[Math.min(lk.char.tones.length - 1, Math.floor(-b * lk.char.tones.length))], lk.char.amount * -b, lk.char.desat));
    }
  const keep = () => {
    // the depth stays on the image for post(); a second mesh() keeps the nearer of the two
    const d = (c.img.depth ??= new Float32Array(n).fill(Infinity));
    for (let i = 0; i < n; i++) if (who[i] !== -1 && depth[i] - cam.off < d[i]) d[i] = depth[i] - cam.off;
  };
  if (!world?.sprites.length) { keep(); return []; }
  const placed: { name: string; x: number; y: number; img: Img; light?: [number, number]; at: V3; air?: boolean; k: number }[] = [];
  // contact shadows: what each sprite stands on, two steps darker in the middle and one out to the
  // radius (the darkest where two overlap)
  const shade = new Uint8Array(n);
  world.sprites.forEach((s, k) => {
    const [fx, fz, fu] = s.at, R = s.shadow ?? (s.blend ? 0 : (s.img.w * K) / 2.5 / perM[k]);
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
  // the sprites: upright at their feet, a pixel to K x K px, each row as deep as that height above the
  // feet; a pixel less than half opaque is cut (it neither shows nor hides what's behind). The
  // blended ones after all the solid ones, the farthest first, over what is drawn by their alpha
  const order = world.sprites.map((_, k) => k).filter((k) => !world.sprites[k].blend);
  order.push(...world.sprites.map((_, k) => k).filter((k) => world.sprites[k].blend).sort((a, b) => feet[b][2] - feet[a][2]));
  for (const k of order) {
    const s = world.sprites[k], { img } = s, [px, py] = img.pivot ?? [img.w / 2, img.h], m = K / perM[k], e = img.emit;
    const X0 = Math.round(feet[k][0] - px * K), Y0 = Math.round(feet[k][1] - py * K);
    // in the world's light, each of its pixels lit the first time it shows: where it stands on the
    // sprite's plane, which way it faces (0: not lit yet; a lit color is never 0, its alpha isn't)
    const lit = L ? new Uint32Array(img.data.length) : undefined, nm = img.norm, blend = s.blend, opacity = s.opacity ?? 1;
    const colorAt = (q: number, i: number, j: number) => {
      if (!lit || e?.[q]) return img.data[q];
      if (lit[q]) return lit[q];
      const col = img.data[q], a = (i + 0.5 - px) * m, X = s.at[0] + right[0] * a, Y = s.at[1] + right[1] * a, U = s.at[2] + (py - j - 0.5) * m;
      const has = nm && nm[q * 3 + 2] > 0, nx = has ? nm![q * 3] / 127 : 0, ny = has ? nm![q * 3 + 1] / 127 : 0, nz = has ? nm![q * 3 + 2] / 127 : 1;
      const N = unit([nx * right[0] + nz * front[0], nx * right[1] + nz * front[1], -ny]), facing = dot(N, L!.dir);
      return (lit[q] = shine(col, N, X, Y, U, L!, facing > -0.5 && (!sunMap || sunMap.sun(X, Y, U, -2 - k, Math.max(0.2, facing))), 0.5));
    };
    for (let j = 0; j < img.h * K; j++) {
      const yi = Y0 + j - y0;
      if (yi < 0 || yi >= H) continue;
      // a hair nearer than the feet, so a figure against a wall stays in front of it
      const d = cam.project([s.at[0], s.at[1], s.at[2] + (py * K - j - 0.5) / perM[k]])[2] - 0.02, row = Math.floor(j / K) * img.w;
      for (let i = 0; i < img.w * K; i++) {
        const si = Math.floor(i / K), col = img.data[row + si], xi = X0 + i - x0, q = yi * W + xi;
        if (blend) {
          // over what is drawn there, by its alpha; what stands in front hides it; it hides nothing
          const a = ((col & 255) / 255) * opacity;
          if (a <= 0 || xi < 0 || xi >= W || d >= depth[q]) continue;
          const sc = blend === "alpha" ? colorAt(row + si, si, Math.floor(j / K)) : col, u = c.get(X0 + i, Y0 + j);
          if (u === TRANSPARENT) { c.plot(X0 + i, Y0 + j, ((sc & ~255) | Math.round(a * 255)) >>> 0); continue; }
          const mix = (U: number, S: number) => (blend === "alpha" ? U + (S - U) * a : blend === "add" ? U + S * a : 1 - (1 - U) * (1 - S * a));
          c.plot(X0 + i, Y0 + j, fromLinear(mix(LIN[u >>> 24], LIN[sc >>> 24]), mix(LIN[(u >>> 16) & 255], LIN[(sc >>> 16) & 255]), mix(LIN[(u >>> 8) & 255], LIN[(sc >>> 8) & 255]), u));
          if (e?.[row + si]) (c.img.emit ??= new Uint8Array(n))[q] = Math.max(c.img.emit[q] ?? 0, Math.round(e[row + si] * a));
          continue;
        }
        if ((col & 255) < 128 || xi < 0 || xi >= W || d >= depth[q]) continue;
        depth[q] = d;
        who[q] = -2;
        c.plot(X0 + i, Y0 + j, colorAt(row + si, si, Math.floor(j / K)));
        // what gives light marks the picture, for post()'s bloom
        if (e || c.img.emit) (c.img.emit ??= new Uint8Array(n))[q] = e ? e[row + si] : 0;
      }
    }
    // the way to the light on the picture where it stands, its middle a meter toward the light (none for a light of your own, or one straight at the eye)
    const mid: V3 = [s.at[0], s.at[1], s.at[2] + (py * K) / 2 / perM[k]], a = cam.project(mid), b = cam.project([mid[0] + sunDir[0], mid[1] + sunDir[1], mid[2] + sunDir[2]]);
    const lx = b[0] - a[0], ly = b[1] - a[1], ll = Math.hypot(lx, ly), seen = typeof opts.light !== "function" && ll > 0.25 * perM[k];
    placed.push({ name: s.name, x: X0, y: Y0, img: K > 1 ? img.scale(K) : img, ...(seen ? { light: [lx / ll, ly / ll] as [number, number] } : {}), at: s.at, ...(s.air || s.blend ? { air: true } : {}), k });
  }
  keep();
  return placed;
}
