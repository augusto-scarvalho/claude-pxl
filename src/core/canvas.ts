import { type Color, TRANSPARENT, oklab } from "./color.ts";
import { Img } from "./image.ts";
import type { Palette, Resolved } from "./palette.ts";
import { PxError } from "./errors.ts";
import { glyph, lineWidth } from "./font.ts";
import type { BumpOpts, LampOpts, PlaceOpts, PoseOpts, RelightOpts, ScatterOpts, TextOpts, TileLayer, Timeline, TilemapOpts, WireOpts } from "./model.ts";
import { bump, dirOf, setNormal } from "./normals.ts";
import { type View, perspective } from "./perspective.ts";
import { type Solid, type SolidCanvas, type SolidOpts, castSolids, drawSolids } from "./solids.ts";
import { type Face, type Material, type MeshCanvas, type MeshOpts, drawMesh } from "./mesh.ts";
import { POSE_BONES, sideColor } from "./pose.ts";
import { bayer, colorList, gridRows, hash, polyBounds, type Region, regionPred, rng, vnoise } from "./util.ts";

/** How a canvas reaches other assets. */
export interface Resolver {
  /**
   * Built image of an asset; seed != 0 rerolls its random choices; t is the time in ms (animated
   * assets). `track` false: don't make the caller animated by this lookup (frozen frames).
   */
  image(name: string, seed: number, t?: number, track?: boolean): Img;
  /** How the asset changes over time, or undefined if it's still. */
  timeline(name: string, seed: number): Timeline | undefined;
  /** Names a reference can stand for: group members, glob matches, or itself. */
  candidates(name: string): string[];
  /** Is there an asset or group of this name? */
  has(name: string): boolean;
  /** Something wrong but not fatal, found while drawing (a shade step that left its ramp). */
  warn?(msg: string, loc?: string): void;
  /** Glyph lookup of a font() (rows of "#" / "."), for text(). */
  glyphs(font: string): (ch: string) => string[];
}

type Pred = (x: number, y: number) => boolean;

/** Where stamps landed in an asset (top-left in image coords) with their sockets, by id: for `at`. */
export type Placed = Map<string, { x: number; y: number; sockets?: Record<string, [number, number]> }>;
/** What was stamped where, in drawing order (top-left in asset coords): for `pxl describe`. */
export type Placement = { name: string; x: number; y: number; w: number; h: number; layer?: string; img: Img };

/**
 * Drawing surface over an image. Coordinates are relative to (ox, oy); colors are palette
 * keys, "#hex", "." (skip) or "_" (erase). All writes go through plot(), which honours clip().
 */
/** Adds a point to a path drawn a pixel at a time, pixel-perfect: the corner of an L (the middle of three pixels
 * whose ends touch diagonally) is dropped, as it would thicken the line there. */
function addPerfect(path: [number, number][], x: number, y: number): void {
  const p: [number, number] = [Math.round(x), Math.round(y)], q = path[path.length - 1];
  if (q && q[0] === p[0] && q[1] === p[1]) return;
  path.push(p);
  while (path.length >= 3) {
    const [a, b, d] = path.slice(-3);
    if (Math.abs(a[0] - d[0]) === 1 && Math.abs(a[1] - d[1]) === 1 && (b[0] === a[0] || b[1] === a[1]) && (b[0] === d[0] || b[1] === d[1])) path.splice(-2, 1);
    else break;
  }
}

export class Canvas {
  img: Img;
  pal: Palette;
  res: Resolver;
  ox: number;
  oy: number;
  /** Reseed offset applied to every random choice made on this canvas. */
  seed: number;
  /** Time in ms of this build: placed anims show the frame at this time. */
  t = 0;
  /** Inside an anim: the frame being drawn and the frame count (for procedural animation). */
  frame = 0;
  frames = 1;
  /** Building an anim (frame() items allowed). */
  inAnim = false;
  /** Composite below the current layer (absolute coords), for `below` masks. */
  below?: Img;
  /** Seamless tiles: drawing (and reading) past these edges continues on the opposite side. */
  wrap?: { x: boolean; y: boolean };
  /** Where tilemap() records what it placed (the build collects them for a Tiled export). */
  maps?: TileLayer[];
  /** The layer this canvas paints, if any: names exported tile layers. */
  layerName?: string;
  /** Placements log shared by an asset's canvases (stamps, scatter picks, wire hangs). */
  log?: Placement[];
  /** Stamps placed so far in this asset (shared by its layers), for stamp(..., { at }). */
  placed?: Placed;
  /** A layer with sort: its stamps wait here and draw in order on flush(). */
  sorted?: { by: "y" | "z"; queue: { key: number; seq: number; draw: () => void }[] };
  /** Called after each top-level (non-nested) op call; used for tracing. */
  onOp?: (name: string, args: unknown[]) => void;
  /** Art-file location of the op item currently running (set by the builder). */
  loc?: string;
  /** The asset drawn on it and where it is defined: a warning from inside a function still says where. */
  owner?: { name: string; loc?: string };
  private clipPred?: Pred;
  /** Nesting depth of op calls (internal). */
  _depth = 0;
  private rev?: Map<Color, string>;

  constructor(img: Img, pal: Palette, res: Resolver, ox = 0, oy = 0, seed = 0) {
    this.img = img;
    this.pal = pal;
    this.res = res;
    this.ox = ox;
    this.oy = oy;
    this.seed = seed;
  }

  /**
   * Drawing a twin (`twin` on the asset it was made from): every x lands mirrored, so the items run as
   * written and come out facing the other way, and relight takes the light from where it really is.
   * Art functions read it for the few choices a mirror doesn't make by itself.
   */
  mirrored = false;

  /** Inside an anim: frame / frames, 0 (first frame) up to just below 1. */
  get phase(): number { return this.frame / this.frames; }

  get w(): number { return this.img.w; }
  get h(): number { return this.img.h; }

  color(c: unknown): Resolved {
    return this.pal.resolve(c);
  }

  /** Write an already-resolved color (null = skip); true if it landed. */
  plot(x: number, y: number, c: Resolved): boolean {
    if (c === null) return false;
    x = Math.floor(x);
    y = Math.floor(y);
    if (this.clipPred && !this.clipPred(x, y)) return false;
    const i = this.index(x, y);
    if (i < 0) return false;
    this.img.data[i] = c;
    return true;
  }

  /** Image index of canvas (x, y), wrapping around wrapped edges; -1 when outside. */
  index(x: number, y: number): number {
    const { w, h } = this.img;
    let ix = this.ox + Math.floor(x), iy = this.oy + Math.floor(y);
    if (this.mirrored) ix = w - 1 - ix;
    if (this.wrap?.x) ix = ((ix % w) + w) % w;
    if (this.wrap?.y) iy = ((iy % h) + h) % h;
    return ix >= 0 && iy >= 0 && ix < w && iy < h ? iy * w + ix : -1;
  }

  /**
   * The rows (axis "y") or columns ("x") of [lo, hi) that can land on the image: all of them along an
   * edge that wraps, else only those inside. A shape far off the picture then costs nothing.
   */
  span(lo: number, hi: number, axis: "x" | "y"): [number, number] {
    if (this.wrap?.[axis]) return [lo, hi];
    const o = axis === "x" ? this.ox : this.oy, n = axis === "x" ? this.img.w : this.img.h;
    return [Math.max(lo, -o), Math.min(hi, n - o)];
  }

  get(x: number, y: number): Color {
    const i = this.index(x, y);
    return i < 0 ? TRANSPARENT : this.img.data[i];
  }

  /** Palette key at (x, y): "." when transparent, "?" when not in the palette. */
  key(x: number, y: number): string {
    const c = this.get(x, y);
    if (c === TRANSPARENT) return ".";
    this.rev ??= this.pal.reverse();
    return this.rev.get(c) ?? "?";
  }

  /** Pixel is one of `keys` ("*" = any opaque, "." = transparent). */
  is(x: number, y: number, keys: string): boolean {
    if (keys === ".") return this.get(x, y) === TRANSPARENT;
    return this.colorTest(keys)(this.get(x, y));
  }

  /** Seeded random generator that follows this canvas's reseed offset. */
  rng(seed = 1): () => number {
    return rng(hash(seed, 0, this.seed));
  }

  /** Test for `on` masks: palette keys, "*" any opaque, "." (or "_") an empty pixel. */
  private colorTest(on: string): (c: Color) => boolean {
    if (on === "*") return (c) => c !== TRANSPARENT;
    const set = new Set<Color>();
    for (const k of colorList(on)) {
      const c = k === "." ? TRANSPARENT : this.color(k);
      if (c !== null) set.add(c);
    }
    return (c) => set.has(c);
  }

  /** Mask predicate over canvas coords; `below` reads the composite under this layer. */
  maskAt(on: string | undefined, below = false): Pred {
    if (on === undefined) return () => true;
    const test = this.colorTest(on);
    if (below) {
      const b = this.below;
      if (!b) return (x, y) => test(this.get(x, y));
      return (x, y) => {
        const own = this.get(x, y);
        return test(own !== TRANSPARENT ? own : b.get(this.ox + x, this.oy + y));
      };
    }
    return (x, y) => test(this.get(x, y));
  }

  /**
   * Run `fn` drawing onto a plate of its own, light the plate on its own (relight with `opts`, which
   * reads only the plate's pixels: its own edges take the rim light and the shade, as a plate of armor
   * or a mass of stone does, whatever is under it), then lay it down. Works anywhere, in a layer too.
   */
  plate(fn: () => void, opts: RelightOpts = {}): void {
    const under = this.img, sorted = this.sorted, plate = new Img(under.w, under.h);
    this.img = plate;
    this.sorted = undefined;                     // stamps inside are drawn now, to be lit with it
    try {
      fn();
      this.relight(undefined, opts);
    } finally {
      this.img = under;
      this.sorted = sorted;
    }
    if (plate.lamps?.length) (under.lamps ??= []).push(...plate.lamps);
    if (plate.orient?.text) this.lettered();
    under.blit(plate, 0, 0);
  }

  /**
   * Run `fn` drawing onto a sheet of its own, then lay it down moved by (dx, dy), which may fall
   * between pixels: what `stamp`'s `sub` does for an asset, for parts drawn in code (a body swaying
   * half a pixel at a time); `dir` the way it moves, as `sub`'s.
   */
  subpixel(dx: number, dy: number, fn: () => void, dir: [number, number] = [1, 1]): void {
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) throw new PxError(`subpixel(dx, dy, fn): dx and dy are numbers of px, got ${JSON.stringify([dx, dy])}`);
    const under = this.img, sorted = this.sorted, sheet = new Img(under.w, under.h);
    this.img = sheet;
    this.sorted = undefined;
    try { fn(); } finally { this.img = under; this.sorted = sorted; }
    if (sheet.orient?.text) this.lettered();
    this.subPut(sheet, dx - this.ox, dy - this.oy, dir);
  }

  /** Run `fn` with drawing restricted to `region` (nests by intersection). */
  clip(region: Region, fn: () => void): void {
    const prev = this.clipPred, p = regionPred(region);
    this.clipPred = prev ? (x, y) => prev(x, y) && p(x, y) : p;
    try { fn(); } finally { this.clipPred = prev; }
  }

  // ---------------------------------------------------------------- shapes

  px(x: number, y: number, c: string): void {
    this.plot(x, y, this.color(c));
  }

  rect(x: number, y: number, w: number, h: number, c: string): void {
    const col = this.color(c);
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.plot(xx, yy, col);
  }

  box(x: number, y: number, w: number, h: number, c: string): void {
    const col = this.color(c);
    for (let xx = x; xx < x + w; xx++) { this.plot(xx, y, col); this.plot(xx, y + h - 1, col); }
    for (let yy = y + 1; yy < y + h - 1; yy++) { this.plot(x, yy, col); this.plot(x + w - 1, yy, col); }
  }

  /** Bresenham line; width > 1 uses a round brush. */
  line(x0: number, y0: number, x1: number, y1: number, c: string, width = 1): void {
    const col = this.color(c);
    const brush: number[] = [];
    if (width > 1) {
      const f = width % 2 === 0 ? 0.5 : 0, r2 = (width / 2) ** 2;
      const lo = -Math.floor((width - 1) / 2), hi = Math.ceil((width - 1) / 2);
      for (let oy = lo; oy <= hi; oy++)
        for (let ox = lo; ox <= hi; ox++) if ((ox - f) ** 2 + (oy - f) ** 2 <= r2) brush.push(ox, oy);
    } else brush.push(0, 0);
    x0 = Math.floor(x0); y0 = Math.floor(y0); x1 = Math.floor(x1); y1 = Math.floor(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      for (let i = 0; i < brush.length; i += 2) this.plot(x0 + brush[i], y0 + brush[i + 1], col);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  /**
   * A smooth curve through the points (Catmull-Rom: it passes through every point, no control
   * points). 1px wide it is pixel-perfect: no doubled L-corners. `closed` loops back to the start.
   */
  curve(pts: number[], c: string, opts: { width?: number; closed?: boolean } = {}): void {
    if (!Array.isArray(pts) || pts.length < 4 || pts.length % 2) throw new PxError("curve needs [x0, y0, x1, y1, ...]: two points or more");
    const P: [number, number][] = [];
    for (let i = 0; i < pts.length; i += 2) P.push([pts[i], pts[i + 1]]);
    const n = P.length, closed = !!opts.closed && n > 2;
    const at = (i: number) => P[closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))];
    const path: [number, number][] = [], add = (x: number, y: number) => addPerfect(path, x, y);
    for (let s = 0; s < (closed ? n : n - 1); s++) {
      const [p0, p1, p2, p3] = [at(s - 1), at(s), at(s + 1), at(s + 2)];
      const steps = Math.max(1, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) * 4));
      for (let k = 0; k <= steps; k++) {
        const t = k / steps, t2 = t * t, t3 = t2 * t;
        const f = (a: number, b: number, c2: number, d: number) =>
          0.5 * (2 * b + (c2 - a) * t + (2 * a - 5 * b + 4 * c2 - d) * t2 + (3 * b - a - 3 * c2 + d) * t3);
        add(f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1]));
      }
    }
    const width = opts.width ?? 1;
    if (width > 1) for (let i = 0; i < path.length; i++) { const a = path[i], b = path[Math.min(i + 1, path.length - 1)]; this.line(a[0], a[1], b[0], b[1], c, width); }
    else { const col = this.color(c); for (const [x, y] of path) this.plot(x, y, col); }
  }

  hline(x: number, y: number, len: number, c: string): void { this.rect(x, y, len, 1, c); }
  vline(x: number, y: number, len: number, c: string): void { this.rect(x, y, 1, len, c); }

  /** Ellipse centered at (cx, cy); `ring` draws only the 1px border. */
  ellipse(cx: number, cy: number, rx: number, ry: number, c: string, ring = false): void {
    const col = this.color(c);
    const ax = rx + 0.5, ay = ry + 0.5;
    const inside = (x: number, y: number) => (x / ax) ** 2 + (y / ay) ** 2 <= 1;
    // only the offsets that can land on the image, still stepping from -r as ever
    const [ylo, yhi] = this.span(-Infinity, Infinity, "y"), [xlo, xhi] = this.span(-Infinity, Infinity, "x");
    const ys = -ry + Math.max(0, Math.floor(ylo - cy + ry) - 1), xs = -rx + Math.max(0, Math.floor(xlo - cx + rx) - 1);
    for (let y = ys; y <= ry && cy + y < yhi + 1; y++)
      for (let x = xs; x <= rx && cx + x < xhi + 1; x++)
        if (inside(x, y) && (!ring || !(inside(x - 1, y) && inside(x + 1, y) && inside(x, y - 1) && inside(x, y + 1))))
          this.plot(cx + x, cy + y, col);
  }

  circ(cx: number, cy: number, r: number, c: string): void { this.ellipse(cx, cy, r, r, c); }
  ring(cx: number, cy: number, r: number, c: string): void { this.ellipse(cx, cy, r, r, c, true); }

  /**
   * Part of a ring around (cx, cy), from angle `from` to `to` (degrees, clockwise from pointing right;
   * the sweep goes from one to the other, either way round): 1 px wide, or down to radius `inner`
   * (0: a filled sector). `taper`: its width grows from nothing at `from` to `inner` at `to`, the way a
   * blade's smear thickens toward the blade.
   */
  arc(cx: number, cy: number, r: number, from: number, to: number, c: string, opts: { inner?: number; taper?: boolean } = {}): void {
    const col = this.color(c), sweep = to - from, inner = opts.inner ?? r - 1;
    if (!sweep) return;
    for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++)
      for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
        const d = Math.hypot(x - cx, y - cy);
        if (d >= r + 0.5) continue;
        const a = (Math.atan2(y - cy, x - cx) * 180) / Math.PI, t = ((((a - from) * Math.sign(sweep)) % 360) + 360) % 360 / Math.abs(sweep);
        if (t > 1) continue;
        const ri = opts.taper ? r - (r - inner) * t : inner;
        if (ri > 0 && d < ri + 0.5) continue;
        this.plot(x, y, col);
      }
  }

  /** Filled polygon [x0,y0, x1,y1, ...] with vertices on pixel corners. */
  poly(pts: number[], c: string): void {
    if (!Array.isArray(pts) || pts.length < 6 || pts.length % 2) throw new PxError("poly needs [x0,y0, x1,y1, x2,y2, ...]");
    const col = this.color(c), b = polyBounds(pts), n = pts.length / 2;
    const [y0, y1] = this.span(Math.floor(b.y0), Math.ceil(b.y1), "y"), [x0, x1] = this.span(Math.floor(b.x0), Math.ceil(b.x1), "x");
    // a row at a time: where its middle crosses the edges, worked out as inPoly does, sorted; a pixel is
    // inside when an odd number of them lie right of its middle (inPoly's answer, without asking every
    // edge for every pixel)
    const at: number[] = [];
    for (let y = y0; y < y1; y++) {
      const yc = y + 0.5;
      at.length = 0;
      for (let i = 0, j = n - 1; i < n; j = i++) {
        const xi = pts[2 * i], yi = pts[2 * i + 1], xj = pts[2 * j], yj = pts[2 * j + 1];
        if (yi > yc !== yj > yc) at.push(((xj - xi) * (yc - yi)) / (yj - yi) + xi);
      }
      if (!at.length) continue;
      at.sort((p, q) => p - q);
      let k = 0;
      for (let x = x0; x < x1; x++) {
        while (k < at.length && at[k] <= x + 0.5) k++;
        if ((at.length - k) % 2) this.plot(x, y, col);
      }
    }
  }

  /** 4-connected flood fill of the region containing (x, y). */
  fill(x: number, y: number, c: string): void {
    const col = this.color(c);
    if (col === null) return;
    const img = this.img;
    const start = this.index(x, y);
    if (start < 0) return;
    const target = img.data[start];
    if (target === col) return;
    const seen = new Uint8Array(img.w * img.h);
    const stack = [Math.floor(x), Math.floor(y)];
    while (stack.length) {
      const py = stack.pop()!, px = stack.pop()!;
      const i = this.index(px, py);
      if (i < 0 || seen[i] || img.data[i] !== target) continue;
      seen[i] = 1;
      this.plot(px, py, col);
      stack.push(px + 1, py, px - 1, py, px, py + 1, px, py - 1);
    }
  }

  // ---------------------------------------------------------------- texture

  /** Ordered dither: c2 covers `density` of the area, c1 the rest. */
  dither(x: number, y: number, w: number, h: number, c1: string, c2: string, density = 0.5): void {
    const a = this.color(c1), b = this.color(c2);
    for (let yy = y; yy < y + h; yy++)
      for (let xx = x; xx < x + w; xx++) this.plot(xx, yy, bayer(xx, yy) < density ? b : a);
  }

  /** Banded gradient through colors with dithered seams. dir "v" (default) or "h"; soft 0..1. */
  grad(x: number, y: number, w: number, h: number, colors: string | string[], dir: "v" | "h" | "r" = "v", soft = 0.5): void {
    const cols = colorList(colors).map((c) => this.color(c));
    const n = cols.length;
    if (!n) throw new PxError("grad needs at least one color");
    if (dir !== "v" && dir !== "h" && dir !== "r") throw new PxError(`grad direction must be "v", "h" or "r" (radial), got ${JSON.stringify(dir)}`);
    const len = dir === "h" ? w : h;
    for (let yy = 0; yy < h; yy++)
      for (let xx = 0; xx < w; xx++) {
        // Radial: 0 at the center, 1 on the ellipse that fits the box (and past it, in the corners).
        const f = dir === "r"
          ? Math.min(1, Math.hypot((xx + 0.5 - w / 2) / (w / 2), (yy + 0.5 - h / 2) / (h / 2))) * (n - 1)
          : len > 1 ? ((dir === "h" ? xx : yy) / (len - 1)) * (n - 1) : 0;
        const i = Math.floor(f);
        let col: Resolved;
        if (i >= n - 1) col = cols[n - 1];
        else {
          let t = f - i;
          t = soft > 0 ? (t - 0.5) / soft + 0.5 : t >= 0.5 ? 1 : 0;
          col = bayer(x + xx, y + yy) < t ? cols[i + 1] : cols[i];
        }
        this.plot(x + xx, y + yy, col);
      }
  }

  /** Deterministic scatter of colors over `density` of the area; `on` limits it to those keys. */
  noise(x: number, y: number, w: number, h: number, colors: string | string[], density = 0.1, seed = 1, on?: string): void {
    const cols = colorList(colors).map((c) => this.color(c));
    const ok = this.maskAt(on);
    if (on !== undefined && !anyIn(ok, x, y, w, h))
      throw new PxError(`'on: ${on}' matched nothing in [${x}, ${y}, ${w}, ${h}]; a layer starts empty, so put the noise in the layer that drew those colors`);
    const r = this.rng(seed);
    for (let yy = y; yy < y + h; yy++)
      for (let xx = x; xx < x + w; xx++)
        if (r() < density) {
          const pick = cols[Math.floor(r() * cols.length)];
          if (ok(xx, yy)) this.plot(xx, yy, pick);
        }
  }

  /** Apply a color map inside a region `steps` times; density < 1 dithers it. */
  remap(map: Map<Color, Color>, where?: Region, steps = 1, density = 1): void {
    const ok = regionPred(where);
    for (let y = -this.oy; y < this.img.h - this.oy; y++)
      for (let x = -this.ox; x < this.img.w - this.ox; x++) {
        if (!ok(x, y) || (density < 1 && bayer(x, y) >= density)) continue;
        let c = this.get(x, y);
        for (let i = 0; i < steps; i++) c = map.get(c) ?? c;
        this.plot(x, y, c);
      }
  }

  /** Recolor { m: "M" } inside a region; "*" takes every other opaque color ({ "*": "w" }: hit flash). */
  recolor(map: Record<string, string>, where?: Region, density = 1): void {
    const { "*": any, ...rest } = map;
    const m = this.swapMap(rest);
    if (any !== undefined) {
      const to = this.color(any);
      if (to !== null) for (const c of new Set(this.img.data)) if (c !== TRANSPARENT && !m.has(c)) m.set(c, to);
    }
    this.remap(m, where, 1, density);
  }

  /** Step colors darker along the palette ramps inside a region. */
  shade(where?: Region, steps = 1, density = 1): void {
    this.clashes(-1, where);
    this.remap(this.pal.stepMap(-1), where, steps, density);
  }

  /** Step colors lighter along the palette ramps inside a region. */
  light(where?: Region, steps = 1, density = 1): void {
    this.clashes(1, where);
    this.remap(this.pal.stepMap(1), where, steps, density);
  }

  /**
   * Gradient map onto a ramp (Pixelorama's Gradient Map, kept in the palette): the distinct colors
   * in the region, dark to light by luminance, take the ramp's keys in that order, spread from its
   * darkest to its lightest. Tones never merge while there are no more colors than keys (snapping
   * each color to its nearest key can merge two). `hue: [from, to]` (degrees) takes only colors of
   * that hue, so the greens and the browns of an import can go to their own ramps.
   */
  rampmap(ramp: string | string[], opts: { where?: Region; hue?: [number, number] } = {}): void {
    const keys = [...(Array.isArray(ramp) ? ramp.join("") : ramp)].map((k) => {
      const c = this.color(k);
      if (c === null || c === TRANSPARENT) throw new PxError(`rampmap: '${k}' is not a visible color`);
      return c;
    });
    if (!keys.length) throw new PxError('rampmap needs a ramp of keys, dark to light: rampmap("DHGglL")');
    const hue = opts.hue;
    if (hue !== undefined && !(Array.isArray(hue) && hue.length === 2 && hue.every(Number.isFinite)))
      throw new PxError(`rampmap: hue must be [from, to] in degrees, got ${JSON.stringify(hue)}`);
    const ok = regionPred(opts.where), found = new Set<Color>();
    for (let y = -this.oy; y < this.img.h - this.oy; y++)
      for (let x = -this.ox; x < this.img.w - this.ox; x++) {
        const c = this.get(x, y);
        if (c !== TRANSPARENT && ok(x, y) && (!hue || inHue(c, hue))) found.add(c);
      }
    const cols = [...found].sort((a, b) => luma(a) - luma(b)), k = cols.length, n = keys.length;
    const map = new Map<Color, Color>();
    cols.forEach((c, i) => map.set(c, keys[k === 1 ? Math.floor((n - 1) / 2) : k <= n ? Math.round((i * (n - 1)) / (k - 1)) : Math.floor((i * n) / k)]));
    this.remap(map, opts.where);
  }

  /**
   * Flat ground seen in perspective: fn(x, z) gives the color of the ground point seen through each
   * pixel under the horizon ("." or nothing leaves it). `view` is a perspective() or its { horizon,
   * eye, fov | focal, vp, yaw, pitch }; the width defaults to this canvas's. Stripes in x recede into the
   * vanishing point, stripes in z space out toward us; turned (yaw), each set meets at its own point.
   */
  /**
   * Land with relief seen in perspective: height(x, z) is the ground's height in meters (the eye stands
   * `eye` m above height 0, at x 0, z 0); fn(x, z, u, t, col, row) gives the color of the point a pixel
   * sees (u its height, t how far along the ray). Each column is marched from the bottom up, each row
   * starting where the one below landed: seen without roll, land higher up the picture is never nearer.
   * A pixel that sees no land within `far` is sky: opts.sky(col, row) colors it, or it's left. Below the
   * horizon, one that runs out of distance takes the land at `far`. opts: far (m, 10000), top (the
   * land's highest point: a ray rising above it is sky), bound(x, z) and margin (a cheap height the land
   * is never more than `margin` m above: the march steps by it and asks height() only near the land).
   */
  terrain(view: Partial<View>, height: (x: number, z: number) => number, fn: (x: number, z: number, u: number, t: number, col: number, row: number) => string | null | undefined,
    opts: { far?: number; top?: number; bound?: (x: number, z: number) => number; margin?: number; sky?: (col: number, row: number) => string | null | undefined } = {}): void {
    const P = perspective({ ...view, w: view.w ?? this.img.w } as View), far = opts.far ?? 10000, top = opts.top ?? Infinity, margin = opts.margin ?? 0, eye = P.eye;
    // the march goes straight; on a bending way, the land is asked for where the bend puts that point
    const bent = <A extends unknown[]>(g: (x: number, z: number, ...a: A) => any) => (P.bend ? (x: number, z: number, ...a: A) => g(x - (P.bend * z * z) / 2, z, ...a) : g);
    height = bent(height); fn = bent(fn);
    const bound = opts.bound ? bent(opts.bound) : height;
    const put = (col: number, row: number, k: string | null | undefined) => { if (k && k !== ".") this.px(col, row, k); };
    const march = (col: number, row: number, t0: number): number | null => {
      const [dx, dz, du] = P.ray(col, row);
      let t = t0, prev = t0;
      for (let i = 0; i < 4000 && t < far; i++) {
        const x = dx * t, z = dz * t, u = eye + du * t;
        if (du > 0 && u > top + 10) return null;
        let d = u - bound(x, z) - margin;
        if (d < 0) d = u - height(x, z);
        if (d < 0) {
          // between the last step and this one: halve in on the surface
          let lo = prev, hi = t;
          for (let k = 0; k < 8; k++) { const m = (lo + hi) / 2; if (eye + du * m < height(dx * m, dz * m)) hi = m; else lo = m; }
          return hi;
        }
        prev = t;
        // far off, a step needn't be finer than what a pixel covers there
        t += Math.min(t * 0.03, Math.max(d * 0.6, t * 0.007, 0.05));
      }
      return null;
    };
    for (let col = -this.ox; col < this.img.w - this.ox; col++) {
      let t0 = 0.5, open = false;
      for (let row = this.img.h - this.oy - 1; row >= -this.oy; row--) {
        const t = open ? null : march(col, row, t0), [dx, dz, du] = P.ray(col, row);
        if (t !== null) { t0 = t * 0.98; put(col, row, fn(dx * t, dz * t, eye + du * t, t, col, row)); }
        else if (row + 0.5 > P.horizon) put(col, row, fn(dx * far, dz * far, eye + du * far, far, col, row));
        else { open = true; if (opts.sky) put(col, row, opts.sky(col, row)); }
      }
    }
  }

  /**
   * A tapered capsule painted round, in px: from (x0, y0), r0 px thick either side, to (x1, y1), r1.
   * Every pixel is shaded by where it sits across it toward the light (from where `light` points,
   * default the upper left): `ramp` dark to light, its last key only along the lit edge (`rim`,
   * default on). Limbs, logs, pipes, a snake.
   */
  capsule(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number, ramp: string, opts: { light?: [number, number]; rim?: boolean } = {}): void {
    const keys = [...ramp], n = keys.length, rim = opts.rim !== false && n > 1, [lx, ly] = opts.light ?? [-0.5, -1], ll = Math.hypot(lx, ly) || 1;
    const dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy || 1, m = Math.max(r0, r1) + 1;
    for (let y = Math.floor(Math.min(y0, y1) - m); y <= Math.ceil(Math.max(y0, y1) + m); y++)
      for (let x = Math.floor(Math.min(x0, x1) - m); x <= Math.ceil(Math.max(x0, x1) + m); x++) {
        const px = x + 0.5 - x0, py = y + 0.5 - y0, t = Math.max(0, Math.min(1, (px * dx + py * dy) / L2)), R = r0 + (r1 - r0) * t, ox = px - dx * t, oy = py - dy * t;
        if (Math.hypot(ox, oy) > R + 0.2) continue;
        // -1 on the side away from the light, 1 on the side toward it
        const lit = (ox * lx + oy * ly) / ll / Math.max(0.6, R);
        const k = rim && lit > 0.78 ? n - 1 : Math.max(0, Math.min(rim ? n - 2 : n - 1, Math.floor(((lit + 1) / (rim ? 1.78 : 2)) * (rim ? n - 1 : n))));
        this.px(x, y, keys[k]);
      }
  }

  /**
   * Flames rising from (x, y), about `size` px tall: a few tongues, each flickering to its own beat (a
   * cycle of `period` frames, default 6), leaning with the wind (`wind` px across per px up at the
   * tip, default 0.55; negative leans left), `keys` from the root, hottest, to the tip, the last one
   * for their edges. Inside an anim it follows the frame; `seed` keeps two fires apart.
   */
  flame(x: number, y: number, size: number, keys: string, opts: { wind?: number; period?: number; seed?: number; frame?: number } = {}): void {
    const k = [...keys], core = k.length > 1 ? k.slice(0, -1) : k, edge = k[k.length - 1], m = core.length;
    const r = rng(opts.seed ?? 1), n = Math.max(1, Math.round(size * 0.5)), wind = opts.wind ?? 0.55, frame = opts.frame ?? this.frame, period = opts.period ?? 6;
    for (let i = 0; i < n; i++) {
      const ph = (frame / period + r()) % 1, h = size * (0.7 + 0.6 * Math.sin((ph + i * 0.3) * Math.PI * 2) ** 2) * (0.6 + r() * 0.6);
      const x0 = x + (r() - 0.5) * size * 0.8, w = Math.max(1, size * 0.22);
      for (let j = 0; j < h; j++) {
        const f = j / h, cx = Math.round(x0 + f * f * h * wind + Math.sin(f * 4 + ph * 6.28) * 0.6), cy = Math.round(y - j), ww = Math.max(0, Math.round(w * (1 - f)));
        const key = core[Math.min(m - 1, Math.floor(f * m))];
        for (let d = -ww; d <= ww; d++) this.px(cx + d, cy, Math.abs(d) === ww && ww > 0 ? (f < 0.5 ? core[Math.min(2, m - 1)] : edge) : key);
      }
    }
  }

  /**
   * A strip that wraps (a sprite with `wrap: "x"`) going by: placed at its offset for the frame, and
   * again a strip-width on until the canvas is covered; `per` px a loop, leftward (negative: right).
   * `per` is a whole number of the strip's widths, so the last frame runs into the first. A parallax
   * plane in one call.
   */
  scroll(name: string, y: number, per: number, opts: { x?: number; frame?: number } = {}): void {
    const w = this.size(name).w, f = opts.frame ?? this.frame;
    if (!w) return;
    if (this.frames > 1 && per % w !== 0) throw new PxError(`scroll: '${name}' is ${w} px wide, so per (${per}) must be a whole number of ${w}s for the loop to close (e.g. ${w * Math.max(1, Math.round(Math.abs(per) / w))})`);
    let x = (opts.x ?? 0) - ((((Math.floor((f * per) / this.frames)) % w) + w) % w);
    while (x > -this.ox) x -= w;
    for (; x < this.img.w - this.ox; x += w) this.stamp(name, x, y);
  }

  /**
   * A lane of cumulus drifting across in a loop that closes: clouds `gap` px apart, each moving one
   * slot along over the loop (rightward; a negative `gap`, leftward) while it turns into the next slot's
   * cloud. `n` designs from `seed`, `w`
   * across and `h` tall, `sizes` scaling each; a slot in `empty` holds none, so a cloud forms out of
   * nothing or thins away there. Cut flat at the base on row `y`. `keys`: the lit top, the gray low
   * down and on the shaded right, the base.
   */
  clouds(opts: { y: number; gap: number; w: number; h: number; n?: number; seed?: number; keys?: string; x?: number; empty?: number[]; sizes?: number[]; frame?: number }): void {
    if (!opts || [opts.y, opts.gap, opts.w, opts.h].some((v) => typeof v !== "number")) throw new PxError("clouds({ y, gap, w, h, n?, seed?, keys?, x?, empty?, sizes? }): the base row, the px between clouds, a cloud's width and height");
    const { y, gap, w, h, n = 4, seed = 1, keys = "Wwv", x = 0 } = opts, [top, mid, base] = [...keys];
    const t = opts.frame === undefined ? this.phase : (((opts.frame % this.frames) + this.frames) % this.frames) / this.frames;
    const designs = Array.from({ length: n }, (_, i) => {
      const r = rng(seed * 31 + i), s = opts.sizes?.[i] ?? 1, none = opts.empty?.includes(i);
      return Array.from({ length: 7 }, () => [(r() - 0.5) * w * s * 0.85, -r() * h * s * 0.45, none ? 0 : h * s * (0.32 + r() * 0.3)]);
    });
    const at = (j: number) => designs[((j % n) + n) % n], right = this.img.w - this.ox, g = Math.abs(gap) || 1;
    // every slot whose cloud can reach the canvas over the loop, rightward from j = -2 as ever
    const [j0, j1] = gap > 0 ? [-2, Math.ceil((right + w - x) / g) + 1] : [Math.floor((x - right - w) / g) - 1, Math.ceil((x + w + this.ox) / g) + 1];
    for (let j = j0; j < j1; j++) {
      const a = at(j), b = at(j + 1);
      // the puffs of one cumulus, cut flat at the base: lit on top, gray low down and on the right
      const cx = x + (j + t) * gap, px = new Map<number, [number, number]>();
      for (let k = 0; k < a.length; k++) {
        const [dx, dy, r] = a[k].map((v, m) => v + (b[k][m] - v) * t);
        if (r < 0.6) continue;
        for (let yy = Math.floor(y + dy - r); yy <= y; yy++)
          for (let xx = Math.floor(cx + dx - r); xx <= Math.ceil(cx + dx + r); xx++)
            if (xx >= -this.ox && xx < right && yy >= -this.oy && (xx + 0.5 - cx - dx) ** 2 + (yy + 0.5 - y - dy) ** 2 <= r * r) px.set(yy * 4096 + xx, [xx, yy]);
      }
      for (const [i, [xx, yy]] of px) this.px(xx, yy, yy >= y ? base : yy >= y - h * 0.3 || !px.has(i + 1) ? mid : top);
    }
  }

  /**
   * Smoke, steam or dust rising from (x, y) in a loop that closes: a puff every `every` frames (2),
   * each living `life` frames (36), rising `rise` px (24), quickly at first, and carried `wind` px a
   * frame ([x, y], or a number for x), which it takes on over its first `inertia` frames (0: at once;
   * smoke from a moving engine keeps the stack's speed a while). It swells from `size[0]` to `size[1]`
   * px in radius ([2, 8]) and thins out in dither. `keys`: lit, middle, shaded; `young`: lit and shaded
   * while it is fresh (dark smoke at a stack). Lit from `light` (default the upper left).
   */
  plume(x: number, y: number, keys: string, opts: { every?: number; life?: number; rise?: number; wind?: number | [number, number]; inertia?: number; size?: [number, number]; young?: string; seed?: number; frame?: number; light?: [number, number] } = {}): void {
    const every = Math.max(1, opts.every ?? 2), life = opts.life ?? 36, rise = opts.rise ?? 24, tau = opts.inertia ?? 0, [s0, s1] = opts.size ?? [2, 8];
    const [wx, wy] = typeof opts.wind === "number" ? [opts.wind, 0] : opts.wind ?? [0, 0], f = opts.frame ?? this.frame, frames = this.frames;
    const [lit, mid, shade] = [...keys], young = opts.young ? [...opts.young] : null, [lx, ly] = opts.light ?? [-0.6, -0.8], ll = Math.hypot(lx, ly) || 1;
    const carried = (age: number) => (tau > 0 ? age - tau * (1 - Math.exp(-age / tau)) : age);
    for (let age = life - 1; age >= 0; age--) {
      const born = f - age;
      if (((born % every) + every) % every) continue;
      const id = ((born % frames) + frames) % frames, r = rng((opts.seed ?? 1) * 7919 + id);
      const cx = x + wx * carried(age) + (r() - 0.5) * 5, cy = y + wy * carried(age) - rise * (1 - Math.exp(-age / (life * 0.37))) - r() * 4 + 2;
      const rad = s0 + ((s1 - s0) * age) / life + r() * 2, fade = 1 - age / life;
      for (let yy = Math.floor(cy - rad); yy <= cy + rad; yy++)
        for (let xx = Math.floor(cx - rad); xx <= cx + rad; xx++) {
          const dx = (xx + 0.5 - cx) / rad, dy = (yy + 0.5 - cy) / rad;
          const edge = 1 - dx * dx - dy * dy + (vnoise(xx * 0.3 + id * 1.7, yy * 0.3) - 0.5) * 0.6;
          if (edge <= 0 || Math.min(1, 2 * fade ** 1.4) * Math.min(1, edge * 2.5) < bayer(xx, yy)) continue;
          const l = (dx * lx + dy * ly) / ll, fresh = young && age < life * 0.18;
          this.px(xx, yy, fresh ? (l > 0.3 ? young[0] : young[1]) : l > 0.3 ? lit : l > -0.3 ? mid : young && age < life * 0.47 ? young[1] : shade);
        }
    }
  }

  /** Shapes in meters (sticks, blobs, boxes, cones, polygons: see solids.ts) drawn far to near through the camera. */
  solids(view: Partial<View>, shapes: Solid[], opts: SolidOpts = {}): void {
    drawSolids(this as unknown as SolidCanvas, perspective({ ...view, w: view.w ?? this.img.w } as View), shapes, opts);
  }

  /** The same shapes' shadows on the ground, from the sun: each ground color turned into its shade by opts.shade. */
  shadows(view: Partial<View>, shapes: Solid[], opts: SolidOpts): void {
    if (!opts?.shade || !opts.sun) throw new PxError("shadows(view, shapes, { sun: { from: [x, z], up: degrees }, shade: { ground: shade, ... } }): where the sun is and what each ground color turns into in shade");
    const w = this.img.w, x0 = -this.ox, y0 = -this.oy;
    for (const i of castSolids(perspective({ ...view, w: view.w ?? this.img.w } as View), shapes, opts, w, this.img.h, x0, y0)) {
      const x = (i % w) + x0, y = Math.floor(i / w) + y0, d = opts.shade[this.key(x, y)];
      if (d) this.px(x, y, d);
    }
  }

  /** Flat faces in meters (model()) drawn through the camera, the nearest kept per pixel, toned along their material's ramp: see mesh.ts. */
  mesh(view: Partial<View> | ((p: [number, number, number]) => [number, number, number]), faces: Face[], mats: Record<string, Material>, opts: MeshOpts = {}): void {
    drawMesh(this as unknown as MeshCanvas, view, faces, mats, opts);
  }

  plane(view: Partial<View>, fn: (x: number, z: number, col: number, row: number) => string | null | undefined, where?: Region): void {
    const P = perspective({ ...view, w: view.w ?? this.img.w } as View), inside = where === undefined ? undefined : regionPred(where);
    for (let row = Math.max(-this.oy, Math.floor(P.horizon)); row < this.img.h - this.oy; row++) {
      for (let col = -this.ox; col < this.img.w - this.ox; col++) {
        const g = P.at(col, row);
        if (!g || (inside && !inside(col, row))) continue;
        const k = fn(g[0], g[1], col, row);
        if (k && k !== ".") this.px(col, row, k);
      }
    }
  }

  /**
   * Move pixels by whole-pixel offsets, for motion drawn once: breathing, hair and tails swaying, a
   * body following a slope. fn(x, y) gives the offset [dx, dy] at a pixel's new place (or nothing:
   * stays); the pixel takes the color found (dx, dy) behind it, so no hole opens and no color is
   * made up. Offsets are rounded. `where` limits it to a region (of new places).
   */
  warp(fn: (x: number, y: number) => unknown, where?: Region): void {
    if (typeof fn !== "function") throw new PxError("warp((x, y) => [dx, dy], where?) needs a function giving each pixel's offset");
    const ok = regionPred(where), src = this.img.copy(), out: [number, number, Color][] = [];
    for (let y = -this.oy; y < this.img.h - this.oy; y++)
      for (let x = -this.ox; x < this.img.w - this.ox; x++) {
        if (!ok(x, y)) continue;
        const d = fn(x, y);
        if (d === undefined || d === null || d === false || d === 0) continue;
        if (!Array.isArray(d) || d.length !== 2 || !d.every(Number.isFinite))
          throw new PxError(`warp: the function must give [dx, dy] (or nothing), got ${JSON.stringify(d)} at ${x}, ${y}`);
        const dx = Math.round(d[0]), dy = Math.round(d[1]);
        if (dx || dy) out.push([x, y, src.get(this.ox + x - dx, this.oy + y - dy)]);
      }
    for (const [x, y, c] of out) this.plot(x, y, c);
  }

  /**
   * Volume for flat art: each pixel steps along its ramp by where it sits in the shape. An edge
   * facing the light (empty space on that side) gets lighter, one facing away darker; the steps
   * come from the light direction, so with the default top-left light a top edge gets +1, a left
   * edge +0.5, a bottom edge -1, a right edge -0.5 (rounded). Pixels on no ramp are left alone.
   */
  relight(where?: Region, opts: RelightOpts = {}): void {
    // drawn mirrored (a twin), x runs the other way: the light keeps its place in the picture
    const [lx0, ly] = opts.light ?? [-0.5, -1], lx = this.mirrored ? -lx0 : lx0, reach = Math.max(1, Math.floor(opts.reach ?? 1)), strength = opts.strength ?? 1;
    const ramps = opts.ramps ?? [...this.pal.ramps];
    if (!ramps.length) throw new PxError('relight: no ramps: add ramps("kDdu", ...) (dark -> light), or pass { ramps: ["kDdu"] }');
    const on = new Map<Color, Color[]>(), at = new Map<Color, number>();
    for (const r of ramps) {
      const cs = [...r].map((k) => this.color(k)).filter((c): c is Color => c !== null && c !== TRANSPARENT);
      cs.forEach((c, i) => { if (!on.has(c)) { on.set(c, cs); at.set(c, i); } });
    }
    const ok = regionPred(where), out: [number, number, Color][] = [];
    const open = (x: number, y: number, ex: number, ey: number) => {
      for (let k = 1; k <= reach; k++) if (this.get(x + ex * k, y + ey * k) === TRANSPARENT) return true;
      return false;
    };
    for (let y = -this.oy; y < this.img.h - this.oy; y++)
      for (let x = -this.ox; x < this.img.w - this.ox; x++) {
        const c = this.get(x, y), ramp = on.get(c);
        if (!ramp || !ok(x, y)) continue;
        let s = 0;
        for (const [ex, ey] of [[0, -1], [-1, 0], [0, 1], [1, 0]]) if (open(x, y, ex, ey)) s += ex * lx + ey * ly;
        const i = opts.glint !== undefined && s >= opts.glint ? ramp.length - 1 : Math.max(0, Math.min(ramp.length - 1, at.get(c)! + Math.round(s * strength)));
        if (ramp[i] !== c) out.push([x, y, ramp[i]]);
      }
    for (const [x, y, c] of out) this.plot(x, y, c);
  }

  /** Before a shade / light step: warn if a pixel it reaches has a color its ramps disagree on. */
  private clashes(dir: -1 | 1, where?: Region): void {
    if (!this.res.warn || !this.pal.ramps.length) return;
    const cl = this.pal.stepClashes(dir);
    if (!cl.size) return;
    const ok = regionPred(where);
    for (let y = -this.oy; y < this.img.h - this.oy; y++)
      for (let x = -this.ox; x < this.img.w - this.ox; x++) {
        const why = cl.get(this.get(x, y));
        if (why && ok(x, y)) { this.res.warn(why, this.loc); cl.delete(this.get(x, y)); }
      }
  }

  swapMap(swap: Record<string, string>): Map<Color, Color> {
    const m = new Map<Color, Color>();
    for (const from of Object.keys(swap)) {
      const a = this.color(from), b = this.color(swap[from]);
      if (a !== null && b !== null) m.set(a, b);
    }
    return m;
  }

  // ---------------------------------------------------------------- assets

  /** Pick one candidate of `name` and transform it; random choices seeded by (a, b). */
  asset(name: string, opts: PlaceOpts = {}, a = 0, b = 0): Img {
    const list = this.res.candidates(name);
    const r = rng(hash(a, b, (opts.seed ?? 0) + this.seed));
    let inner = this.seed;
    if (opts.reseed === true) inner += (hash(a, b, opts.seed ?? 0) % 99991) + 1;
    else if (typeof opts.reseed === "number") inner += opts.reseed;
    let pick = list[Math.floor(r() * list.length)];
    if (opts.fit !== undefined) {
      // of a group (sizes of one thing), the member whose drawing is nearest that height, the smaller
      // on a tie: a figure far down a road takes the sprite drawn for its size
      if (!(Number.isFinite(opts.fit) && opts.fit > 0)) throw new PxError(`fit is the height in px to pick the member of '${name}' by, got ${JSON.stringify(opts.fit)}`);
      const tall = (m: string) => { const im = this.res.image(m, inner); return im.bounds()?.h ?? im.h; };
      pick = list.map((m) => [m, tall(m)] as const).reduce((a, b) => (Math.abs(b[1] - opts.fit!) < Math.abs(a[1] - opts.fit!) || (Math.abs(b[1] - opts.fit!) === Math.abs(a[1] - opts.fit!) && b[1] < a[1]) ? b : a))[0];
    }
    let t = this.t, track = true;
    if (opts.frame !== undefined || opts.delay || opts.rdelay) {
      const tl = this.res.timeline(pick, inner);
      if (tl) {
        if (opts.frame !== undefined) {
          t = frameStart(tl, opts.frame);
          track = false;
        } else {
          // Shifts snap to the anim's step so combined timelines stay on a frame grid.
          let d = opts.delay ?? 0;
          if (opts.rdelay) d += rng(hash(a, b, (opts.seed ?? 0) + this.seed + 7919))() * tl.loop;
          t += Math.round(d / tl.step) * tl.step;
        }
      }
    }
    let src = this.res.image(pick, inner, t, track);
    const swap = opts.rswap ? opts.rswap[Math.floor(r() * opts.rswap.length)] : opts.swap;
    if (swap && Object.keys(swap).length) src = src.remap(this.swapMap(swap));
    if (opts.silhouette !== undefined) {
      const c = this.color(opts.silhouette);
      if (c !== null) src = src.silhouette(c);
    }
    if (opts.flip) src = src.flip(opts.flip);
    if (opts.rflip) {
      let f = "";
      for (const ax of opts.rflip) if ((ax === "x" || ax === "y") && r() < 0.5) f += ax;
      if (f) src = src.flip(f as "x" | "y" | "xy");
    }
    if (opts.rot) src = src.rot(opts.rot);
    if (opts.cast !== undefined) {
      const k = opts.cast;
      if (!Array.isArray(k) || k.length !== 2 || !k.every(Number.isFinite))
        throw new PxError(`cast must be [kx, ky], how far a pixel 1px up lands from its base (e.g. [0.6, 0.2]), got ${JSON.stringify(k)}`);
      if (opts.castBase !== undefined && opts.castBase !== "pivot" && opts.castBase !== "column")
        throw new PxError(`castBase must be "pivot" (the pivot's row) or "column" (each column's lowest pixel), got ${JSON.stringify(opts.castBase)}`);
      src = src.cast(k[0], k[1], opts.castBase);
    }
    return src;
  }

  /** This image now has lettering: describe warns when a mirror turns it backwards. */
  private lettered(): void {
    (this.img.orient ??= { u: [0, -1, 0], mirrored: false, text: false }).text = true;
  }

  /** Draw an image at canvas coords; with a predicate, only onto pixels it accepts. Lamps come along. */
  put(src: Img, x: number, y: number, ok?: Pred): void {
    if (src.orient?.text) this.lettered();
    if (src.lamps?.length) {
      const dx = this.ox + Math.floor(x), dy = this.oy + Math.floor(y), w = this.img.w;
      (this.img.lamps ??= []).push(...src.lamps.map((l) => ({ ...l, x: this.mirrored ? w - 1 - (l.x + dx) : l.x + dx, y: l.y + dy })));
    }
    // a twin draws pixel by pixel, each one landing mirrored
    if (!ok && !this.clipPred && !this.wrap && !this.mirrored) {
      this.img.blit(src, this.ox + x, this.oy + y);
      return;
    }
    for (let yy = 0; yy < src.h; yy++)
      for (let xx = 0; xx < src.w; xx++) {
        const c = src.data[yy * src.w + xx];
        if (c === TRANSPARENT || (ok && !ok(x + xx, y + yy)) || !this.plot(x + xx, y + yy, c)) continue;
        const i = this.index(Math.floor(x) + xx, Math.floor(y) + yy), j = yy * src.w + xx;
        if (src.norm) {
          const n = this.img.normals();
          n.set(src.norm.subarray(j * 3, j * 3 + 3), i * 3);
        } else if (this.img.norm) this.img.norm[i * 3 + 2] = 0;
      }
  }

  /** Is there an asset or group of this name (a part drawn yet)? */
  exists(name: string): boolean {
    return this.res.has(name);
  }

  /** An asset's size as it would be placed (a group's first member): for layouts in drawing code. */
  size(name: string): { w: number; h: number } {
    const img = this.res.image(this.res.candidates(name)[0], 0, 0, false);
    return { w: img.w, h: img.h };
  }

  /** Draw `src` with its pivot (default: `def`, as a fraction of its size) on (x, y). */
  private putAt(src: Img, x: number, y: number, def: [number, number], ok?: Pred, name?: string, sub?: [number, number]): void {
    const [px, py] = src.pivot ?? [src.w * def[0], src.h * def[1]];
    if (sub) this.subPut(src, x - Math.floor(px), y - Math.floor(py), sub);
    else this.put(src, x - Math.floor(px), y - Math.floor(py), ok);
    // logged where it was drawn: blit floors a fractional position (stamp("p", 282 + 8 * 0.88, y))
    if (name) this.log?.push({ name, x: Math.floor(this.ox + x - Math.floor(px)), y: Math.floor(this.oy + y - Math.floor(py)), w: src.w, h: src.h, layer: this.layerName, img: src });
  }

  stamp(name: string, x = 0, y = 0, opts?: PlaceOpts): void {
    if (opts?.at !== undefined) [x, y] = this.socketAt(opts.at, x, y);
    const src = this.asset(name, opts, x, y), [px, py] = src.pivot ?? [0, 0];
    this.placed?.set(opts?.id ?? name, { x: this.ox + x - Math.floor(px), y: this.oy + y - Math.floor(py), sockets: src.sockets });
    const sub = opts?.sub;
    if (sub !== undefined && sub !== true && sub !== false && !(Array.isArray(sub) && sub.length === 2 && sub.every(Number.isFinite)))
      throw new PxError(`sub is true, or [dx, dy] the way the part moves (1 right / down, -1 left / up), got ${JSON.stringify(sub)}`);
    if (opts?.smear !== undefined) {
      if (sub) throw new PxError("smear and sub don't go together: a smear is a move of more than a pixel");
      return this.place(this.smeared(src, opts.smear, x, y), x, y, [0, 0], undefined, opts?.z, name);
    }
    this.place(src, x, y, [0, 0], undefined, opts?.z, name, sub ? (Array.isArray(sub) ? (sub as [number, number]) : [1, 1]) : undefined);
  }

  /**
   * `src` with its smear under it (Saint11's motion blur: the silhouette swept from where it was to where
   * it is, in one light key), as one image whose pivot stays on `src`'s, so a sorted layer orders it as one.
   */
  private smeared(src: Img, smear: unknown, x: number, y: number): Img {
    const spec = Array.isArray(smear) ? { from: smear } : smear as { from?: unknown; c?: unknown };
    const from = spec?.from;
    if (!(Array.isArray(from) && from.length === 2 && from.every(Number.isFinite)) || (spec.c !== undefined && typeof spec.c !== "string"))
      throw new PxError(`smear is [x, y] where it was (as the stamp's x, y), or { from: [x, y], c: "key" }, got ${JSON.stringify(smear)}`);
    const dx = Math.round(from[0] - x), dy = Math.round(from[1] - y);
    // the key: the one given, else the sprite's lightest color
    let col: Color | null = spec.c !== undefined ? this.color(spec.c as string) : null;
    if (col === null) for (const c of src.data) if ((c & 255) >= 128 && (col === null || oklab(c)[0] > oklab(col)[0])) col = c;
    const cx = Math.max(0, -dx), cy = Math.max(0, -dy), out = new Img(src.w + Math.abs(dx), src.h + Math.abs(dy));
    const n = Math.max(1, 2 * Math.max(Math.abs(dx), Math.abs(dy)));
    for (let s = 0; s <= n; s++) {
      const ox = cx + Math.round((dx * (n - s)) / n), oy = cy + Math.round((dy * (n - s)) / n);
      for (let j = 0; j < src.h; j++) for (let i = 0; i < src.w; i++) if ((src.data[j * src.w + i] & 255) >= 128) out.data[(oy + j) * out.w + ox + i] = col!;
    }
    for (let j = 0; j < src.h; j++) for (let i = 0; i < src.w; i++) { const c = src.data[j * src.w + i]; if ((c & 255) >= 128) out.data[(cy + j) * out.w + cx + i] = c; }
    const [px, py] = src.pivot ?? [0, 0];
    out.pivot = [px + cx, py + cy];
    return out;
  }

  /**
   * Put `src` at a place between pixels (sub: true), as pixel artists draw a part half a pixel
   * along. From a third to two thirds of the way it stays at the place it comes from (`dir`, the way
   * it moves: [1, 1] right and down, -1 left or up), and its edges move instead of it:
   * - with an outline (its edge pixel unlike the one behind it), it pushes into its own outline: the
   *   outline ahead takes the key between it and the fill, the fill behind the outline it leaves
   *   takes the key between it and that outline; the silhouette stays (works on clear, as a game
   *   sprite is drawn);
   * - without one, half a pixel of it spills past its edge ahead over what's painted there, in the key
   *   between the two (nothing over clear).
   * The keys: a key between the two in a ramp that holds both, else the palette's nearest their
   * middle (see betweenKey). Nearer a whole place, it's there.
   */
  private subPut(src: Img, x: number, y: number, dir: [number, number] = [1, 1]): void {
    const sx = dir[0] < 0 ? -1 : 1, sy = dir[1] < 0 ? -1 : 1;
    const fx = x - Math.floor(x), fy = y - Math.floor(y), mx = fx >= 1 / 3 && fx <= 2 / 3, my = fy >= 1 / 3 && fy <= 2 / 3;
    // in the middle it's at the place it comes from: the lower one moving right or down, the higher one moving left or up
    const bx = mx ? (sx > 0 ? Math.floor(x) : Math.ceil(x)) : Math.round(x), by = my ? (sy > 0 ? Math.floor(y) : Math.ceil(y)) : Math.round(y);
    this.put(src, bx, by);
    if (!mx && !my) return;
    const opaque = (c: Color) => (c & 255) >= 128, own = (i: number, j: number) => i >= 0 && j >= 0 && i < src.w && j < src.h && opaque(src.data[j * src.w + i]);
    const at = (i: number, j: number) => src.data[j * src.w + i];
    const set = new Map<string, [number, number, Color]>();
    const steps: [number, number][] = [];
    if (mx) steps.push([sx, 0]);
    if (my) steps.push([0, sy]);
    for (let j = 0; j < src.h; j++) for (let i = 0; i < src.w; i++) {
      if (!own(i, j)) continue;
      const c = at(i, j);
      for (const [dx, dy] of steps) {
        // its edge ahead: an outline it pushes into, or nothing, where it spills
        if (!own(i + dx, j + dy)) {
          if (own(i - dx, j - dy) && at(i - dx, j - dy) !== c) {
            const m = betweenKey(this.pal, c, at(i - dx, j - dy));
            if (m !== null) set.set(`${i},${j}`, [i, j, m]);
          } else if (!set.has(`${i + dx},${j + dy}`)) {
            const X = bx + i + dx, Y = by + j + dy, k = this.index(X, Y), under = k < 0 ? TRANSPARENT : this.img.data[k];
            const m = opaque(under) ? betweenKey(this.pal, c, under) : null;
            if (m !== null) set.set(`${i + dx},${j + dy}`, [i + dx, j + dy, m]);
          }
        }
        // the outline behind, that it leaves: the fill next to it darkens toward it
        if (!own(i - dx, j - dy) && own(i + dx, j + dy) && at(i + dx, j + dy) !== c) {
          const m = betweenKey(this.pal, at(i + dx, j + dy), c);
          if (m !== null && !set.has(`${i + dx},${j + dy}`)) set.set(`${i + dx},${j + dy}`, [i + dx, j + dy, m]);
        }
      }
    }
    // going both ways, a convex corner of a part that spills: its corner pixel too
    if (mx && my) for (let j = 0; j < src.h; j++) for (let i = 0; i < src.w; i++) {
      if (!own(i, j) || own(i + sx, j) || own(i, j + sy) || own(i + sx, j + sy) || (own(i - sx, j) && at(i - sx, j) !== at(i, j))) continue;
      const X = bx + i + sx, Y = by + j + sy, k = this.index(X, Y), under = k < 0 ? TRANSPARENT : this.img.data[k];
      const m = opaque(under) ? betweenKey(this.pal, at(i, j), under) : null;
      if (m !== null && !set.has(`${i + sx},${j + sy}`)) set.set(`${i + sx},${j + sy}`, [i + sx, j + sy, m]);
    }
    for (const [i, j, m] of set.values()) this.plot(bx + i, by + j, m);
    // half a pixel along and nothing to show it: it would read as standing still
    if (!set.size) this.res.warn?.(`'${this.owner?.name ?? "?"}': a stamp half a pixel along drew no in-between tone: the part has no outline to push into and spills over the clear, or no key lies between its colors and what it meets (a ramp through both); give it an outline or a ramp, or stamp it at a whole pixel`, this.loc ?? this.owner?.loc);
  }

  /**
   * Put a placed asset's pivot on (x, y): drawn now, or in a sorted layer queued and drawn on
   * flush() by y (where it stands) or z.
   */
  private place(src: Img, x: number, y: number, def: [number, number], ok?: Pred, z = 0, name?: string, sub?: [number, number]): void {
    if (!this.sorted) return this.putAt(src, x, y, def, ok, name, sub);
    if (!Number.isFinite(z)) throw new PxError(`z must be a number, got ${JSON.stringify(z)}`);
    // Drawn later, in order: keep the clip that was active at the call.
    const clip = this.clipPred, q = this.sorted.queue;
    q.push({ key: this.sorted.by === "y" ? y : z, seq: q.length, draw: () => {
      const prev = this.clipPred;
      this.clipPred = clip;
      try { this.putAt(src, x, y, def, ok, name, sub); } finally { this.clipPred = prev; }
    } });
  }

  /** Draw the stamps a sorted layer queued: by key (y or z), ties in call order. */
  flush(): void {
    if (!this.sorted) return;
    const q = this.sorted.queue.splice(0).sort((a, b) => a.key - b.key || a.seq - b.seq);
    for (const d of q) d.draw();
  }

  /** "id.socket" -> canvas coords of that socket of an earlier placement, plus (dx, dy). */
  private socketAt(at: string, dx: number, dy: number): [number, number] {
    const i = typeof at === "string" ? at.lastIndexOf(".") : -1;
    if (i <= 0 || i === at.length - 1) throw new PxError(`at must be "placement.socket" (e.g. "body.shoulder"), got ${JSON.stringify(at)}`);
    const id = at.slice(0, i), name = at.slice(i + 1), p = this.placed?.get(id);
    if (!p) throw new PxError(`at "${at}": nothing placed as '${id}' yet in this asset; stamp it first (an earlier layer counts), or name a placement with { id }`);
    const s = p.sockets?.[name];
    if (!s) throw new PxError(`at "${at}": '${id}' has no socket '${name}'` + (p.sockets ? `; it has: ${Object.keys(p.sockets).join(", ")}` : `; give its asset { sockets: { ${name}: [x, y] } }`));
    return [p.x + s[0] - this.ox + dx, p.y + s[1] - this.oy + dy];
  }

  tile(name: string, x: number, y: number, cols = 1, rows = 1, opts?: PlaceOpts): void {
    const step = this.res.image(this.res.candidates(name)[0], 0);
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const tx = x + c * step.w, ty = y + r * step.h;
        this.put(this.asset(name, opts, tx, ty), tx, ty);
      }
  }

  /** Tile `name` over an area; edge tiles are cut to fit. */
  pattern(name: string, x: number, y: number, w: number, h: number, opts?: PlaceOpts): void {
    const step = this.res.image(this.res.candidates(name)[0], 0);
    for (let ty = y; ty < y + h; ty += step.h)
      for (let tx = x; tx < x + w; tx += step.w) {
        let src = this.asset(name, opts, tx, ty);
        const cw = Math.min(src.w, x + w - tx), ch = Math.min(src.h, y + h - ty);
        if (cw < src.w || ch < src.h) src = src.sub(0, 0, cw, ch);
        this.put(src, tx, ty);
      }
  }

  /**
   * 9-slice: draw an asset with `slice` margins at any size w x h. Corners stay as drawn; edges and
   * center repeat (never stretch, so pixels keep their shape).
   */
  panel(name: string, x: number, y: number, w: number, h: number, opts?: PlaceOpts): void {
    const src = this.asset(name, opts, x, y);
    if (!src.slice) throw new PxError(`panel: '${name}' has no slice margins: give it { slice: n } or { slice: [left, top, right, bottom] }`);
    const [l, t, r, b] = src.slice, cw = src.w - l - r, ch = src.h - t - b;
    w = Math.floor(w); h = Math.floor(h);
    if (w < l + r || h < t + b) throw new PxError(`panel: ${w}x${h} is smaller than '${name}'s corners (${l + r}x${t + b})`);
    const sx = (v: number, size: number, a: number, z: number, mid: number) => (v < a ? v : v >= size - z ? mid + a + z - (size - v) : a + ((v - a) % mid));
    const out = new Img(w, h);
    for (let yy = 0; yy < h; yy++)
      for (let xx = 0; xx < w; xx++) out.data[yy * w + xx] = src.get(sx(xx, w, l, r, cw), sx(yy, h, t, b, ch));
    this.put(out, x, y);
  }

  /** Character map of tiles: tilemap(`gg\ndd`, { map: { g: "grass" }, size: 16 }). */
  tilemap(str: string, opts: TilemapOpts): void {
    if (typeof str !== "string") throw new PxError("tilemap(str, { map, size }) needs the map string first");
    if (!opts?.map) throw new PxError("tilemap needs { map: { char: assetName } }");
    if (opts.corners) {
      return this.tilemap(...cornerTiles(str, opts, (n) => this.res.has(n)));
    }
    if (typeof opts.map === "string") throw new PxError(`tilemap: map "${opts.map}" as a name prefix needs { corners: ... }; a tile map takes { map: { char: assetName } }`);
    const map = opts.map;
    const rows = gridRows(str);
    const x0 = opts.x ?? 0, y0 = opts.y ?? 0;
    if (opts.iso && !(opts.w && opts.h)) throw new PxError("tilemap { iso: true } needs the floor diamond's size: { w: 32, h: 16 }");
    const cells: { r: number; i: number; name: string }[] = [];
    rows.forEach((row, r) => {
      [...row].forEach((ch, i) => {
        if (ch === "." || ch === " ") return;
        const name = map[ch];
        if (!name) throw new PxError(`tilemap: no tile for '${ch}' (row ${r}, col ${i}); map has: ${Object.keys(map).join(" ")}`);
        cells.push({ r, i, name });
      });
    });
    // Record what lands in each cell, for exporting the map (Tiled).
    const cols = Math.max(0, ...rows.map((row) => [...row].length));
    const first = cells.length ? this.res.image(this.res.candidates(cells[0].name)[0], 0, 0, false) : undefined;
    const layer: TileLayer = { name: this.layerName ?? "tilemap", iso: !!opts.iso, cols, rows: rows.length,
      tw: opts.w ?? opts.size ?? first?.w ?? 0, th: opts.h ?? opts.size ?? first?.h ?? 0, x: x0, y: y0, cells: new Array(cols * rows.length) };
    this.maps?.push(layer);
    if (opts.iso) {
      // Columns run down-right, rows down-left; back to front, so nearer tiles cover farther ones.
      // A tile's top-left sits on its diamond's top-left; a tile with a pivot stands it on the
      // diamond's center (trees, props).
      const w = opts.w!, h = opts.h!;
      cells.sort((a, b) => a.i + a.r - (b.i + b.r) || a.r - b.r);
      for (const { r, i, name } of cells) {
        const tx = x0 + ((i - r) * w) / 2, ty = y0 + ((i + r) * h) / 2, src = this.asset(name, opts, tx, ty);
        layer.cells[r * cols + i] = src;
        if (src.pivot) this.putAt(src, tx + w / 2, ty + h / 2, [0, 0]);
        else this.put(src, tx, ty);
      }
      return;
    }
    for (const { r, i, name } of cells) {
      const step = opts.w && opts.h ? null : this.res.image(this.res.candidates(name)[0], 0);
      const tx = x0 + i * (opts.w ?? opts.size ?? step!.w), ty = y0 + r * (opts.h ?? opts.size ?? step!.h);
      const src = this.asset(name, opts, tx, ty);
      layer.cells[r * cols + i] = src;
      this.put(src, tx, ty);
    }
  }

  /** Brush: `count` random picks of `name` centered at random points in the area. */
  scatter(name: string, x: number, y: number, w: number, h: number, count: number, opts: ScatterOpts = {}): void {
    const r = rng(hash(x * 31 + w, y * 17 + h, (opts.seed ?? 0) + this.seed));
    const on = this.maskAt(opts.on, opts.below);
    let ok = on;
    if (opts.near !== undefined) {
      // also within `within` px of a pixel in the `near` keys: grass along a path, moss at a rock's foot
      const near = this.maskAt(opts.near, opts.below), d = opts.within ?? 2, k = Math.ceil(d);
      if (!(d >= 0)) throw new PxError(`scatter: within must be a distance in px, got ${opts.within}`);
      ok = (cx, cy) => {
        if (!on(cx, cy)) return false;
        for (let dy = -k; dy <= k; dy++) for (let dx = -k; dx <= k; dx++) if (dx * dx + dy * dy <= d * d && near(cx + dx, cy + dy)) return true;
        return false;
      };
    }
    let placed = 0, tries = 0;
    if (opts.even) {
      // One pick per cell of a grid sized to `count`, at a random spot inside it: spread evenly over
      // the whole area, never in rows (pure random clumps and leaves holes).
      const s = Math.sqrt((w * h) / count), cols = Math.max(1, Math.round(w / s)), rows = Math.max(1, Math.round(h / s));
      for (let j = 0; j < rows; j++)
        for (let i = 0; i < cols; i++)
          for (let t = 0; t < 30; t++) {
            const cx = x + Math.floor(((i + r()) * w) / cols), cy = y + Math.floor(((j + r()) * h) / rows);
            if (!ok(cx, cy)) continue;
            this.place(this.asset(name, opts, cx, cy), cx, cy, [0.5, 0.5], opts.clip ? on : undefined, 0, name);
            placed++;
            break;
          }
      tries = count * 30;
    }
    while (placed < count && tries < count * 30) {
      tries++;
      const cx = x + Math.floor(r() * w), cy = y + Math.floor(r() * h);
      if (!ok(cx, cy)) continue;
      this.place(this.asset(name, opts, cx, cy), cx, cy, [0.5, 0.5], opts.clip ? on : undefined, 0, name);
      placed++;
    }
    // A brush that silently paints nothing is the usual sign of an empty layer under `on`.
    if ((opts.on !== undefined || opts.near !== undefined) && count > 0 && placed === 0)
      throw new PxError(`scatter: ${opts.on !== undefined ? `'on: ${opts.on}'` : "nothing"}${opts.near !== undefined ? ` within ${opts.within ?? 2} px of '${opts.near}'` : ""} matched nothing in [${x}, ${y}, ${w}, ${h}] (0 of ${count} placed)` +
        (opts.below || !this.layerName ? "" : "; a layer starts empty: add below: true to read the layers under it"));
  }

  /** Grid string at (x, y): one char per pixel; "." keeps, "_" erases. */
  grid(x: number, y: number, s: string): void {
    gridRows(String(s)).forEach((row, r) => {
      [...row].forEach((ch, i) => {
        if (ch === "." || ch === " ") return;
        let c: Resolved;
        try { c = this.color(ch); } catch (e) {
          throw new PxError(`${(e as Error).message} at grid row ${r}, col ${i}`);
        }
        this.plot(x + i, y + r, c);
      });
    });
  }

  /**
   * Runs at absolute x, row by row: `{ 30: [[19, "3H3"], [23, "deeR"]] }`. Same keys as grid
   * ("." keeps, "_" erases), but nothing is counted: each run starts where it says.
   */
  runs(rows: Record<string, unknown>): void {
    for (const [ys, list] of Object.entries(rows)) {
      const y = Number(ys);
      if (!Number.isInteger(y) || !Array.isArray(list))
        throw new PxError(`runs: each row is y: [[x, "chars"], ...], got ${JSON.stringify(ys)}: ${JSON.stringify(list)}`);
      list.forEach((run, i) => {
        if (!Array.isArray(run) || run.length !== 2 || !Number.isInteger(run[0]) || typeof run[1] !== "string")
          throw new PxError(`runs: row ${y}, run ${i + 1} must be [x, "chars"], got ${JSON.stringify(run)}`);
        [...(run[1] as string)].forEach((ch, k) => {
          if (ch === ".") return;
          let c: Resolved;
          try { c = this.color(ch); } catch (e) { throw new PxError(`${(e as Error).message} in runs row ${y}, run ${i + 1}`); }
          this.plot((run[0] as number) + k, y, c);
        });
      });
    }
  }

  /**
   * A pose skeleton as a guide: bones as lines, joints as dots. `joints` maps names to [x, y] or
   * [x, y, score] (pose() in an art file reads them from a pose detector's JSON).
   */
  pose(joints: Record<string, unknown>, opts: PoseOpts = {}): void {
    const { x = 0, y = 0, scale = 1, color = "R", joint = "Y", min = 0 } = opts;
    const at = (n: string): [number, number] | undefined => {
      const j = joints[n] as number[] | undefined;
      if (!Array.isArray(j) || !Number.isFinite(j[0]) || !Number.isFinite(j[1]) || (j.length > 2 && j[2] < min)) return undefined;
      return [Math.round(j[0] * scale + x), Math.round(j[1] * scale + y)];
    };
    for (const [a, b] of opts.bones ?? POSE_BONES) {
      const p = at(a), q = at(b);
      if (p && q) this.line(p[0], p[1], q[0], q[1], (opts.sides && sideColor(a, b)) || color);
    }
    if (joint) for (const n of Object.keys(joints)) { const p = at(n); if (p) this.px(p[0], p[1], joint); }
  }

  /** Hanging cable sagging `sag` px; `hang` stamps an asset/group under it every `every` px. */
  wire(x0: number, y0: number, x1: number, y1: number, sag: number, c: string, opts: WireOpts = {}): void {
    const at = (t: number): [number, number] => [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t + sag * 4 * t * (1 - t)];
    // sampled finer than a pixel, so the path steps one pixel at a time; from each end to the middle, a half
    // rounding toward it, so a level wire comes out symmetric
    const n = 2 * (Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) + Math.abs(sag) * 2 + 1), mid = (x0 + x1) / 2;
    const half = (from: number) => {
      const p: [number, number][] = [];
      for (let i = 0; i <= n; i++) { const [fx, fy] = at(from + ((0.5 - from) * i) / n); addPerfect(p, fx < mid ? Math.round(fx) : -Math.round(-fx), fy); }
      return p;
    };
    const path = half(0);
    for (const [x, y] of half(1).reverse()) addPerfect(path, x, y);
    const col = this.color(c);
    for (const [x, y] of path) this.plot(x, y, col);
    if (!opts.hang || x1 === x0) return;
    const every = opts.every ?? 6, span = Math.abs(x1 - x0), dir = Math.sign(x1 - x0);
    for (let d = opts.start ?? Math.floor(every / 2); d < span; d += every) {
      const [, fy] = at(d / span);
      const hx = x0 + dir * d, hy = Math.round(fy);
      const src = this.asset(opts.hang, opts, hx, hy);
      this.putAt(src, hx, hy + 1, [0.5, 0], undefined, opts.hang);
    }
  }

  /** Light source at (x, y): lights the scene when a lighting() item runs; travels with stamps. */
  lamp(x: number, y: number, opts: LampOpts = {}): void {
    const c = this.color(opts.color ?? "#fff");
    if (c === null || c === TRANSPARENT) throw new PxError(`lamp color must be a visible color, got '${opts.color}'`);
    const r = opts.r ?? 32;
    if (!(r > 0)) throw new PxError(`lamp r must be > 0, got ${r}`);
    (this.img.lamps ??= []).push({ x: this.ox + Math.floor(x), y: this.oy + Math.floor(y), r, color: c, power: opts.power ?? 1, z: opts.z ?? 8 });
  }

  /** Generate surface normals for this canvas's opaque pixels (see normals.ts). */
  bump(shape: BumpOpts["shape"] = "dome", opts: BumpOpts = {}): void {
    if (this.mirrored) throw new PxError("bump in a twin would put the relief's light on the wrong side: give the twin its own bump");
    const { w, h } = this.img, mask = new Uint8Array(w * h);
    const keys = this.maskAt(opts.on ?? "*"), inside = opts.where === undefined ? undefined : regionPred(opts.where);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const cx = x - this.ox, cy = y - this.oy;
        if (keys(cx, cy) && (!inside || inside(cx, cy)) && (!this.clipPred || this.clipPred(cx, cy))) mask[y * w + x] = 1;
      }
    bump(this.img, mask, { ...opts, shape });
  }

  /** Paint normals with a numpad grid: 8 faces up, 3 down-right, 5 the viewer; qweasdzxc are softer. */
  normals(x: number, y: number, s: string): void {
    if (this.mirrored) throw new PxError("normals in a twin would point the wrong way: give the twin its own");
    gridRows(String(s)).forEach((row, r) => {
      [...row].forEach((ch, i) => {
        let d;
        try { d = dirOf(ch); } catch (e) { throw new PxError(`${(e as Error).message} at row ${r}, col ${i}`); }
        const px = Math.floor(x) + i, py = Math.floor(y) + r;
        const k = this.index(px, py);
        if (d === null || (this.clipPred && !this.clipPred(px, py)) || k < 0) return;
        if (d === "none") { if (this.img.norm) this.img.norm[k * 3 + 2] = 0; }
        else setNormal(this.img.normals(), k, d[0], d[1], d[2]);
      });
    });
  }

  /** Text in the built-in 3x5 font. */
  text(x: number, y: number, s: string, c: string, opts: TextOpts = {}): void {
    if (this.mirrored) throw new PxError("text in a twin would read backwards: letter the twin on its own, or keep the sign out of what's mirrored");
    s = String(s);
    this.lettered();
    if (opts.shadow) this.text(x + 1, y + 1, s, opts.shadow, { ...opts, shadow: undefined });
    const col = this.color(c);
    const sc = opts.scale ?? 1, gap = opts.gap ?? 1, lead = opts.lead ?? 1;
    const g = opts.font ? this.res.glyphs(opts.font) : glyph, lineH = g(" ").length;
    let ly = y;
    for (const line of s.split("\n")) {
      const lw = lineWidth(line, opts, g);
      let cx = opts.align === "c" ? x - Math.floor(lw / 2) : opts.align === "r" ? x - lw + 1 : x;
      for (const ch of line) {
        const rows = g(ch);
        rows.forEach((row, r) => {
          for (let b = 0; b < row.length; b++)
            if (row[b] === "#")
              for (let yy = 0; yy < sc; yy++) for (let xx = 0; xx < sc; xx++) this.plot(cx + b * sc + xx, ly + r * sc + yy, col);
        });
        cx += (rows[0].length + gap) * sc;
      }
      ly += (lineH + lead) * sc;
    }
  }
}

/** Start time (ms) of frame `n` of a timeline. */
export function frameStart(tl: Timeline, n: number): number {
  if (!tl.durations) return Math.max(0, Math.floor(n)) * tl.step;
  const d = tl.durations, count = tl.order ? Math.max(...tl.order) + 1 : d.length;
  // n counts drawn frames; reverse / pingpong show frame n first at another playback position.
  let k = ((Math.floor(n) % count) + count) % count;
  if (tl.order) k = tl.order.indexOf(k);
  let t = 0;
  for (let i = 0; i < k; i++) t += d[i];
  return t;
}

/** Ops callable from art files; each top-level call can be traced as one painting step. */
export const OPS = [
  "px", "rect", "box", "line", "curve", "hline", "vline", "ellipse", "circ", "ring", "arc", "poly", "fill",
  "dither", "grad", "noise", "recolor", "shade", "light", "relight", "rampmap", "warp",
  "stamp", "tile", "pattern", "panel", "tilemap", "scatter", "grid", "runs", "wire", "text", "lamp", "bump", "normals", "pose", "plane", "terrain", "solids", "shadows", "mesh", "capsule", "flame", "scroll", "clouds", "plume",
] as const;
export type OpName = (typeof OPS)[number];

// Wrap ops so only the outermost call reports to onOp (ring -> ellipse, text -> plot, ...).
for (const name of OPS) {
  const proto = Canvas.prototype as unknown as Record<string, (...a: unknown[]) => unknown>;
  const fn = proto[name];
  proto[name] = function (this: Canvas, ...args: unknown[]) {
    this._depth++;
    let ok = false;
    try {
      const r = fn.apply(this, args);
      ok = true;
      return r;
    } finally {
      this._depth--;
      if (ok && this._depth === 0 && this.onOp) this.onOp(name, args);
    }
  };
}

const CORNER_NAMES = ["top-left", "top-right", "bottom-left", "bottom-right"];

/** Perceived brightness of a color, 0..255. */
function luma(c: Color): number {
  return 0.2126 * ((c >>> 24) & 255) + 0.7152 * ((c >>> 16) & 255) + 0.0722 * ((c >>> 8) & 255);
}

/** Is a color's hue within [from, to] degrees (wrapping past 360)? Grays have no hue. */
function inHue(c: Color, [from, to]: [number, number]): boolean {
  const r = ((c >>> 24) & 255) / 255, g = ((c >>> 16) & 255) / 255, b = ((c >>> 8) & 255) / 255;
  const mx = Math.max(r, g, b), d = mx - Math.min(r, g, b);
  if (d < 0.04) return false;
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  const a = ((from % 360) + 360) % 360, z = ((to % 360) + 360) % 360;
  return a <= z ? h >= a && h <= z : h >= a || h <= z;
}

/**
 * A map of tile corners -> the plain tile map and char map for the same tilemap: each tile's mask
 * (1 top-left + 2 top-right + 4 bottom-left + 8 bottom-right) as one hex char, "." where no tile.
 * A prefix map names <prefix><mask>; a mask with no such asset is an error, except 0 (left empty).
 */
function cornerTiles(str: string, opts: TilemapOpts, known: (name: string) => boolean): [string, TilemapOpts] {
  if (opts.iso) throw new PxError("tilemap: corners work on the square grid only, not with iso");
  const rows = gridRows(str).map((r) => [...r]);
  const set = (ch: string | undefined) => ch !== undefined && (opts.corners === true ? ch !== "." && ch !== " " : (opts.corners as string).includes(ch));
  const name = (m: number) => (typeof opts.map === "string" ? (known(opts.map + m) ? opts.map + m : undefined) : opts.map[m]);
  const map: Record<string, string> = {}, out: string[] = [];
  for (let j = 0; j + 1 < rows.length; j++) {
    let line = "";
    for (let i = 0; i + 1 < Math.max(rows[j].length, rows[j + 1].length); i++) {
      const m = (set(rows[j][i]) ? 1 : 0) | (set(rows[j][i + 1]) ? 2 : 0) | (set(rows[j + 1][i]) ? 4 : 0) | (set(rows[j + 1][i + 1]) ? 8 : 0);
      const n = name(m);
      if (!n) {
        if (m === 0) { line += "."; continue; }
        const which = CORNER_NAMES.filter((_, b) => m & (1 << b)).join(" + ");
        throw new PxError(`tilemap: no tile for corner mask ${m} (${which} set) at tile row ${j}, col ${i}; map has: ${typeof opts.map === "string" ? opts.map + "<mask>" : Object.keys(opts.map).join(" ")}`);
      }
      map[m.toString(16)] = n;
      line += m.toString(16);
    }
    out.push(line);
  }
  return [out.join("\n"), { ...opts, corners: undefined, map }];
}

/** Does any pixel of the area pass the mask? */
function anyIn(ok: (x: number, y: number) => boolean, x: number, y: number, w: number, h: number): boolean {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (ok(xx, yy)) return true;
  return false;
}

// The key between two colors: in a ramp that holds both (a part's own shade toward its outline: the
// ink ends every ramp), the key halfway between them, or none when they're next to each other there;
// in no ramp, the palette's color nearest their middle (in OKLab), on the line from one to the other,
// a fifth to four fifths of the way and close to it (closer than study asks of a hand-picked one), of
// the colors the file chose; null when none is.
const BETWEEN = new WeakMap<Palette, { list: Color[]; memo: Map<string, Color | null> }>();
export function betweenKey(pal: Palette, a: Color, b: Color): Color | null {
  let entry = BETWEEN.get(pal);
  if (!entry) BETWEEN.set(pal, (entry = { list: pal.chosen(), memo: new Map() }));
  const { list, memo } = entry;
  const key = a < b ? `${a},${b}` : `${b},${a}`;
  if (memo.has(key)) return memo.get(key)!;
  for (const r of pal.ramps) {
    const cs = [...r].map((k) => pal.keys.get(k)), ia = cs.indexOf(a), ib = cs.indexOf(b);
    if (ia < 0 || ib < 0) continue;
    const lo = Math.min(ia, ib), hi = Math.max(ia, ib), mid = hi - lo > 1 ? cs[Math.floor((lo + hi) / 2)]! : null;
    memo.set(key, mid);
    return mid;
  }
  const A = oklab(a), B = oklab(b), ab = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], n2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2;
  let best: Color | null = null, near = Infinity;
  if (n2 >= 0.15 ** 2) for (const c of list) {
    if (c === a || c === b || (c & 255) < 128) continue;
    const P = oklab(c), t = ((P[0] - A[0]) * ab[0] + (P[1] - A[1]) * ab[1] + (P[2] - A[2]) * ab[2]) / n2;
    const off = Math.hypot(P[0] - A[0] - t * ab[0], P[1] - A[1] - t * ab[1], P[2] - A[2] - t * ab[2]);
    const mid = Math.hypot(P[0] - (A[0] + B[0]) / 2, P[1] - (A[1] + B[1]) / 2, P[2] - (A[2] + B[2]) / 2);
    if (t > 0.2 && t < 0.8 && off < Math.min(0.15 * Math.sqrt(n2), 0.08) && mid < near) { near = mid; best = c; }
  }
  memo.set(key, best);
  return best;
}
