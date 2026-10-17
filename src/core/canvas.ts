import { type Color, TRANSPARENT } from "./color.ts";
import { Img } from "./image.ts";
import type { Palette, Resolved } from "./palette.ts";
import { PxError } from "./errors.ts";
import { glyph, lineWidth } from "./font.ts";
import type { BumpOpts, LampOpts, PlaceOpts, PoseOpts, ScatterOpts, TextOpts, TileLayer, Timeline, TilemapOpts, WireOpts } from "./model.ts";
import { bump, dirOf, setNormal } from "./normals.ts";
import { POSE_BONES } from "./pose.ts";
import { bayer, colorList, gridRows, hash, inPoly, polyBounds, type Region, regionPred, rng } from "./util.ts";

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
  /** Glyph lookup of a font() (rows of "#" / "."), for text(). */
  glyphs(font: string): (ch: string) => string[];
}

type Pred = (x: number, y: number) => boolean;

/**
 * Drawing surface over an image. Coordinates are relative to (ox, oy); colors are palette
 * keys, "#hex", "." (skip) or "_" (erase). All writes go through plot(), which honours clip().
 */
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
  /** Called after each top-level (non-nested) op call; used for tracing. */
  onOp?: (name: string, args: unknown[]) => void;
  /** Art-file location of the op item currently running (set by the builder). */
  loc?: string;
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
    if (this.wrap?.x) ix = ((ix % w) + w) % w;
    if (this.wrap?.y) iy = ((iy % h) + h) % h;
    return ix >= 0 && iy >= 0 && ix < w && iy < h ? iy * w + ix : -1;
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

  private colorTest(on: string): (c: Color) => boolean {
    if (on === "*") return (c) => c !== TRANSPARENT;
    const set = new Set<Color>();
    for (const k of colorList(on)) {
      const c = this.color(k);
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
    const path: [number, number][] = [];
    const add = (x: number, y: number) => {
      const p: [number, number] = [Math.round(x), Math.round(y)], q = path[path.length - 1];
      if (q && q[0] === p[0] && q[1] === p[1]) return;
      path.push(p);
      // Pixel-perfect: drop the corner of an L (the middle of three pixels whose ends touch diagonally).
      while (path.length >= 3) {
        const [a, b, d] = path.slice(-3);
        if (Math.abs(a[0] - d[0]) === 1 && Math.abs(a[1] - d[1]) === 1 && (b[0] === a[0] || b[1] === a[1]) && (b[0] === d[0] || b[1] === d[1])) path.splice(-2, 1);
        else break;
      }
    };
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
    for (let y = -ry; y <= ry; y++)
      for (let x = -rx; x <= rx; x++)
        if (inside(x, y) && (!ring || !(inside(x - 1, y) && inside(x + 1, y) && inside(x, y - 1) && inside(x, y + 1))))
          this.plot(cx + x, cy + y, col);
  }

  circ(cx: number, cy: number, r: number, c: string): void { this.ellipse(cx, cy, r, r, c); }
  ring(cx: number, cy: number, r: number, c: string): void { this.ellipse(cx, cy, r, r, c, true); }

  /** Filled polygon [x0,y0, x1,y1, ...] with vertices on pixel corners. */
  poly(pts: number[], c: string): void {
    if (!Array.isArray(pts) || pts.length < 6 || pts.length % 2) throw new PxError("poly needs [x0,y0, x1,y1, x2,y2, ...]");
    const col = this.color(c), inside = inPoly(pts), b = polyBounds(pts);
    for (let y = Math.floor(b.y0); y < Math.ceil(b.y1); y++)
      for (let x = Math.floor(b.x0); x < Math.ceil(b.x1); x++) if (inside(x, y)) this.plot(x, y, col);
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
    this.remap(this.pal.stepMap(-1), where, steps, density);
  }

  /** Step colors lighter along the palette ramps inside a region. */
  light(where?: Region, steps = 1, density = 1): void {
    this.remap(this.pal.stepMap(1), where, steps, density);
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
    const pick = list[Math.floor(r() * list.length)];
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
    return src;
  }

  /** Draw an image at canvas coords; with a predicate, only onto pixels it accepts. Lamps come along. */
  put(src: Img, x: number, y: number, ok?: Pred): void {
    if (src.lamps?.length) {
      const dx = this.ox + Math.floor(x), dy = this.oy + Math.floor(y);
      (this.img.lamps ??= []).push(...src.lamps.map((l) => ({ ...l, x: l.x + dx, y: l.y + dy })));
    }
    if (!ok && !this.clipPred && !this.wrap) {
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

  /** An asset's size as it would be placed (a group's first member): for layouts in drawing code. */
  size(name: string): { w: number; h: number } {
    const img = this.res.image(this.res.candidates(name)[0], 0, 0, false);
    return { w: img.w, h: img.h };
  }

  /** Draw `src` with its pivot (default: `def`, as a fraction of its size) on (x, y). */
  private putAt(src: Img, x: number, y: number, def: [number, number], ok?: Pred): void {
    const [px, py] = src.pivot ?? [src.w * def[0], src.h * def[1]];
    this.put(src, x - Math.floor(px), y - Math.floor(py), ok);
  }

  stamp(name: string, x = 0, y = 0, opts?: PlaceOpts): void {
    this.putAt(this.asset(name, opts, x, y), x, y, [0, 0]);
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
    const rows = gridRows(str);
    const x0 = opts.x ?? 0, y0 = opts.y ?? 0;
    if (opts.iso && !(opts.w && opts.h)) throw new PxError("tilemap { iso: true } needs the floor diamond's size: { w: 32, h: 16 }");
    const cells: { r: number; i: number; name: string }[] = [];
    rows.forEach((row, r) => {
      [...row].forEach((ch, i) => {
        if (ch === "." || ch === " ") return;
        const name = opts.map[ch];
        if (!name) throw new PxError(`tilemap: no tile for '${ch}' (row ${r}, col ${i}); map has: ${Object.keys(opts.map).join(" ")}`);
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
    const ok = this.maskAt(opts.on, opts.below);
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
            this.putAt(this.asset(name, opts, cx, cy), cx, cy, [0.5, 0.5], opts.clip ? ok : undefined);
            placed++;
            break;
          }
      tries = count * 30;
    }
    while (placed < count && tries < count * 30) {
      tries++;
      const cx = x + Math.floor(r() * w), cy = y + Math.floor(r() * h);
      if (!ok(cx, cy)) continue;
      const src = this.asset(name, opts, cx, cy);
      this.putAt(src, cx, cy, [0.5, 0.5], opts.clip ? ok : undefined);
      placed++;
    }
    // A brush that silently paints nothing is the usual sign of an empty layer under `on`.
    if (opts.on !== undefined && count > 0 && placed === 0)
      throw new PxError(`scatter: 'on: ${opts.on}' matched nothing in [${x}, ${y}, ${w}, ${h}] (0 of ${count} placed)` +
        (opts.below ? "" : "; a layer starts empty: add below: true to read the layers under it"));
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
      if (p && q) this.line(p[0], p[1], q[0], q[1], color);
    }
    if (joint) for (const n of Object.keys(joints)) { const p = at(n); if (p) this.px(p[0], p[1], joint); }
  }

  /** Hanging cable sagging `sag` px; `hang` stamps an asset/group under it every `every` px. */
  wire(x0: number, y0: number, x1: number, y1: number, sag: number, c: string, opts: WireOpts = {}): void {
    const at = (t: number): [number, number] => [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t + sag * 4 * t * (1 - t)];
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) + Math.abs(sag) * 2 + 1;
    let px = x0, py = y0;
    for (let i = 1; i <= n; i++) {
      const [fx, fy] = at(i / n);
      const qx = Math.round(fx), qy = Math.round(fy);
      this.line(px, py, qx, qy, c);
      px = qx; py = qy;
    }
    if (!opts.hang || x1 === x0) return;
    const every = opts.every ?? 6, span = Math.abs(x1 - x0), dir = Math.sign(x1 - x0);
    for (let d = opts.start ?? Math.floor(every / 2); d < span; d += every) {
      const [, fy] = at(d / span);
      const hx = x0 + dir * d, hy = Math.round(fy);
      const src = this.asset(opts.hang, opts, hx, hy);
      this.putAt(src, hx, hy + 1, [0.5, 0]);
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
    s = String(s);
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
  "px", "rect", "box", "line", "curve", "hline", "vline", "ellipse", "circ", "ring", "poly", "fill",
  "dither", "grad", "noise", "recolor", "shade", "light",
  "stamp", "tile", "pattern", "panel", "tilemap", "scatter", "grid", "runs", "wire", "text", "lamp", "bump", "normals", "pose",
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

/** Does any pixel of the area pass the mask? */
function anyIn(ok: (x: number, y: number) => boolean, x: number, y: number, w: number, h: number): boolean {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (ok(xx, yy)) return true;
  return false;
}
