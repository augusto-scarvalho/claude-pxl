// Turns an asset definition into an image: base -> items (ops, grids, functions, layers)
// -> post-processing (mirror, swap, flip, rot, outline, crop). Optionally traced.
import { Canvas, type Placed, type Placement, type Resolver, betweenKey } from "./canvas.ts";
import { type Color, TRANSPARENT, oklab, pack } from "./color.ts";
import { PxError, wrap } from "./errors.ts";
import { Img } from "./image.ts";
import { applyGlow } from "./glow.ts";
import { applyLighting } from "./light.ts";
import { rotate } from "./rotate.ts";
import { normalImage } from "./normals.ts";
import { type AssetDef, type FrameOpts, type GlowOpts, type Item, type Layer, type LayerOpts, type LightingOpts, type Op, type RelightOpts, type TileLayer, type Timeline, isLayer, isOp } from "./model.ts";
import type { Palette } from "./palette.ts";
import { Trace } from "./trace.ts";
import { bayer, fmtArgs, gridRows, gridSize, type Region } from "./util.ts";

export interface BuildCtx extends Resolver {
  /** Art-file location from an error stack, if any frame points into an art file. */
  locFromStack(stack: string): string | undefined;
  /** Art-file location of the current call site. */
  callerLoc(): string | undefined;
  /** Builds for checking only: the whole-image passes (lighting, glow) are skipped; no check reads them. */
  readonly checksOnly?: boolean;
}

export interface LayerOut {
  name: string;
  img: Img;
  /** How it reached the art: drawn as it is (unset), not at all, or blended (shade, light, blend, opacity, density). */
  how?: "hidden" | "blended";
  /** Its pixels ignore lighting (the layer's `unlit`): sparks, glows, skies; describe doesn't judge their lit side. */
  unlit?: boolean;
  /** A blended layer's mode in words ("opacity 0.45", "shade 2"), for describe. */
  mode?: string;
}

export interface BuildOut {
  img: Img;
  layers: LayerOut[];
  trace?: Trace;
  /** Set when the asset is animated (an anim, or places one). */
  anim?: Timeline;
  /** The tilemaps it placed, cell by cell (for a Tiled export). */
  tilemaps?: TileLayer[];
  /** Reference layers composited over the art, for previews only (the art itself leaves them out). */
  guide?: Img;
  /** The reference layers themselves (strength k), in drawing coordinates. */
  refs?: { name: string; img: Img; k: number }[];
  /** What the layers were drawn over: the canvas as it was when the first layer began. */
  under?: Img;
  /** Everything stamped, scattered or hung, in drawing order. */
  placements: Placement[];
  /** Built with the loop of what it places as its clock (its functions saw the real frame). */
  clocked?: boolean;
}

/** An anim's frames: count and durations (ms), from its frame() items or { frames, fps }. */
export function animTimeline(def: AssetDef): Timeline {
  const fps = def.opts.fps ?? 8;
  if (!(fps > 0)) throw new PxError(`fps must be > 0, got ${fps}`);
  const unit = 1000 / fps;
  // frame() items may sit at the top level or inside layers; frame k of every list plays together.
  let lists: Op[][] = [];
  const walk = (items: Item[]) => {
    lists.push(items.filter((v): v is Op => isOp(v) && v.name === "frame"));
    for (const v of items) if (isLayer(v)) walk(v.items);
  };
  walk(def.items);
  lists = lists.filter((l) => l.length);
  const n = lists.length ? Math.max(...lists.map((l) => l.length)) : Math.max(1, Math.floor(def.opts.frames ?? 1));
  const durations: number[] = [];
  for (let i = 0; i < n; i++) {
    // The first list that has frame i sets its duration.
    const f = lists.find((l) => l[i])?.[i];
    const fo = (f && isFrameOpts(f.args[0]) ? f.args[0] : {}) as FrameOpts;
    const ms = fo.ms ?? unit * (fo.hold ?? 1);
    if (!(ms > 0)) throw new PxError(`frame ${i} duration must be > 0`, f?.loc);
    durations.push(Math.round(ms));
  }
  // reverse / pingpong play the drawn frames in another order: 0 1 2 3 2 1, 0 1 2 3 2 1, ...
  const dir = def.opts.dir ?? "forward";
  if (dir !== "forward" && dir !== "reverse" && dir !== "pingpong") throw new PxError(`dir must be "forward", "reverse" or "pingpong", got ${fmtArgs([dir])}`);
  const order = dir === "reverse" ? durations.map((_, i) => n - 1 - i)
    : dir === "pingpong" && n > 2 ? [...durations.keys(), ...durations.slice(1, -1).map((_, i) => n - 2 - i)] : undefined;
  const play = order ? order.map((k) => durations[k]) : durations;
  const loop = play.reduce((a, d) => a + d, 0);
  return { loop, step: play.reduce(gcd), durations: play, once: def.opts.loop === false, ...(order ? { order } : {}), ...(dir !== "forward" ? { dir } : {}) };
}

/** How many frames an anim draws (pingpong plays some of them twice). */
export function drawnFrames(tl: Timeline): number {
  return tl.order ? Math.max(...tl.order) + 1 : tl.durations!.length;
}

/** Index of the frame showing at time t. */
export function frameAt(tl: Timeline, t: number): number {
  const d = tl.durations!;
  let tt = tl.once ? Math.min(Math.max(0, t), tl.loop - 1) : ((t % tl.loop) + tl.loop) % tl.loop;
  for (let i = 0; i < d.length; i++) {
    if (tt < d[i]) return i;
    tt -= d[i];
  }
  return d.length - 1;
}

export function gcd(a: number, b: number): number {
  a = Math.round(a); b = Math.round(b);
  while (b) [a, b] = [b, a % b];
  return a;
}

function isFrameOpts(v: unknown): boolean {
  return typeof v === "object" && v !== null && !Array.isArray(v) && !isOp(v) && !isLayer(v);
}

/**
 * `clock`: the loop of a sprite or scene that is animated by what it places, so its functions get
 * c.frame / c.frames / c.phase over it (an anim has its own frames).
 */
export function buildAsset(ctx: BuildCtx, def: AssetDef, seed: number, trace?: Trace, t = 0, clock?: Timeline): BuildOut {
  const { opts, pal } = def;
  const tl = def.kind === "anim" ? animTimeline(def) : undefined;
  const at = tl ? frameAt(tl, t) : 0;
  const frame = tl?.order ? tl.order[at] : at, frames = tl ? drawnFrames(tl) : 1;
  const tick = !tl && clock ? { frame: Math.round(t / clock.step), frames: Math.max(1, Math.round(clock.loop / clock.step)) } : undefined;
  let base: Img;
  if (def.kind === "scene") {
    if (!opts.w || !opts.h) throw new PxError("scene needs { w, h }");
    base = new Img(opts.w, opts.h);
    if (opts.bg) {
      const bg = pal.resolve(opts.bg);
      if (bg !== null) base.fill(bg);
    }
  } else if (opts.base) {
    base = def.mirror ? ctx.image(opts.base, seed, t).flip("x") : ctx.image(opts.base, seed, t).copy();
  } else if (def.png) {
    // A strip anim ({ frames: n }) shows the n-th equal slice; anything else the whole image.
    const n = def.kind === "anim" && opts.frames ? frames : 1, fw = Math.floor(def.png.w / n);
    if (fw < 1) throw new PxError(`png is ${def.png.w}px wide: too narrow for ${n} frames`);
    base = n > 1 ? def.png.sub(frame * fw, 0, fw, def.png.h) : def.png.copy();
    if (def.mirror) base = base.flip("x");
    if (opts.palettize) base = base.remap(pal.snapMap(base.data));
  } else {
    let { w, h } = opts;
    if (!w || !h) {
      const s = inferSize(def.items);
      if (opts.mx) s.w = opts.mx === "c" ? 2 * s.w - 1 : 2 * s.w;
      if (opts.my) s.h = opts.my === "c" ? 2 * s.h - 1 : 2 * s.h;
      w ??= s.w;
      h ??= s.h;
    }
    if (!(w >= 1 && h >= 1)) throw new PxError("no size: give { w, h } or a grid string");
    base = new Img(w, h);
  }

  // Current layer being painted, so traced frames show the composite in progress.
  let cur: { img: Img; opts: LayerOpts } | undefined;
  const snap = trace
    ? (label: string, loc?: string) => {
        if (!cur) return trace.record(label, loc, base);
        const o = base.copy();
        blend(o, cur.img, cur.opts, pal);
        trace.record(label, loc, o);
      }
    : undefined;
  if (snap && def.kind === "scene") snap("background", def.loc);

  const hook = (c: Canvas, tag = "") => {
    if (!snap) return;
    c.onOp = (name, args) => snap(`${name}(${fmtArgs(args)})${tag}`, c.loc ?? ctx.callerLoc());
  };

  const layers: LayerOut[] = [];
  const refs: { name: string; img: Img; k: number }[] = [];
  let under: Img | undefined;
  // Pixels of solid / wall layers, for lighting().
  let solid: Uint8Array | undefined, wall: Uint8Array | undefined, unlit: Uint8Array | undefined;
  // Pixels of `outline: false` layers still showing: the asset's outline isn't drawn around them.
  let loose: Uint8Array | undefined;
  if (![undefined, true, false, "x", "y"].includes(opts.wrap)) throw new PxError(`wrap must be true, "x" or "y", got ${fmtArgs([opts.wrap])}`);
  const edges = opts.wrap ? { x: opts.wrap !== "y", y: opts.wrap !== "x" } : undefined;
  const maps: TileLayer[] = [];
  const placed: Placed = new Map(), log: Placement[] = [];
  const timed = (c: Canvas) => {
    c.maps = maps;
    c.placed = placed;
    c.log = log;
    c.wrap = edges;
    c.t = t;
    c.frame = tick?.frame ?? frame;
    c.frames = tick?.frames ?? frames;
    c.inAnim = !!tl;
    c.mirrored = !!def.mirror;
    c.owner = { name: def.name, loc: def.loc };
    return c;
  };
  const main = timed(new Canvas(base, pal, ctx, 0, 0, seed));
  hook(main);
  // After lighting(), pixels it changed still count as their palette color for glow().
  let preLight: { before: Uint32Array; after: Uint32Array } | undefined;
  const keyed = () => {
    if (!preLight) return base.data;
    const k = base.data.slice();
    for (let i = 0; i < k.length; i++) if (k[i] === preLight.after[i]) k[i] = preLight.before[i];
    return k;
  };
  const onPass: OnPass = (name, args, loc) => {
    // the checks read what was placed and how, not the lit pixels: 2/3 of a lit city frame's time
    if (ctx.checksOnly) return;
    if (name === "glow") {
      base.data.set(applyGlow(base, args[0] as string | string[], (args[1] ?? {}) as GlowOpts, pal, keyed()).data);
      snap?.("glow", loc);
      return;
    }
    const lo = (args[0] ?? {}) as LightingOpts;
    const none = () => new Uint8Array(base.data.length);
    const lit = applyLighting(base, { solid: solid ?? none(), wall: wall ?? none(), unlit }, base.lamps ?? [], lo, pal);
    if (base.norm) trace?.record("normal map", loc, normalImage(base));
    trace?.record("light map", loc, lit.map);
    const before = preLight ? keyed() : base.data.slice();
    base.data.set(lit.img.data);
    preLight = { before, after: base.data.slice() };
    base.lamps = undefined; // consumed: stamping this lit asset elsewhere doesn't light twice
    snap?.("lighting", loc);
  };
  runItems(ctx, def.items, main, def.loc, onPass, (l) => {
    under ??= base.copy();
    const limg = new Img(base.w, base.h);
    const lc = timed(new Canvas(limg, pal, ctx, l.opts.x ?? 0, l.opts.y ?? 0, seed));
    lc.layerName = l.name;
    lc.below = base;
    if (l.opts.sort !== undefined) {
      if (l.opts.sort !== "y" && l.opts.sort !== "z") throw new PxError(`layer '${l.name}': sort must be "y" or "z", got ${fmtArgs([l.opts.sort])}`, l.loc);
      lc.sorted = { by: l.opts.sort, queue: [] };
    }
    // what is drawn in a shade or light layer steps what's under it: the painting log says so
    const steps = l.opts.shade !== undefined && l.opts.shade !== false ? "shade" : l.opts.light !== undefined && l.opts.light !== false ? "light" : "";
    hook(lc, steps ? ` in ${steps} layer '${l.name}'` : "");
    cur = { img: limg, opts: l.opts };
    try {
      runItems(ctx, l.items, lc, l.loc);
      lc.flush();
    } catch (e) {
      throw wrap(e, (st) => ctx.locFromStack(st)).within(`layer '${l.name}'`, l.loc);
    } finally {
      cur = undefined;
    }
    if (l.opts.ref) {
      const k = l.opts.ref === true ? 1 : l.opts.ref;
      if (!(typeof k === "number" && k > 0 && k <= 1)) throw new PxError(`layer '${l.name}': ref must be true or a strength from 0 to 1, got ${fmtArgs([l.opts.ref])}`, l.loc);
      refs.push({ name: l.name, img: limg, k });
      snap?.(`reference layer '${l.name}' (previews only)`, l.loc);
      return;
    }
    if (!l.opts.hidden) {
      blend(base, limg, l.opts, pal, (msg) => ctx.warn?.(msg, l.loc));
      if (l.opts.solid || l.opts.wall) {
        const m = l.opts.solid ? (solid ??= new Uint8Array(base.data.length)) : (wall ??= new Uint8Array(base.data.length));
        for (let i = 0; i < m.length; i++) if (limg.data[i] !== TRANSPARENT) m[i] = 1;
      }
      // Track which visible pixels came from unlit layers (later layers cover them again).
      if (l.opts.unlit || unlit) {
        unlit ??= new Uint8Array(base.data.length);
        const v = l.opts.unlit ? 1 : 0;
        for (let i = 0; i < unlit.length; i++) if (limg.data[i] !== TRANSPARENT) unlit[i] = v;
      }
      if (l.opts.outline !== undefined && l.opts.outline !== false)
        throw new PxError(`layer '${l.name}': outline can only be false (its pixels left out of the asset's outline), got ${fmtArgs([l.opts.outline])}`, l.loc);
      if (l.opts.outline === false || loose) {
        loose ??= new Uint8Array(base.data.length);
        const v = l.opts.outline === false ? 1 : 0;
        for (let i = 0; i < loose.length; i++) if (limg.data[i] !== TRANSPARENT) loose[i] = v;
      }
    }
    // drawn as it is: what blend() blits (an Aseprite export keeps it as its own layer)
    const o = l.opts, mode = o.shade ?? o.light;
    const plain = o.blend === undefined && o.opacity === undefined && (o.density ?? 1) >= 1 && (mode === undefined || mode === false);
    const words = [o.blend !== undefined && `blend ${o.blend}`, o.opacity !== undefined && `opacity ${o.opacity}`,
      o.shade !== undefined && o.shade !== false && (typeof o.shade === "number" ? `shade ${o.shade}` : "shade"),
      o.light !== undefined && o.light !== false && (typeof o.light === "number" ? `light ${o.light}` : "light"),
      o.density !== undefined && o.density < 1 && `density ${o.density}`].filter(Boolean).join(", ");
    layers.push({ name: l.name, img: limg, ...(o.hidden ? { how: "hidden" as const } : plain ? {} : { how: "blended" as const, mode: words }), ...(o.unlit ? { unlit: true } : {}) });
    snap?.(`layer '${l.name}'${l.opts.hidden ? " (hidden)" : ""}`, l.loc);
  });

  if (opts.register !== undefined) {
    register(base, refs.map((r) => r.img), opts.register, pal, frame);
    snap?.(`register on '${typeof opts.register === "string" ? opts.register : opts.register.key}'`, def.loc);
  }
  const img = finish(base, def, pal, trace, loose);
  trace?.finish(img);
  const guide = refs.length ? guideOver(img, refs, def) : undefined;
  return { img, layers, trace, anim: tl, placements: log, ...(tick ? { clocked: true } : {}), ...(maps.length ? { tilemaps: maps } : {}), ...(guide ? { guide, refs } : {}), ...(under ? { under } : {}) };
}

/**
 * The art with its reference layers over it: full color where the art is empty, and over drawn
 * pixels at the layer's strength (`ref: true` = 1, `ref: 0.5` = half, to see the art through).
 * Reference layers are in drawing coordinates: an outline's 1px growth is followed, other
 * transforms of the art would move it away from them.
 */
function guideOver(img: Img, refs: { img: Img; k: number }[], def: AssetDef): Img {
  const o = def.opts;
  const moved = ["mx", "my", "flip", "rot", "angle", "crop"].filter((k) => o[k as keyof typeof o]);
  if (moved.length) throw new PxError(`reference layers stay in drawing coordinates; ${moved.join(", ")} would move the art away from them`, def.loc);
  const d = o.outline || o.outline8 ? 1 : 0, out = img.copy();
  for (const { img: r, k } of refs)
    for (let y = 0; y < r.h; y++)
      for (let x = 0; x < r.w; x++) {
        const c = r.data[y * r.w + x];
        if (c === TRANSPARENT) continue;
        const i = (y + d) * out.w + x + d, under = out.data[i];
        out.data[i] = under === TRANSPARENT || k >= 1 ? c
          : pack(...([24, 16, 8].map((sh) => Math.round(((c >>> sh) & 255) * k + ((under >>> sh) & 255) * (1 - k))) as [number, number, number]));
      }
  return out;
}

/**
 * Register a frame by a marked point (the pelvis): move the whole drawing sideways so the marker's
 * pixel lands on x (default the middle), never by the bounding box (an arm reaching out moves that),
 * and leave y alone (the bob stays). The marker is a key used for nothing else, best drawn in a
 * `ref: true` layer; drawn in the art itself, it is erased once found.
 */
function register(base: Img, refs: Img[], spec: string | { key: string; x?: number }, pal: Palette, frame: number): void {
  const { key, x } = typeof spec === "string" ? { key: spec, x: undefined } : spec;
  if (typeof key !== "string" || (x !== undefined && !Number.isFinite(x)))
    throw new PxError(`register: "key" of the marker (e.g. register: "m"), or { key, x }, got ${fmtArgs([spec])}`);
  const c = pal.resolve(key);
  if (c === null || c === TRANSPARENT) throw new PxError(`register: '${key}' must be a visible palette key`);
  const find = (img: Img) => { const xs: number[] = []; img.data.forEach((v, i) => { if (v === c) xs.push(i % img.w); }); return xs; };
  let xs: number[] = [];
  for (const r of refs) if (!xs.length) xs = find(r);
  const inArt = !xs.length;
  if (inArt) xs = find(base);
  if (!xs.length) throw new PxError(`register: frame ${frame} has no '${key}' marker`);
  if (inArt) for (let i = 0; i < base.data.length; i++) if (base.data[i] === c) base.data[i] = TRANSPARENT;
  const dx = Math.round((x ?? Math.floor(base.w / 2)) - xs.reduce((a, b) => a + b, 0) / xs.length);
  if (!dx) return;
  for (const img of [base, ...refs]) {
    const moved = new Img(img.w, img.h);
    moved.blit(img, dx, 0);
    img.data.set(moved.data);
    if (moved.norm) img.norm = moved.norm;
  }
  if (base.lamps) for (const l of base.lamps) l.x += dx;
}

/** Whole-image passes (lighting, glow) that run on everything drawn before them. */
type OnPass = (name: "lighting" | "glow", args: unknown[], loc?: string) => void;

/** Run body items in order on a canvas. Layers go to `onLayer` (not allowed inside layers). */
function runItems(
  ctx: BuildCtx, items: Item[], c: Canvas, ownerLoc: string | undefined,
  onPass?: OnPass, onLayer?: (l: Layer) => void, inFrame = false,
): void {
  let frameNo = 0;
  items.forEach((item, i) => {
    if (inFrame && isOp(item) && item.name === "frame") throw new PxError("frame() can't be nested in another frame()", item.loc);
    if (typeof item === "string") {
      c.loc = ownerLoc;
      try { c.grid(0, 0, item); } catch (e) { throw wrap(e).within(`grid #${i + 1}`, ownerLoc); }
    } else if (isOp(item)) {
      c.loc = item.loc;
      try {
        if (item.name === "frame") {
          if (!c.inAnim) throw new PxError("frame() only goes inside an anim (directly or in its layers)");
          if (frameNo++ === c.frame) {
            const inner = (isFrameOpts(item.args[0]) ? item.args.slice(1) : item.args) as Item[];
            runItems(ctx, inner, c, item.loc, undefined, undefined, true);
          }
        } else if (item.name === "clip") {
          const [region, ...inner] = item.args as [Region, ...Item[]];
          c.clip(region, () => runItems(ctx, inner, c, item.loc));
        } else if (item.name === "plate") {
          const o = (isFrameOpts(item.args[0]) ? item.args[0] : {}) as RelightOpts;
          const inner = (isFrameOpts(item.args[0]) ? item.args.slice(1) : item.args) as Item[];
          c.plate(() => runItems(ctx, inner, c, item.loc, undefined, undefined, inFrame), o);
        } else if (item.name === "lighting" || item.name === "glow") {
          if (!onPass) throw new PxError(`${item.name}() goes directly in a sprite or scene, after what it affects, not inside a layer or clip`);
          onPass(item.name, item.args, item.loc);
        } else {
          (c as unknown as Record<string, (...a: unknown[]) => void>)[item.name](...item.args);
        }
      } catch (e) {
        throw wrap(e, (st) => ctx.locFromStack(st)).within(item.name, item.loc);
      }
    } else if (typeof item === "function") {
      c.loc = undefined;
      try { item(c); } catch (e) { throw wrap(e, (st) => ctx.locFromStack(st)).within("function", ownerLoc); }
    } else if (isLayer(item)) {
      if (!onLayer) throw new PxError(`layer '${item.name}' can't be nested inside another layer`, item.loc);
      onLayer(item);
    } else {
      throw new PxError(`item #${i + 1} is ${describe(item)}; expected a grid string, an op, a function or a layer`, ownerLoc);
    }
  });
}

function describe(v: unknown): string {
  if (Array.isArray(v)) return "an array (spread it, or pass items directly)";
  return v === null ? "null" : `a ${typeof v}`;
}

/** Size from grid strings, including those inside layers (offset by the layer position). */
function inferSize(items: Item[]): { w: number; h: number } {
  let w = 0, h = 0;
  const walk = (list: Item[], ox: number, oy: number) => {
    for (const v of list) {
      if (typeof v === "string") {
        const s = gridSize(gridRows(v));
        w = Math.max(w, s.w + ox);
        h = Math.max(h, s.h + oy);
      } else if (isLayer(v)) walk(v.items, ox + (v.opts.x ?? 0), oy + (v.opts.y ?? 0));
      else if (isOp(v) && v.name === "frame") walk((isFrameOpts(v.args[0]) ? v.args.slice(1) : v.args) as Item[], ox, oy);
    }
  };
  walk(items, 0, 0);
  return { w, h };
}

/** facing -> the front's direction in picture space (x right, y down, z into the picture). */
const FACING: Record<string, [number, number, number]> = { right: [1, 0, 0], left: [-1, 0, 0], front: [0, 0, -1], back: [0, 0, 1] };

function finish(img: Img, def: AssetDef, pal: Palette, trace?: Trace, loose?: Uint8Array): Img {
  const o = def.opts;
  // `outline: false` layers: their pixels, as a mask moved along with the art until the line is drawn
  let mask: Img | undefined;
  if (loose?.some((v) => v) && (o.outline || o.outline8 || o.inline)) {
    mask = new Img(img.w, img.h);
    for (let i = 0; i < loose.length; i++) if (loose[i]) mask.data[i] = 0xffffffff;
  }
  const step = (label: string, f: () => Img | void, m?: (k: Img) => Img) => {
    const r = f();
    if (r) img = r;
    if (mask && m) mask = m(mask);
    trace?.record(label, def.loc, img);
  };
  const skip = () => mask && Uint8Array.from(mask.data, (c) => (c === TRANSPARENT ? 0 : 1));
  // [x, y] is in drawing coords and moves with flip/rot/outline/crop; keywords use the final size.
  const pv = o.pivot;
  if (pv !== undefined && !(pv === "bottom" || pv === "center" || (Array.isArray(pv) && pv.length === 2 && pv.every(Number.isFinite))))
    throw new PxError(`pivot must be "bottom", "center" or [x, y], got ${fmtArgs([pv])}`);
  // a twin: drawn mirrored, its pivot and sockets mirrored with it (drawing coords: x -> w - x)
  const mx = (p: number[]): [number, number] => [def.mirror ? img.w - p[0] : p[0], p[1]];
  if (Array.isArray(pv)) img.pivot = mx(pv);
  if (o.sockets !== undefined) {
    const so = o.sockets as unknown;
    if (typeof so !== "object" || so === null || Array.isArray(so) || !Object.values(so).every((p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite)))
      throw new PxError(`sockets must be { name: [x, y], ... } in drawing coords, got ${fmtArgs([so])}`);
    img.sockets = Object.fromEntries(Object.entries(so as Record<string, number[]>).map(([k, p]) => [k, mx(p)]));
  }
  if (o.facing !== undefined) {
    const f = FACING[(def.mirror ? { right: "left", left: "right" }[o.facing as string] : undefined) ?? (o.facing as string)];
    if (!f) throw new PxError(`facing must be "right", "left", "front" (toward us) or "back", got ${fmtArgs([o.facing])}`);
    img.orient = { f: [...f], u: [0, -1, 0], mirrored: false, text: img.orient?.text ?? false };
  }
  if (o.height !== undefined) {
    if (!(typeof o.height === "number" && o.height > 0)) throw new PxError(`height is its real height in meters (e.g. 1.8), got ${fmtArgs([o.height])}`);
    img.meters = o.height;
  }
  if (o.mx) step("mirror x", () => img.mirror("x"), (k) => { k.mirror("x"); return k; });
  if (o.my) step("mirror y", () => img.mirror("y"), (k) => { k.mirror("y"); return k; });
  if (o.swap) {
    const sw = o.swap;
    step(`swap ${fmtArgs([sw])}`, () => {
      const m = new Map<Color, Color>();
      for (const k of Object.keys(sw)) {
        const a = pal.resolve(k), b = pal.resolve(sw[k]);
        if (a !== null && b !== null) m.set(a, b);
      }
      return img.remap(m);
    });
  }
  if (o.flip) step(`flip ${o.flip}`, () => img.flip(o.flip!), (k) => k.flip(o.flip!));
  if (o.rot) step(`rot ${o.rot}`, () => img.rot(o.rot!), (k) => k.rot(o.rot!));
  // Any angle, before the outline so the line is drawn fresh around the turned shape.
  if (o.angle) step(`angle ${o.angle}${o.rotate ? ` (${o.rotate})` : ""}`, () => rotate(img, o.angle!, o.rotate), (k) => rotate(k, o.angle!, o.rotate));
  else if (o.rotate) throw new PxError("rotate picks how `angle` turns the sprite: add angle: degrees");
  if (o.aa !== undefined && typeof o.aa !== "boolean") throw new PxError(`aa is true or false, got ${fmtArgs([o.aa])}`);
  if (o.aa) step("aa", () => antialias(img, pal));
  // selout: the line takes the color it touches, `selout` steps darker along the ramps (colors
  // without a ramp keep the line color).
  const sel = o.selout ? seloutPick(pal, o.selout === true ? 2 : o.selout) : undefined;
  if (o.selout && !o.outline && !o.outline8 && !o.inline) throw new PxError("selout recolors a line: add outline, outline8 or inline");
  const as = (c: Color) => (sel ? (t: Color) => sel(t, c) : undefined);
  if (o.inline) {
    // inline: "k", or { color: "k", keep: "Kk12" } to close only the gaps of an outline already there
    const spec = typeof o.inline === "string" ? { color: o.inline } : o.inline;
    if (typeof spec !== "object" || spec === null || typeof spec.color !== "string" || Object.keys(spec).some((k) => k !== "color" && k !== "keep") || (spec.keep !== undefined && typeof spec.keep !== "string"))
      throw new PxError(`inline must be a color, or { color, keep: "keys" }, got ${fmtArgs([o.inline])}`);
    const keep = spec.keep === undefined ? undefined : new Set([...spec.keep].map((k) => {
      let c;
      try { c = pal.resolve(k); } catch (e) { throw new PxError(`inline keep: ${(e as Error).message}`); }
      if (c === null) throw new PxError(`inline keep: '${k}' is not a palette key`);
      return c;
    }));
    step(`inline ${spec.color}${keep ? ` keep ${spec.keep}` : ""}${sel ? " (selout)" : ""}`, () => { const c = solid(pal, spec.color); return img.inline(c, false, as(c), keep, skip()); });
  }
  if (o.outline) step(`outline ${o.outline}${sel ? " (selout)" : ""}`, () => { const c = solid(pal, o.outline!); return img.outline(c, false, as(c), skip()); }, (k) => k.pad(1));
  if (o.outline8) step(`outline8 ${o.outline8}${sel ? " (selout)" : ""}`, () => { const c = solid(pal, o.outline8!); return img.outline(c, true, as(c), skip()); }, (k) => k.pad(1));
  if (o.crop) step("crop", () => img.crop());
  if (pv === "bottom" || pv === "center") img.pivot = [img.w / 2, pv === "bottom" ? img.h : img.h / 2];
  if (o.slice !== undefined) {
    // 9-slice margins of the final image (outline included): corners stay, edges and center repeat.
    const s = typeof o.slice === "number" ? [o.slice, o.slice, o.slice, o.slice] : o.slice;
    if (!Array.isArray(s) || s.length !== 4 || !s.every((v) => Number.isInteger(v) && v >= 0) || s[0] + s[2] >= img.w || s[1] + s[3] >= img.h)
      throw new PxError(`slice must be n or [left, top, right, bottom] leaving a center inside the ${img.w}x${img.h} image, got ${fmtArgs([o.slice])}`);
    img.slice = [s[0], s[1], s[2], s[3]];
  }
  return img;
}

function seloutPick(pal: Palette, steps: number): (touching: Color, line: Color) => Color {
  if (!(Number.isInteger(steps) && steps >= 1)) throw new PxError(`selout must be true or a number of steps >= 1, got ${steps}`);
  if (!pal.ramps.length) throw new PxError('selout darkens along the ramps: add ramps("kDdu", ...) first');
  const dark = pal.stepMap(-1);
  return (t, line) => {
    let c = t;
    for (let i = 0; i < steps; i++) c = dark.get(c) ?? c;
    return c === t ? line : c;
  };
}

function solid(pal: Palette, spec: string): Color {
  const c = pal.resolve(spec);
  if (c === null || c === TRANSPARENT) throw new PxError(`outline color must be a visible color, got '${spec}'`);
  return c;
}

/** Mark an image as having lettering (a mirror would turn it backwards). */

/**
 * Hand-style anti-aliasing of the edges between two colors inside a sprite (Saint11, Pixel Joint): on
 * every step of a staircase 2 px long and more, a strip half the step's length, along it from the
 * corner, on the lighter color's side, in the key between the two (as `stamp`'s `sub` picks it).
 * Nothing against the clear, nothing on 1:1 diagonals or straight edges.
 */
export function antialias(img: Img, pal: Palette): Img {
  const out = img.copy(), set = new Set<number>();
  const L = (c: Color) => oklab(c)[0];
  // the same reading across rows and, turned, across columns: (u, v) along and across
  const pass = (W: number, H: number, at: (u: number, v: number) => Color, idx: (u: number, v: number) => number) => {
    const px = (u: number, v: number) => (u < 0 || v < 0 || u >= W || v >= H ? TRANSPARENT : at(u, v));
    for (let v = 0; v + 1 < H; v++) for (let u = 0; u < W; ) {
      const U = px(u, v), D = px(u, v + 1);
      if (U === D || (U & 255) < 128 || (D & 255) < 128) { u++; continue; }
      let e = u;
      while (e + 1 < W && px(e + 1, v) === U && px(e + 1, v + 1) === D) e++;
      const n = e - u + 1, k = n >> 1, M = n >= 2 ? betweenKey(pal, U, D) : null;
      if (M !== null) {
        const strip = (row: number, from: number, dir: number, want: Color) => {
          for (let j = 0; j < k; j++) { const i = idx(from + dir * j, row); if (!set.has(i) && img.data[i] === want) { set.add(i); out.data[i] = M; } }
        };
        const upLight = L(U) > L(D);
        // a step at either end: the lower color going on up, or the upper going on down
        if (px(u - 1, v) === D && upLight) strip(v, u, 1, U);
        if (px(u - 1, v + 1) === U && !upLight) strip(v + 1, u, 1, D);
        if (px(e + 1, v) === D && upLight) strip(v, e, -1, U);
        if (px(e + 1, v + 1) === U && !upLight) strip(v + 1, e, -1, D);
      }
      u = e + 1;
    }
  };
  pass(img.w, img.h, (u, v) => img.data[v * img.w + u], (u, v) => v * img.w + u);
  pass(img.h, img.w, (u, v) => img.data[u * img.w + v], (u, v) => u * img.w + v);
  return out;
}

export function lettered(img: Img): void {
  (img.orient ??= { u: [0, -1, 0], mirrored: false, text: false }).text = true;
}

/** Composite a layer onto img: draw it, or (shade/light) step what's below where it's opaque. */
export function blend(img: Img, limg: Img, l: LayerOpts, pal: Palette, warn?: (msg: string) => void): void {
  if (limg.lamps?.length) (img.lamps ??= []).push(...limg.lamps);
  if (limg.orient?.text) lettered(img);
  if (l.blend !== undefined || l.opacity !== undefined) return mix(img, limg, l, pal);
  const density = l.density ?? 1;
  const mode = l.shade ?? l.light;
  if (mode === undefined || mode === false) {
    if (density >= 1) return img.blit(limg, 0, 0);
    for (let i = 0; i < img.data.length; i++) {
      const c = limg.data[i];
      if (c === TRANSPARENT || bayer(i % img.w, Math.floor(i / img.w)) >= density) continue;
      img.data[i] = c;
      if (limg.norm) img.normals().set(limg.norm.subarray(i * 3, i * 3 + 3), i * 3);
      else if (img.norm) img.norm[i * 3 + 2] = 0;
    }
    return;
  }
  let map: Map<Color, Color>, steps = 1;
  if (typeof mode === "object") {
    map = new Map();
    for (const k of Object.keys(mode)) {
      const a = pal.resolve(k), b = pal.resolve(mode[k]);
      if (a !== null && b !== null) map.set(a, b);
    }
  } else {
    map = pal.stepMap(l.shade !== undefined && l.shade !== false ? -1 : 1);
    if (typeof mode === "number") steps = mode;
  }
  // a step through a color its ramps disagree on: say which ramp it went along (once per color)
  const clash = warn && typeof mode !== "object" ? pal.stepClashes(l.shade !== undefined && l.shade !== false ? -1 : 1) : undefined;
  for (let i = 0; i < img.data.length; i++) {
    if (limg.data[i] === TRANSPARENT) continue;
    if (density < 1 && bayer(i % img.w, Math.floor(i / img.w)) >= density) continue;
    let c = img.data[i];
    for (let s = 0; s < steps; s++) {
      const why = clash?.get(c);
      if (why) { warn!(why); clash!.delete(c); }
      c = map.get(c) ?? c;
    }
    img.data[i] = c;
  }
}

const MIXES: Record<string, (s: number, d: number) => number> = {
  normal: (s) => s,
  multiply: (s, d) => (s * d) / 255,
  screen: (s, d) => 255 - ((255 - s) * (255 - d)) / 255,
  add: (s, d) => Math.min(255, s + d),
  overlay: (s, d) => (d < 128 ? (2 * s * d) / 255 : 255 - (2 * (255 - s) * (255 - d)) / 255),
};

/**
 * Color-math layers (`blend`, `opacity`), as image editors have them. The results are new colors,
 * outside the palette, unless `palettize` snaps them back to the nearest keyed color. Over empty
 * pixels only a "normal" layer leaves anything (with its opacity as alpha).
 */
function mix(img: Img, limg: Img, l: LayerOpts, pal: Palette): void {
  const f = MIXES[l.blend ?? "normal"];
  if (!f) throw new PxError(`layer blend must be ${Object.keys(MIXES).map((k) => `"${k}"`).join(", ")}, got ${JSON.stringify(l.blend)}`);
  const op = l.opacity ?? 1, density = l.density ?? 1;
  if (!(op >= 0 && op <= 1)) throw new PxError(`layer opacity must be 0..1, got ${l.opacity}`);
  // (the pixels mixed are kept only to be snapped back to the palette: a map of every pixel of every
  // such layer of every frame was most of a long scene's check)
  const out = l.palettize ? new Map<number, Color>() : undefined;
  for (let i = 0; i < img.data.length; i++) {
    const s = limg.data[i];
    if (s === TRANSPARENT || (density < 1 && bayer(i % img.w, Math.floor(i / img.w)) >= density)) continue;
    const d = img.data[i];
    if (d === TRANSPARENT) {
      if (!l.blend || l.blend === "normal") img.data[i] = op >= 1 ? s : ((s & ~255) | Math.round((s & 255) * op)) >>> 0;
      continue;
    }
    const sr = s >>> 24, sg = (s >>> 16) & 255, sb = (s >>> 8) & 255, dr = d >>> 24, dg = (d >>> 16) & 255, db = (d >>> 8) & 255;
    img.data[i] = pack(Math.round(dr + (f(sr, dr) - dr) * op), Math.round(dg + (f(sg, dg) - dg) * op), Math.round(db + (f(sb, db) - db) * op), d & 255);
    out?.set(i, img.data[i]);
  }
  if (out) {
    const snap = pal.snapMap(out.values());
    for (const [i, c] of out) img.data[i] = snap.get(c) ?? c;
  }
}
