// Light in the world for mesh() (HD-2D's warm sun, cool sky and lamps): each pixel's color is its
// art's color times the light reaching it, in linear light: the sky's everywhere, the sun's by how the
// surface faces it and whether anything stands between, each lamp's by how near it is. Sprites take
// it through their normal maps (bump: "hybrid" and the rest), turned from the picture into the world:
// a sprite stands upright facing the camera, so its right is the camera's right, its up the world's,
// its face toward the camera; without a map it is that flat face. A sprite's light wraps round it
// (half again past the edge), as painted figures take it, so its dark side isn't black.
// The sun's shadows come from a map of what it sees (the depth of the nearest thing along its rays,
// in a grid across them): every face, and every sprite as a cut-out turned to face the sun, so a
// figure or a tree throws its silhouette. What a pixel is tested against is the map at the same
// place across the sun's rays: the nearer thing there, if any, shades it.
import { type Color, LIN, fromLinear } from "./color.ts";
import type { Img } from "./image.ts";

export type V3 = [number, number, number];
export interface Lamp { at: V3; rgb: V3; r: number }
/** The light, in linear light and already times its strength; `dir` the unit way toward the sun. */
export interface Lit { sun: V3; sky: V3; dir: V3; lamps: Lamp[]; emit: Set<Color>; shadows: boolean }

const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = (a: V3): V3 => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

/** What the sun sees, over the points from lo to hi across its rays, `res` cells along the longer side. */
export class SunMap {
  readonly e1: V3; readonly e2: V3; readonly S: V3;
  readonly u0: number; readonly v0: number; readonly cell: number; readonly w: number; readonly h: number;
  readonly depth: Float32Array; readonly who: Int32Array;
  /** `points(visit)` calls visit(x, y, z) for each point the map has to cover. */
  constructor(S: V3, points: (visit: (x: number, y: number, z: number) => void) => void, res: number) {
    this.S = S;
    // two ways across the rays: level and the one up the slope
    this.e1 = Math.abs(S[2]) > 0.999 ? [1, 0, 0] : unit([S[1], -S[0], 0]);
    this.e2 = unit([this.e1[1] * S[2] - this.e1[2] * S[1], this.e1[2] * S[0] - this.e1[0] * S[2], this.e1[0] * S[1] - this.e1[1] * S[0]]);
    let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
    const { e1, e2 } = this;
    points((x, y, z) => {
      const u = x * e1[0] + y * e1[1] + z * e1[2], v = x * e2[0] + y * e2[1] + z * e2[2];
      if (u < u0) u0 = u; if (u > u1) u1 = u; if (v < v0) v0 = v; if (v > v1) v1 = v;
    });
    if (!(u1 >= u0)) { u0 = u1 = v0 = v1 = 0; }
    this.cell = Math.max(u1 - u0, v1 - v0, 1e-3) / res;
    this.u0 = u0 - this.cell; this.v0 = v0 - this.cell;
    this.w = Math.ceil((u1 - u0) / this.cell) + 3; this.h = Math.ceil((v1 - v0) / this.cell) + 3;
    this.depth = new Float32Array(this.w * this.h).fill(Infinity);
    this.who = new Int32Array(this.w * this.h).fill(-1);
  }
  /** [column, row, depth along the rays] of a point in the map. */
  at(p: V3): V3 { return [(dot(p, this.e1) - this.u0) / this.cell, (dot(p, this.e2) - this.v0) / this.cell, -dot(p, this.S)]; }
  /** A triangle into the map; `keep(t0, t1, t2)` (its weights) says which of its cells it covers (a sprite's cut). */
  tri(a: V3, b: V3, d: V3, id: number, keep?: (w0: number, w1: number, w2: number) => boolean): void {
    const A = this.at(a), B = this.at(b), D = this.at(d), area = (B[0] - A[0]) * (D[1] - A[1]) - (B[1] - A[1]) * (D[0] - A[0]);
    if (Math.abs(area) < 1e-9) return;
    const xa = Math.max(0, Math.floor(Math.min(A[0], B[0], D[0]))), xb = Math.min(this.w - 1, Math.ceil(Math.max(A[0], B[0], D[0])));
    const ya = Math.max(0, Math.floor(Math.min(A[1], B[1], D[1]))), yb = Math.min(this.h - 1, Math.ceil(Math.max(A[1], B[1], D[1])));
    for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++) {
      const px = x + 0.5, py = y + 0.5;
      const w1 = ((D[0] - A[0]) * (py - A[1]) - (D[1] - A[1]) * (px - A[0])) / -area, w2 = ((B[0] - A[0]) * (py - A[1]) - (B[1] - A[1]) * (px - A[0])) / area, w0 = 1 - w1 - w2;
      if (w0 < -1e-4 || w1 < -1e-4 || w2 < -1e-4 || (keep && !keep(w0, w1, w2))) continue;
      const z = w0 * A[2] + w1 * B[2] + w2 * D[2], i = y * this.w + x;
      if (z < this.depth[i]) { this.depth[i] = z; this.who[i] = id; }
    }
  }
  /** A sprite as a cut-out turned to face the sun, its feet at `at`, `m` m to its pixel. */
  sprite(img: Img, at: V3, m: number, id: number): void {
    const h = unit([this.S[0], this.S[1], 0]), right: V3 = Math.abs(this.S[2]) > 0.999 ? [1, 0, 0] : [-h[1], h[0], 0];
    const [px, py] = img.pivot ?? [img.w / 2, img.h];
    const corner = (i: number, j: number): V3 => [at[0] + right[0] * (i - px) * m, at[1] + right[1] * (i - px) * m, at[2] + (py - j) * m];
    const tl = corner(0, 0), tr = corner(img.w, 0), bl = corner(0, img.h), br = corner(img.w, img.h);
    // the cell's place on the sprite from the triangle's weights, and whether the sprite is there
    const solid = (i: number, j: number) => i >= 0 && j >= 0 && i < img.w && j < img.h && (img.data[(j | 0) * img.w + (i | 0)] & 255) >= 128;
    this.tri(tl, tr, br, id, (w0, w1, w2) => solid((w1 + w2) * img.w, w2 * img.h));
    this.tri(tl, br, bl, id, (w0, w1, w2) => solid(w1 * img.w, (w1 + w2) * img.h));
  }
  /** Does the sun reach (px, py, pz)? `self`: what it belongs to, which doesn't shade itself; `slope` how far its surface turns from the sun (1 facing it). */
  sees(px: number, py: number, pz: number, self = -1, slope = 1): boolean {
    const { e1, e2, S } = this, x = (px * e1[0] + py * e1[1] + pz * e1[2] - this.u0) / this.cell, y = (px * e2[0] + py * e2[1] + pz * e2[2] - this.v0) / this.cell;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return true;
    const i = Math.floor(y) * this.w + Math.floor(x), z = -(px * S[0] + py * S[1] + pz * S[2]);
    return !(this.depth[i] < z - this.cell * (1 + 2 / Math.max(0.2, slope)) - 0.02) || this.who[i] === self;
  }
}

/** How much of a light a surface takes, its cosine to it `d`, the light wrapping `wrap` past the edge. */
const take = (d: number, wrap: number) => Math.max(0, (d + wrap) / (1 + wrap));

/** The art's color `c` under the light at (px, py, pz), its normal N; `wrap` how far the light goes past the edge (0 faces, 0.5 sprites). */
export function shine(c: Color, N: V3, px: number, py: number, pz: number, L: Lit, sunlit: boolean, wrap: number): Color {
  if (L.emit.has(c)) return c;
  let r = L.sky[0], g = L.sky[1], b = L.sky[2];
  if (sunlit) { const k = take(dot(N, L.dir), wrap); r += L.sun[0] * k; g += L.sun[1] * k; b += L.sun[2] * k; }
  for (const l of L.lamps) {
    const dx = l.at[0] - px, dy = l.at[1] - py, dz = l.at[2] - pz, d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (d >= l.r) continue;
    const f = (1 - d / l.r) ** 2 * take(d > 1e-6 ? (N[0] * dx + N[1] * dy + N[2] * dz) / d : 1, wrap);
    r += l.rgb[0] * f; g += l.rgb[1] * f; b += l.rgb[2] * f;
  }
  return fromLinear(LIN[c >>> 24] * r, LIN[(c >>> 16) & 255] * g, LIN[(c >>> 8) & 255] * b, c);
}
