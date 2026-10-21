import { type Color, TRANSPARENT } from "./color.ts";

export type Axis = "x" | "y" | "xy";

/** A light source carried by an image (pixel coords); consumed by lighting(). */
export interface Lamp {
  x: number;
  y: number;
  /** Reach in pixels through open space. */
  r: number;
  color: Color;
  power: number;
  /** Height above the picture plane in px (how much it rakes across normal-mapped surfaces). */
  z: number;
}

/**
 * Which way a placed thing is turned, in picture space: x right, y down, z into the picture (so a
 * body's right is forward x up). From the asset's `facing`; flips and rotations turn it.
 */
export interface Orient {
  /** Where its front points: [1, 0, 0] facing right, [0, 0, -1] facing us. Unset: no front given. */
  f?: [number, number, number];
  /** Where its top points: [0, -1, 0] upright. */
  u: [number, number, number];
  /** Flipped an odd number of times: a mirror image, its drawn right side now plays its left. */
  mirrored: boolean;
  /** It has lettering, which a mirror turns backwards. */
  text: boolean;
}

/** RGBA image as packed colors. Out-of-bounds reads are transparent, writes are ignored. */
export class Img {
  readonly w: number;
  readonly h: number;
  readonly data: Uint32Array;
  /** Light sources placed in this image; they travel with it through transforms and stamps. */
  lamps?: Lamp[];
  /**
   * Per-pixel surface normals (nx, ny, nz) * 127, ny pointing down the image; nz = 0 = none
   * (lit flat). Set by bump() / normals(); travels with the pixels like lamps do.
   */
  norm?: Int8Array;
  /**
   * The point placements line up with (stamp's x, y), in pixel-corner coords: [w / 2, h] is the
   * middle of the bottom edge. Set from the asset's `pivot`; travels through transforms.
   */
  pivot?: [number, number];
  /** Named points (pixel-corner coords) other placements attach to, from the asset's `sockets`; they travel like the pivot. */
  sockets?: Record<string, [number, number]>;
  /** 9-slice margins [left, top, right, bottom] from the asset's `slice`; flips and rotations turn them. */
  slice?: [number, number, number, number];
  /** Which way it faces and which way is up, from the asset's `facing`; travels like the pivot. */
  orient?: Orient;
  /** Its real height in meters, from the asset's `height` (for a scene's `world` scale). */
  meters?: number;

  constructor(w: number, h: number, data?: Uint32Array) {
    w = Math.floor(w);
    h = Math.floor(h);
    if (!(w >= 1 && h >= 1)) throw new Error(`image size must be positive, got ${w}x${h}`);
    if (w * h > 16_777_216) throw new Error(`image too large: ${w}x${h}`);
    this.w = w;
    this.h = h;
    this.data = data ?? new Uint32Array(w * h);
  }

  inside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  get(x: number, y: number): Color {
    x = Math.floor(x);
    y = Math.floor(y);
    return this.inside(x, y) ? this.data[y * this.w + x] : TRANSPARENT;
  }

  set(x: number, y: number, c: Color): void {
    x = Math.floor(x);
    y = Math.floor(y);
    if (this.inside(x, y)) this.data[y * this.w + x] = c;
  }

  copy(): Img {
    const o = new Img(this.w, this.h, this.data.slice());
    if (this.lamps) o.lamps = this.lamps.map((l) => ({ ...l }));
    if (this.norm) o.norm = this.norm.slice();
    if (this.pivot) o.pivot = [...this.pivot];
    if (this.sockets) o.sockets = mapPoints(this.sockets, (x, y) => [x, y]);
    if (this.slice) o.slice = [...this.slice];
    if (this.orient) o.orient = { ...this.orient, f: this.orient.f && [...this.orient.f], u: [...this.orient.u] };
    if (this.meters) o.meters = this.meters;
    return o;
  }

  /**
   * Carry the pivot, sockets and orientation into `o` through a transform of pixel-corner coords.
   * The orientation turns with the transform's linear part; a negative determinant is a mirror.
   */
  movePivot(o: Img, f: (x: number, y: number) => [number, number]): Img {
    if (this.pivot) o.pivot = f(...this.pivot);
    if (this.sockets) o.sockets = mapPoints(this.sockets, f);
    if (this.meters) o.meters = this.meters;
    if (this.orient) {
      const [ox, oy] = f(0, 0), [ax, ay] = f(1, 0), [bx, by] = f(0, 1);
      const m = [ax - ox, ay - oy, bx - ox, by - oy];
      const turn = (v: [number, number, number]): [number, number, number] => {
        const x = m[0] * v[0] + m[2] * v[1], y = m[1] * v[0] + m[3] * v[1], n = Math.hypot(x, y, v[2]) || 1;
        return [x / n, y / n, v[2] / n];
      };
      const o0 = this.orient;
      o.orient = { f: o0.f && turn(o0.f), u: turn(o0.u), mirrored: m[0] * m[3] - m[1] * m[2] < 0 ? !o0.mirrored : o0.mirrored, text: o0.text };
    }
    return o;
  }

  /** Normal channel, allocated (all "none") on first use. */
  normals(): Int8Array {
    return (this.norm ??= new Int8Array(this.w * this.h * 3));
  }

  /** Copy pixel i's normal from src pixel j, transforming its x/y (flip: sx/sy = -1, swap = rotate). */
  private static moveNorm(src: Int8Array, j: number, dst: Int8Array, i: number, sx = 1, sy = 1, rot = 0): void {
    let nx = src[j * 3], ny = src[j * 3 + 1];
    if (rot === 90) [nx, ny] = [-ny, nx];
    else if (rot === 270) [nx, ny] = [ny, -nx];
    dst[i * 3] = nx * sx;
    dst[i * 3 + 1] = ny * sy;
    dst[i * 3 + 2] = src[j * 3 + 2];
  }

  /** Copy lamps into `o` through a position transform (dropping ones it maps outside). */
  private moveLamps(o: Img, f: (x: number, y: number) => [number, number]): Img {
    if (!this.lamps?.length) return o;
    o.lamps = [];
    for (const l of this.lamps) {
      const [x, y] = f(l.x, l.y);
      if (o.inside(x, y)) o.lamps.push({ ...l, x, y });
    }
    return o;
  }

  fill(c: Color): this {
    this.data.fill(c);
    return this;
  }

  /** Draw src at (dx, dy); transparent source pixels are skipped. */
  /** A copy with the pixels `skip` marks made transparent. */
  without(skip: Uint8Array): Img {
    const o = this.copy();
    for (let i = 0; i < o.data.length; i++) if (skip[i]) o.data[i] = TRANSPARENT;
    return o;
  }

  blit(src: Img, dx: number, dy: number): void {
    dx = Math.floor(dx);
    dy = Math.floor(dy);
    if (!src.norm && !this.norm) {
      // (no normals either side: just the overlap, row by row)
      const xa = Math.max(0, -dx), xb = Math.min(src.w, this.w - dx), s = src.data, d = this.data;
      for (let y = Math.max(0, -dy); y < Math.min(src.h, this.h - dy); y++) {
        const so = y * src.w, to = (dy + y) * this.w + dx;
        for (let x = xa; x < xb; x++) { const c = s[so + x]; if (c !== TRANSPARENT) d[to + x] = c; }
      }
      return;
    }
    for (let y = 0; y < src.h; y++) {
      const ty = dy + y;
      if (ty < 0 || ty >= this.h) continue;
      for (let x = 0; x < src.w; x++) {
        const c = src.data[y * src.w + x];
        const tx = dx + x;
        if (c === TRANSPARENT || tx < 0 || tx >= this.w) continue;
        const i = ty * this.w + tx;
        this.data[i] = c;
        // Normals come along; flat art drawn over a bumped surface clears it.
        if (src.norm) Img.moveNorm(src.norm, y * src.w + x, this.normals(), i);
        else if (this.norm) this.norm[i * 3 + 2] = 0;
      }
    }
  }

  flip(axis: Axis): Img {
    const o = new Img(this.w, this.h);
    const fx = axis.includes("x"), fy = axis.includes("y");
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const j = (fy ? this.h - 1 - y : y) * this.w + (fx ? this.w - 1 - x : x);
        o.data[y * this.w + x] = this.data[j];
        if (this.norm) Img.moveNorm(this.norm, j, o.normals(), y * this.w + x, fx ? -1 : 1, fy ? -1 : 1);
      }
    this.movePivot(o, (x, y) => [fx ? this.w - x : x, fy ? this.h - y : y]);
    if (this.slice) { const [l, t, r, b] = this.slice; o.slice = [fx ? r : l, fy ? b : t, fx ? l : r, fy ? t : b]; }
    return this.moveLamps(o, (x, y) => [fx ? this.w - 1 - x : x, fy ? this.h - 1 - y : y]);
  }

  /** Clockwise rotation by a multiple of 90 degrees. */
  rot(deg: number): Img {
    const d = ((deg % 360) + 360) % 360;
    if (d === 0) return this.copy();
    if (d === 180) return this.flip("xy");
    if (d !== 90 && d !== 270) throw new Error(`rot must be a multiple of 90, got ${deg}`);
    const o = new Img(this.h, this.w);
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const c = this.data[y * this.w + x];
        const [tx, ty] = d === 90 ? [this.h - 1 - y, x] : [y, this.w - 1 - x];
        o.set(tx, ty, c);
        if (this.norm) Img.moveNorm(this.norm, y * this.w + x, o.normals(), ty * o.w + tx, 1, 1, d);
      }
    this.movePivot(o, (x, y) => (d === 90 ? [this.h - y, x] : [y, this.w - x]));
    if (this.slice) { const [l, t, r, b] = this.slice; o.slice = d === 90 ? [b, l, t, r] : [t, r, b, l]; }
    return this.moveLamps(o, (x, y) => (d === 90 ? [this.h - 1 - y, x] : [y, this.w - 1 - x]));
  }

  /** Copy the left half onto the right ("x") or the top onto the bottom ("y"), in place. */
  mirror(axis: "x" | "y"): void {
    const n = this.norm;
    if (axis === "x") {
      for (let y = 0; y < this.h; y++)
        for (let x = 0; x < Math.floor(this.w / 2); x++) {
          this.set(this.w - 1 - x, y, this.get(x, y));
          if (n) Img.moveNorm(n, y * this.w + x, n, y * this.w + this.w - 1 - x, -1, 1);
        }
    } else {
      for (let y = 0; y < Math.floor(this.h / 2); y++)
        for (let x = 0; x < this.w; x++) {
          this.set(x, this.h - 1 - y, this.get(x, y));
          if (n) Img.moveNorm(n, y * this.w + x, n, (this.h - 1 - y) * this.w + x, 1, -1);
        }
    }
    if (this.lamps) {
      const half = axis === "x" ? Math.floor(this.w / 2) : Math.floor(this.h / 2);
      for (const l of [...this.lamps]) {
        if (axis === "x" && l.x < half) this.lamps.push({ ...l, x: this.w - 1 - l.x });
        if (axis === "y" && l.y < half) this.lamps.push({ ...l, y: this.h - 1 - l.y });
      }
    }
  }

  /** Bounding box of opaque pixels, or undefined when empty. */
  bounds(): { x: number; y: number; w: number; h: number } | undefined {
    // the first and last rows with anything in them, then each row in between only as far in from
    // either side as the box hasn't reached yet
    const { w, h, data } = this, any = (y: number) => { for (let i = y * w; i < (y + 1) * w; i++) if (data[i] !== TRANSPARENT) return true; return false; };
    let y0 = 0, y1 = h - 1;
    while (y0 < h && !any(y0)) y0++;
    if (y0 === h) return undefined;
    while (!any(y1)) y1--;
    let x0 = w, x1 = -1;
    for (let y = y0; y <= y1; y++) {
      const r = y * w;
      for (let x = 0; x < x0; x++) if (data[r + x] !== TRANSPARENT) { x0 = x; break; }
      for (let x = w - 1; x > x1; x--) if (data[r + x] !== TRANSPARENT) { x1 = x; break; }
    }
    return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  }

  sub(x: number, y: number, w: number, h: number): Img {
    const o = new Img(w, h);
    for (let yy = 0; yy < h; yy++)
      for (let xx = 0; xx < w; xx++) {
        o.data[yy * w + xx] = this.get(x + xx, y + yy);
        if (this.norm && this.inside(x + xx, y + yy)) Img.moveNorm(this.norm, (y + yy) * this.w + x + xx, o.normals(), yy * w + xx);
      }
    this.movePivot(o, (px, py) => [px - x, py - y]);
    return this.moveLamps(o, (lx, ly) => [lx - x, ly - y]);
  }

  crop(): Img {
    const b = this.bounds();
    return b ? this.sub(b.x, b.y, b.w, b.h) : this.copy();
  }

  pad(n: number): Img {
    const o = new Img(this.w + 2 * n, this.h + 2 * n);
    o.blit(this, n, n);
    this.movePivot(o, (x, y) => [x + n, y + n]);
    return this.moveLamps(o, (x, y) => [x + n, y + n]);
  }

  /**
   * 1px outline around opaque pixels; grows the canvas by 1 on every side. With `pick`, each
   * outline pixel takes pick(the sprite color it touches) instead of `c` (selout).
   */
  outline(c: Color, diagonal = false, pick?: (touching: Color) => Color, skip?: Uint8Array): Img {
    const src = this.pad(1), o = src.copy();
    // `skip`: pixels the line isn't drawn around (they stay, but don't count as the shape's edge)
    const shape = skip ? this.without(skip).pad(1) : src;
    for (let y = 0; y < src.h; y++)
      for (let x = 0; x < src.w; x++) {
        if (src.get(x, y) !== TRANSPARENT) continue;
        const nb = touching(shape, x, y, diagonal, (p) => p !== TRANSPARENT);
        if (nb !== undefined) o.set(x, y, pick ? pick(nb) : c);
      }
    return o;
  }

  /** 1px line over the sprite's own edge pixels (an inside outline): the canvas keeps its size. */
  /** Edge pixels become the line; colors in `keep` stay as they are (an outline already there). */
  inline(c: Color, diagonal = false, pick?: (under: Color) => Color, keep?: Set<Color>, skip?: Uint8Array): Img {
    const o = this.copy(), shape = skip ? this.without(skip) : this;
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const p = shape.get(x, y);
        if (p === TRANSPARENT || keep?.has(p)) continue;
        if (touching(shape, x, y, diagonal, (q) => q === TRANSPARENT) !== undefined) o.set(x, y, pick ? pick(p) : c);
      }
    return o;
  }

  /**
   * Shrink by a whole factor: each n x n block becomes its most common opaque color (ties: the
   * first, scanning the block column by column), or transparent when fewer than half of its
   * pixels are opaque. Keeps silhouettes and thin features better than sampling one pixel.
   */
  shrink(n: number): Img {
    const o = new Img(Math.floor(this.w / n), Math.floor(this.h / n));
    for (let by = 0; by < o.h; by++)
      for (let bx = 0; bx < o.w; bx++) {
        const count = new Map<Color, number>();
        let solid = 0;
        for (let dx = 0; dx < n; dx++)
          for (let dy = 0; dy < n; dy++) {
            const c = this.data[(by * n + dy) * this.w + bx * n + dx];
            if (c === TRANSPARENT) continue;
            solid++;
            count.set(c, (count.get(c) ?? 0) + 1);
          }
        if (solid * 2 < n * n) continue;
        let best = TRANSPARENT, most = 0;
        for (const [c, k] of count) if (k > most) { best = c; most = k; }
        o.data[by * o.w + bx] = best;
      }
    return o;
  }

  /** Replace colors through a map. */
  remap(map: Map<Color, Color>): Img {
    const o = this.copy();
    for (let i = 0; i < o.data.length; i++) {
      const to = map.get(o.data[i]);
      if (to !== undefined) o.data[i] = to;
    }
    return o;
  }

  /** Every opaque pixel in one color: hit flashes, cast shadows. A shape only: no normals or lamps. */
  silhouette(c: Color): Img {
    const o = new Img(this.w, this.h);
    for (let i = 0; i < o.data.length; i++) if (this.data[i] !== TRANSPARENT) o.data[i] = c;
    return this.movePivot(o, (x, y) => [x, y]);
  }

  /**
   * The image laid flat on the ground, as its cast shadow: a pixel at height h above the base (the
   * pivot's row, else the bottom edge) lands h * (kx, ky) away from where it stands. The pivot
   * stays on the base; colors are kept (add `silhouette` for a flat shadow).
   */
  cast(kx: number, ky: number, from: "pivot" | "column" = "pivot"): Img {
    const [px, py] = this.pivot ?? [this.w / 2, this.h];
    const pts: number[] = [];
    // where each column stands: the pivot's row, or (a base that isn't level: a tent seen at an angle,
    // its hem higher at the back) the column's own lowest pixel
    const foot = new Int32Array(this.w).fill(Math.floor(py) - 1);
    if (from === "column")
      for (let x = 0; x < this.w; x++)
        for (let y = this.h - 1; y >= 0; y--) if (this.data[y * this.w + x] !== TRANSPARENT) { foot[x] = y; break; }
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const c = this.data[y * this.w + x];
        if (c === TRANSPARENT) continue;
        // a row of height h covers the ground from h * ky to (h + 1) * ky: at least one row, no gaps
        const base = foot[x], h = base - y, a = h * ky, b = (h + 1) * ky, lo = Math.floor(Math.min(a, b));
        const hi = Math.max(lo + 1, Math.floor(Math.max(a, b)));
        for (let yy = lo; yy < hi; yy++) pts.push(x + Math.round(h * kx), base + yy, c);
      }
    if (!pts.length) return this.copy();
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i < pts.length; i += 3) {
      x0 = Math.min(x0, pts[i]); x1 = Math.max(x1, pts[i]);
      y0 = Math.min(y0, pts[i + 1]); y1 = Math.max(y1, pts[i + 1]);
    }
    const o = new Img(x1 - x0 + 1, y1 - y0 + 1);
    for (let i = 0; i < pts.length; i += 3) o.data[(pts[i + 1] - y0) * o.w + pts[i] - x0] = pts[i + 2];
    o.pivot = [px - x0, py - y0];
    return o;
  }

  /** Nearest-neighbour upscale. */
  scale(s: number): Img {
    if (s === 1) return this.copy();
    const o = new Img(this.w * s, this.h * s);
    for (let y = 0; y < o.h; y++) {
      const row = Math.floor(y / s) * this.w;
      for (let x = 0; x < o.w; x++) o.data[y * o.w + x] = this.data[row + Math.floor(x / s)];
    }
    return o;
  }

  /** FNV-1a over size + pixels, for change detection. */
  hash(): string {
    let h = 0x811c9dc5 ^ this.w ^ (this.h << 16);
    for (let i = 0; i < this.data.length; i++) {
      h ^= this.data[i];
      h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(36);
  }
}

/** A copy of named points, each moved by f. */
export function mapPoints(pts: Record<string, [number, number]>, f: (x: number, y: number) => [number, number]): Record<string, [number, number]> {
  const o: Record<string, [number, number]> = {};
  for (const k of Object.keys(pts)) o[k] = f(...pts[k]);
  return o;
}

/** The first 4-neighbour (then diagonal) of (x, y) that `want` accepts, or undefined. */
function touching(img: Img, x: number, y: number, diagonal: boolean, want: (c: Color) => boolean): Color | undefined {
  const near = diagonal ? NEAR8 : NEAR4;
  for (let i = 0; i < near.length; i += 2) {
    const c = img.get(x + near[i], y + near[i + 1]);
    if (want(c)) return c;
  }
  return undefined;
}
const NEAR4 = [0, 1, 0, -1, -1, 0, 1, 0];
const NEAR8 = [...NEAR4, -1, 1, 1, 1, -1, -1, 1, -1];
