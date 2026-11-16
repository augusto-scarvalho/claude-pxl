// Shapes in meters for perspective scenes (what the park built for itself): sticks (round: trunks,
// limbs, poles, bars), blobs (crowns, heads, wheels), boxes (benches, hedges, buildings), cones (a round
// shape tapering from one end to the other, standing roughly upright: a torso, a skirt, a bin, drawn
// as the hull of its level end rings) and flat polygons. The same shapes draw a thing, far to near
// through the camera, and cast its shadow: each swept onto the ground away from the sun, so the
// shadow has the thing's shape and stays right as it recedes.
import { type Perspective, perspective, side } from "./perspective.ts";
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
  /** a shadow reaching past the eye: "drop" it whole (default) or "cut" it 0.4 m ahead of the eye and draw the rest */
  near?: "drop" | "cut";
  /** a stick's shadow thinner than a px: sampled at the pixels' middles, dashes far off ("dash", default), or a "line" a px wide joined along it */
  thin?: "dash" | "line";
  /** shadows: a soft edge px wide (default 1) round them, each ground color turned into its middle tone by shade */
  soft?: { shade: Record<string, string>; px?: number };
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
  // (one bend without bendFrom: the product in the order it always had, side()'s differs in the last bit, an edge pixel's worth)
  const drop = ([x, z, u]: V3): number[] => [x + (B ? (typeof B === "number" && !P.bendFrom ? (B * (z - F.az) ** 2) / 2 : side(B, P.bendFrom, z - F.az)) : 0) + u * F.sox, z + u * F.soz];
  const fill = (whole: number[][], dapple?: number) => {
    // a shadow reaching past the eye: dropped whole, or (near: "cut") the part of it 0.4 m or more ahead, cut along that line
    if (o.near !== "cut" && whole.some(([x, z]) => F.ahead(x, z) < 0.4)) return;
    const poly = whole.flatMap((p, i) => {
      const q = whole[(i + 1) % whole.length], a = F.ahead(p[0], p[1]) - 0.4, b = F.ahead(q[0], q[1]) - 0.4, t = a / (a - b);
      return [...(a >= 0 ? [p] : []), ...(a < 0 !== b < 0 ? [[p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]] : [])];
    });
    if (poly.length < 3) return;
    const sp = poly.map(([x, z]) => S.ground(x - F.ax, z - F.az)), xs = sp.map((p) => p[0]), ys = sp.map((p) => p[1]);
    // by spans: a pixel is in when its middle is (even-odd), so each row's crossings of the polygon at the
    // pixels' middle, sorted, and the pixels from the 1st to the 2nd, the 3rd to the 4th (the same test as one per pixel)
    const lo = Math.max(x0, Math.floor(Math.min(...xs))), hi = Math.min(x0 + w - 1, Math.ceil(Math.max(...xs))), cs: number[] = [];
    for (let y = Math.max(Math.ceil(P.horizon) + 1, Math.floor(Math.min(...ys)), y0); y <= Math.min(y0 + h - 1, Math.ceil(Math.max(...ys))); y++) {
      cs.length = 0;
      for (let i = 0, j = sp.length - 1; i < sp.length; j = i++) {
        const [xi, yi] = sp[i], [xj, yj] = sp[j];
        if (yi > y + 0.5 !== yj > y + 0.5) cs.push(((xj - xi) * (y + 0.5 - yi)) / (yj - yi) + xi);
      }
      cs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < cs.length; k += 2)
        for (let x = Math.max(lo, Math.floor(cs[k] - 0.5)); x <= hi && x + 0.5 < cs[k + 1]; x++)
          if (x + 0.5 >= cs[k] && !(dapple && latticeHash(x * 7 + y, y * 13 - x) > dapple)) out.add((y - y0) * w + (x - x0));
    }
  };
  // a stick's shadow (A to B, n its half width across) thinner than a px where it lies, whose middles miss most
  // rows (dashes): a line a px wide there, joined along it, as solids() draws a far pole; its part 0.4 m or more ahead
  const joined = (A: number[], B: number[], nx: number, nz: number) => {
    const a = F.ahead(A[0], A[1]) - 0.4, b = F.ahead(B[0], B[1]) - 0.4;
    if (a < 0 && b < 0) return;
    const g = (t: number, f = 0) => S.ground(A[0] + (B[0] - A[0]) * t + nx * f - F.ax, A[1] + (B[1] - A[1]) * t + nz * f - F.az);
    const t0 = a < 0 ? a / (a - b) : 0, t1 = b < 0 ? a / (a - b) : 1, [c0, r0] = g(t0), [c1, r1] = g(t1), dc = c1 - c0, dr = r1 - r0, l = Math.hypot(dc, dr) || 1;
    // its width on the picture across the line, read off a hundredth of it either side (so the probe stays ahead of the eye)
    const wide = (t: number) => { const [e, f] = g(t, 0.01), [m, k] = g(t, -0.01); return (Math.abs((e - m) * dr - (f - k) * dc) * 100) / l; };
    const w0 = wide(t0), w1 = wide(t1), n = Math.ceil(Math.max(Math.abs(dc), Math.abs(dr)));
    if (w0 >= 1 && w1 >= 1) return;
    // a px at most a step, so the pixels touch; the width goes linearly between the ends' (two straight edges)
    for (let i = 0; i <= n; i++) {
      const t = n ? i / n : 0, x = Math.floor(c0 + dc * t), y = Math.floor(r0 + dr * t);
      if (w0 + (w1 - w0) * t < 1 && y > Math.ceil(P.horizon) && y >= y0 && y < y0 + h && x >= x0 && x < x0 + w) out.add((y - y0) * w + (x - x0));
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
    const quad = len < 0.02 ? [[A[0] - half, A[1] - half], [A[0] + half, A[1] - half], [A[0] + half, A[1] + half], [A[0] - half, A[1] + half]] : [[A[0] + nx, A[1] + nz], [B[0] + nx, B[1] + nz], [B[0] - nx, B[1] - nz], [A[0] - nx, A[1] - nz]];
    fill(quad);
    if (o.thin === "line" && len >= 0.02 && (o.near === "cut" || !quad.some(([x, z]) => F.ahead(x, z) < 0.4))) joined(A, B, nx, nz);
  }
  return out;
}

/** The ground pixels (rows from `top`) within px of castSolids()' shadows and not in them: their soft edge. */
export function penumbra(set: Set<number>, w: number, h: number, px: number, top: number): Set<number> {
  const out = new Set<number>();
  for (const i of set) {
    const x = i % w, y = (i - x) / w;
    for (let dy = -px; dy <= px; dy++) for (let dx = -px; dx <= px; dx++) {
      const X = x + dx, Y = y + dy, j = Y * w + X;
      if (dx * dx + dy * dy <= px * px && X >= 0 && X < w && Y >= top && Y < h && !set.has(j)) out.add(j);
    }
  }
  return out;
}
