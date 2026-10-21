// Project: the registry an art file fills in, plus the lazy, cached, cycle-checked resolver.
import { type BuildCtx, type BuildOut, buildAsset, drawnFrames, gcd } from "./build.ts";
import { type Canvas, OPS } from "./canvas.ts";
import { type RigDef, drawGuide, drawParts, figure, ik, readRig, turnRig } from "./rig.ts";
import { type View, perspective } from "./perspective.ts";
import { solid } from "./solids.ts";
import { model } from "./mesh.ts";
import { TRANSPARENT, oklab, shadeRamp, toHex } from "./color.ts";
import { PxError, didYouMean, wrap } from "./errors.ts";
import type { Img } from "./image.ts";
import {
  type AssetDef, type AssetKind, type AssetOpts, type GroupDef, type Item, type Layer, type LayerOpts, type Op,
  type FontDef, type SheetDef, type SheetOpts, type Timeline, isLayer, isOp,
} from "./model.ts";
import { PALETTE_FILE, Palette, paletteFromFile } from "./palette.ts";
import { type Motion, readJoints, readMotion } from "./pose.ts";
import { type ChainOpts, chain } from "./chain.ts";
import { Trace } from "./trace.ts";
import { bayer, fbm, globRe, latticeHash, rng, vnoise, seamless } from "./util.ts";

/**
 * Op signatures: name:type, "?" marks the first optional argument.
 * n number, c color, s string, t text (string|number), S colors ("abc" or array),
 * a point array, r region, o object, b boolean, f function, v a camera (object or function), I items (rest).
 */
export const SIGNATURES: Record<string, string> = {
  px: "x:n y:n c:c",
  rect: "x:n y:n w:n h:n c:c",
  box: "x:n y:n w:n h:n c:c",
  line: "x0:n y0:n x1:n y1:n c:c ?width:n",
  hline: "x:n y:n len:n c:c",
  vline: "x:n y:n len:n c:c",
  ellipse: "cx:n cy:n rx:n ry:n c:c ?ring:b",
  circ: "cx:n cy:n r:n c:c",
  ring: "cx:n cy:n r:n c:c",
  arc: "cx:n cy:n r:n from:n to:n c:c ?opts:o",
  poly: "points:a c:c",
  curve: "points:a c:c ?opts:o",
  fill: "x:n y:n c:c",
  dither: "x:n y:n w:n h:n c1:c c2:c ?density:n",
  grad: "x:n y:n w:n h:n colors:S ?dir:s soft:n",
  noise: "x:n y:n w:n h:n colors:S ?density:n seed:n on:s",
  recolor: "map:o ?where:r density:n",
  shade: "?where:r steps:n density:n",
  light: "?where:r steps:n density:n",
  relight: "?where:r opts:o",
  warp: "fn:f ?where:r",
  plane: "view:o fn:f ?where:r",
  terrain: "view:o height:f fn:f ?opts:o",
  solids: "view:o shapes:a ?opts:o",
  shadows: "view:o shapes:a opts:o",
  mesh: "view:v faces:a mats:o ?opts:o",
  capsule: "x0:n y0:n r0:n x1:n y1:n r1:n ramp:s ?opts:o",
  flame: "x:n y:n size:n keys:s ?opts:o",
  scroll: "name:s y:n per:n ?opts:o",
  clouds: "opts:o",
  plume: "x:n y:n keys:s ?opts:o",
  rampmap: "ramp:S ?opts:o",
  stamp: "name:s ?x:n y:n opts:o",
  tile: "name:s x:n y:n ?cols:n rows:n opts:o",
  pattern: "name:s x:n y:n w:n h:n ?opts:o",
  panel: "name:s x:n y:n w:n h:n ?opts:o",
  tilemap: "map:s opts:o",
  scatter: "name:s x:n y:n w:n h:n count:n ?opts:o",
  grid: "x:n y:n str:s",
  runs: "rows:o",
  wire: "x0:n y0:n x1:n y1:n sag:n c:c ?opts:o",
  text: "x:n y:n str:t c:c ?opts:o",
  clip: "where:r ...items:I",
  lamp: "x:n y:n ?opts:o",
  bump: "?shape:s opts:o",
  normals: "x:n y:n str:s",
  lighting: "?opts:o",
  glow: "keys:S ?opts:o",
};

/** Ops that read the frame and the loop (c.frame, c.frames), as a function can. */
const CLOCKED = new Set(["flame", "scroll", "clouds", "plume"]);
/** Does any item draw with a function or a clocked op (top level, in layers, frames, clips, plates)? */
function drawsWithFunctions(items: Item[]): boolean {
  return items.some((v) => typeof v === "function" || (isLayer(v) && drawsWithFunctions(v.items)) || (isOp(v) && (CLOCKED.has(v.name) || drawsWithFunctions(v.args as Item[]))));
}

/** Options every placement takes (stamp, tile, pattern, panel, scatter, tilemap, wire hangs). */
const PLACE = ["fit", "flip", "rot", "swap", "rflip", "rswap", "silhouette", "cast", "castBase", "seed", "reseed", "frame", "delay", "rdelay"];
/** Allowed option keys of ops whose last argument is an options object. */
export const OP_OPTS: Record<string, string[]> = {
  stamp: [...PLACE, "sub", "smear", "at", "id", "z"],
  tile: PLACE,
  pattern: PLACE,
  panel: PLACE,
  scatter: [...PLACE, "on", "clip", "below", "even", "near", "within"],
  tilemap: [...PLACE, "map", "corners", "iso", "size", "w", "h", "x", "y"],
  wire: [...PLACE, "hang", "every", "start"],
  text: ["scale", "gap", "lead", "align", "shadow", "font"],
  lamp: ["r", "color", "power", "z"],
  curve: ["width", "closed"],
  arc: ["inner", "taper"],
  relight: ["light", "reach", "strength", "ramps", "glint"],
  rampmap: ["where", "hue"],
  bump: ["w", "depth", "on", "where"],
  lighting: ["cell", "ambient", "ambientColor", "sky", "skyColor", "skyReach", "block", "smooth", "emit", "shape", "relief", "skyDir"],
  glow: ["where", "r", "strength", "color", "bands", "ramp", "keep"],
  terrain: ["far", "top", "bound", "margin", "sky"],
  // one options object serves both: solids ignores shade, shadows ramps and light
  solids: ["at", "sun", "scale", "ramps", "light", "shade"],
  shadows: ["at", "sun", "scale", "shade", "ramps", "light"],
  mesh: ["light"],
  capsule: ["light", "rim"],
  flame: ["wind", "period", "seed", "frame"],
  scroll: ["x", "frame"],
  clouds: ["y", "gap", "w", "h", "n", "seed", "keys", "x", "empty", "sizes", "frame"],
  plume: ["every", "life", "rise", "wind", "inertia", "size", "young", "seed", "frame", "light"],
};

export const ASSET_OPTS: Record<AssetKind, string[]> = {
  sprite: ["w", "h", "base", "mx", "my", "swap", "flip", "rot", "angle", "rotate", "outline", "outline8", "inline", "selout", "aa", "crop", "layers", "pivot", "sockets", "wrap", "slice", "png", "area", "palettize", "shrink", "facing", "height", "twin", "register"],
  scene: ["w", "h", "bg", "mx", "my", "swap", "flip", "rot", "angle", "rotate", "outline", "outline8", "inline", "selout", "crop", "layers", "pivot", "wrap", "world"],
  anim: ["w", "h", "base", "mx", "my", "swap", "flip", "rot", "angle", "rotate", "outline", "outline8", "inline", "selout", "aa", "crop", "layers", "pivot", "sockets", "wrap", "slice", "png", "area", "palettize", "shrink", "fps", "frames", "loop", "dir", "facing", "height", "twin", "register"],
};
const FRAME_OPTS = ["ms", "hold"];
/** Longest loop a combined timeline may have (ms); longer ones are cut. */
const MAX_LOOP = 60000;
/** How many bytes of builds at a time other than 0 the project keeps (see Project.timed). */
const TIMED_BYTES = 1 << 30;

/** Roughly what a build holds in memory: its image, its layers' and the ones beside them. */
function buildBytes(b: BuildOut): number {
  const px = (i?: Img) => (i ? i.data.length : 0);
  return 4 * (px(b.img) + px(b.guide) + px(b.under) + b.layers.reduce((s, l) => s + px(l.img), 0) + (b.refs ?? []).reduce((s, r) => s + px(r.img), 0)) + 64 * b.placements.length;
}
export const LAYER_OPTS = ["x", "y", "sort", "hidden", "shade", "light", "density", "blend", "opacity", "palettize", "solid", "wall", "unlit", "ref", "outline"];
const SHEET_OPTS = ["cols", "pad", "extrude"];

function checkArgs(name: string, args: unknown[]): void {
  const sig = SIGNATURES[name];
  if (!sig) return;
  let optional = false;
  sig.split(" ").forEach((part, i) => {
    if (part.startsWith("?")) { optional = true; part = part.slice(1); }
    const [pname, type] = part.split(":");
    if (pname.startsWith("...")) return;
    const v = args[i];
    if (v === undefined) {
      if (!optional) throw new PxError(`${name}: missing argument ${i + 1} (${pname}); usage: ${name}(${usage(sig)})`);
      return;
    }
    const bad = (want: string) => {
      throw new PxError(`${name}: argument ${i + 1} (${pname}) must be ${want}, got ${JSON.stringify(v) ?? typeof v}; usage: ${name}(${usage(sig)})`);
    };
    switch (type) {
      case "n": if (typeof v !== "number" || !Number.isFinite(v)) bad("a number"); break;
      case "c": if (typeof v !== "string") bad('a color key or "#hex"'); break;
      case "s": if (typeof v !== "string") bad("a string"); break;
      case "t": if (typeof v !== "string" && typeof v !== "number") bad("text"); break;
      case "S": if (typeof v !== "string" && !Array.isArray(v)) bad('colors like "abc" or ["a","b"]'); break;
      case "a": if (!Array.isArray(v)) bad("an array of numbers"); break;
      case "o": if (typeof v !== "object" || v === null || Array.isArray(v)) bad("an options object"); break;
      case "b": if (typeof v !== "boolean") bad("true/false"); break;
      case "f": if (typeof v !== "function") bad("a function"); break;
      case "v": if (typeof v !== "function" && (typeof v !== "object" || v === null || Array.isArray(v))) bad("a camera: perspective(...) or its { w, horizon, eye, ... }, or a function from a point to [col, row, depth]"); break;
    }
  });
}

function usage(sig: string): string {
  return sig.split(" ").map((p) => p.replace(/:.*/, "").replace(/^\?/, "[")).join(", ") + (sig.includes("?") ? "]" : "");
}

function checkKeys(what: string, obj: object, allowed: string[], loc?: string): void {
  for (const k of Object.keys(obj))
    if (!allowed.includes(k)) throw new PxError(`${what}: unknown option '${k}'${didYouMean(k, allowed)} (allowed: ${allowed.join(", ")})`, loc);
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v) && !isOp(v) && !isLayer(v);
}

function checkItems(where: string, items: unknown[], loc?: string): Item[] {
  items.forEach((v, i) => {
    const ok = typeof v === "string" || typeof v === "function" || isOp(v) || isLayer(v);
    if (!ok) {
      const what = Array.isArray(v) ? "an array (use ...spread)" : v === undefined ? "undefined (missing comma or op name?)" : `a ${typeof v}`;
      throw new PxError(`${where}: item ${i + 1} is ${what}; items are grid strings, ops, functions or layers`, loc);
    }
  });
  return items as Item[];
}

export interface ProjectOptions {
  /** Record painting traces for seed-0 builds (live viewer). */
  trace?: boolean;
  /** Bytes of builds at times other than 0 to keep (default 1 GB; see Project.timed). */
  timedBytes?: number;
  /** For pxl check: skip the whole-image passes (lighting, glow), which no check reads. */
  checksOnly?: boolean;
}

export class Project implements BuildCtx {
  readonly assets = new Map<string, AssetDef>();
  readonly order: string[] = [];
  readonly groups = new Map<string, GroupDef>();
  readonly sheets: SheetDef[] = [];
  readonly fonts = new Map<string, FontDef>();
  /** rig() skeletons by name, for describe's RIG section. */
  readonly rigs = new Map<string, RigDef>();
  /** What building found wrong but not fatal (a shade step that left its ramp): the CLI prints them, pxl check counts them. */
  readonly warnings: { msg: string; loc?: string }[] = [];

  warn(msg: string, loc?: string): void {
    if (!this.warnings.some((w) => w.msg === msg && w.loc === loc)) this.warnings.push({ msg, loc });
  }
  private glyphCache = new Map<string, (ch: string) => string[]>();
  /** Art files loaded so far (absolute paths or virtual names), for locations and watching. */
  readonly files: string[] = [];
  pal: Palette = Palette.builtin("pico8").asDefault();
  /** Set by a loader to support include(). */
  includeHook?: (path: string) => void;
  /** Set by a loader to support palette files in use(): the file's text, path relative to the art file. */
  readHook?: (path: string) => string;
  /** Set by a loader to support { png } and use("x.png"): the decoded image, path relative to the art file. */
  pngHook?: (path: string) => Img;

  /** The image an asset's { png, area } starts from. */
  private readPng(what: string, o: AssetOpts, loc?: string): Img {
    try {
      if (typeof o.png !== "string" || !/\.png$/i.test(o.png)) throw new PxError(`png must be a .png path, got ${JSON.stringify(o.png)}`);
      if (o.base) throw new PxError("png and base both set the starting image: use one");
      if (!this.pngHook) throw new PxError("png needs an art file on disk");
      let img = this.pngHook(o.png);
      const a = o.area;
      if (a) {
        if (!Array.isArray(a) || a.length !== 4 || !a.every(Number.isInteger) || a[2] < 1 || a[3] < 1 || a[0] < 0 || a[1] < 0 || a[0] + a[2] > img.w || a[1] + a[3] > img.h)
          throw new PxError(`area must be [x, y, w, h] inside the ${img.w}x${img.h} image, got ${JSON.stringify(a)}`);
        img = img.sub(a[0], a[1], a[2], a[3]);
      }
      if (o.shrink !== undefined) {
        if (!(Number.isInteger(o.shrink) && o.shrink >= 1 && o.shrink <= Math.min(img.w, img.h)))
          throw new PxError(`shrink must be a whole factor from 1 (as it is) to ${Math.min(img.w, img.h)}, got ${JSON.stringify(o.shrink)}`);
        if (o.shrink > 1) img = img.shrink(o.shrink);
      }
      return img;
    } catch (e) {
      throw wrap(e).within(what, loc);
    }
  }

  private cache = new Map<string, BuildOut>();
  /**
   * Builds at a time other than 0 (a frame of an animated scene, an anim placed at that time), the
   * most recently used kept up to timedBudget bytes. Unbounded, a long loop checked frame by frame
   * kept thousands of big ones used once (a 360-frame city: 3803 builds, 2.7 GB). The sunset's seven
   * scenes reuse the same anims at the same times (~700 MB of them): a cap by count, or a smaller
   * budget, threw those out between scenes and its check went from 14 s to 100 s and more.
   */
  private timed = new Map<string, { out: BuildOut; bytes: number }>();
  private timedBytes = 0;
  private readonly timedBudget: number;
  /** Builds for checking only (see BuildCtx.checksOnly). */
  readonly checksOnly: boolean;
  /** Timelines gathered from animated assets placed by the builds in progress (innermost last). */
  private collect: Partial<Timeline>[] = [];
  private building = new Set<string>();
  private cands = new Map<string, string[]>();
  private failed = new Map<string, PxError>();
  private tracing: boolean;

  constructor(opts: ProjectOptions = {}) {
    this.tracing = !!opts.trace;
    this.timedBudget = opts.timedBytes ?? TIMED_BYTES;
    this.checksOnly = !!opts.checksOnly;
  }

  // ---------------------------------------------------------------- locations

  addFile(file: string): void {
    if (!this.files.includes(file)) this.files.push(file);
  }

  /**
   * The art-file location a stack was called from: its innermost frame in an art file, or with
   * `outer`, the outermost frame in that same file (the top-level statement that led to the call,
   * through helper functions and callbacks).
   */
  locFromStack(stack: string, outer = false): string | undefined {
    let found: string | undefined, file: string | undefined;
    for (const line of stack.split("\n")) {
      for (const f of this.files) {
        const i = line.indexOf(f + ":");
        if (i < 0 || (file && f !== file)) continue;
        const m = /^:(\d+):(\d+)/.exec(line.slice(i + f.length));
        if (!m) continue;
        found = `${shortName(f)}:${m[1]}:${m[2]}`;
        if (!outer) return found;
        file = f;
      }
    }
    return found;
  }

  callerLoc(outer = false): string | undefined {
    const limit = Error.stackTraceLimit;
    Error.stackTraceLimit = 60;
    const stack = new Error().stack ?? "";
    Error.stackTraceLimit = limit;
    return this.locFromStack(stack, outer);
  }

  // ---------------------------------------------------------------- DSL

  /** Functions visible to art files. */
  env(): Record<string, unknown> {
    const env: Record<string, unknown> = {};
    const define = (kind: AssetKind, name: unknown, rest: unknown[]) => {
      const loc = this.callerLoc();
      if (typeof name !== "string" || !name) throw new PxError(`${kind} needs a name string first`, loc);
      const prev = this.assets.get(name) ?? this.groups.get(name);
      if (prev) throw new PxError(`'${name}' is already defined at ${prev.loc}`, loc);
      const opts = (isPlainObject(rest[0]) ? rest.shift() : {}) as AssetOpts;
      checkKeys(`${kind} '${name}'`, opts, ASSET_OPTS[kind], loc);
      const light = opts.world?.light, pair = (v: unknown) => Array.isArray(v) && v.length === 2 && v.every(Number.isFinite);
      if (light !== undefined && !pair(light) && !(isPlainObject(light) && pair((light as { at?: unknown }).at)))
        throw new PxError(`${kind} '${name}': world.light is where the light comes from, [x, y] (e.g. [0.6, -1]: the top right), or a point light in the scene, { at: [x, y] }; got ${JSON.stringify(light)}`, loc);
      const items = checkItems(`${kind} '${name}'`, rest, loc);
      const png = opts.png === undefined ? undefined : this.readPng(`${kind} '${name}'`, opts, loc), top = this.callerLoc(true);
      this.assets.set(name, { kind, name, opts, items, pal: this.pal, loc, top, png });
      this.order.push(name);
      // twin: the same items drawn mirrored before they're lit, facing the other way
      const twin = (opts as { twin?: unknown }).twin;
      if (twin === undefined) return;
      if (typeof twin !== "string" || !twin || twin === name) throw new PxError(`${kind} '${name}': twin names the asset facing the other way (e.g. twin: "${name}_l")`, loc);
      const other = this.assets.get(twin) ?? this.groups.get(twin);
      if (other) throw new PxError(`'${twin}' (the twin of '${name}') is already defined at ${other.loc}`, loc);
      const { twin: _, ...topts } = opts as AssetOpts & { twin?: string };
      this.assets.set(twin, { kind, name: twin, opts: topts, items, pal: this.pal, loc, top, png, mirror: true });
      this.order.push(twin);
    };

    env.use = (p: unknown) => {
      const loc = this.callerLoc();
      if (Array.isArray(p)) this.pal = Palette.fromColors(p as (string | number)[]);
      else if (typeof p === "string" && /\.png$/i.test(p)) {
        // The image's own colors, keyed 0-9a-zA-Z in the order they first appear.
        if (!this.pngHook) throw new PxError("png palettes need an art file on disk", loc);
        try { this.pal = Palette.fromColors([...new Set(this.pngHook(p).data)].filter((c) => c !== TRANSPARENT)); } catch (e) { throw wrap(e).within("use", loc); }
      } else if (typeof p === "string" && PALETTE_FILE.test(p)) {
        if (!this.readHook) throw new PxError("palette files need an art file on disk", loc);
        try { this.pal = paletteFromFile(this.readHook(p), p); } catch (e) { throw wrap(e).within("use", loc); }
      } else if (typeof p === "string") this.pal = Palette.builtin(p);
      else throw new PxError('use("pico8"), use("colors.hex" | ".gpl" | ".pal" | ".txt") or use(["#000", "#fff", ...])', loc);
    };
    env.pal = (aliases: Record<string, string | number>) => {
      try { this.pal = this.pal.extend(aliases); } catch (e) { throw wrap(e).within("pal", this.callerLoc()); }
    };
    env.shades = (keys: unknown, base: unknown, opts: { hue?: number; at?: number; sat?: number } = {}) => {
      const loc = this.callerLoc();
      try {
        const ks = typeof keys === "string" ? [...keys] : [];
        if (ks.length < 2) throw new PxError('shades("HGgl", "#5aa040"): two or more keys, dark to light, then the base color');
        checkKeys("shades", opts, ["hue", "at", "sat"]);
        if (opts.sat !== undefined && !(typeof opts.sat === "number" && opts.sat >= -1 && opts.sat <= 1)) throw new PxError(`sat is how much more saturated the lights get (the darks as much less), -1..1, got ${JSON.stringify(opts.sat)}`);
        const c = this.pal.resolve(base);
        if (c === null || c === TRANSPARENT) throw new PxError(`shades needs a visible base color, got ${JSON.stringify(base)}`);
        const at = opts.at ?? Math.floor(ks.length / 2);
        if (!(Number.isInteger(at) && at >= 0 && at < ks.length)) throw new PxError(`at must be a key index 0..${ks.length - 1}, got ${at}`);
        const cols = shadeRamp(c, ks.length, at, opts.hue ?? 20, opts.sat);
        this.pal = this.pal.extend(Object.fromEntries(ks.map((k, i) => [k, toHex(cols[i])]))).withRamps([ks.join("")]);
      } catch (e) { throw wrap(e).within("shades", loc); }
    };
    env.ramps = (...ramps: string[]) => {
      try { this.pal = this.pal.withRamps(ramps); } catch (e) { throw wrap(e).within("ramps", this.callerLoc()); }
      // a ramp runs dark to light: written the other way, shade() lightens and light() darkens
      for (const r of ramps) {
        const L = [...r].map((k) => oklab(this.pal.keys.get(k)!)[0]);
        const at = L.findIndex((l, i) => i > 0 && l < L[i - 1] - 0.02);
        if (at > 0) this.warn(`ramp "${r}" isn't dark to light: '${r[at - 1]}' to '${r[at]}' gets darker (lightness ${L[at - 1].toFixed(2)} to ${L[at].toFixed(2)}); shade() steps toward a ramp's start and light() toward its end, so write it darkest first`, this.callerLoc());
      }
    };
    env.sprite = (name: unknown, ...rest: unknown[]) => define("sprite", name, rest);
    env.anim = (name: unknown, ...rest: unknown[]) => define("anim", name, rest);
    env.frame = (...args: unknown[]): Op => {
      const loc = this.callerLoc();
      if (isPlainObject(args[0])) checkKeys("frame", args[0], FRAME_OPTS, loc);
      checkItems("frame", isPlainObject(args[0]) ? args.slice(1) : args, loc);
      return { __op: true, name: "frame", args, loc };
    };
    // plate(relight opts?, ...items): the items drawn and lit on their own, then laid down; anywhere
    env.plate = (...args: unknown[]): Op => {
      const loc = this.callerLoc();
      if (isPlainObject(args[0])) checkKeys("plate", args[0], OP_OPTS.relight, loc);
      checkItems("plate", isPlainObject(args[0]) ? args.slice(1) : args, loc);
      return { __op: true, name: "plate", args, loc };
    };
    env.scene = (name: unknown, ...rest: unknown[]) => define("scene", name, rest);
    env.layer = (name: unknown, ...rest: unknown[]): Layer => {
      const loc = this.callerLoc();
      if (typeof name !== "string") throw new PxError("layer needs a name string first", loc);
      const opts = (isPlainObject(rest[0]) ? rest.shift() : {}) as LayerOpts;
      checkKeys(`layer '${name}'`, opts, LAYER_OPTS, loc);
      return { __layer: true, name, opts, items: checkItems(`layer '${name}'`, rest, loc), loc };
    };
    env.group = (name: unknown, members: unknown) => {
      const loc = this.callerLoc();
      if (typeof name !== "string" || !Array.isArray(members) || !members.every((m) => typeof m === "string"))
        throw new PxError('group("name", ["a", "b*", ...])', loc);
      const prev = this.assets.get(name) ?? this.groups.get(name);
      if (prev) throw new PxError(`'${name}' is already defined at ${prev.loc}`, loc);
      this.groups.set(name, { name, members, loc });
    };
    env.directions = (name: unknown, n: unknown, opts: Record<string, unknown> = {}) => {
      const loc = this.callerLoc();
      try {
        if (typeof name !== "string" || !Number.isInteger(n) || (n as number) < 1 || (n as number) > 360)
          throw new PxError('directions("ship", 16, { from: "_ship_body", outline: "k", symmetric: true })');
        checkKeys("directions", opts, ["from", "outline", "outline8", "symmetric", "rotate", "draw", "pivot"]);
        const { from, symmetric, rotate, draw = {}, pivot, outline, outline8 } = opts as {
          from?: string; symmetric?: boolean; rotate?: string; draw?: Record<string, string>; pivot?: unknown; outline?: string; outline8?: string };
        if (typeof from !== "string") throw new PxError("directions needs { from: sprite } (the pose at 0 degrees, pointing up, best without its outline)");
        const line = { ...(outline ? { outline } : {}), ...(outline8 ? { outline8 } : {}) };
        // One finished sprite per angle within a quarter turn; every direction is a quarter turn of one.
        const part = (r: number) => `_${name}@${r}`, made = new Set<number>();
        const want = [...Array(n as number).keys()].map((i) => (i * 360) / (n as number));
        const rests = [...new Set(want.map((a) => +(a % 90).toFixed(6)))].sort((a, b) => a - b);
        const hand = (r: number) => draw[String(r)];
        const make = (r: number) => {
          if (made.has(r)) return;
          made.add(r);
          // A hand-drawn pose wins; a symmetric sprite mirrors 90 - r across the diagonal (exact);
          // otherwise rotate the source and outline the result.
          if (hand(r)) define("sprite", part(r), [{ base: hand(r) }]);
          else if (symmetric && r > 45 && (rests.includes(+(90 - r).toFixed(6)) || hand(+(90 - r).toFixed(6)))) {
            make(+(90 - r).toFixed(6));
            define("sprite", part(r), [{ base: part(+(90 - r).toFixed(6)), flip: "x", rot: 90 }]);
          } else define("sprite", part(r), [{ base: from, ...(r ? { angle: r } : {}), ...(rotate ? { rotate } : {}), ...line }]);
        };
        rests.forEach(make);
        want.forEach((a, i) => {
          const r = +(a % 90).toFixed(6), q = Math.round((a - r) / 90) % 4;
          define("sprite", `${name}_${i}`, [{ base: part(r), ...(q ? { rot: q * 90 } : {}), ...(pivot ? { pivot } : {}) }]);
        });
        (env.group as (n: string, m: string[]) => void)(name, want.map((_, i) => `${name}_${i}`));
      } catch (e) { throw wrap(e).within("directions", loc); }
    };
    env.font = (name: unknown, asset: unknown, opts: Partial<FontDef> = {}) => {
      const loc = this.callerLoc();
      if (typeof name !== "string" || typeof asset !== "string") throw new PxError('font("name", "glyph_sprite", { chars, w, h, cols?, mono? })', loc);
      checkKeys(`font '${name}'`, opts, ["chars", "w", "h", "cols", "mono"], loc);
      const { chars, w, h, cols, mono } = opts;
      if (typeof chars !== "string" || !chars || !(Number.isInteger(w) && w! > 0 && Number.isInteger(h) && h! > 0))
        throw new PxError(`font '${name}' needs { chars: "ABC...", w, h }: the glyph cell size and the characters in cell order`, loc);
      if (this.fonts.has(name)) throw new PxError(`font '${name}' is already defined at ${this.fonts.get(name)!.loc}`, loc);
      this.fonts.set(name, { name, asset, chars, w: w!, h: h!, cols, mono: !!mono, loc });
    };
    env.sheet = (name: unknown, entries: unknown, opts: SheetOpts = {}) => {
      const loc = this.callerLoc();
      if (typeof name !== "string" || !Array.isArray(entries)) throw new PxError('sheet("name", ["a", "b*"], { cols, pad })', loc);
      checkKeys(`sheet '${name}'`, opts, SHEET_OPTS, loc);
      this.sheets.push({ name, entries, opts, loc });
    };
    env.include = (path: unknown, opts: { palette?: boolean } = {}) => {
      const loc = this.callerLoc();
      if (typeof path !== "string") throw new PxError('include("other.px.js", { palette? })', loc);
      checkKeys("include", opts, ["palette"], loc);
      if (!this.includeHook) throw new PxError("include() is not available here", loc);
      // The included file's use()/pal()/ramps() stay with its own assets, unless the includer
      // asks for them ({ palette: true }: a shared palette file).
      const pal = this.pal;
      try { this.includeHook(path); } finally { if (!opts.palette) this.pal = pal; }
    };
    env.rng = (seed?: number) => rng(seed);
    // procedural texture, the same in every file: hash(i, j), vnoise(x, y), fbm(x, y, octaves), bayer(x, y)
    env.hash = latticeHash;
    env.vnoise = vnoise;
    env.fbm = fbm;
    env.bayer = bayer;
    env.seamless = seamless;
    // shapes in meters for solids() and shadows(): solid.stick, blob, box, cone, poly
    env.solid = solid;
    // a model for mesh(): faces, strips, lofts and boxes in meters, each of a material
    env.model = model;
    // perspective({ w, horizon, eye, fov | focal, vp, yaw, pitch }): ground(x, z, up), at(col, row), scale(z, x, up), vanish(angle), vertical()
    env.perspective = (view: unknown) => {
      try { return perspective(view as View); } catch (e) { throw wrap(e).within("perspective", this.callerLoc()); }
    };
    env.ik = (a: unknown, b: unknown, target: unknown, bend: unknown = 1) => {
      try { return ik(a as number, b as number, target as [number, number], bend as number); } catch (e) { throw wrap(e).within("ik", this.callerLoc()); }
    };
    // has("name"): is there an asset or a group of that name yet (a generated part made once)
    env.has = (name: unknown) => typeof name === "string" && (this.assets.has(name) || this.groups.has(name));
    env.figure = (h: unknown, heads?: unknown) => {
      try { return figure(h as number, heads as number | undefined); } catch (e) { throw wrap(e).within("figure", this.callerLoc()); }
    };
    env.rig = (name: unknown, opts: unknown, ...retouch: unknown[]) => {
      const loc = this.callerLoc();
      if (typeof name !== "string" || !name || !isPlainObject(opts)) throw new PxError('rig("name", { w, h, facing, slots: { torso: { at, size }, ... } }, ...retouch items)', loc);
      const { slots, guide = true, parts, light, turn, far, ...rest } = opts as Record<string, unknown>;
      const rig = readRig(name, rest.facing, slots, parts, light, far, loc);
      checkKeys(`rig '${name}'`, rest, ASSET_OPTS.sprite.filter((k) => !["base", "png", "area", "palettize", "shrink", "flip", "rot", "angle", "mx", "my"].includes(k)), loc);
      const layer = (n: string, o: LayerOpts, items: Item[]): Layer => ({ __layer: true, name: n, opts: o, items, loc });
      const stampOp = (...args: unknown[]): Op => ({ __op: true, name: "stamp", args, loc });
      // the retouch is a sprite of its own, the rig's size, so a turned rig can stamp it mirrored
      const touch = `_${name}_retouch`;
      if (retouch.length) define("sprite", touch, [{ w: rest.w, h: rest.h }, ...checkItems(`rig '${name}' retouch`, retouch, loc)]);
      const make = (r: RigDef, o: Record<string, unknown>, flip: boolean) => {
        const items: Item[] = [layer("parts", {}, [(c: Canvas) => drawParts(r, c)])];
        if (guide) items.push(layer("skeleton", { ref: true }, [(c: Canvas) => drawGuide(r, c)]));
        if (retouch.length) items.push(layer("retouch", {}, [stampOp(touch, 0, 0, flip ? { flip: "x" } : {})]));
        define("sprite", r.name, [o, ...items]);
        this.rigs.set(r.name, r);
      };
      make(rig, rest, false);
      if (turn === undefined) return;
      // turned: the same rig mirrored, facing the other way; and both side by side
      const W = rest.w as number, H = rest.h as number;
      // turn: "name", or { name, parts: ["knight_", "knight_l_"] } when slots name their parts (shared
      // by many rigs): the turned rig looks each one up under the other prefix
      const tn = isPlainObject(turn) ? (turn as { name?: unknown }).name : turn, tp = isPlainObject(turn) ? (turn as { parts?: unknown }).parts : undefined;
      if (typeof tn !== "string" || !tn) throw new PxError(`rig '${name}': turn names the rig facing the other way (e.g. turn: "${name}_l", or { name, parts: ["a_", "a_l_"] }), got ${JSON.stringify(turn)}`, loc);
      if (isPlainObject(turn)) checkKeys(`rig '${name}' turn`, turn, ["name", "parts"], loc);
      if (tp !== undefined && !(Array.isArray(tp) && tp.length === 2 && tp.every((x) => typeof x === "string")))
        throw new PxError(`rig '${name}': turn.parts maps part names by prefix: [from, to] (e.g. ["knight_", "knight_l_"]), got ${JSON.stringify(tp)}`, loc);
      if (!(Number.isInteger(W) && Number.isInteger(H))) throw new PxError(`rig '${name}': turn needs { w, h }`, loc);
      const t = turnRig(rig, tn, W, tp as [string, string] | undefined), pv = rest.pivot, mp = (p: unknown) => (Array.isArray(p) ? [W - p[0], p[1]] : p);
      const so = rest.sockets as Record<string, [number, number]> | undefined;
      make(t, { ...rest, facing: t.facing, pivot: mp(pv), ...(so ? { sockets: Object.fromEntries(Object.entries(so).map(([k, p]) => [k, mp(p)])) } : {}) }, true);
      define("sprite", `${name}_turnaround`, [{ w: 2 * W + 4, h: H }, (c: Canvas) => { c.put(c.asset(name), 0, 0); c.put(c.asset(tn), W + 4, 0); }]);
    };

    for (const name of [...OPS, "clip", "lighting", "glow"]) {
      env[name] = (...args: unknown[]): Op => {
        const loc = this.callerLoc();
        try {
          checkArgs(name, args);
          const o = name === "mesh" ? args[3] : args[args.length - 1];
          if (OP_OPTS[name] && isPlainObject(o)) checkKeys(name, o, OP_OPTS[name]);
        } catch (e) { throw wrap(e).within(name, loc); }
        if (name === "clip") checkItems("clip", args.slice(1), loc);
        return { __op: true, name, args, loc };
      };
    }
    // pose("pose.json" | { name: [x, y, score] }, opts): joints from a pose detector, drawn as a guide.
    env.pose = (src: unknown, opts: unknown = {}): Op => {
      const loc = this.callerLoc();
      try {
        if (!isPlainObject(opts)) throw new PxError('pose("pose.json", { x, y, scale, color, joint, min, bones })');
        checkKeys("pose", opts, ["x", "y", "scale", "color", "joint", "min", "bones", "sides"]);
        let data = src;
        if (typeof src === "string") {
          if (!this.readHook) throw new PxError("pose files need an art file on disk");
          try { data = JSON.parse(this.readHook(src)); } catch (e) { throw e instanceof PxError ? e : new PxError(`${src}: not JSON (${(e as Error).message})`); }
        }
        return { __op: true, name: "pose", args: [readJoints(data), opts], loc };
      } catch (e) { throw wrap(e).within("pose", loc); }
    };
    // chain(anchors, opts): hair / tail points per frame, following the anchors with lag (chain.ts).
    env.chain = (anchors: unknown, opts: unknown = {}): number[][][] => {
      const loc = this.callerLoc();
      try {
        if (!isPlainObject(opts)) throw new PxError("chain(anchors, { links, length, gravity, drag, rest, stiff, follow, step, max, move, steps, loops })");
        checkKeys("chain", opts, ["links", "length", "gravity", "drag", "rest", "stiff", "follow", "step", "max", "move", "steps", "loops"]);
        return chain(anchors as [number, number][], opts as ChainOpts);
      } catch (e) { throw wrap(e).within("chain", loc); }
    };
    // motion("walk.json", { dir, scale, at }): a motion guide's frames for one direction, as joints
    // to draw with pose() in an anim and to place parts with.
    env.motion = (src: unknown, opts: unknown = {}): Motion => {
      const loc = this.callerLoc();
      try {
        if (typeof src !== "string") throw new PxError('motion("walk.json", { dir: "SE", scale: 0.25, at: [x, y] })');
        if (!isPlainObject(opts)) throw new PxError("motion: options must be { dir, scale, at }");
        checkKeys("motion", opts, ["dir", "scale", "at"]);
        if (!this.readHook) throw new PxError("motion files need an art file on disk");
        let data: unknown;
        try { data = JSON.parse(this.readHook(src)); } catch (e) { throw e instanceof PxError ? e : new PxError(`${src}: not JSON (${(e as Error).message})`); }
        return readMotion(data, opts as { dir?: string; scale?: number; at?: [number, number] });
      } catch (e) { throw wrap(e).within("motion", loc); }
    };
    return env;
  }

  // ---------------------------------------------------------------- resolving

  /**
   * A font's glyphs as rows of "#" / ".", cut from its asset once. Each glyph is trimmed to its
   * opaque columns (a proportional font); a space not in `chars` is half a cell wide. `mono`: every
   * glyph centered in the widest one's width, so a score or a timer keeps its place as it counts.
   */
  glyphs(font: string): (ch: string) => string[] {
    const hit = this.glyphCache.get(font);
    if (hit) return hit;
    const f = this.fonts.get(font);
    if (!f) throw new PxError(`unknown font '${font}'${didYouMean(font, [...this.fonts.keys()])}`);
    const img = this.image(f.asset, 0, 0, false), cols = f.cols ?? Math.max(1, Math.floor(img.w / f.w));
    const map = new Map<string, string[]>();
    [...f.chars].forEach((ch, i) => {
      const x0 = (i % cols) * f.w, y0 = Math.floor(i / cols) * f.h;
      let rows = Array.from({ length: f.h }, (_, y) => Array.from({ length: f.w }, (_, x) => (img.get(x0 + x, y0 + y) !== TRANSPARENT ? "#" : ".")).join(""));
      const used = [...Array(f.w).keys()].filter((x) => rows.some((r) => r[x] === "#"));
      if (used.length) rows = rows.map((r) => r.slice(used[0], used[used.length - 1] + 1));
      map.set(ch, rows);
    });
    if (f.mono) {
      const m = Math.max(...[...map.values()].map((r) => r[0].length));
      for (const [ch, rows] of map) { const l = (m - rows[0].length) >> 1; map.set(ch, rows.map((r) => ".".repeat(l) + r + ".".repeat(m - rows[0].length - l))); }
      if (!map.has(" ")) map.set(" ", Array(f.h).fill(".".repeat(m)));
    }
    if (!map.has(" ")) map.set(" ", Array(f.h).fill(".".repeat(Math.ceil(f.w / 2))));
    const g = (ch: string) => {
      const rows = map.get(ch) ?? map.get(ch.toUpperCase()) ?? map.get(ch.toLowerCase());
      if (!rows) throw new PxError(`font '${font}' has no glyph for '${ch}' (it has: ${f.chars})`);
      return rows;
    };
    this.glyphCache.set(font, g);
    return g;
  }

  has(name: string): boolean {
    return this.assets.has(name) || this.groups.has(name);
  }

  candidates(name: string, depth = 0): string[] {
    const hit = this.cands.get(name);
    if (hit) return hit;
    if (typeof name !== "string") throw new PxError(`asset name must be a string, got ${typeof name}`);
    if (depth > 8) throw new PxError(`group nesting too deep at '${name}'`);
    let list: string[] = [];
    const g = this.groups.get(name);
    if (g) for (const m of g.members) list.push(...this.candidates(m, depth + 1));
    else if (name.includes("*")) {
      const re = globRe(name);
      list = this.order.filter((n) => re.test(n));
    } else list = [name];
    if (!list.length) throw new PxError(`'${name}' matches no assets`);
    this.cands.set(name, list);
    return list;
  }

  image(name: string, seed = 0, t = 0, track = true): Img {
    return this.build(name, seed, t, track).img;
  }

  timeline(name: string, seed = 0): Timeline | undefined {
    return this.build(name, seed, 0, false).anim;
  }

  /**
   * Build an asset at time t (ms). Still assets ignore t. Unless `track` is false, an animated
   * result makes the asset being built around this call animated too.
   */
  build(name: string, seed = 0, t = 0, track = true): BuildOut {
    let first = this.buildAt(name, seed, 0);
    const tl = first.anim, def = this.assets.get(name);
    // animated by what it places: its functions run on that loop. The loop is known once built, so a
    // first frame drawn by functions is drawn again knowing it (c.frames)
    if (tl && def && def.kind !== "anim" && !first.clocked && drawsWithFunctions(def.items)) first = this.buildAt(name, seed, 0, tl, true);
    if (tl && track && this.collect.length) {
      const acc = this.collect[this.collect.length - 1];
      if (tl.capped || (acc.loop && lcm(acc.loop, tl.loop) > MAX_LOOP)) acc.capped = true;
      acc.loop = acc.loop ? Math.min(MAX_LOOP, lcm(acc.loop, tl.loop)) : tl.loop;
      acc.step = acc.step ? gcd(acc.step, tl.step) : tl.step;
    }
    if (!tl || t === 0) return first;
    const tt = tl.once ? Math.min(Math.max(0, t), tl.loop) : ((t % tl.loop) + tl.loop) % tl.loop;
    return tt === 0 ? first : this.buildAt(name, seed, tt, def?.kind !== "anim" ? tl : undefined);
  }

  /**
   * One full loop of an animated asset as [{ img, ms }]; [] for still assets. `guide` is the frame
   * with its reference layers over it, when it has any (previews only).
   */
  frames(name: string, seed = 0, max = 600): { img: Img; ms: number; t: number; guide?: Img }[] {
    const tl = this.build(name, seed).anim;
    if (!tl) return [];
    const at = (t: number, ms: number) => {
      const b = this.build(name, seed, t);
      return { img: b.img, ms, t, ...(b.guide ? { guide: b.guide } : {}) };
    };
    if (tl.durations) {
      let t = 0;
      return tl.durations.map((ms) => {
        const f = at(t, ms);
        t += ms;
        return f;
      });
    }
    const n = Math.max(1, Math.min(max, Math.round(tl.loop / tl.step)));
    return Array.from({ length: n }, (_, i) => at(i * tl.step, tl.step));
  }

  /**
   * The frames an anim draws, once each and in drawing order: what sheets export, with the
   * direction in the tag. Same as frames() unless the anim plays reverse / pingpong.
   */
  drawn(name: string, seed = 0): { img: Img; ms: number; t: number }[] {
    const all = this.frames(name, seed), tl = this.build(name, seed).anim;
    if (!tl?.order) return all;
    return Array.from({ length: drawnFrames(tl) }, (_, k) => all[tl.order!.indexOf(k)]);
  }

  /** Playback direction of an anim, for export ("forward" unless it says otherwise). */
  direction(name: string): "forward" | "reverse" | "pingpong" {
    return this.build(name).anim?.dir ?? "forward";
  }

  private buildAt(name: string, seed: number, t: number, clock?: Timeline, again = false): BuildOut {
    const key = (seed === 0 ? name : `${name}@${seed}`) + (t ? `#${t}` : "");
    const kept = this.cache.get(key), timed = kept ? undefined : this.timed.get(key);
    if ((kept || timed) && !again) {
      // most recently used last, so the oldest goes first when the timed cache is full
      if (timed) { this.timed.delete(key); this.timed.set(key, timed); }
      return kept ?? timed!.out;
    }
    const def = this.assets.get(name);
    if (!def) {
      if (this.groups.has(name) || name.includes("*"))
        throw new PxError(`'${name}' is a group/glob: use it in stamp, tile, pattern, tilemap, scatter or wire hang`);
      throw new PxError(`unknown asset '${name}'${didYouMean(name, this.order)}`);
    }
    const failed = this.failed.get(key);
    if (failed) throw new PxError(`depends on '${name}', which failed`);
    if (this.building.has(name)) throw new PxError(`reference cycle through '${name}'`);
    this.building.add(name);
    const acc: Partial<Timeline> = {};
    this.collect.push(acc);
    try {
      const out = buildAsset(this, def, seed, this.tracing && seed === 0 && t === 0 ? new Trace() : undefined, t, clock);
      // Anims keep their own frame timing; other assets are as animated as what they place.
      if (!out.anim && acc.loop) out.anim = { loop: acc.loop, step: acc.step!, ...(acc.capped ? { capped: true } : {}) };
      if (!t) this.cache.set(key, out);
      else {
        const old = this.timed.get(key), bytes = buildBytes(out);
        if (old) { this.timedBytes -= old.bytes; this.timed.delete(key); }
        this.timed.set(key, { out, bytes });
        this.timedBytes += bytes;
        for (const [k, v] of this.timed) {
          if (this.timedBytes <= this.timedBudget || this.timed.size <= 1) break;
          this.timed.delete(k);
          this.timedBytes -= v.bytes;
        }
      }
      return out;
    } catch (e) {
      const err = wrap(e, (s) => this.locFromStack(s)).within(`${def.kind} '${name}'`, def.loc);
      this.failed.set(key, err);
      throw err;
    } finally {
      this.collect.pop();
      this.building.delete(name);
    }
  }

  /** Exported asset names (no "_" prefix), in definition order. */
  exported(): string[] {
    return this.order.filter((n) => !n.startsWith("_"));
  }

  /** Expand a sheet's entries: globs match exported names, groups expand to members. */
  sheetNames(s: SheetDef): string[] {
    const out: string[] = [];
    const add = (n: string) => { if (!out.includes(n)) out.push(n); };
    for (const e of s.entries) {
      if (e.includes("*")) {
        const re = globRe(e);
        this.exported().filter((n) => re.test(n)).forEach(add);
      } else if (this.groups.has(e)) this.candidates(e).forEach(add);
      else add(e);
    }
    return out;
  }
}

function lcm(a: number, b: number): number {
  return (a / gcd(a, b)) * b;
}

function shortName(f: string): string {
  return f.replace(/^.*[\\/]/, "");
}
