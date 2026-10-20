// Shapes in meters for perspective scenes (what the park built for itself): sticks (round: trunks,
// limbs, poles, bars), blobs (crowns, heads, wheels), boxes (benches, hedges, buildings), cones (a round
// shape tapering from one end to the other, standing roughly upright: a torso, a skirt, a bin, drawn
// as the hull of its level end rings) and flat polygons. The same shapes draw a thing, far to near
// through the camera, and cast its shadow: each swept onto the ground away from the sun, so the
// shadow has the thing's shape and stays right as it recedes.
import { type Perspective, perspective } from "./perspective.ts";
import { latticeHash } from "./util.ts";

export type V3 = [number, number, number];
export interface Solid {
  /** a stick from a to b, `half` m thick either side */
  a?: V3; b?: V3; half?: number;
  /** a blob around e, rx m either side, ry m above and below */
  e?: V3; rx?: number; ry?: number;
  /** a box [x0, z0, x1, z1, u0, u1], its faces' colors { top, lit, shade, under } */
  box?: [number, number, number, number, number, number]; keys?: Record<string, string>;
  /** a cone from a (radius ra) to b (rb); `wrap`: rings [point, radius] it also goes round */
  cone?: [V3, number, V3, number]; wrap?: [V3, number][];
  /** a flat polygon */
  poly?: V3[];
  key?: string;
  /** drawn a little nearer than its middle (a face over a head); casts only; casts nothing; the share of its shadow that is shade */
  top?: number; ghost?: boolean; noShadow?: boolean; dapple?: number;
}
export interface SolidOpts {
  /** where the eye stands in the world, [x, z] (default 0, 0) */
  at?: [number, number];
  /** the sun: the way toward it along the ground, and how high it stands in degrees */
  sun?: { from: [number, number]; up: number };
  /** px per meter at a world point (default the camera's own) */
  scale?: (x: number, z: number) => number;
  /** drawn on a plate and lit there along these ramps, light from `light` on screen */
  ramps?: string[]; light?: [number, number];
  /** shadows: what each ground color turns into in shade (keys not in it are left) */
  shade?: Record<string, string>;
}
export interface SolidCanvas {
  poly(points: number[], c: string): void;
  ellipse(cx: number, cy: number, rx: number, ry: number, c: string): void;
  line(x0: number, y0: number, x1: number, y1: number, c: string, width?: number): void;
  plate(fn: () => void, opts?: { light?: [number, number]; ramps?: string[] }): void;
}

export const solid = {
  stick: (a: V3, b: V3, half: number, key: string, extra?: Partial<Solid>): Solid => ({ a, b, half, key, ...extra }),
  blob: (e: V3, rx: number, ry: number, key: string, extra?: Partial<Solid>): Solid => ({ e, rx, ry, key, ...extra }),
  box: (b: [number, number, number, number, number, number], keys: Record<string, string>, extra?: Partial<Solid>): Solid => ({ box: b, keys, ...extra }),
  cone: (a: V3, ra: number, b: V3, rb: number, key: string, extra?: Partial<Solid>): Solid => ({ cone: [a, ra, b, rb], key, ...extra }),
  poly: (points: V3[], key: string, extra?: Partial<Solid>): Solid => ({ poly: points, key, ...extra }),
};

function frame(P: Perspective, o: SolidOpts) {
  const [ax, az] = o.at ?? [0, 0], sin = Math.sin((P.yaw * Math.PI) / 180), cos = Math.cos((P.yaw * Math.PI) / 180);
  const ahead = (x: number, z: number) => (x - ax) * sin + (z - az) * cos;
  const at = (x: number, z: number, u = 0) => P.ground(x - ax, z - az, u).map(Math.round) as [number, number];
  const scale = o.scale ?? ((x: number, z: number) => P.scale(z - az, x - ax));
  const f = o.sun?.from ?? [0, 1], l = Math.hypot(f[0], f[1]) || 1, cot = 1 / Math.tan(((o.sun?.up ?? 60) * Math.PI) / 180);
  // the sun's way along the ground, and how far a point u m up throws its shadow
  const sun = [f[0] / l, f[1] / l], sox = -sun[0] * cot, soz = -sun[1] * cot;
  return { ax, az, ahead, at, scale, sun, sox, soz };
}
const ring = ([x, z, u]: V3, r: number): V3[] => Array.from({ length: 10 }, (_, i) => [x + Math.cos((i / 10) * Math.PI * 2) * r, z + Math.sin((i / 10) * Math.PI * 2) * r, u]);
const rings = (q: Solid): V3[] => [[q.cone![0], q.cone![1]] as [V3, number], [q.cone![2], q.cone![3]] as [V3, number], ...(q.wrap ?? [])].flatMap(([p, r]) => ring(p, r));
function mid(q: Solid): [number, number] {
  if (q.box) return [(q.box[0] + q.box[2]) / 2, (q.box[1] + q.box[3]) / 2];
  if (q.e) return [q.e[0], q.e[1]];
  if (q.cone) return [(q.cone[0][0] + q.cone[2][0]) / 2, (q.cone[0][1] + q.cone[2][1]) / 2];
  if (q.poly) return [q.poly.reduce((s, p) => s + p[0], 0) / q.poly.length, q.poly.reduce((s, p) => s + p[1], 0) / q.poly.length];
  return [(q.a![0] + q.b![0]) / 2, (q.a![1] + q.b![1]) / 2];
}
export function hull(pts: number[][]): number[][] {
  pts = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo: number[][] = [], hi: number[][] = [];
  for (const p of pts) { while (lo.length > 1 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (const p of pts.reverse()) { while (hi.length > 1 && cross(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop(); hi.push(p); }
  return lo.slice(0, -1).concat(hi.slice(0, -1));
}

/** Draw shapes far to near: boxes face by face (the faces toward the sun lit), the rest projected. */
export function drawSolids(c: SolidCanvas, P: Perspective, shapes: Solid[], o: SolidOpts = {}): void {
  const F = frame(P, o), depth = (q: Solid) => F.ahead(...mid(q)) - (q.top ?? 0) * 0.02;
  const lit = (nx: number, nz: number) => nx * F.sun[0] + nz * F.sun[1] > 0;
  const go = () => {
    for (const q of [...shapes].sort((m, n) => depth(n) - depth(m))) {
      if (q.ghost) continue;
      if (q.box) {
        // the faces the eye can see: the top from above, a side from the side it's on
        const [x0, z0, x1, z1, u0, u1] = q.box, k = q.keys ?? {}, face = (pts: V3[]) => pts.flatMap(([x, z, u]) => F.at(x, z, u));
        const put = (kind: string, pts: V3[]) => c.poly(face(pts), k[kind] ?? k.shade);
        if (P.eye > u1) put("top", [[x0, z0, u1], [x1, z0, u1], [x1, z1, u1], [x0, z1, u1]]);
        if (P.eye < u0) put("under", [[x0, z0, u0], [x1, z0, u0], [x1, z1, u0], [x0, z1, u0]]);
        if (x0 > F.ax) put(lit(-1, 0) ? "lit" : "shade", [[x0, z0, u0], [x0, z1, u0], [x0, z1, u1], [x0, z0, u1]]);
        if (x1 < F.ax) put(lit(1, 0) ? "lit" : "shade", [[x1, z0, u0], [x1, z1, u0], [x1, z1, u1], [x1, z0, u1]]);
        if (z0 > F.az) put(lit(0, -1) ? "lit" : "shade", [[x0, z0, u0], [x1, z0, u0], [x1, z0, u1], [x0, z0, u1]]);
        if (z1 < F.az) put(lit(0, 1) ? "lit" : "shade", [[x0, z1, u0], [x1, z1, u0], [x1, z1, u1], [x0, z1, u1]]);
        continue;
      }
      if (q.cone) { c.poly(hull(rings(q).map(([x, z, u]) => P.ground(x - F.ax, z - F.az, u))).flat().map(Math.round), q.key!); continue; }
      if (q.poly) { c.poly(q.poly.flatMap(([x, z, u]) => F.at(x, z, u)), q.key!); continue; }
      const [mx, mz] = mid(q), s = F.scale(mx, mz);
      if (q.e) c.ellipse(...F.at(...q.e), Math.max(0, Math.round(q.rx! * s)), Math.max(0, Math.round(q.ry! * s)), q.key!);
      else c.line(...F.at(...q.a!), ...F.at(...q.b!), q.key!, Math.max(1, Math.round(2 * q.half! * s)));
    }
  };
  if (o.ramps) c.plate(go, { light: o.light ?? [-0.5, -1], ramps: o.ramps }); else go();
}

/**
 * The ground pixels in the shapes' shadows (as y·w + x, in the picture's frame from x0, y0): each shape
 * swept onto the ground away from the sun, in one set, so where shadows overlap the ground is no
 * darker than in one. A blob with `dapple` lets light through (a crown's shade with sun flecks).
 */
export function castSolids(P: Perspective, shapes: Solid[], o: SolidOpts, w: number, h: number, x0 = 0, y0 = 0): Set<number> {
  // the sun's way is the world's: on a bending way (P.bend), each point is moved to where the bend
  // puts it first, swept from there, and the shadow projected through the camera without the bend
  const F = frame(P, o), out = new Set<number>(), B = P.bend, S = B ? perspective({ ...P, bend: 0 }) : P;
  const drop = ([x, z, u]: V3): number[] => [x + (B ? (B * (z - F.az) ** 2) / 2 : 0) + u * F.sox, z + u * F.soz];
  const fill = (poly: number[][], dapple?: number) => {
    if (poly.some(([x, z]) => F.ahead(x, z) < 0.4)) return;
    const sp = poly.map(([x, z]) => S.ground(x - F.ax, z - F.az)), xs = sp.map((p) => p[0]), ys = sp.map((p) => p[1]);
    for (let y = Math.max(Math.ceil(P.horizon) + 1, Math.floor(Math.min(...ys)), y0); y <= Math.min(y0 + h - 1, Math.ceil(Math.max(...ys))); y++)
      for (let x = Math.max(x0, Math.floor(Math.min(...xs))); x <= Math.min(x0 + w - 1, Math.ceil(Math.max(...xs))); x++) {
        let inside = false;
        for (let i = 0, j = sp.length - 1; i < sp.length; j = i++) {
          const [xi, yi] = sp[i], [xj, yj] = sp[j];
          if (yi > y + 0.5 !== yj > y + 0.5 && x + 0.5 < ((xj - xi) * (y + 0.5 - yi)) / (yj - yi) + xi) inside = !inside;
        }
        if (inside && !(dapple && latticeHash(x * 7 + y, y * 13 - x) > dapple)) out.add((y - y0) * w + (x - x0));
      }
  };
  for (const q of shapes) {
    if (q.noShadow) continue;
    if (q.poly) { fill(hull(q.poly.map(drop))); continue; }
    if (q.cone) { fill(hull(rings(q).map(drop))); continue; }
    if (q.box) {
      const [bx0, bz0, bx1, bz1, u0, u1] = q.box, pts: number[][] = [];
      for (const x of [bx0, bx1]) for (const z of [bz0, bz1]) for (const u of [u0, u1]) pts.push(drop([x, z, u]));
      fill(hull(pts));
      continue;
    }
    if (q.e) {
      // an ellipsoid's shadow: points over its surface swept onto the ground, and their hull
      const pts: number[][] = [];
      for (let i = 0; i < 12; i++) for (let j = -2; j <= 2; j++) {
        const a = (i / 12) * Math.PI * 2, b = (j / 2) * (Math.PI / 2), u = q.e[2] + Math.sin(b) * q.ry!;
        pts.push(drop([q.e[0] + Math.cos(b) * Math.cos(a) * q.rx!, q.e[1] + Math.cos(b) * Math.sin(a) * q.rx!, u]));
      }
      fill(hull(pts), q.dapple);
      continue;
    }
    if (!q.a || !q.b || (q.half ?? 0) < 0.012) continue;
    const A = drop(q.a), B = drop(q.b), half = q.half!, dx = B[0] - A[0], dz = B[1] - A[1], len = Math.hypot(dx, dz) || 1, nx = (-dz / len) * half, nz = (dx / len) * half;
    fill(len < 0.02 ? [[A[0] - half, A[1] - half], [A[0] + half, A[1] - half], [A[0] + half, A[1] + half], [A[0] - half, A[1] + half]] : [[A[0] + nx, A[1] + nz], [B[0] + nx, B[1] + nz], [B[0] - nx, B[1] - nz], [A[0] - nx, A[1] - nz]]);
  }
  return out;
}
