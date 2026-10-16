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
  /** 9-slice margins [left, top, right, bottom] from the asset's `slice`; flips and rotations turn them. */
  slice?: [number, number, number, number];

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
    if (this.slice) o.slice = [...this.slice];
    return o;
  }

  /** Carry the pivot into `o` through a transform of pixel-corner coords. */
  private movePivot(o: Img, f: (x: number, y: number) => [number, number]): Img {
    if (this.pivot) o.pivot = f(...this.pivot);
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
  blit(src: Img, dx: number, dy: number): void {
    dx = Math.floor(dx);
    dy = Math.floor(dy);
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
    let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++)
        if (this.data[y * this.w + x] !== TRANSPARENT) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          y1 = y;
        }
    return x1 < 0 ? undefined : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
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
  outline(c: Color, diagonal = false, pick?: (touching: Color) => Color): Img {
    const src = this.pad(1);
    const o = src.copy();
    for (let y = 0; y < src.h; y++)
      for (let x = 0; x < src.w; x++) {
        if (src.get(x, y) !== TRANSPARENT) continue;
        const nb = touching(src, x, y, diagonal, (p) => p !== TRANSPARENT);
        if (nb !== undefined) o.set(x, y, pick ? pick(nb) : c);
      }
    return o;
  }

  /** 1px line over the sprite's own edge pixels (an inside outline): the canvas keeps its size. */
  inline(c: Color, diagonal = false, pick?: (under: Color) => Color): Img {
    const o = this.copy();
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const p = this.get(x, y);
        if (p !== TRANSPARENT && touching(this, x, y, diagonal, (q) => q === TRANSPARENT) !== undefined) o.set(x, y, pick ? pick(p) : c);
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
    if (this.pivot) o.pivot = [...this.pivot];
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
