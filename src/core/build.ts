// Turns an asset definition into an image: base -> items (ops, grids, functions, layers)
// -> post-processing (mirror, swap, flip, rot, outline, crop). Optionally traced.
import { Canvas, type Resolver } from "./canvas.ts";
import { type Color, TRANSPARENT } from "./color.ts";
import { PxError, wrap } from "./errors.ts";
import { Img } from "./image.ts";
import { applyGlow } from "./glow.ts";
import { applyLighting } from "./light.ts";
import { normalImage } from "./normals.ts";
import { type AssetDef, type FrameOpts, type GlowOpts, type Item, type Layer, type LayerOpts, type LightingOpts, type Op, type Timeline, isLayer, isOp } from "./model.ts";
import type { Palette } from "./palette.ts";
import { Trace } from "./trace.ts";
import { bayer, fmtArgs, gridRows, gridSize, type Region } from "./util.ts";

export interface BuildCtx extends Resolver {
  /** Art-file location from an error stack, if any frame points into an art file. */
  locFromStack(stack: string): string | undefined;
  /** Art-file location of the current call site. */
  callerLoc(): string | undefined;
}

export interface LayerOut {
  name: string;
  img: Img;
}

export interface BuildOut {
  img: Img;
  layers: LayerOut[];
  trace?: Trace;
  /** Set when the asset is animated (an anim, or places one). */
  anim?: Timeline;
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

export function buildAsset(ctx: BuildCtx, def: AssetDef, seed: number, trace?: Trace, t = 0): BuildOut {
  const { opts, pal } = def;
  const tl = def.kind === "anim" ? animTimeline(def) : undefined;
  const at = tl ? frameAt(tl, t) : 0;
  const frame = tl?.order ? tl.order[at] : at, frames = tl ? drawnFrames(tl) : 1;
  let base: Img;
  if (def.kind === "scene") {
    if (!opts.w || !opts.h) throw new PxError("scene needs { w, h }");
    base = new Img(opts.w, opts.h);
    if (opts.bg) {
      const bg = pal.resolve(opts.bg);
      if (bg !== null) base.fill(bg);
    }
  } else if (opts.base) {
    base = ctx.image(opts.base, seed, t).copy();
  } else if (def.png) {
    // A strip anim ({ frames: n }) shows the n-th equal slice; anything else the whole image.
    const n = def.kind === "anim" && opts.frames ? frames : 1, fw = Math.floor(def.png.w / n);
    if (fw < 1) throw new PxError(`png is ${def.png.w}px wide: too narrow for ${n} frames`);
    base = n > 1 ? def.png.sub(frame * fw, 0, fw, def.png.h) : def.png.copy();
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

  const hook = (c: Canvas) => {
    if (!snap) return;
    c.onOp = (name, args) => snap(`${name}(${fmtArgs(args)})`, c.loc ?? ctx.callerLoc());
  };

  const layers: LayerOut[] = [];
  // Pixels of solid / wall layers, for lighting().
  let solid: Uint8Array | undefined, wall: Uint8Array | undefined, unlit: Uint8Array | undefined;
  if (![undefined, true, false, "x", "y"].includes(opts.wrap)) throw new PxError(`wrap must be true, "x" or "y", got ${fmtArgs([opts.wrap])}`);
  const edges = opts.wrap ? { x: opts.wrap !== "y", y: opts.wrap !== "x" } : undefined;
  const timed = (c: Canvas) => {
    c.wrap = edges;
    c.t = t;
    c.frame = frame;
    c.frames = frames;
    c.inAnim = !!tl;
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
    const limg = new Img(base.w, base.h);
    const lc = timed(new Canvas(limg, pal, ctx, l.opts.x ?? 0, l.opts.y ?? 0, seed));
    lc.below = base;
    hook(lc);
    cur = { img: limg, opts: l.opts };
    try {
      runItems(ctx, l.items, lc, l.loc);
    } catch (e) {
      throw wrap(e, (st) => ctx.locFromStack(st)).within(`layer '${l.name}'`, l.loc);
    } finally {
      cur = undefined;
    }
    if (!l.opts.hidden) {
      blend(base, limg, l.opts, pal);
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
    }
    layers.push({ name: l.name, img: limg });
    snap?.(`layer '${l.name}'${l.opts.hidden ? " (hidden)" : ""}`, l.loc);
  });

  const img = finish(base, def, pal, trace);
  trace?.finish(img);
  return { img, layers, trace, anim: tl };
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

function finish(img: Img, def: AssetDef, pal: Palette, trace?: Trace): Img {
  const o = def.opts;
  const step = (label: string, f: () => Img | void) => {
    const r = f();
    if (r) img = r;
    trace?.record(label, def.loc, img);
  };
  // [x, y] is in drawing coords and moves with flip/rot/outline/crop; keywords use the final size.
  const pv = o.pivot;
  if (pv !== undefined && !(pv === "bottom" || pv === "center" || (Array.isArray(pv) && pv.length === 2 && pv.every(Number.isFinite))))
    throw new PxError(`pivot must be "bottom", "center" or [x, y], got ${fmtArgs([pv])}`);
  if (Array.isArray(pv)) img.pivot = [pv[0], pv[1]];
  if (o.mx) step("mirror x", () => img.mirror("x"));
  if (o.my) step("mirror y", () => img.mirror("y"));
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
  if (o.flip) step(`flip ${o.flip}`, () => img.flip(o.flip!));
  if (o.rot) step(`rot ${o.rot}`, () => img.rot(o.rot!));
  // selout: the line takes the color it touches, `selout` steps darker along the ramps (colors
  // without a ramp keep the line color).
  const sel = o.selout ? seloutPick(pal, o.selout === true ? 2 : o.selout) : undefined;
  if (o.selout && !o.outline && !o.outline8 && !o.inline) throw new PxError("selout recolors a line: add outline, outline8 or inline");
  const as = (c: Color) => (sel ? (t: Color) => sel(t, c) : undefined);
  if (o.inline) step(`inline ${o.inline}${sel ? " (selout)" : ""}`, () => { const c = solid(pal, o.inline!); return img.inline(c, false, as(c)); });
  if (o.outline) step(`outline ${o.outline}${sel ? " (selout)" : ""}`, () => { const c = solid(pal, o.outline!); return img.outline(c, false, as(c)); });
  if (o.outline8) step(`outline8 ${o.outline8}${sel ? " (selout)" : ""}`, () => { const c = solid(pal, o.outline8!); return img.outline(c, true, as(c)); });
  if (o.crop) step("crop", () => img.crop());
  if (pv === "bottom" || pv === "center") img.pivot = [img.w / 2, pv === "bottom" ? img.h : img.h / 2];
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

/** Composite a layer onto img: draw it, or (shade/light) step what's below where it's opaque. */
export function blend(img: Img, limg: Img, l: LayerOpts, pal: Palette): void {
  if (limg.lamps?.length) (img.lamps ??= []).push(...limg.lamps);
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
  for (let i = 0; i < img.data.length; i++) {
    if (limg.data[i] === TRANSPARENT) continue;
    if (density < 1 && bayer(i % img.w, Math.floor(i / img.w)) >= density) continue;
    let c = img.data[i];
    for (let s = 0; s < steps; s++) c = map.get(c) ?? c;
    img.data[i] = c;
  }
}
